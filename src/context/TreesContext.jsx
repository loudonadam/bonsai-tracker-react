/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_STAGE_VALUE } from "../utils/developmentStages";

const TreesContext = createContext(null);

const initialTrees = [
  {
    id: 1,
    name: "Autumn Flame",
    species: "Japanese Maple (Acer palmatum)",
    acquisitionDate: "2018-04-20",
    currentGirth: 15.3,
    lastUpdate: "2024-11-15",
    notes: "Beautiful red leaves in fall. Needs repotting next spring.",
    developmentStage: "refinement",
    photoUrl:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    name: "Ancient Pine",
    species: "Japanese Black Pine",
    acquisitionDate: "2015-06-10",
    currentGirth: 22.7,
    lastUpdate: "2024-10-28",
    notes: "Very healthy. Wire training going well.",
    developmentStage: "show-eligible",
    photoUrl:
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=800&q=80",
  },
];

export const TreesProvider = ({ children }) => {
  const [trees, setTrees] = useState(initialTrees);
  const [graveyard, setGraveyard] = useState([]);

  const addTree = useCallback((treeData) => {
    setTrees((prev) => {
      const stageValue =
        typeof treeData.developmentStage === "string"
          ? treeData.developmentStage.toLowerCase()
          : DEFAULT_STAGE_VALUE;

      const { photo, photoUrl: providedPhotoUrl, ...rest } = treeData;
      let photoUrl = providedPhotoUrl ?? null;
      if (photo instanceof File) {
        photoUrl = URL.createObjectURL(photo);
      }

      const id = treeData.id ?? Date.now();

      return [
        ...prev,
        {
          id,
          ...rest,
          photoUrl,
          lastUpdate: treeData.lastUpdate || treeData.acquisitionDate,
          developmentStage: stageValue || DEFAULT_STAGE_VALUE,
        },
      ];
    });
  }, []);

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
      addTree,
      getTreeById,
      moveTreeToGraveyard,
      deleteTreePermanently,
    }),
    [trees, graveyard, addTree, getTreeById, moveTreeToGraveyard, deleteTreePermanently]
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
