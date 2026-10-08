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
    expect(st.giderTurleri.some(t => t.id === 2 && !t.deletedAt)).toBe(false); // spec 0078 R2 ile güncellendi: silinen kayıt çöp kutusuna gider
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
    expect(st.giderTurleri.find(t => t.id === 5 && !t.deletedAt)).toBeUndefined(); // spec 0078 R2 ile güncellendi: silinen kayıt çöp kutusuna gider
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
    expect(yeni.giderAyarlari).toEqual({ varsayilanResmiMaliyet: 5, stopajOrani: 20, yururlukAy: "2026-07", ortakGiderKaynagi: "gercek", hatirlatmaEsikGun: 7, indirilebilirOran: 70, hesapsizBaslangic: "", denemeDonemiBitis: "2027-01-01" }); // 0051: boş = eşik yok; spec 0056 Q5: alan yoksa varsayılan yazılır; spec 0076 R34: indirilebilir oran varsayılanı (70) yazılır
  });
  // Triyaj (spec 0076): oran alanı eklenirken başlangıç tarihi formun ilk durumundan düşmüş, başka bir alan kaydedilince
  // 0051 eşiği sessizce siliniyordu. Dolu ayarla açılan form yalnız oran değiştirilip kaydedilince bütün alanları korur.
  it("triyaj 0076: dolu ayarla açılan form yalnız oran değiştirilip kaydedilince diğer bütün alanları (hesapsız başlangıç dahil) korur", () => {
    const setAppSettings = vi.fn();
    const dolu = { stopajOrani: 15, yururlukAy: "2026-03", ortakGiderKaynagi: "standart", hatirlatmaEsikGun: 12, hesapsizBaslangic: "2026-04-01", denemeDonemiBitis: "2026-12-15", indirilebilirOran: 70 };
    render(<SettingsGider appSettings={{ giderAyarlari: dolu }} setAppSettings={setAppSettings} giderler={[]} />);
    expect(screen.getByLabelText("Hesapsız kayıt başlangıç tarihi").value).toBe("2026-04-01");
    fireEvent.change(screen.getByLabelText("Binek araç giderlerinde indirilebilir oran"), { target: { value: "88" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const yeni = setAppSettings.mock.calls[0][0]({ giderAyarlari: { varsayilanResmiMaliyet: 5 } });
    expect(yeni.giderAyarlari).toEqual({ varsayilanResmiMaliyet: 5, ...dolu, indirilebilirOran: 88 });
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
    expect(st.filter(t => !t.deletedAt)).toEqual([]); // spec 0078 R2 ile güncellendi: silinen kayıt çöp kutusuna gider
  });
  it("K28: kapatılmış tanım 'Kapatıldı' ile listelenir; üretilen aylar salt görünür", () => {
    render(<TanimHarness t0={[{ id: 92, turId: 3, ad: "Murat", calisanId: 9, baslangicAy: "2026-06", bitisAy: "2026-08", kapatildi: true, uretilenAylar: ["2026-06", "2026-07", "2026-08"] }]} />);
    expect(screen.getByText(/Kapatıldı · çalışan silindi/)).toBeTruthy();
    // Spec 0030 R10 (C4 istisnası, B6): sütun sayıya indi; tam liste ipucunda, aynı sıkılıkla.
    expect(screen.getByText("3 ay").getAttribute("title")).toBe("2026-06, 2026-07, 2026-08");
  });
  // Spec 0071 R9 ile güncellendi: normal davranışlı tanımda sıfır artık serbest (tutarı sonra girilen tekrarlayan kalem); sıfır
  // kuralı kira tanımında sınanır (AC-18).
  it("tanım formu: kira tanımında tutar sıfır ve bitiş < başlangıç reddedilir", () => {
    let st;
    render(<TanimHarness onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "1" } });
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

describe("Spec 0071: tekrarlayan tanımda KDV dâhil giriş ve sıfır tutar", () => {
  function TanimHarness({ t0 = [], onState }) {
    const [giderTanimlari, setGiderTanimlari] = useState(t0);
    onState?.(giderTanimlari);
    return <SettingsGiderTanimlari giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} calisanlar={[{ id: 7, ad: "Ali" }]}
      modeller={[{ model: "AK100_DS" }]} kdvRates={[{ from: "2026-01-01", rate: 20 }]} showToast={vi.fn()} />;
  }
  const yeni = (turId, ad = "Elektrik") => {
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: String(turId) } });
    fireEvent.change(screen.getByPlaceholderText("Örn. Fabrika binası kirası"), { target: { value: ad } });
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2026-10" } });
  };
  const yon = () => screen.queryByRole("radiogroup", { name: "KDV yönü" });
  it("AC-17, AC-40: normal tanıma sıfır ya da boş tutar girilebilir, 0 olarak kaydedilir", () => {
    let st;
    render(<TanimHarness onState={s => { st = s; }} />);
    yeni(4);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st).toHaveLength(1);
    expect(st[0]).toMatchObject({ tutar: 0, kdvYonu: "haric" });
    yeni(5, "Su");
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.find(t => t.ad === "Su").tutar).toBe(0);
  });
  it("AC-18: kira ve personel tanımında sıfır hâlâ reddedilir", () => {
    let st;
    render(<TanimHarness onState={s => { st = s; }} />);
    yeni(1, "Kira");
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText("Tutar sıfırdan büyük olmalı.")).toBeTruthy();
    expect(st).toEqual([]);
    // Personel tanımı tutar almaz (çalışan kaydından); dört bileşeni sıfır personel kalemi motorda reddedilir (AC-26).
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "3" } });
    expect(screen.queryByLabelText("Tutar")).toBeNull();
  });
  it("AC-8, AC-10: dâhil tanım girilen tutarı saklar ve listede 'KDV dâhil girildi' yazar; eski tanım 'KDV hariç girildi' (AC-43)", () => {
    let st;
    render(<TanimHarness t0={[{ id: 91, turId: 5, ad: "Sigorta", tutar: 1250, kdvOrani: 20, baslangicAy: "2026-01", uretilenAylar: [] }]} onState={s => { st = s; }} />);
    expect(screen.getByTestId("tanim-kdv-yonu").textContent).toBe("KDV hariç girildi");
    yeni(4);
    fireEvent.click(within(yon()).getByRole("radio", { name: "KDV dâhil" }));
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1180" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.find(t => t.ad === "Elektrik")).toMatchObject({ tutar: 1180, kdvYonu: "dahil", kdvOrani: null });
    expect(screen.getAllByTestId("tanim-kdv-yonu").map(e => e.textContent)).toContain("KDV dâhil girildi");
  });
  it("AC-44: kira tanımında net girişte KDV yönü seçicisi yok, kayıt hariç", () => {
    let st;
    render(<TanimHarness onState={s => { st = s; }} />);
    yeni(1, "Kira");
    expect(yon()).toBeTruthy();
    fireEvent.click(within(yon()).getByRole("radio", { name: "KDV dâhil" }));
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Giriş yönü" })).getByRole("radio", { name: "Net ödenen kira" }));
    expect(yon()).toBeNull();
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "16000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0]).toMatchObject({ girisYonu: "net", kdvYonu: "haric" });
  });
  it("AC-41: dâhil tanımda model satırları KDV hariç tutarla sınanır; sıfır tanımda model dağılımı reddedilir", () => {
    let st;
    render(<TanimHarness onState={s => { st = s; }} />);
    yeni(4, "Sac");
    fireEvent.click(within(yon()).getByRole("radio", { name: "KDV dâhil" }));
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1200" } });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Makina maliyeti ataması" })).getByRole("radio", { name: "Model" }));
    fireEvent.change(screen.getByLabelText("Model 1"), { target: { value: "AK100_DS" } });
    fireEvent.change(screen.getByLabelText("Birim maliyet 1"), { target: { value: "1100" } });
    fireEvent.change(screen.getByLabelText("Adet 1"), { target: { value: "1" } });
    // Triyaj: önizleme kayıtla aynı sınırı (KDV hariç 1.000) kullanır; kaydetmeden önce aşım görünür.
    expect(screen.getByText("Kalem tutarı").nextSibling.textContent).toBe("1.000 ₺");
    expect(screen.getByText("Aşım").nextSibling.textContent).toBe("100 ₺");
    fireEvent.click(screen.getByText("Kaydet"));
    // 1.200 dâhil → 1.000 hariç (bugünün oranı %20); 1.100 aşar.
    expect(screen.getAllByText(/Satır toplamı kalem tutarını 100 ₺ aşıyor/).length).toBeGreaterThan(0);
    expect(st).toEqual([]);
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText("Tutarı sonra girilecek tanımda model dağılımı yapılamaz.")).toBeTruthy();
    expect(st).toEqual([]);
  });
});
