import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Download, Save } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const [collectionName, setCollectionName] = useState("My Bonsai Collection");
  const fileInputRef = useRef(null);

  const handleNameSave = () => {
    alert(`Collection name saved as: ${collectionName}`);
    // You can store this in localStorage or your backend later
    localStorage.setItem("collectionName", collectionName);
  };

  const handleExport = () => {
    // Replace this mock data with real data source later
    const bonsaiData = JSON.parse(localStorage.getItem("bonsaiData")) || {
      trees: [],
      reminders: [],
    };

    const blob = new Blob([JSON.stringify(bonsaiData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bonsai_export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        localStorage.setItem("bonsaiData", JSON.stringify(importedData));
        alert("Bonsai data imported successfully!");
      } catch {
        alert("Invalid file format. Please upload a valid JSON export.");
      }
    };
    reader.readAsText(file);
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
            Download a backup of all your bonsai data as a JSON file.
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
            Restore from a previously exported JSON file. This will overwrite
            your current data.
          </p>
          <input
            type="file"
            accept=".json"
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
