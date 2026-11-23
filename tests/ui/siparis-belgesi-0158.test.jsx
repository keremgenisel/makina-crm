// @vitest-environment jsdom
// Spec 0158 B, C: sipariş penceresi. Ölçü hücresi belgeyle aynı motor alanını basar (AC-64), bilgi alanları adın altında (AC-24),
// ekran parça adedini gösterir ve elle düzenleme parça adedini alır, belge kesilecek adedi yazar (AC-35, AC-36), ibare (AC-37).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import * as S from "../../src/lib/siparisIhtiyaci";
import { NUSHA_TESTID } from "../../src/components/rapor/NushaSecPenceresi";
import { PARCALAR, MALZEMELER, TEDARIKCILER, kit } from "../fixtures/0158-dolu.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); delete window.appPrint; });

const PARTI = [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK: 70 } }];
const VERI = (parts = PARCALAR) => ({ parts, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, hamTedarikciler: TEDARIKCILER,
  standardModels: kit(parts), customModels: [], uretimPartileri: PARTI, appSettings: {}, factory: { name: "Altuntaş" } });
const kur = (parts) => {
  const printHtml = vi.fn(); window.appPrint = { printHtml };
  render(<SiparisPenceresi veri={VERI(parts)} bugun="2026-11-23" onClose={vi.fn()} />);
  return { printHtml };
};
const bolum = (ad) => screen.getAllByTestId("siparis-tedarikci-bolumu").find(b => within(b).getByTestId("siparis-tedarikci-adi").textContent === ad);
const hazirSatiri = (b, ad) => within(bolum(b)).getAllByTestId("siparis-hazir-satiri").find(r => r.querySelector("b").textContent === ad);
const motor = (parts = PARCALAR) => S.siparisIhtiyaci({ modeller: kit(parts), satirlar: [{ model: "AK", adet: "70" }], parts, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER }, { tedarikciOdakli: true });

describe("Spec 0158: sipariş penceresi", () => {
  it("AC-24 / R15/2 / P17: dolu hammadde ve cins adın altında, ölçü Ölçü sütununda; elle girilmiş eski ölçü gösterilmez; sütun sayısı değişmez", () => {
    kur();
    const r = hazirSatiri("Aksu CNC", "Cıvata M8");
    expect(within(r).getByTestId("siparis-parca-bilgi").textContent).toBe("Paslanmaz A2 · DIN 933");
    expect(within(r).getByTestId("siparis-olcu").textContent).toBe("M8 × 40");
    expect(hazirSatiri("Aksu CNC", "100_AYNA MAHRUTİ DİŞLİSİ TAKIM").textContent).not.toContain("elle yazılmış eski ölçü");
    expect(within(hazirSatiri("Aksu CNC", "Rulman")).queryByTestId("siparis-parca-bilgi")).toBeNull();
    expect(within(bolum("Aksu CNC")).getByTestId("siparis-hazir-tablosu").querySelectorAll("th")).toHaveLength(7);
  });
  it("AC-64: pencerenin Ölçü hücresi belgenin Ölçü hücresiyle aynı motor alanını basar (serbest ölçü ve kesit)", () => {
    kur();
    const m = motor();
    const pencereOlcu = (ad) => within(hazirSatiri("Aksu CNC", ad)).queryAllByTestId("siparis-olcu").map(e => e.textContent);
    const belgeOlcu = (ad) => m.tedarikciBolumleri.belge.flatMap(b => b.satirlar).find(x => x.ad === ad).olcuSatirlari;
    expect(pencereOlcu("Cıvata M8")).toEqual(belgeOlcu("Cıvata M8"));
    expect(pencereOlcu("100_AYNA MAHRUTİ DİŞLİSİ TAKIM")).toEqual(belgeOlcu("100_AYNA MAHRUTİ DİŞLİSİ TAKIM"));
  });
  it("AC-35 / AC-37: ekran parça adedini gösterir; belgede kesilecek adet yazılacağını söyleyen ibare görünür", () => {
    kur();
    expect(within(hazirSatiri("Aksu CNC", "100_AYNA MAHRUTİ DİŞLİSİ TAKIM")).getByTestId("siparis-oneri").textContent).toBe("70");
    expect(screen.getByTestId("siparis-kesim-ibaresi").textContent).toBe(S.KESIM_IBARESI);
  });
  it("AC-37: kalem adedi birden büyük parça yoksa ibare yok", () => {
    kur(PARCALAR.filter(p => [4, 5, 11].includes(p.id)));
    expect(screen.queryByTestId("siparis-kesim-ibaresi")).toBeNull();
  });
  it("AC-36: ekrandaki elle düzenleme parça adedini alır; basılan belge 35 takımı 70 kesim olarak yazar", () => {
    const { printHtml } = kur();
    fireEvent.change(screen.getByLabelText("100_AYNA MAHRUTİ DİŞLİSİ TAKIM sipariş adedi"), { target: { value: "35" } });
    fireEvent.click(screen.getByTestId("siparis-yazdir")); fireEvent.click(screen.getByTestId(NUSHA_TESTID.fiyatsiz));
    const html = printHtml.mock.calls[0][0];
    expect(html).toMatch(/>70<div style="font-size:9\.5px;color:#64748b;">35 parça × 2<\/div><\/td>/);
  });
});
