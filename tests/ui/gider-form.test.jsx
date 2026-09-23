// @vitest-environment jsdom
// Spec 0001: gider kalemi formu (GiderForm) davranışları.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { GiderForm } from "../../src/components/GiderForm";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const CAL = [{ id: 21, ad: "Hasan", resmiMaliyet: 30000, eldenMaliyet: 20000 }, { id: 22, ad: "Zeynep" }, { id: 23, ad: "Ali", resmiMaliyet: 40000 }];
const ac = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={[{ id: 11, ad: "Kiraya veren" }]} calisanlar={CAL} modeller={[{ model: "AK120_DSC" }, { model: "AK100_DS" }]}
    stock={[{ id: 501, model: "AK100_DS", serialNo: "2026-121" }]} customers={[{ id: 601, name: "Örnek Gıda", model: "AK120_DSC", serialNo: "2026-118" }]}
    giderAyarlari={{ stopajOrani: 20 }} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });

describe("GiderForm: personel (R5, C19, K14, K29)", () => {
  it("AC-37: maliyetli çalışan seçilince resmi ve elden dolar, değiştirilebilir", () => {
    const onSave = ac();
    tur(3);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    expect(screen.getByLabelText("Resmi işveren maliyeti").value).toBe("30000");
    expect(screen.getByLabelText("Elden ödenen").value).toBe("20000");
    fireEvent.change(screen.getByLabelText("Elden ödenen"), { target: { value: "15.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ calisanId: 21, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 15000, kdvOrani: 0, tedarikciId: null });
  });
  it("AC-37: maliyetsiz çalışanda alanlar boş kalır (0 yazılmaz) ve kalem kaydedilmez", () => {
    const onSave = ac();
    tur(3);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "22" } });
    expect(screen.getByLabelText("Resmi işveren maliyeti").value).toBe("");
    expect(screen.getByText(/aylık maliyeti girilmemiş/)).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Tutar sıfırdan büyük olmalı.")).toBeTruthy();
  });
  it("AC-54: yalnız boş alan doldurulur, dolu alan ezilmez", () => {
    ac();
    tur(3);
    fireEvent.change(screen.getByLabelText("Resmi işveren maliyeti"), { target: { value: "35.000" } });
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    expect(screen.getByLabelText("Resmi işveren maliyeti").value).toBe("35.000");
    expect(screen.getByLabelText("Elden ödenen").value).toBe("20000");
  });
  it("AC-57 / AC-60 / AC-64: SGK notu görünür; KDV ve tedarikçi alanı yok", () => {
    ac();
    tur(3);
    expect(screen.getByText(/SGK ve işsizlik primlerini içerir/)).toBeTruthy();
    expect(screen.queryByLabelText("KDV oranı")).toBeNull();
    expect(screen.queryByText("Tedarikçi")).toBeNull();
  });
  it("AC-58: SGK hatırlatması engel değildir; ayrı normal kalem kaydedilir", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "12.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).toHaveBeenCalled();
  });
  it("AC-66: aynı çalışan ve ay için kalem varken uyarı çıkar, devam edilince kaydedilir", () => {
    const onSave = ac({ giderler: [{ id: 5, turId: 3, calisanId: 21, tarih: "2026-09-01", resmiTutar: 30000 }] });
    tur(3);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    expect(screen.getByText(/2026-09 ayında zaten 1 personel kalemi var/)).toBeTruthy();
    fireEvent.click(screen.getByText("Yine de Kaydet"));
    expect(onSave).toHaveBeenCalled();
  });
});

describe("GiderForm: kira (R6)", () => {
  it("AC-4 / AC-26: brüt 20.000, %20 stopaj, %20 KDV özeti", () => {
    ac();
    tur(1);
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    const oz = screen.getByTestId("kira-ozet");
    expect(within(oz).getAllByText("− 4.000 ₺").length).toBe(1);
    expect(within(oz).getByText("16.000 ₺")).toBeTruthy();
    expect(within(oz).getByText("+ 4.000 ₺")).toBeTruthy();
    expect(within(oz).getAllByText("20.000 ₺").length).toBeGreaterThanOrEqual(2);
  });
  it("AC-5: net 16.000 girilince brüt 20.000 ve yön kayda yazılır", () => {
    const onSave = ac();
    tur(1);
    fireEvent.click(screen.getByText("Net ödenen kira"));
    fireEvent.change(screen.getByLabelText("Net ödenen kira"), { target: { value: "16.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ girisYonu: "net", tutar: 20000, netTutar: 16000, stopajOrani: 20 });
  });
  it("AC-78: kira ve personelde atama bölümü çizilmez", () => {
    ac();
    tur(1);
    expect(screen.queryByText("Makina maliyeti ataması")).toBeNull();
    tur(4);
    expect(screen.getByText("Makina maliyeti ataması")).toBeTruthy();
  });
});

describe("GiderForm: ödeme yöntemi ve vade (R1, R18)", () => {
  it("AC-68: yöntem seçilmeden kaydedilir (belirtilmemiş)", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].odemeYontemi).toBe("");
  });
  it("AC-69: Çek seçilince etiket 'Çek vade tarihi' olur; yöntem değişince tarih korunur", () => {
    ac();
    fireEvent.click(screen.getByText("Çek"));
    expect(screen.getByText("Çek vade tarihi")).toBeTruthy();
    const alan = screen.getByText("Çek vade tarihi").parentElement.querySelector("input");
    fireEvent.change(alan, { target: { value: "2026-10-15" } });
    fireEvent.click(screen.getByText("Havale"));
    expect(screen.getByText("Son ödeme tarihi")).toBeTruthy();
    expect(screen.getByText("Son ödeme tarihi").parentElement.querySelector("input").value).toBe("2026-10-15");
    expect(screen.queryByText("Çek vade tarihi")).toBeNull();
  });
  it("AC-71: vade gider tarihinden önceyse kayıt yapılmaz ve neden yazılır", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Çek"));
    fireEvent.change(screen.getByText("Çek vade tarihi").parentElement.querySelector("input"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Çek vade tarihi gider tarihinden önce olamaz.")).toBeTruthy();
  });
});

describe("GiderForm: atama (R7, R20, R21)", () => {
  it("AC-76 / AC-77: seçim değişince önceki atama temizlenir ve bilgi satırı çıkar", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "140.000" } });
    fireEvent.click(screen.getByRole("radio", { name: "Makina" }));
    fireEvent.change(screen.getByLabelText("Makina"), { target: { value: "stok:501" } });
    fireEvent.click(screen.getByRole("radio", { name: "Model" }));
    expect(screen.getByText(/Makina seçimi kaldırıldı/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Model 1"), { target: { value: "AK120_DSC" } });
    fireEvent.change(screen.getByLabelText("Birim maliyet 1"), { target: { value: "4.000" } });
    fireEvent.change(screen.getByLabelText("Adet 1"), { target: { value: "35" } });
    fireEvent.click(screen.getByRole("radio", { name: "Dağıtılmasın" }));
    expect(screen.getByText(/Model seçimi kaldırıldı/)).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ atamaTur: "dagitma", makinaId: null, modelSatirlari: [] });
  });
  it("AC-79 / AC-87 / AC-88 / AC-90b: çok satırlı model; aynı model seçilemez, aşımda kayıt yok", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100.000" } });
    fireEvent.click(screen.getByRole("radio", { name: "Model" }));
    fireEvent.change(screen.getByLabelText("Model 1"), { target: { value: "AK120_DSC" } });
    fireEvent.change(screen.getByLabelText("Birim maliyet 1"), { target: { value: "4.000" } });
    fireEvent.change(screen.getByLabelText("Adet 1"), { target: { value: "35" } });
    expect(screen.getAllByText("140.000 ₺").length).toBeGreaterThan(0);
    expect(screen.getByText(/aşıyor/)).toBeTruthy();
    fireEvent.click(screen.getByText("Model satırı ekle"));
    const ikinci = screen.getByLabelText("Model 2");
    expect([...ikinci.querySelectorAll("option")].find(o => o.value === "AK120_DSC").disabled).toBe(true);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
  });
  it("AC-90: eksik dağıtım bilgi verir ve kaydedilir", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100.000" } });
    fireEvent.click(screen.getByRole("radio", { name: "Model" }));
    fireEvent.change(screen.getByLabelText("Model 1"), { target: { value: "AK120_DSC" } });
    fireEvent.change(screen.getByLabelText("Birim maliyet 1"), { target: { value: "1.000" } });
    fireEvent.change(screen.getByLabelText("Adet 1"), { target: { value: "60" } });
    expect(screen.getByText(/Dağıtılmayan 40\.000 ₺ ortak gidere yazılır/)).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].modelSatirlari).toEqual([{ modelAd: "AK120_DSC", birimMaliyet: 1000, adet: 60 }]);
  });
  it("AC-9: tanımdan üretilmiş kalem düzenlenirken bilgi gösterilir", () => {
    ac({ kalem: { id: 9, tarih: "2026-09-01", turId: 4, tutar: 1250, kdvOrani: 20, tanimId: 3, donem: "2026-09", odendi: false } });
    expect(screen.getByText(/Tekrarlayan tanımdan oluşturuldu · 2026-09/)).toBeTruthy();
  });
  it("gider_odeme yoksa ödeme durumu değiştirilemez", () => {
    ac({ odemeDegistirebilir: false });
    expect(screen.getByRole("radio", { name: "Ödendi" }).disabled).toBe(true);
  });
});
