#!/usr/bin/env bash
set -euo pipefail

# Simple helper to bootstrap and run the Bonsai Tracker frontend and backend
# for local development. The script is idempotent and can be re-run as needed.
#
# Usage:
#   ./start_project.sh            # uses defaults
#   HOST_IP=192.168.1.42 ./start_project.sh   # override IP for Vite dev server banner
#
# The script will:
#   * Ensure the backend virtual environment exists and dependencies are installed
#   * Install frontend dependencies (npm install)
#   * Ensure a .env.local file exists (copied from .env.example if missing)
#   * Launch the FastAPI backend on 0.0.0.0:8000
#   * Launch the Vite dev server on 0.0.0.0:5173
#
# Both servers bind to 0.0.0.0 so other devices on the same network (e.g. your phone)
# can reach them. When the script exits, both processes are shut down cleanly.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR"
PYTHON_BIN=${PYTHON_BIN:-}
HOST_IP=${HOST_IP:-}

API_BASE_URL_OVERRIDE=""
if [ -n "$HOST_IP" ] && [ -z "${VITE_API_BASE_URL:-}" ]; then
  API_BASE_URL_OVERRIDE="http://$HOST_IP:8000/api"
fi

PYTHON_CMD=()

select_python() {
  if [ -n "$PYTHON_BIN" ]; then
    if command -v "$PYTHON_BIN" >/dev/null 2>&1; then
      PYTHON_CMD=("$PYTHON_BIN")
      return
    fi
    echo "Error: Could not find Python executable '$PYTHON_BIN'. Set PYTHON_BIN to a valid command." >&2
    exit 1
  fi

  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      PYTHON_CMD=("$candidate")
      return
    fi
  done

  if command -v py >/dev/null 2>&1; then
    # Prefer Python 3 when invoking the Windows py launcher.
    PYTHON_CMD=(py -3)
    return
  fi

  echo "Error: Could not find a Python 3 interpreter. Install Python 3.11+ or set PYTHON_BIN to point to it." >&2
  exit 1
}

select_python

update_env_file() {
  local file="$1"
  local key="$2"
  local value="$3"
  "${PYTHON_CMD[@]}" - "$file" "$key" "$value" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]

lines = []
if path.exists():
    lines = path.read_text().splitlines()

updated = False
for index, line in enumerate(lines):
    if line.startswith(f"{key}="):
        lines[index] = f"{key}={value}"
        updated = True
        break

if not updated:
    lines.append(f"{key}={value}")

path.write_text("\n".join(lines) + ("\n" if lines else ""))
PY
}

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but was not found in PATH." >&2
  exit 1
fi

pushd "$BACKEND_DIR" >/dev/null

if [ ! -d .venv ]; then
  echo "Creating Python virtual environment in backend/.venv"
  "${PYTHON_CMD[@]}" -m venv .venv
fi

VENV_BIN_DIR=".venv/bin"
if [ ! -d "$VENV_BIN_DIR" ] && [ -d ".venv/Scripts" ]; then
  VENV_BIN_DIR=".venv/Scripts"
fi

VENV_PYTHON="$VENV_BIN_DIR/python"
if [ ! -x "$VENV_PYTHON" ] && [ -x "$VENV_PYTHON.exe" ]; then
  VENV_PYTHON="$VENV_PYTHON.exe"
fi

if [ ! -x "$VENV_PYTHON" ]; then
  echo "Error: could not find Python executable inside the virtualenv at $VENV_PYTHON" >&2
  exit 1
fi

ACTIVATE_SCRIPT="$VENV_BIN_DIR/activate"
if [ ! -f "$ACTIVATE_SCRIPT" ]; then
  echo "Error: could not find virtualenv activation script at $ACTIVATE_SCRIPT" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ACTIVATE_SCRIPT"

if [ -f requirements.txt ]; then
  echo "Installing backend dependencies"
  "$VENV_PYTHON" -m pip install --upgrade pip >/dev/null
  "$VENV_PYTHON" -m pip install -r requirements.txt
fi

popd >/dev/null

pushd "$FRONTEND_DIR" >/dev/null

echo "Installing frontend dependencies"
npm install

if [ ! -f .env.local ] && [ -f .env.example ]; then
  echo "Creating .env.local from .env.example"
  cp .env.example .env.local
  echo "Update .env.local to point VITE_API_BASE_URL to the machine's LAN IP if needed."
fi

if [ -n "$API_BASE_URL_OVERRIDE" ]; then
  ENV_FILE="$FRONTEND_DIR/.env.local"
  if [ ! -f "$ENV_FILE" ] && [ -f "$FRONTEND_DIR/.env.example" ]; then
    cp "$FRONTEND_DIR/.env.example" "$ENV_FILE"
  fi
  if [ -f "$ENV_FILE" ]; then
    echo "Setting VITE_API_BASE_URL to $API_BASE_URL_OVERRIDE for this session"
    update_env_file "$ENV_FILE" "VITE_API_BASE_URL" "$API_BASE_URL_OVERRIDE"
  fi
fi

popd >/dev/null

BACKEND_UVICORN="$BACKEND_DIR/$VENV_BIN_DIR/uvicorn"
if [ ! -x "$BACKEND_UVICORN" ] && [ -x "$BACKEND_UVICORN.exe" ]; then
  BACKEND_UVICORN="$BACKEND_UVICORN.exe"
fi

BACKEND_CMD=("$BACKEND_UVICORN" "app.main:app" "--reload" "--host" "0.0.0.0" "--port" "8000")
FRONTEND_CMD=("npm" "run" "dev" "--" "--host" "0.0.0.0" "--port" "5173")

FRONTEND_ENV_PREFIX=()
if [ -n "$API_BASE_URL_OVERRIDE" ]; then
  FRONTEND_ENV_PREFIX=(env "VITE_API_BASE_URL=$API_BASE_URL_OVERRIDE")
fi

# Fallback if uvicorn is not in the virtualenv bin yet (e.g., first install failed)
if [ ! -x "${BACKEND_CMD[0]}" ]; then
  BACKEND_CMD=("$VENV_PYTHON" "-m" "uvicorn" "app.main:app" "--reload" "--host" "0.0.0.0" "--port" "8000")
fi

cleanup() {
  echo "\nStopping development servers..."
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID"
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID"
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

pushd "$BACKEND_DIR" >/dev/null

if [ -z "$HOST_IP" ]; then
  HOST_MESSAGE="Access the app on this machine at http://localhost:5173"
else
  HOST_MESSAGE="Access the app from another device at http://$HOST_IP:5173"
fi

echo "Starting FastAPI backend..."
"${BACKEND_CMD[@]}" &
BACKEND_PID=$!

popd >/dev/null

pushd "$FRONTEND_DIR" >/dev/null

echo "Starting Vite dev server..."
if [ ${#FRONTEND_ENV_PREFIX[@]} -gt 0 ]; then
  "${FRONTEND_ENV_PREFIX[@]}" "${FRONTEND_CMD[@]}" &
else
  "${FRONTEND_CMD[@]}" &
fi
FRONTEND_PID=$!

popd >/dev/null

echo
echo "$HOST_MESSAGE"
echo "Press Ctrl+C to stop both servers."

tail --pid="$FRONTEND_PID" -f /dev/null
