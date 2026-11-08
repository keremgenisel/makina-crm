// Spec 0099: kırılım toplamının kaynak taramaları (C1/2, C5, C5/2). Ekran kriterleri tests/ui/kirilim-toplami-0099.test.jsx'te.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as urunAgaci from "../src/lib/urunAgaci";

const kok = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(kok, p), "utf-8");
const PART = "src/components/PartManager.jsx";
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const say = (s, alt) => s.split(alt).length - 1;
const dosyalar = (kokDizin) => {
  const sonuc = [];
  const gez = (d) => {
    for (const e of fs.readdirSync(path.join(kok, d), { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) gez(p);
      else if (/\.(js|jsx|cjs|mjs)$/.test(e.name)) sonuc.push(p);
    }
  };
  gez(kokDizin);
  return sonuc;
};

describe("Spec 0099: tek okuma yolu (C1/2)", () => {
  it("AC-26: PartManager'da formMaliyeti( ve parcaMaliyetKurus( çağrıları artmadı; hammadde tutarını toplayan satır yok", () => {
    const s = yorumsuz(oku(PART));
    // Spec öncesi taban (main 250dd16): ikisi de 2.
    expect(say(s, "formMaliyeti(")).toBeLessThanOrEqual(2);
    expect(say(s, "parcaMaliyetKurus(")).toBeLessThanOrEqual(2);
    expect(say(s, "reduce(")).toBe(0);
    expect(say(s, "+=")).toBe(0);
    expect(s.match(/(^|[^A-Za-z])kurus\(/g)).toBeNull();
  });
  it("AC-26 (spec 0135 ile kalem listesine taşındı): toplam kutusu ebeveynin canlı maliyetinden prop olarak beslenir (iki pencere, tek sonuç)", () => {
    // Spec 0135 R11, C2: hammadde bölümünün toplam kutusu kalktı; kalem listesinin tek toplamı aynı desenle ebeveynin tek
    // sonucundan (`formMaliyeti` → `kalem`) gelir. Ekran kriterleri tests/ui/maliyet-kalemleri-0135.test.jsx'te
    // (tests/ui/kirilim-toplami-0099.test.jsx spec 0135 ile silindi: sınadığı bölüm yok).
    const s = oku(PART);
    expect(s).toMatch(/const canliEkle = addOpen \? formMaliyeti\(form\) : null;/);
    expect(s).toMatch(/const canliDuzenle = editId !== null \? formMaliyeti\(editForm\) : null;/);
    expect(say(s, "ozet={canliEkle?.kalem}")).toBe(1);
    expect(say(s, "ozet={canliDuzenle?.kalem}")).toBe(1);
  });
});

describe("Spec 0099: kanıt aracı (plan §8, triyaj bulgu 4)", () => {
  it("textarea tutamağı kanıt sayfasında çizilmez ve kural CLAUDE.md'de yazılı", () => {
    expect(oku("scripts/evidence/0009-sayfa.html")).toContain("textarea { resize: none !important; }");
    expect(oku("CLAUDE.md")).toMatch(/hide-scrollbars[^\n]*textarea[^\n]*resize: none !important/);
  });
});

describe("Spec 0099: metinler tek yerde (C5, C5/2); spec 0135 ile kalem diline geçti", () => {
  it("AC-27 (spec 0135 ile): toplam etiketi yalnız urunAgaci.js'te tanımlı, kap kimliği yalnız kalem bölümünde; eski iki metin kaynakta yok", () => {
    expect(urunAgaci.KALEM_TOPLAM_ETIKETI).toBe("Toplam, parçanın alış maliyeti");
    const src = dosyalar("src");
    const geciyor = (alt) => src.filter(p => oku(p).includes(alt)).map(p => p.split(path.sep).join("/"));
    expect(geciyor("Toplam, parçanın alış maliyeti")).toEqual(["src/lib/urunAgaci.js"]);
    expect(geciyor("tutarı girilen")).toEqual([]);
    expect(geciyor("Hatalı satır var")).toEqual([]);
    expect(geciyor("hammadde-toplam")).toEqual([]);
    expect(geciyor('"kalem-toplam"')).toEqual(["src/components/MaliyetKalemleriAlani.jsx"]);
  });
  it("AC-28 (spec 0135 ile): kaynak ibaresi iki kullanıcı türünde tek kalem metni; kırılımın rakamlı satırı ve sayılı liste metni kalktı", () => {
    const hepsi = [...dosyalar("src"), ...dosyalar("tests"), ...dosyalar("scripts")].filter(p => !p.endsWith("kirilim-toplami-0099.test.js"));
    const icinde = (alt) => hepsi.filter(p => oku(p).includes(alt));
    expect(icinde("kaynakKartMetni")).toEqual([]);
    expect(icinde("KAYNAK_KIRILIM_YETKISIZ")).toEqual([]);
    expect(urunAgaci.kaynakKartMetni).toBeUndefined();
    expect(urunAgaci.KAYNAK_KIRILIM).toBeUndefined();
    expect(urunAgaci.kaynakListeMetni).toBeUndefined();
    expect(urunAgaci.kalemKaynakMetni({ malzeme: 1, islem: 2 })).toBe("Maliyet kalemlerinden hesaplanıyor (1 malzeme, 2 işlem kalemi)");
    expect(oku(PART)).not.toContain('data-testid="maliyet-kirilimdan"');
  });
});
