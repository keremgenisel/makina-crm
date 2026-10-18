// Spec 0092 AC-32, AC-32/2 (R18, R18/2): gider raporu motorunun çağrı sayısı casusla ölçülür. Spec öncesi ölçüm (casusla,
// 2026-10-18): parti payı hesabı on iki aylık harita için 12, dönem payı hesabı 1 çağrı. Yeni hesapta ay tablosu TEK çağrıyla
// kurulur ve aylık ile dönem havuzu aynı tablodan okunur.
import { describe, it, expect, vi } from "vitest";

const sayac = vi.hoisted(() => ({ n: 0, secenekler: [] }));
vi.mock("../src/lib/gider", async (orijinal) => {
  const m = await orijinal();
  return { ...m, hesaplaGiderRaporu: (...a) => { sayac.n++; sayac.secenekler.push(a[2] || {}); return m.hesaplaGiderRaporu(...a); } };
});
const { partiGenelPaylari, genelGiderPayi, aylikGenelHavuzlar, partiKapanisHavuzu } = await import("../src/lib/makinaStandartMaliyet");
const V = await import("./fixtures/0092-veri");

const olc = (f) => { sayac.n = 0; sayac.secenekler = []; const r = f(); return { n: sayac.n, r, secenekler: sayac.secenekler }; };

describe("Spec 0092: rapor çağrı sayısı (R18)", () => {
  it("AC-32 / AC-32/2: parti payı hesabı on iki aylık harita için 1 çağrı (spec öncesi 12); aylık pay seçeneğiyle", () => {
    const { n, r, secenekler } = olc(() => partiGenelPaylari(V.veri(), V.BUGUN));
    expect(r.aylar.size).toBe(12);
    expect(n).toBe(1);
    expect(secenekler[0].aylikPay).toBe(true);
  });
  it("AC-32: dönem payı hesabı 1 çağrı (spec öncesi 1)", () => {
    expect(olc(() => genelGiderPayi(V.veri(), { baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 80 }, V.BUGUN)).n).toBe(1);
  });
  it("AC-32/2: aylık havuzlar ve kapanış haritası da tek çağrıyla", () => {
    const aylar = ["2026-01", "2026-02", "2026-03", "2026-07"];
    expect(olc(() => aylikGenelHavuzlar(V.veri(), aylar, V.BUGUN)).n).toBe(1);
    expect(olc(() => partiKapanisHavuzu(V.veri(), V.PARTILER[0], V.BUGUN)).n).toBe(1);
    expect(olc(() => aylikGenelHavuzlar(V.veri(), [], V.BUGUN)).n).toBe(0);
  });
});
