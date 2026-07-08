// Aylık Faaliyet Raporu hesap motoru — saf fonksiyon, ekrandaki Finance hesaplarıyla
// AYNI gelir kurallarını kullanır (Altuntaş servisi / ücretli tip / Altuntaş parçası /
// çek ancak tahsil edilince tahsilattır). TL'ye çevirme yapılmaz: her tutar kendi para
// biriminde `{ TRY, USD, EUR }` nesnesi olarak döner (yalnızca geçen anahtarlar).
import {
  parseMoney, calcKDV, customerHasAnyDebt, isServisUcretliMi, isParcaUcretliMi,
  altuntasParcaBedeli, isPaymentReceived, isCekVadesiGecmis, taksitGecikmisMi,
  isPartSaleBorcluMu, resolveSatisYapan, isAltuntasServisi,
} from "./utils";

const paraEkle = (obj, cur, v) => { const k = cur || "TRY"; obj[k] = (obj[k] || 0) + (parseMoney(v) || 0); };

// ay: "YYYY-MM". Dönem etiketi için ayın ilk/son günü gg.aa.yyyy biçiminde üretilir.
export const hesaplaAylikRapor = ({ customers = [], services = [], partSales = [], payments = [], teklifler = [] }, ay, { factoryName = "Altuntaş Makina", kdvRates, factory = null } = {}) => {
  const [yil, ayNo] = String(ay).split("-").map(Number);
  const ayIci = (t) => !!t && String(t).slice(0, 7) === ay;
  const gunSayisi = new Date(yil, ayNo, 0).getDate();
  const fmtD = (g) => `${String(g).padStart(2, "0")}.${String(ayNo).padStart(2, "0")}.${yil}`;

  // deletedAt her koleksiyonda burada filtrelenir (prop ön-filtresine güvenilmez)
  const canliMusteriler = customers.filter(c => !c.deletedAt);
  const canliServisler = services.filter(s => !s.deletedAt);
  const canliKalipSatislari = partSales.filter(p => !p.deletedAt);
  const canliOdemeler = payments.filter(p => !p.deletedAt);
  const canliTeklifler = teklifler.filter(t => !t.deletedAt);

  // ── SATIŞLAR ────────────────────────────────────────────────────────────────
  const satislar = canliMusteriler.filter(c => !c.isResale && ayIci(c.installDate));
  const gercekBedel = (c) => parseMoney(c.fabrikaSatisBedeli) > 0 ? c.fabrikaSatisBedeli : c.faturaBedeli;
  const satisTutar = {}, faturaTutar = {}, satisKdv = {}, komisyonTutar = {};
  satislar.forEach(c => {
    paraEkle(satisTutar, c.currency, gercekBedel(c));
    paraEkle(faturaTutar, c.currency, c.faturaBedeli);
    paraEkle(satisKdv, c.currency, calcKDV(c.faturali, c.faturaBedeli, c.installDate, kdvRates));
    paraEkle(komisyonTutar, c.currency, c.komisyon);
  });
  const ikinciElAdet = canliMusteriler.filter(c => c.isResale && ayIci(c.installDate)).length;

  const modelMap = {};
  satislar.forEach(c => {
    const k = c.model || "Belirtilmemiş";
    if (!modelMap[k]) modelMap[k] = { adet: 0, gelir: {} };
    modelMap[k].adet += 1;
    paraEkle(modelMap[k].gelir, c.currency, gercekBedel(c));
  });
  const modelKirilimi = Object.entries(modelMap).sort((a, b) => b[1].adet - a[1].adet)
    .map(([model, v]) => ({ model, adet: v.adet, gelir: v.gelir }));

  // Satış yapan kırılımı: kullanıcı kararı gereği yalnızca ADET (gelir kolonu bilinçli yok)
  const saticiMap = {};
  satislar.forEach(c => {
    const k = resolveSatisYapan(c.satisYapan, factory) || factoryName;
    saticiMap[k] = (saticiMap[k] || 0) + 1;
  });
  const satisYapanKirilimi = Object.entries(saticiMap).sort((a, b) => b[1] - a[1]).map(([ad, adet]) => ({ ad, adet }));

  // ── DİĞER SATIŞLAR ──────────────────────────────────────────────────────────
  const ayKalipSatislari = canliKalipSatislari.filter(p => ayIci(p.tarih));
  const extraKalip = ayKalipSatislari.filter(p => p.tur !== "YedekParca");
  const yedekParca = ayKalipSatislari.filter(p => p.tur === "YedekParca");
  const extraKalipTutar = {}, extraKalipKdv = {}, yedekParcaTutar = {};
  extraKalip.forEach(p => { if (!p.ucretsizMi) { paraEkle(extraKalipTutar, p.currency, p.ucret); paraEkle(extraKalipKdv, p.currency, calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates)); } });
  yedekParca.forEach(p => { if (!p.ucretsizMi) paraEkle(yedekParcaTutar, p.currency, p.ucret); });
  // Anlaşmalı servis firmalarına satılan parçalar (Altuntaş dışı servislerdeki Altuntaş parçaları)
  const anlasmaliParcaTutar = {};
  canliServisler.filter(s => ayIci(s.date) && isParcaUcretliMi(s) && !isAltuntasServisi(s, factoryName)).forEach(s => {
    paraEkle(anlasmaliParcaTutar, s.parcaCurrency || s.currency, altuntasParcaBedeli(s));
  });

  // ── SERVİS ──────────────────────────────────────────────────────────────────
  const ayServisler = canliServisler.filter(s => ayIci(s.date));
  const iscilikTutar = {}, servisParcaTutar = {}, servisKdv = {};
  ayServisler.forEach(s => {
    const iscilik = isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0;
    const parca = (isParcaUcretliMi(s) && isAltuntasServisi(s, factoryName)) ? altuntasParcaBedeli(s) : 0;
    if (iscilik) paraEkle(iscilikTutar, s.currency, iscilik);
    if (parca) paraEkle(servisParcaTutar, s.parcaCurrency || s.currency, parca);
    if (iscilik + parca > 0) paraEkle(servisKdv, s.currency, calcKDV(s.faturaTipi, iscilik + parca, s.date, kdvRates));
  });
  const servisTipMap = {};
  ayServisler.forEach(s => { const k = s.type || "Diğer"; servisTipMap[k] = (servisTipMap[k] || 0) + 1; });
  const servisKirilimi = Object.entries(servisTipMap).sort((a, b) => b[1] - a[1]).map(([tip, adet]) => ({ tip, adet }));

  // ── TAHSİLAT (gerçekleşen) ──────────────────────────────────────────────────
  const ayOdemeler = canliOdemeler.filter(p => ayIci(p.tarih));
  const gerceklesen = ayOdemeler.filter(isPaymentReceived);
  const bekleyenCekler = ayOdemeler.filter(p => p.yontem === "Çek" && !p.tahsilEdildi);
  const tahsilatTutar = {}, bekleyenCekTutar = {};
  gerceklesen.forEach(p => paraEkle(tahsilatTutar, p.currency, p.tutar));
  bekleyenCekler.forEach(p => paraEkle(bekleyenCekTutar, p.currency, p.tutar));

  // ── ALACAK DURUMU (rapor tarihi itibarıyla) ─────────────────────────────────
  const borclular = canliMusteriler.filter(c => customerHasAnyDebt(c, canliServisler, canliKalipSatislari, factoryName));
  const alacak = {};
  canliMusteriler.forEach(c => { if (parseMoney(c.kalanBorc) > 0) paraEkle(alacak, c.currency, c.kalanBorc); });
  canliServisler.filter(s => (isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s)) && s.odendi === false).forEach(s => {
    const toplam = (isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0) + (isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0);
    paraEkle(alacak, s.currency, toplam + calcKDV(s.faturaTipi, toplam, s.date, kdvRates));
  });
  canliKalipSatislari.filter(isPartSaleBorcluMu).forEach(p => {
    paraEkle(alacak, p.currency, parseMoney(p.ucret) + calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates));
  });

  // ── TEKLİFLER ───────────────────────────────────────────────────────────────
  const ayTeklifler = canliTeklifler.filter(t => t.type === "teklif" && ayIci(t.tarih));
  const onaylanan = ayTeklifler.filter(t => t.durum === "onaylandi" || t.satisTamam === true).length;

  return {
    ay,
    ayEtiketi: new Date(yil, ayNo - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    donem: `${fmtD(1)} - ${fmtD(gunSayisi)}`,
    olusturmaTarihi: new Date().toLocaleDateString("tr-TR"),
    // Satışlar
    satisAdet: satislar.length, satisTutar, faturaTutar, satisKdv, komisyonTutar, ikinciElAdet,
    modelKirilimi, satisYapanKirilimi,
    // Diğer satışlar
    extraKalipAdet: extraKalip.length, extraKalipTutar, extraKalipKdv,
    yedekParcaAdet: yedekParca.length, yedekParcaTutar, anlasmaliParcaTutar,
    // Servis
    servisAdet: ayServisler.length, iscilikTutar, servisParcaTutar, servisKdv, servisKirilimi,
    // Tahsilat
    tahsilatAdet: gerceklesen.length, tahsilatTutar,
    bekleyenCekAdet: bekleyenCekler.length, bekleyenCekTutar,
    cekTahsilAdet: ayOdemeler.filter(p => p.yontem === "Çek" && p.tahsilEdildi).length,
    // Alacak (rapor anı)
    borcluFirma: borclular.length, acikBorc: alacak,
    gecikenCek: canliOdemeler.filter(isCekVadesiGecmis).length,
    gecikenTaksit: canliMusteriler.filter(taksitGecikmisMi).length,
    // Teklifler
    teklifAdet: ayTeklifler.length, onaylananTeklif: onaylanan,
    bekleyenTeklif: canliTeklifler.filter(t => t.type === "teklif" && t.durum === "gonderildi").length,
  };
};

// "YYYY-MM" bir ay geri
export const oncekiAyStr = (ay) => {
  const [y, m] = String(ay).split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
