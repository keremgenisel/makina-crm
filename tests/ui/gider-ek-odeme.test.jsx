// @vitest-environment jsdom
// Spec 0023: çalışan ek ödemeleri, arayüz (gider formu, dönem raporunun personel ayrıntısı, kalem listesi).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 20000 }];

describe("Gider formu: ek ödemeler (R1, R2, R9, R11)", () => {
  const ac = (kalem) => {
    const onSave = vi.fn();
    render(<GiderForm kalem={kalem} giderTurleri={TURLER} tedarikciler={[]} calisanlar={CAL} giderAyarlari={{}} onSave={onSave} onCancel={vi.fn()} />);
    return onSave;
  };
  const personel = (calisan = true) => {
    fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: "3" } });
    if (calisan) fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
  };
  const ekle = (i, tur, resmi, elden = "", aciklama = "") => {
    fireEvent.click(screen.getByText("Ek ödeme ekle"));
    fireEvent.change(screen.getByLabelText(`Ek ödeme türü ${i}`), { target: { value: tur } });
    if (aciklama) fireEvent.change(screen.getByLabelText(`Ek ödeme açıklaması ${i}`), { target: { value: aciklama } });
    if (resmi) fireEvent.change(screen.getByLabelText(`Ek ödeme resmi ${i}`), { target: { value: resmi } });
    if (elden) fireEvent.change(screen.getByLabelText(`Ek ödeme elden ${i}`), { target: { value: elden } });
  };

  it("AC-1 / AC-2 / AC-3 / AC-6: fazla mesai ve prim resmi/elden ayrı girilir; toplam kutusu maaş + ek ödemeler", () => {
    const onSave = ac();
    personel();
    expect(screen.getByTestId("personel-toplam").textContent).toBe("50.000 ₺");
    ekle(1, "fazlaCalisma", "4.000", "1.000", "Eylül yoğunluğu");
    ekle(2, "prim", "", "2.500");
    expect(screen.getByText("Kalem tutarı (maaş + ek ödemeler)")).toBeTruthy();
    expect(screen.getByTestId("personel-toplam").textContent).toBe("57.500 ₺");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].ekOdemeler).toEqual([
      { tur: "fazlaCalisma", aciklama: "Eylül yoğunluğu", resmiTutar: 4000, eldenTutar: 1000 },
      { tur: "prim", aciklama: "", resmiTutar: null, eldenTutar: 2500 },
    ]);
    expect([...screen.getByLabelText("Ek ödeme türü 1").options].map(o => o.textContent)).toEqual(["Fazla mesai", "Prim", "İkramiye"]);
  });
  it("AC-4 / AC-17: aynı türden iki satır formda ayrı ayrı görünür ve ikisi de kaydedilir", () => {
    const onSave = ac();
    personel();
    ekle(1, "prim", "1.000", "", "Teslim primi");
    ekle(2, "prim", "500", "", "Kalite primi");
    expect(within(screen.getByTestId("ek-odemeler")).getAllByTestId("ek-odeme-satiri")).toHaveLength(2);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].ekOdemeler.map(e => e.aciklama)).toEqual(["Teslim primi", "Kalite primi"]);
  });
  it("AC-15: maaşı boş, yalnız 5.000 ikramiyesi olan kalem kaydedilir", () => {
    const onSave = ac();
    fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    fireEvent.change(screen.getByLabelText("Resmi işveren maliyeti"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Elden ödenen"), { target: { value: "" } });
    ekle(1, "ikramiye", "5.000");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ resmiTutar: null, eldenTutar: null, ekOdemeler: [{ tur: "ikramiye", resmiTutar: 5000 }] });
  });
  it("AC-16: negatif tutar kaydı engeller ve satırın altında neden gösterilir; tamamen boş satır sessizce atılır", () => {
    const onSave = ac();
    personel();
    ekle(1, "prim", "-5");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    expect(within(screen.getAllByTestId("ek-odeme-satiri")[0]).getByText("Ek ödeme satırında tutar negatif olamaz (1. satır).")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Ek ödeme 1 sil"));
    fireEvent.click(screen.getByText("Ek ödeme ekle")); // boş satır
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].ekOdemeler).toEqual([]);
  });
  it("AC-20: ek ödeme satırında ayrı vade ya da ödeme durumu alanı yok", () => {
    ac();
    personel();
    ekle(1, "prim", "100");
    const satir = screen.getAllByTestId("ek-odeme-satiri")[0];
    expect(within(satir).queryByText(/vade|Ödendi/i)).toBeNull();
    expect(satir.querySelectorAll("input[type=date]").length).toBe(0);
  });
  it("düzenlemede kayıtlı ek ödemeler forma geri gelir", () => {
    ac({ id: 5, tarih: "2026-09-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, odendi: false,
      ekOdemeler: [{ tur: "ikramiye", aciklama: "Bayram", resmiTutar: 3000, eldenTutar: null }] });
    expect(screen.getByLabelText("Ek ödeme açıklaması 1").value).toBe("Bayram");
    expect(screen.getByTestId("personel-toplam").textContent).toBe("53.000 ₺");
  });
});

describe("Dönem raporu: personel ayrıntısı (R7, R8)", () => {
  function Harness({ g0 }) {
    const [giderler, setGiderler] = useState(g0);
    return <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TURLER} tedarikciler={[]} setTedarikciler={vi.fn()}
      standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-06" } }}
      serverPermissions={null} showToast={vi.fn()} satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} />;
  }
  const KALEM = { id: 1, tarih: "2026-09-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, odendi: false,
    ekOdemeler: [{ tur: "prim", aciklama: "Teslim primi", resmiTutar: 1000, eldenTutar: null }, { tur: "prim", aciklama: "Kalite primi", resmiTutar: null, eldenTutar: 500 }] };
  it("AC-10 / AC-11 / AC-19: kapalıyken yalnız toplam; açılınca Resmi, Elden, Ek ödeme ve iki satır ayrı ayrı (AC-4)", () => {
    render(<Harness g0={[KALEM]} />);
    const tk = screen.getByTestId("tur-kirilimi");
    expect(tk.textContent).toMatch(/51\.500 ₺/);
    expect(within(tk).queryByTestId("personel-ayrinti")).toBeNull();
    expect(tk.textContent).not.toMatch(/Teslim primi/);
    fireEvent.click(within(tk).getByText(/Aç/));
    const a = within(tk).getByTestId("personel-ayrinti");
    expect(within(a).getByText("Ek ödeme")).toBeTruthy();
    const c = within(a).getByTestId("personel-ayrinti-calisan");
    // Spec 0070 R29 ile güncellendi: yol parası sütunu (bu kalemde boş, "—"). Spec 0074 R16 ile güncellendi: SGK sütunu kalktı.
    expect(c.textContent).toMatch(/Hasan Çelik30\.000 ₺20\.000 ₺—1\.500 ₺51\.500 ₺/);
    expect(within(c).getAllByTestId("personel-ek-odeme").map(x => x.textContent)).toEqual(["Prim · Teslim primi1.000 ₺", "Prim · Kalite primi500 ₺"]);
  });
  it("P7: kalem listesinin personel satırı ek ödeme tutarını yazar (personel grubu açılınca)", () => {
    render(<Harness g0={[KALEM]} />);
    fireEvent.click(screen.getByText(/Çalışanları göster/));
    expect(screen.getByText("Resmi 30.000 ₺ · Elden 20.000 ₺ · Ek ödeme 1.500 ₺")).toBeTruthy();
  });
});
