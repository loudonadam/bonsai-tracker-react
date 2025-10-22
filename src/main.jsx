import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Make sure Tailwind is imported
import { TreesProvider } from './context/TreesContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TreesProvider>
      <App />
    </TreesProvider>
  </React.StrictMode>
);