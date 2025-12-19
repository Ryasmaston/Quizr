import ReactDOM from "react-dom/client";
import React from "react";

import App from "./App.jsx";
import "./index.css";

// import { browserLocalPersistence, setPersistence } from "firebase/auth";
// import { auth } from "./services/firebase.js";

// await setPersistence(auth, browserLocalPersistence)

// Get the "root" div from index.html.
// The React application will be inserted into this div.
const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
