import React from 'react';
import ReactDOM from 'react-dom/client';
import '@waltid/digital-credentials';
import { installMocks } from '@waltid/dc-mock-utils/install-mocks';
import App from './App';
import './style.css';

installMocks();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
