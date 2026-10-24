import importlib.util
import sqlite3
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('deploy', Path(__file__).with_name('deploy-hosted.py'))
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)

class AccountCaseGuardTest(unittest.TestCase):
    def test_legacy_empty_and_populated_database(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'state.sqlite'
            with sqlite3.connect(path) as db:
                db.execute('CREATE TABLE cases(id TEXT)')
            self.assertFalse(deploy.has_account_cases(path))
            with sqlite3.connect(path) as db:
                db.execute('CREATE TABLE workspace_cases(case_id TEXT)')
            self.assertFalse(deploy.has_account_cases(path))
            with sqlite3.connect(path) as db:
                db.execute("INSERT INTO workspace_cases VALUES ('private-case')")
            self.assertTrue(deploy.has_account_cases(path))

    def test_missing_database_does_not_silently_become_safe(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(sqlite3.OperationalError):
                deploy.has_account_cases(Path(directory) / 'missing.sqlite')

if __name__ == '__main__':
    unittest.main()
