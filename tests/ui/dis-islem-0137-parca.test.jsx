// @vitest-environment jsdom
// Spec 0137: parça kartının katalog bağlı işlem kalemi (gerçek Settings › Katalog › Parça/Yedek Parça, durumlu kap). Çeşit seçici
// ve onayı, arama kutusu, salt okunur birim ve fiyat, miktar alanı ve doğrulaması, kilo türetmesi, canlı özet ile liste hücresi,
// üç metnin koşulu, geçmişin gizlenmesi, sınır, kaydedilen gövde.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import {
  ISLEM_ZAM_IBARESI, KARMA_TARIH_IBARESI, MALZEME_GECMIS_IBARESI, KALEM_BOS_METNI, KALEM_GECMIS_IBARESI, ISLEM_KATALOG_BOS_NEDENI, ISLEM_ARA,
  ISLEM_SECILMEDI, SET_ADET_HATASI, ADET_UST_HATASI, GECERLILIK_ETIKETI, KALEM_SINIRI_NEDENI, CESIT_DEGISIM_ONAYI, kalemKaynakMetni,
} from "../../src/lib/urunAgaci";
import { KILO_UST_HATASI, POZITIF_HATASI, KILO_ONDALIK_HATASI } from "../../src/lib/disIslem";
import { BELIRSIZ_HATASI } from "../../src/lib/malzeme";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); });

const LAMA_M = { id: 1, ad: "St37 Lama", ozgulAgirlik: 8, kiloFiyati: 50 };
const LAMA = { tur: "malzeme", malzemeId: 1, bicim: "lama", yontem: "kilo", kalinlik: 10, genislik: 100, boy: 250, adet: 1 };
const ISIL = { id: 701, ad: "Isıl İşlem", birim: "adet", birimFiyati: 20, tedarikciId: 31 };
const GALV = { id: 702, ad: "Galvano", birim: "kilo", birimFiyati: 30 };
const ESKI = { id: 705, ad: "Kaldırılan kaplama", birim: "adet", birimFiyati: 9, deletedAt: "2026-10-01" };
const TED = [{ id: 31, ad: "Mahir Isıl İşlem" }, { id: 32, ad: "Lazer Ltd." }];
const PARCALAR = [
  { id: 41, ad: "Pim", models: [], maliyetKalemleri: [{ tur: "islem", islemId: 701, miktar: 2 }] },
  { id: 42, ad: "Karma mil", models: [], maliyetKalemleri: [LAMA, { tur: "islem", islemId: 702 }, { tur: "islem", ad: "Büküm", tedarikciId: 32, tutar: 5 }] },
  { id: 43, ad: "Serbestli", models: [], maliyetKalemleri: [LAMA, { tur: "islem", ad: "Kaplama", tutar: 7 }] },
  { id: 44, ad: "Yalnız serbest", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Kaplama", tutar: 7 }], maliyetGecmisi: [{ gecerli: "", kurus: 500 }, { gecerli: "2026-05-01", kurus: 700 }] },
  { id: 45, ad: "Katalog geçmişli", models: [], maliyetKalemleri: [{ tur: "islem", islemId: 701, miktar: 1 }], maliyetGecmisi: [{ gecerli: "", kurus: 1000 }] },
  { id: 46, ad: "Silinmiş işlemli", models: [], maliyetKalemleri: [{ tur: "islem", islemId: 705, miktar: 1 }] },
  { id: 47, ad: "Çıplak", models: [] },
];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(),
};
let durum;
function Katalog({ p0 = PARCALAR, disIslemler = [ISIL, GALV, ESKI], giderYetki = true }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} appSettings={{}} initialTab="yedekparca" parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts}
    malzemeler={[LAMA_M]} tedarikciler={TED} giderYetki={giderYetki} disIslemler={disIslemler.filter(d => !d.deletedAt)} rawDisIslemler={disIslemler} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const ekleAc = () => fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
const yaz = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const hesapla = () => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Maliyet kipi" })).getByRole("radio", { name: "Hesapla" }));
const cesit = (sira, ad) => fireEvent.click(within(screen.getByRole("radiogroup", { name: `İşlem kalemi çeşidi ${sira}` })).getByRole("radio", { name: ad }));
const sec = (ad) => {
  const kutu = screen.getByPlaceholderText(ISLEM_ARA);
  fireEvent.focus(kutu); fireEvent.change(kutu, { target: { value: ad } });
  fireEvent.mouseDown([...document.querySelectorAll(".sp-option")].find(o => o.textContent === ad));
};
const yeniKatalogKalemi = () => { ekleAc(); yaz("Yedek Parça Adı (TR)", "Yeni"); hesapla(); fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ })); cesit(1, "Katalogdan"); };

describe("Spec 0137: kalem çeşidi ve seçim (R10–R10/5, R17, Karar 37)", () => {
  it("AC-26 / Karar 37: işlem kalemi eklerken çeşit seçilir; varsayılan serbest", () => {
    render(<Katalog />); ekleAc(); hesapla();
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    const grup = screen.getByRole("radiogroup", { name: "İşlem kalemi çeşidi 1" });
    expect(within(grup).getAllByRole("radio").map(r => r.textContent)).toEqual(["Katalogdan", "Serbest"]);
    expect(within(grup).getByRole("radio", { name: "Serbest" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText("İşlem adı 1")).toBeTruthy();
  });
  it("AC-27 / AC-28 / AC-122 / AC-123: işlem arama kutusundan seçilir; birim ve birim fiyatı salt okunur; adette miktar 1; tedarikçi görünmez", () => {
    render(<Katalog />); yeniKatalogKalemi();
    sec("Isıl İşlem");
    const bilgi = screen.getByTestId("katalog-islem-bilgi").textContent;
    expect(bilgi).toContain("Birim: Adet");
    expect(bilgi).toContain("20,00 ₺ / adet");
    expect(screen.getByLabelText("İşlem miktarı 1").value).toBe("1");
    expect(screen.getByTestId("katalog-islem-kalemi").textContent).not.toContain("Mahir");
    expect(screen.queryByLabelText("İşlem tedarikçisi 1")).toBeNull();
  });
  it("AC-122: katalog boşken seçici yerine neden satırı", () => {
    render(<Katalog disIslemler={[]} />); yeniKatalogKalemi();
    expect(screen.getByTestId("islem-katalog-bos").textContent).toBe(ISLEM_KATALOG_BOS_NEDENI);
    expect(screen.queryByPlaceholderText(ISLEM_ARA)).toBeNull();
  });
  it("AC-46 / AC-124: serbest alanları dolu kalemin çeşidi değişirken onay sorulur; Escape kartı kapatmaz; onaylanınca serbest alanlar kayıttan silinir", () => {
    render(<Katalog />); duzenle("Yalnız serbest");
    cesit(1, "Katalogdan");
    expect(screen.getByTestId("cesit-onay").textContent).toBe(CESIT_DEGISIM_ONAYI);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("cesit-onay")).toBeNull();
    expect(screen.getByText("Yedek Parçayı Düzenle")).toBeTruthy();
    cesit(1, "Katalogdan");
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    sec("Isıl İşlem"); yaz("İşlem miktarı 1", "3"); kaydet();
    expect(kayit(44).maliyetKalemleri).toEqual([{ tur: "islem", islemId: 701, miktar: 3 }]);
  });
  it("AC-47: katalog kaleminin çeşidi serbeste çevrilince işlem bağı ve miktar kayıttan silinir", () => {
    render(<Katalog />); duzenle("Pim");
    cesit(1, "Serbest");
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    yaz("İşlem adı 1", "Elle iş"); yaz("İşlem tutarı 1", "12"); kaydet();
    expect(kayit(41).maliyetKalemleri).toEqual([{ tur: "islem", ad: "Elle iş", tutar: 12 }]);
  });
  it("Karar 36: işlem seçilmemiş katalog kalemi kaydı engeller, neden kalemde", () => {
    render(<Katalog />); yeniKatalogKalemi(); kaydet();
    expect(screen.getByText(ISLEM_SECILMEDI)).toBeTruthy();
    expect(durum.parts).toHaveLength(PARCALAR.length);
  });
  it("AC-126: yirmi kalem varken ekleme düğmeleri pasif; sınır iki çeşidi birlikte sayar", () => {
    const kalemler = [...Array.from({ length: 10 }, (_, i) => ({ tur: "islem", ad: `İş ${i}`, tutar: 1 })), ...Array.from({ length: 10 }, () => ({ tur: "islem", islemId: 701, miktar: 1 }))];
    render(<Katalog p0={[{ id: 50, ad: "Dolu", models: [], maliyetKalemleri: kalemler }]} />); duzenle("Dolu");
    expect(screen.getByRole("button", { name: /İşlem ekle/ }).disabled).toBe(true);
    expect(screen.getByTestId("kalem-sinir").textContent).toBe(KALEM_SINIRI_NEDENI);
  });
});

describe("Spec 0137: miktar ve tutar (R12–R14/2, R13/2)", () => {
  it("AC-31 / AC-32: adette 0, ondalık ve 1.001 reddedilir, neden kalemin altında", () => {
    render(<Katalog />); yeniKatalogKalemi(); sec("Isıl İşlem");
    for (const [v, h] of [["0", SET_ADET_HATASI], ["1,5", SET_ADET_HATASI], ["1001", ADET_UST_HATASI]]) {
      yaz("İşlem miktarı 1", v); kaydet();
      expect(screen.getByText(h), v).toBeTruthy();
    }
    expect(durum.parts).toHaveLength(PARCALAR.length);
  });
  it("AC-33 / AC-98: kilo birimli işlemde miktar boş bırakılabilir, yer tutucu türetmeyi söyler, kayıt geçer", () => {
    render(<Katalog />); yeniKatalogKalemi(); sec("Galvano");
    const m = screen.getByLabelText("İşlem miktarı 1");
    expect(m.value).toBe("");
    expect(m.getAttribute("placeholder")).toMatch(/türet/i);
    kaydet();
    expect(durum.parts.at(-1).maliyetKalemleri).toEqual([{ tur: "islem", islemId: 702 }]);
  });
  it("AC-99–AC-103 (ekran): kilo miktarında belirsiz, negatif, sıfır, 10.001 ve dört ondalık reddedilir", () => {
    render(<Katalog />); yeniKatalogKalemi(); sec("Galvano");
    for (const [v, h] of [["2.955", BELIRSIZ_HATASI], ["0", POZITIF_HATASI], ["10001", KILO_UST_HATASI], ["1,2345", KILO_ONDALIK_HATASI]]) {
      yaz("İşlem miktarı 1", v); kaydet();
      expect(screen.getByText(h), v).toBeTruthy();
    }
    yaz("İşlem miktarı 1", "-1"); kaydet();
    expect(screen.getByText("Negatif olamaz.")).toBeTruthy();
  });
  it("AC-34 / AC-48 / AC-44: kartın canlı özeti (2 kg × 30 TL + malzeme + serbest) ile listedeki maliyet aynı rakam; türetilen kilo görünür", () => {
    render(<Katalog />); duzenle("Karma mil");
    expect(screen.getByTestId("kilo-turetilen").textContent).toContain("2 kg");
    const tutarlar = screen.getAllByTestId("kalem-tutar").map(e => e.textContent);
    expect(tutarlar[1]).toBe("60,00 ₺");
    const toplam = screen.getByTestId("kalem-toplam-tutar").textContent;
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(within(satir("Karma mil")).getByTestId("parca-maliyet").textContent.startsWith(toplam)).toBe(true); // hücre kaynak ibaresini de taşır
  });
  it("AC-40 / AC-41 (ekran): çöpteki işlemin kalemi 'silinmiş işlem' ibaresiyle kalır, maliyet girilmedi ve nedeni yazılır", () => {
    render(<Katalog />);
    expect(within(satir("Silinmiş işlemli")).getByTestId("parca-maliyet").textContent.startsWith("—")).toBe(true);
    duzenle("Silinmiş işlemli");
    expect(screen.getByTestId("katalog-islem-bilgi").textContent).toContain("(silinmiş işlem)");
    expect(screen.getByTestId("katalog-islem-neden").textContent).toContain("işlem bulunamadı ya da çöpte");
    expect(screen.getByTestId("kalem-toplam-tutar").textContent).toBe("girilmedi");
  });
  it("Triyaj (bulgu 2): çöpteki adet birimli işlemin kaleminde \"Adet\" alanına ondalık yazılırsa kayıt yapılmaz, neden kalemde", () => {
    render(<Katalog />); duzenle("Silinmiş işlemli");
    expect(screen.getByText("Adet")).toBeTruthy();
    yaz("İşlem miktarı 1", "2,5"); kaydet();
    expect(screen.getByText(SET_ADET_HATASI)).toBeTruthy();
    expect(kayit(46).maliyetKalemleri).toEqual([{ tur: "islem", islemId: 705, miktar: 1 }]);
    yaz("İşlem miktarı 1", "3"); kaydet();
    expect(kayit(46).maliyetKalemleri).toEqual([{ tur: "islem", islemId: 705, miktar: 3 }]);
  });
  it("AC-93 (ekran): boy yöntemli malzemede miktarı boş kilo kalemi çözülemez, neden kalemde", () => {
    const boyM = { id: 2, ad: "Boru", ozgulAgirlik: 7.85, boyFiyati: 600, geldigiBoy: 6 };
    const p = { id: 60, ad: "Borulu", models: [], maliyetKalemleri: [{ tur: "malzeme", malzemeId: 2, bicim: "mil", yontem: "boy", cap: 20, boy: 300, adet: 1 }, { tur: "islem", islemId: 702 }] };
    function K() { const [parts, setParts] = useState([p]); return <Settings {...BASE} appSettings={{}} initialTab="yedekparca" parts={parts} setParts={setParts} rawParts={parts} malzemeler={[boyM]} tedarikciler={TED} giderYetki disIslemler={[GALV]} />; }
    render(<K />); duzenle("Borulu");
    expect(screen.getByTestId("katalog-islem-neden").textContent).toContain("boy fiyatından hesaplanan malzemenin ağırlığı yok");
  });
});

describe("Spec 0137: kartın üç metni ve geçmiş (R19–R19/3, R29)", () => {
  it("AC-52 / AC-120: yalnız katalog işlem kalemli parçada zam ve karma ibaresi çizilmez (malzeme kalemi olsa da)", () => {
    render(<Katalog />); duzenle("Pim");
    expect(screen.queryByTestId("kalem-zam-ibaresi")).toBeNull();
    expect(screen.queryByTestId("kalem-karma-ibaresi")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    const p = [{ id: 61, ad: "Malzemeli katalog", models: [], maliyetKalemleri: [LAMA, { tur: "islem", islemId: 701, miktar: 1 }] }];
    cleanup(); render(<Katalog p0={p} />); duzenle("Malzemeli katalog");
    expect(screen.queryByTestId("kalem-zam-ibaresi")).toBeNull();
    expect(screen.queryByTestId("kalem-karma-ibaresi")).toBeNull();
  });
  it("AC-53: serbest işlem kalemi ve malzeme kalemi varsa ikisi çizilir; yalnız serbestte karma çizilmez (bugünkü gibi)", () => {
    render(<Katalog />); duzenle("Serbestli");
    expect(screen.getByTestId("kalem-zam-ibaresi").textContent).toBe(ISLEM_ZAM_IBARESI);
    expect(screen.getByTestId("kalem-karma-ibaresi").textContent).toBe(KARMA_TARIH_IBARESI);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    duzenle("Yalnız serbest");
    expect(screen.getByTestId("kalem-zam-ibaresi")).toBeTruthy();
    expect(screen.queryByTestId("kalem-karma-ibaresi")).toBeNull();
  });
  it("AC-121: boş durum metni iki çeşidi birden anlatır", () => {
    render(<Katalog />); ekleAc(); hesapla();
    const m = screen.getByTestId("kalem-bos").textContent;
    expect(m).toBe(KALEM_BOS_METNI);
    expect(m).toMatch(/Dış İşlemler kataloğundan/);
    expect(m).toMatch(/serbest işlem kalemi[^.]*sabit tutardır/);
  });
  it("AC-107: katalog işlem kalemli parçada geçerlilik tarihi ve geçmiş çizilmez, yerinde neden; yalnız serbestte bugünkü gibi", () => {
    render(<Katalog />); duzenle("Katalog geçmişli");
    expect(screen.queryByLabelText(GECERLILIK_ETIKETI)).toBeNull();
    expect(screen.queryByTestId("maliyet-gecmisi")).toBeNull();
    expect(screen.getByTestId("kalem-gecmis-ibaresi").textContent).toBe(KALEM_GECMIS_IBARESI);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    duzenle("Karma mil");
    expect(screen.getByTestId("kalem-gecmis-ibaresi").textContent).toBe(MALZEME_GECMIS_IBARESI);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    duzenle("Yalnız serbest");
    expect(screen.getByLabelText(GECERLILIK_ETIKETI)).toBeTruthy();
  });
  it("AC-106 (ekran): katalog işlem kalemli parçanın miktarı değişince kendi geçmişine satır yazılmaz", () => {
    render(<Katalog />); duzenle("Katalog geçmişli");
    yaz("İşlem miktarı 1", "4"); kaydet();
    expect(kayit(45).maliyetKalemleri).toEqual([{ tur: "islem", islemId: 701, miktar: 4 }]);
    expect(kayit(45).maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }]);
  });
  it("AC-125 (ekran): liste hücresindeki kaynak ibaresi iki çeşidi ayırmaz", () => {
    render(<Katalog />);
    expect(within(satir("Karma mil")).getByTestId("parca-maliyet-kalem").textContent).toBe(kalemKaynakMetni({ malzeme: 1, islem: 2 }));
  });
});

describe("Düğme düzeni (2026-11-08): katalog kaleminde işlem bilgisi ile adet aynı hizada", () => {
  it("işlem bilgisi kendi etiketiyle adet alanının yanında durur; iki sütun aynı etiket satırından başlar", () => {
    render(<Katalog />); yeniKatalogKalemi();
    sec("Isıl İşlem");
    const bilgi = screen.getByTestId("katalog-islem-bilgi");
    const islemSutunu = bilgi.parentElement;
    const adetSutunu = screen.getByLabelText("İşlem miktarı 1").parentElement;
    expect(islemSutunu.parentElement).toBe(adetSutunu.parentElement);
    expect(islemSutunu.querySelector("label").textContent).toBe("İşlem");
    expect(adetSutunu.querySelector("label").textContent).toBe("Adet");
    expect(bilgi.style.minHeight).toBe("38px");
  });
});
