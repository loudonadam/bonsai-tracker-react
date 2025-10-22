export const DEVELOPMENT_STAGE_OPTIONS = [
  {
    value: "pre-bonsai",
    label: "Pre-Bonsai",
    shortLabel: "Pre-Bonsai",
    badgeClasses:
      "bg-amber-50 text-amber-700 border border-amber-200",
    dotClasses: "bg-amber-400",
  },
  {
    value: "initial-styling",
    label: "Initial Styling",
    shortLabel: "Initial Styling",
    badgeClasses:
      "bg-green-50 text-green-700 border border-green-200",
    dotClasses: "bg-green-400",
  },
  {
    value: "early-development",
    label: "Early Development",
    shortLabel: "Early Dev.",
    badgeClasses:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dotClasses: "bg-emerald-400",
  },
  {
    value: "refinement",
    label: "Refinement",
    shortLabel: "Refinement",
    badgeClasses:
      "bg-teal-50 text-teal-700 border border-teal-200",
    dotClasses: "bg-teal-400",
  },
  {
    value: "show-eligible",
    label: "Mature",
    shortLabel: "Mature",
    badgeClasses:
      "bg-purple-50 text-purple-700 border border-purple-200",
    dotClasses: "bg-purple-400",
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
