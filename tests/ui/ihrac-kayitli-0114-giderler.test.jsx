// @vitest-environment jsdom
// Spec 0114 AC-58, R18/2: ertelenen KDV'nin bilgi satırı Giderler'in KDV Karşılaştırması kartında da Finans'takiyle aynı metinle.
// Ayrı dosyada: Giderler'i çizen test dosyalarında kutu içi yokluk iddiaları kutuAc ister (spec 0081 C7 taraması).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useState } from "react";
import { kutuAc } from "./kutuAc";
import { Giderler } from "../../src/components/Giderler";
import { IHRAC_KART_ETIKETI, IHRAC_KART_NOTU } from "../../src/lib/ihracKayitli";
import { KDV, CUSTOMERS } from "../fixtures/0114-veri";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Spec 0114 C: Giderler'in KDV kartı", () => {
  it("AC-58: aynı bilgi satırı Giderler'in KDV kartında aynı metinle", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-09T10:00:00"));
    const GH = () => {
      const [giderler, setGiderler] = useState([{ id: 1, tarih: "2026-09-15", turId: 4, tutar: 60000, kdvOrani: 20, odendi: false }]);
      const [h, setH] = useState([]);
      return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={h} setHesapHareketleri={setH} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
        giderTurleri={[{ id: 4, ad: "H", davranis: "normal" }]} tedarikciler={[]} setTedarikciler={vi.fn()} calisanlar={[]}
        standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} kasaHesaplari={[]} kasaYetki aktifKullanici="k"
        baslangicAy="2026-09" kdvRates={KDV} satisVerisi={{ customers: [CUSTOMERS[0]], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
    };
    render(<GH />);
    kutuAc("KDV Karşılaştırması");
    expect(screen.getByTestId("ihrac-kayitli-kart-bilgi").textContent).toBe(`${IHRAC_KART_ETIKETI}40.000 ₺${IHRAC_KART_NOTU}`);
  });
  it("AC-26 (Giderler): işaretli satış yoksa satır çizilmez (kutu açıkken)", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-09T10:00:00"));
    const { ihracKayitli: _ik, ...isaretsiz } = CUSTOMERS[0];
    const GH = () => {
      const [giderler, setGiderler] = useState([{ id: 1, tarih: "2026-09-15", turId: 4, tutar: 60000, kdvOrani: 20, odendi: false }]);
      const [h, setH] = useState([]);
      return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={h} setHesapHareketleri={setH} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
        giderTurleri={[{ id: 4, ad: "H", davranis: "normal" }]} tedarikciler={[]} setTedarikciler={vi.fn()} calisanlar={[]}
        standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} kasaHesaplari={[]} kasaYetki aktifKullanici="k"
        baslangicAy="2026-09" kdvRates={KDV} satisVerisi={{ customers: [isaretsiz], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
    };
    render(<GH />);
    kutuAc("KDV Karşılaştırması");
    expect(screen.getByTestId("kdv-karsilastirma")).toBeTruthy();
    expect(screen.queryByTestId("ihrac-kayitli-kart-bilgi")).toBeNull();
  });
});
