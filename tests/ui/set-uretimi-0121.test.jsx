// @vitest-environment jsdom
// Spec 0121 C, D, E: Parça Stoğu'nda set rozeti ve "Set Hazırla", hazırlama penceresi, Stok Hareketleri'nden geri alma, satış ve
// servis formlarında seçimden sonraki içerik satırı. Gerçek PartStokTab (durumlu kap: partStock / partStockLog gerçek setter'lar).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { useState } from "react";
import { readFileSync } from "node:fs";
import { PartStokTab } from "../../src/components/stock/PartStokTab";
import { ServiceForm } from "../../src/components/ServiceForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { totalMiktar } from "../../src/lib/utils";
import { servisParcaDus } from "../../src/lib/servisStok";
import { yedekParcaDus } from "../../src/lib/yedekParcaStok";
import { HAREKET_TIP_AD } from "../../src/lib/stokHareketi";
import { GERI_ALINDI_IBARESI, geriAlRedMetni, HAZIRLAMA_TARIH_GELECEK, HAZIRLAMA_ADET_HATASI } from "../../src/lib/setUretimi";
import { KILIT_ALANLARI } from "../../src/lib/kilitAlanlari";
import { KDV, FY, CUSTOMERS } from "../fixtures/0115-veri";

const denetim = vi.hoisted(() => ({ kayitlar: [] }));
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (o) => denetim.kayitlar.push(o) }));

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; delete window.appServer; });
beforeEach(() => { denetim.kayitlar.length = 0; vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-16T10:00:00")); });

const PARCALAR = [
  { id: 7, ad: "Rulman", fiyatTRY: "500", maliyet: 100 },
  { id: 8, ad: "Pul", fiyatTRY: "20", maliyet: 2 },
  { id: 10, ad: "Rulman Seti", fiyatTRY: "3000", setIcerigi: [{ partId: 7, miktar: 2 }, { partId: 8, miktar: 4 }] },
  { id: 11, ad: "Kayış", fiyatTRY: "300" },
];
let durum;
function Kap({ ps0 = [{ id: 1, partId: "7", miktar: 10 }, { id: 2, partId: "8", miktar: 5 }], log0 = [], canDoStock = () => true, toast = vi.fn(), aktifKullanici = "kerem" }) {
  const [partStock, setPartStock] = useState(structuredClone(ps0));
  const [partStockLog, setPartStockLog] = useState(structuredClone(log0));
  durum = { partStock, partStockLog };
  return <PartStokTab parts={PARCALAR} rawParts={PARCALAR} partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog}
    setPartStockLog={setPartStockLog} showToast={toast} canDoStock={canDoStock} aktifKullanici={aktifKullanici} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const adet = (pid) => totalMiktar(durum.partStock, String(pid));
const hazirlaAc = () => fireEvent.click(within(satir("Rulman Seti")).getByRole("button", { name: "Set Hazırla" }));
const alan = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
// Penceredeki kayıt düğmesi (satırdaki "Set Hazırla" düğmesinden sonra çizilir).
const hazirla = () => fireEvent.click(screen.getAllByRole("button", { name: /Set Hazırla/ }).at(-1));
const hareketlerAc = (ad) => fireEvent.click(within(satir(ad)).getByRole("button", { name: "Hareketler" }));

describe("Spec 0121 E: Parça Stoğu satırı (R24, R24/2, R28)", () => {
  it("AC-17 / AC-55: setin satırında rozet 'SET · n bileşen' Yedek Parça hücresinde ve 'Set Hazırla'; içeriksiz satırda düğme yok; sütun sayısı aynı", () => {
    render(<Kap />);
    const s = satir("Rulman Seti");
    expect(s.querySelectorAll("td")[0].querySelector("[data-testid=set-rozeti]").textContent).toBe("SET · 2 bileşen");
    expect(within(s).getByRole("button", { name: "Set Hazırla" })).toBeTruthy();
    expect(within(satir("Kayış")).queryByRole("button", { name: "Set Hazırla" })).toBeNull();
    expect(within(satir("Kayış")).queryByTestId("set-rozeti")).toBeNull();
    expect(s.querySelectorAll("td")).toHaveLength(6);
    // Düzelt ile Hareketler arasında.
    const ad = [...s.querySelectorAll("button")].map(b => b.textContent);
    expect(ad.indexOf("Set Hazırla")).toBe(ad.indexOf("Düzelt") + 1);
    expect(ad.indexOf("Hareketler")).toBe(ad.indexOf("Set Hazırla") + 1);
  });
  it("AC-18: 'Stok miktarı düzelt' yetkisi olmayan kullanıcıda düğme çizilmez", () => {
    render(<Kap canDoStock={(id) => id !== "stock_parca_edit"} />);
    expect(within(satir("Rulman Seti")).queryByRole("button", { name: "Set Hazırla" })).toBeNull();
  });
});

describe("Spec 0121 C: Set Hazırla penceresi", () => {
  it("AC-19 / AC-22 / AC-56: 2 set: bileşenler iki katı düşer, set 2 artar, tek işlem kimliği; İşlem Geçmişi set_hazirlandi {adet}", () => {
    render(<Kap ps0={[{ id: 1, partId: "7", miktar: 10 }, { id: 2, partId: "8", miktar: 20 }]} />);
    hazirlaAc();
    expect(screen.getByText("Set Hazırla · Rulman Seti")).toBeTruthy();
    alan("Hazırlanan adet", "2");
    hazirla();
    expect(adet(7)).toBe(6); expect(adet(8)).toBe(12); expect(adet(10)).toBe(2);
    expect(new Set(durum.partStockLog.map(l => l.referansId)).size).toBe(1);
    expect(denetim.kayitlar).toEqual([expect.objectContaining({ action: "set_hazirlandi", entity: "stok_parca", entityId: 10, entityName: "Rulman Seti", detail: { adet: 2 } })]);
  });
  it("AC-20 / AC-49 / AC-60: stok yetmezse eldeki düşer, eksiye inmez, set artar; eksik bileşen pencerede listelenir, not eksik sayısını söyler", () => {
    render(<Kap />);
    hazirlaAc();
    alan("Hazırlanan adet", "2");
    expect(screen.getByTestId("set-hazirla-eksik").textContent).toContain("Pul");
    const tablo = screen.getAllByTestId("set-hazirla-satiri").map(r => r.textContent);
    expect(tablo[1]).toMatch(/Pul.*8.*5.*5/);
    hazirla();
    expect(adet(8)).toBe(0); expect(adet(7)).toBe(6); expect(adet(10)).toBe(2);
    expect(durum.partStockLog.every(l => l.notlar.includes("1 bileşen stokta yoktu"))).toBe(true);
  });
  it("AC-21 / AC-47: geçersiz adet ve gelecek tarih reddedilir, nedeni yazar, hareket yok", () => {
    render(<Kap />);
    hazirlaAc();
    alan("Hazırlanan adet", "0"); hazirla();
    expect(screen.getByText(HAZIRLAMA_ADET_HATASI)).toBeTruthy();
    alan("Hazırlanan adet", "1"); alan("Hazırlama tarihi", "2026-10-17"); hazirla();
    expect(screen.getByText(HAZIRLAMA_TARIH_GELECEK)).toBeTruthy();
    expect(durum.partStockLog).toEqual([]);
  });
  it("AC-15/2 (R15/2): tarihin varsayılanı yerel gün (UTC değil)", () => {
    vi.setSystemTime(new Date("2026-10-16T01:30:00")); // İstanbul 01:30, UTC hâlâ 15 Ekim
    render(<Kap />);
    hazirlaAc();
    expect(screen.getByLabelText("Hazırlama tarihi").value).toBe("2026-10-16");
  });
  it("AC-58: kullanıcının notu yalnız setin satırına", () => {
    render(<Kap />);
    hazirlaAc();
    alan("Not", "İş emri 42"); hazirla();
    const setSatiri = durum.partStockLog.find(l => l.tip === "set_girisi");
    expect(setSatiri.notlar).toMatch(/İş emri 42$/);
    expect(durum.partStockLog.filter(l => l.tip === "set_uretimi").some(l => l.notlar.includes("İş emri"))).toBe(false);
  });
  it("AC-44: pencere setin kimliğiyle partstock kilidini alır; başkasındaysa LockConflict; pencere kilit listesinde", async () => {
    const cagrilar = [];
    window.crmLocks = { acquire: vi.fn(async (t, id) => { cagrilar.push([t, id]); return { ok: false, lockedBy: "ayse", lockedAt: "2026-10-16T09:00:00" }; }),
      release: vi.fn(async () => {}), list: vi.fn(async () => []), releaseAll: vi.fn(async () => {}) };
    render(<Kap />);
    hazirlaAc();
    await act(async () => {});
    expect(cagrilar).toContainEqual(["partstock", "10"]);
    expect(screen.getByTestId("set-hazirla-kilitli")).toBeTruthy();
    expect(screen.queryByTestId("set-hazirla")).toBeNull();
    expect(KILIT_ALANLARI.partstock.pencereler).toContain("src/components/stock/SetHazirlaPenceresi.jsx");
  });
  it("AC-55: pencere wide açılır ve maxWidth yazmaz", () => {
    const src = readFileSync("src/components/stock/SetHazirlaPenceresi.jsx", "utf8");
    expect(src).toMatch(/<Modal title=\{PENCERE_BASLIGI\(set\?\.ad\)\} onClose=\{onClose\} wide/);
    expect(src).not.toMatch(/maxWidth/);
  });
});

describe("Spec 0121 D: Stok Hareketleri'nden geri alma (R20–R22, R25)", () => {
  const hazirlaVeGit = (ps0) => {
    render(<Kap ps0={ps0} />);
    hazirlaAc(); alan("Hazırlanan adet", "2"); hazirla();
  };
  it("AC-23 / AC-26 / AC-56: geri alma karşı hareket yazar, stok döner, eski satırlar kalır; okunur adlar; düğme yerine ibare", () => {
    hazirlaVeGit([{ id: 1, partId: "7", miktar: 10 }, { id: 2, partId: "8", miktar: 20 }]);
    hareketlerAc("Rulman Seti");
    const p = screen.getByTestId("stok-hareketleri");
    expect(within(p).getAllByTestId("stok-hareket-satiri")[0].textContent).toContain(HAREKET_TIP_AD.set_girisi);
    fireEvent.click(within(p).getByTestId("set-geri-al"));
    expect(adet(10)).toBe(0); expect(adet(7)).toBe(10); expect(adet(8)).toBe(20);
    expect(durum.partStockLog).toHaveLength(6);
    const metin = within(p).getAllByTestId("stok-hareket-satiri").map(s => s.textContent).join("|");
    expect(metin).toContain(HAREKET_TIP_AD.set_girisi_iptal);
    expect(within(p).queryByTestId("set-geri-al")).toBeNull();
    expect(within(p).getByTestId("set-geri-alindi").textContent).toBe(GERI_ALINDI_IBARESI);
    expect(denetim.kayitlar.at(-1)).toEqual(expect.objectContaining({ action: "set_geri_alindi", entity: "stok_parca", entityId: 10, detail: { adet: 2 } }));
  });
  it("AC-27: bileşenin kendi hareket listesinde hazırlama eksi satır olarak görünür, düğme taşımaz", () => {
    hazirlaVeGit([{ id: 1, partId: "7", miktar: 10 }, { id: 2, partId: "8", miktar: 20 }]);
    hareketlerAc("Rulman");
    const p = screen.getByTestId("stok-hareketleri");
    const s = within(p).getAllByTestId("stok-hareket-satiri")[0].textContent;
    expect(s).toContain(HAREKET_TIP_AD.set_uretimi);
    expect(s).toContain("-4");
    expect(within(p).queryByTestId("set-geri-al")).toBeNull();
  });
  it("AC-25: set satıldıktan sonra geri alma hiçbir hareket yazmaz, nedeni pencerede", () => {
    // 2 set hazırlanmış, 1'i satılmış (setin stoğu 1).
    const log0 = [
      { id: 1, partId: "7", miktar: -4, tip: "set_uretimi", referansId: 77, tarih: "2026-10-10", notlar: "" },
      { id: 2, partId: "10", miktar: 2, tip: "set_girisi", referansId: 77, tarih: "2026-10-10", notlar: "" },
      { id: 3, partId: "10", miktar: -1, tip: "bayi_satis", referansId: 900, tarih: "2026-10-11", notlar: "" },
    ];
    render(<Kap ps0={[{ id: 1, partId: "7", miktar: 6 }, { id: 3, partId: "10", miktar: 1 }]} log0={log0} />);
    hareketlerAc("Rulman Seti");
    const once = structuredClone(durum);
    fireEvent.click(within(screen.getByTestId("stok-hareketleri")).getByTestId("set-geri-al"));
    expect(durum.partStockLog).toEqual(once.partStockLog);
    expect(durum.partStock).toEqual(once.partStock);
    expect(screen.getByTestId("set-geri-al-red").textContent).toBe(geriAlRedMetni(1));
  });
  it("Karar 45 (triyaj bulgu 3): geri almanın tarihi yerel gündür (UTC değil)", () => {
    vi.setSystemTime(new Date("2026-10-16T01:30:00")); // İstanbul 01:30, UTC hâlâ 15 Ekim
    const log0 = [{ id: 1, partId: "10", miktar: 2, tip: "set_girisi", referansId: 77, tarih: "2026-10-10", notlar: "" }];
    render(<Kap ps0={[{ id: 3, partId: "10", miktar: 2 }]} log0={log0} />);
    hareketlerAc("Rulman Seti");
    fireEvent.click(screen.getByTestId("set-geri-al"));
    expect(durum.partStockLog.find(l => l.tip === "set_girisi_iptal").tarih).toBe("2026-10-16");
  });
  it("AC-53: 'Geri Al' yetkisiz kullanıcıda çizilmez ama pencere açılır", () => {
    const log0 = [{ id: 1, partId: "10", miktar: 2, tip: "set_girisi", referansId: 77, tarih: "2026-10-10", notlar: "Set hazırlandı · 2 adet" }];
    render(<Kap ps0={[{ id: 3, partId: "10", miktar: 2 }]} log0={log0} canDoStock={(id) => id !== "stock_parca_edit"} />);
    hareketlerAc("Rulman Seti");
    expect(screen.getByTestId("stok-hareketleri")).toBeTruthy();
    expect(screen.queryByTestId("set-geri-al")).toBeNull();
  });
  it("AC-44 (Karar 41): başkası setin partstock kilidini tutuyorsa 'Geri Al' bildirimle reddedilir, hareket yazılmaz", async () => {
    window.crmLocks = { list: vi.fn(async () => [{ entity_type: "partstock", entity_id: "10", locked_by: "ayse" }]), acquire: vi.fn(async () => ({ ok: true })),
      release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}) };
    window.appServer = { onLocksChanged: () => () => {} };
    const toast = vi.fn();
    const log0 = [{ id: 1, partId: "10", miktar: 2, tip: "set_girisi", referansId: 77, tarih: "2026-10-10", notlar: "" }];
    render(<Kap ps0={[{ id: 3, partId: "10", miktar: 2 }]} log0={log0} toast={toast} />);
    hareketlerAc("Rulman Seti");
    await act(async () => {});
    fireEvent.click(screen.getByTestId("set-geri-al"));
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("ayse"), "err");
    expect(durum.partStockLog).toHaveLength(1);
    expect(KILIT_ALANLARI.partstock.pencereler).toContain("src/components/stock/StokHareketleriPenceresi.jsx");
  });
  it("AC-37: bileşen stoğu hiç yokken hazırlama setin satırını yazar ve geri alınabilir", () => {
    hazirlaVeGit([]);
    expect(durum.partStockLog.map(l => l.tip)).toEqual(["set_girisi"]);
    hareketlerAc("Rulman Seti");
    fireEvent.click(screen.getByTestId("set-geri-al"));
    expect(adet(10)).toBe(0);
  });
});

describe("Spec 0121 R26, R31: satış ve serviste set tek kalemdir", () => {
  it("AC-28: servise ve kargo satışına eklenen set yalnız kendi adedini düşer, bileşenlere dokunulmaz", () => {
    let ps = [{ partId: "10", miktar: 3 }, { partId: "7", miktar: 10 }, { partId: "8", miktar: 10 }];
    let log = [];
    const setPS = (f) => { ps = typeof f === "function" ? f(ps) : f; };
    const setLog = (f) => { log = typeof f === "function" ? f(log) : f; };
    servisParcaDus([{ partId: "10", miktar: 1 }], 500, setPS, setLog, ps, log);
    yedekParcaDus("10", 1, 600, setPS, setLog);
    expect(totalMiktar(ps, "10")).toBe(1);
    expect(totalMiktar(ps, "7")).toBe(10);
    expect(totalMiktar(ps, "8")).toBe(10);
    expect(log.every(l => String(l.partId) === "10")).toBe(true);
  });
  it("AC-29 / AC-43: servis formu sepetinde set tek satır, içeriği seçimden sonra salt okunur; kayıt tek kalem", () => {
    const Kab = () => {
      const [form, setForm] = useState({ customerId: 1, date: "2026-10-12", type: "Garanti Dışı", repairPlace: "Fabrikada Onarım", currency: "TRY", faturaTipi: FY,
        degisenParcalar: [{ partId: "10", ad: "Rulman Seti", miktar: 1, fiyat: "3000" }] });
      return <ServiceForm title="T" form={form} setForm={setForm} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} kdvRates={KDV} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<Kab />);
    expect(screen.getByTestId("set-icerik-satiri").textContent).toBe("Set · 2 bileşen: 2 × Rulman, 4 × Pul");
    fireEvent.focus(screen.getByPlaceholderText("Parça ara..."));
    expect(document.querySelectorAll(".sp-option [data-testid=set-rozeti]")).toHaveLength(0);
  });
  it("AC-43 (triyaj bulgu 3): tek seçili parça kutusunda (düzenleme kipi) de içerik satırı görünür", () => {
    const Kab = () => {
      const [form, setForm] = useState({ id: 600, aliciTipi: "musteri", musteriId: 1, tarih: "2026-10-12", currency: "TRY", faturaTipi: FY, partId: "10", miktar: 1, birimFiyat: 3000 });
      return <YedekParcaSatisForm title="Düzenle" form={form} setForm={setForm} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} partStock={[]} kdvRates={KDV} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<Kab />);
    expect(screen.getByTestId("set-icerik-satiri").textContent).toBe("Set · 2 bileşen: 2 × Rulman, 4 × Pul");
  });
  it("AC-43: yedek parça satış formunun seçili parça kutusunda içerik salt okunur görünür", () => {
    const Kab = () => {
      const [form, setForm] = useState({ aliciTipi: "musteri", musteriId: 1, tarih: "2026-10-12", currency: "TRY", faturaTipi: FY, satirlar: [{ partId: "10", miktar: 1, birimFiyat: 3000 }] });
      return <YedekParcaSatisForm title="T" form={form} setForm={setForm} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} partStock={[]} kdvRates={KDV} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<Kab />);
    expect(screen.getByTestId("set-icerik-satiri").textContent).toContain("Set · 2 bileşen");
  });
  it("AC-43 / AC-29 / C10: ui.jsx dokunulmadı; Evrak seçicisinde rozet yok; yazdırma çıktıları içeriği okumaz", () => {
    const ui = readFileSync("src/components/ui.jsx", "utf8");
    expect(ui).not.toMatch(/setIcerigi|SetRozeti|set-rozeti/);
    expect(readFileSync("src/components/Documents.jsx", "utf8")).not.toMatch(/setIcerigi|SetRozeti/);
    for (const f of ["src/lib/printTemplates.js", "src/components/stock/uretimFormPrint.js", "src/lib/aylikRapor.js", "src/lib/analiz.js"]) {
      expect(readFileSync(f, "utf8")).not.toMatch(/setIcerigi/);
    }
  });
});
