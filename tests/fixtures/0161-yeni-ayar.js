// Spec 0161 C9 (AC-46): sipariş listesinin cins sırası bilinçli olarak yeni bir uygulama ayarı alanı (`cinsSirasi`) açar ve onu
// sunucunun ayar alanı eşlemesine açıkça yazar. Önceki spec'lerin "yeni bölüm, birleştirme anahtarı, izin ya da ayar alanı yok"
// bekçileri 0132'nin bölümünü ve 0133'ün ayar alanını ayıklayan zincire bu alanı da ekleyip aynı iddiayı sürdürür: başka hiçbir
// değişiklik bu listelere girmemiştir.
import { yeniAlanlariAyikla as ayikla0133 } from "./0133-yeni-ayar";

export const yeniAlanlariAyikla = (o) => {
  const a = ayikla0133(o);
  if (!a.AYAR_ALAN_SEKMELERI) return a;
  const { cinsSirasi: _c, ...ayar } = a.AYAR_ALAN_SEKMELERI;
  return { ...a, AYAR_ALAN_SEKMELERI: ayar };
};
