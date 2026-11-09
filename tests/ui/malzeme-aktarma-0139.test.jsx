// @vitest-environment jsdom
// Spec 0139 B: Ayarlar › Veri Yönetimi › "Malzeme Listesinden Aktar" paneli (gerçek Settings, durumlu kap). Dosya seçimi, önizleme,
// ön koşul, hata, yazım, kilit, iz satırı ve canlı doğrulama turu. Kaynak sentetik (tests/fixtures/0139-kaynak.js).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Settings } from "../../src/components/Settings";
import * as A from "../../src/lib/malzemeListesiAktarma";
import { AYAR_KILITLI, AYAR_PANEL_DOSYALARI } from "../../src/lib/kilitAlanlari";
import { kaynakKitap, kaynakSatirlari, KARTLAR, MODELLER, SAYFA_ADLARI } from "../fixtures/0139-kaynak";

const denetim = vi.hoisted(() => ({ kayitlar: [] }));
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (o) => denetim.kayitlar.push(o) }));
afterEach(() => { cleanup(); delete window.crmLocks; denetim.kayitlar.length = 0; });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  rawCustomModels: [], setTedarikciler: vi.fn(), tedarikciler: [], setMalzemeler: vi.fn(),
};
let durum;
function Kap({ malzemeler = KARTLAR, p0 = [], toast = vi.fn() }) {
  const [parts, setParts] = useState(p0);
  const [standardModels, setStandardModels] = useState(structuredClone(MODELLER));
  const [customModels, setCustomModels] = useState([]);
  durum = { parts, standardModels, customModels, setStandardModels };
  return <Settings {...BASE} initialTab="malzemeaktar" showToast={toast} malzemeler={malzemeler} rawMalzemeler={malzemeler}
    parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts}
    standardModels={standardModels} setStandardModels={setStandardModels} customModels={customModels} setCustomModels={setCustomModels} giderYetki />;
}
const dosya = (veri, ad = "MALZEME LİSTESİ.xlsx") => new File([veri], ad, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
const yukle = (f) => fireEvent.change(screen.getByLabelText("Malzeme listesi dosyası"), { target: { files: [f] } });
const kitSayisi = (modeller) => modeller.reduce((t, m) => t + (m.defaultParcalar || []).length, 0);

describe("Spec 0139 B: malzeme listesinden aktar paneli", () => {
  it("AC-56: panel Veri Yönetimi'nde, kimliği AYAR_KILITLI'de, dosyası AYAR_PANEL_DOSYALARI'nda ve ayar:malzemeaktar kilidiyle", async () => {
    expect(AYAR_KILITLI.malzemeaktar).toBe(A.MALZEME_AKTAR_PANEL_ADI);
    expect(AYAR_PANEL_DOSYALARI).toContain("src/components/settings/SettingsMalzemeAktar.jsx");
    window.crmLocks = { acquire: vi.fn(async () => ({ ok: false, locked_by: "ayse" })), release: vi.fn(), heartbeat: vi.fn(), list: vi.fn(async () => []), forceAcquire: vi.fn() };
    render(<Kap />);
    await screen.findByTestId("ayar-kilitli");
    expect(window.crmLocks.acquire.mock.calls.map(c => c.slice(0, 2))).toContainEqual(["ayar", "malzemeaktar"]);
    expect(screen.queryByTestId("malzeme-aktar")).toBeNull();
  });
  it("AC-21 / AC-58: dosya seçilince önizleme parça ve kit sayısını gösterir; hiçbir şey yazılmaz", async () => {
    render(<Kap />);
    yukle(dosya(kaynakKitap(XLSX)));
    const on = await screen.findByTestId("malzeme-aktar-onizleme");
    const beklenen = A.aktarmaPlani({ sayfalar: Object.fromEntries(Object.entries(kaynakSatirlari()).map(([a, s]) => [a, s.map(r => r.map(v => (v === "" ? "" : String(v))))])), malzemeler: KARTLAR, standardModels: MODELLER, yeniId: (() => { let n = 0; return () => ++n; })() });
    expect(on.querySelector("[data-testid=rapor-parca]").textContent).toBe(A.RAPOR.parca(beklenen.rapor.parca));
    expect(on.querySelector("[data-testid=rapor-kit]").textContent).toBe(A.RAPOR.kit(beklenen.rapor.kit));
    expect(on.querySelector("[data-testid=rapor-kapsam-disi]").textContent).toBe(A.KAPSAM_DISI_METNI(3));
    expect(durum.parts).toEqual([]);
    expect(kitSayisi(durum.standardModels)).toBe(0);
    expect(denetim.kayitlar).toEqual([]);
  });
  it("AC-59 / B-R2/2: malzeme kartları kurulmadan önizleme ön koşul listesini yazar ve yazma düğmesi pasif", async () => {
    render(<Kap malzemeler={KARTLAR.filter(k => k.id !== 902)} />);
    yukle(dosya(kaynakKitap(XLSX)));
    expect((await screen.findByTestId("malzeme-aktar-on-kosul")).textContent).toContain("PASLANMAZ 304 BORU");
    expect(screen.getByTestId("malzeme-aktar-yaz").disabled).toBe(true);
  });
  it("AC-40: beklenen sayfaları olmayan dosyada neden ekranda, hiçbir şey yazılmaz", async () => {
    const s = kaynakSatirlari(); delete s[SAYFA_ADLARI.P140];
    render(<Kap />);
    yukle(dosya(kaynakKitap(XLSX, s)));
    expect((await screen.findByTestId("malzeme-aktar-hata")).textContent).toBe(A.SAYFA_YOK([SAYFA_ADLARI.P140]));
    expect(screen.queryByTestId("malzeme-aktar-yaz")).toBeNull();
    expect(durum.parts).toEqual([]);
  });
  it("AC-73: 20 MB'den büyük dosya okunmaz, neden ekranda", async () => {
    render(<Kap />);
    const f = dosya(new Uint8Array(10));
    Object.defineProperty(f, "size", { value: 21 * 1024 * 1024 });
    yukle(f);
    expect((await screen.findByTestId("malzeme-aktar-hata")).textContent).toBe(A.DOSYA_BUYUK(20));
  });
  it("AC-71 / B-R12/2: onaylanınca parçalar ve kitler yazılır; işlem geçmişine tek özet satırı", async () => {
    const toast = vi.fn();
    render(<Kap toast={toast} />);
    yukle(dosya(kaynakKitap(XLSX)));
    await screen.findByTestId("malzeme-aktar-onizleme");
    fireEvent.change(screen.getByLabelText(A.MODEL_ADET_ETIKETI("AK100")), { target: { value: "40" } });
    const parcaSayisi = screen.getByTestId("rapor-parca").textContent;
    fireEvent.click(screen.getByTestId("malzeme-aktar-yaz"));
    expect(A.RAPOR.parca(durum.parts.length)).toBe(parcaSayisi);
    expect(durum.parts.find(p => p.ad === "ÖZEL MİL").models.sort()).toEqual(["AK100_DS", "AK100_DSC"]);
    expect(kitSayisi(durum.standardModels)).toBeGreaterThan(0);
    expect(denetim.kayitlar).toHaveLength(1);
    expect(denetim.kayitlar[0]).toMatchObject({ action: "ice_aktarildi", entity: "parca_tanimi", entityName: `${durum.parts.length} parça` });
    expect(denetim.kayitlar[0].detail).toMatchObject({ parca: durum.parts.length, kit: kitSayisi(durum.standardModels) });
    expect(screen.getByTestId("malzeme-aktar-dogrulama").textContent).toBe(A.dogrulamaMetni({ beklenen: kitSayisi(durum.standardModels), bulunan: kitSayisi(durum.standardModels) }));
  });
  it("triyaj (bulgu 2): kitsiz oluşan parça Makina Modelleri kartının parça seçicisinde listelenir (kiti oradan girilir)", async () => {
    render(<Kap />);
    yukle(dosya(kaynakKitap(XLSX)));
    await screen.findByTestId("malzeme-aktar-onizleme");
    fireEvent.click(screen.getByTestId("malzeme-aktar-yaz"));
    expect(durum.parts.find(p => p.ad === "ÖZEL MİL").models.sort()).toEqual(["AK100_DS", "AK100_DSC"]);
    fireEvent.click(screen.getAllByText("Katalog").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText("Makina Modelleri").pop());
    fireEvent.click(screen.getByText("AK100_DS").closest("tr").querySelector("button[title=Düzenle]"));
    fireEvent.focus(screen.getByPlaceholderText("Parça ekle..."));
    fireEvent.change(screen.getByPlaceholderText("Parça ekle..."), { target: { value: "ÖZEL" } });
    expect(screen.getAllByText("ÖZEL MİL").length).toBeGreaterThan(0);
  });
  it("triyaj (bulgu 4): geçersiz parti adedinde alanın altında neden, yazma düğmesi pasif; düzelince açılır", async () => {
    render(<Kap />);
    yukle(dosya(kaynakKitap(XLSX)));
    await screen.findByTestId("malzeme-aktar-onizleme");
    const alan = screen.getByLabelText(A.PARTI_ETIKETI(SAYFA_ADLARI.PL100));
    for (const v of ["70,5", ""]) {
      fireEvent.change(alan, { target: { value: v } });
      expect(alan.closest("div").parentElement.textContent).toContain(A.PARTI_HATASI);
      expect(screen.getByTestId("malzeme-aktar-yaz").disabled).toBe(true);
    }
    fireEvent.click(screen.getByTestId("malzeme-aktar-yaz"));
    expect(durum.parts).toEqual([]);
    fireEvent.change(alan, { target: { value: "70" } });
    expect(screen.queryByText(A.PARTI_HATASI)).toBeNull();
    expect(screen.getByTestId("malzeme-aktar-yaz").disabled).toBe(false);
  });
  it("AC-72: kayıttan sonra kit satırları kaybolursa doğrulama turu farkı listeler (canlı)", async () => {
    render(<Kap />);
    yukle(dosya(kaynakKitap(XLSX)));
    await screen.findByTestId("malzeme-aktar-onizleme");
    fireEvent.click(screen.getByTestId("malzeme-aktar-yaz"));
    const toplam = kitSayisi(durum.standardModels);
    const kayip = durum.standardModels.find(m => m.model === "AK140_DSC").defaultParcalar.length;
    act(() => durum.setStandardModels(ms => ms.map(m => (m.model === "AK140_DSC" ? { ...m, defaultParcalar: [] } : m))));
    expect(screen.getByTestId("malzeme-aktar-dogrulama").textContent).toBe(A.dogrulamaMetni({ beklenen: toplam, bulunan: toplam - kayip }));
    expect(screen.getByTestId("malzeme-aktar-eksik-kit").textContent).toContain("AK140_DSC");
  });
  it("AC-39: ikinci çalıştırmada parça ikinci kez oluşmaz", async () => {
    render(<Kap />);
    yukle(dosya(kaynakKitap(XLSX)));
    await screen.findByTestId("malzeme-aktar-onizleme");
    fireEvent.click(screen.getByTestId("malzeme-aktar-yaz"));
    const n = durum.parts.length;
    yukle(dosya(kaynakKitap(XLSX)));
    await screen.findByTestId("malzeme-aktar-onizleme");
    expect(screen.getByTestId("rapor-parca").textContent).toBe(A.RAPOR.parca(0));
    expect(screen.getByTestId("malzeme-aktar-yaz").disabled).toBe(true);
    expect(durum.parts.length).toBe(n);
  });
  it("AC-57: kayıt anında parça ya da model paneli başkasındaysa hiçbir şey yazılmaz, neden panelin adıyla", async () => {
    for (const [kilit, ad] of [["ayar:yedekparca", AYAR_KILITLI.yedekparca], ["ayar:models", AYAR_KILITLI.models]]) {
      window.crmLocks = {
        acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}), heartbeat: vi.fn(),
        list: vi.fn(async () => [{ entity_type: "ayar", entity_id: kilit.split(":")[1], locked_by: "ayse" }]),
      };
      const toast = vi.fn();
      render(<Kap toast={toast} />);
      await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
      await new Promise(r => setTimeout(r, 0));
      yukle(dosya(kaynakKitap(XLSX)));
      await screen.findByTestId("malzeme-aktar-onizleme");
      fireEvent.click(screen.getByTestId("malzeme-aktar-yaz"));
      expect(toast).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`${ad.replace("/", "\\/")}.*"ayse"`)), "err");
      expect(durum.parts).toEqual([]);
      expect(kitSayisi(durum.standardModels)).toBe(0);
      expect(denetim.kayitlar).toEqual([]);
      cleanup(); delete window.crmLocks;
    }
  });
});
