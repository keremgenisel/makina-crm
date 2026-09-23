import { describe, it, expect } from "vitest";
import {
  kiraHesapla, tutarCoz, giderKalemDogrula, modelSatirlariDogrula, turHaritasi, kalemTutari, odenecekTutar,
  kovaDagilimi, makinaGideriCoz, canliModelSeti, hesaplaGiderRaporu, borcOzeti, kdvKarsilastir, tekrarlayanUret,
  tanimKapat, personelMukerrer, turKullanim, tedarikciKullanim, tedarikciAdHatasi, vadesiGectiMi, yururlukKapsami,
  esikAltiKalemSayisi, tamAylar, standartGiderAyi, standartYeni, standartTutarDegistir, standartSonSurumuGeriAl,
  standartSonaErdir, modelAdiTasi, modelKullanim, DAVRANIS,
} from "../src/lib/gider";

const turler = [
  { id: 1, ad: "Elektrik", davranis: "normal" },
  { id: 2, ad: "Fabrika kirası", davranis: "kira" },
  { id: 3, ad: "Personel", davranis: "personel" },
  { id: 4, ad: "Hammadde", davranis: "normal" },
];
const turMap = turHaritasi(turler);
const tedarikciler = [{ id: 10, ad: "Demir Bant San." }, { id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Aksoy" }];
const modeller = canliModelSeti([{ model: "AK120_DSC" }, { model: "AK100_DS" }], [{ model: "AK150_X", deletedAt: "2026-09-01" }]);
let n = 1000;
const uid = () => ++n;

const kalem = (o) => ({ id: uid(), tarih: "2026-09-10", turId: 1, tutar: 10000, kdvOrani: 20, odendi: false, ...o });
const rapor = (giderler, extra = {}) => hesaplaGiderRaporu(
  { giderler, turler, tedarikciler, canliModeller: modeller, yururlukAy: "2026-06", ...extra },
  { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-09-23" });

describe("gider motoru: tutar ve kira", () => {
  it("AC-3: 10.000 TL %20 KDV → KDV 2.000, ödenecek 12.000, gider toplamına 10.000", () => {
    const k = kalem({});
    expect(kalemTutari(k)).toBe(10000);
    expect(odenecekTutar(k)).toBe(12000);
    expect(rapor([k]).toplam).toBe(10000);
    expect(rapor([k]).indirilecekKdv).toBe(2000);
  });
  it("AC-4: brüt 20.000, %20 stopaj → stopaj 4.000, net 16.000", () => {
    const h = kiraHesapla({ girisYonu: "brut", tutar: 20000, stopajOrani: 20 });
    expect(h).toMatchObject({ brut: 20000, stopaj: 4000, net: 16000 });
  });
  it("AC-5: net 16.000, %20 stopaj → brüt 20.000, stopaj 4.000", () => {
    expect(kiraHesapla({ girisYonu: "net", netTutar: 16000, stopajOrani: 20 })).toMatchObject({ brut: 20000, stopaj: 4000 });
  });
  it("AC-26: brüt 20.000, %20 stopaj, %20 KDV → stopaj 4.000, KDV 4.000, nakit 20.000, gider 20.000", () => {
    const h = kiraHesapla({ girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 20 });
    expect(h).toMatchObject({ stopaj: 4000, kdv: 4000, nakit: 20000 });
    const r = rapor([kalem({ turId: 2, tutar: 20000, stopajOrani: 20, kdvOrani: 20, girisYonu: "brut" })]);
    expect(r.toplam).toBe(20000);
    expect(r.stopajToplam).toBe(4000);
  });
  it("AC-6: stopaj 0 kira kalemi stopaj satırında 0 TL ile kalır", () => {
    const r = rapor([kalem({ turId: 2, tutar: 15000, stopajOrani: 0, kdvOrani: 0, girisYonu: "brut" })]);
    expect(r.stopajSatirlari).toHaveLength(1);
    expect(r.stopajSatirlari[0].stopaj).toBe(0);
    expect(r.stopajToplam).toBe(0);
  });
  it("AC-21: KDV 0 kalem toplama girer, indirilecek KDV'ye 0 ekler", () => {
    const r = rapor([kalem({ kdvOrani: 0, tutar: 9800 })]);
    expect(r.toplam).toBe(9800);
    expect(r.indirilecekKdv).toBe(0);
  });
});

describe("gider motoru: doğrulama", () => {
  it("AC-2: tür yok, tutar 0/negatif ve sayıya çevrilemeyen metin reddedilir", () => {
    expect(giderKalemDogrula({ tarih: "2026-09-01", tutar: "100" }, { turMap }).hatalar.map(h => h.alan)).toContain("turId");
    expect(giderKalemDogrula({ tarih: "2026-09-01", turId: 1, tutar: "0", kdvOrani: 20 }, { turMap }).kayit).toBeNull();
    expect(giderKalemDogrula({ tarih: "2026-09-01", turId: 1, tutar: "-5", kdvOrani: 20 }, { turMap }).kayit).toBeNull();
    const g = giderKalemDogrula({ tarih: "2026-09-01", turId: 1, tutar: "on dört bin", kdvOrani: 20 }, { turMap });
    expect(g.kayit).toBeNull();
    expect(g.hatalar[0].mesaj).toMatch(/sayıya çevrilemedi/);
    expect(tutarCoz("14.800,00").deger).toBe(14800);
  });
  it("AC-2 (personel): bileşen toplamı > 0 ise kaydedilir, negatif bileşen reddedilir", () => {
    const ok = giderKalemDogrula({ tarih: "2026-09-01", turId: 3, calisanId: 5, resmiTutar: "30.000", eldenTutar: "" }, { turMap });
    expect(ok.kayit).not.toBeNull();
    const neg = giderKalemDogrula({ tarih: "2026-09-01", turId: 3, calisanId: 5, resmiTutar: "30.000", eldenTutar: "-5" }, { turMap });
    expect(neg.kayit).toBeNull();
  });
  it("AC-37: hiç bileşeni olmayan personel kalemi kaydedilmez", () => {
    expect(giderKalemDogrula({ tarih: "2026-09-01", turId: 3, calisanId: 5, resmiTutar: "", eldenTutar: "" }, { turMap }).kayit).toBeNull();
  });
  it("AC-64: personel kaleminde KDV 0 kaydedilir ve tedarikçi temizlenir", () => {
    const { kayit } = giderKalemDogrula({ tarih: "2026-09-01", turId: 3, calisanId: 5, resmiTutar: 30000, kdvOrani: 20, tedarikciId: 10 }, { turMap, tedarikciler });
    expect(kayit.kdvOrani).toBe(0);
    expect(kayit.tedarikciId).toBeNull();
  });
  it("AC-71: son ödeme tarihi gider tarihinden önceyse reddedilir; Çek'te etiket 'Çek vade tarihi'", () => {
    const g = giderKalemDogrula({ tarih: "2026-09-03", turId: 1, tutar: 100, kdvOrani: 20, sonOdemeTarihi: "2026-09-01", odemeYontemi: "Çek" }, { turMap });
    expect(g.kayit).toBeNull();
    expect(g.hatalar.find(h => h.alan === "sonOdemeTarihi").mesaj).toMatch(/^Çek vade tarihi/);
  });
  it("AC-70: vadesi boş kalem kaydedilir ve vadesi geçmiş sayılmaz", () => {
    const g = giderKalemDogrula({ tarih: "2026-09-03", turId: 1, tutar: 100, kdvOrani: 20 }, { turMap });
    expect(g.kayit).not.toBeNull();
    expect(vadesiGectiMi(g.kayit, "2026-12-01")).toBe(false);
  });
  it("AC-78: kira ve personel kaleminde atama alanları temizlenir", () => {
    const { kayit } = giderKalemDogrula({ tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 20, atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", birimMaliyet: 1, adet: 1 }] }, { turMap });
    expect(kayit.atamaTur).toBe("");
    expect(kayit.modelSatirlari).toEqual([]);
  });
});

describe("gider motoru: model satırları (R21)", () => {
  it("AC-79: 4.000 TL birim × 35 adet = 140.000", () => {
    const d = modelSatirlariDogrula(140000, [{ modelAd: "AK120_DSC", birimMaliyet: "4.000", adet: 35 }]);
    expect(d.dagitilan).toBe(140000);
    expect(d.hatalar).toEqual([]);
  });
  it("AC-87: iki farklı model satırı eklenebilir", () => {
    const d = modelSatirlariDogrula(100000, [{ modelAd: "AK120_DSC", birimMaliyet: 1000, adet: 50 }, { modelAd: "AK100_DS", birimMaliyet: 2000, adet: 25 }]);
    expect(d.hatalar).toEqual([]);
  });
  it("AC-88: aynı model ikinci kez eklenemez (harf farkı dahil)", () => {
    const d = modelSatirlariDogrula(100000, [{ modelAd: "AK120_DSC", birimMaliyet: 1000, adet: 5 }, { modelAd: "ak120_dsc", birimMaliyet: 1000, adet: 5 }]);
    expect(d.hatalar.some(h => /zaten bir satır/.test(h.mesaj))).toBe(true);
  });
  it("AC-89: 1.000 × (5 + 40 + 25) = 70.000, fark yok", () => {
    const d = modelSatirlariDogrula(70000, [5, 40, 25].map((a, i) => ({ modelAd: `M${i}`, birimMaliyet: 1000, adet: a })));
    expect(d).toMatchObject({ dagitilan: 70000, fark: 0, asim: 0 });
  });
  it("AC-90: eksik dağıtım uyarıdır, kayıt yapılır, fark ortağa yazılır", () => {
    const g = giderKalemDogrula({ tarih: "2026-09-10", turId: 4, tutar: 100000, kdvOrani: 20, atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", birimMaliyet: 1000, adet: 60 }] }, { turMap });
    expect(g.kayit).not.toBeNull();
    expect(g.uyarilar[0].mesaj).toMatch(/40\.000/);
    const kv = kovaDagilimi(g.kayit, { canliModeller: modeller });
    expect(kv).toMatchObject({ model: 60000, ortak: 40000 });
  });
  it("AC-90b: aşımda kayıt yapılmaz ve aşan tutar gösterilir", () => {
    const g = giderKalemDogrula({ tarih: "2026-09-10", turId: 4, tutar: 50000, kdvOrani: 20, atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", birimMaliyet: 1000, adet: 60 }] }, { turMap });
    expect(g.kayit).toBeNull();
    expect(g.hatalar.find(h => /aşıyor/.test(h.mesaj)).mesaj).toMatch(/10\.000/);
  });
  it("AC-91: adet 0, boş, negatif ve kesirli reddedilir", () => {
    for (const adet of [0, "", -3, 2.5]) {
      expect(modelSatirlariDogrula(1000, [{ modelAd: "AK120_DSC", birimMaliyet: 10, adet }]).hatalar.length).toBeGreaterThan(0);
    }
  });
  it("K32: kuruş hesabı sahte aşım üretmez (3 × 33.333,33 ≤ 100.000)", () => {
    const d = modelSatirlariDogrula(100000, [1, 2, 3].map(i => ({ modelAd: `M${i}`, birimMaliyet: "33.333,33", adet: 1 })));
    expect(d.asim).toBe(0);
    expect(d.fark).toBe(0.01);
  });
});

describe("gider motoru: dört kova ve rapor (R8, R20, R21)", () => {
  const stock = [{ id: 501, model: "AK100_DS", serialNo: "2026-121" }];
  const customers = [{ id: 601, name: "Örnek Gıda", model: "AK120_DSC", serialNo: "2026-118", sourceStockId: 502 }];
  const giderler = [
    kalem({ tutar: 6500, atamaTur: "makina", makinaTur: "stok", makinaId: 502 }),
    kalem({ tutar: 11700, atamaTur: "makina", makinaTur: "stok", makinaId: 501 }),
    kalem({ turId: 4, tutar: 140000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", birimMaliyet: 3000, adet: 40 }] }),
    kalem({ turId: 4, tutar: 60000, atamaTur: "dagitma" }),
    kalem({ tutar: 14800 }),
    kalem({ turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 20000, tutar: null, kdvOrani: 0 }),
    kalem({ turId: 2, tutar: 20000, stopajOrani: 20, kdvOrani: 20, girisYonu: "brut", atamaTur: "dagitma" }),
  ];
  const r = hesaplaGiderRaporu({ giderler, turler, tedarikciler, stock, customers, canliModeller: modeller, yururlukAy: "2026-06" }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-09-23" });

  it("AC-82: dört kovanın toplamı genel toplama eşit, tutar bazlı bölme", () => {
    const { makina, model, dagitma, ortak } = r.kovalar;
    expect(Math.round((makina + model + dagitma + ortak) * 100)).toBe(Math.round(r.toplam * 100));
    expect(r.kovalar).toEqual({ makina: 18200, model: 120000, dagitma: 60000, ortak: 14800 + 50000 + 20000 + 20000 });
  });
  it("AC-80: kısmi dağıtımda yalnız kalan kısım ortak kovaya girer", () => {
    expect(r.kismiOrtak).toHaveLength(1);
    expect(r.kismiOrtak[0].tutar).toBe(20000);
  });
  it("AC-78: kira kalemi kayıtta 'dagitma' yazsa bile ortak sayılır", () => {
    expect(r.kovalar.dagitma).toBe(60000);
  });
  it("AC-75: dağıtılmasın kalemi ayrı toplamda ve genel toplamda", () => {
    expect(r.dagitmaKalemleri).toHaveLength(1);
    expect(r.toplam).toBeGreaterThanOrEqual(60000);
  });
  it("AC-81: işaretsiz kalem ortak", () => {
    expect(kovaDagilimi(kalem({ tutar: 500 }), {})).toMatchObject({ ortak: 500 });
  });
  it("AC-11 / AC-27: stoktayken atanan makina satışa takip edilir", () => {
    const cz = makinaGideriCoz({ makinaTur: "stok", makinaId: 502 }, { stock, customers });
    expect(cz).toMatchObject({ tur: "musteri", id: 601, stoktanTakip: true });
    expect(r.makinaBazli.map(m => m.toplam).sort()).toEqual([11700, 6500].sort());
  });
  it("AC-28: makina silinince kalem silinmez, ortak kovaya düşer", () => {
    const r2 = hesaplaGiderRaporu({ giderler: [kalem({ tutar: 4300, atamaTur: "makina", makinaTur: "stok", makinaId: 501 })], turler, stock: [{ ...stock[0], deletedAt: "x" }], customers, canliModeller: modeller }, { baslangic: "2026-09-01", bitis: "2026-09-30" });
    expect(r2.kovalar.ortak).toBe(4300);
    expect(r2.dusenAtamalar).toHaveLength(1);
  });
  it("AC-84 / K35: çöpteki modelin yalnız kendi satır tutarı ortağa düşer", () => {
    const k = kalem({ turId: 4, tutar: 10000, atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", birimMaliyet: 1000, adet: 4 }, { modelAd: "AK150_X", birimMaliyet: 1000, adet: 6 }] });
    expect(kovaDagilimi(k, { canliModeller: modeller })).toMatchObject({ model: 4000, ortak: 6000 });
  });
  it("AC-83: model yeniden adlandırılınca satırlar taşınır", () => {
    const k = kalem({ atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", birimMaliyet: 1, adet: 1 }] });
    expect(modelAdiTasi([k], "AK120_DSC", "AK120_YENI")[0].modelSatirlari[0].modelAd).toBe("AK120_YENI");
    expect(modelKullanim("AK120_DSC", giderler, [])).toMatchObject({ kalem: 1 });
  });
  it("AC-12: tür kırılımı toplamı genel toplama eşit (ödenmemiş dahil)", () => {
    expect(r.turKirilimi.reduce((a, t) => a + t.toplam, 0)).toBe(r.toplam);
  });
  it("AC-10 / AC-49 / AC-51: personel 30.000 + 20.000 = 50.000; çalışan ayrıntısı satır toplamına eşit", () => {
    const p = r.turKirilimi.find(t => t.davranis === "personel");
    expect(p.toplam).toBe(50000);
    expect(p.calisanlar[0]).toMatchObject({ ad: "Hasan", resmi: 30000, elden: 20000, toplam: 50000 });
  });
  it("AC-50: yalnız resmi girilen çalışanda elden 0 sayılır", () => {
    expect(kalemTutari({ resmiTutar: 30000, eldenTutar: null }, DAVRANIS.PERSONEL)).toBe(30000);
  });
  it("AC-13: ödenmemiş toplam ödendi işaretlenince düşer", () => {
    const k = kalem({ tutar: 1000 });
    expect(rapor([k]).odenmeyen).toBe(1000);
    expect(rapor([{ ...k, odendi: true }]).odenmeyen).toBe(0);
  });
  it("AC-19: silinen kalem rapordan düşer, geri alınınca aynı tutarla döner", () => {
    const k = kalem({ tutar: 1234 });
    expect(rapor([{ ...k, deletedAt: "2026-09-20" }]).toplam).toBe(0);
    expect(rapor([k]).toplam).toBe(1234);
  });
  it("AC-34: aynı tanımdan aynı ayda iki kalem uyarı üretir", () => {
    const a = kalem({ tanimId: 9, donem: "2026-09" }), b = kalem({ tanimId: 9, donem: "2026-09" });
    expect(rapor([a, b]).mukerrerUyari).toHaveLength(1);
  });
  it("AC-1: kaydedilen kalem kendi ayının raporunda görünür", () => {
    const k = kalem({ tarih: "2026-09-30" });
    expect(rapor([k]).kalemler).toContain(k);
    expect(rapor([{ ...k, tarih: "2026-10-01" }]).kalemler).toHaveLength(0);
  });
});

describe("gider motoru: yürürlük ve boş durum (R10)", () => {
  it("AC-16: yürürlük öncesi dönem rakam üretmez", () => {
    const r = hesaplaGiderRaporu({ giderler: [kalem({ tarih: "2026-05-10" })], turler, yururlukAy: "2026-06" }, { baslangic: "2026-05-01", bitis: "2026-05-31" });
    expect(r.yururlukOncesi).toBe(true);
    expect(r.toplam).toBeUndefined();
  });
  it("AC-17: kaydı olmayan dönem boş durumdur", () => {
    expect(rapor([]).bos).toBe(true);
  });
  it("AC-31: eşiği kesen aralıkta kapsam dışı kısım bildirilir", () => {
    expect(yururlukKapsami({ baslangic: "2026-04-01", bitis: "2026-09-30" }, "2026-06")).toMatchObject({ durum: "kismi", etkinBaslangic: "2026-06-01", kapsamDisi: { baslangic: "2026-04-01", bitis: "2026-05-31" } });
  });
  it("AC-32: yürürlük ayının kendisi rakam üretir", () => {
    const r = hesaplaGiderRaporu({ giderler: [kalem({ tarih: "2026-06-01" })], turler, yururlukAy: "2026-06" }, { baslangic: "2026-06-01", bitis: "2026-06-30" });
    expect(r.toplam).toBe(10000);
  });
  it("AC-33: eşik ileri alınınca kalemler silinmez, eşik altı sayısı doğru", () => {
    const g = [kalem({ tarih: "2026-06-05" }), kalem({ tarih: "2026-07-05" })];
    expect(esikAltiKalemSayisi(g, "2026-07")).toBe(1);
    expect(g).toHaveLength(2);
  });
  it("K1: tam ay listesi yalnız ay başı/sonu hizalı aralıkta döner", () => {
    expect(tamAylar("2026-06-01", "2026-09-30")).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(tamAylar("2026-03-15", "2026-04-20")).toBeNull();
  });
});

describe("gider motoru: tedarikçi ve borç (R13–R15, R19)", () => {
  it("AC-41: 10.000 + %20 KDV ödenmemiş → açık borç 12.000", () => {
    const r = rapor([kalem({ tedarikciId: 12 })]);
    expect(r.tedarikciKirilimi.satirlar[0]).toMatchObject({ ad: "Aksoy", acikBorc: 12000 });
  });
  it("AC-42: 12.000 + 6.000 → 18.000; biri ödenince 6.000", () => {
    const a = kalem({ tedarikciId: 12 }), b = kalem({ tedarikciId: 12, tutar: 5000 });
    expect(rapor([a, b]).tedarikciKirilimi.satirlar[0].acikBorc).toBe(18000);
    expect(rapor([{ ...a, odendi: true }, b]).tedarikciKirilimi.satirlar[0].acikBorc).toBe(6000);
  });
  it("AC-43 / AC-61: kira borcu brüt ve net girişte 20.000 (stopaj eklenmez)", () => {
    const brut = kalem({ turId: 2, tedarikciId: 11, tutar: 20000, stopajOrani: 20, kdvOrani: 20, girisYonu: "brut" });
    const netForm = giderKalemDogrula({ tarih: "2026-09-01", turId: 2, girisYonu: "net", netTutar: "16.000", stopajOrani: 20, kdvOrani: 20, tedarikciId: 11 }, { turMap, tedarikciler }).kayit;
    expect(odenecekTutar(brut, DAVRANIS.KIRA)).toBe(20000);
    expect(odenecekTutar(netForm, DAVRANIS.KIRA)).toBe(20000);
  });
  it("AC-39 / AC-67: tedarikçisiz kalem 'seçilmemiş' grubunda", () => {
    const r = rapor([kalem({})]);
    expect(r.tedarikciKirilimi.satirlar).toHaveLength(0);
    expect(r.tedarikciKirilimi.secilmemis).toMatchObject({ harcama: 10000, adet: 1 });
  });
  it("AC-47: harcamaya göre çoktan aza, eşitlikte Türkçe alfabetik", () => {
    const r = rapor([kalem({ tedarikciId: 11 }), kalem({ tedarikciId: 10 }), kalem({ tedarikciId: 12, tutar: 20000 })]);
    expect(r.tedarikciKirilimi.satirlar.map(s => s.ad)).toEqual(["Aksoy", "Demir Bant San.", "Yıldız Gayrimenkul"]);
  });
  it("AC-60 / AC-63: personel tedarikçi kırılımına girmez; kırılım toplamı = personel dışı toplam", () => {
    const r = rapor([kalem({ tedarikciId: 10 }), kalem({}), kalem({ turId: 3, calisanId: 1, resmiTutar: 5000 })]);
    expect(r.tedarikciKirilimi.toplamHarcama).toBe(r.toplam - 5000);
  });
  it("AC-59: önceki dönemin ödenmemiş kalemi bugünkü dönemde açık borçta", () => {
    const r = rapor([kalem({ tarih: "2026-08-10", tedarikciId: 10, tutar: 7000 })]);
    expect(r.tedarikciKirilimi.satirlar[0]).toMatchObject({ ad: "Demir Bant San.", harcama: 0, acikBorc: 8400 });
  });
  it("AC-44 / AC-45: çöpteki kalem de tedarikçiyi kullanımda tutar", () => {
    expect(tedarikciKullanim(10, [kalem({ tedarikciId: 10, deletedAt: "x" })], [])).toMatchObject({ kalem: 1, cop: 1 });
    expect(tedarikciKullanim(12, [], [])).toMatchObject({ kalem: 0, tanim: 0 });
  });
  it("AC-40 / AC-62: boş ad ve aynı ad (harf farkı dahil) reddedilir", () => {
    expect(tedarikciAdHatasi("  ", tedarikciler)).toMatch(/boş/);
    expect(tedarikciAdHatasi("demir bant san.", tedarikciler)).toMatch(/zaten var/);
    expect(tedarikciAdHatasi("Demir Bant San.", tedarikciler, 10)).toBeNull();
  });
  it("AC-72 / AC-73: borç özeti çalışanları tek satırda toplar; ödenen düşer", () => {
    const g = [kalem({ tedarikciId: 10 }), kalem({ turId: 3, calisanId: 1, calisanAd: "A", resmiTutar: 1000 }), kalem({ turId: 3, calisanId: 2, calisanAd: "B", resmiTutar: 2000 })];
    const o = borcOzeti(g, { turler, tedarikciler }, "2026-09-23");
    const c = o.satirlar.find(s => s.tur === "calisanlar");
    expect(c).toMatchObject({ kisi: 2, tutar: 3000 });
    expect(c.ayrinti.map(x => x.ad)).toEqual(["A", "B"]);
    const o2 = borcOzeti(g.map(k => (k.tedarikciId ? { ...k, odendi: true } : k)), { turler, tedarikciler }, "2026-09-23");
    expect(o2.satirlar.some(s => s.tur === "tedarikci")).toBe(false);
  });
  it("AC-86: geçmiş vadeli ödenmemiş kalem 'vadesi geçti'; ödenince kalkar", () => {
    const k = kalem({ tedarikciId: 10, sonOdemeTarihi: "2026-09-20" });
    expect(borcOzeti([k], { turler, tedarikciler }, "2026-09-23").satirlar[0].vadesiGecti).toBe(true);
    expect(vadesiGectiMi({ ...k, odendi: true }, "2026-09-23")).toBe(false);
  });
});

describe("gider motoru: KDV karşılaştırması (R9)", () => {
  it("AC-14: 50.000 − 12.000 = 38.000", () => {
    expect(kdvKarsilastir({ TRY: 50000 }, 12000)).toMatchObject({ fark: 38000, odenecek: 38000, devreden: 0 });
  });
  it("AC-15: TL dışı hesaplanan KDV karşılaştırmaya girmez, listelenir", () => {
    expect(kdvKarsilastir({ TRY: 50000, USD: 1200 }, 12000).haricTutarlar).toEqual([{ para: "USD", tutar: 1200 }]);
  });
  it("AC-29: indirilecek büyükse devreden pozitif tutar", () => {
    expect(kdvKarsilastir({ TRY: 9800 }, 13940)).toMatchObject({ odenecek: 0, devreden: 4140 });
  });
});

describe("gider motoru: tekrarlayan üretim (R3, R4)", () => {
  const ctx = { turMap, calisanlar: [{ id: 7, ad: "Hasan", resmiMaliyet: 30000, eldenMaliyet: 20000 }, { id: 8, ad: "Zeynep" }], giderAyarlari: { stopajOrani: 20 }, uid };
  const tanimlar = [
    { id: 1, turId: 2, ad: "Kira", tutar: 20000, girisYonu: "brut", baslangicAy: "2026-06", tedarikciId: 11, uretilenAylar: [] },
    { id: 2, turId: 3, ad: "Hasan", calisanId: 7, baslangicAy: "2026-06", uretilenAylar: [] },
    { id: 3, turId: 1, ad: "Sezonluk", tutar: 1000, baslangicAy: "2026-03", bitisAy: "2026-05", uretilenAylar: [] },
    { id: 4, turId: 4, ad: "Sarf", tutar: 12000, baslangicAy: "2026-06", atamaTur: "model", modelSatirlari: [{ modelAd: "AK100_DS", birimMaliyet: 600, adet: 20 }], uretilenAylar: [] },
  ];
  it("AC-7: aralığa giren her tanımdan bir kalem", () => {
    const u = tekrarlayanUret(tanimlar, [], "2026-09", ctx);
    expect(u.eklenen).toBe(3);
    expect(u.yeniKalemler.every(k => k.donem === "2026-09")).toBe(true);
  });
  it("AC-8 / AC-22: ikinci çalıştırmada yalnız yeni tanım eklenir, var olanlar sayılır", () => {
    const u1 = tekrarlayanUret(tanimlar, [], "2026-09", ctx);
    const u2 = tekrarlayanUret([...u1.guncelTanimlar, { id: 5, turId: 1, ad: "Yeni", tutar: 900, baslangicAy: "2026-09", uretilenAylar: [] }], u1.yeniKalemler, "2026-09", ctx);
    expect(u2).toMatchObject({ eklenen: 1, zatenVardi: 3 });
  });
  it("AC-23: Mart–Mayıs tanımı Şubat ve Haziran'da üretmez", () => {
    expect(tekrarlayanUret([tanimlar[2]], [], "2026-02", ctx).eklenen).toBe(0);
    expect(tekrarlayanUret([tanimlar[2]], [], "2026-06", ctx).eklenen).toBe(0);
  });
  it("AC-24: üretilip silinen kalem yeniden oluşmaz", () => {
    const u1 = tekrarlayanUret([tanimlar[0]], [], "2026-09", ctx);
    const u2 = tekrarlayanUret(u1.guncelTanimlar, [], "2026-09", ctx);
    expect(u2.eklenen).toBe(0);
  });
  it("AC-9: kalemi düzenlemek tanımı değiştirmez", () => {
    const u1 = tekrarlayanUret([tanimlar[0]], [], "2026-09", ctx);
    const duzenli = { ...u1.yeniKalemler[0], tutar: 1 };
    expect(u1.guncelTanimlar[0].tutar).toBe(20000);
    expect(duzenli.tanimId).toBe(1);
  });
  it("K8 / K9 / K17: personel iki bileşen, kira ayar stopajı ve tedarikçi kopyalanır", () => {
    const u = tekrarlayanUret(tanimlar, [], "2026-09", ctx);
    expect(u.yeniKalemler.find(k => k.tanimId === 2)).toMatchObject({ resmiTutar: 30000, eldenTutar: 20000, calisanAd: "Hasan", kdvOrani: 0 });
    expect(u.yeniKalemler.find(k => k.tanimId === 1)).toMatchObject({ stopajOrani: 20, tedarikciId: 11, tutar: 20000, netTutar: 16000 });
  });
  it("AC-85: tanımdaki model satırları kaleme kopyalanır", () => {
    const u = tekrarlayanUret(tanimlar, [], "2026-09", ctx);
    const k = u.yeniKalemler.find(x => x.tanimId === 4);
    expect(k.atamaTur).toBe("model");
    expect(k.modelSatirlari).toEqual(tanimlar[3].modelSatirlari);
    expect(k.modelSatirlari).not.toBe(tanimlar[3].modelSatirlari);
  });
  it("AC-37 (üretim): maliyeti olmayan çalışan için kalem üretilmez, nedeni döner", () => {
    const u = tekrarlayanUret([{ id: 9, turId: 3, calisanId: 8, baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", ctx);
    expect(u.eklenen).toBe(0);
    expect(u.atlanan[0].neden).toMatch(/maliyet girilmemiş/);
  });
  it("AC-65: çalışan silinince tanım son üretilen ayda kapanır, sonraki ay üretmez", () => {
    const t = tanimKapat({ ...tanimlar[1], uretilenAylar: ["2026-07", "2026-08"] });
    expect(t.bitisAy).toBe("2026-08");
    expect(tekrarlayanUret([t], [], "2026-09", ctx).eklenen).toBe(0);
    expect(tanimKapat({ ...tanimlar[1], uretilenAylar: [] }).bitisAy).toBe("2026-05");
  });
  it("AC-66: aynı çalışan ve ay için mükerrer kalem bulunur", () => {
    const var_ = kalem({ turId: 3, calisanId: 7, tarih: "2026-09-01" });
    expect(personelMukerrer([var_], { calisanId: 7, tarih: "2026-09-15" })).toHaveLength(1);
    expect(personelMukerrer([var_], { calisanId: 7, tarih: "2026-09-15", id: var_.id })).toHaveLength(0);
  });
  it("AC-20 / K13: tür kullanımı çöpteki kalemleri ve tanımları sayar", () => {
    expect(turKullanim(1, [kalem({ deletedAt: "x" })], [{ turId: 1 }])).toMatchObject({ kalem: 1, cop: 1, tanim: 1 });
  });
});

describe("gider motoru: standart genel gider (R22)", () => {
  const u = () => ++n;
  it("AC-92 / AC-96: tutar değişince yeni sürüm, eski kendi ayında geçerli", () => {
    const a = standartYeni([], { ad: "Kira", tutar: "20.000", baslangicAy: "2026-01" }, u).liste;
    const gid = a[0].grupId;
    const b = standartTutarDegistir(a, gid, { tutar: 25000, baslangicAy: "2026-07" }, u).liste;
    expect(b).toHaveLength(2);
    expect(standartGiderAyi(b, "2026-06").toplam).toBe(20000);
    expect(standartGiderAyi(b, "2026-07").toplam).toBe(25000);
    expect(standartTutarDegistir(b, gid, { tutar: 1, baslangicAy: "2026-07" }, u).hata).toBeTruthy();
    const c = standartSonSurumuGeriAl(b, gid).liste;
    expect(c).toHaveLength(1);
    expect(c[0].bitisAy).toBeNull();
    expect(standartGiderAyi(standartSonaErdir(c, gid, "2026-08").liste, "2026-09").toplam).toBe(0);
  });
  it("AC-93: dönem raporu standart listeyi hiç almaz", () => {
    const g = [kalem({})];
    const a = hesaplaGiderRaporu({ giderler: g, turler }, { baslangic: "2026-09-01", bitis: "2026-09-30" });
    const b = hesaplaGiderRaporu({ giderler: g, turler, standartGiderler: [{ tutar: 999999, baslangicAy: "2026-01" }] }, { baslangic: "2026-09-01", bitis: "2026-09-30" });
    expect(b.toplam).toBe(a.toplam);
    expect(b.kovalar).toEqual(a.kovalar);
  });
});
