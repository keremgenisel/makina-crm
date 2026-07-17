import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // Electron file:// protokolü için gerekli
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      // Çok sayfalı: ana uygulama + ayrı Faaliyet Haritası penceresi. Yollar kök dizine
      // göre çözülür. import.meta.glob harita chunk'ları iki entry arasında PAYLAŞILIR
      // (kopyalanmaz), harita verisi tek sefer bundle olur.
      input: { main: "index.html", harita: "harita.html" },
    },
  },
});
