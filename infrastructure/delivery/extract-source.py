"""Extract only bounded, regular infrastructure files from an exact Git archive."""
import pathlib
import sys
import tarfile


def validate_members(members):
    if len(members) > 1000 or sum(member.size for member in members) > 20 * 1024 * 1024:
        raise ValueError('Source archive exceeds its limit')
    for member in members:
        path = pathlib.PurePosixPath(member.name)
        if (path.is_absolute() or '..' in path.parts or not path.parts
                or path.parts[0] != 'infrastructure' or not (member.isfile() or member.isdir())):
            raise ValueError('Unsafe source archive member')


if __name__ == '__main__':
    with tarfile.open(sys.argv[1], mode='r:') as archive:
        members = archive.getmembers()
        validate_members(members)
        archive.extractall(sys.argv[2], members=members, filter='data')
