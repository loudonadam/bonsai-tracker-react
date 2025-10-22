/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";

const SpeciesContext = createContext(null);

export const SpeciesProvider = ({ children }) => {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizeSpecies = useCallback((entry) => ({
    id: entry.id,
    commonName: entry.common_name,
    scientificName: entry.scientific_name,
    notes: entry.notes,
    treeCount: entry.tree_count ?? 0,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  }), []);

  const refreshSpecies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchSpecies();
      setSpecies((data ?? []).map(normalizeSpecies));
    } catch (err) {
      console.error("Failed to load species", err);
      setError(err instanceof Error ? err.message : "Failed to load species");
    } finally {
      setLoading(false);
    }
  }, [normalizeSpecies]);

  useEffect(() => {
    refreshSpecies();
  }, [refreshSpecies]);

  const addSpecies = useCallback(async (data) => {
    const payload = {
      common_name: data.commonName,
      scientific_name: data.scientificName,
      notes: data.notes,
    };
    const created = await api.createSpecies(payload);
    const normalized = normalizeSpecies(created);
    setSpecies((prev) => [...prev, normalized]);
    return normalized;
  }, [normalizeSpecies]);

  const updateSpecies = useCallback(async (id, updates) => {
    const payload = {
      common_name: updates.commonName,
      scientific_name: updates.scientificName,
      notes: updates.notes,
    };
    const updated = await api.updateSpecies(id, payload);
    const normalized = normalizeSpecies(updated);
    setSpecies((prev) =>
      prev.map((item) => (Number(item.id) === Number(normalized.id) ? normalized : item))
    );
    return normalized;
  }, [normalizeSpecies]);

  const incrementTreeCount = useCallback((id, delta = 1) => {
    if (!delta) return;
    setSpecies((prev) =>
      prev.map((item) => {
        if (Number(item.id) !== Number(id)) return item;
        const next = (item.treeCount ?? 0) + delta;
        return { ...item, treeCount: next < 0 ? 0 : next };
      })
    );
  }, []);

  const value = useMemo(
    () => ({
      species,
      addSpecies,
      updateSpecies,
      incrementTreeCount,
      refreshSpecies,
      loading,
      error,
    }),
    [species, addSpecies, updateSpecies, incrementTreeCount, refreshSpecies, loading, error]
  );

  return <SpeciesContext.Provider value={value}>{children}</SpeciesContext.Provider>;
};

export const useSpecies = () => {
  const context = useContext(SpeciesContext);
  if (!context) {
    throw new Error("useSpecies must be used within a SpeciesProvider");
  }
  return context;
};

export default SpeciesContext;
