// Spec 0052 R19 + triyaj bulgu 1: Kasa sekmesi olmayan kullanıcının yedek geri yüklemesi. Sunucu hesap tanımlarını,
// virman ve avans hareketlerini ve verilen (kendi) çekleri yalnız Kasa sekmeli kullanıcıdan kabul eder
// (electron/serverAuth.cjs KASA_SEKMELI_KAYITLAR); geri yükleme bunlara dokunsaydı bütün kayıt 403 alırdı. Bu kayıtlar
// bugünkü hâliyle korunur, bölümün geri kalanı yedekten gelir.
// Spec 0151 C5/2 (AC-44): bakiye düzeltmesi de Kasa'ya özgü harekettir (sunucu Kasa sekmesi ister), korunur.
export const kasaHareketiMi = (h) => h?.tur === "virman" || h?.tur === "avans" || h?.tur === "duzeltme";
export const kasaCekiMi = (c) => c?.yon === "verilen";

/** Bölümün Kasa'ya ait kayıtlarını bugünkü diziden, geri kalanını yedekten alır. */
export function kasaKayitlariniKoru(mevcut, yedek, kasaKaydiMi) {
  const bugun = Array.isArray(mevcut) ? mevcut : [];
  return [...bugun.filter(kasaKaydiMi), ...(Array.isArray(yedek) ? yedek : []).filter(r => !kasaKaydiMi(r))];
}
