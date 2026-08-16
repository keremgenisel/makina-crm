// İlk satış (makina) anındaki ödeme satırlarından ödeme kayıtlarını kurar ve kalanBorc'tan düşülecek
// GERÇEKTEN tahsil edilmiş tutarı hesaplar. Saf fonksiyon (test edilebilir); Customers doAdd'den kullanılır.
//
// Neden ayrı: kredi kartı satırının "tahsil edildi mi" kararı, ancak kartKomisyonu snapshot'ı (blokajGun)
// kurulduktan SONRA verilebilir. Snapshot'sız ham form satırında isPaymentReceived, kartTahsilEdildiMi(undefined)
// === true döndüğü için blokajlı kredi kartını yanlışlıkla "alındı" sayıp borçtan düşüyordu → müşteri
// borçlularda görünmüyordu. Bu yüzden ÖNCE kayıtları (snapshot'la) kurar, SONRA alınan tutarı onlardan süzer.
import { parseMoney, isPaymentReceived, today } from "./utils";
import { makinaKartOdemesi } from "./krediKarti";

/**
 * @param {Array} satirlar İlk ödeme satırları (_ilkOdemeSatirlari): { yontem, tutar, taksitSayisi?, kkYansit?, vadeTarihi? }
 * @param {object} opts
 * @param {number} opts.customerId Yeni müşteri id'si
 * @param {string} [opts.currency]
 * @param {string} [opts.tarih] Ödeme tarihi (YYYY-MM-DD)
 * @param {object} [opts.ayar] krediKartiKomisyonlari config
 * @param {number} [opts.kdvOran] Faturalı yurtiçi → oran; değilse 0
 * @param {() => number} opts.yeniId Yeni id üretici (uid)
 * @returns {{ kayitlar: Array, alinanTutar: number }} kayitlar = payments'e eklenecek ödemeler,
 *   alinanTutar = kalanBorc'tan düşülecek (yalnız tahsil edilmiş sayılan; blokajlı KK / tahsil edilmemiş çek hariç)
 */
export const ilkSatisOdemeleri = (satirlar = [], { customerId, currency = "TRY", tarih = today(), ayar = null, kdvOran = 0, yeniId }) => {
  const kayitlar = (satirlar || []).filter(r => parseMoney(r.tutar) > 0).map(r => {
    const base = { id: yeniId(), customerId, tarih, currency: currency || "TRY", not: "İlk ödeme (satış anında)", yontem: r.yontem || "Nakit" };
    if (r.yontem === "Kredi Kartı" && r.taksitSayisi) {
      // Faturalıda karta KDV + komisyon eklenir; borçtan KDV dahil (mal×(1+KDV)) düşer (nakit/çek aynen kalır).
      const mk = makinaKartOdemesi(parseMoney(r.tutar), r.taksitSayisi, ayar, tarih, !!r.kkYansit, kdvOran);
      return { ...base, tutar: mk.tutar, taksitSayisi: r.taksitSayisi, kartKomisyonu: mk.kartKomisyonu };
    }
    return { ...base, tutar: parseMoney(r.tutar), ...(r.yontem === "Çek" ? { vadeTarihi: r.vadeTarihi || "", tahsilEdildi: false } : {}) };
  });
  const alinanTutar = kayitlar.filter(isPaymentReceived).reduce((s, p) => s + parseMoney(p.tutar), 0);
  return { kayitlar, alinanTutar };
};
