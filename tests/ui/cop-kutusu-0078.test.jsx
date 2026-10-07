// @vitest-environment jsdom
// Spec 0078: kasa ve gider kayıtları çöp kutusunda. Çöp Kutusu'nda altı satır türü (geri alma, kalıcı silme, boşaltma,
// ad çakışması, çek koruması, yetki kapısı, etiket gizliliği) ve gerçek App'te ödemenin çöpe gidip geri gelmesi.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { BAGLI_HAREKETLI_CEK_NEDENI } from "../../src/lib/cek";
import { yerelBugun } from "../../src/lib/utils";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });
const noop = () => {};
const bos = [];
const Z = "2026-10-07T09:00:00.000Z";
const TURLER = [{ id: 1, ad: "Personel", davranis: "personel" }, { id: 9, ad: "Elektrik", davranis: "normal" }];

const VARSAYILAN = {
  hareketler: [{ id: 71, tur: "odeme", tarih: "2026-09-05", tutar: 400, hesapId: 51, giderId: 5, deletedAt: Z },
    { id: 72, tur: "avans", tarih: "2026-09-06", tutar: 1500, calisanId: 7, calisanAd: "Ahmet Yılmaz", aciklama: "Ahmet'e avans", hesapId: 51, deletedAt: Z }],
  cekler: [{ id: 30, paymentId: null, yon: "alinan", no: "123", banka: "Ziraat", kesideci: "Ali Veli", tutar: 5, durum: "portfoy", gecmis: [], deletedAt: Z }],
  tanimlar: [{ id: 81, turId: 9, ad: "İnternet", baslangicAy: "2026-01", deletedAt: Z }, { id: 82, turId: 1, ad: "Mehmet Kaya", calisanId: 8, baslangicAy: "2026-01", deletedAt: Z }],
  turler: [...TURLER, { id: 3, ad: "Sigorta", davranis: "normal", deletedAt: Z }],
  standart: [{ id: 91, grupId: 91, ad: "Kira", tutar: 100, baslangicAy: "2026-01", bitisAy: "2026-06", deletedAt: Z }, { id: 92, grupId: 91, ad: "Kira", tutar: 120, baslangicAy: "2026-07", bitisAy: null, deletedAt: Z }],
  hesaplar: [{ id: 52, ad: "Eski Kasa", tur: "kasa", paraBirimi: "TRY", deletedAt: Z }],
};
const TUM_IZIN = null; // izin tanımsız = tam erişim

function H({ v = VARSAYILAN, giderYetki = true, kasaVeriYetki = true, perms = TUM_IZIN, onState, showToast = noop, giderler = bos }) {
  const [hareketler, setHareketler] = useState(v.hareketler);
  const [cekler, setCekler] = useState(v.cekler);
  const [tanimlar, setTanimlar] = useState(v.tanimlar);
  const [turler, setTurler] = useState(v.turler);
  const [standart, setStandart] = useState(v.standart);
  const [hesaplar, setHesaplar] = useState(v.hesaplar);
  onState?.({ hareketler, cekler, tanimlar, turler, standart, hesaplar });
  return <SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
    rawKalipDefs={bos} rawParts={bos} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
    setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop} setKalipDefs={noop}
    setParts={noop} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
    appSettings={{}} showToast={showToast} giderYetki={giderYetki} rawGiderler={giderler} setGiderler={noop} giderTurleri={turler}
    rawTedarikciler={bos} setTedarikciler={noop} rawUretimPartileri={bos} setUretimPartileri={noop} serverPermissions={perms}
    rawHesapHareketleri={hareketler} setHesapHareketleri={setHareketler} cekler={cekler} setCekler={setCekler}
    rawGiderTanimlari={tanimlar} setGiderTanimlari={setTanimlar} setGiderTurleri={setTurler}
    rawStandartGiderler={standart} setStandartGiderler={setStandart} rawKasaHesaplari={hesaplar} setKasaHesaplari={setHesaplar} kasaVeriYetki={kasaVeriYetki} />;
}
const satirTur = (tur) => screen.getAllByRole("row").filter(r => within(r).queryAllByText(tur).length && r.querySelector("td"));

describe("Spec 0078 D: Çöp Kutusu'nda altı satır türü", () => {
  it("AC-1, AC-3, AC-4, AC-5: ödeme, avans, çek, tanım, tür, standart gider ve hesap görünür ve geri alınır", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    for (const t of ["Ödeme", "Avans", "Çek", "Tekrarlayan Tanım", "Gider Türü", "Standart Gider", "Kasa Hesabı"]) expect(satirTur(t).length, t).toBeGreaterThan(0);
    expect(satirTur("Standart Gider")).toHaveLength(1); // R38: grup başına tek satır
    for (const r of screen.getAllByRole("row").filter(r => r.querySelector("td"))) fireEvent.click(within(r).getByText("Geri Al"));
    expect(st.hareketler.every(h => h.deletedAt === undefined)).toBe(true);
    expect(st.cekler[0].deletedAt).toBeUndefined();
    expect(st.tanimlar.every(t => t.deletedAt === undefined)).toBe(true);
    expect(st.turler.find(t => t.id === 3).deletedAt).toBeUndefined();
    expect(st.standart.every(s => s.deletedAt === undefined)).toBe(true);
    expect(st.hesaplar[0].deletedAt).toBeUndefined();
    expect(screen.getByText("Çöp kutusu boş.")).toBeTruthy();
  });
  it("AC-6, AC-46: etiketler kaydı tanıtır; çalışan adı, açıklama ve keşideci geçmez (personel tanımında yalnız tür)", () => {
    render(<H />);
    const metin = document.body.textContent;
    for (const yasak of ["Ahmet", "Mehmet Kaya", "Ali Veli"]) expect(metin, yasak).not.toContain(yasak);
    expect(metin).toContain("Ziraat · 123");
    expect(metin).toContain("Elektrik · İnternet");
    expect(metin).toContain("Eski Kasa · Kasa");
  });
  it("AC-7: aynı adda canlı tür, hesap ya da standart gider varken geri alma yapılmaz ve nedeni söylenir", () => {
    const toast = vi.fn(); let st;
    const v = { ...VARSAYILAN, turler: [...VARSAYILAN.turler, { id: 4, ad: "sigorta", davranis: "normal" }],
      hesaplar: [...VARSAYILAN.hesaplar, { id: 53, ad: "eski kasa", tur: "kasa", paraBirimi: "TRY" }],
      standart: [...VARSAYILAN.standart, { id: 93, grupId: 93, ad: "KİRA", tutar: 1, baslangicAy: "2026-09" }] };
    render(<H v={v} showToast={toast} onState={s => { st = s; }} />);
    fireEvent.click(within(satirTur("Gider Türü")[0]).getByText("Geri Al"));
    fireEvent.click(within(satirTur("Kasa Hesabı")[0]).getByText("Geri Al"));
    fireEvent.click(within(satirTur("Standart Gider")[0]).getByText("Geri Al"));
    expect(st.turler.find(t => t.id === 3).deletedAt).toBe(Z);
    expect(st.hesaplar.find(h => h.id === 52).deletedAt).toBe(Z);
    expect(st.standart.filter(s => s.grupId === 91).every(s => s.deletedAt === Z)).toBe(true);
    expect(toast.mock.calls.map(c => c[0]).join("|")).toMatch(/gider türü zaten var.*kasa hesabı zaten var.*standart gider zaten var/);
  });
  it("AC-9, AC-44: kalıcı silme kaydı diziden çıkarır; çeke bağlı canlı hareketi olan çekte Kalıcı Sil yok ve neden yazılır", () => {
    let st;
    const v = { ...VARSAYILAN, hareketler: [...VARSAYILAN.hareketler, { id: 73, tur: "odeme", tarih: "2026-09-07", tutar: 5, cekId: 30, giderId: 5 }] };
    render(<H v={v} onState={s => { st = s; }} />);
    const cek = satirTur("Çek")[0];
    expect(within(cek).queryByText("Kalıcı Sil")).toBeNull();
    expect(within(cek).getByTestId("cop-neden").textContent).toBe(BAGLI_HAREKETLI_CEK_NEDENI);
    fireEvent.click(within(satirTur("Tekrarlayan Tanım")[0]).getByText("Kalıcı Sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.tanimlar).toHaveLength(1);
    // AC-45: "çöpü boşalt" altı bölümün çöptekilerini temizler; korunan çek ve canlı hareket kalır.
    fireEvent.click(screen.getByText("Çöp Kutusunu Boşalt"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.hareketler.map(h => h.id)).toEqual([73]);
    expect(st.cekler.map(c => c.id)).toEqual([30]);
    expect(st.tanimlar).toEqual([]);
    expect(st.turler.map(t => t.id)).toEqual([1, 9]);
    expect(st.standart).toEqual([]);
    expect(st.hesaplar).toEqual([]);
  });
  it("AC-26: gider yetkisi yoksa altı türün satırı yok ve boşaltma onlara dokunmaz; kasa yetkisi yoksa hesap ve çek satırı yok", () => {
    let st;
    render(<H giderYetki={false} onState={s => { st = s; }} />);
    expect(screen.getByText("Çöp kutusu boş.")).toBeTruthy();
    cleanup();
    render(<H kasaVeriYetki={false} onState={s => { st = s; }} />);
    expect(satirTur("Kasa Hesabı")).toHaveLength(0);
    expect(satirTur("Çek")).toHaveLength(0);
    // Avans Kasa ister (R27): kasa yetkisi yoksa satır görünür, düğme yok; boşaltma ona dokunmaz.
    expect(within(satirTur("Avans")[0]).queryByText("Geri Al")).toBeNull();
    fireEvent.click(screen.getByText("Çöp Kutusunu Boşalt"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.hareketler.map(h => h.id)).toEqual([72]);
    expect(st.cekler).toHaveLength(1);
    expect(st.hesaplar).toHaveLength(1);
  });
  it("triyaj (bulgu 1): yeniden girilmiş ödemenin çöpteki kopyası geri alınamaz; neden söylenir, kayıt çöpte kalır", () => {
    const toast = vi.fn(); let st;
    const kalem = { id: 5, turId: 9, tarih: "2026-09-01", tutar: 400, kdvOrani: 0, modelSatirlari: [] };
    const v = { ...VARSAYILAN, hareketler: [VARSAYILAN.hareketler[0], { id: 74, tur: "odeme", tarih: "2026-09-08", tutar: 400, hesapId: 51, giderId: 5 }] };
    render(<H v={v} giderler={[kalem]} showToast={toast} onState={s => { st = s; }} />);
    fireEvent.click(within(satirTur("Ödeme")[0]).getByText("Geri Al"));
    expect(st.hareketler.find(h => h.id === 71).deletedAt).toBe(Z);
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/^Geri alınamadı: Kalandan fazla ödeme/), "err");
  });
  it("AC-24, R27: izin listesi dar kullanıcıda düğmeler türün iznine bağlı (gider_odeme'siz ödeme satırında düğme yok)", () => {
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa", "settings"], giderActions: ["avans"] }) };
    render(<H perms={perms} />);
    expect(within(satirTur("Ödeme")[0]).queryByText("Geri Al")).toBeNull();
    expect(within(satirTur("Avans")[0]).getByText("Geri Al")).toBeTruthy();
    expect(within(satirTur("Tekrarlayan Tanım")[0]).queryByText("Geri Al")).toBeNull();
  });
});

// ── Gerçek App: ödeme çöpe gider, bakiye döner, çöpten geri alınınca eski hâline gelir (AC-1, AC-2, R19) ──
const buAy = yerelBugun().slice(0, 7);
const veri = (o = {}) => ({
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Demir Bant" }],
  giderler: [{ id: 1, tarih: `${buAy}-01`, turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 11, aciklama: "Bant alımı", modelSatirlari: [], taksitler: [] }],
  kasaHesaplari: [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 50000, acilisTarihi: `${buAy}-01`, kapali: false }],
  hesapHareketleri: [{ id: 61, tur: "odeme", tarih: `${buAy}-02`, tutar: 12000, yontem: "Havale", hesapId: 51, giderId: 1 }],
  giderTanimlari: [], standartGiderler: [], cekler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1, ...o,
});
const baslat = async (yuklenen = veri(), sunucu = null) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "admin", username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const hesapSatiri = (ad) => screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad));

describe("Spec 0078 gerçek App", () => {
  it("AC-1, AC-2, R19: Kasa'dan silinen ödeme çöp kutusuna gider, bakiye döner; çöpten geri alınınca bakiye ve kalem eski hâline gelir", async () => {
    const { kayitlar } = await baslat();
    menu("Kasa");
    await waitFor(() => expect(hesapSatiri("Ziraat")).toBeTruthy());
    expect(hesapSatiri("Ziraat").textContent).toMatch(/38\.000/);
    fireEvent.click(hesapSatiri("Ziraat"));
    fireEvent.click(await screen.findByLabelText(/Hareketi sil:/));
    expect(screen.getByText(/çöp kutusuna taşınacak/)).toBeTruthy();
    fireEvent.click(screen.getAllByText("Sil").filter(e => e.closest("button")).pop());
    await waitFor(() => expect(hesapSatiri("Ziraat").textContent).toMatch(/50\.000/));
    await waitFor(() => expect(kayitlar.some(k => k.hesapHareketleri?.[0]?.deletedAt)).toBe(true), { timeout: 3000 });
    menu("Ayarlar");
    fireEvent.click(screen.getAllByText("Veri Yönetimi").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText("Çöp Kutusu").pop());
    const satir = (await screen.findAllByRole("row")).find(r => within(r).queryByText("Ödeme") && r.querySelector("td"));
    fireEvent.click(within(satir).getByText("Geri Al"));
    menu("Kasa");
    await waitFor(() => expect(hesapSatiri("Ziraat").textContent).toMatch(/38\.000/));
    await waitFor(() => expect(kayitlar.at(-1).hesapHareketleri[0].deletedAt).toBeUndefined(), { timeout: 3000 });
  });
  it("AC-36, R7: hareket bölümünü göndermeyen sunucuda ödeme girişi kapalı kalır ve uyarı görünür (canlı türetme kapıyı bozmaz)", async () => {
    const v = veri(); delete v.hesapHareketleri;
    await baslat(v, true);
    menu("Giderler");
    await waitFor(() => expect(screen.getByTestId("hareket-bolumu-yok")).toBeTruthy());
  });
});
