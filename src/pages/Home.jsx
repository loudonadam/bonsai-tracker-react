import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Settings,
  Search,
  BookOpen,
  Bell,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
} from "lucide-react";
import TreeCard from "../components/TreeCard";
import AddTreeModal from "../components/AddTreeModal";
import AddReminderModal from "../components/AddReminderModal";

// ─── Mock Data ───────────────────────────────────────────
const initialTrees = [
  {
    id: 1,
    name: "Autumn Flame",
    species: "Japanese Maple (Acer palmatum)",
    acquisitionDate: "2018-04-20",
    currentGirth: 15.3,
    lastUpdate: "2024-11-15",
    starred: true,
    notes: "Beautiful red leaves in fall. Needs repotting next spring.",
  },
  {
    id: 2,
    name: "Ancient Pine",
    species: "Japanese Black Pine",
    acquisitionDate: "2015-06-10",
    currentGirth: 22.7,
    lastUpdate: "2024-10-28",
    starred: false,
    notes: "Very healthy. Wire training going well.",
  },
];

const Home = () => {
  const navigate = useNavigate();

  // ─── State ───────────────────────────────────────────
  const [trees, setTrees] = useState(initialTrees);
  const [searchQuery, setSearchQuery] = useState("");
  const [showReminders, setShowReminders] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showAddTree, setShowAddTree] = useState(false);

  const [reminders, setReminders] = useState([
    {
      id: 1,
      treeId: 1,
      treeName: "Autumn Flame",
      message: "Repot in early spring",
      dueDate: "2025-03-15",
      isOverdue: false,
    },
  ]);

  // ─── Derived Stats ───────────────────────────────────────────
  const totalTrees = trees.length;
  const starredCount = trees.filter((t) => t.starred).length;
  const avgAge = (
    trees.reduce((sum, t) => {
      const age =
        (new Date() - new Date(t.acquisitionDate)) /
        (1000 * 60 * 60 * 24 * 365.25);
      return sum + age;
    }, 0) / trees.length
  ).toFixed(1);
  const uniqueSpecies = new Set(trees.map((t) => t.species)).size;
  const newestTree = trees.reduce((a, b) =>
    a.acquisitionDate > b.acquisitionDate ? a : b
  );
  const oldestTree = trees.reduce((a, b) =>
    a.acquisitionDate < b.acquisitionDate ? a : b
  );

  // ─── Reminder Helpers ───────────────────────────────────────────
  const addReminder = (reminder) => {
    setReminders((prev) => [...prev, reminder]);
    setShowAddReminder(false);
  };

  const handleCompleteReminder = (id) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const overdueReminders = reminders.filter((r) => r.isOverdue);
  const upcomingReminders = reminders.filter((r) => !r.isOverdue);

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

  // ─── Add Tree Logic ───────────────────────────────────────────
  const handleAddTree = (treeData) => {
    setTrees((prev) => [...prev, treeData]);
    setShowAddTree(false);
  };

  const filteredTrees = trees.filter(
    (tree) =>
      tree.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tree.species.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2">
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
              </div>
            </div>

            <button
              onClick={() => navigate("/settings")}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile */}
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
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="hidden lg:flex gap-3">
            <button
              onClick={() => navigate("/species")}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <BookOpen className="w-4 h-4" />
              <span>Species</span>
            </button>

            <button
              onClick={() => setShowAddTree(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Tree</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-20">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h2>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex justify-between"><span>Total Trees:</span><span>{totalTrees}</span></li>
              <li className="flex justify-between"><span>Starred:</span><span>{starredCount}</span></li>
              <li className="flex justify-between"><span>Unique Species:</span><span>{uniqueSpecies}</span></li>
              <li className="flex justify-between"><span>Newest:</span><span>{newestTree.name}</span></li>
              <li className="flex justify-between"><span>Oldest:</span><span>{oldestTree.name}</span></li>
              <li className="flex justify-between"><span>Avg Age:</span><span>{avgAge}y</span></li>
            </ul>
          </div>

          {/* Reminders */}
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
                    className={`flex items-start gap-2 p-2 border rounded-lg transition-colors ${
                      r.isOverdue
                        ? "bg-red-50 border-red-200"
                        : "bg-blue-50 border-blue-200"
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
                    <button
                      onClick={() => handleCompleteReminder(r.id)}
                      className="text-gray-400 hover:text-green-600 transition"
                      title="Mark complete"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {reminders.length === 0 && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    No reminders yet.
                  </p>
                )}

                <button
                  onClick={() => setShowAddReminder(true)}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Reminder
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Tree Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">My Collection</h2>
          </div>

          {filteredTrees.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🌱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No trees yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start your bonsai journey by adding your first tree
              </p>
              <button
                onClick={() => setShowAddTree(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Add Your First Tree
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredTrees.map((tree) => (
                <div key={tree.id} onClick={() => navigate(`/tree/${tree.id}`)}>
                  <TreeCard tree={tree} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <AddTreeModal
        show={showAddTree}
        onClose={() => setShowAddTree(false)}
        onSave={handleAddTree}
      />

      <AddReminderModal
        show={showAddReminder}
        onClose={() => setShowAddReminder(false)}
        onSave={addReminder}
        trees={trees}
      />
    </div>
  );
};

export default Home;
