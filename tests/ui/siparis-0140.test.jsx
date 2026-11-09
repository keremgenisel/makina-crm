// @vitest-environment jsdom
// Spec 0140: sipariş penceresi (tek bileşen) ve iki giriş noktası (gerçek PartManager ve PartStokTab). Tedarikçi seçici, iki alt bölüm,
// düzenleme, öneri sütunu, belirtilmemiş bölüm, parça ihtiyacı tablosu, para gizliliği, yazdırma düğmesi, model ve parti seçicisi.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { SiparisPenceresi, ONERILERE_DON, BUTUN_TEDARIKCILER } from "../../src/components/stock/SiparisPenceresi";
import { PartStokTab } from "../../src/components/stock/PartStokTab";
import { Settings } from "../../src/components/Settings";
import * as S from "../../src/lib/siparisIhtiyaci";
import * as F from "../fixtures/0134-veri";
import fs from "node:fs";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); delete window.appPrint; });

const TED = [...F.TED, { id: 14, ad: "Kargo Ltd." }, { id: 16, ad: "Çöpteki", hammadde: true, deletedAt: "2026-09-01" }];
const PARCALAR = [{ ...F.KESME, tedarikciId: 13 }, { ...F.PUL, tedarikciId: 13 }, F.SOMUN, F.SET];
const PARTILER = [
  { id: 801, ad: "Güz Partisi", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } },
  { id: 802, ad: "Çöpteki Parti", baslangicAy: "2026-10", bitisAy: null, planlananAdetler: { AK100_DS: 5 }, deletedAt: "2026-10-05" },
  { id: 803, ad: "Eski Model Partisi", baslangicAy: "2026-01", bitisAy: "2026-02", planlananAdetler: { AK200: 3 } },
];
const AK200 = F.model("AK200", [[42, 1]]);
const VERI = (o = {}) => ({ parts: PARCALAR, partStock: [], malzemeler: [F.P304], tedarikciler: TED, hamTedarikciler: TED, standardModels: [F.AK100, AK200],
  customModels: [], uretimPartileri: PARTILER, appSettings: { uretimdeOlmayanModeller: ["AK200"] }, factory: { name: "Altuntaş" }, ...o });
const Pencere = ({ veri = VERI(), giderYetki = true }) => <SiparisPenceresi veri={veri} giderYetki={giderYetki} bugun="2026-11-09" onClose={vi.fn()} />;
const bolum = (ad) => screen.getAllByTestId("siparis-tedarikci-bolumu").find(b => within(b).getByTestId("siparis-tedarikci-adi").textContent === ad);
const hazirSatir = (ad) => screen.getAllByTestId("siparis-hazir-satiri").find(r => r.textContent.includes(ad));
const tablo = () => { const d = screen.getByRole("button", { name: /^Parça ihtiyacı/ }); if (d.getAttribute("aria-expanded") !== "true") fireEvent.click(d); return screen.getByTestId("siparis-parca-tablosu"); };

describe("Spec 0140: pencere", () => {
  it("AC-65: pencere wide açılır ve gerekçeli kilitsiz dosyalardadır", () => {
    expect(fs.readFileSync("src/components/stock/SiparisPenceresi.jsx", "utf8")).toMatch(/<Modal title=\{SIPARIS_PENCERE_BASLIGI\} onClose=\{onClose\} wide>/);
    expect(fs.readFileSync("src/lib/kilitAlanlari.js", "utf8")).toMatch(/"src\/components\/stock\/SiparisPenceresi\.jsx": "salt okunur/);
  });
  it("AC-19 / AC-22 / AC-24 / AC-25: seçim yokken bütün tedarikçiler, iki alt bölüm; çift sayım açıklaması", () => {
    render(<Pencere />);
    expect(screen.getAllByTestId("siparis-tedarikci-adi").map(e => e.textContent)).toEqual(["Ana Çelik", "Beta Metal"]);
    expect(within(bolum("Beta Metal")).getByTestId("siparis-hazir-tablosu")).toBeTruthy();
    expect(within(bolum("Ana Çelik")).getByTestId("siparis-malzeme-tablosu")).toBeTruthy();
    expect(within(bolum("Ana Çelik")).queryByTestId("siparis-hazir-tablosu")).toBeNull();
    expect(screen.getByTestId("siparis-cift-sayim").textContent).toBe(S.CIFT_SAYIM_DEGIL);
    expect(screen.getByTestId("siparis-tedarikci-secici").textContent).toContain(BUTUN_TEDARIKCILER);
  });
  it("AC-20 / AC-21 / AC-76 / AC-77 / AC-75: çoklu seçim listesi (kargo ve çöpteki yok); Tümünü seç, Temizle, pil; satırsız seçim sayılır", () => {
    render(<Pencere />);
    const sec = screen.getByTestId("siparis-tedarikci-secici");
    expect(within(sec).getAllByRole("checkbox").map(c => c.getAttribute("aria-label"))).toEqual(["Ana Çelik", "Beta Metal"]);
    fireEvent.click(within(sec).getByRole("checkbox", { name: "Beta Metal" }));
    expect(screen.getAllByTestId("siparis-tedarikci-adi").map(e => e.textContent)).toEqual(["Beta Metal"]);
    expect(within(sec).getByRole("button", { name: "Beta Metal seçimini kaldır" })).toBeTruthy();
    fireEvent.click(within(sec).getByRole("button", { name: "Tümünü seç" }));
    expect(screen.getAllByTestId("siparis-tedarikci-adi")).toHaveLength(2);
    fireEvent.change(within(sec).getByLabelText("Tedarikçi seçimi araması"), { target: { value: "beta" } });
    expect(within(sec).getAllByRole("checkbox")).toHaveLength(1);
    fireEvent.click(within(sec).getByRole("button", { name: "Temizle" }));
    expect(sec.textContent).toContain(BUTUN_TEDARIKCILER);
    cleanup();
    render(<Pencere veri={VERI({ parts: [{ ...F.KESME }, F.PUL, F.SOMUN, F.SET] })} />);
    fireEvent.click(within(screen.getByTestId("siparis-tedarikci-secici")).getByRole("checkbox", { name: "Beta Metal" }));
    expect(screen.getByTestId("siparis-satirsiz-secilen").textContent).toBe(S.satirsizSecilenMetni(1, 1));
    expect(screen.queryAllByTestId("siparis-tedarikci-bolumu")).toHaveLength(0);
    expect(screen.getByTestId("bos-siparis-tedarikci").textContent).toContain(S.BOS_SECIM);
  });
  it("AC-26 / AC-78: tedarikçisi belirtilmemiş bölümü kapalı başlar, başlıkta sayı; malzemeli Ana tedarikçisiz parça yalnız sayılır", () => {
    render(<Pencere veri={VERI({ parts: [F.KESME, F.PUL, F.SOMUN, F.SET] })} />);
    const d = screen.getByRole("button", { name: /^Tedarikçisi belirtilmemiş \(2\)/ });
    expect(d.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("siparis-anasiz-parca")).toBeNull();
    fireEvent.click(d);
    expect(screen.getByTestId("siparis-anasiz-parca").textContent).toBe(S.anasizParcaMetni(2));
    expect(screen.getByTestId("siparis-anasiz-malzemeli").textContent).toBe(S.anasizMalzemeliMetni(1));
  });
  it("AC-73 / AC-74: hazır parçada birim maliyet ve tutar; malzemeli parçada '—' ve neden", () => {
    render(<Pencere />);
    expect(within(hazirSatir("Pul")).getByTestId("siparis-hazir-tutar").textContent).toBe("3.500,00 ₺");
    expect(within(hazirSatir("Kesme mili")).getByTestId("siparis-hazir-tutar").textContent).toBe(S.MALZEMESI_ASAGIDA);
  });
  it("AC-15 / AC-71: gider yetkisi yoksa fiyat, tutar ve toplam çizilmez; tedarikçi adları görünür", () => {
    render(<Pencere giderYetki={false} />);
    const p = screen.getByTestId("siparis-penceresi");
    expect(p.textContent).not.toMatch(/₺|\$|€|Birim maliyet|Tutar/);
    expect(screen.queryAllByTestId("siparis-tedarikci-toplam")).toHaveLength(0);
    expect(screen.getAllByTestId("siparis-tedarikci-adi").map(e => e.textContent)).toEqual(["Ana Çelik", "Beta Metal"]);
    expect(p.textContent).not.toContain(S.BULUNAMAYAN_TEDARIKCI);
  });
  it("AC-29 / AC-83 / AC-41 / AC-35: adet düzenlenir, öneri salt okunur, satır işaretlenir, başlıkta sayı; Önerilere dön", () => {
    render(<Pencere />);
    fireEvent.change(screen.getByLabelText("Pul sipariş adedi"), { target: { value: "100" } });
    expect(within(hazirSatir("Pul")).getByTestId("siparis-oneri").textContent).toBe("700");
    expect(within(hazirSatir("Pul")).getByTestId("siparis-duzenlendi")).toBeTruthy();
    expect(within(hazirSatir("Pul")).getByTestId("siparis-hazir-tutar").textContent).toBe("500,00 ₺");
    fireEvent.click(screen.getByLabelText("Kesme mili sipariş etme"));
    expect(screen.getByTestId("siparis-duzen-sayilari").textContent).toBe("1 satır düzenlendi · 1 satır kapatıldı");
    fireEvent.click(screen.getByRole("button", { name: ONERILERE_DON }));
    expect(screen.getByLabelText("Pul sipariş adedi").value).toBe("700");
    expect(screen.getByTestId("siparis-duzen-sayilari").textContent).toBe("0 satır düzenlendi · 0 satır kapatıldı");
    expect(screen.getByTestId("siparis-gecici").textContent).toBe(S.GECICI_DUZENLEME);
  });
  it("AC-38 / AC-40: negatif adet satırın altında reddedilir; yazdırma pasif ve nedeni yanında", () => {
    render(<Pencere />);
    fireEvent.change(screen.getByLabelText("Pul sipariş adedi"), { target: { value: "-5" } });
    expect(within(hazirSatir("Pul")).getByText(S.SIPARIS_ADET_HATASI)).toBeTruthy();
    expect(screen.getByTestId("siparis-yazdir").disabled).toBe(true);
    expect(screen.getByTestId("siparis-yazdir-neden").textContent).toBe(S.BELGE_HATALI);
  });
  it("Triyaj bulgu 3: hatalı değer 'Önerilere dön'ü etkinleştirir ve onunla geri alınır; seçim dışındaki tedarikçinin hatası belgeyi kilitlemez", () => {
    render(<Pencere />);
    const don = screen.getByRole("button", { name: ONERILERE_DON });
    expect(don.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Pul sipariş adedi"), { target: { value: "-1" } });
    expect(don.disabled).toBe(false);
    expect(screen.getByTestId("siparis-yazdir").disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Ana Çelik")); // yalnız Ana Çelik seçili: Pul (Beta Metal) görünmez
    expect(screen.queryByLabelText("Pul sipariş adedi")).toBeNull();
    expect(screen.getByTestId("siparis-yazdir").disabled).toBe(false);
    fireEvent.click(screen.getByLabelText("Ana Çelik"));
    expect(screen.getByTestId("siparis-yazdir").disabled).toBe(true);
    fireEvent.click(don);
    expect(screen.getByLabelText("Pul sipariş adedi").value).toBe("700");
    expect(screen.queryByText(S.SIPARIS_ADET_HATASI)).toBeNull();
    expect(screen.getByTestId("siparis-yazdir").disabled).toBe(false);
  });
  it("AC-32 / AC-34 / AC-88: parça kapatılınca kesiti düşer; elle kilo korunur ve işaretli, bütün parçaları kapalıysa satır kalır", () => {
    render(<Pencere />);
    const kesitAd = screen.getByTestId("siparis-kesit-satiri").querySelector("input[aria-label$='sipariş']").getAttribute("aria-label");
    fireEvent.change(screen.getByLabelText(kesitAd), { target: { value: "300" } });
    expect(within(screen.getByTestId("siparis-kesit-satiri")).getByTestId("siparis-elle")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Kesme mili sipariş etme"));
    expect(within(screen.getByTestId("siparis-kesit-satiri")).getByTestId("siparis-parcalari-kapali").textContent).toBe(S.PARCALARI_KAPALI);
    expect(screen.getByLabelText(kesitAd).value).toBe("300");
  });
  it("AC-39: belirsiz yazılmış elle kilo reddedilir", () => {
    render(<Pencere />);
    const input = screen.getByTestId("siparis-kesit-satiri").querySelector("input[aria-label$='sipariş']");
    fireEvent.change(input, { target: { value: "1.250" } });
    expect(within(screen.getByTestId("siparis-kesit-satiri")).getByRole("alert").textContent).toMatch(/Belirsiz/);
  });
  it("AC-79 / AC-23 / AC-86: parça ihtiyacı tablosu katlanabilir; sıfır adetli parça satırıyla; set satırı düzenlenir ve kapatılır", () => {
    render(<Pencere veri={VERI({ partStock: [{ id: 1, partId: 43, miktar: 100000 }] })} />);
    expect(screen.getByRole("button", { name: /^Parça ihtiyacı/ }).getAttribute("aria-expanded")).toBe("false");
    const t = tablo();
    const somun = within(t).getAllByTestId("siparis-parca-satiri").find(r => r.textContent.includes("Somun"));
    expect(within(somun).getByTestId("siparis-siparis").textContent).toBe("0");
    fireEvent.click(screen.getByLabelText("Bağlantı seti set sipariş etme"));
    expect(within(t).getAllByTestId("siparis-parca-satiri").find(r => r.textContent.includes("Bağlantı seti")).querySelector("[data-testid=siparis-patlatildi]")).toBeNull();
  });
  it("AC-67 / AC-68 / AC-72: model seçicisi üretimde olmayanı listelemez ama satırın kendi modeli korunur; çöpteki parti yok", () => {
    render(<Pencere />);
    const parti = screen.getByLabelText("Üretim partisi");
    expect([...parti.options].map(o => o.textContent)).not.toContain("Çöpteki Parti");
    fireEvent.click(screen.getByRole("button", { name: /Model Satırı Ekle/ }));
    expect([...screen.getByLabelText("Model 2").options].map(o => o.textContent)).toEqual(["Model seçin", "AK100_DS"]);
    fireEvent.change(parti, { target: { value: "803" } });
    expect([...screen.getByLabelText("Model 1").options].map(o => o.textContent)).toEqual(["Model seçin", "AK100_DS", "AK200"]);
  });
  it("AC-28: kitte parça yoksa boş durum nedeni metin sabitinden", () => {
    render(<Pencere veri={VERI({ standardModels: [F.model("AK100_DS", [])] })} />);
    expect(screen.getByTestId("bos-siparis-tedarikci").textContent).toContain(S.BOS_KIT);
  });
  it("Bulgu 6 (0134) ekranı: emniyet payı Türkçe ondalıkla", () => {
    render(<Pencere veri={VERI({ parts: [{ ...F.KESME, tedarikciId: 13 }, { ...F.PUL, emniyetPayi: 7.5, tedarikciId: 13 }, F.SOMUN, F.SET] })} />);
    const pul = within(tablo()).getAllByTestId("siparis-parca-satiri").find(r => r.textContent.includes("Pul"));
    expect(within(pul).getByTestId("siparis-pay").textContent).toBe("%7,5");
  });
});

describe("Spec 0140: iki giriş noktası", () => {
  const BASE = {
    customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
    version: "3.57.0", setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
    calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
    setStandardModels: vi.fn(), setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(), setMalzemeler: vi.fn(),
  };
  function Katalog({ giderYetki = true, serverPermissions = null }) {
    const [parts, setParts] = useState(PARCALAR);
    return <Settings {...BASE} initialTab="yedekparca" appSettings={VERI().appSettings} parts={parts} rawParts={parts} setParts={setParts} malzemeler={[F.P304]} rawMalzemeler={[F.P304]}
      tedarikciler={TED} standardModels={[F.AK100, AK200]} customModels={[]} uretimPartileri={PARTILER} partStock={[]} giderYetki={giderYetki} serverPermissions={serverPermissions} />;
  }
  const stokTab = (o = {}) => <PartStokTab parts={PARCALAR} partStock={[]} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} showToast={vi.fn()}
    siparisVeri={VERI()} giderYetki canDoStock={() => true} {...o} />;
  it("AC-11 / AC-64: katalog panelinin başlığında düğme; iki giriş aynı pencereyi aynı içerikle açar", () => {
    render(<Katalog />);
    fireEvent.click(screen.getByTestId("siparis-listesi-dugmesi"));
    const a = screen.getByTestId("siparis-penceresi").textContent;
    cleanup();
    render(stokTab());
    fireEvent.click(screen.getByTestId("siparis-listesi-dugmesi"));
    expect(screen.getByTestId("siparis-penceresi").textContent).toBe(a);
  });
  it("AC-13 / AC-14 / AC-55: eylem kimliği tanımsızken düğme görünür, özelleştirilmiş ve kimliği içermeyende iki girişte de görünmez", () => {
    render(<Katalog serverPermissions={{ role: "user", permissions: JSON.stringify({ stockActions: ["stock_parca_add"] }) }} />);
    expect(screen.queryByTestId("siparis-listesi-dugmesi")).toBeNull();
    cleanup();
    render(<Katalog serverPermissions={{ role: "user", permissions: JSON.stringify({ stockActions: ["stock_siparis_listesi"] }) }} />);
    expect(screen.getByTestId("siparis-listesi-dugmesi")).toBeTruthy();
    cleanup();
    render(stokTab({ canDoStock: (id) => id !== "stock_siparis_listesi" }));
    expect(screen.queryByTestId("siparis-listesi-dugmesi")).toBeNull();
  });
});
