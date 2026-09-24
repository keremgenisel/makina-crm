// Spec 0002 C4 istisnaları 1–2: satış kuru ve üretim tarihi snapshot'ı (src/lib/satisKaydi.js).
import { describe, it, expect } from "vitest";
import { satisKuruUygula, uretimTarihiDamgala } from "../src/lib/satisKaydi";

const RATES = { usd: 41.23456, eur: 45.5 };
const BUGUN = "2026-09-24";

describe("satış kuru (R12, plan M2)", () => {
  it("AC-12: yeni USD satışta o günün kuru '1 USD = X TL' olarak yazılır", () => {
    expect(satisKuruUygula(null, { currency: "USD", installDate: BUGUN }, RATES, BUGUN).satisKuru).toBe(41.2346);
  });
  it("AC-12: kayıt yeniden kaydedildiğinde aynı kur korunur (güncel kur değişmiş olsa da)", () => {
    const eski = { currency: "USD", satisKuru: 40, installDate: "2024-01-01" };
    expect(satisKuruUygula(eski, { ...eski, phone: "yeni" }, { usd: 99 }, BUGUN).satisKuru).toBe(40);
  });
  it("AC-72: USD → EUR çevrilince eski kur temizlenir, o günün EUR kuru yazılır; TL'ye dönünce boşalır", () => {
    const eski = { currency: "USD", satisKuru: 40, installDate: "2024-01-01" };
    expect(satisKuruUygula(eski, { ...eski, currency: "EUR" }, RATES, BUGUN).satisKuru).toBe(45.5);
    expect(satisKuruUygula(eski, { ...eski, currency: "TRY" }, RATES, BUGUN).satisKuru).toBeNull();
    expect(satisKuruUygula(eski, { ...eski, currency: "EUR" }, null, BUGUN).satisKuru).toBeNull();
  });
  it("AC-55: kur alınamazken USD satış engellenmez; alan boş kalır", () => {
    const r = satisKuruUygula(null, { currency: "USD", installDate: BUGUN, name: "X" }, null, BUGUN);
    expect(r).toMatchObject({ name: "X", satisKuru: null });
  });
  it("plan M2: kursuz eski satışa düzenlemede bugünün kuru yazılmaz; son 30 gündeki satışa yazılır", () => {
    const eski = { currency: "USD", installDate: "2021-05-01" };
    expect(satisKuruUygula(eski, eski, RATES, BUGUN).satisKuru).toBeNull();
    const yakin = { currency: "USD", installDate: "2026-09-01" };
    expect(satisKuruUygula(yakin, yakin, RATES, BUGUN).satisKuru).toBe(41.2346);
  });
  it("TL satışta kur alanı her zaman boş", () => {
    expect(satisKuruUygula(null, { currency: "TRY" }, RATES, BUGUN).satisKuru).toBeNull();
    expect(satisKuruUygula(null, {}, RATES, BUGUN).satisKuru).toBeNull();
  });
});

describe("üretim tarihi damgası (R1b)", () => {
  it("AC-41: stoktan satışta stok satırının giriş tarihi satış kaydına yazılır", () => {
    expect(uretimTarihiDamgala({ id: 1 }, { addedDate: "2026-03-05" }).uretimTarihi).toBe("2026-03-05");
  });
  it("plan M3: geri dönen stok satırının taşıdığı özgün tarih giriş tarihine üstün gelir", () => {
    expect(uretimTarihiDamgala({ id: 1 }, { addedDate: "2026-09-02", uretimTarihi: "2026-03-05" }).uretimTarihi).toBe("2026-03-05");
  });
  it("elle girilmiş üretim tarihi korunur", () => {
    expect(uretimTarihiDamgala({ uretimTarihi: "2026-01-01" }, { addedDate: "2026-03-05" }).uretimTarihi).toBe("2026-01-01");
  });
});
