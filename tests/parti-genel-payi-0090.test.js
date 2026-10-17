// Spec 0090: parti payı yeni hesaptan (saf motor `makinaStandartMaliyet.partiGenelPaylari` + kapanış yardımcısı
// `uretimPartisi.partiKapanisUygula`). Aylık genel gider havuzu (AC-17–AC-25), parti payı (AC-26–AC-38/4), kapanış anlık
// görüntüsü (AC-39–AC-45/3), gizlilik (AC-48), süre ve çağrı sayısı (AC-52), ekran taraması (AC-51).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

const sayac = vi.hoisted(() => ({ n: 0 }));
vi.mock("../src/lib/gider", async (orijinal) => {
  const m = await orijinal();
  return { ...m, hesaplaGiderRaporu: (...a) => { sayac.n++; return m.hesaplaGiderRaporu(...a); } };
});

const { partiGenelPaylari, partiKapanisHavuzu, aylikGenelHavuzlar, genelGiderPayi, PARTI_DURUM, PARTI_NEDEN, PARTI_KAYNAK_IBARESI } = await import("../src/lib/makinaStandartMaliyet");
const { partiKapanisUygula, KAPANIS_HARITA_YOK } = await import("../src/lib/uretimPartisi");
const { makinaListesi } = await import("../src/lib/makinaMaliyeti");
const V90 = await import("./fixtures/0090-veri");

const kod = (f) => readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const BUGUN = "2026-06-15";
const T = [
  { id: 1, ad: "Elektrik", davranis: "normal", maliyetRolu: "genel" },
  { id: 2, ad: "Kira", davranis: "kira", maliyetRolu: "genel" },
  { id: 3, ad: "Personel", davranis: "personel", maliyetRolu: "genel" },
  { id: 4, ad: "Sac", davranis: "normal", maliyetRolu: "urunAgaci" },
  { id: 5, ad: "Bağış", davranis: "normal", maliyetRolu: "yok" },
  { id: 6, ad: "Rolsüz", davranis: "normal" },
  { id: 7, ad: "Eski genel", davranis: "normal", maliyetRolu: "genel", deletedAt: "2026-04-01T00:00:00.000Z" },
];
const k = (id, tarih, turId, o = {}) => ({ id, tarih, turId, kdvOrani: 0, modelSatirlari: [], taksitler: [], ...o });
const veri = (o = {}) => ({ giderler: [], giderTurleri: T, tedarikciler: [], stock: [], customers: [], partStockLog: [], uretimPartileri: [], yururlukAy: "2026-01", ...o });
const havuz = (giderler, ay = "2026-03", o = {}) => aylikGenelHavuzlar(veri({ giderler, ...o }), [ay], BUGUN).get(ay);
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S${id}`, ...o });
const parti = (sonuc, id) => sonuc.partiler.find(p => String(p.id) === String(id));

describe("Spec 0090: aylık genel gider havuzu (R13, C2, C15)", () => {
  it("AC-17: rolü genel üç türün aynı aydaki kalemleri toplanır", () => {
    expect(havuz([k(1, "2026-03-05", 1, { tutar: 1000 }), k(2, "2026-03-10", 2, { tutar: 2000, girisYonu: "brut", stopajOrani: 20 }),
      k(3, "2026-03-31", 3, { calisanId: 21, calisanAd: "Gizli", resmiTutar: 300, eldenTutar: 200, tutar: null })])).toBe(350000);
  });
  it("AC-18: rolü ürün ağacından gelir türün kalemi havuza girmez", () => {
    expect(havuz([k(1, "2026-03-05", 1, { tutar: 1000 }), k(2, "2026-03-06", 4, { tutar: 9000 })])).toBe(100000);
  });
  it("AC-19: rolü maliyete girmez türün kalemi havuza girmez", () => {
    expect(havuz([k(1, "2026-03-05", 1, { tutar: 1000 }), k(2, "2026-03-06", 5, { tutar: 9000 })])).toBe(100000);
  });
  it("AC-20: rolü verilmemiş türün kalemi havuza girmez", () => {
    expect(havuz([k(1, "2026-03-05", 1, { tutar: 1000 }), k(2, "2026-03-06", 6, { tutar: 9000 })])).toBe(100000);
  });
  it("AC-21: türü tanımsız ya da bulunamayan kalem havuza girmez", () => {
    expect(havuz([k(1, "2026-03-05", 1, { tutar: 1000 }), k(2, "2026-03-06", null, { tutar: 9000 }), k(3, "2026-03-07", 99, { tutar: 9000 })])).toBe(100000);
  });
  it("AC-22: çöpteki genel türün kalemi havuza girer", () => {
    expect(havuz([k(1, "2026-03-05", 7, { tutar: 1234.56 })])).toBe(123456);
  });
  it("AC-23: kısıtlı gider kalemi matrah + indirilemeyen KDV ile girer (gider tutarı, 0076)", () => {
    expect(havuz([k(1, "2026-03-05", 1, { tutar: 1000, kdvOrani: 20, kisitliGider: true, indirilebilirOran: 70 })])).toBe(106000);
  });
  it("AC-24: yürürlük ayından önceki aya tarihli kalem havuza girmez", () => {
    expect(havuz([k(1, "2026-03-05", 1, { tutar: 1000 })], "2026-03", { yururlukAy: "2026-04" })).toBe(0);
  });
  it("AC-25 (C3): ayar dönemine eşit aralıkta aylık havuzların toplamı 0088'in dönem havuzuna kuruş kuruş eşit", () => {
    const v = V90.veri();
    const ayarlar = { baslangicAy: "2026-02", bitisAy: "2026-06", varsayilanAdet: 7 };
    const aylar = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
    const toplam = [...aylikGenelHavuzlar(v, aylar, V90.BUGUN).values()].reduce((t, x) => t + x, 0);
    expect(toplam).toBeGreaterThan(0);
    expect(toplam).toBe(genelGiderPayi(v, ayarlar, V90.BUGUN).havuzK);
  });
});

describe("Spec 0090: parti payı (R14–R22, R31–R33)", () => {
  const G3 = [k(1, "2026-02-10", 1, { tutar: 1000 }), k(2, "2026-03-10", 1, { tutar: 2000 }), k(3, "2026-04-10", 1, { tutar: 3000.01 })];
  it("AC-26: üç aylık, tek, makinası olan parti: havuz üç ayın havuzlarının toplamı", () => {
    const s = partiGenelPaylari(veri({ giderler: G3, uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-04" }],
      stock: [stk(1, { partiId: 1, uretimTarihi: "2026-02-01" })] }), BUGUN);
    expect(parti(s, 1).havuzK).toBe(s.aylar.get("2026-02") + s.aylar.get("2026-03") + s.aylar.get("2026-04"));
    expect(parti(s, 1).havuzK).toBe(600001);
  });
  it("AC-27: makina başı pay aşağı yuvarlanır; paylar toplamı havuz, artık kuruş en önce üretilen makinaya", () => {
    const s = partiGenelPaylari(veri({ giderler: G3, uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-04" }],
      stock: [stk(1, { partiId: 1, uretimTarihi: "2026-03-01" }), stk(2, { partiId: 1, uretimTarihi: "2026-02-01" }), stk(3, { partiId: 1, uretimTarihi: "2026-04-01" })] }), BUGUN);
    const p = parti(s, 1);
    expect(p.makinaBasiK).toBe(Math.floor(600001 / 3));
    expect(p.makinaPaylari.reduce((t, x) => t + x.payK, 0)).toBe(p.havuzK);
    expect(p.makinaPaylari[0]).toEqual({ anahtar: "stok:2", payK: 200000 + 1 });
    expect(p.makinaPaylari.slice(1).map(x => x.payK)).toEqual([200000, 200000]);
  });
  it("AC-28: çakışan iki parti; ortak ay adet ağırlığıyla bölünür, iki payın toplamı ayın havuzu", () => {
    const s = partiGenelPaylari(veri({ giderler: [k(1, "2026-04-10", 1, { tutar: 3000.01 })],
      uretimPartileri: [{ id: 1, ad: "A", baslangicAy: "2026-04", bitisAy: "2026-04" }, { id: 2, ad: "B", baslangicAy: "2026-04", bitisAy: null }],
      stock: [stk(1, { partiId: 1, uretimTarihi: "2026-04-01" }), stk(2, { partiId: 2, uretimTarihi: "2026-04-05" }), stk(3, { partiId: 2, uretimTarihi: "2026-04-06" })] }), BUGUN);
    expect(parti(s, 1).havuzK + parti(s, 2).havuzK).toBe(300001);
    expect(parti(s, 1).havuzK).toBe(Math.floor(300001 / 3) + 1); // artık en önce üretilen makinanın sahibine
    expect(parti(s, 2).havuzK).toBe(Math.floor(300001 * 2 / 3));
  });
  it("AC-29: o ay üretilmiş partisiz makina ağırlık bir; partinin payı küçülür", () => {
    const s = partiGenelPaylari(veri({ giderler: [k(1, "2026-04-10", 1, { tutar: 3000 })], uretimPartileri: [{ id: 1, ad: "A", baslangicAy: "2026-04", bitisAy: "2026-04" }],
      stock: [stk(1, { partiId: 1, uretimTarihi: "2026-04-01" }), stk(2, { uretimTarihi: "2026-04-20" }), stk(3, { uretimTarihi: "2026-05-20" })] }), BUGUN);
    expect(parti(s, 1).havuzK).toBe(150000);
  });
  it("AC-30: yürürlük öncesi aylar havuza girmez, kalan aylar girer", () => {
    const s = partiGenelPaylari(veri({ giderler: G3, yururlukAy: "2026-03", uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-04" }],
      stock: [stk(1, { partiId: 1, uretimTarihi: "2026-02-01" })] }), BUGUN);
    expect(parti(s, 1).havuzK).toBe(500001);
    expect(parti(s, 1).durum).toBe(PARTI_DURUM.TAMAM);
  });
  it("AC-31: başlangıcı gelecek ayda olan parti; havuz sıfır, 'başlamadı' nedeni", () => {
    const s = partiGenelPaylari(veri({ giderler: G3, uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-09", bitisAy: null }], stock: [stk(1, { partiId: 1 })] }), BUGUN);
    expect(parti(s, 1)).toMatchObject({ havuzK: 0, durum: PARTI_DURUM.BASLAMADI, neden: PARTI_NEDEN.baslamadi });
    expect(PARTI_NEDEN.baslamadi).toMatch(/henüz başlamadı/);
  });
  it("AC-32: makinası olmayan parti; havuz sıfır, makina başı pay yok, bugünkü ipucu", () => {
    const s = partiGenelPaylari(veri({ giderler: G3, uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-04" }] }), BUGUN);
    expect(parti(s, 1)).toMatchObject({ adet: 0, havuzK: 0, makinaBasiK: null, durum: PARTI_DURUM.MAKINA_YOK, neden: PARTI_NEDEN.makinaYok });
    expect(PARTI_NEDEN.makinaYok).toMatch(/^Bağlı makina yok/);
  });
  it("AC-34: hiçbir canlı türün rolü genel değilse havuz yerine neden (rolYok)", () => {
    const turler = T.map(t => (t.maliyetRolu === "genel" && !t.deletedAt ? { ...t, maliyetRolu: "yok" } : t)).filter(t => !t.deletedAt);
    const s = partiGenelPaylari(veri({ giderTurleri: turler, giderler: G3, uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-04" }],
      stock: [stk(1, { partiId: 1, uretimTarihi: "2026-02-01" })] }), BUGUN);
    expect(parti(s, 1)).toMatchObject({ havuzK: 0, durum: PARTI_DURUM.ROL_YOK, neden: PARTI_NEDEN.rolYok });
  });
  it("AC-35: parti havuzu hesap ayarlarındaki dönem ve varsayılan adetten bağımsız (ayarsız durum etkilemez)", () => {
    const v = veri({ giderler: G3, uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-04" }], stock: [stk(1, { partiId: 1, uretimTarihi: "2026-02-01" })] });
    const a = partiGenelPaylari(v, BUGUN);
    const b = partiGenelPaylari({ ...v, maliyetAyarlari: { baslangicAy: "2026-03", bitisAy: "2026-03", varsayilanAdet: 999 }, appSettings: { maliyetAyarlari: {} } }, BUGUN);
    expect(parti(b, 1)).toEqual(parti(a, 1));
    expect(parti(a, 1).havuzK).toBe(600001);
  });
  it("AC-36: kıyas fikstüründe parti havuzu ve makina başı pay spec öncesi kodun rakamıyla birebir aynı", () => {
    const once = JSON.parse(readFileSync("tests/fixtures/0090-parti-once.json", "utf8"));
    const s = partiGenelPaylari(V90.veri(), V90.BUGUN);
    for (const o of once) {
      const p = parti(s, o.id);
      expect(p, String(o.id)).toBeTruthy();
      expect([p.adet, p.havuzK], String(o.id)).toEqual([o.adet, o.havuzK]);
      if (p.durum === PARTI_DURUM.TAMAM) expect(p.makinaBasiK, String(o.id)).toBe(o.makinaBasiK);
      for (const [ay, ortakK] of Object.entries(o.aylar)) expect(s.aylar.get(ay), ay).toBe(ortakK);
    }
    expect(once.map(o => o.id).sort()).toEqual([901, 902, 903, 904]); // çöpteki parti (905) iki tarafta da yok
  });
  it("AC-37: parti nesnesi havuzun kaynağını söyler", () => {
    const s = partiGenelPaylari(V90.veri(), V90.BUGUN);
    expect(parti(s, 901).kaynak).toBe(PARTI_KAYNAK_IBARESI);
    expect(PARTI_KAYNAK_IBARESI).toBe("Partinin aylarındaki genel gider");
  });
  it("AC-38/2: parti başına tek nesne; beş durum değerinin hepsi üretilebilir", () => {
    const s = partiGenelPaylari(veri({ giderler: G3, yururlukAy: "2026-02", uretimPartileri: [
      { id: 1, ad: "Tamam", baslangicAy: "2026-02", bitisAy: "2026-04" }, { id: 2, ad: "Boş", baslangicAy: "2026-02", bitisAy: "2026-02" },
      { id: 3, ad: "Gelecek", baslangicAy: "2026-12", bitisAy: null }, { id: 4, ad: "Eski", baslangicAy: "2025-01", bitisAy: "2025-03" }],
      stock: [stk(1, { partiId: 1, uretimTarihi: "2026-02-01" }), stk(2, { partiId: 3 }), stk(3, { partiId: 4, uretimTarihi: "2025-02-01" })] }), BUGUN);
    const rolsuz = partiGenelPaylari(veri({ giderTurleri: [{ id: 1, ad: "X", davranis: "normal", maliyetRolu: "yok" }], giderler: G3,
      uretimPartileri: [{ id: 5, ad: "R", baslangicAy: "2026-02", bitisAy: "2026-04" }], stock: [stk(9, { partiId: 5, uretimTarihi: "2026-02-01" })] }), BUGUN);
    const durumlar = [...s.partiler, ...rolsuz.partiler].map(p => p.durum).sort();
    expect(durumlar).toEqual(Object.values(PARTI_DURUM).sort());
    for (const p of s.partiler) expect(Object.keys(p)).toEqual(expect.arrayContaining(["id", "adet", "havuzK", "makinaBasiK", "durum", "neden"]));
    expect(parti(s, 4).neden).toBe(PARTI_NEDEN.yururlukOncesi);
  });
  it("AC-38/3: partinin adedi bölünmedeki ağırlıkla aynı makina kümesinden; paylar toplamı havuz", () => {
    const v = V90.veri();
    const s = partiGenelPaylari(v, V90.BUGUN);
    const liste = makinaListesi({ customers: v.customers, stock: v.stock, partStockLog: [] });
    for (const p of s.partiler) {
      expect(p.adet, String(p.id)).toBe(liste.filter(m => String(m.kayit?.partiId) === String(p.id)).length);
      if (p.adet) expect(p.makinaPaylari.reduce((t, x) => t + x.payK, 0), String(p.id)).toBe(p.havuzK);
    }
    expect(parti(s, 901).adet).toBe(3); // iki stok satırı + satılmış müşteri makinası
  });
  it("AC-38/4: genel türler var ama partinin aylarında kalem yoksa havuz sıfır, neden yok; bütün aylar yürürlük öncesiyse neden", () => {
    const s = partiGenelPaylari(veri({ giderler: [k(1, "2026-05-10", 1, { tutar: 1000 })], yururlukAy: "2026-02",
      uretimPartileri: [{ id: 1, ad: "Sessiz", baslangicAy: "2026-02", bitisAy: "2026-03" }, { id: 2, ad: "Eski", baslangicAy: "2025-01", bitisAy: "2025-12" }],
      stock: [stk(1, { partiId: 1, uretimTarihi: "2026-02-01" }), stk(2, { partiId: 2, uretimTarihi: "2025-02-01" })] }), BUGUN);
    expect(parti(s, 1)).toMatchObject({ havuzK: 0, durum: PARTI_DURUM.TAMAM, neden: null });
    expect(parti(s, 2)).toMatchObject({ havuzK: 0, durum: PARTI_DURUM.YURURLUK_ONCESI });
  });
  it("AC-48 (C6): personel türü havuza tek rakam olarak girer; motor çıktısında çalışan adı ve çalışan bazlı tutar yok", () => {
    const s = partiGenelPaylari(V90.veri(), V90.BUGUN);
    const json = JSON.stringify({ ...s, aylar: [...s.aylar] });
    expect(json).not.toMatch(/Gizli Kişi|calisan|resmi|elden/i);
    expect(kod("src/lib/makinaStandartMaliyet.js")).not.toMatch(/calisanAd|resmiTutar|eldenTutar/);
  });
});

describe("Spec 0090: kapanış anlık görüntüsü (R23–R26, R36, R37)", () => {
  const v = () => veri({ giderler: [k(1, "2026-02-10", 1, { tutar: 1000 }), k(2, "2026-03-10", 1, { tutar: 2000 })], uretimPartileri: [],
    stock: [stk(1, { partiId: 1, uretimTarihi: "2026-02-01" })] });
  const harita = (vv = v()) => { const s = partiGenelPaylari(vv, BUGUN); return { aylar: s.aylar, yururlukAy: s.yururlukAy }; };
  it("AC-39: parti kapatılınca her ayın o anki genel havuzu yazılır", () => {
    const { kayit } = partiKapanisUygula(null, { id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-03" }, harita(), "2026-04-01T10:00:00");
    expect(kayit).toMatchObject({ kapanmaZamani: "2026-04-01T10:00:00", kapanisGenelHavuzlari: { "2026-02": 100000, "2026-03": 200000 } });
  });
  it("AC-40: aralığı değişmeyen kapalı parti yeniden kaydedilince görüntü ve kapanış zamanı değişmez", () => {
    const eski = { id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-03", kapanmaZamani: "2026-04-01T10:00:00", kapanisGenelHavuzlari: { "2026-02": 1, "2026-03": 2 } };
    const { kayit } = partiKapanisUygula(eski, { ...eski, ad: "Yeni ad" }, harita(), "2026-06-01T10:00:00");
    expect(kayit).toMatchObject({ ad: "Yeni ad", kapanmaZamani: "2026-04-01T10:00:00", kapanisGenelHavuzlari: { "2026-02": 1, "2026-03": 2 } });
  });
  it("AC-41: bitiş silinince yeni alanın anahtarı silinir (null da yazılmaz)", () => {
    const eski = { id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-03", kapanisGenelHavuzlari: { "2026-02": 1 } };
    const { kayit } = partiKapanisUygula(eski, { ...eski, bitisAy: null }, harita(), "2026-06-01T10:00:00");
    expect(kayit).not.toHaveProperty("kapanisGenelHavuzlari");
    expect(kayit.kapanmaZamani).toBeNull();
  });
  it("AC-42: spec öncesi kapanmış parti (yalnız eski alan) değişim üretmez", () => {
    const s = partiGenelPaylari(veri({ ...v(), uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-03", kapanisOrtaklari: { "2026-02": 5, "2026-03": 7 } }] }), BUGUN);
    expect(parti(s, 1).degisimler).toEqual([]);
  });
  it("AC-43: yeni alanı yazılı partinin ayı sonradan değişince tek değişim satırı: kapanıştaki, bugünkü, fark", () => {
    const s = partiGenelPaylari(veri({ ...v(), uretimPartileri: [{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-03", kapanisGenelHavuzlari: { "2026-02": 100000, "2026-03": 150000 } }] }), BUGUN);
    expect(parti(s, 1).degisimler).toEqual([{ ay: "2026-03", kapanistaK: 150000, bugunK: 200000, farkK: 50000, farkMutlakK: 50000, artti: true }]);
  });
  it("AC-44: eski kapanış alanı hiçbir yerde okunmaz ve mevcut kayıtta korunur", () => {
    const eski = { id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-03", kapanisOrtaklari: { "2026-02": 5 } };
    expect(partiKapanisUygula(eski, { ...eski, bitisAy: "2026-02" }, harita(), "x").kayit.kapanisOrtaklari).toEqual({ "2026-02": 5 });
    expect(partiKapanisUygula(eski, { ...eski, bitisAy: null }, harita(), "x").kayit.kapanisOrtaklari).toEqual({ "2026-02": 5 });
    // Okuyan tek yer bugünkü motorun dosyasıdır (bir sürüm yerinde kalır, C10; çağrılmaz, AC-46).
    const okuyan = ["src/lib/makinaStandartMaliyet.js", "src/lib/uretimPartisi.js", "src/components/gider/UretimPartileri.jsx", "src/components/MakinaMaliyeti.jsx", "src/App.jsx"]
      .filter(f => /\.kapanisOrtaklari|kapanisOrtaklari\s*[:,})]/.test(kod(f)));
    expect(okuyan).toEqual([]);
  });
  it("AC-45/2: ay tablosu verilmezse ya da kapanış ayı tabloda yoksa kayıt reddedilir; boş görüntü yazılmaz", () => {
    const yeni = { id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-03" };
    expect(partiKapanisUygula(null, yeni, null, "x")).toEqual({ hata: KAPANIS_HARITA_YOK });
    expect(partiKapanisUygula(null, yeni, { aylar: new Map([["2026-02", 1]]), yururlukAy: "2026-01" }, "x")).toEqual({ hata: KAPANIS_HARITA_YOK });
    expect(KAPANIS_HARITA_YOK).toMatch(/kaydedilmedi/);
  });
  // Triyaj (bulgu 2): harita kayıtlı partilerden kuruluyordu; kaydedilen partinin ayı haritada yoksa olağan kayıt reddediliyordu.
  describe("triyaj bulgu 2: kapanış haritası kaydedilen partinin aralığını kapsar", () => {
    const kapat = (vv, yeni) => partiKapanisUygula(null, yeni, partiKapanisHavuzu(vv, yeni, BUGUN), "2026-06-15T10:00:00");
    const G = [k(1, "2026-03-10", 1, { tutar: 1000 }), k(2, "2026-04-10", 1, { tutar: 2000 })];
    it("yürürlük 2026-01, bitişi gelecekte (2026-09 – 2026-12) parti kaydedilir; kalemsiz aylar 0", () => {
      const r = kapat(veri({ giderler: G }), { id: 1, ad: "İleri", baslangicAy: "2026-09", bitisAy: "2026-12" });
      expect(r.hata).toBeUndefined();
      expect(r.kayit.kapanisGenelHavuzlari).toEqual({ "2026-09": 0, "2026-10": 0, "2026-11": 0, "2026-12": 0 });
    });
    it("yürürlük boş, hiç parti yokken 2026-03 – 2026-05 parti kaydedilir", () => {
      const r = kapat(veri({ giderler: G, yururlukAy: null }), { id: 1, ad: "P", baslangicAy: "2026-03", bitisAy: "2026-05" });
      expect(r.kayit.kapanisGenelHavuzlari).toEqual({ "2026-03": 100000, "2026-04": 200000, "2026-05": 0 });
    });
    it("yürürlük boş, 2026-06'dan açık parti varken başlangıcı daha önceki 2026-03 – 2026-05 parti kaydedilir", () => {
      const r = kapat(veri({ giderler: G, yururlukAy: null, uretimPartileri: [{ id: 9, ad: "Açık", baslangicAy: "2026-06", bitisAy: null }] }),
        { id: 1, ad: "P", baslangicAy: "2026-03", bitisAy: "2026-05" });
      expect(r.kayit.kapanisGenelHavuzlari).toEqual({ "2026-03": 100000, "2026-04": 200000, "2026-05": 0 });
    });
    it("yürürlük öncesi aylar görüntüye girmez, kalan aylar girer", () => {
      const r = kapat(veri({ giderler: G, yururlukAy: "2026-04" }), { id: 1, ad: "P", baslangicAy: "2026-03", bitisAy: "2026-05" });
      expect(r.kayit.kapanisGenelHavuzlari).toEqual({ "2026-04": 200000, "2026-05": 0 });
    });
  });
  it("R36/2 (K4): ay haritası yürürlükten max(bu ay, en geç parti bitişi)'ne kadar her ayı kapsar", () => {
    const s = partiGenelPaylari(veri({ yururlukAy: "2026-02", uretimPartileri: [{ id: 1, ad: "İleri", baslangicAy: "2026-05", bitisAy: "2026-09" }] }), BUGUN);
    expect([...s.aylar.keys()]).toEqual(["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
  });
  it("AC-45/3 (C14): yeni alanın adı atama, dağıtım ve eski alan adını taşımaz", () => {
    const ad = "kapanisGenelHavuzlari";
    expect(ad).not.toMatch(/atama|dagitim|ortak|kova/i);
    expect(kod("electron/db.cjs")).toMatch(/kapanisGenelHavuzlari TEXT/);
  });
});

describe("Spec 0090: süre, tek yol ve ekran (C5, C15, AC-51, AC-52)", () => {
  it("AC-52: 36 ay, üç parti, 3.000 kalem; hesap 2 sn altında, gider raporu çağrı sayısı yazılır", () => {
    const giderler = [];
    for (let i = 0; i < 3000; i++) {
      const ay = new Date(2024, i % 36, 1 + (i % 27));
      const tarih = `${ay.getFullYear()}-${String(ay.getMonth() + 1).padStart(2, "0")}-${String(ay.getDate()).padStart(2, "0")}`;
      giderler.push(k(i + 1, tarih, (i % 3) + 1, i % 3 === 2 ? { calisanId: 21, resmiTutar: 100, eldenTutar: 50, tutar: null } : { tutar: 100 + (i % 97) }));
    }
    const stock = Array.from({ length: 60 }, (_, i) => stk(i + 1, { partiId: (i % 3) + 1, uretimTarihi: `2024-${String((i % 12) + 1).padStart(2, "0")}-05` }));
    const v = veri({ giderler, stock, yururlukAy: "2024-01", uretimPartileri: [{ id: 1, ad: "A", baslangicAy: "2024-01", bitisAy: "2025-06" },
      { id: 2, ad: "B", baslangicAy: "2025-01", bitisAy: "2026-06" }, { id: 3, ad: "C", baslangicAy: "2026-01", bitisAy: null }] });
    sayac.n = 0;
    const t0 = performance.now();
    const s = partiGenelPaylari(v, "2026-12-15");
    const sure = performance.now() - t0;
    console.log(`AC-52: ${Math.round(sure)} ms, hesaplaGiderRaporu çağrısı ${sayac.n} (ay haritası ${s.aylar.size} ay)`);
    expect(sure).toBeLessThan(2000);
    expect(sayac.n).toBe(s.aylar.size); // ay başına tek çağrı: tek yol (C15)
    expect(s.partiler.reduce((t, p) => t + p.havuzK, 0)).toBeGreaterThan(0);
  });
  it("C15: aylık havuz tek yoldan (rolHavuzlari → tür kırılımı); yeni motor kalemleri kendi toplamaz", () => {
    const m = kod("src/lib/makinaStandartMaliyet.js");
    expect(m).toMatch(/aylikGenelHavuzlar = \(veri, aylar, bugun\) => new Map\(aylar\.map\(ay => \[ay, rolHavuzlari\(veri, ay, ay, bugun\)\.genelK\]\)\)/);
    expect(m).not.toMatch(/kalemGiderTutari|kalemKurus|\.giderler\.(filter|reduce|forEach)/);
  });
  it("AC-51 (C5): parti ekranında çarpma, bölme ve yuvarlama yok", () => {
    const e = kod("src/components/gider/UretimPartileri.jsx").replace(/"[^"\n]*"|`[^`\n]*`/g, '""');
    expect(e).not.toMatch(/Math\./);
    expect(e).not.toMatch(/[\w)\]]\s*[*/]\s*[\w(]/);
  });
});
