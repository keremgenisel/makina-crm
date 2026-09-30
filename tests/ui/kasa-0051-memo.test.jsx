// @vitest-environment jsdom
// Spec 0051 triyaj: Kasa'nın hesapsız özeti bellekte; anahtar kapalıyken eşik bilgisi süzülmüş özetin kendisidir.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("../../src/lib/kasa", async (importOriginal) => {
  const m = await importOriginal();
  return { ...m, hesapsizOzeti: vi.fn(m.hesapsizOzeti) };
});
const { Kasa } = await import("../../src/components/Kasa");
const { hesapsizOzeti } = await import("../../src/lib/kasa");

afterEach(() => { cleanup(); hesapsizOzeti.mockClear(); });
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }];
const H = [{ id: 1, tur: "odeme", tarih: "2026-05-10", tutar: 10, hesapId: null, giderId: 1 }, { id: 2, tur: "odeme", tarih: "2026-07-10", tutar: 10, hesapId: null, giderId: 1 }];
const props = { kasaHesaplari: HESAP, setKasaHesaplari: vi.fn(), hesapHareketleri: H, setHesapHareketleri: vi.fn(), giderAyarlari: { hesapsizBaslangic: "2026-06-01" }, showToast: vi.fn(),
  // App bu dizileri kararlı verir; varsayılan parametreler her çizimde yeni dizi üretirdi.
  payments: [], services: [], partSales: [], yedekParcaSatislar: [], customers: [], dealers: [], cekler: [], giderler: [], giderTurleri: [], tedarikciler: [], calisanlar: [] };

describe("Spec 0051 triyaj: hesapsız özet bellekte", () => {
  it("ilk çizimde tek hesap; aynı verilerle yeniden çizimde hesap yok; 'Hepsini göster' açıkken eşik bilgisi ayrıca hesaplanır", () => {
    const { rerender } = render(<Kasa {...props} />);
    expect(hesapsizOzeti).toHaveBeenCalledTimes(1);
    rerender(<Kasa {...props} />);
    expect(hesapsizOzeti).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Hepsini göster"));
    expect(hesapsizOzeti).toHaveBeenCalledTimes(3); // hepsi + eşik bilgisi
    expect(screen.getByTestId("hesapsiz-odeme-satiri").textContent).toMatch(/ödemeler: 2/);
  });
});
