// @vitest-environment jsdom
// Spec 0133: satış ekranları maliyete bağlı parçanın fiyatını tek okuma yolundan alır (Evrak, servis sepeti, yedek parça satırı,
// Parça Stoğu), kaydedilmiş belge ve kayıt sonradan değişmez, ve Servis ve Kargo Panosu'nun ayrı penceresi aynı fiyatı verir.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Documents } from "../../src/components/Documents";
import { ServiceForm } from "../../src/components/ServiceForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { PartStokTab } from "../../src/components/stock/PartStokTab";
import { Settings } from "../../src/components/Settings";
import { ServisPencere } from "../../src/components/ServisPencere";
import { fiyatBaglamiKur } from "../../src/lib/parcaFiyati";
import { PARCALAR, MALZEMELER, P304 } from "../fixtures/0133-veri.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.servisBridge; });

const AYAR = { fiyatAyarlari: { varsayilanKat: 2.4 } };
// Kesme mili (65) maliyete bağlı: maliyet 1.701,12 × 2,40 = 4.082,69 (form değeri tam lira yukarı: 4.083); Pim (63) maliyetsiz.
const PARTS = PARCALAR.map(p => (p.id === 65 ? { ...p, fiyatKipi: "maliyet", fiyatUSD: 95 } : p.id === 63 ? { ...p, fiyatKipi: "maliyet" } : p));
const BAG = fiyatBaglamiKur({ parts: PARTS, malzemeler: MALZEMELER, fiyatAyarlari: AYAR.fiyatAyarlari });
const sec = (bas) => fireEvent.mouseDown([...document.querySelectorAll(".sp-option")].find(x => x.textContent.startsWith(bas)));
const ara = (metin) => { const k = screen.getAllByPlaceholderText("Parça ara...").pop(); fireEvent.focus(k); fireEvent.change(k, { target: { value: metin } }); };
const pbSecici = () => screen.getAllByRole("combobox").find(c => [...c.options].some(o => o.value === "USD") && [...c.options].some(o => o.value === "TRY"));

let evrakDurum;
function Evrak({ malzemeler = MALZEMELER, appSettings = AYAR, currency = "TRY" }) {
  const [teklifler, setTeklifler] = useState([{ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency, durum: "taslak", firma: "F",
    satirlar: [{ rowId: "r1", pickTip: "parca", selectedModel: "", selectedKalip: "", selectedPart: "", subItems: [{ id: "p-r1", type: "parca", kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: "", tlKarsiligi: "" }] }] }]);
  evrakDurum = teklifler;
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]} allModels={[]} factory={{ name: "A" }}
    appSettings={appSettings} showToast={vi.fn()} kalipDefs={[]} parts={PARTS} malzemeler={malzemeler} geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}
const evrakSec = (ad) => {
  fireEvent.click(screen.getByText("2026-00001").closest("tr"));
  fireEvent.click(screen.getByLabelText("Parça seç"));
  ara(ad); sec(ad);
  fireEvent.click(screen.getByText("Kaydet"));
  return evrakDurum[0].satirlar[0].subItems.find(i => i.type === "parca");
};

describe("Spec 0133: Evrak", () => {
  it("AC-16: maliyete bağlı parça seçilince satıra türetilmiş fiyat gelir", () => {
    render(<Evrak />);
    expect(evrakSec("Kesme mili").birimFiyat).toBe("4.082,69");
  });
  it("AC-24 / AC-86: maliyetsiz maliyete bağlı parçada satır fiyatı boş gelir, satıra metin yazılmaz", () => {
    render(<Evrak />);
    const s = evrakSec("Pim");
    expect(s.birimFiyat).toBe("");
    expect(JSON.stringify(s)).not.toMatch(/türetilemedi|girilmediği/);
  });
  it("AC-56 (Evrak): malzeme listesi verilmezse malzemeden hesaplanan parçanın fiyatı boş (zincir kesildi ölçümü)", () => {
    render(<Evrak malzemeler={[]} />);
    expect(evrakSec("Kesme mili").birimFiyat).toBe("");
  });
  it("AC-35: kaydedilmiş teklifin satır fiyatı malzeme zammından sonra değişmez", () => {
    const { rerender } = render(<Evrak />);
    const once = evrakSec("Kesme mili").birimFiyat;
    rerender(<Evrak malzemeler={[{ ...P304, kiloFiyati: 5 }]} />);
    expect(evrakDurum[0].satirlar[0].subItems.find(i => i.type === "parca").birimFiyat).toBe(once);
  });
});

let form;
function Servis({ baglam = BAG }) {
  const [f, setF] = useState({ customerId: "", date: "2026-09-20", currency: "TRY", degisenParcalar: [], type: "Bakım" });
  form = f;
  return <ServiceForm title="S" form={f} setForm={setF} customers={[]} parts={PARTS} fiyatBaglami={baglam} onSave={vi.fn()} onCancel={vi.fn()} />;
}
function Yedek({ baglam = BAG }) {
  const [f, setF] = useState({ aliciTipi: "bayi", tarih: "2026-09-20", currency: "TRY", satirlar: [{ partId: "", miktar: "", birimFiyat: "" }] });
  form = f;
  return <YedekParcaSatisForm title="Y" form={f} setForm={setF} parts={PARTS} fiyatBaglami={baglam} onSave={vi.fn()} onCancel={vi.fn()} />;
}

describe("Spec 0133: servis ve yedek parça formları (Karar 29: tam lira yukarı)", () => {
  it("AC-19: servis sepetine eklenen maliyete bağlı parça türetilmiş fiyatla gelir", () => {
    render(<Servis />);
    ara("Kesme mili"); sec("Kesme mili");
    expect(form.degisenParcalar[0].fiyat).toBe(4083);
  });
  it("AC-31 (servis): dolara geçince elle girilmiş dolar fiyatı", () => {
    render(<Servis />);
    ara("Kesme mili"); sec("Kesme mili");
    fireEvent.change(pbSecici(), { target: { value: "USD" } });
    expect(form.degisenParcalar[0].fiyat).toBe(95);
  });
  it("AC-20: yedek parça satırında maliyete bağlı parça türetilmiş fiyatla gelir", () => {
    render(<Yedek />);
    ara("Kesme mili"); sec("Kesme mili");
    expect(form.satirlar[0].birimFiyat).toBe(4083);
  });
  it("AC-33 / AC-34: dolar satışında elle dolar fiyatı; girilmemişse boş", () => {
    render(<Yedek />);
    fireEvent.change(pbSecici(), { target: { value: "USD" } });
    ara("Kesme mili"); sec("Kesme mili");
    expect(form.satirlar[0].birimFiyat).toBe(95);
    cleanup();
    render(<Yedek />);
    fireEvent.change(pbSecici(), { target: { value: "USD" } });
    ara("Pim"); sec("Pim");
    expect(form.satirlar[0].birimFiyat).toBe("");
  });
  it("AC-57: formlar ayar ya da izin okumaz; prop'tan bağlamı alır", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of ["src/components/ServiceForm.jsx", "src/components/YedekParcaSatisForm.jsx"]) {
      const k = readFileSync(f, "utf8");
      expect(k, f).toMatch(/fiyatBaglami = null/);
      expect(k, f).not.toMatch(/fiyatAyarlari|fiyatBaglamiKur/);
    }
  });
  it("AC-36 / AC-37: kayıtlı servis ve satış kendi fiyatını taşır (bağlam sonradan değişse de form değeri değişmez)", () => {
    const { rerender } = render(<Yedek />);
    ara("Kesme mili"); sec("Kesme mili");
    rerender(<Yedek baglam={fiyatBaglamiKur({ parts: PARTS, malzemeler: [{ ...P304, kiloFiyati: 5 }], fiyatAyarlari: AYAR.fiyatAyarlari })} />);
    expect(form.satirlar[0].birimFiyat).toBe(4083);
  });
});

describe("Spec 0133: Parça Stoğu ve katalog aynı gösterim (AC-17, AC-69)", () => {
  it("AC-17 / AC-69: türetilmiş fiyat Parça Stoğu satırında ve katalog listesinde aynı biçim (4.082,69)", () => {
    const partStock = PARTS.map((p, i) => ({ id: i + 1, partId: p.id, miktar: 5 }));
    render(<PartStokTab parts={PARTS} partStock={partStock} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} showToast={vi.fn()} appSettings={{}} fiyatBaglami={BAG} />);
    const stokSatir = screen.getAllByText("Kesme mili").map(e => e.closest("tr")).find(Boolean).textContent;
    expect(stokSatir).toMatch(/4\.082,69/);
    const pimSatir = screen.getAllByText("Pim").map(e => e.closest("tr")).find(Boolean).textContent;
    expect(pimSatir).not.toMatch(/0,00|₺0\b/);
    cleanup();
    render(<Settings customers={[]} services={[]} dealers={[]} stock={[]} setStock={vi.fn()} setCustomers={vi.fn()} setServices={vi.fn()} setDealers={vi.fn()} version="1"
      appSettings={AYAR} setAppSettings={vi.fn()} factory={{ name: "A" }} setFactory={vi.fn()} kalipDefs={[]} setKalipDefs={vi.fn()} calisanlar={[]} setCalisanlar={vi.fn()}
      partTypeDefs={[]} setPartTypeDefs={vi.fn()} onInitialTabConsumed={vi.fn()} aktifKullanici="k" standardModels={[]} setStandardModels={vi.fn()} customModels={[]}
      setCustomModels={vi.fn()} rawCustomModels={[]} tedarikciler={[]} setTedarikciler={vi.fn()} initialTab="yedekparca" parts={PARTS} setParts={vi.fn()} rawParts={PARTS} malzemeler={MALZEMELER} />);
    expect(screen.getAllByText("Kesme mili").map(e => e.closest("tr")).find(Boolean).textContent).toMatch(/4\.082,69/);
  });
});

describe("Spec 0133: ayrı pano penceresi (R10/4)", () => {
  const snap = (malzemeler) => ({
    services: [], customers: [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }],
    calisanlar: [], parts: PARTS, malzemeler, dealers: [], factory: { name: "Altuntaş" }, appSettings: AYAR, geoData: null, loadingGeo: false,
    partStock: [], partStockLog: [], dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null,
    aktifKullanici: "ofis", kargoYetki: false, kalipYetki: false, dosyaCevrimdisi: false, tema: "light",
  });
  const ac = async (malzemeler) => {
    window.servisBridge = { ilkVeriAl: () => Promise.resolve(snap(malzemeler)), onVeri: () => () => {}, mutate: vi.fn() };
    render(<ServisPencere />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Bekliyor" })).toBeTruthy());
    fireEvent.click(screen.getAllByRole("button", { name: /Yeni Servis Talebi/ })[0]);
    ara("Kesme mili"); sec("Kesme mili");
    return document.body;
  };
  it("AC-59 / AC-58: ayrı pencerede servis sepetine eklenen maliyete bağlı parça ana penceredeki fiyatla (4.083) gelir", async () => {
    const govde = await ac(MALZEMELER);
    const fiyat = [...govde.querySelectorAll("input")].map(i => i.value);
    expect(fiyat).toContain("4.083");
  });
  it("AC-56 (pencere): malzeme listesi köprüde yoksa fiyat boş (zincir ölçümü)", async () => {
    const govde = await ac([]);
    const fiyat = [...govde.querySelectorAll("input")].map(i => i.value);
    expect(fiyat).not.toContain("4.083");
  });
});
