// Firma mesai (çalışma saati) dakikası — saf fonksiyon (utils.mesaiDk).
// Servis işçilik süresi yalnız mesai pencerelerine (gece/hafta sonu/mola hariç) sayılır.
// Tarih notu (getDay): 2026-07-17 Cuma, 07-18 Cmt, 07-19 Paz, 07-20 Pzt.
import { describe, it, expect } from "vitest";
import { mesaiDk } from "../src/lib/utils";
import { CALISMA_SAATLERI_VARSAYILAN } from "../src/lib/constants";

describe("mesaiDk — varsayılan config (08:30–19:00, Pzt–Cum, öğle 12:30–13:30)", () => {
  it("aynı gün, mola dışı aralık ham ile aynı", () => {
    // Pzt 10:00→12:30 (mola 12:30'da başlar, örtüşme yok) = 150
    expect(mesaiDk("2026-07-20T10:00:00", "2026-07-20T12:30:00")).toBe(150);
  });
  it("öğle molasını kapsayan gün molayı düşer", () => {
    // Pzt 11:00→15:00 ham 240 − mola 60 = 180
    expect(mesaiDk("2026-07-20T11:00:00", "2026-07-20T15:00:00")).toBe(180);
  });
  it("mesai başlangıcından erken başlangıç 08:30'a kırpılır", () => {
    // Pzt 07:00→09:00 → 08:30–09:00 = 30
    expect(mesaiDk("2026-07-20T07:00:00", "2026-07-20T09:00:00")).toBe(30);
  });
  it("mesai bitişinden geç bitiş 19:00'da kesilir", () => {
    // Pzt 18:00→20:00 → 18:00–19:00 = 60
    expect(mesaiDk("2026-07-20T18:00:00", "2026-07-20T20:00:00")).toBe(60);
  });
  it("gece ve hafta sonunu aşan aralıkta yalnız mesai günleri sayılır", () => {
    // Cuma 17:00→Pzt 10:00: Cuma 17–19 = 120; Cmt/Paz = 0; Pzt 08:30–10:00 = 90 → 210
    expect(mesaiDk("2026-07-17T17:00:00", "2026-07-20T10:00:00")).toBe(210);
  });
  it("tümü hafta sonu → 0", () => {
    // Cmt 10:00→14:00
    expect(mesaiDk("2026-07-18T10:00:00", "2026-07-18T14:00:00")).toBe(0);
  });
  it("mesai dışı tek gün (gece) → 0", () => {
    expect(mesaiDk("2026-07-20T22:00:00", "2026-07-20T23:00:00")).toBe(0);
  });
  it("eksik/bozuk damgada null; ters aralıkta 0", () => {
    expect(mesaiDk(null, "2026-07-20T10:00:00")).toBeNull();
    expect(mesaiDk("2026-07-20T10:00:00", null)).toBeNull();
    expect(mesaiDk("bozuk", "2026-07-20T10:00:00")).toBeNull();
    expect(mesaiDk("2026-07-20T12:00:00", "2026-07-20T10:00:00")).toBe(0);
  });
  it("varsayılan sabit nesne bozulmadan çağrılabilir", () => {
    expect(mesaiDk("2026-07-20T10:00:00", "2026-07-20T11:00:00", CALISMA_SAATLERI_VARSAYILAN)).toBe(60);
  });
});

describe("mesaiDk — özel config", () => {
  it("çoklu mola (öğle + çay) toplamı düşülür", () => {
    const cs = { baslangic: "08:30", bitis: "19:00", gunler: [1, 2, 3, 4, 5],
      molalar: [{ baslangic: "12:30", bitis: "13:30" }, { baslangic: "16:00", bitis: "16:15" }] };
    // Pzt 11:00→17:00 ham 360 − öğle 60 − çay 15 = 285
    expect(mesaiDk("2026-07-20T11:00:00", "2026-07-20T17:00:00", cs)).toBe(285);
  });
  it("mola dizisi boş → hiç mola düşülmez", () => {
    const cs = { baslangic: "08:30", bitis: "19:00", gunler: [1, 2, 3, 4, 5], molalar: [] };
    expect(mesaiDk("2026-07-20T11:00:00", "2026-07-20T15:00:00", cs)).toBe(240);
  });
  it("çalışılan günler ayarlanabilir (yalnız Cumartesi)", () => {
    const cs = { baslangic: "08:30", bitis: "19:00", gunler: [6], molalar: [] };
    // Cmt 10:00→12:00 = 120 (artık çalışma günü); Pzt aynı aralık = 0
    expect(mesaiDk("2026-07-18T10:00:00", "2026-07-18T12:00:00", cs)).toBe(120);
    expect(mesaiDk("2026-07-20T10:00:00", "2026-07-20T12:00:00", cs)).toBe(0);
  });
});
