// @vitest-environment jsdom
// Kredi Kartı Komisyonları ayarı: canlı-kaydetme yerine YEREL taslak + yapışkan Kaydet butonu
// (diğer ayarlarla tutarlı). Değişiklik yapılınca Kaydet aktifleşir; basınca appSettings'e yazılır.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { SettingsKKKomisyon } from "../../src/components/settings/SettingsKKKomisyon";

describe("SettingsKKKomisyon — Kaydet butonu", () => {
  it("başta değişiklik yok → Kaydet pasif; değişince aktif ve kaydedince setAppSettings çağrılır", () => {
    const setAppSettings = vi.fn();
    const flash = vi.fn();
    render(<SettingsKKKomisyon appSettings={{}} setAppSettings={setAppSettings} flash={flash} />);

    const kaydet = screen.getByRole("button", { name: /Kaydet/ });
    expect(kaydet.disabled).toBe(true);                             // başta taslak = kayıtlı
    expect(screen.queryByText("Kaydedilmemiş değişiklik var")).toBeNull();

    // BSMV alanını değiştir (ilk sayı girişi)
    const bsmv = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(bsmv, { target: { value: "9" } });

    expect(screen.getByText("Kaydedilmemiş değişiklik var")).toBeTruthy();
    expect(kaydet.disabled).toBe(false);
    expect(setAppSettings).not.toHaveBeenCalled();                 // canlı kaydetme YOK

    fireEvent.click(kaydet);
    expect(setAppSettings).toHaveBeenCalled();                     // yalnız Kaydet ile yazar
    expect(flash).toHaveBeenCalled();
  });
});
