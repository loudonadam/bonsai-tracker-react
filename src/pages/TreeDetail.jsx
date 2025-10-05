import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Ruler, Edit, Plus, ChevronLeft, ChevronRight, X, Star, Camera } from 'lucide-react';

// Mock data for a single tree with full details
const mockTreeData = {
  id: 1,
  name: "Autumn Flame",
  species: "Japanese Maple (Acer palmatum)",
  acquisitionDate: "2018-04-20",
  currentGirth: 15.3,
  starred: true,
  notes: "Beautiful red leaves in fall. Received as a gift from sensei. Responds well to pruning. Prefers partial shade in summer.",
  photos: [
    {
      id: 1,
      url: null,
      date: "2024-12-01",
      description: "Winter structure visible",
      isMainPhoto: false
    },
    {
      id: 2,
      url: null,
      date: "2024-09-15",
      description: "Full autumn color display",
      isMainPhoto: true
    },
    {
      id: 3,
      url: null,
      date: "2024-06-20",
      description: "After repotting - healthy growth",
      isMainPhoto: false
    },
    {
      id: 4,
      url: null,
      date: "2024-03-10",
      description: "Spring buds emerging",
      isMainPhoto: false
    }
  ],
  updates: [
    {
      id: 1,
      date: "2024-12-01",
      workPerformed: "Light pruning of crossing branches. Removed wire from trunk.",
      girth: 15.3
    },
    {
      id: 2,
      date: "2024-09-15",
      workPerformed: "Fertilizing stopped for fall color development. Perfect red coloration achieved.",
      girth: 15.1
    },
    {
      id: 3,
      date: "2024-06-20",
      workPerformed: "Repotted into larger pot. Root pruning performed. Added akadama soil mix.",
      girth: 14.8
    },
    {
      id: 4,
      date: "2024-03-10",
      workPerformed: "First pruning of the season. Wired two main branches for movement.",
      girth: 14.5
    }
  ]
};

const TreeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  
  const tree = mockTreeData; // In real app, fetch by id
  
  // Calculate age
  const calculateAge = (dateString) => {
    const start = new Date(dateString);
    const now = new Date();
    const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
    return years.toFixed(1);
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  // Carousel navigation
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev === tree.photos.length - 1 ? 0 : prev + 1
    );
  };
  
  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? tree.photos.length - 1 : prev - 1
    );
  };
  
  // Tab content components
  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Tree Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Species:</span>
              <span className="font-medium">{tree.species}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Acquired:</span>
              <span className="font-medium">{formatDate(tree.acquisitionDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Age:</span>
              <span className="font-medium">{calculateAge(tree.acquisitionDate)} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Girth:</span>
              <span className="font-medium">{tree.currentGirth} cm</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Photos:</span>
              <span className="font-medium">{tree.photos.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Updates:</span>
              <span className="font-medium">{tree.updates.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Update:</span>
              <span className="font-medium">{formatDate(tree.updates[0].date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Growth Rate:</span>
              <span className="font-medium text-green-600">
                +{(tree.currentGirth - tree.updates[tree.updates.length - 1].girth).toFixed(1)} cm
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Notes</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{tree.notes}</p>
      </div>
    </div>
  );
  
  const PhotosTab = () => (
    <div className="space-y-6">
      {/* Carousel */}
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden" style={{ height: '400px' }}>
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
            <Camera className="w-24 h-24 text-gray-400" strokeWidth={1.5} />
          </div>
        )}
        
        {/* Navigation arrows */}
        {tree.photos.length > 1 && (
          <>
            <button 
              onClick={prevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        
        {/* Photo info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="flex items-start justify-between">
            <div className="text-white">
              <p className="text-sm opacity-90">{formatDate(tree.photos[currentPhotoIndex].date)}</p>
              <p className="font-medium">{tree.photos[currentPhotoIndex].description}</p>
            </div>
            {tree.photos[currentPhotoIndex].isMainPhoto && (
              <div className="bg-yellow-400 rounded-full p-1.5">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
            )}
          </div>
        </div>
        
        {/* Photo counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentPhotoIndex + 1} / {tree.photos.length}
        </div>
      </div>
      
      {/* Thumbnail strip */}
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
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
              </div>
            )}
            {photo.isMainPhoto && (
              <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-0.5">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </button>
        ))}
        
        {/* Add photo button */}
        <button className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-600 flex items-center justify-center transition-colors">
          <Plus className="w-8 h-8 text-gray-400" />
        </button>
      </div>
      
      {/* Set as main photo button */}
      {!tree.photos[currentPhotoIndex].isMainPhoto && (
        <button className="w-full py-2 px-4 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200 transition-colors flex items-center justify-center gap-2">
          <Star className="w-4 h-4" />
          Set as Main Photo
        </button>
      )}
    </div>
  );
  
  const UpdatesTab = () => (
    <div className="space-y-4">
      <button className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        Add New Update
      </button>
      
      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-200"></div>
        
        {tree.updates.map((update, index) => (
          <div key={update.id} className="relative pl-20 pb-8 last:pb-0">
            {/* Timeline dot */}
            <div className="absolute left-6 top-2 w-5 h-5 bg-green-600 rounded-full border-4 border-white shadow"></div>
            
            {/* Update card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(update.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Ruler className="w-4 h-4" />
                    <span>Girth: {update.girth} cm</span>
                    {index < tree.updates.length - 1 && (
                      <span className="text-xs text-green-600">
                        (+{(update.girth - tree.updates[index + 1].girth).toFixed(1)} cm)
                      </span>
                    )}
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-700">{update.workPerformed}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const MeasurementsTab = () => {
    const girthData = [...tree.updates].reverse(); // Oldest to newest for chronological order
    const minGirth = Math.min(...girthData.map(u => u.girth));
    const maxGirth = Math.max(...girthData.map(u => u.girth));
    const range = maxGirth - minGirth;
    
    // Add some padding to the chart range
    const chartMin = minGirth - (range * 0.1 || 1);
    const chartMax = maxGirth + (range * 0.1 || 1);
    const chartRange = chartMax - chartMin;
    
    // Format date for display
    const formatDateShort = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: '2-digit' 
      });
    };
    
    // Calculate SVG points for the line
    const chartWidth = 800;
    const chartHeight = 300;
    const padding = { top: 20, right: 40, bottom: 40, left: 60 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;
    
    // Convert data to SVG coordinates
    const points = girthData.map((update, index) => {
      const x = padding.left + (index / (girthData.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - ((update.girth - chartMin) / chartRange) * plotHeight;
      return { x, y, update, index };
    });
    
    // Create SVG path
    const linePath = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');
    
    // Create area fill path
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;
    
    // Y-axis labels
    const yAxisSteps = 5;
    const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
      const value = chartMin + (chartRange * i / yAxisSteps);
      return value.toFixed(1);
    });
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-6">Girth Progress Over Time</h3>
          
          {/* SVG Line Chart */}
          <div className="overflow-x-auto">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full"
              style={{ maxWidth: '800px' }}
            >
              {/* Grid lines */}
              {yAxisLabels.map((label, i) => {
                const y = padding.top + plotHeight - (i / yAxisSteps) * plotHeight;
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
              
              {/* Y-axis labels */}
              {yAxisLabels.map((label, i) => {
                const y = padding.top + plotHeight - (i / yAxisSteps) * plotHeight;
                return (
                  <text
                    key={i}
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#6b7280"
                  >
                    {label} cm
                  </text>
                );
              })}
              
              {/* Area fill */}
              <path
                d={areaPath}
                fill="url(#gradient)"
                opacity="0.2"
              />
              
              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {points.map((point, i) => (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="white"
                    stroke="#16a34a"
                    strokeWidth="3"
                    className="hover:r-7 transition-all cursor-pointer"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="12"
                    fill="transparent"
                    className="cursor-pointer"
                  >
                    <title>{`${formatDate(point.update.date)}: ${point.update.girth} cm`}</title>
                  </circle>
                </g>
              ))}
              
              {/* X-axis labels */}
              {points.map((point, i) => (
                <text
                  key={i}
                  x={point.x}
                  y={chartHeight - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {formatDateShort(point.update.date)}
                </text>
              ))}
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              
              {/* Axes */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={chartHeight - padding.bottom}
                stroke="#9ca3af"
                strokeWidth="2"
              />
              <line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke="#9ca3af"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Growth</div>
            <div className="text-2xl font-bold text-green-600">
              +{(maxGirth - minGirth).toFixed(1)} cm
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {((maxGirth - minGirth) / minGirth * 100).toFixed(1)}% increase
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Average per Year</div>
            <div className="text-2xl font-bold text-blue-600">
              +{(() => {
                const firstDate = new Date(girthData[0].date);
                const lastDate = new Date(girthData[girthData.length - 1].date);
                const years = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25);
                const avgPerYear = years > 0 ? (maxGirth - minGirth) / years : 0;
                return avgPerYear.toFixed(2);
              })()} cm
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Based on {girthData.length} measurements
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Current Girth</div>
            <div className="text-2xl font-bold text-purple-600">
              {maxGirth} cm
            </div>
            <div className="text-xs text-gray-500 mt-1">
              As of {formatDate(girthData[girthData.length - 1].date)}
            </div>
          </div>
        </div>
        
        {/* Data Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Girth (cm)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Change</th>
              </tr>
            </thead>
            <tbody>
              {[...girthData].reverse().map((update, index, arr) => {
                const prevUpdate = arr[index + 1];
                const change = prevUpdate ? (update.girth - prevUpdate.girth) : 0;
                
                return (
                  <tr key={update.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">
                      {formatDate(update.date)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {update.girth}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {index === arr.length - 1 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {change >= 0 ? '+' : ''}{change.toFixed(1)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Collection</span>
            </button>
            
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Tree
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tree Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{tree.name}</h1>
                {tree.starred && (
                  <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                )}
              </div>
              <p className="text-lg text-gray-600 italic">{tree.species}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{calculateAge(tree.acquisitionDate)} years old</span>
                </div>
                <div className="flex items-center gap-1">
                  <Ruler className="w-4 h-4" />
                  <span>{tree.currentGirth} cm girth</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {['overview', 'photos', 'updates', 'measurements'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-4 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-green-600 text-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'photos' && <PhotosTab />}
            {activeTab === 'updates' && <UpdatesTab />}
            {activeTab === 'measurements' && <MeasurementsTab />}
          </div>
        </div>
      </main>

      {/* Fullscreen Photo Modal */}
      {fullscreenPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
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
                <Camera className="w-32 h-32 text-gray-600" strokeWidth={1} />
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