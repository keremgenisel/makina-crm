// Yerel servis kaydı: bu uygulamadan eklenen servis id'leri, uygulama geneli bildirimde
// "uzaktan geldi" sayılmasın diye izlenir.
import { describe, it, expect } from "vitest";
import { yerelServisEkle, yerelServisMi } from "../src/lib/yerelServis";

describe("yerelServis", () => {
  it("eklenen id yerel sayılır, eklenmeyen sayılmaz", () => {
    yerelServisEkle(101);
    expect(yerelServisMi(101)).toBe(true);
    expect(yerelServisMi(999)).toBe(false);
  });

  it("null/undefined güvenli (eklenmez, sorgu false)", () => {
    yerelServisEkle(null);
    yerelServisEkle(undefined);
    expect(yerelServisMi(null)).toBe(false);
    expect(yerelServisMi(undefined)).toBe(false);
  });
});
