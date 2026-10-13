// @vitest-environment jsdom
// Spec 0079: tevkifatlı satış faturası, ekranlar. Dört form (kutu, kapı, oran, notlar, özet, hata), makina formunun iki kolu,
// zaman çizelgesi ve Stok rozeti, müşteri detayındaki borç satırı, Finans ve Giderler'in KDV kartı.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { kutuAc } from "./kutuAc";
import { useState } from "react";
import { ServiceForm } from "../../src/components/ServiceForm";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { Customers } from "../../src/components/Customers";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { Finance } from "../../src/components/Finance";
import { Giderler } from "../../src/components/Giderler";
import {
  SATIS_TEVKIFAT_NOTU_TAHSIL, SATIS_TEVKIFAT_NOTU_CIRO, SATIS_TEVKIFAT_NOTU_SINIR, SATIS_TEVKIFAT_KART_UYARISI, TEVKIFAT_ORAN_SECILMEDI,
  SATIS_TEVKIFAT_KART_ETIKETI, SATIS_TEVKIFAT_KART_NOTU, satisTevkifatOzeti,
} from "../../src/lib/satisTevkifat";
import { fmtCur } from "../../src/lib/utils";
import { KK_AYAR } from "../fixtures/0079-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const KDV = [{ from: "2000-01-01", rate: 20 }];
const FY = "Faturalı Yurtiçi";
const T = (pay, payda = 10) => ({ tevkifatli: true, tevkifatPay: pay, tevkifatPayda: payda });
const M = [{ id: 1, name: "Anadolu Gıda", model: "AK100", serialNo: "S1", installDate: "2026-09-05", currency: "TRY", faturali: FY, faturaBedeli: 100000, fabrikaSatisBedeli: 100000 }];
const D = [{ id: 3, name: "Ege Bayi", bayiMi: true }];
const P = [{ id: 81, ad: "Rulman" }];

const son = { form: null };
const Kab = ({ Bilesen, ilk, ...rest }) => {
  const [form, setForm] = useState(ilk);
  son.form = form;
  return <Bilesen title="T" form={form} setForm={setForm} customers={M} dealers={D} parts={P} kdvRates={KDV} krediKartiKomisyonlari={KK_AYAR} onCancel={vi.fn()} {...rest} />;
};
const FORMLAR = {
  servis: (ek = {}, rest = {}) => <Kab Bilesen={ServiceForm} ilk={{ customerId: 1, date: "2026-09-10", type: "Garanti Dışı", servisUcreti: 100000, currency: "TRY", faturaTipi: FY, degisenParcalar: [], ...ek }} onSave={vi.fn()} {...rest} />,
  kalip: (ek = {}, rest = {}) => <Kab Bilesen={PartSaleForm} ilk={{ customerId: 1, tarih: "2026-09-10", currency: "TRY", faturaTipi: FY, kaliplar: [{ ad: "K", olcu: "1", fiyat: 100000 }], ...ek }} onSave={vi.fn()} {...rest} />,
  yp: (ek = {}, rest = {}) => <Kab Bilesen={YedekParcaSatisForm} ilk={{ aliciTipi: "musteri", musteriId: 1, tarih: "2026-09-10", currency: "TRY", faturaTipi: FY, satirlar: [{ partId: "81", miktar: 1, birimFiyat: 100000 }], ...ek }} onSave={vi.fn()} {...rest} />,
};
const kutu = () => screen.queryByRole("checkbox", { name: "Bu fatura tevkifatlı" });
const oranSec = (v) => fireEvent.change(screen.getByLabelText("Tevkifat oranı"), { target: { value: v } });

describe("Spec 0079 A: kutu dört formda", () => {
  it("AC-2 / AC-5: servis, Extra Kalıp ve yedek parça formunda kutu var, varsayılan kapalı; kapalıyken oran, not ve özet yok", () => {
    for (const [ad, ciz] of Object.entries(FORMLAR)) {
      render(ciz());
      expect(kutu(), ad).toBeTruthy();
      expect(kutu().checked, ad).toBe(false);
      expect(screen.queryByLabelText("Tevkifat oranı"), ad).toBeNull();
      expect(screen.queryByTestId("satis-tevkifat-ozet"), ad).toBeNull();
      expect(document.body.textContent, ad).not.toContain(SATIS_TEVKIFAT_NOTU_TAHSIL);
      cleanup();
    }
  });
  it("AC-3: yurtdışı ve faturasız tipte kutu hiç çizilmez; tipi olmayan ve eski biçimli kayıtta çizilir", () => {
    for (const tip of ["Faturalı Yurtdışı", "Faturasız Yurtiçi", "Faturasız Yurtdışı"]) {
      for (const [ad, ciz] of Object.entries(FORMLAR)) { render(ciz({ faturaTipi: tip })); expect(kutu(), `${ad} ${tip}`).toBeNull(); cleanup(); }
    }
    for (const tip of [undefined, "Faturalı Yurt İçi"]) {
      for (const [ad, ciz] of Object.entries(FORMLAR)) { render(ciz({ faturaTipi: tip })); expect(kutu(), `${ad} ${tip}`).toBeTruthy(); cleanup(); }
    }
  });
  it("AC-40: yöntem 'Kredi Kartı' seçilince tip kendiliğinden faturalı yurtiçi olur, kutu görünür ama kapalı doğar ve alan yazılmaz", () => {
    render(FORMLAR.kalip({ faturaTipi: "Faturasız Yurtiçi", odendi: true, yontem: "Nakit" }));
    expect(kutu()).toBeNull();
    const yontem = screen.getAllByRole("combobox").find(s => s.value === "Nakit");
    fireEvent.change(yontem, { target: { value: "Kredi Kartı" } });
    expect(son.form.faturaTipi).toBe(FY);
    expect(kutu()).toBeTruthy();
    expect(kutu().checked).toBe(false);
    expect("tevkifatli" in son.form).toBe(false);
  });
  it("AC-21 / AC-22: kutu açıkken üç not, oran seçici (0075 listesi) ve mevcut KDV kutusunun içinde beş satır, motorla aynı rakamlar", () => {
    for (const [ad, ciz] of Object.entries(FORMLAR)) {
      render(ciz());
      fireEvent.click(kutu());
      expect([...screen.getByLabelText("Tevkifat oranı").options].map(o => o.value), ad).toEqual(["", "2/10", "3/10", "4/10", "5/10", "7/10", "9/10"]);
      oranSec("5/10");
      for (const n of [SATIS_TEVKIFAT_NOTU_TAHSIL, SATIS_TEVKIFAT_NOTU_CIRO, SATIS_TEVKIFAT_NOTU_SINIR]) expect(document.body.textContent, ad).toContain(n);
      const ozet = screen.getByTestId("satis-tevkifat-ozet");
      const b = satisTevkifatOzeti(FY, 100000, "2026-09-10", KDV, T(5));
      expect(ozet.textContent, ad).toBe(`Matrah${fmtCur(b.matrah)}Toplam KDV${fmtCur(b.toplamKdv)}Tevkifat (alıcı beyan edecek)− ${fmtCur(b.tevkifat)}Tahsil edilecek KDV${fmtCur(b.bizKdv)}Fatura toplamı (tahsil edilecek)${fmtCur(b.faturaToplami)}`);
      expect(b.faturaToplami).toBe(110000);
      // Yeni kutu açılmaz: özet, formun bugünkü (mavi zeminli) toplam kutusunun içinde.
      expect(ozet.parentElement.textContent, ad).toMatch(/Toplam/);
      expect(son.form, ad).toMatchObject(T(5));
      cleanup();
    }
  });
  it("AC-21: komisyon müşteriye yansıtılan (kkYansit) dalda da özet satırları görünür; kart kırılımı tahsil oranıyla", () => {
    render(FORMLAR.kalip({ ...T(5), odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: true }));
    const ozet = screen.getByTestId("satis-tevkifat-ozet");
    expect(ozet).toBeTruthy();
    expect(document.body.textContent).toContain("Tahsil edilen KDV (%20, tevkifat düşülmüş)");
  });
  it("AC-7: oran seçilmeden üç formda HataMetni; serviste kayıt bildirimle reddedilir", () => {
    for (const ad of ["kalip", "yp"]) {
      render(FORMLAR[ad]({ tevkifatli: true }));
      expect(screen.getAllByRole("alert").map(a => a.textContent), ad).toContain(TEVKIFAT_ORAN_SECILMEDI);
      cleanup();
    }
    const showToast = vi.fn(), onSave = vi.fn();
    render(FORMLAR.servis({ tevkifatli: true }, { showToast, onSave }));
    expect(screen.queryAllByRole("alert").map(a => a.textContent).join()).not.toContain(TEVKIFAT_ORAN_SECILMEDI);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(showToast).toHaveBeenCalledWith(TEVKIFAT_ORAN_SECILMEDI, "err");
    expect(onSave).not.toHaveBeenCalled();
  });
  it("AC-22 / AC-37: kayıtlı kart komisyonu eski tabanlıysa dördüncü (koşullu) uyarı; 'yeni tabanla hesapla' uyarıyı kaldırır", () => {
    const kart = { odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: { toplamKesinti: 10, taksit: 1 } };
    render(FORMLAR.kalip(kart));
    expect(screen.queryByTestId("satis-tevkifat-kart-uyarisi")).toBeNull(); // tevkifat kapalıyken taban aynı
    fireEvent.click(kutu()); oranSec("5/10");
    const uyari = screen.getByTestId("satis-tevkifat-kart-uyarisi");
    expect(uyari.textContent).toContain(SATIS_TEVKIFAT_KART_UYARISI);
    fireEvent.click(within(uyari).getByText("Kart komisyonunu yeni tabanla hesapla"));
    expect(son.form._kartYeniTaban).toBe(true);
    expect(screen.queryByTestId("satis-tevkifat-kart-uyarisi")).toBeNull();
  });
});

describe("Spec 0079 A: makina formunun iki kolu (AC-1, AC-4)", () => {
  const ac = (props = {}) => {
    const setCustomers = vi.fn();
    render(<Customers customers={M} setCustomers={setCustomers} services={[]} partSales={[]} payments={[]} dealers={D} parts={P} kdvRates={KDV}
      setPayments={vi.fn()} gorusmeler={[]} dosyalar={[]} {...props} />);
    return setCustomers;
  };
  const kayitlar = (spy, onceki) => spy.mock.calls.map(c => (typeof c[0] === "function" ? c[0](onceki) : c[0])).pop();
  it("AC-1 / AC-4: ekleme kolunda faturalı yurtiçide kutu çıkar ve alanlar yazılır; tip yurtdışına dönünce alanlar silinir", () => {
    let spy = ac();
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Yeni Firma" } });
    fireEvent.click(kutu()); oranSec("5/10");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(kayitlar(spy, M)[0]).toMatchObject({ name: "Yeni Firma", ...T(5) });
    cleanup();
    spy = ac();
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "İhracat Firma" } });
    fireEvent.click(kutu()); oranSec("5/10");
    fireEvent.change(screen.getAllByRole("combobox").find(s => s.value === FY), { target: { value: "Faturalı Yurtdışı" } });
    expect(kutu()).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    const yeni = kayitlar(spy, M)[0];
    expect(yeni.name).toBe("İhracat Firma");
    for (const a of ["tevkifatli", "tevkifatPay", "tevkifatPayda"]) expect(a in yeni, a).toBe(false);
  });
  it("AC-36 / AC-37: tevkifatlı yeni makinada kartla ilk ödeme tahsil oranıyla: borçtan 110.000 düşer, kalan borç 0, anlık görüntü tabanını taşır", () => {
    const setPayments = vi.fn();
    const spy = ac({ setPayments, appSettings: { krediKartiKomisyonlari: KK_AYAR } });
    fireEvent.click(screen.getByText("Yeni Müşteri"));
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Kartlı Firma" } });
    const para = (etiket) => screen.getByText(etiket).closest("div").parentElement.querySelector("input");
    fireEvent.change(para("Fabrika Satış Bedeli"), { target: { value: "100000" } });
    fireEvent.change(para("Fatura Bedeli (resmi faturada yazan)"), { target: { value: "100000" } });
    fireEvent.click(kutu()); oranSec("5/10");
    fireEvent.click(screen.getByText("+ Ödeme Ekle"));
    fireEvent.change(screen.getByLabelText("Ödeme yöntemi 1"), { target: { value: "Kredi Kartı" } });
    fireEvent.change(screen.getByLabelText("Tahsilat tutarı 1"), { target: { value: "100000" } });
    fireEvent.change(screen.getAllByRole("combobox").find(x => [...x.options].some(o => o.textContent === "Tek Çekim")), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const odeme = setPayments.mock.calls.map(c => c[0]([])).pop()[0];
    expect(odeme.tutar).toBeCloseTo(110000, 6);
    expect(odeme.kartKomisyonu.tevkifatTaban).toBe("5/10");
    // Tek çekimde blokaj 0: ödeme hemen tahsil sayılır; borç 110.000 − 110.000 = 0 (ham oranla 120.000 düşüp 10.000 fazla tahsil gizlenirdi).
    expect(kayitlar(spy, M)[0]).toMatchObject({ name: "Kartlı Firma", ...T(5), kalanBorc: 0 });
  });
  it("AC-4: düzenleme kolunda tip faturasıza dönünce kayıtlı tevkifat silinir (false/null yazılmaz)", () => {
    const tevkifatli = [{ ...M[0], ...T(5) }];
    const spy = ac({ customers: tevkifatli, initialDetailId: 1 });
    fireEvent.click(screen.getAllByText("Düzenle").pop());
    expect(kutu().checked).toBe(true);
    fireEvent.change(screen.getAllByRole("combobox").find(s => s.value === FY), { target: { value: "Faturasız Yurtiçi" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const k = kayitlar(spy, tevkifatli).find(x => x.id === 1);
    for (const a of ["tevkifatli", "tevkifatPay", "tevkifatPayda"]) expect(a in k, a).toBe(false);
  });
});

describe("Spec 0079 D: rozet, borç satırı ve KDV kartı", () => {
  const C = [{ ...M[0], ...T(5) }];
  const SV = [{ id: 11, customerId: 1, date: "2026-09-12", type: "Garanti Dışı", servisUcreti: 10000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: FY, odendi: false, durum: "Bekliyor", ...T(7) }];
  const PS = [{ id: 21, customerId: 1, tur: "Kalıp", ad: "Pide", olcu: "1", tarih: "2026-09-14", ucret: 8000, currency: "TRY", faturaTipi: FY, odendi: false, satisFirma: "Altuntaş Makina", ...T(2) }];
  const YP = [{ id: 31, aliciTipi: "musteri", musteriId: 1, partId: "81", miktar: 2, birimFiyat: 750, currency: "TRY", faturaTipi: FY, tarih: "2026-09-15", odendi: false, tahsisler: [], ...T(9) }];
  it("AC-24 / AC-25: zaman çizelgesinde servis, kalıp, yedek parça ve satış rozeti; borç satırı nedeni yazar; müşteri tablosunda rozet yok", () => {
    render(<Customers customers={C} setCustomers={vi.fn()} services={SV} partSales={PS} payments={[]} yedekParcaSatislar={YP} dealers={D} parts={P}
      kdvRates={KDV} gorusmeler={[]} dosyalar={[]} initialDetailId={1} />);
    const rozetler = screen.getAllByTestId("satis-tevkifat-rozeti").map(r => r.textContent);
    expect(rozetler).toEqual(expect.arrayContaining([
      `Tevkifat 5/10 · alıcı beyan eder: ${fmtCur(10000)}`, `Tevkifat 7/10 · alıcı beyan eder: ${fmtCur(1400)}`,
      `Tevkifat 2/10 · alıcı beyan eder: ${fmtCur(320)}`, `Tevkifat 9/10 · alıcı beyan eder: ${fmtCur(270)}`,
    ]));
    expect(screen.getByTestId("satis-tevkifat-borc").textContent).toBe(`Tevkifatlı fatura (5/10): KDV'nin ${fmtCur(10000)} tutarındaki kısmını alıcı kendisi beyan eder, borca girmez.`);
    // Müşteri tablosu (detayın arkasındaki liste) rozet taşımaz: bütün rozetler detay penceresinin içinde.
    for (const r of screen.getAllByTestId("satis-tevkifat-rozeti")) expect(r.closest("table")).toBeNull();
    cleanup();
    render(<Customers customers={C} setCustomers={vi.fn()} services={SV} partSales={PS} payments={[]} yedekParcaSatislar={YP} dealers={D} parts={P} kdvRates={KDV} />);
    expect(screen.queryByTestId("satis-tevkifat-rozeti")).toBeNull();
  });
  it("AC-24: Stok › Yedek Parça Satışı satırında rozet var; Servis ve Kargo Panosu kartında yok", () => {
    render(<YedekParcaSatisTab yedekParcaSatislar={YP} setYedekParcaSatislar={vi.fn()} dealers={D} parts={P} customers={C} kdvRates={KDV} setPartStock={vi.fn()} setPartStockLog={vi.fn()} />);
    fireEvent.click(screen.getByText("Anadolu Gıda"));
    expect(screen.getByTestId("satis-tevkifat-rozeti").textContent).toBe(`Tevkifat 9/10 · alıcı beyan eder: ${fmtCur(270)}`);
    cleanup();
    render(<ServisPanosu services={SV} setServices={vi.fn()} customers={C} dealers={D} parts={P} calisanlar={[]} kdvRates={KDV} partSales={PS} yedekParcaSatislar={YP} appSettings={{}} />);
    expect(screen.getByText("Anadolu Gıda")).toBeTruthy();
    expect(screen.queryByTestId("satis-tevkifat-rozeti")).toBeNull();
  });
  it("AC-16 / AC-27: Finans KDV kartında alıcının beyanı bilgi satırı; hesaplanan KDV düşük, fark ona göre; KDV2 metni değişmedi", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-09T10:00:00"));
    const cs = [{ id: 1, name: "TL Firma", model: "A", currency: "TRY", faturali: FY, faturaBedeli: 250000, installDate: "2026-09-10", kalanBorc: 0, ...T(5) }];
    render(<Finance customers={cs} services={[]} dealers={[]} partSales={[]} yedekParcaSatislar={[]} factory={{ name: "Altuntaş Makina" }} rates={{}} payments={[]} teklifler={[]}
      serverPermissions={null} kdvRates={KDV} giderTurleri={[{ id: 4, ad: "H", davranis: "normal" }]} giderYururlukAy="2026-06" giderYetki
      giderler={[{ id: 1, tarih: "2026-09-15", turId: 4, tutar: 60000, kdvOrani: 20, odendi: false, ...T(5) }]} />);
    fireEvent.click(screen.getByText("Göster"));
    const kart = screen.getByTestId("kdv-karsilastirma");
    expect(kart.textContent).toMatch(/Satışlardan hesaplanan KDV \(TL\)25\.000 ₺/); // 50.000 KDV, 5/10 alıcıda
    expect(within(kart).getByText("13.000 ₺")).toBeTruthy();     // 25.000 − 12.000; alıcının beyanı farka girmez
    const bilgi = within(kart).getByTestId("satis-tevkifat-bilgi");
    expect(bilgi.textContent).toBe(`${SATIS_TEVKIFAT_KART_ETIKETI}25.000 ₺${SATIS_TEVKIFAT_KART_NOTU}`);
    expect(within(kart).getByTestId("kdv2-bilgi").textContent).toMatch(/^Tevkifatla beyan edilecek KDV \(KDV2\)6\.000 ₺/);
  });
  it("AC-27: aynı satır Giderler'in KDV kartında da çizilir; tevkifatlı satış yoksa çizilmez", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-09T10:00:00"));
    const GH = ({ satis }) => {
      const [giderler, setGiderler] = useState([{ id: 1, tarih: "2026-09-15", turId: 4, tutar: 60000, kdvOrani: 20, odendi: false }]);
      const [h, setH] = useState([]);
      return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={h} setHesapHareketleri={setH} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
        giderTurleri={[{ id: 4, ad: "H", davranis: "normal" }]} tedarikciler={[]} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]}
        standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} kasaHesaplari={[]} kasaYetki aktifKullanici="k"
        baslangicAy="2026-09" kdvRates={KDV} satisVerisi={{ customers: satis, services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
    };
    const cs = [{ id: 1, name: "TL Firma", currency: "TRY", faturali: FY, faturaBedeli: 250000, installDate: "2026-09-10", ...T(5) }];
    render(<GH satis={cs} />);
    // Spec 0081: yan kutular kapalı başlar; içerik (ve yokluk) iddiasından önce kutu açılır (kutuAc açıldığını kanıtlar, C7).
    kutuAc("KDV Karşılaştırması");
    expect(screen.getByTestId("satis-tevkifat-bilgi").textContent).toContain(`${SATIS_TEVKIFAT_KART_ETIKETI}25.000 ₺`);
    cleanup();
    render(<GH satis={[{ ...cs[0], tevkifatli: false }]} />);
    kutuAc("KDV Karşılaştırması"); // yokluk iddiası kutu açıkken (spec 0081 C7); kapalıyken yanlış nedenle geçerdi
    expect(screen.getByTestId("kdv-karsilastirma")).toBeTruthy();
    expect(screen.queryByTestId("satis-tevkifat-bilgi")).toBeNull();
  });
});
