from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix=f"{settings.api_prefix}/notifications", tags=["notifications"])


@router.get("/", response_model=list[schemas.NotificationOut])
def list_notifications(db: Session = Depends(get_db)):
    return (
        db.query(models.Notification)
        .order_by(models.Notification.due_at.is_(None), models.Notification.due_at)
        .all()
    )


@router.post("/", response_model=schemas.NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification(payload: schemas.NotificationCreate, db: Session = Depends(get_db)):
    if payload.bonsai_id and not db.get(models.Bonsai, payload.bonsai_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bonsai not found")

    notification = models.Notification(**payload.model_dump(exclude_unset=True))
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.patch("/{notification_id}", response_model=schemas.NotificationOut)
def update_notification(
    notification_id: int,
    payload: schemas.NotificationUpdate,
    db: Session = Depends(get_db),
):
    notification = db.get(models.Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(notification, key, value)

    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    notification = db.get(models.Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    db.delete(notification)
    db.commit()
