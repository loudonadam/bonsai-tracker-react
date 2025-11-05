import React, { useMemo, useState, useEffect } from "react";
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
  Skull,
} from "lucide-react";
import TreeCard from "../components/TreeCard";
import AddTreeModal from "../components/AddTreeModal";
import AddReminderModal from "../components/AddReminderModal";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  appendReminderToStorage,
  loadStoredReminders,
  removeReminderFromStorage,
  saveStoredReminders,
} from "../utils/reminderStorage";
import {
  DEVELOPMENT_STAGE_OPTIONS,
  DEFAULT_STAGE_VALUE,
  getStageMeta,
} from "../utils/developmentStages";
import { useTrees } from "../context/TreesContext";
import {
  calculateAgeInYears,
  differenceInDays,
  formatDisplayDate,
  getSafeTimestamp,
  startOfDay,
} from "../utils/dateUtils";

const DEFAULT_COLLECTION_NAME = "Bonsai Tracker";

const getStoredCollectionName = () => {
  if (typeof window === "undefined") {
    return DEFAULT_COLLECTION_NAME;
  }
  return localStorage.getItem("collectionName") || DEFAULT_COLLECTION_NAME;
};

const DEFAULT_REMINDERS = [
  {
    id: 1,
    treeId: 1,
    treeName: "Autumn Flame",
    message: "Repot in early spring",
    dueDate: "2025-03-15",
  },
];

const formatReminderDueDate = (dateString, todayStart) => {
  if (!dateString) {
    return "No due date";
  }

  const diffDays = differenceInDays(dateString, todayStart);
  if (diffDays === null) {
    return "No due date";
  }

  if (diffDays < 0) {
    const diffWeeks = Math.ceil(Math.abs(diffDays) / 7);
    return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} overdue`;
  }

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;

  return formatDisplayDate(dateString, {
    options: { month: "short", day: "numeric" },
    fallback: "No due date",
  });
};

const ReminderCard = ({ reminder, onComplete, status, todayStart }) => {
  const isOverdue = status === "overdue";
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition ${
        isOverdue ? "border-red-200 bg-red-50/70" : "border-blue-200 bg-blue-50/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isOverdue ? "bg-red-500" : "bg-blue-500"}`} />
              {status === "overdue" ? "Overdue" : "Upcoming"}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">
              {formatReminderDueDate(reminder.dueDate, todayStart)}
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-gray-900">
            {reminder.treeName}
          </p>
          <p className="mt-1 text-sm leading-snug text-gray-700">
            {reminder.message}
          </p>
        </div>
        <button
          onClick={() => onComplete(reminder)}
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

const Home = () => {
  const navigate = useNavigate();
  const { trees, addTree, loading: treesLoading, error: treesError } = useTrees();

  const [collectionName, setCollectionName] = useState(getStoredCollectionName);

  useEffect(() => {
    setCollectionName(getStoredCollectionName());
  }, []);

  // ─── State ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showReminders, setShowReminders] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showAddTree, setShowAddTree] = useState(false);
  const [sortOption, setSortOption] = useState("recent");

  const [reminders, setReminders] = useState(() => {
    const stored = loadStoredReminders();
    if (stored.length > 0) {
      return stored;
    }
    saveStoredReminders(DEFAULT_REMINDERS);
    return DEFAULT_REMINDERS;
  });
  const [completeReminderConfirm, setCompleteReminderConfirm] = useState({
    open: false,
    reminder: null,
  });
  const [isCompletingReminder, setIsCompletingReminder] = useState(false);
  const [reminderActionError, setReminderActionError] = useState("");

  // ─── Derived Stats ───────────────────────────────────────────
  const totalTrees = trees.length;

  const { avgAge, uniqueSpecies, stageBreakdown } = useMemo(() => {
    const initialCounts = DEVELOPMENT_STAGE_OPTIONS.reduce(
      (accumulator, option) => ({ ...accumulator, [option.value]: 0 }),
      {}
    );

    if (trees.length === 0) {
      return {
        avgAge: "0.0",
        uniqueSpecies: 0,
        stageBreakdown: DEVELOPMENT_STAGE_OPTIONS.map((option) => ({
          label: option.label,
          value: 0,
        })),
      };
    }

    const speciesSet = new Set();
    let ageSum = 0;
    let datedTreeCount = 0;
    const counts = { ...initialCounts };

    trees.forEach((tree) => {
      if (tree.species) {
        speciesSet.add(tree.species);
      }

      const stageMeta = getStageMeta(tree.developmentStage);
      counts[stageMeta.value] = (counts[stageMeta.value] ?? 0) + 1;

      const acquisitionTimestamp = getSafeTimestamp(tree.acquisitionDate);
      if (acquisitionTimestamp !== null) {
        const years = calculateAgeInYears(tree.acquisitionDate);
        if (years !== null) {
          ageSum += years;
          datedTreeCount += 1;
        }
      }
    });

    const avgAgeValue = datedTreeCount > 0 ? (ageSum / datedTreeCount).toFixed(1) : "0.0";

    return {
      avgAge: avgAgeValue,
      uniqueSpecies: speciesSet.size,
      stageBreakdown: DEVELOPMENT_STAGE_OPTIONS.map((option) => ({
        label: option.label,
        value: counts[option.value] ?? 0,
      })),
    };
  }, [trees]);

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

  const requestCompleteReminder = (reminder) => {
    setReminderActionError("");
    setCompleteReminderConfirm({ open: true, reminder });
  };

  const cancelCompleteReminder = () => {
    if (isCompletingReminder) {
      return;
    }

    setCompleteReminderConfirm({ open: false, reminder: null });
    setReminderActionError("");
  };

  const handleConfirmCompleteReminder = () => {
    const reminderId = completeReminderConfirm.reminder?.id;
    if (!reminderId) {
      return;
    }

    setIsCompletingReminder(true);
    setReminderActionError("");

    try {
      const updated = removeReminderFromStorage(reminderId);
      setReminders(updated);
      setCompleteReminderConfirm({ open: false, reminder: null });
    } catch (error) {
      setReminderActionError(
        error.message || "Unable to complete this reminder right now."
      );
    } finally {
      setIsCompletingReminder(false);
    }
  };

  const todayStart = useMemo(() => startOfDay(), []);

  const todayTimestamp = todayStart ? todayStart.getTime() : 0;

  const { overdueReminders, upcomingReminders } = useMemo(() => {
    if (reminders.length === 0) {
      return { overdueReminders: [], upcomingReminders: [] };
    }

    const sorted = [...reminders].sort((a, b) => {
      const aTime = getSafeTimestamp(a.dueDate, Number.MAX_SAFE_INTEGER);
      const bTime = getSafeTimestamp(b.dueDate, Number.MAX_SAFE_INTEGER);
      return aTime - bTime;
    });

    const grouped = { overdueReminders: [], upcomingReminders: [] };

    sorted.forEach((reminder) => {
      const dueTime = getSafeTimestamp(reminder.dueDate);
      if (dueTime !== null && dueTime < todayTimestamp) {
        grouped.overdueReminders.push(reminder);
      } else {
        grouped.upcomingReminders.push(reminder);
      }
    });

    return grouped;
  }, [reminders, todayTimestamp]);

  // ─── Add Tree Logic ───────────────────────────────────────────
  const handleAddTree = async (treeData) => {
    const stageValue =
      treeData.developmentStage?.toLowerCase() || DEFAULT_STAGE_VALUE;
    return addTree({
      ...treeData,
      developmentStage: stageValue,
    });
  };

  const stageOrder = useMemo(() => {
    return DEVELOPMENT_STAGE_OPTIONS.reduce((accumulator, option, index) => {
      accumulator[option.value] = index;
      return accumulator;
    }, {});
  }, []);

  const filteredTrees = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const matches = trees.filter((tree) => {
      if (!normalizedQuery) {
        return true;
      }

      const nameMatch = tree.name.toLowerCase().includes(normalizedQuery);
      const speciesMatch = (tree.species || "")
        .toLowerCase()
        .includes(normalizedQuery);

      const stageValue =
        typeof tree.developmentStage === "string"
          ? tree.developmentStage.toLowerCase()
          : DEFAULT_STAGE_VALUE;
      const stageMeta = getStageMeta(stageValue);

      const stageMatch =
        stageValue.includes(normalizedQuery) ||
        stageMeta.label.toLowerCase().includes(normalizedQuery) ||
        stageMeta.shortLabel.toLowerCase().includes(normalizedQuery);

      return nameMatch || speciesMatch || stageMatch;
    });

    const sortByRecent = (a, b) => {
      const aTime = getSafeTimestamp(a.lastUpdate, 0) ?? 0;
      const bTime = getSafeTimestamp(b.lastUpdate, 0) ?? 0;
      return bTime - aTime;
    };

    const sorted = [...matches].sort((a, b) => {
      switch (sortOption) {
        case "stage": {
          const aStage =
            typeof a.developmentStage === "string"
              ? a.developmentStage.toLowerCase()
              : DEFAULT_STAGE_VALUE;
          const bStage =
            typeof b.developmentStage === "string"
              ? b.developmentStage.toLowerCase()
              : DEFAULT_STAGE_VALUE;

          const aIndex = stageOrder[aStage] ?? Number.MAX_SAFE_INTEGER;
          const bIndex = stageOrder[bStage] ?? Number.MAX_SAFE_INTEGER;

          if (aIndex === bIndex) {
            return sortByRecent(a, b);
          }

          return aIndex - bIndex;
        }
        case "age": {
          const aTime = getSafeTimestamp(a.acquisitionDate, 0) ?? 0;
          const bTime = getSafeTimestamp(b.acquisitionDate, 0) ?? 0;

          if (aTime === bTime) {
            return sortByRecent(a, b);
          }

          return aTime - bTime;
        }
        case "species": {
          const speciesCompare = (a.species || "").localeCompare(
            b.species || "",
            undefined,
            { sensitivity: "base" }
          );

          if (speciesCompare === 0) {
            return sortByRecent(a, b);
          }

          return speciesCompare;
        }
        case "recent":
        default:
          return sortByRecent(a, b);
      }
    });

    return sorted;
  }, [trees, searchQuery, sortOption, stageOrder]);

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2">
          <div className="hidden lg:flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                {collectionName}
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/graveyard")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Open graveyard"
              >
                <Skull className="w-6 h-6" />
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-bold text-gray-900">{collectionName}</h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/graveyard")}
                  className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                  aria-label="Open graveyard"
                >
                  <Skull className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate("/settings")}
                  className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
                  aria-label="Open settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search trees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowAddTree(true)}
                className="flex-1 min-w-[140px] rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Tree</span>
                </div>
              </button>
              <button
                onClick={() => navigate("/species")}
                className="flex-1 min-w-[140px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
              >
                <div className="flex items-center justify-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Species</span>
                </div>
              </button>
              <button
                onClick={() => setShowAddReminder(true)}
                className="flex-1 min-w-[140px] rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 shadow-sm transition hover:border-green-300 hover:bg-green-100"
              >
                <div className="flex items-center justify-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>New Reminder</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="grid w-full grid-cols-1 gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[360px_1fr] lg:items-start lg:gap-8 lg:px-8">
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
          <div className="rounded-lg border border-gray-200 bg-white p-4 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex justify-between">
                <span>Unique Species:</span>
                <span>{uniqueSpecies}</span>
              </li>
              <li className="flex justify-between">
                <span>Average Age of Tree:</span>
                <span>{avgAge} yrs</span>
              </li>
              <li className="flex justify-between">
                <span>Total Trees:</span>
                <span>{totalTrees}</span>
              </li>
              <li>
                <div className="text-sm font-semibold text-gray-700">Growth Stage Breakdown</div>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  {stageBreakdown.map((stage) => (
                    <li key={stage.label} className="flex justify-between">
                      <span>{stage.label}</span>
                      <span>{stage.value}</span>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>

          {/* Reminders */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
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
                className="flex items-center gap-1 text-sm font-medium text-green-700 transition hover:text-green-800"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>

            {showReminders && (
              <div className="space-y-6 px-4 py-4">
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
                        onComplete={requestCompleteReminder}
                        status="overdue"
                        todayStart={todayStart}
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
                        onComplete={requestCompleteReminder}
                        status="upcoming"
                        todayStart={todayStart}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800">My Collection</h2>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-option" className="text-sm text-gray-600">
                Sort by
              </label>
              <select
                id="sort-option"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
                className="rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
              >
                <option value="recent">Most recent update</option>
                <option value="stage">Growth stage</option>
                <option value="age">Age</option>
                <option value="species">Species</option>
              </select>
            </div>
          </div>

          {treesError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {treesError}
            </div>
          )}

          {treesLoading ? (
            <div className="flex items-center justify-center rounded-lg bg-white p-12 text-gray-600">
              Loading your collection...
            </div>
          ) : filteredTrees.length === 0 ? (
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredTrees.map((tree) => (
                <div
                  key={tree.id}
                  onClick={() => navigate(`/tree/${tree.id}`)}
                  className="h-full cursor-pointer"
                >
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

      <ConfirmDialog
        open={completeReminderConfirm.open}
        title="Mark reminder complete"
        description={
          completeReminderConfirm.reminder
            ? `Mark the reminder for ${
                completeReminderConfirm.reminder.treeName || "this tree"
              } as complete? This will remove it from your dashboard.`
            : ""
        }
        confirmLabel="Mark complete"
        destructive
        isLoading={isCompletingReminder}
        error={reminderActionError}
        onCancel={cancelCompleteReminder}
        onConfirm={handleConfirmCompleteReminder}
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
