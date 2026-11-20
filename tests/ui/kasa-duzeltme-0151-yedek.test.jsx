// @vitest-environment jsdom
// Spec 0151 C5/2 (Karar 4, AC-44): Kasa sekmesi olmayan kullanıcının yedek geri yüklemesi bakiye düzeltmelerini bugünkü hâliyle
// korur; gerçek SettingsBackup'ın ürettiği hareket dizisi sunucunun eylem denetiminden (Kasa sekmesi şartı) geçer, yani kayıt
// 403 almaz. Koruma olmasaydı düzeltme yedekten ezilir ve sunucu bütün kaydı reddederdi.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor } from "@testing-library/react";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";
import { kasaHareketiMi } from "../../src/lib/yedekKasa";
import { KASA_SEKMELI_KAYITLAR, eylemDenetimi } from "../../electron/serverAuth.cjs";

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appMail; });
beforeEach(() => {
  window.appMail = { getConfigForBackup: () => Promise.resolve(null), getAllLog: () => Promise.resolve([]) };
  window.crmStorage = { backup: vi.fn(() => Promise.resolve(true)), autoBackupPasswordStatus: () => Promise.resolve({ set: false, canEncrypt: true }) };
});

const H = (id, tur, o = {}) => ({ id, tur, tarih: "2026-11-10", tutar: 100, hesapId: 51, ...o });
const BUGUN = [H(1, "odeme", { giderId: 7 }), H(2, "duzeltme", { yon: "giren" }), H(3, "duzeltme", { yon: "cikan", deletedAt: "2026-11-19T10:00:00.000Z" })];
const YEDEK = { app: "altunmak-crm", schemaVersion: 3, customers: [], giderler: [], giderTurleri: [], kasaHesaplari: [],
  hesapHareketleri: [H(10, "odeme", { giderId: 8 }), H(2, "duzeltme", { yon: "giren", tutar: 999 }), H(12, "duzeltme", { yon: "cikan" })], cekler: [] };
const temel = () => ({
  customers: [], services: [], dealers: [], stock: [], customModels: [], standardModels: [], factory: {}, kalipDefs: [], notes: [], parts: [],
  partSales: [], payments: [], teklifler: [], faturalar: [], partStock: [], partStockLog: [], uretimFormlari: [], gorusmeler: [],
  setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(), setStock: vi.fn(), setCustomModels: vi.fn(), setStandardModels: vi.fn(),
  setFactory: vi.fn(), setKalipDefs: vi.fn(), setNotes: vi.fn(), setParts: vi.fn(), setPartSales: vi.fn(), setPayments: vi.fn(),
  giderler: [], setGiderler: vi.fn(), giderTurleri: [], setGiderTurleri: vi.fn(),
  kasaHesaplari: [], hesapHareketleri: BUGUN, cekler: [], setHesapHareketleri: vi.fn(), setCekler: vi.fn(), setKasaHesaplari: null,
  version: "3.61.0", appSettings: {}, setAppSettings: vi.fn(), flash: vi.fn(),
});
const sonuc = (setter, bugun) => { const v = setter.mock.calls[setter.mock.calls.length - 1][0]; return typeof v === "function" ? v(bugun) : v; };

describe("Spec 0151: Kasa'sız geri yükleme bakiye düzeltmelerini korur", () => {
  it("AC-44: düzeltmeler (çöpteki dahil) bugünkü hâliyle kalır, ödeme yedekten gelir; sunucu denetimi kaydı reddetmez", async () => {
    const p = temel();
    render(<SettingsBackup {...p} giderYetki giderVeriYetki kasaVeriYetki={false} />);
    window.crmStorage.restore = () => Promise.resolve(structuredClone(YEDEK));
    fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
    await screen.findByText(/Geri yüklenecek bölümler/);
    fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
    await waitFor(() => expect(p.setHesapHareketleri).toHaveBeenCalled());
    const yeni = sonuc(p.setHesapHareketleri, BUGUN);
    expect(yeni.filter(m => m.tur === "duzeltme")).toEqual(BUGUN.filter(m => m.tur === "duzeltme"));
    expect(yeni.map(m => m.id).sort((a, b) => a - b)).toEqual([2, 3, 10]);
    const kasasiz = { role: "user", permissions: JSON.stringify({ tabs: ["dashboard", "gider", "finance"], giderActions: ["gider_odeme", "kasa_hesap"] }) }.permissions;
    expect(eylemDenetimi({ hesapHareketleri: BUGUN }, { hesapHareketleri: yeni }, kasasiz, "user").ok).toBe(true);
    // Koruma olmasaydı (yedek aynen): Kasa'sız kullanıcının kaydı reddedilirdi.
    expect(eylemDenetimi({ hesapHareketleri: BUGUN }, { hesapHareketleri: YEDEK.hesapHareketleri }, kasasiz, "user").ok).toBe(false);
  });
  it("AC-44: istemcinin Kasa kaydı tanımı sunucununkiyle aynı (düzeltme dahil)", () => {
    for (const h of [...BUGUN, ...YEDEK.hesapHareketleri]) expect(kasaHareketiMi(h), h.tur).toBe(KASA_SEKMELI_KAYITLAR.hesapHareketleri(h));
  });
});
