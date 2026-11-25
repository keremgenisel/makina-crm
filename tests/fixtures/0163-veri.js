// Spec 0163: kitte yetim kalan parça satırı. Canlı veriye bağlanmaz (Context, AC-17): kimlikler ve model adları burada temsil edilir.
// Senaryolar: Ölçüm 2 şekli (iki modelde ölü + canlı satır), kardeşsiz yetim, çözülemeyen, çöpteki kimlik, aynı adlı iki canlı parça,
// aynı parçaya çözülen iki yetim, adedi sıfır kardeş, kimliği sayı olarak duran kardeş, set ile bileşenine çözülen yetim, malzemeli parça.
import { TEDARIKCILER, MALZEMELER } from "./0158-dolu.js";
export { TEDARIKCILER, MALZEMELER };
const mk = (o) => ({ tur: "malzeme", adet: 1, ...o });
export const OLU = "1793807177673";
export const PARCALAR = [
  { id: 1784817123366, ad: "Kalıp mili", tedarikciId: 22, maliyetKalemleri: [mk({ malzemeId: 601, bicim: "mil", cap: 70, boy: 155 })] },
  { id: 201, ad: "Rulman Yatağı", tedarikciId: 22, maliyet: 40 },
  { id: 202, ad: "Keçe 40", tedarikciId: 22, maliyet: 3 },
  { id: 203, ad: "Saft", tedarikciId: 22, maliyet: 7 },
  { id: 204, ad: "Rulman 6204", tedarikciId: 22, maliyet: 50 },
  { id: 205, ad: "Pim", adEN: "Bearing", kod: "PIN", tedarikciId: 22, maliyet: 1 },
  { id: 206, ad: "Çift", tedarikciId: 22, maliyet: 5 },
  { id: 207, ad: "çift", tedarikciId: 22, maliyet: 6 },
  { id: 208, ad: "Eski parça", tedarikciId: 22, maliyet: 9, deletedAt: "2026-11-01T10:00:00" },
  { id: 209, ad: "Maliyetsiz", tedarikciId: 22 },
  { id: 210, ad: "Somun", tedarikciId: 22, maliyet: 2 },
  { id: 211, ad: "Burç seti", tedarikciId: 22, setIcerigi: [{ partId: "212", miktar: 2 }] },
  { id: 212, ad: "Burç", tedarikciId: 22, maliyet: 4 },
  { id: 213, ad: "Vida", tedarikciId: 22, maliyet: 1 },
];
export const CANLI = PARCALAR.filter(p => !p.deletedAt);
const r = (partId, ad, miktar = 1) => ({ partId, ad, miktar });
// Ölçüm 2: iki model, ölü kimlik önce, canlı kardeş sonra; sipariş ve maliyet rakamı bugün doğru.
export const SWP_DSC = { model: "SWP140_DSC", defaultParcalar: [r(OLU, "Kalıp mili"), r("1784817123366", "Kalıp mili"), r("202", "Keçe 40", 2)] };
export const SWP_DS = { model: "SWP140_DS", defaultParcalar: [r(OLU, "KALIP MİLİ "), r("1784817123366", "Kalıp mili"), r("210", "Somun", 4)] };
// Kardeşsiz yetim (ondalık adet), çözülemeyen, çöpteki kimlik, aynı adlı iki canlı parça, boş ad.
export const AK_TEK = { model: "AK_TEK", defaultParcalar: [r("9001", "  rulman yatağı ", 1.5), r("9002", "Yok böyle parça"), r("208", "Eski parça"), r("9003", "ÇİFT"), r("9004", "  "), r("202", "Keçe 40")] };
// Aynı parçaya çözülen iki yetim: ilki kalır (R2/5).
export const AK_IKI = { model: "AK_IKI", defaultParcalar: [r("9101", "Somun", 3), r("9102", "somun", 7), r("213", "Vida")] };
// Adedi sıfır kardeş (R2/4) ve kimliği sayı olarak duran kardeş (R1, AC-46).
export const AK_SIFIR = { model: "AK_SIFIR", defaultParcalar: [r("9201", "Keçe 40", 2), r("202", "Keçe 40", 0), r("9202", "Pim"), r(205, "Pim", 3)] };
// Kardeşsiz yetim satır bir setin bileşenine çözülüyor (R9, AC-37); yetimden önce kimlikle kardeşi gelen satır (P3).
export const AK_SET = { model: "AK_SET", defaultParcalar: [r("211", "Burç seti"), r("9301", "Burç", 2), r("9302", "Vida"), r("213", "Vida", 5)] };
// Kısmi, aksan ve adEN eşleşmesi yok (AC-5, AC-6, AC-7).
export const AK_YOK = { model: "AK_YOK", defaultParcalar: [r("9401", "Şaft"), r("9402", "Rulman"), r("9403", "Bearing"), r("9404", "PIN")] };
export const MODELLER = [SWP_DSC, SWP_DS, AK_TEK, AK_IKI, AK_SIFIR, AK_SET, AK_YOK];
export const KATALOG = { standardModels: [SWP_DSC], customModels: [SWP_DS, AK_TEK, AK_IKI, AK_SIFIR, AK_SET, AK_YOK], parts: PARCALAR, malzemeler: MALZEMELER };
export const SIPARIS = (o = {}) => ({ modeller: MODELLER, satirlar: MODELLER.map(m => ({ model: m.model, adet: "10" })), parts: CANLI, hamParts: PARCALAR,
  partStock: [{ partId: 202, miktar: 5 }], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, ...o });
// Yetimsiz eş (AC-35, R7): ölü satırlar ve onların kardeş durumu çıkarılmış; R2 senaryolarının rakamı buna eşit olmalı.
export const OLUSUZ = (m) => ({ ...m, defaultParcalar: m.defaultParcalar.filter(x => !String(x.partId).startsWith("9") && String(x.partId) !== "1793807177673") });
