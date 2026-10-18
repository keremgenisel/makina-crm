// @vitest-environment jsdom
// Spec 0092: gerçek App. Anasayfa'nın Gider Ödemeleri kartı üç sayı (R25), pencerenin üçüncü bölümü (R25, R30), personel ve
// SGK kalemi bulunan veride gizlilik ekranda ölçülür (R43 (b), AC-50/2), ödeme hatırlatıcısının sayıları değişmez (AC-56),
// eşik değişince liste aynı turda (AC-62), gider yetkisi olmayan kullanıcıda kart yok (AC-57). Tarihler bugüne göre kurulur:
// kapsamı on iki ay olan kalem on bir ay önce ödenmiş, kapsamı bu ayın sonunda biter (bugünden en çok 30 gün sonra).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";
import { ayEkle, ayinSonGunu } from "../../src/lib/gider";
import { gunFarki } from "../../src/lib/odemeHatirlatma";

const { default: App } = await import("../../src/App");
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const bugun = yerelBugun();
const buAy = bugun.slice(0, 7);
const ilkAy = ayEkle(buAy, -11);
const KALAN = gunFarki(bugun, ayinSonGunu(buAy));
const TURLER = [{ id: 1, ad: "İnternet", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 5, ad: "SGK", davranis: "sgk" }];
const k = (id, o) => ({ id, tarih: `${ilkAy}-01`, kdvOrani: 20, modelSatirlari: [], taksitler: [], ...o });
const INTERNET = k(1, { turId: 1, tutar: 24000, dagitimAy: 12, odendi: true, aciklama: "Yıllık internet" });
const BORC = k(2, { turId: 1, tutar: 500, tarih: bugun, sonOdemeTarihi: bugun, aciklama: "Elektrik" });
// Ayırt edici çalışan adı ve tutarları (K11): kapsam taşıyan personel ve SGK kalemi listede hiçbir koşulda görünmez.
const PERSONEL = k(3, { turId: 3, calisanId: 9, calisanAd: "Gizli Çalışan", resmiTutar: 31337, eldenTutar: 7771, tutar: null, dagitimAy: 12, odendi: true });
const SGK = k(4, { turId: 5, tutar: 4242, kdvOrani: 0, dagitimAy: 12, odendi: true });
const veri = (giderler, giderAyarlari = {}) => ({ customers: [], giderTurleri: TURLER, tedarikciler: [], giderler, hesapHareketleri: [], giderTanimlari: [], kasaHesaplari: [],
  appSettings: { giderAyarlari: { yururlukAy: "2020-01", hatirlatmaEsikGun: 7, ...giderAyarlari } }, dataVersion: 1 });

const baslat = async (yuklenen, sunucu = null) => {
  window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, kk) => o[kk] ?? (String(kk).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const sayi = (id) => screen.getByTestId(id).firstChild.textContent;

describe("Spec 0092: gerçek App, Anasayfa", () => {
  it("AC-42 / AC-43 / AC-50 / AC-50/2: kart üçüncü sayıda kalemi sayar; pencerede listelenir; personel ve SGK kalemi ve çalışan bilgisi ekranda yok", async () => {
    await baslat(veri([INTERNET, BORC, PERSONEL, SGK]));
    await waitFor(() => expect(screen.getByTestId("hatirlatma-kapsam-sayi")).toBeTruthy());
    expect(sayi("hatirlatma-kapsam-sayi")).toBe("1");
    fireEvent.click(screen.getByTestId("odeme-hatirlatma-karti"));
    const b = await screen.findByTestId("hatirlatma-bolum-kapsam");
    const satirlar = within(b).getAllByTestId("hatirlatma-kapsam-satiri");
    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].textContent).toContain("Yıllık internet");
    expect(satirlar[0].textContent).toContain(KALAN === 0 ? "bugün" : `${KALAN} gün kaldı`);
    const metin = document.body.textContent;
    for (const yasak of ["Gizli Çalışan", "31.337", "7.771", "38.108", "4.242"]) expect(metin, yasak).not.toContain(yasak);
  });
  it("AC-56: ödeme hatırlatıcısının iki sayısı kapsamlı kalem eklenince değişmez", async () => {
    await baslat(veri([BORC]));
    await waitFor(() => expect(screen.getByTestId("hatirlatma-yaklasan-sayi")).toBeTruthy());
    const once = [sayi("hatirlatma-gecmis-sayi"), sayi("hatirlatma-yaklasan-sayi")];
    expect(sayi("hatirlatma-kapsam-sayi")).toBe("0");
    cleanup();
    await baslat(veri([BORC, INTERNET]));
    await waitFor(() => expect(screen.getByTestId("hatirlatma-yaklasan-sayi")).toBeTruthy());
    expect([sayi("hatirlatma-gecmis-sayi"), sayi("hatirlatma-yaklasan-sayi")]).toEqual(once);
    expect(sayi("hatirlatma-kapsam-sayi")).toBe("1");
  });
  it("AC-62: eşik Gider Ayarları'nda değişince kart aynı turda yeni eşikle hesaplanır", async () => {
    await baslat(veri([INTERNET]));
    await waitFor(() => expect(sayi("hatirlatma-kapsam-sayi")).toBe("1"));
    menu("Ayarlar");
    // Ayarlar menüsünün katlanır grubu (adı ok işaretiyle biter; kenar çubuğundaki Giderler düğmesinde ok yok).
    if (!screen.queryByRole("button", { name: "Gider Ayarları" })) fireEvent.click(screen.getByRole("button", { name: /^Giderler\s*[▸▾]$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Gider Ayarları" }));
    fireEvent.change(screen.getByLabelText("Kapsam bitişi hatırlatma eşiği (gün)"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Kaydet"));
    menu("Anasayfa");
    await waitFor(() => expect(screen.getByTestId("hatirlatma-kapsam-sayi").textContent).toContain("± 0 gün"));
    expect(sayi("hatirlatma-kapsam-sayi")).toBe(KALAN === 0 ? "1" : "0");
  });
  it("AC-57: gider yetkisi olmayan kullanıcıda kart ve pencere hiç çizilmez", async () => {
    await baslat(veri([INTERNET]), { tabs: ["dashboard", "customers"] });
    expect(screen.queryByTestId("odeme-hatirlatma-karti")).toBeNull();
    expect(screen.queryByTestId("hatirlatma-kapsam-sayi")).toBeNull();
  });
});
