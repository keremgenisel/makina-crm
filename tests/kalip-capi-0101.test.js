// Spec 0101: stoktaki makinanın kalıp çapı. Saf kurallar (kalipCapiYaz, kalipCapiOnDoldur), stok dışa aktarma satırı, maliyet
// zincirinin rakam düzeyinde değişmediği ve kaynak taramaları. Ekran kriterleri tests/ui/stok-kalip-capi-0101*.test.jsx'te;
// fmtKalipCapi'nin kendi testi (önkoşul) tests/fmt-kalip-capi.test.js'te.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { kalipCapiYaz, kalipCapiOnDoldur } from "../src/lib/utils";
import { STOK_EXPORT_HEAD, stokExportRow } from "../src/components/settings/SettingsExport";
import { makinaListesi } from "../src/lib/makinaMaliyeti";
import { partiGenelPaylari, gercekUretim } from "../src/lib/makinaStandartMaliyet";
import * as V90 from "./fixtures/0090-veri";

const kok = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(kok, p), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const srcDosyalari = (dir = "src") => fs.readdirSync(path.join(kok, dir), { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? srcDosyalari(path.join(dir, d.name)) : /\.(jsx?|mjs|cjs)$/.test(d.name) ? [path.join(dir, d.name)] : []);
const KC = { en: "50", yukseklik: "80", boy: "115" };

describe("Spec 0101: kalipCapiYaz (R2, R2/2, R3/2, Karar 14)", () => {
  it("AC-36: boş çapta (null, undefined, boş nesne, hepsi boşluk) alanı kayıttan siler, öteki alanlara dokunmaz", () => {
    const kayit = { id: 1, model: "AK100", serialNo: "S-1", note: "n", kalipCapi: KC };
    for (const bos of [null, undefined, {}, { en: "", yukseklik: "", boy: "" }, { en: "  ", yukseklik: " ", boy: "" }]) {
      const r = kalipCapiYaz(kayit, bos);
      expect("kalipCapi" in r).toBe(false);
      expect(r).toEqual({ id: 1, model: "AK100", serialNo: "S-1", note: "n" });
    }
    expect(kayit.kalipCapi).toBe(KC); // girdi değişmez
  });
  it("AC-36 / AC-2: dolu çapta yazar; nesne sığ kopyadır (Karar 27)", () => {
    const r = kalipCapiYaz({ id: 2 }, KC);
    expect(r).toEqual({ id: 2, kalipCapi: KC });
    expect(r.kalipCapi).not.toBe(KC);
  });
  it("AC-3: üç parçası yalnız boşluk olan çap boş sayılır", () => {
    expect("kalipCapi" in kalipCapiYaz({}, { en: "\t", yukseklik: "  ", boy: " " })).toBe(false);
  });
  it("AC-37: bir parçası dolu, ötekileri boşluk olan nesne birebir (kırpılmadan) yazılır", () => {
    expect(kalipCapiYaz({}, { en: " 50 ", yukseklik: "  ", boy: "" }).kalipCapi).toEqual({ en: " 50 ", yukseklik: "  ", boy: "" });
  });
  it("R5: çapsız kayıt çapsız kalır (anahtar doğmaz)", () => {
    expect(kalipCapiYaz({ id: 3, note: "x" }, undefined)).toEqual({ id: 3, note: "x" });
  });
});

describe("Spec 0101: kalipCapiOnDoldur (R12, R12/2, R15)", () => {
  it("AC-23: çapı olan satırda yazılacak alan, çapsız satırda ve null girdide boş nesne", () => {
    expect(kalipCapiOnDoldur({ id: 1, kalipCapi: KC })).toEqual({ kalipCapi: KC });
    expect(kalipCapiOnDoldur({ id: 1, kalipCapi: KC }).kalipCapi).not.toBe(KC);
    expect(kalipCapiOnDoldur({ id: 2 })).toEqual({});
    expect(kalipCapiOnDoldur({ id: 3, kalipCapi: { en: " ", yukseklik: "", boy: "" } })).toEqual({});
    expect(kalipCapiOnDoldur(null)).toEqual({});
    expect(kalipCapiOnDoldur(undefined)).toEqual({});
  });
  it("AC-43: tek parçalı çap nesne olarak bütün döner (parça birleştirmesi yok)", () => {
    expect(kalipCapiOnDoldur({ kalipCapi: { en: "50" } })).toEqual({ kalipCapi: { en: "50" } });
  });
});

describe("Spec 0101: stok dışa aktarması (R10, Karar 25)", () => {
  it("AC-15: başlık satırı ve çaplı satırın hücresi fmtKalipCapi biçiminde", () => {
    expect(STOK_EXPORT_HEAD).toEqual(["Model", "Makina Kalıp Çapı", "Seri No", "Stoğa Giriş Tarihi", "Not"]);
    expect(stokExportRow({ model: "AK100", serialNo: "S-1", addedDate: "2026-09-01", note: "n", kalipCapi: KC })).toEqual(["AK100", "50 x 80 x 115", "S-1", "2026-09-01", "n"]);
  });
  it("AC-16: çapı olmayan satırın çap hücresi boş dize", () => {
    expect(stokExportRow({ model: "AK100", serialNo: "S-2", addedDate: "2026-09-01", note: "" })[1]).toBe("");
  });
  it("AC-15: exportStock Excel ve CSV'yi aynı diziden, bu iki tanımla kurar", () => {
    const k = oku("src/components/settings/SettingsExport.jsx");
    expect(k).toMatch(/const rows = \[STOK_EXPORT_HEAD, \.\.\.stock\.map\(stokExportRow\)\];/);
  });
});

describe("Spec 0101: maliyet zinciri rakam düzeyinde değişmez (R22, R22/2, C8)", () => {
  const kayitsiz = (x) => JSON.stringify(x, (k, v) => (k === "kayit" ? undefined : v));
  const capli = V90.STOCK.map((s, i) => ({ ...s, kalipCapi: { en: String(40 + i), yukseklik: "80", boy: "115" } }));
  it("AC-34 / AC-45: partiGenelPaylari'nın havuzK, makinaBasiK, adet ve durum alanları çaplı ve çapsız satırda aynı", () => {
    const once = partiGenelPaylari(V90.veri(), V90.BUGUN);
    const sonra = partiGenelPaylari(V90.veri({ stock: capli }), V90.BUGUN);
    const rakam = (r) => Object.fromEntries(Object.entries(r).map(([id, p]) => [id, [p.havuzK, p.makinaBasiK, p.adet, p.durum]]));
    expect(Object.keys(once).length).toBeGreaterThan(0);
    expect(rakam(sonra)).toEqual(rakam(once));
    expect(kayitsiz(sonra)).toBe(kayitsiz(once));
  });
  it("AC-34: gercekUretim'in adetleri aynı", () => {
    const AYAR = { baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 4 };
    const once = gercekUretim(V90.veri(), AYAR, 100000);
    const sonra = gercekUretim(V90.veri({ stock: capli }), AYAR, 100000);
    expect(once.adet).toBeGreaterThan(0);
    expect([sonra.adet, sonra.cozulemeyen, sonra.payK]).toEqual([once.adet, once.cozulemeyen, once.payK]);
  });
  it("AC-45: makinaListesi ham satırı kayit ile taşır, karşılaştırma kayit'i ayıklar; iki altın dosya yenilenmedi", () => {
    const l = makinaListesi({ customers: V90.CUSTOMERS, stock: capli });
    expect(l.some(m => m.kayit?.kalipCapi)).toBe(true);
    expect(kayitsiz(l)).toBe(kayitsiz(makinaListesi({ customers: V90.CUSTOMERS, stock: V90.STOCK })));
    const sha = (p) => crypto.createHash("sha1").update(fs.readFileSync(path.join(kok, p))).digest("hex");
    expect(sha("tests/fixtures/0088-maliyet-once.json")).toBe("021c52baf3063af57ecb2953276213fb7aa4445d");
    expect(sha("tests/fixtures/0092-havuz-once.json")).toBe("728ca3a206f2b84abdafbf613d012442258ec6c4");
  });
  it("C8: maliyet motorları çapı okumaz", () => {
    for (const f of ["src/lib/makinaMaliyeti.js", "src/lib/makinaStandartMaliyet.js"]) expect(oku(f)).not.toMatch(/kalipCapi/);
  });
});

describe("Spec 0101: kaynak taramaları", () => {
  it("AC-8 (C3, Karar 17): db.cjs çapın parçalarını okumaz, fmtKalipCapi aynası yok", () => {
    const db = oku("electron/db.cjs");
    expect(db).not.toMatch(/fmtKalipCapi|kalipCapi\??\.(en|yukseklik|boy)\b|\.yukseklik\b/);
  });
  it("AC-11 (Karar 23): 'Arka Ölçü' dizesi yorumlar atılınca src/ altında yalnız ui.jsx'te", () => {
    const gecen = srcDosyalari().filter(f => yorumsuz(oku(f)).includes("Arka Ölçü"));
    expect(gecen).toEqual([path.join("src", "components", "ui.jsx")]);
  });
  it("AC-40: 'Makina Kalıp Çapı' başlığı iki form dosyasında yazılı değil; ikisi de paylaşılan bileşeni çağırır", () => {
    for (const f of ["src/components/stock/MakinaStokTab.jsx", "src/components/customers/CustomerAddEditForm.jsx"]) {
      expect(oku(f)).not.toMatch(/Makina Kalıp Çapı/);
      expect(oku(f)).toMatch(/<KalipCapiFields value=\{form\.kalipCapi\}/);
    }
  });
  it("AC-22: kayıt yolunda stok satırının çapı okunmaz (çap için damgalama fonksiyonu yok)", () => {
    expect(oku("src/lib/satisKaydi.js")).not.toMatch(/kalipCapi/);
    const c = yorumsuz(oku("src/components/Customers.jsx"));
    const satirlar = c.split("\n").filter(l => /kalipCapi/.test(l));
    // İçe aktarma, stoğa dönen satır (müşterinin çapı) ve tablo hücresi; srcEntry / stockEntry çapı okunmaz.
    expect(satirlar.length).toBe(3);
    expect(c).not.toMatch(/(srcEntry|stockEntry|s)\.kalipCapi/);
    expect(c).toMatch(/kalipCapiYaz\(\{ id: newStockId[^\n]*\}, c\.kalipCapi\)/);
  });
  it("AC-30: üretim formu çapı yalnız müşteri kaydından okur", () => {
    for (const f of ["src/components/stock/UretimFormu.jsx", "src/components/stock/UretimSatirEkleModal.jsx"]) {
      const okumalar = [...oku(f).matchAll(/([\w$]+\??)\.kalipCapi\b/g)].map(m => m[0]);
      expect(okumalar.length).toBeGreaterThan(0);
      for (const o of okumalar) expect(["c.kalipCapi", "cust?.kalipCapi"]).toContain(o);
    }
  });
  it("AC-31: stok formu katalogdaki model kalip alanını okumaz", () => {
    expect(oku("src/components/stock/MakinaStokTab.jsx")).not.toMatch(/\.kalip\b/);
  });
  it("AC-32: .yukseklik ile .boy'u aynı ifadede birleştiren satır yalnız utils.js'te", () => {
    const gecen = srcDosyalari().filter(f => yorumsuz(oku(f)).split("\n").some(l => /\.yukseklik\b/.test(l) && /\.boy\b/.test(l)));
    expect(gecen).toEqual([path.join("src", "lib", "utils.js")]);
  });
  it("AC-35 (Karar 30): müşteri dışa aktarması ve XLSX içe aktarmasının çap satırları aynen", () => {
    const e = oku("src/components/settings/SettingsExport.jsx");
    expect(e).toMatch(/c\.model, fmtKalipCapi\(c\.kalipCapi\), c\.serialNo,/);
    expect(e).toMatch(/\n\s+fmtKalipCapi\(c\.kalipCapi\),\n/);
    expect(oku("src/components/settings/SettingsImport.jsx")).toMatch(/kalipCapi = \{ en: parts\[0\] \|\| "", yukseklik: parts\[1\] \|\| "", boy: parts\[2\] \|\| "" \};/);
  });
  it("AC-36 (Karar 29): save() gövdesinin iki setStock kaydı kalipCapiYaz'dan geçer", () => {
    const k = oku("src/components/stock/MakinaStokTab.jsx");
    const govde = k.slice(k.indexOf("const save = () => {"), k.indexOf("const confirmDel = () => {"));
    expect(govde).toMatch(/setStock\(p => p\.some\(s => s\.id === nid\) \? p : \[kalipCapiYaz\(\{ \.\.\.form, id: nid \}, form\.kalipCapi\), \.\.\.p\]\);/);
    expect(govde).toMatch(/const kayit = kalipCapiYaz\(/);
    expect(govde).toMatch(/setStock\(p => p\.map\(s => s\.id === stockId \? kayit : s\)\);/);
    expect((govde.match(/setStock\(/g) || []).length).toBe(2);
    // R2/2: onChange'de temizleme yok (bileşen bütün nesneyi verir, form serbest)
    expect(k).toMatch(/<KalipCapiFields value=\{form\.kalipCapi\} onChange=\{kc => setForm\(p => \(\{ \.\.\.p, kalipCapi: kc \}\)\)\} \/>/);
  });
  it("AC-46: Makina Stoğu'nun arama alanları değişmedi", () => {
    expect(oku("src/components/stock/MakinaStokTab.jsx")).toMatch(/searchFields: \["model", "serialNo", "note"\],/);
  });
  it("AC-49 (C7/2): sözlükte paylaşılan çap alanının satırı CountryCityFields ile aynı sınıfta", () => {
    const s = oku("docs/tasarim-sozlugu.md");
    const bolum = s.slice(s.indexOf("## Bileşik alanlar (spec 0101)"));
    expect(bolum.split("\n## ")[0]).toMatch(/CountryCityFields[\s\S]*KalipCapiFields/);
  });
  it("C7: ui.jsx'in kanıt eşlemesinde kaydı yok (sözlüğü kullanmıyor)", () => {
    const e = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    expect(Object.keys(e).some(k => k.endsWith("src/components/ui.jsx"))).toBe(false);
  });
  it("triyaj (bulgu 3): spec'in karar numaraları sıralı ve açık bulgu Karar 39'da kayıtlı", () => {
    const sp = oku("specs/0101-stok-makina-kalip-capi.md");
    const kararlar = sp.slice(0, sp.indexOf("## Acceptance Criteria")).split("\n").map(l => /^(\d+)\. \*\*/.exec(l)?.[1]).filter(Boolean).map(Number);
    expect(kararlar).toEqual(Array.from({ length: kararlar.length }, (_, i) => i + 1));
    expect(kararlar.at(-1)).toBe(39);
    expect(sp).toMatch(/39\. \*\*Açık bulgu, Takım Yöneticisi'ne/);
  });
});
