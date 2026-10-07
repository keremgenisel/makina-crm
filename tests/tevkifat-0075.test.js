// Spec 0075: tevkifatlı fatura girişi (gider tarafı), saf motor ve kaynak taramaları. Saat dilimi sabit (CI UTC'de koşar).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  giderKalemDogrula, turHaritasi, kalemTutari, kalemKdv, kalemTevkifat, odenecekTutar, odemeHedefleri, odemeDurumu, odemeleriUygula,
  tevkifatKurus, tevkifatliMi, tevkifatDogrula, tevkifatOzeti, tekrarlayanUret, borcOzeti, hesaplaGiderRaporu, kdvKarsilastir,
  kurus, HEDEF, HEDEF_SIRASI, DAVRANIS, vergiRozetleri, TEVKIFAT_ORANLARI, tevkifatOranEtiketi, TEVKIFAT_ALANLARI, TEVKIFAT_KDV_SIFIR_HATASI, VERGI_DAIRESI,
} from "../src/lib/gider";
import { hedefAdi, hedefBasligi, HEDEF_ADLARI } from "../src/lib/odemeYontemi";
import { CIRO_YALNIZ_ANA_NEDENI, formOdemeHedefleri, odemeGirisiHazirla } from "../src/lib/formOdemesi";
import { CIRO_YONTEMI } from "../src/lib/cek";
import { acikKalemler } from "../src/lib/acikKalemler";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { tedarikciEkstresi } from "../src/lib/kasa";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const kod = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
const dosyalar = (d) => readdirSync(path.join(kok, d)).flatMap(ad => {
  const f = path.join(d, ad);
  return statSync(path.join(kok, f)).isDirectory() ? dosyalar(f) : /\.(js|jsx|cjs|mjs)$/.test(ad) ? [f] : [];
});

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Nakliye", davranis: "normal" },
  { id: 5, ad: "SGK", davranis: "sgk" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Yıldız Nakliyat" }];
let n = 7500;
const uid = () => ++n;
const dogrula = (f) => giderKalemDogrula(f, { turMap, tedarikciler: TED, uid });
const kayit = (f) => { const r = dogrula(f); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
// Context'teki örnek: matrah 20.000, KDV %20, tevkifat 5/10.
const tv = (o = {}) => ({ id: 1, tarih: "2026-09-10", turId: 4, tutar: "20000", kdvOrani: "20", tedarikciId: 11, sonOdemeTarihi: "2026-09-30",
  tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, tevkifatVade: "2026-10-26", ...o });
const N = DAVRANIS.NORMAL;
const hedefMap = (k) => Object.fromEntries(odemeHedefleri(k, N).map(h => [h.hedef, h.toplamK]));
const AYAR = { turler: TURLER, tedarikciler: TED, yururlukAy: "2026-01" };

describe("Spec 0075 B: hesap", () => {
  it("AC-6: 20.000 TL, %20, 5/10: toplam KDV 4.000, tevkifat 2.000, kalan KDV 2.000, tedarikçiye 22.000, vergi dairesine 2.000", () => {
    const k = kayit(tv());
    expect(kalemTutari(k, N)).toBe(20000);
    expect(kalemKdv(k, N)).toBe(4000);
    expect(kalemTevkifat(k, N)).toBe(2000);
    expect(kalemKdv(k, N) - kalemTevkifat(k, N)).toBe(2000);
    expect(odenecekTutar(k, N)).toBe(22000);
    expect(hedefMap(k)).toEqual({ ana: 2200000, tevkifat: 200000 });
  });
  it("AC-7: aynı kalem 7/10 ile tevkifat 2.800, kalan KDV 1.200, tedarikçiye 21.200", () => {
    const k = kayit(tv({ tevkifatPay: 7 }));
    expect(kalemTevkifat(k, N)).toBe(2800);
    expect(kalemKdv(k, N) - kalemTevkifat(k, N)).toBe(1200);
    expect(odenecekTutar(k, N)).toBe(21200);
  });
  it("AC-8: yuvarlama gereken oranda iki hedefin toplamı matrah + tam KDV'ye kuruşu kuruşuna eşit; artık kuruş kalan KDV'de", () => {
    const k = kayit(tv({ tutar: "333,33", tevkifatPay: 3 })); // KDV 66,67; 66,67 × 3/10 = 20,001 → 20,00
    expect(kurus(kalemKdv(k, N))).toBe(6667);
    expect(tevkifatKurus(k, N)).toBe(2000);
    const h = hedefMap(k);
    expect(h.ana).toBe(33333 + 4667);
    expect(h.ana + h.tevkifat).toBe(33333 + 6667);
  });
  it("AC-39: iki hedefin toplamK toplamı kalemKurus + kdvKurus'a eşittir (bütün oranlarda)", () => {
    for (const o of TEVKIFAT_ORANLARI) for (const tutar of ["20000", "1234,56", "333,33", "99999,99"]) {
      const k = kayit(tv({ tutar, tevkifatPay: o.pay, tevkifatPayda: o.payda }));
      const top = odemeHedefleri(k, N).reduce((a, h) => a + h.toplamK, 0);
      expect(top, `${tutar} ${o.pay}/${o.payda}`).toBe(kurus(kalemTutari(k, N)) + kurus(kalemKdv(k, N)));
    }
  });
  it("AC-9: tevkifat çarpımı yalnız gider.js'te (tevkifatKurus); bileşenler ve rapor ikinci bir çarpım yazmaz", () => {
    const CARPIM = /tevkifatPay\w*\s*[*/]|[*/]\s*\(?\s*\w*\.?tevkifatPay/;
    const bulunan = dosyalar("src").filter(f => f !== "src/lib/gider.js" && CARPIM.test(kod(f)));
    expect(bulunan).toEqual([]);
    expect(kod("src/lib/gider.js").match(/\* pay \/ payda/g)).toHaveLength(1);
  });
  it("AC-10: tevkifat yalnız normal davranışta; kira, personel ve SGK kaleminde alanlar kayda girmez, tutar sıfır", () => {
    expect([N, DAVRANIS.KIRA, DAVRANIS.PERSONEL, DAVRANIS.SGK].map(tevkifatliMi)).toEqual([true, false, false, false]);
    const kira = kayit({ tarih: "2026-09-10", turId: 1, tutar: "10000", kdvOrani: "20", stopajOrani: "20", tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 });
    for (const a of TEVKIFAT_ALANLARI) expect(a in kira).toBe(false);
    expect(tevkifatKurus({ ...kira, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 }, DAVRANIS.KIRA)).toBe(0);
  });
  it("AC-11: KDV oranı sıfırken tevkifatlı kayıt reddedilir, neden kdvOrani alanında; tanımda boş oran (tarihe göre) serbest", () => {
    expect(dogrula(tv({ kdvOrani: "0" })).hatalar).toContainEqual({ alan: "kdvOrani", mesaj: TEVKIFAT_KDV_SIFIR_HATASI });
    expect(tevkifatDogrula({ tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, kdvOrani: "" }, N, { kdvBosSerbest: true }).hatalar).toEqual([]);
    expect(tevkifatDogrula({ tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, kdvOrani: "0" }, N, { kdvBosSerbest: true }).hatalar.map(h => h.alan)).toEqual(["kdvOrani"]);
  });
  it("AC-12: oran seçilmemiş, pay sıfır ya da paydadan büyük kayıt reddedilir; hata tevkifatPay alanında", () => {
    for (const o of [{ tevkifatPay: "", tevkifatPayda: "" }, { tevkifatPay: 0 }, { tevkifatPay: 11 }]) {
      expect(dogrula(tv(o)).hatalar.map(h => h.alan), JSON.stringify(o)).toContain("tevkifatPay");
    }
  });
  it("AC-13: KDV dâhil seçili tevkifatlı kalemde girilen rakam matrah + tam KDV; saklanan tutar matrah, tevkifat ayrılan matrahtan", () => {
    const k = kayit(tv({ tutar: "24000", kdvYonu: "dahil" }));
    expect(k.tutar).toBe(20000);
    expect(kalemTevkifat(k, N)).toBe(2000);
    expect(odenecekTutar(k, N)).toBe(22000);
  });
  it("AC-5 (motor), R10 (S6): kutu kapalıyken üç alan kayıttan SİLİNİR (null yazılmaz)", () => {
    const k = kayit(tv({ tevkifatli: false }));
    for (const a of TEVKIFAT_ALANLARI) expect(a in k, a).toBe(false);
    expect("tevkifatTaksitSayisi" in k || "tevkifatVade" in k).toBe(false);
    expect(hedefMap(k)).toEqual({ ana: 2400000 });
  });
  it("AC-40: tevkifatı ödenmemiş kalem 'kısmen'dir ve ödenmeyen gider kartında; iki hedef de ödenince 'ödendi'", () => {
    const k = kayit(tv());
    const ana = k.taksitler.find(r => r.hedef === "ana"), tev = k.taksitler.find(r => r.hedef === "tevkifat");
    const h1 = [{ id: 1, tur: "odeme", tarih: "2026-09-20", tutar: 22000, giderId: 1, taksitId: ana.id }];
    const z1 = odemeleriUygula([k], h1, turMap)[0];
    expect(odemeDurumu(z1)).toBe("kismen");
    const r = hesaplaGiderRaporu({ giderler: [z1], ...AYAR }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-09-25" });
    expect(r.odenmeyenAdet).toBe(1);
    const z2 = odemeleriUygula([k], [...h1, { id: 2, tur: "odeme", tarih: "2026-10-20", tutar: 2000, giderId: 1, taksitId: tev.id }], turMap)[0];
    expect(odemeDurumu(z2)).toBe("odendi");
  });
});

describe("Spec 0075 D: ödeme hedefi", () => {
  it("AC-17, AC-44: tevkifatlı kalem satırlı doğar; iki hedef; tevkifat vadesi kendi vadesi, boşsa ana vade", () => {
    const k = kayit(tv());
    expect(k.taksitler.map(r => [r.hedef, r.vade, r.tutar])).toEqual([["ana", "2026-09-30", 22000], ["tevkifat", "2026-10-26", 2000]]);
    const bos = kayit(tv({ tevkifatVade: "" }));
    expect(bos.taksitler.find(r => r.hedef === "tevkifat").vade).toBe("2026-09-30");
  });
  it("AC-44: satirsizHedefler'de tevkifat dalı yok (kaynak taraması); HEDEF_SIRASI stopajın hemen önünde tevkifat", () => {
    const g = kod("src/lib/gider.js");
    const blok = g.slice(g.indexOf("const satirsizHedefler"), g.indexOf("const siraliSatirlar"));
    expect(blok).not.toMatch(/TEVKIFAT|tevkifat/);
    expect(HEDEF_SIRASI).toEqual(["ana", "elden", "ekResmi", "ekElden", "tevkifat", "stopaj"]);
  });
  it("AC-18: tevkifatı sıfır olan kalemde (oran yok, KDV sıfır tanım kalemi) tevkifat hedefi doğmaz", () => {
    expect(hedefMap(kayit(tv({ tevkifatli: false })))).toEqual({ ana: 2400000 });
    expect(tevkifatKurus({ tutar: 0, kdvOrani: 20, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 }, N)).toBe(0);
  });
  it("AC-20: tevkifat taksitlenir; vadeler kendi satırlarında, vade sütunu yok", () => {
    const k = kayit(tv({ tevkifatTaksitSayisi: "2" }));
    expect(k.taksitler.filter(r => r.hedef === "tevkifat").map(r => [r.sira, r.vade, r.tutar])).toEqual([[1, "2026-10-26", 1000], [2, "2026-11-26", 1000]]);
    expect(oku("electron/db.cjs")).not.toMatch(/tevkifatVade/);
  });
  it("R18, R40 (S7): tevkifat vadesi gider tarihinden önce olamaz; ödenmiş tevkifat varken kutu kapatılamaz (tevkifatli alanında)", () => {
    expect(dogrula(tv({ tevkifatVade: "2026-09-01" })).hatalar.map(h => h.alan)).toContain("tevkifatVade");
    const k = kayit(tv());
    const z = odemeleriUygula([k], [{ id: 3, tur: "odeme", tarih: "2026-10-01", tutar: 2000, giderId: 1, taksitId: k.taksitler.find(r => r.hedef === "tevkifat").id }], turMap)[0];
    const r = dogrula({ ...z, tutar: "20000", kdvOrani: "20", tevkifatli: false });
    expect(r.hatalar.map(h => h.alan)).toContain("tevkifatli");
  });
  it("AC-19, AC-46: hedef adı tek tablodan (genel), hedefAdKaydi'nda dal yok", () => {
    expect(hedefAdi(HEDEF.TEVKIFAT, N)).toBe("Vergi dairesine (KDV tevkifatı)");
    expect(hedefBasligi(HEDEF.TEVKIFAT, N)).toBe("Vergi dairesi (tevkifat)");
    expect(HEDEF_ADLARI.genel[HEDEF.TEVKIFAT]).toEqual({ yonelme: "Vergi dairesine (KDV tevkifatı)", yalin: "Vergi dairesi (tevkifat)" });
    const y = kod("src/lib/odemeYontemi.js");
    expect(y.slice(y.indexOf("const hedefAdKaydi"), y.indexOf("export const hedefAdi"))).not.toMatch(/TEVKIFAT/);
  });
  it("AC-21: tevkifat hedefinde çek yok ve nedeni yazılı", () => {
    const k = odemeleriUygula([kayit(tv())], [], turMap)[0];
    const h = formOdemeHedefleri(k, turMap).find(x => x.hedef === HEDEF.TEVKIFAT);
    expect(h.ciroOlur).toBe(false);
    expect(CIRO_YALNIZ_ANA_NEDENI[HEDEF.TEVKIFAT]).toMatch(/tevkifat/i);
    // Çek satırı tevkifat hedefine yazılırsa kayıt reddedilir ve neden tevkifatın kendi metnidir (genel yedek değil).
    const tev = k.taksitler.find(r => r.hedef === "tevkifat");
    const r = odemeGirisiHazirla(k, { turMap, tarih: "2026-10-01", kip: "odeme", hesaplar: [], payments: [], hareketler: [], giderler: [k], bugun: "2026-10-01", yururlukAy: "2026-01",
      cekler: [{ id: 5, yon: "alinan", no: "1", banka: "Ziraat", durum: "portfoy", tutar: 1000, currency: "TRY", tarih: "2026-09-01", gecmis: [] }],
      satirlar: [{ anahtar: "a", hedef: "tevkifat", sira: tev.sira, tutar: "1000", yontem: CIRO_YONTEMI, cekId: 5 }] });
    expect(r.hareketler).toBeFalsy();
    expect(JSON.stringify(r.hatalar)).toContain(CIRO_YALNIZ_ANA_NEDENI[HEDEF.TEVKIFAT]);
  });
  it("AC-22, AC-38, R35: ödeme izni hedefe bakmaz; sunucu, izin ve birleştirme dosyalarında tevkifat yok", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js"]) {
      expect(kod(f), f).not.toMatch(/tevkifat/i);
    }
  });
});

describe("Spec 0075 E: tüketiciler", () => {
  const k = () => kayit(tv());
  it("AC-23: borç özetinde tevkifat stopajla aynı 'Vergi dairesi' satırında; tedarikçi satırı yalnız ana hedef; yeni satır türü yok", () => {
    const b = borcOzeti([odemeleriUygula([k()], [], turMap)[0]], AYAR, "2026-09-25");
    expect(b.satirlar.map(s => [s.tur, s.ad, s.tutar])).toEqual([["tedarikci", "Yıldız Nakliyat", 22000], ["vergiDairesi", VERGI_DAIRESI, 2000]]);
  });
  it("AC-23 (triyaj): vergi dairesi satırının rozetleri içeriğinden; ikisi birlikteyse tek satırda ayrı ayrı iki rozet", () => {
    const kira = kayit({ id: 2, tarih: "2026-09-10", turId: 1, tutar: "10000", kdvOrani: "0", stopajOrani: "20", sonOdemeTarihi: "2026-09-30" });
    const satir = (g) => borcOzeti(odemeleriUygula(g, [], turMap), AYAR, "2026-09-25").satirlar.find(s => s.tur === "vergiDairesi");
    expect(vergiRozetleri(satir([k()]))).toEqual(["KDV tevkifatı"]);
    expect(vergiRozetleri(satir([kira]))).toEqual(["Kira stopajı"]);
    expect(vergiRozetleri(satir([k(), kira]))).toEqual(["Kira stopajı", "KDV tevkifatı"]);
    const b = borcOzeti(odemeleriUygula([k(), kira], [], turMap), AYAR, "2026-09-25");
    expect(b.satirlar.filter(s => s.tur === "vergiDairesi")).toHaveLength(1); // R21: tek satır
    expect(vergiRozetleri({ tur: "vergiDairesi" })).toEqual(["Kira stopajı"]); // alanı olmayan eski satır
  });
  it("AC-24: açık kalemlerde tevkifatın tarafı vergi dairesi; tedarikçinin açık borcu yalnız ana hedefin kalanı", () => {
    const s = acikKalemler([odemeleriUygula([k()], [], turMap)[0]], AYAR, "2026-09-25").satirlar;
    expect(s.map(x => [x.hedef, x.tarafTur, x.tarafAd])).toEqual([["ana", "tedarikci", "Yıldız Nakliyat"], ["tevkifat", "vergiDairesi", VERGI_DAIRESI]]);
    expect(s.filter(x => x.tarafTur === "tedarikci").reduce((a, x) => a + x.kalanK, 0)).toBe(2200000);
  });
  it("AC-25: hatırlatıcıda tevkifat kendi vadesiyle kendi satırında; taraf 'Vergi dairesi', etiket 'Tevkifat vadesi'", () => {
    const h = odemeHatirlatmalari([odemeleriUygula([k()], [], turMap)[0]], { ...AYAR, esikGun: 60 }, "2026-09-25");
    const t = [...h.gecmis, ...h.yaklasan].find(x => x.hedef === "tevkifat");
    expect(t).toMatchObject({ taraf: VERGI_DAIRESI, vadeEtiketi: "Tevkifat vadesi", vade: "2026-10-26", odenecek: 2000, personel: false });
  });
  it("AC-26, AC-50: tedarikçi ekstresinde tevkifat hiç geçmez; son bakiye borç özetinin tedarikçi satırına eşit", () => {
    const kk = k();
    const har = [{ id: 1, tur: "odeme", tarih: "2026-09-20", tutar: 10000, giderId: 1, taksitId: kk.taksitler.find(r => r.hedef === "ana").id },
      { id: 2, tur: "odeme", tarih: "2026-09-21", tutar: 2000, giderId: 1, taksitId: kk.taksitler.find(r => r.hedef === "tevkifat").id }];
    const e = tedarikciEkstresi(11, { giderler: [kk], hareketler: har, turler: TURLER, yururlukAy: "2026-01", bugun: "2026-09-25" });
    expect(e.satirlar.map(x => [x.tur, x.tutarK])).toEqual([["borc", 2200000], ["odeme", 1000000]]);
    const b = borcOzeti(odemeleriUygula([kk], har, turMap), AYAR, "2026-09-25");
    expect(e.bakiye).toBe(b.satirlar.find(s => s.tur === "tedarikci").tutar);
  });
  it("AC-28, AC-47 (R26, S4): tanım tevkifatı normal kaleme taşır (satırlı, vadesi null); kira ve personel tanımında kalmış değer taşınmaz", () => {
    const t = (o) => ({ id: 90, turId: 4, ad: "Nakliye", tutar: 10000, kdvOrani: 20, tedarikciId: 11, baslangicAy: "2026-06", uretilenAylar: [], tevkifatli: true, tevkifatPay: 2, tevkifatPayda: 10, ...o });
    const kl = tekrarlayanUret([t()], [], "2026-09", { turMap, uid }).yeniKalemler[0];
    expect(kl).toMatchObject({ tevkifatli: true, tevkifatPay: 2, tevkifatPayda: 10 });
    expect(kl.taksitler.map(r => [r.hedef, r.tutar, r.vade])).toEqual([["ana", 11600, null], ["tevkifat", 400, null]]);
    const kira = tekrarlayanUret([t({ id: 91, turId: 1, ad: "Kira" })], [], "2026-09", { turMap, uid, giderAyarlari: { stopajOrani: 20 } }).yeniKalemler[0];
    for (const a of TEVKIFAT_ALANLARI) expect(a in kira, a).toBe(false);
    const per = tekrarlayanUret([t({ id: 92, turId: 3, ad: "Hasan", calisanId: 21 })], [], "2026-09", { turMap, uid, calisanlar: [{ id: 21, ad: "Hasan", resmiMaliyet: 1000 }] }).yeniKalemler[0];
    for (const a of TEVKIFAT_ALANLARI) expect(a in per, a).toBe(false);
  });
  it("R25: tevkifatOzeti stopajOzeti'nin eşi (kesilen = ödenen + açık)", () => {
    const kk = k();
    const z = odemeleriUygula([kk], [{ id: 2, tur: "odeme", tarih: "2026-09-21", tutar: 500, giderId: 1, taksitId: kk.taksitler.find(r => r.hedef === "tevkifat").id }], turMap);
    expect(tevkifatOzeti(z, turMap)).toEqual({ kesilenK: 200000, odenenK: 50000, acikK: 150000 });
    expect(tevkifatOzeti([kayit(tv({ tevkifatli: false }))], turMap)).toEqual({ kesilenK: 0, odenenK: 0, acikK: 0 });
  });
});

describe("Spec 0075 F: değişmeyenler", () => {
  it("AC-29: dönem raporunun indirilecek KDV'si tevkifatlı kalemde TAM KDV; dönem toplamı matrah", () => {
    const r = hesaplaGiderRaporu({ giderler: [kayit(tv())], ...AYAR }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-09-25" });
    expect(r.indirilecekKdv).toBe(4000);
    expect(r.toplam).toBe(20000);
  });
  it("AC-30, AC-49: kdvKarsilastir parametresiz çıktısı birebir eski; üçüncü parametre yalnız bilgi alanı ekler, farka girmez", () => {
    const eski = kdvKarsilastir({ TRY: 10000, USD: 5 }, 4000);
    expect(eski).toEqual({ hesaplananTL: 10000, indirilecek: 4000, fark: 6000, odenecek: 6000, devreden: 0, haricTutarlar: [{ para: "USD", tutar: 5 }] });
    const yeni = kdvKarsilastir({ TRY: 10000, USD: 5 }, 4000, 2000);
    expect({ ...yeni, tevkifatKdv2: undefined }).toEqual({ ...eski, tevkifatKdv2: undefined });
    expect(yeni.tevkifatKdv2).toBe(2000);
    expect(kod("src/lib/giderRaporu.js")).toMatch(/kdvKarsilastir\(kdvHesaplanan, gr\.indirilecekKdv\)/);
  });
  it("AC-32: makina maliyeti ve kova dağılımı tevkifattan etkilenmez", () => {
    const g = kayit(tv());
    const temiz = { ...g, taksitler: [] };
    for (const a of TEVKIFAT_ALANLARI) delete temiz[a];
    const girdi = (giderler) => ({ customers: [{ id: 1, name: "F", model: "AK100", serialNo: "S1", installDate: "2026-09-20", uretimTarihi: "2026-09-20", currency: "TRY" }],
      giderler, giderTurleri: TURLER, standardModels: [{ model: "AK100" }], giderAyarlari: { yururlukAy: "2026-01" } });
    const a = hesaplaMakinaMaliyetleri(girdi([g]), { bugun: "2026-09-25" }), b = hesaplaMakinaMaliyetleri(girdi([temiz]), { bugun: "2026-09-25" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("AC-33, AC-36: alanları olmayan eski kalem tevkifatsız; tevkifatlı değil ama oran taşıyan kalemde de tutar sıfır; göç kodu yok", () => {
    const eski = { id: 9, tarih: "2026-09-01", turId: 4, tutar: 1000, kdvOrani: 20, taksitler: [] };
    expect(tevkifatKurus(eski, N)).toBe(0);
    expect(odenecekTutar(eski, N)).toBe(1200);
    expect(tevkifatKurus({ ...eski, tevkifatPay: 5, tevkifatPayda: 10 }, N)).toBe(0);
    expect(oku("electron/db.cjs")).not.toMatch(/tevkifatGocu|0075.*göç/i);
  });
  it("AC-43, R44: oran listesi tek sabit, altı kesir, etiket yalnız kesir", () => {
    expect(TEVKIFAT_ORANLARI.map(tevkifatOranEtiketi)).toEqual(["2/10", "3/10", "4/10", "5/10", "7/10", "9/10"]);
    const tanim = dosyalar("src").filter(f => /TEVKIFAT_ORANLARI\s*=/.test(kod(f)));
    expect(tanim).toEqual(["src/lib/gider.js"]);
  });
});

// Triyaj (2026-10-07, bulgu 2): CLAUDE.md'nin 0075 bölümü yalnız var olan dosyalara atıf yapar (kanıt ve taşınma
// gerçekleşmeden "done" ya da taban raporu yazılmaz); DoD'nin kanıt maddesi ölçülebilir ölçütü taşır (plan §6).
describe("Spec 0075: belge tutarlılığı", () => {
  const bolum = () => { const c = oku("CLAUDE.md"); const i = c.indexOf("### Tevkifatlı fatura girişi"); return c.slice(i, c.indexOf("\n### ", i + 5)); };
  it("CLAUDE.md 0075 bölümündeki spec, plan ve kanıt atıfları var olan dosyalara çıkar", () => {
    const b = bolum();
    const yollar = [...b.matchAll(/`(specs\/[\w/.-]+\.md)`/g)].map(m => m[1]);
    const kanit = [...b.matchAll(/`(0075-[\w-]+\.json)`/g)].map(m => `docs/evidence/${m[1]}`);
    expect(yollar.length).toBeGreaterThan(0);
    expect(kanit.length).toBeGreaterThan(0);
    const yok = [...yollar, ...kanit].filter(f => { try { oku(f); return false; } catch { return true; } });
    expect(yok).toEqual([]);
  });
  it("DoD kanıt maddesi 'kutu kapalı form 0 piksel' demez; ölçüt kutusuz formlar ve tevkifatsız ekranlardır", () => {
    const spec = ["specs/0075-tevkifatli-fatura-girisi.md", "specs/done/0075-tevkifatli-fatura-girisi.md"].map(f => { try { return oku(f); } catch { return ""; } }).find(Boolean);
    const dod = spec.split("## Definition of Done")[1].split("## SCORECARD")[0];
    const madde = dod.split("\n- [").find(m => m.includes("Görsel kanıt"));
    expect(madde).not.toMatch(/Kutu kapalı gider formu 0 piksel/);
    expect(madde).toMatch(/kira, personel ve SGK formları/);
    expect(madde).toMatch(/0 piksel/);
  });
});

// Triyaj (2026-10-07, bulgu 1): DoD görsel kanıtı. 0075 raporu var ve çizim hatası yok; DoD'nin ekranları (kutu açık form ve
// özet, ödeme penceresinde tevkifat hedefi, borç özeti, tanım, Finans KDV2) iki temada çekildi; C3'ün ölçütü olan kutusuz kira,
// personel ve SGK formları 0 piksel; kanıt eşlemesindeki 0075 kayıtları raporda.
describe("Spec 0075: görsel kanıt (DoD)", () => {
  const rapor = () => JSON.parse(oku("docs/evidence/0075-piksel-raporu.json"));
  const ekran = (r, e) => ["aydinlik", "karanlik"].map(t => r.find(x => x.ad === `${e}-${t}.png`));
  it("rapor var, çizim hatası yok; DoD ekranları iki temada çekildi", () => {
    const r = rapor();
    expect(r.filter(x => x.cizimHatasi).map(x => x.ad)).toEqual([]);
    for (const e of ["gider-formu-0075-tevkifat", "gider-formu-0075-bolum", "giderler-0075-liste", "giderler-0075-borc", "giderler-0075-borc-iki", "giderler-0075-odeme",
      "ayarlar-gidertanim-0075", "ayarlar-gidertanim-0075-form", "finans-0075-kdv2"]) {
      for (const s of ekran(r, e)) expect(s, e).toBeTruthy();
    }
  });
  it("C3: kutusuz kira, personel ve SGK formları 0 piksel", () => {
    const r = rapor();
    for (const e of ["gider-formu-kira-stopaj", "gider-formu-0071-kira-dahil", "gider-formu-0072-kira", "gider-formu-personel", "gider-formu-0070-personel", "gider-formu-0074-sgk"]) {
      for (const s of ekran(r, e)) expect(s?.piksel, e).toBe(0);
    }
  });
  it("kanıt eşlemesinin 0075 kayıtları raporda ve değişen ekranları kapsıyor", () => {
    const { dosyalar: d } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    const kayit = Object.values(d).flat().filter(x => /0075-(taban-)?piksel-raporu/.test(x.rapor));
    const adlar = new Set(rapor().map(x => x.ad.replace(/-(aydinlik|karanlik)\.png$/, "")));
    expect(kayit.length).toBeGreaterThan(0);
    for (const x of kayit) expect(adlar.has(x.ekran), x.ekran).toBe(true);
    for (const f of ["src/components/GiderForm.jsx", "src/components/gider/DonemRaporu.jsx", "src/components/gider/OdemeGirisi.jsx", "src/components/gider/KdvKarsilastirmaKarti.jsx"]) {
      expect(d[f].some(x => /0075-/.test(x.rapor)), f).toBe(true);
    }
  });
});
