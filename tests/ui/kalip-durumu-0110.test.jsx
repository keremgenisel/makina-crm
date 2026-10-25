// @vitest-environment jsdom
// Spec 0110: kalıp durumu geçmişi susar, pil yalnız açık işi sayar; detay penceresinin kalıp kartı 0106 öncesi hâline döner.
// Gerçek Customers (düzenek tests/ui/musteri-durumu-0106.test.jsx'ten kopyalandı, o dosyaya dokunulmaz); güncelleyiciler hemen çalışır.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { ALTUNMAK_MODELS } from "../../src/lib/constants";
import { KALIP_DURUMU as K, KALIP_DURUM_ADLARI, PILLER } from "../../src/lib/musteriDurumu";

afterEach(() => { cleanup(); delete window.crmLocks; });

const M0 = ALTUNMAK_MODELS[0].model;
function kur({ customers = [], partSales = [], uretimFormlari, serverPermissions } = {}) {
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
      uretimPartileri={[]} rates={{ usd: 41.5, eur: 45.25 }} showToast={vi.fn()}
      kalipDefs={["Y45", "Y55", "Y60", "K40"].map((ad, i) => ({ id: i + 1, ad }))} {...ek} {...setters} />
  );
  const u = render(ciz());
  return { durum, rerender: () => u.rerender(ciz()) };
}
const bekle = () => new Promise(r => setTimeout(r, 0));
const satir = (ad) => screen.getByText(ad).closest("tr");
const pillerOf = (ad) => [...satir(ad).querySelectorAll('[data-testid="durum-pili"]')].map(e => e.textContent);
const detayAc = (ad) => fireEvent.click(screen.getAllByText(ad)[0]);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
const izin = (ids) => ({ role: "user", permissions: JSON.stringify({ customerActions: ids }) });

// Form 900: Y55 bitmemiş, Y60 tamamlandı, Extra Kalıp 710 tamamlandı.
const FORM_900 = { id: 900, satirlar: [
  { kaynakTip: "musteri", kaynakId: 610, kalipIdx: 0, tamamlandi: false },
  { kaynakTip: "musteri", kaynakId: 610, kalipIdx: 1, tamamlandi: true },
  { kaynakTip: "extra_kalip", kaynakId: 710, tamamlandi: true },
] };
const MUSTERI = { id: 610, name: "Kalıp AŞ", model: M0, serialNo: "S-610", installDate: "2026-09-01", warrantyEnd: "2028-09-01", makinaDurumu: "montaj",
  kaliplar: [{ ad: "Y55", olcu: "55x125", uretimFormGonder: true, uretimFormId: 900 }, { ad: "Y60", olcu: "60x125", uretimFormId: 900 }, { ad: "K40", olcu: "40x40" },
    { ad: "Y45", olcu: "45x110", partSaleId: 710 }] };
const EXTRA = { id: 710, customerId: 610, tur: "Kalıp", ad: "Y45", olcu: "45x110", ucret: 1000, currency: "TRY", tarih: "2026-09-10", odendi: true, uretimFormId: 900 };
// Ekran görüntüsündeki aritmetik (ölçüm 5): bir kalıp canlı bağlı ve bitmemiş, beşi işaretsiz ve damgasız.
const ESKI = { id: 620, name: "Eski AŞ", model: M0, serialNo: "S-620", installDate: "2019-01-01", warrantyEnd: "2021-01-01",
  kaliplar: [{ ad: "Y55", olcu: "55x125" }, { ad: "Y60", olcu: "60x125" }, { ad: "K40", olcu: "40x40" }, { ad: "Y45", olcu: "45x110" }, { ad: "O70", olcu: "70x140" }] };
const ESKI_EXTRA = { id: 720, customerId: 620, tur: "Kalıp", ad: "Y45", olcu: "45x110", ucret: 1000, currency: "TRY", tarih: "2026-10-12", odendi: true, uretimFormGonder: true, uretimFormId: 901 };
const FORM_901 = { id: 901, satirlar: [{ kaynakTip: "extra_kalip", kaynakId: 720, tamamlandi: false }] };

describe("Spec 0110: müşteri listesinin pili (R8–R11)", () => {
  it("AC-9: beş eski kalıp ve üretimdeki bir Extra Kalıp 'KALIP ÜRETİMDE' yazar, sayı yok", () => {
    kur({ customers: [ESKI], partSales: [ESKI_EXTRA], uretimFormlari: [FORM_901] });
    expect(pillerOf("Eski AŞ")).toEqual(["KALIP ÜRETİMDE"]);
  });
  it("AC-10: karışık küme sayı yazar, payda teslimi saymaz", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    expect(pillerOf("Kalıp AŞ")).toEqual(["MONTAJ YAPILIYOR", "KALIP ÜRETİMDE 1/3"]);
  });
  it("AC-12: hepsi eski (işaretsiz, damgasız) kalıplar pil çizdirmez", () => {
    kur({ customers: [ESKI] });
    expect(pillerOf("Eski AŞ")).toEqual([]);
  });
  it("AC-6 / AC-14: formdan elle yazılan 'Sipariş bekliyor' makina durumu boş kayıtta amber pil çizer", async () => {
    const { durum, rerender } = kur({ customers: [ESKI] });
    duzenle("Eski AŞ");
    fireEvent.change(screen.getByRole("combobox", { name: "1. kalıp durumu" }), { target: { value: K.BEKLIYOR } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.customers[0].kaliplar[0].kalipDurumu).toBe(K.BEKLIYOR);
    rerender();
    expect(pillerOf("Eski AŞ")).toEqual(["KALIP SİPARİŞİ BEKLİYOR"]);
    const pil = satir("Eski AŞ").querySelector('[data-testid="durum-pili"]');
    expect(pil.style.color).toBe(PILLER.bekliyor.renk);
  });
  it("AC-24: damgası dolu ama formu çöpte işaretsiz kalıp pilde 'SİPARİŞİ BEKLİYOR' görünür (teslim değil)", () => {
    kur({ customers: [{ ...ESKI, kaliplar: [{ ad: "Y55", olcu: "55x125", uretimFormId: 901 }, ...ESKI.kaliplar.slice(1)] }], uretimFormlari: [{ ...FORM_901, deletedAt: "2026-10-20" }] });
    expect(pillerOf("Eski AŞ")).toEqual(["KALIP SİPARİŞİ BEKLİYOR"]);
  });
});

describe("Spec 0110: detay penceresinin kalıp kartı (R13–R17, R19)", () => {
  it("AC-17 / AC-27: kart yalnız etiketleri çizer; seçici, satır ve ayna ibaresi yok; kalıp durumu okunmaz, makina durumu okunur", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    detayAc("Kalıp AŞ");
    expect(screen.queryAllByTestId("detay-kalip-satiri")).toHaveLength(0);
    expect(screen.queryByTestId("ayna-kalip-durumu")).toBeNull();
    // Pencerede kalan tek kalıp seçicisi zaman çizelgesinin Extra Kalıp seçicisidir (R15).
    expect(screen.getAllByRole("combobox").filter(c => !screen.getByTestId("detay-makina-durumu").contains(c) && !screen.getByTestId("extra-kalip-durumu-710").contains(c))).toHaveLength(0);
    const kart = screen.getByText("Kalıplar (4)").parentElement.parentElement;
    expect(within(kart).queryAllByRole("combobox")).toHaveLength(0);
    for (const ad of Object.values(KALIP_DURUM_ADLARI)) expect(within(kart).queryByText(new RegExp(ad))).toBeNull();
    expect(within(screen.getByTestId("detay-makina-durumu")).getByRole("combobox").value).toBe("montaj");
  });
  it("AC-18: etiket metni, sırası ve Extra Kalıp ayrımı 0106 öncesiyle aynı", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    detayAc("Kalıp AŞ");
    const kart = screen.getByText("Kalıplar (4)").parentElement.parentElement;
    const etiketler = [...kart.querySelectorAll("span")].filter(s => /—/.test(s.textContent));
    expect(etiketler.map(e => e.textContent)).toEqual(["55x125 — Y55", "60x125 — Y60", "40x40 — K40", "45x110 — Y45"]);
    expect(etiketler.map(e => e.getAttribute("title"))).toEqual(["", "", "", "Extra Kalıp Satışı'ndan"]);
    expect(etiketler[0].style.background).toBe("var(--ambBg3, #fff7ed)");
    expect(etiketler[3].style.background).toBe("var(--redBg2, #fee2e2)");
    expect(etiketler[0].parentElement.style.flexWrap).toBe("wrap");
  });
  it("AC-21: cust_detail_edit izni olmayan kullanıcıda kart aynı görünür", () => {
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    detayAc("Kalıp AŞ");
    const izinli = screen.getByText("Kalıplar (4)").parentElement.parentElement.innerHTML;
    cleanup();
    kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900], serverPermissions: izin(["cust_kalip_edit"]) });
    detayAc("Kalıp AŞ");
    expect(screen.getByText("Kalıplar (4)").parentElement.parentElement.innerHTML).toBe(izinli);
  });
  it("AC-19: makina durumu ve zaman çizelgesinin Extra Kalıp seçicisi yazar; çizelgenin ilk seçeneği dolu", () => {
    const { durum } = kur({ customers: [MUSTERI], partSales: [EXTRA], uretimFormlari: [FORM_900] });
    detayAc("Kalıp AŞ");
    fireEvent.change(within(screen.getByTestId("detay-makina-durumu")).getByRole("combobox"), { target: { value: "hazir" } });
    expect(durum.customers[0].makinaDurumu).toBe("hazir");
    const s = within(screen.getByTestId("extra-kalip-durumu-710")).getByRole("combobox");
    expect(s.options[0].textContent).toBe("Otomatik (Hazır)");
    fireEvent.change(s, { target: { value: K.TESLIM } });
    expect(durum.partSales[0].kalipDurumu).toBe(K.TESLIM);
  });
  it("AC-29: yalnız cust_detail_edit taşıyan kullanıcı detayın Düzenle düğmesiyle formu açıp kalıp durumunu yazar", async () => {
    const { durum } = kur({ customers: [ESKI], serverPermissions: izin(["cust_detail_edit"]) });
    detayAc("Eski AŞ");
    fireEvent.click(screen.getByRole("button", { name: /Düzenle/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "2. kalıp durumu" }), { target: { value: K.HAZIR } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    expect(durum.customers[0].kaliplar[1].kalipDurumu).toBe(K.HAZIR);
  });
});

describe("Spec 0110: türetilen etiket metni (R18)", () => {
  it("AC-26: yeni kalıp 'Otomatik (Teslim edildi)', işaretlenince 'Otomatik (Sipariş verildi)'; işaretsiz Extra Kalıp aynası 'Teslim edildi'", () => {
    kur({ customers: [{ ...ESKI, kaliplar: [{ ad: "Y45", olcu: "45x110", partSaleId: 730 }] }], partSales: [{ ...ESKI_EXTRA, id: 730, uretimFormGonder: false, uretimFormId: undefined }] });
    duzenle("Eski AŞ");
    expect(screen.getByTestId("ayna-kalip-durumu").textContent).toBe("Teslim edildi · Extra Kalıp satışından");
    fireEvent.click(screen.getByText("+ Kalıp Ekle"));
    const s = () => screen.getByRole("combobox", { name: "2. kalıp durumu" });
    expect(s().options[0].textContent).toBe("Otomatik (Teslim edildi)");
    const kutular = screen.getAllByRole("checkbox", { name: "Üretim formuna gönder" });
    fireEvent.click(kutular[kutular.length - 1]);
    expect(s().options[0].textContent).toBe("Otomatik (Sipariş verildi)");
  });
});
