// @vitest-environment jsdom
// Spec 0001: Ayarlar > Giderler grubu (türler, tekrarlayan tanımlar, gider ayarları), Firma Çalışanları
// maliyet alanları ve Makina Modelleri gider zinciri.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { GiderTurManager } from "../../src/components/settings/GiderTurManager";
import { SettingsGider } from "../../src/components/settings/SettingsGider";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { CalisanManager } from "../../src/components/CalisanManager";
import { ModelsManager } from "../../src/components/ModelsManager";

afterEach(cleanup);

const TURLER = [
  { id: 1, ad: "Fabrika kirası", davranis: "kira" },
  { id: 2, ad: "Depo kirası", davranis: "kira" },
  { id: 3, ad: "Personel", davranis: "personel" },
  { id: 4, ad: "Elektrik", davranis: "normal" },
  { id: 5, ad: "Sigorta", davranis: "normal" },
];

function TurHarness({ giderler: g0 = [], tanimlar: t0 = [], onState }) {
  const [giderTurleri, setGiderTurleri] = useState(TURLER);
  const [giderler, setGiderler] = useState(g0);
  const [giderTanimlari, setGiderTanimlari] = useState(t0);
  onState?.({ giderTurleri, giderler, giderTanimlari });
  return <GiderTurManager giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} giderler={giderler} setGiderler={setGiderler}
    giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} showToast={vi.fn()} />;
}
const satir = (ad) => screen.getAllByText(ad).find(el => el.tagName === "TD").closest("tr");

describe("Gider Türleri (R2, K12, K13)", () => {
  it("AC-35: kullanımdaki kira türü silinirken taşıma listesinde yalnız kira türleri var", () => {
    let st;
    render(<TurHarness giderler={[{ id: 10, turId: 2 }, { id: 11, turId: 2, deletedAt: "x" }]} tanimlar={[{ id: 20, turId: 2 }]} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Depo kirası")).getByTitle("Sil"));
    const secenekler = [...screen.getByLabelText("Kayıtları şu türe taşı").querySelectorAll("option")].map(o => o.textContent);
    expect(secenekler).toEqual(["Fabrika kirası"]);
    expect(screen.getByText(/2 gider kalemi/)).toBeTruthy();
    fireEvent.click(screen.getByText("Taşı ve Sil"));
    expect(st.giderTurleri.some(t => t.id === 2)).toBe(false);
    expect(st.giderler.every(k => k.turId === 1)).toBe(true);        // çöpteki kalem de taşındı (AC-20)
    expect(st.giderTanimlari[0].turId).toBe(1);
  });
  it("AC-35: aynı davranışta başka tür yoksa silme engellenir ve nedeni söylenir", () => {
    let st;
    render(<TurHarness giderler={[{ id: 10, turId: 3 }]} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Personel")).getByTitle("Sil"));
    expect(screen.getByText(/başka tür yok, bu yüzden silinemez/)).toBeTruthy();
    expect(screen.queryByText("Taşı ve Sil")).toBeNull();
    fireEvent.click(screen.getByText("Tamam"));
    expect(st.giderTurleri.some(t => t.id === 3)).toBe(true);
  });
  it("AC-36: kullanımdaki türün davranışı kilitli, adı değişir", () => {
    let st;
    render(<TurHarness giderler={[{ id: 10, turId: 4 }]} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Elektrik")).getByTitle("Düzenle"));
    expect(screen.getAllByLabelText("Davranış").at(-1).disabled).toBe(true);
    expect(screen.getByText(/davranış değiştirilemez/)).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue("Elektrik"), { target: { value: "Elektrik ve su" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.giderTurleri.find(t => t.id === 4)).toMatchObject({ ad: "Elektrik ve su", davranis: "normal" });
  });
  it("R12: kullanılmayan tür silme kalıcıdır (listeden çıkar, deletedAt yok)", () => {
    let st;
    render(<TurHarness onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Sigorta")).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Sil"));
    expect(st.giderTurleri.find(t => t.id === 5)).toBeUndefined();
  });
});

describe("Gider Ayarları (R10)", () => {
  it("AC-33: yürürlük ayı ileri alınınca eşik altı kalem sayısı uyarısı; kalemler silinmez", () => {
    const setAppSettings = vi.fn();
    const giderler = [{ id: 1, tarih: "2026-06-05" }, { id: 2, tarih: "2026-06-20" }, { id: 3, tarih: "2026-07-01" }, { id: 4, tarih: "2026-05-01", deletedAt: "x" }];
    render(<SettingsGider appSettings={{ giderAyarlari: { stopajOrani: 20, yururlukAy: "2026-06" } }} setAppSettings={setAppSettings} giderler={giderler} />);
    expect(screen.queryByText(/Eşiğin altında/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Gider takibi yürürlük ayı"), { target: { value: "2026-07" } });
    expect(screen.getByText("Eşiğin altında 2 gider kalemi kaldı.")).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    const yeni = setAppSettings.mock.calls[0][0]({ giderAyarlari: { varsayilanResmiMaliyet: 5 } });
    expect(yeni.giderAyarlari).toEqual({ varsayilanResmiMaliyet: 5, stopajOrani: 20, yururlukAy: "2026-07" });
  });
});

describe("Tekrarlayan Giderler (R3, K8, K28)", () => {
  function TanimHarness({ t0 = [], calisanlar = [], onState }) {
    const [giderTanimlari, setGiderTanimlari] = useState(t0);
    onState?.(giderTanimlari);
    return <SettingsGiderTanimlari giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} calisanlar={calisanlar} showToast={vi.fn()} />;
  }
  it("K8: 'tüm çalışanlar için tanım oluştur' yalnız tanımı olmayanlara personel tanımı ekler", () => {
    let st;
    render(<TanimHarness calisanlar={[{ id: 7, ad: "Ali" }, { id: 8, ad: "Veli" }]} t0={[{ id: 90, turId: 3, ad: "Ali", calisanId: 7, baslangicAy: "2026-01", uretilenAylar: [] }]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText(/Tüm çalışanlar için tanım oluştur/));
    expect(st).toHaveLength(2);
    expect(st[1]).toMatchObject({ turId: 3, ad: "Veli", calisanId: 8, tutar: null, uretilenAylar: [] });
  });
  it("R12: tanım silme kalıcıdır", () => {
    let st;
    render(<TanimHarness t0={[{ id: 91, turId: 4, ad: "İnternet", tutar: 1250, baslangicAy: "2026-01", uretilenAylar: ["2026-02"] }]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByTitle("Sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st).toEqual([]);
  });
  it("K28: kapatılmış tanım 'Kapatıldı' ile listelenir; üretilen aylar salt görünür", () => {
    render(<TanimHarness t0={[{ id: 92, turId: 3, ad: "Murat", calisanId: 9, baslangicAy: "2026-06", bitisAy: "2026-08", kapatildi: true, uretilenAylar: ["2026-06", "2026-07", "2026-08"] }]} />);
    expect(screen.getByText(/Kapatıldı · çalışan silindi/)).toBeTruthy();
    expect(screen.getByText("2026-06, 2026-07, 2026-08")).toBeTruthy();
  });
  it("tanım formu: tutar sıfır ve bitiş < başlangıç reddedilir", () => {
    let st;
    render(<TanimHarness onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    fireEvent.change(screen.getByPlaceholderText("Örn. Fabrika binası kirası"), { target: { value: "İnternet" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2026-09" } });
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-08" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText("Tutar sıfırdan büyük olmalı.")).toBeTruthy();
    expect(screen.getByText("Bitiş ayı başlangıçtan önce olamaz.")).toBeTruthy();
    expect(st).toEqual([]);
  });
});

describe("Firma Çalışanları: maliyet (R5, R16, K7, K20, K28)", () => {
  function CalHarness({ c0 = [], t0 = [], giderYetki = true, ayar = {}, onState }) {
    const [calisanlar, setCalisanlar] = useState(c0);
    const [giderTanimlari, setGiderTanimlari] = useState(t0);
    const [appSettings, setAppSettings] = useState(ayar);
    onState?.({ calisanlar, giderTanimlari, appSettings });
    return <CalisanManager calisanlar={calisanlar.filter(c => !c.deletedAt)} setCalisanlar={setCalisanlar} giderYetki={giderYetki} maliyetDuzenleyebilir={giderYetki}
      appSettings={appSettings} setAppSettings={setAppSettings} giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} />;
  }
  it("AC-52: yeni çalışanda resmi alan varsayılandan dolar, değiştirilebilir; sayı olarak saklanır", () => {
    let st;
    render(<CalHarness ayar={{ giderAyarlari: { varsayilanResmiMaliyet: 39223.13 } }} onState={s => { st = s; }} />);
    expect(screen.getByLabelText("Resmi işveren maliyeti").value).toBe("39223,13");
    fireEvent.change(screen.getByPlaceholderText("Ad Soyad"), { target: { value: "Zeynep" } });
    fireEvent.change(screen.getByLabelText("Elden ödenen"), { target: { value: "10.000" } });
    fireEvent.click(screen.getByText("Ekle"));
    expect(st.calisanlar[0]).toMatchObject({ ad: "Zeynep", resmiMaliyet: 39223.13, eldenMaliyet: 10000 });
  });
  it("AC-53: varsayılan değişince mevcut çalışanların tutarı değişmez", () => {
    let st;
    render(<CalHarness c0={[{ id: 1, ad: "Ali", resmiMaliyet: 30000 }]} ayar={{ giderAyarlari: { varsayilanResmiMaliyet: 30000 } }} onState={s => { st = s; }} />);
    fireEvent.change(screen.getByLabelText("Varsayılan resmi aylık işveren maliyeti"), { target: { value: "40.000" } });
    fireEvent.click(screen.getAllByText("Kaydet")[0]);
    expect(st.appSettings.giderAyarlari.varsayilanResmiMaliyet).toBe(40000);
    expect(st.calisanlar[0].resmiMaliyet).toBe(30000);
  });
  it("AC-55: gider yetkisi yoksa maliyet sütunları, varsayılan kutusu ve alanlar hiç çizilmez", () => {
    render(<CalHarness giderYetki={false} c0={[{ id: 1, ad: "Ali", resmiMaliyet: 30000, eldenMaliyet: 20000 }]} ayar={{ giderAyarlari: { varsayilanResmiMaliyet: 30000 } }} />);
    expect(screen.getByText("Ali")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/30\.000|20\.000|Resmi|Elden|maliyet/i);
  });
  it("AC-65: açık tanımı olan çalışan silinince bildirim çıkar, tanım son üretilen ayda kapanır", () => {
    let st;
    render(<CalHarness c0={[{ id: 1, ad: "Murat", resmiMaliyet: 30000 }]}
      t0={[{ id: 50, turId: 3, ad: "Murat", calisanId: 1, baslangicAy: "2026-01", bitisAy: null, uretilenAylar: ["2026-07", "2026-08"] }]} onState={s => { st = s; }} />);
    fireEvent.click(document.querySelector("button.btn--danger"));
    expect(screen.getByText(/açık bir tekrarlayan personel tanımı var/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Sil ve Tanımı Kapat/));
    expect(st.giderTanimlari[0]).toMatchObject({ bitisAy: "2026-08", kapatildi: true });
    expect(st.calisanlar[0].deletedAt).toBeTruthy();
  });
});

describe("Makina Modelleri: gider zinciri (R21, K35)", () => {
  const std = [{ model: "AK-100" }];
  it("AC-84: özel model silme onayında bağlı gider sayısı görünür", () => {
    render(<ModelsManager standardModels={std} setStandardModels={vi.fn()} customModels={[{ model: "AK150_X" }]} setCustomModels={vi.fn()}
      setCustomers={vi.fn()} setStock={vi.fn()} showToast={vi.fn()} appSettings={{}} setAppSettings={vi.fn()}
      giderler={[{ id: 1, modelSatirlari: [{ modelAd: "AK150_X", birimMaliyet: 1, adet: 1 }] }]} giderTanimlari={[{ id: 2, modelSatirlari: [{ modelAd: "AK150_X" }] }]} />);
    const satirEl = screen.getByText("AK150_X").closest("tr");
    fireEvent.click(satirEl.querySelector("button.btn--danger"));
    expect(screen.getByText(/1 gider kalemi ve 1 tekrarlayan tanım var/)).toBeTruthy();
  });
});
