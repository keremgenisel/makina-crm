// @vitest-environment jsdom
// Spec 0100: satış formu ve stoktan düşüm (R6–R7/3). Gerçek Customers, App gibi bağlanır: ekrana çöpü süzülmüş stok, setter'a
// TAM dizi (çöptekiler dahil). Motor kriterleri tests/stok-durumu-0100.test.js'te.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";

afterEach(cleanup);

function kur({ customers = [], stock = [], giderYetki = true, uretimPartileri = [] } = {}) {
  const durum = { customers, stock, partStockLog: [], services: [], partSales: [], payments: [], partStock: [] };
  const setter = (k) => vi.fn((u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
  };
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={durum.stock.filter(s => !s.deletedAt)} partStockLog={durum.partStockLog}
      services={durum.services} partSales={durum.partSales} payments={durum.payments} partStock={durum.partStock} giderYetki={giderYetki}
      uretimPartileri={uretimPartileri} rates={{ usd: 41.5, eur: 45.25 }} {...setters} />
  );
  const u = render(ciz());
  return { durum, rerender: () => u.rerender(ciz()) };
}
const satir = (ad) => screen.getByText(ad).closest("tr");
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
const kaydet = () => fireEvent.click(screen.getByText("Kaydet"));
const stokSecici = () => screen.getByText(/Stoktan seçin/).closest("select");
const BEKLEYEN = { id: 1, name: "Bekleyen Seri", model: "AK100", serialNo: "", seriNoBekliyor: true, installDate: "2026-05-01" };

describe("Spec 0100 plan P4: serisiz düşüm çöpteki satırı değil canlı satırı düşer", () => {
  it("çöpte aynı modelden serisiz satır öndeyken satış canlı satırı düşer, çöpteki yerinde kalır", () => {
    const COPTE = { id: 90, model: "AK100", serialNo: "", addedDate: "2026-01-01", deletedAt: "2026-10-01T10:00:00.000Z" };
    const CANLI = { id: 91, model: "AK100", serialNo: "", addedDate: "2026-02-01" };
    const { durum } = kur({ customers: [BEKLEYEN], stock: [COPTE, CANLI] });
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "__serisiz__" } });
    kaydet();
    expect(durum.customers[0].sourceStockId).toBe(91);
    expect(durum.stock).toEqual([COPTE]);
  });
});

const KAPALI = { id: 901, ad: "2026-1", baslangicAy: "2026-06", bitisAy: "2026-08" };
const ACIK = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null };
const PARTILER = [KAPALI, ACIK];
const yeniMusteri = (ad) => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
};
const partiSecici = () => screen.queryByLabelText("Üretim partisi");

describe("Spec 0100: stoktan seçim listesi (R6, R6/2, R6/3)", () => {
  const STOK = [
    { id: 70, model: "AK100", serialNo: "S-70", addedDate: "2026-09-10", uretimDurumu: "montaj", partiId: 902 },
    { id: 71, model: "AK100", serialNo: "S-71", addedDate: "2026-09-01" },
    { id: 72, model: "AK100", serialNo: "", addedDate: "2026-09-12", uretimDurumu: "montaj" },
    { id: 73, model: "AK100", serialNo: "", addedDate: "2026-09-08" },
    { id: 74, model: "AK100", serialNo: "", addedDate: "2026-09-02", uretimDurumu: "montaj" },
  ];
  it("AC-18 / AC-52: serili montajdaki makina durumuyla görünür; serisiz seçenek kırılımı yazar", () => {
    kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    const secenekler = [...stokSecici().options].map(o => o.textContent);
    expect(secenekler).toContain("S-70 · Montajda");
    expect(secenekler).toContain("S-71 · Satışa hazır");
    expect(secenekler).toContain("Seri no'suz stoktan düş: 1 satışa hazır, 2 montajda");
  });
  it("AC-19: montajdaki makina satılınca stok satırı düşer, müşteri kaydı partiyi ve üretim tarihini taşır", () => {
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "S-70" } });
    kaydet();
    expect(durum.customers[0]).toMatchObject({ serialNo: "S-70", sourceStockId: 70, partiId: 902, uretimTarihi: "2026-09-10" });
    expect(durum.stock.map(s => s.id)).toEqual([71, 72, 73, 74]);
  });
  it("AC-51: serisiz satış satışa hazır olanların en eskisini düşer (montajdaki daha eski olsa da)", () => {
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "__serisiz__" } });
    kaydet();
    expect(durum.customers[0].sourceStockId).toBe(73);
    expect(durum.stock.map(s => s.id)).toEqual([70, 71, 72, 74]);
  });
});

describe("Spec 0100: satış formunun üretim partisi seçicisi (R7/2–R7/2b, C13)", () => {
  it("AC-39: stoktan makina seçilmeden açılan satışta seçici çizilir ve seçilen parti kayda yazılır", () => {
    const { durum } = kur({ uretimPartileri: PARTILER });
    yeniMusteri("Ön Sipariş AŞ");
    const secenekler = [...partiSecici().options].map(o => o.textContent);
    expect(secenekler).toEqual(["Partisiz", "2026-1", "2026-2 (açık)"]);
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    kaydet();
    expect(durum.customers[0]).toMatchObject({ name: "Ön Sipariş AŞ", partiId: 902 });
  });
  it("AC-40: parti seçilmeden kaydedilen satış partisiz kalır, gövdede alan yok; seçip geri boşaltmak da alanı siler", () => {
    const { durum } = kur({ uretimPartileri: PARTILER });
    yeniMusteri("Partisiz AŞ");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(partiSecici(), { target: { value: "" } });
    kaydet();
    expect(durum.customers[0].name).toBe("Partisiz AŞ");
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("AC-42 / AC-54: önce parti seçilip sonra stoktan satır seçilince seçici kaybolur ve parti stok satırından gelir", () => {
    const STOK = [{ id: 80, model: "AK100", serialNo: "S-80", addedDate: "2026-07-01", partiId: 901 }, { id: 81, model: "AK100", serialNo: "S-81", addedDate: "2026-07-02" }];
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(stokSecici(), { target: { value: "S-80" } });
    expect(partiSecici()).toBeNull();
    kaydet();
    expect(durum.customers[0]).toMatchObject({ sourceStockId: 80, partiId: 901 });
  });
  it("AC-54: partisiz stok satırı seçilince formda seçilmiş parti kayda girmez (anahtar yok)", () => {
    const STOK = [{ id: 81, model: "AK100", serialNo: "S-81", addedDate: "2026-07-02" }];
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(stokSecici(), { target: { value: "S-81" } });
    kaydet();
    expect(durum.customers[0].sourceStockId).toBe(81);
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("AC-53 (R7/2a): gider yetkisi olmayan kullanıcıda seçici çizilmez", () => {
    kur({ giderYetki: false, uretimPartileri: PARTILER });
    yeniMusteri("Yetkisiz AŞ");
    expect(partiSecici()).toBeNull();
  });
  it("R7/2a: satılmış (seri no'su olan) kaydın düzenlemesinde seçici çizilmez (X8)", () => {
    kur({ customers: [{ id: 2, name: "Satılmış", model: "AK100", serialNo: "S-1", installDate: "2026-05-01" }], uretimPartileri: PARTILER });
    duzenle("Satılmış");
    expect(partiSecici()).toBeNull();
  });
});

describe("Spec 0100 triyaj: stoktan düşümün kenar durumları", () => {
  it("bulgu 3 (R7/2b): serisiz stok seçildikten sonra satır yarışta kaybolursa formdaki parti yine kayda girmez", () => {
    const { durum, rerender } = kur({ customers: [BEKLEYEN], stock: [{ id: 95, model: "AK100", serialNo: "", addedDate: "2026-09-01" }], uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(stokSecici(), { target: { value: "__serisiz__" } });
    durum.stock = []; // başka bilgisayar aynı makinayı az önce sattı
    rerender();
    kaydet();
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("bulgu 4: serili düşüm çöpte aynı model ve seriyle duran satırı silmez, yalnız canlı satırı düşer", () => {
    const COPTE = { id: 96, model: "AK100", serialNo: "S-96", addedDate: "2026-01-01", deletedAt: "2026-10-01T10:00:00.000Z" };
    const CANLI = { id: 97, model: "AK100", serialNo: "S-96", addedDate: "2026-02-01" };
    const { durum } = kur({ customers: [BEKLEYEN], stock: [COPTE, CANLI], uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "S-96" } });
    kaydet();
    expect(durum.customers[0].sourceStockId).toBe(97);
    expect(durum.stock).toEqual([COPTE]);
  });
  it("bulgu 3 sınırı: stok hiç yokken elle yazılan seriyle yapılan satışın seçilmiş partisi korunur (AC-39)", () => {
    const { durum } = kur({ customers: [BEKLEYEN], uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "901" } });
    kaydet();
    expect(durum.customers[0].partiId).toBe(901);
  });
});
