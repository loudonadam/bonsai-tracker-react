/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const SpeciesContext = createContext(null);

const initialSpecies = [
  {
    id: 1,
    commonName: "Japanese Maple",
    scientificName: "Acer palmatum",
    treeCount: 3,
    notes: `### Care Overview
- **Watering:** Keep soil moist but well-drained.
- **Repotting:** Every 2 years in early spring.
- **Light:** Partial shade during hot months.

#### Soil
Use a well-draining bonsai mix. I'll expand this later with exact ratios.`,
  },
  {
    id: 2,
    commonName: "Chinese Elm",
    scientificName: "Ulmus parvifolia",
    treeCount: 2,
    notes: `### Care Overview
- **Watering:** Regular watering, reduce in winter.
- **Pruning:** Trim back new shoots every 3–4 weeks.
- **Repotting:** Every 2–3 years in late winter.

Tips: This species tolerates wiring well. Replace placeholder text with your template note.`,
  },
];

export const SpeciesProvider = ({ children }) => {
  const [species, setSpecies] = useState(initialSpecies);

  const addSpecies = useCallback((data) => {
    const id = data.id ?? Date.now();
    const entry = {
      id,
      commonName: data.commonName?.trim() || "Untitled Species",
      scientificName: data.scientificName?.trim() || "",
      notes: data.notes ?? "",
      treeCount: Number.isFinite(data.treeCount) ? data.treeCount : 0,
    };

    setSpecies((prev) => [...prev, entry]);
    return entry;
  }, []);

  const updateSpecies = useCallback((id, updates) => {
    setSpecies((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(id)
          ? {
              ...item,
              commonName: updates.commonName?.trim() ?? item.commonName,
              scientificName: updates.scientificName?.trim() ?? item.scientificName,
              notes: updates.notes ?? item.notes,
            }
          : item
      )
    );
  }, []);

  const incrementTreeCount = useCallback((id, delta = 1) => {
    if (!delta) {
      return;
    }

    setSpecies((prev) =>
      prev.map((item) => {
        if (Number(item.id) !== Number(id)) {
          return item;
        }

        const nextCount = (item.treeCount ?? 0) + delta;
        return { ...item, treeCount: nextCount < 0 ? 0 : nextCount };
      })
    );
  }, []);

  const value = useMemo(
    () => ({ species, addSpecies, updateSpecies, incrementTreeCount }),
    [species, addSpecies, updateSpecies, incrementTreeCount]
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
