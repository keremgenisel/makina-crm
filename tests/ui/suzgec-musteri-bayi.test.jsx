// @vitest-environment jsdom
// Spec 0014 (plan Z7): Müşteriler ve Bayiler süzgeç çubuğunun davranışı. Bu testler dönüşümden ÖNCE bugünkü koda yazıldı
// ve yeşildi; dönüşümden sonra da aynı kalmalı. Düğmeler rolden bağımsız, erişilebilir adıyla sorgulanır.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { SimpleDealers } from "../../src/components/SimpleDealers";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const dugme = (ad) => screen.queryByRole("button", { name: ad }) || screen.getByRole("tab", { name: ad });
const satirlar = () => [...document.querySelectorAll("tbody tr")].map(tr => tr.textContent);
const gorunenAdlar = (adlar) => adlar.filter(ad => satirlar().some(t => t.includes(ad)));
const aktifSayfa = () => document.querySelector(".page-num--active")?.textContent ?? null;

const ad = (i) => `Firma ${String(i).padStart(2, "0")}`;
const CUST = Array.from({ length: 12 }, (_, k) => {
  const i = k + 1;
  const c = { id: 100 + i, name: ad(i), model: "AK100", serialNo: `S-${i}`, currency: "TRY", installDate: "2025-01-10" };
  if (i <= 3) c.warrantyEnd = "2099-01-01";
  if (i >= 4 && i <= 6) c.warrantyEnd = "2000-01-01";
  if (i === 6) c.kalanBorc = 5000;
  if (i === 7) { c.seriNoBekliyor = true; c.serialNo = ""; }
  return c;
});
const TUM = CUST.map(c => c.name);

describe("Müşteriler süzgeç çubuğu", () => {
  const ciz = () => render(<Customers customers={CUST} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} />);

  it("AC-2: Müşteriler'deki süzgeçler aynı adları ve aynı sayıları gösterir", () => {
    ciz();
    for (const a of ["Hepsi (12)", "Garantisi Devam Eden (3)", "Garantisi Bitenler (3)", "Borçlu Firmalar (1)", "Seri No Bekleyen (1)"]) expect(dugme(a), a).toBeTruthy();
  });
  it("AC-4: Sayı rozetine geçen bir süzgeç düğmesinin erişilebilir adı bugünkü metne birebir eşittir; bugünkü metinle eşleşen sorgular çalışır", () => {
    ciz();
    // Z2 düzeltmesi: rozet ayrı öğe olduğu için tam metinli getByText (yalnız öğenin kendi metin düğümlerine bakar)
    // artık eşleşmez; korunan şey erişilebilir ad ve düğmenin metin içeriğidir.
    expect(dugme("Borçlu Firmalar (1)").textContent).toBe("Borçlu Firmalar (1)");
    expect(screen.getByRole("button", { name: "Hepsi (12)" }).textContent).toBe("Hepsi (12)");
  });
  it("AC-5: Bir süzgeç seçildiğinde dönen kayıt kümesi dönüşüm öncesiyle aynıdır (Müşteriler)", () => {
    ciz();
    const bekle = {
      "Garantisi Devam Eden (3)": [ad(1), ad(2), ad(3)],
      "Garantisi Bitenler (3)": [ad(4), ad(5), ad(6)],
      "Borçlu Firmalar (1)": [ad(6)],
      "Seri No Bekleyen (1)": [ad(7)],
    };
    for (const [s, adlar] of Object.entries(bekle)) {
      fireEvent.click(dugme(s));
      expect(gorunenAdlar(TUM).sort(), s).toEqual([...adlar].sort());
    }
    fireEvent.click(dugme("Hepsi (12)"));
    expect(satirlar().length).toBe(10); // 10'luk sayfa
  });
  it("AC-12: Sekme veya süzgeç değiştirildiğinde sayfa numarası bugünkü davranışını sürdürür (Müşteriler: 1'e döner)", () => {
    ciz();
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(aktifSayfa()).toBe("2");
    fireEvent.click(dugme("Hepsi (12)"));
    expect(aktifSayfa()).toBe("1");
  });
  it("AC-15: 'Firmaya Göre Grupla' segmentin dışında ayrı bir düğme olarak durur ve açma/kapama davranışı bugünkü gibidir", () => {
    ciz();
    const grupla = screen.getByRole("button", { name: "Firmaya Göre Grupla" });
    const grup = dugme("Hepsi (12)").closest('[role="group"]');
    expect(!grup || !grup.contains(grupla)).toBe(true);
    fireEvent.click(grupla);
    expect(screen.getByRole("button", { name: "Firmaya Göre Gruplu" })).toBeTruthy();
    expect(screen.getByText(/Firmaya göre gruplu görünüm:/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Firmaya Göre Gruplu" }));
    expect(screen.queryByText(/Firmaya göre gruplu görünüm:/)).toBeNull();
  });
});

const DEALERS = [
  { id: 1, name: "Ege Bayi", bayiMi: true, anlasmaliServisMi: false },
  { id: 2, name: "Akdeniz Bayi", bayiMi: true, anlasmaliServisMi: true },
  { id: 3, name: "Servis Bir", bayiMi: false, anlasmaliServisMi: true },
  { id: 4, name: "Servis İki", bayiMi: false, anlasmaliServisMi: true },
];
const KALIP = [{ id: 9, customerId: 101, tur: "Kalıp", ad: "Hamburger", ucret: 1000, currency: "TRY", tarih: "2026-07-10", faturaTipi: "Faturasız Yurtiçi", odendi: false, satisFirma: "Ege Bayi" }];

describe("Bayiler süzgeç çubuğu", () => {
  const ciz = () => render(<SimpleDealers dealers={DEALERS} setDealers={vi.fn()} factory={{ name: "Altuntaş Fabrika" }} setFactory={vi.fn()}
    partSales={KALIP} services={[]} customers={CUST} showToast={vi.fn()} />);
  const TUMB = DEALERS.map(d => d.name);

  it("AC-3: Bayiler'deki süzgeçler aynı adları ve aynı sayıları gösterir", () => {
    ciz();
    for (const a of ["Tümü (4)", "Bayiler (2)", "Anlaşmalı Servisler (3)", "Borçlu (1)"]) expect(dugme(a), a).toBeTruthy();
  });
  it("AC-5: Bir süzgeç seçildiğinde dönen kayıt kümesi dönüşüm öncesiyle aynıdır (Bayiler)", () => {
    ciz();
    const bekle = { "Bayiler (2)": ["Ege Bayi", "Akdeniz Bayi"], "Anlaşmalı Servisler (3)": ["Akdeniz Bayi", "Servis Bir", "Servis İki"], "Borçlu (1)": ["Ege Bayi"], "Tümü (4)": TUMB };
    for (const [s, adlar] of Object.entries(bekle)) {
      fireEvent.click(dugme(s));
      expect(gorunenAdlar(TUMB).sort(), s).toEqual([...adlar].sort());
    }
  });
  it("AC-4 (Bayiler): erişilebilir ad ve metin içeriği bugünkü metne eşit", () => {
    ciz();
    expect(dugme("Anlaşmalı Servisler (3)").textContent).toBe("Anlaşmalı Servisler (3)");
  });
});
