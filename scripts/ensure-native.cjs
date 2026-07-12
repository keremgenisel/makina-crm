// Native SQLite binary'leri Electron ile yüklenebiliyor mu? Değilse yeniden derle.
// Windows release derlemesi (electron-builder npmRebuild) ve npm install, macOS'ta
// binary'yi Electron ABI'siyle uyumsuz bırakabiliyor; uygulama o zaman sessizce JSON
// moduna düşüyor. Bu betik npm run dev'den önce (predev) çalışır: sağlıklıysa ~1 sn
// sürer, bozuksa electron-rebuild ile onarır.
// Üretimde db.cjs şifreli-yetenekli better-sqlite3-multiple-ciphers kullanır; asıl
// doğrulanması gereken odur. Yedek better-sqlite3 de kontrol edilir.
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const electronBin = require(path.join(root, "node_modules", "electron")); // binary yolu (string)

// require tek başına yeterli değil: binary'yi ancak Database açılırken yükler — bu yüzden
// probe gerçekten bir bellek-içi veritabanı açar. multiple-ciphers için ayrıca PRAGMA key ile
// şifreleme yolunu da dener (cipher build gerçekten çalışıyor mu).
const MODULES = [
  { ad: "better-sqlite3-multiple-ciphers", sifreli: true },
  { ad: "better-sqlite3", sifreli: false },
];

const probeFor = (m) => {
  const req = JSON.stringify(path.join(root, "node_modules", m.ad));
  const govde = m.sifreli
    ? `const d = new D(":memory:"); d.pragma("key='probe-key'"); d.exec("create table t(x)"); d.close();`
    : `new D(":memory:").close();`;
  return `try { const D = require(${req}); ${govde} process.exit(0); } catch (e) { console.error(e.message); process.exit(1); }`;
};

const check = (m) => spawnSync(electronBin, ["-e", probeFor(m)], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  encoding: "utf-8",
}).status === 0;

let onarilacak = MODULES.filter((m) => !check(m));
if (onarilacak.length === 0) {
  console.log("[ensure-native] SQLite modülleri sağlıklı.");
  process.exit(0);
}

console.log(`[ensure-native] Yeniden derleniyor: ${onarilacak.map((m) => m.ad).join(", ")}`);
const args = ["electron-rebuild", "-f"];
for (const m of onarilacak) args.push("-w", m.ad);
const rebuild = spawnSync("npx", args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
if (rebuild.status !== 0 || MODULES.some((m) => !check(m))) {
  console.error("[ensure-native] Yeniden derleme başarısız — uygulama JSON moduna düşebilir. Elle: npx electron-rebuild -f -w better-sqlite3-multiple-ciphers -w better-sqlite3");
  process.exit(0); // dev'i engelleme, uygulama JSON fallback ile yine açılır
}
console.log("[ensure-native] Onarıldı.");
