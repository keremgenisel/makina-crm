// Sıralı kayıt kuyruğu — App.jsx'in debounced save'i için.
//
// Hata: kayıt gövdesi (`__dataVersion` dahil) state değiştiği ANDA hazırlanıyor, 500 ms sonra
// gönderiliyordu. Bir önceki kayıt hâlâ yoldayken (büyük veritabanında yüzlerce ms) yeni bir state
// değişikliği olursa yeni gövde ESKİ sürüm numarasını taşıyor, önceki kayıt bitip sürümü artırınca
// bu ikinci kayıt "çakışma" sayılıp reddediliyordu (409 / yerel modda false) → "Değişiklikler
// kaydedilemedi!" + gereksiz birleştirme. Otomatik yedek ilk kez açılırken tam bu oluyordu:
// klasör seçimi kaydı yoldayken yedek yazılıp lastBackup damgası ikinci kaydı tetikliyordu.
//
// Çözüm: kayıtlar zincire alınır (bir öncekinin bitmesi beklenir) ve sürüm numarası gönderim
// ANINDA, güncel ref'ten okunur. Böylece kendi ardışık kayıtlarımız birbirini asla çakıştırmaz;
// gerçek dış değişiklikler (başka PC) yine çakışma üretir.
export const kayitSirasiOlustur = ({ save, getVersion, versionRef }) => {
  let zincir = Promise.resolve();
  return (data) => {
    const p = zincir.then(async () => {
      const veri = { ...data, __dataVersion: versionRef.current };
      let ok = false;
      // save() reject ederse (örn. yerel modda DB yazması patlarsa) sessizce yutulmasın
      try { ok = await save(veri); } catch (err) { console.error("Kayıt hatası:", err); ok = false; }
      if (ok) {
        // Kendi kaydımız sürümü artırır; ref'i hemen eşitle (yoklama bunu dış değişiklik sanmasın,
        // sıradaki kayıt da güncel sürümle gitsin).
        try { const v = await getVersion?.(); if (typeof v === "number") versionRef.current = v; } catch { /* yoksay */ }
      }
      return { ok, veri };
    });
    zincir = p.catch(() => {});
    return p;
  };
};
