import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import LOGO from "./assets/logo.avif?inline";


// ── Altunmak Makina Modelleri (altunmak.com'dan alındı) ──────────────────
const ALTUNMAK_MODELS = [
  { model: "AK100_DS",   sogutma: "Soğutmasız", kapasite: "1000 kg/gün", kalip: "10 cm", kompresör: "Kompresörsüz" },
  { model: "AK100_DSC",  sogutma: "Soğutmalı",  kapasite: "1000 kg/gün", kalip: "10 cm", kompresör: "Kompresörsüz" },
  { model: "AK120_DS",   sogutma: "Soğutmasız", kapasite: "1000 kg/gün", kalip: "12 cm", kompresör: "Kompresörsüz" },
  { model: "AK120_DSC",  sogutma: "Soğutmalı",  kapasite: "1000 kg/gün", kalip: "12 cm", kompresör: "Kompresörsüz" },
  { model: "AK140_DSC",  sogutma: "Soğutmalı",  kapasite: "2000 kg/gün", kalip: "14 cm", kompresör: "Kompresörsüz" },
  { model: "SWP140_DSC", sogutma: "Soğutmalı",  kapasite: "2000 kg/gün", kalip: "14 cm", kompresör: "Kompresörsüz" },
];

// ── Ülke Listesi (statik) ─────────────────────────────────────────────────
const COUNTRIES = [
  "Türkiye",
  "ABD","Almanya","Arjantin","Arnavutluk","Avustralya","Avusturya","Azerbaycan",
  "BAE","Bahreyn","Belçika","Beyaz Rusya","Bosna Hersek","Brezilya","Bulgaristan",
  "Cezayir","Çek Cumhuriyeti","Çin","Danimarka","Endonezya","Estonya","Etiyopya",
  "Fas","Filipinler","Finlandiya","Fransa","Güney Afrika","Güney Kore","Gürcistan",
  "Hindistan","Hırvatistan","Hollanda","Irak","İngiltere","İran","İrlanda","İspanya",
  "İsrail","İsveç","İsviçre","İtalya","Japonya","Kanada","Karadağ","Katar","Kazakistan",
  "Kenya","Kırgızistan","Kolombiya","Kosova","Kuveyt","Kuzey Makedonya","Libya",
  "Litvanya","Lübnan","Macaristan","Malezya","Meksika","Mısır","Moldova","Nijerya",
  "Norveç","Özbekistan","Pakistan","Polonya","Portekiz","Romanya","Rusya",
  "Sırbistan","Singapur","Slovakya","Slovenya","Suudi Arabistan","Şili","Tacikistan",
  "Tayland","Tunus","Türkmenistan","Ukrayna","Umman","Ürdün","Vietnam","Yeni Zelanda","Yunanistan",
];


// Türkçe ülke adı → API'nin İngilizce adı (şehir sorgusu için)
const COUNTRY_EN = {
  "Türkiye":"Türkiye","ABD":"United States","Almanya":"Germany","Arjantin":"Argentina","Arnavutluk":"Albania",
  "Avustralya":"Australia","Avusturya":"Austria","Azerbaycan":"Azerbaijan","BAE":"United Arab Emirates",
  "Bahreyn":"Bahrain","Belçika":"Belgium","Beyaz Rusya":"Belarus","Bosna Hersek":"Bosnia and Herzegovina",
  "Brezilya":"Brazil","Bulgaristan":"Bulgaria","Cezayir":"Algeria","Çek Cumhuriyeti":"Czech Republic",
  "Çin":"China","Danimarka":"Denmark","Endonezya":"Indonesia","Estonya":"Estonia","Etiyopya":"Ethiopia",
  "Fas":"Morocco","Filipinler":"Philippines","Finlandiya":"Finland","Fransa":"France","Güney Afrika":"South Africa",
  "Güney Kore":"South Korea","Gürcistan":"Georgia","Hindistan":"India","Hırvatistan":"Croatia","Hollanda":"Netherlands",
  "Irak":"Iraq","İngiltere":"United Kingdom","İran":"Iran","İrlanda":"Ireland","İspanya":"Spain","İsrail":"Israel",
  "İsveç":"Sweden","İsviçre":"Switzerland","İtalya":"Italy","Japonya":"Japan","Kanada":"Canada","Karadağ":"Montenegro",
  "Katar":"Qatar","Kazakistan":"Kazakhstan","Kenya":"Kenya","Kırgızistan":"Kyrgyzstan","Kolombiya":"Colombia",
  "Kosova":"Kosovo","Kuveyt":"Kuwait","Kuzey Makedonya":"Macedonia","Libya":"Libya","Litvanya":"Lithuania",
  "Lübnan":"Lebanon","Macaristan":"Hungary","Malezya":"Malaysia","Meksika":"Mexico","Mısır":"Egypt",
  "Moldova":"Moldova","Nijerya":"Nigeria","Norveç":"Norway","Özbekistan":"Uzbekistan","Pakistan":"Pakistan",
  "Polonya":"Poland","Portekiz":"Portugal","Romanya":"Romania","Rusya":"Russia","Sırbistan":"Serbia",
  "Singapur":"Singapore","Slovakya":"Slovakia","Slovenya":"Slovenia","Suudi Arabistan":"Saudi Arabia","Şili":"Chile",
  "Tacikistan":"Tajikistan","Tayland":"Thailand","Tunus":"Tunisia","Türkmenistan":"Turkmenistan","Ukrayna":"Ukraine",
  "Umman":"Oman","Ürdün":"Jordan","Vietnam":"Vietnam","Yeni Zelanda":"New Zealand","Yunanistan":"Greece",
};
// API'de farklı yazılabilen ülkeler için alternatif isimler
const COUNTRY_ALT = {
  "Kuzey Makedonya":"North Macedonia",
  "ABD":"United States of America",
  "İngiltere":"United Kingdom of Great Britain and Northern Ireland",
  "Rusya":"Russian Federation",
  "Güney Kore":"Korea, Republic of",
  "İran":"Iran (Islamic Republic of)",
  "Moldova":"Moldova, Republic of",
  "Tanzanya":"Tanzania, United Republic of",
  "Vietnam":"Viet Nam",
};

// Türkiye illeri — API erişilemese bile şehir listesi her zaman dolu olsun
const CITIES_TR = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin",
  "Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur",
  "Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan",
  "Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul",
  "İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir",
  "Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas",
  "Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak",
];

// ── Seed Data ──────────────────────────────────────────────────────────────
const INIT_CUSTOMERS = [];


const INIT_DEALERS = [];

const INIT_KALIPLAR = [
  { id: 7001, ad: "Adana Köfte" },
  { id: 7002, ad: "Hamburger" },
  { id: 7003, ad: "Kasap Köfte" },
  { id: 7004, ad: "Kadınbudu Köfte" },
  { id: 7005, ad: "Izgara Köfte" },
  { id: 7006, ad: "Baklava Köfte" },
  { id: 7007, ad: "Kare Kaşarlı Köfte" },
];

const INIT_STOCK = [];

const INIT_SERVICES = [];

const today = () => new Date().toISOString().split("T")[0];
// gg/aa/yyyy formatı (yyyy-mm-dd → dd/mm/yyyy)
const fmtTR = (iso) => {
  if (!iso) return "—";
  const p = String(iso).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
};
const todayTR = () => fmtTR(today());
// Türkçe büyük/küçük harf dönüşümü (İ→i, I→ı doğru çalışır)
const trLower = (s) => (s || "").toLocaleLowerCase("tr");
// Kalıp bilgisini okunur metne çevir (yeni dizi formatı + eski tek metin uyumlu)
const kalipText = (c) => {
  if (Array.isArray(c?.kaliplar) && c.kaliplar.length) {
    return c.kaliplar.map(k => [k.olcu, k.ad].filter(Boolean).join(" - ")).filter(Boolean).join(" · ");
  }
  return c?.kalip || "—";
};
let nextId = 100;
const uid = () => ++nextId;
const getIdCounter = () => nextId;
const setIdCounter = (n) => { if (n > nextId) nextId = n; };
// Mevcut kayıtların max ID'sini görüp sayacı ileri çeker — çakışmayı önler
const bumpId = (...arrays) => {
  let max = nextId;
  arrays.forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(x => { if (x && typeof x.id === "number" && x.id > max) max = x.id; });
  });
  nextId = max;
};
// ── Yedek dosyası şeması ──────────────────────────────────────────────
const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_APP_TAG = "altunmak-crm";
// Eski yedekler (şema etiketi olmadan alınmış) için: en az bir tanıdık dizi alanı varsa kabul et
const looksLikeBackup = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  if (data.app === BACKUP_APP_TAG) return true;
  return ["customers", "services", "dealers", "stock", "notes", "parts", "partSales"].some((k) => Array.isArray(data[k]));
};
// Yazdırma HTML'inden otomatik print script'ini çıkarır (Electron çift diyalog önleme)
const stripAutoPrint = (html) => {
  const open = html.indexOf("<script>window.onload");
  if (open === -1) return html;
  const close = html.indexOf("script>", open + 8);
  if (close === -1) return html;
  return html.slice(0, open) + html.slice(close + 7);
};
const fmt = (n) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
// Para birimleri
const CURRENCIES = ["TRY", "USD", "EUR"];
const CUR_SYM = { TRY: "₺", USD: "$", EUR: "€" };
// Makina kalıp çapı nesnesini "50 x 80 x 115" metnine çevir (boş parçalar atlanır)
const fmtKalipCapi = (kc) => {
  if (!kc || typeof kc !== "object") return "";
  const parts = [kc.en, kc.boy, kc.yukseklik].map(x => (x == null ? "" : String(x).trim()));
  if (parts.every(p => !p)) return "";
  return parts.join(" x ");
};

// ── Satış Tipleri ──
const SALE_TYPES = ["Faturalı Yurt İçi", "Faturalı İhracat", "Faturasız"];
const DEFAULT_KDV_RATE = 20; // varsayılan KDV oranı (%), Ayarlar'dan değiştirilebilir
// Eski "Faturalı"/"Faturasız" değerlerini yeni sisteme çevir (geriye uyumluluk)
const normalizeSaleType = (v) => {
  const t = (v || "").toLocaleLowerCase("tr");
  if (t.includes("ihracat") || t.includes("ihrac")) return "Faturalı İhracat";
  if (t.includes("faturasız") || t.includes("faturasiz")) return "Faturasız";
  if (t.includes("yurt")) return "Faturalı Yurt İçi";
  if (t.includes("faturalı") || t.includes("faturali")) return "Faturalı Yurt İçi";
  return v || "Faturalı Yurt İçi";
};
const isFaturali = (saleType) => normalizeSaleType(saleType).startsWith("Faturalı");
const isYurtIci = (saleType) => normalizeSaleType(saleType) === "Faturalı Yurt İçi";
// KDV tutarı: sadece Faturalı Yurt İçi'de, fatura bedeli üzerinden hesaplanır
const calcKDV = (saleType, faturaBedeli, rate = DEFAULT_KDV_RATE) => {
  if (!isYurtIci(saleType)) return 0;
  return (parseMoney(faturaBedeli) * (parseFloat(rate) || 0)) / 100;
};
// KDV DAHİL bir tutarın içindeki KDV'yi ayrıştır (servis ücretleri için).
// Örn. 10.000 TL %20 dahil → içindeki KDV = 10.000 − (10.000 / 1.20) = 1.666,67
const extractKDV = (kdvDahilTutar, rate = DEFAULT_KDV_RATE) => {
  const tutar = parseMoney(kdvDahilTutar);
  const r = parseFloat(rate) || 0;
  if (tutar <= 0 || r <= 0) return 0;
  return tutar - (tutar / (1 + r / 100));
};
// Belirli para biriminde formatla: 15000, "USD" → "$15.000"
const fmtCur = (n, cur = "TRY") => {
  const sym = CUR_SYM[cur] || "₺";
  const num = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n || 0);
  return cur === "TRY" ? `${sym}${num}` : `${sym}${num}`;
};
// Serbest metin para alanını sayıya çevir: "450.000 ₺" → 450000, "%5" → 0 (yüzde sayılmaz), "" → 0
const parseMoney = (s) => {
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
const kalipCount = (c) => {
  if (Array.isArray(c?.kaliplar) && c.kaliplar.length) return c.kaliplar.length;
  const n = parseInt(c?.kalipSayisi, 10);
  return isNaN(n) ? 0 : n;
};

// ── Icons ──────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const paths = {
    dashboard: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3h2v-2h2v2h2v2h-2v2h-2v-2h-2z",
    customers:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
    machine:    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    service:    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3-3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3 3zM5 8l4 4-6 6 2 2 6-6 4 4 1-1-4.5-4.5",
    plus:       "M12 5v14M5 12h14",
    edit:       "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:      "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    close:      "M18 6L6 18M6 6l12 12",
    search:     "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    check:      "M20 6L9 17l-5-5",
    print:      "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
    store:      "M3 9l1-5h16l1 5M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16M9 21v-6h6v6",
    box:        "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
    finance:    "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    settings:   "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    download:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    upload:     "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    refresh:    "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    catalog:    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
    notes:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    parts:      "M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l6-6a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || ""} />
    </svg>
  );
};

// ── UI Primitives ──────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);
const Input = (props) => (
  <input {...props} style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
);
// Hiçbir alan zorunlu değil — bu sadece bilgilendirme amaçlı, kaydı engellemez
const Warn = ({ children }) => children ? (
  <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>⚠ {children}</div>
) : null;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\s-]{7,}$/;
const Select = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box" }}>
    {children}
  </select>
);
// Para girişi: değer SAYI olarak tutulur, ekranda binlik ayraçlı + ₺ gösterilir
const MoneyInput = ({ value, onChange, placeholder = "0", sym = "₺" }) => {
  const display = (value === "" || value == null || isNaN(value)) ? "" : new Intl.NumberFormat("tr-TR").format(value);
  const handle = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, ""); // sadece rakam
    onChange(raw === "" ? "" : parseInt(raw, 10));
  };
  return (
    <div style={{ position: "relative" }}>
      <input value={display} onChange={handle} placeholder={placeholder} inputMode="numeric"
        style={{ width: "100%", padding: "8px 28px 8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc", textAlign: "right", fontWeight: 600 }} />
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14, pointerEvents: "none" }}>{sym}</span>
    </div>
  );
};
const Btn = ({ children, onClick, variant = "primary", small, disabled }) => {
  const styles = {
    primary: { background: "#e85d1a", color: "#fff", border: "none" },
    danger:  { background: "#ef4444", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: "#64748b", border: "1px solid #e2e8f0" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], padding: small ? "5px 12px" : "9px 18px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 12 : 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? .5 : 1 }}>
      {children}
    </button>
  );
};

const StatCard = ({ label, value, sub, color, onClick }) => (
  <div onClick={onClick} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderLeft: `4px solid ${color}`, cursor: onClick ? "pointer" : "default", transition: "box-shadow .15s" }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.12)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.08)"; }}>
    <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
  </div>
);

const Modal = ({ title, onClose, children, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: wide ? 900 : 520, maxHeight: wide ? "94vh" : "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{title}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Icon name="close" /></button>
      </div>
      {children}
    </div>
  </div>
);

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Icon name="trash" size={22} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Emin misiniz?</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 22 }}>{message}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Btn variant="ghost" onClick={onCancel}>Vazgeç</Btn>
        <Btn variant="danger" onClick={onConfirm}><Icon name="trash" size={14} /> Evet, Sil</Btn>
      </div>
    </div>
  </div>
);


const Pagination = ({ total, page, setPage, perPage = 10 }) => {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", padding: "14px 0" }}>
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
        style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: "#64748b", fontSize: 13, opacity: page === 1 ? .5 : 1 }}>‹ Önceki</button>
      {Array.from({ length: pages }, (_, i) => i + 1)
        .filter(n => n === 1 || n === pages || Math.abs(n - page) <= 1)
        .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i-1] > 1) acc.push("…"); acc.push(n); return acc; }, [])
        .map((n, i) => n === "…"
          ? <span key={"e"+i} style={{ color: "#94a3b8", fontSize: 13 }}>…</span>
          : <button key={n} onClick={() => setPage(n)}
              style={{ minWidth: 32, padding: "5px 8px", borderRadius: 8, border: "1px solid", borderColor: page === n ? "#e85d1a" : "#e2e8f0", background: page === n ? "#e85d1a" : "#fff", color: page === n ? "#fff" : "#64748b", fontWeight: page === n ? 700 : 400, cursor: "pointer", fontSize: 13 }}>{n}</button>
        )}
      <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
        style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === pages ? "not-allowed" : "pointer", color: "#64748b", fontSize: 13, opacity: page === pages ? .5 : 1 }}>Sonraki ›</button>
    </div>
  );
};



// Ülke + Şehir alanları — API'den gelen şehir listesini kullanır, tüm formlarda ortak
const CountryCityFields = ({ country, city, onCountry, onCity, geoData, loadingGeo }) => {
  // API ülke adı farklı yazımlarda olabilir; sırayla dene
  const candidates = country ? [COUNTRY_EN[country], country, COUNTRY_ALT[country]].filter(Boolean) : [];
  let fromApi = [];
  if (geoData) {
    for (const cand of candidates) {
      if (geoData[cand] && geoData[cand].length) { fromApi = geoData[cand]; break; }
    }
  }
  // API gelmediyse Türkiye için statik 81 il devreye girer
  const cityList = fromApi.length > 0 ? fromApi : (country === "Türkiye" ? CITIES_TR : []);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label="Ülke">
        <Select value={country || ""} onChange={e => { onCountry(e.target.value); onCity(""); }}>
          <option value="">{loadingGeo ? "Yükleniyor..." : "Ülke seçin..."}</option>
          {COUNTRIES.map(c => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Şehir">
        {cityList.length > 0 ? (
          <Select value={city || ""} onChange={e => onCity(e.target.value)}>
            <option value="">Şehir seçin...</option>
            {cityList.map(c => <option key={c}>{c}</option>)}
          </Select>
        ) : (
          <Input value={city || ""} onChange={e => onCity(e.target.value)}
            placeholder={loadingGeo ? "Şehirler yükleniyor..." : "Şehir yazın"} />
        )}
      </Field>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════
const Dashboard = ({ customers, dealers, services, stock = [], onGoServices, onGoStock, onGoCustomers, onGoDealers, onGoExpired, onGoDebtors, onGoWarrantyActive, onGoSerialPending }) => {
  const expiredCount = customers.filter(c => c.warrantyEnd && c.warrantyEnd < today()).length;

  // ── Aksiyon gerektiren uyarılar ──
  const realCustomers = customers.filter(c => !c.isResale);
  const borcluCount = realCustomers.filter(c => parseMoney(c.kalanBorc) > 0).length;
  const seriNoBekleyenCount = realCustomers.filter(c => c.seriNoBekliyor && !c.serialNo).length;
  // Garantisi hâlâ devam eden (henüz bitmemiş) makineler
  const garantiDevamCount = realCustomers.filter(c => c.warrantyEnd && c.warrantyEnd >= today()).length;

  // ── Canlı saat & tarih ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tarih = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

  // ── Döviz kurları (ücretsiz API) ──
  const [rates, setRates] = useState(null); // { usd, eur }
  const [ratesErr, setRatesErr] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fetchRates = async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const j = await r.json();
        if (cancelled) return;
        if (j && j.rates && j.rates.TRY) {
          const usdTry = j.rates.TRY;
          const eurTry = j.rates.EUR ? (j.rates.TRY / j.rates.EUR) : null;
          setRates({ usd: usdTry, eur: eurTry });
          setRatesErr(false);
        } else { setRatesErr(true); }
      } catch { if (!cancelled) setRatesErr(true); }
    };
    fetchRates();
    const t = setInterval(fetchRates, 10 * 1000); // 10 saniyede bir güncelle
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div>
      {/* Aksiyon gerektiren uyarılar — her zaman 3 kart, eşit boyut */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <button onClick={onGoDebtors} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #dc2626", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#dc2626", lineHeight: 1, marginBottom: 6 }}>{borcluCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Borçlu firma</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
          <button onClick={onGoWarrantyActive} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #16a34a", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#16a34a", lineHeight: 1, marginBottom: 6 }}>{garantiDevamCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Garantisi devam eden</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
          <button onClick={onGoSerialPending} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: "none", borderLeft: "4px solid #0891b2", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#0891b2", lineHeight: 1, marginBottom: 6 }}>{seriNoBekleyenCount}</div>
              <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Seri no bekleyen</div>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: 22 }}>›</span>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Toplam Müşteri"    value={customers.length}  sub="Görmek için tıkla" color="#e85d1a" onClick={onGoCustomers} />
        <StatCard label="Toplam Bayi"       value={dealers.length}    sub="Görmek için tıkla" color="#3b82f6" onClick={onGoDealers} />
        <StatCard label="Stoktaki Makina"   value={stock.length}      sub="Görmek için tıkla" color="#8b5cf6" onClick={onGoStock} />
        <StatCard label="Servis Kayıtları"  value={services.length}   sub="Görmek için tıkla" color="#f59e0b" onClick={onGoServices} />
        <StatCard label="Garanti Süresi Dolan" value={expiredCount}    sub="Görmek için tıkla" color="#ef4444" onClick={onGoExpired} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
        {/* Son Satışlar */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>Son Satışlar</div>
          {[...customers]
            .filter(c => c.installDate)
            .sort((a, b) => (b.installDate || "").localeCompare(a.installDate || ""))
            .slice(0, 5)
            .map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{c.model || "—"}{c.serialNo ? ` · ${c.serialNo}` : ""}</div>
                </div>
                <div style={{ textAlign: "right", alignSelf: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e85d1a" }}>{fmtTR(c.installDate)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.country || ""}{c.city ? ` / ${c.city}` : ""}</div>
                </div>
              </div>
            ))}
          {customers.filter(c => c.installDate).length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>Henüz satış kaydı yok.</div>}
        </div>

        {/* Son Servisler */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>Son Servis Talepleri</div>
          {[...services]
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .slice(0, 5)
            .map(sv => {
            const cust = customers.find(x => x.id === sv.customerId);
            return (
              <div key={sv.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{cust?.name || "—"}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{cust?.model ? `${cust.model} · ` : ""}{sv.type}</div>
                </div>
                <div style={{ textAlign: "right", alignSelf: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e85d1a" }}>{fmtTR(sv.date)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{cust?.country || ""}{cust?.city ? ` / ${cust.city}` : ""}</div>
                </div>
              </div>
            );
          })}
          {services.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13 }}>Henüz servis kaydı yok.</div>}
        </div>
      </div>

      {/* Sol alt: döviz kurları · Sağ alt: saat & tarih */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28, flexWrap: "wrap", gap: 16 }}>
        {/* Döviz kurları */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: .5, textTransform: "uppercase", marginBottom: 12 }}>Döviz Kurları</div>
          {rates ? (
            <div style={{ display: "flex", gap: 28 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>💵 USD / TL</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{rates.usd.toFixed(2)} ₺</div>
              </div>
              {rates.eur && (
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>💶 EUR / TL</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb" }}>{rates.eur.toFixed(2)} ₺</div>
                </div>
              )}
            </div>
          ) : ratesErr ? (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Kurlar şu an alınamadı.</div>
          ) : (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Yükleniyor...</div>
          )}
        </div>

        {/* Saat & tarih */}
        <div style={{ background: "linear-gradient(135deg, #1f0d02, #3d1c06)", borderRadius: 12, padding: "16px 26px", boxShadow: "0 4px 16px rgba(0,0,0,.2)", textAlign: "right", minWidth: 200 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#ff9d5c", fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1.2 }}>{saat}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#d4a584", fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1.2, marginTop: 4 }}>{tarih}</div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// CUSTOMERS
// ════════════════════════════════════════════════════════════════
const Customers = ({
  customers, setCustomers, services = [], setServices = null, dealers = null, models = ALTUNMAK_MODELS,
  factory = null, geoData = null, loadingGeo = false, stock = null, setStock = null,
  title = "Müşteriler", addLabel = "Yeni Müşteri", entity = "Müşteri",
  searchPlaceholder = "Müşteri ara...", emptyLabel = "Müşteri bulunamadı.", delWord = "müşterisi",
  isCustomer = true, initialFilter = "all", kalipDefs = [], showToast = () => {}, kdvRate = DEFAULT_KDV_RATE,
}) => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const [listFilter, setListFilter] = useState(initialFilter || "all"); // all | warranty | warranty-active | debt | serial-pending
  useEffect(() => { setListFilter(initialFilter || "all"); }, [initialFilter]);
  const [groupByFirm, setGroupByFirm] = useState(false); // true → firmaya göre tek satır
  const [detailView, setDetailView] = useState(null); // tıklanan müşterinin tüm bilgileri
  const [firmView, setFirmView] = useState(null); // gruplu modda: firmanın tüm makinaları
  const isCustomerTab = isCustomer; // hibrit özellikler yalnızca müşteriler sekmesinde

  // Firma adına göre makina sayısı (aynı isimli kayıtlar = aynı firma)
  const firmCount = {};
  customers.forEach(c => { const k = trLower(c.name); firmCount[k] = (firmCount[k] || 0) + 1; });

  const q = trLower(search);
  const baseList = listFilter === "warranty"
    ? customers.filter(c => c.warrantyEnd && c.warrantyEnd < today())
    : listFilter === "warranty-active"
    ? customers.filter(c => c.warrantyEnd && c.warrantyEnd >= today())
    : listFilter === "debt"
    ? customers.filter(c => parseMoney(c.kalanBorc) > 0)
    : listFilter === "serial-pending"
    ? customers.filter(c => c.seriNoBekliyor && !c.serialNo)
    : customers;
  const searched = baseList.filter(c =>
    trLower(c.name).includes(q) ||
    trLower(c.city).includes(q) ||
    trLower(c.satisYapan).includes(q) ||
    trLower(c.contact).includes(q) ||
    trLower(c.country).includes(q) ||
    trLower(c.serialNo).includes(q)
  );
  // Gruplama açıksa her firmadan sadece ilk kayıt listede görünür (rozet adediyle)
  // O(n) — Set ile (büyük listelerde findIndex'in O(n^2) donmasını önler)
  const filtered = groupByFirm
    ? (() => {
        const seen = new Set();
        return searched.filter(c => {
          const k = trLower(c.name);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      })()
    : searched;
  // Sütun sıralaması
  const sorted = sortBy ? [...filtered].sort((a, b) => {
    let av, bv;
    if (sortBy === "name") { av = trLower(a.name); bv = trLower(b.name); }
    else if (sortBy === "model") { av = trLower(a.model); bv = trLower(b.model); }
    else if (sortBy === "warranty") { av = a.warrantyEnd || ""; bv = b.warrantyEnd || ""; }
    else if (sortBy === "date") { av = a.installDate || ""; bv = b.installDate || ""; }
    else return 0;
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }) : filtered;
  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  };
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const [modelPicker, setModelPicker] = useState(false);
  const openAdd  = () => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`; // otomatik +2 yıl
    setForm({
      kalipSayisi: 1, satisYapan: "Altuntaş Makina", name: "", phone: "", email: "",
      yetkili1Ad: "", yetkili1Tel: "", yetkili2Ad: "", yetkili2Tel: "",
      adres: "", city: "", country: "Türkiye", model: "",
      kaliplar: [{ olcu: "", ad: "" }],
      installDate: start, warrantyEnd: end,
      faturali: "Faturalı Yurt İçi", faturaBedeli: "",
      fabrikaSatisBedeli: "", komisyon: "", extraKalipFiyati: "",
      serialNo: "",
    });
    setModal("add"); setModelPicker(false);
  };
  // Aynı firmaya yeni makina ekle: firma/iletişim bilgileri otomatik dolu gelir
  const openAddForFirm = (base) => {
    const start = today();
    const end = `${parseInt(start.slice(0,4)) + 2}${start.slice(4)}`;
    setForm({
      kalipSayisi: 1, satisYapan: base.satisYapan || (factory?.name || "Altuntaş Makina"),
      name: base.name || "", phone: base.phone || "", email: base.email || "",
      yetkili1Ad: base.yetkili1Ad || "", yetkili1Tel: base.yetkili1Tel || "",
      yetkili2Ad: base.yetkili2Ad || "", yetkili2Tel: base.yetkili2Tel || "",
      adres: base.adres || "", city: base.city || "", country: base.country || "Türkiye",
      model: "", kaliplar: [{ olcu: "", ad: "" }],
      installDate: start, warrantyEnd: end,
      faturali: "Faturalı Yurt İçi", faturaBedeli: "",
      fabrikaSatisBedeli: "", komisyon: "", extraKalipFiyati: "", kalanBorc: "", serialNo: "", aciklama: "",
    });
    setModal("add"); setModelPicker(false);
  };
  const openEdit = c => {
    // Eski kayıtlarla uyumluluk: kalip (tek metin) → kaliplar dizisine dönüştür
    const kaliplar = Array.isArray(c.kaliplar) && c.kaliplar.length
      ? c.kaliplar
      : (c.kalip ? [{ olcu: "", ad: c.kalip }] : [{ olcu: "", ad: "" }]);
    setForm({ ...c, kaliplar, kalipSayisi: c.kalipSayisi ?? kaliplar.length });
    setModal({ edit: c }); setModelPicker(false);
  };
  const save = () => {
    if (modal === "add") {
      const { _manualSerial, _stokSerisiz, ...clean } = form;
      bumpId(customers, services);
      const newId = uid();
      // Seri no boşsa "bekliyor" işaretle (stoktan seri no'suz seçilse de, hiç girilmese de)
      if (!clean.serialNo) clean.seriNoBekliyor = true;
      setCustomers(p => p.some(c => c.id === newId) ? p : [{ ...clean, id: newId }, ...p]);
      // Stoktan düşme:
      if (setStock) {
        if (_stokSerisiz) {
          // Seri no'suz: o modelden ilk seri no'suz adedi düş (bir tane)
          setStock(p => {
            const idx = p.findIndex(s => s.model === clean.model && !s.serialNo);
            if (idx === -1) return p;
            return p.filter((_, i) => i !== idx);
          });
        } else if (clean.serialNo && !_manualSerial) {
          // Seri no'lu stoktan: eşleşen seri no'yu düş
          setStock(p => p.filter(s => !(s.model === clean.model && s.serialNo === clean.serialNo)));
        }
      }
      showToast(!clean.serialNo ? "Müşteri kaydedildi (seri no sonra atanacak)." : "Müşteri kaydedildi.");
    } else {
      const { _manualSerial, _stokSerisiz, ...clean } = form;
      // Düzenlemede seri no girildiyse "bekliyor" işaretini kaldır
      if (clean.serialNo && clean.seriNoBekliyor) clean.seriNoBekliyor = false;
      setCustomers(p => p.map(c => c.id === clean.id ? clean : c));
      showToast("Müşteri bilgileri düzenlendi.");
    }
    setModal(null);
  };
  const [confirmId, setConfirmId] = useState(null);
  const del = id => setConfirmId(id);
  const confirmDel = () => {
    const c = customers.find(x => x.id === confirmId);
    setCustomers(p => p.filter(x => x.id !== confirmId));
    // Silinen müşterinin servis kayıtları da silinsin
    if (setServices) setServices(p => p.filter(s => s.customerId !== confirmId));
    // Silinen müşterinin makinası stoğa geri dönsün (model + seri no varsa ve stokta yoksa)
    if (c && setStock && c.model && c.serialNo) {
      setStock(p => {
        const zatenVar = p.some(s => s.model === c.model && s.serialNo === c.serialNo);
        if (zatenVar) return p;
        bumpId(p);
        return [{ id: uid(), model: c.model, serialNo: c.serialNo, addedDate: today(), note: "Silinen müşteriden geri döndü" }, ...p];
      });
    }
    setConfirmId(null);
    showToast("Müşteri silindi.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> {addLabel}</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { v: "all", l: "Hepsi", count: customers.length },
          { v: "warranty-active", l: "🟢 Garantisi Devam Eden", count: customers.filter(c => c.warrantyEnd && c.warrantyEnd >= today()).length },
          { v: "warranty", l: "⚠ Garantisi Bitenler", count: customers.filter(c => c.warrantyEnd && c.warrantyEnd < today()).length },
          ...(isCustomerTab ? [{ v: "debt", l: "₺ Borçlu Firmalar", count: customers.filter(c => parseMoney(c.kalanBorc) > 0).length }] : []),
          ...(isCustomerTab ? [{ v: "serial-pending", l: "⏳ Seri No Bekleyen", count: customers.filter(c => c.seriNoBekliyor && !c.serialNo).length }] : []),
        ].map(f => (
          <button key={f.v} onClick={() => { setListFilter(f.v); setPage(1); }}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1px solid", borderColor: listFilter === f.v ? "#e85d1a" : "#e2e8f0",
              background: listFilter === f.v ? "#e85d1a" : "#fff",
              color: listFilter === f.v ? "#fff" : "#64748b",
            }}>
            {f.l} ({f.count})
          </button>
        ))}
        {isCustomerTab && (
          <button onClick={() => { setGroupByFirm(g => !g); setPage(1); }}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", marginLeft: "auto",
              border: "1px solid", borderColor: groupByFirm ? "#3b82f6" : "#e2e8f0",
              background: groupByFirm ? "#3b82f6" : "#fff",
              color: groupByFirm ? "#fff" : "#64748b",
            }}>
            {groupByFirm ? "✓ Firmaya Göre Gruplu" : "Firmaya Göre Grupla"}
          </button>
        )}
      </div>
      {groupByFirm && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#1e40af" }}>
          Firmaya göre gruplu görünüm: <b>{filtered.length} firma</b> ({customers.length} makina kaydı). Birden fazla makinası olan firmaya tıklayınca tüm makinaları listelenir.
        </div>
      )}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={searchPlaceholder}
          style={{ paddingLeft: 36, padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc" }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                { h: "Satın Alan", key: "name" },
                { h: "Satış Yapan", key: null },
                { h: "Ülke / Şehir", key: null },
                { h: "Model", key: "model" },
                { h: "Seri No", key: null },
                { h: "Garanti Bitiş", key: "warranty" },
                { h: "Fatura", key: null },
                { h: "", key: null },
              ].map(({ h, key }) => (
                <th key={h || "actions"} onClick={key ? () => toggleSort(key) : undefined}
                  style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: sortBy === key ? "#e85d1a" : "#475569", borderBottom: "1px solid #e2e8f0", cursor: key ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                  {h}{key && sortBy === key && <span style={{ fontSize: 10, marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(c => {
              const warrantyOk = c.warrantyEnd && c.warrantyEnd >= today();
              const warrantySoon = warrantyOk && c.warrantyEnd <= new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
              const warrantyColor = !c.warrantyEnd ? "#cbd5e1" : !warrantyOk ? "#dc2626" : warrantySoon ? "#f59e0b" : "#16a34a";
              const hasDebt = isCustomerTab && parseMoney(c.kalanBorc) > 0;
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", background: hasDebt ? "#fefce8" : undefined }}
                  title={hasDebt ? `Kalan borç: ${fmt(parseMoney(c.kalanBorc))}` : undefined}>
                  <td style={{ padding: "13px 16px", cursor: "pointer" }}
                    onClick={() => {
                      if (groupByFirm && firmCount[trLower(c.name)] > 1) {
                        setFirmView(customers.filter(x => trLower(x.name) === trLower(c.name)));
                      } else {
                        setDetailView(c);
                      }
                    }}
                    title={groupByFirm && firmCount[trLower(c.name)] > 1 ? "Firmanın tüm makinalarını gör" : "Tüm bilgileri görüntüle"}>
                    {c.prevOwners?.length > 0 ? (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#dc2626", textDecoration: "line-through", opacity: .85 }}>{c.prevOwners[0].name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#059669", textDecoration: "underline", textDecorationColor: "#a7f3d0" }}>{c.name}</span>
                          {isCustomerTab && firmCount[trLower(c.name)] > 1 && (
                            <span style={{ fontSize: 10, fontWeight: 800, background: "#dbeafe", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px" }}>{firmCount[trLower(c.name)]} makina</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{c.name}</span>
                        {isCustomerTab && firmCount[trLower(c.name)] > 1 && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: "#dbeafe", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px" }}>{firmCount[trLower(c.name)]} makina</span>
                        )}
                      </div>
                    )}
                    {c.adres && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{c.adres}</div>}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{c.satisYapan || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13 }}>{c.country && c.city ? `${c.country} / ${c.city}` : c.city || c.country || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>{c.model ? <span style={{ fontSize: 12, background: "#fff7ed", color: "#c2410c", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{c.model}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569", fontFamily: "monospace" }}>
                    {c.serialNo
                      ? c.serialNo
                      : c.seriNoBekliyor
                        ? <span style={{ fontFamily: "inherit", fontSize: 10, fontWeight: 800, background: "#fef3c7", color: "#b45309", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>⏳ seri no bekliyor</span>
                        : "—"}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {c.warrantyEnd
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: warrantyOk ? (warrantySoon ? "#d97706" : "#059669") : "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: warrantyColor, flexShrink: 0 }}></span>
                          {fmtTR(c.warrantyEnd)}
                        </span>
                      : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {c.faturali ? (() => {
                      const tip = normalizeSaleType(c.faturali);
                      const stil = tip === "Faturalı Yurt İçi" ? { bg: "#d1fae5", fg: "#065f46" }
                        : tip === "Faturalı İhracat" ? { bg: "#dbeafe", fg: "#1d4ed8" }
                        : { bg: "#fef3c7", fg: "#92400e" };
                      const kisaAd = tip === "Faturalı Yurt İçi" ? "Yurt İçi" : tip === "Faturalı İhracat" ? "İhracat" : "Faturasız";
                      return (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: stil.bg, color: stil.fg }}>
                          {kisaAd}{c.faturaBedeli ? ` · ${fmtCur(c.faturaBedeli, c.currency)}` : ""}
                        </span>
                      );
                    })() : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => openEdit(c)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => del(c.id)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{emptyLabel}</div>}
        <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {/* Firma — tüm makinalar (gruplu mod) */}
      {firmView && firmView.length > 0 && (
        <Modal wide title={`${firmView[0].name} — ${firmView.length} Makina`} onClose={() => setFirmView(null)}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            Bu firmaya ait tüm makinalar. Detayını görmek için bir makinaya tıklayın.
          </div>
          {firmView.map((m, i) => {
            const wOk = m.warrantyEnd && m.warrantyEnd >= today();
            return (
              <div key={m.id}
                onClick={() => { setFirmView(null); setDetailView(m); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 10, cursor: "pointer", background: "#fff" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{i + 1}. {m.model || "Model yok"}</span>
                    {m.prevOwners?.length > 0 && <span style={{ fontSize: 9, fontWeight: 800, background: "#10b981", color: "#fff", borderRadius: 5, padding: "2px 7px" }}>2. EL</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, fontFamily: "monospace" }}>S/N: {m.serialNo || "—"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Satış: {m.satisYapan || "—"}{m.installDate ? ` · ${fmtTR(m.installDate)}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {m.warrantyEnd && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: wOk ? "#059669" : "#dc2626" }}>
                      {wOk ? "Garanti sürüyor" : "Garanti bitti"}<br />
                      <span style={{ fontWeight: 600 }}>{fmtTR(m.warrantyEnd)}</span>
                    </div>
                  )}
                  {m.faturali && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{m.faturali}{m.faturaBedeli ? ` · ${fmtCur(m.faturaBedeli, m.currency)}` : ""}</div>}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setFirmView(null)}>Kapat</Btn>
            <Btn onClick={() => { const base = firmView[0]; setFirmView(null); openAddForFirm(base); }}>
              <Icon name="plus" size={14} /> Bu Firmaya Makina Ekle
            </Btn>
          </div>
        </Modal>
      )}

      {/* Detay görüntüleme */}
      {detailView && (
        <Modal wide title={detailView.name} onClose={() => setDetailView(null)}>
          {detailView.prevOwners?.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
              <b style={{ color: "#dc2626" }}>2. El Makina</b> — İlk sahip: <span style={{ color: "#dc2626" }}>{detailView.prevOwners[0].name}</span>
              {detailView.prevOwners[0].soldDate ? ` (devir: ${fmtTR(detailView.prevOwners[0].soldDate)})` : ""}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              ["Satış Yapan", detailView.satisYapan],
              ["Telefon", detailView.phone],
              ["E-posta", detailView.email],
              ["Adres", detailView.adres],
              ["Şehir / Ülke", [detailView.city, detailView.country].filter(Boolean).join(" / ")],
              ["Model", detailView.model],
              ["Makina Kalıp Çapı", fmtKalipCapi(detailView.kalipCapi)],
              ["Seri Numarası", detailView.serialNo],
              ["Garanti Başlangıç", detailView.installDate ? fmtTR(detailView.installDate) : ""],
              ["Garanti Bitiş", detailView.warrantyEnd ? fmtTR(detailView.warrantyEnd) : ""],
              ["Fatura Durumu", detailView.faturali ? `${detailView.faturali}${detailView.faturali === "Faturasız" ? " (KDV HARİÇ)" : ""}` : ""],
              ["Para Birimi", detailView.currency && detailView.currency !== "TRY" ? ({USD:"Dolar ($)",EUR:"Euro (€)"}[detailView.currency]) : ""],
              ["Fatura Bedeli", detailView.faturaBedeli ? fmtCur(detailView.faturaBedeli, detailView.currency) : ""],
              ["Fabrika Satış Bedeli", detailView.fabrikaSatisBedeli ? fmtCur(detailView.fabrikaSatisBedeli, detailView.currency) : ""],
              ["Komisyon", detailView.komisyon ? fmtCur(detailView.komisyon, detailView.currency) : ""],
              ["Extra Kalıp Fiyatı", detailView.extraKalipFiyati ? fmtCur(detailView.extraKalipFiyati, detailView.currency) : ""],
              ["Kalan Borç", detailView.kalanBorc ? fmtCur(detailView.kalanBorc, detailView.currency) : ""],
              ["Açıklama", detailView.aciklama],
            ].filter(([, v]) => v && v !== "—").map(([k, v]) => (
              <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: .5, marginBottom: 3, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v}</div>
              </div>
            ))}
          </div>
          {Array.isArray(detailView.kaliplar) && detailView.kaliplar.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>KALIPLAR ({detailView.kaliplar.length})</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {detailView.kaliplar.map((k, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 8, padding: "6px 12px" }}>
                    {[k.olcu, k.ad].filter(Boolean).join(" — ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bu firmanın diğer makinaları */}
          {isCustomerTab && (() => {
            const firmMachines = customers.filter(c => trLower(c.name) === trLower(detailView.name));
            if (firmMachines.length <= 1) return null;
            return (
              <div style={{ marginBottom: 16, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>
                  BU FİRMANIN MAKİNALARI ({firmMachines.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {firmMachines.map(m => {
                    const ok = m.warrantyEnd && m.warrantyEnd >= today();
                    const isCurrent = m.id === detailView.id;
                    return (
                      <div key={m.id}
                        onClick={() => setDetailView(m)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                          border: "1px solid", borderColor: isCurrent ? "#e85d1a" : "#e2e8f0", background: isCurrent ? "#fff7ed" : "#fff" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                            {m.model || "Model yok"} {isCurrent && <span style={{ fontSize: 10, color: "#e85d1a", fontWeight: 800 }}>· GÖRÜNTÜLENEN</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{m.serialNo || "Seri no yok"}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ok ? "#059669" : "#dc2626" }}>
                          {m.warrantyEnd ? `${fmtTR(m.warrantyEnd)} ${ok ? "✓" : "⚠"}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setDetailView(null)}>Kapat</Btn>
            {isCustomerTab && (
              <Btn variant="ghost" onClick={() => { const c = detailView; setDetailView(null); openAddForFirm(c); }}>
                <Icon name="plus" size={14} /> Bu Firmaya Makina Ekle
              </Btn>
            )}
            <Btn onClick={() => { const c = detailView; setDetailView(null); openEdit(c); }}><Icon name="edit" size={14} /> Düzenle</Btn>
          </div>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`"${customers.find(c => c.id === confirmId)?.name || ""}" ${delWord} ve bilgileri kalıcı olarak silinecek.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal wide title={modal === "add" ? addLabel : `${entity} Düzenle`} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Kalıp Sayısı (otomatik)">
              <div style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                <b style={{ color: "#0f172a", fontSize: 16 }}>{(form.kaliplar || []).length}</b>
                <span style={{ fontSize: 12 }}>kalıp · aşağıdaki listeden eklenir/silinir</span>
              </div>
            </Field>
            <Field label="Satış Yapan">
              <Select value={form.satisYapan || "Altuntaş Makina"} onChange={e => setForm(p => ({ ...p, satisYapan: e.target.value }))}>
                <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
                {(dealers || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Satın Alan">
            <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Satın alan firma / kişi" />
            <Warn>{!form.name?.trim() ? "Satın alan adı girilmedi" : ""}</Warn>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 1 - Ad Soyad"><Input value={form.yetkili1Ad || ""} onChange={e => setForm(p => ({ ...p, yetkili1Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 1 - Telefon">
              <Input value={form.yetkili1Tel || ""} onChange={e => setForm(p => ({ ...p, yetkili1Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{form.yetkili1Tel && !PHONE_RE.test(form.yetkili1Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Yetkili 2 - Ad Soyad"><Input value={form.yetkili2Ad || ""} onChange={e => setForm(p => ({ ...p, yetkili2Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Yetkili 2 - Telefon">
              <Input value={form.yetkili2Tel || ""} onChange={e => setForm(p => ({ ...p, yetkili2Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{form.yetkili2Tel && !PHONE_RE.test(form.yetkili2Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Telefon">
              <Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0xxx xxx xx xx" />
              <Warn>{form.phone && !PHONE_RE.test(form.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
            <Field label="E-posta">
              <Input value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
              <Warn>{form.email && !EMAIL_RE.test(form.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
            </Field>
          </div>

          <Field label="Adres Satırı"><Input value={form.adres || ""} onChange={e => setForm(p => ({ ...p, adres: e.target.value }))} placeholder="Mahalle, cadde, no..." /></Field>
          <CountryCityFields country={form.country} city={form.city}
            onCountry={v => setForm(p => ({ ...p, country: v }))}
            onCity={v => setForm(p => ({ ...p, city: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />

          <Field label="Model">
            <div
              onClick={() => setModelPicker(p => !p)}
              style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
            >
              <span style={{ color: form.model ? "#0f172a" : "#94a3b8" }}>{form.model || "Model seçin..."}</span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{modelPicker ? "▲" : "▼"}</span>
            </div>
            {modelPicker && (
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {models.map(m => (
                  <div
                    key={m.model}
                    onClick={() => { setForm(p => ({ ...p, model: m.model })); setModelPicker(false); }}
                    style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: "2px solid", borderColor: form.model === m.model ? "#e85d1a" : "#e2e8f0", background: form.model === m.model ? "#fff7ed" : "#fff" }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{m.model}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{m.sogutma}</div>
                    <div style={{ fontSize: 11, color: "#e85d1a", fontWeight: 600 }}>{m.kapasite}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Ø {m.kalip}</div>
                  </div>
                ))}
              </div>
            )}
          </Field>

          {/* Makina Kalıp Çapı — 3 kutu: çap × boy × arka ölçü */}
          <Field label="Makina Kalıp Çapı">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Input value={form.kalipCapi?.en || ""} placeholder="Çap"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), en: e.target.value } }))} />
              <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>×</span>
              <Input value={form.kalipCapi?.boy || ""} placeholder="Boy"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), boy: e.target.value } }))} />
              <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>×</span>
              <Input value={form.kalipCapi?.yukseklik || ""} placeholder="Arka Ölçü"
                onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), yukseklik: e.target.value } }))} />
            </div>
          </Field>

          {/* Kalıp Ölçüleri — listeden eklenir/silinir, sayı otomatik */}
          <Field label={`Kalıp Ölçüleri (${(form.kaliplar || []).length} kalıp)`}>
            {(form.kaliplar || []).map((k, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 36px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>{i + 1}.</span>
                <Select value={k.ad || ""}
                  onChange={e => setForm(p => {
                    const arr = [...(p.kaliplar || [])];
                    arr[i] = { ...arr[i], ad: e.target.value };
                    return { ...p, kaliplar: arr, kalipSayisi: arr.length };
                  })}>
                  <option value="">Kalıp seçin...</option>
                  {kalipDefs.map(d => <option key={d.id} value={d.ad}>{d.ad}</option>)}
                </Select>
                <Input value={k.olcu || ""} placeholder="Ölçü (örn: 55x125 mm)"
                  onChange={e => setForm(p => {
                    const arr = [...(p.kaliplar || [])];
                    arr[i] = { ...arr[i], olcu: e.target.value };
                    return { ...p, kaliplar: arr, kalipSayisi: arr.length };
                  })} />
                {/* Sil butonu — en az 1 kalıp kalmalı */}
                <button
                  type="button"
                  disabled={(form.kaliplar || []).length <= 1}
                  title={(form.kaliplar || []).length <= 1 ? "En az 1 kalıp olmalı" : "Bu kalıbı sil"}
                  onClick={() => setForm(p => {
                    const arr = (p.kaliplar || []).filter((_, idx) => idx !== i);
                    return { ...p, kaliplar: arr, kalipSayisi: arr.length };
                  })}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca",
                    background: (form.kaliplar || []).length <= 1 ? "#f8fafc" : "#fef2f2",
                    color: (form.kaliplar || []).length <= 1 ? "#cbd5e1" : "#dc2626",
                    cursor: (form.kaliplar || []).length <= 1 ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                  }}
                >🗑</button>
              </div>
            ))}
            {/* Kalıp Ekle butonu */}
            <button
              type="button"
              onClick={() => setForm(p => {
                const arr = [...(p.kaliplar || []), { ad: "", olcu: "" }];
                return { ...p, kaliplar: arr, kalipSayisi: arr.length };
              })}
              style={{
                marginTop: 4, padding: "8px 16px", borderRadius: 8, border: "1px dashed #e85d1a",
                background: "#fff7ed", color: "#e85d1a", fontSize: 13, fontWeight: 700, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >+ Kalıp Ekle</button>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Garanti Başlangıç">
              <Input type="date" value={form.installDate || ""} onChange={e => {
                const d = e.target.value;
                const end = d ? `${parseInt(d.slice(0,4))+2}${d.slice(4)}` : "";
                setForm(p => ({ ...p, installDate: d, warrantyEnd: end }));
              }} />
            </Field>
            <Field label="Garanti Bitiş (otomatik)">
              <Input type="date" value={form.warrantyEnd || ""} onChange={e => setForm(p => ({ ...p, warrantyEnd: e.target.value }))} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Para Birimi">
              <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="TRY">₺ Türk Lirası</option>
                <option value="USD">$ Dolar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
              </Select>
            </Field>
            <Field label="Satış Tipi">
              <Select value={normalizeSaleType(form.faturali)} onChange={e => setForm(p => ({ ...p, faturali: e.target.value }))}>
                {SALE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>

          {/* Gerçek Satış Bedeli — finansın asıl bel kemiği */}
          <Field label="Gerçek Satış Bedeli">
            <MoneyInput value={form.fabrikaSatisBedeli} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, fabrikaSatisBedeli: v }))} />
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Makinenin fiilen satıldığı gerçek tutar (finans raporundaki gerçek ciro budur).</div>
          </Field>

          {/* Fatura Bedeli — faturalı satışlarda */}
          {isFaturali(form.faturali) && (
            <Field label="Fatura Bedeli (resmi faturada yazan)">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MoneyInput value={form.faturaBedeli} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, faturaBedeli: v }))} />
                {normalizeSaleType(form.faturali) === "Faturalı İhracat" && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", background: "#dbeafe", padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>İHRACAT · KDV YOK</span>
                )}
              </div>
              {/* Otomatik KDV göstergesi — sadece Yurt İçi */}
              {isYurtIci(form.faturali) && (
                <div style={{ fontSize: 12, color: "#065f46", background: "#d1fae5", padding: "7px 12px", borderRadius: 8, marginTop: 8, fontWeight: 600 }}>
                  KDV (%{kdvRate}): <b>{fmtCur(calcKDV(form.faturali, form.faturaBedeli, kdvRate), form.currency)}</b>
                  {"  ·  "}KDV dahil toplam: <b>{fmtCur(parseMoney(form.faturaBedeli) + calcKDV(form.faturali, form.faturaBedeli, kdvRate), form.currency)}</b>
                </div>
              )}
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                Gerçek bedelden farklı olabilir (düşük fatura). KDV bu tutar üzerinden hesaplanır.
              </div>
            </Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Komisyon"><MoneyInput value={form.komisyon} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, komisyon: v }))} /></Field>
            <Field label="Extra Kalıp Fiyatı"><MoneyInput value={form.extraKalipFiyati} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, extraKalipFiyati: v }))} /></Field>
          </div>

          <Field label="Kalan Borç"><MoneyInput value={form.kalanBorc} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, kalanBorc: v }))} /></Field>

          <Field label="Seri Numarası">
            {(() => {
              const stockForModel = (stock && form.model) ? stock.filter(s => s.model === form.model) : [];
              const serili = stockForModel.filter(s => s.serialNo);       // seri no'lu stok
              const serisiz = stockForModel.filter(s => !s.serialNo);     // seri no'suz stok
              // Stok modu: yeni kayıt + model seçili + o modelde stok var → dropdown (+ manuel seçeneği)
              if (modal === "add" && stock && form.model && stockForModel.length > 0 && !form._manualSerial) {
                return (
                  <>
                    <Select value={form._stokSerisiz ? "__serisiz__" : (form.serialNo || "")} onChange={e => {
                      if (e.target.value === "__manual__") {
                        setForm(p => ({ ...p, _manualSerial: true, _stokSerisiz: false, serialNo: "" }));
                      } else if (e.target.value === "__serisiz__") {
                        // Seri no'suz stok seç: seri no boş kalır, satışta o modelden 1 seri no'suz adet düşülür
                        setForm(p => ({ ...p, _stokSerisiz: true, serialNo: "" }));
                      } else {
                        setForm(p => ({ ...p, _stokSerisiz: false, serialNo: e.target.value }));
                      }
                    }}>
                      <option value="">Stoktan seçin... ({stockForModel.length} adet)</option>
                      {serili.map(s => <option key={s.id} value={s.serialNo}>{s.serialNo}</option>)}
                      {serisiz.length > 0 && <option value="__serisiz__">📦 Seri no'suz stoktan düş ({serisiz.length} adet), seri no sonra atanır</option>}
                      <option value="__manual__">✏️ Manuel gir (stok dışı / eski müşteri)</option>
                    </Select>
                    {form._stokSerisiz ? (
                      <div style={{ fontSize: 11, color: "#d97706", marginTop: 5, fontWeight: 600 }}>
                        ⚠ Seri no'suz satış yapılıyor, stoktan 1 adet düşülecek. Seri no'yu sonra "Müşteriyi Düzenle" bölümünden girebilirsiniz.
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#059669", marginTop: 5, fontWeight: 600 }}>
                        ✓ Stoktan seçilen seri no satış kaydedilince stoktan otomatik düşülür
                      </div>
                    )}
                  </>
                );
              }
              // Manuel mod / stok yok / düzenleme: serbest metin
              return (
                <>
                  <Input value={form.serialNo || ""} onChange={e => setForm(p => ({ ...p, serialNo: e.target.value }))} placeholder="AK140-2026-001" autoFocus={form._manualSerial} />
                  {modal === "add" && form._manualSerial && stockForModel.length > 0 && (
                    <button onClick={() => setForm(p => ({ ...p, _manualSerial: false, serialNo: "" }))}
                      style={{ marginTop: 5, fontSize: 11, color: "#e85d1a", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                      ← Stoktan seçime dön
                    </button>
                  )}
                  {modal === "add" && form._manualSerial && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      Manuel girilen seri no stoktan düşülmez (eski müşteri kaydı için uygundur).
                    </div>
                  )}
                  {modal === "add" && stock && form.model && stockForModel.length === 0 && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5 }}>
                      Bu modelden stokta makina yok, seri no elle girilecek.
                    </div>
                  )}
                  {modal === "add" && stock && !form.model && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>
                      Stoktan seri no seçebilmek için önce yukarıdan <b>Model</b> seçin.
                    </div>
                  )}
                </>
              );
            })()}
          </Field>

          <Field label="Açıklama">
            <textarea value={form.aciklama || ""} onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
              placeholder="Bu satış / makina ile ilgili açıklama, notlar..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════
// DEALERS (Sade bayi listesi)
// ════════════════════════════════════════════════════════════════
const SimpleDealers = ({ dealers, setDealers, factory, setFactory, geoData, loadingGeo, showToast = () => {} }) => {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState(null);
  const [detailView, setDetailView] = useState(null); // tıklanan bayinin tüm bilgileri
  const PER_PAGE = 10;

  const q = trLower(search);
  const filtered = dealers.filter(d =>
    trLower(d.name).includes(q) || trLower(d.city).includes(q) ||
    trLower(d.contact).includes(q) || trLower(d.country).includes(q)
  );
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openAdd  = () => { setForm({ name: "", contact: "", phone: "", email: "", adres: "", country: "Türkiye", city: "", note: "" }); setModal("add"); };
  const openEdit = d => { setForm({ ...d }); setModal({ edit: d }); };
  const openFactoryEdit = () => { setForm({ ...factory }); setModal("factory"); };
  const save = () => {
    if (modal === "factory") { setFactory({ ...form }); showToast("Fabrika bilgileri düzenlendi."); }
    else if (modal === "add") { bumpId(dealers); const nid = uid(); setDealers(p => p.some(d => d.id === nid) ? p : [{ ...form, id: nid }, ...p]); showToast("Bayi kaydedildi."); }
    else { setDealers(p => p.map(d => d.id === form.id ? form : d)); showToast("Bayi bilgileri düzenlendi."); }
    setModal(null);
  };
  const confirmDel = () => { setDealers(p => p.filter(d => d.id !== confirmId)); setConfirmId(null); showToast("Bayi silindi."); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Bayiler</h2>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Bayi Ekle</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Bayi ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Firma", "İletişim", "Telefon", "Ülke / Şehir", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Fabrika — her zaman en üstte, düzenlenebilir ama silinemez */}
            <tr style={{ borderBottom: "2px solid #d1fae5", background: "#f0fdf4" }}>
              <td style={{ padding: "13px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#065f46", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#a7f3d0" }}
                    onClick={() => setDetailView({ ...(factory || {}), name: factory?.name || "Altuntaş Makina", _isFactory: true })} title="Fabrika bilgilerini görüntüle">
                    {factory?.name || "Altuntaş Makina"}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, background: "#10b981", color: "#fff", borderRadius: 6, padding: "2px 8px", letterSpacing: .5 }}>FABRİKA</span>
                </div>
                {factory?.adres && <div style={{ fontSize: 11, color: "#047857", marginTop: 3 }}>{factory.adres}</div>}
              </td>
              <td style={{ padding: "13px 16px", fontSize: 13, color: "#065f46" }}>{factory?.contact || "—"}</td>
              <td style={{ padding: "13px 16px", fontSize: 13, color: "#065f46" }}>{factory?.phone || "—"}</td>
              <td style={{ padding: "13px 16px", fontSize: 13, color: "#065f46" }}>{factory?.country && factory?.city ? `${factory.country} / ${factory.city}` : factory?.country || "Türkiye"}</td>
              <td style={{ padding: "13px 16px" }}>
                <Btn small variant="ghost" onClick={openFactoryEdit}><Icon name="edit" size={12} /></Btn>
              </td>
            </tr>
            {paged.map(d => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "13px 16px", cursor: "pointer" }} onClick={() => setDetailView(d)} title="Tüm bilgileri görüntüle">
                  <div style={{ fontWeight: 600, fontSize: 14, textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{d.name}</div>
                  {d.adres && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.adres}</div>}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{d.contact || "—"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{d.phone || "—"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13 }}>{d.country && d.city ? `${d.country} / ${d.city}` : d.city || d.country || "—"}</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={() => openEdit(d)}><Icon name="edit" size={12} /></Btn>
                    <Btn small variant="danger" onClick={() => setConfirmId(d.id)}><Icon name="trash" size={12} /></Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Bayi bulunamadı.</div>}
        <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {/* Bayi detay görüntüleme */}
      {detailView && (
        <Modal title={detailView.name || "Bayi"} onClose={() => setDetailView(null)}>
          {detailView._isFactory && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 14px", marginBottom: 14, fontSize: 12, fontWeight: 700, color: "#065f46" }}>
              🏭 FABRİKA — Ana üretici
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              ["İletişim Kişisi", detailView.contact],
              ["Telefon", detailView.phone],
              ["E-posta", detailView.email],
              ["Adres", detailView.adres],
              ["Şehir / Ülke", [detailView.city, detailView.country].filter(Boolean).join(" / ")],
              ["Not", detailView.note],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: .5, marginBottom: 3, textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setDetailView(null)}>Kapat</Btn>
          </div>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`"${dealers.find(d => d.id === confirmId)?.name || ""}" bayisi kalıcı olarak silinecek.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal title={modal === "factory" ? "Fabrika Bilgilerini Düzenle" : modal === "add" ? "Bayi Ekle" : "Bayi Düzenle"} onClose={() => setModal(null)}>
          <Field label="Firma Adı">
            <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Bayi firma adı" />
            {modal !== "factory" && <Warn>{!form.name?.trim() ? "Firma adı girilmedi" : ""}</Warn>}
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="İletişim Kişisi"><Input value={form.contact || ""} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="Ad Soyad" /></Field>
            <Field label="Telefon">
              <Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              <Warn>{form.phone && !PHONE_RE.test(form.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
          </div>
          <Field label="E-posta">
            <Input value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
            <Warn>{form.email && !EMAIL_RE.test(form.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
          </Field>
          <Field label="Adres Satırı"><Input value={form.adres || ""} onChange={e => setForm(p => ({ ...p, adres: e.target.value }))} placeholder="Mahalle, cadde, no..." /></Field>
          <CountryCityFields country={form.country} city={form.city}
            onCountry={v => setForm(p => ({ ...p, country: v }))}
            onCity={v => setForm(p => ({ ...p, city: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />
          <Field label="Not">
            <textarea value={form.note || ""} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Bayi hakkında notlar..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 70, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MACHINE HISTORY (Makina Geçmişi)
// ════════════════════════════════════════════════════════════════
const MachineHistory = ({ customers, setCustomers, services, models = ALTUNMAK_MODELS, dealers = [], factory = null, geoData = null, loadingGeo = false, showToast = () => {}, parts = [], partSales = [], setPartSales = null }) => {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const [editForm, setEditForm] = useState(null); // null | müşteri kopyası
  const [newOwnerForm, setNewOwnerForm] = useState(null); // 2. el satış formu

  const saveNewOwner = () => {
    setCustomers(p => p.map(c => {
      if (c.id !== newOwnerForm._machineId) return c;
      // Mevcut sahibi geçmişe ekle
      const prev = {
        name: c.name, satisYapan: c.satisYapan, adres: c.adres,
        city: c.city, country: c.country, soldDate: newOwnerForm.saleDate || today(),
      };
      // Yeni sahibe geç. Bu bir 2. el DEVİR — bizim satışımız değil.
      // Finansa tekrar yansımaması için satışla ilgili tutarları sıfırla ve devir işaretle.
      return {
        ...c,
        prevOwners: [...(c.prevOwners || []), prev],
        name: newOwnerForm.name,
        phone: newOwnerForm.phone || "",
        adres: newOwnerForm.adres || "",
        city: newOwnerForm.city || "",
        country: newOwnerForm.country || "",
        aciklama: newOwnerForm.aciklama || "",
        isResale: true,            // 2. el devir işareti (finans bunu gelir saymaz)
        satisYapan: "2. El Devir",
        faturaBedeli: 0,
        fabrikaSatisBedeli: 0,
        komisyon: 0,
        extraKalipFiyati: 0,
        kalanBorc: 0,
      };
    }));
    showToast("Devir tamamlandı. Yeni sahip kaydedildi.");
    setNewOwnerForm(null);
  };

  const saveEdit = () => {
    setCustomers(p => p.map(c => c.id === editForm.id ? editForm : c));
    showToast("Makina bilgileri düzenlendi.");
    setEditForm(null);
  };

  // Makinası olan müşteriler (model veya seri no girilmiş)
  const machineOwners = customers.filter(c => c.model || c.serialNo);

  const filtered = search.trim()
    ? machineOwners.filter(c =>
        trLower(c.name).includes(trLower(search)) ||
        trLower(c.model).includes(trLower(search)) ||
        trLower(c.serialNo).includes(trLower(search))
      )
    : machineOwners;

  const selected = customers.find(c => c.id === selectedId);
  const history = selected
    ? services.filter(s => s.customerId === selected.id).sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    : [];
  // Birleşik zaman çizelgesi: satış + servisler + garanti bitişi (eskiden yeniye)
  const timelineEvents = (() => {
    if (!selected) return [];
    const ev = [];
    // Satış (devir varsa devir tarihi, yoksa kurulum tarihi)
    if (selected.installDate) {
      ev.push({
        kind: "sale", date: selected.installDate, color: "#16a34a",
        title: selected.isResale ? "2. El Devir" : "Satış",
        tip: normalizeSaleType(selected.faturali),
        desc: `${selected.name}${selected.fabrikaSatisBedeli ? " · " + fmtCur(selected.fabrikaSatisBedeli, selected.currency) : ""}${(selected.kaliplar || []).length ? " · " + selected.kaliplar.length + " kalıp" : ""}`,
      });
    }
    // Servisler
    history.forEach(sv => {
      const tColor = { "İlk Çalıştırma": "#1d4ed8", "Garanti İçi": "#16a34a", "Garanti Dışı": "#dc2626", "Periyodik Bakım": "#c2410c" }[sv.type] || "#94a3b8";
      ev.push({ kind: "service", date: sv.date, color: tColor, title: sv.type, sv });
    });
    // Verilen parça/kalıplar
    (partSales || []).filter(ps => ps.customerId === selected.id).forEach(ps => {
      const kalip = ps.tur === "Kalıp";
      ev.push({
        kind: "part", date: ps.tarih, color: kalip ? "#c2410c" : "#0891b2",
        title: kalip ? "Kalıp Verildi" : "Yedek Parça Verildi",
        desc: `${ps.ad}${ps.olcu ? " (" + ps.olcu + ")" : ""}${ps.ucretsizMi ? " · garanti kapsamında (ücretsiz)" : " · " + fmtCur(ps.ucret, ps.currency) + (ps.garantiDisiIslem ? " (garanti dışı işlem)" : "")}`,
        ps,
      });
    });
    // Garanti bitişi
    if (selected.warrantyEnd) {
      const dolmus = selected.warrantyEnd < today();
      ev.push({
        kind: "warranty", date: selected.warrantyEnd, color: dolmus ? "#dc2626" : "#f59e0b",
        title: dolmus ? "Garanti Süresi Doldu" : "Garanti Bitişi",
        desc: dolmus ? "Garanti süresi sona erdi" : "Garanti süresi bu tarihte sona erecek",
      });
    }
    // Eskiden yeniye sırala (tarihsiz en sona)
    return ev.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  })();
  const modelInfo = selected ? ALTUNMAK_MODELS.find(m => m.model === selected.model) : null;
  const warrantyOk = selected?.warrantyEnd && selected.warrantyEnd >= today();

  // Raporu yeni sekmede aç ve yazdırma ekranını tetikle
  // (window.print() sandbox ortamında engellendiği için bu yöntem kullanılıyor)
  const printReport = () => {
    if (!selected) return;
    const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const infoRows = [
      ["Satın Alan", selected.name],
      ["Satış Yapan", selected.satisYapan || selected.contact || "—"],
      ["Adres", `${selected.adres ? selected.adres + ", " : ""}${selected.city || ""}${selected.country ? " / " + selected.country : ""}` || "—"],
      ["Makina Modeli", selected.model || "—"],
      ["Seri Numarası", selected.serialNo || "—"],
      ...(fmtKalipCapi(selected.kalipCapi) ? [["Makina Kalıp Çapı", fmtKalipCapi(selected.kalipCapi)]] : []),
      ["Kalıplar", kalipText(selected)],
      ["Satış / Garanti Başlangıç", selected.installDate ? fmtTR(selected.installDate) : "—"],
      ["Garanti Bitiş", `${selected.warrantyEnd ? fmtTR(selected.warrantyEnd) : "—"} (${warrantyOk ? "Garanti devam ediyor" : "Garanti süresi dolmuş"})`],
      ["Not", selected.note || "—"],
    ].map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");

    const svcRows = history.length === 0
      ? `<tr><td colspan="4" style="text-align:center">Servis kaydı bulunmuyor.</td></tr>`
      : history.map(sv =>
          `<tr><td>${esc(fmtTR(sv.date))}</td><td>${esc(sv.type)}</td><td>${esc(sv.tech || "—")}</td><td>${esc(sv.yapilanIsler || sv.description || "")}${sv.degisenParcalar?.length ? `<br><b>Değişen parçalar:</b> ${esc(sv.degisenParcalar.join(", "))}` : ""}</td></tr>`
        ).join("");

    const givenParts = (partSales || []).filter(ps => ps.customerId === selected.id).sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
    const partRows = givenParts.map(ps =>
      `<tr><td>${esc(fmtTR(ps.tarih))}</td><td>${esc(ps.tur)}</td><td>${esc(ps.ad)}${ps.olcu ? ` (${esc(ps.olcu)})` : ""}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<title>Servis Raporu - ${esc(selected.name)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #000; padding: 32px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
  .header .sub { font-size: 13px; }
  .header .right { font-size: 12px; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  th, td { border: 1px solid #000; padding: 7px 12px; text-align: left; }
  .info th { width: 210px; background: #eee; }
  .svc th { background: #eee; }
  h2 { font-size: 15px; margin: 0 0 10px; }
  .printbtn { display: block; margin: 0 auto 24px; padding: 10px 28px; background: #e85d1a; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
  @media print { .printbtn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${LOGO}" alt="Altuntaş Makina" style="height:42px;display:block;margin-bottom:6px" />
      <div class="sub">Makina Servis Geçmişi Raporu</div>
    </div>
    <div class="right">
      <div>Rapor Tarihi: ${todayTR()}</div>
    </div>
  </div>
  <table class="info"><tbody>${infoRows}</tbody></table>
  ${(Array.isArray(selected.prevOwners) && selected.prevOwners.length > 0) ? `
  <h2>SAHİPLİK GEÇMİŞİ (2. El Devir)</h2>
  <table class="svc">
    <thead><tr><th>Sıra</th><th>Sahip</th><th>Konum</th><th>Satış Yapan</th><th>Devir Tarihi</th></tr></thead>
    <tbody>
      ${selected.prevOwners.map((o, i) => `<tr><td>${i + 1}. Sahip</td><td>${esc(o.name)}</td><td>${esc([o.city, o.country].filter(Boolean).join(" / ") || "—")}</td><td>${esc(o.satisYapan || "—")}</td><td>${esc(o.soldDate || "—")}</td></tr>`).join("")}
      <tr style="background:#f0fdf4"><td><b>Mevcut</b></td><td><b>${esc(selected.name)}</b></td><td>${esc([selected.city, selected.country].filter(Boolean).join(" / ") || "—")}</td><td>${esc(selected.satisYapan || "—")}</td><td>—</td></tr>
    </tbody>
  </table>` : ""}
  <h2>SERVİS GEÇMİŞİ (${history.length} kayıt)</h2>
  <table class="svc">
    <thead><tr><th>Tarih</th><th>Tür</th><th>Teknisyen</th><th>Açıklama</th></tr></thead>
    <tbody>${svcRows}</tbody>
  </table>
  ${givenParts.length > 0 ? `
  <h2>VERİLEN YEDEK PARÇALAR (${givenParts.length} kayıt)</h2>
  <table class="svc">
    <thead><tr><th>Tarih</th><th>Tür</th><th>Parça / Kalıp</th></tr></thead>
    <tbody>${partRows}</tbody>
  </table>` : ""}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</` + `script>
</body>
</html>`;

    // Electron'da yerel yazdırma API'sini kullan (güvenilir); tarayıcıda window.open
    if (window.appPrint) {
      // Electron kendi yazdırma diyaloğunu açar; otomatik print script'ini çıkar (çift diyalog önle)
      window.appPrint.printHtml(stripAutoPrint(html));
      return;
    }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      // Yeni sekme engellendiyse dosya olarak indir
      const a = document.createElement("a");
      a.href = url;
      a.download = `servis-raporu-${(selected.serialNo || selected.name).replace(/\s+/g, "-")}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Makina Geçmişi</h2>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        {/* Sol: makina listesi */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
          <div style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={14} /></span>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Firma, model veya seri no..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc", boxSizing: "border-box", outline: "none" }} />
            </div>
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(c => (
              <div key={c.id} onClick={() => setSelectedId(c.id)}
                style={{
                  padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9",
                  background: selectedId === c.id ? "#fff7ed" : "#fff",
                  borderLeft: selectedId === c.id ? "3px solid #e85d1a" : "3px solid transparent",
                }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{c.model || "Model yok"}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{c.serialNo || "—"}</div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 20, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>Makina bulunamadı.</div>}
          </div>
          <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
        </div>

        {/* Sağ: detay */}
        {!selected ? (
          <div style={{ background: "#fff", borderRadius: 12, padding: 60, boxShadow: "0 1px 4px rgba(0,0,0,.08)", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ marginBottom: 10 }}><Icon name="machine" size={32} /></div>
            <div style={{ fontSize: 14 }}>Detaylarını görmek için soldan bir makina seçin</div>
          </div>
        ) : (
          <div>
            {/* Makina kimlik kartı */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderTop: "3px solid #e85d1a", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{selected.name}</div>
                    {selected.prevOwners?.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, background: "#10b981", color: "#fff", borderRadius: 6, padding: "3px 9px", letterSpacing: .5 }}>2. EL</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: "#e85d1a", fontWeight: 700, marginTop: 2 }}>{selected.model || "Model belirtilmemiş"}</div>
                  <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace", marginTop: 2 }}>S/N: {selected.serialNo || "—"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 10, background: warrantyOk ? "#d1fae5" : "#fee2e2", color: warrantyOk ? "#065f46" : "#991b1b" }}>
                    {warrantyOk ? "Garanti Devam Ediyor" : "Garanti Süresi Dolmuş"}
                  </span>
                  <Btn small onClick={printReport}><Icon name="print" size={13} /> Yazdır</Btn>
                  <Btn small variant="ghost" onClick={() => setEditForm({ ...selected })}><Icon name="edit" size={13} /> Düzenle</Btn>
                  <Btn small variant="ghost" onClick={() => setNewOwnerForm({ _machineId: selected.id, name: "", satisYapan: "Altuntaş Makina", adres: "", city: "", country: "Türkiye", saleDate: today(), faturali: "Faturalı Yurt İçi", faturaBedeli: "" })}>
                    <Icon name="customers" size={13} /> Yeni Sahip
                  </Btn>
                </div>
              </div>

              {modelInfo && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "3px 10px" }}>{modelInfo.sogutma}</span>
                  <span style={{ fontSize: 12, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "3px 10px" }}>{modelInfo.kapasite}</span>
                  <span style={{ fontSize: 12, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "3px 10px" }}>Kalıp Ø {modelInfo.kalip}</span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>SATIŞ TARİHİ</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{selected.installDate ? fmtTR(selected.installDate) : "—"}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>GARANTİ BİTİŞ</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: warrantyOk ? "#059669" : "#dc2626" }}>{selected.warrantyEnd ? fmtTR(selected.warrantyEnd) : "—"}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>KONUM</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{selected.country || "—"}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{selected.city || ""}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>İLETİŞİM</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{selected.phone || "—"}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{selected.email || ""}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>SATIŞ YAPAN</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{selected.satisYapan || selected.contact || "—"}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{kalipText(selected) !== "—" ? `Kalıp: ${kalipText(selected)}` : ""}</div>
                </div>
              </div>
            </div>

            {/* Önceki sahipler (2. el) */}
            {selected.prevOwners?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20, borderLeft: "4px solid #ef4444" }}>
                <div style={{ fontWeight: 700, marginBottom: 14, color: "#0f172a" }}>Sahiplik Geçmişi</div>
                {selected.prevOwners.map((o, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{i + 1}. Sahip: {o.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {o.country || ""}{o.city ? ` / ${o.city}` : ""}{o.satisYapan ? ` · Satış: ${o.satisYapan}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
                      Devir tarihi<br /><b style={{ color: "#475569" }}>{fmtTR(o.soldDate)}</b>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>
                    Mevcut Sahip: {selected.name}
                  </div>
                </div>
              </div>
            )}

            {/* Birleşik zaman çizelgesi: satış → servisler → garanti */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
              <div style={{ fontWeight: 700, marginBottom: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="service" size={16} /> Makina Geçmişi
                <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>{timelineEvents.length} olay</span>
              </div>
              {timelineEvents.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>Bu makinaya ait kayıt bulunmuyor.</div>
              ) : (
                timelineEvents.map((ev, i) => {
                  const last = i === timelineEvents.length - 1;
                  const sv = ev.sv;
                  return (
                    <div key={i} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: last ? 0 : 18 }}>
                      {/* Zaman çizgisi noktası + çizgi */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ width: 14, height: 14, borderRadius: "50%", background: ev.color, flexShrink: 0, marginTop: 3, border: "3px solid #fff", boxShadow: `0 0 0 2px ${ev.color}33` }} />
                        {!last && <div style={{ width: 2, flex: 1, background: "#e2e8f0", marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 4 }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{ev.date ? fmtTR(ev.date) : "tarih yok"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: ev.color }}>{ev.title}</span>
                          {ev.tip && <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", background: ev.tip === "Faturalı Yurt İçi" ? "#d1fae5" : ev.tip === "Faturalı İhracat" ? "#dbeafe" : "#fef3c7", color: ev.tip === "Faturalı Yurt İçi" ? "#065f46" : ev.tip === "Faturalı İhracat" ? "#1d4ed8" : "#92400e" }}>{ev.tip === "Faturalı Yurt İçi" ? "Yurt İçi" : ev.tip === "Faturalı İhracat" ? "İhracat" : "Faturasız"}</span>}
                          {sv?.tech && <span style={{ fontSize: 12, color: "#64748b" }}>· {sv.tech}</span>}
                          {sv?.repairPlace && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {sv.repairPlace}</span>}
                        </div>
                        {ev.desc && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{ev.desc}</div>}
                        {sv?.yapilanIsler && (
                          <div style={{ marginTop: 5 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .3 }}>Yapılan İşler / Parça Değişimleri</div>
                            <div style={{ fontSize: 13, color: "#475569", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sv.yapilanIsler}</div>
                          </div>
                        )}
                        {sv?.degisenParcalar?.length > 0 && (
                          <div style={{ marginTop: 5 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .3 }}>Değişen Parçalar</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                              {sv.degisenParcalar.map(ad => (
                                <span key={ad} style={{ fontSize: 11, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "2px 9px" }}>{ad}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {sv?.musteriTalimati && (
                          <div style={{ marginTop: 5 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .3 }}>Müşteri Talimatı</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sv.musteriTalimati}</div>
                          </div>
                        )}
                        {sv && (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && sv.servisUcreti && (
                          <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginTop: 5 }}>Servis Ücreti: {fmtCur(sv.servisUcreti, sv.currency)}{(sv.currency || "TRY") === "TRY" ? " (KDV dahil)" : ""}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}
      </div>

      {/* Yeni sahip (2. el satış) modalı */}
      {newOwnerForm && (
        <Modal title="Yeni Sahip Ekle (2. El Devir)" onClose={() => setNewOwnerForm(null)}>
          <div style={{ fontSize: 13, color: "#64748b", background: "#fff7ed", padding: "10px 14px", borderRadius: 10, marginBottom: 16, lineHeight: 1.5 }}>
            Mevcut sahip <b>sahiplik geçmişine</b> taşınacak, makina kaydı yeni sahibin bilgileriyle güncellenecek.
            Servis geçmişi ve makina bilgileri korunur. <b>Bu bir 2. el el değişimidir; firmanızın satışı olmadığı için finansa yansımaz.</b>
          </div>
          <Field label="Yeni Sahip (Satın Alan)">
            <Input value={newOwnerForm.name || ""} onChange={e => setNewOwnerForm(p => ({ ...p, name: e.target.value }))} placeholder="Firma / kişi adı" />
            <Warn>{!newOwnerForm.name?.trim() ? "Yeni sahip adı girilmedi" : ""}</Warn>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Telefon">
              <Input value={newOwnerForm.phone || ""} onChange={e => setNewOwnerForm(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon" />
              <Warn>{newOwnerForm.phone && !PHONE_RE.test(newOwnerForm.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
            </Field>
            <Field label="Devir Tarihi"><Input type="date" value={newOwnerForm.saleDate || ""} onChange={e => setNewOwnerForm(p => ({ ...p, saleDate: e.target.value }))} /></Field>
          </div>
          <Field label="Adres Satırı"><Input value={newOwnerForm.adres || ""} onChange={e => setNewOwnerForm(p => ({ ...p, adres: e.target.value }))} /></Field>
          <CountryCityFields country={newOwnerForm.country} city={newOwnerForm.city}
            onCountry={v => setNewOwnerForm(p => ({ ...p, country: v }))}
            onCity={v => setNewOwnerForm(p => ({ ...p, city: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />
          <Field label="Açıklama / Not">
            <textarea value={newOwnerForm.aciklama || ""} onChange={e => setNewOwnerForm(p => ({ ...p, aciklama: e.target.value }))}
              placeholder="Devir ile ilgili not (isteğe bağlı)..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 50, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setNewOwnerForm(null)}>İptal</Btn>
            <Btn onClick={saveNewOwner}><Icon name="check" size={14} /> Devri Tamamla</Btn>
          </div>
        </Modal>
      )}

      {/* Makina / müşteri düzenleme modalı */}
      {editForm && (
        <Modal title="Makina Bilgilerini Düzenle" onClose={() => setEditForm(null)}>
          <Field label="Firma Adı">
            <Input value={editForm.name || ""} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            <Warn>{!editForm.name?.trim() ? "Firma adı girilmedi" : ""}</Warn>
          </Field>
          <Field label="Satış Yapan">
            <Select value={editForm.satisYapan || factory?.name || "Altuntaş Makina"} onChange={e => setEditForm(p => ({ ...p, satisYapan: e.target.value }))}>
              <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
              {dealers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </Select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Model">
              <Select value={editForm.model || ""} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))}>
                <option value="">Model seçin...</option>
                {models.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
              </Select>
            </Field>
            <Field label="Seri Numarası"><Input value={editForm.serialNo || ""} onChange={e => setEditForm(p => ({ ...p, serialNo: e.target.value }))} /></Field>
          </div>
          <Field label="Kalıp"><Input value={editForm.kalip || ""} onChange={e => setEditForm(p => ({ ...p, kalip: e.target.value }))} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Garanti Başlangıç">
              <Input type="date" value={editForm.installDate || ""} onChange={e => {
                const d = e.target.value;
                const end = d ? `${parseInt(d.slice(0,4))+2}${d.slice(4)}` : "";
                setEditForm(p => ({ ...p, installDate: d, warrantyEnd: end }));
              }} />
            </Field>
            <Field label="Garanti Bitiş"><Input type="date" value={editForm.warrantyEnd || ""} onChange={e => setEditForm(p => ({ ...p, warrantyEnd: e.target.value }))} /></Field>
          </div>
          <Field label="Not">
            <textarea value={editForm.note || ""} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setEditForm(null)}>İptal</Btn>
            <Btn onClick={saveEdit}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// SERVICES
// ════════════════════════════════════════════════════════════════
const SERVICE_TYPES = ["İlk Çalıştırma", "Garanti İçi", "Garanti Dışı", "Periyodik Bakım"];
const REPAIR_PLACES = ["Yerinde Onarım", "Fabrikada Onarım"];

const Services = ({ services, setServices, customers, factory = null, parts = [], showToast = () => {} }) => {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [custSearch, setCustSearch] = useState("");
  const [detail, setDetail] = useState(null); // tıklanan servis kaydı (detay)

  const openAdd = () => {
    setForm({ customerId: "", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", yapilanIsler: "", musteriTalimati: "", servisUcreti: "", date: today(), tech: "", odendi: false, degisenParcalar: [] });
    setCustSearch("");
    setModal("add");
  };
  const openEdit = sv => { setForm({ degisenParcalar: [], ...sv }); setCustSearch(""); setModal({ edit: sv }); };
  const save = () => {
    const rec = { ...form, customerId: form.customerId ? Number(form.customerId) : null };
    if (modal === "add") {
      bumpId(customers, services);
      const newId = uid();
      setServices(p => p.some(s => s.id === newId) ? p : [{ ...rec, id: newId }, ...p]);
      showToast("Servis talebi kaydedildi.");
    }
    else { setServices(p => p.map(s => s.id === form.id ? rec : s)); showToast("Servis talebi düzenlendi."); }
    setModal(null);
  };
  const [confirmId, setConfirmId] = useState(null);
  const del = id => setConfirmId(id);
  const confirmDel = () => { setServices(p => p.filter(s => s.id !== confirmId)); setConfirmId(null); showToast("Servis kaydı silindi."); };

  const [page, setPage] = useState(1);
  const [svSearch, setSvSearch] = useState("");
  const [payFilter, setPayFilter] = useState(false); // sadece ödenmemiş ücretli servisler
  const PER_PAGE = 10;
  // Ücretli mi (Garanti Dışı / Periyodik Bakım + ücret > 0)
  const ucretliMi = (sv) => (sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && parseMoney(sv.servisUcreti) > 0;
  // Borçlu mu: ücretli + açıkça ödenmedi (eski kayıtlarda odendi alanı yoksa ödendi sayılır)
  const borcluMu = (sv) => ucretliMi(sv) && sv.odendi === false;
  const odenmemisCount = services.filter(borcluMu).length;
  const searched = svSearch.trim()
    ? services.filter(sv => {
        const cust = customers.find(c => c.id === sv.customerId);
        const q = trLower(svSearch);
        return trLower(cust?.name).includes(q) ||
               trLower(cust?.serialNo).includes(q) ||
               trLower(cust?.model).includes(q) ||
               trLower(sv.tech).includes(q) ||
               trLower(sv.yapilanIsler).includes(q) ||
               trLower(sv.musteriTalimati).includes(q);
      })
    : services;
  const visibleServices = payFilter ? searched.filter(borcluMu) : searched;
  const pagedServices = visibleServices.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const typeColor = {
    "İlk Çalıştırma": ["#eff6ff", "#1d4ed8"],
    "Garanti İçi": ["#f0fdf4", "#16a34a"],
    "Garanti Dışı": ["#fef2f2", "#dc2626"],
    "Periyodik Bakım": ["#fff7ed", "#c2410c"],
  };

  const selectedCust = customers.find(c => c.id === Number(form.customerId));
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        trLower(c.name).includes(trLower(custSearch)) ||
        trLower(c.contact).includes(trLower(custSearch)) ||
        trLower(c.serialNo).includes(trLower(custSearch))
      ).slice(0, 6)
    : [];

  // Yazdırma: firmanın gerçek servis formu düzeninde HTML üret
  const printService = (sv) => {
    const cust = customers.find(c => c.id === sv.customerId) || {};
    const esc = (s) => String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const adres = [cust.adres, cust.city, cust.country].filter(Boolean).join(", ") || "—";
    const ucret = ((sv.type === "Garanti Dışı" || sv.type === "Periyodik Bakım") && sv.servisUcreti)
      ? `${fmtCur(sv.servisUcreti, sv.currency)}${(sv.currency || "TRY") === "TRY" ? " (KDV dahil)" : ""}`
      : "—";

    const infoRows = [
      ["Firma Adı", cust.name],
      ["Telefon", cust.phone],
      ["Adres", adres],
      ["Makina Modeli", cust.model],
      ["Seri Numarası", cust.serialNo],
      ["Servis Türü", sv.type],
      ["Onarım Yeri", sv.repairPlace],
      ["Servise Giriş Tarihi", fmtTR(sv.date)],
      ["Teknisyen", sv.tech],
      ["Servis Ücreti", ucret],
    ].map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: 'unsafe-inline'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<title>Servis Formu - ${esc(cust.name)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #000; padding: 32px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
  .header .sub { font-size: 13px; }
  .header .right { font-size: 12px; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  th, td { border: 1px solid #000; padding: 7px 12px; text-align: left; }
  .info th { width: 210px; background: #eee; }
  h2 { font-size: 15px; margin: 0 0 10px; }
  .box-area { border: 1px solid #000; border-radius: 4px; min-height: 80px; padding: 12px; font-size: 13px; white-space: pre-wrap; line-height: 1.6; margin-bottom: 24px; }
  .terms { font-size: 10px; color: #444; line-height: 1.6; margin-top: 8px; border-top: 1px solid #ccc; padding-top: 12px; }
  .printbtn { display: block; margin: 0 auto 24px; padding: 10px 28px; background: #e85d1a; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
  @media print { .printbtn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <img src="${LOGO}" alt="Altuntaş Makina" style="height:42px;display:block;margin-bottom:6px" />
      <div class="sub">Servis Formu</div>
    </div>
    <div class="right">
      <div>Form No: № ${esc(String(sv.id))}</div>
      <div>Rapor Tarihi: ${todayTR()}</div>
    </div>
  </div>
  <table class="info"><tbody>${infoRows}</tbody></table>

  <h2>YAPILAN İŞLER / PARÇA DEĞİŞİMLERİ</h2>
  <div class="box-area">${esc(sv.yapilanIsler || "")}</div>

  ${sv.degisenParcalar?.length ? `
  <h2>DEĞİŞEN PARÇALAR</h2>
  <div class="box-area" style="min-height:auto">${esc(sv.degisenParcalar.join(", "))}</div>
  ` : ""}

  <h2>MÜŞTERİ TALİMATI / AÇIKLAMA</h2>
  <div class="box-area">${esc(sv.musteriTalimati || "")}</div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:none">
    <tr>
      <td style="border:none;width:50%;padding:0 16px 0 0;vertical-align:top">
        <div style="font-size:12px;font-weight:700;margin-bottom:50px">TESLİM EDEN</div>
        <div style="border-top:1px solid #000;padding-top:5px;font-size:11px;color:#444">Ad Soyad / İmza</div>
      </td>
      <td style="border:none;width:50%;padding:0 0 0 16px;vertical-align:top">
        <div style="font-size:12px;font-weight:700;margin-bottom:50px">TESLİM ALAN</div>
        <div style="border-top:1px solid #000;padding-top:5px;font-size:11px;color:#444">Ad Soyad / İmza / Kaşe</div>
      </td>
    </tr>
  </table>

  <div class="terms">
    1- Yukarıda adı ve miktarı belirtilen parçaları tam olarak teslim aldım. Yapılan hizmeti kabul ediyorum.<br>
    2- Tamir süresi 10 (on) iş gününü geçmez.<br>
    3- Yere düşen malzemeler garanti kapsamı dışındadır.<br>
    4- Teslim tarihinden itibaren 20 iş günü içerisinde alınmayan ürünlerden servisimiz sorumlu değildir.
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</` + `script>
</body>
</html>`;

    if (window.appPrint) {
      window.appPrint.printHtml(stripAutoPrint(html));
      return;
    }
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `servis-formu-${(cust.serialNo || cust.name || "kayit").replace(/\s+/g, "-")}.html`;
      a.click();
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Servis Talepleri</h2>
        <Btn onClick={openAdd} disabled={customers.length === 0}><Icon name="plus" size={14} /> Yeni Talep</Btn>
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={svSearch} onChange={e => { setSvSearch(e.target.value); setPage(1); }}
          placeholder="Firma, model, seri no, teknisyen veya işlem ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => { setPayFilter(false); setPage(1); }}
          style={{ padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: !payFilter ? "#e85d1a" : "#e2e8f0", background: !payFilter ? "#e85d1a" : "#fff", color: !payFilter ? "#fff" : "#64748b" }}>
          Tümü ({services.length})
        </button>
        <button onClick={() => { setPayFilter(true); setPage(1); }}
          style={{ padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: payFilter ? "#dc2626" : "#e2e8f0", background: payFilter ? "#dc2626" : "#fff", color: payFilter ? "#fff" : "#64748b" }}>
          💰 Ödenmemiş Servis Borcu ({odenmemisCount})
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Müşteri", "Makina", "Tür", "Onarım Yeri", "Tarih", "Ödeme", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedServices.map(sv => {
              const cust = customers.find(c => c.id === sv.customerId);
              const [tbg, tfg] = typeColor[sv.type] || ["#f1f5f9", "#475569"];
              return (
                <tr key={sv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "13px 16px", cursor: "pointer" }} onClick={() => setDetail(sv)} title="Yapılan işlemleri görüntüle">
                    <div style={{ fontWeight: 600, fontSize: 13, textDecoration: "underline", textDecorationColor: "#e2e8f0" }}>{cust?.name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{[cust?.adres, cust?.city].filter(Boolean).join(", ") || "—"}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{cust?.model || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{cust?.serialNo}</div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ background: tbg, color: tfg, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>{sv.type}</span>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748b" }}>{sv.repairPlace || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: 13, color: "#64748b" }}>{fmtTR(sv.date)}</td>
                  <td style={{ padding: "13px 16px" }}>
                    {ucretliMi(sv) ? (
                      sv.odendi === false
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>Ödenmedi · {fmtCur(sv.servisUcreti, sv.currency)}</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>Ödendi</span>
                    ) : <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => printService(sv)}><Icon name="print" size={12} /></Btn>
                      <Btn small variant="ghost" onClick={() => openEdit(sv)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => del(sv.id)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleServices.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{services.length === 0 ? "Henüz servis talebi yok." : "Aramanıza uyan talep yok."}</div>}
        <Pagination total={visibleServices.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {/* Detay görüntüleme */}
      {detail && (() => {
        const cust = customers.find(c => c.id === detail.customerId) || {};
        const [tbg, tfg] = typeColor[detail.type] || ["#f1f5f9", "#475569"];
        return (
          <Modal wide title={`Servis Kaydı — ${cust.name || ""}`} onClose={() => setDetail(null)}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ background: tbg, color: tfg, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "5px 12px" }}>{detail.type}</span>
              <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "5px 12px" }}>{detail.repairPlace || "—"}</span>
              <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "5px 12px" }}>{fmtTR(detail.date)}</span>
              {detail.tech && <span style={{ background: "#f1f5f9", color: "#475569", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "5px 12px" }}>Teknisyen: {detail.tech}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[["Model", cust.model], ["Seri No", cust.serialNo], ["Telefon", cust.phone], ["Adres", [cust.adres, cust.city, cust.country].filter(Boolean).join(", ")]].filter(([,v]) => v).map(([k,v]) => (
                <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>YAPILAN İŞLER / PARÇA DEĞİŞİMLERİ</div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.6, minHeight: 50 }}>{detail.yapilanIsler || "—"}</div>
            </div>
            {detail.musteriTalimati && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>MÜŞTERİ TALİMATI / AÇIKLAMA</div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{detail.musteriTalimati}</div>
              </div>
            )}
            {(detail.type === "Garanti Dışı" || detail.type === "Periyodik Bakım") && detail.servisUcreti && (
              <div style={{ marginBottom: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>SERVİS ÜCRETİ: </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>{fmtCur(detail.servisUcreti, detail.currency)}</span>
                {(detail.currency || "TRY") === "TRY"
                  ? <span style={{ fontSize: 11, color: "#065f46", marginLeft: 8, fontWeight: 700 }}>KDV dahil</span>
                  : <span style={{ fontSize: 11, color: "#1d4ed8", marginLeft: 8, fontWeight: 700 }}>Yurt dışı</span>}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setDetail(null)}>Kapat</Btn>
              <Btn onClick={() => printService(detail)}><Icon name="print" size={14} /> Yazdır</Btn>
              <Btn onClick={() => { const sv = detail; setDetail(null); openEdit(sv); }}><Icon name="edit" size={14} /> Düzenle</Btn>
            </div>
          </Modal>
        );
      })()}

      {confirmId && (
        <ConfirmDialog
          message="Bu servis talebi kalıcı olarak silinecek."
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal title={modal === "add" ? "Yeni Servis Talebi" : "Servis Talebini Düzenle"} onClose={() => setModal(null)}>
          <Field label="Müşteri">
            {selectedCust ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "#fff7ed" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{selectedCust.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {selectedCust.model || "Model yok"} {selectedCust.serialNo ? `· S/N: ${selectedCust.serialNo}` : ""}
                  </div>
                </div>
                <button onClick={() => { setForm(p => ({ ...p, customerId: "" })); setCustSearch(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={14} /></span>
                  <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                    placeholder="Firma adı, kişi veya seri no ile ara..."
                    style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box", outline: "none" }} />
                </div>
                {custSearch.trim() && (
                  <div style={{ marginTop: 6, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                    {matchedCustomers.map(c => (
                      <div key={c.id}
                        onClick={() => { setForm(p => ({ ...p, customerId: c.id })); setCustSearch(""); }}
                        style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#fff" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {c.contact} {c.model ? `· ${c.model}` : ""} {c.serialNo ? `· ${c.serialNo}` : ""}
                        </div>
                      </div>
                    ))}
                    {matchedCustomers.length === 0 && (
                      <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>Müşteri bulunamadı.</div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Warn>{!form.customerId ? "Müşteri seçilmedi" : ""}</Warn>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tür">
              <Select value={form.type || "Periyodik Bakım"} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Onarım Yeri">
              <Select value={form.repairPlace || "Yerinde Onarım"} onChange={e => setForm(p => ({ ...p, repairPlace: e.target.value }))}>
                {REPAIR_PLACES.map(t => <option key={t}>{t}</option>)}
              </Select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: form.type === "Garanti Dışı" ? "1fr 1fr" : "1fr 1fr", gap: 12 }}>
            <Field label="Tarih"><Input type="date" value={form.date || ""} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Teknisyen"><Input value={form.tech || ""} onChange={e => setForm(p => ({ ...p, tech: e.target.value }))} placeholder="Teknisyen adı" /></Field>
          </div>
          {(form.type === "Garanti Dışı" || form.type === "Periyodik Bakım") && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Para Birimi">
                <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                  <option value="TRY">₺ Türk Lirası</option>
                  <option value="USD">$ Dolar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                </Select>
              </Field>
              <Field label="Servis Ücreti">
                <MoneyInput value={form.servisUcreti} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, servisUcreti: v }))} />
                {(form.currency || "TRY") !== "TRY" && (
                  <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
                )}
              </Field>
            </div>
          )}

          {/* Ödeme durumu — sadece ücretli servislerde */}
          {(form.type === "Garanti Dışı" || form.type === "Periyodik Bakım") && parseMoney(form.servisUcreti) > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${form.odendi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
              <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "#15803d" : "#92400e" }}>
                {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
              </span>
            </label>
          )}

          <Field label="Yapılan İşler / Parça Değişimleri">
            <textarea value={form.yapilanIsler || ""} onChange={e => setForm(p => ({ ...p, yapilanIsler: e.target.value }))}
              placeholder="Yapılan işlemler, değişen parçalar..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 80, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>

          {/* Değişen parçalar — tanımlı yedek parçalardan çoklu seçim (kayıt amaçlı, ücretsiz) */}
          <Field label="Değişen Parçalar (varsa)">
            {parts.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Tanımlı yedek parça yok. Ayarlar → Tanımlar → Yedek Parça'dan ekleyebilirsiniz.</div>
            ) : (
              <>
                <Select value="" onChange={e => {
                  const ad = e.target.value;
                  if (ad && !(form.degisenParcalar || []).includes(ad)) {
                    setForm(p => ({ ...p, degisenParcalar: [...(p.degisenParcalar || []), ad] }));
                  }
                }}>
                  <option value="">+ Parça ekle...</option>
                  {parts.filter(p => !(form.degisenParcalar || []).includes(p.ad)).map(p => (
                    <option key={p.id} value={p.ad}>{p.ad}</option>
                  ))}
                </Select>
                {(form.degisenParcalar || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {form.degisenParcalar.map(ad => (
                      <span key={ad} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 16, padding: "4px 10px" }}>
                        {ad}
                        <button onClick={() => setForm(p => ({ ...p, degisenParcalar: p.degisenParcalar.filter(x => x !== ad) }))}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>Bu seçim sadece kayıt amaçlıdır, ücretlendirme yapmaz. Ücretli parça satışı için Yedek Parça bölümünü kullanın.</div>
              </>
            )}
          </Field>

          <Field label="Müşteri Talimatı / Açıklama">
            <textarea value={form.musteriTalimati || ""} onChange={e => setForm(p => ({ ...p, musteriTalimati: e.target.value }))}
              placeholder="Müşterinin talimatı / talebi..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// SETTINGS (Ayarlar)
// ════════════════════════════════════════════════════════════════
const APP_VERSION = "1.1.0";

const ModelsManager = ({ standardModels, setStandardModels, customModels, setCustomModels, showToast = () => {} }) => {
  const empty = { model: "", sogutma: "Soğutmalı", kapasite: "", kalip: "" };
  const [modelModal, setModelModal] = useState(null); // null | { mode: "add" | "edit-std" | "edit-custom", data }
  const [mForm, setMForm] = useState(empty);
  const [confirmDelModel, setConfirmDelModel] = useState(null); // silinecek model adı

  const openAdd = () => { setMForm(empty); setModelModal({ mode: "add" }); };
  const openEdit = (m, isStd) => { setMForm({ ...m }); setModelModal({ mode: isStd ? "edit-std" : "edit-custom", orig: m.model }); };

  const saveModel = () => {
    const name = (mForm.model || "").trim();
    if (modelModal.mode === "add") {
      const exists = standardModels.some(m => m.model === name) || customModels.some(m => m.model === name);
      if (!exists) { setCustomModels(p => p.some(m => m.model === name) ? p : [...p, { ...mForm, model: name }]); showToast("Model kaydedildi."); }
      else showToast("Bu model zaten var.", "err");
    } else if (modelModal.mode === "edit-std") {
      setStandardModels(p => p.map(m => m.model === modelModal.orig ? { ...mForm, model: name } : m));
      showToast("Model düzenlendi.");
    } else {
      setCustomModels(p => p.map(m => m.model === modelModal.orig ? { ...mForm, model: name } : m));
      showToast("Model düzenlendi.");
    }
    setModelModal(null);
  };

  const ModelRow = ({ m, isStd }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{m.model}</span>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
          {[m.sogutma, m.kapasite, m.kalip ? `Kalıp Ø ${m.kalip}` : ""].filter(Boolean).join(" · ") || "Detay girilmemiş"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn small variant="ghost" onClick={() => openEdit(m, isStd)}><Icon name="edit" size={12} /></Btn>
        {!isStd && (
          <Btn small variant="danger" onClick={() => setConfirmDelModel(m.model)}><Icon name="trash" size={12} /></Btn>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Model Ekle</Btn>
      </div>
      {standardModels.map((m, i) => <ModelRow key={"s-" + m.model + "-" + i} m={m} isStd />)}
      {customModels.map((m, i) => <ModelRow key={"c-" + m.model + "-" + i} m={m} isStd={false} />)}
      {customModels.length === 0 && (
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Henüz özel model eklenmedi.</div>
      )}

      {confirmDelModel && (
        <ConfirmDialog
          message={`"${confirmDelModel}" modeli silinecek. Bu işlem geri alınamaz.`}
          onConfirm={() => { setCustomModels(p => p.filter(x => x.model !== confirmDelModel)); setConfirmDelModel(null); showToast("Model silindi."); }}
          onCancel={() => setConfirmDelModel(null)}
        />
      )}

      {modelModal && (
        <Modal title={modelModal.mode === "add" ? "Yeni Model Ekle" : "Modeli Düzenle"} onClose={() => setModelModal(null)}>
          <Field label="Model Adı">
            <Input value={mForm.model || ""} onChange={e => setMForm(p => ({ ...p, model: e.target.value }))} placeholder="Örn: AK160_DSC" />
            <Warn>{!(mForm.model || "").trim() ? "Model adı girilmedi" : ""}</Warn>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Soğutma">
              <Select value={mForm.sogutma || "Soğutmalı"} onChange={e => setMForm(p => ({ ...p, sogutma: e.target.value }))}>
                <option>Soğutmalı</option>
                <option>Soğutmasız</option>
              </Select>
            </Field>
            <Field label="Günlük Kapasite"><Input value={mForm.kapasite || ""} onChange={e => setMForm(p => ({ ...p, kapasite: e.target.value }))} placeholder="Örn: 2000 kg/gün" /></Field>
          </div>
          <Field label="Kalıp Çapı"><Input value={mForm.kalip || ""} onChange={e => setMForm(p => ({ ...p, kalip: e.target.value }))} placeholder="Örn: 14 cm" /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModelModal(null)}>İptal</Btn>
            <Btn onClick={saveModel}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

const KalipManager = ({ kalipDefs, setKalipDefs, showToast = () => {} }) => {
  const [form, setForm] = useState({ ad: "", olcu: "" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const add = () => {
    bumpId(kalipDefs);
    const yeniId = uid();
    const ad = form.ad.trim();
    setKalipDefs(p => p.some(k => k.id === yeniId) ? p : [...p, { id: yeniId, ad }]);
    setForm({ ad: "", olcu: "" });
    showToast("Kalıp modeli kaydedildi.");
  };
  const saveEdit = () => {
    setKalipDefs(p => p.map(k => k.id === editId ? { ...k, ad: editForm.ad } : k));
    setEditId(null);
    showToast("Kalıp modeli düzenlendi.");
  };
  const [confirmDelKalip, setConfirmDelKalip] = useState(null); // silinecek kalıp {id, ad}

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 250px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>Kalıp Adı</div>
          <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Adana Köfte" />
          <Warn>{!form.ad.trim() ? "Kalıp adı girilmedi" : ""}</Warn>
        </div>
        <Btn onClick={add}><Icon name="plus" size={14} /> Ekle</Btn>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {kalipDefs.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Henüz kalıp tanımı yok.</div>}
        {kalipDefs.map(k => (
          <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
            {editId === k.id ? (
              <div style={{ display: "flex", gap: 8, flex: 1, marginRight: 10 }}>
                <Input value={editForm.ad} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} />
              </div>
            ) : (
              <div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              {editId === k.id ? (
                <>
                  <Btn small onClick={saveEdit}><Icon name="check" size={12} /></Btn>
                  <Btn small variant="ghost" onClick={() => setEditId(null)}>İptal</Btn>
                </>
              ) : (
                <>
                  <Btn small variant="ghost" onClick={() => { setEditId(k.id); setEditForm({ ad: k.ad }); }}><Icon name="edit" size={12} /></Btn>
                  <Btn small variant="danger" onClick={() => setConfirmDelKalip(k)}><Icon name="trash" size={12} /></Btn>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirmDelKalip && (
        <ConfirmDialog
          message={`"${confirmDelKalip.ad}" kalıbı silinecek. Bu işlem geri alınamaz.`}
          onConfirm={() => { setKalipDefs(p => p.filter(k => k.id !== confirmDelKalip.id)); setConfirmDelKalip(null); showToast("Kalıp modeli silindi."); }}
          onCancel={() => setConfirmDelKalip(null)}
        />
      )}
    </div>
  );
};

const PartManager = ({ parts = [], setParts, showToast = () => {} }) => {
  const [form, setForm] = useState({ ad: "" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  const add = () => {
    const yeniId = Date.now();
    const ad = form.ad.trim();
    setParts(p => p.some(x => x.id === yeniId) ? p : [...p, { id: yeniId, ad }]);
    setForm({ ad: "" });
    showToast("Yedek parça tanımı kaydedildi.");
  };
  const saveEdit = () => {
    setParts(p => p.map(x => x.id === editId ? { ...x, ad: editForm.ad } : x));
    setEditId(null);
    showToast("Yedek parça düzenlendi.");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 250px" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 4 }}>Yedek Parça Adı</div>
          <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
          <Warn>{!form.ad.trim() ? "Yedek parça adı girilmedi" : ""}</Warn>
        </div>
        <Btn onClick={add}><Icon name="plus" size={14} /> Ekle</Btn>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        {parts.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Henüz yedek parça tanımı yok.</div>}
        {parts.map(k => (
          <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
            {editId === k.id ? (
              <div style={{ display: "flex", gap: 8, flex: 1, marginRight: 10 }}>
                <Input value={editForm.ad} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} />
              </div>
            ) : (
              <div><span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span></div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              {editId === k.id ? (
                <>
                  <Btn small onClick={saveEdit}><Icon name="check" size={12} /></Btn>
                  <Btn small variant="ghost" onClick={() => setEditId(null)}>İptal</Btn>
                </>
              ) : (
                <>
                  <Btn small variant="ghost" onClick={() => { setEditId(k.id); setEditForm({ ad: k.ad }); }}><Icon name="edit" size={12} /></Btn>
                  <Btn small variant="danger" onClick={() => setConfirmDel(k)}><Icon name="trash" size={12} /></Btn>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirmDel && (
        <ConfirmDialog
          message={`"${confirmDel.ad}" yedek parça tanımı silinecek. Daha önce verilmiş kayıtlar geçmişte kalır.`}
          onConfirm={() => { setParts(p => p.filter(x => x.id !== confirmDel.id)); setConfirmDel(null); showToast("Yedek parça tanımı silindi."); }}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
};

const PART_CATEGORIES = ["Yedek Parça", "Aksesuar", "Kalıp"];

const Parts = ({ parts = [], partSales = [], setPartSales, customers = [], setCustomers, kalipDefs = [], showToast = () => {} }) => {
  const [form, setForm] = useState(null); // satış formu
  const [custSearch, setCustSearch] = useState(""); // müşteri arama
  const [confirmDel, setConfirmDel] = useState(null); // silinecek kayıt

  const kategoriRenk = (k) => k === "Kalıp" ? { bg: "#fff7ed", fg: "#c2410c", bd: "#fed7aa" }
    : { bg: "#f0fdf4", fg: "#15803d", bd: "#bbf7d0" };
  const custMakine = (id) => { const c = customers.find(x => x.id === id); return c ? `${c.name}${c.model ? " · " + c.model : ""}${c.serialNo ? " · " + c.serialNo : ""}` : "—"; };
  const fmtTRlocal = (d) => { if (!d) return "—"; const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString("tr-TR"); };
  const [listSearch, setListSearch] = useState(""); // verilen parçalarda arama
  const [payFilter, setPayFilter] = useState(false); // sadece ödenmemiş parça borçları
  // Borçlu mu: ücretli (ücretsiz değil) + açıkça ödenmedi (eski kayıtlarda odendi yoksa ödendi sayılır)
  const borcluMu = (s) => !s.ucretsizMi && s.odendi === false;
  const odenmemisCount = partSales.filter(borcluMu).length;
  const lq = listSearch.trim().toLocaleLowerCase("tr");
  const sortedSales = [...partSales]
    .filter(s => {
      if (payFilter && !borcluMu(s)) return false;
      if (!lq) return true;
      const cust = customers.find(c => c.id === s.customerId);
      return (s.ad || "").toLocaleLowerCase("tr").includes(lq)
        || (s.tur || "").toLocaleLowerCase("tr").includes(lq)
        || (cust?.name || "").toLocaleLowerCase("tr").includes(lq)
        || (cust?.model || "").toLocaleLowerCase("tr").includes(lq)
        || (cust?.serialNo || "").toLocaleLowerCase("tr").includes(lq);
    })
    .sort((a, b) => (b.tarih || "").localeCompare(a.tarih || ""));

  // Seçilen müşteri/makine ve garanti durumu
  const selectedCust = form ? customers.find(c => c.id === Number(form.customerId)) : null;
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        trLower(c.name).includes(trLower(custSearch)) ||
        trLower(c.model).includes(trLower(custSearch)) ||
        trLower(c.serialNo).includes(trLower(custSearch))
      ).slice(0, 6)
    : [];
  const warrantyAktif = selectedCust?.warrantyEnd && selectedCust.warrantyEnd >= today();
  const isKalip = form?.tur === "Kalıp";
  // Garanti içi yedek parçada "garanti kapsamı dışı (ücretli)" işareti
  const garantiDisiUcretli = !!form?.garantiDisi;
  // Ücret kuralı: Kalıp her zaman ücretli; yedek parça garanti içiyse ücretsiz — ama "garanti dışı" işaretliyse ücretli
  const ucretsizMi = form ? (isKalip ? false : (warrantyAktif && !garantiDisiUcretli)) : false;

  const openForm = () => { setForm({ customerId: "", tur: "Yedek Parça", partAd: "", kalipModel: "", olcu: "", fiyat: "", currency: "TRY", tarih: today(), garantiDisi: false, odendi: false }); setCustSearch(""); };
  // Mevcut bir satış/çıkış kaydını düzenlemek için formu doldur
  const openEdit = (s) => {
    setForm({
      id: s.id, customerId: s.customerId, tur: s.tur,
      partAd: s.tur === "Yedek Parça" ? (s.ad || "") : "",
      kalipModel: s.tur === "Kalıp" ? (s.ad || "") : "",
      olcu: s.olcu || "", tarih: s.tarih || today(),
      currency: s.currency || "TRY", fiyat: s.ucret || "",
      garantiDisi: !!s.garantiDisiIslem, odendi: !!s.odendi,
    });
    setCustSearch("");
  };

  const save = () => {
    if (!selectedCust || !setPartSales) return;
    const isK = form.tur === "Kalıp";
    const ad = isK ? form.kalipModel : form.partAd;
    if (!ad) return;
    // Garanti içi yedek parça + "garanti dışı" işaretli → ücretli; aksi halde garanti durumuna göre
    const garantiDisi = !isK && warrantyAktif && !!form.garantiDisi;
    const ucretsiz = isK ? false : (warrantyAktif && !form.garantiDisi);
    const fields = {
      customerId: selectedCust.id, tur: form.tur, ad,
      olcu: isK ? (form.olcu || "") : "", tarih: form.tarih || today(),
      currency: form.currency || "TRY", ucret: ucretsiz ? 0 : parseMoney(form.fiyat), ucretsizMi: ucretsiz,
      garantiDisiIslem: garantiDisi, // garanti içi olmasına rağmen ücretli verildi (kullanıcı hatası vb.)
      odendi: ucretsiz ? true : !!form.odendi, // ücretsizse borç yok; ücretliyse form değeri
    };
    if (form.id) {
      setPartSales(p => p.map(x => x.id === form.id ? { ...x, ...fields } : x));
      showToast("Kayıt güncellendi.");
    } else {
      const nid = Date.now();
      setPartSales(p => p.some(x => x.id === nid) ? p : [...p, { id: nid, ...fields }]);
      // Kalıpsa müşterinin kalıp listesine ekle (ad + ölçü)
      if (isK && setCustomers) {
        setCustomers(p => p.map(c => c.id === selectedCust.id
          ? { ...c, kaliplar: [...(c.kaliplar || []), { ad: form.kalipModel, olcu: form.olcu || "" }], kalipSayisi: (c.kaliplar || []).length + 1 }
          : c));
      }
      showToast(ucretsiz ? "Yedek parça verildi (garanti kapsamında, ücretsiz)." : `${isK ? "Kalıp" : "Yedek parça"} verildi (ücretli).`);
    }
    setForm(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Yedek Parça</h2>
        <Btn onClick={openForm}><Icon name="parts" size={15} /> Yedek Parça Satışı / Çıkışı</Btn>
      </div>

      {partSales.length > 0 && (
        <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="🔍 Müşteri, parça veya seri no ile ara..."
          style={{ width: "100%", maxWidth: 420, padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, marginBottom: 14, boxSizing: "border-box", outline: "none" }} />
      )}

      {partSales.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => setPayFilter(false)}
            style={{ padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: !payFilter ? "#e85d1a" : "#e2e8f0", background: !payFilter ? "#e85d1a" : "#fff", color: !payFilter ? "#fff" : "#64748b" }}>
            Tümü ({partSales.length})
          </button>
          <button onClick={() => setPayFilter(true)}
            style={{ padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: payFilter ? "#dc2626" : "#e2e8f0", background: payFilter ? "#dc2626" : "#fff", color: payFilter ? "#fff" : "#64748b" }}>
            💰 Ödenmemiş Parça Borcu ({odenmemisCount})
          </button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden" }}>
        {sortedSales.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{lq ? "Eşleşen kayıt yok" : "Henüz parça satışı veya çıkışı yok"}</div>
            <div style={{ fontSize: 13 }}>{lq ? "Farklı bir arama deneyin." : "Yedek Parça Satışı / Çıkışı butonuyla başlayın."}</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Tarih", "Müşteri / Makina", "Tür", "Parça / Kalıp", "Ücret", ""].map(h => (
                  <th key={h || "actions"} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSales.map(s => {
                const r = kategoriRenk(s.tur);
                return (
                  <tr key={s.id}>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#475569" }}>{fmtTRlocal(s.tarih)}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{custMakine(s.customerId)}</td>
                    <td style={{ padding: "13px 16px" }}><span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: r.bg, color: r.fg, border: `1px solid ${r.bd}` }}>{s.tur}</span></td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#0f172a" }}>{s.ad}{s.olcu ? ` (${s.olcu})` : ""}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700 }}>
                      {s.ucretsizMi
                        ? <span style={{ color: "#15803d" }}>Garanti kapsamında</span>
                        : <span style={{ color: "#dc2626" }}>
                            {fmtCur(s.ucret, s.currency)}
                            {s.garantiDisiIslem && <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#92400e" }}>garanti dışı işlem</span>}
                            <span style={{ display: "block", marginTop: 3 }}>
                              {s.odendi === false
                                ? <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 5, padding: "1px 6px" }}>Ödenmedi</span>
                                : <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 5, padding: "1px 6px" }}>Ödendi</span>}
                            </span>
                          </span>}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn small variant="ghost" onClick={() => openEdit(s)}><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="danger" onClick={() => setConfirmDel(s)}><Icon name="trash" size={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          message={`"${confirmDel.ad}" kaydı (${custMakine(confirmDel.customerId)}) kalıcı olarak silinecek.`}
          onConfirm={() => { setPartSales(p => p.filter(x => x.id !== confirmDel.id)); setConfirmDel(null); showToast("Kayıt silindi."); }}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {/* Satış/çıkış formu */}
      {form && (
        <Modal title={form.id ? "Kaydı Düzenle" : "Yedek Parça Satışı / Çıkışı"} onClose={() => setForm(null)}>
          <Field label="Müşteri / Makina">
            {selectedCust ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "#fff7ed" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{selectedCust.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {selectedCust.model || "Model yok"} {selectedCust.serialNo ? `· S/N: ${selectedCust.serialNo}` : ""}
                  </div>
                </div>
                <button onClick={() => { setForm(p => ({ ...p, customerId: "" })); setCustSearch(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={14} /></span>
                  <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                    placeholder="Firma adı, model veya seri no ile ara..."
                    style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box", outline: "none" }} />
                </div>
                {custSearch.trim() && (
                  <div style={{ marginTop: 6, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                    {matchedCustomers.map(c => (
                      <div key={c.id}
                        onClick={() => { setForm(p => ({ ...p, customerId: c.id })); setCustSearch(""); }}
                        style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#fff" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {c.model ? c.model : "Model yok"} {c.serialNo ? `· ${c.serialNo}` : ""}
                        </div>
                      </div>
                    ))}
                    {matchedCustomers.length === 0 && (
                      <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>Müşteri bulunamadı.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Field>

          {selectedCust && (
            <div style={{ fontSize: 13, marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: warrantyAktif ? "#f0fdf4" : "#fef2f2", color: warrantyAktif ? "#15803d" : "#dc2626", fontWeight: 700, border: `1px solid ${warrantyAktif ? "#bbf7d0" : "#fecaca"}` }}>
              Garanti durumu: {warrantyAktif ? "Garanti İçi (yedek parça ücretsiz)" : "Garanti Dışı (yedek parça ücretli)"}
            </div>
          )}

          <Field label="Tür">
            <Select value={form.tur} onChange={e => setForm(p => ({ ...p, tur: e.target.value, partAd: "", kalipModel: "", olcu: "" }))}>
              <option value="Yedek Parça">Yedek Parça</option>
              <option value="Kalıp">Kalıp</option>
            </Select>
          </Field>

          {form.tur === "Yedek Parça" ? (
            <Field label="Yedek Parça">
              <Select value={form.partAd || ""} onChange={e => setForm(p => ({ ...p, partAd: e.target.value }))}>
                <option value="">Seçin...</option>
                {parts.map(p => <option key={p.id} value={p.ad}>{p.ad}</option>)}
              </Select>
              {parts.length === 0 && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5 }}>Tanımlı yedek parça yok. Ayarlar → Tanımlar → Yedek Parça'dan ekleyin.</div>}
            </Field>
          ) : (
            <>
              <Field label="Kalıp Modeli">
                <Select value={form.kalipModel || ""} onChange={e => setForm(p => ({ ...p, kalipModel: e.target.value }))}>
                  <option value="">Seçin...</option>
                  {kalipDefs.map(k => <option key={k.id} value={k.ad}>{k.ad}</option>)}
                </Select>
                {kalipDefs.length === 0 && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5 }}>Tanımlı kalıp yok. Ayarlar → Tanımlar → Kalıp Modelleri'nden ekleyin.</div>}
              </Field>
              <Field label="Kalıp Ölçüsü"><Input value={form.olcu || ""} onChange={e => setForm(p => ({ ...p, olcu: e.target.value }))} placeholder="örn: 55x125 mm" /></Field>
            </>
          )}

          <Field label="Veriliş Tarihi"><Input type="date" value={form.tarih || today()} onChange={e => setForm(p => ({ ...p, tarih: e.target.value }))} /></Field>

          {/* Garanti içi yedek parçada: kullanıcı hatası vb. için ücretlendirme seçeneği */}
          {!isKalip && warrantyAktif && form.partAd && selectedCust && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
              <input type="checkbox" checked={!!form.garantiDisi} onChange={e => setForm(p => ({ ...p, garantiDisi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#e85d1a" }} />
              <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>Garanti kapsamı dışı (ücretli)</span>
            </label>
          )}

          {/* Fiyat: kalıpta her zaman; yedek parçada garanti dışıysa veya "garanti kapsamı dışı" işaretliyse */}
          {(isKalip || !warrantyAktif || (form.partAd && form.garantiDisi)) && selectedCust && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Para Birimi">
                <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                  <option value="TRY">₺ Türk Lirası</option>
                  <option value="USD">$ Dolar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                </Select>
              </Field>
              <Field label="Fiyat">
                <MoneyInput value={form.fiyat} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, fiyat: v }))} />
                {(form.currency || "TRY") !== "TRY" && (
                  <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
                )}
              </Field>
            </div>
          )}

          {selectedCust && (
            <div style={{ fontSize: 13, fontWeight: 700, borderRadius: 8, padding: "10px 14px", marginTop: 4,
              background: ucretsizMi ? "#f0fdf4" : "#fef2f2", color: ucretsizMi ? "#15803d" : "#dc2626", border: `1px solid ${ucretsizMi ? "#bbf7d0" : "#fecaca"}` }}>
              {ucretsizMi
                ? "✓ Garanti kapsamında, ücretsiz"
                : `Ücretli${isKalip && warrantyAktif ? " (kalıp ek alım olduğu için garanti içinde olsa bile ücretlidir)" : garantiDisiUcretli ? " (garanti kapsamı dışı işlem)" : ""}`}
            </div>
          )}

          {/* Ödeme durumu — sadece ücretli kayıtlarda */}
          {selectedCust && !ucretsizMi && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${form.odendi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
              <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "#15803d" : "#92400e" }}>
                {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
              </span>
            </label>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setForm(null)}>Vazgeç</Btn>
            <Btn onClick={save} disabled={!selectedCust || (form.tur === "Yedek Parça" ? !form.partAd : !form.kalipModel)}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};


const Notes = ({ notes = [], setNotes, showToast = () => {} }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(""); // düzenlenen içerik (kaydet'e kadar geçici)
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null); // silme onayı bekleyen not
  const PER_PAGE = 5;
  const selected = notes.find(n => n.id === selectedId) || null;
  const dirty = selected && draft !== (selected.content || "");

  // Not seçilince taslağı doldur
  const selectNote = (n) => { setSelectedId(n.id); setDraft(n.content || ""); };

  const baslik = (c) => {
    const first = (c || "").split("\n")[0].trim();
    return first || "Yeni Not";
  };
  const onizleme = (c) => {
    const lines = (c || "").split("\n");
    const rest = lines.slice(1).join(" ").trim();
    return rest || "Ek metin yok";
  };
  const fmtZaman = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("tr-TR") + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  };

  // En son düzenlenen üstte
  const sorted = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const q = search.trim().toLocaleLowerCase("tr");
  const filtered = q ? sorted.filter(n => (n.content || "").toLocaleLowerCase("tr").includes(q)) : sorted;
  // Sayfalama (5'er)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const yeniNot = () => {
    const nid = Date.now();
    const yeni = { id: nid, content: "", updatedAt: nid };
    setNotes(p => [yeni, ...p]);
    setSelectedId(nid);
    setDraft("");
    setPage(1); // yeni not en üstte, ilk sayfaya dön
  };
  const kaydet = () => {
    if (!selected) return;
    setNotes(p => p.map(n => n.id === selected.id ? { ...n, content: draft, updatedAt: Date.now() } : n));
    setSelectedId(null); // kaydedince editör kapanır, "Not seçilmedi" ekranına döner
    setDraft("");
    showToast("Not kaydedildi.");
  };
  const sil = (id) => {
    setNotes(p => p.filter(n => n.id !== id));
    if (selectedId === id) { setSelectedId(null); setDraft(""); }
    setConfirmDelete(null);
    showToast("Not silindi.");
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Notlar</h2>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* SOL: not listesi */}
        <div style={{ width: 280, flexShrink: 0, minWidth: 240 }}>
          <button onClick={yeniNot} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", background: "#e85d1a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="edit" size={15} /> Yeni Not
          </button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Notlarda ara..."
            style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, marginBottom: 10, boxSizing: "border-box", outline: "none" }} />
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                {q ? "Eşleşen not yok." : "Henüz not yok. 'Yeni Not' ile başlayın."}
              </div>
            ) : paged.map(n => {
              const active = n.id === selectedId;
              return (
                <div key={n.id} onClick={() => selectNote(n)}
                  style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: active ? "#fff7ed" : "#fff", borderLeft: active ? "3px solid #e85d1a" : "3px solid transparent", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{baslik(n.content)}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{onizleme(n.content)}</div>
                    <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 3 }}>{fmtZaman(n.updatedAt)}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(n); }} title="Notu sil"
                    style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                </div>
              );
            })}
          </div>
          {/* Sayfalama — 5'ten fazla not varsa */}
          {filtered.length > PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 10 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: safePage <= 1 ? "#f8fafc" : "#fff", color: safePage <= 1 ? "#cbd5e1" : "#475569", cursor: safePage <= 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>‹ Önceki</button>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{safePage} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: safePage >= totalPages ? "#f8fafc" : "#fff", color: safePage >= totalPages ? "#cbd5e1" : "#475569", cursor: safePage >= totalPages ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>Sonraki ›</button>
            </div>
          )}
        </div>

        {/* SAĞ: editör */}
        <div style={{ flex: 1, minWidth: 320 }}>
          {selected ? (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Son düzenleme: {fmtZaman(selected.updatedAt)}</span>
                <button onClick={kaydet} disabled={!dirty}
                  style={{ padding: "8px 18px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700, cursor: dirty ? "pointer" : "not-allowed", background: dirty ? "#16a34a" : "#e2e8f0", color: dirty ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="check" size={14} /> {dirty ? "Kaydet" : "Kaydedildi"}
                </button>
              </div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                placeholder="Notunuzu yazın... (ilk satır başlık olur)"
                style={{ width: "100%", minHeight: 360, border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", fontSize: 14, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit", color: "#0f172a" }} />
              {dirty && <div style={{ fontSize: 11, color: "#d97706", marginTop: 6, fontWeight: 600 }}>⚠ Kaydedilmemiş değişiklikler var</div>}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "#475569" }}>Not seçilmedi</div>
              <div style={{ fontSize: 13 }}>Soldan bir not seçin veya "Yeni Not" oluşturun.</div>
            </div>
          )}
        </div>
      </div>

      {/* Silme onayı */}
      {confirmDelete && (
        <Modal title="Notu Sil" onClose={() => setConfirmDelete(null)}>
          <div style={{ fontSize: 14, color: "#475569", marginBottom: 8, lineHeight: 1.6 }}>
            <b style={{ color: "#0f172a" }}>"{baslik(confirmDelete.content)}"</b> notunu silmek istediğinize emin misiniz?
          </div>
          <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, marginBottom: 20 }}>
            ⚠ Bu işlem geri alınamaz.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={() => sil(confirmDelete.id)}><Icon name="trash" size={14} /> Evet, Sil</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Settings = ({ customers, services, dealers, stock, setStock, setCustomers, setServices, setDealers, version, appSettings, setAppSettings, customModels, setCustomModels, standardModels, setStandardModels, factory, setFactory, kalipDefs, setKalipDefs, notes = [], setNotes = null, parts = [], setParts = null, partSales = [], setPartSales = null, showToast = () => {} }) => {
  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };
  const [msg, setMsg] = useState(null);
  const [restoreData, setRestoreData] = useState(null); // onay bekleyen yedek

  // ── Excel'e aktarma (CSV) ──
  const downloadCSV = (rows, filename) => {
    const csv = "\uFEFF" + rows.map(r => r.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  };
  const exportFinance = () => {
    const real = customers.filter(c => !c.isResale);
    const cur = (x) => (CURRENCIES.includes(x) ? x : "TRY");
    const e3 = () => ({ TRY: 0, USD: 0, EUR: 0 });
    const rate = appSettings?.kdvRate ?? DEFAULT_KDV_RATE;
    const gercekCiro = e3(), faturaliTutar = e3(), kdv = e3(), komisyon = e3(), extra = e3(), alacak = e3(), servisUc = e3();
    real.forEach(c => {
      const k = cur(c.currency);
      const tip = normalizeSaleType(c.faturali);
      gercekCiro[k] += parseMoney(c.fabrikaSatisBedeli) || parseMoney(c.faturaBedeli);
      if (isFaturali(tip)) faturaliTutar[k] += parseMoney(c.faturaBedeli);
      kdv[k] += calcKDV(tip, c.faturaBedeli, rate);
      komisyon[k] += parseMoney(c.komisyon);
      extra[k] += parseMoney(c.extraKalipFiyati);
      alacak[k] += parseMoney(c.kalanBorc);
    });
    services.filter(s => s.type === "Garanti Dışı" || s.type === "Periyodik Bakım").forEach(s => {
      const k = cur(s.currency);
      servisUc[k] += parseMoney(s.servisUcreti);
      if (k === "TRY") kdv[k] += extractKDV(s.servisUcreti, rate);
    });
    const net = e3();
    CURRENCIES.forEach(k => { net[k] = gercekCiro[k] + extra[k] + servisUc[k] - komisyon[k]; });
    const kalipAdet = real.reduce((t, c) => t + (Array.isArray(c.kaliplar) ? c.kaliplar.length : (parseInt(c.kalipSayisi, 10) || 0)), 0);
    // Satış tipi kırılımı
    const tipAdet = { "Faturalı Yurt İçi": 0, "Faturalı İhracat": 0, "Faturasız": 0 };
    real.forEach(c => { const t = normalizeSaleType(c.faturali); if (tipAdet[t] != null) tipAdet[t]++; });
    const line = (label, obj) => [label, obj.TRY, obj.USD, obj.EUR];
    const rows = [
      ["FİNANS ÖZETİ", new Date().toLocaleDateString("tr-TR"), "", ""],
      [],
      ["Toplam Satılan Makina", real.length],
      ["Toplam Satılan Kalıp", kalipAdet],
      ["Faturalı Yurt İçi", tipAdet["Faturalı Yurt İçi"]],
      ["Faturalı İhracat", tipAdet["Faturalı İhracat"]],
      ["Faturasız", tipAdet["Faturasız"]],
      ["Garanti Dışı Servis Sayısı", services.filter(s => s.type === "Garanti Dışı").length],
      [],
      ["TUTARLAR", "₺ (TL)", "$ (USD)", "€ (EUR)"],
      line("Gerçek Ciro (fiili satış)", gercekCiro),
      line("Faturalı Tutar (resmi)", faturaliTutar),
      line(`Toplam KDV (%${rate})`, kdv),
      line("Toplam Extra Kalıp Satışı", extra),
      line("Toplam Servis Ücreti", servisUc),
      line("Toplam Ödenen Komisyon", komisyon),
      line("NET GENEL TOPLAM", net),
      line("Kalan Alacak / Tahsil Edilecek", alacak),
    ];
    downloadCSV(rows, "finans-ozeti.csv");
    flash("ok", "Finans özeti Excel (CSV) olarak indirildi.");
  };
  const exportCustomers = () => {
    const head = ["Firma", "Telefon", "E-posta", "Ülke", "Şehir", "Adres", "Model", "Makina Kalıp Çapı", "Seri No", "Kalıplar", "Satış Tarihi", "Garanti Bitiş", "Satış Yapan", "Satış Tipi", "Para Birimi", "Gerçek Satış Bedeli", "Fatura Bedeli", "KDV", "Komisyon", "Extra Kalıp", "Kalan Borç", "2. El mi?", "Yetkili1 Ad", "Yetkili1 Telefon", "Yetkili2 Ad", "Yetkili2 Telefon"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const rate = appSettings?.kdvRate ?? DEFAULT_KDV_RATE;
    const rows = [head, ...customers.map(c => [
      c.name, c.phone, c.email, c.country, c.city, c.adres, c.model, fmtKalipCapi(c.kalipCapi), c.serialNo,
      (c.kaliplar || []).map(k => `${k.ad}${k.olcu ? " (" + k.olcu + ")" : ""}`).join(", "),
      c.installDate, c.warrantyEnd, c.satisYapan, normalizeSaleType(c.faturali),
      curName[CURRENCIES.includes(c.currency) ? c.currency : "TRY"],
      parseMoney(c.fabrikaSatisBedeli), parseMoney(c.faturaBedeli), calcKDV(c.faturali, c.faturaBedeli, rate),
      parseMoney(c.komisyon), parseMoney(c.extraKalipFiyati), parseMoney(c.kalanBorc),
      c.isResale ? "Evet" : "Hayır",
      c.yetkili1Ad, c.yetkili1Tel, c.yetkili2Ad, c.yetkili2Tel,
    ])];
    downloadCSV(rows, "musteriler.csv");
    flash("ok", "Müşteri listesi Excel (CSV) olarak indirildi.");
  };
  const exportServices = () => {
    const head = ["Müşteri", "Model", "Seri No", "Servis Türü", "Onarım Yeri", "Tarih", "Teknisyen", "Para Birimi", "Servis Ücreti", "Yapılan İşler", "Müşteri Talimatı"];
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const rows = [head, ...services.map(s => {
      const c = customers.find(x => x.id === s.customerId) || {};
      return [c.name, c.model, c.serialNo, s.type, s.repairPlace, s.date, s.tech,
        curName[CURRENCIES.includes(s.currency) ? s.currency : "TRY"], parseMoney(s.servisUcreti), s.yapilanIsler, s.musteriTalimati];
    })];
    downloadCSV(rows, "servis-kayitlari.csv");
    flash("ok", "Servis kayıtları Excel (CSV) olarak indirildi.");
  };

  // ── İÇE AKTARMA (Excel'den CSV) ──
  // Şablon sütun başlıkları (müşteri bu sıraya uyarlar). Servis için 3 çift tarih/iş.
  const IMPORT_HEADERS = [
    "Kalıp Sayısı", "Satış Yapan", "Satın Alan Firma", "Telefon", "Adres", "Ülke", "Şehir",
    "Model", "Makina Kalıp Çapı (en x boy x yükseklik)", "Para Birimi (TL/USD/EUR)", "Satış Tipi (Yurt İçi/İhracat/Faturasız)", "Aldığı Kalıplar", "Satış Tarihi / Garanti Başlangıç (gg.aa.yyyy)", "Garanti Bitiş (gg.aa.yyyy)", "Gerçek Satış Bedeli", "Fatura Bedeli",
    "Komisyon", "Extra Kalıp Fiyatı", "Kalan Borç", "Seri Numarası", "Açıklama",
    "Servis1 Tarih", "Servis1 Yapılan İş", "Servis2 Tarih", "Servis2 Yapılan İş", "Servis3 Tarih", "Servis3 Yapılan İş",
    "Yetkili1 Ad", "Yetkili1 Telefon", "Yetkili2 Ad", "Yetkili2 Telefon",
  ];
  // Tüm kayıtları İÇE AKTARMA ŞABLONU formatında tek Excel'de dışa aktar (geri yüklenebilir)
  const exportAllTemplate = () => {
    const curName = { TRY: "TL", USD: "USD", EUR: "EUR" };
    const fmtD = (iso) => { if (!iso) return ""; const p = String(iso).split("-"); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : ""; };
    const rows = [IMPORT_HEADERS];
    customers.forEach(c => {
      // Bu müşterinin servisleri (tarihe göre), ilk 3'ü şablona sığar
      const svc = services.filter(s => s.customerId === c.id)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        .slice(0, 3);
      const svcCells = [];
      for (let i = 0; i < 3; i++) {
        svcCells.push(svc[i] ? fmtD(svc[i].date) : "");
        svcCells.push(svc[i] ? (svc[i].yapilanIsler || "") : "");
      }
      rows.push([
        kalipCount(c) || c.kalipSayisi || "",
        c.satisYapan || "",
        c.name || "",
        c.phone || "",
        c.adres || "",
        c.country || "",
        c.city || "",
        c.model || "",
        fmtKalipCapi(c.kalipCapi),
        curName[CURRENCIES.includes(c.currency) ? c.currency : "TRY"],
        normalizeSaleType(c.faturali),
        (c.kaliplar || []).map(k => k.ad).filter(Boolean).join("; "),
        fmtD(c.installDate),
        fmtD(c.warrantyEnd),
        parseMoney(c.fabrikaSatisBedeli) || "",
        parseMoney(c.faturaBedeli) || "",
        parseMoney(c.komisyon) || "",
        parseMoney(c.extraKalipFiyati) || "",
        parseMoney(c.kalanBorc) || "",
        c.serialNo || "",
        c.aciklama || "",
        ...svcCells,
        c.yetkili1Ad || "", c.yetkili1Tel || "", c.yetkili2Ad || "", c.yetkili2Tel || "",
      ]);
    });
    try {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tüm Kayıtlar");
      XLSX.writeFile(wb, "tum-kayitlar.xlsx");
      flash("ok", `${customers.length} müşteri kaydı şablon formatında indirildi (geri yüklenebilir).`);
    } catch {
      downloadCSV(rows, "tum-kayitlar.csv");
      flash("ok", "Tüm kayıtlar (CSV) indirildi.");
    }
  };

  const downloadTemplate = () => {
    const ornek = ["2", "Altuntaş Makina", "Örnek Gıda A.Ş.", "0532 000 00 00", "Atatürk Cad. No:1", "Türkiye", "İstanbul",
      "AK140_DSC", "50 x 80 x 115", "TL", "Faturalı Yurt İçi", "Hamburger; Adana Köfte", "15.04.2024", "15.04.2026", "850000", "650000", "0", "25000", "0", "AK140-2026-001", "Örnek kayıt",
      "10.01.2025", "Periyodik bakım yapıldı", "05.06.2025", "Bıçak değişti", "", "",
      "Ahmet Yılmaz", "0532 111 11 11", "", ""];
    try {
      const ws = XLSX.utils.aoa_to_sheet([IMPORT_HEADERS, ornek]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Müşteriler");
      XLSX.writeFile(wb, "ice-aktarma-sablonu.xlsx");
      flash("ok", "Excel şablonu indirildi. Doldurup geri yükleyin.");
    } catch {
      downloadCSV([IMPORT_HEADERS, ornek], "ice-aktarma-sablonu.csv");
      flash("ok", "Şablon (CSV) indirildi.");
    }
  };

  // CSV ayrıştırıcı (tırnak içi ; ve satır sonu destekli, ayraç ; veya ,)
  const parseCSV = (text) => {
    text = text.replace(/^\uFEFF/, "");
    const delim = (text.split("\n")[0].split(";").length >= text.split("\n")[0].split(",").length) ? ";" : ",";
    const rows = []; let row = []; let cur = ""; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delim) { row.push(cur); cur = ""; }
        else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
        else if (ch === "\r") { /* yoksay */ }
        else cur += ch;
      }
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ""));
  };

  const [importPreview, setImportPreview] = useState(null); // { customers:[], services:[], errors:[] }
  const trDate = (s) => {
    if (s == null || s === "") return "";
    // Date nesnesi (cellDates ile gelebilir) — UTC metotlarıyla oku (timezone kayması önle)
    if (s instanceof Date && !isNaN(s)) {
      return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, "0")}-${String(s.getUTCDate()).padStart(2, "0")}`;
    }
    s = String(s).trim();
    if (!s) return "";
    // Saat/zaman ekini at: "15.04.2024 00:00:00" veya "2024-04-15T00:00:00"
    s = s.split("T")[0].split(" ")[0].trim();
    // gg.aa.yyyy / gg/aa/yyyy / gg-aa-yyyy (tek hane de olur)
    let m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
    if (m) {
      let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      let yil = m[3];
      if (yil.length === 2) yil = (parseInt(yil, 10) > 50 ? "19" : "20") + yil; // 2 haneli yıl
      // Akıllı gün/ay tespiti: normalde gg.aa (Türkçe). Ama ilk sayı ≤12 ve ikinci >12 ise
      // Amerikan formatı (aa/gg) gelmiş demektir → yer değiştir.
      let gun = a, ay = b;
      if (a <= 12 && b > 12) { gun = b; ay = a; }
      return `${yil}-${String(ay).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
    }
    // yyyy-aa-gg / yyyy.aa.gg / yyyy/aa/gg
    m = s.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    // Excel seri numarası (örn. 45397 = 15.04.2024). 1900 tarih sistemi.
    if (/^\d{4,6}$/.test(s)) {
      const serial = parseInt(s, 10);
      if (serial > 0 && serial < 100000) {
        const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
        if (!isNaN(d)) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      }
    }
    return "";
  };
  const moneyNum = (s) => {
    if (s == null) return 0;
    let t = String(s).replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(/,/g, ".");
    const n = parseFloat(t); return isNaN(n) ? 0 : n;
  };

  // Satır dizisini (hücre dizileri) müşteri+servis kayıtlarına çevirir
  const rowsToRecords = (rows) => {
    const dataRows = rows.slice(1); // başlık atla
    const newCustomers = []; const newServices = []; const errors = [];
    let guncellenecek = 0; // mevcut kayıtların güncellenme sayısı
    let idc = Date.now();
    // Mevcut müşterileri eşleştirme için indeksle: seri no (öncelik) veya firma+model
    const bySerial = new Map();
    const byNameModel = new Map();
    (customers || []).forEach(c => {
      if (c.serialNo) bySerial.set(trLower(c.serialNo), c);
      byNameModel.set(trLower(c.name) + "|" + trLower(c.model || ""), c);
    });
    dataRows.forEach((r, idx) => {
      const cell = (i) => (r[i] == null ? "" : String(r[i]).trim());
      const name = cell(2);
      if (!name) { errors.push(`Satır ${idx + 2}: Satın Alan Firma boş, atlandı.`); return; }
      // Makina Kalıp Çapı (index 8): "50 x 80 x 115" → {en, boy, yukseklik}
      const capRaw = cell(8);
      let kalipCapi = undefined;
      if (capRaw) {
        const parts = capRaw.split(/[x×*]/i).map(p => p.trim());
        kalipCapi = { en: parts[0] || "", boy: parts[1] || "", yukseklik: parts[2] || "" };
      }
      // Para birimi (index 9): TL/TRY → TRY, USD/$ → USD, EUR/€ → EUR
      const curRaw = trLower(cell(9));
      let currency = "TRY";
      if (curRaw.includes("usd") || curRaw.includes("dolar") || curRaw.includes("$")) currency = "USD";
      else if (curRaw.includes("eur") || curRaw.includes("euro") || curRaw.includes("€")) currency = "EUR";
      // Satış tipi (index 10): metin → normalize. Boşsa fatura bedeline göre tahmin et.
      const tipRaw = cell(10);
      let satisTipi = tipRaw ? normalizeSaleType(tipRaw) : null;
      const kaliplarRaw = cell(11).split(/[;,]/).map(x => x.trim()).filter(Boolean);
      const kaliplar = kaliplarRaw.map(ad => ({ ad, olcu: "" }));
      const installDate = trDate(r[12]);
      const warrantyEnd = trDate(r[13]);
      const gercekBedel = moneyNum(cell(14));
      const faturaBedeli = moneyNum(cell(15));
      const serialNo = cell(19);
      // Satış tipi boşsa: fatura varsa Yurt İçi, yoksa Faturasız (geriye uyumlu tahmin)
      if (!satisTipi) satisTipi = faturaBedeli > 0 ? "Faturalı Yurt İçi" : "Faturasız";
      // Mevcut kayıtla eşleştir: önce seri no, sonra firma+model
      let mevcut = null;
      if (serialNo && bySerial.has(trLower(serialNo))) mevcut = bySerial.get(trLower(serialNo));
      else if (byNameModel.has(trLower(name) + "|" + trLower(cell(7)))) mevcut = byNameModel.get(trLower(name) + "|" + trLower(cell(7)));
      const cid = mevcut ? mevcut.id : (++idc); // mevcutsa ID'sini koru (güncelle), değilse yeni
      if (mevcut) guncellenecek++;
      newCustomers.push({
        id: cid,
        kalipSayisi: parseInt(cell(0), 10) || kaliplar.length || 1,
        satisYapan: cell(1) || "Altuntaş Makina",
        name, phone: cell(3), email: mevcut?.email || "",
        adres: cell(4), country: cell(5) || "Türkiye", city: cell(6),
        model: cell(7), currency, kaliplar,
        ...(kalipCapi ? { kalipCapi } : {}),
        installDate, warrantyEnd,
        faturali: satisTipi,
        faturaBedeli, fabrikaSatisBedeli: gercekBedel || faturaBedeli,
        komisyon: moneyNum(cell(16)), extraKalipFiyati: moneyNum(cell(17)), kalanBorc: moneyNum(cell(18)),
        serialNo, aciklama: cell(20),
        yetkili1Ad: cell(27) || mevcut?.yetkili1Ad || "", yetkili1Tel: cell(28) || mevcut?.yetkili1Tel || "",
        yetkili2Ad: cell(29) || mevcut?.yetkili2Ad || "", yetkili2Tel: cell(30) || mevcut?.yetkili2Tel || "",
        // Seri no boşsa "bekliyor" işareti (sonradan girilmesi için hatırlatma)
        ...(serialNo ? { seriNoBekliyor: false } : { seriNoBekliyor: true }),
        ...(mevcut?.isResale ? { isResale: mevcut.isResale, prevOwners: mevcut.prevOwners } : {}),
        _mevcut: !!mevcut, // güncelleme mi, yeni mi
      });
      [[21, 22], [23, 24], [25, 26]].forEach(([dt, isk]) => {
        const d = trDate(r[dt]); const isi = cell(isk);
        if (d || isi) {
          newServices.push({
            id: ++idc, customerId: cid, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım",
            yapilanIsler: isi, musteriTalimati: "", servisUcreti: 0, date: d || "", tech: "", currency: "TRY",
            _mevcutMusteri: !!mevcut,
          });
        }
      });
    });
    return { customers: newCustomers, services: newServices, errors, guncellenecek };
  };

  const handleImportFile = (file) => {
    const name = (file.name || "").toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let rows;
        if (isExcel) {
          // SheetJS ile Excel oku
          const data = new Uint8Array(e.target.result);
          // Tarihleri METİN olarak oku (cellDates timezone kaymasına yol açıyordu)
          const wb = XLSX.read(data, { type: "array", cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", dateNF: "dd.mm.yyyy" });
        } else {
          rows = parseCSV(e.target.result);
        }
        rows = rows.filter(r => Array.isArray(r) && r.some(x => String(x).trim() !== ""));
        if (rows.length < 2) { flash("err", "Dosyada veri bulunamadı."); return; }
        const result = rowsToRecords(rows);
        setImportPreview(result);
      } catch (err) {
        flash("err", "Dosya okunamadı: " + err.message);
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, "UTF-8");
  };

  const applyImport = () => {
    if (!importPreview) return;
    if (window.__importApplying) return;
    window.__importApplying = true;
    const impCustomers = importPreview.customers;
    const impServices = importPreview.services;
    bumpId(impCustomers, impServices);
    // Mevcut kayıtları GÜNCELLE, yenileri EKLE (seri no/firma eşleşmesine göre)
    setCustomers(p => {
      const guncelMap = new Map();
      impCustomers.forEach(c => { const { _mevcut, ...clean } = c; guncelMap.set(c.id, clean); });
      // Önce mevcutları güncelle
      const guncellenmis = p.map(c => guncelMap.has(c.id) ? { ...c, ...guncelMap.get(c.id) } : c);
      // Sonra yeni olanları (mevcut listede id'si olmayan) başa ekle
      const mevcutIds = new Set(p.map(c => c.id));
      const yeniler = impCustomers.filter(c => !mevcutIds.has(c.id)).map(c => { const { _mevcut, ...clean } = c; return clean; });
      return [...yeniler, ...guncellenmis];
    });
    if (impServices.length && setServices) {
      // Yalnızca YENİ müşterilerin servislerini ekle (mevcut müşterininkiler zaten var, çiftlenmesin)
      setServices(p => {
        const mevcutIds = new Set(p.map(s => s.id));
        const yeni = impServices
          .filter(s => !s._mevcutMusteri && !mevcutIds.has(s.id))
          .map(s => { const { _mevcutMusteri, ...clean } = s; return clean; });
        return [...yeni, ...p];
      });
    }
    const yeniSayi = impCustomers.filter(c => !c._mevcut).length;
    const guncelSayi = importPreview.guncellenecek || 0;
    flash("ok", `${yeniSayi} yeni müşteri eklendi, ${guncelSayi} mevcut müşteri güncellendi.`);
    setImportPreview(null);
    setTimeout(() => { window.__importApplying = false; }, 800);
  };


  // ── Uygulama güncellemesi (electron-updater) ──
  // idle | checking | uptodate | available | downloading | downloaded | error | devmode
  const [appUpd, setAppUpd] = useState({ state: "idle", latest: null, progress: 0, error: null });

  useEffect(() => {
    if (!window.appUpdater) return;
    const offA = window.appUpdater.onAvailable((v) => setAppUpd(p => ({ ...p, state: "available", latest: v })));
    const offP = window.appUpdater.onProgress((pct) => setAppUpd(p => ({ ...p, state: "downloading", progress: pct })));
    const offD = window.appUpdater.onDownloaded(() => setAppUpd(p => ({ ...p, state: "downloaded" })));
    const offE = window.appUpdater.onError((m) => setAppUpd(p => ({ ...p, state: "error", error: m })));
    return () => {
      if (typeof offA === "function") offA();
      if (typeof offP === "function") offP();
      if (typeof offD === "function") offD();
      if (typeof offE === "function") offE();
    };
  }, []);

  const [askInstall, setAskInstall] = useState(false); // "yüklensin mi?" onay penceresi
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  const checkAppUpdate = async () => {
    if (!window.appUpdater) { setAppUpd({ state: "devmode", latest: null, progress: 0, error: null }); return; }
    setAppUpd({ state: "checking", latest: null, progress: 0, error: null });
    const res = await window.appUpdater.check();
    if (res?.error === "dev-mode") setAppUpd(p => ({ ...p, state: "devmode" }));
    else if (res?.error) setAppUpd(p => ({ ...p, state: "error", error: res.error }));
    else if (res?.available) {
      setAppUpd(p => ({ ...p, state: "available", latest: res.latest }));
      setAskInstall(true); // güncelleme bulundu → kullanıcıya sor
    }
    else setAppUpd(p => ({ ...p, state: "uptodate" }));
  };

  const startUpdate = async () => {
    setAskInstall(false);
    setAppUpd(p => ({ ...p, state: "downloading", progress: 0 }));
    await window.appUpdater.download();
    // indirme bitince onDownloaded tetiklenir → otomatik kurulum + yeniden başlatma
  };

  // İndirme tamamlanınca OTOMATİK kur ve yeniden başlat
  useEffect(() => {
    if (appUpd.state === "downloaded" && window.appUpdater) {
      const t = setTimeout(() => window.appUpdater.install(), 1500);
      return () => clearTimeout(t);
    }
  }, [appUpd.state]);

  const doUninstall = async () => {
    setConfirmUninstall(false);
    if (window.appControl?.uninstall) {
      const ok = await window.appControl.uninstall();
      if (!ok) flash("err", "Kaldırma aracı bulunamadı. Denetim Masası'ndaki Programlar bölümünden kaldırabilirsiniz.");
    } else {
      flash("err", "Bu özellik yalnızca kurulu uygulamada çalışır.");
    }
  };

  // ── Yedek Al ──
  const doBackup = async () => {
    const data = { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version, exportDate: today(), customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, notes, parts, partSales };
    try {
      if (window.crmStorage?.backup) {
        const ok = await window.crmStorage.backup(data);
        if (ok) flash("ok", "Yedek başarıyla kaydedildi.");
      } else {
        // Tarayıcı modu: dosya olarak indir
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `altunmak-crm-yedek-${today()}.json`;
        a.click();
        flash("ok", "Yedek dosyası indirildi.");
      }
    } catch (err) {
      flash("err", "Yedek alınamadı: " + err.message);
    }
  };

  // ── Yedek Yükle ──
  const doRestore = async () => {
    try {
      if (window.crmStorage?.restore) {
        const data = await window.crmStorage.restore();
        if (!data) return;
        if (!looksLikeBackup(data)) { flash("err", "Seçilen dosya geçerli bir Altunmak CRM yedeği değil."); return; }
        setRestoreData(data);
      } else {
        // Tarayıcı modu: dosya seçici
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            let parsed;
            try { parsed = JSON.parse(reader.result); }
            catch { flash("err", "Dosya okunamadı — geçerli bir yedek değil."); return; }
            if (!looksLikeBackup(parsed)) { flash("err", "Seçilen dosya geçerli bir Altunmak CRM yedeği değil."); return; }
            setRestoreData(parsed);
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err) {
      flash("err", "Yedek yüklenemedi: " + err.message);
    }
  };

  const applyRestore = () => {
    if (Array.isArray(restoreData?.customers)) setCustomers(restoreData.customers);
    if (Array.isArray(restoreData?.services)) setServices(restoreData.services);
    if (Array.isArray(restoreData?.dealers)) setDealers(restoreData.dealers);
    if (Array.isArray(restoreData?.stock) && setStock) setStock(restoreData.stock);
    if (Array.isArray(restoreData?.kalipDefs) && setKalipDefs) setKalipDefs(restoreData.kalipDefs);
    if (Array.isArray(restoreData?.customModels)) setCustomModels(restoreData.customModels);
    if (Array.isArray(restoreData?.standardModels)) setStandardModels(restoreData.standardModels);
    if (restoreData?.factory) setFactory(restoreData.factory);
    if (Array.isArray(restoreData?.notes) && setNotes) setNotes(restoreData.notes);
    if (Array.isArray(restoreData?.parts) && setParts) setParts(restoreData.parts);
    if (Array.isArray(restoreData?.partSales) && setPartSales) setPartSales(restoreData.partSales);
    setRestoreData(null);
    flash("ok", "Yedek başarıyla yüklendi. Veriler geri getirildi.");
  };

  const Section = ({ title, icon, children }) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 20, maxWidth: 720 }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#e85d1a" }}><Icon name={icon} size={18} /></span>{title}
      </div>
      {children}
    </div>
  );

  const [settingsTab, setSettingsTab] = useState("app"); // "app" | "models"

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Ayarlar</h2>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* SOL DİKEY MENÜ — gruplu */}
        <div style={{ width: 220, flexShrink: 0, minWidth: 200 }}>
          {[
            { grup: "Genel", items: [{ id: "app", label: "Uygulama", icon: "settings" }] },
            { grup: "Veri Yönetimi", items: [{ id: "export", label: "Dışa Aktar", icon: "download" }, { id: "import", label: "İçe Aktar", icon: "box" }] },
            { grup: "Tanımlar", items: [{ id: "models", label: "Makina Modelleri", icon: "machine" }, { id: "kaliplar", label: "Kalıp Modelleri", icon: "box" }, { id: "yedekparca", label: "Yedek Parça", icon: "parts" }, { id: "kdv", label: "KDV Oranı", icon: "settings" }] },
          ].map(g => (
            <div key={g.grup} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 8, paddingLeft: 6 }}>{g.grup}</div>
              {g.items.map(st => {
                const active = settingsTab === st.id;
                return (
                  <button key={st.id} onClick={() => setSettingsTab(st.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                      padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      border: "none", marginBottom: 4,
                      background: active ? "#e85d1a" : "transparent",
                      color: active ? "#fff" : "#475569",
                      boxShadow: active ? "0 2px 8px rgba(232,93,26,.3)" : "none",
                      transition: "background .15s",
                    }}>
                    <Icon name={st.icon} size={16} />
                    {st.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* SAĞ İÇERİK */}
        <div style={{ flex: 1, minWidth: 320, maxWidth: 760 }}>
      {msg && (
        <div style={{ maxWidth: 720, marginBottom: 16, padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: msg.type === "ok" ? "#d1fae5" : "#fee2e2", color: msg.type === "ok" ? "#065f46" : "#991b1b" }}>
          {msg.text}
        </div>
      )}

      {settingsTab === "app" && (<>
      {/* ── Uygulama Güncellemesi ── */}
      <Section title="Uygulama Güncellemesi" icon="refresh">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Kurulu sürüm: <b style={{ color: "#0f172a" }}>v{version}</b>. Yeni bir sürüm yayınlandığında buradan
          tek tıkla indirip kurabilirsiniz. Verileriniz korunur.
        </div>

        {appUpd.state === "idle" && (
          <Btn onClick={checkAppUpdate}><Icon name="refresh" size={15} /> Yeni Sürüm Denetle</Btn>
        )}
        {appUpd.state === "checking" && (
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Denetleniyor...</div>
        )}
        {appUpd.state === "uptodate" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "6px 14px", borderRadius: 10 }}>✓ Uygulama güncel</span>
            <Btn small variant="ghost" onClick={checkAppUpdate}><Icon name="refresh" size={12} /> Tekrar Denetle</Btn>
          </div>
        )}
        {appUpd.state === "available" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "6px 14px", borderRadius: 10 }}>
              Yeni sürüm hazır: v{appUpd.latest}
            </span>
            <Btn onClick={() => setAskInstall(true)}><Icon name="download" size={15} /> Yükle</Btn>
          </div>
        )}
        {appUpd.state === "downloading" && (
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>İndiriliyor... %{appUpd.progress}</div>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: 8, width: `${appUpd.progress}%`, background: "#e85d1a", borderRadius: 6, transition: "width .3s" }} />
            </div>
          </div>
        )}
        {appUpd.state === "downloaded" && (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "6px 14px", borderRadius: 10 }}>
            ✓ İndirildi — uygulama yeniden başlatılıyor...
          </span>
        )}
        {appUpd.state === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", background: "#fee2e2", padding: "6px 14px", borderRadius: 10 }}>
              Denetlenemedi: {appUpd.error}
            </span>
            <Btn small variant="ghost" onClick={checkAppUpdate}><Icon name="refresh" size={12} /> Tekrar Dene</Btn>
          </div>
        )}
        {appUpd.state === "devmode" && (
          <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
            Bu özellik yalnızca kurulu (Setup ile yüklenmiş) uygulamada çalışır — geliştirme modunda ve tarayıcıda devre dışıdır.
          </div>
        )}
      </Section>

      {/* ── Yedekleme ── */}
      <Section title="Yedekleme" icon="download">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Tüm müşteri ve servis kayıtlarınızı tek bir dosya olarak kaydedin. Yedek dosyasını güvenli bir yerde
          (USB bellek, bulut depolama) saklamanızı öneririz. Geri yükleme yaptığınızda mevcut veriler yedekteki verilerle değiştirilir.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={doBackup}><Icon name="download" size={15} /> Yedek Al</Btn>
          <Btn variant="ghost" onClick={doRestore}><Icon name="upload" size={15} /> Yedekten Geri Yükle</Btn>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 14 }}>
          Mevcut veri: {customers.length} müşteri · {dealers.length} bayi · {services.length} servis kaydı
        </div>

        {/* ── Otomatik Yedekleme ── */}
        <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" checked={appSettings.autoBackup}
              onChange={e => setAppSettings(p => ({ ...p, autoBackup: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: "#e85d1a", cursor: "pointer" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Otomatik Yedekleme</span>
          </label>

          {appSettings.autoBackup && (
            <div style={{ paddingLeft: 28 }}>
              {!window.crmStorage?.chooseFolder ? (
                <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
                  Otomatik yedekleme yalnızca kurulu uygulamada çalışır.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <Btn small variant="ghost" onClick={async () => {
                      const folder = await window.crmStorage.chooseFolder();
                      if (folder) setAppSettings(p => ({ ...p, backupFolder: folder }));
                    }}>📁 Klasör Seç</Btn>
                    <span style={{ fontSize: 12, color: appSettings.backupFolder ? "#0f172a" : "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {appSettings.backupFolder || "Henüz klasör seçilmedi"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Sıklık:</span>
                    <select value={appSettings.frequency}
                      onChange={e => setAppSettings(p => ({ ...p, frequency: e.target.value }))}
                      style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }}>
                      <option value="daily">Her gün</option>
                      <option value="weekly">Her hafta</option>
                      <option value="monthly">Her ay</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {appSettings.lastBackup
                      ? `Son otomatik yedek: ${appSettings.lastBackup}`
                      : "Henüz otomatik yedek alınmadı — klasör seçildiğinde ilk yedek hemen alınır."}
                    {" "}Yedekler uygulama açılışında, vakti geldiyse otomatik yazılır.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ── Uygulamayı Kaldır ── */}
      {/* ── Tehlikeli Bölge ── */}
      <div style={{ marginTop: 28, border: "1.5px solid #fecaca", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: "#fef2f2", padding: "12px 18px", borderBottom: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="trash" size={16} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#b91c1c" }}>DİKKAT</span>
        </div>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>Uygulamayı Kaldır</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Uygulamayı bilgisayarınızdan kaldırır. <b>Müşteri ve servis verileriniz silinmez.</b> Uygulamayı
            tekrar kurarsanız kayıtlarınız geri gelir. Kaldırmadan önce yedek almanız önerilir.
          </div>
          <Btn variant="danger" onClick={() => setConfirmUninstall(true)}><Icon name="trash" size={15} /> Uygulamayı Kaldır</Btn>
        </div>
      </div>
      </>)}

      {settingsTab === "models" && (
        <Section title="Makina Modelleri" icon="machine">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Buradaki modeller, Yeni Müşteri ve Makina Geçmişi ekranlarındaki model seçiminde görünür.
            Standart modeller düzenlenebilir ama silinemez; özel modeller hem düzenlenip hem silinebilir.
          </div>
          <ModelsManager showToast={showToast} standardModels={standardModels} setStandardModels={setStandardModels}
            customModels={customModels} setCustomModels={setCustomModels} />
        </Section>
      )}

      {settingsTab === "kaliplar" && (
        <Section title="Kalıp Modelleri" icon="box">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Buraya eklediğiniz kalıplar, Yeni Müşteri ekranındaki <b>Kalıp</b> seçiminde listelenir. Ölçü, müşteri eklerken elle girilir.
          </div>
          <KalipManager kalipDefs={kalipDefs} setKalipDefs={setKalipDefs} showToast={showToast} />
        </Section>
      )}

      {settingsTab === "yedekparca" && (
        <Section title="Yedek Parça Tanımları" icon="parts">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Sattığınız yedek parçaları buraya tanımlayın. Bunlar <b>Yedek Parça</b> bölümünde satış/çıkış yaparken listelenir. Fiyat ve para birimi satış sırasında girilir. Kalıplar buraya eklenmez; onlar <b>Kalıp Modelleri</b>'nden gelir.
          </div>
          <PartManager parts={parts} setParts={setParts} showToast={showToast} />
        </Section>
      )}

      {settingsTab === "kdv" && (
        <Section title="KDV Oranı" icon="settings">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Faturalı yurt içi satışlarda uygulanan KDV oranı. Değiştirirseniz finans raporundaki KDV hesabı bu orana göre güncellenir.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 120 }}>
              <input type="number" min="0" max="100" step="1"
                value={appSettings.kdvRate ?? DEFAULT_KDV_RATE}
                onChange={e => setAppSettings(s => ({ ...s, kdvRate: e.target.value === "" ? "" : Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
                style={{ padding: "9px 32px 9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 15, fontWeight: 700, background: "#f8fafc", outline: "none" }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 700 }}>%</span>
            </div>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Varsayılan: %{DEFAULT_KDV_RATE}</span>
          </div>
        </Section>
      )}

      {settingsTab === "export" && (
        <Section title="Dışa Aktar (Excel / CSV)" icon="download">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.6 }}>
            Verilerinizi Excel'de açılabilen dosya olarak indirin. Türkçe karakterler korunur; dosyayı Excel'de çift tıklayarak açabilirsiniz.
          </div>

          {/* Tümünü indir — içe aktarma şablonu formatında (geri yüklenebilir) */}
          <div style={{ background: "linear-gradient(135deg, #e85d1a, #f59e0b)", borderRadius: 12, padding: "20px 22px", marginBottom: 18, color: "#fff" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Tüm Kayıtları İndir (Şablon Formatı)</div>
            <div style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.5, opacity: .95 }}>
              Tüm müşteriler ve servis geçmişleri tek Excel dosyasında, <b>içe aktarma şablonuyla aynı sütun düzeninde</b>. Bu dosyayı düzenleyip tekrar İçe Aktar'dan yükleyebilirsiniz. ({customers.length} müşteri)
            </div>
            <button onClick={exportAllTemplate}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#fff", color: "#e85d1a", border: "none" }}>
              <Icon name="download" size={14} /> Tümünü İndir
            </button>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Ayrı Raporlar</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>Finans Özeti</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>Toplam satış, komisyon, servis geliri, net toplam ve kalan alacak.</div>
              <Btn onClick={exportFinance}><Icon name="download" size={14} /> Finans Özetini İndir</Btn>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>Müşteri Listesi</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>Tüm müşteriler, makina ve fatura bilgileriyle ({customers.length} kayıt).</div>
              <Btn onClick={exportCustomers}><Icon name="download" size={14} /> Müşterileri İndir</Btn>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>Servis Kayıtları</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>Tüm servis talepleri ({services.length} kayıt).</div>
              <Btn onClick={exportServices}><Icon name="download" size={14} /> Servisleri İndir</Btn>
            </div>
          </div>
        </Section>
      )}

      {settingsTab === "import" && (
        <Section title="İçe Aktar (Excel / CSV)" icon="box">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Eski müşteri verilerinizi toplu olarak içe aktarın. <b>1)</b> Excel şablonunu indirin. <b>2)</b> Verilerinizi şablondaki sütun sırasına göre doldurun (Excel'de kaydedin, .xlsx olarak kalabilir). <b>3)</b> Aşağıdan yükleyin, önizlemeyi kontrol edip onaylayın. Hem Excel (.xlsx, .xls) hem CSV dosyaları desteklenir.
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <Btn variant="ghost" onClick={downloadTemplate}><Icon name="download" size={14} /> Boş Excel Şablonu İndir</Btn>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "#e85d1a", color: "#fff" }}>
              <Icon name="plus" size={14} /> Excel / CSV Yükle
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={e => { if (e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = ""; }} />
            </label>
          </div>

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
            <b>Şablon sütunları:</b> Kalıp Sayısı · Satış Yapan · Satın Alan Firma · Telefon · Adres · Ülke · Şehir · Model · <b>Makina Kalıp Çapı (en x boy x yükseklik)</b> · <b>Para Birimi (TL/USD/EUR)</b> · <b>Satış Tipi (Yurt İçi/İhracat/Faturasız)</b> · Aldığı Kalıplar (noktalı virgülle ayırın) · <b>Satış Tarihi / Garanti Başlangıç</b> · Garanti Bitiş · <b>Gerçek Satış Bedeli</b> · Fatura Bedeli · Komisyon · Extra Kalıp Fiyatı · Kalan Borç · Seri No · Açıklama · Servis1 Tarih · Servis1 İş · Servis2... · Servis3...
          </div>
        </Section>
      )}
        </div>{/* /sağ içerik */}
      </div>{/* /flex kapsayıcı */}

      {importPreview && (
        <Modal wide title="İçe Aktarma Önizlemesi" onClose={() => setImportPreview(null)}>
          <div style={{ fontSize: 14, marginBottom: 16 }}>
            Toplam <b>{importPreview.customers.length}</b> kayıt bulundu:
            <b style={{ color: "#16a34a" }}> {importPreview.customers.filter(c => !c._mevcut).length} yeni</b> eklenecek,
            <b style={{ color: "#0891b2" }}> {importPreview.guncellenecek || 0} mevcut</b> güncellenecek.
            {importPreview.errors.length > 0 && <span style={{ color: "#dc2626" }}> · {importPreview.errors.length} satır atlandı.</span>}
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              Not: Aynı seri numarasına (veya firma+model) sahip kayıtlar yeni eklenmez, mevcut kayıt güncellenir. Böylece çift kayıt olmaz.
            </div>
          </div>
          {importPreview.errors.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#991b1b", maxHeight: 100, overflowY: "auto" }}>
              {importPreview.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>İlk 5 kayıt önizlemesi:</div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Firma", "Model", "Seri No", "Garanti", "Fatura"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {importPreview.customers.slice(0, 5).map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: "8px 12px" }}>{c.model || "—"}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{c.serialNo || "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{c.warrantyEnd ? fmtTR(c.warrantyEnd) : "—"}</td>
                    <td style={{ padding: "8px 12px" }}>{c.faturaBedeli ? fmt(c.faturaBedeli) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
            Not: İçe aktarılan kayıtlar mevcut listeye <b>eklenir</b> (mevcut veriler silinmez). Tarihler gg.aa.yyyy formatında olmalıdır.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setImportPreview(null)}>İptal</Btn>
            <Btn onClick={applyImport}><Icon name="check" size={14} /> İçe Aktar ({importPreview.customers.length} kayıt)</Btn>
          </div>
        </Modal>
      )}

      {/* Güncelleme onayı */}
      {askInstall && (
        <Modal title="Güncelleme Bulundu" onClose={() => setAskInstall(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>
            Yeni sürüm <b>v{appUpd.latest}</b> yayınlandı (kurulu: v{version}).
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            Şimdi yüklensin mi? Güncelleme indirildikten sonra uygulama <b>otomatik olarak yeniden başlatılacak</b>.
            Verileriniz korunur.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setAskInstall(false)}>Daha Sonra</Btn>
            <Btn onClick={startUpdate}><Icon name="download" size={14} /> Evet, Yükle</Btn>
          </div>
        </Modal>
      )}

      {/* Kaldırma onayı */}
      {confirmUninstall && (
        <Modal title="Uygulamayı Kaldır" onClose={() => setConfirmUninstall(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>
            Altunmak CRM bilgisayarınızdan kaldırılacak ve uygulama kapanacak.
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            Verileriniz silinmez; tekrar kurulumda geri gelir. Devam etmeden önce
            yukarıdan <b>yedek almanız</b> önerilir.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmUninstall(false)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={doUninstall}><Icon name="trash" size={14} /> Evet, Kaldır</Btn>
          </div>
        </Modal>
      )}

      {/* Geri yükleme onayı */}
      {restoreData && (
        <Modal title="Yedeği Geri Yükle" onClose={() => setRestoreData(null)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 8 }}>
            Yüklenecek yedek: <b>{Array.isArray(restoreData.customers) ? restoreData.customers.length : 0} müşteri</b>,{" "}
            <b>{Array.isArray(restoreData.dealers) ? restoreData.dealers.length : 0} bayi</b>, <b>{Array.isArray(restoreData.services) ? restoreData.services.length : 0} servis kaydı</b>
            {restoreData.exportDate ? ` (${restoreData.exportDate} tarihli)` : ""}.
          </div>
          {restoreData.schemaVersion > BACKUP_SCHEMA_VERSION && (
            <div style={{ fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 8 }}>
              ⚠ Bu yedek, bu programın daha yeni bir sürümüyle alınmış. Bazı veriler düzgün yüklenmeyebilir.
            </div>
          )}
          <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, marginBottom: 20 }}>
            ⚠ Mevcut tüm veriler bu yedekteki verilerle değiştirilecek. Bu işlem geri alınamaz.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setRestoreData(null)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={applyRestore}><Icon name="check" size={14} /> Evet, Geri Yükle</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// STOK (Stokta bekleyen makinalar)
// ════════════════════════════════════════════════════════════════
const Stock = ({ stock, setStock, models = ALTUNMAK_MODELS, showToast = () => {} }) => {
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState(null); // tıklanan model kartı
  const [modal, setModal] = useState(null); // null | "add" | {edit}
  const [form, setForm] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const q = trLower(search);
  const filtered = stock.filter(s => {
    if (modelFilter && s.model !== modelFilter) return false;
    return trLower(s.model).includes(q) || trLower(s.serialNo).includes(q) || trLower(s.note).includes(q);
  });
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Modele göre grupla (özet kartlar)
  const byModel = {};
  stock.forEach(s => { byModel[s.model] = (byModel[s.model] || 0) + 1; });

  const openAdd  = () => { setForm({ model: "", serialNo: "", addedDate: today(), note: "" }); setModal("add"); };
  const openEdit = s => { setForm({ ...s }); setModal({ edit: s }); };
  const save = () => {
    if (modal === "add") { bumpId(stock); const nid = uid(); setStock(p => p.some(s => s.id === nid) ? p : [{ ...form, id: nid }, ...p]); showToast("Stok makinası kaydedildi."); }
    else { setStock(p => p.map(s => s.id === form.id ? form : s)); showToast("Stok makinası düzenlendi."); }
    setModal(null);
  };
  const confirmDel = () => { setStock(p => p.filter(s => s.id !== confirmId)); setConfirmId(null); showToast("Stok makinası silindi."); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Stok</h2>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Stoğa Makina Ekle</Btn>
      </div>

      {/* Model bazlı özet */}
      {Object.keys(byModel).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
          {Object.entries(byModel).map(([m, n]) => {
            const active = modelFilter === m;
            return (
              <div key={m} onClick={() => { setModelFilter(active ? null : m); setPage(1); }}
                style={{ background: active ? "#fff7ed" : "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderLeft: `4px solid ${active ? "#c2410c" : "#e85d1a"}`, cursor: "pointer", transition: "all .15s" }}
                title="Bu modeldeki makinaları göster">
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{m}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#e85d1a" }}>{n} <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>adet</span></div>
              </div>
            );
          })}
        </div>
      )}

      {modelFilter && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Filtre:</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 8, padding: "5px 12px" }}>
            {modelFilter}
            <button onClick={() => setModelFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c2410c", padding: 0, display: "flex" }}><Icon name="close" size={12} /></button>
          </span>
        </div>
      )}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Model veya seri no ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Model", "Seri Numarası", "Stoğa Giriş", "Not", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "13px 16px" }}><span style={{ fontSize: 12, background: "#fff7ed", color: "#c2410c", borderRadius: 6, padding: "3px 10px", fontWeight: 700 }}>{s.model}</span></td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: s.serialNo ? "#0f172a" : "#94a3b8", fontFamily: s.serialNo ? "monospace" : "inherit", fontWeight: 600 }}>{s.serialNo || "(seri no atanmamış)"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "#64748b" }}>{fmtTR(s.addedDate)}</td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748b", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note || "—"}</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={() => openEdit(s)}><Icon name="edit" size={12} /></Btn>
                    <Btn small variant="danger" onClick={() => setConfirmId(s.id)}><Icon name="trash" size={12} /></Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{stock.length === 0 ? "Stokta makina yok." : "Aramanıza uyan makina yok."}</div>}
        <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      </div>

      {confirmId && (
        <ConfirmDialog
          message={`"${stock.find(s => s.id === confirmId)?.serialNo || ""}" seri numaralı makina stoktan silinecek.`}
          onConfirm={confirmDel}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {modal && (
        <Modal title={modal === "add" ? "Stoğa Makina Ekle" : "Stok Kaydını Düzenle"} onClose={() => setModal(null)}>
          <Field label="Makina Modeli">
            <Select value={form.model || ""} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}>
              <option value="">Model seçin...</option>
              {models.map(m => <option key={m.model} value={m.model}>{m.model}</option>)}
            </Select>
            <Warn>{!form.model ? "Model seçilmedi" : ""}</Warn>
          </Field>
          <Field label="Seri Numarası (opsiyonel)"><Input value={form.serialNo || ""} onChange={e => setForm(p => ({ ...p, serialNo: e.target.value }))} placeholder="Boş bırakılabilir — sonra atanır" /></Field>
          <Field label="Stoğa Giriş Tarihi"><Input type="date" value={form.addedDate || ""} onChange={e => setForm(p => ({ ...p, addedDate: e.target.value }))} /></Field>
          <Field label="Not">
            <textarea value={form.note || ""} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              placeholder="İsteğe bağlı not..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>İptal</Btn>
            <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// APP SHELL
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// FİNANS
// ════════════════════════════════════════════════════════════════
const Finance = ({ customers, services, dealers = [], kdvRate = DEFAULT_KDV_RATE }) => {
  const [range, setRange] = useState("all"); // all | thisMonth | thisYear | lastYear | custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Tarih aralığı sınırlarını hesapla
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const inRange = (iso) => {
    if (!iso) return range === "all";
    const d = new Date(iso);
    if (isNaN(d)) return range === "all";
    if (range === "all") return true;
    if (range === "thisMonth") return d.getFullYear() === y && d.getMonth() === m;
    if (range === "thisYear") return d.getFullYear() === y;
    if (range === "lastYear") return d.getFullYear() === y - 1;
    if (range === "custom") {
      if (customStart && iso < customStart) return false;
      if (customEnd && iso > customEnd) return false;
      return true;
    }
    return true;
  };

  // Satışları tarihe göre filtrele (installDate baz alınır)
  const sales = customers.filter(c => !c.isResale && inRange(c.installDate));
  const svcInRange = services.filter(s => inRange(s.date));

  // ── ADETLER ──
  const totalMakina = sales.length;
  const totalKalip = sales.reduce((sum, c) => sum + kalipCount(c), 0);
  const garantiDisiCount = svcInRange.filter(s => s.type === "Garanti Dışı").length;

  // ── PARA (TUTAR) — para birimi başına ayrı topla ──
  const empty3 = () => ({ TRY: 0, USD: 0, EUR: 0 });
  const cur = (x) => (CURRENCIES.includes(x) ? x : "TRY"); // eski kayıtlar TRY
  const gercekCiro = empty3();   // gerçek satış bedelleri (fiili ciro)
  const faturaliTutar = empty3(); // resmi fatura tutarları
  const toplamKDV = empty3();     // hesaplanan KDV
  const komisyon = empty3(), extraKalip = empty3(), kalanAlacak = empty3();
  sales.forEach(c => {
    const k = cur(c.currency);
    const tip = normalizeSaleType(c.faturali);
    const gercek = parseMoney(c.fabrikaSatisBedeli) || parseMoney(c.faturaBedeli); // gerçek bedel yoksa faturaya düş
    const fatura = parseMoney(c.faturaBedeli);
    gercekCiro[k] += gercek;
    if (isFaturali(tip)) faturaliTutar[k] += fatura;
    toplamKDV[k] += calcKDV(tip, fatura, kdvRate);
    komisyon[k] += parseMoney(c.komisyon);
    extraKalip[k] += parseMoney(c.extraKalipFiyati);
    kalanAlacak[k] += parseMoney(c.kalanBorc);
  });
  const servisUcreti = empty3();
  svcInRange.filter(s => s.type === "Garanti Dışı" || s.type === "Periyodik Bakım").forEach(s => {
    const k = cur(s.currency);
    servisUcreti[k] += parseMoney(s.servisUcreti);
    // TL servis ücreti KDV dahil → içindeki KDV'yi ayrıştırıp Toplam KDV'ye ekle (yurt dışı=KDV yok)
    if (k === "TRY") toplamKDV[k] += extractKDV(s.servisUcreti, kdvRate);
  });

  // Net = gerçek ciro + extra + servis − komisyon (her döviz ayrı)
  const netGenel = empty3();
  CURRENCIES.forEach(k => {
    netGenel[k] = gercekCiro[k] + extraKalip[k] + servisUcreti[k] - komisyon[k];
  });
  // Geriye uyumluluk için eski değişken adları (aşağıdaki JSX kullanıyor olabilir)
  const faturali = faturaliTutar, faturasiz = empty3();

  // Yaklaşık TL karşılığı (Dashboard'daki kur API'si ile)
  const [rates, setRates] = useState(null); // { USD: x, EUR: y } → 1 birim kaç TL
  useEffect(() => {
    let cancelled = false;
    const fetchRates = async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const j = await r.json();
        if (cancelled || !j?.rates?.TRY) return;
        const usdTry = j.rates.TRY;
        const eurTry = j.rates.EUR ? (j.rates.TRY / j.rates.EUR) : null;
        setRates({ USD: usdTry, EUR: eurTry });
      } catch { /* sessiz */ }
    };
    fetchRates();
    const t = setInterval(fetchRates, 60 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  // bir {TRY,USD,EUR} nesnesini TL'ye çevirip topla
  const toTL = (obj) => {
    let sum = obj.TRY || 0;
    if (rates) {
      if (rates.USD) sum += (obj.USD || 0) * rates.USD;
      if (rates.EUR) sum += (obj.EUR || 0) * rates.EUR;
    }
    return sum;
  };
  // Bir tutar nesnesini "₺X · $Y · €Z" formatında, sadece sıfır olmayanları göster
  const showMulti = (obj) => {
    const parts = CURRENCIES.filter(k => (obj[k] || 0) !== 0).map(k => fmtCur(obj[k], k));
    return parts.length ? parts.join("  ·  ") : fmtCur(0, "TRY");
  };
  // Geriye dönük uyumluluk için eski tek-değişkenler (TL toplamı)
  const faturaliToplam = faturali.TRY, faturasizToplam = faturasiz.TRY;
  const komisyonToplam = komisyon.TRY, extraKalipToplam = extraKalip.TRY, kalanAlacakToplam = kalanAlacak.TRY;
  const servisUcretiToplam = servisUcreti.TRY;
  const toplamSatisGeliri = faturaliToplam + faturasizToplam;
  const netGenelToplam = netGenel.TRY;

  // ── MODEL BAZLI KIRILIM (gelir ≈ TL karşılığı) ──
  const byModel = {};
  sales.forEach(c => {
    const k = c.model || "Belirtilmemiş";
    if (!byModel[k]) byModel[k] = { adet: 0, gelir: 0 };
    byModel[k].adet += 1;
    const o = empty3(); o[cur(c.currency)] = parseMoney(c.faturaBedeli);
    byModel[k].gelir += toTL(o);
  });
  const modelRows = Object.entries(byModel).sort((a, b) => b[1].gelir - a[1].gelir);

  // ── SATICI/BAYİ BAZLI KIRILIM (gelir/komisyon ≈ TL karşılığı) ──
  const bySeller = {};
  sales.forEach(c => {
    const k = c.satisYapan || "Belirtilmemiş";
    if (!bySeller[k]) bySeller[k] = { adet: 0, gelir: 0, komisyon: 0 };
    bySeller[k].adet += 1;
    const g = empty3(); g[cur(c.currency)] = parseMoney(c.faturaBedeli);
    const ko = empty3(); ko[cur(c.currency)] = parseMoney(c.komisyon);
    bySeller[k].gelir += toTL(g);
    bySeller[k].komisyon += toTL(ko);
  });
  const sellerRows = Object.entries(bySeller).sort((a, b) => b[1].gelir - a[1].gelir);

  // ── AYLIK TREND (son 12 ay, satış geliri ≈ TL karşılığı) ──
  const monthly = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(y, m - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
    let gelir = 0;
    customers.forEach(c => {
      if (!c.isResale && c.installDate && c.installDate.slice(0, 7) === key) {
        const o = empty3(); o[cur(c.currency)] = parseMoney(c.faturaBedeli);
        gelir += toTL(o);
      }
    });
    monthly.push({ label, gelir });
  }
  const maxMonthly = Math.max(...monthly.map(x => x.gelir), 1);

  const rangeLabels = { all: "Tüm Zamanlar", thisMonth: "Bu Ay", thisYear: "Bu Yıl", lastYear: "Geçen Yıl", custom: "Özel Tarih" };

  // Excel'e aktar (CSV)
  const AdetCard = ({ label, value, color, icon }) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
    </div>
  );
  const ParaCard = ({ label, value, color, sub }) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "#0f172a" }}>{fmt(value)}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
  // Çok-dövizli kart: her dövizi ayrı satır + yaklaşık TL karşılığı
  const MultiCard = ({ label, obj, color, sub }) => {
    const nonzero = CURRENCIES.filter(k => (obj[k] || 0) !== 0);
    const showCur = nonzero.length ? nonzero : ["TRY"];
    const hasFx = nonzero.some(k => k !== "TRY");
    return (
      <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {showCur.map(k => (
          <div key={k} style={{ fontSize: 20, fontWeight: 800, color: color || "#0f172a", lineHeight: 1.25 }}>{fmtCur(obj[k] || 0, k)}</div>
        ))}
        {hasFx && rates && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>≈ {fmt(toTL(obj))} (yaklaşık)</div>
        )}
        {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Finans</h2>
      </div>

      {/* Tarih aralığı filtresi */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        {Object.entries(rangeLabels).map(([k, l]) => (
          <button key={k} onClick={() => setRange(k)}
            style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1px solid", borderColor: range === k ? "#e85d1a" : "#e2e8f0",
              background: range === k ? "#e85d1a" : "#fff", color: range === k ? "#fff" : "#64748b" }}>
            {l}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Başlangıç:</span>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
          <span style={{ fontSize: 13, color: "#64748b" }}>Bitiş:</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
        </div>
      )}
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
        Gösterilen dönem: <b style={{ color: "#e85d1a" }}>{rangeLabels[range]}</b> · {totalMakina} satış kaydı
      </div>

      {/* ADET KARTLARI */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Adetler</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        <AdetCard label="Toplam Satılan Makina" value={totalMakina} color="#e85d1a" />
        <AdetCard label="Toplam Satılan Kalıp" value={totalKalip} color="#3b82f6" />
        <AdetCard label="Garanti Dışı Servis" value={garantiDisiCount} color="#ef4444" />
      </div>

      {/* PARA KARTLARI */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Gelir & Tahsilat</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
        <MultiCard label="Gerçek Ciro" obj={gercekCiro} color="#16a34a" sub="Fiili satış bedelleri" />
        <MultiCard label="Faturalı Tutar" obj={faturaliTutar} color="#0891b2" sub="Resmi faturalar" />
        <MultiCard label={`Toplam KDV (%${kdvRate})`} obj={toplamKDV} color="#7c3aed" sub="Yurt içi faturalı" />
        <MultiCard label="Toplam Extra Kalıp Satışı" obj={extraKalip} color="#db2777" />
        <MultiCard label="Toplam Servis Ücreti" obj={servisUcreti} color="#f59e0b" sub="Garanti dışı servisler" />
        <MultiCard label="Toplam Ödenen Komisyon" obj={komisyon} color="#dc2626" sub="Gider (düşülür)" />
      </div>

      {/* NET GENEL TOPLAM + KALAN ALACAK */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 28 }}>
        <div style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", borderRadius: 14, padding: "22px 26px", color: "#fff" }}>
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>NET GENEL TOPLAM</div>
          {(CURRENCIES.filter(k => (netGenel[k] || 0) !== 0).length ? CURRENCIES.filter(k => (netGenel[k] || 0) !== 0) : ["TRY"]).map(k => (
            <div key={k} style={{ fontSize: 30, fontWeight: 800, color: "#4ade80", lineHeight: 1.2 }}>{fmtCur(netGenel[k] || 0, k)}</div>
          ))}
          {CURRENCIES.some(k => k !== "TRY" && (netGenel[k] || 0) !== 0) && rates && (
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>≈ {fmt(toTL(netGenel))} (yaklaşık TL karşılığı)</div>
          )}
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>Satış + Extra Kalıp + Servis − Komisyon</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #7c2d12, #9a3412)", borderRadius: 14, padding: "22px 26px", color: "#fff" }}>
          <div style={{ fontSize: 13, color: "#fed7aa", fontWeight: 600, marginBottom: 6 }}>KALAN ALACAK</div>
          {(CURRENCIES.filter(k => (kalanAlacak[k] || 0) !== 0).length ? CURRENCIES.filter(k => (kalanAlacak[k] || 0) !== 0) : ["TRY"]).map(k => (
            <div key={k} style={{ fontSize: 24, fontWeight: 800, color: "#fdba74", lineHeight: 1.2 }}>{fmtCur(kalanAlacak[k] || 0, k)}</div>
          ))}
          {CURRENCIES.some(k => k !== "TRY" && (kalanAlacak[k] || 0) !== 0) && rates && (
            <div style={{ fontSize: 11, color: "#fdba74", opacity: .8, marginTop: 6 }}>≈ {fmt(toTL(kalanAlacak))} (yaklaşık)</div>
          )}
          <div style={{ fontSize: 11, color: "#fdba74", opacity: .7, marginTop: 8 }}>Tahsil edilecek tutar</div>
        </div>
      </div>

      {/* AYLIK TREND */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 16 }}>Son 12 Ay Satış Geliri Trendi <span style={{ fontWeight: 400, color: "#94a3b8" }}>(≈ TL karşılığı)</span></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
          {monthly.map((mo, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{mo.gelir > 0 ? Math.round(mo.gelir / 1000) + "k" : ""}</div>
              <div style={{ width: "100%", height: `${(mo.gelir / maxMonthly) * 100}px`, minHeight: mo.gelir > 0 ? 4 : 0, background: "linear-gradient(180deg, #e85d1a, #f59e0b)", borderRadius: "4px 4px 0 0" }} />
              <div style={{ fontSize: 9, color: "#64748b" }}>{mo.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MODEL & BAYİ KIRILIMI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Model Bazlı Satış <span style={{ fontWeight: 400, color: "#94a3b8" }}>(gelir ≈ TL)</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Model", "Adet", "Gelir"].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: h === "Model" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {modelRows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{k}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{v.adet}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", fontWeight: 600, color: "#16a34a" }}>{fmt(v.gelir)}</td>
                </tr>
              ))}
              {modelRows.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Veri yok</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Satış Yapan Bazlı <span style={{ fontWeight: 400, color: "#94a3b8" }}>(≈ TL)</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Satış Yapan", "Adet", "Komisyon"].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: h === "Satış Yapan" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sellerRows.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{k}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{v.adet}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", fontWeight: 600, color: "#dc2626" }}>{fmt(v.komisyon)}</td>
                </tr>
              ))}
              {sellerRows.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Veri yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TABS = [
  { id: "dashboard", label: "Anasayfa",     icon: "dashboard" },
  { id: "customers", label: "Müşteriler",   icon: "customers" },
  { id: "dealers",   label: "Bayiler",      icon: "store"     },
  { id: "machines",  label: "Makina Geçmişi", icon: "machine"   },
  { id: "stock",     label: "Stok",         icon: "box"       },
  { id: "services",  label: "Servis",       icon: "service"   },
  { id: "parts",     label: "Yedek Parça",  icon: "parts"     },
  { id: "finance",   label: "Finans",       icon: "finance"   },
  { id: "notes",     label: "Notlar",       icon: "notes"     },
  { id: "settings",  label: "Ayarlar",      icon: "settings"  },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [custFilter, setCustFilter] = useState("all"); // dashboard'dan filtreyle gelme: all|warranty|warranty-active|debt|serial-pending
  const [appVersion, setAppVersion] = useState(APP_VERSION);
  const [appSettings, setAppSettings] = useState({ autoBackup: false, backupFolder: "", frequency: "weekly", lastBackup: null, kdvRate: DEFAULT_KDV_RATE });
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // ── Global bildirim (toast) ──
  const [toast, setToast] = useState(null); // { type: "ok"|"err", text }
  const showToast = (text, type = "ok") => {
    setToast({ type, text });
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => setToast(null), 3000);
  };

  // Sürümü kurulu uygulamadan oku (package.json'daki version otomatik yansır)
  useEffect(() => {
    if (window.appUpdater?.version) {
      window.appUpdater.version().then(v => { if (v) setAppVersion(v); }).catch(() => {});
    }
  }, []);
  const [customers, setCustomers] = useState(INIT_CUSTOMERS);
  const [dealers,   setDealers]   = useState(INIT_DEALERS);
  const [standardModels, setStandardModels] = useState(ALTUNMAK_MODELS); // düzenlenebilir standart modeller
  const [customModels, setCustomModels] = useState([]); // Ayarlar'dan eklenen modeller (nesne listesi)
  const allModels = [...standardModels, ...customModels];
  const [factory, setFactory] = useState({ name: "Altuntaş Makina", contact: "", phone: "", email: "", adres: "", country: "Türkiye", city: "", note: "Ana üretici" });

  // ── Ülke & şehir verisi: tek noktadan çekilir, tüm formlara dağıtılır ──
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoadingGeo(true);
    fetch("https://countriesnow.space/api/v0.1/countries")
      .then(r => r.json())
      .then(res => {
        if (cancelled) return;
        const map = {};
        (res?.data || []).forEach(item => {
          const name = item.country === "Turkey" ? "Türkiye" : item.country;
          map[name] = (item.cities || []).sort();
        });
        if (Object.keys(map).length > 0) setGeoData(map);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingGeo(false); });
    return () => { cancelled = true; };
  }, []);

  const [services,  setServices]  = useState(INIT_SERVICES);
  const [stock,     setStock]     = useState(INIT_STOCK);
  const [notes,     setNotes]     = useState([]); // serbest notlar [{id, content, updatedAt}]
  const [parts,     setParts]     = useState([]); // yedek parça/aksesuar/kalıp katalogu [{id, ad, kategori, fiyat, currency}]
  const [partSales, setPartSales] = useState([]); // müşteriye verilen parçalar [{id, customerId, partId, ad, kategori, tarih, ucret, ucretsizMi, currency}]
  const [kalipDefs, setKalipDefs] = useState(INIT_KALIPLAR);

  useEffect(() => {
    const load = async () => {
      try {
        if (window.crmStorage) {
          const data = await window.crmStorage.load();
          if (data) {
            if (Array.isArray(data.customers)) setCustomers(data.customers);
            if (Array.isArray(data.dealers)) setDealers(data.dealers);
            if (Array.isArray(data.stock)) setStock(data.stock);
            if (Array.isArray(data.kalipDefs)) setKalipDefs(data.kalipDefs);
            if (Array.isArray(data.standardModels)) setStandardModels(data.standardModels);
            if (Array.isArray(data.customModels)) setCustomModels(data.customModels);
            if (data.factory) setFactory(f => ({ ...f, ...data.factory }));
            if (Array.isArray(data.services)) setServices(data.services);
            if (Array.isArray(data.notes)) setNotes(data.notes);
            if (Array.isArray(data.parts)) setParts(data.parts);
            if (Array.isArray(data.partSales)) setPartSales(data.partSales);
            if (data.appSettings) setAppSettings(s => ({ ...s, ...data.appSettings }));
            if (typeof data.nextId === "number") setIdCounter(data.nextId);
          }
        }
      } catch (err) { console.error(err); } finally { setLoaded(true); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!loaded || !window.crmStorage) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.crmStorage.save({ customers, dealers, stock, kalipDefs, standardModels, customModels, factory, services, notes, parts, partSales, appSettings, nextId: getIdCounter() });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [customers, dealers, stock, kalipDefs, standardModels, customModels, factory, services, notes, parts, partSales, appSettings, loaded]);

  // ── Otomatik yedekleme: açılışta ve ayar değişince vakti geldiyse yedek yaz ──
  useEffect(() => {
    const s = appSettings;
    if (!s?.autoBackup || !s.backupFolder || !window.crmStorage?.writeBackup) return;
    const isDue = () => {
      if (!s.lastBackup) return true;
      const days = (new Date() - new Date(s.lastBackup)) / 86400000;
      if (s.frequency === "daily") return days >= 1;
      if (s.frequency === "weekly") return days >= 7;
      return days >= 30; // monthly
    };
    if (isDue()) {
      window.crmStorage
        .writeBackup(s.backupFolder, { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version: appVersion, exportDate: today(), customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs })
        .then(ok => { if (ok) setAppSettings(p => ({ ...p, lastBackup: today() })); })
        .catch(() => {});
    }
  }, [appSettings.autoBackup, appSettings.backupFolder, appSettings.frequency]);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: "#f1f5f9" }}>
      {/* Global bildirim (toast) */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 99999,
          background: toast.type === "err" ? "#dc2626" : "#16a34a", color: "#fff",
          padding: "13px 26px", borderRadius: 10, fontSize: 14, fontWeight: 700,
          boxShadow: "0 6px 24px rgba(0,0,0,.22)", display: "flex", alignItems: "center", gap: 10,
          animation: "toastIn .25s ease",
        }}>
          <span style={{ fontSize: 16 }}>{toast.type === "err" ? "⚠" : "✓"}</span>
          {toast.text}
        </div>
      )}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      {/* Sidebar */}
      <style>{`
        .nav-btn { transition: all .18s ease; }
        .nav-btn:hover { background: rgba(232,93,26,.10) !important; color: #f0b690 !important; }
        .nav-btn:hover .nav-ico { background: rgba(232,93,26,.18) !important; color: #f0b690 !important; }
      `}</style>
      <div style={{
        width: 236,
        background: "linear-gradient(180deg, #160900 0%, #1f0d02 55%, #281104 100%)",
        display: "flex", flexDirection: "column", flexShrink: 0,
        borderRight: "1px solid rgba(232,93,26,.16)",
        boxShadow: "6px 0 28px rgba(0,0,0,.30)",
        position: "relative",
      }}>
        {/* Üst ışık çizgisi */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #e85d1a, transparent)", opacity: .7 }} />

        {/* Logo alanı */}
        <div style={{ padding: "26px 18px 20px", borderBottom: "1px solid rgba(232,93,26,.12)" }}>
          <div style={{
            background: "linear-gradient(180deg, #ffffff, #f6f1ec)",
            borderRadius: 12, padding: "12px 16px",
            display: "flex", justifyContent: "center",
            boxShadow: "0 8px 28px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.95)",
          }}>
            <img src={LOGO} alt="Altuntaş Makina" style={{ width: "100%", maxHeight: 42, objectFit: "contain" }} />
          </div>
          <div style={{ fontSize: 10, color: "#bd8257", marginTop: 13, textAlign: "center", letterSpacing: 3.5, textTransform: "uppercase", fontWeight: 700 }}>
            CRM Sistemi
          </div>
        </div>

        {/* Menü */}
        <nav style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} className="nav-btn" onClick={() => { if (t.id === "customers") setCustFilter("all"); setTab(t.id); }} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px",
                background: active ? "linear-gradient(90deg, rgba(232,93,26,.26), rgba(232,93,26,.04))" : "transparent",
                border: "none",
                borderLeft: active ? "3px solid #e85d1a" : "3px solid transparent",
                borderRadius: 10, cursor: "pointer",
                color: active ? "#ff9d5c" : "#a3846f",
                fontWeight: active ? 700 : 500, fontSize: 13.5, marginBottom: 5, textAlign: "left",
                boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,.06)" : "none",
              }}>
                <span className="nav-ico" style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 30, height: 30, borderRadius: 8, transition: "all .18s ease",
                  background: active ? "rgba(232,93,26,.24)" : "rgba(255,255,255,.045)",
                  color: active ? "#ff9d5c" : "#8d6f5c",
                }}>
                  <Icon name={t.icon} size={15} />
                </span>
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Alt bilgi */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(232,93,26,.12)", fontSize: 11, color: "#7d614e", textAlign: "center", letterSpacing: .6 }}>
          {`altunmak.com · v${appVersion}`}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {tab === "dashboard" && <Dashboard customers={customers} dealers={dealers} services={services} stock={stock} onGoServices={() => setTab("services")} onGoStock={() => setTab("stock")} onGoCustomers={() => { setCustFilter("all"); setTab("customers"); }} onGoDealers={() => setTab("dealers")} onGoExpired={() => { setCustFilter("warranty"); setTab("customers"); }} onGoDebtors={() => { setCustFilter("debt"); setTab("customers"); }} onGoWarrantyActive={() => { setCustFilter("warranty-active"); setTab("customers"); }} onGoSerialPending={() => { setCustFilter("serial-pending"); setTab("customers"); }} />}
        {tab === "customers" && <Customers customers={customers} setCustomers={setCustomers} services={services} setServices={setServices} dealers={dealers} models={allModels} factory={factory} geoData={geoData} loadingGeo={loadingGeo} stock={stock} setStock={setStock} initialFilter={custFilter} kalipDefs={kalipDefs} showToast={showToast} kdvRate={appSettings.kdvRate ?? DEFAULT_KDV_RATE} />}
        {tab === "dealers" && <SimpleDealers dealers={dealers} setDealers={setDealers} factory={factory} setFactory={setFactory} geoData={geoData} loadingGeo={loadingGeo} showToast={showToast} />}
        {tab === "machines"  && <MachineHistory customers={customers} setCustomers={setCustomers} services={services} models={allModels} dealers={dealers} factory={factory} geoData={geoData} loadingGeo={loadingGeo} showToast={showToast} parts={parts} partSales={partSales} setPartSales={setPartSales} />}
        {tab === "stock"     && <Stock stock={stock} setStock={setStock} models={allModels} showToast={showToast} />}
        {tab === "services"  && <Services  services={services}  setServices={setServices}  customers={customers} factory={factory} parts={parts} showToast={showToast} />}
        {tab === "finance"   && <Finance   customers={customers} services={services} dealers={dealers} kdvRate={appSettings.kdvRate ?? DEFAULT_KDV_RATE} />}
        {tab === "notes"     && <Notes notes={notes} setNotes={setNotes} showToast={showToast} />}
        {tab === "parts"     && <Parts parts={parts} partSales={partSales} setPartSales={setPartSales} customers={customers} setCustomers={setCustomers} kalipDefs={kalipDefs} showToast={showToast} />}
        {tab === "settings"  && <Settings  customers={customers} services={services} dealers={dealers} stock={stock} setStock={setStock} setCustomers={setCustomers} setServices={setServices} setDealers={setDealers} version={appVersion} appSettings={appSettings} setAppSettings={setAppSettings} customModels={customModels} setCustomModels={setCustomModels} standardModels={standardModels} setStandardModels={setStandardModels} factory={factory} setFactory={setFactory} kalipDefs={kalipDefs} setKalipDefs={setKalipDefs} notes={notes} setNotes={setNotes} parts={parts} setParts={setParts} partSales={partSales} setPartSales={setPartSales} showToast={showToast} />}
      </div>
    </div>
  );
}
