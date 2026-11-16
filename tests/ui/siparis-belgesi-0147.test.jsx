// @vitest-environment jsdom
// Spec 0147 R10 (AC-16): sipariş penceresinin Ölçü sütunu belgeyle aynı mm'li ölçü metnini gösterir; metin motorun tek ölçü
// kurucusundan (`olcuMetni`) gelir, pencere ikinci bir "mm" yazmaz (C4). Pencerenin bölümlemesi değişmez (C2).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import * as S from "../../src/lib/siparisIhtiyaci";
import { PARCALAR, MALZEMELER, TEDARIKCILER, MODELLER } from "../fixtures/0142-veri.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(cleanup);

const PARTI = [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } }];
const VERI = { parts: PARCALAR, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, hamTedarikciler: TEDARIKCILER,
  standardModels: MODELLER.standardModels, customModels: [], uretimPartileri: PARTI, appSettings: {}, factory: { name: "Altuntaş" } };
const bolum = (ad) => screen.getAllByTestId("siparis-tedarikci-bolumu").find(b => within(b).getByTestId("siparis-tedarikci-adi").textContent === ad);
const satir = (b, ad) => within(bolum(b)).getAllByTestId("siparis-hazir-satiri").find(r => r.querySelector("b").textContent === ad);
const olcu = (r) => within(r).queryAllByTestId("siparis-olcu").map(e => e.textContent);

describe("Spec 0147: pencerenin Ölçü sütunu", () => {
  it("AC-16: pencerenin Ölçü sütunu mm'li metni gösterir (belgeyle aynı)", () => {
    render(<SiparisPenceresi veri={VERI} bugun="2026-11-11" onClose={vi.fn()} />);
    expect(olcu(satir("Beta Plastik", "Kalın mil"))).toEqual([S.olcuMetni("mil", [62], 178)]);
    expect(olcu(satir("Beta Plastik", "Kalın mil"))).toEqual(["Ø62 × 178 mm"]);
    for (const e of screen.getAllByTestId("siparis-olcu")) if (e.textContent) expect(e.textContent).toMatch(/\d mm( · parça başına \d+)?$/);
    expect(document.body.textContent).not.toMatch(/mm mm/);
  });
  it("AC-16 / C2: pencerede hammadde başlığı yok; bölümleme Ana tedarikçiye göre aynen", () => {
    render(<SiparisPenceresi veri={VERI} bugun="2026-11-11" onClose={vi.fn()} />);
    expect(screen.queryByText(S.HAZIR_PARCALAR_BASLIGI)).toBeNull();
    expect(screen.queryByText(S.MALZEMESI_BELIRTILMEMIS_BASLIGI)).toBeNull();
    expect(satir("Beta Plastik", "Kalın mil")).toBeTruthy(); // malzemesi Alfa'da, Ana tedarikçisi Beta
  });
});
