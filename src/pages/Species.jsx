import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Plus,
  BookOpen,
  Trees,
  X,
  ChevronDown,
  ChevronUp,
  Trash,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkSimpleGfmTables from "../utils/remarkSimpleGfmTables";
import markdownComponents from "../utils/markdownComponents";
import MarkdownReadmeEditor from "../components/MarkdownReadmeEditor";
import { SPECIES_CARE_TEMPLATE } from "../constants/careTemplates";
import { useSpecies } from "../context/SpeciesContext";

// ─── Species page ─────────────────────────────────────────────
const Species = () => {
  const navigate = useNavigate();
  const { species: speciesList, updateSpecies, addSpecies, deleteSpecies } = useSpecies();
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    commonName: "",
    scientificName: "",
    notes: "",
  });
  const initialAddForm = useRef({
    commonName: "",
    scientificName: "",
    notes: SPECIES_CARE_TEMPLATE,
  }).current;
  const [isAddingSpecies, setIsAddingSpecies] = useState(false);
  const [newSpeciesData, setNewSpeciesData] = useState(initialAddForm);
  const [addSpeciesError, setAddSpeciesError] = useState("");
  const [isSavingNewSpecies, setIsSavingNewSpecies] = useState(false);
  const [expandedSpeciesId, setExpandedSpeciesId] = useState(null);
  const [deletingSpeciesId, setDeletingSpeciesId] = useState(null);
  const [deleteErrors, setDeleteErrors] = useState({});

  const handleEdit = (species) => {
    setEditingId(species.id);
    setExpandedSpeciesId(species.id);
    setFormData({
      commonName: species.commonName,
      scientificName: species.scientificName,
      notes: species.notes,
    });
  };

  const handleSave = () => {
    updateSpecies(editingId, {
      commonName: formData.commonName.trim(),
      scientificName: formData.scientificName.trim(),
      notes: formData.notes,
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setExpandedSpeciesId(null);
  };

  const handleDeleteSpecies = async (species) => {
    const confirmed = window.confirm(
      `Delete ${species.commonName || "this species"}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingSpeciesId(species.id);
    setDeleteErrors((prev) => ({ ...prev, [species.id]: "" }));

    try {
      await deleteSpecies(species.id);
      if (editingId === species.id) {
        setEditingId(null);
      }
      if (expandedSpeciesId === species.id) {
        setExpandedSpeciesId(null);
      }
    } catch (error) {
      setDeleteErrors((prev) => ({
        ...prev,
        [species.id]: error.message || "Failed to delete species. Please try again.",
      }));
    } finally {
      setDeletingSpeciesId(null);
    }
  };

  const openAddSpeciesForm = () => {
    setNewSpeciesData({ ...initialAddForm });
    setAddSpeciesError("");
    setIsAddingSpecies(true);
  };

  const cancelAddSpecies = () => {
    setIsAddingSpecies(false);
    setAddSpeciesError("");
    setNewSpeciesData({ ...initialAddForm });
  };

  const handleAddSpecies = async () => {
    const trimmedCommonName = newSpeciesData.commonName.trim();
    if (!trimmedCommonName) {
      setAddSpeciesError("Please provide a common name for the species.");
      return;
    }

    setIsSavingNewSpecies(true);
    setAddSpeciesError("");
    try {
      await addSpecies({
        commonName: trimmedCommonName,
        scientificName: newSpeciesData.scientificName.trim(),
        notes: newSpeciesData.notes,
      });
      setIsAddingSpecies(false);
      setNewSpeciesData({ ...initialAddForm });
    } catch (error) {
      setAddSpeciesError(error.message || "Failed to add species. Please try again.");
    } finally {
      setIsSavingNewSpecies(false);
    }
  };

  return (
    // 🎨 COLOR: Background
    <div className="min-h-screen bg-gray-50">
      {/* 🎨 COLOR: Header background */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-3 flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Collection</span>
          </button>
          <button
            onClick={isAddingSpecies ? cancelAddSpecies : openAddSpeciesForm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            {isAddingSpecies ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAddingSpecies ? "Cancel" : "Add Species"}
          </button>
        </div>
        {/* 🎨 COLOR: Accent strip */}
        <div className="h-1 bg-green-600"></div>
      </header>

      <main className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-8">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-green-600" />
            Species Library
          </h1>

          {/* Species Grid (2 columns on >= small screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {isAddingSpecies && (
              <div className="bg-white rounded-lg shadow-sm border border-dashed border-green-300 p-6 flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Add New Species</h2>
                {addSpeciesError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {addSpeciesError}
                  </p>
                )}
                <input
                  type="text"
                  value={newSpeciesData.commonName}
                  onChange={(event) =>
                    setNewSpeciesData((prev) => ({
                      ...prev,
                      commonName: event.target.value,
                    }))
                  }
                  placeholder="Common Name *"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={newSpeciesData.scientificName}
                  onChange={(event) =>
                    setNewSpeciesData((prev) => ({
                      ...prev,
                      scientificName: event.target.value,
                    }))
                  }
                  placeholder="Scientific Name"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm italic"
                />
                <MarkdownReadmeEditor
                  value={newSpeciesData.notes}
                  onChange={(value) =>
                    setNewSpeciesData((prev) => ({
                      ...prev,
                      notes: value,
                    }))
                  }
                  rows={10}
                  placeholder="Document species care requirements using Markdown headings, lists, and tables."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelAddSpecies}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSpecies}
                    disabled={isSavingNewSpecies}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                  >
                    {isSavingNewSpecies ? "Saving..." : "Save Species"}
                  </button>
                </div>
              </div>
            )}
            {speciesList.map((species) => {
              const isExpanded = expandedSpeciesId === species.id;

              return (
                <div
                  key={species.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow transition"
                >
                {editingId === species.id ? (
                  // Edit Mode
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={formData.commonName}
                      onChange={(e) =>
                        setFormData({ ...formData, commonName: e.target.value })
                      }
                      placeholder="Common Name"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={formData.scientificName}
                      onChange={(e) =>
                        setFormData({ ...formData, scientificName: e.target.value })
                      }
                      placeholder="Scientific Name"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm italic"
                    />
                    <MarkdownReadmeEditor
                      value={formData.notes}
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, notes: value }))
                      }
                      rows={12}
                      placeholder="Update the species care README with Markdown headings, lists, and tables."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {species.commonName}
                        </h2>
                        <p className="text-sm italic text-gray-600">
                          {species.scientificName}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedSpeciesId((current) =>
                            current === species.id ? null : species.id
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                      >
                        {isExpanded ? (
                          <>
                            Collapse
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Expand
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                      <Trees className="w-4 h-4 text-green-600" />
                      {species.treeCount} tree{species.treeCount !== 1 && "s"}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          {deleteErrors[species.id] && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              {deleteErrors[species.id]}
                            </p>
                          )}
                          <div className="flex justify-end gap-2 sm:ml-auto">
                            <button
                              onClick={() => handleDeleteSpecies(species)}
                              disabled={deletingSpeciesId === species.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <Trash className="w-4 h-4" />
                              {deletingSpeciesId === species.id ? "Deleting..." : "Delete"}
                            </button>
                            <button
                              onClick={() => handleEdit(species)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Species
                            </button>
                          </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                          {species.notes?.trim() ? (
                            <div className="markdown-body prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-green-700 prose-li:marker:text-green-600">
                              <ReactMarkdown
                                remarkPlugins={[remarkSimpleGfmTables]}
                                components={markdownComponents}
                              >
                                {species.notes}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="italic text-gray-500">
                              No notes added yet. Expand to add guidance with the Edit button above.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Species;