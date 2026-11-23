// @vitest-environment jsdom
// Spec 0157: parça kartı (para birimi, kur, öneri, sapma, lira karşılığı, kipler, dokunulmamış kayıt), işlem kaleminin satırı, parça
// listesi, maliyet geçmişi listesi ve sipariş penceresi (para yok). Test adları AC-<n> taşır.
// Spec 0159 ile (R1/3): kalemin erişilebilir adları ve ekleme düğmesi yeni adla ("Alım ya da işlem adı", "Alım / işlem tutarı", "Alım/işlem ekle").
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { PartManager } from "../../src/components/PartManager";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import * as U from "../../src/lib/urunAgaci";
import { KUR_CEVRIMDISI } from "../../src/lib/kur";
import { PARCALAR, MALZEMELER, TEDARIKCILER, kit } from "../fixtures/0158-dolu.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-23T10:00:00")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const RATES = { usd: 41.5, eur: 47.25 };
const ITHAL = { id: 30, ad: "İthal rulman", maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40 };
const kur = (ilk = [ITHAL, { id: 31, ad: "Lira pul", maliyet: 10 }], o = {}) => {
  const kayit = { parts: ilk };
  const Kap = () => { const [parts, setParts] = useState(ilk); kayit.parts = parts;
    return <PartManager parts={parts} rawParts={parts} setParts={setParts} showToast={() => {}} malzemeler={MALZEMELER} tedarikciler={TEDARIKCILER} giderYetki rates={RATES} ratesErr={false} {...o} />; };
  render(<Kap />);
  return kayit;
};
const satir = (ad) => { fireEvent.change(screen.getByPlaceholderText("Yedek parça ara..."), { target: { value: ad } }); return screen.getAllByRole("row").find(r => r.querySelector("span")?.textContent === ad); };
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const yeni = (ad) => { fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ })); fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: ad } }); };
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const pb = () => screen.getByLabelText("Para birimi (alış maliyeti)");
const kurAlani = () => screen.getByLabelText("Kur (alış maliyeti)");
const tutar = () => screen.getByLabelText("Alış maliyeti");

describe("Spec 0157 A: parça kartı", () => {
  it("AC-1 / AC-58: elle maliyetin yanında para birimi seçici, varsayılan TL, TL'de kur alanı yok; etiket para biriminden bağımsız", () => {
    kur(); yeni("Pul");
    expect(pb().value).toBe("TRY");
    expect(screen.queryByLabelText("Kur (alış maliyeti)")).toBeNull();
    expect(screen.getByTestId("maliyet-bolumu").textContent).toContain(U.MALIYET_ETIKETI);
    expect(screen.getByTestId("maliyet-bolumu").textContent).not.toMatch(/TL karşılığını girin|\(TL, KDV hariç\)/);
  });
  it("AC-2: TL'de kayıt gövdesinde iki yeni alan yok", () => {
    const k = kur(); yeni("Pul");
    fireEvent.change(tutar(), { target: { value: "12,5" } }); kaydet();
    const p = k.parts.find(x => x.ad === "Pul");
    expect(p.maliyet).toBe(12.5); expect(p).not.toHaveProperty("maliyetParaBirimi"); expect(p).not.toHaveProperty("maliyetKuru");
  });
  it("AC-3 / AC-4 / AC-7 / AC-17 / AC-42: döviz seçilince kur alanı \"1 USD = ? TL\", günün kuru önerilir ve değiştirilebilir; lira karşılığı yazar ve kayıt üç alanla", () => {
    const k = kur(); yeni("İthal yay");
    fireEvent.change(tutar(), { target: { value: "120" } });
    fireEvent.change(pb(), { target: { value: "USD" } });
    expect(screen.getByText("Kur (1 USD = ? TL)")).toBeTruthy();
    expect(kurAlani().value).toBe("41,5");
    fireEvent.change(kurAlani(), { target: { value: "40" } });
    expect(screen.getByTestId("elle-lira-karsiligi").textContent).toBe(`${U.LIRA_KARSILIGI_ETIKETI}: 4.800,00 ₺`);
    kaydet();
    expect(k.parts.find(x => x.ad === "İthal yay")).toMatchObject({ maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40 });
  });
  it("AC-5: çevrimdışıyken öneri gelmez, nedeni yazar ve elle kur girilerek kayıt yapılır", () => {
    const k = kur(undefined, { rates: null, ratesErr: true }); yeni("Çevrimdışı");
    fireEvent.change(tutar(), { target: { value: "10" } });
    fireEvent.change(pb(), { target: { value: "EUR" } });
    expect(kurAlani().value).toBe("");
    expect(screen.getByTestId("kur-oneri-nedeni").textContent).toBe(KUR_CEVRIMDISI);
    fireEvent.change(kurAlani(), { target: { value: "47,1" } }); kaydet();
    expect(k.parts.find(x => x.ad === "Çevrimdışı")).toMatchObject({ maliyetParaBirimi: "EUR", maliyetKuru: 47.1 });
  });
  it("AC-49 (bileşen): kur verilmeyen ortamda kart çizilir, öneri gelmez", () => {
    kur(undefined, { rates: null, ratesErr: false }); yeni("Köprüsüz");
    fireEvent.change(pb(), { target: { value: "USD" } });
    expect(kurAlani().value).toBe("");
    expect(screen.getByTestId("kur-oneri-nedeni")).toBeTruthy();
  });
  it("AC-6: kuru girilmemiş döviz maliyet kaydedilmez, nedeni kur alanında yazar", () => {
    const k = kur(undefined, { rates: null }); yeni("Kursuz");
    fireEvent.change(tutar(), { target: { value: "10" } });
    fireEvent.change(pb(), { target: { value: "USD" } }); kaydet();
    expect(k.parts.find(x => x.ad === "Kursuz")).toBeUndefined();
    expect(within(kurAlani().closest("div").parentElement).getByText("Kur girilmedi; kur olmadan kaydedilmez.")).toBeTruthy();
  });
  it("AC-50: kur günün kurundan %50'den fazla saparsa engellemeyen uyarı; kayıt yapılır", () => {
    const k = kur(); yeni("Sapma");
    fireEvent.change(tutar(), { target: { value: "10" } });
    fireEvent.change(pb(), { target: { value: "USD" } });
    fireEvent.change(kurAlani(), { target: { value: "4,15" } });
    expect(screen.getByTestId("kur-sapma-uyarisi").textContent).toMatch(/yüzde 50'den fazla sapıyor/);
    kaydet();
    expect(k.parts.find(x => x.ad === "Sapma").maliyetKuru).toBe(4.15);
  });
  it("AC-48: düzenleme formu kayıtlı kurla açılır; günün kuru ipucunda ve düğmeyle alana yazılır", () => {
    kur(); duzenle("İthal rulman");
    expect(pb().value).toBe("USD"); expect(kurAlani().value).toBe("40");
    expect(screen.getByTestId("gunun-kuru").textContent).toContain(U.gununKuruIpucu(41.5));
    fireEvent.click(within(screen.getByTestId("gunun-kuru")).getByRole("button", { name: U.GUNUN_KURU_DUGMESI }));
    expect(kurAlani().value).toBe("41,5");
  });
  it("AC-45: maliyet bölümüne dokunulmadan kaydedilen döviz parçanın para birimi ve kuru aynen korunur (altı ondalıklı kur dahil)", () => {
    const k = kur([{ ...ITHAL, maliyetKuru: 50.370257 }]); duzenle("İthal rulman");
    fireEvent.change(screen.getByPlaceholderText("Örn: KES-001"), { target: { value: "IR-1" } }); kaydet();
    expect(k.parts[0]).toMatchObject({ kod: "IR-1", maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 50.370257 });
    expect(k.parts[0]).not.toHaveProperty("maliyetGecmisi"); // maliyet değişmedi
  });
  it("AC-45 (triyaj bulgu 1): kayıttaki uzun ondalıklı kur, form altı ondalığa yuvarlayarak açsa da dokunulmadan kayıtta aynen kalır, geçmiş yazılmaz", () => {
    const k = kur([{ ...ITHAL, maliyetKuru: 41.12345678, maliyetGecmisi: [{ gecerli: "", kurus: 480000 }] }]); duzenle("İthal rulman");
    expect(kurAlani().value).toBe("41,123457");
    fireEvent.change(screen.getByPlaceholderText("Örn: KES-001"), { target: { value: "IR-2" } }); kaydet();
    expect(k.parts[0]).toMatchObject({ kod: "IR-2", maliyetKuru: 41.12345678, maliyetGecmisi: [{ gecerli: "", kurus: 480000 }] });
  });
  it("AC-32 / R19/2 (triyaj bulgu 2): tanınmayan para birimi seçicide kendi ekiyle, nedeni kartta; TL sanılıp kaydedilmez, para birimi seçilince kaydedilir", () => {
    const k = kur([{ id: 34, ad: "Sterlin parça", maliyet: 120, maliyetParaBirimi: "GBP", maliyetKuru: 50 }]); duzenle("Sterlin parça");
    expect(pb().value).toBe("GBP");
    expect(pb().selectedOptions[0].textContent).toBe(`GBP${U.TANINMAYAN_PB_EKI}`);
    expect(screen.getByTestId("elle-maliyet-nedeni").textContent).toBe(U.MALIYET_PB_TANINMAYAN_NEDENI);
    expect(screen.queryByLabelText("Kur (alış maliyeti)")).toBeNull();
    kaydet();
    expect(screen.getByText(U.MALIYET_PB_TANINMAYAN_NEDENI)).toBeTruthy(); // kayıt reddedildi, neden seçicinin altında
    expect(k.parts[0].maliyetParaBirimi).toBe("GBP"); expect(screen.getByRole("button", { name: /^Kaydet$/ })).toBeTruthy();
    fireEvent.change(pb(), { target: { value: "EUR" } }); kaydet();
    expect(k.parts[0]).toMatchObject({ maliyet: 120, maliyetParaBirimi: "EUR", maliyetKuru: 47.25 });
  });
  it("R19/2 (triyaj bulgu 2): kuru girilmemiş döviz kayıt kartta nedenini yazar; yeni girişte bu neden çizilmez", () => {
    kur([{ ...ITHAL, maliyetKuru: null }]); duzenle("İthal rulman");
    expect(screen.getByTestId("elle-maliyet-nedeni").textContent).toBe(U.MALIYET_KUR_EKSIK_NEDENI);
    cleanup(); kur(undefined, { rates: null }); yeni("Yeni döviz");
    fireEvent.change(pb(), { target: { value: "USD" } });
    expect(screen.queryByTestId("elle-maliyet-nedeni")).toBeNull();
  });
  it("AC-9 / AC-10: kur güncellenip kaydedilince lira karşılığı yeni kurdan; geçmişe döviz alanlı kayıt düşer ve listede üç rakam yazar", () => {
    const k = kur(); duzenle("İthal rulman");
    fireEvent.change(kurAlani(), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText(U.GECERLILIK_ETIKETI), { target: { value: "2026-11-01" } });
    kaydet();
    const p = k.parts.find(x => x.id === 30);
    expect(U.parcaMaliyetKurus(p)).toBe(504000);
    expect(p.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD" }, { gecerli: "2026-11-01", kurus: 504000, dovizTutar: 120, kur: 42, paraBirimi: "USD" }]);
    duzenle("İthal rulman");
    expect(screen.getAllByTestId("maliyet-gecmisi-satiri").map(r => r.textContent)).toEqual([
      expect.stringContaining("$120,00 · kur 42,00 · 5.040,00 ₺"), expect.stringContaining("$120,00 · kur 40,00 · 4.800,00 ₺")]);
  });
  // Spec 0159 ile (R2, R2/2, R2/7): Hesapla'ya geçiş onay sormaz; elle döviz maliyet para birimi ve kuruyla ilk kalem olur ve parçanın
  // iki alanı kayıttan silinir (iddianın "silinir" yarısı aynı; tutar artık kaybolmuyor).
  it("AC-46 / AC-47: para birimi seçicisi yalnız Elle sabit kipinde; Hesapla kipine geçilince iki alan kayıttan silinir (spec 0159 ile: kaleme taşınır)", () => {
    const k = kur(); duzenle("İthal rulman");
    fireEvent.click(screen.getByRole("radio", { name: "Hesapla" }));
    expect(screen.queryByLabelText("Para birimi (alış maliyeti)")).toBeNull();
    expect(screen.getByLabelText("Para birimi 1").value).toBe("USD");
    kaydet();
    const p = k.parts.find(x => x.id === 30);
    for (const a of ["maliyet", "maliyetParaBirimi", "maliyetKuru"]) expect(p, a).not.toHaveProperty(a);
    expect(p.maliyetKalemleri).toEqual([{ tur: "islem", ad: "Parça alımı", tutar: 120, paraBirimi: "USD", kur: 40 }]);
  });
});

describe("Spec 0157 B: işlem kalemi satırı", () => {
  it("AC-13 / AC-59: işlem kaleminde para birimi ve kur; satır kendi tutarını, kurunu ve lira karşılığını yazar, toplam lira", () => {
    const k = kur(); yeni("Fasonlu");
    fireEvent.click(screen.getByRole("radio", { name: "Hesapla" }));
    fireEvent.click(screen.getByRole("button", { name: /Alım\/işlem ekle/ }));
    fireEvent.change(screen.getByLabelText("Alım ya da işlem adı 1"), { target: { value: "İthal kaplama" } });
    fireEvent.change(screen.getByLabelText("Alım / işlem tutarı 1"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Para birimi 1"), { target: { value: "EUR" } });
    expect(screen.getByLabelText("Kur 1").value).toBe("47,25");
    fireEvent.change(screen.getByLabelText("Kur 1"), { target: { value: "50" } });
    expect(screen.getByTestId("kalem-tutar").textContent).toBe("€10,00 · kur 50,00 · 500,00 ₺");
    expect(screen.getByTestId("kalem-toplam-tutar").textContent).toBe("500,00 ₺");
    kaydet();
    expect(k.parts.find(x => x.ad === "Fasonlu").maliyetKalemleri).toEqual([{ tur: "islem", ad: "İthal kaplama", tutar: 10, paraBirimi: "EUR", kur: 50 }]);
  });
});

describe("Spec 0157 C: parça listesi", () => {
  it("AC-18: döviz parçanın maliyet hücresi kendi tutarını ve lira karşılığını yazar; lira parça bugünkü gibi", () => {
    kur();
    expect(within(satir("İthal rulman")).getByTestId("parca-maliyet").textContent).toBe("$120,00 · 4.800,00 ₺");
    expect(within(satir("Lira pul")).getByTestId("parca-maliyet").textContent).toBe("10,00 ₺");
  });
  it("AC-32 / AC-51: kuru girilmemiş ya da para birimi tanınmayan parça \"—\" yazar ve sayaca girer; yeni rozet yok", () => {
    kur([{ ...ITHAL, maliyetKuru: null }, { id: 32, ad: "Sterlin", maliyet: 5, maliyetParaBirimi: "GBP", maliyetKuru: 50 }, { id: 31, ad: "Lira pul", maliyet: 10 }]);
    expect(screen.getByTestId("maliyetsiz-parca").textContent).toMatch(/^2 parçanın alış maliyeti girilmedi/);
    expect(within(satir("İthal rulman")).getByTestId("parca-maliyet").textContent).toBe("—");
    expect(within(satir("Sterlin")).getByTestId("parca-maliyet").textContent).toBe("—");
    expect(document.querySelector("[data-testid*='eksik-rozet'], [data-testid*='doviz-rozet']")).toBeNull();
  });
});

describe("Spec 0157 C: sipariş penceresi", () => {
  it("AC-26: döviz maliyetli parça varken pencerede para gösterilmez", () => {
    const parts = [...PARCALAR, { ...ITHAL, tedarikciId: 22 }];
    render(<SiparisPenceresi veri={{ parts, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, hamTedarikciler: TEDARIKCILER,
      standardModels: kit(parts), customModels: [], uretimPartileri: [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK: 70 } }], appSettings: {}, factory: null }}
      bugun="2026-11-23" onClose={vi.fn()} />);
    const t = screen.getByTestId("siparis-penceresi").textContent;
    expect(t).toContain("İthal rulman");
    expect(t).not.toMatch(/[$€₺]|8\.400|4\.800/);
  });
});
