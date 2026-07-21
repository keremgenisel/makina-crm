// Servis Panosu zaman analizi — saf hesap (test edilebilir).
// Bir servisin aşama damgalarından (fabrikaGirisZamani → bakimBaslangicZamani → bitisZamani)
// bekleme / işçilik / toplam sürelerini dakika olarak türetir. Null-güvenli; devam eden
// işçilik (bitiş yok) için nowIso verilirse ona göre canlı hesaplanır.
import { sureDk } from "./utils";

export function servisSureleri(sv, nowIso = null) {
  const giris = sv?.fabrikaGirisZamani || null;
  const baslangic = sv?.bakimBaslangicZamani || null;
  const bitis = sv?.bitisZamani || null;
  // Bekleme: fabrikaya giriş → bakım başlangıcı (yoksa null).
  const beklemeDk = sureDk(giris, baslangic);
  // İşçilik: bakım başlangıcı → bitiş; bitmemişse now'a göre (canlı), o da yoksa null.
  const isclikBit = bitis || (baslangic && nowIso ? nowIso : null);
  const isclikDk = sureDk(baslangic, isclikBit);
  // Toplam: giriş → bitiş; bitmemişse giriş → now (canlı).
  const toplamBit = bitis || (giris && nowIso ? nowIso : null);
  const toplamDk = sureDk(giris, toplamBit);
  return {
    giris, baslangic, bitis,
    beklemeDk, isclikDk, toplamDk,
    devamEdiyor: !!baslangic && !bitis, // işçilik canlı akıyor
  };
}
