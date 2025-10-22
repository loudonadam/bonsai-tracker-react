import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Make sure Tailwind is imported
import { TreesProvider } from './context/TreesContext';
import { SpeciesProvider } from './context/SpeciesContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SpeciesProvider>
      <TreesProvider>
        <App />
      </TreesProvider>
    </SpeciesProvider>
  </React.StrictMode>
);