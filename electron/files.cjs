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
/**
 * Depo adı yalnız DÜZ bir dosya adı olabilir. Arayüzden gelen ad doğrudan yola çevrilirse
 * "../../gizli.png" gibi bir değerle dosya klasörünün dışına çıkılabiliyordu; en ağırı
 * files:remove idi (klasör dışındaki bir dosyayı silebiliyordu). Ayırıcı ya da ".." içeren
 * her ad reddedilir. path.basename platforma göre çalışır: Windows'ta "\\" de ayırıcıdır.
 */
function depoAdiGuvenliMi(depoAd) {
  const ad = String(depoAd ?? "");
  if (!ad || ad === "." || ad === "..") return false;
  if (ad.includes("\0")) return false;                 // NUL ile yol kesme
  // Ayırıcıları platformdan bağımsız reddet: uygulama Windows'ta çalışıyor (orada "\" de
  // ayırıcı), üretim/test macOS'ta olabiliyor. Geçerli bir depo adı zaten ikisini de
  // içermez — sanitizeAd "/" ve "\" karakterlerini "_" yapar.
  if (/[/\\]/.test(ad)) return false;
  return ad === path.basename(ad);
}

function dosyaYolu(app, depoAd) {
  // Fail-closed: geçersiz ad yol üretmez. Çağıranların hepsi try/catch içinde ya da
  // varMi() ile önceden sorduğu için bu hata "dosya yok" olarak görünür.
  if (!depoAdiGuvenliMi(depoAd)) throw new Error("Geçersiz dosya adı: " + depoAd);
  const tam = path.join(dosyalarDir(app), depoAd);
  const kok = path.resolve(dosyalarDir(app));
  // İkinci savunma: sembolik bağ/çözümleme sonrası da klasörün içinde kalmalı
  if (!path.resolve(tam).startsWith(kok + path.sep)) throw new Error("Klasör dışı yol: " + depoAd);
  return tam;
}

/**
 * Mark-of-the-Web (MOTW) damgası: "<yol>:Zone.Identifier" alternatif veri akışına
 * ZoneId=3 (Internet) yazar.
 *
 * Neden: beyaz listede .doc/.xls var ve bunlar VBA makro taşıyabilen eski Office biçimleri.
 * Listeden çıkarmak fabrikanın gerçek evrak akışını bozardı (eski .xls/.doc dosyaları hâlâ
 * günlük kullanımda). Dosya fs.writeFileSync ile yazıldığı için MOTW almıyordu, yani Word/Excel
 * belgeyi Protected View OLMADAN açıyor ve kullanıcıyla makro arasında tek adım kalıyordu.
 * Damga, işletim sisteminin kendi ilk savunma katmanını (Protected View / Adobe Korumalı Görünüm)
 * geri getirir; kullanıcı için hiçbir ek tıklama yaratmaz.
 *
 * Açma anında damgalanır: tek boğaz noktası orası (yükleme, yedekten geri yükleme ve sunucudan
 * indirme yollarının hepsi oradan geçer). Yalnız Windows/NTFS'te anlamlı; diğer platformlarda
 * ve ADS desteklemeyen dosya sistemlerinde sessizce atlanır (damga yokluğu açmayı engellemez).
 * platform parametresi test içindir: Windows dalı diğer platformlarda da doğrulanabilsin.
 */
function motwDamgala(tamYol, platform = process.platform) {
  if (platform !== "win32") return { ok: false, atlandi: true };
  try {
    fs.writeFileSync(tamYol + ":Zone.Identifier", "[ZoneTransfer]\r\nZoneId=3\r\n");
    return { ok: true };
  } catch (err) { return { ok: false, error: err.message }; } // FAT32/ağ sürücüsü → damga yok, açma yine de sürer
}

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
//
// GÜVENLİK: yedek klasörü GÜVENİLMEZ girdidir. Yedek çifti (JSON + komşu klasör) elle
// hazırlanabildiği için, buradan gelen dosya adları da saldırgan kontrolündedir. Denetimsizken
// "Fatura.exe" gibi bir dosya deposa girebiliyor, künyesi de aynı yedekten geldiği için arayüzde
// "PDF" rozetiyle görünüyor ve kullanıcı "Aç"a basınca çalışıyordu (veri hâkimiyeti → kod
// yürütme). Artık yükleme uçlarıyla aynı iki kapıdan geçer: izinliMi() beyaz listesi ve
// dosyaYolu() (fail-closed, klasör dışına yazamaz). Beyaz liste dışı dosya kopyalanmaz.
function geriYukleDosyaKlasoru(app, jsonPath, pass = null) {
  try {
    const kaynak = yedekKlasorYolu(jsonPath);
    if (!fs.existsSync(kaynak)) return { ok: true, yok: true };
    dosyalarDir(app); // hedef klasör yoksa oluştur (dosyaYolu yalnız yol üretir)
    let adet = 0, atlanan = 0;
    for (const f of fs.readdirSync(kaynak)) {
      const srcPath = path.join(kaynak, f);
      const sifreli = f.toLowerCase().endsWith(".enc");
      const hedefAd = sifreli ? f.slice(0, -4) : f; // ".enc" soyulduktan sonraki gerçek ad denetlenir
      // Beyaz liste dışı (ör. .exe/.bat/.lnk) ya da yol ayracı taşıyan ad → hiç kopyalama.
      if (!izinliMi(hedefAd) || !depoAdiGuvenliMi(hedefAd)) { atlanan++; continue; }
      let hedefYol;
      try { hedefYol = dosyaYolu(app, hedefAd); } catch { atlanan++; continue; }
      if (sifreli) {
        if (!pass) continue; // şifreli dosya, parola yok → atla
        try { fs.writeFileSync(hedefYol, decryptFileBuffer(fs.readFileSync(srcPath), pass)); adet++; }
        catch { /* yanlış parola/bozuk dosya → atla */ }
      } else { fs.copyFileSync(srcPath, hedefYol); adet++; }
    }
    return { ok: true, adet, atlanan };
  } catch (err) { return { ok: false, error: err.message }; }
}

module.exports = { IZINLI_UZANTILAR, MAX_BOYUT, uzanti, turKategori, izinliMi, optimizeEdilebilirResimMi, sanitizeAd, depoAdi, depoAdiGuvenliMi, dosyalarDir, dosyaYolu, motwDamgala, kopyala, sil, varMi, pruneOrphans, yedekKlasorYolu, yedekleDosyaKlasoru, geriYukleDosyaKlasoru };
