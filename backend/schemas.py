from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class SpeciesBase(BaseModel):
    common_name: str = Field(..., max_length=255)
    scientific_name: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None


class SpeciesCreate(SpeciesBase):
    pass


class SpeciesUpdate(BaseModel):
    common_name: Optional[str] = Field(default=None, max_length=255)
    scientific_name: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None


class SpeciesOut(SpeciesBase):
    id: int
    tree_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class TreeBase(BaseModel):
    name: str
    tree_number: Optional[str] = None
    acquisition_date: date
    origin_date: Optional[date] = None
    current_girth: Optional[float] = None
    trunk_width: Optional[float] = None
    notes: Optional[str] = None
    development_stage: Optional[str] = "pre-bonsai"
    species_id: Optional[int] = None


class TreeCreate(TreeBase):
    pass


class TreeUpdatePayload(BaseModel):
    name: Optional[str] = None
    tree_number: Optional[str] = None
    acquisition_date: Optional[date] = None
    origin_date: Optional[date] = None
    current_girth: Optional[float] = None
    trunk_width: Optional[float] = None
    notes: Optional[str] = None
    development_stage: Optional[str] = None
    species_id: Optional[int] = None


class TreePhotoOut(BaseModel):
    id: int
    description: str | None = None
    photo_date: Optional[date] = None
    original_url: str
    thumbnail_url: str

    class Config:
        orm_mode = True


class TreeUpdateOut(BaseModel):
    id: int
    update_date: date
    girth: Optional[float]
    work_performed: str | None = None

    class Config:
        orm_mode = True


class ReminderBase(BaseModel):
    tree_id: Optional[int] = None
    message: str
    due_date: date


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    message: Optional[str] = None
    due_date: Optional[date] = None
    is_completed: Optional[bool] = None


class ReminderOut(ReminderBase):
    id: int
    is_completed: bool
    created_at: datetime
    completed_at: Optional[datetime]
    tree_name: Optional[str]

    class Config:
        orm_mode = True


class GraveyardEntryCreate(BaseModel):
    category: str
    note: Optional[str] = None


class GraveyardEntryOut(BaseModel):
    id: int
    category: str
    note: Optional[str]
    moved_at: datetime
    tree_id: int
    tree_name: str
    tree_species: Optional[str]
    photo_url: Optional[str]


class TreeSummary(BaseModel):
    id: int
    name: str
    species: Optional[str]
    species_id: Optional[int]
    acquisition_date: date
    origin_date: Optional[date]
    current_girth: Optional[float]
    trunk_width: Optional[float]
    notes: Optional[str]
    development_stage: Optional[str]
    last_update: Optional[date]
    photo_url: Optional[str]


class TreeDetailOut(TreeSummary):
    photos: list[TreePhotoOut]
    updates: list[TreeUpdateOut]


class TreeUpdateCreate(BaseModel):
    update_date: date
    girth: Optional[float] = None
    work_performed: Optional[str] = None


class TreePhotoCreate(BaseModel):
    description: Optional[str] = None
    photo_date: Optional[date] = None
