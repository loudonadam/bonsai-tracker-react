export const roundToTenth = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.round(numeric * 10) / 10;
};

export const formatTrunkWidth = (value) => {
  const rounded = roundToTenth(value);

  if (rounded === null) {
    return null;
  }

  return rounded.toFixed(1);
};
