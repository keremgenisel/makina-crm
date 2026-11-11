// @vitest-environment jsdom
// Spec 0142 C, D: sipariş penceresi. Para hiç çizilmez (C-R1, AC-30), Stok ve İhtiyaç kalır (C-R2/2), tedarikçi bölümündeki tablo
// "Parça" adını ve Ölçü sütununu alır (C-R5), Parça ihtiyacı tablosuna Ölçü gelir (C-R4). Gerçek Settings girişinden basılan belgede
// gider yetkili kullanıcıda da para yok (AC-5).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import { Settings } from "../../src/components/Settings";
import * as S from "../../src/lib/siparisIhtiyaci";
import { BELGE_SUTUNLARI } from "../../src/lib/siparisRaporu";
import { PARCALAR, MALZEMELER, TEDARIKCILER, MODELLER } from "../fixtures/0142-veri.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); delete window.appPrint; });

const PARTI = [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } }];
const VERI = (o = {}) => ({ parts: PARCALAR, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, hamTedarikciler: TEDARIKCILER,
  standardModels: MODELLER.standardModels, customModels: [], uretimPartileri: PARTI, appSettings: {}, factory: { name: "Altuntaş" }, ...o });
const Pencere = ({ veri = VERI() }) => <SiparisPenceresi veri={veri} bugun="2026-11-11" onClose={vi.fn()} />;
const bolum = (ad) => screen.getAllByTestId("siparis-tedarikci-bolumu").find(b => within(b).getByTestId("siparis-tedarikci-adi").textContent === ad);
const ths = (t) => [...t.querySelectorAll("th")].map(x => x.textContent);
const ihtiyac = () => { const d = screen.getByRole("button", { name: /^Parça ihtiyacı/ }); if (d.getAttribute("aria-expanded") !== "true") fireEvent.click(d); return screen.getByTestId("siparis-parca-tablosu"); };
const ihtiyacSatiri = (ad) => [...ihtiyac().querySelectorAll("[data-testid=siparis-parca-satiri]")].find(r => r.querySelector("b").textContent === ad);
const hazirSatiri = (b, ad) => within(bolum(b)).getAllByTestId("siparis-hazir-satiri").find(r => r.querySelector("b").textContent === ad);
const olcu = (r) => within(r).queryAllByTestId("siparis-olcu").map(e => e.textContent);

describe("Spec 0142 D: pencere", () => {
  it("AC-25 / AC-29: tedarikçi bölümünün tablosu 'Parça' adını ve Ölçü sütununu taşır; Stok ve İhtiyaç durur; hazır parçada hücre boş", () => {
    render(<Pencere />);
    const t = within(bolum("Delta Hırdavat")).getByTestId("siparis-hazir-tablosu");
    expect(ths(t)).toEqual(["Parça", "Ölçü", "İhtiyaç", "Stok", "Sipariş (öneri)", "Sipariş adedi", "Sipariş etme"]);
    expect(olcu(hazirSatiri("Delta Hırdavat", "Elle"))).toEqual([]);
    expect(within(hazirSatiri("Delta Hırdavat", "Elle")).getByTestId("siparis-olcu-hucresi").textContent).toBe("");
    expect(olcu(hazirSatiri("Beta Plastik", "Kalın mil"))).toEqual(["Ø62 × 178"]); // malzemeli parça pencerede Ana tedarikçisinde ve ölçülü
  });
  it("AC-26 / AC-28 / AC-45: Parça ihtiyacı tablosunda Stok ve Ölçü; ölçü başlığı pencerede ve belgede aynı metin", () => {
    render(<Pencere />);
    const h = ths(ihtiyac());
    expect(h).toContain("Stok"); expect(h).toContain("İhtiyaç"); expect(h[1]).toBe(S.OLCU_BASLIGI);
    expect(BELGE_SUTUNLARI.parca[1]).toBe(S.OLCU_BASLIGI);
    expect(ths(within(bolum("Alfa Çelik")).queryByTestId("siparis-hazir-tablosu") || within(bolum("Beta Plastik")).getByTestId("siparis-hazir-tablosu"))[1]).toBe(S.OLCU_BASLIGI);
  });
  it("AC-23: stokta yeten (sipariş 0) parçanın satırında da ölçü yazar", () => {
    render(<Pencere veri={VERI({ partStock: [{ id: 1, partId: 1, miktar: 500 }] })} />);
    const r = ihtiyacSatiri("Kalın mil");
    expect(within(r).getByTestId("siparis-siparis").textContent).toBe("0");
    expect(olcu(r)).toEqual(["Ø62 × 178"]);
  });
  it("AC-27: malzeme tablosu kesiti yazar, boyu yazmaz", () => {
    render(<Pencere />);
    const t = within(bolum("Alfa Çelik")).getByTestId("siparis-malzeme-tablosu");
    expect(ths(t)[0]).toBe("Malzeme · kesit");
    const r = within(t).getAllByTestId("siparis-kesit-satiri").find(x => x.textContent.includes("Ø62"));
    expect(r.querySelector("td").textContent).not.toMatch(/× 178|× 50|× 75/);
  });
  it("AC-30 / AC-60: hiçbir para sütunu, toplamı ya da para nedeni çizilmez; eksik sayacının metni tutar demez", () => {
    const malzemeler = MALZEMELER.map(m => (m.id === 502 ? { ...m, kiloFiyati: undefined } : m.id === 503 ? { ...m, kur: undefined } : m));
    render(<Pencere veri={VERI({ malzemeler })} />);
    ihtiyac();
    const p = screen.getByTestId("siparis-penceresi").textContent;
    expect(p).not.toMatch(/₺|\$|€|Birim maliyet|Tutar|\bTL\b/);
    for (const m of [S.NEDEN_FIYAT_YOK, S.NEDEN_KUR_YOK, S.MALZEMESI_ASAGIDA, S.MALIYET_YOK]) expect(p).not.toContain(m);
    expect(screen.queryAllByTestId("siparis-tedarikci-toplam")).toHaveLength(0);
    expect(screen.getByTestId("siparis-eksik").textContent).not.toMatch(/tutar/i);
    expect(screen.getByTestId("siparis-eksik").textContent).toMatch(/bilgisi eksik/);
  });
  it("AC-41 / AC-42 / AC-43 (ekran): ölçüsü eksik parçada ibare ve boş hücre; set satırı ölçüsüz; iki ölçü ayrı satırlarda", () => {
    render(<Pencere />);
    const eksik = ihtiyacSatiri("Boyu eksik");
    expect(within(eksik).getByTestId("siparis-olcu-eksik").textContent).toBe(S.OLCU_GIRILMEMIS);
    expect(olcu(eksik)).toEqual([]);
    expect(olcu(ihtiyacSatiri("Bağlantı seti"))).toEqual([]);
    expect(olcu(ihtiyacSatiri("Aynı kesit farklı boy"))).toEqual(["Ø62 × 50", "Ø62 × 75"]);
    expect(olcu(ihtiyacSatiri("Lama"))).toEqual(["10 × 20 × 125 · parça başına 2"]);
  });
});

describe("Spec 0142 A: gerçek giriş noktasından basılan belge", () => {
  const BASE = {
    customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
    version: "3.58.0", setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
    calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
    setStandardModels: vi.fn(), setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(), setMalzemeler: vi.fn(),
  };
  function Katalog() {
    const [parts, setParts] = useState(PARCALAR);
    return <Settings {...BASE} initialTab="yedekparca" appSettings={{}} parts={parts} rawParts={parts} setParts={setParts} malzemeler={MALZEMELER} rawMalzemeler={MALZEMELER}
      tedarikciler={TEDARIKCILER} standardModels={MODELLER.standardModels} customModels={[]} uretimPartileri={PARTI} partStock={[]} giderYetki />;
  }
  it("AC-5: gider yetkisi olan kullanıcının bastığı belgede para yok, parça ve ölçü var", () => {
    const printHtml = vi.fn(); window.appPrint = { printHtml };
    render(<Katalog />);
    fireEvent.click(screen.getByTestId("siparis-listesi-dugmesi"));
    fireEvent.click(screen.getByTestId("siparis-yazdir"));
    expect(printHtml).toHaveBeenCalledTimes(1);
    const html = printHtml.mock.calls[0][0];
    expect(html).toContain("Ø62 × 178"); expect(html).toContain("Alınacak malzeme toplamı");
    expect(html).not.toMatch(/Birim maliyet|Birim fiyat|Tutar|\d,\d{2} (TL|\$|€|₺)/);
  });
});

describe("Spec 0142 triyaj (bulgu 1): pencerede belge yeri ibaresi", () => {
  it("Ana tedarikçisinin bölümündeki satır belgede hangi bölümde basıldığını yazar; kendi bölümünde basılan satırda ibare yok", () => {
    render(<Pencere />);
    expect(within(hazirSatiri("Beta Plastik", "Kalın mil")).getByTestId("siparis-belge-yeri").textContent).toBe(S.belgeYeriMetni(["Alfa Çelik"], false));
    expect(within(hazirSatiri("Delta Hırdavat", "Elle")).queryByTestId("siparis-belge-yeri")).toBeNull();
  });
});
