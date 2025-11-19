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
  RotateCcw,
  RotateCw,
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
import {
  calculateAgeInYears,
  compareByTimestampDesc,
} from "../utils/dateUtils";
import ReactMarkdown from "react-markdown";
import remarkSimpleGfmTables from "../utils/remarkSimpleGfmTables";
import markdownComponents from "../utils/markdownComponents";
import MarkdownReadmeEditor from "../components/MarkdownReadmeEditor";
import ExportProgressOverlay from "../components/ExportProgressOverlay";
import ConfirmDialog from "../components/ConfirmDialog";
import { getApiBaseUrl } from "../services/apiClient";
import DatePicker from "../components/DatePicker";
import FieldLabel from "../components/FieldLabel";

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
  accolades: [],
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
    deleteTreePhoto,
    createTreeMeasurement,
    deleteTreeMeasurement,
    createTreeUpdate,
    updateTreeUpdate,
    deleteTreeUpdate,
    createTreeAccolade,
    updateTreeAccolade,
    deleteTreeAccolade,
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
  const [accolades, setAccolades] = useState(
    treeFromCollection?.accolades ?? mockTreeData.accolades ?? []
  );
  const [showAccoladeModal, setShowAccoladeModal] = useState(false);
  const [newAccolade, setNewAccolade] = useState(initialAccoladeState);
  const [editingAccoladeId, setEditingAccoladeId] = useState(null);
  const [accoladeError, setAccoladeError] = useState("");
  const [isSavingAccolade, setIsSavingAccolade] = useState(false);
  const [isRemovingAccoladeId, setIsRemovingAccoladeId] = useState(null);
  const [accoladeActionError, setAccoladeActionError] = useState("");
  const [deleteAccoladeConfirm, setDeleteAccoladeConfirm] = useState({
    open: false,
    accolade: null,
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newUpdate, setNewUpdate] = useState(initialUpdateState);
  const [updateError, setUpdateError] = useState("");
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [updateActionError, setUpdateActionError] = useState("");
  const [isDeletingUpdateId, setIsDeletingUpdateId] = useState(null);
  const [deleteUpdateConfirm, setDeleteUpdateConfirm] = useState({
    open: false,
    update: null,
  });
  const [notesError, setNotesError] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
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
    originDate: mockTreeData.originDate ?? "",
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
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhoto, setNewPhoto] = useState(initialPhotoUploadState);
  const [addPhotoError, setAddPhotoError] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [photoBeingEdited, setPhotoBeingEdited] = useState(null);
  const [photoEditData, setPhotoEditData] = useState({
    takenAt: "",
    description: "",
    rotationDegrees: 0,
  });
  const [photoEditError, setPhotoEditError] = useState("");
  const [isSavingPhotoEdit, setIsSavingPhotoEdit] = useState(false);
  const [photoActionError, setPhotoActionError] = useState("");
  const [isExportingTree, setIsExportingTree] = useState(false);
  const [exportStatusMessage, setExportStatusMessage] = useState(
    "We're preparing your tree export. This may take a few moments."
  );
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [photoDeleteError, setPhotoDeleteError] = useState("");
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(tree?.notes ?? "");

  const hasAttemptedRefreshRef = useRef(false);
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

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

  const ageYears = useMemo(
    () => calculateAgeInYears(tree.originDate || tree.acquisitionDate),
    [tree.originDate, tree.acquisitionDate]
  );

  const ageLabel = useMemo(() => {
    if (ageYears === null) {
      return "Age unknown";
    }
    if (ageYears < 1) {
      return "<1 year old";
    }

    const roundedAge = Math.round(ageYears);
    return `${roundedAge} years old`;
  }, [ageYears]);

  const widthLabel = useMemo(() => {
    const girth = Number(tree.currentGirth);
    if (!Number.isFinite(girth)) {
      return "Trunk width not recorded";
    }

    return `${girth.toFixed(1)} cm trunk`;
  }, [tree.currentGirth]);

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
      return [...tree.photos].sort((a, b) =>
        compareByTimestampDesc(
          a,
          b,
          (photo) => photo.takenAt ?? photo.date ?? photo.createdAt ?? photo.updatedAt ?? null
        )
      );
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
    if (!Array.isArray(tree?.measurements)) {
      return [];
    }

    return tree.measurements
      .map((measurement) => {
        const hasMeasurement =
          typeof measurement.trunkDiameter === "number" && !Number.isNaN(measurement.trunkDiameter);
        const hasDate = Boolean(measurement.measuredAt);

        if (!hasMeasurement || !hasDate) {
          return null;
        }

        const parsedDate = new Date(measurement.measuredAt);
        const timestamp = parsedDate.getTime();

        if (Number.isNaN(timestamp)) {
          return null;
        }

        if (measurement.trunkDiameter === 0) {
          return null;
        }

        return {
          dateValue: timestamp,
          dateLabel: parsedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          measurement: measurement.trunkDiameter,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.dateValue - b.dateValue);
  }, [tree?.measurements]);

  useEffect(() => {
    if (treeFromCollection) {
      setTree((prev) => ({
        ...prev,
        ...treeFromCollection,
      }));
      setAccolades(treeFromCollection.accolades ?? []);
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
        setAccolades(fetched.accolades ?? []);
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
      const linked = tree.photos.find(
        (photo) => String(photo.id) === String(newAccolade.photoId)
      );
      if (linked) {
        return linked;
      }
      const existing = accolades.find(
        (item) => String(item.id) === String(editingAccoladeId)
      );
      return existing?.photo ?? null;
    }

    return null;
  }, [
    newAccolade.photoId,
    newAccolade.uploadPreview,
    tree.photos,
    accolades,
    editingAccoladeId,
  ]);

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
      acquisitionDate: formatInputDate(tree.acquisitionDate),
      originDate: formatInputDate(tree.originDate),
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
    if (isSavingEdit || !tree?.id) {
      return;
    }

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
        await refreshSpecies();
      }

      const trimmedName = editData.name.trim();
      const normalizedStage = editData.developmentStage || tree.developmentStage;
      const normalizedAcquisition =
        editData.acquisitionDate || tree.acquisitionDate;
      const normalizedOrigin = editData.originDate || tree.originDate;

      const updated = await updateTree(tree.id, {
        name: trimmedName || tree.name,
        acquisition_date: normalizedAcquisition || null,
        origin_date: normalizedOrigin || null,
        notes: editData.notes ?? "",
        development_stage: normalizedStage,
        species_id: speciesId,
      });

      setTree(updated);
      setEditData({
        name: updated.name ?? "",
        acquisitionDate: formatInputDate(updated.acquisitionDate),
        originDate: formatInputDate(updated.originDate),
        developmentStage: updated.developmentStage ?? DEFAULT_STAGE_VALUE,
        notes: updated.notes ?? "",
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
    setNotesError("");
    setIsEditingNotes(true);
  };

  const cancelNotesEdit = () => {
    setNotesDraft(tree?.notes ?? "");
    setNotesError("");
    setIsEditingNotes(false);
  };

  const handleSaveNotes = async () => {
    if (!tree?.id || isSavingNotes) {
      return;
    }

    setNotesError("");
    setIsSavingNotes(true);

    try {
      const updatedTree = await updateTree(tree.id, { notes: notesDraft ?? "" });
      setTree(updatedTree);
      setEditData((prev) => ({
        ...prev,
        notes: updatedTree.notes ?? "",
      }));
      setNotesDraft(updatedTree.notes ?? "");
      setIsEditingNotes(false);
    } catch (error) {
      setNotesError(error.message || "Failed to save notes. Please try again.");
    } finally {
      setIsSavingNotes(false);
    }
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

  const handleExportTree = async () => {
    if (!tree?.id) {
      return;
    }

    setExportStatusMessage(
      "We're preparing your tree export. This may take a few moments."
    );
    setIsExportingTree(true);

    try {
      const response = await fetch(
        `${apiBaseUrl}/backup/bonsai/${tree.id}/export`,
        {
          method: "GET",
        }
      );
      const blob = await response.blob();

      if (!response.ok) {
        let message = `Export failed with status ${response.status}`;
        try {
          const errorText = await blob.text();
          const data = JSON.parse(errorText);
          if (data?.detail) {
            message = data.detail;
          }
        } catch {
          /* ignore parsing errors */
        }
        throw new Error(message);
      }

      setExportStatusMessage("Starting your download…");

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const sanitizedName = tree.name
        ? tree.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        : "tree";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileBase = sanitizedName || "tree";
      link.download = `${fileBase}_${tree.id}_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to export tree", error);
      alert(error.message || "Unable to export this tree.");
    } finally {
      setIsExportingTree(false);
      setExportStatusMessage(
        "We're preparing your tree export. This may take a few moments."
      );
    }
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
    setPhotoEditData({ takenAt: "", description: "", rotationDegrees: 0 });
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
      rotationDegrees: 0,
    });
    setPhotoActionError("");
    setShowEditPhotoModal(true);
  };

  const closeEditPhotoModal = () => {
    setShowEditPhotoModal(false);
    resetPhotoEditState();
  };

  const rotatePhotoLeft = () => {
    setPhotoEditData((prev) => ({
      ...prev,
      rotationDegrees: (prev.rotationDegrees + 270) % 360,
    }));
  };

  const rotatePhotoRight = () => {
    setPhotoEditData((prev) => ({
      ...prev,
      rotationDegrees: (prev.rotationDegrees + 90) % 360,
    }));
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

      if (photoEditData.rotationDegrees % 360 !== 0) {
        payload.rotate_degrees = photoEditData.rotationDegrees;
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

  const openDeletePhotoModal = (photo) => {
    if (!photo || photo.id === "placeholder") {
      return;
    }

    setPhotoDeleteError("");
    setPhotoActionError("");
    setPhotoToDelete(photo);
    setShowDeletePhotoModal(true);
  };

  const closeDeletePhotoModal = () => {
    setShowDeletePhotoModal(false);
    setPhotoToDelete(null);
    setPhotoDeleteError("");
    setIsDeletingPhoto(false);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!tree?.id || !photoToDelete?.id) {
      return;
    }

    setIsDeletingPhoto(true);
    setPhotoDeleteError("");
    setPhotoActionError("");

    try {
      const updatedTree = await deleteTreePhoto(tree.id, photoToDelete.id);
      if (updatedTree) {
        setTree(updatedTree);
        const photos = Array.isArray(updatedTree.photos) ? updatedTree.photos : [];
        setCurrentPhotoIndex((prev) => {
          if (photos.length === 0) {
            return 0;
          }
          return Math.min(prev, photos.length - 1);
        });
      }

      closeDeletePhotoModal();
    } catch (error) {
      const message =
        error?.message || "Failed to delete photo. Please try again.";
      setPhotoDeleteError(message);
      setPhotoActionError(message);
    } finally {
      setIsDeletingPhoto(false);
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
    const source = linkedPhoto ?? accolade.photo ?? null;

    if (!source) {
      return;
    }

    const displayUrl = source.fullUrl || source.url;
    if (!displayUrl) {
      return;
    }

    const subtitleParts = [];
    const dateValue = source.takenAt ?? source.date;
    if (dateValue) {
      subtitleParts.push(formatDate(dateValue));
    }
    if (source.description) {
      subtitleParts.push(source.description);
    }

    openPhotoViewer(
      {
        url: displayUrl,
        description: source.description,
      },
      {
        title: accolade.title,
        subtitle: subtitleParts.join(" • ") || undefined,
      }
    );
  };

  const openAccoladeModal = (accolade = null) => {
    if (accolade) {
      setNewAccolade({
        title: accolade.title,
        photoId: accolade.photoId ? String(accolade.photoId) : "",
        uploadPreview: "",
        uploadFile: null,
      });
      setEditingAccoladeId(accolade.id);
    } else {
      setNewAccolade(initialAccoladeState);
      setEditingAccoladeId(null);
    }

    if (accoladeFileInputRef.current) {
      accoladeFileInputRef.current.value = "";
    }

    setAccoladeError("");
    setAccoladeActionError("");
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
    setAccoladeError("");
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
    setAccoladeError("");
  };

  const handleAccoladeSave = async () => {
    if (!tree?.id || isSavingAccolade) {
      return;
    }

    const trimmedTitle = newAccolade.title.trim();
    if (!trimmedTitle) {
      setAccoladeError("Please provide a title for this accolade.");
      return;
    }

    setIsSavingAccolade(true);
    setAccoladeError("");

    try {
      let selectedPhotoId = newAccolade.photoId
        ? Number(newAccolade.photoId)
        : null;

      if (newAccolade.uploadFile) {
        const uploaded = await uploadTreePhoto(tree.id, {
          file: newAccolade.uploadFile,
          description: `Accolade photo – ${trimmedTitle}`,
        });
        selectedPhotoId = uploaded.id;
      }

      if (editingAccoladeId) {
        await updateTreeAccolade(tree.id, editingAccoladeId, {
          title: trimmedTitle,
          photo_id: selectedPhotoId ?? null,
        });
      } else {
        await createTreeAccolade(tree.id, {
          title: trimmedTitle,
          ...(selectedPhotoId ? { photo_id: selectedPhotoId } : {}),
        });
      }

      const refreshed = await fetchTreeById(tree.id);
      setTree(refreshed);
      setAccolades(refreshed.accolades ?? []);
      setAccoladeActionError("");

      setNewAccolade(initialAccoladeState);
      setEditingAccoladeId(null);
      setShowAccoladeModal(false);
      if (accoladeFileInputRef.current) {
        accoladeFileInputRef.current.value = "";
      }
    } catch (error) {
      setAccoladeError(error.message || "Unable to save this accolade.");
    } finally {
      setIsSavingAccolade(false);
    }
  };

  const requestDeleteAccolade = (accolade) => {
    setAccoladeActionError("");
    setDeleteAccoladeConfirm({ open: true, accolade });
  };

  const cancelDeleteAccolade = () => {
    if (
      isRemovingAccoladeId !== null &&
      deleteAccoladeConfirm.accolade?.id === isRemovingAccoladeId
    ) {
      return;
    }

    setDeleteAccoladeConfirm({ open: false, accolade: null });
    setAccoladeActionError("");
  };

  const handleRemoveAccolade = async (accoladeId) => {
    if (!tree?.id || !accoladeId || isRemovingAccoladeId === accoladeId) {
      return;
    }

    setIsRemovingAccoladeId(accoladeId);
    setAccoladeActionError("");

    try {
      await deleteTreeAccolade(tree.id, accoladeId);
      const refreshed = await fetchTreeById(tree.id);
      setTree(refreshed);
      setAccolades(refreshed.accolades ?? []);
      setDeleteAccoladeConfirm({ open: false, accolade: null });
    } catch (error) {
      setAccoladeActionError(
        error.message || "Unable to remove this accolade right now."
      );
    } finally {
      setIsRemovingAccoladeId(null);
    }
  };

  const resetUpdateForm = () => {
    setNewUpdate(initialUpdateState);
    setEditingUpdateId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUpdateError("");
  };

  const openAddUpdateModal = () => {
    resetUpdateForm();
    setUpdateActionError("");
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
    setUpdateError("");
    setUpdateActionError("");
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

  const handleSaveUpdate = async () => {
    if (!tree?.id || isSavingUpdate) {
      return;
    }

    setUpdateError("");
    const trimmedWork = newUpdate.workPerformed.trim();
    const trimmedReminderMessage = newUpdate.reminderMessage.trim();

    if (!newUpdate.date) {
      setUpdateError("Please select a date for this update.");
      return;
    }

    if (!trimmedWork) {
      setUpdateError("Describe the work performed before saving the update.");
      return;
    }

    if (
      !editingUpdateId &&
      newUpdate.addReminder &&
      (!trimmedReminderMessage || !newUpdate.reminderDueDate)
    ) {
      setUpdateError(
        "Add a reminder message and due date to create the follow-up reminder."
      );
      return;
    }

    const parsedGirth =
      newUpdate.girth.trim() !== "" && !Number.isNaN(Number(newUpdate.girth))
        ? Number(newUpdate.girth)
        : null;

    const performedAt = `${newUpdate.date}T00:00:00`;

    setIsSavingUpdate(true);

    try {
      if (editingUpdateId) {
        await updateTreeUpdate(tree.id, editingUpdateId, {
          title: trimmedWork,
          description: trimmedWork,
          performed_at: performedAt,
        });
      } else {
        const createdUpdate = await createTreeUpdate(tree.id, {
          title: trimmedWork,
          description: trimmedWork,
          performed_at: performedAt,
        });

        if (parsedGirth !== null) {
          await createTreeMeasurement(tree.id, {
            measured_at: performedAt,
            trunk_diameter_cm: parsedGirth,
          });
        }

        if (newUpdate.photoFile) {
          const photoPayload = {
            file: newUpdate.photoFile,
            description: `Update photo – ${trimmedWork}`,
            takenAt: newUpdate.date,
            updateId: createdUpdate.id,
          };
          await uploadTreePhoto(tree.id, photoPayload);
        }

        if (newUpdate.addReminder) {
          const reminder = {
            id: Date.now(),
            treeId: tree.id,
            treeName: tree.name,
            message: trimmedReminderMessage,
            dueDate: newUpdate.reminderDueDate,
          };
          const updatedReminders = appendReminderToStorage(reminder);
          setReminders(updatedReminders);
        }
      }

      const refreshed = await fetchTreeById(tree.id);
      setTree(refreshed);
      setAccolades(refreshed.accolades ?? []);
      setUpdateActionError("");

      resetUpdateForm();
      setShowUpdateModal(false);
    } catch (error) {
      setUpdateError(error.message || "Unable to save this update.");
    } finally {
      setIsSavingUpdate(false);
    }
  };

  const requestDeleteUpdate = (update) => {
    setUpdateActionError("");
    setDeleteUpdateConfirm({ open: true, update });
  };

  const cancelDeleteUpdate = () => {
    if (
      isDeletingUpdateId !== null &&
      deleteUpdateConfirm.update?.id === isDeletingUpdateId
    ) {
      return;
    }

    setDeleteUpdateConfirm({ open: false, update: null });
    setUpdateActionError("");
  };

  const handleDeleteUpdate = async (updateOrId) => {
    if (!tree?.id) {
      return;
    }

    const updateRecord =
      typeof updateOrId === "object" && updateOrId !== null
        ? updateOrId
        : tree?.updates?.find(
            (item) => Number(item.id) === Number(updateOrId)
          ) ?? null;
    const updateId =
      typeof updateOrId === "object" && updateOrId !== null
        ? updateOrId.id
        : updateOrId;

    if (!updateId || isDeletingUpdateId === updateId) {
      return;
    }

    const toDateKey = (input) => {
      if (!input) {
        return null;
      }
      const parsed = new Date(input);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`;
    };

    const updateDateKey = toDateKey(
      updateRecord?.performedAt ?? updateRecord?.date ?? null
    );

    const measurementForUpdate =
      updateDateKey && Array.isArray(tree?.measurements)
        ? tree.measurements.find((measurement) => {
            const measurementKey = toDateKey(measurement.measuredAt);
            return measurementKey === updateDateKey;
          }) ?? null
        : null;

    setIsDeletingUpdateId(updateId);
    setUpdateActionError("");

    try {
      await deleteTreeUpdate(tree.id, updateId);
      if (measurementForUpdate) {
        try {
          await deleteTreeMeasurement(tree.id, measurementForUpdate.id);
        } catch (measurementError) {
          console.error(
            "Failed to delete measurement associated with the update",
            measurementError
          );
          throw new Error(
            measurementError?.message ||
              "The update was removed, but its measurement could not be deleted."
          );
        }
      }
      const refreshed = await fetchTreeById(tree.id);
      setTree(refreshed);
      setAccolades(refreshed.accolades ?? []);
      setDeleteUpdateConfirm({ open: false, update: null });
    } catch (error) {
      setUpdateActionError(
        error.message || "Unable to delete this update right now."
      );
    } finally {
      setIsDeletingUpdateId(null);
    }
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
                  disabled={isSavingNotes}
                  className={`rounded-lg px-3 py-1 text-sm font-medium text-white transition ${
                    isSavingNotes
                      ? "bg-green-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isSavingNotes ? "Saving…" : "Save Notes"}
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
              <MarkdownReadmeEditor
                value={notesDraft}
                onChange={setNotesDraft}
                rows={12}
                placeholder="Create a README-style log for this tree with Markdown headings, lists, and tables."
                autoFocus
              />
              {notesError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {notesError}
                </p>
              )}
            </div>
          ) : hasNotes ? (
            <div className="markdown-body prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-green-700 prose-li:marker:text-green-600">
              <ReactMarkdown
                remarkPlugins={[remarkSimpleGfmTables]}
                components={markdownComponents}
              >
                {tree.notes}
              </ReactMarkdown>
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
              <button
                type="button"
                onClick={() => openDeletePhotoModal(currentPhoto)}
                disabled={isDeletingPhoto}
                className="rounded-full bg-white/90 p-2 text-rose-600 shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Delete photo"
              >
                <Trash2 className="w-4 h-4" />
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

      {updateActionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {updateActionError}
        </p>
      )}

      <div className="space-y-4">
        {tree.updates.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center">
            No updates yet. Add one to start tracking this tree.
          </p>
        ) : (
          tree.updates.map((update) => (
            <div key={update.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow transition">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(update.date)}
                  </div>
                  {typeof update.girth === "number" && (
                    <div className="flex items-center gap-2 mt-1">
                      <Ruler className="w-4 h-4" />
                      <span>{update.girth} cm width</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditUpdateModal(update)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Edit tree update"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteUpdate(update)}
                    className="text-gray-400 transition hover:text-red-600 disabled:opacity-50"
                    aria-label="Delete tree update"
                    disabled={
                      isDeletingUpdateId === update.id ||
                      (deleteUpdateConfirm.open &&
                        deleteUpdateConfirm.update?.id === update.id)
                    }
                  >
                    {isDeletingUpdateId === update.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-gray-700">{update.workPerformed}</p>
            </div>
          ))
        )}
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
    <>
      <ExportProgressOverlay
        open={isExportingTree}
        title="Preparing tree export"
        description={exportStatusMessage}
      />
      <div className="min-h-screen bg-gray-50 px-2 sm:px-4 lg:px-6">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto w-full max-w-[1800px] px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3 sm:w-auto">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Collection</span>
                </button>
                <div className="flex items-center gap-1.5 sm:hidden">
                  <button
                    onClick={handleExportTree}
                    aria-label="Export tree"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={openEditModal}
                    aria-label="Edit tree"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white shadow-sm transition hover:bg-green-700"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={openMoveToGraveyardModal}
                    aria-label="Move tree to graveyard"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-700 transition hover:bg-gray-300"
                  >
                    <Skull className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="hidden flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  onClick={handleExportTree}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Tree</span>
                </button>
                <button
                  onClick={openEditModal}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 sm:w-auto"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Tree</span>
                </button>
                <button
                  onClick={openMoveToGraveyardModal}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-300 sm:w-auto"
                >
                  <Skull className="h-4 w-4" />
                  <span>Move to Graveyard</span>
                </button>
              </div>
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
          <div className="hidden md:block bg-white rounded-lg shadow-sm p-6">
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

            {accoladeActionError && (
              <p className="mb-3 text-sm text-red-600">{accoladeActionError}</p>
            )}
            {accolades.length > 0 ? (
              <ul className="space-y-3 text-sm text-gray-700">
                {accolades.map((accolade) => {
                  const linkedPhoto = accolade.photoId
                    ? tree.photos.find((photo) => String(photo.id) === String(accolade.photoId))
                    : null;
                  const displayPhoto = linkedPhoto ?? accolade.photo ?? null;
                  const canPreview = Boolean(displayPhoto?.url || displayPhoto?.fullUrl);
                  const subtitleParts = [];
                  const photoDate = displayPhoto?.date ?? displayPhoto?.takenAt ?? null;
                  if (photoDate) {
                    subtitleParts.push(formatDate(photoDate));
                  }
                  if (displayPhoto?.description) {
                    subtitleParts.push(displayPhoto.description);
                  }

                  return (
                    <li
                      key={accolade.id}
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
                          <img
                            src={displayPhoto.thumbnailUrl || displayPhoto.url || displayPhoto.fullUrl}
                            alt={displayPhoto.description || 'Accolade photo'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Camera className="h-6 w-6 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{accolade.title}</p>
                        <p className="text-xs text-gray-500">
                          {subtitleParts.length > 0
                            ? subtitleParts.join(' • ')
                            : 'No photo attached'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAccoladeModal(accolade);
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
                            requestDeleteAccolade(accolade);
                          }}
                          className="text-gray-400 transition hover:text-red-600 disabled:opacity-50"
                          aria-label="Delete accolade"
                          disabled={
                            isRemovingAccoladeId === accolade.id ||
                            (deleteAccoladeConfirm.open &&
                              deleteAccoladeConfirm.accolade?.id === accolade.id)
                          }
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
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  <FieldLabel required>Reason</FieldLabel>
                </span>
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

            {updateError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {updateError}
              </p>
            )}

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              <FieldLabel required>Date</FieldLabel>
              <DatePicker
                value={newUpdate.date}
                onChange={(event) =>
                  setNewUpdate((prev) => ({ ...prev, date: event.target.value }))
                }
                aria-required="true"
                placeholder="Select update date"
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
              <FieldLabel required>Work Performed</FieldLabel>
              <textarea
                value={newUpdate.workPerformed}
                onChange={(e) => setNewUpdate((prev) => ({ ...prev, workPerformed: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent min-h-[120px]"
                placeholder="Describe the work that was completed"
                aria-required="true"
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
                      <FieldLabel required>Reminder Message</FieldLabel>
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
                        aria-required="true"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-gray-700">
                      <FieldLabel required>Reminder Due Date</FieldLabel>
                      <DatePicker
                        value={newUpdate.reminderDueDate}
                        onChange={(event) =>
                          setNewUpdate((prev) => ({
                            ...prev,
                            reminderDueDate: event.target.value,
                          }))
                        }
                        placeholder="Choose reminder due date"
                        aria-required="true"
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
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:cursor-not-allowed disabled:bg-green-300"
                disabled={isSavingUpdate}
              >
                {isSavingUpdate
                  ? 'Saving…'
                  : editingUpdateId
                  ? 'Save Changes'
                  : 'Save Update'}
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
                <DatePicker
                  value={newPhoto.takenAt}
                  onChange={(event) =>
                    setNewPhoto((prev) => ({
                      ...prev,
                      takenAt: event.target.value,
                    }))
                  }
                  placeholder="Select photo date"
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
                  className="h-48 w-full object-cover transition-transform duration-300"
                  style={{ transform: `rotate(${photoEditData.rotationDegrees}deg)` }}
                />
              </div>
            )}

            {photoBeingEdited?.url && (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={rotatePhotoLeft}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  Rotate left
                </button>
                <button
                  type="button"
                  onClick={rotatePhotoRight}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  <RotateCw className="h-4 w-4" />
                  Rotate right
                </button>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Photo Date
                <DatePicker
                  value={photoEditData.takenAt}
                  onChange={(event) =>
                    setPhotoEditData((prev) => ({
                      ...prev,
                      takenAt: event.target.value,
                    }))
                  }
                  placeholder="Select photo date"
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

      <ConfirmDialog
        open={deleteUpdateConfirm.open}
        title="Delete tree update"
        description={
          deleteUpdateConfirm.update
            ? `This will permanently remove the update from ${formatDate(
                deleteUpdateConfirm.update.date
              )}. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete update"
        destructive
        isLoading={
          deleteUpdateConfirm.update
            ? isDeletingUpdateId === deleteUpdateConfirm.update.id
            : false
        }
        error={updateActionError}
        onCancel={cancelDeleteUpdate}
        onConfirm={() => handleDeleteUpdate(deleteUpdateConfirm.update ?? null)}
      />

      <ConfirmDialog
        open={deleteAccoladeConfirm.open}
        title="Remove accolade"
        description={
          deleteAccoladeConfirm.accolade
            ? `This will remove the accolade "${deleteAccoladeConfirm.accolade.title}" from ${tree?.name || "this tree"}. This action cannot be undone.`
            : ""
        }
        confirmLabel="Remove accolade"
        destructive
        isLoading={
          deleteAccoladeConfirm.accolade
            ? isRemovingAccoladeId === deleteAccoladeConfirm.accolade.id
            : false
        }
        error={accoladeActionError}
        onCancel={cancelDeleteAccolade}
        onConfirm={() =>
          handleRemoveAccolade(deleteAccoladeConfirm.accolade?.id ?? null)
        }
      />

      {showDeletePhotoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative space-y-4">
            <button
              type="button"
              onClick={closeDeletePhotoModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close delete photo dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Delete this photo?</h3>
                <p className="text-sm text-gray-600">
                  This action will permanently remove the photo and its thumbnail from your collection.
                </p>
              </div>
            </div>

            {photoDeleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {photoDeleteError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeDeletePhotoModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePhoto}
                disabled={isDeletingPhoto}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {isDeletingPhoto ? "Deleting..." : "Delete photo"}
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
                setEditingAccoladeId(null);
                setAccoladeError("");
                if (accoladeFileInputRef.current) {
                  accoladeFileInputRef.current.value = "";
                }
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-800">
              {editingAccoladeId ? 'Edit Accolade' : 'Add Accolade'}
            </h3>

            {accoladeError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {accoladeError}
              </p>
            )}

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
                  setEditingAccoladeId(null);
                  setAccoladeError("");
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
                disabled={isSavingAccolade}
              >
                {isSavingAccolade
                  ? 'Saving…'
                  : editingAccoladeId
                  ? 'Save Changes'
                  : 'Add Accolade'}
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

            <div className="space-y-4">
              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Tree Name
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </label>

              <div className="flex flex-col text-sm font-medium text-gray-700 gap-1">
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

                  {editSpeciesMode === "new" && (
                    <div className="space-y-3 rounded-lg border border-dashed border-green-200 bg-green-50/60 p-3 text-xs text-gray-600">
                      <p>
                        Adding a new species will also save it to your library.
                      </p>
                      <div className="space-y-1">
                        <label className="font-medium text-gray-700">
                          <FieldLabel required>Common Name</FieldLabel>
                        </label>
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
                <DatePicker
                  value={editData.acquisitionDate}
                  onChange={(event) =>
                    setEditData((prev) => ({
                      ...prev,
                      acquisitionDate: event.target.value,
                    }))
                  }
                  placeholder="Select acquisition date"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Origin Date
                <DatePicker
                  value={editData.originDate}
                  onChange={(event) =>
                    setEditData((prev) => ({
                      ...prev,
                      originDate: event.target.value,
                    }))
                  }
                  placeholder="Select origin date"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Development Stage
                <select
                  value={editData.developmentStage}
                  onChange={(e) => setEditData((prev) => ({ ...prev, developmentStage: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white text-gray-700"
                >
                  {DEVELOPMENT_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col text-sm font-medium text-gray-700 gap-1">
                Notes
                <textarea
                  rows={4}
                  value={editData.notes}
                  onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
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
    </>
  );
};

export default TreeDetail;
