// Evrak çıktı şablonu testleri (src/lib/printTemplates.js).
// Regresyon: İngilizce proformada model yılı hiç görünmüyordu — EN proforma ayrı bir
// düzen (infoSectionEN) kullanıyor ve model yılı satırı yalnızca TR/teklif düzeninde vardı.
import { describe, it, expect } from "vitest";
import { buildPrintHtml, buildFaturaHtml } from "../src/lib/printTemplates";

const factory = { name: "Altuntaş Makina", evrakFirmaAdi: "ALTUNTAŞ MAKİNA", adres: "Eyüp / İstanbul", city: "İstanbul", country: "Türkiye", phone: "+90 212 000", email: "info@altunmak.com", web: "www.altunmak.com" };
const enProforma = (over = {}) => ({ type: "proforma", dil: "EN", currency: "EUR", firma: "ACME GmbH", satirlar: [], kdvOrani: "0", ...over });

describe("buildPrintHtml — İngilizce proforma model yılı", () => {
  it("doldurulan model yılı İngilizce proformada görünür", () => {
    const html = buildPrintHtml(enProforma({ modelYiliDegeri: "2023" }), factory);
    expect(html).toContain("Model Year");
    expect(html).toContain("2023");
  });

  it("boş bırakılınca varsayılan (New and Unused) görünür", () => {
    const html = buildPrintHtml(enProforma({ modelYiliDegeri: "" }), factory);
    expect(html).toContain("New and Unused");
  });

  it("alan gizlendiğinde hiç görünmez", () => {
    const cfg = { proforma: { hiddenFields: { belge: ["modelYiliDegeri"] } } };
    const html = buildPrintHtml(enProforma({ modelYiliDegeri: "2023" }), factory, {}, "", cfg);
    expect(html).not.toContain("Model Year");
  });
});

describe("FROM kutusu içeriği (EN proforma + yurt dışı fatura)", () => {
  it("EN proforma FROM kutusunda başlıklar + model yılı + kur var; web ve tarih satırı yok", () => {
    const html = buildPrintHtml(enProforma({ modelYiliDegeri: "2023", kur: "1 EUR = 38,50 TL", tarih: "2026-07-08" }), factory);
    expect(html).toContain(">FROM<");
    expect(html).toContain("COMPANY");
    expect(html).toContain("ADDRESS");
    expect(html).toContain("PHONE");
    expect(html).toContain("EMAIL");
    expect(html).toContain("Model Year"); // model yılı FROM kutusunda
    expect(html).toContain("2023");
    expect(html).toContain("Exchange Rate"); // kur FROM kutusunda
    expect(html).toContain("1 EUR = 38,50 TL");
    expect(html).not.toContain(">WEB<"); // web satırı yazılmaz
    expect(html).not.toContain("Date:"); // ayrı tarih şeridi kaldırıldı (tarih üstte)
  });

  it("EN proforma Delivery Point ayrı şeritte değil, FROM kutusunun içinde satır olarak", () => {
    const html = buildPrintHtml(enProforma({ teslimYeri: "FCA İstanbul" }), factory);
    expect(html).toContain("Delivery Point");
    expect(html).toContain("FCA İstanbul");
    // Eski davranış: kutuların altında ayrı bir "Delivery Point: X" şeridi vardı.
    expect(html).not.toContain("Delivery Point: <strong>");
  });

  it("yurt dışı fatura FROM kutusunda başlıklar var; web satırı yok", () => {
    const fatura = { no: "INV-1", tarih: "2026-07-08", currency: "USD", firma: "ACME GmbH", satirlar: [] };
    const html = buildFaturaHtml(fatura, factory, 1000, "");
    expect(html).toContain("COMPANY");
    expect(html).toContain("ADDRESS");
    expect(html).toContain("PHONE");
    expect(html).toContain("EMAIL");
    expect(html).not.toContain(">WEB<");
  });

  it("yurt dışı fatura, faturaFirmaAdi doluysa onu kullanır; boşsa evrak adına düşer", () => {
    const fatura = { no: "INV-1", tarih: "2026-07-08", currency: "USD", firma: "ACME GmbH", satirlar: [] };
    const ile = buildFaturaHtml(fatura, { ...factory, faturaFirmaAdi: "ALTUNMAK MACHINERY LTD." }, 1000, "");
    expect(ile).toContain("ALTUNMAK MACHINERY LTD.");
    const bosuz = buildFaturaHtml(fatura, { ...factory, faturaFirmaAdi: "" }, 1000, "");
    expect(bosuz).toContain("ALTUNTAŞ MAKİNA"); // evrakFirmaAdi'ye düşer
    expect(bosuz).not.toContain("ALTUNMAK MACHINERY LTD.");
  });

  it("yurt dışı fatura tutarları Türkçe biçimde (nokta binlik, virgül ondalık)", () => {
    const fatura = { no: "INV-1", tarih: "2026-07-08", currency: "USD", firma: "ACME GmbH",
      satirlar: [{ model: "AK100", adet: 1, birimFiyat: "100000" }] };
    const html = buildFaturaHtml(fatura, factory, 100000, "");
    expect(html).toContain("100.000,00");
    expect(html).not.toContain("100,000.00");
  });
});
