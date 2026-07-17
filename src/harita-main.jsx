// Faaliyet Haritası ayrı penceresinin React kökü. App'i BİLEREK mount etmez — App'in
// debounce'lu crmStorage.save'i iki pencerede aynı blob'u yazıp optimistic-locking
// çakışmalarına yol açardı. Burada yalnız salt-okunur harita çalışır; veri IPC'den gelir.
import React from "react";
import ReactDOM from "react-dom/client";
import { HaritaPencere } from "./components/HaritaPencere.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { applyTheme, getSavedTheme } from "./lib/theme.js";
import "./ui.css";

// İlk boyamada kayıtlı temayı uygula (flaş olmasın). Gerçek/güncel tema IPC verisiyle
// birlikte gelir ve HaritaPencere onu yeniden uygular — localStorage paylaşımına bağlı değiliz.
applyTheme(getSavedTheme());

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <HaritaPencere />
  </ErrorBoundary>
);
