import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Species = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="mb-4 text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Collection
        </button>
        
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🌿 Species Library</h1>
          <p className="text-gray-600">Comprehensive species information coming soon!</p>
        </div>
      </div>
    </div>
  );
};

export default Species;