// Form listesi ile harita verisinin anlaştığını korur. İkisi de üretici script tarafından
// AYNI kaynaktan üretiliyor; biri değişip diğeri kalırsa kullanıcı formda ilçe seçer ama
// harita boyamaz ve bu sessizce olur.
import { describe, it, expect } from "vitest";
import { ILCE_ILLERI, ILCELER } from "../src/lib/map/ilceler";
import { CITIES_TR } from "../src/lib/constants";
import { sadeAd } from "../src/lib/mapStats";

const ilceModulleri = import.meta.glob("../src/lib/map/ilce/*.js", { eager: true });

describe("ilçe verisi", () => {
  it("müşterinin istediği 11 il tanımlı", () => {
    expect(ILCE_ILLERI).toEqual(["İstanbul", "Ankara", "İzmir", "Manisa", "Antalya", "Tekirdağ",
      "Bursa", "Balıkesir", "Konya", "Kocaeli", "Muğla"]);
  });

  it("her il programın 81 il listesinde gerçekten var", () => {
    for (const il of ILCE_ILLERI) expect(CITIES_TR).toContain(il);
  });

  it("resmî ilçe sayıları tutuyor", () => {
    // Kaynak hatası ya da il/ilçe eşleştirmesinin bozulması buradan yakalanır.
    const RESMI = { "İstanbul": 39, "Ankara": 25, "İzmir": 30, "Manisa": 17, "Antalya": 19,
      "Tekirdağ": 11, "Bursa": 17, "Balıkesir": 20, "Konya": 31, "Kocaeli": 12, "Muğla": 13 };
    for (const [il, n] of Object.entries(RESMI)) expect(ILCELER[il]).toHaveLength(n);
  });

  it("her ilin harita dosyası var ve form listesiyle BİREBİR aynı ilçeleri içeriyor", () => {
    for (const il of ILCE_ILLERI) {
      const m = ilceModulleri["../src/lib/map/ilce/" + sadeAd(il) + ".js"];
      expect(m, il + " için harita dosyası yok").toBeTruthy();
      expect(m.ILCE_ADLARI.length).toBe(m.ILCELER.length);
      expect([...m.ILCE_ADLARI].sort()).toEqual([...ILCELER[il]].sort());
    }
  });

  it("bilinen ilçeler doğru ilde", () => {
    expect(ILCELER["İstanbul"]).toContain("Kadıköy");
    expect(ILCELER["İstanbul"]).toContain("Tuzla");      // Kocaeli'ye düşmüştü, düzeltildi
    expect(ILCELER["Kocaeli"]).not.toContain("Tuzla");
    expect(ILCELER["Kocaeli"]).toContain("Gebze");
    expect(ILCELER["Ankara"]).toContain("Çankaya");
    expect(ILCELER["İzmir"]).toContain("Bornova");
  });

  it("çizim verisi boş değil", () => {
    for (const il of ILCE_ILLERI) {
      const m = ilceModulleri["../src/lib/map/ilce/" + sadeAd(il) + ".js"];
      for (const d of m.ILCELER) expect(d.startsWith("M")).toBe(true);
      expect(m.W).toBe(1000);
      expect(m.H).toBeGreaterThan(0);
    }
  });
});
