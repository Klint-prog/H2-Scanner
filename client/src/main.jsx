import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { setupUserScopedLocalStorage } from "./auth.js";

setupUserScopedLocalStorage();

createRoot(document.getElementById("root")).render(<App />);
