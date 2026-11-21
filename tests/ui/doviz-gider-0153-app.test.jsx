// @vitest-environment jsdom
// Spec 0153 A: gerçek App. Döviz kalem gider formundan girilir ve kayıt gövdesine üç alanla girer; TL kalemin gövdesi değişmez
// (AC-33, AC-35); oluşturma ve düzenleme izi döviz ayrıntısını taşır (AC-31, AC-58); genel arama faturanın kendi rakamını
// bulur (AC-30, AC-56).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";
import { paraMetni } from "../../src/lib/doviz";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.auditLog; vi.unstubAllGlobals(); localStorage.clear(); });

const bugun = yerelBugun();
const buAy = bugun.slice(0, 7);
const TL_KALEM = { id: 1, tarih: `${buAy}-01`, turId: 1, tutar: 3550, kdvOrani: 0, odendi: false, tedarikciId: 11, aciklama: "Bant alımı", sonOdemeTarihi: bugun, modelSatirlari: [], taksitler: [] };
const DOVIZ_KALEM = { id: 2, tarih: `${buAy}-02`, turId: 1, tutar: 48000, dovizTutar: 1200, kur: 40, paraBirimi: "USD", kdvOrani: 0, odendi: false, tedarikciId: 11, aciklama: "İthal rulman", sonOdemeTarihi: bugun, modelSatirlari: [], taksitler: [] };
const veri = (giderler) => ({
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Rulman AG" }],
  giderler,
  kasaHesaplari: [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 50000, acilisTarihi: `${buAy}-01`, kapali: false },
    { id: 52, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 1000, acilisTarihi: `${buAy}-01`, kapali: false }],
  hesapHareketleri: [], giderTanimlari: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1,
});
const baslat = async (giderler = [TL_KALEM]) => {
  const kayitlar = [], audit = [];
  window.auditLog = { log: vi.fn((e) => { audit.push(e); }) };
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(veri(giderler))),
    save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
    getVersion: vi.fn(async () => 1),
  };
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ rates: { TRY: 35.5, EUR: 0.9 } }) })));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar, audit };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const son = (kayitlar) => kayitlar.at(-1).giderler;

describe("Spec 0153 A: gerçek App", () => {
  it("AC-33 / AC-35 / AC-31 / AC-58: döviz kalem gövdeye üç alanla girer, TL kalemin gövdesi değişmez; oluşturma ve düzenleme izi döviz ayrıntısını taşır", async () => {
    const { kayitlar, audit } = await baslat();
    menu("Giderler");
    fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]);
    fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("KDV oranı"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Para birimi"), { target: { value: "USD" } });
    expect(screen.getByLabelText("Kalemin kuru").value).toBe("35,5"); // günün kuru App'in kur isteğinden
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1.200" } });
    fireEvent.change(screen.getByLabelText("Kalemin kuru"), { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("Açıklama"), { target: { value: "İthal rulman" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaydet$|Gideri Kaydet/ }));
    await waitFor(() => expect(kayitlar.some(k => (k.giderler || []).length === 2)).toBe(true), { timeout: 3000 });
    const g = son(kayitlar);
    const yeni = g.find(k => k.aciklama === "İthal rulman");
    expect(yeni).toMatchObject({ tutar: 48000, dovizTutar: 1200, kur: 40, paraBirimi: "USD" });
    for (const a of ["kurKaynak", "_kurDokunuldu"]) expect(yeni, a).not.toHaveProperty(a);
    const tl = g.find(k => k.id === 1);
    for (const a of ["dovizTutar", "kur", "paraBirimi"]) expect(tl, a).not.toHaveProperty(a);
    const olusturma = audit.find(a => a.action === "olusturuldu" && a.entity === "gider");
    expect(JSON.parse(olusturma.detail)).toEqual({ paraBirimi: "USD", dovizTutar: 1200, kur: 40 });
    // Düzenleme izi: önceki değerler döviz alanlarını taşır (P9: snapshotOnceki kaydın tamamı).
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getAllByRole("row").find(r => r.textContent.includes("İthal rulman")).querySelector("[title='Düzenle']"));
    fireEvent.change(screen.getByLabelText("Açıklama"), { target: { value: "İthal rulman (fatura 12)" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaydet$|Değişiklikleri Kaydet/ }));
    const duzenleme = audit.find(a => a.action === "duzenlendi" && a.entity === "gider");
    expect(JSON.parse(duzenleme.detail).onceki).toMatchObject({ dovizTutar: 1200, kur: 40, paraBirimi: "USD" });
  });
  it("AC-30 / AC-56: genel aramada faturanın kendi rakamı (1.200) döviz kalemi bulur; neden kalemin para birimiyle", async () => {
    await baslat([TL_KALEM, DOVIZ_KALEM]);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "1.200" } });
    await waitFor(() => expect(screen.getAllByText(/İthal rulman/).length).toBeGreaterThan(0));
    expect(document.body.textContent).toContain(`tutar: ${paraMetni(1200, "USD")}`);
  });
});
