// @vitest-environment jsdom
// Spec 0111: toplu yedek parça satışı yerinde düzenlenir. Gerçek Customers + müşteri detayı (makina geçmişinden toplu form),
// gerçek SettingsTrash (çöpe düşen satırın görünmesi ve geri alınması) ve Stok › Yedek Parça Satışı listesi. Kararın saf
// kriterleri tests/toplu-yedek-parca-0111.test.js'te; burada ekranın o kararı uyguladığı ve kayıt/stoğa dokunmadığı ölçülür.
import React from "react";
import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";

vi.mock("../../src/lib/audit", async (orig) => {
  const gercek = await orig();
  return { ...gercek, logAction: vi.fn() };
});

import { Customers } from "../../src/components/Customers";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { logAction } from "../../src/lib/audit";
import { yerelServisMi } from "../../src/lib/yerelServis";
import { TOPLU_BASKA_MUSTERIYE_GECTI, TOPLU_GUNCELLENDI, TOPLU_BAYIYE_GECTI, TOPLU_PARTI_DEGISTI, TOPLU_SATIR_HATASI, TOPLU_BOS_HATASI, KARISIK_PARTI_UYARISI } from "../../src/lib/yedekParcaSatis";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-26T10:00:00") }); });
afterAll(() => vi.useRealTimers());
afterEach(() => { cleanup(); delete window.crmLocks; vi.mocked(logAction).mockClear(); });

const KDV = [{ from: "2000-01-01", rate: 20 }];
const FAB = { name: "Altuntaş Makina" };
const DEALERS = [{ id: 71, name: "Ege Bayi", bayiMi: true }];
const PARTS = [{ id: 81, ad: "Rulman" }, { id: 82, ad: "Kayış" }];
const MUSTERI = { id: 1001, name: "Anadolu Gıda", model: "AK100", serialNo: "S1", installDate: "2026-01-05", currency: "TRY", faturali: "Faturalı Yurtiçi", warrantyEnd: "2028-01-05" };

// musteriTahsisi biçimi (otomatik tam tahsis: seri no ve serbest metin boş).
const tahsis = (miktar, o = {}) => [{ miktar, customerId: 1001, serialNo: "", makinaSerbest: "", tarih: "2026-10-01", ...o }];
const kayit = (id, partId, miktar, o = {}) => ({
  id, batchId: 50, aliciTipi: "musteri", musteriId: 1001, dealerId: null, partId, miktar, birimFiyat: 100, currency: "TRY",
  tarih: "2026-10-01", faturaTipi: "Faturalı Yurtiçi", odendi: false, yontem: "Nakit", kargoDurum: "", olusturmaZamani: `2026-10-01T10:00:0${id % 10}`,
  tahsisler: tahsis(miktar), ...o,
});
const dus = (id, partId, miktar) => ({ id: `l${id}`, partId, miktar: -miktar, tip: "bayi_satis", referansId: id, tarih: "2026-10-01", notlar: "" });
const STOK = [{ id: 1, partId: "81", miktar: 10 }, { id: 2, partId: "82", miktar: 10 }];

// Durumlu düzenek: setter'lar gerçek dizileri günceller, son hâl `durum`dan okunur.
let durum;
const toast = vi.fn();
const Duzenek = ({ satislar, log, stok = STOK, dosyalar = [], musteriler = [MUSTERI] }) => {
  const [yp, setYp] = React.useState(satislar);
  const [ps, setPs] = React.useState(stok);
  const [lg, setLg] = React.useState(log);
  const [ds, setDs] = React.useState(dosyalar);
  durum = { yp, ps, lg, ds, setYp };
  return <Customers customers={musteriler} setCustomers={vi.fn()} services={[]} partSales={[]} payments={[]}
    yedekParcaSatislar={yp.filter(s => !s.deletedAt)} setYedekParcaSatislar={setYp} partStock={ps} setPartStock={setPs} partStockLog={lg} setPartStockLog={setLg}
    dealers={DEALERS} parts={PARTS} factory={FAB} kdvRates={KDV} gorusmeler={[]} dosyalar={ds} setDosyalar={setDs} initialDetailId={1001}
    showToast={toast} aktifKullanici="kerem" />;
};
const kur = (satislar, log = satislar.map(s => dus(s.id, s.partId, s.miktar)), ek = {}) => { toast.mockClear(); return render(<Duzenek satislar={satislar} log={log} {...ek} />); };
const topluAc = (n) => fireEvent.click(screen.getByText(new RegExp(`Yedek Parça \\((Kargo|Fabrika Teslim)\\) \\(${n} kalem\\)`)));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const fiyat = (i) => screen.getByLabelText(`Birim fiyat ${i}`);
const adetler = () => screen.getAllByPlaceholderText("Adet");
const sil = (i) => fireEvent.click(screen.getAllByTitle("Satırı sil")[i]);
const kayitOf = (id) => durum.yp.find(s => s.id === id);
// SearchPick: odakla açılır, seçenek mousedown ile seçilir.
const sec = (placeholder, ara, etiket) => {
  const girdi = screen.getAllByPlaceholderText(placeholder).at(-1);
  fireEvent.focus(girdi);
  fireEvent.change(girdi, { target: { value: ara } });
  fireEvent.mouseDown(screen.getAllByText(etiket).find(el => el.classList.contains("sp-option")));
};
const parcaEkle = (etiket) => { fireEvent.click(screen.getByRole("button", { name: /Parça Ekle/ })); sec("Parça ara...", etiket, etiket); };
const BOS = [];
const cop = (o) => <SettingsTrash rawCustomers={BOS} rawServices={BOS} rawPartSales={BOS} rawPayments={BOS} rawDealers={BOS} rawStock={BOS} rawNotes={BOS}
  rawKalipDefs={BOS} rawParts={PARTS} rawCustomModels={BOS} rawTeklifler={BOS} rawFaturalar={BOS} rawUretimFormlari={BOS} rawGorusmeler={BOS} rawDosyalar={BOS}
  appSettings={{}} showToast={vi.fn()} {...o} />;

describe("Spec 0111: makina geçmişinden toplu düzenleme kayıt silmez", () => {
  it("AC-1 / AC-2: bir satırın fiyatı değişir; kimlikler, parti ve oluşturma zamanı aynı, çöpe düşen yok, Çöp Kutusu boş", () => {
    const A = kayit(101, "81", 2), B = kayit(102, "82", 3);
    kur([A, B]); topluAc(2);
    fireEvent.change(fiyat(1), { target: { value: "150" } });
    kaydet();
    expect(durum.yp.map(s => s.id)).toEqual([101, 102]);
    expect(durum.yp.every(s => !s.deletedAt)).toBe(true);
    expect(kayitOf(101).birimFiyat).toBe(150);
    expect(kayitOf(102).birimFiyat).toBe(100);
    expect(durum.yp.map(s => [s.batchId, s.olusturmaZamani])).toEqual([[50, A.olusturmaZamani], [50, B.olusturmaZamani]]);
    expect(toast).toHaveBeenCalledWith(TOPLU_GUNCELLENDI);
    cleanup();
    render(cop({ rawYedekParcaSatislar: durum.yp, setYedekParcaSatislar: vi.fn() }));
    expect(screen.getByText("Çöp kutusu boş.")).toBeTruthy();
  });

  it("AC-17: hiçbir şeye dokunmadan kaydedilen partide stok hareketi yazılmaz, stok aynı", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    const once = { lg: durum.lg, ps: durum.ps };
    kaydet();
    expect(durum.lg).toEqual(once.lg);
    expect(durum.ps).toEqual(once.ps);
  });

  it("AC-3 / AC-4 / AC-5: çıkarılan satır çöpe düşer, stoğu karşı hareketle geri alınır; Çöp Kutusu'ndan geri alınınca stok yeniden düşer", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3), kayit(103, "81", 1)]); topluAc(3);
    sil(1); // ortadaki satır (102)
    kaydet();
    expect(kayitOf(101).deletedAt).toBeUndefined();
    expect(kayitOf(103).deletedAt).toBeUndefined();
    expect(kayitOf(102).deletedAt).toBeTruthy();
    expect(kayitOf(101).miktar).toBe(2); // kimlik eşlemesi: ortadaki satır çıkınca 103 kendi değerini korur
    expect(kayitOf(103).miktar).toBe(1);
    expect(durum.lg.some(l => l.id === "l102")).toBe(true); // log satırı silinmez
    expect(durum.lg.filter(l => l.tip === "bayi_satis_iade" && l.referansId === 102).map(l => l.miktar)).toEqual([3]);
    expect(durum.ps.find(s => String(s.partId) === "82").miktar).toBe(13);
    const sonrasi = durum;
    cleanup();
    const Cop = () => {
      const [yp, setYp] = React.useState(sonrasi.yp); const [ps, setPs] = React.useState(sonrasi.ps); const [lg, setLg] = React.useState(sonrasi.lg);
      durum = { yp, ps, lg };
      return cop({ rawYedekParcaSatislar: yp, setYedekParcaSatislar: setYp, partStock: ps, setPartStock: setPs, partStockLog: lg, setPartStockLog: setLg });
    };
    render(<Cop />);
    expect(screen.getByText("Yedek Parça Satışı")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Geri Al/ }));
    expect(kayitOf(102).deletedAt).toBeFalsy();
    expect(durum.ps.find(s => String(s.partId) === "82").miktar).toBe(10);
  });

  it("AC-6: üçüncü satır eklenir; iki kayıt kimliğiyle güncellenir, üçüncüsü yeni kimlik ve aynı parti kimliğiyle dizinin sonunda doğar", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    parcaEkle("Rulman");
    fireEvent.change(adetler()[2], { target: { value: "4" } });
    kaydet();
    expect(durum.yp.slice(0, 2).map(s => s.id)).toEqual([101, 102]);
    expect(durum.yp).toHaveLength(3);
    const yeni = durum.yp[2];
    expect([101, 102]).not.toContain(yeni.id);
    expect(yeni.batchId).toBe(50);
    expect(yeni.miktar).toBe(4);
    expect(durum.lg.filter(l => l.referansId === yeni.id && l.tip === "bayi_satis").map(l => l.miktar)).toEqual([-4]);
    expect(durum.yp.every(s => !s.deletedAt)).toBe(true);
  });

  it("AC-22: İşlem Geçmişi güncellenen için duzenlendi, yeni için olusturuldu, çıkarılan için silindi yazar", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    sil(1);
    parcaEkle("Kayış");
    fireEvent.change(adetler()[1], { target: { value: "1" } });
    kaydet();
    const yeniId = durum.yp[2].id;
    const cagri = vi.mocked(logAction).mock.calls.map(([a]) => [a.action, a.entity, a.entityId]);
    expect(cagri).toEqual(expect.arrayContaining([["duzenlendi", "yedek_parca_satis", 101], ["olusturuldu", "yedek_parca_satis", yeniId], ["silindi", "yedek_parca_satis", 102]]));
    expect(cagri.filter(c => c[2] === 102 && c[0] !== "silindi")).toEqual([]);
  });
});

describe("Spec 0111: ortak alanlar formda doğru gelir ve dokunulmadan korunur", () => {
  it("AC-8: fabrika teslim parti Fabrika Teslim seçili açılır, dokunulmadan kaydedilince fabrika teslim kalır", () => {
    kur([kayit(101, "81", 2, { fabrikaTeslim: true }), kayit(102, "82", 3, { fabrikaTeslim: true })]); topluAc(2);
    expect(screen.getByRole("button", { name: /Fabrika Teslim/ }).getAttribute("aria-pressed")).toBe("true");
    kaydet();
    expect([kayitOf(101).fabrikaTeslim, kayitOf(102).fabrikaTeslim]).toEqual([true, true]);
  });

  it("AC-9: farklı teslimat adresi işaret ve alanlarla dolu açılır, dokunulmadan kaydedilince aynen kalır", () => {
    const adres = { teslimatFarkli: true, teslimatAd: "Depo Ltd", teslimatTel: "0555", teslimatAdres: "Sanayi 5", teslimatUlke: "Türkiye", teslimatSehir: "İzmir", teslimatIlce: "Bornova" };
    kur([kayit(101, "81", 2, adres), kayit(102, "82", 3, adres)]); topluAc(2);
    expect(screen.getByRole("checkbox", { name: /Farklı adrese kargolat/ }).checked).toBe(true);
    expect(screen.getByDisplayValue("Depo Ltd")).toBeTruthy();
    expect(screen.getByDisplayValue("Sanayi 5")).toBeTruthy();
    kaydet();
    for (const id of [101, 102]) {
      const k = kayitOf(id);
      expect(Object.fromEntries(Object.keys(adres).map(a => [a, k[a]]))).toEqual(adres);
    }
  });

  it("AC-10: tevkifatlı parti işaret ve oran seçili açılır, dokunulmadan kaydedilince üç alan aynen kalır", () => {
    const tev = { tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 };
    kur([kayit(101, "81", 2, tev), kayit(102, "82", 3, tev)]); topluAc(2);
    expect(screen.getByRole("checkbox", { name: "Bu fatura tevkifatlı" }).checked).toBe(true);
    kaydet();
    for (const id of [101, 102]) expect([kayitOf(id).tevkifatli, kayitOf(id).tevkifatPay, kayitOf(id).tevkifatPayda]).toEqual([true, 5, 10]);
  });

  it("AC-12 / AC-41: karışık partide kutu işaretsiz ve şerit var; bütünü ücretsiz partide kutu işaretli, şerit yok", () => {
    const ucz = { ucretsizMi: true, faturaTipi: "" };
    kur([kayit(101, "81", 2), kayit(102, "82", 3, ucz)]); topluAc(2);
    expect(screen.getByRole("checkbox", { name: "Garanti içi, ücretsiz verildi" }).checked).toBe(false);
    expect(screen.getByTestId("karisik-parti-uyarisi").textContent).toBe(KARISIK_PARTI_UYARISI);
    cleanup();
    kur([kayit(101, "81", 2, ucz), kayit(102, "82", 3, ucz)]); topluAc(2);
    expect(screen.getByRole("checkbox", { name: "Garanti içi, ücretsiz verildi" }).checked).toBe(true);
    expect(screen.queryByTestId("karisik-parti-uyarisi")).toBeNull();
  });

  it("AC-44: alıcı bayiye çevrilince bildirim kaydın bu makinanın geçmişinden çıktığını söyler", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    fireEvent.click(screen.getByRole("button", { name: /^Bayi/ }));
    sec("Bayi ara veya 'Diğer' seç...", "Ege", "Ege Bayi");
    kaydet();
    expect(toast).toHaveBeenCalledWith(TOPLU_BAYIYE_GECTI);
    expect(kayitOf(101).aliciTipi).toBe("bayi");
    expect(kayitOf(101).tahsisler).toEqual([]); // AC-16: otomatik tam tahsis boşalır
  });
});

describe("Spec 0111: hata yolları kayda ve stoğa dokunmaz (ya hep ya hiç)", () => {
  const hicDokunulmadi = (once) => { expect(durum.yp).toEqual(once.yp); expect(durum.lg).toEqual(once.lg); expect(durum.ps).toEqual(once.ps); };

  it("AC-25: son satırın miktarı boşaltılınca kayıt yapılmaz, bugünkü hata bildirimi çıkar", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    const once = { ...durum };
    sil(1);
    expect(screen.getAllByTitle("Satırı sil")[0].disabled).toBe(true); // son satır silinemez (ölçüm 24)
    fireEvent.change(adetler()[0], { target: { value: "" } });
    kaydet();
    expect(toast).toHaveBeenCalledWith(TOPLU_BOS_HATASI, "err");
    hicDokunulmadi(once);
  });

  it("AC-26 / AC-29: sıfır miktar ya da çiple temizlenen parça reddedilir; neden satırın yanında yazar, hiçbir kayıt silinmez", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3), kayit(103, "81", 1)]); topluAc(3);
    const once = { ...durum };
    fireEvent.change(adetler()[1], { target: { value: "0" } });
    kaydet();
    expect(toast).toHaveBeenCalledWith(TOPLU_SATIR_HATASI, "err");
    expect(screen.getByTestId("satir-hatasi-1").textContent).toMatch(/Miktar/);
    hicDokunulmadi(once);
    // Satıra dokununca hata kalkar; sonra çiple parça temizlenir.
    fireEvent.change(adetler()[1], { target: { value: "3" } });
    expect(screen.queryByTestId("satir-hatasi-1")).toBeNull();
    const cipler = screen.getAllByText(/^(Rulman|Kayış)$/).filter(el => el.parentElement?.parentElement?.querySelector("button")).map(el => el.parentElement.parentElement.querySelector("button"));
    expect(cipler).toHaveLength(3);
    fireEvent.click(cipler[2]);
    kaydet();
    expect(screen.getByTestId("satir-hatasi-2").textContent).toMatch(/parça/);
    hicDokunulmadi(once);
  });

  it("AC-38: form açıkken partinin bir kaydı dışarıdan silinirse kayıt reddedilir, partinin değiştiği söylenir", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    act(() => durum.setYp(p => p.map(s => s.id === 102 ? { ...s, deletedAt: "2026-10-26T08:00:00.000Z" } : s)));
    const once = { ...durum };
    kaydet();
    expect(toast).toHaveBeenCalledWith(TOPLU_PARTI_DEGISTI, "err");
    hicDokunulmadi(once);
  });
});

describe("Spec 0111: kilit (R21)", () => {
  const kilitKur = (kilitli) => {
    window.crmLocks = {
      acquire: vi.fn(async (t, id) => (kilitli[`${t}:${id}`] ? { ok: false, lockedBy: kilitli[`${t}:${id}`], lockedAt: "2026-10-26T09:55:00" } : { ok: true })),
      release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}),
      list: vi.fn(async () => Object.entries(kilitli).map(([k, sahip]) => { const [t, id] = k.split(":"); return { entity_type: t, entity_id: id, locked_by: sahip }; })),
    };
  };
  it("AC-36: birincil kaydın kilidi alınır; başkasındaysa form yerine kilit ekranı çizilir", async () => {
    kilitKur({ "yedek_parca:101": "ayse" });
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    expect(await screen.findByText("Bu kayıt şu an düzenleniyor")).toBeTruthy();
    expect(window.crmLocks.acquire).toHaveBeenCalledWith("yedek_parca", "101", false);
  });
  it("AC-36: kayıt anında partinin başka bir kaydı başkasındaysa kayıt bildirimle reddedilir, hiçbir şey yazılmaz", async () => {
    kilitKur({ "yedek_parca:102": "ayse" });
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await screen.findByLabelText("Birim fiyat 1");
    const once = { ...durum };
    fireEvent.change(fiyat(1), { target: { value: "150" } });
    kaydet();
    expect(toast.mock.calls.at(-1)[1]).toBe("err");
    expect(toast.mock.calls.at(-1)[0]).toMatch(/ayse/);
    expect(durum.yp).toEqual(once.yp);
  });
});

describe("Spec 0111: dosya bağı ve Stok listesi", () => {
  it("AC-40: birincil satır durdukça partiye bağlı dosya bağı değişmez", () => {
    const dosya = { id: 7001, refType: "yedekParca", refId: 101, customerId: 1001, ad: "irsaliye.pdf" };
    kur([kayit(101, "81", 2), kayit(102, "82", 3), kayit(103, "81", 1)], undefined, { dosyalar: [dosya] }); topluAc(3);
    sil(2);
    kaydet();
    expect(durum.ds).toEqual([dosya]);
    expect(kayitOf(101).deletedAt).toBeUndefined();
    expect(durum.yp.filter(s => !s.deletedAt)[0].id).toBe(101);
  });

  it("AC-15: elle iki satıra bölünmüş tahsis miktar değişince aynen durur ve kayıt 'Tahsisi eksik' listesinde görünür", () => {
    const elle = [{ miktar: 1, customerId: 1001, serialNo: "S1", makinaSerbest: "", tarih: "2026-10-02" }, { miktar: 1, customerId: null, serialNo: "", makinaSerbest: "Eski makina", tarih: "2026-10-03" }];
    kur([kayit(101, "81", 2, { tahsisler: elle }), kayit(102, "82", 3)]); topluAc(2);
    fireEvent.change(adetler()[0], { target: { value: "5" } });
    kaydet();
    expect(kayitOf(101).tahsisler).toEqual(elle);
    const satislar = durum.yp;
    cleanup();
    render(<YedekParcaSatisTab yedekParcaSatislar={satislar} setYedekParcaSatislar={vi.fn()} dealers={DEALERS} customers={[MUSTERI]} parts={PARTS}
      partStock={STOK} setPartStock={vi.fn()} partStockLog={[]} setPartStockLog={vi.fn()} kdvRates={KDV} factory={FAB} canDo={() => true} showToast={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Tahsisi eksik/ }));
    expect(screen.getByRole("button", { name: /Tahsisi eksik/ }).getAttribute("aria-label")).toBe("Tahsisi eksik (1)");
  });
});

describe("Spec 0111: partisiz satış aynı yoldan geçmez", () => {
  it("AC-28: tek satırlık (partisiz) satışın düzenlemesi bugünkü kolla: kimlik aynı, miktar güncellenir, toplu bildirim yok", () => {
    const tek = kayit(201, "81", 2, { batchId: null });
    kur([tek]);
    fireEvent.click(screen.getByText(/^Yedek Parça \((Kargo|Fabrika Teslim)\)$/));
    fireEvent.change(screen.getByPlaceholderText("örn: 5"), { target: { value: "3" } });
    kaydet();
    expect(durum.yp.map(s => [s.id, s.miktar, !!s.deletedAt])).toEqual([[201, 3, false]]);
    expect(toast).toHaveBeenCalledWith("Yedek parça satışı güncellendi.");
    expect(toast).not.toHaveBeenCalledWith(TOPLU_GUNCELLENDI);
  });
});

// Triyaj 2026-10-26: formdaki Ödendi kutusu (R6/4), form açıkken partiye eklenen kayıt (R2/3), ekleyen bilgisayarda alarm
// bastırması (AC-34'ün ekran yarısı), başka müşteriye taşıma bildirimi (R9/2).
describe("Spec 0111 triyaj", () => {
  const odemeKutusu = () => screen.getByText(/Ücret (henüz tahsil edilmedi|tahsil edildi)/).closest("label").querySelector("input");
  it("R6/4: ödenmemiş partide formdaki Ödendi kutusu işaretlenip kaydedilince bütün satırlar ödenir", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    fireEvent.click(odemeKutusu());
    kaydet();
    expect(durum.yp.map(s => s.odendi)).toEqual([true, true]);
    expect(durum.yp.every(s => typeof s.tahsilatTarihi === "string" && s.tahsilatTarihi.length === 10)).toBe(true);
  });
  it("R6/4: ödenmiş partide işaret kaldırılınca bütün satırlar ödenmemiş olur; kutuya dokunulmazsa satır başına durum korunur", () => {
    kur([kayit(101, "81", 2, { odendi: true, tahsilatTarihi: "2026-10-05" }), kayit(102, "82", 3, { odendi: true, tahsilatTarihi: "2026-10-06" })]); topluAc(2);
    fireEvent.click(odemeKutusu());
    kaydet();
    expect(durum.yp.map(s => [s.odendi, s.tahsilatTarihi])).toEqual([[false, null], [false, null]]);
    cleanup();
    kur([kayit(101, "81", 2, { odendi: true, tahsilatTarihi: "2026-10-05" }), kayit(102, "82", 3)]); topluAc(2);
    kaydet();
    expect(durum.yp.map(s => [s.odendi, s.tahsilatTarihi ?? null])).toEqual([[true, "2026-10-05"], [false, null]]);
  });
  it("R2/3: form açıkken partiye başka yerden eklenen kayıt çöpe atılmaz; kayıt reddedilir, hiçbir şey yazılmaz", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    act(() => durum.setYp(p => [...p, kayit(103, "81", 1)]));
    const once = { ...durum };
    kaydet();
    expect(toast).toHaveBeenCalledWith(TOPLU_PARTI_DEGISTI, "err");
    expect(durum.yp).toEqual(once.yp);
    expect(durum.lg).toEqual(once.lg);
  });
  it("AC-34 (ekleyen bilgisayar): partiye eklenen satırın kimliği yerel bastırma kümesine girer, var olanlarınki girmez", () => {
    kur([kayit(101, "81", 2), kayit(102, "82", 3)]); topluAc(2);
    parcaEkle("Rulman");
    fireEvent.change(adetler()[2], { target: { value: "1" } });
    kaydet();
    const yeni = durum.yp[2];
    expect(yerelServisMi(yeni.id)).toBe(true);
    expect([yerelServisMi(101), yerelServisMi(102)]).toEqual([false, false]);
  });
  it("R9/2: alıcı başka bir müşterinin makinasına çevrilince bildirim taşındığını söyler", () => {
    const DIGER = { ...MUSTERI, id: 1002, name: "Bal Köfte", serialNo: "S2" };
    kur([kayit(101, "81", 2), kayit(102, "82", 3)], undefined, { musteriler: [MUSTERI, DIGER] }); topluAc(2);
    const cip = screen.getAllByText("Anadolu Gıda").map(el => el.parentElement?.parentElement?.querySelector(":scope > button")).find(Boolean);
    fireEvent.click(cip);
    sec("Firma / model / seri no ara...", "Bal", "Bal Köfte · S2");
    kaydet();
    expect(toast).toHaveBeenCalledWith(TOPLU_BASKA_MUSTERIYE_GECTI);
    expect(durum.yp.map(s => s.musteriId)).toEqual([1002, 1002]);
  });
});
