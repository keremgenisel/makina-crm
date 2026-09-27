// Spec 0022: üretim partisi ve parti bazlı maliyet, saf motor (makinaMaliyeti.js) ve yardımcılar (uretimPartisi.js).
import { describe, it, expect } from "vitest";
import { hesaplaMakinaMaliyetleri, makinaKarlilik, karlilikOzeti } from "../src/lib/makinaMaliyeti";
import { partiDogrula, partiAylari, partiKapanisUygula, partiMakinaSayisi } from "../src/lib/uretimPartisi";
import { partiDamgala, uretimTarihiDamgala } from "../src/lib/satisKaydi";

const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }];
const BUGUN = "2026-09-24";
const gid = (id, tarih, tutar, o = {}) => ({ id, tarih, turId: 1, tutar, kdvOrani: 20, ...o });
// Partili makinalar stokta; üretim tarihi ne olursa olsun payı partiden alır (R12).
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `T${String(id).padStart(3, "0")}`, addedDate: "2026-03-20", ...o });
const mus = (id, o = {}) => ({ id, name: `Firma ${id}`, model: "AK100", serialNo: `S${id}`, installDate: "2026-06-10", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-05-05", ...o });
const hesapla = (o = {}) => hesaplaMakinaMaliyetleri({
  customers: [], stock: [], partStockLog: [], giderler: [], giderTurleri: TUR, standartGiderler: [],
  standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" }, uretimPartileri: [], ...o,
}, { bugun: BUGUN });
const pay = (s, anahtar) => s.makinalar.get(anahtar).ortakPay;
const payTL = (s, anahtar) => pay(s, anahtar) / 100;
const PARTI_Q1 = { id: 50, ad: "2026-1", baslangicAy: "2026-01", bitisAy: "2026-03" };
const partili = (n, partiId = 50, bas = 1) => Array.from({ length: n }, (_, i) => stk(bas + i, { partiId }));
const toplamPay = (s) => [...s.makinalar.values()].reduce((t, m) => t + m.ortakPay, 0);

describe("Spec 0022: parti tanımı (R1)", () => {
  it("AC-1: ad, başlangıç ayı ve açıklamayla parti oluşturulur", () => {
    const r = partiDogrula({ ad: " 2026 Bahar ", baslangicAy: "2026-01", aciklama: "70 makina" }, []);
    expect(r.hatalar).toEqual({});
    expect(r.kayit).toMatchObject({ ad: "2026 Bahar", baslangicAy: "2026-01", bitisAy: null, aciklama: "70 makina" });
  });
  it("AC-22: aynı ad (büyük/küçük harf, Türkçe İ/ı dahil) ikinci kez kaydedilmez", () => {
    const mevcut = [{ id: 1, ad: "İstanbul Partisi", baslangicAy: "2026-01" }];
    expect(partiDogrula({ ad: "istanbul partisi", baslangicAy: "2026-02" }, mevcut).hatalar.ad).toBe("“istanbul partisi” adında bir parti zaten var.");
    expect(partiDogrula({ id: 1, ad: "İSTANBUL PARTİSİ", baslangicAy: "2026-01" }, mevcut).hatalar).toEqual({}); // kendisi
  });
  it("AC-23: bitiş ayı başlangıçtan önce girilemez", () => {
    const r = partiDogrula({ ad: "X", baslangicAy: "2026-05", bitisAy: "2026-04" }, []);
    expect(r).toEqual({ hatalar: { bitisAy: "Bitiş ayı başlangıç ayından önce olamaz." }, kayit: null });
  });
  it("R3: açık parti başlangıçtan bu aya, kapalı parti başlangıçtan bitişe", () => {
    expect(partiAylari({ baslangicAy: "2026-07" }, "2026-09")).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(partiAylari(PARTI_Q1, "2026-09")).toEqual(["2026-01", "2026-02", "2026-03"]);
  });
});

describe("Spec 0022: ortak gider bölmesi (R3, R4, R5, R12, R13)", () => {
  const Q1_GIDER = [gid(1, "2026-01-10", 70000), gid(2, "2026-02-10", 70000), gid(3, "2026-03-10", 70001)];
  it("AC-3 / AC-4: Ocak–Mart, 70 makina: üç ayın toplamı 70'e bölünür; artık ilk üretilene; toplam tam", () => {
    const s = hesapla({ stock: partili(70), giderler: Q1_GIDER, uretimPartileri: [PARTI_Q1] });
    const toplam = 21000100; // kuruş
    const taban = Math.floor(toplam / 70);
    expect(pay(s, "stok:1")).toBe(taban + (toplam - taban * 70));
    for (let i = 2; i <= 70; i++) expect(pay(s, `stok:${i}`)).toBe(taban);
    expect(toplamPay(s)).toBe(toplam);
    expect(s.partiler[0]).toMatchObject({ ad: "2026-1", acik: false, adet: 70, havuz: 210001 });
  });
  it("AC-5: aynı ayda 30'luk ve 70'lik iki parti: ayın gideri 30'a 70 bölünür", () => {
    const A = { id: 60, ad: "A", baslangicAy: "2026-04", bitisAy: "2026-04" }, B = { id: 61, ad: "B", baslangicAy: "2026-04", bitisAy: "2026-04" };
    const s = hesapla({ stock: [...partili(30, 60, 1), ...partili(70, 61, 101)], giderler: [gid(1, "2026-04-10", 100000)], uretimPartileri: [A, B] });
    expect(s.aylar.get("2026-04").partiPaylari.map(p => [p.partiId, p.adet, p.pay])).toEqual([["60", 30, 3000000], ["61", 70, 7000000]]);
    expect(payTL(s, "stok:1")).toBe(1000);
    expect(payTL(s, "stok:101")).toBe(1000);
  });
  it("AC-6 / AC-8: partisiz ay ve partisiz makina bugünkü kuralla (ayın gideri / o ay üretilen)", () => {
    const s = hesapla({ customers: [mus(1), mus(2)], stock: partili(10), giderler: [gid(1, "2026-05-10", 60000), ...Q1_GIDER], uretimPartileri: [PARTI_Q1] });
    expect(payTL(s, "musteri:1")).toBe(30000);
    expect(payTL(s, "musteri:2")).toBe(30000);
    const s0 = hesapla({ customers: [mus(1), mus(2)], giderler: [gid(1, "2026-05-10", 60000)] });
    expect(pay(s0, "musteri:1")).toBe(pay(s, "musteri:1"));
  });
  it("AC-7: hiç üretim ve açık parti olmayan ayda gider dağıtılmaz, dönem özetinde görünür", () => {
    const s = hesapla({ stock: partili(5), giderler: [...Q1_GIDER, gid(9, "2026-04-10", 12345)], uretimPartileri: [PARTI_Q1] });
    expect(s.aylar.get("2026-04")).toMatchObject({ dagitilmamis: 1234500, partiPaylari: [] });
    expect(karlilikOzeti(s, { baslangic: "2026-04-01", bitis: "2026-04-30" }).dagitilmamis.tutar).toBe(12345);
  });
  it("AC-15 / AC-17: 70'lik açık parti + 2 partisiz makina: 72 pay; dağıtılan toplam ayın ortağına eşit", () => {
    const P = { id: 70, ad: "P", baslangicAy: "2026-05", bitisAy: "2026-05" };
    const s = hesapla({ customers: [mus(1), mus(2)], stock: partili(70, 70, 10), giderler: [gid(1, "2026-05-10", 72000)], uretimPartileri: [P] });
    expect(s.aylar.get("2026-05").partiPaylari).toEqual([{ partiId: "70", adet: 70, pay: 7000000 }]);
    expect(payTL(s, "musteri:1")).toBe(1000);
    expect(payTL(s, "musteri:2")).toBe(1000);
    expect(payTL(s, "stok:10")).toBe(1000);
    expect(toplamPay(s)).toBe(7200000);
  });
  it("R13: ay içi kuruş artığı en önce üretilmiş makinası olan hak sahibine", () => {
    const P = { id: 71, ad: "P", baslangicAy: "2026-05", bitisAy: "2026-05" };
    // 3 hak sahibi ağırlığı (parti 2 + partisiz 1), 100,00 ₺: parti 66,66, partisiz 33,33, artık 0,01 ilk sahibe.
    const s = hesapla({ customers: [mus(1, { uretimTarihi: "2026-05-01" })], stock: partili(2, 71, 10).map(x => ({ ...x, addedDate: "2026-05-20" })), giderler: [gid(1, "2026-05-10", 100)], uretimPartileri: [P] });
    expect(pay(s, "musteri:1")).toBe(3334);
    expect(s.aylar.get("2026-05").partiPaylari[0].pay).toBe(6666);
    expect(toplamPay(s)).toBe(10000);
  });
  it("AC-18: açık partiye makina eklenince önceki ayların payları da yeniden bölünür, toplam aynı", () => {
    const P = { id: 72, ad: "Açık", baslangicAy: "2026-07" };
    const g = [gid(1, "2026-07-10", 30000), gid(2, "2026-08-10", 30000), gid(3, "2026-09-10", 30000)];
    const s1 = hesapla({ stock: partili(3, 72), giderler: g, uretimPartileri: [P] });
    const s2 = hesapla({ stock: partili(6, 72), giderler: g, uretimPartileri: [P] });
    expect(payTL(s1, "stok:1")).toBe(30000);
    expect(payTL(s2, "stok:1")).toBe(15000);
    expect(toplamPay(s1)).toBe(toplamPay(s2));
    expect(toplamPay(s2)).toBe(9000000);
  });
  it("AC-19: partili makina üretildiği ayın üretim sayısına girmez; partisiz payı etkilenmez", () => {
    const g = [gid(1, "2026-05-10", 60000), ...Q1_GIDER];
    const partiliMayis = partili(3).map(x => ({ ...x, addedDate: "2026-05-15" }));
    const s = hesapla({ customers: [mus(1), mus(2)], stock: partiliMayis, giderler: g, uretimPartileri: [PARTI_Q1] });
    expect(s.aylar.get("2026-05").uretimAdedi).toBe(2);
    expect(payTL(s, "musteri:1")).toBe(30000);
  });
  it("R14 (P5): makinası olmayan açık parti hak sahibi değil; ay dağıtılmamış kalır", () => {
    const P = { id: 73, ad: "Boş", baslangicAy: "2026-08" };
    const s = hesapla({ giderler: [gid(1, "2026-08-10", 5000)], uretimPartileri: [P] });
    expect(s.aylar.get("2026-08")).toMatchObject({ dagitilmamis: 500000, partiPaylari: [] });
    expect(s.partiler[0]).toMatchObject({ adet: 0, makinaBasi: null });
  });
  it("R12 (P2): partinin bütün ayları yürürlük öncesiyse makina 'veri yok'; kısmen öncesiyse yalnız sonrası sayılır", () => {
    const eski = { id: 74, ad: "Eski", baslangicAy: "2025-10", bitisAy: "2025-12" };
    const s = hesapla({ stock: partili(2, 74), giderler: [gid(1, "2025-11-10", 9000)], uretimPartileri: [eski] });
    expect(s.makinalar.get("stok:1").veriYok).toBe(true);
    const yari = { id: 75, ad: "Yarı", baslangicAy: "2025-12", bitisAy: "2026-01" };
    const s2 = hesapla({ stock: partili(2, 75), giderler: [gid(1, "2025-12-10", 9000), gid(2, "2026-01-10", 4000)], uretimPartileri: [yari] });
    expect(s2.makinalar.get("stok:1").veriYok).toBe(false);
    expect(payTL(s2, "stok:1") + payTL(s2, "stok:2")).toBe(4000);
  });
  it("AC-12: model havuzu ve doğrudan gider partiden etkilenmez", () => {
    const g = [...Q1_GIDER, gid(20, "2026-01-05", 5000, { atamaTur: "makina", makinaTur: "stok", makinaId: 1 }),
      gid(21, "2026-01-01", 20000, { atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 20 }] })];
    const a = hesapla({ stock: partili(10), giderler: g, uretimPartileri: [PARTI_Q1] });
    const b = hesapla({ stock: partili(10).map(x => ({ ...x, partiId: undefined })), giderler: g });
    for (let i = 1; i <= 10; i++) {
      expect(a.makinalar.get(`stok:${i}`).dogrudan).toBe(b.makinalar.get(`stok:${i}`).dogrudan);
      expect(a.makinalar.get(`stok:${i}`).malzeme).toBe(b.makinalar.get(`stok:${i}`).malzeme);
    }
  });
});

describe("Spec 0022: satış, dönüş, silme (R2, R11)", () => {
  it("AC-2 / AC-20: satışta parti bağı müşteri kaydına damgalanır; maliyet partiden gelmeye devam eder", () => {
    const stok = stk(1, { partiId: 50 });
    const satis = partiDamgala(uretimTarihiDamgala({ id: 900, model: "AK100", serialNo: "T001", installDate: "2026-06-01" }, stok), stok);
    expect(satis).toMatchObject({ partiId: 50, uretimTarihi: "2026-03-20" });
    const once = hesapla({ stock: partili(2), giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [PARTI_Q1] });
    const sonra = hesapla({ stock: [stk(2, { partiId: 50 })], customers: [{ ...satis, id: 1 }], giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [PARTI_Q1] });
    expect(makinaKarlilik(sonra, "musteri:1").parti).toMatchObject({ ad: "2026-1" });
    expect(pay(sonra, "musteri:1") + pay(sonra, "stok:2")).toBe(pay(once, "stok:1") + pay(once, "stok:2"));
  });
  it("R2: elle seçilmiş parti damgayla ezilmez; partisiz stok satırı alan eklemez", () => {
    expect(partiDamgala({ partiId: 7 }, { partiId: 50 }).partiId).toBe(7);
    expect(partiDamgala({ id: 1 }, { id: 2 })).toEqual({ id: 1 });
  });
  it("AC-14 / R11: silinen parti okuma anında çözülür, makinalar aylık kurala döner; etkilenen sayı", () => {
    const stock = partili(3).map(x => ({ ...x, addedDate: "2026-02-15" }));
    expect(partiMakinaSayisi(50, { stock, customers: [mus(9, { partiId: 50 }), mus(10, { partiId: 50, deletedAt: "x" })] })).toBe(4);
    const s = hesapla({ stock, giderler: [gid(1, "2026-02-10", 3000)], uretimPartileri: [] });
    expect(s.makinalar.get("stok:1").parti).toBeUndefined();
    expect(s.aylar.get("2026-02").uretimAdedi).toBe(3);
    expect(payTL(s, "stok:1")).toBe(1000);
  });
});

describe("Spec 0022: geçici ibare, kapanış ve dönem özeti (R7, R8, R15, AC-16)", () => {
  it("AC-9 / AC-10: açık partide maliyet geçici; kapanınca etiket kalkar ama rakam dondurulmaz", () => {
    const acik = { ...PARTI_Q1, bitisAy: null };
    const sA = hesapla({ stock: partili(2), giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [acik] });
    expect(makinaKarlilik(sA, "stok:1")).toMatchObject({ gecici: true, parti: { acik: true } });
    const sK = hesapla({ stock: partili(2), giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [PARTI_Q1] });
    expect(makinaKarlilik(sK, "stok:1").gecici).toBe(false);
    const sK2 = hesapla({ stock: partili(2), giderler: [gid(1, "2026-02-10", 1000), gid(2, "2026-03-10", 2000)], uretimPartileri: [PARTI_Q1] });
    expect(pay(sK2, "stok:1")).toBeGreaterThan(pay(sK, "stok:1"));
  });
  it("AC-11 / R15: kapanış anlık görüntüsünden farklı ay 'değişti' satırı üretir", () => {
    const g = [gid(1, "2026-01-10", 1000), gid(2, "2026-02-10", 1000)];
    const s = hesapla({ stock: partili(2), giderler: g, uretimPartileri: [] });
    const kapali = partiKapanisUygula(null, { ...PARTI_Q1 }, s.aylar, "2026-04-01T10:00:00");
    expect(kapali.kapanisOrtaklari).toEqual({ "2026-01": 100000, "2026-02": 100000, "2026-03": 0 });
    const sAyni = hesapla({ stock: partili(2), giderler: g, uretimPartileri: [kapali] });
    expect(sAyni.partiler[0].degisimler).toEqual([]);
    const sYeni = hesapla({ stock: partili(2), giderler: [...g, gid(3, "2026-02-20", 500)], uretimPartileri: [kapali] });
    expect(sYeni.partiler[0].degisimler).toEqual([{ ay: "2026-02", kapanista: 1000, bugun: 1500 }]);
  });
  it("R15: parti yeniden açılınca anlık görüntü silinir; aralık aynı kalan kapalı parti görüntüsünü korur", () => {
    const k = { ...PARTI_Q1, kapanmaZamani: "t1", kapanisOrtaklari: { "2026-01": 1 } };
    expect(partiKapanisUygula(k, { ...k, bitisAy: null }, new Map(), "t2")).toMatchObject({ kapanmaZamani: null, kapanisOrtaklari: null });
    expect(partiKapanisUygula(k, { ...k, aciklama: "x" }, new Map(), "t2")).toMatchObject({ kapanmaZamani: "t1", kapanisOrtaklari: { "2026-01": 1 } });
    expect(partiKapanisUygula(k, { ...k, bitisAy: "2026-04" }, new Map(), "t2").kapanmaZamani).toBe("t2");
  });
  it("AC-16: 'stokta taşınan maliyet' satırı parti kırılımıyla; açık parti stokta makinası olmasa da görünür", () => {
    const acik = { id: 80, ad: "Açık parti", baslangicAy: "2026-08" };
    const s = hesapla({ stock: partili(2), giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [PARTI_Q1, acik] });
    const oz = karlilikOzeti(s, { baslangic: "2026-09-01", bitis: "2026-09-30" });
    expect(oz.stokta.partiler).toEqual([{ id: 50, ad: "2026-1", acik: false, adet: 2, maliyet: 1000 }, { id: 80, ad: "Açık parti", acik: true, adet: 0, maliyet: 0 }]);
  });
});

describe("Spec 0022 triyaj düzeltmeleri", () => {
  it("bulgu 1: üretim tarihi boş partili makina özetlerde görünür; payı hiçbir satırdan kaybolmaz", () => {
    const P = { id: 90, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-02" };
    const stock = [stk(1, { partiId: 90 }), stk(2, { partiId: 90, addedDate: "" })];
    const s = hesapla({ stock, giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [P] });
    expect(payTL(s, "stok:1")).toBe(500);
    expect(payTL(s, "stok:2")).toBe(500);
    const oz = karlilikOzeti(s, { baslangic: "2026-09-01", bitis: "2026-09-30" });
    expect(oz.stokta).toMatchObject({ adet: 2, maliyet: 1000 });
    expect(oz.bilinmiyor.adet).toBe(0);
    expect(makinaKarlilik(s, "stok:2").bilinmiyor).toBe(false);
    // Satılmış tarihsiz partili makina da satış özetinde yer alır.
    const s2 = hesapla({ customers: [mus(1, { uretimTarihi: "", installDate: "2026-06-10", partiId: 90 })], stock: [stk(1, { partiId: 90 })], giderler: [gid(1, "2026-02-10", 1000)], uretimPartileri: [P] });
    const oz2 = karlilikOzeti(s2, { baslangic: "2026-06-01", bitis: "2026-06-30" });
    expect(oz2.satirlar.map(d => d.anahtar)).toEqual(["musteri:1"]);
    expect(oz2.bilinmiyor.adet).toBe(0);
  });
  it("bulgu 1: partisiz tarihsiz makina eskisi gibi 'bilinmiyor'", () => {
    const s = hesapla({ customers: [mus(1, { uretimTarihi: "", installDate: "" })] });
    expect(makinaKarlilik(s, "musteri:1").bilinmiyor).toBe(true);
  });
  it("bulgu 2: başlangıcı gelecek aydaki parti 'veri yok' değil, 'henüz başlamadı'; payı 0", () => {
    const P = { id: 91, ad: "Gelecek", baslangicAy: "2026-11" };
    const s = hesapla({ stock: [stk(1, { partiId: 91 })], giderler: [gid(1, "2026-09-10", 1000)], uretimPartileri: [P] });
    const d = makinaKarlilik(s, "stok:1");
    expect(d).toMatchObject({ veriYok: false, partiBaslamadi: true, ortakPay: 0 });
    expect(s.aylar.get("2026-09").dagitilmamis).toBe(100000);
    const eski = hesapla({ stock: [stk(1, { partiId: 92 })], uretimPartileri: [{ id: 92, ad: "Eski", baslangicAy: "2025-10", bitisAy: "2025-12" }] });
    expect(makinaKarlilik(eski, "stok:1")).toMatchObject({ veriYok: true, partiBaslamadi: false });
  });
});
