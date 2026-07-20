// Tema (aydınlık / karanlık) token sistemi.
// Uygulamanın tüm renkleri bileşenlerde sabit inline yazıldığından, renkleri CSS
// değişkenlerine (token) çevirdik. Her token'ın AYDINLIK değeri, o rengin bugünkü
// sabit değeriyle AYNIDIR — böylece aydınlık mod bugünküyle birebir aynı kalır,
// karanlık mod yalnızca ek bir katmandır. Bileşenlerde renkler `var(--token, #hex)`
// biçiminde kullanılır; #hex fallback, değişken tanımsız kalsa bile bozulmayı önler.
//
// Kenar çubuğu her iki temada da koyu/sıcaktır (marka kimliği). Aydınlık modda
// bugünküyle birebir aynı kalır; karanlık modda yalnız ince ayar yapılır (aşağıdaki
// "Kenar çubuğu (menü)" token bloğuna bakınız).

// [ tokenAdı, aydınlıkHex, karanlıkHex ]
const TOKENS = [
  // ── Nötr / metin (koyu→açık) ve yüzey/kenarlık (açık→koyu) ──
  ["n900", "#0f172a", "#f2ede5"],
  ["n800", "#1e293b", "#e7dfd5"],
  ["n700", "#334155", "#cec4b7"],
  ["n600", "#475569", "#b4a89a"],
  ["n500", "#64748b", "#968a7d"],
  ["n400", "#94a3b8", "#74685b"],
  ["n300", "#cbd5e1", "#4b4339"],
  ["n200", "#e2e8f0", "#3a332b"],
  ["n200b", "#e5e7eb", "#3a332b"],
  ["n150", "#f1f5f9", "#2b2921"],
  ["n100", "#f8fafc", "#221e18"],
  ["n100b", "#f9fafb", "#221e18"],
  ["n80", "#eef2f6", "#2b2921"],
  ["surface", "#ffffff", "#25201a"],   // yalnız arka plan olan #fff/#ffffff
  ["footerBg", "rgba(248,250,252,.94)", "rgba(38,32,26,.94)"], // formların yapışkan İptal/Kaydet çubuğu
  ["overlayW", "rgba(255,255,255,.06)", "rgba(255,255,255,.05)"], // koyu yüzey üstü hafif katman
  ["slate800", "#1f2937", "#e7dfd5"],
  ["slate700c", "#374151", "#cec4b7"],
  ["slate500c", "#6b7280", "#968a7d"],
  ["slate300c", "#d1d5db", "#4b4339"],

  // ── Kırmızı (hata / borç / tehlike) ──
  ["red600", "#dc2626", "#f5786b"],
  ["red500", "#ef4444", "#f5786b"],
  ["red700", "#b91c1c", "#f5786b"],
  ["red800", "#991b1b", "#fca5a5"],
  ["red900", "#7f1d1d", "#fca5a5"],
  ["redBg", "#fef2f2", "#2c1c1a"],
  ["redBg2", "#fee2e2", "#3a201e"],
  ["redBr", "#fecaca", "#5c2c28"],

  // ── Yeşil (başarı / güvenli / ödendi) ──
  ["grn600", "#16a34a", "#54cf82"],
  ["grn500", "#22c55e", "#54cf82"],
  ["grn700", "#15803d", "#54cf82"],
  ["grn800", "#065f46", "#6ee7b7"],
  ["grn900", "#166534", "#6ee7b7"],
  ["grnBg", "#f0fdf4", "#16241b"],
  ["grnBg2", "#dcfce7", "#1d3527"],
  ["grnBg3", "#d1fae5", "#1d3527"],
  ["grnBr", "#bbf7d0", "#2f5a3f"],
  ["grnBr2", "#6ee7b7", "#3f7a58"],
  ["grnBr3", "#86efac", "#3f7a58"],

  // ── Amber / turuncu-uyarı (dikkat / bekliyor) ──
  ["amb700", "#b45309", "#f6b545"],
  ["amb800", "#92400e", "#f6b545"],
  ["amb900", "#78350f", "#fcd34d"],
  ["amb600", "#d97706", "#f59e0b"],
  ["ambBg", "#fffbeb", "#2a2213"],
  ["ambBg2", "#fef3c7", "#39300f"],
  ["ambBr", "#fde68a", "#5b4a1d"],
  ["ambBr2", "#fcd34d", "#7a5f1e"],
  ["ambBg3", "#fff7ed", "#2e2013"],  // turuncu-tint vurgu arka planı (seçili kart/satır)
  ["ambBg4", "#fff7f3", "#2e2013"],  // üretim formu seçili model satırı
  ["ambBr3", "#fed7aa", "#5a4522"],  // turuncu-tint kenarlık
  ["orTx", "#c2410c", "#ff9d5c"],    // koyu-turuncu metin → karanlıkta açık turuncu
  // Üretim tablosu: koyu başlıklar HER İKİ temada koyu kalmalı (metin beyaz), satırlar temayla koyulaşmalı
  ["tblGroup", "#1e293b", "#322a20"], // grup başlığı (müşteri-makina)
  ["tblHead", "#334155", "#3d3428"],  // sütun başlığı
  ["tblRow", "#e8edf3", "#26221b"],   // veri satırı
  ["inkBg", "#0f172a", "#14100b"],    // koyu kutu (her iki temada koyu; n900'den ayrı)
  // Sarı uyarı (Warn bileşeni), mor bilgi, teal/yeşil/mavi koyu metinler
  ["warnBg", "#fef9c3", "#322610"], ["warnBr", "#fde047", "#6b551a"], ["warnTx", "#854d0e", "#f6c453"],
  ["purBg", "#f5f3ff", "#241a33"], ["purTx", "#7c3aed", "#b794f6"],
  ["teal", "#0d9488", "#2dd4bf"], ["cyan", "#0891b2", "#38bdf8"], ["emerald", "#059669", "#34d399"],
  ["emerald2", "#047857", "#34d399"], ["teal2", "#0f766e", "#2dd4bf"], ["blue2", "#0369a1", "#60a5fa"],
  ["stoneInk", "#1c1917", "#f0eae2"], ["stone", "#78716c", "#a89a8c"],
  ["warmBr", "#fde8d2", "#3a2f22"],  // sıcak açık ayraç kenarlığı

  // ── Mavi (bilgi / bağlantı) ──
  ["blu700", "#1d4ed8", "#6ea0ff"],
  ["blu800", "#1e40af", "#6ea0ff"],
  ["blu600", "#2563eb", "#6ea0ff"],
  ["blu500", "#3b82f6", "#7dabff"],
  ["bluBg", "#eff6ff", "#16233a"],
  ["bluBg2", "#dbeafe", "#1f3352"],
  ["bluBr", "#bfdbfe", "#2f4a72"],

  // ── Harita ──
  // Koyu temada nötrler sıcak-kahve olduğu için turuncu rampanın koyu ucu onlara karışıyordu;
  // o yüzden karanlıkta "satış yok" belirgin koyulaştı ve rampa orta tondan parlak turuncuya,
  // açıklığı tek yönlü artacak biçimde kuruldu.
  ["hDeniz", "#b9dde8", "#171410"],       // deniz: açık modda yumuşak deniz mavisi (cyan, bir tık koyu); koyu mod el değmedi
  ["hBos", "#dbe3ec", "#2e2a25"],          // satış olmayan ülke/bölge
  ["hSatis", "#e85d1a", "#ff9d5c"],        // satış olan yer: tek logo rengi (faaliyet haritası; yoğunluk tonlaması yerine)
  ["hCizgi", "#ffffff", "#1f1b16"],        // sınır çizgisi
  ["hk1", "#fdead8", "#6b3d1c"],
  ["hk2", "#fbc79a", "#97511d"],
  ["hk3", "#f39c5c", "#c2661d"],
  ["hk4", "#ee7830", "#e87c2a"],
  ["hk5", "#e85d1a", "#ff9d5c"],

  // ── Kenar çubuğu (menü) ──
  // Kenar çubuğu HER İKİ temada da koyu/sıcak kalır (marka kimliği). Aşağıdaki light
  // değerleri bugünküyle birebir aynıdır; yalnız KARANLIK modda ince ayar yapılır:
  // gradient biraz derinleşir, sağ kenarlık/gölge belirginleşir (içerik de koyu
  // olduğundan panel ayrımı için), pasif metin/ikon kontrastı okunabilirlik için
  // biraz yükselir. Aktif turuncu vurgu her iki temada aynıdır.
  ["sbGrad", "linear-gradient(180deg, #160900 0%, #1f0d02 55%, #281104 100%)", "linear-gradient(180deg, #0e0500 0%, #160a01 55%, #1d0c03 100%)"],
  ["sbBorder", "rgba(232,93,26,.16)", "rgba(232,93,26,.26)"],
  ["sbShadow", "6px 0 28px rgba(0,0,0,.30)", "8px 0 34px rgba(0,0,0,.55)"],
  ["sbTxt", "#a3846f", "#c4aa96"],   // pasif menü metni
  ["sbIco", "#8d6f5c", "#b19480"],   // pasif menü ikonu
];

// #hex → token adı (migration script bunu kullanır). Küçük harf.
const HEX_TO_TOKEN = {};
for (const [name, light] of TOKENS) HEX_TO_TOKEN[light.toLowerCase()] = name;

function buildCss() {
  const light = TOKENS.map(([n, l]) => `--${n}:${l};`).join("");
  const dark = TOKENS.map(([n, , d]) => `--${n}:${d};`).join("");
  // Aydınlık varsayılan; data-theme="dark" karanlığı uygular. color-scheme tarayıcıya bildirir.
  return `:root{color-scheme:light;${light}}`
    + `:root[data-theme="dark"]{color-scheme:dark;${dark}}`
    + `html,body{background:var(--n100)}`; // viewport arka planı (aşırı-kaydırma/flaş için)
}

let styleEl = null;
function ensureStyle() {
  if (styleEl) return styleEl;
  styleEl = document.createElement("style");
  styleEl.id = "crm-theme-vars";
  styleEl.textContent = buildCss();
  document.head.appendChild(styleEl);
  return styleEl;
}

// Temayı uygula: "dark" | "light". CSS değişkenleri bir kez enjekte edilir, sonra
// yalnız data-theme özniteliği değişir (karanlık token'ları devreye girer).
export function applyTheme(mode) {
  ensureStyle();
  const m = mode === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", m);
  try { localStorage.setItem("crm-theme", m); } catch { /* yoksay */ }
  return m;
}

export function getSavedTheme() {
  try { return localStorage.getItem("crm-theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
}

export { HEX_TO_TOKEN, TOKENS };
