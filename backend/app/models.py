from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Species(Base):
    __tablename__ = "species"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    common_name: Mapped[str] = mapped_column(String(255), nullable=False)
    scientific_name: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    care_instructions: Mapped[Optional[str]] = mapped_column(Text)
    tree_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    bonsai: Mapped[list["Bonsai"]] = relationship("Bonsai", back_populates="species")


class Bonsai(Base):
    __tablename__ = "bonsai"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    species_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("species.id"))
    acquisition_date: Mapped[Optional[date]] = mapped_column(Date)
    origin_date: Mapped[Optional[date]] = mapped_column(Date)
    location: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    development_stage: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    species: Mapped[Optional[Species]] = relationship("Species", back_populates="bonsai")
    updates: Mapped[list["BonsaiUpdate"]] = relationship(
        "BonsaiUpdate", back_populates="bonsai", cascade="all, delete-orphan"
    )
    measurements: Mapped[list["Measurement"]] = relationship(
        "Measurement",
        back_populates="bonsai",
        cascade="all, delete-orphan",
        order_by="Measurement.measured_at.desc()",
    )
    photos: Mapped[list["Photo"]] = relationship(
        "Photo",
        back_populates="bonsai",
        cascade="all, delete-orphan",
        order_by="Photo.created_at.desc()",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="bonsai", cascade="all, delete-orphan"
    )
    graveyard_entry: Mapped[Optional["GraveyardEntry"]] = relationship(
        "GraveyardEntry",
        back_populates="bonsai",
        cascade="all, delete-orphan",
        uselist=False,
    )
    accolades: Mapped[list["Accolade"]] = relationship(
        "Accolade",
        back_populates="bonsai",
        cascade="all, delete-orphan",
        order_by="Accolade.created_at.desc()",
    )


class BonsaiUpdate(Base):
    __tablename__ = "bonsai_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bonsai_id: Mapped[int] = mapped_column(Integer, ForeignKey("bonsai.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    performed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    bonsai: Mapped[Bonsai] = relationship("Bonsai", back_populates="updates")
    measurement: Mapped[Optional["Measurement"]] = relationship(
        "Measurement",
        back_populates="update",
        cascade="all, delete-orphan",
        uselist=False,
    )
    photos: Mapped[list["Photo"]] = relationship("Photo", back_populates="update")


class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bonsai_id: Mapped[int] = mapped_column(Integer, ForeignKey("bonsai.id"), nullable=False)
    update_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("bonsai_updates.id", ondelete="SET NULL"), nullable=True
    )
    measured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    trunk_diameter_cm: Mapped[Optional[float]] = mapped_column(Float)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    bonsai: Mapped[Bonsai] = relationship("Bonsai", back_populates="measurements")
    update: Mapped[Optional[BonsaiUpdate]] = relationship(
        "BonsaiUpdate", back_populates="measurement"
    )


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bonsai_id: Mapped[int] = mapped_column(Integer, ForeignKey("bonsai.id"), nullable=False)
    update_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("bonsai_updates.id"), nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text)
    taken_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    full_path: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_path: Mapped[str] = mapped_column(String(500), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    bonsai: Mapped[Bonsai] = relationship("Bonsai", back_populates="photos")
    update: Mapped[Optional[BonsaiUpdate]] = relationship("BonsaiUpdate", back_populates="photos")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bonsai_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("bonsai.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100))
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    bonsai: Mapped[Optional[Bonsai]] = relationship("Bonsai", back_populates="notifications")


class GraveyardEntry(Base):
    __tablename__ = "graveyard_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bonsai_id: Mapped[int] = mapped_column(Integer, ForeignKey("bonsai.id"), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="dead", nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text)
    moved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    bonsai: Mapped[Bonsai] = relationship("Bonsai", back_populates="graveyard_entry")


class Accolade(Base):
    __tablename__ = "accolades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bonsai_id: Mapped[int] = mapped_column(Integer, ForeignKey("bonsai.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("photos.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    bonsai: Mapped[Bonsai] = relationship("Bonsai", back_populates="accolades")
    photo: Mapped[Optional[Photo]] = relationship("Photo")
