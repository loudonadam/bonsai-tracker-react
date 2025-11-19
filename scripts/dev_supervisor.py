#!/usr/bin/env python3

import argparse
import base64
import os
import signal
import subprocess
import sys
import threading
import time
from typing import List


def decode_cmd(encoded: str) -> List[str]:
    if not encoded:
        return []
    data = base64.b64decode(encoded.encode())
    parts = data.decode().split("\0")
    return [part for part in parts if part]


class DevSupervisor:
    def __init__(self, backend_cmd, backend_cwd, frontend_cmd, frontend_cwd, host_message, frontend_env_pairs):
        self.backend_cmd = backend_cmd
        self.backend_cwd = backend_cwd
        self.frontend_cmd = frontend_cmd
        self.frontend_cwd = frontend_cwd
        self.host_message = host_message
        self.frontend_env_pairs = frontend_env_pairs
        self.backend_proc = None
        self.frontend_proc = None
        self._stop_reason = None
        self._lock = threading.Lock()
        self._shutdown_started = False

    def _spawn(self):
        print("Starting FastAPI backend...", flush=True)
        self.backend_proc = subprocess.Popen(self.backend_cmd, cwd=self.backend_cwd)

        frontend_env = os.environ.copy()
        frontend_env.update(dict(self.frontend_env_pairs))
        print("Starting Vite dev server...", flush=True)
        self.frontend_proc = subprocess.Popen(self.frontend_cmd, cwd=self.frontend_cwd, env=frontend_env)

        print()
        print(self.host_message, flush=True)
        print("Press Ctrl+C to stop both servers.", flush=True)

    def _terminate_process(self, proc, name):
        if proc is None:
            return
        if proc.poll() is not None:
            return
        print(f"Stopping {name}...", flush=True)
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            print(f"{name} did not exit in time; killing it.", flush=True)
            proc.kill()
            proc.wait()

    def _handle_signal(self, signum, frame):
        with self._lock:
            if self._stop_reason is None:
                self._stop_reason = f"signal {signum}"
        self.shutdown()

    def wait(self):
        self._spawn()
        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, self._handle_signal)

        try:
            while True:
                backend_status = self.backend_proc.poll()
                frontend_status = self.frontend_proc.poll()
                if backend_status is not None or frontend_status is not None:
                    with self._lock:
                        if self._stop_reason is None:
                            if backend_status is not None and backend_status != 0:
                                self._stop_reason = "backend exited"
                            elif frontend_status is not None and frontend_status != 0:
                                self._stop_reason = "frontend exited"
                            else:
                                self._stop_reason = "process exited"
                    break
                time.sleep(0.5)
        finally:
            self.shutdown()

        if self._stop_reason and "exited" in self._stop_reason and "signal" not in self._stop_reason:
            return 1
        return 0

    def shutdown(self):
        if self._shutdown_started:
            return
        self._shutdown_started = True
        self._terminate_process(self.frontend_proc, "Vite dev server")
        self._terminate_process(self.backend_proc, "FastAPI backend")
        print("\nStopping development servers...", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Dev server supervisor")
    parser.add_argument("--backend-cmd-b64", required=True)
    parser.add_argument("--backend-cwd", required=True)
    parser.add_argument("--frontend-cmd-b64", required=True)
    parser.add_argument("--frontend-cwd", required=True)
    parser.add_argument("--host-message", required=True)
    parser.add_argument("--frontend-env", action="append", default=[])
    args = parser.parse_args()

    backend_cmd = decode_cmd(args.backend_cmd_b64)
    frontend_cmd = decode_cmd(args.frontend_cmd_b64)

    frontend_env_pairs = []
    for item in args.frontend_env:
        if "=" not in item:
            parser.error(f"Invalid frontend env override: {item}")
        key, value = item.split("=", 1)
        frontend_env_pairs.append((key, value))

    supervisor = DevSupervisor(
        backend_cmd=backend_cmd,
        backend_cwd=args.backend_cwd,
        frontend_cmd=frontend_cmd,
        frontend_cwd=args.frontend_cwd,
        host_message=args.host_message,
        frontend_env_pairs=frontend_env_pairs,
    )

    sys.exit(supervisor.wait())


if __name__ == "__main__":
    main()
