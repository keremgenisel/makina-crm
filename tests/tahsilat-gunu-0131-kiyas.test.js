// Spec 0131 AC-31: tahsilat günü girilmemiş veride Kasa'nın hareket listesi, hesabı belirtilmemiş tahsilat listesi ve aylık
// rapor spec ÖNCESİ kodla birebir aynı. Altın YAZ_0131=1 ile spec öncesi koddan üretildi (tests/fixtures/0131-once.json); saat
// altının gününe sabittir (altına bugün giren kıyaslar ertesi gün kırılıyordu, 0121/0127 dersi).
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import { hesapBakiyeleri, hesapsizOzeti } from "../src/lib/kasa";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { HESAPLAR, KDV, FACTORY, veri } from "./fixtures/0131-veri";

const DOSYA = "tests/fixtures/0131-once.json";
beforeAll(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T10:00:00") }));
afterAll(() => vi.useRealTimers());

const simdi = () => {
  const v = veri();
  const bakiye = Object.fromEntries([...hesapBakiyeleri(HESAPLAR, [], v, { aralik: { baslangic: "2026-10-01", bitis: "2026-10-31" } })].map(([k, h]) => [k, h]));
  const hesapsiz = hesapsizOzeti([], v, HESAPLAR, "2026-10-01");
  const rapor = Object.fromEntries(["2024-03", "2024-09", "2025-06", "2026-10"].map(ay => [ay, hesaplaAylikRapor(v, ay, { factoryName: FACTORY.name, kdvRates: KDV, factory: FACTORY })]));
  return JSON.parse(JSON.stringify({ bakiye, hesapsiz, rapor }));
};

describe("Spec 0131 AC-31: günsüz veride çıktılar spec öncesiyle aynı", () => {
  it("AC-31: Kasa hareket listesi ve bakiyesi, hesapsız tahsilat listesi ve aylık rapor birebir", () => {
    const s = simdi();
    if (process.env.YAZ_0131 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    expect(s).toEqual(JSON.parse(fs.readFileSync(DOSYA, "utf8")));
  });
});
