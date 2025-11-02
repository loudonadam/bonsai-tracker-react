from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from PIL import Image
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db
from ..utils.images import save_image_bytes

router = APIRouter(prefix=f"{settings.api_prefix}/bonsai", tags=["photos"])


def _resolve_media_path(stored_path: Optional[str]) -> Optional[Path]:
    if not stored_path:
        return None

    try:
        candidate = Path(stored_path)
    except TypeError as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid stored media path",
        ) from exc

    if not candidate.is_absolute():
        candidate = settings.media_root / candidate

    return candidate


def _rotate_photo_files(photo: models.Photo, degrees: int) -> None:
    normalized = degrees % 360
    if normalized == 0:
        return

    if normalized not in {0, 90, 180, 270}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rotation must be 0, 90, 180, or 270 degrees.",
        )

    full_path = _resolve_media_path(photo.full_path)
    if not full_path or not full_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored photo file could not be found.",
        )

    thumbnail_path = _resolve_media_path(photo.thumbnail_path)

    suffix = full_path.suffix.lower()

    try:
        with Image.open(full_path) as image:
            rotated = image.rotate(-normalized, expand=True)
            if suffix in {".jpg", ".jpeg"} and rotated.mode != "RGB":
                rotated = rotated.convert("RGB")
            rotated.save(full_path)

            if thumbnail_path:
                thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
                preview = rotated.copy()
                if suffix in {".jpg", ".jpeg"} and preview.mode != "RGB":
                    preview = preview.convert("RGB")
                preview.thumbnail((settings.thumbnail_size, settings.thumbnail_size))
                preview.save(thumbnail_path)
    except OSError as exc:  # pragma: no cover - best effort error propagation
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to rotate stored photo.",
        ) from exc


@router.post("/{bonsai_id}/photos", response_model=schemas.PhotoOut, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    bonsai_id: int,
    file: UploadFile = File(...),
    description: str | None = Form(default=None),
    taken_at: str | None = Form(default=None),
    is_primary: bool = Form(default=False),
    update_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    contents = await file.read()
    full_path, thumb_path = save_image_bytes(contents, file.filename, file.content_type)

    taken_at_dt = None
    if taken_at:
        try:
            taken_at_dt = datetime.fromisoformat(taken_at)
        except ValueError as exc:  # pragma: no cover - validated by FastAPI
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid taken_at format") from exc

    photo = models.Photo(
        bonsai_id=bonsai_id,
        update_id=update_id,
        description=description,
        taken_at=taken_at_dt,
        full_path=full_path,
        thumbnail_path=thumb_path,
        is_primary=is_primary,
    )
    if is_primary:
        for existing in bonsai.photos:
            existing.is_primary = False

    db.add(photo)
    db.commit()
    db.refresh(photo)
    return schemas.PhotoOut.from_model(photo)


@router.get("/{bonsai_id}/photos", response_model=list[schemas.PhotoOut])
def list_photos(bonsai_id: int, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    return [schemas.PhotoOut.from_model(photo) for photo in bonsai.photos]


@router.post("/{bonsai_id}/photos/{photo_id}/primary", response_model=schemas.PhotoOut)
def set_primary_photo(bonsai_id: int, photo_id: int, db: Session = Depends(get_db)):
    photo = db.get(models.Photo, photo_id)
    if not photo or photo.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    for existing in photo.bonsai.photos:
        existing.is_primary = existing.id == photo_id
        db.add(existing)

    db.commit()
    db.refresh(photo)
    return schemas.PhotoOut.from_model(photo)


@router.delete("/{bonsai_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(bonsai_id: int, photo_id: int, db: Session = Depends(get_db)):
    photo = db.get(models.Photo, photo_id)
    if not photo or photo.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    media_paths: list[Path] = []
    for stored_path in (photo.full_path, photo.thumbnail_path):
        if not stored_path:
            continue

        try:
            candidate = Path(stored_path)
        except TypeError:  # pragma: no cover - defensive
            continue

        if not candidate.is_absolute():
            candidate = settings.media_root / candidate

        media_paths.append(candidate)

    db.delete(photo)
    db.commit()

    for path in media_paths:
        try:
            if path.exists() and path.is_file():
                path.unlink()
        except OSError:  # pragma: no cover - best effort cleanup
            continue


@router.patch("/{bonsai_id}/photos/{photo_id}", response_model=schemas.PhotoOut)
def update_photo(
    bonsai_id: int,
    photo_id: int,
    payload: schemas.PhotoUpdate,
    db: Session = Depends(get_db),
):
    photo = db.get(models.Photo, photo_id)
    if not photo or photo.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    data = payload.model_dump(exclude_unset=True)

    rotation = data.pop("rotate_degrees", None)

    if rotation:
        _rotate_photo_files(photo, rotation)

    if data.get("is_primary"):
        for existing in photo.bonsai.photos:
            existing.is_primary = existing.id == photo_id
            db.add(existing)

    for key, value in data.items():
        setattr(photo, key, value)

    db.add(photo)
    db.commit()
    db.refresh(photo)
    return schemas.PhotoOut.from_model(photo)
