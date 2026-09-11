import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('foundation', pathlib.Path(__file__).with_name('prepare-staging.py'))
foundation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(foundation)


class FoundationTests(unittest.TestCase):
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
