import { CUR_SYM, DEFAULT_KDV_RATE, BACKUP_APP_TAG, SALE_TYPES, ALTUNMAK_MODELS } from "./constants";

export const today = () => new Date().toISOString().split("T")[0];
// gg/aa/yyyy formatı (yyyy-mm-dd → dd/mm/yyyy)
export const fmtTR = (iso) => {
  if (!iso) return "—";
  const p = String(iso).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
};
export const todayTR = () => fmtTR(today());
// Türkçe büyük/küçük harf dönüşümü (İ→i, I→ı doğru çalışır)
export const trLower = (s) => (s || "").toLocaleLowerCase("tr");
// Kalıp bilgisini okunur metne çevir (yeni dizi formatı + eski tek metin uyumlu)
export const kalipText = (c) => {
  if (Array.isArray(c?.kaliplar) && c.kaliplar.length) {
    return c.kaliplar.map(k => [k.olcu, k.ad].filter(Boolean).join(" - ")).filter(Boolean).join(" · ");
  }
  return c?.kalip || "—";
};
let nextId = 100;
export const uid = () => ++nextId;
export const getIdCounter = () => nextId;
export const setIdCounter = (n) => { if (n > nextId) nextId = n; };
// Mevcut kayıtların max ID'sini görüp sayacı ileri çeker — çakışmayı önler
export const bumpId = (...arrays) => {
  let max = nextId;
  arrays.forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(x => { if (x && typeof x.id === "number" && x.id > max) max = x.id; });
  });
  nextId = max;
};
// Eski yedekler (şema etiketi olmadan alınmış) için: en az bir tanıdık dizi alanı varsa kabul et.
// Ayrıca o dizilerin İÇERİĞİNİN de (en azından ilk elemanı) düz birer obje olduğunu doğrular —
// yoksa "doğru biçimli ama içi bozuk" bir dosya (örn. customers: ["a","b"]) buradan geçip
// uygulamanın ilerideki bir yerinde (c.name, c.id vb. okurken) açıklanamayan bir çökmeye yol açabilir.
const BACKUP_ARRAY_FIELDS = ["customers", "services", "dealers", "stock", "notes", "parts", "partSales"];
export const looksLikeBackup = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const arrayFields = BACKUP_ARRAY_FIELDS.filter((k) => Array.isArray(data[k]));
  if (data.app === BACKUP_APP_TAG) {
    // Yine de aynı sağlamlık kontrolünü uygula — uygulama etiketi doğru olsa da dizi içerikleri bozuk olabilir
    return arrayFields.every((k) => data[k].length === 0 || (typeof data[k][0] === "object" && data[k][0] !== null));
  }
  if (arrayFields.length === 0) return false;
  return arrayFields.every((k) => data[k].length === 0 || (typeof data[k][0] === "object" && data[k][0] !== null));
};
// Standart model listesi arayüz üzerinden asla boşaltılamaz (silme butonu yok) — bu yüzden yüklenen/
// geri yüklenen veride boş bir dizi gelirse bu her zaman bozuk veri ya da başka bir PC'den taşınmış
// eksik bir yedek demektir, gerçek bir kullanıcı tercihi olamaz. Böyle durumda varsayılanlara dönülür.
export const safeStandardModels = (loaded) => (Array.isArray(loaded) && loaded.length > 0) ? loaded : ALTUNMAK_MODELS;
// Yazdırma HTML'inden otomatik print script'ini çıkarır (Electron çift diyalog önleme)
export const stripAutoPrint = (html) => {
  const open = html.indexOf("<script>window.onload");
  if (open === -1) return html;
  const close = html.indexOf("script>", open + 8);
  if (close === -1) return html;
  return html.slice(0, open) + html.slice(close + 7);
};
export const fmt = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
// Makina kalıp çapı nesnesini "50 x 80 x 115" metnine çevir (boş parçalar atlanır)
export const fmtKalipCapi = (kc) => {
  if (!kc || typeof kc !== "object") return "";
  // Sıra: Çap, Arka Ölçü, Boy — Yeni Müşteri formundaki alan sırasıyla aynı (kc.yukseklik = "Arka Ölçü")
  const parts = [kc.en, kc.yukseklik, kc.boy].map(x => (x == null ? "" : String(x).trim()));
  if (parts.every(p => !p)) return "";
  return parts.join(" x ");
};

// Eski (3'lü: Faturalı Yurt İçi/Faturalı İhracat/Faturasız, ya da çok eski Faturalı/Faturasız)
// değerleri yeni 4'lü sisteme çevir (geriye uyumluluk): Faturalı/Faturasız × Yurtiçi/Yurtdışı
export const normalizeSaleType = (v) => {
  if (SALE_TYPES.includes(v)) return v; // zaten yeni sistemde
  const t = (v || "").toLocaleLowerCase("tr");
  const faturasiz = t.includes("faturasız") || t.includes("faturasiz");
  const yurtdisi = t.includes("ihracat") || t.includes("ihrac") || t.includes("yurtdışı") || t.includes("yurtdisi") || t.includes("yurt dışı");
  const taban = faturasiz ? "Faturasız" : "Faturalı";
  return `${taban} ${yurtdisi ? "Yurtdışı" : "Yurtiçi"}`;
};
export const isFaturali = (saleType) => normalizeSaleType(saleType).startsWith("Faturalı");
export const isYurtIci = (saleType) => normalizeSaleType(saleType).endsWith("Yurtiçi");
// KDV tutarı: sadece Faturalı Yurtiçi satışlarda, fatura bedeli üzerinden hesaplanır
export const calcKDV = (saleType, faturaBedeli, rate = DEFAULT_KDV_RATE) => {
  if (!isFaturali(saleType) || !isYurtIci(saleType)) return 0;
  return (parseMoney(faturaBedeli) * (parseFloat(rate) || 0)) / 100;
};
// KDV DAHİL bir tutarın içindeki KDV'yi ayrıştır (servis ücretleri için).
// Örn. 10.000 TL %20 dahil → içindeki KDV = 10.000 − (10.000 / 1.20) = 1.666,67
export const extractKDV = (kdvDahilTutar, rate = DEFAULT_KDV_RATE) => {
  const tutar = parseMoney(kdvDahilTutar);
  const r = parseFloat(rate) || 0;
  if (tutar <= 0 || r <= 0) return 0;
  return tutar - (tutar / (1 + r / 100));
};
// Belirli para biriminde formatla: 15000, "USD" → "$15.000"
export const fmtCur = (n, cur = "TRY") => {
  const sym = CUR_SYM[cur] || "₺";
  const num = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n || 0);
  return cur === "TRY" ? `${sym}${num}` : `${sym}${num}`;
};
// Serbest metin para alanını sayıya çevir: "450.000 ₺" → 450000, "%5" → 0 (yüzde sayılmaz), "" → 0
export const parseMoney = (s) => {
  if (s == null) return 0;
  if (typeof s === "number") return s;
  let t = String(s).trim();
  if (!t || t === "—") return 0;
  if (t.includes("%")) return 0; // yüzde değerleri tutar sayılmaz
  // Sadece rakam, nokta, virgül bırak
  t = t.replace(/[^0-9.,]/g, "");
  if (!t) return 0;
  // Türkçe format: nokta binlik, virgül ondalık. Binlik noktaları kaldır, virgülü noktaya çevir.
  t = t.replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
};
// Kalıp sayısını güvenli al
export const kalipCount = (c) => {
  if (Array.isArray(c?.kaliplar) && c.kaliplar.length) return c.kaliplar.length;
  const n = parseInt(c?.kalipSayisi, 10);
  return isNaN(n) ? 0 : n;
};
// Sadece satış anında verilen kalıpları sayar (Extra Kalıp Satışı'ndan sonradan eklenen,
// partSaleId'li satırlar hariç) — Finans'taki "Toplam Satılan Kalıp" ile "Satılan Extra Kalıp"
// arasında çift sayımı önlemek için. kalipCount'tan farklı olarak burada extra'lar düşülüyor.
export const kalipCountAtSale = (c) => {
  if (Array.isArray(c?.kaliplar) && c.kaliplar.length) return c.kaliplar.filter(k => !k.partSaleId).length;
  const n = parseInt(c?.kalipSayisi, 10);
  return isNaN(n) ? 0 : n;
};
// Değişen parça adını güvenle al — eski kayıtlarda düz string, yenilerde {ad, fiyat}
export const parcaAdi = (p) => (typeof p === "string" ? p : (p?.ad || ""));

// ── Borç/ödeme kontrolleri — Dashboard/Customers/Finance arasında paylaşılır ──
// Servis Altuntaş Makina'nın kendisi tarafından mı yapıldı (işlemi yapan firma boşsa veya fabrika
// adıyla eşleşiyorsa evet). Anlaşmalı bir firma seçiliyse hayır — o zaman işçilik ücretini müşteri
// Altuntaş'a değil o firmaya öder, servis ücreti tamamen bilgi amaçlı bir kayıttır.
// "Altuntaş Makina" sabit string'i de ayrıca kontrol edilir: bu, fabrika adı Ayarlar'dan
// özelleştirilmeden (veya sonradan değiştirilmeden) ÖNCE kaydedilmiş eski servis kayıtlarında
// islemFirma'nın hâlâ taşıdığı varsayılan değer — fabrika adı sonradan değişince bu eski kayıtlar
// güncel factoryName'le eşleşmediği için yanlışlıkla "anlaşmalı firma" sayılmasın diye.
export const isAltuntasServisi = (sv, factoryName = "Altuntaş Makina") =>
  !sv.islemFirma || sv.islemFirma === factoryName || sv.islemFirma === "Altuntaş Makina";
// Servis ücretli mi (Garanti Dışı / Periyodik Bakım + ücret > 0 + Altuntaş'ın kendi servisi)
export const isServisUcretliMi = (sv, factoryName = "Altuntaş Makina") =>
  (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0 && isAltuntasServisi(sv, factoryName);
// Değişen parçalar Altuntaş'a gelir/borç olarak sayılır mı: garanti dışı işaretlenmiş veya garanti
// yoksa + ücret > 0 + parça gerçekten Altuntaş'tan alınmış (anlaşmalı serviste dışarıdan tedarik
// edilen parçalar için ücret yine girilebilir ama burada hiç sayılmaz — bkz. ServiceForm.jsx).
export const isParcaUcretliMi = (sv) => !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0 && sv.parcaAltuntastanMi !== false;
// Servis kaydından MÜŞTERİNİN borçlu olduğu kısım: işçilik (yalnızca Altuntaş'ın kendi servisiyse —
// isServisUcretliMi bunu zaten içeriyor) + parça (yalnızca Altuntaş'ın kendi servisiyse). Anlaşmalı
// bir firma yaptıysa parça borcu müşteriye değil o firmaya aittir (bkz. isParcaBorcluAnlasmaliFirmaya) —
// bu yüzden müşteri tarafında hiç görünmez, "ödenmedi" işaretli olsa da.
export const isServisBorcluMu = (sv, factoryName = "Altuntaş Makina") => {
  const parcaMusteriyeVar = isParcaUcretliMi(sv) && isAltuntasServisi(sv, factoryName);
  return (isServisUcretliMi(sv, factoryName) || parcaMusteriyeVar) && sv.odendi === false;
};
// Anlaşmalı bir servis firmasının üstlendiği parça borcu (Karar: Seçenek A — parça ücreti gerçek bir
// Altuntaş satışıdır ama borçlusu müşteri değil, işlemi yapan anlaşmalı firmadır)
export const isParcaBorcluAnlasmaliFirmaya = (sv, factoryName = "Altuntaş Makina") =>
  isParcaUcretliMi(sv) && !isAltuntasServisi(sv, factoryName) && sv.odendi === false;
// Extra Kalıp satışı borçlu mu
export const isPartSaleBorcluMu = (ps) => ps.odendi === false;
// Bir müşterinin herhangi bir kaynaktan (kalan borç / servis / parça / Extra Kalıp) borcu var mı
export const customerHasAnyDebt = (customer, services = [], partSales = [], factoryName = "Altuntaş Makina") => {
  if (parseMoney(customer.kalanBorc) > 0) return true;
  if (services.some(s => s.customerId === customer.id && isServisBorcluMu(s, factoryName))) return true;
  if (partSales.some(p => p.customerId === customer.id && isPartSaleBorcluMu(p))) return true;
  return false;
};
// Ciro (gizli ara değer — hiçbir formda ayrı bir alan olarak gösterilmez, sadece Kalan Borç'u türetmek için kullanılır)
export const calcCiro = (customer, kdvRate = DEFAULT_KDV_RATE) => {
  const kdv = calcKDV(customer.faturali, customer.faturaBedeli, kdvRate);
  return parseMoney(customer.fabrikaSatisBedeli) + kdv + parseMoney(customer.komisyon);
};
// Bir ödeme "alınmış" mı sayılır: Nakit/Kredi Kartı girildiği anda alınmış sayılır;
// Çek ise bankada karşılanana kadar (tahsilEdildi elle işaretlenene kadar) sayılmaz.
// yontem alanı olmayan eski kayıtlar Nakit gibi davranır (geriye dönük uyumluluk).
export const isPaymentReceived = (p) => p.yontem !== "Çek" || p.tahsilEdildi === true;
// Bir makinaya (customerId) yapılmış, alınmış sayılan ödemelerin toplamı
export const sumPayments = (customerId, payments = []) =>
  payments.filter(p => p.customerId === customerId && isPaymentReceived(p)).reduce((sum, p) => sum + parseMoney(p.tutar), 0);
// Bir müşterinin tahsil edilmemiş çeklerinin toplamı (Kalan Borç'a henüz dahil olmayan, beklemedeki tutar)
export const sumBekleyenCek = (customerId, payments = []) =>
  payments.filter(p => p.customerId === customerId && p.yontem === "Çek" && !p.tahsilEdildi).reduce((sum, p) => sum + parseMoney(p.tutar), 0);
// Tahsil edilmemiş bir çekin vade tarihi geçmiş mi
export const isCekVadesiGecmis = (p) => p.yontem === "Çek" && !p.tahsilEdildi && !!p.vadeTarihi && p.vadeTarihi < today();
// Kalan Borç = Ciro - (o makinaya yapılan, alınmış sayılan ödemelerin toplamı)
export const calcKalanBorc = (customer, payments = [], kdvRate = DEFAULT_KDV_RATE) =>
  calcCiro(customer, kdvRate) - sumPayments(customer.id, payments);
