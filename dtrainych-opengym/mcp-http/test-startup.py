#!/usr/bin/env python3
"""Exercise the exact embedded compose entrypoint, including a fresh bootstrap.

Requires Python/PyYAML, Node 22 on PATH, GitHub/npm connectivity, and a free port 3487.
All data and runtime files are synthetic and temporary.
"""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import yaml

root = Path(__file__).resolve().parent
service = yaml.safe_load((root.parent / 'docker-compose.yml').read_text())['services']['mcp']
with tempfile.TemporaryDirectory(prefix='opengym-startup-') as folder:
    scratch = Path(folder)
    data = scratch / 'data'
    data.mkdir()
    (data / 'db.json').write_text(json.dumps({'users': [{'id': 'test', 'name': 'Test'}]}))
    (data / 'state-test.json').write_text(json.dumps({'routines': [], 'workouts': [], 'bodyweight': []}))
    runtime = scratch / 'runtime'
    env = dict(os.environ, OPENGYM_DATA=str(data), OPENGYM_UID='test',
               MCP_RUNTIME_DIR=str(runtime), MCP_TOKEN='0' * 64,
               MCP_ALLOWED_HOSTS='127.0.0.1:3487,localhost:3487',
               MCP_ADAPTER_BASE64=service['environment']['MCP_ADAPTER_BASE64'])
    command = service['entrypoint'] + service['command']
    for iteration in range(2):
        with (scratch / 'startup.log').open('w+') as log:
            child = subprocess.Popen(command, env=env, stdout=log, stderr=log)
            try:
                deadline = time.monotonic() + 240
                while True:
                    if child.poll() is not None:
                        log.seek(0)
                        raise RuntimeError(log.read()[-4000:])
                    try:
                        with socket.create_connection(('127.0.0.1', 3487), timeout=1):
                            break
                    except OSError:
                        if time.monotonic() > deadline:
                            raise TimeoutError('MCP startup timed out')
                        time.sleep(0.5)
                smoke = runtime / 'mcp/smoke.mjs'
                shutil.copyfile(root / 'smoke.mjs', smoke)
                subprocess.run(['node', str(smoke)], env=env, check=True, timeout=30)
                print('PASS:', 'fresh embedded startup' if iteration == 0 else 'cached embedded restart', flush=True)
            finally:
                child.terminate()
                child.wait(timeout=10)
