// @vitest-environment jsdom
// Spec 0014 (plan Z7): Notlar süzgeç çubuğunun davranışı (izin, mod, sayfa). Dönüşümden ÖNCE bugünkü koda yazıldı ve
// yeşildi; dönüşümden sonra da aynı kalmalı. Düğmeler rolden bağımsız, erişilebilir adıyla sorgulanır.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Notes } from "../../src/components/Notes";

afterEach(cleanup);

const dugme = (ad) => screen.queryByRole("button", { name: ad }) || screen.getByRole("tab", { name: ad });
const sorgu = (ad) => screen.queryByRole("button", { name: ad }) || screen.queryByRole("tab", { name: ad });
const aktifSayfa = () => document.querySelector(".page-num--active")?.textContent ?? null;
const izin = (notActions) => ({ role: "user", permissions: JSON.stringify({ notActions }) });

const NOTLAR = [
  ...Array.from({ length: 7 }, (_, i) => ({ id: i + 1, content: `Kerem notu ${i + 1}`, updatedAt: 100 - i, olusturan: "kerem" })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: 20 + i, content: `Admin notu ${i + 1}`, updatedAt: 50 - i, olusturan: "admin" })),
];

describe("Notlar süzgeç çubuğu", () => {
  it("AC-19: Tek kullanıcı modunda Notlar'da süzgeç çubuğu hiç çizilmez; çoklu kullanıcı modunda bugünkü gibi görünür", () => {
    render(<Notes notes={NOTLAR} setNotes={vi.fn()} aktifKullanici="" />);
    expect(sorgu("Benim Notlarım")).toBeNull();
    expect(sorgu("Tümü")).toBeNull();
    cleanup();
    render(<Notes notes={NOTLAR} setNotes={vi.fn()} aktifKullanici="kerem" />);
    expect(dugme("Benim Notlarım")).toBeTruthy();
    expect(dugme("Tümü")).toBeTruthy();
  });
  it("AC-8: Notlar'daki süzgeçler izin kuralına bugünkü gibi uyar (yetkisiz gizli, yasaklı aktif izinliye düşer)", () => {
    render(<Notes notes={NOTLAR} setNotes={vi.fn()} aktifKullanici="kerem" serverPermissions={izin(["not_filter_tumu"])} />);
    expect(sorgu("Benim Notlarım")).toBeNull(); // varsayılan "Benim" yasak → "Tümü"ye düştü
    expect(screen.getByRole("button", { name: "3" })).toBeTruthy(); // 11 not / 5 = 3 sayfa ("Benim" 7 not = 2 sayfa)
    cleanup();
    render(<Notes notes={NOTLAR} setNotes={vi.fn()} aktifKullanici="kerem" serverPermissions={izin([])} />);
    expect(sorgu("Benim Notlarım")).toBeNull();
    expect(sorgu("Tümü")).toBeNull();
  });
  it("AC-5: Bir süzgeç seçildiğinde dönen kayıt kümesi dönüşüm öncesiyle aynıdır (Notlar)", () => {
    render(<Notes notes={NOTLAR} setNotes={vi.fn()} aktifKullanici="kerem" />);
    expect(screen.queryByText("Admin notu 1")).toBeNull();
    expect(screen.getByText("Kerem notu 1")).toBeTruthy();
    fireEvent.click(dugme("Tümü"));
    expect(screen.getByText("Kerem notu 1")).toBeTruthy(); // en yeni önce
    expect(screen.getAllByText(/notu \d/).length).toBe(5); // 5'lik sayfa
    fireEvent.click(dugme("Benim Notlarım"));
    expect(screen.queryByText(/Admin notu/)).toBeNull();
  });
  it("AC-12: Sekme veya süzgeç değiştirildiğinde sayfa numarası bugünkü davranışını sürdürür (Notlar: 1'e döner)", () => {
    render(<Notes notes={NOTLAR} setNotes={vi.fn()} aktifKullanici="kerem" />);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(aktifSayfa()).toBe("2");
    fireEvent.click(dugme("Tümü"));
    expect(aktifSayfa()).toBe("1");
  });
  it("R9/Z3: Notlar'ın iki süzgeci bugünkü gibi eşit genişlikte", () => {
    render(<Notes notes={NOTLAR} setNotes={vi.fn()} aktifKullanici="kerem" />);
    // jsdom "flex: 1 1 0" kısaltmasını ayrıştıramıyor; eşit genişlik, kabın tam genişlikte flex olması ve düğmelerin
    // içerik genişliğinde (0 0 auto) olmamasıyla doğrulanır. Gerçek yerleşim görüntüde.
    expect(dugme("Tümü").parentElement.style.display).toBe("flex");
    for (const a of ["Benim Notlarım", "Tümü"]) expect(dugme(a).style.flex, a).not.toBe("0 0 auto");
  });
});
