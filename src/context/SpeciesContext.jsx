/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiClient } from "../services/apiClient";

const SpeciesContext = createContext(null);

const mapSpecies = (entry) => ({
  id: entry.id,
  commonName: entry.common_name,
  scientificName: entry.scientific_name ?? "",
  notes: entry.care_instructions ?? entry.description ?? "",
  description: entry.description ?? "",
  careInstructions: entry.care_instructions ?? "",
  treeCount: entry.tree_count ?? 0,
  createdAt: entry.created_at,
  updatedAt: entry.updated_at,
});

export const SpeciesProvider = ({ children }) => {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshSpecies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/species");
      setSpecies(response.map(mapSpecies));
      setError("");
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSpecies();
  }, [refreshSpecies]);

  const addSpecies = useCallback(
    async (data) => {
      const payload = {
        common_name: data.commonName?.trim() || "Untitled Species",
        scientific_name: data.scientificName?.trim() || undefined,
        description: data.description ?? undefined,
        care_instructions: data.notes ?? data.careInstructions ?? undefined,
      };
      const created = await apiClient.post("/species", payload);
      const mapped = mapSpecies(created);
      setSpecies((prev) => [...prev, mapped]);
      return mapped;
    },
    []
  );

  const updateSpecies = useCallback(async (id, updates) => {
    const payload = {
      common_name: updates.commonName,
      scientific_name: updates.scientificName,
      description: updates.description,
      care_instructions: updates.notes ?? updates.careInstructions,
    };
    const updated = await apiClient.patch(`/species/${id}`, payload);
    const mapped = mapSpecies(updated);
    setSpecies((prev) =>
      prev.map((item) => (Number(item.id) === Number(id) ? mapped : item))
    );
    return mapped;
  }, []);

  const deleteSpecies = useCallback(async (id) => {
    await apiClient.delete(`/species/${id}`);
    setSpecies((prev) => prev.filter((item) => Number(item.id) !== Number(id)));
  }, []);

  const value = useMemo(
    () => ({
      species,
      loading,
      error,
      refreshSpecies,
      addSpecies,
      updateSpecies,
      deleteSpecies,
    }),
    [species, loading, error, refreshSpecies, addSpecies, updateSpecies, deleteSpecies]
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
