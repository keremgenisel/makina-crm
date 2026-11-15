// @vitest-environment jsdom
// Spec 0146: müşteri detayında kalıp durumu satırı, kalıp durumları penceresi ve makina teslimiyle toplu teslim.
// Gerçek Customers (düzenek tests/ui/kalip-durumu-0110.test.jsx'ten kopyalandı, o dosyaya dokunulmaz); güncelleyiciler hemen çalışır.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within, act } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { ALTUNMAK_MODELS } from "../../src/lib/constants";
import { KALIP_DURUMU as K, MAKINA_DURUMU as M, KALIP_DURUMLARI_BASLIGI, TESLIM_ONAYI, extraKalipListeIbaresi } from "../../src/lib/musteriDurumu";

afterEach(() => { cleanup(); delete window.crmLocks; });

const M0 = ALTUNMAK_MODELS[0].model;
function kur({ customers = [], partSales = [], uretimFormlari, serverPermissions, isCustomer } = {}) {
  const durum = { customers, stock: [], partStockLog: [], services: [], partSales, payments: [], partStock: [] };
  const cagri = { customers: 0 };
  const uygula = (k, u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; };
  const setter = (k) => vi.fn((u) => { if (k === "customers") cagri.customers++; uygula(k, u); });
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
  };
  const ek = {};
  if (uretimFormlari !== undefined) ek.uretimFormlari = uretimFormlari;
  if (serverPermissions !== undefined) ek.serverPermissions = serverPermissions;
  if (isCustomer !== undefined) ek.isCustomer = isCustomer;
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={[]} partStockLog={[]}
      services={[]} partSales={durum.partSales.filter(p => !p.deletedAt)} payments={[]} partStock={[]} giderYetki={false}
      uretimPartileri={[]} rates={{ usd: 41.5, eur: 45.25 }} showToast={vi.fn()}
      kalipDefs={["Y45", "Y55", "Y60", "K40"].map((ad, i) => ({ id: i + 1, ad }))} {...ek} {...setters} />
  );
  const u = render(ciz());
  return { durum, cagri, rerender: () => u.rerender(ciz()) };
}
const detayAc = (ad) => fireEvent.click(screen.getAllByText(ad)[0]);
const izin = (ids) => ({ role: "user", permissions: JSON.stringify({ customerActions: ids }) });
const makinaSecici = () => within(screen.getByTestId("detay-makina-durumu")).getByRole("combobox");
const ozet = () => screen.getByTestId("detay-kalip-ozeti").textContent;
const pencereAc = () => fireEvent.click(screen.getByTestId("detay-kalip-durumu-dugmesi"));
const detayAcikMi = (ad) => screen.queryAllByText(ad).length > 1; // liste satırı + detay başlığı

// İki hazır (elle), bir üretimde (elle), sonda bir Extra Kalıp aynası (satış 901, hazır).
const HAZIRLI = { id: 801, name: "Hazır AŞ", model: M0, serialNo: "S-801", installDate: "2026-09-01", warrantyEnd: "2028-09-01", makinaDurumu: M.HAZIR,
  kaliplar: [{ ad: "Y55", olcu: "55x125", kalipDurumu: K.HAZIR }, { ad: "Y60", olcu: "60x125", kalipDurumu: K.HAZIR }, { ad: "K40", olcu: "40x40", kalipDurumu: K.URETIMDE },
    { ad: "Y45", olcu: "45x110", partSaleId: 901 }] };
const EXTRA_HAZIR = { id: 901, customerId: 801, tur: "Kalıp", ad: "Y45", olcu: "45x110", ucret: 1000, currency: "TRY", tarih: "2026-09-10", odendi: true, kalipDurumu: K.HAZIR };
// Eski kayıt: işaretsiz, damgasız kalıplar teslim türetir (0110 R1).
const ESKI = { id: 802, name: "Eski AŞ", model: M0, serialNo: "S-802", installDate: "2019-01-01", warrantyEnd: "2021-01-01",
  kaliplar: [{ ad: "Y55", olcu: "55x125" }, { ad: "Y60", olcu: "60x125" }, { ad: "K40", olcu: "40x40" }] };

describe("Spec 0146 A: satır ve özet", () => {
  it("AC-1 / AC-2 / AC-23 / AC-24: satır makina durumunun altında; özet en geriden, ayna sayılmaz", () => {
    kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    const satir = screen.getByTestId("detay-kalip-durumu");
    expect(screen.getByTestId("detay-makina-durumu").nextElementSibling).toBe(satir);
    expect(satir.textContent).toContain("Kalıp durumu");
    expect(ozet()).toBe("1 Üretimde · 2 Hazır");
    expect(within(satir).getByTestId("detay-kalip-durumu-dugmesi").textContent).toContain(KALIP_DURUMLARI_BASLIGI);
  });
  it("AC-3: hepsi teslim kayıtta satır çizilir ve sayar; yalnız ayna satırlı kayıtta satır yok", () => {
    kur({ customers: [ESKI, { ...ESKI, id: 803, name: "Ayna AŞ", serialNo: "S-803", kaliplar: [{ ad: "Y45", olcu: "45x110", partSaleId: 904 }] }],
      partSales: [{ ...EXTRA_HAZIR, id: 904, customerId: 803 }] });
    detayAc("Eski AŞ");
    expect(ozet()).toBe("3 Teslim edildi");
    cleanup();
    kur({ customers: [{ ...ESKI, id: 803, name: "Ayna AŞ", serialNo: "S-803", kaliplar: [{ ad: "Y45", olcu: "45x110", partSaleId: 904 }] }],
      partSales: [{ ...EXTRA_HAZIR, id: 904, customerId: 803 }] });
    detayAc("Ayna AŞ");
    expect(screen.queryByTestId("detay-kalip-durumu")).toBeNull();
  });
  it("AC-4: cust_detail_edit yoksa düğme yok, özet var; isCustomer=false'ta satır yok", () => {
    kur({ customers: [ESKI], serverPermissions: izin(["cust_service_add"]) });
    detayAc("Eski AŞ");
    expect(ozet()).toBe("3 Teslim edildi");
    expect(screen.queryByTestId("detay-kalip-durumu-dugmesi")).toBeNull();
    cleanup();
    kur({ customers: [ESKI], isCustomer: false });
    detayAc("Eski AŞ");
    expect(screen.queryByTestId("detay-kalip-durumu")).toBeNull();
  });
  it("AC-8: kalıp kartı değişmez (dört rozet, başlık sayısı, ayna tinti; kartta combobox ve düğme yok)", () => {
    kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    const kartKok = screen.getByText("Kalıplar (4)").parentElement.parentElement;
    const rozetler = [...kartKok.querySelectorAll("span[title]")];
    expect(rozetler.map(r => r.textContent)).toEqual(["55x125 — Y55", "60x125 — Y60", "40x40 — K40", "45x110 — Y45"]);
    expect(rozetler.map(r => r.title)).toEqual(["", "", "", "Extra Kalıp Satışı'ndan"]);
    expect(within(kartKok).queryAllByRole("combobox")).toHaveLength(0);
    expect(within(kartKok).queryAllByRole("button")).toHaveLength(0);
  });
});

describe("Spec 0146 A: kalıp durumları penceresi", () => {
  it("AC-5 / AC-23 / AC-27: pencere yalnız makina kalıplarını listeler, ayna ibareyle söylenir", () => {
    kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    pencereAc();
    expect(screen.getAllByText(KALIP_DURUMLARI_BASLIGI).length).toBeGreaterThan(1);
    const satirlar = screen.getAllByTestId("kalip-durum-satiri");
    expect(satirlar.map(s => s.textContent.slice(0, 2))).toEqual(["1.", "2.", "3."]);
    expect(satirlar.some(s => s.textContent.includes("Y45"))).toBe(false);
    expect(screen.getByTestId("kalip-durumu-extra-ibaresi").textContent).toBe(extraKalipListeIbaresi(1));
    expect(extraKalipListeIbaresi(1)).toMatch(/Makina Geçmişi/);
    expect(extraKalipListeIbaresi(1)).toMatch(/Teslim Bekleyenler/);
  });
  it("AC-6 / AC-7: seçim yalnız o konuma yazılır; 'Otomatik (…)' alanı siler", () => {
    const { durum } = kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    pencereAc();
    const s2 = screen.getByRole("combobox", { name: "2. kalıp durumu" });
    expect(screen.getByRole("combobox", { name: "1. kalıp durumu" }).options[0].textContent).toBe("Otomatik (Teslim edildi)");
    const once = JSON.parse(JSON.stringify(durum.customers[0]));
    fireEvent.change(s2, { target: { value: K.TESLIM } });
    const sonra = durum.customers[0];
    expect(sonra.kaliplar[1].kalipDurumu).toBe(K.TESLIM);
    expect({ ...sonra, kaliplar: sonra.kaliplar.filter((_, i) => i !== 1) }).toEqual({ ...once, kaliplar: once.kaliplar.filter((_, i) => i !== 1) });
    fireEvent.change(screen.getByRole("combobox", { name: "2. kalıp durumu" }), { target: { value: "" } });
    expect("kalipDurumu" in durum.customers[0].kaliplar[1]).toBe(false);
    expect(screen.getAllByTestId("kalip-durum-satiri")).toHaveLength(3); // pencere açık kalır
  });
  it("AC-9: pencere kabı 560 genişlik, 90vh tavan ve dikey kaydırma taşır", () => {
    kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    pencereAc();
    // Pencere kabı: satırın, maxWidth taşıyan ilk atası (öznitelik metnine bakılmaz; jsdom 31 stil özniteliğini farklı yazar).
    let kap = screen.getAllByTestId("kalip-durum-satiri")[0];
    while (kap && !kap.style?.maxWidth) kap = kap.parentElement;
    expect(kap.style.maxWidth).toBe("560px");
    expect(kap.style.maxHeight).toBe("90vh");
    expect(kap.style.overflowY).toBe("auto");
  });
  it("AC-25 / AC-26: numara kaliplar konumudur (1, 3, 4, 5) ve erişilebilir adlar benzersiz", () => {
    kur({ customers: [{ ...ESKI, kaliplar: [{ ad: "A" }, { ad: "B", partSaleId: 999 }, { ad: "C" }, { ad: "D" }, { ad: "E" }] }] });
    detayAc("Eski AŞ");
    pencereAc();
    expect(screen.getAllByTestId("kalip-durum-satiri").map(s => s.textContent.slice(0, 2))).toEqual(["1.", "3.", "4.", "5."]);
    const adlar = screen.getAllByTestId("kalip-durum-satiri").map(s => within(s).getByRole("combobox").getAttribute("aria-label"));
    expect(adlar).toEqual(["1. kalıp durumu", "3. kalıp durumu", "4. kalıp durumu", "5. kalıp durumu"]);
    expect(new Set(adlar).size).toBe(adlar.length);
  });
  it("AC-19 / AC-37: pencere açıkken Escape ve 'Kapat' detayı kapatmaz; Escape yalnız pencereyi kapatır", () => {
    kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    pencereAc();
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(detayAcikMi("Hazır AŞ")).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryAllByTestId("kalip-durum-satiri")).toHaveLength(0);
    expect(detayAcikMi("Hazır AŞ")).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(detayAcikMi("Hazır AŞ")).toBe(false); // üstte pencere yokken Escape detayı kapatır (bugünkü davranış)
  });
});

describe("Spec 0146 B: makina teslimiyle toplu teslim", () => {
  it("AC-10 / AC-29 / AC-31: teslim seçilince değer önce yazılır, onay sayı ve metinlerle açılır", () => {
    const { durum, rerender } = kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    fireEvent.change(makinaSecici(), { target: { value: M.TESLIM } });
    expect(durum.customers[0].makinaDurumu).toBe(M.TESLIM);
    rerender();
    expect(makinaSecici().value).toBe(M.TESLIM);
    expect(screen.getByText(TESLIM_ONAYI.baslik)).toBeTruthy();
    expect(screen.getByText(TESLIM_ONAYI.metin(2))).toBeTruthy();
    expect(screen.getByRole("button", { name: /Evet, İşaretle/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yalnız makina" })).toBeTruthy();
    expect(screen.queryByText(/Evet, Sil/)).toBeNull();
    expect(TESLIM_ONAYI.metin(2)).toBe("Makina teslim edildi olarak işaretlenecek. Hazır bekleyen 2 kalıp da teslim edildi sayılsın mı?");
  });
  it("AC-11 / AC-14 / AC-15 / AC-32: kabul iki hazırı teslim yapar, üretimdekine ve Extra Kalıp'a dokunmaz, tek setCustomers", () => {
    const { durum, cagri, rerender } = kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    fireEvent.change(makinaSecici(), { target: { value: M.TESLIM } });
    rerender();
    const once = cagri.customers;
    fireEvent.click(screen.getByRole("button", { name: /Evet, İşaretle/ }));
    expect(cagri.customers - once).toBe(1);
    expect(durum.customers[0].kaliplar.map(k => k.kalipDurumu)).toEqual([K.TESLIM, K.TESLIM, K.URETIMDE, undefined]);
    expect(durum.partSales[0].kalipDurumu).toBe(K.HAZIR);
    rerender();
    expect(ozet()).toBe("1 Üretimde · 2 Teslim edildi");
  });
  it("AC-11 (süzgeç): hazır Extra Kalıp'ı olan kayıt süzgeçte kalır, olmayan çıkar", () => {
    const IKINCI = { ...HAZIRLI, id: 804, name: "Sade AŞ", serialNo: "S-804", kaliplar: HAZIRLI.kaliplar.slice(0, 3) };
    const { rerender } = kur({ customers: [HAZIRLI, IKINCI], partSales: [EXTRA_HAZIR] });
    const suzgec = () => screen.getByRole("button", { name: /Teslim Bekleyenler/ }).getAttribute("aria-label");
    expect(suzgec()).toBe("Teslim Bekleyenler (2)");
    for (const ad of ["Sade AŞ", "Hazır AŞ"]) {
      detayAc(ad);
      fireEvent.change(makinaSecici(), { target: { value: M.TESLIM } });
      rerender();
      fireEvent.click(screen.getByRole("button", { name: /Evet, İşaretle/ }));
      rerender();
      fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    }
    expect(suzgec()).toBe("Teslim Bekleyenler (1)"); // Hazır AŞ'nin hazır Extra Kalıp satışı süzgeçte tutar (Tuzak T7)
  });
  it("AC-12: ret makinayı yazar, kalıplara dokunmaz", () => {
    const { durum, rerender } = kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    fireEvent.change(makinaSecici(), { target: { value: M.TESLIM } });
    rerender();
    fireEvent.click(screen.getByRole("button", { name: "Yalnız makina" }));
    expect(durum.customers[0].makinaDurumu).toBe(M.TESLIM);
    expect(durum.customers[0].kaliplar).toBe(HAZIRLI.kaliplar);
    rerender();
    expect(ozet()).toBe("1 Üretimde · 2 Hazır");
  });
  it("AC-13 / AC-16: hazırsız kayıtta ve teslimden hazıra geçişte onay açılmaz", () => {
    const { durum, rerender } = kur({ customers: [ESKI, { ...HAZIRLI, makinaDurumu: M.TESLIM }], partSales: [EXTRA_HAZIR] });
    detayAc("Eski AŞ");
    fireEvent.change(makinaSecici(), { target: { value: M.TESLIM } });
    expect(durum.customers[0].makinaDurumu).toBe(M.TESLIM);
    expect(screen.queryByText(TESLIM_ONAYI.baslik)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    rerender();
    detayAc("Hazır AŞ");
    fireEvent.change(makinaSecici(), { target: { value: M.HAZIR } });
    expect(screen.queryByText(TESLIM_ONAYI.baslik)).toBeNull();
    expect(durum.customers[1].kaliplar).toBe(HAZIRLI.kaliplar);
  });
  it("AC-30: onay açıkken bir kalıp başka yoldan değişirse yalnız hâlâ hazır olan yazılır", () => {
    const { durum } = kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    fireEvent.change(makinaSecici(), { target: { value: M.TESLIM } });
    // Kayıt değişir ama yeniden çizim yapılmaz: plan çizimdeki kayıttan değil, güncelleyicinin gördüğü kayıttan kurulmalı (B-R2).
    durum.customers = durum.customers.map(c => ({ ...c, kaliplar: c.kaliplar.map((k, i) => (i === 0 ? { ...k, kalipDurumu: K.URETIMDE } : k)) }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, İşaretle/ }));
    expect(durum.customers[0].kaliplar.map(k => k.kalipDurumu)).toEqual([K.URETIMDE, K.TESLIM, K.URETIMDE, undefined]);
  });
  it("AC-19 / AC-36 / AC-37: onay açıkken Escape ve 'Kapat' detayı kapatmaz; Escape 'Yalnız makina' sayılır; pencere aynı anda açılmaz", () => {
    const { durum, rerender } = kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    fireEvent.change(makinaSecici(), { target: { value: M.TESLIM } });
    rerender();
    expect(screen.queryAllByTestId("kalip-durum-satiri")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(detayAcikMi("Hazır AŞ")).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(TESLIM_ONAYI.baslik)).toBeNull();
    expect(detayAcikMi("Hazır AŞ")).toBe(true);
    expect(durum.customers[0].kaliplar).toBe(HAZIRLI.kaliplar);
  });
  it("AC-33: müşteri formundan teslim yapılınca onay açılmaz, kalıplar değişmez", async () => {
    const { durum } = kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
    detayAc("Hazır AŞ");
    fireEvent.click(screen.getByRole("button", { name: /Düzenle/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Makina durumu" }), { target: { value: M.TESLIM } });
    expect(screen.queryByText(TESLIM_ONAYI.baslik)).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByText(TESLIM_ONAYI.baslik)).toBeNull();
    expect(durum.customers[0].makinaDurumu).toBe(M.TESLIM);
    expect(durum.customers[0].kaliplar.map(k => k.kalipDurumu)).toEqual([K.HAZIR, K.HAZIR, K.URETIMDE, undefined]);
  });
});

describe("Spec 0146 triyaj", () => {
  it("bulgu 1 (AC-27): ibare satır farkını değil Extra Kalıp satış sayısını yazar", () => {
    // Kalıplar [A, ayna, B], tek canlı satış: kartın ölçütü ayna ve sondaki B'yi düşürür (Karar 1), ama satış sayısı 1'dir.
    kur({ customers: [{ ...ESKI, kaliplar: [{ ad: "A" }, { ad: "Y45", partSaleId: 905 }, { ad: "B" }] }], partSales: [{ ...EXTRA_HAZIR, id: 905, customerId: 802 }] });
    detayAc("Eski AŞ");
    pencereAc();
    expect(screen.getAllByTestId("kalip-durum-satiri")).toHaveLength(1);
    expect(screen.getByTestId("kalip-durumu-extra-ibaresi").textContent).toBe(extraKalipListeIbaresi(1));
  });
  it("bulgu 1: Extra Kalıp satışı yoksa ibare çizilmez", () => {
    kur({ customers: [ESKI] });
    detayAc("Eski AŞ");
    pencereAc();
    expect(screen.queryByTestId("kalip-durumu-extra-ibaresi")).toBeNull();
  });
  it("bulgu 2: pencere açıkken kayıt kilidi başka kullanıcıya geçerse pencere kapanır, yazım yolu kalmaz", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let sonuc = { ok: true };
      window.crmLocks = { acquire: vi.fn(async () => sonuc), release: vi.fn(async () => ({ ok: true })), list: vi.fn(async () => []), onLocksChanged: vi.fn(() => () => {}) };
      kur({ customers: [HAZIRLI], partSales: [EXTRA_HAZIR] });
      detayAc("Hazır AŞ");
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      pencereAc();
      expect(screen.getAllByTestId("kalip-durum-satiri")).toHaveLength(3);
      sonuc = { ok: false, lockedBy: "ayse", lockedAt: "2026-11-16T10:00:00" };
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(screen.queryAllByTestId("kalip-durum-satiri")).toHaveLength(0);
    } finally { vi.useRealTimers(); }
  });
});
