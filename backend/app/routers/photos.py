from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db
from ..utils.images import save_image_bytes

router = APIRouter(prefix=f"{settings.api_prefix}/bonsai", tags=["photos"])


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

    db.delete(photo)
    db.commit()
