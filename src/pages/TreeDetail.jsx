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
  Camera
} from 'lucide-react';

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

        <button onClick={prevPhoto} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={nextPhoto} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow">
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

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tree.photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setCurrentPhotoIndex(index)}
            className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
              index === currentPhotoIndex ? 'border-green-600 scale-105' : 'border-gray-300'
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

  const MeasurementsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Measurements Over Time</h3>
        <div className="space-y-4">
          {tree.updates.map((update) => (
            <div key={update.id} className="flex justify-between border-b border-gray-200 pb-2 text-sm text-gray-700">
              <div>{formatDate(update.date)}</div>
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-gray-500" />
                <span>{update.girth} cm</span>
              </div>
            </div>
          ))}
        </div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-4 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Collection</span>
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Edit className="w-4 h-4" />
            Edit Tree
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div>
          {/* Tree Info */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
                    <span className="font-medium">{calculateAge(tree.acquisitionDate)} years old</span>
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
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 flex flex-wrap">
              {['overview', 'photos', 'updates', 'measurements'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 sm:flex-none sm:px-6 px-4 py-3 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-green-600 text-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'photos' && <PhotosTab />}
              {activeTab === 'updates' && <UpdatesTab />}
              {activeTab === 'measurements' && <MeasurementsTab />}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total Photos:</span><span>{tree.photos.length}</span></div>
              <div className="flex justify-between"><span>Total Updates:</span><span>{tree.updates.length}</span></div>
              <div className="flex justify-between"><span>Last Update:</span><span>{formatDate(tree.updates[0].date)}</span></div>
              <div className="flex justify-between"><span>Growth:</span><span className="text-green-600">+{(tree.currentGirth - tree.updates[tree.updates.length - 1].girth).toFixed(1)} cm</span></div>
            </div>
          </div>
        </aside>
      </main>

      {/* Fullscreen Photo Viewer */}
      {fullscreenPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setFullscreenPhoto(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setFullscreenPhoto(null)}>
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-6xl max-h-full">
            {fullscreenPhoto.url ? (
              <img src={fullscreenPhoto.url} alt={fullscreenPhoto.description} className="max-w-full max-h-[90vh] object-contain" />
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
