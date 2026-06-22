import { CUR_SYM, DEFAULT_KDV_RATE, BACKUP_APP_TAG, SALE_TYPES } from "./constants";

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
// Eski yedekler (şema etiketi olmadan alınmış) için: en az bir tanıdık dizi alanı varsa kabul et
export const looksLikeBackup = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (data.app === BACKUP_APP_TAG) return true;
  return ["customers", "services", "dealers", "stock", "notes", "parts", "partSales"].some((k) => Array.isArray(data[k]));
};
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
  const parts = [kc.en, kc.boy, kc.yukseklik].map(x => (x == null ? "" : String(x).trim()));
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
// Değişen parça adını güvenle al — eski kayıtlarda düz string, yenilerde {ad, fiyat}
export const parcaAdi = (p) => (typeof p === "string" ? p : (p?.ad || ""));

// ── Borç/ödeme kontrolleri — Dashboard/Customers/Finance arasında paylaşılır ──
// Servis ücretli mi (Garanti Dışı / Periyodik Bakım + ücret > 0)
export const isServisUcretliMi = (sv) => (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
// Değişen parçalar ücretli mi (garanti dışı işaretlenmiş veya garanti yoksa + ücret > 0)
export const isParcaUcretliMi = (sv) => !sv.parcaUcretsizMi && parseMoney(sv.parcaUcreti) > 0;
// Servis kaydı borçlu mu: ücretli + açıkça ödenmedi (eski kayıtlarda odendi yoksa ödendi sayılır)
export const isServisBorcluMu = (sv) => (isServisUcretliMi(sv) || isParcaUcretliMi(sv)) && sv.odendi === false;
// Extra Kalıp satışı borçlu mu
export const isPartSaleBorcluMu = (ps) => ps.odendi === false;
// Bir müşterinin herhangi bir kaynaktan (kalan borç / servis / parça / Extra Kalıp) borcu var mı
export const customerHasAnyDebt = (customer, services = [], partSales = []) => {
  if (parseMoney(customer.kalanBorc) > 0) return true;
  if (services.some(s => s.customerId === customer.id && isServisBorcluMu(s))) return true;
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
