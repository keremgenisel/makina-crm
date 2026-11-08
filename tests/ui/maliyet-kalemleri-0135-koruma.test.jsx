// @vitest-environment jsdom
// Spec 0135 R31–R32/2, C5, C5/2: malzemenin ve tedarikçinin korumaları ve kullanım okumaları kalemlerin HEPSİNİ okur (yalnız
// birinciyi değil). Gerçek Çöp Kutusu (Kalıcı Sil, çöpü boşalt), gerçek Malzemeler paneli (kullanım sütunu, silme onayı) ve gerçek
// Tedarikler ekranı (kullanım hücresi, "silinemez" penceresi). Otuz günlük temizlik gerçek App'te (maliyet-kalemleri-0135-app).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { Tedarikciler, SIL_PARCA_YONLENDIRME } from "../../src/components/gider/Tedarikciler";
import { KALEMDE_MALZEME_NEDENI, KALEMDE_MALZEME_RED, kullanimMetni } from "../../src/lib/malzeme";
import { KALEMDE_TEDARIKCI_NEDENI } from "../../src/lib/gider";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); toast.mockClear(); });
const toast = vi.fn();
const COP = "2026-10-20T09:00:00.000Z";
const SACK = (malzemeId) => ({ tur: "malzeme", malzemeId, bicim: "sac", kalinlik: 3, en: 200, boy: 300, adet: 1 });
const islem = (ad, tedarikciId) => ({ tur: "islem", ad, tedarikciId, tutar: 10 });
// Malzeme 502 ve tedarikçi 32 parçanın İKİNCİ kaleminde geçer (yalnız birinciyi okuyan koruma onları kaçırırdı).
const PARTS = [
  { id: 1, ad: "Gövde", models: [], maliyetKalemleri: [SACK(501), SACK(502), islem("Lazer", 31), islem("Büküm", 32)] },
  { id: 2, ad: "Çöpteki", models: [], deletedAt: COP, maliyetKalemleri: [islem("Kaplama", 33), SACK(503)] },
];
const bos = [];

function Cop({ m0 = [], t0 = [], parts = PARTS, onState }) {
  const [malzemeler, setMalzemeler] = useState(m0);
  const [ted, setTed] = useState(t0);
  const [prc, setPrc] = useState(parts);
  onState?.({ malzemeler, ted, prc });
  return <SettingsTrash rawMalzemeler={malzemeler} setMalzemeler={setMalzemeler} rawParts={prc} setParts={setPrc} showToast={toast}
    rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos} rawKalipDefs={bos} rawCustomModels={bos}
    rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos} setCustomers={vi.fn()} setServices={vi.fn()} setPartSales={vi.fn()} setPayments={vi.fn()}
    setDealers={vi.fn()} setStock={vi.fn()} setNotes={vi.fn()} setKalipDefs={vi.fn()} setCustomModels={vi.fn()} setTeklifler={vi.fn()} setFaturalar={vi.fn()} setUretimFormlari={vi.fn()}
    setGorusmeler={vi.fn()} setDosyalar={vi.fn()} appSettings={{}} giderYetki rawGiderler={bos} setGiderler={vi.fn()}
    rawTedarikciler={ted} setTedarikciler={setTed} rawUretimPartileri={bos} setUretimPartileri={vi.fn()} serverPermissions={null} />;
}
const copSatiri = (metin) => screen.getAllByText(metin)[0].closest("tr");

describe("Spec 0135: Çöp Kutusu kapıları (C5)", () => {
  it("AC-58: ikinci malzeme kaleminde geçen malzeme kalıcı silinemez; satırda neden, onayda ret", () => {
    let st;
    render(<Cop m0={[{ id: 502, ad: "DKP Sac", deletedAt: COP }, { id: 504, ad: "Kullanılmayan", deletedAt: COP }]} onState={x => { st = x; }} />);
    const r = copSatiri("DKP Sac");
    expect(within(r).getByTestId("cop-neden").textContent).toBe(KALEMDE_MALZEME_NEDENI);
    fireEvent.click(within(r).getByRole("button", { name: /Kalıcı Sil/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(st.malzemeler.map(m => m.id)).toContain(502);
    expect(toast.mock.calls.some(c => c[0] === KALEMDE_MALZEME_RED)).toBe(true);
  });
  it("AC-59: çöpü boşalt kalemlerde (ikinci kalem dahil) geçen malzemeyi bırakır; aynı işlemde silinen çöpteki parçanın kalemi korumaz", () => {
    let st;
    render(<Cop m0={[{ id: 502, ad: "DKP Sac", deletedAt: COP }, { id: 503, ad: "Çöp parçanın malzemesi", deletedAt: COP }]} onState={x => { st = x; }} />);
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(st.malzemeler.map(m => m.id)).toEqual([502]);
  });
  it("AC-61: ikinci işlem kaleminde geçen tedarikçinin Kalıcı Sil'i yok, satırda neden yazar; çöpü boşalt onu bırakır", () => {
    let st;
    render(<Cop t0={[{ id: 32, ad: "Büküm Ltd", deletedAt: COP }, { id: 34, ad: "Boştaki", deletedAt: COP }]} onState={x => { st = x; }} />);
    const r = copSatiri("Büküm Ltd");
    expect(within(r).getByTestId("cop-neden").textContent).toBe(KALEMDE_TEDARIKCI_NEDENI);
    expect(within(r).queryByRole("button", { name: /Kalıcı Sil/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(st.ted.map(t => t.id)).toEqual([32]);
  });
});

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), setParts: vi.fn(), tedarikciler: [], setTedarikciler: vi.fn(),
};
function Panel() {
  const [malzemeler, setMalzemeler] = useState([{ id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 3 }, { id: 502, ad: "DKP Sac", ozgulAgirlik: 7.85, kiloFiyati: 38 }, { id: 503, ad: "Çöp parçanın", ozgulAgirlik: 7.8, kiloFiyati: 1 }, { id: 504, ad: "Sade", ozgulAgirlik: 7.8, kiloFiyati: 1 }]);
  return <Settings {...BASE} initialTab="malzemeler" malzemeler={malzemeler.filter(m => !m.deletedAt)} setMalzemeler={setMalzemeler} rawMalzemeler={malzemeler}
    parts={PARTS.filter(p => !p.deletedAt)} rawParts={PARTS} rates={{ usd: 42 }} giderYetki />;
}
describe("Spec 0135: Malzemeler panelinin kullanım okumaları (R31/2, C5/2)", () => {
  it("AC-104: kullanım sütunu ikinci kalemde kullanan parçayı sayar; silme onayı aynı sayıyı kalem diliyle yazar", () => {
    render(<Panel />);
    const satir = (ad) => screen.getAllByTestId("malzeme-satiri").find(r => r.textContent.includes(ad));
    expect(satir("DKP Sac").textContent).toContain(kullanimMetni({ canli: 1, cop: 0 }));
    expect(kullanimMetni({ canli: 1, cop: 0 })).toBe("1 parçanın maliyet kaleminde kullanılıyor.");
    expect(satir("Çöp parçanın").textContent).toContain(kullanimMetni({ canli: 0, cop: 1 })); // çöpteki parçanın ikinci kalemi
    expect(satir("Sade").textContent).toContain("Hiçbir parçanın maliyet kaleminde kullanılmıyor.");
    fireEvent.click(screen.getByRole("button", { name: "DKP Sac sil" }));
    expect(screen.getByTestId("malzeme-sil-kullanim").textContent).toContain(kullanimMetni({ canli: 1, cop: 0 }));
  });
});

function TedH({ t0, parts = PARTS }) {
  const [ted, setTed] = useState(t0);
  return <Tedarikciler tedarikciler={ted} setTedarikciler={setTed} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} parts={parts} />;
}
describe("Spec 0135: Tedarikler ekranının kullanım okumaları (R32/2, C5/2)", () => {
  it("AC-105: kullanım hücresi işlem kalemindeki tedarikçiyi sayar (çöpteki parça dahil); 'silinemez' penceresi aynı sayıyla kalem dilinde", () => {
    render(<TedH t0={[{ id: 32, ad: "Büküm Ltd" }, { id: 33, ad: "Kaplamacı" }, { id: 35, ad: "Boştaki" }]} />);
    const hucre = (ad) => within(screen.getByText(ad).closest("tr")).getAllByRole("cell")[2].textContent;
    expect(hucre("Büküm Ltd")).toBe("1 parçanın maliyet kaleminde");
    expect(hucre("Kaplamacı")).toBe("1 parçanın maliyet kaleminde (1’i çöpte)");
    expect(hucre("Boştaki")).toBe("Kullanılmıyor");
    fireEvent.click(within(screen.getByText("Büküm Ltd").closest("tr")).getByTitle("Sil"));
    const metin = screen.getByTestId("tedarikci-parca-kullanim").textContent;
    expect(metin).toMatch(/1 parçanın maliyet kaleminde geçiyor/);
    expect(metin).toContain(SIL_PARCA_YONLENDIRME);
    expect(SIL_PARCA_YONLENDIRME).toMatch(/maliyet kaleminden/);
  });
});
