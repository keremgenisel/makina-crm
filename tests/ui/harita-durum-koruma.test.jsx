// @vitest-environment jsdom
// Harita sekmesi, firmaya tıklanıp Müşteriler'e geçince UNMOUNT olur; modal kapanıp geri
// dönülünce aynı ülke/il görünümü korunmalı (yoksa dünyaya sıfırlanıyordu). Bunun için Harita
// seçimini App'e bildirir (onDurumChange) ve bir sonraki mount'ta başlangıç prop'undan geri yükler.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Harita } from "../../src/components/Harita";

const musteri = [{ id: 1, name: "A", country: "Türkiye", city: "İstanbul", ilce: "Kadıköy" }];

describe("Harita — drill durumunu koruma", () => {
  it("başlangıç ülke+il verilince doğrudan o ilçe görünümüne açılır (dünyaya düşmez)", async () => {
    render(<Harita customers={musteri} dealers={[]} factory={null} baslangicUlke="Türkiye" baslangicIl="İstanbul" />);
    // İlçe görünümü: "← Türkiye" geri düğmesi + ilçe haritası
    await waitFor(() => expect(screen.getByRole("button", { name: /← Türkiye/ })).toBeTruthy(), { timeout: 10000 });
    await waitFor(() => expect(document.querySelector('[data-ad="Kadıköy"]')).toBeTruthy(), { timeout: 10000 });
  });

  it("seçim değişince onDurumChange ile bildirir (App hatırlasın diye)", async () => {
    const durum = vi.fn();
    render(<Harita customers={[{ id: 1, name: "A", country: "Türkiye", city: "Konya" }]} dealers={[]} factory={null} onDurumChange={durum} />);
    await waitFor(() => expect(document.querySelector('[data-ad="Türkiye"]')).toBeTruthy(), { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /Türkiye/ }));
    await waitFor(() => expect(durum).toHaveBeenCalledWith("Türkiye", null));
  });

  it("başlangıç verilmezse dünya görünümüyle açılır (varsayılan bozulmadı)", async () => {
    render(<Harita customers={musteri} dealers={[]} factory={null} />);
    await waitFor(() => expect(document.querySelector('[data-ad="Türkiye"]')).toBeTruthy(), { timeout: 10000 });
    // Dünya görünümünde "← Türkiye" (ilçe geri düğmesi) YOK
    expect(screen.queryByRole("button", { name: /← Türkiye/ })).toBeNull();
  });
});
