// Triyaj (bulgu 3): fikstür adsız kimlikli satırı ve aynı parçanın adlı satırını da içerir; altın spec öncesi koddan yeniden üretildi.
// Spec 0162 AC-14 (P3): yeni kuralla ada göre çözülecek hiçbir hareketi olmayan veride analiz çıktısı spec öncesiyle birebir.
// Altın `tests/fixtures/0162-once.json` spec öncesi koddan üretildi (`YAZ_0162=1`). Var olan 0121 ve 0154 kıyasları ayrıca
// dokunulmadan yeşil kalır.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { hesaplaAnaliz } from "../src/lib/analiz";
import { COZULECEKSIZ } from "./fixtures/0162-veri";

const ALTIN = path.resolve("tests/fixtures/0162-once.json");
describe("Spec 0162: çözülecek hareket yokken spec öncesiyle aynı", () => {
  it("AC-14: analiz çıktısı (bütün kutular) altınla birebir", () => {
    const s = JSON.parse(JSON.stringify({ tum: hesaplaAnaliz(COZULECEKSIZ, {}), aralik: hesaplaAnaliz(COZULECEKSIZ, { baslangic: "2026-03-10", bitis: "2026-04-30" }) }));
    if (process.env.YAZ_0162 === "1") { fs.writeFileSync(ALTIN, JSON.stringify(s, null, 1)); return; }
    expect(s).toEqual(JSON.parse(fs.readFileSync(ALTIN, "utf8")));
  });
});
