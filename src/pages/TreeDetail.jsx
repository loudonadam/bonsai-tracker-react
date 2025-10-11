import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Ruler,
  Edit,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Camera,
  AlertTriangle
} from 'lucide-react';

// Try importing Recharts safely
let RechartsAvailable = true;
let LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer;
try {
  ({
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } = await import("recharts"));
} catch (err) {
  RechartsAvailable = false;
}


const mockTreeData = {
  id: 1,
  name: "Autumn Flame",
  species: "Japanese Maple (Acer palmatum)",
  acquisitionDate: "2018-04-20",
  currentGirth: 15.3,
  starred: true,
  notes: "Beautiful red leaves in fall. Received as a gift from sensei. Responds well to pruning. Prefers partial shade in summer.",
  photos: [
    { id: 1, url: null, date: "2024-12-01", description: "Winter structure visible", isMainPhoto: false },
    { id: 2, url: null, date: "2024-09-15", description: "Full autumn color display", isMainPhoto: true },
    { id: 3, url: null, date: "2024-06-20", description: "After repotting - healthy growth", isMainPhoto: false },
    { id: 4, url: null, date: "2024-03-10", description: "Spring buds emerging", isMainPhoto: false }
  ],
  updates: [
    { id: 1, date: "2024-12-01", workPerformed: "Light pruning of crossing branches. Removed wire from trunk.", girth: 15.3 },
    { id: 2, date: "2024-09-15", workPerformed: "Stopped fertilizing for fall color development.", girth: 15.1 },
    { id: 3, date: "2024-06-20", workPerformed: "Repotted into larger pot. Root pruning performed.", girth: 14.8 },
    { id: 4, date: "2024-03-10", workPerformed: "First pruning of the season. Wired two main branches for movement.", girth: 14.5 }
  ]
};

const TreeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

  const tree = mockTreeData;

  const calculateAge = (dateString) => {
    const start = new Date(dateString);
    const now = new Date();
    const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
    return years.toFixed(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const nextPhoto = () =>
    setCurrentPhotoIndex((prev) => (prev === tree.photos.length - 1 ? 0 : prev + 1));
  const prevPhoto = () =>
    setCurrentPhotoIndex((prev) => (prev === 0 ? tree.photos.length - 1 : prev - 1));

  // ─── Tabs ────────────────────────────────────────────────
  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Notes</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{tree.notes}</p>
      </div>
    </div>
  );

    const PhotosTab = () => (
    <div className="space-y-6">
      {/* 🎨 COLOR: Photo background */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
        {tree.photos[currentPhotoIndex].url ? (
          <img
            src={tree.photos[currentPhotoIndex].url}
            alt={tree.photos[currentPhotoIndex].description}
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => setFullscreenPhoto(tree.photos[currentPhotoIndex])}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={() => setFullscreenPhoto(tree.photos[currentPhotoIndex])}
          >
            <Camera className="w-24 h-24 text-gray-400" />
          </div>
        )}

        {/* 🎨 COLOR: Navigation buttons */}
        <button
          onClick={prevPhoto}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextPhoto}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex items-center justify-between text-white text-sm">
            <div>
              <p className="opacity-80">{formatDate(tree.photos[currentPhotoIndex].date)}</p>
              <p>{tree.photos[currentPhotoIndex].description}</p>
            </div>
            {tree.photos[currentPhotoIndex].isMainPhoto && (
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            )}
          </div>
        </div>
      </div>

      {/* 🎨 COLOR: Thumbnails */}
      <div className="relative overflow-visible flex gap-3 pb-3 pt-3 z-0">
        {tree.photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setCurrentPhotoIndex(index)}
            className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              index === currentPhotoIndex
                ? 'border-green-600 scale-110 -translate-y-1 shadow-lg z-20'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {photo.url ? (
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
            {photo.isMainPhoto && (
              <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-0.5">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </button>
        ))}
        <button className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-600 flex items-center justify-center transition">
          <Plus className="w-8 h-8 text-gray-400" />
        </button>
      </div>
    </div>
  );

  const UpdatesTab = () => (
    <div className="space-y-4">
      {/* 🎨 COLOR: Add new update button */}
      <button className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        Add New Update
      </button>

      <div className="space-y-4">
        {tree.updates.map((update) => (
          <div key={update.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow transition">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(update.date)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Ruler className="w-4 h-4" />
                  <span>{update.girth} cm</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-700">{update.workPerformed}</p>
          </div>
        ))}
      </div>
    </div>
  );

      const MeasurementsTab = () => {
    const hasData = tree.updates && tree.updates.length > 0;

    // Prepare data for chart (if available)
    const chartData = hasData
      ? [...tree.updates]
          .reverse()
          .map((update) => ({
            date: new Date(update.date).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            }),
            girth: update.girth,
          }))
      : [];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Growth Over Time</h3>

          {!RechartsAvailable ? (
            // 🎨 COLOR: Fallback background
            <div className="w-full h-64 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <AlertTriangle className="w-8 h-8 mb-2 text-gray-400" />
              <p className="text-sm font-medium">Charting library not installed.</p>
              <p className="text-xs text-gray-400 mt-1">
                Run <code className="bg-gray-100 px-1 py-0.5 rounded">npm install recharts</code> to enable growth charts.
              </p>
            </div>
          ) : hasData ? (
            // 🎨 COLOR: Chart area background
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  {/* 🎨 COLOR: Grid and axis colors */}
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    axisLine={{ stroke: "#D1D5DB" }}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    axisLine={{ stroke: "#D1D5DB" }}
                    label={{
                      value: "Trunk Girth (cm)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#374151",
                      fontSize: 12,
                    }}
                    domain={[0, "auto"]} // Start y-axis at 0
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #D1D5DB",
                      borderRadius: "0.5rem",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    }}
                    labelStyle={{ color: "#111827", fontWeight: 600 }}
                    formatter={(value) => [`${value} cm`, "Girth"]}
                  />
                  {/* 🎨 COLOR: Line and points */}
                  <Line
                    type="monotone"
                    dataKey="girth"
                    stroke="#16A34A"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#16A34A",
                      strokeWidth: 1,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 6, fill: "#15803D" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            // No data fallback
            <div className="w-full h-64 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <AlertTriangle className="w-8 h-8 mb-2 text-gray-400" />
              <p className="text-sm font-medium">No measurement data yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Add updates with trunk girth to see growth trends.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="font-semibold text-gray-800 mb-3">Growth Summary</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div className="flex justify-between">
              <span>Starting girth:</span>
              <span>{tree.updates[tree.updates.length - 1].girth} cm</span>
            </div>
            <div className="flex justify-between">
              <span>Current girth:</span>
              <span>{tree.currentGirth} cm</span>
            </div>
            <div className="flex justify-between font-medium text-green-600">
              <span>Total growth:</span>
              <span>
                +{(tree.currentGirth - tree.updates[tree.updates.length - 1].girth).toFixed(1)} cm
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };


  // ─── Render ───────────────────────────────────────────
  return (
    // 🎨 COLOR: Background
    <div className="min-h-screen bg-gray-50">
      {/* 🎨 COLOR: Header background */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-8 sm:px-10 lg:px-12 py-3 flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Collection</span>
          </button>
          {/* 🎨 COLOR: Edit button */}
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit Tree
          </button>
        </div>
        {/* 🎨 COLOR: Accent strip */}
        <div className="h-1 bg-green-600"></div>
      </header>

      <main className="w-full px-8 sm:px-10 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div>
          {/* 🎨 COLOR: Title background highlight */}
          <div className="bg-green-50 rounded-lg shadow-sm p-6 mb-6 border border-green-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{tree.name}</h1>
                  {tree.starred && <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />}
                </div>
                <p className="text-lg text-gray-600 italic">{tree.species}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">
                      {calculateAge(tree.acquisitionDate)} years old
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{tree.currentGirth} cm girth</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="relative">
            <div className="flex flex-wrap gap-x-2 mb-[-1px]">
              {['overview', 'photos', 'updates', 'measurements'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium capitalize rounded-t-xl transition-all border ${
                    activeTab === tab
                      ? 'bg-white border-b-transparent border-gray-200 shadow-sm text-green-600'
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content area */}
            <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 p-6">
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'photos' && <PhotosTab />}
              {activeTab === 'updates' && <UpdatesTab />}
              {activeTab === 'measurements' && <MeasurementsTab />}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* 🎨 COLOR: Sidebar background */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Photos:</span>
                <span>{tree.photos.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Updates:</span>
                <span>{tree.updates.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span>{formatDate(tree.updates[0].date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Growth:</span>
                <span className="text-green-600">
                  +{(tree.currentGirth - tree.updates[tree.updates.length - 1].girth).toFixed(1)} cm
                </span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Fullscreen Photo Viewer */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setFullscreenPhoto(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-6xl max-h-full">
            {fullscreenPhoto.url ? (
              <img
                src={fullscreenPhoto.url}
                alt={fullscreenPhoto.description}
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : (
              <div className="w-96 h-96 bg-gray-800 rounded-lg flex items-center justify-center">
                <Camera className="w-32 h-32 text-gray-600" />
              </div>
            )}
            <div className="text-center mt-4 text-white">
              <p className="text-sm opacity-75">{formatDate(fullscreenPhoto.date)}</p>
              <p className="font-medium">{fullscreenPhoto.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeDetail;