from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix=f"{settings.api_prefix}/bonsai", tags=["bonsai"])


def _load_bonsai(db: Session, bonsai_id: int) -> models.Bonsai:
    bonsai = (
        db.query(models.Bonsai)
        .options(
            selectinload(models.Bonsai.species),
            selectinload(models.Bonsai.photos),
            selectinload(models.Bonsai.measurements),
            selectinload(models.Bonsai.updates),
            selectinload(models.Bonsai.notifications),
            selectinload(models.Bonsai.graveyard_entry),
        )
        .filter(models.Bonsai.id == bonsai_id)
        .first()
    )
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")
    return bonsai


@router.get("/", response_model=list[schemas.BonsaiDetail])
def list_bonsai(db: Session = Depends(get_db)):
    bonsai_list = (
        db.query(models.Bonsai)
        .options(
            selectinload(models.Bonsai.species),
            selectinload(models.Bonsai.photos),
            selectinload(models.Bonsai.measurements),
            selectinload(models.Bonsai.updates),
            selectinload(models.Bonsai.notifications),
            selectinload(models.Bonsai.graveyard_entry),
        )
        .order_by(models.Bonsai.created_at.desc())
        .all()
    )
    return [schemas.BonsaiDetail.from_model(bonsai) for bonsai in bonsai_list]


@router.post("/", response_model=schemas.BonsaiDetail, status_code=status.HTTP_201_CREATED)
def create_bonsai(payload: schemas.BonsaiCreate, db: Session = Depends(get_db)):
    bonsai = models.Bonsai(**payload.model_dump())
    db.add(bonsai)

    if bonsai.species_id:
        species = db.get(models.Species, bonsai.species_id)
        if not species:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Species not found")
        species.tree_count = (species.tree_count or 0) + 1

    db.commit()
    db.refresh(bonsai)
    return schemas.BonsaiDetail.from_model(_load_bonsai(db, bonsai.id))


@router.get("/graveyard", response_model=list[schemas.GraveyardEntryOut])
def list_graveyard_entries(db: Session = Depends(get_db)):
    entries = db.query(models.GraveyardEntry).options(selectinload(models.GraveyardEntry.bonsai)).all()
    return [schemas.GraveyardEntryOut.model_validate(entry) for entry in entries]


@router.get("/{bonsai_id}", response_model=schemas.BonsaiDetail)
def get_bonsai(bonsai_id: int, db: Session = Depends(get_db)):
    bonsai = _load_bonsai(db, bonsai_id)
    return schemas.BonsaiDetail.from_model(bonsai)


@router.patch("/{bonsai_id}", response_model=schemas.BonsaiDetail)
def update_bonsai(bonsai_id: int, payload: schemas.BonsaiUpdate, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(bonsai, key, value)

    db.add(bonsai)
    db.commit()
    db.refresh(bonsai)
    return schemas.BonsaiDetail.from_model(_load_bonsai(db, bonsai.id))


@router.post("/{bonsai_id}/graveyard", response_model=schemas.GraveyardEntryOut, status_code=status.HTTP_201_CREATED)
def move_bonsai_to_graveyard(
    bonsai_id: int,
    payload: schemas.GraveyardEntryCreate,
    db: Session = Depends(get_db),
):
    bonsai = _load_bonsai(db, bonsai_id)
    if bonsai.graveyard_entry:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tree is already in the graveyard")

    entry = models.GraveyardEntry(
        bonsai_id=bonsai.id,
        category=payload.category,
        note=payload.note,
    )
    bonsai.status = "graveyard"

    db.add(entry)
    db.add(bonsai)
    db.commit()
    db.refresh(entry)
    return schemas.GraveyardEntryOut.model_validate(entry)


@router.post("/{bonsai_id}/restore", response_model=schemas.BonsaiDetail)
def restore_bonsai_from_graveyard(bonsai_id: int, db: Session = Depends(get_db)):
    bonsai = _load_bonsai(db, bonsai_id)
    entry = bonsai.graveyard_entry
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tree is not in the graveyard")

    bonsai.status = "active"
    db.delete(entry)
    db.add(bonsai)
    db.commit()
    db.refresh(bonsai)
    return schemas.BonsaiDetail.from_model(_load_bonsai(db, bonsai.id))


@router.delete("/{bonsai_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bonsai(bonsai_id: int, db: Session = Depends(get_db)):
    bonsai = db.get(models.Bonsai, bonsai_id)
    if not bonsai:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    if bonsai.species_id:
        species = db.get(models.Species, bonsai.species_id)
        if species and species.tree_count:
            species.tree_count = max(0, species.tree_count - 1)
            db.add(species)

    db.delete(bonsai)
    db.commit()
