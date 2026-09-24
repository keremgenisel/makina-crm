// Makina maliyeti ve kârlılık: saf hesap motoru (spec 0002, plan M1–M13). React'sız, salt okunur.
//
// Maliyet üretimde oluşur (R1): doğrudan atanmış giderler + model havuzlarından malzeme payları + üretim
// ayının ortak gider payı. Satışta komisyon eklenir, kâr = gerçek satış bedeli (TL) − toplam maliyet.
// Kova bölmesi 0001 motorundan (gider.js kalemKovalariKurus) okunur, burada yeniden türetilmez (R2).
// Hesap kuruş tamsayısıyla yapılır. Tarihler "YYYY-MM-DD" düz metin olarak karşılaştırılır.
//
// İki katman (C9): hesaplaMakinaMaliyetleri dönemden bağımsız ağır hesaptır, arayüz bir kez memoize eder;
// karlilikOzeti / makinaKarlilik / fiyatOnerisi onun üstünde ucuz türetimlerdir.
import {
  ayOf, ayEkle, ayinSonGunu, tamAylar, turHaritasi, davranisOf, makinaCozucuOlustur,
  canliModelSeti, kalemKovalariKurus, kurus, tl, standartGiderAyi,
} from "./gider";
import { trLower, parseMoney, gercekSatisBedeli } from "./utils";
import { CURRENCIES } from "./constants";
import { GERI_DONEN_STOK_NOTU } from "./musteriKaskad";

export const ORTAK_KAYNAK = { GERCEK: "gercek", STANDART: "standart" };
export const ORTAK_KAYNAK_ETIKET = { gercek: "Gerçekleşen gider kayıtları", standart: "Aylık standart genel giderler" };
export const MALZEME_HARIC_NOTU = "Stoktan çekilen parçaların maliyeti hariç.";
export const BUGUNKU_VERI_NOTU = "Bugünkü veriye göre hesaplanmıştır; geçmiş aylara gider eklenirse rakam değişir.";

// Üretim tarihinin nereden geldiği (R1b). TAHMIN ve BILINMIYOR ekranda etiketlenir.
export const URETIM_KAYNAK = {
  KAYIT: "kayit",           // satış/stok kaydına yazılmış veya elle düzeltilmiş
  STOK: "stok",             // stok satırının giriş tarihi
  HAREKET: "hareket",       // makina üretimi stok hareketinin tarihi (eski satışlar)
  DOGRUDAN: "dogrudan",     // stoğa hiç girmeden müşteri kaydı açılmış: satış tarihi = üretim tarihi
  TAHMIN: "tahmin",         // stoktan satılmış ama iz yok: satış tarihi (tahmin)
  BILINMIYOR: "bilinmiyor", // hiçbir tarih yok: maliyet hesaplanmaz
};

const karsilastirId = (a, b) => {
  const na = Number(a), nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a).localeCompare(String(b));
};
// R17c: aynı gün üretilenlerde seri numarası, yoksa kayıt kimliği. Amaç yalnız determinizm.
const makinaSirasi = (a, b) => {
  if (a.uretimTarihi !== b.uretimTarihi) return a.uretimTarihi < b.uretimTarihi ? -1 : 1;
  if (a.seri && b.seri && a.seri !== b.seri) return a.seri.localeCompare(b.seri, "tr", { numeric: true });
  if (!!a.seri !== !!b.seri) return a.seri ? -1 : 1;
  if (a.tur !== b.tur) return a.tur < b.tur ? -1 : 1;
  return karsilastirId(a.id, b.id);
};

// Makina üretimi stok hareketlerinin ilk tarihi, stok kimliğine göre (R1b adım 2).
export const hareketTarihHaritasi = (partStockLog = []) => {
  const m = new Map();
  for (const l of partStockLog || []) {
    if (l?.tip !== "makina_uretimi" || l.referansId == null || !l.tarih) continue;
    const k = String(l.referansId);
    if (!m.has(k) || l.tarih < m.get(k)) m.set(k, l.tarih);
  }
  return m;
};

// Satış (müşteri) kaydının üretim tarihi çözümü (R1b): kayıt → stok hareketi → satış tarihi.
export const musteriUretimTarihi = (c, hareketMap = new Map()) => {
  if (c?.uretimTarihi) return { tarih: c.uretimTarihi, kaynak: URETIM_KAYNAK.KAYIT };
  if (c?.sourceStockId != null) {
    const h = hareketMap.get(String(c.sourceStockId));
    if (h) return { tarih: h, kaynak: URETIM_KAYNAK.HAREKET };
    return c.installDate ? { tarih: c.installDate, kaynak: URETIM_KAYNAK.TAHMIN } : { tarih: "", kaynak: URETIM_KAYNAK.BILINMIYOR };
  }
  return c?.installDate ? { tarih: c.installDate, kaynak: URETIM_KAYNAK.DOGRUDAN } : { tarih: "", kaynak: URETIM_KAYNAK.BILINMIYOR };
};

// Silinen müşteriden stoğa dönen satıra taşınacak özgün üretim tarihi (plan M3).
export const donenStokUretimTarihi = (c, partStockLog = []) => musteriUretimTarihi(c, hareketTarihHaritasi(partStockLog)).tarih || "";

export const geriDonenStokMu = (s) => s?.note === GERI_DONEN_STOK_NOTU;

// Üretim tarihi taşımayan ESKİ geri dönen satırın özgün tarihi: çöpteki müşterisinden (model + seri, 
// geriDonenStokBul ile aynı eşleşme). Stok düzenlemesi kaydedilirken satıra yazılır (MakinaStokTab), çünkü
// "geri dönen" tanıması düzenlenebilir not metnine bağlıdır; not değişince tarih kaybolmasın.
const copMusterisi = (s, copMusteriler) => copMusteriler.find(x => x.deletedAt && x.model === s.model && (x.serialNo || "") === (s.serialNo || ""));
export const geriDonenStokTarihi = (s, copMusteriler = [], partStockLog = []) => {
  const c = copMusterisi(s, copMusteriler);
  return c ? musteriUretimTarihi(c, hareketTarihHaritasi(partStockLog)).tarih || "" : "";
};

// Stok satırının üretim tarihi. Geri dönen satır dönüş gününde üretilmiş sayılmaz (R1c): taşınmış özgün
// tarihi kullanılır; bu alan gelmeden önce dönmüş eski satırlarda çöpteki müşterisinden bulunur (M3).
const stokUretimTarihi = (s, copMusteriler, hareketMap) => {
  if (s.uretimTarihi) return { tarih: s.uretimTarihi, kaynak: URETIM_KAYNAK.KAYIT };
  if (geriDonenStokMu(s)) {
    const c = copMusterisi(s, copMusteriler);
    return c ? musteriUretimTarihi(c, hareketMap) : { tarih: "", kaynak: URETIM_KAYNAK.BILINMIYOR };
  }
  return s.addedDate ? { tarih: s.addedDate, kaynak: URETIM_KAYNAK.STOK } : { tarih: "", kaynak: URETIM_KAYNAK.BILINMIYOR };
};

// Canlı makina listesi (R27). İkinci el devir aynı kaydı değiştirdiği için isResale kaydı fabrikanın ilk
// satışıdır ve bir kez listelenir (plan M1); devrin kendisi hiçbir hesap üretmez.
export const makinaListesi = ({ customers = [], stock = [], partStockLog = [] } = {}) => {
  const hareketMap = hareketTarihHaritasi(partStockLog);
  const copMusteriler = customers.filter(c => c.deletedAt);
  const liste = [];
  for (const c of customers) {
    if (c.deletedAt) continue;
    const u = musteriUretimTarihi(c, hareketMap);
    liste.push({
      anahtar: `musteri:${c.id}`, tur: "musteri", id: c.id, model: c.model || "", modelKey: trLower(c.model || ""),
      seri: c.serialNo || "", ad: c.name || c.firma || "", uretimTarihi: u.tarih, uretimKaynak: u.kaynak,
      satildi: true, satisTarihi: c.installDate || "", kayit: c,
    });
  }
  for (const s of stock) {
    if (s.deletedAt) continue;
    const u = stokUretimTarihi(s, copMusteriler, hareketMap);
    liste.push({
      anahtar: `stok:${s.id}`, tur: "stok", id: s.id, model: s.model || "", modelKey: trLower(s.model || ""),
      seri: s.serialNo || s.seriNo || "", ad: "Makina Stoğu", uretimTarihi: u.tarih, uretimKaynak: u.kaynak,
      satildi: false, satisTarihi: "", kayit: s,
    });
  }
  return liste;
};

const bosSinif = () => ({ makina: 0, model: 0, dagitma: 0, ortak: 0 });

// ── Ağır hesap (dönemden bağımsız) ────────────────────────────────────────────
export const hesaplaMakinaMaliyetleri = ({
  customers = [], stock = [], partStockLog = [], giderler = [], giderTurleri = [], standartGiderler = [],
  standardModels = [], customModels = [], giderAyarlari = {},
} = {}, { bugun } = {}) => {
  const yurAy = giderAyarlari?.yururlukAy || null;
  const kaynak = giderAyarlari?.ortakGiderKaynagi === ORTAK_KAYNAK.STANDART ? ORTAK_KAYNAK.STANDART : ORTAK_KAYNAK.GERCEK;
  const turMap = turHaritasi(giderTurleri);
  const canliModeller = canliModelSeti(standardModels, customModels);
  const makinaCoz = makinaCozucuOlustur({ stock, customers });

  const makinalar = makinaListesi({ customers, stock, partStockLog }).map(m => ({
    ...m, uretimAy: m.uretimTarihi ? ayOf(m.uretimTarihi) : "",
    veriYok: !!(yurAy && m.uretimTarihi && ayOf(m.uretimTarihi) < yurAy),
    dogrudan: 0, dogrudanKalemler: [], malzeme: 0, malzemePaylari: [], ortakPay: 0,
  }));
  const makinaMap = new Map(makinalar.map(m => [m.anahtar, m]));
  const tarihli = makinalar.filter(m => m.uretimTarihi).sort(makinaSirasi);

  // Gider kalemleri: canlı ve yürürlük ayından sonra (plan M6; 0001 raporuyla aynı kapsam).
  const esik = yurAy ? `${yurAy}-01` : "";
  const kalemler = giderler.filter(k => !k.deletedAt && k.tarih && (!esik || k.tarih >= esik));
  const ortakGercek = new Map();
  const sinifAy = new Map();
  const havuzlar = [];
  for (const k of kalemler) {
    const dav = davranisOf(k, turMap);
    const kv = kalemKovalariKurus(k, { davranis: dav, makinaCoz, canliModeller });
    const ay = ayOf(k.tarih);
    if (!sinifAy.has(ay)) sinifAy.set(ay, bosSinif());
    const sa = sinifAy.get(ay);
    for (const key of ["makina", "model", "dagitma", "ortak"]) sa[key] += kv[key];
    ortakGercek.set(ay, (ortakGercek.get(ay) || 0) + kv.ortak);
    if (kv.makina > 0) {
      // R19: doğrudan atama kalem tarihinden bağımsız olarak makinanın üretim maliyetine girer.
      const m = makinaMap.get(`${kv.makinaCozum.tur}:${kv.makinaCozum.id}`);
      // Çözücü yalnız canlı makinayı döndürür ve makina listesi aynı canlı kayıtlardan kurulur; eşleşme hep var.
      if (m) { m.dogrudan += kv.makina; m.dogrudanKalemler.push({ kalemId: k.id, tarih: k.tarih, aciklama: k.aciklama || "", tutar: tl(kv.makina) }); }
    }
    if (kv.model > 0) {
      // R16: yalnız canlı modellerin satırları havuz kurar; toplam 0001'in model kovasını aşamaz.
      let kalan = kv.model;
      (k.modelSatirlari || []).forEach((s, sira) => {
        const modelKey = trLower(s.modelAd);
        if (!canliModeller.has(modelKey) || kalan <= 0) return;
        const birim = kurus(s.birimMaliyet), kapasite = Math.max(0, Math.floor(Number(s.adet) || 0));
        const boyut = Math.min(birim * kapasite, kalan);
        kalan -= boyut;
        if (boyut > 0 && birim > 0) havuzlar.push({ kalemId: k.id, tarih: k.tarih, aciklama: k.aciklama || "", modelKey, modelAd: s.modelAd, birim, kapasite, boyut, kalan: boyut, sira, paylar: [] });
      });
    }
  }

  // Model havuzları (R16–R18b), plan M13 paralel: her havuz bağımsızdır ve kendi tarihinden sonra (dahil)
  // üretilmiş makinalara üretim sırasıyla birer pay verir (R17b). Havuz sırası yalnız determinizm içindir.
  const modelMakinalari = new Map();
  for (const m of tarihli) {
    if (!modelMakinalari.has(m.modelKey)) modelMakinalari.set(m.modelKey, []);
    modelMakinalari.get(m.modelKey).push(m);
  }
  havuzlar.sort((a, b) => (a.tarih !== b.tarih ? (a.tarih < b.tarih ? -1 : 1) : (karsilastirId(a.kalemId, b.kalemId) || a.sira - b.sira)));
  for (const h of havuzlar) {
    const liste = modelMakinalari.get(h.modelKey) || [];
    let lo = 0, hi = liste.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (liste[mid].uretimTarihi < h.tarih) lo = mid + 1; else hi = mid; }
    for (let i = lo; i < liste.length && h.paylar.length < h.kapasite && h.kalan > 0; i++) {
      const pay = Math.min(h.birim, h.kalan);
      const m = liste[i];
      m.malzeme += pay;
      m.malzemePaylari.push({ kalemId: h.kalemId, tarih: h.tarih, aciklama: h.aciklama, pay: tl(pay) });
      h.kalan -= pay;
      h.paylar.push({ anahtar: m.anahtar, uretimTarihi: m.uretimTarihi, pay });
    }
  }
  // R18b / plan M4: modelinin kendinden önce (dahil) tarihli en az bir havuzu varken hiç pay almamış makina.
  const ilkHavuzTarihi = new Map();
  for (const h of havuzlar) if (!ilkHavuzTarihi.has(h.modelKey) || h.tarih < ilkHavuzTarihi.get(h.modelKey)) ilkHavuzTarihi.set(h.modelKey, h.tarih);
  for (const m of tarihli) {
    const ilk = ilkHavuzTarihi.get(m.modelKey);
    m.malzemePayiAlamadi = !!ilk && m.uretimTarihi >= ilk && m.malzemePaylari.length === 0;
  }

  // Ay tablosu ve ortak gider payı (R2, R11, R22). Pay eşittir, kuruş aşağı yuvarlanır, artık ilk makinaya.
  const uretilenAy = new Map();
  for (const m of tarihli) {
    if (m.veriYok) continue;
    if (!uretilenAy.has(m.uretimAy)) uretilenAy.set(m.uretimAy, []);
    uretilenAy.get(m.uretimAy).push(m);
  }
  // Ay tablosu yürürlük ayından başlar; tanımsızsa en erken veri ayından (standart kaynakta en erken standart
  // sürümün başlangıcı dahil). Aksi hâlde ilk gider/üretimden önceki aylar tablodan düşer ve o ayların
  // dağıtılmamış ortak gideri (R11) ile standart farkı (R25) sessizce sıfır görünürdü.
  const buAy = ayOf(bugun || new Date().toISOString().slice(0, 10));
  const stdAylari = kaynak === ORTAK_KAYNAK.STANDART ? standartGiderler.map(s => s.baslangicAy).filter(Boolean) : [];
  const tumAylar = [...uretilenAy.keys(), ...ortakGercek.keys(), ...stdAylari, buAy].filter(Boolean).sort();
  const aylar = new Map();
  if (tumAylar.length) {
    const ilk = yurAy || tumAylar[0];
    const son = tumAylar[tumAylar.length - 1];
    const grupAdlari = new Map();
    for (const s of standartGiderler) { const g = String(s.grupId ?? s.id); if (!grupAdlari.has(g)) grupAdlari.set(g, s.ad); }
    for (let ay = ilk; ay <= son; ay = ayEkle(ay, 1)) {
      if (yurAy && ay < yurAy) continue;
      const std = standartGiderAyi(standartGiderler, ay);
      const stdGruplari = new Set(std.satirlar.map(s => String(s.grupId ?? s.id)));
      const standartEksik = [...grupAdlari].filter(([g]) => !stdGruplari.has(g)).map(([, ad]) => ad);
      const gercek = ortakGercek.get(ay) || 0;
      const standart = kurus(std.toplam);
      const ortak = kaynak === ORTAK_KAYNAK.STANDART ? standart : gercek;
      const uretilen = uretilenAy.get(ay) || [];
      let pay = 0, dagitilmamis = 0;
      if (uretilen.length) {
        pay = Math.floor(ortak / uretilen.length);
        const artik = ortak - pay * uretilen.length;
        uretilen.forEach((m, i) => { m.ortakPay = pay + (i === 0 ? artik : 0); });
      } else dagitilmamis = ortak;
      aylar.set(ay, { ay, uretimAdedi: uretilen.length, ortakGercek: gercek, ortakStandart: standart, ortak, pay, dagitilmamis, standartEksik, siniflar: sinifAy.get(ay) || bosSinif() });
    }
  }
  for (const m of makinalar) m.uretimMaliyeti = m.dogrudan + m.malzeme + m.ortakPay;
  return { makinalar: makinaMap, liste: makinalar, aylar, havuzlar, kaynak, yururlukAy: yurAy };
};

// ── Satış tarafı ──────────────────────────────────────────────────────────────
// Kârlılık TL'dir (R4b). Kayıtlı kur (R12) varsa o, yoksa güncel kur "yaklaşık" (R13); ikisi de yoksa
// TL karşılığı hesaplanamaz (plan M7). Komisyon satış bedeliyle aynı para biriminde ve aynı kurla.
export const satisKurBilgisi = (c, rates) => {
  const para = CURRENCIES.includes(c?.currency) ? c.currency : "TRY";
  if (para === "TRY") return { para, kur: 1, durum: "tl" };
  const kayitli = Number(c?.satisKuru);
  if (kayitli > 0) return { para, kur: kayitli, durum: "kayitli" };
  const guncel = Number(rates?.[para.toLowerCase()]);
  if (guncel > 0) return { para, kur: guncel, durum: "yaklasik" };
  return { para, kur: null, durum: "yok" };
};

// Tek makinanın maliyet ve kâr kırılımı (R6, AC-8). Tutarlar TL; iç toplamlar için kuruş değerleri ayrı
// döner, dışarı açılmaz.
const karlilikIc = (sonuc, anahtar, rates) => {
  const m = sonuc?.makinalar?.get(anahtar);
  if (!m) return { detay: null, k: null };
  const temel = {
    anahtar, makina: m, uretimTarihi: m.uretimTarihi, uretimKaynak: m.uretimKaynak, veriYok: m.veriYok,
    bilinmiyor: !m.uretimTarihi, kaynak: sonuc.kaynak,
    dogrudan: tl(m.dogrudan), malzeme: tl(m.malzeme), ortakPay: tl(m.ortakPay), uretimMaliyeti: tl(m.uretimMaliyeti),
    dogrudanKalemler: m.dogrudanKalemler, malzemePaylari: m.malzemePaylari, malzemePayiAlamadi: !!m.malzemePayiAlamadi,
  };
  if (!m.satildi) return { detay: { ...temel, satildi: false }, k: { uretim: m.uretimMaliyeti } };
  const c = m.kayit;
  const kur = satisKurBilgisi(c, rates);
  const bedel = gercekSatisBedeli(c), komisyon = parseMoney(c.komisyon);
  const bedelYok = !(bedel > 0);
  const cevir = (v) => (kur.kur ? Math.round(kurus(v) * kur.kur) : null);
  const bedelK = cevir(bedel), komisyonK = cevir(komisyon);
  const hesaplanabilir = !bedelYok && bedelK != null && !m.veriYok && !!m.uretimTarihi;
  const toplamK = komisyonK != null ? m.uretimMaliyeti + komisyonK : null;
  const karK = hesaplanabilir ? bedelK - toplamK : null;
  const detay = {
    ...temel, satildi: true, satisTarihi: m.satisTarihi, para: kur.para, kur: kur.kur, kurDurum: kur.durum,
    bedelOrijinal: bedel, komisyonOrijinal: komisyon, bedelYok,
    satisBedeli: bedelK != null ? tl(bedelK) : null, komisyon: komisyonK != null ? tl(komisyonK) : null,
    toplamMaliyet: toplamK != null ? tl(toplamK) : null,
    kar: karK != null ? tl(karK) : null, zarar: karK != null && karK < 0,
    marj: hesaplanabilir && bedelK > 0 ? (karK / bedelK) * 100 : null,
    carpan: hesaplanabilir && toplamK > 0 ? bedelK / toplamK : null,
  };
  return { detay, k: { bedel: bedelK, toplam: toplamK, kar: karK, uretim: m.uretimMaliyeti, komisyon: komisyonK } };
};
export const makinaKarlilik = (sonuc, anahtar, rates) => karlilikIc(sonuc, anahtar, rates).detay;

export const marjBicim = (m) => (m == null || !Number.isFinite(m) ? "—" : `%${m.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`);
export const carpanBicim = (c) => (c == null || !Number.isFinite(c) ? "—" : c.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

// ── Dönem özeti (R7) ──────────────────────────────────────────────────────────
export const karlilikOzeti = (sonuc, { baslangic, bitis, rates } = {}) => {
  const icinde = (t) => !!t && t >= baslangic && t <= bitis;
  const satirlar = [], veriYok = [], bilinmiyor = [], bedelsiz = [], kursuz = [];
  let bedelT = 0, maliyetT = 0, karT = 0, bedelsizMaliyet = 0, yaklasikVar = false;
  for (const m of sonuc.liste) {
    if (!m.satildi || !icinde(m.satisTarihi)) continue;
    const { detay: d, k } = karlilikIc(sonuc, m.anahtar, rates);
    if (!m.uretimTarihi) { bilinmiyor.push(d); continue; }
    if (m.veriYok) { veriYok.push(d); continue; }
    if (d.bedelYok) { bedelsiz.push(d); bedelsizMaliyet += k.uretim + (k.komisyon || 0); continue; }
    if (d.kar == null) { kursuz.push(d); continue; }
    satirlar.push(d);
    bedelT += k.bedel; maliyetT += k.toplam; karT += k.kar;
    if (d.kurDurum === "yaklasik") yaklasikVar = true;
  }
  satirlar.sort((a, b) => (a.satisTarihi < b.satisTarihi ? -1 : a.satisTarihi > b.satisTarihi ? 1 : 0));
  const toplam = {
    satisBedeli: tl(bedelT), toplamMaliyet: tl(maliyetT), kar: tl(karT),
    marj: bedelT > 0 ? (karT / bedelT) * 100 : null, carpan: maliyetT > 0 ? bedelT / maliyetT : null,
  };

  // Aralık bitişi itibarıyla hâlâ satılmamış, maliyeti bilinen makinalar (R19, AC-74, plan M5).
  let stokT = 0, stokAdet = 0;
  for (const m of sonuc.liste) {
    if (!m.uretimTarihi || m.uretimTarihi > bitis || m.veriYok) continue;
    if (m.satildi && m.satisTarihi && m.satisTarihi <= bitis) continue;
    stokT += m.uretimMaliyeti; stokAdet++;
  }

  // Ay bazlı iki satır yalnız aralığa tam giren aylarda (R7, AC-66).
  const aylar = tamAylar(baslangic, bitis);
  const yurAy = sonuc.yururlukAy;
  const kapsananAylar = aylar ? aylar.filter(a => !yurAy || a >= yurAy) : null;
  const ayTopla = (fn) => (kapsananAylar || []).reduce((a, ay) => a + (sonuc.aylar.get(ay) ? fn(sonuc.aylar.get(ay)) : 0), 0);
  const dagitilmamis = kapsananAylar ? { tutar: tl(ayTopla(r => r.dagitilmamis)), aylar: kapsananAylar.filter(a => sonuc.aylar.get(a)?.dagitilmamis > 0) } : null;
  const standart = sonuc.kaynak === ORTAK_KAYNAK.STANDART;
  const standartFark = standart && kapsananAylar ? {
    gercek: tl(ayTopla(r => r.ortakGercek)), standart: tl(ayTopla(r => r.ortakStandart)),
    fark: tl(ayTopla(r => r.ortakGercek - r.ortakStandart)),
  } : null;
  const standartEksik = standart && kapsananAylar
    ? kapsananAylar.map(ay => ({ ay, adlar: sonuc.aylar.get(ay)?.standartEksik || [] })).filter(x => x.adlar.length) : [];

  // Henüz yüklenmemiş malzeme ve pay alamamış makina, model bazında, bitiş itibarıyla (R18, R18b, M5).
  const modelOzet = new Map();
  const mo = (key, ad) => { if (!modelOzet.has(key)) modelOzet.set(key, { model: ad, yuklenmemis: 0, payAlamamis: 0 }); return modelOzet.get(key); };
  for (const h of sonuc.havuzlar) {
    if (h.tarih > bitis) continue;
    const verilen = h.paylar.filter(p => p.uretimTarihi <= bitis).reduce((a, p) => a + p.pay, 0);
    if (h.boyut - verilen > 0) mo(h.modelKey, h.modelAd).yuklenmemis += h.boyut - verilen;
  }
  for (const m of sonuc.liste) if (m.malzemePayiAlamadi && m.uretimTarihi <= bitis) mo(m.modelKey, m.model).payAlamamis++;
  const modeller = [...modelOzet.values()].filter(x => x.yuklenmemis > 0 || x.payAlamamis > 0)
    .map(x => ({ ...x, yuklenmemis: tl(x.yuklenmemis) })).sort((a, b) => a.model.localeCompare(b.model, "tr"));

  return {
    bos: satirlar.length + veriYok.length + bilinmiyor.length + bedelsiz.length + kursuz.length === 0,
    satirlar, toplam, yaklasikVar, kaynak: sonuc.kaynak,
    veriYok: { adet: veriYok.length, makinalar: veriYok },
    bilinmiyor: { adet: bilinmiyor.length, makinalar: bilinmiyor },
    bedelsiz: { adet: bedelsiz.length, maliyet: tl(bedelsizMaliyet), makinalar: bedelsiz },
    kursuz: { adet: kursuz.length, makinalar: kursuz },
    stokta: { adet: stokAdet, maliyet: tl(stokT), tarih: bitis },
    dagitilmamis, standartFark, standartEksik, modeller, tamAy: !!aylar,
  };
};

// ── Fiyat önerisi (R9, R9b, R24) ──────────────────────────────────────────────
export const FIYAT_YONTEM = { MARJ: "marj", EKLE: "ekle", KAT: "kat" };
export const FIYAT_YONTEM_ETIKET = {
  marj: "Satış bedeli üzerinden marj", ekle: "Maliyetin üstüne kâr ekleme", kat: "Maliyetin katı",
};
// Varsayılan dönem: içinde bulunulan ay dahil geriye 12 takvim ayı (plan M11).
export const sonOnIkiAy = (bugun) => {
  const buAy = ayOf(bugun);
  return { baslangic: `${ayEkle(buAy, -11)}-01`, bitis: ayinSonGunu(buAy) };
};
export const fiyatOnerisi = (sonuc, { model, baslangic, bitis, yontem, deger } = {}) => {
  const key = trLower(model || "");
  const secilen = sonuc.liste.filter(m => m.modelKey === key && m.uretimTarihi && m.uretimTarihi >= baslangic && m.uretimTarihi <= bitis && !m.veriYok);
  if (!secilen.length) return { hata: `${model || "Seçilen model"} için bu dönemde üretilmiş makina yok; ortalama maliyet hesaplanamıyor.` };
  const ortK = Math.round(secilen.reduce((a, m) => a + m.uretimMaliyeti, 0) / secilen.length);
  const temel = { adet: secilen.length, ortalama: tl(ortK), yontem, baslangic, bitis };
  const d = Number(deger);
  if (deger === "" || deger == null || !Number.isFinite(d)) return { ...temel, hata: "Bir değer girin." };
  let fiyatK, uyari = null;
  if (yontem === FIYAT_YONTEM.MARJ) {
    if (!(d > 0 && d < 100)) return { ...temel, hata: "Marj sıfırdan büyük ve yüzden küçük olmalı." };
    fiyatK = ortK / (1 - d / 100);
  } else if (yontem === FIYAT_YONTEM.EKLE) {
    if (!(d >= 0)) return { ...temel, hata: "Eklenecek kâr sıfır veya daha büyük olmalı." };
    fiyatK = ortK * (1 + d / 100);
  } else {
    if (!(d > 0)) return { ...temel, hata: "Kat değeri sıfırdan büyük olmalı." };
    fiyatK = ortK * d;
    if (d < 1) uyari = "Kat 1'in altında: önerilen fiyat ortalama maliyetin altında, zararına satış.";
  }
  return { ...temel, fiyat: Math.round(fiyatK / 100), uyari };
};
