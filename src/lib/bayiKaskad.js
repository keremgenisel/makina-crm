// Bayi silme kaskadı — lib/musteriKaskad.js'in bayi eşi. Bir bayi Çöp Kutusu'na taşınınca ona id ile
// bağlı kayıtlar: alıcısı o bayi olan yedek parça satışları (tahsisleri satışın çocuğudur, birlikte
// gider) ve bayi dosyaları (dosyalar[].dealerId). Adla bağlı alanlar (servisin işlem firması,
// "satış yapan") metindir, kaskada girmez (tarihçe okunur kalır).
import { parseMoney, isYedekParcaBorcluMu } from "./utils";

/** Satışın alıcısı bu bayi mi (aliciTipi "bayi" ya da aliciTipi'siz eski kayıt; dış firma alımı hariç). */
export const yedekParcaBayininMi = (s, dealerId) =>
  !!s && !s.disFirma && (s.aliciTipi === "bayi" || s.aliciTipi == null) && s.dealerId != null && s.dealerId === dealerId;

export const bayiDosyasiMi = (d, dealerId) => !!d && d.dealerId === dealerId && d.customerId == null;

/** Bayiyle birlikte çöpe gidecek canlı kayıt sayıları + ödenmemiş satışların açık alacağı (para birimi bazında). */
export const bayiBagliSayilar = (dealerId, { yedekParcaSatislar = [], dosyalar = [] } = {}) => {
  const satislar = (yedekParcaSatislar || []).filter(s => s && !s.deletedAt && yedekParcaBayininMi(s, dealerId));
  const acikAlacak = {};
  let odenmemis = 0;
  satislar.forEach(s => {
    if (!isYedekParcaBorcluMu(s)) return;
    odenmemis += 1;
    const cur = s.currency || "TRY";
    acikAlacak[cur] = (acikAlacak[cur] || 0) + (parseInt(s.miktar) || 0) * parseMoney(s.birimFiyat);
  });
  return {
    yedekParca: satislar.length,
    odenmemis,
    acikAlacak,
    dosya: (dosyalar || []).filter(d => d && !d.deletedAt && bayiDosyasiMi(d, dealerId)).length,
  };
};

/** "3 yedek parça satışı, 2 dosya" — sıfırlar atlanır; hiçbiri yoksa "". */
export const bayiBagliOzeti = (sayilar) => [
  [sayilar.yedekParca, "yedek parça satışı"],
  [sayilar.dosya, "dosya"],
].filter(([n]) => n > 0).map(([n, ad]) => `${n} ${ad}`).join(", ");

/** Kaskad: alıcısı bu bayi olan canlı satışlar `ts` damgasıyla çöpe (zaten çöptekiler kendi damgasıyla kalır). */
export const yedekParcaBayiKaskad = (arr, dealerId, ts) => (arr || []).map(s =>
  (yedekParcaBayininMi(s, dealerId) && !s.deletedAt) ? { ...s, deletedAt: ts } : s);
