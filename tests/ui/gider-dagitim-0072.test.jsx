// @vitest-environment jsdom
// Spec 0072: peşin ödenen giderin aylara dağıtılması, arayüz. Gider formu ve tanım formu (alan, pasif durum, ipuçları),
// kalem listesi rozeti, maliyet detayı ve notları, Makina ve Model'in yeni kutusu (gerçek Giderler). Test adları AC-<n> taşır.
// Spec 0089 ile (C7 0072 R16, AC-16/17/18/30/31/38): Makina ve Model, maliyet detayı ve notları ekrandan kalktı; dağıtım
// kuralı (C3) değişmez. Kova cümlesi Dönem Raporu'nda, detayın satırları motorun makina sonucunda ölçülür.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { hesaplaMakinaMaliyetleri, makinaKarlilik } from "../../src/lib/makinaMaliyeti";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-24T10:00:00")); });

const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Genel", davranis: "normal" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 0 }];
const MOD = [{ model: "AK100" }];
const formAc = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={[{ id: 11, ad: "Telekom" }]} calisanlar={CAL} giderAyarlari={{ stopajOrani: 20 }} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });

// Spec 0090 ile (R2, R3, R4, R5/2; C7 0072 AC-1/2/6/22/35, AC-5/21, AC-15): gider ve tanım formunda dağıtım alanı yok; eski
// kaydın dağıtım ayı düzenlenip kaydedilince birebir korunur, yeni kayıt alanı taşımaz. Dağıtım kuralı motorda (C3) aynen.
describe("Spec 0072: gider ve tanım formu (spec 0090 ile alan kalktı)", () => {
  it("AC-1 / AC-2 / AC-6 / AC-22 / AC-35 (spec 0090 ile): gider formunda dağıtım alanı hiçbir davranışta yok; yeni kalem dagitimAy taşımaz", () => {
    const onSave = formAc();
    for (const id of [4, 1, 3]) { tur(id); expect(screen.queryByLabelText("Maliyete dağıtım (ay)"), String(id)).toBeNull(); }
    tur(4);
    fireEvent.change(screen.getByLabelText("Tarih *"), { target: { value: "2026-03-30" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "12000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect("dagitimAy" in onSave.mock.calls[0][0]).toBe(false);
  });
  it("AC-1 (spec 0090 ile): düzenlemede kayıtlı dağıtım görünmez ama kayıtta birebir korunur", () => {
    const onSave = formAc({ kalem: { id: 5, tarih: "2026-03-30", turId: 4, tutar: 12000, kdvOrani: 20, dagitimAy: 12 } });
    expect(screen.queryByTestId("dagitim-alani")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ dagitimAy: 12, tutar: 12000 });
  });
  it("AC-5 / AC-21 / AC-22 / AC-35 (spec 0090 ile): tanım formunda dağıtım alanı yok; eski tanımın dağıtımı düzenlemede korunur", () => {
    const set = vi.fn();
    const eski = { id: 7, ad: "Yazılım", turId: 4, tutar: 1200, kdvOrani: 20, kdvYonu: "haric", baslangicAy: "2026-01", bitisAy: null, uretilenAylar: [], dagitimAy: 12 };
    render(<SettingsGiderTanimlari giderTanimlari={[eski]} setGiderTanimlari={set} giderTurleri={TURLER} calisanlar={CAL} showToast={vi.fn()} />);
    fireEvent.click(within(screen.getByText("Yazılım").closest("tr")).getByTitle("Düzenle"));
    expect(screen.queryByLabelText("Maliyete dağıtım (ay)")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set.mock.calls[0][0]([eski])[0]).toMatchObject({ id: 7, dagitimAy: 12 });
  });
});

// ── Gerçek Giderler: kalem listesi rozeti ve Makina ve Model kutusu ────────
const INTERNET = { id: 10, tarih: "2026-09-02", turId: 4, tutar: 12000, kdvOrani: 20, aciklama: "İnternet aboneliği", dagitimAy: 12 };
const NORMAL = { id: 11, tarih: "2026-09-05", turId: 4, tutar: 500, kdvOrani: 20, aciklama: "Kırtasiye" };
const hesapla = (giderler, o = {}) => hesaplaMakinaMaliyetleri({ customers: [], stock: [], giderler, giderTurleri: TURLER, standardModels: MOD, customModels: [],
  giderAyarlari: { yururlukAy: "2026-01" }, ...o }, { bugun: "2026-09-24" });
const giderlerAc = (giderler) => render(<Giderler giderler={giderler} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
  giderTurleri={TURLER} tedarikciler={[]} setTedarikciler={vi.fn()} calisanlar={CAL} stock={[]} customers={[]}
  standardModels={MOD} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} showToast={vi.fn()}
  satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} />);

describe("Spec 0072: kalem listesi ve Makina ve Model", () => {
  // Spec 0090 ile (R7, R10, R13): atama sütunu, dağıtım rozeti ve kovalar kutusu kalktı; tutar sütunu tam tutarı yazar.
  it("AC-15 (spec 0090 ile): dağıtılmış kalemde rozet yok; tutar tam tutardır", () => {
    giderlerAc([INTERNET, NORMAL]);
    expect(screen.queryByTestId("dagitim-rozeti")).toBeNull();
    expect(screen.queryByText(/aya dağıtılmış/)).toBeNull();
    const satir = screen.getByText("İnternet aboneliği").closest("tr");
    expect(satir.textContent).toMatch(/12\.000 ₺/);
  });
  it("AC-18 / AC-30 / AC-38 (spec 0089 ile, spec 0090 ile): Makina Maliyeti Kovaları kutusu, Makina ve Model ve dağıtım kutusu yok", () => {
    giderlerAc([INTERNET, NORMAL]);
    expect(screen.queryByRole("button", { name: /^Makina Maliyeti Kovaları/ })).toBeNull();
    expect(screen.queryByText("Makina ve Model")).toBeNull();
    expect(screen.queryByTestId("dagitim-kutusu")).toBeNull();
  });
});

describe("Spec 0072: maliyet detayı ve notlar (spec 0089 ile motor düzeyinde)", () => {
  const mus = { id: 1, name: "Firma", model: "AK100", serialNo: "S1", installDate: "2026-09-10", uretimTarihi: "2026-09-10", currency: "TRY", fabrikaSatisBedeli: 500000 };
  it("AC-16 / AC-17 (spec 0089 ile): makinanın payı aylık paydan gelir; işaret yalnız dağıtım varken", () => {
    const d = makinaKarlilik(hesapla([INTERNET], { customers: [mus] }), "musteri:1");
    expect(d.dagitimVar).toBe(true);
    expect(d.dagitimlar).toEqual([{ kalemId: 10, aciklama: "İnternet aboneliği", aySayisi: 12, ilkAy: "2026-09", sonAy: "2027-08", pay: 1000 }]);
    const n = makinaKarlilik(hesapla([NORMAL], { customers: [mus] }), "musteri:1");
    expect(n.dagitimVar).toBeFalsy();
    expect(n.dagitimlar || []).toEqual([]);
  });
  it("AC-31 (spec 0089 ile): personel davranışlı dağıtılmış kalemin satırı 'Personel gideri' yazar", () => {
    const pers = { id: 12, tarih: "2026-09-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", aciklama: "Hasan Çelik", resmiTutar: 1200, eldenTutar: 0, dagitimAy: 12 };
    const d = makinaKarlilik(hesapla([pers], { customers: [mus] }), "musteri:1");
    expect(d.dagitimlar[0].aciklama).toBe("Personel gideri");
    expect(JSON.stringify(d.dagitimlar)).not.toMatch(/Hasan/);
  });
});
