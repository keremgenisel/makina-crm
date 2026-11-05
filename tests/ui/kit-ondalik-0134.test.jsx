// @vitest-environment jsdom
// Spec 0134 R6/2, R6/3, R6a, R6c, C1/2: ondalık kit adedi iki kit kapısında (model kartı, parça kartının model ile adet satırı),
// set içeriği tam sayı, parti başına çevirme (gerçek Settings) ve stoğa çevirmede yukarı yuvarlama (gerçek MakinaStokTab).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";
import { KIT_ADET_HATASI, SET_ADET_HATASI, PARTI_BUYUKLUGU_HATASI } from "../../src/lib/urunAgaci";
import { PARTI_BASINA_BAGLANTI } from "../../src/components/ModelsManager";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); delete window.crmLocks; });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
const STD = [{ model: "AK100_DS", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 2 }] }];
const PARCALAR = [{ id: 7, ad: "Rulman", models: ["AK100_DS"], maliyet: 10 }, { id: 8, ad: "Kayış", models: ["AK100_DS"] },
  { id: 9, ad: "Set", models: [], setIcerigi: [{ partId: 8, miktar: 2 }] }];
let durum;
function Katalog({ tab = "yedekparca" }) {
  const [parts, setParts] = useState(structuredClone(PARCALAR));
  const [standardModels, setStandardModels] = useState(structuredClone(STD));
  durum = { parts, standardModels };
  return <Settings {...BASE} initialTab={tab} parts={parts} setParts={setParts} standardModels={standardModels} setStandardModels={setStandardModels}
    customModels={[]} setCustomModels={vi.fn()} rawParts={parts} rawCustomModels={[]} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kitAc = () => fireEvent.click(satir("AK100_DS").querySelector("button.btn--ghost"));
const kit = () => durum.standardModels[0].defaultParcalar;

describe("Spec 0134: model kartının kiti", () => {
  it("AC-11a: makina kitine 0,114 girilir ve kaydedilir; kart yeniden açılınca 0,114 görünür", () => {
    render(<Katalog tab="models" />);
    kitAc();
    fireEvent.change(screen.getByLabelText("Rulman kit adedi"), { target: { value: "0,114" } });
    kaydet();
    expect(kit()).toEqual([{ partId: "7", ad: "Rulman", miktar: 0.114 }]);
    kitAc();
    expect(screen.getByLabelText("Rulman kit adedi").value).toBe("0,114");
  });
  it("AC-11b: dört ondalıklı adet reddedilir, nedeni satırda; kit değişmez", () => {
    render(<Katalog tab="models" />);
    kitAc();
    fireEvent.change(screen.getByLabelText("Rulman kit adedi"), { target: { value: "0,1143" } });
    kaydet();
    expect(screen.getByText(KIT_ADET_HATASI)).toBeTruthy();
    expect(kit()[0].miktar).toBe(2);
  });
  it("AC-11f / AC-93 / AC-94: parti başına 8 adet ve 70 makina → 0,114 alana yazılır ve yanında görünür; girdiler kayda yazılmaz", () => {
    render(<Katalog tab="models" />);
    kitAc();
    fireEvent.click(screen.getByRole("button", { name: PARTI_BASINA_BAGLANTI }));
    fireEvent.change(screen.getByLabelText("Rulman parti adedi"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Rulman parti büyüklüğü"), { target: { value: "70" } });
    expect(screen.getByTestId("parti-cevrilen").textContent).toBe("= 0,114 / makina");
    expect(screen.getByLabelText("Rulman kit adedi").value).toBe("0,114");
    kaydet();
    expect(kit()).toEqual([{ partId: "7", ad: "Rulman", miktar: 0.114 }]);
    kitAc();
    expect(screen.queryByLabelText("Rulman parti adedi")).toBeNull();
    expect(screen.getByLabelText("Rulman kit adedi").value).toBe("0,114");
  });
  it("AC-11g: parti büyüklüğü sıfır ya da boşsa çevirme yapılmaz, nedeni alanın altında", () => {
    render(<Katalog tab="models" />);
    kitAc();
    fireEvent.click(screen.getByRole("button", { name: PARTI_BASINA_BAGLANTI }));
    fireEvent.change(screen.getByLabelText("Rulman parti adedi"), { target: { value: "8" } });
    expect(within(screen.getByTestId("parti-basina")).getByText(PARTI_BUYUKLUGU_HATASI)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Rulman parti büyüklüğü"), { target: { value: "0" } });
    expect(within(screen.getByTestId("parti-basina")).getByText(PARTI_BUYUKLUGU_HATASI)).toBeTruthy();
    expect(screen.getByLabelText("Rulman kit adedi").value).toBe("2");
  });
});

describe("Spec 0134: parça kartı ve set içeriği", () => {
  it("AC-74 / C1/2: parça kartının model ile adet satırına 0,114 girilir ve kite yazılır (iki kapı birlikte gevşer)", () => {
    render(<Katalog />);
    fireEvent.click(satir("Rulman").querySelector("button.btn--ghost"));
    expect(screen.getByLabelText("AK100_DS adedi").value).toBe("2");
    fireEvent.change(screen.getByLabelText("AK100_DS adedi"), { target: { value: "0,114" } });
    kaydet();
    expect(kit()[0].miktar).toBe(0.114);
    fireEvent.click(satir("Rulman").querySelector("button.btn--ghost"));
    expect(screen.getByLabelText("AK100_DS adedi").value).toBe("0,114");
  });
  it("AC-11c / AC-75: set içeriğine ondalık adet girilirse reddedilir, metin set içeriğine ait", () => {
    render(<Katalog />);
    fireEvent.click(satir("Set").querySelector("button.btn--ghost"));
    fireEvent.change(screen.getByLabelText("Bileşen adedi 1"), { target: { value: "1,5" } });
    kaydet();
    expect(within(screen.getAllByTestId("set-bilesen-satiri")[0]).getByText(SET_ADET_HATASI)).toBeTruthy();
    expect(durum.parts.find(p => p.id === 9).setIcerigi).toEqual([{ partId: 8, miktar: 2 }]);
  });
});

describe("Spec 0134: stoğa çevirme (R6/3)", () => {
  it("AC-72 / Karar 36: 0,114 kitli makina stoğa kaydedilince parça 1 adet düşer; 'Kiti Uygula' yuvarlanmış adedi kopyalar", () => {
    let st;
    function H() {
      const [stock, setStock] = useState([]);
      const [partStock, setPartStock] = useState([{ id: 1, partId: "7", miktar: 10 }]);
      const [partStockLog, setPartStockLog] = useState([]);
      st = { stock, partStock, partStockLog };
      return <MakinaStokTab stock={stock} setStock={setStock} models={[{ model: "AK100_DS", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 0.114 }] }]} showToast={vi.fn()}
        parts={[{ id: 7, ad: "Rulman", models: ["AK100_DS"] }]} partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} />;
    }
    render(<H />);
    fireEvent.click(screen.getByRole("button", { name: /Stoğa Makina Ekle/ }));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "AK100_DS" } });
    fireEvent.click(screen.getByRole("button", { name: /Kiti Uygula/ }));
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(st.stock[0].parcalar).toEqual([{ partId: "7", miktar: 1 }]);
    expect(st.partStock[0].miktar).toBe(9);
    expect(st.partStockLog).toEqual([expect.objectContaining({ partId: "7", miktar: -1, tip: "makina_uretimi" })]);
  });
  // Triyaj (bulgu 5): stok formuna elle ondalık adet girilen makina değişmeden yeniden kaydedilince karşı hareket yazılmaz
  // (karşılaştırma düşümle aynı yuvarlanmış adedi görür); ilk kayıtta 1,5 → 2 düşer.
  it("Bulgu 5: elle girilen 1.5 adet 2 düşer; makina değişmeden kaydedilince hareket geçmişi büyümez", () => {
    let st;
    function H() {
      const [stock, setStock] = useState([]);
      const [partStock, setPartStock] = useState([{ id: 1, partId: "7", miktar: 10 }]);
      const [partStockLog, setPartStockLog] = useState([]);
      st = { stock, partStock, partStockLog };
      return <MakinaStokTab stock={stock} setStock={setStock} models={[{ model: "AK100_DS", defaultParcalar: [] }]} showToast={vi.fn()}
        parts={[{ id: 7, ad: "Rulman", models: ["AK100_DS"] }]} partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} />;
    }
    render(<H />);
    fireEvent.click(screen.getByRole("button", { name: /Stoğa Makina Ekle/ }));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "AK100_DS" } });
    fireEvent.click(screen.getByRole("button", { name: /Parça Ekle/ }));
    const secici = screen.getAllByRole("combobox").find(c => [...c.options].some(o => o.value === "7"));
    fireEvent.change(secici, { target: { value: "7" } });
    const adet = [...document.querySelectorAll('input[type="number"]')].pop();
    fireEvent.change(adet, { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(st.partStock[0].miktar).toBe(8);
    const once = st.partStockLog.length;
    fireEvent.click(document.querySelector("tbody tr button.btn--ghost")); // satırın düzenle düğmesi (ilk ghost düğme)
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(st.partStockLog.length).toBe(once);
    expect(st.partStock[0].miktar).toBe(8);
  });
});
