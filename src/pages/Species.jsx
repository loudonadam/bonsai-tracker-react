import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Plus, BookOpen, Trees, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkSimpleGfmTables from "../utils/remarkSimpleGfmTables";
import MarkdownReadmeEditor from "../components/MarkdownReadmeEditor";
import { SPECIES_CARE_TEMPLATE } from "../constants/careTemplates";
import { useSpecies } from "../context/SpeciesContext";

// ─── ExpandableNote component ───────────────────────────────────
// Displays a markdown block that collapses to `collapsedHeight` px
// and animates to full height when expanded. Uses measured scrollHeight
// to animate reliably (no Tailwind class trickery required).
const ExpandableNote = ({ content, collapsedHeight = 200 }) => {
  const contentRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // measure content height after render
    const measure = () => {
      const h = el.scrollHeight;
      setContentHeight(h);
      setIsOverflowing(h > collapsedHeight + 8); // small slack
    };

    // measure immediately and also after images/fonts load (if any)
    measure();

    // listen for window resize in case layout changes
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [content, collapsedHeight]);

  // compute inline style for animated maxHeight
  const style = {
    maxHeight: expanded ? `${contentHeight}px` : `${collapsedHeight}px`,
    overflow: "hidden",
    transition: "max-height 300ms ease",
  };

  return (
    <div className="relative">
      <div style={style} aria-expanded={expanded}>
        <div ref={contentRef} className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-green-700 prose-li:marker:text-green-600">
          <ReactMarkdown remarkPlugins={[remarkSimpleGfmTables]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* gradient fade when collapsed and overflowing */}
      {!expanded && isOverflowing && (
        <div
          className="pointer-events-none absolute left-0 right-0 bottom-0 h-16"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 80%)",
          }}
        />
      )}

      {/* Toggle */}
      {isOverflowing && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setExpanded((s) => !s)}
            className="text-sm text-green-700 hover:text-green-800 font-medium focus:outline-none transition"
          >
            {expanded ? "Collapse ▲" : "Read More ▼"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Species page ─────────────────────────────────────────────
const Species = () => {
  const navigate = useNavigate();
  const { species: speciesList, updateSpecies, addSpecies } = useSpecies();
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

  const handleEdit = (species) => {
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

  const handleCancel = () => {
    setEditingId(null);
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
            {speciesList.map((species) => (
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
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {species.commonName}
                        </h2>
                        <p className="text-sm italic text-gray-600">
                          {species.scientificName}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEdit(species)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit species"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Trees className="w-4 h-4 text-green-600" />
                      {species.treeCount} tree{species.treeCount !== 1 && "s"}
                    </div>

                    <div className="border-t border-gray-200 pt-3 text-sm text-gray-700">
                      {/* Expandable note (collapsible preview + full view) */}
                      <ExpandableNote content={species.notes || "_No notes added yet._"} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Species;