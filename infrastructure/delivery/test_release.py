import contextlib
import importlib.util
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release', pathlib.Path(__file__).with_name('release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class DeliveryTests(unittest.TestCase):
    def test_staging_routes_reject_historical_and_unauthenticated_backends(self):
        def ingress(namespace, service, host='staging.gthf.fr'):
            return {'metadata': {'namespace': namespace}, 'spec': {'rules': [
                {'host': host, 'http': {'paths': [{'backend': {'service': {'name': service, 'port': {'name': 'http'}}}}]}}
            ]}}
        gateway = ingress('gthdf-qualification', 'gthdf-staging-gateway')
        cms_gateway = ingress('gthdf-qualification', 'gthdf-staging-gateway', 'staging-cms.gthf.fr')
        production = ingress('gthdf-staging', 'gthdf-frontend', 'gthf.fr')
        release.require_isolated_staging_routes([gateway, cms_gateway, production])
        for conflict in [ingress('gthdf-staging', 'gthdf-frontend'), ingress('gthdf-qualification', 'gthdf-cms', 'staging-cms.gthf.fr')]:
            with self.assertRaises(RuntimeError):
                release.require_isolated_staging_routes([gateway, cms_gateway, conflict])
        for incomplete in [[], [gateway], [cms_gateway]]:
            with self.assertRaises(RuntimeError):
                release.require_isolated_staging_routes(incomplete)
        dashboard = {'kind': 'IngressRoute', 'spec': {'routes': [{'match': 'Host(`dashboard.localhost`)'}]}}
        release.require_isolated_staging_routes([gateway, cms_gateway], [dashboard])
        for alternate in [
            {'kind': 'IngressRoute', 'spec': {'routes': [{'match': 'Host(`staging.gthf.fr`)'}]}},
            {'kind': 'IngressRoute', 'spec': {'routes': [{'match': 'PathPrefix(`/`)'}]}},
            {'kind': 'HTTPRoute', 'spec': {'hostnames': ['*.gthf.fr']}},
            {'kind': 'HTTPRoute', 'spec': {}},
            {'kind': 'GRPCRoute', 'spec': {'hostnames': ['staging-cms.gthf.fr']}},
            {'kind': 'IngressRouteTCP', 'spec': {'routes': [{'match': 'HostSNI(`*`)'}]}},
        ]:
            with self.assertRaises(RuntimeError):
                release.require_isolated_staging_routes([gateway, cms_gateway], [alternate])

    def test_frontend_only_qualification_checks_a_cms_inherited_from_production(self):
        old_cms = {'image': 'cms-old', 'schemas': {'article': {'attributes': {'title': {'type': 'string'}}}}}
        new_cms = {'image': 'cms-new', 'schemas': {'article': {'attributes': {'title': {'type': 'integer'}}}}}
        staging = {'components': {'cms': old_cms, 'frontend': {'image': 'frontend-old'}}}
        production = {'components': {'cms': new_cms, 'frontend': {'image': 'frontend-old'}}}
        candidate = {'owner': 'test', 'components': {'frontend': {'image': 'frontend-new'}}}
        with contextlib.ExitStack() as mocks:
            mocks.enter_context(patch.object(release, 'environment_lock', lambda *args: contextlib.nullcontext()))
            mocks.enter_context(patch.object(release, 'require_current', lambda *args: None))
            mocks.enter_context(patch.object(release, 'load_json', lambda path: staging if path.name == 'staging.json' else production))
            snapshot = mocks.enter_context(patch.object(release, 'snapshot_components', side_effect=AssertionError('Mutation preparation reached before schema validation')))
            with self.assertRaises(ValueError):
                release.activate(pathlib.Path('/unused'), 'staging', candidate, pathlib.Path('/unused/recipe'))
            snapshot.assert_not_called()

    def test_completed_preparation_jobs_are_not_serving_application_pods(self):
        application = {'metadata': {'ownerReferences': [{'kind': 'ReplicaSet'}]}}
        completed_job = {'metadata': {'ownerReferences': [{'kind': 'Job'}]}, 'status': {'phase': 'Succeeded'}}
        terminating = {'metadata': {'ownerReferences': [{'kind': 'ReplicaSet'}], 'deletionTimestamp': 'now'}}
        self.assertEqual(release.serving_deployment_pods([application, completed_job, terminating]), [application])

    def test_frontend_release_also_updates_staging_access_gateway(self):
        old = {'cms': {'image': 'cms-old'}, 'frontend': {'image': 'frontend-old'}}
        new = {**old, 'frontend': {'image': 'frontend-new'}}
        self.assertEqual(set(release.changed_workloads('staging', old, new)), {'frontend', 'gateway'})
        self.assertEqual(set(release.changed_workloads('production', old, new)), {'frontend'})
        self.assertEqual(release.changed_workloads('staging', old, old), {})

    def test_schema_contract_accepts_optional_additions_but_rejects_removal(self):
        previous = {'article': {'attributes': {'title': {'type': 'string'}}}}
        added = {'article': {'attributes': {'title': {'type': 'string'}, 'summary': {'type': 'text'}}}}
        release.require_compatible_schema(previous, added)
        with self.assertRaises(ValueError):
            release.require_compatible_schema(previous, {'article': {'attributes': {}}})
        with self.assertRaises(ValueError):
            release.require_compatible_schema(previous, {'article': {'attributes': {'title': {'type': 'integer'}}}})

    def test_failed_activation_restores_real_deployment_and_does_not_advance_release(self):
        previous = {'components': {'frontend': {'image': 'previous'}, 'cms': {'image': 'cms'}}}
        candidate = {'owner': 'test', 'deployerRevision': 'a' * 40, 'components': {'frontend': {'image': 'candidate'}}}
        calls = []
        saved = []

        def verify(environment, components):
            if 'frontend' in components:
                calls.append(('verify', components['frontend']['image']))
                if components['frontend']['image'] == 'candidate':
                    raise RuntimeError('wrong public revision')

        def kube(environment, *args, **kwargs):
            self.assertEqual(args[:3], ('patch', 'deployment', 'gthdf-frontend'))
            self.assertIn('previous-spec', args[-1])
            calls.append(('restore', 'previous'))

        with contextlib.ExitStack() as mocks:
            for name, replacement in {
                'environment_lock': lambda *args: contextlib.nullcontext(),
                'require_current': lambda value: None,
                'load_json': lambda path: previous,
                'snapshot_components': lambda *args: {'frontend': {'spec': {'proof': 'previous-spec'}}},
                'patch_component': lambda env, name, value: calls.append(('apply', value['image'])),
                'verify_components': verify,
                'kubectl': kube,
                'save_json': lambda path, value: saved.append((path, value.copy())),
            }.items():
                mocks.enter_context(patch.object(release, name, replacement))
            with self.assertRaises(RuntimeError):
                release.activate(pathlib.Path('/unused'), 'production', candidate, pathlib.Path('/unused/recipe'))
        self.assertEqual(calls, [('apply', 'candidate'), ('verify', 'candidate'), ('restore', 'previous'), ('verify', 'previous')])
        self.assertEqual(len(saved), 1)
        self.assertEqual(saved[0][0].parent.name, 'history')
        self.assertEqual(saved[0][1]['status'], 'failed')
        self.assertEqual(saved[0][1]['rollback'], 'verified')

    def test_mutable_images_or_foreign_repositories_are_rejected(self):
        for image in ['ghcr.io/thedamfr/gthdf-cms:latest', 'ghcr.io/other/cms@sha256:' + 'a' * 64]:
            with self.assertRaises(ValueError):
                release.validate_component('cms', {'image': image, 'revision': 'a' * 40})

    def test_failed_qualification_never_activates_production(self):
        calls = []

        def activate(environment):
            calls.append(environment)
            if environment == 'staging':
                raise RuntimeError('functional recipe failed')

        with self.assertRaises(RuntimeError):
            release.promote(activate)
        self.assertEqual(calls, ['staging'])


if __name__ == '__main__':
    unittest.main()
