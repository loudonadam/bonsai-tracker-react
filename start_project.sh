#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR"
HOST_IP=${HOST_IP:-}
PYTHON_BIN=${PYTHON_BIN:-}

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but was not found in PATH." >&2
  exit 1
fi

find_python() {
  if [ -n "$PYTHON_BIN" ]; then
    if command -v "$PYTHON_BIN" >/dev/null 2>&1; then
      echo "$PYTHON_BIN"
      return
    fi
    echo "Error: Could not run Python executable '$PYTHON_BIN'." >&2
    exit 1
  fi

  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      echo "$candidate"
      return
    fi
  done

  if command -v py >/dev/null 2>&1; then
    echo "py -3"
    return
  fi

  echo "Error: Could not locate a Python interpreter (3.11+). Install Python or set PYTHON_BIN." >&2
  exit 1
}

PYTHON_CMD=$(find_python)

run_python() {
  if [[ "$PYTHON_CMD" == "py -3" ]]; then
    py -3 "$@"
  else
    "$PYTHON_CMD" "$@"
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
      run_python - "$env_file" "$HOST_IP" <<'PY'
import sys
from pathlib import Path

file_path = Path(sys.argv[1])
key = "VITE_API_BASE_URL"
value = f"http://{sys.argv[2]}:8000/api"

lines = []
if file_path.exists():
    lines = file_path.read_text().splitlines()

for idx, line in enumerate(lines):
    if line.startswith(f"{key}="):
        lines[idx] = f"{key}={value}"
        break
else:
    lines.append(f"{key}={value}")

file_path.write_text("\n".join(lines) + ("\n" if lines else ""))
PY
    fi
  fi

  popd >/dev/null
}

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
