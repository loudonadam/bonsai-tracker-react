import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Calendar, MessageSquare, Skull, Trash2 } from "lucide-react";
import { useTrees } from "../context/TreesContext";

const GraveyardSection = ({ title, description, entries, onDelete }) => {
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
                <span className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {title}
                </span>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <header className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  {entry.tree.name}
                </h3>
                <p className="text-sm text-gray-500">{entry.tree.species}</p>
              </header>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    Moved on {new Date(entry.movedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                {entry.note && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {entry.note}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>This action is permanent</span>
                </div>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Permanently delete this tree? This cannot be undone."
                      )
                    ) {
                      onDelete(entry.id);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete forever
                </button>
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
  const { graveyard, deleteTreePermanently } = useTrees();

  const deadTrees = graveyard.filter((entry) => entry.category === "dead");
  const newOwnerTrees = graveyard.filter((entry) => entry.category === "new-owner");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <header className="space-y-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center">
              <Skull className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold">Bonsai Graveyard</h1>
              <p className="text-sm text-slate-300">
                A quiet place to honor trees that have moved on and to reflect on their stories.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Dead</h2>
            <GraveyardSection
              title="Dead"
              description="Trees that have passed on will appear here with your notes on what happened."
              entries={deadTrees}
              onDelete={deleteTreePermanently}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">New Owner</h2>
            <GraveyardSection
              title="New Owner"
              description="Sold or gifted trees will live here with their final notes and sale details."
              entries={newOwnerTrees}
              onDelete={deleteTreePermanently}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Graveyard;
