// @vitest-environment jsdom
// Spec 0159: parça kartı (gerçek Settings, App gibi bağlı): elle kip ipucu, kip geçişinde elle tutarın kaleme dönüşmesi ve geri
// taşınması, iki form, yetkisiz kullanıcı, adlar ve erişilebilir adlar, döviz ve geçmiş; sipariş penceresinin başlığı; Tedarikler.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import { MALIYET_KIP_ADLARI } from "../../src/components/MaliyetKalemleriAlani";
import * as U from "../../src/lib/urunAgaci";
import { ANA_TEDARIKCI_ETIKETI } from "../../src/components/PartManager";
import { KALEMDE_TEDARIKCI_NEDENI } from "../../src/lib/gider";
import { DIS_YAY, MALZEMELER, TEDARIKCILER } from "../fixtures/0159-veri.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-23T10:00:00")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const PARCALAR = [
  { id: 70, ad: "Dış yay", models: [], maliyet: 40, tedarikciId: 22, maliyetGecmisi: [{ gecerli: "", kurus: 3500 }, { gecerli: "2026-06-01", kurus: 4000 }] },
  { id: 71, ad: "İthal yay", models: [], maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 50.370257, tedarikciId: 22,
    maliyetGecmisi: [{ gecerli: "", kurus: 500000 }, { gecerli: "2026-06-01", kurus: 604443, dovizTutar: 120, kur: 50.370257, paraBirimi: "USD" }] },
  { id: 72, ad: "Bedava pul", models: [], maliyet: 0 },
  { id: 73, ad: "Çıplak", models: [] },
  { id: 74, ad: "Set", models: [], setIcerigi: [{ partId: 72, miktar: 2 }] },
];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.62.0", setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(),
};
let durum;
function Katalog({ p0 = PARCALAR, giderYetki = true }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} appSettings={{}} initialTab="yedekparca" parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts}
    malzemeler={MALZEMELER} tedarikciler={giderYetki ? TEDARIKCILER : []} giderYetki={giderYetki} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const ekleAc = () => fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
const yaz = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const kip = (ad) => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Maliyet kipi" })).getByRole("radio", { name: ad }));
const HESAPLA = MALIYET_KIP_ADLARI.hesapla; const ELLE = MALIYET_KIP_ADLARI.elle;

describe("Spec 0159 R4: elle kip ipucu", () => {
  it("AC-1 / AC-35: elle sabit kipte ipucu hangi kipe geçileceğini sabit kümesindeki adla söyler; set içeriği dolu parçada çizilmez", () => {
    render(<Katalog />); duzenle("Dış yay");
    const t = screen.getByTestId("elle-kip-ipucu").textContent;
    expect(t).toBe(U.elleKipIpucu(MALIYET_KIP_ADLARI.hesapla)); expect(t).toContain(`"${HESAPLA}"`);
    fireEvent.click(screen.getByRole("button", { name: "İptal" })); duzenle("Set");
    expect(screen.queryByTestId("elle-kip-ipucu")).toBeNull();
  });
});

describe("Spec 0159 R2: Elle sabit → Hesapla", () => {
  it("AC-2 / AC-3 / AC-4 / AC-19 / AC-20 / AC-29 / AC-11: onay yok; 40 liralık kalem, düzenlenebilir varsayılan ad, Ana tedarikçi seçili; adlar yeni", () => {
    render(<Katalog />); duzenle("Dış yay");
    kip(HESAPLA);
    expect(screen.queryByTestId("kip-onay")).toBeNull();
    const k = screen.getByTestId("islem-kalemi");
    expect(k.textContent).toContain(U.alimIslemSatirBasligi(1));
    expect(screen.getByLabelText("Alım ya da işlem adı 1").value).toBe(U.ALIM_KALEMI_VARSAYILAN_ADI);
    expect(screen.getByLabelText("Alım ya da işlem adı 1").placeholder).toBe("Örn: Dış yay alımı, kalaylama");
    expect(screen.getByLabelText("Alım / işlem tutarı 1").value).toBe("40");
    expect(screen.getByLabelText("Alım / işlem tedarikçisi 1").value).toBe("22");
    expect(screen.getByRole("button", { name: "Alım / işlem kalemini kaldır 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Alım\/işlem ekle/ })).toBeTruthy();
    expect(within(k).getByText(U.ALIM_ISLEM.AD_ETIKETI)).toBeTruthy();
    yaz("Alım ya da işlem adı 1", "Dış yay alımı"); // ad düzenlenebilir
    expect(screen.getByLabelText("Alım ya da işlem adı 1").value).toBe("Dış yay alımı");
  });
  it("AC-6 / AC-37 / AC-44: ikinci kalem (kalaylama, başka tedarikçi) eklenip kaydedilince maliyet toplam; geçmiş değişmez; iki tedarikçi ayrışır", () => {
    render(<Katalog />); duzenle("Dış yay");
    kip(HESAPLA);
    fireEvent.click(screen.getByRole("button", { name: /Alım\/işlem ekle/ }));
    yaz("Alım ya da işlem adı 2", "Kalaylama"); yaz("Alım / işlem tutarı 2", "10"); yaz("Alım / işlem tedarikçisi 2", "23");
    kaydet();
    const p = kayit(70);
    expect(p.maliyetKalemleri).toEqual([{ tur: "islem", ad: "Parça alımı", tedarikciId: 22, tutar: 40 }, { tur: "islem", ad: "Kalaylama", tedarikciId: 23, tutar: 10 }]);
    expect(U.parcaMaliyetKurus(p)).toBe(5000);
    expect(p.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 3500 }, { gecerli: "2026-06-01", kurus: 4000 }, { gecerli: "2026-11-23", kurus: 5000 }]); // maliyet değişti: satır
    // Ana tedarikçi değiştirilince kalemin tedarikçisi değişmez (R8/2).
    duzenle("Dış yay"); yaz(ANA_TEDARIKCI_ETIKETI, "21"); kaydet();
    expect(kayit(70).tedarikciId).toBe(21); expect(kayit(70).maliyetKalemleri[0].tedarikciId).toBe(22);
  });
  it("AC-37: lira parça yalnız kipi değişip kaydedilince geçmişe satır yazılmaz", () => {
    render(<Katalog />); duzenle("Dış yay"); kip(HESAPLA); kaydet();
    expect(kayit(70).maliyetGecmisi).toEqual(PARCALAR[0].maliyetGecmisi);
    expect(kayit(70).maliyetKalemleri).toEqual([{ tur: "islem", ad: "Parça alımı", tedarikciId: 22, tutar: 40 }]);
  });
  it("AC-22 / AC-23 / AC-36: altı ondalıklı kurlu dolar parça dönüştürülüp kaydedilince kur hatası yok, lira aynı, geçmiş değişmez", () => {
    render(<Katalog />); duzenle("İthal yay"); kip(HESAPLA);
    expect(screen.getByLabelText("Para birimi 1").value).toBe("USD");
    expect(screen.getByLabelText("Kur 1").value).toBe("50,370257");
    kaydet();
    const p = kayit(71);
    expect(p.maliyetKalemleri).toEqual([{ tur: "islem", ad: "Parça alımı", tedarikciId: 22, tutar: 120, paraBirimi: "USD", kur: 50.370257 }]);
    for (const a of ["maliyet", "maliyetParaBirimi", "maliyetKuru"]) expect(p, a).not.toHaveProperty(a);
    expect(U.parcaMaliyetKurus(p)).toBe(U.parcaMaliyetKurus(PARCALAR[1]));
    expect(p.maliyetGecmisi).toEqual(PARCALAR[1].maliyetGecmisi);
  });
  it("AC-26 / AC-7: 0 maliyet 0 tutarlı kaleme döner; boş maliyet boş liste verir", () => {
    render(<Katalog />); duzenle("Bedava pul"); kip(HESAPLA);
    expect(screen.getByLabelText("Alım / işlem tutarı 1").value).toBe("0");
    kaydet(); expect(U.parcaMaliyetKurus(kayit(72))).toBe(0);
    duzenle("Çıplak"); kip(HESAPLA);
    expect(screen.queryByTestId("islem-kalemi")).toBeNull(); expect(screen.getByTestId("kalem-bos")).toBeTruthy();
  });
  it("AC-27 / AC-5: dönüşüm ekleme formunda da çalışır; Ana tedarikçisiz kalem tedarikçisiz kaydedilir", () => {
    render(<Katalog />); ekleAc();
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Yeni yay" } });
    yaz("Alış maliyeti", "15");
    kip(HESAPLA);
    expect(screen.getByLabelText("Alım / işlem tutarı 1").value).toBe("15");
    kaydet();
    expect(durum.parts.find(p => p.ad === "Yeni yay").maliyetKalemleri).toEqual([{ tur: "islem", ad: "Parça alımı", tutar: 15 }]);
  });
  it("AC-28: gider yetkisi olmayan kullanıcıda tedarikçi seçicisi çizilmez ama ön doldurulan bağ kayda yazılır", () => {
    render(<Katalog giderYetki={false} />); duzenle("Dış yay"); kip(HESAPLA);
    expect(screen.queryByLabelText("Alım / işlem tedarikçisi 1")).toBeNull();
    kaydet();
    expect(kayit(70).maliyetKalemleri).toEqual([{ tur: "islem", ad: "Parça alımı", tedarikciId: 22, tutar: 40 }]);
  });
  it("AC-15: kalem adı boş bırakılan kayıt reddedilir, nedeni yazar", () => {
    render(<Katalog />); duzenle("Dış yay"); kip(HESAPLA);
    yaz("Alım ya da işlem adı 1", ""); kaydet();
    expect(screen.getByText(U.ISLEM_AD_HATASI)).toBeTruthy();
    expect(kayit(70).maliyet).toBe(40); expect(kayit(70)).not.toHaveProperty("maliyetKalemleri");
  });
});

describe("Spec 0159 R3: Hesapla → Elle sabit", () => {
  it("AC-8 / AC-33 / AC-47: tek kalem elle alana taşınır, onay yok, not yazar; Ana tedarikçi değişmez; geri dönüşte kayıt başlangıçtaki gibi", () => {
    render(<Katalog />); duzenle("Dış yay");
    kip(HESAPLA); kip(ELLE);
    expect(screen.queryByTestId("kip-onay")).toBeNull();
    expect(screen.getByLabelText("Alış maliyeti").value).toBe("40");
    expect(screen.getByTestId("tasima-notu").textContent).toBe(U.TASIMA_NOTU);
    kaydet();
    const p = kayit(70);
    expect(p).toEqual(PARCALAR[0]); // maliyet, Ana tedarikçi ve geçmiş başlangıçtaki gibi
  });
  it("AC-34 / P5: döviz tek kalem para birimini ve kuru elle alanlara taşır; kuru eksik dövizde elle alan nedenini yazar", () => {
    render(<Katalog p0={[{ id: 80, ad: "Kalemli", models: [], maliyetKalemleri: [{ tur: "islem", ad: "İthal alım", tutar: 2.5, paraBirimi: "EUR", kur: 50 }] },
      { id: 81, ad: "Kursuz", models: [], maliyetKalemleri: [{ tur: "islem", ad: "İthal alım", tutar: 2.5, paraBirimi: "EUR" }] }]} />);
    duzenle("Kalemli"); kip(ELLE);
    expect(screen.getByLabelText("Para birimi (alış maliyeti)").value).toBe("EUR");
    expect(screen.getByLabelText("Kur (alış maliyeti)").value).toBe("50");
    kaydet(); expect(kayit(80)).toMatchObject({ maliyet: 2.5, maliyetParaBirimi: "EUR", maliyetKuru: 50 });
    duzenle("Kursuz"); kip(ELLE);
    expect(screen.getByTestId("elle-maliyet-nedeni").textContent).toBe(U.MALIYET_KUR_EKSIK_NEDENI);
  });
  it("AC-9 / AC-10 / AC-31: birden çok kalem ya da belirsiz tutarlı tek kalem bugünkü onayı sorar", () => {
    render(<Katalog p0={[DIS_YAY, { id: 82, ad: "Belirsiz", models: [], maliyetKalemleri: [{ tur: "islem", ad: "A", tutar: 5 }] }]} />);
    duzenle("DIŞ YAY"); kip(ELLE);
    expect(screen.getByTestId("kip-onay")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" })); fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    duzenle("Belirsiz"); yaz("Alım / işlem tutarı 1", "2.400"); kip(ELLE);
    expect(screen.getByTestId("kip-onay")).toBeTruthy();
  });
});

describe("Spec 0159: sipariş penceresi ve Tedarikler", () => {
  it("AC-42: pencere alım ve işlem tablosunu yeni adla çizer", () => {
    const parts = [DIS_YAY];
    render(<SiparisPenceresi veri={{ parts, partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER, hamTedarikciler: TEDARIKCILER,
      standardModels: [{ model: "AK", defaultParcalar: [{ partId: "50", miktar: 1 }] }], customModels: [], uretimPartileri: [{ id: 801, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK: 1 } }], appSettings: {}, factory: null }}
      bugun="2026-11-23" onClose={vi.fn()} />);
    const t = screen.getByTestId("siparis-penceresi").textContent;
    expect(t).toContain(U.ALIM_ISLEM.TABLO); expect(t).toContain(U.ALIM_ISLEM.SUTUN); expect(t).not.toMatch(/İşlemler/);
  });
  it("AC-46 / C8: kaleminde geçen tedarikçi Tedarikler'den çöpe atılamaz, nedeni yazar", () => {
    function TedH() { const [ted, setTed] = useState([{ id: 23, ad: "Fason Kaplama" }]);
      return <Tedarikciler tedarikciler={ted} setTedarikciler={setTed} giderler={[]} giderTanimlari={[]} rapor={null} hesapHareketleri={[]} parts={[DIS_YAY]} />; }
    render(<TedH />);
    fireEvent.click(within(screen.getByText("Fason Kaplama").closest("tr")).getByTitle("Sil"));
    expect(screen.getByTestId("tedarikci-parca-kullanim").textContent).toMatch(/1 parçanın maliyet kaleminde geçiyor/);
    expect(KALEMDE_TEDARIKCI_NEDENI).toBeTruthy();
  });
});
