// @vitest-environment jsdom
// Spec 0115 B: servis formunun "Kalıp atölyeye girecek" bölümü (ServiceForm + KalipAtolyeAlani) ve iki kurucunun kaydı
// (CustomerDetailModal.saveService, ServisPanosu.kaydet).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { useState } from "react";
import { ServiceForm } from "../../src/components/ServiceForm";
import { Customers } from "../../src/components/Customers";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { tamirDogrula, KALIP_KUTU_ETIKETI, KALIP_KUTU_IPUCU, KALIP_ISI_ONERISI, TAMIR_BOS_HATASI, TAMIR_AD_HATASI, KAYIT_BOLUMU } from "../../src/lib/kalipTamiri";
import { REPAIR_PLACES, SERVICE_TYPES } from "../../src/lib/constants";
import { KDV, FY, PART_TYPES, PARTS, CUSTOMERS, SERVICES, PART_SALES } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); });

const TIP = { id: "tip_1", ad: "Kalıp Revize", renk: "blu", makinaSecici: false, stokDus: false, raporGoster: false, kalipIsi: true, sistem: false };
const TIPLER = [...PART_TYPES, TIP];
const PARCALAR = PARTS.map(p => (p.id === 81 ? { ...p, tip: "Kalıp Revize" } : p));
const son = { form: null };
const Kab = ({ ilk, partTypeDefs = TIPLER, ...rest }) => {
  const [form, setForm] = useState(ilk);
  son.form = form;
  return <ServiceForm title="T" form={form} setForm={setForm} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} kdvRates={KDV}
    onSave={vi.fn()} onCancel={vi.fn()} partTypeDefs={partTypeDefs} {...rest} />;
};
const kutu = () => screen.getByRole("checkbox", { name: KALIP_KUTU_ETIKETI });
const yeni = (ek = {}) => ({ customerId: 1, date: "2026-10-12", type: "Garanti Dışı", repairPlace: "Fabrikada Onarım", currency: "TRY", faturaTipi: FY, degisenParcalar: [], ...ek });

describe("Spec 0115 servis formu bölümü", () => {
  it("AC-87 (R10/2): kutu her servis türünde ve her onarım yerinde çizilir; ipucu yazılı", () => {
    for (const type of SERVICE_TYPES) for (const repairPlace of [...REPAIR_PLACES, ""]) {
      render(<Kab ilk={yeni({ type, repairPlace })} />);
      expect(kutu(), `${type}/${repairPlace}`).toBeTruthy();
      cleanup();
    }
    render(<Kab ilk={yeni({ islemFirma: "Diğer", islemFirmaAd: "Usta" })} />);
    expect(kutu()).toBeTruthy();
    expect(screen.getByText(KALIP_KUTU_IPUCU)).toBeTruthy();
  });
  it("AC-15, AC-16, AC-17: kalıp işi kalemi eklenince öneri çıkar ve kutuyu işaretlemez; kalem yoksa öneri yok", () => {
    render(<Kab ilk={yeni({ degisenParcalar: [{ partId: "84", ad: "Rulman", miktar: 1, fiyat: 250 }] })} />);
    expect(screen.queryByText(KALIP_ISI_ONERISI)).toBeNull();
    cleanup();
    render(<Kab ilk={yeni({ degisenParcalar: SERVICES[0].degisenParcalar })} />);
    expect(screen.getByText(KALIP_ISI_ONERISI)).toBeTruthy();
    expect(kutu().checked).toBe(false);
    expect(son.form._kalipAtolye).toBeUndefined();
  });
  it("AC-81: partTypeDefs verilmezse öneri çizilmez ve form hata vermez", () => {
    render(<Kab ilk={yeni({ degisenParcalar: SERVICES[0].degisenParcalar })} partTypeDefs={null} />);
    expect(screen.queryByText(KALIP_ISI_ONERISI)).toBeNull();
    fireEvent.click(kutu());
    expect(son.form.atolyeKaliplari).toEqual([]);
  });
  it("AC-18, AC-19, AC-20, AC-21: kutu açılınca üç kaynak; ön doldurma kalemin adı bütün, ölçü boş; kayıtlı kalıplar onay kutusuyla", () => {
    render(<Kab ilk={yeni({ degisenParcalar: SERVICES[0].degisenParcalar })} />);
    fireEvent.click(kutu());
    for (const id of ["atolye-kaynak-kalem", "atolye-kaynak-kayitli", "atolye-kaynak-elle"]) expect(screen.getByTestId(id)).toBeTruthy();
    expect(screen.getByText(KAYIT_BOLUMU.kayitli)).toBeTruthy();
    expect(screen.getByLabelText("Atölye kalıp adı 1").value).toBe("100_ERKEK KALIPLAR REVİZE");
    expect(screen.getByLabelText("Atölye kalıp ölçüsü 1").value).toBe("");
    const kayitli = within(screen.getByTestId("atolye-kaynak-kayitli")).getAllByRole("checkbox");
    expect(kayitli).toHaveLength(3); // HAMBURGER, KASAP KÖFTE ve ayna PİDE (Karar 50)
    fireEvent.click(kayitli[0]);
    expect(son.form.atolyeKaliplari.map(g => [g.ad, g.olcu])).toEqual([["100_ERKEK KALIPLAR REVİZE", ""], ["HAMBURGER", "Ø98"]]);
    expect(kayitli[0].checked).toBe(true);
    fireEvent.click(kayitli[0]);
    expect(son.form.atolyeKaliplari).toHaveLength(1);
  });
  it("AC-22: elle girilen kalıp listede karşılığı olmadan eklenir", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kalıp ekle"));
    fireEvent.change(screen.getByLabelText("Atölye kalıp adı 1"), { target: { value: "ÖZEL KALIP" } });
    fireEvent.change(screen.getByLabelText("Atölye kalıp ölçüsü 1"), { target: { value: "50*50" } });
    expect(son.form.atolyeKaliplari.map(g => [g.ad, g.olcu])).toEqual([["ÖZEL KALIP", "50*50"]]);
  });
  it("Triyaj: taslaktan dönen formda yeni girişin anahtarı eskisiyle çakışmaz, hata yalnız boş satırın altında", () => {
    render(<Kab ilk={yeni({ _kalipAtolye: true, atolyeKaliplari: [{ _anahtar: "y1", ad: "A", olcu: "" }, { _anahtar: "y3", ad: "B", olcu: "" }] })} />);
    fireEvent.click(screen.getByText("Kalıp ekle"));
    const anahtarlar = son.form.atolyeKaliplari.map(g => g._anahtar);
    expect(new Set(anahtarlar).size).toBe(3);
    expect(anahtarlar.slice(0, 2)).toEqual(["y1", "y3"]);
    const d = tamirDogrula(son.form);
    expect(Object.keys(d.satirHatalari)).toEqual([anahtarlar[2]]);
  });
  it("AC-14: Extra Kalıp ve yedek parça formlarında kutu yok", () => {
    const S = ({ B, ilk }) => { const [f, setF] = useState(ilk); return <B title="T" form={f} setForm={setF} customers={CUSTOMERS} dealers={[]} parts={PARTS} kdvRates={KDV} onSave={vi.fn()} onCancel={vi.fn()} />; };
    render(<S B={PartSaleForm} ilk={{ customerId: 1, tarih: "2026-10-12", currency: "TRY", faturaTipi: FY, kaliplar: [{ ad: "K", olcu: "", fiyat: 1 }] }} />);
    expect(screen.queryByRole("checkbox", { name: KALIP_KUTU_ETIKETI })).toBeNull();
    cleanup();
    render(<S B={YedekParcaSatisForm} ilk={{ aliciTipi: "musteri", musteriId: 1, tarih: "2026-10-12", currency: "TRY", faturaTipi: FY, satirlar: [{ partId: "84", miktar: 1, birimFiyat: 1 }] }} />);
    expect(screen.queryByRole("checkbox", { name: KALIP_KUTU_ETIKETI })).toBeNull();
  });
});

// ── Kurucular ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const musteriDetay = (services = SERVICES) => {
  const setServices = vi.fn(), showToast = vi.fn(), setCustomers = vi.fn();
  render(<Customers customers={CUSTOMERS} setCustomers={setCustomers} services={services} setServices={setServices} partSales={PART_SALES} setPartSales={vi.fn()}
    payments={[]} dealers={[]} parts={PARCALAR} kdvRates={KDV} gorusmeler={[]} dosyalar={[]} partTypeDefs={TIPLER} showToast={showToast}
    setYedekParcaSatislar={vi.fn()} initialDetailId={1} />);
  return { setServices, showToast, setCustomers };
};
const kayitlar = (setServices, taban) => setServices.mock.calls.map(([f]) => (typeof f === "function" ? f(taban) : f)).at(-1);
const servisiAc = () => fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => /Garanti Dışı/.test(e.textContent)));
const kaydet = () => fireEvent.click(screen.getAllByRole("button", { name: /Kaydet/ }).pop());

describe("Spec 0115 kurucular: müşteri detayı", () => {
  it("AC-12, AC-23, AC-26: müşteri detayından açılan formda kutu var; kayıt listeyi kimlikleriyle yazar, müşteri kaydına dokunmaz", () => {
    const { setServices, setCustomers } = musteriDetay();
    servisiAc();
    fireEvent.click(kutu());
    kaydet();
    const sv = kayitlar(setServices, SERVICES).find(s => s.id === 41);
    expect(sv.atolyeKaliplari).toHaveLength(1);
    expect(sv.atolyeKaliplari[0]).toEqual({ id: expect.any(Number), ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" });
    expect(Object.keys(sv).filter(k => k.startsWith("_"))).toEqual([]);
    expect(setCustomers).not.toHaveBeenCalled();
  });
  it("AC-24: kutu açık ve liste boşsa kayıt reddedilir, neden görünür", () => {
    const { setServices, showToast } = musteriDetay();
    servisiAc();
    fireEvent.click(kutu());
    fireEvent.click(screen.getByLabelText("Atölye kalıbını çıkar 1"));
    kaydet();
    expect(setServices).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(TAMIR_BOS_HATASI, "err");
    expect(screen.getByTestId("atolye-bos-hatasi").textContent).toContain(TAMIR_BOS_HATASI);
  });
  it("AC-88: adı boş giriş reddedilir ve nedeni o satırın altında", () => {
    const { setServices } = musteriDetay();
    servisiAc();
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kalıp ekle"));
    kaydet();
    expect(setServices).not.toHaveBeenCalled();
    expect(screen.getByTestId("atolye-satir-hatasi-1").textContent).toContain(TAMIR_AD_HATASI);
  });
  it("AC-25, AC-75: kutu kapatılıp kaydedilen kayıtta liste yok; düzenleme değişmeyen girişin kimliğini korur", () => {
    const kayitli = SERVICES.map(s => (s.id === 41 ? { ...s, atolyeKaliplari: [{ id: 777, ad: "HAMBURGER", olcu: "Ø98" }] } : s));
    let r = musteriDetay(kayitli);
    servisiAc();
    expect(kutu().checked).toBe(true);
    fireEvent.click(screen.getByText("Kalıp ekle"));
    fireEvent.change(screen.getByLabelText("Atölye kalıp adı 2"), { target: { value: "YENİ" } });
    kaydet();
    const sv = kayitlar(r.setServices, kayitli).find(s => s.id === 41);
    expect(sv.atolyeKaliplari[0]).toEqual({ id: 777, ad: "HAMBURGER", olcu: "Ø98" });
    expect(sv.atolyeKaliplari[1].id).not.toBe(777);
    cleanup();
    r = musteriDetay(kayitli);
    servisiAc();
    fireEvent.click(kutu());
    kaydet();
    expect("atolyeKaliplari" in kayitlar(r.setServices, kayitli).find(s => s.id === 41)).toBe(false);
  });
});

const pano = () => {
  const setServices = vi.fn(); const showToast = vi.fn();
  render(<ServisPanosu services={SERVICES} setServices={setServices} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} calisanlar={[]} showToast={showToast}
    partTypeDefs={TIPLER} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
  fireEvent.click(screen.getAllByText("Anadolu Köfte")[0].closest("article"));
  return { setServices, showToast };
};

describe("Spec 0115 kurucular: Servis ve Kargo Panosu", () => {
  it("AC-24 (pano kurucusu): kutu açık ve liste boşsa kayıt reddedilir, neden görünür", () => {
    const { setServices, showToast } = pano();
    fireEvent.click(kutu());
    fireEvent.click(screen.getByLabelText("Atölye kalıbını çıkar 1"));
    kaydet();
    expect(setServices).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(TAMIR_BOS_HATASI, "err");
    expect(screen.getByTestId("atolye-bos-hatasi").textContent).toContain(TAMIR_BOS_HATASI);
  });
  it("AC-88 (pano kurucusu): adı boş giriş reddedilir ve nedeni o satırın altında", () => {
    const { setServices } = pano();
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kalıp ekle"));
    kaydet();
    expect(setServices).not.toHaveBeenCalled();
    expect(screen.getByTestId("atolye-satir-hatasi-1").textContent).toContain(TAMIR_AD_HATASI);
  });
  it("AC-13: panodan açılan formda aynı kutu; iki formun etiketleri aynı; kayıt aynı yazıcıdan", () => {
    const setServices = vi.fn();
    render(<ServisPanosu services={SERVICES} setServices={setServices} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} calisanlar={[]} showToast={vi.fn()}
      partTypeDefs={TIPLER} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
    fireEvent.click(screen.getAllByText("Anadolu Köfte")[0].closest("article"));
    expect(kutu()).toBeTruthy();
    expect(screen.getByText(KALIP_ISI_ONERISI)).toBeTruthy();
    fireEvent.click(kutu());
    kaydet();
    const sv = kayitlar(setServices, SERVICES).find(s => s.id === 41);
    expect(sv.atolyeKaliplari.map(g => g.ad)).toEqual(["100_ERKEK KALIPLAR REVİZE"]);
  });
});
