#!/usr/bin/env python
"""One-off helper for importing data from the legacy SQLite database."""
from __future__ import annotations

import argparse
import logging
import mimetypes
import sys
from collections import defaultdict
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple
from uuid import uuid4

from PIL import Image, ImageOps
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    func,
    select,
)
from sqlalchemy.orm import Session, declarative_base, joinedload, relationship, sessionmaker

# Ensure we can import the current backend package when this script is executed
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def _default_db_url() -> str:
    default_sqlite = REPO_ROOT / "backend" / "bonsai.db"
    return f"sqlite:///{default_sqlite}".replace("\\", "/")


TargetBase = declarative_base()


class Species(TargetBase):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True)
    common_name = Column(String(255), nullable=False)
    scientific_name = Column(String(255))
    description = Column(Text)
    care_instructions = Column(Text)
    tree_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    bonsai = relationship("Bonsai", back_populates="species")


class Bonsai(TargetBase):
    __tablename__ = "bonsai"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    species_id = Column(Integer, ForeignKey("species.id"))
    acquisition_date = Column(Date)
    origin_date = Column(Date)
    location = Column(String(255))
    notes = Column(Text)
    development_stage = Column(String(100))
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    species = relationship("Species", back_populates="bonsai")
    updates = relationship("BonsaiUpdate", back_populates="bonsai", cascade="all, delete-orphan")
    measurements = relationship(
        "Measurement",
        back_populates="bonsai",
        cascade="all, delete-orphan",
        order_by="Measurement.measured_at.desc()",
    )
    photos = relationship(
        "Photo",
        back_populates="bonsai",
        cascade="all, delete-orphan",
        order_by="Photo.created_at.desc()",
    )


class BonsaiUpdate(TargetBase):
    __tablename__ = "bonsai_updates"

    id = Column(Integer, primary_key=True)
    bonsai_id = Column(Integer, ForeignKey("bonsai.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    performed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    bonsai = relationship("Bonsai", back_populates="updates")


class Measurement(TargetBase):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True)
    bonsai_id = Column(Integer, ForeignKey("bonsai.id"), nullable=False)
    measured_at = Column(DateTime, default=datetime.utcnow)
    height_cm = Column(Float)
    trunk_diameter_cm = Column(Float)
    canopy_width_cm = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    bonsai = relationship("Bonsai", back_populates="measurements")


class Photo(TargetBase):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True)
    bonsai_id = Column(Integer, ForeignKey("bonsai.id"), nullable=False)
    update_id = Column(Integer, ForeignKey("bonsai_updates.id"))
    description = Column(Text)
    taken_at = Column(DateTime)
    full_path = Column(String(500), nullable=False)
    thumbnail_path = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    bonsai = relationship("Bonsai", back_populates="photos")


def guess_extension(filename: Optional[str], content_type: Optional[str]) -> str:
    if filename:
        suffix = Path(filename).suffix
        if suffix:
            return suffix
    if content_type:
        guessed = mimetypes.guess_extension(content_type)
        if guessed:
            return guessed
    return ".jpg"


def _apply_exif_orientation(image: Image.Image) -> Image.Image:
    try:
        return ImageOps.exif_transpose(image)
    except Exception:
        return image


def _resolve_image_format(extension: str, image: Image.Image) -> str:
    normalized_extension = extension.lower()
    registered = Image.registered_extensions()
    if normalized_extension in registered:
        return registered[normalized_extension]
    if image.format:
        return image.format
    return "JPEG"


def _prepare_image_for_format(image: Image.Image, format_name: str) -> Image.Image:
    if format_name.upper() == "JPEG" and image.mode not in ("RGB", "L"):
        return image.convert("RGB")
    return image


def save_image_bytes(
    content: bytes,
    filename: Optional[str],
    content_type: Optional[str],
    media_root: Path,
    thumbnail_size: int,
) -> Tuple[str, str]:
    extension = guess_extension(filename, content_type)
    image_id = uuid4().hex

    full_relative = Path("full") / f"{image_id}{extension}"
    thumb_relative = Path("thumbs") / f"{image_id}{extension}"

    full_path = media_root / full_relative
    thumb_path = media_root / thumb_relative

    full_path.parent.mkdir(parents=True, exist_ok=True)
    thumb_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(BytesIO(content)) as source_image:
        oriented = _apply_exif_orientation(source_image)
        format_name = _resolve_image_format(extension, oriented)
        prepared_full = _prepare_image_for_format(oriented, format_name)
        prepared_full.save(full_path, format=format_name)

        thumbnail_image = prepared_full.copy()
        thumbnail_image.thumbnail((thumbnail_size, thumbnail_size))
        thumbnail_image = _prepare_image_for_format(thumbnail_image, format_name)
        thumbnail_image.save(thumb_path, format=format_name)

    return str(full_relative).replace("\\", "/"), str(thumb_relative).replace("\\", "/")

LegacyBase = declarative_base()


class LegacySpecies(LegacyBase):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    notes = Column(Text)
    trees = relationship("LegacyTree", back_populates="species_info")


class LegacyTree(LegacyBase):
    __tablename__ = "trees"

    id = Column(Integer, primary_key=True)
    tree_number = Column(String(50), nullable=False)
    tree_name = Column(String(50), nullable=False)
    species_id = Column(Integer, ForeignKey("species.id"))
    date_acquired = Column(DateTime, nullable=False)
    origin_date = Column(DateTime, nullable=False)
    current_girth = Column(Float)
    notes = Column(Text)
    is_archived = Column(Integer, default=0)

    species_info = relationship("LegacySpecies", back_populates="trees")
    updates = relationship(
        "LegacyTreeUpdate",
        back_populates="tree",
        cascade="all, delete-orphan",
        order_by="LegacyTreeUpdate.update_date",
    )
    photos = relationship(
        "LegacyPhoto",
        back_populates="tree",
        cascade="all, delete-orphan",
        order_by="LegacyPhoto.photo_date",
    )


class LegacyTreeUpdate(LegacyBase):
    __tablename__ = "tree_updates"

    id = Column(Integer, primary_key=True)
    tree_id = Column(Integer, ForeignKey("trees.id"), nullable=False)
    update_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    girth = Column(Float)
    work_performed = Column(Text, nullable=False)

    tree = relationship("LegacyTree", back_populates="updates")


class LegacyPhoto(LegacyBase):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True)
    tree_id = Column(Integer, ForeignKey("trees.id"), nullable=False)
    file_path = Column(String(255), nullable=False)
    photo_date = Column(DateTime, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    description = Column(Text)
    is_starred = Column(Integer, default=0)

    tree = relationship("LegacyTree", back_populates="photos")


def _get_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--legacy-db",
        type=Path,
        default=REPO_ROOT / "backend" / "bonsai.db",
        help="Path to the legacy SQLite database (defaults to backend/bonsai.db)",
    )
    parser.add_argument(
        "--images-dir",
        type=Path,
        required=True,
        help="Directory that contains the original legacy image files",
    )
    parser.add_argument(
        "--target-db",
        type=str,
        default=_default_db_url(),
        help="SQLAlchemy database URL for the new application",
    )
    parser.add_argument(
        "--media-root",
        type=Path,
        default=REPO_ROOT / "backend" / "var" / "media",
        help="Directory where processed full/thumbnail images should be stored",
    )
    parser.add_argument(
        "--thumbnail-size",
        type=int,
        default=512,
        help="Maximum dimension (in px) for generated thumbnails",
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Persist changes. Without this flag the script performs a dry run",
    )
    return parser


def _create_sqlite_engine(db_url: str | Path):
    if isinstance(db_url, Path):
        url = f"sqlite:///{db_url}"
    else:
        url = db_url
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args)


def _mm_to_cm(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    return value / 10.0


def _resolve_species(session: Session, species_name: Optional[str]) -> Optional[Species]:
    if not species_name:
        return None

    normalized = species_name.strip()
    if not normalized:
        return None

    stmt = select(Species).where(func.lower(Species.common_name) == normalized.lower())
    existing = session.scalars(stmt).first()
    if existing:
        return existing

    logging.info("Creating new species entry for '%s'", normalized)
    new_species = Species(common_name=normalized, description="Imported from legacy database")
    session.add(new_species)
    session.flush()
    return new_species


def _ensure_unique_name(session: Session, desired_name: str) -> str:
    base = desired_name.strip() or "Imported Tree"
    candidate = base
    suffix = 1
    while session.scalar(select(Bonsai.id).where(Bonsai.name == candidate).limit(1)):
        suffix += 1
        candidate = f"{base} ({suffix})"
    return candidate


def _attach_measurement(session: Session, bonsai: Bonsai, value_cm: Optional[float], measured_at: Optional[datetime], note: str) -> None:
    if value_cm is None:
        return
    measurement = Measurement(
        bonsai=bonsai,
        measured_at=measured_at or datetime.utcnow(),
        trunk_diameter_cm=value_cm,
        notes=note,
    )
    session.add(measurement)


def _resolve_image_path(images_dir: Path, stored_path: str) -> Optional[Path]:
    if not stored_path:
        return None
    raw_path = Path(stored_path)
    candidates = []
    if raw_path.is_absolute():
        candidates.append(raw_path)
        candidates.append(images_dir / raw_path.name)
    else:
        candidates.append(images_dir / raw_path)
        candidates.append(images_dir / raw_path.name)
    for candidate in candidates:
        if candidate.exists():
            return candidate
    logging.warning("Could not find photo '%s' in %s", stored_path, images_dir)
    return None


def _import_photo(
    session: Session,
    bonsai: Bonsai,
    legacy_photo: LegacyPhoto,
    images_dir: Path,
    media_root: Path,
    thumbnail_size: int,
) -> Optional[Photo]:
    source_path = _resolve_image_path(images_dir, legacy_photo.file_path)
    if not source_path:
        return None

    content = source_path.read_bytes()
    full_rel, thumb_rel = save_image_bytes(
        content,
        source_path.name,
        None,
        media_root,
        thumbnail_size,
    )

    photo = Photo(
        bonsai=bonsai,
        description=legacy_photo.description,
        taken_at=legacy_photo.photo_date,
        full_path=full_rel,
        thumbnail_path=thumb_rel,
        is_primary=bool(legacy_photo.is_starred),
        created_at=legacy_photo.upload_date,
    )
    session.add(photo)
    return photo


def _import_update(session: Session, bonsai: Bonsai, legacy_update: LegacyTreeUpdate) -> BonsaiUpdate:
    performed_at = legacy_update.update_date or datetime.utcnow()
    title_date = performed_at.strftime("%Y-%m-%d")
    update = BonsaiUpdate(
        bonsai=bonsai,
        title=f"Legacy Update {title_date}",
        description=legacy_update.work_performed,
        performed_at=performed_at,
        created_at=performed_at,
        updated_at=performed_at,
    )
    session.add(update)
    _attach_measurement(
        session,
        bonsai,
        _mm_to_cm(legacy_update.girth),
        performed_at,
        note="Legacy girth measurement",
    )
    return update


def _import_tree(
    session: Session,
    legacy_tree: LegacyTree,
    images_dir: Path,
    media_root: Path,
    thumbnail_size: int,
) -> dict[str, int]:
    result_counts = defaultdict(int)

    existing = session.scalar(
        select(Bonsai.id).where(Bonsai.name == legacy_tree.tree_name).limit(1)
    )
    if existing:
        logging.info("Skipping '%s' because a bonsai with the same name already exists", legacy_tree.tree_name)
        return result_counts

    species = _resolve_species(session, legacy_tree.species_info.name if legacy_tree.species_info else None)
    bonsai = Bonsai(
        name=_ensure_unique_name(session, legacy_tree.tree_name),
        species=species,
        acquisition_date=legacy_tree.date_acquired.date() if legacy_tree.date_acquired else None,
        origin_date=legacy_tree.origin_date.date() if legacy_tree.origin_date else None,
        status="archived" if legacy_tree.is_archived else "active",
        notes=_build_notes(legacy_tree),
    )
    session.add(bonsai)
    session.flush()  # obtain bonsai.id for related rows

    _attach_measurement(
        session,
        bonsai,
        _mm_to_cm(legacy_tree.current_girth),
        legacy_tree.date_acquired,
        note="Legacy current girth",
    )

    for update in legacy_tree.updates:
        _import_update(session, bonsai, update)
        result_counts["updates"] += 1

    for photo in legacy_tree.photos:
        if _import_photo(session, bonsai, photo, images_dir, media_root, thumbnail_size):
            result_counts["photos"] += 1

    result_counts["trees"] += 1
    return result_counts


def _build_notes(legacy_tree: LegacyTree) -> Optional[str]:
    fragments = []
    if legacy_tree.tree_number:
        fragments.append(f"Legacy tree number: {legacy_tree.tree_number}")
    if legacy_tree.notes:
        fragments.append(legacy_tree.notes)
    if fragments:
        return "\n\n".join(fragments)
    return None


def _refresh_species_counts(session: Session) -> None:
    counts = dict(session.execute(select(Bonsai.species_id, func.count(Bonsai.id)).group_by(Bonsai.species_id)))
    for species in session.scalars(select(Species)).all():
        species.tree_count = counts.get(species.id, 0)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    args = _get_arg_parser().parse_args()

    legacy_engine = _create_sqlite_engine(args.legacy_db)
    legacy_session_maker = sessionmaker(bind=legacy_engine)

    target_engine = _create_sqlite_engine(args.target_db)
    target_session_maker = sessionmaker(bind=target_engine)

    images_dir = args.images_dir
    if not images_dir.exists():
        raise SystemExit(f"Images directory '{images_dir}' does not exist")

    media_root = args.media_root
    media_root.mkdir(parents=True, exist_ok=True)

    with legacy_session_maker() as legacy_session, target_session_maker() as target_session:
        legacy_trees = (
            legacy_session.execute(
                select(LegacyTree).options(
                    joinedload(LegacyTree.species_info),
                    joinedload(LegacyTree.updates),
                    joinedload(LegacyTree.photos),
                )
            )
            .unique()
            .scalars()
            .all()
        )

        totals = defaultdict(int)
        for legacy_tree in legacy_trees:
            counts = _import_tree(
                target_session,
                legacy_tree,
                images_dir,
                media_root,
                args.thumbnail_size,
            )
            for key, value in counts.items():
                totals[key] += value

        _refresh_species_counts(target_session)

        logging.info(
            "Processed %s trees, %s updates, %s photos",
            totals.get("trees", 0),
            totals.get("updates", 0),
            totals.get("photos", 0),
        )

        if args.commit:
            target_session.commit()
            logging.info("Changes committed successfully")
        else:
            target_session.rollback()
            logging.info("Dry run complete (no changes persisted). Use --commit to apply the import")


if __name__ == "__main__":
    main()
