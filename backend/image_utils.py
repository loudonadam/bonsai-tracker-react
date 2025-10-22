from pathlib import Path
from typing import Tuple
from PIL import Image

from .config import THUMBNAIL_SIZE


def create_thumbnail(source_path: Path, destination_path: Path, size: Tuple[int, int] | None = None) -> None:
    size = size or THUMBNAIL_SIZE
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as img:
        img.thumbnail(size)
        img.save(destination_path, format=img.format or "JPEG")
