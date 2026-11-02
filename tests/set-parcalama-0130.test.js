// Spec 0130: hazırlanmış setin parçalanması, motor (`setUretimi.js`, `stokHareketi.js`). Ekran testleri
// tests/ui/set-parcalama-0130.test.jsx'te.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  setParcalaPlani, setParcalaGeriAlPlani, setParcalaOnizleme, parcalamaGeriAlindiMi, setHazirlaPlani, setGeriAlPlani, geriAlRedMetni,
  SET_CIKIS_TIPI, BILESEN_GIRIS_TIPI, PARCALAMA_ADET_HATASI, PARCALAMA_ICERIK_YOK, PARCALAMA_TARIH_GECERSIZ, PARCALAMA_TARIH_GELECEK,
  parcalamaStokHatasi, parcalamaNotu, parcalamaGeriAlRedMetni, PARCALAMA_GERI_ALMA_NOTU,
} from "../src/lib/setUretimi";
import { IADE_TIPI, IPTAL_TIPI, HAREKET_TIP_AD, stokEtkisi, stokuUygula, stokTutarliligi } from "../src/lib/stokHareketi";
import { totalMiktar } from "../src/lib/utils";
import { parcaMaliyetKurus, setKatalogu, setOzeti } from "../src/lib/urunAgaci";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { hesaplaAnaliz } from "../src/lib/analiz";
import { finansOzetiHesapla } from "../src/components/settings/SettingsExport";

const BUGUN = "2026-11-02";
const A = { id: 1, ad: "Ayna dişlisi", maliyet: 210, maliyetGecmisi: [{ gecerli: "", kurus: 15000 }, { gecerli: "2026-05-01", kurus: 21000 }] };
const B = { id: 2, ad: "Mahruti dişli", maliyet: 340.5 };
const SET = { id: 10, ad: "Ayna takımı", fiyatTRY: "3000", setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 2, miktar: 1 }] };
const PARCALAR = [A, B, SET];
const stok = (o) => Object.entries(o).map(([pid, m], i) => ({ id: i + 1, partId: pid, miktar: m }));
const adet = (ps, pid) => totalMiktar(ps, String(pid));
const uygula = (ps, log, hareketler) => ({ ps: stokuUygula(ps, stokEtkisi(hareketler)), log: [...log, ...hareketler] });
const parcala = (o = {}) => setParcalaPlani({ set: SET, adet: "3", tarih: "2026-11-01", bugun: BUGUN, partStock: stok({ 10: 5, 1: 1, 2: 0 }), islemId: 700, ...o });

describe("Spec 0130 A: parçalama planı (R1–R9)", () => {
  it("AC-1: 2 × A, 1 × B içerikli setten 3 adet: setin stoğu 3 azalır, A 6, B 3 artar", () => {
    const ps0 = stok({ 10: 5, 1: 1, 2: 0 });
    const p = parcala({ partStock: ps0 });
    expect(p.ok).toBe(true);
    const { ps } = uygula(ps0, [], p.hareketler);
    expect([adet(ps, 10), adet(ps, 1), adet(ps, 2)]).toEqual([2, 7, 3]);
  });
  it("AC-2: setin çıkışı ve her bileşenin girişi ayrı satır; hepsi aynı işlem kimliği ve aynı tarih", () => {
    const p = parcala();
    expect(p.hareketler.map(h => [h.partId, h.miktar, h.tip])).toEqual([["10", -3, SET_CIKIS_TIPI], ["1", 6, BILESEN_GIRIS_TIPI], ["2", 3, BILESEN_GIRIS_TIPI]]);
    expect(new Set(p.hareketler.map(h => h.referansId))).toEqual(new Set([700]));
    expect(new Set(p.hareketler.map(h => h.tarih))).toEqual(new Set(["2026-11-01"]));
    expect(new Set(p.hareketler.map(h => h.id)).size).toBe(3);
  });
  it("AC-3: setin stoğu 2 iken 3 adet istenirse hareket yok, neden döner", () => {
    const p = parcala({ partStock: stok({ 10: 2 }) });
    expect(p).toMatchObject({ ok: false, hareketler: [], hata: parcalamaStokHatasi(2) });
  });
  it("AC-4: adet 0, boş, ondalıklı ya da sayı olmayan metinse hareket yok, neden döner", () => {
    for (const a of ["0", "", "  ", "1,5", "1.5", "abc", "-2", null]) expect(parcala({ adet: a }), String(a)).toMatchObject({ ok: false, hareketler: [], hata: PARCALAMA_ADET_HATASI });
  });
  it("AC-5: bileşen stoğu sıfır olsa da giriş tam yazılır (kırpma yok)", () => {
    const p = parcala({ partStock: stok({ 10: 3 }) });
    expect(p.hareketler.filter(h => h.tip === BILESEN_GIRIS_TIPI).map(h => h.miktar)).toEqual([6, 3]);
  });
  it("AC-6: hiç hazırlanmamış, stoğu elle girilmiş set parçalanır (hiçbir hazırlama kaydına bağlanmaz)", () => {
    const ps0 = stok({ 10: 1 });
    const p = setParcalaPlani({ set: SET, adet: "1", tarih: BUGUN, bugun: BUGUN, partStock: ps0 });
    expect(p.ok).toBe(true);
    const { ps } = uygula(ps0, [], p.hareketler);
    expect([adet(ps, 10), adet(ps, 1), adet(ps, 2)]).toEqual([0, 2, 1]);
  });
  it("AC-7: içeriği olmayan parça reddedilir, neden söylenir", () => {
    expect(setParcalaPlani({ set: A, adet: "1", tarih: BUGUN, bugun: BUGUN, partStock: stok({ 1: 4 }) })).toMatchObject({ ok: false, hareketler: [], hata: PARCALAMA_ICERIK_YOK });
  });
  it("AC-8: takvimde olmayan ya da gelecekteki tarih reddedilir", () => {
    expect(parcala({ tarih: "2026-02-31" })).toMatchObject({ ok: false, hareketler: [], hata: PARCALAMA_TARIH_GECERSIZ });
    expect(parcala({ tarih: "2026-11-03" })).toMatchObject({ ok: false, hareketler: [], hata: PARCALAMA_TARIH_GELECEK });
    expect(parcala({ tarih: "" })).toMatchObject({ ok: false, hata: PARCALAMA_TARIH_GECERSIZ });
  });
  it("AC-9: kullanıcı notu yalnız setin satırında; bileşen satırları sistem notunu taşır", () => {
    const p = parcala({ not: "  müşteri dişliyi istedi " });
    expect(p.hareketler[0].notlar).toBe(`${parcalamaNotu(3)} · müşteri dişliyi istedi`);
    for (const h of p.hareketler.slice(1)) expect(h.notlar).toBe(parcalamaNotu(3));
  });
  it("R4 / C7: içerik o anki içeriktir; çöpteki ya da kataloğda olmayan bileşenin de stoğu artar", () => {
    const set = { ...SET, setIcerigi: [{ partId: 1, miktar: 1 }, { partId: 404, miktar: 2 }] };
    const p = setParcalaPlani({ set, adet: "1", tarih: BUGUN, bugun: BUGUN, partStock: stok({ 10: 1 }) });
    expect(p.hareketler.map(h => [h.partId, h.miktar])).toEqual([["10", -1], ["1", 1], ["404", 2]]);
  });
  it("R15 (AC-20, AC-21 motoru): önizleme bileşen başına girecek adet, setin eldeki ve kalacak adedi", () => {
    expect(setParcalaOnizleme(SET, "2", stok({ 10: 5, 1: 1 }))).toEqual({ adet: 2, eldeki: 5, kalacak: 3,
      satirlar: [{ partId: "1", girecek: 4, stokta: 1 }, { partId: "2", girecek: 2, stokta: 0 }] });
    expect(setParcalaOnizleme(SET, "abc", stok({ 10: 5 })).satirlar.map(s => s.girecek)).toEqual([0, 0]);
    expect(setParcalaOnizleme(SET, "9", stok({ 10: 5 })).kalacak).toBeNull();
  });
});

describe("Spec 0130 B: geri alma (R10–R13)", () => {
  const kur = () => { const ps0 = stok({ 10: 5, 1: 1, 2: 0 }); return uygula(ps0, [], parcala({ partStock: ps0 }).hareketler); };
  it("AC-10: geri alınca setin stoğu geri artar, bileşenler girdiği kadar düşer", () => {
    const { ps, log } = kur();
    const g = setParcalaGeriAlPlani({ islemId: 700, partStock: ps, partStockLog: log, tarih: BUGUN });
    expect(g.ok).toBe(true);
    const s = uygula(ps, log, g.hareketler).ps;
    expect([adet(s, 10), adet(s, 1), adet(s, 2)]).toEqual([5, 1, 0]);
    expect(g.hareketler.map(h => [h.partId, h.miktar, h.tip, h.notlar])).toEqual([
      ["10", 3, IADE_TIPI[SET_CIKIS_TIPI], PARCALAMA_GERI_ALMA_NOTU],
      ["1", -6, IPTAL_TIPI[BILESEN_GIRIS_TIPI], PARCALAMA_GERI_ALMA_NOTU], ["2", -3, IPTAL_TIPI[BILESEN_GIRIS_TIPI], PARCALAMA_GERI_ALMA_NOTU]]);
  });
  it("AC-11: geri alma satır silmez; parçalamanın satırları yerinde, karşı hareketler yeni satır", () => {
    const { ps, log } = kur();
    const g = setParcalaGeriAlPlani({ islemId: 700, partStock: ps, partStockLog: log, tarih: BUGUN });
    const log2 = uygula(ps, log, g.hareketler).log;
    expect(log2.slice(0, log.length)).toEqual(log);
    expect(log2).toHaveLength(log.length + 3);
  });
  it("AC-12: bileşen kullanıldıysa hareket yok, geri alınamayan adet söylenir", () => {
    const { ps, log } = kur();
    const kullanildi = ps.map(s => (String(s.partId) === "1" ? { ...s, miktar: 3 } : s)); // girdi 6, eldeki 3
    const g = setParcalaGeriAlPlani({ islemId: 700, partStock: kullanildi, partStockLog: log, tarih: BUGUN });
    expect(g).toMatchObject({ ok: false, etkisiz: false, hareketler: [], hata: parcalamaGeriAlRedMetni(3) });
  });
  it("AC-13: içerik sonradan değişse de geri alma log'daki adetleri düşer", () => {
    const { ps, log } = kur();
    const g = setParcalaGeriAlPlani({ islemId: 700, partStock: ps, partStockLog: log, tarih: BUGUN });
    expect(g.hareketler.filter(h => h.tip === IPTAL_TIPI[BILESEN_GIRIS_TIPI]).map(h => [h.partId, h.miktar])).toEqual([["1", -6], ["2", -3]]);
    expect(String(setParcalaGeriAlPlani).includes("setIcerigi")).toBe(false);
  });
  it("AC-14: ikinci geri alma etkisiz (hareket yok, hata yok)", () => {
    const { ps, log } = kur();
    const g = setParcalaGeriAlPlani({ islemId: 700, partStock: ps, partStockLog: log, tarih: BUGUN });
    const s = uygula(ps, log, g.hareketler);
    expect(parcalamaGeriAlindiMi(s.log, 700)).toBe(true);
    expect(parcalamaGeriAlindiMi(log, 700)).toBe(false);
    expect(setParcalaGeriAlPlani({ islemId: 700, partStock: s.ps, partStockLog: s.log, tarih: BUGUN })).toEqual({ ok: false, etkisiz: true, hata: null, hareketler: [] });
  });
  it("AC-16 (Karar 4): bileşen hareketi doğmamış (bozuk içerik) parçalama da geri alınır; ölçüt setin çıkışı", () => {
    const bozuk = { ...SET, setIcerigi: [{ partId: 1, miktar: 0 }, { partId: 2, miktar: "x" }] };
    const ps0 = stok({ 10: 2 });
    const p = setParcalaPlani({ set: bozuk, adet: "2", tarih: BUGUN, bugun: BUGUN, partStock: ps0, islemId: 701 });
    expect(p.hareketler.map(h => h.tip)).toEqual([SET_CIKIS_TIPI]);
    const s = uygula(ps0, [], p.hareketler);
    expect(parcalamaGeriAlindiMi(s.log, 701)).toBe(false);
    const g = setParcalaGeriAlPlani({ islemId: 701, partStock: s.ps, partStockLog: s.log, tarih: BUGUN });
    expect(g.ok).toBe(true);
    expect(adet(uygula(s.ps, s.log, g.hareketler).ps, 10)).toBe(2);
  });
  it("R20 / AC-29: parçalanmış hazırlama geri alınamaz; metin parçalamayı ve çaresini söyler", () => {
    const ps0 = stok({ 1: 10, 2: 10 });
    const h = setHazirlaPlani({ set: SET, adet: "2", tarih: BUGUN, bugun: BUGUN, partStock: ps0, islemId: 600 });
    let s = uygula(ps0, [], h.hareketler);
    s = uygula(s.ps, s.log, setParcalaPlani({ set: SET, adet: "2", tarih: BUGUN, bugun: BUGUN, partStock: s.ps, islemId: 601 }).hareketler);
    const g = setGeriAlPlani({ islemId: 600, partStock: s.ps, partStockLog: s.log, tarih: BUGUN });
    expect(g).toMatchObject({ ok: false, hata: geriAlRedMetni(2) });
    expect(g.hata).toMatch(/satılmış, kullanılmış ya da parçalanmış; parçalandıysa önce parçalamayı geri alın/);
  });
});

describe("Spec 0130 C: adlar, maliyet, tutarlılık, kıyas", () => {
  it("AC-27 / AC-28 / Karar 1: dört tip haritalarda doğru yönde ve okunur adlı; düşüm haritasında giriş yok", () => {
    expect(IADE_TIPI.set_parcalama).toBe("set_parcalama_iade");
    expect(IPTAL_TIPI.parcalama_girisi).toBe("parcalama_girisi_iptal");
    expect(Object.keys(IADE_TIPI)).not.toContain("parcalama_girisi");
    expect(Object.keys(IPTAL_TIPI)).not.toContain("set_parcalama");
    expect([HAREKET_TIP_AD.set_parcalama, HAREKET_TIP_AD.set_parcalama_iade, HAREKET_TIP_AD.parcalama_girisi, HAREKET_TIP_AD.parcalama_girisi_iptal])
      .toEqual(["Set parçalandı", "Set parçalama geri alındı", "Set parçalandı (bileşen girişi)", "Set parçalama geri alındı (bileşen)"]);
    const etiket = readFileSync("src/components/settings/SettingsAuditLog.jsx", "utf8");
    expect(etiket).toContain('set_parcalandi: "Set Parçalandı"');
    expect(etiket).toContain('set_parcalama_geri_alindi: "Set Parçalama Geri Alındı"');
  });
  it("AC-30: setin ve bileşenlerin maliyeti, maliyet geçmişi parçalamadan önce ve sonra birebir; plan maliyet alanı yazmaz", () => {
    const kat = setKatalogu(PARCALAR);
    const once = JSON.stringify([PARCALAR, PARCALAR.map(p => parcaMaliyetKurus(p, undefined, kat)), PARCALAR.map(p => parcaMaliyetKurus(p, "2026-02-01", kat)), setOzeti(SET.setIcerigi, kat)]);
    const p = parcala();
    for (const h of p.hareketler) expect(Object.keys(h).sort()).toEqual(["id", "miktar", "notlar", "partId", "referansId", "tarih", "tip"]);
    expect(JSON.stringify([PARCALAR, PARCALAR.map(x => parcaMaliyetKurus(x, undefined, kat)), PARCALAR.map(x => parcaMaliyetKurus(x, "2026-02-01", kat)), setOzeti(SET.setIcerigi, kat)])).toBe(once);
  });
  it("AC-31 (Karar 11): parçalama ve geri almadan sonra Stok Tutarlılığı sapma göstermez", () => {
    let ps = [], log = [];
    const ekle = (h) => { ({ ps, log } = uygula(ps, log, h)); };
    ekle([{ id: 1, partId: "10", miktar: 4, tip: "stok_girisi", tarih: "2026-10-01" }, { id: 2, partId: "1", miktar: 1, tip: "stok_girisi", tarih: "2026-10-01" }]);
    ekle(setParcalaPlani({ set: SET, adet: "3", tarih: "2026-10-05", bugun: BUGUN, partStock: ps, islemId: 800 }).hareketler);
    expect(stokTutarliligi(ps, log, PARCALAR)).toMatchObject({ sapmalar: [], belirsizler: [], tutarli: 3 });
    ekle(setParcalaGeriAlPlani({ islemId: 800, partStock: ps, partStockLog: log, tarih: "2026-10-06" }).hareketler);
    expect(stokTutarliligi(ps, log, PARCALAR)).toMatchObject({ sapmalar: [], belirsizler: [], tutarli: 3 });
  });
  it("AC-32 (Karar 8): parçalama satış, servis, teklif, Analiz, aylık rapor, Finans Özeti, dışa aktarma ve model maliyeti çıktısını değiştirmez", () => {
    const kdvRates = [{ from: "2000-01-01", rate: 20 }];
    const VERI = {
      customers: [{ id: 1, name: "A", model: "AK100", serialNo: "S1", installDate: "2026-06-10", currency: "TRY", fabrikaSatisBedeli: 800000, faturali: "Faturalı Yurtiçi", kalanBorc: 100000, satisYapan: "Altuntaş Makina" }],
      services: [{ id: 10, customerId: 1, date: "2026-06-12", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: "Altuntaş Makina", odendi: false, faturaTipi: "Faturalı Yurtiçi",
        repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 10, ad: SET.ad, miktar: 1 }, { partId: 1, ad: A.ad, miktar: 2 }], parcaUcreti: 3900, parcaCurrency: "TRY" }],
      partSales: [], payments: [{ id: 30, customerId: 1, tarih: "2026-06-08", tutar: 200000, currency: "TRY", yontem: "Nakit" }],
      teklifler: [{ id: 40, tarih: "2026-06-01", tip: "teklif", items: [] }], dealers: [{ id: 50, name: "Bayi" }],
      yedekParcaSatislar: [{ id: 60, aliciTipi: "bayi", dealerId: 50, partId: 10, miktar: 3, birimFiyat: 3000, currency: "TRY", tarih: "2026-06-15", odendi: false, faturaTipi: "Faturalı Yurtiçi" }],
    };
    const MODELLER = { standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "10", miktar: 1 }, { partId: "1", miktar: 2 }] }], customModels: [] };
    for (const parts of [[A, B], PARCALAR]) {
      const ps0 = stok({ 10: 5, 1: 1 });
      const p = setParcalaPlani({ set: SET, adet: "2", tarih: BUGUN, bugun: BUGUN, partStock: ps0, islemId: 900 });
      const sonra = uygula(ps0, [], p.hareketler);
      const cikti = (partStock, partStockLog) => JSON.stringify({
        rapor: hesaplaAylikRapor({ ...VERI, partStock, partStockLog }, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } }),
        analiz: hesaplaAnaliz({ ...VERI, parts, partStock, partStockLog }, {}),
        finans: finansOzetiHesapla({ ...VERI, kdvRates, partStock, partStockLog }),
        disaAktarma: parts.map(x => parcaDisaAktarmaSatiri(x, setKatalogu(parts))),
        model: modelMaliyetleri({ ...MODELLER, parts }, 12345),
      });
      expect(cikti(sonra.ps, sonra.log), `parça sayısı ${parts.length}`).toBe(cikti(ps0, []));
    }
  });
});

describe("Spec 0130: kaynak taramaları", () => {
  const oku = (f) => readFileSync(f, "utf8");
  it("C1: pencere adet aritmetiği yapmaz; plan ve önizleme motordan", () => {
    const p = oku("src/components/stock/SetParcalaPenceresi.jsx").replace(/\/\/.*$/gm, "");
    expect(p).toMatch(/setParcalaPlani\(/);
    expect(p).toMatch(/setParcalaOnizleme\(/);
    expect(p).not.toMatch(/\.miktar\s*\*|\*\s*Number|eldeki\s*-|totalMiktar|stokuUygula\(/);
  });
  it("C2 / AC-11: geri alma satır silmez (log süzen yazım yok)", () => {
    for (const f of ["src/components/stock/StokHareketleriPenceresi.jsx", "src/components/stock/SetParcalaPenceresi.jsx", "src/lib/setUretimi.js"])
      expect(oku(f), f).not.toMatch(/setPartStockLog\(\s*\w+\s*=>\s*\w+\.filter/);
  });
  it("C5: yeni tipler birleştirme, sunucu ve veritabanı dosyalarında geçmez; işlem kimliği çevrilmez", () => {
    for (const f of ["src/lib/merge.js", "electron/serverAuth.cjs", "electron/server.cjs", "electron/db.cjs", "src/components/settings/serverPermissionDefs.js"])
      expect(oku(f), f).not.toMatch(/set_parcalama|parcalama_girisi|set_parcalandi/);
  });
  it("DoD: yeni pencere partstock kilit kaydında", () => {
    expect(oku("src/lib/kilitAlanlari.js")).toContain('"src/components/stock/SetParcalaPenceresi.jsx"');
  });
});
