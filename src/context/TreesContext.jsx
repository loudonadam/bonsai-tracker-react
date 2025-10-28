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
import { apiClient, getApiBaseUrl } from "../services/apiClient";

const TreesContext = createContext(null);

const MEDIA_URL_CACHE = { base: undefined };

const resolveMediaUrl = (input) => {
  if (!input) {
    return null;
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  if (MEDIA_URL_CACHE.base === undefined) {
    const baseUrl = getApiBaseUrl();
    try {
      const reference =
        typeof window !== "undefined"
          ? window.location.href
          : "http://localhost";
      const parsed = new URL(baseUrl, reference);
      const pathSegments = parsed.pathname
        .split("/")
        .filter(Boolean);
      if (pathSegments.length > 0) {
        pathSegments.pop();
      }
      const basePath = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "";
      MEDIA_URL_CACHE.base = `${parsed.origin}${basePath}`;
    } catch {
      MEDIA_URL_CACHE.base =
        typeof window !== "undefined" ? window.location.origin : "";
    }
  }

  if (!MEDIA_URL_CACHE.base) {
    return input;
  }

  const normalized = input.startsWith("/") ? input : `/${input}`;
  return `${MEDIA_URL_CACHE.base}${normalized}`;
};

const mapPhoto = (photo) => {
  const thumbnail = photo.thumbnail_url ?? photo.thumbnailUrl ?? null;
  const full = photo.full_url ?? photo.fullUrl ?? null;
  const resolvedThumbnail = resolveMediaUrl(thumbnail);
  const resolvedFull = resolveMediaUrl(full);

  return {
    id: photo.id,
    url: resolvedThumbnail || resolvedFull,
    thumbnailUrl: resolvedThumbnail,
    fullUrl: resolvedFull,
    description: photo.description ?? "",
    date: photo.taken_at ?? photo.takenAt ?? null,
    takenAt: photo.taken_at ?? photo.takenAt ?? null,
    isPrimary: photo.is_primary ?? photo.isPrimary ?? false,
  };
};

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

const mapGraveyardEntry = (entry) => {
  if (!entry) {
    return null;
  }

  return {
    id: entry.id,
    bonsaiId: entry.bonsai_id ?? entry.bonsaiId ?? null,
    category: entry.category ?? "dead",
    note: entry.note ?? "",
    movedAt: entry.moved_at ?? entry.movedAt ?? null,
  };
};

const mapBonsai = (entry) => {
  const photos = Array.isArray(entry.photos) ? entry.photos.map(mapPhoto) : [];

  let primaryPhoto = null;
  if (entry.primary_photo) {
    primaryPhoto = mapPhoto(entry.primary_photo);
  } else if (photos.length > 0) {
    primaryPhoto = photos.find((photo) => photo.isPrimary) ?? photos[0];
  }
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
    photoUrl: primaryPhoto?.thumbnailUrl || primaryPhoto?.url || null,
    fullPhotoUrl: primaryPhoto?.fullUrl || null,
    photos,
    updates: Array.isArray(entry.updates) ? entry.updates.map(mapUpdate) : [],
    measurements: Array.isArray(entry.measurements)
      ? entry.measurements.map(mapMeasurement)
      : [],
    reminders: Array.isArray(entry.notifications)
      ? entry.notifications.map(mapNotification)
      : [],
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
    graveyardEntry: mapGraveyardEntry(entry.graveyard_entry ?? entry.graveyardEntry),
  };
};

export const TreesProvider = ({ children }) => {
  const [trees, setTrees] = useState([]);
  const [graveyard, setGraveyard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const partitionCollections = (items) => {
    const activeTrees = [];
    const graveyardEntries = [];

    items.forEach((tree) => {
      const entry = tree.graveyardEntry;
      if (tree.status === "active" || !entry) {
        activeTrees.push({ ...tree, graveyardEntry: null });
      } else {
        graveyardEntries.push({
          id: entry.id,
          tree: { ...tree },
          category: entry.category ?? "dead",
          note: entry.note ?? "",
          movedAt: entry.movedAt,
        });
      }
    });

    return { activeTrees, graveyardEntries };
  };

  const placeTreeInCollections = useCallback((tree) => {
    setTrees((prevTrees) => {
      const filtered = prevTrees.filter((item) => Number(item.id) !== Number(tree.id));
      if (tree.status === "active" || !tree.graveyardEntry) {
        return [{ ...tree, graveyardEntry: null }, ...filtered];
      }
      return filtered;
    });

    setGraveyard((prevEntries) => {
      const filtered = prevEntries.filter(
        (entry) => Number(entry.tree.id) !== Number(tree.id)
      );
      if (tree.status !== "active" && tree.graveyardEntry) {
        return [
          {
            id: tree.graveyardEntry.id,
            tree: { ...tree },
            category: tree.graveyardEntry.category ?? "dead",
            note: tree.graveyardEntry.note ?? "",
            movedAt: tree.graveyardEntry.movedAt,
          },
          ...filtered,
        ];
      }
      return filtered;
    });
  }, []);

  const updateTreeReferences = useCallback((treeId, updater) => {
    let updatedTree = null;

    setTrees((prevTrees) =>
      prevTrees.map((tree) => {
        if (Number(tree.id) !== Number(treeId)) {
          return tree;
        }
        updatedTree = updater(tree);
        return updatedTree;
      })
    );

    setGraveyard((prevEntries) =>
      prevEntries.map((entry) => {
        if (Number(entry.tree.id) !== Number(treeId)) {
          return entry;
        }
        const nextTree = updater(entry.tree);
        updatedTree = nextTree;
        return { ...entry, tree: nextTree };
      })
    );

    return updatedTree;
  }, []);

  const refreshTrees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/bonsai/");
      const mapped = response.map(mapBonsai);
      const { activeTrees, graveyardEntries } = partitionCollections(mapped);
      setTrees(activeTrees);
      setGraveyard(graveyardEntries);
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
        const mappedPhoto = mapPhoto(photo);
        mapped = {
          ...mapped,
          photos: [mappedPhoto, ...mapped.photos],
          photoUrl:
            mappedPhoto.thumbnailUrl || mappedPhoto.url || mappedPhoto.fullUrl,
          fullPhotoUrl: mappedPhoto.fullUrl,
        };
      }

      const detail = await apiClient.get(`/bonsai/${mapped.id}`);
      mapped = mapBonsai(detail);

      placeTreeInCollections(mapped);
      return mapped;
    },
    [placeTreeInCollections]
  );

  const fetchTreeById = useCallback(async (treeId) => {
    const detail = await apiClient.get(`/bonsai/${treeId}`);
    const mapped = mapBonsai(detail);
    placeTreeInCollections(mapped);
    return mapped;
  }, [placeTreeInCollections]);

  const uploadTreePhoto = useCallback(async (treeId, data) => {
    if (!data?.file) {
      throw new Error("A photo file is required.");
    }

    if (typeof File !== "undefined" && !(data.file instanceof File)) {
      throw new Error("The provided photo must be a valid file object.");
    }

    const formData = new FormData();
    formData.append("file", data.file);
    if (data.description) {
      formData.append("description", data.description);
    }
    if (data.takenAt) {
      formData.append("taken_at", data.takenAt);
    }
    if (data.isPrimary) {
      formData.append("is_primary", "true");
    }

    const photo = await apiClient.postForm(`/bonsai/${treeId}/photos`, formData);
    const mappedPhoto = mapPhoto(photo);

    updateTreeReferences(treeId, (tree) => {
      const existingPhotos = Array.isArray(tree.photos) ? tree.photos : [];
      const updatedPhotos = [mappedPhoto, ...existingPhotos];

      const shouldRefreshPreview =
        mappedPhoto.isPrimary || !tree.photoUrl || existingPhotos.length === 0;

      return {
        ...tree,
        photos: updatedPhotos,
        photoUrl: shouldRefreshPreview
          ? mappedPhoto.thumbnailUrl || mappedPhoto.url || mappedPhoto.fullUrl || tree.photoUrl
          : tree.photoUrl,
        fullPhotoUrl: shouldRefreshPreview
          ? mappedPhoto.fullUrl || tree.fullPhotoUrl || mappedPhoto.url || null
          : tree.fullPhotoUrl,
      };
    });

    return mappedPhoto;
  }, [updateTreeReferences]);

  const getTreeById = useCallback(
    (treeId) => {
      const tree = trees.find((item) => Number(item.id) === Number(treeId));
      if (tree) {
        return tree;
      }
      const graveyardEntry = graveyard.find(
        (entry) => Number(entry.tree.id) === Number(treeId)
      );
      return graveyardEntry?.tree ?? null;
    },
    [trees, graveyard]
  );

  const moveTreeToGraveyard = useCallback(
    async (treeId, { category, note }) => {
      await apiClient.post(`/bonsai/${treeId}/graveyard`, {
        category,
        note: note?.trim() ?? "",
      });
      return fetchTreeById(treeId);
    },
    [fetchTreeById]
  );

  const restoreTreeFromGraveyard = useCallback(
    async (treeId) => {
      const detail = await apiClient.post(`/bonsai/${treeId}/restore`, {});
      const mapped = mapBonsai(detail);
      placeTreeInCollections(mapped);
      return mapped;
    },
    [placeTreeInCollections]
  );

  const updateTree = useCallback(
    async (treeId, data) => {
      const updated = await apiClient.patch(`/bonsai/${treeId}`, data);
      const mapped = mapBonsai(updated);
      placeTreeInCollections(mapped);
      return mapped;
    },
    [placeTreeInCollections]
  );

  const updateTreePhoto = useCallback(
    async (treeId, photoId, data) => {
      const response = await apiClient.patch(
        `/bonsai/${treeId}/photos/${photoId}`,
        data
      );
      const mappedPhoto = mapPhoto(response);

      updateTreeReferences(treeId, (tree) => {
        const existingPhotos = Array.isArray(tree.photos) ? tree.photos : [];
        let didReplace = false;
        let updatedPhotos = existingPhotos.map((photo) => {
          if (Number(photo.id) === Number(photoId)) {
            didReplace = true;
            return mappedPhoto;
          }
          if (mappedPhoto.isPrimary) {
            return { ...photo, isPrimary: false };
          }
          return photo;
        });

        if (!didReplace) {
          updatedPhotos = [mappedPhoto, ...existingPhotos];
        }

        const primaryPhoto =
          mappedPhoto.isPrimary
            ? mappedPhoto
            : updatedPhotos.find((photo) => photo.isPrimary) ?? updatedPhotos[0];

        return {
          ...tree,
          photos: updatedPhotos,
          photoUrl: primaryPhoto
            ? primaryPhoto.thumbnailUrl || primaryPhoto.url || primaryPhoto.fullUrl || tree.photoUrl
            : tree.photoUrl,
          fullPhotoUrl: primaryPhoto
            ? primaryPhoto.fullUrl || primaryPhoto.url || tree.fullPhotoUrl
            : tree.fullPhotoUrl,
        };
      });

      return mappedPhoto;
    },
    [updateTreeReferences]
  );

  const deleteTreePermanently = useCallback(async (treeId) => {
    await apiClient.delete(`/bonsai/${treeId}`);
    setGraveyard((prev) =>
      prev.filter((entry) => Number(entry.tree.id) !== Number(treeId))
    );
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
      restoreTreeFromGraveyard,
      updateTree,
      deleteTreePermanently,
      fetchTreeById,
      uploadTreePhoto,
      updateTreePhoto,
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
      restoreTreeFromGraveyard,
      updateTree,
      deleteTreePermanently,
      fetchTreeById,
      uploadTreePhoto,
      updateTreePhoto,
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
