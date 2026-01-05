import ReactDOM from "react-dom/client";
import React from "react";

import App from "./App.jsx";
import "./index.css";

// import { browserLocalPersistence, setPersistence } from "firebase/auth";
// import { auth } from "./services/firebase.js";

// await setPersistence(auth, browserLocalPersistence)


const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
