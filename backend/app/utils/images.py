from __future__ import annotations

import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Tuple
from uuid import uuid4

from PIL import Image, ImageOps

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


def _apply_exif_orientation(image: Image.Image) -> Image.Image:
    try:
        return ImageOps.exif_transpose(image)
    except Exception:  # pragma: no cover - best effort to preserve orientation
        return image


def _resolve_image_format(extension: str, image: Image.Image) -> str:
    """Resolve the format that Pillow should use when saving an image."""

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

    with Image.open(BytesIO(content)) as source_image:
        oriented = _apply_exif_orientation(source_image)
        format_name = _resolve_image_format(extension, oriented)
        prepared_full = _prepare_image_for_format(oriented, format_name)

        prepared_full.save(full_path, format=format_name)

        thumbnail_image = prepared_full.copy()
        thumbnail_image.thumbnail((settings.thumbnail_size, settings.thumbnail_size))
        thumbnail_image = _prepare_image_for_format(thumbnail_image, format_name)
        thumbnail_image.save(thumb_path, format=format_name)

    return str(full_relative).replace("\\", "/"), str(thumb_relative).replace("\\", "/")
