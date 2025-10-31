const MS_IN_DAY = 1000 * 60 * 60 * 24;
const MS_IN_YEAR = MS_IN_DAY * 365.25;

const toDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : new Date(timestamp);
  }

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : parsed;
};

export const getSafeTimestamp = (value, fallback = null) => {
  const parsed = toDate(value);
  return parsed ? parsed.getTime() : fallback;
};

export const calculateAgeInYears = (value) => {
  const parsed = toDate(value);
  if (!parsed) {
    return null;
  }

  const diff = Date.now() - parsed.getTime();
  if (!Number.isFinite(diff)) {
    return null;
  }

  const years = diff / MS_IN_YEAR;
  if (!Number.isFinite(years) || years < 0) {
    return null;
  }

  return Number(years.toFixed(1));
};

export const formatDisplayDate = (
  value,
  { locale = "en-US", options, fallback = "" } = {}
) => {
  const parsed = toDate(value);
  if (!parsed) {
    return fallback;
  }

  const formatOptions =
    options ?? { month: "short", day: "numeric", year: "numeric" };
  return parsed.toLocaleDateString(locale, formatOptions);
};

export const startOfDay = (value = new Date()) => {
  const date = toDate(value);
  if (!date) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

export const compareByTimestampDesc = (a, b, selector) => {
  const aTime = getSafeTimestamp(selector(a)) ?? 0;
  const bTime = getSafeTimestamp(selector(b)) ?? 0;
  return bTime - aTime;
};

export const compareByTimestampAsc = (a, b, selector) => {
  const aTime = getSafeTimestamp(selector(a)) ?? 0;
  const bTime = getSafeTimestamp(selector(b)) ?? 0;
  return aTime - bTime;
};

export const differenceInDays = (target, base = new Date()) => {
  const targetDate = startOfDay(target);
  const baseDate = startOfDay(base);

  if (!targetDate || !baseDate) {
    return null;
  }

  const diff = targetDate.getTime() - baseDate.getTime();
  return Math.round(diff / MS_IN_DAY);
};

export default {
  calculateAgeInYears,
  compareByTimestampAsc,
  compareByTimestampDesc,
  differenceInDays,
  formatDisplayDate,
  getSafeTimestamp,
  startOfDay,
};
