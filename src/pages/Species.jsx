import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Plus, BookOpen, Trees, X, Trash } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkSimpleGfmTables from "../utils/remarkSimpleGfmTables";
import markdownComponents from "../utils/markdownComponents";
import MarkdownReadmeEditor from "../components/MarkdownReadmeEditor";
import ConfirmDialog from "../components/ConfirmDialog";
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
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const [deletingSpeciesId, setDeletingSpeciesId] = useState(null);
  const [deleteErrors, setDeleteErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, species: null });

  const selectedSpecies = useMemo(
    () =>
      selectedSpeciesId
        ? speciesList.find((species) => species.id === selectedSpeciesId) ?? null
        : null,
    [selectedSpeciesId, speciesList]
  );

  const handleEdit = (species) => {
    if (!species) {
      return;
    }

    setSelectedSpeciesId(species.id);
    setEditingId(species.id);
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

  const handleCancelEdit = () => {
    if (selectedSpecies) {
      setFormData({
        commonName: selectedSpecies.commonName,
        scientificName: selectedSpecies.scientificName,
        notes: selectedSpecies.notes,
      });
    }
    setEditingId(null);
  };

  const handleDeleteSpecies = async (species) => {
    if (!species) {
      return;
    }

    setDeletingSpeciesId(species.id);
    setDeleteErrors((prev) => ({ ...prev, [species.id]: "" }));

    try {
      await deleteSpecies(species.id);
      if (editingId === species.id) {
        setEditingId(null);
      }
      if (selectedSpeciesId === species.id) {
        setSelectedSpeciesId(null);
      }
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[species.id];
        return next;
      });
      setDeleteConfirm({ open: false, species: null });
    } catch (error) {
      setDeleteErrors((prev) => ({
        ...prev,
        [species.id]: error.message || "Failed to delete species. Please try again.",
      }));
    } finally {
      setDeletingSpeciesId(null);
    }
  };

  const requestDeleteSpecies = (species) => {
    if (!species) {
      return;
    }
    setDeleteErrors((prev) => ({ ...prev, [species.id]: "" }));
    setDeleteConfirm({ open: true, species });
  };

  const cancelDeleteSpecies = () => {
    setDeleteConfirm((prev) => {
      if (prev.species) {
        setDeleteErrors((errors) => {
          const next = { ...errors };
          delete next[prev.species.id];
          return next;
        });
      }
      return { open: false, species: null };
    });
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

  const handleOpenSpecies = (species) => {
    setSelectedSpeciesId(species.id);
    setEditingId(null);
    setFormData({
      commonName: species.commonName,
      scientificName: species.scientificName,
      notes: species.notes,
    });
  };

  const handleCloseModal = () => {
    setSelectedSpeciesId(null);
    setEditingId(null);
    setFormData({
      commonName: "",
      scientificName: "",
      notes: "",
    });
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
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Common Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSpeciesData.commonName}
                    onChange={(event) =>
                      setNewSpeciesData((prev) => ({
                        ...prev,
                        commonName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Chinese Elm"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Scientific Name</label>
                  <input
                    type="text"
                    value={newSpeciesData.scientificName}
                    onChange={(event) =>
                      setNewSpeciesData((prev) => ({
                        ...prev,
                        scientificName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Ulmus parvifolia"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm italic"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Species Guide</label>
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
                </div>
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
            {speciesList.map((species) => (
              <div
                key={species.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenSpecies(species)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenSpecies(species);
                  }
                }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col gap-4 hover:shadow transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {species.commonName}
                    </h2>
                    <p className="text-sm italic text-gray-600">
                      {species.scientificName}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    View Details
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Trees className="w-4 h-4 text-green-600" />
                  {species.treeCount} tree{species.treeCount !== 1 && "s"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {selectedSpecies && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="relative flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {selectedSpecies.commonName}
                </h2>
                <p className="text-sm italic text-gray-600">
                  {selectedSpecies.scientificName}
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <Trees className="w-4 h-4 text-green-600" />
                  {selectedSpecies.treeCount} tree{selectedSpecies.treeCount !== 1 && "s"}
                </div>
                {deleteErrors[selectedSpecies.id] && (
                  <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {deleteErrors[selectedSpecies.id]}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleCloseModal}
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-100"
                  aria-label="Close species details"
                >
                  <X className="w-5 h-5" />
                </button>
                {editingId !== selectedSpecies.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => requestDeleteSpecies(selectedSpecies)}
                      disabled={deletingSpeciesId === selectedSpecies.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Trash className="w-4 h-4" />
                      {deletingSpeciesId === selectedSpecies.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      onClick={() => handleEdit(selectedSpecies)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Species
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {editingId === selectedSpecies.id ? (
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700" htmlFor="edit-common-name">
                        Common Name
                      </label>
                      <input
                        id="edit-common-name"
                        type="text"
                        value={formData.commonName}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            commonName: event.target.value,
                          }))
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700" htmlFor="edit-scientific-name">
                        Scientific Name
                      </label>
                      <input
                        id="edit-scientific-name"
                        type="text"
                        value={formData.scientificName}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            scientificName: event.target.value,
                          }))
                        }
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm italic"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700" htmlFor="edit-notes">
                      Species Guide
                    </label>
                    <MarkdownReadmeEditor
                      id="edit-notes"
                      value={formData.notes}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: value,
                        }))
                      }
                      rows={16}
                      placeholder="Update the species care README with Markdown headings, lists, and tables."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
                  {selectedSpecies.notes?.trim() ? (
                    <div className="markdown-body prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-green-700 prose-li:marker:text-green-600">
                      <ReactMarkdown
                        remarkPlugins={[remarkSimpleGfmTables]}
                        components={markdownComponents}
                      >
                        {selectedSpecies.notes}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="italic text-gray-500">
                      No notes added yet. Use the Edit button to add guidance.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete species"
        description={
          deleteConfirm.species
            ? `Are you sure you want to remove ${deleteConfirm.species.commonName || "this species"}? This action cannot be undone.`
            : "Are you sure you want to remove this species? This action cannot be undone."
        }
        confirmLabel="Delete species"
        cancelLabel="Keep species"
        destructive
        isLoading={
          deleteConfirm.species &&
          deletingSpeciesId === deleteConfirm.species.id
        }
        error={
          deleteConfirm.species
            ? deleteErrors[deleteConfirm.species.id]
            : ""
        }
        onCancel={cancelDeleteSpecies}
        onConfirm={() => handleDeleteSpecies(deleteConfirm.species)}
      />
    </div>
  );
};

export default Species;
