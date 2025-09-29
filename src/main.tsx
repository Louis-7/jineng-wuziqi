import React from 'react';
import './ui/i18n';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
