// @vitest-environment jsdom
// Spec 0115 A ve E: parça tipi panelinin dördüncü bayrağı, parça kartının tip ipucusu ve Makina Geçmişi'nin servis satırı.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import fs from "node:fs";
import { PartTypeManager } from "../../src/components/PartTypeManager";
import { PartManager } from "../../src/components/PartManager";
import { Customers } from "../../src/components/Customers";
import { tamirSatiriKur, PARCA_TIP_IPUCU, KALIP_ISI_BAYRAGI } from "../../src/lib/kalipTamiri";
import { emptyRow } from "../../src/components/stock/uretimFormModel";
import { KDV, PART_TYPES, PARTS, CUSTOMERS, SERVICES, PART_SALES, URETIM_FORMLARI, KALIP_DEFS } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.appPrint; });

describe("Spec 0115 parça tipi paneli (R1/2, R2)", () => {
  let dis;
  const Kap = ({ ilk }) => { const [t, setT] = useState(ilk); dis = t; return <PartTypeManager partTypeDefs={t} setPartTypeDefs={setT} parts={[]} />; };
  it("AC-1: her tip satırında dördüncü kutu; sistem tiplerinde pasif", () => {
    render(<Kap ilk={PART_TYPES} />);
    const kutular = screen.getAllByRole("button", { name: new RegExp(KALIP_ISI_BAYRAGI) });
    expect(kutular).toHaveLength(PART_TYPES.length + 1); // ekleme satırı + her tip
    expect(kutular.slice(1).every(b => b.disabled)).toBe(true);
  });
  it("AC-4: bayrak kullanıcı tipine verilir, iki tip aynı bayrağı taşır; diğer bayraklara bağlı değildir", () => {
    render(<Kap ilk={PART_TYPES} />);
    const ekle = (ad) => {
      fireEvent.change(screen.getByPlaceholderText(/Örn: Filtre/), { target: { value: ad } });
      fireEvent.click(screen.getAllByRole("button", { name: new RegExp(KALIP_ISI_BAYRAGI) })[0]);
      fireEvent.click(screen.getByRole("button", { name: /Ekle/ }));
    };
    ekle("Kalıp Revize"); ekle("Kalıp Yeni Yapım");
    const k = dis.filter(t => t.kalipIsi);
    expect(k.map(t => t.ad)).toEqual(["Kalıp Revize", "Kalıp Yeni Yapım"]);
    expect(k.every(t => !t.makinaSecici && !t.stokDus && !t.sistem)).toBe(true);
    const satir = screen.getByText("Kalıp Revize").closest("div[style]").parentElement;
    fireEvent.click(within(satir).getByRole("button", { name: new RegExp(KALIP_ISI_BAYRAGI) }));
    expect(dis.find(t => t.ad === "Kalıp Revize").kalipIsi).toBe(false);
  });
});

describe("Spec 0115 parça kartı ipucusu (R6, R6/2)", () => {
  it("AC-11: tipi kalıp işi olmayan, adı desene uyan parçada ipucu görünür ve kayıt engellenmez; tip kalıp işi ise ipucu yok", () => {
    const setParts = vi.fn();
    const tipler = [...PART_TYPES, { id: "t", ad: "Kalıp Revize", renk: "blu", kalipIsi: true, sistem: false }];
    render(<PartManager parts={PARTS} setParts={setParts} partTypeDefs={tipler} showToast={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button").find(b => /Parça\/Yedek Parça Ekle/.test(b.textContent)));
    const ad = screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti");
    fireEvent.change(ad, { target: { value: "KALIP MİLİ" } });
    expect(screen.queryByTestId("parca-kalip-tip-ipucu")).toBeNull();
    fireEvent.change(ad, { target: { value: "44*80 ERKEK KALIPLAR REVİZE" } });
    expect(screen.getByTestId("parca-kalip-tip-ipucu").textContent).toContain(PARCA_TIP_IPUCU);
    fireEvent.click(screen.getByRole("button", { name: "Kalıp Revize" }));
    expect(screen.queryByTestId("parca-kalip-tip-ipucu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Standart" }));
    expect(screen.getByTestId("parca-kalip-tip-ipucu")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button").filter(b => b.textContent.trim() === "Kaydet").pop());
    expect(setParts).toHaveBeenCalled(); // engel değil
  });
});

describe("Spec 0115 Makina Geçmişi (R34, R38)", () => {
  const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }, { id: 2, ad: "HAMBURGER", olcu: "Ø98" }];
  const SV = [...SERVICES.map(s => (s.id === 41 ? { ...s, atolyeKaliplari: LISTE } : s)),
    { id: 43, customerId: 1, date: "2026-10-20", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", currency: "TRY", degisenParcalar: [] }];
  const formlar = [{ ...URETIM_FORMLARI[0], satirlar: [...URETIM_FORMLARI[0].satirlar, { ...tamirSatiriKur(emptyRow(), SV[0], LISTE[0], CUSTOMERS[0]), tamamlandi: true }] }];
  const ac = () => render(<Customers customers={CUSTOMERS} setCustomers={vi.fn()} services={SV} setServices={vi.fn()} partSales={PART_SALES} setPartSales={vi.fn()}
    payments={[]} dealers={[]} parts={PARTS} kdvRates={KDV} gorusmeler={[]} dosyalar={[]} uretimFormlari={formlar} kalipDefs={KALIP_DEFS}
    factory={{ name: "Altuntaş Makina" }} initialDetailId={1} />);
  const satir = (re) => screen.getAllByTitle("Düzenlemek için tıklayın").find(e => re.test(e.textContent)).closest("[data-odak-servis], div[style]").parentElement.parentElement;
  it("AC-57: kalıp taşıyan servis satırı rozet ve kalıp adlarını gösterir (rozet pano ile aynı haritadan)", () => {
    ac();
    const r = satir(/Garanti Dışı/);
    expect(within(r).getByTestId("tamir-rozeti").textContent).toBe("KALIP ATÖLYEDE 1/2");
    // Spec 0117 ile (R24): başlık "Servis gören kalıplar".
    expect(within(r).getByTestId("gecmis-atolye-kaliplari").textContent).toBe("Servis gören kalıplar: 100_ERKEK KALIPLAR REVİZE, HAMBURGER · Ölçü: Ø98");
  });
  it("AC-58: kalıp taşımayan servis satırı rozet göstermez", () => {
    ac();
    expect(screen.getAllByTestId("tamir-rozeti")).toHaveLength(1);
    expect(screen.getAllByTestId("gecmis-atolye-kaliplari")).toHaveLength(1);
    // Triyaj: kalıpsız servis satırında Kargo Etiketi düğmesi de yok (içeriği boş etiket basılmasın).
    const kalipsiz = satir(/Periyodik Bakım/);
    expect(within(kalipsiz).queryByTitle("Kargo Etiketi Yazdır")).toBeNull();
    expect(within(satir(/Garanti Dışı/)).getByTitle("Kargo Etiketi Yazdır")).toBeTruthy();
  });
  // Spec 0117 ile (R11, R12): etiket üretim formundan panonun servis kartına taşındı; Makina Geçmişi'ndeki düğme aynen.
  it("AC-65: etiket düğmesi Makina Geçmişi servis satırında ve panonun servis kartında; üretim formunda yok", () => {
    const printHtml = vi.fn();
    window.appPrint = { printHtml };
    ac();
    const r = satir(/Garanti Dışı/);
    fireEvent.click(within(r).getByTitle("Kargo Etiketi Yazdır"));
    expect(printHtml).toHaveBeenCalled();
    expect(printHtml.mock.calls[0][0]).toContain("HAMBURGER · Ölçü: Ø98");
    expect(fs.readFileSync("src/components/stock/UretimFormu.jsx", "utf8")).not.toMatch(/tamirEtiket/);
    expect(fs.readFileSync("src/components/ServisPanosu.jsx", "utf8")).toMatch(/tamirEtiketYazdir\(sv, \{ customers, factory \}\)/);
  });
});
