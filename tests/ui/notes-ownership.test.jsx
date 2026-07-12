// @vitest-environment jsdom
// Notlar kullanıcıya özel (düzen): çok kullanıcıda "Benim Notlarım" varsayılan → kendi + sahipsiz
// notlar; "Tümü" → hepsi. Yeni not olusturan=aktif kullanıcı ile kaydedilir. Yerel modda filtre yok.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Notes } from "../../src/components/Notes";

const notes = [
  { id: 1, content: "Kerem notu", updatedAt: 3, olusturan: "kerem" },
  { id: 2, content: "Admin notu", updatedAt: 2, olusturan: "admin" },
  { id: 3, content: "Eski sahipsiz not", updatedAt: 1 },
];

describe("Notlar — kullanıcıya özel (düzen)", () => {
  it("çok kullanıcıda varsayılan 'Benim Notlarım': kendi + sahipsiz görünür, başkasınınki gizli", () => {
    render(<Notes notes={notes} setNotes={vi.fn()} aktifKullanici="kerem" />);
    expect(screen.getByText("Kerem notu")).toBeTruthy();
    expect(screen.getByText("Eski sahipsiz not")).toBeTruthy();
    expect(screen.queryByText("Admin notu")).toBeNull();
  });

  it("'Tümü' sekmesi hepsini gösterir", () => {
    render(<Notes notes={notes} setNotes={vi.fn()} aktifKullanici="kerem" />);
    fireEvent.click(screen.getByRole("button", { name: "Tümü" }));
    expect(screen.getByText("Kerem notu")).toBeTruthy();
    expect(screen.getByText("Admin notu")).toBeTruthy();
    expect(screen.getByText("Eski sahipsiz not")).toBeTruthy();
  });

  it("başkasının notunda sahip etiketi gösterilir (Tümü'de)", () => {
    render(<Notes notes={notes} setNotes={vi.fn()} aktifKullanici="kerem" />);
    fireEvent.click(screen.getByRole("button", { name: "Tümü" }));
    expect(screen.getByText(/· admin/)).toBeTruthy();
  });

  it("yeni not aktif kullanıcı adıyla (olusturan) kaydedilir", () => {
    const setNotes = vi.fn();
    render(<Notes notes={[]} setNotes={setNotes} aktifKullanici="kerem" />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Not/ }));
    fireEvent.change(screen.getByPlaceholderText(/Notunuzu yazın/), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    const updater = setNotes.mock.calls[0][0];
    const yeni = updater([]);
    expect(yeni[0].olusturan).toBe("kerem");
    expect(yeni[0].content).toBe("Test");
  });

  it("yerel modda (aktifKullanici yok) filtre sekmeleri görünmez, tüm notlar gelir", () => {
    render(<Notes notes={notes} setNotes={vi.fn()} aktifKullanici="" />);
    expect(screen.queryByRole("button", { name: "Benim Notlarım" })).toBeNull();
    expect(screen.getByText("Kerem notu")).toBeTruthy();
    expect(screen.getByText("Admin notu")).toBeTruthy();
  });
});
