from __future__ import annotations

import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Tuple
from uuid import uuid4

from PIL import Image

from ..config import settings


def guess_extension(filename: str | None, content_type: str | None) -> str:
    if filename:
        suffix = Path(filename).suffix
        if suffix:
            return suffix
    if content_type:
        guessed = mimetypes.guess_extension(content_type)
        if guessed:
            return guessed
    return ".jpg"


def save_image_bytes(content: bytes, filename: str | None, content_type: str | None) -> Tuple[str, str]:
    """Save an image and its thumbnail, returning relative paths."""

    extension = guess_extension(filename, content_type)
    image_id = uuid4().hex

    full_relative = Path("full") / f"{image_id}{extension}"
    thumb_relative = Path("thumbs") / f"{image_id}{extension}"

    full_path = settings.media_root / full_relative
    thumb_path = settings.media_root / thumb_relative

    full_path.parent.mkdir(parents=True, exist_ok=True)
    thumb_path.parent.mkdir(parents=True, exist_ok=True)

    with open(full_path, "wb") as file:
        file.write(content)

    with Image.open(BytesIO(content)) as image:
        image = image.convert("RGB")
        image.thumbnail((settings.thumbnail_size, settings.thumbnail_size))
        image.save(thumb_path)

    return str(full_relative).replace("\\", "/"), str(thumb_relative).replace("\\", "/")
