// @vitest-environment jsdom
// Spec 0097: parça kartında geçerlilik tarihi ve maliyet geçmişi (ekran). Gerçek Settings (Katalog › Parça/Yedek Parça; panele
// çöpü süzülmüş dizi, setter'a tam dizi, App gibi). Saat Europe/Istanbul'da 01:30'a sabit: UTC'de gün hâlâ dündür (R5/4).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, act } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { BASLANGICTAN_BERI, GIRILMEDI_IBARESI, GECERLILIK_ETIKETI, TARIH_GELECEK_HATASI, tarihOnceHatasi, tarihSonraHatasi, maliyetMetniKurus } from "../../src/lib/urunAgaci";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-15T01:30:00")); });
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.49.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
const TED = [{ id: 31, ad: "Demir Çelik", hammadde: true }];
const GECMIS = [{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1500 }];
const PARCALAR = [
  { id: 7, ad: "Rulman", models: [], maliyet: 10 },
  { id: 8, ad: "Dişli", models: [], maliyet: 15, maliyetGecmisi: GECMIS },
  { id: 9, ad: "Ayna", models: [], hammaddeler: [{ tedarikciId: 31, tutar: 170 }] },
];
let durum;
let disari;
function Katalog({ p0 = PARCALAR, giderYetki = true }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts }; disari = setParts;
  return <Settings {...BASE} initialTab="yedekparca" parts={parts.filter(x => !x.deletedAt)} setParts={setParts} standardModels={[]} setStandardModels={vi.fn()}
    customModels={[]} setCustomModels={vi.fn()} rawParts={parts} rawCustomModels={[]} tedarikciler={TED} setTedarikciler={vi.fn()} giderYetki={giderYetki} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const maliyet = (v) => fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: v } });
const tarih = (v) => fireEvent.change(screen.getByLabelText(GECERLILIK_ETIKETI), { target: { value: v } });
const gecmisSatirlari = () => screen.getAllByTestId("maliyet-gecmisi-satiri").map(r => r.textContent);

describe("Spec 0097: parça kartı (R5–R8)", () => {
  it("AC-9: yeni parça eklenirken tarih sorulmaz ve geçmişe kayıt yazılmaz", () => {
    render(<Katalog />);
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    expect(screen.queryByLabelText(GECERLILIK_ETIKETI)).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Yeni" } });
    maliyet("12");
    kaydet();
    const y = durum.parts.find(p => p.ad === "Yeni");
    expect(y.maliyet).toBe(12);
    expect("maliyetGecmisi" in y).toBe(false);
  });
  it("AC-10 / AC-41: düzenleme formunda tarih YEREL bugünle gelir (01:30'da UTC hâlâ dün)", () => {
    render(<Katalog />);
    duzenle("Rulman");
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-06-14");
    expect(screen.getByLabelText(GECERLILIK_ETIKETI).value).toBe("2026-06-15");
  });
  it("AC-2: 10 TL → 2026-02-01'den 15 TL; geçmiş iki kayıt", () => {
    render(<Katalog />);
    duzenle("Rulman");
    maliyet("15"); tarih("2026-02-01");
    kaydet();
    expect(kayit(7).maliyet).toBe(15);
    expect(kayit(7).maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1500 }]);
  });
  it("AC-11 / AC-6: maliyeti değiştirmeyen düzenlemede tarih yok sayılır, geçmiş büyümez", () => {
    render(<Katalog />);
    duzenle("Rulman");
    fireEvent.change(screen.getByPlaceholderText("Örn: KES-001"), { target: { value: "R1" } });
    kaydet();
    expect(kayit(7).kod).toBe("R1");
    expect("maliyetGecmisi" in kayit(7)).toBe(false);
    duzenle("Dişli"); kaydet();
    expect(kayit(8).maliyetGecmisi).toEqual(GECMIS);
  });
  it("AC-15 / AC-42: tutar aynı, tarih değiştirildi: son kaydın tarihi düzeltilir (geriye), yeni kayıt yok", () => {
    render(<Katalog />);
    duzenle("Dişli");
    tarih("2026-01-20");
    kaydet();
    expect(kayit(8).maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-01-20", kurus: 1500 }]);
  });
  it("AC-12 / AC-13: gelecek tarih ve son kayıttan önceki tarih reddedilir; nedeni alanda, kayıt yapılmaz, pencere açık kalır", () => {
    render(<Katalog />);
    duzenle("Dişli");
    maliyet("20"); tarih("2026-06-16");
    kaydet();
    expect(screen.getByText(TARIH_GELECEK_HATASI)).toBeTruthy();
    expect(kayit(8).maliyet).toBe(15);
    tarih("2026-01-31");
    kaydet();
    expect(screen.getByText(tarihOnceHatasi("2026-02-01"))).toBeTruthy();
    expect(kayit(8).maliyetGecmisi).toEqual(GECMIS);
    tarih("2026-03-01");
    kaydet();
    expect(kayit(8).maliyetGecmisi.at(-1)).toEqual({ gecerli: "2026-03-01", kurus: 2000 });
  });
  it("Triyaj bulgu 3: tarih alanı boşaltılsa da maliyetle ilgisiz düzenleme kaydedilir", () => {
    render(<Katalog />);
    duzenle("Dişli");
    tarih("");
    fireEvent.change(screen.getByPlaceholderText("Örn: KES-001"), { target: { value: "D9" } });
    kaydet();
    expect(kayit(8).kod).toBe("D9");
    expect(kayit(8).maliyetGecmisi).toEqual(GECMIS);
  });
  it("Triyaj bulgu 1: tarih düzeltmesi sondan bir önceki kayıtla aynı güne yapılamaz, nedeni alanda", () => {
    render(<Katalog />);
    duzenle("Dişli");
    tarih("2026-01-01"); kaydet(); // iki kayıtlı geçmişte sondan bir önceki boş tarihtir: kabul
    duzenle("Dişli");
    maliyet("18"); tarih("2026-03-01"); kaydet(); // üç kayıt: "", 01-01, 03-01
    duzenle("Dişli");
    tarih("2026-01-01"); kaydet();
    expect(screen.getByText(tarihSonraHatasi("2026-01-01"))).toBeTruthy();
    expect(kayit(8).maliyetGecmisi.map(x => x.gecerli)).toEqual(["", "2026-01-01", "2026-03-01"]);
  });
  it("AC-16 / AC-43: geçmiş en yeni üstte, ilk kayıt \"başlangıçtan beri\"; geçmişsiz parçada bölüm yok", () => {
    render(<Katalog />);
    duzenle("Dişli");
    expect(gecmisSatirlari()).toEqual([`01.02.2026${maliyetMetniKurus(1500)}`, `${BASLANGICTAN_BERI}${maliyetMetniKurus(1000)}`]);
    expect(within(screen.getByTestId("maliyet-gecmisi")).queryByRole("textbox")).toBeNull(); // salt okunur
    fireEvent.click(screen.getByRole("button", { name: /İptal/ }));
    duzenle("Rulman");
    expect(screen.queryByTestId("maliyet-gecmisi")).toBeNull();
  });
  it("AC-17: gider yetkisi olmayan kullanıcıda geçmiş görünür, hammadde bölümü gizli", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Dişli");
    expect(screen.getByTestId("maliyet-gecmisi")).toBeTruthy();
    expect(screen.queryByTestId("hammadde-bolumu")).toBeNull();
  });
  it("AC-39: maliyet boşaltılınca \"girilmedi\" kaydı yazılır ve listede görünür", () => {
    render(<Katalog />);
    duzenle("Rulman");
    maliyet(""); tarih("2026-03-01");
    kaydet();
    expect(kayit(7).maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-03-01", kurus: null }]);
    duzenle("Rulman");
    expect(gecmisSatirlari()[0]).toBe(`01.03.2026${GIRILMEDI_IBARESI}`);
  });
  it("AC-40 / AC-5: kırılımlı parçada elle alan pasifken tarih alanı etkin; kırılım tutarı değişince o tarihle kayıt", () => {
    render(<Katalog />);
    duzenle("Ayna");
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(true);
    expect(screen.getByLabelText(GECERLILIK_ETIKETI).disabled).toBe(false);
    expect(screen.getByTestId("hammadde-toplam")).toBeTruthy(); // spec 0099 ile: rakamlı satırın yerine toplam kutusu
    fireEvent.change(screen.getByLabelText("Hammadde tutarı 1"), { target: { value: "200" } });
    tarih("2026-04-01");
    kaydet();
    expect(kayit(9).maliyetGecmisi).toEqual([{ gecerli: "", kurus: 17000 }, { gecerli: "2026-04-01", kurus: 20000 }]);
  });
  it("AC-40: gider yetkisi olmayan kullanıcının kaydında kırılım aynen taşınır, çözülmüş maliyet değişmez, geçmiş yazılmaz", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Ayna");
    expect(screen.getByLabelText(GECERLILIK_ETIKETI)).toBeTruthy();
    kaydet();
    expect(kayit(9).hammaddeler).toEqual([{ tedarikciId: 31, tutar: 170 }]);
    expect("maliyetGecmisi" in kayit(9)).toBe(false);
  });
  it("AC-45 / C13: kayıt fonksiyonu geçmişi KAYITTAN okur; pencere açıkken araya giren güncelleme kaybolmaz", () => {
    render(<Katalog />);
    duzenle("Rulman");
    // Başka bir yazım (ör. içe aktarma ya da başka PC'nin birleştirilmiş kaydı) pencere açıkken kaydın geçmişini değiştirdi.
    act(() => disari(p => p.map(x => (x.id === 7 ? { ...x, maliyet: 12, maliyetGecmisi: [{ gecerli: "", kurus: 1000 }, { gecerli: "2026-03-01", kurus: 1200 }] } : x))));
    maliyet("15"); tarih("2026-04-01");
    kaydet();
    expect(kayit(7).maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-03-01", kurus: 1200 }, { gecerli: "2026-04-01", kurus: 1500 }]);
  });
  it("AC-45 / C13: geçmişi OLAN parçada pencere açıkken eklenen kayıt, açılışta yakalanan bayat kopyayla ezilmez", () => {
    render(<Katalog />);
    duzenle("Dişli"); // açılışta iki kayıt
    act(() => disari(p => p.map(x => (x.id === 8 ? { ...x, maliyet: 18, maliyetGecmisi: [...GECMIS, { gecerli: "2026-03-01", kurus: 1800 }] } : x))));
    maliyet("20"); tarih("2026-04-01");
    kaydet();
    expect(kayit(8).maliyetGecmisi).toEqual([...GECMIS, { gecerli: "2026-03-01", kurus: 1800 }, { gecerli: "2026-04-01", kurus: 2000 }]);
  });
});
