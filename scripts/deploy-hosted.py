#!/usr/bin/env python3
"""Deploy a merged Second Look commit on the existing x1cloud event host.

No provider secrets in arguments/output. Builds before restarting, backs up SQLite,
verifies exact source/login/data and rolls code back on failure without rewinding data.
"""
import argparse
import datetime
import http.cookiejar
import json
import os
from pathlib import Path
import re
import shlex
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def read_env(path):
    values = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, separator, value = line.partition('=')
        if separator and re.fullmatch(r'[A-Z][A-Z0-9_]*', key):
            tokens = shlex.split(value, comments=True)
            values[key] = tokens[0] if tokens else ''
    return values


def request_json(opener, url, body=None, headers=None):
    headers = dict(headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(url, data=data, headers=headers)
    with opener.open(request, timeout=15) as response:
        return json.load(response)


def has_account_cases(database):
    with sqlite3.connect(f'file:{database}?mode=ro', uri=True) as connection:
        if not connection.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='workspace_cases'").fetchone():
            return False
        return connection.execute('SELECT 1 FROM workspace_cases LIMIT 1').fetchone() is not None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True, help='Full SHA already merged into origin/main')
    parser.add_argument('--deploy', action='store_true', help='Build and switch the running event service; otherwise preflight only')
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{40}', args.commit):
        parser.error('--commit must be a full lowercase Git SHA')
    repo = Path(__file__).resolve().parent.parent
    home = Path.home()
    env_file = Path(f'/run/user/{os.getuid()}/second-look-hosted.env')
    service = 'second-look-demo.service'
    root = home / '.local/share/second-look'
    dropin = home / '.config/systemd/user' / (service + '.d') / 'release.conf'
    # This tool uses only the existing event host configuration. It provisions no
    # accounts, secrets, tunnel, DNS or infrastructure on another machine.
    env = read_env(env_file)
    required = ['DEMO_ORIGIN', 'DEMO_ACCESS_CODE', 'DEMO_DATABASE']
    if any(not env.get(key) for key in required):
        raise RuntimeError('Existing hosted configuration is incomplete; no deployment performed.')
    database = Path(env['DEMO_DATABASE'])
    if not database.is_absolute() or not database.is_file():
        raise RuntimeError('Expected existing persistent database is missing.')
    run('systemctl', '--user', 'is-active', '--quiet', service)
    run('git', '-C', str(repo), 'fetch', 'origin')
    run('git', '-C', str(repo), 'merge-base', '--is-ancestor', args.commit, 'origin/main')
    if has_account_cases(database):
        scoped_source = subprocess.run(['git', '-C', str(repo), 'cat-file', '-e', args.commit + ':server/workspace-routes.ts'], capture_output=True)
        if scoped_source.returncode:
            raise RuntimeError('Refusing a downgrade to the single-case server while account cases exist.')
    old_release = subprocess.check_output(['systemctl', '--user', 'show', service, '-p', 'WorkingDirectory', '--value'], text=True).strip()
    if not old_release.startswith(str(root / 'releases') + '/'):
        raise RuntimeError('Unexpected service working directory; leaving it unchanged.')
    print(json.dumps({'preflight': 'passed', 'commit': args.commit, 'deploy': args.deploy}))
    if not args.deploy:
        return

    os.umask(0o077)
    releases = root / 'releases'
    releases.mkdir(parents=True, exist_ok=True)
    release = Path(tempfile.mkdtemp(prefix=args.commit + '-', dir=releases))
    archive = release / 'source.tar'
    run('git', '-C', str(repo), 'archive', args.commit, '--output', str(archive))
    run('tar', '-xf', str(archive), '-C', str(release))
    archive.unlink()  # our temporary transport, never existing application data
    run('npm', 'ci', cwd=release)
    run('npm', 'run', 'build', cwd=release)
    (release / 'RELEASE.json').write_text(json.dumps({'sourceSha': args.commit}) + '\n')

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backups = root / 'backups'
    backups.mkdir(parents=True, exist_ok=True)
    backup_path = backups / f'before-{args.commit[:12]}-{stamp}.sqlite'
    with sqlite3.connect(f'file:{database}?mode=ro', uri=True) as source:
        with sqlite3.connect(backup_path) as target:
            source.backup(target)
            if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise RuntimeError('Database backup integrity check failed; old service still running.')
    previous = dropin.read_bytes() if dropin.exists() else None
    dropin.parent.mkdir(parents=True, exist_ok=True)
    receipt = {'sourceSha': args.commit, 'release': str(release), 'previousRelease': old_release,
               'databaseBackup': str(backup_path), 'status': 'switching'}
    receipt_file = release / 'DEPLOYMENT.json'
    try:
        dropin.write_text(f'[Service]\nWorkingDirectory={release}\nEnvironment=RELEASE_SHA={args.commit}\n')
        run('systemctl', '--user', 'daemon-reload')
        run('systemctl', '--user', 'restart', service)
        # Loopback checks bind the running process to the exact SHA before the
        # public HTTPS login proves tunnel, cookie, origin and case access.
        plain = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        local = 'http://127.0.0.1:' + env.get('PORT', '3187')
        for attempt in range(20):
            try:
                if request_json(plain, local + '/api/health').get('releaseSha') == args.commit:
                    break
            except (OSError, ValueError):
                pass
            time.sleep(0.5)
        else:
            raise RuntimeError('New service did not report expected source SHA.')
        origin = env['DEMO_ORIGIN'].rstrip('/')
        if not origin.startswith('https://'):
            raise RuntimeError('Hosted origin must be HTTPS.')
        if request_json(plain, origin + '/api/health').get('releaseSha') != args.commit:
            raise RuntimeError('Public origin is not serving expected source.')
        try:
            request_json(plain, origin + '/api/case')
        except urllib.error.HTTPError as error:
            if error.code != 401:
                raise RuntimeError('Unexpected anonymous case response.') from None
        else:
            raise RuntimeError('Anonymous case access was not rejected.')
        jar = http.cookiejar.CookieJar()
        signed = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(jar))
        try:
            request_json(signed, origin + '/api/session/login', {'code': env['DEMO_ACCESS_CODE']}, {'Origin': origin})
            case = request_json(signed, origin + '/api/case')
            if case.get('id') != 'sample-fund' or not isinstance(case.get('revision'), int):
                raise RuntimeError('Authenticated case could not be read.')
            receipt.update({'status': 'verified', 'caseRevision': case['revision'], 'checks': ['exact-source-local-and-public', 'anonymous-401', 'hosted-login-and-case', 'sqlite-backup-integrity']})
        finally:
            # Revoke only this deployment check's own session.
            if list(jar):
                request_json(signed, origin + '/api/session/logout', {}, {'Origin': origin})
    except BaseException:
        if has_account_cases(database) and not (Path(old_release) / 'server/workspace-routes.ts').is_file():
            # The old example server lists all research. Never expose newly
            # private case data by rolling it back onto the expanded database.
            run('systemctl', '--user', 'stop', service)
            receipt['status'] = 'stopped-unsafe-downgrade-blocked'
            receipt_file.write_text(json.dumps(receipt, indent=2) + '\n')
            print('Verification failed. Service stopped because the prior release cannot isolate account cases; private data was preserved.')
            raise
        if previous is None:
            dropin.unlink(missing_ok=True)
        else:
            dropin.write_bytes(previous)
        run('systemctl', '--user', 'daemon-reload')
        run('systemctl', '--user', 'restart', service)
        run('systemctl', '--user', 'is-active', '--quiet', service)
        receipt['status'] = 'rolled-back-code'
        receipt_file.write_text(json.dumps(receipt, indent=2) + '\n')
        print('Deployment verification failed; previous service configuration restored. Database was not rewound.')
        raise
    receipt_file.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
