// @vitest-environment jsdom
// Spec 0149 AC-23 (triyaj bulgu 1): kendi eşleşmesini yazan her ekran ayrı bir iki kelimeli sorguyla davranıştan ölçülür. Alanı birden
// çok olan ekranlarda kelimeler farklı alanlarda durur (R2), tek alanlı ekranlarda iki kelime ters sırada (R1). Her testte bir kayıt
// eşleşir, kelimelerden yalnız birini taşıyan komşu kayıt eşleşmez; böylece alan listesinden bir alan düşerse ya da fazladan alan
// eklenirse test kırılır.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Analiz } from "../../src/components/Analiz";
import { Documents } from "../../src/components/Documents";
import { Finance } from "../../src/components/Finance";
import { UretimSatirEkleModal } from "../../src/components/stock/UretimSatirEkleModal";
import { KalemListesi } from "../../src/components/gider/DonemRaporu";
import { ModelsManager } from "../../src/components/ModelsManager";
import { PartStokTab } from "../../src/components/stock/PartStokTab";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
const yaz = (ph, v) => fireEvent.change(screen.getByPlaceholderText(ph), { target: { value: v } });
const var_ = (metin) => screen.queryAllByText(metin).length > 0;

describe("Spec 0149 AC-23: Stok › Yedek Parça Satışı", () => {
  // `customers` sabit verilir: bileşenin varsayılan `[]`'ı her çizimde yeni dizi olur ve aramada grupları açan efekti döndürür
  // (uygulamada Stock her zaman verir).
  const MUSTERI_YOK = [];
  it("alıcı adı ve kargo firması ayrı alanlarda: 'ege aras' yalnız o satışı bulur", () => {
    const satislar = [
      { id: 40, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 1, tarih: "2026-10-01", kargoFirma: "Aras Kargo", kargoTakipNo: "T-1", tahsisler: [] },
      { id: 41, aliciTipi: "bayi", dealerId: 4, partId: "8", miktar: 1, tarih: "2026-10-02", kargoFirma: "Aras Kargo", kargoTakipNo: "T-2", tahsisler: [] },
      { id: 42, aliciTipi: "bayi", dealerId: 3, partId: "8", miktar: 1, tarih: "2026-10-03", kargoFirma: "Yurtiçi Kargo", kargoTakipNo: "T-3", tahsisler: [] },
    ];
    render(<YedekParcaSatisTab yedekParcaSatislar={satislar} setYedekParcaSatislar={vi.fn()} dealers={[{ id: 3, name: "Ege Bayi" }, { id: 4, name: "Kuzey Bayi" }]}
      parts={[{ id: 7, ad: "Dişli" }, { id: 8, ad: "Rulman" }]} customers={MUSTERI_YOK} partStock={[]} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} showToast={vi.fn()} aktifKullanici="ben" />);
    yaz("Alıcı, parça, kargo no ile ara...", "aras ege");
    expect(var_(/T-1$/)).toBe(true); expect(var_(/T-2$/)).toBe(false); expect(var_(/T-3$/)).toBe(false);
    yaz("Alıcı, parça, kargo no ile ara...", "rulman t-3");
    expect(var_(/T-3$/)).toBe(true); expect(var_(/T-1$/)).toBe(false); expect(var_(/T-2$/)).toBe(false);
  });
});

describe("Spec 0149 AC-23: bayi detayının üç listesi", () => {
  const CUST = [{ id: 10, name: "Kutu Gıda", model: "AK100" }, { id: 11, name: "Lezzet Gıda", model: "AK100" }];
  const ciz = () => render(<SimpleDealers dealers={[{ id: 3, name: "Ege Servis", bayiMi: true, anlasmaliServisMi: true }]} setDealers={vi.fn()} factory={{ name: "Altuntaş" }} setFactory={vi.fn()}
    customers={CUST} showToast={vi.fn()} openDetailId={3} parts={[{ id: 7, ad: "Rulman" }, { id: 8, ad: "Dişli" }]}
    services={[
      { id: 100, customerId: 10, date: "2026-05-10", type: "Periyodik Bakım", islemFirma: "Ege Servis", tech: "Usta Ali" },
      { id: 101, customerId: 11, date: "2026-06-10", type: "Periyodik Bakım", islemFirma: "Ege Servis", tech: "Usta Veli" },
    ]}
    yedekParcaSatislar={[
      { id: 300, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 1, birimFiyat: 10, currency: "TRY", tarih: "2026-05-01", kargoTakipNo: "YP-A", odendi: true, tahsisler: [] },
      { id: 301, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: 10, currency: "TRY", tarih: "2026-05-02", kargoTakipNo: "YP-B", odendi: true, tahsisler: [] },
      { id: 302, aliciTipi: "bayi", dealerId: 3, partId: 8, miktar: 3, birimFiyat: 10, currency: "TRY", tarih: "2026-05-03", kargoTakipNo: "YP-A", odendi: true, tahsisler: [] },
    ]}
    partSales={[
      { id: 400, tur: "Kalıp", customerId: 10, ad: "Köfte Kalıbı", olcu: "Ø90", ucret: 1000, currency: "TRY", tarih: "2026-04-01", satisFirma: "Ege Servis", odendi: true },
      { id: 401, tur: "Kalıp", customerId: 11, ad: "Köfte Kalıbı", olcu: "Ø120", ucret: 1000, currency: "TRY", tarih: "2026-04-02", satisFirma: "Ege Servis", odendi: true },
    ]} />);
  const ara = (v) => yaz("Servis, yedek parça veya kalıp ara...", v);
  it("servis listesi: müşteri adı ve teknisyen ayrı alanlarda", () => {
    ciz(); ara("kutu ali");
    expect(var_(/Usta Ali/)).toBe(true); expect(var_(/Usta Veli/)).toBe(false);
  });
  it("yedek parça listesi: parça adı ve kargo takip numarası ayrı alanlarda", () => {
    ciz(); ara("yp-a rulman");
    const kartlar = screen.queryAllByText(/^📦/).map(e => e.textContent);
    expect(kartlar).toEqual(["📦 Rulman ×1"]);
  });
  it("kalıp listesi: müşteri adı ve kalıp ölçüsü ayrı alanlarda", () => {
    ciz(); ara("lezzet ø120");
    expect(var_(/Ø120/)).toBe(true); expect(var_(/Ø90/)).toBe(false);
  });
});

describe("Spec 0149 AC-23: Analiz parça seçicisi", () => {
  it("tek alan (ad), iki kelime ters sırada", () => {
    const services = [{ id: 100, customerId: 1, date: "2025-06-05", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", tech: "Ahmet",
      degisenParcalar: [{ partId: "1", miktar: 2 }, { partId: "2", miktar: 1 }] }];
    render(<Analiz customers={[{ id: 1, name: "Kutu", model: "AK100" }]} services={services} partSales={[]} yedekParcaSatislar={[]} appSettings={{}}
      parts={[{ id: 1, ad: "AYNA MAHRUTİ DİŞLİSİ" }, { id: 2, ad: "AYNA RULMANI" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Tüm zamanlar" }));
    fireEvent.click(screen.getByRole("button", { name: "Parça seç" }));
    yaz("Parça ara...", "dişlisi ayna");
    const liste = screen.getByPlaceholderText("Parça ara...").parentElement.nextElementSibling;
    expect(within(liste).queryAllByText(/AYNA MAHRUTİ DİŞLİSİ/).length).toBe(1); expect(within(liste).queryAllByText(/AYNA RULMANI/)).toHaveLength(0);
  });
});

describe("Spec 0149 AC-23: Evrak", () => {
  const T = (id, no, firma, ek = {}) => ({ id, type: "teklif", no, tarih: "2026-09-20", createdAt: `2026-09-20T0${id % 10}:00`, dil: "TR", currency: "TRY", durum: "taslak", firma, satirlar: [], ...ek });
  const F = (id, no, firma) => ({ id, no, tarih: "2026-09-20", firma, currency: "USD", satirlar: [] });
  function Evrak({ teklifler0 = [], faturalar = [] }) {
    const [teklifler, setTeklifler] = useState(teklifler0);
    return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={faturalar} setFaturalar={vi.fn()} partSales={[]}
      customers={[{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-500" }, { id: 501, name: "Kutu Pasta", model: "AK100", serialNo: "S-501" }, { id: 502, name: "Lezzet Gıda", serialNo: "S-502" }]}
      allModels={[]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={[]} parts={[]}
      geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[{ id: 3, name: "Ege Makina Bayi" }, { id: 4, name: "Ege Servis" }]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
  }
  it("teklif listesi (searchFn): firma ve belge no ayrı alanlarda", () => {
    render(<Evrak teklifler0={[T(901, "2026-00001", "Kutu Gıda"), T(902, "2026-00002", "Kutu Gıda"), T(903, "2026-00003", "Lezzet Gıda")]} />);
    yaz("Firma adı veya belge no ara...", "kutu 00002");
    expect(var_("2026-00002")).toBe(true); expect(var_("2026-00001")).toBe(false); expect(var_("2026-00003")).toBe(false);
  });
  it("yurt dışı fatura listesi: firma ve fatura no ayrı alanlarda", () => {
    render(<Evrak faturalar={[F(1, "INV-001", "Kutu Gıda"), F(2, "INV-002", "Kutu Gıda"), F(3, "INV-003", "Lezzet Gıda")]} />);
    fireEvent.click(screen.queryByRole("button", { name: "Yurt Dışı Fatura" }) || screen.getByRole("tab", { name: "Yurt Dışı Fatura" }));
    yaz("Firma adı veya fatura no ara...", "gıda inv-003");
    expect(var_("INV-003")).toBe(true); expect(var_("INV-001")).toBe(false); expect(var_("INV-002")).toBe(false);
  });
  it("teklif formunun müşteri araması (tek alan) iki kelimeyle", () => {
    render(<Evrak teklifler0={[T(901, "2026-00001", "Eski Firma")]} />);
    fireEvent.click(screen.getByText("2026-00001").closest("tr"));
    yaz("Mevcut müşteriden ara (firma adı)...", "gıda kutu");
    expect(var_("Kutu Gıda")).toBe(true); expect(var_("Kutu Pasta")).toBe(false); expect(var_("Lezzet Gıda")).toBe(false);
  });
  it("bayi alıcı araması (tek alan) ve nihai müşteri araması (ad ve seri no ayrı alanlarda)", () => {
    render(<Evrak teklifler0={[T(901, "2026-00001", "Eski Firma")]} />);
    fireEvent.click(screen.getByText("2026-00001").closest("tr"));
    fireEvent.click(screen.getByText("Alıcı: Bayi"));
    fireEvent.change(screen.getByLabelText("Bayi ara"), { target: { value: "bayi ege" } });
    expect(var_("Ege Makina Bayi")).toBe(true); expect(var_("Ege Servis")).toBe(false);
    fireEvent.click(screen.getByText("Ege Makina Bayi"));
    fireEvent.change(screen.getByLabelText("Nihai müşteri ara"), { target: { value: "kutu s-501" } });
    const kutu = within(screen.getByTestId("bayi-alici"));
    expect(kutu.queryAllByText("Kutu Pasta").length).toBeGreaterThan(0); expect(kutu.queryAllByText("Kutu Gıda")).toHaveLength(0);
  });
});

describe("Spec 0149 AC-23: Finans'ın iki detay penceresi", () => {
  const FAB = { name: "Altuntaş Makina" };
  const MUS = [{ id: 1, name: "Kutu Gıda", model: "AK100", currency: "TRY", installDate: "2026-10-01", faturali: "Faturalı Yurtiçi", kalanBorc: 0 },
    { id: 2, name: "Lezzet Gıda", model: "AK100", currency: "TRY", installDate: "2026-10-01", faturali: "Faturalı Yurtiçi", kalanBorc: 0 }];
  const ac = (veri) => render(<Finance customers={MUS} dealers={[{ id: 7, name: "Ege Bayi" }, { id: 8, name: "Kuzey Bayi" }]} factory={FAB} rates={{ USD: 30, EUR: 33 }}
    teklifler={[]} serverPermissions={null} services={[]} partSales={[]} yedekParcaSatislar={[]} payments={[]} {...veri} />);
  const sv = (id, customerId, islemFirma) => ({ id, customerId, date: new Date().toISOString().slice(0, 10), type: "Garanti Dışı", islemFirma, servisUcreti: "1000", currency: "TRY",
    faturaTipi: "Faturalı Yurtiçi", parcaUcreti: "500", parcaCurrency: "TRY", parcaUcretsizMi: false, odendi: true, yontem: "Nakit" });
  it("anlaşmalı servis penceresi: müşteri firma ve servis firması ayrı alanlarda", () => {
    ac({ services: [sv(71, 1, "Ege Bayi"), sv(72, 1, "Kuzey Bayi"), sv(73, 2, "Ege Bayi")] });
    fireEvent.click(screen.getByText("Tahsil Edilen Anlaşmalı Servis Parçası").parentElement);
    yaz("Müşteri firma veya servis firması ara...", "kutu ege");
    expect(screen.getAllByTestId("anlasmali-tahsil")).toHaveLength(1);
    const satir = screen.getAllByTestId("anlasmali-tahsil")[0].closest("tr");
    expect(satir.textContent).toMatch(/Kutu Gıda/); expect(satir.textContent).toMatch(/Ege Bayi/);
  });
  it("kredi kartı penceresi: firma ve kaynak ayrı alanlarda", () => {
    const bugun = new Date().toISOString().slice(0, 10);
    ac({
      partSales: [{ id: 20, customerId: 1, tur: "Kalıp", tarih: bugun, ucret: 30000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", yontem: "Kredi Kartı", odendi: true }],
      payments: [{ id: 30, customerId: 1, tarih: bugun, tutar: 120000, currency: "TRY", yontem: "Kredi Kartı" }, { id: 31, customerId: 2, tarih: bugun, tutar: 50000, currency: "TRY", yontem: "Kredi Kartı" }],
    });
    fireEvent.click(screen.getByText("Toplam Kredi Kartı ile Satış").closest("[title='Detay için tıklayın']"));
    yaz("Firma veya kaynak ara...", "kutu makina");
    expect(var_("Makina ödemesi")).toBe(true); expect(var_("Extra kalıp")).toBe(false); expect(var_("Lezzet Gıda")).toBe(false);
  });
});

describe("Spec 0149 AC-23: Manuel Satır Ekle müşteri araması", () => {
  it("tek alan (ad), iki kelime ters sırada; Türkçe küçültme", () => {
    render(<UretimSatirEkleModal customers={[{ id: 1, name: "ANADOLU KÖFTE EVİ" }, { id: 2, name: "ANADOLU PİDE" }]} kalipDefs={[]} onClose={vi.fn()} onAdd={vi.fn()} />);
    yaz("Firma ara...", "köfte anadolu");
    expect(var_("ANADOLU KÖFTE EVİ")).toBe(true); expect(var_("ANADOLU PİDE")).toBe(false);
  });
});

describe("Spec 0149 AC-23: Dönem Raporu kalem süzgeci", () => {
  it("açıklama ve tedarikçi ayrı alanlarda", () => {
    const k = (id, aciklama, tedarikciId) => ({ id, tarih: "2026-09-10", turId: 1, tutar: 1000, kdvOrani: 20, aciklama, tedarikciId, odendi: false });
    render(<KalemListesi kalemler={[k(1, "Araç yakıtı", 5), k(2, "Araç yakıtı", 6), k(3, "Ofis kırtasiye", 5)]} giderTurleri={[{ id: 1, ad: "Genel", davranis: "normal" }]}
      tedarikciler={[{ id: 5, ad: "Opet" }, { id: 6, ad: "Shell" }]} bugun="2026-09-24" canDo={() => true} onDuzenle={vi.fn()} onSil={vi.fn()} onOdendi={vi.fn()} />);
    yaz("Açıklama, çalışan, tedarikçi ara", "yakıtı opet");
    const satirlar = screen.queryAllByText("Araç yakıtı");
    expect(satirlar).toHaveLength(1); expect(satirlar[0].closest("tr").textContent).toMatch(/Opet/);
    expect(var_("Ofis kırtasiye")).toBe(false);
  });
});

describe("Spec 0149 AC-23: Makina Modelleri (searchFn)", () => {
  it("tek alan (model), iki kelime", () => {
    render(<ModelsManager standardModels={[{ model: "AK100 DSC" }, { model: "AK100 STD" }, { model: "AK120 DSC" }]} setStandardModels={vi.fn()} customModels={[]} setCustomModels={vi.fn()}
      setCustomers={vi.fn()} setStock={vi.fn()} showToast={vi.fn()} appSettings={{}} setAppSettings={vi.fn()} />);
    yaz("Model ara...", "dsc ak100");
    expect(var_("AK100 DSC")).toBe(true); expect(var_("AK100 STD")).toBe(false); expect(var_("AK120 DSC")).toBe(false);
  });
});

describe("Spec 0149 AC-23: Parça Stoğu (searchFn)", () => {
  it("parça adı ve model işareti ayrı alanlarda", () => {
    const P = [{ id: 7, ad: "Rulman", models: ["AK100"] }, { id: 8, ad: "Rulman Kapağı", models: ["AK120"] }, { id: 9, ad: "Dişli", models: ["AK100"] }];
    render(<PartStokTab parts={P} rawParts={P} partStock={[]} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} showToast={vi.fn()} canDoStock={() => true} aktifKullanici="ben" />);
    yaz("Parça adı veya model ara...", "rulman ak100");
    expect(var_("Rulman")).toBe(true); expect(var_("Rulman Kapağı")).toBe(false); expect(var_("Dişli")).toBe(false);
  });
});
