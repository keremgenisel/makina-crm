// Spec 0065: parça stoğu çakışmada korunsun. Saf birleştirme planı (buildMergePlan + stokEtkisi), karşı hareket, net
// düşüm, tutarlılık raporu ve kaynak taramaları. Uçtan uca App birleştirmesi tests/ui/stok-birlestirme.test.jsx'te.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildMergePlan, MERGE_KEYS } from "../src/lib/merge";
import { uid, totalMiktar, clearMintedIds } from "../src/lib/utils";
import {
  stokEtkisi, stokuUygula, netDusum, netDusumleri, karsiHareketler, stokTutarliligi, netDusumAyni, IADE_TIPI,
  hareketTipAdi, TUTARLILIK_NOTU,
} from "../src/lib/stokHareketi";
import { servisParcaDus, servisParcaGeriAl, servisParcaYenile } from "../src/lib/servisStok";
import { yedekParcaDus, yedekParcaGeriAl } from "../src/lib/yedekParcaStok";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const dosyalar = (d) => readdirSync(path.join(kok, d)).flatMap(f => {
  const y = path.join(d, f);
  return statSync(path.join(kok, y)).isDirectory() ? dosyalar(y) : /\.(js|jsx)$/.test(f) ? [y] : [];
});
const holder = (init) => { let s = init; return { set: (u) => { s = typeof u === "function" ? u(s) : u; }, get: () => s }; };

// Ortak başlangıç: parça 7'den 10, parça 8'den 4 adet; log boş (sunucunun son kaydettiği hâl).
const TABAN = { partStock: [{ id: 1, partId: "7", miktar: 10 }, { id: 2, partId: "8", miktar: 4 }], partStockLog: [] };
// İki kullanıcı: A servis (−3), B yedek parça satışı (−2). B önce kaydeder; A çakışma alır.
const yaris = () => {
  clearMintedIds();
  const bLog = { id: 9001, partId: "7", miktar: -2, tip: "bayi_satis", referansId: 501, tarih: "2026-10-01" };
  const sunucu = { partStock: [{ id: 1, partId: "7", miktar: 8 }, { id: 2, partId: "8", miktar: 4 }], partStockLog: [bLog], services: [], yedekParcaSatislar: [{ id: 501 }] };
  const aLog = { id: uid(), partId: "7", miktar: -3, tip: "servis", referansId: 777, tarih: "2026-10-01" };
  const yerel = { partStock: [{ id: 1, partId: "7", miktar: 7 }, { id: 2, partId: "8", miktar: 4 }], partStockLog: [aLog], services: [{ id: 777 }], yedekParcaSatislar: [] };
  return { sunucu, yerel, aLog, bLog };
};

describe("Spec 0065 A: stok hareketi birleşir", () => {
  it("AC-1: iki kullanıcının (servis + yedek parça satışı) düşümü de uygulanır", () => {
    const { sunucu, yerel } = yaris();
    const plan = buildMergePlan(yerel, sunucu);
    const sonuc = stokuUygula(sunucu.partStock, plan.stokEtkisi);
    expect(totalMiktar(sonuc, "7")).toBe(5); // 10 − 2 (B) − 3 (A)
  });
  it("AC-2: log her iki hareketi de taşır", () => {
    const { sunucu, yerel, aLog, bLog } = yaris();
    const plan = buildMergePlan(yerel, sunucu);
    const log = [...sunucu.partStockLog, ...plan.adds.partStockLog];
    expect(log.map(l => l.id)).toEqual([bLog.id, aLog.id]);
  });
  it("AC-3: kaybeden tarafın düşümü kazananın üstüne yazmaz; adet ikisinin toplamı kadar azalır", () => {
    const { sunucu, yerel } = yaris();
    const plan = buildMergePlan(yerel, sunucu);
    // Eski davranış (yerel mutlak adet 7 ya da sunucu adedi 8) ikisi de yanlıştır.
    const sonuc = totalMiktar(stokuUygula(sunucu.partStock, plan.stokEtkisi), "7");
    expect(sonuc).not.toBe(7);
    expect(sonuc).not.toBe(8);
    expect(10 - sonuc).toBe(2 + 3);
  });
  it("AC-4: yeniden hesap yalnız bu birleştirmede hareketi olan parçalara uygulanır", () => {
    const { sunucu, yerel } = yaris();
    const plan = buildMergePlan(yerel, sunucu);
    expect([...plan.stokEtkisi.keys()]).toEqual(["7"]);
    const once = sunucu.partStock.find(s => s.partId === "8");
    expect(stokuUygula(sunucu.partStock, plan.stokEtkisi).find(s => s.partId === "8")).toBe(once);
  });
  it("AC-6: eklenen hareketlerden biri sayım düzeltmesiyse sonuç o değerden başlar, sonraki farklar ona uygulanır", () => {
    const e = stokEtkisi([
      { partId: "7", miktar: -3, tip: "servis" },
      { partId: "7", miktar: 20, tip: "manuel_duzelt" },
      { partId: "7", miktar: -1, tip: "bayi_satis" },
      { partId: "7", miktar: 5, tip: "stok_girisi" },
    ]);
    expect(e.get("7")).toEqual({ mutlak: 20, fark: 4 });
    expect(totalMiktar(stokuUygula([{ id: 1, partId: "7", miktar: 999 }], e), "7")).toBe(24);
  });
  it("AC-7: aynı log kaydı iki kez eklenmez; iki PC aynı kimliği ürettiyse bugünkü yeniden kimliklendirme işler", () => {
    clearMintedIds();
    const ortak = { id: 42, partId: "7", miktar: -1, tip: "servis", referansId: 1, tarih: "2026-10-01" };
    expect(buildMergePlan({ partStockLog: [ortak] }, { partStockLog: [ortak] }).adds.partStockLog).toEqual([]);
    const benim = { id: uid(), partId: "7", miktar: -2, tip: "servis", referansId: 2, tarih: "2026-10-01" };
    const plan = buildMergePlan({ partStockLog: [benim] }, { partStockLog: [{ ...benim, partId: "8", miktar: -5 }] });
    expect(plan.adds.partStockLog).toHaveLength(1);
    expect(plan.adds.partStockLog[0].id).not.toBe(benim.id);
    expect(plan.adds.partStockLog[0]).toMatchObject({ partId: "7", miktar: -2 });
  });
  it("AC-22 (R15): yalnız bağı (referansId) ya da notu değişmiş log satırı yeni kimlikle eklenmez", () => {
    clearMintedIds();
    const satir = { id: uid(), partId: "7", miktar: -2, tip: "makina_uretimi", referansId: 100, tarih: "2026-09-01", notlar: "AK100" };
    const plan = buildMergePlan({ partStockLog: [{ ...satir, referansId: 200, notlar: "taşındı" }] }, { partStockLog: [satir] });
    expect(plan.adds.partStockLog).toEqual([]);
    expect(plan.stokEtkisi.size).toBe(0);
  });
  it("AC-27 (R20): birleştirme sonucu adet 0'ın altına inmez", () => {
    const e = stokEtkisi([{ partId: "7", miktar: -9, tip: "servis" }]);
    expect(totalMiktar(stokuUygula([{ id: 1, partId: "7", miktar: 4 }], e), "7")).toBe(0);
  });
  // Triyaj (bulgu 1): "eklenen" = sunucuda olmayan VE son yükleme/kayıtta sunucuda olduğu bilinmeyen satır.
  it("Triyaj 1: sunucuda silinmiş (eski istemcinin geri aldığı) satır diriltilmez, stok yeniden düşülmez", () => {
    clearMintedIds();
    const eski = { id: 3001, partId: "7", miktar: -3, tip: "servis", referansId: 777, tarih: "2026-09-30" };
    const yeni = { id: uid(), partId: "7", miktar: 5, tip: "stok_girisi", referansId: null, tarih: "2026-10-01" };
    const sunucu = { partStock: [{ id: 1, partId: "7", miktar: 10 }], partStockLog: [] }; // eski istemci satırı sildi, 3'ü iade etti
    const plan = buildMergePlan({ partStockLog: [eski, yeni] }, sunucu, { bilinenLogIdleri: new Set([3001]) });
    expect(plan.adds.partStockLog.map(l => l.id)).toEqual([yeni.id]);
    expect(totalMiktar(stokuUygula(sunucu.partStock, plan.stokEtkisi), "7")).toBe(15); // 10 + 5, −3 yeniden uygulanmaz
  });
  it("Triyaj 1: başka PC'de yedekten geri yüklenen log'a, yedekten sonra yazılmış bilinen hareketler geri eklenmez", () => {
    clearMintedIds();
    const yedektenOnce = { id: 4001, partId: "7", miktar: 10, tip: "stok_girisi", tarih: "2026-09-01" };
    const yedektenSonra1 = { id: 4002, partId: "7", miktar: -2, tip: "bayi_satis", referansId: 50, tarih: "2026-09-20" };
    const yedektenSonra2 = { id: 4003, partId: "7", miktar: -1, tip: "servis", referansId: 51, tarih: "2026-09-25" };
    const yerelYeni = { id: uid(), partId: "7", miktar: -4, tip: "servis", referansId: 52, tarih: "2026-10-01" };
    const sunucu = { partStock: [{ id: 1, partId: "7", miktar: 10 }], partStockLog: [yedektenOnce] }; // yedek hâline döndü
    const plan = buildMergePlan({ partStockLog: [yedektenOnce, yedektenSonra1, yedektenSonra2, yerelYeni] }, sunucu,
      { bilinenLogIdleri: new Set([4001, 4002, 4003]) });
    expect(plan.adds.partStockLog.map(l => l.id)).toEqual([yerelYeni.id]);
    expect(totalMiktar(stokuUygula(sunucu.partStock, plan.stokEtkisi), "7")).toBe(6);
  });
  // Triyaj (bulgu 3): yeni kimlik alan servis / yedek parça satışının log bağı da yeni kimliği izler.
  it("Triyaj 3: kimlik çakışmasında yeniden atanan servis ve yedek parça satışının log satırları yeni kimliğe bağlanır", () => {
    clearMintedIds();
    const svId = uid(), ypId = uid();
    const yerel = {
      services: [{ id: svId, customerId: 1, type: "A" }],
      yedekParcaSatislar: [{ id: ypId, partId: "7", miktar: 1 }],
      partStockLog: [
        { id: uid(), partId: "7", miktar: -2, tip: "servis", referansId: svId, tarih: "2026-10-01" },
        { id: uid(), partId: "7", miktar: -1, tip: "bayi_satis", referansId: ypId, tarih: "2026-10-01" },
        { id: uid(), partId: "7", miktar: 1, tip: "bayi_satis_iade", referansId: ypId, tarih: "2026-10-01" },
      ],
    };
    const sunucu = { services: [{ id: svId, customerId: 9, type: "B" }], yedekParcaSatislar: [{ id: ypId, partId: "8", miktar: 5 }], partStockLog: [] };
    const plan = buildMergePlan(yerel, sunucu);
    const yeniSv = plan.maps.services.get(svId), yeniYp = plan.maps.yedekParcaSatislar.get(ypId);
    expect(yeniSv).toBeTruthy();
    expect(yeniYp).toBeTruthy();
    expect(plan.adds.partStockLog.map(l => l.referansId)).toEqual([yeniSv, yeniYp, yeniYp]);
    expect(netDusum(plan.adds.partStockLog, yeniSv, "servis", "7")).toBe(2);
  });
  it("AC-17: makina stoğu ve parça adedi birleştirilen bölümlerde değil; partStockLog birleşir", () => {
    expect(MERGE_KEYS).toContain("partStockLog");
    expect(MERGE_KEYS).not.toContain("partStock");
    expect(MERGE_KEYS).not.toContain("stock");
  });
});

describe("Spec 0065 B: log yalnız büyür", () => {
  it("AC-21 (R14): karşı hareket ayrı tiptedir; net düşüm = düşüm − iade", () => {
    const log = [
      { id: 1, partId: "7", miktar: -4, tip: "servis", referansId: 5 },
      { id: 2, partId: "7", miktar: 4, tip: "servis_iade", referansId: 5 },
      { id: 3, partId: "7", miktar: -2, tip: "servis", referansId: 5 },
      { id: 4, partId: "7", miktar: -9, tip: "bayi_satis", referansId: 5 }, // başka tip, sayılmaz
    ];
    expect(netDusum(log, 5, "servis", "7")).toBe(2);
    expect(karsiHareketler(log, 5, "servis", { tarih: "2026-10-01" })).toEqual([expect.objectContaining({ partId: "7", miktar: 2, tip: IADE_TIPI.servis, referansId: 5 })]);
    expect(Object.keys(IADE_TIPI).sort()).toEqual(["bayi_satis", "makina_uretimi", "satis", "servis"]);
    expect(hareketTipAdi("servis_iade")).toMatch(/geri alındı/);
  });
  it("AC-10: geri alma çakışmada kaybolmaz (karşı hareket ekleme olarak birleşir, adet geri döner)", () => {
    clearMintedIds();
    const dusum = { id: 77, partId: "7", miktar: -3, tip: "servis", referansId: 9, tarih: "2026-09-30" };
    const stock = holder([{ id: 1, partId: "7", miktar: 7 }]);
    const log = holder([dusum]);
    servisParcaGeriAl(9, stock.set, log.set); // yerelde geri alındı, kayıt çakıştı
    const sunucu = { partStock: [{ id: 1, partId: "7", miktar: 6 }], partStockLog: [dusum, { id: 88, partId: "7", miktar: -1, tip: "bayi_satis", referansId: 3, tarih: "2026-10-01" }] };
    const plan = buildMergePlan({ partStockLog: log.get() }, sunucu);
    expect(plan.adds.partStockLog.map(l => l.tip)).toEqual(["servis_iade"]);
    expect(totalMiktar(stokuUygula(sunucu.partStock, plan.stokEtkisi), "7")).toBe(9); // 6 + 3
  });
  it("AC-11: aynı kaydın stoğu iki kez düşmez ve iki kez geri alınmaz (yedek parça)", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    yedekParcaDus("7", 4, 1, stock.set, log.set);
    yedekParcaGeriAl(1, stock.set, log.set);
    yedekParcaGeriAl(1, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(10);
    expect(netDusumleri(log.get(), 1, "bayi_satis").size).toBe(0);
  });
  it("AC-5: çakışmasız tek kullanıcı senaryosunda stok sonuçları bu işten önceki gibidir", () => {
    // Önceki davranışın sonuçları (tests/servis-stok, yedek-parca-stok eski beklentileri): ekle 3 → 7, düzenle 2 → 8,
    // sil → 10; satış 5 → 5, düzenle 3 → 7, sil → 10; stok yetersizken kırpar.
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    servisParcaDus([{ partId: "7", miktar: 3 }], 1, stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(7);
    servisParcaYenile([{ partId: "7", miktar: 2 }], 1, stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(8);
    servisParcaGeriAl(1, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(10);
    yedekParcaDus("7", 5, 2, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(5);
    yedekParcaGeriAl(2, stock.set, log.set);
    yedekParcaDus("7", 3, 2, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(7);
    yedekParcaGeriAl(2, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(10);
    servisParcaDus([{ partId: "7", miktar: 15 }], 3, stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(0);
  });
  it("netDusumAyni: aynı parça ve tam düşüm → true; kırpılmış ya da değişmiş → false", () => {
    const log = [{ partId: "7", miktar: -3, tip: "servis", referansId: 1 }];
    expect(netDusumAyni(log, 1, "servis", [{ partId: "7", miktar: 3 }])).toBe(true);
    expect(netDusumAyni(log, 1, "servis", [{ partId: "7", miktar: 4 }])).toBe(false);
    expect(netDusumAyni(log, 1, "servis", [{ partId: "7", miktar: 3 }, { partId: "8", miktar: 1 }])).toBe(false);
    expect(netDusumAyni([], 2, "servis", [])).toBe(true);
  });
});

describe("Spec 0065 C: tutarlılık raporu", () => {
  const PARTS = [{ id: 7, ad: "Dişli" }, { id: 8, ad: "Rulman" }, { id: 9, ad: "Kayış" }];
  it("AC-13: saklı adet ile log'dan türeyen adedi karşılaştırır, sapanları farkıyla listeler", () => {
    const r = stokTutarliligi([{ partId: "7", miktar: 9 }, { partId: "8", miktar: 2 }], [
      { partId: "7", miktar: 10, tip: "stok_girisi", tarih: "2026-09-01" },
      { partId: "7", miktar: -3, tip: "servis", tarih: "2026-09-02" },
      { partId: "8", miktar: 2, tip: "stok_girisi", tarih: "2026-09-01" },
    ], PARTS);
    expect(r.sapmalar).toEqual([expect.objectContaining({ ad: "Dişli", sakli: 9, turetilen: 7, fark: 2 })]);
    expect(r.tutarli).toBe(1);
  });
  it("AC-14: sapma yoksa boş liste; tutarlı sayısı verilir", () => {
    const r = stokTutarliligi([{ partId: "7", miktar: 5 }], [{ partId: "7", miktar: 5, tip: "stok_girisi", tarih: "2026-09-01" }], PARTS);
    expect(r.sapmalar).toEqual([]);
    expect(r.tutarli).toBe(1);
  });
  it("AC-15: rapor hiçbir girdiyi değiştirmez", () => {
    const ps = [{ partId: "7", miktar: 1 }];
    const log = [{ partId: "7", miktar: 5, tip: "stok_girisi", tarih: "2026-09-01" }];
    const kopya = JSON.stringify([ps, log]);
    stokTutarliligi(ps, log, PARTS);
    expect(JSON.stringify([ps, log])).toBe(kopya);
  });
  it("AC-16: rapor sapmanın sebebini kesin söyleyemediğini yazar", () => {
    expect(TUTARLILIK_NOTU).toMatch(/kesin bilinemez/);
    expect(TUTARLILIK_NOTU).toMatch(/hiçbir adedi değiştirmez/);
  });
  it("AC-26 (R19): aynı günde sayım düzeltmesi ve başka hareketi olan parça 'sıra belirsiz', sapma değil", () => {
    const r = stokTutarliligi([{ partId: "7", miktar: 4 }], [
      { partId: "7", miktar: 5, tip: "manuel_duzelt", tarih: "2026-09-05" },
      { partId: "7", miktar: -1, tip: "servis", tarih: "2026-09-05" },
    ], PARTS);
    expect(r.sapmalar).toEqual([]);
    expect(r.belirsizler).toEqual([expect.objectContaining({ ad: "Dişli" })]);
  });
  it("AC-6 / R4: sayım düzeltmesi kendinden önceki geçmişi geçersiz kılar (raporda da)", () => {
    const r = stokTutarliligi([{ partId: "7", miktar: 6 }], [
      { partId: "7", miktar: 100, tip: "stok_girisi", tarih: "2026-09-01" },
      { partId: "7", miktar: 5, tip: "manuel_duzelt", tarih: "2026-09-03" },
      { partId: "7", miktar: 1, tip: "servis_iade", tarih: "2026-09-04" },
    ], PARTS);
    expect(r.sapmalar).toEqual([]);
  });
});

describe("Spec 0065 kaynak taramaları", () => {
  const kod = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
  const SRC = dosyalar("src").map(f => f.split(path.sep).join("/"));
  it("AC-19: yeniden hesap kuralı tek fonksiyonda; birleştirme ve rapor aynı fonksiyonu çağırır", () => {
    const tanim = SRC.filter(f => /export const stokEtkisi\b|const stokEtkisi\s*=/.test(kod(f)));
    expect(tanim).toEqual(["src/lib/stokHareketi.js"]);
    expect(kod("src/lib/merge.js")).toMatch(/stokEtkisi\(adds\.partStockLog\)/);
    expect(kod("src/App.jsx")).toMatch(/stokEtkisi\(eklenen\)/);
    const rapor = kod("src/lib/stokHareketi.js");
    expect(rapor.slice(rapor.indexOf("export const stokTutarliligi"))).toMatch(/stokEtkisi\(satirlar\)/);
  });
  it("AC-21: log'u Math.abs(l.miktar) ile brüt toplayan okuyucu kalmadı", () => {
    const brut = SRC.filter(f => f !== "src/lib/stokHareketi.js" && /Math\.abs\(\s*l\.miktar\s*\)/.test(kod(f)));
    expect(brut).toEqual([]);
  });
  it("R6: stok log'undan satır silen kod yok (geri alma karşı hareket yazar)", () => {
    const silen = SRC.filter(f => /setPartStockLog\(\s*\w+\s*=>\s*\w+\.filter\(/.test(kod(f)));
    expect(silen).toEqual([]);
  });
  it("AC-18: veritabanı şeması ve sunucu denetimi değişmedi", () => {
    const db = oku("electron/db.cjs");
    expect(db).toMatch(/CREATE TABLE IF NOT EXISTS part_stock_log \(\n\s+id INTEGER PRIMARY KEY,\n\s+part_id INTEGER,\n\s+miktar INTEGER,\n\s+tip TEXT,\n\s+referans_id INTEGER,\n\s+tarih TEXT,\n\s+notlar TEXT\n\);/);
    const sa = oku("electron/serverAuth.cjs");
    expect(sa).toMatch(/partStockLog: "stockActions"/);
    expect(sa).not.toMatch(/_iade/);
  });
  it("AC-20: stok yeterlilik denetimi ve ekranlar adedi doğrudan okur; log toplayan yalnız rapor ve birleştirme", () => {
    const kullanan = SRC.filter(f => /stokEtkisi\(|stokTutarliligi\(/.test(kod(f))).sort();
    // servisStok.js yalnız kendi yazdığı yeni hareketlerin etkisini uygular (çöpten geri alma, triyaj bulgu 2); log'u toplamaz.
    expect(kullanan).toEqual(["src/App.jsx", "src/components/stock/StokTutarliligi.jsx", "src/lib/merge.js", "src/lib/servisStok.js", "src/lib/stokHareketi.js"]);
  });
});
