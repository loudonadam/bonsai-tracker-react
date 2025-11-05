from __future__ import annotations

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

    measurement = models.Measurement(bonsai_id=bonsai_id, **payload.model_dump(exclude_unset=True))
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
