// @vitest-environment jsdom
// Spec 0056: deneme döneminde kasa hesabının silinmesi ve bağlarının taşınması (gerçek Kasa bileşeni, durumlu düzenek), gider
// ayarındaki deneme tarihi ve gerçek App'te tek kayıt.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";

const denetim = vi.hoisted(() => ({ kayitlar: [] }));
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (o) => denetim.kayitlar.push(o) }));
const { Kasa, denemeDonemiMetni, ACILIS_BAKIYE_IPUCU } = await import("../../src/components/Kasa");
const { HESAP_ACILIS_TASINMAZ } = await import("../../src/components/kasa/HesapSilPenceresi");
const { SettingsGider } = await import("../../src/components/settings/SettingsGider");

afterEach(() => { cleanup(); vi.useRealTimers(); denetim.kayitlar = []; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T10:00:00")); });

const hes = (id, ad, o = {}) => ({ id, ad, tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 1000, acilisTarihi: "2026-01-01", kapali: false, ...o });
const H0 = [hes(51, "Eski Banka"), hes(52, "Yeni Banka"), hes(54, "Dolar", { paraBirimi: "USD" })];
const M0 = [{ id: 101, tur: "odeme", tarih: "2026-09-05", tutar: 300, hesapId: 51, giderId: 1, taksitId: null, yontem: "Havale" },
  { id: 102, tur: "avans", tarih: "2026-09-06", tutar: 50, hesapId: 51, calisanId: 7 }];
const P0 = [{ id: 201, customerId: 500, tarih: "2026-09-11", tutar: 700, currency: "TRY", yontem: "Havale", hesapId: 51 }];
const S0 = [{ id: 301, customerId: 500, date: "2026-09-10", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti: 1000,
  currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: "2026-09-10", yontem: "Nakit", degisenParcalar: [], hesapId: 51 }];
const KISITLI = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"] }) };

function D({ h0 = H0, ayar = {}, perms = null, onState }) {
  const [kasaHesaplari, setKasaHesaplari] = useState(h0);
  const [hesapHareketleri, setHesapHareketleri] = useState(M0);
  const [payments, setPayments] = useState(P0);
  const [services, setServices] = useState(S0);
  const [cekler, setCekler] = useState([]);
  onState?.({ kasaHesaplari, hesapHareketleri, payments, services });
  return <Kasa kasaHesaplari={kasaHesaplari} setKasaHesaplari={setKasaHesaplari} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={payments} setPayments={setPayments} services={services} setServices={setServices} partSales={[]} setPartSales={vi.fn()}
    yedekParcaSatislar={[]} setYedekParcaSatislar={vi.fn()} cekler={cekler} setCekler={setCekler} customers={[{ id: 500, name: "Kutu Gıda" }]}
    factory={{ name: "Altuntaş Makina" }} giderler={[]} giderTurleri={[]} tedarikciler={[]} calisanlar={[{ id: 7, ad: "Hasan" }]}
    giderAyarlari={ayar} serverPermissions={perms} showToast={vi.fn()} />;
}
const satirOf = (ad) => screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad));
const silAc = (ad) => fireEvent.click(within(satirOf(ad)).getByLabelText(`Hesabı sil: ${ad}`));

describe("Spec 0056: deneme dönemi kapısı (AC-2–AC-4, AC-6, AC-13, AC-18, AC-28, AC-31)", () => {
  it("AC-2 / AC-31 / AC-6 / AC-13: deneme ibaresi R3 cümlesiyle; hareketli hesapta silme var, Kapat yerinde", () => {
    render(<D />);
    expect(screen.getByTestId("deneme-donemi").textContent).toBe("Deneme dönemi 01.01.2027'de biter. O tarihten sonra hareketi olan hesap silinemez, yalnız kapatılabilir.");
    expect(denemeDonemiMetni("2027-01-01")).toBe(screen.getByTestId("deneme-donemi").textContent);
    expect(within(satirOf("Eski Banka")).getByLabelText("Hesabı sil: Eski Banka")).toBeTruthy();
    expect(within(satirOf("Eski Banka")).getByText("Kapat")).toBeTruthy();
    expect(within(satirOf("Eski Banka")).getByText(/4 hareket/)).toBeTruthy();
  });
  it("AC-3 / AC-4 / AC-28: tarih geçmişken, boşken ve bitiş gününde hareketli hesapta silme yok; ibare yok", () => {
    for (const ayar of [{ denemeDonemiBitis: "2026-09-01" }, { denemeDonemiBitis: "" }, { denemeDonemiBitis: "2026-09-30" }]) {
      render(<D ayar={ayar} />);
      expect(within(satirOf("Eski Banka")).queryByLabelText("Hesabı sil: Eski Banka"), JSON.stringify(ayar)).toBeNull();
      expect(screen.queryByTestId("deneme-donemi")).toBeNull();
      expect(within(satirOf("Yeni Banka")).getByLabelText("Hesabı sil: Yeni Banka")).toBeTruthy(); // hareketsiz hesap bugünkü gibi
      cleanup();
    }
  });
  it("AC-18: kasa_hesap izni olmayan kullanıcı silme ve taşıma düğmesini görmez", () => {
    render(<D perms={KISITLI} />);
    expect(screen.queryAllByLabelText(/^Hesabı sil:/)).toEqual([]);
  });
});

describe("Spec 0056: silme penceresi ve taşıma (AC-7, AC-8, AC-9, AC-14, AC-19, AC-30)", () => {
  it("AC-7 / AC-8 / AC-14 / AC-30: türüyle sayım ve R21 cümlesi; taşıyınca hesap silinir, bağlar hedefe geçer; işlem geçmişi", () => {
    let st;
    render(<D onState={s => { st = s; }} />);
    silAc("Eski Banka");
    const p = screen.getByTestId("hesap-sil-penceresi");
    expect(within(p).getByTestId("hesap-sil-sayim").textContent).toMatch(/Gider ödemesi: 1.*Çalışan avansı: 1.*Makina tahsilatı: 1.*Servis tahsilatı: 1/s);
    expect(within(p).getByTestId("hesap-sil-acilis").textContent).toContain(HESAP_ACILIS_TASINMAZ);
    expect([...within(p).getByLabelText("Taşınacak hesap").querySelectorAll("option")].map(o => o.textContent)).toEqual(["Yeni Banka (Banka, TRY)"]); // USD ve kendisi yok
    fireEvent.click(screen.getByText("Hesabı Sil"));
    expect(st.kasaHesaplari.filter(h => !h.deletedAt).map(h => h.id)).toEqual([52, 54]); // spec 0078 R2 ile güncellendi: silinen kayıt çöp kutusuna gider
    expect(st.hesapHareketleri.map(m => m.hesapId)).toEqual([52, 52]);
    expect(st.payments[0].hesapId).toBe(52);
    expect(st.services[0].hesapId).toBe(52);
    expect(denetim.kayitlar.map(k => k.action)).toEqual(["hareket_tasindi", "silindi"]);
    expect(denetim.kayitlar[0]).toMatchObject({ entity: "kasa_hesap", detail: { kaynak: "Eski Banka", hedef: "Yeni Banka", adet: 4 } });
    expect(readFileSync("src/components/settings/SettingsAuditLog.jsx", "utf-8")).toMatch(/hareket_tasindi: "Hareketleri Taşındı"/);
  });
  it("AC-19 / AC-9: uygun hedef yoksa yalnız hesapsız bırakma, nedeniyle; seçilince kayıtlar hesapsız kalır", () => {
    let st;
    render(<D h0={[hes(51, "Eski Banka"), hes(54, "Dolar", { paraBirimi: "USD" })]} onState={s => { st = s; }} />);
    silAc("Eski Banka");
    expect(screen.queryByLabelText("Taşınacak hesap")).toBeNull();
    fireEvent.click(screen.getByText("Başka hesaba taşı"));
    expect(screen.getByTestId("hesap-sil-engel").textContent).toBe("TRY para biriminde açık başka hesap yok.");
    fireEvent.click(screen.getByText("Hesapsız bırak"));
    fireEvent.click(screen.getByText("Hesabı Sil"));
    expect(st.kasaHesaplari.filter(h => !h.deletedAt).map(h => h.id)).toEqual([54]); // spec 0078 R2 ile güncellendi: silinen kayıt çöp kutusuna gider
    expect(st.hesapHareketleri.map(m => m.hesapId)).toEqual([null, null]);
    expect(st.payments[0].hesapId).toBeNull();
    expect(screen.getByTestId("hesapsiz-odeme-satiri").textContent).toMatch(/ödemeler: 1/);
    expect(screen.getByTestId("hesapsiz-tahsilat-satiri").textContent).toMatch(/tahsilatlar: 1/);
  });
  it("AC-20: virmanı olan hesapta hesapsız bırakma pasif ve nedenli", () => {
    const vir = { id: 110, tur: "virman", tarih: "2026-09-09", tutar: 10, hesapId: 52, karsiHesapId: 51 };
    function V() {
      const [h, setH] = useState([hes(51, "Eski Banka"), hes(52, "Yeni Banka")]);
      return <Kasa kasaHesaplari={h} setKasaHesaplari={setH} hesapHareketleri={[vir]} setHesapHareketleri={vi.fn()} payments={[]} setPayments={vi.fn()}
        customers={[]} giderler={[]} giderTurleri={[]} tedarikciler={[]} serverPermissions={null} showToast={vi.fn()} giderAyarlari={{}} />;
    }
    render(<V />);
    silAc("Eski Banka");
    expect(screen.getByTestId("hesap-sil-engel").textContent).toMatch(/09\/09\/2026 virmanı \(Yeni Banka ↔ Eski Banka\): virman hesapsız bırakılamaz; önce bu virmanı silin\./);
    expect(screen.getByText("Hesabı Sil").closest("button").disabled).toBe(true);
  });
});

describe("Spec 0056: para birimi ve açılış (AC-15–AC-17, AC-32)", () => {
  it("AC-15 / AC-16 / AC-17 / AC-32: para birimi kilidi ve nedeni; açılış bakiyesi değişir, bakiye güncellenir; ipucu birebir", () => {
    render(<D />);
    fireEvent.click(within(satirOf("Eski Banka")).getByTitle("Düzenle"));
    expect(screen.getByText("Hareketi olan hesabın para birimi değiştirilemez.")).toBeTruthy();
    expect(screen.getByTestId("acilis-bakiye-ipucu").textContent).toBe(ACILIS_BAKIYE_IPUCU);
    expect(ACILIS_BAKIYE_IPUCU).toBe("Bakiye hareketlerden hesaplanır, doğrudan yazılamaz; bir hesabın başlangıç rakamını açılış bakiyesiyle ayarlayın.");
    const once = satirOf("Eski Banka").textContent;
    fireEvent.change(screen.getByLabelText("Açılış bakiyesi"), { target: { value: "5000" } });
    fireEvent.click(screen.getAllByText("Kaydet").filter(e => e.closest("button")).pop());
    expect(satirOf("Eski Banka").textContent).not.toBe(once);
  });
});

describe("Spec 0056: gider ayarı (AC-1, AC-4)", () => {
  it("AC-1 / AC-4: alan yokken 01.01.2027 gösterilir ve kaydedilir; boşaltılınca boş dize yazılır", () => {
    const set = vi.fn();
    render(<SettingsGider appSettings={{ giderAyarlari: {} }} setAppSettings={set} giderler={[]} />);
    const alan = screen.getByLabelText("Deneme dönemi bitiş tarihi");
    expect(alan.value).toBe("2027-01-01");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set.mock.calls.at(-1)[0]({}).giderAyarlari.denemeDonemiBitis).toBe("2027-01-01");
    fireEvent.change(alan, { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set.mock.calls.at(-1)[0]({}).giderAyarlari.denemeDonemiBitis).toBe("");
  });
});

// ── Gerçek App: silme ve taşıma tek kayıtta (R23, AC-24) ──
describe("Spec 0056: gerçek App'te tek kayıt", () => {
  afterEach(() => { delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });
  it("AC-24: hesabın silinmesi ve bağların taşınması aynı kayıt yükünde; ara kayıt yok", async () => {
    vi.useRealTimers();
    const { default: App } = await import("../../src/App");
    const kayitlar = [];
    const yuklenen = { customers: [{ id: 500, name: "Kutu Gıda", model: "AK120", serialNo: "S-1", installDate: "2026-01-10", currency: "TRY" }],
      kasaHesaplari: [hes(51, "Eski Banka"), hes(52, "Yeni Banka")], hesapHareketleri: M0, payments: P0, giderTurleri: [], giderler: [],
      appSettings: { giderAyarlari: { yururlukAy: "2026-01", denemeDonemiBitis: "2099-01-01" } }, dataVersion: 1 }; // gerçek saatten bağımsız
    window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
    await new Promise(r => setTimeout(r, 800));
    fireEvent.click(screen.getAllByText("Kasa").find(e => e.closest("nav")));
    await waitFor(() => expect(satirOf("Eski Banka")).toBeTruthy());
    silAc("Eski Banka");
    fireEvent.click(screen.getByText("Hesabı Sil"));
    // Spec 0078 R2 ile güncellendi: silinen hesap çöp kutusuna gider (damgalı kalır), "silindi" = canlı listede yok.
    const canli51 = (k) => k.kasaHesaplari.some(h => h.id === 51 && !h.deletedAt);
    await waitFor(() => expect(kayitlar.some(k => !canli51(k))).toBe(true), { timeout: 3000 });
    const ilgili = kayitlar.filter(k => !canli51(k) || k.payments.some(p => p.hesapId === 52));
    expect(ilgili.every(k => !canli51(k) && k.payments[0].hesapId === 52 && k.hesapHareketleri.every(m => m.hesapId === 52))).toBe(true);
  });
});
