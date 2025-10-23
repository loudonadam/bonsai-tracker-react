from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix=f"{settings.api_prefix}/bonsai", tags=["updates"])


@router.post("/{bonsai_id}/updates", response_model=schemas.BonsaiUpdateOut, status_code=status.HTTP_201_CREATED)
def create_update(bonsai_id: int, payload: schemas.BonsaiUpdateCreate, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    update = models.BonsaiUpdate(bonsai_id=bonsai_id, **payload.model_dump(exclude_unset=True))
    db.add(update)
    db.commit()
    db.refresh(update)
    return update


@router.get("/{bonsai_id}/updates", response_model=list[schemas.BonsaiUpdateOut])
def list_updates(bonsai_id: int, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    return (
        db.query(models.BonsaiUpdate)
        .filter(models.BonsaiUpdate.bonsai_id == bonsai_id)
        .order_by(models.BonsaiUpdate.performed_at.desc())
        .all()
    )


@router.patch(
    "/{bonsai_id}/updates/{update_id}", response_model=schemas.BonsaiUpdateOut
)
def update_update(
    bonsai_id: int,
    update_id: int,
    payload: schemas.BonsaiUpdatePatch,
    db: Session = Depends(get_db),
):
    update = db.get(models.BonsaiUpdate, update_id)
    if not update or update.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(update, key, value)

    db.add(update)
    db.commit()
    db.refresh(update)
    return update


@router.delete("/{bonsai_id}/updates/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_update(bonsai_id: int, update_id: int, db: Session = Depends(get_db)):
    update = db.get(models.BonsaiUpdate, update_id)
    if not update or update.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found")

    db.delete(update)
    db.commit()
