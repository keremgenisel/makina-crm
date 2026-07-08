// E-posta şablonları: varsayılan + kayıtlı birleştirme ve yer tutucu doldurma.
import { describe, it, expect } from "vitest";
import { renderMailTemplate, DEFAULT_MAIL_TEMPLATES } from "../src/lib/mailTemplates";

describe("renderMailTemplate", () => {
  const vars = { tur: "Teklif", firma: "Genisel Catering", no: "T-42", tarih: "07.07.2026", firmaAdi: "Altuntaş Makina" };

  it("kayıt yoksa varsayılan şablonu doldurur", () => {
    const { konu, metin } = renderMailTemplate(null, "teklifProforma", vars);
    expect(konu).toBe("Teklif — Genisel Catering — T-42");
    expect(metin).toContain("Sayın Genisel Catering");
    expect(metin).toContain("Altuntaş Makina");
  });

  it("kayıtlı şablon varsayılanı ezer", () => {
    const saved = { teklifProforma: { konu: "Özel: {no}", metin: "Merhaba {firma}" } };
    const { konu, metin } = renderMailTemplate(saved, "teklifProforma", vars);
    expect(konu).toBe("Özel: T-42");
    expect(metin).toBe("Merhaba Genisel Catering");
  });

  it("boş kaydedilen alan varsayılana döner", () => {
    const saved = { teklifProforma: { konu: "  ", metin: "" } };
    const { konu } = renderMailTemplate(saved, "teklifProforma", vars);
    expect(konu).toBe("Teklif — Genisel Catering — T-42");
  });

  it("bilinmeyen yer tutucu boş basılır", () => {
    const saved = { fatura: { konu: "X {olmayan} Y", metin: "m" } };
    const { konu } = renderMailTemplate(saved, "fatura", vars);
    expect(konu).toBe("X  Y");
  });

  it("İngilizce anahtarların varsayılanları mevcut", () => {
    for (const k of ["teklifProformaEN", "makinaRaporuEN", "servisFormuEN", "fatura"]) {
      expect(DEFAULT_MAIL_TEMPLATES[k]?.konu).toBeTruthy();
      expect(DEFAULT_MAIL_TEMPLATES[k]?.metin).toBeTruthy();
    }
  });
});
