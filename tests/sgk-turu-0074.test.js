// Spec 0074: SGK kendi gider türü (0070'in SGK yarısının revizyonu), saf motor ve kaynak taramaları. Saat dilimi sabit.
// Test adları AC-<n> taşır.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  giderKalemDogrula, tekrarlayanUret, turHaritasi, kalemTutari, kalemKdv, odenecekTutar, odemeHedefleri, odemeleriUygula, odemeDurumu,
  borcOzeti, hesaplaGiderRaporu, kalemKovalariKurus, sgkOzeti, tutarGirilmediMi, calisanSgkToplami, atanabilirMi, kdvliMi,
  tedarikciSecilirMi, sgkDavranisiMi, sifirTutarSerbestMi, kdvYonuSecilebilirMi, kurumTarafAdi, odemeSatirlariKur,
  DAVRANIS, HEDEF, HEDEF_SIRASI, SGK, ATAMA,
} from "../src/lib/gider";
import { hedefAdi, hedefBasligi, HEDEF_ADLARI } from "../src/lib/odemeYontemi";
import { acikKalemler } from "../src/lib/acikKalemler";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { mahsupDogrula, calisanEkstresi, SGK_MAHSUP_HATASI } from "../src/lib/kasa";
import { ciroAdaylari } from "../src/lib/cek";
import { ciroAlacaklisi, CIRO_YALNIZ_ANA_NEDENI } from "../src/lib/formOdemesi";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const kod = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" },
  { id: 5, ad: "SGK", davranis: "sgk" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Telekom" }];
const AYAR = { turler: TURLER, tedarikciler: TED, yururlukAy: "2026-01" };
let n = 2000;
const uid = () => ++n;
const dogrula = (f) => giderKalemDogrula(f, { turMap, tedarikciler: TED, uid });
const kayit = (f) => { const r = dogrula(f); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const sgk = (o = {}) => kayit({ id: 70, tarih: "2026-09-30", turId: 5, tutar: "16000", kdvOrani: "20", tedarikciId: 11, sonOdemeTarihi: "2026-10-31", aciklama: "Eylül SGK", ...o });
const per = (o = {}) => kayit({ id: 71, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: "30000", eldenTutar: "10000", yolParasi: "1000", sonOdemeTarihi: "2026-10-05", ...o });

describe("Spec 0074 A: davranış ve kalem şekli", () => {
  it("AC-6, AC-7, AC-8: SGK kalemi kaydedilir; KDV sıfır (oran formda dolu gelse de), kdvYonu null, tedarikçi, çalışan ve stopaj yok", () => {
    const k = sgk({ calisanId: 21, stopajOrani: "20", ekOdemeler: [{ tur: "prim", resmiTutar: "5" }] });
    expect(k).toMatchObject({ tutar: 16000, kdvOrani: 0, kdvYonu: null, tedarikciId: null, calisanId: null, stopajOrani: null, ekOdemeler: [] });
    expect(kalemKdv(k, DAVRANIS.SGK)).toBe(0);
    expect(odenecekTutar(k, DAVRANIS.SGK)).toBe(16000);
    expect(kdvYonuSecilebilirMi(DAVRANIS.SGK, "brut")).toBe(false);
    expect([kdvliMi(DAVRANIS.SGK), tedarikciSecilirMi(DAVRANIS.SGK), kdvliMi(DAVRANIS.NORMAL), tedarikciSecilirMi(DAVRANIS.KIRA)]).toEqual([false, false, true, true]);
  });
  it("AC-9: SGK atanamaz, kovası her zaman ortak (atama alanları doğrulamada temizlenir)", () => {
    expect(atanabilirMi(DAVRANIS.SGK)).toBe(false);
    const k = sgk({ atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 4 });
    expect(k.atamaTur).toBe("");
    const kv = kalemKovalariKurus({ ...k, atamaTur: ATAMA.MODEL, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 100, adet: 1 }] }, { davranis: DAVRANIS.SGK, canliModeller: new Set(["ak100"]) });
    expect([kv.ortak, kv.model, kv.makina]).toEqual([1600000, 0, 0]);
  });
  it("AC-10, AC-12: SGK kalemi taksitlenir ve taksitleri bugünkü yollarla ödenir (tek ödeme hedefi ANA)", () => {
    const k = sgk({ taksitSayisi: "3", sonOdemeTarihi: "2026-10-31" });
    expect(k.taksitler.map(t => [t.hedef, t.sira])).toEqual([["ana", 1], ["ana", 2], ["ana", 3]]);
    const z = odemeleriUygula([k], [{ id: 1, tur: "odeme", tarih: "2026-10-31", tutar: k.taksitler[0].tutar, giderId: k.id, taksitId: k.taksitler[0].id }], turMap)[0];
    expect(odemeDurumu(z)).toBe("kismen");
    expect(odemeHedefleri(z, DAVRANIS.SGK).map(h => h.hedef)).toEqual([HEDEF.ANA]);
  });
  it("AC-11: SGK kalemine çek ciro edilebilir (ANA hedef, serbest alacaklı); SGK'ya özel çek yasağı yok", () => {
    const k = odemeleriUygula([sgk()], [], turMap)[0];
    const alacakli = ciroAlacaklisi(k, turMap);
    expect(alacakli).toEqual({ tur: "serbest" });
    expect(ciroAdaylari([k], alacakli, turMap).map(a => [a.giderId, a.kalanK])).toEqual([[70, 1600000]]);
    expect(Object.keys(CIRO_YALNIZ_ANA_NEDENI)).not.toContain("sgk");
  });
  it("AC-13, AC-14, AC-48: SGK tanımı sıfır tutarla kalem üretir (KDV'siz, tedarikçisiz); 'Tutar girilmedi' sayılır", () => {
    const t = [{ id: 90, turId: 5, ad: "SGK", tutar: 0, kdvOrani: null, tedarikciId: 11, baslangicAy: "2026-06", uretilenAylar: [] }];
    const k = tekrarlayanUret(t, [], "2026-09", { turMap, uid }).yeniKalemler[0];
    expect(k).toMatchObject({ turId: 5, tutar: 0, kdvOrani: 0, kdvYonu: null, tedarikciId: null, tanimId: 90 });
    expect(tutarGirilmediMi(k, DAVRANIS.SGK)).toBe(true);
    // R8: tanımda kalmış eski atama (tür sonradan SGK'ya çevrildi) kaleme taşınmaz; kalem ortak kovada.
    const atamali = tekrarlayanUret([{ ...t[0], id: 92, atamaTur: "makina", makinaTur: "stok", makinaId: 4 }], [], "2026-09", { turMap, uid }).yeniKalemler[0];
    expect(atamali).toMatchObject({ atamaTur: "", makinaTur: null, makinaId: null });
    // Üretilen kalemin sıfır tutarı doğrulamadan geçer (tanimKalemi kapısı).
    expect(dogrula({ ...k, tutar: "" }).hatalar).toEqual([]);
    // Personel tanımı kartın SGK'sını kaleme kopyalamaz (R34).
    const p = tekrarlayanUret([{ id: 91, turId: 3, ad: "Hasan", calisanId: 21, baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09",
      { turMap, uid, calisanlar: [{ id: 21, ad: "Hasan", resmiMaliyet: 30000, sgkMaliyet: 9000 }] }).yeniKalemler[0];
    expect("sgkTutar" in p).toBe(false);
  });
  it("AC-36: elle açılan SGK kalemi sıfır tutarla kaydedilemez (tanimKalemi kapısı gevşemedi)", () => {
    expect(sifirTutarSerbestMi(DAVRANIS.SGK)).toBe(true);
    expect(dogrula({ tarih: "2026-09-30", turId: 5, tutar: "" }).hatalar).toContainEqual({ alan: "tutar", mesaj: "Tutar sıfırdan büyük olmalı." });
  });
  it("AC-15, AC-46: SGK toplamı önerisi canlı ve dolu değerlerden, kişi sayısıyla; çöpteki ve boş sayılmaz", () => {
    const c = [{ id: 1, sgkMaliyet: 9000 }, { id: 2, sgkMaliyet: "7.000,50" }, { id: 3, sgkMaliyet: "" }, { id: 4, sgkMaliyet: 5000, deletedAt: "x" }, { id: 5 }];
    expect(calisanSgkToplami(c)).toEqual({ toplam: 16000.5, kisi: 2 });
    expect(calisanSgkToplami([{ id: 3 }])).toEqual({ toplam: 0, kisi: 0 });
  });
  it("AC-16, AC-37: hedef adı tek tablodan 'SGK'ya' / 'SGK'; 'Tedarikçiye' değil; genel tabloda SGK kaydı yok", () => {
    expect(hedefAdi(HEDEF.ANA, DAVRANIS.SGK)).toBe("SGK'ya");
    expect(hedefBasligi(HEDEF.ANA, DAVRANIS.SGK)).toBe("SGK");
    expect(hedefAdi(HEDEF.ANA, DAVRANIS.NORMAL)).toBe("Tedarikçiye");
    expect(Object.keys(HEDEF_ADLARI.genel)).not.toContain("sgk");
    expect(kod("src/lib/odemeYontemi.js")).toMatch(/hedef === HEDEF\.ANA && sgkDavranisiMi\(davranis\) \? HEDEF_ADLARI\.sgk\[HEDEF\.ANA\]/);
  });
});

describe("Spec 0074 D: 0070'in SGK yarısının geri alınması", () => {
  it("AC-17, AC-18: personel toplamı resmi + elden + yol parası + ek ödemeler; ödenecek tutardan SGK düşülmez (eski sgkTutar okunmaz)", () => {
    const k = { ...per({ ekOdemeler: [{ tur: "prim", resmiTutar: "2000" }] }), sgkTutar: 9000 };
    expect(kalemTutari(k, DAVRANIS.PERSONEL)).toBe(43000);
    expect(odenecekTutar(k, DAVRANIS.PERSONEL)).toBe(43000);
  });
  it("AC-19: personel kaleminde SGK hedefi ve SGK vadesi yok; HEDEF'te SGK yok; odemeSatirlariKur sgkVade almaz", () => {
    expect(Object.values(HEDEF)).not.toContain("sgk");
    expect(HEDEF_SIRASI).not.toContain("sgk");
    expect(per().taksitler.map(t => t.hedef).sort()).toEqual(["ana", "elden"]);
    expect(kod("src/lib/gider.js")).not.toMatch(/sgkVade/);
    expect(kod("src/components/GiderForm.jsx")).not.toMatch(/sgkVade|sgkTutar/);
    expect(odemeSatirlariKur({ resmiTutar: 1000, eldenTutar: 500 }, DAVRANIS.PERSONEL, { sgkVade: "2026-12-01" }, { uid }).satirlar.every(s => s.hedef !== "sgk")).toBe(true);
  });
  it("AC-32: hedefi 'sgk' olan eski taksit satırı hiçbir hesaba girmez ve ilk kayıtta temizlenir", () => {
    const eski = { ...per(), taksitler: [...per().taksitler, { id: 999, hedef: "sgk", sira: 1, vade: "2026-10-15", tutar: 9000, odendi: false }] };
    expect(odemeHedefleri(eski, DAVRANIS.PERSONEL).map(h => h.hedef)).toEqual(["ana", "elden"]);
    const yeniden = kayit({ ...eski, resmiTutar: "30000", eldenTutar: "10000", yolParasi: "1000" });
    expect(yeniden.taksitler.some(t => t.hedef === "sgk")).toBe(false);
  });
  it("AC-21: çalışan ekstresi sade; son bakiye çalışan borcuyla eşit", () => {
    const A = per();
    const hs = [{ id: 1, tur: "odeme", tarih: "2026-10-04", tutar: 10000, giderId: A.id, taksitId: A.taksitler.find(t => t.hedef === HEDEF.ANA).id }];
    const e = calisanEkstresi(21, { giderler: [A], hareketler: hs, turler: TURLER, yururlukAy: "2026-01", bugun: "2026-10-12" });
    expect(e.bakiye).toBe(41000 - 10000);
    expect(borcOzeti(odemeleriUygula([A], hs, turMap), AYAR, "2026-10-12").satirlar.find(x => x.tur === "calisanlar").tutar).toBe(e.bakiye);
  });
  it("AC-43, AC-28: personelin mahsup sınırı 0070 öncesine döndü; SGK kalemine mahsup davranışa bakarak reddedilir ('kalemine')", () => {
    const satirsiz = { id: 90, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: "Hasan", resmiTutar: 30000, sgkTutar: 9000, ekOdemeler: [], taksitler: [], sonOdemeTarihi: "2026-10-05" };
    const avans = [{ id: 1, tur: "avans", calisanId: 21, tutar: 50000, tarih: "2026-09-01" }];
    expect(mahsupDogrula({ tarih: "2026-10-10", tutar: "30000" }, { kalem: satirsiz, turMap, hareketler: avans, giderler: [satirsiz], bugun: "2026-10-12" }).kayit).toBeTruthy();
    expect(kod("src/lib/kasa.js")).not.toMatch(/sgkKalanK/);
    const r = mahsupDogrula({ tarih: "2026-10-10", tutar: "100" }, { kalem: sgk(), turMap, hareketler: avans, giderler: [], bugun: "2026-10-12" });
    expect(r.hatalar.hedef).toBe(SGK_MAHSUP_HATASI);
    expect(SGK_MAHSUP_HATASI).toBe("SGK kalemine avans mahsubu yapılamaz; SGK kuruma ödenir.");
  });
});

describe("Spec 0074: borç, açık kalemler, hatırlatıcı, kırılımlar", () => {
  const A = sgk({ id: 70, tarih: "2026-09-30", tutar: "16000", sonOdemeTarihi: "2026-10-05" });
  const B = sgk({ id: 72, tarih: "2026-08-31", tutar: "15000", sonOdemeTarihi: "2026-09-15" });
  const E = kayit({ id: 73, tarih: "2026-09-15", turId: 4, tutar: "500", kdvOrani: "20", tedarikciId: 11, sonOdemeTarihi: "2026-10-10" });
  const G = odemeleriUygula([A, B, E, per()], [], turMap);
  it("AC-23: borç özetinde açık SGK kalemleri tek 'SGK' taraf satırı; genel borca girer, tedarikçi kartına girmez", () => {
    const b = borcOzeti(G, AYAR, "2026-10-02");
    const s = b.satirlar.find(x => x.tur === "sgk");
    expect([s.ad, s.tutar, s.kalemler.length]).toEqual([SGK, 31000, 2]);
    expect(b.satirlar.find(x => x.tur === "secilmemis")).toBeUndefined();
    expect(b.satirlar.find(x => x.tur === "tedarikci").tutar).toBe(600);
  });
  it("AC-24: açık kalemlerde SGK kaleminin tarafı 'SGK', 'Tedarikçi seçilmemiş' değil", () => {
    const a = acikKalemler(G, AYAR, "2026-10-02").satirlar.filter(x => [70, 72].includes(x.kalemId));
    expect(a.every(x => x.tarafTur === "sgk" && x.tarafAd === SGK && !x.personel)).toBe(true);
  });
  it("AC-22: hatırlatıcıda SGK kalemi normal kalem satırı (toplu satır yok), tarafı 'SGK'; 'SGK vadesi' etiketi yok", () => {
    const h = odemeHatirlatmalari(G, { ...AYAR, esikGun: 30 }, "2026-10-02");
    const satirlar = [...h.gecmisSatirlar, ...h.yaklasanSatirlar];
    expect(satirlar.some(s => s.tur === "sgk")).toBe(false);
    const sgkOge = [...h.gecmis, ...h.yaklasan].filter(o => [70, 72].includes(o.id));
    expect(sgkOge.map(o => [o.id, o.taraf, o.vadeEtiketi])).toEqual(expect.arrayContaining([[72, SGK, "Son ödeme"], [70, SGK, "Son ödeme"]]));
    expect(kod("src/lib/odemeHatirlatma.js")).not.toMatch(/SGK vadesi|sgk: 1/);
  });
  it("AC-27, AC-47: tür kırılımında kendi türüyle, kova dağılımında ortak; tedarikçi kırılımına girmez", () => {
    const r = hesaplaGiderRaporu({ giderler: [A, E], ...AYAR }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-10-02" });
    expect(r.turKirilimi.find(t => t.ad === "SGK")).toMatchObject({ toplam: 16000, davranis: "sgk" });
    expect(r.kovalar.ortak).toBe(16500);
    expect(r.tedarikciKirilimi.secilmemis.adet).toBe(0);
    expect(r.tedarikciKirilimi.toplamHarcama).toBe(500);
    expect(kurumTarafAdi(DAVRANIS.SGK)).toBe(SGK);
    expect(kurumTarafAdi(DAVRANIS.NORMAL)).toBeNull();
  });
  it("AC-25 (motor): sgkOzeti SGK davranışlı kalemlerin toplamı; ödenen ve açık aynı kaynaktan", () => {
    const z = odemeleriUygula([A, B, per()], [{ id: 1, tur: "odeme", tarih: "2026-10-03", tutar: 15000, giderId: 72 }], turMap);
    expect(sgkOzeti(z, turMap)).toEqual({ toplamK: 3100000, odenenK: 1500000, acikK: 1600000 });
  });
});

describe("Spec 0074: tek kapı ve kapsam (kaynak taraması)", () => {
  const tara = (d) => readdirSync(path.join(kok, d)).flatMap(x => { const p = path.join(d, x); return statSync(path.join(kok, p)).isDirectory() ? tara(p) : /\.(js|jsx)$/.test(x) ? [p] : []; });
  it("AC-34, AC-45: DAVRANIS.SGK karşılaştırması yalnız gider.js'teki kapı tanımlarında; bileşenlerde 'sgk' davranış dalı yok", () => {
    for (const f of tara("src")) {
      const s = kod(f);
      if (f === path.join("src", "lib", "gider.js")) continue;
      expect(s, f).not.toMatch(/DAVRANIS\.SGK/);
      expect(s, f).not.toMatch(/dav(ranis)?\s*[!=]==\s*["']sgk["']/);
    }
    const g = kod("src/lib/gider.js").split("\n").filter(l => /DAVRANIS\.SGK/.test(l));
    expect(g.every(l => /export const (DAVRANIS|atanabilirMi|kdvliMi|tedarikciSecilirMi|sgkDavranisiMi|sifirTutarSerbestMi) =/.test(l))).toBe(true);
    expect(sgkDavranisiMi("sgk")).toBe(true);
  });
  it("AC-20, AC-41: toplu ödeme dosyaları yok; onSgkOde yok; kilit listesinde SgkToplamOdeme yok", () => {
    expect(existsSync(path.join(kok, "src/lib/sgkOdeme.js"))).toBe(false);
    expect(existsSync(path.join(kok, "src/components/gider/SgkToplamOdeme.jsx"))).toBe(false);
    for (const f of tara("src")) expect(oku(f), f).not.toMatch(/onSgkOde|SgkToplamOdeme|sgkOdeme"/);
  });
  it("AC-31: göç yok; sgkTutar sütunu şemada durur, hiçbir hesapta okunmaz; sgkVade sütunu yok; yolParasi okunur", () => {
    const db = oku("electron/db.cjs");
    expect(db).toMatch(/sgkTutar REAL, yolParasi REAL/);
    expect(db).not.toMatch(/sgkVade/);
    // Okuma yok; yalnız personel dışı dallardaki eski "alan temizle" ataması (kayit.sgkTutar = null) durur.
    for (const f of tara("src/lib")) expect(kod(f), f).not.toMatch(/\.sgkTutar(?!\s*=\s*null)|sgkTutar\)/);
    expect(kod("src/lib/gider.js")).toMatch(/yolKurus = \(k\) => kurus\(k\?\.yolParasi\)/);
  });
  it("AC-35: yeni izin, sunucu kuralı ve DB sütunu yok; beş liste değişmedi", () => {
    for (const f of ["electron/serverAuth.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js"]) expect(kod(f), f).not.toMatch(/sgkDavranisiMi|DAVRANIS\.SGK|"sgk"/);
  });
});

// Triyaj (2026-10-07, bulgu 2): DoD'nin rehber ve sürüm notu maddeleri R35/R36 ile tutarlı. Spec done'a taşınınca da okunur.
describe("Spec 0074: DoD belge maddeleri R35 ve R36 ile tutarlı", () => {
  const bul = (ad) => [path.join(kok, "specs", ad), path.join(kok, "specs", "done", ad)].find(existsSync);
  const spec = () => readFileSync(bul("0074-sgk-kendi-gider-turu.md"), "utf-8");
  const plan = () => readFileSync(bul("0074-uygulama-plani.md"), "utf-8");
  const dod = () => spec().split("## Definition of Done")[1];
  it("R36: sürüm notu maddesi geçersiz işaretli; plan §7 deneme verisi uyarısı içermez", () => {
    const madde = dod().split("\n- [").find(m => /deneme verisi uyarısı/.test(m));
    expect(madde).toMatch(/Geçersiz \(R36\)/);
    const s7 = plan().split("## 7.")[1];
    expect(s7).toMatch(/SGK artık ayrı bir gider türü/);
    expect(s7).not.toMatch(/deneme|sayılmaz/);
  });
  it("R35: rehber maddesi analiste bırakılmış ve değişecek yerler plan §6'da", () => {
    const madde = dod().split("\n- [").find(m => /rehber/i.test(m));
    expect(madde).toMatch(/R35/);
    expect(madde).toMatch(/plan §6/);
    expect(plan().split("## 6.")[1].split("## 7.")[0]).toMatch(/Kullanıcı rehberinde değişmesi gereken yerler[\s\S]*gider-kasa-kurulum\.html/);
  });
});

// Triyaj (2026-10-07, bulgu 1) AC-40: görüntü aracının yeniden kurulan 0070 SGK ekranları ve yeni 0074 ekranları gerçekten
// çekildi; hiçbiri boş ya da çökmüş değil (araç `cizimHatasi` yazar), silinen ekran araçta ve raporda yok; değişen ekranlar
// kanıt eşlemesinde 0074 raporuna bağlı.
describe("Spec 0074 AC-40: görsel kanıt", () => {
  const EKRANLAR = ["gider-formu-0070-personel", "giderler-0070-borc-sgk", "giderler-0070-personel-ayrinti",
    "ayarlar-gidertur-0074", "gider-formu-0074-sgk", "gider-formu-0074-sgk-oneri", "ayarlar-gidertanim-0074-sgk", "giderler-0074-sgk-odeme"];
  const rapor = () => JSON.parse(readFileSync(path.join(kok, "docs/evidence/0074-piksel-raporu.json"), "utf-8"));
  it("AC-40: 0070 SGK ekranları yeni modelle ve 0074 ekranları iki temada çekildi; boş ya da çöken ekran yok", () => {
    const r = rapor();
    for (const e of EKRANLAR) for (const t of ["aydinlik", "karanlik"]) {
      const s = r.find(x => x.ad === `${e}-${t}.png`);
      expect(s, `${e}-${t}`).toBeTruthy();
      expect(s.cizimHatasi, `${e}-${t}`).toBeUndefined();
    }
    expect(r.filter(x => x.cizimHatasi).map(x => x.ad)).toEqual([]);
    expect(r.some(x => x.ad.startsWith("giderler-0070-sgk-odeme"))).toBe(false);
    expect(readFileSync(path.join(kok, "scripts/evidence/0009-sayfa.jsx"), "utf-8")).not.toMatch(/giderler-0070-sgk-odeme|SGK'yı Öde/);
  });
  it("AC-40: kanıt eşlemesinde 0074 kayıtları var ve gösterdikleri ekranlar raporda", () => {
    const es = JSON.parse(readFileSync(path.join(kok, "docs/evidence/kanit-eslemesi.json"), "utf-8"));
    const kayitlar = Object.values(es.dosyalar).flat().filter(k => /0074-(taban-)?piksel-raporu/.test(k.rapor));
    expect(kayitlar.length).toBeGreaterThan(0);
    const adlar = new Set(rapor().map(x => x.ad.replace(/-(aydinlik|karanlik)\.png$/, "")));
    for (const k of kayitlar) expect(adlar.has(k.ekran), k.ekran).toBe(true);
  });
});
