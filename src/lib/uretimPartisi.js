// Üretim partisi (spec 0022, plan P1–P10): saf yardımcılar. React'sız.
// Parti yalnız maliyet dağıtımının tabanıdır (C7): kapsadığı ayların ortak gideri partinin makinalarına bölünür.
// Bölme makinaMaliyeti.js'dedir (C1, tek motor); bu dosya tanım doğrulaması, ay aralığı, kapanış anlık görüntüsü
// ve silme onayı sayısını tutar.
import { ayEkle } from "./gider";
import { trLower } from "./utils";

const AY_RE = /^\d{4}-\d{2}$/;

// R3: açık parti başlangıçtan içinde bulunulan aya, kapalı parti başlangıçtan bitişe.
export const partiAylari = (p, buAy) => {
  if (!p?.baslangicAy || !AY_RE.test(p.baslangicAy)) return [];
  const son = p.bitisAy || buAy;
  const aylar = [];
  for (let a = p.baslangicAy; son && a <= son; a = ayEkle(a, 1)) aylar.push(a);
  return aylar;
};
export const partiAcikMi = (p) => !p?.bitisAy;
export const canliPartiler = (partiler = []) => (partiler || []).filter(p => p && !p.deletedAt);

// R1, AC-22, AC-23: ad zorunlu ve benzersiz (Türkçe harf duyarsız, tedarikçi deseni); bitiş başlangıçtan önce olamaz.
export const partiDogrula = (form, partiler = []) => {
  const hatalar = {};
  const ad = String(form?.ad || "").trim();
  if (!ad) hatalar.ad = "Parti adı girilmedi.";
  else if (canliPartiler(partiler).some(p => String(p.id) !== String(form?.id) && trLower(String(p.ad || "").trim()) === trLower(ad))) {
    hatalar.ad = `“${ad}” adında bir parti zaten var.`;
  }
  const bas = String(form?.baslangicAy || "");
  const bit = String(form?.bitisAy || "");
  if (!AY_RE.test(bas)) hatalar.baslangicAy = "Başlangıç ayı girilmedi.";
  if (bit && !AY_RE.test(bit)) hatalar.bitisAy = "Bitiş ayı geçersiz.";
  else if (bit && AY_RE.test(bas) && bit < bas) hatalar.bitisAy = "Bitiş ayı başlangıç ayından önce olamaz.";
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return { hatalar, kayit: { ...form, ad, baslangicAy: bas, bitisAy: bit || null, aciklama: String(form?.aciklama || "").trim() } };
};

// R15 (P3): kapanışta partinin her ayının o anki ortak gideri (kuruş) yazılır. aylar = makina maliyeti ay tablosu.
export const kapanisAnlikGoruntusu = (p, aylar) => {
  const r = {};
  for (const ay of partiAylari(p, p.bitisAy)) { const a = aylar?.get?.(ay); if (a) r[ay] = a.ortak; }
  return r;
};
// Kayıt anında kapanış durumunu kurar: bitiş yeni girildiyse ya da aralık değiştiyse anlık görüntü yeniden alınır;
// bitiş silinirse (yeniden açma) anlık görüntü silinir. Aralık aynı kalan kapalı partide görüntü korunur.
export const partiKapanisUygula = (eski, yeni, aylar, simdi) => {
  if (!yeni.bitisAy) return { ...yeni, kapanmaZamani: null, kapanisOrtaklari: null };
  const ayniKapanis = eski && eski.bitisAy === yeni.bitisAy && eski.baslangicAy === yeni.baslangicAy && eski.kapanisOrtaklari;
  if (ayniKapanis) return { ...yeni, kapanmaZamani: eski.kapanmaZamani || null, kapanisOrtaklari: eski.kapanisOrtaklari };
  return { ...yeni, kapanmaZamani: simdi, kapanisOrtaklari: kapanisAnlikGoruntusu(yeni, aylar) };
};

// AC-14: silme onayında etkilenecek canlı makina sayısı (stok + satılmış).
export const partiMakinaSayisi = (partiId, { stock = [], customers = [] } = {}) =>
  [...stock, ...customers].filter(x => x && !x.deletedAt && x.partiId != null && String(x.partiId) === String(partiId)).length;
