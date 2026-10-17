// @vitest-environment jsdom
// Spec 0001: gider kalemi formu (GiderForm) davranışları.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { GiderForm } from "../../src/components/GiderForm";
import { ODEME_SECENEKLERI } from "../../src/components/gider/GiderAlanlari";

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
    expect(screen.getByLabelText("Resmi işveren maliyeti").value).toBe("30.000"); // spec 0045 R1: görünüm binlik noktalı
    expect(screen.getByLabelText("Elden ödenen").value).toBe("20.000"); // spec 0045 R1: görünüm binlik noktalı
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
    expect(screen.getByLabelText("Elden ödenen").value).toBe("20.000"); // spec 0045 R1: görünüm binlik noktalı
  });
  it("AC-57 / AC-60 / AC-64: SGK notu görünür; KDV ve tedarikçi alanı yok", () => {
    ac();
    tur(3);
    // Spec 0074 R24 ile güncellendi: not SGK'nın bu kaleme girmediğini, SGK türünde ayrı kalemle girildiğini söyler.
    expect(screen.getByText(/SGK bu kaleme girmez/)).toBeTruthy();
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
  it("triyaj bulgu 10: net girilmiş kira kalemi düzenlemede net ve brüt değerleriyle açılır, değişmeden kaydedilir", () => {
    const onSave = ac({ kalem: { id: 7, tarih: "2026-09-01", turId: 1, girisYonu: "net", tutar: 20000, netTutar: 16000, stopajOrani: 20, kdvOrani: 0, odendi: false, modelSatirlari: [] } });
    expect(screen.getByLabelText("Net ödenen kira").value).toBe("16.000"); // spec 0045 R1: görünüm binlik noktalı
    fireEvent.click(screen.getByRole("radio", { name: "Brüt kira" }));
    expect(screen.getByLabelText("Brüt kira").value).toBe("20.000"); // spec 0045 R1: görünüm binlik noktalı
    fireEvent.click(screen.getByRole("radio", { name: "Net ödenen kira" }));
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: 7, girisYonu: "net", tutar: 20000, netTutar: 16000 });
  });
  // Spec 0090 R1 ile ters çevrildi: atama bölümü hiçbir davranışta çizilmez.
  it("AC-78 (spec 0090 ile): kira, personel ve normalde atama bölümü çizilmez", () => {
    ac();
    for (const id of [1, 3, 4]) { tur(id); expect(screen.queryByText("Makina maliyeti ataması")).toBeNull(); }
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
  // Spec 0053 R1, R4 (AC-1, AC-5): kalem düzeyinde yöntem alanı yok; vade etiketi yöntemden türemez, her zaman "Son ödeme tarihi".
  it("AC-1 / AC-5: kalemde ödeme yöntemi alanı yok; vade etiketi her zaman 'Son ödeme tarihi', 'Çek vade tarihi' hiç yazmaz", () => {
    ac({ kalem: { id: 5, tarih: "2026-09-01", turId: 4, tutar: 1000, kdvOrani: 20, odemeYontemi: "Çek", sonOdemeTarihi: "2026-10-15" } });
    expect(screen.queryByLabelText("Varsayılan ödeme yöntemi")).toBeNull();
    expect(screen.queryByText("Varsayılan ödeme yöntemi")).toBeNull();
    expect(screen.getByText("Son ödeme tarihi").parentElement.querySelector("input").value).toBe("2026-10-15");
    expect(screen.queryByText(/Çek vade tarihi/)).toBeNull();
  });
  it("AC-71: vade gider tarihinden önceyse kayıt yapılmaz ve neden yazılır (spec 0053 R31: 'Son ödeme tarihi')", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100" } });
    fireEvent.change(screen.getByText("Son ödeme tarihi").parentElement.querySelector("input"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Son ödeme tarihi gider tarihinden önce olamaz.")).toBeTruthy();
  });
});

describe("GiderForm: atama (spec 0090 ile alan kalktı)", () => {
  // Spec 0090 R1, R3 ile ters çevrildi (eski AC-76/77/79/87/88/90/90b): atama ve model satırı alanı yok; yeni kalem atama
  // anahtarı taşımaz, eski kalemin ataması düzenlemede birebir korunur.
  it("AC-76…90b (spec 0090 ile): formda atama denetimi yok, yeni kalem atama anahtarı yazmaz", () => {
    const onSave = ac();
    tur(4);
    expect(screen.queryByRole("radio", { name: "Model" })).toBeNull();
    expect(screen.queryByLabelText("Model 1")).toBeNull();
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const k = onSave.mock.calls[0][0];
    for (const a of ["atamaTur", "makinaTur", "makinaId", "dagitimAy"]) expect(k).not.toHaveProperty(a);
  });
  it("R3 (spec 0090): eski kalemin model ataması düzenlemede birebir korunur", () => {
    const satir = [{ modelAd: "AK120_DSC", birimMaliyet: 1000, adet: 60 }];
    const onSave = ac({ kalem: { id: 8, tarih: "2026-09-01", turId: 4, tutar: 100000, kdvOrani: 20, atamaTur: "model", modelSatirlari: satir } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ atamaTur: "model", modelSatirlari: satir });
  });
  it("AC-9: tanımdan üretilmiş kalem düzenlenirken bilgi gösterilir", () => {
    ac({ kalem: { id: 9, tarih: "2026-09-01", turId: 4, tutar: 1250, kdvOrani: 20, tanimId: 3, donem: "2026-09", odendi: false } });
    expect(screen.getByText(/Tekrarlayan tanımdan oluşturuldu · 2026-09/)).toBeTruthy();
  });
  // Spec 0024 R3/R17 (Q2, onaylı istisna): formda ödeme durumu düğmesi yok; yeni kalemde "ödendi olarak kaydet" ayrı
  // bir ödeme hareketi talebidir, mevcut kalemde durum hareketlerden türetilip yalnız gösterilir.
  it("gider_odeme yoksa 'ödendi olarak kaydet' seçeneği yok", () => {
    ac({ odemeDegistirebilir: false });
    expect(screen.queryByLabelText("Kaydederken ödendi olarak kaydet")).toBeNull();
    expect(screen.queryByRole("radio", { name: "Ödendi" })).toBeNull();
  });
  it("R17 (spec 0046 ile güncellendi): ödeme satırı kayda durum yazmaz, onSave'e hedef bazlı ödeme planı (tarih, hesap) verir", () => {
    const H = [{ id: 1, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY" }, { id: 2, ad: "Dolar", tur: "banka", paraBirimi: "USD" }];
    const onSave = ac({ hesaplar: H, hesapSecimi: true });
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1.000" } });
    fireEvent.click(screen.getByLabelText("Tedarikçiye ödendi"));
    const hesap = screen.getByLabelText("Tedarikçiye hesabı");
    expect([...hesap.querySelectorAll("option")].map(o => o.textContent)).toEqual(["Hesap belirtilmedi", "Merkez Kasa (Kasa)"]);
    fireEvent.change(hesap, { target: { value: "1" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const [kayit, plan] = onSave.mock.calls[0];
    expect(kayit).toMatchObject({ odendi: false, odemeTarihi: null });
    // Spec 0053: plan satır listesidir (hedef + taksit sırası); tutar ham metin.
    expect(plan).toMatchObject({ tarih: "2026-09-23", kip: "odeme", satirlar: [expect.objectContaining({ hedef: "ana", tutar: "1200", hesapId: 1, yontem: "" })], silinenler: [] });
  });
  // Spec 0053 R1, R10: yöntem yalnız ödeme satırında; satırın listesi beş seçenek, kasa yetkisi yokken çek yöntemleri yok.
  it("Spec 0042 AC-16 / AC-28 + 0053 AC-34: satırın yöntemi açılır listedir; beş seçenek, 'Elden' ve çek yöntemleri yok", () => {
    ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1.000" } });
    fireEvent.click(screen.getByLabelText("Tedarikçiye ödendi"));
    const sec = screen.getByLabelText("Tedarikçiye ödeme yöntemi");
    expect(sec.tagName).toBe("SELECT");
    expect([...sec.querySelectorAll("option")].map(o => o.value)).toEqual(ODEME_SECENEKLERI.map(o => o.value));
    expect([...sec.querySelectorAll("option")].map(o => o.textContent)).not.toContain("Elden");
    expect([...sec.querySelectorAll("option")].map(o => o.value)).not.toContain("Çek (ciro)");
    expect(ODEME_SECENEKLERI).toHaveLength(5);
  });
  it("Spec 0042 AC-23: personelde resmi ve elden varken 'Elden vadesi' alanı çıkar, taksit yalnız resmiye uygulanır", () => {
    ac();
    tur(3);
    expect(screen.queryByLabelText("Elden vadesi")).toBeNull();
    fireEvent.change(screen.getByLabelText("Resmi işveren maliyeti"), { target: { value: "30.000" } });
    fireEvent.change(screen.getByLabelText("Elden ödenen"), { target: { value: "20.000" } });
    expect(screen.getByLabelText("Elden vadesi")).toBeTruthy();
    expect(screen.getByText("Yalnız resmi kısma uygulanır.")).toBeTruthy();
    expect(screen.getByText("Boşsa resmi vadesi kullanılır. Elden kısım taksitlendirilmez.")).toBeTruthy();
  });
  // Spec 0053 R2, R3, R23 (AC-3, AC-4, AC-38): yeni satırın yöntemi son kullanılan ödemeden; kalemin alanı yeni kayıtta boş kalır.
  it("AC-3 / AC-38: yeni ödeme satırı son kullanılan yöntemle gelir ve değiştirilebilir; ciro varsayılan olmaz", () => {
    const hareketler = [{ id: 1, tur: "odeme", tarih: "2026-09-01", tutar: 10, yontem: "Nakit" }, { id: 2, tur: "odeme", tarih: "2026-09-05", tutar: 10, yontem: "Çek (ciro)", cekId: 9 }];
    const onSave = ac({ hareketler });
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1.000" } });
    fireEvent.click(screen.getByLabelText("Tedarikçiye ödendi"));
    expect(screen.getByLabelText("Tedarikçiye ödeme yöntemi").value).toBe("Nakit");
    fireEvent.change(screen.getByLabelText("Tedarikçiye ödeme yöntemi"), { target: { value: "Havale" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const [kayit, plan] = onSave.mock.calls[0];
    expect(kayit.odemeYontemi || "").toBe("");
    expect(plan.satirlar[0]).toMatchObject({ yontem: "Havale" });
  });
  it("R17: seçenek işaretlenmezse ödeme talebi yok; mevcut kalemde durum türetilmiş olarak gösterilir", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][1]).toBeNull();
    cleanup();
    ac({ kalem: { id: 9, tarih: "2026-09-01", turId: 4, tutar: 1000, kdvOrani: 20, odendi: false, _odenen: { ana: 50000, stopaj: 0 } } });
    // Spec 0053 R15 (0046 R15'i geri alır): düzenlemede hedef durumu satır satır VE ödeme girişi formda.
    expect(screen.getByTestId("odeme-durumu-turetilen").textContent).toMatch(/Tedarikçiye · 1\.200 ₺Kısmen · kalan 700 ₺/);
    expect(screen.getByLabelText("Tedarikçiye ödendi")).toBeTruthy();
  });
});

// Spec 0084 R7/1, R8 (P8): yeni kira kaleminde stopaj vadesi beyan döneminin ödeme tarihiyle ön dolar; düzenlemede dolmaz.
describe("Spec 0084: stopaj vadesi ön doldurma", () => {
  const stopajSatiri = (kayit) => kayit.taksitler.find(t => t.hedef === "stopaj");
  it("spec 0084 AC-10: yeni kira kaleminde vade ön dolu; tarih değişince yeniden hesaplanır; elle girilen değer korunur ve saklanır", () => {
    const onSave = ac();
    tur(1);
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    // Sistem tarihi 2026-09-23: 3. dönem (Temmuz-Eylül), ödeme 2026-10-26 (varsayılan üç aylık, gün 26).
    expect(screen.getByLabelText("Stopaj vadesi").value).toBe("2026-10-26");
    expect(screen.getByText("Beyan döneminin ödeme tarihi dolduruldu (26/10/2026); gerekirse değiştirin.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tarih *"), { target: { value: "2026-11-05" } });
    expect(screen.getByLabelText("Stopaj vadesi").value).toBe("2027-01-26");
    fireEvent.change(screen.getByLabelText("Stopaj vadesi"), { target: { value: "2027-05-01" } });
    // Başka döneme geçen tarih önerisini değiştirir (2027-04-26); elle girilen değer yine üstündür.
    fireEvent.change(screen.getByLabelText("Tarih *"), { target: { value: "2027-02-01" } });
    expect(screen.getByLabelText("Stopaj vadesi").value).toBe("2027-05-01");
    expect(screen.getByText("Opsiyonel. Girilmezse stopaj borç özetinde görünür, hatırlatıcıya girmez.")).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(stopajSatiri(onSave.mock.calls[0][0]).vade).toBe("2027-05-01");
  });
  it("spec 0084 AC-10: dokunulmadan kaydedilen yeni kalemin stopaj vadesi ön dolu değerdir; ayar aylık ve gün 15 ise ona göre", () => {
    const onSave = ac({ giderAyarlari: { stopajOrani: 20, stopajBeyanDonemi: "aylik", stopajOdemeGunu: 15 } });
    tur(1);
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    expect(screen.getByLabelText("Stopaj vadesi").value).toBe("2026-10-15");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(stopajSatiri(onSave.mock.calls[0][0]).vade).toBe("2026-10-15");
  });
  it("spec 0084 R8: stopaj taksit sayısı 2 ve üstündeyse ön doldurma yapılmaz, ilk vade zorunlu kalır", () => {
    const onSave = ac();
    tur(1);
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    fireEvent.change(screen.getByLabelText("Stopaj taksit sayısı"), { target: { value: "2" } });
    expect(screen.getByLabelText("Stopaj vadesi").value).toBe("");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("İlk stopaj taksitinin vadesi girilmedi.")).toBeTruthy();
  });
  it("spec 0084 AC-11: düzenleme kipinde ön doldurma yok; vadesi boş eski kalem değiştirilmeden kaydedilince vadesi boş kalır; ipucu bugünkü metin (yeni metin yalnız ön dolu değer dururken, revizyon 4)", () => {
    const eski = { id: 77, tarih: "2026-08-05", turId: 1, girisYonu: "brut", tutar: 20000, netTutar: 16000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Ağustos kirası",
      taksitler: [{ id: 901, hedef: "ana", sira: 1, vade: "2026-08-10", tutar: 16000 }, { id: 902, hedef: "stopaj", sira: 1, vade: null, tutar: 4000 }] };
    const onSave = ac({ kalem: eski });
    expect(screen.getByLabelText("Stopaj vadesi").value).toBe("");
    expect(screen.getByText("Opsiyonel. Girilmezse stopaj borç özetinde görünür, hatırlatıcıya girmez.")).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(stopajSatiri(onSave.mock.calls[0][0]).vade).toBeNull();
  });
  it("spec 0084 AC-11: düzenleme kipinde dolu stopaj vadesine dokunulmaz; gider tarihi değişse de kayıttaki değer kalır", () => {
    const eski = { id: 78, tarih: "2026-08-05", turId: 1, girisYonu: "brut", tutar: 20000, netTutar: 16000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Ağustos kirası",
      taksitler: [{ id: 911, hedef: "ana", sira: 1, vade: "2026-08-10", tutar: 16000 }, { id: 912, hedef: "stopaj", sira: 1, vade: "2026-11-20", tutar: 4000 }] };
    const onSave = ac({ kalem: eski });
    expect(screen.getByLabelText("Stopaj vadesi").value).toBe("2026-11-20");
    fireEvent.change(screen.getByLabelText("Tarih *"), { target: { value: "2026-08-06" } });
    expect(screen.getByLabelText("Stopaj vadesi").value).toBe("2026-11-20");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(stopajSatiri(onSave.mock.calls[0][0]).vade).toBe("2026-11-20");
  });
});
