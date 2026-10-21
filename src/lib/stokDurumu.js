// Spec 0100: stoktaki makinanın üretim durumu, "önceki partiden kaldı" işareti ve parti üretim panosu. Saf modül, React'sız
// (C1). Stok ekranı, pano ve Anasayfa aynı fonksiyonları çağırır (R31, C11); ekranlar saymaz, süzmez ve sıralamaz.
// Motor tek `veri` nesnesi alır: `{ stock, customers, uretimPartileri }`, hepsi CANLI diziler (R31/2, Karar 19).
import { trLower } from "./utils";
import { partiAcikMi } from "./uretimPartisi";

// R1, Karar 12: kalıcı alan `stock[].uretimDurumu`, saklanan değerler yalnız bu ikisi.
export const URETIM_DURUMU = { MONTAJ: "montaj", HAZIR: "hazir" };
export const DURUM_ADLARI = { montaj: "Montajda", hazir: "Satışa hazır" };
export const ONCEKI_PARTI_ADI = "Önceki partiden kaldı";
export const MODEL_YOK = "model girilmemiş";
export const DURUM_ETIKETI = "Üretim durumu";

// R1/2, R3: tek okuma yolu. Alan yoksa ya da değer tanınmıyorsa satışa hazırdır (göç yok, plan P6).
export const uretimDurumuOf = (s) => (s?.uretimDurumu === URETIM_DURUMU.MONTAJ ? URETIM_DURUMU.MONTAJ : URETIM_DURUMU.HAZIR);
// R1/2, R4/2 (plan P5): yazım yalnız kullanıcı seçiciye dokununca; tanınmayan değer kayda yazılmaz.
export const uretimDurumuYaz = (kayit, deger) => {
  const { uretimDurumu: _eski, ...kalan } = kayit || {};
  return Object.values(URETIM_DURUMU).includes(deger) ? { ...kalan, uretimDurumu: deger } : kalan;
};

const canli = (a) => (Array.isArray(a) ? a : []).filter(x => x && !x.deletedAt);
const modelAnahtari = (m) => trLower(String(m || "").trim());
const adSirasi = (a, b) => String(a).localeCompare(String(b), "tr");

// R9, R9/2, R10, R10/2: partisi kapanmış (uygulamanın tek ölçütü `partiAcikMi`) ve canlı listede bulunan parti. Karşılaştırma
// `String(partiId)` ile; partisiz, çöpteki ve kaydı bulunamayan parti işaret vermez.
const partiHaritasi = (partiler) => new Map(canli(partiler).map(p => [String(p.id), p]));
const oncekiPartidenMi = (s, harita) => {
  if (s?.partiId == null) return false;
  const p = harita.get(String(s.partiId));
  return !!p && !partiAcikMi(p);
};

// R16, R25, R26, R27: bütün stoğun özeti. `satirlar` satır kimliği → { durum, onceki } (rozet ve süzgeç bundan okunur).
// Model satırları satışa hazır adedine göre azalan, eşitlikte ada göre (Karar 9, R26/2).
export const stokDurumOzeti = (veri = {}) => {
  const harita = partiHaritasi(veri.uretimPartileri);
  const ozet = { toplam: 0, montajda: 0, hazir: 0, oncekiParti: 0, modeller: [], satirlar: new Map() };
  const modeller = new Map();
  for (const s of canli(veri.stock)) {
    const durum = uretimDurumuOf(s);
    const onceki = oncekiPartidenMi(s, harita);
    ozet.satirlar.set(s.id, { durum, onceki });
    ozet.toplam += 1;
    if (durum === URETIM_DURUMU.MONTAJ) ozet.montajda += 1; else ozet.hazir += 1;
    if (onceki) ozet.oncekiParti += 1;
    const k = modelAnahtari(s.model);
    if (!modeller.has(k)) modeller.set(k, { anahtar: k, model: String(s.model || "").trim() || MODEL_YOK, toplam: 0, montajda: 0, hazir: 0, oncekiParti: 0 });
    const m = modeller.get(k);
    m.toplam += 1;
    if (durum === URETIM_DURUMU.MONTAJ) m.montajda += 1; else m.hazir += 1;
    if (onceki) m.oncekiParti += 1;
  }
  ozet.modeller = [...modeller.values()].sort((a, b) => b.hazir - a.hazir || adSirasi(a.model, b.model));
  return ozet;
};

// R15, R15/3: durum süzgeci. Satır durumu `stokDurumOzeti().satirlar`'dan gelir.
export const DURUM_SUZGECLERI = [
  { value: "tumu", label: "Tümü" },
  { value: "montaj", label: "Montajda" },
  { value: "hazir", label: "Satışa hazır" },
  { value: "onceki", label: "Önceki partiden" },
];
export const durumSuzgeciUyar = (satirDurumu, suzgec) => {
  if (!suzgec || suzgec === "tumu") return true;
  if (!satirDurumu) return false;
  if (suzgec === "onceki") return satirDurumu.onceki;
  return satirDurumu.durum === suzgec;
};
export const suzgecSayisi = (ozet, suzgec) => ({ tumu: ozet.toplam, montaj: ozet.montajda, hazir: ozet.hazir, onceki: ozet.oncekiParti })[suzgec] ?? 0;

// R25–R28, Karar 8, plan P12: Anasayfa kutusu. En çok üç model, yalnız satışa hazırı sıfırdan büyük olanlar; kalan sayısı.
export const KUTU_ETIKETI = "Satışa Hazır Makina";
export const KUTU_MODEL_SINIRI = 3;
export const kutuAltSatiri = (ozet) => `${ozet.montajda} montajda · ${ozet.oncekiParti} önceki partiden`;
export const kutuModelleri = (ozet) => {
  const hazirlar = ozet.modeller.filter(m => m.hazir > 0);
  return { liste: hazirlar.slice(0, KUTU_MODEL_SINIRI), kalan: Math.max(0, hazirlar.length - KUTU_MODEL_SINIRI) };
};
export const kalanModelMetni = (n) => `${n} model daha`;
export const ORTUSME_CUMLESI = "Önceki partiden kalanlar ayrı bir küme değildir; Satışa hazır ve Montajda sütunlarının içinden sayılır.";
export const STOK_BOS_METNI = "Stokta makina yok.";

// R6/2, R6/3, Karar 16, plan P3: serisiz satışta düşülecek makina. Önce satışa hazır olanlar, sonra montajdakiler; her grupta en
// eski (stoğa giriş tarihi artan; eşitlikte dizide daha sonra duran, çünkü yeni makina dizinin başına eklenir). Kimlik sıralı değil.
export const serisizDusulecek = (stock, model) => {
  const adaylar = canli(stock).map((s, i) => ({ s, i })).filter(({ s }) => s.model === model && !s.serialNo);
  adaylar.sort((a, b) => {
    const da = uretimDurumuOf(a.s) === URETIM_DURUMU.HAZIR ? 0 : 1;
    const db = uretimDurumuOf(b.s) === URETIM_DURUMU.HAZIR ? 0 : 1;
    if (da !== db) return da - db;
    const ta = String(a.s.addedDate || ""), tb = String(b.s.addedDate || "");
    if (ta !== tb) return ta < tb ? -1 : 1;
    return b.i - a.i;
  });
  return adaylar[0]?.s ?? null;
};
// R6, R6/2: seçenek metinleri. Durum yalnız serili seçenekte; serisiz tek seçenek kırılımı yazar.
export const seriliSecenekMetni = (s) => `${s.serialNo} · ${DURUM_ADLARI[uretimDurumuOf(s)]}`;
export const serisizSecenekMetni = (stock, model) => {
  const satirlar = canli(stock).filter(s => s.model === model && !s.serialNo);
  const hazir = satirlar.filter(s => uretimDurumuOf(s) === URETIM_DURUMU.HAZIR).length;
  const montaj = satirlar.length - hazir;
  const parcalar = [hazir ? `${hazir} satışa hazır` : null, montaj ? `${montaj} montajda` : null].filter(Boolean);
  return `Seri no'suz stoktan düş: ${parcalar.join(", ")}`;
};

// ── Parti Üretim Panosu (R18–R24) ───────────────────────────────────────────────────────────────────────────────────────────
export const PANO_SEKME_ADI = "Parti Üretim Panosu";
// Triyaj (bulgu 2), C5: parti seçicilerinin "(açık)" eki tek ölçütten (`partiAcikMi`); ekranlar bitiş ayına kendisi bakmaz.
export const partiSecenekAdi = (p) => `${p.ad}${partiAcikMi(p) ? " (açık)" : ""}`;
export const PANO_BOS_PARTI = "Henüz üretim partisi yok.";
export const PANO_BOS_VERI = "Bu partide plan ve makina yok.";
export const FAZLA_IBARESI = "plandan fazla üretildi";

// R18/2, plan P9: en son başlayan açık parti; açık parti yoksa en son başlayan canlı parti; eşitlikte ad.
export const panoVarsayilanParti = (partiler) => {
  const liste = canli(partiler).slice().sort((a, b) => String(b.baslangicAy || "").localeCompare(String(a.baslangicAy || "")) || adSirasi(a.ad, b.ad));
  return liste.find(p => partiAcikMi(p)) ?? liste[0] ?? null;
};

// R19–R21, R24, Karar 22: seçilen partinin beş sayısı ve model satırları. Satılan adet partiye bağlı canlı müşteri kayıtlarından
// (devir yeni kayıt açmaz, her makina bir kez, R20). Kırpma model satırında: kalan negatifse sıfır ve satır işaretlenir (R21);
// planı girilmemiş model planlanan 0 sayıldığı için (R24) üretilmişse o da işaretlenir. Toplam kalan kırpılmış kalanların toplamı.
export const partiUretimOzeti = (veri = {}, partiId) => {
  const parti = canli(veri.uretimPartileri).find(p => String(p.id) === String(partiId)) ?? null;
  const bos = { parti, satirlar: [], toplam: { planlanan: 0, montajda: 0, hazir: 0, satildi: 0, kalan: 0, fazla: false }, bos: true };
  if (!parti) return bos;
  const satirlar = new Map();
  const satir = (ad) => {
    const k = modelAnahtari(ad);
    if (!satirlar.has(k)) satirlar.set(k, { anahtar: k, model: String(ad || "").trim() || MODEL_YOK, planlanan: 0, montajda: 0, hazir: 0, satildi: 0, kalan: 0, fazla: false });
    return satirlar.get(k);
  };
  // R19/3, plan P11: görünen ad önce planlanan adetteki ad.
  for (const [ad, adet] of Object.entries(parti.planlananAdetler || {})) {
    const n = Number(adet);
    if (!Number.isFinite(n)) continue;
    satir(ad).planlanan += n;
  }
  const bu = (x) => x?.partiId != null && String(x.partiId) === String(parti.id);
  for (const s of canli(veri.stock).filter(bu)) {
    const r = satir(s.model);
    if (uretimDurumuOf(s) === URETIM_DURUMU.MONTAJ) r.montajda += 1; else r.hazir += 1;
  }
  for (const c of canli(veri.customers).filter(bu)) satir(c.model).satildi += 1;
  const liste = [...satirlar.values()];
  if (!liste.length) return bos;
  const toplam = { planlanan: 0, montajda: 0, hazir: 0, satildi: 0, kalan: 0, fazla: false };
  for (const r of liste) {
    const fark = r.planlanan - (r.montajda + r.hazir + r.satildi);
    r.kalan = Math.max(0, fark);
    r.fazla = fark < 0;
    for (const k of ["planlanan", "montajda", "hazir", "satildi", "kalan"]) toplam[k] += r[k];
    if (r.fazla) toplam.fazla = true;
  }
  liste.sort((a, b) => b.planlanan - a.planlanan || adSirasi(a.model, b.model));
  return { parti, satirlar: liste, toplam, bos: false };
};
