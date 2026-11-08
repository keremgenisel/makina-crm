// @vitest-environment jsdom
// Spec 0134 R9, R21/2, C4, Karar 28: emniyet payı kartlarda girilir (gerçek Settings). Parça kartında malzeme bölümünde firenin
// komşusunda (malzemesiz hazır parçada da), malzeme kartında firenin komşusunda; 0–100 dışı reddedilir; boş pay gövdeye girmez.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { EMNIYET_PAYI_HATASI } from "../../src/lib/malzeme";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], tedarikciler: [], setTedarikciler: vi.fn(),
};
const P304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, fire: 8 };
const PARCALAR = [
  { id: 41, ad: "Kesme mili", models: [], malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78 } },
  { id: 42, ad: "Pul", models: [], maliyet: 5 },
];
let durum;
function H({ tab = "yedekparca", m0 = [P304] }) {
  const [parts, setParts] = useState(structuredClone(PARCALAR));
  const [malzemeler, setMalzemeler] = useState(structuredClone(m0));
  durum = { parts, malzemeler };
  return <Settings {...BASE} initialTab={tab} parts={parts} setParts={setParts} rawParts={parts} malzemeler={malzemeler} setMalzemeler={setMalzemeler} rawMalzemeler={malzemeler} giderYetki />;
}
const duzenle = (ad) => fireEvent.click(screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean).querySelector('button[title="Düzenle"], button.btn--ghost'));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);

describe("Spec 0134: parça kartında emniyet payı", () => {
  it("AC-59: malzeme satırlı parçada pay girilir, kaydedilip yeniden açılınca korunur", () => {
    render(<H />);
    duzenle("Kesme mili");
    // Spec 0135 ile (R6, R6/2): pay malzeme bölümünün ızgarasından çıktı, kip seçicisinin altındaki kendi yerinde (iki kipte de
    // çizilir); "firenin komşusu" iddiası yeni yere göre güncellendi, payın parçanın kendi alanı olduğu iddiası korunur.
    const pay = screen.getByLabelText("Parça emniyet payı");
    expect(pay.closest("[data-testid='emniyet-payi-alani']")).toBeTruthy();
    expect(pay.closest("[data-testid='kalem-listesi']")).toBeNull();
    fireEvent.change(pay, { target: { value: "10" } });
    kaydet();
    expect(kayit(41).emniyetPayi).toBe(10);
    expect(kayit(41).malzemeSatiri).not.toHaveProperty("emniyetPayi");
    duzenle("Kesme mili");
    expect(screen.getByLabelText("Parça emniyet payı").value).toBe("10");
  });
  it("Karar 28: malzemesiz hazır parçada da pay girilir; malzeme kalemi kaldırılınca pay kaybolmaz", () => {
    render(<H />);
    duzenle("Pul");
    fireEvent.change(screen.getByLabelText("Parça emniyet payı"), { target: { value: "12,5" } });
    kaydet();
    expect(kayit(42).emniyetPayi).toBe(12.5);
    duzenle("Kesme mili");
    fireEvent.change(screen.getByLabelText("Parça emniyet payı"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Malzeme kalemini kaldır 1" })); // spec 0135 ile: kalem listesinden kaldırılır
    kaydet();
    expect(kayit(41)).toMatchObject({ emniyetPayi: 5 });
    expect(kayit(41)).not.toHaveProperty("malzemeSatiri");
    expect(kayit(41)).not.toHaveProperty("maliyetKalemleri");
  });
  it("AC-21: 0–100 dışı reddedilir, nedeni alanın altında; kayıt yazılmaz", () => {
    render(<H />);
    duzenle("Pul");
    fireEvent.change(screen.getByLabelText("Parça emniyet payı"), { target: { value: "150" } });
    kaydet();
    expect(screen.getByText(EMNIYET_PAYI_HATASI)).toBeTruthy();
    expect(kayit(42)).not.toHaveProperty("emniyetPayi");
  });
  it("AC-58: payı boş bırakılan parça kaydedilince gövdesi aynı kalır (anahtar yok)", () => {
    render(<H />);
    duzenle("Pul"); kaydet();
    const k = { ...kayit(42) }; delete k.maliyetGecmisi;
    expect(k).toEqual(PARCALAR[1]);
  });
});

describe("Spec 0134: malzeme kartında emniyet payı", () => {
  it("AC-60 / AC-21: pay firenin komşusunda girilir, kaydedilip yeniden açılınca korunur; aralık dışı reddedilir", () => {
    render(<H tab="malzemeler" />);
    fireEvent.click(screen.getByRole("button", { name: "304 Paslanmaz düzenle" }));
    const fire = screen.getByLabelText("Varsayılan fire"); const pay = screen.getByLabelText("Malzeme emniyet payı");
    expect(fire.closest("div[style*='grid']")).toBe(pay.closest("div[style*='grid']"));
    fireEvent.change(pay, { target: { value: "-1" } });
    kaydet();
    expect(screen.getByText(EMNIYET_PAYI_HATASI)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Malzeme emniyet payı"), { target: { value: "7" } });
    kaydet();
    expect(durum.malzemeler[0].emniyetPayi).toBe(7);
    fireEvent.click(screen.getByRole("button", { name: "304 Paslanmaz düzenle" }));
    expect(screen.getByLabelText("Malzeme emniyet payı").value).toBe("7");
  });
  it("AC-58: payı boş malzeme kaydedilince anahtar yazılmaz", () => {
    render(<H tab="malzemeler" />);
    fireEvent.click(screen.getByRole("button", { name: "304 Paslanmaz düzenle" }));
    kaydet();
    expect(durum.malzemeler[0]).not.toHaveProperty("emniyetPayi");
  });
});
