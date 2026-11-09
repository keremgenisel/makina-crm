// Spec 0139 B: sentetik MALZEME LİSTESİ çalışma kitabı (Ek 3'ün sütun düzeni; adlar uydurma, müşteri verisi değil, karar 45).
// `kaynakSayfalar()` saf modülün girdisi (sayfa adı → satır dizisi, satır 1 = dizi indeksi 0); `kaynakKitap(XLSX)` aynı sayfaları
// gerçek bir çalışma kitabına yazar (panel testi ve formül hücresi denetimi için).
const harf = (h) => h.charCodeAt(0) - 65;
const satir = (hucreler) => { const r = []; for (const [h, v] of Object.entries(hucreler)) r[harf(h)] = v; for (let i = 0; i < r.length; i++) if (r[i] === undefined) r[i] = ""; return r; };
const sayfa = (satirlar) => { const s = []; for (const [no, h] of Object.entries(satirlar)) s[Number(no) - 1] = satir(h); for (let i = 0; i < s.length; i++) if (!s[i]) s[i] = []; return s; };
const mil = (ad, cap, boy, adet, not = "ADET", kopya = cap) => ({ C: ad, G: "Ø", H: cap, I: kopya, J: "x", K: boy, Q: adet, R: not });
const pl = (malzeme, ad, j, o, adet, { k = "", l = "Ø", m = j, not = "ADET" } = {}) => ({ E: malzeme, F: "BEYAZ", G: ad, J: j, K: k, L: l, M: m, O: o, U: adet, V: not });

export const SAYFA_ADLARI = { P100: "AK100_AK120 PASLANMAZ", P140: "AK140_SWP PASLANMAZ", PL100: "100_120_PLASTİKLER", PL140: "AK140_SWP PLASTİKLER" };

export const kaynakSatirlari = () => ({
  [SAYFA_ADLARI.P100]: sayfa({
    5: { C: "PARÇA ADI", G: "ÖLÇÜ", Q: "ADET" },
    7: mil("UZUN MİL A", 60, 175, 70),
    8: mil("İNCE ÇUBUK", 10, 3000, 2, "ADET 70 MAKİNALIK"),
    9: mil("100_ÖZEL MİL", 30, 100, 40),
    10: mil("(120 İÇİN) 120 ÖZEL YATAK", 35, 362, 30),
    11: mil("ORTAK MİL", 20, 100, 70),
    12: mil("FARKLI MİL", 20, 100, 70),
    13: mil("ÇİFT AD", 25, 100, 70),
    14: mil("ÇİFT AD", 25, 200, 70),
    15: mil("TUTARSIZ", 30, 100, 70, "ADET", 31),
    16: { C: "OKUNAMAZ", G: "Ø", H: "abc", I: "abc", K: 100, Q: 70 },
    17: mil("SIFIR ADET (DİŞİ KALIBIN İÇİNDEN)", 30, 100, 0),
    18: mil("PASLANMAZ KALIP MİLİ", 35, 342, 40),
    19: mil("MEVCUT PARÇA", 40, 100, 70),
    20: mil("140_YANLIŞ SAYFA", 40, 100, 10),
    21: { G: "Ø", H: 20, I: 20, K: 0, Q: "" }, // boş şablon satırı (adı yok)
    22: mil("KESİRLİ PARÇA", 50, 50, 100),
    32: mil("KONVEYÖR BORUSU 70 MAKİNALIK 2 BOY 12 METRESİ", 19, 173, 29, "ADET FİYATI ÇIKSIN DİYE 29 YAZIYOR"),
    33: { C: "KAZAN İÇ ÇUBUKLARI KG FİYATI 3,2$", G: "10x", H: 20, I: 20, K: 125, Q: 101, R: "ADET FİYAT ÇIKSIN DİYE" },
    38: { Q: 70, S: "123.456 TL" }, // toplam satırı (aralık dışı)
  }),
  [SAYFA_ADLARI.P140]: sayfa({
    7: mil("ORTAK MİL", 20, 100, 10),
    8: mil("FARKLI MİL", 20, 150, 10),
    9: mil("SWP_SWP MİLİ", 16, 40, 10),
    32: { C: "KONVEYÖR BORUSU 25 MAKİNALIK 1 BOY 6 METRESİ", G: 16, H: 19, I: 19, K: 222, Q: 11.5 },
    33: { C: "KAZAN İÇ ÇUBUKLARI KG FİYATI 3,2$", G: 12, H: 20, I: 20, K: 155, Q: 18 },
  }),
  [SAYFA_ADLARI.PL100]: sayfa({
    27: { E: "MALZEME", G: "PARÇA ADI", U: "ADET" },
    28: pl("POM DELRİN", "DELRİN MERDANE", 150, 42, 70),
    29: pl("DELRİN LEVHA", "LEVHA PARÇA", 390, 390, 70, { k: 70, l: "x" }),
    30: pl("POM KESTAMİD", "KESTAMİT KAM", 130, 23, 70),
    31: pl("", "TEFLON YATAK", 35, 1000, 6, { not: "6 ADET (70 MAKİNALIK)" }),
    32: pl("BİLİNMEYEN MALZEME", "GARİP PARÇA", 20, 20, 70),
    33: pl("POM DELRİN", "100_PLASTİK DİŞİ", 200, 128, 40),
    34: pl("DELRİN LEVHA", "YAN SIYIRICI GRAMAJ İÇİN", 40, 112, 40, { k: 20, l: "x" }),
    54: { E: "POM DELRİN", J: 20, M: 20, O: 0 }, // boş şablon satırı
  }),
  [SAYFA_ADLARI.PL140]: sayfa({
    28: pl("POM DELRİN", "AK140 PLASTİK", 70, 215, 10),
    49: pl("DELRİN LEVHA", "SWP DAYAMA", 20, 135, 10, { k: 30, l: "" }), // L boş: biçim E'den
  }),
  "ALÜMİNYUM": sayfa({ 3: { C: "ALT PLAKA", D: "70X390X390" } }),
  "8620 SEMENTE": sayfa({ 3: { C: "DİŞLİ", D: "Ø150X42" } }),
  "1050 İMALAT ÇELİĞİ": sayfa({ 3: { C: "MİL", D: "Ø40X600" } }),
});
// Saf modülün girdisi (kitap okuyucusunun çıktısıyla aynı şekil: sayılar metin).
export const kaynakSayfalar = () => Object.fromEntries(Object.entries(kaynakSatirlari())
  .map(([ad, s]) => [ad, s.map(r => r.map(v => (v === "" || v == null ? "" : String(v))))]));
export const kaynakKitap = (XLSX, satirlar = kaynakSatirlari()) => {
  const wb = XLSX.utils.book_new();
  for (const [ad, s] of Object.entries(satirlar)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s), ad);
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
};

// Altı malzeme kartı (Context'in önerilen değerleri, B-R11/2) ve model kataloğu (ALTUNMAK_MODELS + çöpteki bir varyant).
export const KG_TABLOSU = [{ alt: 0, kg: 0 }, { alt: 21, kg: 0.05 }, { alt: 36, kg: 0.3 }, { alt: 91, kg: 0.35 }, { alt: 101, kg: 1 }, { alt: 141, kg: 1.75 }];
export const KARTLAR = [
  { id: 901, ad: "PASLANMAZ 304 ÇUBUK", ozgulAgirlik: 7.9, paraBirimi: "USD", kur: 50, kiloFiyati: 3.2, bantlar: [{ alt: 0, fiyat: 2.85 }, { alt: 101, fiyat: 2.95 }, { alt: 151, fiyat: 3.4 }], fireBantlari: KG_TABLOSU },
  { id: 902, ad: "PASLANMAZ 304 BORU", ozgulAgirlik: 8, paraBirimi: "USD", kur: 50, kiloFiyati: 4.08 },
  { id: 903, ad: "POM DELRİN", ozgulAgirlik: 1.42, bantlar: [{ alt: 0, fiyat: 175 }, { alt: 151, fiyat: 190 }], fire: 10 },
  { id: 904, ad: "DELRİN LEVHA", ozgulAgirlik: 1.42, kiloFiyati: 190, fire: 10 },
  { id: 905, ad: "POM KESTAMİD", ozgulAgirlik: 1.15, bantlar: [{ alt: 0, fiyat: 1270 }, { alt: 20, fiyat: 1180 }, { alt: 30, fiyat: 1015 }, { alt: 50, fiyat: 880 }, { alt: 80, fiyat: 330 }], fire: 10 },
  { id: 906, ad: "POM TEFLON", ozgulAgirlik: 2.2, paraBirimi: "USD", kur: 50, kiloFiyati: 10.5, fire: 10 },
];
export const MODELLER = ["AK100_DS", "AK100_DSC", "AK120_DS", "AK120_DSC", "AK140_DSC", "SWP140_DSC"].map(model => ({ model, defaultParcalar: [] }));
export const OZEL_MODELLER = [{ model: "AK100_ESKI", defaultParcalar: [], deletedAt: "2026-10-01" }];
