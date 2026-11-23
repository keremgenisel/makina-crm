// Spec 0158 R12, R12/2 (AC-21, AC-58, AC-59): sipariş belgesinin baskı yerleşimi gerçek tarayıcı motorunda (Electron) ölçülür;
// jsdom yerleşim hesaplamadığı için burada sahte yeşil verirdi. Belge saf kurucudan üretilir; uzun serbest metinlerle yedi sütun.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml } from "../src/lib/siparisRaporu";
import { veri, PARCALAR, BUGUN, FACTORY } from "./fixtures/0158-dolu.js";

const require = createRequire(import.meta.url);
const root = path.join(__dirname, "..");
const UZUN = PARCALAR.map(p => (p.id === 4 ? { ...p, ad: "Altıgen başlı tam dişli cıvata galvanizli uzun ad", kod: "CV-8-DIN933-A2-70-UZUNKOD",
  olcu: "M8 × 40 mm tam diş, 1,25 hatve", hammaddeAdi: "Paslanmaz çelik A2-70 (AISI 304) sertifikalı", cins: "DIN 933 / ISO 4017 altıgen başlı cıvata" } : p))
  // Triyaj (bulgu 1): dar Ölçü sütununda iki satıra kırılan uzun boru ölçüsü; ikinci ölçünün adedi kendi ölçüsünün karşısında kalmalı.
  .concat([{ id: 15, ad: "Uzun", kod: "BR-114", hammaddeAdi: "AISI 304", cins: "Dikişsiz boru", maliyetKalemleri: [
    { tur: "malzeme", malzemeId: 601, bicim: "boru", cap: 114.3, et: 6.02, boy: 1234.5, adet: 2 },
    { tur: "malzeme", malzemeId: 601, bicim: "boru", cap: 114.3, et: 6.02, boy: 80, adet: 1 }] }]);

describe("Sipariş belgesi baskı yerleşimi (Electron)", () => {
  it("AC-21 / AC-58 / AC-59 / AC-28 (hiza): yedi sütunlu fiyatlı nüsha A4 dikeyde kırpılmaz; gövde en çok 780 px; küçük punto; dar belge 720 px", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "siparis-belge-"));
    const genis = path.join(dir, "genis.html"); const dar = path.join(dir, "dar.html");
    writeFileSync(genis, siparisRaporuHtml(S.siparisIhtiyaci(veri({ parts: UZUN }), { tedarikciOdakli: true }), { bugun: BUGUN, factory: FACTORY, fiyatli: true }));
    writeFileSync(dar, siparisRaporuHtml(S.siparisIhtiyaci(veri({ parts: PARCALAR.filter(p => [2, 11].includes(p.id)) }), { tedarikciOdakli: true }), { bugun: BUGUN, factory: FACTORY }));
    const electronBin = require(path.join(root, "node_modules", "electron"));
    const r = spawnSync(electronBin, [path.join(root, "scripts", "tests", "siparis-belge-yerlesim.cjs"), genis, dar], { encoding: "utf-8", timeout: 120000 });
    if (process.env.GOSTER_0158) console.log(r.stdout);
    if (r.status !== 0) { console.error("STDOUT:\n" + r.stdout); console.error("STDERR:\n" + r.stderr); }
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("TUM KONTROLLER GECTI");
  }, 180000);
});
