import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TreeDetail from './pages/TreeDetail';
import Settings from './pages/Settings';
import Species from './pages/Species';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tree/:id" element={<TreeDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/species" element={<Species />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;