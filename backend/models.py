from datetime import datetime
from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship

from .database import Base


class Species(Base):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String, nullable=False)
    scientific_name = Column(String, nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trees = relationship("Tree", back_populates="species", cascade="all, delete-orphan")


class Tree(Base):
    __tablename__ = "trees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    tree_number = Column(String, nullable=True)
    acquisition_date = Column(Date, nullable=False)
    origin_date = Column(Date, nullable=True)
    current_girth = Column(Float, nullable=True)
    trunk_width = Column(Float, nullable=True)
    notes = Column(Text, default="")
    development_stage = Column(String, default="pre-bonsai")
    last_update = Column(Date, nullable=True)
    species_id = Column(Integer, ForeignKey("species.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    species = relationship("Species", back_populates="trees")
    photos = relationship("TreePhoto", back_populates="tree", cascade="all, delete-orphan")
    updates = relationship("TreeUpdate", back_populates="tree", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="tree")
    graveyard_entry = relationship(
        "GraveyardEntry",
        back_populates="tree",
        uselist=False,
        cascade="all, delete-orphan",
    )


class TreePhoto(Base):
    __tablename__ = "tree_photos"

    id = Column(Integer, primary_key=True, index=True)
    tree_id = Column(Integer, ForeignKey("trees.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, default="")
    photo_date = Column(Date, nullable=True)
    file_name = Column(String, nullable=False)
    original_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tree = relationship("Tree", back_populates="photos")


class TreeUpdate(Base):
    __tablename__ = "tree_updates"

    id = Column(Integer, primary_key=True, index=True)
    tree_id = Column(Integer, ForeignKey("trees.id", ondelete="CASCADE"), nullable=False)
    update_date = Column(Date, nullable=False)
    girth = Column(Float, nullable=True)
    work_performed = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    tree = relationship("Tree", back_populates="updates")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    tree_id = Column(Integer, ForeignKey("trees.id", ondelete="SET NULL"), nullable=True)
    message = Column(Text, nullable=False)
    due_date = Column(Date, nullable=False)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    tree = relationship("Tree", back_populates="reminders")


class GraveyardEntry(Base):
    __tablename__ = "graveyard_entries"

    id = Column(Integer, primary_key=True, index=True)
    tree_id = Column(Integer, ForeignKey("trees.id", ondelete="CASCADE"), nullable=False, unique=True)
    category = Column(String, nullable=False)
    note = Column(Text, default="")
    moved_at = Column(DateTime, default=datetime.utcnow)

    tree = relationship("Tree", back_populates="graveyard_entry")
