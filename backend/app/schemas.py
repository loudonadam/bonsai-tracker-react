from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .config import settings
from . import models


class SpeciesBase(BaseModel):
    common_name: str
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    care_instructions: Optional[str] = None


class SpeciesCreate(SpeciesBase):
    pass


class SpeciesUpdate(BaseModel):
    common_name: Optional[str] = None
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    care_instructions: Optional[str] = None
    tree_count: Optional[int] = Field(default=None, ge=0)


class SpeciesOut(SpeciesBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tree_count: int
    created_at: datetime
    updated_at: datetime


class BonsaiBase(BaseModel):
    name: str
    species_id: Optional[int] = None
    acquisition_date: Optional[date] = None
    origin_date: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    development_stage: Optional[str] = None
    status: Optional[str] = Field(default="active")


class BonsaiCreate(BonsaiBase):
    pass


class BonsaiUpdate(BaseModel):
    name: Optional[str] = None
    species_id: Optional[int] = None
    acquisition_date: Optional[date] = None
    origin_date: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    development_stage: Optional[str] = None
    status: Optional[str] = None


class BonsaiUpdateBase(BaseModel):
    title: str
    description: Optional[str] = None
    performed_at: Optional[datetime] = None


class BonsaiUpdateCreate(BonsaiUpdateBase):
    measurement: Optional["MeasurementPayload"] = None


class BonsaiUpdatePatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    performed_at: Optional[datetime] = None
    measurement: Optional["MeasurementPayload"] = None


class BonsaiUpdateOut(BonsaiUpdateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    measurement: Optional["MeasurementOut"] = None


class MeasurementPayload(BaseModel):
    measured_at: Optional[datetime] = None
    height_cm: Optional[float] = None
    trunk_diameter_cm: Optional[float] = None
    canopy_width_cm: Optional[float] = None
    notes: Optional[str] = None


class MeasurementBase(MeasurementPayload):
    update_id: Optional[int] = Field(default=None, ge=1)


class MeasurementCreate(MeasurementPayload):
    update_id: int = Field(ge=1)


class MeasurementOut(MeasurementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: Optional[str] = None
    taken_at: Optional[datetime] = None
    full_url: str
    thumbnail_url: str
    is_primary: bool
    created_at: datetime

    @classmethod
    def from_model(cls, photo: models.Photo) -> "PhotoOut":
        base_url = settings.media_url.rstrip("/")
        return cls(
            id=photo.id,
            description=photo.description,
            taken_at=photo.taken_at,
            full_url=f"{base_url}/{photo.full_path}" if photo.full_path else "",
            thumbnail_url=f"{base_url}/{photo.thumbnail_path}" if photo.thumbnail_path else "",
            is_primary=photo.is_primary,
            created_at=photo.created_at,
        )


class PhotoUpdate(BaseModel):
    description: Optional[str] = None
    taken_at: Optional[datetime] = None
    is_primary: Optional[bool] = None
    rotate_degrees: Optional[int] = Field(default=None)

    @field_validator("rotate_degrees")
    @classmethod
    def validate_rotation(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return None
        if value % 90 != 0:
            msg = "Rotation must be provided in 90 degree increments."
            raise ValueError(msg)
        return value


class AccoladeBase(BaseModel):
    title: str
    photo_id: Optional[int] = Field(default=None, ge=1)


class AccoladeCreate(AccoladeBase):
    pass


class AccoladeUpdate(BaseModel):
    title: Optional[str] = None
    photo_id: Optional[int] = Field(default=None, ge=1)


class AccoladeOut(AccoladeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    photo: Optional[PhotoOut] = None

    @classmethod
    def from_model(cls, accolade: models.Accolade) -> "AccoladeOut":
        return cls(
            id=accolade.id,
            title=accolade.title,
            photo_id=accolade.photo_id,
            created_at=accolade.created_at,
            updated_at=accolade.updated_at,
            photo=PhotoOut.from_model(accolade.photo) if accolade.photo else None,
        )


class NotificationBase(BaseModel):
    title: str
    message: str
    category: Optional[str] = None
    due_at: Optional[datetime] = None
    bonsai_id: Optional[int] = None
    read: Optional[bool] = False


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    category: Optional[str] = None
    due_at: Optional[datetime] = None
    read: Optional[bool] = None


class NotificationOut(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class GraveyardEntryBase(BaseModel):
    category: str
    note: Optional[str] = None


class GraveyardEntryCreate(GraveyardEntryBase):
    pass


class GraveyardEntryOut(GraveyardEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bonsai_id: int
    moved_at: datetime

class BonsaiSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    species: Optional[SpeciesOut] = None
    acquisition_date: Optional[date] = None
    origin_date: Optional[date] = None
    development_stage: Optional[str] = None
    status: str
    notes: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    primary_photo: Optional[PhotoOut] = None
    latest_measurement: Optional[MeasurementOut] = None
    latest_update: Optional[BonsaiUpdateOut] = None
    graveyard_entry: Optional[GraveyardEntryOut] = None

    @classmethod
    def from_model(cls, bonsai: models.Bonsai) -> "BonsaiSummary":
        primary_photo = next((photo for photo in bonsai.photos if photo.is_primary), None)
        if primary_photo is None and bonsai.photos:
            primary_photo = bonsai.photos[0]

        latest_update = (
            max(bonsai.updates, key=lambda item: item.performed_at or item.created_at)
            if bonsai.updates
            else None
        )
        latest_measurement = bonsai.measurements[0] if bonsai.measurements else None

        return cls(
            id=bonsai.id,
            name=bonsai.name,
            species=SpeciesOut.model_validate(bonsai.species) if bonsai.species else None,
            acquisition_date=bonsai.acquisition_date,
            origin_date=bonsai.origin_date,
            development_stage=bonsai.development_stage,
            status=bonsai.status,
            notes=bonsai.notes,
            location=bonsai.location,
            created_at=bonsai.created_at,
            updated_at=bonsai.updated_at,
            primary_photo=PhotoOut.from_model(primary_photo) if primary_photo else None,
            latest_measurement=MeasurementOut.model_validate(latest_measurement)
            if latest_measurement
            else None,
            latest_update=BonsaiUpdateOut.model_validate(latest_update)
            if latest_update
            else None,
            graveyard_entry=(
                GraveyardEntryOut.model_validate(bonsai.graveyard_entry)
                if bonsai.graveyard_entry
                else None
            ),
        )


class BonsaiDetail(BonsaiSummary):
    photos: list[PhotoOut] = Field(default_factory=list)
    updates: list[BonsaiUpdateOut] = Field(default_factory=list)
    measurements: list[MeasurementOut] = Field(default_factory=list)
    notifications: list[NotificationOut] = Field(default_factory=list)
    accolades: list[AccoladeOut] = Field(default_factory=list)

    @classmethod
    def from_model(cls, bonsai: models.Bonsai) -> "BonsaiDetail":
        summary = BonsaiSummary.from_model(bonsai)
        return cls(
            **summary.model_dump(),
            photos=[PhotoOut.from_model(photo) for photo in bonsai.photos],
            updates=[BonsaiUpdateOut.model_validate(update) for update in bonsai.updates],
            measurements=[
                MeasurementOut.model_validate(measurement) for measurement in bonsai.measurements
            ],
            notifications=[
                NotificationOut.model_validate(notification)
                for notification in bonsai.notifications
            ],
            accolades=[AccoladeOut.from_model(accolade) for accolade in bonsai.accolades],
        )
