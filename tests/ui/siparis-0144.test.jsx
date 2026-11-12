// @vitest-environment jsdom
// Spec 0144 B-R1–B-R1/3, B-R9/2, B-R11, B-R13: gerçek sipariş penceresinde nüsha sorusu (AC-17–AC-19, AC-41, AC-66), ekranda para yok
// (AC-37), pasif düğme soru açmaz (AC-38, AC-39).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import * as S from "../../src/lib/siparisIhtiyaci";
import { FIYATLI_NUSHA } from "../../src/lib/siparisRaporu";
import { NUSHA_BASLIGI, NUSHA_TESTID } from "../../src/components/rapor/NushaSecPenceresi";
import { siparisDosyaAdi } from "../../src/components/rapor/SiparisRaporuDugmesi";
import { PARCALAR, MALZEMELER, TEDARIKCILER, MODELLER } from "../fixtures/0144-veri.js";

afterEach(() => { cleanup(); delete window.appPrint; });
const PARTI = [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } }];
const VERI = (o = {}) => ({ parts: PARCALAR, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, hamTedarikciler: TEDARIKCILER,
  standardModels: MODELLER.standardModels, customModels: [], uretimPartileri: PARTI, appSettings: {}, factory: { name: "Altuntaş" }, ...o });
const kur = (o = {}) => {
  const printHtml = vi.fn(); window.appPrint = { printHtml };
  const onClose = vi.fn();
  render(<SiparisPenceresi veri={VERI(o)} bugun="2026-11-12" onClose={onClose} />);
  return { printHtml, onClose };
};
const yazdir = () => fireEvent.click(screen.getByTestId("siparis-yazdir"));

describe("Spec 0144 B: nüsha sorusu", () => {
  it("AC-17: Yazdır belgeyi basmaz, fiyatlı/fiyatsız soran pencere açılır", () => {
    const { printHtml } = kur();
    yazdir();
    expect(printHtml).not.toHaveBeenCalled();
    expect(screen.getByText(NUSHA_BASLIGI)).toBeTruthy();
    expect(screen.getByTestId(NUSHA_TESTID.fiyatsiz)).toBeTruthy(); expect(screen.getByTestId(NUSHA_TESTID.fiyatli)).toBeTruthy();
  });
  it("AC-18: vazgeçilirse hiçbir belge basılmaz", () => {
    const { printHtml, onClose } = kur();
    yazdir();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId(NUSHA_TESTID.pencere)).toBeNull();
    expect(printHtml).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });
  it("AC-19 / AC-66 / AC-20 / AC-35: her baskıda yeniden sorulur; iki nüshanın dosya adı ayrı; fiyatlıda ibare", () => {
    const { printHtml } = kur();
    yazdir(); fireEvent.click(screen.getByTestId(NUSHA_TESTID.fiyatsiz));
    expect(screen.queryByTestId(NUSHA_TESTID.pencere)).toBeNull();
    yazdir();
    expect(screen.getByTestId(NUSHA_TESTID.pencere)).toBeTruthy(); // önceki seçim hatırlanmaz
    fireEvent.click(screen.getByTestId(NUSHA_TESTID.fiyatli));
    expect(printHtml).toHaveBeenCalledTimes(2);
    const [[fsz, , adFsz], [fli, , adFli]] = printHtml.mock.calls;
    expect(adFsz).toBe(siparisDosyaAdi("2026-11-12", false)); expect(adFli).toBe(siparisDosyaAdi("2026-11-12", true));
    expect(adFsz).toBe("Siparis-Listesi-2026-11-12.pdf"); expect(adFli).toBe("Siparis-Listesi-2026-11-12-Fiyatli.pdf");
    expect(fsz).not.toContain(FIYATLI_NUSHA); expect(fsz).not.toMatch(/Tutar|Birim fiyat|[₺$€]/);
    expect(fli).toContain(FIYATLI_NUSHA); expect(fli).toContain("Birim fiyat");
  });
  it("AC-41: soru açıkken Escape sipariş penceresini kapatmaz, yalnız soruyu; geçici düzenleme korunur", () => {
    const { onClose } = kur();
    fireEvent.change(screen.getByLabelText("Elle sipariş adedi"), { target: { value: "300" } });
    yazdir();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByTestId(NUSHA_TESTID.pencere)).toBeNull();
    expect(screen.getByTestId("siparis-penceresi")).toBeTruthy();
    expect(screen.getByLabelText("Elle sipariş adedi").value).toBe("300");
    fireEvent.keyDown(window, { key: "Escape" }); // soru kapalıyken Escape bugünkü gibi pencereyi kapatır
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("Triyaj bulgu 1: soru açıkken veri belgeyi basılamaz yaparsa soru düşer ve pencere Escape ile kapanabilir", () => {
    window.appPrint = { printHtml: vi.fn() };
    const onClose = vi.fn();
    const { rerender } = render(<SiparisPenceresi veri={VERI()} bugun="2026-11-12" onClose={onClose} />);
    yazdir();
    expect(screen.getByTestId(NUSHA_TESTID.pencere)).toBeTruthy();
    rerender(<SiparisPenceresi veri={VERI({ parts: [] })} bugun="2026-11-12" onClose={onClose} />); // sunucudan yenilenen veri
    expect(screen.queryByTestId(NUSHA_TESTID.pencere)).toBeNull();
    expect(screen.getByTestId("siparis-yazdir").disabled).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<SiparisPenceresi veri={VERI()} bugun="2026-11-12" onClose={onClose} />); // basılabilir olunca soru kendiliğinden açılmaz
    expect(screen.queryByTestId(NUSHA_TESTID.pencere)).toBeNull();
  });
  it("AC-37: pencerenin ekranında fiyat, tutar ve para simgesi yok", () => {
    kur();
    expect(screen.getByTestId("siparis-penceresi").textContent).not.toMatch(/[₺$€]|Tutar|Birim fiyat/);
  });
  it("AC-38 / AC-39: geçersiz değerde ya da satır yokken Yazdır pasif, soru açılmaz, nedeni yazar", () => {
    kur();
    fireEvent.change(screen.getByLabelText("Elle sipariş adedi"), { target: { value: "-1" } });
    expect(screen.getByTestId("siparis-yazdir").disabled).toBe(true);
    yazdir();
    expect(screen.queryByTestId(NUSHA_TESTID.pencere)).toBeNull();
    expect(screen.getByTestId("siparis-yazdir-neden").textContent).toBe(S.BELGE_HATALI);
    cleanup();
    kur({ uretimPartileri: [] });
    expect(screen.getByTestId("siparis-yazdir").disabled).toBe(true);
    expect(screen.getByTestId("siparis-yazdir-neden").textContent).toBe(S.BELGE_BOS);
  });
});
