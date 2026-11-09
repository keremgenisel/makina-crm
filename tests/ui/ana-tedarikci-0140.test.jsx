// @vitest-environment jsdom
// Spec 0140 A (ekran): parça kartında Ana tedarikçi (AC-1–AC-3), katalog süzgeci (AC-62, AC-63), Tedarikler ekranı (AC-57, AC-58,
// AC-61), Çöp Kutusu (AC-7, AC-8, AC-59, AC-61), gerçek App'te otuz günlük temizlik (AC-9). Saf kurallar tests/ana-tedarikci-0140.test.js'te.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { ANA_TEDARIKCI_ETIKETI, SUZGEC_GIRILMEMIS, SUZGEC_GIRILMEMIS_ETIKETI } from "../../src/components/PartManager";
import { ANA_TEDARIKCI_NEDENI, MALZEME_TEDARIKCI_NEDENI, KALEMDE_TEDARIKCI_NEDENI } from "../../src/lib/gider";
import { SILINMIS_TEDARIKCI, BULUNAMAYAN_TEDARIKCI } from "../../src/lib/urunAgaci";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; });
const noop = () => {};
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.57.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
const TED = [{ id: 12, ad: "Rulman Dünyası" }, { id: 13, ad: "Ana Çelik", hammadde: true }, { id: 14, ad: "Eski Firma", deletedAt: "2026-10-01T00:00:00.000Z" }];
const PARCALAR = [
  { id: 7, ad: "Rulman", models: [], maliyet: 120, tedarikciId: 12 },
  { id: 8, ad: "Kaplanmış mil", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Kaplama", tedarikciId: 13, tutar: 50 }] },
  { id: 9, ad: "Kayış", models: [], maliyet: 30 },
];
const canli = (a) => a.filter(x => !x.deletedAt);
let durum;
function Katalog({ p0 = PARCALAR, giderYetki = true }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} initialTab="yedekparca" parts={canli(parts)} setParts={setParts} standardModels={[]} setStandardModels={vi.fn()}
    customModels={[]} setCustomModels={vi.fn()} rawParts={parts} rawCustomModels={[]} tedarikciler={TED} setTedarikciler={vi.fn()} giderYetki={giderYetki} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);

describe("Spec 0140 A: parça kartı", () => {
  it("AC-1 / AC-56: gider yetkisiyle Ana tedarikçi seçilir; kayıt kök `tedarikciId` taşır, kalem bağı değişmez; çöpteki seçicide yok, hammadde başta", () => {
    render(<Katalog />);
    duzenle("Kaplanmış mil");
    const s = screen.getByLabelText(ANA_TEDARIKCI_ETIKETI);
    expect([...s.options].map(o => o.textContent)).toEqual(["Seçilmedi", "Ana Çelik · hammadde", "Rulman Dünyası"]);
    fireEvent.change(s, { target: { value: "12" } });
    kaydet();
    expect(kayit(8).tedarikciId).toBe(12);
    expect(kayit(8).maliyetKalemleri).toEqual(PARCALAR[1].maliyetKalemleri);
  });
  it("AC-4: boş bırakılan Ana tedarikçi alanı kayda yazılmaz; seçim kaldırılınca alan silinir", () => {
    render(<Katalog />);
    duzenle("Kayış"); kaydet();
    expect("tedarikciId" in kayit(9)).toBe(false);
    duzenle("Rulman");
    fireEvent.change(screen.getByLabelText(ANA_TEDARIKCI_ETIKETI), { target: { value: "" } });
    kaydet();
    expect("tedarikciId" in kayit(7)).toBe(false);
  });
  it("Triyaj bulgu 5: çöpteki ya da bulunamayan Ana tedarikçi seçicide ibaresiyle görünür; dokunmadan kayıt bağı korur", () => {
    render(<Katalog p0={[{ id: 7, ad: "Rulman", models: [], maliyet: 120, tedarikciId: 14 }, { id: 9, ad: "Kayış", models: [], tedarikciId: 99 }]} />);
    duzenle("Rulman");
    const s = screen.getByLabelText(ANA_TEDARIKCI_ETIKETI);
    expect(s.options[s.selectedIndex].textContent).toBe(`Eski Firma (${SILINMIS_TEDARIKCI})`);
    kaydet();
    expect(kayit(7).tedarikciId).toBe(14);
    duzenle("Kayış");
    const s2 = screen.getByLabelText(ANA_TEDARIKCI_ETIKETI);
    expect(s2.options[s2.selectedIndex].textContent).toBe(BULUNAMAYAN_TEDARIKCI);
    expect([...s2.options].map(o => o.textContent)).not.toContain(`Eski Firma (${SILINMIS_TEDARIKCI})`);
  });
  it("AC-2 / AC-3: gider yetkisi olmayan kullanıcı alanı görmez; kaydında bağ korunur", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Rulman");
    expect(screen.queryByLabelText(ANA_TEDARIKCI_ETIKETI)).toBeNull();
    expect(document.body.textContent).not.toContain("Rulman Dünyası");
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Rulman 6205" } });
    kaydet();
    expect(kayit(7)).toEqual({ ...PARCALAR[0], ad: "Rulman 6205" });
  });
});

describe("Spec 0140 A-R6: katalog süzgeci", () => {
  const suz = (v) => fireEvent.change(screen.getByLabelText("Tedarikçi süzgeci"), { target: { value: v } });
  it("AC-62 / AC-63: süzgeç Ana tedarikçiyi de okur; 'girilmemiş' ikisinin de boş olmasıdır, sayılar buna göre", () => {
    render(<Katalog />);
    expect([...screen.getByLabelText("Tedarikçi süzgeci").options].map(o => o.textContent))
      .toEqual(["Tüm parçalar", "Ana Çelik (1)", "Rulman Dünyası (1)", `${SUZGEC_GIRILMEMIS_ETIKETI} (1)`]);
    suz("12");
    expect(satir("Rulman")).toBeTruthy(); expect(screen.queryByText("Kayış")).toBeNull();
    suz(SUZGEC_GIRILMEMIS);
    expect(satir("Kayış")).toBeTruthy(); expect(screen.queryByText("Rulman")).toBeNull(); expect(screen.queryByText("Kaplanmış mil")).toBeNull();
  });
});

// ── Tedarikler ve Ekstre ─────────────────────────────────────────────────────────────────────────────────────────────
function TedH({ t0, parts = [], malzemeler = [] }) {
  const [ted, setTed] = useState(t0);
  return <Tedarikciler tedarikciler={ted} setTedarikciler={setTed} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} parts={parts} malzemeler={malzemeler} />;
}
const tedSatir = (ad) => screen.getByText(ad).closest("tr");
describe("Spec 0140 A-R5: Tedarikler ekranı", () => {
  it("AC-57 / AC-58: Ana tedarikçi bağı çöpe atmayı engellemez; kullanım hücresi Ana ve malzeme sayılarını çöpteki ayrı yazar", () => {
    const parts = [{ id: 1, ad: "Rulman", tedarikciId: 12 }, { id: 2, ad: "Motor", tedarikciId: 12, deletedAt: "x" }];
    const malzemeler = [{ id: 501, ad: "304", tedarikciId: 12 }];
    render(<TedH t0={[TED[0]]} parts={parts} malzemeler={malzemeler} />);
    expect(within(tedSatir("Rulman Dünyası")).getAllByRole("cell")[2].textContent)
      .toBe("2 parçanın Ana tedarikçisi (1’i çöpte) · 1 malzemenin Ana tedarikçisi");
    fireEvent.click(within(tedSatir("Rulman Dünyası")).getByTitle("Sil"));
    expect(screen.queryByText(/silinemez/)).toBeNull();
  });
  it("AC-61: 'silinemez' penceresi kalem bağlı parçaların en çok üç adını ve 've n parça daha' yazar; çöpteki ekli", () => {
    const k = (id, ad, cop) => ({ id, ad, ...(cop ? { deletedAt: "x" } : {}), maliyetKalemleri: [{ tur: "islem", ad: "Kaplama", tedarikciId: 13, tutar: 1 }] });
    render(<TedH t0={[TED[1]]} parts={[k(1, "A", true), k(2, "B"), k(3, "C"), k(4, "D")]} />);
    fireEvent.click(within(tedSatir("Ana Çelik")).getByTitle("Sil"));
    expect(screen.getByTestId("tedarikci-parca-adlari").textContent).toBe("A (silinmiş parça), B, C ve 1 parça daha");
  });
});

// ── Çöp Kutusu ───────────────────────────────────────────────────────────────────────────────────────────────────────
const bos = [];
function TrashH({ t0, parts = [], malzemeler = [], onState }) {
  const [ted, setTed] = useState(t0);
  onState?.({ ted });
  return <SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
    rawKalipDefs={bos} rawParts={parts} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
    rawMalzemeler={malzemeler} setMalzemeler={noop}
    setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop} setKalipDefs={noop}
    setParts={noop} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
    appSettings={{}} showToast={noop} giderYetki rawGiderler={bos} setGiderler={noop}
    rawTedarikciler={ted} setTedarikciler={setTed} rawUretimPartileri={bos} setUretimPartileri={noop} serverPermissions={null} />;
}
const Z = "2026-10-01T09:00:00.000Z";
describe("Spec 0140 A-R5: Çöp Kutusu", () => {
  const t0 = [{ id: 12, ad: "Rulman Dünyası", deletedAt: Z }, { id: 13, ad: "Ana Çelik", deletedAt: Z }, { id: 15, ad: "Serbest", deletedAt: Z }];
  const parts = [{ id: 1, ad: "Rulman", tedarikciId: 12 }, { id: 2, ad: "Motor", tedarikciId: 12, deletedAt: Z }];
  const malzemeler = [{ id: 501, ad: "304 Paslanmaz", tedarikciId: 13 }];
  it("AC-7 / AC-8 / AC-59 / AC-61: Ana tedarikçi (çöpteki parça dahil) ve malzemenin tedarikçisi Kalıcı Sil'siz, satırda cümle + adlar", () => {
    render(<TrashH t0={t0} parts={parts} malzemeler={malzemeler} />);
    const s12 = screen.getByText("Rulman Dünyası").closest("tr");
    expect(within(s12).queryByRole("button", { name: /Kalıcı Sil/ })).toBeNull();
    expect(within(s12).getByTestId("cop-neden").textContent).toBe(`${ANA_TEDARIKCI_NEDENI} Parçalar: Rulman, Motor (silinmiş parça).`);
    const s13 = screen.getByText("Ana Çelik").closest("tr");
    expect(within(s13).queryByRole("button", { name: /Kalıcı Sil/ })).toBeNull();
    expect(within(s13).getByTestId("cop-neden").textContent).toBe(`${MALZEME_TEDARIKCI_NEDENI} Malzemeler: 304 Paslanmaz.`);
    expect(within(screen.getByText("Serbest").closest("tr")).getByRole("button", { name: /Kalıcı Sil/ })).toBeTruthy();
  });
  it("AC-9: çöpü boşalt Ana tedarikçi ve malzeme bağlı olanı bırakır; yalnız çöpteki parçanın bağı korumaz", () => {
    let st;
    const yalnizCop = [{ id: 2, ad: "Motor", tedarikciId: 15, deletedAt: Z }, { id: 1, ad: "Rulman", tedarikciId: 12 }];
    render(<TrashH t0={t0} parts={yalnizCop} malzemeler={malzemeler} onState={x => { st = x; }} />);
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(st.ted.map(t => t.id)).toEqual([12, 13]);
  });
});

// ── Gerçek App: otuz günlük temizlik ────────────────────────────────────────────────────────────────────────────────
const { default: App } = await import("../../src/App");
const ESKI = new Date(Date.now() - 60 * 86400000).toISOString();
describe("Spec 0140 gerçek App", () => {
  it("AC-9: otuz günlük temizlik Ana tedarikçi ve malzeme bağlı çöpteki tedarikçiyi korur, bağsızı siler", async () => {
    const veri = {
      tedarikciler: [{ id: 12, ad: "Rulman Dünyası", deletedAt: ESKI }, { id: 13, ad: "Ana Çelik", deletedAt: ESKI }, { id: 15, ad: "Kullanılmayan", deletedAt: ESKI }],
      parts: [{ id: 5, ad: "Rulman", models: [], tedarikciId: 12 }],
      malzemeler: [{ id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 3, tedarikciId: 13 }],
      giderTurleri: [], giderler: [], giderTanimlari: [], hesapHareketleri: [], kasaHesaplari: [], cekler: [],
      appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1,
    };
    window.crmStorage = { load: vi.fn(async () => structuredClone(veri)), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
    await new Promise(r => setTimeout(r, 800));
    fireEvent.click(screen.getAllByText("Ayarlar").find(e => e.closest("nav")));
    fireEvent.click(screen.getAllByText("Veri Yönetimi").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText("Çöp Kutusu").pop());
    expect((await screen.findByText("Rulman Dünyası")).closest("tr")).toBeTruthy();
    expect(screen.getByText("Ana Çelik")).toBeTruthy();
    expect(screen.queryByText("Kullanılmayan")).toBeNull();
    expect(KALEMDE_TEDARIKCI_NEDENI).not.toBe(ANA_TEDARIKCI_NEDENI);
  });
});
