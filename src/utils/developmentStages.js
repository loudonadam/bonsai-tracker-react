export const DEVELOPMENT_STAGE_OPTIONS = [
  {
    value: "pre-bonsai",
    label: "Pre-Bonsai",
    shortLabel: "Pre-Bonsai",
    badgeClasses: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    textClasses: "text-yellow-700",
    dotClasses: "bg-yellow-400",
  },
  {
    value: "early-development",
    label: "Early Development",
    shortLabel: "Early Dev.",
    badgeClasses: "bg-green-50 text-green-700 border border-green-200",
    textClasses: "text-green-700",
    dotClasses: "bg-green-400",
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

export const getStageMeta = (stageValue) => {
  if (!stageValue) {
    return DEVELOPMENT_STAGE_OPTIONS[0];
  }

  const normalizedValue = stageValue.toLowerCase();
  const legacyMap = {
    "initial-styling": "early-development",
    "show-eligible": "mature",
  };
  const resolvedValue = legacyMap[normalizedValue] || normalizedValue;

  return (
    DEVELOPMENT_STAGE_OPTIONS.find(
      (option) =>
        option.value === resolvedValue ||
        option.label.toLowerCase() === resolvedValue
    ) || DEVELOPMENT_STAGE_OPTIONS[0]
  );
};
