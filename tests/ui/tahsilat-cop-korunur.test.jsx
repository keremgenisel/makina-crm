// @vitest-environment jsdom
// Triyaj (2026-09-28): müşteri detayı canlı (çöpte olmayan) tahsilat listesini alır; tahsilat eklenince, düzenlenince ya da
// eski çekin "tahsil edildi" işareti çevrilince bu canlı liste state'e geri yazılıyor ve BÜTÜN müşterilerin çöpteki
// tahsilatları kalıcı siliniyordu (geri alınamaz; ciro edilmiş çekli tahsilatın korunması da boşa çıkıyordu).
// Gerçek App: her yazımdan sonra kayda giden blob çöpteki tahsilatları taşımalı.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent } from "@testing-library/react";

const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const SIMDI = new Date().toISOString(); // saklama süresi içinde: otomatik temizlik dokunmaz
const MUSTERI = { id: 700, name: "DETAY FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY", faturali: "Faturasız Yurtiçi", fabrikaSatisBedeli: 50000, kalanBorc: 45000 };
const BASKA = { id: 701, name: "BAŞKA FİRMA", model: "AK100", serialNo: "S-1", deletedAt: SIMDI };
const CANLI = { id: 710, customerId: 700, tarih: "2026-09-10", tutar: 5000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15", tahsilEdildi: false };
const COPTE_KENDI = { id: 711, customerId: 700, tarih: "2026-09-01", tutar: 1000, currency: "TRY", yontem: "Nakit", deletedAt: SIMDI };
const COPTE_BASKA = { id: 712, customerId: 701, tarih: "2026-09-02", tutar: 2000, currency: "TRY", yontem: "Çek", deletedAt: SIMDI };
const CIRO_CEK = { id: 720, paymentId: 712, no: "1", banka: "Z", tur: "hamiline", durum: "ciro", gecmis: [] };

const baslat = async () => {
  const kayitlar = [];
  const veri = { customers: [MUSTERI, BASKA], payments: [CANLI, COPTE_KENDI, COPTE_BASKA], cekler: [CIRO_CEK], dataVersion: 1 };
  window.crmStorage = { load: vi.fn(async () => structuredClone(veri)), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  fireEvent.click(screen.getAllByText("Müşteriler").find(e => e.closest("nav")));
  await waitFor(() => expect(screen.getByText("DETAY FİRMA")).toBeTruthy());
  fireEvent.click(screen.getByText("DETAY FİRMA"));
  await waitFor(() => expect(screen.getAllByText("Ödeme Ekle").length).toBeGreaterThan(0));
  return { kayitlar };
};
const copKorundu = async (kayitlar, kosul) => {
  await waitFor(() => expect(kayitlar.some(kosul)).toBe(true), { timeout: 3000 });
  const son = kayitlar[kayitlar.length - 1];
  expect(son.payments.filter(p => p.deletedAt).map(p => p.id).sort()).toEqual([711, 712]);
  expect(son.cekler.map(c => c.id)).toContain(720);
};

describe("Müşteri detayında tahsilat yazımı çöpteki tahsilatları silmez", () => {
  it("yeni tahsilat eklenince", async () => {
    const { kayitlar } = await baslat();
    fireEvent.click(screen.getAllByText("Ödeme Ekle")[0]);
    fireEvent.click(screen.getByText("+ Ödeme Ekle"));
    const satir = screen.getAllByDisplayValue("Nakit").pop().parentElement;
    fireEvent.change(satir.querySelector("input"), { target: { value: "3000" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await copKorundu(kayitlar, k => k.payments?.some(p => p.tutar === 3000 && !p.deletedAt));
  });
  it("tahsilat düzenlenince", async () => {
    const { kayitlar } = await baslat();
    fireEvent.click(screen.getByText("Kapora/Ödeme"));
    fireEvent.change(screen.getByDisplayValue(/^5[.]?000(,00)?$/), { target: { value: "5500" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await copKorundu(kayitlar, k => k.payments?.some(p => p.id === 710 && p.tutar === 5500));
  });
  it("çek kaydına bağlı olmayan eski çekin 'tahsil edildi' işareti çevrilince", async () => {
    const { kayitlar } = await baslat();
    fireEvent.click(screen.getByText("Beklemede · işaretle: Tahsil Edildi"));
    await copKorundu(kayitlar, k => k.payments?.some(p => p.id === 710 && p.tahsilEdildi === true));
  });
});
