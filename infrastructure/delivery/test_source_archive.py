import importlib.util
import pathlib
import tarfile
import unittest

spec = importlib.util.spec_from_file_location('extract_source', pathlib.Path(__file__).with_name('extract-source.py'))
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)


class SourceArchiveTests(unittest.TestCase):
    def test_source_archive_cannot_escape_infrastructure_or_install_links(self):
        source.validate_members([tarfile.TarInfo('infrastructure/delivery/release.py')])
        for name in ('/etc/passwd', '../outside', 'infrastructure/../../outside', 'README.md'):
            with self.assertRaises(ValueError):
                source.validate_members([tarfile.TarInfo(name)])
        symlink = tarfile.TarInfo('infrastructure/link')
        symlink.type = tarfile.SYMTYPE
        with self.assertRaises(ValueError):
            source.validate_members([symlink])
