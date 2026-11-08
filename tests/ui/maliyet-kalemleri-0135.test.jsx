// @vitest-environment jsdom
// Spec 0135: parça kartının maliyet bölümü ve parça listesi (gerçek Settings › Katalog › Parça/Yedek Parça, durumlu kap). Kip
// seçici ve onayı, kalem listesi, malzeme ve işlem kalemi, eski kayıtların açılışı, dokunma işareti ve kaydedilen gövde, geçerlilik
// tarihi, iki yönlü set pasifliği, gizlilik, liste ibaresi, tedarikçi süzgeci, maliyetsiz sayacı ve toplu kip onayı.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import {
  kalemKaynakMetni, maliyetMetniKurus, ISLEM_AD_HATASI, ISLEM_TUTAR_UYARISI, BULUNAMAYAN_TEDARIKCI, KALEM_SINIRI_NEDENI, ISLEM_ZAM_IBARESI,
  KARMA_TARIH_IBARESI, MALZEME_GECMIS_IBARESI, MALZEME_KATALOG_BOS_NEDENI, SET_KALEM_PASIF_NEDENI, GECERLILIK_ETIKETI,
} from "../../src/lib/urunAgaci";
import { malzemeKatalogu, malzemeOzeti, BELIRSIZ_HATASI } from "../../src/lib/malzeme";
import { TURETILEN_KALEM_ADI } from "../../src/lib/maliyetKalemleri";
import { maliyetsizUyariMetni } from "../../src/lib/parcaFiyati";
import { KIP_SET_PASIF_NEDENI, KIP_ONAY_ELLE, KIP_ONAY_HESAPLA } from "../../src/components/MaliyetKalemleriAlani";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); });

const P304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 };
const SAC = { id: 502, ad: "DKP Sac", ozgulAgirlik: 7.85, kiloFiyati: 38 };
const MALZEMELER = [P304, SAC];
const KAT = malzemeKatalogu(MALZEMELER);
const SACK = { tur: "malzeme", malzemeId: 502, bicim: "sac", kalinlik: 3, en: 200, boy: 300, adet: 1 };
const TED = [{ id: 31, ad: "Hammadde A.Ş.", hammadde: true }, { id: 32, ad: "Lazer Ltd." }, { id: 33, ad: "Kaplama Sanayi" }];
const PARCALAR = [
  { id: 41, ad: "Kesme mili", models: [], maliyet: 12, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 } },
  { id: 42, ad: "Pul", models: [], maliyet: 5 },
  { id: 43, ad: "Kapak", models: [], hammaddeler: [{ tedarikciId: 31, tutar: 120 }, { tedarikciId: 999, tutar: 80 }] },
  { id: 44, ad: "Gövde", models: [], maliyetKalemleri: [SACK, { tur: "islem", ad: "Lazer kesim", tedarikciId: 32, tutar: 125.5 }] },
  { id: 45, ad: "Kaplamalı pim", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Kaplama", tedarikciId: 33, tutar: 40 }], maliyetGecmisi: [{ gecerli: "", kurus: 3000 }, { gecerli: "2026-05-01", kurus: 4000 }] },
  { id: 46, ad: "Çıplak", models: [] },
  { id: 47, ad: "Set", models: [], setIcerigi: [{ partId: 42, miktar: 2 }] },
];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(),
};
let durum;
function Katalog({ p0 = PARCALAR, malzemeler = MALZEMELER, rawMalzemeler = null, giderYetki = true, tedarikciler = TED, fiyatAyarlari = null }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} appSettings={fiyatAyarlari ? { fiyatAyarlari } : {}} initialTab="yedekparca" parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts}
    malzemeler={malzemeler} rawMalzemeler={rawMalzemeler} tedarikciler={tedarikciler} giderYetki={giderYetki} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const ekleAc = () => fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
const yaz = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const kipGrubu = () => screen.getByRole("radiogroup", { name: "Maliyet kipi" });
const kipRadyo = (ad) => within(kipGrubu()).getByRole("radio", { name: ad });
const kip = (ad) => fireEvent.click(kipRadyo(ad));
const secili = (ad) => kipRadyo(ad).getAttribute("aria-checked") === "true";
const birim = (k) => malzemeOzeti(k, KAT).maliyetK;

describe("Spec 0135: kip seçici (R1–R6/2, Karar 30, 36, 37)", () => {
  it("AC-1: ekleme kartında 'Maliyet kipi' seçicisi iki seçenekle: Elle sabit ve Hesapla", () => {
    render(<Katalog />); ekleAc();
    expect(within(kipGrubu()).getAllByRole("radio").map(r => r.textContent)).toEqual(["Elle sabit", "Hesapla"]);
  });
  it("AC-2 / AC-3: yeni kart Elle sabit, tek tutar alanı; Hesapla yapılınca tutar alanı yok, kalem listesi var", () => {
    render(<Katalog />); ekleAc();
    expect(secili("Elle sabit")).toBe(true);
    expect(screen.getAllByLabelText("Alış maliyeti")).toHaveLength(1);
    expect(screen.queryByTestId("kalem-listesi")).toBeNull();
    expect(screen.queryByRole("button", { name: /Malzeme ekle/ })).toBeNull();
    kip("Hesapla");
    expect(screen.queryByLabelText("Alış maliyeti")).toBeNull();
    expect(screen.getByTestId("kalem-listesi")).toBeTruthy();
  });
  it("AC-4 / AC-5 / AC-6: malzeme satırlı ve kırılımlı eski parça Hesapla, elle maliyetli parça Elle sabit açılır; kırılım satırları işlem kalemi", () => {
    render(<Katalog />);
    duzenle("Kesme mili"); expect(secili("Hesapla")).toBe(true); fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    duzenle("Kapak"); expect(secili("Hesapla")).toBe(true);
    expect(screen.getAllByTestId("islem-kalemi")).toHaveLength(2);
    expect(screen.getByLabelText("İşlem adı 1").value).toBe(TURETILEN_KALEM_ADI);
    expect(screen.getByLabelText("İşlem tutarı 2").value).toBe("80");
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    duzenle("Pul"); expect(secili("Elle sabit")).toBe(true);
    expect(screen.getByLabelText("Alış maliyeti").value).toBe("5");
  });
  it("AC-7 / AC-8: elle tutar doluyken Hesapla onay sorar; vazgeçince kip ve tutar yerinde, onayla kip değişir ve tutar boşalır", () => {
    render(<Katalog />); duzenle("Pul");
    kip("Hesapla");
    expect(screen.getByTestId("kip-onay").textContent).toBe(KIP_ONAY_HESAPLA);
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(secili("Elle sabit")).toBe(true);
    expect(screen.getByLabelText("Alış maliyeti").value).toBe("5");
    kip("Hesapla"); fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    expect(secili("Hesapla")).toBe(true);
    kip("Elle sabit"); // boş listeden geçişte onay yok (AC-10)
    expect(screen.queryByTestId("kip-onay")).toBeNull();
    expect(screen.getByLabelText("Alış maliyeti").value).toBe("");
  });
  it("AC-9: kalem listesi doluyken Elle sabit onay sorar; onaylanınca kalemler listeden kalkar", () => {
    render(<Katalog />); duzenle("Gövde");
    kip("Elle sabit");
    expect(screen.getByTestId("kip-onay").textContent).toBe(KIP_ONAY_ELLE);
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    kip("Hesapla");
    expect(screen.getByTestId("kalem-bos")).toBeTruthy();
  });
  it("AC-10: boş kipten boş kipe geçişte onay sorulmaz", () => {
    render(<Katalog />); ekleAc();
    kip("Hesapla"); expect(screen.queryByTestId("kip-onay")).toBeNull();
    kip("Elle sabit"); expect(screen.queryByTestId("kip-onay")).toBeNull();
  });
  it("Karar 37: kip onayı açıkken Escape kartı kapatmaz (yalnız onay kapanır)", () => {
    render(<Katalog />); duzenle("Pul");
    kip("Hesapla");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("kip-onay")).toBeNull();
    expect(screen.getByText("Yedek Parçayı Düzenle")).toBeTruthy();
  });
  it("Karar 37 (triyaj bulgu 2, ekleme kartı): kip onayı açıkken Escape yeni parça kartını kapatmaz", () => {
    render(<Katalog />); ekleAc();
    yaz("Alış maliyeti", "8");
    kip("Hesapla");
    expect(screen.getByTestId("kip-onay")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("kip-onay")).toBeNull();
    expect(screen.getByText("Yeni Yedek Parça Ekle")).toBeTruthy();
  });
  it("AC-11 / R5: set içeriği doluyken kip seçicisi pasif ve nedeni yazar", () => {
    render(<Katalog />); duzenle("Set");
    expect(within(kipGrubu()).getAllByRole("radio").every(r => r.disabled)).toBe(true);
    expect(screen.getByTestId("kip-set-pasif").textContent).toBe(KIP_SET_PASIF_NEDENI);
  });
  it("AC-12 / R6/2: emniyet payı iki kipte de çizilir ve kip değişimi değerini değiştirmez", () => {
    render(<Katalog />); ekleAc();
    yaz("Parça emniyet payı", "7");
    kip("Hesapla");
    expect(screen.getByLabelText("Parça emniyet payı").value).toBe("7");
    kip("Elle sabit");
    expect(screen.getByLabelText("Parça emniyet payı").value).toBe("7");
  });
});

describe("Spec 0135: kalem listesi (R7–R11, R20/2, R40–R43)", () => {
  it("AC-13 / AC-14 / AC-15 / AC-16: boş durum ve iki düğme; malzeme kalemi adet 1, işlem kalemi boş alanlarla; her satırın kaldır düğmesi", () => {
    render(<Katalog />); ekleAc(); kip("Hesapla");
    expect(screen.getByTestId("kalem-bos")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Malzeme ekle/ }));
    expect(screen.getByLabelText("Malzeme adedi 1").value).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    expect(screen.getByLabelText("İşlem adı 1").value).toBe("");
    expect(screen.getByLabelText("İşlem tutarı 1").value).toBe("");
    expect(screen.getByLabelText("İşlem tedarikçisi 1").value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Malzeme kalemini kaldır 1" }));
    expect(screen.queryByTestId("malzeme-kalemi")).toBeNull();
    expect(screen.getAllByTestId("islem-kalemi")).toHaveLength(1);
  });
  it("AC-17 / R9: listede 20 kalem varken iki ekleme düğmesi pasif ve nedeni yazar", () => {
    const kalemler = Array.from({ length: 20 }, (_, i) => ({ tur: "islem", ad: `İş ${i}`, tutar: 1 }));
    render(<Katalog p0={[{ id: 50, ad: "Dolu", models: [], maliyetKalemleri: kalemler }]} />); duzenle("Dolu");
    expect(screen.getByRole("button", { name: /Malzeme ekle/ }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /İşlem ekle/ }).disabled).toBe(true);
    expect(screen.getByTestId("kalem-sinir").textContent).toBe(KALEM_SINIRI_NEDENI);
  });
  it("AC-18: kalemler eklendikleri sırada; sıralama düğmesi yok", () => {
    render(<Katalog />); duzenle("Gövde");
    const kartlar = [...screen.getByTestId("kalem-listesi").querySelectorAll("[data-testid='malzeme-kalemi'], [data-testid='islem-kalemi']")].map(e => e.dataset.testid);
    expect(kartlar).toEqual(["malzeme-kalemi", "islem-kalemi"]);
    expect(within(screen.getByTestId("kalem-listesi")).queryByRole("button", { name: /Yukarı|Aşağı|Sırala|Taşı/ })).toBeNull();
  });
  it("AC-19 / AC-20 / AC-88 / R20/2: tek toplam satırı çözülmüş maliyet ve liste hücresiyle aynı; ibareler koşullu", () => {
    render(<Katalog />);
    const beklenen = maliyetMetniKurus(birim(SACK) + 12550);
    expect(within(satir("Gövde")).getByTestId("parca-maliyet").textContent.startsWith(beklenen)).toBe(true);
    duzenle("Gövde");
    expect(screen.getAllByTestId("kalem-toplam")).toHaveLength(1);
    expect(screen.getByTestId("kalem-toplam-tutar").textContent).toBe(beklenen);
    expect(screen.getByTestId("kalem-zam-ibaresi").textContent).toBe(ISLEM_ZAM_IBARESI);
    expect(screen.getByTestId("kalem-karma-ibaresi").textContent).toBe(KARMA_TARIH_IBARESI);
    fireEvent.click(screen.getByRole("button", { name: "Malzeme kalemini kaldır 1" }));
    expect(screen.queryByTestId("kalem-karma-ibaresi")).toBeNull();
    expect(screen.queryByTestId("kalem-gecmis-ibaresi")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "İşlem kalemini kaldır 1" }));
    expect(screen.queryByTestId("kalem-zam-ibaresi")).toBeNull();
    expect(screen.queryByTestId("kalem-toplam")).toBeNull();
  });
  it("R41: malzeme kataloğu boşken malzeme ekleme pasif ve nedeni malzemelerin yerini söyler; işlem eklenebilir (R42)", () => {
    render(<Katalog malzemeler={[]} tedarikciler={[]} />); ekleAc(); kip("Hesapla");
    expect(screen.getByRole("button", { name: /Malzeme ekle/ }).disabled).toBe(true);
    expect(screen.getByTestId("malzeme-katalog-bos").textContent).toBe(MALZEME_KATALOG_BOS_NEDENI);
    expect(screen.getByRole("button", { name: /İşlem ekle/ }).disabled).toBe(false);
  });
});

describe("Spec 0135: malzeme ve işlem kalemi (R12–R21, R44)", () => {
  it("AC-21 / AC-22: malzeme kaleminin alanları; biçim değişince ölçüler yeniden çizilir", () => {
    render(<Katalog />); duzenle("Kesme mili");
    for (const ad of ["Malzeme 1", "Biçim 1", "Parça firesi 1", "Malzeme adedi 1", "Çap 1", "Çap işleme payı 1", "Boy 1", "Boy işleme payı 1"]) expect(screen.getByLabelText(ad)).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Maliyet yöntemi 1" })).toBeTruthy();
    yaz("Biçim 1", "lama");
    expect(screen.getByLabelText("Genişlik 1")).toBeTruthy();
    expect(screen.queryByLabelText("Çap 1")).toBeNull();
  });
  it("AC-30 / R44: çöpteki malzemeyi taşıyan kalem seçicide adıyla ve 'silinmiş malzeme' ibaresiyle kalır; kayıt silinmez", () => {
    render(<Katalog malzemeler={[SAC]} rawMalzemeler={[{ ...P304, deletedAt: "2026-10-01" }, SAC]} />); duzenle("Kesme mili");
    expect(screen.getByLabelText("Malzeme 1").selectedOptions[0].textContent).toBe("304 Paslanmaz (silinmiş malzeme)");
    expect(screen.getByTestId("kalem-toplam-tutar").textContent).toBe("girilmedi");
    kaydet();
    expect(kayit(41).malzemeSatiri.malzemeId).toBe(501);
  });
  it("AC-32 / AC-33 / AC-34: işlem kaleminin alanları; adı boş kalem reddedilir, tedarikçisiz kalem kaydedilir", () => {
    render(<Katalog />); ekleAc(); yaz("Yedek Parça Adı (TR)", "Yeni"); kip("Hesapla");
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    for (const ad of ["İşlem adı 1", "İşlem tedarikçisi 1", "İşlem tutarı 1"]) expect(screen.getByLabelText(ad)).toBeTruthy();
    yaz("İşlem tutarı 1", "15"); kaydet();
    expect(screen.getByText(ISLEM_AD_HATASI)).toBeTruthy();
    expect(durum.parts.find(p => p.ad === "Yeni")).toBeUndefined();
    yaz("İşlem adı 1", "Büküm"); kaydet();
    expect(durum.parts.find(p => p.ad === "Yeni").maliyetKalemleri).toEqual([{ tur: "islem", ad: "Büküm", tutar: 15 }]);
  });
  it("AC-35 / R19: tutarı boş işlem kalemi uyarır, kayıt yapılır ve toplama girmez", () => {
    render(<Katalog />); duzenle("Gövde");
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    yaz("İşlem adı 2", "Kaplama");
    // Uyarı canlıdır (kayıttan önce görünür), toplama girmez, kaydı engellemez.
    expect(screen.getByTestId("islem-tutar-uyarisi").textContent).toBe(ISLEM_TUTAR_UYARISI);
    expect(screen.getByTestId("kalem-toplam-tutar").textContent).toBe(maliyetMetniKurus(birim(SACK) + 12550));
    kaydet();
    expect(kayit(44).maliyetKalemleri[2]).toEqual({ tur: "islem", ad: "Kaplama", tutar: null });
  });
  it("AC-103 (ekran): '2.400' tutarı belirsiz sayı olarak reddedilir, kayıt yapılmaz", () => {
    render(<Katalog />); duzenle("Gövde");
    yaz("İşlem tutarı 1", "2.400"); kaydet();
    expect(screen.getByText(BELIRSIZ_HATASI)).toBeTruthy();
    // Hatalı kalem varken de kaynak ibaresi kalemleri söyler (kayıt yapılmadı, toplam girilmedi).
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(kalemKaynakMetni({ malzeme: 1, islem: 1 }));
    expect(kayit(44).maliyetKalemleri[1].tutar).toBe(125.5);
  });
  it("Karar 38 (triyaj bulgu 1): kalem hatası satırına bağlıdır; hatalı satır kaldırılınca hata geçerli komşu satıra kaymaz", () => {
    render(<Katalog />); duzenle("Gövde");
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    yaz("İşlem adı 2", "Kaplama"); yaz("İşlem tutarı 2", "10");
    yaz("İşlem tutarı 1", "2.400"); kaydet();
    expect(within(screen.getAllByTestId("islem-kalemi")[0]).getByText(BELIRSIZ_HATASI)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "İşlem kalemini kaldır 1" }));
    expect(screen.getByLabelText("İşlem adı 1").value).toBe("Kaplama");
    expect(screen.queryByText(BELIRSIZ_HATASI)).toBeNull();
  });
  it("AC-101 / AC-102: tedarikçi seçicisi bütün canlı tedarikçileri listeler, işaretliler başta; aynı tedarikçi iki kalemde kaydedilir", () => {
    render(<Katalog />); duzenle("Gövde");
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    const secenekler = [...screen.getByLabelText("İşlem tedarikçisi 2").options].map(o => o.textContent);
    expect(secenekler.slice(1)).toEqual(["Hammadde A.Ş.", "Lazer Ltd.", "Kaplama Sanayi"]);
    yaz("İşlem adı 2", "Büküm"); yaz("İşlem tedarikçisi 2", "32"); yaz("İşlem tutarı 2", "10"); kaydet();
    expect(kayit(44).maliyetKalemleri.filter(k => k.tedarikciId === 32)).toHaveLength(2);
    expect(within(satir("Gövde")).getByTestId("parca-maliyet").textContent.startsWith(maliyetMetniKurus(birim(SACK) + 12550 + 1000))).toBe(true);
  });
  it("AC-43 / AC-44: kırılımdan türeyen kalemin adı sabit; bulunamayan tedarikçi alanında kendi ibaresi", () => {
    render(<Katalog />); duzenle("Kapak");
    expect(screen.getByLabelText("İşlem adı 2").value).toBe(TURETILEN_KALEM_ADI);
    const s = screen.getByLabelText("İşlem tedarikçisi 2");
    expect(s.selectedOptions[0].textContent).toBe(BULUNAMAYAN_TEDARIKCI);
  });
  it("AC-39 / AC-93 / AC-112: gider yetkisi olmayan kullanıcıda tedarikçi seçicisi yok, ad ve tutar görünür; hiçbir tedarikçi adı geçmez; ibare aynı", () => {
    render(<Katalog giderYetki={false} />);
    expect(within(satir("Kapak")).getByTestId("parca-maliyet-kalem").textContent).toBe(kalemKaynakMetni({ malzeme: 0, islem: 2 }));
    duzenle("Kapak");
    expect(screen.queryByLabelText("İşlem tedarikçisi 1")).toBeNull();
    expect(screen.getByLabelText("İşlem adı 1")).toBeTruthy();
    expect(screen.getByLabelText("İşlem tutarı 1")).toBeTruthy();
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(kalemKaynakMetni({ malzeme: 0, islem: 2 }));
    for (const t of TED) expect(document.body.textContent).not.toContain(t.ad);
  });
  it("AC-40: gider yetkisi olmayan kullanıcının kaydı işlem kalemlerinin tedarikçi bağını korur", () => {
    render(<Katalog giderYetki={false} />); duzenle("Gövde");
    yaz("İşlem tutarı 1", "130"); kaydet();
    expect(kayit(44).maliyetKalemleri[1]).toEqual({ tur: "islem", ad: "Lazer kesim", tedarikciId: 32, tutar: 130 });
  });
});

describe("Spec 0135: eski kayıtlar ve yazım (R22–R26/2)", () => {
  it("AC-45 / AC-95: eski malzeme satırlı parçada kalem alanına dokunulup kaydedilince maliyetKalemleri oluşur, eski alanlar kalkar", () => {
    render(<Katalog />); duzenle("Kesme mili");
    yaz("Boy 1", "80"); kaydet();
    const k = kayit(41);
    expect(k.maliyetKalemleri).toEqual([{ tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 140, boy: 80, payCap: 4, payBoy: 5, fire: 8, adet: 1 }]);
    expect(k).not.toHaveProperty("malzemeSatiri");
    expect(k).not.toHaveProperty("hammaddeler");
  });
  it("AC-46 / AC-96: kartı açıp hiçbir şeye dokunmadan kaydetmek gövdeyi değiştirmez", () => {
    render(<Katalog />);
    for (const id of [41, 43, 44, 45]) {
      const once = structuredClone(kayit(id));
      duzenle(once.ad); kaydet();
      expect(kayit(id)).toEqual(once);
    }
  });
  it("AC-47 / AC-94: eski malzeme satırlı parçanın yalnız adı değişince malzemeSatiri aynen durur, maliyetKalemleri oluşmaz", () => {
    render(<Katalog />); duzenle("Kesme mili");
    yaz("Yedek Parça Adı (TR)", "Kesme mili 2"); kaydet();
    const k = kayit(41);
    expect(k.ad).toBe("Kesme mili 2");
    expect(k.malzemeSatiri).toEqual(PARCALAR[0].malzemeSatiri);
    expect(k.maliyet).toBe(12);
    expect(k).not.toHaveProperty("maliyetKalemleri");
  });
  it("AC-48: kalem listesi boşaltılıp Elle sabit yapılınca maliyetKalemleri anahtarı kalkar", () => {
    render(<Katalog />); duzenle("Gövde");
    kip("Elle sabit"); fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    yaz("Alış maliyeti", "99"); kaydet();
    expect(kayit(44)).not.toHaveProperty("maliyetKalemleri");
    expect(kayit(44).maliyet).toBe(99);
  });
  it("AC-97: elle maliyeti dolu parçaya kalem eklenip kaydedilince maliyet anahtarı da kalkar", () => {
    render(<Katalog />); duzenle("Pul");
    kip("Hesapla"); fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    yaz("İşlem adı 1", "Taşlama"); yaz("İşlem tutarı 1", "6"); kaydet();
    expect(kayit(42)).not.toHaveProperty("maliyet");
    expect(kayit(42).maliyetKalemleri).toEqual([{ tur: "islem", ad: "Taşlama", tutar: 6 }]);
  });
  it("AC-98 (ekran): tutarı boş tek işlem kalemi ve saklı elle maliyet: girilmedi, eski tutar ne listede ne kartta", () => {
    render(<Katalog p0={[{ id: 60, ad: "Boş kalemli", models: [], maliyet: 777, maliyetKalemleri: [{ tur: "islem", ad: "Kaplama", tutar: null }] }]} />);
    expect(within(satir("Boş kalemli")).getByTestId("parca-maliyet").textContent.startsWith("—")).toBe(true);
    duzenle("Boş kalemli");
    expect(document.body.textContent).not.toMatch(/777/);
    // Triyaj (bulgu 2): Elle sabit'e geçilince de saklı eski elle tutar alana geri gelmez (R27/2).
    kip("Elle sabit"); fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    expect(screen.getByLabelText("Alış maliyeti").value).toBe("");
  });
});

describe("Spec 0135: geçerlilik tarihi (R35–R35/4, Karar 11, 12)", () => {
  it("AC-66 / AC-84: malzeme kalemi olan parçada tarih ve geçmiş çizilmez, yerinde ibare var", () => {
    render(<Katalog />); duzenle("Gövde");
    expect(screen.queryByLabelText(GECERLILIK_ETIKETI)).toBeNull();
    expect(screen.queryByTestId("maliyet-gecmisi")).toBeNull();
    expect(screen.getByTestId("kalem-gecmis-ibaresi").textContent).toBe(MALZEME_GECMIS_IBARESI);
  });
  it("AC-82 / AC-83: yalnız işlem kalemi olan parçada tarih alanı etkin; tutar değişince girilen tarihle geçmişe yeni toplam yazılır", () => {
    render(<Katalog />); duzenle("Kaplamalı pim");
    expect(screen.getByLabelText(GECERLILIK_ETIKETI).disabled).toBe(false);
    expect(screen.getByTestId("maliyet-gecmisi")).toBeTruthy();
    yaz("İşlem tutarı 1", "55"); yaz(GECERLILIK_ETIKETI, "2026-10-01"); kaydet();
    expect(kayit(45).maliyetGecmisi).toEqual([{ gecerli: "", kurus: 3000 }, { gecerli: "2026-05-01", kurus: 4000 }, { gecerli: "2026-10-01", kurus: 5500 }]);
  });
  it("AC-84 (ekleme anı): yalnız işlem kalemli parçaya malzeme kalemi eklenince tarih ve geçmiş kaybolur, ibare çıkar", () => {
    render(<Katalog />); duzenle("Kaplamalı pim");
    fireEvent.click(screen.getByRole("button", { name: /Malzeme ekle/ }));
    expect(screen.queryByLabelText(GECERLILIK_ETIKETI)).toBeNull();
    expect(screen.getByTestId("kalem-gecmis-ibaresi")).toBeTruthy();
  });
  it("AC-89: Elle sabit kipindeki parçada tarih alanı ve geçmiş bugünkü gibi", () => {
    render(<Katalog p0={[{ id: 61, ad: "Elle", models: [], maliyet: 50, maliyetGecmisi: [{ gecerli: "", kurus: 4000 }, { gecerli: "2026-05-01", kurus: 5000 }] }]} />);
    duzenle("Elle");
    expect(screen.getByLabelText(GECERLILIK_ETIKETI).disabled).toBe(false);
    expect(screen.getAllByTestId("maliyet-gecmisi-satiri")).toHaveLength(2);
  });
});

describe("Spec 0135: set ile kalem (R5/2, R25/3)", () => {
  it("AC-107: kalem listesi doluyken set içeriği bölümü pasif ve nedeni yazar", () => {
    render(<Katalog />); duzenle("Gövde");
    expect(screen.getByTestId("set-icerigi").disabled).toBe(true);
    expect(screen.getByTestId("set-kalem-pasif").textContent).toBe(SET_KALEM_PASIF_NEDENI);
    cleanup();
    render(<Katalog />); duzenle("Pul");
    expect(screen.getByTestId("set-icerigi").disabled).toBe(false);
    cleanup();
    // Triyaj (bulgu 2): ekleme kartında da kalem eklenince set bölümü pasifleşir.
    render(<Katalog />); ekleAc(); kip("Hesapla");
    expect(screen.getByTestId("set-icerigi").disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    expect(screen.getByTestId("set-icerigi").disabled).toBe(true);
    expect(screen.getByTestId("set-kalem-pasif").textContent).toBe(SET_KALEM_PASIF_NEDENI);
  });
  it("AC-108: set içeriği dolu parça kaydedilince kayıtta maliyetKalemleri yok (saklı bozuk kalem alanı da yazılmaz)", () => {
    render(<Katalog p0={[...PARCALAR, { id: 62, ad: "Karışık set", models: [], setIcerigi: [{ partId: 42, miktar: 2 }], maliyetKalemleri: [{ tur: "islem", ad: "Eski", tutar: 3 }] }]} />);
    duzenle("Karışık set");
    yaz("Bileşen adedi 1", "3"); kaydet();
    expect(kayit(62).setIcerigi).toEqual([{ partId: 42, miktar: 3 }]);
    expect(kayit(62)).not.toHaveProperty("maliyetKalemleri");
  });
});

describe("Spec 0135: fiyat, liste, süzgeç ve sayaç (R39–R47)", () => {
  it("AC-70: fiyat kipi maliyete bağlıyken kalem eklenince kartta TL fiyatı canlı olarak yeni maliyetten türer", () => {
    render(<Katalog fiyatAyarlari={{ varsayilanKat: 2 }} />); ekleAc();
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Fiyat kipi" })).getByRole("radio", { name: "Maliyete bağlı" }));
    kip("Hesapla");
    fireEvent.click(screen.getByRole("button", { name: /İşlem ekle/ }));
    yaz("İşlem adı 1", "Lazer"); yaz("İşlem tutarı 1", "100");
    expect(screen.getByLabelText("TL fiyatı (türetilen)").value).toMatch(/^200/);
  });
  it("AC-74 / AC-75 (ekran): Hesapla kipindeki parçanın hücresinde tek kalem ibaresi, kaç malzeme ve kaç işlem kalemi", () => {
    render(<Katalog />);
    expect(within(satir("Gövde")).getByTestId("parca-maliyet-kalem").textContent).toBe(kalemKaynakMetni({ malzeme: 1, islem: 1 }));
    expect(within(satir("Kesme mili")).getByTestId("parca-maliyet-kalem").textContent).toBe(kalemKaynakMetni({ malzeme: 1, islem: 0 }));
    expect(within(satir("Pul")).queryByTestId("parca-maliyet-kalem")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Malzemeden hesaplanıyor|tedarikçiden/);
  });
  it("AC-99 / AC-100: tedarikçi süzgeci işlem kalemindeki ve eski kırılımdaki tedarikçiyi süzer; 'girilmemiş' tedarikçisiz parçaları sayar", () => {
    render(<Katalog />);
    const s = screen.getByLabelText("Tedarikçi süzgeci");
    expect([...s.options].map(o => o.textContent)).toEqual(["Tüm parçalar", "Hammadde A.Ş. (1)", "Kaplama Sanayi (1)", BULUNAMAYAN_TEDARIKCI + " (1)", "Lazer Ltd. (1)", "İşlem kaleminde tedarikçi girilmemiş (4)"]);
    fireEvent.change(s, { target: { value: "31" } });
    expect(satir("Kapak")).toBeTruthy();
    expect(screen.queryByText("Gövde")).toBeNull();
    fireEvent.change(s, { target: { value: "32" } });
    expect(satir("Gövde")).toBeTruthy();
  });
  it("AC-76 / AC-118: maliyetsiz sayacı çözülemeyen kalem listesini sayar; toplu kip onayı aynı rakamı yazar", () => {
    const p0 = [{ id: 70, ad: "Boş kalemli", models: [], maliyetKalemleri: [{ tur: "islem", ad: "Kaplama", tutar: null }] },
      { id: 71, ad: "Fiyatsız malzemeli", models: [], maliyetKalemleri: [{ ...SACK, malzemeId: 999 }] }, { id: 72, ad: "Elle", models: [], maliyet: 3 }];
    render(<Katalog p0={p0} fiyatAyarlari={{ varsayilanKat: 2 }} />);
    expect(screen.getByTestId("maliyetsiz-parca").textContent).toMatch(/^2 parçanın/);
    fireEvent.click(screen.getByRole("button", { name: /maliyete bağla/ }));
    expect(screen.getByTestId("toplu-kip-onay").textContent).toContain(maliyetsizUyariMetni(2));
  });
});
