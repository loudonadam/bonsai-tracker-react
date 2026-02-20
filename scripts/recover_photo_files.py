#!/usr/bin/env python3
"""Recover missing bonsai photo files by searching old directories/backups.

This script reads photo paths from the Bonsai Tracker SQLite database and checks
whether each `full_path` and `thumbnail_path` exists under the configured media
root. For missing files, it searches one or more source directories for a file
with the same basename (UUID-style filename) and copies it into place.

Usage examples:

  # Dry run (no file writes)
  python scripts/recover_photo_files.py

  # Recover using explicit source locations
  python scripts/recover_photo_files.py \
    --source /path/to/old/media \
    --source /mnt/backup/bonsai-photos \
    --apply

  # Use a specific database/media root
  python scripts/recover_photo_files.py \
    --db /path/to/bonsai.db \
    --media-root /path/to/media \
    --apply
"""

from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
import tempfile
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Iterable


def _default_repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _default_db_path() -> Path:
    data_root = Path.home() / ".bonsai-tracker"
    modern = data_root / "bonsai.db"
    legacy = _default_repo_root() / "backend" / "bonsai.db"
    return modern if modern.exists() else legacy


def _default_media_root() -> Path:
    data_root = Path.home() / ".bonsai-tracker"
    modern = data_root / "media"
    legacy = _default_repo_root() / "backend" / "var" / "media"
    return modern if modern.exists() else legacy


def _default_sources(media_root: Path) -> list[Path]:
    repo_root = _default_repo_root()
    candidates = [
        media_root,
        Path.home() / ".bonsai-tracker" / "media",
        repo_root / "backend" / "var" / "media",
        repo_root / "backend",
    ]

    seen: set[Path] = set()
    ordered: list[Path] = []
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        ordered.append(candidate)
    return ordered


def _iter_photo_rows(conn: sqlite3.Connection) -> Iterable[tuple[int, str, str]]:
    cursor = conn.execute(
        "SELECT id, full_path, thumbnail_path FROM photos ORDER BY id"
    )
    for photo_id, full_path, thumbnail_path in cursor.fetchall():
        if not full_path or not thumbnail_path:
            continue
        yield int(photo_id), str(full_path), str(thumbnail_path)


def _resolve_target_path(media_root: Path, stored_path: str) -> Path:
    candidate = Path(stored_path)
    return candidate if candidate.is_absolute() else media_root / candidate


def _build_source_index(source_roots: list[Path]) -> dict[str, list[Path]]:
    index: dict[str, list[Path]] = defaultdict(list)
    for root in source_roots:
        if not root.exists() or not root.is_dir():
            continue

        for file_path in root.rglob("*"):
            if not file_path.is_file():
                continue
            index[file_path.name].append(file_path)
    return index


def _materialize_zip_source(zip_path: Path, workdir: Path) -> Path:
    target = workdir / f"zip_{zip_path.stem}"
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(target)
    return target


def _pick_best_match(matches: list[Path], expected_suffix: str) -> Path | None:
    if not matches:
        return None

    preferred = [m for m in matches if expected_suffix in m.parts]
    if preferred:
        return preferred[0]
    return matches[0]


def main() -> int:
    parser = argparse.ArgumentParser(description="Recover missing bonsai photo files")
    parser.add_argument("--db", type=Path, default=_default_db_path(), help="Path to bonsai.db")
    parser.add_argument(
        "--media-root",
        type=Path,
        default=_default_media_root(),
        help="Root directory containing full/ and thumbs/",
    )
    parser.add_argument(
        "--source",
        type=Path,
        action="append",
        default=[],
        help=(
            "Additional source location to scan (repeatable). "
            "Can be a directory or a .zip backup archive."
        ),
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Copy files into media root (default is dry-run)",
    )
    args = parser.parse_args()

    db_path: Path = args.db
    media_root: Path = args.media_root

    if not db_path.exists():
        print(f"ERROR: Database not found: {db_path}")
        return 1

    if not media_root.exists():
        print(f"WARNING: Media root does not exist yet: {media_root}")

    sources = _default_sources(media_root)

    tmp_root = Path(tempfile.mkdtemp(prefix="bonsai-recover-"))
    prepared_sources: list[Path] = []
    try:
        for source in args.source:
            if source.suffix.lower() == ".zip" and source.exists():
                extracted = _materialize_zip_source(source, tmp_root)
                prepared_sources.append(extracted)
            else:
                prepared_sources.append(source)

        for source in prepared_sources:
            if source not in sources:
                sources.append(source)

        print(f"Database:   {db_path}")
        print(f"Media root: {media_root}")
        print("Sources:")
        for source in sources:
            exists_marker = "✓" if source.exists() else "✗"
            print(f"  [{exists_marker}] {source}")

        print("\nIndexing source files (this may take a bit)...")
        source_index = _build_source_index(sources)
        print(f"Indexed {sum(len(v) for v in source_index.values())} file entries")

        conn = sqlite3.connect(str(db_path))
        rows = list(_iter_photo_rows(conn))
        conn.close()

        missing_targets: list[tuple[int, str, Path]] = []
        for photo_id, full_path, thumb_path in rows:
            full_target = _resolve_target_path(media_root, full_path)
            thumb_target = _resolve_target_path(media_root, thumb_path)

            if not full_target.exists():
                missing_targets.append((photo_id, "full", full_target))
            if not thumb_target.exists():
                missing_targets.append((photo_id, "thumbs", thumb_target))

        print(f"\nPhotos in DB: {len(rows)}")
        print(f"Missing files: {len(missing_targets)}")

        recovered = 0
        unresolved = 0

        for photo_id, expected_suffix, target in missing_targets:
            matches = source_index.get(target.name, [])
            source_file = _pick_best_match(matches, expected_suffix)

            if source_file is None:
                unresolved += 1
                continue

            print(f"{photo_id:>5} [{expected_suffix}] {target} <- {source_file}")
            if args.apply:
                target.parent.mkdir(parents=True, exist_ok=True)
                if target.resolve() != source_file.resolve():
                    shutil.copy2(source_file, target)
                recovered += 1

        if not args.apply:
            print("\nDry run only. Re-run with --apply to copy recoverable files.")
        else:
            print(f"\nRecovered files copied: {recovered}")

        if unresolved and recovered == 0:
            print("\nNo missing files could be matched by filename in the scanned sources.")
            print("Likely meaning: the photo files are not present in those folders/archives.")
            print("Next steps:")
            print("  1) Add any other backup folders/drives/cloud export paths via --source")
            print("  2) Point --source at a full backup .zip archive (supported)")
            print("  3) Verify you are targeting the correct DB/media root with --db and --media-root")

        print(f"Still unresolved: {unresolved}")
        return 0
    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
