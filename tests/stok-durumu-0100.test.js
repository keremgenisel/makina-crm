// Spec 0100: üretim durumu motoru (src/lib/stokDurumu.js) ve kaynak taramaları. Ekran kriterleri tests/ui/stok-durumu-0100*.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  URETIM_DURUMU, DURUM_ADLARI, uretimDurumuOf, uretimDurumuYaz, stokDurumOzeti, durumSuzgeciUyar, suzgecSayisi, kutuModelleri, kutuAltSatiri,
  serisizDusulecek, serisizSecenekMetni, seriliSecenekMetni, panoVarsayilanParti, partiUretimOzeti, MODEL_YOK, partiSecenekAdi,
} from "../src/lib/stokDurumu";
import { makinaListesi } from "../src/lib/makinaMaliyeti";
import { partiGenelPaylari } from "../src/lib/makinaStandartMaliyet";
import * as V90 from "./fixtures/0090-veri";

const kok = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(kok, p), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const KAPALI = { id: 901, ad: "2026-1", baslangicAy: "2026-06", bitisAy: "2026-08" };
const ACIK = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100: 6, AK120_DSC: 3 } };
const COPTE = { id: 903, ad: "Çöpte", baslangicAy: "2026-01", bitisAy: "2026-02", deletedAt: "2026-10-01T10:00:00.000Z" };
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S${id}`, addedDate: "2026-09-01", ...o });

describe("Spec 0100: durum alanı (R1–R4/2, Karar 12)", () => {
  it("AC-2 / AC-43 (R1/2, R3): tek okuma yolu; durumsuz ve tanınmayan değer satışa hazır", () => {
    expect(URETIM_DURUMU).toEqual({ MONTAJ: "montaj", HAZIR: "hazir" });
    expect(DURUM_ADLARI).toEqual({ montaj: "Montajda", hazir: "Satışa hazır" });
    expect(uretimDurumuOf({})).toBe("hazir");
    expect(uretimDurumuOf({ uretimDurumu: "hazir" })).toBe("hazir");
    expect(uretimDurumuOf({ uretimDurumu: "montaj" })).toBe("montaj");
    expect(uretimDurumuOf({ uretimDurumu: "kalite" })).toBe("hazir");
  });
  it("AC-3 / AC-43 (R1/2): yazım yalnız iki değeri yazar, başka değer anahtarı siler", () => {
    expect(uretimDurumuYaz({ id: 1 }, "hazir")).toEqual({ id: 1, uretimDurumu: "hazir" });
    expect(uretimDurumuYaz({ id: 1, uretimDurumu: "montaj" }, "hazir")).toEqual({ id: 1, uretimDurumu: "hazir" });
    expect(uretimDurumuYaz({ id: 1, uretimDurumu: "montaj" }, "")).toEqual({ id: 1 });
    expect("uretimDurumu" in uretimDurumuYaz({ id: 1 }, "kalite")).toBe(false);
  });
});

describe("Spec 0100: önceki partiden kalan makina (R9–R12)", () => {
  const ozet = (stock, partiler = [KAPALI, ACIK]) => stokDurumOzeti({ stock, customers: [], uretimPartileri: partiler });
  it("AC-11 / AC-12 / AC-13: kapanmış partide işaret, açık partide ve partisizde yok", () => {
    const o = ozet([stk(1, { partiId: 901 }), stk(2, { partiId: 902 }), stk(3)]);
    expect(o.satirlar.get(1).onceki).toBe(true);
    expect(o.satirlar.get(2).onceki).toBe(false);
    expect(o.satirlar.get(3).onceki).toBe(false);
  });
  it("AC-14 / AC-50: çöpteki partide ve kaydı bulunamayan partide işaret yok; kimlik dizeyle karşılaştırılır", () => {
    const o = ozet([stk(1, { partiId: 903 }), stk(2, { partiId: 999 }), stk(3, { partiId: "901" })], [KAPALI, ACIK, COPTE]);
    expect(o.satirlar.get(1).onceki).toBe(false);
    expect(o.satirlar.get(2).onceki).toBe(false);
    expect(o.satirlar.get(3).onceki).toBe(true);
  });
  it("AC-15: parti yeniden açılınca (bitiş ayı silinince) işaret kalkar; satır değişmez", () => {
    const s = stk(1, { partiId: 901 });
    expect(ozet([s]).satirlar.get(1).onceki).toBe(true);
    expect(ozet([s], [{ ...KAPALI, bitisAy: null }]).satirlar.get(1).onceki).toBe(false);
    expect(s).toEqual(stk(1, { partiId: 901 }));
  });
  it("AC-17 (R12): kapanmış partide montajdaki makina iki işareti birden taşır", () => {
    expect(ozet([stk(1, { partiId: 901, uretimDurumu: "montaj" })]).satirlar.get(1)).toEqual({ durum: "montaj", onceki: true });
  });
});

describe("Spec 0100: stok özeti ve süzgeç (R15–R16/2, R25–R26/2)", () => {
  const STOK = [stk(1, { uretimDurumu: "montaj" }), stk(2, { uretimDurumu: "hazir", partiId: 901 }), stk(3), stk(4, { model: "AK120_DSC", uretimDurumu: "montaj", partiId: 901 }),
    stk(5, { model: "AK200" }), stk(6, { model: "AK300" }), stk(7, { model: "AK300" }), stk(8, { model: "" })];
  const o = stokDurumOzeti({ stock: STOK, customers: [], uretimPartileri: [KAPALI, ACIK] });
  it("AC-10: toplam, montajda, satışa hazır ve önceki partiden kalan", () => {
    expect([o.toplam, o.montajda, o.hazir, o.oncekiParti]).toEqual([8, 2, 6, 2]);
  });
  it("Karar 9, plan P11: model satırları satışa hazıra göre azalan, eşitlikte ada; modelsiz satır 'model girilmemiş'", () => {
    expect(o.modeller.map(m => [m.model, m.hazir, m.montajda])).toEqual([["AK100", 2, 1], ["AK300", 2, 0], ["AK200", 1, 0], ["model girilmemiş", 1, 0], ["AK120_DSC", 0, 1]]);
    expect(MODEL_YOK).toBe("model girilmemiş");
  });
  it("AC-30 / AC-58 (R26/2): kutuda en çok üç model, yalnız satışa hazırı olanlar; kalan sayısı satışa hazırı olanlardan", () => {
    const k = kutuModelleri(o);
    expect(k.liste.map(m => m.model)).toEqual(["AK100", "AK300", "AK200"]);
    expect(k.kalan).toBe(1);
    expect(kutuAltSatiri(o)).toBe("2 montajda · 2 önceki partiden");
  });
  it("AC-31: üçten az modelde kalan yok; boş stok sıfır", () => {
    expect(kutuModelleri(stokDurumOzeti({ stock: [stk(1)] })).kalan).toBe(0);
    const bos = stokDurumOzeti({ stock: [] });
    expect([bos.toplam, bos.hazir, kutuModelleri(bos).liste.length]).toEqual([0, 0, 0]);
  });
  it("AC-6 / AC-8 (R15/3): süzgeç koşulu ve süzgeç sayıları aynı satır durumundan", () => {
    const uyan = (suzgec) => STOK.filter(s => durumSuzgeciUyar(o.satirlar.get(s.id), suzgec)).length;
    for (const sz of ["tumu", "montaj", "hazir", "onceki"]) expect(uyan(sz), sz).toBe(suzgecSayisi(o, sz));
  });
  it("R31/2: motor çöpteki stok satırını saymaz (savunma; çağıranlar canlı dizi verir)", () => {
    expect(stokDurumOzeti({ stock: [stk(1), stk(2, { deletedAt: "2026-10-01" })] }).toplam).toBe(1);
  });
});

describe("Spec 0100: serisiz satış (R6/2, R6/3, plan P3)", () => {
  const SERISIZ = [stk(1, { serialNo: "", addedDate: "2026-09-10", uretimDurumu: "montaj" }), stk(2, { serialNo: "", addedDate: "2026-09-05" }),
    stk(3, { serialNo: "", addedDate: "2026-08-01", uretimDurumu: "montaj" }), stk(4, { serialNo: "", addedDate: "2026-09-01" }), stk(5, { serialNo: "S5" })];
  it("AC-51: satışa hazır olanların en eskisi düşer; hazır yoksa montajdakilerin en eskisi", () => {
    expect(serisizDusulecek(SERISIZ, "AK100").id).toBe(4);
    expect(serisizDusulecek(SERISIZ.filter(s => s.id !== 2 && s.id !== 4), "AK100").id).toBe(3);
    expect(serisizDusulecek(SERISIZ, "AK200")).toBeNull();
  });
  it("AC-51 (plan P3): eşit tarihte dizide daha sonra duran (daha eski eklenen) düşer; çöpteki satır aday değildir", () => {
    const esit = [stk(10, { serialNo: "", addedDate: "2026-09-01" }), stk(11, { serialNo: "", addedDate: "2026-09-01" })];
    expect(serisizDusulecek(esit, "AK100").id).toBe(11);
    expect(serisizDusulecek([stk(12, { serialNo: "", addedDate: "2026-01-01", deletedAt: "2026-10-01" }), stk(13, { serialNo: "" })], "AK100").id).toBe(13);
  });
  it("AC-52 / AC-18: serisiz seçenek metni kırılımı yazar; serili seçenekte durum adı", () => {
    expect(serisizSecenekMetni(SERISIZ, "AK100")).toBe("Seri no'suz stoktan düş: 2 satışa hazır, 2 montajda");
    expect(serisizSecenekMetni([stk(1, { serialNo: "" })], "AK100")).toBe("Seri no'suz stoktan düş: 1 satışa hazır");
    expect(seriliSecenekMetni(stk(5, { uretimDurumu: "montaj" }))).toBe("S5 · Montajda");
    expect(seriliSecenekMetni(stk(5))).toBe("S5 · Satışa hazır");
  });
});

describe("Spec 0100: parti üretim panosu (R18–R24, Karar 22)", () => {
  const STOK = [stk(1, { partiId: 902, uretimDurumu: "montaj" }), stk(2, { partiId: 902 }), stk(3, { partiId: 902, model: "AK120_DSC" }),
    stk(4, { partiId: 902, model: "AK300" }), stk(5, { partiId: 901 }), stk(6)];
  const MUS = [{ id: 1, model: "AK100", partiId: 902 }, { id: 2, model: "ak100", partiId: 902, oncekiSahipler: [{ name: "Eski" }] },
    { id: 3, model: "AK100", partiId: 902, deletedAt: "2026-10-01" }, { id: 4, model: "AK100", partiId: 901 }];
  const veri = { stock: STOK, customers: MUS, uretimPartileri: [KAPALI, ACIK] };
  it("AC-21 / AC-22: beş sayı; satılan partiye bağlı canlı müşteri kayıtlarından, devredilmiş makina bir kez", () => {
    const p = partiUretimOzeti(veri, 902);
    // Triyaj (bulgu 1): planı girilmemiş AK300 üretildiği için (planlanan 0, R24) satırı ve toplamı işaretli (R21).
    expect(p.toplam).toEqual({ planlanan: 9, montajda: 1, hazir: 3, satildi: 2, kalan: 4, fazla: true });
    expect(p.satirlar.find(r => r.model === "AK100")).toMatchObject({ planlanan: 6, montajda: 1, hazir: 1, satildi: 2, kalan: 2 });
  });
  it("AC-24 / AC-57 (R19/2, R19/3): planı olmayan model üretilenlerden çizilir; sıralama planlanana göre azalan, eşitlikte ad; modelsiz satır", () => {
    const p = partiUretimOzeti({ ...veri, stock: [...STOK, stk(7, { partiId: 902, model: "" })] }, 902);
    expect(p.satirlar.map(r => [r.model, r.planlanan])).toEqual([["AK100", 6], ["AK120_DSC", 3], ["AK300", 0], ["model girilmemiş", 0]]);
    // Triyaj (bulgu 1): planı girilmemiş ama üretilmiş model R21 gereği işaretlenir; planlananına açıkça 0 yazılmış modelle aynı sonuç.
    expect(p.satirlar.find(r => r.model === "AK300")).toMatchObject({ planlanan: 0, hazir: 1, kalan: 0, fazla: true });
    const sifirPlan = partiUretimOzeti({ ...veri, uretimPartileri: [{ ...ACIK, planlananAdetler: { ...ACIK.planlananAdetler, AK300: 0 } }] }, 902);
    expect(sifirPlan.satirlar.find(r => r.model === "AK300")).toMatchObject({ planlanan: 0, kalan: 0, fazla: true });
    expect(p.satirlar.find(r => r.model === "model girilmemiş")).toMatchObject({ hazir: 1, fazla: true });
  });
  it("AC-23 / AC-55 (Karar 22): plandan fazla üretilen model kırpılır ve işaretlenir; toplam kalan eksik modelinkini gösterir", () => {
    const fazla = [1, 2, 3, 4, 5, 6, 7, 8].map(i => stk(100 + i, { partiId: 902 }));
    const p = partiUretimOzeti({ stock: fazla, customers: [], uretimPartileri: [ACIK] }, 902);
    expect(p.satirlar.find(r => r.model === "AK100")).toMatchObject({ planlanan: 6, hazir: 8, kalan: 0, fazla: true });
    expect(p.satirlar.find(r => r.model === "AK120_DSC")).toMatchObject({ planlanan: 3, kalan: 3, fazla: false });
    expect(p.toplam).toMatchObject({ kalan: 3, fazla: true });
  });
  it("AC-25: planı ve makinası olmayan parti boş; bilinmeyen parti boş", () => {
    expect(partiUretimOzeti({ stock: [], customers: [], uretimPartileri: [{ id: 5, ad: "Boş", baslangicAy: "2026-10" }] }, 5).bos).toBe(true);
    expect(partiUretimOzeti(veri, 404).bos).toBe(true);
  });
  it("AC-56 (plan P9): en son başlayan açık parti; açık yoksa en son başlayan canlı parti; hiç yoksa null", () => {
    expect(panoVarsayilanParti([KAPALI, ACIK, { id: 904, ad: "Eski açık", baslangicAy: "2026-03", bitisAy: null }]).id).toBe(902);
    expect(panoVarsayilanParti([KAPALI, { id: 905, ad: "Daha eski", baslangicAy: "2026-01", bitisAy: "2026-02" }]).id).toBe(901);
    expect(panoVarsayilanParti([COPTE])).toBeNull();
  });
});

describe("Spec 0100: maliyet zinciri değişmez (R8, C4)", () => {
  it("AC-20: durumu değişen makina için makina listesi ve parti payları aynı", () => {
    const durumlu = V90.STOCK.map((s, i) => ({ ...s, uretimDurumu: i % 2 ? "montaj" : "hazir" }));
    const once = partiGenelPaylari(V90.veri(), V90.BUGUN);
    const sonra = partiGenelPaylari(V90.veri({ stock: durumlu }), V90.BUGUN);
    expect(JSON.stringify(sonra)).toBe(JSON.stringify(once));
    const temizle = (l) => l.map(({ kaynak, ...m }) => ({ ...m, id: m.id }));
    expect(temizle(makinaListesi({ customers: V90.CUSTOMERS, stock: durumlu })).length).toBe(makinaListesi({ customers: V90.CUSTOMERS, stock: V90.STOCK }).length);
    expect(JSON.stringify(makinaListesi({ customers: V90.CUSTOMERS, stock: durumlu }).map(m => [m.id, m.uretimTarihi, m.partiId])))
      .toBe(JSON.stringify(makinaListesi({ customers: V90.CUSTOMERS, stock: V90.STOCK }).map(m => [m.id, m.uretimTarihi, m.partiId])));
  });
  it("C4: maliyet motorları üretim durumunu okumaz", () => {
    for (const f of ["src/lib/makinaMaliyeti.js", "src/lib/makinaStandartMaliyet.js"]) expect(oku(f)).not.toMatch(/uretimDurumu|stokDurumu/);
  });
});

describe("Spec 0100: kaynak taramaları", () => {
  it("AC-62 (C5, R9/2): motor kapanmış parti için partiAcikMi'yi çağırır; kaynakta yeni bir !p.bitisAy karşılaştırması yok", () => {
    const m = yorumsuz(oku("src/lib/stokDurumu.js"));
    expect(m).toMatch(/import \{[^}]*\bpartiAcikMi\b[^}]*\} from "\.\/uretimPartisi"/);
    expect(m).not.toMatch(/bitisAy\s*\)|!\s*\w+\??\.bitisAy/);
    // Bugünkü kopyalar dışında `!p.bitisAy` yok. Spec ölçüm 7 iki kopya sayıyordu; uygulama turunda dört dosya ölçüldü: kuralın
    // kendisi (uretimPartisi.js), 0090'ın motoru (X9), eski maliyet motoru (makinaMaliyeti.js, 0089'dan beri çağıranı yok) ve
    // Üretim Partileri ekranının "açık" etiketi. Hepsi aynı ifade; bu işte değiştirilmez, yeni kopya taramayı kırar.
    const src = (d) => fs.readdirSync(path.join(kok, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? src(path.join(d, e.name)) : /\.(js|jsx)$/.test(e.name) ? [path.join(d, e.name)] : []);
    const kopyalar = src("src").filter(f => /!\s*p\??\.bitisAy/.test(yorumsuz(oku(f)))).map(f => f.split(path.sep).join("/")).sort();
    expect(kopyalar).toEqual(["src/components/gider/UretimPartileri.jsx", "src/lib/makinaMaliyeti.js", "src/lib/makinaStandartMaliyet.js", "src/lib/uretimPartisi.js"]);
  });
  it("C1, C11, R1/2: ekranlar durumu kendileri okumaz ve saymaz; dize karşılaştırması yok, motor çağrılır", () => {
    const EKRANLAR = ["src/components/stock/MakinaStokTab.jsx", "src/components/stock/PartiUretimPanosu.jsx", "src/components/Dashboard.jsx",
      "src/components/customers/CustomerAddEditForm.jsx", "src/components/Customers.jsx", "src/components/Stock.jsx"];
    for (const f of EKRANLAR) {
      const k = yorumsuz(oku(f));
      expect(k, f).not.toMatch(/\.uretimDurumu\b/);
      // Dize KARŞILAŞTIRMASI yasak (R1/2); özet alanlarının anahtar adları ("hazir" sayısı) serbest.
      expect(k, f).not.toMatch(/[=!]==?\s*["'](montaj|hazir)["']|["'](montaj|hazir)["']\s*[=!]==?/);
      // Triyaj (bulgu 2): üçlü ifadeyle yazılmış "açık parti" ölçütü de (`x.bitisAy ? …`) yakalanır.
      expect(k, f).not.toMatch(/bitisAy\s*\)|!\s*\w+\??\.bitisAy|\.bitisAy\s*\?/);
    }
    expect(yorumsuz(oku("src/components/stock/MakinaStokTab.jsx"))).toMatch(/stokDurumOzeti\(/);
    expect(yorumsuz(oku("src/components/Dashboard.jsx"))).toMatch(/stokDurumOzeti\(/);
    const pano = yorumsuz(oku("src/components/stock/PartiUretimPanosu.jsx"));
    expect(pano).toMatch(/partiUretimOzeti\(/);
    expect(pano).not.toMatch(/\b(stock|customers)\s*\.\s*(filter|reduce|map|length|forEach)/);
  });
  it("AC-60 (R30/2, C13): Dashboard parti listesini yalnız motora verir (parti adı okunmaz); App kapısız verir, Customers'a yalnız gider yetkisiyle", () => {
    const d = yorumsuz(oku("src/components/Dashboard.jsx"));
    expect(d).toMatch(/uretimPartileri = \[\]/);
    expect(d).not.toMatch(/uretimPartileri\s*\.\s*(map|find|filter|some|forEach)/);
    expect(d.match(/uretimPartileri/g)).toHaveLength(3); // prop, motor çağrısı, useMemo bağımlılığı
    const satirOf = (etiket) => oku("src/App.jsx").split("\n").filter(l => l.includes(`<${etiket} `));
    expect(satirOf("Dashboard")).toHaveLength(1);
    expect(satirOf("Dashboard")[0]).toContain("uretimPartileri={liveUretimPartileri}");
    expect(satirOf("Customers")).toHaveLength(1);
    expect(satirOf("Customers")[0]).toContain("uretimPartileri={giderYetki ? liveUretimPartileri : []}");
  });
  it("triyaj bulgu 2 (C5): parti seçicilerinin '(açık)' eki partiAcikMi'den; üç seçici aynı yardımcıyı çağırır", () => {
    expect(partiSecenekAdi({ ad: "P1", bitisAy: null })).toBe("P1 (açık)");
    expect(partiSecenekAdi({ ad: "P1", bitisAy: "2026-08" })).toBe("P1");
    for (const f of ["src/components/stock/PartiUretimPanosu.jsx", "src/components/customers/CustomerAddEditForm.jsx", "src/components/stock/MakinaStokTab.jsx"]) {
      expect(yorumsuz(oku(f)), f).toMatch(/partiSecenekAdi\(/);
      expect(yorumsuz(oku(f)), f).not.toMatch(/\(açık\)/);
    }
  });
  it("triyaj bulgu 6: süzgeç rozet özeti useMemo içinde, bağımlılıkları stok, arama, model süzgeci ve parti listesi", () => {
    expect(oku("src/components/stock/MakinaStokTab.jsx")).toMatch(/const suzgecOzeti = useMemo\(\(\) => stokDurumOzeti\(\{ stock: oncesi, uretimPartileri \}\), \[stock, search, modelFilter, uretimPartileri\]\);/);
  });
});
