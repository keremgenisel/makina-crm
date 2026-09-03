// Analiz motoru — saf hesap (Finance/aylikRapor deseni; test edilebilir, React'sız).
// ADET bazlı: hiçbir metrik para/ciro içermez (kullanıcı kararı). Servis değişen parçaları +
// kargo yedek parça satışlarını birleştirir, model/servis/teknisyen/kalıp kırılımlarını türetir.
//
// Girdi tek nesne: { customers, services, partSales, yedekParcaSatislar, parts, calismaSaatleri }
// (hepsi silinmemiş/live diziler beklenir). Aralık ikinci arg: { baslangic, bitis } "YYYY-MM-DD"
// (bitis DAHİL, ikisi de null → tüm zamanlar). Tarihsiz kayıt, aralık verildiyse dışarıda kalır.
import { trLower, parcaAdi } from "./utils";
import { servisSureleri } from "./servisAnaliz";

export const BILINMEYEN_MODEL = "Modeli bilinmeyen";

// Bir parça satırının anahtarı: partId varsa ona göre (servis + kargo aynı parçada birleşsin),
// yoksa serbest metin ada göre (Türkçe-katlı). Böylece "Rulman 6204" hem serviste hem kargoda tek satır.
const parcaAnahtar = (partId, ad) =>
  (partId != null && partId !== "") ? `p:${partId}` : `n:${trLower(ad || "")}`;

// "YYYY-MM" ay anahtarından k ay geri (saf sayı aritmetiği; UTC kayması yok).
const ayGeri = (ay, k) => {
  const [y, m] = ay.split("-").map(Number);
  const total = y * 12 + (m - 1) - k;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
};

export function hesaplaAnaliz(
  { customers = [], services = [], partSales = [], yedekParcaSatislar = [], parts = [], calismaSaatleri } = {},
  { baslangic = null, bitis = null } = {},
) {
  const custById = new Map();
  const custBySerial = new Map();
  for (const c of customers) {
    if (!c) continue;
    if (c.id != null) custById.set(c.id, c);
    if (c.serialNo && !custBySerial.has(c.serialNo)) custBySerial.set(c.serialNo, c);
  }
  const partsById = new Map();
  for (const p of parts) if (p && p.id != null) partsById.set(String(p.id), p);

  // Aralık testi: aralık yoksa hep true; varsa tarih dolu VE sınırlar içinde olmalı (string karşılaştırma).
  const araliktaMi = (d) =>
    (!baslangic || (d && d >= baslangic)) && (!bitis || (d && d <= bitis));

  const rServices = services.filter(s => araliktaMi(s.date));
  const rYedek = yedekParcaSatislar.filter(s => araliktaMi(s.tarih));
  const rKalip = partSales.filter(p => p && p.tur === "Kalıp" && araliktaMi(p.tarih));

  const makinaModeli = (id, serialNo) => {
    const c = (id != null && custById.get(id)) || (serialNo ? custBySerial.get(serialNo) : null);
    return c?.model || BILINMEYEN_MODEL;
  };

  // ── Yedek parça toplamı (servis + kargo birleşik) + parça başına model kırılımı ──
  const parcaMap = new Map(); // key → {key, ad, servis, kargo, toplam, modeller:Map}
  const parcaGiris = (partId, ad) => {
    const key = parcaAnahtar(partId, ad);
    let e = parcaMap.get(key);
    if (!e) { e = { key, ad: ad || "Parça", servis: 0, kargo: 0, toplam: 0, modeller: new Map() }; parcaMap.set(key, e); }
    if ((!e.ad || e.ad === "Parça") && ad) e.ad = ad;
    return e;
  };
  const modelEkle = (e, model, adet) => {
    const m = model || BILINMEYEN_MODEL;
    e.modeller.set(m, (e.modeller.get(m) || 0) + adet);
  };

  // Servis değişen parçaları
  for (const s of rServices) {
    const model = custById.get(s.customerId)?.model || BILINMEYEN_MODEL;
    for (const p of (s.degisenParcalar || [])) {
      const adet = Number(p.miktar) > 0 ? Number(p.miktar) : 1;
      const ad = p.ad || parcaAdi(partsById.get(String(p.partId))) || "Parça";
      const e = parcaGiris(p.partId, ad);
      e.servis += adet; e.toplam += adet;
      modelEkle(e, model, adet);
    }
  }
  // Kargo yedek parça satışları (+ tahsislere göre makina/model dağılımı)
  for (const s of rYedek) {
    const adet = Number(s.miktar) || 0;
    if (adet <= 0) continue;
    const ad = parcaAdi(partsById.get(String(s.partId))) || "Yedek parça";
    const e = parcaGiris(s.partId, ad);
    e.kargo += adet; e.toplam += adet;
    let tahsisEdilen = 0;
    for (const t of (s.tahsisler || [])) {
      const tadet = Number(t.miktar) || 0;
      if (tadet <= 0) continue;
      tahsisEdilen += tadet;
      modelEkle(e, makinaModeli(t.customerId, t.serialNo), tadet);
    }
    const kalan = adet - tahsisEdilen;
    if (kalan > 0) modelEkle(e, BILINMEYEN_MODEL, kalan); // tahsis edilmemiş = modeli bilinmiyor
  }

  const parcalar = [...parcaMap.values()]
    .map(e => ({
      key: e.key, ad: e.ad, servis: e.servis, kargo: e.kargo, toplam: e.toplam,
      // bilinmeyen dilimi en sona, gerisi adet azalan
      modeller: [...e.modeller].map(([model, adet]) => ({ model, adet, bilinmeyen: model === BILINMEYEN_MODEL }))
        .sort((a, b) => (a.bilinmeyen - b.bilinmeyen) || (b.adet - a.adet)),
    }))
    .sort((a, b) => b.toplam - a.toplam);

  const parcaServisToplam = parcalar.reduce((s, p) => s + p.servis, 0);
  const parcaKargoToplam = parcalar.reduce((s, p) => s + p.kargo, 0);

  // ── En çok servis alan makinalar (customerId = makina kaydı) ──
  const makinaMap = new Map();
  for (const s of rServices) {
    if (s.customerId == null) continue;
    makinaMap.set(s.customerId, (makinaMap.get(s.customerId) || 0) + 1);
  }
  const enCokServisliMakinalar = [...makinaMap].map(([id, adet]) => {
    const c = custById.get(id);
    return { customerId: id, adet, name: c?.name || "—", model: c?.model || "—", serialNo: c?.serialNo || "" };
  }).sort((a, b) => b.adet - a.adet);

  // ── Model servis yoğunluğu (makina başına servis; filo sayısına normalize) ──
  const modelSvc = new Map();
  for (const s of rServices) {
    const m = custById.get(s.customerId)?.model;
    if (m) modelSvc.set(m, (modelSvc.get(m) || 0) + 1);
  }
  const modelFilo = new Map(); // filo = güncel makina kaydı sayısı (aralıktan bağımsız)
  for (const c of customers) if (c?.model) modelFilo.set(c.model, (modelFilo.get(c.model) || 0) + 1);
  const modelYogunlugu = [...modelSvc].map(([model, servis]) => {
    const makina = modelFilo.get(model) || 0;
    return { model, servis, makina, oran: makina > 0 ? servis / makina : 0 };
  }).sort((a, b) => b.oran - a.oran);

  // ── Servis tipi + onarım yeri kırılımı ──
  const grupla = (arr, alan, bos) => {
    const m = new Map();
    for (const s of arr) { const k = s[alan] || bos; m.set(k, (m.get(k) || 0) + 1); }
    return [...m].map(([ad, adet]) => ({ ad, adet })).sort((a, b) => b.adet - a.adet);
  };
  const servisTipleri = grupla(rServices, "type", "Belirtilmemiş");
  const onarimYerleri = grupla(rServices, "repairPlace", "Belirtilmemiş");

  // ── Teknisyen dökümü (servis sayısı + ortalama işçilik dakikası) ──
  const techMap = new Map();
  for (const s of rServices) {
    const ad = (s.tech || "").trim() || "Atanmamış";
    let e = techMap.get(ad);
    if (!e) { e = { ad, adet: 0, isclikTop: 0, isclikSay: 0 }; techMap.set(ad, e); }
    e.adet++;
    const sr = servisSureleri(s, null, calismaSaatleri);
    if (sr.isclikDk != null) { e.isclikTop += sr.isclikDk; e.isclikSay++; }
  }
  const teknisyenler = [...techMap.values()].map(e => ({
    ad: e.ad, adet: e.adet,
    ortIsclikDk: e.isclikSay ? Math.round(e.isclikTop / e.isclikSay) : null,
  })).sort((a, b) => b.adet - a.adet);

  // ── Aylık servis trendi (bitiş ayında biten 12 aylık pencere) ──
  const aySayac = new Map();
  for (const s of rServices) { const k = (s.date || "").slice(0, 7); if (k) aySayac.set(k, (aySayac.get(k) || 0) + 1); }
  const sonAy = bitis ? bitis.slice(0, 7) : (aySayac.size ? [...aySayac.keys()].sort().pop() : null);
  const aylikTrend = [];
  if (sonAy) for (let i = 11; i >= 0; i--) { const ay = ayGeri(sonAy, i); aylikTrend.push({ ay, adet: aySayac.get(ay) || 0 }); }

  // ── Kalıp analizi — Extra satış (partSales "Kalıp") + Standart/ilk (makinayla gelen) BİRLEŞİK ──
  // Her boyutta (ad / ölçü / model) tek satırda iki kaynak: standart + extra. Standart kalıplar =
  // customer.kaliplar içinde partSaleId'si OLMAYANLAR (partSaleId olan = Extra Kalıp satışından eklendi
  // → çift sayımı önler). Extra satış tarih'e, standart makina installDate'ine göre süzülür.
  const kAd = new Map(), kOlcu = new Map(), kModel = new Map();
  const artir = (map, anahtar, kaynak) => {
    let e = map.get(anahtar);
    if (!e) { e = { anahtar, standart: 0, extra: 0, toplam: 0 }; map.set(anahtar, e); }
    e[kaynak]++; e.toplam++;
  };
  for (const p of rKalip) {
    artir(kAd, (p.ad || "").trim() || "Adsız kalıp", "extra");
    artir(kOlcu, (p.olcu || "").trim() || "Ölçüsüz", "extra");
    artir(kModel, custById.get(p.customerId)?.model || BILINMEYEN_MODEL, "extra");
  }
  const rMakina = customers.filter(c => c && araliktaMi(c.installDate));
  let standartToplam = 0;
  for (const c of rMakina) {
    for (const k of (c.kaliplar || [])) {
      if (k?.partSaleId != null) continue;
      standartToplam++;
      artir(kAd, (k?.ad || "").trim() || "Adsız kalıp", "standart");
      artir(kOlcu, (k?.olcu || "").trim() || "Ölçüsüz", "standart");
      artir(kModel, c.model || BILINMEYEN_MODEL, "standart");
    }
  }
  const kalipDizi = (map) => [...map.values()]
    .map(e => ({ ad: e.anahtar, model: e.anahtar, bilinmeyen: e.anahtar === BILINMEYEN_MODEL, standart: e.standart, extra: e.extra, toplam: e.toplam }))
    .sort((a, b) => (a.bilinmeyen - b.bilinmeyen) || (b.toplam - a.toplam));
  const kalipAd = kalipDizi(kAd);
  const kalipOlcu = kalipDizi(kOlcu);
  const kalipModel = kalipDizi(kModel);

  return {
    ozet: {
      parcaToplam: parcaServisToplam + parcaKargoToplam,
      parcaServisToplam, parcaKargoToplam,
      toplamServis: rServices.length,
      makinaSayisi: makinaMap.size,
      enCokParca: parcalar[0] || null,
      enCokServisliMakina: enCokServisliMakinalar[0] || null,
      kalipToplam: rKalip.length,         // yalnız Extra satış
      standartToplam,                     // yalnız standart/ilk
      kalipGenelToplam: rKalip.length + standartToplam,
    },
    parcalar,
    enCokServisliMakinalar,
    modelYogunlugu,
    servisTipleri,
    onarimYerleri,
    teknisyenler,
    aylikTrend,
    kalipAd,
    kalipOlcu,
    kalipModel,
  };
}
