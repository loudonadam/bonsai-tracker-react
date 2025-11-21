from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix=f"{settings.api_prefix}/bonsai", tags=["measurements"])


@router.post("/{bonsai_id}/measurements", response_model=schemas.MeasurementOut, status_code=status.HTTP_201_CREATED)
def add_measurement(bonsai_id: int, payload: schemas.MeasurementCreate, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    update = db.get(models.BonsaiUpdate, payload.update_id)
    if not update or update.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Update not found for this bonsai")

    if not any(
        value is not None
        for value in (
            payload.trunk_diameter_cm,
            payload.notes,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one measurement value is required",
        )

    measurement = models.Measurement(
        bonsai_id=bonsai_id,
        update_id=update.id,
        measured_at=payload.measured_at or update.performed_at or datetime.utcnow(),
        trunk_diameter_cm=payload.trunk_diameter_cm,
        notes=payload.notes,
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("/{bonsai_id}/measurements", response_model=list[schemas.MeasurementOut])
def list_measurements(bonsai_id: int, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    return (
        db.query(models.Measurement)
        .filter(models.Measurement.bonsai_id == bonsai_id)
        .order_by(models.Measurement.measured_at.desc())
        .all()
    )


@router.delete(
    "/{bonsai_id}/measurements/{measurement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_measurement(
    bonsai_id: int,
    measurement_id: int,
    db: Session = Depends(get_db),
):
    measurement = db.get(models.Measurement, measurement_id)
    if not measurement or measurement.bonsai_id != bonsai_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Measurement not found")

    db.delete(measurement)
    db.commit()
