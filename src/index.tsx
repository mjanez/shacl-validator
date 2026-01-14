import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container missing in index.html');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL || '/'}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
