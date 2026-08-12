// Kredi Kartı Taksit Komisyonu — saf hesaplama (renderer + testler; electron'a bağımlılık yok).
// Model: banka ekranındaki "Komisyon Oranı" (BSMV DÂHİL) girilir; üye işyeri ücreti = oran/(1+bsmv/100),
// BSMV = üye işyeri × bsmv%. Katkı payı ORANA DÂHİL DEĞİL, ayrı kesinti. Toplam kesinti = üye+BSMV+katkı.
// İki yön: ileri (kart tutarı → net) ve ters/gross-up (hedef net → çekilecek kart tutarı).
// NOT: banka ekranı oranı 2 haneye yuvarlar (7,47) ama gerçek oran 7,476 (üye 7,12 × 1,05) olabilir;
// birebir eşleşme için Ayarlar'da oran ondalıklı girilebilir. Hesap her zaman girilen oranı kaynak alır.
import { parseMoney, today } from "./utils";
import { DEFAULT_KK_KOMISYONLARI, DEFAULT_KK_BSMV } from "./constants";

// Ayarı güvenli biçime getir: { bsmv:Number>=0, satirlar:[] }
export const kkAyarNormalize = (ayar) => {
  const a = ayar && typeof ayar === "object" ? ayar : DEFAULT_KK_KOMISYONLARI;
  const bsmv = Number(a.bsmv);
  return {
    bsmv: Number.isFinite(bsmv) && bsmv >= 0 ? bsmv : DEFAULT_KK_BSMV,
    satirlar: Array.isArray(a.satirlar) ? a.satirlar : [],
  };
};

// Belirli taksit sayısı için oran satırını bul (yoksa null). taksit:1 = Tek Çekim.
export const kkSatir = (taksit, ayar) => {
  const t = parseInt(taksit);
  if (!(t >= 1)) return null;
  return kkAyarNormalize(ayar).satirlar.find(s => parseInt(s.taksit) === t) || null;
};

// Kart tutarı üzerinden efektif toplam komisyon oranı (%): oran (BSMV dâhil) + katkı payı.
export const kkToplamOran = (satir) =>
  satir ? (Number(satir.oran) || 0) + (Number(satir.katkiPayi) || 0) : 0;

// Blokaj günü kadar ileriye taşınmış hesaba-geçiş tarihi (YYYY-MM-DD). blokaj 0 → aynı gün.
export const hesabaGecisTarihi = (satisTarih, blokajGun) => {
  const g = Math.max(0, parseInt(blokajGun) || 0);
  const base = (typeof satisTarih === "string" && satisTarih) ? satisTarih : today();
  if (!g) return base;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(base);   // UTC ile hesapla — yerel saat dilimi kaymasın
  if (!m) return base;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  d.setUTCDate(d.getUTCDate() + g);
  return d.toISOString().split("T")[0];
};

// İLERİ: kart tutarından komisyon kırılımı (snapshot nesnesi). Geçersiz girdi → null.
export const hesaplaKartKomisyonu = (tutar, taksit, ayar, satisTarih = today()) => {
  const t = parseMoney(tutar);
  const satir = kkSatir(taksit, ayar);
  if (!(t > 0) || !satir) return null;
  const { bsmv } = kkAyarNormalize(ayar);
  const oran = Number(satir.oran) || 0;             // BSMV dâhil komisyon oranı
  const katkiPayiOrani = Number(satir.katkiPayi) || 0;
  const blokajGun = Math.max(0, parseInt(satir.blokajGun) || 0);
  const uyeIsyeriOrani = oran / (1 + bsmv / 100);
  const uyeIsyeriUcreti = t * uyeIsyeriOrani / 100;
  const bsmvTutar = uyeIsyeriUcreti * bsmv / 100;
  const katkiPayiTutar = t * katkiPayiOrani / 100;
  const toplamKesinti = uyeIsyeriUcreti + bsmvTutar + katkiPayiTutar;
  return {
    taksit: parseInt(taksit),
    oran, uyeIsyeriOrani, uyeIsyeriUcreti,
    bsmvOrani: bsmv, bsmvTutar,
    katkiPayiOrani, katkiPayiTutar,
    toplamKesinti, netTutar: t - toplamKesinti,
    blokajGun, hesabaGecis: hesabaGecisTarihi(satisTarih, blokajGun),
  };
};

// TERS (gross-up): "elime hedefNet geçsin" → müşteriden çekilecek kart tutarı.
// Karar: kart tutarı = KDV DÂHİL fatura toplamı; komisyon mal bedeline eklenir → KDV'ye tabi.
//   c = (oran+katkı)/100, k = kdv/100
//   kartTutari = hedefNet*(1+k) / ((1+k)*(1-c) - k);  malBedeli = kartTutari/(1+k)
// Faturasız (k=0) → kartTutari = hedefNet/(1-c). Geçersiz/çözümsüz (payda<=0) → null.
export const hesaplaKartTutariNetten = (hedefNet, taksit, ayar, kdvOrani = 0, satisTarih = today()) => {
  const N = parseMoney(hedefNet);
  const satir = kkSatir(taksit, ayar);
  if (!(N > 0) || !satir) return null;
  const c = kkToplamOran(satir) / 100;
  const k = Math.max(0, Number(kdvOrani) || 0) / 100;
  const payda = (1 + k) * (1 - c) - k;
  if (!(payda > 0)) return null;                    // komisyon+KDV ≥ %100 → imkânsız
  const kartTutari = N * (1 + k) / payda;
  const kirilim = hesaplaKartKomisyonu(kartTutari, taksit, ayar, satisTarih);
  const malBedeli = kartTutari / (1 + k);
  return {
    kartTutari, malBedeli, kdvTutar: kartTutari - malBedeli,
    komisyonTutar: kirilim ? kirilim.toplamKesinti : 0,
    hedefNet: N, kdvOrani: Math.max(0, Number(kdvOrani) || 0),
    kirilim,                                          // payment'a yazılacak standart snapshot
  };
};

// Bir satış/ödeme kaydına yazılacak kredi kartı komisyon snapshot'ını üretir (formların save yolu).
// Her zaman KAYDEDİLEN tutar üzerinden ileri kırılım hesaplanır; `yansitildi` bayrağı komisyonun
// müşteriye yansıtılıp yansıtılmadığını işaretler: false → Finance komisyonu net cirodan DÜŞER (biz
// yüklendik); true → DÜŞMEZ (müşteri karşıladı, net zaten hedefe eşit; çift sayım olmasın). Blokaj her
// iki modda da geçerli (para blokaj süresince bloke). Geçersiz girdi → null.
export const kartKomisyonuSnapshot = (tutar, taksit, ayar, tarih, yansitildi = false) => {
  const k = hesaplaKartKomisyonu(tutar, taksit, ayar, tarih);
  return k ? { ...k, yansitildi: !!yansitildi } : null;
};

// Bir kredi kartı ödemesi "hesaba geçti/tahsil edildi" mi: blokaj yoksa hep evet; varsa hesaba
// geçiş tarihi gelmişse evet. kartKomisyonu yok/eski ödemeler (blokaj bilinmiyor) → tahsil sayılır.
export const kartTahsilEdildiMi = (kartKomisyonu, bugun = today()) => {
  if (!kartKomisyonu || typeof kartKomisyonu !== "object") return true;
  const blokajGun = Math.max(0, parseInt(kartKomisyonu.blokajGun) || 0);
  if (!blokajGun) return true;
  // Array.filter(...) çağrıları 2. argüman olarak index (sayı) geçirir — bugun'u geçerli bir tarih
  // string'ine sabitle, yoksa sayı ile tarih kıyaslaması yanlış "bloke" sonucu verir.
  const gun = (typeof bugun === "string" && bugun) ? bugun : today();
  return !kartKomisyonu.hesabaGecis || gun >= kartKomisyonu.hesabaGecis;
};
