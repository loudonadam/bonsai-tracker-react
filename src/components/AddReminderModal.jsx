import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import DatePicker from "./DatePicker";

const AddReminderModal = ({ show, onClose, onSave, trees = [] }) => {
  const [form, setForm] = useState({
    treeId: "",
    message: "",
    dueDate: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show) {
      setForm({ treeId: "", message: "", dueDate: "" });
      setError("");
    }
  }, [show]);

  const handleSubmit = () => {
    if (!form.treeId || !form.message.trim() || !form.dueDate) {
      setError("Please complete all required fields before saving the reminder.");
      return;
    }

    const tree = trees.find((t) => t.id === parseInt(form.treeId));
    if (!tree) {
      setError("The selected tree could not be found. Please choose another tree.");
      return;
    }

    const reminder = {
      id: Date.now(),
      treeId: tree.id,
      treeName: tree.name,
      message: form.message.trim(),
      dueDate: form.dueDate,
      isOverdue: new Date(form.dueDate) < new Date(),
    };

    onSave(reminder);
    // onSave should close the modal (Home does that) — but we'll also reset here:
    setForm({ treeId: "", message: "", dueDate: "" });
    setError("");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Reminder</h3>

        {error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tree <span className="text-red-600">*</span>
            </label>
            <select
              value={form.treeId}
              onChange={(e) => setForm({ ...form, treeId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              aria-required="true"
            >
              <option value="">Select a tree</option>
              {trees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="e.g. Repot in early spring"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              aria-required="true"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date <span className="text-red-600">*</span>
            </label>
            <DatePicker
              value={form.dueDate}
              onChange={(event) =>
                setForm({ ...form, dueDate: event.target.value })
              }
              placeholder="Choose a due date"
              aria-required="true"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              handleSubmit();
              // allow parent to close after onSave
            }}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
          >
            Add Reminder
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddReminderModal;
