// Spec 0097 (tarih kuralları) ve 0132 Karar 24: geçerlilik tarihinin ortak kuralları. Parça maliyet geçmişi (urunAgaci) ve malzeme
// fiyat geçmişi (malzeme) aynı yardımcıları okur; urunAgaci bunları aynı adla yeniden dışa verir. Saf modül, saat okumaz.
const GUN_DESEN = /^\d{4}-\d{2}-\d{2}$/;
export const gecerliGunMu = (t) => {
  if (typeof t !== "string" || !GUN_DESEN.test(t)) return false;
  const [y, a, g] = t.split("-").map(Number);
  const d = new Date(Date.UTC(y, a - 1, g));
  return d.getUTCFullYear() === y && d.getUTCMonth() === a - 1 && d.getUTCDate() === g;
};
export const gunMetni = (t) => (gecerliGunMu(t) ? t.split("-").reverse().join(".") : "");

export const TARIH_GECERSIZ_HATASI = "Geçerlilik tarihi takvimde var olan bir gün olmalı.";
export const TARIH_GELECEK_HATASI = "Geçerlilik tarihi bugünden sonra olamaz.";
export const tarihOnceHatasi = (t) => `Geçerlilik tarihi ${gunMetni(t)} tarihli kayıttan önce olamaz.`;
// 0097 triyaj (bulgu 1): tarih düzeltmesinde sondan bir önceki kayıtla AYNI gün de reddedilir (aynı güne ikinci kayıt yazılmaz).
export const tarihSonraHatasi = (t) => `Geçerlilik tarihi ${gunMetni(t)} tarihli kayıttan sonra olmalı.`;

// 0097 R6, R6/3, C5: biçim ve takvim, gelecek tarih yasak, alt sınırdan önceki tarih yasak (alt sınır "" ise yok).
// `esitRed`: alt sınırla aynı gün de reddedilir; tarih düzeltmesinde kullanılır.
export const gecerlilikTarihiDogrula = (tarih, bugun, altSinir = "", { esitRed = false } = {}) => {
  if (!gecerliGunMu(tarih)) return TARIH_GECERSIZ_HATASI;
  if (tarih > bugun) return TARIH_GELECEK_HATASI;
  if (altSinir && esitRed && tarih <= altSinir) return tarihSonraHatasi(altSinir);
  if (altSinir && tarih < altSinir) return tarihOnceHatasi(altSinir);
  return null;
};

// 0097 R2, 0132 C3: tarihli okumanın TEK kuralı. `g` eskiden yeniye sıralı geçmiş ([{ gecerli }]); dönüş, sorgu tarihinde geçerli
// kaydın indeksi ya da -1 ("bugünkü değer okunur"). Boş tarih "başlangıçtan beri" her tarihten küçüktür; sorgu son kaydın aralığına
// düşerse saklı değer değil bugünkü çözülmüş değer okunur (-1), biçimsiz sorgu da bugünküdür.
export const tarihteGecerliIndeks = (g, tarih) => {
  if (!Array.isArray(g) || !g.length || !gecerliGunMu(tarih)) return -1;
  let i = -1;
  for (let j = 0; j < g.length; j++) if (g[j].gecerli <= tarih) i = j;
  return i === g.length - 1 ? -1 : i;
};
