#!/usr/bin/env node
// xlsx (SheetJS) sürüm-güncelliği denetimi.
//
// Neden: xlsx, npm registry'de DEĞİL; CDN tarball'ıyla pinlenmiştir
// (package.json: "xlsx": "https://cdn.sheetjs.com/xlsx-X.Y.Z/xlsx-X.Y.Z.tgz").
// Bu yüzden ne `npm audit` ne Dependabot onu görebilir — güvenlik yamaları yeni
// SheetJS sürümleriyle geldiği için "geride kalmak = yamasız kalmak" demektir.
// Bu script, pinlenen sürümü SheetJS'in "latest" tarball'ındaki sürümle kıyaslar;
// geridyeysek uyarır ve çıkış kodu 2 döner (haftalık workflow bunu kırmızıya çevirir).
//
// Kullanım: node scripts/check-xlsx-version.cjs
// Çıkış kodları: 0 = güncel (veya ağ hatası, false-alarm üretmemek için),
//               2 = daha yeni sürüm var (elle yükseltilmeli).

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const LATEST_URL = "https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz";

// package.json'daki CDN URL'inden pinlenen sürümü çıkar. "xlsx-0.20.2" → "0.20.2".
function parsePinnedVersion(pkgJson) {
  const spec = pkgJson?.dependencies?.xlsx || pkgJson?.devDependencies?.xlsx || "";
  const m = String(spec).match(/xlsx-(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

// Basit x.y.z karşılaştırması (SheetJS düz semver kullanır). a<b → -1, a==b → 0, a>b → 1.
function compareVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

// latest.tgz'i indir, içindeki package/package.json'un version alanını döndür.
function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const req = https.get(LATEST_URL, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          const tgz = Buffer.concat(chunks);
          // tar -xzO ile yalnız package.json'u çöz (harici bağımlılık yok, sistem tar'ı).
          const pj = execFileSync("tar", ["-xzO", "package/package.json"], { input: tgz, maxBuffer: 64 * 1024 * 1024 });
          resolve(JSON.parse(pj.toString()).version);
        } catch (e) { reject(e); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("zaman aşımı")));
    req.on("error", reject);
  });
}

async function main() {
  const pkgPath = path.join(__dirname, "..", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const pinned = parsePinnedVersion(pkg);
  if (!pinned) {
    console.error("xlsx CDN pin sürümü package.json'da bulunamadı — beklenen biçim: xlsx-X.Y.Z");
    process.exit(0); // yapılandırma değişmişse false-alarm üretme
  }
  let latest;
  try {
    latest = await fetchLatestVersion();
  } catch (e) {
    console.warn(`[xlsx-check] SheetJS latest sürümü alınamadı (${e.message}) — atlanıyor.`);
    process.exit(0); // ağ hatası CI'yi kırmasın
  }
  const cmp = compareVersions(pinned, latest);
  if (cmp < 0) {
    console.error(
      `\n⚠  xlsx (SheetJS) GÜNCEL DEĞİL\n` +
      `   Pinli:  ${pinned}\n   Latest: ${latest}\n\n` +
      `   package.json'da güncelle:\n` +
      `     "xlsx": "https://cdn.sheetjs.com/xlsx-${latest}/xlsx-${latest}.tgz"\n` +
      `   sonra: npm install && npm test (xlsx içe/dışa aktarımını doğrula)\n` +
      `   Değişiklik notları: https://docs.sheetjs.com/docs/miscellany/changelog\n`
    );
    process.exit(2);
  }
  console.log(`✓ xlsx güncel (pinli ${pinned}, latest ${latest})`);
  process.exit(0);
}

// Doğrudan çalıştırıldığında main(); test için saf yardımcıları dışa aktar.
if (require.main === module) main();
module.exports = { parsePinnedVersion, compareVersions, fetchLatestVersion, LATEST_URL };
