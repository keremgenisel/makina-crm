// @vitest-environment jsdom
// Spec 0134: sipariş ihtiyacı ekranı. Spec 0140 ile (B-R1/2, B-R2, R14 / karar 45): ekran Makina Maliyeti'nden kalktı, aynı içerik
// tek pencerede (stock/SiparisPenceresi.jsx); bu dosya hesap ve girdi iddialarını pencere üzerinde aynen ölçer. Ekranın yerine bağlı
// iddialar (beşinci görünüm, tek toplam satırı, belgede PARÇA İHTİYACI) "spec 0140 ile" notuyla ters çevrildi.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { GORUNUMLER } from "../../src/components/MakinaMaliyeti";
import * as S from "../../src/lib/siparisIhtiyaci";
import { SiparisPenceresi, BOS_BASLIK, ELLE_GIRIS } from "../../src/components/stock/SiparisPenceresi";
import { kutuAc } from "./kutuAc";
import * as F from "../fixtures/0134-veri.js";

afterEach(() => { cleanup(); delete window.appPrint; });
const AK200 = F.model("AK200", [[42, 1]]);
const PARTILER = [
  { id: 801, ad: "Eski Parti", baslangicAy: "2026-01", bitisAy: "2026-03", planlananAdetler: { AK100_DS: 5 } },
  { id: 802, ad: "Yaz Partisi", baslangicAy: "2026-06", bitisAy: null, planlananAdetler: {} },
  { id: 803, ad: "Güz Partisi", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { "ak100_ds": 70, "YOK_MODEL": 3 } },
];
// Pencere yazıcı prop'u almaz (C4); casuslar veri nesnesine konur ve hiçbiri çağrılmaz (AC-52, AC-53, AC-61).
const yazicilar = () => ({ setGiderTurleri: vi.fn(), setStandardModels: vi.fn(), setCustomModels: vi.fn(), setUretimPartileri: vi.fn(), setAppSettings: vi.fn() });
let yaz;
const Ekran = ({ partiler = PARTILER, parts = F.veri().parts, partStock = [], malzemeler = [F.P304], tedarikciler = F.TED, rawTedarikciler = null, modeller = [F.AK100, AK200] } = {}) => {
  yaz = yazicilar();
  return <SiparisPenceresi giderYetki bugun="2026-11-05" onClose={vi.fn()} veri={{ parts, partStock, malzemeler, tedarikciler, hamTedarikciler: rawTedarikciler,
    standardModels: modeller, customModels: [], uretimPartileri: partiler, appSettings: { uretimdeOlmayanModeller: ["AK200"] }, factory: { name: "Altuntaş" }, ...yaz }} />;
};
// Spec 0140 C-R10: "Parça ihtiyacı" tablosu katlanabilir bölümdedir; satır okuyan testler önce açar.
const parcaSatiri = (ad) => { if (!screen.queryByTestId("siparis-parca-tablosu")) kutuAc("Parça ihtiyacı"); return screen.getAllByTestId("siparis-parca-satiri").find(r => within(r).queryByText(ad)); };
const hucre = (r) => [...r.querySelectorAll("td")].map(td => td.textContent);

describe("Spec 0134: girdi ve parti seçici", () => {
  it("R1 (spec 0140 ile, B-R2): Sipariş İhtiyacı görünümü Makina Maliyeti'nden kalktı; içerik sipariş penceresinde", () => {
    expect(GORUNUMLER.map(g => g.label)).toEqual(["Model Maliyetleri", "Parti Hesabı", "Üretim Partileri", "Hesap Ayarları"]);
    render(<Ekran />);
    expect(screen.getByTestId("siparis-penceresi")).toBeTruthy();
  });
  it("AC-96: açık partiler '(açık)' ekiyle, kapanmış parti listede; varsayılan en son başlayan açık parti", () => {
    render(<Ekran />);
    const sec = screen.getByLabelText("Üretim partisi");
    expect([...sec.options].map(o => o.textContent)).toEqual([ELLE_GIRIS, "Eski Parti", "Yaz Partisi (açık)", "Güz Partisi (açık)"]);
    expect(sec.value).toBe("803");
  });
  it("AC-3 / AC-5 / AC-95: partinin planlanan adetleri katalog adıyla hazır gelir; katalogda olmayan ad adıyla listelenir", () => {
    render(<Ekran />);
    expect(screen.getByLabelText("Model 1").value).toBe("AK100_DS");
    expect(screen.getByLabelText("Makina adedi 1").value).toBe("70");
    expect(screen.getByTestId("siparis-bulunamayan-model").textContent).toContain("YOK_MODEL");
  });
  it("AC-4: planlanan adedi olmayan parti seçilince satırlar boş, neden yazar; AC-2: boş durum model eklemeyi adres gösterir", () => {
    render(<Ekran />);
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "802" } });
    expect(screen.getByTestId("siparis-parti-plan-yok").textContent).toBe(S.PARTI_PLAN_YOK);
    expect(screen.getByTestId("bos-siparis").textContent).toContain(BOS_BASLIK);
    expect(screen.getByTestId("bos-siparis").textContent).toContain("Model Satırı Ekle");
    expect(screen.queryByTestId("siparis-parca-tablosu")).toBeNull();
  });
  it("AC-2: hiç parti yokken boş durum, tablo yok", () => {
    render(<Ekran partiler={[]} />);
    expect(screen.getByTestId("bos-siparis")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("AC-6 / AC-53 / Karar 39: hazır gelen adet değiştirilir, partiye yazılmaz; parti değişince satırlar yeniden dolar", () => {
    render(<Ekran />);
    fireEvent.change(screen.getByLabelText("Makina adedi 1"), { target: { value: "10" } });
    expect(hucre(parcaSatiri("Kesme mili"))[2]).toBe("10"); // spec 0141 ile: pay sütunu kalktı, İhtiyaç bir sola
    expect(yaz.setUretimPartileri).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "801" } });
    expect(screen.getByLabelText("Makina adedi 1").value).toBe("5");
  });
  it("AC-7: model seçicisi üretimde olmayan modeli listelemez", () => {
    render(<Ekran />);
    fireEvent.click(screen.getByRole("button", { name: /Model Satırı Ekle/ }));
    expect([...screen.getByLabelText("Model 2").options].map(o => o.textContent)).toEqual(["Model seçin", "AK100_DS"]);
  });
  it("AC-8 / AC-9 / AC-102 / AC-103: satır nedenleri, 'n satır hatalı' ibaresi, öteki satırlar hesaplanır, yazdırma pasif", () => {
    render(<Ekran />);
    fireEvent.click(screen.getByRole("button", { name: /Model Satırı Ekle/ }));
    fireEvent.change(screen.getByLabelText("Model 2"), { target: { value: "AK100_DS" } });
    fireEvent.change(screen.getByLabelText("Makina adedi 2"), { target: { value: "5" } });
    expect(screen.getByText(S.AYNI_MODEL_HATASI)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Makina adedi 1"), { target: { value: "10001" } });
    expect(screen.getByText(S.ADET_UST_HATASI)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Makina adedi 1"), { target: { value: "0" } });
    expect(screen.getByText(S.ADET_HATASI)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Makina adedi 1"), { target: { value: "70" } });
    expect(screen.getByTestId("siparis-hatali-satir").textContent).toBe(S.hataliSatirMetni(1));
    expect(hucre(parcaSatiri("Kesme mili"))[2]).toBe("70"); // spec 0141 ile
    expect(screen.getByRole("button", { name: /Yazdır/ }).disabled).toBe(true);
  });
});

describe("Spec 0134: tablolar ve uyarılar", () => {
  it("AC-18 / AC-14 / AC-79: ihtiyaç, stok, sipariş ayrı sütunlar; set patlatıldı; kesişim uyarısı ve iki kaynak", () => {
    render(<Ekran partStock={[{ partId: 42, miktar: 100 }]} />);
    const pul = parcaSatiri("Pul");
    const ths = [...screen.getByTestId("siparis-parca-tablosu").querySelectorAll("th")].map(t => t.textContent);
    // Spec 0140 ile (D-R2/2, karar 34): öneri sütunu ve set satırlarının "sipariş etme" anahtarı eklendi.
    // Spec 0141 ile (B-R4, AC-23): "Emniyet payı" sütunu kalktı, tablo yedi başlık.
    // Spec 0142 ile (C-R4, AC-28): Parça ile Ham ihtiyaç arasına Ölçü sütunu geldi; hücre sırası bir kaydı.
    expect(ths).toEqual(["Parça", "Ölçü", "Ham ihtiyaç", "İhtiyaç", "Stok", "Sipariş (öneri)", "Sipariş", "Sipariş etme"]);
    expect(hucre(pul).slice(3, 7)).toEqual(["700", "100", "600", "600"]);
    expect(within(parcaSatiri("Bağlantı seti")).getByTestId("siparis-patlatildi")).toBeTruthy();
    expect(screen.getByTestId("siparis-kesisim").textContent).toBe(S.KESISIM_UYARISI("Bağlantı seti", "Pul"));
    expect(within(parcaSatiri("Pul")).getByTestId("siparis-iki-kaynak")).toBeTruthy();
  });
  it("AC-23 / AC-24 / AC-104: kiti boş model adıyla yazar; çöpteki parça ad kopyası ve silinmiş işaretiyle", () => {
    const bos = F.model("BOS", []);
    const eski = F.model("AK100_DS", [[41, 1], [49, 2, "Eski burç"]]);
    render(<Ekran modeller={[eski, bos]} partiler={[{ id: 9, ad: "P", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70, BOS: 2 } }]} />);
    expect(screen.getByTestId("siparis-kit-bos").textContent).toBe(S.KIT_BOS_METNI("BOS"));
    expect(within(parcaSatiri("Eski burç")).getByTestId("siparis-silinmis")).toBeTruthy();
    expect(screen.getByTestId("siparis-eksik").textContent).toMatch(/^1 parçanın/);
  });
  it("AC-55 / AC-85: stok sayılmamışsa uyarı iki sayıyla; AC-99: hazır parçalar nötr sayıyla", () => {
    render(<Ekran />);
    expect(screen.getByTestId("siparis-stok-uyarisi").textContent).toBe(S.STOK_UYARISI(0, 4));
    expect(screen.getByTestId("siparis-hazir").textContent).toContain("2 parçada malzeme kalemi yok"); // spec 0135 ile (R30/2): kalem dili
  });
  it("AC-26 / AC-29 / AC-31 / AC-36 (ekran): kesit satırı net, sipariş, boy, TL ve fire uyarısı; tedarikçi toplamı", () => {
    render(<Ekran />);
    const k = screen.getByTestId("siparis-kesit-satiri");
    expect(k.textContent).toContain("Ø144");
    // Spec 0140 ile (D-R2/2): öneri sütunu ve düzenlenebilir sipariş hücresi; değerler 0134'teki gibi. Artan kilo sütunu kalktı (belgede de yok).
    const h = hucre(k);
    // Spec 0142 ile (C-R1, AC-30): Tutar ve TL sütunları ve tedarikçi toplamı kalktı (para pencereden kalkar).
    expect([h[1], h[2], h[3], h[5], h[6]]).toEqual(["747,512 kg", "59,801 kg", "771,957 kg", "1 boy", ""]);
    expect(h).not.toContain("2.277,27 $"); expect(k.textContent).not.toMatch(/₺|\$|€/);
    expect(within(k).getAllByTestId("siparis-kesit-neden").map(e => e.textContent)).toContain(S.FIRE_BOY_UYARISI);
    expect(screen.getByTestId("siparis-tedarikci-adi").textContent).toBe("Ana Çelik");
    expect(screen.queryByTestId("siparis-tedarikci-toplam")).toBeNull(); // spec 0142 ile (C-R1): bölüm başlığında toplam yok
  });
  // Spec 0142 ile (C-R1): tutarın toplamda görünmesi yarısı kalktı; ad yarısı aynen.
  it("AC-46 / AC-87 (spec 0142 ile): çöpteki tedarikçinin adı ham diziden 'silinmiş' işaretiyle; toplam çizilmez", () => {
    render(<Ekran tedarikciler={[]} rawTedarikciler={[{ id: 12, ad: "Ana Çelik", deletedAt: "2026-09-01" }]} />);
    expect(screen.getByTestId("siparis-tedarikci-adi").textContent).toBe("Ana Çelik (silinmiş tedarikçi)");
    expect(screen.queryByTestId("siparis-tedarikci-toplam")).toBeNull();
  });
});

describe("Spec 0134: yazdırma ve salt okunurluk", () => {
  it("AC-50 / AC-51: hiç satır yokken yazdırma pasif; satır varken Türkçe liste basılır", () => {
    window.appPrint = { printHtml: vi.fn() };
    render(<Ekran partiler={[]} />);
    expect(screen.queryByRole("button", { name: /Yazdır/ }).disabled).toBe(true);
    cleanup();
    render(<Ekran />);
    fireEvent.click(screen.getByRole("button", { name: /Yazdır/ }));
    const [html, , ad] = window.appPrint.printHtml.mock.calls[0];
    // Spec 0140 ile (C-R10, E-R1): belgenin adı "Sipariş Listesi", PARÇA İHTİYACI tablosu belgede yok.
    expect(html).toContain("SİPARİŞ LİSTESİ"); expect(html).not.toContain("PARÇA İHTİYACI"); expect(html).toContain("Ana Çelik");
    expect(ad).toMatch(/^Siparis-Listesi-/);
  });
  it("AC-52 / AC-53 / AC-61: ekran sürülürken hiçbir yazıcı çağrılmaz", () => {
    render(<Ekran />);
    fireEvent.change(screen.getByLabelText("Makina adedi 1"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /Model Satırı Ekle/ }));
    fireEvent.click(screen.getByRole("button", { name: "Model satırı 2 sil" }));
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "801" } });
    for (const [ad, f] of Object.entries(yaz)) expect(f, ad).not.toHaveBeenCalled();
  });
});

describe("Düğme düzeni (2026-11-08): model satırının silme düğmesi", () => {
  it("silme düğmesi uygulamanın kırmızı silme düğmesidir ve sütunu düğmeye göre genişler", () => {
    render(<Ekran />);
    const sil = screen.getByRole("button", { name: "Model satırı 1 sil" });
    expect(sil.className).toContain("btn--danger");
    expect(sil.parentElement.style.gridTemplateColumns).toBe("1fr 130px auto");
  });
});
