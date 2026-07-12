// GitHub Release yayınlayıcı — electron-builder'ın kendi publisher'ı yerine.
//
// Neden: electron-builder'ın GitHub publisher'ı her artifact (.exe + .blockmap + latest.yml)
// için "getOrCreateRelease"ı EŞ ZAMANLI çağırır; bu, aynı tag'te iki release yaratma yarışına
// yol açar ("422 Published releases must have a valid tag") ve dosyalar iki release'e bölünür
// ya da latest.yml hiç yüklenmez. Bunu v3.0.0 ve v3.0.1'de elle onarmak zorunda kaldık.
//
// Bu script yarışı kökten kaldırır: release'i TEK kez oluşturur (varsa yeniden kullanır) ve
// üç dosyayı SIRAYLA yükler. Idempotent'tir: yarıda kalırsa `node scripts/publish-release.cjs`
// tekrar çalıştırılıp tamamlanabilir (mevcut asset varsa silinip yeniden yüklenir).
//
// latest.yml'yi .exe'den kendimiz üretiriz — electron-builder'ın bıraktığı bayat latest.yml'ye
// (yanlış sürüm/hash) güvenmeyiz; bu da v3.0.1'de yaşanan ikinci hataydı.

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const pkg = require("../package.json");
const VERSION = pkg.version;
const TAG = `v${VERSION}`;
const publishCfg = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
const OWNER = publishCfg.owner;
const REPO = publishCfg.repo;
const PRODUCT = (pkg.build && pkg.build.productName) || pkg.name;
const RELEASE_DIR = path.join(__dirname, "..", "release");

// ── Saf yardımcılar (test edilir) ────────────────────────────────────────────
// electron-builder yüklerken dosya adındaki boşlukları tireye çevirir:
// "Altunmak CRM Setup 3.0.1.exe" → "Altunmak-CRM-Setup-3.0.1.exe". Aynısını üretiyoruz ki
// latest.yml url'i ile yüklenen asset adı bire bir uyuşsun (electron-updater bunu şart koşar).
function assetNameFromLocal(basename) {
  return basename.replace(/ /g, "-");
}

// electron-updater'ın beklediği latest.yml biçimi (electron-builder çıktısıyla aynı düzen).
function buildLatestYml({ version, exeAssetName, sha512, size, releaseDate }) {
  return [
    `version: ${version}`,
    `files:`,
    `  - url: ${exeAssetName}`,
    `    sha512: ${sha512}`,
    `    size: ${size}`,
    `path: ${exeAssetName}`,
    `sha512: ${sha512}`,
    `releaseDate: '${releaseDate}'`,
    ``,
  ].join("\n");
}

function sha512Base64(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha512");
    const s = fs.createReadStream(filePath);
    s.on("error", reject);
    s.on("data", (d) => h.update(d));
    s.on("end", () => resolve(h.digest("base64")));
  });
}

// ── GitHub API (yerleşik https; harici bağımlılık yok) ────────────────────────
function ghRequest({ method, host, path: reqPath, token, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method,
        host,
        path: reqPath,
        headers: {
          "User-Agent": "altunmak-crm-publisher",
          Authorization: `token ${token}`,
          Accept: "application/vnd.github+json",
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const text = buf.toString("utf8");
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch { /* asset upload dışı bekleniyordu */ }
          resolve({ status: res.statusCode, json, text });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getReleaseByTag(token) {
  const r = await ghRequest({ method: "GET", host: "api.github.com", path: `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`, token });
  return r.status === 200 ? r.json : null;
}

// HEAD commit'i remote'ta varsa tag'i ona sabitleriz (doğru commit'e); yoksa GitHub varsayılan
// dala göre tag üretir (main push edilmemişse böyle olur — yayını engellemez).
async function resolveTargetCommitish(token) {
  let sha = "";
  try { sha = require("child_process").execSync("git rev-parse HEAD", { cwd: path.join(__dirname, "..") }).toString().trim(); } catch { return null; }
  if (!sha) return null;
  const r = await ghRequest({ method: "GET", host: "api.github.com", path: `/repos/${OWNER}/${REPO}/commits/${sha}`, token });
  return r.status === 200 ? sha : null;
}

async function createRelease(token) {
  const target = await resolveTargetCommitish(token);
  const body = JSON.stringify({
    tag_name: TAG,
    name: VERSION,
    draft: false,
    prerelease: false,
    ...(target ? { target_commitish: target } : {}),
  });
  const r = await ghRequest({
    method: "POST", host: "api.github.com", path: `/repos/${OWNER}/${REPO}/releases`, token,
    headers: { "Content-Type": "application/json" }, body,
  });
  if (r.status === 201) return { release: r.json, target };
  // Yarışta biri önce yaratmış olabilir → tag'ten çek.
  const existing = await getReleaseByTag(token);
  if (existing) return { release: existing, target };
  throw new Error(`Release oluşturulamadı (HTTP ${r.status}): ${r.text}`);
}

async function deleteAssetIfExists(token, release, assetName) {
  const existing = (release.assets || []).find((a) => a.name === assetName);
  if (!existing) return;
  await ghRequest({ method: "DELETE", host: "api.github.com", path: `/repos/${OWNER}/${REPO}/releases/assets/${existing.id}`, token });
}

function uploadAsset(token, releaseId, assetName, filePath, contentType) {
  const data = fs.readFileSync(filePath);
  return ghRequest({
    method: "POST", host: "uploads.github.com",
    path: `/repos/${OWNER}/${REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(assetName)}`,
    token, headers: { "Content-Type": contentType, "Content-Length": data.length }, body: data,
  });
}

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GH_TOKEN (veya GITHUB_TOKEN) tanımlı değil.");
  if (!OWNER || !REPO) throw new Error("package.json build.publish owner/repo eksik.");

  const exeLocal = path.join(RELEASE_DIR, `${PRODUCT} Setup ${VERSION}.exe`);
  const blockmapLocal = `${exeLocal}.blockmap`;
  for (const f of [exeLocal, blockmapLocal]) {
    if (!fs.existsSync(f)) throw new Error(`Beklenen build dosyası yok: ${f}\nÖnce "electron-builder --win --publish never" ile derleyin.`);
  }

  const exeAsset = assetNameFromLocal(path.basename(exeLocal));          // Altunmak-CRM-Setup-<v>.exe
  const blockmapAsset = assetNameFromLocal(path.basename(blockmapLocal)); // ...exe.blockmap
  const size = fs.statSync(exeLocal).size;
  const sha512 = await sha512Base64(exeLocal);

  // latest.yml'yi .exe'den taze üret (bayat electron-builder çıktısına güvenme).
  const latestYmlPath = path.join(RELEASE_DIR, "latest.yml");
  fs.writeFileSync(latestYmlPath, buildLatestYml({ version: VERSION, exeAssetName: exeAsset, sha512, size, releaseDate: new Date().toISOString() }));

  console.log(`→ ${TAG} yayınlanıyor (${OWNER}/${REPO})`);
  const { release, target } = await createRelease(token);
  console.log(`  release id=${release.id} tag=${release.tag_name}${target ? ` commit=${target.slice(0, 12)}` : " (varsayılan dal)"}`);

  const uploads = [
    { name: exeAsset, file: exeLocal, type: "application/octet-stream" },
    { name: blockmapAsset, file: blockmapLocal, type: "application/octet-stream" },
    { name: "latest.yml", file: latestYmlPath, type: "text/yaml" },
  ];
  for (const u of uploads) {
    await deleteAssetIfExists(token, release, u.name); // idempotent: tekrar çalıştırmada üzerine yaz
    const r = await uploadAsset(token, release.id, u.name, u.file, u.type);
    if (r.status !== 201) throw new Error(`Yükleme başarısız (${u.name}, HTTP ${r.status}): ${r.text}`);
    console.log(`  ✓ ${u.name} (${r.json.size} B)`);
  }

  // Doğrula: üç dosya da yerinde mi?
  const final = await getReleaseByTag(token);
  const names = (final.assets || []).map((a) => a.name);
  const beklenen = [exeAsset, blockmapAsset, "latest.yml"];
  const eksik = beklenen.filter((n) => !names.includes(n));
  if (eksik.length) throw new Error(`Yayın eksik — eksik dosyalar: ${eksik.join(", ")}`);
  console.log(`✓ ${TAG} yayınlandı — 3 dosya doğrulandı: ${names.join(", ")}`);
}

module.exports = { assetNameFromLocal, buildLatestYml };

if (require.main === module) {
  main().catch((err) => { console.error("✗ Yayın hatası:", err.message); process.exit(1); });
}
