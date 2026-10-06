// @vitest-environment jsdom
// Spec 0070 (arayüz): çalışan kartında SGK ve yol parası, gider formunun personel dalı (yol parası), personel ayrıntısı.
// Spec 0074 R18 (S10) ile güncellendi: 0070'in SGK yarısı geri alındı. Personel formundaki SGK alanı, SGK vadesi, SGK hedefinin
// çek ve mahsup kuralı, borç özetindeki "SGK'yı Öde" ve toplu ödeme penceresi testleri silindi; yeni davranış
// `ui/sgk-turu-0074.test.jsx`'te (karşılıkları: AC-26 → 0074 AC-24 notu; AC-14 → 0074 AC-11; AC-42 → 0074 AC-28; AC-16/18/20/33/34
// → 0074 AC-20, AC-23; AC-41 → 0074 AC-14). Çalışan kartı (SGK alanı kalır, 0074 R12) ve yol parası blokları aynen.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { CalisanManager, CALISAN_MALIYET_IPUCU } from "../../src/components/CalisanManager";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { giderKalemDogrula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; delete window.appServer; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-06T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000, sgkMaliyet: 9000, eldenMaliyet: 10000, yolParasiMaliyet: 1000 }, { id: 22, ad: "Zeynep Arslan", resmiMaliyet: 25000, eldenMaliyet: 5000 }];
describe("Spec 0070 A: çalışan kartı", () => {
  function H({ c0 = CAL, onState }) {
    const [calisanlar, setCalisanlar] = useState(c0);
    onState?.(calisanlar);
    return <CalisanManager calisanlar={calisanlar} setCalisanlar={setCalisanlar} giderYetki maliyetDuzenleyebilir showToast={vi.fn()} />;
  }
  it("AC-1, AC-3: satır içi girişte sıra resmi, SGK, elden, yol parası; düzenleme penceresinde de aynı alanlar", () => {
    render(<H />);
    const etiketler = [...document.querySelectorAll("input[aria-label]")].map(i => i.getAttribute("aria-label")).filter(a => ["Resmi işveren maliyeti", "SGK", "Elden ödenen", "Yol parası"].includes(a));
    expect(etiketler).toEqual(["Resmi işveren maliyeti", "SGK", "Elden ödenen", "Yol parası"]);
    fireEvent.click(screen.getAllByRole("button").find(b => b.className.includes("ghost")));
    const pencere = screen.getByText("Çalışanı Düzenle").closest("div").parentElement;
    for (const a of ["Resmi işveren maliyeti", "SGK", "Elden ödenen", "Yol parası"]) expect(within(document.body).getAllByLabelText(a).length).toBeGreaterThanOrEqual(2);
    expect(pencere).toBeTruthy();
  });
  it("AC-4: resmi alanının etiketi artık SGK'yı kapsadığını söylemez", () => {
    render(<H />);
    fireEvent.click(screen.getAllByRole("button").find(b => b.className.includes("ghost")));
    expect(screen.queryByText(/SGK dahil/)).toBeNull();
    expect(screen.getAllByText("Resmi işveren maliyeti").length).toBeGreaterThan(0);
  });
  it("AC-24: yalnız SGK girilmiş çalışan sayı olarak normalize edilir", () => {
    let st;
    render(<H c0={[]} onState={s => { st = s; }} />);
    fireEvent.change(screen.getByPlaceholderText("Ad Soyad"), { target: { value: "Ali Veli" } });
    fireEvent.change(screen.getByLabelText("Resmi işveren maliyeti"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("SGK"), { target: { value: "8.500" } });
    fireEvent.click(screen.getByText("Ekle"));
    expect(st[0]).toMatchObject({ ad: "Ali Veli", sgkMaliyet: 8500, resmiMaliyet: null, eldenMaliyet: null, yolParasiMaliyet: null });
  });
  // Spec 0074 R15 ile güncellendi: toplam işverene toplam maliyettir; ipucu SGK'nın personel kalemine girmediğini söyler.
  it("AC-25: aylık toplam dört bileşeni toplar (işverene toplam maliyet) ve ipucu SGK'nın kendi kalemiyle ödendiğini söyler", () => {
    render(<H />);
    expect(screen.getAllByTestId("calisan-aylik-toplam").map(t => t.textContent)).toEqual(["50.000 ₺", "30.000 ₺"]);
    expect(screen.getByTestId("calisan-maliyet-ipucu").textContent).toBe(CALISAN_MALIYET_IPUCU);
  });
});

const formAc = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={[]} calisanlar={CAL} giderAyarlari={{}} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });

describe("Spec 0070 B: gider formunun personel dalı (yol parası)", () => {
  it("AC-6 (form), AC-7: çalışan seçilince resmi, elden ve yol parası dolar; toplam üçünü toplar (spec 0074 R16: SGK alanı yok)", () => {
    const onSave = formAc();
    tur(3);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    expect(["Resmi işveren maliyeti", "Elden ödenen", "Yol parası"].map(a => screen.getByLabelText(a).value)).toEqual(["30.000", "10.000", "1.000"]);
    expect(screen.queryByLabelText("SGK")).toBeNull();
    expect(screen.getByTestId("personel-toplam").textContent).toBe("41.000 ₺");
    fireEvent.click(screen.getByText("Kaydet"));
    const k = onSave.mock.calls[0][0];
    expect(k).toMatchObject({ resmiTutar: 30000, eldenTutar: 10000, yolParasi: 1000 });
    expect(k.taksitler.map(t => t.hedef).sort()).toEqual(["ana", "elden"]);
  });
  it("AC-28: yol parası varken elden bloğunda ipucu; yol parası yokken ipucu yok", () => {
    formAc();
    tur(3);
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    expect(screen.getByTestId("yol-parasi-ipucu").textContent).toBe("Yol parası bu tutarın içindedir.");
    expect(screen.getByLabelText("Maaş (elden) ödendi")).toBeTruthy(); // hedef adı değişmez (B-8)
    fireEvent.change(screen.getByLabelText("Yol parası"), { target: { value: "" } });
    expect(screen.queryByTestId("yol-parasi-ipucu")).toBeNull();
  });
  it("AC-27: tekrarlayan tanım formunda SGK ve yol parası alanı yoktur", () => {
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TURLER} calisanlar={CAL} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "3" } });
    expect(screen.queryByLabelText("SGK")).toBeNull();
    expect(screen.queryByLabelText("Yol parası")).toBeNull();
  });
});

let m = 5000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: [], uid: () => ++m }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const A = k({ id: 1, tarih: "2026-10-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: "30000", eldenTutar: "10000", yolParasi: "1000", sonOdemeTarihi: "2026-10-05" });
const B = k({ id: 2, tarih: "2026-10-01", turId: 3, calisanId: 22, calisanAd: "Zeynep Arslan", resmiTutar: "25000", eldenTutar: "5000", sonOdemeTarihi: "2026-10-05" });
function GH({ g0 = [A, B] }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={[]} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} kasaHesaplari={[]} kasaYetki aktifKullanici="kerem"
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}

describe("Spec 0070 D: personel ayrıntısı", () => {
  // Spec 0074 R16 (AC-38) ile güncellendi: ızgara altı sütun (SGK sütunu yok).
  it("AC-23, AC-43: personel ayrıntısı varsayılan kapalı; açılınca yol parası sütunu satır toplamıyla tutar", () => {
    render(<GH />);
    expect(screen.queryByTestId("personel-ayrinti")).toBeNull();
    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.trim() === "▸ Aç"));
    const ayr = screen.getByTestId("personel-ayrinti");
    expect(ayr.textContent).toMatch(/Yol parası/);
    expect(ayr.textContent).not.toMatch(/SGK/);
    const hasan = within(ayr).getAllByTestId("personel-ayrinti-calisan").find(e => e.textContent.includes("Hasan"));
    expect(hasan.textContent).toMatch(/30\.000 ₺10\.000 ₺1\.000 ₺—41\.000 ₺/);
  });
});
