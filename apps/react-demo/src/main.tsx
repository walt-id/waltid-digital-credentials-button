import React from 'react';
import ReactDOM from 'react-dom/client';
import '@waltid/digital-credentials';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
