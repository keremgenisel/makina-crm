// @vitest-environment jsdom
// Spec 0044: servis, Extra Kalıp ve yedek parça tahsilatının hesabı (arayüz). Gerçek App: müşteri detayındaki "Ödendi"
// anahtarı hesap penceresini açar, seçilen hesap kayda yazılır ve Kasa bakiyesine girer; hesapsız kayıt Kasa'da listelenir
// ve oradan atanır. Formlar izole bileşen olarak (seçici, ön seçim, açıklama satırı).
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";
import { ServiceForm } from "../../src/components/ServiceForm";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { YedekParcaSatisTab } from "../../src/components/stock/YedekParcaSatisTab";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

const buAy = yerelBugun().slice(0, 7);
const HESAPLAR = [
  { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 50000, acilisTarihi: `${buAy}-01`, kapali: false },
  { id: 52, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false },
  { id: 53, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: `${buAy}-01`, kapali: false },
];
const SERVIS = { id: 800, customerId: 700, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", servisUcreti: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", date: `${buAy}-05`, odendi: false, yontem: "Nakit", islemFirma: "Altuntaş Makina", degisenParcalar: [] };
const veri = (o = {}) => ({
  customers: [{ id: 700, name: "TAHSİLATLI FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY", faturali: "Faturalı Yurtiçi" }],
  dealers: [{ id: 20, name: "Bayi A", anlasmaliServisMi: true }],
  parts: [{ id: 5, ad: "Rulman" }],
  services: [SERVIS],
  partSales: [{ id: 810, customerId: 700, tur: "Kalıp", ad: "K-1", ucret: 2000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: `${buAy}-06`, odendi: false }],
  yedekParcaSatislar: [{ id: 820, aliciTipi: "musteri", musteriId: 700, partId: 5, miktar: 2, birimFiyat: 250, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: `${buAy}-07`, odendi: false, tahsisler: [{ miktar: 2, customerId: 700, serialNo: "", makinaSerbest: "", tarih: `${buAy}-07` }] }],
  // Son tahsilat Merkez Kasa'ya girdi: ön seçim oradan gelir (Q8).
  payments: [{ id: 900, customerId: 700, tutar: 10, currency: "TRY", tarih: `${buAy}-03`, yontem: "Havale", hesapId: 53 }],
  kasaHesaplari: HESAPLAR, hesapHareketleri: [],
  giderTurleri: [], tedarikciler: [], giderler: [], giderTanimlari: [], standartGiderler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1, ...o,
});

const baslat = async ({ sunucu = null, yuklenen = veri() } = {}) => {
  const kayitlar = [];
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(yuklenen)),
    save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
    getVersion: vi.fn(async () => 1),
  };
  if (sunucu) {
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800)); // App yüklemeden sonraki 700 ms kaydı bastırır
  return { kayitlar, son: () => kayitlar[kayitlar.length - 1] };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const detayAc = async () => {
  menu("Müşteriler");
  await waitFor(() => expect(screen.getByText("TAHSİLATLI FİRMA")).toBeTruthy());
  fireEvent.click(screen.getByText("TAHSİLATLI FİRMA"));
  await waitFor(() => expect(screen.getAllByText("Ödenmedi · işaretle: Ödendi").length).toBe(3));
};
// Zaman çizelgesinde sıra tarihe göre eskiden yeniye: servis (05), kalıp (06), yedek parça (07).
const anahtar = (i) => screen.getAllByText(/Ödenmedi · işaretle: Ödendi|^Ödendi$/).filter(e => e.tagName === "BUTTON")[i];
const pencere = () => screen.queryByTestId("tahsilat-hesap-penceresi");
const secenekler = (el) => [...el.querySelectorAll("option")].map(o => o.textContent);
const bekleKayit = (kayitlar, f) => waitFor(() => expect(kayitlar.some(f)).toBe(true), { timeout: 3000 });
const kasaBakiye = async (ad) => {
  menu("Kasa");
  await waitFor(() => expect(screen.getAllByTestId("hesap-satiri").length).toBeGreaterThan(0));
  return screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad)).textContent;
};

describe("Spec 0044: müşteri detayında Ödendi anahtarı hesap sorar", () => {
  it("AC-1 / AC-5 / AC-6 / AC-4: servis; yalnız TL açık hesaplar, son tahsilatın hesabı ön seçili, seçim kaydedilir ve bakiyeye girer", async () => {
    const { kayitlar } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    const p = pencere();
    expect(p.textContent).toMatch(/₺1\.200/);
    const sec = within(p).getByLabelText("Tahsilat hesabı");
    expect(secenekler(sec)).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)", "Merkez Kasa (Kasa)"]);
    expect(sec.value).toBe("53");
    fireEvent.change(sec, { target: { value: "51" } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId === 51));
    expect(await kasaBakiye("Ziraat")).toMatch(/51\.200/);
  });
  it("AC-2 / AC-3: Extra Kalıp ve yedek parça anahtarı da hesap sorar ve seçimi yazar", async () => {
    const { kayitlar } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(1));
    expect(pencere().textContent).toMatch(/₺2\.400/);
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.partSales?.some(s => s.id === 810 && s.odendi === true && s.hesapId === 53));
    fireEvent.click(anahtar(2));
    expect(pencere().textContent).toMatch(/₺600/);
    fireEvent.change(within(pencere()).getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    await bekleKayit(kayitlar, k => k.yedekParcaSatislar?.some(s => s.id === 820 && s.odendi === true && s.hesapId === 51));
  });
  it("AC-7 / AC-8 / AC-24: hesapsız kaydedilen tahsilat Kasa'da ayrı satırda listelenir; hesap atanınca bakiye artar, liste boşalır", async () => {
    const { kayitlar } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    fireEvent.click(screen.getByText("Hesapsız kaydet"));
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId == null));
    menu("Kasa");
    await waitFor(() => expect(screen.getByTestId("hesapsiz-tahsilat-satiri")).toBeTruthy());
    expect(screen.getByTestId("hesapsiz-odeme-satiri").textContent).toBe("Hesabı belirtilmemiş ödemeler: 0");
    expect(screen.getByTestId("hesapsiz-tahsilat-satiri").textContent).toMatch(/Hesabı belirtilmemiş tahsilatlar: 1/);
    fireEvent.click(screen.getByText("Listeyi göster"));
    const satir = screen.getByTestId("hesapsiz-tahsilat");
    expect(satir.textContent).toMatch(/Servis tahsilatı.*TAHSİLATLI FİRMA · Nakit.*₺1\.200/);
    fireEvent.change(within(satir).getByLabelText("Hesap ata: TAHSİLATLI FİRMA"), { target: { value: "51" } });
    await waitFor(() => expect(screen.getByTestId("hesapsiz-tahsilat-satiri").textContent).toMatch(/tahsilatlar: 0/));
    expect(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Ziraat")).textContent).toMatch(/51\.200/);
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.hesapId === 51));
  });
  it("AC-13: geri alma pencere açmaz ve hesabı korur; yeniden işaretlenince aynı hesap ön seçili", async () => {
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [{ ...SERVIS, odendi: true, tahsilatTarihi: `${buAy}-06`, hesapId: 51 }] }) });
    await detayAc().catch(() => {});
    const odendi = screen.getAllByText("Ödendi").find(e => e.tagName === "BUTTON");
    fireEvent.click(odendi);
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === false && s.hesapId === 51));
    await waitFor(() => expect(screen.getAllByText("Ödenmedi · işaretle: Ödendi").length).toBe(3));
    fireEvent.click(anahtar(0));
    expect(within(pencere()).getByLabelText("Tahsilat hesabı").value).toBe("51");
  });
  it("AC-22: bedeli anlaşmalı firmaya ait servis pencere açmadan işaretlenir ve hesapsız listeye girmez", async () => {
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [{ ...SERVIS, islemFirma: "Bayi A" }] }) });
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true));
    menu("Kasa");
    await waitFor(() => expect(screen.getByTestId("hesapsiz-tahsilat-satiri").textContent).toMatch(/tahsilatlar: 0/));
  });
  it("AC-20: yayın perdesi inikken hesap sorulmaz, kayıt hesapsız kalır", async () => {
    perde.indi = true;
    const { kayitlar } = await baslat();
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId == null));
  });
  it("AC-28: kasa yetkisi (Giderler + Finans) olmayan kullanıcıya hesap sorulmaz", async () => {
    const { kayitlar } = await baslat({ sunucu: { tabs: ["dashboard", "customers", "gider"] } });
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId == null));
  });
  it("AC-27: parça bedeli farklı para birimindeki eski servis hesap sorulmadan işaretlenir", async () => {
    const eski = { ...SERVIS, parcaUcreti: 100, parcaUcretiAltuntastan: 100, parcaUcretsizMi: false, parcaCurrency: "USD" };
    const { kayitlar } = await baslat({ yuklenen: veri({ services: [eski] }) });
    await detayAc();
    fireEvent.click(anahtar(0));
    expect(pencere()).toBeNull();
    await bekleKayit(kayitlar, k => k.services?.some(s => s.id === 800 && s.odendi === true && s.hesapId == null));
  });
});

describe("Spec 0044: Kasa ekranı", () => {
  it("AC-16 / AC-14 / AC-15: bilgi notu yeni metin; tahsilat satırı türü ve firmasıyla; tahsilatı olan hesap silinemez", async () => {
    await baslat({ yuklenen: veri({ payments: [], services: [{ ...SERVIS, odendi: true, tahsilatTarihi: `${buAy}-06`, hesapId: 53 }] }) });
    menu("Kasa");
    await waitFor(() => expect(screen.getByTestId("hesapsiz-notu")).toBeTruthy());
    expect(screen.getByTestId("hesapsiz-notu").textContent).toMatch(/^Bakiye, hesabı belirtilmiş hareket ve tahsilatları sayar\. Hesabı belirtilmemiş kayıtlar aşağıda ayrıca listelenir\./);
    const kasa = screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Merkez Kasa"));
    expect(kasa.textContent).toMatch(/1 hareket/);
    expect(within(kasa).queryByTitle("Sil")).toBeNull();
    fireEvent.click(kasa);
    const h = screen.getAllByTestId("hareket-satiri")[0];
    expect(h.textContent).toMatch(/Servis tahsilatı/);
    expect(h.textContent).toMatch(/TAHSİLATLI FİRMA · Nakit/);
  });
});

describe("Spec 0044: formlarda hesap seçici", () => {
  const H = [HESAPLAR[0], HESAPLAR[2]];
  const varsayilan = (pb) => (pb === "TRY" ? 53 : null);
  it("AC-1 / AC-6: servis formunda Ödendi işaretlenince seçici gelir, son hesap ön seçilir; kayda yazılır", () => {
    let son;
    const Harness = () => {
      const [form, setForm] = useState({ customerId: 700, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", degisenParcalar: [], currency: "TRY", date: "2026-09-10", faturaTipi: "Faturalı Yurtiçi", servisUcreti: 1000, odendi: false, islemFirma: "Altuntaş Makina" });
      son = form;
      return <ServiceForm title="Servis" form={form} setForm={setForm} customers={[{ id: 700, name: "X" }]} onSave={() => {}} onCancel={() => {}} kasaHesaplari={H} hesapVarsayilan={varsayilan} />;
    };
    render(<Harness />);
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
    fireEvent.click(screen.getByText(/Ücret henüz tahsil edilmedi/));
    expect(son.hesapId).toBe(53);
    const sec = screen.getByLabelText("Tahsilat hesabı");
    expect(sec.value).toBe("53");
    fireEvent.change(sec, { target: { value: "" } });
    expect(son.hesapId).toBe(null); // AC-7: boş bırakılabilir
  });
  it("triyaj: para birimi değişince uyumsuz kalan mevcut hesap formda temizlenir; yeniden işaretlemede uyumlu varsayılan gelir", () => {
    let son;
    const USD = { id: 52, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0 };
    const Harness = () => {
      const [form, setForm] = useState({ customerId: 700, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", degisenParcalar: [], currency: "USD", date: "2026-09-10", faturaTipi: "Faturalı Yurtdışı", servisUcreti: 1000, odendi: false, hesapId: 51, islemFirma: "Altuntaş Makina" });
      son = form;
      return <ServiceForm title="Servis" form={form} setForm={setForm} customers={[{ id: 700, name: "X" }]} onSave={() => {}} onCancel={() => {}} kasaHesaplari={[...H, USD]} hesapVarsayilan={(pb) => (pb === "USD" ? 52 : 53)} />;
    };
    render(<Harness />);
    fireEvent.click(screen.getByText(/Ücret henüz tahsil edilmedi/));
    expect(son.hesapId).toBe(52); // TL hesap (51) USD servise ön seçili kalmaz
    expect(screen.getByLabelText("Tahsilat hesabı").value).toBe("52");
    fireEvent.change(screen.getByDisplayValue(/Amerikan Doları|USD/), { target: { value: "TRY" } });
    expect(son.hesapId).toBe(null); // para birimi değişti: uyumsuz kalan hesap temizlendi
    expect(screen.getByLabelText("Tahsilat hesabı").value).toBe("");
  });
  it("AC-22: formda bedeli anlaşmalı firmaya ait serviste seçici yerine açıklama satırı", () => {
    const Harness = () => {
      const [form, setForm] = useState({ customerId: 700, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", degisenParcalar: [], currency: "TRY", date: "2026-09-10", faturaTipi: "Faturalı Yurtiçi", servisUcreti: 1000, odendi: true, islemFirma: "Bayi A" });
      return <ServiceForm title="Servis" form={form} setForm={setForm} customers={[{ id: 700, name: "X" }]} dealers={[{ id: 20, name: "Bayi A", anlasmaliServisMi: true }]} onSave={() => {}} onCancel={() => {}} kasaHesaplari={H} hesapVarsayilan={varsayilan} />;
    };
    render(<Harness />);
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
    expect(screen.getByTestId("tahsilat-hesap-neden").textContent).toBe("Bu bedel anlaşmalı firmaya ait, kasaya girmez.");
  });
  it("AC-2 / AC-3 / AC-28: kalıp ve yedek parça formunda seçici; kasa yetkisi yoksa (kasaHesaplari yok) çizilmez", () => {
    const { unmount } = render(<PartSaleForm title="Kalıp" form={{ customerId: 700, kaliplar: [{ ad: "K", fiyat: 100 }], currency: "TRY", odendi: true, hesapId: 51, faturaTipi: "Faturalı Yurtiçi" }} setForm={() => {}} customers={[{ id: 700, name: "X" }]} onSave={() => {}} onCancel={() => {}} kasaHesaplari={H} />);
    expect(screen.getByLabelText("Tahsilat hesabı").value).toBe("51");
    unmount();
    const r2 = render(<YedekParcaSatisForm title="YP" form={{ aliciTipi: "musteri", musteriId: 700, currency: "TRY", odendi: true, satirlar: [{ partId: "5", miktar: "2", birimFiyat: "250" }] }} setForm={() => {}} customers={[{ id: 700, name: "X" }]} parts={[{ id: 5, ad: "Rulman" }]} onSave={() => {}} onCancel={() => {}} kasaHesaplari={H} />);
    expect(screen.getByLabelText("Tahsilat hesabı")).toBeTruthy();
    r2.unmount();
    render(<YedekParcaSatisForm title="YP" form={{ aliciTipi: "musteri", musteriId: 700, currency: "TRY", odendi: true, satirlar: [{ partId: "5", miktar: "2", birimFiyat: "250" }] }} setForm={() => {}} customers={[{ id: 700, name: "X" }]} parts={[{ id: 5, ad: "Rulman" }]} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
  });
  it("AC-3: Stok › Yedek Parça listesindeki Ödendi anahtarı hesap penceresini açar ve seçimi yazar", () => {
    let son;
    const Harness = () => {
      const [satislar, setSatislar] = useState([{ id: 820, aliciTipi: "bayi", dealerId: 20, partId: 5, miktar: 2, birimFiyat: 250, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-07", odendi: false, tahsisler: [] }]);
      son = satislar;
      return <YedekParcaSatisTab yedekParcaSatislar={satislar} setYedekParcaSatislar={setSatislar} dealers={[{ id: 20, name: "Bayi A" }]} parts={[{ id: 5, ad: "Rulman" }]} customers={[]}
        partStock={[]} setPartStock={() => {}} partStockLog={[]} setPartStockLog={() => {}} showToast={() => {}} canDoStock={() => true}
        kasaHesaplari={H} tahsilatHesapVarsayilan={varsayilan} />;
    };
    render(<Harness />);
    fireEvent.click(screen.getByText(/Ödenmedi/));
    const p = screen.getByTestId("tahsilat-hesap-penceresi");
    expect(within(p).getByLabelText("Tahsilat hesabı").value).toBe("53");
    fireEvent.change(within(p).getByLabelText("Tahsilat hesabı"), { target: { value: "51" } });
    fireEvent.click(screen.getByText("Ödendi olarak kaydet"));
    expect(son[0]).toMatchObject({ odendi: true, hesapId: 51 });
  });
});
