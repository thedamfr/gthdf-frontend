import importlib.util
import pathlib
import os
import stat
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location('foundation', pathlib.Path(__file__).with_name('prepare-staging.py'))
foundation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(foundation)
spec = importlib.util.spec_from_file_location('release', pathlib.Path(__file__).with_name('release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class FoundationTests(unittest.TestCase):
    def test_existing_state_directory_must_be_private_owned_and_not_a_symlink(self):
        def directory(mode, owner=os.geteuid()):
            return SimpleNamespace(lstat=lambda: SimpleNamespace(st_mode=mode, st_uid=owner))
        for operation in [foundation.require_private_directory, release.require_private_directory]:
            operation(directory(stat.S_IFDIR | 0o700))
            for unsafe in [directory(stat.S_IFDIR | 0o755), directory(stat.S_IFDIR | 0o700, os.geteuid() + 1), directory(stat.S_IFLNK | 0o700), directory(stat.S_IFREG | 0o700)]:
                with self.assertRaises(RuntimeError):
                    operation(unsafe)

    def test_reused_application_credentials_are_rejected_before_preparing_data(self):
        keys = ['POSTGRES_PASSWORD', 'APP_KEYS', 'API_TOKEN_SALT', 'ADMIN_JWT_SECRET', 'TRANSFER_TOKEN_SALT', 'ENCRYPTION_KEY', 'JWT_SECRET', 'PREVIEW_SECRET', 'STRAPI_API_TOKEN']
        staging = {key: 'stage-fixture-' + key for key in keys}
        production = {key: 'prod-fixture-' + key for key in keys}
        foundation.require_secret_isolation(staging, production)
        for key in keys:
            for value in (None, production[key]):
                with self.subTest(key=key, missing=value is None):
                    with self.assertRaisesRegex(RuntimeError, '^Staging secret isolation failed: ' + key + '$'):
                        foundation.require_secret_isolation({**staging, key: value}, production)
