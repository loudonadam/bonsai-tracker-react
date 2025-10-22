/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { API_BASE_URL } from "../services/api";
import { DEFAULT_STAGE_VALUE } from "../utils/developmentStages";

const TreesContext = createContext(null);

const resolveUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
};

export const TreesProvider = ({ children }) => {
  const [trees, setTrees] = useState([]);
  const [graveyard, setGraveyard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizeTree = useCallback((tree) => ({
    id: tree.id,
    name: tree.name,
    species: tree.species,
    speciesId: tree.species_id,
    acquisitionDate: tree.acquisition_date,
    originDate: tree.origin_date,
    currentGirth: tree.current_girth,
    trunkWidth: tree.trunk_width,
    notes: tree.notes,
    developmentStage: tree.development_stage || DEFAULT_STAGE_VALUE,
    lastUpdate: tree.last_update,
    photoUrl: resolveUrl(tree.photo_url),
  }), []);

  const normalizeGraveyardEntry = useCallback((entry) => ({
    id: entry.id,
    category: entry.category,
    note: entry.note,
    movedAt: entry.moved_at,
    tree: {
      id: entry.tree_id,
      name: entry.tree_name,
      species: entry.tree_species,
      photoUrl: resolveUrl(entry.photo_url),
    },
  }), []);

  const refreshTrees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchTrees();
      setTrees((data ?? []).map(normalizeTree));
    } catch (err) {
      console.error("Failed to load trees", err);
      setError(err instanceof Error ? err.message : "Failed to load trees");
    } finally {
      setLoading(false);
    }
  }, [normalizeTree]);

  const refreshGraveyard = useCallback(async () => {
    try {
      const data = await api.fetchGraveyard();
      setGraveyard((data ?? []).map(normalizeGraveyardEntry));
    } catch (err) {
      console.error("Failed to load graveyard", err);
    }
  }, [normalizeGraveyardEntry]);

  useEffect(() => {
    refreshTrees();
    refreshGraveyard();
  }, [refreshTrees, refreshGraveyard]);

  const addTree = useCallback(
    async (treeData) => {
      const response = await api.createTree(treeData);
      const normalized = normalizeTree(response);
      setTrees((prev) => [...prev, normalized]);
      return normalized;
    },
    [normalizeTree]
  );

  const getTreeById = useCallback(
    async (treeId) => {
      const detail = await api.fetchTreeDetail(treeId);
      return {
        ...normalizeTree(detail),
        photos: (detail.photos ?? []).map((photo) => ({
          id: photo.id,
          url: resolveUrl(photo.original_url),
          thumbnailUrl: resolveUrl(photo.thumbnail_url),
          originalUrl: resolveUrl(photo.original_url),
          description: photo.description,
          date: photo.photo_date,
        })),
        updates: (detail.updates ?? []).map((update) => ({
          id: update.id,
          date: update.update_date,
          workPerformed: update.work_performed,
          girth: update.girth,
        })),
      };
    },
    [normalizeTree]
  );

  const moveTreeToGraveyard = useCallback(
    async (treeId, { category, note }) => {
      const entry = await api.moveTreeToGraveyard(treeId, { category, note });
      setTrees((prev) => prev.filter((tree) => Number(tree.id) !== Number(treeId)));
      setGraveyard((prev) => {
        const filtered = prev.filter((item) => Number(item.tree.id) !== Number(treeId));
        return [...filtered, normalizeGraveyardEntry(entry)];
      });
      return entry;
    },
    [normalizeGraveyardEntry]
  );

  const deleteTreePermanently = useCallback(async (entryId) => {
    await api.deleteGraveyardEntry(entryId);
    setGraveyard((prev) => prev.filter((entry) => Number(entry.id) !== Number(entryId)));
  }, []);

  const value = useMemo(
    () => ({
      trees,
      graveyard,
      addTree,
      getTreeById,
      moveTreeToGraveyard,
      deleteTreePermanently,
      refreshTrees,
      refreshGraveyard,
      loading,
      error,
    }),
    [
      trees,
      graveyard,
      addTree,
      getTreeById,
      moveTreeToGraveyard,
      deleteTreePermanently,
      refreshTrees,
      refreshGraveyard,
      loading,
      error,
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
