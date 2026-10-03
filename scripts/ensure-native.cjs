// Native SQLite binary'leri Electron ile yüklenebiliyor mu? Değilse yeniden derle.
// Windows release derlemesi (electron-builder npmRebuild) ve npm install, macOS'ta
// binary'yi Electron ABI'siyle uyumsuz bırakabiliyor; uygulama o zaman sessizce JSON
// moduna düşüyor. Bu betik npm run dev'den önce (predev) çalışır: sağlıklıysa ~1 sn
// sürer, bozuksa electron-rebuild ile onarır.
// `--denetle`: yalnız denetler (yeniden derlemez), her sürücü için sonucu yazar ve biri sağlıksızsa 1 ile çıkar
// (spec 0069 R5: yükseltmelerde şifreli sürücünün yüklendiğinin çalıştırılabilir kanıtı).
// Üretimde db.cjs şifreli-yetenekli better-sqlite3-multiple-ciphers kullanır; asıl
// doğrulanması gereken odur. Yedek better-sqlite3 de kontrol edilir.
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const root = path.join(__dirname, "..");
const electronBin = require(path.join(root, "node_modules", "electron")); // binary yolu (string)

// require tek başına yeterli değil: binary'yi ancak Database açılırken yükler — bu yüzden
// probe gerçekten bir veritabanı açar. multiple-ciphers için ayrıca PRAGMA key ile şifreleme yolunu da
// dener (cipher build gerçekten çalışıyor mu). Şifreli deneme GEÇİCİ BİR DOSYADA yapılır: sürücü bellek içi
// veritabanında anahtarı reddeder ("Setting key not supported for in-memory or temporary databases"); deneme
// eskiden ":memory:" kullandığı için şifreli sürücü her çalışmada sağlıksız sayılıyordu (spec 0069).
const MODULES = [
  { ad: "better-sqlite3-multiple-ciphers", sifreli: true },
  { ad: "better-sqlite3", sifreli: false },
];

const probeFor = (m, dosya) => {
  const req = JSON.stringify(path.join(root, "node_modules", m.ad));
  const govde = m.sifreli
    ? `const d = new D(${JSON.stringify(dosya)}); d.pragma("key='probe-key'"); d.exec("create table t(x)"); d.close();
       let r = false; try { const z = new D(${JSON.stringify(dosya)}); z.prepare("select count(*) from sqlite_master").get(); z.close(); } catch { r = true; }
       if (!r) throw new Error("anahtarsız açılış reddedilmedi: dosya şifreli yazılmadı");`
    : `new D(":memory:").close();`;
  return `try { const D = require(${req}); ${govde} process.exit(0); } catch (e) { console.error(e.message); process.exit(1); }`;
};

const denetle = (m) => {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), "ensure-native-"));
  try {
    const r = spawnSync(electronBin, ["-e", probeFor(m, path.join(klasor, "probe.db"))], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      encoding: "utf-8",
    });
    return { ok: r.status === 0, hata: (r.stderr || "").trim().split("\n")[0] };
  } finally { fs.rmSync(klasor, { recursive: true, force: true }); }
};
const check = (m) => denetle(m).ok;

if (process.argv.includes("--denetle")) {
  let saglam = true;
  for (const m of MODULES) {
    const r = denetle(m);
    const surum = require(path.join(root, "node_modules", m.ad, "package.json")).version;
    console.log(`[ensure-native] ${m.ad} ${surum}${m.sifreli ? " (şifreli: PRAGMA key + şifreli dosya)" : ""}: ${r.ok ? "SAĞLAM" : `SAĞLIKSIZ (${r.hata})`}`);
    if (!r.ok) saglam = false;
  }
  process.exit(saglam ? 0 : 1);
}

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
