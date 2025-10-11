import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Settings,
  Download,
  Search,
  BookOpen,
  Bell,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import TreeCard from "../components/TreeCard";

// ─── Mock Data (unchanged) ───────────────────────────────────────────
const mockTrees = [
  { id: 1, name: "Autumn Flame", species: "Japanese Maple (Acer palmatum)", acquisitionDate: "2018-04-20", currentGirth: 15.3, lastUpdate: "2024-11-15", photoUrl: null, starred: true, notes: "Beautiful red leaves in fall. Needs repotting next spring." },
  { id: 2, name: "Ancient Pine", species: "Japanese Black Pine", acquisitionDate: "2015-06-10", currentGirth: 22.7, lastUpdate: "2024-10-28", photoUrl: null, starred: false, notes: "Very healthy. Wire training going well." },
  { id: 3, name: "Baby Juniper", species: "Chinese Juniper", acquisitionDate: "2023-08-05", currentGirth: 5.2, lastUpdate: "2024-12-01", photoUrl: null, starred: false, notes: "First year tree. Growing nicely!" },
  { id: 4, name: "Serene Elm", species: "Chinese Elm", acquisitionDate: "2020-02-14", currentGirth: 11.8, lastUpdate: "2024-11-20", photoUrl: null, starred: true, notes: "Perfect for beginners. Very forgiving." },
];

const mockReminders = [
  { id: 1, treeId: 1, treeName: "Autumn Flame", message: "Repot in early spring", dueDate: "2025-03-15", isOverdue: false },
  { id: 2, treeId: 2, treeName: "Ancient Pine", message: "Remove wire from branches", dueDate: "2024-10-01", isOverdue: true },
  { id: 3, treeId: 3, treeName: "Baby Juniper", message: "Begin fertilizing schedule", dueDate: "2025-04-01", isOverdue: false },
];

// ─── Component ──────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showReminders, setShowReminders] = useState(false);

  // Stats
  const totalTrees = mockTrees.length;
  const starredCount = mockTrees.filter((t) => t.starred).length;
  const avgAge = (
    mockTrees.reduce((sum, t) => {
      const age = (new Date() - new Date(t.acquisitionDate)) / (1000 * 60 * 60 * 24 * 365.25);
      return sum + age;
    }, 0) / mockTrees.length
  ).toFixed(1);
  const uniqueSpecies = new Set(mockTrees.map((t) => t.species)).size;
  const newestTree = mockTrees.reduce((a, b) => (a.acquisitionDate > b.acquisitionDate ? a : b));
  const oldestTree = mockTrees.reduce((a, b) => (a.acquisitionDate < b.acquisitionDate ? a : b));

  const overdueReminders = mockReminders.filter((r) => r.isOverdue);
  const upcomingReminders = mockReminders.filter((r) => !r.isOverdue).slice(0, 5);

  const filteredTrees = mockTrees.filter(
    (tree) =>
      tree.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tree.species.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
<header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-2">
    {/* Desktop layout: title + search left, settings right */}
    <div className="hidden lg:flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">
          🌱 Bonsai Tracker
        </h1>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => navigate("/settings")}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Settings className="w-6 h-6" />
      </button>
    </div>

    {/* Mobile/tablet layout (unchanged) */}
    <div className="lg:hidden flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🌱 Bonsai Tracker</h1>
        <button
          onClick={() => navigate("/settings")}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search trees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  </div>
</header>


      {/* MAIN CONTENT GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* ── Sidebar ── */}
        <aside className="space-y-4">
          {/* Desktop-only action buttons above Quick Stats */}
          <div className="hidden lg:flex gap-3">
            <button
              onClick={() => navigate("/species")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <BookOpen className="w-4 h-4" />
              <span>Species</span>
            </button>

            <button
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Tree</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-20">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h2>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>Total Trees:</span><span>{totalTrees}</span></li>
              <li className="flex justify-between"><span>Starred:</span><span>{starredCount}</span></li>
              <li className="flex justify-between"><span>Unique Species:</span><span>{uniqueSpecies}</span></li>
              <li className="flex justify-between"><span>Newest:</span><span>{newestTree.name}</span></li>
              <li className="flex justify-between"><span>Oldest:</span><span>{oldestTree.name}</span></li>
              <li className="flex justify-between"><span>Avg Age:</span><span>{avgAge}y</span></li>
            </ul>
          </div>

          {/* Reminders */}
          {(overdueReminders.length > 0 || upcomingReminders.length > 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowReminders(!showReminders)}
                className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-600" />
                  <h2 className="text-sm font-semibold text-gray-700">Reminders</h2>
                  {overdueReminders.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {overdueReminders.length}
                    </span>
                  )}
                </div>
                {showReminders ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {showReminders && (
                <div className="px-4 pb-4 space-y-2">
                  {[...overdueReminders, ...upcomingReminders].map((r) => (
                    <div
                      key={r.id}
                      onClick={() => navigate(`/tree/${r.treeId}`)}
                      className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                        r.isOverdue
                          ? "bg-red-50 border-red-200 hover:bg-red-100"
                          : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1 ${
                          r.isOverdue ? "bg-red-500" : "bg-blue-500"
                        }`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {r.treeName}
                          </span>
                          <span
                            className={`text-xs whitespace-nowrap ${
                              r.isOverdue ? "text-red-600" : "text-blue-600"
                            }`}
                          >
                            {formatDate(r.dueDate)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{r.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Main Tree Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              My Collection
              {searchQuery && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({filteredTrees.length} {filteredTrees.length === 1 ? "result" : "results"})
                </span>
              )}
            </h2>
          </div>

          {filteredTrees.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-gray-400 mb-4">
                {searchQuery ? (
                  <Search className="w-16 h-16 mx-auto" />
                ) : (
                  <span className="text-6xl">🌱</span>
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? "No trees found" : "No trees yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? "Try a different search term"
                  : "Start your bonsai journey by adding your first tree"}
              </p>
              {!searchQuery && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Add Your First Tree
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTrees.map((tree) => (
                <div key={tree.id} onClick={() => navigate(`/tree/${tree.id}`)}>
                  <TreeCard tree={tree} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;