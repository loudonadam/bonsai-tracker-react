const EXIF_DATE_TAGS = [0x9003, 0x0132, 0x9004];

const normalizeExifDateString = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^(\d{4}):(\d{2}):(\d{2})(?:[\sT](\d{2}):(\d{2}):(\d{2}))?$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  if (year === "0000" || month === "00" || day === "00") {
    return null;
  }

  const datePart = `${year}-${month}-${day}`;
  if (!hour || !minute || !second) {
    return datePart;
  }

  const isoLike = `${datePart}T${hour}:${minute}:${second}`;
  const parsed = new Date(isoLike);
  if (Number.isNaN(parsed.getTime())) {
    return datePart;
  }

  return datePart;
};

const readAsciiValue = (view, offset, baseOffset, littleEndian, count) => {
  if (count <= 0) {
    return null;
  }

  let valueOffset;
  if (count <= 4) {
    valueOffset = offset;
  } else {
    const relativeOffset = view.getUint32(offset, littleEndian);
    valueOffset = baseOffset + relativeOffset;
  }

  if (valueOffset >= view.byteLength) {
    return null;
  }

  const maxLength = Math.min(count, view.byteLength - valueOffset);
  let result = "";
  for (let index = 0; index < maxLength; index += 1) {
    const codePoint = view.getUint8(valueOffset + index);
    if (codePoint === 0) {
      break;
    }
    result += String.fromCharCode(codePoint);
  }

  return result || null;
};

const searchIfdForDate = (view, tiffOffset, ifdRelativeOffset, littleEndian, visited) => {
  if (!Number.isFinite(ifdRelativeOffset)) {
    return null;
  }

  const absoluteOffset = tiffOffset + ifdRelativeOffset;
  if (absoluteOffset >= view.byteLength) {
    return null;
  }

  if (visited.has(absoluteOffset)) {
    return null;
  }
  visited.add(absoluteOffset);

  const entryCount = view.getUint16(absoluteOffset, littleEndian);
  let cursor = absoluteOffset + 2;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (cursor + 12 > view.byteLength) {
      return null;
    }

    const tag = view.getUint16(cursor, littleEndian);
    const type = view.getUint16(cursor + 2, littleEndian);
    const count = view.getUint32(cursor + 4, littleEndian);

    if (tag === 0x8769) {
      const exifOffset = view.getUint32(cursor + 8, littleEndian);
      const nested = searchIfdForDate(
        view,
        tiffOffset,
        exifOffset,
        littleEndian,
        visited
      );
      if (nested) {
        return nested;
      }
    } else if (EXIF_DATE_TAGS.includes(tag) && type === 2 && count > 0) {
      const ascii = readAsciiValue(
        view,
        cursor + 8,
        tiffOffset,
        littleEndian,
        count
      );
      const normalized = normalizeExifDateString(ascii);
      if (normalized) {
        return normalized;
      }
    }

    cursor += 12;
  }

  if (cursor + 4 > view.byteLength) {
    return null;
  }

  const nextIfdRelativeOffset = view.getUint32(cursor, littleEndian);
  if (nextIfdRelativeOffset !== 0) {
    return searchIfdForDate(
      view,
      tiffOffset,
      nextIfdRelativeOffset,
      littleEndian,
      visited
    );
  }

  return null;
};

const tryExtractExifDate = async (file) => {
  const slice = file.slice(0, 128 * 1024);
  const buffer = await slice.arrayBuffer();
  const view = new DataView(buffer);

  if (view.byteLength < 4) {
    return null;
  }

  if (view.getUint16(0, false) !== 0xffd8) {
    // Not a JPEG with EXIF metadata that we recognise
    return null;
  }

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      break;
    }

    const marker = view.getUint8(offset + 1);
    offset += 2;

    if (marker === 0xda) {
      // Start of scan
      break;
    }

    const size = view.getUint16(offset, false);
    offset += 2;

    if (size < 2 || offset + size - 2 > view.byteLength) {
      break;
    }

    if (marker === 0xe1) {
      const header = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );

      if (header === "Exif") {
        const tiffOffset = offset + 6;
        if (tiffOffset + 8 > view.byteLength) {
          break;
        }

        const byteOrder = view.getUint16(tiffOffset, false);
        const littleEndian = byteOrder === 0x4949; // "II"
        const magic = view.getUint16(tiffOffset + 2, littleEndian);
        if (magic !== 0x002a) {
          break;
        }

        const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
        const visited = new Set();
        const result = searchIfdForDate(
          view,
          tiffOffset,
          firstIfdOffset,
          littleEndian,
          visited
        );
        if (result) {
          return result;
        }

        break;
      }
    }

    offset += size - 2;
  }

  return null;
};

const formatDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const extractPhotoDate = async (file) => {
  if (!(file instanceof Blob)) {
    return "";
  }

  try {
    const exifDate = await tryExtractExifDate(file);
    if (exifDate) {
      return exifDate;
    }
  } catch {
    // Ignore EXIF parsing errors and fall back to last modified
  }

  if (typeof file.lastModified === "number" && file.lastModified > 0) {
    const fallback = formatDateInputValue(file.lastModified);
    if (fallback) {
      return fallback;
    }
  }

  return "";
};

export default extractPhotoDate;
