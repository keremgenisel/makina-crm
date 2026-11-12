// @vitest-environment jsdom
// Kullanıcı isteği (2026-11-10): malzeme kartının alan sırası. Yeni malzemede: ad, alaşım, Ana tedarikçi; özgül ağırlık, varsayılan
// fire, geldiği boy, asgari sipariş; fiyat (para birimi, kilo fiyatı, kur, boy fiyatı); çap bandına göre ek fire; çap bandı (fiyat
// bantları). Düzenlemede fiyat özeti aynı yerde, ek fire arkasında; fiyat penceresi çap bandını kendi içinde çizmeye devam eder.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); });

const P304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, bantlar: [{ alt: 0, fiyat: 2.9 }] };
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.57.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(),
  parts: [], rawParts: [], setParts: vi.fn(), rates: { usd: 42, eur: 48 },
};
function Panel({ giderYetki = true }) {
  const [m, setM] = useState([P304]);
  return <Settings {...BASE} initialTab="malzemeler" malzemeler={m} rawMalzemeler={m} setMalzemeler={setM} giderYetki={giderYetki} tedarikciler={[{ id: 12, ad: "Ana Çelik", hammadde: true }]} />;
}
// Belge sırasıyla: önce gelen öğe sonrakinden önce mi (DOCUMENT_POSITION_FOLLOWING = 4).
const once = (a, b) => !!(a.compareDocumentPosition(b) & 4);
const sirali = (els) => els.every((e, i) => i === 0 || once(els[i - 1], e));

describe("Malzeme kartının alan sırası (kullanıcı isteği 2026-11-10)", () => {
  it("yeni malzeme: ad, alaşım, Ana tedarikçi; ölçüler; fiyat; ek fire; çap bandı", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    fireEvent.change(screen.getByLabelText("Fiyatın para birimi"), { target: { value: "USD" } });
    const el = [screen.getByLabelText("Malzeme adı"), screen.getByLabelText("Alaşım"), screen.getByLabelText("Ana tedarikçi"),
      // Spec 0143 ile (A-R2, A-R3): geldiği boy ve boy fiyatı alanları kalktı; öteki sıra aynı.
      screen.getByLabelText("Özgül ağırlık"), screen.getByLabelText("Varsayılan fire"), screen.getByLabelText("Asgari sipariş"),
      screen.getByLabelText("Fiyatın para birimi"), screen.getByLabelText("Kilo fiyatı"), screen.getByLabelText("Kur"),
      screen.getByTestId("fire-kg-bolumu"), screen.getByTestId("fiyat-bant-bolumu")];
    expect(sirali(el)).toBe(true);
    expect(screen.getAllByTestId("bant-listesi")).toHaveLength(1); // çap bandı tek yerde
    expect(screen.queryByLabelText("Geldiği boy")).toBeNull(); expect(screen.queryByLabelText("Boy fiyatı")).toBeNull(); // spec 0143 AC-2, AC-3
  });
  it("gider yetkisi olmadan Ana tedarikçi yok, öteki sıra aynı", () => {
    render(<Panel giderYetki={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    expect(screen.queryByLabelText("Ana tedarikçi")).toBeNull();
    expect(sirali([screen.getByLabelText("Alaşım"), screen.getByLabelText("Özgül ağırlık"), screen.getByLabelText("Kilo fiyatı"), screen.getByTestId("fire-kg-bolumu"), screen.getByTestId("fiyat-bant-bolumu")])).toBe(true);
  });
  it("düzenleme (spec 0143 ile): Ana tedarikçi alaşımın arkasında; fiyat özeti asgari siparişten sonra, ek fire en sonda; çap bandı düzenleyicisi kartta yok", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: "304 Paslanmaz düzenle" }));
    expect(sirali([screen.getByLabelText("Alaşım"), screen.getByLabelText("Ana tedarikçi"), screen.getByLabelText("Asgari sipariş"),
      screen.getByTestId("malzeme-fiyat-ozeti"), screen.getByTestId("fire-kg-bolumu")])).toBe(true);
    expect(screen.queryByTestId("fiyat-bant-bolumu")).toBeNull();
  });
});
