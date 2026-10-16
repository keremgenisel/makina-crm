// Spec 0088: Makina Maliyet Hesabı, saf motor (`src/lib/makinaStandartMaliyet.js`) ve kaynak taramaları.
// Rakamlar elle doğrulanabilir: havuz = genel (10.000) + personel (35.000) = 45.000 TL; 120 makina → pay 375 TL.
// AK100 direkt = 7,50 × 46 + 145,60 × 2 + 90 = 726,20 TL; toplam 1.101,20; öneri × 2,19498 = 2.417,11 TL.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as M from "../src/lib/makinaStandartMaliyet";
import { hesaplaGiderRaporu } from "../src/lib/gider";
import { KAT_HATASI, KAT_ZARAR_UYARISI, hesaplaMakinaMaliyetleri, fiyatOnerisi } from "../src/lib/makinaMaliyeti";
import { TURLER, GIDERLER, PARCALAR, MODELLER, OZEL, PARTILER, STOCK, CUSTOMERS, AYAR, BUGUN, veri } from "./fixtures/0088-veri.js";
import * as V76 from "./fixtures/0076-veri.js";

const duz = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v)));
const kod = (f) => readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const pay = (v = veri(), a = AYAR) => M.genelGiderPayi(v, a, BUGUN);
const modeller = (payK) => M.modelMaliyetleri({ standardModels: MODELLER, customModels: OZEL, parts: PARCALAR }, payK);

describe("Spec 0088: hesap ayarları ve genel gider havuzu", () => {
  it("AC-8: gider türü rolü üç değerden biridir; tür kaydında yalnız maliyetRolu değişir, boş seçim alanı siler", () => {
    const t = M.turRoluYaz(TURLER, 4, "urunAgaci");
    expect(t.find(x => x.id === 4)).toEqual({ id: 4, ad: "Kira", davranis: "kira", maliyetRolu: "urunAgaci" });
    expect(t.find(x => x.id === 1)).toBe(TURLER[0]);
    expect(M.turRoluYaz(t, 4, "")).toEqual(TURLER);
    expect(M.MALIYET_ROLLERI).toEqual(["urunAgaci", "genel", "yok"]);
  });

  it("AC-9: rolü verilmemiş tür \"maliyete girmez\" sayılır ve sayısı (canlı türlerden) verilir", () => {
    expect(M.maliyetRoluOf(TURLER[3])).toBe("yok");
    expect(M.rolOzeti(TURLER)).toEqual({ rolsuzTurSayisi: 1, genelTurSayisi: 2, urunAgaciTurSayisi: 1 });
    expect(pay().havuz.satirlar.find(s => s.turId === 4)).toMatchObject({ rol: "yok", toplamK: 2000000 });
  });

  it("AC-10: hiçbir türe genel rol verilmemişse pay sıfır ve durum \"rolYok\"", () => {
    const p = pay(veri({ giderTurleri: TURLER.map(({ maliyetRolu: _r, ...t }) => t) }));
    expect(p).toMatchObject({ durum: "rolYok", havuzK: 0, payK: 0 });
  });

  it("AC-11: ürün ağacından gelen türün tutarı havuza girmez; rol genele çevrilince havuz o kadar artar, geri çevrilince döner", () => {
    const a = pay().havuzK;
    const b = pay(veri({ giderTurleri: M.turRoluYaz(TURLER, 2, "genel") })).havuzK;
    expect(b - a).toBe(500000);
    expect(pay(veri({ giderTurleri: M.turRoluYaz(M.turRoluYaz(TURLER, 2, "genel"), 2, "urunAgaci") })).havuzK).toBe(a);
    expect(pay().havuz.urunAgaciK).toBe(500000);
  });

  it("AC-12: türsüz kalem hiçbir havuza girmez, yalnız sayılır; \"(türsüz)\" satırı rol satırları arasında yok", () => {
    const h = pay().havuz;
    expect(h.tursuzAdet).toBe(1);
    expect(h.satirlar.map(s => s.ad)).not.toContain("(türsüz)");
    expect(h.genelK + h.urunAgaciK + h.yokK).toBe(4500000 + 500000 + 2000000);
    // Kimliği hiçbir tür kaydında olmayan kalem de türsüz sayılır (gider motoru onu "(türsüz)" satırında toplar).
    const bilinmeyen = pay(veri({ giderler: [...GIDERLER, { id: 99, tarih: "2026-04-01", turId: 77, tutar: 300, kdvOrani: 0 }] })).havuz;
    expect(bilinmeyen.tursuzAdet).toBe(2);
    expect(bilinmeyen.satirlar.map(x => x.turId)).not.toContain(77);
  });

  it("AC-13, AC-13/2: varsayılan adet 1–10000 tam sayı; dönemsel toplamdır, aylık karşılık türetilir", () => {
    for (const x of ["0", "-1", "2,5", "10001", "", "abc"]) expect(M.maliyetAyarDogrula({ ...AYAR, varsayilanAdet: x }).hatalar.adet, x).toBe(M.ADET_HATASI);
    expect(M.maliyetAyarDogrula({ ...AYAR, varsayilanAdet: "10000" }).gecerli).toBe(true);
    expect(M.aylikKarsilik({ ...AYAR, varsayilanAdet: 120 })).toBe(10);
    expect(M.aylikKarsilik({ baslangicAy: "2026-01", bitisAy: "2026-03", varsayilanAdet: 10 })).toBe(3.3);
  });

  it("AC-14, AC-14/2: ters dönem hata verir ve hesap çalışmaz; öneri son on iki tam aydır", () => {
    expect(M.maliyetAyarDogrula({ ...AYAR, baslangicAy: "2026-12", bitisAy: "2026-01" }).hatalar.donem).toBe(M.DONEM_SIRA_HATASI);
    expect(pay(veri(), { ...AYAR, baslangicAy: "2026-12", bitisAy: "2026-01" })).toMatchObject({ durum: "ayarsiz", payK: 0 });
    expect(pay(veri(), {})).toMatchObject({ durum: "ayarsiz" });
    expect(M.donemOnerisi("2026-10-16")).toEqual({ baslangicAy: "2025-10", bitisAy: "2026-09" });
  });

  it("AC-15: pay = havuz ÷ varsayılan adet (kuruş, Math.floor); gerçek adede göre pay ayrıca", () => {
    const p = pay();
    expect(p).toMatchObject({ durum: "tamam", havuzK: 4500000, payK: 37500, varsayilanAdet: 120 });
    const g = M.gercekUretim(veri(), AYAR, p.havuzK);
    expect(g).toEqual({ adet: 7, cozulemeyen: 0, payK: Math.floor(4500000 / 7), neden: null });
  });

  it("AC-15/2: gerçek adet partili makinaları da sayar (bugünkü ay tablosunun uretimAdedi'nden farklı)", () => {
    const yalnizPartili = { stock: [STOCK[0]], customers: CUSTOMERS.slice(0, 4) };
    expect(M.gercekUretim(yalnizPartili, AYAR, 100).adet).toBe(5);
    const eski = hesaplaMakinaMaliyetleri({ ...yalnizPartili, uretimPartileri: PARTILER, giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: BUGUN });
    expect([...(eski.aylar instanceof Map ? eski.aylar.values() : eski.aylar)].reduce((a, x) => a + (x.uretimAdedi || 0), 0)).toBe(0);
  });

  it("AC-15/3: gerçek adet sıfırsa kıyas payı yok, neden verilir", () => {
    expect(M.gercekUretim({ stock: [], customers: [] }, AYAR, 100)).toEqual({ adet: 0, cozulemeyen: 0, payK: null, neden: "uretimYok" });
  });

  it("AC-15/4: üretim tarihi çözülemeyen makina sayılmaz, sayısı ayrıca verilir", () => {
    const g = M.gercekUretim({ stock: [{ id: 9, model: "AK100" }], customers: [] }, AYAR, 100);
    expect(g).toMatchObject({ adet: 0, cozulemeyen: 1 });
  });

  it("AC-16: yürürlük ayından önceki gider hiçbir havuza girmez", () => {
    const p = pay(veri(), { ...AYAR, baslangicAy: "2025-12" });
    expect(p.havuzK).toBe(4500000);
  });

  it("AC-16/2: dönem bütünüyle yürürlük öncesiyse hata atılmaz, havuz sıfır, durum yururlukOncesi", () => {
    expect(pay(veri(), { baslangicAy: "2025-01", bitisAy: "2025-12", varsayilanAdet: 10 })).toMatchObject({ durum: "yururlukOncesi", havuzK: 0, payK: 0 });
  });

  it("AC-17, AC-17/2: tür silmede havuz hedefin rolüne göre değişir; kullanılmayan tür çöpe atılınca havuz değişmez", () => {
    expect(M.rolFarkiUyarisi(TURLER[0], TURLER[1])).toMatch(/Genel gidere girer.*Ürün ağacından gelir/);
    expect(M.rolFarkiUyarisi(TURLER[0], TURLER[2])).toBeNull();
    const tasinmis = veri({ giderler: GIDERLER.map(k => (k.turId === 1 ? { ...k, turId: 2 } : k)) });
    expect(pay(tasinmis).havuzK).toBe(3500000);
    expect(pay(veri({ giderTurleri: TURLER.filter(t => t.id !== 5) })).havuzK).toBe(4500000);
  });

  it("Triyaj bulgu 2: tek genel türü çöpte ama kalemi duran veride durum \"tamam\" (havuz ve pay çelişmez); kalemi olmayan genel tür de \"tamam\"", () => {
    const turler = TURLER.map(t => (t.id === 3 ? { ...t, maliyetRolu: "yok" } : t.id === 1 ? { ...t, deletedAt: "2026-10-01T00:00:00.000Z" } : t));
    const p = pay(veri({ giderTurleri: turler }));
    expect(p).toMatchObject({ durum: "tamam", havuzK: 1000000, payK: Math.floor(1000000 / 120) });
    expect(p.roller.genelTurSayisi).toBe(0); // canlı genel tür yok (1 ve 5 çöpte, 3 "yok"); durum yine de havuzdan "tamam"
    const kalemsiz = pay(veri({ giderler: GIDERLER.filter(k => k.turId !== 1 && k.turId !== 3) }));
    expect(kalemsiz).toMatchObject({ durum: "tamam", havuzK: 0, payK: 0 });
  });

  it("AC-47: personel, kira ve SGK türüne ürün ağacı rolü uyarı verir, normal türe vermez", () => {
    expect(M.rolDavranisUyarisi({ davranis: "personel" }, "urunAgaci")).toBe(M.ROL_DAVRANIS_UYARISI);
    expect(M.rolDavranisUyarisi({ davranis: "kira" }, "urunAgaci")).toBe(M.ROL_DAVRANIS_UYARISI);
    expect(M.rolDavranisUyarisi({ davranis: "sgk" }, "urunAgaci")).toBe(M.ROL_DAVRANIS_UYARISI);
    expect(M.rolDavranisUyarisi({ davranis: "normal" }, "urunAgaci")).toBeNull();
    expect(M.rolDavranisUyarisi({ davranis: "personel" }, "genel")).toBeNull();
  });
});

describe("Spec 0088: model maliyeti", () => {
  const ak = (m) => modeller(37500).find(x => x.model === m);
  it("AC-18, AC-19: direkt = Σ(birim × adet) + Σ(ek kalem); pay ve toplam ayrı alanlarda", () => {
    expect(ak("AK100")).toMatchObject({ direktK: 72620, payK: 37500, toplamK: 110120 });
    expect(ak("AK100").kit.map(r => r.satirK)).toEqual([34500, 29120]);
    expect(ak("AK100").ek).toEqual([{ ad: "Büküm işçiliği", tutarK: 9000 }]);
  });

  it("AC-20, AC-20/2: maliyeti girilmemiş, çöpteki ya da bulunmayan parçaya bakan kit satırı eksik sayılır", () => {
    expect(ak("AK120").eksikSayisi).toBe(3);
    expect(ak("AK120").kit.map(r => r.neden)).toEqual(["maliyetYok", "parcaYok", "parcaYok"]);
    expect(ak("AK100").eksikSayisi).toBe(0);
  });

  it("AC-21: kiti ve ek kalemi boş modelde direkt sıfır ve kitBos işareti", () => {
    expect(ak("AK200")).toMatchObject({ direktK: 0, kitBos: true });
    expect(ak("AK120").kitBos).toBe(false);
  });

  it("AC-22: öneri fiyat = toplam × katsayı (kuruşa yuvarlanmış); katsayısız modelde null", () => {
    expect(ak("AK100").oneriK).toBe(Math.round(110120 * 2.19498));
    expect(ak("AK200").oneriK).toBeNull();
  });

  it("AC-22/2: katsayı sıfır/negatif reddedilir, 1'in altı uyarı, beş ondalıklı virgüllü değer kabul; KAT kuralı ortak", () => {
    expect(M.katsayiDogrula("0").hata).toBe(KAT_HATASI);
    expect(M.katsayiDogrula("-2").hata).toBe(KAT_HATASI);
    expect(M.katsayiDogrula("0,8")).toMatchObject({ deger: 0.8, uyari: KAT_ZARAR_UYARISI });
    expect(M.katsayiDogrula("2,19498")).toMatchObject({ deger: 2.19498, hata: null, uyari: null });
    expect(M.katsayiDogrula("2,194981").hata).toBe(M.KATSAYI_BICIM_HATASI);
    expect(M.katsayiDogrula("").bos).toBe(true);
  });

  it("AC-23: Extra Kalıp liste fiyatı model satırında, maliyete girmez", () => {
    expect(ak("AK100").kalipListeK).toBe(450000);
    expect(M.modelMaliyetleri({ standardModels: [{ ...MODELLER[0], kalipListeFiyati: undefined }], parts: PARCALAR }, 37500)[0].toplamK).toBe(110120);
  });

  it("AC-25: çöpteki model listede yok", () => {
    expect(modeller(0).map(m => m.model)).toEqual(["AK100", "AK120", "AK200"]);
  });

  it("AC-46: kuruş toplamı float hesapla sapmasız; pay Math.floor, artık kuruş dağıtılmaz", () => {
    expect(ak("AK100").direktK).toBe(Math.round((7.5 * 46 + 145.6 * 2 + 90) * 100));
    const p = M.genelGiderPayi(veri({ giderler: [{ id: 1, tarih: "2026-02-01", turId: 1, tutar: 1, kdvOrani: 0 }] }), { ...AYAR, varsayilanAdet: 3 }, BUGUN);
    expect(p).toMatchObject({ havuzK: 100, payK: 33 });
  });
});

describe("Spec 0088: parti hesabı", () => {
  const mm = modeller(37500);
  const ph = (id) => M.partiHesabi(PARTILER.find(p => p.id === id), veri(), { payK: 37500, modeller: mm, rates: { usd: 41 }, bugun: BUGUN });

  it("AC-26: model-adet tablosu partiye bağlı stok ve müşteri makinalarından türetilir", () => {
    expect(ph(801).satirlar).toEqual([expect.objectContaining({ model: "AK100", adet: 5, planlanan: false, turetilenAdet: 5 })]);
  });

  it("AC-27, R18/2: planlanan adet kullanılır ve işaretlenir; adı bulunamayan planlı model görünür ayrı listede, hesaba girmez", () => {
    const h = ph(803);
    expect(h.satirlar).toEqual([expect.objectContaining({ model: "AK100", adet: 10, planlanan: true, toplamMaliyetK: 1101200 })]);
    expect(h.bulunamayan).toEqual([{ model: "ESKI_AD", adet: 4, planlanan: true }]);
    expect(h.ozet.toplamStandartK).toBe(1101200);
  });

  it("AC-28: makinası ve planı olmayan parti boş", () => {
    expect(ph(802).bos).toBe(true);
  });

  it("AC-29, AC-29/2, AC-29/3: özet dört rakam; iki kâr farklı kümeden; adet kırılımı", () => {
    const o = ph(801).ozet;
    expect(o).toMatchObject({ toplamStandartK: 550600, onerilenCiroK: Math.round(110120 * 2.19498) * 5, satisK: 14000000, satilmisStandartK: 220240 });
    expect(o.oneriyeGoreKarK).toBe(o.onerilenCiroK - o.toplamStandartK);
    expect(o.gercegeGoreKarK).toBe(14000000 - 220240);
    expect(o.kirilim).toEqual({ satilmis: 2, stokta: 1, bedelsiz: 1, kursuz: 1, modelYok: 0 });
  });

  it("AC-29/4: parti satırındaki pay hesap ayarlarının payıdır; birim toplam Model Maliyetleri ile aynı", () => {
    const s = ph(801).satirlar[0];
    expect(s.payK).toBe(37500);
    expect(s.toplamK).toBe(mm.find(m => m.model === "AK100").toplamK);
  });

  it("AC-30: kuru olmayan döviz satışı toplama girmez, sayısı verilir; kayıtlı kur kullanılır", () => {
    const o = ph(801).ozet;
    expect(o.kirilim.kursuz).toBe(1);
    expect(o.kurDurumlari).toEqual({ kayitli: 1, yaklasik: 0 });
  });

  it("AC-31, AC-31/2, AC-32: tedarik karşılaştırması partinin döneminde ürün ağacı rolündeki türler; fark ve paylaşan parti", () => {
    expect(ph(801).tedarik).toEqual({ donem: { bas: "2026-01", bit: "2026-06" }, baslamadi: false, yururlukOncesi: false, tedarikK: 500000, standartDirektK: 363100, farkK: 136900, paylasanParti: 1 });
    expect(ph(802).tedarik.donem).toEqual({ bas: "2026-05", bit: "2026-10" });
    expect(ph(802).tedarik.paylasanParti).toBe(2);
  });

  it("Triyaj bulgu 1: model adı büyük/küçük harften bağımsız eşlenir; modeli bulunamayan satılmış makina satışa ve kâra girmez, ayrı sayılır", () => {
    const kucuk = M.partiHesabi(PARTILER[0], veri({ stock: STOCK.map(s => ({ ...s, model: s.model.toLowerCase() })), customers: CUSTOMERS.map(c => ({ ...c, model: c.model.toLowerCase() })) }),
      { payK: 37500, modeller: mm, rates: { usd: 41 }, bugun: BUGUN });
    expect(kucuk.satirlar).toEqual([expect.objectContaining({ model: "AK100", adet: 5 })]);
    expect(kucuk.ozet).toMatchObject({ satisK: 14000000, satilmisStandartK: 220240 });
    const silinmis = M.partiHesabi(PARTILER[0], veri({ customers: CUSTOMERS.map(c => (c.id === 601 ? { ...c, model: "COP" } : c)) }),
      { payK: 37500, modeller: mm, rates: { usd: 41 }, bugun: BUGUN });
    expect(silinmis.ozet.kirilim).toEqual({ satilmis: 1, stokta: 1, bedelsiz: 1, kursuz: 1, modelYok: 1 });
    expect(silinmis.ozet).toMatchObject({ satisK: 4000000, satilmisStandartK: 110120, gercegeGoreKarK: 4000000 - 110120 });
    expect(silinmis.bulunamayan).toEqual([{ model: "COP", adet: 1, planlanan: false }]);
  });

  it("Triyaj bulgu 4: başlangıcı gelecekte olan partide tedarik karşılaştırması yapılmaz (dönem ters dönmez)", () => {
    const t = M.partiHesabi({ id: 900, ad: "Gelecek", baslangicAy: "2027-02", bitisAy: null, planlananAdetler: { AK100: 3 } }, veri(),
      { payK: 37500, modeller: mm, rates: {}, bugun: BUGUN }).tedarik;
    expect(t).toMatchObject({ baslamadi: true, tedarikK: 0, paylasanParti: 0 });
    expect(ph(801).tedarik.baslamadi).toBe(false);
  });

  it("AC-33: partisiz makina sayısı", () => {
    expect(M.partisizMakinaSayisi({ stock: STOCK, customers: CUSTOMERS })).toBe(2);
  });

  it("AC-48: kapanmış partinin rakamı tür rolü değişince değişir (bugünkü ayarlarla hesap, bilinen sınır)", () => {
    const yeni = M.genelGiderPayi(veri({ giderTurleri: M.turRoluYaz(TURLER, 2, "genel") }), AYAR, BUGUN).payK;
    const h2 = M.partiHesabi(PARTILER[0], veri(), { payK: yeni, modeller: modeller(yeni), rates: {}, bugun: BUGUN });
    expect(h2.ozet.toplamStandartK).not.toBe(ph(801).ozet.toplamStandartK);
  });
});

describe("Spec 0088: değişmeyenler ve taramalar", () => {
  it("AC-42: bugünkü maliyet modeli ve Dönem Raporu spec öncesiyle birebir aynı (tür kaydına maliyetRolu eklenmiş olsa da)", async () => {
    const once = JSON.parse(readFileSync("tests/fixtures/0088-maliyet-once.json", "utf8"));
    expect(V76.motorCiktilari()).toEqual(once.motor);
    const turler = V76.TURLER.map((t, i) => ({ ...t, maliyetRolu: ["genel", "urunAgaci", "yok", "genel"][i] }));
    const rapor = (tr) => hesaplaGiderRaporu({ giderler: V76.GIDERLER, turler: tr, tedarikciler: V76.TEDARIKCILER, stock: V76.STOCK, customers: V76.CUSTOMERS, yururlukAy: "2026-01" },
      { baslangic: "2026-01-01", bitis: "2026-12-31" }, { bugun: V76.BUGUN });
    expect(JSON.stringify(rapor(turler).turKirilimi.map(({ turId, toplam, adet }) => [turId, toplam, adet]))).toBe(JSON.stringify(rapor(V76.TURLER).turKirilimi.map(({ turId, toplam, adet }) => [turId, toplam, adet])));
    const g = hesaplaMakinaMaliyetleri({ customers: V76.CUSTOMERS, stock: V76.STOCK, giderler: V76.GIDERLER, giderTurleri: turler, standardModels: V76.MODELLER,
      uretimPartileri: V76.PARTILER, giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: V76.BUGUN });
    expect(duz(g)).toEqual(once.motor.maliyetGercek);
    for (const d of ["2", "0,8", 0.8, 0, -1, "", "abc"]) {
      expect(duz(fiyatOnerisi(g, { model: "AK100", baslangic: "2026-01-01", bitis: "2026-12-31", yontem: "kat", deger: d })), String(d)).toEqual(once.kat[String(d)]);
    }
  });

  it("AC-49: üretim tarihi çözümü yalnız makinaMaliyeti.js'te; yeni motor makinaListesi'ni içe aktarır, kendi zincirini yazmaz", () => {
    const m = kod("src/lib/makinaStandartMaliyet.js");
    expect(m).toMatch(/import \{[^}]*makinaListesi[^}]*\} from "\.\/makinaMaliyeti"/);
    expect(m).not.toMatch(/musteriUretimTarihi|stokUretimTarihi|hareketTarihHaritasi|makina_uretimi|installDate/);
  });

  it("AC-50: maliyetRolu ile davranis ayrı kavramlar; rol davranış değerleriyle karşılaştırılmaz", () => {
    for (const f of ["src/lib/makinaStandartMaliyet.js", "src/components/MakinaMaliyeti.jsx", "src/components/maliyet/HesapAyarlari.jsx"]) {
      const k = kod(f);
      expect(k, f).not.toMatch(/maliyetRolu\s*===?\s*(DAVRANIS|"(normal|kira|personel|sgk)")/);
      expect(k, f).not.toMatch(/davranis\s*===?\s*(MALIYET_ROLU|"(urunAgaci|genel|yok)")/);
    }
  });

  it("C2, R10: dönem havuzu gider motorunun tür kırılımından; motor gider kalemlerini kendi süzmez ve tutar türetmez", () => {
    const m = kod("src/lib/makinaStandartMaliyet.js");
    expect(m).toMatch(/hesaplaGiderRaporu\(/);
    expect(m).not.toMatch(/giderler\.filter|kalemGiderTutari|kalemKurus|\.tarih\s*>=/);
  });

  it("C3, R26: motor personel çalışan ayrıntısını okumaz ve kopyalamaz", () => {
    expect(kod("src/lib/makinaStandartMaliyet.js")).not.toMatch(/calisanlar|calisanAd|resmiTutar|eldenTutar/);
    expect(JSON.stringify(pay())).not.toContain("Zeynep");
  });

  it("AC-51: src/types.d.ts dört yeni alanı taşır", () => {
    const t = readFileSync("src/types.d.ts", "utf8");
    for (const alan of ["karKatsayisi?: number", "kalipListeFiyati?: number", "maliyetRolu?: MaliyetRolu", "planlananAdetler?: Record<string, number>", "interface MaliyetAyarlari"]) expect(t, alan).toContain(alan);
  });
});
