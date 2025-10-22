import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  DEVELOPMENT_STAGE_OPTIONS,
  DEFAULT_STAGE_VALUE,
} from "../utils/developmentStages";
import { useSpecies } from "../context/SpeciesContext";

const initialTreeState = {
  name: "",
  acquisitionDate: "",
  originDate: "",
  trunkWidth: "",
  notes: "",
  photo: null,
  developmentStage: DEFAULT_STAGE_VALUE,
};

const AddTreeModal = ({ show, onClose, onSave }) => {
  const [newTree, setNewTree] = useState(initialTreeState);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { species: speciesList, addSpecies, incrementTreeCount } = useSpecies();
  const [speciesMode, setSpeciesMode] = useState(
    speciesList.length > 0 ? "existing" : "new"
  );
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(
    speciesList.length > 0 ? String(speciesList[0].id) : ""
  );
  const [newSpecies, setNewSpecies] = useState({
    commonName: "",
    scientificName: "",
    notes: "",
  });

  const formatSpeciesLabel = (species) => {
    if (!species) return "";
    return species.scientificName
      ? `${species.commonName} (${species.scientificName})`
      : species.commonName;
  };

  useEffect(() => {
    if (!show) {
      setNewTree(initialTreeState);
      setPreview(null);
      setError("");
      setIsSubmitting(false);
      setNewSpecies({ commonName: "", scientificName: "", notes: "" });
      if (speciesList.length === 0) {
        setSpeciesMode("new");
        setSelectedSpeciesId("");
      } else {
        setSpeciesMode("existing");
        setSelectedSpeciesId(String(speciesList[0].id));
      }
    }
  }, [show, speciesList]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const { name, acquisitionDate, originDate, developmentStage } = newTree;
    if (!name || !acquisitionDate || !originDate) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let speciesId = null;
      let speciesLabel = "";

      if (speciesMode === "existing") {
        if (!selectedSpeciesId) {
          throw new Error("Please choose a species from your library.");
        }
        const selected = speciesList.find(
          (item) => String(item.id) === String(selectedSpeciesId)
        );
        if (!selected) {
          throw new Error("Please choose a species from your library.");
        }
        speciesId = selected.id;
        speciesLabel = formatSpeciesLabel(selected);
      } else {
        if (!newSpecies.commonName.trim()) {
          throw new Error("Please provide a common name for the new species.");
        }
        const created = await addSpecies({
          commonName: newSpecies.commonName,
          scientificName: newSpecies.scientificName,
          notes: newSpecies.notes,
          treeCount: 1,
        });
        speciesId = created.id;
        speciesLabel = formatSpeciesLabel(created);
      }

      const payload = {
        name: name.trim(),
        acquisitionDate,
        originDate,
        developmentStage,
        notes: newTree.notes,
        speciesId,
        currentGirth: newTree.trunkWidth
          ? parseFloat(newTree.trunkWidth)
          : undefined,
        trunkWidth: newTree.trunkWidth
          ? parseFloat(newTree.trunkWidth)
          : undefined,
        initialPhoto: newTree.photo,
        initialPhotoDescription: speciesLabel
          ? `Initial photo for ${speciesLabel}`
          : "Initial photo",
        initialPhotoDate: acquisitionDate,
      };

      await onSave(payload);
      if (speciesMode === "existing" && speciesId) {
        incrementTreeCount(speciesId, 1);
      }
      onClose();
    } catch (err) {
      console.error("Failed to save tree", err);
      setError(err instanceof Error ? err.message : "Failed to save tree");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  const speciesSelectValue =
    speciesMode === "existing" ? selectedSpeciesId : "__new__";
  const selectedSpecies = speciesList.find(
    (item) => String(item.id) === String(selectedSpeciesId)
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Tree</h3>

        {error && (
          <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tree Name *
            </label>
            <input
              type="text"
              value={newTree.name}
              onChange={(e) =>
                setNewTree({ ...newTree, name: e.target.value })
              }
              placeholder="e.g. Serene Elm"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Species *
            </label>
            <div className="space-y-2">
              <select
                value={speciesSelectValue}
                onChange={(event) => {
                  const { value } = event.target;
                  if (value === "__new__") {
                    setSpeciesMode("new");
                    setSelectedSpeciesId("");
                  } else {
                    setSpeciesMode("existing");
                    setSelectedSpeciesId(value);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                {speciesList.length === 0 && (
                  <option value="" disabled>
                    No species yet - add one below
                  </option>
                )}
                {speciesList.map((species) => (
                  <option key={species.id} value={String(species.id)}>
                    {formatSpeciesLabel(species)}
                  </option>
                ))}
                <option value="__new__">➕ Add a new species</option>
              </select>

              {speciesMode === "existing" && selectedSpecies && (
                <p className="text-xs text-gray-500">
                  {selectedSpecies.scientificName
                    ? `Scientific name: ${selectedSpecies.scientificName}`
                    : "Scientific name not recorded yet."}
                </p>
              )}

              {speciesMode === "new" && (
                <div className="space-y-3 rounded-lg border border-dashed border-green-200 bg-green-50/60 p-3">
                  <p className="text-xs text-gray-600">
                    Adding a new species will also save it to your library.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Common Name *
                    </label>
                    <input
                      type="text"
                      value={newSpecies.commonName}
                      onChange={(event) =>
                        setNewSpecies((prev) => ({
                          ...prev,
                          commonName: event.target.value,
                        }))
                      }
                      placeholder="e.g. Chinese Elm"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Scientific Name
                    </label>
                    <input
                      type="text"
                      value={newSpecies.scientificName}
                      onChange={(event) =>
                        setNewSpecies((prev) => ({
                          ...prev,
                          scientificName: event.target.value,
                        }))
                      }
                      placeholder="e.g. Ulmus parvifolia"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      value={newSpecies.notes}
                      onChange={(event) =>
                        setNewSpecies((prev) => ({
                          ...prev,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Optional care notes for this species"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Acquired *
            </label>
            <input
              type="date"
              value={newTree.acquisitionDate}
              onChange={(e) =>
                setNewTree({ ...newTree, acquisitionDate: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Origin Date *
            </label>
            <input
              type="date"
              value={newTree.originDate}
              onChange={(e) =>
                setNewTree({ ...newTree, originDate: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trunk Width (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={newTree.trunkWidth}
              onChange={(e) =>
                setNewTree({ ...newTree, trunkWidth: e.target.value })
              }
              placeholder="e.g. 3.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Development Stage
            </label>
            <select
              value={newTree.developmentStage}
              onChange={(event) =>
                setNewTree({
                  ...newTree,
                  developmentStage: event.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
            >
              {DEVELOPMENT_STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={newTree.notes}
              onChange={(e) => setNewTree({ ...newTree, notes: e.target.value })}
              placeholder="Optional notes about this tree"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Photo
            </label>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 hover:border-green-500 hover:text-green-600 transition cursor-pointer"
              onClick={() => document.getElementById("photo-upload").click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  setNewTree({ ...newTree, photo: file });
                  setPreview(URL.createObjectURL(file));
                }
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="rounded-md border border-gray-200 w-32 h-32 object-cover"
                />
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 mb-2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 7H17a4 4 0 010 8h-1"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 12v9m0 0l-3-3m3 3l3-3"
                    />
                  </svg>
                  <p className="text-xs text-gray-500">
                    Drop a photo here or click to upload
                  </p>
                </>
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setNewTree({ ...newTree, photo: file });
                    setPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? "Saving..." : "Add Tree"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTreeModal;
