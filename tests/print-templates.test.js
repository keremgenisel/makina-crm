// Evrak çıktı şablonu testleri (src/lib/printTemplates.js).
// Regresyon: İngilizce proformada model yılı hiç görünmüyordu — EN proforma ayrı bir
// düzen (infoSectionEN) kullanıyor ve model yılı satırı yalnızca TR/teklif düzeninde vardı.
import { describe, it, expect } from "vitest";
import { buildPrintHtml, buildFaturaHtml, buildAylikRaporHtml } from "../src/lib/printTemplates";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";

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

describe("buildPrintHtml — belge-belge çeviri (teklif/proforma namespace)", () => {
  const teklif = (over = {}) => ({ type: "teklif", dil: "TR", currency: "TRY", firma: "X", satirlar: [], kdvOrani: "20", ...over });
  it("teklif kendi namespace başlığını kullanır", () => {
    const html = buildPrintHtml(teklif(), factory, { teklif: { TR: { titleTeklif: "OZEL_TEKLIF_BASLIGI" } } });
    expect(html).toContain("OZEL_TEKLIF_BASLIGI");
  });
  it("proforma teklif namespace'inden etkilenmez, kendi başlığını kullanır", () => {
    const html = buildPrintHtml(enProforma(), factory, { teklif: { EN: { titleTeklif: "SIZAN_TEKLIF" } }, proforma: { EN: { titleProforma: "OZEL_PROFORMA" } } });
    expect(html).toContain("OZEL_PROFORMA");
    expect(html).not.toContain("SIZAN_TEKLIF");
  });
  it("geriye dönük: eski düz TR havuzu hâlâ uygulanır (namespace yoksa)", () => {
    const html = buildPrintHtml(teklif(), factory, { TR: { titleTeklif: "ESKI_DUZ_BASLIK" } });
    expect(html).toContain("ESKI_DUZ_BASLIK");
  });
  it("namespace düz havuzun üstüne biner (öncelik namespace)", () => {
    const html = buildPrintHtml(teklif(), factory, { TR: { titleTeklif: "DUZ" }, teklif: { TR: { titleTeklif: "NAMESPACE_KAZANIR" } } });
    expect(html).toContain("NAMESPACE_KAZANIR");
    expect(html).not.toContain(">DUZ<");
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

  it("paketleme notu: varsayılan görünür, paketlemeNot bölümünde gizlenince gizli, eski paketleme gizlemesi de geçerli", () => {
    const fatura = { no: "INV-1", tarih: "2026-07-08", currency: "USD", firma: "ACME GmbH", satirlar: [], not: "GIZLI_NOT_XYZ" };
    // Varsayılan: not görünür
    expect(buildFaturaHtml(fatura, factory, 1000, "")).toContain("GIZLI_NOT_XYZ");
    // Yeni bölüm (paketlemeNot) altında gizlenince görünmez
    expect(buildFaturaHtml(fatura, factory, 1000, "", "", {}, { hiddenFields: { paketlemeNot: ["not"] } })).not.toContain("GIZLI_NOT_XYZ");
    // Göç öncesi eski kayıt: not "paketleme" altında gizliyse hâlâ gizli kalır (geriye dönük)
    expect(buildFaturaHtml(fatura, factory, 1000, "", "", {}, { hiddenFields: { paketleme: ["not"] } })).not.toContain("GIZLI_NOT_XYZ");
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

describe("buildAylikRaporHtml — firma firma detay tabloları", () => {
  const kdvRates = [{ from: "2000-01-01", rate: 20 }];
  const veri = {
    customers: [{ id: 1, name: "Acar Metal", model: "AK100", installDate: "2026-06-10", currency: "TRY", fabrikaSatisBedeli: 500000, faturaBedeli: 500000, faturali: "Faturalı Yurtiçi", kalanBorc: 120000 }],
    services: [{ id: 10, customerId: 1, date: "2026-06-12", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", odendi: false }],
    partSales: [{ id: 20, customerId: 1, tur: "Kalıp", tarih: "2026-06-05", ucret: 25000, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", odendi: true }],
    payments: [{ id: 30, customerId: 1, tarih: "2026-06-08", tutar: 200000, currency: "TRY", yontem: "Nakit" }],
    teklifler: [{ id: 40, type: "teklif", tarih: "2026-06-02", durum: "gonderildi", firma: "Acar Metal", currency: "TRY", satirlar: [{ subItems: [{ birimFiyat: "300000", miktar: 1 }] }] }],
  };
  const rapor = hesaplaAylikRapor(veri, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } });
  const html = buildAylikRaporHtml(rapor, { name: "Altuntaş Makina" });

  it("her bölümün firma firma detay başlıkları ve firma adı render edilir", () => {
    expect(html).toContain("SATILAN MAKİNALAR");
    expect(html).toContain("SERVİS VERİLEN FİRMALAR");
    expect(html).toContain("EXTRA KALIP ALAN FİRMALAR");
    expect(html).toContain("KİMDEN TAHSİL EDİLDİ");
    expect(html).toContain("BORÇLU FİRMALAR");
    expect(html).toContain("VERİLEN TEKLİFLER");
    expect(html).toContain("Acar Metal");
    expect(html).toContain("300.000"); // teklif tutarı
  });

  it("gerçekleşen tahsilat açıklaması (sadece borçlulardan değil) raporda yer alır", () => {
    expect(html).toContain("Gerçekleşen tahsilat nedir?");
    expect(html).toContain("Sadece borçlulardan değil");
  });

  it("boş detay dizileri için tablo başlığı basılmaz", () => {
    expect(html).not.toContain("YEDEK PARÇA ALAN FİRMALAR"); // fixture'da yedek parça yok
    expect(html).not.toContain("ANLAŞMALI SERVİSLERE PARÇA"); // anlaşmalı parça yok
  });

  it("yönetici özeti ve KDV beyanname özeti kutuları raporda yer alır", () => {
    expect(html).toContain("YÖNETİCİ ÖZETİ");
    expect(html).toContain("Toplam ciro (net, KDV hariç)");
    expect(html).toContain("Gerçekleşen tahsilat");
    expect(html).toContain("KDV ÖZETİ (beyanname)");
    expect(html).toContain("BU AY DOĞAN TOPLAM KDV");
  });

  it("rates verilince özet ≈ TL toplamı gösterir (çok dövizli veri)", () => {
    const veriTL = {
      customers: [
        { id: 1, name: "Yerli", model: "AK100", installDate: "2026-06-10", currency: "TRY", fabrikaSatisBedeli: 500000, faturaBedeli: 500000, faturali: "Faturalı Yurtiçi", kalanBorc: 0 },
        { id: 2, name: "İhracat", model: "AK140", installDate: "2026-06-12", currency: "EUR", fabrikaSatisBedeli: 10000, faturali: "Faturalı Yurtdışı", kalanBorc: 0 },
      ],
      services: [], partSales: [], payments: [], teklifler: [],
    };
    const raporTL = hesaplaAylikRapor(veriTL, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" }, rates: { usd: 40, eur: 45 } });
    const htmlTL = buildAylikRaporHtml(raporTL, { name: "Altuntaş Makina" });
    // 500.000 TRY + 10.000 EUR × 45 = 950.000 TL yaklaşık
    expect(htmlTL).toContain("≈ 950.000 TL");
  });
});
