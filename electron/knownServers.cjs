// Bilinen (daha önce doğrulanmış) sunucu sertifika parmak izleri — kalıcı depo.
// SSH known_hosts modeli: bir sunucuyu bir kez doğrularsın, "Yerel Moda Dön"/clearConfig
// yapsan bile unutmaz; sadece sertifika GERÇEKTEN değişirse "kimlik değişti" uyarısı çıkar.
// Parmak izi gizli bir bilgi olmadığından düz JSON'da tutulur ({ "host:port": "AB:CD:..." }).
const fs = require("fs");
const path = require("path");

function dosyaYolu(app) { return path.join(app.getPath("userData"), "known-servers.json"); }

function yukle(app) {
  try {
    const p = dosyaYolu(app);
    if (fs.existsSync(p)) { const m = JSON.parse(fs.readFileSync(p, "utf-8")); if (m && typeof m === "object") return m; }
  } catch { /* bozuk/yok → boş */ }
  return {};
}

// host: "100.93.92.108:3000" (serverUrl'in host kısmı). fp: sertifika parmak izi.
function kaydet(app, host, fp) {
  if (!host || !fp) return;
  const m = yukle(app);
  if (m[host] === fp) return; // değişmedi
  m[host] = fp;
  try {
    const p = dosyaYolu(app);
    fs.writeFileSync(p + ".tmp", JSON.stringify(m, null, 2), "utf-8");
    fs.renameSync(p + ".tmp", p);
  } catch (e) { console.error("[known-servers] yazılamadı:", e.message); }
}

function hostFp(app, host) { return (host && yukle(app)[host]) || null; }            // bu host için kayıtlı fp
function fpBilinir(app, fp) { return !!fp && Object.values(yukle(app)).includes(fp); } // fp herhangi bir host'ta biliniyor mu

// Saf güven kararı (test edilebilir). Dönüş: "trusted" | "mismatch" | "needTrust".
// - force: kullanıcı kimlik-değişti uyarısına rağmen kabul etti → güven.
// - bu host için kayıtlı fp var ve farklı → mismatch (sunucunun sertifikası değişti).
// - fp bu host'ta/başka host'ta biliniyor ya da mevcut config pini eşleşiyor → güven (sessiz).
// - kullanıcı bu turda onayladı (trust) → güven.
// - aksi halde → needTrust (ilk bağlantı, parmak izi sor).
function guvenKarari({ certFp, hostFp, configFp, fpKnown, trust, force }) {
  if (force) return "trusted";
  if (hostFp && hostFp !== certFp) return "mismatch";
  if ((hostFp && hostFp === certFp) || (configFp && configFp === certFp) || fpKnown) return "trusted";
  if (trust) return "trusted";
  return "needTrust";
}

module.exports = { kaydet, hostFp, fpBilinir, guvenKarari, dosyaYolu };
