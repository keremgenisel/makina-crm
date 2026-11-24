// @vitest-environment jsdom
// Kullanıcı isteği 2026-11-24 (tutarlılık): yedek parçanın kodu, ölçüsü, hammaddesi ve cinsi adın altında, arama sonucuyla aynı alt
// satırla (`ui.jsx` `AramaAltSatir`, metin `parcaBilgi.parcaAramaSatiri`) dört yerde: Stok › Yedek Parça Satışı listesi, servis
// formunun "Seçilen Parçalar" listesi, yedek parça satış formunun seçili parça kutusu (tek ve çok satırlı; kod addan çıktı) ve
// Servis ve Kargo Panosu'nun kargo kartı (ayrıca kargo detay penceresi). Bilgisi boş parçada alt satır çizilmez.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { ServiceForm } from "../../src/components/ServiceForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { KargoKart, KargoDetayModal } from "../../src/components/KargoPanosu";

afterEach(cleanup);
const ALT = '[data-testid="arama-alt-satir"]';
const PARTS = [
  { id: 1, ad: "KALIP RULMANI PASLANMAZ", kod: "625 2RS", olcu: "5x16", cins: "Rulman", fiyatTRY: "190" },
  { id: 2, ad: "Pim", fiyatTRY: "5" }, // bilgisi boş: alt satır yok
];
const BEKLENEN = "625 2RS · 5x16 · Rulman";
const SATIS = (o = {}) => ({ id: 70, aliciTipi: "bayi", dealerId: 5, partId: 1, miktar: 1, birimFiyat: 190, currency: "TRY", tarih: "2026-11-24", kargoDurum: "Hazırlanıyor", tahsisler: [], ...o });
const BAYI = [{ id: 5, name: "PEKDEMİR" }];

describe("Parça alt satırı: kod, ölçü, hammadde, cins adın altında", () => {
  it("Stok › Yedek Parça Satışı satırında adın altında alt satır; bilgisi boş parçada yok", () => {
    render(<YedekParcaSatisTab yedekParcaSatislar={[SATIS(), SATIS({ id: 71, partId: 2 })]} setYedekParcaSatislar={vi.fn()} dealers={BAYI} parts={PARTS} customers={[]} setPartStock={vi.fn()} setPartStockLog={vi.fn()} />);
    const altlar = [...document.querySelectorAll(ALT)].map(e => e.textContent);
    expect(altlar).toEqual([BEKLENEN]);
  });
  it("Servis formunun 'Seçilen Parçalar' listesinde adın altında alt satır (tek satıra kırpılır)", () => {
    function Kab() {
      const [f, setF] = useState({ customerId: "", date: "2026-11-24", currency: "TRY", type: "Bakım",
        degisenParcalar: [{ partId: "1", ad: "KALIP RULMANI PASLANMAZ", miktar: 1, fiyat: "190" }, { partId: "2", ad: "Pim", miktar: 1 }] });
      return <ServiceForm title="S" form={f} setForm={setF} customers={[]} parts={PARTS} onSave={vi.fn()} onCancel={vi.fn()} />;
    }
    render(<Kab />);
    const altlar = [...document.querySelectorAll(ALT)];
    expect(altlar.map(e => e.textContent)).toEqual([BEKLENEN]);
    expect(altlar[0].style.whiteSpace).toBe("nowrap");
    expect(altlar[0].previousElementSibling.textContent).toBe("KALIP RULMANI PASLANMAZ");
  });
  it("Yedek parça satış formu, çok satırlı: seçili parçanın adından kod çıktı, kod ve bilgiler alt satırda", () => {
    function Kab() {
      const [f, setF] = useState({ aliciTipi: "bayi", tarih: "2026-11-24", currency: "TRY", satirlar: [{ partId: "1", miktar: "1", birimFiyat: "190" }] });
      return <YedekParcaSatisForm title="Y" form={f} setForm={setF} parts={PARTS} onSave={vi.fn()} onCancel={vi.fn()} />;
    }
    render(<Kab />);
    const alt = document.querySelector(ALT);
    expect(alt.textContent).toBe(BEKLENEN);
    expect(alt.previousElementSibling.textContent).toBe("KALIP RULMANI PASLANMAZ");
  });
  it("Yedek parça satış formu, düzenleme (tek kayıt): aynı biçim", () => {
    function Kab() {
      const [f, setF] = useState({ id: 70, aliciTipi: "bayi", tarih: "2026-11-24", currency: "TRY", partId: "1", miktar: "1", birimFiyat: "190" });
      return <YedekParcaSatisForm title="Y" form={f} setForm={setF} parts={PARTS} onSave={vi.fn()} onCancel={vi.fn()} isEdit />;
    }
    render(<Kab />);
    const alt = document.querySelector(ALT);
    expect(alt.textContent).toBe(BEKLENEN);
    expect(alt.previousElementSibling.textContent).toBe("KALIP RULMANI PASLANMAZ");
  });
  it("Servis ve Kargo Panosu'nun kargo kartında ve kargo detay penceresinde adın altında alt satır", () => {
    render(<KargoKart s={SATIS()} dealers={BAYI} parts={PARTS} customers={[]} canKargo onClick={vi.fn()} />);
    expect([...document.querySelectorAll(ALT)].map(e => e.textContent)).toEqual([BEKLENEN]);
    cleanup();
    render(<KargoKart s={SATIS({ partId: 2 })} dealers={BAYI} parts={PARTS} customers={[]} canKargo onClick={vi.fn()} />);
    expect(document.querySelector(ALT)).toBeNull();
    cleanup();
    render(<KargoDetayModal grup={[SATIS()]} dealers={BAYI} parts={PARTS} customers={[]} onClose={vi.fn()} />);
    expect([...document.querySelectorAll(ALT)].map(e => e.textContent)).toEqual([BEKLENEN]);
  });
  it("Kalıp kargosunda (Extra Kalıp) alt satır yok", () => {
    render(<KargoKart s={{ id: 80, ad: "Hamburger", olcu: "120", kargoDurum: "Hazırlanıyor", tarih: "2026-11-24" }} tur="kalip" parts={PARTS} customers={[]} canKargo onClick={vi.fn()} />);
    expect(document.querySelector(ALT)).toBeNull();
    expect(within(document.body).getByText(/Hamburger/)).toBeTruthy();
    expect(screen.queryByText(BEKLENEN)).toBeNull();
  });
});
