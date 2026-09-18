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

describe("buildPrintHtml — proforma no (yurt dışı fatura gibi)", () => {
  it("Türkçe proformada 'Proforma No' + numara görünür", () => {
    const html = buildPrintHtml({ type: "proforma", dil: "TR", currency: "TRY", firma: "ACME Ltd.", satirlar: [], kdvOrani: "0", no: "2026-00042" }, factory);
    expect(html).toContain("Proforma No");
    expect(html).toContain("2026-00042");
  });

  it("İngilizce proformada 'Proforma No' + numara görünür", () => {
    const html = buildPrintHtml(enProforma({ no: "2026-00099" }), factory);
    expect(html).toContain("Proforma No");
    expect(html).toContain("2026-00099");
  });

  it("teklifte etiket hâlâ 'Teklif No' (proforma etiketine dönmedi)", () => {
    const html = buildPrintHtml({ type: "teklif", dil: "TR", currency: "TRY", firma: "ACME", satirlar: [], kdvOrani: "0", no: "2026-00007" }, factory);
    expect(html).toContain("Teklif No");
    expect(html).not.toContain("Proforma No");
    expect(html).toContain("2026-00007");
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
    expect(html).toContain("BAKIM ONARIM VERİLEN FİRMALAR");
    expect(html).toContain("EXTRA KALIP ALAN FİRMALAR");
    expect(html).toContain("KİMDEN TAHSİL EDİLDİ");
    expect(html).toContain("BORÇLU FİRMALAR");
    expect(html).toContain("VERİLEN TEKLİFLER");
    expect(html).toContain("Acar Metal");
    expect(html).toContain("300.000"); // teklif tutarı
  });

  it("tahsilat açıklaması (bu ay giren para) raporda yer alır", () => {
    expect(html).toContain("giren paradır");
    expect(html).toContain("çekler ancak tahsil edildiklerinde");
  });

  it("boş detay dizileri için tablo başlığı basılmaz", () => {
    expect(html).not.toContain("YEDEK PARÇA ALAN FİRMALAR"); // fixture'da yedek parça yok
    expect(html).not.toContain("ANLAŞMALI SERVİSLERE PARÇA"); // anlaşmalı parça yok
  });

  it("özet (Bu Ayın Özeti) + KDV beyanname özeti + bölüm başlıkları render edilir", () => {
    expect(html).toContain("BU AYIN ÖZETİ");
    expect(html).toContain("Bu ay giren para (tahsilat)");
    expect(html).toContain("Açık alacak (tahsil edilecek)");
    expect(html).toContain("KDV ÖZETİ (beyanname için)");
    expect(html).toContain("BU AY DOĞAN TOPLAM KDV");
    expect(html).toContain("MAKİNA SATIŞLARI");
    expect(html).toContain("BAKIM ONARIM GELİRLERİ");
    expect(html).toContain("YEDEK PARÇA SATIŞLARI");
    expect(html).toContain("TAHSİLAT — BU AY GİREN PARA");
    expect(html).toContain("AÇIK ALACAKLAR (tahsil edilecek)");
    // Özet kutularının içinde kaynak kırılımı (nereden geldi / ne için)
    expect(html).toContain("nereden geldi");
    expect(html).toContain("ne için");
    expect(html).toContain("Makina ödemesi"); // tahsilat kaynağı
    expect(html).toContain("Makina bakiyesi"); // alacak kaynağı
    // Üst özet tahsilat kutusu net/KDV/toplam ayrı; detaylı bölümler KDV dahil etiketli
    expect(html).toContain("Net (KDV hariç)");
    expect(html).toContain("Toplam (KDV dahil)");
    expect(html).toContain("Gerçekleşen tahsilat (KDV dahil)");
    expect(html).toContain("Toplam açık alacak (KDV dahil)");
    // Seçilen ay rozeti ay adını gösterir
    expect(html).toContain("Haziran 2026");
  });

  it("ciro tamamen kaldırıldı; fatura tipi / onarım yeri / yaşlandırma kırılımları var; komisyon yoksa gizli", () => {
    expect(html).not.toContain("ciro");
    expect(html).not.toContain("CİRO");
    expect(html).toContain("FATURA TİPİ KIRILIMI");
    expect(html).toContain("ONARIM YERİ KIRILIMI");
    expect(html).toContain("YAŞLANDIRMA (borcun yaşına göre)"); // Acar Metal'in açık borcu var
    expect(html).not.toContain("ÖDENEN BANKA KOMİSYONU"); // fixture'da kredi kartı yok → gizli
  });

  it("ücretsiz servis 'Ücretsiz' etiketlenir; servis kaydı satırı ücretli/ücretsiz ayrımı gösterir", () => {
    expect(html).toContain("1 ücretli · 0 ücretsiz"); // ana fixture: 1 ücretli servis
    const veriU = {
      customers: [{ id: 1, name: "U", currency: "TRY", kalanBorc: 0 }],
      services: [{ id: 90, customerId: 1, date: "2026-06-12", type: "Garanti İçi", servisUcreti: 0, currency: "TRY", islemFirma: "Altuntaş Makina", odendi: true }],
      partSales: [], payments: [], teklifler: [],
    };
    const ru = hesaplaAylikRapor(veriU, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } });
    const htmlU = buildAylikRaporHtml(ru, { name: "Altuntaş Makina" });
    expect(htmlU).toContain("Ücretsiz");          // Durum kolonu
    expect(htmlU).toContain("0 ücretli · 1 ücretsiz"); // servis kaydı satırı
  });

  it("üst kutu: servis kaynağı 'Tahsil edilen bakım onarım (N)' olarak etiketlenir; kırılım başlığı KDV hariç der", () => {
    expect(html).toContain("nereden geldi (KDV hariç)"); // statik başlık, her raporda
    // Ödenmiş ücretli bir servis → tahsilat kaynağında "Tahsil edilen bakım onarım (1)" görünür
    const veriT = {
      customers: [{ id: 1, name: "T", currency: "TRY", kalanBorc: 0 }],
      services: [{ id: 95, customerId: 1, date: "2026-06-12", type: "Garanti Dışı", servisUcreti: 10000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", odendi: true }],
      partSales: [], payments: [], teklifler: [],
    };
    const rt = hesaplaAylikRapor(veriT, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } });
    const htmlT = buildAylikRaporHtml(rt, { name: "Altuntaş Makina" });
    expect(htmlT).toContain("Tahsil edilen bakım onarım (1)");
    expect(htmlT).not.toContain("Bakım onarım (1)"); // eski belirsiz etiket artık yok
  });

  it("sahipsiz kayıt varsa raporun altına not düşülür, yoksa not yok", () => {
    const veriS = {
      customers: [{ id: 1, name: "Var", currency: "TRY", kalanBorc: 0 }],
      services: [{ id: 2, customerId: 999, date: "2026-06-11", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: "Altuntaş Makina", odendi: true }],
      partSales: [], payments: [], teklifler: [],
    };
    const rs = hesaplaAylikRapor(veriS, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } });
    const htmlS = buildAylikRaporHtml(rs, { name: "Altuntaş Makina" });
    expect(htmlS).toContain("<b>1</b> sahipsiz kayıt");
    expect(htmlS).toContain("Sahipsiz Kayıtlar");
    expect(html).not.toContain("sahipsiz kayıt"); // ana fixture'da yok
  });

  it("kredi kartı blokajında bekleyenler AÇIK ALACAKLAR altında tablo + satır olarak görünür", () => {
    const veriK = {
      customers: [{ id: 1, name: "BlokeFirma", currency: "TRY", kalanBorc: 0 }],
      services: [{ id: 96, customerId: 1, date: "2026-06-13", type: "Garanti Dışı", servisUcreti: 10000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { blokajGun: 40, hesabaGecis: "2099-09-22", toplamKesinti: 0 } }],
      partSales: [], payments: [], teklifler: [],
    };
    const rk = hesaplaAylikRapor(veriK, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } });
    const htmlK = buildAylikRaporHtml(rk, { name: "Altuntaş Makina" });
    expect(htmlK).toContain("KREDİ KARTI BLOKAJINDA BEKLEYENLER");
    expect(htmlK).toContain("Kredi kartı blokajında bekleyen");
    expect(htmlK).toContain("22.09.2099");                         // hesaba geçiş tarihi
    expect(htmlK).toContain("bunun KK blokajında");                 // üst alacak kutusu satırı
    expect(html).not.toContain("KREDİ KARTI BLOKAJINDA BEKLEYENLER"); // ana fixture'da KK yok → gizli
    // Bakım onarım detay tablosunda Durum: kredi kartıyla ödendiği ve blokajda olduğu belirtilir
    expect(htmlK).toContain("Ödendi · Kredi Kartı (blokajda, hesaba geçiş 22.09.2099)");
    // Blokajı geçmiş KK: yöntem yine görünür ama blokaj notu yok
    const rkG = hesaplaAylikRapor({ ...veriK, services: [{ ...veriK.services[0], kartKomisyonu: { blokajGun: 40, hesabaGecis: "2020-01-01", toplamKesinti: 0 } }] }, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } });
    const htmlG = buildAylikRaporHtml(rkG, { name: "Altuntaş Makina" });
    expect(htmlG).toContain("Ödendi · Kredi Kartı<");
    expect(htmlG).not.toContain("blokajda, hesaba geçiş");
  });

  it("yedek parça (kargo) satışları: satır + firma firma detay tablosu render edilir", () => {
    const kargoVeri = {
      customers: [{ id: 1, name: "Müş A", currency: "TRY", kalanBorc: 0 }],
      services: [], partSales: [], payments: [], teklifler: [],
      dealers: [{ id: 5, name: "Bayi X" }],
      yedekParcaSatislar: [
        { id: 70, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 2, birimFiyat: 1000, currency: "TRY", tarih: "2026-06-10", faturaTipi: "Faturalı Yurtiçi", odendi: true, kargoDurum: "Kargoya Verildi" },
        { id: 71, aliciTipi: "bayi", dealerId: 5, partId: "8", miktar: 3, birimFiyat: 500, currency: "TRY", tarih: "2026-06-12", faturaTipi: "Faturalı Yurtiçi", odendi: false, fabrikaTeslim: true, kargoDurum: "Hazırlanıyor" },
        { id: 72, aliciTipi: "bayi", disFirma: true, disFirmaAd: "Harici Ltd", partId: "8", miktar: 1, birimFiyat: 100, currency: "TRY", tarih: "2026-06-14", faturaTipi: "Faturasız Yurtiçi", odendi: false },
      ],
    };
    const rk = hesaplaAylikRapor(kargoVeri, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } });
    const htmlK = buildAylikRaporHtml(rk, { name: "Altuntaş Makina" });
    expect(htmlK).toContain("YEDEK PARÇA SATIŞLARI");             // bölüm başlığı
    expect(htmlK).toContain("YEDEK PARÇA ALAN FİRMALAR");         // firma firma detay
    expect(htmlK).toContain("Bayi X");
    expect(htmlK).toContain("Müş A");
    expect(htmlK).toContain("Anlaşmasız Servis");                 // dış firma türü etiketi
    expect(htmlK).toContain("Harici Ltd");
    expect(htmlK).toContain("TESLİM ŞEKLİ KIRILIMI");             // teslim şekli kırılım tablosu
    expect(htmlK).toContain("Fabrika Teslim");                     // teslim kolonu değeri
  });

  it("tahsilat yöntem kırılımı raporda gösterilir (Nakit/Havale ayrı satır)", () => {
    const odemeVeri = {
      customers: [{ id: 1, name: "Müş A", currency: "TRY", kalanBorc: 0 }],
      services: [], partSales: [], teklifler: [],
      payments: [
        { id: 30, customerId: 1, tarih: "2026-06-08", tutar: 100000, currency: "TRY", yontem: "Nakit" },
        { id: 31, customerId: 1, tarih: "2026-06-09", tutar: 250000, currency: "TRY", yontem: "Havale" },
      ],
    };
    const ro = hesaplaAylikRapor(odemeVeri, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } });
    const htmlO = buildAylikRaporHtml(ro, { name: "Altuntaş Makina" });
    expect(htmlO).toContain("YÖNTEM KIRILIMI");
    expect(htmlO).toContain("Havale");
    expect(htmlO).toContain("250.000");
  });

  it("çok dövizli tutarlar her para biriminde ayrı gösterilir", () => {
    const veriTL = {
      customers: [
        { id: 1, name: "Yerli", model: "AK100", installDate: "2026-06-10", currency: "TRY", fabrikaSatisBedeli: 500000, faturaBedeli: 500000, faturali: "Faturalı Yurtiçi", kalanBorc: 0 },
        { id: 2, name: "İhracat", model: "AK140", installDate: "2026-06-12", currency: "EUR", fabrikaSatisBedeli: 10000, faturali: "Faturalı Yurtdışı", kalanBorc: 0 },
      ],
      services: [], partSales: [], payments: [], teklifler: [],
    };
    const raporTL = hesaplaAylikRapor(veriTL, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" }, rates: { usd: 40, eur: 45 } });
    const htmlTL = buildAylikRaporHtml(raporTL, { name: "Altuntaş Makina" });
    // Makina satışları başlığı her para birimini ayrı gösterir (birleşik ciro/≈ TL kaldırıldı)
    expect(htmlTL).toContain("500.000 TL"); // TRY raporda TL olarak gösterilir
    // Rakam ile "TL" aynı satırda kalır: her tutar nowrap span içinde (dar sütunda alt satıra düşmesin)
    expect(htmlTL).toContain('<span style="white-space:nowrap">500.000 TL</span>');
    expect(htmlTL).not.toMatch(/\d TL(?!<\/span>)/); // span dışında çıplak "rakam TL" kalmadı
    expect(htmlTL).toContain("10.000 EUR");
  });
});
