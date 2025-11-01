import React from "react";
import { Loader2 } from "lucide-react";

const ExportProgressOverlay = ({
  open,
  title = "Preparing export",
  description = "We're packaging your data. This may take a few moments.",
  subtext = "The download will start automatically when it's ready.",
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        {subtext && (
          <p className="mt-4 text-xs uppercase tracking-wide text-gray-400">{subtext}</p>
        )}
      </div>
    </div>
  );
};

export default ExportProgressOverlay;
