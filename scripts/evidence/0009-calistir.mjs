// Spec 0009 görüntü aracını çalıştırır: sayfayı vite ile paketler, Electron'da ekranları yakalar.
// Kullanım: node scripts/evidence/0009-calistir.mjs <cikisKlasoru> [karsilastirilacakKlasor]
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const kok = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const [cikis, karsi] = process.argv.slice(2).map(p => path.resolve(p));
const outDir = mkdtempSync(path.join(os.tmpdir(), "0009-"));
await build({ configFile: false, logLevel: "error", root: path.join(kok, "scripts", "evidence"), base: "./", plugins: [react()], mode: "development",
  build: { outDir, emptyOutDir: true, minify: false, rollupOptions: { input: path.join(kok, "scripts", "evidence", "0009-sayfa.html") } } });
const electron = require(path.join(kok, "node_modules", "electron"));
const r = spawnSync(electron, [path.join(kok, "scripts", "evidence", "0009-ekran.cjs"), path.join(outDir, "0009-sayfa.html"), cikis, ...(karsi ? [karsi] : [])], { encoding: "utf-8", stdio: "inherit", timeout: 600000 });
process.exit(r.status ?? 1);
