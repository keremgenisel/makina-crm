// @vitest-environment jsdom
// Spec 0040: gerçek App üzerinden çekle tahsilat (çek kaydı doğar), zorunlu alanlar, yinelenen çek uyarısı, çeke bağlı tahsilatın
// salt okunur durumu, perde (C7, C12) ve ciro sonrası kalan borç (R6, okuma anında).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

const MUSTERI = { id: 700, name: "ÇEKLİ FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY", faturali: "Faturasız Yurtiçi", fabrikaSatisBedeli: 50000, kalanBorc: 50000 };
const ODEME = { id: 710, customerId: 700, tarih: "2026-09-10", tutar: 12000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15", tahsilEdildi: false };
const CEK = { id: 720, paymentId: 710, no: "123456", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }] };
const veri = (o = {}) => ({ customers: [MUSTERI], payments: [], cekler: [], giderTurleri: [], giderler: [], kasaHesaplari: [], hesapHareketleri: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1, ...o });

const baslat = async (yuklenen = veri()) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const menudeMi = (ad) => screen.queryAllByText(ad).some(e => e.closest("nav"));
const detayAc = async () => {
  menu("Müşteriler");
  await waitFor(() => expect(screen.getByText("ÇEKLİ FİRMA")).toBeTruthy());
  fireEvent.click(screen.getByText("ÇEKLİ FİRMA"));
  await waitFor(() => expect(screen.getAllByText("Ödeme Ekle").length).toBeGreaterThan(0));
};
const cekliTahsilatGir = async ({ no = "555", banka = "Garanti" } = {}) => {
  await detayAc();
  fireEvent.click(screen.getAllByText("Ödeme Ekle")[0]);
  fireEvent.click(screen.getByText("+ Ödeme Ekle"));
  const satir = screen.getAllByDisplayValue("Nakit").pop().parentElement;
  fireEvent.change(satir.querySelector("select"), { target: { value: "Çek" } });
  fireEvent.change(satir.querySelector("input"), { target: { value: "7000" } });
  const alan = screen.getByTestId("cek-alanlari");
  if (no) fireEvent.change(within(alan).getByLabelText("Çek numarası"), { target: { value: no } });
  if (banka) fireEvent.change(within(alan).getByLabelText("Banka"), { target: { value: banka } });
  return alan;
};

describe("Spec 0040: çekle tahsilat (R1, R2, R14)", () => {
  it("AC-1 / AC-2: çekle tahsilat girilince çek kaydı oluşur, kaydedilir ve portföyde görünür", async () => {
    const { kayitlar } = await baslat();
    await cekliTahsilatGir();
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await waitFor(() => expect(kayitlar.some(k => k.cekler?.length === 1)).toBe(true), { timeout: 3000 });
    const son = kayitlar[kayitlar.length - 1];
    const p = son.payments.find(x => x.yontem === "Çek");
    expect(son.cekler[0]).toMatchObject({ paymentId: p.id, no: "555", banka: "Garanti", tur: "hamiline", durum: "portfoy" });
    expect(son.payments.every(x => !("_cek" in x))).toBe(true); // türetilmiş alan kayda sızmaz
    fireEvent.click(screen.getAllByText("Kapat").pop());
    menu("Kasa");
    fireEvent.click(await screen.findByRole("tab", { name: "Çek Portföyü" }));
    expect(screen.getAllByTestId("cek-satiri")[0].textContent).toMatch(/555.*Garanti.*ÇEKLİ FİRMA/);
  });
  it("AC-32: numarası ya da bankası boş çek kaydedilmez, neden yazılır", async () => {
    const { kayitlar } = await baslat();
    await cekliTahsilatGir({ no: "" });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    expect(screen.getByText("Çek numarası girilmedi.")).toBeTruthy();
    await new Promise(r => setTimeout(r, 700));
    expect(kayitlar.some(k => (k.payments || []).length > 0)).toBe(false);
  });
  it("AC-31: aynı banka ve numaralı çek uyarı verir, kayıt engellenmez", async () => {
    const { kayitlar } = await baslat(veri({ payments: [ODEME], cekler: [CEK] }));
    const alan = await cekliTahsilatGir({ no: "123456", banka: "Ziraat" });
    expect(alan.textContent).toMatch(/Aynı banka ve numaralı bir çek zaten kayıtlı/);
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await waitFor(() => expect(kayitlar.some(k => k.cekler?.length === 2)).toBe(true), { timeout: 3000 });
  });
});

describe("Spec 0040: çeke bağlı tahsilat (C10, R6)", () => {
  it("AC-25: çeke bağlı tahsilatın 'tahsil edildi' kutusu yok, durum salt okunur; zaman çizelgesinde durum rozeti", async () => {
    await baslat(veri({ payments: [ODEME], cekler: [{ ...CEK, durum: "tahsile" }] }));
    await detayAc();
    expect(screen.getByTestId("cek-durum-rozeti").textContent).toMatch(/123456: Tahsile verildi/);
    fireEvent.click(screen.getByText("Kapora/Ödeme"));
    expect(screen.getByTestId("cek-durum-salt-okunur").textContent).toMatch(/Çek durumu: Tahsile verildi.*portföyünden yönetilir/);
    expect(screen.queryByText(/Çek henüz tahsil edilmedi/)).toBeNull();
    expect(screen.getByDisplayValue("123456")).toBeTruthy(); // çek alanları düzenlenebilir
  });
  it("AC-23 / AC-10: ciro edilen çek müşterinin kalan borcunu çek tutarı kadar azaltır (okuma anında)", async () => {
    await baslat(veri({ payments: [ODEME], cekler: [{ ...CEK, durum: "ciro", gecmis: [...CEK.gecmis, { tarih: "2026-10-02", durum: "ciro", not: "Ciro: X" }] }] }));
    await detayAc();
    const kalan = screen.getAllByText(/KALAN BORÇ/i)[0].parentElement.textContent;
    expect(kalan).toMatch(/38\.000/);
    cleanup();
    await baslat(veri({ payments: [ODEME], cekler: [CEK] }));
    await detayAc();
    expect(screen.getAllByText(/KALAN BORÇ/i)[0].parentElement.textContent).toMatch(/50\.000/);
  });
});

describe("Spec 0040: perde ve görünürlük (C7, C12, R13)", () => {
  it("AC-19: perde inikken Kasa (portföy) görünmez ama çekle tahsilat girilir ve çek kaydı oluşur", async () => {
    perde.indi = true;
    const { kayitlar } = await baslat();
    expect(menudeMi("Kasa")).toBe(false);
    await cekliTahsilatGir();
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await waitFor(() => expect(kayitlar.some(k => k.cekler?.length === 1)).toBe(true), { timeout: 3000 });
  });
  it("AC-18: yalnız gider ya da yalnız finans sekmeli kullanıcı Kasa'yı (çek portföyünü) görmez", async () => {
    for (const tabs of [["dashboard", "gider"], ["dashboard", "finance"]]) {
      const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify({ tabs }), username: "u" }) };
      window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
      await baslat();
      expect(menudeMi("Kasa")).toBe(false);
      cleanup();
    }
  });
});

describe("Spec 0040 triyajı: 30 günlük otomatik çöp temizliği ve yetim çek", () => {
  const ESKI = "2026-01-01T10:00:00.000Z"; // saklama süresini çoktan aşmış silme damgası
  const copteMusteri = { id: 760, name: "ÇÖPTEKİ FİRMA", model: "AK100", deletedAt: ESKI };
  const ciroOdeme = { id: 761, customerId: 760, tarih: "2025-12-01", tutar: 9000, currency: "TRY", yontem: "Çek", deletedAt: ESKI };
  const ciroCek = { id: 762, paymentId: 761, no: "9", banka: "Akbank", tur: "hamiline", durum: "ciro", gecmis: [] };
  const eskiOdeme = { id: 770, customerId: 700, tarih: "2025-12-01", tutar: 3000, currency: "TRY", yontem: "Çek", deletedAt: ESKI };
  const eskiCek = { id: 771, paymentId: 770, no: "777", banka: "Garanti", tur: "hamiline", durum: "portfoy", gecmis: [] };
  const yukle = () => baslat(veri({ customers: [MUSTERI, copteMusteri], payments: [ciroOdeme, eskiOdeme], cekler: [ciroCek, eskiCek] }));
  it("ciro edilmiş çeke bağlı tahsilat ve müşterisi silinmez, ötekisi silinir (Çöp Kutusu'nda görünür)", async () => {
    await yukle();
    menu("Ayarlar");
    fireEvent.click(screen.getAllByText("Veri Yönetimi").filter(e => !e.closest("nav"))[0]);
    fireEvent.click(screen.getAllByText("Çöp Kutusu").pop());
    await waitFor(() => expect(screen.getByText("Çöp Kutusunu Boşalt")).toBeTruthy());
    expect(screen.getByText("ÇÖPTEKİ FİRMA")).toBeTruthy();
    expect(screen.getByText(/ÇÖPTEKİ FİRMA · ₺9\.000/)).toBeTruthy();
    expect(screen.queryByText(/₺3\.000/)).toBeNull();
  });
  it("tahsilatı otomatik temizlikte gitmiş çek yinelenen çek uyarısı vermez", async () => {
    await yukle();
    const alan = await cekliTahsilatGir({ no: "777", banka: "Garanti" });
    expect(alan.textContent).not.toMatch(/zaten kayıtlı/);
    fireEvent.change(within(alan).getByLabelText("Banka"), { target: { value: "Akbank" } });
    fireEvent.change(within(alan).getByLabelText("Çek numarası"), { target: { value: "9" } });
    expect(alan.textContent).toMatch(/zaten kayıtlı/); // korunan (ciro edilmiş) çek sayılmaya devam eder
  });
});
