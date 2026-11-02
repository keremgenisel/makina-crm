// @vitest-environment jsdom
// Spec 0123: dört kapı ekranda. Silme onayı gerçek Settings'te (Katalog › Parça/Yedek Parça, App gibi bağlanır: panele canlı dizi,
// `rawParts` ham dizi), Kalıcı Sil ve "çöpü boşalt" gerçek SettingsTrash'te (durumlu kap), otuz günlük temizlik gerçek App'te.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { SETTE_PARCA_NEDENI, SETTE_PARCA_RED_METNI } from "../../src/lib/urunAgaci";

const denetim = vi.hoisted(() => ({ kayitlar: [] }));
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (o) => denetim.kayitlar.push(o) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.crmStorage; delete window.appServer; delete window.crmLocks; denetim.kayitlar.length = 0; });

const COP = "2026-10-01T09:00:00.000Z";
const BUGUNKU_METIN = (ad) => `"${ad}" yedek parça tanımı Çöp Kutusu'na taşınacak (30 gün içinde geri alınabilir). Daha önce verilmiş kayıtlar geçmişte kalır.`;
const PARCALAR = [
  { id: 1, ad: "Rulman", models: ["AK100"] }, { id: 2, ad: "Pul", models: [] }, { id: 3, ad: "Kayış", models: [] }, { id: 4, ad: "Mil", models: ["AK100"] },
  { id: 5, ad: "Conta", models: [] },
  { id: 10, ad: "Rulman Seti", models: [], setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 2, miktar: 4 }] },
  { id: 11, ad: "Pul Seti", models: [], deletedAt: COP, setIcerigi: [{ partId: 2, miktar: 1 }, { partId: 3, miktar: 1 }] },
];
const MODELLER = [{ model: "AK100", defaultParcalar: [{ partId: "1", ad: "Rulman", miktar: 2 }, { partId: "4", ad: "Mil", miktar: 1 }] }];
const OZEL = [{ model: "OZEL", defaultParcalar: [{ partId: "1", ad: "Rulman", miktar: 1 }] }];

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.54.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
let durum;
function Katalog({ p0 = PARCALAR }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} initialTab="yedekparca" parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts}
    standardModels={MODELLER} setStandardModels={vi.fn()} customModels={OZEL} setCustomModels={vi.fn()} rawCustomModels={OZEL}
    tedarikciler={[]} setTedarikciler={vi.fn()} giderYetki />;
}
const silmeyiAc = (ad) => {
  const satir = screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
  fireEvent.click(within(satir).getAllByRole("button").at(-1));
};
const onayMetni = () => screen.getByText("Emin misiniz?").closest("div").parentElement.textContent;

describe("Spec 0123 B: silme onayı kullanımı söyler (R3, R3/4, R3/6)", () => {
  it("AC-1 / AC-22: sette bileşen ve kitte geçen parça: setler adıyla, kit sayısıyla; satır kendi tutamağıyla", () => {
    render(<Katalog />);
    silmeyiAc("Rulman");
    expect(screen.getByTestId("parca-kullanim").textContent).toBe("Bu parça şu setlerin içeriğinde geçiyor: Rulman Seti. 2 model kitinde de geçiyor.");
    expect(onayMetni()).toContain(BUGUNKU_METIN("Rulman"));
  });
  it("AC-22 (R3/6): yalnız çöpteki bir setin bileşeni olan parçanın onayında da satır çizilir (ham dizi); çöpteki set ekli adla", () => {
    render(<Katalog />);
    silmeyiAc("Kayış");
    expect(screen.getByTestId("parca-kullanim").textContent).toBe("Bu parça şu setlerin içeriğinde geçiyor: Pul Seti (silinmiş parça).");
    cleanup();
    render(<Katalog />);
    silmeyiAc("Pul");
    expect(screen.getByTestId("parca-kullanim").textContent).toBe("Bu parça şu setlerin içeriğinde geçiyor: Rulman Seti, Pul Seti (silinmiş parça).");
  });
  it("AC-3 / AC-22: yalnız model kitinde geçen parça kit sayısını yazar, 'de' bağlacı ve set yok", () => {
    render(<Katalog />);
    silmeyiAc("Mil");
    expect(screen.getByTestId("parca-kullanim").textContent).toBe("Bu parça 1 model kitinde geçiyor.");
  });
  it("AC-2 (Karar 30): kullanılmayan parça ve kullanılmayan set bugünkü metni birebir gösterir, kullanım satırı yok", () => {
    for (const ad of ["Conta", "Rulman Seti"]) {
      render(<Katalog />);
      silmeyiAc(ad);
      expect(screen.queryByTestId("parca-kullanim")).toBeNull();
      expect(screen.getByText(BUGUNKU_METIN(ad))).toBeTruthy();
      cleanup();
    }
  });
  it("AC-4: çöpe atma engellenmez; onaydan sonra kullanılan parça çöpe düşer", () => {
    render(<Katalog />);
    silmeyiAc("Rulman");
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(durum.parts.find(p => p.id === 1).deletedAt).toBeTruthy();
  });
});

// ── Çöp Kutusu ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const bos = [], noop = () => {};
let cop;
function TrashH({ parts, models = [], showToast = noop }) {
  const [prc, setPrc] = useState(structuredClone(parts));
  const [mdl, setMdl] = useState(structuredClone(models));
  cop = { prc, mdl };
  return <SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
    rawKalipDefs={bos} rawParts={prc} rawCustomModels={mdl} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
    setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop} setKalipDefs={noop}
    setParts={setPrc} setCustomModels={setMdl} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
    appSettings={{}} showToast={showToast} serverPermissions={null} />;
}
const satir = (ad) => screen.getByText(ad).closest("tr");
const kaliciSil = (ad) => { fireEvent.click(within(satir(ad)).getByRole("button", { name: /Kalıcı Sil/ })); fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ })); };

describe("Spec 0123 B: Çöp Kutusu kapıları (R4, R4/3, R4/5)", () => {
  const COPTE = [
    { id: 1, ad: "Rulman", deletedAt: COP }, { id: 3, ad: "Kayış", deletedAt: COP }, { id: 5, ad: "Conta", deletedAt: COP },
    { id: 10, ad: "Rulman Seti", setIcerigi: [{ partId: 1, miktar: 2 }] },
    { id: 11, ad: "Pul Seti", deletedAt: COP, setIcerigi: [{ partId: 3, miktar: 1 }] },
  ];
  it("AC-5 / AC-12 / AC-18 / AC-26 / AC-27: korunan satırda düğme çizilir, neden yazar; onayda hata bildirimi, kayıt ve damga aynen, iz yok", () => {
    const toast = vi.fn();
    render(<TrashH parts={COPTE} showToast={toast} />);
    expect(within(satir("Rulman")).getByTestId("cop-neden").textContent).toBe(SETTE_PARCA_NEDENI);
    const once = structuredClone(cop.prc);
    kaliciSil("Rulman");
    expect(toast).toHaveBeenCalledWith(SETTE_PARCA_RED_METNI, "err");
    expect(cop.prc).toEqual(once);
    expect(denetim.kayitlar).toEqual([]);
    expect(within(satir("Conta")).queryByTestId("cop-neden")).toBeNull();
  });
  it("AC-9 / AC-19 / R7: yalnız çöpteki setin bileşeni Kalıcı Sil'de korunur; set geri alınınca eksiksiz döner", () => {
    render(<TrashH parts={COPTE} />);
    expect(within(satir("Kayış")).getByTestId("cop-neden").textContent).toBe(SETTE_PARCA_NEDENI);
    kaliciSil("Kayış");
    expect(cop.prc.some(p => p.id === 3)).toBe(true);
    fireEvent.click(within(satir("Pul Seti")).getByRole("button", { name: /Geri Al/ }));
    fireEvent.click(within(satir("Kayış")).getByRole("button", { name: /Geri Al/ }));
    const pulSeti = cop.prc.find(p => p.id === 11);
    expect(pulSeti.deletedAt).toBeFalsy();
    expect(pulSeti.setIcerigi).toEqual([{ partId: 3, miktar: 1 }]);
    expect(cop.prc.find(p => p.id === 3).deletedAt).toBeFalsy();
  });
  it("AC-6: yalnız model kitinde geçen parça kalıcı silinir; kit satırı ad ve miktarla yerinde kalır", () => {
    const models = [{ model: "OZEL", defaultParcalar: [{ partId: "5", ad: "Conta", miktar: 3 }] }];
    render(<TrashH parts={COPTE} models={models} />);
    kaliciSil("Conta");
    expect(cop.prc.some(p => p.id === 5)).toBe(false);
    expect(cop.mdl[0].defaultParcalar).toEqual([{ partId: "5", ad: "Conta", miktar: 3 }]);
  });
  it("AC-7 / AC-20 / Karar 46: çöpü boşalt canlı setin bileşenini bırakır ve bildirimde sayar; yalnız çöpteki setin bileşeni ve kullanılmayan silinir", () => {
    const toast = vi.fn();
    render(<TrashH parts={COPTE} showToast={toast} />);
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(cop.prc.map(p => p.id).sort()).toEqual([1, 10]);
    expect(toast).toHaveBeenLastCalledWith("Çöp kutusu boşaltıldı. Sette bileşen olan 1 yedek parça tanımı çöpte bırakıldı.");
  });
  it("Karar 46: bırakılan parça yoksa bildirim bugünkü metinle", () => {
    const toast = vi.fn();
    render(<TrashH parts={[{ id: 5, ad: "Conta", deletedAt: COP }]} showToast={toast} />);
    fireEvent.click(screen.getByRole("button", { name: /Çöp Kutusunu Boşalt/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(toast).toHaveBeenLastCalledWith("Çöp kutusu boşaltıldı.");
  });
});

// ── Otuz günlük otomatik temizlik (gerçek App) ─────────────────────────────────────────────────────────────────────────────
describe("Spec 0123: otuz günlük temizlik (R4/4, Karar 40)", () => {
  it("AC-8 / AC-21: sette bileşen olan eski çöp kalır; kullanılmayan silinir; süresi dolmuş çöpteki setin bileşeni bu turda kalır", async () => {
    const ESKI = new Date(Date.now() - 60 * 86400000).toISOString();
    const veri = {
      parts: [
        { id: 1, ad: "Rulman", deletedAt: ESKI }, { id: 2, ad: "Kullanılmayan", deletedAt: ESKI }, { id: 3, ad: "Kayış", deletedAt: ESKI },
        { id: 10, ad: "Rulman Seti", setIcerigi: [{ partId: 1, miktar: 1 }] },
        { id: 11, ad: "Eski Set", deletedAt: ESKI, setIcerigi: [{ partId: 3, miktar: 1 }] },
      ],
      appSettings: {}, dataVersion: 1,
    };
    const save = vi.fn(async () => true);
    window.crmStorage = { load: vi.fn(async () => structuredClone(veri)), save, getVersion: vi.fn(async () => 1) };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    const { default: App } = await import("../../src/App");
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
    await new Promise(r => setTimeout(r, 800));
    fireEvent.click(screen.getAllByText("Ayarlar").find(e => e.closest("nav")));
    fireEvent.click(screen.getAllByText("Veri Yönetimi").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText("Çöp Kutusu").pop());
    expect(within((await screen.findByText("Rulman")).closest("tr")).getByTestId("cop-neden").textContent).toBe(SETTE_PARCA_NEDENI);
    expect(screen.getByText("Kayış")).toBeTruthy(); // süresi dolmuş çöpteki setin bileşeni bu turda korundu
    expect(screen.queryByText("Kullanılmayan")).toBeNull();
    expect(screen.queryByText("Eski Set")).toBeNull();
  });
});
