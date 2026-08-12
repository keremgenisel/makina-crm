// @vitest-environment jsdom
// Kredi Kartı Taksit Komisyonu UI: Ayarlar tablosu (ekle/düzenle) + satış formundaki komisyon kutusu
// (ileri kırılım + gross-up). Bileşen hatalarını yakalar (kural: her değişiklik testli).
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SettingsKKKomisyon } from "../../src/components/settings/SettingsKKKomisyon";
import { KartTaksitAlani } from "../../src/components/KartTaksitAlani";
import { PaymentRowsEditor } from "../../src/components/ui";

afterEach(cleanup);

const AYAR = { bsmv: 5, satirlar: [
  { taksit: 1, oran: 3.1, katkiPayi: 0.5, blokajGun: 40 },
  { taksit: 3, oran: 7.476, katkiPayi: 0.5, blokajGun: 0 },
] };

describe("SettingsKKKomisyon", () => {
  const Harness = () => {
    const [appSettings, setAppSettings] = useState({ krediKartiKomisyonlari: AYAR });
    return (<>
      <div data-testid="n">{appSettings.krediKartiKomisyonlari.satirlar.length}</div>
      <div data-testid="bsmv">{String(appSettings.krediKartiKomisyonlari.bsmv)}</div>
      <SettingsKKKomisyon appSettings={appSettings} setAppSettings={setAppSettings} />
    </>);
  };
  it("satırları listeler; Tek Çekim rozeti gösterir", () => {
    render(<Harness />);
    expect(screen.getByText("TEK ÇEKİM")).toBeTruthy();
  });
  it("Satır Ekle yeni satır ekler", () => {
    render(<Harness />);
    expect(screen.getByTestId("n").textContent).toBe("2");
    fireEvent.click(screen.getByText(/Satır Ekle/));
    expect(screen.getByTestId("n").textContent).toBe("3");
  });
});

describe("KartTaksitAlani — ileri kırılım (455.000 / 3 taksit)", () => {
  const Harness = ({ yansitIlk = false }) => {
    const [taksit, setTaksit] = useState(3);
    const [yansit, setYansit] = useState(yansitIlk);
    const [hedef, setHedef] = useState("100000");
    return <KartTaksitAlani ayar={AYAR} tutar={455000} currency="TRY" kdvOrani={20}
      taksit={taksit} setTaksit={setTaksit} yansit={yansit} setYansit={setYansit} hedefNet={hedef} setHedefNet={setHedef} />;
  };
  it("banka ekstresiyle birebir toplam kesinti gösterir", () => {
    render(<Harness />);
    // 36.290,80 ₺ — üye 32.396 + BSMV 1.619,80 + katkı 2.275
    expect(screen.getByText(/36\.290,80/)).toBeTruthy();
  });
  it("gross-up açıkken çekilecek kart tutarını gösterir (100.000 net / 3 taksit / KDV %20 → 132.7k)", () => {
    render(<Harness yansitIlk={true} />);
    expect(screen.getByText(/132\.7/)).toBeTruthy();
  });
});

describe("PaymentRowsEditor — gross-up 'uygula' (makina): tutar + fatura bedeli hizalanır (Öneri 1)", () => {
  it("uygula → satır tutarı = kart tutarı, onFaturaBedeli = mal bedeli (KDV o tutar üzerinden)", () => {
    const onFatura = vi.fn();
    const Harness = () => {
      const [rows, setRows] = useState([{ yontem: "Kredi Kartı", tutar: "", kkYansit: true, kkHedefNet: "100000", taksitSayisi: 3 }]);
      return (<>
        <div data-testid="tutar">{String(rows[0].tutar)}</div>
        <PaymentRowsEditor rows={rows} onChange={setRows} krediKartiKomisyonlari={AYAR} kdvOrani={20} currency="TRY" onFaturaBedeli={onFatura} />
      </>);
    };
    render(<Harness />);
    fireEvent.click(screen.getByText(/Bu tutarı ödemeye uygula/));
    // 100.000 net / 3 taksit (oran 7,476) / KDV %20 → kart ≈132.700,8 · mal bedeli ≈110.583,9
    expect(screen.getByTestId("tutar").textContent).toBe("132701");
    expect(onFatura).toHaveBeenCalled();
    expect(Math.round(onFatura.mock.calls[0][0])).toBe(110584);
  });
});
