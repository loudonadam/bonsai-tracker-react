from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix=f"{settings.api_prefix}/bonsai", tags=["updates"])


def _has_measurement_values(payload: schemas.MeasurementPayload | None) -> bool:
    if payload is None:
        return False
    return any(
        value is not None
        for value in (
            payload.height_cm,
            payload.trunk_diameter_cm,
            payload.canopy_width_cm,
            payload.notes,
        )
    )


def _sync_update_measurement(
    db: Session, update: models.BonsaiUpdate, payload: schemas.MeasurementPayload | None
) -> None:
    if payload is None:
        return

    existing = update.measurement
    has_values = _has_measurement_values(payload)

    if not has_values:
        if existing:
            db.delete(existing)
        return

    measured_at = payload.measured_at or update.performed_at or datetime.utcnow()

    if existing:
        existing.measured_at = measured_at
        existing.height_cm = payload.height_cm
        existing.trunk_diameter_cm = payload.trunk_diameter_cm
        existing.canopy_width_cm = payload.canopy_width_cm
        existing.notes = payload.notes
        db.add(existing)
        return

    measurement = models.Measurement(
        bonsai_id=update.bonsai_id,
        update_id=update.id,
        measured_at=measured_at,
        height_cm=payload.height_cm,
        trunk_diameter_cm=payload.trunk_diameter_cm,
        canopy_width_cm=payload.canopy_width_cm,
        notes=payload.notes,
    )
    db.add(measurement)


@router.post(
    "/{bonsai_id}/updates", response_model=schemas.BonsaiUpdateOut, status_code=status.HTTP_201_CREATED
)
def create_update(bonsai_id: int, payload: schemas.BonsaiUpdateCreate, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    update = models.BonsaiUpdate(
        bonsai_id=bonsai_id,
        title=payload.title,
        description=payload.description,
        performed_at=payload.performed_at,
    )
    db.add(update)
    db.flush()

    _sync_update_measurement(db, update, payload.measurement)

    db.commit()
    db.refresh(update)
    if update.measurement:
        db.refresh(update.measurement)
    return update


@router.get("/{bonsai_id}/updates", response_model=list[schemas.BonsaiUpdateOut])
def list_updates(bonsai_id: int, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    return (
        db.query(models.BonsaiUpdate)
        .options(selectinload(models.BonsaiUpdate.measurement))
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
    update = (
        db.query(models.BonsaiUpdate)
        .options(selectinload(models.BonsaiUpdate.measurement))
        .filter(models.BonsaiUpdate.id == update_id)
        .first()
    )
    if not update or update.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found")

    data = payload.model_dump(exclude_unset=True)
    measurement_payload = data.pop("measurement", None) or payload.measurement

    for key, value in data.items():
        setattr(update, key, value)

    _sync_update_measurement(db, update, measurement_payload)
    db.add(update)
    db.commit()
    db.refresh(update)
    if update.measurement:
        db.refresh(update.measurement)
    return update


@router.delete("/{bonsai_id}/updates/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_update(bonsai_id: int, update_id: int, db: Session = Depends(get_db)):
    update = (
        db.query(models.BonsaiUpdate)
        .options(selectinload(models.BonsaiUpdate.measurement))
        .filter(models.BonsaiUpdate.id == update_id)
        .first()
    )
    if not update or update.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found")

    if update.measurement:
        db.delete(update.measurement)
    db.delete(update)
    db.commit()
