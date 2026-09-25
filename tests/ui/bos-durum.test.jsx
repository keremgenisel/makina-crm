// @vitest-environment jsdom
// Spec 0016 (plan G1, §5): kayıt bulunmayan durumların davranışı. Dönüşümden ÖNCE bugünkü koda yazıldı ve yeşildi;
// dönüşümden sonra da aynı kalmalı. Metinler cümle cümle desenle sorgulanır (G1: iki cümleli metin kutuda başlık ve
// açıklama olarak bölünür, kelimeler aynı kalır).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Stock } from "../../src/components/Stock";
import { Finance } from "../../src/components/Finance";
import { Documents } from "../../src/components/Documents";
import { Notes } from "../../src/components/Notes";
import { Analiz } from "../../src/components/Analiz";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const var_ = (re) => screen.queryAllByText(re).length > 0;
const say = (re) => screen.queryAllByText(re).length;
const ara = (ph, v) => fireEvent.change(screen.getByPlaceholderText(ph), { target: { value: v } });
const dugme = (ad) => screen.queryByRole("button", { name: ad }) || screen.getByRole("tab", { name: ad });

describe("Müşteriler", () => {
  const M = [{ id: 1, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", installDate: "2025-01-01" }];
  it("AC-3: arama sonucu boşsa 'Müşteri bulunamadı.'", () => {
    render(<Customers customers={M} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} />);
    expect(var_(/Müşteri bulunamadı\./)).toBe(false);
    ara("Müşteri ara...", "zzz");
    expect(var_(/Müşteri bulunamadı\./)).toBe(true);
  });
  it("AC-3: süzgeç sonucu boşsa 'Müşteri bulunamadı.'", () => {
    render(<Customers customers={M} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} />);
    fireEvent.click(dugme("Seri No Bekleyen (0)"));
    expect(var_(/Müşteri bulunamadı\./)).toBe(true);
  });
});

describe("Bayiler listesi", () => {
  it("AC-2: ayrım yok, tek metin: hiç bayi yokken ve arama boşken 'Bayi bulunamadı.'", () => {
    const ciz = (d) => render(<SimpleDealers dealers={d} setDealers={vi.fn()} factory={{ name: "Altuntaş" }} setFactory={vi.fn()} partSales={[]} services={[]} customers={[]} showToast={vi.fn()} />);
    ciz([]);
    expect(var_(/Bayi bulunamadı\./)).toBe(true);
    cleanup();
    ciz([{ id: 3, name: "Ege Bayi", bayiMi: true }]);
    expect(var_(/Bayi bulunamadı\./)).toBe(false);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "zzz" } });
    expect(var_(/Bayi bulunamadı\./)).toBe(true);
  });
});

const STOK = (o = {}) => render(<Stock factory={{ name: "A" }} stock={[]} setStock={vi.fn()} customers={[]} setCustomers={vi.fn()} parts={[]} dealers={[]} {...o} />);

describe("Stok", () => {
  it("AC-3: Makina Stoğu: hiç kayıt yok / aramaya uyan yok ayrımı", () => {
    STOK();
    expect(var_(/Stokta makina yok\./)).toBe(true);
    cleanup();
    STOK({ stock: [{ id: 5, model: "AK100", serialNo: "S-9", addedDate: "2026-01-01" }] });
    expect(var_(/Stokta makina yok|Aramanıza uyan makina yok/)).toBe(false);
    ara("Model veya seri no ara...", "zzz");
    expect(var_(/Aramanıza uyan makina yok\./)).toBe(true);
    expect(var_(/Stokta makina yok/)).toBe(false);
  });
  it("AC-3: Parça Stoğu: tanım yok / arama sonucu yok ayrımı", () => {
    STOK({ defaultSubTab: "parca" });
    expect(var_(/Henüz yedek parça tanımı yok\./)).toBe(true);
    expect(var_(/Ayarlar → Yedek Parça'dan ekleyin\./)).toBe(true);
    cleanup();
    STOK({ defaultSubTab: "parca", parts: [{ id: 7, ad: "Rulman" }], partStock: [{ partId: 7, miktar: 10 }] });
    expect(var_(/Arama sonucu bulunamadı\./)).toBe(false);
    ara("Parça adı veya model ara...", "zzz");
    expect(var_(/Arama sonucu bulunamadı\./)).toBe(true);
    expect(var_(/Henüz yedek parça tanımı yok/)).toBe(false);
  });
  it("AC-3: Yedek Parça Satışı: üç durum", () => {
    STOK({ defaultSubTab: "yedeksatis" });
    expect(var_(/Henüz yedek parça satışı yok\./)).toBe(true);
    expect(var_(/"Yeni Satış" ile ekleyin\./)).toBe(true);
    cleanup();
    const YP = [{ id: 1, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 1, birimFiyat: 10, currency: "TRY", tarih: "2026-09-02", faturaTipi: "Faturasız Yurtiçi", odendi: true, tahsisler: [{ miktar: 1, makinaSerbest: "X", tarih: "2026-09-03" }] }];
    STOK({ defaultSubTab: "yedeksatis", yedekParcaSatislar: YP, parts: [{ id: 7, ad: "Rulman" }], dealers: [{ id: 3, name: "Ege Bayi" }] });
    fireEvent.click(dugme("Tahsisi eksik (0)"));
    expect(var_(/Tahsisi eksik satış yok\./)).toBe(true);
    fireEvent.click(dugme("Tümü (1)"));
    ara("Alıcı, parça, kargo no ile ara...", "zzz");
    expect(var_(/Aramanıza uyan satış yok\./)).toBe(true);
  });
  it("AC-2: Kalıp Üretim: ayrım yok, tek metin", () => {
    STOK({ defaultSubTab: "uretim", uretimFormlari: [] });
    expect(var_(/Henüz üretim formu oluşturulmadı\./)).toBe(true);
  });
});

const FIN = (o = {}) => render(<Finance customers={[]} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]}
  factory={{ name: "Altuntaş Makina" }} rates={{}} payments={[]} teklifler={[]} serverPermissions={null} {...o} />);

describe("Finans", () => {
  it("AC-2: model ve satış yapan tabloları boşken 'Veri yok' (tek metin)", () => {
    FIN();
    expect(say(/^Veri yok$/)).toBe(2);
  });
  it("AC-2: Anlaşmalı servis ve kredi kartı pencerelerinde kayıt yokken 'Kayıt bulunamadı'", () => {
    FIN();
    fireEvent.click(screen.getByText("Toplam Anlaşmalı Servislere Satılan Parça Bedeli"));
    expect(say(/^Kayıt bulunamadı$/)).toBe(1);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByText("Toplam Kredi Kartı ile Satış"));
    expect(say(/^Kayıt bulunamadı$/)).toBe(1);
  });
});

const belge = (i, type = "teklif") => ({ id: 900 + i, type, no: `${type === "teklif" ? "T" : "P"}-${String(i).padStart(3, "0")}`, tarih: "2026-09-20",
  createdAt: `2026-09-01T${String(i).padStart(2, "0")}:00`, dil: "TR", currency: "TRY", durum: "taslak", firma: `Firma ${i}`, satirlar: [] });
function Evrak({ baslangic = [] }) {
  const [teklifler, setTeklifler] = useState(baslangic);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]}
    allModels={[]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={[]} parts={[]}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}

describe("Evrak", () => {
  it("AC-3: hiç belge yok: 'Henüz teklif yok.', 'Henüz proforma yok.', 'Henüz fatura yok.'", () => {
    render(<Evrak />);
    expect(var_(/Henüz teklif yok\./)).toBe(true);
    fireEvent.click(dugme("Proformalar"));
    expect(var_(/Henüz proforma yok\./)).toBe(true);
    fireEvent.click(dugme("Yurt Dışı Fatura"));
    expect(var_(/Henüz fatura yok\./)).toBe(true);
  });
  it("AC-3: belge var ama arama boş: 'Arama sonucu bulunamadı.'", () => {
    render(<Evrak baslangic={[belge(1)]} />);
    expect(var_(/Arama sonucu bulunamadı\./)).toBe(false);
    ara("Firma adı veya belge no ara...", "zzz");
    expect(var_(/Arama sonucu bulunamadı\./)).toBe(true);
    expect(var_(/Henüz teklif yok/)).toBe(false);
  });
});

describe("Notlar", () => {
  it("AC-3: hiç not yok / eşleşen not yok ayrımı; seçim yokken 'Not seçilmedi'", () => {
    render(<Notes notes={[]} setNotes={vi.fn()} aktifKullanici="" />);
    expect(var_(/Henüz not yok\./)).toBe(true);
    expect(var_(/'Yeni Not' ile başlayın\./)).toBe(true);
    expect(var_(/^Not seçilmedi$/)).toBe(true);
    expect(var_(/Soldan bir not seçin veya "Yeni Not" oluşturun\./)).toBe(true);
    cleanup();
    render(<Notes notes={[{ id: 1, content: "Alış listesi", updatedAt: "2026-09-01T10:00" }]} setNotes={vi.fn()} aktifKullanici="" />);
    expect(var_(/Eşleşen not yok|Henüz not yok/)).toBe(false);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "zzz" } });
    expect(var_(/Eşleşen not yok\./)).toBe(true);
  });
});

describe("Analiz", () => {
  it("AC-2: seçili aralıkta hiç kayıt yokken tek boş aralık metni ve üç kalıp kutusunda 'Bu aralıkta kalıp yok.'", () => {
    render(<Analiz customers={[]} services={[]} partSales={[]} yedekParcaSatislar={[]} parts={[]} appSettings={{}} />);
    expect(var_(/Seçili tarih aralığında analiz edilecek servis, yedek parça veya kalıp kaydı yok\./)).toBe(true);
    expect(say(/^Bu aralıkta kalıp yok\.$/)).toBe(3);
  });
  it("AC-2: kutu içi boş metinler kutunun kendi bölümünde", () => {
    const customers = [{ id: 1, name: "A", model: "AK-140", serialNo: "S", installDate: "2025-01-05" }];
    const services = [{ id: 100, customerId: 1, date: "2025-06-05", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", tech: "Ahmet", degisenParcalar: [] }];
    render(<Analiz customers={customers} services={services} partSales={[]} yedekParcaSatislar={[]} parts={[]} appSettings={{}} />);
    const bolum = screen.getByText("En Çok Satılan / Değişen Yedek Parçalar").closest("section");
    expect(within(bolum).getByText("Parça hareketi yok.")).toBeTruthy();
  });
});

// ── Dönüşümden sonra eklenen denetimler (yeni davranış: R1 tablo yerine kutu, R6 Müşteriler ayrımı, C6 düğmesiz kutu) ──
const kutular = () => [...document.querySelectorAll('[data-testid^="bos-"]')];
const kutuDenetle = (testId) => {
  const k = screen.getByTestId(testId);
  expect(k.style.border).toBe("1.5px dashed var(--n300, #cbd5e1)");
  expect(k.querySelectorAll("button").length).toBe(0);
  return k;
};

describe("Dönüşüm sonrası: boş durum kutusu", () => {
  it("AC-2 / R6: Müşteriler'de hiç kayıt yok ile aramaya uyan yok ayrı metin gösterir", () => {
    render(<Customers customers={[]} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} />);
    const k = kutuDenetle("bos-musteriler");
    expect(k.textContent).toBe("Henüz müşteri kaydı yokYeni müşteri eklemek için “Yeni Müşteri” düğmesini kullanın.");
    cleanup();
    render(<Customers customers={[{ id: 1, name: "Kutu Gıda", model: "AK100", serialNo: "S-1" }]} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} />);
    ara("Müşteri ara...", "zzz");
    expect(kutuDenetle("bos-musteriler").textContent).toBe("Müşteri bulunamadı.Arama ölçütünü değiştirmeyi deneyin.");
  });
  it("AC-1 / R1: kayıt yokken tablo ve başlık satırı çizilmez (liste ekranları)", () => {
    const bosTablo = () => { expect(document.querySelector("table")).toBeNull(); expect(document.querySelector("thead")).toBeNull(); };
    render(<Customers customers={[]} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} />); bosTablo(); cleanup();
    render(<SimpleDealers dealers={[]} setDealers={vi.fn()} factory={{ name: "A" }} setFactory={vi.fn()} partSales={[]} services={[]} customers={[]} showToast={vi.fn()} />); bosTablo(); cleanup();
    for (const alt of ["makina", "parca", "uretim"]) { STOK({ defaultSubTab: alt, uretimFormlari: [] }); bosTablo(); cleanup(); }
    render(<Evrak />); bosTablo(); cleanup();
    FIN(); bosTablo();
  });
  it("AC-1 / R1: aramaya uyan kayıt yokken de tablo çizilmez", () => {
    STOK({ stock: [{ id: 5, model: "AK100", serialNo: "S-9", addedDate: "2026-01-01" }] });
    expect(document.querySelector("table")).toBeTruthy();
    ara("Model veya seri no ara...", "zzz");
    expect(document.querySelector("table")).toBeNull();
    kutuDenetle("bos-makina-stok");
  });
  it("AC-4: ekranlardaki boş durum kutularının hiçbirinde düğme yok", () => {
    const ekranlar = [
      () => render(<Notes notes={[]} setNotes={vi.fn()} aktifKullanici="" />),
      () => STOK({ defaultSubTab: "yedeksatis" }),
      () => STOK({ defaultSubTab: "parca" }),
      () => render(<Analiz customers={[]} services={[]} partSales={[]} yedekParcaSatislar={[]} parts={[]} appSettings={{}} />),
      () => FIN(),
    ];
    for (const e of ekranlar) {
      e();
      expect(kutular().length).toBeGreaterThan(0);
      for (const k of kutular()) expect(k.querySelectorAll("button").length).toBe(0);
      cleanup();
    }
  });
});
