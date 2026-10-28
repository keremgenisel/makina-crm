// Spec 0106: saf kurallar (src/lib/musteriDurumu.js, satisKaydi.makinaDurumuDamgala) ve kaynak taramaları.
// Ekran kriterleri tests/ui/musteri-durumu-0106.test.jsx, gerçek App tests/ui/musteri-durumu-0106-app.test.jsx.
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as MD from "../src/lib/musteriDurumu";
import { makinaDurumuDamgala } from "../src/lib/satisKaydi";
import { ALAN_IZINLERI } from "../electron/serverAuth.cjs";
import { KILIT_ALANLARI } from "../src/lib/kilitAlanlari";
import { MERGE_KEYS } from "../src/lib/merge";

const { KALIP_DURUMU: K, MAKINA_DURUMU: M } = MD;
const kok = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(kok, p), "utf-8");
const kod = (f) => oku(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => fs.readdirSync(path.join(kok, d)).flatMap(e => { const p = `${d}/${e}`; return fs.statSync(path.join(kok, p)).isDirectory() ? tara(p) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });

const FORM = { id: 900, satirlar: [
  { kaynakTip: "musteri", kaynakId: 1, kalipIdx: 0, tamamlandi: false },
  { kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1, tamamlandi: true },
  { kaynakTip: "extra_kalip", kaynakId: 77, tamamlandi: true },
  { kaynakTip: "extra_kalip", kaynakId: 78, tamamlandi: false },
] };
const harita = MD.uretimFormHaritasi([FORM, { id: 901, deletedAt: "2026-10-01", satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 3, tamamlandi: true }] }]);
const turet = (k, a = MD.musteriKalipAnahtari(1, 0)) => MD.kalipDurumuTuret(k, a, harita);

describe("Spec 0106: makina durumu (R1, R2/2, R6/2)", () => {
  it("AC-1: damga stok satırının ekranda görünen durumu; alanı boş satır hazır", () => {
    expect(makinaDurumuDamgala({ id: 1 }, { uretimDurumu: "montaj" })).toEqual({ id: 1, makinaDurumu: M.MONTAJ });
    expect(makinaDurumuDamgala({ id: 1 }, { uretimDurumu: "hazir" })).toEqual({ id: 1, makinaDurumu: M.HAZIR });
    expect(makinaDurumuDamgala({ id: 1 }, {})).toEqual({ id: 1, makinaDurumu: M.HAZIR });
  });
  it("AC-3 / AC-38 (triyaj bulgu 3): satışı bulunamayan ayna satırın durumu null (ekran '—' yazar)", () => {
    const ayna = { ad: "Y", partSaleId: 404 };
    expect(MD.aynaDurumu(ayna, { id: 1 }, MD.extraKalipGrupla([{ id: 404, customerId: 2, tur: "Kalıp" }]), new Map())).toBeNull();
  });
  it("AC-2: stok satırı yoksa kayıt aynen döner, alan doğmaz", () => {
    const k = { id: 1 };
    expect(makinaDurumuDamgala(k, null)).toBe(k);
    expect("makinaDurumu" in makinaDurumuDamgala(k, undefined)).toBe(false);
  });
  it("R2: formda elle seçilmiş değer önceliklidir (uretimTarihiDamgala emsali)", () => {
    expect(makinaDurumuDamgala({ makinaDurumu: M.TESLIM }, { uretimDurumu: "montaj" })).toEqual({ makinaDurumu: M.TESLIM });
  });
  it("AC-3 (R4): durumYaz geçerli değeri yazar, boş ve tanınmayan değer alanı siler", () => {
    expect(MD.durumYaz({ a: 1 }, "makinaDurumu", M.HAZIR)).toEqual({ a: 1, makinaDurumu: M.HAZIR });
    expect(MD.durumYaz({ a: 1, makinaDurumu: M.HAZIR }, "makinaDurumu", "")).toEqual({ a: 1 });
    expect(MD.durumYaz({ a: 1, makinaDurumu: M.HAZIR }, "makinaDurumu", "bekliyor")).toEqual({ a: 1 });
    expect(MD.durumYaz({ ad: "X", kalipDurumu: K.HAZIR }, "kalipDurumu", "")).toEqual({ ad: "X" });
    expect(MD.durumYaz({ ad: "X" }, "kalipDurumu", K.TESLIM)).toEqual({ ad: "X", kalipDurumu: K.TESLIM });
  });
  it("AC-5 (R6/2): boş makina durumu bilinmiyor, hazır sayılmaz; teslim ve boş pil çizdirmez", () => {
    expect(MD.makinaDurumuOf({})).toBeNull();
    expect(MD.makinaDurumuOf({ makinaDurumu: "x" })).toBeNull();
    expect(MD.makinaPili({})).toBeNull();
    expect(MD.makinaPili({ makinaDurumu: M.TESLIM })).toBeNull();
  });
  it("AC-17: montaj mor, hazır yeşil; Stok rozetlerinin token'ları", () => {
    expect(MD.makinaPili({ makinaDurumu: M.MONTAJ })).toEqual({ metin: "MONTAJ YAPILIYOR", renk: "var(--pur700, #6d28d9)", zemin: "var(--purBg, #f5f3ff)" });
    expect(MD.makinaPili({ makinaDurumu: M.HAZIR })).toEqual({ metin: "MAKİNA HAZIR", renk: "var(--grn700, #15803d)", zemin: "var(--grnBg, #f0fdf4)" });
    const stok = oku("src/components/stock/MakinaStokTab.jsx");
    expect(stok).toContain('montaj: { color: "var(--pur700, #6d28d9)", background: "var(--purBg, #f5f3ff)" }');
    expect(stok).toContain('hazir: { color: "var(--grn700, #15803d)", background: "var(--grnBg, #f0fdf4)" }');
  });
});

describe("Spec 0106: kalıp durumu ve türetme (R7–R10)", () => {
  // Spec 0110 ile (R1): işareti ve damgası boş kalıp sipariş değildir, teslim türetir.
  it("AC-7: işaretsiz, damgasız kalıp teslim (spec 0110 ile)", () => { expect(turet({})).toBe(K.TESLIM); });
  it("AC-8: gönder işaretli, form kimliği boş: gönderildi", () => { expect(turet({ uretimFormGonder: true })).toBe(K.GONDERILDI); });
  it("AC-9: bağlı satır bitmemiş: üretimde", () => { expect(turet({ uretimFormGonder: true, uretimFormId: 900 })).toBe(K.URETIMDE); });
  it("AC-10: bağlı satır tamamlandı: hazır", () => { expect(turet({ uretimFormId: 900 }, MD.musteriKalipAnahtari(1, 1))).toBe(K.HAZIR); });
  // Spec 0108 ile (R15, plan turu U1): kopmuş bağ "hiç forma girmemiş" okunur; işaretsiz damgalı kalıp bekliyor, işaretli gönderildi.
  it("AC-11: form çöpte ya da satır yok: işaretsizse bekliyor, işaretliyse gönderildi (spec 0108 ile)", () => {
    expect(turet({ uretimFormId: 901 }, MD.musteriKalipAnahtari(1, 3))).toBe(K.BEKLIYOR);
    expect(turet({ uretimFormId: 900 }, MD.musteriKalipAnahtari(1, 5))).toBe(K.BEKLIYOR);
    expect(turet({ uretimFormId: 999 })).toBe(K.BEKLIYOR);
    expect(turet({ uretimFormGonder: true, uretimFormId: 999 })).toBe(K.GONDERILDI);
  });
  it("Karar 31: anahtar form kimliğiyle aranır; başka formdaki aynı üçlü bağ kurmaz", () => {
    const h = MD.uretimFormHaritasi([{ id: 5, satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 0, tamamlandi: true }] }, { id: 6, satirlar: [] }]);
    expect(MD.kalipDurumuTuret({ uretimFormId: 6 }, MD.musteriKalipAnahtari(1, 0), h)).toBe(K.BEKLIYOR); // spec 0108 ile
    expect(MD.kalipDurumuTuret({ uretimFormId: 5 }, MD.musteriKalipAnahtari(1, 0), h)).toBe(K.HAZIR);
  });
  it("AC-12: Extra Kalıp aynı kurallarla, bağı extra_kalip:<id>", () => {
    expect(turet({ uretimFormId: 900 }, MD.extraKalipAnahtari(77))).toBe(K.HAZIR);
    expect(turet({ uretimFormId: 900 }, MD.extraKalipAnahtari(78))).toBe(K.URETIMDE);
    expect(turet({ uretimFormGonder: true }, MD.extraKalipAnahtari(79))).toBe(K.GONDERILDI);
    expect(turet({}, MD.extraKalipAnahtari(79))).toBe(K.TESLIM); // spec 0110 ile (R1/2)
  });
  it("AC-13: elle yazılan değer kazanır", () => {
    expect(MD.kalipDurumuOf({ uretimFormId: 900, kalipDurumu: K.TESLIM }, MD.musteriKalipAnahtari(1, 0), harita)).toBe(K.TESLIM);
    expect(MD.kalipDurumuOf({ kalipDurumu: "abc" }, MD.musteriKalipAnahtari(1, 0), harita)).toBe(K.TESLIM); // spec 0110 ile (R1)
  });
  it("AC-14: ilk seçenek 'Otomatik (<türetilen>)' ve boş değer yazar", () => {
    const s = MD.kalipSecenekleri(K.URETIMDE);
    expect(s[0]).toEqual({ value: "", label: "Otomatik (Üretimde)" });
    expect(s.slice(1).map(x => x.value)).toEqual(MD.KALIP_SIRASI);
    expect(MD.makinaSecenekleri().map(x => x.label)).toEqual(["Seçilmedi", "Montajda", "Hazır", "Teslim edildi"]);
  });
});

describe("Spec 0106 R9/2 (triyaj bulgu 1): kalipIdx konumdur, kalıp silinince bağ kayar (bilinen sınır, X11)", () => {
  // Önce A, B, C aynı formda: A hazır, B ve C üretimde. A silinince B konum 0'ı, yani A'nın satırını okur ve "hazır" görünür;
  // C konum 1'i (B'nin satırını) okur. Son konumun satırı (2) artık hiçbir kalıba düşmez. Bu davranış bilinçli olarak sabittir:
  // düzeltmesi kalıba kalıcı kimlik vermektir (X11, göç ister). Sürüm notunda yazılı.
  const F = { id: 950, satirlar: [0, 1, 2].map(i => ({ kaynakTip: "musteri", kaynakId: 9, kalipIdx: i, tamamlandi: i === 0 })) };
  const h = MD.uretimFormHaritasi([F]);
  const durumlar = (kaliplar) => MD.kalipKumesi({ id: 9, kaliplar }, new Map(), h);
  const A = { ad: "A", uretimFormId: 950 }, B = { ad: "B", uretimFormId: 950 }, C = { ad: "C", uretimFormId: 950 };
  it("müşteri formundan kalıp silinince sonraki kalıp önceki kalıbın satırını okur", () => {
    expect(durumlar([A, B, C])).toEqual([K.HAZIR, K.URETIMDE, K.URETIMDE]);
    expect(durumlar([B, C])).toEqual([K.HAZIR, K.URETIMDE]);
  });
  it("Extra Kalıp satışı silinip aynası listeden çıkınca da sonraki kalıpların konumu kayar", () => {
    const ayna = { ad: "E", partSaleId: 1 };
    const F2 = { id: 951, satirlar: [{ kaynakTip: "musteri", kaynakId: 9, kalipIdx: 0, tamamlandi: true }, { kaynakTip: "musteri", kaynakId: 9, kalipIdx: 1, tamamlandi: false }] };
    const h2 = MD.uretimFormHaritasi([F2]);
    const X = { ad: "X", uretimFormId: 951 };
    expect(MD.kalipKumesi({ id: 9, kaliplar: [ayna, X] }, new Map(), h2)).toEqual([K.URETIMDE]);
    expect(MD.kalipKumesi({ id: 9, kaliplar: [X] }, new Map(), h2)).toEqual([K.HAZIR]);
  });
});

describe("Spec 0106: pil (R14–R21/2)", () => {
  const musteri = (kaliplar, ek = {}) => ({ id: 1, kaliplar, ...ek });
  const pil = (m, grup = new Map()) => MD.kalipPili(MD.kalipKumesi(m, grup, harita)); // spec 0110 ile (R10): ikinci parametre yok
  it("AC-16: borçlu satır ödeme pili taşır", () => {
    expect(MD.satirDurumu(musteri([]), { borclu: true }).piller).toEqual([MD.PILLER.odeme]);
  });
  // Spec 0110 ile (R1, R3): bekliyor artık yalnız elle yazılarak doğar; kural (en geri kalmış durum) aynen.
  it("AC-18: en geri kalmış durum: bekliyor + hazır → bekliyor (spec 0110 ile: bekliyor elle)", () => {
    expect(pil(musteri([{ kalipDurumu: K.BEKLIYOR }, { uretimFormId: 900 }], { makinaDurumu: M.MONTAJ })).durum).toBe(K.BEKLIYOR);
  });
  // Spec 0110 ile (R8, R9): payda gösterilebilir küme, teslim edilmiş kalıp sayılmaz; türdeş kümede sayı yazılmaz.
  it("AC-19: tek kalıpta ve türdeş kümede sayı yok; payda teslimi saymaz (spec 0110 ile)", () => {
    // 0. kalıbın form satırı bitmemiş (üretimde), 1. kalıp elle üretimde; 1. konumun satırı tamamlandı olduğu için elle değer kazanır.
    expect(pil(musteri([{ uretimFormId: 900 }, { uretimFormId: 900, kalipDurumu: K.URETIMDE }, { kalipDurumu: K.TESLIM }, { kalipDurumu: K.TESLIM }], { makinaDurumu: M.MONTAJ })).metin).toBe("KALIP ÜRETİMDE");
    expect(pil(musteri([{ uretimFormId: 900 }])).metin).toBe("KALIP ÜRETİMDE");
    expect(pil(musteri([{}, {}, {}, { kalipDurumu: K.URETIMDE }])).metin).toBe("KALIP ÜRETİMDE");
  });
  it("AC-20: hepsi teslim ya da kalıpsız kayıt pil taşımaz", () => {
    expect(pil(musteri([{ kalipDurumu: K.TESLIM }], { makinaDurumu: M.HAZIR }))).toBeNull();
    expect(pil(musteri([], { makinaDurumu: M.HAZIR }))).toBeNull();
  });
  // Spec 0110 ile (R1, R10): işaretsiz kalıp teslim türetir ve kapı kalktı; makina durumu dolu kayıtta da pil yok.
  it("AC-21: işaretsiz kalıp makina durumundan bağımsız pilsiz (spec 0110 ile); ileri durum çizilir, kalmazsa pil yok", () => {
    expect(pil(musteri([{}]))).toBeNull();
    expect(pil(musteri([{}], { makinaDurumu: M.TESLIM }))).toBeNull();
    expect(pil(musteri([{}, { kalipDurumu: K.URETIMDE }, { kalipDurumu: K.HAZIR }], {})).durum).toBe(K.URETIMDE);
    expect(pil(musteri([{}, { kalipDurumu: K.TESLIM }], {}))).toBeNull();
  });
  it("AC-22: en çok üç pil, sıra ödeme, makina, kalıp", () => {
    const d = MD.satirDurumu(musteri([{ uretimFormGonder: true }], { makinaDurumu: M.MONTAJ }), { harita, grup: new Map(), borclu: true });
    expect(d.piller.map(p => p.metin)).toEqual(["ÖDEME BEKLİYOR", "MONTAJ YAPILIYOR", "KALIP SİPARİŞ VERİLDİ"]);
  });
  it("AC-37: ayna satır kümeye girmez; payda 1, satış hazırsa pil hazır", () => {
    const ps = { id: 77, customerId: 1, tur: "Kalıp", uretimFormId: 900 };
    const grup = MD.extraKalipGrupla([ps, { id: 80, customerId: 1, tur: "Kalıp", deletedAt: "x" }, { id: 81, customerId: 1, tur: "Parça" }]);
    const m = musteri([{ ad: "Y", partSaleId: 77 }], { makinaDurumu: M.TESLIM });
    expect(MD.kalipKumesi(m, grup, harita)).toEqual([K.HAZIR]);
    expect(pil(m, grup).metin).toBe("KALIP HAZIR · TESLİM BEKLİYOR");
    expect(MD.aynaDurumu(m.kaliplar[0], m, grup, harita)).toBe(K.HAZIR);
  });
  it("R23: teslim bekleyen ölçütü makina hazır ya da kümede hazır kalıp", () => {
    expect(MD.satirDurumu(musteri([], { makinaDurumu: M.HAZIR }), {}).teslimBekliyor).toBe(true);
    expect(MD.satirDurumu(musteri([{ uretimFormId: 900 }], {}), { harita }).teslimBekliyor).toBe(false);
    expect(MD.satirDurumu({ id: 1, kaliplar: [{}, { uretimFormId: 900 }] }, { harita }).teslimBekliyor).toBe(true);
  });
  it("AC-40, AC-42: form listesi verilmezse çökmez; işaretsiz damgasız teslim (spec 0110 ile), işaretli gönderildi, damgalı bekliyor", () => {
    const h = MD.uretimFormHaritasi(undefined);
    expect(MD.kalipKumesi({ id: 1, kaliplar: [{}, { uretimFormGonder: true }, { uretimFormId: 3 }] }, undefined, h)).toEqual([K.TESLIM, K.GONDERILDI, K.BEKLIYOR]);
    expect(MD.satirDurumu({}, {}).piller).toEqual([]);
  });
  it("AC-29: 1000 müşteri ve 50 formda harita bir kez, toplam süre eşiğin altında", () => {
    const formlar = Array.from({ length: 50 }, (_, f) => ({ id: f + 1, satirlar: Array.from({ length: 20 }, (_, j) => ({ kaynakTip: "musteri", kaynakId: f * 20 + j, kalipIdx: 0, tamamlandi: j % 2 === 0 })) }));
    const musteriler = Array.from({ length: 1000 }, (_, i) => ({ id: i, makinaDurumu: M.MONTAJ, kaliplar: [{ uretimFormId: Math.floor(i / 20) + 1 }, {}, {}] }));
    const casus = vi.fn(MD.uretimFormHaritasi);
    const t0 = performance.now();
    const h = casus(formlar);
    const sonuc = musteriler.map(m => MD.satirDurumu(m, { harita: h, grup: new Map() }));
    const sure = performance.now() - t0;
    expect(casus).toHaveBeenCalledTimes(1);
    expect(sonuc[0].piller[1].metin).toBe("KALIP HAZIR · TESLİM BEKLİYOR"); // spec 0110 ile (R1, R8, R9): iki eski kalıp teslim, payda 1
    expect(sure).toBeLessThan(500);
  });
});

describe("Spec 0106: kaynak taramaları", () => {
  const EKRANLAR = ["src/components/Customers.jsx", "src/components/customers/CustomerAddEditForm.jsx", "src/components/customers/CustomerDetailModal.jsx",
    "src/components/customers/detail/MachineTimeline.jsx", "src/components/customers/DurumPili.jsx", "src/components/customers/DurumSecici.jsx"];
  it("AC-28 / AC-41 (C4, C4/2, R27): src/components'te durum dizesi yalnız üç gerekçeli istisnada; pil metni ve rengi yalnız kütüphanede", () => {
    const DIZE = /["'`](montaj|hazir|teslim|bekliyor|gonderildi|uretimde)["'`]/g;
    // Gerekçeli istisnalar (başka kavramlar, ölçüm 27): tahsis durumu anahtarı, teklif durumu, pano sütun anahtarı.
    const ISTISNA = {
      "src/components/stock/YedekParcaSatisTab.jsx": ["bekliyor"],
      "src/components/Documents.jsx": ["gonderildi"],
      "src/components/Dashboard.jsx": ["gonderildi"],
      "src/components/stock/PartiUretimPanosu.jsx": ["hazir"],
    };
    const bulunan = {};
    for (const f of tara("src/components")) {
      const m = [...kod(f).matchAll(DIZE)].map(x => x[1]);
      if (m.length) bulunan[f] = [...new Set(m)].sort();
    }
    expect(bulunan).toEqual(ISTISNA);
    for (const f of EKRANLAR) {
      const k = kod(f);
      expect(k, f).not.toMatch(/ÖDEME BEKLİYOR|MONTAJ YAPILIYOR|MAKİNA HAZIR|KALIP (SİPARİŞ|ÜRETİMDE|HAZIR)/);
      expect(k, f).not.toMatch(/\bPILLER\b|makinaPili\(|kalipPili\(|odemePili\(/); // pil kütüphanede seçilir, ekran yalnız çizer
      expect(k, f).not.toMatch(/kalipDurumu\s*===|makinaDurumu\s*===/);
    }
    expect(kod("src/components/Customers.jsx")).toMatch(/satirDurumu\(c, \{ \.\.\.durumBaglami, borclu: debtorIds\.has\(c\.id\) \}\)/);
  });
  it("AC-35 (R2/2, R6/2): uretimDurumuOf yalnız stokDurumu.js, Stok ekranı ve satisKaydi.js'te çağrılır", () => {
    const cagiran = tara("src").filter(f => /uretimDurumuOf\(/.test(kod(f))).sort();
    expect(cagiran).toEqual(["src/components/stock/MakinaStokTab.jsx", "src/lib/satisKaydi.js", "src/lib/stokDurumu.js"]);
  });
  it("AC-42 (R25): kütüphane React almaz, saat okumaz, veri yazmaz", () => {
    const k = kod("src/lib/musteriDurumu.js");
    expect(k).not.toMatch(/from "react"|new Date|Date\.now|today\(|yerelBugun|set[A-Z]\w*\(|localStorage|window\./);
    expect(k).not.toMatch(/^import /m);
  });
  it("AC-29 / R26/2: harita Customers'ta tek useMemo; form ve detay aynı bağlamı alır, kendileri kurmaz", () => {
    const c = kod("src/components/Customers.jsx");
    expect((c.match(/uretimFormHaritasi\(/g) || []).length).toBe(1);
    expect(c).toMatch(/const durumBaglami = useMemo\(\(\) => \(\{ harita: uretimFormHaritasi\(uretimFormlari\), grup: extraKalipGrupla\(partSales\) \}\), \[uretimFormlari, partSales\]\);/);
    expect((c.match(/durumBaglami=\{durumBaglami\}/g) || []).length).toBe(2);
    for (const f of EKRANLAR.filter(x => x !== "src/components/Customers.jsx")) expect(kod(f), f).not.toMatch(/uretimFormHaritasi|extraKalipGrupla/);
  });
  it("AC-40 / R31–R33: Customers prop'u [] varsayılanıyla alır; App kapısız geçirir", () => {
    expect(kod("src/components/Customers.jsx")).toMatch(/\n {2}uretimFormlari = \[\],\n/);
    expect(kod("src/App.jsx")).toMatch(/<Customers [^\n]*uretimFormlari=\{liveUretimFormlari\}/);
  });
  it("AC-30 (C2, C2/2): üç sütun dört noktada; customers ve part_sales okumaları alanı destructuring ile ayırır", () => {
    const db = oku("electron/db.cjs");
    expect(db).toMatch(/const CUSTOMERS_MAKINA_DURUMU_COLUMN = \[\["makinaDurumu", "TEXT"\]\];/);
    expect(db).toMatch(/const KALIP_DURUMU_COLUMN = \[\["kalipDurumu", "TEXT"\]\];/);
    for (const t of ['"customers", CUSTOMERS_MAKINA_DURUMU_COLUMN', '"customer_kaliplar", KALIP_DURUMU_COLUMN', '"part_sales", KALIP_DURUMU_COLUMN']) expect(db).toContain(`ensureColumns(conn, ${t})`);
    // Spec 0114 ile: okuma ihraç işaretini de destructuring ile ayırır (aynı desen, bir alan daha).
    expect(db).toMatch(/map\(\(\{ tevkifatli, tevkifatPay, tevkifatPayda, makinaDurumu, (?:ihracKayitli, )?\.\.\.c \}\) => \(\{\n\s+\.\.\.c,\n(?:\s+\.\.\.ihracOku\(ihracKayitli\),[^\n]*\n)?\s+\.\.\.\(makinaDurumu \? \{ makinaDurumu \} : \{\}\),/);
    expect(db).toMatch(/tevkifatPayda, kalipDurumu, (?:ihracKayitli, )?\.\.\.rest \} = row;\n\s+return \{ \.\.\.rest, \.\.\.\(kalipDurumu \? \{ kalipDurumu \} : \{\}\)/);
    expect(db).toMatch(/if \(k\.kalipDurumu\) item\.kalipDurumu = k\.kalipDurumu;/);
  });
  it("AC-32 (R30, C1): yeni izin, alan denetimi, kilit ve birleştirme kuralı yok", () => {
    expect(kod("src/components/settings/serverPermissionDefs.js")).not.toMatch(/makinaDurumu|kalipDurumu|0106/);
    expect(ALAN_IZINLERI.customers).toBeUndefined();
    expect(Object.keys(ALAN_IZINLERI).sort()).toEqual(["partSales", "services", "yedekParcaSatislar"]);
    expect(ALAN_IZINLERI.partSales.map(a => a.alan)).toEqual(["kargoDurum"]);
    expect(Object.keys(KILIT_ALANLARI)).not.toContain("musteri_durumu");
    expect(MERGE_KEYS).toContain("customers");
    for (const f of ["src/lib/merge.js", "electron/serverAuth.cjs", "src/lib/kilitAlanlari.js"]) expect(kod(f), f).not.toMatch(/makinaDurumu|kalipDurumu/);
  });
  it("AC-34 (R28, X8): yazdırma ve dışa aktarma dosyaları durum alanlarını okumaz", () => {
    for (const f of ["src/lib/printTemplates.js", "src/lib/aylikRapor.js", "src/lib/giderRaporu.js", "src/components/settings/SettingsExport.jsx"]) {
      expect(kod(f), f).not.toMatch(/makinaDurumu|kalipDurumu|musteriDurumu/);
    }
  });
  it("AC-43 (R22/2, X13): paylaşılan rozet açılmadı; Stok rozeti aynı; sözlükte borç maddesi", () => {
    expect(kod("src/components/tasarim.jsx")).not.toMatch(/Rozet|DurumPili/);
    const stok = oku("src/components/stock/MakinaStokTab.jsx");
    expect(stok).toContain('const Rozet = ({ tur, children, testId }) => (\n  <span data-testid={testId} style={{ ...ROZET[tur], display: "inline-block", fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>{children}</span>\n);');
    const s = oku("docs/tasarim-sozlugu.md");
    const borc = s.slice(s.indexOf("## Bilinen borç"));
    expect(borc).toMatch(/Rozet \(durum pili\), spec 0106/);
    expect(borc).toContain("src/components/customers/DurumPili.jsx");
    expect(borc).toContain("Üçüncü kopya yazılmadan önce rozet sözlüğe taşınır");
  });
  it("C5, C6: pil metinlerinde 'MAKİNA' ve orta nokta ayraç", () => {
    const metinler = Object.values(MD.PILLER).map(p => p.metin);
    expect(metinler.join(" ")).not.toMatch(/MAKİNE| - /);
    expect(MD.PILLER.hazir.metin).toBe("KALIP HAZIR · TESLİM BEKLİYOR");
  });
});
