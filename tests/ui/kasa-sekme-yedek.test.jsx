// @vitest-environment jsdom
// Spec 0052 R19 + triyaj bulgu 1: Kasa sekmesi olmayan kullanıcının Giderler geri yüklemesi Kasa'ya ait kayıtlara
// (hesap tanımları, virman ve avans hareketleri, verilen çekler) dokunmaz; sunucu bunları yalnız Kasa sekmeli kullanıcıdan
// kabul ettiği için dokunsaydı bütün kayıt 403 alırdı. Bölümün geri kalanı (ödeme ve mahsup, alınan çekler) yedekten gelir.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { kasaKayitlariniKoru, kasaHareketiMi, kasaCekiMi } from "../../src/lib/yedekKasa";
import { KASA_SEKMELI_KAYITLAR } from "../../electron/serverAuth.cjs";

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appMail; });
beforeEach(() => {
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = { backup: vi.fn(() => Promise.resolve(true)), autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
});

const H = (id, tur, o = {}) => ({ id, tur, tarih: "2026-09-10", tutar: 100, hesapId: 51, ...o });
const BUGUN = {
  kasaHesaplari: [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY" }],
  hesapHareketleri: [H(1, "odeme", { giderId: 7 }), H(2, "virman", { karsiHesapId: 52 }), H(3, "avans", { calisanId: 9 })],
  cekler: [{ id: 30, yon: "verilen", durum: "odendi", tutar: 500, hesapId: 51 }, { id: 31, paymentId: null, durum: "portfoy", tutar: 200 }],
};
const YEDEK = {
  app: "altunmak-crm", schemaVersion: 3, customers: [], giderler: [], giderTurleri: [],
  kasaHesaplari: [{ id: 60, ad: "Eski Banka", tur: "banka", paraBirimi: "TRY" }],
  hesapHareketleri: [H(10, "odeme", { giderId: 8 }), H(11, "virman", { karsiHesapId: 60 }), H(12, "mahsup", { calisanId: 9, hesapId: null })],
  cekler: [{ id: 40, yon: "verilen", durum: "yazildi", tutar: 900, hesapId: 60 }, { id: 41, paymentId: null, durum: "portfoy", tutar: 300 }],
};

const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [],
  partSales: [], payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(),
  setFactory: vi.fn(), setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(),
  giderler: [], setGiderler: vi.fn(), giderTurleri: [], setGiderTurleri: vi.fn(),
  ...BUGUN, setHesapHareketleri: vi.fn(), setCekler: vi.fn(),
  version: "3.41.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
});
// Ayarlayıcıya verilen değer ya da güncelleyici, bugünkü diziye uygulanmış hâliyle.
const sonuc = (setter, bugun) => { const v = setter.mock.calls[setter.mock.calls.length - 1][0]; return typeof v === "function" ? v(bugun) : v; };
const geriYukle = async (props) => {
  render(<SettingsBackup {...props} giderYetki giderVeriYetki />);
  window.crmStorage.restore = () => Promise.resolve(structuredClone(YEDEK));
  fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
  await screen.findByText(/Geri yüklenecek bölümler/);
  fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
  await waitFor(() => expect(props.setHesapHareketleri).toHaveBeenCalled());
};
const idler = (a) => a.map(r => r.id).sort((x, y) => x - y);

describe("Spec 0052 triyaj bulgu 1: Kasa'sız kullanıcının geri yüklemesi Kasa kayıtlarını korur", () => {
  it("Kasa'sız: virman/avans ve verilen çekler bugünkü hâliyle kalır; ödeme, mahsup ve alınan çekler yedekten; hesap tanımlarına dokunulmaz", async () => {
    const p = { ...temel(), setKasaHesaplari: null };
    await geriYukle({ ...p, kasaVeriYetki: false });
    expect(idler(sonuc(p.setHesapHareketleri, BUGUN.hesapHareketleri))).toEqual([2, 3, 10, 12]);
    expect(idler(sonuc(p.setCekler, BUGUN.cekler))).toEqual([30, 41]);
  });
  it("Kasa'lı: bölümler yedekten aynen gelir (bugünkü davranış), hesap tanımları da", async () => {
    const p = { ...temel(), setKasaHesaplari: vi.fn() };
    await geriYukle({ ...p, kasaVeriYetki: true });
    expect(idler(sonuc(p.setHesapHareketleri, BUGUN.hesapHareketleri))).toEqual([10, 11, 12]);
    expect(idler(sonuc(p.setCekler, BUGUN.cekler))).toEqual([40, 41]);
    expect(p.setKasaHesaplari).toHaveBeenCalledWith(YEDEK.kasaHesaplari);
  });
  it("istemcideki Kasa kaydı tanımı sunucununkiyle aynı (virman, avans, verilen çek)", () => {
    for (const h of [...BUGUN.hesapHareketleri, ...YEDEK.hesapHareketleri]) expect(kasaHareketiMi(h), h.tur).toBe(KASA_SEKMELI_KAYITLAR.hesapHareketleri(h));
    for (const c of [...BUGUN.cekler, ...YEDEK.cekler]) expect(kasaCekiMi(c), String(c.id)).toBe(KASA_SEKMELI_KAYITLAR.cekler(c));
    expect(kasaKayitlariniKoru(null, null, kasaHareketiMi)).toEqual([]);
  });
  it("App geri yüklemeye Kasa iznini kasaSekmesi ile verir", () => {
    const app = readFileSync("src/App.jsx", "utf-8");
    expect(app).toMatch(/kasaVeriYetki=\{kasaSekmesi\}/);
  });
});

// Spec 0058 AC-14, Q7: kasa iş listesi kararları Giderler paketiyle yedeğe yazılır ve Kasa'lı geri yüklemede gelir; Kasa'sız
// kullanıcıda setter verilmez, bölüm bugünkü hâliyle kalır (sunucu Kasa sekmesi istediği için dokunsa kayıt 403 alırdı).
describe("Spec 0058: kapsam dışı kayıtlarının yedeği", () => {
  const KD_YEDEK = [{ id: 70, tur: "hareket", kaynak: null, kayitId: 10, zaman: "2026-10-01T10:00:00.000Z" }];
  it("Kasa'lı: yedekten gelir; Kasa'sız: setter yok, dokunulmaz", async () => {
    const y = { ...YEDEK, kasaKapsamDisi: KD_YEDEK };
    window.crmStorage.restore = () => Promise.resolve(structuredClone(y));
    const p = { ...temel(), setKasaHesaplari: vi.fn(), kasaKapsamDisi: [], setKasaKapsamDisi: vi.fn() };
    render(<SettingsBackup {...p} giderYetki giderVeriYetki kasaVeriYetki />);
    fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
    await screen.findByText(/Geri yüklenecek bölümler/);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setKasaKapsamDisi).toHaveBeenCalledWith(KD_YEDEK));
    const kaynak = readFileSync("src/components/settings/SettingsBackup.jsx", "utf-8");
    expect(kaynak).toMatch(/hesapHareketleri, cekler, kasaKapsamDisi, appSettings/); // yedeğe yazılır
    expect(readFileSync("src/App.jsx", "utf-8")).toMatch(/setKasaKapsamDisi=\{kasaSekmesi \? setKasaKapsamDisi : null\}/);
  });
});

describe("Spec 0078 AC-48: Kasa'sı olmayan kullanıcının kısmi geri yüklemesi çöpteki kasa kayıtlarını bugünkü hâliyle korur", () => {
  it("AC-48: çöpteki virman, avans ve verilen çek korunacak kümede (deletedAt'e bakılmaz); yedekten gelenle değişmez", () => {
    const Z = "2026-10-07T09:00:00.000Z";
    const mevcut = [{ id: 1, tur: "virman", tutar: 5, deletedAt: Z }, { id: 2, tur: "avans", tutar: 7, deletedAt: Z }, { id: 3, tur: "odeme", tutar: 9 }];
    const yedek = [{ id: 1, tur: "virman", tutar: 999 }, { id: 4, tur: "odeme", tutar: 11 }];
    const sonuc = kasaKayitlariniKoru(mevcut, yedek, kasaHareketiMi);
    expect(sonuc.filter(kasaHareketiMi)).toEqual(mevcut.filter(kasaHareketiMi));
    expect(sonuc.map(h => h.id)).toEqual([1, 2, 4]);
    const cekler = [{ id: 30, yon: "verilen", deletedAt: Z }];
    expect(kasaKayitlariniKoru(cekler, [{ id: 30, yon: "verilen" }], kasaCekiMi)).toEqual(cekler);
    expect(readFileSync("src/lib/yedekKasa.js", "utf8")).not.toMatch(/deletedAt/);
  });
});
