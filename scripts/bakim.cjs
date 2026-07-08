// Aylık bakım kontrolü: güncel olmayan paketler + güvenlik taraması + proje özel notlar.
// Kullanım: npm run bakim
// Sadece rapor üretir, hiçbir şeyi kendiliğinden güncellemez.
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const kok = path.join(__dirname, "..");
const calistir = (args) => spawnSync("npm", args, { encoding: "utf-8", cwd: kok, shell: process.platform === "win32" });

console.log("═══ Güncel olmayan paketler (npm outdated) ═══");
const outdated = calistir(["outdated"]);
process.stdout.write(outdated.stdout?.trim() ? outdated.stdout : "Tüm paketler güncel görünüyor.\n");

console.log("\n═══ Güvenlik taraması (npm audit) ═══");
const audit = calistir(["audit"]);
process.stdout.write(audit.stdout || audit.stderr || "");

console.log("\n═══ Elle kontrol gerekenler (npm audit bunları GÖREMEZ) ═══");
const pkg = require("../package.json");
console.log(`- xlsx, CVE nedeniyle npm yerine SheetJS tarball'ından geliyor: ${pkg.dependencies?.xlsx || "?"}`);
console.log("  Yeni sürüm kontrolü: https://cdn.sheetjs.com (0.20.2 sonrası çıktı mı?)");
console.log(`- Electron: ${pkg.devDependencies?.electron || "?"} — sadece son 3 major sürüm güvenlik yaması alır,`);
console.log("  https://www.electronjs.org/docs/latest/tutorial/electron-timelines ile karşılaştır.");
console.log("  Electron major yükseltmesinde better-sqlite3 yeniden derlenir (predev/ensure-native otomatik halleder).");
console.log("\nGüncelleme yaptıysan doğrulama: npm test && npm run lint && npm run build");
