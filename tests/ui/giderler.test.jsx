// @vitest-environment jsdom
// Spec 0001: Giderler sekmesi (dönem raporu, kalem listesi, üretim, boş durumlar, gizlilik).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [
  { id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" },
  { id: 4, ad: "Elektrik", davranis: "normal" }, { id: 5, ad: "Hammadde", davranis: "normal" },
];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Bölge Elektrik" }];
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, eldenMaliyet: 20000 }, { id: 22, ad: "Zeynep Arslan" }];

function Harness({ g0 = [], t0 = [], s0 = [], ayar = { giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20 } }, perms = null, onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [giderTanimlari, setGiderTanimlari] = useState(t0);
  const [tedarikciler, setTedarikciler] = useState(TED);
  const [standartGiderler, setStandartGiderler] = useState(s0);
  onState?.({ giderler, giderTanimlari, tedarikciler, standartGiderler });
  return <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari}
    giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler}
    calisanlar={CAL} standardModels={[{ model: "AK120_DSC" }]} customModels={[]} appSettings={ayar} serverPermissions={perms}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const k = (o) => ({ id: Math.floor(Math.random() * 1e9), tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 20, odendi: false, ...o });

describe("Giderler sekmesi: dönem raporu", () => {
  it("AC-1 / AC-3: form ile kaydedilen kalem o ayın raporunda; 10.000 + %20 → KDV 2.000, ödenecek 12.000", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    fireEvent.click(screen.getAllByText("Yeni Gider")[0]);
    fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "10.000" } });
    expect(within(screen.getByTestId("normal-ozet")).getByText("12.000 ₺")).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.giderler).toHaveLength(1);
    expect(st.giderler[0]).toMatchObject({ tutar: 10000, kdvOrani: 20, turId: 4 });
    const liste = screen.getByTestId("kalem-listesi");
    expect(within(liste).getAllByText("10.000 ₺").length).toBeGreaterThan(0);
    expect(within(liste).getAllByText("12.000 ₺").length).toBeGreaterThan(0);
  });
  it("AC-2: tür yok ve sayıya çevrilemeyen tutar reddedilir, neden yazılır", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    fireEvent.click(screen.getAllByText("Yeni Gider")[0]);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "on dört bin" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(/Kayıt yapılmadı/)).toBeTruthy();
    expect(screen.getByText("Gider türü seçilmedi.")).toBeTruthy();
    expect(st.giderler).toHaveLength(0);
  });
  it("AC-13: iki ayrı başlık; ödendi işaretlenince ödenmemiş toplamdan ve açık borçtan düşer", () => {
    render(<Harness g0={[k({ tedarikciId: 12 })]} />);
    expect(screen.getByText("Ödenmemiş gider (KDV hariç)")).toBeTruthy();
    expect(screen.getByText("Tedarikçilere açık borç (KDV dâhil)")).toBeTruthy();
    const kart = (e) => screen.getByText(e).parentElement;
    expect(within(kart("Ödenmemiş gider (KDV hariç)")).getByText("10.000 ₺")).toBeTruthy();
    expect(within(kart("Tedarikçilere açık borç (KDV dâhil)")).getByText("12.000 ₺")).toBeTruthy();
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödendi olarak işaretle"));
    expect(within(kart("Ödenmemiş gider (KDV hariç)")).getByText("0 ₺")).toBeTruthy();
    expect(within(kart("Tedarikçilere açık borç (KDV dâhil)")).getByText("0 ₺")).toBeTruthy();
  });
  it("triyaj bulgu 10: 'Tedarikçilere açık borç' kartı tedarikçisi seçilmemiş borcu saymaz", () => {
    render(<Harness g0={[k({ tedarikciId: 12 }), k({ tutar: 5000 })]} />);
    const kart = screen.getByText("Tedarikçilere açık borç (KDV dâhil)").parentElement;
    expect(within(kart).getByText("12.000 ₺")).toBeTruthy();
    expect(within(kart).queryByText("18.000 ₺")).toBeNull();
  });
  it("AC-25: kira kaleminde 'Brüt girildi' / 'Net girildi' rozeti", () => {
    render(<Harness g0={[k({ turId: 1, tutar: 20000, stopajOrani: 20, girisYonu: "brut", netTutar: 16000 }), k({ turId: 1, tutar: 15000, netTutar: 12000, stopajOrani: 20, girisYonu: "net", kdvOrani: 0 })]} />);
    expect(screen.getByText("Brüt girildi")).toBeTruthy();
    expect(screen.getByText("Net girildi")).toBeTruthy();
  });
  it("AC-51 / AC-72 / K21: personel kalem listesinde, tür kırılımında ve borç özetinde kapalı başlar", () => {
    render(<Harness g0={[k({ turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, tutar: null, kdvOrani: 0 })]} />);
    expect(screen.queryByText("Hasan Çelik")).toBeNull();
    fireEvent.click(within(screen.getByTestId("tur-kirilimi")).getByText(/Aç/));
    const ayr = screen.getByTestId("personel-ayrinti");
    expect(within(ayr).getByText("Hasan Çelik")).toBeTruthy();
    expect(within(ayr).getByText("30.000 ₺")).toBeTruthy();
    expect(within(ayr).getAllByText("50.000 ₺").length).toBe(1);
    const borc = screen.getByTestId("borc-ozeti");
    expect(within(borc).getByText(/Çalışanlar · 1 kişi/)).toBeTruthy();
    expect(within(borc).queryByText("Hasan Çelik")).toBeNull();
    fireEvent.click(within(borc).getByText(/Adları göster/));
    expect(within(screen.getByTestId("calisan-borc-ayrinti")).getByText("Hasan Çelik")).toBeTruthy();
  });
  it("AC-16: yürürlük öncesi dönem rakam göstermez", () => {
    render(<Harness g0={[k({ tarih: "2026-05-10" })]} />);
    fireEvent.change(screen.getByLabelText("Dönem ayı"), { target: { value: "2026-05" } });
    expect(screen.getByText("Gider verisi girilmemiş")).toBeTruthy();
    expect(screen.queryByTestId("kalem-listesi")).toBeNull();
  });
  it("AC-17: kaydı olmayan dönem ve gelecek ay boş durum mesajı gösterir", () => {
    render(<Harness />);
    expect(screen.getByText("Bu dönemde gider kaydı yok")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Sonraki ay"));
    expect(screen.getByText("Bu dönemde gider kaydı yok")).toBeTruthy();
  });
  it("AC-31: eşiği kesen aralıkta kapsam dışı kısım yazılır", () => {
    render(<Harness g0={[k({ tarih: "2026-06-10" })]} />);
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), { target: { value: "2026-09-30" } });
    expect(screen.getByTestId("kapsam-disi").textContent).toMatch(/01\/04\/2026 – 31\/05\/2026 arası kapsam dışı/);
  });
  it("AC-38: tam ay olmayan aralıkta KDV kartı yerinde kalır, aralığı anarak açıklar", () => {
    render(<Harness g0={[k({ tarih: "2026-07-10" })]} />);
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), { target: { value: "2026-07-05" } });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), { target: { value: "2026-07-20" } });
    const kart = screen.getByTestId("kdv-karsilastirma");
    expect(kart.textContent).toMatch(/ay bazlı yapılır/);
    expect(kart.textContent).toMatch(/05\/07\/2026 – 20\/07\/2026/);
  });
  it("AC-34: aynı tanımdan aynı ayda iki kalem uyarı gösterir", () => {
    render(<Harness g0={[k({ tanimId: 9, donem: "2026-09", aciklama: "Muhasebe" }), k({ tanimId: 9, donem: "2026-09", aciklama: "Muhasebe" })]} />);
    expect(screen.getByTestId("mukerrer-uyari").textContent).toMatch(/Muhasebe \(2026-09\): 2 kalem/);
  });
  it("AC-19: silinen kalem çöp kutusuna gider (soft-delete) ve rapordan düşer", () => {
    let st;
    render(<Harness g0={[k({ aciklama: "Silinecek" })]} onState={s => { st = s; }} />);
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Çöp Kutusuna Taşı"));
    expect(st.giderler[0].deletedAt).toBeTruthy();
    expect(screen.getByText("Bu dönemde gider kaydı yok")).toBeTruthy();
  });
});

describe("Giderler sekmesi: tekrarlayan üretim (AC-8, AC-22)", () => {
  it("bildirimde eklenen ve zaten var olan adetleri ayrı ayrı gösterir; ikinci çalıştırma eklemez", () => {
    let st;
    const t0 = [{ id: 1, turId: 4, ad: "İnternet", tutar: 1250, baslangicAy: "2026-06", uretilenAylar: [] }, { id: 2, turId: 3, ad: "Hasan", calisanId: 21, baslangicAy: "2026-06", uretilenAylar: [] }];
    render(<Harness t0={t0} onState={s => { st = s; }} />);
    fireEvent.click(screen.getAllByText(/Eylül 2026 tekrarlayan kalemlerini oluştur/)[0]);
    expect(screen.getByTestId("uretim-sonucu").textContent).toMatch(/2 kalem eklendi, 0 kalem zaten vardı/);
    expect(st.giderler).toHaveLength(2);
    fireEvent.click(screen.getAllByText(/Eylül 2026 tekrarlayan kalemlerini oluştur/)[0]);
    expect(screen.getByTestId("uretim-sonucu").textContent).toMatch(/0 kalem eklendi, 2 kalem zaten vardı/);
    expect(st.giderler).toHaveLength(2);
  });
});

describe("Giderler sekmesi: izinler", () => {
  it("gider_add yoksa Yeni Gider, gider_delete yoksa Sil düğmesi çizilmez", () => {
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["gider"], giderActions: ["gider_edit"] }) };
    render(<Harness g0={[k({})]} perms={perms} />);
    expect(screen.queryByText("Yeni Gider")).toBeNull();
    expect(within(screen.getByTestId("kalem-listesi")).queryByTitle("Sil")).toBeNull();
    expect(within(screen.getByTestId("kalem-listesi")).getByTitle("Düzenle")).toBeTruthy();
  });
});
