// @vitest-environment jsdom
// Spec 0064: eksik kayıt kilitleri. Kilit köprüsü (window.crmLocks) sahte: belirli "alan:kimlik" başka kullanıcının
// (ayse) elindedir; acquire çağrıları kaydedilir. Ekranların LockConflict'i (bugünkü ekran) çizdiği, yeni kayıtta kilit
// alınmadığı, kilit servisi yokken hiçbir şeyin engellenmediği ve anlık işlemlerin başkasının kilidinde reddedildiği sınanır.
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor, act } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { Dashboard } from "../../src/components/Dashboard";
import { Kasa } from "../../src/components/Kasa";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import { UretimPartileri } from "../../src/components/gider/UretimPartileri";
import { StandartGiderler } from "../../src/components/gider/StandartGiderler";
import { CekPortfoyu } from "../../src/components/cek/CekPortfoyu";
import { Settings } from "../../src/components/Settings";
import { MAHSUP_KILITLI_HATASI } from "../../src/components/gider/OdemeGirisi";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";
import { useKilitListesi } from "../../src/hooks/useKilitListesi";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; delete window.appServer; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

// kilitli: { "alan:id": "sahip" }. Sahip "kerem" (oturumdaki kullanıcı) ise acquire başarılıdır (kendi kilidi).
const kilitKur = (kilitli = {}) => {
  const cagrilar = [];
  window.crmLocks = {
    acquire: vi.fn(async (t, id, force = false) => {
      cagrilar.push(["acquire", t, String(id), force]);
      const sahip = kilitli[`${t}:${id}`];
      return sahip && sahip !== "kerem" && !force ? { ok: false, lockedBy: sahip, lockedAt: "2026-09-23T09:55:00" } : { ok: true };
    }),
    release: vi.fn(async (t, id) => { cagrilar.push(["release", t, String(id)]); }),
    list: vi.fn(async () => Object.entries(kilitli).map(([k, sahip]) => { const [t, ...r] = k.split(":"); return { entity_type: t, entity_id: r.join(":"), locked_by: sahip }; })),
    releaseAll: vi.fn(async () => {}),
  };
  return cagrilar;
};
const alindi = (c, alan, id) => c.some(x => x[0] === "acquire" && x[1] === alan && x[2] === String(id));
const cakismaVar = () => screen.findByText("Bu kayıt şu an düzenleniyor");

// ── Giderler ──
const TURLER = [{ id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 12, ad: "Bölge Elektrik" }];
const CAL = [{ id: 7, ad: "Hasan Çelik" }, { id: 9, ad: "Ali Kaya" }];
const HESAP = [{ id: 1, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 20000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 2, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: false }];
const ELEKTRIK = { id: 501, tarih: "2026-09-10", turId: 4, tutar: 1000, kdvOrani: 20, tedarikciId: 12, aciklama: "Eylül elektrik", sonOdemeTarihi: "2026-09-25", odendi: false };
const MAAS = { id: 5, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, sonOdemeTarihi: "2026-09-30", odendi: false };
const AVANS = { id: 61, tur: "avans", tarih: "2026-08-15", tutar: 8000, calisanId: 7, hesapId: 1 };
function GiderHarness({ h0 = [], onState }) {
  const [giderler, setGiderler] = useState([ELEKTRIK, MAAS]);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  onState?.({ giderler });
  return <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TURLER}
    tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} showToast={vi.fn()} kasaHesaplari={HESAP} kasaYetki
    hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} />;
}
const elektrikSatiri = () => within(screen.getByTestId("kalem-listesi")).getByText("Eylül elektrik").closest("tr");

describe("Spec 0064: Giderler ve Anasayfa gider kalemi kilidi (R1, R25)", () => {
  it("AC-1: kalemi başkası tutarken düzenleme 'başkası düzenliyor' ekranını gösterir; form çizilmez", async () => {
    const c = kilitKur({ "gider:501": "ayse" });
    render(<GiderHarness />);
    fireEvent.click(within(elektrikSatiri()).getByTitle("Düzenle"));
    await cakismaVar();
    expect(screen.getByText("ayse")).toBeTruthy();
    expect(screen.getByText("Gideri Düzenle")).toBeTruthy();
    expect(screen.queryByText("Kaydet")).toBeNull();
    expect(alindi(c, "gider", 501)).toBe(true);
  });
  it("AC-2 / AC-3: aynı kaleme ödeme penceresi de aynı kilide tabidir (ödendi anahtarı pencere açar)", async () => {
    kilitKur({ "gider:501": "ayse" });
    render(<GiderHarness />);
    fireEvent.click(within(elektrikSatiri()).getByTitle("Ödeme kaydet"));
    await cakismaVar();
    expect(screen.queryByText("Ödemeyi Kaydet")).toBeNull();
  });
  it("AC-3 (R25): form, ödeme penceresi ve ödeme planı TEK useLock ile kilitlenir (ebeveynde, kalem kimliği ortak)", async () => {
    const c = kilitKur({});
    render(<GiderHarness />);
    fireEvent.click(within(elektrikSatiri()).getByTitle("Ödeme kaydet"));
    await waitFor(() => expect(alindi(c, "gider", 501)).toBe(true));
    expect(screen.getByTestId("odeme-kayit-penceresi")).toBeTruthy();
    fireEvent.click(screen.getByText("Vazgeç"));
    await waitFor(() => expect(c.some(x => x[0] === "release" && x[1] === "gider" && x[2] === "501")).toBe(true));
  });
  it("AC-9 / AC-37: yeni kalemde (kimlik yok) kilit alınmaz", async () => {
    const c = kilitKur({});
    render(<GiderHarness />);
    fireEvent.click(screen.getAllByText("Yeni Gider")[0]);
    await act(async () => {});
    expect(c.filter(x => x[1] === "gider")).toEqual([]);
    expect(screen.getByText("Kaydet")).toBeTruthy();
  });
  it("AC-21: kilit servisi yokken (yerel kip) hiçbir pencere engellenmez", () => {
    render(<GiderHarness />);
    fireEvent.click(within(elektrikSatiri()).getByTitle("Düzenle"));
    expect(screen.queryByText("Bu kayıt şu an düzenleniyor")).toBeNull();
    expect(screen.getByText("Kaydet")).toBeTruthy();
  });
  it("AC-20 / AC-31: kilitli ekran bugünkü LockConflict'tir (kim, ne zaman, devral); devralınca form açılır", async () => {
    const c = kilitKur({ "gider:501": "ayse" });
    render(<GiderHarness />);
    fireEvent.click(within(elektrikSatiri()).getByTitle("Düzenle"));
    await cakismaVar();
    await waitFor(() => expect(document.body.textContent).toMatch(/ayse bu kaydı 5 dakika önce açtı/));
    fireEvent.click(screen.getByText("Zorla Düzenle"));
    await waitFor(() => expect(screen.getByText("Kaydet")).toBeTruthy());
    expect(c.some(x => x[0] === "acquire" && x[1] === "gider" && x[3] === true)).toBe(true);
  });
  it("AC-26 (R20): mahsup kipinde kalem kilidine ek olarak çalışanın kilidi aranır; başkasındaysa LockConflict ve kayıt yok", async () => {
    const c = kilitKur({ "calisan:7": "ayse" });
    render(<GiderHarness h0={[AVANS]} />);
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByText(/Çalışanları göster/));
    const maas = within(screen.getByTestId("kalem-listesi")).getByText("Hasan Çelik").closest("tr");
    fireEvent.click(within(maas).getByTitle("Ödeme kaydet"));
    fireEvent.click(await screen.findByRole("button", { name: "Avanstan mahsup" }));
    await screen.findByTestId("mahsup-kilitli");
    expect(alindi(c, "gider", 5) && alindi(c, "calisan", 7)).toBe(true);
    fireEvent.click(screen.getByText("Mahsubu Kaydet"));
    expect(screen.getByText(MAHSUP_KILITLI_HATASI)).toBeTruthy();
  });
  it("AC-40 (R37, triyaj): başkasının tuttuğu kalemi çöpe taşıma onayı açılmaz; kalem çöpe gitmez", async () => {
    const c = kilitKur({ "gider:501": "ayse" });
    let st;
    render(<GiderHarness onState={s => { st = s; }} />);
    fireEvent.click(within(elektrikSatiri()).getByTitle("Sil"));
    await cakismaVar();
    expect(alindi(c, "gider", 501)).toBe(true);
    expect(screen.getByText("Gideri Sil")).toBeTruthy();
    expect(screen.queryByText("Çöp Kutusuna Taşı")).toBeNull();
    expect(screen.queryByText("Gider silinsin mi?")).toBeNull();
    fireEvent.click(screen.getByText("Geri Dön"));
    expect(st.giderler.find(k => k.id === 501).deletedAt).toBeFalsy();
  });
  it("AC-40: kilit serbestken silme onayı kilidi alır ve kalem çöpe gider; kapanınca kilit bırakılır", async () => {
    const c = kilitKur({});
    let st;
    render(<GiderHarness onState={s => { st = s; }} />);
    fireEvent.click(within(elektrikSatiri()).getByTitle("Sil"));
    await waitFor(() => expect(alindi(c, "gider", 501)).toBe(true));
    fireEvent.click(screen.getByText("Çöp Kutusuna Taşı"));
    expect(st.giderler.find(k => k.id === 501).deletedAt).toBeTruthy();
    await waitFor(() => expect(c.some(x => x[0] === "release" && x[1] === "gider" && x[2] === "501")).toBe(true));
  });
});

const DASH_ORTAK = { customers: [], dealers: [], services: [], stock: [], payments: [], partSales: [], yedekParcaSatislar: [], rates: null, teklifler: [] };
const DTUR = [{ id: 1, ad: "Genel", davranis: "normal" }];
const dk = { id: 1, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 20, odendi: false, tedarikciId: 12, sonOdemeTarihi: "2026-09-27" };
function DashHarness() {
  const [hareketler, setHareketler] = useState([]);
  return <Dashboard {...DASH_ORTAK} giderYetki giderler={odemeleriUygula([dk], hareketler, turHaritasi(DTUR))} hesapHareketleri={hareketler} setHesapHareketleri={setHareketler}
    giderTurleri={DTUR} tedarikciler={TED} giderAyarlari={{ yururlukAy: "2026-01", hatirlatmaEsikGun: 7 }} />;
}
describe("Spec 0064: Anasayfa'nın ödeme penceresi (R1, AC-24)", () => {
  it("AC-24: kalemi başkası tutarken Anasayfa'dan ödeme girilemez", async () => {
    const c = kilitKur({ "gider:1": "ayse" });
    render(<DashHarness />);
    fireEvent.click(screen.getByTestId("odeme-hatirlatma-karti"));
    fireEvent.click(within(screen.getAllByTestId("hatirlatma-satiri")[0]).getByTitle("Ödeme kaydet"));
    await cakismaVar();
    expect(screen.queryByText("Ödemeyi Kaydet")).toBeNull();
    expect(alindi(c, "gider", 1)).toBe(true);
  });
});

// ── Kasa ──
const toastlar = [];
function KasaHarness({ h0 = HESAP, m0 = [], services = [], aktif = "kerem", onState }) {
  const [kasaHesaplari, setKasaHesaplari] = useState(h0);
  const [hesapHareketleri, setHesapHareketleri] = useState(m0);
  const [kasaKapsamDisi, setKasaKapsamDisi] = useState([]);
  onState?.({ kasaHesaplari, kasaKapsamDisi, hesapHareketleri });
  return <Kasa aktifKullanici={aktif} kasaHesaplari={kasaHesaplari} setKasaHesaplari={setKasaHesaplari} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={[]} customers={[{ id: 500, name: "Kutu Gıda" }]} giderler={[]} giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} yururlukAy="2026-01"
    services={services} setServices={vi.fn()} factory={{ name: "Altuntaş Makina" }} serverPermissions={null} showToast={(m) => toastlar.push(m)}
    giderAyarlari={{ denemeDonemiBitis: "" }} kasaKapsamDisi={kasaKapsamDisi} setKasaKapsamDisi={setKasaKapsamDisi} />;
}
const hesapSatiri = (ad) => screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad));
const listeHazir = () => waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());

describe("Spec 0064: Kasa (R3, R5, R6, R14, R29)", () => {
  beforeEach(() => { toastlar.length = 0; });
  it("AC-6: hesabı başkası tutarken hesap formu açılmaz", async () => {
    kilitKur({ "kasa_hesap:1": "ayse" });
    render(<KasaHarness />);
    fireEvent.click(within(hesapSatiri("Merkez Kasa")).getByTitle("Düzenle"));
    await cakismaVar();
    expect(screen.queryByTestId("hesap-formu")).toBeNull();
  });
  it("AC-8 / AC-27: virman yalnız kaynak hesabı kilitler; kaynak başkasındaysa kaydedilemez, hedef hesap kilitlenmez", async () => {
    const c = kilitKur({ "kasa_hesap:1": "ayse" });
    render(<KasaHarness />);
    fireEvent.click(screen.getByText("Virman"));
    await cakismaVar();
    expect(screen.getByText("Virmanı Kaydet").closest("button").disabled).toBe(true);
    expect(alindi(c, "kasa_hesap", 1)).toBe(true);
    expect(alindi(c, "kasa_hesap", 2)).toBe(false);
  });
  it("AC-17: başkasının kilidindeki hesap kapatılamaz, bildirim verilir", async () => {
    kilitKur({ "kasa_hesap:1": "ayse" });
    let st;
    render(<KasaHarness onState={s => { st = s; }} />);
    await listeHazir();
    await act(async () => {});
    fireEvent.click(within(hesapSatiri("Merkez Kasa")).getByText("Kapat"));
    expect(st.kasaHesaplari.find(h => h.id === 1).kapali).toBe(false);
    expect(toastlar.some(m => /ayse/.test(m) && /Kasa hesabı/.test(m))).toBe(true);
  });
  it("AC-19: kendi kilidi engel değildir; hesap kapatılır", async () => {
    kilitKur({ "kasa_hesap:1": "kerem" });
    let st;
    render(<KasaHarness onState={s => { st = s; }} />);
    await listeHazir();
    await act(async () => {});
    fireEvent.click(within(hesapSatiri("Merkez Kasa")).getByText("Kapat"));
    expect(st.kasaHesaplari.find(h => h.id === 1).kapali).toBe(true);
  });
  it("AC-18: kapsam dışı bırakma satırın kaydının kilidine bakar (servis → müşteri); başkasındaysa reddedilir", async () => {
    kilitKur({ "customer:500": "ayse" });
    const sv = { id: 31, customerId: 500, date: "2026-09-05", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti: 1000,
      currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: "2026-09-05", yontem: "Nakit", degisenParcalar: [], hesapId: null };
    let st;
    render(<KasaHarness services={[sv]} onState={s => { st = s; }} />);
    await listeHazir();
    await act(async () => {});
    fireEvent.click(screen.getByText("Listeyi göster"));
    fireEvent.click(screen.getAllByLabelText(/^Kapsam dışı bırak: /)[0]);
    expect(st.kasaKapsamDisi).toEqual([]);
    expect(toastlar.some(m => /ayse/.test(m) && /Müşteri/.test(m))).toBe(true);
  });
  it("AC-25 / AC-37: avans formu seçili çalışanın kilidini alır; seçim değişince eskisi bırakılır, yenisi alınır", async () => {
    const c = kilitKur({});
    render(<KasaHarness />);
    fireEvent.click(screen.getByText("Avans Ver"));
    // Triyaj (bulgu 5): form çalışan seçili açılmaz; seçim yapılmadan hiçbir çalışanın kilidi alınmaz.
    expect(within(screen.getByTestId("avans-formu")).getAllByRole("combobox")[0].value).toBe("");
    await act(async () => {});
    expect(c.some(x => x[0] === "acquire" && x[1] === "calisan")).toBe(false);
    fireEvent.change(within(screen.getByTestId("avans-formu")).getAllByRole("combobox")[0], { target: { value: "7" } });
    await waitFor(() => expect(alindi(c, "calisan", 7)).toBe(true));
    fireEvent.change(within(screen.getByTestId("avans-formu")).getAllByRole("combobox")[0], { target: { value: "9" } });
    await waitFor(() => expect(alindi(c, "calisan", 9)).toBe(true));
    expect(c.some(x => x[0] === "release" && x[1] === "calisan" && x[2] === "7")).toBe(true);
  });
  it("AC-18: ekstreden avans silme çalışan başkasının kilidindeyse reddedilir", async () => {
    kilitKur({ "calisan:7": "ayse" });
    let st;
    render(<KasaHarness m0={[AVANS]} onState={s => { st = s; }} />);
    await listeHazir();
    await act(async () => {});
    const satir = screen.getAllByTestId("avans-satiri").find(s => s.textContent.includes("Hasan Çelik"));
    fireEvent.click(within(satir).getByText("Ekstre"));
    fireEvent.click(within(screen.getByTestId("ekstre-penceresi")).getByTitle("Avansı sil"));
    fireEvent.click(screen.getAllByText(/^(Evet, Sil|Sil|Avansı Sil)$/).pop());
    expect(st.hesapHareketleri).toHaveLength(1);
    expect(toastlar.some(m => /ayse/.test(m))).toBe(true);
  });
});

// ── Çek, tedarikçi, üretim partisi, standart gider ──
describe("Spec 0064: çek ve Giderler alt ekranları (R2, R4, R25, R33)", () => {
  const P = [{ id: 300, customerId: 1, tarih: "2026-09-01", tutar: 2000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-12-01" }];
  const CEK = [{ id: 200, paymentId: 300, no: "C-200", banka: "Ziraat", tur: "hamiline", durum: "portfoy", gecmis: [{ tarih: "2026-09-01", durum: "portfoy" }] }];
  const cekCiz = () => render(<CekPortfoyu cekler={CEK} setCekler={vi.fn()} payments={P} customers={[{ id: 1, name: "Kutu Gıda" }]} giderler={[ELEKTRIK]} giderTurleri={TURLER}
    tedarikciler={TED} calisanlar={CAL} hesapHareketleri={[]} setHesapHareketleri={vi.fn()} hesaplar={HESAP} showToast={vi.fn()} />);
  const cekSatiri = () => screen.getAllByTestId("cek-satiri").find(s => s.textContent.includes("C-200"));
  // R36 (triyaj bulgu 2): ciro ve Çek Yaz ödediği gider kaleminin kilidine kayıt anında bakar.
  const cekCizIzli = () => {
    const setH = vi.fn(), setC = vi.fn(), toast = vi.fn();
    render(<CekPortfoyu cekler={CEK} setCekler={setC} payments={P} customers={[{ id: 1, name: "Kutu Gıda" }]} giderler={[ELEKTRIK]} giderTurleri={TURLER}
      tedarikciler={TED} calisanlar={CAL} hesapHareketleri={[]} setHesapHareketleri={setH} hesaplar={HESAP} showToast={toast} aktifKullanici="kerem" />);
    return { setH, setC, toast };
  };
  const ciroYap = () => {
    fireEvent.click(within(cekSatiri()).getByText("Ciro Et"));
    fireEvent.change(screen.getByDisplayValue("Tedarikçi seçin"), { target: { value: "12" } });
    fireEvent.click(screen.getAllByText("Ciro Et").pop());
  };
  const cekYazYap = () => {
    fireEvent.click(screen.getByRole("tab", { name: "Verilen çekler" }));
    fireEvent.click(screen.getByText("Çek Yaz"));
    const Y = () => screen.getByTestId("cek-yaz-penceresi");
    fireEvent.change(within(Y()).getByLabelText("Çek numarası"), { target: { value: "A-7" } });
    fireEvent.change(within(Y()).getByLabelText("Banka hesabı"), { target: { value: "2" } });
    fireEvent.change(within(Y()).getByLabelText("Çek vadesi"), { target: { value: "2026-10-02" } });
    fireEvent.change(screen.getByDisplayValue("Tedarikçi seçin"), { target: { value: "12" } });
    fireEvent.click(screen.getByText("Çeki Yaz"));
  };
  it("AC-39: ödediği gider kalemi başkasının kilidindeyken ciro reddedilir; hareket ve çek yazılmaz", async () => {
    kilitKur({ "gider:501": "ayse" });
    const { setH, setC, toast } = cekCizIzli();
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await act(async () => {});
    ciroYap();
    expect(setH).not.toHaveBeenCalled();
    expect(setC).not.toHaveBeenCalled();
    expect(toast.mock.calls.some(([m]) => /Gider kalemi · 501/.test(m) && /ayse/.test(m))).toBe(true);
  });
  it("AC-39: kalem serbestken (ya da kendi kilidimizdeyken) ciro yazılır", async () => {
    kilitKur({ "gider:501": "kerem" });
    const { setH, setC } = cekCizIzli();
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await act(async () => {});
    ciroYap();
    expect(setH).toHaveBeenCalled();
    expect(setC).toHaveBeenCalled();
  });
  it("AC-39: ödediği gider kalemi başkasının kilidindeyken Çek Yaz reddedilir", async () => {
    kilitKur({ "gider:501": "ayse" });
    const { setH, setC, toast } = cekCizIzli();
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await act(async () => {});
    cekYazYap();
    expect(setH).not.toHaveBeenCalled();
    expect(setC).not.toHaveBeenCalled();
    expect(toast.mock.calls.some(([m]) => /ayse/.test(m))).toBe(true);
  });
  it("AC-4: aynı çeki iki kullanıcı aynı anda ciro edemez", async () => {
    const c = kilitKur({ "cek:200": "ayse" });
    cekCiz();
    fireEvent.click(within(cekSatiri()).getByText("Ciro Et"));
    await cakismaVar();
    expect(screen.queryByText("Çeki Ciro Et")).toBeNull();
    expect(alindi(c, "cek", 200)).toBe(true);
  });
  it("AC-5: çek durumu ve geçmişi pencereleri aynı çek kilidine tabidir", async () => {
    kilitKur({ "cek:200": "ayse" });
    cekCiz();
    fireEvent.click(within(cekSatiri()).getByText("Geçmiş"));
    await cakismaVar();
    expect(screen.queryByText("Çek Geçmişi")).toBeNull();
    fireEvent.click(screen.getByText("Geri Dön"));
    fireEvent.click(within(cekSatiri()).getByText("Durum"));
    await cakismaVar();
    expect(screen.queryByText("Çek Durumu")).toBeNull();
  });
  it("AC-7: tedarikçi formu kilitlidir; yeni tedarikçide kilit yok", async () => {
    const c = kilitKur({ "tedarikci:1": "ayse" });
    render(<Tedarikciler tedarikciler={[{ id: 1, ad: "Demir Bant" }]} setTedarikciler={vi.fn()} giderler={[]} giderTanimlari={[]} showToast={vi.fn()} />);
    fireEvent.click(within(screen.getByText("Demir Bant").closest("tr")).getByTitle("Düzenle"));
    await cakismaVar();
    fireEvent.click(screen.getByText("Geri Dön"));
    fireEvent.click(screen.getByText("Yeni Tedarikçi"));
    await act(async () => {});
    expect(c.filter(x => x[1] === "tedarikci" && x[2] !== "1")).toEqual([]);
  });
  it("AC-7: üretim partisi formu kilitlidir", async () => {
    kilitKur({ "uretim_partisi:1": "ayse" });
    render(<UretimPartileri uretimPartileri={[{ id: 1, ad: "İlk Parti", baslangicAy: "2026-01", bitisAy: null }]} setUretimPartileri={vi.fn()} stock={[]} customers={[]} showToast={vi.fn()} />);
    fireEvent.click(within(screen.getByText("İlk Parti").closest("tr")).getByTitle("Düzenle"));
    await cakismaVar();
  });
  it("R33: standart gider grubunun penceresi kilitli; 'son sürümü geri al' başkasının kilidinde reddedilir", async () => {
    const toast = vi.fn();
    kilitKur({ "standart_gider:9": "ayse" });
    const set = vi.fn();
    const SG = [{ id: 1, grupId: 9, ad: "Kira", tutar: 10000, baslangicAy: "2026-01", bitisAy: "2026-05" }, { id: 2, grupId: 9, ad: "Kira", tutar: 12000, baslangicAy: "2026-06", bitisAy: null }];
    render(<StandartGiderler standartGiderler={SG} setStandartGiderler={set} showToast={toast} aktifKullanici="kerem" />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await act(async () => {});
    fireEvent.click(screen.getByText("Son sürümü geri al"));
    expect(set).not.toHaveBeenCalled();
    expect(toast.mock.calls.some(([m]) => /ayse/.test(m))).toBe(true);
  });
});

// ── Ayarlar ──
const AYAR_BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(),
  setServices: vi.fn(), setDealers: vi.fn(), version: "3.41.0", appSettings: {}, setAppSettings: vi.fn(),
  customModels: [], setCustomModels: vi.fn(), standardModels: [{ model: "AK100" }], setStandardModels: vi.fn(),
  factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [{ id: 1, ad: "Ahmet Usta" }], setCalisanlar: vi.fn(), parts: [], setParts: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(),
};
describe("Spec 0064: Ayarlar panel kilidi (R7, R9, R11, R12, R27, R30, R31)", () => {
  it("AC-10 / AC-11 / AC-12: katalog paneli başkasındayken panel çizilmez; yeni kayıt ve yeniden adlandırma erişilemez", async () => {
    const c = kilitKur({ "ayar:models": "ayse" });
    render(<Settings {...AYAR_BASE} initialTab="models" onInitialTabConsumed={vi.fn()} />);
    await screen.findByTestId("ayar-kilitli");
    expect(alindi(c, "ayar", "models")).toBe(true);
    expect(screen.queryByText("AK100")).toBeNull();
    expect(screen.queryByText(/Yeni Model|Model Ekle/)).toBeNull();
  });
  it("AC-11: kalıp, parça ve parça tipi panelleri de kilitlidir", async () => {
    for (const id of ["kaliplar", "yedekparca", "parcatipi"]) {
      const c = kilitKur({ [`ayar:${id}`]: "ayse" });
      render(<Settings {...AYAR_BASE} initialTab={id} onInitialTabConsumed={vi.fn()} />);
      await screen.findByTestId("ayar-kilitli");
      expect(alindi(c, "ayar", id), id).toBe(true);
      cleanup();
    }
  });
  it("AC-13 / AC-30: farklı paneller birbirini engellemez; sekme değişince kilit bırakılır", async () => {
    const c = kilitKur({ "ayar:kdv": "ayse" });
    render(<Settings {...AYAR_BASE} initialTab="company" onInitialTabConsumed={vi.fn()} />);
    await waitFor(() => expect(alindi(c, "ayar", "company")).toBe(true));
    expect(screen.queryByTestId("ayar-kilitli")).toBeNull();
    fireEvent.click(screen.getByText("Firma Çalışanları"));
    await waitFor(() => expect(c.some(x => x[0] === "release" && x[1] === "ayar" && x[2] === "company")).toBe(true));
    expect(alindi(c, "ayar", "calisanlar")).toBe(true);
  });
  it("AC-29: kdv, kkkomisyon, takip ve servispano kilitlenir; çalışma saatleri company kimliğini paylaşır", async () => {
    for (const id of ["kdv", "kkkomisyon", "takip", "servispano"]) {
      const c = kilitKur({});
      render(<Settings {...AYAR_BASE} initialTab={id} onInitialTabConsumed={vi.fn()} />);
      await waitFor(() => expect(alindi(c, "ayar", id), id).toBe(true));
      cleanup();
    }
  });
  it("AC-28: salt okunur paneller kilit almaz", async () => {
    for (const id of ["securitystatus", "export"]) {
      const c = kilitKur({});
      render(<Settings {...AYAR_BASE} initialTab={id} onInitialTabConsumed={vi.fn()} />);
      await act(async () => {});
      // initialTab açılıştan sonra uygulanır; salt okunur panelin kendisi için kilit hiç istenmez.
      expect(c.filter(x => x[1] === "ayar" && x[2] === id), id).toEqual([]);
      cleanup();
    }
  });
  it("AC-14 / AC-15: Çöp Kutusu ve Sahipsiz Kayıtlar araç düzeyinde tek sahiplidir (ayar + trash / sahipsiz)", async () => {
    for (const id of ["trash", "sahipsiz"]) {
      const c = kilitKur({ [`ayar:${id}`]: "ayse" });
      render(<Settings {...AYAR_BASE} initialTab={id} onInitialTabConsumed={vi.fn()} />);
      await screen.findByTestId("ayar-kilitli");
      expect(alindi(c, "ayar", id)).toBe(true);
      cleanup();
    }
  });
  it("R31: 'Geri Dön' ilk görünen salt okunur panele geçer ve kilit bırakılır", async () => {
    const c = kilitKur({ "ayar:app": "ayse" });
    render(<Settings {...AYAR_BASE} />);
    await screen.findByTestId("ayar-kilitli");
    fireEvent.click(screen.getByText("Geri Dön"));
    await waitFor(() => expect(screen.queryByTestId("ayar-kilitli")).toBeNull());
    expect(c.filter(x => x[0] === "acquire" && x[1] === "ayar").map(x => x[2])).toEqual(["app"]);
  });
  it("AC-7 (R30): Firma Çalışanları satır düzenlemesi çalışanın kilidini de alır", async () => {
    const c = kilitKur({ "calisan:1": "ayse" });
    render(<Settings {...AYAR_BASE} initialTab="calisanlar" onInitialTabConsumed={vi.fn()} />);
    await waitFor(() => expect(alindi(c, "ayar", "calisanlar")).toBe(true));
    fireEvent.click(screen.getByText("Ahmet Usta").closest("tr").querySelector("button"));
    await cakismaVar();
    expect(alindi(c, "calisan", 1)).toBe(true);
  });
});

// ── Canlı kilit listesi (R38, triyaj bulgu 1) ──
// Köprü preload'daki gibi TEK aboneyi tutar (her abonelik öncekini siler). Kanca aynı anda iki ekranda açıkken olay ikisini
// de yenilemelidir; biri kapanınca diğeri canlı kalır.
describe("Spec 0064 R38: kilit listesi birden çok abonede canlı", () => {
  it("AC-41: iki kanca açıkken kilit değişikliği olayı ikisini de yeniler; biri kapanınca diğeri yenilenmeye devam eder", async () => {
    let liste = [];
    window.crmLocks = { list: vi.fn(async () => liste), acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}) };
    let dinleyici = null;
    window.appServer = { onLocksChanged: (cb) => { dinleyici = cb; return () => { if (dinleyici === cb) dinleyici = null; }; } };
    const Goster = ({ ad }) => { const { baskasiKilitli } = useKilitListesi("kerem"); return <div data-testid={ad}>{baskasiKilitli("gider", 501)?.locked_by || "serbest"}</div>; };
    const Iki = ({ ikinci = true }) => <><Goster ad="bir" />{ikinci && <Goster ad="iki" />}</>;
    const { rerender } = render(<Iki />);
    await act(async () => {});
    expect(screen.getByTestId("bir").textContent).toBe("serbest");
    liste = [{ entity_type: "gider", entity_id: "501", locked_by: "ayse" }];
    await act(async () => { dinleyici(); });
    expect(screen.getByTestId("bir").textContent).toBe("ayse");
    expect(screen.getByTestId("iki").textContent).toBe("ayse");
    rerender(<Iki ikinci={false} />);
    liste = [{ entity_type: "gider", entity_id: "501", locked_by: "mehmet" }];
    expect(typeof dinleyici).toBe("function");
    await act(async () => { dinleyici(); });
    expect(screen.getByTestId("bir").textContent).toBe("mehmet");
  });
  it("AC-41: Kasa ve içindeki Çalışan avansları birlikte açıkken sonradan alınan kilit avans silmeyi reddeder", async () => {
    let liste = [];
    window.crmLocks = { list: vi.fn(async () => liste), acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}) };
    let dinleyici = null;
    window.appServer = { onLocksChanged: (cb) => { dinleyici = cb; return () => { if (dinleyici === cb) dinleyici = null; }; } };
    toastlar.length = 0;
    let st;
    render(<KasaHarness m0={[AVANS]} onState={s => { st = s; }} />);
    await act(async () => {});
    liste = [{ entity_type: "calisan", entity_id: "7", locked_by: "ayse" }];
    await act(async () => { dinleyici(); });
    const satir = screen.getAllByTestId("avans-satiri").find(s => s.textContent.includes("Hasan Çelik"));
    fireEvent.click(within(satir).getByText("Ekstre"));
    fireEvent.click(within(screen.getByTestId("ekstre-penceresi")).getByTitle("Avansı sil"));
    fireEvent.click(screen.getAllByText(/^(Evet, Sil|Sil|Avansı Sil)$/).pop());
    expect(st.hesapHareketleri).toHaveLength(1);
    expect(toastlar.some(m => /ayse/.test(m))).toBe(true);
  });
});
