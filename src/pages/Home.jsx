import React, { useMemo, useState } from "react";
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
import {
  appendReminderToStorage,
  loadStoredReminders,
  removeReminderFromStorage,
  saveStoredReminders,
} from "../utils/reminderStorage";

// ─── Mock Data ───────────────────────────────────────────
const initialTrees = [
  {
    id: 1,
    name: "Autumn Flame",
    species: "Japanese Maple (Acer palmatum)",
    acquisitionDate: "2018-04-20",
    currentGirth: 15.3,
    lastUpdate: "2024-11-15",
    notes: "Beautiful red leaves in fall. Needs repotting next spring.",
  },
  {
    id: 2,
    name: "Ancient Pine",
    species: "Japanese Black Pine",
    acquisitionDate: "2015-06-10",
    currentGirth: 22.7,
    lastUpdate: "2024-10-28",
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

  const defaultReminders = [
    {
      id: 1,
      treeId: 1,
      treeName: "Autumn Flame",
      message: "Repot in early spring",
      dueDate: "2025-03-15",
    },
  ];

  const [reminders, setReminders] = useState(() => {
    const stored = loadStoredReminders();
    if (stored.length > 0) {
      return stored;
    }
    saveStoredReminders(defaultReminders);
    return defaultReminders;
  });

  // ─── Derived Stats ───────────────────────────────────────────
  const totalTrees = trees.length;
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
    const newReminder = {
      ...reminder,
      id: reminder.id ?? Date.now(),
    };
    const updated = appendReminderToStorage(newReminder);
    setReminders(updated);
    setShowAddReminder(false);
  };

  const handleCompleteReminder = (id) => {
    const updated = removeReminderFromStorage(id);
    setReminders(updated);
  };

  const sortedReminders = useMemo(() => {
    return [...reminders].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [reminders]);

  const startOfToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const overdueReminders = sortedReminders.filter(
    (r) => new Date(r.dueDate).getTime() < startOfToday.getTime()
  );
  const upcomingReminders = sortedReminders.filter(
    (r) => new Date(r.dueDate).getTime() >= startOfToday.getTime()
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      const diffWeeks = Math.ceil(Math.abs(diffDays) / 7);
      return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} overdue`;
    }
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const ReminderCard = ({ reminder, formatDate, onComplete, status }) => {
    const isOverdue = status === "overdue";
    return (
      <div
        className={`rounded-xl border p-4 shadow-sm transition ${
          isOverdue
            ? "border-red-200 bg-red-50/70"
            : "border-blue-200 bg-blue-50/70"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isOverdue
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isOverdue ? "bg-red-500" : "bg-blue-500"
                  }`}
                />
                {status === "overdue" ? "Overdue" : "Upcoming"}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{formatDate(reminder.dueDate)}</span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-gray-900">
              {reminder.treeName}
            </p>
            <p className="mt-1 text-sm leading-snug text-gray-700">
              {reminder.message}
            </p>
          </div>
          <button
            onClick={() => onComplete(reminder.id)}
            className="shrink-0 rounded-full border border-green-200 px-3 py-1 text-xs font-medium text-green-700 transition hover:bg-green-50 hover:text-green-800"
          >
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              <span>Done</span>
            </div>
          </button>
        </div>
      </div>
    );
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
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-8">
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
              <li className="flex justify-between"><span>Unique Species:</span><span>{uniqueSpecies}</span></li>
              <li className="flex justify-between"><span>Newest:</span><span>{newestTree.name}</span></li>
              <li className="flex justify-between"><span>Oldest:</span><span>{oldestTree.name}</span></li>
              <li className="flex justify-between"><span>Avg Age:</span><span>{avgAge}y</span></li>
            </ul>
          </div>

          {/* Reminders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <button
                onClick={() => setShowReminders(!showReminders)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
              >
                <Bell className="w-4 h-4 text-gray-600" />
                Reminders
                {overdueReminders.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {overdueReminders.length} overdue
                  </span>
                )}
                {showReminders ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => setShowAddReminder(true)}
                className="flex items-center gap-1 text-sm text-green-700 hover:text-green-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>

            {showReminders && (
              <div className="px-4 py-4 space-y-6">
                {reminders.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">No reminders yet.</p>
                )}

                {overdueReminders.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-red-600">
                      <span>Overdue</span>
                      <span className="text-[11px] font-medium text-red-500">
                        {overdueReminders.length} reminder{overdueReminders.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    {overdueReminders.map((r) => (
                      <ReminderCard
                        key={r.id}
                        reminder={r}
                        formatDate={formatDate}
                        onComplete={handleCompleteReminder}
                        status="overdue"
                      />
                    ))}
                  </div>
                )}

                {upcomingReminders.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-blue-600">
                      <span>Upcoming</span>
                      <span className="text-[11px] font-medium text-blue-500">
                        {upcomingReminders.length} reminder{upcomingReminders.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    {upcomingReminders.map((r) => (
                      <ReminderCard
                        key={r.id}
                        reminder={r}
                        formatDate={formatDate}
                        onComplete={handleCompleteReminder}
                        status="upcoming"
                      />
                    ))}
                  </div>
                )}
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
