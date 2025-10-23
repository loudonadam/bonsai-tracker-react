/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_STAGE_VALUE } from "../utils/developmentStages";
import { apiClient } from "../services/apiClient";

const TreesContext = createContext(null);

const mapPhoto = (photo) => ({
  id: photo.id,
  url: photo.thumbnail_url || photo.full_url,
  thumbnailUrl: photo.thumbnail_url,
  fullUrl: photo.full_url,
  description: photo.description ?? "",
  date: photo.taken_at ?? null,
  takenAt: photo.taken_at ?? null,
  isPrimary: photo.is_primary,
});

const mapUpdate = (entry) => ({
  id: entry.id,
  date: entry.performed_at ?? entry.created_at,
  title: entry.title,
  description: entry.description ?? "",
  workPerformed: entry.description ?? entry.title,
  performedAt: entry.performed_at ?? entry.created_at,
});

const mapMeasurement = (entry) => ({
  id: entry.id,
  measuredAt: entry.measured_at ?? entry.created_at,
  height: entry.height_cm,
  trunkDiameter: entry.trunk_diameter_cm,
  canopyWidth: entry.canopy_width_cm,
  notes: entry.notes ?? "",
});

const mapNotification = (entry) => ({
  id: entry.id,
  treeId: entry.bonsai_id,
  title: entry.title,
  message: entry.message,
  category: entry.category ?? "general",
  dueDate: entry.due_at ?? null,
  read: Boolean(entry.read),
  createdAt: entry.created_at,
});

const mapBonsai = (entry) => {
  const primaryPhoto = entry.primary_photo || entry.photos?.find((photo) => photo.is_primary) || entry.photos?.[0];
  const speciesName = entry.species
    ? `${entry.species.common_name}${entry.species.scientific_name ? ` (${entry.species.scientific_name})` : ""}`
    : "Unknown species";

  return {
    id: entry.id,
    name: entry.name,
    species: speciesName,
    speciesId: entry.species?.id ?? null,
    acquisitionDate: entry.acquisition_date ?? null,
    originDate: entry.origin_date ?? null,
    developmentStage: entry.development_stage || DEFAULT_STAGE_VALUE,
    status: entry.status,
    location: entry.location ?? "",
    notes: entry.notes ?? "",
    lastUpdate:
      entry.latest_update?.performed_at ||
      entry.latest_update?.created_at ||
      entry.updated_at,
    currentGirth: entry.latest_measurement?.trunk_diameter_cm ?? null,
    photoUrl: primaryPhoto?.thumbnail_url || null,
    fullPhotoUrl: primaryPhoto?.full_url || null,
    photos: Array.isArray(entry.photos) ? entry.photos.map(mapPhoto) : [],
    updates: Array.isArray(entry.updates) ? entry.updates.map(mapUpdate) : [],
    measurements: Array.isArray(entry.measurements)
      ? entry.measurements.map(mapMeasurement)
      : [],
    reminders: Array.isArray(entry.notifications)
      ? entry.notifications.map(mapNotification)
      : [],
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
};

export const TreesProvider = ({ children }) => {
  const [trees, setTrees] = useState([]);
  const [graveyard, setGraveyard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshTrees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/bonsai");
      setTrees(response.map(mapBonsai));
      setError("");
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTrees();
  }, [refreshTrees]);

  const addTree = useCallback(
    async (treeData) => {
      const payload = {
        name: treeData.name,
        species_id: treeData.speciesId || null,
        acquisition_date: treeData.acquisitionDate || null,
        origin_date: treeData.originDate || null,
        notes: treeData.notes || "",
        location: treeData.location || undefined,
        development_stage:
          typeof treeData.developmentStage === "string"
            ? treeData.developmentStage.toLowerCase()
            : DEFAULT_STAGE_VALUE,
      };

      const created = await apiClient.post("/bonsai", payload);
      let mapped = mapBonsai(created);

      if (treeData.trunkWidth) {
        const measurementPayload = {
          measured_at: treeData.acquisitionDate || undefined,
          trunk_diameter_cm: Number(treeData.trunkWidth),
        };
        if (!Number.isNaN(measurementPayload.trunk_diameter_cm)) {
          await apiClient.post(`/bonsai/${mapped.id}/measurements`, measurementPayload);
        }
      }

      if (treeData.photo instanceof File) {
        const formData = new FormData();
        formData.append("file", treeData.photo);
        formData.append("description", `Primary photo for ${treeData.name}`);
        formData.append("is_primary", "true");
        if (treeData.acquisitionDate) {
          formData.append("taken_at", treeData.acquisitionDate);
        }
        const photo = await apiClient.postForm(`/bonsai/${mapped.id}/photos`, formData);
        mapped = {
          ...mapped,
          photos: [mapPhoto(photo), ...mapped.photos],
          photoUrl: photo.thumbnail_url || photo.full_url,
          fullPhotoUrl: photo.full_url,
        };
      }

      const detail = await apiClient.get(`/bonsai/${mapped.id}`);
      mapped = mapBonsai(detail);

      setTrees((prev) => [...prev, mapped]);
      return mapped;
    },
    []
  );

  const getTreeById = useCallback(
    (treeId) => trees.find((tree) => Number(tree.id) === Number(treeId)) ?? null,
    [trees]
  );

  const moveTreeToGraveyard = useCallback((treeId, { category, note }) => {
    setTrees((prevTrees) => {
      const treeToMove = prevTrees.find((tree) => Number(tree.id) === Number(treeId));
      if (!treeToMove) {
        return prevTrees;
      }

      setGraveyard((prev) => {
        const filtered = prev.filter((entry) => Number(entry.tree.id) !== Number(treeId));
        const entry = {
          id: treeToMove.id,
          tree: treeToMove,
          category,
          note: note?.trim() ?? "",
          movedAt: new Date().toISOString(),
        };
        return [...filtered, entry];
      });

      return prevTrees.filter((tree) => Number(tree.id) !== Number(treeId));
    });
  }, []);

  const deleteTreePermanently = useCallback((treeId) => {
    setGraveyard((prev) => prev.filter((entry) => Number(entry.tree.id) !== Number(treeId)));
  }, []);

  const value = useMemo(
    () => ({
      trees,
      graveyard,
      loading,
      error,
      refreshTrees,
      addTree,
      getTreeById,
      moveTreeToGraveyard,
      deleteTreePermanently,
    }),
    [
      trees,
      graveyard,
      loading,
      error,
      refreshTrees,
      addTree,
      getTreeById,
      moveTreeToGraveyard,
      deleteTreePermanently,
    ]
  );

  return <TreesContext.Provider value={value}>{children}</TreesContext.Provider>;
};

export const useTrees = () => {
  const context = useContext(TreesContext);
  if (!context) {
    throw new Error("useTrees must be used within a TreesProvider");
  }
  return context;
};

export default TreesContext;
