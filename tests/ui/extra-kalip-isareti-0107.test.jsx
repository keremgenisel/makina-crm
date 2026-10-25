// @vitest-environment jsdom
// Spec 0107: Extra Kalıp'ın üretim formu işareti kaybolmaz. Gerçek Customers (düzenek 0106'dan kopyalandı, o dosyaya
// dokunulmaz), gerçek UretimFormu ve gerçek Dashboard. Güncelleyiciler hemen çalışır.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { UretimFormu } from "../../src/components/stock/UretimFormu";
import { Dashboard } from "../../src/components/Dashboard";
import { ALTUNMAK_MODELS } from "../../src/lib/constants";

afterEach(() => { cleanup(); delete window.crmLocks; });

const M0 = ALTUNMAK_MODELS[0].model;
function kur({ customers = [], partSales = [], uretimFormlari, serverPermissions, showToast = vi.fn() } = {}) {
  const durum = { customers, stock: [], partStockLog: [], services: [], partSales, payments: [], partStock: [] };
  const uygula = (k, u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; };
  const setter = (k) => vi.fn((u) => uygula(k, u));
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
  };
  const ek = {};
  if (uretimFormlari !== undefined) ek.uretimFormlari = uretimFormlari;
  if (serverPermissions !== undefined) ek.serverPermissions = serverPermissions;
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={[]} partStockLog={[]}
      services={[]} partSales={durum.partSales.filter(p => !p.deletedAt)} payments={[]} partStock={[]} giderYetki={false}
      uretimPartileri={[]} rates={{ usd: 41.5, eur: 45.25 }} showToast={showToast}
      kalipDefs={["Y45", "Y55", "K40"].map((ad, i) => ({ id: i + 1, ad }))} {...ek} {...setters} />
  );
  const u = render(ciz());
  return { durum, setters, rerender: () => u.rerender(ciz()) };
}
const bekle = () => new Promise(r => setTimeout(r, 0));
const satir = (ad) => screen.getByText(ad).closest("tr");
const detayAc = (ad) => fireEvent.click(screen.getAllByText(ad)[0]);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
const kutu = () => screen.getByRole("checkbox", { name: "Üretim formuna gönder" });

// Makinanın kendi iki kalıbı arasında (konum 1) Extra Kalıp aynası duruyor (Karar 10).
const MUSTERI = { id: 610, name: "İşaret AŞ", model: M0, serialNo: "S-610", installDate: "2026-03-01", warrantyEnd: "2028-03-01",
  kaliplar: [{ ad: "Y55", olcu: "55x125" }, { ad: "Y45", olcu: "45x110", partSaleId: 710 }, { ad: "K40", olcu: "40x40" }] };
const EXTRA = { id: 710, customerId: 610, tur: "Kalıp", ad: "Y45", olcu: "45x110", ucret: 1000, currency: "TRY", tarih: "2026-04-10", odendi: true, faturaTipi: "Faturasız Yurtiçi" };

// Kalıp Verildi satırının başlığına tıklar (tek kalıplı satışta başlık düzenleme formunu açar).
const extraDuzenleAc = () => {
  detayAc("İşaret AŞ");
  const baslik = screen.getAllByTitle("Düzenlemek için tıklayın").find(e => /Kalıp/.test(e.textContent));
  fireEvent.click(baslik);
};

// ── Önkoşul: bu blok spec'ten ÖNCEKİ kodla (1da3f53) yazıldı ve yeşil görüldü ─────────────────────────────────────────────
describe("Spec 0107 önkoşul (eski kodla yazıldı ve yeşil görüldü)", () => {
  it("AC-13: ayna olmayan müşteri kalıbında kutu çizilir, işaretlenir ve kaydedilir", async () => {
    const { durum } = kur({ customers: [MUSTERI], partSales: [EXTRA] });
    duzenle("İşaret AŞ");
    const kutular = screen.getAllByRole("checkbox", { name: "Üretim formuna gönder" });
    fireEvent.click(kutular[0]);
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.customers[0].kaliplar[0].uretimFormGonder).toBe(true);
  });
  it("AC-14: Evrak'tan gelen makinayla verilen kalıp (partSaleId yok) kutusunu korur", () => {
    kur({ customers: [{ ...MUSTERI, kaliplar: [{ ad: "Y55", olcu: "55x125", uretimFormGonder: true }] }] });
    duzenle("İşaret AŞ");
    expect(kutu().checked).toBe(true);
  });
  // Spec 0110 ile (R1, R13, R17, R18): işaretsiz Extra Kalıp teslim türetir ve detaydaki ibare kalktı; "aynı" iddiası konusuz.
  it("AC-28: ayna satırın 0106 ibaresi müşteri formunda; detayda yok (spec 0110 ile)", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA] });
    duzenle("İşaret AŞ");
    expect(screen.getByTestId("ayna-kalip-durumu").textContent).toBe("Teslim edildi · Extra Kalıp satışından");
    fireEvent.click(screen.getByText("İptal"));
    detayAc("İşaret AŞ");
    expect(screen.queryByTestId("ayna-kalip-durumu")).toBeNull();
  });
  it("AC-26: işaretli ayna satır kalıp pilini değiştirmez (küme aynayı atlar)", () => {
    kur({ customers: [{ ...MUSTERI, makinaDurumu: "teslim", kaliplar: [{ ...MUSTERI.kaliplar[1], uretimFormGonder: true }] }], partSales: [EXTRA] });
    const piller = [...satir("İşaret AŞ").querySelectorAll('[data-testid="durum-pili"]')].map(e => e.textContent);
    expect(piller).toEqual([]); // spec 0110 ile (R1, R11): küme yalnız işaretsiz Extra Kalıp, teslim türetir, pil yok
  });
});

// ── Düzenleme kolu ────────────────────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0107: düzenleme kolu işareti korur (R1–R4)", () => {
  it("AC-1 / AC-9: işaretli kayıt, zaman çizelgesinden açılan düzenleme formunda işaretli gelir", () => {
    kur({ customers: [MUSTERI], partSales: [{ ...EXTRA, uretimFormGonder: true }] });
    extraDuzenleAc();
    expect(kutu().checked).toBe(true);
  });
  it("AC-2: işaretsiz kayıt işaretsiz gelir", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA] });
    extraDuzenleAc();
    expect(kutu().checked).toBe(false);
  });
  it("AC-9: aynı partideki (batchId) satışta kalıbın kendi adından açılan form da kayıttaki değerle gelir", () => {
    const IKINCI = { ...EXTRA, id: 711, ad: "K40", olcu: "40x40", uretimFormGonder: true, batchId: 5 };
    kur({ customers: [MUSTERI], partSales: [{ ...EXTRA, batchId: 5 }, IKINCI] });
    detayAc("İşaret AŞ");
    const ad = screen.getAllByTitle("Düzenlemek için tıklayın").filter(e => /^K40/.test(e.textContent));
    expect(ad).toHaveLength(1);
    fireEvent.click(ad[0]);
    expect(kutu().checked).toBe(true);
  });
  it.each([
    ["işaretli", { uretimFormGonder: true, uretimFormId: 900, kalipDurumu: "uretimde" }],
    ["işaretsiz", { uretimFormId: 900, kalipDurumu: "hazir" }],
  ])("AC-3 / AC-34 / AC-7 / AC-8: %s kayıt dokunulmadan kaydedilince üç alan aynı kalır", async (_ad, alanlar) => {
    const { durum } = kur({ customers: [MUSTERI], partSales: [{ ...EXTRA, ...alanlar }] });
    extraDuzenleAc();
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    const ps = durum.partSales[0];
    expect(!!ps.uretimFormGonder).toBe(!!alanlar.uretimFormGonder);
    expect(ps.uretimFormId).toBe(900);
    expect(ps.kalipDurumu).toBe(alanlar.kalipDurumu);
  });
  it("AC-4: işaretlenip kaydedilince kayıt işaretli olur", async () => {
    const { durum } = kur({ customers: [MUSTERI], partSales: [EXTRA] });
    extraDuzenleAc();
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.partSales[0].uretimFormGonder).toBe(true);
  });
  it("AC-5: işaret kaldırılıp kaydedilince kayıt işaretsiz olur", async () => {
    const { durum } = kur({ customers: [MUSTERI], partSales: [{ ...EXTRA, uretimFormGonder: true }] });
    extraDuzenleAc();
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.partSales[0].uretimFormGonder).toBe(false);
  });
  it("AC-6: yalnız fiyat değiştirilince işaret değişmez", async () => {
    const { durum } = kur({ customers: [MUSTERI], partSales: [{ ...EXTRA, uretimFormGonder: true }] });
    extraDuzenleAc();
    const fiyat = screen.getAllByRole("textbox").find(i => i.value === "1.000");
    fireEvent.change(fiyat, { target: { value: "1.250" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.partSales[0].uretimFormGonder).toBe(true);
    expect(Number(durum.partSales[0].ucret)).toBe(1250);
  });
});

// ── Kopya satır ───────────────────────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0107: ayna satırda kutu yok, salt okunur ibare (R5–R7)", () => {
  const formAc = (partSales) => { const r = kur({ customers: [MUSTERI], partSales }); duzenle("İşaret AŞ"); return r; };
  it("AC-11: ayna satırda kutu çizilmez; ayna olmayan iki satırda çizilir", () => {
    formAc([EXTRA]);
    expect(screen.getAllByRole("checkbox", { name: "Üretim formuna gönder" })).toHaveLength(2);
    expect(screen.getAllByTestId("ayna-uretim-formu")).toHaveLength(1);
  });
  it.each([
    ["yalnız işaret", { uretimFormGonder: true }, "Üretim formuna gönderildi"],
    ["ikisi boş", {}, "Üretim formuna gönderilmedi"],
  ])("AC-12: bağlı satış %s → ibare", (_a, alanlar, metin) => {
    formAc([{ ...EXTRA, ...alanlar }]);
    expect(screen.getByTestId("ayna-uretim-formu").textContent).toBe(metin);
  });
  it("AC-27: bağ dolu, işaret boş satışta ibare 'gönderildi' der ve 0106 hücresi 'Hazır' ile çelişmez", () => {
    kur({ customers: [MUSTERI], partSales: [{ ...EXTRA, uretimFormId: 900 }],
      uretimFormlari: [{ id: 900, satirlar: [{ kaynakTip: "extra_kalip", kaynakId: 710, tamamlandi: true }] }] });
    duzenle("İşaret AŞ");
    expect(screen.getByTestId("ayna-uretim-formu").textContent).toBe("Üretim formuna gönderildi");
    expect(screen.getByTestId("ayna-kalip-durumu").textContent).toBe("Hazır · Extra Kalıp satışından");
  });
  it("AC-16: bağlı satışı bulunamayan ayna satırda ibare '—', ekran çökmez", () => {
    formAc([{ ...EXTRA, customerId: 999, uretimFormGonder: true }]);
    expect(screen.getByTestId("ayna-uretim-formu").textContent).toBe("—");
  });
  it("AC-15: müşteri formu kaydedilince ayna satırın saklı işareti aynen geri yazılır", async () => {
    const { durum } = kur({ customers: [{ ...MUSTERI, kaliplar: MUSTERI.kaliplar.map((k, i) => i === 1 ? { ...k, uretimFormGonder: true } : k) }], partSales: [EXTRA] });
    duzenle("İşaret AŞ");
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.customers[0].kaliplar[1].uretimFormGonder).toBe(true);
  });
  it("AC-29: ibare müşteri detayının kalıp satırında çizilmez", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA] });
    detayAc("İşaret AŞ");
    expect(screen.queryByTestId("ayna-uretim-formu")).toBeNull();
  });
});

// ── Getirme, sayım, tarih ─────────────────────────────────────────────────────────────────────────────────────────────────
const AYNA_ISARETLI = { ...MUSTERI, kaliplar: [{ ad: "Y55", olcu: "55x125", uretimFormGonder: true }, { ...MUSTERI.kaliplar[1], uretimFormGonder: true }, { ad: "K40", olcu: "40x40", uretimFormGonder: true }] };
function uretimKur({ customers, partSales }) {
  const durum = { uretimFormlari: [], customers, partSales };
  const showToast = vi.fn();
  render(<UretimFormu uretimFormlari={[]} setUretimFormlari={vi.fn(u => { durum.uretimFormlari = typeof u === "function" ? u(durum.uretimFormlari) : u; })}
    customers={customers} partSales={partSales} kalipDefs={[]} showToast={showToast}
    setCustomers={vi.fn(u => { durum.customers = u(durum.customers); })} setPartSales={vi.fn(u => { durum.partSales = u(durum.partSales); })} />);
  fireEvent.click(screen.getByText("Yeni Form"));
  fireEvent.click(screen.getByText("Bekleyen Kalıpları Getir"));
  return { durum, showToast };
}
const kaydetFormu = () => fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.trim() === "Kaydet"));

describe("Spec 0107: getirme, sayaç ve başlangıç tarihi ayna satırı atlar (R8–R12)", () => {
  it("AC-17 / AC-18 / AC-31: işaretli ayna getirilmez, satış bir kez gelir; ortadaki aynayla indeksler kaymaz", () => {
    const { durum, showToast } = uretimKur({ customers: [AYNA_ISARETLI], partSales: [{ ...EXTRA, uretimFormGonder: true }] });
    expect(showToast).toHaveBeenCalledWith("3 kalıp eklendi.");
    kaydetFormu();
    const satirlar = durum.uretimFormlari[0].satirlar;
    expect(satirlar.filter(r => r.kaynakTip === "musteri").map(r => r.kalipIdx)).toEqual([0, 2]);
    expect(satirlar.filter(r => r.kaynakTip === "extra_kalip").map(r => r.kaynakId)).toEqual([710]);
    // Kaydetme damgası ayna satırına basılmaz, gerçek kalıplara basılır.
    expect(durum.customers[0].kaliplar.map(k => k.uretimFormId ?? null)).toEqual([durum.uretimFormlari[0].id, null, durum.uretimFormlari[0].id]);
  });
  it("AC-24 (önkoşul): Extra Kalıp döngüsü ve damga aynen: işaretli satış getirilir ve bağlanır", () => {
    const { durum } = uretimKur({ customers: [], partSales: [{ ...EXTRA, uretimFormGonder: true }] });
    kaydetFormu();
    expect(durum.partSales[0].uretimFormId).toBe(durum.uretimFormlari[0].id);
  });
  it("AC-32: satışı bulunamayan işaretli ayna ne getirilir ne sayılır", () => {
    const yalniz = { ...MUSTERI, kaliplar: [{ ...MUSTERI.kaliplar[1], uretimFormGonder: true }] };
    const { showToast } = uretimKur({ customers: [yalniz], partSales: [] });
    expect(showToast).toHaveBeenCalledWith("Bu tarih aralığında bekleyen yeni kalıp yok.");
    cleanup();
    render(<Dashboard dealers={[]} stock={[]} payments={[]} rates={null} teklifler={[]} customers={[yalniz]} services={[]} partSales={[]} yedekParcaSatislar={[]} />);
    expect(sayac()).toBe("0");
  });
});

const sayac = () => screen.getByText("Üretimde Bekleyen Kalıplar").nextElementSibling.textContent;
const dashboard = (customers, partSales) => render(<Dashboard dealers={[]} stock={[]} payments={[]} rates={null} teklifler={[]}
  customers={customers} services={[]} partSales={partSales} yedekParcaSatislar={[]} />);

describe("Spec 0107: Anasayfa sayacı (R9)", () => {
  it("AC-19: işaretli ayna sayaca girmez", () => {
    dashboard([{ ...MUSTERI, kaliplar: [{ ...MUSTERI.kaliplar[1], uretimFormGonder: true }] }], [EXTRA]);
    expect(sayac()).toBe("0");
  });
  it("AC-20: işaretli satış ile işaretli aynası birlikteyken sayaç 1", () => {
    dashboard([{ ...MUSTERI, kaliplar: [{ ...MUSTERI.kaliplar[1], uretimFormGonder: true }] }], [{ ...EXTRA, uretimFormGonder: true }]);
    expect(sayac()).toBe("1");
  });
});
