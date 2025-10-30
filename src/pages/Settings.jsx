import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Download, Save } from "lucide-react";

import { getApiBaseUrl } from "../services/apiClient";

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

  const handleNameSave = () => {
    alert(`Collection name saved as: ${collectionName}`);
    // You can store this in localStorage or your backend later
    localStorage.setItem("collectionName", collectionName);
  };

  const handleExport = async () => {
    try {
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

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `bonsai_backup_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to export bonsai data", error);
      alert(error.message || "Unable to export bonsai data.");
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

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

      alert(successMessage);
    } catch (error) {
      console.error("Failed to import bonsai data", error);
      alert(error.message || "Unable to import bonsai data.");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
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
            onChange={handleImport}
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
  );
};

export default Settings;
