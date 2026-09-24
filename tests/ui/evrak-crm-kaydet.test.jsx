// @vitest-environment jsdom
// Spec 0006: Evrak'tan "CRM'e Kaydet" uçtan uca (gerçek App): tek düğme, makina formu sonrası devam, özet,
// üretilen kayıtlar, Anasayfa'dan başlatma. Kayıtlar yerel moddaki save çağrısından okunur.
import { describe, it, expect, afterEach, vi, beforeAll } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import App from "../../src/App";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); vi.useRealTimers(); });

const alt = (id, type, o = {}) => ({ id, type, kod: "", makinaAdi: o.ad || "", tanim: "", miktar: String(o.miktar ?? 1), birimFiyat: String(o.fiyat ?? 0), tlKarsiligi: "" });
const makina = (id, fiyat = 60000) => ({ rowId: `r-${id}`, pickTip: "makina", selectedModel: "AK100_DS", selectedKalip: "", selectedPart: "", subItems: [alt(id, "makina", { ad: "AK100_DS", fiyat })] });
const parca = (id, o = {}) => ({ rowId: `r-${id}`, pickTip: "parca", selectedModel: "", selectedKalip: "", selectedPart: o.partId ?? "7", subItems: [alt(id, "parca", { ad: o.ad || "Bant Motoru", fiyat: o.fiyat ?? 1000, miktar: o.miktar ?? 2 })] });
const kalip = (id, rol) => ({ rowId: `r-${id}`, pickTip: "kalip", selectedModel: "", selectedKalip: "Hamburger", selectedPart: "", kalipRolu: rol, subItems: [alt(id, "kalip", { ad: "Hamburger", fiyat: 10000 })] });
const teklif = (satirlar, o = {}) => ({ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", dil: "TR", currency: "TRY", durum: "onaylandi", firma: "Kutu Gıda",
  yetkili: "Ali", tel: "0500", adres: "", email: "", country: "Türkiye", city: "İzmir", iskonto: "", kdvOrani: "20", satirlar, createdAt: "2026-09-20T10:00:00", ...o });

function kur(veri) {
  const kayitlar = [];
  window.crmStorage = {
    load: vi.fn(async () => ({ dataVersion: 1, appSettings: {}, standardModels: [{ model: "AK100_DS" }], parts: [{ id: 7, ad: "Bant Motoru" }], partStock: [{ id: 1, partId: "7", miktar: 10 }], ...veri })),
    save: vi.fn(async (d) => { kayitlar.push(d); return true; }),
    getVersion: vi.fn(async () => 1),
  };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  return { son: () => kayitlar[kayitlar.length - 1] };
}
// App yüklemeden sonraki 700 ms içinde kaydı bastırır (bkz. app-kayit-sirasi); eylemler bundan sonra.
const yuklemeyiBekle = async () => { await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled()); await new Promise(r => setTimeout(r, 800)); };
const evrakAc = async () => {
  await yuklemeyiBekle();
  await waitFor(() => expect(screen.getAllByText("Evrak Yönetimi").length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByText("Evrak Yönetimi")[0]);
  await waitFor(() => expect(screen.getByText("2026-00001")).toBeTruthy());
};
const satirKaydet = () => fireEvent.click(within(screen.getByText("2026-00001").closest("tr")).getByTitle("CRM'e Kaydet"));

describe("Evrak → CRM'e Kaydet (gerçek App)", { timeout: 15000 }, () => {
  it("AC-41 / AC-1 / AC-10: karma belgede önce müşteri formu; form kaydedilince yedek parça yeni müşteriye bağlanır ve özet çıkar", async () => {
    const { son } = kur({ customers: [], teklifler: [teklif([makina("m1"), parca("p1")])] });
    await evrakAc();
    satirKaydet();
    // Müşteri formu ön doldurulmuş açıldı (satış yapan fabrika, model ve bedel).
    await waitFor(() => expect(screen.getByDisplayValue("Kutu Gıda")).toBeTruthy());
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(screen.getByTestId("uretim-ozeti")).toBeTruthy());
    const ozet = screen.getByTestId("ozet-uretilen").textContent;
    expect(ozet).toMatch(/Makina kaydı/);
    expect(ozet).toMatch(/Yedek parça satışı · Bant Motoru/);
    await waitFor(() => {
      const d = son();
      expect(d).toBeTruthy();
      const musteri = d.customers.find(c => c.name === "Kutu Gıda");
      expect(musteri).toBeTruthy();
      expect(d.yedekParcaSatislar[0]).toMatchObject({ aliciTipi: "musteri", musteriId: musteri.id, partId: "7", miktar: 2, teklifId: 900, kargoDurum: "" });
      expect(d.teklifler[0].uretilenKalemler.sort()).toEqual(["m1", "p1"]);
      expect(d.partStock[0].miktar).toBe(8);
    }, { timeout: 4000 });
  });

  it("AC-18 / AC-43 / AC-30: kaydedilen belge 'Kaydedildi'; üretilen kayıtlar listelenir; tekrar kaydetme düğmesi yok, stok ikinci kez düşmez", async () => {
    const { son } = kur({ customers: [{ id: 500, name: "Kutu Gıda", model: "AK100_DS" }], teklifler: [teklif([parca("p1")], { customerId: 500 })] });
    await evrakAc();
    satirKaydet();
    await waitFor(() => expect(screen.getByTestId("uretim-ozeti")).toBeTruthy());
    fireEvent.click(within(screen.getByTestId("uretim-ozeti").closest("[role=dialog]") || document.body).getAllByText("Kapat").pop());
    await waitFor(() => expect(within(screen.getByText("2026-00001").closest("tr")).getByText("✓ Kaydedildi")).toBeTruthy());
    expect(within(screen.getByText("2026-00001").closest("tr")).queryByTitle("CRM'e Kaydet")).toBeNull();
    fireEvent.click(screen.getByTestId("uretilen-kayitlar-dugmesi"));
    expect(screen.getByTestId("uretilen-kayitlar").textContent).toMatch(/Yedek parça · Bant Motoru × 2/);
    await waitFor(() => expect(son()?.partStock[0].miktar).toBe(8), { timeout: 4000 });
  });

  it("AC-42: Anasayfa teklif kartından başlatılınca da özet gösterilir", async () => {
    kur({ customers: [{ id: 500, name: "Kutu Gıda" }], teklifler: [teklif([parca("p1")], { customerId: 500 })] });
    await yuklemeyiBekle();
    await waitFor(() => expect(screen.getByText(/İşlem Bekleyen Onaylı Teklifler \(1\)/)).toBeTruthy());
    fireEvent.click(screen.getByText("CRM'e Kaydet"));
    await waitFor(() => expect(screen.getByTestId("uretim-ozeti").textContent).toMatch(/Yedek parça satışı/));
  });

  it("AC-26 / AC-27 / triyaj bulgu 3: yalnız bant veya boş belge beklemez: 'Kayıt gerektirmiyor', düğme yok, Anasayfa listesinde yok", async () => {
    kur({ customers: [{ id: 500, name: "Kutu Gıda" }], teklifler: [teklif([{ rowId: "b", pickTip: "", subItems: [alt("b1", "bant", { fiyat: 100 })] }], { customerId: 500 })] });
    await yuklemeyiBekle();
    await waitFor(() => expect(screen.getByText(/İşlem Bekleyen Onaylı Teklifler \(0\)/)).toBeTruthy());
    await evrakAc();
    const satir = screen.getByText("2026-00001").closest("tr");
    expect(within(satir).getByTestId("kayit-gerektirmiyor")).toBeTruthy();
    expect(within(satir).queryByTitle("CRM'e Kaydet")).toBeNull();
  });

  it("triyaj bulgu 1: bağlı makina kaydı olan (listeye yazılamamış) belgede form ikinci kez açılmaz; kalan parça üretilir ve kanıt listeye yazılır", async () => {
    const { son } = kur({ customers: [{ id: 501, name: "Kutu Gıda", model: "AK100_DS", fromTeklifId: 900 }], teklifler: [teklif([makina("m1"), parca("p1")], { customerId: 501 })] });
    await evrakAc();
    satirKaydet();
    await waitFor(() => expect(screen.getByTestId("uretim-ozeti").textContent).toMatch(/Yedek parça satışı/));
    expect(screen.queryByDisplayValue("AK100_DS")).toBeNull(); // müşteri formu açılmadı
    await waitFor(() => {
      const d = son();
      expect(d).toBeTruthy();
      expect([...d.teklifler[0].uretilenKalemler].sort()).toEqual(["m1", "p1"]);
      expect(d.customers.filter(c => c.fromTeklifId === 900)).toHaveLength(1);
    }, { timeout: 4000 });
  });
});
