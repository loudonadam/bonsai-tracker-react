import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  MessageSquare,
  Skull,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useTrees } from "../context/TreesContext";
import ConfirmDialog from "../components/ConfirmDialog";

const GraveyardSection = ({
  title,
  description,
  entries,
  onRestore,
  onRequestDelete,
  pendingDeleteId,
  deletingTreeId,
}) => {
  if (entries.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
        <div className="text-4xl mb-2">🌱</div>
        <p className="font-semibold text-gray-700 mb-1">No trees here yet</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entries.map((entry) => (
        <article
          key={entry.id}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="grid md:grid-cols-[220px_1fr]">
            <div className="relative h-48 md:h-full bg-gray-100">
              {entry.tree.photoUrl ? (
                <img
                  src={entry.tree.photoUrl}
                  alt={entry.tree.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Skull className="w-10 h-10" />
                  <span className="text-sm">No photo available</span>
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                  {title}
                </span>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <header className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  {entry.tree.name}
                </h3>
                <p className="text-sm text-slate-500">{entry.tree.species}</p>
              </header>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    Moved on {new Date(entry.movedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {entry.note && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400 mt-1" />
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {entry.note}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>This action is permanent</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => onRestore?.(entry.tree.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 shadow-sm transition hover:bg-green-100"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restore to collection
                  </button>
                  <button
                    onClick={() => onRequestDelete?.(entry)}
                    disabled={
                      deletingTreeId === entry.tree.id ||
                      pendingDeleteId === entry.tree.id
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deletingTreeId === entry.tree.id
                      ? "Deleting..."
                      : pendingDeleteId === entry.tree.id
                      ? "Confirming..."
                      : "Delete forever"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

const Graveyard = () => {
  const navigate = useNavigate();
  const { graveyard, deleteTreePermanently, restoreTreeFromGraveyard } = useTrees();
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, entry: null });
  const [deletingTreeId, setDeletingTreeId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [lastAction, setLastAction] = useState(null);

  const deadTrees = graveyard.filter((entry) => entry.category === "dead");
  const newOwnerTrees = graveyard.filter((entry) => entry.category === "new-owner");

  const requestDeleteEntry = (entry) => {
    setDeleteError("");
    setDeleteConfirm({ open: true, entry });
  };

  const cancelDeleteEntry = () => {
    setDeleteConfirm({ open: false, entry: null });
    setDeleteError("");
  };

  const confirmDeleteEntry = async () => {
    const entry = deleteConfirm.entry;
    if (!entry) {
      return;
    }

    setDeletingTreeId(entry.tree.id);
    setDeleteError("");
    try {
      await deleteTreePermanently(entry.tree.id);
      setDeleteConfirm({ open: false, entry: null });
      setLastAction("deleted");
    } catch (error) {
      setDeleteError(error.message || "Failed to delete tree. Please try again.");
    } finally {
      setDeletingTreeId(null);
    }
  };

  const handleBack = () => {
    if (lastAction === "deleted") {
      navigate("/");
      return;
    }
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              <Skull className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-800">Bonsai Graveyard</h1>
              <p className="text-sm text-slate-500">
                A quiet place to honor trees that have moved on and to reflect on their stories.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-700">Dead</h2>
            <GraveyardSection
              title="Dead"
              description="Trees that have passed on will appear here with your notes on what happened."
              entries={deadTrees}
              onRestore={restoreTreeFromGraveyard}
              onRequestDelete={requestDeleteEntry}
              pendingDeleteId={deleteConfirm.entry?.tree.id ?? null}
              deletingTreeId={deletingTreeId}
            />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-700">New Owner</h2>
            <GraveyardSection
              title="New Owner"
              description="Sold or gifted trees will live here with their final notes and sale details."
              entries={newOwnerTrees}
              onRestore={restoreTreeFromGraveyard}
              onRequestDelete={requestDeleteEntry}
              pendingDeleteId={deleteConfirm.entry?.tree.id ?? null}
              deletingTreeId={deletingTreeId}
            />
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete tree forever"
        description={
          deleteConfirm.entry
            ? `This will permanently remove ${deleteConfirm.entry.tree.name} from your records. This action cannot be undone.`
            : "This will permanently remove the selected tree from your records. This action cannot be undone."
        }
        confirmLabel="Delete forever"
        cancelLabel="Keep tree"
        destructive
        isLoading={
          deleteConfirm.entry &&
          deletingTreeId === deleteConfirm.entry.tree.id
        }
        error={deleteError}
        onCancel={cancelDeleteEntry}
        onConfirm={confirmDeleteEntry}
      />
    </div>
  );
};

export default Graveyard;
