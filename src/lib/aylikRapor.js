// Aylık Faaliyet Raporu hesap motoru — saf fonksiyon, ekrandaki Finance hesaplarıyla
// AYNI gelir kurallarını kullanır (Altuntaş servisi / ücretli tip / Altuntaş parçası /
// çek ancak tahsil edilince tahsilattır). TL'ye çevirme yapılmaz: her tutar kendi para
// biriminde `{ TRY, USD, EUR }` nesnesi olarak döner (yalnızca geçen anahtarlar).
import {
  parseMoney, calcKDV, isServisUcretliMi, isParcaUcretliMi,
  altuntasParcaBedeli, isPaymentReceived, isCekVadesiGecmis, taksitGecikmisMi,
  isPartSaleBorcluMu, resolveSatisYapan, isAltuntasServisi, satisTahsilEdildi, faturaBedeliOf,
  normalizeSaleType, tahsilatTarihiOf,
} from "./utils";
import { SALE_TYPES } from "./constants";
import { yansitilanKomisyon, kartTahsilEdildiMi } from "./krediKarti";
import { sahipsizHaric } from "./sahipsiz";

const paraEkle = (obj, cur, v) => { const k = cur || "TRY"; obj[k] = (obj[k] || 0) + (parseMoney(v) || 0); };
// Tek kayıt için tek para birimli tutar nesnesi ({TRY:...} gibi) — detay satırlarında kullanılır
const tekPara = (cur, v) => { const o = {}; paraEkle(o, cur, v); return o; };
// Teklif toplamı: satırlar → subItems birimFiyat × miktar (ekrandaki teklif hesabıyla aynı formül)
const teklifToplami = (t) => (t.satirlar || []).reduce((s, r) =>
  s + (r.subItems || []).reduce((s2, it) => s2 + (parseMoney(it.birimFiyat) || 0) * (parseFloat(it.miktar) || 0), 0), 0);
const TEKLIF_DURUM_ETIKET = { taslak: "Taslak", gonderildi: "Gönderildi", onaylandi: "Onaylandı", iptal: "İptal" };
// Tarihe göre eskiden yeniye sıralama (ISO "YYYY-MM-DD" string karşılaştırması; tarihsiz en sona).
const tariheGore = (a, b) => (a.tarih || "9999").localeCompare(b.tarih || "9999");
// Fatura tipi kırılımı biriktirici: kaydı 4 SALE_TYPES'tan birine (net/KDV/adet) ekler.
const ftEkle = (map, faturaTipiRaw, cur, net, kdv, adetInc) => {
  const t = normalizeSaleType(faturaTipiRaw);
  if (!map[t]) map[t] = { net: {}, kdv: {}, adet: 0 };
  if (net) paraEkle(map[t].net, cur, net);
  if (kdv) paraEkle(map[t].kdv, cur, kdv);
  map[t].adet += adetInc || 0;
};
const ftSirali = (map) => SALE_TYPES.filter(t => map[t]).map(t => ({ faturaTipi: t, ...map[t] }));
// Teslim şekli / genel anahtarlı kırılım biriktirici (kargo/fabrikaTeslim… → net/KDV/adet).
const kovaEkle = (map, key, cur, net, kdv) => {
  if (!map[key]) map[key] = { net: {}, kdv: {}, adet: 0 };
  if (net) paraEkle(map[key].net, cur, net);
  if (kdv) paraEkle(map[key].kdv, cur, kdv);
  map[key].adet += 1;
};

// ay: "YYYY-MM". Dönem etiketi için ayın ilk/son günü gg.aa.yyyy biçiminde üretilir.
export const hesaplaAylikRapor = ({ customers = [], services = [], partSales = [], payments = [], teklifler = [], dealers = [], yedekParcaSatislar = [] }, ay, { factoryName = "Altuntaş Makina", kdvRates, factory = null, rates = null } = {}) => {
  const [yil, ayNo] = String(ay).split("-").map(Number);
  const ayIci = (t) => !!t && String(t).slice(0, 7) === ay;
  const gunSayisi = new Date(yil, ayNo, 0).getDate();
  const fmtD = (g) => `${String(g).padStart(2, "0")}.${String(ayNo).padStart(2, "0")}.${yil}`;

  // deletedAt her koleksiyonda burada filtrelenir (prop ön-filtresine güvenilmez)
  const canliMusteriler = customers.filter(c => !c.deletedAt);
  // Sahipsiz kayıtlar (müşterisi canlı müşteriler arasında olmayan servis/kalıp/yedek parça/ödeme)
  // rapora HİÇ girmez — kullanıcı kararı ("—" satırı olmasın). Adedi raporun altına not düşülür;
  // temizlik Ayarlar > Veri Yönetimi > Sahipsiz Kayıtlar'dan. Finans ekranı aynı süzgeci uygular.
  const sahipsiz = sahipsizHaric(canliMusteriler, {
    services: services.filter(s => !s.deletedAt),
    partSales: partSales.filter(p => !p.deletedAt),
    yedekParcaSatislar: yedekParcaSatislar.filter(s => !s.deletedAt),
    payments: payments.filter(p => !p.deletedAt),
  }, dealers.filter(d => !d.deletedAt));
  const canliServisler = sahipsiz.services;
  const canliKalipSatislari = sahipsiz.partSales;
  const canliOdemeler = sahipsiz.payments;
  const canliTeklifler = teklifler.filter(t => !t.deletedAt);
  const canliYedekKargo = sahipsiz.yedekParcaSatislar;
  const sahipsizAdet = sahipsiz.sahipsizAdet;

  // Müşteri adı çözümleme (servis/parça/ödeme kayıtları customerId tutar, adı bulundur) —
  // müşteri sonradan silinse bile ham customers dizisinden adı yakalanır, bulunamazsa "—".
  const custAdMap = new Map(customers.map(c => [String(c.id), c.name]));
  const custAdi = (id) => custAdMap.get(String(id)) || "—";
  // Yedek parça (kargo ve fabrika teslim) alıcısının adı — müşteri / bayi / anlaşmasız dış firma (ekrandaki aliciAd ile aynı).
  const dealerAdi = (id) => dealers.find(d => d.id === Number(id))?.name || "—";
  const kargoAlici = (s) => s.aliciTipi === "musteri" ? custAdi(s.musteriId) : s.disFirma ? (s.disFirmaAd || "Dış firma") : dealerAdi(s.dealerId);
  const kargoBedeli = (s) => (parseInt(s.miktar) || 0) * parseMoney(s.birimFiyat);

  // ── SATIŞLAR ────────────────────────────────────────────────────────────────
  const satislar = canliMusteriler.filter(c => !c.isResale && ayIci(c.installDate));
  const gercekBedel = (c) => parseMoney(c.fabrikaSatisBedeli) > 0 ? c.fabrikaSatisBedeli : faturaBedeliOf(c);
  const satisTutar = {}, faturaTutar = {}, satisKdv = {}, komisyonTutar = {}, makinaFatura = {};
  satislar.forEach(c => {
    const kdv = calcKDV(c.faturali, c.faturaBedeli, c.installDate, kdvRates);
    paraEkle(satisTutar, c.currency, gercekBedel(c));
    paraEkle(faturaTutar, c.currency, faturaBedeliOf(c));
    paraEkle(satisKdv, c.currency, kdv);
    paraEkle(komisyonTutar, c.currency, c.komisyon);
    ftEkle(makinaFatura, c.faturali, c.currency, gercekBedel(c), kdv, 1);
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

  // Firma firma satış detayı — o ay makina satılan her müşteri (eskiden yeniye)
  const satisDetay = satislar.map(c => ({
    firma: c.name || "—",
    tarih: c.installDate || "",
    model: c.model || "—",
    tutar: tekPara(c.currency, gercekBedel(c)),
    faturaTipi: normalizeSaleType(c.faturali),
  })).sort(tariheGore);

  // ── EXTRA KALIP SATIŞLARI ────────────────────────────────────────────────────
  // Not: Eski partSales tur "YedekParca" yolu kaldırıldı (artık hiçbir formda üretilmiyor); tüm
  // partSales Extra Kalıp'tır. Gerçek yedek parça satışı ayrı `yedekParcaSatislar` (kargo) dizisidir.
  const ayKalipSatislari = canliKalipSatislari.filter(p => ayIci(p.tarih));
  const extraKalip = ayKalipSatislari;
  const extraKalipTutar = {}, extraKalipKdv = {}, kalipFatura = {};
  const extraKalipTeslim = {}; // kargo / fabrikaTeslim → {net,kdv,adet}
  const kalipTeslimKey = (p) => p.fabrikaTeslim ? "fabrikaTeslim" : "kargo";
  // Yansıtılan komisyon KDV matrahında (p.ucret grossed) ama gelirde değil → tutardan düş, KDV'den düşme.
  extraKalip.forEach(p => {
    if (p.ucretsizMi) return;
    const net = parseMoney(p.ucret) - yansitilanKomisyon(p);
    const kdv = calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates);
    paraEkle(extraKalipTutar, p.currency, net);
    paraEkle(extraKalipKdv, p.currency, kdv);
    ftEkle(kalipFatura, p.faturaTipi, p.currency, net, kdv, 1);
    kovaEkle(extraKalipTeslim, kalipTeslimKey(p), p.currency, net, kdv);
  });
  // Firma firma detay (eskiden yeniye)
  const extraKalipDetay = extraKalip.map(p => ({
    firma: custAdi(p.customerId), tarih: p.tarih || "", adet: parseInt(p.miktar) || 1,
    teslimSekli: p.fabrikaTeslim ? "Fabrika Teslim" : "Kargo",
    tutar: p.ucretsizMi ? {} : tekPara(p.currency, p.ucret),
  })).sort(tariheGore);

  // ── YEDEK PARÇA (KARGO) SATIŞLARI — ayrı dizi (partSales'ten bağımsız; alıcı bayi/dış firma VEYA müşteri) ──
  // Ekrandaki Finance ile AYNI kural: müşteriye satış "Toplam Parça Ücreti", bayi/dış firmaya satış
  // "Anlaşmalı/Bayi Parça" tarafında sayılır. Rapora net bedel (ciroNet) + KDV (toplamKdv) olarak katılır.
  // Tutar girilmemiş (bedeli 0) satışlar da listede görünür (kullanıcı isteği): adet/detayda yer alır,
  // para toplamlarına 0 ekler. Yalnız tahsilat/alacak para akışında >0 koşulu ayrıca uygulanır.
  const ayYedekKargo = canliYedekKargo.filter(s => ayIci(s.tarih));
  // Teslim şekli: fabrikaTeslim bayrağı → "Fabrika Teslim"; panoya kargo olarak düşmüşse "Kargo";
  // hiç panoya gönderilmemiş satış "Panoya gönderilmedi" (yine de gelir/alacak sayılır).
  const teslimSekli = (s) => s.fabrikaTeslim ? "Fabrika Teslim" : (s.kargoDurum ? "Kargo" : "Panoya gönderilmedi");
  const aliciTuru = (s) => s.aliciTipi === "musteri" ? "Müşteri" : s.disFirma ? "Anlaşmasız Servis" : "Bayi";
  const yedekKargoTutar = {}, yedekKargoKdv = {}, yedekKargoMusteriTutar = {}, yedekKargoBayiTutar = {}, kargoFatura = {};
  const yedekKargoTeslim = { kargo: 0, fabrikaTeslim: 0, gonderilmedi: 0 };
  const yedekKargoTeslimTutar = {}; // kargo / fabrikaTeslim / gonderilmedi → {net,kdv,adet}
  const kargoTeslimKey = (s) => s.fabrikaTeslim ? "fabrikaTeslim" : (s.kargoDurum ? "kargo" : "gonderilmedi");
  let yedekKargoMiktar = 0;
  ayYedekKargo.forEach(s => {
    const bedel = kargoBedeli(s), c = s.currency;
    yedekKargoMiktar += parseInt(s.miktar) || 0;
    const yk = yansitilanKomisyon(s); // gelirde değil, KDV matrahında → tutardan düş
    const net = bedel - yk;
    const kdv = calcKDV(s.faturaTipi, bedel, s.tarih, kdvRates);
    paraEkle(yedekKargoTutar, c, net);
    paraEkle(s.aliciTipi === "musteri" ? yedekKargoMusteriTutar : yedekKargoBayiTutar, c, net);
    paraEkle(yedekKargoKdv, c, kdv);
    ftEkle(kargoFatura, s.faturaTipi, c, net, kdv, 1);
    kovaEkle(yedekKargoTeslimTutar, kargoTeslimKey(s), c, net, kdv);
    if (s.fabrikaTeslim) yedekKargoTeslim.fabrikaTeslim++;
    else if (s.kargoDurum) yedekKargoTeslim.kargo++;
    else yedekKargoTeslim.gonderilmedi++;
  });
  const yedekKargoDetay = ayYedekKargo.map(s => ({
    firma: kargoAlici(s),
    tarih: s.tarih || "",
    aliciTuru: aliciTuru(s),
    teslimSekli: teslimSekli(s),
    miktar: parseInt(s.miktar) || 0,
    tutar: tekPara(s.currency, kargoBedeli(s)),
    kdv: tekPara(s.currency, calcKDV(s.faturaTipi, kargoBedeli(s), s.tarih, kdvRates)),
    odendi: s.odendi === true,
  })).sort(tariheGore);

  // Detay satırında ödeme yöntemi: kredi kartıyla ödenen kayıt "Ödendi" görünür ama para blokaj
  // süresince hesaba geçmemiştir; rapor bunu Durum sütununda belirtir (yöntem + hesaba geçiş günü).
  const odemeBilgisi = (s) => ({
    yontem: s.yontem || "",
    kkBlokajda: s.odendi === true && s.yontem === "Kredi Kartı" && !kartTahsilEdildiMi(s.kartKomisyonu),
    kkHesabaGecis: s.yontem === "Kredi Kartı" ? (s.kartKomisyonu?.hesabaGecis || "") : "",
  });

  // Anlaşmalı servis firmalarına satılan parçalar (Altuntaş dışı servislerdeki Altuntaş parçaları)
  const anlasmaliParcaTutar = {}, anlasmaliParcaKdv = {};
  const anlasmaliServisler = canliServisler.filter(s => ayIci(s.date) && isParcaUcretliMi(s) && !isAltuntasServisi(s, factoryName));
  anlasmaliServisler.forEach(s => {
    const cur = s.parcaCurrency || s.currency;
    const bedel = altuntasParcaBedeli(s);
    paraEkle(anlasmaliParcaTutar, cur, bedel);
    paraEkle(anlasmaliParcaKdv, cur, calcKDV(s.faturaTipi, bedel, s.date, kdvRates));
  });
  // Firma firma detay: hangi müşterinin makinasına, hangi anlaşmalı servis firması üzerinden parça satıldı (eskiden yeniye)
  const anlasmaliParcaDetay = anlasmaliServisler.map(s => {
    const bedel = altuntasParcaBedeli(s);
    const cur = s.parcaCurrency || s.currency;
    return {
      firma: custAdi(s.customerId), tarih: s.date || "", servisFirma: s.islemFirma || "—",
      tutar: tekPara(cur, bedel), kdv: tekPara(cur, calcKDV(s.faturaTipi, bedel, s.date, kdvRates)),
      odendi: s.odendi === true,
      ...odemeBilgisi(s),
    };
  }).sort(tariheGore);

  // ── BAKIM ONARIM (SERVİS) ────────────────────────────────────────────────────
  // Bölüm geliri = işçilik (Altuntaş, ücretli) + Altuntaş parça + anlaşmalı servis parçası.
  // Fatura tipi ve onarım yeri kırılımları bölüm net toplamıyla birebir tutar (yansıtılan komisyon
  // düzeltmesi aşağıdaki ikinci turda hepsinden orantılı düşülür).
  const ayServisler = canliServisler.filter(s => ayIci(s.date));
  const iscilikTutar = {}, servisParcaTutar = {}, servisKdv = {}, servisFatura = {}, onarimYeriMap = {};
  ayServisler.forEach(s => {
    const iscilik = isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0;
    const parcaAlt = (isParcaUcretliMi(s) && isAltuntasServisi(s, factoryName)) ? altuntasParcaBedeli(s) : 0;
    const parcaTum = isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0; // Altuntaş + anlaşmalı (bölüm geliri)
    const parcaCur = s.parcaCurrency || s.currency;
    if (iscilik) paraEkle(iscilikTutar, s.currency, iscilik);
    if (parcaAlt) paraEkle(servisParcaTutar, parcaCur, parcaAlt);
    if (iscilik + parcaAlt > 0) paraEkle(servisKdv, s.currency, calcKDV(s.faturaTipi, iscilik + parcaAlt, s.date, kdvRates));
    // Fatura tipi kırılımı (işçilik + tüm parça): net + KDV, her servis 1 adet
    if (iscilik > 0) ftEkle(servisFatura, s.faturaTipi, s.currency, iscilik, calcKDV(s.faturaTipi, iscilik, s.date, kdvRates), 0);
    if (parcaTum > 0) ftEkle(servisFatura, s.faturaTipi, parcaCur, parcaTum, calcKDV(s.faturaTipi, parcaTum, s.date, kdvRates), 0);
    ftEkle(servisFatura, s.faturaTipi, s.currency, 0, 0, 1);
    // Onarım yeri kırılımı: adet + net gelir (işçilik + tüm parça)
    const yer = s.repairPlace || "Belirtilmemiş";
    if (!onarimYeriMap[yer]) onarimYeriMap[yer] = { adet: 0, net: {} };
    onarimYeriMap[yer].adet += 1;
    if (iscilik > 0) paraEkle(onarimYeriMap[yer].net, s.currency, iscilik);
    if (parcaTum > 0) paraEkle(onarimYeriMap[yer].net, parcaCur, parcaTum);
  });
  // Yansıtılan komisyon (servis+parça matrahına gömülü) gelire girmemeli → işçilik/parça oranında düş.
  // Altuntaş dışı serviste parça payı anlasmaliParcaTutar'dan düşülür (o dizide toplandığı için).
  ayServisler.forEach(s => {
    const yk = yansitilanKomisyon(s);
    if (yk <= 0) return;
    const isc = isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0;
    const par = isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0;
    const tot = isc + par;
    if (tot <= 0) return;
    if (isc > 0) { paraEkle(iscilikTutar, s.currency, -yk * isc / tot); ftEkle(servisFatura, s.faturaTipi, s.currency, -yk * isc / tot, 0, 0); }
    if (par > 0) {
      const parCur = s.parcaCurrency || s.currency;
      paraEkle(isAltuntasServisi(s, factoryName) ? servisParcaTutar : anlasmaliParcaTutar, parCur, -yk * par / tot);
      ftEkle(servisFatura, s.faturaTipi, parCur, -yk * par / tot, 0, 0);
    }
  });
  // Onarım yeri kırılımı sabit sıra (Yerinde / Fabrikada / Fabrika Teslim) + kalanlar
  const onarimYeriSirasi = ["Yerinde Onarım", "Fabrikada Onarım", "Fabrika Teslim"];
  const onarimYeriKirilimi = Object.keys(onarimYeriMap)
    .sort((a, b) => (onarimYeriSirasi.indexOf(a) + 1 || 99) - (onarimYeriSirasi.indexOf(b) + 1 || 99))
    .map(yer => ({ yer, adet: onarimYeriMap[yer].adet, net: onarimYeriMap[yer].net }));
  const servisTipMap = {};
  ayServisler.forEach(s => { const k = s.type || "Diğer"; servisTipMap[k] = (servisTipMap[k] || 0) + 1; });
  const servisKirilimi = Object.entries(servisTipMap).sort((a, b) => b[1] - a[1]).map(([tip, adet]) => ({ tip, adet }));

  // Firma firma servis detayı — hangi firmaya BİZ servis verdik; işçilik, parça ücreti ve KDV ayrı ayrı.
  // Anlaşmalı/dış firmanın yaptığı servisler bu listede YOK (kullanıcı kararı: "bizim tarafımızdan
  // yapılmadı, iki kere yazmasın") — onlar yalnız "Anlaşmalı servislere parça" tablosunda görünür.
  // Kayıt adedi (servisAdet) ve kırılımlar yine tüm servisleri sayar.
  const servisDetay = ayServisler.filter(s => isAltuntasServisi(s, factoryName)).map(s => {
    const iscilik = isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0;
    const parca = (isParcaUcretliMi(s) && isAltuntasServisi(s, factoryName)) ? altuntasParcaBedeli(s) : 0;
    return {
      firma: custAdi(s.customerId), tarih: s.date || "", tip: s.type || "Diğer", islemFirma: s.islemFirma || "—",
      iscilik: tekPara(s.currency, iscilik),
      parca: tekPara(s.parcaCurrency || s.currency, parca),
      kdv: tekPara(s.currency, iscilik + parca > 0 ? calcKDV(s.faturaTipi, iscilik + parca, s.date, kdvRates) : 0),
      odendi: s.odendi === true,
      // Ücretsiz verilen servis: ne işçilik ne ücretli parça var (fiyat girilmemiş; "ödendi" işareti
      // kullanıcı için "kapatıldı" anlamına gelir). Raporda "Ödendi" yerine "Ücretsiz" etiketlenir.
      ucretsiz: !(isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s)),
      ...odemeBilgisi(s),
    };
  }).sort(tariheGore);
  // Ücretli / ücretsiz servis sayıları — özet ve bölümde "12 servis · 9 ücretli · 3 ücretsiz" için.
  const servisUcretliAdet = ayServisler.filter(s => isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s)).length;
  const servisUcretsizAdet = ayServisler.length - servisUcretliAdet;

  // ── TAHSİLAT (gerçekleşen) ──────────────────────────────────────────────────
  const ayOdemeler = canliOdemeler.filter(p => ayIci(p.tarih));
  const gerceklesen = ayOdemeler.filter(isPaymentReceived);
  const bekleyenCekler = ayOdemeler.filter(p => p.yontem === "Çek" && !p.tahsilEdildi);
  const tahsilatTutar = {}, bekleyenCekTutar = {};
  bekleyenCekler.forEach(p => paraEkle(bekleyenCekTutar, p.currency, p.tutar));
  // Extra Kalıp + yedek parça (kargo) satışlarının bu ay TAHSİL EDİLEN (satisTahsilEdildi) tutarları da
  // tahsilata katılır (kullanıcı kararı). Tutar KDV DAHİLdir (müşteri KDV dahil öder). Satışlarda ayrı
  // bir tahsilat tarihi yok → ay ölçütü satış tarihidir. Çek ancak tahsil edilince buraya girer.
  // Bir makina ödemesindeki (payment) KDV: fatura tipine göre KDV DAHİL tutardan ayrılır (KK yansıtmada
  // komisyon payı hariç tutulur — ekrandaki Finance ile aynı). Faturasız/yurtdışı müşteride 0.
  const odemeKdv = (p) => {
    const c = customers.find(x => String(x.id) === String(p.customerId));
    const oran = c ? calcKDV(c.faturali, 100, p.tarih, kdvRates) : 0;
    if (oran <= 0) return 0;
    const tutar = parseMoney(p.tutar);
    const kom = (p.yontem === "Kredi Kartı" && p.kartKomisyonu && p.kartKomisyonu.yansitildi) ? Number(p.kartKomisyonu.toplamKesinti) || 0 : 0;
    const mal = (tutar - kom * oran / 100) / (1 + oran / 100);
    return tutar - mal;
  };
  // Satış/servis tahsilatları — ay ölçütü TAHSİLAT TARİHİ (tahsilatTarihiOf: tahsilatTarihi / KK hesabaGecis /
  // yoksa satış-servis tarihi). Bu yüzden yalnız o ayın satışları değil, tahsilat tarihi o ayda olan TÜM
  // tahsil edilmiş (satisTahsilEdildi) kayıtlar taranır. Böylece ağustos işi ekimde ödenince ekime düşer.
  // Tutar/KDV yine satış tarihinin KDV oranıyla hesaplanır; yalnız ay grubu tahsilat tarihine göredir.
  const satisTahsilatlari = [
    ...canliServisler.filter(s => (isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s)) && satisTahsilEdildi(s) && ayIci(tahsilatTarihiOf(s, s.date))).map(s => {
      const toplam = (isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0) + (isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0);
      const kdv = calcKDV(s.faturaTipi, toplam, s.date, kdvRates);
      return {
        firma: custAdi(s.customerId), currency: s.currency, tutar: toplam + kdv, kdv,
        yontem: s.yontem || "Nakit", tarih: tahsilatTarihiOf(s, s.date), not: "Bakım onarım", kaynak: "Bakım onarım",
      };
    }),
    ...canliKalipSatislari.filter(p => !p.ucretsizMi && satisTahsilEdildi(p) && ayIci(tahsilatTarihiOf(p, p.tarih))).map(p => {
      const kdv = calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates);
      return {
        firma: custAdi(p.customerId), currency: p.currency, tutar: parseMoney(p.ucret) + kdv, kdv,
        yontem: p.yontem || "Nakit", tarih: tahsilatTarihiOf(p, p.tarih), not: "Extra kalıp", kaynak: "Extra kalıp",
      };
    }),
    ...canliYedekKargo.filter(s => satisTahsilEdildi(s) && kargoBedeli(s) > 0 && ayIci(tahsilatTarihiOf(s, s.tarih))).map(s => {
      const kdv = calcKDV(s.faturaTipi, kargoBedeli(s), s.tarih, kdvRates);
      return {
        firma: kargoAlici(s), currency: s.currency, tutar: kargoBedeli(s) + kdv, kdv,
        yontem: s.yontem || "Nakit", tarih: tahsilatTarihiOf(s, s.tarih), not: "Yedek parça (kargo ve fabrika teslim)", kaynak: "Yedek parça (kargo ve fabrika teslim)",
      };
    }),
  ];
  // Birleşik tahsilat listesi: ödeme defteri (makina) + satış tahsilatları (bakım onarım/kalıp/yedek parça).
  const tumTahsilatlar = [
    ...gerceklesen.map(p => ({ firma: custAdi(p.customerId), currency: p.currency, tutar: parseMoney(p.tutar), kdv: odemeKdv(p), yontem: p.yontem || "Nakit", tarih: p.tarih || "", not: p.not || "", kaynak: "Makina ödemesi" })),
    ...satisTahsilatlari,
  ];
  // tahsilatTutar = KDV DAHİL giren para; tahsilatKdv = içindeki KDV; tahsilatNet = KDV hariç kısım.
  const tahsilatKdv = {};
  tumTahsilatlar.forEach(t => { paraEkle(tahsilatTutar, t.currency, t.tutar); paraEkle(tahsilatKdv, t.currency, t.kdv || 0); });
  const subObj2 = (a, b) => { const r = { ...a }; for (const k in b) r[k] = (r[k] || 0) - b[k]; return r; };
  const tahsilatNet = subObj2(tahsilatTutar, tahsilatKdv);
  // Kaynak kırılımı — giren para nereden geldi; her kaynak KDV hariç (net) + içindeki KDV.
  const tahsilatKaynakMap = {};
  tumTahsilatlar.forEach(t => {
    const k = t.kaynak || "Makina ödemesi";
    if (!tahsilatKaynakMap[k]) tahsilatKaynakMap[k] = { tutar: {}, net: {}, kdv: {}, adet: 0 };
    paraEkle(tahsilatKaynakMap[k].tutar, t.currency, t.tutar);
    paraEkle(tahsilatKaynakMap[k].kdv, t.currency, t.kdv || 0);
    paraEkle(tahsilatKaynakMap[k].net, t.currency, t.tutar - (t.kdv || 0));
    tahsilatKaynakMap[k].adet++;
  });
  const TAHSILAT_KAYNAK_SIRA = ["Makina ödemesi", "Bakım onarım", "Extra kalıp", "Yedek parça (kargo ve fabrika teslim)"];
  const tahsilatKaynakKirilimi = TAHSILAT_KAYNAK_SIRA.filter(k => tahsilatKaynakMap[k]).map(k => ({ kaynak: k, tutar: tahsilatKaynakMap[k].tutar, net: tahsilatKaynakMap[k].net, kdv: tahsilatKaynakMap[k].kdv, adet: tahsilatKaynakMap[k].adet }));
  // Firma firma tahsilat detayı — kimden, ne kadar, hangi yöntemle tahsil edildi.
  // Tarihe göre en eskiden en yeniye sıralı (tarih ISO "YYYY-MM-DD" → string karşılaştırması;
  // tarihsiz kayıtlar en sona). Ödeme defteri + satış tahsilatları karışık geldiği için burada sıralanır.
  const tahsilatDetay = tumTahsilatlar
    .slice()
    .sort((a, b) => (a.tarih || "9999").localeCompare(b.tarih || "9999"))
    .map(t => ({
      firma: t.firma, tutar: tekPara(t.currency, t.tutar), yontem: t.yontem, tarih: t.tarih, not: t.not,
    }));
  const bekleyenCekDetay = bekleyenCekler.map(p => ({
    firma: custAdi(p.customerId), tutar: tekPara(p.currency, p.tutar), vadeTarihi: p.vadeTarihi || "",
  }));
  // Yöntem kırılımı — gerçekleşen tahsilatın Nakit / Kredi Kartı / Çek vb. dağılımı (para birimi başına).
  const tahsilatYontemMap = {};
  tumTahsilatlar.forEach(t => { const y = t.yontem || "Nakit"; if (!tahsilatYontemMap[y]) tahsilatYontemMap[y] = {}; paraEkle(tahsilatYontemMap[y], t.currency, t.tutar); });
  const tahsilatYontemKirilimi = Object.entries(tahsilatYontemMap)
    .map(([yontem, tutar]) => ({ yontem, tutar, adet: tumTahsilatlar.filter(t => (t.yontem || "Nakit") === yontem).length }))
    .sort((a, b) => b.adet - a.adet);

  // ── ALACAK DURUMU (rapor tarihi itibarıyla) ─────────────────────────────────
  const alacak = {};
  // Firma firma alacak detayı — her müşterinin toplam açık borcu ve borcun kaynak(lar)ı
  const alacakMap = new Map(); // id -> { firma, tutar:{}, kaynaklar:Set }
  const alacakKaynakMap = {}; // kaynak -> {cur: tutar} (özet kutusundaki "ne için" kırılımı)
  const ekleAlacak = (id, cur, v, kaynak) => ekleAlacakAd(String(id), custAdi(id), cur, v, kaynak);
  // Ad-anahtarlı ekleme — müşteri olmayan borçlular (bayi / dış firma yedek parça kargosu) için.
  const ekleAlacakAd = (key, firma, cur, v, kaynak) => {
    if (!alacakMap.has(key)) alacakMap.set(key, { firma, tutar: {}, kaynaklar: new Set() });
    const rec = alacakMap.get(key);
    paraEkle(rec.tutar, cur, v);
    rec.kaynaklar.add(kaynak);
    if (!alacakKaynakMap[kaynak]) alacakKaynakMap[kaynak] = {};
    paraEkle(alacakKaynakMap[kaynak], cur, v);
  };
  // Yaşlandırma (aging): her açık borç kalemini yaşına (bugün − ilgili tarih) göre 0-30/31-60/61-90/90+
  // kovasına dağıt; kova başına toplam tutar + kaç ayrı firma. Referans tarih rapor anı (bugün).
  const bugunMs = Date.now();
  const yasGunu = (iso) => { if (!iso) return null; const d = new Date(iso); return isNaN(d.getTime()) ? null : Math.floor((bugunMs - d.getTime()) / 86400000); };
  const yasKovaAdi = (g) => g == null ? "90+ gün" : g <= 30 ? "0-30 gün" : g <= 60 ? "31-60 gün" : g <= 90 ? "61-90 gün" : "90+ gün";
  const YAS_SIRA = ["0-30 gün", "31-60 gün", "61-90 gün", "90+ gün"];
  const yasMap = {};
  const yasEkle = (firmKey, date, cur, v) => {
    const ad = yasKovaAdi(yasGunu(date));
    if (!yasMap[ad]) yasMap[ad] = { tutar: {}, firmalar: new Set() };
    paraEkle(yasMap[ad].tutar, cur, v);
    yasMap[ad].firmalar.add(String(firmKey));
  };
  canliMusteriler.forEach(c => { if (parseMoney(c.kalanBorc) > 0) { paraEkle(alacak, c.currency, c.kalanBorc); ekleAlacak(c.id, c.currency, c.kalanBorc, "Makina bakiyesi"); yasEkle(c.id, c.installDate, c.currency, parseMoney(c.kalanBorc)); } });
  // Çek tahsil edilmemiş / kredi kartı bloke (tek çekim, hesaba geçmemiş) servisler de alacak (satisTahsilEdildi false).
  canliServisler.filter(s => (isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s)) && !satisTahsilEdildi(s)).forEach(s => {
    const toplam = (isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0) + (isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0);
    const kdvli = toplam + calcKDV(s.faturaTipi, toplam, s.date, kdvRates);
    paraEkle(alacak, s.currency, kdvli);
    ekleAlacak(s.customerId, s.currency, kdvli, "Servis");
    yasEkle(s.customerId, s.date, s.currency, kdvli);
  });
  canliKalipSatislari.filter(isPartSaleBorcluMu).forEach(p => {
    const kdvli = parseMoney(p.ucret) + calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates);
    paraEkle(alacak, p.currency, kdvli);
    ekleAlacak(p.customerId, p.currency, kdvli, "Extra kalıp");
    yasEkle(p.customerId, p.tarih, p.currency, kdvli);
  });
  // Ödenmemiş yedek parça (kargo) satışları — müşteri alıcı kendi firma satırına birleşir; bayi/dış firma ayrı satır.
  // Çek ile ödenip henüz tahsil edilmemiş olanlar da borç (satisTahsilEdildi false).
  canliYedekKargo.filter(s => !satisTahsilEdildi(s) && kargoBedeli(s) > 0).forEach(s => {
    const kdvli = kargoBedeli(s) + calcKDV(s.faturaTipi, kargoBedeli(s), s.tarih, kdvRates);
    paraEkle(alacak, s.currency, kdvli);
    const firmKey = s.aliciTipi === "musteri" ? "m:" + s.musteriId : (s.disFirma ? "x:" + (s.disFirmaAd || "") : "b:" + s.dealerId);
    if (s.aliciTipi === "musteri") ekleAlacak(s.musteriId, s.currency, kdvli, "Yedek parça (kargo ve fabrika teslim)");
    else ekleAlacakAd(s.disFirma ? "x:" + (s.disFirmaAd || "") : "b:" + s.dealerId, kargoAlici(s), s.currency, kdvli, "Yedek parça (kargo ve fabrika teslim)");
    yasEkle(firmKey, s.tarih, s.currency, kdvli);
  });
  const alacakDetay = [...alacakMap.values()].map(x => ({ firma: x.firma, tutar: x.tutar, kaynaklar: [...x.kaynaklar] }));
  const alacakYaslandirma = YAS_SIRA.filter(a => yasMap[a]).map(a => ({ aralik: a, firma: yasMap[a].firmalar.size, tutar: yasMap[a].tutar }));
  const ALACAK_KAYNAK_SIRA = ["Makina bakiyesi", "Servis", "Extra kalıp", "Yedek parça (kargo ve fabrika teslim)"];
  const alacakKaynakKirilimi = ALACAK_KAYNAK_SIRA.filter(k => alacakKaynakMap[k]).map(k => ({ kaynak: k, tutar: alacakKaynakMap[k] }));

  // ── Kredi kartı blokajında bekleyenler (rapor anı) ──────────────────────────
  // "Ödendi" işaretli ama bloke para henüz hesaba geçmemiş kredi kartı tahsilatları: servis, extra kalıp,
  // yedek parça ve makina ödemesi. Açık alacağın bir ALT KÜMESİdir (satisTahsilEdildi/isPaymentReceived
  // false) ve hesabaGecis gününde kendiliğinden tahsilata düşer — "ne zaman geçecek" diye ayrı gösterilir.
  const kkBlokajda = [];
  const kkEkle = (firma, kaynak, tarih, kk, cur, tutar) => kkBlokajda.push({ firma, kaynak, tarih: tarih || "", hesabaGecis: kk?.hesabaGecis || "", tutar: tekPara(cur, tutar) });
  const kkBloke = (r) => r?.yontem === "Kredi Kartı" && !kartTahsilEdildiMi(r.kartKomisyonu);
  canliServisler.filter(s => s.odendi && kkBloke(s) && (isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s))).forEach(s => {
    const toplam = (isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0) + (isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0);
    kkEkle(custAdi(s.customerId), "Servis", s.date, s.kartKomisyonu, s.currency, toplam + calcKDV(s.faturaTipi, toplam, s.date, kdvRates));
  });
  canliKalipSatislari.filter(p => p.odendi && !p.ucretsizMi && kkBloke(p)).forEach(p =>
    kkEkle(custAdi(p.customerId), "Extra kalıp", p.tarih, p.kartKomisyonu, p.currency, parseMoney(p.ucret) + calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates)));
  canliYedekKargo.filter(s => s.odendi && kkBloke(s) && kargoBedeli(s) > 0).forEach(s =>
    kkEkle(kargoAlici(s), "Yedek parça (kargo ve fabrika teslim)", s.tarih, s.kartKomisyonu, s.currency, kargoBedeli(s) + calcKDV(s.faturaTipi, kargoBedeli(s), s.tarih, kdvRates)));
  canliOdemeler.filter(p => kkBloke(p)).forEach(p => kkEkle(custAdi(p.customerId), "Makina ödemesi", p.tarih, p.kartKomisyonu, p.currency, parseMoney(p.tutar)));
  kkBlokajda.sort((a, b) => (a.hesabaGecis || "9999").localeCompare(b.hesabaGecis || "9999"));
  const kkBlokajdaTutar = {};
  kkBlokajda.forEach(x => { for (const c in x.tutar) paraEkle(kkBlokajdaTutar, c, x.tutar[c]); });

  // ── TEKLİFLER ───────────────────────────────────────────────────────────────
  const ayTeklifler = canliTeklifler.filter(t => t.type === "teklif" && ayIci(t.tarih));
  const onaylanan = ayTeklifler.filter(t => t.durum === "onaylandi" || t.satisTamam === true).length;
  // Firma firma teklif detayı — tutar (teklif para biriminde), durum, satışa dönüp dönmediği (eskiden yeniye)
  const teklifDetay = ayTeklifler.map(t => ({
    firma: t.firma || custAdi(t.customerId),
    tutar: tekPara(t.currency, teklifToplami(t)),
    durum: (t.satisTamam === true && t.durum !== "onaylandi") ? "Satışa döndü" : (TEKLIF_DURUM_ETIKET[t.durum] || t.durum || "—"),
    tarih: t.tarih || "",
  })).sort(tariheGore);

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
  // Toplam gelir (KDV hariç net) — RAPORDA GÖSTERİLMEZ (kullanıcı kararı: "ciro" kaldırıldı, her başlık
  // kendi toplamıyla durur), yalnız iç hesap/karşılaştırma için tutulur: makina + işçilik + Altuntaş
  // servis parçası + extra kalıp + anlaşmalı parça + yedek parça (kargo).
  const ciroNet = topla(satisTutar, iscilikTutar, servisParcaTutar, extraKalipTutar, anlasmaliParcaTutar, yedekKargoTutar);
  // Bu ay doğan toplam KDV (beyanname özeti): satış + servis/parça + extra kalıp + anlaşmalı parça + yedek parça (kargo)
  const toplamKdv = topla(satisKdv, servisKdv, extraKalipKdv, anlasmaliParcaKdv, yedekKargoKdv);
  // Bölüm başlık toplamları (net + KDV) — her gelir başlığında gösterilir.
  const servisNet = topla(iscilikTutar, servisParcaTutar, anlasmaliParcaTutar);
  const servisBolumKdv = topla(servisKdv, anlasmaliParcaKdv);
  // ── Toplam Ödenen Banka Komisyonu — bu ayki TÜM kredi kartlı ödeme + kalıp/yedek parça satışlarının
  // komisyon snapshot'ı (müşteriye yansıtılan dahil; banka her durumda keser). Gider olarak gösterilir.
  const bankaKomisyonuTutar = {};
  const komisyonEkle = (rec) => {
    const kk = rec && rec.kartKomisyonu;
    if (rec?.yontem === "Kredi Kartı" && kk && Number(kk.toplamKesinti) > 0) paraEkle(bankaKomisyonuTutar, rec.currency, Number(kk.toplamKesinti));
  };
  ayOdemeler.forEach(komisyonEkle);
  ayKalipSatislari.forEach(komisyonEkle);
  ayYedekKargo.forEach(komisyonEkle);
  ayServisler.forEach(komisyonEkle);
  // ── Kredi kartı ile satış — ödeme yöntemi Kredi Kartı olan satış/tahsilatların toplamı (KDV dahil,
  // kartla çekilen tutar). Makina ödemeleri (payment) + Extra Kalıp + Yedek Parça + Servis. Para birimi başına.
  const krediKartiSatisTutar = {};
  const kartSatisEkle = (bedel, currency, faturaTipi, tarih) => { if (bedel > 0) paraEkle(krediKartiSatisTutar, currency, bedel + calcKDV(faturaTipi, bedel, tarih, kdvRates)); };
  ayKalipSatislari.forEach(p => { if (p.yontem === "Kredi Kartı") kartSatisEkle(parseMoney(p.ucret), p.currency, p.faturaTipi, p.tarih); });
  ayYedekKargo.forEach(s => { if (s.yontem === "Kredi Kartı") kartSatisEkle(kargoBedeli(s), s.currency, s.faturaTipi, s.tarih); });
  ayServisler.forEach(s => { if (s.yontem === "Kredi Kartı") kartSatisEkle(parseMoney(s.servisUcreti) + (s.parcaUcretsizMi ? 0 : parseMoney(s.parcaUcreti)), s.currency, s.faturaTipi, s.date); });
  ayOdemeler.forEach(p => { if (p.yontem === "Kredi Kartı") paraEkle(krediKartiSatisTutar, p.currency, parseMoney(p.tutar)); }); // ödeme zaten KDV dahil kart tutarı
  const ozet = {
    ciroNet, tahsilat: tahsilatTutar, alacak,
    ciroNetTL: rates ? toTL(ciroNet) : null,
    tahsilatTL: rates ? toTL(tahsilatTutar) : null,
    alacakTL: rates ? toTL(alacak) : null,
    toplamKdv, toplamKdvTL: rates ? toTL(toplamKdv) : null,
    krediKartiSatis: krediKartiSatisTutar, krediKartiSatisTL: rates ? toTL(krediKartiSatisTutar) : null,
    bankaKomisyonu: bankaKomisyonuTutar, bankaKomisyonuTL: rates ? toTL(bankaKomisyonuTutar) : null,
  };

  return {
    ay,
    ayEtiketi: new Date(yil, ayNo - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    donem: `${fmtD(1)} - ${fmtD(gunSayisi)}`,
    olusturmaTarihi: new Date().toLocaleDateString("tr-TR"),
    // Makina satışları
    satisAdet: satislar.length, satisTutar, faturaTutar, satisKdv, komisyonTutar, ikinciElAdet,
    modelKirilimi, satisYapanKirilimi, satisDetay, makinaFaturaKirilimi: ftSirali(makinaFatura),
    // Extra kalıp
    extraKalipAdet: extraKalip.filter(p => !p.ucretsizMi).length, extraKalipTutar, extraKalipKdv, extraKalipDetay,
    extraKalipTeslim, extraKalipFaturaKirilimi: ftSirali(kalipFatura),
    // Anlaşmalı servis parçası (Bakım Onarım bölümünde gösterilir)
    anlasmaliParcaTutar, anlasmaliParcaDetay,
    // Yedek parça (kargo ve fabrika teslim) satışları
    yedekKargoAdet: ayYedekKargo.length, yedekKargoMiktar, yedekKargoTutar, yedekKargoKdv,
    yedekKargoMusteriTutar, yedekKargoBayiTutar, yedekKargoTeslim, yedekKargoTeslimTutar, yedekKargoDetay,
    yedekKargoFaturaKirilimi: ftSirali(kargoFatura),
    // Bakım onarım (servis) — bölüm net/KDV toplamı + onarım yeri + fatura tipi kırılımları
    servisAdet: ayServisler.length, servisUcretliAdet, servisUcretsizAdet, iscilikTutar, servisParcaTutar, servisKdv, servisKirilimi, servisDetay,
    servisNet, servisBolumKdv, onarimYeriKirilimi, servisFaturaKirilimi: ftSirali(servisFatura),
    // Tahsilat
    tahsilatAdet: tumTahsilatlar.length, tahsilatTutar, tahsilatNet, tahsilatKdv, tahsilatDetay, tahsilatYontemKirilimi, tahsilatKaynakKirilimi,
    bekleyenCekAdet: bekleyenCekler.length, bekleyenCekTutar, bekleyenCekDetay,
    cekTahsilAdet: ayOdemeler.filter(p => p.yontem === "Çek" && p.tahsilEdildi).length,
    // Alacak (rapor anı) — borçlu firma sayısı tüm kaynakları (bakiye/servis/kalıp/kargo) kapsar
    borcluFirma: alacakMap.size, acikBorc: alacak, alacakDetay, alacakYaslandirma, alacakKaynakKirilimi,
    kkBlokajda, kkBlokajdaTutar,
    gecikenCek: canliOdemeler.filter(isCekVadesiGecmis).length,
    gecikenTaksit: canliMusteriler.filter(taksitGecikmisMi).length,
    // Teklifler
    teklifAdet: ayTeklifler.length, onaylananTeklif: onaylanan, teklifDetay,
    bekleyenTeklif: canliTeklifler.filter(t => t.type === "teklif" && t.durum === "gonderildi").length,
    // Kredi kartı ile satış (KDV dahil) + toplam ödenen banka komisyonu (gider)
    krediKartiSatisTutar, bankaKomisyonuTutar,
    // Yönetici özeti + KDV beyanname özeti
    ozet, toplamKdv, anlasmaliParcaKdv, sahipsizAdet,
    kdvKalemleri: { satis: satisKdv, servis: servisKdv, extraKalip: extraKalipKdv, anlasmaliParca: anlasmaliParcaKdv, yedekKargo: yedekKargoKdv },
  };
};

// "YYYY-MM" bir ay geri
export const oncekiAyStr = (ay) => {
  const [y, m] = String(ay).split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
