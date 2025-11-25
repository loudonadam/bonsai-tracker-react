"""Bundle the app into a self-contained Windows executable.

Steps performed:
1. npm install (if needed) and npm run build to produce the React dist folder.
2. Copy the dist output into backend/app/frontend_dist so FastAPI can serve it.
3. Run PyInstaller against backend/app/serve.py to create BonsaiTracker.exe.

Run this script on Windows from the repo root:
    python scripts/build_windows_exe.py

Requirements:
- Node.js available on PATH
- Python 3.11+ with the packages in backend/requirements-packaging.txt installed
- PyInstaller 6.11+ (installed via requirements-packaging.txt)
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND_DIST_SRC = ROOT / "dist"
FRONTEND_DIST_DST = BACKEND / "app" / "frontend_dist"
VAR_DIR = BACKEND / "var"


def run(cmd: list[str], cwd: Path | None = None) -> None:
    subprocess.run(cmd, check=True, cwd=cwd or ROOT)


def build_frontend() -> None:
    run(["npm", "install"], cwd=ROOT)
    run(["npm", "run", "build"], cwd=ROOT)



def sync_frontend_dist() -> None:
    if FRONTEND_DIST_DST.exists():
        shutil.rmtree(FRONTEND_DIST_DST)
    shutil.copytree(FRONTEND_DIST_SRC, FRONTEND_DIST_DST)



def ensure_var_dirs() -> None:
    (VAR_DIR / "media" / "full").mkdir(parents=True, exist_ok=True)
    (VAR_DIR / "media" / "thumbs").mkdir(parents=True, exist_ok=True)


def build_executable() -> None:
    pyinstaller_args = [
        "pyinstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name",
        "BonsaiTracker",
        "--add-data",
        f"{FRONTEND_DIST_DST}{os.pathsep}app/frontend_dist",
        "--add-data",
        f"{VAR_DIR}{os.pathsep}app/var",
        str(BACKEND / "app" / "serve.py"),
    ]
    run(pyinstaller_args, cwd=BACKEND)


def main() -> None:
    print("Building React UI...")
    build_frontend()
    print("Copying frontend build into backend/app/frontend_dist...")
    sync_frontend_dist()
    print("Ensuring media folders exist...")
    ensure_var_dirs()
    print("Creating Windows executable with PyInstaller...")
    build_executable()
    print("\nSuccess! Find the build artifacts under backend/dist/BonsaiTracker.exe")


if __name__ == "__main__":
    main()
