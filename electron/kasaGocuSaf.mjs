// Spec 0024 R4 (Q3): kasa göçünün saf çekirdeği. İki yol aynı kuralı kullanır: veritabanı açılışındaki bir kerelik göç
// (electron/db.cjs kasaGocu, require(esm) ile) ve 0024 öncesi bir yedeğin geri yüklenmesi (SettingsBackup.jsx; yedekte
// hareket bölümü yoksa). Bağımlılıksız ES modülüdür ki hem Electron ana sürecinde hem arayüz paketinde çalışsın.
// Kural: ödenmiş taksitsiz kalem → tutarsız, hesapsız, "hedefi tam kapatır" hareket (motor burada çağrılamadığı için
// tutar hesaplanmaz); ödenmiş taksit satırı → satır tutarıyla hareket. Çöpteki kalem taşınmaz. Göç izi (gocKaynak)
// aynı kaydın ikinci kez taşınmasını engeller. Dönen hareketler kimliksizdir; kimliği çağıran verir.
export const gocIziKalem = (giderId) => `gider:${giderId}`;
export const gocIziTaksit = (giderId, taksitId) => `taksit:${giderId}:${taksitId}`;

export function kasaGocuHareketleri(giderler, mevcutIzler = new Set()) {
  const yeni = [];
  const ortak = { tur: "odeme", hesapId: null, karsiHesapId: null, kaynak: "goc", aciklama: null };
  for (const k of Array.isArray(giderler) ? giderler : []) {
    if (!k || k.deletedAt) continue;
    const satirlar = Array.isArray(k.taksitler) ? k.taksitler : [];
    if (satirlar.length) {
      for (const r of satirlar) {
        if (!r || !r.odendi) continue;
        const iz = gocIziTaksit(k.id, r.id);
        if (mevcutIzler.has(iz)) continue;
        yeni.push({ ...ortak, tarih: r.odemeTarihi ?? null, tutar: r.tutar ?? null, yontem: null, giderId: k.id, taksitId: r.id, tamKapatir: false, gocKaynak: iz });
      }
    } else if (k.odendi) {
      const iz = gocIziKalem(k.id);
      if (mevcutIzler.has(iz)) continue;
      yeni.push({ ...ortak, tarih: k.odemeTarihi ?? null, tutar: null, yontem: k.odemeYontemi ?? null, giderId: k.id, taksitId: null, tamKapatir: true, gocKaynak: iz });
    }
  }
  return yeni;
}
