// @vitest-environment jsdom
// Spec 0106: müşteri satırları makina ve kalıp durumunu renkli pille gösterir. Gerçek Customers; düzenek
// tests/ui/model-secici-0105.test.jsx'ten kopyalandı (o dosyaya dokunulmaz); güncelleyiciler hemen çalışır (`ertele: false`).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { ALTUNMAK_MODELS } from "../../src/lib/constants";

afterEach(() => { cleanup(); delete window.crmLocks; vi.useRealTimers(); });

// AC-29'un çağrı casusu: kütüphanenin kendi fonksiyonunu sarar, davranış aynı.
vi.mock("../../src/lib/musteriDurumu", async (orijinal) => {
  const m = await orijinal();
  return { ...m, uretimFormHaritasi: vi.fn(m.uretimFormHaritasi) };
});

const M0 = ALTUNMAK_MODELS[0].model;
function kur({ customers = [], stock = [], partSales = [], appSettings, uretimFormlari, isCustomer, serverPermissions, giderYetki = false, showToast = vi.fn() } = {}) {
  const durum = { customers, stock, partStockLog: [], services: [], partSales, payments: [], partStock: [] };
  const uygula = (k, u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; };
  const setter = (k) => vi.fn((u) => uygula(k, u));
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
  };
  const ek = {};
  if (appSettings !== undefined) ek.appSettings = appSettings;
  if (uretimFormlari !== undefined) ek.uretimFormlari = uretimFormlari;
  if (isCustomer !== undefined) ek.isCustomer = isCustomer;
  if (serverPermissions !== undefined) ek.serverPermissions = serverPermissions;
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={durum.stock.filter(s => !s.deletedAt)} partStockLog={durum.partStockLog}
      services={durum.services} partSales={durum.partSales.filter(p => !p.deletedAt)} payments={durum.payments} partStock={durum.partStock} giderYetki={giderYetki}
      uretimPartileri={[]} rates={{ usd: 41.5, eur: 45.25 }} showToast={showToast} {...ek} {...setters} />
  );
  const u = render(ciz());
  return { durum, setters, rerender: () => u.rerender(ciz()) };
}
const bekle = () => new Promise(r => setTimeout(r, 0));
const satir = (ad) => screen.getByText(ad).closest("tr");
const yeniMusteri = (ad = "Yeni AŞ") => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
};
const izgaraAc = () => {
  const ok = screen.getAllByText(/^[▼▲]$/).find(e => e.previousElementSibling?.tagName === "SPAN" && e.parentElement.style.userSelect === "none");
  fireEvent.click(ok.parentElement);
};
const kart = (m) => screen.getAllByText(m).find(e => e.tagName === "DIV" && e.style.fontWeight === "700");
const BORCLU = { id: 501, name: "Borçlu AŞ", model: M0, kaliplar: [], kalanBorc: 5000, installDate: "2026-01-10", warrantyEnd: "2028-01-10" };
const TEMIZ = { id: 502, name: "Temiz AŞ", model: M0, kaliplar: [], installDate: "2026-02-10", warrantyEnd: "2028-02-10" };

// Bu blok spec'ten ÖNCEKİ kodla (52651a1) yazıldı ve yeşil görüldü.
describe("Spec 0106 önkoşul (eski kodla yazıldı ve yeşil görüldü)", () => {
  it("AC-15: borçlu satırın zemini, hover'ı ve title metni", () => {
    kur({ customers: [BORCLU, TEMIZ] });
    const tr = satir("Borçlu AŞ");
    expect(tr.style.background).toBe("var(--redBg, #fef2f2)");
    expect(tr.getAttribute("title")).toBe("Kalan borç: ₺5.000");
    fireEvent.mouseEnter(tr);
    expect(tr.style.background).toBe("var(--redBg2, #fee2e2)");
    fireEvent.mouseLeave(tr);
    expect(tr.style.background).toBe("var(--redBg, #fef2f2)");
    const temiz = satir("Temiz AŞ");
    expect(temiz.style.background).toBe("");
    expect(temiz.getAttribute("title")).toBeNull();
  });
  it("AC-27: 'Borçlu Firmalar' pilinin sayısı ve kümesi", () => {
    kur({ customers: [BORCLU, TEMIZ] });
    const pil = screen.getByRole("button", { name: "Borçlu Firmalar (1)" });
    fireEvent.click(pil);
    expect(screen.getByText("Borçlu AŞ")).toBeTruthy();
    expect(screen.queryByText("Temiz AŞ")).toBeNull();
  });
  it("AC-2 (taban): stok dışı (manuel seri) satışın kayıt nesnesi", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T09:00:00"));
    const { durum } = kur();
    yeniMusteri("Kıyas AŞ");
    izgaraAc();
    fireEvent.click(kart(M0));
    fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "S-106" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    const { id, ...kayit } = durum.customers[0];
    expect(typeof id).toBe("number");
    expect(kayit).toEqual({
      kalipSayisi: 0, satisYapan: "Altuntaş Makina", name: "Kıyas AŞ", phone: "", email: "", yetkili1Ad: "", yetkili1Tel: "",
      yetkili2Ad: "", yetkili2Tel: "", adres: "", city: "", country: "Türkiye", model: M0, kaliplar: [], bantlar: [],
      installDate: "2026-10-24", warrantyEnd: "2028-10-24", faturali: "Faturalı Yurtiçi", faturaBedeli: "", fabrikaSatisBedeli: "",
      komisyon: "", serialNo: "S-106", satisKuru: null, kalanBorc: 0,
    });
    expect("makinaDurumu" in kayit).toBe(false);
  });
});

// ── Spec 0106 ekran kriterleri ───────────────────────────────────────────────────────────────────────────────────────────────
import { PILLER, KALIP_DURUMU as K, MAKINA_DURUMU as M } from "../../src/lib/musteriDurumu";
import * as MD from "../../src/lib/musteriDurumu";

const FORM_900 = { id: 900, satirlar: [
  { kaynakTip: "musteri", kaynakId: 610, kalipIdx: 0, tamamlandi: false },
  { kaynakTip: "musteri", kaynakId: 610, kalipIdx: 1, tamamlandi: true },
  { kaynakTip: "extra_kalip", kaynakId: 710, tamamlandi: true },
] };
const MUSTERI = { id: 610, name: "Durum AŞ", model: M0, serialNo: "S-610", installDate: "2026-09-01", warrantyEnd: "2028-09-01", makinaDurumu: M.MONTAJ,
  kaliplar: [{ ad: "Y55", olcu: "55x125", uretimFormGonder: true, uretimFormId: 900 }, { ad: "Y60", olcu: "60x125", uretimFormId: 900 }, { ad: "K40", olcu: "40x40" }, { ad: "Y45", olcu: "45x110", partSaleId: 710 }] };
const EXTRA = { id: 710, customerId: 610, tur: "Kalıp", ad: "Y45", olcu: "45x110", ucret: 1000, currency: "TRY", tarih: "2026-09-10", odendi: true, uretimFormId: 900 };
const pillerOf = (ad) => [...satir(ad).querySelectorAll('[data-testid="durum-pili"]')].map(e => e.textContent);
const detayAc = (ad) => fireEvent.click(screen.getAllByText(ad)[0]);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
const secici = (etiket) => screen.getByRole("combobox", { name: etiket });

describe("Spec 0106: müşteri listesi (R13–R22)", () => {
  it("AC-17 / AC-22: montaj mor, kalıp en geri durumla sayılı; sıra ödeme, makina, kalıp", () => {
    kur({ customers: [{ ...MUSTERI, kalanBorc: 100 }], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    // Spec 0110 ile (R1, R8, R9): işaretsiz K40 teslim türetir ve paydaya girmez; küme {üretimde, hazır, hazır}.
    expect(pillerOf("Durum AŞ")).toEqual(["ÖDEME BEKLİYOR", "MONTAJ YAPILIYOR", "KALIP ÜRETİMDE 1/3"]);
    const pil = satir("Durum AŞ").querySelectorAll('[data-testid="durum-pili"]')[1];
    expect(pil.style.color).toBe("var(--pur700, #6d28d9)");
    expect(pil.style.background).toBe("var(--purBg, #f5f3ff)");
  });
  it("AC-16 / AC-15: borçlu satırın zemini aynen ve pili kırmızı", () => {
    kur({ customers: [BORCLU] });
    expect(satir("Borçlu AŞ").style.background).toBe("var(--redBg, #fef2f2)");
    expect(pillerOf("Borçlu AŞ")).toEqual([PILLER.odeme.metin]);
  });
  it("AC-5: boş ve teslim makina durumu pil çizdirmez; hücre tire", () => {
    kur({ customers: [TEMIZ, { ...TEMIZ, id: 503, name: "Teslim AŞ", makinaDurumu: M.TESLIM }] });
    expect(pillerOf("Temiz AŞ")).toEqual([]);
    expect(pillerOf("Teslim AŞ")).toEqual([]);
    expect(within(satir("Temiz AŞ")).getByTestId("durum-hucresi").textContent).toBe("—");
  });
  it("AC-23: Durum sütunu Model'in sağında; bayi listesinde yok", () => {
    kur({ customers: [TEMIZ] });
    const basliklar = [...document.querySelectorAll("thead th")].map(th => th.textContent);
    expect(basliklar.indexOf("Durum")).toBe(basliklar.indexOf("Model") + 1);
    cleanup();
    kur({ customers: [TEMIZ], isCustomer: false });
    expect([...document.querySelectorAll("thead th")].map(th => th.textContent)).not.toContain("Durum");
    expect(screen.queryByTestId("durum-hucresi")).toBeNull();
  });
  it("AC-37: Extra Kalıp aynası kümeye girmez, satış hazırsa pil hazır", () => {
    kur({ customers: [{ ...MUSTERI, kaliplar: [MUSTERI.kaliplar[3]], makinaDurumu: M.TESLIM }], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    expect(pillerOf("Durum AŞ")).toEqual(["KALIP HAZIR · TESLİM BEKLİYOR"]);
  });
  // Spec 0108 ile (R15, U1): form yokken damgalı ama işaretsiz kalıp (Y60) ve Extra Kalıp bekliyor; yalnız işaretli Y55 gönderildi.
  // Spec 0110 ile (R1, R8, R10): damgasız K40 teslim, paydaya girmez; bekliyor kapısı kalktı, makina durumu boşken de aynı pil.
  it("AC-40: uretimFormlari verilmezse çökmez; kalıplar bekliyor, gönderildi ya da teslim türetir", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA] });
    expect(pillerOf("Durum AŞ")).toEqual(["MONTAJ YAPILIYOR", "KALIP SİPARİŞİ BEKLİYOR 2/3"]);
    cleanup();
    kur({ customers: [{ ...MUSTERI, makinaDurumu: undefined }], partSales: [EXTRA] });
    expect(pillerOf("Durum AŞ")).toEqual(["KALIP SİPARİŞİ BEKLİYOR 2/3"]);
  });
});

describe("Spec 0106 triyaj", () => {
  it("bulgu 3: Extra Kalıp başka müşteriye taşınmışsa ayna satır formda ve detayda '—' yazar", () => {
    const TASINAN = { ...EXTRA, customerId: 999 };
    kur({ customers: [MUSTERI], partSales: [TASINAN], uretimFormlari: [FORM_900] });
    duzenle("Durum AŞ");
    expect(screen.getByTestId("ayna-kalip-durumu").textContent).toBe("— · Extra Kalıp satışından");
    fireEvent.click(screen.getByText("İptal"));
    detayAc("Durum AŞ");
    expect(screen.queryByTestId("ayna-kalip-durumu")).toBeNull(); // spec 0110 ile (R13, R17): detayda ayna ibaresi yok
  });
  it("bulgu 4: ödeme pili ince redBr kenarı taşır; satırın hover zemini pil zeminiyle aynı olsa da pil ayırt edilir", () => {
    kur({ customers: [BORCLU] });
    const tr = satir("Borçlu AŞ");
    fireEvent.mouseEnter(tr);
    const pil = tr.querySelector('[data-testid="durum-pili"]');
    expect(tr.style.background).toBe(pil.style.background);
    expect(pil.style.border).toBe("1px solid var(--redBr, #fecaca)");
  });
});

describe("Spec 0106: süzgeç (R23, R24)", () => {
  const VERI = { customers: [MUSTERI, { ...TEMIZ, id: 504, name: "Hazır AŞ", makinaDurumu: M.HAZIR }, BORCLU, TEMIZ], partSales: [EXTRA], uretimFormlari: [FORM_900] };
  it("AC-25: 'Teslim Bekleyenler' makina hazır ya da en az bir kalıbı hazır olanları listeler", () => {
    kur(VERI);
    fireEvent.click(screen.getByRole("button", { name: "Teslim Bekleyenler (2)" }));
    expect(screen.getByText("Durum AŞ")).toBeTruthy();
    expect(screen.getByText("Hazır AŞ")).toBeTruthy();
    expect(screen.queryByText("Borçlu AŞ")).toBeNull();
    expect(screen.queryByText("Temiz AŞ")).toBeNull();
  });
  it("AC-26: sayı aramadan ve seçili süzgeçten bağımsız", () => {
    kur(VERI);
    fireEvent.change(screen.getByPlaceholderText("Müşteri ara..."), { target: { value: "Temiz" } });
    expect(screen.getByRole("button", { name: "Teslim Bekleyenler (2)" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Borçlu Firmalar (1)" }));
    expect(screen.getByRole("button", { name: "Teslim Bekleyenler (2)" })).toBeTruthy();
  });
  it("AC-27: 'Borçlu Firmalar' kümesi ve sayısı değişmedi", () => {
    kur(VERI);
    fireEvent.click(screen.getByRole("button", { name: "Borçlu Firmalar (1)" }));
    expect(screen.getByText("Borçlu AŞ")).toBeTruthy();
    expect(screen.queryByText("Durum AŞ")).toBeNull();
  });
});

describe("Spec 0106: müşteri formu (R4, R4/2, R10, R11)", () => {
  it("AC-3: dört seçenek, seçilen değer yazılır, boş seçenek alanı siler", async () => {
    const { durum } = kur({ customers: [{ ...TEMIZ, makinaDurumu: M.HAZIR }] });
    duzenle("Temiz AŞ");
    const s = secici("Makina durumu");
    expect([...s.options].map(o => o.textContent)).toEqual(["Seçilmedi", "Montajda", "Hazır", "Teslim edildi"]);
    expect(s.value).toBe(M.HAZIR);
    fireEvent.change(s, { target: { value: M.TESLIM } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.customers[0].makinaDurumu).toBe(M.TESLIM);
    duzenle("Temiz AŞ");
    fireEvent.change(secici("Makina durumu"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect("makinaDurumu" in durum.customers[0]).toBe(false);
  });
  it("AC-36: seçici gider yetkisi olmadan çizilir; yeri Garanti Bitiş ile Üretim Tarihi arasında", () => {
    kur({ customers: [TEMIZ] });
    duzenle("Temiz AŞ");
    expect(secici("Makina durumu")).toBeTruthy();
    cleanup();
    kur({ customers: [TEMIZ], giderYetki: true });
    duzenle("Temiz AŞ");
    const garanti = screen.getByText("Garanti Bitiş (otomatik)");
    const s = secici("Makina durumu");
    const uretim = screen.getByText("Üretim Tarihi (maliyet için)");
    expect(garanti.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(s.compareDocumentPosition(uretim) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("AC-14 / AC-13: kalıp seçicisinin ilk seçeneği 'Otomatik (…)'; elle değer kazanır, Otomatik'e dönünce alan silinir", async () => {
    const { durum } = kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    duzenle("Durum AŞ");
    const s1 = secici("1. kalıp durumu");
    expect(s1.options[0].textContent).toBe("Otomatik (Üretimde)");
    expect(secici("2. kalıp durumu").options[0].textContent).toBe("Otomatik (Hazır)");
    expect(secici("3. kalıp durumu").options[0].textContent).toBe("Otomatik (Teslim edildi)"); // spec 0110 ile (R1, R18)
    fireEvent.change(s1, { target: { value: K.TESLIM } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.customers[0].kaliplar[0].kalipDurumu).toBe(K.TESLIM);
    duzenle("Durum AŞ");
    fireEvent.change(secici("1. kalıp durumu"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect("kalipDurumu" in durum.customers[0].kaliplar[0]).toBe(false);
    expect(durum.customers[0].kaliplar[0].uretimFormId).toBe(900);
  });
  it("AC-38: ayna satırda seçici yok, türetilmiş durum salt okunur", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    duzenle("Durum AŞ");
    expect(screen.queryByRole("combobox", { name: "4. kalıp durumu" })).toBeNull();
    expect(screen.getByTestId("ayna-kalip-durumu").textContent).toBe("Hazır · Extra Kalıp satışından");
  });
});

describe("Spec 0106: müşteri detayı ve zaman çizelgesi (R5, R11/2, R12/2)", () => {
  it("AC-4: detaydaki makina seçicisi değeri yazar ve pencere açık kalır", () => {
    const { durum, rerender } = kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    detayAc("Durum AŞ");
    fireEvent.change(within(screen.getByTestId("detay-makina-durumu")).getByRole("combobox"), { target: { value: M.HAZIR } });
    expect(durum.customers[0].makinaDurumu).toBe(M.HAZIR);
    rerender();
    expect(screen.getByTestId("detay-makina-durumu")).toBeTruthy();
  });
  // Spec 0110 ile (R13, R17, R19): detay yarısı ters çevrildi; kart 0106 öncesi sade hâlinde, satır düzeni ve seçici yok.
  it("AC-38 / R11/2: kalıp kartı yalnız etiketleri çizer (spec 0110 ile)", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    detayAc("Durum AŞ");
    expect(screen.queryAllByTestId("detay-kalip-satiri")).toHaveLength(0);
    expect(screen.queryByTestId("ayna-kalip-durumu")).toBeNull();
    expect(screen.getByText("Kalıplar (4)")).toBeTruthy();
  });
  it("AC-39: detayın seçicileri cust_detail_edit ile, Extra Kalıp seçicisi cust_kalip_edit ile", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900], serverPermissions: { role: "user", permissions: JSON.stringify({ customerActions: ["cust_kalip_edit"] }) } });
    detayAc("Durum AŞ");
    expect(within(screen.getByTestId("detay-makina-durumu")).queryByRole("combobox")).toBeNull();
    expect(within(screen.getByTestId("detay-makina-durumu")).getByText("Montajda")).toBeTruthy();
    expect(screen.queryAllByTestId("detay-kalip-satiri")).toHaveLength(0); // spec 0110 ile (R13): kartta satır ve seçici yok
    expect(within(screen.getByTestId("extra-kalip-durumu-710")).getByRole("combobox")).toBeTruthy();
    cleanup();
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900], serverPermissions: { role: "user", permissions: JSON.stringify({ customerActions: ["cust_detail_edit"] }) } });
    detayAc("Durum AŞ");
    expect(within(screen.getByTestId("detay-makina-durumu")).getByRole("combobox")).toBeTruthy();
    expect(screen.queryByTestId("extra-kalip-durumu-710")).toBeNull();
  });
  it("AC-12 / R12/2: zaman çizelgesindeki Extra Kalıp seçicisi satışa yazar", () => {
    const { durum } = kur({ customers: [MUSTERI], partSales: [EXTRA, { ...EXTRA, id: 711, customerId: 999 }], uretimFormlari: [FORM_900] });
    detayAc("Durum AŞ");
    const s = within(screen.getByTestId("extra-kalip-durumu-710")).getByRole("combobox");
    expect(s.options[0].textContent).toBe("Otomatik (Hazır)");
    fireEvent.change(s, { target: { value: K.TESLIM } });
    expect(durum.partSales.find(p => p.id === 710).kalipDurumu).toBe(K.TESLIM);
    expect(durum.partSales.find(p => p.id === 711).kalipDurumu).toBeUndefined();
  });
});

describe("Spec 0106 AC-29: harita bir kez kurulur ve aynı nesne forma ve detaya iletilir", () => {
  it("liste, form ve detay açılırken uretimFormHaritasi bir kez çağrılır", () => {
    MD.uretimFormHaritasi.mockClear();
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    detayAc("Durum AŞ");
    fireEvent.click(screen.getByText("Kapat"));
    duzenle("Durum AŞ");
    expect(secici("1. kalıp durumu").options[0].textContent).toBe("Otomatik (Üretimde)");
    expect(MD.uretimFormHaritasi).toHaveBeenCalledTimes(1);
    expect(MD.uretimFormHaritasi.mock.calls[0]).toEqual([[FORM_900]]);
  });
});
