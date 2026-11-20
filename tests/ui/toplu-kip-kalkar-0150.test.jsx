// @vitest-environment jsdom
// Spec 0150 B: Parça/Yedek Parça listesinde toplu fiyat kipi düğmeleri, onayı ve "kat yok" açıklaması yok (R11); kipin iki yolu
// (parça kartı ve liste süzgeci) çalışır (R12); bileşende ölü kod kalmaz (R11/3) ve geri sızma taramayla yasak (C8).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { Settings } from "../../src/components/Settings";
import { FIYAT_KIPI_ETIKETI } from "../../src/components/PartManager";
import { TOPLU_KAT_YOK_NEDENI, topluKipMetni, KIP_MALIYET, KIP_ELLE } from "../../src/lib/parcaFiyati";
import { PARCALAR, MALZEMELER } from "../fixtures/0133-veri.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(cleanup);

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "1", factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], tedarikciler: [], setTedarikciler: vi.fn(),
};
let durum;
function Katalog({ p0 = PARCALAR, ayar = { fiyatAyarlari: { varsayilanKat: 2.4 } } }) {
  const [parts, setParts] = useState(structuredClone(p0));
  const [appSettings, setAppSettings] = useState(ayar);
  durum = { parts };
  return <Settings {...BASE} initialTab="yedekparca" appSettings={appSettings} setAppSettings={setAppSettings}
    parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts} malzemeler={MALZEMELER} giderYetki />;
}
const kalinti = () => {
  expect(screen.queryByTestId("toplu-kip")).toBeNull();
  expect(screen.queryByTestId("toplu-kat-yok")).toBeNull();
  expect(screen.queryByTestId("toplu-kip-onay")).toBeNull();
  for (const k of [KIP_MALIYET, KIP_ELLE]) expect(screen.queryByText(topluKipMetni(PARCALAR.length, k))).toBeNull();
  expect(screen.queryAllByRole("button").some(b => /^Listedeki \d+ parçayı/.test(b.textContent))).toBe(false);
};
const yorumsuz = (f) => fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const bilesenler = (d = "src/components") => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? bilesenler(path.join(d, e.name)) : /\.jsx?$/.test(e.name) ? [path.join(d, e.name)] : []));

describe("Spec 0150 B: toplu fiyat kipi düğmeleri kalkar", () => {
  it("AC-20 / AC-24: dolu listede toplu kip düğmeleri ve onayı yok", () => {
    render(<Katalog />);
    expect(screen.getAllByText("Rulman").length).toBeGreaterThan(0);
    kalinti();
  });
  it("AC-21: varsayılan kâr katı boşken 'toplu bağlama yapılamaz' açıklaması yok", () => {
    render(<Katalog ayar={{}} />);
    expect(screen.queryByText(TOPLU_KAT_YOK_NEDENI)).toBeNull();
    kalinti();
  });
  it("AC-24: boş listede (hiç parça yok ve süzgeç boş sonuç) kalıntı yok", () => {
    render(<Katalog p0={[]} />);
    kalinti();
    cleanup();
    render(<Katalog />);
    fireEvent.change(screen.getByPlaceholderText("Yedek parça ara..."), { target: { value: "zzz" } });
    kalinti();
  });
  it("AC-22: parça kartının fiyat kipi seçicisi çalışır: parça maliyete bağlanıp kaydedilir", () => {
    render(<Katalog />);
    const tr = screen.getAllByText("Rulman").map(e => e.closest("tr")).find(Boolean);
    fireEvent.click(within(tr).getByTitle("Düzenle"));
    fireEvent.click(within(screen.getByRole("radiogroup", { name: FIYAT_KIPI_ETIKETI })).getByRole("radio", { name: "Maliyete bağlı" }));
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(durum.parts.find(p => p.id === 61).fiyatKipi).toBe("maliyet");
  });
  it("AC-23: listedeki fiyat kipi süzgeci çalışır", () => {
    render(<Katalog p0={PARCALAR.map(p => (p.id === 65 ? { ...p, fiyatKipi: "maliyet" } : p))} />);
    const g = screen.getByRole("group", { name: "Fiyat kipi süzgeci" });
    fireEvent.click(within(g).getByRole("button", { name: "Maliyete bağlı (1)" }));
    expect(screen.queryByText("Rulman")).toBeNull();
    expect(screen.getAllByText("Kesme mili").length).toBeGreaterThan(0);
  });
  it("AC-41 / C8: toplu kip adları ve testid'leri src/components altında geçmez", () => {
    const yasak = /\b(topluKipMetni|TOPLU_KAT_YOK_NEDENI|topluKipOzeti)\b|"toplu-kip"|"toplu-kat-yok"|"toplu-kip-onay"/;
    const ihlal = bilesenler().filter(f => yasak.test(yorumsuz(f)));
    expect(ihlal).toEqual([]);
  });
  it("AC-43 / R11/3: PartManager'da toplu kipin ölü kodu ve altı içe alması yok", () => {
    const k = yorumsuz("src/components/PartManager.jsx");
    for (const ad of ["topluKip", "topluOzet", "topluUygula", "katYok", "kipYaz", "maliyetsizUyariMetni", "katsizUyariMetni", "fiyat_kipi_degisti"])
      expect(k, ad).not.toMatch(new RegExp(`\\b${ad}\\b`));
  });
  it("AC-42: 'katalog-parca-0133-toplu' ekranı kanıt aracında ve kanıt eşlemesinde yok", () => {
    expect(fs.readFileSync("scripts/evidence/0009-sayfa.jsx", "utf8")).not.toContain('"katalog-parca-0133-toplu"');
    const eslesme = JSON.parse(fs.readFileSync("docs/evidence/kanit-eslemesi.json", "utf8"));
    expect(Object.values(eslesme.dosyalar).flat().some(e => e.ekran === "katalog-parca-0133-toplu")).toBe(false);
  });
  it("R11/4: 'fiyat_kipi_degisti' etiketi İşlem Geçmişi'nde kalır (eski kayıtlar on iki ay görünür)", () => {
    expect(fs.readFileSync("src/components/settings/SettingsAuditLog.jsx", "utf8")).toMatch(/fiyat_kipi_degisti/);
  });
});
