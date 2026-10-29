// @vitest-environment jsdom
// Spec 0115 AC-72, AC-77 (plan adım 1): işaret taşımayan veride müşteri listesi ve kalıp pilleri, Anasayfa'nın bekleyen kalıp
// sayısı, üretim formu çıktısı ve servis formu çıktısı spec öncesi kodla birebir aynıdır; gerçek App'in kaydettiği servis gövdesi
// yeni anahtar taşımaz. "Önce" çıktıları spec 0115'ten ÖNCEKİ kodla üretildi (YAZ_0115=1), tests/fixtures/0115-once.json.
// Plan Ö-1 (Karar 47): Tür sütunu koşulsuzdur (R16/2, R36/2); üretim formu çıktısında yalnız o sütun ayıklanır.
import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import fs from "node:fs";
import { Customers } from "../../src/components/Customers";
import { Dashboard } from "../../src/components/Dashboard";
import { buildPrintHtml } from "../../src/components/stock/uretimFormPrint";
import { buildServiceFormHtml } from "../../src/lib/printTemplates";
import { KDV, FAB, PARTS, PART_TYPES, CUSTOMERS, PART_SALES, URETIM_FORMLARI, SERVICES, KALIP_DEFS } from "../fixtures/0115-veri";
const { default: App } = await import("../../src/App");

const DOSYA = "tests/fixtures/0115-once.json";
const yaz = process.env.YAZ_0115 === "1";
const once = () => JSON.parse(fs.readFileSync(DOSYA, "utf8"));
const kaydet = (anahtar, deger) => {
  const d = fs.existsSync(DOSYA) ? JSON.parse(fs.readFileSync(DOSYA, "utf8")) : {};
  d[anahtar] = deger; fs.writeFileSync(DOSYA, JSON.stringify(d, null, 1));
};
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); vi.useRealTimers(); });
const metin = (el) => el.textContent.replace(/\s+/g, " ").trim();

// Tür sütununu (ilk sütun) ve colspan 6'yı spec öncesi biçime indirger (plan Ö-1).
export const turSutunuAyikla = (html) => html
  .replace(/<th[^>]*>Tür<\/th>\s*/g, "")
  .replace(/<td[^>]*data-tur[^>]*>[^<]*<\/td>\s*/g, "")
  .replace(/colspan="6"/g, "colspan=\"5\"");

const ekranlar = () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-28T10:00:00") });
  const s = {};
  const m = render(<Customers customers={CUSTOMERS} setCustomers={vi.fn()} services={SERVICES} partSales={PART_SALES} payments={[]} dealers={[]} parts={PARTS}
    kdvRates={KDV} gorusmeler={[]} dosyalar={[]} uretimFormlari={URETIM_FORMLARI} kalipDefs={KALIP_DEFS} partTypeDefs={PART_TYPES} />);
  s.musteriListesi = metin(m.container); m.unmount();
  const d = render(<Dashboard customers={CUSTOMERS} dealers={[]} services={SERVICES} partSales={PART_SALES} uretimFormlari={URETIM_FORMLARI} rates={null} kdvRates={KDV} onGoUretim={() => {}} />);
  s.bekleyenKalip = metin(screen.getByText("Üretimde Bekleyen Kalıplar").closest("[style]").parentElement); d.unmount();
  s.uretimFormuCiktisi = buildPrintHtml(URETIM_FORMLARI[0]);
  s.servisFormlari = SERVICES.map(sv => buildServiceFormHtml(sv, CUSTOMERS, KDV, { factory: FAB }));
  return s;
};

describe("Spec 0115 AC-72: işaretsiz veride ekranlar ve çıktılar spec öncesiyle aynı", () => {
  it("AC-72: müşteri listesi ve kalıp pilleri, bekleyen kalıp sayısı, servis formu çıktısı birebir; üretim formu çıktısı Tür sütunu dışında birebir", () => {
    const s = ekranlar();
    if (yaz) { kaydet("ekranlar", s); return; }
    const o = once().ekranlar;
    expect(s.musteriListesi).toBe(o.musteriListesi);
    expect(s.bekleyenKalip).toBe(o.bekleyenKalip);
    expect(s.servisFormlari).toEqual(o.servisFormlari);
    expect(turSutunuAyikla(s.uretimFormuCiktisi)).toBe(o.uretimFormuCiktisi);
    expect(turSutunuAyikla(s.uretimFormuCiktisi)).not.toBe(s.uretimFormuCiktisi); // ayıklama gerçekten iş yaptı (Tür sütunu var)
  });
});

describe("Spec 0115 AC-77: işaretsiz servis düzenlemesinin kaydedilen gövdesi spec öncesiyle aynı", () => {
  it("AC-77: müşteri detayından servis açılıp kalıp kutusuna dokunmadan kaydedilince services bölümü yeni anahtar taşımaz", async () => {
    const kayitlar = [];
    const veri = () => ({ customers: structuredClone(CUSTOMERS), services: structuredClone(SERVICES), partSales: structuredClone(PART_SALES),
      parts: structuredClone(PARTS), partTypeDefs: structuredClone(PART_TYPES), uretimFormlari: structuredClone(URETIM_FORMLARI),
      standardModels: [{ model: "AK100", sogutma: "", kapasite: "", kalip: "" }], appSettings: {} });
    window.crmStorage = { load: vi.fn(async () => veri()), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
    await new Promise(r => setTimeout(r, 800));
    fireEvent.click(screen.getAllByText("Müşteriler").find(e => e.closest("nav")));
    fireEvent.click(screen.getByText("Anadolu Köfte"));
    fireEvent.click((await screen.findAllByTitle("Düzenlemek için tıklayın")).find(e => /Garanti Dışı/.test(e.textContent)));
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    await waitFor(() => expect(kayitlar.some(d => d.services?.some(x => x.id === 41))).toBe(true));
    const servisler = kayitlar.at(-1).services;
    if (yaz) { kaydet("servisGovdesi", servisler); return; }
    expect(servisler).toEqual(once().servisGovdesi);
    expect(servisler.some(x => "atolyeKaliplari" in x)).toBe(false);
    // Spec 0117 AC-13, AC-56: sevk bilgisi taşımayan serviste beş sevk anahtarı da gövdeye girmez.
    for (const k of ["kalipFabrikaTeslim", "kalipKargoFirma", "kalipKargoTakipNo", "kalipKargoTarih", "kalipKargoSorumlusu"]) {
      expect(servisler.some(x => k in x), k).toBe(false);
    }
  });
});
