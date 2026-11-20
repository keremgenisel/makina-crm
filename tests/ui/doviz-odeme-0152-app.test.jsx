// @vitest-environment jsdom
// Spec 0152 R4/2, P8 (AC-32, AC-25, AC-26): gerçek App. Günün kuru App'in kur isteğinden dört yola iner (Anasayfa'nın ödeme
// penceresi, Giderler'in ödeme penceresi ve gider formu, Kasa'nın Virman / Bozdurma penceresi) ve aynı öneriyi verir; döviz
// ödeme kaydın gövdesine beş alandan yalnız dolu olanlarla girer, döviz hareketi olmayan hareket gövdesi değişmez.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const bugun = yerelBugun();
const buAy = bugun.slice(0, 7);
const veri = () => ({
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Demir Bant" }],
  giderler: [{ id: 1, tarih: `${buAy}-01`, turId: 1, tutar: 3550, kdvOrani: 0, odendi: false, tedarikciId: 11, aciklama: "Bant alımı", sonOdemeTarihi: bugun, modelSatirlari: [], taksitler: [] }],
  kasaHesaplari: [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 50000, acilisTarihi: `${buAy}-01`, kapali: false },
    { id: 52, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 1000, acilisTarihi: `${buAy}-01`, kapali: false }],
  hesapHareketleri: [],
  giderTanimlari: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1,
});
const baslat = async () => {
  const kayitlar = [];
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(veri())),
    save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
    getVersion: vi.fn(async () => 1),
  };
  // Günün kuru: 1 USD = 35,5 TL (App "1 birim kaç TL" kurar).
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ rates: { TRY: 35.5, EUR: 0.9 } }) })));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const dolarSec = (kap) => fireEvent.change(within(kap).getAllByLabelText(/hesab|^Hesap$/i).find(s => [...s.options].some(o => o.value === "52")), { target: { value: "52" } });

describe("Spec 0152: günün kuru dört yola iner (gerçek App)", () => {
  it("AC-32: Anasayfa ve Giderler'in ödeme penceresi, gider formu ve Kasa'nın bozdurma penceresi aynı öneriyi gösterir", async () => {
    await baslat();
    // 1. Anasayfa'nın ödeme penceresi.
    fireEvent.click(screen.getByTestId("odeme-hatirlatma-karti"));
    fireEvent.click(within(screen.getAllByTestId("hatirlatma-satiri")[0]).getByTitle("Ödeme kaydet"));
    let p = screen.getByTestId("odeme-kayit-penceresi");
    dolarSec(p);
    expect(within(p).getByLabelText("Kur").value).toBe("35,5");
    fireEvent.click(within(p.closest("[role=dialog]") || document.body).getAllByRole("button", { name: /İptal|Vazgeç|Kapat/ }).pop());
    cleanup(); await baslat();
    // 2. Giderler'in ödeme penceresi.
    menu("Giderler");
    await waitFor(() => expect(screen.getByTestId("kalem-listesi")).toBeTruthy());
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödeme kaydet"));
    p = screen.getByTestId("odeme-kayit-penceresi");
    dolarSec(p);
    expect(within(p).getByLabelText("Kur").value).toBe("35,5");
    cleanup(); await baslat();
    // 3. Gider formu.
    menu("Giderler");
    fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]);
    fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "100" } });
    fireEvent.click(screen.getByLabelText("Tedarikçiye ödendi"));
    fireEvent.change(screen.getByLabelText("Tedarikçiye hesabı"), { target: { value: "52" } });
    expect(screen.getByLabelText("Tedarikçiye kuru").value).toBe("35,5");
    cleanup(); await baslat();
    // 4. Kasa'nın Virman / Bozdurma penceresi (USD → TL).
    menu("Kasa");
    fireEvent.click(screen.getByRole("button", { name: /^Virman/ }));
    const f = screen.getByTestId("virman-formu");
    fireEvent.change(f.querySelectorAll("select")[0], { target: { value: "52" } });
    fireEvent.change(f.querySelectorAll("select")[1], { target: { value: "51" } });
    expect(within(f).getByLabelText("Bozdurma kuru").value).toBe("35,5");
  });
  it("AC-25 / AC-26: döviz ödeme kayıt gövdesine dört alanla girer; döviz olmayan hareketlerde beş alan yok", async () => {
    const { kayitlar } = await baslat();
    menu("Giderler");
    await waitFor(() => expect(screen.getByTestId("kalem-listesi")).toBeTruthy());
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödeme kaydet"));
    const p = screen.getByTestId("odeme-kayit-penceresi");
    dolarSec(p);
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    await waitFor(() => expect(kayitlar.some(k => (k.hesapHareketleri || []).length)).toBe(true), { timeout: 3000 });
    const m = kayitlar.at(-1).hesapHareketleri.at(-1);
    expect(m).toMatchObject({ tur: "odeme", tutar: 3550, dovizTutar: 100, kur: 35.5, paraBirimi: "USD", hesapId: 52 });
    expect(m).not.toHaveProperty("karsiTutar");
    expect(m).not.toHaveProperty("karsiParaBirimi");
    expect(m).not.toHaveProperty("kurKaynak"); // formun geçici alanı kayda girmez
  });
});
