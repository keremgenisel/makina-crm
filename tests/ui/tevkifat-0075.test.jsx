// @vitest-environment jsdom
// Spec 0075: tevkifatlı fatura girişi, arayüz. Gider formu (kutu kapalı/açık, oran, özet, notlar, vade etiketi, tevkifat
// bölümü, satırdan geri kurma), ödeme penceresinde iki hedef ve çek nedeni, kalem listesi ibaresi, tanım formu ve listesi.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { OdemeKayitPenceresi } from "../../src/components/gider/OdemeKayitPenceresi";
import { TEVKIFAT_AYRI_KALEM_NOTU, TEVKIFAT_KDV_DAHIL_NOTU, TEVKIFAT_ALT_SINIR_NOTU } from "../../src/components/gider/GiderAlanlari";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, DAVRANIS, HEDEF, TEVKIFAT_ALANLARI } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Nakliye", davranis: "normal" },
  { id: 5, ad: "SGK", davranis: "sgk" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Yıldız Nakliyat" }];
let m = 7600;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++m }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const TVK = k({ id: 80, tarih: "2026-09-10", turId: 4, tutar: "20000", kdvOrani: "20", tedarikciId: 11, sonOdemeTarihi: "2026-09-30", aciklama: "Eylül nakliye",
  tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, tevkifatTaksitSayisi: "2", tevkifatVade: "2026-10-26" });

const formAc = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} giderAyarlari={{}} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });
const tutarGir = (v = "20000") => fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: v } });
const kutu = () => screen.getByRole("checkbox", { name: "Bu fatura tevkifatlı" });
const oran = (v) => fireEvent.change(screen.getByLabelText("Tevkifat oranı"), { target: { value: v } });

describe("Spec 0075 A, C: gider formu", () => {
  it("AC-1, AC-2: kutu varsayılan kapalı; kapalıyken tevkifat alanları, özet ve bölüm çizilmez, normal özet aynen", () => {
    formAc();
    tur(4); tutarGir();
    expect(kutu().checked).toBe(false);
    for (const id of ["tevkifat-ozet", "tevkifat-bolumu"]) expect(screen.queryByTestId(id)).toBeNull();
    expect(screen.queryByLabelText("Tevkifat oranı")).toBeNull();
    expect(screen.getByTestId("normal-ozet")).toBeTruthy();
    expect(screen.queryByText(TEVKIFAT_ALT_SINIR_NOTU)).toBeNull();
  });
  it("AC-3, AC-4, AC-43: kutu açılınca oran seçici (altı kesir, işlem adı yok), taksit, vade ve özet görünür", () => {
    formAc();
    tur(4); tutarGir();
    fireEvent.click(kutu());
    const secenekler = [...screen.getByLabelText("Tevkifat oranı").querySelectorAll("option")].map(o => o.textContent);
    expect(secenekler).toEqual(["Faturadaki oranı seçin", "2/10", "3/10", "4/10", "5/10", "7/10", "9/10"]);
    expect(screen.getByLabelText("Tevkifat taksit sayısı")).toBeTruthy();
    expect(screen.getByLabelText("Tevkifat vadesi")).toBeTruthy();
    expect(screen.getByTestId("tevkifat-ozet")).toBeTruthy();
  });
  it("AC-14, AC-41: özet altı satırı motorun kaydedeceği değerlerle gösterir; kira kutusunun yerinde, normal özet yerine", () => {
    const onSave = formAc();
    tur(4); tutarGir();
    fireEvent.click(kutu()); oran("5/10");
    const o = screen.getByTestId("tevkifat-ozet");
    const v = (id) => within(o).getByTestId(id).textContent;
    expect([v("ozet-matrah"), v("ozet-toplam-kdv"), v("ozet-tevkifat"), v("ozet-kalan-kdv"), v("ozet-tedarikciye"), v("ozet-vergi-dairesine")])
      .toEqual(["20.000 ₺", "4.000 ₺", "− 2.000 ₺", "2.000 ₺", "22.000 ₺", "2.000 ₺"]);
    expect(screen.queryByTestId("normal-ozet")).toBeNull();
    expect(o.parentElement.contains(screen.getByLabelText("Tutar"))).toBe(true); // aynı satır kabı (sağ sütun)
    fireEvent.click(screen.getByText("Kaydet"));
    const kayit = onSave.mock.calls[0][0];
    expect(kayit).toMatchObject({ tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, tutar: 20000 });
    expect(kayit.taksitler.map(r => [r.hedef, r.tutar])).toEqual([["ana", 22000], ["tevkifat", 2000]]);
  });
  it("AC-15: üç bilgi notu kutu açıkken yazılı ve her biri tek sabitten", () => {
    formAc();
    tur(4); tutarGir();
    fireEvent.click(kutu());
    for (const not of [TEVKIFAT_AYRI_KALEM_NOTU, TEVKIFAT_KDV_DAHIL_NOTU, TEVKIFAT_ALT_SINIR_NOTU]) expect(screen.getByText(not)).toBeTruthy();
  });
  it("AC-16: alt sınırın altındaki tutar (1.000 TL) engellenmez, uyarı üretilmez", () => {
    const onSave = formAc();
    tur(4); tutarGir("1000");
    fireEvent.click(kutu()); oran("2/10");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole("alert").filter(a => a.textContent)).toEqual([]);
  });
  it("AC-5: kutu kapatılınca oran, taksit ve vade temizlenir ve kayda yazılmaz", () => {
    const onSave = formAc();
    tur(4); tutarGir();
    fireEvent.click(kutu()); oran("5/10");
    fireEvent.change(screen.getByLabelText("Tevkifat taksit sayısı"), { target: { value: "2" } });
    fireEvent.click(kutu());
    fireEvent.click(kutu());
    expect(screen.getByLabelText("Tevkifat oranı").value).toBe("");
    expect(screen.getByLabelText("Tevkifat taksit sayısı").value).toBe("1");
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kaydet"));
    const kayit = onSave.mock.calls[0][0];
    for (const a of [...TEVKIFAT_ALANLARI, "tevkifatTaksitSayisi", "tevkifatVade"]) expect(a in kayit, a).toBe(false);
  });
  it("AC-10: kira, personel ve SGK türünde kutu yok", () => {
    formAc();
    for (const id of [1, 3, 5]) { tur(id); expect(screen.queryByRole("checkbox", { name: "Bu fatura tevkifatlı" }), String(id)).toBeNull(); }
  });
  it("AC-11, AC-12: oran seçilmeden ya da KDV sıfırken kayıt reddedilir; neden ilgili alanın altında", () => {
    const onSave = formAc();
    tur(4); tutarGir();
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText("Tevkifat oranı seçilmedi.")).toBeTruthy();
    oran("5/10");
    fireEvent.change(screen.getByLabelText("KDV oranı"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(/KDV'si olmayan faturada tevkifat olmaz/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
  it("AC-42: tevkifatlı kalemde ana vade 'Tedarikçiye son ödeme', tevkifatın kendi vade alanı ayrı", () => {
    formAc();
    tur(4); tutarGir();
    expect(screen.getByLabelText("Son ödeme tarihi")).toBeTruthy();
    fireEvent.click(kutu()); oran("5/10");
    expect(screen.getByText("Tedarikçiye son ödeme")).toBeTruthy();
    expect(screen.getByText("Tevkifat vadesi")).toBeTruthy();
  });
  it("AC-45: kaydedilip yeniden açılan kalemde tevkifat taksit sayısı ve vadesi satırlardan geri kurulur", () => {
    formAc({ kalem: TVK });
    expect(kutu().checked).toBe(true);
    expect(screen.getByLabelText("Tevkifat oranı").value).toBe("5/10");
    expect(screen.getByLabelText("Tevkifat taksit sayısı").value).toBe("2");
    expect(screen.getByLabelText("Tevkifat vadesi").value).toBe("2026-10-26");
  });
  it("AC-17: yeni kalemin ödeme bölümünde iki hedef (tedarikçi ve vergi dairesi tevkifatı)", () => {
    formAc();
    tur(4); tutarGir();
    fireEvent.click(kutu()); oran("5/10");
    const odeme = screen.getByTestId("odeme-girisi");
    expect(odeme.textContent).toMatch(/Tedarikçiye/);
    expect(odeme.textContent).toMatch(/Vergi dairesine \(KDV tevkifatı\)/);
  });
});

describe("Spec 0075 D: ödeme penceresi", () => {
  it("AC-21, AC-22: tevkifat hedefi sıradan ödeme penceresinde ayrı ödenir; çek yöntemleri o hedefte sunulmaz", () => {
    const z = odemeleriUygula([TVK], [], turMap)[0];
    const cek = { id: 5, yon: "alinan", no: "1", banka: "Ziraat", durum: "portfoy", tutar: 1000, currency: "TRY", tarih: "2026-09-01", gecmis: [] };
    render(<OdemeKayitPenceresi kalem={z} hedef={{ hedef: HEDEF.TEVKIFAT }} davranis={DAVRANIS.NORMAL} turAd="Nakliye" turMap={turMap} hareketler={[]} hesaplar={[]} odemeYetkisi ciroYetkisi
      cekler={[cek]} bugun="2026-10-07" giderler={[z]} yururlukAy="2026-01" onKaydet={vi.fn()} onSil={vi.fn()} onClose={vi.fn()} />);
    const g = screen.getByTestId("odeme-girisi");
    expect(g.textContent).toMatch(/Vergi dairesine \(KDV tevkifatı\) 1\/2\. taksit/);
    const yontemler = [...g.querySelectorAll("option")].map(o => o.textContent);
    expect(yontemler).toContain("Nakit");
    expect(yontemler.some(t => /Çek \((ciro|kendi)\)/.test(t))).toBe(false);
  });
});

describe("Spec 0075: kalem listesi ve tanım", () => {
  function GH({ g0 = [TVK] }) {
    const [giderler, setGiderler] = useState(g0);
    const [hesapHareketleri, setHesapHareketleri] = useState([]);
    return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
      giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]}
      appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} kasaHesaplari={[]} kasaYetki aktifKullanici="kerem" baslangicAy="2026-09"
      satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
  }
  it("R41 (S8), AC-23: tevkifatlı satırın Ödenecek hücresi tedarikçi kısmı + 'tevkifat hariç'; borç kutusunda Vergi dairesi satırı", () => {
    render(<GH />);
    const ib = screen.getByTestId("tevkifat-haric");
    expect(ib.closest("td").textContent).toMatch(/22\.000 ₺/);
    expect(screen.getAllByText("Vergi dairesi").length).toBeGreaterThan(0);
    // Triyaj: rozet satırın içeriğini söyler (eskiden sabit "Kira stopajı").
    expect(screen.getByText("KDV tevkifatı")).toBeTruthy();
    expect(screen.queryByText("Kira stopajı")).toBeNull();
  });
  it("AC-23 (triyaj, TY kararı): stopaj ve tevkifat birlikteyse tek 'Vergi dairesi' satırında iki ayrı rozet", () => {
    const kira = k({ id: 81, tarih: "2026-09-10", turId: 1, tutar: "10000", kdvOrani: "0", stopajOrani: "20", tedarikciId: 11, sonOdemeTarihi: "2026-09-30" });
    render(<GH g0={[TVK, kira]} />);
    const r1 = screen.getByText("Kira stopajı"), r2 = screen.getByText("KDV tevkifatı");
    const satir = (el) => el.closest("div[style]")?.parentElement;
    expect(satir(r1)).toBe(satir(r2));
    expect(screen.queryByText(/Stopaj ve KDV tevkifatı/)).toBeNull();
  });
  it("AC-28, R43 (S12): tanım formunda kutu ve oran; kayıt tevkifatı taşır, listede 'Tevkifat 5/10'; taksit ve vade alanı yok", () => {
    const set = vi.fn();
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={set} giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Tanım adı *"), { target: { value: "Nakliye" } });
    fireEvent.click(kutu()); oran("2/10");
    expect(screen.queryByLabelText("Tevkifat taksit sayısı")).toBeNull();
    expect(screen.queryByLabelText("Tevkifat vadesi")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    const t = set.mock.calls[0][0]([])[0];
    expect(t).toMatchObject({ turId: 4, tevkifatli: true, tevkifatPay: 2, tevkifatPayda: 10 });
    cleanup();
    render(<SettingsGiderTanimlari giderTanimlari={[{ ...t, tutar: 1000, kdvOrani: 20 }]} setGiderTanimlari={vi.fn()} giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} showToast={vi.fn()} />);
    expect(screen.getByTestId("tanim-tevkifat").textContent).toBe("Tevkifat 2/10");
  });
  it("AC-28: tanımda kutu kapalıysa alanlar hiç yazılmaz", () => {
    const set = vi.fn();
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={set} giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Tanım adı *"), { target: { value: "Elektrik" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const t = set.mock.calls[0][0]([])[0];
    for (const a of TEVKIFAT_ALANLARI) expect(a in t, a).toBe(false);
  });
});
