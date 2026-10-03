// @vitest-environment jsdom
// Spec 0014 (plan Z7): Finans tarih aralığı ve Analiz tarih ön ayarlarının davranışı. Dönüşümden ÖNCE bugünkü koda yazıldı
// ve yeşildi; dönüşümden sonra da aynı kalmalı. Düğmeler rolden bağımsız, erişilebilir adıyla sorgulanır.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { regexKacis } from "../yardimci/regexKacis.js";

const analizCagrilari = vi.hoisted(() => []);
vi.mock("../../src/lib/analiz", async (orijinal) => {
  const m = await orijinal();
  return { ...m, hesaplaAnaliz: (veri, aralik) => { analizCagrilari.push(aralik); return m.hesaplaAnaliz(veri, aralik); } };
});
const { Finance } = await import("../../src/components/Finance");
const { Analiz } = await import("../../src/components/Analiz");

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); analizCagrilari.length = 0; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const dugme = (ad) => screen.queryByRole("button", { name: ad }) || screen.getByRole("tab", { name: ad });
const sorgu = (ad) => screen.queryByRole("button", { name: ad }) || screen.queryByRole("tab", { name: ad });

const CUST = [
  { id: 1, name: "Eylül", model: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 1000, installDate: "2026-09-10" },
  { id: 2, name: "Mart", model: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 1000, installDate: "2026-03-01" },
  { id: 3, name: "Geçen", model: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 1000, installDate: "2025-05-01" },
  { id: 4, name: "Eski", model: "A", currency: "TRY", faturali: "Faturalı Yurtiçi", faturaBedeli: 1000, installDate: "2023-01-01" },
];
const finans = (izin) => render(<Finance customers={CUST} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }}
  rates={{}} payments={[]} teklifler={[]} serverPermissions={izin === undefined ? null : { role: "user", permissions: JSON.stringify({ tabs: ["finance"], financeActions: izin }) }} />);
const donem = () => screen.getByText(/Gösterilen dönem:/).textContent;

describe("Finans tarih aralığı", () => {
  it("AC-5: Bir süzgeç seçildiğinde dönen kayıt kümesi dönüşüm öncesiyle aynıdır (Finans)", () => {
    finans();
    for (const [s, n] of [["Tüm Zamanlar", 4], ["Bu Ay", 1], ["Bu Yıl", 2], ["Geçen Yıl", 1]]) {
      fireEvent.click(dugme(s));
      expect(donem(), s).toMatch(new RegExp(`${regexKacis(s)} · ${n} satış kaydı`));
    }
  });
  it("AC-6: Finans'ta tarih aralığı yetkisi olmayan kullanıcıya o seçenek görünmez", () => {
    finans(["fin_range_thisMonth", "fin_range_thisYear"]);
    expect(sorgu("Bu Ay")).toBeTruthy();
    expect(sorgu("Bu Yıl")).toBeTruthy();
    for (const s of ["Tüm Zamanlar", "Geçen Yıl", "Özel Tarih"]) expect(sorgu(s), s).toBeNull();
  });
  it("AC-7: Aktif aralık yetkisi yoksa izinli ilk aralığa düşer; hiç aralık izni yoksa 'Bu Ay' seçili gelir", () => {
    finans(["fin_range_thisYear", "fin_range_lastYear"]); // varsayılan "Tüm Zamanlar" yasak
    expect(donem()).toMatch(/Bu Yıl · 2 satış kaydı/);
    cleanup();
    finans([]);
    expect(donem()).toMatch(/Bu Ay · 1 satış kaydı/);
  });
  it("AC-20: Finans'ta 'Özel Tarih' seçildiğinde tarih alanları bugünkü yerinde ve davranışıyla açılır; segmentin içine alınmaz", () => {
    finans();
    expect(screen.queryByText("Başlangıç:")).toBeNull();
    fireEvent.click(dugme("Özel Tarih"));
    const etiket = screen.getByText("Başlangıç:");
    const cubuk = dugme("Özel Tarih").parentElement;
    expect(cubuk.contains(etiket)).toBe(false);
    const grup = dugme("Özel Tarih").closest('[role="group"]');
    expect(!grup || !grup.contains(etiket)).toBe(true);
    expect(cubuk.compareDocumentPosition(etiket) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // çubuğun ardında
    const [bas, bit] = etiket.parentElement.querySelectorAll("input");
    fireEvent.change(bas, { target: { value: "2026-01-01" } });
    fireEvent.change(bit, { target: { value: "2026-06-30" } });
    expect(donem()).toMatch(/Özel Tarih · 1 satış kaydı/);
  });
});

const ANALIZ = { customers: [], services: [], partSales: [], yedekParcaSatislar: [], parts: [], appSettings: {} };
const sonAralik = () => { const a = analizCagrilari[analizCagrilari.length - 1]; return { baslangic: a.baslangic, bitis: a.bitis, trendModu: a.trendModu }; };

describe("Analiz tarih ön ayarları", () => {
  it("AC-11: Analiz'in tarih ön ayarları aynı aralıkları üretir", () => {
    render(<Analiz {...ANALIZ} />);
    expect(sonAralik()).toEqual({ baslangic: null, bitis: null, trendModu: "yil" });
    fireEvent.click(dugme("Bu yıl"));
    expect(sonAralik()).toEqual({ baslangic: "2026-01-01", bitis: "2026-09-23", trendModu: "ay" });
    fireEvent.click(dugme("Son 12 ay"));
    expect(sonAralik()).toEqual({ baslangic: "2025-09-23", bitis: "2026-09-23", trendModu: "ay" });
    fireEvent.click(dugme("Tüm zamanlar"));
    expect(sonAralik()).toEqual({ baslangic: null, bitis: null, trendModu: "yil" });
  });
  it("AC-20: Analiz'de 'Özel' seçildiğinde tarih alanları bugünkü yerinde açılır; segmentin içine alınmaz", () => {
    const { container } = render(<Analiz {...ANALIZ} />);
    expect(container.querySelectorAll('input[type="date"]').length).toBe(0);
    fireEvent.click(dugme("Özel…"));
    const alanlar = container.querySelectorAll('input[type="date"]');
    expect(alanlar.length).toBe(2);
    const grup = screen.getByRole("group", { name: "Tarih aralığı" });
    expect(grup.contains(alanlar[0])).toBe(false);
    expect(grup.compareDocumentPosition(alanlar[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(alanlar[0], { target: { value: "2026-02-01" } });
    fireEvent.change(alanlar[1], { target: { value: "2026-03-31" } });
    expect(sonAralik()).toEqual({ baslangic: "2026-02-01", bitis: "2026-03-31", trendModu: "ay" });
  });
  it("R4/Z12: tarih aralığı grubu 'Tarih aralığı' adını korur ve seçili ön ayar aria-pressed=true", () => {
    render(<Analiz {...ANALIZ} />);
    expect(screen.getByRole("group", { name: "Tarih aralığı" })).toBeTruthy();
    expect(dugme("Tüm zamanlar").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Aralık")).toBeTruthy();
  });
});
