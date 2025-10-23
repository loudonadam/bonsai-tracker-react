from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix=f"{settings.api_prefix}/species", tags=["species"])


@router.get("/", response_model=list[schemas.SpeciesOut])
def list_species(db: Session = Depends(get_db)):
    return db.query(models.Species).order_by(models.Species.common_name).all()


@router.post("/", response_model=schemas.SpeciesOut, status_code=status.HTTP_201_CREATED)
def create_species(payload: schemas.SpeciesCreate, db: Session = Depends(get_db)):
    species = models.Species(**payload.model_dump())
    db.add(species)
    db.commit()
    db.refresh(species)
    return species


@router.get("/{species_id}", response_model=schemas.SpeciesOut)
def get_species(species_id: int, db: Session = Depends(get_db)):
    species = db.get(models.Species, species_id)
    if not species:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Species not found")
    return species


@router.patch("/{species_id}", response_model=schemas.SpeciesOut)
def update_species(species_id: int, payload: schemas.SpeciesUpdate, db: Session = Depends(get_db)):
    species = db.get(models.Species, species_id)
    if not species:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Species not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(species, key, value)

    db.add(species)
    db.commit()
    db.refresh(species)
    return species


@router.delete("/{species_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_species(species_id: int, db: Session = Depends(get_db)):
    species = db.get(models.Species, species_id)
    if not species:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Species not found")

    if species.bonsai:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete species while bonsai are linked to it",
        )

    db.delete(species)
    db.commit()
