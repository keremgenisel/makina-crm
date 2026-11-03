// Spec 0127: Servis Formu çıktısında ve Servis Kayıtları Excel'inde kalıbın dönüşü.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildServiceFormHtml, buildMachineReportHtml, DEFAULT_SERVIS_TRANSLATIONS, DEFAULT_MAKINA_TRANSLATIONS } from "../src/lib/printTemplates";
import { kalipListesiMetni, kalipDonusuParcalari, kalipDonusuMetni } from "../src/lib/kalipTamiri";
import { SERVIS_EXPORT_HEAD, servisExportRow } from "../src/components/settings/SettingsExport";
import { GROUPS } from "../src/components/settings/SettingsTranslations";
import { CUSTOMERS, KDV, FAB, SEVKSIZ, SEVKLI } from "./fixtures/0127-veri";

const html = (sv, dil = "TR", ek = {}) => buildServiceFormHtml(sv, CUSTOMERS, KDV, { factory: FAB, translations: { _lang: dil, ...ek } });
const donusHucresi = (h, etiket = "Kalıbın Dönüşü") => {
  const m = new RegExp(`<tr><th>${etiket}</th><td>([^<]*)</td></tr>`).exec(h);
  return m ? m[1] : null;
};
const kod = (f) => readFileSync(f, "utf8");
const yorumsuz = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ .*$/gm, "");

describe("Spec 0127: Servis Formu çıktısı", () => {
  it("AC-1 / AC-15: sevk alanı yazılı serviste dönüş satırı kalıp satırının hemen ardında, değer dolu alanlardan", () => {
    const h = html(SEVKLI.kargoTam);
    const kalip = "<tr><th>Servis Gören Kalıplar</th><td>100_ERKEK KALIPLAR REVİZE · HAMBURGER · Ölçü: Ø98</td></tr>";
    const donus = "<tr><th>Kalıbın Dönüşü</th><td>Kargo · Yurtiçi Kargo · YK-123 · 25/10/2026 · Burak Yüce</td></tr>";
    expect(h).toContain(kalip + donus);
  });

  it("AC-14: kalıp listesi dolu ama beş sevk alanı yazılmamışsa satır basılmaz; kalıpsız serviste de", () => {
    expect(donusHucresi(html(SEVKSIZ.kalipliSevksiz))).toBeNull();
    expect(donusHucresi(html(SEVKSIZ.kalipsiz))).toBeNull();
    expect(kalipDonusuParcalari(SEVKSIZ.kalipliSevksiz)).toBeNull();
    // Kalıp listesi boşken yazılı sevk alanı da kapıdan geçmez (tamirYaz böyle kayıt yazmaz, savunma).
    expect(kalipDonusuParcalari({ ...SEVKLI.kargoTam, atolyeKaliplari: [] })).toBeNull();
    // Teslim şekli yalnız true iken yazılı sayılır; boşluk dizesi yazılı değildir.
    expect(kalipDonusuParcalari({ ...SEVKSIZ.kalipliSevksiz, kalipFabrikaTeslim: false, kalipKargoFirma: "  " })).toBeNull();
  });

  it("AC-3: yalnız kişi yazılıysa satır teslim şekli ve kişi, ayraç kalıntısı yok", () => {
    const v = donusHucresi(html(SEVKLI.yalnizKisi));
    expect(v).toBe("Kargo · Ayşe Şimşek");
    expect(v).not.toMatch(/·\s*·|^·|·$/);
  });

  it("AC-4: Fabrika Teslim TR'de aynen, EN'de onarım yeri sözlüğünün karşılığıyla; yeni değer anahtarı açılmaz", () => {
    expect(donusHucresi(html(SEVKLI.fabrikaKisi))).toBe("Fabrika Teslim · BURAK YÜCE");
    expect(donusHucresi(html(SEVKLI.fabrikaKisi, "EN"), "Mold Return")).toBe("Factory Delivery · BURAK YÜCE");
    // Spec öncesine göre iki dilde yalnız bir anahtar eklendi (etiket).
    for (const dil of ["TR", "EN"]) expect(Object.keys(DEFAULT_SERVIS_TRANSLATIONS[dil]).filter(k => /kalipDonusu|kalipTeslim/i.test(k))).toEqual(["kalipDonusuLabel"]);
  });

  it("AC-5: geçersiz ya da boş kargo tarihi basılmaz, servis tarihine düşülmez", () => {
    const v = donusHucresi(html(SEVKLI.bozukTarih));
    expect(v).toBe("Kargo · Aras");
    expect(v).not.toContain("12/10/2026");
    expect(donusHucresi(html(SEVKLI.yalnizTarih))).toBe("Kargo · 01/11/2026");
  });

  it("AC-18: servis bölümündeki teslim şekli çevirisi servis formunun iki satırında; makina raporu kendi ad alanını okur", () => {
    const ozel = { TR: { placeFabrikaTeslim: "Fabrikadan Elden" } };
    const sv = { ...SEVKLI.fabrikaKisi, repairPlace: "Fabrika Teslim" };
    const h = html(sv, "TR", ozel);
    expect(h).toContain("<tr><th>Yapılan İşlem</th><td>Fabrikadan Elden</td></tr>");
    expect(donusHucresi(h)).toBe("Fabrikadan Elden · BURAK YÜCE");
    const rapor = buildMachineReportHtml(CUSTOMERS[0], [sv], [], { _lang: "TR" }, "", [], FAB);
    expect(rapor).toContain(DEFAULT_MAKINA_TRANSLATIONS.TR.placeFabrikaTeslim);
    expect(rapor).not.toContain("Fabrikadan Elden");
  });
});

describe("Spec 0127: yardımcılar ve kaynak taramaları", () => {
  it("AC-8: metni kuran yardımcı kalipTamiri'nde ve çözülmüş teslim metnini alır; şablon birleştirme yazmaz; transPlace ve PLACE_KEY_MAP dışa verilmez", () => {
    expect(kalipDonusuMetni(SEVKLI.fabrikaKisi, "ÇÖZÜLMÜŞ")).toBe("ÇÖZÜLMÜŞ · BURAK YÜCE");
    expect(kalipDonusuMetni(SEVKSIZ.kalipliSevksiz, "X")).toBe("");
    const kt = kod("src/lib/kalipTamiri.js");
    expect(kt).toMatch(/export const kalipDonusuMetni = \(servis, teslimMetni\) =>/);
    expect(kt).not.toMatch(/transPlace|PLACE_KEY_MAP|placeKargo|placeFabrikaTeslim/);
    expect(kt).not.toMatch(/export const gecerliGun/);
    const pt = yorumsuz(kod("src/lib/printTemplates.js"));
    expect(pt).not.toMatch(/export (const|function) (transPlace|PLACE_KEY_MAP)|export \{[^}]*(transPlace|PLACE_KEY_MAP)/);
    expect(pt).toContain("[[L.kalipDonusuLabel, kalipDonusuMetni(sv, transPlace(L, sevkTeslimSekli(sv)))]]");
    expect(pt).not.toMatch(/kalipKargoFirma|kalipKargoTakipNo|kalipKargoTarih|kalipKargoSorumlusu/);
    // Kapı ve tarih sevkTarihi / sevkTeslimSekli'ne bakmaz (R1/3, R5).
    const yardimci = kt.slice(kt.indexOf("export const kalipDonusuParcalari"), kt.indexOf("export const kalipDonusuMetni"));
    expect(yardimci).not.toMatch(/sevkTarihi\(/);
    expect(yardimci).toMatch(/SEVK_ALANLARI\.some/);
  });

  it("triyaj: servis bloğu eski yorumları kodlarından ayırmaz (0101 yorumu stok başlığının hemen üstünde, servis bloğu 0068 yorumunun önünde)", () => {
    const k = kod("src/components/settings/SettingsExport.jsx");
    const satirlar = k.split("\n");
    const stok = satirlar.findIndex(l => l.startsWith("export const STOK_EXPORT_HEAD"));
    expect(satirlar[stok - 2]).toMatch(/^\/\/ Spec 0101 R10, Karar 25: stok dışa aktarmasının/);
    expect(k.indexOf("export const servisExportRow")).toBeLessThan(k.indexOf("// Spec 0068 R3–R5"));
  });

  it("AC-13: veri şeması, izin, sunucu ve birleştirme dosyaları işi anmaz", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/permissions.js", "src/components/settings/serverPermissionDefs.js"]) {
      expect(kod(f), f).not.toMatch(/kalipDonusu|kalipListesiMetni|SERVIS_KALIP_EXPORT_HEAD|spec 0127/);
    }
  });
});

describe("Spec 0127: Servis Kayıtları Excel'i", () => {
  const satir = (sv) => servisExportRow(sv, { customers: CUSTOMERS, kdvRates: KDV });
  const ALTI = ["Servis Gören Kalıplar", "Kalıp Teslim Şekli", "Kalıp Kargo Firması", "Kalıp Takip No", "Kalıp Kargo Tarihi", "Kalıbı Veren Kişi"];

  it("AC-9: altı başlık sırasıyla tevkifat bloğunun önünde; 31 sabit sütun; ihraç kayıtlı sütunu yok", () => {
    expect(SERVIS_EXPORT_HEAD.slice(25, 31)).toEqual(ALTI);
    expect(SERVIS_EXPORT_HEAD.slice(31)).toEqual(["Tevkifat Oranı", "Alıcının Beyan Edeceği KDV"]);
    expect(SERVIS_EXPORT_HEAD).toHaveLength(33);
    expect(SERVIS_EXPORT_HEAD.some(h => /İhraç/.test(h))).toBe(false);
    expect(satir(SEVKLI.kargoTam)).toHaveLength(33);
  });

  it("AC-10 / AC-16 / AC-17: dolu, sevksiz ve kalıpsız satırlar; tarih fmtTR, teslim ham Türkçe, boş hücre boş dize", () => {
    expect(satir(SEVKLI.kargoTam).slice(25, 31)).toEqual(["100_ERKEK KALIPLAR REVİZE · HAMBURGER · Ölçü: Ø98", "Kargo", "Yurtiçi Kargo", "YK-123", "25/10/2026", "Burak Yüce"]);
    expect(satir(SEVKLI.fabrikaKisi).slice(25, 31)).toEqual(["100_ERKEK KALIPLAR REVİZE · HAMBURGER · Ölçü: Ø98", "Fabrika Teslim", "", "", "", "BURAK YÜCE"]);
    expect(satir(SEVKLI.bozukTarih).slice(25, 31)[4]).toBe("");
    // Kalıplı ama sevksiz: kalıp hücresi dolu, beş sevk hücresi boş (Excel "Kargo" yazmaz, R6/5).
    expect(satir(SEVKSIZ.kalipliSevksiz).slice(25, 31)).toEqual([kalipListesiMetni(SEVKSIZ.kalipliSevksiz), "", "", "", "", ""]);
    expect(satir(SEVKSIZ.kalipsiz).slice(25, 31)).toEqual(["", "", "", "", "", ""]);
  });

  it("AC-11: tarih ham kalır, tevkifat hücreleri satırın sonunda", () => {
    const r = satir(SEVKSIZ.tevkifatli);
    expect(r[6]).toBe(SEVKSIZ.tevkifatli.date);
    expect(r.slice(31)[0]).toBe("5/10");
  });
});

describe("Spec 0127: çeviri", () => {
  it("AC-6: kalipDonusuLabel iki dilde ve Çeviriler ekranının servis bölümünde", () => {
    expect(DEFAULT_SERVIS_TRANSLATIONS.TR.kalipDonusuLabel).toBe("Kalıbın Dönüşü");
    expect(DEFAULT_SERVIS_TRANSLATIONS.EN.kalipDonusuLabel).toBe("Mold Return");
    const servisAnahtarlari = GROUPS.filter(g => g.ns === "servis").flatMap(g => g.keys.map(k => k.key));
    expect(servisAnahtarlari).toContain("kalipDonusuLabel");
    expect(servisAnahtarlari.indexOf("kalipDonusuLabel")).toBe(servisAnahtarlari.indexOf("atolyeKaliplariLabel") + 1);
  });
});
