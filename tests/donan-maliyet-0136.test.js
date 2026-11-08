// Spec 0136: üretilmiş makinanın maliyeti donar. Saf motor (kapanış görüntüsü, kapanış yolu, okuma, anahtar çözümü, sapma) ve
// kaynak taramaları. Veri: tests/fixtures/0136-veri.js (0097'nin rakamları). Kış (2026-01 – 2026-03) bugünkü veriyle kapatılır;
// sonra katalog, gider ve makina bağları değiştirilir ve gösterilen rakamın değişmediği ölçülür.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as V from "./fixtures/0136-veri";
import {
  partiGenelPaylari, partiHesabi, partiKapanisGoruntusu, partiKapanisHavuzu, partiGosterimi, partiMaliyetSapmalari, modelMaliyetleri,
} from "../src/lib/makinaStandartMaliyet";
import {
  partiKapanisUygula, partiDogrula, kapanisAraligiAyniMi, kapanisMaliyetiOf, partiDondurmaDurumu, DONDURMA, KAPANIS_MALIYET_YOK, KAPANIS_HARITA_YOK,
  GELECEK_BITIS_HATASI, DONDURULMAMIS_SATIR_NEDENI, kapanisTarihiMetni, donmusSeritMetni, kapanistaAdetMetni, DONDURULMADI_IBARESI,
  YENIDEN_ACMA_ONAYI, PLAN_KAPALI_NEDENI, SAPMA_BASLIGI, SAPMA_ALT_BASLIGI, SAPMA_DUZELTME, SAPMA_DIREKT_ETIKETI,
} from "../src/lib/uretimPartisi";

const B = V.BUGUN;
const oku = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const MALZ = { id: 2, ad: "8620", ozgulAgirlik: 7.85, kiloFiyati: 100 };
// Malzemeden hesaplanan parça (AC-15): AK100 kitine bir adet girer.
const MIL = { id: 3, ad: "Mil", models: ["AK100"], malzemeSatiri: { malzemeId: 2, bicim: "mil", cap: 20, boy: 100 } };
const PARCALAR = [...V.PARCALAR, MIL];
const STANDART = [{ ...V.STANDART[0], defaultParcalar: [...V.STANDART[0].defaultParcalar, { partId: "3", ad: "Mil", miktar: 1 }] }];
const kat = (o = {}) => ({ parts: PARCALAR, malzemeler: [MALZ], standardModels: STANDART, customModels: V.OZEL, ...o });
const modellerOf = (k) => modelMaliyetleri({ standardModels: k.standardModels, customModels: k.customModels, parts: k.parts, malzemeler: k.malzemeler }, 65000, {});
const veri0 = (o = {}) => V.veri(o);
const payOf = (veri, id) => partiGenelPaylari(veri, B).partiler.find(x => String(x.id) === String(id)) || null;
// Kapanış: çağıran (Makina Maliyeti) gibi partinin yerine yeni kayıt konmuş veriyle payı kurar (Karar 36).
const kapat = (veri, parti, k = kat()) => {
  const vY = { ...veri, uretimPartileri: veri.uretimPartileri.map(p => (String(p.id) === String(parti.id) ? parti : p)) };
  return partiKapanisGoruntusu(vY, parti, B, { katalog: k, modeller: modellerOf(k), partiPay: payOf(vY, parti.id) });
};
const hesapla = (parti, veri, k = kat()) => partiHesabi(parti, veri, { payK: 65000, modeller: modellerOf(k), bugun: B, katalog: k, partiPay: payOf(veri, parti.id) });
// Triyaj (bulgu 1): pay toplamı ve satırın toplam maliyeti de karşılaştırılır (birim sütun tek başına yetmiyordu).
const tablo = (h) => h.satirlar.map(r => [r.anahtar, r.adet, r.direktK, r.payK, r.eksikSayisi, r.tarihsiz, r.payToplamK, r.toplamMaliyetK]);
// Donmuş Kış ve onu taşıyan veri.
const KIS0 = V.PARTILER[0];
const GORUNTU = kapat(veri0(), KIS0);
const KIS = { ...KIS0, kapanisMaliyeti: GORUNTU };
const partilerD = (kis = KIS) => [kis, ...V.PARTILER.slice(1)];
const veriD = (o = {}) => veri0({ uretimPartileri: partilerD(), ...o });
const ONCE = hesapla(KIS, veriD());

describe("Spec 0136: kapanış görüntüsü (R1–R9/2, R19, R20)", () => {
  it("AC-2 / AC-3 / AC-4 / AC-46 / AC-47 / AC-50: makina başına direkt, pay, eksik; planlar; havuz, makina başı, durum, neden; kapanıştaki adet; kuruş tamsayı", () => {
    expect(Object.keys(GORUNTU).sort()).toEqual(["adet", "durum", "havuzK", "kapanisGunu", "makinaBasiK", "makinalar", "neden", "planlar"]);
    expect(GORUNTU.kapanisGunu).toBe(B);
    expect(Object.keys(GORUNTU.makinalar).sort()).toEqual(["musteri:11", "stok:1", "stok:2", "stok:3"]);
    expect(GORUNTU.makinalar["stok:1"]).toMatchObject({ eksikSayisi: 0, payK: 150001, tarihsiz: false });
    expect(GORUNTU.makinalar["stok:3"].tarihsiz).toBe(true);
    expect(Object.keys(GORUNTU.planlar)).toEqual(["OZ"]);
    expect(GORUNTU).toMatchObject({ havuzK: 600001, makinaBasiK: 150000, adet: 4, durum: "tamam", neden: null });
    const tutarlar = [GORUNTU.havuzK, GORUNTU.makinaBasiK, ...Object.values(GORUNTU.makinalar).flatMap(m => [m.direktK, m.payK]), ...Object.values(GORUNTU.planlar).map(p => p.direktK)];
    for (const t of tutarlar) expect(Number.isInteger(t), String(t)).toBe(true);
  });
  it("AC-1 / AC-10 / AC-75: bitiş girilince görüntü yazılır; yeniden açılıp kapatılınca ve bitiş değişince yenisi yazılır", () => {
    const acik = { ...KIS0, bitisAy: null, kapanmaZamani: null, kapanisGenelHavuzlari: undefined };
    const havuz = partiKapanisHavuzu(veri0(), KIS0, B);
    const r = partiKapanisUygula(acik, KIS0, havuz, "2026-06-15T10:00:00", GORUNTU);
    expect(r.kayit.kapanisMaliyeti).toEqual(GORUNTU);
    const yeni = { ...GORUNTU, kapanisGunu: "2026-06-16" };
    const r2 = partiKapanisUygula(KIS, { ...KIS0, bitisAy: "2026-02" }, partiKapanisHavuzu(veri0(), { ...KIS0, bitisAy: "2026-02" }, B), "2026-06-16T10:00:00", yeni);
    expect(r2.kayit.kapanisMaliyeti.kapanisGunu).toBe("2026-06-16");
  });
  it("AC-5 / AC-55: katalog yoksa görüntü null ve kapanış nedeniyle reddedilir", () => {
    expect(partiKapanisGoruntusu(veri0(), KIS0, B, { katalog: null, modeller: [], partiPay: null })).toBeNull();
    expect(partiKapanisGoruntusu(veri0(), KIS0, B, { katalog: kat(), modeller: null, partiPay: null })).toBeNull();
    const r = partiKapanisUygula(null, KIS0, partiKapanisHavuzu(veri0(), KIS0, B), "2026-06-15T10:00:00", null);
    expect(r.hata).toBe(KAPANIS_MALIYET_YOK);
  });
  it("AC-6: havuz hesaplanamıyorsa bugünkü neden değişmez (görüntü verilse de)", () => {
    expect(partiKapanisUygula(null, KIS0, null, "2026-06-15T10:00:00", GORUNTU).hata).toBe(KAPANIS_HARITA_YOK);
  });
  it("AC-7: maliyeti girilmemiş parça kapanışı engellemez; eksik sayısı görüntüde", () => {
    const k = kat({ parts: [...PARCALAR.filter(p => p.id !== 2), { id: 2, ad: "Vida", models: ["AK100"] }] });
    const g = kapat(veri0(), KIS0, k);
    expect(g).not.toBeNull();
    expect(g.makinalar["stok:1"].eksikSayisi).toBe(1);
  });
  it("AC-8: aralığı değişmeyen düzenleme görüntüyü korur (yeni görüntü verilse de)", () => {
    const r = partiKapanisUygula(KIS, { ...KIS, ad: "Kış 2" }, null, "2026-07-01T10:00:00", { ...GORUNTU, kapanisGunu: "2026-07-01" });
    expect(r.kayit.kapanisMaliyeti).toEqual(GORUNTU);
    expect(r.kayit.ad).toBe("Kış 2");
  });
  it("AC-9: yeniden açılan partide anahtar yok (null da değil)", () => {
    const r = partiKapanisUygula(KIS, { ...KIS, bitisAy: null }, null, "2026-07-01T10:00:00", undefined);
    expect("kapanisMaliyeti" in r.kayit).toBe(false);
    expect("kapanisGenelHavuzlari" in r.kayit).toBe(false);
  });
  it("AC-11 / AC-48: makinasız, plansız ve bütün ayları yürürlük öncesi partide haritalar boş, markör dolu, alan yazılır", () => {
    const p = { id: 9, ad: "Boş", baslangicAy: "2025-10", bitisAy: "2025-11" };
    const v = veri0({ uretimPartileri: [...V.PARTILER, p] });
    const g = kapat(v, p);
    expect(g.makinalar).toEqual({}); expect(g.planlar).toEqual({}); expect(g.kapanisGunu).toBe(B);
    const r = partiKapanisUygula({ ...p, bitisAy: null }, p, partiKapanisHavuzu(v, p, B), "2026-06-15T10:00:00", g);
    expect(r.kayit.kapanisMaliyeti).toEqual(g);
    expect(kapanisMaliyetiOf(r.kayit)).toEqual(g);
  });
  it("AC-49 / AC-83: görüntüsüz parti (ay havuzu görüntüsü olsa da) dondurulmadı; açık parti açık", () => {
    expect(kapanisMaliyetiOf(KIS0)).toBeNull();
    expect(partiDondurmaDurumu(KIS0)).toBe(DONDURMA.DONDURULMADI);
    expect(partiDondurmaDurumu(KIS)).toBe(DONDURMA.DONMUS);
    expect(partiDondurmaDurumu(V.PARTILER[1])).toBe(DONDURMA.ACIK);
    expect(kapanisMaliyetiOf({ ...KIS, kapanisMaliyeti: { makinalar: {} } })).toBeNull(); // markörsüz nesne görüntü değildir
    expect("dondurma" in hesapla(KIS0, veri0())).toBe(false);
  });
  it("AC-53 / AC-54: geçmişe bitişle kapanan partinin havuzu yalnız kendi aylarının payı, kapanış öncesi canlı havuz değil", () => {
    const acikPay = payOf(veri0(), 2);
    const kapali = { ...V.PARTILER[1], bitisAy: "2026-04" };
    const v = veri0({ uretimPartileri: [KIS0, kapali, V.PARTILER[2], V.PARTILER[3]] });
    const g = kapat(veri0(), kapali);
    expect(g.havuzK).toBe(payOf(v, 2).havuzK);
    expect(g.havuzK).not.toBe(acikPay.havuzK);
    expect(partiGosterimi(payOf(v, 2), { ...kapali, kapanisMaliyeti: { ...g, makinaBasiK: 12345 } }).makinaBasiK).toBe(12345);
  });
  it("AC-56: modeli katalogda olmayan makina kapanışı engellemez; direkt boş, neden yazılı", () => {
    const stock = [...V.STOCK, { id: 8, model: "YOK", serialNo: "Y8", partiId: 1, uretimTarihi: "2026-01-12" }];
    const g = kapat(veri0({ stock }), KIS0);
    expect(g.makinalar["stok:8"]).toMatchObject({ direktK: null, neden: "modelYok" });
  });
  it("AC-57: bitiş ayı gelecekte olan parti kaydedilmez ve nedeni alanda; bu ay serbest; bugün verilmezse eski davranış", () => {
    const f = { ad: "X", baslangicAy: "2026-01", bitisAy: "2026-07" };
    expect(partiDogrula(f, [], B).hatalar.bitisAy).toBe(GELECEK_BITIS_HATASI);
    expect(partiDogrula({ ...f, bitisAy: "2026-06" }, [], B).kayit).toBeTruthy();
    expect(partiDogrula(f, []).kayit).toBeTruthy();
  });
});

describe("Spec 0136: donmuş partinin okunması (R6, R7, R10–R10/8, R17)", () => {
  // Bugünkü veriyle kapanış anı: donmuş tablo canlı tabloyla aynıdır (kapanış anında sapma yok).
  it("AC-12 / AC-13: satırlarda direkt ve pay görüntüdeki değer", () => {
    expect(tablo(ONCE)).toEqual(tablo(hesapla(KIS0, veri0())));
    const r1 = ONCE.satirlar.find(r => r.anahtar === "AK100#1");
    expect(r1.direktK).toBe(GORUNTU.makinalar["stok:1"].direktK);
    expect(r1.payK).toBe(GORUNTU.makinaBasiK);
    expect(ONCE.dondurma).toEqual({ kapanisGunu: B, dondurulmamis: 0 });
  });
  it("AC-14 / AC-15: parçanın ölçüsü ve malzemenin kilo fiyatı değişse rakam değişmez (canlı değişir)", () => {
    const olcu = kat({ parts: PARCALAR.map(p => (p.id === 3 ? { ...p, malzemeSatiri: { ...p.malzemeSatiri, boy: 400 } } : p)) });
    const fiyat = kat({ malzemeler: [{ ...MALZ, kiloFiyati: 300 }] });
    for (const k of [olcu, fiyat]) {
      expect(tablo(hesapla(KIS, veriD(), k))).toEqual(tablo(ONCE));
      expect(tablo(hesapla(KIS0, veri0(), k))).not.toEqual(tablo(ONCE));
    }
  });
  it("AC-16 / AC-18: kite parça eklense, parça çöpe atılsa rakam değişmez", () => {
    const kit = kat({ standardModels: [{ ...STANDART[0], defaultParcalar: [...STANDART[0].defaultParcalar, { partId: "2", ad: "Vida", miktar: 9 }] }] });
    const cop = kat({ parts: PARCALAR.map(p => (p.id === 1 ? { ...p, deletedAt: "2026-06-01T00:00:00Z" } : p)) });
    for (const k of [kit, cop]) {
      expect(tablo(hesapla(KIS, veriD(), k))).toEqual(tablo(ONCE));
      expect(tablo(hesapla(KIS0, veri0(), k))).not.toEqual(tablo(ONCE));
    }
  });
  it("AC-17 / AC-78: o aylara gider eklense pay değişmez; sapma kutusunda partinin kendi payı satırı çıkar", () => {
    const giderler = [...V.GIDERLER, { id: 9, tarih: "2026-02-20", turId: 1, tutar: 4000, kdvOrani: 0, modelSatirlari: [], taksitler: [] }];
    const h = hesapla(KIS, veriD({ giderler }));
    expect(tablo(h)).toEqual(tablo(ONCE));
    expect(h.ozet.toplamStandartK).toBe(ONCE.ozet.toplamStandartK); // triyaj (bulgu 1): özet de donmuş
    expect(hesapla(KIS0, veri0({ giderler })).ozet.toplamStandartK).not.toBe(ONCE.ozet.toplamStandartK);
    const s = partiMaliyetSapmalari(veriD({ giderler }), { katalog: kat(), modeller: modellerOf(kat()), partiSonucu: partiGenelPaylari(veriD({ giderler }), B) });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ id: 1, direkt: null, pay: { kapanistaK: 600001, bugunK: 1000001, farkK: 400000, artti: true } });
  });
  it("AC-20 / AC-66: satılmış makinanın kâr özeti ve tedarik kutusunun standart direkti dondurulmuş değerden", () => {
    const k = kat({ malzemeler: [{ ...MALZ, kiloFiyati: 300 }] });
    const h = hesapla(KIS, veriD(), k);
    expect(h.ozet.satilmisStandartK).toBe(ONCE.ozet.satilmisStandartK);
    expect(h.ozet.gercegeGoreKarK).toBe(ONCE.ozet.gercegeGoreKarK);
    expect(h.tedarik.standartDirektK).toBe(ONCE.tedarik.standartDirektK);
    expect(hesapla(KIS0, veri0(), k).tedarik.standartDirektK).not.toBe(ONCE.tedarik.standartDirektK);
  });
  it("AC-21 / AC-22 / AC-69: Üretim Partileri'nin tutarları görüntüden, adet canlı, kapanıştaki adet ayrıca", () => {
    const stock = [...V.STOCK, { id: 8, model: "AK100", serialNo: "S8", partiId: 1, uretimTarihi: "2026-01-20" }];
    const v = veriD({ stock });
    const o = partiGosterimi(payOf(v, 1), KIS);
    expect(o).toMatchObject({ adet: 5, kapanisAdet: 4, havuzK: 600001, makinaBasiK: 150000, durum: "tamam" });
    expect(payOf(v, 1).makinaBasiK).not.toBe(150000);
    expect(partiGosterimi(payOf(v, 2), V.PARTILER[1])).toEqual(payOf(v, 2));
    expect(kapanistaAdetMetni(4)).toBe("kapanışta 4");
  });
  it("AC-64 / AC-65: toplam donmuş birim × canlı adetle büyür; kâr katsayısı öneriyi değiştirir, maliyeti değil", () => {
    const stock = [...V.STOCK, { id: 8, model: "AK100", serialNo: "S8", partiId: 1, uretimTarihi: "2026-01-20" }];
    expect(hesapla(KIS, veriD({ stock })).ozet.toplamStandartK).toBeGreaterThan(ONCE.ozet.toplamStandartK);
    const k = kat({ standardModels: [{ ...STANDART[0], karKatsayisi: 3 }] });
    const h = hesapla(KIS, veriD(), k);
    const r = (x) => x.satirlar.find(s => s.anahtar === "AK100#1");
    expect([r(h).direktK, r(h).payK]).toEqual([r(ONCE).direktK, r(ONCE).payK]);
    expect(r(h).oneriK).not.toBe(r(ONCE).oneriK);
    expect(h.ozet.onerilenCiroK).not.toBe(ONCE.ozet.onerilenCiroK);
  });
  it("AC-60: gruplama donmuş birim direkt ile; canlı maliyet eşitlense de donmuş satırlar ayrı kalır", () => {
    const k = kat({ parts: PARCALAR.map(p => (p.id === 1 ? { ...p, maliyetGecmisi: undefined } : p)) });
    expect(hesapla(KIS0, veri0(), k).satirlar.filter(r => r.model === "AK100" && !r.tarihsiz)).toHaveLength(1);
    expect(tablo(hesapla(KIS, veriD(), k))).toEqual(tablo(ONCE));
  });
  it("AC-63: tarihsiz ibaresi görüntüden; kapanıştan sonra tarih girilse de kalkmaz", () => {
    const stock = V.STOCK.map(s => (s.id === 3 ? { ...s, uretimTarihi: "2026-01-11" } : s));
    expect(hesapla(KIS, veriD({ stock })).satirlar.some(r => r.tarihsiz)).toBe(true);
  });
});

describe("Spec 0136: anahtar çözümü (R10/3–R10/8)", () => {
  it("AC-23 / AC-24: kapanıştan sonra satılan stok makinası stok bağıyla donmuş kalır; bağ yoksa dondurulmamış", () => {
    const satilan = { id: 21, name: "Yeni", model: "AK100", serialNo: "S1", partiId: 1, uretimTarihi: "2026-01-10", sourceStockId: 1 };
    const stock = V.STOCK.filter(s => s.id !== 1);
    const h = hesapla(KIS, veriD({ stock, customers: [...V.CUSTOMERS, satilan] }));
    expect(tablo(h)).toEqual(tablo(ONCE));
    const bagsiz = hesapla(KIS, veriD({ stock, customers: [...V.CUSTOMERS, { ...satilan, sourceStockId: undefined }] }));
    expect(bagsiz.satirlar.some(r => r.dondurulmadi)).toBe(true);
    expect(bagsiz.dondurma.dondurulmamis).toBe(1);
  });
  it("AC-25 / AC-27 / AC-58 / AC-59: kapanıştan sonra eklenen makina kendi satırında, canlı payla ve nedenle; ötekiler korunur", () => {
    const stock = [...V.STOCK, { id: 8, model: "AK100", serialNo: "S8", partiId: 1, uretimTarihi: "2026-01-20" }];
    const v = veriD({ stock });
    const h = hesapla(KIS, v);
    const yeni = h.satirlar.filter(r => r.dondurulmadi);
    expect(yeni).toHaveLength(1);
    expect(yeni[0]).toMatchObject({ adet: 1, dondurmaNeden: DONDURULMAMIS_SATIR_NEDENI });
    expect(yeni[0].payK).toBe(payOf(v, 1).makinaPaylari.find(m => m.anahtar === "stok:8").payK);
    expect(h.satirlar.find(r => r.anahtar === "AK100#1").adet).toBe(2); // birleşmedi
    expect(tablo({ satirlar: h.satirlar.filter(r => !r.dondurulmadi) })).toEqual(tablo(ONCE));
    expect(h.dondurma.dondurulmamis).toBe(1);
  });
  it("AC-26: model adı değişse (zincir makinanın modelini de taşır) makina donmuş kalır", () => {
    const k = kat({ standardModels: [{ ...STANDART[0], model: "AK110" }] });
    const ren = (x) => (x.model === "AK100" ? { ...x, model: "AK110" } : x);
    const h = hesapla(KIS, veriD({ stock: V.STOCK.map(ren), customers: V.CUSTOMERS.map(ren) }), k);
    expect(h.satirlar.some(r => r.dondurulmadi)).toBe(false);
    expect(h.satirlar.filter(r => r.model === "AK110").map(r => [r.direktK, r.payK])).toEqual(ONCE.satirlar.filter(r => r.model === "AK100").map(r => [r.direktK, r.payK]));
  });
  it("AC-61: görüntüde olup bugün partiye bağlı olmayan anahtar satır üretmez", () => {
    const stock = V.STOCK.map(s => (s.id === 2 ? { ...s, partiId: null } : s));
    expect(hesapla(KIS, veriD({ stock })).satirlar.find(r => r.anahtar === "AK100#1").adet).toBe(1);
  });
  it("AC-62: müşterisi silinip stoğa dönen makina dondurulmamış, nedeni satırda", () => {
    const customers = V.CUSTOMERS.map(c => ({ ...c, deletedAt: "2026-06-10T00:00:00Z" }));
    const stock = [...V.STOCK, { id: 9, model: "AK100", serialNo: "C11", partiId: 1, uretimTarihi: "2026-02-15", note: "Silinen müşteriden geri döndü" }];
    const h = hesapla(KIS, veriD({ stock, customers }));
    const r = h.satirlar.find(x => x.dondurulmadi);
    expect(r.dondurmaNeden).toBe(DONDURULMAMIS_SATIR_NEDENI);
  });
});

describe("Spec 0136: dokunulmayanlar ve sapma (R12–R18, R21, C6/2)", () => {
  it("AC-28 / AC-31: görüntüsüz kapanmış ve açık parti canlı (çıktıda yeni alan yok)", () => {
    for (const p of [KIS0, V.PARTILER[1]]) {
      const h = hesapla(p, veri0());
      expect("dondurma" in h).toBe(false);
      expect(h.satirlar.some(r => "dondurulmadi" in r)).toBe(false);
    }
  });
  it("AC-67 / AC-79 (Karar 38): dondurma parti payı hesabının çıktısını ve öteki partilerin bölüşmesini değiştirmez", () => {
    expect(JSON.stringify(partiGenelPaylari(veriD(), B))).toBe(JSON.stringify(partiGenelPaylari(veri0(), B)));
  });
  it("AC-33 / AC-35 / AC-77: direkt toplam değişince parti başına tek satır, iki rakam; gösterilen rakam değişmez", () => {
    const k = kat({ malzemeler: [{ ...MALZ, kiloFiyati: 300 }] });
    const s = partiMaliyetSapmalari(veriD(), { katalog: k, modeller: modellerOf(k), partiSonucu: partiGenelPaylari(veriD(), B) });
    expect(s).toHaveLength(1);
    expect(s[0].direkt.kapanistaK).toBeLessThan(s[0].direkt.bugunK);
    expect(s[0].direkt.farkK).toBe(s[0].direkt.bugunK - s[0].direkt.kapanistaK);
    expect(s[0].pay).toBeNull();
    expect(tablo(hesapla(KIS, veriD(), k))).toEqual(tablo(ONCE));
  });
  it("AC-36 / AC-38: sapma yokken ve görüntüsüz veride boş", () => {
    expect(partiMaliyetSapmalari(veriD(), { katalog: kat(), modeller: modellerOf(kat()), partiSonucu: partiGenelPaylari(veriD(), B) })).toEqual([]);
    expect(partiMaliyetSapmalari(veri0(), { katalog: kat({ malzemeler: [{ ...MALZ, kiloFiyati: 300 }] }), modeller: [], partiSonucu: partiGenelPaylari(veri0(), B) })).toEqual([]);
  });
  it("AC-76: çöpe atılıp geri alınan partinin görüntüsü değişmez", () => {
    const cop = { ...KIS, deletedAt: "2026-06-20T00:00:00Z" };
    const { deletedAt: _d, ...geri } = cop;
    expect(kapanisMaliyetiOf(geri)).toEqual(GORUNTU);
  });
  it("AC-37 / AC-81 / AC-68 / AC-70 / AC-72 / AC-74: ekran metinleri tek sabit", () => {
    expect(SAPMA_DUZELTME).toBe("Düzeltmek için Üretim Partileri'nde partinin bitiş ayını silip yeniden girin.");
    expect(SAPMA_DIREKT_ETIKETI).toBe("Direkt maliyet");
    expect(SAPMA_BASLIGI).not.toMatch(/ortak gider/);
    expect(SAPMA_ALT_BASLIGI).toMatch(/gösterilen rakam değişmedi/i);
    expect(kapanisTarihiMetni("2026-04-02T09:00:00")).toBe("Kapanış 02.04.2026");
    expect(donmusSeritMetni("2026-04-02")).toBe("Rakamlar 02.04.2026 kapanışında donduruldu.");
    expect(DONDURULMADI_IBARESI).toMatch(/dondurulmadı/);
    expect(YENIDEN_ACMA_ONAYI).toMatch(/yeniden hesaplanır/);
    expect(PLAN_KAPALI_NEDENI).toMatch(/kapanmış partide/);
  });
});

describe("Spec 0136 triyaj", () => {
  it("bulgu 1: planlanan satırların direkt maliyeti sapmaya girer (yalnız planlı donmuş parti)", () => {
    const p = { id: 9, ad: "Plan", baslangicAy: "2026-01", bitisAy: "2026-02", planlananAdetler: { OZ: 2 } };
    const v = veri0({ uretimPartileri: [...V.PARTILER, p] });
    const donmus = { ...p, kapanisMaliyeti: kapat(v, p) };
    const v2 = veri0({ uretimPartileri: [...V.PARTILER, donmus] });
    const zam = kat({ parts: PARCALAR.map(x => (x.id === 1 ? { ...x, maliyet: 25, maliyetGecmisi: [...V.RULMAN_GECMISI, { gecerli: "2026-02-15", kurus: 2500 }] } : x)) });
    const s = partiMaliyetSapmalari(v2, { katalog: zam, modeller: modellerOf(zam), partiSonucu: partiGenelPaylari(v2, B) }).find(x => x.id === 9);
    expect(s.direkt).toMatchObject({ kapanistaK: 3000, bugunK: 5000, farkK: 2000 });
  });
  it("bulgu 1: durumu 'tamam' olmayan donmuş partide pay durumu ve satır payı görüntüden (canlı tamam olsa da)", () => {
    const rolsuz = veri0({ giderTurleri: V.TURLER.map(t => ({ ...t, maliyetRolu: "yok" })) });
    const g = kapat(rolsuz, KIS0);
    expect(g.durum).toBe("rolYok");
    const kis = { ...KIS0, kapanisMaliyeti: g };
    const v = veri0({ uretimPartileri: partilerD(kis) });
    expect(payOf(v, 1).durum).toBe("tamam");
    const h = hesapla(kis, v);
    expect(h.payDurumu).toEqual({ durum: "rolYok", neden: g.neden });
    expect(h.satirlar.find(r => r.anahtar === "AK100#1").payK).toBeNull();
  });
  it("bulgu 2: aralık kararı tek yerde; başlangıç ayı değişimi de aralık değişimidir", () => {
    expect(kapanisAraligiAyniMi(KIS, { ...KIS, ad: "x" })).toBe(true);
    expect(kapanisAraligiAyniMi(KIS, { ...KIS, baslangicAy: "2025-12" })).toBe(false);
    expect(kapanisAraligiAyniMi(KIS, { ...KIS, bitisAy: null })).toBe(false);
    expect(kapanisAraligiAyniMi(null, KIS)).toBe(false);
  });
  it("bulgu 4: kapanışta modeli bulunamayan makina sonradan model eklense de dondurulmamış; metin nedeni tahmin etmez", () => {
    const stock = [...V.STOCK, { id: 8, model: "YOK", serialNo: "Y8", partiId: 1, uretimTarihi: "2026-01-12" }];
    const kis = { ...KIS0, kapanisMaliyeti: kapat(veri0({ stock }), KIS0) };
    const k = kat({ customModels: [...V.OZEL, { model: "YOK", defaultParcalar: [{ partId: "2", ad: "Vida", miktar: 1 }] }] });
    const r = hesapla(kis, veri0({ stock, uretimPartileri: partilerD(kis) }), k).satirlar.filter(x => x.dondurulmadi);
    expect(r).toHaveLength(1);
    expect(r[0].dondurmaNeden).toBe(DONDURULMAMIS_SATIR_NEDENI);
    expect(DONDURULMAMIS_SATIR_NEDENI).not.toMatch(/sonra partiye bağlandı/);
    expect(DONDURULMAMIS_SATIR_NEDENI).toMatch(/Kapanış görüntüsünde/);
  });
});

describe("Spec 0136: kaynak taramaları", () => {
  const kod = (p) => oku(p).split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
  it("AC-45 / AC-85: sunucu, izin ve birleştirme yeni alanı bilmez; X13 spec'te yazılı", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"]) {
      expect(oku(f), f).not.toMatch(/kapanisMaliyeti/);
    }
    expect(oku("specs/done/0136-uretilmis-makinanin-maliyeti-donar.md")).toMatch(/\*\*X13\.\*\* Çakışma birleştirmesinin dondurulmuş görüntüyü geri uygulaması/);
  });
  it("AC-51: görüntüyü tek fonksiyon üretir; React, saat ve ekran durumu okumaz", () => {
    const m = kod("src/lib/makinaStandartMaliyet.js");
    const govde = m.slice(m.indexOf("export const partiKapanisGoruntusu"), m.indexOf("export const partiGosterimi"));
    expect(govde).not.toMatch(/new Date|Date\.now|useState|useMemo|react|localStorage/);
    expect(m).not.toMatch(/from "react"/);
    const kaynaklar = ["src/components/MakinaMaliyeti.jsx", "src/components/gider/UretimPartileri.jsx", "src/components/maliyet/PartiHesabi.jsx"];
    expect(kaynaklar.filter(f => /partiKapanisGoruntusu\(/.test(kod(f)))).toEqual(["src/components/MakinaMaliyeti.jsx"]);
  });
  it("AC-52: kapanış yolu görüntüyü parametre alır; ekranlar kendi maliyet hesabını yazmaz", () => {
    const up = kod("src/components/gider/UretimPartileri.jsx");
    expect(up).toMatch(/partiKapanisUygula\(eski, yeniKayit, havuz, simdiYerel\(\), goruntu\)/);
    for (const f of ["src/components/gider/UretimPartileri.jsx", "src/components/maliyet/PartiHesabi.jsx"]) {
      expect(kod(f), f).not.toMatch(/parcaMaliyetKurus|malzemeOzeti|modelMaliyeti\(|kapanisMaliyeti\.makinalar/);
    }
  });
  it("AC-41: Makina Maliyeti'nin yazdırma çıktıları görüntüyü okumaz", () => {
    for (const f of ["src/lib/siparisRaporu.js", "src/components/rapor/SiparisRaporuDugmesi.jsx", "src/components/maliyet/SiparisIhtiyaci.jsx", "src/lib/siparisIhtiyaci.js"]) {
      expect(kod(f), f).not.toMatch(/kapanisMaliyeti|kapanisMaliyetiOf|partiKapanisGoruntusu/);
    }
  });
  it("AC-84: sürüm notu önce sunucu PC, sonra istemciler", () => {
    expect(oku("specs/done/0136-uygulama-plani.md")).toMatch(/Önce sunucu PC, sonra bütün istemciler güncellenmeli/);
  });
});
