import { apiClient } from "../services/apiClient";

const STORAGE_KEY = "bonsai-reminders";

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const normalizeDate = (value) => {
  if (!value) return "";
  const asString = String(value);
  return asString.includes("T") ? asString.split("T")[0] : asString;
};

export const loadStoredReminders = () => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load reminders from storage", error);
    return [];
  }
};

export const hasStoredReminders = () => {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(STORAGE_KEY) !== null;
};

export const saveStoredReminders = (reminders) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error("Failed to save reminders to storage", error);
  }
};

export const appendReminderToStorage = (reminder) => {
  const existing = loadStoredReminders();
  const updated = [...existing, reminder];
  saveStoredReminders(updated);
  return updated;
};

export const removeReminderFromStorage = (id) => {
  const existing = loadStoredReminders();
  const updated = existing.filter((reminder) => reminder.id !== id);
  saveStoredReminders(updated);
  return updated;
};

const reminderFromNotification = (notification) => ({
  id: notification.id,
  treeId: notification.bonsai_id ?? null,
  treeName: notification.title || "Unknown tree",
  message: notification.message,
  dueDate: normalizeDate(notification.due_at),
});

export const fetchReminders = async () => {
  const notifications = await apiClient.get("/notifications/");
  const reminders = Array.isArray(notifications)
    ? notifications.map(reminderFromNotification)
    : [];
  saveStoredReminders(reminders);
  return reminders;
};

export const createReminder = async (reminder) => {
  const payload = {
    bonsai_id: reminder.treeId ?? undefined,
    title: reminder.treeName || "Tree reminder",
    message: reminder.message,
    category: "reminder",
    due_at: reminder.dueDate ? `${reminder.dueDate}T00:00:00` : null,
    read: false,
  };

  const created = await apiClient.post("/notifications/", payload);
  return reminderFromNotification(created);
};

export const deleteReminder = async (id) => {
  await apiClient.delete(`/notifications/${id}`);
};

export const STORAGE_KEY_REMINDERS = STORAGE_KEY;
