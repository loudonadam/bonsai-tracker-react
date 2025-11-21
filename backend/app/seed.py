from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.orm import Session

from .database import SessionLocal, engine, Base
from . import models


SAMPLE_SPECIES = [
    {
        "common_name": "Japanese Maple",
        "scientific_name": "Acer palmatum",
        "description": "Deciduous tree prized for its foliage.",
        "care_instructions": "Keep soil moist and provide partial shade during summer.",
    },
    {
        "common_name": "Chinese Elm",
        "scientific_name": "Ulmus parvifolia",
        "description": "Vigorous grower suitable for beginners.",
        "care_instructions": "Water regularly and protect from frost.",
    },
]


SAMPLE_BONSAI = [
    {
        "name": "Autumn Flame",
        "species_index": 0,
        "acquisition_date": date(2018, 4, 20),
        "origin_date": date(2010, 3, 12),
        "development_stage": "refinement",
        "notes": "Beautiful red leaves in fall. Needs repotting next spring.",
    },
    {
        "name": "Ancient Pine",
        "species_index": 1,
        "acquisition_date": date(2015, 6, 10),
        "origin_date": date(2005, 9, 1),
        "development_stage": "show-eligible",
        "notes": "Wire training going well; monitor bud growth.",
    },
]


def seed_database(session: Session):
    if session.query(models.Species).count():
        return

    species_instances = []
    for data in SAMPLE_SPECIES:
        species = models.Species(**data)
        session.add(species)
        species_instances.append(species)
    session.flush()

    for data in SAMPLE_BONSAI:
        species = species_instances[data["species_index"]]
        bonsai = models.Bonsai(
            name=data["name"],
            species_id=species.id,
            acquisition_date=data["acquisition_date"],
            origin_date=data["origin_date"],
            development_stage=data["development_stage"],
            notes=data["notes"],
        )
        session.add(bonsai)
        species.tree_count += 1
        session.flush()

        update = models.BonsaiUpdate(
            bonsai_id=bonsai.id,
            title="Wiring session",
            description="Refined branch structure and removed crossing limbs.",
            performed_at=datetime.utcnow(),
        )
        session.add(update)

        measurement = models.Measurement(
            bonsai_id=bonsai.id,
            update=update,
            measured_at=datetime.utcnow(),
            trunk_diameter_cm=15.0,
            height_cm=55.0,
            canopy_width_cm=40.0,
            notes="Initial measurement",
        )
        session.add(measurement)

        notification = models.Notification(
            bonsai_id=bonsai.id,
            title="Repotting reminder",
            message="Repot in early spring with fresh akadama mix.",
            category="care",
            due_at=datetime.utcnow(),
        )
        session.add(notification)

    session.commit()


def main():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_database(session)


if __name__ == "__main__":
    main()
