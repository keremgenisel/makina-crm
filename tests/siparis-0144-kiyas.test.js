// Spec 0144 C4, C4/2 (AC-42): fiyatsız nüsha, malzeme satırlarının tamamı ve fark notu ayıklandığında spec öncesi koddan üretilmiş
// altın belgeyle birebir aynı (parça satırları, toplam tablosu, notlar, başlık bandı, MODELLER, sayfa sonları). Altın `YAZ_0144=1`.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import * as R from "../src/lib/siparisRaporu";
import { SENARYOLAR, BUGUN, FACTORY } from "./fixtures/0144-veri.js";
import { ayikla0144, MALZEME_SATIRI } from "./fixtures/0144-ayikla.js";

const DOSYA = "tests/fixtures/0144-belge-once.json";
const uret = () => Object.fromEntries(Object.entries(SENARYOLAR()).map(([ad, [v, sec, ops]]) =>
  [ad, R.siparisRaporuHtml(S.siparisIhtiyaci(v, sec), { bugun: BUGUN, factory: FACTORY, ...ops })]));

describe("Spec 0144 kıyas (C4)", () => {
  it("AC-42: malzeme satırları ayıklanınca fiyatsız nüsha spec öncesi belgeyle birebir aynı", () => {
    const s = uret();
    if (process.env.YAZ_0144 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const altin = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    const not = R.PAY_FARK_NOTU;
    for (const ad of Object.keys(altin)) expect(ayikla0144(s[ad], not)).toBe(ayikla0144(altin[ad]));
  });
  it("altın gerçekten malzeme satırları ve bölümler içerir (kıyas boş değil)", () => {
    const altin = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect((altin.odakli.match(MALZEME_SATIRI) || []).length).toBeGreaterThan(10);
    expect(altin.odakli).toContain("Alınacak malzeme toplamı");
    expect(altin.parti).toContain("Parti 7");
    expect(altin.duzenleme).toContain("(elle)");
  });
});
