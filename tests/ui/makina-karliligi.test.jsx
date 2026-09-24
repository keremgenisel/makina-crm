// @vitest-environment jsdom
// Spec 0002: Giderler › Makina Kârlılığı alt görünümü (R7, R26), fiyat önerisi (R9) ve ortak gider
// kaynağı ayarı (R22). Hesap motorda; burada ekranın gösterdikleri.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { MakinaKarliligi } from "../../src/components/gider/MakinaKarliligi";
import { SettingsGider } from "../../src/components/settings/SettingsGider";
import { hesaplaMakinaMaliyetleri } from "../../src/lib/makinaMaliyeti";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-24T10:00:00")); });

const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }];
const MOD = [{ model: "AK100" }, { model: "AK200" }];
const mus = (id, o = {}) => ({ id, name: `Firma ${id}`, model: "AK100", serialNo: `S${id}`, installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-03-05", ...o });
const hesapla = (o = {}) => hesaplaMakinaMaliyetleri({ customers: [], stock: [], giderler: [], giderTurleri: TUR, standartGiderler: [], standardModels: MOD, customModels: [], giderAyarlari: { yururlukAy: "2026-01" }, ...o }, { bugun: "2026-09-24" });
const ciz = (sonuc, o = {}) => render(<MakinaKarliligi sonuc={sonuc} baslangic="2026-03-01" bitis="2026-03-31" bugun="2026-09-24" modeller={MOD} {...o} />);

describe("Makina Kârlılığı alt görünümü", () => {
  it("AC-69: Giderler sekmesinde 'Makina Kârlılığı' alt görünümü var ve açılınca özet çizilir", () => {
    const customers = [mus(1)];
    render(<Giderler giderler={[{ id: 1, tarih: "2026-03-10", turId: 1, tutar: 100000, kdvOrani: 20 }]} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
      giderTurleri={TUR} tedarikciler={[]} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]}
      stock={[]} customers={customers} standardModels={MOD} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }}
      satisVerisi={{ customers, services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()}
      makinaMaliyet={hesapla({ customers })} />);
    fireEvent.click(screen.getByText("Makina Kârlılığı"));
    expect(screen.getByTestId("makina-karliligi")).toBeTruthy();
  });
  it("triyaj bulgu 4: Giderler kendi yedek hesabını yapmaz; App sonucu gelmezse görünüm çizilmez", () => {
    render(<Giderler giderler={[]} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TUR} tedarikciler={[]} setTedarikciler={vi.fn()}
      standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]} stock={[]} customers={[mus(1)]} standardModels={MOD} customModels={[]}
      appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Makina Kârlılığı"));
    expect(screen.queryByTestId("makina-karliligi")).toBeNull();
  });
  it("triyaj bulgu 4: model özet satırları React key uyarısı üretmez", () => {
    const hata = vi.spyOn(console, "error").mockImplementation(() => {});
    ciz(hesapla({ customers: [mus(1), mus(2, { model: "AK200" })], giderler: [{ id: 1, tarih: "2026-03-01", turId: 1, tutar: 20000, atamaTur: "model",
      modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 10 }, { modelAd: "AK200", birimMaliyet: 1000, adet: 10 }] }] }));
    expect(screen.getByTestId("ozet-modeller").children.length).toBe(2);
    expect(hata.mock.calls.some(c => String(c[0]).includes("unique \"key\""))).toBe(false);
    hata.mockRestore();
  });
  it("AC-3 / AC-58 (ekran): kâr, marj %81,0 ve iki ondalık çarpan satırda", () => {
    ciz(hesapla({ customers: [1, 2, 3, 4, 5].map(i => mus(i, { komisyon: i === 1 ? 15000 : 0 })), giderler: [
      { id: 1, tarih: "2026-03-15", turId: 1, tutar: 300000 }, { id: 2, tarih: "2026-03-15", turId: 1, tutar: 20000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 }] }));
    const r = screen.getByText("Firma 1").closest("tr");
    expect(within(r).getByText("405.000 ₺")).toBeTruthy();
    expect(within(r).getByText("%81,0")).toBeTruthy();
    expect(within(r).getByText("5,26")).toBeTruthy();
  });
  it("AC-4 (ekran): zarar eden makina 'Zarar' etiketiyle, eksi işareti yerine", () => {
    ciz(hesapla({ customers: [mus(1, { fabrikaSatisBedeli: 50000 })], giderler: [{ id: 1, tarih: "2026-03-15", turId: 1, tutar: 80000 }] }));
    expect(within(screen.getByText("Firma 1").closest("tr")).getByText("Zarar 30.000 ₺")).toBeTruthy();
  });
  it("AC-9 (ekran): toplam satırı makina kârlarının toplamı", () => {
    ciz(hesapla({ customers: [mus(1), mus(2, { fabrikaSatisBedeli: 300000 })], giderler: [{ id: 1, tarih: "2026-03-15", turId: 1, tutar: 100000 }] }));
    expect(within(screen.getByTestId("karlilik-toplam")).getByText("700.000 ₺")).toBeTruthy();
  });
  it("AC-8 (ekran): satır tıklanınca kırılım açılır (doğrudan, ortak pay, komisyon, satış bedeli)", () => {
    ciz(hesapla({ customers: [mus(1, { komisyon: 15000 })], giderler: [{ id: 1, tarih: "2026-03-15", turId: 1, tutar: 60000 }] }));
    fireEvent.click(screen.getByText("Firma 1").closest("tr"));
    const d = screen.getByTestId("maliyet-detay");
    for (const t of ["Doğrudan giderler", "Ortak gider payı", "Komisyon", "Satış bedeli", "Toplam maliyet"]) expect(within(d).getByText(t)).toBeTruthy();
    expect(within(d).getByText("75.000 ₺")).toBeTruthy();
  });
  it("AC-7 / AC-36: parça hariç notu ve kullanılan kaynak yazar", () => {
    ciz(hesapla({ customers: [mus(1)], giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: "standart" } }));
    const n = screen.getAllByTestId("maliyet-notlari")[0].textContent;
    expect(n).toMatch(/Stoktan çekilen parçaların maliyeti hariç/);
    expect(n).toMatch(/Aylık standart genel giderler/);
  });
  it("AC-14 (ekran): kursuz USD satış 'Yaklaşık' işaretli; USD ve TL birlikte (AC-53)", () => {
    ciz(hesapla({ customers: [mus(1, { currency: "USD", fabrikaSatisBedeli: 10000 })] }), { rates: { usd: 40 } });
    const r = screen.getByText("Firma 1").closest("tr");
    expect(within(r).getByText("Yaklaşık")).toBeTruthy();
    expect(within(r).getAllByText("400.000 ₺").length).toBeGreaterThan(0);
    expect(r.textContent).toMatch(/\$|USD/);
  });
  it("AC-20: satış olmayan dönemde boş durum", () => {
    ciz(hesapla({ customers: [mus(1, { installDate: "2026-06-01" })] }));
    expect(screen.getByTestId("karlilik-bos")).toBeTruthy();
  });
  it("AC-73 / AC-74: bedelsiz makinalar ve stokta bekleyen maliyet ayrı satırlarda; stok başlığında bitiş tarihi", () => {
    ciz(hesapla({ customers: [mus(1, { fabrikaSatisBedeli: "" }), mus(2)], stock: [{ id: 9, model: "AK100", addedDate: "2026-03-02" }], giderler: [{ id: 1, tarih: "2026-03-15", turId: 1, tutar: 30000 }] }));
    expect(screen.getByTestId("ozet-bedelsiz").textContent).toMatch(/1 makina · 10\.000 ₺/);
    expect(screen.getByTestId("ozet-stokta").textContent).toMatch(/31\.03\.2026|31\/03\/2026/);
    expect(screen.getByTestId("ozet-stokta").textContent).toMatch(/10\.000 ₺/);
  });
  it("AC-11 / AC-66: dağıtılmamış ortak gider tam ayda rakam, ayı kesen aralıkta açıklama", () => {
    const s = hesapla({ customers: [mus(1)], giderler: [{ id: 1, tarih: "2026-04-10", turId: 1, tutar: 5000 }] });
    const { unmount } = ciz(s, { baslangic: "2026-04-01", bitis: "2026-04-30" });
    expect(screen.getByTestId("ozet-dagitilmamis").textContent).toMatch(/5\.000 ₺/);
    unmount();
    ciz(s, { baslangic: "2026-04-05", bitis: "2026-04-30" });
    expect(screen.getByTestId("ozet-dagitilmamis").textContent).toMatch(/Hesaplanamadı/);
    expect(screen.getByTestId("ozet-dagitilmamis").textContent).toMatch(/ortadan kesiyor/);
  });
  it("AC-37 (ekran): standart kaynakta fark satırı görünür, gerçekleşende yok", () => {
    const g = [{ id: 1, tarih: "2026-03-15", turId: 1, tutar: 300000 }];
    const std = [{ id: 1, grupId: 1, ad: "Kira", tutar: 100000, baslangicAy: "2026-01" }];
    const { unmount } = ciz(hesapla({ customers: [mus(1)], giderler: g, standartGiderler: std, giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: "standart" } }));
    expect(screen.getByTestId("ozet-standart-fark").textContent).toMatch(/200\.000 ₺/);
    unmount();
    ciz(hesapla({ customers: [mus(1)], giderler: g, standartGiderler: std }));
    expect(screen.queryByTestId("ozet-standart-fark")).toBeNull();
  });
  it("AC-51 (ekran): malzeme payı alamamış makina sayısı model bazında", () => {
    const customers = Array.from({ length: 3 }, (_, i) => mus(i + 1));
    ciz(hesapla({ customers, giderler: [{ id: 1, tarih: "2026-03-01", turId: 1, tutar: 2000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 2 }] }] }));
    expect(screen.getByTestId("ozet-modeller").textContent).toMatch(/Malzeme payı alamamış makina sayısı: 1/);
  });
});

describe("Fiyat önerisi (R9)", () => {
  const sonuc = () => hesapla({ customers: [mus(1, { uretimTarihi: "2026-03-05" }), mus(2, { uretimTarihi: "2026-04-05" })],
    giderler: [{ id: 1, tarih: "2026-03-10", turId: 1, tutar: 70000 }, { id: 2, tarih: "2026-04-10", turId: 1, tutar: 90000 }] });
  const sec = () => { fireEvent.change(screen.getByLabelText("Model"), { target: { value: "AK100" } }); };
  it("AC-15 / AC-17 / AC-19 / AC-59: marj %25 → 106.667; yöntem ve son 12 ay dönemi yazar", () => {
    ciz(sonuc());
    sec();
    fireEvent.change(screen.getByLabelText("Hedef değer"), { target: { value: "25" } });
    const s = screen.getByTestId("oneri-sonuc").textContent;
    expect(s).toMatch(/Yöntem: Satış bedeli üzerinden marj/);
    expect(s).toMatch(/01\.10\.2025|01\/10\/2025/);
    expect(s).toMatch(/30\.09\.2026|30\/09\/2026/);
    expect(s).toMatch(/80\.000 ₺/);
    expect(s).toMatch(/Önerilen fiyat: 106\.667 ₺/);
  });
  it("AC-16 / AC-39: kâr ekleme %25 → 100.000; kat 2,2 → 176.000", () => {
    ciz(sonuc());
    sec();
    fireEvent.click(screen.getByText("Maliyetin üstüne kâr ekleme"));
    fireEvent.change(screen.getByLabelText("Hedef değer"), { target: { value: "25" } });
    expect(screen.getByTestId("oneri-sonuc").textContent).toMatch(/Önerilen fiyat: 100\.000 ₺/);
    fireEvent.click(screen.getByText("Maliyetin katı"));
    fireEvent.change(screen.getByLabelText("Hedef değer"), { target: { value: "2,2" } });
    expect(screen.getByTestId("oneri-sonuc").textContent).toMatch(/Önerilen fiyat: 176\.000 ₺/);
  });
  it("AC-18 / AC-61 / AC-62: geçersiz aralıklar bildirilir; kat < 1 uyarıyla yine önerilir", () => {
    ciz(sonuc());
    sec();
    fireEvent.change(screen.getByLabelText("Hedef değer"), { target: { value: "100" } });
    expect(screen.getByTestId("oneri-sonuc").textContent).toMatch(/yüzden küçük olmalı/);
    expect(screen.getByTestId("oneri-sonuc").textContent).not.toMatch(/Önerilen fiyat/);
    fireEvent.click(screen.getByText("Maliyetin üstüne kâr ekleme"));
    fireEvent.change(screen.getByLabelText("Hedef değer"), { target: { value: "-5" } });
    expect(screen.getByTestId("oneri-sonuc").textContent).toMatch(/sıfır veya daha büyük/);
    fireEvent.click(screen.getByText("Maliyetin katı"));
    fireEvent.change(screen.getByLabelText("Hedef değer"), { target: { value: "0,8" } });
    expect(screen.getByTestId("oneri-sonuc").textContent).toMatch(/zararına satış/);
    expect(screen.getByTestId("oneri-sonuc").textContent).toMatch(/Önerilen fiyat: 64\.000 ₺/);
  });
  it("AC-60: modelden dönemde üretim yoksa neden yazılır", () => {
    ciz(sonuc());
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "AK200" } });
    expect(screen.getByTestId("oneri-sonuc").textContent).toMatch(/üretilmiş makina yok/);
  });
});

describe("Ortak gider kaynağı ayarı (R22, C4-3)", () => {
  function Harness({ onState }) {
    const [appSettings, setAppSettings] = useState({ giderAyarlari: { yururlukAy: "2026-01", stopajOrani: 20 } });
    onState(appSettings);
    return <SettingsGider appSettings={appSettings} setAppSettings={setAppSettings} />;
  }
  it("AC-36 / C4-3: kaynak giderAyarlari'na yazılır; herkesi etkilediği yazar", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    expect(screen.getByText(/bütün kullanıcıların gördüğü maliyet ve kâr rakamı değişir/)).toBeTruthy();
    fireEvent.click(screen.getByText("Aylık standart genel giderler"));
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.giderAyarlari).toMatchObject({ ortakGiderKaynagi: "standart", yururlukAy: "2026-01", stopajOrani: 20 });
  });
});
