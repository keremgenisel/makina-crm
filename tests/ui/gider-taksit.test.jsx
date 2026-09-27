// @vitest-environment jsdom
// Spec 0021: gider taksitlendirme ve vergi dairesi (stopaj) ödemesi, arayüz (form, liste, ödeme planı penceresi,
// borç özeti). Gerçek Giderler bileşeni ve durumlu düzenek: işaretleme motor üzerinden kaleme yazılır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { GiderForm } from "../../src/components/GiderForm";
import { STOPAJ_KDV_NOTU, STOPAJ_AYRI_KALEM_NOTU } from "../../src/components/gider/GiderAlanlari";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Bölge Elektrik" }];
const TAM = null;
const ODEMESIZ = { role: "user", permissions: JSON.stringify({ tabs: ["gider"], giderActions: ["gider_add", "gider_edit"] }) };

function Harness({ g0 = [], perms = TAM, onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [giderTanimlari, setGiderTanimlari] = useState([]);
  const [tedarikciler, setTedarikciler] = useState(TED);
  const [standartGiderler, setStandartGiderler] = useState([]);
  onState?.({ giderler });
  return <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari}
    giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler}
    calisanlar={[]} standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20 } }} serverPermissions={perms}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const sat = (id, hedef, sira, vade, tutar, odendi = false) => ({ id, hedef, sira, vade, tutar, odendi, odemeTarihi: odendi ? "2026-09-15" : null });
// 10.000 + %20 = 12.000, 6 taksit, 2'si ödenmiş.
const TAKSITLI = { id: 501, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 20, tedarikciId: 12, aciklama: "Kompresör", odendi: false, sonOdemeTarihi: "2026-11-15",
  taksitler: [sat(1, "ana", 1, "2026-09-15", 2000, true), sat(2, "ana", 2, "2026-10-15", 2000, true), ...[3, 4, 5, 6].map(i => sat(i, "ana", i, `2027-0${i - 2}-15`, 2000))] };
// Brüt 20.000, %20 stopaj: kiraya verene 16.000, vergi dairesine 4.000.
const KIRA = { id: 502, tarih: "2026-09-01", turId: 1, girisYonu: "brut", tutar: 20000, netTutar: 16000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, aciklama: "Eylül kira", odendi: false, sonOdemeTarihi: "2026-09-05",
  taksitler: [sat(11, "ana", 1, "2026-09-05", 16000), sat(12, "stopaj", 1, "2026-10-26", 4000)] };
const liste = () => screen.getByTestId("kalem-listesi");
const satirOf = (metin) => within(liste()).getByText(metin).closest("tr");

describe("Liste ve ödeme planı penceresi (R2, R3)", () => {
  it("AC-4: taksitli kalem 'Kısmen ödendi 2/6' rozetiyle görünür; kalem düzeyinde ödendi anahtarı yok (AC-6)", () => {
    render(<Harness g0={[TAKSITLI]} />);
    const s = satirOf("Kompresör");
    expect(within(s).getByText("Kısmen ödendi 2/6")).toBeTruthy();
    expect(within(s).queryByTitle("Ödendi olarak işaretle")).toBeNull();
  });
  it("AC-5 / AC-25: pencereden kalan dört taksit işaretlenince kalem 'Ödendi' olur; odendi ve odemeTarihi türetilir", () => {
    let st;
    render(<Harness g0={[TAKSITLI]} onState={s => { st = s; }} />);
    fireEvent.click(within(satirOf("Kompresör")).getByText("Ödeme planı"));
    const pencere = () => screen.getByTestId("odeme-plani-satirlari");
    for (let i = 0; i < 4; i++) fireEvent.click(within(pencere()).getAllByText("Ödendi işaretle")[0]);
    expect(within(screen.getByTestId("odeme-plani-ozet")).getByText("Ödendi")).toBeTruthy();
    expect(st.giderler[0]).toMatchObject({ odendi: true, odemeTarihi: "2026-09-23" });
    expect(within(satirOf("Kompresör")).getByText("Ödendi 6/6")).toBeTruthy();
  });
  it("AC-13: taksitsiz kira iki anahtarla işaretlenir: vergi dairesi kiraya verenden bağımsız", () => {
    let st;
    render(<Harness g0={[KIRA]} onState={s => { st = s; }} />);
    const s = satirOf("Eylül kira");
    fireEvent.click(within(s).getByText("Vergi dairesi: Ödenmedi"));
    expect(st.giderler[0].taksitler.map(r => [r.hedef, r.odendi])).toEqual([["ana", false], ["stopaj", true]]);
    expect(st.giderler[0].odendi).toBe(false);
    expect(within(satirOf("Eylül kira")).getByText("Kiraya veren: Ödenmedi")).toBeTruthy();
    fireEvent.click(within(satirOf("Eylül kira")).getByText("Kiraya veren: Ödenmedi"));
    expect(st.giderler[0].odendi).toBe(true);
  });
  it("AC-20: gider_odeme olmadan kira anahtarları ve penceredeki taksit düğmeleri yok", () => {
    render(<Harness g0={[TAKSITLI, KIRA]} perms={ODEMESIZ} />);
    expect(within(satirOf("Eylül kira")).queryByTitle("Ödendi olarak işaretle")).toBeNull();
    fireEvent.click(within(satirOf("Kompresör")).getByText("Ödeme planı"));
    expect(within(screen.getByTestId("odeme-plani-satirlari")).queryByText("Ödendi işaretle")).toBeNull();
    expect(screen.getByText("Ödeme durumunu değiştirme yetkiniz yok.")).toBeTruthy();
  });
});

describe("Borç özeti (R4, R8)", () => {
  it("AC-7: altı taksitin ikisi ödenmişse borç kalan dört taksit (8.000)", () => {
    render(<Harness g0={[TAKSITLI]} />);
    const borc = screen.getByTestId("borc-ozeti");
    expect(within(borc).getByText("Bölge Elektrik").closest("div[style]").parentElement.parentElement.textContent).toMatch(/8\.000 ₺/);
  });
  it("AC-15 / AC-21: vergi dairesi ayrı satır; toplam borca girer, 'Tedarikçilere açık borç' kartına girmez", () => {
    render(<Harness g0={[KIRA]} />);
    const borc = screen.getByTestId("borc-ozeti");
    expect(within(borc).getByText("Kira stopajı")).toBeTruthy();
    expect(borc.textContent).toMatch(/Vergi dairesi.*4\.000 ₺/);
    expect(borc.textContent).toMatch(/Toplam borç20\.000 ₺/);
    const kart = screen.getByText("Tedarikçilere açık borç (KDV dâhil)").parentElement;
    expect(kart.textContent).toMatch(/16\.000 ₺/);
  });
});

describe("Form (R1, R6, R11, R15)", () => {
  const ac = (kalem, props = {}) => {
    const onSave = vi.fn();
    render(<GiderForm kalem={kalem} giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} giderAyarlari={{ stopajOrani: 20 }} onSave={onSave} onCancel={vi.fn()} {...props} />);
    return onSave;
  };
  const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });
  it("AC-1 / AC-3: 12.000'lik kalem 6 taksite bölünür; önizleme birer ay arayla 2.000'lik satırlar, kayıtta aynı plan", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "10.000" } });
    fireEvent.change(screen.getByLabelText("Taksit sayısı"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("İlk taksitin vadesi"), { target: { value: "2026-10-31" } });
    const on = screen.getByTestId("odeme-plani-onizleme");
    expect(within(on).getAllByTestId("odeme-satiri")).toHaveLength(6);
    expect(within(on).getAllByText("2.000 ₺")).toHaveLength(6);
    expect(within(on).getByText("30/11/2026")).toBeTruthy(); // ay sonu kırpması
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].taksitler.map(r => r.vade)).toEqual(["2026-10-31", "2026-11-30", "2026-12-31", "2027-01-31", "2027-02-28", "2027-03-31"]);
  });
  it("triyaj bulgu 3: 60'ı aşan taksit sayısında önizleme satır üretmez, neden gösterilir, kayıt yapılmaz", () => {
    const onSave = ac();
    tur(4);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "10.000" } });
    fireEvent.change(screen.getByLabelText("Taksit sayısı"), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText("İlk taksitin vadesi"), { target: { value: "2026-10-31" } });
    expect(screen.queryAllByTestId("odeme-satiri")).toHaveLength(0);
    expect(screen.getAllByText("Taksit sayısı 1 ile 60 arasında tam sayı olmalı.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
  });
  it("AC-6: taksitli kalemde ödeme durumu segmenti yok, durum satırlardan türetilmiş olarak yazılır", () => {
    ac(TAKSITLI);
    expect(screen.queryByRole("radiogroup", { name: "Ödeme durumu" })).toBeNull();
    expect(screen.getByTestId("odeme-durumu-turetilen").textContent).toBe("Kısmen ödendi");
  });
  it("AC-22: iki taksiti ödenmiş planda sayı 1'e indirilemez; nedeni gösterilir, kayıt yapılmaz", () => {
    const onSave = ac(TAKSITLI);
    fireEvent.change(screen.getByLabelText("Taksit sayısı"), { target: { value: "1" } });
    expect(screen.getAllByText("Taksit sayısı ödenmiş taksit sayısının (2) altına indirilemez.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
  });
  it("AC-12: kira formunda vergi dairesi bölümü 4.000'lik stopajı ayrı gösterir; stopaj taksitlenebilir", () => {
    const onSave = ac();
    tur(1);
    fireEvent.change(screen.getByLabelText("KDV oranı"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    expect(screen.getByTestId("stopaj-bolumu").textContent).toMatch(/4\.000 ₺/);
    fireEvent.change(screen.getByLabelText("Stopaj taksit sayısı"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Stopaj vadesi"), { target: { value: "2026-10-26" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const k = onSave.mock.calls[0][0];
    expect(k.taksitler.filter(r => r.hedef === "ana").map(r => r.tutar)).toEqual([16000]);
    expect(k.taksitler.filter(r => r.hedef === "stopaj").map(r => r.tutar)).toEqual([1000, 1000, 1000, 1000]);
  });
  it("AC-19: stopaj ve KDV birlikte > 0 iken bilgi notu görünür, kayıt engellenmez", () => {
    const onSave = ac();
    tur(1);
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    fireEvent.change(screen.getByLabelText("KDV oranı"), { target: { value: "20" } });
    expect(screen.getByTestId("stopaj-kdv-notu").textContent).toBe(STOPAJ_KDV_NOTU);
    fireEvent.change(screen.getByLabelText("KDV oranı"), { target: { value: "0" } });
    expect(screen.queryByTestId("stopaj-kdv-notu")).toBeNull();
    fireEvent.change(screen.getByLabelText("KDV oranı"), { target: { value: "20" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
  it("AC-14: stopajın ayrı kalem olarak girilmemesi gerektiğini söyleyen kalıcı bilgi satırı kira ve normal formda", () => {
    ac();
    tur(4);
    expect(screen.getByText(STOPAJ_AYRI_KALEM_NOTU)).toBeTruthy();
    tur(1);
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    expect(within(screen.getByTestId("stopaj-bolumu")).getByText(STOPAJ_AYRI_KALEM_NOTU)).toBeTruthy();
  });
});
