// İlk satış ödeme kurulumu — REGRESYON: blokajlı kredi kartı (tek çekim) ilk ödeme, kalanBorc'tan
// DÜŞMEMELİ (para henüz hesaba geçmedi) → müşteri borçlularda görünmeli. Eski hata: form satırında
// kartKomisyonu snapshot'ı yokken isPaymentReceived kartı "alındı" sayıp borçtan düşüyordu.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
  // Spec 0030 R11: "bugün" testin içinde sabitlenir (satıştan 4 gün sonra, 40 günlük blokaj içinde). Kod `today()` ile
  // gerçek takvimi okuduğu için sabitlenmezse test 2026-09-25'ten sonra kırmızıya dönüyordu (odeme-hatirlatma deseni).
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-08-20T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });
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

// ── Spec 0063: ilk ödeme satırının tahsilat hesabı ──────────────────────────────────────
describe("Spec 0063: ilk ödeme satırının hesabı (ilkSatisOdemeleri)", async () => {
  const { hesapBakiyeleri, hesapsizTahsilatlar } = await import("../src/lib/kasa");
  const HESAPLAR = [
    { id: 71, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01" },
    { id: 72, ad: "Banka", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01" },
  ];
  const kur = (satirlar) => ilkSatisOdemeleri(satirlar, { customerId: 5, currency: "TRY", tarih: "2026-08-16", ayar: AYAR, kdvOran: 20, yeniId });
  const bakiye = (kayitlar, bugun, id) => hesapBakiyeleri(HESAPLAR, [], { payments: kayitlar, bugun }).get(String(id)).bakiye;
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-08-20T12:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("AC-22: satırın hesabı kayda yazılır; alinanTutar hesaplı ve hesapsız girdide aynıdır", () => {
    const satirlar = [{ yontem: "Nakit", tutar: "30000" }, { yontem: "Havale", tutar: "70000" }, { yontem: "Kredi Kartı", tutar: "10000", taksitSayisi: 1 }];
    const hesapsiz = kur(satirlar);
    const hesapli = kur(satirlar.map((r, i) => ({ ...r, hesapId: i === 0 ? 71 : 72 })));
    expect(hesapli.kayitlar.map(k => k.hesapId)).toEqual([71, 72, 72]);
    expect(hesapli.alinanTutar).toBe(hesapsiz.alinanTutar);
  });

  it("AC-10: tutar, KDV ve kart komisyonu hesaptan bağımsızdır (kayıt hesap dışında birebir aynı)", () => {
    const satirlar = [{ yontem: "Kredi Kartı", tutar: "10000", taksitSayisi: 3, kkYansit: true }, { yontem: "Çek", tutar: "5000", vadeTarihi: "2026-10-01" }];
    const a = kur(satirlar).kayitlar.map(({ id, hesapId, ...r }) => r);
    const b = kur(satirlar.map(r => ({ ...r, hesapId: 72 }))).kayitlar.map(({ id, hesapId, ...r }) => r);
    expect(b).toEqual(a);
  });

  it("AC-6: hesabı boş satırda hesapId anahtarı hiç yazılmaz (null da değil); bakiyeye girmez; Kasa'nın hesapsız listesinde görünmez", () => {
    const { kayitlar } = kur([{ yontem: "Nakit", tutar: "1000", hesapId: null }, { yontem: "Nakit", tutar: "2000", hesapId: "" }, { yontem: "Nakit", tutar: "3000" }]);
    for (const k of kayitlar) expect(Object.prototype.hasOwnProperty.call(k, "hesapId")).toBe(false);
    expect(bakiye(kayitlar, "2026-08-20", 71)).toBe(0);
    expect(hesapsizTahsilatlar({ payments: kayitlar }, HESAPLAR).adet).toBe(0); // bilinen boşluk (R4, X3)
  });

  it("AC-7: nakit satırın tutarı seçilen hesabın bakiyesine girer", () => {
    const { kayitlar } = kur([{ yontem: "Nakit", tutar: "30000", hesapId: 71 }, { yontem: "Havale", tutar: "70000", hesapId: 72 }]);
    expect(bakiye(kayitlar, "2026-08-20", 71)).toBe(30000);
    expect(bakiye(kayitlar, "2026-08-20", 72)).toBe(70000);
  });

  it("AC-8: çek satırı hesap seçili olsa da tahsil edilmeden bakiyeye girmez", () => {
    const { kayitlar } = kur([{ yontem: "Çek", tutar: "5000", vadeTarihi: "2026-09-01", hesapId: 72 }]);
    expect(kayitlar[0].hesapId).toBe(72);
    expect(bakiye(kayitlar, "2026-08-20", 72)).toBe(0);
    expect(bakiye([{ ...kayitlar[0], tahsilEdildi: true, tahsilatTarihi: "2026-09-01" }], "2026-09-02", 72)).toBe(5000);
  });

  it("AC-9: kredi kartı blokaj bitmeden girmez; bitince kaydın brüt tutarı (KDV + komisyon dahil) girer", () => {
    const { kayitlar } = kur([{ yontem: "Kredi Kartı", tutar: "10000", taksitSayisi: 1, kkYansit: true, hesapId: 72 }]);
    const k = kayitlar[0];
    expect(k.tutar).toBeGreaterThan(10000); // mal bedeli değil, karta yansıtılan brüt
    expect(bakiye(kayitlar, "2026-08-20", 72)).toBe(0);                // 40 günlük blokaj içinde
    expect(bakiye(kayitlar, "2026-12-31", 72)).toBeCloseTo(k.tutar, 2); // blokaj bitti (bakiye kuruşa yuvarlar)
  });
});
