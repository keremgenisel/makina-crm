// Spec 0161 AC-9, R5, C3: hiçbir parçanın cinsi dolu olmayan veride pencere ve belge sırası (motorun bütün çıktısı) spec öncesiyle
// birebir. Altın `tests/fixtures/0161-once.json` spec öncesi koddan üretildi (`YAZ_0161=1`); 0161 verisinin cinsleri silinmiş hâli.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import { veri, cinssiz } from "./fixtures/0161-veri";

const ALTIN = path.resolve("tests/fixtures/0161-once.json");
const simdi = () => JSON.parse(JSON.stringify({
  sade: siparisIhtiyaci(veri({ parts: cinssiz() }), { tedarikciOdakli: true }),
  duzenli: siparisIhtiyaci(veri({ parts: cinssiz() }), { tedarikciOdakli: true, duzenleme: { parca: { 106: { kapali: true }, 101: { adet: "x" } }, kesit: {} } }),
}));
describe("Spec 0161: cinssiz veride spec öncesiyle aynı", () => {
  it("AC-9 / R5 / C3: pencere ve belge sırası (motorun bütün çıktısı) altınla birebir", () => {
    const s = simdi();
    if (process.env.YAZ_0161 === "1") { fs.writeFileSync(ALTIN, JSON.stringify(s, null, 1)); return; }
    expect(s).toEqual(JSON.parse(fs.readFileSync(ALTIN, "utf8")));
  });
});
