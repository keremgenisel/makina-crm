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
  it("AC-26: toplam kutusu ebeveynin canlı maliyetinden prop olarak beslenir (iki pencere, tek sonuç)", () => {
    const s = oku(PART);
    expect(s).toMatch(/const canliEkle = addOpen \? formMaliyeti\(form\) : null;/);
    expect(s).toMatch(/const canliDuzenle = editId !== null \? formMaliyeti\(editForm\) : null;/);
    expect(say(s, "toplam={canliEkle}")).toBe(1);
    expect(say(s, "toplam={canliDuzenle}")).toBe(1);
    expect(say(s, "{...canliEkle}")).toBe(1);
    expect(say(s, "{...canliDuzenle}")).toBe(1);
    // Triyaj (bulgu 3): sayı kaynağın kendisinden; ölü "?? 0" yedeği sessizce "0 tedarikçi" yazdırabilirdi.
    expect(say(s, "hammaddeToplamSayisi(toplam.kaynak.n)")).toBe(1);
    expect(s).not.toMatch(/hammaddeToplamSayisi\([^)]*\?\?/);
  });
});

describe("Spec 0099: kanıt aracı (plan §8, triyaj bulgu 4)", () => {
  it("textarea tutamağı kanıt sayfasında çizilmez ve kural CLAUDE.md'de yazılı", () => {
    expect(oku("scripts/evidence/0009-sayfa.html")).toContain("textarea { resize: none !important; }");
    expect(oku("CLAUDE.md")).toMatch(/hide-scrollbars[^\n]*textarea[^\n]*resize: none !important/);
  });
});

describe("Spec 0099: metinler tek yerde (C5, C5/2)", () => {
  it("AC-27: üç metin yalnız urunAgaci.js'te tanımlı, kap kimliği yalnız PartManager'da; PartManager dizeleri satır içinde yazmaz", () => {
    expect(urunAgaci.HAMMADDE_TOPLAM_ETIKETI).toBe("Toplam, parçanın alış maliyeti");
    expect(urunAgaci.hammaddeToplamSayisi(3)).toBe("tutarı girilen 3 tedarikçi");
    expect(urunAgaci.HAMMADDE_TOPLAM_HATALI).toBe("Hatalı satır var; toplam yalnız geçerli satırlardan.");
    const src = dosyalar("src");
    const geciyor = (alt) => src.filter(p => oku(p).includes(alt)).map(p => p.split(path.sep).join("/"));
    expect(geciyor("Toplam, parçanın alış maliyeti")).toEqual(["src/lib/urunAgaci.js"]);
    expect(geciyor("tutarı girilen")).toEqual(["src/lib/urunAgaci.js"]);
    expect(geciyor("Hatalı satır var")).toEqual(["src/lib/urunAgaci.js"]);
    expect(geciyor("hammadde-toplam")).toEqual(["src/components/PartManager.jsx"]);
  });
  it("AC-28: kaynakKartMetni ve eski sabit adı kaynakta yok; KAYNAK_KIRILIM iki kullanıcı türünün tek metni", () => {
    const hepsi = [...dosyalar("src"), ...dosyalar("tests"), ...dosyalar("scripts")].filter(p => !p.endsWith("kirilim-toplami-0099.test.js"));
    const icinde = (alt) => hepsi.filter(p => oku(p).includes(alt));
    expect(icinde("kaynakKartMetni")).toEqual([]);
    expect(icinde("KAYNAK_KIRILIM_YETKISIZ")).toEqual([]);
    expect(urunAgaci.kaynakKartMetni).toBeUndefined();
    expect(urunAgaci.KAYNAK_KIRILIM).toBe("Hammadde kırılımından geliyor");
    const s = oku(PART);
    expect(s).toContain('kaynak.tur === "kirilim" ? KAYNAK_KIRILIM : KAYNAK_ELLE');
    expect(say(s, "giderYetki ? kaynak")).toBe(0);
    // R7, R8: rakamlı satır yalnız kırılım bölümünü görmeyen kullanıcıda.
    expect(s).toContain('{kirilimK != null && !giderYetki && <div data-testid="maliyet-kirilimdan"');
    // Liste hücresinin ikinci satırı değişmez (C6).
    expect(urunAgaci.kaynakListeMetni(3)).toBe("3 tedarikçiden");
  });
});
