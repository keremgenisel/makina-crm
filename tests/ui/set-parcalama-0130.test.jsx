// @vitest-environment jsdom
// Spec 0130: Parça Stoğu'nda "Seti Parçala", parçalama penceresi ve Stok Hareketleri'nden geri alma. Gerçek PartStokTab
// (durumlu kap: partStock / partStockLog gerçek setter'lar). Motor kriterleri tests/set-parcalama-0130.test.js'te.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { useState } from "react";
import { readFileSync } from "node:fs";
import { PartStokTab } from "../../src/components/stock/PartStokTab";
import { SetHazirlaPenceresi } from "../../src/components/stock/SetHazirlaPenceresi";
import { SetParcalaPenceresi } from "../../src/components/stock/SetParcalaPenceresi";
import { totalMiktar } from "../../src/lib/utils";
import { HAREKET_TIP_AD } from "../../src/lib/stokHareketi";
import { GERI_ALINDI_IBARESI, PARCALAMA_KIRPMA_IBARESI, PARCALAMA_ADET_HATASI, parcalamaStokHatasi, parcalamaGeriAlRedMetni, parcalamaNotu } from "../../src/lib/setUretimi";
import { KILIT_ALANLARI } from "../../src/lib/kilitAlanlari";

const denetim = vi.hoisted(() => ({ kayitlar: [] }));
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (o) => denetim.kayitlar.push(o) }));

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; delete window.appServer; });
beforeEach(() => { denetim.kayitlar.length = 0; vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-02T10:00:00")); });

const PARCALAR = [
  { id: 7, ad: "Rulman", fiyatTRY: "500", maliyet: 100 },
  { id: 8, ad: "Pul", fiyatTRY: "20", maliyet: 2 },
  { id: 10, ad: "Rulman Seti", fiyatTRY: "3000", setIcerigi: [{ partId: 7, miktar: 2 }, { partId: 8, miktar: 4 }] },
  { id: 11, ad: "Kayış", fiyatTRY: "300" },
  { id: 12, ad: "Boş Set", setIcerigi: [{ partId: 7, miktar: 1 }] },
];
let durum;
function Kap({ ps0 = [{ id: 1, partId: "7", miktar: 1 }, { id: 3, partId: "10", miktar: 5 }, { id: 4, partId: "11", miktar: 3 }], log0 = [], canDoStock = () => true, toast = vi.fn() }) {
  const [partStock, setPartStock] = useState(structuredClone(ps0));
  const [partStockLog, setPartStockLog] = useState(structuredClone(log0));
  durum = { partStock, partStockLog };
  return <PartStokTab parts={PARCALAR} rawParts={PARCALAR} partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog}
    setPartStockLog={setPartStockLog} showToast={toast} canDoStock={canDoStock} aktifKullanici="kerem" />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const adet = (pid) => totalMiktar(durum.partStock, String(pid));
const parcalaAc = () => fireEvent.click(within(satir("Rulman Seti")).getByTestId("set-parcala-dugmesi"));
const alan = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const parcala = () => fireEvent.click(screen.getAllByRole("button", { name: /Seti Parçala/ }).at(-1));
const hareketlerAc = (ad) => fireEvent.click(within(satir(ad)).getByRole("button", { name: "Hareketler" }));

describe("Spec 0130 E: Parça Stoğu satırı (R14, R18)", () => {
  it("AC-17 / AC-18: düğme içeriği olan ve stoğu sıfırdan büyük sette; içeriksiz parçada ve stoksuz sette yok; Set Hazırla'nın komşusu", () => {
    render(<Kap />);
    const s = satir("Rulman Seti");
    expect(within(s).getByTestId("set-parcala-dugmesi").textContent).toBe("Seti Parçala");
    expect(within(satir("Kayış")).queryByTestId("set-parcala-dugmesi")).toBeNull();
    expect(within(satir("Boş Set")).queryByTestId("set-parcala-dugmesi")).toBeNull();
    const ad = [...s.querySelectorAll("button")].map(b => b.textContent);
    expect(ad.indexOf("Seti Parçala")).toBe(ad.indexOf("Set Hazırla") + 1);
  });
  it("AC-19: 'Stok miktarı düzelt' yetkisi olmayan kullanıcıda düğme yok", () => {
    render(<Kap canDoStock={(id) => id !== "stock_parca_edit"} />);
    expect(within(satir("Rulman Seti")).queryByTestId("set-parcala-dugmesi")).toBeNull();
  });
});

describe("Spec 0130 C: parçalama penceresi (R15–R17, R19)", () => {
  it("AC-1 (ekran) / AC-2 / AC-25: 3 adet: set −3, Rulman +6, Pul +12; tek işlem kimliği; İşlem Geçmişi set_parcalandi {adet}", () => {
    render(<Kap />);
    parcalaAc();
    expect(screen.getByText("Seti Parçala · Rulman Seti")).toBeTruthy();
    alan("Parçalanan adet", "3");
    parcala();
    expect([adet(10), adet(7), adet(8)]).toEqual([2, 7, 12]);
    expect(new Set(durum.partStockLog.map(l => l.referansId)).size).toBe(1);
    expect(denetim.kayitlar.at(-1)).toEqual(expect.objectContaining({ action: "set_parcalandi", entity: "stok_parca", entityId: 10, entityName: "Rulman Seti", detail: { adet: 3 } }));
    expect(screen.queryByTestId("set-parcala")).toBeNull();
  });
  it("AC-20 / AC-21 / AC-22: bileşen başına girecek adet adetle yeniden hesaplanır; eldeki ve kalacak adet; ibare her zaman", () => {
    render(<Kap />);
    parcalaAc();
    const girecek = () => screen.getAllByTestId("set-parcala-satiri").map(s => s.textContent);
    expect(girecek()).toEqual(["Rulman1+2", "Pul0+4"]);
    expect(screen.getByTestId("set-parcala-eldeki").textContent).toBe("5");
    expect(screen.getByTestId("set-parcala-kalacak").textContent).toBe("4");
    alan("Parçalanan adet", "2");
    expect(girecek()).toEqual(["Rulman1+4", "Pul0+8"]);
    expect(screen.getByTestId("set-parcala-kalacak").textContent).toBe("3");
    expect(screen.getByTestId("set-parcala-ibare").textContent).toBe(PARCALAMA_KIRPMA_IBARESI);
    alan("Parçalanan adet", "9");
    expect(screen.getByTestId("set-parcala-kalacak").textContent).toBe("—");
    expect(screen.getByTestId("set-parcala-ibare")).toBeTruthy();
  });
  it("AC-3 / AC-4 (ekran): fazla ya da geçersiz adette hareket yok, neden pencerede", () => {
    render(<Kap />);
    parcalaAc();
    alan("Parçalanan adet", "9"); parcala();
    expect(screen.getByRole("alert").textContent).toBe(parcalamaStokHatasi(5));
    alan("Parçalanan adet", "1,5"); parcala();
    expect(screen.getByRole("alert").textContent).toBe(PARCALAMA_ADET_HATASI);
    expect(durum.partStockLog).toEqual([]);
    expect(adet(10)).toBe(5);
  });
  it("AC-9 (ekran): not yalnız setin satırında", () => {
    render(<Kap />);
    parcalaAc();
    alan("Parçalanan adet", "1"); alan("Not", "Müşteri dişliyi istedi"); parcala();
    expect(durum.partStockLog.find(l => l.partId === "10").notlar).toBe(`${parcalamaNotu(1)} · Müşteri dişliyi istedi`);
    expect(durum.partStockLog.filter(l => l.partId !== "10").every(l => l.notlar === parcalamaNotu(1))).toBe(true);
  });
  it("AC-23: set başkasının kilidindeyse pencere yerine kilit ekranı, hareket yazılmaz; pencere kilit listesinde", async () => {
    const cagrilar = [];
    window.crmLocks = { acquire: vi.fn(async (t, id) => { cagrilar.push([t, id]); return { ok: false, lockedBy: "ayse", lockedAt: "2026-11-02T09:00:00" }; }),
      release: vi.fn(async () => {}), list: vi.fn(async () => []), releaseAll: vi.fn(async () => {}) };
    render(<Kap />);
    parcalaAc();
    await act(async () => {});
    expect(cagrilar).toContainEqual(["partstock", "10"]);
    expect(screen.getByTestId("set-parcala-kilitli")).toBeTruthy();
    expect(screen.queryByTestId("set-parcala")).toBeNull();
    expect(durum.partStockLog).toEqual([]);
    expect(KILIT_ALANLARI.partstock.pencereler).toContain("src/components/stock/SetParcalaPenceresi.jsx");
  });
  it("Triyaj bulgu 2: kilit cevabı gelmeden kaydet düğmesi pasif, tıklama hareket yazmaz (parçalama ve hazırlama pencereleri)", () => {
    window.crmLocks = { acquire: vi.fn(() => new Promise(() => {})), release: vi.fn(async () => {}), list: vi.fn(async () => []), releaseAll: vi.fn(async () => {}) };
    const set = PARCALAR.find(p => p.id === 10);
    for (const [Pencere, ad] of [[SetParcalaPenceresi, /Seti Parçala/], [SetHazirlaPenceresi, /Set Hazırla/]]) {
      const setPartStock = vi.fn(), setPartStockLog = vi.fn();
      render(<Pencere set={set} hamParts={PARCALAR} partStock={[{ id: 3, partId: "10", miktar: 5 }, { id: 1, partId: "7", miktar: 9 }, { id: 2, partId: "8", miktar: 9 }]}
        setPartStock={setPartStock} setPartStockLog={setPartStockLog} onClose={vi.fn()} />);
      const dugme = screen.getAllByRole("button", { name: ad }).at(-1);
      expect(dugme.disabled, String(ad)).toBe(true);
      fireEvent.click(dugme);
      expect(setPartStockLog).not.toHaveBeenCalled();
      cleanup();
    }
  });
  it("Pencere wide açılır ve maxWidth yazmaz", () => {
    const src = readFileSync("src/components/stock/SetParcalaPenceresi.jsx", "utf8");
    expect(src).toMatch(/<Modal title=\{PARCALA_PENCERE_BASLIGI\(set\?\.ad\)\} onClose=\{onClose\} wide/);
    expect(src).not.toMatch(/maxWidth/);
  });
});

describe("Spec 0130 D: Stok Hareketleri'nden geri alma (R10–R13, Karar 5)", () => {
  const parcalaVeGit = () => { render(<Kap />); parcalaAc(); alan("Parçalanan adet", "2"); parcala(); };
  it("AC-10 / AC-15 / AC-26 / AC-28 (ekran): geri alma stokları döndürür; okunur adlar; düğme yerine ibare; İşlem Geçmişi ayrı eylem", () => {
    parcalaVeGit();
    hareketlerAc("Rulman Seti");
    const p = screen.getByTestId("stok-hareketleri");
    expect(within(p).getAllByTestId("stok-hareket-satiri")[0].textContent).toContain(HAREKET_TIP_AD.set_parcalama);
    fireEvent.click(within(p).getByTestId("parcalama-geri-al"));
    expect([adet(10), adet(7), adet(8)]).toEqual([5, 1, 0]);
    expect(durum.partStockLog).toHaveLength(6);
    const metin = within(p).getAllByTestId("stok-hareket-satiri").map(s => s.textContent).join("|");
    expect(metin).toContain(HAREKET_TIP_AD.set_parcalama_iade);
    expect(within(p).queryByTestId("parcalama-geri-al")).toBeNull();
    expect(within(p).getByTestId("parcalama-geri-alindi").textContent).toBe(GERI_ALINDI_IBARESI);
    expect(denetim.kayitlar.at(-1)).toEqual(expect.objectContaining({ action: "set_parcalama_geri_alindi", entity: "stok_parca", entityId: 10, detail: { adet: 2 } }));
  });
  it("Karar 15 (triyaj bulgu 1): geri alma satırlarının tarihi bugündür, parçalamanın tarihi değil", () => {
    const log0 = [
      { id: 1, partId: "10", miktar: -2, tip: "set_parcalama", referansId: 77, tarih: "2026-10-25", notlar: "" },
      { id: 2, partId: "7", miktar: 4, tip: "parcalama_girisi", referansId: 77, tarih: "2026-10-25", notlar: "" },
    ];
    render(<Kap ps0={[{ id: 1, partId: "7", miktar: 5 }, { id: 3, partId: "10", miktar: 3 }]} log0={log0} />);
    hareketlerAc("Rulman Seti");
    fireEvent.click(screen.getByTestId("parcalama-geri-al"));
    const yeni = durum.partStockLog.slice(2);
    expect(yeni.map(l => l.tip)).toEqual(["set_parcalama_iade", "parcalama_girisi_iptal"]);
    expect(yeni.map(l => l.tarih)).toEqual(["2026-11-02", "2026-11-02"]);
  });
  it("AC-28 (ekran) / Karar 5: bileşenin listesinde giriş satırı okunur adıyla, düğme taşımaz", () => {
    parcalaVeGit();
    hareketlerAc("Pul");
    const p = screen.getByTestId("stok-hareketleri");
    const s = within(p).getAllByTestId("stok-hareket-satiri")[0].textContent;
    expect(s).toContain(HAREKET_TIP_AD.parcalama_girisi);
    expect(s).toContain("+8");
    expect(within(p).queryByTestId("parcalama-geri-al")).toBeNull();
  });
  it("AC-12 (ekran): bileşen kullanıldıysa hareket yok, nedeni pencerede", () => {
    const log0 = [
      { id: 1, partId: "10", miktar: -2, tip: "set_parcalama", referansId: 77, tarih: "2026-11-01", notlar: "" },
      { id: 2, partId: "7", miktar: 4, tip: "parcalama_girisi", referansId: 77, tarih: "2026-11-01", notlar: "" },
    ];
    render(<Kap ps0={[{ id: 1, partId: "7", miktar: 1 }, { id: 3, partId: "10", miktar: 3 }]} log0={log0} />);
    hareketlerAc("Rulman Seti");
    const once = structuredClone(durum);
    fireEvent.click(screen.getByTestId("parcalama-geri-al"));
    expect(durum).toEqual(once);
    expect(screen.getByTestId("set-geri-al-red").textContent).toBe(parcalamaGeriAlRedMetni(3));
  });
  it("AC-24: başkası setin partstock kilidini tutuyorsa geri alma bildirimle reddedilir, hareket yazılmaz", async () => {
    window.crmLocks = { list: vi.fn(async () => [{ entity_type: "partstock", entity_id: "10", locked_by: "ayse" }]), acquire: vi.fn(async () => ({ ok: true })),
      release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}) };
    window.appServer = { onLocksChanged: () => () => {} };
    const toast = vi.fn();
    const log0 = [{ id: 1, partId: "10", miktar: -2, tip: "set_parcalama", referansId: 77, tarih: "2026-11-01", notlar: "" }];
    render(<Kap ps0={[{ id: 3, partId: "10", miktar: 3 }]} log0={log0} toast={toast} />);
    hareketlerAc("Rulman Seti");
    await act(async () => {});
    fireEvent.click(screen.getByTestId("parcalama-geri-al"));
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("ayse"), "err");
    expect(durum.partStockLog).toHaveLength(1);
  });
  it("Geri Al yetkisiz kullanıcıda çizilmez", () => {
    const log0 = [{ id: 1, partId: "10", miktar: -2, tip: "set_parcalama", referansId: 77, tarih: "2026-11-01", notlar: "" }];
    render(<Kap ps0={[{ id: 3, partId: "10", miktar: 3 }]} log0={log0} canDoStock={(id) => id !== "stock_parca_edit"} />);
    hareketlerAc("Rulman Seti");
    expect(screen.queryByTestId("parcalama-geri-al")).toBeNull();
  });
});
