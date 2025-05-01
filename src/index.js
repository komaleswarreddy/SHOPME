import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./styles/admin.css";
import "./styles/modern.css";

import KindeProvider from "@kinde-oss/kinde-auth-react";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <KindeProvider
      clientId={process.env.REACT_APP_KINDE_CLIENT_ID}
      domain={process.env.REACT_APP_KINDE_DOMAIN}
      redirectUri={process.env.REACT_APP_KINDE_REDIRECT_URI}
      logoutUri={process.env.REACT_APP_KINDE_LOGOUT_REDIRECT_URI}
    >
      <App />
    </KindeProvider>
  </BrowserRouter>
);
