// Dosya arşivi — fiziksel dosya depolama (Faz 1, tek kullanıcılı/yerel).
// Dosyalar userData/dosyalar/ klasöründe durur; veritabanında yalnızca künye tutulur.
// Saf yardımcılar (uzanti/turKategori/izinliMi/sanitizeAd/depoAdi) test edilebilir; fs
// işlemleri (kopyala/sil/varMi) ayrı. Çok kullanıcılı sunucu depolaması Faz 2.
const path = require("path");
const fs = require("fs");
const { encryptFileBuffer, decryptFileBuffer } = require("./backupCrypto.cjs"); // yalnız node crypto — testte de yüklenir

const IZINLI_UZANTILAR = ["pdf", "jpg", "jpeg", "png", "gif", "webp", "xls", "xlsx", "doc", "docx", "txt", "csv"];
const MAX_BOYUT = 20 * 1024 * 1024; // 20 MB

function uzanti(ad) { const m = /\.([a-z0-9]+)$/i.exec(String(ad || "")); return m ? m[1].toLowerCase() : ""; }

// UI'da rozet/renk için kategori (PDF/JPG/XLS/DOC/TXT/DOSYA).
function turKategori(ad) {
  const e = uzanti(ad);
  if (e === "pdf") return "PDF";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(e)) return "JPG";
  if (["xls", "xlsx", "csv"].includes(e)) return "XLS";
  if (["doc", "docx"].includes(e)) return "DOC";
  if (e === "txt") return "TXT";
  return "DOSYA";
}
function izinliMi(ad) { return IZINLI_UZANTILAR.includes(uzanti(ad)); }

// Yükleme anında nazik optimize edilebilecek resim türleri (yalnız foto/tarama). PDF/Office/txt
// ve zaten sıkı olan webp/gif dokunulmaz — orijinal korunur. Saf: node testinde koşar.
const OPTIMIZE_EDILEBILIR = ["jpg", "jpeg", "png"];
function optimizeEdilebilirResimMi(ad) { return OPTIMIZE_EDILEBILIR.includes(uzanti(ad)); }

// Depolanacak güvenli ad: yol ayracı/riskli karakter yok, tek satır, sınırlı uzunluk.
function sanitizeAd(ad) {
  return String(ad || "dosya").replace(/[/\\]/g, "_").replace(/[^\w.\-() ğüşıöçĞÜŞİÖÇ]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "dosya";
}
// Diskteki okunur ve benzersiz ad: "<Firma> - <OrijinalAd> - <anahtar>.<uzantı>".
// Firma önce gelir → Explorer'da ada göre sıralanınca müşteriye/bayiye göre gruplanır ve elle
// aranabilir (kullanıcı manuel gezerken karışık görünmesin). anahtar SONA konur ki uzantı en
// sonda kalsın (dosya doğru açılsın). Firma yoksa "<OrijinalAd> - <anahtar>.<uzantı>".
// anahtar benzersizliği sağlar (aynı firma+ad iki kez yüklense bile ad çakışmaz).
function depoAdi(anahtar, orijinalAd, entityAd = "") {
  const ext = uzanti(orijinalAd);
  const taban = sanitizeAd(String(orijinalAd || "dosya").replace(/\.[a-z0-9]+$/i, "")); // uzantısız gövde
  const firma = entityAd && String(entityAd).trim() ? sanitizeAd(entityAd).slice(0, 60) : "";
  const ad = [firma, taban, anahtar].filter(Boolean).join(" - ");
  return ext ? `${ad}.${ext}` : ad;
}

function dosyalarDir(app) {
  const dir = path.join(app.getPath("userData"), "dosyalar");
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* zaten var */ }
  return dir;
}
function dosyaYolu(app, depoAd) { return path.join(dosyalarDir(app), depoAd); }

// Kaynak dosyayı depoya kopyalar. Dönüş: { ok, boyut } | { ok:false, error }.
function kopyala(app, srcPath, depoAd) {
  try {
    const st = fs.statSync(srcPath);
    if (st.size > MAX_BOYUT) return { ok: false, error: "Dosya 20 MB sınırını aşıyor." };
    fs.copyFileSync(srcPath, dosyaYolu(app, depoAd));
    return { ok: true, boyut: st.size };
  } catch (err) { return { ok: false, error: err.message }; }
}
function sil(app, depoAd) {
  try { fs.rmSync(dosyaYolu(app, depoAd), { force: true }); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
}
function varMi(app, depoAd) { try { return !!depoAd && fs.existsSync(dosyaYolu(app, depoAd)); } catch { return false; } }

// Künyesi kalmayan (30 gün sonra çöpten otomatik silinmiş) fiziksel dosyaları temizler.
// referencedNames = hâlâ künyede geçen depo adları; klasördeki gerisi silinir. Dönüş { ok, silinen }.
function pruneOrphans(app, referencedNames) {
  try {
    const dir = dosyalarDir(app);
    const ref = new Set((referencedNames || []).filter(Boolean));
    let silinen = 0;
    for (const f of fs.readdirSync(dir)) {
      if (ref.has(f)) continue;
      try { fs.rmSync(path.join(dir, f), { force: true }); silinen++; } catch { /* atla */ }
    }
    return { ok: true, silinen };
  } catch (err) { return { ok: false, error: err.message }; }
}

// Yedekleme (A seçeneği): yedek JSON'unun yanına komşu dosya klasörü. Ad: "<json adı>-dosyalar".
function yedekKlasorYolu(jsonPath) { return String(jsonPath || "").replace(/\.json$/i, "") + "-dosyalar"; }

// dosyalar/ içeriğini yedek JSON'unun yanına kopyalar. Boşsa klasör oluşturmaz. Dönüş { ok, adet | bos }.
// pass verilirse (şifreli yedek) her dosya AES-256-GCM ile şifrelenip "<ad>.enc" olarak yazılır —
// böylece yedek sızsa bile belge/resimler parolasız açılamaz. Canlı depolama hep düz kalır (browsable).
function yedekleDosyaKlasoru(app, jsonPath, pass = null) {
  try {
    const src = dosyalarDir(app);
    const liste = fs.readdirSync(src);
    if (liste.length === 0) return { ok: true, bos: true };
    const hedef = yedekKlasorYolu(jsonPath);
    fs.mkdirSync(hedef, { recursive: true });
    for (const f of liste) {
      const srcPath = path.join(src, f);
      if (pass) fs.writeFileSync(path.join(hedef, f + ".enc"), encryptFileBuffer(fs.readFileSync(srcPath), pass));
      else fs.copyFileSync(srcPath, path.join(hedef, f));
    }
    return { ok: true, adet: liste.length };
  } catch (err) { return { ok: false, error: err.message }; }
}

// Yedek JSON'unun yanındaki dosya klasörünü dosyalar/'a geri kopyalar. Klasör yoksa sessizce geçer.
// "<ad>.enc" dosyalar şifreli; pass ile çözülüp orijinal adıyla yazılır. Düz dosyalar aynen kopyalanır
// (eski/şifresiz yedekler). Parola yoksa şifreli dosyalar atlanır (çağıran parolayı sağlamalı).
function geriYukleDosyaKlasoru(app, jsonPath, pass = null) {
  try {
    const kaynak = yedekKlasorYolu(jsonPath);
    if (!fs.existsSync(kaynak)) return { ok: true, yok: true };
    const dest = dosyalarDir(app);
    let adet = 0;
    for (const f of fs.readdirSync(kaynak)) {
      const srcPath = path.join(kaynak, f);
      if (f.toLowerCase().endsWith(".enc")) {
        if (!pass) continue; // şifreli dosya, parola yok → atla
        try { fs.writeFileSync(path.join(dest, f.slice(0, -4)), decryptFileBuffer(fs.readFileSync(srcPath), pass)); adet++; }
        catch { /* yanlış parola/bozuk dosya → atla */ }
      } else { fs.copyFileSync(srcPath, path.join(dest, f)); adet++; }
    }
    return { ok: true, adet };
  } catch (err) { return { ok: false, error: err.message }; }
}

module.exports = { IZINLI_UZANTILAR, MAX_BOYUT, uzanti, turKategori, izinliMi, optimizeEdilebilirResimMi, sanitizeAd, depoAdi, dosyalarDir, dosyaYolu, kopyala, sil, varMi, pruneOrphans, yedekKlasorYolu, yedekleDosyaKlasoru, geriYukleDosyaKlasoru };
