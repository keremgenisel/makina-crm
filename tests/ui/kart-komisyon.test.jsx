// @vitest-environment jsdom
// Kredi Kartı Taksit Komisyonu UI: Ayarlar tablosu (ekle/düzenle) + satış formundaki komisyon kutusu
// (ileri kırılım + gross-up). Bileşen hatalarını yakalar (kural: her değişiklik testli).
import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SettingsKKKomisyon } from "../../src/components/settings/SettingsKKKomisyon";
import { KartTaksitAlani, KartYansitmaOzeti } from "../../src/components/KartTaksitAlani";
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
  it("Satır Ekle taslağa ekler; ancak Kaydet ile appSettings'e yazılır", () => {
    render(<Harness />);
    expect(screen.getByTestId("n").textContent).toBe("2");
    fireEvent.click(screen.getByText(/Satır Ekle/));
    // Canlı kaydetme yok → appSettings hâlâ 2 (taslakta 3)
    expect(screen.getByTestId("n").textContent).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(screen.getByTestId("n").textContent).toBe("3"); // Kaydet ile kalıcı
  });
});

describe("KartTaksitAlani — hesaba geçiş SATIŞ tarihinden (eski satış girişi)", () => {
  it("tarih verilince blokaj o tarihten hesaplanır, bugünden değil (2026-01-01 + 40 gün)", () => {
    render(<KartTaksitAlani ayar={AYAR} tutar={100000} taksit={1} setTaksit={() => {}} tarih="2026-01-01" />);
    expect(document.body.textContent).toContain("hesaba geçiş 10/02/2026"); // tek çekim blokaj 40 gün
  });
  it("yansıtmalı özet de tarihten hesaplar (KartYansitmaOzeti)", () => {
    render(<KartYansitmaOzeti netTaban={100000} taksit={1} ayar={AYAR} kdvOrani={20} tarih="2026-01-01" />);
    expect(document.body.textContent).toContain("hesaba geçiş 10/02/2026");
  });
  it("Kart İşlem Tarihi alanı setKartTarihi ile görünür ve girilen tarih kayıt tarihini geçersiz kılar", () => {
    render(<KartTaksitAlani ayar={AYAR} tutar={100000} taksit={1} setTaksit={() => {}}
      tarih="2026-05-01" kartTarihi="2026-01-01" setKartTarihi={() => {}} />);
    expect(screen.getByText("Kart İşlem Tarihi")).toBeTruthy();        // alan görünür
    expect(screen.getByDisplayValue("2026-01-01")).toBeTruthy();       // girilen kart tarihi
    expect(document.body.textContent).toContain("hesaba geçiş 10/02/2026"); // kayıt tarihi (05-01) değil, kart tarihi (01-01) baz
  });
  it("setKartTarihi verilmeyince Kart İşlem Tarihi alanı gizli (geri uyum)", () => {
    render(<KartTaksitAlani ayar={AYAR} tutar={100000} taksit={1} setTaksit={() => {}} tarih="2026-01-01" />);
    expect(screen.queryByText("Kart İşlem Tarihi")).toBeNull();
  });
});

describe("KartTaksitAlani — ileri kırılım + yansıt notu (455.000 / 3 taksit)", () => {
  const Harness = ({ yansitIlk = false }) => {
    const [taksit, setTaksit] = useState(3);
    const [yansit, setYansit] = useState(yansitIlk);
    return <KartTaksitAlani ayar={AYAR} tutar={455000} currency="TRY"
      taksit={taksit} setTaksit={setTaksit} yansit={yansit} setYansit={setYansit} />;
  };
  it("yansıt kapalı: banka kesintisi 36.290,80 gösterir", () => {
    render(<Harness />);
    expect(screen.getByText(/36\.290,80/)).toBeTruthy();
  });
  it("yansıt açık: kalem fiyatı değişmez, komisyonu Toplam'a yönlendiren not gösterir", () => {
    render(<Harness yansitIlk />);
    expect(screen.getByText(/Komisyon müşteriye yansıtılıyor/)).toBeTruthy();
    // Artık "uygula" butonu YOK (satır fiyatına dokunulmuyor)
    expect(screen.queryByText(/Bu tutarı ödemeye uygula/)).toBeNull();
  });
});

describe("KartYansitmaOzeti — üçlü ayrım (kalem 100.000 / 3 taksit / KDV %20)", () => {
  it("satış = kalem 100.000, çekilecek kart ~132.701 (komisyon KDV matrahında, ciroda değil)", () => {
    render(<KartYansitmaOzeti netTaban={100000} taksit={3} ayar={AYAR} kdvOrani={20} currency="TRY" />);
    expect(screen.getByText(/132\.70/)).toBeTruthy();        // çekilecek kart tutarı (~132.701)
    expect(screen.getByText(/100\.000,00/)).toBeTruthy();    // satış (ciro) = kalem
  });
});

describe("PaymentRowsEditor (makina) — faturalıda karta KDV + komisyon eklenir (Extra Kalıp gibi)", () => {
  it("girilen tutar (mal) sabit; çekilecek kart KDV + komisyon ile ~132.700", () => {
    const Harness = () => {
      const [rows, setRows] = useState([{ yontem: "Kredi Kartı", tutar: "100000", kkYansit: true, taksitSayisi: 3 }]);
      return (<>
        <div data-testid="tutar">{String(rows[0].tutar)}</div>
        <PaymentRowsEditor rows={rows} onChange={setRows} krediKartiKomisyonlari={AYAR} currency="TRY" kdvOrani={20} />
      </>);
    };
    render(<Harness />);
    expect(screen.getByTestId("tutar").textContent).toBe("100000");   // girilen mal bedeli editör state'inde sabit
    expect(screen.getByText(/132\.7/)).toBeTruthy();                    // çekilecek kart ~132.700 (KDV + komisyon)
    expect(screen.queryByText(/Bu tutarı ödemeye uygula/)).toBeNull();
  });
});
