// @vitest-environment jsdom
// Spec 0097: Parti Hesabı'nın tarihli satırları, satır anahtarı, dönem kilitli pay ve iki ibare (ekran). Gerçek MakinaMaliyeti
// (App gibi bağlanır: canlı müşteriler + ham `tumMusteriler`, canlı parçalar). Rakamlar tests/fixtures/0097-veri.js'in başlığında.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { MakinaMaliyeti, BUGUNKU_AYAR_IBARESI } from "../../src/components/MakinaMaliyeti";
import { PAY_AYRIM_IBARESI } from "../../src/components/maliyet/PartiHesabi";
import { PARTI_NEDEN, PAY_KAYNAK_METNI, TARIHSIZ_SATIR_NEDENI } from "../../src/lib/makinaStandartMaliyet";
import * as V from "../fixtures/0097-veri";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-15T10:00:00")); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function MH({ parts = V.PARCALAR, customers = V.CUSTOMERS, tum = null, stock = V.STOCK, turler = V.TURLER, partiler = V.PARTILER }) {
  const [uretimPartileri, setUretimPartileri] = useState(partiler);
  return <MakinaMaliyeti giderler={V.GIDERLER} giderTurleri={turler} setGiderTurleri={vi.fn()} tedarikciler={[]} uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri}
    stock={stock} customers={customers} tumMusteriler={tum || customers} parts={parts} standardModels={V.STANDART} customModels={V.OZEL} setStandardModels={vi.fn()} setCustomModels={vi.fn()}
    appSettings={{ giderAyarlari: { yururlukAy: V.YURURLUK }, maliyetAyarlari: V.AYAR }} setAppSettings={vi.fn()} rates={{}} showToast={vi.fn()} baslangicGorunum="parti" />;
}
const parti = (id) => fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: String(id) } });
const hucreler = (tr) => within(tr).getAllByRole("cell").map(c => c.textContent);
const satirlar = () => [...screen.getByTestId("parti-tablosu").querySelectorAll("tbody tr")].map(tr => tr.getAttribute("data-testid"));

describe("Spec 0097: Parti Hesabı satırları (R10–R12/6)", () => {
  it("AC-19 / AC-20 / AC-21 / AC-50: aynı modelin iki maliyet grubu ve tarihsiz satırı ayrı satırda; anahtar uyarısı yok", () => {
    const hata = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<MH />);
    expect(satirlar()).toEqual(["parti-satiri-AK100#1", "parti-satiri-AK100#2", "parti-satiri-AK100#3", "parti-satiri-OZ"]);
    const s1 = screen.getByTestId("parti-satiri-AK100#1");
    expect(within(s1).getByTestId("parti-satir-araligi").textContent).toBe("01.2026");
    expect(hucreler(s1).slice(1, 3)).toEqual(["2", "26,00 ₺"]);
    expect(within(screen.getByTestId("parti-satiri-AK100#2")).getByTestId("parti-satir-araligi").textContent).toBe("02.2026");
    const s3 = screen.getByTestId("parti-satiri-AK100#3");
    expect(within(s3).queryByTestId("parti-satir-araligi")).toBeNull();
    expect(within(s3).getByTestId("parti-satir-neden").textContent).toBe(TARIHSIZ_SATIR_NEDENI);
    expect(hata.mock.calls.filter(c => /same key|unique "key"/.test(String(c[0])))).toEqual([]);
  });
  it("AC-50: tek gruplu model yalın adla", () => {
    render(<MH />);
    parti(2);
    expect(satirlar()).toEqual(["parti-satiri-AK100", "parti-satiri-OZ"]);
  });
  it("AC-27 / R16/3: satırın toplam maliyeti makina paylarının toplamından (artık kuruş), birim × adet değil", () => {
    render(<MH />);
    const h = hucreler(screen.getByTestId("parti-satiri-AK100#1"));
    expect(h[3]).toBe("1.500,00 ₺");
    expect(h[6]).toBe("3.052,01 ₺"); // 2 × 26,00 + 3.000,01 (artık kuruş ilk Ocak makinasında)
  });
});

describe("Spec 0097: genel gider payı ve ibareler (R16–R19/2)", () => {
  it("AC-26: Parti Hesabı'nın makina başı payı Üretim Partileri'ninkiyle aynı; sütun ibaresi bunu söyler", () => {
    render(<MH />);
    const pay = hucreler(screen.getByTestId("parti-satiri-AK100#2"))[3];
    fireEvent.click(screen.getByRole("radio", { name: "Üretim Partileri" }));
    const kis = screen.getAllByTestId("parti-satiri").find(s => s.textContent.includes("Kış"));
    expect(within(kis).getByTestId("parti-makina-basi").textContent).toBe(pay);
  });
  it("AC-53 / AC-26: pay ibaresi partinin kendi aylarını söyler; eski iki iddia yok; sabit ve testId korunur", () => {
    render(<MH />);
    const ibare = screen.getByTestId("pay-ayrim-ibaresi");
    expect(ibare.textContent).toBe(PAY_AYRIM_IBARESI);
    expect(PAY_AYRIM_IBARESI).toMatch(/kendi aylarının/);
    expect(PAY_AYRIM_IBARESI).toMatch(/Üretim Partileri'ndeki makina başı payla aynıdır/);
    expect(PAY_AYRIM_IBARESI).not.toMatch(/toplanmaz|hesap ayarlarının dönemi/i);
  });
  it("AC-29: planlanan satır payın kaynağını söyler: açık partide hesap ayarları, kapanmışta partinin ayları", () => {
    render(<MH />);
    expect(within(screen.getByTestId("parti-satiri-OZ")).getByTestId("pay-kaynagi").textContent).toBe(PAY_KAYNAK_METNI.parti);
    expect(hucreler(screen.getByTestId("parti-satiri-OZ"))[3]).toMatch(/^1\.500,00 ₺/);
    parti(2);
    expect(within(screen.getByTestId("parti-satiri-OZ")).getByTestId("pay-kaynagi").textContent).toBe(PAY_KAYNAK_METNI.ayarlar);
    expect(hucreler(screen.getByTestId("parti-satiri-OZ"))[3]).toMatch(/^650,00 ₺/);
    expect(within(screen.getByTestId("parti-satiri-AK100")).queryByTestId("pay-kaynagi")).toBeNull();
  });
  it("AC-28 / AC-29: başlamamış partide türetilen satırın payı yazılmaz, neden tablonun üstünde; planlanan satır payını alır", () => {
    render(<MH />);
    parti(3);
    expect(screen.getByTestId("parti-pay-neden").textContent).toContain(PARTI_NEDEN.baslamadi);
    expect(hucreler(screen.getByTestId("parti-satiri-AK100"))[3]).toBe("—");
    expect(hucreler(screen.getByTestId("parti-satiri-OZ"))[3]).toMatch(/^650,00 ₺/);
    parti(1);
    expect(screen.queryByTestId("parti-pay-neden")).toBeNull();
  });
  it("Triyaj bulgu 2: yalnız planlanan satırı olan kapanmış partide durum \"rol yok\" iken pay \"—\", satırda ve tablonun üstünde neden", () => {
    const stock = [...V.STOCK, { id: 9, model: "OZ", serialNo: "O9", partiId: 4, uretimTarihi: "2026-02-05" }];
    render(<MH stock={stock} turler={V.TURLER.map(t => ({ ...t, maliyetRolu: "yok" }))} partiler={[...V.PARTILER, { id: 4, ad: "Kapalı plan", baslangicAy: "2026-02", bitisAy: "2026-02", planlananAdetler: { OZ: 2 } }]} />);
    parti(4);
    expect(satirlar()).toEqual(["parti-satiri-OZ"]);
    expect(hucreler(screen.getByTestId("parti-satiri-OZ"))[3]).toBe(`—${PARTI_NEDEN.rolYok}`);
    expect(screen.getByTestId("parti-pay-neden").textContent).toContain(PARTI_NEDEN.rolYok);
  });
  it("AC-30: üst ibare bugünkü ayarların yalnız Model Maliyetleri ile planlanan satırları etkilediğini söyler", () => {
    render(<MH />);
    expect(screen.getByTestId("bugunku-ayar-ibaresi").textContent).toBe(BUGUNKU_AYAR_IBARESI);
    expect(BUGUNKU_AYAR_IBARESI).not.toMatch(/bir parçanın maliyeti/);
    expect(BUGUNKU_AYAR_IBARESI).toMatch(/^Bugünkü tür rolü, varsayılan adet ve dönem yalnız Model Maliyetleri ile planlanan adet satırlarını etkiler/);
  });
  it("AC-46: plan penceresi bugünkü model listesinden (iki model), tarihli gruplamadan etkilenmez", () => {
    render(<MH />);
    fireEvent.click(screen.getByRole("button", { name: /Planlanan adetler/ }));
    expect(screen.getByLabelText("AK100 planlanan adedi").value).toBe("");
    expect(screen.getByLabelText("OZ planlanan adedi").value).toBe("3");
  });
  it("AC-47 / R9/4: ham müşteri dizisiyle stoğa dönen makina gerçek tarihine (Ocak grubuna) çözülür", () => {
    const stock = [...V.STOCK, { id: 7, model: "AK100", serialNo: "D7", partiId: 1, note: "Silinen müşteriden geri döndü" }];
    const cop = { id: 12, name: "Silinen", model: "AK100", serialNo: "D7", uretimTarihi: "2026-01-12", deletedAt: "2026-04-01T00:00:00.000Z" };
    render(<MH stock={stock} tum={[...V.CUSTOMERS, cop]} />);
    expect(hucreler(screen.getByTestId("parti-satiri-AK100#1"))[1]).toBe("3");
    expect(hucreler(screen.getByTestId("parti-satiri-AK100#3"))[1]).toBe("1");
  });
});
