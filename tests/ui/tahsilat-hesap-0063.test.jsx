// @vitest-environment jsdom
// Spec 0063: tahsilat hesabı sorulmayan iki giriş noktası. (A) yeni müşteri formunun ilk ödeme satırları, (B) bayi detayından
// açılan yedek parça ve kalıp satışı, (C) müşteri detayının tahsilat formunda satır başına hesap (tek paylaşılan seçici).
// Customers ve SimpleDealers izole düzenekle; uçtan uca senaryolar gerçek App ile (plan Q7).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun, kalipBorcTarafi } from "../../src/lib/utils";
import { hesapBakiyeleri } from "../../src/lib/kasa";
import { Customers } from "../../src/components/Customers";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { regexKacis } from "../yardimci/regexKacis.js";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

const buAy = yerelBugun().slice(0, 7);
const HESAPLAR = [
  { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false },
  { id: 52, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false },
  { id: 53, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false },
  { id: 54, ad: "Kapalı Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: true },
];
const varsayilan = (pb) => (pb === "TRY" ? 53 : pb === "USD" ? 52 : null);
const secenekler = (el) => [...el.querySelectorAll("option")].map(o => o.textContent);
const hesapSecicileri = () => screen.queryAllByLabelText("Tahsilat hesabı");
// Ödeme satırı düzenleyicisi: n. satırın tutar alanı (yöntem seçicisinin kardeşi).
const tutarAlani = (n) => screen.getByLabelText(`Ödeme yöntemi ${n}`).parentElement.querySelector("input");
const satirEkle = (tutar) => {
  fireEvent.click(screen.getByText("+ Ödeme Ekle"));
  const n = screen.getAllByLabelText(/^Ödeme yöntemi \d+$/).length;
  if (tutar != null) fireEvent.change(tutarAlani(n), { target: { value: tutar } });
  return n;
};
const satirHesabi = (n) => within(screen.getByTestId(`odeme-satiri-hesap-${n}`)).getByLabelText("Tahsilat hesabı");

// ── A: yeni müşteri formu (izole Customers) ──────────────────────────────────────────
function musteriKur({ kasaYetki = true, customers = [] } = {}) {
  const durum = { customers, payments: [], stock: [], services: [], partSales: [], partStock: [], partStockLog: [] };
  const setter = (k) => vi.fn((u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
  const Harness = () => {
    const [c, setC] = useState(customers);
    const [p, setP] = useState([]);
    durum.customers = c; durum.payments = p;
    return <Customers customers={c} setCustomers={setC} payments={p} setPayments={setP} stock={[]} setStock={setter("stock")} services={[]} setServices={setter("services")}
      partSales={[]} setPartSales={setter("partSales")} partStock={[]} setPartStock={setter("partStock")} partStockLog={[]} setPartStockLog={setter("partStockLog")}
      // App'in verdiği gibi: Customers'a kasa yetkisizken boş dizi gelir; forma null süzülmesi Customers'ın işidir (R16).
      kasaHesaplari={kasaYetki ? HESAPLAR : []} kasaYetki={kasaYetki} tahsilatHesapVarsayilan={kasaYetki ? varsayilan : null} />;
  };
  render(<Harness />);
  return durum;
}
const yeniMusteri = (ad = "İlk Ödemeli AŞ") => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
};

describe("Spec 0063 A: yeni müşteri formunun ilk ödemesi", () => {
  it("AC-1 / AC-4 / AC-5: satırda hesap seçilir; ön seçim son tahsilat hesabı; liste yalnız satışın para birimindeki açık hesaplar", () => {
    musteriKur();
    yeniMusteri();
    satirEkle("30000");
    const sec = satirHesabi(1);
    expect(sec.value).toBe("53");
    expect(secenekler(sec)).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)", "Merkez Kasa (Kasa)"]);
  });
  it("AC-5: uyumsuz (başka para birimindeki) hesap ön seçilmez", () => {
    const durum = { customers: [], payments: [] };
    const Harness = () => {
      const [c, setC] = useState([]); const [p, setP] = useState([]);
      durum.payments = p;
      return <Customers customers={c} setCustomers={setC} payments={p} setPayments={setP} stock={[]} setStock={vi.fn()} services={[]} partSales={[]}
        kasaHesaplari={HESAPLAR} kasaYetki tahsilatHesapVarsayilan={() => 52} />;
    };
    render(<Harness />);
    yeniMusteri();
    satirEkle("1000");
    expect(satirHesabi(1).value).toBe("");
  });
  it("AC-23: tutarı boş satırda hesap alanı çizilmez; tutar girilince gelir", () => {
    musteriKur();
    yeniMusteri();
    const n = satirEkle(null);
    expect(screen.queryByTestId(`odeme-satiri-hesap-${n}`)).toBeNull();
    fireEvent.change(tutarAlani(n), { target: { value: "500" } });
    expect(screen.getByTestId(`odeme-satiri-hesap-${n}`)).toBeTruthy();
  });
  it("AC-2: iki satır iki ayrı hesaba yazılır; kayıtlar bu hesaplarla doğar", () => {
    const durum = musteriKur();
    yeniMusteri();
    satirEkle("30000");
    satirEkle("70000");
    fireEvent.change(satirHesabi(2), { target: { value: "51" } });
    expect(satirHesabi(1).value).toBe("53"); // R23: ikinci satırın seçimi birincisini ezmez
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.payments.map(p => [p.tutar, p.yontem, p.hesapId])).toEqual(expect.arrayContaining([[30000, "Nakit", 53], [70000, "Nakit", 51]]));
  });
  it("AC-6: hesabı boşaltılan satır hesapsız kaydedilir; kayıtta hesapId alanı hiç yoktur", () => {
    const durum = musteriKur();
    yeniMusteri();
    satirEkle("4000");
    fireEvent.change(satirHesabi(1), { target: { value: "" } });
    expect(satirHesabi(1).value).toBe(""); // R21: boşaltılan değer yeniden doldurulmaz
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.payments).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(durum.payments[0], "hesapId")).toBe(false);
  });
  it("AC-26: satışın para birimi değişince uyumsuz kalan satır hesapları boşalır", () => {
    const durum = musteriKur();
    yeniMusteri();
    satirEkle("1000");
    satirEkle("2000");
    expect(satirHesabi(1).value).toBe("53");
    fireEvent.change(screen.getByLabelText("Para Birimi"), { target: { value: "USD" } });
    expect(satirHesabi(1).value).toBe("");
    expect(satirHesabi(2).value).toBe("");
    expect(secenekler(satirHesabi(1))).toEqual(["Hesap belirtilmedi", "Döviz (Banka)"]);
    fireEvent.click(screen.getByText("Kaydet"));
    for (const p of durum.payments) expect(Object.prototype.hasOwnProperty.call(p, "hesapId")).toBe(false);
  });
  it("AC-3: kasa yetkisi yoksa hesap alanı DOM'da yok (boş listeli alan da yok) ve kayıt bugünkü gibi oluşur", () => {
    const durum = musteriKur({ kasaYetki: false });
    yeniMusteri();
    satirEkle("1500");
    expect(hesapSecicileri()).toHaveLength(0);
    expect(screen.queryByTestId("odeme-satiri-hesap-1")).toBeNull();
    expect(screen.queryByText(/para biriminde açık hesap yok/)).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.payments).toHaveLength(1);
    expect(durum.payments[0]).toMatchObject({ tutar: 1500, yontem: "Nakit" });
    expect(Object.prototype.hasOwnProperty.call(durum.payments[0], "hesapId")).toBe(false);
  });
  it("AC-21: müşteri düzenleme formunda ilk ödeme bölümü ve hesap alanı yoktur", () => {
    musteriKur({ customers: [{ id: 1, name: "Eski Firma", model: "AK100", serialNo: "X1", currency: "TRY", installDate: "2026-01-01" }] });
    const satir = screen.getByText("Eski Firma").closest("tr");
    fireEvent.click(within(satir).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
    expect(screen.queryByText("İlk Ödeme (Kapora/Ödeme)")).toBeNull();
    expect(screen.queryByText("+ Ödeme Ekle")).toBeNull();
    expect(hesapSecicileri()).toHaveLength(0);
  });
});

// ── B: bayi detayından satışlar (izole SimpleDealers) ─────────────────────────────────
const DEALERS = [{ id: 3, name: "Ege Bayi", bayiMi: true, anlasmaliServisMi: false, city: "İzmir", country: "Türkiye" }];
const CUST = [{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", kaliplar: [] }];
const PARTS = [{ id: 7, ad: "Rulman" }, { id: 8, ad: "Kayış" }];
function bayiKur({ kasa = true } = {}) {
  const st = {};
  const Harness = () => {
    const [partSales, setPartSales] = useState([]);
    const [customers, setCustomers] = useState(CUST);
    const [yp, setYp] = useState([]);
    const [partStock, setPartStock] = useState([{ partId: 7, miktar: 50 }, { partId: 8, miktar: 50 }]);
    Object.assign(st, { partSales, customers, yp });
    return <SimpleDealers dealers={DEALERS} setDealers={vi.fn()} factory={{ name: "Altuntaş Fabrika" }} setFactory={vi.fn()} geoData={null} loadingGeo={false}
      customers={customers} setCustomers={setCustomers} partSales={partSales} setPartSales={setPartSales} services={[]} kalipDefs={[{ id: 1, ad: "Hamburger" }]}
      yedekParcaSatislar={yp} setYedekParcaSatislar={setYp} parts={PARTS} partStock={partStock} setPartStock={setPartStock} setPartStockLog={vi.fn()}
      showToast={vi.fn()} openDetailId={3}
      // App deseni (R16): Kasa yetkisi yoksa ikisi de null.
      kasaHesaplari={kasa ? HESAPLAR : null} tahsilatHesapVarsayilan={kasa ? varsayilan : null} />;
  };
  render(<Harness />);
  return st;
}
const ypFormu = () => fireEvent.click(screen.getByText("Yedek Parça Satışı"));
const kalipFormu = () => fireEvent.click(screen.getByText("Bayi Aracılığıyla Kalıp Satışı"));
const odendiKutusu = () => screen.getByText(/Ücret henüz tahsil edilmedi|Ücret tahsil edildi/).closest("label").querySelector("input");
const parcaSatiri = (i, arama, ad, miktar, fiyat) => {
  const inp = screen.getAllByPlaceholderText("Parça ara...")[0];
  fireEvent.focus(inp);
  fireEvent.change(inp, { target: { value: arama } });
  fireEvent.mouseDown(screen.getByText(ad));
  fireEvent.change(screen.getAllByPlaceholderText("Adet")[i], { target: { value: miktar } });
  const fiyatlar = screen.getAllByPlaceholderText("Adet")[i].parentElement.querySelectorAll("input");
  fireEvent.change(fiyatlar[fiyatlar.length - 1], { target: { value: fiyat } });
};
const kalipDoldur = () => {
  fireEvent.change(screen.getByPlaceholderText("Firma adı, model veya seri no ile ara..."), { target: { value: "Kutu" } });
  fireEvent.click(screen.getAllByText(/Kutu Gıda/).pop());
  const kalipAra = screen.getByPlaceholderText("Kalıp ara...");
  fireEvent.focus(kalipAra);
  fireEvent.change(kalipAra, { target: { value: "Ham" } });
  const s = screen.getAllByText("Hamburger").pop();
  fireEvent.mouseDown(s); fireEvent.click(s);
  const girdiler = screen.getByPlaceholderText("Ölçü, örn: 55x125 mm").parentElement.querySelectorAll("input");
  fireEvent.change(girdiler[girdiler.length - 1], { target: { value: "2.000" } });
};

describe("Spec 0063 B: bayi detayından satışlar", () => {
  it("AC-11 / AC-27 / AC-15: yedek parça formunda ödendi işaretlenmeden alan yok; işaretlenince Stok'taki ön seçim ve ibare", () => {
    bayiKur();
    ypFormu();
    parcaSatiri(0, "Rul", "Rulman", "2", "100");
    expect(hesapSecicileri()).toHaveLength(0);
    fireEvent.click(odendiKutusu());
    const sec = screen.getByLabelText("Tahsilat hesabı");
    expect(sec.value).toBe("53");
    expect(secenekler(sec)).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)", "Merkez Kasa (Kasa)"]);
    expect(screen.getByText(/boş bırakılırsa Kasa'da hesabı belirtilmemiş tahsilatlar arasında bekler/)).toBeTruthy();
  });
  it("AC-12 / AC-27: kalıp formunda ödendi işaretlenmeden alan yok; işaretlenince görünür", () => {
    bayiKur();
    kalipFormu();
    kalipDoldur();
    expect(hesapSecicileri()).toHaveLength(0);
    fireEvent.click(odendiKutusu());
    expect(screen.getByLabelText("Tahsilat hesabı").value).toBe("53");
  });
  it("AC-14: kasa yetkisi yoksa (null) iki formda da alan DOM'da yok", () => {
    bayiKur({ kasa: false });
    ypFormu();
    parcaSatiri(0, "Rul", "Rulman", "2", "100");
    fireEvent.click(odendiKutusu());
    expect(hesapSecicileri()).toHaveLength(0);
    expect(screen.queryByText(/para biriminde açık hesap yok/)).toBeNull();
    fireEvent.click(screen.getByText("Vazgeç"));
    kalipFormu();
    kalipDoldur();
    fireEvent.click(odendiKutusu());
    expect(hesapSecicileri()).toHaveLength(0);
  });
  it("AC-13 / AC-28: çok satırlı yedek parça satışında bütün kayıtlar aynı hesabı taşır ve her biri kendi tutarıyla bakiyeye girer", () => {
    const st = bayiKur();
    ypFormu();
    parcaSatiri(0, "Rul", "Rulman", "2", "100");
    fireEvent.click(screen.getByText("Parça Ekle"));
    parcaSatiri(1, "Kay", "Kayış", "3", "50");
    fireEvent.click(odendiKutusu());
    fireEvent.change(screen.getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.yp).toHaveLength(2);
    expect(st.yp.every(r => r.hesapId === 51 && r.odendi === true)).toBe(true);
    const b = hesapBakiyeleri(HESAPLAR, [], { yedekParcaSatislar: st.yp, dealers: DEALERS, bugun: "2099-01-01" }).get("51");
    const brut = st.yp.map(r => b.satirlar.find(s => s.tahsilat.id === r.id)?.girenK);
    expect(brut.every(k => k > 0)).toBe(true);
    expect(b.girenK).toBe(brut[0] + brut[1]);
  });
  it("AC-13 / AC-16: bayi aracılı kalıp hesabı kayda yazılır, bakiyeye girer; borç atfı bayide kalır", () => {
    const st = bayiKur();
    kalipFormu();
    kalipDoldur();
    fireEvent.click(odendiKutusu());
    fireEvent.change(screen.getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.partSales).toHaveLength(1);
    expect(st.partSales[0]).toMatchObject({ hesapId: 51, odendi: true, satisFirma: "Ege Bayi" });
    expect(hesapBakiyeleri(HESAPLAR, [], { partSales: st.partSales, customers: st.customers, factory: { name: "Altuntaş Fabrika" }, bugun: "2099-01-01" }).get("51").girenK).toBeGreaterThan(0);
    // Borç atfı ödendi kaldırılınca görünür: borçlu bayidir (0007).
    expect(kalipBorcTarafi({ ...st.partSales[0], odendi: false }, "Altuntaş Fabrika")).toEqual({ tip: "bayi", ad: "Ege Bayi" });
  });
  it("AC-29: ödendi kaldırılıp kaydedilince hesap korunur ama tutar hiçbir bakiyeye girmez", () => {
    const st = bayiKur();
    kalipFormu();
    kalipDoldur();
    fireEvent.click(odendiKutusu());
    fireEvent.change(screen.getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(odendiKutusu()); // geri al
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.partSales[0]).toMatchObject({ hesapId: 51, odendi: false });
    expect(hesapBakiyeleri(HESAPLAR, [], { partSales: st.partSales, customers: st.customers, factory: { name: "Altuntaş Fabrika" }, bugun: "2099-01-01" }).get("51").girenK).toBe(0);
  });
});

// ── C ve uçtan uca: gerçek App ────────────────────────────────────────────────────────
const veri = (o = {}) => ({
  customers: [{ id: 700, name: "TAHSİLATLI FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY", faturali: "Faturalı Yurtiçi" }],
  dealers: DEALERS, parts: PARTS, partStock: [{ partId: 7, miktar: 50 }], services: [], partSales: [], yedekParcaSatislar: [],
  // Son tahsilat Merkez Kasa'ya girdi: ön seçim oradan (0044 Q8).
  payments: [{ id: 900, customerId: 700, tutar: 10, currency: "TRY", tarih: `${buAy}-03`, yontem: "Havale", hesapId: 53 }],
  kasaHesaplari: HESAPLAR, hesapHareketleri: [],
  giderTurleri: [], tedarikciler: [], giderler: [], giderTanimlari: [], standartGiderler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1, ...o,
});
const baslat = async (yuklenen = veri()) => {
  const kayitlar = [];
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(yuklenen)),
    save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
    getVersion: vi.fn(async () => 1),
  };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800)); // App yüklemeden sonraki 700 ms kaydı bastırır
  return kayitlar;
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const bekleKayit = (kayitlar, f) => waitFor(() => expect(kayitlar.some(f)).toBe(true), { timeout: 3000 });
const sonKayit = (kayitlar) => kayitlar[kayitlar.length - 1];
const kasaSatiri = async (ad) => {
  menu("Kasa");
  await waitFor(() => expect(screen.getAllByTestId("hesap-satiri").length).toBeGreaterThan(0));
  return screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad)).textContent;
};
const tahsilatFormu = async () => {
  menu("Müşteriler");
  await waitFor(() => expect(screen.getByText("TAHSİLATLI FİRMA")).toBeTruthy());
  fireEvent.click(screen.getByText("TAHSİLATLI FİRMA"));
  await waitFor(() => expect(screen.getAllByText("Ödeme Ekle").length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByText("Ödeme Ekle")[0]);
  await waitFor(() => expect(screen.getByText("Kapora/Ödeme Ekle")).toBeTruthy());
};

describe("Spec 0063 C: müşteri detayının tahsilat formu (gerçek App)", () => {
  it("AC-18 / R13: ekleme kipinde her satır aynı ön seçimle gelir; tek hesap seçen kullanıcı bugünkü kaydı alır", async () => {
    const kayitlar = await baslat();
    await tahsilatFormu();
    satirEkle("4000");
    satirEkle("6000");
    expect(satirHesabi(1).value).toBe("53");
    expect(satirHesabi(2).value).toBe("53");
    // Bugünkü kullanım: bütün satırlar için tek hesap (Ziraat) seçilir.
    fireEvent.change(satirHesabi(1), { target: { value: "51" } });
    fireEvent.change(satirHesabi(2), { target: { value: "51" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => (k.payments || []).filter(p => p.customerId === 700 && p.hesapId === 51).length === 2);
    const yeni = sonKayit(kayitlar).payments.filter(p => p.hesapId === 51);
    expect(yeni.map(p => p.tutar).sort()).toEqual([4000, 6000]);
    expect(yeni.every(p => p.currency === "TRY" && p.customerId === 700)).toBe(true);
  });
  it("AC-18: satır başına farklı hesap yazılır (biri kasaya, biri bankaya)", async () => {
    const kayitlar = await baslat();
    await tahsilatFormu();
    satirEkle("4000");
    satirEkle("6000");
    fireEvent.change(satirHesabi(2), { target: { value: "51" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => (k.payments || []).some(p => p.tutar === 6000 && p.hesapId === 51));
    expect(sonKayit(kayitlar).payments.find(p => p.tutar === 4000).hesapId).toBe(53);
  });
  it("AC-18: düzenleme kipi tek kayıttır; hesap form düzeyinde, paylaşılan alandan; seçim kayda yazılır", async () => {
    const kayitlar = await baslat();
    menu("Müşteriler");
    await waitFor(() => expect(screen.getByText("TAHSİLATLI FİRMA")).toBeTruthy());
    fireEvent.click(screen.getByText("TAHSİLATLI FİRMA"));
    await waitFor(() => expect(screen.getAllByTitle("Düzenlemek için tıklayın").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByTitle("Düzenlemek için tıklayın").find(e => /Ödeme|Tahsilat/i.test(e.textContent)) || screen.getAllByTitle("Düzenlemek için tıklayın")[0]);
    await waitFor(() => expect(screen.getByText("Ödemeyi Düzenle")).toBeTruthy());
    expect(screen.queryByText("+ Ödeme Ekle")).toBeNull();
    const sec = screen.getByLabelText("Tahsilat hesabı");
    expect(hesapSecicileri()).toHaveLength(1);
    expect(sec.value).toBe("53");
    fireEvent.change(sec, { target: { value: "51" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => (k.payments || []).some(p => p.id === 900 && p.hesapId === 51));
  });
});

describe("Spec 0063 uçtan uca (plan Q7, gerçek App)", () => {
  it("yeni müşteri + iki satırlı ilk ödeme: Kasa'da iki hesabın bakiyesi artar; hesapsız satır hiçbir bakiyeye girmez", async () => {
    const kayitlar = await baslat();
    menu("Müşteriler");
    await waitFor(() => expect(screen.getByText("Yeni Müşteri")).toBeTruthy());
    yeniMusteri("Uçtan Uca AŞ");
    satirEkle("30000");
    satirEkle("70000");
    satirEkle("5000");
    fireEvent.change(satirHesabi(2), { target: { value: "51" } });
    fireEvent.change(satirHesabi(3), { target: { value: "" } });
    fireEvent.click(screen.getAllByText("Kaydet").pop());
    await bekleKayit(kayitlar, k => (k.payments || []).some(p => p.tutar === 70000 && p.hesapId === 51));
    const yeni = sonKayit(kayitlar).payments.filter(p => [30000, 70000, 5000].includes(p.tutar));
    expect(yeni.map(p => [p.tutar, p.hesapId ?? null])).toEqual(expect.arrayContaining([[30000, 53], [70000, 51], [5000, null]]));
    expect(Object.prototype.hasOwnProperty.call(yeni.find(p => p.tutar === 5000), "hesapId")).toBe(false);
    expect(await kasaSatiri("Ziraat")).toMatch(/70\.000/);
    expect(await kasaSatiri("Merkez Kasa")).toMatch(/30\.010/); // 10 TL önceki tahsilat + 30.000
  });
  it("bayi yedek parça satışı: ön seçim gelir; hesabı boşaltılan satış bakiyeye girmez, Kasa'nın hesapsız tahsilat listesine düşer", async () => {
    const kayitlar = await baslat();
    menu("Bayiler");
    await waitFor(() => expect(screen.getByText("Ege Bayi")).toBeTruthy());
    fireEvent.click(screen.getByText("Ege Bayi"));
    await waitFor(() => expect(screen.getByText("Yedek Parça Satışı")).toBeTruthy());
    ypFormu();
    parcaSatiri(0, "Rul", "Rulman", "2", "100");
    fireEvent.click(odendiKutusu());
    expect(screen.getByLabelText("Tahsilat hesabı").value).toBe("53");
    fireEvent.change(screen.getByLabelText("Tahsilat hesabı"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekleKayit(kayitlar, k => (k.yedekParcaSatislar || []).length === 1);
    expect(sonKayit(kayitlar).yedekParcaSatislar[0]).toMatchObject({ dealerId: 3, odendi: true, hesapId: null });
    menu("Kasa");
    await waitFor(() => expect(screen.getByTestId("hesapsiz-tahsilat-satiri").textContent).toMatch(/Hesabı belirtilmemiş tahsilatlar: 1/));
    expect(await kasaSatiri("Merkez Kasa")).toMatch(/₺10(?![\d.,])/); // hesapsız satış bakiyeye girmedi (yalnız eski 10 TL)
  });
});

// ── Kanıt kriterleri (R19): genel koruma tasarim-kaynak.test.js ve kanit-eslemesi.test.js'tedir; bu blok 0063 kayıtlarını
// adıyla sabitler (triyaj: AC-30/31/32'nin AC adlı testi yoktu).
describe("Spec 0063 kanıt kriterleri", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const RAPOR = "docs/evidence/0063-piksel-raporu.json";
  const rapor = JSON.parse(readFileSync(RAPOR, "utf-8"));
  const eslesme = JSON.parse(readFileSync("docs/evidence/kanit-eslemesi.json", "utf-8")).dosyalar;
  // Uygulama aşamasında değişen ve yeni ekranlar 0063 raporunda 'degisti' + onay; done'da taban raporuna 'ayni' olarak taşınır.
  const TABAN = "docs/evidence/0063-taban-piksel-raporu.json";
  const taban = existsSync(TABAN) ? JSON.parse(readFileSync(TABAN, "utf-8")) : [];
  const kayitlar = Object.entries(eslesme).flatMap(([dosya, l]) => l.filter(k => k.rapor === RAPOR || k.rapor === TABAN).map(k => ({ dosya, ...k })));
  const onayliYaDaTabanda = (k, madde) => {
    if (k.rapor === TABAN) {
      expect(k.beklenen, `${k.dosya} ${k.ekran}`).toBe("ayni");
      for (const t of ["aydinlik", "karanlik"]) expect(taban.find(x => x.ad === `${k.ekran}-${t}.png`)?.piksel, `taban ${k.ekran}-${t}`).toBe(0);
    } else {
      expect(k.beklenen).toBe("degisti");
      expect(k.onay).toMatch(new RegExp(`^Takım Yöneticisi · \\d{4}-\\d{2}-\\d{2} · spec 0063 ${regexKacis(madde)}$`));
    }
  };
  const YENI = ["musteri-formu-ilk-odeme", "bayi-yedek-parca-formu", "bayi-kalip-formu", "musteri-tahsilat-hesap-satir"];
  const DEGISEN = "musteri-tahsilat-hesap";
  const satir = (ekran, tema) => rapor.find(x => x.ad === `${ekran}-${tema}.png`);
  it("AC-30: 0063 raporundaki mevcut ekran kayıtları 'ayni' ve iki temada 0 piksel; tek bilinçli değişiklik musteri-tahsilat-hesap (onaylı)", () => {
    const mevcut = kayitlar.filter(k => !YENI.includes(k.ekran));
    expect(mevcut.length).toBeGreaterThan(20);
    for (const k of mevcut) {
      if (k.ekran === DEGISEN) { onayliYaDaTabanda(k, "R13"); continue; }
      expect(k.beklenen, `${k.dosya} ${k.ekran}`).toBe("ayni");
      for (const t of ["aydinlik", "karanlik"]) expect(satir(k.ekran, t)?.piksel, `${k.ekran}-${t}`).toBe(0);
    }
    expect(rapor.filter(x => (x.piksel ?? 0) > 0).map(x => x.ad).sort()).toEqual([`${DEGISEN}-aydinlik.png`, `${DEGISEN}-karanlik.png`]);
  });
  it("AC-31: yeni ekranların kaydı (dosyasına, onaylı) ve iki temalı JPEG'leri depoda", () => {
    const bekle = { "musteri-formu-ilk-odeme": ["customers/CustomerAddEditForm.jsx", "kasa/TahsilatHesap.jsx"], "bayi-yedek-parca-formu": ["SimpleDealers.jsx", "YedekParcaSatisForm.jsx"],
      "bayi-kalip-formu": ["SimpleDealers.jsx", "PartSaleForm.jsx"], "musteri-tahsilat-hesap-satir": ["customers/CustomerDetailModal.jsx", "kasa/TahsilatHesap.jsx"] };
    for (const [ekran, dosyalar] of Object.entries(bekle)) {
      for (const d of dosyalar) {
        const k = kayitlar.find(x => x.dosya === `src/components/${d}` && x.ekran === ekran);
        expect(k, `${d} → ${ekran}`).toBeTruthy();
        onayliYaDaTabanda(k, "R(1|7|13)");
      }
      for (const t of ["aydinlik", "karanlik"]) {
        expect(satir(ekran, t), `${ekran}-${t} raporda`).toBeTruthy();
        expect(existsSync(`docs/evidence/0063-${ekran}-${t}.jpg`), `${ekran}-${t}.jpg`).toBe(true);
      }
    }
  });
  it("AC-32: tasarim-kaynak ve tahsilat-hesap testleri yerinde; 0063'ün dokunduğu sözlük kullanıcılarının kaydı var (genel koruma bu iki dosyada)", () => {
    expect(existsSync("tests/tasarim-kaynak.test.js")).toBe(true);
    expect(readFileSync("tests/ui/tahsilat-hesap.test.jsx", "utf-8")).toMatch(/Spec 0063: tek seçici/);
    for (const d of ["kasa/TahsilatHesap.jsx", "customers/CustomerAddEditForm.jsx", "customers/CustomerDetailModal.jsx", "SimpleDealers.jsx"]) {
      expect(eslesme[`src/components/${d}`]?.length, d).toBeGreaterThan(0);
    }
  });
});
