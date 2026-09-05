// @vitest-environment jsdom
// Ayarlar > Uygulama > Müşteri Görünümü: 4 fiyat sütunu anahtarı appSettings.musteriSutunlari'na yazılır.
// Mevcut ayar checkbox'lara yansır; Kaydet yalnız bilinen 4 anahtarı (boolean) taşır.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { SettingsMusteri } from "../../src/components/settings/SettingsMusteri";

describe("SettingsMusteri", () => {
  it("mevcut ayar checkbox'lara yansır", () => {
    render(<SettingsMusteri appSettings={{ musteriSutunlari: { faturaBedeli: true, fabrikaSatis: false, komisyon: true, extraKalip: false } }} setAppSettings={vi.fn()} flash={vi.fn()} />);
    const cbs = [...document.querySelectorAll('input[type="checkbox"]')];
    expect(cbs.length).toBe(4);
    expect(cbs[0].checked).toBe(true);   // fatura bedeli
    expect(cbs[1].checked).toBe(false);  // fabrika satış
    expect(cbs[2].checked).toBe(true);   // komisyon
    expect(cbs[3].checked).toBe(false);  // extra kalıp
  });

  it("varsayılan (ayar yok): hepsi kapalı", () => {
    render(<SettingsMusteri appSettings={{}} setAppSettings={vi.fn()} flash={vi.fn()} />);
    const cbs = [...document.querySelectorAll('input[type="checkbox"]')];
    expect(cbs.every(cb => cb.checked === false)).toBe(true);
  });

  it("anahtar değiştirip Kaydet → setAppSettings musteriSutunlari'nı günceller", () => {
    let sonuc = null;
    const setAppSettings = vi.fn((updater) => { sonuc = updater({ foo: 1 }); });
    render(<SettingsMusteri appSettings={{}} setAppSettings={setAppSettings} flash={vi.fn()} />);
    // Extra Kalıp'ı aç (4. checkbox)
    const cbs = [...document.querySelectorAll('input[type="checkbox"]')];
    fireEvent.click(cbs[3]);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(setAppSettings).toHaveBeenCalled();
    expect(sonuc.foo).toBe(1); // mevcut ayarlar korunur
    expect(sonuc.musteriSutunlari).toEqual({ faturaBedeli: false, fabrikaSatis: false, komisyon: false, extraKalip: true });
  });
});
