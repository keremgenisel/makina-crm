// Spec 0061 R8, C8 (AC-28): borç yaşlandırmasının TEK kova tanımı. Aylık Faaliyet Raporu (müşteri alacakları) ve Aylık
// Gider ve Kasa Raporu / Giderler › Açık kalemler (gider borçları) bunu çağırır; ikinci bir eşik listesi yazılmaz.
// Saf: zaman okumaz; yaşı (gün) çağıran hesaplar (faaliyet raporu rapor anından, gider tarafı gunFarki ile).
export const YAS_KOVALARI = [
  { ad: "0-30 gün", ust: 30 }, { ad: "31-60 gün", ust: 60 }, { ad: "61-90 gün", ust: 90 }, { ad: "90+ gün", ust: Infinity },
];
export const YAS_SIRA = YAS_KOVALARI.map(k => k.ad);
// Yaş bilinmiyorsa (tarihsiz kayıt) "90+ gün": faaliyet raporunun bugünkü davranışı. Gider tarafında bu dala erişilmez,
// çünkü kapsam tarihsiz kalemi zaten dışlar (spec 0061 R2, R8); dal bu yüzden yazılı kalır.
export const yasKovaAdi = (gun) => (gun == null ? "90+ gün" : YAS_KOVALARI.find(k => gun <= k.ust).ad);
