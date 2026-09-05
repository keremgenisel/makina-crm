// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

afterEach(cleanup);
import { Analiz } from "../../src/components/Analiz";

const customers = [
  { id: 1, name: "Firma A", model: "AK-140", serialNo: "SN-1", installDate: "2025-01-05", kaliplar: [{ ad: "Fitil Kalıbı" }, { ad: "Somun Kalıbı" }] },
  { id: 2, name: "Firma B", model: "AK-100", serialNo: "SN-2", installDate: "2025-02-01", kaliplar: [{ ad: "Fitil Kalıbı" }] },
];
const parts = [{ id: 7, ad: "Rulman 6204" }, { id: 8, ad: "V Kayış" }];
// Tarih filtresine takılmasın diye "tüm zamanlar" ile açacağız; yine de bugüne yakın tarihler.
const services = [
  { id: 100, customerId: 1, date: "2025-06-05", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", tech: "Ahmet", degisenParcalar: [{ partId: "7", ad: "Rulman 6204", miktar: 2 }] },
  { id: 101, customerId: 1, date: "2025-06-10", type: "Garanti İçi", repairPlace: "Fabrikada Onarım", tech: "Ahmet", degisenParcalar: [{ partId: "8", ad: "V Kayış", miktar: 3 }] },
  { id: 102, customerId: 2, date: "2025-06-15", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", tech: "Mehmet", degisenParcalar: [{ partId: "7", miktar: 1 }] },
];
const partSales = [{ id: 800, tur: "Kalıp", customerId: 1, ad: "Fitil Kalıbı", olcu: "55x125", tarih: "2025-06-20" }];
const yedekParcaSatislar = [];

const ac = () => {
  render(<Analiz customers={customers} services={services} partSales={partSales} yedekParcaSatislar={yedekParcaSatislar} parts={parts} appSettings={{}} />);
  fireEvent.click(screen.getByRole("button", { name: "Tüm zamanlar" }));
};

describe("Analiz sekmesi", () => {
  it("başlık ve özet kutuları görünür", () => {
    ac();
    expect(screen.getByText("Servis & Parça Analizi")).toBeTruthy();
    expect(screen.getByText("En Çok Değişen Parça")).toBeTruthy();
    expect(screen.getByText("En Yoğun Model")).toBeTruthy();
  });

  it("açılışta varsayılan aralık 'Tüm zamanlar' (tıklama gerekmeden seçili)", () => {
    render(<Analiz customers={customers} services={services} partSales={partSales} yedekParcaSatislar={yedekParcaSatislar} parts={parts} appSettings={{}} />);
    expect(screen.getByRole("button", { name: "Tüm zamanlar" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Son 12 ay" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("makina kutusu başlığı 'En Çok Fabrikada ve Dış Serviste Servis Alan Makinalar'", () => {
    ac();
    expect(screen.getByText("En Çok Fabrikada ve Dış Serviste Servis Alan Makinalar")).toBeTruthy();
  });

  it("trend: tek yıl içi özel aralıkta 'Aylık Servis Adedi'", () => {
    // services 2025-06 → tek-yıl özel aralık (2025) → aylık; veri aralıkta olduğundan panel görünür
    render(<Analiz customers={customers} services={services} partSales={partSales} yedekParcaSatislar={yedekParcaSatislar} parts={parts} appSettings={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Özel…" }));
    const inputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(inputs[0], { target: { value: "2025-01-01" } });
    fireEvent.change(inputs[1], { target: { value: "2025-12-31" } });
    expect(screen.getByText("Aylık Servis Adedi")).toBeTruthy();
  });

  it("trend: Tüm zamanlar HER ZAMAN 'Yıllık Servis Adedi' (tek yıl verisi olsa bile)", () => {
    // services hepsi 2025-06 (tek yıl); tüm zamanlar varsayılan → yine yıllık olmalı (kullanıcı isteği)
    render(<Analiz customers={customers} services={services} partSales={partSales} yedekParcaSatislar={yedekParcaSatislar} parts={parts} appSettings={{}} />);
    expect(screen.getByText("Yıllık Servis Adedi")).toBeTruthy();
  });

  it("trend: çok yıllı veride yıl aralığı ipucu (2021–2025)", () => {
    const cok = [
      { id: 1, customerId: 1, date: "2021-05-01", degisenParcalar: [] },
      { id: 2, customerId: 1, date: "2025-06-01", degisenParcalar: [] },
    ];
    render(<Analiz customers={customers} services={cok} partSales={[]} yedekParcaSatislar={[]} parts={[]} appSettings={{}} />);
    expect(screen.getByText("Yıllık Servis Adedi")).toBeTruthy();
    expect(screen.getByText("2021–2025")).toBeTruthy();
  });

  it("en çok değişen parça = Rulman 6204 (servis 3), panelde listelenir", () => {
    ac();
    // Panel başlığı + parça adı en az bir yerde geçer
    expect(screen.getByText("En Çok Satılan / Değişen Yedek Parçalar")).toBeTruthy();
    expect(screen.getAllByText(/Rulman 6204/).length).toBeGreaterThan(0);
  });

  it("aramalı parça seçici: arama + seçim ile parça değişir", () => {
    ac();
    const toggle = screen.getByRole("button", { name: "Parça seç" });
    expect(toggle.textContent).toMatch(/Rulman 6204/); // varsayılan = en çok parça
    fireEvent.click(toggle);
    const arama = screen.getByPlaceholderText("Parça ara...");
    fireEvent.change(arama, { target: { value: "kayış" } });
    // filtrelenmiş açılır listede V Kayış seçeneği var, tıklanınca seçilir
    fireEvent.click(screen.getByRole("button", { name: /V Kayış/ }));
    expect(screen.getByRole("button", { name: "Parça seç" }).textContent).toMatch(/V Kayış/);
    expect(screen.queryByPlaceholderText("Parça ara...")).toBeFalsy(); // liste kapandı
  });

  it("parça listesi 10 ile sınırlı, 'Tümünü göster' ayrı pencerede (modal) hepsini açar", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: 200 + i, customerId: 1, date: "2025-06-01", type: "Garanti Dışı",
      degisenParcalar: [{ ad: `PARCA-${String(i + 1).padStart(2, "0")}`, miktar: 12 - i }],
    }));
    render(<Analiz customers={customers} services={many} partSales={[]} yedekParcaSatislar={[]} parts={[]} appSettings={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Tüm zamanlar" }));
    const panel = screen.getByText("En Çok Satılan / Değişen Yedek Parçalar").closest("section");
    expect(within(panel).queryByText("PARCA-10")).toBeTruthy();  // top 10 panelde görünür
    expect(screen.queryByText("PARCA-12")).toBeFalsy();          // 11-12 hiç görünmez (panelde de modalde de)
    fireEvent.click(within(panel).getByRole("button", { name: /Tümünü göster \(12\)/ }));
    // Modal açıldı: başlık sayıyla + tüm liste (PARCA-12 artık görünür)
    expect(screen.getByText(/· 12$/)).toBeTruthy();
    expect(screen.getByText("PARCA-12")).toBeTruthy();
  });

  it("Kalıp Analizi bölümü: birleşik (Extra + Standart) paneller ve lejant görünür", () => {
    ac();
    expect(screen.getByText("Kalıp Analizi")).toBeTruthy();
    expect(screen.getByText("En Çok Kullanılan Kalıp")).toBeTruthy();
    expect(screen.getByText("Kalıp Ölçüleri")).toBeTruthy();
    expect(screen.getByText("Modele Göre Kalıp")).toBeTruthy();
    // Lejant: Extra Satış + Standart
    expect(screen.getByText("Extra Satış")).toBeTruthy();
    expect(screen.getByText("Standart")).toBeTruthy();
    expect(screen.getAllByText(/55x125/).length).toBeGreaterThan(0);
  });

  it("kalıp adı paneli hem satılan (Extra) hem makinayla gelen (Standart) kalıbı birleştirir", () => {
    ac();
    // Fitil Kalıbı: Extra 1 (satış) + Standart 2 (cust1+cust2) = 3
    const panel = screen.getByText("En Çok Kullanılan Kalıp").closest("section");
    expect(within(panel).getAllByText(/Fitil Kalıbı/).length).toBeGreaterThan(0);
    expect(within(panel).getByText("3")).toBeTruthy(); // birleşik toplam
  });

  it("Model Servis Yoğunluğu: gizli model panelden ve En Yoğun kutusundan düşer", () => {
    render(<Analiz customers={customers} services={services} partSales={partSales} yedekParcaSatislar={yedekParcaSatislar} parts={parts} appSettings={{ analizGizliModeller: ["AK-140"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Tüm zamanlar" }));
    const panel = screen.getByText("Model Servis Yoğunluğu").closest("section");
    expect(panel.textContent).toContain("AK-100");   // görünür model
    expect(panel.textContent).not.toContain("AK-140"); // gizli model panelde yok
    // En Yoğun Model kutusu da aynı filtreye tabi → AK-140 gizliyken AK-100
    const tile = screen.getByText("En Yoğun Model").parentElement;
    expect(tile.textContent).toContain("AK-100");
    expect(tile.textContent).not.toContain("AK-140");
  });

  it("Model Servis Yoğunluğu: servisli tüm modeller gizlenince 'Veri yok'", () => {
    render(<Analiz customers={customers} services={services} partSales={partSales} yedekParcaSatislar={yedekParcaSatislar} parts={parts} appSettings={{ analizGizliModeller: ["AK-140", "AK-100"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Tüm zamanlar" }));
    const panel = screen.getByText("Model Servis Yoğunluğu").closest("section");
    expect(within(panel).getByText("Veri yok.")).toBeTruthy();
  });

  it("boş aralıkta boş durum mesajı gösterilir", () => {
    render(<Analiz customers={customers} services={services} partSales={partSales} yedekParcaSatislar={yedekParcaSatislar} parts={parts} appSettings={{}} />);
    // Özel aralık, 2000 yılı → hiç kayıt yok
    fireEvent.click(screen.getByRole("button", { name: "Özel…" }));
    const inputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(inputs[0], { target: { value: "2000-01-01" } });
    fireEvent.change(inputs[1], { target: { value: "2000-12-31" } });
    expect(screen.getByText(/analiz edilecek servis, yedek parça veya kalıp kaydı yok/)).toBeTruthy();
  });
});
