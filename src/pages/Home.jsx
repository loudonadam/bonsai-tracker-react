import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Download } from 'lucide-react';
import TreeCard from '../components/TreeCard';

// Import your mock data
// import { mockTrees } from '../mockData';

// Temporary mock data
const mockTrees = [
  {
    id: 1,
    name: "Autumn Flame",
    species: "Japanese Maple (Acer palmatum)",
    acquisitionDate: "2018-04-20",
    currentGirth: 15.3,
    lastUpdate: "2024-11-15",
    photoUrl: null,
    starred: true,
    notes: "Beautiful red leaves in fall. Needs repotting next spring."
  },
  {
    id: 2,
    name: "Ancient Pine",
    species: "Japanese Black Pine",
    acquisitionDate: "2015-06-10",
    currentGirth: 22.7,
    lastUpdate: "2024-10-28",
    photoUrl: null,
    starred: false,
    notes: "Very healthy. Wire training going well."
  },
  {
    id: 3,
    name: "Baby Juniper",
    species: "Chinese Juniper",
    acquisitionDate: "2023-08-05",
    currentGirth: 5.2,
    lastUpdate: "2024-12-01",
    photoUrl: null,
    starred: false,
    notes: "First year tree. Growing nicely!"
  }
];

const Home = () => {
  const navigate = useNavigate();

  const handleTreeClick = (treeId) => {
    navigate(`/tree/${treeId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🌱 Bonsai Tracker</h1>
              <p className="text-sm text-gray-600 mt-1">Track your trees with care and precision</p>
            </div>
            
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Add Tree</span>
              </button>
              
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Trees</div>
            <div className="text-2xl font-bold text-gray-900">{mockTrees.length}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Starred Favorites</div>
            <div className="text-2xl font-bold text-yellow-600">
              {mockTrees.filter(t => t.starred).length}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Average Age</div>
            <div className="text-2xl font-bold text-green-600">
              {(mockTrees.reduce((sum, tree) => {
                const age = (new Date() - new Date(tree.acquisitionDate)) / (1000 * 60 * 60 * 24 * 365.25);
                return sum + age;
              }, 0) / mockTrees.length).toFixed(1)} years
            </div>
          </div>
        </div>

        {/* Trees Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">My Collection</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mockTrees.map(tree => (
              <div key={tree.id} onClick={() => handleTreeClick(tree.id)}>
                <TreeCard tree={tree} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;