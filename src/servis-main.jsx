// Servis ve Kargo Panosu ayrı penceresinin React kökü. Harita penceresi gibi App'i BİLEREK
// mount etmez — App'in debounce'lu crmStorage.save'i iki pencerede aynı blob'u yazıp
// optimistic-locking çakışmalarına yol açardı. Burada yalnız pano çalışır; veri IPC'den gelir,
// penceredeki yazmalar ana pencereye geri gider (ServisPencere köprüler).
import React from "react";
import ReactDOM from "react-dom/client";
import { ServisPencere } from "./components/ServisPencere.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { applyTheme, getSavedTheme } from "./lib/theme.js";
import "./ui.css";

// İlk boyamada kayıtlı temayı uygula (flaş olmasın). Güncel tema IPC verisiyle gelir ve
// ServisPencere onu yeniden uygular — localStorage paylaşımına bağlı değiliz.
applyTheme(getSavedTheme());

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <ServisPencere />
  </ErrorBoundary>
);
