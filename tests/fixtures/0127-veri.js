// Spec 0127: servis formu çıktısı ve servis Excel'i test verisi (kıyas altını ve saf testler aynı kümeyi okur). Altın
// (tests/fixtures/0127-cikti-once.json) bu veriyle spec ÖNCESİ koddan üretildi; veriyi değiştirmek altını geçersiz kılar.
import { CUSTOMERS, SERVICES, KDV, FAB } from "./0115-veri";
export { CUSTOMERS, KDV, FAB };

export const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }, { id: 2, ad: "HAMBURGER", olcu: "Ø98" }];
const KALIPLI = { ...SERVICES[0], atolyeKaliplari: LISTE };
// Sevk alanı yazılmamış senaryolar: spec sonrası çıktı bunlarda birebir eski kalır (C2, AC-2).
export const SEVKSIZ = {
  kalipsiz: SERVICES[0],
  kalipliSevksiz: KALIPLI,
  tevkifatli: { ...KALIPLI, id: 43, type: "Garanti Dışı", servisUcreti: 5000, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 },
  disServis: { ...KALIPLI, id: 44, islemFirma: "Diğer", islemFirmaAd: "Usta Kalıp", islemFirmaYetkili: "Can Usta", islemFirmaTel: "0332 333 33 33" },
};
// Sevk alanı yazılı senaryolar.
export const SEVKLI = {
  kargoTam: { ...KALIPLI, id: 45, kalipKargoFirma: "Yurtiçi Kargo", kalipKargoTakipNo: "YK-123", kalipKargoTarih: "2026-10-25", kalipKargoSorumlusu: "Burak Yüce" },
  fabrikaKisi: { ...KALIPLI, id: 46, kalipFabrikaTeslim: true, kalipKargoSorumlusu: "BURAK YÜCE" },
  yalnizKisi: { ...KALIPLI, id: 47, kalipKargoSorumlusu: "Ayşe Şimşek" },
  bozukTarih: { ...KALIPLI, id: 48, kalipKargoFirma: "Aras", kalipKargoTarih: "2026-02-30" },
  yalnizTarih: { ...KALIPLI, id: 49, kalipKargoTarih: "2026-11-01" },
};
export const EXCEL_SERVISLERI = [...Object.values(SEVKSIZ), ...Object.values(SEVKLI)];
// data: URI'leri (gömülü logo) iki tarafta aynı yer tutucuya indirilir; altın boyutu küçük kalır (Karar 25).
export const veriUriAyikla = (html) => String(html).replace(/data:[^"')\s]+/g, "data:…");
