// Spec 0121 C bölümü: set hazırlama ve geri alma. Saf modül: React almaz, saat okumaz (`bugun` ve `tarih` çağırandan gelir).
//
// Hazırlama stok hareketidir (R19): bileşenler `set_uretimi` (−) ile düşer, setin kendi stoğu `set_girisi` (+) ile artar; hepsi
// tek işlem kimliğini (`referansId`, R18) taşır. Ayrı veri bölümü yoktur. Kırpma kuralı `utils.stokKirparakDus`'tur (C4, R16):
// eldeki kadarı düşer, eksik kalan düşmez, set yine hazırlanır. Stok hesabı bu modülde YAZILMAZ (C9): karşı hareketler ve
// geri alınabilirlik `stokHareketi.js`'ten, uygulama `stokuUygula(stokEtkisi(...))` ile tek yazımdır.
import { uid, stokKirparakDus, totalMiktar } from "./utils";
import { stokEtkisi, stokuUygula, karsiHareketler, karsiGirisler, girisGeriAlinabilir, netGirisler, netDusumleri } from "./stokHareketi";
import { gecerliGunMu, setIcerigiOf } from "./urunAgaci";

export const SET_DUSUM_TIPI = "set_uretimi";
export const SET_GIRIS_TIPI = "set_girisi";
// R15, R15/2 (Karar 18): 0097'nin "Geçerlilik tarihi…" metinleri maliyet geçmişine aittir, burada kullanılmaz.
export const HAZIRLAMA_TARIH_GECERSIZ = "Hazırlama tarihi takvimde var olan bir gün olmalı.";
export const HAZIRLAMA_TARIH_GELECEK = "Hazırlama tarihi bugünden sonra olamaz.";
export const HAZIRLAMA_ADET_HATASI = "Hazırlanan adet en az 1 tam sayı olmalı.";
export const ICERIK_YOK_HATASI = "Bu parçanın içeriği yok; set hazırlanamaz.";
// R16/2 (Karar 20, 32, 51): notun metni. Kullanıcının notu yalnız setin satırına eklenir.
export const hazirlamaNotu = (adet, eksik) => `Set hazırlandı · ${adet} adet${eksik ? ` · ${eksik} bileşen stokta yoktu` : ""}`;
export const GERI_ALMA_NOTU = "Set hazırlama geri alındı";
// R22 (Karar 19): ya hep ya hiç reddinin nedeni.
// Spec 0130 R20, Karar 3: sebep parçalama da olabilir; o zaman çare parçalamanın geri alınmasıdır.
export const geriAlRedMetni = (n) => `Bu hazırlamanın ${n} adedi satılmış, kullanılmış ya da parçalanmış; parçalandıysa önce parçalamayı geri alın, değilse stok sayımını düzeltin.`;
export const GERI_ALINDI_IBARESI = "Geri alındı";
export const GERI_AL_DUGMESI = "Geri Al";
export const PENCERE_BASLIGI = (ad) => `Set Hazırla · ${ad || "Set"}`;
export const SET_HAZIRLA_DUGMESI = "Set Hazırla";

// R14, R14/2: bileşen tablosu, canlı stoktan, yalnız gösterim. Kırpma tek kuraldan (`stokKirparakDus`), kayıtta da aynı.
const kirpma = (set, adet, partStock) => {
  const kalemler = setIcerigiOf(set).map(r => ({ partId: String(r.partId), miktar: (Number(r.miktar) || 0) * adet }));
  const { dusumler } = stokKirparakDus(partStock, kalemler);
  const dusen = new Map(dusumler.map(d => [String(d.partId), d.adet]));
  const eldeki = (pid) => { const n = totalMiktar(partStock || [], pid); return n > 0 ? n : 0; };
  const satirlar = kalemler.map(k => {
    const dusecek = dusen.get(k.partId) || 0;
    return { partId: k.partId, gereken: k.miktar, stokta: eldeki(k.partId), dusecek, eksik: dusecek < k.miktar };
  });
  return { satirlar, dusumler };
};
export const setHazirlaOnizleme = (set, adetHam, partStock = []) => {
  const adet = /^\d+$/.test(String(adetHam ?? "").trim()) ? Number(String(adetHam).trim()) : 0;
  return kirpma(set, adet > 0 ? adet : 0, partStock).satirlar;
};

/**
 * R13, R13/2, R15, R16, R16/2, R18: hazırlama planı. `islemId` verilmezse `uid()`. Dönüş `{ ok, hata, hareketler, eksikler }`;
 * hata varsa hiçbir hareket yoktur. Setin satırı her zaman yazılır; bileşen satırı yalnız gerçekten düşülen parça için doğar.
 */
export const setHazirlaPlani = ({ set, adet: adetHam, tarih, not = "", bugun, partStock = [], islemId } = {}) => {
  if (!setIcerigiOf(set).length) return { ok: false, hata: ICERIK_YOK_HATASI, hareketler: [], eksikler: [] };
  const t = String(adetHam ?? "").trim();
  if (!/^\d+$/.test(t) || Number(t) < 1) return { ok: false, hata: HAZIRLAMA_ADET_HATASI, hareketler: [], eksikler: [] };
  if (!gecerliGunMu(tarih)) return { ok: false, hata: HAZIRLAMA_TARIH_GECERSIZ, hareketler: [], eksikler: [] };
  if (!gecerliGunMu(bugun)) throw new Error("setHazirlaPlani: bugun (YYYY-AA-GG) gerekli");
  if (tarih > bugun) return { ok: false, hata: HAZIRLAMA_TARIH_GELECEK, hareketler: [], eksikler: [] };
  const adet = Number(t);
  const ref = islemId ?? uid();
  const { satirlar, dusumler } = kirpma(set, adet, partStock);
  const eksikler = satirlar.filter(s => s.eksik);
  const notlar = hazirlamaNotu(adet, eksikler.length);
  const kullanici = String(not || "").trim();
  const hareketler = [
    ...dusumler.map(d => ({ id: uid(), partId: String(d.partId), miktar: -d.adet, tip: SET_DUSUM_TIPI, referansId: ref, tarih, notlar })),
    { id: uid(), partId: String(set.id), miktar: adet, tip: SET_GIRIS_TIPI, referansId: ref, tarih, notlar: kullanici ? `${notlar} · ${kullanici}` : notlar },
  ];
  return { ok: true, hata: null, hareketler, eksikler, islemId: ref };
};

/** R20–R22, R18/3: geri alma planı log'dan okur (içeriği yeniden okumaz). Girişi kalmamış hazırlamada `etkisiz: true`. */
export const setGeriAlPlani = ({ islemId, partStock = [], partStockLog = [], tarih } = {}) => {
  const g = girisGeriAlinabilir(partStock, partStockLog, islemId, SET_GIRIS_TIPI);
  if (!g.girisler.size) return { ok: false, etkisiz: true, hata: null, hareketler: [] };
  if (!g.ok) {
    return { ok: false, etkisiz: false, hata: geriAlRedMetni(g.fazla), hareketler: [] };
  }
  const secenek = { tarih, notlar: GERI_ALMA_NOTU };
  return { ok: true, etkisiz: false, hata: null,
    hareketler: [...karsiHareketler(partStockLog, islemId, SET_DUSUM_TIPI, secenek), ...karsiGirisler(partStockLog, islemId, SET_GIRIS_TIPI, secenek)] };
};

/** R25, Karar 44: setin giriş satırının durumu (`acik` geri alınabilir, `geriAlindi`). */
export const hazirlamaGeriAlindiMi = (partStockLog, islemId) => netGirisler(partStockLog, islemId, SET_GIRIS_TIPI).size === 0;

/** Tek yazım: stok adedi motorun etkisiyle, log eklemeyle (işlevsel güncelleyiciler, tam dizi). */
export const setHareketleriniUygula = (setPartStock, setPartStockLog, hareketler) => {
  if (!hareketler?.length) return;
  setPartStock(ps => stokuUygula(ps, stokEtkisi(hareketler)));
  setPartStockLog(lg => [...lg, ...hareketler]);
};

// ── Spec 0130: hazırlanmış setin parçalanması ───────────────────────────────────────────────────────────────────────────────
// Parçalama stok hareketidir (R6): setin kendi stoğu `set_parcalama` (−) ile düşer, içeriğindeki her bileşen `parcalama_girisi` (+)
// ile girer; hepsi tek işlem kimliği ve tek tarih taşır. Hiçbir hazırlama kaydına bağlanmaz (R4), setin O ANKİ içeriğini okur.
// Kırpma yoktur (R3): set tarafı eldeki stokla sınırlıdır ve fazlaysa hiçbir hareket yazılmaz; bileşen tarafı sınırsız giriştir.
// Geri alma log'dan okur (R11); kararı setin kendi çıkışının kalan netindedir (R13, Karar 4).
export const SET_CIKIS_TIPI = "set_parcalama";
export const BILESEN_GIRIS_TIPI = "parcalama_girisi";
export const PARCALAMA_ADET_HATASI = "Parçalanan adet en az 1 tam sayı olmalı.";
export const parcalamaStokHatasi = (eldeki) => `Setin stoğunda ${eldeki} adet var; elde olmayan set parçalanamaz.`;
export const PARCALAMA_ICERIK_YOK = "Bu parçanın içeriği yok; parçalanamaz.";
export const PARCALAMA_TARIH_GECERSIZ = "Parçalama tarihi takvimde var olan bir gün olmalı.";
export const PARCALAMA_TARIH_GELECEK = "Parçalama tarihi bugünden sonra olamaz.";
export const parcalamaNotu = (adet) => `Set parçalandı · ${adet} adet`;
export const PARCALAMA_GERI_ALMA_NOTU = "Set parçalama geri alındı";
export const parcalamaGeriAlRedMetni = (n) => `Bu parçalamada stoğa giren bileşenlerin ${n} adedi kullanılmış ya da satılmış; geri almak için önce stok sayımını düzeltin.`;
export const SET_PARCALA_DUGMESI = "Seti Parçala";
export const PARCALA_PENCERE_BASLIGI = (ad) => `Seti Parçala · ${ad || "Set"}`;
// R16: kırpılmış hazırlamanın yan etkisi (her zaman görünür, AC-22).
export const PARCALAMA_KIRPMA_IBARESI = "Stoğa dönen içerik setin bugünkü içeriğidir. Hazırlanırken stokta olmadığı için düşülmemiş bir bileşen de parçalamada stoğa girer; stok sayısı tutmuyorsa Stok Tutarlılığı raporuna bakın.";

const adetCoz = (ham) => {
  const t = String(ham ?? "").trim();
  return /^\d+$/.test(t) && Number(t) >= 1 ? Number(t) : null;
};
const eldekiAdet = (partStock, pid) => Math.max(0, totalMiktar(partStock || [], pid));
// Bileşen kalemleri: içerik adedi × parçalanan adet; adedi sıfır ya da sayı olmayan bozuk satır hareket doğurmaz (Karar 4).
const parcalamaKalemleri = (set, adet) => setIcerigiOf(set)
  .map(r => ({ partId: String(r.partId), giris: (Number(r.miktar) > 0 ? Number(r.miktar) : 0) * adet }));

/** R15, R21 (AC-20, AC-21): pencere önizlemesi; aritmetik burada, pencere yalnız gösterir. Geçersiz adette girişler 0. */
export const setParcalaOnizleme = (set, adetHam, partStock = []) => {
  const adet = adetCoz(adetHam) || 0;
  const eldeki = set ? eldekiAdet(partStock, String(set.id)) : 0;
  const satirlar = parcalamaKalemleri(set, adet).map(k => ({ partId: k.partId, girecek: k.giris, stokta: eldekiAdet(partStock, k.partId) }));
  // Elde olmayan adet istenirse kalacak adet yoktur (`null`; plan zaten reddeder).
  return { adet, eldeki, kalacak: adet > eldeki ? null : eldeki - adet, satirlar };
};

/** R1–R9 (AC-1–AC-9): parçalama planı. Dönüş `{ ok, hata, hareketler, islemId }`; hata varsa hiçbir hareket yoktur. */
export const setParcalaPlani = ({ set, adet: adetHam, tarih, not = "", bugun, partStock = [], islemId } = {}) => {
  const bos = (hata) => ({ ok: false, hata, hareketler: [] });
  if (!set || !setIcerigiOf(set).length) return bos(PARCALAMA_ICERIK_YOK);
  const adet = adetCoz(adetHam);
  if (adet == null) return bos(PARCALAMA_ADET_HATASI);
  if (!gecerliGunMu(tarih)) return bos(PARCALAMA_TARIH_GECERSIZ);
  if (!gecerliGunMu(bugun)) throw new Error("setParcalaPlani: bugun (YYYY-AA-GG) gerekli");
  if (tarih > bugun) return bos(PARCALAMA_TARIH_GELECEK);
  const eldeki = eldekiAdet(partStock, String(set.id));
  if (adet > eldeki) return bos(parcalamaStokHatasi(eldeki));
  const ref = islemId ?? uid();
  const sistem = parcalamaNotu(adet);
  const kullanici = String(not || "").trim();
  const hareketler = [
    { id: uid(), partId: String(set.id), miktar: -adet, tip: SET_CIKIS_TIPI, referansId: ref, tarih, notlar: kullanici ? `${sistem} · ${kullanici}` : sistem },
    ...parcalamaKalemleri(set, adet).filter(k => k.giris > 0)
      .map(k => ({ id: uid(), partId: k.partId, miktar: k.giris, tip: BILESEN_GIRIS_TIPI, referansId: ref, tarih, notlar: sistem })),
  ];
  return { ok: true, hata: null, hareketler, islemId: ref };
};

/** R12, R13 (Karar 4): parçalama geri alınmış mı; ölçüt setin KENDİ çıkışının kalan netidir, bileşen girişleri değil. */
export const parcalamaGeriAlindiMi = (partStockLog, islemId) => netDusumleri(partStockLog, islemId, SET_CIKIS_TIPI).size === 0;

/** R10–R13 (AC-10–AC-16): geri alma planı log'dan okur. Etkisizde `etkisiz: true`, ya hep ya hiç reddinde `hata`. */
export const setParcalaGeriAlPlani = ({ islemId, partStock = [], partStockLog = [], tarih } = {}) => {
  if (parcalamaGeriAlindiMi(partStockLog, islemId)) return { ok: false, etkisiz: true, hata: null, hareketler: [] };
  const g = girisGeriAlinabilir(partStock, partStockLog, islemId, BILESEN_GIRIS_TIPI);
  // Bileşen girişi hiç yoksa (bozuk içerik) `g.ok` false ve `girisler` boştur; bu bir ret değildir (Karar 4).
  if (g.girisler.size && !g.ok) return { ok: false, etkisiz: false, hata: parcalamaGeriAlRedMetni(g.fazla), hareketler: [] };
  const secenek = { tarih, notlar: PARCALAMA_GERI_ALMA_NOTU };
  return { ok: true, etkisiz: false, hata: null,
    hareketler: [...karsiHareketler(partStockLog, islemId, SET_CIKIS_TIPI, secenek), ...karsiGirisler(partStockLog, islemId, BILESEN_GIRIS_TIPI, secenek)] };
};
