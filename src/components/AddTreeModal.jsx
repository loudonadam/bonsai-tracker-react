import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  DEVELOPMENT_STAGE_OPTIONS,
  DEFAULT_STAGE_VALUE,
} from "../utils/developmentStages";

const AddTreeModal = ({ show, onClose, onSave }) => {
  const [newTree, setNewTree] = useState({
    name: "",
    species: "",
    acquisitionDate: "",
    originDate: "",
    trunkWidth: "",
    notes: "",
    photo: null,
    developmentStage: DEFAULT_STAGE_VALUE,
  });

  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show) {
      setNewTree({
        name: "",
        species: "",
        acquisitionDate: "",
        originDate: "",
        trunkWidth: "",
        notes: "",
        photo: null,
        developmentStage: DEFAULT_STAGE_VALUE,
      });
      setPreview(null);
      setError("");
    }
  }, [show]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewTree({ ...newTree, photo: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = () => {
    const { name, species, acquisitionDate, originDate } = newTree;
    if (!name || !species || !acquisitionDate || !originDate) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    onSave({
      ...newTree,
      id: Date.now(),
      currentGirth: 0,
      lastUpdate: newTree.acquisitionDate,
      developmentStage: newTree.developmentStage,
    });
  };

  if (!show) return null;

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
          {/* Tree Name */}
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

          {/* Species */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Species *
            </label>
            <input
              type="text"
              value={newTree.species}
              onChange={(e) =>
                setNewTree({ ...newTree, species: e.target.value })
              }
              placeholder="e.g. Chinese Elm (Ulmus parvifolia)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Date Acquired */}
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

          {/* Estimated Origin Date */}
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

          {/* Trunk Width */}
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

          {/* Development Stage */}
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-gray-700"
            >
              {DEVELOPMENT_STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={newTree.notes}
              onChange={(e) =>
                setNewTree({ ...newTree, notes: e.target.value })
              }
              placeholder="Optional notes about this tree"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
            />
          </div>

          {/* Photo Upload */}
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
        <p className="text-sm font-medium">Click or drag photo to upload</p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, up to 5MB</p>
      </>
    )}
  </div>

  <input
    type="file"
    id="photo-upload"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files[0];
      if (file) {
        setNewTree({ ...newTree, photo: file });
        setPreview(URL.createObjectURL(file));
      }
    }}
    className="hidden"
  />
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
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
          >
            Add Tree
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTreeModal;
