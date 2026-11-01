// @vitest-environment jsdom
// Spec 0120: servis formunun "Değişen Parçalar (varsa)" arama kutusu, "Kalıp atölyeye girecek" işaretliyken kalıp işi tipli
// parçalarla başlar. Form tek başına, müşteri detayının kaydı, Servis ve Kargo Panosu formu ve panonun ayrı penceresi.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import { useState } from "react";
import { ServiceForm } from "../../src/components/ServiceForm";
import { Customers } from "../../src/components/Customers";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { ServisPencere } from "../../src/components/ServisPencere";
import { KALIP_KUTU_ETIKETI, KALIP_ISI_BAYRAGI, TUM_PARCALAR, PARCA_SUZGEC_IBARESI, PARCA_SUZGEC_NEDENI } from "../../src/lib/kalipTamiri";
import { KDV, FY, PART_TYPES, PARTS, CUSTOMERS, SERVICES, PART_SALES } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.servisBridge; });

const TIP = { id: "tip_1", ad: "Kalıp Revize", renk: "blu", makinaSecici: false, stokDus: false, raporGoster: false, kalipIsi: true, sistem: false };
const TIPLER = [...PART_TYPES, TIP];
const ISARETSIZ = TIPLER.map(t => ({ ...t, kalipIsi: false }));
// İki kalıp işi tipli parça (81, 85), üç Standart (82 KALIP MİLİ, 83, 84).
const PARCALAR = [...PARTS.map(p => (p.id === 81 ? { ...p, tip: "Kalıp Revize" } : p)), { id: 85, ad: "120_DİŞİ KALIP REVİZE", tip: "Kalıp Revize", fiyatTRY: 3000 }];
const KALIPLI = ["100_ERKEK KALIPLAR REVİZE", "120_DİŞİ KALIP REVİZE"];
const HEPSI = PARCALAR.map(p => p.ad);

const son = { form: null };
// partTypeDefs açıkça verilmişse (undefined dahil) olduğu gibi geçer; verilmemişse TIPLER.
const Kab = ({ ilk, parts = PARCALAR, ...rest }) => {
  const [form, setForm] = useState(ilk);
  son.form = form;
  const tipler = "partTypeDefs" in rest ? rest.partTypeDefs : TIPLER;
  return <ServiceForm title="T" form={form} setForm={setForm} customers={CUSTOMERS} dealers={[]} parts={parts} kdvRates={KDV}
    onSave={vi.fn()} onCancel={vi.fn()} {...rest} partTypeDefs={tipler} />;
};
const yeni = (ek = {}) => ({ customerId: 1, date: "2026-10-12", type: "Garanti Dışı", repairPlace: "Fabrikada Onarım", currency: "TRY", faturaTipi: FY, degisenParcalar: [], ...ek });
const kutu = () => screen.getByRole("checkbox", { name: KALIP_KUTU_ETIKETI });
const arama = () => screen.getByPlaceholderText("Parça ara...");
const panel = () => { fireEvent.focus(arama()); return [...document.querySelectorAll(".sp-option")].map(e => e.textContent); };
const kapat = () => fireEvent.blur(arama());
const suzgec = () => screen.queryByRole("group", { name: "Parça listesi süzgeci" });
const dugme = (ad) => within(suzgec()).getByRole("button", { name: new RegExp(`^${ad} \\(`) });
const sec = (ad) => fireEvent.click(dugme(ad));

describe("Spec 0120 süzgeç: form", () => {
  it("AC-1: kutu işaretsizken arama bütün canlı parçaları listeler ve süzgeç yok", () => {
    render(<Kab ilk={yeni()} />);
    expect(suzgec()).toBeNull();
    expect(panel()).toEqual(HEPSI);
    expect(screen.queryByTestId("parca-suzgec-ibaresi")).toBeNull();
  });
  it("AC-2, AC-3: kutu işaretlenince yalnız kalıp işi parçaları; süzgeç 'Kalıp işi' ile açılır", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu());
    expect(panel()).toEqual(KALIPLI);
    expect(panel()).not.toContain("KALIP MİLİ");
    expect(dugme(KALIP_ISI_BAYRAGI).getAttribute("aria-pressed")).toBe("true");
    expect(dugme(TUM_PARCALAR).getAttribute("aria-pressed")).toBe("false");
  });
  it("AC-3, R8/2 (triyaj): kalıbı kayıtlı servis (kutu açılışta açık) 'Kalıp işi' ile ve süzülmüş açılır", () => {
    render(<Kab ilk={yeni({ atolyeKaliplari: [{ id: 1, ad: "HAMBURGER", olcu: "Ø98" }] })} />);
    expect(kutu().checked).toBe(true);
    expect(dugme(KALIP_ISI_BAYRAGI).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("parca-suzgec-ibaresi")).toBeTruthy();
    expect(panel()).toEqual(KALIPLI);
  });
  it("AC-4, AC-23: iki seçenek sayı rozetli, erişilebilir adlar; Segment düğme kipi ve adı", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu());
    expect(suzgec()).toBeTruthy();
    expect(screen.getByRole("button", { name: `${KALIP_ISI_BAYRAGI} (2)` })).toBeTruthy();
    expect(screen.getByRole("button", { name: `${TUM_PARCALAR} (5)` })).toBeTruthy();
    for (const b of within(suzgec()).getAllByRole("button")) expect(b.hasAttribute("aria-pressed")).toBe(true);
    // R2/4 (triyaj, kanıt görüntüsünde bulundu): sütun yönlü flex kabın doğrudan çocuğu olursa içerik genişliği kaybolur
    // ve kap alanın tamamına yayılır; Segment blok sarmalayıcının içinde durur ve içerik genişliğindedir.
    expect(suzgec().parentElement).toBe(screen.getByTestId("parca-suzgec-kabi"));
    expect(screen.getByTestId("parca-suzgec-kabi").style.display).toBe("");
    expect(suzgec().style.display).toBe("inline-flex");
  });
  it("AC-5, AC-6: 'Tüm parçalar' bütün kataloğu getirir ve Standart parça eklenir; 'Kalıp işi' yeniden süzer", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu());
    sec(TUM_PARCALAR);
    expect(panel()).toEqual(HEPSI);
    fireEvent.mouseDown([...document.querySelectorAll(".sp-option")].find(e => e.textContent === "KALIP MİLİ"));
    expect(son.form.degisenParcalar.map(p => p.ad)).toEqual(["KALIP MİLİ"]);
    sec(KALIP_ISI_BAYRAGI);
    expect(panel()).toEqual(KALIPLI);
  });
  it("AC-7: süzülü hâlde ibare var, 'Tüm parçalar'da yok", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu());
    expect(screen.getByTestId("parca-suzgec-ibaresi").textContent).toBe(PARCA_SUZGEC_IBARESI);
    sec(TUM_PARCALAR);
    expect(screen.queryByTestId("parca-suzgec-ibaresi")).toBeNull();
  });
  it("AC-8: süzülü hâlde Standart parçanın adı yazılınca sonuç yok", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu());
    fireEvent.focus(arama());
    fireEvent.change(arama(), { target: { value: "KALIP MİLİ" } });
    expect(document.querySelectorAll(".sp-option").length).toBe(0);
    expect(screen.getByText("Bulunamadı.")).toBeTruthy();
  });
  it.each([["AC-9", []], ["AC-21 (null)", null], ["AC-21 (undefined)", undefined], ["AC-10", ISARETSIZ]])(
    "%s: kalıp işi parçası bulunamayınca süzme yok, süzgeç yok, tek neden cümlesi", (_, tipler) => {
      render(<Kab ilk={yeni()} partTypeDefs={tipler} />);
      fireEvent.click(kutu());
      expect(suzgec()).toBeNull();
      expect(screen.queryByTestId("parca-suzgec-ibaresi")).toBeNull();
      expect(screen.getByTestId("parca-suzgec-neden").textContent).toBe(PARCA_SUZGEC_NEDENI);
      expect(panel()).toEqual(HEPSI);
    });
  it("AC-24: rozet sayısı gelen parts.length; hiçbir hâlde (0) rozeti yok", () => {
    render(<Kab ilk={yeni()} parts={PARCALAR.slice(1)} />);
    fireEvent.click(kutu());
    expect(screen.getByRole("button", { name: `${TUM_PARCALAR} (4)` })).toBeTruthy();
    cleanup();
    render(<Kab ilk={yeni()} parts={PARCALAR.filter(p => !KALIPLI.includes(p.ad))} />);
    fireEvent.click(kutu());
    expect(suzgec()).toBeNull();
    expect(document.body.textContent).not.toMatch(/\(0\)/);
  });
  it("AC-11: önceden eklenmiş Standart satır kalır ve düzenlenebilir (adet, fiyat, dış tedarik, çöp)", () => {
    render(<Kab ilk={yeni({ islemFirma: "Diğer", islemFirmaAd: "Usta", degisenParcalar: [{ partId: "82", ad: "KALIP MİLİ", miktar: 1, fiyat: 1500, disTedarik: false }] })} />);
    fireEvent.click(kutu());
    expect(dugme(KALIP_ISI_BAYRAGI).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Seçilen Parçalar (1)")).toBeTruthy();
    const satir = screen.getByText("KALIP MİLİ").closest("div[style*='grid']");
    fireEvent.change(within(satir).getByRole("spinbutton"), { target: { value: "3" } });
    expect(son.form.degisenParcalar[0].miktar).toBe(3);
    const fiyat = within(satir).getAllByRole("textbox").at(-1);
    fireEvent.change(fiyat, { target: { value: "1800" } });
    expect(String(son.form.degisenParcalar[0].fiyat)).toMatch(/1\.?800/);
    fireEvent.click(within(satir).getByRole("button", { name: "Bizden" }));
    expect(son.form.degisenParcalar[0].disTedarik).toBe(true);
    fireEvent.click(within(satir).getByTitle("Bu parçayı kaldır"));
    expect(son.form.degisenParcalar).toEqual([]);
  });
  it("AC-12, AC-13: kutu kaldırılınca süzgeç kaybolur, tam liste; yeniden işaretlenince 'Kalıp işi' ile gelir", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu());
    sec(TUM_PARCALAR);
    fireEvent.click(kutu());
    expect(suzgec()).toBeNull();
    expect(panel()).toEqual(HEPSI);
    kapat();
    fireEvent.click(kutu());
    expect(dugme(KALIP_ISI_BAYRAGI).getAttribute("aria-pressed")).toBe("true");
    expect(panel()).toEqual(KALIPLI);
  });
  it("AC-16: katalog boşsa bugünkü ipucu, süzgeç ve ibare yok", () => {
    render(<Kab ilk={yeni()} parts={[]} />);
    fireEvent.click(kutu());
    expect(screen.getByText(/Tanımlı yedek parça yok\./)).toBeTruthy();
    expect(suzgec()).toBeNull();
    expect(screen.queryByTestId("parca-suzgec-ibaresi")).toBeNull();
    expect(screen.queryByTestId("parca-suzgec-neden")).toBeNull();
  });
  it("AC-22: sıra süzgeç, ibare, arama kutusu; ibare panel açıkken de görünür", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu());
    const once = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const ibare = screen.getByTestId("parca-suzgec-ibaresi");
    expect(once(suzgec(), ibare)).toBe(true);
    expect(once(ibare, arama())).toBe(true);
    fireEvent.focus(arama());
    expect(document.querySelectorAll(".sp-option").length).toBeGreaterThan(0);
    expect(screen.getByTestId("parca-suzgec-ibaresi")).toBeTruthy();
  });
  it("AC-25: yazılmış metin süzgeç değişince ve kutu açılıp kapanınca korunur (bileşen yeniden kurulmaz)", () => {
    render(<Kab ilk={yeni()} />);
    const ilk = arama();
    fireEvent.change(ilk, { target: { value: "REVİZE" } });
    fireEvent.click(kutu());
    expect(arama()).toBe(ilk);
    expect(arama().value).toBe("REVİZE");
    sec(TUM_PARCALAR);
    expect(arama().value).toBe("REVİZE");
    fireEvent.click(kutu());
    expect(arama()).toBe(ilk);
    expect(arama().value).toBe("REVİZE");
  });
});

// ── Gerçek ekranın kaydettiği gövde (AC-14) ──────────────────────────────────────────────────────────────────────────
const musteriDetay = () => {
  const setServices = vi.fn();
  render(<Customers customers={CUSTOMERS} setCustomers={vi.fn()} services={SERVICES} setServices={setServices} partSales={PART_SALES} setPartSales={vi.fn()}
    payments={[]} dealers={[]} parts={PARCALAR} kdvRates={KDV} gorusmeler={[]} dosyalar={[]} partTypeDefs={TIPLER} showToast={vi.fn()}
    setYedekParcaSatislar={vi.fn()} initialDetailId={1} />);
  return setServices;
};
const kayit = (setServices) => setServices.mock.calls.map(([f]) => (typeof f === "function" ? f(SERVICES) : f)).at(-1).find(s => s.id === 41);
const servisiAc = () => fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => /Garanti Dışı/.test(e.textContent)));
const kaydet = () => fireEvent.click(screen.getAllByRole("button", { name: /Kaydet/ }).pop());

describe("Spec 0120 süzgeç: kayıt gövdesi", () => {
  it("AC-14: süzgece dokunulup kaydedilen gövdenin anahtarları dokunulmadan kaydedilenle aynı; süzgeç anahtarı yok", () => {
    let s = musteriDetay();
    servisiAc();
    fireEvent.click(kutu());
    kaydet();
    const dokunulmadan = Object.keys(kayit(s)).sort();
    cleanup();
    s = musteriDetay();
    servisiAc();
    fireEvent.click(kutu());
    sec(TUM_PARCALAR);
    sec(KALIP_ISI_BAYRAGI);
    sec(TUM_PARCALAR);
    kaydet();
    const dokunularak = Object.keys(kayit(s)).sort();
    expect(dokunularak).toEqual(dokunulmadan);
    expect(dokunularak.filter(k => /suzgec|tumParca/i.test(k))).toEqual([]);
  });
});

// ── Pano ve ayrı pencere (AC-15) ─────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0120 süzgeç: pano ve ayrı pencere", () => {
  it("AC-15: panonun kendi formunda kutu işaretlenince liste süzülür", () => {
    render(<ServisPanosu services={SERVICES} setServices={vi.fn()} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} calisanlar={[]} showToast={vi.fn()}
      partTypeDefs={TIPLER} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
    fireEvent.click(screen.getAllByText("Anadolu Köfte")[0].closest("article"));
    fireEvent.click(kutu());
    expect(panel()).toEqual(KALIPLI);
  });
  it("AC-15: partTypeDefs taşıyan anlık görüntüyle ayrı pencerede de süzülür", async () => {
    const snap = { services: SERVICES, customers: CUSTOMERS, calisanlar: [], parts: PARCALAR, dealers: [], factory: { name: "Altuntaş Makina" }, appSettings: null,
      partStock: [], partStockLog: [], dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null, aktifKullanici: "ofis", kargoYetki: true,
      kalipYetki: false, uretimFormlari: [], partTypeDefs: TIPLER };
    window.servisBridge = { ilkVeriAl: () => Promise.resolve(snap), onVeri: () => () => {}, mutate: vi.fn() };
    render(<ServisPencere />);
    const ad = await screen.findAllByText("Anadolu Köfte");
    await act(async () => { fireEvent.click(ad[0].closest("article")); });
    fireEvent.click(kutu());
    expect(panel()).toEqual(KALIPLI);
  });
});
