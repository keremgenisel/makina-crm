// Üretim partisi (spec 0022, plan P1–P10): saf yardımcılar. React'sız.
// Parti yalnız maliyet dağıtımının tabanıdır (C7): kapsadığı ayların ortak gideri partinin makinalarına bölünür.
// Spec 0090'dan beri bölme `makinaStandartMaliyet.partiGenelPaylari`'ndadır (genel gider havuzu, tür rolü kapısı); bu dosya tanım
// doğrulaması, ay aralığı, kapanış anlık görüntüsü ve silme onayı sayısını tutar.
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

// Spec 0090 R23–R26, R36, R36/2, R37: kapanış anlık görüntüsü yeni alana (`kapanisGenelHavuzlari`, { "YYYY-AA": kuruş }) yazılır;
// girdi yeni motorun ay haritasıdır (`partiGenelPaylari(...).aylar`, ayın genel gider havuzu). Yürürlük öncesi ay hesaba girmediği
// için anlık görüntüye de girmez. Haritada olmayan bir ay (ya da harita yoksa) kayıt YAPILMAZ: sessizce boş görüntü yazılsaydı
// değişim kutusu o parti için sonsuza dek susardı. Eski alan (`kapanisOrtaklari`, kova tabanlı ortak gider) hiç okunmaz ve
// yazılmaz; kayıtta olduğu gibi kalır (C7, AC-44).
export const KAPANIS_HARITA_YOK = "Kapanış için ayların genel gider havuzu hesaplanamadı; parti kaydedilmedi.";
export const kapanisAnlikGoruntusu = (p, havuz) => {
  const aylar = havuz?.aylar, yururlukAy = havuz?.yururlukAy || null; // havuz null olabilir (R37: ret, çökme değil)
  if (!aylar?.has) return null;
  const r = {};
  for (const ay of partiAylari(p, p.bitisAy)) {
    if (yururlukAy && ay < yururlukAy) continue;
    if (!aylar.has(ay)) return null;
    r[ay] = aylar.get(ay);
  }
  return r;
};
// Kayıt anında kapanış durumunu kurar ({ kayit } ya da { hata }). Bitiş yeni girildiyse ya da aralık değiştiyse anlık görüntü
// alınır; aralığı değişmeyen kapalı parti kapanış zamanını ve (varsa) görüntüsünü korur (R26; 0090 öncesi kapanmış partiye
// düzenlemede yeni görüntü yazılmaz, R25); bitiş silinirse (yeniden açma) yeni alanın anahtarı silinir, null yazılmaz (R36).
export const partiKapanisUygula = (eski, yeni, havuz, simdi) => {
  const { kapanisGenelHavuzlari: _g, ...temel } = yeni;
  if (!yeni.bitisAy) return { kayit: { ...temel, kapanmaZamani: null } };
  const ayniAralik = eski && eski.bitisAy && eski.bitisAy === yeni.bitisAy && eski.baslangicAy === yeni.baslangicAy;
  if (ayniAralik) {
    return { kayit: { ...temel, kapanmaZamani: eski.kapanmaZamani || null, ...(eski.kapanisGenelHavuzlari ? { kapanisGenelHavuzlari: eski.kapanisGenelHavuzlari } : {}) } };
  }
  const goruntu = kapanisAnlikGoruntusu(yeni, havuz);
  if (!goruntu) return { hata: KAPANIS_HARITA_YOK };
  // Bütün ayları yürürlük öncesi olan partide görüntü boştur; boş nesne gövdeye yazılmaz (okuma onu geri getirmez, C8).
  return { kayit: { ...temel, kapanmaZamani: simdi, ...(Object.keys(goruntu).length ? { kapanisGenelHavuzlari: goruntu } : {}) } };
};

// AC-14: silme onayında etkilenecek canlı makina sayısı (stok + satılmış).
export const partiMakinaSayisi = (partiId, { stock = [], customers = [] } = {}) =>
  [...stock, ...customers].filter(x => x && !x.deletedAt && x.partiId != null && String(x.partiId) === String(partiId)).length;
