import React from 'react';
import { Camera, Calendar, Ruler } from 'lucide-react';

// TreeCard Component - displays a single bonsai tree
const TreeCard = ({ 
  tree = {
    id: 1,
    name: "Sample Bonsai",
    species: "Japanese Maple",
    acquisitionDate: "2020-03-15",
    currentGirth: 12.5,
    lastUpdate: "2024-12-01",
    photoUrl: null,
    notes: "Beautiful fall colors"
  }
}) => {
  // Calculate tree age in years
  const calculateAge = (dateString) => {
    const start = new Date(dateString);
    const now = new Date();
    const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25);
    return years.toFixed(1);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No updates yet';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer">
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
        {tree.photoUrl ? (
          <img 
            src={tree.photoUrl} 
            alt={tree.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera className="w-16 h-16 text-green-400" strokeWidth={1.5} />
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Tree Name & Species */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {tree.name}
          </h3>
          <p className="text-sm text-gray-500 italic">
            {tree.species || 'Unknown species'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="space-y-2 text-sm">
          {/* Age */}
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-green-600" />
            <span>{calculateAge(tree.acquisitionDate)} years old</span>
          </div>

          {/* Girth */}
          {tree.currentGirth && (
            <div className="flex items-center text-gray-600">
              <Ruler className="w-4 h-4 mr-2 text-green-600" />
              <span>{tree.currentGirth} cm girth</span>
            </div>
          )}

          {/* Last Update */}
          <div className="flex items-center text-gray-600">
            <div className="w-4 h-4 mr-2 flex items-center justify-center">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            </div>
            <span className="text-xs">Updated {formatDate(tree.lastUpdate)}</span>
          </div>
        </div>

        {/* Notes Preview (if present) */}
        {tree.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 line-clamp-2">
              {tree.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreeCard;