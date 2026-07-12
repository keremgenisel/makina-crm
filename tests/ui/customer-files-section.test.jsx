// @vitest-environment jsdom
// CustomerFilesSection (CustomerDetailModal'dan çıkarıldı): başlık adedi, dosyaFiltre gelince
// bölüm açılıp o kayda filtreler + filtre çipi, bağ seçicide çoklu kayıt, silme yetkisi butonu.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
import { CustomerFilesSection } from "../../src/components/customers/detail/CustomerFilesSection";

const detailDosyalar = [
  { id: 1, refType: "servis", refId: 7, ad: "servis.pdf", tur: "PDF", boyut: 1000, tarih: "2026-07-01" },
  { id: 2, refType: "makina", refId: null, ad: "makina.pdf", tur: "PDF", boyut: 2000, tarih: "2026-07-02" },
];
const services = [{ id: 7, date: "2026-07-01", type: "Garanti Dışı" }];
const base = {
  detailView: { id: 1, name: "ABC Makina" }, setDosyalar: vi.fn(), dosyalar: detailDosyalar,
  detailDosyalar, detailServices: services, services, canDo: () => true, setDosyaFiltre: vi.fn(),
};

describe("CustomerFilesSection", () => {
  it("başlıkta dosya adedini gösterir", () => {
    render(<CustomerFilesSection {...base} dosyaFiltre={null} />);
    expect(screen.getByText("Dosyalar (2)")).toBeTruthy();
  });

  it("dosyaFiltre gelince açılır, o kayda filtreler ve genel dosyayı gizler", () => {
    render(<CustomerFilesSection {...base} dosyaFiltre={{ refType: "servis", refId: 7 }} />);
    expect(screen.getByText("Filtre:")).toBeTruthy();
    expect(screen.getByText("servis.pdf")).toBeTruthy();
    expect(screen.queryByText("makina.pdf")).toBeNull();
  });

  it("bağ seçici dosyası olsa da servisi listeler (çoklu dosya)", () => {
    render(<CustomerFilesSection {...base} dosyaFiltre={null} />);
    const sel = screen.getByTitle("Yeni dosyanın bağlanacağı kayıt");
    expect(within(sel).getByRole("option", { name: /Servis/ })).toBeTruthy();
    expect(within(sel).getByRole("option", { name: /Bu makina/ })).toBeTruthy();
  });

  it("silme yetkisi yoksa çöp butonu görünmez", () => {
    render(<CustomerFilesSection {...base} dosyaFiltre={{ refType: "servis", refId: 7 }} canDo={(a) => a !== "cust_dosya_del"} />);
    expect(screen.getByText("servis.pdf")).toBeTruthy();
    expect(screen.queryByTitle("Sil")).toBeNull();
  });
});
