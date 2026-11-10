// Spec 0135: parçanın maliyet kalemleri ve kalem listesinin TEK türetme yolu (R23/2, C1/2).
//
// Kalıcı alan (R45, C4/2): `parts[].maliyetKalemleri = [{ tur: "malzeme" | "islem", … }]`.
//   - Malzeme kalemi: bugünkü malzeme satırının alanları DÜZ durur (malzemeId, bicim, yontem, ölçüler, fire)
//     ve yanında `adet` (tam sayı 1..1000). Düz şekil bilinçlidir: 0132'nin satır yardımcıları (malzemeOzeti, hamOlculer,
//     hamKesit, tamBoyKg) fazladan alanı yok sayar, kalem onlara olduğu gibi verilir (R45/2).
//   - İşlem kalemi: `ad`, `tedarikciId` (yoksa anahtar yok), `tutar` (TL, KDV hariç; girilmemişse null).
//
// Göç yoktur (R22): kalem listesi boş olan parçada liste eski alanlardan OKUMA ANINDA türer (R23): var olan malzeme satırı bir
// malzeme kalemi olur (adet 1), tutarı girilmiş hammadde kırılımı satırları birer işlem kalemi olur (ad sabit, R24). Plan turu
// Karar 31: türetme bugünkü önceliği izler; malzeme satırı varsa kırılım türetilmez (0132'de malzeme satırı kırılımı bastırıyordu,
// C8 ve AC-41 bu yüzden korunur). Karar 32: tutarı girilmemiş kırılım satırı kalem olmaz (bugün de maliyete girmiyordu).
//
// Spec 0141 A-R1/3 (karar 31, 33): kayıtta kalmış işleme payı tek türetmede ölçüye katlanır (`islemePayiKatla`, göç ve formla
// aynı fonksiyon); motorlar pay anahtarını hiç görmez. İçe alınan `electron/islemePayiGocuSaf.mjs` lib modülü değildir ve hiçbir
// şey içe almaz, döngü doğmaz (karar 33'ün istisnası).
// Plan turu Karar 39: bu modül hiçbir lib modülünü içe almaz. `gider.js` (tedarikçi koruması), `malzeme.js` (kullanım, zam
// etkisi) ve `urunAgaci.js` (tek okuma yolu) bunu içe alır; türetme onlardan birine konsa döngüsel içe aktarma doğardı.
// Kaynak taraması (AC-110): eski iki alanı (`malzemeSatiri`, `hammaddeler`) doğrudan okuyan yer yalnız burası ve gerekçeli
// istisnalardır (db.cjs, merge.js'in eski eşlemeleri, parça kartının dokunulmamış kopya dalı).

import { islemePayiKatla } from "../../electron/islemePayiGocuSaf.mjs";
export const KALEM_TUR = Object.freeze({ MALZEME: "malzeme", ISLEM: "islem" });
// R9, R9/2: giriş kuralıdır, veri kuralı değil; okuma kırpmaz.
export const MALIYET_KALEM_SINIRI = 20;
// R24, R24/2: kırılımdan türeyen işlem kaleminin adı sabittir; tedarikçinin adı kaleme ad olarak yazılmaz (gizlilik, C6/2).
export const TURETILEN_KALEM_ADI = "Hammadde alımı";
// R25, R25/2: kalem listesi dolu kayıtta silinen üç eski alan; parça kartının dokunulmamış kopya dalı da bu listeyi okur (Karar 40).
export const ESKI_MALIYET_ANAHTARLARI = Object.freeze(["malzemeSatiri", "hammaddeler", "maliyet"]);
export const KALEM_ANAHTARI = "maliyetKalemleri";

const doluMu = (v) => v != null && v !== "";
const malzemeSatiriDolu = (s) => !!s && typeof s === "object" && doluMu(s.malzemeId);
const gecerliTur = (k) => !!k && (k.tur === KALEM_TUR.MALZEME || k.tur === KALEM_TUR.ISLEM);

// Kayıttaki kalem listesi (türetmesiz). Tanınmayan türdeki öğe okunmaz.
export const kayitliKalemler = (p) => (Array.isArray(p?.[KALEM_ANAHTARI]) ? p[KALEM_ANAHTARI].filter(gecerliTur) : []);

// R23, R23/2: TEK türetme. Bütün tüketiciler kalem listesini buradan okur.
export const maliyetKalemleriOf = (p) => {
  if (!p) return [];
  const k = kayitliKalemler(p);
  if (k.length) return k.map(x => (x.tur === KALEM_TUR.MALZEME ? islemePayiKatla(x) : x));
  if (malzemeSatiriDolu(p.malzemeSatiri)) return [{ tur: KALEM_TUR.MALZEME, ...islemePayiKatla(p.malzemeSatiri), adet: 1 }];
  return (Array.isArray(p.hammaddeler) ? p.hammaddeler : [])
    .filter(h => h && doluMu(h.tutar))
    .map(h => ({ tur: KALEM_TUR.ISLEM, ad: TURETILEN_KALEM_ADI, ...(doluMu(h.tedarikciId) ? { tedarikciId: h.tedarikciId } : {}), tutar: h.tutar }));
};
export const malzemeKalemleri = (p) => maliyetKalemleriOf(p).filter(k => k.tur === KALEM_TUR.MALZEME);
export const islemKalemleri = (p) => maliyetKalemleriOf(p).filter(k => k.tur === KALEM_TUR.ISLEM);
// R2, R2/2: kip kayıttan türer (saklanmaz, C3): türetilmiş liste doluysa Hesapla.
export const kalemVarMi = (p) => maliyetKalemleriOf(p).length > 0;
// R35, tuzak 5: geçmiş kapısı DAR kalır; yalnız malzeme kalemi var mı.
export const malzemeKalemiVarMi = (p) => maliyetKalemleriOf(p).some(k => k.tur === KALEM_TUR.MALZEME);
// R31, R33: parçanın malzeme kalemlerinde geçen malzeme kimlikleri (metin, tekilleştirilmiş).
export const kalemMalzemeIdleri = (p) => [...new Set(malzemeKalemleri(p).filter(k => doluMu(k.malzemeId)).map(k => String(k.malzemeId)))];
// R32, R46: parçanın işlem kalemlerinde geçen tedarikçi kimlikleri (metin, tekilleştirilmiş).
export const kalemTedarikciIdleri = (p) => [...new Set(islemKalemleri(p).filter(k => doluMu(k.tedarikciId)).map(k => String(k.tedarikciId)))];
// Spec 0138 R2/2, C3/2, plan turu Karar 27 (B1): kaldırılan dış işlem kataloğunun TEK savunma ayracı. `islemId` taşıyan işlem
// kalemi 0137'nin katalog bağlı kalemidir; göç (R15) yalnız yerel veritabanı açılışında çalıştığı için istemci PC'de böyle bir
// kalem kalabilir. Okuma onu ÇÖZÜLEMEYEN sayar (maliyet "girilmedi"); yoksa boş tutarlı serbest kalem gibi okunur ve maliyet
// sessizce düşerdi (ölçüm C). Kalemin `islemId` alanı kaynakta yalnız burada okunur (C3/2 istisnası, tam yollu tarama).
export const eskiKatalogKalemi = (k) => !!k && k.tur === KALEM_TUR.ISLEM && doluMu(k.islemId);
export const eskiKatalogKalemiVarMi = (p) => maliyetKalemleriOf(p).some(eskiKatalogKalemi);
