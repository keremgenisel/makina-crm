import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Electron'u spawn eden test dosyaları (better-sqlite3 Electron ABI'siyle derli; gerçek sunucu/IPC).
// CI bunları ayrı işte koşturur: VITEST_ELECTRON=skip → hariç, VITEST_ELECTRON=only → yalnız bunlar.
// Değişken yoksa (yerel `npm test`) hepsi birlikte koşar. vitest'in --exclude/pozisyonel süzgeci
// çoklu kullanımda güvenilmez olduğu için ayrım burada, yapılandırmada yapılır.
const ELECTRON_TESTLERI = [
  "tests/db-electron.test.js", "tests/server-security.test.js", "tests/image-optimize.test.js",
  "tests/security-flush.test.js", "tests/setup-admin-lockout.test.js",
];
const electronModu = process.env.VITEST_ELECTRON || "";
const testAyari = {
  ...(electronModu === "only" ? { include: ELECTRON_TESTLERI } : {}),
  exclude: ["**/node_modules/**", "**/dist/**", "**/release/**", ...(electronModu === "skip" ? ELECTRON_TESTLERI : [])],
};

export default defineConfig({
  plugins: [react()],
  test: testAyari,
  base: "./", // Electron file:// protokolü için gerekli
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      // Çok sayfalı: ana uygulama + ayrı Faaliyet Haritası penceresi. Yollar kök dizine
      // göre çözülür. import.meta.glob harita chunk'ları iki entry arasında PAYLAŞILIR
      // (kopyalanmaz), harita verisi tek sefer bundle olur.
      input: { main: "index.html", harita: "harita.html", servis: "servis.html" },
    },
  },
});
