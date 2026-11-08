// Spec 0133 R21, C5: satış fiyatı bilinçli olarak yeni bir uygulama ayarı alanı (`fiyatAyarlari`) açar ve onu sunucunun ayar alanı
// eşlemesine açıkça yazar. Önceki spec'lerin "yeni bölüm, birleştirme anahtarı, izin ya da ayar alanı yok" bekçileri 0132'nin
// bölümüyle birlikte bu tek ayar alanını da ayıklayıp aynı iddiayı sürdürür: başka hiçbir değişiklik bu listelere girmemiştir.
import { bolum0132Ayikla } from "./0132-yeni-bolum";
// Spec 0137 C11: zincirin yeni halkası (dış işlem bölümü).
import { bolum0137Ayikla } from "./0137-yeni-bolum";

export const yeniAlanlariAyikla = (o) => {
  const a = bolum0137Ayikla(bolum0132Ayikla(o));
  if (!a.AYAR_ALAN_SEKMELERI) return a;
  const { fiyatAyarlari: _f, ...ayar } = a.AYAR_ALAN_SEKMELERI;
  return { ...a, AYAR_ALAN_SEKMELERI: ayar };
};
