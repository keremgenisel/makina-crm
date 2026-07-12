import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { applyTheme, getSavedTheme } from "./lib/theme.js";
import "./ui.css";

// Kaydedilmiş temayı ilk boyamadan önce uygula (flaş olmasın).
applyTheme(getSavedTheme());

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
