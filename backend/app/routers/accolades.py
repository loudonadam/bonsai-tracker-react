from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix=f"{settings.api_prefix}/bonsai", tags=["accolades"])


def _load_accolade(db: Session, bonsai_id: int, accolade_id: int) -> models.Accolade:
    accolade = (
        db.query(models.Accolade)
        .options(selectinload(models.Accolade.photo))
        .filter(models.Accolade.id == accolade_id, models.Accolade.bonsai_id == bonsai_id)
        .first()
    )
    if not accolade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Accolade not found")
    return accolade


@router.get("/{bonsai_id}/accolades", response_model=list[schemas.AccoladeOut])
def list_accolades(bonsai_id: int, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    accolades = (
        db.query(models.Accolade)
        .options(selectinload(models.Accolade.photo))
        .filter(models.Accolade.bonsai_id == bonsai_id)
        .order_by(models.Accolade.created_at.desc())
        .all()
    )
    return [schemas.AccoladeOut.from_model(accolade) for accolade in accolades]


@router.post(
    "/{bonsai_id}/accolades",
    response_model=schemas.AccoladeOut,
    status_code=status.HTTP_201_CREATED,
)
def create_accolade(
    bonsai_id: int,
    payload: schemas.AccoladeCreate,
    db: Session = Depends(get_db),
):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    if payload.photo_id:
        photo = db.get(models.Photo, payload.photo_id)
        if not photo or photo.bonsai_id != bonsai_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    accolade = models.Accolade(
        bonsai_id=bonsai_id,
        title=payload.title,
        photo_id=payload.photo_id,
    )
    db.add(accolade)
    db.commit()
    db.refresh(accolade)
    return schemas.AccoladeOut.from_model(accolade)


@router.patch(
    "/{bonsai_id}/accolades/{accolade_id}",
    response_model=schemas.AccoladeOut,
)
def update_accolade(
    bonsai_id: int,
    accolade_id: int,
    payload: schemas.AccoladeUpdate,
    db: Session = Depends(get_db),
):
    accolade = _load_accolade(db, bonsai_id, accolade_id)

    data = payload.model_dump(exclude_unset=True)

    if "photo_id" in data:
        photo_id = data["photo_id"]
        if photo_id is None:
            accolade.photo_id = None
        else:
            photo = db.get(models.Photo, photo_id)
            if not photo or photo.bonsai_id != bonsai_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
            accolade.photo_id = photo_id

    if "title" in data and data["title"] is not None:
        accolade.title = data["title"]

    db.add(accolade)
    db.commit()
    db.refresh(accolade)
    return schemas.AccoladeOut.from_model(accolade)


@router.delete("/{bonsai_id}/accolades/{accolade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_accolade(bonsai_id: int, accolade_id: int, db: Session = Depends(get_db)):
    accolade = _load_accolade(db, bonsai_id, accolade_id)
    db.delete(accolade)
    db.commit()
