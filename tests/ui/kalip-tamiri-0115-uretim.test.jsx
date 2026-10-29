// @vitest-environment jsdom
// Spec 0115 C, F: Kalıp Üretim Formu'nda Tamir satırları (gerçek UretimFormu, durumlu kap), manuel satır penceresinin kaynak
// bağı, "zaten formda var mı" kümesi; müşteri listesinin kalıp pilleri tamir satırından etkilenmez.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, fireEvent, screen, cleanup, within, act } from "@testing-library/react";
import { UretimFormu } from "../../src/components/stock/UretimFormu";
import { Customers } from "../../src/components/Customers";
import { formSilinceDonenSayisi } from "../../src/lib/musteriDurumu";
import { tamirSatiriKur, KAYNAK_YOK, TAMIR_EKLENDI, BASKA_FORMDA_IBARESI } from "../../src/lib/kalipTamiri";
import { emptyRow } from "../../src/components/stock/uretimFormModel";
import { KDV, CUSTOMERS, SERVICES, PART_SALES, URETIM_FORMLARI, KALIP_DEFS, PARTS } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.crmLocks; });

const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }, { id: 2, ad: "HAMBURGER", olcu: "Ø98" }];
const SV = SERVICES.map(s => (s.id === 41 ? { ...s, atolyeKaliplari: LISTE } : s));

let dis; let toastlar = [];
function Kap({ services0 = SV, formlar0 = URETIM_FORMLARI, partSales0 = PART_SALES, customers0 = CUSTOMERS }) {
  const [customers, setCustomers] = useState(customers0);
  const [partSales, setPartSales] = useState(partSales0);
  const [services, setServicesYerel] = useState(services0);
  const [uretimFormlari, setUretimFormlari] = useState(formlar0);
  dis = { customers, partSales, services, uretimFormlari, setUretimFormlari, setServicesYerel };
  return <UretimFormu uretimFormlari={uretimFormlari.filter(f => !f.deletedAt)} setUretimFormlari={setUretimFormlari}
    customers={customers.filter(c => !c.deletedAt)} partSales={partSales.filter(p => !p.deletedAt)} kalipDefs={KALIP_DEFS}
    services={services.filter(s => !s.deletedAt)} setCustomers={setCustomers} setPartSales={setPartSales} showToast={(m) => toastlar.push(m)} />;
}
const kur = (ek = {}) => { toastlar = []; render(<Kap {...ek} />); };
const listeSatiri = () => document.querySelector("tbody tr");
const formAc = () => fireEvent.click(within(listeSatiri()).getAllByRole("button")[0]);
const tamirDugmesi = () => screen.getByTestId("bekleyen-tamir-dugmesi");
const kaydet = () => fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.trim() === "Kaydet"));
const sonToast = () => toastlar[toastlar.length - 1];
const turlar = () => [...document.querySelectorAll("td[data-tur]")].map(t => t.textContent);
const tamirSatirlari = () => screen.queryAllByTestId("uretim-tamir-satiri");

describe("Spec 0115 üretim formu: Tamir satırları", () => {
  it("AC-28, AC-32, AC-80: Tür sütunu var, üretim satırı 'Üretim'; düğme bekleyen sayısını yazar; services boşsa (0)", () => {
    kur();
    formAc();
    expect(turlar()).toEqual(["Üretim", "Üretim"]);
    expect(tamirDugmesi().textContent).toContain("Bekleyen Tamirleri Getir (2)");
    cleanup();
    kur({ services0: [] });
    formAc();
    expect(tamirDugmesi().textContent).toContain("(0)");
  });
  it("AC-29, AC-30, AC-31, AC-34, AC-100: tarih süzgeci yok; tamir satırı 'Tamir', ayrı zemin, kaynak satırı, müşterinin grubunun sonunda", () => {
    kur();
    formAc(); // dönem tek gün (26.10.2026), servis 12.10.2026
    fireEvent.click(tamirDugmesi());
    expect(sonToast()).toBe(TAMIR_EKLENDI(2));
    expect(tamirSatirlari()).toHaveLength(2);
    expect(tamirSatirlari()[0].getAttribute("style")).toContain("var(--ambBg");
    expect(turlar()).toEqual(["Üretim", "Tamir", "Tamir", "Üretim"]); // Anadolu grubunda PİDE, sonra iki tamir; Bafra ayrı grup
    expect(within(tamirSatirlari()[0]).getByTestId("uretim-tamir-kaynak").textContent).toBe("Servis · Garanti Dışı · 12/10/2026");
    expect(tamirDugmesi().textContent).toContain("(0)");
  });
  it("AC-33, AC-79: kaydedilen tamir ikinci forma girmez; form kaydı servislere dokunmaz", () => {
    kur();
    const servislerOnce = dis.services;
    formAc(); fireEvent.click(tamirDugmesi()); kaydet();
    expect(dis.services).toBe(servislerOnce);
    expect(dis.uretimFormlari[0].satirlar.filter(r => r.kaynakTip === "servis_tamir").map(r => r.kaynakKalipId)).toEqual([1, 2]);
    fireEvent.click(screen.getByText("Yeni Form"));
    expect(tamirDugmesi().textContent).toContain("(0)");
    fireEvent.click(tamirDugmesi());
    expect(sonToast()).toBe("Bekleyen tamir yok.");
  });
  it("AC-36, AC-37: form çöpe atılınca tamir yeniden bekleyen olur; geri alınınca listeden çıkar", () => {
    kur();
    formAc(); fireEvent.click(tamirDugmesi()); kaydet();
    act(() => dis.setUretimFormlari(p => p.map(f => ({ ...f, deletedAt: "2026-10-28" }))));
    fireEvent.click(screen.getByText("Yeni Form"));
    expect(tamirDugmesi().textContent).toContain("(2)");
    fireEvent.click(screen.getByText("← Geri"));
    act(() => dis.setUretimFormlari(p => p.map(({ deletedAt: _d, ...f }) => f)));
    fireEvent.click(screen.getByText("Yeni Form"));
    expect(tamirDugmesi().textContent).toContain("(0)");
  });
  it("AC-38: silme onayının dönecek kalıp sayısı tamir satırlarını saymaz", () => {
    const sv = SV[0];
    const form = { ...URETIM_FORMLARI[0], satirlar: [...URETIM_FORMLARI[0].satirlar, ...LISTE.map(g => tamirSatiriKur(emptyRow(), sv, g, CUSTOMERS[0]))] };
    const veri = { customers: CUSTOMERS, partSales: PART_SALES };
    expect(formSilinceDonenSayisi(form, { ...veri, uretimFormlari: [form] })).toBe(formSilinceDonenSayisi(URETIM_FORMLARI[0], { ...veri, uretimFormlari: URETIM_FORMLARI }));
  });
  it("AC-39, AC-90: atölye tamir satırını silince servisin işareti kayıtta kalır; form kaydedilince tamir yeniden bekleyen olur ve yeniden getirilir", () => {
    kur();
    formAc(); fireEvent.click(tamirDugmesi()); kaydet();
    formAc();
    const tr = tamirSatirlari()[0];
    const b = within(tr).getAllByRole("button"); fireEvent.click(b[b.length - 1]);
    kaydet();
    expect(dis.services.find(s => s.id === 41).atolyeKaliplari).toEqual(LISTE);
    formAc();
    expect(tamirDugmesi().textContent).toContain("(1)");
    fireEvent.click(tamirDugmesi());
    expect(tamirSatirlari()).toHaveLength(2);
  });
  // Spec 0117 ile (R11): üretim formunun tamir satırında etiket düğmesi hiç yok; iddia çöp öncesi ve sonrası yokluğa döndü.
  it("AC-40, AC-97: servis çöpe atılınca tamir satırları formda kalır, kaynak ibaresi çıkar; etiket düğmesi satırda yok", () => {
    kur();
    formAc(); fireEvent.click(tamirDugmesi());
    expect(within(tamirSatirlari()[0]).queryByLabelText("Kargo Etiketi")).toBeNull();
    kaydet();
    act(() => dis.setServicesYerel(p => p.map(s => (s.id === 41 ? { ...s, deletedAt: "2026-10-28" } : s))));
    formAc();
    expect(tamirSatirlari()).toHaveLength(2);
    expect(within(tamirSatirlari()[0]).getByTestId("uretim-tamir-kaynak").textContent).toBe(KAYNAK_YOK);
    expect(within(tamirSatirlari()[0]).queryByLabelText("Kargo Etiketi")).toBeNull();
  });
  it("AC-76, AC-89: satır girişin kimliğiyle eşlenir (sıralama değişse de aynı kalıp); listeden çıkarılan girişin satırı kalır ve kaynağını kaybeder", () => {
    kur();
    formAc(); fireEvent.click(tamirDugmesi()); kaydet();
    act(() => dis.setServicesYerel(p => p.map(s => (s.id === 41 ? { ...s, atolyeKaliplari: [LISTE[1], LISTE[0]] } : s))));
    formAc();
    expect(tamirDugmesi().textContent).toContain("(0)");
    expect(tamirSatirlari().map(t => within(t).getByTestId("uretim-tamir-kaynak").textContent)).toEqual(["Servis · Garanti Dışı · 12/10/2026", "Servis · Garanti Dışı · 12/10/2026"]);
    fireEvent.click(screen.getByText("← Geri"));
    act(() => dis.setServicesYerel(p => p.map(s => (s.id === 41 ? { ...s, atolyeKaliplari: [LISTE[1]] } : s))));
    formAc();
    expect(tamirSatirlari()).toHaveLength(2);
    expect(tamirSatirlari().map(t => within(t).getByTestId("uretim-tamir-kaynak").textContent)).toEqual([KAYNAK_YOK, "Servis · Garanti Dışı · 12/10/2026"]);
  });
  it("Karar 54: kapalı dönemde tamir getirilmez", () => {
    kur({ formlar0: [{ ...URETIM_FORMLARI[0], kapali: true }] });
    formAc();
    fireEvent.click(tamirDugmesi());
    expect(sonToast()).toBe("Bu dönem sonlandırılmış, yeni kalıp eklenemez.");
    expect(tamirSatirlari()).toHaveLength(0);
  });
  it("AC-43 (R41): tamir satırı Extra Kalıp anahtarıyla eşleşmez (servis kimliği satış kimliğine eşit olsa da)", () => {
    const servis = { ...SV[0], id: 21 }; // PİDE satışının kimliği de 21
    const ps = [{ ...PART_SALES[0], uretimFormId: undefined }];
    const form = { ...URETIM_FORMLARI[0], satirlar: [URETIM_FORMLARI[0].satirlar[1], tamirSatiriKur(emptyRow(), servis, LISTE[0], CUSTOMERS[0])] };
    kur({ services0: [servis], partSales0: [{ ...ps[0], tarih: "2026-10-26" }], formlar0: [form] });
    formAc();
    fireEvent.click(screen.getByText("Bekleyen Kalıpları Getir"));
    expect(sonToast()).toBe("1 kalıp eklendi.");
  });
});

describe("Spec 0115 F: manuel satır penceresi (R40, R40/2, R40/3)", () => {
  const ac = () => { fireEvent.click(screen.getByText("Manuel Satır Ekle")); };
  const pencere = () => [...document.querySelectorAll(".modal-backdrop")].pop();
  it("AC-42, AC-101: müşteri seçilmeden ekleme düğmesi pasif, satır doğmaz", () => {
    kur(); formAc(); ac();
    const d = within(pencere()).getByRole("button", { name: /Satıra Ekle/ });
    expect(d.disabled).toBe(true);
    fireEvent.click(d);
    expect(turlar()).toHaveLength(2);
  });
  it("AC-41: müşteri kalıbı seçilerek eklenen satır kaynak bağını taşır; kayıtla damga yazılır, kalıp ikinci forma çekilemez", () => {
    kur(); formAc(); ac();
    fireEvent.click(within(pencere()).getByText("Anadolu Köfte"));
    fireEvent.click(within(pencere()).getByText("KASAP KÖFTE"));
    fireEvent.click(within(pencere()).getByRole("button", { name: /Satıra Ekle/ }));
    kaydet();
    const satir = dis.uretimFormlari[0].satirlar.find(r => r.kalipAdi === "KASAP KÖFTE");
    expect(satir).toMatchObject({ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1 });
    expect(dis.customers[0].kaliplar[1].uretimFormId).toBe(31);
  });
  it("Triyaj: başka canlı formda satırı olan kalıp pasif çizilir ve seçilemez; damga yeni forma yazılmaz", () => {
    const eski = { id: 32, baslangicTarihi: "2026-09-01", bitisTarihi: "2026-09-01", kapali: false, not: "", createdAt: "2026-09-01",
      satirlar: [{ ...emptyRow(), id: 3201, kalipAdi: "KASAP KÖFTE", musteriId: 1, musteriAdi: "Anadolu Köfte", kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1 }] };
    const musteriler = CUSTOMERS.map(c => (c.id === 1 ? { ...c, kaliplar: c.kaliplar.map((k, i) => (i === 1 ? { ...k, uretimFormId: 32 } : k)) } : c));
    kur({ formlar0: [...URETIM_FORMLARI, eski], customers0: musteriler });
    formAc(); ac(); // en yeni form (31) açılır
    fireEvent.click(within(pencere()).getByText("Anadolu Köfte"));
    const pasif = within(pencere()).getAllByTestId("manuel-baska-formda");
    expect(pasif).toHaveLength(1);
    expect(pasif[0].textContent).toContain("KASAP KÖFTE");
    expect(pasif[0].textContent).toContain(BASKA_FORMDA_IBARESI);
    fireEvent.click(within(pencere()).getByText("KASAP KÖFTE"));
    expect(within(pencere()).getByRole("button", { name: /Satıra Ekle/ }).disabled).toBe(true);
    fireEvent.click(within(pencere()).getByText("HAMBURGER"));
    fireEvent.click(within(pencere()).getByRole("button", { name: /Satıra Ekle/ }));
    kaydet();
    const f31 = dis.uretimFormlari.find(f => f.id === 31);
    expect(f31.satirlar.some(r => r.kalipAdi === "KASAP KÖFTE")).toBe(false);
    expect(dis.customers[0].kaliplar[1].uretimFormId).toBe(32);
    expect(dis.customers[0].kaliplar[0].uretimFormId).toBe(31);
  });
  it("AC-102: ayna satır seçilince bağ extra_kalip yazılır ve ayna kaydına damga atılmaz", () => {
    const ps = [{ ...PART_SALES[0], uretimFormId: undefined }];
    kur({ partSales0: ps, formlar0: [{ ...URETIM_FORMLARI[0], satirlar: [URETIM_FORMLARI[0].satirlar[1]] }] });
    formAc(); ac();
    fireEvent.click(within(pencere()).getByText("Anadolu Köfte"));
    expect(within(pencere()).getByText(/Extra Kalıp satışından/)).toBeTruthy();
    fireEvent.click(within(pencere()).getByText("PİDE"));
    fireEvent.click(within(pencere()).getByRole("button", { name: /Satıra Ekle/ }));
    kaydet();
    const satir = dis.uretimFormlari[0].satirlar.find(r => r.kalipAdi === "PİDE");
    expect(satir).toMatchObject({ kaynakTip: "extra_kalip", kaynakId: 21, kalipIdx: null });
    expect(dis.partSales[0].uretimFormId).toBe(31);
    expect(dis.customers[0].kaliplar[2].uretimFormId).toBeUndefined();
  });
});

describe("Spec 0115 C1: müşteri listesi tamir satırından etkilenmez", () => {
  it("AC-35: tamir satırı olan formda müşteri kalıbının durumu ve pili değişmez", () => {
    const metin = (formlar) => {
      const m = render(<Customers customers={CUSTOMERS} setCustomers={vi.fn()} services={SV} partSales={PART_SALES} payments={[]} dealers={[]} parts={PARTS}
        kdvRates={KDV} gorusmeler={[]} dosyalar={[]} uretimFormlari={formlar} kalipDefs={KALIP_DEFS} />);
      const t = m.container.textContent; m.unmount(); return t;
    };
    const tamirli = [{ ...URETIM_FORMLARI[0], satirlar: [...URETIM_FORMLARI[0].satirlar, ...LISTE.map(g => tamirSatiriKur(emptyRow(), SV[0], g, CUSTOMERS[0]))] }];
    expect(metin(tamirli)).toBe(metin(URETIM_FORMLARI));
  });
});
