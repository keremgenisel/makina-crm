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
// Tek kayıt için tek para birimli tutar nesnesi ({TRY:...} gibi) — detay satırlarında kullanılır
const tekPara = (cur, v) => { const o = {}; paraEkle(o, cur, v); return o; };
// Teklif toplamı: satırlar → subItems birimFiyat × miktar (ekrandaki teklif hesabıyla aynı formül)
const teklifToplami = (t) => (t.satirlar || []).reduce((s, r) =>
  s + (r.subItems || []).reduce((s2, it) => s2 + (parseMoney(it.birimFiyat) || 0) * (parseFloat(it.miktar) || 0), 0), 0);
const TEKLIF_DURUM_ETIKET = { taslak: "Taslak", gonderildi: "Gönderildi", onaylandi: "Onaylandı", iptal: "İptal" };

// ay: "YYYY-MM". Dönem etiketi için ayın ilk/son günü gg.aa.yyyy biçiminde üretilir.
export const hesaplaAylikRapor = ({ customers = [], services = [], partSales = [], payments = [], teklifler = [] }, ay, { factoryName = "Altuntaş Makina", kdvRates, factory = null, rates = null } = {}) => {
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

  // Müşteri adı çözümleme (servis/parça/ödeme kayıtları customerId tutar, adı bulundur) —
  // müşteri sonradan silinse bile ham customers dizisinden adı yakalanır, bulunamazsa "—".
  const custAdMap = new Map(customers.map(c => [String(c.id), c.name]));
  const custAdi = (id) => custAdMap.get(String(id)) || "—";

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

  // Firma firma satış detayı — o ay makina satılan her müşteri
  const satisDetay = satislar.map(c => ({
    firma: c.name || "—",
    model: c.model || "—",
    tutar: tekPara(c.currency, gercekBedel(c)),
    faturaTipi: c.faturali ? "Faturalı" : "Faturasız",
  }));

  // ── DİĞER SATIŞLAR ──────────────────────────────────────────────────────────
  const ayKalipSatislari = canliKalipSatislari.filter(p => ayIci(p.tarih));
  const extraKalip = ayKalipSatislari.filter(p => p.tur !== "YedekParca");
  const yedekParca = ayKalipSatislari.filter(p => p.tur === "YedekParca");
  const extraKalipTutar = {}, extraKalipKdv = {}, yedekParcaTutar = {};
  extraKalip.forEach(p => { if (!p.ucretsizMi) { paraEkle(extraKalipTutar, p.currency, p.ucret); paraEkle(extraKalipKdv, p.currency, calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates)); } });
  yedekParca.forEach(p => { if (!p.ucretsizMi) paraEkle(yedekParcaTutar, p.currency, p.ucret); });
  // Firma firma diğer satış detayı (extra kalıp / yedek parça alan müşteriler)
  const extraKalipDetay = extraKalip.map(p => ({
    firma: custAdi(p.customerId), adet: parseInt(p.miktar) || 1,
    tutar: p.ucretsizMi ? {} : tekPara(p.currency, p.ucret),
  }));
  const yedekParcaDetay = yedekParca.map(p => ({
    firma: custAdi(p.customerId), miktar: parseInt(p.miktar) || 1,
    tutar: p.ucretsizMi ? {} : tekPara(p.currency, p.ucret),
  }));

  // Anlaşmalı servis firmalarına satılan parçalar (Altuntaş dışı servislerdeki Altuntaş parçaları)
  const anlasmaliParcaTutar = {}, anlasmaliParcaKdv = {};
  const anlasmaliServisler = canliServisler.filter(s => ayIci(s.date) && isParcaUcretliMi(s) && !isAltuntasServisi(s, factoryName));
  anlasmaliServisler.forEach(s => {
    const cur = s.parcaCurrency || s.currency;
    const bedel = altuntasParcaBedeli(s);
    paraEkle(anlasmaliParcaTutar, cur, bedel);
    paraEkle(anlasmaliParcaKdv, cur, calcKDV(s.faturaTipi, bedel, s.date, kdvRates));
  });
  // Firma firma detay: hangi müşterinin makinasına, hangi anlaşmalı servis firması üzerinden parça satıldı
  const anlasmaliParcaDetay = anlasmaliServisler.map(s => {
    const bedel = altuntasParcaBedeli(s);
    const cur = s.parcaCurrency || s.currency;
    return {
      firma: custAdi(s.customerId), servisFirma: s.islemFirma || "—",
      tutar: tekPara(cur, bedel), kdv: tekPara(cur, calcKDV(s.faturaTipi, bedel, s.date, kdvRates)),
      odendi: s.odendi === true,
    };
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

  // Firma firma servis detayı — hangi firmaya servis verildi; işçilik, parça ücreti ve KDV ayrı ayrı.
  // (Sadece Altuntaş servisinin işçiliği/parçası tutar olarak sayılır; anlaşmalı firma servisleri
  // yukarıdaki "anlaşmalı parça" bölümünde. Yine de firma servis aldıysa listede görünür.)
  const servisDetay = ayServisler.map(s => {
    const iscilik = isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0;
    const parca = (isParcaUcretliMi(s) && isAltuntasServisi(s, factoryName)) ? altuntasParcaBedeli(s) : 0;
    return {
      firma: custAdi(s.customerId), tip: s.type || "Diğer", islemFirma: s.islemFirma || "—",
      iscilik: tekPara(s.currency, iscilik),
      parca: tekPara(s.parcaCurrency || s.currency, parca),
      kdv: tekPara(s.currency, iscilik + parca > 0 ? calcKDV(s.faturaTipi, iscilik + parca, s.date, kdvRates) : 0),
      odendi: s.odendi === true,
    };
  });

  // ── TAHSİLAT (gerçekleşen) ──────────────────────────────────────────────────
  const ayOdemeler = canliOdemeler.filter(p => ayIci(p.tarih));
  const gerceklesen = ayOdemeler.filter(isPaymentReceived);
  const bekleyenCekler = ayOdemeler.filter(p => p.yontem === "Çek" && !p.tahsilEdildi);
  const tahsilatTutar = {}, bekleyenCekTutar = {};
  gerceklesen.forEach(p => paraEkle(tahsilatTutar, p.currency, p.tutar));
  bekleyenCekler.forEach(p => paraEkle(bekleyenCekTutar, p.currency, p.tutar));
  // Firma firma tahsilat detayı — kimden, ne kadar, hangi yöntemle tahsil edildi
  const tahsilatDetay = gerceklesen.map(p => ({
    firma: custAdi(p.customerId), tutar: tekPara(p.currency, p.tutar),
    yontem: p.yontem || "Nakit", tarih: p.tarih || "", not: p.not || "",
  }));
  const bekleyenCekDetay = bekleyenCekler.map(p => ({
    firma: custAdi(p.customerId), tutar: tekPara(p.currency, p.tutar), vadeTarihi: p.vadeTarihi || "",
  }));

  // ── ALACAK DURUMU (rapor tarihi itibarıyla) ─────────────────────────────────
  const borclular = canliMusteriler.filter(c => customerHasAnyDebt(c, canliServisler, canliKalipSatislari, factoryName));
  const alacak = {};
  // Firma firma alacak detayı — her müşterinin toplam açık borcu ve borcun kaynak(lar)ı
  const alacakMap = new Map(); // id -> { firma, tutar:{}, kaynaklar:Set }
  const ekleAlacak = (id, cur, v, kaynak) => {
    const key = String(id);
    if (!alacakMap.has(key)) alacakMap.set(key, { firma: custAdi(id), tutar: {}, kaynaklar: new Set() });
    const rec = alacakMap.get(key);
    paraEkle(rec.tutar, cur, v);
    rec.kaynaklar.add(kaynak);
  };
  canliMusteriler.forEach(c => { if (parseMoney(c.kalanBorc) > 0) { paraEkle(alacak, c.currency, c.kalanBorc); ekleAlacak(c.id, c.currency, c.kalanBorc, "Makina bakiyesi"); } });
  canliServisler.filter(s => (isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s)) && s.odendi === false).forEach(s => {
    const toplam = (isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0) + (isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0);
    const kdvli = toplam + calcKDV(s.faturaTipi, toplam, s.date, kdvRates);
    paraEkle(alacak, s.currency, kdvli);
    ekleAlacak(s.customerId, s.currency, kdvli, "Servis");
  });
  canliKalipSatislari.filter(isPartSaleBorcluMu).forEach(p => {
    const kdvli = parseMoney(p.ucret) + calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates);
    paraEkle(alacak, p.currency, kdvli);
    ekleAlacak(p.customerId, p.currency, kdvli, p.tur === "YedekParca" ? "Yedek parça" : "Extra kalıp");
  });
  const alacakDetay = [...alacakMap.values()].map(x => ({ firma: x.firma, tutar: x.tutar, kaynaklar: [...x.kaynaklar] }));

  // ── TEKLİFLER ───────────────────────────────────────────────────────────────
  const ayTeklifler = canliTeklifler.filter(t => t.type === "teklif" && ayIci(t.tarih));
  const onaylanan = ayTeklifler.filter(t => t.durum === "onaylandi" || t.satisTamam === true).length;
  // Firma firma teklif detayı — tutar (teklif para biriminde), durum, satışa dönüp dönmediği
  const teklifDetay = ayTeklifler.map(t => ({
    firma: t.firma || custAdi(t.customerId),
    tutar: tekPara(t.currency, teklifToplami(t)),
    durum: (t.satisTamam === true && t.durum !== "onaylandi") ? "Satışa döndü" : (TEKLIF_DURUM_ETIKET[t.durum] || t.durum || "—"),
    tarih: t.tarih || "",
  }));

  // ── YÖNETİCİ ÖZETİ + KDV BEYANNAME ÖZETİ ────────────────────────────────────
  // Her tutar kendi para biriminde tutulur; rates ({usd,eur}) verilirse yaklaşık TL toplamı
  // da eklenir (yalnızca bilgi amaçlı, kur App.jsx'te tek noktadan çekilir).
  const toTL = (obj) => {
    let s = obj.TRY || 0;
    if (rates?.usd) s += (obj.USD || 0) * rates.usd;
    if (rates?.eur) s += (obj.EUR || 0) * rates.eur;
    return s;
  };
  const topla = (...objs) => { const r = {}; objs.forEach(o => { for (const k in (o || {})) r[k] = (r[k] || 0) + o[k]; }); return r; };
  // Toplam ciro (KDV hariç net): makina + işçilik + Altuntaş servis parçası + extra kalıp + yedek parça + anlaşmalı parça
  const ciroNet = topla(satisTutar, iscilikTutar, servisParcaTutar, extraKalipTutar, yedekParcaTutar, anlasmaliParcaTutar);
  // Bu ay doğan toplam KDV (beyanname özeti): satış + servis/parça + extra kalıp + anlaşmalı parça
  const toplamKdv = topla(satisKdv, servisKdv, extraKalipKdv, anlasmaliParcaKdv);
  const ozet = {
    ciroNet, tahsilat: tahsilatTutar, alacak,
    ciroNetTL: rates ? toTL(ciroNet) : null,
    tahsilatTL: rates ? toTL(tahsilatTutar) : null,
    alacakTL: rates ? toTL(alacak) : null,
    toplamKdv, toplamKdvTL: rates ? toTL(toplamKdv) : null,
  };

  return {
    ay,
    ayEtiketi: new Date(yil, ayNo - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    donem: `${fmtD(1)} - ${fmtD(gunSayisi)}`,
    olusturmaTarihi: new Date().toLocaleDateString("tr-TR"),
    // Satışlar
    satisAdet: satislar.length, satisTutar, faturaTutar, satisKdv, komisyonTutar, ikinciElAdet,
    modelKirilimi, satisYapanKirilimi, satisDetay,
    // Diğer satışlar
    extraKalipAdet: extraKalip.length, extraKalipTutar, extraKalipKdv, extraKalipDetay,
    yedekParcaAdet: yedekParca.length, yedekParcaTutar, yedekParcaDetay,
    anlasmaliParcaTutar, anlasmaliParcaDetay,
    // Servis
    servisAdet: ayServisler.length, iscilikTutar, servisParcaTutar, servisKdv, servisKirilimi, servisDetay,
    // Tahsilat
    tahsilatAdet: gerceklesen.length, tahsilatTutar, tahsilatDetay,
    bekleyenCekAdet: bekleyenCekler.length, bekleyenCekTutar, bekleyenCekDetay,
    cekTahsilAdet: ayOdemeler.filter(p => p.yontem === "Çek" && p.tahsilEdildi).length,
    // Alacak (rapor anı)
    borcluFirma: borclular.length, acikBorc: alacak, alacakDetay,
    gecikenCek: canliOdemeler.filter(isCekVadesiGecmis).length,
    gecikenTaksit: canliMusteriler.filter(taksitGecikmisMi).length,
    // Teklifler
    teklifAdet: ayTeklifler.length, onaylananTeklif: onaylanan, teklifDetay,
    bekleyenTeklif: canliTeklifler.filter(t => t.type === "teklif" && t.durum === "gonderildi").length,
    // Yönetici özeti + KDV beyanname özeti
    ozet, toplamKdv, anlasmaliParcaKdv,
    kdvKalemleri: { satis: satisKdv, servis: servisKdv, extraKalip: extraKalipKdv, anlasmaliParca: anlasmaliParcaKdv },
  };
};

// "YYYY-MM" bir ay geri
export const oncekiAyStr = (ay) => {
  const [y, m] = String(ay).split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
