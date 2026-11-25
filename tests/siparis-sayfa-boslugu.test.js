// Kullanıcı isteği 2026-11-25: sipariş belgesi PDF olarak kaydedilip yazdırılınca sayfaların en üstü kâğıda dayanıyordu (PDF sıfır
// kenar boşluğuyla üretilir, tedarikçi bölümleri yeni sayfadan başlar). Belge her sayfaya üst ve alt boşluk veren @page kuralını
// taşır; Chromium bu kuralı printToPDF'te de uygular (Electron'da ölçüldü: ikinci sayfanın içeriği 15 mm aşağıdan başlıyor).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, SAYFA_STIL } from "../src/lib/siparisRaporu";
import { BUGUN, FACTORY, veri } from "./fixtures/0144-veri.js";

const belge = (o = {}) => siparisRaporuHtml(S.siparisIhtiyaci(veri(), { tedarikciOdakli: true }), { bugun: BUGUN, factory: FACTORY, ...o });
const ustMm = (stil) => Number(/@page\{[^}]*margin:\s*(\d+(?:\.\d+)?)mm/.exec(stil)?.[1]);

describe("Sipariş belgesinde sayfa boşluğu", () => {
  it("iki nüshanın da <style> bloğunda @page kuralı var; üst boşluk en az 10 mm", () => {
    for (const fiyatli of [false, true]) {
      const h = belge({ fiyatli });
      const stil = /<style>([\s\S]*?)<\/style>/.exec(h)[1];
      expect(stil).toContain(SAYFA_STIL);
    }
    expect(ustMm(SAYFA_STIL)).toBeGreaterThanOrEqual(10);
    expect(SAYFA_STIL).toMatch(/size:A4/);
  });
  it("kural yalnız sipariş belgesinde; ortak rapor kabı (faaliyet ve gider raporları) değişmedi", () => {
    expect(fs.readFileSync("src/lib/raporSunumu.js", "utf8")).not.toMatch(/@page/);
    expect(fs.readFileSync("src/lib/siparisRaporu.js", "utf8").match(/@page/g)).toHaveLength(2); // sabit + yorumu
  });
});
