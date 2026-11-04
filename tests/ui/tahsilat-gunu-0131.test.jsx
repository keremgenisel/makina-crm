// @vitest-environment jsdom
// Spec 0131: tahsilat günü arayüzde. Gerçek App: müşteri detayının ödeme anahtarları (pencere günü sorar), zaman çizelgesindeki
// gün metni, Stok › Yedek Parça Satışı anahtarı, Kasa'nın iki listesindeki satır içi gün girdisi. Formlar izole bileşen.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";
import { ServiceForm } from "../../src/components/ServiceForm";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";
import { TahsilatHesapPenceresi } from "../../src/components/kasa/TahsilatHesap";
import { TAHSILAT_GUNU_GELECEK, TAHSILAT_GUNU_GECERSIZ, TAHSILAT_GUNU_BELIRTILMEDI, TAHSILAT_GUNU_CEK_NEDENI, TAHSILAT_GUNU_KART_NEDENI, TAHSILAT_GUNU_EKSIK } from "../../src/lib/satisTahsilat";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

const BUGUN = yerelBugun();
const gunEkle = (g, n) => { const d = new Date(`${g}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const DUN = gunEkle(BUGUN, -1), YARIN = gunEkle(BUGUN, 1), ONCE = gunEkle(BUGUN, -20);
const trGun = (g) => g.split("-").reverse().join("/");
const HESAPLAR = [
  { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2024-01-01", kapali: false },
  { id: 52, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, acilisTarihi: "2024-01-01", kapali: false },
];
const SERVIS = { id: 800, customerId: 700, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", servisUcreti: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", date: ONCE, odendi: false, yontem: "Nakit", islemFirma: "Altuntaş Makina", degisenParcalar: [] };
const KALIP = { id: 810, customerId: 700, tur: "Kalıp", ad: "K-1", ucret: 2000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: gunEkle(ONCE, 1), odendi: false, yontem: "Nakit" };
const YP = (o = {}) => ({ id: 820, aliciTipi: "musteri", musteriId: 700, partId: 5, miktar: 2, birimFiyat: 250, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: gunEkle(ONCE, 2), odendi: false, yontem: "Nakit", tahsisler: [], ...o });
const veri = (o = {}) => ({
  customers: [{ id: 700, name: "GÜNLÜ FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY", faturali: "Faturalı Yurtiçi" }],
  dealers: [{ id: 20, name: "Bayi A", anlasmaliServisMi: true }], parts: [{ id: 5, ad: "Rulman" }],
  services: [SERVIS], partSales: [KALIP], yedekParcaSatislar: [YP()], payments: [],
  kasaHesaplari: HESAPLAR, hesapHareketleri: [], giderTurleri: [], tedarikciler: [], giderler: [], giderTanimlari: [],
  appSettings: { giderAyarlari: { yururlukAy: "2024-01", hatirlatmaEsikGun: 7, hesapsizBaslangic: "" } }, dataVersion: 1, ...o,
});
const baslat = async ({ sunucu = null, yuklenen = veri() } = {}) => {
  const kayitlar = [];
  window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
  return { kayitlar };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const detayAc = async () => {
  menu("Müşteriler");
  await waitFor(() => expect(screen.getByText("GÜNLÜ FİRMA")).toBeTruthy());
  fireEvent.click(screen.getByText("GÜNLÜ FİRMA"));
  await waitFor(() => expect(screen.getAllByText(/Ödenmedi · işaretle: Ödendi|^Ödendi$/).filter(e => e.tagName === "BUTTON").length).toBeGreaterThan(0));
};
// Zaman çizelgesi eskiden yeniye: servis, kalıp, yedek parça.
const anahtar = (i) => screen.getAllByText(/Ödenmedi · işaretle: Ödendi|^Ödendi$/).filter(e => e.tagName === "BUTTON")[i];
const pencere = () => screen.queryByTestId("tahsilat-hesap-penceresi");
const gunKutusu = () => screen.getByTestId("pencere-tahsilat-gunu");
const bekleKayit = (kayitlar, f) => waitFor(() => expect(kayitlar.some(f)).toBe(true), { timeout: 3000 });
const son = (kayitlar, bolum, id) => kayitlar.at(-1)?.[bolum]?.find(x => x.id === id);

describe("Spec 0131: müşteri detayının ödeme anahtarı ve pencere", () => {
  it("AC-1, AC-26, AC-49: dokunulmadan kaydedilince yerel bugün; anahtarın yanında gün düz metin", async () => {
    const { kayitlar } = await baslat();
    await detayAc();
    expect(screen.queryAllByTestId("tahsilat-gunu-metni")).toHaveLength(0); // günü olmayan eski kayıt: metin yok
    fireEvent.click(anahtar(0));
    await waitFor(() => expect(pencere()).toBeTruthy());
    expect(screen.getByText("Tahsilat Bilgisi")).toBeTruthy();
    expect(gunKutusu().value).toBe(BUGUN);
    expect(gunKutusu().getAttribute("max")).toBe(BUGUN); // AC-32
    expect(gunKutusu().getAttribute("aria-label")).toBe("Tahsilat tarihi");
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi && s.tahsilatTarihi === BUGUN));
    await waitFor(() => expect(screen.getAllByTestId("tahsilat-gunu-metni").map(e => e.textContent)).toContain(trGun(BUGUN)));
    expect(screen.getAllByTestId("tahsilat-gunu-metni")[0].getAttribute("title")).toBe("Tahsilat tarihi");
  });
  it("AC-3, AC-2: pencerede dün seçilirse o gün; işaret kaldırılınca gün silinir, pencere açılmaz", async () => {
    const { kayitlar } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    await waitFor(() => expect(pencere()).toBeTruthy());
    fireEvent.change(gunKutusu(), { target: { value: DUN } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.tahsilatTarihi === DUN));
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && !s.odendi && s.tahsilatTarihi === null));
  });
  it("AC-4, AC-5, AC-50: ileri ve takvimde olmayan gün reddedilir, hata pencerede, pencere açık; Hesapsız kaydet de doğrular", async () => {
    const { kayitlar } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    await waitFor(() => expect(pencere()).toBeTruthy());
    const once = kayitlar.length;
    fireEvent.change(gunKutusu(), { target: { value: YARIN } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    expect(within(pencere()).getByRole("alert").textContent).toBe(TAHSILAT_GUNU_GELECEK);
    fireEvent.click(screen.getByText("Hesapsız kaydet"));
    expect(pencere()).toBeTruthy();
    expect(within(pencere()).getByRole("alert").textContent).toBe(TAHSILAT_GUNU_GELECEK);
    // jsdom tarih kutusu geçersiz değeri boşaltır; takvimde olmayan gün doğrulayıcıyla saf testte ölçülür (AC-5).
    await new Promise(r => setTimeout(r, 700));
    expect(kayitlar.length).toBe(once);
    expect(kayitlar.at(-1)?.services?.find(s => s.id === 800)?.odendi ?? false).toBe(false);
    expect(TAHSILAT_GUNU_GECERSIZ).toMatch(/takvimde var olan bir gün olmalı/);
  });
  it("AC-6: Hesapsız kaydet hesabı boş bırakır ama günü yazar", async () => {
    const { kayitlar } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(1));
    await waitFor(() => expect(pencere()).toBeTruthy());
    fireEvent.change(gunKutusu(), { target: { value: DUN } });
    fireEvent.click(screen.getByText("Hesapsız kaydet"));
    await bekleKayit(kayitlar, k => k.partSales?.some(s => s.id === 810 && s.odendi && s.tahsilatTarihi === DUN && s.hesapId == null)); // AC-9
  });
  it("AC-44: pencerede gün boşaltılırsa null yazılır ve ipucu durur", async () => {
    const { kayitlar } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    await waitFor(() => expect(pencere()).toBeTruthy());
    fireEvent.change(gunKutusu(), { target: { value: "" } });
    expect(within(pencere()).getByText(TAHSILAT_GUNU_BELIRTILMEDI)).toBeTruthy();
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi && s.tahsilatTarihi === null));
  });
  it("AC-15, AC-33: müşteri detayının servis formunda kayıtlı gün görünür; ücret değişince gün aynı, gün değişince yeni gün", async () => {
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [{ ...SERVIS, odendi: true, tahsilatTarihi: ONCE }], partSales: [], yedekParcaSatislar: [] }) });
    await detayAc();
    const duzenle = () => fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => /^Garanti Dışı$/.test(e.textContent)));
    duzenle();
    await waitFor(() => expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(ONCE));
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.tahsilatTarihi === ONCE));
    duzenle();
    await waitFor(() => expect(screen.getByTestId("form-tahsilat-gunu")).toBeTruthy());
    fireEvent.change(screen.getByTestId("form-tahsilat-gunu"), { target: { value: DUN } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.tahsilatTarihi === DUN));
  });
  it("AC-33 (Extra Kalıp, triyaj bulgu 4): düzenleme formu kayıtlı günle açılır, ipucu çizilmez", async () => {
    await baslat({ yuklenen: veri({ services: [], yedekParcaSatislar: [], partSales: [{ ...KALIP, odendi: true, tahsilatTarihi: ONCE }] }) });
    await detayAc();
    fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => /K-1|Kalıp/.test(e.textContent)));
    await waitFor(() => expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(ONCE));
    expect(screen.queryByText(TAHSILAT_GUNU_BELIRTILMEDI)).toBeNull();
  });
  it("AC-7: işçiliği anlaşmalı firmaya ait serviste pencere açılmaz, gün yerel bugün", async () => {
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [{ ...SERVIS, islemFirma: "Bayi A" }] }) });
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi && s.tahsilatTarihi === BUGUN));
  });
  it("AC-8: tahsilat_hesap izni olmayan kullanıcıda pencere açılmaz, gün yerel bugün", async () => {
    const izin = { tabs: ["dashboard", "customers"], giderActions: [] };
    const { kayitlar } = await baslat({ sunucu: izin });
    await detayAc().catch(() => {});
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi && s.tahsilatTarihi === BUGUN));
  });
  it("AC-10, AC-49: yedek parça partisinde ücretli bütün satırlara aynı gün; ücretsiz satıra yazılmaz; metin bir kez", async () => {
    const parti = [YP({ id: 820, batchId: 5 }), YP({ id: 821, batchId: 5, partId: 5 }), YP({ id: 822, batchId: 5, ucretsizMi: true, birimFiyat: 0 })];
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [], partSales: [], yedekParcaSatislar: parti }) });
    await detayAc();
    fireEvent.click(anahtar(0));
    await waitFor(() => expect(pencere()).toBeTruthy());
    fireEvent.change(gunKutusu(), { target: { value: DUN } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => [820, 821].every(id => k.yedekParcaSatislar?.find(s => s.id === id)?.tahsilatTarihi === DUN));
    const u = son(kayitlar, "yedekParcaSatislar", 822);
    expect(u.odendi).toBe(false);
    expect(u.tahsilatTarihi ?? null).toBeNull();
    await waitFor(() => expect(screen.getAllByTestId("tahsilat-gunu-metni")).toHaveLength(1));
  });
  it("AC-49: partide günler farklıysa gün metni yazılmaz; kart kaydında türetilmiş gün gösterilmez", async () => {
    const parti = [YP({ id: 820, batchId: 5, odendi: true, tahsilatTarihi: DUN }), YP({ id: 821, batchId: 5, odendi: true, tahsilatTarihi: ONCE })];
    const kart = { ...SERVIS, odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { hesabaGecis: DUN, toplamKesinti: 0 } };
    await baslat({ yuklenen: veri({ services: [kart], partSales: [], yedekParcaSatislar: parti }) });
    await detayAc();
    expect(screen.queryAllByTestId("tahsilat-gunu-metni")).toHaveLength(0);
  });
  it("AC-23, AC-35: Çek'te pencere gün sormaz ve nedenini yazar; 'tahsil edildi' anahtarı günü yazar ve kaldırınca siler", async () => {
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [], yedekParcaSatislar: [], partSales: [{ ...KALIP, yontem: "Çek", tahsilEdildi: false }] }) });
    await detayAc();
    fireEvent.click(anahtar(0));
    await waitFor(() => expect(pencere()).toBeTruthy());
    expect(screen.queryByTestId("pencere-tahsilat-gunu")).toBeNull();
    expect(screen.getByTestId("tahsilat-gunu-neden").textContent).toBe(TAHSILAT_GUNU_CEK_NEDENI);
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.partSales?.some(s => s.id === 810 && s.odendi && (s.tahsilatTarihi ?? null) === null));
    fireEvent.click(await screen.findByText(/Çek beklemede · işaretle: tahsil edildi/));
    await bekleKayit(kayitlar, k => k.partSales?.some(s => s.id === 810 && s.tahsilEdildi && s.tahsilatTarihi === BUGUN));
  });
  it("AC-22: Kredi Kartı'nda pencere gün sormaz, nedeni yazar, kayda gün yazılmaz", async () => {
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [{ ...SERVIS, yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: { hesabaGecis: DUN, toplamKesinti: 0 } }], partSales: [], yedekParcaSatislar: [] }) });
    await detayAc();
    fireEvent.click(anahtar(0));
    await waitFor(() => expect(pencere()).toBeTruthy());
    expect(screen.getByTestId("tahsilat-gunu-neden").textContent).toBe(TAHSILAT_GUNU_KART_NEDENI);
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi && s.tahsilatTarihi === null));
  });
  it("AC-24: USD tahsilatta pencere yalnız USD hesapları listeler, gün kuralı aynı", async () => {
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [], partSales: [], yedekParcaSatislar: [YP({ currency: "USD", faturaTipi: "Faturalı Yurtdışı" })] }) });
    await detayAc();
    fireEvent.click(anahtar(0));
    await waitFor(() => expect(pencere()).toBeTruthy());
    const secim = within(pencere()).getByLabelText("Tahsilat hesabı");
    expect([...secim.querySelectorAll("option")].map(o => o.textContent).join("|")).not.toMatch(/Ziraat/);
    fireEvent.change(gunKutusu(), { target: { value: DUN } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.yedekParcaSatislar?.some(s => s.id === 820 && s.tahsilatTarihi === DUN));
  });
});

describe("Spec 0131: Stok › Yedek Parça Satışı anahtarı (R9/2)", () => {
  it("AC-17: satırın anahtarı yalnız o kaydın gününü yazar, partinin öteki satırına dokunmaz", () => {
    let son;
    const Harness = () => {
      const [satislar, setSatislar] = useState([YP({ id: 820, batchId: 5, aliciTipi: "bayi", dealerId: 20, musteriId: null }), YP({ id: 821, batchId: 5, aliciTipi: "bayi", dealerId: 20, musteriId: null })]);
      son = satislar;
      return <YedekParcaSatisTab yedekParcaSatislar={satislar} setYedekParcaSatislar={setSatislar} dealers={[{ id: 20, name: "Bayi A" }]} parts={[{ id: 5, ad: "Rulman" }]} customers={[]}
        partStock={[]} setPartStock={() => {}} partStockLog={[]} setPartStockLog={() => {}} showToast={() => {}} canDoStock={() => true}
        kasaHesaplari={HESAPLAR} tahsilatHesapVarsayilan={() => 51} />;
    };
    render(<Harness />);
    fireEvent.click(screen.getAllByText(/Ödenmedi/)[0]);
    fireEvent.change(gunKutusu(), { target: { value: DUN } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    expect(son.filter(s => s.tahsilatTarihi === DUN)).toHaveLength(1);
    expect(son.filter(s => s.odendi)).toHaveLength(1);
    expect(son.filter(s => !s.odendi).every(s => (s.tahsilatTarihi ?? null) === null)).toBe(true);
  });
});

describe("Spec 0131: Kasa", () => {
  const kasaAc = async (ad = "Ziraat") => {
    menu("Kasa");
    await waitFor(() => expect(screen.getAllByTestId("hesap-satiri").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad)));
  };
  it("AC-18, AC-46: hesapsız listede gün alanı kaydın bugünkü günüyle dolu; dokunulmadan hesap atanınca gün yazılmaz; yalnız gün girilebilir", async () => {
    const sv = { ...SERVIS, odendi: true };
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [sv], partSales: [], yedekParcaSatislar: [] }) });
    menu("Kasa");
    fireEvent.click(await screen.findByText("Listeyi göster"));
    const satir = await screen.findByTestId("hesapsiz-tahsilat");
    const gun = within(satir).getByTestId("hesapsiz-tahsilat-gunu");
    expect(gun.value).toBe(ONCE);
    fireEvent.change(within(satir).getByLabelText(/Hesap ata/), { target: { value: "51" } });
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.hesapId === 51));
    expect("tahsilatTarihi" in son(kayitlar, "services", 800)).toBe(false);
    cleanup();
    const r2 = await baslat({ yuklenen: veri({ services: [sv], partSales: [], yedekParcaSatislar: [] }) });
    menu("Kasa");
    fireEvent.click(await screen.findByText("Listeyi göster"));
    // Triyaj bulgu 1: klavyeyle yıl yazılırken gelen ara değerler (geçerli bir gün olan "0202-…" dahil) yazılmaz; yazım odak kaybında.
    const kutu2 = within(await screen.findByTestId("hesapsiz-tahsilat")).getByTestId("hesapsiz-tahsilat-gunu");
    const [, ay, gn] = DUN.split("-");
    for (const y of ["0002", "0020", "0202", DUN.slice(0, 4)]) fireEvent.change(kutu2, { target: { value: `${y}-${ay}-${gn}` } });
    await new Promise(r => setTimeout(r, 700));
    expect(r2.kayitlar.some(k => k.services?.some(s => s.id === 800 && s.tahsilatTarihi))).toBe(false);
    fireEvent.blur(kutu2);
    await bekleKayit(r2.kayitlar, k => k.services?.some(s => s.id === 800 && s.tahsilatTarihi === DUN && s.hesapId == null));
    const gunler = new Set(r2.kayitlar.map(k => k.services?.find(s => s.id === 800)?.tahsilatTarihi).filter(Boolean));
    expect([...gunler]).toEqual([DUN]); // tek yazım, ara gün hiç kayda girmedi
  });
  it("AC-20, AC-19, AC-40: günü girilmemiş hareket işaretli; gün girilince satır taşınır, kapanış aynı, iz detail'inde tarih", async () => {
    const audit = [];
    window.auditLog = { log: async (e) => { audit.push(e); return true; } };
    const sv = { ...SERVIS, odendi: true, hesapId: 51 };
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [sv], partSales: [], yedekParcaSatislar: [] }) });
    await kasaAc();
    const satir = await screen.findByTestId("tahsilat-gunu-eksik");
    expect(satir.textContent).toContain(TAHSILAT_GUNU_EKSIK);
    const kapanis = screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Ziraat")).textContent;
    // Triyaj bulgu 1: ara değerler satırı listeden düşürmez ve yazılmaz; yazım Enter'da.
    const kutu = within(satir).getByTestId("hareket-tahsilat-gunu");
    const [, ay, gn] = DUN.split("-");
    for (const y of ["0002", "0020", "0202", DUN.slice(0, 4)]) fireEvent.change(kutu, { target: { value: `${y}-${ay}-${gn}` } });
    expect(screen.getByTestId("tahsilat-gunu-eksik")).toBeTruthy();
    expect(screen.getByTestId("hareket-tahsilat-gunu")).toBe(kutu);
    fireEvent.keyDown(kutu, { key: "Enter" });
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.tahsilatTarihi === DUN && s.hesapId === 51 && s.odendi));
    expect(new Set(kayitlar.map(k => k.services?.find(s => s.id === 800)?.tahsilatTarihi).filter(Boolean))).toEqual(new Set([DUN]));
    await waitFor(() => expect(screen.queryByTestId("tahsilat-gunu-eksik")).toBeNull());
    // Triyaj bulgu 3 (AC-40): iz bugünkü "duzenlendi" kaydı, detayında gün; tek kayıt.
    await waitFor(() => expect(audit).toContainEqual(expect.objectContaining({ action: "duzenlendi", entity: "servis", entity_id: 800, detail: JSON.stringify({ tahsilatGunu: DUN }) })));
    expect(audit.filter(e => (e.detail || "").includes("tahsilatGunu"))).toHaveLength(1);
    expect(screen.getAllByTestId("hareket-satiri")[0].textContent).toContain(trGun(DUN));
    expect(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Ziraat")).textContent).toBe(kapanis);
    delete window.auditLog;
  });
  it("AC-21, AC-37: günü girilmiş satır, kart ve çek satırı ve makina tahsilatı işaretlenmez", async () => {
    const services = [{ ...SERVIS, odendi: true, hesapId: 51, tahsilatTarihi: DUN },
      { ...SERVIS, id: 801, odendi: true, hesapId: 51, yontem: "Kredi Kartı", kartKomisyonu: { hesabaGecis: DUN, toplamKesinti: 0 } }];
    const partSales = [{ ...KALIP, odendi: true, hesapId: 51, yontem: "Çek", tahsilEdildi: true }];
    const payments = [{ id: 900, customerId: 700, tutar: 10, currency: "TRY", tarih: DUN, yontem: "Havale", hesapId: 51 }];
    await baslat({ yuklenen: veri({ services, partSales, yedekParcaSatislar: [], payments }) });
    await kasaAc();
    await waitFor(() => expect(screen.getAllByTestId("hareket-satiri").length).toBeGreaterThanOrEqual(3));
    expect(screen.queryByTestId("tahsilat-gunu-eksik")).toBeNull();
  });
  it("AC-38: Kasa düzeltmesi yalnız o satırın kaydına yazar; partinin öteki satırı değişmez", async () => {
    const parti = [YP({ id: 820, batchId: 5, odendi: true, hesapId: 51 }), YP({ id: 821, batchId: 5, odendi: true, hesapId: 51 })];
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [], partSales: [], yedekParcaSatislar: parti }) });
    await kasaAc();
    const isaretler = await screen.findAllByTestId("tahsilat-gunu-eksik");
    expect(isaretler).toHaveLength(2);
    fireEvent.change(within(isaretler[0]).getByTestId("hareket-tahsilat-gunu"), { target: { value: DUN } });
    fireEvent.blur(within(isaretler[0]).getByTestId("hareket-tahsilat-gunu"));
    await bekleKayit(kayitlar, k => (k.yedekParcaSatislar || []).filter(s => s.tahsilatTarihi === DUN).length === 1);
    expect((kayitlar.at(-1).yedekParcaSatislar || []).filter(s => !s.tahsilatTarihi)).toHaveLength(1);
  });
  it("AC-39: kayıt başkasının kilidindeyse Kasa'dan gün yazılmaz", async () => {
    const kilit = [{ entity_type: "customer", entity_id: "700", locked_by: "baska", locked_at: new Date().toISOString() }];
    window.crmLocks = { list: async () => kilit, acquire: async () => ({ ok: true }), release: async () => true, heartbeat: async () => true };
    const sv = { ...SERVIS, odendi: true, hesapId: 51 };
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [sv], partSales: [], yedekParcaSatislar: [] }) });
    await kasaAc();
    const satir = await screen.findByTestId("tahsilat-gunu-eksik");
    await new Promise(r => setTimeout(r, 100));
    const once = kayitlar.length;
    fireEvent.change(within(satir).getByTestId("hareket-tahsilat-gunu"), { target: { value: DUN } });
    fireEvent.blur(within(satir).getByTestId("hareket-tahsilat-gunu"));
    await new Promise(r => setTimeout(r, 900));
    expect(kayitlar.slice(once).some(k => k.services?.some(s => s.tahsilatTarihi === DUN))).toBe(false);
    delete window.crmLocks;
  });
});

// ── Formlar (izole) ───────────────────────────────────────────────────────────────────────────────────────────────────
const MUSTERI = [{ id: 700, name: "GÜNLÜ FİRMA", model: "AK120", serialNo: "S-9", currency: "TRY", faturali: "Faturalı Yurtiçi" }];
const Kap = ({ Bilesen, ilk, onSave, ...ek }) => {
  const [form, setForm] = useState(ilk);
  return <Bilesen title="Form" form={form} setForm={setForm} customers={MUSTERI} onSave={(...a) => onSave(form, ...a)} onCancel={() => {}} {...ek} />;
};
const kutu = (re) => screen.getAllByRole("checkbox").find(c => re.test(c.closest("label")?.textContent || ""));

describe("Spec 0131: formlarda gün alanı", () => {
  it("AC-11, AC-43: servis formu; kutu işaretlenince bugünle dolar; kasaHesaplari yokken (izinsiz) de çizilir", () => {
    const onSave = vi.fn();
    render(<Kap Bilesen={ServiceForm} ilk={{ ...SERVIS }} onSave={onSave} />);
    expect(screen.queryByTestId("form-tahsilat-gunu")).toBeNull();
    fireEvent.click(kutu(/tahsil edilmedi/));
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(BUGUN);
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].tahsilatTarihi).toBe(BUGUN);
    fireEvent.click(kutu(/tahsil edildi/));
    expect(screen.queryByTestId("form-tahsilat-gunu")).toBeNull();
  });
  it("AC-16: formda yarının tarihi reddedilir, neden alanın altında", () => {
    const onSave = vi.fn();
    render(<Kap Bilesen={ServiceForm} ilk={{ ...SERVIS, odendi: true, tahsilatTarihi: BUGUN }} onSave={onSave} />);
    fireEvent.change(screen.getByTestId("form-tahsilat-gunu"), { target: { value: YARIN } });
    expect(screen.getByText(TAHSILAT_GUNU_GELECEK)).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
  });
  it("AC-33, AC-34: işaret duran kayıtta alan kayıtlı günü, günsüzde boşu gösterir", () => {
    render(<Kap Bilesen={ServiceForm} ilk={{ ...SERVIS, odendi: true, tahsilatTarihi: ONCE }} onSave={() => {}} />);
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(ONCE);
    cleanup();
    render(<Kap Bilesen={ServiceForm} ilk={{ ...SERVIS, odendi: true }} onSave={() => {}} />);
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe("");
    expect(screen.getByText(TAHSILAT_GUNU_BELIRTILMEDI)).toBeTruthy();
  });
  it("AC-23, R12/3: çek ve kartta formda alan yerine neden", () => {
    render(<Kap Bilesen={ServiceForm} ilk={{ ...SERVIS, odendi: true, yontem: "Çek" }} onSave={() => {}} />);
    expect(screen.queryByTestId("form-tahsilat-gunu")).toBeNull();
    expect(screen.getByTestId("tahsilat-gunu-neden").textContent).toBe(TAHSILAT_GUNU_CEK_NEDENI);
  });
  it("AC-12: Extra Kalıp formu", () => {
    const onSave = vi.fn();
    render(<Kap Bilesen={PartSaleForm} ilk={{ customerId: 700, kaliplar: [{ ad: "K-1", olcu: "", fiyat: "500" }], currency: "TRY", tarih: ONCE, odendi: false, faturaTipi: "Faturalı Yurtiçi" }} onSave={onSave} />);
    fireEvent.click(kutu(/tahsil edilmedi/));
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(BUGUN);
    fireEvent.change(screen.getByTestId("form-tahsilat-gunu"), { target: { value: YARIN } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("form-tahsilat-gunu"), { target: { value: DUN } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].tahsilatTarihi).toBe(DUN);
  });
  it("AC-13: yedek parça formu", () => {
    const onSave = vi.fn();
    render(<Kap Bilesen={YedekParcaSatisForm} parts={[{ id: 5, ad: "Rulman" }]} dealers={[{ id: 20, name: "Bayi A" }]}
      ilk={{ aliciTipi: "bayi", dealerId: 20, satirlar: [{ partId: 5, miktar: "2", birimFiyat: "100" }], currency: "TRY", tarih: ONCE, faturaTipi: "Faturalı Yurtiçi", odendi: false }} onSave={onSave} />);
    fireEvent.click(kutu(/tahsil edilmedi/));
    expect(screen.getByTestId("form-tahsilat-gunu").value).toBe(BUGUN);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].tahsilatTarihi).toBe(BUGUN);
  });
});

describe("Spec 0131: pencere izole", () => {
  it("AC-50, R4: iki düğme gün iletir; geçersizde onKaydet çağrılmaz", () => {
    const onKaydet = vi.fn();
    render(<TahsilatHesapPenceresi hesaplar={HESAPLAR} onKaydet={onKaydet} onVazgec={() => {}} />);
    fireEvent.change(screen.getByTestId("pencere-tahsilat-gunu"), { target: { value: DUN } });
    fireEvent.click(screen.getByText("Hesapsız kaydet"));
    expect(onKaydet).toHaveBeenLastCalledWith(null, DUN);
    fireEvent.change(screen.getByTestId("pencere-tahsilat-gunu"), { target: { value: YARIN } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    expect(onKaydet).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toBe(TAHSILAT_GUNU_GELECEK);
  });
  it("R12/3: gunNedeni verilince alan yok, onKaydet'e gün gitmez", () => {
    const onKaydet = vi.fn();
    render(<TahsilatHesapPenceresi hesaplar={HESAPLAR} gunNedeni={TAHSILAT_GUNU_KART_NEDENI} onKaydet={onKaydet} onVazgec={() => {}} />);
    expect(screen.queryByTestId("pencere-tahsilat-gunu")).toBeNull();
    fireEvent.click(screen.getByText("Hesapsız kaydet"));
    expect(onKaydet).toHaveBeenCalledWith(null, undefined);
  });
});
