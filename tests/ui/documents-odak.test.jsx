// @vitest-environment jsdom
// Genel aramadan "teklif/proforma" sonucuna tıklanınca belge DÜZENLEMEYE atlamamalı;
// servislerdeki gibi ilgili listede vurgulanıp gösterilmeli (openDocId → liste vurgusu).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { Documents } from "../../src/components/Documents";

const teklifler = [
  { id: 10, type: "teklif", no: "T-100", firma: "Genisel", tarih: "2026-07-01", createdAt: "2026-07-01", satirlar: [], currency: "TRY", dil: "TR", durum: "Taslak" },
  { id: 11, type: "teklif", no: "T-101", firma: "Başka", tarih: "2026-07-02", createdAt: "2026-07-02", satirlar: [], currency: "TRY", dil: "TR", durum: "Taslak" },
];

const props = (extra) => ({
  teklifler, setTeklifler: vi.fn(), faturalar: [], setFaturalar: vi.fn(), customers: [], partSales: [],
  allModels: [], factory: { name: "Altuntaş" }, appSettings: {}, showToast: vi.fn(), kalipDefs: [], parts: [],
  geoData: {}, loadingGeo: false, onDonusturTeklif: vi.fn(), onDonusturMakina: vi.fn(), onKaydetSatis: vi.fn(),
  serverPermissions: null, onDocOpenConsumed: vi.fn(), ...extra,
});

describe("Documents — arama belgesi listede vurgulanır (düzenlemeye atlamaz)", () => {
  it("openDocId gelince o belge satırı vurgulanır (edit'e girmeden)", () => {
    const onDocOpenConsumed = vi.fn();
    const { container } = render(<Documents {...props({ openDocId: 10, onDocOpenConsumed })} />);
    const vurgulu = container.querySelectorAll('[data-odak-belge="1"]');
    expect(vurgulu.length).toBe(1);                       // tek satır vurgulu
    expect(vurgulu[0].textContent).toContain("T-100");    // doğru belge
    expect(onDocOpenConsumed).toHaveBeenCalled();         // tüketildi (tekrar tetiklenmez)
  });

  it("openDocId yokken hiçbir belge vurgulanmaz", () => {
    const { container } = render(<Documents {...props({ openDocId: null })} />);
    expect(container.querySelectorAll('[data-odak-belge="1"]').length).toBe(0);
  });
});
