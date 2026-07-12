// @vitest-environment jsdom
// Servis formundan dosya/resim ekleme: "Resim / Dosya Ekle" seçilen dosyayı taslak listesine
// koyar, "Kaydet" bunları onSave'in 2. argümanı olarak geçirir (kaydedince servise bağlanır).
// Düzenlemede o servise zaten bağlı dosyalar ayrıca listelenir.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

afterEach(() => { cleanup(); delete window.appFiles; });
import { ServiceForm } from "../../src/components/ServiceForm";

const customers = [{ id: 1, name: "ABC Makina", faturali: "Faturalı Yurtiçi" }];
const baseForm = { customerId: 1, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", degisenParcalar: [], currency: "TRY", date: "2026-07-11" };
const props = (over = {}) => ({
  title: "Yeni Servis Talebi", form: baseForm, setForm: vi.fn(), customers,
  onSave: vi.fn(), onCancel: vi.fn(), dosyaEkleyebilir: true, showToast: vi.fn(), ...over,
});

beforeEach(() => {
  window.appFiles = {
    add: vi.fn(() => Promise.resolve({ eklenen: [{ ad: "resim.jpg", dosyaAdi: "ABC Makina - resim - k1.jpg", boyut: 1234, tur: "JPG" }], hatalar: [] })),
    open: vi.fn(),
  };
});

describe("ServiceForm dosya ekleme", () => {
  it("dosya ekleyince taslak listeye girer ve Kaydet onSave'e taslakları geçirir", async () => {
    const onSave = vi.fn();
    render(<ServiceForm {...props({ onSave })} />);
    fireEvent.click(screen.getByRole("button", { name: /Resim \/ Dosya Ekle/ }));
    await waitFor(() => expect(window.appFiles.add).toHaveBeenCalledWith("ABC Makina"));
    await screen.findByText("resim.jpg");        // taslak listede
    expect(screen.getByText("yeni")).toBeTruthy(); // yeni rozeti
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const [, taslaklar] = onSave.mock.calls[0];
    expect(taslaklar).toHaveLength(1);
    expect(taslaklar[0].dosyaAdi).toBe("ABC Makina - resim - k1.jpg");
  });

  it("birden fazla dosya eklenebilir (taslaklar birikir)", async () => {
    render(<ServiceForm {...props()} />);
    const btn = screen.getByRole("button", { name: /Resim \/ Dosya Ekle/ });
    fireEvent.click(btn);
    await screen.findByText("resim.jpg");
    window.appFiles.add.mockResolvedValueOnce({ eklenen: [{ ad: "ikinci.pdf", dosyaAdi: "ABC Makina - ikinci - k2.pdf", boyut: 2, tur: "PDF" }], hatalar: [] });
    fireEvent.click(btn);
    await screen.findByText("ikinci.pdf");
    expect(screen.getByText("resim.jpg")).toBeTruthy(); // ilki hâlâ duruyor
  });

  it("düzenlemede servise zaten bağlı dosyalar listelenir", () => {
    const dosyalar = [{ id: 9, customerId: 1, refType: "servis", refId: 77, ad: "eski.pdf", dosyaAdi: "x", boyut: 10, tur: "PDF" }];
    render(<ServiceForm {...props({ form: { ...baseForm, id: 77 }, dosyalar })} />);
    expect(screen.getByText("eski.pdf")).toBeTruthy();
  });

  it("müşteri seçili değilse ekleme butonu pasiftir", () => {
    render(<ServiceForm {...props({ form: { ...baseForm, customerId: "" } })} />);
    expect(screen.getByRole("button", { name: /Resim \/ Dosya Ekle/ }).disabled).toBe(true);
  });
});
