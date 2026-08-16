// İlk satış ödeme kurulumu — REGRESYON: blokajlı kredi kartı (tek çekim) ilk ödeme, kalanBorc'tan
// DÜŞMEMELİ (para henüz hesaba geçmedi) → müşteri borçlularda görünmeli. Eski hata: form satırında
// kartKomisyonu snapshot'ı yokken isPaymentReceived kartı "alındı" sayıp borçtan düşüyordu.
import { describe, it, expect } from "vitest";
import { ilkSatisOdemeleri } from "../src/lib/makinaOdeme";
import { isPaymentReceived } from "../src/lib/utils";

// Tek çekim (taksit 1) blokajlı, 3 taksit blokajsız — kart-komisyon testindeki ayarla aynı düzen.
const AYAR = { bsmv: 5, satirlar: [
  { taksit: 1, oran: 3.1, katkiPayi: 0.5, blokajGun: 40 },
  { taksit: 3, oran: 7.476, katkiPayi: 0.5, blokajGun: 0 },
] };

let sayac = 1000;
const yeniId = () => ++sayac;

describe("ilkSatisOdemeleri — blokajlı kredi kartı borçta kalır", () => {
  it("kredi kartı TEK ÇEKİM (blokajlı) alınan tutara GİRMEZ → kalanBorc'tan düşülmez", () => {
    const { kayitlar, alinanTutar } = ilkSatisOdemeleri(
      [{ yontem: "Kredi Kartı", tutar: "100000", taksitSayisi: 1 }],
      { customerId: 1, currency: "TRY", tarih: "2026-08-16", ayar: AYAR, kdvOran: 20, yeniId }
    );
    expect(kayitlar).toHaveLength(1);
    expect(kayitlar[0].kartKomisyonu).toBeTruthy();
    expect(kayitlar[0].kartKomisyonu.blokajGun).toBe(40);
    expect(isPaymentReceived(kayitlar[0], "2026-08-16")).toBe(false); // henüz hesaba geçmedi
    expect(alinanTutar).toBe(0);                                       // borçtan düşen yok → müşteri borçlu kalır
  });

  it("NAKİT ilk ödeme alınan tutara girer (borçtan düşülür)", () => {
    const { kayitlar, alinanTutar } = ilkSatisOdemeleri(
      [{ yontem: "Nakit", tutar: "50000" }],
      { customerId: 1, currency: "TRY", tarih: "2026-08-16", ayar: AYAR, kdvOran: 20, yeniId }
    );
    expect(kayitlar).toHaveLength(1);
    expect(alinanTutar).toBe(50000);
  });

  it("ÇEK (tahsil edilmemiş) borçta kalır; NAKİT + blokajlı KK karışımında yalnız nakit düşülür", () => {
    const { alinanTutar } = ilkSatisOdemeleri(
      [
        { yontem: "Nakit", tutar: "30000" },
        { yontem: "Çek", tutar: "40000", vadeTarihi: "2026-12-01" },
        { yontem: "Kredi Kartı", tutar: "100000", taksitSayisi: 1 },
      ],
      { customerId: 1, currency: "TRY", tarih: "2026-08-16", ayar: AYAR, kdvOran: 20, yeniId }
    );
    expect(alinanTutar).toBe(30000); // yalnız nakit; çek ve blokajlı KK borçta
  });

  it("blokajsız kredi kartı (3 taksit, blokajGun 0) alınan sayılır → borçtan düşer", () => {
    const { kayitlar, alinanTutar } = ilkSatisOdemeleri(
      [{ yontem: "Kredi Kartı", tutar: "100000", taksitSayisi: 3 }],
      { customerId: 1, currency: "TRY", tarih: "2026-08-16", ayar: AYAR, kdvOran: 20, yeniId }
    );
    expect(kayitlar[0].kartKomisyonu.blokajGun).toBe(0);
    expect(isPaymentReceived(kayitlar[0], "2026-08-16")).toBe(true);
    expect(alinanTutar).toBe(kayitlar[0].tutar); // borçtan tam düşer
  });

  it("0 tutarlı satırlar atlanır", () => {
    const { kayitlar } = ilkSatisOdemeleri(
      [{ yontem: "Nakit", tutar: "0" }, { yontem: "Nakit", tutar: "" }],
      { customerId: 1, tarih: "2026-08-16", yeniId }
    );
    expect(kayitlar).toHaveLength(0);
  });
});
