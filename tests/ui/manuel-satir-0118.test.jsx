// @vitest-environment jsdom
// Spec 0118: Manuel Satır Ekle penceresi. Kalıbın kodu (ön doldurma, öncelik, ipucu), seçili kaydın bekleyen tamirleri (ekranın
// hazır sonucundan süzülür, tek kurucudan satır doğar), ekle düğmesinin metni, kapalı dönem kapısı. Gerçek UretimFormu ile.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { UretimFormu } from "../../src/components/stock/UretimFormu";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { buildPrintHtml } from "../../src/components/stock/uretimFormPrint";
import { uretimFormHaritasi } from "../../src/lib/musteriDurumu";
import { tamirEtiketVerisi } from "../../src/lib/printTemplates";
import { TAMIR_YOK, MANUEL_TAMIR_BASLIGI, MANUEL_KOD_IPUCU, tamirSatirHaritasi, tamirOzeti } from "../../src/lib/kalipTamiri";
import { CUSTOMERS, SERVICES, PART_SALES, URETIM_FORMLARI, KALIP_DEFS } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); });

const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }, { id: 2, ad: "HAMBURGER", olcu: "Ø98" }];
// Anadolu Köfte'nin ikinci makina kaydı (aynı firma, ayrı kayıt; R7/3) ve Bafra'nın tamiri (başka firma).
const MUSTERILER = [...CUSTOMERS, { ...CUSTOMERS[0], id: 3, model: "AK120", serialNo: "S3", kaliplar: [] }];
const SV = [
  { ...SERVICES[0], atolyeKaliplari: LISTE },
  { ...SERVICES[1], atolyeKaliplari: [{ id: 7, ad: "BAFRA KALIBI", olcu: "" }] },
  { ...SERVICES[0], id: 43, customerId: 3, date: "2026-10-15", atolyeKaliplari: [{ id: 8, ad: "İKİNCİ MAKİNA KALIBI", olcu: "" }] },
  { ...SERVICES[0], id: 44, date: "2026-10-16", atolyeKaliplari: [{ id: 9, ad: "HAMBURGER", olcu: "Ø98" }] }, // aynı adlı giriş, başka servis
];

let dis; let toastlar = [];
function Kap({ services0 = SV, formlar0 = URETIM_FORMLARI }) {
  const [customers, setCustomers] = useState(MUSTERILER);
  const [partSales, setPartSales] = useState(PART_SALES);
  const [uretimFormlari, setUretimFormlari] = useState(formlar0);
  dis = { customers, uretimFormlari, services: services0 };
  return <UretimFormu uretimFormlari={uretimFormlari.filter(f => !f.deletedAt)} setUretimFormlari={setUretimFormlari}
    customers={customers} partSales={partSales} kalipDefs={KALIP_DEFS} services={services0} setCustomers={setCustomers}
    setPartSales={setPartSales} showToast={(m) => toastlar.push(m)} />;
}
const kur = (ek = {}) => { toastlar = []; render(<Kap {...ek} />); };
const formAc = () => fireEvent.click(within(document.querySelector("tbody tr")).getAllByRole("button")[0]);
const ac = () => fireEvent.click(screen.getByText("Manuel Satır Ekle"));
const pencere = () => [...document.querySelectorAll(".modal-backdrop")].pop();
const P = () => within(pencere());
const musteri = (ad, i = 0) => fireEvent.click(P().getAllByText(ad)[i]);
const kalip = (ad) => fireEvent.click(P().getAllByText(ad).find(e => e.closest("[data-testid='manuel-tamir-giris']") == null));
const tamirGirisleri = () => P().queryAllByTestId("manuel-tamir-giris");
const ekle = () => fireEvent.click(P().getByTestId("manuel-ekle-dugmesi"));
const kodAlani = () => P().getByLabelText("Kalıp Kodu");
const kaydet = () => fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.trim() === "Kaydet"));
const formSatirlari = () => dis.uretimFormlari[0].satirlar;
const yeniSatirlar = (once) => { kaydet(); return formSatirlari().slice(once); };

describe("Spec 0118 A: kalıbın kodu", () => {
  it("AC-1, AC-8: kodlu kalıp seçilince alan kodu gösterir; satır o kodu taşır, formda ve çıktıda görünür", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); kalip("HAMBURGER");
    expect(kodAlani().value).toBe("HB-98");
    expect(P().queryByTestId("manuel-kod-ipucu")).toBeNull();
    ekle();
    const satir = yeniSatirlar(2)[0];
    expect(satir.kalipKodu).toBe("HB-98");
    expect(buildPrintHtml(dis.uretimFormlari[0])).toContain("HB-98");
  });
  it("AC-2, AC-3, AC-4: kodsuz kalıpta alan boş, ipucu çizilir, satır yine eklenir", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); kalip("KASAP KÖFTE");
    expect(kodAlani().value).toBe("");
    expect(P().getByTestId("manuel-kod-ipucu").textContent).toBe(MANUEL_KOD_IPUCU);
    // Karar 38 (triyaj): ölçüt katalogdur, alanın değeri değil; değer yazılınca ipucu kalır.
    fireEvent.change(kodAlani(), { target: { value: "X" } });
    expect(P().getByTestId("manuel-kod-ipucu")).toBeTruthy();
    ekle();
    expect(yeniSatirlar(2).map(r => r.kalipAdi)).toEqual(["KASAP KÖFTE"]);
  });
  it("AC-41: adı katalogda hiç bulunmayan kalıpta da aynı ipucu", () => {
    const m = MUSTERILER.map(c => (c.id === 1 ? { ...c, kaliplar: [{ ad: "HİÇ YOK", olcu: "" }] } : c));
    toastlar = [];
    function K2() {
      const [u, setU] = useState(URETIM_FORMLARI);
      return <UretimFormu uretimFormlari={u} setUretimFormlari={setU} customers={m} partSales={[]} kalipDefs={KALIP_DEFS} services={[]} showToast={() => {}} />;
    }
    render(<K2 />); formAc(); ac(); musteri("Anadolu Köfte"); kalip("HİÇ YOK");
    expect(P().getByTestId("manuel-kod-ipucu").textContent).toBe(MANUEL_KOD_IPUCU);
  });
  it("AC-5, AC-31: tek kalıpta yazılan değer satıra yazılır; boşaltılırsa satırın kodu boştur", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); kalip("HAMBURGER");
    fireEvent.change(kodAlani(), { target: { value: "ÖZEL-1" } });
    ekle();
    expect(yeniSatirlar(2)[0].kalipKodu).toBe("ÖZEL-1");
    cleanup();
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); kalip("HAMBURGER");
    fireEvent.change(kodAlani(), { target: { value: "" } });
    expect(P().queryByTestId("manuel-kod-ipucu")).toBeNull(); // Karar 38 (triyaj): kodlu kalıpta boş alan ipucu çizdirmez
    ekle();
    expect(yeniSatirlar(2)[0].kalipKodu).toBe("");
  });
  it("AC-6, AC-7, AC-32, AC-40: iki kalıpta alan boşalır, yer tutucu nedenini yazar, ipucu yok; yazılan değer yok sayılır", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); kalip("HAMBURGER"); kalip("KASAP KÖFTE");
    expect(kodAlani().value).toBe("");
    expect(kodAlani().getAttribute("placeholder")).toBe("Her kalıp kendi kodunu kullanır");
    expect(P().queryByTestId("manuel-kod-ipucu")).toBeNull();
    fireEvent.change(kodAlani(), { target: { value: "YANLIŞ" } });
    ekle();
    const y = yeniSatirlar(2);
    expect(y.map(r => [r.kalipAdi, r.kalipKodu])).toEqual([["HAMBURGER", "HB-98"], ["KASAP KÖFTE", ""]]);
  });
  it("AC-40: kodsuz kalıp önce seçilse de iki kalıpta ipucu yok; hiç kalıp seçilmemişken de yok", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte");
    expect(P().queryByTestId("manuel-kod-ipucu")).toBeNull();
    kalip("KASAP KÖFTE"); kalip("HAMBURGER");
    expect(P().queryByTestId("manuel-kod-ipucu")).toBeNull();
    kalip("HAMBURGER");
    expect(P().getByTestId("manuel-kod-ipucu")).toBeTruthy();
  });
  it("AC-30: üç manuel alan, ilki Kalıp Kodu; CNC Programı yok", () => {
    kur(); formAc(); ac();
    expect(P().getByLabelText("Kalıp Kodu")).toBeTruthy();
    expect(P().getByLabelText("Kalıp Ölçüsü")).toBeTruthy();
    expect(P().getByLabelText("Makina Kalıp Çapı")).toBeTruthy();
    expect(pencere().textContent).not.toContain("CNC Programı");
  });
  it("AC-37: bir kalıp ve bir tamir seçiliyken kod alanı kalıbın kodunu göstermeye devam eder", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); kalip("HAMBURGER");
    fireEvent.click(tamirGirisleri()[0]);
    expect(kodAlani().value).toBe("HB-98");
  });
});

describe("Spec 0118 B: bekleyen tamirler", () => {
  it("AC-11: müşteri seçilmeden bölüm yok", () => {
    kur(); formAc(); ac();
    expect(P().queryByTestId("manuel-tamir-bolumu")).toBeNull();
  });
  it("AC-12, AC-13, AC-14, AC-35, AC-43: seçili kaydın girişleri; başka firma ve aynı firmanın öteki kaydı yok; metin biçimi; başlık sabitten", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte", 0);
    const bolum = P().getByTestId("manuel-tamir-bolumu");
    expect(within(bolum).getByText(MANUEL_TAMIR_BASLIGI)).toBeTruthy();
    expect(tamirGirisleri().map(e => e.textContent.replace("✓", "").trim())).toEqual([
      "100_ERKEK KALIPLAR REVİZE · 12/10/2026", "HAMBURGER · Ø98 · 12/10/2026", "HAMBURGER · Ø98 · 16/10/2026"]);
    expect(pencere().textContent).not.toContain("BAFRA KALIBI");
    expect(pencere().textContent).not.toContain("İKİNCİ MAKİNA KALIBI");
    musteri("Anadolu Köfte", 1); // aynı firmanın ikinci makina kaydı
    expect(tamirGirisleri().map(e => e.textContent.replace("✓", "").trim())).toEqual(["İKİNCİ MAKİNA KALIBI · 15/10/2026"]);
  });
  it("AC-35, Karar 40 (triyaj): müşteri kimliği dize taşıyan eski servisin tamiri de listelenir", () => {
    kur({ services0: [...SV, { ...SERVICES[0], id: 45, customerId: "1", date: "2026-10-17", atolyeKaliplari: [{ id: 10, ad: "DİZE KİMLİKLİ", olcu: "" }] }] });
    formAc(); ac(); musteri("Anadolu Köfte", 0);
    expect(tamirGirisleri().some(e => e.textContent.includes("DİZE KİMLİKLİ · 17/10/2026"))).toBe(true);
    fireEvent.click(tamirGirisleri().find(e => e.textContent.includes("DİZE KİMLİKLİ")));
    ekle();
    expect(yeniSatirlar(2)[0]).toMatchObject({ kaynakId: 45, kaynakKalipId: 10, musteriAdi: "Anadolu Köfte" });
  });
  it("AC-15: bekleyen tamiri olmayan firmada boş durum TAMIR_YOK ile", () => {
    kur(); formAc(); ac(); musteri("Bafra Gıda");
    fireEvent.click(tamirGirisleri()[0]); ekle(); // Bafra'nın tek tamirini ekle; artık bekleyen yok
    ac(); musteri("Bafra Gıda");
    expect(P().getByTestId("manuel-tamir-bos").textContent).toContain(TAMIR_YOK);
  });
  it("AC-16, AC-17, AC-36, AC-21, AC-44: tamir satırı tek kurucudan, manuel alanları taşımaz; üretim önce tamir sonra listenin sonunda; bildirim yok", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); kalip("KASAP KÖFTE");
    fireEvent.change(kodAlani(), { target: { value: "MAN-1" } });
    fireEvent.change(P().getByLabelText("Kalıp Ölçüsü"), { target: { value: "99x99" } });
    fireEvent.change(P().getByLabelText("Makina Kalıp Çapı"), { target: { value: "ÇAP-X" } });
    fireEvent.click(tamirGirisleri()[1]); // HAMBURGER · Ø98 (servis 41)
    expect(P().getByTestId("manuel-ekle-dugmesi").textContent).toContain("2 Satır Ekle");
    const once = toastlar.length;
    ekle();
    expect(toastlar.length).toBe(once);
    expect(screen.getAllByTestId("uretim-tamir-kaynak").map(e => e.textContent)).toContain("Servis · Garanti Dışı · 12/10/2026");
    const y = yeniSatirlar(2);
    expect(y.map(r => r.tur)).toEqual(["uretim", "tamir"]);
    // Kalıbın kendi ölçüsü manuel ölçünün önüne geçer (bugünkü öncelik, X8); kod ve çap manuel değerden.
    expect(y[0]).toMatchObject({ kalipKodu: "MAN-1", kalipOlcusu: "46*80", makinaKalipCapi: "ÇAP-X" });
    expect(y[1]).toMatchObject({ tur: "tamir", kaynakTip: "servis_tamir", kaynakId: 41, kaynakKalipId: 2, kalipAdi: "HAMBURGER", kalipOlcusu: "Ø98", kalipKodu: "HB-98", servisTarihi: "2026-10-12" });
    expect(y[1].makinaKalipCapi).not.toBe("ÇAP-X");
    // Triyaj: müşteri alanları kurucuya verilen müşteri nesnesinden (null verilirse dördü boş doğar, çıktı gruplaması bozulur).
    expect(y[1]).toMatchObject({ musteriId: 1, musteriAdi: "Anadolu Köfte", sehir: "Konya", makinaKodu: "AK100", makinaKalipCapi: "200 x 121 x 48" });
  });
  it("AC-18: eklenen tamir satırı kalıp durumu haritasına girmez", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); fireEvent.click(tamirGirisleri()[0]); ekle(); kaydet();
    const once = JSON.stringify(uretimFormHaritasi(URETIM_FORMLARI));
    expect(JSON.stringify(uretimFormHaritasi(dis.uretimFormlari))).toBe(once);
  });
  it("AC-19: başka canlı formda satırı olan tamir listede yok", () => {
    const baska = { ...URETIM_FORMLARI[0], id: 77, baslangicTarihi: "2026-01-01", bitisTarihi: "2026-01-01",
      satirlar: [{ id: 7701, tur: "tamir", kaynakTip: "servis_tamir", kaynakId: 41, kaynakKalipId: 1, kalipAdi: "100_ERKEK KALIPLAR REVİZE", tamamlandi: false }] };
    kur({ formlar0: [...URETIM_FORMLARI, baska] }); formAc(); ac(); musteri("Anadolu Köfte");
    expect(tamirGirisleri().map(e => e.textContent)).not.toContain(expect.stringContaining("100_ERKEK"));
    expect(tamirGirisleri().some(e => e.textContent.includes("100_ERKEK"))).toBe(false);
  });
  it("AC-34, AC-20: eklenen tamir kaydetmeden de, kaydettikten sonra da pencerede yok", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); fireEvent.click(tamirGirisleri()[0]); ekle();
    ac(); musteri("Anadolu Köfte");
    expect(tamirGirisleri().some(e => e.textContent.includes("100_ERKEK"))).toBe(false);
    fireEvent.click(P().getByText("İptal"));
    kaydet(); formAc(); ac(); musteri("Anadolu Köfte");
    expect(tamirGirisleri().some(e => e.textContent.includes("100_ERKEK"))).toBe(false);
  });
  it("AC-42: iki servisin aynı adlı girişinden yalnız işaretlenen eklenir", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte");
    fireEvent.click(tamirGirisleri()[2]); // HAMBURGER, servis 44
    ekle();
    const y = yeniSatirlar(2);
    expect(y.map(r => [r.kaynakId, r.kaynakKalipId])).toEqual([[44, 9]]);
  });
  it("AC-22, AC-23: düğme metni 0/1'de 'Satıra Ekle', üstünde toplam; hiçbiri seçilmemişken pasif", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte");
    const d = () => P().getByTestId("manuel-ekle-dugmesi");
    expect(d().disabled).toBe(true);
    expect(d().textContent).toContain("Satıra Ekle");
    fireEvent.click(tamirGirisleri()[0]);
    expect(d().disabled).toBe(false);
    expect(d().textContent).toContain("Satıra Ekle");
    kalip("HAMBURGER"); fireEvent.click(tamirGirisleri()[1]);
    expect(d().textContent).toContain("3 Satır Ekle");
  });
  it("AC-38: müşteri değişince tamir seçimi sıfırlanır ve düğme pasife döner", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); fireEvent.click(tamirGirisleri()[0]);
    musteri("Bafra Gıda");
    expect(P().getByTestId("manuel-ekle-dugmesi").disabled).toBe(true);
    musteri("Anadolu Köfte", 0);
    expect(P().getByTestId("manuel-ekle-dugmesi").disabled).toBe(true);
  });
  it("AC-24: dönemi sonlandırılmış formda pencere açılmaz, bildirim toplama düğmeleriyle birebir aynı", () => {
    kur({ formlar0: [{ ...URETIM_FORMLARI[0], kapali: true }] }); formAc();
    ac();
    expect(document.querySelectorAll(".modal-backdrop").length).toBe(0);
    const m = toastlar.at(-1);
    fireEvent.click(screen.getByTestId("bekleyen-tamir-dugmesi"));
    expect(toastlar.at(-1)).toBe(m);
    expect(m).toBe("Bu dönem sonlandırılmış, yeni kalıp eklenemez.");
  });
  it("AC-25: pencere servis kaydına yazmaz (servis dizisi aynı nesne)", () => {
    kur(); const sv = dis.services; formAc(); ac(); musteri("Anadolu Köfte"); fireEvent.click(tamirGirisleri()[0]); ekle(); kaydet();
    expect(dis.services).toBe(sv);
    expect(JSON.stringify(sv)).toBe(JSON.stringify(SV));
  });
  it("AC-45: kayıttan sonra pano rozeti güncellenir; kargo etiketi çıktısı değişmez", () => {
    const etiketOnce = JSON.stringify(tamirEtiketVerisi(SV[0], { customers: MUSTERILER, factory: null }));
    const rozetOnce = tamirOzeti(SV[0], tamirSatirHaritasi(URETIM_FORMLARI));
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); fireEvent.click(tamirGirisleri()[0]); ekle(); kaydet();
    const rozetSonra = tamirOzeti(SV[0], tamirSatirHaritasi(dis.uretimFormlari));
    expect(rozetOnce.formaGirmemis).toBe(2);
    expect(rozetSonra.formaGirmemis).toBe(1);
    expect(JSON.stringify(tamirEtiketVerisi(SV[0], { customers: MUSTERILER, factory: null }))).toBe(etiketOnce);
    cleanup();
    render(<ServisPanosu services={SV} setServices={vi.fn()} customers={MUSTERILER} dealers={[]} parts={[]} calisanlar={[]} showToast={vi.fn()}
      yedekParcaSatislar={[]} setYedekParcaSatislar={vi.fn()} dosyalar={[]} setDosyalar={vi.fn()} uretimFormlari={dis.uretimFormlari} />);
    expect(screen.getAllByTestId("tamir-rozeti").map(e => e.textContent)).toContain("KALIP ATÖLYEDE 2/2");
  });
});

describe("Spec 0118 C: dokunulmayanlar", () => {
  // AC-26 (başka formdaki kalıp pasif) kalip-tamiri-0115-uretim triyaj testinde dokunulmadan yeşil.
  it("AC-27: müşteri kalıbının kaynak bağı yazılır", () => {
    kur(); formAc(); ac(); musteri("Anadolu Köfte"); kalip("KASAP KÖFTE"); ekle();
    expect(yeniSatirlar(2)[0]).toMatchObject({ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1 });
  });
  it("AC-28: 'Bekleyen Tamirleri Getir' bugünkü gibi bütün firmaların tamirlerini getirir", () => {
    kur(); formAc();
    expect(screen.getByTestId("bekleyen-tamir-dugmesi").textContent).toContain("(5)");
  });
});
