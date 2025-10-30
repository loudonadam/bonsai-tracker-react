from __future__ import annotations

import csv
import io
import json
import shutil
import tempfile
import zipfile
from datetime import date, datetime
from pathlib import Path
from typing import Iterable, Sequence

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

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


def _write_csv(zip_file: zipfile.ZipFile, filename: str, fieldnames: Sequence[str], rows: Iterable[dict]) -> None:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    zip_file.writestr(filename, buffer.getvalue())


@router.get("/export")
def export_backup(db: Session = Depends(get_db)) -> StreamingResponse:
    """Export all bonsai data and media as a ZIP archive."""

    buffer = io.BytesIO()
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        metadata = {"exported_at": datetime.utcnow().isoformat() + "Z", "version": "1.0"}
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

        bonsai = db.query(models.Bonsai).order_by(models.Bonsai.id).all()
        _write_csv(
            archive,
            "data/bonsai.csv",
            [
                "id",
                "name",
                "species_id",
                "acquisition_date",
                "origin_date",
                "location",
                "notes",
                "development_stage",
                "status",
                "created_at",
                "updated_at",
            ],
            (
                {
                    "id": item.id,
                    "name": item.name,
                    "species_id": item.species_id or "",
                    "acquisition_date": _iso_date(item.acquisition_date),
                    "origin_date": _iso_date(item.origin_date),
                    "location": item.location or "",
                    "notes": item.notes or "",
                    "development_stage": item.development_stage or "",
                    "status": item.status,
                    "created_at": _iso_datetime(item.created_at),
                    "updated_at": _iso_datetime(item.updated_at),
                }
                for item in bonsai
            ),
        )

        measurements = db.query(models.Measurement).order_by(models.Measurement.id).all()
        _write_csv(
            archive,
            "data/measurements.csv",
            [
                "id",
                "bonsai_id",
                "measured_at",
                "height_cm",
                "trunk_diameter_cm",
                "canopy_width_cm",
                "notes",
                "created_at",
            ],
            (
                {
                    "id": item.id,
                    "bonsai_id": item.bonsai_id,
                    "measured_at": _iso_datetime(item.measured_at),
                    "height_cm": item.height_cm if item.height_cm is not None else "",
                    "trunk_diameter_cm": item.trunk_diameter_cm if item.trunk_diameter_cm is not None else "",
                    "canopy_width_cm": item.canopy_width_cm if item.canopy_width_cm is not None else "",
                    "notes": item.notes or "",
                    "created_at": _iso_datetime(item.created_at),
                }
                for item in measurements
            ),
        )

        updates = db.query(models.BonsaiUpdate).order_by(models.BonsaiUpdate.id).all()
        _write_csv(
            archive,
            "data/updates.csv",
            [
                "id",
                "bonsai_id",
                "title",
                "description",
                "performed_at",
                "created_at",
                "updated_at",
            ],
            (
                {
                    "id": item.id,
                    "bonsai_id": item.bonsai_id,
                    "title": item.title,
                    "description": item.description or "",
                    "performed_at": _iso_datetime(item.performed_at),
                    "created_at": _iso_datetime(item.created_at),
                    "updated_at": _iso_datetime(item.updated_at),
                }
                for item in updates
            ),
        )

        notifications = db.query(models.Notification).order_by(models.Notification.id).all()
        _write_csv(
            archive,
            "data/notifications.csv",
            [
                "id",
                "bonsai_id",
                "title",
                "message",
                "category",
                "due_at",
                "read",
                "created_at",
            ],
            (
                {
                    "id": item.id,
                    "bonsai_id": item.bonsai_id or "",
                    "title": item.title,
                    "message": item.message,
                    "category": item.category or "",
                    "due_at": _iso_datetime(item.due_at),
                    "read": _bool_to_str(item.read),
                    "created_at": _iso_datetime(item.created_at),
                }
                for item in notifications
            ),
        )

        graveyard_entries = db.query(models.GraveyardEntry).order_by(models.GraveyardEntry.id).all()
        _write_csv(
            archive,
            "data/graveyard_entries.csv",
            ["id", "bonsai_id", "category", "note", "moved_at"],
            (
                {
                    "id": item.id,
                    "bonsai_id": item.bonsai_id,
                    "category": item.category,
                    "note": item.note or "",
                    "moved_at": _iso_datetime(item.moved_at),
                }
                for item in graveyard_entries
            ),
        )

        photos = db.query(models.Photo).order_by(models.Photo.id).all()
        _write_csv(
            archive,
            "data/photos.csv",
            [
                "id",
                "bonsai_id",
                "update_id",
                "description",
                "taken_at",
                "full_path",
                "thumbnail_path",
                "is_primary",
                "created_at",
            ],
            (
                {
                    "id": item.id,
                    "bonsai_id": item.bonsai_id,
                    "update_id": item.update_id or "",
                    "description": item.description or "",
                    "taken_at": _iso_datetime(item.taken_at),
                    "full_path": item.full_path,
                    "thumbnail_path": item.thumbnail_path,
                    "is_primary": _bool_to_str(item.is_primary),
                    "created_at": _iso_datetime(item.created_at),
                }
                for item in photos
            ),
        )

        media_root = settings.media_root
        if media_root.exists():
            for file_path in media_root.rglob("*"):
                if file_path.is_file():
                    relative = file_path.relative_to(media_root)
                    archive.write(file_path, Path("media") / relative)

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
    required_files = {
        "data/species.csv",
        "data/bonsai.csv",
        "data/measurements.csv",
        "data/updates.csv",
        "data/photos.csv",
        "data/notifications.csv",
        "data/graveyard_entries.csv",
    }

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            namelist = set(archive.namelist())
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

                def load_csv(path: Path) -> list[dict[str, str]]:
                    with path.open("r", encoding="utf-8", newline="") as data_file:
                        reader = csv.DictReader(data_file)
                        return [row for row in reader]

                species_rows = load_csv(data_dir / "species.csv")
                bonsai_rows = load_csv(data_dir / "bonsai.csv")
                measurement_rows = load_csv(data_dir / "measurements.csv")
                update_rows = load_csv(data_dir / "updates.csv")
                photo_rows = load_csv(data_dir / "photos.csv")
                notification_rows = load_csv(data_dir / "notifications.csv")
                graveyard_rows = load_csv(data_dir / "graveyard_entries.csv")

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

                media_dir = tmp_dir / "media"

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

                target_media_root = settings.media_root
                if target_media_root.exists():
                    shutil.rmtree(target_media_root)
                if media_dir.exists():
                    shutil.copytree(media_dir, target_media_root)
                else:
                    target_media_root.mkdir(parents=True, exist_ok=True)
                    (target_media_root / "full").mkdir(parents=True, exist_ok=True)
                    (target_media_root / "thumbs").mkdir(parents=True, exist_ok=True)
    except zipfile.BadZipFile as exc:  # pragma: no cover - defensive programming
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ZIP archive") from exc

    return {"detail": "Import completed successfully."}
