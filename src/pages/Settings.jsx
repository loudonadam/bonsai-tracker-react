import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Download, Save, AlertCircle, CheckCircle2 } from "lucide-react";

import { getApiBaseUrl } from "../services/apiClient";
import ExportProgressOverlay from "../components/ExportProgressOverlay";
import ConfirmDialog from "../components/ConfirmDialog";

const Settings = () => {
  const navigate = useNavigate();
  const [collectionName, setCollectionName] = useState(() => {
    if (typeof window === "undefined") {
      return "My Bonsai Collection";
    }
    return localStorage.getItem("collectionName") || "My Bonsai Collection";
  });
  const fileInputRef = useRef(null);
  const apiBaseUrl = getApiBaseUrl();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusMessage, setExportStatusMessage] = useState(
    "We're gathering your bonsai collection. This may take a moment."
  );
  const [feedback, setFeedback] = useState(null);
  const [importConfirm, setImportConfirm] = useState({ open: false, file: null });
  const [isImporting, setIsImporting] = useState(false);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearFeedback = () => setFeedback(null);
  const showFeedback = (type, message) => setFeedback({ type, message });

  const handleNameSave = () => {
    localStorage.setItem("collectionName", collectionName);
    showFeedback("success", `Collection name updated to “${collectionName}”.`);
  };

  const handleExport = async () => {
    try {
      clearFeedback();
      setExportStatusMessage(
        "We're gathering your bonsai collection. This may take a moment."
      );
      setIsExporting(true);
      const response = await fetch(`${apiBaseUrl}/backup/export`, {
        method: "GET",
      });
      const blob = await response.blob();

      if (!response.ok) {
        let message = `Export failed with status ${response.status}`;
        try {
          const errorText = await blob.text();
          const data = JSON.parse(errorText);
          if (data?.detail) {
            message = data.detail;
          }
        } catch {
          /* ignore parsing errors */
        }
        throw new Error(message);
      }

      setExportStatusMessage("Starting your download…");
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `bonsai_backup_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      showFeedback("success", "Your bonsai data download is starting.");
    } catch (error) {
      console.error("Failed to export bonsai data", error);
      showFeedback("error", error.message || "Unable to export bonsai data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportConfirm({ open: true, file });
  };

  const cancelImport = () => {
    resetFileInput();
    setImportConfirm({ open: false, file: null });
  };

  const confirmImport = async () => {
    if (!importConfirm.file) {
      return;
    }

    try {
      clearFeedback();
      setIsImporting(true);

      const formData = new FormData();
      formData.append("file", importConfirm.file);

      const response = await fetch(`${apiBaseUrl}/backup/import`, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        let message = `Import failed with status ${response.status}`;
        try {
          const data = JSON.parse(responseText);
          if (data?.detail) {
            message = data.detail;
          }
        } catch {
          /* ignore parsing errors */
        }
        throw new Error(message);
      }

      let successMessage = "Bonsai data imported successfully!";
      if (responseText) {
        try {
          const data = JSON.parse(responseText);
          if (data?.detail) {
            successMessage = data.detail;
          }
        } catch {
          /* ignore parsing errors */
        }
      }

      showFeedback("success", successMessage);
    } catch (error) {
      console.error("Failed to import bonsai data", error);
      showFeedback("error", error.message || "Unable to import bonsai data.");
    } finally {
      setIsImporting(false);
      resetFileInput();
      setImportConfirm({ open: false, file: null });
    }
  };

  const importWarningMessage = importConfirm.file
    ? `Importing “${importConfirm.file.name}” will replace your current bonsai collection with the backup data.\n\nAny trees, photos, updates, and measurements not included in the file will be permanently removed.\n\nThis action cannot be undone. Do you want to continue?`
    : "Importing a backup will replace your current bonsai collection.";

  return (
    <>
      <ExportProgressOverlay
        open={isExporting}
        title="Preparing data export"
        description={exportStatusMessage}
      />
      <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {feedback && (
          <div
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.type === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5" />
            )}
            <div>{feedback.message}</div>
          </div>
        )}

        {/* Collection Name */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Collection Name
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              className="flex-1 w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
            <button
              onClick={handleNameSave}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </section>

        {/* Export Data */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Export Data
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Download a full backup of your bonsai collection, including
            species, measurements, updates, and photos, as a ZIP archive.
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Bonsai Data</span>
          </button>
        </section>

        {/* Import Data */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Import Data
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Restore from a previously exported backup ZIP. This will overwrite
            your current data.
          </p>
          <input
            type="file"
            accept=".zip"
            ref={fileInputRef}
            onChange={handleImportChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import Bonsai Data</span>
          </button>
        </section>
      </main>
      </div>
      <ConfirmDialog
        open={importConfirm.open}
        title="Replace collection with backup?"
        description={importWarningMessage}
        confirmLabel="Import backup"
        cancelLabel="Go back"
        destructive
        onConfirm={confirmImport}
        onCancel={cancelImport}
        isLoading={isImporting}
      />
    </>
  );
};

export default Settings;
