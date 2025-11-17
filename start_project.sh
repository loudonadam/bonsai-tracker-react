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
PYTHON_BIN=${PYTHON_BIN:-python3}
HOST_IP=${HOST_IP:-}

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Error: Could not find Python executable '$PYTHON_BIN'. Set PYTHON_BIN to override." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but was not found in PATH." >&2
  exit 1
fi

pushd "$BACKEND_DIR" >/dev/null

if [ ! -d .venv ]; then
  echo "Creating Python virtual environment in backend/.venv"
  "$PYTHON_BIN" -m venv .venv
fi

VENV_BIN_DIR=".venv/bin"
if [ ! -d "$VENV_BIN_DIR" ] && [ -d ".venv/Scripts" ]; then
  VENV_BIN_DIR=".venv/Scripts"
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
  pip install --upgrade pip >/dev/null
  pip install -r requirements.txt
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

popd >/dev/null

BACKEND_UVICORN="$BACKEND_DIR/$VENV_BIN_DIR/uvicorn"
if [ ! -x "$BACKEND_UVICORN" ] && [ -x "$BACKEND_UVICORN.exe" ]; then
  BACKEND_UVICORN="$BACKEND_UVICORN.exe"
fi

BACKEND_CMD=("$BACKEND_UVICORN" "app.main:app" "--reload" "--host" "0.0.0.0" "--port" "8000")
FRONTEND_CMD=("npm" "run" "dev" "--" "--host" "0.0.0.0" "--port" "5173")

# Fallback if uvicorn is not in the virtualenv bin yet (e.g., first install failed)
if [ ! -x "${BACKEND_CMD[0]}" ]; then
  BACKEND_CMD=("$PYTHON_BIN" "-m" "uvicorn" "app.main:app" "--reload" "--host" "0.0.0.0" "--port" "8000")
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
"${FRONTEND_CMD[@]}" &
FRONTEND_PID=$!

popd >/dev/null

echo
echo "$HOST_MESSAGE"
echo "Press Ctrl+C to stop both servers."

tail --pid="$FRONTEND_PID" -f /dev/null
