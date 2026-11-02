// @vitest-environment jsdom
// Spec 0125: genel aramada parça ve kalıp katalogları, serviste kalıp alanları. Saf sonuç fonksiyonu, gerçek GlobalSearch,
// gerçek App (tıklayınca doğru panel ve dolu süzgeç), `useFilteredList`'in yeni parametresi ve kaynak taramaları.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { GlobalSearch, KAT, KAT_SIRA, genelAramaSonuclari } from "../../src/components/GlobalSearch";
import { useFilteredList } from "../../src/hooks/useFilteredList";
import { setRozetMetni } from "../../src/lib/urunAgaci";
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });
const COP = "2026-09-01T00:00:00.000Z";
const PARCALAR = [
  { id: 1, ad: "Ayna dişlisi", adEN: "Mirror gear", kod: "AD-1", tip: "Standart" },
  { id: 2, ad: "Mahruti dişli", kod: "MD-1" },
  { id: 3, ad: "Ayna Takımı", kod: "AT-9", setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 2, miktar: 1 }] },
  { id: 4, ad: "Eski Ayna", kod: "ESK-1", deletedAt: COP },
];
const KALIPLAR = [
  { id: 11, ad: "Hamburger 120", kod: "HB-120", urunAdi: "Köfte kalıbı", urunAdiEN: "Patty mould" },
  { id: 12, ad: "Kroket", kod: "KR-1", urunAdi: "Kroket kalıbı" },
  { id: 13, ad: "Eski Kalıp", kod: "OLD-1", deletedAt: COP },
];
const MUSTERI = [{ id: 21, name: "Lezzet Gıda", serialNo: "S-77", model: "AK100" }];
const SERVIS = [
  { id: 31, customerId: 21, type: "Garanti Dışı", tech: "Ahmet", date: "2026-10-10", durum: "Tamamlandı",
    atolyeKaliplari: [{ id: 1, ad: "Burger Kalıbı 110", olcu: "110" }], kalipKargoFirma: "Yurtiçi Kargo", kalipKargoTakipNo: "YK778899" },
  { id: 32, customerId: 21, type: "Bakım", tech: "Burger Ustası", date: "2026-10-11", durum: "Bekliyor", atolyeKaliplari: [{ id: 2, ad: "Burger Kalıbı 90", olcu: "90" }] },
  { id: 33, customerId: 21, type: "Bakım", tech: "Mehmet", date: "2026-10-12", durum: "Bekliyor" },
];
const tum = () => ["customers", "services", "evrak", "dealers", "stock", "notes", "settings"];
const kapi = (ek = {}) => ({ izinli: (t) => tum().includes(t), onGoKatalog: () => {}, ...ek });
const sonuc = (q, ek = {}, k = kapi()) => genelAramaSonuclari(q, { parts: PARCALAR, kalipDefs: KALIPLAR, customers: MUSTERI, services: SERVIS, ...ek }, k);

describe("Spec 0125 A: iki katalog kategorisi (saf)", () => {
  it("AC-1: parça adı, İngilizce adı ve kodu bulur", () => {
    expect(sonuc("ayna diş").parcaTanimlari.map(p => p.id)).toEqual([1]);
    expect(sonuc("mirror").parcaTanimlari.map(p => p.id)).toEqual([1]);
    expect(sonuc("md-1").parcaTanimlari.map(p => p.id)).toEqual([2]);
  });
  it("AC-2: kalıp adı, kodu, ürün adı TR ve EN bulur", () => {
    for (const q of ["hamburger", "HB-120", "köfte", "patty"]) expect(sonuc(q).kalipTanimlari.map(d => d.id), q).toEqual([11]);
  });
  it("AC-4: çöpteki parça ve kalıp tanımı hiçbir sorguda görünmez (dizi canlı olmasa da)", () => {
    expect(sonuc("ESK-1").parcaTanimlari).toEqual([]);
    expect(sonuc("OLD-1").kalipTanimlari).toEqual([]);
    expect(sonuc("eski").parcaTanimlari).toEqual([]);
  });
  it("AC-8: Ayarlar sekmesi ya da yönlendirme yoksa iki anahtar boş döner", () => {
    const yok = sonuc("ayna", {}, kapi({ izinli: (t) => t !== "settings" }));
    expect(yok.parcaTanimlari).toEqual([]);
    expect(yok.kalipTanimlari).toEqual([]);
    expect(sonuc("ayna", {}, kapi({ onGoKatalog: null })).parcaTanimlari).toEqual([]);
  });
  it("AC-12 / AC-20: 19 kategori, iki yeni anahtar sonda, sonuç nesnesi her anahtarı taşır", () => {
    expect(KAT_SIRA).toHaveLength(19);
    expect(KAT_SIRA.slice(-2)).toEqual(["parcaTanimlari", "kalipTanimlari"]);
    expect(Object.keys(KAT).sort()).toEqual([...KAT_SIRA].sort());
    expect(Object.keys(sonuc("zzzz")).sort()).toEqual([...KAT_SIRA].sort());
  });
  it("AC-16 (Karar 4, 23): iki girdi altı alanı taşır; kısa adlar öteki çiplerden ve renk çiftleri öteki kategorilerden ayrı", () => {
    for (const k of ["parcaTanimlari", "kalipTanimlari"]) expect(Object.keys(KAT[k]).sort()).toEqual(["baslik", "bg", "fg", "ikon", "kapi", "kisa"]);
    expect([KAT.parcaTanimlari.kisa, KAT.kalipTanimlari.kisa]).toEqual(["Parça Kataloğu", "Kalıp Kataloğu"]);
    const kisalar = KAT_SIRA.map(k => KAT[k].kisa);
    expect(new Set(kisalar).size).toBe(kisalar.length);
    const cift = (k) => `${KAT[k].bg}|${KAT[k].fg}`.replace(/, #[0-9a-f]+\)/gi, ")");
    const oteki = KAT_SIRA.filter(k => !["parcaTanimlari", "kalipTanimlari"].includes(k)).map(cift);
    for (const k of ["parcaTanimlari", "kalipTanimlari"]) expect(oteki).not.toContain(cift(k));
  });
});

describe("Spec 0125 B: servisin kalıp alanları (saf)", () => {
  it("AC-9 / AC-10: kalıp adı, kalıp kargo firması ve takip numarası servisi bulur", () => {
    expect(sonuc("Burger Kalıbı 110").servisler.map(s => s.id)).toEqual([31]);
    expect(sonuc("yurtiçi").servisler.map(s => s.id)).toEqual([31]);
    expect(sonuc("YK778899").servisler.map(s => s.id)).toEqual([31]);
  });
  it("AC-11 (R11/2): kalıp alanları boş veride bugünkü alanlar aynı sonucu verir; kalıp listesi boş servis yeni alanlardan eşleşmez", () => {
    const bos = SERVIS.map(({ atolyeKaliplari, kalipKargoFirma, kalipKargoTakipNo, ...s }) => s);
    for (const q of ["ahmet", "bakım", "bekliyor", "lezzet", "S-77", "mehmet"]) {
      const a = sonuc(q).servisler.map(s => s.id);
      const b = sonuc(q, { services: bos }).servisler.map(s => s.id);
      expect(b, q).toEqual(a.filter(id => bos.some(s => s.id === id)));
    }
    expect(sonuc("YK778899", { services: bos }).servisler).toEqual([]);
    expect(sonuc("Burger Kalıbı 110", { services: bos }).servisler).toEqual([]);
  });
  it("AC-18: servis anahtarı düz kayıt döndürür (şekil değişmedi)", () => {
    const s = sonuc("YK778899").servisler[0];
    expect(s).toBe(SERVIS[0]);
    expect("kayit" in s).toBe(false);
  });
});

// ── Gerçek GlobalSearch ─────────────────────────────────────────────────────────────────────────────────────────────────
const norm = (s) => s.replace(/\s+/g, " ").trim();
// Bütün diziler sabit referanslı: varsayılan `[]` her çizimde yeni dizi olur ve useMemo'yu her seferinde yeniden hesaplatırdı
// (AC-17'nin bayatlık ölçümü ancak böyle anlamlı).
const BOS = Object.fromEntries(["teklifler", "dealers", "stock", "yedekParcaSatislar", "partSales", "notes", "uretimFormlari", "dosyalar", "calisanlar",
  "giderler", "giderTurleri", "tedarikciler", "giderTanimlari", "uretimPartileri", "kasaHesaplari", "cekler"].map(k => [k, []]));
const IZINLI = tum();
const props = (ek = {}) => ({ ...BOS, customers: MUSTERI, services: SERVIS, parts: PARCALAR, kalipDefs: KALIPLAR, allowedTabs: IZINLI,
  onOpenCustomer: vi.fn(), onGoKatalog: vi.fn(), ...ek });
const ac = (sorgu, ek = {}) => {
  const p = props(ek);
  const r = render(<GlobalSearch {...p} />);
  fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
  fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: sorgu } });
  return { p, r };
};
const grup = (baslik) => {
  const span = screen.queryAllByText(baslik, { selector: "span" }).find(e => e.parentElement?.parentElement?.querySelector("[data-sel]"));
  return span ? [...span.parentElement.parentElement.querySelectorAll("button[data-sel]")].map(b => ({ b, t: norm(b.textContent) })) : [];
};

describe("Spec 0125: paletin satırları", () => {
  it("AC-1 / AC-3: parça satırı `kod · tip`, setin satırında set ibaresi ve bileşen sayısı; tipsiz parça Standart", () => {
    ac("ayna");
    const satir = grup("Yedek Parça Tanımları").map(x => x.t);
    expect(satir).toContain("Ayna dişlisiAD-1 · Standart");
    expect(satir).toContain(`Ayna TakımıAT-9 · Standart · ${setRozetMetni(2)}`);
  });
  it("AC-2: kalıp satırı `kod · ürün adı`, ölçü yazmaz", () => {
    ac("kroket");
    expect(grup("Kalıp Tanımları").map(x => x.t)).toEqual(["KroketKR-1 · Kroket kalıbı"]);
  });
  it("AC-5 / AC-6 (palet): tıklama yönlendirmeyi panel ve kaydın ADIYLA çağırır (kodla bulunsa da)", () => {
    const { p } = ac("AT-9");
    fireEvent.click(grup("Yedek Parça Tanımları")[0].b);
    expect(p.onGoKatalog).toHaveBeenCalledWith({ panel: "yedekparca", ara: "Ayna Takımı" });
    cleanup();
    const { p: p2 } = ac("patty");
    fireEvent.click(grup("Kalıp Tanımları")[0].b);
    expect(p2.onGoKatalog).toHaveBeenCalledWith({ panel: "kaliplar", ara: "Hamburger 120" });
  });
  it("AC-8 (palet): Ayarlar sekmesi olmayan kullanıcıda iki grup çizilmez", () => {
    ac("ayna", { allowedTabs: ["customers"] }); // ayrı render, sabit referans gerekmez
    expect(grup("Yedek Parça Tanımları")).toEqual([]);
    expect(grup("Kalıp Tanımları")).toEqual([]);
  });
  it("AC-9 / AC-10 / AC-19: neden yalnız kalıp alanlarından gelen eşleşmede; teknisyen ya da durum eşleşmesinde yok", () => {
    ac("Burger Kalıbı 110");
    expect(grup("Servis Kayıtları")[0].t).toContain("↳ kalıp: Burger Kalıbı 110");
    cleanup(); ac("YK778899");
    expect(grup("Servis Kayıtları")[0].t).toContain("↳ kalıp takip no: YK778899");
    cleanup(); ac("yurtiçi kargo");
    expect(grup("Servis Kayıtları")[0].t).toContain("↳ kalıp kargo: Yurtiçi Kargo");
    cleanup(); ac("burger"); // 31 kalıp adıyla, 32 hem teknisyen hem kalıp adıyla
    const s = grup("Servis Kayıtları").map(x => x.t);
    expect(s.find(t => t.startsWith("Garanti Dışı"))).toContain("↳ kalıp: Burger Kalıbı 110");
    expect(s.find(t => t.startsWith("Bakım · Burger Ustası"))).not.toContain("↳");
    cleanup(); ac("mehmet");
    expect(grup("Servis Kayıtları")[0].t).not.toContain("↳");
  });
  it("AC-17: kalipDefs değişince aynı sorgunun sonucu güncellenir (bayat değil)", () => {
    const { p, r } = ac("kroket");
    expect(grup("Kalıp Tanımları")).toHaveLength(1);
    r.rerender(<GlobalSearch {...p} kalipDefs={[...KALIPLAR, { id: 14, ad: "Kroket Mini", kod: "KM" }]} />);
    expect(grup("Kalıp Tanımları")).toHaveLength(2);
  });
});

describe("Spec 0125: useFilteredList'in başlangıç araması (R5/2)", () => {
  const veri = [{ ad: "Rulman" }, { ad: "Pul" }];
  it("AC-15: parametresiz çağrı birebir eski (ilk arama boş); verilince ilk süzgeç o metin", () => {
    const eski = renderHook(() => useFilteredList(veri, { searchFields: ["ad"] })).result.current;
    expect(eski.search).toBe("");
    expect(eski.filtered).toEqual(veri);
    const yeni = renderHook(() => useFilteredList(veri, { searchFields: ["ad"], baslangicArama: "rul" })).result.current;
    expect(yeni.search).toBe("rul");
    expect(yeni.filtered).toEqual([{ ad: "Rulman" }]);
  });
});

// ── Gerçek App ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const baslat = async () => {
  const yuklenen = { customers: MUSTERI, services: SERVIS, parts: PARCALAR, kalipDefs: KALIPLAR, appSettings: {}, dataVersion: 1 };
  window.crmStorage = { load: vi.fn(async () => structuredClone(yuklenen)), save: vi.fn(async () => true), getVersion: vi.fn(async () => 1) };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800));
};
const appAra = (q) => {
  fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
  fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: q } });
};
describe("Spec 0125: gerçek App (R5, R5/2)", () => {
  it("AC-5 / AC-6 / AC-7 / AC-14: tıklama paneli açar, süzgeç kaydın adıyla dolar; kodla bulunan satır görünür; ikinci tıklama yeniler", async () => {
    await baslat();
    appAra("AT-9");
    fireEvent.click(grup("Yedek Parça Tanımları")[0].b);
    await waitFor(() => expect(screen.getByPlaceholderText("Yedek parça ara...").value).toBe("Ayna Takımı"));
    expect(screen.getAllByText("Ayna Takımı").some(e => e.closest("tr"))).toBe(true);
    expect(screen.queryAllByText("Mahruti dişli").some(e => e.closest("tr"))).toBe(false);
    // Aynı panele ikinci sonuç: süzgeç yeni adla yenilenir (AC-7, sayaç + key).
    appAra("MD-1");
    fireEvent.click(grup("Yedek Parça Tanımları")[0].b);
    await waitFor(() => expect(screen.getByPlaceholderText("Yedek parça ara...").value).toBe("Mahruti dişli"));
    expect(screen.getAllByText("Mahruti dişli").some(e => e.closest("tr"))).toBe(true);
    // Kalıp kataloğu: ürün adıyla bulunur, süzgeç kalıbın adıyla.
    appAra("patty");
    fireEvent.click(grup("Kalıp Tanımları")[0].b);
    await waitFor(() => expect(screen.getByPlaceholderText("Kalıp ara...").value).toBe("Hamburger 120"));
    expect(screen.getAllByText("Hamburger 120").length).toBeGreaterThan(0);
    expect(screen.queryByText("Kroket")).toBeNull();
  });
});

describe("Spec 0125: süzgeç yalnız hedef panele gider (triyaj bulgu 1, Karar 20)", () => {
  // Ayarlar sol menüsündeki panel düğmesi (panel açıklamasındaki kalın "Kalıp Modelleri" metni hariç).
  const panelAc = (ad) => fireEvent.click(screen.getAllByText(ad).filter(e => !e.closest("button[data-sel]") && !e.closest(".section-desc"))[0]);
  it("parça sonucundan sonra Kalıp Modelleri'ne elle geçilince kalıp listesi süzgeçsiz; ters yönde de", async () => {
    await baslat();
    appAra("AT-9");
    fireEvent.click(grup("Yedek Parça Tanımları")[0].b);
    await waitFor(() => expect(screen.getByPlaceholderText("Yedek parça ara...").value).toBe("Ayna Takımı"));
    panelAc("Kalıp Modelleri");
    await waitFor(() => expect(screen.getByPlaceholderText("Kalıp ara...").value).toBe(""));
    expect(screen.getAllByText("Hamburger 120").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kroket").length).toBeGreaterThan(0);
    // Ters yön: kalıp sonucundan sonra parça paneline elle geçilince parça listesi süzgeçsiz.
    appAra("patty");
    fireEvent.click(grup("Kalıp Tanımları")[0].b);
    await waitFor(() => expect(screen.getByPlaceholderText("Kalıp ara...").value).toBe("Hamburger 120"));
    panelAc("Parça/Yedek Parça");
    await waitFor(() => expect(screen.getByPlaceholderText("Yedek parça ara...").value).toBe(""));
    expect(screen.getAllByText("Mahruti dişli").some(e => e.closest("tr"))).toBe(true);
    expect(screen.getAllByText("Ayna dişlisi").some(e => e.closest("tr"))).toBe(true);
  });
});

describe("Spec 0125: kaynak taramaları", () => {
  const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const gs = () => kod("src/components/GlobalSearch.jsx");
  it("AC-17: kalipDefs dört noktada (prop, v ayıklaması, results çağrısı, useMemo bağımlılıkları); onGoKatalog kapı bağlamında", () => {
    expect(gs()).toMatch(/kalipDefs = \[\], onGoKatalog \}\) =>/);
    expect(gs()).toMatch(/calisanlar = \[\], kalipDefs = \[\] \}/);
    expect(gs()).toMatch(/cekler, yururlukAy, kalipDefs \}, kapiCtx\)/);
    expect(gs()).toMatch(/onGoMaliyet, kalipDefs, onGoKatalog\]\);/);
    expect(gs()).toMatch(/maliyetYetki, onGoMaliyet, onGoKatalog \}\);/);
    // Triyaj bulgu 2 (R2'nin iki katmanı): App palete CANLI kalıp dizisini verir; paletin kendi süzgeci ikinci katmandır.
    expect(kod("src/App.jsx")).toMatch(/kalipDefs=\{liveKalipDefs\}\s*onGoKatalog=/);
  });
  it("C1: kategori tanımı tek tabloda; başlık ve kısa ad ikinci yerde yazılmaz", () => {
    for (const metin of ["Yedek Parça Tanımları", "Parça Kataloğu", "Kalıp Kataloğu"]) expect(gs().split(metin).length - 1, metin).toBe(1);
  });
  it("AC-14: üç halka: App sayacı ve sekmeden çıkınca sıfırlama, Settings'te sayaçtan key, kancanın parametresi", () => {
    const app = kod("src/App.jsx"), st = kod("src/components/Settings.jsx");
    expect(app).toMatch(/setKatalogAcilis\(o => \(\{ \.\.\.a, no: \(o\?\.no \|\| 0\) \+ 1 \}\)\)/);
    expect(app).toMatch(/if \(tab !== "settings" && katalogAcilis\) setKatalogAcilis\(null\)/);
    expect(st).toMatch(/<KalipManager key=\{`kaliplar-\$\{katalogAcilis\?\.no \|\| 0\}`\}/);
    expect(st).toMatch(/<PartManager key=\{`yedekparca-\$\{katalogAcilis\?\.no \|\| 0\}`\}/);
    expect(kod("src/hooks/useFilteredList.js")).toMatch(/useState\(baslangicArama\)/);
  });
  it("AC-15: kancanın öteki parametreleri ve dönüşü aynı; baslangicArama'yı yalnız iki panel geçer", () => {
    const k = kod("src/hooks/useFilteredList.js");
    expect(k).toMatch(/\{ searchFields, searchFn, filterFn, ikinciFiltre, sortFn, perPage = 10, baslangicArama = "" \} = \{\}/);
    expect(k).toMatch(/return \{ search, setSearch, page, setPage, filtered, paged, perPage, oncesi \};/);
  });
  it("AC-13 / R10: arama salt okunur; şema, izin ve sunucu dosyaları yeni adları içermez", () => {
    expect(gs()).not.toMatch(/set(Parts|KalipDefs|Services|Customers|PartSales)/);
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "src/lib/merge.js"])
      expect(readFileSync(f, "utf8"), f).not.toMatch(/parcaTanimlari|kalipTanimlari|onGoKatalog|katalogAcilis/);
  });
  it("R6/2 (Karar 7): kalıp listesi tamirListesi'nden okunur; atolyeKaliplari doğrudan okunmaz", () => {
    expect(gs()).toMatch(/tamirListesi\(s\)/);
    expect(gs()).not.toMatch(/atolyeKaliplari/);
  });
});
