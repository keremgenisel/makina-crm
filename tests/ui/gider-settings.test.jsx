// @vitest-environment jsdom
// Spec 0001: Ayarlar > Giderler grubu (türler, tekrarlayan tanımlar, gider ayarları). Firma Çalışanları
// maliyet alanları calisan-manager.test.jsx, Makina Modelleri gider zinciri models-manager-gider.test.jsx içinde.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { GiderTurManager } from "../../src/components/settings/GiderTurManager";
import { SettingsGider } from "../../src/components/settings/SettingsGider";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";

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
    expect(yeni.giderAyarlari).toEqual({ varsayilanResmiMaliyet: 5, stopajOrani: 20, yururlukAy: "2026-07", ortakGiderKaynagi: "gercek", hatirlatmaEsikGun: 7, hesapsizBaslangic: "", denemeDonemiBitis: "2027-01-01" }); // 0051: boş = eşik yok; spec 0056 Q5: alan yoksa varsayılan yazılır
  });
});

describe("Ödeme hatırlatma eşiği (spec 0003 R5)", () => {
  function EsikHarness({ onState }) {
    const [appSettings, setAppSettings] = useState({ giderAyarlari: { stopajOrani: 20, yururlukAy: "2026-06" } });
    onState(appSettings);
    return <SettingsGider appSettings={appSettings} setAppSettings={setAppSettings} giderler={[]} />;
  }
  it("AC-11: eşik 15'e çıkarılıp kaydedilir (varsayılan 7 görünür)", () => {
    let st;
    render(<EsikHarness onState={s => { st = s; }} />);
    const alan = screen.getByLabelText("Ödeme hatırlatma eşiği (gün)");
    expect(alan.value).toBe("7");
    fireEvent.change(alan, { target: { value: "15" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.giderAyarlari).toMatchObject({ hatirlatmaEsikGun: 15, yururlukAy: "2026-06" });
  });
  it("AC-23: negatif, 365 üstü veya sayı olmayan değer kaydedilmez, neden yazılır", () => {
    let st;
    render(<EsikHarness onState={s => { st = s; }} />);
    for (const v of ["-1", "366", "abc"]) {
      fireEvent.change(screen.getByLabelText("Ödeme hatırlatma eşiği (gün)"), { target: { value: v } });
      fireEvent.click(screen.getByText("Kaydet"));
      expect(screen.getByText(/^Hatırlatma eşiği .*0 ile 365/)).toBeTruthy();
      expect(st.giderAyarlari.hatirlatmaEsikGun).toBeUndefined();
    }
  });
  it("R5: gider_tanim izni yoksa alan düzenlenemez", () => {
    render(<SettingsGider appSettings={{ giderAyarlari: {} }} setAppSettings={vi.fn()} giderler={[]} canDo={() => false} />);
    expect(screen.getByLabelText("Ödeme hatırlatma eşiği (gün)").disabled).toBe(true);
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
    // Spec 0030 R10 (C4 istisnası, B6): sütun sayıya indi; tam liste ipucunda, aynı sıkılıkla.
    expect(screen.getByText("3 ay").getAttribute("title")).toBe("2026-06, 2026-07, 2026-08");
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
  // Spec 0053 R1, R3 bu 0042 testini ters çevirdi: yöntem yalnız ödeme satırında sorulur; tanım formunda alan yok. Yeni tanım
  // yöntemsiz kaydedilir, eski tanımın değeri düzenlemede korunur (göç yok).
  it("AC-2 / AC-4: tanım formunda ödeme yöntemi alanı yok; yeni tanım yöntemsiz, eski tanımın değeri düzenlemede korunur", () => {
    let st;
    render(<TanimHarness t0={[{ id: 91, turId: 4, ad: "İnternet", tutar: 1250, odemeYontemi: "Havale", baslangicAy: "2026-01", uretilenAylar: [] }]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    expect(screen.queryByLabelText("Varsayılan ödeme yöntemi")).toBeNull();
    expect(screen.queryByText("Varsayılan ödeme yöntemi")).toBeNull();
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    fireEvent.change(screen.getByPlaceholderText("Örn. Fabrika binası kirası"), { target: { value: "Su" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "300" } });
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2026-09" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.find(t => t.ad === "Su").odemeYontemi).toBe("");
    fireEvent.click(screen.getAllByTitle("Düzenle")[0]);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.find(t => t.id === 91).odemeYontemi).toBe("Havale");
  });
  it("AC-16 (spec 0020 X5): tekrarlayan personel tanımında atama seçenekleri görünmez; normal tanımda görünür", () => {
    render(<TanimHarness calisanlar={[{ id: 7, ad: "Ali" }]} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "3" } });
    expect(screen.queryByText("Makina maliyeti ataması")).toBeNull();
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    expect(screen.getByText("Makina maliyeti ataması")).toBeTruthy();
  });
});

describe("Spec 0051: hesapsız kayıt başlangıç tarihi (Gider Ayarları)", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T10:00:00")); });
  afterEach(() => { vi.useRealTimers(); });
  const ac = (o = {}) => { const setAppSettings = vi.fn(); render(<SettingsGider appSettings={{ giderAyarlari: { stopajOrani: 20, yururlukAy: "2026-06", ...o } }} setAppSettings={setAppSettings} {...(o.__canDo ? { canDo: o.__canDo } : {})} />); return setAppSettings; };
  const kaydedilen = (fn) => fn.mock.calls[0][0]({ giderAyarlari: {} }).giderAyarlari;
  it("AC-1 / AC-29: tarih girilir ve giderAyarlari.hesapsizBaslangic olarak kaydedilir; yürürlük ayından önceki tarih serbest (AC-9)", () => {
    const set = ac();
    fireEvent.change(screen.getByLabelText("Hesapsız kayıt başlangıç tarihi"), { target: { value: "2026-03-15" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(kaydedilen(set).hesapsizBaslangic).toBe("2026-03-15");
  });
  it("R4 / Q7: boşken yürürlük ayının başı önerilir; öneri yalnız formu doldurur, kendiliğinden kaydedilmez", () => {
    const set = ac();
    expect(screen.getByTestId("hesapsiz-baslangic-oneri").textContent).toMatch(/01\.06\.2026|01\/06\/2026/);
    fireEvent.click(screen.getByText("Öneriyi kullan"));
    expect(screen.getByLabelText("Hesapsız kayıt başlangıç tarihi").value).toBe("2026-06-01");
    expect(set).not.toHaveBeenCalled();
  });
  it("AC-9: gelecek tarih ve takvimde olmayan tarih kaydedilmez, nedeni yazılır", () => {
    const set = ac();
    fireEvent.change(screen.getByLabelText("Hesapsız kayıt başlangıç tarihi"), { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(/gelecekte olamaz/)).toBeTruthy();
    expect(set).not.toHaveBeenCalled();
  });
  it("AC-10: gider_tanim izni olmayan kullanıcı alanı değiştiremez (pasif, Kaydet yok)", () => {
    ac({ hesapsizBaslangic: "2026-06-01", __canDo: () => false });
    expect(screen.getByLabelText("Hesapsız kayıt başlangıç tarihi").disabled).toBe(true);
    expect(screen.queryByText("Kaydet")).toBeNull();
  });
});
