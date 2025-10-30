from __future__ import annotations

import csv
import io
import json
import re
import shutil
import tempfile
import zipfile
from datetime import date, datetime
from pathlib import Path
from typing import Iterable, Sequence

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..config import settings
from ..database import get_db

router = APIRouter(prefix=f"{settings.api_prefix}/backup", tags=["backup"])


def _iso_datetime(value: datetime | None) -> str:
    return value.isoformat() if value else ""


def _iso_date(value: date | None) -> str:
    return value.isoformat() if value else ""


def _bool_to_str(value: bool | None) -> str:
    if value is None:
        return ""
    return "true" if value else "false"


def _slugify(value: str, *, max_length: int = 32) -> str:
    normalized = value.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    if not normalized:
        normalized = "tree"
    return normalized[:max_length]


def _write_csv(zip_file: zipfile.ZipFile, filename: str, fieldnames: Sequence[str], rows: Iterable[dict]) -> None:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    zip_file.writestr(filename, buffer.getvalue())


def _load_csv_file(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as data_file:
        reader = csv.DictReader(data_file)
        return [row for row in reader]


def _normalize_photo_subpath(value: str | None, prefix: str) -> Path | None:
    if not value:
        return None

    path = Path(value)
    parts = list(path.parts)

    if path.is_absolute() and parts:
        parts = parts[1:]

    if ".." in parts:
        return None

    if prefix in parts:
        prefix_index = parts.index(prefix)
        parts = parts[prefix_index + 1 :]
    elif parts and parts[0] == prefix:
        parts = parts[1:]

    if not parts:
        return None

    return Path(*parts)


def _is_version_at_least(version: str, major: int, minor: int = 0) -> bool:
    parts = version.split(".")

    def _parse(index: int) -> int:
        if index >= len(parts):
            return 0
        part = parts[index]
        digits = []
        for char in part:
            if char.isdigit():
                digits.append(char)
            else:
                break
        return int("".join(digits)) if digits else 0

    version_major = _parse(0)
    version_minor = _parse(1)

    if version_major != major:
        return version_major > major

    return version_minor >= minor


def _collect_rows_v1(data_dir: Path) -> tuple[
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
]:
    required_files = {
        "data/species.csv",
        "data/bonsai.csv",
        "data/measurements.csv",
        "data/updates.csv",
        "data/photos.csv",
        "data/notifications.csv",
        "data/graveyard_entries.csv",
    }

    missing = [str((data_dir.parent / filename).relative_to(data_dir.parent)) for filename in required_files if not (data_dir.parent / filename).exists()]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Archive is missing required files: {', '.join(sorted(missing))}",
        )

    species_rows = _load_csv_file(data_dir / "species.csv")
    bonsai_rows = _load_csv_file(data_dir / "bonsai.csv")
    measurement_rows = _load_csv_file(data_dir / "measurements.csv")
    update_rows = _load_csv_file(data_dir / "updates.csv")
    photo_rows = _load_csv_file(data_dir / "photos.csv")
    notification_rows = _load_csv_file(data_dir / "notifications.csv")
    graveyard_rows = _load_csv_file(data_dir / "graveyard_entries.csv")

    return (
        species_rows,
        bonsai_rows,
        measurement_rows,
        update_rows,
        photo_rows,
        notification_rows,
        graveyard_rows,
    )


def _collect_rows_v2(data_dir: Path) -> tuple[
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
]:
    species_path = data_dir / "species.csv"
    trees_dir = data_dir / "trees"
    index_path = trees_dir / "index.csv"

    if not species_path.exists() or not index_path.exists():
        missing = []
        if not species_path.exists():
            missing.append("data/species.csv")
        if not index_path.exists():
            missing.append("data/trees/index.csv")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Archive is missing required files: {', '.join(missing)}",
        )

    species_rows = _load_csv_file(species_path)
    index_rows = _load_csv_file(index_path)

    bonsai_rows: list[dict[str, str]] = []
    measurement_rows: list[dict[str, str]] = []
    update_rows: list[dict[str, str]] = []
    photo_rows: list[dict[str, str]] = []
    notification_rows: list[dict[str, str]] = []
    graveyard_rows: list[dict[str, str]] = []

    for row in index_rows:
        tree_id = _require_int(row.get("id"), "trees.index.id")
        tree_id_str = str(tree_id)
        folder = row.get("folder") or tree_id_str
        tree_dir = trees_dir / folder
        if not tree_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Archive is missing data for tree {tree_id_str}: data/trees/{folder}",
            )

        bonsai_rows.append(
            {
                "id": tree_id_str,
                "name": row.get("name") or "",
                "species_id": row.get("species_id") or "",
                "acquisition_date": row.get("acquisition_date") or "",
                "origin_date": row.get("origin_date") or "",
                "location": row.get("location") or "",
                "notes": row.get("notes") or "",
                "development_stage": row.get("development_stage") or "",
                "status": row.get("status") or "",
                "created_at": row.get("created_at") or "",
                "updated_at": row.get("updated_at") or "",
            }
        )

        def _augment(rows: list[dict[str, str]]) -> list[dict[str, str]]:
            return [{**item, "bonsai_id": item.get("bonsai_id", tree_id_str) or tree_id_str} for item in rows]

        measurement_rows.extend(
            _augment(_load_csv_file(tree_dir / "measurements.csv"))
        )
        update_rows.extend(
            [
                {**item, "bonsai_id": item.get("bonsai_id", tree_id_str) or tree_id_str}
                for item in _load_csv_file(tree_dir / "updates.csv")
            ]
        )
        photo_rows.extend(
            [
                {**item, "bonsai_id": item.get("bonsai_id", tree_id_str) or tree_id_str}
                for item in _load_csv_file(tree_dir / "photos.csv")
            ]
        )
        notification_rows.extend(
            [
                {**item, "bonsai_id": tree_id_str}
                for item in _load_csv_file(tree_dir / "notifications.csv")
            ]
        )
        graveyard_rows.extend(
            [
                {**item, "bonsai_id": tree_id_str}
                for item in _load_csv_file(tree_dir / "graveyard.csv")
            ]
        )

    general_notifications_path = data_dir / "general" / "notifications.csv"
    if general_notifications_path.exists():
        general_notifications = _load_csv_file(general_notifications_path)
        notification_rows.extend(
            [
                {**item, "bonsai_id": item.get("bonsai_id") or ""}
                for item in general_notifications
            ]
        )

    return (
        species_rows,
        bonsai_rows,
        measurement_rows,
        update_rows,
        photo_rows,
        notification_rows,
        graveyard_rows,
    )


def _copy_tree_photos(source_dir: Path, target_media_root: Path) -> None:
    if not source_dir.exists():
        return

    for file_path in source_dir.rglob("*"):
        if not file_path.is_file():
            continue

        relative = file_path.relative_to(source_dir)
        destination = target_media_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, destination)


def _import_rows(
    db: Session,
    species_rows: list[dict[str, str]],
    bonsai_rows: list[dict[str, str]],
    measurement_rows: list[dict[str, str]],
    update_rows: list[dict[str, str]],
    photo_rows: list[dict[str, str]],
    notification_rows: list[dict[str, str]],
    graveyard_rows: list[dict[str, str]],
) -> None:
    species_objects = []
    for row in species_rows:
        created_at = _parse_datetime(row.get("created_at"))
        updated_at = _parse_datetime(row.get("updated_at"))
        species_objects.append(
            models.Species(
                id=_require_int(row.get("id"), "species.id"),
                common_name=row.get("common_name") or "",
                scientific_name=row.get("scientific_name") or None,
                description=row.get("description") or None,
                care_instructions=row.get("care_instructions") or None,
                tree_count=_parse_int(row.get("tree_count")) or 0,
                created_at=created_at or datetime.utcnow(),
                updated_at=updated_at or datetime.utcnow(),
            )
        )

    bonsai_objects = []
    for row in bonsai_rows:
        bonsai_objects.append(
            models.Bonsai(
                id=_require_int(row.get("id"), "bonsai.id"),
                name=row.get("name") or "",
                species_id=_parse_int(row.get("species_id")),
                acquisition_date=_parse_date(row.get("acquisition_date")),
                origin_date=_parse_date(row.get("origin_date")),
                location=row.get("location") or None,
                notes=row.get("notes") or None,
                development_stage=row.get("development_stage") or None,
                status=row.get("status") or "active",
                created_at=_parse_datetime(row.get("created_at")) or datetime.utcnow(),
                updated_at=_parse_datetime(row.get("updated_at")) or datetime.utcnow(),
            )
        )

    measurement_objects = []
    for row in measurement_rows:
        measurement_objects.append(
            models.Measurement(
                id=_require_int(row.get("id"), "measurements.id"),
                bonsai_id=_require_int(row.get("bonsai_id"), "measurements.bonsai_id"),
                measured_at=_parse_datetime(row.get("measured_at")),
                height_cm=_parse_float(row.get("height_cm")),
                trunk_diameter_cm=_parse_float(row.get("trunk_diameter_cm")),
                canopy_width_cm=_parse_float(row.get("canopy_width_cm")),
                notes=row.get("notes") or None,
                created_at=_parse_datetime(row.get("created_at")) or datetime.utcnow(),
            )
        )

    update_objects = []
    for row in update_rows:
        update_objects.append(
            models.BonsaiUpdate(
                id=_require_int(row.get("id"), "updates.id"),
                bonsai_id=_require_int(row.get("bonsai_id"), "updates.bonsai_id"),
                title=row.get("title") or "",
                description=row.get("description") or None,
                performed_at=_parse_datetime(row.get("performed_at")),
                created_at=_parse_datetime(row.get("created_at")) or datetime.utcnow(),
                updated_at=_parse_datetime(row.get("updated_at")) or datetime.utcnow(),
            )
        )

    notification_objects = []
    for row in notification_rows:
        notification_objects.append(
            models.Notification(
                id=_require_int(row.get("id"), "notifications.id"),
                bonsai_id=_parse_int(row.get("bonsai_id")),
                title=row.get("title") or "",
                message=row.get("message") or "",
                category=row.get("category") or None,
                due_at=_parse_datetime(row.get("due_at")),
                read=_parse_bool(row.get("read")) or False,
                created_at=_parse_datetime(row.get("created_at")) or datetime.utcnow(),
            )
        )

    graveyard_objects = []
    for row in graveyard_rows:
        graveyard_objects.append(
            models.GraveyardEntry(
                id=_require_int(row.get("id"), "graveyard_entries.id"),
                bonsai_id=_require_int(row.get("bonsai_id"), "graveyard_entries.bonsai_id"),
                category=row.get("category") or "dead",
                note=row.get("note") or None,
                moved_at=_parse_datetime(row.get("moved_at")) or datetime.utcnow(),
            )
        )

    photo_objects = []
    for row in photo_rows:
        photo_objects.append(
            models.Photo(
                id=_require_int(row.get("id"), "photos.id"),
                bonsai_id=_require_int(row.get("bonsai_id"), "photos.bonsai_id"),
                update_id=_parse_int(row.get("update_id")),
                description=row.get("description") or None,
                taken_at=_parse_datetime(row.get("taken_at")),
                full_path=row.get("full_path") or "",
                thumbnail_path=row.get("thumbnail_path") or "",
                is_primary=_parse_bool(row.get("is_primary")) or False,
                created_at=_parse_datetime(row.get("created_at")) or datetime.utcnow(),
            )
        )

    try:
        db.query(models.Photo).delete(synchronize_session=False)
        db.query(models.Measurement).delete(synchronize_session=False)
        db.query(models.Notification).delete(synchronize_session=False)
        db.query(models.BonsaiUpdate).delete(synchronize_session=False)
        db.query(models.GraveyardEntry).delete(synchronize_session=False)
        db.query(models.Bonsai).delete(synchronize_session=False)
        db.query(models.Species).delete(synchronize_session=False)

        db.add_all(species_objects)
        db.add_all(bonsai_objects)
        db.add_all(measurement_objects)
        db.add_all(update_objects)
        db.add_all(notification_objects)
        db.add_all(graveyard_objects)
        db.add_all(photo_objects)
        db.commit()
    except Exception as exc:  # pragma: no cover - defensive
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to import data: {exc}",
        ) from exc


@router.get("/export")
def export_backup(db: Session = Depends(get_db)) -> StreamingResponse:
    """Export all bonsai data and media as a ZIP archive."""

    buffer = io.BytesIO()
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        metadata = {"exported_at": datetime.utcnow().isoformat() + "Z", "version": "2.1"}
        archive.writestr("metadata.json", json.dumps(metadata, indent=2))

        species = db.query(models.Species).order_by(models.Species.id).all()
        _write_csv(
            archive,
            "data/species.csv",
            [
                "id",
                "common_name",
                "scientific_name",
                "description",
                "care_instructions",
                "tree_count",
                "created_at",
                "updated_at",
            ],
            (
                {
                    "id": item.id,
                    "common_name": item.common_name,
                    "scientific_name": item.scientific_name or "",
                    "description": item.description or "",
                    "care_instructions": item.care_instructions or "",
                    "tree_count": item.tree_count,
                    "created_at": _iso_datetime(item.created_at),
                    "updated_at": _iso_datetime(item.updated_at),
                }
                for item in species
            ),
        )

        bonsai = (
            db.query(models.Bonsai)
            .options(
                selectinload(models.Bonsai.species),
                selectinload(models.Bonsai.measurements),
                selectinload(models.Bonsai.updates),
                selectinload(models.Bonsai.photos),
                selectinload(models.Bonsai.notifications),
                selectinload(models.Bonsai.graveyard_entry),
            )
            .order_by(models.Bonsai.id)
            .all()
        )

        tree_index_rows: list[dict[str, str]] = []
        media_root = settings.media_root
        for tree in bonsai:
            species = tree.species
            folder = f"{tree.id:04d}_{_slugify(tree.name)}"
            tree_index_rows.append(
                {
                    "id": tree.id,
                    "name": tree.name,
                    "species_id": tree.species_id or "",
                    "species_common_name": species.common_name if species else "",
                    "species_scientific_name": species.scientific_name or "" if species else "",
                    "acquisition_date": _iso_date(tree.acquisition_date),
                    "origin_date": _iso_date(tree.origin_date),
                    "location": tree.location or "",
                    "notes": tree.notes or "",
                    "development_stage": tree.development_stage or "",
                    "status": tree.status,
                    "created_at": _iso_datetime(tree.created_at),
                    "updated_at": _iso_datetime(tree.updated_at),
                    "folder": folder,
                }
            )

            tree_dir = f"data/trees/{folder}"
            _write_csv(
                archive,
                f"{tree_dir}/overview.csv",
                [
                    "id",
                    "name",
                    "species_id",
                    "species_common_name",
                    "species_scientific_name",
                    "status",
                    "acquisition_date",
                    "origin_date",
                    "location",
                    "notes",
                    "development_stage",
                    "created_at",
                    "updated_at",
                ],
                [
                    {
                        "id": tree.id,
                        "name": tree.name,
                        "species_id": tree.species_id or "",
                        "species_common_name": species.common_name if species else "",
                        "species_scientific_name": species.scientific_name or "" if species else "",
                        "status": tree.status,
                        "acquisition_date": _iso_date(tree.acquisition_date),
                        "origin_date": _iso_date(tree.origin_date),
                        "location": tree.location or "",
                        "notes": tree.notes or "",
                        "development_stage": tree.development_stage or "",
                        "created_at": _iso_datetime(tree.created_at),
                        "updated_at": _iso_datetime(tree.updated_at),
                    }
                ],
            )

            measurements = sorted(
                tree.measurements,
                key=lambda measurement: measurement.measured_at or datetime.min,
            )
            _write_csv(
                archive,
                f"{tree_dir}/measurements.csv",
                [
                    "id",
                    "measured_at",
                    "height_cm",
                    "trunk_diameter_cm",
                    "canopy_width_cm",
                    "notes",
                    "created_at",
                ],
                (
                    {
                        "id": measurement.id,
                        "measured_at": _iso_datetime(measurement.measured_at),
                        "height_cm": measurement.height_cm
                        if measurement.height_cm is not None
                        else "",
                        "trunk_diameter_cm": measurement.trunk_diameter_cm
                        if measurement.trunk_diameter_cm is not None
                        else "",
                        "canopy_width_cm": measurement.canopy_width_cm
                        if measurement.canopy_width_cm is not None
                        else "",
                        "notes": measurement.notes or "",
                        "created_at": _iso_datetime(measurement.created_at),
                    }
                    for measurement in measurements
                ),
            )

            updates = sorted(
                tree.updates,
                key=lambda update: update.performed_at or datetime.min,
            )
            _write_csv(
                archive,
                f"{tree_dir}/updates.csv",
                [
                    "id",
                    "title",
                    "description",
                    "performed_at",
                    "created_at",
                    "updated_at",
                ],
                (
                    {
                        "id": update.id,
                        "title": update.title,
                        "description": update.description or "",
                        "performed_at": _iso_datetime(update.performed_at),
                        "created_at": _iso_datetime(update.created_at),
                        "updated_at": _iso_datetime(update.updated_at),
                    }
                    for update in updates
                ),
            )

            update_titles = {update.id: update.title for update in updates}
            photos = sorted(
                tree.photos,
                key=lambda photo: photo.created_at or datetime.min,
            )
            _write_csv(
                archive,
                f"{tree_dir}/photos.csv",
                [
                    "id",
                    "description",
                    "taken_at",
                    "full_path",
                    "thumbnail_path",
                    "is_primary",
                    "update_id",
                    "update_title",
                    "created_at",
                ],
                (
                    {
                        "id": photo.id,
                        "description": photo.description or "",
                        "taken_at": _iso_datetime(photo.taken_at),
                        "full_path": photo.full_path,
                        "thumbnail_path": photo.thumbnail_path,
                        "is_primary": _bool_to_str(photo.is_primary),
                        "update_id": photo.update_id or "",
                        "update_title": update_titles.get(photo.update_id, ""),
                        "created_at": _iso_datetime(photo.created_at),
                    }
                    for photo in photos
                ),
            )

            tree_media_dir = Path(tree_dir) / "photos"
            for photo in photos:
                for path_value, prefix in (
                    (photo.full_path, "full"),
                    (photo.thumbnail_path, "thumbs"),
                ):
                    subpath = _normalize_photo_subpath(path_value, prefix)
                    if subpath is None:
                        continue

                    path_obj = Path(path_value)
                    if path_obj.is_absolute():
                        source_path = path_obj
                    else:
                        if not media_root.exists():
                            continue
                        source_path = media_root / path_obj

                    if not source_path.exists() or not source_path.is_file():
                        continue

                    destination = tree_media_dir / prefix / subpath
                    archive.write(source_path, destination.as_posix())

            notifications = sorted(
                tree.notifications,
                key=lambda notification: notification.due_at
                or notification.created_at
                or datetime.min,
            )
            _write_csv(
                archive,
                f"{tree_dir}/notifications.csv",
                [
                    "id",
                    "title",
                    "message",
                    "category",
                    "due_at",
                    "read",
                    "created_at",
                ],
                (
                    {
                        "id": notification.id,
                        "title": notification.title,
                        "message": notification.message,
                        "category": notification.category or "",
                        "due_at": _iso_datetime(notification.due_at),
                        "read": _bool_to_str(notification.read),
                        "created_at": _iso_datetime(notification.created_at),
                    }
                    for notification in notifications
                ),
            )

            graveyard_entry = tree.graveyard_entry
            if graveyard_entry:
                _write_csv(
                    archive,
                    f"{tree_dir}/graveyard.csv",
                    ["id", "category", "note", "moved_at"],
                    [
                        {
                            "id": graveyard_entry.id,
                            "category": graveyard_entry.category,
                            "note": graveyard_entry.note or "",
                            "moved_at": _iso_datetime(graveyard_entry.moved_at),
                        }
                    ],
                )
            else:
                _write_csv(
                    archive,
                    f"{tree_dir}/graveyard.csv",
                    ["id", "category", "note", "moved_at"],
                    [],
                )

        _write_csv(
            archive,
            "data/trees/index.csv",
            [
                "id",
                "name",
                "species_id",
                "species_common_name",
                "species_scientific_name",
                "acquisition_date",
                "origin_date",
                "location",
                "notes",
                "development_stage",
                "status",
                "created_at",
                "updated_at",
                "folder",
            ],
            tree_index_rows,
        )

        general_notifications = (
            db.query(models.Notification)
            .filter(models.Notification.bonsai_id.is_(None))
            .order_by(models.Notification.id)
            .all()
        )
        _write_csv(
            archive,
            "data/general/notifications.csv",
            ["id", "title", "message", "category", "due_at", "read", "created_at"],
            (
                {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "category": notification.category or "",
                    "due_at": _iso_datetime(notification.due_at),
                    "read": _bool_to_str(notification.read),
                    "created_at": _iso_datetime(notification.created_at),
                }
                for notification in general_notifications
            ),
        )

    buffer.seek(0)
    filename = f"bonsai_backup_{timestamp}.zip"
    headers = {"Content-Disposition": f"attachment; filename=\"{filename}\""}
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)


def _safe_extract(zip_file: zipfile.ZipFile, destination: Path) -> None:
    for member in zip_file.infolist():
        member_path = Path(member.filename)
        if member_path.is_absolute() or ".." in member_path.parts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Archive contains unsafe paths",
            )
    zip_file.extractall(destination)


def _restore_media(tmp_dir: Path, metadata_version: str) -> None:
    target_media_root = settings.media_root
    if target_media_root.exists():
        shutil.rmtree(target_media_root)

    if _is_version_at_least(metadata_version, 2, 1):
        target_media_root.mkdir(parents=True, exist_ok=True)

        trees_root = tmp_dir / "data" / "trees"
        if trees_root.exists():
            for tree_dir in trees_root.iterdir():
                if not tree_dir.is_dir():
                    continue
                photos_dir = tree_dir / "photos"
                _copy_tree_photos(photos_dir, target_media_root)

        (target_media_root / "full").mkdir(parents=True, exist_ok=True)
        (target_media_root / "thumbs").mkdir(parents=True, exist_ok=True)
    else:
        media_dir = tmp_dir / "media"
        if media_dir.exists():
            shutil.copytree(media_dir, target_media_root)
        else:
            target_media_root.mkdir(parents=True, exist_ok=True)
            (target_media_root / "full").mkdir(parents=True, exist_ok=True)
            (target_media_root / "thumbs").mkdir(parents=True, exist_ok=True)


def _parse_int(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


def _require_int(value: str | None, field: str) -> int:
    parsed = _parse_int(value)
    if parsed is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required value for {field}",
        )
    return parsed


def _parse_float(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    return float(value)


def _parse_bool(value: str | None) -> bool | None:
    if value is None or value == "":
        return None
    return value.lower() in {"1", "true", "yes", "y", "on"}


def _parse_date(value: str | None) -> date | None:
    if value is None or value == "":
        return None
    return date.fromisoformat(value)


def _parse_datetime(value: str | None) -> datetime | None:
    if value is None or value == "":
        return None
    return datetime.fromisoformat(value)


@router.post("/import", status_code=status.HTTP_200_OK)
async def import_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import bonsai data and media from a ZIP archive."""

    content = await file.read()
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            namelist = set(archive.namelist())
            metadata_version = "1.0"
            if "metadata.json" in namelist:
                try:
                    metadata = json.loads(archive.read("metadata.json"))
                    if isinstance(metadata, dict):
                        metadata_version = str(metadata.get("version", "1.0"))
                except (json.JSONDecodeError, KeyError):  # pragma: no cover - defensive
                    metadata_version = "1.0"

            if metadata_version.startswith("2."):
                required_files = {"data/species.csv", "data/trees/index.csv"}
            else:
                required_files = {
                    "data/species.csv",
                    "data/bonsai.csv",
                    "data/measurements.csv",
                    "data/updates.csv",
                    "data/photos.csv",
                    "data/notifications.csv",
                    "data/graveyard_entries.csv",
                }

            missing = sorted(required_files - namelist)
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Archive is missing required files: {', '.join(missing)}",
                )

            with tempfile.TemporaryDirectory() as tmp_dir_name:
                tmp_dir = Path(tmp_dir_name)
                _safe_extract(archive, tmp_dir)

                data_dir = tmp_dir / "data"
                if not data_dir.exists():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Archive is missing required data directory",
                    )

                if metadata_version.startswith("2."):
                    (
                        species_rows,
                        bonsai_rows,
                        measurement_rows,
                        update_rows,
                        photo_rows,
                        notification_rows,
                        graveyard_rows,
                    ) = _collect_rows_v2(data_dir)
                else:
                    (
                        species_rows,
                        bonsai_rows,
                        measurement_rows,
                        update_rows,
                        photo_rows,
                        notification_rows,
                        graveyard_rows,
                    ) = _collect_rows_v1(data_dir)

                _import_rows(
                    db,
                    species_rows,
                    bonsai_rows,
                    measurement_rows,
                    update_rows,
                    photo_rows,
                    notification_rows,
                    graveyard_rows,
                )

                _restore_media(tmp_dir, metadata_version)
    except zipfile.BadZipFile as exc:  # pragma: no cover - defensive programming
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ZIP archive") from exc

    return {"detail": "Import completed successfully."}
