// @vitest-environment jsdom
// Spec 0108: üretim formundan çıkan kalıp yeniden bekleyen olur. Gerçek UretimFormu (durumlu kap; çöpten geri alma ve kalıcı
// silme Çöp Kutusu'nun yaptığı gibi yalnız formun kendisine yazar, C5), gerçek Dashboard, SettingsTrash ve Customers.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, fireEvent, screen, cleanup, within, act } from "@testing-library/react";
import { UretimFormu } from "../../src/components/stock/UretimFormu";
import { Dashboard } from "../../src/components/Dashboard";

afterEach(() => { cleanup(); delete window.crmLocks; });

// Makinanın iki kalıbı ve bir Extra Kalıp satışı; tarihler bugünden önce, yeni formun başlangıcı en eskiye çekilir.
const MUSTERI = { id: 610, name: "Bağ AŞ", model: "AK100", installDate: "2026-03-01",
  kaliplar: [{ ad: "Y55", olcu: "55x125", uretimFormGonder: true }, { ad: "K40", olcu: "40x40" }] };
const EXTRA = { id: 710, customerId: 610, tur: "Kalıp", ad: "Y45", olcu: "45x110", tarih: "2026-04-10", uretimFormGonder: true };

let dis; // testten durumu okumak ve Çöp Kutusu işlemlerini taklit etmek için
let toastlar = [];
function Kap({ customers0, partSales0, formlar0 = [] }) {
  const [customers, setCustomers] = useState(customers0);
  const [partSales, setPartSales] = useState(partSales0);
  const [uretimFormlari, setUretimFormlari] = useState(formlar0);
  dis = { customers, partSales, uretimFormlari, setUretimFormlari };
  return <UretimFormu uretimFormlari={uretimFormlari.filter(f => !f.deletedAt)} setUretimFormlari={setUretimFormlari}
    customers={customers.filter(c => !c.deletedAt)} partSales={partSales.filter(p => !p.deletedAt)} kalipDefs={[]}
    setCustomers={setCustomers} setPartSales={setPartSales} showToast={(m) => toastlar.push(m)} />;
}
const kur = (ek = {}) => { toastlar = []; render(<Kap customers0={[MUSTERI]} partSales0={[EXTRA]} {...ek} />); };
const yeniForm = () => fireEvent.click(screen.getByText("Yeni Form"));
const getir = () => fireEvent.click(screen.getByText("Bekleyen Kalıpları Getir"));
const kaydet = () => fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.trim() === "Kaydet"));
const geri = () => fireEvent.click(screen.getByText("← Geri"));
const sonToast = () => toastlar[toastlar.length - 1];
const satirSil = (kalipAdi) => {
  const tr = [...document.querySelectorAll("tbody tr")].find(t => t.textContent.includes(kalipAdi) || [...t.querySelectorAll("input")].some(i => i.value === kalipAdi));
  const dugmeler = within(tr).getAllByRole("button");
  fireEvent.click(dugmeler[dugmeler.length - 1]);
};
const listeSatiri = () => document.querySelector("tbody tr");
const formAc = () => fireEvent.click(within(listeSatiri()).getAllByRole("button")[0]);
const formSilOnayi = () => { const b = within(listeSatiri()).getAllByRole("button"); fireEvent.click(b[b.length - 1]); };
// Formu getirip kaydeder.
const formuKur = () => { yeniForm(); getir(); kaydet(); }; // Kaydet listeye döner

// ── Önkoşul: spec'ten ÖNCEKİ kodla (3169f71) yazıldı ve yeşil görüldü ─────────────────────────────────────────────────────
describe("Spec 0108 önkoşul (eski kodla yazıldı ve yeşil görüldü)", () => {
  it("AC-1 / AC-30: işaretli, bağsız kalıplar getirilir; kaydedince damga bu formu gösterir", () => {
    kur();
    yeniForm(); getir();
    expect(sonToast()).toBe("2 kalıp eklendi.");
    kaydet();
    const id = dis.uretimFormlari[0].id;
    expect(dis.customers[0].kaliplar[0].uretimFormId).toBe(id);
    expect(dis.partSales[0].uretimFormId).toBe(id);
    expect(dis.customers[0].kaliplar[1].uretimFormId).toBeUndefined();
  });
  it("AC-2 / AC-21: satırı canlı formda duran kalıp ne getirilir ne sayılır", () => {
    kur(); formuKur();
    yeniForm(); getir();
    expect(sonToast()).toBe("Bu tarih aralığında bekleyen yeni kalıp yok.");
    cleanup();
    render(<Dashboard dealers={[]} stock={[]} payments={[]} rates={null} teklifler={[]} customers={dis.customers} services={[]} partSales={dis.partSales} yedekParcaSatislar={[]} uretimFormlari={dis.uretimFormlari} />);
    expect(sayac()).toBe("0");
  });
});

// ── Dört kopma hâli ───────────────────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0108: bağ kopunca kalıp yeniden bekleyen olur (R8–R12)", () => {
  it("AC-13 / AC-19: satırı silinip form kaydedilince kalıp yeniden getirilir; yeni formda damga yeni formu gösterir", () => {
    kur(); formuKur();
    const eski = dis.uretimFormlari[0].id;
    formAc(); satirSil("Y55"); kaydet();
    yeniForm(); getir();
    expect(sonToast()).toBe("1 kalıp eklendi.");
    kaydet();
    const yeni = dis.uretimFormlari.find(f => f.id !== eski).id;
    expect(dis.customers[0].kaliplar[0].uretimFormId).toBe(yeni);
  });
  it("AC-39: kaydedilmeden silinen satırın kalıbı gelmez; hiç kaydedilmemiş yeni formda hemen geri gelir", () => {
    kur(); formuKur();
    formAc(); satirSil("Y55"); getir();
    expect(sonToast()).toBe("Bu tarih aralığında bekleyen yeni kalıp yok.");
    geri(); cleanup();
    kur(); yeniForm(); getir(); satirSil("Y55"); getir();
    expect(sonToast()).toBe("1 kalıp eklendi.");
  });
  it("AC-14 / AC-15 / AC-16 / AC-17: çöpe atılan formun kalıpları gelir; geri alınca gelmez, damga değişmez; kalıcı silinince gelir", () => {
    kur(); formuKur();
    const id = dis.uretimFormlari[0].id;
    formSilOnayi(); fireEvent.click(screen.getByText("Sil"));
    yeniForm(); getir();
    expect(sonToast()).toBe("2 kalıp eklendi.");
    geri();
    act(() => dis.setUretimFormlari(p => p.map(f => f.id === id ? { ...f, deletedAt: undefined } : f))); // geri alma
    yeniForm(); getir();
    expect(sonToast()).toBe("Bu tarih aralığında bekleyen yeni kalıp yok.");
    expect(dis.customers[0].kaliplar[0].uretimFormId).toBe(id);
    expect(dis.partSales[0].uretimFormId).toBe(id);
    geri();
    act(() => dis.setUretimFormlari(p => p.filter(f => f.id !== id))); // kalıcı silme
    yeniForm(); getir();
    expect(sonToast()).toBe("2 kalıp eklendi.");
  });
  it("AC-18: dönemi sonlandırılmış formun kalıpları bekleyen sayılmaz", () => {
    kur(); formuKur();
    formAc(); fireEvent.click(screen.getByText("Dönemi Sonlandır"));
    yeniForm(); getir();
    expect(sonToast()).toBe("Bu tarih aralığında bekleyen yeni kalıp yok.");
  });
});

// ── Silme onayı ───────────────────────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0108: silme onayı dönecek kalıp sayısını yazar (R13)", () => {
  it("AC-24: iki kalıplı form için onay 2 der ve bugünkü cümle durur", () => {
    kur(); formuKur();
    formSilOnayi();
    const metin = screen.getByTestId("uretim-sil-donus").textContent;
    expect(metin).toContain("2 kalıp");
    expect(screen.getByText(/Bu üretim formu çöp kutusuna taşınacak/)).toBeTruthy();
  });
  it("AC-25: dönecek kalıp yoksa cümle yazılmaz", () => {
    kur({ formlar0: [{ id: 50, baslangicTarihi: "2026-01-01", bitisTarihi: "2026-01-31", satirlar: [{ id: 1, kaynakTip: null, kalipAdi: "Elle" }] }] });
    formSilOnayi();
    expect(screen.queryByTestId("uretim-sil-donus")).toBeNull();
  });
});

// ── Sayaç ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const sayac = () => screen.getByText("Üretimde Bekleyen Kalıplar").nextElementSibling.textContent;
const ana = (customers, partSales, uretimFormlari) => <Dashboard dealers={[]} stock={[]} payments={[]} rates={null} teklifler={[]}
  customers={customers} services={[]} partSales={partSales} yedekParcaSatislar={[]} uretimFormlari={uretimFormlari} />;
const DAMGALI = [{ ...MUSTERI, kaliplar: [{ ...MUSTERI.kaliplar[0], uretimFormId: 90 }] }];
const PS_DAMGALI = [{ ...EXTRA, uretimFormId: 90 }];
const FORM_90 = { id: 90, satirlar: [{ kaynakTip: "musteri", kaynakId: 610, kalipIdx: 0 }, { kaynakTip: "extra_kalip", kaynakId: 710 }] };

describe("Spec 0108: Anasayfa sayacı (R9, R19)", () => {
  it("AC-20: bağı kopmuş kalıplar sayılır", () => {
    render(ana(DAMGALI, PS_DAMGALI, []));
    expect(sayac()).toBe("2");
  });
  it("AC-37: form çöpe atılınca (aynı müşteri dizisiyle) sayaç yeniden hesaplanır", () => {
    const u = render(ana(DAMGALI, PS_DAMGALI, [FORM_90]));
    expect(sayac()).toBe("0");
    u.rerender(ana(DAMGALI, PS_DAMGALI, [{ ...FORM_90, deletedAt: "2026-10-25" }]));
    expect(sayac()).toBe("2");
  });
  it("AC-40: bağsız, işaretli ve elle 'hazır' yazılmış kalıp sayılmaz", () => {
    render(ana([{ ...MUSTERI, kaliplar: [{ ...MUSTERI.kaliplar[0], kalipDurumu: "hazir" }] }], [{ ...EXTRA, kalipDurumu: "teslim" }], []));
    expect(sayac()).toBe("0");
  });
});

// ── Çöp Kutusu etiketi ────────────────────────────────────────────────────────────────────────────────────────────────────
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
const cop = (rawUretimFormlari) => {
  const bos = [], noop = () => {};
  render(<SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
    rawKalipDefs={bos} rawParts={bos} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={rawUretimFormlari}
    rawGorusmeler={bos} rawDosyalar={bos} setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop}
    setStock={noop} setNotes={noop} setKalipDefs={noop} setParts={noop} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop}
    setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop} appSettings={{}} showToast={noop} />);
};
const SILINMIS = "2026-10-20";
describe("Spec 0108: Çöp Kutusu'ndaki üretim formu satırı (R14)", () => {
  it("AC-26 / AC-27 / AC-44: tarih aralığı ve not; form listesiyle aynı biçim", () => {
    cop([{ id: 1, baslangicTarihi: "2026-10-01", bitisTarihi: "2026-10-31", not: "Ekim partisi", satirlar: [], deletedAt: SILINMIS },
      { id: 2, baslangicTarihi: "2026-09-15", bitisTarihi: "2026-09-15", satirlar: [], deletedAt: SILINMIS }]);
    expect(screen.getByText("01.10.2026 – 31.10.2026 · Ekim partisi")).toBeTruthy();
    expect(screen.getByText("15.09.2026")).toBeTruthy();
  });
  it("AC-28: tarih aralığı yoksa eski tek alan, o da yoksa '—'; çökmez", () => {
    cop([{ id: 3, tarih: "2025-05-05", satirlar: [], deletedAt: SILINMIS }, { id: 4, not: "Notlu", satirlar: [], deletedAt: SILINMIS }]);
    expect(screen.getByText("05.05.2025")).toBeTruthy();
    expect(screen.getByText("— · Notlu")).toBeTruthy();
  });
});

// ── İki ekran aynı şeyi söyler ────────────────────────────────────────────────────────────────────────────────────────────
import { Customers } from "../../src/components/Customers";
describe("Spec 0108: müşteri pili ve bekleyen listesi aynı haritayı okur (R15, AC-29)", () => {
  const COPTE = [{ ...FORM_90, deletedAt: "2026-10-20" }];
  const pil = (customers, partSales) => {
    render(<Customers customers={customers} stock={[]} partStockLog={[]} services={[]} partSales={partSales} payments={[]} partStock={[]}
      giderYetki={false} uretimPartileri={[]} rates={{ usd: 41.5, eur: 45.25 }} showToast={() => {}} uretimFormlari={COPTE}
      setCustomers={() => {}} setStock={() => {}} setPartStockLog={() => {}} setServices={() => {}} setPartSales={() => {}} setPayments={() => {}} setPartStock={() => {}} />);
    return [...screen.getByText("Bağ AŞ").closest("tr").querySelectorAll('[data-testid="durum-pili"]')].map(e => e.textContent);
  };
  it("AC-29: işaretsiz damgalı kalıbın formu çöpte: pil 'SİPARİŞİ BEKLİYOR' ve sayaç onu sayar", () => {
    const c = [{ ...MUSTERI, makinaDurumu: "montaj", kaliplar: [{ ad: "Y55", olcu: "55x125", uretimFormId: 90 }] }];
    expect(pil(c, [])).toEqual(["MONTAJ YAPILIYOR", "KALIP SİPARİŞİ BEKLİYOR"]);
    cleanup();
    render(ana(c, [], COPTE));
    expect(sayac()).toBe("1");
  });
  it("AC-29 (U1): işaretli kalıbın formu çöpte: hiç forma girmemiş işaretli kalıp gibi 'SİPARİŞ VERİLDİ' ve sayılır", () => {
    const c = [{ ...MUSTERI, makinaDurumu: "montaj", kaliplar: [{ ad: "Y55", olcu: "55x125", uretimFormGonder: true, uretimFormId: 90 }] }];
    expect(pil(c, [])).toEqual(["MONTAJ YAPILIYOR", "KALIP SİPARİŞ VERİLDİ"]);
    cleanup();
    render(ana(c, [], COPTE));
    expect(sayac()).toBe("1");
  });
});

describe("Spec 0108: sayaç tarihten bağımsız, getirme tarih aralığına bağlı (R16)", () => {
  it("AC-23: tarihi bugünden sonra olan bekleyen kalıp sayılır ama yeni formun aralığına girmez", () => {
    const ileri = [{ ...MUSTERI, installDate: "2099-01-01", kaliplar: [MUSTERI.kaliplar[0]] }];
    render(ana(ileri, [], []));
    expect(sayac()).toBe("1");
    cleanup();
    kur({ customers0: ileri, partSales0: [] });
    yeniForm(); getir();
    expect(sonToast()).toBe("Bu tarih aralığında bekleyen yeni kalıp yok.");
  });
});
