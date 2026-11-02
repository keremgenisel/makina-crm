// Spec 0121 C bölümü: set hazırlama ve geri alma. Saf modül: React almaz, saat okumaz (`bugun` ve `tarih` çağırandan gelir).
//
// Hazırlama stok hareketidir (R19): bileşenler `set_uretimi` (−) ile düşer, setin kendi stoğu `set_girisi` (+) ile artar; hepsi
// tek işlem kimliğini (`referansId`, R18) taşır. Ayrı veri bölümü yoktur. Kırpma kuralı `utils.stokKirparakDus`'tur (C4, R16):
// eldeki kadarı düşer, eksik kalan düşmez, set yine hazırlanır. Stok hesabı bu modülde YAZILMAZ (C9): karşı hareketler ve
// geri alınabilirlik `stokHareketi.js`'ten, uygulama `stokuUygula(stokEtkisi(...))` ile tek yazımdır.
import { uid, stokKirparakDus, totalMiktar } from "./utils";
import { stokEtkisi, stokuUygula, karsiHareketler, karsiGirisler, girisGeriAlinabilir, netGirisler } from "./stokHareketi";
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
export const geriAlRedMetni = (n) => `Bu hazırlamanın ${n} adedi satılmış ya da kullanılmış; geri almak için önce stok sayımını düzeltin.`;
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
