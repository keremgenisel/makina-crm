// Spec 0115 R35–R37: Servis Formu çıktısının kalıp satırı, çeviri anahtarı, Kargo Etiketi'nin altıncı durumu ve üretim formu
// çıktısının Tür sütunu.
import { describe, it, expect } from "vitest";
import { buildServiceFormHtml, buildKargoEtiketiHtml, tamirEtiketVerisi, kalipEtiketVerisi, DEFAULT_SERVIS_TRANSLATIONS } from "../src/lib/printTemplates";
import { buildPrintHtml } from "../src/components/stock/uretimFormPrint";
import { GROUPS } from "../src/components/settings/SettingsTranslations";
import { tamirSatiriKur } from "../src/lib/kalipTamiri";
import { emptyRow } from "../src/components/stock/uretimFormModel";
import { KDV, FAB, CUSTOMERS, SERVICES, URETIM_FORMLARI } from "./fixtures/0115-veri";

const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }, { id: 2, ad: "HAMBURGER", olcu: "Ø98" }];
const SV = { ...SERVICES[0], atolyeKaliplari: LISTE };
const BASLIKLAR = ["SEVK / KARGO ETİKETİ", "GÖNDEREN", "ALICI", "İÇERİK", "TESLİM ŞEKLİ", "TARİH"];
const vArgs = (v) => [v.gonderen, v.alici, v.icerik, v.opts];

describe("Spec 0115 Servis Formu çıktısı (R35, R35/2)", () => {
  it("AC-59: kalıp varken etiket satırı basılır, girişler ad · Ölçü biçiminde", () => {
    const h = buildServiceFormHtml(SV, CUSTOMERS, KDV, { factory: FAB });
    expect(h).toContain("<tr><th>ATÖLYEYE ALINAN KALIPLAR</th><td>100_ERKEK KALIPLAR REVİZE · HAMBURGER · Ölçü: Ø98</td></tr>");
    const en = buildServiceFormHtml(SV, CUSTOMERS, KDV, { factory: FAB, translations: { _lang: "EN" } });
    expect(en).toContain("MOLDS TAKEN INTO WORKSHOP");
  });
  it("AC-60: kalıp yokken satır hiç basılmaz", () => {
    const h = buildServiceFormHtml(SERVICES[0], CUSTOMERS, KDV, { factory: FAB });
    expect(h).not.toContain("ATÖLYEYE ALINAN KALIPLAR");
  });
  it("AC-99: çeviri anahtarı dört yerde (TR, EN, Çeviriler ekranı, kapsam testi ceviri-kapsam.test.js)", () => {
    expect(DEFAULT_SERVIS_TRANSLATIONS.TR.atolyeKaliplariLabel).toBe("ATÖLYEYE ALINAN KALIPLAR");
    expect(DEFAULT_SERVIS_TRANSLATIONS.EN.atolyeKaliplariLabel).toBe("MOLDS TAKEN INTO WORKSHOP");
    expect(GROUPS.filter(g => g.ns === "servis").flatMap(g => g.keys.map(k => k.key))).toContain("atolyeKaliplariLabel");
  });
});

describe("Spec 0115 Kargo Etiketi altıncı durum (R37, R37/2, C10)", () => {
  const v = tamirEtiketVerisi(SV, { customers: CUSTOMERS, factory: FAB });
  const html = buildKargoEtiketiHtml(...vArgs(v));
  it("AC-62: başlıklar diğer durumlarla birebir aynı (Extra Kalıp kardeşiyle aynı başlık kümesi)", () => {
    const kalip = buildKargoEtiketiHtml(...vArgs(kalipEtiketVerisi([{ id: 21, customerId: 1, ad: "PİDE", olcu: "1", tarih: "2026-09-14" }], { customers: CUSTOMERS, factory: FAB })));
    const baslik = (h) => [...h.matchAll(/class="(?:h|fh|kind)">([^<]+)</g)].map(m => m[1]);
    expect(baslik(html)).toEqual(baslik(kalip));
    for (const b of BASLIKLAR) expect(html).toContain(b);
  });
  it("AC-63: içerik ad · Ölçü biçiminde", () => {
    expect(v.icerik).toEqual([{ ad: "100_ERKEK KALIPLAR REVİZE", miktar: 1 }, { ad: "HAMBURGER · Ölçü: Ø98", miktar: 1 }]);
  });
  it("AC-64: alıcı müşterinin kayıtlı adresi, gönderen fabrika", () => {
    expect(v.alici).toMatchObject({ firma: "Anadolu Köfte", adres: "Mevlana Cad. 10", city: "Konya", tel: "0332 111 11 11", yetkili: "Ali Bey" });
    expect(v.gonderen.ad || v.gonderen.name || "").toMatch(/Altuntaş/);
  });
  it("AC-96: teslim şekli Kargo, tarih servis tarihi, içerik servisin bütün listesi; ek ibare ve kargo takip alanı yok", () => {
    expect(v.opts).toEqual({ teslimSekli: "Kargo", tarih: "12/10/2026" }); // fmtTR (diğer etiketlerle aynı)
    expect(html).not.toMatch(/[Tt]amir|TAMİR|KARGO-TAKİP|Takip/);
  });
});

describe("Spec 0115 üretim formu çıktısı (R16/2, R36, R36/2)", () => {
  const sv = SV;
  const r = tamirSatiriKur({ ...emptyRow(), id: 9001 }, sv, LISTE[1], CUSTOMERS[0]);
  const form = { ...URETIM_FORMLARI[0], satirlar: [...URETIM_FORMLARI[0].satirlar, r] };
  const h = buildPrintHtml(form);
  it("AC-61, AC-98: Tür ilk sütun, colspan altı; tamir satırının servis tarihi Kalıp hücresinde adın altında", () => {
    expect(h).toMatch(/<tr>\s*<th[^>]*>Tür<\/th>\s*<th[^>]*>Kalıp Kodu<\/th>/);
    expect(h).not.toContain('colspan="5"');
    expect(h).toContain('colspan="6"');
    expect(h).toMatch(/data-tur[^>]*>Tamir<\/td>/);
    expect(h).toMatch(/data-tur[^>]*>Üretim<\/td>/);
    expect(h).toMatch(/HAMBURGER<\/span>\s*<\/div><div[^>]*>Servis: 12\.10\.2026<\/div>/);
    expect(buildPrintHtml({ satirlar: [] })).toContain('colspan="6"');
  });
  it("AC-100: tamir satırı müşterinin kendi grubunda ve grubun sonunda", () => {
    const anadolu = h.indexOf("Anadolu Köfte"), bafra = h.indexOf("Bafra Gıda");
    const tamir = h.indexOf(">Tamir<");
    expect(anadolu).toBeGreaterThan(-1);
    expect(tamir).toBeGreaterThan(anadolu);
    expect(tamir).toBeLessThan(bafra);
  });
});
