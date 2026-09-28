// @vitest-environment jsdom
// Spec 0024 triyaj bulgu 1: 0024 öncesi (schemaVersion 2) bir yedek geri yüklenince ödeme bilgisi kaybolmamalı. Yedekte
// hareket bölümü yoksa, veritabanı göçüyle aynı saf çekirdek (electron/kasaGocuSaf.mjs) kalemlerden ödeme hareketi üretir.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor } from "@testing-library/react";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { kasaGocuHareketleri } from "../../electron/kasaGocuSaf.mjs";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";
import { BACKUP_SCHEMA_VERSION } from "../../src/lib/constants";

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appMail; });
beforeEach(() => {
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = { backup: vi.fn(() => Promise.resolve(true)), autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
});

const TUR = [{ id: 1, ad: "Malzeme", davranis: "normal" }];
// Eski biçim: ödeme kalemdeki işarette (taksitsiz kalem ve taksit satırı), hareket bölümü yok.
const ESKI_GIDERLER = [
  { id: 1, tarih: "2026-05-01", turId: 1, tutar: 1000, kdvOrani: 20, odendi: true, odemeTarihi: "2026-05-03", odemeYontemi: "Havale", taksitler: [] },
  { id: 2, tarih: "2026-05-02", turId: 1, tutar: 500, kdvOrani: 0, odendi: false, taksitler: [] },
  { id: 3, tarih: "2026-05-03", turId: 1, tutar: 3000, kdvOrani: 0, odendi: false, taksitler: [
    { id: 31, hedef: "ana", sira: 1, vade: "2026-06-15", tutar: 1500, odendi: true, odemeTarihi: "2026-06-14" },
    { id: 32, hedef: "ana", sira: 2, vade: "2026-07-15", tutar: 1500, odendi: false, odemeTarihi: null }] },
  { id: 4, tarih: "2026-05-04", turId: 1, tutar: 700, kdvOrani: 0, odendi: true, odemeTarihi: "2026-05-05", deletedAt: "2026-05-20T10:00:00Z", taksitler: [] },
];
const eskiYedek = { app: "altunmak-crm", schemaVersion: 2, customers: [], giderler: ESKI_GIDERLER, giderTurleri: TUR };

const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [],
  partSales: [], payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(),
  setFactory: vi.fn(), setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(),
  setGiderler: vi.fn(), setGiderTurleri: vi.fn(), setHesapHareketleri: vi.fn(),
  version: "3.40.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
});
const geriYukle = async (p, yedek) => {
  render(<SettingsBackup {...p} giderYetki giderVeriYetki />);
  window.crmStorage.restore = () => Promise.resolve(structuredClone(yedek));
  fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
  await screen.findByText(/Geri yüklenecek bölümler/);
  fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
  await waitFor(() => expect(p.setGiderler).toHaveBeenCalled());
};

describe("Spec 0024 bulgu 1: eski yedeğin geri yüklenmesi", () => {
  it("yedek biçim sürümü 0024 ile arttı (eski ve yeni yedek ayırt edilir)", () => {
    expect(BACKUP_SCHEMA_VERSION).toBe(3);
  });
  it("saf çekirdek: ödenmiş taksitsiz kalem tam kapatan, ödenmiş taksit tutarlı hareket; ödenmemiş ve çöpteki taşınmaz; iz tekrarı engeller", () => {
    const h = kasaGocuHareketleri(ESKI_GIDERLER);
    expect(h).toEqual([
      expect.objectContaining({ tur: "odeme", giderId: 1, taksitId: null, tamKapatir: true, tutar: null, hesapId: null, tarih: "2026-05-03", yontem: "Havale", kaynak: "goc", gocKaynak: "gider:1" }),
      expect.objectContaining({ tur: "odeme", giderId: 3, taksitId: 31, tamKapatir: false, tutar: 1500, tarih: "2026-06-14", gocKaynak: "taksit:3:31" }),
    ]);
    expect(kasaGocuHareketleri(ESKI_GIDERLER, new Set(["gider:1", "taksit:3:31"]))).toEqual([]);
  });
  it("hareket bölümü olmayan yedek geri yüklenince ödenmiş kalem ve taksit ödenmiş kalır; virmanlar korunur, eski ödemeler düşer", async () => {
    const p = temel();
    await geriYukle(p, eskiYedek);
    await waitFor(() => expect(p.setHesapHareketleri).toHaveBeenCalled());
    const guncelle = p.setHesapHareketleri.mock.calls[0][0];
    const mevcut = [{ id: 7, tur: "virman", tarih: "2026-09-01", tutar: 10, hesapId: 1, karsiHesapId: 2 }, { id: 8, tur: "odeme", giderId: 99, tutar: 5 }];
    const hareketler = guncelle(mevcut);
    expect(hareketler.map(h => h.tur)).toEqual(["virman", "odeme", "odeme"]);
    expect(new Set(hareketler.map(h => h.id)).size).toBe(3);
    const durum = odemeleriUygula(ESKI_GIDERLER, hareketler, turHaritasi(TUR));
    expect(durum[0]).toMatchObject({ odendi: true, odemeTarihi: "2026-05-03" });
    expect(durum[1]).toMatchObject({ odendi: false });
    expect(durum[2].taksitler.map(r => r.odendi)).toEqual([true, false]);
  });
  it("yeni yedek (hareket bölümü var) olduğu gibi yüklenir, göç çalışmaz", async () => {
    const p = temel();
    const H = [{ id: 50, tur: "odeme", giderId: 1, tutar: 1200, tarih: "2026-05-03", hesapId: null }];
    await geriYukle(p, { ...eskiYedek, schemaVersion: 3, hesapHareketleri: H });
    await waitFor(() => expect(p.setHesapHareketleri).toHaveBeenCalled());
    expect(p.setHesapHareketleri).toHaveBeenCalledTimes(1);
    expect(p.setHesapHareketleri).toHaveBeenCalledWith(H);
  });
});
