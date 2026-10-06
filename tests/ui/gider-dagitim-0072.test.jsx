// @vitest-environment jsdom
// Spec 0072: peşin ödenen giderin aylara dağıtılması, arayüz. Gider formu ve tanım formu (alan, pasif durum, ipuçları),
// kalem listesi rozeti, maliyet detayı ve notları, Makina ve Model'in yeni kutusu (gerçek Giderler). Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { MakinaMaliyetDetay } from "../../src/components/gider/MakinaMaliyetDetay";
import { MakinaKarliligi } from "../../src/components/gider/MakinaKarliligi";
import { DAGITIM_KUTU_IBARESI } from "../../src/components/gider/MakinaModelGorunumu";
import { hesaplaMakinaMaliyetleri, makinaKarlilik, DAGITIM_NOTU, DAGITIM_STANDART_NOTU } from "../../src/lib/makinaMaliyeti";
import { DAGITIM_MAKINA_NEDENI, DAGITIM_DAGITMA_NEDENI, DAGITIM_MODEL_IPUCU, DAGITIM_TANIM_IPUCU } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-24T10:00:00")); });

const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Genel", davranis: "normal" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 0 }];
const MOD = [{ model: "AK100" }];
const alan = () => screen.getByLabelText("Maliyete dağıtım (ay)");
const formAc = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={[{ id: 11, ad: "Telekom" }]} calisanlar={CAL} modeller={[{ model: "AK100" }]}
    stock={[{ id: 501, model: "AK100", serialNo: "2026-121" }]} customers={[]} giderAyarlari={{ stopajOrani: 20 }} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });
const atama = (ad) => fireEvent.click(screen.getByRole("radio", { name: ad }));

describe("Spec 0072: gider formu", () => {
  it("AC-1 / AC-2: dağıtım ay sayısı girilir, önizleme kalemin ayından başlayan aralığı yazar ve kayda girer", () => {
    const onSave = formAc();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tarih *"), { target: { value: "2026-03-30" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "12000" } });
    fireEvent.change(alan(), { target: { value: "12" } });
    expect(screen.getByTestId("dagitim-onizleme").textContent).toBe("12 aya dağıtılmış · 03.2026 – 02.2027");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ dagitimAy: 12, tutar: 12000 });
  });
  it("AC-1: boş bırakılınca dağıtım yok ve alan kayda yazılmaz", () => {
    const onSave = formAc();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect("dagitimAy" in onSave.mock.calls[0][0]).toBe(false);
  });
  it("AC-6: geçersiz ay sayısı alanın altında tek hata metniyle reddedilir", () => {
    const onSave = formAc();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100" } });
    fireEvent.change(alan(), { target: { value: "61" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    expect(within(screen.getByTestId("dagitim-alani")).getByRole("alert").textContent).toBe("Dağıtım ay sayısı 1 ile 60 arasında tam sayı olmalı.");
  });
  it("AC-22: makina ve 'dağıtılmasın' atamasında alan pasif ve nedeni yazılı", () => {
    formAc();
    tur(4);
    atama("Makina");
    expect(alan().disabled).toBe(true);
    expect(screen.getByTestId("dagitim-pasif-neden").textContent).toBe(DAGITIM_MAKINA_NEDENI);
    atama("Dağıtılmasın");
    expect(alan().disabled).toBe(true);
    expect(screen.getByTestId("dagitim-pasif-neden").textContent).toBe(DAGITIM_DAGITMA_NEDENI);
  });
  it("AC-35: kira ve personel kaleminde alan vardır; modele atanmış kalemde ipucu görünür", () => {
    formAc();
    tur(1);
    expect(alan().disabled).toBe(false);
    tur(3);
    expect(alan().disabled).toBe(false);
    tur(4);
    atama("Model");
    expect(screen.getByTestId("dagitim-model-ipucu").textContent).toBe(DAGITIM_MODEL_IPUCU);
  });
  it("AC-1: düzenlemede kayıtlı dağıtım alanda görünür", () => {
    formAc({ kalem: { id: 9, tarih: "2026-03-30", turId: 4, tutar: 12000, kdvOrani: 20, dagitimAy: 12 } });
    expect(alan().value).toBe("12");
  });
});

describe("Spec 0072: tekrarlayan tanım formu", () => {
  it("AC-5 / AC-21: dağıtımlı tanım kaydedilir ve 'her ay kalem üretir' ipucu görünür", () => {
    const set = vi.fn();
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={set} giderTurleri={TURLER} calisanlar={CAL} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Tanım adı *"), { target: { value: "Yazılım" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1200" } });
    expect(screen.queryByTestId("dagitim-tanim-ipucu")).toBeNull();
    fireEvent.change(alan(), { target: { value: "12" } });
    expect(screen.getByTestId("dagitim-tanim-ipucu").textContent).toBe(DAGITIM_TANIM_IPUCU);
    fireEvent.click(screen.getByText("Kaydet"));
    const kayit = set.mock.calls[0][0]([]);
    expect(kayit[0]).toMatchObject({ ad: "Yazılım", dagitimAy: 12 });
  });
  it("AC-22 / AC-35: tanımda makina atamasında alan pasif; tür kiraya dönünce atama kalkar ve alan etkinleşir", () => {
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TURLER} calisanlar={CAL} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    atama("Makina");
    expect(alan().disabled).toBe(true);
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "1" } });
    expect(alan().disabled).toBe(false);
  });
});

// ── Gerçek Giderler: kalem listesi rozeti ve Makina ve Model kutusu ────────
const INTERNET = { id: 10, tarih: "2026-09-02", turId: 4, tutar: 12000, kdvOrani: 20, aciklama: "İnternet aboneliği", dagitimAy: 12 };
const NORMAL = { id: 11, tarih: "2026-09-05", turId: 4, tutar: 500, kdvOrani: 20, aciklama: "Kırtasiye" };
const hesapla = (giderler, o = {}) => hesaplaMakinaMaliyetleri({ customers: [], stock: [], giderler, giderTurleri: TURLER, standartGiderler: [], standardModels: MOD, customModels: [],
  giderAyarlari: { yururlukAy: "2026-01" }, ...o }, { bugun: "2026-09-24" });
const giderlerAc = (giderler, makinaMaliyet = hesapla(giderler)) => render(<Giderler giderler={giderler} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
  giderTurleri={TURLER} tedarikciler={[]} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} stock={[]} customers={[]}
  standardModels={MOD} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} showToast={vi.fn()} makinaMaliyet={makinaMaliyet}
  satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} />);

describe("Spec 0072: kalem listesi ve Makina ve Model", () => {
  it("AC-15: dağıtılmış kalem rozetle ayırt edilir; rozet kapsam aralığını yazar, tutar tam tutardır", () => {
    giderlerAc([INTERNET, NORMAL]);
    const rozetler = screen.getAllByTestId("dagitim-rozeti");
    expect(rozetler).toHaveLength(1);
    expect(rozetler[0].textContent).toBe("12 aya dağıtılmış · 09.2026 – 08.2027");
    const satir = rozetler[0].closest("tr");
    expect(satir.textContent).toMatch(/12\.000 ₺/);
    expect(satir.textContent).not.toMatch(/(?<!\d)1\.000 ₺/);
  });
  it("AC-18 / AC-30 / AC-38: Makina ve Model'de kova kartları ve cümlesi aynı; yeni kutu ortak gideri paylarla, ibareyle ve tam tutarlı listeyle", () => {
    giderlerAc([INTERNET, NORMAL]);
    fireEvent.click(screen.getByText("Makina ve Model"));
    expect(screen.getByText(/Dört kovanın toplamı = dönem toplamı/).textContent).toMatch(/12\.500 ₺/);
    const kutu = screen.getByTestId("dagitim-kutusu");
    expect(within(kutu).getByTestId("dagitim-kutusu-toplam").textContent).toMatch(/1\.500 ₺/); // 1.000 pay + 500 kırtasiye
    expect(within(kutu).getByText(DAGITIM_KUTU_IBARESI)).toBeTruthy();
    const kalem = within(kutu).getByTestId("dagitim-kutusu-kalem");
    expect(kalem.textContent).toMatch(/İnternet aboneliği/);
    expect(kalem.textContent).toMatch(/12\.000 ₺/);
    expect(kalem.textContent).toMatch(/12 aya dağıtılmış/);
  });
  it("AC-38: dönemde dağıtılmış kalem yoksa kutu çizilmez; standart kaynakta etkisizlik cümlesi", () => {
    giderlerAc([NORMAL]);
    fireEvent.click(screen.getByText("Makina ve Model"));
    expect(screen.queryByTestId("dagitim-kutusu")).toBeNull();
    cleanup();
    giderlerAc([INTERNET], hesapla([INTERNET], { giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: "standart" } }));
    fireEvent.click(screen.getByText("Makina ve Model"));
    expect(within(screen.getByTestId("dagitim-kutusu")).getByText(DAGITIM_STANDART_NOTU)).toBeTruthy();
  });
});

describe("Spec 0072: maliyet detayı ve notlar", () => {
  const mus = { id: 1, name: "Firma", model: "AK100", serialNo: "S1", installDate: "2026-09-10", uretimTarihi: "2026-09-10", currency: "TRY", fabrikaSatisBedeli: 500000 };
  it("AC-16 / AC-17: detay payın aylık paydan geldiğini yazar; not yalnız dağıtım varken", () => {
    render(<MakinaMaliyetDetay detay={makinaKarlilik(hesapla([INTERNET], { customers: [mus] }), "musteri:1")} />);
    expect(screen.getByTestId("dagitim-paylari").textContent).toMatch(/İnternet aboneliği · 12 aya dağıtılmış, aylık 1\.000 ₺/);
    expect(screen.getByTestId("dagitim-notu").textContent).toBe(DAGITIM_NOTU);
    cleanup();
    render(<MakinaMaliyetDetay detay={makinaKarlilik(hesapla([NORMAL], { customers: [mus] }), "musteri:1")} />);
    expect(screen.queryByTestId("dagitim-paylari")).toBeNull();
    expect(screen.queryByTestId("dagitim-notu")).toBeNull();
  });
  it("AC-17: Makina Kârlılığı notları standart kaynakta etkisizlik cümlesini yazar", () => {
    render(<MakinaKarliligi sonuc={hesapla([INTERNET], { customers: [mus], giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: "standart" } })}
      baslangic="2026-09-01" bitis="2026-09-30" bugun="2026-09-24" modeller={MOD} />);
    expect(screen.getByTestId("dagitim-notu").textContent).toBe(DAGITIM_STANDART_NOTU);
  });
  it("AC-31: personel davranışlı dağıtılmış kalemin detay satırı 'Personel gideri' yazar", () => {
    const pers = { id: 12, tarih: "2026-09-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", aciklama: "Hasan Çelik", resmiTutar: 1200, eldenTutar: 0, dagitimAy: 12 };
    render(<MakinaMaliyetDetay detay={makinaKarlilik(hesapla([pers], { customers: [mus] }), "musteri:1")} />);
    expect(screen.getByTestId("dagitim-paylari").textContent).toMatch(/Personel gideri · 12 aya dağıtılmış/);
    expect(screen.getByTestId("maliyet-detay").textContent).not.toMatch(/Hasan/);
  });
});
