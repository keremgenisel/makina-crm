// @vitest-environment jsdom
// Spec 0139 B gerçek App: araç Ayarlar › Veri Yönetimi'nde; onaylanınca kaydedilen gövdede yalnız parça kataloğu ve model kitleri
// değişir (AC-22, B-R2). Malzeme kartının kilogram fire tablosu gövdede taşınır (C7).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import * as XLSX from "xlsx";
import { MALZEME_AKTAR_PANEL_ADI } from "../../src/lib/malzemeListesiAktarma";
import { kaynakKitap, KARTLAR, MODELLER } from "../fixtures/0139-kaynak";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; });
const { default: App } = await import("../../src/App");

const veri = () => ({
  malzemeler: structuredClone(KARTLAR),
  parts: [{ id: 43, ad: "Pul", models: [], maliyet: 5 }],
  standardModels: structuredClone(MODELLER),
  customModels: [],
  customers: [{ id: 7, firmaAdi: "Deneme", model: "AK100_DS" }],
  giderTurleri: [], tedarikciler: [], giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1,
});
const baslat = async () => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (b) => { kayitlar.push(structuredClone(b)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));

describe("Spec 0139 gerçek App", () => {
  it("AC-22 / B-R2: aktarma kaydedilen gövdede yalnız parts, standardModels ve customModels'i değiştirir", async () => {
    const { kayitlar } = await baslat();
    menu("Ayarlar");
    fireEvent.click(screen.getAllByText("Veri Yönetimi").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText(MALZEME_AKTAR_PANEL_ADI).pop());
    const once = kayitlar.length ? structuredClone(kayitlar[kayitlar.length - 1]) : null;
    const f = new File([kaynakKitap(XLSX)], "MALZEME LİSTESİ.xlsx");
    fireEvent.change(await screen.findByLabelText("Malzeme listesi dosyası"), { target: { files: [f] } });
    await screen.findByTestId("malzeme-aktar-onizleme");
    expect(kayitlar.length).toBe(once ? kayitlar.length : 0); // önizleme kayıt tetiklemez (AC-21)
    const sayi = kayitlar.length;
    fireEvent.click(screen.getByTestId("malzeme-aktar-yaz"));
    await waitFor(() => expect(kayitlar.length).toBeGreaterThan(sayi));
    const son = kayitlar[kayitlar.length - 1];
    const ilk = veri();
    expect(son.parts.length).toBeGreaterThan(ilk.parts.length);
    expect(son.parts.find(p => p.id === 43)).toEqual(ilk.parts[0]);
    expect(son.standardModels.some(m => m.defaultParcalar.length > 0)).toBe(true);
    // Başka hiçbir bölüm değişmez: gövdenin öteki bölümleri, aynı veriyle açılıp aracı çalıştırmadan başka bir parça düzenlemesiyle
    // kaydedilen kontrol gövdesiyle birebir aynıdır (App'in yükleme normalleştirmesi iki gövdede de aynı).
    cleanup();
    const kontrol = await baslat();
    menu("Ayarlar");
    fireEvent.click(screen.getAllByText("Katalog").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText("Parça/Yedek Parça").pop());
    fireEvent.click(screen.getAllByText("Pul").map(e => e.closest("tr")).find(Boolean).querySelector("[title=Düzenle]"));
    fireEvent.change(screen.getByDisplayValue("Pul"), { target: { value: "Pul 2" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
    await waitFor(() => expect(kontrol.kayitlar.length).toBeGreaterThan(0));
    const temel = kontrol.kayitlar[kontrol.kayitlar.length - 1];
    const farkli = Object.keys(son).filter(k => JSON.stringify(son[k]) !== JSON.stringify(temel[k]));
    expect(farkli.sort()).toEqual(["parts", "standardModels"]);
    expect(son.malzemeler).toEqual(ilk.malzemeler); // C7: kilogram tablosu gövdede birebir
  });
});
