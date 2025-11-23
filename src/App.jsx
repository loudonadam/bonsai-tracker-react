import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const TreeDetail = lazy(() => import('./pages/TreeDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const Species = lazy(() => import('./pages/Species'));
const Graveyard = lazy(() => import('./pages/Graveyard'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tree/:id" element={<TreeDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/species" element={<Species />} />
          <Route path="/graveyard" element={<Graveyard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;