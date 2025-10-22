from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Optional
import secrets

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import config
from .database import Base, engine, get_db
from .image_utils import create_thumbnail
from .models import GraveyardEntry, Reminder, Species, Tree, TreePhoto, TreeUpdate
from .schemas import (
    GraveyardEntryCreate,
    GraveyardEntryOut,
    ReminderCreate,
    ReminderOut,
    ReminderUpdate,
    SpeciesCreate,
    SpeciesOut,
    SpeciesUpdate,
    TreeDetailOut,
    TreePhotoOut,
    TreeSummary,
    TreeUpdateCreate,
    TreeUpdateOut,
    TreeUpdatePayload,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Bonsai Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=config.MEDIA_DIR), name="media")


def _photo_to_response(photo: TreePhoto) -> TreePhotoOut:
    return TreePhotoOut(
        id=photo.id,
        description=photo.description,
        photo_date=photo.photo_date,
        original_url=f"/media/{photo.original_path}",
        thumbnail_url=f"/media/{photo.thumbnail_path}",
    )


def _update_to_response(update: TreeUpdate) -> TreeUpdateOut:
    return TreeUpdateOut(
        id=update.id,
        update_date=update.update_date,
        girth=update.girth,
        work_performed=update.work_performed,
    )


def _tree_to_summary(tree: Tree) -> TreeSummary:
    primary_photo: Optional[TreePhoto] = None
    if tree.photos:
        primary_photo = sorted(tree.photos, key=lambda p: p.created_at)[0]
    species_name = None
    if tree.species:
        species_name = tree.species.common_name
        if tree.species.scientific_name:
            species_name = f"{tree.species.common_name} ({tree.species.scientific_name})"
    return TreeSummary(
        id=tree.id,
        name=tree.name,
        species=species_name,
        species_id=tree.species_id,
        acquisition_date=tree.acquisition_date,
        origin_date=tree.origin_date,
        current_girth=tree.current_girth,
        trunk_width=tree.trunk_width,
        notes=tree.notes,
        development_stage=tree.development_stage,
        last_update=tree.last_update,
        photo_url=(
            f"/media/{primary_photo.thumbnail_path}"
            if primary_photo is not None
            else None
        ),
    )


def _tree_to_detail(tree: Tree) -> TreeDetailOut:
    return TreeDetailOut(
        **_tree_to_summary(tree).dict(),
        photos=[_photo_to_response(photo) for photo in sorted(tree.photos, key=lambda p: p.created_at, reverse=True)],
        updates=[
            _update_to_response(update)
            for update in sorted(tree.updates, key=lambda u: u.update_date, reverse=True)
        ],
    )


def _reminder_to_response(reminder: Reminder) -> ReminderOut:
    tree_name = reminder.tree.name if reminder.tree else None
    return ReminderOut(
        id=reminder.id,
        tree_id=reminder.tree_id,
        tree_name=tree_name,
        message=reminder.message,
        due_date=reminder.due_date,
        is_completed=reminder.is_completed,
        created_at=reminder.created_at,
        completed_at=reminder.completed_at,
    )


def _graveyard_to_response(entry: GraveyardEntry) -> GraveyardEntryOut:
    tree = entry.tree
    species_name = None
    if tree and tree.species:
        species_name = tree.species.common_name
        if tree.species.scientific_name:
            species_name = f"{tree.species.common_name} ({tree.species.scientific_name})"
    photo_url = None
    if tree and tree.photos:
        primary_photo = sorted(tree.photos, key=lambda p: p.created_at)[0]
        photo_url = f"/media/{primary_photo.thumbnail_path}"
    return GraveyardEntryOut(
        id=entry.id,
        category=entry.category,
        note=entry.note,
        moved_at=entry.moved_at,
        tree_id=entry.tree_id,
        tree_name=tree.name if tree else "Unknown tree",
        tree_species=species_name,
        photo_url=photo_url,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/species", response_model=list[SpeciesOut])
def list_species(db: Session = Depends(get_db)):
    records = db.query(Species).all()
    results: list[SpeciesOut] = []
    for record in records:
        count = db.query(Tree).filter(Tree.species_id == record.id, Tree.graveyard_entry == None).count()  # noqa: E711
        results.append(
            SpeciesOut(
                id=record.id,
                common_name=record.common_name,
                scientific_name=record.scientific_name,
                notes=record.notes,
                created_at=record.created_at,
                updated_at=record.updated_at,
                tree_count=count,
            )
        )
    return results


@app.post("/species", response_model=SpeciesOut, status_code=status.HTTP_201_CREATED)
def create_species(payload: SpeciesCreate, db: Session = Depends(get_db)):
    record = Species(
        common_name=payload.common_name.strip(),
        scientific_name=payload.scientific_name.strip() if payload.scientific_name else None,
        notes=payload.notes or "",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return SpeciesOut(
        id=record.id,
        common_name=record.common_name,
        scientific_name=record.scientific_name,
        notes=record.notes,
        created_at=record.created_at,
        updated_at=record.updated_at,
        tree_count=0,
    )


@app.put("/species/{species_id}", response_model=SpeciesOut)
def update_species(species_id: int, payload: SpeciesUpdate, db: Session = Depends(get_db)):
    record = db.query(Species).filter(Species.id == species_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Species not found")

    if payload.common_name is not None:
        record.common_name = payload.common_name.strip()
    if payload.scientific_name is not None:
        record.scientific_name = payload.scientific_name.strip() or None
    if payload.notes is not None:
        record.notes = payload.notes

    db.add(record)
    db.commit()
    db.refresh(record)

    count = db.query(Tree).filter(Tree.species_id == record.id, Tree.graveyard_entry == None).count()  # noqa: E711
    return SpeciesOut(
        id=record.id,
        common_name=record.common_name,
        scientific_name=record.scientific_name,
        notes=record.notes,
        created_at=record.created_at,
        updated_at=record.updated_at,
        tree_count=count,
    )


@app.get("/trees", response_model=list[TreeSummary])
def list_trees(db: Session = Depends(get_db)):
    trees = (
        db.query(Tree)
        .filter(Tree.graveyard_entry == None)  # noqa: E711
        .order_by(Tree.created_at.desc())
        .all()
    )
    return [_tree_to_summary(tree) for tree in trees]


async def _save_upload(file: UploadFile, tree_id: int) -> tuple[str, str]:
    suffix = Path(file.filename or "").suffix or ".jpg"
    unique_name = f"tree_{tree_id}_{secrets.token_hex(8)}{suffix}"
    original_path = config.ORIGINAL_PHOTOS_DIR / unique_name
    thumbnail_path = config.THUMBNAIL_PHOTOS_DIR / unique_name
    contents = await file.read()
    original_path.write_bytes(contents)
    create_thumbnail(original_path, thumbnail_path)
    return (
        str(original_path.relative_to(config.MEDIA_DIR)),
        str(thumbnail_path.relative_to(config.MEDIA_DIR)),
    )


@app.post("/trees", response_model=TreeDetailOut, status_code=status.HTTP_201_CREATED)
async def create_tree(
    name: str = Form(...),
    acquisition_date: date = Form(...),
    origin_date: Optional[date] = Form(None),
    current_girth: Optional[float] = Form(None),
    trunk_width: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    development_stage: Optional[str] = Form("pre-bonsai"),
    species_id: Optional[int] = Form(None),
    tree_number: Optional[str] = Form(None),
    initial_photo: UploadFile | None = File(None),
    initial_photo_description: Optional[str] = Form(None),
    initial_photo_date: Optional[date] = Form(None),
    db: Session = Depends(get_db),
):
    if species_id is not None:
        species = db.query(Species).filter(Species.id == species_id).first()
        if not species:
            raise HTTPException(status_code=400, detail="Invalid species reference")

    tree = Tree(
        name=name.strip(),
        tree_number=tree_number.strip() if tree_number else None,
        acquisition_date=acquisition_date,
        origin_date=origin_date,
        current_girth=current_girth,
        trunk_width=trunk_width,
        notes=notes or "",
        development_stage=(development_stage or "pre-bonsai").lower(),
        species_id=species_id,
        last_update=acquisition_date,
    )
    db.add(tree)
    db.commit()
    db.refresh(tree)

    if initial_photo:
        original_rel, thumb_rel = await _save_upload(initial_photo, tree.id)
        photo = TreePhoto(
            tree_id=tree.id,
            description=initial_photo_description or "",
            photo_date=initial_photo_date,
            file_name=initial_photo.filename or "uploaded-photo",
            original_path=original_rel,
            thumbnail_path=thumb_rel,
        )
        db.add(photo)
        db.commit()
        db.refresh(tree)

    db.refresh(tree)
    return _tree_to_detail(tree)


@app.get("/trees/{tree_id}", response_model=TreeDetailOut)
def get_tree(tree_id: int, db: Session = Depends(get_db)):
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    if tree.graveyard_entry is not None:
        raise HTTPException(status_code=404, detail="Tree has been moved to the/archive")
    return _tree_to_detail(tree)


@app.patch("/trees/{tree_id}", response_model=TreeDetailOut)
def update_tree(tree_id: int, payload: TreeUpdatePayload, db: Session = Depends(get_db)):
    tree = db.query(Tree).filter(Tree.id == tree_id, Tree.graveyard_entry == None).first()  # noqa: E711
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(tree, field, value)

    db.add(tree)
    db.commit()
    db.refresh(tree)
    return _tree_to_detail(tree)


@app.delete("/trees/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tree(tree_id: int, db: Session = Depends(get_db)):
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    db.delete(tree)
    db.commit()
    return None


@app.post("/trees/{tree_id}/photos", response_model=TreePhotoOut, status_code=status.HTTP_201_CREATED)
async def add_tree_photo(
    tree_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    photo_date: Optional[date] = Form(None),
    db: Session = Depends(get_db),
):
    tree = db.query(Tree).filter(Tree.id == tree_id, Tree.graveyard_entry == None).first()  # noqa: E711
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    original_rel, thumb_rel = await _save_upload(file, tree.id)
    photo = TreePhoto(
        tree_id=tree.id,
        description=description or "",
        photo_date=photo_date,
        file_name=file.filename or "uploaded-photo",
        original_path=original_rel,
        thumbnail_path=thumb_rel,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return _photo_to_response(photo)


@app.delete("/trees/{tree_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tree_photo(tree_id: int, photo_id: int, db: Session = Depends(get_db)):
    photo = (
        db.query(TreePhoto)
        .filter(TreePhoto.id == photo_id, TreePhoto.tree_id == tree_id)
        .first()
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    for relative_path in (photo.original_path, photo.thumbnail_path):
        absolute = config.MEDIA_DIR / relative_path
        if absolute.exists():
            absolute.unlink()

    db.delete(photo)
    db.commit()
    return None


@app.post("/trees/{tree_id}/updates", response_model=TreeUpdateOut, status_code=status.HTTP_201_CREATED)
def add_tree_update(tree_id: int, payload: TreeUpdateCreate, db: Session = Depends(get_db)):
    tree = db.query(Tree).filter(Tree.id == tree_id, Tree.graveyard_entry == None).first()  # noqa: E711
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    update = TreeUpdate(
        tree_id=tree.id,
        update_date=payload.update_date,
        girth=payload.girth,
        work_performed=payload.work_performed or "",
    )
    tree.last_update = payload.update_date
    if payload.girth is not None:
        tree.current_girth = payload.girth
    db.add(update)
    db.add(tree)
    db.commit()
    db.refresh(update)
    return _update_to_response(update)


@app.delete("/trees/{tree_id}/updates/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tree_update(tree_id: int, update_id: int, db: Session = Depends(get_db)):
    update = (
        db.query(TreeUpdate)
        .filter(TreeUpdate.id == update_id, TreeUpdate.tree_id == tree_id)
        .first()
    )
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")
    db.delete(update)
    db.commit()
    return None


@app.get("/reminders", response_model=list[ReminderOut])
def list_reminders(db: Session = Depends(get_db)):
    reminders = db.query(Reminder).order_by(Reminder.due_date.asc()).all()
    return [_reminder_to_response(reminder) for reminder in reminders]


@app.post("/reminders", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(payload: ReminderCreate, db: Session = Depends(get_db)):
    if payload.tree_id is not None:
        tree = db.query(Tree).filter(Tree.id == payload.tree_id).first()
        if not tree:
            raise HTTPException(status_code=400, detail="Invalid tree reference")
    reminder = Reminder(
        tree_id=payload.tree_id,
        message=payload.message,
        due_date=payload.due_date,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return _reminder_to_response(reminder)


@app.patch("/reminders/{reminder_id}", response_model=ReminderOut)
def update_reminder(reminder_id: int, payload: ReminderUpdate, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    data = payload.dict(exclude_unset=True)
    if "is_completed" in data:
        is_completed = data.pop("is_completed")
        reminder.is_completed = is_completed
        reminder.completed_at = datetime.utcnow() if is_completed else None
    for field, value in data.items():
        setattr(reminder, field, value)

    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return _reminder_to_response(reminder)


@app.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
    return None


@app.post("/trees/{tree_id}/graveyard", response_model=GraveyardEntryOut)
def move_tree_to_graveyard(tree_id: int, payload: GraveyardEntryCreate, db: Session = Depends(get_db)):
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    if tree.graveyard_entry is not None:
        raise HTTPException(status_code=400, detail="Tree already in graveyard")

    entry = GraveyardEntry(
        tree_id=tree.id,
        category=payload.category,
        note=payload.note or "",
        moved_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _graveyard_to_response(entry)


@app.get("/graveyard", response_model=list[GraveyardEntryOut])
def list_graveyard(db: Session = Depends(get_db)):
    entries = db.query(GraveyardEntry).order_by(GraveyardEntry.moved_at.desc()).all()
    return [_graveyard_to_response(entry) for entry in entries]


@app.delete("/graveyard/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_graveyard_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(GraveyardEntry).filter(GraveyardEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    tree = entry.tree
    db.delete(entry)
    if tree:
        db.delete(tree)
    db.commit()
    return None
