#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR"
HOST_IP=${HOST_IP:-}
PYTHON_BIN=${PYTHON_BIN:-}

case "${OSTYPE:-}" in
  msys* | cygwin* | win32*)
    set -o igncr 2>/dev/null || true
    ;;
esac

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but was not found in PATH." >&2
  exit 1
fi

find_python() {
  if [ -n "$PYTHON_BIN" ]; then
    if command -v "$PYTHON_BIN" >/dev/null 2>&1 && "$PYTHON_BIN" -c "import sys" >/dev/null 2>&1; then
      echo "$PYTHON_BIN"
      return
    fi
    echo "Error: Could not run Python executable '$PYTHON_BIN'." >&2
    exit 1
  fi

  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "import sys" >/dev/null 2>&1; then
      echo "$candidate"
      return
    fi
  done

  if command -v py >/dev/null 2>&1; then
    if py -3 -c "import sys" >/dev/null 2>&1; then
      echo "py -3"
      return
    fi
  fi

  echo "Error: Could not locate a Python interpreter (3.11+). Install Python or set PYTHON_BIN." >&2
  exit 1
}

PYTHON_CMD=""

run_python() {
  if [ -z "$PYTHON_CMD" ]; then
    PYTHON_CMD=$(find_python)
  fi

  if [[ "$PYTHON_CMD" == "py -3" ]]; then
    py -3 "$@"
  else
    "$PYTHON_CMD" "$@"
  fi
}

detect_host_ip() {
  if [ -n "$HOST_IP" ]; then
    return
  fi

  HOST_IP=$(node - <<'NODE' 2>/dev/null || true)
const os = require('node:os');

const interfaces = os.networkInterfaces();
const candidates = [];

for (const entries of Object.values(interfaces)) {
  for (const entry of entries ?? []) {
    if (entry.internal || entry.family !== 'IPv4') {
      continue;
    }
    candidates.push(entry.address);
  }
}

const prefer = [
  (ip) => ip.startsWith('192.168.'),
  (ip) => ip.startsWith('10.'),
  (ip) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip),
  (ip) => ip && ip !== '127.0.0.1' && ip !== '0.0.0.0',
];

let result = '';
for (const matcher of prefer) {
  const match = candidates.find((ip) => matcher(ip));
  if (match) {
    result = match;
    break;
  }
}

if (!result) {
  result = candidates[0] ?? '';
}

if (result) {
  process.stdout.write(result);
}
NODE

  if [ -n "$HOST_IP" ]; then
    echo "Detected local IP address: $HOST_IP"
  fi
}

ensure_backend() {
  pushd "$BACKEND_DIR" >/dev/null

  if [ ! -d .venv ]; then
    echo "Creating Python virtual environment in backend/.venv"
    run_python -m venv .venv
  fi

  if [ -f requirements.txt ]; then
    local venv_python
    if [ -x .venv/bin/python ]; then
      venv_python=".venv/bin/python"
    else
      venv_python=".venv/Scripts/python.exe"
    fi

    echo "Installing backend dependencies"
    "$venv_python" -m pip install --upgrade pip >/dev/null
    "$venv_python" -m pip install -r requirements.txt
  fi

  popd >/dev/null
}

ensure_frontend() {
  pushd "$FRONTEND_DIR" >/dev/null

  echo "Installing frontend dependencies"
  npm install

  if [ ! -f .env.local ] && [ -f .env.example ]; then
    echo "Creating .env.local from .env.example"
    cp .env.example .env.local
  fi

  if [ -n "$HOST_IP" ]; then
    local env_file="$FRONTEND_DIR/.env.local"
    if [ ! -f "$env_file" ] && [ -f "$FRONTEND_DIR/.env.example" ]; then
      cp "$FRONTEND_DIR/.env.example" "$env_file"
    fi
    if [ -f "$env_file" ]; then
      echo "Updating VITE_API_BASE_URL to http://$HOST_IP:8000/api"
      node - "$env_file" "$HOST_IP" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [envPath, hostIp] = process.argv.slice(2);
const resolvedPath = path.resolve(envPath);
const key = 'VITE_API_BASE_URL';
const value = `http://${hostIp}:8000/api`;

let lines = [];
if (fs.existsSync(resolvedPath)) {
  lines = fs.readFileSync(resolvedPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
  if (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }
}

let updated = false;
lines = lines.map((line) => {
  if (!updated && line.startsWith(`${key}=`)) {
    updated = true;
    return `${key}=${value}`;
  }
  return line;
});

if (!updated) {
  lines.push(`${key}=${value}`);
}

const nextContent = `${lines.join('\n')}${lines.length ? '\n' : ''}`;
fs.writeFileSync(resolvedPath, nextContent);
NODE
    fi
  fi

  popd >/dev/null
}

detect_host_ip
ensure_backend
ensure_frontend

if [ -z "$HOST_IP" ]; then
  HOST_MESSAGE="Access the app on this machine at http://localhost:5173"
else
  HOST_MESSAGE="Access the app from another device at http://$HOST_IP:5173"
fi

export DEV_LAUNCHER_HOST_MESSAGE="$HOST_MESSAGE"
if [ -n "$HOST_IP" ]; then
  export DEV_LAUNCHER_API_BASE_URL="http://$HOST_IP:8000/api"
fi

node "$ROOT_DIR/scripts/dev_launcher.mjs"
