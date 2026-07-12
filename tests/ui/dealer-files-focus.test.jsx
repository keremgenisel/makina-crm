// @vitest-environment jsdom
// Anlaşmalı servis dosya arşivi: bir servis kartındaki ataş rozetine tıklayınca (parent `odak`
// verir) dosya listesi o servise filtrelenir, yükleme dropdown'ı o servise ön-seçilir, servis
// etiketi müşteri adını gösterir ve "Tümünü göster" filtreyi kaldırır.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { DealerFilesSection } from "../../src/components/DealerFilesSection";

const dealer = { id: 5, name: "Servis A" };
const services = [{ id: 7, date: "2026-07-01", type: "Garanti Dışı", customerId: 100 }];
const customers = [{ id: 100, name: "Müşteri X" }];
const dosyalar = [
  { id: 1, dealerId: 5, refType: "servis", refId: 7, ad: "servis-belge.pdf", tur: "PDF", tarih: "2026-07-02", boyut: 1000 },
  { id: 2, dealerId: 5, refType: "bayi",   refId: null, ad: "sozlesme.pdf",  tur: "PDF", tarih: "2026-07-01", boyut: 2000 },
];
const baseProps = { dealer, dosyalar, setDosyalar: () => {}, services, customers, showToast: () => {} };

describe("DealerFilesSection odak (servis kartına bağlama)", () => {
  it("odak servise verilince liste o servise filtrelenir, genel bayi dosyası gizlenir", () => {
    render(<DealerFilesSection {...baseProps} odak={{ refType: "servis", refId: 7 }} onOdakChange={() => {}} />);
    expect(screen.getByText("servis-belge.pdf")).toBeTruthy();
    expect(screen.queryByText("sozlesme.pdf")).toBeNull();
    expect(screen.getByText("Filtre:")).toBeTruthy();
  });

  it("servis dropdown etiketi müşteri adını içerir (farklı müşterileri ayırt etmek için)", () => {
    render(<DealerFilesSection {...baseProps} odak={{ refType: "servis", refId: 7 }} onOdakChange={() => {}} />);
    const opt = screen.getByRole("option", { name: /Servis .* Müşteri X/ });
    expect(opt).toBeTruthy();
  });

  it("odaktaki yükleme dropdown'ı, dosyası olsa bile o servise ön-seçilidir", () => {
    render(<DealerFilesSection {...baseProps} odak={{ refType: "servis", refId: 7 }} onOdakChange={() => {}} />);
    const sel = screen.getByTitle("Yeni dosyanın bağlanacağı kayıt");
    expect(sel.value).toBe("servis|7");
  });

  it("'Tümünü göster' filtreyi kaldırır (onOdakChange(null))", () => {
    const onOdakChange = vi.fn();
    render(<DealerFilesSection {...baseProps} odak={{ refType: "servis", refId: 7 }} onOdakChange={onOdakChange} />);
    fireEvent.click(screen.getByText("✕ Tümünü göster"));
    expect(onOdakChange).toHaveBeenCalledWith(null);
  });

  it("odak yokken tüm bayi dosyaları görünür (filtre çipi yok)", () => {
    render(<DealerFilesSection {...baseProps} odak={null} onOdakChange={() => {}} />);
    // Bölüm başlığına tıklayıp aç (odak yokken kapalı başlar)
    fireEvent.click(screen.getByText(/Dosyalar \(/));
    expect(screen.getByText("servis-belge.pdf")).toBeTruthy();
    expect(screen.getByText("sozlesme.pdf")).toBeTruthy();
    expect(screen.queryByText("Filtre:")).toBeNull();
  });
});
