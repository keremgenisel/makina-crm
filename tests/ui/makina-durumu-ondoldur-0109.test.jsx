// @vitest-environment jsdom
// Spec 0109: müşteri formunda makina durumu stoktan ön doldurulur. Gerçek Customers (düzenek 0106'dan kopyalandı, o dosyaya
// dokunulmaz); güncelleyiciler hemen çalışır. Yarış testleri (AC-14, AC-25, AC-26) form açıkken stoğu değiştirip yeniden çizer.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { ALTUNMAK_MODELS } from "../../src/lib/constants";

afterEach(() => { cleanup(); delete window.crmLocks; });

const M0 = ALTUNMAK_MODELS[0].model;
const M1 = ALTUNMAK_MODELS[1].model;
function kur({ customers = [], stock = [], showToast = vi.fn() } = {}) {
  const durum = { customers, stock, partStockLog: [], services: [], partSales: [], payments: [], partStock: [] };
  const uygula = (k, u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; };
  const setter = (k) => vi.fn((u) => uygula(k, u));
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
  };
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={durum.stock.filter(s => !s.deletedAt)} partStockLog={[]}
      services={[]} partSales={[]} payments={[]} partStock={[]} giderYetki={false} uretimPartileri={[]} rates={{ usd: 41.5, eur: 45.25 }}
      showToast={showToast} kalipDefs={[]} {...setters} />
  );
  const u = render(ciz());
  return { durum, showToast, rerender: () => u.rerender(ciz()) };
}
const bekle = () => new Promise(r => setTimeout(r, 0));
const yeniMusteri = (ad = "Yeni AŞ") => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
};
const izgaraAc = () => {
  const ok = screen.getAllByText(/^[▼▲]$/).find(e => e.previousElementSibling?.tagName === "SPAN" && e.parentElement.style.userSelect === "none");
  fireEvent.click(ok.parentElement);
};
const modelSec = (m) => { izgaraAc(); fireEvent.click(screen.getAllByText(m).find(e => e.tagName === "DIV" && e.style.fontWeight === "700")); };
const stokSec = (deger) => fireEvent.change(screen.getByText(/Stoktan seçin/).closest("select"), { target: { value: deger } });
const durumSecici = () => screen.getByRole("combobox", { name: "Makina durumu" });
const kaydet = async () => { fireEvent.click(screen.getByText("Kaydet")); await bekle(); };
const satir = (ad) => screen.getByText(ad).closest("tr");
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));

const stk = (id, o = {}) => ({ id, model: M0, serialNo: `S-${id}`, addedDate: "2026-09-01", parcalar: [], ...o });
const STOK = [stk(1, { uretimDurumu: "montaj" }), stk(2, { uretimDurumu: "hazir" }), stk(3)];
const SERISIZ = [stk(11, { serialNo: "", uretimDurumu: "montaj", addedDate: "2026-01-01" }), stk(12, { serialNo: "", uretimDurumu: "hazir", addedDate: "2026-05-01" })];
const yeniMusteriKaydi = (durum, ad = "Yeni AŞ") => durum.customers.find(c => c.name === ad);

// ── Önkoşul: spec'ten ÖNCEKİ kodla (6140673) yazıldı ve yeşil görüldü ─────────────────────────────────────────────────────
describe("Spec 0109 önkoşul (eski kodla yazıldı ve yeşil görüldü)", () => {
  it("AC-11 / AC-34: dokunmadan kaydedilen stoktan satışta düşülen satırın durumu yazılır", async () => {
    const { durum } = kur({ stock: STOK });
    yeniMusteri(); modelSec(M0); stokSec("S-1");
    await kaydet();
    expect(yeniMusteriKaydi(durum)).toMatchObject({ sourceStockId: 1, makinaDurumu: "montaj" });
  });
  it("AC-15: stok dışı satışta alan hiç yazılmaz", async () => {
    const { durum } = kur({ stock: [] });
    yeniMusteri(); modelSec(M0);
    fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "MAN-1" } });
    await kaydet();
    expect("makinaDurumu" in yeniMusteriKaydi(durum)).toBe(false);
  });
  it("AC-18: seçenekler ve etiket aynen", () => {
    kur({ stock: STOK });
    yeniMusteri();
    expect([...durumSecici().options].map(o => o.textContent)).toEqual(["Seçilmedi", "Montajda", "Hazır", "Teslim edildi"]);
  });
  it("AC-19: detay penceresinin makina durumu seçicisi stok olsa da kayıttaki değeri gösterir", () => {
    kur({ customers: [{ id: 501, name: "Detay AŞ", model: M0, serialNo: "D-1", kaliplar: [], installDate: "2026-01-01" }], stock: STOK });
    fireEvent.click(screen.getAllByText("Detay AŞ")[0]);
    expect(within(screen.getByTestId("detay-makina-durumu")).getByRole("combobox").value).toBe("");
  });
  it("AC-20: kalıp durumu seçicisinin ilk seçeneği 'Otomatik (…)' aynen", () => {
    kur({ stock: STOK });
    yeniMusteri(); modelSec(M0); stokSec("S-1");
    fireEvent.click(screen.getByText("+ Kalıp Ekle"));
    // Spec 0110 ile (R1, R18): yeni eklenen, işaretsiz kalıp teslim türetir; etiket mekanizması aynen.
    expect(screen.getByRole("combobox", { name: "1. kalıp durumu" }).options[0].textContent).toBe("Otomatik (Teslim edildi)");
  });
  it("AC-21: model değişiminde kit ve kalıp çapı durur (bugünkü davranış, X1)", () => {
    kur({ stock: [stk(5, { kalipCapi: { en: "50", yukseklik: "10", boy: "110" } }), stk(6, { model: M1 })] });
    yeniMusteri(); modelSec(M0); stokSec("S-5");
    modelSec(M1);
    expect(screen.getByLabelText("Çap").value).toBe("50");
  });
});

// ── Ön doldurma ───────────────────────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0109: stok satırı seçilince makina durumu ön doldurulur (R1–R4)", () => {
  it("AC-1 / AC-2 / AC-3 / AC-6: montajda, hazır ve alanı boş serili satırlar; ardışık seçim", () => {
    kur({ stock: STOK });
    yeniMusteri(); modelSec(M0);
    stokSec("S-1"); expect(durumSecici().value).toBe("montaj");
    stokSec("S-2"); expect(durumSecici().value).toBe("hazir");
    stokSec("S-3"); expect(durumSecici().value).toBe("hazir");
  });
  it("AC-4: serisiz seçenek motorun düşeceği satırdan (satışa hazırın en eskisi) → Hazır", () => {
    kur({ stock: SERISIZ });
    yeniMusteri(); modelSec(M0); stokSec("__serisiz__");
    expect(durumSecici().value).toBe("hazir");
  });
  it("AC-5 / AC-27: stok bağsız seri bekleyen kaydın düzenlenmesinde ön doldurma; dokunmazsa kayıttaki değer korunur", async () => {
    const BEKLEYEN = { id: 510, name: "Bekleyen AŞ", model: M0, serialNo: "", seriNoBekliyor: true, makinaDurumu: "teslim", kaliplar: [], installDate: "2026-01-01" };
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK });
    duzenle("Bekleyen AŞ");
    expect(durumSecici().value).toBe("teslim");
    stokSec("S-1");
    expect(durumSecici().value).toBe("montaj");
    fireEvent.click(screen.getByText("İptal"));
    duzenle("Bekleyen AŞ");
    fireEvent.change(screen.getByText(/Stoktan seçin/).closest("select"), { target: { value: "__manual__" } });
    fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "ELLE-1" } });
    await kaydet();
    // Triyaj bulgu 1 (P4): stoktan hiçbir şey seçmeden "Manuel gir" kayıttaki değeri silmez (R9/3, Karar 21).
    expect(durum.customers[0]).toMatchObject({ serialNo: "ELLE-1", makinaDurumu: "teslim" });
  });
});

describe("Spec 0109: temizlenme (R5–R7)", () => {
  it("AC-7: boş seçenek alanı temizler", () => {
    kur({ stock: STOK });
    yeniMusteri(); modelSec(M0); stokSec("S-1"); stokSec("");
    expect(durumSecici().value).toBe("");
  });
  it("AC-8 / AC-9: Manuel gir alanı temizler ve kayıtta alan yok", async () => {
    const { durum } = kur({ stock: STOK });
    yeniMusteri(); modelSec(M0); stokSec("S-1"); stokSec("__manual__");
    expect(durumSecici().value).toBe("");
    fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "MAN-2" } });
    await kaydet();
    expect("makinaDurumu" in yeniMusteriKaydi(durum)).toBe(false);
  });
  it("AC-10 / AC-31: model değişince (serisiz ya da serili seçimde) alan temizlenir", () => {
    kur({ stock: [...STOK, ...SERISIZ, stk(20, { model: M1, uretimDurumu: "montaj" })] });
    yeniMusteri(); modelSec(M0); stokSec("__serisiz__");
    modelSec(M1);
    expect(durumSecici().value).toBe("");
    modelSec(M0); stokSec("S-1");
    modelSec(M1);
    expect(durumSecici().value).toBe("");
  });
});

describe("Spec 0109: yazma anı (R8–R10)", () => {
  it("AC-12: elle başka değere çevrilince kullanıcının değeri yazılır", async () => {
    const { durum } = kur({ stock: STOK });
    yeniMusteri(); modelSec(M0); stokSec("S-1");
    fireEvent.change(durumSecici(), { target: { value: "teslim" } });
    await kaydet();
    expect(yeniMusteriKaydi(durum).makinaDurumu).toBe("teslim");
  });
  it("AC-13: elle 'Seçilmedi'ye çevrilince alan kayda yazılmaz", async () => {
    const { durum } = kur({ stock: STOK });
    yeniMusteri(); modelSec(M0); stokSec("S-1");
    fireEvent.change(durumSecici(), { target: { value: "" } });
    await kaydet();
    expect(yeniMusteriKaydi(durum)).toMatchObject({ sourceStockId: 1 });
    expect("makinaDurumu" in yeniMusteriKaydi(durum)).toBe(false);
  });
  it("AC-32: önce elle seçip sonra stok satırı seçilince ön doldurma ezer ve düşülen satırın durumu yazılır", async () => {
    const { durum } = kur({ stock: STOK });
    yeniMusteri(); modelSec(M0);
    fireEvent.change(durumSecici(), { target: { value: "teslim" } });
    stokSec("S-1");
    expect(durumSecici().value).toBe("montaj");
    await kaydet();
    expect(yeniMusteriKaydi(durum).makinaDurumu).toBe("montaj");
  });
  it("AC-14: serisiz satışta öngörülen satır kayıt anında yoksa düşülen satırın durumu yazılır", async () => {
    const r = kur({ stock: SERISIZ });
    yeniMusteri(); modelSec(M0); stokSec("__serisiz__");
    expect(durumSecici().value).toBe("hazir");
    r.durum.stock = r.durum.stock.filter(s => s.id !== 12); r.rerender(); // başka kullanıcı 12'yi sattı
    await kaydet();
    expect(yeniMusteriKaydi(r.durum)).toMatchObject({ sourceStockId: 11, makinaDurumu: "montaj" });
  });
  it("AC-25: serisiz satışta düşülecek satır hiç yoksa (uyarı) alan yazılmaz", async () => {
    const r = kur({ stock: SERISIZ });
    yeniMusteri(); modelSec(M0); stokSec("__serisiz__");
    r.durum.stock = []; r.rerender();
    await kaydet();
    expect(r.showToast).toHaveBeenCalledWith(expect.stringMatching(/Stoktan düşülecek satır bulunamadı/), "warn");
    expect("makinaDurumu" in yeniMusteriKaydi(r.durum)).toBe(false);
  });
  it("AC-26: serili satışta seri kayıt anında stokta yoksa alan yazılmaz", async () => {
    const r = kur({ stock: STOK });
    yeniMusteri(); modelSec(M0); stokSec("S-1");
    r.durum.stock = r.durum.stock.filter(s => s.id !== 1); r.rerender();
    await kaydet();
    const k = yeniMusteriKaydi(r.durum);
    expect(k.serialNo).toBe("S-1");
    expect("makinaDurumu" in k).toBe(false);
  });
  it("AC-27: seri bekleyen düzenlemede dokunmaz ve satır seçmezse kayıttaki değer aynen korunur", async () => {
    const BEKLEYEN = { id: 510, name: "Bekleyen AŞ", model: M0, serialNo: "", seriNoBekliyor: true, makinaDurumu: "teslim", kaliplar: [], installDate: "2026-01-01" };
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK });
    duzenle("Bekleyen AŞ");
    fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: "Bekleyen AŞ 2" } });
    await kaydet();
    expect(durum.customers[0]).toMatchObject({ name: "Bekleyen AŞ 2", makinaDurumu: "teslim" });
  });
  it("AC-28: seri bekleyen düzenlemede stok satırı seçilince kayıttaki değer düşer, düşülen satırın durumu yazılır", async () => {
    const BEKLEYEN = { id: 510, name: "Bekleyen AŞ", model: M0, serialNo: "", seriNoBekliyor: true, makinaDurumu: "teslim", kaliplar: [], installDate: "2026-01-01" };
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK });
    duzenle("Bekleyen AŞ"); stokSec("S-2");
    await kaydet();
    expect(durum.customers[0]).toMatchObject({ sourceStockId: 2, makinaDurumu: "hazir" });
  });
});

// Triyaj bulgu 1 (Karar 21): temizlik yalnız stok satırından gelen değeri siler; kayıttan gelen değer üç yolda da korunur.
describe("Spec 0109 triyaj: kayıttan gelen makina durumu temizlenmez", () => {
  it("P1: satılmış makinanın düzenlenmesinde model düzeltilince kayıttaki değer korunur", async () => {
    const SATILMIS = { id: 520, name: "Satılmış AŞ", model: M0, serialNo: "X-1", makinaDurumu: "teslim", kaliplar: [], installDate: "2026-01-01" };
    const { durum } = kur({ customers: [SATILMIS], stock: STOK });
    duzenle("Satılmış AŞ");
    modelSec(M1);
    expect(durumSecici().value).toBe("teslim");
    await kaydet();
    expect(durum.customers[0]).toMatchObject({ model: M1, makinaDurumu: "teslim" });
  });
  it("P2: stoğa bağlı seri bekleyen kayıtta model değişince damgalanmış değer korunur", async () => {
    const BAGLI = { id: 530, name: "Bağlı AŞ", model: M0, serialNo: "", seriNoBekliyor: true, sourceStockId: 99, makinaDurumu: "hazir", kaliplar: [], installDate: "2026-01-01" };
    const { durum } = kur({ customers: [BAGLI], stock: STOK });
    duzenle("Bağlı AŞ");
    modelSec(M1);
    expect(durumSecici().value).toBe("hazir");
    await kaydet();
    expect(durum.customers[0]).toMatchObject({ model: M1, makinaDurumu: "hazir" });
  });
  it("P4: stoğa bağsız seri bekleyen kayıtta doğrudan 'Manuel gir' kayıttaki değeri silmez", async () => {
    const BEKLEYEN = { id: 540, name: "Bekleyen2 AŞ", model: M0, serialNo: "", seriNoBekliyor: true, makinaDurumu: "teslim", kaliplar: [], installDate: "2026-01-01" };
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK });
    duzenle("Bekleyen2 AŞ");
    stokSec("__manual__");
    expect(durumSecici().value).toBe("teslim");
    fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "ELLE-2" } });
    await kaydet();
    expect(durum.customers[0]).toMatchObject({ serialNo: "ELLE-2", makinaDurumu: "teslim" });
  });
  it("elle seçilmiş değer de model değişiminde korunur; stok satırından gelen değer temizlenir (AC-10 aynen)", () => {
    kur({ stock: [...STOK, stk(20, { model: M1 })] });
    yeniMusteri(); modelSec(M0);
    fireEvent.change(durumSecici(), { target: { value: "teslim" } });
    modelSec(M1);
    expect(durumSecici().value).toBe("teslim");
  });
});
