// @vitest-environment jsdom
// Spec 0134: Makina Maliyeti › Sipariş İhtiyacı (gerçek MakinaMaliyeti). Girdi, parti seçici, tablolar, uyarılar, yazdırma ve
// salt okunurluk (yazıcılar casus; ekran sürülürken hiçbiri çağrılmaz, AC-52, AC-53, AC-61).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MakinaMaliyeti, GORUNUMLER } from "../../src/components/MakinaMaliyeti";
import * as S from "../../src/lib/siparisIhtiyaci";
import { BOS_BASLIK, ELLE_GIRIS } from "../../src/components/maliyet/SiparisIhtiyaci";
import * as F from "../fixtures/0134-veri.js";

afterEach(() => { cleanup(); delete window.appPrint; });
const AK200 = F.model("AK200", [[42, 1]]);
const PARTILER = [
  { id: 801, ad: "Eski Parti", baslangicAy: "2026-01", bitisAy: "2026-03", planlananAdetler: { AK100_DS: 5 } },
  { id: 802, ad: "Yaz Partisi", baslangicAy: "2026-06", bitisAy: null, planlananAdetler: {} },
  { id: 803, ad: "Güz Partisi", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { "ak100_ds": 70, "YOK_MODEL": 3 } },
];
const yazicilar = () => ({ setGiderTurleri: vi.fn(), setStandardModels: vi.fn(), setCustomModels: vi.fn(), setUretimPartileri: vi.fn(), setAppSettings: vi.fn() });
let yaz;
const Ekran = ({ partiler = PARTILER, parts = F.veri().parts, partStock = [], malzemeler = [F.P304], tedarikciler = F.TED, rawTedarikciler = null, modeller = [F.AK100, AK200] } = {}) => {
  yaz = yazicilar();
  return <MakinaMaliyeti aktifKullanici="kerem" giderler={[]} giderTurleri={[]} tedarikciler={tedarikciler} stock={[]} customers={[]} partStockLog={[]}
    parts={parts} malzemeler={malzemeler} standardModels={modeller} customModels={[]} uretimPartileri={partiler} rates={{ usd: 41 }}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, uretimdeOlmayanModeller: ["AK200"] }} partStock={partStock} rawTedarikciler={rawTedarikciler}
    factory={{ name: "Altuntaş" }} baslangicGorunum="siparis" {...yaz} />;
};
const parcaSatiri = (ad) => screen.getAllByTestId("siparis-parca-satiri").find(r => within(r).queryByText(ad));
const hucre = (r) => [...r.querySelectorAll("td")].map(td => td.textContent);

describe("Spec 0134: girdi ve parti seçici", () => {
  it("R1: Sipariş İhtiyacı Makina Maliyeti'nin beşinci görünümüdür", () => {
    expect(GORUNUMLER.map(g => g.label)).toEqual(["Model Maliyetleri", "Parti Hesabı", "Üretim Partileri", "Hesap Ayarları", "Sipariş İhtiyacı"]);
    render(<Ekran />);
    expect(screen.getByRole("radio", { name: "Sipariş İhtiyacı" }).getAttribute("aria-checked")).toBe("true");
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
    expect(hucre(parcaSatiri("Kesme mili"))[3]).toBe("10");
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
    expect(hucre(parcaSatiri("Kesme mili"))[3]).toBe("70");
    expect(screen.getByRole("button", { name: /Yazdır/ }).disabled).toBe(true);
  });
});

describe("Spec 0134: tablolar ve uyarılar", () => {
  it("AC-18 / AC-14 / AC-79: ihtiyaç, stok, sipariş ayrı sütunlar; set patlatıldı; kesişim uyarısı ve iki kaynak", () => {
    render(<Ekran partStock={[{ partId: 42, miktar: 100 }]} />);
    const ths = [...screen.getByTestId("siparis-parca-tablosu").querySelectorAll("th")].map(t => t.textContent);
    expect(ths).toEqual(["Parça", "Ham ihtiyaç", "Emniyet payı", "İhtiyaç", "Stok", "Sipariş"]);
    expect(hucre(parcaSatiri("Pul")).slice(3)).toEqual(["700", "100", "600"]);
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
    expect(hucre(k).slice(1)).toEqual(["747,512 kg", "59,801 kg", "771,957 kg", "24,445 kg", "1 boy", "", "2.277,27 $", "113.863,68 ₺"]);
    expect(within(k).getAllByTestId("siparis-kesit-neden").map(e => e.textContent)).toContain(S.FIRE_BOY_UYARISI);
    expect(screen.getByTestId("siparis-tedarikci").textContent).toBe("Ana Çelik113.863,68 ₺");
    expect(screen.getByTestId("siparis-toplam").textContent).toBe("Toplam: 113.863,68 ₺");
  });
  it("AC-46 / AC-87: çöpteki tedarikçinin adı ham diziden 'silinmiş' işaretiyle; tutar toplamda", () => {
    render(<Ekran tedarikciler={[]} rawTedarikciler={[{ id: 12, ad: "Ana Çelik", deletedAt: "2026-09-01" }]} />);
    expect(screen.getByTestId("siparis-tedarikci").textContent).toBe("Ana Çelik (silinmiş tedarikçi)113.863,68 ₺");
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
    expect(html).toContain("SİPARİŞ İHTİYACI"); expect(html).toContain("PARÇA İHTİYACI"); expect(html).toContain("Ana Çelik");
    expect(ad).toMatch(/^Siparis-Ihtiyaci-/);
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
