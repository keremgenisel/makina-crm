// better-sqlite3 binary'si Electron ile yüklenebiliyor mu? Değilse yeniden derle.
// Windows release derlemesi (electron-builder npmRebuild) ve npm install, macOS'ta
// binary'yi Electron ABI'siyle uyumsuz bırakabiliyor; uygulama o zaman sessizce JSON
// moduna düşüyor. Bu betik npm run dev'den önce (predev) çalışır: sağlıklıysa ~1 sn
// sürer, bozuksa electron-rebuild ile onarır.
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const electronBin = require(path.join(root, "node_modules", "electron")); // binary yolu (string)
// require tek başına yeterli değil: better-sqlite3 binary'yi ancak Database açılırken
// yükler — bu yüzden probe gerçekten bir bellek-içi veritabanı açar
const probe = `try { const D = require(${JSON.stringify(path.join(root, "node_modules", "better-sqlite3"))}); new D(":memory:").close(); process.exit(0); } catch (e) { console.error(e.message); process.exit(1); }`;

const check = () => spawnSync(electronBin, ["-e", probe], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  encoding: "utf-8",
}).status === 0;

if (check()) {
  console.log("[ensure-native] better-sqlite3 sağlıklı.");
  process.exit(0);
}

console.log("[ensure-native] better-sqlite3 Electron ile yüklenemiyor — yeniden derleniyor...");
const rebuild = spawnSync("npx", ["electron-rebuild", "-f", "-w", "better-sqlite3"], {
  cwd: root, stdio: "inherit", shell: process.platform === "win32",
});
if (rebuild.status !== 0 || !check()) {
  console.error("[ensure-native] Yeniden derleme başarısız — uygulama JSON moduna düşecek. Elle deneyin: npx electron-rebuild -f -w better-sqlite3");
  process.exit(0); // dev'i engelleme, uygulama JSON fallback ile yine açılır
}
console.log("[ensure-native] Onarıldı.");
