// @vitest-environment jsdom
// Spec 0127 C2, AC-2, AC-11, AC-12 (Karar 10, 20, 25): sevk alanı yazılmamış serviste Servis Formu çıktısı (TR ve EN), Kargo
// Etiketi verisi ve Servis Kayıtları Excel'inin eski sütunları spec ÖNCESİ kodla birebir aynı. Altın YAZ_0127=1 ile spec
// öncesi koddan üretildi (tests/fixtures/0127-cikti-once.json); bu dosya yalnız spec öncesinde de var olan API'leri kullanır.
import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { render, cleanup, fireEvent, within, act } from "@testing-library/react";
import fs from "node:fs";

const yakalanan = vi.hoisted(() => ({ satirlar: {} }));
vi.mock("../../src/components/settings/csvUtils", async (orijinal) => {
  const m = await orijinal();
  return { ...m, downloadXlsx: async (rows, ad) => { yakalanan.satirlar[ad] = JSON.parse(JSON.stringify(rows)); }, downloadCSV: () => {} };
});

import { buildServiceFormHtml, tamirEtiketVerisi } from "../../src/lib/printTemplates";
import { SettingsExport } from "../../src/components/settings/SettingsExport";
import { CUSTOMERS, KDV, FAB, SEVKSIZ, SEVKLI, EXCEL_SERVISLERI, veriUriAyikla } from "../fixtures/0127-veri";

const DOSYA = "tests/fixtures/0127-cikti-once.json";
// Servis formu çıktısı "Rapor Tarihi" olarak bugünü basar ve altın 03.11.2026'da üretildi; saat sabitlenmezse test ertesi gün
// kırılıyordu (04.11.2026, sürüm öncesi tam takımda bulundu; 0079 / 0095 / 0121 kıyaslarının emsali). Yalnız Date sahtelenir.
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-03T10:00:00") }); });
afterAll(() => vi.useRealTimers());
afterEach(cleanup);

const servisExcel = async () => {
  yakalanan.satirlar = {};
  const e = render(<SettingsExport customers={CUSTOMERS} services={EXCEL_SERVISLERI} dealers={[]} stock={[]} partSales={[]} payments={[]}
    notes={[]} parts={[]} appSettings={{ kdvRates: KDV }} factory={FAB} flash={vi.fn()} yedekParcaSatislar={[]} />);
  fireEvent.click(within(e.container).getByText(/^Müşteri & Servis \(/));
  const satir = within(e.container).getByText("Servis Kayıtları").closest("tr");
  await act(async () => { fireEvent.click(within(satir).getByTitle("İndir")); });
  e.unmount();
  return yakalanan.satirlar["servis-kayitlari.xlsx"];
};

const simdi = async () => {
  const cikti = {};
  for (const [ad, sv] of Object.entries(SEVKSIZ)) for (const dil of ["TR", "EN"]) {
    cikti[`${ad}:${dil}`] = veriUriAyikla(buildServiceFormHtml(sv, CUSTOMERS, KDV, { factory: FAB, translations: { _lang: dil } }));
  }
  return { cikti, etiket: tamirEtiketVerisi(SEVKLI.kargoTam, { customers: CUSTOMERS, factory: FAB }), excel: await servisExcel() };
};

// Spec 0127 R7, R9: altı yeni sütun 25. konumdan başlar (tevkifat bloğunun önü); eski sütunlar ayıklanınca satır eskisidir.
const YENI_BAS = 25, YENI_ADET = 6;
const eskiSutunlar = (r) => r.filter((_, j) => j < YENI_BAS || j >= YENI_BAS + YENI_ADET);

describe("Spec 0127: sevksiz serviste çıktı ve eski Excel sütunları spec öncesiyle birebir", () => {
  it("AC-2 / AC-11 / AC-12: Servis Formu (TR, EN), Kargo Etiketi verisi ve Servis Kayıtları'nın 25 sabit sütunu ile tevkifat hücreleri", async () => {
    const s = await simdi();
    if (process.env.YAZ_0127 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    const once = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(s.cikti).toEqual(once.cikti);
    expect(s.etiket).toEqual(once.etiket);
    expect(s.excel.length).toBe(once.excel.length);
    s.excel.forEach((r, i) => expect(eskiSutunlar(r), `satır ${i}`).toEqual(once.excel[i]));
  });
});
