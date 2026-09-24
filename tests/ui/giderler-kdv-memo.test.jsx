// @vitest-environment jsdom
// Triyaj bulgu 8a: Giderler sekmesindeki KDV karşılaştırması satış KDV'sini aylık rapor motorundan
// alır (ay başına bir motor turu). Gider kalemi değişince bu pahalı hesap tekrarlanmamalı; yalnız satış
// verisi veya ay listesi değişince yeniden çalışmalı.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";

const sayac = vi.hoisted(() => ({ n: 0 }));
vi.mock("../../src/lib/giderKdv", async (orig) => {
  const gercek = await orig();
  return { ...gercek, hesaplananKdvAylar: (...a) => { sayac.n++; return gercek.hesaplananKdvAylar(...a); } };
});
import { Giderler } from "../../src/components/Giderler";

afterEach(() => { cleanup(); vi.useRealTimers(); sayac.n = 0; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const SATIS = { customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] };
function Harness({ g0 }) {
  const [giderler, setGiderler] = useState(g0);
  const [satisVerisi, setSatisVerisi] = useState(SATIS);
  return <>
    <button onClick={() => setSatisVerisi({ ...SATIS, customers: [] })}>satış değişti</button>
    <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
      giderTurleri={[{ id: 4, ad: "Elektrik", davranis: "normal" }]} tedarikciler={[]} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()}
      calisanlar={[]} standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-06" } }} serverPermissions={null}
      satisVerisi={satisVerisi} showToast={vi.fn()} />
  </>;
}

describe("Giderler: KDV karşılaştırması memo ayrımı (bulgu 8a)", () => {
  it("gider kalemi değişince satış KDV motoru yeniden çalışmaz; satış verisi değişince çalışır", () => {
    render(<Harness g0={[{ id: 1, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 20, odendi: false }]} />);
    expect(screen.getByTestId("kdv-karsilastirma")).toBeTruthy();
    const ilk = sayac.n;
    expect(ilk).toBeGreaterThan(0);
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödendi olarak işaretle"));
    expect(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödenmedi olarak işaretle")).toBeTruthy();
    expect(sayac.n).toBe(ilk);
    fireEvent.click(screen.getByText("satış değişti"));
    expect(sayac.n).toBe(ilk + 1);
  });
});
