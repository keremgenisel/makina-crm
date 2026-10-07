// Kasa, banka ve kredi kartı hesapları (spec 0024 A; R1, R2, R6–R8, R15, R16; C1, C3, C5): saf motor. React'sız.
// Bakiye saklanmaz, hareketlerden türetilir (C1). Bir para hareketi ya gideri doğurur ya bir borcu kapatır: ödeme,
// virman ve tahsilat hiçbir gider üretmez (C3). Çift kayıt defteri değildir (C2).
// Hareket (bölüm `hesapHareketleri`): {id, tur: "odeme"|"virman", tarih, tutar, yontem, hesapId, karsiHesapId, giderId,
// taksitId, tamKapatir, kaynak, gocKaynak, aciklama}. Müşteri tahsilatı `payments[].hesapId` ile bakiyeye girer (R6).
import { cekDurumuOf, tahsilatTarihiOf, yerelBugun } from "./utils";
import { kartTahsilEdildiMi } from "./krediKarti";
import { satisTahsilatKalemleri, paraBirimiUyumluMu, SATIS_KAYNAK, SATIS_KAYNAK_AD } from "./satisTahsilat";
import { aliciAd } from "./yedekParcaSatis";
import { hareketPaylari, hareketHedefPaylari } from "./odemeYontemi";
import { kurus, tl, satirliMi, odemeHedefKalaniK, davranisOf, odemeHedefleri, turHaritasi, maasKurus, ekOdemeKurus, sgkDavranisiMi, DAVRANIS, HEDEF, odemeleriUygula } from "./gider";
// Spec 0070 R28, 0074 R22: SGK kalemine avans mahsubu yapılamaz (tek metin; avans çalışanın borcu, SGK kurumun alacağı).
export const SGK_MAHSUP_HATASI = "SGK kalemine avans mahsubu yapılamaz; SGK kuruma ödenir.";

export const HESAP_TURLERI = [{ value: "kasa", label: "Kasa" }, { value: "banka", label: "Banka" }, { value: "kart", label: "Kredi kartı" }];
export const HESAP_TUR_AD = Object.fromEntries(HESAP_TURLERI.map(t => [t.value, t.label]));
export const HESAPSIZ_NOTU = "Bakiye, hesabı belirtilmiş hareket ve tahsilatları sayar. Hesabı belirtilmemiş kayıtlar aşağıda ayrıca listelenir.";

const PARA = ["TRY", "USD", "EUR"];

// R1, C5: ad zorunlu ve benzersiz; tür ve para birimi sabit listeden; hareketi olan hesabın para birimi değişmez.
export const hesapDogrula = (form, hesaplar = [], { hareketVar = false } = {}) => {
  const hatalar = {};
  const ad = String(form?.ad || "").trim();
  if (!ad) hatalar.ad = "Hesap adı girilmedi.";
  else if (hesaplar.some(h => String(h.id) !== String(form?.id) && String(h.ad || "").trim().toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"))) hatalar.ad = `“${ad}” adında bir hesap zaten var.`;
  if (!HESAP_TUR_AD[form?.tur]) hatalar.tur = "Hesap türü seçilmedi.";
  if (!PARA.includes(form?.paraBirimi)) hatalar.paraBirimi = "Para birimi seçilmedi.";
  const eski = hesaplar.find(h => String(h.id) === String(form?.id));
  if (eski && hareketVar && eski.paraBirimi !== form?.paraBirimi) hatalar.paraBirimi = "Hareketi olan hesabın para birimi değiştirilemez.";
  const acilis = Number(String(form?.acilisBakiyesi ?? "").replace(/\./g, "").replace(",", ".")) || 0;
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  // C5: kredi kartında açılış tutarı BORÇ olarak girilir, bakiye negatif saklanır.
  const acilisBakiyesi = form.tur === "kart" ? -Math.abs(acilis) : acilis;
  return { hatalar, kayit: { ...form, ad, acilisBakiyesi, kapali: !!form.kapali } };
};

// Spec 0040 R6 (AC-22) + 0044 R5, C9: para bir hesaba girdi mi. TEK KURAL, bakiyenin bütün tahsilat kaynakları için:
// çekte yalnız "tahsil edildi" (ciro edilen çek gelire girer ama bankaya girmez), kredi kartında blokaj bitip para hesaba
// geçince, nakit ve havalede hemen. Servis, Extra Kalıp ve yedek parçada ayrıca "ödendi" işaretli olmalı.
const tahsilatSayilirMi = (r, bugun, { odendiGerekli = false } = {}) => !r.deletedAt && r.hesapId != null && (!odendiGerekli || r.odendi === true)
  && (r.yontem !== "Çek" || cekDurumuOf(r) === "tahsil")
  && (r.yontem !== "Kredi Kartı" || kartTahsilEdildiMi(r.kartKomisyonu, bugun));

// Spec 0044 R15: bakiyenin girdileri tek veri nesnesinde. Ad çözümü motorda (R10), ekran yalnız çizer.
const veriOf = (v = {}) => ({ payments: [], services: [], partSales: [], yedekParcaSatislar: [], customers: [], dealers: [], factory: null, kdvRates: undefined, bugun: null, cekler: [], ...v });
// Spec 0049 B (R10, Q4; AC-14): verilen çekin ödendiği gün (geçmişin son "odendi" satırı). Tek tanım; cek.js yeniden dışa verir.
export const verilenCekOdemeTarihi = (cek) => {
  if (!cek || cek.durum !== "odendi") return null;
  const g = (cek.gecmis || []).filter(x => x?.durum === "odendi").map(x => x.tarih).filter(Boolean).sort();
  return g[g.length - 1] || null;
};
const odenmisVerilenCek = (c) => !!c && c.yon === "verilen" && c.durum === "odendi" && c.hesapId != null;
const satisOps = (v) => ({ factoryName: v.factory?.name || "Altuntaş Makina", kdvRates: v.kdvRates });
const firmaAdi = (kaynak, r, v) => {
  if (kaynak === SATIS_KAYNAK.YEDEK) return aliciAd(r, v.dealers, v.customers);
  return v.customers.find(c => String(c.id) === String(r.customerId))?.name || "Silinmiş müşteri";
};
// Servis / Extra Kalıp / yedek parça tahsilat kalemleri (lib/satisTahsilat.js, aylık raporla aynı; Q2). Para birimi
// uyuşmayan servis (R3) bir hesaba yazılamaz.
const satisKalemleri = (v) => satisTahsilatKalemleri({
  services: v.services.filter(r => !r.deletedAt), partSales: v.partSales.filter(r => !r.deletedAt), yedekParcaSatislar: v.yedekParcaSatislar.filter(r => !r.deletedAt),
}, satisOps(v)).filter(k => paraBirimiUyumluMu(k.kaynak, k.kayit));

// R7: hesap başına açılış, giren, çıkan, bakiye ve yürüyen bakiyeli hareket satırları (tarih sırası).
// Spec 0047 R37: aralık { baslangic, bitis } verilince her hesaba ayrıca `aralik` eklenir: aralık öncesi satırlar
// devredene katlanır (ekstre deseni), aralık içi giren/çıkan olur, sonrası sayılmaz. Açılış tarihi aralık içindeyse
// açılış bakiyesi ayrı "açılış" satırıdır ve devreden sıfırdır (R41); açılış aralıktan sonraysa `sonra: true`.
// Aralıksız çağrı bugünkü çıktıyı birebir verir (AC-46).
export const hesapBakiyeleri = (hesaplar = [], hareketler = [], veri = {}, { aralik = null } = {}) => {
  const v = veriOf(veri);
  const bugun = v.bugun || yerelBugun();
  const r = new Map();
  for (const h of hesaplar) r.set(String(h.id), { hesap: h, acilisK: kurus(h.acilisBakiyesi), girenK: 0, cikanK: 0, satirlar: [] });
  const ekle = (hesapId, satir) => { const x = r.get(String(hesapId)); if (x) x.satirlar.push(satir); };
  for (const m of hareketler) {
    if (!m || m.hesapId == null) continue; // R8: hesapsız hareket hiçbir bakiyeye girmez
    const t = kurus(m.tutar);
    if (m.tur === "odeme") ekle(m.hesapId, { tarih: m.tarih, tur: "odeme", hareket: m, girenK: 0, cikanK: t });
    // Spec 0024 B (R9): avans hesaptan çıkar; mahsup para hareketi değildir, hiçbir bakiyeye girmez (R10).
    else if (m.tur === "avans") ekle(m.hesapId, { tarih: m.tarih, tur: "avans", hareket: m, girenK: 0, cikanK: t });
    else if (m.tur === "virman") {
      ekle(m.hesapId, { tarih: m.tarih, tur: "virman", hareket: m, girenK: 0, cikanK: t });
      ekle(m.karsiHesapId, { tarih: m.tarih, tur: "virman", hareket: m, girenK: t, cikanK: 0 });
    }
  }
  // Makina tahsilatı: satır tarihi tahsilatTarihiOf (çekte tahsil/ciro günü, kartta hesaba geçiş; 0044 R5).
  for (const p of v.payments) if (tahsilatSayilirMi(p, bugun)) ekle(p.hesapId, { tarih: tahsilatTarihiOf(p, p.tarih), tur: "tahsilat", turAdi: "Tahsilat", tahsilat: p, firma: firmaAdi(SATIS_KAYNAK.SERVIS, p, v), girenK: kurus(p.tutar), cikanK: 0 });
  // Spec 0049 B (R10, Q4; AC-13, AC-14): verilen çek yazılınca bakiye değişmez (ödeme hareketleri hesapsız); banka ödediği
  // gün, yazımda seçilen hesaptan, çekin TAM tutarıyla düşer (fark dahil). Bakiye çek kaydından okunur, çift sayım olmaz.
  for (const c of v.cekler || []) if (odenmisVerilenCek(c)) ekle(c.hesapId, { tarih: verilenCekOdemeTarihi(c), tur: "verilenCek", turAdi: "Verilen çek", cek: c, girenK: 0, cikanK: kurus(c.tutar) });
  // Spec 0044 R4, R10, R13: servis, Extra Kalıp ve yedek parça tahsilatları; tutar brüt (bize ait bedel + KDV).
  for (const k of satisKalemleri(v)) {
    if (!tahsilatSayilirMi(k.kayit, bugun, { odendiGerekli: true })) continue;
    const h = hesaplar.find(x => String(x.id) === String(k.kayit.hesapId));
    if (!h || (h.paraBirimi || "TRY") !== (k.currency || "TRY")) continue; // farklı para biriminde hesaba yazılmaz (R3)
    ekle(k.kayit.hesapId, { tarih: k.tarih, tur: `${k.kaynak}Tahsilati`, turAdi: SATIS_KAYNAK_AD[k.kaynak], kaynak: k.kaynak, tahsilat: k.kayit, firma: firmaAdi(k.kaynak, k.kayit, v), yontem: k.yontem, girenK: kurus(k.tutar), cikanK: 0 });
  }
  for (const x of r.values()) {
    x.satirlar.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
    let b = x.acilisK;
    for (const s of x.satirlar) { x.girenK += s.girenK; x.cikanK += s.cikanK; b += s.girenK - s.cikanK; s.bakiyeK = b; }
    x.bakiyeK = b;
    x.acilis = tl(x.acilisK); x.giren = tl(x.girenK); x.cikan = tl(x.cikanK); x.bakiye = tl(b);
    // C5: kredi kartında bakiye borç yönlüdür; ekranda "borç" etiketi.
    x.borc = x.hesap.tur === "kart" ? tl(Math.max(0, -b)) : null;
    if (aralik) x.aralik = aralikBakiyesi(x, aralik);
  }
  return r;
};
const aralikBakiyesi = (x, { baslangic, bitis }) => {
  const acilisTarihi = x.hesap.acilisTarihi || "";
  if (acilisTarihi && acilisTarihi > bitis) return { sonra: true, devredenK: 0, acilisSatiriK: 0, girenK: 0, cikanK: 0, kapanisK: 0, satirlar: [] };
  const acilisIcinde = !!acilisTarihi && acilisTarihi >= baslangic;
  let devredenK = acilisIcinde ? 0 : x.acilisK, girenK = 0, cikanK = 0;
  const satirlar = [];
  for (const s of x.satirlar) {
    const t = s.tarih || "";
    if (t > bitis) continue;
    if (t < baslangic) { devredenK += s.girenK - s.cikanK; continue; }
    girenK += s.girenK; cikanK += s.cikanK; satirlar.push(s);
  }
  const acilisSatiriK = acilisIcinde ? x.acilisK : 0;
  return { sonra: false, devredenK, acilisSatiriK, girenK, cikanK, kapanisK: devredenK + acilisSatiriK + girenK - cikanK, satirlar };
};
// Spec 0051 R12, R13 (Q3): üst sınır isteğe bağlı (tek eşik tarihi); tarihsiz kayıt yalnız açık `tarihsizDahil` bayrağıyla
// dahil edilir. 0047'nin ay aralıklı çağrısı (iki sınır, bayraksız) bugünkü gibi çalışır (AC-19, AC-20).
const aralikta = (tarih, aralik) => !aralik
  || (!tarih ? !!aralik.tarihsizDahil : tarih >= (aralik.baslangic || "") && (!aralik.bitis || tarih <= aralik.bitis));

// Spec 0047 R13, R14 (Kasa bölümü): aralıktaki hareketlerin türe göre sayısı ve tutarı; tahsilatlar aralıklı bakiye
// satırlarından (bakiyeye giren para, dört kaynak; 0044), ödeme yöntemi kırılımı aralıkta yapılan ödeme hareketlerinden.
// Mahsup para hareketi değildir (0024 R10) ama sayılır. Tutarsız göç hareketinin tutarı 0 sayılır.
// Spec 0059 R21 (AC-25): `{ liste: true }` verilince dört hareket türü ayın hareketlerini (tarih, sonra giriş sırası) ve
// tahsilat hesap satırlarını (`tahsilat.liste`: tarih, hesap, kaynak, tür adı, firma, giren, para birimi) döndürür; listeler
// rapor tablolarının tek kaynağıdır. Parametresiz çağrı bugünkü çıktıyı birebir verir. Triyaj: satır ham kaydı ve hesap
// nesnesini taşımaz (ham müşteri/servis kaydı rapor nesnesine sızmasın); yalnız hesabın kimliği ve adı.
export const hareketOzeti = (hareketler = [], aralik, bakiyeler = null, { liste = false } = {}) => {
  const tur = (t) => { const l = hareketler.filter(m => m && m.tur === t && aralikta(m.tarih, aralik)); return { adet: l.length, tutarK: l.reduce((a, m) => a + kurus(m.tutar), 0), liste: l }; };
  const odeme = tur("odeme"), virman = tur("virman"), avans = tur("avans"), mahsup = tur("mahsup");
  const tahsilat = { adet: 0, tutarK: 0, kaynaklar: {} };
  const tahsilatListe = [];
  for (const x of bakiyeler ? bakiyeler.values() : []) {
    for (const s of x.aralik?.satirlar || []) {
      if (!s.tahsilat) continue;
      const kaynak = s.kaynak || "makina";
      tahsilat.adet++; tahsilat.tutarK += s.girenK;
      const k = tahsilat.kaynaklar[kaynak] || (tahsilat.kaynaklar[kaynak] = { adet: 0, tutarK: 0 });
      k.adet++; k.tutarK += s.girenK;
      if (liste) tahsilatListe.push({ tarih: s.tarih, hesapId: x.hesap.id, hesapAd: x.hesap.ad, kaynak, turAdi: s.turAdi, firma: s.firma, tutarK: s.girenK, paraBirimi: x.hesap.paraBirimi || "TRY" });
    }
  }
  const yontem = new Map();
  for (const m of odeme.liste) { const y = m.yontem || "Belirtilmemiş"; yontem.set(y, (yontem.get(y) || 0) + kurus(m.tutar)); }
  const sirali = (l) => l.map((m, i) => [m, i]).sort((a, b) => String(a[0].tarih || "").localeCompare(String(b[0].tarih || "")) || a[1] - b[1]).map(x => x[0]);
  const strip = liste ? ({ liste: l, ...r }) => ({ ...r, liste: sirali(l) }) : ({ liste: _l, ...r }) => r;
  if (liste) tahsilat.liste = tahsilatListe.map((t, i) => [t, i])
    .sort((a, b) => String(a[0].tarih || "").localeCompare(String(b[0].tarih || "")) || String(a[0].hesapAd).localeCompare(String(b[0].hesapAd), "tr") || a[1] - b[1]).map(x => x[0]);
  return { odeme: strip(odeme), virman: strip(virman), avans: strip(avans), mahsup: strip(mahsup), tahsilat,
    yontemKirilimi: [...yontem.entries()].map(([ad, tutarK]) => ({ ad, tutarK })).sort((a, b) => b.tutarK - a.tutarK) };
};

// R8, AC-32: hesabı belirtilmemiş ödemeler (göç dahil) ayrıca sayılır.
// Spec 0047 R16, R31: aralık verilince yalnız aralıktaki hareketler sayılır ve `liste` (tarih sırası) döner.
// Spec 0058 R11, C2: kapsam dışı kaydı tek listede `{id, tur, kaynak, kayitId, zaman}`. Anahtar iki satır şeklini birden
// adresler: tahsilat satırı `{kaynak, kayit}` → "tahsilat:<kaynak>:<id>", ödeme/avans satırı hareketin kendisi →
// "hareket::<id>". Bölümlere (servis, Extra Kalıp, yedek parça, hareket) ayrı bayrak alanı yoktur.
export const KAPSAM_TUR = { TAHSILAT: "tahsilat", HAREKET: "hareket" };
export const kapsamAnahtari = (satir) => (satir?.kaynak && satir?.kayit
  ? `${KAPSAM_TUR.TAHSILAT}:${satir.kaynak}:${satir.kayit.id}` : `${KAPSAM_TUR.HAREKET}::${satir?.id}`);
export const kapsamGirisAnahtari = (g) => `${g?.tur}:${g?.tur === KAPSAM_TUR.TAHSILAT ? g?.kaynak || "" : ""}:${g?.kayitId}`;
export const kapsamGirisi = (satir) => (satir?.kaynak && satir?.kayit
  ? { tur: KAPSAM_TUR.TAHSILAT, kaynak: satir.kaynak, kayitId: satir.kayit.id } : { tur: KAPSAM_TUR.HAREKET, kaynak: null, kayitId: satir?.id });
const kapsamKumesi = (kapsamDisi) => (Array.isArray(kapsamDisi) ? new Set(kapsamDisi.map(kapsamGirisAnahtari)) : null);
// R15: kapsamDisi verilmezse (null) bugünkü çıktı birebir; verilirse kapsam dışı satırlar listeden ve sayılardan düşer.
// Spec 0078 R13, AC-18: hesaplar (canlı) verilince hesabı bulunamayan (çöpteki ya da silinmiş hesaba bağlı) ödeme ve avans da
// listelenir; o hareket hiçbir bakiyeye girmiyor. Kayıt nesnesi değişmez (hesapId'si dolu olan satır "hesabı silinmiş"tir,
// ekran `hesabiSilinmisMi` ile yazar). Parametresiz çağrı birebir eski çıktı.
export const hesabiSilinmisMi = (m, hesaplar) => !!m && m.hesapId != null && Array.isArray(hesaplar) && !hesaplar.some(h => h && String(h.id) === String(m.hesapId));
export const hesapsizOdemeler = (hareketler = [], aralik = null, kapsamDisi = null, hesaplar = null) => {
  const kd = kapsamKumesi(kapsamDisi);
  const kapsamda = (m) => !kd || !kd.has(kapsamAnahtari(m));
  const hesapsiz = (m) => m.hesapId == null || hesabiSilinmisMi(m, hesaplar);
  // Spec 0040 R18: ciro hareketleri kasıtlı olarak hesapsızdır (çek portföyden çıkar); eksik veri listesine girmez.
  const l = hareketler.filter(m => m && m.tur === "odeme" && hesapsiz(m) && m.cekId == null && aralikta(m.tarih, aralik) && kapsamda(m));
  // Spec 0024 B4: hesapsız avans da hiçbir bakiyeye girmez ve ayrıca sayılır.
  const av = hareketler.filter(m => m && m.tur === "avans" && hesapsiz(m) && aralikta(m.tarih, aralik) && kapsamda(m));
  const r = { adet: l.length, gocAdet: l.filter(m => m.kaynak === "goc").length, avansAdet: av.length };
  return aralik ? { ...r, liste: [...l, ...av].sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "")) } : r;
};

// R16, AC-24 + 0044 R11, AC-26: hareketi (ödeme, virman, tahsilat; servis, Extra Kalıp ve yedek parça tahsilatı dahil)
// olan hesap silinemez.
export const hesapKullanimi = (hesapId, hareketler = [], veri = {}) => {
  const v = veriOf(veri);
  const bagli = (r) => r && !r.deletedAt && String(r.hesapId) === String(hesapId);
  return hareketler.filter(m => m && (String(m.hesapId) === String(hesapId) || String(m.karsiHesapId) === String(hesapId))).length
    + v.payments.filter(bagli).length + v.services.filter(bagli).length + v.partSales.filter(bagli).length + v.yedekParcaSatislar.filter(bagli).length
    // Spec 0049 B: verilen çekin yazıldığı hesap da kullanımdadır (silinmez, para birimi değişmez).
    + (v.cekler || []).filter(c => c && c.yon === "verilen" && String(c.hesapId) === String(hesapId)).length;
};

// ── Spec 0056: deneme dönemi ve hesabın silinip hareketlerinin taşınması ──────────────────────────────────────
// R1, R2 (Q5, Q7): tek kapı. Alan HİÇ yoksa varsayılan 2027-01-01 (mevcut kurulumlar kendiliğinden dönemde, o gün
// kendiliğinden çıkar); boş dize = dönem kapalı. bugun yerel tarihtir (yerelBugun / useBugun); bitiş günü dahil değil.
export const DENEME_DONEMI_VARSAYILAN = "2027-01-01";
export const denemeDonemiBitisi = (ayar) => {
  const v = ayar?.denemeDonemiBitis;
  if (v === undefined) return DENEME_DONEMI_VARSAYILAN;
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
export const denemeDonemiAcik = (ayar, bugun = yerelBugun()) => {
  const b = denemeDonemiBitisi(ayar);
  return !!b && !!bugun && bugun < b;
};
// R7, AC-29: hesapKullanimi'nin türe göre kırılımı (aynı kapsam: hareketler her durumda, tahsilat ve satış kayıtları
// canlıysa, verilen çek). Toplam hesapKullanimi ile eşittir; `diger` başka türden hesaplı hareketler içindir.
export const hesapKullanimDetayi = (hesapId, hareketler = [], veri = {}) => {
  const v = veriOf(veri);
  const es = (x) => x != null && String(x) === String(hesapId);
  const bagli = (r) => r && !r.deletedAt && es(r.hesapId);
  const d = { odeme: 0, virman: 0, avans: 0, diger: 0, payments: 0, servis: 0, kalip: 0, yedekParca: 0, verilenCek: 0 };
  for (const m of hareketler || []) {
    if (!m || !(es(m.hesapId) || es(m.karsiHesapId))) continue;
    if (m.tur === "virman") d.virman++; else if (m.tur === "odeme") d.odeme++; else if (m.tur === "avans") d.avans++; else d.diger++;
  }
  d.payments = v.payments.filter(bagli).length; d.servis = v.services.filter(bagli).length;
  d.kalip = v.partSales.filter(bagli).length; d.yedekParca = v.yedekParcaSatislar.filter(bagli).length;
  d.verilenCek = (v.cekler || []).filter(c => c && c.yon === "verilen" && es(c.hesapId)).length;
  d.toplam = Object.entries(d).reduce((a, [k, n]) => (k === "toplam" ? a : a + n), 0);
  return d;
};
// R8, R17–R19, R22, R26, R27: silinecek hesabın bağlarının taşıma planı. Saf; çağıran güncelleyicileri TEK işleyicide
// uygular (R23). uygunHedefler: açık, aynı para biriminde, virmanların karşı bacağı olmayan; verilen çek varsa yalnız TL
// banka. nedenler.tasi / nedenler.hesapsiz: o yolu engelleyen kayıtlar (adıyla). Hesapsız bırakma virman (tek bacaklı
// virman bakiyeyi sessizce değiştirirdi, R18) ve verilen çek (ödenince hiçbir bakiyeye ve hiçbir hesapsız listeye
// girmezdi, R9/C6) varken engellenir. guncelle(hedefId|null): bölüm başına tam dizi güncelleyicileri (çöptekiler dahil).
// Mahsup ve ciro hareketleri hesapsızdır, plana girmez (R22).
export const hesapTasimaPlani = (hesap, hareketler = [], veri = {}, hesaplar = [], { hesapAdi = (id) => String(id), tarihYaz = (t) => t || "tarihsiz" } = {}) => {
  const v = veriOf(veri);
  const id = hesap?.id;
  const es = (x) => x != null && String(x) === String(id);
  const detay = hesapKullanimDetayi(id, hareketler, v);
  const virmanlar = (hareketler || []).filter(m => m && m.tur === "virman" && (es(m.hesapId) || es(m.karsiHesapId)));
  const karsiBacaklar = new Set(virmanlar.map(m => String(es(m.hesapId) ? m.karsiHesapId : m.hesapId)));
  const verilenCekler = (v.cekler || []).filter(c => c && c.yon === "verilen" && es(c.hesapId));
  const pb = hesap?.paraBirimi || "TRY";
  const adaylar = (hesaplar || []).filter(h => h && !es(h.id) && !h.kapali);
  const uygunHedefler = adaylar.filter(h => (h.paraBirimi || "TRY") === pb && !karsiBacaklar.has(String(h.id))
    && (!verilenCekler.length || (h.tur === "banka" && (h.paraBirimi || "TRY") === "TRY")));
  const virmanAdi = (m) => `${tarihYaz(m.tarih)} virmanı (${hesapAdi(m.hesapId)} ↔ ${hesapAdi(m.karsiHesapId)})`;
  const tasi = [];
  if (!uygunHedefler.length) {
    if (!adaylar.some(h => (h.paraBirimi || "TRY") === pb)) tasi.push(`${pb} para biriminde açık başka hesap yok.`);
    else if (verilenCekler.length && !adaylar.some(h => h.tur === "banka" && (h.paraBirimi || "TRY") === "TRY" && !karsiBacaklar.has(String(h.id))))
      tasi.push(...verilenCekler.map(c => `Verilen çek ${c.no || ""}: yalnız açık bir TL banka hesabına taşınabilir.`.replace("  ", " ")));
    else tasi.push(...virmanlar.map(m => `${virmanAdi(m)}: hedef virmanın karşı hesabı olamaz; önce bu virmanı silin.`));
  }
  const hesapsiz = [...virmanlar.map(m => `${virmanAdi(m)}: virman hesapsız bırakılamaz; önce bu virmanı silin.`),
    ...verilenCekler.map(c => `Verilen çek ${c.no || ""}: hesapsız bırakılamaz; bir TL banka hesabına taşıyın.`.replace("  ", " "))];
  const guncelle = (hedefId) => {
    const yeni = hedefId == null ? null : hedefId;
    const hesapAlani = (r) => (r && es(r.hesapId) ? { ...r, hesapId: yeni } : r);
    return {
      hesapHareketleri: (p) => (p || []).map(m => {
        if (!m) return m;
        const a = es(m.hesapId), b = es(m.karsiHesapId);
        if (!a && !b) return m;
        const n = { ...m, ...(a ? { hesapId: yeni } : {}), ...(b ? { karsiHesapId: yeni } : {}) };
        // Spec 0078 triyaj (bulgu 4): hedef seçimi yalnız canlı virmanların karşı bacağını dışlar; çöpteki virman taşımada
        // kendine virmana (B↔B) dönecekse yerinde bırakılır ("hesabı silinmiş" olarak geri alınır, R20).
        if (m.deletedAt && m.tur === "virman" && n.hesapId != null && String(n.hesapId) === String(n.karsiHesapId)) return m;
        return n;
      }),
      payments: (p) => (p || []).map(hesapAlani),
      services: (p) => (p || []).map(hesapAlani),
      partSales: (p) => (p || []).map(hesapAlani),
      yedekParcaSatislar: (p) => (p || []).map(hesapAlani),
      cekler: (p) => (p || []).map(c => (c && c.yon === "verilen" ? hesapAlani(c) : c)),
    };
  };
  return { detay, uygunHedefler, nedenler: { tasi, hesapsiz }, guncelle };
};

// Spec 0044 R6, R7, R14, AC-23, AC-24: hesabı belirtilmemiş tahsilatlar (gider tarafındaki hesapsizOdemeler'den ayrı).
// Kapsam: ödendi işaretli, bize ait tutarı olan, para birimi uyumlu, hesabı boş kayıt; tahsil edilmemiş çek ve blokajı
// süren kart da listede kalır (hesap önceden atanır, Q10). Bize ait tutarı olmayan kayıt kapsam dışıdır (eksik veri değil).
// Triyaj: hesaplar verilince, bağlı hesabı bulunmayan ya da para birimi kaydınkiyle uyuşmayan kayıt da listelenir (neden
// "hesapYok" / "paraBirimi"); o kayıt hesapBakiyeleri'nde hiçbir bakiyeye girmez, yoksa hiçbir yerde görünmezdi.
export const hesapsizTahsilatlar = (veri = {}, hesaplar = null, aralik = null, kapsamDisi = null) => {
  const v = veriOf(veri);
  const kd = kapsamKumesi(kapsamDisi);
  const hesapById = hesaplar ? new Map(hesaplar.map(h => [String(h.id), h])) : null;
  const neden = (k) => {
    if (k.kayit.hesapId == null) return "hesapsiz";
    if (!hesapById) return null;
    const h = hesapById.get(String(k.kayit.hesapId));
    if (!h) return "hesapYok";
    return (h.paraBirimi || "TRY") !== (k.currency || "TRY") ? "paraBirimi" : null;
  };
  const liste = satisKalemleri(v).filter(k => k.kayit.odendi === true && k.tutar > 0 && aralikta(k.tarih, aralik) && (!kd || !kd.has(kapsamAnahtari(k))))
    .map(k => ({ ...k, neden: neden(k) })).filter(k => k.neden)
    .map(k => ({ ...k, turAdi: SATIS_KAYNAK_AD[k.kaynak], firma: firmaAdi(k.kaynak, k.kayit, v) }))
    .sort((a, b) => (b.tarih || "").localeCompare(a.tarih || ""));
  return { adet: liste.length, liste };
};

// ── Spec 0051 A: hesapsız kayıtlarda başlangıç tarihi (R1–R7, R12–R15) ──────────────────
// Kasa ekranının iş listesi: sayılar ve tahsilat listesi eşikten geçer (tek eşik, tarihsiz kayıt her zaman görünür); eşik
// altında kalanlar nedene göre sayılır. Bakiye, 0047 raporu ve diğer tüketiciler eşiği hiç görmez (R6, C6, X6).
// Yeni süzme yolu yok: hesapsizOdemeler / hesapsizTahsilatlar iki kez (hepsi ve süzülmüş) çağrılır (C2).
const HEPSI = { baslangic: "", tarihsizDahil: true };
// Spec 0058 R13: kapsamDisi verilince ÖNCE kapsam dışı ayıklanır (kalıcı karar), SONRA eşik uygulanır; `gizli` yalnız
// kapsamdaki kayıtları sayar ve kapsam dışı kendi sayısıyla ve listesiyle ayrı döner (eşikten bağımsız). Okuma anında
// çözülür: bugün hesapsız listede olmayan (çöpteki, hesap atanmış, silinmiş) kaydın girişi hiçbir yerde sayılmaz (R16).
// kapsamDisi verilmezse çıktı birebir 0051'deki gibidir (AC-20).
export const hesapsizOzeti = (hareketler = [], veri = {}, hesaplar = null, esik = null, kapsamDisi = null) => {
  const aralik = esik ? { baslangic: esik, tarihsizDahil: true } : HEPSI;
  const hepsiO = hesapsizOdemeler(hareketler, HEPSI, kapsamDisi, hesaplar), hepsiT = hesapsizTahsilatlar(veri, hesaplar, HEPSI, kapsamDisi);
  const odeme = esik ? hesapsizOdemeler(hareketler, aralik, kapsamDisi, hesaplar) : hepsiO;
  const tahsilat = esik ? hesapsizTahsilatlar(veri, hesaplar, aralik, kapsamDisi) : hepsiT;
  const nedenSay = (l) => l.reduce((a, k) => ({ ...a, [k.neden]: (a[k.neden] || 0) + 1 }), { hesapsiz: 0, hesapYok: 0, paraBirimi: 0 });
  const tH = nedenSay(hepsiT.liste), tS = nedenSay(tahsilat.liste);
  const gizli = { odeme: hepsiO.adet - odeme.adet, avans: hepsiO.avansAdet - odeme.avansAdet,
    tahsilat: { hesapsiz: tH.hesapsiz - tS.hesapsiz, hesapYok: tH.hesapYok - tS.hesapYok, paraBirimi: tH.paraBirimi - tS.paraBirimi } };
  gizli.toplam = gizli.odeme + gizli.avans + gizli.tahsilat.hesapsiz + gizli.tahsilat.hesapYok + gizli.tahsilat.paraBirimi;
  const tarihsiz = odeme.liste.filter(m => !m.tarih).length + tahsilat.liste.filter(k => !k.tarih).length;
  if (!Array.isArray(kapsamDisi)) return { esik: esik || null, odeme, tahsilat, gizli, tarihsiz };
  const kd = kapsamKumesi(kapsamDisi);
  const tumO = hesapsizOdemeler(hareketler, HEPSI, null, hesaplar).liste.filter(m => kd.has(kapsamAnahtari(m)));
  const tumT = hesapsizTahsilatlar(veri, hesaplar, HEPSI).liste.filter(k => kd.has(kapsamAnahtari(k)));
  const kapsamDisiOzet = { odeme: tumO.filter(m => m.tur === "odeme").length, avans: tumO.filter(m => m.tur === "avans").length, tahsilat: tumT.length,
    odemeListe: tumO, tahsilatListe: tumT };
  kapsamDisiOzet.toplam = kapsamDisiOzet.odeme + kapsamDisiOzet.avans + kapsamDisiOzet.tahsilat;
  return { esik: esik || null, odeme, tahsilat, gizli, tarihsiz, kapsamDisi: kapsamDisiOzet };
};

// Spec 0058 R5, R16, R20: geçersiz girişlerin temizliği (App'teki tek efekt; aynı kayıt penceresinde yazılır). Düşer: kaydı
// kalıcı olarak silinmiş (hiç bulunmayan) giriş; kaydına geçerli bir hesap atanmış tahsilat (hesap var ve para birimi
// uyuyor, yani artık hesapsız değil; silinmiş/uyuşmayan hesap hâlâ hesapsızdır, giriş kalır); hesaplı ya da çeke bağlı
// hareket. Çöpteki kaydın girişi KALIR (okuma anında yok sayılır, çöpten dönünce karar döner). Değişiklik yoksa aynı dizi.
// Sunucu (serverAuth.kapsamGirisiGecersizMi) aynı kuralın daha gevşek hâlini (para birimine bakmadan) kabul eder.
const KAPSAM_KAYNAK_BOLUM = { [SATIS_KAYNAK.SERVIS]: "services", [SATIS_KAYNAK.KALIP]: "partSales", [SATIS_KAYNAK.YEDEK]: "yedekParcaSatislar" };
export const kapsamGirisiGecersizMi = (g, hareketler = [], veri = {}, hesaplar = []) => {
  if (g?.tur === KAPSAM_TUR.HAREKET) {
    const h = (hareketler || []).find(m => m && String(m.id) === String(g.kayitId));
    return !h || h.hesapId != null || h.cekId != null;
  }
  const v = veriOf(veri);
  const bolum = KAPSAM_KAYNAK_BOLUM[g?.kaynak];
  if (!bolum) return true;
  const r = (v[bolum] || []).find(x => x && String(x.id) === String(g.kayitId));
  if (!r) return true;
  if (r.deletedAt || r.hesapId == null) return false;
  const hesap = (hesaplar || []).find(x => String(x.id) === String(r.hesapId));
  if (!hesap) return false;
  const kalem = satisKalemleri(v).find(k => k.kaynak === g.kaynak && String(k.kayit.id) === String(r.id));
  return !kalem || (hesap.paraBirimi || "TRY") === (kalem.currency || "TRY");
};
export const kapsamDisiTemizle = (girisler = [], hareketler = [], veri = {}, hesaplar = []) => {
  const kalan = (girisler || []).filter(g => !kapsamGirisiGecersizMi(g, hareketler, veri, hesaplar));
  return kalan.length === (girisler || []).length ? girisler : kalan;
};
// R15 (Q8): boş = eşik yok; biçimsiz ya da takvimde olmayan tarih ve gelecek tarih reddedilir. Yürürlük ayından önce serbest.
export const hesapsizBaslangicDogrula = (ham, bugun = yerelBugun()) => {
  const t = String(ham ?? "").trim();
  if (!t) return { deger: "" };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  if (!d || d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return { hata: "Başlangıç tarihi geçersiz; takvimden bir gün seçin." };
  if (t > bugun) return { hata: "Başlangıç tarihi gelecekte olamaz: sistemin kullanılmaya başladığı günü girin." };
  return { deger: t };
};

// Spec 0044 R2, Q8: tahsilatta ön seçili hesap = aynı para birimindeki son tahsilatın (makina tahsilatı dahil) açık hesabı.
// Gider tarafındaki sonKullanilanHesap kullanılmaz (çıkan ve giren paranın hesabı genelde farklıdır).
export const sonTahsilatHesabi = (veri = {}, hesaplar = [], paraBirimi = "TRY") => {
  const v = veriOf(veri);
  const acik = new Set(secilebilirHesaplar(hesaplar, paraBirimi).map(h => String(h.id)));
  const adaylar = [
    ...v.payments.filter(p => p && !p.deletedAt && p.hesapId != null).map(p => ({ hesapId: p.hesapId, tarih: tahsilatTarihiOf(p, p.tarih), id: p.id })),
    ...satisKalemleri(v).filter(k => k.kayit.hesapId != null).map(k => ({ hesapId: k.kayit.hesapId, tarih: k.tarih, id: k.kayit.id })),
  ].filter(a => acik.has(String(a.hesapId)))
    .sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "") || Number(b.id) - Number(a.id));
  return adaylar[0]?.hesapId ?? null;
};

// C5 (1): harekete yalnız aynı para biriminde ve açık hesap seçilebilir.
export const secilebilirHesaplar = (hesaplar = [], paraBirimi = "TRY") => hesaplar.filter(h => !h.kapali && h.paraBirimi === (paraBirimi || "TRY"));

const tutarOku = (v) => {
  if (typeof v === "number") return v;
  const t = String(v ?? "").trim();
  if (!t) return NaN;
  return Number(t.replace(/\./g, "").replace(",", "."));
};

// R2, R3, R18, AC-7, AC-28: ödeme tek hedefi kapatır (bir kalem ya da taksitli kalemde bir taksit); kalandan fazla
// olamaz; hesap açık ve TL olmalı (gider TL'dir). kalem: odemeleriUygula'dan geçmiş (zenginleştirilmiş) kalem.
export const odemeDogrula = (form, { kalem, turMap, hesaplar = [], ciro = false, kendiCek = false } = {}) => {
  const hatalar = {};
  // Spec 0040 R19, AC-37: "Çek (ciro)" yöntemi elle seçilemez; yalnız portföyden çek ciro edilirken atanır.
  if (!ciro && form?.yontem === "Çek (ciro)") hatalar.yontem = "“Çek (ciro)” elle seçilemez; müşteri çekiyle ödemek için Kasa › Çek Portföyü'nden ciro edin.";
  // Spec 0049 R9: "Çek (kendi)" yalnız kendi çekimizi yazma işlemiyle atanır (cek.kendiCekPlani).
  if (!kendiCek && form?.yontem === "Çek (kendi)") hatalar.yontem = "“Çek (kendi)” elle seçilemez; kendi çekimizle ödemek için çek yazın (Kasa › Çek Portföyü ya da gider formu).";
  if (!kalem) return { hatalar: { hedef: "Ödenecek kalem bulunamadı." }, kayit: null };
  const satirli = satirliMi(kalem);
  if (Array.isArray(form?.giderIdler) && form.giderIdler.length > 1) hatalar.hedef = "Bir ödeme yalnız bir kalemi kapatır; her kalem için ayrı ödeme girin.";
  if (satirli && form?.taksitId == null) hatalar.hedef = "Taksitli kalemde ödeme bir taksite bağlanır.";
  if (!form?.tarih) hatalar.tarih = "Ödeme tarihi girilmedi.";
  const t = tutarOku(form?.tutar);
  const kalanK = odemeHedefKalaniK(kalem, davranisOf(kalem, turMap), satirli ? form?.taksitId : null);
  if (!Number.isFinite(t)) hatalar.tutar = "Tutar sayıya çevrilemedi. Örnek: 12.500,00";
  else if (t <= 0) hatalar.tutar = "Tutar sıfırdan büyük olmalı.";
  else if (kurus(t) > kalanK) hatalar.tutar = `Kalandan fazla ödeme kaydedilemez (kalan ${tl(kalanK).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺).`;
  if (form?.hesapId != null && form.hesapId !== "") {
    const h = hesaplar.find(x => String(x.id) === String(form.hesapId));
    if (!h) hatalar.hesapId = "Hesap bulunamadı.";
    else if (h.kapali) hatalar.hesapId = "Kapatılmış hesaba hareket girilemez.";
    else if (h.paraBirimi !== "TRY") hatalar.hesapId = "Gider ödemesi yalnız TL hesaptan yapılır.";
  }
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return {
    hatalar,
    kayit: {
      tur: "odeme", tarih: form.tarih, tutar: t, yontem: form.yontem || "", hesapId: form.hesapId == null || form.hesapId === "" ? null : form.hesapId,
      giderId: kalem.id, taksitId: satirli ? form.taksitId : null, aciklama: String(form.aciklama || "").trim(),
    },
  };
};

// Spec 0041 R5, R6, R12–R14: tek pencerede çok satırlı ödeme. Tarih pencere başına, açıklama satır başına. Her dolu satır
// bugünkü odemeDogrula'dan geçer (ciro reddi, hesap, satırın hedef kalanı; Q8); üstüne iki katman: taksitli kalemde aynı
// taksite giden satırların toplamı o taksidin kalanını, bütün satırların toplamı kalemin kalanını aşamaz. Ya hep ya hiç
// (R13): bir satır bile geçersizse kayit yoktur. hedefAdi(taksitId): hata metnindeki hedef adı (pencereden, Q7).
export const COKLU_ODEME_MAX_SATIR = 10;
const tlMetni = (k) => tl(k).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Spec 0053 R6: satırlı kalemde her hedef taksitlerinden oluşur, bu yüzden "aynı hedefe giden satırların toplamı" katmanı
// taksit katmanının sonucudur (her taksidin toplamı kendi kalanını aşamazsa hedefin toplamı da aşamaz); hata metnindeki
// hedef adı çağıranın hedefAdi(taksitId)'sinden gelir (tek satırlı hedefte "Elden", taksitli hedefte "Resmi 2/3. taksit").
export const cokluOdemeDogrula = (form, { kalem, turMap, hesaplar = [], hedefAdi = (id) => (id == null ? "Kalem" : "Taksit") } = {}) => {
  const hatalar = { satirlar: {}, hedefler: [] };
  const satirlar = Array.isArray(form?.satirlar) ? form.satirlar : [];
  if (!kalem) return { hatalar: { ...hatalar, genel: "Ödenecek kalem bulunamadı." }, kayitlar: null };
  if (!form?.tarih) hatalar.tarih = "Ödeme tarihi girilmedi.";
  if (satirlar.length > COKLU_ODEME_MAX_SATIR) hatalar.genel = `En çok ${COKLU_ODEME_MAX_SATIR} satır girilebilir; fazlası için ayrı ödeme girin.`;
  // R12: tutarı boş bırakılmış satır sessizce atılır.
  const dolu = satirlar.map((r, i) => ({ r, i })).filter(({ r }) => String(r?.tutar ?? "").trim() !== "");
  if (!dolu.length && !hatalar.genel) hatalar.genel = "En az bir satırın tutarını girin.";
  const satirli = satirliMi(kalem);
  const dav = davranisOf(kalem, turMap);
  const gecerli = [];
  for (const { r, i } of dolu) {
    const v = odemeDogrula({ ...r, tarih: form?.tarih || "2000-01-01" }, { kalem, turMap, hesaplar });
    if (v.kayit) gecerli.push({ i, kayit: { ...v.kayit, tarih: form?.tarih } });
    else hatalar.satirlar[i] = v.hatalar;
  }
  // R6 katman 2: aynı taksite giden satırların toplamı.
  if (satirli && !Object.keys(hatalar.satirlar).length) {
    const gruplar = new Map();
    for (const g of gecerli) { const key = String(g.kayit.taksitId); gruplar.set(key, [...(gruplar.get(key) || []), g]); }
    for (const [, liste] of gruplar) {
      if (liste.length < 2) continue;
      const taksitId = liste[0].kayit.taksitId;
      const kalanK = odemeHedefKalaniK(kalem, dav, taksitId);
      const topK = liste.reduce((a, g) => a + kurus(g.kayit.tutar), 0);
      if (topK > kalanK) hatalar.hedefler.push(`${hedefAdi(taksitId)} için girilen toplam kalanı aşıyor (kalan ${tlMetni(kalanK)} ₺).`);
    }
  }
  // R6 katman 3: bütün satırların toplamı kalemin kalanını aşamaz. Taksitli kalemde 1. ve 2. katman her taksidin toplamını
  // o taksidin kalanıyla sınırladığı için toplam zaten aşamaz (triyaj bulgu 4); katman 3 yalnız taksitsiz kalemde çalışır.
  if (!satirli && !Object.keys(hatalar.satirlar).length && gecerli.length > 1) {
    const kalemKalanK = odemeHedefKalaniK(kalem, dav, null);
    const topK = gecerli.reduce((a, g) => a + kurus(g.kayit.tutar), 0);
    if (topK > kalemKalanK) hatalar.hedefler.push(`Satırların toplamı kalemin kalanını aşıyor (kalan ${tlMetni(kalemKalanK)} ₺).`);
  }
  const hataVar = hatalar.tarih || hatalar.genel || hatalar.hedefler.length || Object.keys(hatalar.satirlar).length;
  return hataVar ? { hatalar, kayitlar: null } : { hatalar, kayitlar: gecerli.map(g => g.kayit) };
};

// R15, AC-12, AC-30: virman aynı para biriminde iki farklı, açık hesap arasında; gider ya da gelir değildir.
export const virmanDogrula = (form, hesaplar = []) => {
  const hatalar = {};
  const a = hesaplar.find(x => String(x.id) === String(form?.hesapId));
  const b = hesaplar.find(x => String(x.id) === String(form?.karsiHesapId));
  if (!a) hatalar.hesapId = "Çıkan hesap seçilmedi.";
  if (!b) hatalar.karsiHesapId = "Giren hesap seçilmedi.";
  if (a && b && String(a.id) === String(b.id)) hatalar.karsiHesapId = "Aynı hesaba virman yapılamaz.";
  if (a && b && a.paraBirimi !== b.paraBirimi) hatalar.karsiHesapId = "Farklı para birimindeki hesaplar arasında virman yapılamaz.";
  if ((a && a.kapali) || (b && b.kapali)) hatalar.hesapId = "Kapatılmış hesaba hareket girilemez.";
  if (!form?.tarih) hatalar.tarih = "Tarih girilmedi.";
  const t = tutarOku(form?.tutar);
  if (!Number.isFinite(t)) hatalar.tutar = "Tutar sayıya çevrilemedi.";
  else if (t <= 0) hatalar.tutar = "Tutar sıfırdan büyük olmalı.";
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return { hatalar, kayit: { tur: "virman", tarih: form.tarih, tutar: t, hesapId: a.id, karsiHesapId: b.id, aciklama: String(form.aciklama || "").trim() } };
};

// Son kullanılan hesap (R17): en son tarihli ödeme hareketinin açık hesabı.
// Spec 0053 R2, R23: yeni ödeme satırının ön yöntemi, en son tarihli ödemenin yöntemi. Ciro ve kendi çek elle seçilemediği
// (yalnız çek işlemiyle atandığı) ve boş yöntem bir seçim olmadığı için atlanır; hiç yoksa boş ("Belirtilmemiş").
const ELLE_SECILEMEYEN_YONTEMLER = new Set(["Çek (ciro)", "Çek (kendi)"]);
// Triyaj bulgu 3: aynı tarihte kimlik sırası giriş sırası değildir (uid rastgele); yeni hareketler diziye sona eklendiği için
// eşit tarihte dizideki son eleman en yenidir (0051'in kimlik sıralaması dersi).
export const sonKullanilanYontem = (hareketler = []) => {
  let son = null;
  for (const m of hareketler || []) {
    if (!m || m.tur !== "odeme" || !m.yontem || ELLE_SECILEMEYEN_YONTEMLER.has(m.yontem)) continue;
    if (!son || (m.tarih || "") >= (son.tarih || "")) son = m;
  }
  return son ? son.yontem : "";
};

export const sonKullanilanHesap = (hareketler = [], hesaplar = []) => {
  const son = hareketler.filter(m => m && m.tur === "odeme" && m.hesapId != null).sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "") || Number(b.id) - Number(a.id))[0];
  const h = son && hesaplar.find(x => String(x.id) === String(son.hesapId) && !x.kapali && x.paraBirimi === "TRY");
  return h ? h.id : null;
};

// ── Avans, mahsup ve ekstre (spec 0024 B; R9–R13, C8; plan B1–B11) ─────────────
const idEsit = (a, b) => a != null && b != null && String(a) === String(b);
const hesapHatasi = (hesapId, hesaplar) => {
  if (hesapId == null || hesapId === "") return null;
  const h = hesaplar.find(x => String(x.id) === String(hesapId));
  if (!h) return "Hesap bulunamadı.";
  if (h.kapali) return "Kapatılmış hesaba hareket girilemez.";
  if (h.paraBirimi !== "TRY") return "Avans yalnız TL hesaptan verilir.";
  return null;
};
const paraMetni = (k) => tl(k).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// B1, B5: çalışan başına avans borcu = verilen avanslar − mahsuplar. Mahsubun bağlı olduğu maaş kalemi canlı değilse
// (çöpte ya da yok) mahsup sayılmaz; kalem geri alınınca döner. giderler: ham dizi.
export const avansBorclari = (hareketler = [], giderler = []) => {
  const canli = new Set(giderler.filter(k => k && !k.deletedAt).map(k => String(k.id)));
  const r = new Map();
  const al = (id) => { const k = String(id); if (!r.has(k)) r.set(k, { calisanId: id, verilenK: 0, mahsupK: 0, borcK: 0 }); return r.get(k); };
  for (const m of hareketler || []) {
    if (!m || m.calisanId == null) continue;
    if (m.tur === "avans") al(m.calisanId).verilenK += kurus(m.tutar);
    else if (m.tur === "mahsup" && canli.has(String(m.giderId))) al(m.calisanId).mahsupK += kurus(m.tutar);
  }
  for (const x of r.values()) x.borcK = Math.max(0, x.verilenK - x.mahsupK);
  return r;
};
export const avansBorcuK = (calisanId, hareketler, giderler) => avansBorclari(hareketler, giderler).get(String(calisanId))?.borcK || 0;

// Triyaj bulgu 1: avans silinince kalan avans toplamı mahsup edilmiş tutarın altına inerse silme engellenir; yoksa mahsup
// arkasında avans olmadan maaşın bir kısmını kapatmış sayılır (açık avans, borç özeti ve ekstre üç ayrı rakam verir).
// Dönüş: { ok, eksikK, mahsuplar: [canlı kaleme bağlı mahsup hareketleri] }.
export const avansSilinebilirMi = (avans, hareketler = [], giderler = []) => {
  const b = avansBorclari(hareketler, giderler).get(String(avans?.calisanId)) || { verilenK: 0, mahsupK: 0 };
  const eksikK = b.mahsupK - (b.verilenK - kurus(avans?.tutar));
  const canli = new Set(giderler.filter(k => k && !k.deletedAt).map(k => String(k.id)));
  const mahsuplar = (hareketler || []).filter(m => m && m.tur === "mahsup" && idEsit(m.calisanId, avans?.calisanId) && canli.has(String(m.giderId)));
  return { ok: eksikK <= 0, eksikK: Math.max(0, eksikK), mahsuplar };
};

// Spec 0073 R6, R28 (Q6): avans düzenlemesinin tutar sınırı, silme kuralının tutar duyarlı karşılığı. Yeni tutarla çalışanın
// avans toplamı mahsup toplamının altına düşemez (silme, yeni tutarın sıfır olduğu özel durumdur; aynı kapsam).
// Dönüş: { ok, eksikK, enAzK, mahsupK }.
export const avansDuzenlenebilirMi = (avans, yeniTutar, hareketler = [], giderler = []) => {
  const b = avansBorclari(hareketler, giderler).get(String(avans?.calisanId)) || { verilenK: 0, mahsupK: 0 };
  const digerK = b.verilenK - kurus(avans?.tutar);
  const enAzK = Math.max(0, b.mahsupK - digerK);
  const eksikK = enAzK - kurus(yeniTutar);
  return { ok: eksikK <= 0, eksikK: Math.max(0, eksikK), enAzK, mahsupK: b.mahsupK };
};
export const avansEnAzMetni = (d) => `Bu avans en az ${paraMetni(d.enAzK)} ₺ olmalı; ${paraMetni(d.mahsupK)} ₺ tutarında mahsup edilmiş.`;

// Spec 0073 R10, R12, R22, R27: bir hareketin düzenleme ve silme durumu (tek kural; listeler ve pencere bunu okur).
// giderVar: ödeme/mahsup hareketinin kalemi canlı ya da çöpte duruyor mu (kalıcı silinmişse düzenlenemez, silinebilir).
export const CEK_HAREKETI_NEDENI = "Çeke bağlı hareket buradan değiştirilemez; çek işleminden (ciro iptali, çek iptali) değiştirin.";
export const SILINMIS_KALEM_NEDENI = "Kalemi kalıcı silinmiş ödeme düzenlenemez, yalnız silinebilir (kalan hesaplanamaz).";
export const KAPALI_HESAP_NEDENI = "Hesap kapalı; düzeltmek için hesabı geçici olarak açın.";
// R11, X8: hareket olmayan satırların (tahsilat, verilen çek) kendi ekranı; ibare tıklanabilir değildir. Makina tahsilatı,
// servis ve Extra Kalıp müşteri detayında, yedek parça Stok'ta.
export const tahsilatSatiriIbaresi = (satir) => (satir?.kaynak === SATIS_KAYNAK.YEDEK ? "Stok › Yedek Parça Satışı'ndan değiştirilir" : "Müşteri detayından değiştirilir");
export const VERILEN_CEK_IBARESI = "Kasa › Çek Portföyü'nden değiştirilir";
export const hareketDuzenlemeDurumu = (m, { giderVar = () => true } = {}) => {
  if (!m) return { duzenlenebilir: false, silinebilir: false, neden: null };
  if (m.cekId != null) return { duzenlenebilir: false, silinebilir: false, neden: CEK_HAREKETI_NEDENI };
  if ((m.tur === "odeme" || m.tur === "mahsup") && !giderVar(m.giderId)) return { duzenlenebilir: false, silinebilir: true, neden: SILINMIS_KALEM_NEDENI };
  return { duzenlenebilir: true, silinebilir: true, neden: null, goc: !!m.tamKapatir };
};

// R9, B4: avans bir çalışana verilir; hesap isteğe bağlı (verilirse açık ve TL). Gider üretmez (R11, C3).
export const avansDogrula = (form, { calisanlar = [], hesaplar = [] } = {}) => {
  const hatalar = {};
  const c = calisanlar.find(x => idEsit(x.id, form?.calisanId));
  if (!c) hatalar.calisanId = "Çalışan seçilmedi.";
  else if (c.deletedAt) hatalar.calisanId = "Silinmiş çalışana avans verilemez.";
  if (!form?.tarih) hatalar.tarih = "Tarih girilmedi.";
  const t = tutarOku(form?.tutar);
  if (!Number.isFinite(t)) hatalar.tutar = "Tutar sayıya çevrilemedi. Örnek: 5.000,00";
  else if (t <= 0) hatalar.tutar = "Tutar sıfırdan büyük olmalı.";
  const hh = hesapHatasi(form?.hesapId, hesaplar);
  if (hh) hatalar.hesapId = hh;
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return { hatalar, kayit: { tur: "avans", tarih: form.tarih, tutar: t, calisanId: c.id, hesapId: form.hesapId == null || form.hesapId === "" ? null : form.hesapId,
    yontem: form.yontem || "", aciklama: String(form.aciklama || "").trim() } };
};

// R10, B2: mahsup aynı çalışanın personel kalemine yapılır; sınır kalem (taksitliyse taksit) kalanı ile açık avans
// borcunun küçüğüdür. kalem: odemeleriUygula'dan geçmiş kalem; giderler: ham dizi (avans borcu için).
// Triyaj bulgu 2: mahsup yalnız ekstre ve borç özetinin kapsamındaki kaleme yapılır (gider tarihi bugün veya öncesi,
// yürürlük ayı veya sonrası); yoksa açık avans düşer ama ekstre o kalemi görmez ve iki rakam ayrışır.
export const mahsupKapsamda = (kalem, { bugun = null, yururlukAy = null } = {}) => kapsamda(kalem, yururlukAy ? `${yururlukAy}-01` : "", bugun);
export const mahsupDogrula = (form, { kalem, turMap, hareketler = [], giderler = [], bugun = null, yururlukAy = null } = {}) => {
  const hatalar = {};
  if (!kalem) return { hatalar: { hedef: "Mahsup edilecek kalem bulunamadı." }, kayit: null };
  // Spec 0074 R22 (S6): kural davranışa bakar ve personel denetiminden ÖNCE durur (yoksa SGK metni hiç görünmezdi).
  if (sgkDavranisiMi(davranisOf(kalem, turMap))) return { hatalar: { hedef: SGK_MAHSUP_HATASI }, kayit: null };
  if (davranisOf(kalem, turMap) !== DAVRANIS.PERSONEL || kalem.calisanId == null) return { hatalar: { hedef: "Avans yalnız personel kalemine mahsup edilir." }, kayit: null };
  if (!mahsupKapsamda(kalem, { bugun, yururlukAy })) return { hatalar: { hedef: "Gelecek tarihli ya da yürürlük öncesi maaş kalemine mahsup yapılamaz." }, kayit: null };
  const satirli = satirliMi(kalem);
  if (satirli && form?.taksitId == null) hatalar.hedef = "Taksitli kalemde mahsup bir taksite bağlanır.";
  if (!form?.tarih) hatalar.tarih = "Tarih girilmedi.";
  const t = tutarOku(form?.tutar);
  // Spec 0074 R22, AC-43: SGK personel kaleminde değil; mahsup sınırı 0070 öncesine döndü (SGK kalanı çıkarılmaz).
  const kalanK = odemeHedefKalaniK(kalem, DAVRANIS.PERSONEL, satirli ? form?.taksitId : null);
  const borcK = avansBorcuK(kalem.calisanId, hareketler, giderler);
  if (!Number.isFinite(t)) hatalar.tutar = "Tutar sayıya çevrilemedi.";
  else if (t <= 0) hatalar.tutar = "Tutar sıfırdan büyük olmalı.";
  else if (kurus(t) > borcK) hatalar.tutar = `Açık avans borcundan fazla mahsup edilemez (açık avans ${paraMetni(borcK)} ₺).`;
  else if (kurus(t) > kalanK) hatalar.tutar = `Kalandan fazla mahsup edilemez (kalan ${paraMetni(kalanK)} ₺).`;
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return { hatalar, kayit: { tur: "mahsup", tarih: form.tarih, tutar: t, calisanId: kalem.calisanId, giderId: kalem.id, taksitId: satirli ? form.taksitId : null,
    hesapId: null, aciklama: String(form.aciklama || "").trim() } };
};

// Spec 0078 triyaj (bulgu 1): çöpten geri alınan ödeme ve mahsup, bugünkü CANLI hareketlerle aynı doğrulayıcılardan geçer
// (odemeDogrula, mahsupDogrula). Silinen ödeme yeniden girildiyse çöpteki kopyası geri alınınca kalem iki kez ödenmiş, hesap
// iki kez düşmüş görünürdü; mahsupta avans borcu eksiye düşerdi. Ebeveyn (hesap, çek) denetlenmez (R20): hesap alanı
// doğrulamaya verilmez. Kalemi bulunmayan (kalıcı silinmiş) ya da tutarsız göç hareketi engellenmez. Dönüş: neden ya da null.
export const copHareketGeriAlmaNedeni = (h, { giderler = [], hareketler = [], turMap = new Map(), bugun = null, yururlukAy = null } = {}) => {
  if (!h || (h.tur !== "odeme" && h.tur !== "mahsup") || h.tutar == null) return null;
  const kalem = (giderler || []).find(k => k && String(k.id) === String(h.giderId));
  if (!kalem) return null;
  const canli = (hareketler || []).filter(m => m && !m.deletedAt && String(m.id) !== String(h.id));
  const zengin = odemeleriUygula([kalem], canli, turMap)[0];
  const form = { tutar: h.tutar, tarih: h.tarih, taksitId: h.taksitId, yontem: h.cekId != null ? "" : h.yontem };
  const r = h.tur === "mahsup"
    ? mahsupDogrula(form, { kalem: zengin, turMap, hareketler: canli, giderler, bugun, yururlukAy })
    : odemeDogrula(form, { kalem: zengin, turMap });
  const ilk = Object.values(r.hatalar || {})[0];
  return ilk ? `Geri alınamadı: ${ilk}` : null;
};

// B6: ekstre borç özetiyle aynı kapsam: canlı, tarihli, yürürlük ayından sonra ve bugünden önce doğan kalemler.
function kapsamda(k, esik, bugun) { return !!k && !k.deletedAt && !!k.tarih && !(esik && k.tarih < esik) && !(bugun && k.tarih > bugun); }
const anaHedef = (k, dav) => odemeHedefleri(k, dav).find(h => h.hedef === HEDEF.ANA) || { toplamK: 0, kalanK: 0 };
// Kalemin ana hedefine (kiraya veren / tedarikçi / çalışan) giden ödeme ve mahsuplar, tarih sırasıyla ve her birinin ana
// hedefe düşen payı: hareketler sırayla eklenip motor yeniden çalıştırılır, kalan farkı o hareketin payıdır (B7: tutarsız
// göç hareketi o anki kalanı kapatır). Stopaja giden pay tedarikçi ekstresine girmez.
const anaPaylari = (k, hareketler, turMap) => hareketPaylari(k, hareketler, turMap, { yalnizAna: true }); // spec 0041 Q1: tek hesap
const sirala = (satirlar) => satirlar.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || a.sira - b.sira);
const yuru = (satirlar, baslangicK = 0) => { let b = baslangicK; for (const s of satirlar) { b += s.etkiK; s.bakiyeK = b; } return b; };
// Tarih aralığı: aralıktan önceki satırlar "Devreden bakiye" olur, sonrası çıkar.
const araliga = (satirlar, aralik) => {
  const bas = aralik?.bas || "", bit = aralik?.bit || "";
  const once = bas ? satirlar.filter(s => (s.tarih || "") < bas) : [];
  const ic = satirlar.filter(s => (!bas || (s.tarih || "") >= bas) && (!bit || (s.tarih || "") <= bit));
  const devirK = once.reduce((a, s) => a + s.etkiK, 0);
  const son = yuru(ic, devirK);
  return { devirK: bas ? devirK : null, satirlar: ic, bakiyeK: son, bakiye: tl(son) };
};

// R12, AC-16: tedarikçi ekstresi. Borç = kalemin ana hedef tutarı (KDV dâhil; kirada kiraya verene giden kısım).
export const tedarikciEkstresi = (tedarikciId, { giderler = [], hareketler = [], turler = [], yururlukAy = null, bugun = null, aralik = null } = {}) => {
  const turMap = turHaritasi(turler);
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const satirlar = [];
  for (const k of giderler) {
    if (!kapsamda(k, esik, bugun) || !idEsit(k.tedarikciId, tedarikciId)) continue;
    const dav = davranisOf(k, turMap);
    if (dav === DAVRANIS.PERSONEL) continue;
    const toplamK = anaHedef(k, dav).toplamK;
    if (toplamK <= 0) continue;
    satirlar.push({ tarih: k.tarih, sira: 0, tur: "borc", kalem: k, etkiK: toplamK, tutarK: toplamK });
    for (const p of anaPaylari(k, hareketler, turMap)) satirlar.push({ tarih: p.hareket.tarih || k.tarih, sira: 1, tur: "odeme", kalem: k, hareket: p.hareket, etkiK: -p.payK, tutarK: p.payK, goc: p.hareket.kaynak === "goc" });
  }
  return araliga(sirala(satirlar), aralik);
};

// R13, AC-17, B8: çalışan ekstresi, tek net sütun: + çalışana borcumuz, − çalışandan alacağımız. Maaş kalemi borç doğurur,
// ödeme borcu düşer, avans alacak doğurur (net −), mahsup borcu ve alacağı birlikte kapatır (net 0; tutar ayrıca yazar).
export const calisanEkstresi = (calisanId, { giderler = [], hareketler = [], turler = [], yururlukAy = null, bugun = null, aralik = null } = {}) => {
  const turMap = turHaritasi(turler);
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const satirlar = [];
  for (const k of giderler) {
    if (!kapsamda(k, esik, bugun) || !idEsit(k.calisanId, calisanId) || davranisOf(k, turMap) !== DAVRANIS.PERSONEL) continue;
    // Spec 0042 R6, AC-10: çalışanın alacağı kalemin bütün hedefleridir (resmi ve elden); her ödeme hangi hedefi
    // kapattığını taşır (satırlı kalemde bağlı satırın hedefi).
    // Spec 0074 R21: SGK personel kaleminin hedefi değildir; ekstre 0070 öncesindeki sade hâlinde.
    const toplamK = odemeHedefleri(k, DAVRANIS.PERSONEL).reduce((a, h) => a + h.toplamK, 0);
    satirlar.push({ tarih: k.tarih, sira: 0, tur: "maas", kalem: k, etkiK: toplamK, tutarK: toplamK,
      kirilim: { resmiK: kurus(k.resmiTutar), eldenK: kurus(k.eldenTutar), ekK: ekOdemeKurus(k), maasK: maasKurus(k) } });
    const hedefMap = hareketHedefPaylari(k, hareketler, turMap);
    for (const p of hareketPaylari(k, hareketler, turMap)) {
      const mahsup = p.hareket.tur === "mahsup";
      const hedef = (k.taksitler || []).find(r => idEsit(r.id, p.hareket.taksitId))?.hedef || null;
      // Spec 0051 R8, R10 (Q1): hedef payları (satırsız kalemde de; bölünmüş hareket iki hedef taşır).
      const hedefPaylari = hedefMap.get(String(p.hareket.id)) || [];
      satirlar.push({ tarih: p.hareket.tarih || k.tarih, sira: 1, tur: mahsup ? "mahsup" : "odeme", kalem: k, hareket: p.hareket, hedef, hedefPaylari,
        etkiK: mahsup ? 0 : -p.payK, tutarK: p.payK, goc: p.hareket.kaynak === "goc" });
    }
  }
  for (const m of hareketler || []) if (m && m.tur === "avans" && idEsit(m.calisanId, calisanId)) {
    satirlar.push({ tarih: m.tarih, sira: 2, tur: "avans", hareket: m, etkiK: -kurus(m.tutar), tutarK: kurus(m.tutar) });
  }
  const r = araliga(sirala(satirlar), aralik);
  return { ...r, avansBorcK: avansBorcuK(calisanId, hareketler, giderler) };
};
