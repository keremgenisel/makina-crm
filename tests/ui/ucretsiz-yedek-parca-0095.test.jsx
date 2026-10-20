// @vitest-environment jsdom
// Spec 0095: yedek parça satışında garanti içi ücretsiz verme. Form (kutu, kapılar, garanti durumu), Stok satırı, makina geçmişi,
// bayi detayı, kargo detay penceresi ve kartı, Anasayfa, Müşteriler, müşteri detayı, Finans ve Sahipsiz Kayıtlar. Ekrandaki
// para kriterleri FARK olarak ölçülür: ücretsiz satış varken bir kartın metni, o satış hiç yokken çizilen metinle aynıdır
// (ücretli ikizi ise farklıdır; ölçümün anlamlı olduğunu gösterir). Motor kriterleri tests/ucretsiz-yedek-parca-0095.test.js'te.
import React from "react";
import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { KargoDetayModal, KargoKart } from "../../src/components/KargoPanosu";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Customers } from "../../src/components/Customers";
import { Dashboard } from "../../src/components/Dashboard";
import { Finance } from "../../src/components/Finance";
import { SettingsSahipsiz } from "../../src/components/settings/SettingsSahipsiz";
import { UCRETSIZ_IBARESI } from "../../src/lib/utils";
import { GARANTI_UYARISI, KARISIK_PARTI_UYARISI } from "../../src/lib/yedekParcaSatis";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-20T10:00:00") }); });
afterAll(() => vi.useRealTimers());
afterEach(cleanup);

const KDV = [{ from: "2000-01-01", rate: 20 }];
const FAB = { name: "Altuntaş Makina" };
const DEALERS = [{ id: 71, name: "Ege Bayi", bayiMi: true }];
const PARTS = [{ id: 81, ad: "Rulman" }, { id: 82, ad: "Kayış" }];
const AKTIF = { id: 1001, name: "Anadolu Gıda", model: "AK100", serialNo: "S1", installDate: "2026-01-05", currency: "TRY", faturali: "Faturalı Yurtiçi", warrantyEnd: "2028-01-05" };
const BITMIS = { id: 1002, name: "Bal Köfte", model: "AK100", serialNo: "S2", installDate: "2022-01-05", currency: "TRY", faturali: "Faturalı Yurtiçi", warrantyEnd: "2024-01-05" };
const TARIHSIZ = { id: 1003, name: "Ceviz Ltd", model: "AK100", serialNo: "S3", installDate: "2026-02-05", currency: "TRY", faturali: "Faturalı Yurtiçi" };
const MUSTERILER = [AKTIF, BITMIS, TARIHSIZ];
const yp = (o = {}) => ({ id: 9001, aliciTipi: "musteri", musteriId: 1001, partId: "81", miktar: 3, birimFiyat: 500, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-05",
  odendi: false, tahsisler: [], ...o });
// Ücretsiz kayıt: kurucudan geçmiş hâli (R7/2), saklı fiyat durur (R12).
const ucz = (o = {}) => yp({ ucretsizMi: true, faturaTipi: "", yontem: "", vadeTarihi: "", tahsilEdildi: false, taksitSayisi: null, kartKomisyonu: null, hesapId: null, tahsilatTarihi: null, ...o });
const metin = (el) => el.textContent.replace(/\s+/g, " ").trim();

// ── Form ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
let sonForm;
const Form = ({ ilk = {} }) => {
  const [form, setForm] = React.useState({ aliciTipi: "bayi", currency: "TRY", tarih: "2026-10-20", faturaTipi: "Faturalı Yurtiçi", satirlar: [{ partId: "", miktar: "", birimFiyat: "" }], ...ilk });
  sonForm = form;
  return <YedekParcaSatisForm title="Yeni Yedek Parça Satışı" form={form} setForm={setForm} dealers={DEALERS} customers={MUSTERILER} parts={PARTS}
    partStock={[{ id: 1, partId: "81", miktar: 10 }]} onSave={() => {}} onCancel={() => {}} kdvRates={KDV} kasaHesaplari={[{ id: 61, ad: "Banka", tur: "banka", paraBirimi: "TRY" }]} />;
};
const kutu = () => screen.getByRole("checkbox", { name: "Garanti içi, ücretsiz verildi" });
const DOLU = { satirlar: [{ partId: "81", miktar: "2", birimFiyat: "100" }] };

describe("Spec 0095: form", () => {
  it("AC-1 / AC-1/2: kutu çizilir, varsayılan işaretsiz; hiç fiyat girilmemiş formda da (toplam kapısının dışında)", () => {
    render(<Form />);
    expect(kutu().checked).toBe(false);
    expect(screen.queryByText(/Ücret henüz tahsil edilmedi/)).toBeNull(); // ödeme bloğu toplam > 0 kapısının içinde
  });
  it("AC-2: Bayi, Müşteri ve bayinin 'Diğer (anlaşmasız firma)' alt hâlinde çizilir", () => {
    for (const ilk of [{ aliciTipi: "bayi", dealerId: 71 }, { aliciTipi: "musteri", musteriId: 1001 }, { aliciTipi: "bayi", disFirma: true, disFirmaAd: "Kuzey" }]) {
      render(<Form ilk={ilk} />);
      expect(kutu(), JSON.stringify(ilk)).toBeTruthy();
      cleanup();
    }
  });
  it("AC-3: garantisi ileride biten müşteride garanti durumu bitiş tarihiyle yazar (kutu işaretsizken de, R4/3)", () => {
    render(<Form ilk={{ aliciTipi: "musteri", musteriId: 1001 }} />);
    expect(screen.getByTestId("garanti-durumu").textContent).toBe("Garanti aktif · bitiş 05/01/2028");
    fireEvent.click(kutu());
    expect(screen.queryByTestId("garanti-uyarisi")).toBeNull();
  });
  it("AC-4: garantisi geçmişte bitmiş müşteride kutu işaretlenince uyarı çıkar; kayıt yine yapılır (uyarı engel değil)", () => {
    const onSave = vi.fn();
    const H = () => { const [f, sf] = React.useState({ aliciTipi: "musteri", musteriId: 1002, currency: "TRY", ...DOLU });
      return <YedekParcaSatisForm title="T" form={f} setForm={sf} customers={MUSTERILER} parts={PARTS} onSave={onSave} onCancel={() => {}} kdvRates={KDV} />; };
    render(<H />);
    expect(screen.queryByTestId("garanti-uyarisi")).toBeNull();
    fireEvent.click(kutu());
    expect(screen.getByTestId("garanti-uyarisi").textContent).toBe(GARANTI_UYARISI);
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(onSave).toHaveBeenCalled();
  });
  it("AC-5: garanti bitiş tarihi girilmemiş müşteride de aynı uyarı çıkar", () => {
    render(<Form ilk={{ aliciTipi: "musteri", musteriId: 1003 }} />);
    expect(screen.getByTestId("garanti-durumu").textContent).toBe("Garanti bitiş tarihi girilmemiş");
    fireEvent.click(kutu());
    expect(screen.getByTestId("garanti-uyarisi").textContent).toBe(GARANTI_UYARISI);
  });
  it("AC-6: alıcı bayi ve dış firmada garanti durumu yazmaz, uyarı çıkmaz", () => {
    for (const ilk of [{ aliciTipi: "bayi", dealerId: 71 }, { aliciTipi: "bayi", disFirma: true, disFirmaAd: "Kuzey" }]) {
      render(<Form ilk={ilk} />);
      fireEvent.click(kutu());
      expect(screen.queryByTestId("garanti-durumu")).toBeNull();
      expect(screen.queryByTestId("garanti-uyarisi")).toBeNull();
      cleanup();
    }
  });
  it("AC-7 / AC-7/2: işaretliyken ödeme yöntemi, çek vadesi, kart taksiti, tahsilat hesabı ve Genel Toplam çizilmez", () => {
    render(<Form ilk={{ ...DOLU, odendi: true, yontem: "Çek" }} />);
    expect(screen.getByText("Ödeme Yöntemi")).toBeTruthy();
    expect(screen.getByText("Çek Vade Tarihi")).toBeTruthy();
    expect(screen.getByText(/Genel Toplam/)).toBeTruthy();
    expect(screen.getByLabelText("Tahsilat hesabı")).toBeTruthy();
    fireEvent.click(kutu());
    for (const t of ["Ödeme Yöntemi", "Çek Vade Tarihi"]) expect(screen.queryByText(t), t).toBeNull();
    expect(screen.queryByText(/Genel Toplam/)).toBeNull();
    expect(screen.queryByText(/Ücret tahsil edildi|Ücret henüz tahsil edilmedi/)).toBeNull();
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
    // R12: girilmiş fiyat saklanır
    expect(sonForm.satirlar[0].birimFiyat).toBe("100");
  });
  it("AC-7: kredi kartı taksit alanı da çizilmez", () => {
    render(<Form ilk={{ ...DOLU, odendi: true, yontem: "Kredi Kartı" }} />);
    const once = document.body.textContent;
    fireEvent.click(kutu());
    expect(once).toMatch(/Taksit/);
    expect(document.body.textContent).not.toMatch(/Taksit/);
  });
  it("AC-8 / AC-39: işaretliyken tevkifat kutusu ve Fatura Tipi alanı çizilmez", () => {
    render(<Form ilk={DOLU} />);
    expect(screen.getByRole("checkbox", { name: "Bu fatura tevkifatlı" })).toBeTruthy();
    expect(screen.getByText("Fatura Tipi")).toBeTruthy();
    fireEvent.click(kutu());
    expect(screen.queryByRole("checkbox", { name: "Bu fatura tevkifatlı" })).toBeNull();
    expect(screen.queryByText("Fatura Tipi")).toBeNull();
  });
});

describe("Spec 0095 AC-41: garanti uyarısı yerel günle (TZ=Europe/Istanbul, 00:30)", () => {
  const eskiTZ = process.env.TZ;
  afterAll(() => { process.env.TZ = eskiTZ; vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-20T10:00:00") }); });
  it("AC-41: dün biten garantide uyarı çıkar; bugün bitende çıkmaz", () => {
    process.env.TZ = "Europe/Istanbul";
    vi.setSystemTime(new Date("2026-10-19T21:30:00Z"));
    const musteriler = [{ ...AKTIF, warrantyEnd: "2026-10-19" }, { ...BITMIS, warrantyEnd: "2026-10-20" }];
    const H = ({ id }) => { const [f, sf] = React.useState({ aliciTipi: "musteri", musteriId: id, currency: "TRY", ucretsizMi: true });
      return <YedekParcaSatisForm title="T" form={f} setForm={sf} customers={musteriler} parts={PARTS} onSave={() => {}} onCancel={() => {}} kdvRates={KDV} />; };
    render(<H id={1001} />);
    expect(screen.getByTestId("garanti-uyarisi")).toBeTruthy();
    cleanup();
    render(<H id={1002} />);
    expect(screen.queryByTestId("garanti-uyarisi")).toBeNull();
  });
});

// ── Stok › Yedek Parça Satışı ────────────────────────────────────────────────────────────────────────────────────────
const stokTab = (satislar) => render(<YedekParcaSatisTab yedekParcaSatislar={satislar} setYedekParcaSatislar={vi.fn()} dealers={DEALERS} parts={PARTS}
  customers={MUSTERILER} factory={FAB} kdvRates={KDV} setPartStock={vi.fn()} setPartStockLog={vi.fn()} />);
describe("Spec 0095: Stok › Yedek Parça Satışı", () => {
  it("AC-22 / AC-9 satır 10: ücretsiz satış ibareyi yazar, tutar yazmaz", () => {
    const { container } = stokTab([ucz()]);
    expect(screen.getAllByTestId("ucretsiz-ibaresi")[0].textContent).toBe(UCRETSIZ_IBARESI);
    expect(metin(container)).not.toMatch(/1\.500/);
    cleanup();
    expect(metin(stokTab([yp()]).container)).toMatch(/1\.500/);
  });
  it("AC-23 (YedekParcaSatisTab): ödeme düğmesi çizilmez; liste borç toplamı ücretsizi saymaz", () => {
    stokTab([ucz()]);
    expect(screen.queryByRole("button", { name: /^Ödendi$|^Ödenmedi$/ })).toBeNull();
    cleanup();
    stokTab([yp()]);
    expect(screen.getByRole("button", { name: "Ödenmedi" })).toBeTruthy();
  });
});

// ── Kargo detay penceresi ve kartı ───────────────────────────────────────────────────────────────────────────────────
// Code scanning (js/incomplete-sanitization): ibare düzenli ifadeye çevrilirken BÜTÜN özel karakterler kaçışlanır (yalnız parantez
// değil); ibare ters eğik çizgi ya da nokta taşırsa desen sessizce başka metni eşlemesin.
const kacisla = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ibareDeseni = () => new RegExp(kacisla(UCRETSIZ_IBARESI));
const detay = (grup) => render(<KargoDetayModal grup={grup} dealers={DEALERS} parts={PARTS} customers={MUSTERILER} factory={FAB} onClose={() => {}} />);
describe("Spec 0095: Servis ve Kargo Panosu", () => {
  it("AC-24 / AC-9 satır 7 ve 9: ücretsiz partide Genel Toplam ve kalem satırı ibareyi yazar", () => {
    const grup = [ucz({ batchId: 5, kargoDurum: "Hazırlanıyor" }), ucz({ id: 9003, partId: "82", miktar: 1, batchId: 5, kargoDurum: "Hazırlanıyor" })];
    detay(grup);
    expect(screen.getByTestId("kargo-genel-toplam").textContent).toBe(UCRETSIZ_IBARESI);
    expect(screen.getAllByText(ibareDeseni())).toHaveLength(3);
    expect(document.body.textContent).not.toMatch(/1\.500|500,00/);
  });
  it("AC-48 (kargo detayı): karışık partide Genel Toplam ücretli satırların toplamı, ibare satır başına", () => {
    detay([yp({ batchId: 5 }), ucz({ id: 9003, batchId: 5 })]);
    expect(screen.getByTestId("kargo-genel-toplam").textContent).toMatch(/1\.500/);
    expect(screen.getAllByText(ibareDeseni())).toHaveLength(1);
  });
  it("AC-24/2: kargo kartı değişmez (ücretsiz ve ücretli ikizi aynı metin), tutar ve ücretsiz rozeti yok", () => {
    const a = metin(render(<KargoKart s={ucz({ kargoDurum: "Hazırlanıyor" })} dealers={DEALERS} parts={PARTS} customers={MUSTERILER} canKargo onClick={vi.fn()} />).container);
    cleanup();
    const b = metin(render(<KargoKart s={yp({ kargoDurum: "Hazırlanıyor" })} dealers={DEALERS} parts={PARTS} customers={MUSTERILER} canKargo onClick={vi.fn()} />).container);
    expect(a).toBe(b);
    expect(a).not.toMatch(/ücretsiz/i);
  });
});

// ── Bayi detayı ──────────────────────────────────────────────────────────────────────────────────────────────────────
const bayi = (satislar) => render(<SimpleDealers dealers={DEALERS} setDealers={vi.fn()} factory={FAB} setFactory={vi.fn()} geoData={null} loadingGeo={false}
  parts={PARTS} yedekParcaSatislar={satislar} setYedekParcaSatislar={vi.fn()} partSales={[]} services={[]} customers={MUSTERILER}
  kdvRates={KDV} openDetailId={71} serverPermissions={null} showToast={vi.fn()} />);
const bayiYp = (f, o = {}) => f({ aliciTipi: "bayi", dealerId: 71, musteriId: null, ...o });
describe("Spec 0095: bayi detayı", () => {
  it("AC-22 / AC-23 (SimpleDealers rozeti): yedek parça geçmişinde ibare yazar, Ödendi/Ödenmedi rozeti çizilmez", () => {
    bayi([bayiYp(ucz)]);
    const blok = screen.getByText(/Yedek Parça Geçmişi/).closest("section") || document.body;
    expect(blok.textContent).toContain(UCRETSIZ_IBARESI);
    expect(blok.textContent).not.toMatch(/Ödenmedi|Ödendi/);
  });
  it("AC-13 (bayi detayı): borç toplamında görünmez", () => {
    const ucretsiz = metin(bayi([bayiYp(ucz)]).baseElement); cleanup();
    const ucretli = metin(bayi([bayiYp(yp)]).baseElement); cleanup();
    expect(ucretli).toMatch(/1\.800/); // ücretli ikizinde KDV dahil borç
    expect(ucretsiz).not.toMatch(/1\.800|1\.500/);
  });
});

// ── Makina geçmişi ve müşteri detayı ─────────────────────────────────────────────────────────────────────────────────
const musteriDetay = (satislar, extra = {}) => render(<Customers customers={MUSTERILER} setCustomers={vi.fn()} services={[]} partSales={[]} payments={[]}
  yedekParcaSatislar={satislar} setYedekParcaSatislar={vi.fn()} dealers={DEALERS} parts={PARTS} factory={FAB} kdvRates={KDV} gorusmeler={[]} dosyalar={[]} initialDetailId={1001} {...extra} />);
describe("Spec 0095: makina geçmişi ve müşteri detayı", () => {
  it("AC-22 / AC-23 (MachineTimeline): ibare yazar; 'Ödendi' ve 'Çek tahsil edildi' düğmeleri çizilmez", () => {
    musteriDetay([ucz()]);
    expect(screen.getByTestId("ucretsiz-ibaresi").textContent).toBe(`Yedek Parça: ${UCRETSIZ_IBARESI}`);
    expect(screen.queryByText(/Ödenmedi · işaretle: Ödendi/)).toBeNull();
    expect(screen.queryByText(/Çek beklemede|Çek tahsil edildi/)).toBeNull();
    cleanup();
    musteriDetay([yp({ odendi: true, yontem: "Çek", tahsilEdildi: false })]);
    expect(screen.getByText(/Çek beklemede/)).toBeTruthy(); // ücretli ikizinde düğmeler var
  });
  it("AC-48 (makina geçmişi): karışık partide 'Ödendi' yalnız ücretli satıra yazar", () => {
    const set = vi.fn();
    const grup = [yp({ batchId: 7 }), ucz({ id: 9004, batchId: 7 })];
    musteriDetay(grup, { setYedekParcaSatislar: set });
    fireEvent.click(screen.getByText(/Ödenmedi · işaretle: Ödendi/));
    const guncel = set.mock.calls.at(-1)[0](grup);
    expect(guncel.find(s => s.id === 9001).odendi).toBe(true);
    expect(guncel.find(s => s.id === 9004).odendi).toBe(false);
  });
  it("AC-48 (makina geçmişi, triyaj): karışık partide tevkifat rozeti ücretli satırdan okunur (ilk satır ücretsiz olsa da)", () => {
    const tevkifatli = yp({ id: 9005, batchId: 8, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 });
    musteriDetay([ucz({ id: 9006, batchId: 8 }), tevkifatli]);
    expect(screen.getByTestId("satis-tevkifat-rozeti")).toBeTruthy();
  });
  it("AC-48 (triyaj): karışık partiyi makina geçmişinden toplu düzenlerken uyarı şeridi çıkar; bütünü ücretsiz partide çıkmaz", () => {
    const ac = () => fireEvent.click(screen.getByText(/Yedek Parça \((Kargo|Fabrika Teslim)\) \(2 kalem\)/));
    musteriDetay([yp({ batchId: 9 }), ucz({ id: 9007, batchId: 9 })]); ac();
    expect(screen.getByTestId("karisik-parti-uyarisi").textContent).toBe(KARISIK_PARTI_UYARISI);
    cleanup();
    musteriDetay([ucz({ batchId: 9 }), ucz({ id: 9007, batchId: 9 })]); ac();
    expect(kutu().checked).toBe(true);
    expect(screen.queryByTestId("karisik-parti-uyarisi")).toBeNull();
  });
  it("AC-14 / AC-45: kalan borca ve Yedek Parça toplamına sıfır katar", () => {
    // Ödeme bölümü ciro ya da borç varken çizilir: makina bedeli tam ödenmiş bir müşteri (kalan borç sıfır).
    const odenmis = [{ ...AKTIF, faturali: "Faturasız Yurtiçi", faturaBedeli: 10000, fabrikaSatisBedeli: 10000 }, BITMIS, TARIHSIZ];
    const ek = { customers: odenmis, payments: [{ id: 1, customerId: 1001, tarih: "2026-01-05", tutar: 10000, currency: "TRY", yontem: "Nakit" }] };
    const borc = () => metin(screen.getByText("Kalan Borç").parentElement);
    // Alan ızgarası boş değerli satırı çizmez: ücretsizde "Yedek Parça" satırı hiç yoktur (satış yokken olduğu gibi).
    const yedekSatiri = () => screen.queryAllByText("Yedek Parça").map(e => metin(e.parentElement)).join(" | ");
    musteriDetay([], ek); const yok = [borc(), yedekSatiri()]; cleanup();
    musteriDetay([ucz()], ek); const ucretsiz = [borc(), yedekSatiri()]; cleanup();
    musteriDetay([yp()], ek); const ucretli = [borc(), yedekSatiri()];
    expect(ucretsiz).toEqual(yok);
    expect(ucretli[0]).not.toBe(yok[0]);
    expect(ucretli[1]).not.toBe(yok[1]);
  });
});

// ── Anasayfa, Müşteriler, Finans ─────────────────────────────────────────────────────────────────────────────────────
const anasayfa = (satislar) => render(<Dashboard customers={MUSTERILER} dealers={DEALERS} services={[]} stock={[]} payments={[]} partSales={[]}
  yedekParcaSatislar={satislar} parts={PARTS} rates={null} teklifler={[]} factory={FAB} kdvRates={KDV} appSettings={{ kdvRates: KDV }} />);
const modalMetni = (kart) => { fireEvent.click(screen.getAllByText(kart)[0]); const m = document.querySelectorAll(".modal-backdrop"); return m.length ? metin(m[m.length - 1]) : ""; };
describe("Spec 0095: Anasayfa", () => {
  it("AC-11: Borçlu Firmalar kutusunda görünmez", () => {
    anasayfa([ucz()]); expect(modalMetni("Borçlu Firma")).not.toMatch(/Anadolu Gıda/); cleanup();
    anasayfa([yp()]); expect(modalMetni("Borçlu Firma")).toMatch(/Anadolu Gıda/);
  });
  it("AC-13 (Anasayfa): alıcı bayi olan ücretsiz satış Borçlu Bayi/Servis kutusunda görünmez", () => {
    anasayfa([bayiYp(ucz)]); expect(modalMetni("Borçlu Bayi/Servis")).not.toMatch(/Ege Bayi/); cleanup();
    anasayfa([bayiYp(yp)]); expect(modalMetni("Borçlu Bayi/Servis")).toMatch(/Ege Bayi/);
  });
  it("AC-49 / AC-9 satır 13: Son Satışlar listesinde tutar yerine ibare", () => {
    const { container } = anasayfa([ucz()]);
    expect(metin(container)).toContain(UCRETSIZ_IBARESI);
  });
});

describe("Spec 0095: Müşteriler listesi", () => {
  const liste = (satislar) => render(<Customers customers={MUSTERILER} setCustomers={vi.fn()} services={[]} partSales={[]} payments={[]}
    yedekParcaSatislar={satislar} dealers={DEALERS} parts={PARTS} factory={FAB} kdvRates={KDV} gorusmeler={[]} dosyalar={[]} />);
  it("AC-12: borçlu süzgecine gelmez ve satırı boyamaz", () => {
    liste([ucz()]);
    expect(screen.getByRole("button", { name: "Borçlu Firmalar (0)" })).toBeTruthy();
    const satirStil = screen.getAllByText("Anadolu Gıda")[0].closest("tr").getAttribute("style");
    cleanup();
    liste([]);
    expect(screen.getAllByText("Anadolu Gıda")[0].closest("tr").getAttribute("style")).toBe(satirStil);
    cleanup();
    liste([yp()]);
    expect(screen.getByRole("button", { name: "Borçlu Firmalar (1)" })).toBeTruthy();
  });
});

describe("Spec 0095: Finans", () => {
  const finans = (satislar) => {
    const r = render(<Finance customers={MUSTERILER} services={[]} dealers={DEALERS} partSales={[]} yedekParcaSatislar={satislar} factory={FAB} rates={{}}
      payments={[]} teklifler={[]} serverPermissions={null} kdvRates={KDV} appSettings={{ kdvRates: KDV }} />);
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    return r;
  };
  const kart = (etiket) => { let e = screen.getByText(etiket); while (e && e.style?.borderRadius !== "12px") e = e.parentElement; return metin(e); };
  it("AC-15 / AC-9 satır 4: Toplam Alacak, Toplam Bedel ve KDV kartları ücretsiz satış yokmuş gibi", () => {
    const KARTLAR = ["Toplam Alacak", "Toplam Bedel", "Ödenmesi Muhtemel KDV"];
    finans([]); const yok = KARTLAR.map(kart); cleanup();
    finans([ucz()]); const ucretsiz = KARTLAR.map(kart); cleanup();
    finans([yp()]); const ucretli = KARTLAR.map(kart);
    expect(ucretsiz).toEqual(yok);
    KARTLAR.forEach((k, i) => expect(ucretli[i], k).not.toBe(yok[i]));
  });
});

describe("Spec 0095: Sahipsiz Kayıtlar", () => {
  it("AC-9 satır 12: sahipsiz satır açıklaması tutar yerine ibareyi yazar", () => {
    render(<SettingsSahipsiz rawCustomers={[]} rawYedekParcaSatislar={[ucz({ musteriId: 4444 })]} rawParts={PARTS} />);
    expect(document.body.textContent).toContain(`Rulman × 3 · 05/10/2026 · ${UCRETSIZ_IBARESI}`);
  });
});
