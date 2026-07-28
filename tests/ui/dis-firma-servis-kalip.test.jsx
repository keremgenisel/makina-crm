// @vitest-environment jsdom
// Anlaşmasız dış firma: Serviste "İşlemi Yapan Firma" = "Diğer" seçilince, Extra Kalıp'ta
// "Satış Yapan Firma" = "Diğer" seçilince altta firma adı/yetkili/telefon/ülke-şehir alanları
// açılır ve YALNIZ o kayda yazılır (müşteri/bayi kaydı oluşturmadan). Bilgiler makina geçmişinde
// de görünür.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { ServiceForm } from "../../src/components/ServiceForm";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { MachineTimeline } from "../../src/components/customers/detail/MachineTimeline";

const customers = [{ id: 1, name: "ABC Makina", faturali: "Faturalı Yurtiçi" }];
const dealers = [{ id: 3, name: "Anadolu Bayi", bayiMi: true, anlasmaliServisMi: true }];

describe("ServiceForm — İşlemi Yapan Firma = Diğer", () => {
  const svProps = (form) => ({ title: "Yeni Servis Talebi", form, setForm: vi.fn(), customers, dealers, factory: { name: "Altuntaş Makina" }, onSave: vi.fn(), onCancel: vi.fn() });

  it("Diğer değilken dış firma alanları görünmez", () => {
    render(<ServiceForm {...svProps({ customerId: 1, islemFirma: "Altuntaş Makina", degisenParcalar: [] })} />);
    expect(screen.queryByText(/Anlaşmasız Dış Servis Firması/)).toBeNull();
  });

  it("Diğer seçiliyken firma adı/yetkili/telefon + adres alanları çıkar", () => {
    render(<ServiceForm {...svProps({ customerId: 1, islemFirma: "Diğer", degisenParcalar: [] })} />);
    expect(screen.getByText(/Anlaşmasız Dış Servis Firması/)).toBeTruthy();
    expect(screen.getByText("Firma Adı")).toBeTruthy();
    expect(screen.getByText("Yetkili Kişi")).toBeTruthy();
    expect(screen.getByText("Telefon")).toBeTruthy();
    expect(screen.getByText("Adres")).toBeTruthy();
    expect(screen.getByPlaceholderText(/Açık adres/)).toBeTruthy();
  });

  it("İşlemi Yapan Firma select'inde 'Diğer' seçeneği var ve seçim setForm'a yazılır", () => {
    const setForm = vi.fn();
    render(<ServiceForm {...{ ...svProps({ customerId: 1, islemFirma: "Altuntaş Makina", degisenParcalar: [] }), setForm }} />);
    const opt = screen.getByRole("option", { name: /Diğer \(anlaşmasız firma\)/ });
    expect(opt).toBeTruthy();
    fireEvent.change(opt.closest("select"), { target: { value: "Diğer" } });
    expect(setForm).toHaveBeenCalled();
  });
});

describe("PartSaleForm — Satış Yapan Firma = Diğer", () => {
  const pkProps = (form) => ({ title: "Extra Kalıp Satışı", form, setForm: vi.fn(), customers, kalipDefs: [], dealers, factory: { name: "Altuntaş Makina" }, onSave: vi.fn(), onCancel: vi.fn() });

  it("Satış Yapan Firma select'i bayileri listeler", () => {
    render(<PartSaleForm {...pkProps({ customerId: 1, kaliplar: [], currency: "TRY" })} />);
    expect(screen.getByRole("option", { name: "Anadolu Bayi" })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Diğer \(anlaşmasız firma\)/ })).toBeTruthy();
  });

  it("Diğer seçiliyken firma alanları çıkar", () => {
    render(<PartSaleForm {...pkProps({ customerId: 1, kaliplar: [], currency: "TRY", satisFirma: "Diğer" })} />);
    expect(screen.getByText(/Anlaşmasız Firma/)).toBeTruthy();
    expect(screen.getByText("Firma Adı")).toBeTruthy();
  });

  it("'Servis ve Kargo Panosuna gönder' anahtarı kargo alanlarını açar (kargoDurum set olur)", () => {
    const H = () => {
      const [form, setForm] = useState({ customerId: 1, kaliplar: [{ ad: "K", olcu: "", fiyat: "" }], currency: "TRY" });
      return <PartSaleForm title="Extra Kalıp Satışı" form={form} setForm={setForm} customers={customers} kalipDefs={[]} dealers={dealers} calisanlar={[{ id: 1, ad: "Ahmet" }]} factory={{ name: "Altuntaş Makina" }} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.queryByPlaceholderText("Kargo firması")).toBeNull(); // kapalıyken yok
    fireEvent.click(screen.getByText(/Servis ve Kargo Panosuna gönder/));
    expect(screen.getByPlaceholderText("Kargo firması")).toBeTruthy(); // açılınca kargo alanları
    expect(screen.getByPlaceholderText("Takip no")).toBeTruthy();
    // "Kargoyu Verecek Kişi" önerileri fabrika çalışanlarından gelmeli (datalist)
    expect(document.querySelector('#kalip-kargoci-listesi option[value="Ahmet"]')).toBeTruthy();
  });

  it("düzenlemede kargoDurum dolu form ile açılınca 'panoya gönder' seçili + kargo alanları görünür", () => {
    // openEditPartSale artık kargoDurum'u da pkForm'a taşıyor; toggle bu değere bağlı (panoyaGonder=!!kargoDurum).
    render(<PartSaleForm {...pkProps({ id: 5, customerId: 1, kaliplar: [{ ad: "K", olcu: "", fiyat: "100" }], currency: "TRY", kargoDurum: "Kargoya Verildi", kargoFirma: "Yurtiçi" })} />);
    const toggle = screen.getByText(/Servis ve Kargo Panosuna gönder/).closest("label").querySelector('input[type="checkbox"]');
    expect(toggle.checked).toBe(true);
    expect(screen.getByPlaceholderText("Kargo firması")).toBeTruthy();
  });

  it("'Fabrika Teslim' checkbox: panoya düşürür + kargo firma/takip GİZLİ (yedek parçadaki gibi)", () => {
    let sonForm;
    const H = () => {
      const [form, setForm] = useState({ customerId: 1, kaliplar: [{ ad: "K", olcu: "", fiyat: "100" }], currency: "TRY" });
      sonForm = form;
      return <PartSaleForm title="Extra Kalıp Satışı" form={form} setForm={setForm} customers={customers} kalipDefs={[]} dealers={dealers} factory={{ name: "Altuntaş Makina" }} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    fireEvent.click(screen.getByText(/Fabrika Teslim/));
    expect(sonForm.fabrikaTeslim).toBe(true);
    expect(sonForm.kargoDurum).toBe("Hazırlanıyor");                 // panoya düşer
    expect(screen.queryByPlaceholderText("Kargo firması")).toBeNull(); // fabrika teslimde kargo firma yok
  });
});

describe("MachineTimeline — dış firma bilgisi makina geçmişinde görünür", () => {
  const base = {
    detailView: { id: 1, faturali: "Faturalı Yurtiçi" },
    detailTimelineEvents: [],
    factoryName: "Altuntaş Makina",
    kdvRates: [], canDo: () => false,
    onPrintOrPick: () => {},
  };

  it("Diğer servis: 'Dış Servis (Anlaşmasız): {ad}' + yetkili/telefon yazılır", () => {
    const sv = { id: 9, customerId: 1, type: "Periyodik Bakım", date: "2026-07-11", islemFirma: "Diğer", islemFirmaAd: "Harici Servis Ltd", islemFirmaYetkili: "Ahmet", islemFirmaTel: "0555", islemFirmaSehir: "Bursa", islemFirmaUlke: "Türkiye" };
    render(<MachineTimeline {...base} detailTimelineEvents={[{ kind: "service", date: sv.date, color: "#000", title: sv.type, sv }]} />);
    expect(screen.getByText(/Dış Servis \(Anlaşmasız\): Harici Servis Ltd/)).toBeTruthy();
    expect(screen.getByText(/Ahmet · 0555 · Bursa, Türkiye/)).toBeTruthy();
  });

  it("Kalıp Verildi: teslim türü BAŞLIKTA (iconsuz), emoji rozet YOK", () => {
    // Teslim türü artık deriveCustomerDetail'de başlığa yazılıyor (yedek parçadaki gibi); MachineTimeline emoji rozet basmaz.
    const ev = [{ kind: "part", date: "2026-07-11", color: "#c2410c", title: "Kalıp Verildi (Fabrika Teslim)", psList: [{ id: 1, ad: "K", ucret: 100, kargoDurum: "Hazırlanıyor", fabrikaTeslim: true }] }];
    render(<MachineTimeline {...base} detailTimelineEvents={ev} />);
    expect(screen.getByText("Kalıp Verildi (Fabrika Teslim)")).toBeTruthy();
    expect(screen.queryByText(/🏭|📦 Kargo/)).toBeNull(); // emoji rozet yok
  });

  it("Yedek Parça (Kargo) olayı: fiyat + KDV dahil + ödendi toggle (fiyatın yanında) + düzenle + Sil", () => {
    // 5 × 100 = 500 net; Faturalı Yurtiçi KDV %20 → KDV dahil 600
    const yp = { id: 700, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 5, birimFiyat: 100, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-07-11", odendi: false };
    const onEditYedekParca = vi.fn(), onDeleteYedekParca = vi.fn(), onToggleYedekParcaOdendi = vi.fn();
    const ev = [{ kind: "part", date: "2026-07-11", color: "#0891b2", title: "Yedek Parça (Kargo)", desc: "5 adet Dişli", yp }];
    // Düzenle/ödeme/sil artık ayrı izinler — hepsini açık ver
    const yetkiler = new Set(["cust_yedek_parca_edit", "cust_yedek_parca_payment", "cust_yedek_parca_delete"]);
    render(<MachineTimeline {...base} kdvRates={[{ from: "2023-07-10", rate: 20 }]} canDo={(p) => yetkiler.has(p)} detailTimelineEvents={ev} onEditYedekParca={onEditYedekParca} onDeleteYedekParca={onDeleteYedekParca} onToggleYedekParcaOdendi={onToggleYedekParcaOdendi} />);
    expect(screen.getByText(/Yedek Parça Ücreti/)).toBeTruthy();
    expect(screen.getByText(/KDV dahil/)).toBeTruthy();
    fireEvent.click(screen.getByText("Yedek Parça (Kargo)"));
    expect(onEditYedekParca).toHaveBeenCalledWith(yp);
    fireEvent.click(screen.getByRole("button", { name: /işaretle: Ödendi/ }));
    expect(onToggleYedekParcaOdendi).toHaveBeenCalledWith(yp);
    fireEvent.click(screen.getByRole("button", { name: /Sil/ }));
    expect(onDeleteYedekParca).toHaveBeenCalledWith(yp);
  });

  it("Yedek Parça (Kargo) olayı: yetki yoksa Sil butonu ve düzenleme yok", () => {
    const yp = { id: 700, aliciTipi: "musteri", musteriId: 1, miktar: 5 };
    const ev = [{ kind: "part", date: "2026-07-11", color: "#0891b2", title: "Yedek Parça (Kargo)", desc: "5 adet Dişli", yp }];
    render(<MachineTimeline {...base} canDo={() => false} detailTimelineEvents={ev} onEditYedekParca={vi.fn()} onDeleteYedekParca={vi.fn()} />);
    expect(screen.getByText("Yedek Parça (Kargo)")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Sil/ })).toBeNull();
  });

  it("Yedek Parça (Kargo) olayı: yalnız 'delete' izniyle Sil çıkar, düzenle/ödeme çıkmaz", () => {
    const yp = { id: 700, aliciTipi: "musteri", musteriId: 1, miktar: 5, currency: "TRY", odendi: false };
    const onEditYedekParca = vi.fn();
    const ev = [{ kind: "part", date: "2026-07-11", color: "#0891b2", title: "Yedek Parça (Kargo)", desc: "5 adet Dişli", yp }];
    render(<MachineTimeline {...base} canDo={(p) => p === "cust_yedek_parca_delete"} detailTimelineEvents={ev} onEditYedekParca={onEditYedekParca} onDeleteYedekParca={vi.fn()} onToggleYedekParcaOdendi={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Sil/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /işaretle: Ödendi/ })).toBeNull(); // ödeme izni yok
    fireEvent.click(screen.getByText("Yedek Parça (Kargo)"));
    expect(onEditYedekParca).not.toHaveBeenCalled(); // düzenle izni yok → tıklama etkisiz
  });

  it("TOPLU satış olayı (ypGrup>1): başlık tıklanabilir (düzenleme), '(N kalem)' etiketi", () => {
    const yp = { id: 700, batchId: 555, aliciTipi: "musteri", musteriId: 1, miktar: 3, currency: "TRY", odendi: false };
    const ypGrup = [yp, { id: 701, batchId: 555, aliciTipi: "musteri", musteriId: 1, miktar: 2, currency: "TRY" }];
    const onEditYedekParca = vi.fn();
    const ev = [{ kind: "part", date: "2026-07-11", color: "#0891b2", title: "Yedek Parça (Kargo)", desc: "3 adet Dişli, 2 adet Piston", yp, ypGrup }];
    render(<MachineTimeline {...base} canDo={(p) => p === "cust_yedek_parca_edit"} detailTimelineEvents={ev} onEditYedekParca={onEditYedekParca} onDeleteYedekParca={vi.fn()} />);
    expect(screen.getByText(/2 kalem/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Yedek Parça \(Kargo\)/));
    expect(onEditYedekParca).toHaveBeenCalledWith(yp); // toplu satış da düzenlenebilir
  });

});
