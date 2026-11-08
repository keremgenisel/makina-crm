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
// Spec 0136 R3/2 (AC-57, plan turu Karar 41): bitiş ayı gelecekte olamaz. `bugun` isteğe bağlıdır; ekran her zaman geçirir,
// verilmezse eski davranış sürer (0022/0090 motor testleri).
export const GELECEK_BITIS_HATASI = "Bitiş ayı gelecekte olamaz; parti üretim bittiğinde kapatılır.";
export const partiDogrula = (form, partiler = [], bugun = null) => {
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
  else if (bit && bugun && bit > String(bugun).slice(0, 7)) hatalar.bitisAy = GELECEK_BITIS_HATASI;
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
// Spec 0136 R1, R4, R8–R9/2, R11–R11/4, R19/2, C4 (AC-1, AC-5, AC-8–AC-11, AC-48, AC-75): beşinci parametre kapanışın MALİYET
// görüntüsü (`makinaStandartMaliyet.partiKapanisGoruntusu`'nun sonucu, kaydedilecek kayıtla hesaplanmış). Verilmezse (`undefined`,
// eski çağıran) yalnız ay havuzu yazılır (0090 davranışı); `null` verilirse görüntü alınamadı demektir ve kapanış REDDEDİLİR. Görüntü
// boş haritalı olsa da markörüyle (`kapanisGunu`) yazılır; yeniden açma iki anahtarı da siler (null yazılmaz); aralığı değişmeyen
// kapalı partinin düzenlemesi var olan görüntüyü korur.
export const KAPANIS_MALIYET_YOK = "Kapanış için makina maliyetleri hesaplanamadı (parça ve model kataloğu yüklenmedi); parti kaydedilmedi.";
// Triyaj (bulgu 2, 3): "aralık değişmedi" kararının tek yeri; kapanış yolu, onay ve görüntünün hesaplanıp hesaplanmayacağı bunu okur.
export const kapanisAraligiAyniMi = (eski, yeni) => !!(eski && eski.bitisAy && eski.bitisAy === yeni?.bitisAy && eski.baslangicAy === yeni?.baslangicAy);
export const partiKapanisUygula = (eski, yeni, havuz, simdi, goruntu) => {
  const { kapanisGenelHavuzlari: _g, kapanisMaliyeti: _m, ...temel } = yeni;
  if (!yeni.bitisAy) return { kayit: { ...temel, kapanmaZamani: null } };
  if (kapanisAraligiAyniMi(eski, yeni)) {
    return { kayit: { ...temel, kapanmaZamani: eski.kapanmaZamani || null, ...(eski.kapanisGenelHavuzlari ? { kapanisGenelHavuzlari: eski.kapanisGenelHavuzlari } : {}),
      ...(kapanisMaliyetiOf(eski) ? { kapanisMaliyeti: eski.kapanisMaliyeti } : {}) } };
  }
  const anlik = kapanisAnlikGoruntusu(yeni, havuz);
  if (!anlik) return { hata: KAPANIS_HARITA_YOK };
  if (goruntu === null) return { hata: KAPANIS_MALIYET_YOK };
  // Bütün ayları yürürlük öncesi olan partide ay görüntüsü boştur; boş nesne gövdeye yazılmaz (okuma onu geri getirmez, C8).
  return { kayit: { ...temel, kapanmaZamani: simdi, ...(Object.keys(anlik).length ? { kapanisGenelHavuzlari: anlik } : {}),
    ...(goruntu && goruntu.kapanisGunu ? { kapanisMaliyeti: goruntu } : {}) } };
};

// ── Spec 0136: dondurma durumu (R2/2, R12, R12/2) ────────────────────────────────────────────────────────────────────────
// "Donduruldu mu" sorusunun TEK ölçütü maliyet görüntüsünün (markörüyle) varlığıdır; ay havuzu görüntüsü bu soruyu cevaplamaz.
export const kapanisMaliyetiOf = (p) => (p?.bitisAy && p.kapanisMaliyeti && typeof p.kapanisMaliyeti === "object" && p.kapanisMaliyeti.kapanisGunu ? p.kapanisMaliyeti : null);
export const DONDURMA = { ACIK: "acik", DONMUS: "donmus", DONDURULMADI: "dondurulmadi" };
export const partiDondurmaDurumu = (p) => (!p?.bitisAy ? DONDURMA.ACIK : kapanisMaliyetiOf(p) ? DONDURMA.DONMUS : DONDURMA.DONDURULMADI);
// Ekran metinleri (tek sabit; R12/2, R22, R22/2, R23, R24, R25, R10/4, R10/5, R7).
const gunMetniTR = (g) => { const [y, a, d] = String(g || "").slice(0, 10).split("-"); return y && a && d ? `${d}.${a}.${y}` : ""; };
export const kapanisTarihiMetni = (zaman) => (gunMetniTR(zaman) ? `Kapanış ${gunMetniTR(zaman)}` : "");
export const DONDURULMADI_KISA = "dondurulmadı";
export const DONDURULMADI_IBARESI = "Bu parti maliyet dondurmasından önce kapandı; rakamlar bugünkü veriyle hesaplanır (dondurulmadı). Dondurmak için partinin bitiş ayını silip yeniden girin.";
export const donmusSeritMetni = (gun) => `Rakamlar ${gunMetniTR(gun)} kapanışında donduruldu.`;
export const kapanistaAdetMetni = (n) => `kapanışta ${n}`;
// Triyaj (bulgu 4): R7'nin ölçütü yalnız "kapanış görüntüsünde bu makinanın maliyeti yok"tur (sonradan bağlanan, stoğa dönen ya da
// kapanışta modeli bulunamayan makina); metin nedeni tahmin etmez.
export const DONDURULMAMIS_SATIR_NEDENI = "Kapanış görüntüsünde bu makinanın maliyeti yok; bugünkü maliyetle hesaplandı (dondurulmadı).";
export const DONMUS_KATSAYI_IPUCU = "Donan şey maliyettir: kâr katsayısı, önerilen satış ve önerilen ciro bugünkü katsayıyla hesaplanır.";
export const DONMUS_TEDARIK_NOTU = "Standart direkt maliyet kapanışta dondurulmuş değerdir; gerçekleşen tedarik bugünkü gider kayıtlarından gelir, Fark bu yüzden değişebilir.";
export const YENIDEN_ACMA_ONAYI = "Bitiş ayı silinince bu partinin dondurulmuş maliyeti silinir. Parti yeniden kapatıldığında rakamlar o günkü veriyle yeniden hesaplanır.";
export const KAPANIS_DONDU_BILDIRIMI = "Parti kapatıldı: makina maliyetleri bugünkü rakamlarla donduruldu.";
export const YENIDEN_ACMA_BASLIGI = "Dondurulmuş maliyet silinsin mi?";
// Triyaj (bulgu 2, Karar 52): donmuş partinin aralığı (başlangıç ya da bitiş ayı) değişince maliyet bugünkü veriyle yeniden dondurulur.
export const ARALIK_DEGISIM_BASLIGI = "Dondurulmuş maliyet yeniden hesaplansın mı?";
export const ARALIK_DEGISIM_ONAYI = "Partinin dönemi değişince dondurulmuş maliyeti silinir ve rakamlar bugünkü veriyle yeniden hesaplanıp dondurulur.";
export const KAPANIS_YENIDEN_DONDU_BILDIRIMI = "Partinin dönemi değişti: makina maliyetleri bugünkü rakamlarla yeniden donduruldu.";
export const PLAN_KAPALI_NEDENI = "Parti kapandı; planlanan adetler kapanmış partide değiştirilmez.";
export const SAPMA_BASLIGI = "Kapanmış partilerde bugünkü veriyle oluşan fark";
export const SAPMA_ALT_BASLIGI = "Gösterilen rakam değişmedi, yalnız bugünkü veriyle arada fark oluştu.";
export const SAPMA_DUZELTME = "Düzeltmek için Üretim Partileri'nde partinin bitiş ayını silip yeniden girin.";
export const SAPMA_DIREKT_ETIKETI = "Direkt maliyet";
export const SAPMA_PAY_ETIKETI = "Genel gider payı";
// Görüntüsüz (0090) kutunun bugünkü metinleri (plan turu Karar 47: kutuda dondurulmuş parti yokken aynen).
export const DEGISIM_BASLIGI = "Kapanmış partilerin aylarında değişen ortak gider";
export const DEGISIM_ALT_BASLIGI = "Parti kapandıktan sonra bu aylara gider eklendi, değişti ya da silindi. Paylar bugünkü veriyle yeniden hesaplandı.";

// AC-14: silme onayında etkilenecek canlı makina sayısı (stok + satılmış).
export const partiMakinaSayisi = (partiId, { stock = [], customers = [] } = {}) =>
  [...stock, ...customers].filter(x => x && !x.deletedAt && x.partiId != null && String(x.partiId) === String(partiId)).length;
