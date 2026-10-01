// @vitest-environment jsdom
// Spec 0065: geri alma yolları karşı hareket yazar (R6, R16, R17), hareket ve tutarlılık pencereleri (R18).
// AC-12 (müşteri/bayi kaskadı, sahipsiz) ek blokları ui/customers-delete-cascade, ui/dealers-delete-cascade,
// ui/settings-sahipsiz'de; burada makina üretimi (AC-23), çöpten servis geri alma (AC-24) ve pencereler (AC-25).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { PartStokTab } from "../../src/components/stock/PartStokTab";
import { hareketTarihHaritasi } from "../../src/lib/makinaMaliyeti";
import { netDusum } from "../../src/lib/stokHareketi";

afterEach(cleanup);

const PARTS = [{ id: 7, ad: "Dişli Takımı", models: [] }, { id: 8, ad: "Rulman", models: [] }];

// ── Makina üretimi (R16, AC-23) ──
function MakinaH({ onState }) {
  const [stock, setStock] = useState([{ id: 501, model: "AK100_DS", serialNo: "2026-121", addedDate: "2026-01-05", parcalar: [{ partId: "7", miktar: 2 }] }]);
  const [partStock, setPartStock] = useState([{ id: 1, partId: "7", miktar: 8 }]);
  const [partStockLog, setPartStockLog] = useState([{ id: 11, partId: "7", miktar: -2, tip: "makina_uretimi", referansId: 501, tarih: "2026-01-05", notlar: "AK100_DS" }]);
  onState?.({ stock, partStock, partStockLog });
  return <MakinaStokTab stock={stock.filter(s => !s.deletedAt)} setStock={setStock} models={[{ model: "AK100_DS" }]} showToast={vi.fn()} parts={PARTS}
    partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} />;
}
const makinaSatiri = () => screen.getByText("2026-121").closest("tr");

describe("Spec 0065 R16: makina üretiminin parça tüketimi", () => {
  it("AC-23: kit değişmeden düzenleme stok hareketi yazmaz; üretim tarihi kaymaz", () => {
    let st;
    render(<MakinaH onState={s => { st = s; }} />);
    const dugmeler = within(makinaSatiri()).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 2]);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.partStockLog).toHaveLength(1);
    expect(st.partStock[0].miktar).toBe(8);
    expect(hareketTarihHaritasi(st.partStockLog).get("501")).toBe("2026-01-05");
  });
  it("AC-23: kitten parça çıkarılan düzenleme karşı hareket yazar (satır silinmez), üretim tarihi ilk tüketimde kalır", () => {
    let st;
    render(<MakinaH onState={s => { st = s; }} />);
    const dugmeler = within(makinaSatiri()).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 2]);
    // Pencere tablodan sonra çizilir: son "danger" düğmesi kit satırının silme düğmesidir.
    const kitSil = [...document.querySelectorAll("button")].filter(b => b.className.includes("danger"));
    fireEvent.click(kitSil[kitSil.length - 1]);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.partStockLog.find(l => l.id === 11)).toBeTruthy();
    expect(st.partStockLog.filter(l => l.tip === "makina_uretimi_iade")).toEqual([expect.objectContaining({ partId: "7", miktar: 2, referansId: 501 })]);
    expect(st.partStock[0].miktar).toBe(10);
    expect(hareketTarihHaritasi(st.partStockLog).get("501")).toBe("2026-01-05");
  });
  it("AC-23: makina silinince kit parçaları karşı hareketle stoğa döner", () => {
    let st;
    render(<MakinaH onState={s => { st = s; }} />);
    const dugmeler = within(makinaSatiri()).getAllByRole("button");
    fireEvent.click(dugmeler[dugmeler.length - 1]);
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.partStock[0].miktar).toBe(10);
    expect(netDusum(st.partStockLog, 501, "makina_uretimi", "7")).toBe(0);
    expect(st.partStockLog.find(l => l.id === 11)).toBeTruthy();
  });
});

// ── Çöpten servis geri alma (R17, AC-24) ──
const bos = [];
const noop = () => {};
function CopH({ services: s0, customers: c0 = [], onState }) {
  const [services, setServices] = useState(s0);
  const [customers, setCustomers] = useState(c0);
  const [partStock, setPartStock] = useState([{ id: 1, partId: "7", miktar: 10 }]);
  const [partStockLog, setPartStockLog] = useState([
    { id: 21, partId: "7", miktar: -3, tip: "servis", referansId: 90, tarih: "2026-09-01" },
    { id: 22, partId: "7", miktar: 3, tip: "servis_iade", referansId: 90, tarih: "2026-09-02" },
  ]);
  onState?.({ services, customers, partStock, partStockLog });
  return <SettingsTrash rawCustomers={customers} rawServices={services} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
    rawKalipDefs={bos} rawParts={PARTS} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
    setCustomers={setCustomers} setServices={setServices} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop}
    setKalipDefs={noop} setParts={noop} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
    partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} appSettings={{}} showToast={noop} />;
}
const SV = { id: 90, customerId: 1, type: "Garanti Dışı", date: "2026-09-01", degisenParcalar: [{ partId: "7", miktar: 3 }], deletedAt: "2026-09-02T10:00:00.000Z" };

describe("Spec 0065 R17: çöpten geri alınan servisin parçaları", () => {
  it("AC-24: tek başına geri alınan servisin iade edilmiş parçaları yeniden düşülür ve log'a yazılır", () => {
    let st;
    render(<CopH services={[SV]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Geri Al"));
    expect(st.services[0].deletedAt).toBeUndefined();
    expect(st.partStock[0].miktar).toBe(7);
    expect(netDusum(st.partStockLog, 90, "servis", "7")).toBe(3);
    expect(st.partStockLog).toHaveLength(3);
  });
  it("AC-24: müşteriyle birlikte geri alınan servisin parçaları da yeniden düşülür", () => {
    let st;
    const ts = "2026-09-02T10:00:00.000Z";
    render(<CopH services={[{ ...SV, deletedAt: ts }]} customers={[{ id: 1, name: "Kutu Gıda", model: "AK100_DS", deletedAt: ts }]} onState={s => { st = s; }} />);
    // Müşteri satırının "Geri Al"ı (servis satırı da listede; müşteri geri alma servisi de geri getirir).
    const musteriGeriAl = screen.getAllByText("Geri Al").find(b => {
      let el = b; while (el && !/Müşteri/.test(el.textContent || "")) el = el.parentElement;
      return el && !/Garanti/.test(el.textContent);
    });
    fireEvent.click(musteriGeriAl);
    expect(st.customers[0].deletedAt).toBeUndefined();
    expect(st.services[0].deletedAt).toBeUndefined();
    expect(st.partStock[0].miktar).toBe(7);
    expect(netDusum(st.partStockLog, 90, "servis", "7")).toBe(3);
  });
  it("AC-24: log'u olmayan eski (0065 öncesi silinmiş) serviste hiçbir şey düşülmez", () => {
    let st;
    render(<CopH services={[{ ...SV, id: 91 }]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Geri Al"));
    expect(st.partStock[0].miktar).toBe(10);
    expect(st.partStockLog).toHaveLength(2);
  });
});

// ── Pencereler (R18, AC-25, AC-13, AC-14) ──
function ParcaH({ partStock, partStockLog }) {
  return <PartStokTab parts={PARTS} partStock={partStock} setPartStock={noop} partStockLog={partStockLog} setPartStockLog={noop} showToast={noop} />;
}
describe("Spec 0065 R18: Parça Stoğu pencereleri", () => {
  const LOG = [
    { id: 1, partId: "7", miktar: 10, tip: "stok_girisi", tarih: "2026-09-01", notlar: "" },
    { id: 2, partId: "7", miktar: -3, tip: "servis", referansId: 90, tarih: "2026-09-03", notlar: "" },
    { id: 3, partId: "7", miktar: 3, tip: "servis_iade", referansId: 90, tarih: "2026-09-04", notlar: "Servis kaydı silindi ya da düzenlendi" },
  ];
  it("AC-25: 'Hareketler' penceresi iade satırını okunur adı ve notuyla gösterir", () => {
    render(<ParcaH partStock={[{ id: 1, partId: "7", miktar: 10 }]} partStockLog={LOG} />);
    fireEvent.click(within(screen.getByText("Dişli Takımı").closest("tr")).getByText("Hareketler"));
    const p = screen.getByTestId("stok-hareketleri");
    const satirlar = within(p).getAllByTestId("stok-hareket-satiri").map(s => s.textContent);
    expect(satirlar).toHaveLength(3);
    expect(satirlar[0]).toMatch(/Servisten stoğa geri alındı.*\+3.*Servis kaydı silindi/);
    expect(satirlar[2]).toMatch(/Stok girişi.*\+10/);
  });
  it("AC-13: 'Stok Tutarlılığı' sapan parçayı farkıyla listeler, hiçbir adedi değiştirmez (AC-15)", () => {
    const setPS = vi.fn();
    render(<PartStokTab parts={PARTS} partStock={[{ id: 1, partId: "7", miktar: 12 }]} setPartStock={setPS} partStockLog={LOG} setPartStockLog={setPS} showToast={noop} />);
    fireEvent.click(screen.getByText("Stok Tutarlılığı"));
    const satir = within(screen.getByTestId("tutarlilik-sapmalar")).getAllByTestId("tutarlilik-satiri")[0].textContent;
    expect(satir).toMatch(/Dişli Takımı.*12.*10.*\+2/);
    expect(screen.getByTestId("tutarlilik-notu").textContent).toMatch(/kesin bilinemez/);
    expect(setPS).not.toHaveBeenCalled();
  });
  it("AC-14: sapma yoksa rapor bunu açıkça söyler", () => {
    render(<ParcaH partStock={[{ id: 1, partId: "7", miktar: 10 }]} partStockLog={LOG} />);
    fireEvent.click(screen.getByText("Stok Tutarlılığı"));
    expect(screen.getByTestId("tutarlilik-sapma-yok").textContent).toMatch(/Sapma yok/);
  });
  it("AC-26: aynı günde sayım düzeltmesi olan parça 'sıra belirsiz' bölümünde", () => {
    render(<ParcaH partStock={[{ id: 1, partId: "7", miktar: 4 }]} partStockLog={[
      { id: 1, partId: "7", miktar: 5, tip: "manuel_duzelt", tarih: "2026-09-05" },
      { id: 2, partId: "7", miktar: -1, tip: "servis", referansId: 1, tarih: "2026-09-05" },
    ]} />);
    fireEvent.click(screen.getByText("Stok Tutarlılığı"));
    expect(screen.getByTestId("tutarlilik-sira-belirsiz")).toBeTruthy();
    expect(within(screen.getByTestId("tutarlilik-belirsizler")).getByText("Dişli Takımı")).toBeTruthy();
    expect(screen.queryByTestId("tutarlilik-sapmalar")).toBeNull();
  });
});
