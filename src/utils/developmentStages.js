export const DEVELOPMENT_STAGE_OPTIONS = [
  {
    value: "pre-bonsai",
    label: "Pre-Bonsai",
    shortLabel: "Pre-Bonsai",
    badgeClasses:
      "bg-amber-200 text-amber-900 border border-amber-300",
    dotClasses: "bg-amber-600",
  },
  {
    value: "initial-styling",
    label: "Initial Styling",
    shortLabel: "Initial Styling",
    badgeClasses:
      "bg-green-100 text-green-800 border border-green-200",
    dotClasses: "bg-green-400",
  },
  {
    value: "early-development",
    label: "Early Development",
    shortLabel: "Early Dev.",
    badgeClasses:
      "bg-green-500 text-white border border-green-600",
    dotClasses: "bg-green-600",
  },
  {
    value: "refinement",
    label: "Refinement",
    shortLabel: "Refinement",
    badgeClasses:
      "bg-teal-600 text-white border border-teal-700",
    dotClasses: "bg-teal-500",
  },
  {
    value: "show-eligible",
    label: "Mature/Display (Show-Eligible)",
    shortLabel: "Show-Eligible",
    badgeClasses:
      "bg-purple-600 text-white border border-purple-700",
    dotClasses: "bg-purple-500",
  },
];

export const DEFAULT_STAGE_VALUE = DEVELOPMENT_STAGE_OPTIONS[0].value;

export const getStageMeta = (stageValue) => {
  if (!stageValue) {
    return DEVELOPMENT_STAGE_OPTIONS[0];
  }

  const normalizedValue = stageValue.toLowerCase();

  return (
    DEVELOPMENT_STAGE_OPTIONS.find(
      (option) =>
        option.value === normalizedValue ||
        option.label.toLowerCase() === normalizedValue
    ) || DEVELOPMENT_STAGE_OPTIONS[0]
  );
};
