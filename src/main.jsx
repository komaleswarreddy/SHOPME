import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // ✅ import BrowserRouter
import App from './App.jsx';
import { KindeProvider } from '@kinde-oss/kinde-auth-react';

// Import main CSS file first as a base
import './index.css';

// Import our enhanced styling
import './styles/enhanced.css';
import './styles/components.css';
import './styles/utilities.css';
import './styles/animations.css';
import './styles/home.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* ✅ Wrap App */}
      <KindeProvider
        clientId={import.meta.env.VITE_KINDE_CLIENT_ID}
        domain={import.meta.env.VITE_KINDE_DOMAIN}
        redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URI}
        logoutUri={import.meta.env.VITE_KINDE_LOGOUT_REDIRECT_URI}
      >
        <App />
      </KindeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
