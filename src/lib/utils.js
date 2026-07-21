import { CUR_SYM, DEFAULT_KDV_RATE, DEFAULT_KDV_RATES, BACKUP_APP_TAG, SALE_TYPES, ALTUNMAK_MODELS, TRASH_RETENTION_DAYS, CALISMA_SAATLERI_VARSAYILAN } from "./constants";

export const today = () => new Date().toISOString().split("T")[0];
// gg/aa/yyyy formatı (yyyy-mm-dd → dd/mm/yyyy)
export const fmtTR = (iso) => {
  if (!iso) return "—";
  const p = String(iso).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
};
export const todayTR = () => fmtTR(today());

// ── Servis Panosu zaman takibi ──────────────────────────────────────────────
// Yerel tarih-saat damgası "YYYY-MM-DDTHH:mm:ss" (servis katı saatiyle aynı zaman tabanı).
// today() UTC gün döner; süre takibinde yerel kullanılır ki operatörün gördüğü saatle uyumlu olsun.
export const simdiYerel = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
// İki damga arası dakika (null-güvenli). Aynı zaman tabanında oldukları için fark doğru.
export const sureDk = (bas, bit) => {
  if (!bas || !bit) return null;
  const a = new Date(bas).getTime(), b = new Date(bit).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 60000));
};
// "HH:mm" (ya da "HH:mm:ss") → gün içi dakika. Bozuksa null.
const saatDk = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":");
  const H = Number(h), M = Number(m);
  if (!Number.isFinite(H) || !Number.isFinite(M)) return null;
  return H * 60 + M;
};
// Mesai (çalışma saati) dakikası: iki damga arasında YALNIZ çalışma pencerelerine (mola hariç)
// denk gelen dakika. Servis işçilik süresi için — gece/hafta sonu/mola sayılmaz. Null-güvenli,
// negatifi 0'a kırpar (sureDk sözleşmesi). Damgalar yerel duvar-saati string'i olduğundan
// new Date(str) yerel parse eder; gün sınırları tarih parçalarından (new Date(y,mon,d,h,m))
// kurulur → DST/gün kayması yok. cs: { baslangic, bitis, gunler:[getDay], molalar:[{baslangic,bitis}] }.
export const mesaiDk = (bas, bit, cs = CALISMA_SAATLERI_VARSAYILAN) => {
  if (!bas || !bit) return null;
  const a = new Date(bas), b = new Date(bit);
  const ta = a.getTime(), tb = b.getTime();
  if (isNaN(ta) || isNaN(tb)) return null;
  if (tb <= ta) return 0;
  const gunler = Array.isArray(cs?.gunler) ? cs.gunler : CALISMA_SAATLERI_VARSAYILAN.gunler;
  const molalar = Array.isArray(cs?.molalar) ? cs.molalar : [];
  const basDk = saatDk(cs?.baslangic) ?? saatDk(CALISMA_SAATLERI_VARSAYILAN.baslangic);
  const bitDk = saatDk(cs?.bitis) ?? saatDk(CALISMA_SAATLERI_VARSAYILAN.bitis);
  // Gün gün: bas'ın gününden bit'in gününe. Bir servis en fazla haftalar sürer; 1500 gün emniyet sınırı.
  const gun0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const sonGun = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  let toplamMs = 0;
  for (let i = 0; i < 1500; i++) {
    const g = new Date(gun0.getFullYear(), gun0.getMonth(), gun0.getDate() + i);
    if (g.getTime() > sonGun) break;
    if (!gunler.includes(g.getDay())) continue;
    const y = g.getFullYear(), mo = g.getMonth(), d = g.getDate();
    const pencereBas = new Date(y, mo, d, Math.floor(basDk / 60), basDk % 60).getTime();
    const pencereBit = new Date(y, mo, d, Math.floor(bitDk / 60), bitDk % 60).getTime();
    const os = Math.max(ta, pencereBas), oe = Math.min(tb, pencereBit);
    if (oe <= os) continue;
    let net = oe - os;
    for (const mola of molalar) {
      const mb = saatDk(mola?.baslangic), me = saatDk(mola?.bitis);
      if (mb == null || me == null || me <= mb) continue;
      const molaBas = new Date(y, mo, d, Math.floor(mb / 60), mb % 60).getTime();
      const molaBit = new Date(y, mo, d, Math.floor(me / 60), me % 60).getTime();
      const ms = Math.max(os, molaBas), mfin = Math.min(oe, molaBit);
      if (mfin > ms) net -= (mfin - ms);
    }
    if (net > 0) toplamMs += net;
  }
  return Math.max(0, Math.round(toplamMs / 60000));
};
// Dakikayı tam dökümle okunur süreye çevirir: "45 dk" / "2 saat 15 dk" / "2 gün 6 saat 3 dk".
// Sıfır olan üst birimler atlanır; dakika, başka birim yoksa 0 olsa bile gösterilir.
export const sureBicim = (dk) => {
  if (dk == null) return "—";
  const gun = Math.floor(dk / 1440);
  const saat = Math.floor((dk % 1440) / 60);
  const kdk = dk % 60;
  const parcalar = [];
  if (gun) parcalar.push(`${gun} gün`);
  if (saat) parcalar.push(`${saat} saat`);
  if (kdk || !parcalar.length) parcalar.push(`${kdk} dk`);
  return parcalar.join(" ");
};
// Tarih-saat damgasını "21/07 14:30" biçiminde gösterir (kart/analiz için).
export const fmtZaman = (ts) => {
  if (!ts) return "—";
  const [t, s] = String(ts).split("T");
  const p = (t || "").split("-");
  const hm = (s || "").slice(0, 5);
  return p.length === 3 ? `${p[2]}/${p[1]}${hm ? " " + hm : ""}` : ts;
};
// Yıllı sürüm: "21/07/2026 14:30" (kartta talep tarihiyle aynı biçim).
export const fmtZamanTam = (ts) => {
  if (!ts) return "—";
  const [t, s] = String(ts).split("T");
  const p = (t || "").split("-");
  const hm = (s || "").slice(0, 5);
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}${hm ? " " + hm : ""}` : ts;
};
// "YYYY-MM-DD" tarih string'ine ay ekler, sonucu da string olarak döner — new Date(iso)+setMonth()
// YERİNE saf sayı aritmetiği kullanılıyor (ay/yıl sınırında UTC yorumlama kaymasına karşı, bkz.
// Finance.jsx'teki ilgili yorum: tarihler hep string üzerinde karşılaştırılır, Date nesnesine hiç çevrilmez).
export const addMonthsToDateStr = (dateStr, months) => {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
// Türkçe büyük/küçük harf dönüşümü (İ→i, I→ı doğru çalışır)
export const trLower = (s) => (s || "").toLocaleLowerCase("tr");
// Arama için Türkçe karakter katlaması: küçült + aksanı ASCII'ye indir. Böylece kullanıcı
// Türkçe karakter yazsa da yazmasa da eşleşir ("sisli"↔"Şişli", "altuntas"↔"Altuntaş",
// "isik"↔"IŞIK"). trLower İ→i, I→ı yaptığı için sonra ı→i katlaması ikisini de kapsar.
// YALNIZCA arama eşleştirmesinde kullanılır; dedup/sıralama/benzersizlik kontrolleri trLower
// kullanmaya devam etmeli (aksi halde farklı isimler yanlışlıkla aynı sayılır).
export const aramaNormalize = (s) =>
  trLower(s).replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");
// Kalıp bilgisini okunur metne çevir (yeni dizi formatı + eski tek metin uyumlu)
/**
 * @param {import("../types").Customer | null | undefined} c
 * @returns {string}
 */
export const kalipText = (c) => {
  if (Array.isArray(c?.kaliplar) && c.kaliplar.length) {
    return c.kaliplar.map(k => [k.olcu, k.ad].filter(Boolean).join(" - ")).filter(Boolean).join(" · ");
  }
  return c?.kalip || "—";
};
let nextId = 100;
// Bu süreçte (bu PC'de, bu oturumda) üretilip henüz sunucuya/diske BAŞARIYLA yazılmamış
// ID'ler. Çakışma birleştirmesi "aynı ID, farklı içerik" gördüğünde bunun bizim yeni
// eklediğimiz bir kayıt mı (→ yeni ID verilip kurtarılır) yoksa mevcut bir kaydın
// düzenlenmesi mi (→ kapsam dışı, kilit sistemi koruyor) olduğunu buradan ayırt eder.
// Başarılı her kayıttan sonra temizlenir (o andan itibaren ID'ler artık sunucuda).
const mintedIds = new Set();

// Yeni kayıt ID'si: KRİPTO-RASTGELE büyük tamsayı ([1e15, 9e15) aralığında, 2^53 güvenli
// tamsayı sınırının altında). Eski sıralı sayaç (++nextId) yerine geldi çünkü çok kullanıcılı
// modda iki istemci çevrimdışıyken aynı sıralı ID'yi (örn. 101) farklı kayıtlara verip merge'de
// çakışabiliyordu. Rastgele ID'de çakışma olasılığı ihmal edilebilir (~n²/1.6e16) ve merge'in
// wasMintedHere yeniden-ID mekanizması hâlâ son güvenlik ağı olarak duruyor. Aralık, mevcut eski
// sayısal ID'lerin (çoğu < 1e6) çok üstünde seçildi, böylece eski kayıtlarla asla çakışmaz.
// ID hâlâ SAYI olduğu için tüm mevcut kod (Number/karşılaştırma/React key) aynen çalışır.
const ID_MIN = 1e15, ID_RANGE = 8e15;
const randInt53 = () => {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) {
    const b = new Uint32Array(2);
    c.getRandomValues(b);
    // üst 21 bit + alt 32 bit = 53-bit (güvenli tamsayı aralığı)
    return (b[0] % 0x200000) * 0x100000000 + b[1];
  }
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
};
export const uid = () => {
  let v;
  do { v = ID_MIN + (randInt53() % ID_RANGE); } while (mintedIds.has(v));
  mintedIds.add(v);
  return v;
};
// Müşteri (makina) kayıtlarının giriş sıra numarası. Yeni müşteri diziye BAŞA eklendiği için
// (Customers.jsx doAdd) dizi en-yeni-baştadır: ilk girilen makina dizinin sonunda → sıra 1,
// son girilen başta → sıra n. id → sıra haritası döner. Canlı: silinen kayıt renumber olur.
export const girisSiraMap = (customers = []) => {
  const n = customers.length, m = {};
  customers.forEach((c, i) => { if (c && c.id != null) m[c.id] = n - i; });
  return m;
};
export const wasMintedHere = (id) => mintedIds.has(id);
export const clearMintedIds = () => mintedIds.clear();
// nextId sayacı ve bumpId/getIdCounter/setIdCounter artık uid() tarafından KULLANILMIYOR
// (uid rastgele üretiyor). Geriye dönük uyumluluk için korunuyorlar: data blob'unda saklanan
// nextId alanı ve ~15 çağrı yeri kırılmasın diye. bumpId zararsız bir tarama yapar, sonucu
// (nextId) artık kimse okumaz. İleride kaldırılabilir.
export const getIdCounter = () => nextId;
export const setIdCounter = (n) => { if (n > nextId) nextId = n; };
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
/**
 * @param {string | null | undefined} v
 * @returns {import("../types").SaleType}
 */
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
// KDV oranı zaman içinde değiştiği için (bkz. DEFAULT_KDV_RATES) tek bir sayı yerine dönemli bir
// liste tutulur — bu fonksiyon verilen tarihte geçerli olan oranı bulur. Tarihler bu projenin var
// olan konvansiyonuyla (Finance.jsx) düz string karşılaştırmasıyla işlenir, Date'e çevrilmez.
export const getKdvRateForDate = (dateStr, kdvRates = DEFAULT_KDV_RATES) => {
  if (!Array.isArray(kdvRates) || kdvRates.length === 0) return DEFAULT_KDV_RATE;
  const sorted = [...kdvRates].sort((a, b) => (a.from || "").localeCompare(b.from || ""));
  const d = dateStr || "";
  let applicable = sorted[0];
  for (const period of sorted) {
    if ((period.from || "") <= d) applicable = period;
    else break;
  }
  return parseFloat(applicable.rate) || 0;
};
// Eski tekil appSettings.kdvRate (sayı) → yeni appSettings.kdvRates (dönem listesi) göçü.
// Zaten kdvRates doluysa onu kullanır; sadece eski kdvRate varsa tek dönem olarak senkronlar.
// ── Makinaya özgü ayarlar ────────────────────────────────────────────────────
// Bu alanlar O PC'nin diskine ve zamanlamasına aittir; taşınabilir değildir ve dışarıdan
// (yedek dosyası ya da sunucu blob'u) gelen değerleri asla uygulanmaz.
//
// GÜVENLİK: appSettings senkronize edilen bir blob bölümü. "settings" yazma izni olan kısıtlı bir
// kullanıcı {autoBackup:true, backupFolder:"\\\\10.0.0.5\\pub"} yazarsa, blob'u koşulsuz
// birleştiren HER istemci tüm CRM dökümünü (PII, finans, evrak) ve dosya arşivinin tamamını
// saldırganın seçtiği paylaşıma düz JSON olarak kopyalar. Yedek klasörü yalnız bu PC'de,
// kullanıcının klasör seçme diyaloğuyla belirlenir.
export const YEREL_AYAR_ALANLARI = ["autoBackup", "backupFolder", "frequency", "lastBackup"];
// Dışarıdan gelen appSettings'ten makinaya özgü alanları ayıklar; geri kalanı taşınabilir.
// Hem sunucu senkronizasyonu (App.jsx) hem yedekten geri yükleme (SettingsBackup.jsx) bunu kullanır.
export const disAppSettingsSuz = (uzak) => {
  const kopya = { ...(uzak || {}) };
  for (const alan of YEREL_AYAR_ALANLARI) delete kopya[alan];
  return kopya;
};

export const normalizeKdvRates = (appSettings) => {
  if (Array.isArray(appSettings?.kdvRates) && appSettings.kdvRates.length > 0) return appSettings.kdvRates;
  if (typeof appSettings?.kdvRate === "number") return [{ from: "2008-01-01", rate: appSettings.kdvRate }];
  return DEFAULT_KDV_RATES;
};
// KDV tutarı: sadece Faturalı Yurtiçi satışlarda, fatura bedeli üzerinden, satışın kendi tarihinde
// geçerli olan orana göre hesaplanır
export const calcKDV = (saleType, faturaBedeli, date, kdvRates = DEFAULT_KDV_RATES) => {
  if (!isFaturali(saleType) || !isYurtIci(saleType)) return 0;
  return (parseMoney(faturaBedeli) * getKdvRateForDate(date, kdvRates)) / 100;
};
// KDV DAHİL bir tutarın içindeki KDV'yi ayrıştır (servis ücretleri için), kaydın kendi tarihindeki orana göre.
// Örn. 10.000 TL %20 dahil → içindeki KDV = 10.000 − (10.000 / 1.20) = 1.666,67
export const extractKDV = (kdvDahilTutar, date, kdvRates = DEFAULT_KDV_RATES) => {
  const tutar = parseMoney(kdvDahilTutar);
  const r = getKdvRateForDate(date, kdvRates);
  if (tutar <= 0 || r <= 0) return 0;
  return tutar - (tutar / (1 + r / 100));
};
// Belirli para biriminde formatla: 15000, "USD" → "$15.000"
export const fmtCur = (n, cur = "TRY") => {
  const sym = CUR_SYM[cur] || "₺";
  const num = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n || 0);
  return `${sym}${num}`;
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
// Serbest metin kur alanından ("1 EUR = 38,50 TL") sayısal kuru çıkarır.
// "=" işaretinden sonraki ilk sayı esas alınır (baştaki "1 EUR"i yutmamak için);
// "=" yoksa metindeki ilk sayı. Türkçe ondalık (virgül) parseMoney ile çözülür.
// Geçerli pozitif kur bulunamazsa null döner.
export const parseKurRate = (text) => {
  if (text == null) return null;
  const s = String(text);
  const afterEq = s.match(/=\s*([0-9][0-9.,]*)/);
  const raw = afterEq ? afterEq[1] : (s.match(/[0-9][0-9.,]*/) || [null])[0];
  if (!raw) return null;
  const n = parseMoney(raw);
  return n > 0 ? n : null;
};
// Birim fiyatın kur ile TL karşılığını biçimlendirilmiş string olarak döner ("" = hesaplanamaz).
export const calcTL = (birimFiyat, rate) => {
  const num = parseMoney(birimFiyat);
  if (!num || !rate) return "";
  const tl = num * rate;
  const isWhole = tl % 1 === 0;
  return tl.toLocaleString("tr-TR", { minimumFractionDigits: isWhole ? 0 : 2, maximumFractionDigits: 2 });
};
// Kur alanı (serbest metin) değişince form'u günceller: kuru yazar, dövizli belgede
// (TRY dışı) sayısal kuru çözüp kurRate'i ve tüm satırların TL karşılığını yeniden hesaplar.
// Saf fonksiyon (React'e bağımsız), evrak kur inputları bunu ortak kullanır.
export const applyKurToForm = (form, kurText) => {
  if (!form) return form;
  const rate = parseKurRate(kurText);
  if (form.currency === "TRY" || !rate) return { ...form, kur: kurText };
  return {
    ...form, kur: kurText, kurRate: rate,
    satirlar: (form.satirlar || []).map(r => ({ ...r, subItems: (r.subItems || []).map(item => ({ ...item, tlKarsiligi: calcTL(item.birimFiyat, rate) })) })),
  };
};
// Bir IP, Tailscale'in kullandığı CGNAT aralığında mı (100.64.0.0/10, yani ikinci oktet 64-127)?
// Sunucu ekranında yerel ağ (fabrika içi) ile uzaktan erişim (Tailscale) adreslerini ayırmak için.
export const isTailscaleIp = (ip) => {
  const p = String(ip || "").split(".");
  if (p.length !== 4 || p[0] !== "100") return false;
  const o = Number(p[1]);
  return o >= 64 && o <= 127;
};
// Sunucu adresi (ör. "http://100.101.3.4:3000" veya protokolsüz "100.101.3.4:3000")
// Tailscale IP'sine mi işaret ediyor? Menüdeki "uzaktan bağlı" göstergesi için.
export const isTailscaleServerUrl = (url) => {
  const u = String(url || "");
  try { return isTailscaleIp(new URL(u.includes("://") ? u : "http://" + u).hostname); }
  catch { return false; }
};
// Menüdeki bağlantı konumu etiketi: LAN adresiyle bağlı VEYA (Tailscale adresiyle bağlı
// olsa bile) sunucuyla aynı yerel ağdaysak "lan"; yalnızca uzaktan Tailscale ise "tailscale".
export const serverKonumEtiketi = ({ viaTailscale, sameLan }) =>
  (!viaTailscale || sameLan) ? "lan" : "tailscale";
// Semver karşılaştırması: latest, current'tan KESİN olarak daha yeni mi (2.72.0 > 2.70.0).
// Güncelleme bildirimi yalnızca gerçekten daha yeni sürümde çıksın diye — ham string
// eşitsizliği ("2.9.0" !== "2.10.0") yanıltıcı olurdu. Eksik/bozuk alanlar 0 sayılır.
export const surumDahaYeni = (latest, current) => {
  const parcala = (v) => String(v || "").trim().replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
  const a = parcala(latest), b = parcala(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
};
// Üst güncelleme şeridi görünür mü: updater yoksa (dev/tarayıcı) hiç gösterme; indirme/indirildi
// sürerken her zaman göster; "available" ise yalnızca gerçekten daha yeni bir sürüm var VE o sürüm
// "Daha Sonra" ile kapatılmadıysa göster.
export const guncellemeSeridiGorunur = ({ hasUpdater, state, latest, current, dismissed }) => {
  if (!hasUpdater) return false;
  if (state === "downloading" || state === "downloaded") return true;
  if (state === "available") return !!latest && surumDahaYeni(latest, current) && dismissed !== latest;
  return false;
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

// Yedek parça tanımının (fiyatTRY/fiyatUSD/fiyatEUR) verilen para birimine ait fiyatını döner —
// servis formunda parça seçilince fiyatın otomatik doldurulması için kullanılır. Tanımsızsa "" döner,
// böylece kullanıcı elle girer; geçmiş kayıtlara dokunulmaz, sadece bundan sonraki seçimleri etkiler.
export const partFiyatForCurrency = (part, currency = "TRY") => {
  const v = { TRY: part?.fiyatTRY, USD: part?.fiyatUSD, EUR: part?.fiyatEUR }[currency];
  return (v === undefined || v === null || v === "") ? "" : v;
};

export const numberToWordsEN = (n, currency = "USD") => {
  const curWords = { USD: "US DOLLARS", EUR: "EUROS", TRY: "TURKISH LIRAS", GBP: "POUNDS STERLING" };
  const ones = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE",
                 "TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN",
                 "SEVENTEEN","EIGHTEEN","NINETEEN"];
  const tns = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];
  const toW = (num) => {
    if (!num) return "";
    if (num < 20) return ones[num];
    if (num < 100) return tns[Math.floor(num/10)] + (num%10 ? " " + ones[num%10] : "");
    if (num < 1000) return ones[Math.floor(num/100)] + " HUNDRED" + (num%100 ? " " + toW(num%100) : "");
    if (num < 1e6) return toW(Math.floor(num/1000)) + " THOUSAND" + (num%1000 ? " " + toW(num%1000) : "");
    if (num < 1e9) return toW(Math.floor(num/1e6)) + " MILLION" + (num%1e6 ? " " + toW(num%1e6) : "");
    return toW(Math.floor(num/1e9)) + " BILLION" + (num%1e9 ? " " + toW(num%1e9) : "");
  };
  const total = parseMoney(n) || 0;
  if (!total) return "ZERO " + (curWords[currency] || currency) + " ONLY";
  const whole = Math.floor(total);
  const cents = Math.round((total - whole) * 100);
  let result = toW(whole) + " " + (curWords[currency] || currency);
  if (cents > 0) result += " AND " + toW(cents) + " CENTS";
  return result + " ONLY";
};

export const resolveSatisYapan = (val, factory) => {
  if (!val) return val;
  if (val === "__fabrika__" || val === "Altuntaş Makina") return factory?.name || "Altuntaş Makina";
  return val;
};

// Serviste işlemi yapan firmanın GÖSTERİM adı. "Diğer" (anlaşmasız dış firma) seçilmişse gerçek ad
// ayrı alanda (islemFirmaAd) tutulur; sentinel "Diğer" yerine o adı göster. Aksi halde islemFirma.
export const disServisMi = (sv) => sv?.islemFirma === "Diğer";
export const islemFirmaGoster = (sv) => (disServisMi(sv) ? (sv?.islemFirmaAd || "Diğer (isimsiz firma)") : sv?.islemFirma);
// Extra kalıp satışında satışı yapan firmanın GÖSTERİM adı (aynı "Diğer" sentinel kuralı).
export const partSaleDisFirmaMi = (ps) => ps?.satisFirma === "Diğer";
export const satisFirmaGoster = (ps) => (partSaleDisFirmaMi(ps) ? (ps?.satisFirmaAd || "Diğer (isimsiz firma)") : ps?.satisFirma);

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
export const isParcaUcretliMi = (sv) => {
  if (sv.parcaUcretsizMi || parseMoney(sv.parcaUcreti) <= 0) return false;
  // Yeni format: parcaUcretiAltuntastan alanı varsa onu kullan (dış tedarik parçalar hariç)
  if (sv.parcaUcretiAltuntastan !== undefined) return parseMoney(sv.parcaUcretiAltuntastan) > 0;
  // Eski format: tek global flag
  return sv.parcaAltuntastanMi !== false;
};
// Bir serviste Altuntaş'a ait parça bedeli — dış tedarik parçaların fiyatı bilgi amaçlıdır,
// Altuntaş'ın gelir/borç hesaplarına yazılmaz.
export const altuntasParcaBedeli = (sv) => {
  if (sv.parcaUcretiAltuntastan !== undefined) return parseMoney(sv.parcaUcretiAltuntastan);
  const p = sv.degisenParcalar;
  if (Array.isArray(p) && p.some(i => typeof i === "object" && i.disTedarik))
    return p.filter(i => typeof i !== "string" && !i.disTedarik).reduce((s, i) => s + parseMoney(i.fiyat ?? i.ucret), 0);
  return parseMoney(sv.parcaUcreti);
};
// Serviste BİZDEN satılan yedek parçanın kanalı (Anasayfa "Son Servis Talepleri" rozeti için).
// Yalnız ücretli VE Altuntaş'tan parça varsa (isParcaUcretliMi) döner; yoksa null → rozet çıkmaz.
// Kanal servisi kimin yaptığına göre: bizim / anlaşmalı servis (bayi) / dış servis ("Diğer").
export const servisYedekParcaDurumu = (sv, factoryName = "Altuntaş Makina") => {
  if (!sv || !isParcaUcretliMi(sv)) return null;
  if (isAltuntasServisi(sv, factoryName)) return "bizim";
  if (disServisMi(sv)) return "disServis";
  return "anlasmaliServis";
};
// Servis kaydından MÜŞTERİNİN borçlu olduğu kısım: işçilik (yalnızca Altuntaş'ın kendi servisiyse —
// isServisUcretliMi bunu zaten içeriyor) + parça (yalnızca Altuntaş'ın kendi servisiyse). Anlaşmalı
// bir firma yaptıysa parça borcu müşteriye değil o firmaya aittir (bkz. isParcaBorcluAnlasmaliFirmaya) —
// bu yüzden müşteri tarafında hiç görünmez, "ödenmedi" işaretli olsa da.
/**
 * @param {import("../types").Service} sv
 * @param {string} [factoryName]
 * @returns {boolean}
 */
export const isServisBorcluMu = (sv, factoryName = "Altuntaş Makina") => {
  const parcaMusteriyeVar = isParcaUcretliMi(sv) && isAltuntasServisi(sv, factoryName);
  return (isServisUcretliMi(sv, factoryName) || parcaMusteriyeVar) && sv.odendi === false;
};
// Anlaşmalı bir servis firmasının üstlendiği parça borcu (Karar: Seçenek A — parça ücreti gerçek bir
// Altuntaş satışıdır ama borçlusu müşteri değil, işlemi yapan anlaşmalı firmadır)
export const isParcaBorcluAnlasmaliFirmaya = (sv, factoryName = "Altuntaş Makina") =>
  isParcaUcretliMi(sv) && !isAltuntasServisi(sv, factoryName) && sv.odendi === false;
// Extra Kalıp satışı borçlu mu
/** @param {import("../types").PartSale} ps @returns {boolean} */
export const isPartSaleBorcluMu = (ps) => ps.odendi === false;
// ── Mükerrer kayıt tespiti ───────────────────────────────────────────────────
// Telefonu karşılaştırma anahtarına indir: rakamları ayıkla, son 10 hane (0/ülke kodu farkları elenir)
const telAnahtar = (t) => { const d = String(t || "").replace(/\D/g, ""); return d.length >= 7 ? d.slice(-10) : ""; };
// Firma adını karşılaştırma anahtarına indir: tr küçük harf, noktalama ve yaygın şirket ekleri atılır
const FIRMA_EKLERI = new Set(["as", "aş", "ltd", "şti", "sti", "san", "tic", "sanayi", "ticaret", "limited", "şirketi", "sirketi", "ve"]);
export const firmaAnahtar = (ad) => trLower(ad).replace(/ı/g, "i").replace(/[.,\-_/()&'"]/g, " ").split(/\s+/).filter(w => w.length > 1 && !FIRMA_EKLERI.has(w)).join(" ").trim();
// Yeni kayıt eklerken benzer mevcut kayıtları bulur. Sinyaller güçlüden zayıfa:
// seri no aynı; telefon aynı (phone/yetkili1Tel/yetkili2Tel çapraz); normalize isim + aynı model
// (isim TEK başına uyarı üretmez — aynı firmanın ikinci makinası meşru; model alanı olmayan
// kayıtlarda, örn. bayilerde, isim eşleşmesi yeterlidir çünkü ikisinin de modeli boştur).
export const benzerKayitBul = (kayitlar = [], aday = {}) => {
  const sonuc = [];
  const adaySeri = trLower(String(aday.serialNo || "").trim());
  const adayTeller = [aday.phone, aday.yetkili1Tel, aday.yetkili2Tel].map(telAnahtar).filter(Boolean);
  const adayAd = firmaAnahtar(aday.name || "");
  const adayModel = trLower(String(aday.model || "").trim());
  for (const k of kayitlar) {
    if (k.deletedAt) continue;
    if (aday.id != null && k.id === aday.id) continue;
    if (adaySeri && trLower(String(k.serialNo || "").trim()) === adaySeri) { sonuc.push({ kayit: k, sebep: "seri no aynı" }); continue; }
    const kTeller = [k.phone, k.yetkili1Tel, k.yetkili2Tel].map(telAnahtar).filter(Boolean);
    if (adayTeller.length && kTeller.some(t => adayTeller.includes(t))) { sonuc.push({ kayit: k, sebep: "telefon aynı" }); continue; }
    if (adayAd && firmaAnahtar(k.name || "") === adayAd && trLower(String(k.model || "").trim()) === adayModel) {
      sonuc.push({ kayit: k, sebep: adayModel ? "aynı firma + aynı model" : "firma adı aynı" });
    }
  }
  return sonuc;
};

// Bir müşterinin herhangi bir kaynaktan (kalan borç / servis / parça / Extra Kalıp) borcu var mı
/**
 * @param {import("../types").Customer} customer
 * @param {import("../types").Service[]} [services]
 * @param {import("../types").PartSale[]} [partSales]
 * @param {string} [factoryName]
 * @returns {boolean}
 */
export const customerHasAnyDebt = (customer, services = [], partSales = [], factoryName = "Altuntaş Makina") => {
  if (parseMoney(customer.kalanBorc) > 0) return true;
  if (services.some(s => s.customerId === customer.id && isServisBorcluMu(s, factoryName))) return true;
  if (partSales.some(p => p.customerId === customer.id && isPartSaleBorcluMu(p))) return true;
  return false;
};
// Ciro (gizli ara değer — hiçbir formda ayrı bir alan olarak gösterilmez, sadece Kalan Borç'u türetmek için kullanılır)
export const calcCiro = (customer, kdvRates = DEFAULT_KDV_RATES) => {
  const kdv = calcKDV(customer.faturali, customer.faturaBedeli, customer.installDate, kdvRates);
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
// Ödeme planında vadesi geçmiş açık (tahsil edilmemiş) taksit var mı — satır rozeti ve
// Dashboard tahsilat takvimi için. Taksit bir ödeme kaydına bağlanınca (odemeId) kapanır.
export const taksitGecikmisMi = (c) => (c?.odemePlani || []).some(r => !r.odemeId && r.vadeTarihi && r.vadeTarihi < today());
// Kalan Borç = Ciro - (o makinaya yapılan, alınmış sayılan ödemelerin toplamı). En yakın tam liraya
// yuvarlanır (KDV yüzdesi tam sayı vermeyince ortaya çıkan kuruş artıkları "borçlu" sayılmasın) ve
// 0'ın altına düşürülmez — bu uygulamada "fazla ödeme/alacak" diye bir kavram takip edilmiyor.
export const calcKalanBorc = (customer, payments = [], kdvRates = DEFAULT_KDV_RATES) =>
  Math.max(0, Math.round(calcCiro(customer, kdvRates) - sumPayments(customer.id, payments)));

// Çöp Kutusu: deletedAt'i retention süresinden eski olan kayıtları kalıcı olarak süzer
// (uygulama açılışında bir defa çalışır) — 12 farklı dizi için aynı mantık birebir tekrarlandığı
// için ortak bir yardımcıda toplandı.
export const purgeOldTrash = (arr = [], days = TRASH_RETENTION_DAYS) => {
  const cutoff = Date.now() - days * 86400000;
  return arr.filter(x => !x.deletedAt || new Date(x.deletedAt).getTime() >= cutoff);
};

// Çöp Kutusu: tek bir kaydı (veya matchFn'e uyan kayıtları) deletedAt damgasıyla işaretler —
// kademeli silmelerde (örn. müşteri + servisleri + ödemeleri) aynı ts paylaşılarak çağrılır,
// böylece geri alma sırasında sadece o silme anına ait kayıtlar birlikte döner.
export const withDeleted = (arr, matchFn, ts = new Date().toISOString()) =>
  arr.map(x => (matchFn(x) ? { ...x, deletedAt: ts } : x));

// Yedek Parça Stok yardımcıları — Stock.jsx, Customers.jsx ve SimpleDealers.jsx tarafından paylaşılır
export const totalMiktar = (partStock, pid) =>
  partStock.filter(s => String(s.partId) === String(pid)).reduce((sum, s) => sum + s.miktar, 0);

export const mergeAndUpdate = (partStock, pid, newMiktar, extraFields = {}) => {
  const pidStr = String(pid);
  const matches = partStock.filter(s => String(s.partId) === pidStr);
  const others  = partStock.filter(s => String(s.partId) !== pidStr);
  if (matches.length > 0) {
    return [...others, { ...matches[0], partId: pidStr, miktar: newMiktar, sonGuncelleme: today(), ...extraFields }];
  }
  return [...partStock, { id: uid(), partId: pidStr, miktar: newMiktar, sonGuncelleme: today(), ...extraFields }];
};

export const withoutDeleted = arr => (arr || []).filter(x => !x.deletedAt);

// Dosya arşivi: servise bağlı bir dosya, servisin göründüğü HER iki yerde de listelenmeli —
// müşteri detayında (servis müşterinindir) ve anlaşmalı servis detayında (servisi o firma yaptı).
// Doğrudan sahiplik (customerId/dealerId) bir yönü, servis üyeliği (servisIdKumesi) diğer yönü
// kapsar. Böylece bayiden servise bağlanan dosya müşteride, müşteriden bağlanan bayide görünür.
export const dosyaBuKayitYerinde = (d, sahipAnahtar, sahipId, servisIdKumesi) =>
  !d?.deletedAt && (
    (sahipId != null && d[sahipAnahtar] === sahipId) ||
    (d?.refType === "servis" && d?.refId != null && !!servisIdKumesi?.has(d.refId))
  );

export const addYearsToDateStr = (dateStr, years) => {
  if (!dateStr) return "";
  return `${parseInt(dateStr.slice(0, 4)) + years}${dateStr.slice(4)}`;
};

export const getFactoryName = (factory) => factory?.name || "Altuntaş Makina";

// Tarayıcı-modu dosya indirme (Electron yazdırma API'si yokken yedek yol) — Blob + geçici <a>
export const downloadFile = (filename, content, mime = "text/html;charset=utf-8") => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// Onaylı teklif daha önce CRM'e aktarılmış mı? satisTamam bayrağına ek olarak,
// tekliften doğan kayıtların kendisi de kalıcı kanıt sayılır: makina kaydındaki
// fromTeklifId ve parça/kalıp satışlarındaki teklifId. Böylece bayrak herhangi
// bir senkronizasyon/yükleme yolunda kaybolsa bile teklif ikinci kez kullanılamaz.
export const teklifKullanildiMi = (t, customers = [], partSales = []) => {
  if (!t) return false;
  if (t.satisTamam) return true;
  if (customers.some(c => !c.deletedAt && c.fromTeklifId === t.id)) return true;
  if (partSales.some(ps => !ps.deletedAt && ps.teklifId === t.id)) return true;
  return false;
};

// Teklif türünü satır içeriğinden çıkarır — Documents.jsx ve Dashboard.jsx'te paylaşılır
export const effectiveTeklifTur = (t) => {
  if (t?.tur) return t.tur;
  const rows = t?.satirlar || [];
  if (rows.some(r => r.selectedModel)) return "makina";
  if (rows.some(r => r.selectedPart)) return "parca";
  if (rows.some(r => r.selectedKalip)) return "kalip";
  return "diger";
};

// Teklif/proforma "Alıcı Bilgileri" formunu mevcut bir müşteri kaydından doldurur.
// Documents.jsx müşteri arama sonucuna tıklayınca kullanılır. E-posta dahil edilmeli:
// eksikliği yüzünden seçilen müşterinin e-postası forma (ve sonra mail modalına) geçmiyordu.
/**
 * @param {import("../types").Customer} c
 * @returns {{customerId: import("../types").ID, firma: string, yetkili: string, tel: string, adres: string, email: string, country: string, city: string}}
 */
export const customerToAliciFields = (c) => ({
  customerId: c.id,
  firma: c.name || "",
  yetkili: c.yetkili1Ad || "",
  tel: c.yetkili1Tel || c.phone || "",
  adres: c.adres || "",
  email: c.email || "",
  country: c.country || "",
  city: c.city || "",
});

// ── Parça tipi seçimleri (makina konfigürasyonu) ──────────────────────────────
// Eski sabit konveyorSacId/bantSecimiId alanlarını genel tipSecimleri haritasına
// (anahtar = tip id) taşır. Kayıtta zaten tipSecimleri varsa dokunmaz. Yükleme
// sırasında bir kez çalışır; eski alanlar kayıtta kalır ama artık okunmaz.
export const migrateTipSecimleri = (c) => {
  if (!c || typeof c !== "object") return c;
  const mevcut = c.tipSecimleri;
  // Zaten dolu bir tipSecimleri varsa dokunma. BOŞ {} (ör. SQLite'tan yeni eklenen sütun)
  // eski alanların taşınmasını engellememeli — o yüzden anahtar sayısına bakılır.
  if (mevcut && typeof mevcut === "object" && Object.keys(mevcut).length > 0) return c;
  const secim = {};
  if (c.konveyorSacId) secim.konveyor = String(c.konveyorSacId);
  if (c.bantSecimiId)  secim.bant     = String(c.bantSecimiId);
  return Object.keys(secim).length ? { ...c, tipSecimleri: secim } : c;
};

// Makina tip seçimlerinin stok etkisini hesaplar. Yalnız stokDus=true tipler dikkate
// alınır; kit'ten gelen tipler (kitTipler) düşümden atlanır (stoka zaten girmemişler).
// Üç akışı da tek imzayla karşılar:
//   ekle:  onceki={},  yeni=secimler        → toDeduct = yeni (kit hariç)
//   düzenle: onceki=eski, yeni=yeni          → farkları düş/geri al
//   sil:   onceki=secimler, yeni={}          → toRestore = onceki
// Dönen partId'ler string'dir; aynı partId hem eski hem yenide ise dokunulmaz.
export const stokSecimDiff = ({ onceki = {}, yeni = {}, kitTipler = [], partTypeDefs = [] } = {}) => {
  const dusenTipler = new Set((partTypeDefs || []).filter(t => t.stokDus).map(t => t.id));
  const kit = new Set(kitTipler);
  const idlerinden = (secimler, sadeceKit = false) => {
    const out = [];
    for (const [tipId, partId] of Object.entries(secimler || {})) {
      if (!partId || !dusenTipler.has(tipId)) continue;
      if (sadeceKit && !kit.has(tipId)) continue;
      out.push(String(partId));
    }
    return out;
  };
  const oldIds = idlerinden(onceki);
  const newIds = idlerinden(yeni);
  const kitIds = idlerinden(yeni, true);
  const toRestore = oldIds.filter(id => !newIds.includes(id));
  const toDeduct  = newIds.filter(id => !oldIds.includes(id) && !kitIds.includes(id));
  return { toRestore, toDeduct };
};
