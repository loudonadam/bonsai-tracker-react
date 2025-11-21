export const DEVELOPMENT_STAGE_OPTIONS = [
  {
    value: "pre-bonsai",
    label: "Pre-Bonsai",
    shortLabel: "Pre-Bonsai",
    badgeClasses:
      "bg-amber-50 text-amber-700 border border-amber-200",
    textClasses: "text-amber-700",
    dotClasses: "bg-amber-400",
  },
  {
    value: "early-development",
    label: "Early Development",
    shortLabel: "Early Development",
    badgeClasses:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",
    textClasses: "text-emerald-700",
    dotClasses: "bg-emerald-400",
  },
  {
    value: "refinement",
    label: "Refinement",
    shortLabel: "Refinement",
    badgeClasses:
      "bg-teal-50 text-teal-700 border border-teal-200",
    textClasses: "text-teal-700",
    dotClasses: "bg-teal-400",
  },
  {
    value: "mature",
    label: "Mature",
    shortLabel: "Mature",
    badgeClasses:
      "bg-purple-50 text-purple-700 border border-purple-200",
    textClasses: "text-purple-700",
    dotClasses: "bg-purple-400",
  },
];

export const DEFAULT_STAGE_VALUE = DEVELOPMENT_STAGE_OPTIONS[0].value;

const STAGE_ALIASES = {
  "initial-styling": "early-development",
  "show-eligible": "mature",
};

export const getStageMeta = (stageValue) => {
  if (!stageValue) {
    return DEVELOPMENT_STAGE_OPTIONS[0];
  }

  const normalizedValue = stageValue.toLowerCase();
  const resolvedValue = STAGE_ALIASES[normalizedValue] ?? normalizedValue;

  return (
    DEVELOPMENT_STAGE_OPTIONS.find(
      (option) =>
        option.value === resolvedValue ||
        option.label.toLowerCase() === resolvedValue
    ) || DEVELOPMENT_STAGE_OPTIONS[0]
  );
};
