// @vitest-environment jsdom
// Spec 0002 triyaj bulgu 3: "geri dönen" stok satırının tanınması düzenlenebilir not metnine bağlı. Üretim
// tarihi taşımayan eski satır düzenlenip notu değişirse makina dönüş ayında yeniden "üretilmiş" sayılırdı.
// Düzeltme: düzenleme kaydında özgün tarih (çöpteki müşteriden) satıra yazılır; formda da görünür.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";
import { hesaplaMakinaMaliyetleri } from "../../src/lib/makinaMaliyeti";
import { GERI_DONEN_STOK_NOTU } from "../../src/lib/musteriKaskad";

afterEach(cleanup);

const COP = [{ id: 1, name: "Silinen", model: "AK100", serialNo: "S-9", deletedAt: "2026-09-02T10:00:00Z", uretimTarihi: "2026-03-05", installDate: "2026-04-01" }];
const eskiSatir = { id: 50, model: "AK100", serialNo: "S-9", addedDate: "2026-09-02", note: GERI_DONEN_STOK_NOTU, parcalar: [] };

function kur(stock) {
  const durum = { stock };
  const setStock = vi.fn(u => { durum.stock = typeof u === "function" ? u(durum.stock) : u; });
  render(<MakinaStokTab stock={durum.stock} setStock={setStock} models={[{ model: "AK100" }]} showToast={vi.fn()} parts={[]} partStock={[]}
    setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} copMusteriler={COP} />);
  return durum;
}
const duzenle = () => {
  const dugmeler = within(screen.getByText("S-9").closest("tr")).getAllByRole("button");
  fireEvent.click(dugmeler[dugmeler.length - 2]);
};

describe("Geri dönen stok satırı: üretim tarihi not metnine bağlı kalmaz", () => {
  it("eski satır düzenlenip notu değişse de özgün üretim tarihi satıra yazılır", () => {
    const durum = kur([eskiSatir]);
    duzenle();
    fireEvent.change(screen.getByPlaceholderText("İsteğe bağlı not..."), { target: { value: "Depoya alındı" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.stock[0]).toMatchObject({ note: "Depoya alındı", uretimTarihi: "2026-03-05" });
  });
  it("AC-44 (eski satır, not değişmiş): tarih yazıldıktan sonra makina dönüş ayında üretim sayılmaz", () => {
    const durum = kur([eskiSatir]);
    duzenle();
    fireEvent.change(screen.getByPlaceholderText("İsteğe bağlı not..."), { target: { value: "Depoya alındı" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const s = hesaplaMakinaMaliyetleri({ customers: COP, stock: durum.stock, standardModels: [{ model: "AK100" }], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-24" });
    expect(s.aylar.get("2026-09").uretimAdedi).toBe(0);
    expect(s.aylar.get("2026-03").uretimAdedi).toBe(1);
  });
  it("üretim tarihi taşıyan satırda form, maliyetin stoğa giriş tarihini değil bu tarihi kullandığını söyler", () => {
    kur([{ ...eskiSatir, uretimTarihi: "2026-03-05" }]);
    duzenle();
    expect(screen.getByTestId("stok-uretim-tarihi").textContent).toMatch(/05\.03\.2026|05\/03\/2026/);
  });
  it("normal stok satırı düzenlemesine üretim tarihi eklenmez", () => {
    const durum = kur([{ id: 51, model: "AK100", serialNo: "S-9", addedDate: "2026-05-01", note: "", parcalar: [] }]);
    duzenle();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.stock[0].uretimTarihi).toBeUndefined();
    expect(screen.queryByTestId("stok-uretim-tarihi")).toBeNull();
  });
});
