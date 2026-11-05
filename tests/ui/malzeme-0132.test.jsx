// @vitest-environment jsdom
// Spec 0132: Ayarlar › Katalog › Malzemeler paneli (gerçek Settings, App gibi bağlanır: panele canlı dizi, `rawMalzemeler` ham dizi),
// fiyat güncelleme penceresi, Çöp Kutusu (gerçek SettingsTrash) ve panel kilidi.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import * as M from "../../src/lib/malzeme";
import { yerelBugun } from "../../src/lib/utils";
import { FIYAT_PENCERE_BASLIGI } from "../../src/components/MalzemeFiyatPenceresi";
import { GUNUN_KURU_DUGMESI } from "../../src/components/MalzemeManager";
import { AYAR_KILITLI, KILIT_ALANLARI } from "../../src/lib/kilitAlanlari";
import { TARIH_GELECEK_HATASI } from "../../src/lib/gecerlilik";

const denetim = vi.hoisted(() => ({ kayitlar: [] }));
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (o) => denetim.kayitlar.push(o) }));
afterEach(() => { cleanup(); delete window.crmLocks; delete window.appServer; denetim.kayitlar.length = 0; });

const P304 = { id: 501, ad: "304 Paslanmaz", alasim: "AISI 304", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50, tedarikciId: 12 };
const C8620 = { id: 502, ad: "8620", ozgulAgirlik: 7.85, kiloFiyati: 95 };
const ALU = { id: 503, ad: "Alüminyum", kiloFiyati: 4.1, paraBirimi: "EUR", kur: 49 }; // özgül ağırlık yok: eksik
const PARCA = [
  { id: 41, ad: "Kesme mili", models: [], malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 } },
  { id: 42, ad: "Çöpteki mil", models: [], deletedAt: "2026-10-01", malzemeSatiri: { malzemeId: 502, bicim: "mil", cap: 20, boy: 50 } },
  { id: 43, ad: "Pul", models: [], maliyet: 5 },
];
const TED = [{ id: 11, ad: "Zeta Dökümcülük" }, { id: 12, ad: "Ana Çelik", hammadde: true }, { id: 13, ad: "Beta Metal", hammadde: true }];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), setParts: vi.fn(),
};
let durum;
function Panel({ m0 = [P304, C8620, ALU], parts = PARCA, rates = { usd: 42.15, eur: 48.9 }, ratesErr = false, giderYetki = true, sekme = "malzemeler" }) {
  const [malzemeler, setMalzemeler] = useState(structuredClone(m0));
  durum = { malzemeler, setMalzemeler };
  return <Settings {...BASE} initialTab={sekme} malzemeler={malzemeler.filter(m => !m.deletedAt)} setMalzemeler={setMalzemeler} rawMalzemeler={malzemeler}
    parts={parts.filter(p => !p.deletedAt)} rawParts={parts} rates={rates} ratesErr={ratesErr} tedarikciler={TED} setTedarikciler={vi.fn()} giderYetki={giderYetki} />;
}
const alan = (ad) => screen.getByLabelText(ad);
const yaz = (ad, v) => fireEvent.change(alan(ad), { target: { value: v } });
const satir = (ad) => screen.getAllByTestId("malzeme-satiri").find(r => r.textContent.includes(ad));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

describe("Spec 0132: malzeme paneli", () => {
  it("AC-1: hiç malzeme yokken tablo çizilmez, boş durum malzeme eklemeyi adres gösterir", () => {
    render(<Panel m0={[]} />);
    expect(screen.getByTestId("bos-malzeme").textContent).toContain(M.BOS_BASLIK);
    expect(screen.getByTestId("bos-malzeme").textContent).toContain("Yeni Malzeme");
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("AC-5: özgül ağırlığı boş malzeme eksik rozeti taşır ve başlıktaki sayıya girer", () => {
    render(<Panel />);
    expect(within(satir("Alüminyum")).getByTestId("malzeme-eksik").textContent).toBe(M.EKSIK_ROZETI);
    expect(within(satir("8620")).queryByTestId("malzeme-eksik")).toBeNull();
    expect(screen.getByTestId("malzeme-eksik-sayisi").textContent).toBe(M.eksikSayiMetni(1));
  });
  it("AC-3 / AC-4 / AC-6 / AC-16 / AC-93: ad boş, aynı ad (harf katlamalı), sıfır özgül ağırlık ve aralık dışı fire alanın altında", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    yaz("Özgül ağırlık", "0"); yaz("Varsayılan fire", "120"); kaydet();
    expect(screen.getByText(M.AD_BOS_HATASI)).toBeTruthy();
    expect(screen.getByText(M.POZITIF_HATASI)).toBeTruthy();
    expect(screen.getByText(M.FIRE_HATASI)).toBeTruthy();
    yaz("Malzeme adı", "304 paslanmaz"); yaz("Özgül ağırlık", "7,9"); yaz("Varsayılan fire", "5"); kaydet();
    expect(screen.getByText(M.AD_AYNI_HATASI)).toBeTruthy();
    expect(durum.malzemeler).toHaveLength(3);
  });
  it("AC-7 / AC-8 / AC-9: para birimi TL/USD/EUR; TL'de kur alanı yok, dövizde istenir ve günün kuru öneri olarak dolar", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    expect([...alan("Fiyatın para birimi").options].map(o => o.value)).toEqual(["TRY", "USD", "EUR"]);
    expect(screen.queryByLabelText("Kur")).toBeNull();
    fireEvent.change(alan("Fiyatın para birimi"), { target: { value: "USD" } });
    expect(alan("Kur").value).toBe("42,15");
    expect(screen.getByTestId("kur-oneri")).toBeTruthy();
  });
  it("AC-10 / AC-95: kur bilinmiyorsa alan boş, iki ayrı neden; kayıt engellenmez", () => {
    render(<Panel rates={null} ratesErr={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    fireEvent.change(alan("Fiyatın para birimi"), { target: { value: "EUR" } });
    expect(alan("Kur").value).toBe("");
    expect(screen.getByTestId("kur-neden").textContent).toBe(M.KUR_ALINMADI);
    yaz("Malzeme adı", "Bronz"); kaydet();
    expect(durum.malzemeler.find(m => m.ad === "Bronz")).toMatchObject({ paraBirimi: "EUR" });
    expect(durum.malzemeler.find(m => m.ad === "Bronz")).not.toHaveProperty("kur");
    cleanup();
    render(<Panel rates={null} ratesErr />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    fireEvent.change(alan("Fiyatın para birimi"), { target: { value: "USD" } });
    expect(screen.getByTestId("kur-neden").textContent).toBe(M.KUR_CEVRIMDISI);
  });
  it("AC-11 / AC-12: bant eklenir, ilk bandın alt sınırı 0'da kilitli; sıra hatası satırda", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    yaz("Malzeme adı", "Bantlı");
    fireEvent.click(screen.getByRole("button", { name: /Bant ekle/ }));
    fireEvent.click(screen.getByRole("button", { name: /Bant ekle/ }));
    expect(alan("Bant 1 alt sınırı").disabled).toBe(true);
    yaz("Bant 1 kilo fiyatı", "2,8"); yaz("Bant 2 alt sınırı", "0"); yaz("Bant 2 kilo fiyatı", "3"); kaydet();
    expect(screen.getByText(M.BANT_SIRA_HATASI)).toBeTruthy();
    yaz("Bant 2 alt sınırı", "151"); kaydet();
    expect(durum.malzemeler.find(m => m.ad === "Bantlı").bantlar).toEqual([{ alt: 0, fiyat: 2.8 }, { alt: 151, fiyat: 3 }]);
  });
  it("AC-14 / AC-61: boş bırakılan alanlar kayda yazılmaz; geldiği boy, asgari sipariş ve fire saklanır", () => {
    render(<Panel m0={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    yaz("Malzeme adı", "Sade"); kaydet();
    const { id, ...geri } = durum.malzemeler[0];
    expect(typeof id).toBe("number");
    expect(geri).toEqual({ ad: "Sade" });
    fireEvent.click(screen.getByRole("button", { name: "Sade düzenle" }));
    yaz("Geldiği boy", "6"); yaz("Asgari sipariş", "250"); yaz("Varsayılan fire", "8"); kaydet();
    expect(durum.malzemeler[0]).toMatchObject({ ad: "Sade", geldigiBoy: 6, asgariSiparis: 250, fire: 8 });
  });
  it("AC-15 / AC-75 / AC-76: ana tedarikçi canlı tedarikçilerden, hammadde işaretliler başta; yetkisizde alan yok, saklı bağ korunur", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: "8620 düzenle" }));
    expect([...alan("Ana tedarikçi").options].map(o => o.textContent)).toEqual(["Seçilmedi", "Ana Çelik · hammadde", "Beta Metal · hammadde", "Zeta Dökümcülük"]);
    cleanup();
    render(<Panel giderYetki={false} />);
    fireEvent.click(screen.getByRole("button", { name: "304 Paslanmaz düzenle" }));
    expect(screen.queryByLabelText("Ana tedarikçi")).toBeNull();
    expect(alan("Özgül ağırlık")).toBeTruthy(); // AC-76: ölçü/ağırlık alanı açık
    yaz("Özgül ağırlık", "7,95"); kaydet();
    expect(durum.malzemeler.find(m => m.id === 501)).toMatchObject({ ozgulAgirlik: 7.95, tedarikciId: 12 });
  });
  it("AC-17: kullanımdaki malzemenin silme onayı kullanan parça sayısını yazar; çöpe atma damgadır", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: "8620 sil" }));
    expect(screen.getByTestId("malzeme-sil-kullanim").textContent).toContain(M.kullanimMetni({ canli: 0, cop: 1 }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(durum.malzemeler.find(m => m.id === 502).deletedAt).toBeTruthy();
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "silindi", entity: "malzeme", entityName: "8620" });
  });
  it("AC-27: düzenlemede fiyat geçmişi en yeni üstte, salt okunur", () => {
    const g = { ...P304, fiyatGecmisi: [{ gecerli: "", kiloFiyati: 2.85, paraBirimi: "USD", kur: 48 }, { gecerli: "2026-06-01", kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 }] };
    render(<Panel m0={[g]} />);
    fireEvent.click(screen.getByRole("button", { name: "304 Paslanmaz düzenle" }));
    const satirlar = within(screen.getByTestId("fiyat-gecmisi")).getAllByText(/\//).map(e => e.textContent);
    expect(satirlar[0]).toContain("2,95");
    expect(screen.getByTestId("fiyat-gecmisi").textContent.indexOf("01.06.2026")).toBeLessThan(screen.getByTestId("fiyat-gecmisi").textContent.indexOf("başlangıçtan beri"));
    expect(screen.queryByLabelText("Kilo fiyatı")).toBeNull();
  });
  it("AC-54 / AC-55 / AC-86: yeni eylem izni yok; panel ayar:malzemeler kilidiyle, başkası tutuyorsa kilit uyarısı", () => {
    expect(AYAR_KILITLI.malzemeler).toBe("Malzemeler");
    expect(KILIT_ALANLARI.ayar.pencereler).toEqual(expect.arrayContaining(["src/components/MalzemeManager.jsx", "src/components/MalzemeFiyatPenceresi.jsx"]));
    window.crmLocks = { acquire: vi.fn(async () => ({ ok: false, locked_by: "ayse" })), release: vi.fn(), heartbeat: vi.fn(), list: vi.fn(async () => []), forceAcquire: vi.fn() };
    render(<Panel />);
    return screen.findByTestId("ayar-kilitli").then(el => {
      expect(el).toBeTruthy();
      expect(window.crmLocks.acquire.mock.calls.map(c => c.slice(0, 2))).toContainEqual(["ayar", "malzemeler"]);
      expect(screen.queryByTestId("malzeme-satiri")).toBeNull();
    });
  });
});

describe("Spec 0132: fiyat güncelleme penceresi", () => {
  const ac = (ad = "304 Paslanmaz") => fireEvent.click(within(satir(ad)).getByRole("button", { name: "Fiyatı Güncelle" }));
  // Triyaj (bulgu 1, Karar 41): kur alanı kayıtlı kurla açılır; günün kuru ipucunda ve düğmeyle gelir (R5: kuru değiştirmek zamdır).
  it("AC-9 (Karar 41): pencere kayıtlı kurla açılır; günün kuru ipucunda, yalnız düğmeyle alana yazılır", () => {
    render(<Panel />);
    ac();
    expect(screen.getByText(FIYAT_PENCERE_BASLIGI)).toBeTruthy();
    expect(alan("Kur").value).toBe("50");
    expect(screen.getByTestId("kur-oneri").textContent).toContain("42,15");
    fireEvent.click(screen.getByRole("button", { name: GUNUN_KURU_DUGMESI }));
    expect(alan("Kur").value).toBe("42,15");
    expect(screen.queryByRole("button", { name: GUNUN_KURU_DUGMESI })).toBeNull();
    yaz("Kur", "51"); fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    expect(durum.malzemeler.find(m => m.id === 501).kur).toBe(51);
  });
  it("AC-9 (Karar 41): yalnız kilo fiyatı değişince kayıtlı kur aynen kalır (çevrimiçi)", () => {
    render(<Panel />);
    ac();
    yaz("Kilo fiyatı", "3,40"); fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    expect(durum.malzemeler.find(m => m.id === 501)).toMatchObject({ kiloFiyati: 3.4, kur: 50 });
  });
  it("AC-9 (Karar 41): kayıtlı kuru olmayan döviz malzemede günün kuru öneri olarak alana gelir", () => {
    render(<Panel m0={[{ ...P304, kur: undefined }]} />);
    ac();
    expect(alan("Kur").value).toBe("42,15");
  });
  it("AC-48 / AC-49: uygulamadan önce kaç parçanın değişeceği ve örnek satırda eski ve yeni maliyet", () => {
    render(<Panel />);
    ac();
    yaz("Kilo fiyatı", "3,40"); // Karar 41: kur kayıtlı değerle (50) açılır, elle yazılmaz
    expect(screen.getByTestId("fiyat-etki-metni").textContent).toBe(M.etkiMetni({ bagli: 1, degisen: 1 }));
    const r = within(screen.getByTestId("fiyat-etki-satiri"));
    expect(r.getByText("Kesme mili")).toBeTruthy();
    expect(screen.getByTestId("fiyat-etki-satiri").textContent).toContain("1.701,12 ₺");
  });
  it("AC-50: bağlı parçası olmayan malzemede bağlı parça yok ve sayı sıfır", () => {
    render(<Panel />);
    ac("8620"); // yalnız çöpteki parçada geçiyor: canlı bağlı parça yok
    yaz("Kilo fiyatı", "120");
    expect(screen.getByTestId("fiyat-etki-metni").textContent).toBe(M.BAGLI_PARCA_YOK);
    expect(screen.queryByTestId("fiyat-etki-satiri")).toBeNull();
  });
  it("AC-21 / AC-47: geçerlilik tarihi gelecek olamaz; kayıt yalnız malzemeye yazar (parçaya dokunulmaz), geçmiş doğar", () => {
    render(<Panel />);
    ac();
    yaz("Kilo fiyatı", "3,40");
    fireEvent.change(alan("Geçerlilik tarihi"), { target: { value: "2099-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    expect(screen.getByText(TARIH_GELECEK_HATASI)).toBeTruthy();
    fireEvent.change(alan("Geçerlilik tarihi"), { target: { value: yerelBugun() } });
    fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    const m = durum.malzemeler.find(x => x.id === 501);
    expect(m.kiloFiyati).toBe(3.4);
    expect(m.fiyatGecmisi.map(x => x.gecerli)).toEqual(["", yerelBugun()]);
    expect(BASE.setParts).not.toHaveBeenCalled();
    expect(denetim.kayitlar.at(-1)).toMatchObject({ action: "fiyat_guncellendi", entity: "malzeme" });
  });
  it("AC-10 (Karar 41): çevrimdışıyken kayıtlı kur kalır, neden yazılır; kayıt kuru silmez, parça maliyeti düşmez", () => {
    render(<Panel rates={null} ratesErr />);
    ac();
    expect(alan("Kur").value).toBe("50");
    expect(screen.getByTestId("kur-neden").textContent).toBe(M.KUR_CEVRIMDISI);
    yaz("Kilo fiyatı", "3,40");
    fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    expect(screen.queryByText(FIYAT_PENCERE_BASLIGI)).toBeNull();
    const m = durum.malzemeler.find(x => x.id === 501);
    expect(m).toMatchObject({ kiloFiyati: 3.4, kur: 50 });
    expect(M.malzemeEksikMi(m)).toBe(false);
  });
  it("AC-10 (Karar 41): kayıtlı kuru olmayan malzemede çevrimdışı kur boş gelir ve kayıt engellenmez", () => {
    render(<Panel m0={[{ ...P304, kur: undefined }]} rates={null} ratesErr />);
    ac();
    expect(alan("Kur").value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    expect(screen.queryByText(FIYAT_PENCERE_BASLIGI)).toBeNull();
  });
});

describe("Spec 0132 triyaj: malzeme kartı", () => {
  // Bulgu 8 (R6): düzenleme kartı fiyatı yazmaz; kart açıkken fiyat başka yoldan (pencere, başka PC) değişse de kayıt güncel fiyatı
  // ve geçmişi korur. Kart formdaki bayat fiyatı yazsaydı bu test kırılırdı.
  it("Bulgu 8: düzenleme kaydı fiyatı ve fiyat geçmişini değiştirmez", () => {
    render(<Panel />);
    fireEvent.click(within(satir("304 Paslanmaz")).getByRole("button", { name: "304 Paslanmaz düzenle" }));
    const gecmis = [{ gecerli: "", kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 }, { gecerli: "2026-10-01", kiloFiyati: 3.1, paraBirimi: "USD", kur: 48 }];
    act(() => durum.setMalzemeler(p => p.map(m => (m.id === 501 ? { ...m, kiloFiyati: 3.1, kur: 48, fiyatGecmisi: gecmis } : m))));
    yaz("Alaşım", "AISI 304L"); kaydet();
    const m = durum.malzemeler.find(x => x.id === 501);
    expect(m).toMatchObject({ alasim: "AISI 304L", kiloFiyati: 3.1, kur: 48, paraBirimi: "USD" });
    expect(m.fiyatGecmisi).toEqual(gecmis);
  });
  it("Bulgu 2 (ekran): yeni malzemede noktayla yazılan üç ondalık kaydedilmez, neden alanın altında", () => {
    render(<Panel m0={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    yaz("Malzeme adı", "Teflon"); yaz("Kilo fiyatı", "2.955"); kaydet();
    expect(screen.getByText(M.BELIRSIZ_HATASI)).toBeTruthy();
    expect(durum.malzemeler).toHaveLength(0);
  });
});

describe("Spec 0132: çöp kutusu", () => {
  function Cop({ m0, parts = PARCA }) {
    const [malzemeler, setMalzemeler] = useState(structuredClone(m0));
    durum = { malzemeler };
    return <SettingsTrash rawMalzemeler={malzemeler} setMalzemeler={setMalzemeler} rawParts={parts} showToast={toast}
      rawCustomers={[]} rawServices={[]} rawPartSales={[]} rawPayments={[]} rawDealers={[]} rawStock={[]} rawNotes={[]} rawKalipDefs={[]} rawCustomModels={[]}
      rawTeklifler={[]} rawFaturalar={[]} rawUretimFormlari={[]} setCustomers={vi.fn()} setServices={vi.fn()} setPartSales={vi.fn()} setPayments={vi.fn()}
      setDealers={vi.fn()} setStock={vi.fn()} setNotes={vi.fn()} setKalipDefs={vi.fn()} setParts={vi.fn()} setCustomModels={vi.fn()} appSettings={{}} />;
  }
  const COP = "2026-10-20T09:00:00.000Z";
  const toast = vi.fn();
  afterEach(() => toast.mockClear());
  const copSatiri = (metin) => screen.getAllByText(metin)[0].closest("tr");
  it("AC-94: satırın etiketi tek yardımcıdan; alaşımsız malzemede yalnız ad", () => {
    render(<Cop m0={[{ ...P304, id: 601, deletedAt: COP }, { id: 602, ad: "Teflon", deletedAt: COP }]} parts={[]} />);
    expect(screen.getByText(M.malzemeCopEtiketi({ ...P304 }))).toBeTruthy();
    expect(screen.getByText("Teflon")).toBeTruthy();
  });
  it("AC-18 / AC-93: geri alınır; aynı adda (harf katlamalı) canlı malzeme varsa geri alma yapılmaz", () => {
    render(<Cop m0={[{ id: 601, ad: "304 paslanmaz", deletedAt: COP }, { ...P304 }]} parts={[]} />);
    fireEvent.click(within(copSatiri("304 paslanmaz")).getByRole("button", { name: /Geri Al/ }));
    expect(durum.malzemeler.find(m => m.id === 601).deletedAt).toBe(COP);
    expect(toast.mock.calls.at(-1)[0]).toMatch(/Geri alınamadı/);
    cleanup();
    render(<Cop m0={[{ id: 601, ad: "Teflon", deletedAt: COP }]} parts={[]} />);
    fireEvent.click(within(copSatiri("Teflon")).getByRole("button", { name: /Geri Al/ }));
    expect(durum.malzemeler[0].deletedAt).toBeUndefined();
  });
  it("AC-19: parçanın malzeme satırında geçen malzeme kalıcı silinmez; düğme kalır, neden satırda, onayda hata", () => {
    render(<Cop m0={[{ ...C8620, deletedAt: COP }]} />);
    const r = copSatiri("8620");
    expect(r.textContent).toContain(M.KULLANIMDA_MALZEME_NEDENI);
    fireEvent.click(within(r).getByRole("button", { name: /Kalıcı Sil/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    expect(durum.malzemeler).toHaveLength(1);
    expect(toast.mock.calls.some(c => c[0] === M.KULLANIMDA_MALZEME_RED)).toBe(true);
  });
  it("AC-20: çöpü boşaltma, canlı bir parçanın malzeme satırında geçen malzemeyi bırakır", () => {
    const parts = [{ id: 41, ad: "Kesme mili", malzemeSatiri: { malzemeId: 501, bicim: "mil" } }];
    render(<Cop m0={[{ ...P304, deletedAt: COP }, { id: 602, ad: "Teflon", deletedAt: COP }]} parts={parts} />);
    fireEvent.click(screen.getByRole("button", { name: /Çöpü Boşalt|Çöp Kutusunu Boşalt/ }));
    const onay = screen.getAllByRole("button").filter(b => /Evet|Boşalt/.test(b.textContent)).at(-1);
    fireEvent.click(onay);
    expect(durum.malzemeler.map(m => m.id)).toEqual([501]);
  });
});
