// @vitest-environment jsdom
// Spec 0163 ekranları: Model Maliyetleri yetim satırı çizmez (AC-10, AC-24), sipariş penceresinde değişen tek şey `siparis-eksik`
// satırıdır (AC-43, altın spec öncesi koddan `YAZ_0163=1`), "Kiti Uygula" listesi ve sayısı çözülmüş kümedir, kayıtlı stok kopyası
// ve düşüm dokunulmaz (AC-16, AC-36, AC-45), model kartı yetim satırı adıyla çizip sildirmeye devam eder (AC-26, R6).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import fs from "node:fs";
import { ModelMaliyetleri } from "../../src/components/maliyet/ModelMaliyetleri";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";
import { Settings } from "../../src/components/Settings";
import { modelMaliyetleri } from "../../src/lib/makinaStandartMaliyet";
import * as F from "../fixtures/0163-veri.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); delete window.crmLocks; });

const ALTIN = "tests/fixtures/0163-pencere-once.json";

describe("Spec 0163: Model Maliyetleri", () => {
  const ciz = (modeller) => render(<ModelMaliyetleri pay={{ payK: 1000, durum: "ayarsiz" }} gercek={null} canDo={() => true} baskasiKilitli={() => false} showToast={vi.fn()}
    modeller={modelMaliyetleri({ standardModels: [], customModels: modeller, parts: F.PARCALAR, malzemeler: F.MALZEMELER }, 1000)} />);
  const ac = (m) => fireEvent.click(within(screen.getByTestId(`model-satiri-${m}`)).getAllByRole("button")[0]);
  it("AC-10 / AC-11: Ölçüm 2 şeklinde yetim satır çizilmez ve eksik ibaresi yok", () => {
    ciz([F.SWP_DSC]);
    ac("SWP140_DSC");
    const d = screen.getByTestId("dokum-SWP140_DSC");
    expect(within(d).getAllByText("Kalıp mili")).toHaveLength(1);
    expect(d.textContent).not.toMatch(/silinmiş ya da yok/);
    expect(within(screen.getByTestId("model-satiri-SWP140_DSC")).queryByTestId("eksik-isareti")).toBeNull();
  });
  it("AC-18 / AC-24: kardeşsiz yetim çözülen adla; çözülemeyen satır ibaresiyle", () => {
    ciz([F.AK_TEK]);
    ac("AK_TEK");
    const t = screen.getByTestId("dokum-AK_TEK").textContent;
    expect(t).toContain("Rulman Yatağı");
    expect(t).not.toMatch(/rulman yatağı /);
    expect(t.match(/parça silinmiş ya da yok/g)).toHaveLength(4);
  });
});

describe("Spec 0163: sipariş penceresi (AC-43)", () => {
  const veri = { parts: F.CANLI, hamParts: F.PARCALAR, partStock: [{ partId: 202, miktar: 5 }], malzemeler: F.MALZEMELER, tedarikciler: F.TEDARIKCILER, hamTedarikciler: F.TEDARIKCILER,
    standardModels: [F.SWP_DSC], customModels: [F.SWP_DS], appSettings: {}, factory: null,
    uretimPartileri: [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { SWP140_DSC: 10, SWP140_DS: 6 } }] };
  it("değişen tek şey siparis-eksik satırı", () => {
    render(<SiparisPenceresi veri={veri} bugun="2026-11-25" onClose={vi.fn()} />);
    const p = screen.getByTestId("siparis-penceresi");
    const eksik = screen.getByTestId("siparis-eksik").textContent;
    const govde = p.textContent.replace(eksik, "«eksik»");
    if (process.env.YAZ_0163 === "1") { fs.writeFileSync(ALTIN, JSON.stringify({ govde, eksik }, null, 1) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(ALTIN, "utf8"));
    expect(govde).toBe(a.govde);
    expect(eksik).not.toBe(a.eksik);
    expect(a.eksik).toMatch(/1 parçanın/);
  });
});

describe("Spec 0163: Kiti Uygula (AC-16, AC-36, AC-45)", () => {
  const MODEL = { model: "SWP140_DSC", defaultParcalar: [F.SWP_DSC.defaultParcalar[0], F.SWP_DSC.defaultParcalar[1], { partId: "9001", ad: "rulman yatağı", miktar: 2 }, { partId: "9002", ad: "Yok böyle parça", miktar: 1 }] };
  let st;
  function H() {
    const [stock, setStock] = useState([{ id: 1, model: "SWP140_DSC", serialNo: "ESKI", parcalar: [{ partId: F.OLU, miktar: 1 }] }]);
    const [partStock, setPartStock] = useState([{ partId: 201, miktar: 10 }]);
    const [partStockLog, setPartStockLog] = useState([]);
    st = { stock, partStock, partStockLog };
    return <MakinaStokTab stock={stock} setStock={setStock} models={[MODEL]} showToast={vi.fn()} parts={F.CANLI}
      partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog} />;
  }
  it("liste ve sayı çözülmüş küme; R2 ile düşen satır yok, R3 çözülen kimlikle; kayıtlı eski kopya dokunulmaz", () => {
    render(<H />);
    fireEvent.click(screen.getByRole("button", { name: /Stoğa Makina Ekle/ }));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "SWP140_DSC" } });
    const dugme = screen.getByRole("button", { name: /Kiti Uygula/ });
    expect(dugme.textContent).toMatch(/Kiti Uygula \(3 parça\)/);
    fireEvent.click(dugme);
    const secili = screen.getAllByRole("combobox").slice(1).map(s => s.value);
    expect(secili).toEqual(["1784817123366", "201", "9002"]);
    const adlar = screen.getAllByRole("combobox").slice(1).map(s => s.options[s.selectedIndex].textContent);
    expect(adlar.slice(0, 2)).toEqual(["Kalıp mili", "Rulman Yatağı"]);
    expect(adlar.filter(a => a === "?").length).toBe(1); // AC-45 yalnız hiçbir yoldan çözülemeyen (R4) satır kalır, ölü kardeş değil
    expect(st.stock[0].parcalar).toEqual([{ partId: F.OLU, miktar: 1 }]); // R5/2, R5/4
    expect(st.partStockLog).toEqual([]);
  });
});

describe("Spec 0163: model kartı (AC-26, R6)", () => {
  it("yetim satır kart listesinde adıyla durur ve silinebilir", () => {
    const BASE = { customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
      version: "3.64.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
      calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem" };
    let modeller;
    function K() {
      const [std, setStd] = useState([structuredClone(F.SWP_DSC)]);
      modeller = std;
      return <Settings {...BASE} initialTab="models" parts={F.CANLI} setParts={vi.fn()} standardModels={std} setStandardModels={setStd} customModels={[]} setCustomModels={vi.fn()} rawParts={F.PARCALAR} rawCustomModels={[]} />;
    }
    render(<K />);
    fireEvent.click(within(screen.getByText("SWP140_DSC").closest("tr")).getByTitle("Düzenle"));
    expect(screen.getAllByLabelText("Kalıp mili kit adedi")).toHaveLength(2);
    fireEvent.click(screen.getAllByLabelText("Kalıp mili kit adedi")[0].nextElementSibling);
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(modeller[0].defaultParcalar.map(r => r.partId)).toEqual(["1784817123366", "202"]);
  });
});
