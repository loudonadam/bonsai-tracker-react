import React from "react";
import { Camera, Calendar, Ruler } from "lucide-react";
import { getStageMeta } from "../utils/developmentStages";

// TreeCard Component - displays a single bonsai tree
const TreeCard = ({
  tree = {
    id: 1,
    name: "Sample Bonsai",
    species: "Japanese Maple",
    acquisitionDate: "2020-03-15",
    currentGirth: 12.5,
    lastUpdate: "2024-12-01",
    photoUrl: null,
    notes: "Beautiful fall colors",
    developmentStage: "pre-bonsai",
  },
}) => {
  // Calculate tree age in years
  const calculateAge = (dateString) => {
    const start = new Date(dateString);
    const now = new Date();
    const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
    return years.toFixed(1);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "No updates yet";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const stageMeta = getStageMeta(tree.developmentStage);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-green-50 to-green-100">
        {tree.photoUrl ? (
          <img
            src={tree.photoUrl}
            alt={tree.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-green-300">
            <Camera className="h-14 w-14" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Tree Name & Species */}
        <div className="mb-3">
          <h3 className="truncate text-lg font-semibold text-gray-800">
            {tree.name}
          </h3>
          <p className="text-sm italic text-gray-500">
            {tree.species || "Unknown species"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="space-y-2 text-sm text-gray-600">
          {/* Age */}
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4 text-green-500" />
            <span>{calculateAge(tree.acquisitionDate)} years old</span>
          </div>

          {/* Girth */}
          {tree.currentGirth && (
            <div className="flex items-center">
              <Ruler className="mr-2 h-4 w-4 text-green-500" />
              <span>{tree.currentGirth} cm girth</span>
            </div>
          )}

          {/* Last Update */}
          <div className="flex items-center text-xs uppercase tracking-wide text-gray-400">
            <div className="mr-2 flex h-4 w-4 items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
            </div>
            <span>Updated {formatDate(tree.lastUpdate)}</span>
          </div>
        </div>

        {/* Notes Preview (if present) */}
        {tree.notes && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="line-clamp-2 text-xs text-gray-500">
              {tree.notes}
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm ${stageMeta.badgeClasses}`}
            title={stageMeta.label}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${stageMeta.dotClasses}`} />
            {stageMeta.shortLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TreeCard;
