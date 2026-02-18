import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import './styles/tailwind.css';
import './styles/theme.css';
import './styles/index.css';
import './styles/dashboard-responsive.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
