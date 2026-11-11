// Spec 0142 C6 (AC-32, AC-33): motorun sayıları (sipariş adetleri, boy adedi, net ve fire kilosu, asgari farkı, düzenleme) ve para
// alanları spec öncesi altınla birebir. Altın `YAZ_0142=1` ile spec ÖNCESİ koddan, veri `0142-veri.js`. Belge HTML'i kıyasa girmez.
// Ayıklama yalnız bu spec'in yeni alanlarıdır (`olculer`, `belge`, triyajda `belgeYeri`); tedarikçi bölümleri (0140'ın kıyası siliyordu) burada ölçülür.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { SENARYOLAR } from "./fixtures/0142-veri.js";

const DOSYA = "tests/fixtures/0142-once.json";
const ayikla = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "olculer" || k === "belge" || k === "belgeYeri" ? undefined : v)));
const uret = () => Object.fromEntries(Object.entries(SENARYOLAR()).map(([ad, [v, sec]]) => [ad, ayikla(sec === undefined ? S.siparisIhtiyaci(v) : S.siparisIhtiyaci(v, sec))]));

describe("Spec 0142 kıyas (C6)", () => {
  it("AC-32 / AC-33: motorun sayıları ve para alanları spec öncesi altınla birebir", () => {
    const s = uret();
    if (process.env.YAZ_0142 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const altin = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(s).toEqual(altin);
  });
  it("AC-33: para alanları yerinde ve dolu", () => {
    if (process.env.YAZ_0142 === "1") return;
    const { odakli } = uret();
    const kesit = odakli.kesitler.find(k => k.tutarK != null);
    for (const a of ["tutarK", "fiyat", "paraBirimi", "kur", "tutarTLK"]) expect(kesit).toHaveProperty(a);
    expect(odakli.tedarikciBolumleri.bolumler.some(b => b.hazirParcalar.some(x => x.birimK != null && x.tutarK != null))).toBe(true);
    expect(odakli.toplamTLK).toBeGreaterThan(0);
  });
  it("altın tedarikçi bölümlerini ve iki firmalı parçayı gerçekten içerir (kıyas boş değil)", () => {
    const altin = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(altin.odakli.tedarikciBolumleri.bolumler.map(b => b.ad)).toEqual(expect.arrayContaining(["Alfa Çelik", "Beta Plastik", "Gama Boru", "Delta Hırdavat"]));
    expect(altin.duzenleme.tedarikciBolumleri.duzen.hata).toBe(1);
  });
});
