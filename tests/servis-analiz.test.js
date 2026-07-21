// Servis Panosu zaman analizi — saf hesap fonksiyonları (utils + servisAnaliz).
import { describe, it, expect } from "vitest";
import { sureDk, sureBicim, fmtZaman } from "../src/lib/utils";
import { servisSureleri } from "../src/lib/servisAnaliz";

describe("sureDk", () => {
  it("iki damga arası dakika farkını verir", () => {
    expect(sureDk("2026-07-20T09:00:00", "2026-07-20T11:30:00")).toBe(150);
    expect(sureDk("2026-07-20T09:00", "2026-07-20T09:45")).toBe(45); // saniyesiz de olur
  });
  it("eksik/geçersiz damgada null", () => {
    expect(sureDk(null, "2026-07-20T11:30:00")).toBeNull();
    expect(sureDk("2026-07-20T09:00:00", null)).toBeNull();
    expect(sureDk("bozuk", "2026-07-20T11:30:00")).toBeNull();
  });
  it("negatif farkı 0'a kırpar", () => {
    expect(sureDk("2026-07-20T11:00:00", "2026-07-20T09:00:00")).toBe(0);
  });
});

describe("sureBicim", () => {
  it("dakikayı tam dökümle okunur süreye çevirir (gün/saat/dk)", () => {
    expect(sureBicim(45)).toBe("45 dk");
    expect(sureBicim(60)).toBe("1 saat");
    expect(sureBicim(135)).toBe("2 saat 15 dk");
    expect(sureBicim(1440)).toBe("1 gün");
    expect(sureBicim(1500)).toBe("1 gün 1 saat");     // 1500 = 1g 1sa 0dk → dk atlanır
    expect(sureBicim(3063)).toBe("2 gün 3 saat 3 dk"); // tam döküm
    expect(sureBicim(0)).toBe("0 dk");
    expect(sureBicim(null)).toBe("—");
  });
});

describe("fmtZaman", () => {
  it("gg/aa ss:dd biçiminde gösterir", () => {
    expect(fmtZaman("2026-07-20T14:30:00")).toBe("20/07 14:30");
    expect(fmtZaman(null)).toBe("—");
  });
});

describe("servisSureleri", () => {
  it("tamamlanmış serviste bekleme/işçilik/toplam doğru", () => {
    const s = servisSureleri({
      fabrikaGirisZamani: "2026-07-20T09:00:00",
      bakimBaslangicZamani: "2026-07-20T10:00:00",
      bitisZamani: "2026-07-20T12:30:00",
    });
    expect(s.beklemeDk).toBe(60);   // 09:00 → 10:00
    expect(s.isclikDk).toBe(150);   // 10:00 → 12:30
    expect(s.toplamDk).toBe(210);   // 09:00 → 12:30
    expect(s.devamEdiyor).toBe(false);
  });
  it("devam eden işçilik now'a göre canlı hesaplanır", () => {
    const s = servisSureleri(
      { fabrikaGirisZamani: "2026-07-20T09:00:00", bakimBaslangicZamani: "2026-07-20T10:00:00" },
      "2026-07-20T10:45:00",
    );
    expect(s.beklemeDk).toBe(60);
    expect(s.isclikDk).toBe(45);    // 10:00 → now 10:45
    expect(s.toplamDk).toBe(105);   // 09:00 → now 10:45
    expect(s.devamEdiyor).toBe(true);
  });
  it("hiç damga yoksa hepsi null", () => {
    const s = servisSureleri({});
    expect(s.beklemeDk).toBeNull();
    expect(s.isclikDk).toBeNull();
    expect(s.toplamDk).toBeNull();
    expect(s.devamEdiyor).toBe(false);
  });
});
