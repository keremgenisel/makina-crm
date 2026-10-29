// @vitest-environment jsdom
// Spec 0117: tamir edilen kalıbın dönüşü. Servis formunun sevk bölümü (iki kurucu), panonun servis kartındaki etiket düğmesi
// (sekme, kiosk, ayrı pencere), Makina Geçmişi başlığı.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import { useState } from "react";
import { ServiceForm } from "../../src/components/ServiceForm";
import { Customers } from "../../src/components/Customers";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { ServisPencere } from "../../src/components/ServisPencere";
import { KALIP_KUTU_ETIKETI, SERVIS_KALIPLARI_ETIKETI, KAYIT_BOLUMU } from "../../src/lib/kalipTamiri";
import { KDV, FY, PART_TYPES, PARTS, CUSTOMERS, SERVICES, PART_SALES } from "../fixtures/0115-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.appPrint; delete window.servisBridge; });

const TIPLER = [...PART_TYPES, { id: "tip_1", ad: "Kalıp Revize", renk: "blu", makinaSecici: false, stokDus: false, raporGoster: false, kalipIsi: true, sistem: false }];
const PARCALAR = PARTS.map(p => (p.id === 81 ? { ...p, tip: "Kalıp Revize" } : p));
const CAL = [{ id: 1, ad: "Ayşe Kargo" }, { id: 2, ad: "Mehmet Usta" }];
const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }];
const ALANLAR = ["kalipFabrikaTeslim", "kalipKargoFirma", "kalipKargoTakipNo", "kalipKargoTarih", "kalipKargoSorumlusu"];
const son = { form: null };
const Kab = ({ ilk }) => {
  const [form, setForm] = useState(ilk);
  son.form = form;
  return <ServiceForm title="T" form={form} setForm={setForm} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} kdvRates={KDV}
    onSave={vi.fn()} onCancel={vi.fn()} partTypeDefs={TIPLER} calisanlar={CAL} />;
};
const yeni = (ek = {}) => ({ customerId: 1, date: "2026-10-12", type: "Garanti Dışı", repairPlace: "Fabrikada Onarım", currency: "TRY", faturaTipi: FY, degisenParcalar: [], ...ek });
const kutu = () => screen.getByRole("checkbox", { name: KALIP_KUTU_ETIKETI });
const secici = () => screen.getByRole("group", { name: "Kalıp Teslim Şekli" });
const sec = (ad) => fireEvent.click(within(secici()).getByRole("button", { name: new RegExp(ad) }));

describe("Spec 0117 A: sevk bölümü (servis formu)", () => {
  it("AC-1: kutu kapalıyken sevk bölümü hiç çizilmez", () => {
    render(<Kab ilk={yeni()} />);
    expect(screen.queryByTestId("kalip-sevk")).toBeNull();
  });
  it("AC-2, AC-46: kutu açılınca bölüm amber kabın içinde, listenin altında; liste boşken de; kutu kapanınca kalkar", () => {
    render(<Kab ilk={yeni()} />);
    fireEvent.click(kutu()); // kalem yok: liste boş açılır
    expect(screen.queryByLabelText("Atölye kalıp adı 1")).toBeNull();
    const sevk = screen.getByTestId("kalip-sevk");
    expect(screen.getByTestId("kalip-atolye").contains(sevk)).toBe(true);
    expect(screen.getByTestId("atolye-liste").compareDocumentPosition(sevk) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(sevk).getByText(KAYIT_BOLUMU.sevk)).toBeTruthy();
    fireEvent.click(screen.getByText("Kalıp ekle"));
    fireEvent.click(screen.getByLabelText("Atölye kalıbını çıkar 1"));
    expect(screen.getByTestId("kalip-sevk")).toBeTruthy();
    fireEvent.click(kutu());
    expect(screen.queryByTestId("kalip-sevk")).toBeNull();
  });
  it("AC-3, AC-4, AC-53: iki seçenekli Segment, boşken Kargo seçili; Kargo'da firma, takip, tarih; etiketler Kargo dilinde", () => {
    render(<Kab ilk={yeni({ atolyeKaliplari: LISTE })} />);
    const d = within(secici()).getAllByRole("button");
    expect(d.map(b => b.textContent)).toEqual(["🏭 Fabrika Teslim", "📦 Kargo"]);
    expect(d[1].getAttribute("aria-pressed")).toBe("true");
    expect(d[0].getAttribute("aria-pressed")).toBe("false");
    for (const t of ["kalip-sevk-firma", "kalip-sevk-takip", "kalip-sevk-tarih", "kalip-sevk-kisi"]) expect(screen.getByTestId(t), t).toBeTruthy();
    expect(within(screen.getByTestId("kalip-sevk")).getByText("Kargo Tarihi")).toBeTruthy();
    expect(within(screen.getByTestId("kalip-sevk")).getByText("Kargoyu Veren Kişi")).toBeTruthy();
  });
  it("AC-5, AC-6, AC-53: Fabrika Teslim'de firma ve takip çizilmez ve temizlenir; etiketler Teslim dilinde", () => {
    render(<Kab ilk={yeni({ atolyeKaliplari: LISTE })} />);
    fireEvent.change(screen.getByTestId("kalip-sevk-firma"), { target: { value: "Aras" } });
    fireEvent.change(screen.getByTestId("kalip-sevk-takip"), { target: { value: "TK1" } });
    sec("Fabrika Teslim");
    expect(son.form).toMatchObject({ kalipFabrikaTeslim: true, kalipKargoFirma: "", kalipKargoTakipNo: "" });
    expect(screen.queryByTestId("kalip-sevk-firma")).toBeNull();
    expect(screen.queryByTestId("kalip-sevk-takip")).toBeNull();
    expect(screen.getByTestId("kalip-sevk-tarih")).toBeTruthy();
    expect(within(screen.getByTestId("kalip-sevk")).getByText("Teslim Tarihi")).toBeTruthy();
    expect(within(screen.getByTestId("kalip-sevk")).getByText("Teslim Eden Kişi")).toBeTruthy();
    expect(within(screen.getByTestId("kalip-sevk")).queryByText("Kargo Tarihi")).toBeNull();
  });
  it("AC-7, AC-45: kişi alanı firma çalışanlarını önerir, serbest ad yazılır; datalist kimliği yedek parçadan ayrı", () => {
    render(<Kab ilk={yeni({ atolyeKaliplari: LISTE })} />);
    const kisi = screen.getByTestId("kalip-sevk-kisi");
    expect(kisi.getAttribute("list")).toBe("kalip-sevk-kisi-listesi");
    const dl = document.getElementById("kalip-sevk-kisi-listesi");
    expect([...dl.querySelectorAll("option")].map(o => o.value)).toEqual(["Ayşe Kargo", "Mehmet Usta"]);
    expect(document.getElementById("yedek-parca-kargoci-listesi")).toBeNull();
    fireEvent.change(kisi, { target: { value: "Dış Kurye" } });
    expect(son.form.kalipKargoSorumlusu).toBe("Dış Kurye");
  });
});

// ── Kurucular ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const musteriDetay = (services = SERVICES) => {
  const setServices = vi.fn(), showToast = vi.fn();
  render(<Customers customers={CUSTOMERS} setCustomers={vi.fn()} services={services} setServices={setServices} partSales={PART_SALES} setPartSales={vi.fn()}
    payments={[]} dealers={[]} parts={PARCALAR} kdvRates={KDV} gorusmeler={[]} dosyalar={[]} partTypeDefs={TIPLER} calisanlar={CAL} showToast={showToast}
    setYedekParcaSatislar={vi.fn()} initialDetailId={1} />);
  return { setServices, showToast };
};
const kayitlar = (setServices, taban) => setServices.mock.calls.map(([f]) => (typeof f === "function" ? f(taban) : f)).at(-1);
const servisiAc = () => fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => /Garanti Dışı/.test(e.textContent)));
const kaydet = () => fireEvent.click(screen.getAllByRole("button", { name: /Kaydet/ }).pop());
const doldur = () => {
  fireEvent.change(screen.getByTestId("kalip-sevk-firma"), { target: { value: "  Aras  " } });
  fireEvent.change(screen.getByTestId("kalip-sevk-takip"), { target: { value: "T".repeat(300) } });
  fireEvent.change(screen.getByTestId("kalip-sevk-tarih"), { target: { value: "2026-01-02" } }); // servis tarihinden önce
  fireEvent.change(screen.getByTestId("kalip-sevk-kisi"), { target: { value: "Ayşe Kargo" } });
};

describe("Spec 0117 A: kurucular", () => {
  it("AC-8, AC-11: sevk alanları boş bırakılan servis hatasız kaydedilir; gövdede sevk anahtarı yok", () => {
    const { setServices, showToast } = musteriDetay();
    servisiAc(); fireEvent.click(kutu()); kaydet();
    const sv = kayitlar(setServices, SERVICES).find(s => s.id === 41);
    expect(sv.atolyeKaliplari).toHaveLength(1);
    for (const a of ALANLAR) expect(a in sv, a).toBe(false);
    expect(showToast.mock.calls.filter(c => c[1] === "err")).toEqual([]);
  });
  it("AC-9, AC-54: doldurulan değerler kaydedilir (kırpılmış), yeniden açılınca aynen görünür; erken tarih ve uzun takip uyarısız", () => {
    const { setServices, showToast } = musteriDetay();
    servisiAc(); fireEvent.click(kutu()); doldur(); kaydet();
    const sv = kayitlar(setServices, SERVICES).find(s => s.id === 41);
    expect(sv).toMatchObject({ kalipKargoFirma: "Aras", kalipKargoTakipNo: "T".repeat(300), kalipKargoTarih: "2026-01-02", kalipKargoSorumlusu: "Ayşe Kargo" });
    expect("kalipFabrikaTeslim" in sv).toBe(false); // Kargo = anahtar yok (AC-39)
    expect(showToast.mock.calls.filter(c => c[1] === "err")).toEqual([]);
    cleanup();
    musteriDetay(SERVICES.map(s => (s.id === 41 ? sv : s)));
    servisiAc();
    expect(screen.getByTestId("kalip-sevk-firma").value).toBe("Aras");
    expect(screen.getByTestId("kalip-sevk-tarih").value).toBe("2026-01-02");
    expect(screen.getByTestId("kalip-sevk-kisi").value).toBe("Ayşe Kargo");
  });
  it("AC-39: Fabrika Teslim seçilen kayıtta kalipFabrikaTeslim: true; firma ve takip yazılmaz", () => {
    const { setServices } = musteriDetay();
    servisiAc(); fireEvent.click(kutu()); doldur(); sec("Fabrika Teslim"); kaydet();
    const sv = kayitlar(setServices, SERVICES).find(s => s.id === 41);
    expect(sv.kalipFabrikaTeslim).toBe(true);
    expect("kalipKargoFirma" in sv).toBe(false);
    expect("kalipKargoTakipNo" in sv).toBe(false);
    expect(sv.kalipKargoTarih).toBe("2026-01-02");
  });
  it("AC-10: kutu işaretlenip doldurulup sonra kaldırılırsa gövdede sevk alanı ve liste yok", () => {
    const { setServices } = musteriDetay();
    servisiAc(); fireEvent.click(kutu()); doldur(); sec("Fabrika Teslim"); fireEvent.click(kutu()); kaydet();
    const sv = kayitlar(setServices, SERVICES).find(s => s.id === 41);
    expect("atolyeKaliplari" in sv).toBe(false);
    for (const a of ALANLAR) expect(a in sv, a).toBe(false);
  });
  it("AC-12: panodan açılan formda aynı bölüm aynı alanlarla; kayıt aynı gövdeyi yazar", () => {
    const setServices = vi.fn();
    render(<ServisPanosu services={SERVICES} setServices={setServices} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} calisanlar={CAL} showToast={vi.fn()}
      partTypeDefs={TIPLER} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
    fireEvent.click(screen.getAllByText("Anadolu Köfte")[0].closest("article"));
    fireEvent.click(kutu());
    expect(document.getElementById("kalip-sevk-kisi-listesi").querySelectorAll("option")).toHaveLength(2);
    doldur(); kaydet();
    const sv = kayitlar(setServices, SERVICES).find(s => s.id === 41);
    expect(sv).toMatchObject({ kalipKargoFirma: "Aras", kalipKargoTakipNo: "T".repeat(300), kalipKargoTarih: "2026-01-02", kalipKargoSorumlusu: "Ayşe Kargo" });
  });
});

// ── Pano ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SV_PANO = [
  { ...SERVICES[0], id: 41, durum: "Yapılıyor", atolyeKaliplari: LISTE, kalipFabrikaTeslim: true, kalipKargoTarih: "2026-10-25" },
  { ...SERVICES[0], id: 43, durum: "Bekliyor", atolyeKaliplari: LISTE },
  { ...SERVICES[0], id: 44, durum: "Tamamlandı", atolyeKaliplari: LISTE },
  { ...SERVICES[0], id: 45, durum: "Tamamlandı", atolyeKaliplari: LISTE, panoGizli: true },
  { ...SERVICES[1], id: 42, durum: "Bekliyor" }, // kalıpsız
  { ...SERVICES[0], id: 46, customerId: 999, durum: "Bekliyor", atolyeKaliplari: LISTE }, // müşterisi çözülmez
];
const pano = (ek = {}) => render(<ServisPanosu services={SV_PANO} setServices={vi.fn()} customers={CUSTOMERS} dealers={[]} parts={PARCALAR} calisanlar={CAL}
  showToast={vi.fn()} yedekParcaSatislar={[]} setYedekParcaSatislar={vi.fn()} dosyalar={[]} setDosyalar={vi.fn()} factory={{ name: "Altuntaş Makina" }} {...ek} />);
const kartlar = () => [...document.querySelectorAll("article")];
const etiketDugmeleri = () => screen.queryAllByTitle("Kargo Etiketi Yazdır");

describe("Spec 0117 B: panodaki etiket düğmesi", () => {
  it("AC-15, AC-16, AC-17, AC-40: üç sütunda kalıplı ve müşterisi çözülen kartta; kalıpsız ve müşterisiz kartta yok", () => {
    pano();
    const dugmeli = kartlar().filter(a => within(a).queryByTitle("Kargo Etiketi Yazdır"));
    expect(dugmeli).toHaveLength(3); // 41 Yapılıyor, 43 Bekliyor, 44 Tamamlandı
    const sutunu = (a) => a.closest("section").querySelector("h3").textContent;
    expect(new Set(dugmeli.map(sutunu))).toEqual(new Set(["Bekliyor", "İşlemde", "Tamamlandı"]));
    expect(kartlar().find(a => a.textContent.includes("(müşteri yok)")) && within(kartlar().find(a => a.textContent.includes("(müşteri yok)"))).queryByTitle("Kargo Etiketi Yazdır")).toBeNull();
    expect(within(kartlar().find(a => a.textContent.includes("Bafra Gıda"))).queryByTitle("Kargo Etiketi Yazdır")).toBeNull();
  });
  it("AC-40: düğme teknisyen seçicisinin hemen sağında, Tamamlandı kartında Yazdır'ın solunda", () => {
    pano();
    const tamam = kartlar().find(a => a.closest("section").querySelector("h3").textContent === "Tamamlandı" && within(a).queryByTitle("Kargo Etiketi Yazdır"));
    const satir = within(tamam).getByTitle("Kargo Etiketi Yazdır").parentElement;
    const cocuklar = [...satir.children];
    expect(cocuklar[0].tagName).toBe("SELECT");
    expect(cocuklar[1].getAttribute("title")).toBe("Kargo Etiketi Yazdır");
    expect(cocuklar[2].getAttribute("title")).toBe("Servis Formu yazdır");
    expect(cocuklar[1].textContent.trim()).toBe("Etiket");
  });
  it("AC-18, AC-21, AC-23: düğmeye basılınca etiket basılır; içerik kalıp listesi, teslim şekli ve tarih kayıttan", () => {
    const printHtml = vi.fn();
    window.appPrint = { printHtml };
    pano();
    const yapiliyor = kartlar().find(a => a.closest("section").querySelector("h3").textContent === "İşlemde");
    fireEvent.click(within(yapiliyor).getByTitle("Kargo Etiketi Yazdır"));
    const html = printHtml.mock.calls[0][0];
    expect(html).toContain("100_ERKEK KALIPLAR REVİZE");
    expect(html).toContain("Fabrika Teslim");
    expect(html).toContain("25/10/2026");
  });
  it("AC-41: arşivlenmiş kartta eylem satırı ve etiket düğmesi yok", () => {
    pano();
    fireEvent.click(screen.getByText(/Arşivlenenler/));
    const arsiv = kartlar().find(a => a.textContent.includes("Panoya Geri Al"));
    expect(arsiv).toBeTruthy();
    expect(within(arsiv).queryByTitle("Kargo Etiketi Yazdır")).toBeNull();
    expect(arsiv.querySelector("select")).toBeNull();
  });
  it("AC-55 (C12): kart kalıbın teslim şeklini basmaz; yalnız onarım yeri metni durur", () => {
    pano();
    const yapiliyor = kartlar().find(a => a.closest("section").querySelector("h3").textContent === "İşlemde");
    expect(yapiliyor.textContent).not.toContain("Fabrika Teslim");
    expect(yapiliyor.textContent).toContain("Fabrikada Onarım");
  });
  it("AC-20: kiosk kipinde düğme çizilir ve çalışır", () => {
    const printHtml = vi.fn();
    window.appPrint = { printHtml };
    pano({ kiosk: true, serverPermissions: { role: "user", permissions: JSON.stringify({ tabs: ["servis"], customerActions: ["cust_service_add", "cust_service_edit"] }) } });
    expect(etiketDugmeleri().length).toBeGreaterThan(0);
    fireEvent.click(etiketDugmeleri()[0]);
    expect(printHtml).toHaveBeenCalled();
  });
  it("R16: ayrı pencerede düğme çizilir ve köprünün yazdırmasıyla basar", async () => {
    const printHtml = vi.fn();
    window.appPrint = { printHtml };
    const snap = { services: SV_PANO, customers: CUSTOMERS, calisanlar: CAL, parts: [], dealers: [], factory: { name: "A" }, appSettings: null, partStock: [], partStockLog: [],
      dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null, aktifKullanici: "ofis", kargoYetki: true, kalipYetki: false, uretimFormlari: [], partTypeDefs: [] };
    window.servisBridge = { ilkVeriAl: () => Promise.resolve(snap), onVeri: () => () => {}, mutate: vi.fn() };
    render(<ServisPencere />);
    await screen.findAllByTitle("Kargo Etiketi Yazdır");
    await act(async () => { fireEvent.click(etiketDugmeleri()[0]); });
    expect(printHtml).toHaveBeenCalled();
  });
});

describe("Spec 0117 D: adlar (AC-30, AC-32)", () => {
  it("AC-30: Makina Geçmişi başlığı kod sabitinden 'Servis gören kalıplar'; AC-32: kutu etiketi ve rozet aynı", () => {
    expect(SERVIS_KALIPLARI_ETIKETI).toBe("Servis gören kalıplar");
    expect(KALIP_KUTU_ETIKETI).toBe("Kalıp atölyeye girecek");
    pano();
    expect(screen.getAllByTestId("tamir-rozeti")[0].textContent).toMatch(/^KALIP ATÖLYEDE/);
  });
});
