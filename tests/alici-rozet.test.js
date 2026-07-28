// @vitest-environment jsdom
// Yedek parça satışı alıcı türü rozeti: müşteri / anlaşmasız servis (dış firma) / bayi.
import { describe, it, expect } from "vitest";
import { aliciRozet } from "../src/components/stock/TahsisModal.jsx";

describe("aliciRozet", () => {
  it("müşteri alıcı → MÜŞTERİ", () => {
    expect(aliciRozet({ aliciTipi: "musteri", musteriId: 1 }).label).toBe("MÜŞTERİ");
  });
  it("anlaşmasız dış firma (disFirma) → ANLAŞMASIZ SERVİS (bayi değil)", () => {
    const r = aliciRozet({ aliciTipi: "bayi", disFirma: true, disFirmaAd: "X Servis" });
    expect(r.label).toBe("ANLAŞMASIZ SERVİS");
  });
  it("kayıtlı bayi → BAYİ", () => {
    expect(aliciRozet({ aliciTipi: "bayi", dealerId: 5 }).label).toBe("BAYİ");
  });
  it("legacy kayıt (aliciTipi yok) → BAYİ", () => {
    expect(aliciRozet({ dealerId: 5 }).label).toBe("BAYİ");
  });
});
