const STORAGE_KEY = "bonsai-reminders";

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

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

export const STORAGE_KEY_REMINDERS = STORAGE_KEY;
