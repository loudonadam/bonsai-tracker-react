import React, { useState, useEffect } from "react";
import { X, Star } from "lucide-react";

const AddTreeModal = ({ show, onClose, onSave }) => {
  const [newTree, setNewTree] = useState({
    name: "",
    species: "",
    acquisitionDate: "",
    notes: "",
    starred: false,
  });

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!show) {
      setNewTree({
        name: "",
        species: "",
        acquisitionDate: "",
        notes: "",
        starred: false,
      });
    }
  }, [show]);

  const handleSubmit = () => {
    if (!newTree.name || !newTree.species || !newTree.acquisitionDate) {
      alert("Please fill in all required fields.");
      return;
    }
    onSave({ ...newTree, id: Date.now(), currentGirth: 0, lastUpdate: newTree.acquisitionDate });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Add New Tree
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acquisition Date *
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="starred"
              checked={newTree.starred}
              onChange={(e) =>
                setNewTree({ ...newTree, starred: e.target.checked })
              }
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label
              htmlFor="starred"
              className="text-sm text-gray-700 flex items-center gap-1"
            >
              <Star className="w-4 h-4 text-yellow-500" /> Mark as Starred
            </label>
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
