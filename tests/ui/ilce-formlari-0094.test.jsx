// @vitest-environment jsdom
// Spec 0094: beş yeni il (Aydın, Sakarya, Eskişehir, Gaziantep, Yalova) seçilince İlçe alanı, bugün alanı çizen beş formda
// çıkar (R6); çizmeyen formlar çizmemeye devam eder (R6/3, X10). Formların kodu değişmedi: liste src/lib/map/ilceler.js'ten.
// Emsal tests/ui/yedek-parca-satis.test.jsx (teslimat ilçesi). Şehir listesi çevrimdışı yedekten (geoData null → CITIES_TR).
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { CustomerAddEditForm } from "../../src/components/customers/CustomerAddEditForm";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { SettingsCompany } from "../../src/components/settings/SettingsCompany";
import { ServiceForm } from "../../src/components/ServiceForm";
import { ILCELER } from "../../src/lib/map/ilceler";
import { kutuAc } from "./kutuAc";

afterEach(cleanup);

let sonForm;
const Musteri = ({ ilk }) => {
  const [form, setForm] = useState(ilk);
  sonForm = form;
  return <CustomerAddEditForm modal={{ edit: { id: 1 } }} form={form} setForm={setForm} save={vi.fn()} onClose={vi.fn()}
    stock={[]} models={[]} dealers={[]} factory={{ name: "Altuntaş Makina" }} kdvRates={{ "2023-07-10": 20 }} payments={[]} geoData={null} loadingGeo={false} entity="customer" />;
};
const musteri = (city, o = {}) => ({ id: 1, name: "A", faturali: "Faturalı Yurtiçi", currency: "TRY", installDate: "2026-06-10", kaliplar: [], country: "Türkiye", city, ...o });
const ilceSecici = () => screen.queryByRole("option", { name: "İlçe seçin..." })?.closest("select") || null;

describe("Spec 0094: müşteri formu (R6)", () => {
  it("AC-15: Türkiye + Sakarya seçiliyken İlçe alanı çıkar ve listesi Sakarya'nın ilçeleri", () => {
    render(<Musteri ilk={musteri("Sakarya")} />);
    const s = ilceSecici();
    expect(s).toBeTruthy();
    const secenekler = [...s.options].map(o => o.textContent).filter(t => t !== "İlçe seçin...");
    expect(secenekler).toEqual(ILCELER["Sakarya"]);
    expect(secenekler).toContain("Adapazarı");
    expect(secenekler).toContain("Sapanca");
  });
  it("AC-15: beş ilin hepsinde alan çıkar; seçilen ilçe kayda yazılır", () => {
    for (const [il, ilce] of [["Aydın", "Kuşadası"], ["Eskişehir", "Odunpazarı"], ["Gaziantep", "Şahinbey"], ["Yalova", "Yalova"]]) {
      render(<Musteri ilk={musteri(il)} />);
      fireEvent.change(ilceSecici(), { target: { value: ilce } });
      expect(sonForm.ilce, il).toBe(ilce);
      cleanup();
    }
  });
  it("AC-16: listede olmayan ilde (Kayseri) İlçe alanı çizilmez", () => {
    render(<Musteri ilk={musteri("Kayseri")} />);
    expect(ilceSecici()).toBeNull();
  });
  it("AC-17: şehir değiştirilince seçili ilçe temizlenir (Aydın/Kuşadası → Gaziantep)", () => {
    render(<Musteri ilk={musteri("Aydın", { ilce: "Kuşadası" })} />);
    fireEvent.change(screen.getByDisplayValue("Aydın"), { target: { value: "Gaziantep" } });
    expect(sonForm.city).toBe("Gaziantep");
    expect(sonForm.ilce).toBe("");
    expect([...ilceSecici().options].map(o => o.textContent)).toContain("Şahinbey");
  });
});

describe("Spec 0094: diğer dört form (R6, AC-18)", () => {
  it("AC-18: bayi formu, Sakarya", () => {
    render(<SimpleDealers dealers={[{ id: 3, name: "Sakarya Bayi", bayiMi: true, country: "Türkiye", city: "Sakarya" }]} setDealers={vi.fn()} factory={{ name: "F" }} setFactory={vi.fn()}
      geoData={null} loadingGeo={false} showToast={vi.fn()} />);
    const satir = screen.getByText("Sakarya Bayi").closest("tr");
    fireEvent.click(within(satir).getAllByRole("button")[0]);
    expect(screen.getByRole("option", { name: "Adapazarı" })).toBeTruthy();
  });
  it("AC-18: Extra Kalıp teslimat adresi, Eskişehir", () => {
    const H = () => {
      const [form, setForm] = useState({ customerId: 1, kaliplar: [{ ad: "K", olcu: "", fiyat: "100" }], currency: "TRY", teslimatFarkli: true, teslimatUlke: "Türkiye", teslimatSehir: "Eskişehir" });
      return <PartSaleForm title="Extra Kalıp Satışı" form={form} setForm={setForm} customers={[{ id: 1, name: "ABC" }]} kalipDefs={[]} dealers={[]} factory={{ name: "F" }} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.getByRole("option", { name: "Tepebaşı" })).toBeTruthy();
  });
  it("AC-18: yedek parça teslimat adresi, Gaziantep", () => {
    const H = () => {
      const [form, setForm] = useState({ aliciTipi: "bayi", dealerId: 5, satirlar: [{ partId: "7", miktar: "1", birimFiyat: "100" }], currency: "TRY", kargoDurum: "Hazırlanıyor", teslimatFarkli: true, teslimatUlke: "Türkiye", teslimatSehir: "Gaziantep" });
      return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={[{ id: 5, name: "B", bayiMi: true }]} customers={[]} parts={[{ id: 7, ad: "Rulman" }]} partStock={[{ id: 1, partId: "7", miktar: 10 }]} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    expect(screen.getByRole("option", { name: "Şehitkamil" })).toBeTruthy();
  });
  it("AC-18: fabrika adresi, Yalova; merkez ilçe 'Yalova' adıyla, 'Yalova merkez' yok", () => {
    render(<SettingsCompany factory={{ name: "Altuntaş", country: "Türkiye", city: "Yalova" }} setFactory={vi.fn()} appSettings={{}} setAppSettings={() => {}} flash={() => {}} />);
    kutuAc("Firma Bilgileri"); // kart kapalı başlar
    // İlçe adı il adına eşit (spec K-4): "Yalova" hem şehir hem ilçe seçeneğidir; ilçe seçicisinde aranır.
    const ilce = screen.getByRole("option", { name: "Çınarcık" }).closest("select");
    expect([...ilce.options].map(o => o.textContent)).toContain("Yalova");
    expect([...ilce.options].map(o => o.textContent)).not.toContain("Yalova merkez");
  });
});

describe("Spec 0094: alan çizmeyen formlar (R6/3, X10)", () => {
  it("AC-19: servis formunun işlem firması adresi beş ilde de İlçe çizmez", () => {
    render(<ServiceForm title="Yeni Servis Talebi" form={{ customerId: 1, islemFirma: "Diğer", islemFirmaUlke: "Türkiye", islemFirmaSehir: "Sakarya", degisenParcalar: [] }} setForm={vi.fn()}
      customers={[{ id: 1, name: "ABC", faturali: "Faturalı Yurtiçi" }]} dealers={[]} factory={{ name: "F" }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByDisplayValue("Sakarya")).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Adapazarı" })).toBeNull();
  });
});
