// Spec 0002: makina maliyeti ve kârlılık saf motoru (src/lib/makinaMaliyeti.js).
import { describe, it, expect } from "vitest";
import {
  hesaplaMakinaMaliyetleri, karlilikOzeti, makinaKarlilik, fiyatOnerisi, sonOnIkiAy, marjBicim, carpanBicim,
  musteriUretimTarihi, URETIM_KAYNAK, FIYAT_YONTEM, donenStokUretimTarihi,
} from "../src/lib/makinaMaliyeti";
import { hesaplaGiderRaporu, canliModelSeti } from "../src/lib/gider";
import { gercekSatisBedeli } from "../src/lib/utils";

const MOD = [{ model: "AK100" }, { model: "AK200" }, { model: "AK300" }];
const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const BUGUN = "2026-09-24";
const veri = (o = {}) => ({
  customers: [], stock: [], partStockLog: [], giderler: [], giderTurleri: TUR, standartGiderler: [],
  standardModels: MOD, customModels: [], giderAyarlari: { yururlukAy: "2026-01" }, ...o,
});
const hesapla = (o) => hesaplaMakinaMaliyetleri(veri(o), { bugun: BUGUN });
const mus = (id, o = {}) => ({ id, name: `Firma ${id}`, model: "AK100", serialNo: `S${id}`, installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-03-05", ...o });
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `T${id}`, addedDate: "2026-03-05", ...o });
const gid = (id, o = {}) => ({ id, tarih: "2026-03-15", turId: 1, tutar: 1000, kdvOrani: 20, ...o });
const kar = (s, id, rates) => makinaKarlilik(s, `musteri:${id}`, rates);
const ozet = (s, bas, bit, rates) => karlilikOzeti(s, { baslangic: bas, bitis: bit, rates });
const MART = ["2026-03-01", "2026-03-31"];

describe("ortak gider payı (R2, R11, R1c)", () => {
  it("AC-1: ayda 300.000 ortak gider ve 5 üretim → makina başı 60.000", () => {
    const s = hesapla({ customers: [1, 2, 3, 4, 5].map(i => mus(i)), giderler: [gid(1, { tutar: 300000 })] });
    for (const i of [1, 2, 3, 4, 5]) expect(kar(s, i).ortakPay).toBe(60000);
  });
  it("AC-32: pay üretim ayındadır; makina başka ayda satılsa da değişmez", () => {
    const s = hesapla({
      customers: [mus(1, { installDate: "2026-07-10" }), ...[2, 3, 4, 5].map(i => mus(i)), mus(6, { uretimTarihi: "2026-07-02", installDate: "2026-07-05" })],
      giderler: [gid(1, { tutar: 300000 }), gid(2, { tarih: "2026-07-01", tutar: 999999 })],
    });
    expect(kar(s, 1).ortakPay).toBe(60000);
    expect(kar(s, 6).ortakPay).toBe(999999);
  });
  it("AC-47: 300.000 / 7 → kuruş aşağı yuvarlanır, artık ilk üretilen makinaya, toplam tam", () => {
    const s = hesapla({ customers: [1, 2, 3, 4, 5, 6, 7].map(i => mus(i, { uretimTarihi: `2026-03-0${i}` })), giderler: [gid(1, { tutar: 300000 })] });
    const paylar = [1, 2, 3, 4, 5, 6, 7].map(i => kar(s, i).ortakPay);
    expect(paylar[0]).toBe(42857.16);
    expect(paylar.slice(1).every(p => p === 42857.14)).toBe(true);
    expect(Math.round(paylar.reduce((a, b) => a + b, 0) * 100)).toBe(30000000);
  });
  it("AC-11: gider olan ama üretim olmayan ay hata vermez, dağıtılmamış ortak gider olur", () => {
    const s = hesapla({ customers: [mus(1)], giderler: [gid(1, { tarih: "2026-04-10", tutar: 50000 })] });
    expect(s.aylar.get("2026-04")).toMatchObject({ uretimAdedi: 0, dagitilmamis: 5000000 });
    expect(kar(s, 1).ortakPay).toBe(0);
    expect(ozet(s, "2026-04-01", "2026-04-30").dagitilmamis.tutar).toBe(50000);
  });
  it("AC-64: yürürlük içinde gider kalemi olmayan ayda pay 0; maliyet gösterilir, veri yok uyarısı yok", () => {
    const d = kar(hesapla({ customers: [mus(1)] }), 1);
    expect(d.veriYok).toBe(false);
    expect(d.ortakPay).toBe(0);
    expect(d.kar).toBe(500000);
  });
  it("AC-76: 70.000'in 50.000'i modellere dağıtılmışsa kalan 20.000 ortak paya girer", () => {
    const s = hesapla({
      customers: [mus(1, { model: "AK200", uretimTarihi: "2026-03-20" })],
      giderler: [gid(1, { tutar: 70000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 50 }] })],
    });
    expect(s.aylar.get("2026-03").ortakGercek).toBe(2000000);
    expect(kar(s, 1).ortakPay).toBe(20000);
  });
  it("AC-27: modele atanmış kalem ortak payı hesabına girmez", () => {
    const s = hesapla({ customers: [mus(1)], giderler: [gid(1, { tutar: 40000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 40 }] })] });
    expect(s.aylar.get("2026-03").ortakGercek).toBe(0);
    expect(kar(s, 1).ortakPay).toBe(0);
  });
  it("AC-70: kira veya personel kalemi atama taşısa bile doğrudan gider sayılmaz, tamamı ortağa girer", () => {
    const s = hesapla({
      customers: [mus(1)],
      giderler: [gid(1, { turId: 2, tutar: 30000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 }),
        gid(2, { turId: 3, resmiTutar: 20000, eldenTutar: 5000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 })],
    });
    expect(kar(s, 1).dogrudan).toBe(0);
    expect(kar(s, 1).ortakPay).toBe(55000);
  });
  it("AC-71: silinmiş modele ait satır havuza girmez, ortak havuza eklenip payı yükseltir", () => {
    const s = hesapla({
      customers: [mus(1)], customModels: [{ model: "OZEL_X", deletedAt: "x" }],
      giderler: [gid(1, { tutar: 10000, atamaTur: "model", modelSatirlari: [{ modelAd: "OZEL_X", birimMaliyet: 1000, adet: 10 }] })],
    });
    expect(s.havuzlar).toHaveLength(0);
    expect(kar(s, 1).ortakPay).toBe(10000);
  });
  it("AC-31: dağıtılmasın işaretli kalem hiçbir makinada ve havuzda yok, ortak paya da girmez", () => {
    const s = hesapla({ customers: [mus(1)], giderler: [gid(1, { tutar: 9000, atamaTur: "dagitma" })] });
    expect(kar(s, 1)).toMatchObject({ dogrudan: 0, malzeme: 0, ortakPay: 0 });
    expect(s.havuzlar).toHaveLength(0);
  });
  it("DoD: dört sınıfın toplamı 0001 dönem gider toplamına eşit; hiçbir kalem iki sınıfta sayılmaz", () => {
    const giderler = [gid(1, { tutar: 70000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 50 }] }),
      gid(2, { tutar: 12000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 }), gid(3, { tutar: 8000, atamaTur: "dagitma" }),
      gid(4, { turId: 2, tutar: 25000 }), gid(5, { turId: 3, resmiTutar: 10000, eldenTutar: 3000 })];
    const customers = [mus(1)];
    const s = hesapla({ customers, giderler });
    const sn = s.aylar.get("2026-03").siniflar;
    const r = hesaplaGiderRaporu({ giderler, turler: TUR, customers, canliModeller: canliModelSeti(MOD, []), yururlukAy: "2026-01" }, { baslangic: "2026-03-01", bitis: "2026-03-31" });
    expect((sn.makina + sn.model + sn.dagitma + sn.ortak) / 100).toBe(r.toplam);
    expect(sn.makina / 100).toBe(r.kovalar.makina);
    expect(sn.ortak / 100).toBe(r.kovalar.ortak);
  });
});

describe("maliyet ve kâr (R1, R4, R6, R8, R23)", () => {
  const temel = () => hesapla({
    customers: [mus(1, { komisyon: 15000 }), ...[2, 3, 4, 5].map(i => mus(i))],
    giderler: [gid(1, { tutar: 300000 }), gid(2, { tutar: 20000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 })],
  });
  it("AC-2: 60.000 pay + 20.000 doğrudan + 15.000 komisyon = 95.000", () => {
    expect(kar(temel(), 1).toplamMaliyet).toBe(95000);
  });
  it("AC-8: kırılım satırlarının toplamı gösterilen maliyete eşit", () => {
    const d = kar(temel(), 1);
    expect(d.dogrudan + d.malzeme + d.ortakPay + d.komisyon).toBe(d.toplamMaliyet);
    expect(d.dogrudanKalemler).toHaveLength(1);
  });
  it("AC-3: 500.000 bedelde kâr 405.000, marj %81,0", () => {
    const d = kar(temel(), 1);
    expect(d.kar).toBe(405000);
    expect(marjBicim(d.marj)).toBe("%81,0");
  });
  it("AC-4: maliyet bedelden yüksekse zarar olarak işaretlenir", () => {
    const s = hesapla({ customers: [mus(1, { fabrikaSatisBedeli: 50000 })], giderler: [gid(1, { tutar: 80000 })] });
    expect(kar(s, 1)).toMatchObject({ zarar: true, kar: -30000 });
  });
  it("AC-5: fabrika satış bedeli varsa fatura bedeli farklı olsa da o kullanılır", () => {
    const c = mus(1, { faturali: "Faturalı Yurtiçi", faturaBedeli: 400000, fabrikaSatisBedeli: 500000 });
    expect(kar(hesapla({ customers: [c] }), 1).satisBedeli).toBe(500000);
  });
  it("AC-6: fabrika satış bedeli boşsa fatura bedeli kullanılır", () => {
    const c = mus(1, { faturali: "Faturalı Yurtiçi", faturaBedeli: 400000, fabrikaSatisBedeli: "" });
    expect(kar(hesapla({ customers: [c] }), 1).satisBedeli).toBe(400000);
  });
  it("AC-38: 145.781 maliyet ve 319.986 bedelde çarpan 2,19", () => {
    const s = hesapla({ customers: [mus(1, { fabrikaSatisBedeli: 319986 })], giderler: [gid(1, { tutar: 145781 })] });
    expect(carpanBicim(kar(s, 1).carpan)).toBe("2,19");
  });
  it("AC-56: toplam maliyet sıfırsa çarpan — ve hata yok", () => {
    const d = kar(hesapla({ customers: [mus(1)] }), 1);
    expect(d.carpan).toBeNull();
    expect(carpanBicim(d.carpan)).toBe("—");
  });
  it("AC-57: satış bedeli sıfırsa marj —", () => {
    const d = kar(hesapla({ customers: [mus(1, { fabrikaSatisBedeli: 0 })] }), 1);
    expect(d.marj).toBeNull();
    expect(marjBicim(d.marj)).toBe("—");
  });
  it("AC-58: marj bir, çarpan iki ondalık", () => {
    expect(marjBicim(81)).toBe("%81,0");
    expect(marjBicim(12.345)).toBe("%12,3");
    expect(carpanBicim(2.1949)).toBe("2,19");
  });
  it("AC-68: aynı makinaya Extra Kalıp satışı kârı değiştirmez (motor Extra Kalıp gelirini hiç okumaz)", () => {
    const a = kar(temel(), 1);
    const b = kar(hesaplaMakinaMaliyetleri({ ...veri({ customers: [mus(1, { komisyon: 15000 }), ...[2, 3, 4, 5].map(i => mus(i))],
      giderler: [gid(1, { tutar: 300000 }), gid(2, { tutar: 20000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 })] }),
      partSales: [{ id: 9, customerId: 1, tur: "Kalıp", fiyat: 99999 }] }, { bugun: BUGUN }), 1);
    expect(b.kar).toBe(a.kar);
  });
  it("C2: motorun satış bedeli Finans/aylık rapor kuralıyla (gercekSatisBedeli) aynı", () => {
    for (const c of [mus(1), mus(2, { fabrikaSatisBedeli: "", faturali: "Faturalı Yurtiçi", faturaBedeli: 12345 }), mus(3, { fabrikaSatisBedeli: "", faturali: "Faturasız Yurtiçi", faturaBedeli: 999 })]) {
      const d = kar(hesapla({ customers: [c] }), c.id);
      expect(d.bedelOrijinal).toBe(gercekSatisBedeli(c));
    }
  });
});

describe("kur ve para birimi (R4b, R12, R13)", () => {
  const usd = (o) => mus(1, { currency: "USD", fabrikaSatisBedeli: 10000, komisyon: 500, ...o });
  it("AC-13: kayıtlı kurlu USD satışın TL kârı güncel kur değişse de değişmez", () => {
    const s = hesapla({ customers: [usd({ satisKuru: 40 })] });
    expect(kar(s, 1, { usd: 50 }).satisBedeli).toBe(400000);
    expect(kar(s, 1, { usd: 60 }).satisBedeli).toBe(400000);
    expect(kar(s, 1, { usd: 60 }).kurDurum).toBe("kayitli");
  });
  it("AC-14: kursuz eski USD satış güncel kurla, 'yaklaşık' işaretli", () => {
    const s = hesapla({ customers: [usd()] });
    expect(kar(s, 1, { usd: 50 })).toMatchObject({ satisBedeli: 500000, kurDurum: "yaklasik" });
    expect(ozet(s, ...MART, { usd: 50 }).yaklasikVar).toBe(true);
  });
  it("AC-53: TL kâr yanında orijinal USD tutar da döner", () => {
    expect(kar(hesapla({ customers: [usd({ satisKuru: 40 })] }), 1)).toMatchObject({ para: "USD", bedelOrijinal: 10000, satisBedeli: 400000 });
  });
  it("AC-54: komisyon satışla aynı para biriminde, aynı kurla çevrilir", () => {
    expect(kar(hesapla({ customers: [usd({ satisKuru: 40 })] }), 1).komisyon).toBe(20000);
  });
  it("AC-55: kur kayıtlı değil ve güncel kur yoksa TL karşılığı hesaplanamaz, toplamlara girmez", () => {
    const s = hesapla({ customers: [usd(), mus(2)] });
    expect(kar(s, 1, null)).toMatchObject({ kurDurum: "yok", kar: null });
    const o = ozet(s, ...MART, null);
    expect(o.kursuz.adet).toBe(1);
    expect(o.satirlar.map(d => d.makina.id)).toEqual([2]);
  });
});

describe("üretim tarihi (R1b, R1c)", () => {
  it("AC-42: kayıtlı tarih yoksa makina üretimi stok hareketinin tarihi kullanılır", () => {
    const c = mus(1, { uretimTarihi: "", sourceStockId: 77 });
    const s = hesapla({ customers: [c], partStockLog: [{ tip: "makina_uretimi", referansId: 77, tarih: "2026-02-10" }, { tip: "makina_uretimi", referansId: 77, tarih: "2026-02-12" }] });
    expect(kar(s, 1)).toMatchObject({ uretimTarihi: "2026-02-10", uretimKaynak: URETIM_KAYNAK.HAREKET });
  });
  it("AC-43: ne kayıt ne hareket varsa satış tarihi, 'tahmin' kaynağıyla", () => {
    expect(musteriUretimTarihi(mus(1, { uretimTarihi: "", sourceStockId: 77 }))).toEqual({ tarih: "2026-03-20", kaynak: URETIM_KAYNAK.TAHMIN });
  });
  it("AC-33: stoğa hiç girmeden açılan makinada satış tarihi üretim tarihidir (tahmin değil)", () => {
    expect(musteriUretimTarihi(mus(1, { uretimTarihi: "" }))).toEqual({ tarih: "2026-03-20", kaynak: URETIM_KAYNAK.DOGRUDAN });
  });
  it("AC-75: elle girilen üretim tarihi tahmini kaldırır, pay yeni tarihin ayından", () => {
    const giderler = [gid(1, { tarih: "2026-02-10", tutar: 7000 }), gid(2, { tutar: 3000 })];
    const once = kar(hesapla({ customers: [mus(1, { uretimTarihi: "", sourceStockId: 5 })], giderler }), 1);
    expect(once.uretimKaynak).toBe(URETIM_KAYNAK.TAHMIN);
    expect(once.ortakPay).toBe(3000);
    const sonra = kar(hesapla({ customers: [mus(1, { uretimTarihi: "2026-02-01", sourceStockId: 5 })], giderler }), 1);
    expect(sonra).toMatchObject({ uretimKaynak: URETIM_KAYNAK.KAYIT, ortakPay: 7000 });
  });
  it("AC-44: silinen müşteriden dönen makina dönüş ayına sayılmaz, özgün ayında bir kez sayılır", () => {
    const silinen = mus(1, { deletedAt: "2026-09-02", uretimTarihi: "2026-03-05" });
    const donen = stk(50, { model: "AK100", serialNo: "S1", addedDate: "2026-09-02", note: "Silinen müşteriden geri döndü", uretimTarihi: "2026-03-05" });
    const s = hesapla({ customers: [silinen, mus(2)], stock: [donen], giderler: [gid(1, { tutar: 10000 }), gid(2, { tarih: "2026-09-10", tutar: 5000 })] });
    expect(s.aylar.get("2026-03").uretimAdedi).toBe(2);
    expect(s.aylar.get("2026-09").uretimAdedi).toBe(0);
    expect(s.makinalar.get("stok:50").ortakPay).toBe(500000);
  });
  it("AC-44 (eski satır): tarih taşımayan geri dönen satır çöpteki müşterisinden özgün tarihi bulur", () => {
    const silinen = mus(1, { deletedAt: "x", uretimTarihi: "2026-04-04" });
    const donen = stk(50, { serialNo: "S1", addedDate: "2026-09-02", note: "Silinen müşteriden geri döndü" });
    const s = hesapla({ customers: [silinen], stock: [donen] });
    expect(s.makinalar.get("stok:50").uretimTarihi).toBe("2026-04-04");
    expect(s.aylar.get("2026-09").uretimAdedi).toBe(0);
  });
  it("AC-45: çöpteki makina hiçbir aya sayılmaz; geri alınınca sayıya döner", () => {
    const g = [gid(1, { tutar: 10000 })];
    expect(hesapla({ customers: [mus(1), mus(2, { deletedAt: "x" })], giderler: g }).aylar.get("2026-03").uretimAdedi).toBe(1);
    expect(hesapla({ customers: [mus(1), mus(2)], giderler: g }).aylar.get("2026-03").uretimAdedi).toBe(2);
  });
  it("plan M3: stoğa dönen satıra taşınacak tarih müşterinin çözülmüş üretim tarihidir", () => {
    expect(donenStokUretimTarihi(mus(1, { uretimTarihi: "", sourceStockId: 9 }), [{ tip: "makina_uretimi", referansId: 9, tarih: "2026-01-15" }])).toBe("2026-01-15");
  });
  it("AC-10: yürürlük ayından önce üretilen makinada maliyet ve kâr gösterilmez", () => {
    const s = hesapla({ customers: [mus(1, { uretimTarihi: "2025-12-10" }), mus(2)], giderler: [gid(1, { tutar: 1000, atamaTur: "makina", makinaTur: "musteri", makinaId: 1 })] });
    expect(kar(s, 1)).toMatchObject({ veriYok: true, kar: null });
    const o = ozet(s, ...MART);
    expect(o.veriYok.adet).toBe(1);
    expect(o.satirlar.map(d => d.makina.id)).toEqual([2]);
  });
});

describe("model havuzları (R16–R18b, plan M13 paralel)", () => {
  const havuz = (id, o = {}) => gid(id, { tutar: 40000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 40 }], tarih: "2026-03-01", ...o });
  it("AC-23 / AC-24: 1.000 × 40 → havuz 40.000; ilk makinaya 1.000, kalan 39.000 (39 makinalık)", () => {
    const s = hesapla({ customers: [mus(1)], giderler: [havuz(1)] });
    expect(s.havuzlar[0]).toMatchObject({ boyut: 4000000, birim: 100000, kapasite: 40 });
    expect(kar(s, 1).malzeme).toBe(1000);
    expect(ozet(s, ...MART).modeller[0]).toMatchObject({ model: "AK100", yuklenmemis: 39000 });
  });
  it("AC-25: tükenmiş havuz sonradan üretilen makinaya pay vermez", () => {
    const s = hesapla({ customers: [1, 2, 3].map(i => mus(i, { uretimTarihi: `2026-03-0${i + 1}` })), giderler: [havuz(1, { tutar: 2000, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 2 }] })] });
    expect([1, 2, 3].map(i => kar(s, i).malzeme)).toEqual([1000, 1000, 0]);
  });
  it("AC-26: aynı modele iki ayrı kalem → makina iki havuzdan pay alır, toplamı malzeme maliyeti", () => {
    const s = hesapla({ customers: [mus(1)], giderler: [havuz(1), havuz(2, { tutar: 5000, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 500, adet: 10 }] })] });
    expect(kar(s, 1).malzeme).toBe(1500);
    expect(kar(s, 1).malzemePaylari).toHaveLength(2);
  });
  it("AC-28: modelden hiç üretim yoksa tutarın tamamı yüklenmemiş malzeme", () => {
    const s = hesapla({ customers: [mus(1, { model: "AK200" })], giderler: [havuz(1)] });
    expect(ozet(s, ...MART).modeller).toEqual([{ model: "AK100", yuklenmemis: 40000, payAlamamis: 0 }]);
  });
  it("AC-40: üç model satırı (5, 40, 25) → her model yalnız kendi havuzundan", () => {
    const s = hesapla({
      customers: [mus(1, { model: "AK100" }), mus(2, { model: "AK200" }), mus(3, { model: "AK300" })],
      giderler: [gid(1, { tarih: "2026-03-01", tutar: 70000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 5 }, { modelAd: "AK200", birimMaliyet: 1000, adet: 40 }, { modelAd: "AK300", birimMaliyet: 1000, adet: 25 }] })],
    });
    for (const i of [1, 2, 3]) { expect(kar(s, i).malzeme).toBe(1000); expect(kar(s, i).malzemePaylari).toHaveLength(1); }
    expect(s.havuzlar.find(h => h.modelKey === "ak200").paylar.map(p => p.anahtar)).toEqual(["musteri:2"]);
  });
  it("AC-48: 15 Mart tarihli havuz 1 Mart'ta üretilmiş makinaya pay vermez", () => {
    const s = hesapla({ customers: [mus(1, { uretimTarihi: "2026-03-01" }), mus(2, { uretimTarihi: "2026-03-20" })], giderler: [havuz(1, { tarih: "2026-03-15" })] });
    expect(kar(s, 1).malzeme).toBe(0);
    expect(kar(s, 2).malzeme).toBe(1000);
  });
  it("AC-49: havuzlar tarih, eşitse kalem kimliği sırasıyla işlenir; aynı veri iki kez aynı sonucu verir", () => {
    const g = [havuz(9, { tarih: "2026-03-02" }), havuz(3), havuz(2)];
    const a = hesapla({ customers: [mus(1), mus(2)], giderler: g });
    const b = hesapla({ customers: [mus(2), mus(1)], giderler: [...g].reverse() });
    expect(a.havuzlar.map(h => h.kalemId)).toEqual([2, 3, 9]);
    expect(b.havuzlar.map(h => h.kalemId)).toEqual([2, 3, 9]);
    expect([1, 2].map(i => kar(a, i).malzemePaylari)).toEqual([1, 2].map(i => kar(b, i).malzemePaylari));
  });
  it("AC-50: aynı gün üretilen iki makinada pay seri numarası sırasıyla", () => {
    const s = hesapla({ customers: [mus(1, { serialNo: "S10" }), mus(2, { serialNo: "S2" })], giderler: [havuz(1, { tutar: 1000, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 1 }] })] });
    expect(kar(s, 2).malzeme).toBe(1000);
    expect(kar(s, 1).malzeme).toBe(0);
  });
  it("AC-51: 40 makinalık havuza karşılık 45 üretim → 5 makina pay alamaz, özette 5", () => {
    const customers = Array.from({ length: 45 }, (_, i) => mus(i + 1, { uretimTarihi: "2026-03-10" }));
    const s = hesapla({ customers, giderler: [havuz(1)] });
    expect(s.liste.filter(m => m.malzemePayiAlamadi)).toHaveLength(5);
    expect(ozet(s, ...MART).modeller[0]).toMatchObject({ model: "AK100", payAlamamis: 5, yuklenmemis: 0 });
    expect(kar(s, 45).malzemePayiAlamadi).toBe(true);
  });
});

describe("stokta bekleyen maliyet ve dönem özeti (R7, R19)", () => {
  it("AC-29: stoktaki makinaya atanmış gider üretim maliyetinde ve 'stoktaki makinaların taşıdığı maliyet' satırında", () => {
    const s = hesapla({ stock: [stk(7)], giderler: [gid(1, { tutar: 20000, atamaTur: "makina", makinaTur: "stok", makinaId: 7 })] });
    expect(s.makinalar.get("stok:7").uretimMaliyeti).toBe(2000000);
    expect(ozet(s, ...MART).stokta).toMatchObject({ adet: 1, maliyet: 20000 });
  });
  it("AC-30: satılınca stok satırından düşer, kârlılığa geçer (stok bağı satışa takip edilir)", () => {
    const c = mus(1, { sourceStockId: 7, uretimTarihi: "2026-03-05", installDate: "2026-05-10" });
    const s = hesapla({ customers: [c], giderler: [gid(1, { tutar: 20000, atamaTur: "makina", makinaTur: "stok", makinaId: 7 })] });
    expect(ozet(s, "2026-05-01", "2026-05-31").stokta.adet).toBe(0);
    expect(ozet(s, "2026-05-01", "2026-05-31").satirlar[0].toplamMaliyet).toBe(20000);
  });
  it("AC-74: stok satırı aralık bitişi itibarıyla hâlâ satılmamışları sayar ve tarihi taşır", () => {
    const s = hesapla({ customers: [mus(1, { installDate: "2026-05-10" })] });
    expect(ozet(s, ...MART).stokta).toMatchObject({ adet: 1, tarih: "2026-03-31" });
    expect(ozet(s, "2026-05-01", "2026-05-31").stokta.adet).toBe(0);
  });
  it("AC-9: makina kârlarının toplamı dönem toplam kârına eşit", () => {
    const s = hesapla({ customers: [1, 2, 3].map(i => mus(i, { fabrikaSatisBedeli: 100000 * i, komisyon: 333.33 })), giderler: [gid(1, { tutar: 100000.01 })] });
    const o = ozet(s, ...MART);
    expect(Math.round(o.satirlar.reduce((a, d) => a + d.kar * 100, 0))).toBe(Math.round(o.toplam.kar * 100));
  });
  it("AC-20: satış olmayan dönemde özet boş", () => {
    expect(ozet(hesapla({ customers: [mus(1)] }), "2026-06-01", "2026-06-30").bos).toBe(true);
  });
  it("AC-52 / AC-73: bedeli girilmemiş makina ayrı satırda adet ve maliyetle; toplamlara girmez", () => {
    const s = hesapla({ customers: [mus(1, { fabrikaSatisBedeli: "" }), mus(2)], giderler: [gid(1, { tutar: 10000 })] });
    const o = ozet(s, ...MART);
    expect(o.bedelsiz).toMatchObject({ adet: 1, maliyet: 5000 });
    expect(o.toplam).toMatchObject({ satisBedeli: 500000, toplamMaliyet: 5000 });
  });
  it("AC-67: dönem satış tarihine (installDate) göre belirlenir", () => {
    const s = hesapla({ customers: [mus(1, { uretimTarihi: "2026-02-01", installDate: "2026-04-02" })] });
    expect(ozet(s, ...MART).satirlar).toHaveLength(0);
    expect(ozet(s, "2026-04-01", "2026-04-30").satirlar).toHaveLength(1);
  });
  it("AC-21 / AC-46: devredilmiş makina yalnız ilk satış döneminde; ikinci satışın döneminde yok", () => {
    const c = mus(1, { isResale: true, prevOwners: [{ name: "Eski", soldDate: "2026-08-15" }] });
    const s = hesapla({ customers: [c] });
    expect(ozet(s, ...MART).satirlar).toHaveLength(1);
    expect(ozet(s, "2026-08-01", "2026-08-31").bos).toBe(true);
    expect(s.aylar.get("2026-08")?.uretimAdedi || 0).toBe(0);
  });
  it("AC-66: aralık bir ayı ortadan kesiyorsa ay bazlı satırlar hesaplanmaz", () => {
    const s = hesapla({ customers: [mus(1)], giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: "standart" } });
    const o = ozet(s, "2026-03-10", "2026-04-30");
    expect(o.dagitilmamis).toBeNull();
    expect(o.standartFark).toBeNull();
    expect(o.tamAy).toBe(false);
  });
});

describe("ortak gider kaynağı (R22, R25, C8)", () => {
  const std = [{ id: 1, grupId: 1, ad: "Kira", tutar: 100000, baslangicAy: "2026-01", bitisAy: null },
    { id: 2, grupId: 2, ad: "Enerji", tutar: 50000, baslangicAy: "2026-06", bitisAy: null }];
  const girdi = (kaynak) => ({ customers: [mus(1)], giderler: [gid(1, { tutar: 300000 })], standartGiderler: std, giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: kaynak } });
  it("AC-34: standart kaynakta pay o ayın standart toplamından; gerçekleşen kayıtlar katılmaz", () => {
    expect(kar(hesapla(girdi("standart")), 1).ortakPay).toBe(100000);
  });
  it("AC-35: gerçekleşen kaynakta standart tutarlar katılmaz", () => {
    expect(kar(hesapla(girdi("gercek")), 1).ortakPay).toBe(300000);
  });
  it("AC-37: standart kaynakta fark satırı = gerçekleşen − standart", () => {
    expect(ozet(hesapla(girdi("standart")), ...MART).standartFark).toEqual({ gercek: 300000, standart: 100000, fark: 200000 });
    expect(ozet(hesapla(girdi("gercek")), ...MART).standartFark).toBeNull();
  });
  it("AC-65: ay tutarı o aya uyan sürümlerin toplamı; sürümü olmayan kalem sıfır ve özette belirtilir", () => {
    const s = hesapla(girdi("standart"));
    expect(s.aylar.get("2026-03").ortakStandart).toBe(10000000);
    expect(s.aylar.get("2026-07").ortakStandart).toBe(15000000);
    expect(ozet(s, ...MART).standartEksik).toEqual([{ ay: "2026-03", adlar: ["Enerji"] }]);
  });
  it("AC-36: sonuç kullanılan kaynağı taşır", () => {
    expect(hesapla(girdi("standart")).kaynak).toBe("standart");
    expect(hesapla({}).kaynak).toBe("gercek");
  });
});

describe("fiyat önerisi (R9, R9b, R24)", () => {
  // Ortalama üretim maliyeti 80.000: iki makina, ayları farklı, paylar 70.000 ve 90.000.
  const s = () => hesapla({
    customers: [mus(1, { uretimTarihi: "2026-03-05" }), mus(2, { uretimTarihi: "2026-04-05", installDate: "2026-04-20" })],
    giderler: [gid(1, { tutar: 70000 }), gid(2, { tarih: "2026-04-10", tutar: 90000 })],
  });
  const oner = (yontem, deger, o = {}) => fiyatOnerisi(s(), { model: "AK100", ...sonOnIkiAy(BUGUN), yontem, deger, ...o });
  it("AC-15: marj yöntemiyle %25 → 106.667", () => { expect(oner(FIYAT_YONTEM.MARJ, 25)).toMatchObject({ ortalama: 80000, fiyat: 106667 }); });
  it("AC-16: maliyetin üstüne %25 → 100.000", () => { expect(oner(FIYAT_YONTEM.EKLE, 25).fiyat).toBe(100000); });
  it("AC-39: maliyetin katı 2,2 → 176.000", () => { expect(oner(FIYAT_YONTEM.KAT, 2.2).fiyat).toBe(176000); });
  it("AC-17: sonuç seçilen yöntemi taşır", () => { expect(oner(FIYAT_YONTEM.KAT, 2).yontem).toBe("kat"); });
  it("AC-18: marj yönteminde %100 ve üstü reddedilir, geçerli aralık bildirilir", () => {
    for (const d of [100, 120, 0]) { const r = oner(FIYAT_YONTEM.MARJ, d); expect(r.fiyat).toBeUndefined(); expect(r.hata).toMatch(/sıfırdan büyük ve yüzden küçük/); }
  });
  it("AC-61: kat 0,8 → zararına satış uyarısı, öneri yine üretilir", () => {
    const r = oner(FIYAT_YONTEM.KAT, 0.8);
    expect(r.fiyat).toBe(64000);
    expect(r.uyari).toMatch(/zararına satış/);
  });
  it("AC-62: kâr eklemede negatif değer reddedilir", () => { expect(oner(FIYAT_YONTEM.EKLE, -5).hata).toMatch(/sıfır veya daha büyük/); });
  it("AC-63: önerilen fiyat en yakın tam TL", () => { expect(Number.isInteger(oner(FIYAT_YONTEM.MARJ, 33).fiyat)).toBe(true); });
  it("AC-59 / AC-19: varsayılan dönem içinde bulunulan ay dahil son 12 takvim ayı; sonuç dönemi taşır", () => {
    expect(sonOnIkiAy(BUGUN)).toEqual({ baslangic: "2025-10-01", bitis: "2026-09-30" });
    expect(oner(FIYAT_YONTEM.EKLE, 0)).toMatchObject({ baslangic: "2025-10-01", bitis: "2026-09-30", adet: 2 });
  });
  it("AC-60: modelden dönemde üretim yoksa öneri üretilmez, neden yazılır", () => {
    const r = oner(FIYAT_YONTEM.MARJ, 25, { model: "AK200" });
    expect(r.fiyat).toBeUndefined();
    expect(r.hata).toMatch(/üretilmiş makina yok/);
  });
  it("R9: ortalama komisyon içermez ve satılmamış makinaları da kapsar", () => {
    const x = hesapla({ customers: [mus(1, { komisyon: 50000 })], stock: [stk(9, { addedDate: "2026-03-06" })], giderler: [gid(1, { tutar: 160000 })] });
    expect(fiyatOnerisi(x, { model: "AK100", ...sonOnIkiAy(BUGUN), yontem: "ekle", deger: 0 })).toMatchObject({ adet: 2, ortalama: 80000 });
  });
});

describe("C9: tek geçiş ve süre", () => {
  it("5.000 makina ve 20.000 gider kalemiyle hesap makul sürede biter", () => {
    const customers = Array.from({ length: 4000 }, (_, i) => mus(i + 1, { model: MOD[i % 3].model, uretimTarihi: `2026-0${1 + (i % 9)}-1${i % 9}` }));
    const stock = Array.from({ length: 1000 }, (_, i) => stk(100000 + i, { model: MOD[i % 3].model, addedDate: `2026-0${1 + (i % 9)}-05` }));
    const giderler = Array.from({ length: 20000 }, (_, i) => gid(i + 1, {
      tarih: `2026-0${1 + (i % 9)}-0${1 + (i % 9)}`, tutar: 1000 + i,
      ...(i % 10 === 0 ? { atamaTur: "model", modelSatirlari: [{ modelAd: MOD[i % 3].model, birimMaliyet: 10, adet: 30 }] } : {}),
      ...(i % 10 === 1 ? { atamaTur: "makina", makinaTur: "musteri", makinaId: (i % 4000) + 1 } : {}),
    }));
    const t0 = performance.now();
    const s = hesapla({ customers, stock, giderler });
    const ozetSonuc = karlilikOzeti(s, { baslangic: "2026-01-01", bitis: "2026-09-30" });
    const sure = performance.now() - t0;
    console.log(`[C9] 5.000 makina / 20.000 kalem: ${sure.toFixed(0)} ms`);
    expect(ozetSonuc.satirlar.length).toBeGreaterThan(0);
    expect(sure).toBeLessThan(3000);
  });
});

describe("triyaj düzeltmeleri (0002)", () => {
  const kira = [{ id: 1, grupId: 1, ad: "Kira", tutar: 50000, baslangicAy: "2026-01", bitisAy: null }];
  it("bulgu 1: standart kaynakta ilk üretimden önceki aylar düşmez; Ocak–Mart dağıtılmamış 150.000, fark −150.000", () => {
    const s = hesapla({ customers: [mus(1, { uretimTarihi: "2026-05-04", installDate: "2026-05-20" })], standartGiderler: kira,
      giderAyarlari: { yururlukAy: "2026-01", ortakGiderKaynagi: "standart" } });
    expect([...s.aylar.keys()][0]).toBe("2026-01");
    const o = ozet(s, "2026-01-01", "2026-03-31");
    expect(o.dagitilmamis.tutar).toBe(150000);
    expect(o.standartFark).toEqual({ gercek: 0, standart: 150000, fark: -150000 });
  });
  it("bulgu 1: yürürlük ayı yoksa standart kaynakta tablo en erken standart başlangıcından başlar", () => {
    const s = hesapla({ customers: [mus(1, { uretimTarihi: "2026-05-04" })], standartGiderler: kira, giderAyarlari: { ortakGiderKaynagi: "standart" } });
    expect(s.aylar.get("2026-02")).toMatchObject({ uretimAdedi: 0, dagitilmamis: 5000000 });
  });
  it("bulgu 1: gerçekleşen kaynakta da tablo yürürlük ayından başlar (ilk giderden önceki aylar sıfır olarak var)", () => {
    const s = hesapla({ customers: [mus(1, { uretimTarihi: "2026-05-04" })] });
    expect([...s.aylar.keys()][0]).toBe("2026-01");
  });
  it("bulgu 3: üretim tarihi taşıyan geri dönen satırın notu değişse de özgün ayında sayılır", () => {
    const s = hesapla({ stock: [stk(50, { addedDate: "2026-09-02", note: "başka not", uretimTarihi: "2026-03-05" })] });
    expect(s.aylar.get("2026-03").uretimAdedi).toBe(1);
    expect(s.aylar.get("2026-09").uretimAdedi).toBe(0);
  });
  it("bulgu 4: kullanılmayan atanamayanMakinaGideri alanı sonuçta yok", () => {
    expect(hesapla({})).not.toHaveProperty("atanamayanMakinaGideri");
  });
});
