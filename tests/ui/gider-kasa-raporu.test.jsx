// @vitest-environment jsdom
// Spec 0047: Aylık Gider ve Kasa Raporu düğmesi (tek bileşen, tek kapı) ve üç ekran: Giderler, Kasa, Finans.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { GiderKasaRaporuDugmesi, giderKasaRaporuAcik, oncekiAy } from "../../src/components/rapor/GiderKasaRaporuDugmesi";
import { Giderler } from "../../src/components/Giderler";
import { Kasa } from "../../src/components/Kasa";
import { Finance } from "../../src/components/Finance";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.appPrint; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-15T10:00:00")); window.appPrint = { printHtml: vi.fn() }; });

const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
const K = { id: 1, tarih: "2026-09-05", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac levha", sonOdemeTarihi: "2026-09-20", modelSatirlari: [] };
const HESAP = [{ id: 51, ad: "Ziraat Bankası", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false }];
const HAREKET = [{ id: 101, tur: "odeme", tarih: "2026-09-18", tutar: 12000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: null }];
const VERI = () => ({ giderler: [K], hareketler: HAREKET, turler: TURLER, tedarikciler: [{ id: 11, ad: "Demir Bant" }], stock: [], customers: [], canliModeller: new Set(),
  yururlukAy: "2026-01", esikGun: 7, satisVerisi: { customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] },
  kdvSecenek: { factoryName: "Altuntaş Makina" }, hesaplar: HESAP, cekler: [], payments: [], services: [], partSales: [], yedekParcaSatislar: [], dealers: [], factory: { name: "Altuntaş Makina" } });
const son = () => window.appPrint.printHtml.mock.calls.at(-1);
const yazdir = (kap = document.body) => fireEvent.click(within(kap).getByText(/Gider ve Kasa Raporu/));
const kap = () => screen.getByTestId("gider-kasa-raporu");

function GiderlerEkrani({ veri = VERI(), kasaYetki = true }) {
  return <Giderler giderler={[K]} setGiderler={vi.fn()} hesapHareketleri={HAREKET} setHesapHareketleri={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={[{ id: 11, ad: "Demir Bant" }]} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]}
    standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} kasaYetki={kasaYetki}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} giderKasaRaporVerisi={veri} />;
}
const KasaEkrani = ({ veri = VERI() }) => <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={HAREKET} setHesapHareketleri={vi.fn()} giderKasaRaporVerisi={veri} />;
const FinansEkrani = ({ veri = VERI(), kasaYetki = true }) => <Finance customers={[]} services={[]} dealers={[]} partSales={[]} payments={[]} teklifler={[]} giderYetki={kasaYetki}
  giderler={[K]} giderTurleri={TURLER} giderYururlukAy="2026-01" giderKasaRaporVerisi={veri} kasaYetki={kasaYetki} />;

describe("Spec 0047: rapor düğmesi", () => {
  it("AC-40 / AC-26 / AC-27: tek kapı kasa yetkisi; kapalıyken (yetkisiz ya da perde, App'te kasaYetki false) düğme yok", () => {
    expect(giderKasaRaporuAcik({ kasaYetki: false })).toBe(false);
    expect(giderKasaRaporuAcik({ kasaYetki: true })).toBe(true);
    render(<GiderKasaRaporuDugmesi veri={VERI()} kasaYetki={false} />);
    expect(screen.queryByTestId("gider-kasa-raporu")).toBeNull();
    cleanup();
    render(<><GiderlerEkrani kasaYetki={false} /><FinansEkrani kasaYetki={false} /><KasaEkrani veri={null} /></>);
    expect(screen.queryAllByTestId("gider-kasa-raporu")).toHaveLength(0);
  });
  // Spec 0055 R1, R9 ile güncellendi: kutu kaldırıldı (0047 AC-39 ve AC-57 0055'e devredildi); belge hep kalem listesiyle.
  it("AC-43 / AC-1: ay alanı varsayılan önceki ay; yazdırma önizlemesi çağrılır ve belge kalem listesini içerir", () => {
    expect(oncekiAy("2026-01-10")).toBe("2025-12");
    render(<GiderKasaRaporuDugmesi veri={VERI()} kasaYetki />);
    expect(screen.getByLabelText("Rapor ayı").value).toBe("2026-09");
    yazdir();
    expect(son()[0]).toContain("Eylül 2026 dönemi");
    expect(son()[0]).toContain("KALEM LİSTESİ"); // spec 0059 R33 ile güncellendi
    expect(son()[2]).toBe("Gider-Kasa-Raporu-2026-09.pdf");
  });
  it("AC-28: rapor alındıktan sonra veri değişmez", () => {
    const veri = VERI();
    const once = JSON.stringify({ ...veri, canliModeller: null });
    render(<GiderKasaRaporuDugmesi veri={veri} kasaYetki />);
    yazdir();
    expect(JSON.stringify({ ...veri, canliModeller: null })).toBe(once);
  });
});

describe("Spec 0047: üç ekran aynı belge", () => {
  it("AC-1 / AC-2 / AC-29 / AC-45 / AC-54: Giderler, Kasa ve Finans aynı ay için aynı belgeyi üretir; Finans'ın kasa bölümü dolu", () => {
    render(<GiderlerEkrani />);
    fireEvent.change(within(kap()).getByLabelText("Rapor ayı"), { target: { value: "2026-09" } });
    yazdir(kap());
    const g = son()[0];
    cleanup(); window.appPrint = { printHtml: vi.fn() };
    render(<KasaEkrani />);
    expect(within(kap()).getByLabelText("Rapor ayı").value).toBe("2026-09");
    yazdir(kap());
    const k = son()[0];
    cleanup(); window.appPrint = { printHtml: vi.fn() };
    render(<FinansEkrani />);
    expect(within(kap()).queryByLabelText("Rapor ayı")).toBeNull(); // Finans kendi ay seçicisini kullanır (R2)
    yazdir(kap());
    const f = son()[0];
    expect(k).toBe(g);
    expect(f).toBe(g);
    expect(f).toContain("Ziraat Bankası");
  });
  it("AC-29: Finans'ta ay değişince belge o ayın", () => {
    render(<FinansEkrani />);
    const ay = [...document.querySelectorAll('input[type="month"]')].find(el => !kap().contains(el));
    fireEvent.change(ay, { target: { value: "2026-08" } });
    yazdir(kap());
    expect(son()[0]).toContain("Ağustos 2026 dönemi");
  });
  it("AC-44: Giderler Tarih Aralığı kipindeyken de rapor alınır; ay alanı bağımsız", () => {
    render(<GiderlerEkrani />);
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    fireEvent.change(within(kap()).getByLabelText("Rapor ayı"), { target: { value: "2026-09" } });
    yazdir(kap());
    expect(son()[0]).toContain("Eylül 2026 dönemi");
  });
  it("R3: Giderler 'Ay' kipinde ekranın ayı ilk açılışta ön dolar", () => {
    render(<GiderlerEkrani />);
    expect(within(kap()).getByLabelText("Rapor ayı").value).toBe("2026-10"); // ekran bugünün ayında açılır
  });
});

// Spec 0055 R1, R9 (AC-1–AC-3, AC-13): "Kalem listesi" kutusu üç ekranda da yok; her ekranın belgesi kalem listesini içerir.
describe("Spec 0055: kalem listesi kutusu kalktı", () => {
  for (const [ad, Ekran] of [["Giderler", GiderlerEkrani], ["Kasa", KasaEkrani], ["Finans", FinansEkrani]]) {
    it(`AC-1–AC-3 / AC-13: ${ad} ekranında kutu yok, rapor kalem listesiyle`, () => {
      render(<Ekran />);
      const k = kap();
      const ayAlani = within(k).queryByLabelText("Rapor ayı");
      if (ayAlani) fireEvent.change(ayAlani, { target: { value: "2026-09" } }); // kalemli ay
      expect(within(k).queryByLabelText("Kalem listesi")).toBeNull();
      expect(within(k).queryByRole("checkbox")).toBeNull();
      yazdir(k);
      expect(son()[0]).toContain("GİDER · KALEM LİSTESİ"); // spec 0059 R33 ile güncellendi
    });
  }
});

// Spec 0059 R6 (AC-21): geçen ay karşılaştırması motorda hesaplanır; üç ekranın düğmesi aynı ay için aynı karşılaştırmalı
// belgeyi üretir (ikinci çağrı ekranda değil).
describe("Spec 0059: üç ekran aynı karşılaştırmalı belge", () => {
  it("AC-21: Giderler, Kasa ve Finans eylül belgesinde aynı 'geçen ay' ekleri", () => {
    const belge = (Ekran) => {
      cleanup(); window.appPrint = { printHtml: vi.fn() };
      render(<Ekran />);
      const ay = within(kap()).queryByLabelText("Rapor ayı");
      if (ay) fireEvent.change(ay, { target: { value: "2026-09" } });
      else fireEvent.change([...document.querySelectorAll('input[type="month"]')].find(el => !kap().contains(el)), { target: { value: "2026-09" } });
      yazdir(kap());
      return son()[0];
    };
    const g = belge(GiderlerEkrani), k = belge(KasaEkrani), f = belge(FinansEkrani);
    expect(g).toContain("geçen ay: ");
    expect((g.match(/geçen ay: /g) || []).length).toBeGreaterThanOrEqual(5);
    expect(k).toBe(g);
    expect(f).toBe(g);
  });
});
