import React, { useMemo, useRef, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Ruler,
  Edit,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  Trash2,
  Download,
  Bell,
  CheckCircle,
  ImagePlus,
} from 'lucide-react';
import {
  appendReminderToStorage,
  loadStoredReminders,
  removeReminderFromStorage,
} from '../utils/reminderStorage';

// Try importing Recharts safely
let RechartsAvailable = true;
let LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer;
try {
  ({
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } = await import("recharts"));
} catch (err) {
  RechartsAvailable = false;
}

const mockTreeData = {
  id: 1,
  name: "Autumn Flame",
  species: "Japanese Maple (Acer palmatum)",
  acquisitionDate: "2018-04-20",
  currentGirth: 15.3,
  notes: "Beautiful red leaves in fall. Received as a gift from sensei. Responds well to pruning. Prefers partial shade in summer.",
  developmentStage: "Refinement",
  photos: [
    { id: 1, url: null, date: "2024-12-01", description: "Winter structure visible" },
    { id: 2, url: null, date: "2024-09-15", description: "Full autumn color display" },
    { id: 3, url: null, date: "2024-06-20", description: "After repotting - healthy growth" },
    { id: 4, url: null, date: "2024-03-10", description: "Spring buds emerging" }
  ],
  updates: [
    { id: 1, date: "2024-12-01", workPerformed: "Light pruning of crossing branches. Removed wire from trunk.", girth: 15.3 },
    { id: 2, date: "2024-09-15", workPerformed: "Stopped fertilizing for fall color development.", girth: 15.1 },
    { id: 3, date: "2024-06-20", workPerformed: "Repotted into larger pot. Root pruning performed.", girth: 14.8 },
    { id: 4, date: "2024-03-10", workPerformed: "First pruning of the season. Wired two main branches for movement.", girth: 14.5 }
  ],
  reminders: [],
};

const initialUpdateState = {
  date: "",
  girth: "",
  workPerformed: "",
  addReminder: false,
  reminderMessage: "",
  reminderDueDate: "",
  photoFile: null,
  photoPreview: null,
};

const TreeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tree, setTree] = useState(mockTreeData);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const [accolades, setAccolades] = useState([]);
  const [showAccoladeModal, setShowAccoladeModal] = useState(false);
  const [newAccolade, setNewAccolade] = useState({ title: "", photoId: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    date: "",
    girth: "",
    workPerformed: "",
  });
  const [editData, setEditData] = useState({
    name: mockTreeData.name,
    species: mockTreeData.species,
    acquisitionDate: mockTreeData.acquisitionDate,
    currentGirth: mockTreeData.currentGirth.toString(),
    developmentStage: mockTreeData.developmentStage,
    notes: mockTreeData.notes,
  });

  const openEditModal = () => {
    setEditData({
      name: tree.name,
      species: tree.species,
      acquisitionDate: tree.acquisitionDate,
      currentGirth: tree.currentGirth?.toString() ?? "",
      developmentStage: tree.developmentStage ?? "",
      notes: tree.notes ?? "",
    });
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    setTree((prev) => ({
      ...prev,
      name: editData.name.trim() || prev.name,
      species: editData.species.trim() || prev.species,
      acquisitionDate: editData.acquisitionDate || prev.acquisitionDate,
      currentGirth:
        editData.currentGirth.trim() !== "" && !Number.isNaN(Number(editData.currentGirth))
          ? Number(editData.currentGirth)
          : prev.currentGirth,
      developmentStage: editData.developmentStage.trim() || prev.developmentStage,
      notes: editData.notes,
    }));
    setShowEditModal(false);
  };

  const calculateAge = (dateString) => {
    const start = new Date(dateString);
    const now = new Date();
    const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
    return years.toFixed(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const nextPhoto = () =>
    setCurrentPhotoIndex((prev) => (prev === tree.photos.length - 1 ? 0 : prev + 1));
  const prevPhoto = () =>
    setCurrentPhotoIndex((prev) => (prev === 0 ? tree.photos.length - 1 : prev - 1));

  const handleExportTree = () => {
    const data = JSON.stringify(tree, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const sanitizedName = tree.name ? tree.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'tree';
    anchor.download = `${sanitizedName || 'tree'}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const openAddUpdateModal = () => {
    setNewUpdate({ date: "", girth: "", workPerformed: "" });
    setShowUpdateModal(true);
  };

  const handleSaveUpdate = () => {
    if (!newUpdate.date || !newUpdate.workPerformed.trim()) {
      return;
    }

    if (
      newUpdate.addReminder &&
      (!newUpdate.reminderMessage.trim() || !newUpdate.reminderDueDate)
    ) {
      alert('Please provide a reminder message and due date.');
      return;
    }

    const timestamp = Date.now();

    setTree((prev) => ({
      ...prev,
      updates: [
        {
          id: Date.now(),
          date: newUpdate.date,
          girth:
            newUpdate.girth.trim() !== "" && !Number.isNaN(Number(newUpdate.girth))
              ? Number(newUpdate.girth)
              : prev.updates[0]?.girth ?? prev.currentGirth,
          workPerformed: newUpdate.workPerformed.trim(),
        },
        ...prev.updates,
      ],
    }));

    setNewUpdate({ date: "", girth: "", workPerformed: "" });
    setShowUpdateModal(false);
  };

  // ─── Tabs ────────────────────────────────────────────────
  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Notes</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{tree.notes}</p>
      </div>
    </div>
  );

  const PhotosTab = () => (
    <div className="space-y-6">
      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
        {tree.photos[currentPhotoIndex].url ? (
          <img
            src={tree.photos[currentPhotoIndex].url}
            alt={tree.photos[currentPhotoIndex].description}
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => setFullscreenPhoto(tree.photos[currentPhotoIndex])}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={() => setFullscreenPhoto(tree.photos[currentPhotoIndex])}
          >
            <Camera className="w-24 h-24 text-gray-400" />
          </div>
        )}

        <button
          onClick={prevPhoto}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextPhoto}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="text-white text-sm">
            <p className="opacity-80">{formatDate(tree.photos[currentPhotoIndex].date)}</p>
            <p>{tree.photos[currentPhotoIndex].description}</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-visible flex gap-3 pb-3 pt-3 z-0">
        {tree.photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setCurrentPhotoIndex(index)}
            className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 ${index === currentPhotoIndex
                ? 'border-green-600 scale-110 -translate-y-1 shadow-lg z-20'
                : 'border-gray-300 hover:border-gray-400'
              }`}
          >
            {photo.url ? (
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </button>
        ))}
        <button className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-600 flex items-center justify-center transition">
          <Plus className="w-8 h-8 text-gray-400" />
        </button>
      </div>
    </div>
  );

  const UpdatesTab = () => (
    <div className="space-y-4">
      <button
        onClick={openAddUpdateModal}
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add New Update
      </button>

      <div className="space-y-4">
        {tree.updates.map((update) => (
          <div key={update.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow transition">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(update.date)}
                </div>
                {typeof update.girth === 'number' && (
                  <div className="flex items-center gap-2 mt-1">
                    <Ruler className="w-4 h-4" />
                    <span>{update.girth} cm</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => openEditUpdateModal(update)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-700">{update.workPerformed}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-3 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Collection</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportTree}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Tree
            </button>
            <button
              onClick={openEditModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Tree
            </button>
          </div>
        </div>
        <div className="h-1 bg-green-600"></div>
      </header>

      <main className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_350px] lg:px-10">
        <div>
          <div className="relative bg-green-50 rounded-lg shadow-sm p-6 mb-6 border border-green-100">
            {/* Development Stage Badge */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-700 border border-green-200">
                {tree.developmentStage}
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{tree.name}</h1>
              <p className="text-lg text-gray-600 italic">{tree.species}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">
                    {calculateAge(tree.acquisitionDate)} years old
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{tree.currentGirth} cm girth</span>
                </div>
              </div>
            </div>
          </div>


          <div className="relative">
            <div className="flex flex-wrap gap-x-2 mb-[-1px]">
              {['overview', 'photos', 'updates'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium capitalize rounded-t-xl transition-all border ${activeTab === tab
                      ? 'bg-white border-b-transparent border-gray-200 shadow-sm text-green-600'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 p-6">
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'photos' && <PhotosTab />}
              {activeTab === 'updates' && <UpdatesTab />}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Photos:</span>
                <span>{tree.photos.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Updates:</span>
                <span>{tree.updates.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span>{formatDate(tree.updates[0].date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Growth:</span>
                <span className="text-green-600">
                  +{(tree.currentGirth - tree.updates[tree.updates.length - 1].girth).toFixed(1)} cm
                </span>
              </div>
            </div>
          </div>

          {/* Accolades */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Accolades</h3>
              <button
                onClick={() => {
                  setNewAccolade({ title: "", photoId: "" });
                  setShowAccoladeModal(true);
                }}
                className="text-gray-400 hover:text-green-600 transition flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {accolades.length > 0 ? (
              <ul className="space-y-3 text-sm text-gray-700">
                {accolades.map((accolade, idx) => {
                  const linkedPhoto = accolade.photoId
                    ? tree.photos.find((photo) => String(photo.id) === String(accolade.photoId))
                    : null;

                  return (
                    <li
                      key={idx}
                      className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                        {linkedPhoto ? (
                          linkedPhoto.url ? (
                            <img
                              src={linkedPhoto.url}
                              alt={linkedPhoto.description || 'Linked accolade photo'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Camera className="h-6 w-6 text-gray-400" />
                          )
                        ) : (
                          <Camera className="h-6 w-6 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{accolade.title}</p>
                        <p className="text-xs text-gray-500">
                          {linkedPhoto
                            ? `${formatDate(linkedPhoto.date)}${
                                linkedPhoto.description ? ` • ${linkedPhoto.description}` : ''
                              }`
                            : 'No photo linked'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setAccolades((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-gray-400 transition hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">No accolades yet</p>
            )}
          </div>
        </aside>
      </main>

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 relative space-y-4">
            <button
              onClick={() => {
                resetUpdateForm();
                setShowUpdateModal(false);
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800">
              {editingUpdateId ? 'Edit Tree Update' : 'Add Tree Update'}
            </h3>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Date
              <input
                type="date"
                value={newUpdate.date}
                onChange={(e) => setNewUpdate((prev) => ({ ...prev, date: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Girth (cm)
              <input
                type="number"
                min="0"
                step="0.1"
                value={newUpdate.girth}
                onChange={(e) => setNewUpdate((prev) => ({ ...prev, girth: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                placeholder="Optional"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Work Performed
              <textarea
                value={newUpdate.workPerformed}
                onChange={(e) => setNewUpdate((prev) => ({ ...prev, workPerformed: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent min-h-[120px]"
                placeholder="Describe the work that was completed"
              />
            </label>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Add follow-up reminder</p>
                <p className="text-xs text-gray-500">
                  Capture a reminder that will appear on your home dashboard.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={newUpdate.addReminder}
                  onChange={(e) =>
                    setNewUpdate((prev) => ({
                      ...prev,
                      addReminder: e.target.checked,
                      reminderMessage: e.target.checked ? prev.reminderMessage : "",
                      reminderDueDate: e.target.checked ? prev.reminderDueDate : "",
                    }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-5 w-10 rounded-full bg-gray-300 transition peer-checked:bg-green-500"></div>
                <div className="absolute left-0 top-0 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></div>
              </label>
            </div>

            {newUpdate.addReminder && (
              <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Reminder Message
                  <input
                    type="text"
                    value={newUpdate.reminderMessage}
                    onChange={(e) =>
                      setNewUpdate((prev) => ({
                        ...prev,
                        reminderMessage: e.target.value,
                      }))
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="e.g. Check wiring tension"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Reminder Due Date
                  <input
                    type="date"
                    value={newUpdate.reminderDueDate}
                    onChange={(e) =>
                      setNewUpdate((prev) => ({
                        ...prev,
                        reminderDueDate: e.target.value,
                      }))
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </label>
              </div>
            )}

            <div className="grid gap-2">
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <ImagePlus className="h-4 w-4" />
                  Attach Photo (optional)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpdatePhotoChange}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-green-700"
                />
              </label>
              {newUpdate.photoPreview && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={newUpdate.photoPreview}
                    alt="Preview of uploaded update"
                    className="h-40 w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  resetUpdateForm();
                  setShowUpdateModal(false);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUpdate}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
              >
                {editingUpdateId ? 'Save Changes' : 'Save Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Accolade Modal */}
      {showAccoladeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative space-y-4">
            <button
              onClick={() => setShowAccoladeModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800">Add Accolade</h3>

            <div className="space-y-4">
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Accolade Title
                <input
                  type="text"
                  value={newAccolade.title}
                  onChange={(e) =>
                    setNewAccolade((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Best in Show - 2025 TBS Fall Expo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Link Photo (optional)
                <select
                  value={newAccolade.photoId}
                  onChange={(e) =>
                    setNewAccolade((prev) => ({ ...prev, photoId: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                >
                  <option value="">No photo</option>
                  {tree.photos.map((photo) => (
                    <option key={photo.id} value={String(photo.id)}>
                      {photo.description || `Photo from ${formatDate(photo.date)}`}
                    </option>
                  ))}
                </select>
              </label>

              {selectedAccoladePhoto && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-white">
                    {selectedAccoladePhoto.url ? (
                      <img
                        src={selectedAccoladePhoto.url}
                        alt={selectedAccoladePhoto.description || 'Selected accolade photo'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera className="h-7 w-7 text-gray-400" />
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">
                      {selectedAccoladePhoto.description || 'Tree photo'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(selectedAccoladePhoto.date)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAccoladeModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newAccolade.title.trim()) {
                    setAccolades((prev) => [
                      ...prev,
                      {
                        title: newAccolade.title.trim(),
                        photoId: newAccolade.photoId ? String(newAccolade.photoId) : null,
                      },
                    ]);
                    setNewAccolade({ title: "", photoId: "" });
                    setShowAccoladeModal(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:cursor-not-allowed disabled:bg-green-300"
                disabled={!newAccolade.title.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-xl w-full p-6 relative space-y-4">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800">Edit Tree Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Tree Name
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Species
                <input
                  type="text"
                  value={editData.species}
                  onChange={(e) => setEditData((prev) => ({ ...prev, species: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Date Acquired
                <input
                  type="date"
                  value={editData.acquisitionDate}
                  onChange={(e) => setEditData((prev) => ({ ...prev, acquisitionDate: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Current Girth (cm)
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editData.currentGirth}
                  onChange={(e) => setEditData((prev) => ({ ...prev, currentGirth: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1 sm:col-span-2">
                Development Stage
                <input
                  type="text"
                  value={editData.developmentStage}
                  onChange={(e) => setEditData((prev) => ({ ...prev, developmentStage: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1 sm:col-span-2">
                Notes
                <textarea
                  rows={4}
                  value={editData.notes}
                  onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeDetail;
