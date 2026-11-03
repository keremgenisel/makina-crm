// Spec 0126 AC-7 / C1: altın gövdenin senaryoları. Altın (`0126-govde-once.json`) spec öncesi koddan, bugünkü <select>
// seçimleriyle üretildi; yeni seçim penceresi aynı senaryolarla aynı satırları üretmelidir. Her satır seçilen türün alt
// kalemiyle başlar ki alt kalem kimliği rastgele üretilmesin.
export const KALIPLAR = [{ id: 1, ad: "Hamburger", kod: "K-H", urunAdi: "Hamburger Kalıbı", urunAdiEN: "Burger Mold", tanim: "Ø100", tanimEN: "D100" },
  { id: 2, ad: "Köfte", kod: "K-K", urunAdi: "Köfte Kalıbı", tanim: "Ø60" }];
export const PARCALAR = [
  { id: 7, ad: "Rulman", adEN: "Bearing", kod: "R-7", tanim: "6204", fiyatTRY: 450, fiyatUSD: 12, fiyatEUR: "" },
  { id: 8, ad: "Bıçak Seti", kod: "BS-1", fiyatTRY: "1.250", setIcerigi: [{ partId: 7, miktar: 2 }, { partId: 9, miktar: 1 }] },
  { id: 9, ad: "Bıçak", kod: "B-9", fiyatTRY: 300 },
];
const alt = (id, type) => ({ id, type, kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: "", tlKarsiligi: "" });
export const SENARYOLAR = [
  { ad: "parca-sec", tur: "parca", deger: "7" },
  { ad: "parca-set-sec", tur: "parca", deger: "8" },
  { ad: "parca-en-usd", tur: "parca", deger: "7", dil: "EN", currency: "USD" },
  { ad: "parca-temizle", tur: "parca", deger: "", secili: { selectedPart: "7" } },
  { ad: "kalip-sec", tur: "kalip", deger: "Köfte" },
  { ad: "kalip-en", tur: "kalip", deger: "Hamburger", dil: "EN" },
  { ad: "kalip-eski-ad", tur: "kalip", secili: { selectedKalip: "Eski Kalıp" } },
  { ad: "kalip-temizle", tur: "kalip", deger: "", secili: { selectedKalip: "Hamburger" } },
];
export const teklif = (sn) => ({ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: sn.dil || "TR",
  currency: sn.currency || "TRY", ...(sn.currency === "USD" ? { kurRate: "40" } : {}), durum: "taslak", firma: "Kutu Gıda",
  satirlar: [{ rowId: "r1", pickTip: sn.tur, selectedModel: "", selectedKalip: "", selectedPart: "", ...(sn.secili || {}),
    subItems: [alt(sn.tur === "parca" ? "p1" : "k1", sn.tur)] }] });
