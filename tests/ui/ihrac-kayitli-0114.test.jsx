// @vitest-environment jsdom
// Spec 0114: ihraç kayıtlı teslim, ekranlar. Dört formun seçicisi (açıklama kutusu spec 0116 ile kalktı), pasif tevkifat kutusu,
// KDV kutusu özeti, zaman çizelgesi ve Stok rozeti, Kalan Borç satırı, Finans ve Giderler'in KDV kartı, Finans'ın alacak ve
// KDV kartları, dışa aktarma sütunları. Kaydedilen gövde tests/ui/ihrac-kayitli-0114-app.test.jsx'te.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import { useState } from "react";

const yakalanan = vi.hoisted(() => ({ satirlar: {} }));
vi.mock("../../src/components/settings/csvUtils", async (orijinal) => {
  const m = await orijinal();
  return { ...m, downloadXlsx: async (rows, ad) => { yakalanan.satirlar[ad] = JSON.parse(JSON.stringify(rows)); }, downloadCSV: () => {} };
});

import { ServiceForm } from "../../src/components/ServiceForm";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { Customers } from "../../src/components/Customers";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { Finance } from "../../src/components/Finance";
import { SettingsExport } from "../../src/components/settings/SettingsExport";
import {
  IHRAC_SECENEK, IHRAC_TEVKIFAT_NEDENI, IHRAC_KART_ETIKETI,
  IHRAC_KART_NOTU, IHRAC_OZET_ETIKETLERI, ihracKdvHucreMetni, satisTipiPilStili, IHRAC_EXPORT_HEAD, ihracKayitliRozeti, ihracKayitliBorcMetni,
} from "../../src/lib/ihracKayitli";
import { SATIS_TEVKIFAT_NOTU_TAHSIL, SATIS_TEVKIFAT_KART_UYARISI } from "../../src/lib/satisTevkifat";
import { fmtCur } from "../../src/lib/utils";
import { SALE_TYPES } from "../../src/lib/constants";
import { KK_AYAR } from "../fixtures/0079-veri";
import { KDV, FY, IK, T5, CUSTOMERS, PAYMENTS, PART_SALES, YEDEK, PARTS } from "../fixtures/0114-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const M = [CUSTOMERS[0], CUSTOMERS[1]];
const son = { form: null };
const Kab = ({ Bilesen, ilk, ...rest }) => {
  const [form, setForm] = useState(ilk);
  son.form = form;
  return <Bilesen title="T" form={form} setForm={setForm} customers={M} dealers={[]} parts={PARTS} kdvRates={KDV} krediKartiKomisyonlari={KK_AYAR} onCancel={vi.fn()} {...rest} />;
};
const FORMLAR = {
  kalip: (ek = {}) => <Kab Bilesen={PartSaleForm} ilk={{ customerId: 2, tarih: "2026-09-10", currency: "TRY", faturaTipi: FY, kaliplar: [{ ad: "K", olcu: "1", fiyat: 100000 }], ...ek }} onSave={vi.fn()} />,
  yp: (ek = {}) => <Kab Bilesen={YedekParcaSatisForm} ilk={{ aliciTipi: "musteri", musteriId: 2, tarih: "2026-09-10", currency: "TRY", faturaTipi: FY, satirlar: [{ partId: "81", miktar: 1, birimFiyat: 100000 }], ...ek }} onSave={vi.fn()} />,
  servis: (ek = {}) => <Kab Bilesen={ServiceForm} ilk={{ customerId: 2, date: "2026-09-10", type: "Garanti Dışı", servisUcreti: 100000, currency: "TRY", faturaTipi: FY, degisenParcalar: [], ...ek }} onSave={vi.fn()} />,
};
const secici = () => screen.getAllByRole("combobox").find(s => s.options && [...s.options].some(o => o.value === "Faturasız Yurtdışı"));
const secenekler = () => [...secici().options].map(o => o.value);
const kutu = () => screen.queryByRole("checkbox", { name: "Bu fatura tevkifatlı" });
const musteriFormu = (customers = M, ek = {}) => {
  const setCustomers = vi.fn();
  render(<Customers customers={customers} setCustomers={setCustomers} services={[]} partSales={[]} payments={[]} dealers={[]} parts={PARTS} kdvRates={KDV}
    setPayments={vi.fn()} gorusmeler={[]} dosyalar={[]} {...ek} />);
  return setCustomers;
};
const yeniMusteri = () => { fireEvent.click(screen.getByText("Yeni Müşteri")); fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Yeni Firma" } }); };

describe("Spec 0114 A: seçici dört formda (AC-1–AC-4)", () => {
  it("AC-1: müşteri formunda beş seçenek, beşincisi 'İhraç Kayıtlı'", () => {
    musteriFormu(); yeniMusteri();
    expect(secenekler()).toEqual([...SALE_TYPES, "İhraç Kayıtlı"]);
  });
  it("AC-2 / AC-3: müşteri seçili Extra Kalıp formunda ve yedek parça formunda beş seçenek", () => {
    for (const ad of ["kalip", "yp"]) {
      render(FORMLAR[ad]());
      expect(secenekler(), ad).toEqual([...SALE_TYPES, IHRAC_SECENEK]);
      cleanup();
    }
  });
  it("AC-4: servis formunda dört seçenek, 'İhraç Kayıtlı' yok", () => {
    render(FORMLAR.servis());
    expect(secenekler()).toEqual(SALE_TYPES);
    expect(document.body.textContent).not.toContain(IHRAC_SECENEK);
  });
  it("C5 (triyaj 3): servis formunda tip değiştirilince form durumuna ve kaydedilen servise `ihracKayitli` anahtarı hiç girmez", () => {
    const onSave = vi.fn();
    render(<Kab Bilesen={ServiceForm} ilk={{ customerId: 2, date: "2026-09-10", type: "Garanti Dışı", servisUcreti: 100000, currency: "TRY", faturaTipi: FY, degisenParcalar: [] }} onSave={onSave} />);
    fireEvent.change(secici(), { target: { value: "Faturasız Yurtiçi" } });
    fireEvent.change(secici(), { target: { value: FY } });
    expect(son.form.faturaTipi).toBe(FY);
    expect("ihracKayitli" in son.form).toBe(false);
    cleanup();
    // Kaydedilen servis: müşteri detayının kayıt yolu (saveService) form durumunu kayda yayar.
    const setServices = vi.fn();
    render(<Customers customers={M} setCustomers={vi.fn()} services={[]} setServices={setServices} partSales={[]} payments={[]} dealers={[]} parts={PARTS}
      kdvRates={KDV} gorusmeler={[]} dosyalar={[]} initialDetailId={2} calisanlar={[]} />);
    fireEvent.click(screen.getByText("Yeni Servis Talebi"));
    fireEvent.change(secici(), { target: { value: "Faturasız Yurtiçi" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    const kayit = setServices.mock.calls.map(c => (typeof c[0] === "function" ? c[0]([]) : c[0])).pop()?.[0];
    expect(kayit).toBeTruthy();
    expect(kayit.faturaTipi).toBe("Faturasız Yurtiçi");
    expect("ihracKayitli" in kayit).toBe(false);
  });
  // Spec 0116 ile: ihraç alanının yokluğu iddiası kalktı (kutu hiçbir yerde yok); test seçicinin ücretsizde çizilmemesini korur.
  it("AC-12: yedek parça formunda ücretsiz işareti açıkken fatura tipi seçicisi hiç çizilmez", () => {
    render(FORMLAR.yp({ ucretsizMi: true, ...IK }));
    expect(screen.getAllByRole("combobox").find(s => s.options && [...s.options].some(o => o.value === IHRAC_SECENEK))).toBeUndefined();
  });
});

describe("Spec 0114 A: işaret açıkken form (AC-9, AC-35, AC-56)", () => {
  // Spec 0116 ile: AC-31 (açıklama), AC-32 (ibare ve Kopyala), AC-33 (fatura notu) ve AC-34 (üretim sınırı) ters çevrildi;
  // açıklama kutusu üç formdan kalktı (tests/ui/ihrac-ibare-kalkar-0116.test.jsx). AC-9, AC-35 ve AC-56 aynen.
  it("AC-9: işaret açıkken tevkifat kutusu çizilir, disabled ve işaretsiz, nedeni yanında; oran ve üç not yok", () => {
    for (const ad of ["kalip", "yp"]) {
      render(FORMLAR[ad](IK));
      expect(kutu(), ad).toBeTruthy();
      expect(kutu().disabled, ad).toBe(true);
      expect(kutu().checked, ad).toBe(false);
      expect(screen.getByTestId("satis-tevkifat-pasif-nedeni").textContent, ad).toBe(IHRAC_TEVKIFAT_NEDENI);
      expect(screen.queryByLabelText("Tevkifat oranı"), ad).toBeNull();
      expect(document.body.textContent, ad).not.toContain(SATIS_TEVKIFAT_NOTU_TAHSIL);
      cleanup();
    }
  });
  it("AC-56: tevkifatlı form 'İhraç Kayıtlı' seçilince üç tevkifat anahtarını seçim anında temizler; kutu pasif ve işaretsiz", () => {
    render(FORMLAR.kalip({ ...T5 }));
    expect(kutu().checked).toBe(true);
    fireEvent.change(secici(), { target: { value: IHRAC_SECENEK } });
    expect(son.form).toMatchObject({ faturaTipi: FY, ihracKayitli: true, tevkifatli: false, tevkifatPay: null, tevkifatPayda: null });
    expect(kutu().disabled).toBe(true);
    // geri dönüş: başka tip seçilince işaret kalkar, tevkifat kutusu yeniden etkin
    fireEvent.change(secici(), { target: { value: FY } });
    expect(son.form.ihracKayitli).toBe(false);
    expect(kutu().disabled).toBe(false);
  });
  it("AC-35: işaret açıkken mevcut KDV kutusunda beş satır, son satır tahsil edilecek fatura toplamı (= matrah)", () => {
    render(FORMLAR.kalip(IK));
    const ozet = screen.getByTestId("ihrac-kayitli-ozet");
    const satirlar = [...ozet.children].map(d => d.textContent);
    expect(satirlar).toEqual([
      `${IHRAC_OZET_ETIKETLERI.matrah}${fmtCur(100000)}`, `${IHRAC_OZET_ETIKETLERI.toplamKdv}${fmtCur(20000)}`,
      `${IHRAC_OZET_ETIKETLERI.ertelenenKdv}− ${fmtCur(20000)}`, `${IHRAC_OZET_ETIKETLERI.tahsilKdv}${fmtCur(0)}`,
      `${IHRAC_OZET_ETIKETLERI.faturaToplami}${fmtCur(100000)}`,
    ]);
    expect(screen.queryByTestId("satis-tevkifat-ozet")).toBeNull();
    cleanup();
    render(FORMLAR.kalip());
    expect(screen.queryByTestId("ihrac-kayitli-ozet")).toBeNull();
  });
  it("AC-57 (ekran): kayıtlı anlık görüntüsü KDV'li olan kartlı satışta işaret açılınca kart uyarısı ve 'yeni tabanla hesapla' görünür", () => {
    render(FORMLAR.kalip({ ...IK, odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: { toplamKesinti: 10, bazTarih: "2026-09-10" } }));
    const uyari = screen.getByTestId("satis-tevkifat-kart-uyarisi");
    expect(uyari.textContent).toContain(SATIS_TEVKIFAT_KART_UYARISI);
    fireEvent.click(within(uyari).getByText("Kart komisyonunu yeni tabanla hesapla"));
    expect(son.form._kartYeniTaban).toBe(true);
    cleanup();
    render(FORMLAR.kalip({ ...IK, odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: { toplamKesinti: 10, ihracTaban: true } }));
    expect(screen.queryByTestId("satis-tevkifat-kart-uyarisi")).toBeNull();
  });
  it("AC-67: müşteri formunda Faturasız seçilince fatura bedeli bugünkü gibi temizlenir", () => {
    const spy = musteriFormu(); yeniMusteri();
    const para = (etiket) => screen.getByText(etiket).closest("div").parentElement.querySelector("input");
    fireEvent.change(para("Fatura Bedeli (resmi faturada yazan)"), { target: { value: "100000" } });
    fireEvent.change(secici(), { target: { value: "Faturasız Yurtiçi" } });
    fireEvent.change(secici(), { target: { value: FY } }); // seçim anındaki temizlik formda kalır (R22/2); kayıt kolu tip faturalıyken temizlemez
    fireEvent.click(screen.getByText("Kaydet"));
    const yeni = spy.mock.calls.map(c => (typeof c[0] === "function" ? c[0](M) : c[0])).pop()[0];
    expect(yeni.faturali).toBe(FY);
    expect(yeni.faturaBedeli).toBe("");
    expect("ihracKayitli" in yeni).toBe(false);
  });
});

describe("Spec 0114 D: rozet ve Kalan Borç satırı (AC-36–AC-40, AC-61–AC-63)", () => {
  const SV = [{ id: 11, customerId: 1, date: "2026-09-12", type: "Garanti Dışı", servisUcreti: 10000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: FY, odendi: false, ...IK }];
  const detay = (customers, id, ek = {}) => render(<Customers customers={customers} setCustomers={vi.fn()} services={ek.services || []} partSales={ek.partSales || []} payments={PAYMENTS}
    yedekParcaSatislar={ek.yp || []} dealers={[]} parts={PARTS} kdvRates={KDV} gorusmeler={[]} dosyalar={[]} initialDetailId={id} />);
  it("AC-36 / AC-39 / AC-62 / AC-63: makina, Extra Kalıp ve yedek parça satırında teal rozet; borç satırı makinanın ertelenen KDV'sini yazar; servis satırında rozet yok", () => {
    detay(M, 1, { services: SV, partSales: [PART_SALES[0]], yp: [YEDEK[0]] });
    const rozetler = screen.getAllByTestId("ihrac-kayitli-rozeti");
    expect(rozetler.map(r => r.textContent).sort()).toEqual([ihracKayitliRozeti(fmtCur(40000)), ihracKayitliRozeti(fmtCur(10000)), ihracKayitliRozeti(fmtCur(2000))].sort());
    for (const r of rozetler) { expect(r.style.background).toContain("--tealBg"); expect(r.style.color).toContain("--teal2"); }
    expect(screen.queryAllByTestId("satis-tevkifat-rozeti")).toHaveLength(0);
    expect(screen.getByTestId("ihrac-kayitli-borc").textContent).toBe(ihracKayitliBorcMetni(fmtCur(40000)));
    expect(screen.getByTestId("ihrac-kayitli-borc").textContent).not.toContain("Tevkifat");
  });
  it("Karar 42 (triyaj 2, R9): 'KDV Miktarı' hücresi tahsil edilecek KDV'yi (0) ve alt satırda faturadaki ham KDV'yi yazar; işaretsizde değişmez", () => {
    const hucre = () => screen.getByText("KDV Miktarı").parentElement.textContent;
    detay(M, 1);
    expect(hucre()).toBe(`KDV Miktarı${fmtCur(0)}${ihracKdvHucreMetni(fmtCur(40000))}`);
    expect(ihracKdvHucreMetni(fmtCur(40000))).toBe(`Faturada ${fmtCur(40000)} · ertelenir`);
    cleanup();
    detay(M, 2);
    expect(hucre()).toBe(`KDV Miktarı${fmtCur(20000)}`);
  });
  it("Ek düzeltme (satış tipi pili): müşteri listesinin Fatura sütunu işaretli makinada teal 'İhraç Kayıtlı', işaretsizde bugünkü pil", () => {
    render(<Customers customers={M} setCustomers={vi.fn()} services={[]} partSales={[]} payments={[]} dealers={[]} parts={PARTS} kdvRates={KDV} gorusmeler={[]} dosyalar={[]} />);
    const pil = (ad) => [...screen.getByText(ad).closest("tr").querySelectorAll("span")].find(s => SALE_TYPES.includes(s.textContent) || s.textContent === IHRAC_SECENEK);
    expect(pil(CUSTOMERS[0].name).textContent).toBe(IHRAC_SECENEK);
    expect(pil(CUSTOMERS[0].name).style.background).toContain("--tealBg");
    expect(pil(CUSTOMERS[0].name).style.color).toContain("--teal2");
    expect(pil(CUSTOMERS[1].name).textContent).toBe(FY);
    expect(satisTipiPilStili(FY).bg).toBe("#d1fae5");
    expect(pil(CUSTOMERS[1].name).style.background).toBe("rgb(209, 250, 229)"); // SALE_TYPE_STYLE değişmedi
  });
  it("Ek düzeltme (satış tipi pili): Makina Geçmişi'nin satış olayı işaretli makinada teal 'İhraç Kayıtlı', işaretsizde bugünkü pil", () => {
    detay(M, 1);
    expect(screen.getByTestId("satis-tipi-pili").textContent).toBe(IHRAC_SECENEK);
    expect(screen.getByTestId("satis-tipi-pili").style.background).toContain("--tealBg");
    cleanup();
    detay(M, 2);
    expect(screen.getByTestId("satis-tipi-pili").textContent).toBe(FY);
    expect(screen.getByTestId("satis-tipi-pili").style.background).toBe("rgb(209, 250, 229)"); // SALE_TYPE_STYLE değişmedi
  });
  it("AC-38 / AC-40: işaretsiz kayıt rozet taşımaz; işaretli kaydı olmayan müşteride borç satırı yok", () => {
    detay(M, 2, { partSales: [PART_SALES[2]] });
    expect(screen.queryByTestId("ihrac-kayitli-rozeti")).toBeNull();
    expect(screen.queryByTestId("ihrac-kayitli-borc")).toBeNull();
  });
  it("AC-61: işaretli Extra Kalıbı olan ama makinası işaretsiz müşteride borç satırı çizilmez, kalıp rozeti çizilir", () => {
    detay(M, 2, { partSales: [{ ...PART_SALES[0], customerId: 2 }] });
    expect(screen.getAllByTestId("ihrac-kayitli-rozeti")).toHaveLength(1);
    expect(screen.queryByTestId("ihrac-kayitli-borc")).toBeNull();
  });
  it("AC-66 (ekran): işaretli ve ücretsiz Extra Kalıp rozet taşımaz", () => {
    detay(M, 2, { partSales: [PART_SALES[1]] });
    expect(screen.queryByTestId("ihrac-kayitli-rozeti")).toBeNull();
  });
  it("AC-37: Stok › Yedek Parça Satışı satırında aynı rozet", () => {
    render(<YedekParcaSatisTab yedekParcaSatislar={[YEDEK[0]]} setYedekParcaSatislar={vi.fn()} dealers={[]} parts={PARTS} customers={M} kdvRates={KDV} setPartStock={vi.fn()} setPartStockLog={vi.fn()} />);
    fireEvent.click(screen.getByText(CUSTOMERS[0].name));
    expect(screen.getByTestId("ihrac-kayitli-rozeti").textContent).toBe(ihracKayitliRozeti(fmtCur(2000)));
  });
});

describe("Spec 0114 C: Finans ve Giderler (AC-22–AC-27, AC-58, AC-59)", () => {
  const finans = (props = {}) => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-09T10:00:00"));
    return render(<Finance customers={props.customers || []} services={[]} dealers={[]} partSales={props.partSales || []} yedekParcaSatislar={props.yp || []}
      factory={{ name: "Altuntaş Makina" }} rates={{}} payments={props.payments || []} teklifler={[]} serverPermissions={null} kdvRates={KDV}
      giderTurleri={[]} giderYururlukAy="2026-01" giderYetki giderler={[]} />);
  };
  it("AC-22: işaretli ve ödenmemiş Extra Kalıp Toplam Alacak'a yalnız mal bedelini katar", () => {
    finans({ partSales: [PART_SALES[0]], customers: M.map(c => ({ ...c, kalanBorc: 0 })) }); // makina borcu yok: kart yalnız kalıbı taşır
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    const alacak = screen.getByText(/^Toplam Alacak/).closest("div").parentElement.textContent;
    expect(alacak).toMatch(/^Toplam Alacak₺50\.000(?!\d)/);
    expect(alacak).not.toContain("60.000");
  });
  it("AC-23: ertelenen KDV Ödenmesi Muhtemel KDV kartına girmez", () => {
    finans({ customers: [CUSTOMERS[0]] });
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    const kdvKarti = screen.getByText(/^Ödenmesi Muhtemel KDV/).closest("div").parentElement.textContent;
    expect(kdvKarti).not.toContain("40.000");
    cleanup();
    const { ihracKayitli: _ik, ...isaretsiz } = CUSTOMERS[0];
    finans({ customers: [isaretsiz] });
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    expect(screen.getByText(/^Ödenmesi Muhtemel KDV/).closest("div").parentElement.textContent).toContain("40.000");
  });
  it("AC-24 / AC-25 / AC-26 / AC-59: KDV kartında hesaplanan KDV ertelenmeyi saymaz; bilgi satırı TRY rakamıyla; yoksa çizilmez", () => {
    finans({ customers: [CUSTOMERS[0]], yp: [YEDEK[1]] });
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    const kart = screen.getByTestId("kdv-karsilastirma");
    expect(kart.textContent).toMatch(/Satışlardan hesaplanan KDV \(TL\)0 ₺/);
    const bilgi = within(kart).getByTestId("ihrac-kayitli-kart-bilgi");
    expect(bilgi.textContent).toBe(`${IHRAC_KART_ETIKETI}40.000 ₺${IHRAC_KART_NOTU}`); // USD satışın 200'ü TRY satırına girmez
    cleanup();
    finans({ customers: [CUSTOMERS[1]] });
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    expect(screen.getByTestId("kdv-karsilastirma")).toBeTruthy();
    expect(screen.queryByTestId("ihrac-kayitli-kart-bilgi")).toBeNull();
  });
  it("AC-27: işaretli ve tahsil edilmiş Extra Kalıp'ın mal bedeli 0113'ün tahsil kutusunda sayılır", () => {
    finans({ customers: M, partSales: [PART_SALES[3]] });
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    expect(screen.getByText(/^Tahsil Edilen Extra Kalıp Bedeli/).closest("div").parentElement.textContent).toContain("20.000");
  });
});

describe("Spec 0114 R34: dışa aktarma (AC-65)", () => {
  it("AC-65: müşteri, Extra Kalıp ve yedek parça raporlarının sonunda iki sütun; işaretlide 'Evet' ve tutar, işaretsizde boş", async () => {
    yakalanan.satirlar = {};
    const e = render(<SettingsExport customers={M} services={[]} dealers={[]} stock={[]} partSales={[PART_SALES[0], PART_SALES[2]]} payments={PAYMENTS}
      notes={[]} parts={PARTS} appSettings={{ kdvRates: KDV }} factory={{ name: "Altuntaş Makina" }} flash={vi.fn()} yedekParcaSatislar={[YEDEK[0], YEDEK[4]]} />);
    fireEvent.click(within(e.container).getByText(/^Müşteri & Servis \(/));
    for (const b of within(e.container).getAllByTitle("İndir")) await act(async () => { fireEvent.click(b); });
    fireEvent.click(within(e.container).getByText(/^Diğer \(/));
    const yp = within(e.container).getByText("Yedek Parça (Kargo) Satışları").closest("tr");
    await act(async () => { fireEvent.click(within(yp).getByTitle("İndir")); });
    const sayfalar = Object.values(yakalanan.satirlar).filter(r => r[0]?.slice(-2).join("|") === IHRAC_EXPORT_HEAD.join("|"));
    expect(sayfalar).toHaveLength(3);
    const isaretli = sayfalar.flatMap(r => r.slice(1)).filter(r => r.at(-2) === "Evet").map(r => r.at(-1)).sort((a, b) => a - b);
    expect(isaretli).toEqual([2000, 10000, 40000]);
    expect(sayfalar.flatMap(r => r.slice(1)).filter(r => r.at(-2) !== "Evet").every(r => r.at(-2) === "" && r.at(-1) === "")).toBe(true);
  });
});
