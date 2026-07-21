// Servis Panosu zaman analizi — saf hesap (test edilebilir).
// Bir servisin aşama damgalarından (fabrikaGirisZamani → bakimBaslangicZamani → bitisZamani)
// bekleme / işçilik / toplam sürelerini dakika olarak türetir. Null-güvenli; devam eden
// işçilik (bitiş yok) için nowIso verilirse ona göre canlı hesaplanır.
import { sureDk, mesaiDk } from "./utils";

// cs: firma çalışma saatleri (appSettings.calismaSaatleri); verilmezse mesaiDk varsayılanı uygular.
export function servisSureleri(sv, nowIso = null, cs = undefined) {
  const giris = sv?.fabrikaGirisZamani || null;
  const baslangic = sv?.bakimBaslangicZamani || null;
  const bitis = sv?.bitisZamani || null;
  // Bekleme: fabrikaya giriş → bakım başlangıcı (ham/duvar-saati; "makine ne kadar bekledi").
  const beklemeDk = sureDk(giris, baslangic);
  // İşçilik: bakım başlangıcı → bitiş; bitmemişse now'a göre (canlı), o da yoksa null.
  // Yalnız firma mesai saatleri içinde sayılır (gece/hafta sonu/mola hariç) → faturaya esas.
  const isclikBit = bitis || (baslangic && nowIso ? nowIso : null);
  const isclikDk = mesaiDk(baslangic, isclikBit, cs);
  const isclikHamDk = sureDk(baslangic, isclikBit); // referans: ham geçen süre
  // Toplam: giriş → bitiş; bitmemişse giriş → now (canlı). Ham (gerçek geçen süre).
  const toplamBit = bitis || (giris && nowIso ? nowIso : null);
  const toplamDk = sureDk(giris, toplamBit);
  return {
    giris, baslangic, bitis,
    beklemeDk, isclikDk, isclikHamDk, toplamDk,
    devamEdiyor: !!baslangic && !bitis, // işçilik canlı akıyor
  };
}
