import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  CheckCircle,
  ImagePlus,
  ChevronDown,
  Skull,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  appendReminderToStorage,
  loadStoredReminders,
} from "../utils/reminderStorage";
import {
  DEVELOPMENT_STAGE_OPTIONS,
  DEFAULT_STAGE_VALUE,
  getStageMeta,
} from "../utils/developmentStages";
import { useTrees } from "../context/TreesContext";
import { extractPhotoDate } from "../utils/photoMetadata";
import { useSpecies } from "../context/SpeciesContext";
import ReactMarkdown from "react-markdown";

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
} catch {
  RechartsAvailable = false;
}

const mockTreeData = {
  id: 1,
  name: "Autumn Flame",
  species: "Japanese Maple (Acer palmatum)",
  acquisitionDate: "2018-04-20",
  currentGirth: 15.3,
  notes: "Beautiful red leaves in fall. Received as a gift from sensei. Responds well to pruning. Prefers partial shade in summer.",
  developmentStage: "refinement",
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

const initialAccoladeState = {
  title: "",
  photoId: "",
  uploadPreview: "",
  uploadFile: null,
};

const initialPhotoUploadState = {
  file: null,
  preview: null,
  description: "",
  takenAt: "",
  isPrimary: false,
};

const initialSpeciesFormState = {
  commonName: "",
  scientificName: "",
  notes: "",
};

const TreeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    getTreeById,
    moveTreeToGraveyard,
    refreshTrees,
    fetchTreeById,
    uploadTreePhoto,
    updateTree,
    updateTreePhoto,
    loading: treesLoading,
  } = useTrees();
  const { species: speciesList, addSpecies, refreshSpecies } = useSpecies();
  const numericId = Number(id);
  const treeFromCollection = getTreeById(numericId);
  const [tree, setTree] = useState(treeFromCollection ?? mockTreeData);
  const [detailLoading, setDetailLoading] = useState(!treeFromCollection);
  const [detailError, setDetailError] = useState("");
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const [accolades, setAccolades] = useState([]);
  const [showAccoladeModal, setShowAccoladeModal] = useState(false);
  const [newAccolade, setNewAccolade] = useState(initialAccoladeState);
  const [editingAccoladeIndex, setEditingAccoladeIndex] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newUpdate, setNewUpdate] = useState(initialUpdateState);
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [showGraveyardModal, setShowGraveyardModal] = useState(false);
  const [graveyardForm, setGraveyardForm] = useState({
    category: "dead",
    note: "",
  });
  const [isMovingTree, setIsMovingTree] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [editData, setEditData] = useState({
    name: mockTreeData.name,
    acquisitionDate: mockTreeData.acquisitionDate,
    developmentStage: mockTreeData.developmentStage,
    notes: mockTreeData.notes,
  });
  const [editSpeciesMode, setEditSpeciesMode] = useState(
    speciesList.length > 0 ? "existing" : "new"
  );
  const [editSelectedSpeciesId, setEditSelectedSpeciesId] = useState(
    speciesList.length > 0 ? String(speciesList[0].id) : ""
  );
  const [editNewSpecies, setEditNewSpecies] = useState(initialSpeciesFormState);
  const [editModalError, setEditModalError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [, setReminders] = useState(() => loadStoredReminders());
  const fileInputRef = useRef(null);
  const accoladeFileInputRef = useRef(null);
  const photoUploadInputRef = useRef(null);
  const stageMenuRef = useRef(null);
  const notesTextareaRef = useRef(null);
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhoto, setNewPhoto] = useState(initialPhotoUploadState);
  const [addPhotoError, setAddPhotoError] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [photoBeingEdited, setPhotoBeingEdited] = useState(null);
  const [photoEditData, setPhotoEditData] = useState({ takenAt: "", description: "" });
  const [photoEditError, setPhotoEditError] = useState("");
  const [isSavingPhotoEdit, setIsSavingPhotoEdit] = useState(false);
  const [photoActionError, setPhotoActionError] = useState("");
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(tree?.notes ?? "");

  const hasAttemptedRefreshRef = useRef(false);

  const calculateAge = (dateString) => {
    if (!dateString) {
      return null;
    }

    const start = new Date(dateString);
    const startTimestamp = start.getTime();
    if (Number.isNaN(startTimestamp)) {
      return null;
    }

    const now = new Date();
    const years = (now.getTime() - startTimestamp) / (1000 * 60 * 60 * 24 * 365.25);
    if (!Number.isFinite(years)) {
      return null;
    }

    return years.toFixed(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Unknown date";
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatInputDate = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string" && value.length >= 10) {
      return value.slice(0, 10);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatSpeciesLabel = useCallback((species) => {
    if (!species) {
      return "";
    }
    return species.scientificName
      ? `${species.commonName} (${species.scientificName})`
      : species.commonName;
  }, []);

  const stageMeta = useMemo(
    () => getStageMeta(tree.developmentStage),
    [tree.developmentStage]
  );

  const ageYears = calculateAge(tree.acquisitionDate);
  const ageLabel = ageYears ? `${ageYears} years old` : "Age unknown";

  const widthLabel =
    typeof tree.currentGirth === "number" && !Number.isNaN(tree.currentGirth)
      ? `${tree.currentGirth} cm trunk width`
      : "Trunk width not recorded";

  const latestUpdate = tree.updates[0];
  const earliestUpdate = tree.updates[tree.updates.length - 1];
  const latestUpdateLabel = latestUpdate?.date ? formatDate(latestUpdate.date) : "No updates yet";

  const hasCurrentWidth =
    typeof tree.currentGirth === "number" && !Number.isNaN(tree.currentGirth);
  const hasBaselineWidth =
    typeof earliestUpdate?.girth === "number" && !Number.isNaN(earliestUpdate.girth);
  const growthLabel = (() => {
    if (!hasCurrentWidth || !hasBaselineWidth) {
      return "—";
    }
    const growthDelta = tree.currentGirth - earliestUpdate.girth;
    const prefix = growthDelta >= 0 ? "+" : "";
    return `${prefix}${growthDelta.toFixed(1)} cm`;
  })();

  const photoEntries = useMemo(() => {
    if (Array.isArray(tree.photos) && tree.photos.length > 0) {
      return tree.photos;
    }

    const fallbackUrl = tree.photoUrl || tree.fullPhotoUrl || null;
    return [
      {
        id: "placeholder",
        url: fallbackUrl,
        thumbnailUrl: fallbackUrl,
        fullUrl: fallbackUrl,
        description: fallbackUrl ? "Tree photo" : "No photos yet",
        date: tree.acquisitionDate ?? null,
      },
    ];
  }, [tree.photos, tree.photoUrl, tree.fullPhotoUrl, tree.acquisitionDate]);

  const speciesSelectValue =
    editSpeciesMode === "existing" ? editSelectedSpeciesId : "__new__";
  const selectedSpecies = speciesList.find(
    (item) => String(item.id) === String(editSelectedSpeciesId)
  );

  useEffect(() => {
    setCurrentPhotoIndex((prev) => {
      if (prev >= photoEntries.length) {
        return Math.max(0, photoEntries.length - 1);
      }
      if (prev < 0) {
        return 0;
      }
      return prev;
    });
  }, [photoEntries.length]);

  useEffect(() => {
    if (!treeFromCollection && !treesLoading && !hasAttemptedRefreshRef.current) {
      hasAttemptedRefreshRef.current = true;
      refreshTrees().catch(() => {
        // allow a subsequent attempt if needed
        hasAttemptedRefreshRef.current = false;
      });
    }
  }, [treeFromCollection, treesLoading, refreshTrees]);

  const measurementChartData = useMemo(() => {
    if (!Array.isArray(tree?.updates)) {
      return [];
    }

    return tree.updates
      .filter((update) => {
        const hasMeasurement = typeof update.girth === "number" && !Number.isNaN(update.girth);
        const hasDate = Boolean(update.date);

        if (!hasMeasurement || !hasDate) {
          return false;
        }

        return update.girth !== 0;
      })
      .map((update) => {
        const parsedDate = new Date(update.date);
        const timestamp = parsedDate.getTime();

        if (Number.isNaN(timestamp)) {
          return null;
        }

        return {
          dateValue: timestamp,
          dateLabel: parsedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          measurement: update.girth,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.dateValue - b.dateValue);
  }, [tree?.updates]);

  useEffect(() => {
    if (treeFromCollection) {
      setTree((prev) => ({
        ...prev,
        ...treeFromCollection,
      }));
      setDetailLoading(false);
      setDetailError("");
    }
  }, [treeFromCollection]);

  useEffect(() => {
    if (treeFromCollection || treesLoading || Number.isNaN(numericId)) {
      return undefined;
    }

    let isActive = true;
    setDetailLoading(true);
    setDetailError("");

    fetchTreeById(numericId)
      .then((fetched) => {
        if (!isActive) {
          return;
        }
        setTree((prev) => ({
          ...prev,
          ...fetched,
        }));
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        setDetailError(error.message);
      })
      .finally(() => {
        if (isActive) {
          setDetailLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [fetchTreeById, numericId, treeFromCollection, treesLoading]);

  const isHydrating = !treeFromCollection && detailLoading;
  const hasDetailError = !treeFromCollection && !detailLoading && detailError;

  const selectedAccoladePhoto = useMemo(() => {
    if (newAccolade.uploadPreview) {
      return {
        url: newAccolade.uploadPreview,
        description: "Uploaded accolade photo",
        date: null,
      };
    }

    if (newAccolade.photoId) {
      return (
        tree.photos.find(
          (photo) => String(photo.id) === String(newAccolade.photoId)
        ) || null
      );
    }

    return null;
  }, [newAccolade.photoId, newAccolade.uploadPreview, tree.photos]);

  useEffect(() => {
    if (!isStageMenuOpen) return;

    const handleClickAway = (event) => {
      if (
        stageMenuRef.current &&
        !stageMenuRef.current.contains(event.target)
      ) {
        setIsStageMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, [isStageMenuOpen]);

  useEffect(() => {
    if (!fullscreenPhoto) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setFullscreenPhoto(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreenPhoto]);

  useEffect(() => {
    if (!isEditingNotes) {
      setNotesDraft(tree?.notes ?? "");
    }
  }, [tree?.notes, isEditingNotes]);

  useEffect(() => {
    if (
      typeof document === "undefined" ||
      !isEditingNotes ||
      !notesTextareaRef.current
    ) {
      return;
    }

    const textarea = notesTextareaRef.current;
    if (document.activeElement === textarea) {
      return;
    }

    const start =
      typeof textarea.selectionStart === "number"
        ? textarea.selectionStart
        : textarea.value.length;
    const end =
      typeof textarea.selectionEnd === "number"
        ? textarea.selectionEnd
        : textarea.value.length;

    textarea.focus({ preventScroll: true });
    try {
      textarea.setSelectionRange(start, end);
    } catch {
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, [isEditingNotes, notesDraft]);

  const openMoveToGraveyardModal = () => {
    setGraveyardForm({ category: "dead", note: "" });
    setShowGraveyardModal(true);
  };

  const closeMoveToGraveyardModal = () => {
    setShowGraveyardModal(false);
    setGraveyardForm({ category: "dead", note: "" });
    setIsMovingTree(false);
  };

  const handleMoveToGraveyard = async (event) => {
    event.preventDefault();
    if (!treeFromCollection) {
      closeMoveToGraveyardModal();
      return;
    }

    setIsMovingTree(true);
    try {
      await moveTreeToGraveyard(tree.id, {
        category: graveyardForm.category,
        note: graveyardForm.note,
      });
      closeMoveToGraveyardModal();
      navigate("/graveyard");
    } catch (moveError) {
      console.error("Failed to move tree to graveyard", moveError);
      setIsMovingTree(false);
    }
  };

  const openEditModal = () => {
    setEditData({
      name: tree.name,
      acquisitionDate: tree.acquisitionDate,
      developmentStage: tree.developmentStage ?? DEFAULT_STAGE_VALUE,
      notes: tree.notes ?? "",
    });

    const matchedSpecies = speciesList.find(
      (item) => Number(item.id) === Number(tree.speciesId)
    );

    if (matchedSpecies) {
      setEditSpeciesMode("existing");
      setEditSelectedSpeciesId(String(matchedSpecies.id));
    } else if (speciesList.length > 0) {
      setEditSpeciesMode("existing");
      setEditSelectedSpeciesId(String(speciesList[0].id));
    } else {
      setEditSpeciesMode("new");
      setEditSelectedSpeciesId("");
    }

    if (!matchedSpecies && speciesList.length === 0) {
      const fallbackName =
        typeof tree.species === "string"
          ? tree.species.replace(/\s*\([^)]*\)\s*$/, "").trim()
          : "";
      setEditNewSpecies({
        ...initialSpeciesFormState,
        commonName: fallbackName,
      });
    } else {
      setEditNewSpecies(initialSpeciesFormState);
    }

    setEditModalError("");
    setIsSavingEdit(false);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditModalError("");
    setIsSavingEdit(false);
    setEditNewSpecies(initialSpeciesFormState);
  };

  const handleEditSave = async () => {
    if (isSavingEdit) {
      return;
    }

    let speciesName = tree?.species ?? "";
    let speciesId = tree?.speciesId ?? null;
    let selectedSpecies = null;

    if (editSpeciesMode === "existing") {
      if (!editSelectedSpeciesId) {
        setEditModalError("Please choose a species from your library.");
        return;
      }

      selectedSpecies = speciesList.find(
        (item) => String(item.id) === String(editSelectedSpeciesId)
      );

      if (!selectedSpecies) {
        setEditModalError("Please choose a species from your library.");
        return;
      }

      speciesId = selectedSpecies.id;
      speciesName = formatSpeciesLabel(selectedSpecies);
    } else {
      const trimmedCommonName = editNewSpecies.commonName.trim();
      if (!trimmedCommonName) {
        setEditModalError("Please provide a common name for the new species.");
        return;
      }
    }

    setIsSavingEdit(true);
    setEditModalError("");

    try {
      if (editSpeciesMode === "new") {
        const created = await addSpecies({
          commonName: editNewSpecies.commonName.trim(),
          scientificName: editNewSpecies.scientificName.trim(),
          notes: editNewSpecies.notes,
        });
        speciesId = created.id;
        speciesName = formatSpeciesLabel(created);
        await refreshSpecies();
      }

      const trimmedName = editData.name.trim();
      const normalizedStage = editData.developmentStage || tree.developmentStage;
      const normalizedAcquisition =
        editData.acquisitionDate || tree.acquisitionDate;

      setTree((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          name: trimmedName || prev.name,
          species: speciesName,
          speciesId,
          acquisitionDate: normalizedAcquisition,
          developmentStage: normalizedStage,
          notes: editData.notes,
        };
      });

      closeEditModal();
    } catch (error) {
      setEditModalError(error.message || "Unable to save changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSetPhotoAsPrimary = async () => {
    const currentPhoto = photoEntries[currentPhotoIndex];
    if (
      !tree?.id ||
      !currentPhoto?.id ||
      currentPhoto.id === "placeholder" ||
      currentPhoto.isPrimary ||
      isSettingPrimary
    ) {
      return;
    }

    setIsSettingPrimary(true);
    setPhotoActionError("");

    try {
      const updatedPhoto = await updateTreePhoto(tree.id, currentPhoto.id, {
        is_primary: true,
      });

      setTree((prev) => {
        if (!prev) {
          return prev;
        }

        const existingPhotos = Array.isArray(prev.photos) ? prev.photos : [];
        let didReplace = false;
        let updatedPhotos = existingPhotos.map((photo) => {
          if (Number(photo.id) === Number(updatedPhoto.id)) {
            didReplace = true;
            return updatedPhoto;
          }
          if (updatedPhoto.isPrimary) {
            return { ...photo, isPrimary: false };
          }
          return photo;
        });

        if (!didReplace) {
          updatedPhotos = [updatedPhoto, ...existingPhotos];
        }

        const primaryPhoto =
          updatedPhoto.isPrimary
            ? updatedPhoto
            : updatedPhotos.find((photo) => photo.isPrimary) ?? updatedPhotos[0];

        return {
          ...prev,
          photos: updatedPhotos,
          photoUrl: primaryPhoto
            ? primaryPhoto.thumbnailUrl || primaryPhoto.url || primaryPhoto.fullUrl || prev.photoUrl
            : prev.photoUrl,
          fullPhotoUrl: primaryPhoto
            ? primaryPhoto.fullUrl || primaryPhoto.url || prev.fullPhotoUrl
            : prev.fullPhotoUrl,
        };
      });
    } catch (error) {
      setPhotoActionError(
        error.message || "Failed to set this photo as the main image."
      );
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const startNotesEdit = () => {
    setNotesDraft(tree?.notes ?? "");
    setIsEditingNotes(true);
  };

  const cancelNotesEdit = () => {
    setNotesDraft(tree?.notes ?? "");
    setIsEditingNotes(false);
  };

  const handleSaveNotes = () => {
    const updatedNotes = notesDraft;
    setTree((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        notes: updatedNotes,
      };
    });
    setEditData((prev) => ({
      ...prev,
      notes: updatedNotes,
    }));
    setNotesDraft(updatedNotes);
    setIsEditingNotes(false);
  };

  const nextPhoto = () => {
    setPhotoActionError("");
    setCurrentPhotoIndex((prev) =>
      prev === photoEntries.length - 1 ? 0 : prev + 1
    );
  };
  const prevPhoto = () => {
    setPhotoActionError("");
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? photoEntries.length - 1 : prev - 1
    );
  };

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

  const handleStageChange = async (stageValue) => {
    if (!tree?.id || isUpdatingStage) {
      setIsStageMenuOpen(false);
      return;
    }

    const normalizedStage =
      typeof stageValue === "string" && stageValue.trim() !== ""
        ? stageValue.toLowerCase()
        : DEFAULT_STAGE_VALUE;

    setIsUpdatingStage(true);
    try {
      const updated = await updateTree(tree.id, {
        development_stage: normalizedStage,
      });
      setTree((prev) => ({
        ...prev,
        developmentStage: updated.developmentStage,
      }));
      setEditData((prev) => ({
        ...prev,
        developmentStage: updated.developmentStage,
      }));
    } catch (stageError) {
      console.error("Failed to update development stage", stageError);
    } finally {
      setIsStageMenuOpen(false);
      setIsUpdatingStage(false);
    }
  };

  const resetPhotoEditState = () => {
    setPhotoBeingEdited(null);
    setPhotoEditData({ takenAt: "", description: "" });
    setPhotoEditError("");
    setIsSavingPhotoEdit(false);
  };

  const openEditPhotoModal = (photo) => {
    if (!photo || photo.id === "placeholder") {
      return;
    }

    resetPhotoEditState();
    setPhotoBeingEdited(photo);
    setPhotoEditData({
      takenAt: formatInputDate(photo.takenAt ?? photo.date ?? ""),
      description: photo.description ?? "",
    });
    setPhotoActionError("");
    setShowEditPhotoModal(true);
  };

  const closeEditPhotoModal = () => {
    setShowEditPhotoModal(false);
    resetPhotoEditState();
  };

  const handleSavePhotoEdit = async () => {
    if (!tree?.id || !photoBeingEdited?.id) {
      return;
    }

    setIsSavingPhotoEdit(true);
    setPhotoEditError("");

    try {
      const payload = {
        description: photoEditData.description?.trim() ?? "",
      };
      if (photoEditData.takenAt) {
        payload.taken_at = photoEditData.takenAt;
      } else {
        payload.taken_at = null;
      }

      const updatedPhoto = await updateTreePhoto(
        tree.id,
        photoBeingEdited.id,
        payload
      );

      setTree((prev) => {
        if (!prev) {
          return prev;
        }
        const existingPhotos = Array.isArray(prev.photos) ? prev.photos : [];
        let didReplace = false;
        let updatedPhotos = existingPhotos.map((photo) => {
          if (Number(photo.id) === Number(updatedPhoto.id)) {
            didReplace = true;
            return updatedPhoto;
          }
          if (updatedPhoto.isPrimary) {
            return { ...photo, isPrimary: false };
          }
          return photo;
        });

        if (!didReplace) {
          updatedPhotos = [updatedPhoto, ...existingPhotos];
        }

        const primaryPhoto =
          updatedPhoto.isPrimary
            ? updatedPhoto
            : updatedPhotos.find((photo) => photo.isPrimary) ?? updatedPhotos[0];

        return {
          ...prev,
          photos: updatedPhotos,
          photoUrl: primaryPhoto
            ? primaryPhoto.thumbnailUrl || primaryPhoto.url || primaryPhoto.fullUrl || prev.photoUrl
            : prev.photoUrl,
          fullPhotoUrl: primaryPhoto
            ? primaryPhoto.fullUrl || primaryPhoto.url || prev.fullPhotoUrl
            : prev.fullPhotoUrl,
        };
      });

      resetPhotoEditState();
      setShowEditPhotoModal(false);
    } catch (photoError) {
      console.error("Failed to update photo metadata", photoError);
      setPhotoEditError(photoError.message ?? "Unable to update photo details.");
    } finally {
      setIsSavingPhotoEdit(false);
    }
  };

  const openPhotoViewer = (photo, options = {}) => {
    if (!photo) {
      return;
    }

    const displayUrl = photo.fullUrl || photo.url;
    if (!displayUrl) {
      return;
    }

    const title =
      options.title ??
      (photo.description ? photo.description : tree.name || "Tree Photo");

    const subtitle =
      options.subtitle ??
      (photo.date ? formatDate(photo.date) : undefined);

    setFullscreenPhoto({
      url: displayUrl,
      title,
      subtitle,
      description: options.description,
    });
  };

  const handleAccoladePreview = (accolade, linkedPhoto) => {
    const source = accolade.uploadedPhoto
      ? { url: accolade.uploadedPhoto }
      : linkedPhoto;

    if (!source || !source.url) {
      return;
    }

    const subtitleParts = [];
    if (linkedPhoto?.date) {
      subtitleParts.push(formatDate(linkedPhoto.date));
    }
    if (linkedPhoto?.description) {
      subtitleParts.push(linkedPhoto.description);
    }

    openPhotoViewer(source, {
      title: accolade.title,
      subtitle: subtitleParts.join(" • ") || undefined,
      description: accolade.uploadedPhoto
        ? "Uploaded accolade photo"
        : undefined,
    });
  };

  const openAccoladeModal = (index = null) => {
    if (typeof index === "number" && accolades[index]) {
      const accolade = accolades[index];
      setNewAccolade({
        title: accolade.title,
        photoId: accolade.photoId ? String(accolade.photoId) : "",
        uploadPreview: accolade.uploadedPhoto || "",
        uploadFile: null,
      });
      setEditingAccoladeIndex(index);
    } else {
      setNewAccolade(initialAccoladeState);
      setEditingAccoladeIndex(null);
    }

    if (accoladeFileInputRef.current) {
      accoladeFileInputRef.current.value = "";
    }

    setShowAccoladeModal(true);
  };

  const handleAccoladePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewAccolade((prev) => ({
        ...prev,
        uploadPreview:
          typeof reader.result === "string" ? reader.result : "",
        uploadFile: file,
        photoId: "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const clearAccoladePhoto = () => {
    setNewAccolade((prev) => ({
      ...prev,
      uploadPreview: "",
      uploadFile: null,
      photoId: "",
    }));
    if (accoladeFileInputRef.current) {
      accoladeFileInputRef.current.value = "";
    }
  };

  const handleAccoladeSave = () => {
    if (!newAccolade.title.trim()) {
      return;
    }

    const entry = {
      title: newAccolade.title.trim(),
      photoId: newAccolade.photoId ? String(newAccolade.photoId) : null,
      uploadedPhoto: newAccolade.uploadPreview || null,
    };

    if (editingAccoladeIndex !== null) {
      setAccolades((prev) =>
        prev.map((item, idx) => (idx === editingAccoladeIndex ? entry : item))
      );
    } else {
      setAccolades((prev) => [...prev, entry]);
    }

    setNewAccolade(initialAccoladeState);
    setEditingAccoladeIndex(null);
    if (accoladeFileInputRef.current) {
      accoladeFileInputRef.current.value = "";
    }
    setShowAccoladeModal(false);
  };

  const handleRemoveAccolade = (index) => {
    setAccolades((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetUpdateForm = () => {
    setNewUpdate(initialUpdateState);
    setEditingUpdateId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openAddUpdateModal = () => {
    resetUpdateForm();
    setShowUpdateModal(true);
  };

  const openEditUpdateModal = (update) => {
    setNewUpdate({
      ...initialUpdateState,
      date: update.date,
      girth:
        typeof update.girth === "number"
          ? update.girth.toString()
          : update.girth ?? "",
      workPerformed: update.workPerformed ?? "",
    });
    setEditingUpdateId(update.id);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowUpdateModal(true);
  };

  const handleUpdatePhotoChange = (event) => {
    if (editingUpdateId) {
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      setNewUpdate((prev) => ({
        ...prev,
        photoFile: null,
        photoPreview: null,
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewUpdate((prev) => ({
        ...prev,
        photoFile: file,
        photoPreview: typeof reader.result === "string" ? reader.result : null,
      }));
    };
    reader.readAsDataURL(file);

    extractPhotoDate(file)
      .then((extracted) => {
        if (!extracted) {
          return;
        }

        setNewUpdate((prev) => {
          if (prev.photoFile !== file || prev.date) {
            return prev;
          }
          return {
            ...prev,
            date: extracted,
          };
        });
      })
      .catch((metadataError) => {
        console.warn("Failed to read update photo metadata", metadataError);
      });
  };

  const resetPhotoForm = useCallback(() => {
    setNewPhoto((prev) => {
      if (prev.preview) {
        URL.revokeObjectURL(prev.preview);
      }
      return { ...initialPhotoUploadState };
    });
    if (photoUploadInputRef.current) {
      photoUploadInputRef.current.value = "";
    }
    setAddPhotoError("");
    setIsUploadingPhoto(false);
  }, [photoUploadInputRef]);

  const openAddPhotoModal = useCallback(() => {
    resetPhotoForm();
    setShowAddPhotoModal(true);
  }, [resetPhotoForm]);

  const closeAddPhotoModal = useCallback(() => {
    setShowAddPhotoModal(false);
    resetPhotoForm();
  }, [resetPhotoForm]);

  const applySelectedPhoto = useCallback(async (file) => {
    if (!file) {
      setNewPhoto((prev) => {
        if (prev.preview) {
          URL.revokeObjectURL(prev.preview);
        }
        return {
          ...prev,
          file: null,
          preview: null,
          takenAt: "",
        };
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setNewPhoto((prev) => {
      if (prev.preview) {
        URL.revokeObjectURL(prev.preview);
      }
      return {
        ...prev,
        file,
        preview: objectUrl,
        takenAt: "",
      };
    });

    try {
      const extracted = await extractPhotoDate(file);
      if (extracted) {
        setNewPhoto((prev) => {
          if (prev.file !== file || prev.takenAt) {
            return prev;
          }
          return {
            ...prev,
            takenAt: extracted,
          };
        });
      }
    } catch (metadataError) {
      console.warn("Failed to extract photo metadata", metadataError);
    }
  }, []);

  const handlePhotoInputChange = async (event) => {
    const file = event.target.files?.[0];
    await applySelectedPhoto(file || null);
  };

  const handlePhotoDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    await applySelectedPhoto(file || null);
  };

  const handlePhotoDragOver = (event) => {
    event.preventDefault();
  };

  const handleUploadNewPhoto = async () => {
    if (!newPhoto.file) {
      setAddPhotoError("Please choose a photo to upload.");
      return;
    }

    if (!tree?.id) {
      setAddPhotoError("Tree details are still loading. Please try again.");
      return;
    }

    setIsUploadingPhoto(true);
    setAddPhotoError("");

    try {
      const payload = {
        file: newPhoto.file,
      };
      const trimmedDescription = newPhoto.description.trim();
      if (trimmedDescription) {
        payload.description = trimmedDescription;
      }
      if (newPhoto.takenAt) {
        payload.takenAt = newPhoto.takenAt;
      }
      if (newPhoto.isPrimary) {
        payload.isPrimary = true;
      }

      const uploaded = await uploadTreePhoto(tree.id, payload);
      setTree((prev) => {
        if (!prev) {
          return prev;
        }
        const updatedPhotos = [uploaded, ...(prev.photos ?? [])];
        const updatedTree = {
          ...prev,
          photos: updatedPhotos,
        };
        if (uploaded.isPrimary) {
          updatedTree.photoUrl =
            uploaded.thumbnailUrl ||
            uploaded.url ||
            uploaded.fullUrl ||
            prev.photoUrl;
          updatedTree.fullPhotoUrl =
            uploaded.fullUrl || prev.fullPhotoUrl || uploaded.url || null;
        }
        return updatedTree;
      });
      setCurrentPhotoIndex(0);
      closeAddPhotoModal();
    } catch (error) {
      setAddPhotoError(error.message || "Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    return () => {
      if (newPhoto.preview) {
        URL.revokeObjectURL(newPhoto.preview);
      }
    };
  }, [newPhoto.preview]);

  const handleSaveUpdate = () => {
    if (!newUpdate.date || !newUpdate.workPerformed.trim()) {
      return;
    }

    if (
      !editingUpdateId &&
      newUpdate.addReminder &&
      (!newUpdate.reminderMessage.trim() || !newUpdate.reminderDueDate)
    ) {
      alert("Please provide a reminder message and due date.");
      return;
    }

    const parsedGirth =
      newUpdate.girth.trim() !== "" && !Number.isNaN(Number(newUpdate.girth))
        ? Number(newUpdate.girth)
        : null;
    const trimmedWork = newUpdate.workPerformed.trim();

    if (editingUpdateId) {
      setTree((prev) => ({
        ...prev,
        updates: prev.updates.map((update) => {
          if (update.id !== editingUpdateId) {
            return update;
          }

          return {
            ...update,
            date: newUpdate.date,
            girth:
              parsedGirth !== null
                ? parsedGirth
                : update.girth,
            workPerformed: trimmedWork,
          };
        }),
      }));
    } else {
      setTree((prev) => {
        const fallbackGirth =
          parsedGirth !== null
            ? parsedGirth
            : typeof prev.updates[0]?.girth === "number"
            ? prev.updates[0].girth
            : prev.currentGirth;

        const entry = {
          id: Date.now(),
          date: newUpdate.date,
          girth: fallbackGirth,
          workPerformed: trimmedWork,
        };

        return {
          ...prev,
          updates: [entry, ...prev.updates],
        };
      });

      if (newUpdate.addReminder) {
        const reminder = {
          id: Date.now(),
          treeId: tree.id,
          treeName: tree.name,
          message: newUpdate.reminderMessage.trim(),
          dueDate: newUpdate.reminderDueDate,
        };
        const updatedReminders = appendReminderToStorage(reminder);
        setReminders(updatedReminders);
      }
    }

    resetUpdateForm();
    setShowUpdateModal(false);
  };

  // ─── Tabs ────────────────────────────────────────────────
  const OverviewTab = () => {
    const hasNotes = Boolean(tree?.notes && tree.notes.trim());

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-semibold text-gray-800">Notes</h3>
            {isEditingNotes ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelNotesEdit}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="rounded-lg bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 transition"
                >
                  Save Notes
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startNotesEdit}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                ref={notesTextareaRef}
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                rows={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                placeholder="Add notes about this tree's care, styling, or history using Markdown formatting."
              />
            </div>
          ) : hasNotes ? (
            <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-green-700 prose-li:marker:text-green-600">
              <ReactMarkdown>{tree.notes}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No notes yet. Click edit to add some.
            </p>
          )}
        </div>
      </div>
    );
  };

  const PhotosTab = () => {
    const currentPhoto = photoEntries[currentPhotoIndex];
    const canEditCurrentPhoto = Boolean(
      currentPhoto?.id && currentPhoto.id !== "placeholder" && tree?.id
    );
    const isPrimaryPhoto = Boolean(currentPhoto?.isPrimary);

    const canSetAsPrimary = canEditCurrentPhoto;

    return (
      <div className="space-y-6">
        <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: "400px" }}>
          {currentPhoto?.url ? (
            <img
              src={currentPhoto.url}
              alt={currentPhoto.description}
              className="w-full h-full object-contain cursor-pointer"
              onClick={() =>
                openPhotoViewer(currentPhoto, {
                  subtitle: currentPhoto.date ? formatDate(currentPhoto.date) : undefined,
                })
              }
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center cursor-pointer"
              onClick={() =>
                openPhotoViewer(currentPhoto, {
                  subtitle: currentPhoto?.date ? formatDate(currentPhoto.date) : undefined,
                })
              }
            >
              <Camera className="w-24 h-24 text-gray-400" />
            </div>
          )}

          {canEditCurrentPhoto && (
            <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2 z-10">
              <button
                type="button"
                onClick={handleSetPhotoAsPrimary}
                disabled={!canSetAsPrimary || isPrimaryPhoto || isSettingPrimary}
                className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPrimaryPhoto
                  ? "Main photo"
                  : isSettingPrimary
                  ? "Setting..."
                  : "Set as main"}
              </button>
              <button
                type="button"
                onClick={() => openEditPhotoModal(currentPhoto)}
                disabled={!canEditCurrentPhoto}
                className="rounded-full bg-white/90 p-2 text-gray-700 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Edit photo details"
              >
                <Edit className="w-4 h-4" />
              </button>
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

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pointer-events-none z-0">
            <div className="text-white text-sm">
              {currentPhoto?.date ? (
                <p className="opacity-80">{formatDate(currentPhoto.date)}</p>
              ) : (
                <p className="opacity-80">No date recorded</p>
              )}
              <p>{currentPhoto?.description}</p>
            </div>
          </div>
        </div>

        {photoActionError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {photoActionError}
          </p>
        )}

        <div className="relative overflow-visible flex gap-3 pb-3 pt-3 z-0">
          {photoEntries.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => {
                setPhotoActionError("");
                setCurrentPhotoIndex(index);
              }}
              className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                index === currentPhotoIndex
                  ? "border-green-600 scale-110 -translate-y-1 shadow-lg z-20"
                  : "border-gray-300 hover:border-gray-400"
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
          <button
            type="button"
            onClick={openAddPhotoModal}
            className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-600 flex items-center justify-center transition"
            aria-label="Add new photo"
          >
            <Plus className="w-8 h-8 text-gray-400" />
          </button>
        </div>
      </div>
    );
  };

  const MeasurementsTab = () => {
    if (!RechartsAvailable) {
      return (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-600">
          Measurement chart is unavailable because the charting library failed to load.
        </div>
      );
    }

    if (measurementChartData.length === 0) {
      return (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-600">
          No measurement history to display yet.
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Trunk Width Measurements Over Time</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={measurementChartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dateValue"
                type="number"
                scale="time"
                domain={["auto", "auto"]}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                }
                tick={{ fontSize: 12, fill: "#4b5563" }}
                tickMargin={8}
              />
              <YAxis
                dataKey="measurement"
                tick={{ fontSize: 12, fill: "#4b5563" }}
                tickMargin={8}
                width={60}
                label={{ value: "Trunk Width (cm)", angle: -90, position: "insideLeft", fill: "#4b5563", fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [`${value} cm`, "Trunk Width"]}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                }
              />
              <Line
                type="monotone"
                dataKey="measurement"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{ r: 4, stroke: "#047857", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

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
                    <span>{update.girth} cm width</span>
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

  if (isHydrating || (treesLoading && !hasAttemptedRefreshRef.current)) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Camera className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">Loading tree details</h1>
            <p className="text-gray-600">Fetching the latest information for this bonsai…</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasDetailError) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">Unable to load tree</h1>
            <p className="text-gray-600">{detailError}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Back to home
            </button>
            <button
              onClick={() => refreshTrees()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!treeFromCollection) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Skull className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">Tree not in collection</h1>
            <p className="text-gray-600">
              This tree is no longer part of your active collection. Check the Graveyard to review its story or return to your
              collection overview.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Back to home
            </button>
            <button
              onClick={() => navigate("/graveyard")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              <Skull className="h-4 w-4" />
              Visit Graveyard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 px-2 sm:px-4 lg:px-6">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
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
            <button
              onClick={openMoveToGraveyardModal}
              className="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
            >
              Move to Graveyard
            </button>
          </div>
        </div>
        <div className="h-1 bg-green-600"></div>
      </header>

      <main className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_350px] lg:px-8">
        <div>
          <div className="relative bg-green-50 rounded-lg shadow-sm p-6 mb-6 border border-green-100">
            {/* Development Stage Badge */}
            <div className="absolute top-4 right-4 text-right">
              <div className="relative inline-flex" ref={stageMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsStageMenuOpen((prev) => !prev)}
                  className="focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUpdatingStage}
                >
                  <span
                    className={`flex items-center gap-2 text-sm font-semibold ${stageMeta.textClasses}`}
                    title={stageMeta.label}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${stageMeta.dotClasses}`} />
                    {stageMeta.shortLabel}
                    <ChevronDown className="h-4 w-4 opacity-80" />
                  </span>
                </button>

                {isStageMenuOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Select growth stage
                    </p>
                    <ul className="py-2">
                      {DEVELOPMENT_STAGE_OPTIONS.map((option) => (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => handleStageChange(option.value)}
                            disabled={isUpdatingStage}
                            className={`flex w-full items-center justify-between px-4 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 ${
                              option.value === stageMeta.value
                                ? "text-gray-900"
                                : "text-gray-600"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${option.dotClasses}`}
                              />
                              {option.label}
                            </span>
                            {option.value === stageMeta.value && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{tree.name}</h1>
              <p className="text-lg text-gray-600 italic">{tree.species}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{ageLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{widthLabel}</span>
                </div>
              </div>
            </div>
          </div>


          <div className="relative">
            <div className="flex flex-wrap gap-x-2 mb-[-1px]">
              {["overview", "photos", "measurements", "updates"].map((tab) => (
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
              {activeTab === 'measurements' && <MeasurementsTab />}
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
                <span>{latestUpdateLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>Width Change:</span>
                <span className="text-green-600">{growthLabel}</span>
              </div>
            </div>
          </div>

          {/* Accolades */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Accolades</h3>
              <button
                onClick={() => openAccoladeModal()}
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
                  const hasUploadedPhoto = Boolean(accolade.uploadedPhoto);
                  const displayPhoto = hasUploadedPhoto
                    ? { url: accolade.uploadedPhoto }
                    : linkedPhoto;

                  const canPreview = Boolean(displayPhoto?.url);

                  return (
                    <li
                      key={idx}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2 transition ${
                        canPreview
                          ? "border-gray-200 bg-gray-50 hover:border-green-200 hover:bg-white cursor-pointer"
                          : "border-gray-200 bg-gray-50"
                      }`}
                      onClick={
                        canPreview
                          ? () => handleAccoladePreview(accolade, linkedPhoto)
                          : undefined
                      }
                    >
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                        {displayPhoto ? (
                          displayPhoto.url ? (
                            <img
                              src={displayPhoto.url}
                              alt={
                                hasUploadedPhoto
                                  ? 'Accolade photo'
                                  : linkedPhoto?.description || 'Linked accolade photo'
                              }
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
                          {hasUploadedPhoto
                            ? 'Uploaded photo attached'
                            : linkedPhoto
                            ? `${formatDate(linkedPhoto.date)}${
                                linkedPhoto.description ? ` • ${linkedPhoto.description}` : ''
                              }`
                            : 'No photo attached'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAccoladeModal(idx);
                          }}
                          className="text-gray-400 transition hover:text-green-600"
                          aria-label="Edit accolade"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveAccolade(idx);
                          }}
                          className="text-gray-400 transition hover:text-red-600"
                          aria-label="Delete accolade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
      {showGraveyardModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <button
              onClick={closeMoveToGraveyardModal}
              className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600"
              aria-label="Close graveyard modal"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Skull className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Move to Graveyard</h3>
                <p className="text-sm text-gray-500">
                  Choose what happened and leave a note to remember this tree by.
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleMoveToGraveyard}>
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">Reason</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label
                    className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                      graveyardForm.category === "dead"
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-gray-200 hover:border-rose-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="graveyard-category"
                      value="dead"
                      checked={graveyardForm.category === "dead"}
                      onChange={(event) =>
                        setGraveyardForm((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold">It died</p>
                      <p className="text-xs text-gray-500">Record lessons learned and what caused it.</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                      graveyardForm.category === "new-owner"
                        ? "border-rose-500 bg-rose-50 text-rose-700"
                        : "border-gray-200 hover:border-rose-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="graveyard-category"
                      value="new-owner"
                      checked={graveyardForm.category === "new-owner"}
                      onChange={(event) =>
                        setGraveyardForm((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold">New owner</p>
                      <p className="text-xs text-gray-500">Capture sale details or who it went home with.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave a note
                </label>
                <textarea
                  rows={4}
                  value={graveyardForm.note}
                  onChange={(event) =>
                    setGraveyardForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Share lessons learned, sale price, or who adopted it."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p>
                  This tree will leave your active collection and move to the Graveyard. You can still review it there or delete
                  it forever later.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeMoveToGraveyardModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMovingTree}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:bg-gray-200"
                >
                  Move to Graveyard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Trunk Width (cm)
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

            {!editingUpdateId && (
              <>
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
              </>
            )}

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

      {showAddPhotoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative space-y-4">
            <button
              type="button"
              onClick={closeAddPhotoModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close photo uploader"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-800">Upload Tree Photo</h3>

            {addPhotoError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {addPhotoError}
              </p>
            )}

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 hover:border-green-500 hover:text-green-600 transition cursor-pointer"
              onClick={() => photoUploadInputRef.current?.click()}
              onDrop={handlePhotoDrop}
              onDragOver={handlePhotoDragOver}
            >
              {newPhoto.preview ? (
                <img
                  src={newPhoto.preview}
                  alt="Selected tree"
                  className="rounded-md border border-gray-200 w-full h-48 object-cover"
                />
              ) : (
                <>
                  <Camera className="h-10 w-10 mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Click or drag photo to upload</p>
                  <p className="text-xs text-gray-400 mt-1">PNG or JPG, up to 10MB</p>
                </>
              )}
            </div>

            <input
              ref={photoUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoInputChange}
            />

            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Photo Date
                <input
                  type="date"
                  value={newPhoto.takenAt}
                  onChange={(event) =>
                    setNewPhoto((prev) => ({
                      ...prev,
                      takenAt: event.target.value,
                    }))
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
                <span className="text-xs text-gray-500">
                  Automatically extracted from the photo metadata. You can adjust it here.
                </span>
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Description
                <textarea
                  value={newPhoto.description}
                  onChange={(event) =>
                    setNewPhoto((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
                  placeholder="Add an optional caption"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newPhoto.isPrimary}
                  onChange={(event) =>
                    setNewPhoto((prev) => ({
                      ...prev,
                      isPrimary: event.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                />
                Make this the primary photo
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeAddPhotoModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadNewPhoto}
                disabled={isUploadingPhoto}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed transition"
              >
                {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
              </button>
            </div>
      </div>
    </div>
  )}

      {showEditPhotoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative space-y-4">
            <button
              type="button"
              onClick={closeEditPhotoModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close photo editor"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-800">Edit Photo Details</h3>

            {photoEditError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {photoEditError}
              </p>
            )}

            {photoBeingEdited?.url && (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <img
                  src={photoBeingEdited.fullUrl || photoBeingEdited.url}
                  alt={photoBeingEdited.description || 'Tree photo'}
                  className="h-48 w-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Photo Date
                <input
                  type="date"
                  value={photoEditData.takenAt}
                  onChange={(event) =>
                    setPhotoEditData((prev) => ({
                      ...prev,
                      takenAt: event.target.value,
                    }))
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
                <span className="text-xs text-gray-500">
                  Update the date associated with this photo.
                </span>
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Description
                <textarea
                  value={photoEditData.description}
                  onChange={(event) =>
                    setPhotoEditData((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
                  placeholder="Describe this photo"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeEditPhotoModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhotoEdit}
                disabled={isSavingPhotoEdit}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:cursor-not-allowed disabled:bg-green-300"
              >
                {isSavingPhotoEdit ? 'Saving…' : 'Save Changes'}
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
              onClick={() => {
                setShowAccoladeModal(false);
                setNewAccolade(initialAccoladeState);
                setEditingAccoladeIndex(null);
                if (accoladeFileInputRef.current) {
                  accoladeFileInputRef.current.value = "";
                }
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800">
              {editingAccoladeIndex !== null ? 'Edit Accolade' : 'Add Accolade'}
            </h3>

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
                    setNewAccolade((prev) => ({
                      ...prev,
                      photoId: e.target.value,
                      uploadPreview: e.target.value ? "" : prev.uploadPreview,
                      uploadFile: e.target.value ? null : prev.uploadFile,
                    }))
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

              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Upload Photo (optional)
                <input
                  ref={accoladeFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAccoladePhotoChange}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-green-700"
                />
                <span className="text-xs text-gray-500">
                  Attach a photo directly if you don't want to link to an existing tree image.
                </span>
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
                      {newAccolade.uploadPreview
                        ? 'Uploaded accolade photo'
                        : selectedAccoladePhoto.description || 'Tree photo'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {newAccolade.uploadPreview
                        ? 'Photo stored with this accolade'
                        : selectedAccoladePhoto.date
                        ? formatDate(selectedAccoladePhoto.date)
                        : 'No date available'}
                    </p>
                  </div>
                  {newAccolade.uploadPreview && (
                    <button
                      type="button"
                      onClick={clearAccoladePhoto}
                      className="ml-auto text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      Remove upload
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAccoladeModal(false);
                  setNewAccolade(initialAccoladeState);
                  setEditingAccoladeIndex(null);
                  if (accoladeFileInputRef.current) {
                    accoladeFileInputRef.current.value = "";
                  }
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAccoladeSave}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:cursor-not-allowed disabled:bg-green-300"
                disabled={!newAccolade.title.trim()}
              >
                {editingAccoladeIndex !== null ? 'Save Changes' : 'Add Accolade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-xl w-full p-6 relative space-y-4">
            <button
              onClick={closeEditModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800">Edit Tree Details</h3>

            {editModalError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {editModalError}
              </p>
            )}

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

              <div className="flex flex-col text-sm font-medium text-gray-700 gap-1 sm:col-span-2">
                <span>Species</span>
                <div className="space-y-2">
                  <select
                    value={speciesSelectValue}
                    onChange={(event) => {
                      const { value } = event.target;
                      if (value === "__new__") {
                        setEditSpeciesMode("new");
                        setEditSelectedSpeciesId("");
                      } else {
                        setEditSpeciesMode("existing");
                        setEditSelectedSpeciesId(value);
                      }
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
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

                  {editSpeciesMode === "existing" && selectedSpecies && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                      <p className="font-medium text-gray-700">
                        {formatSpeciesLabel(selectedSpecies)}
                      </p>
                      <p>
                        {selectedSpecies.scientificName
                          ? `Scientific name: ${selectedSpecies.scientificName}`
                          : "Scientific name not recorded yet."}
                      </p>
                      {selectedSpecies.notes && (
                        <p className="text-gray-500">
                          {selectedSpecies.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {editSpeciesMode === "new" && (
                    <div className="space-y-3 rounded-lg border border-dashed border-green-200 bg-green-50/60 p-3 text-xs text-gray-600">
                      <p>
                        Adding a new species will also save it to your library.
                      </p>
                      <div className="space-y-1">
                        <label className="font-medium text-gray-700">Common Name *</label>
                        <input
                          type="text"
                          value={editNewSpecies.commonName}
                          onChange={(event) =>
                            setEditNewSpecies((prev) => ({
                              ...prev,
                              commonName: event.target.value,
                            }))
                          }
                          placeholder="e.g. Chinese Elm"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-gray-700">Scientific Name</label>
                        <input
                          type="text"
                          value={editNewSpecies.scientificName}
                          onChange={(event) =>
                            setEditNewSpecies((prev) => ({
                              ...prev,
                              scientificName: event.target.value,
                            }))
                          }
                          placeholder="e.g. Ulmus parvifolia"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-gray-700">Notes</label>
                        <textarea
                          rows={3}
                          value={editNewSpecies.notes}
                          onChange={(event) =>
                            setEditNewSpecies((prev) => ({
                              ...prev,
                              notes: event.target.value,
                            }))
                          }
                          placeholder="Optional care notes for this species"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Date Acquired
                <input
                  type="date"
                  value={editData.acquisitionDate}
                  onChange={(e) => setEditData((prev) => ({ ...prev, acquisitionDate: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1 sm:col-span-2">
                Development Stage
                <select
                  value={editData.developmentStage}
                  onChange={(e) => setEditData((prev) => ({ ...prev, developmentStage: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-gray-700"
                >
                  {DEVELOPMENT_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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
                onClick={closeEditModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:cursor-not-allowed disabled:bg-green-300"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {fullscreenPhoto?.url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8"
          onClick={() => setFullscreenPhoto(null)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFullscreenPhoto(null)}
              className="absolute -top-3 -right-3 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
              aria-label="Close fullscreen photo"
            >
              <X className="h-5 w-5" />
            </button>

            <img
              src={fullscreenPhoto.url}
              alt={fullscreenPhoto.title || "Tree photo"}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />

            {(fullscreenPhoto.title ||
              fullscreenPhoto.subtitle ||
              fullscreenPhoto.description) && (
              <div className="mt-4 space-y-2 text-center text-white">
                {fullscreenPhoto.title && (
                  <h3 className="text-xl font-semibold">
                    {fullscreenPhoto.title}
                  </h3>
                )}
                {fullscreenPhoto.subtitle && (
                  <p className="text-sm text-white/80">
                    {fullscreenPhoto.subtitle}
                  </p>
                )}
                {fullscreenPhoto.description && (
                  <p className="text-sm text-white/70">
                    {fullscreenPhoto.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeDetail;
