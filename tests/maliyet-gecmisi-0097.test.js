// Spec 0097: makina maliyeti üretim tarihindeki parça maliyetiyle. Motor (urunAgaci okuma ve karar motoru, parti hesabı, içe
// aktarma), birleştirme sınırı ve kaynak taramaları; kriterler AC adlarıyla. Ortak veri tests/fixtures/0097-veri.js.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import {
  parcaMaliyetKurus, parcaMaliyetiVar, maliyetGecmisiYaz, maliyetGecmisiSatirlari, gecerlilikTarihiDogrula, maliyetGirildiMi, parcaMaliyetMetni,
  BASLANGICTAN_BERI, GIRILMEDI_IBARESI, TARIH_GECERSIZ_HATASI, TARIH_GELECEK_HATASI, tarihOnceHatasi, tarihSonraHatasi, maliyetMetniKurus, gecmisliKayit,
} from "../src/lib/urunAgaci";
import { partiHesabi, partiGenelPaylari, genelGiderPayi, modelMaliyetleri, modelMaliyeti, PARTI_NEDEN, PAY_KAYNAK, ayAraligiMetni } from "../src/lib/makinaStandartMaliyet";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula, PARCA_AKTARMA_BASLIKLARI } from "../src/lib/parcaAktarma";
import { GERI_DONEN_STOK_NOTU } from "../src/lib/musteriKaskad";
import { buildMergePlan, MERGE_KEYS } from "../src/lib/merge";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { KILIT_ALANLARI } from "../src/lib/kilitAlanlari";
import * as V from "./fixtures/0097-veri";

const BUGUN = V.BUGUN;
const parca = (o = {}) => ({ id: 1, ad: "Rulman", models: [], ...o });
// Kaydın fonksiyonu: yeni değerli kaydı tek motordan geçirir (PartManager.hazirla'nın çekirdeği).
const yaz = (eski, yeni, ek) => {
  const r = maliyetGecmisiYaz(eski, parcaMaliyetKurus(yeni), { bugun: BUGUN, ...ek });
  if (r.hata) return { hata: r.hata, kayit: eski };
  const temel = { ...yeni }; delete temel.maliyetGecmisi;
  return { kayit: { ...temel, ...(r.gecmis.length ? { maliyetGecmisi: r.gecmis } : {}) } };
};

describe("Spec 0097: veri ve okuma", () => {
  it("AC-1: maliyeti hiç değişmemiş parçanın (eski ya da yeni) geçmişi boştur ve her tarih için bugünkü maliyeti verir", () => {
    const p = parca({ maliyet: 10 });
    expect(p.maliyetGecmisi).toBeUndefined();
    for (const t of ["2020-01-01", "2026-01-15", "2026-10-20", undefined]) expect(parcaMaliyetKurus(p, t)).toBe(1000);
    expect(maliyetGecmisiYaz(null, 1000, { tarih: BUGUN, bugun: BUGUN })).toEqual({ gecmis: [], hata: null }); // yeni parça
  });
  it("AC-2 / AC-3 / AC-4: 10 TL → 2026-02-01'den 15 TL; tarihli ve tarihsiz okuma", () => {
    const { kayit } = yaz(parca({ maliyet: 10 }), parca({ maliyet: 15 }), { tarih: "2026-02-01" });
    expect(kayit.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1500 }]);
    expect(parcaMaliyetKurus(kayit, "2026-01-15")).toBe(1000);
    expect(parcaMaliyetKurus(kayit, "2026-02-01")).toBe(1500);
    expect(parcaMaliyetKurus(kayit, "2026-02-28")).toBe(1500);
    expect(parcaMaliyetKurus(kayit)).toBe(1500);
    // AC-4: tarihsiz çağıranlar (liste hücresi, sayaç, dışa aktarma) bugünkü değeri gösterir.
    expect(parcaMaliyetMetni(kayit)).toBe("15,00 ₺");
    expect(maliyetGirildiMi(kayit)).toBe(true);
    expect(parcaDisaAktarmaSatiri(kayit)[9]).toBe(15);
  });
  it("AC-5: kırılımlı parçada geçmişe yazılan değer kırılımın TOPLAMIDIR; kırılım değişince o toplamla yeni kayıt", () => {
    const eski = parca({ maliyet: 99, hammaddeler: [{ tedarikciId: 31, tutar: 170 }, { tedarikciId: 32, tutar: 30 }] });
    const yeni = parca({ hammaddeler: [{ tedarikciId: 31, tutar: 180 }, { tedarikciId: 32, tutar: 30 }] });
    const { kayit } = yaz(eski, yeni, { tarih: "2026-03-01" });
    expect(kayit.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 20000 }, { gecerli: "2026-03-01", kurus: 21000 }]);
  });
  it("AC-6: çözülmüş maliyeti değişmeyen kayıt geçmişe yazmaz (iki kez kaydetmek geçmişi büyütmez)", () => {
    const { kayit } = yaz(parca({ maliyet: 10 }), parca({ maliyet: 15 }), { tarih: "2026-02-01" });
    const ikinci = yaz(kayit, { ...kayit, kod: "R1" }, { tarih: BUGUN }).kayit;
    expect(ikinci.maliyetGecmisi).toEqual(kayit.maliyetGecmisi);
    expect(yaz(parca({ maliyet: 10 }), parca({ maliyet: 10 }), { tarih: BUGUN }).kayit.maliyetGecmisi).toBeUndefined();
  });
  it("AC-7: son kaydın tarihine eşit tarihle değişiklik yeni kayıt eklemez, tutarı günceller", () => {
    const k1 = yaz(parca({ maliyet: 10 }), parca({ maliyet: 15 }), { tarih: "2026-02-01" }).kayit;
    const k2 = yaz(k1, { ...k1, maliyet: 16 }, { tarih: "2026-02-01" }).kayit;
    expect(k2.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1600 }]);
  });
  it("AC-8: rastgele bir düzenleme dizisinde her adımdan sonra bugünkü değer = son kayıt ve bugünün tarihli okuması = tarihsiz okuma", () => {
    let k = parca({ maliyet: 10 });
    const adimlar = [[12, "2026-01-05"], [12, "2026-01-05"], [null, "2026-02-01"], [14, "2026-02-01"], [14, "2026-03-10"], [9, "2026-04-01"], [9.5, "2026-04-01"], [20, BUGUN]];
    for (const [m, t] of adimlar) {
      const r = yaz(k, { ...k, maliyet: m == null ? undefined : m }, { tarih: t });
      expect(r.hata).toBeUndefined();
      k = r.kayit;
      const g = k.maliyetGecmisi || [];
      if (g.length) expect(g[g.length - 1].kurus).toBe(parcaMaliyetKurus(k));
      expect(parcaMaliyetKurus(k, BUGUN)).toBe(parcaMaliyetKurus(k));
      const tarihler = g.map(x => x.gecerli);
      expect([...tarihler].sort()).toEqual(tarihler); // eskiden yeniye sıralı
    }
  });
  it("AC-36: alan ve satır şekli: { gecerli, kurus }, kimliksiz, eskiden yeniye, ilk kayıt \"\", kuruş tamsayı", () => {
    const k = yaz(parca({ maliyet: 10.25 }), parca({ maliyet: 15.5 }), { tarih: "2026-02-01" }).kayit;
    expect(k.maliyetGecmisi.every(x => Object.keys(x).sort().join() === "gecerli,kurus" && Number.isInteger(x.kurus))).toBe(true);
    expect(k.maliyetGecmisi[0].gecerli).toBe("");
  });
  it("AC-38: boş ya da biçimsiz sorgu tarihi bugünkü maliyeti verir, en eski kaydı değil", () => {
    const p = parca({ maliyet: 15, maliyetGecmisi: V.RULMAN_GECMISI });
    for (const t of ["", "2026-13-40", "15.01.2026", null, 20260115]) expect(parcaMaliyetKurus(p, t)).toBe(1500);
  });
  it("R3/2 (plan P5): sorgu son kaydın aralığındaysa saklı kuruş değil bugünkü değer okunur; yazıcı son kaydı eşitler", () => {
    // Güncellenmemiş istemci maliyeti 18'e çekmiş ama geçmişe yazmamış.
    const p = parca({ maliyet: 18, maliyetGecmisi: V.RULMAN_GECMISI });
    expect(parcaMaliyetKurus(p, "2026-03-01")).toBe(1800);
    expect(parcaMaliyetKurus(p, "2026-01-15")).toBe(1000);
    const k = yaz(p, { ...p, maliyet: 20 }, { tarih: "2026-05-01" }).kayit;
    expect(k.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1800 }, { gecerli: "2026-05-01", kurus: 2000 }]);
  });
  it("AC-39: girilmiş maliyet boşaltılınca null kaydı; sonrası eksik, listede \"girilmedi\"", () => {
    const k = yaz(parca({ maliyet: 10 }), parca({}), { tarih: "2026-03-01" }).kayit;
    expect(k.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-03-01", kurus: null }]);
    expect(parcaMaliyetKurus(k, "2026-02-01")).toBe(1000);
    expect(parcaMaliyetKurus(k, "2026-04-01")).toBeNull();
    expect(parcaMaliyetiVar(k, "2026-04-01")).toBe(false);
    const m = modelMaliyeti({ model: "X", defaultParcalar: [{ partId: "1", miktar: 1 }] }, new Map([["1", k]]), 0, "2026-04-01");
    expect(m.kit[0]).toMatchObject({ eksik: true, neden: "maliyetYok" });
    expect(maliyetGecmisiSatirlari(k)[0].tutarMetni).toBe(GIRILMEDI_IBARESI);
    // Dolu geçmişte yeniden girilen değer yazılır (R21/2'nin karşı yönü).
    expect(yaz(k, { ...k, maliyet: 12 }, { tarih: "2026-05-01" }).kayit.maliyetGecmisi.at(-1)).toEqual({ gecerli: "2026-05-01", kurus: 1200 });
  });
  it("R21/2 (plan P1): geçmişi boş parçada ilk giriş (girilmedi → değer) kayıt yazmaz", () => {
    expect(yaz(parca({}), parca({ maliyet: 12 }), { tarih: BUGUN }).kayit.maliyetGecmisi).toBeUndefined();
  });
  it("AC-43: liste en yeni üstte, tutar maliyetMetniKurus ile, ilk kayıt \"başlangıçtan beri\" sabitinden", () => {
    const s = maliyetGecmisiSatirlari(parca({ maliyet: 15, maliyetGecmisi: V.RULMAN_GECMISI }));
    expect(s).toEqual([
      { gecerli: "2026-02-01", tarihMetni: "01.02.2026", tutarMetni: maliyetMetniKurus(1500) },
      { gecerli: "", tarihMetni: BASLANGICTAN_BERI, tutarMetni: maliyetMetniKurus(1000) },
    ]);
    expect(maliyetGecmisiSatirlari(parca({ maliyet: 15 }))).toEqual([]);
  });
});

describe("Spec 0097: tarih doğrulaması ve düzeltme (R6, R6/3, R7, R7/2)", () => {
  const ikiKayit = () => yaz(parca({ maliyet: 10 }), parca({ maliyet: 15 }), { tarih: "2026-05-01" }).kayit;
  it("AC-12: gelecek tarih reddedilir ve geçmiş değişmez", () => {
    const r = yaz(ikiKayit(), { ...ikiKayit(), maliyet: 20 }, { tarih: "2026-06-16" });
    expect(r.hata).toBe(TARIH_GELECEK_HATASI);
  });
  it("AC-14: biçimsiz ve takvimde olmayan tarih reddedilir", () => {
    for (const t of ["", "2026-02-30", "2026-2-1", "01.02.2026"]) expect(gecerlilikTarihiDogrula(t, BUGUN)).toBe(TARIH_GECERSIZ_HATASI);
  });
  it("AC-13 / R6/3 (plan P2): tutar değişirken sınır SON kayıt; tek kayıtlı (boş tarihli) geçmişte her geçmiş tarih geçer", () => {
    const k = ikiKayit();
    expect(yaz(k, { ...k, maliyet: 20 }, { tarih: "2026-04-30" }).hata).toBe(tarihOnceHatasi("2026-05-01"));
    expect(yaz(k, { ...k, maliyet: 20 }, { tarih: "2026-05-02" }).kayit.maliyetGecmisi).toHaveLength(3);
    // İlk değişiklik: eski değer "başlangıçtan beri" olur, her geçmiş tarih kabul edilir.
    expect(yaz(parca({ maliyet: 10 }), parca({ maliyet: 15 }), { tarih: "2000-01-01" }).kayit.maliyetGecmisi[1].gecerli).toBe("2000-01-01");
  });
  it("AC-11 / R7/2 (plan P3): tutar değişmiyor ve tarih alanına dokunulmadıysa tarih yok sayılır", () => {
    const k = ikiKayit();
    expect(yaz(k, { ...k }, { tarih: BUGUN, tarihElle: false }).kayit.maliyetGecmisi).toEqual(k.maliyetGecmisi);
  });
  it("AC-15 / AC-42: tutar aynı, tarih değişti: son kaydın tarihi düzeltilir (geriye de), yeni kayıt yok; sınır sondan bir önceki kayıt", () => {
    const uc = yaz(ikiKayit(), { ...ikiKayit(), maliyet: 20 }, { tarih: "2026-06-01" }).kayit; // "", 05-01, 06-01
    const geri = yaz(uc, { ...uc }, { tarih: "2026-05-15", tarihElle: true }).kayit;
    expect(geri.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-05-01", kurus: 1500 }, { gecerli: "2026-05-15", kurus: 2000 }]);
    expect(yaz(uc, { ...uc }, { tarih: "2026-04-01", tarihElle: true }).hata).toBe(tarihSonraHatasi("2026-05-01"));
    // Triyaj bulgu 1: sondan bir önceki kayıtla AYNI gün de reddedilir (aynı güne ikinci kayıt, aradaki kayıt okunamaz olurdu).
    expect(yaz(uc, { ...uc }, { tarih: "2026-05-01", tarihElle: true }).hata).toBe(tarihSonraHatasi("2026-05-01"));
    const triyaj = parca({ maliyet: 20, maliyetGecmisi: [{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1500 }, { gecerli: "2026-05-01", kurus: 2000 }] });
    const r = yaz(triyaj, { ...triyaj }, { tarih: "2026-02-01", tarihElle: true });
    expect(r.hata).toBe(tarihSonraHatasi("2026-02-01"));
    expect(r.kayit.maliyetGecmisi).toEqual(triyaj.maliyetGecmisi);
    // Tutar değişirken son kayıtla aynı gün üzerine yazmadır (AC-7), hata değil: bu dala dokunulmadı.
    expect(yaz(uc, { ...uc, maliyet: 21 }, { tarih: "2026-06-01" }).kayit.maliyetGecmisi.at(-1)).toEqual({ gecerli: "2026-06-01", kurus: 2100 });
    // İki kayıtlı geçmişte sondan bir önceki boş tarihtir: her geçmiş tarih düzeltme olarak geçer.
    expect(yaz(ikiKayit(), { ...ikiKayit() }, { tarih: "2026-02-01", tarihElle: true }).kayit.maliyetGecmisi[1]).toEqual({ gecerli: "2026-02-01", kurus: 1500 });
    // Geçmiş boşken düzeltilecek kayıt yok: yok sayılır.
    expect(yaz(parca({ maliyet: 10 }), parca({ maliyet: 10 }), { tarih: "2026-02-01", tarihElle: true }).kayit.maliyetGecmisi).toBeUndefined();
  });
  it("Triyaj bulgu 3: tutar değişmiyorsa boşaltılmış tarih alanı yok sayılır (maliyetle ilgisiz düzenleme engellenmez)", () => {
    const k = ikiKayit();
    const r = yaz(k, { ...k, kod: "R9" }, { tarih: "", tarihElle: true });
    expect(r.hata).toBeUndefined();
    expect(r.kayit.maliyetGecmisi).toEqual(k.maliyetGecmisi);
    // Tutar değişiyorsa boş tarih yine reddedilir.
    expect(yaz(k, { ...k, maliyet: 30 }, { tarih: "", tarihElle: true }).hata).toBe(TARIH_GECERSIZ_HATASI);
  });
  it("Triyaj bulgu 4 / C13: kayıt fonksiyonunun geçmiş adımı karar hata dönerse null verir (kayıt hiç değişmez)", () => {
    const k = ikiKayit();
    expect(gecmisliKayit({ ...k, maliyet: 30 }, k, { tarih: "2026-04-01", bugun: BUGUN })).toBeNull();
    expect(gecmisliKayit({ ...k, maliyet: 30 }, k, { tarih: "2026-06-01", bugun: BUGUN }).maliyetGecmisi.at(-1)).toEqual({ gecerli: "2026-06-01", kurus: 3000 });
    // Eklemede (eski yok) geçmiş yazılmaz.
    expect("maliyetGecmisi" in gecmisliKayit(parca({ maliyet: 5 }), null, null)).toBe(false);
    expect(kod("src/components/PartManager.jsx")).toMatch(/gecmisliKayit\(hazirlaTemel\(kayit\), eski, ek\) \?\? eski/);
  });
  it("AC-41: karar motoru bugünü parametre olarak alır, verilmezse hata verir (saati kendisi okumaz)", () => {
    expect(() => maliyetGecmisiYaz(parca({ maliyet: 1 }), 200, { tarih: "2026-01-01" })).toThrow(/bugun/);
  });
});

// ── Parti hesabı ─────────────────────────────────────────────────────────────────────────────────────────────────────
const hesapla = (id, { veri = {}, katalog = {}, modelOrtusu = null } = {}) => {
  const v = V.veri(veri);
  const kat = V.katalog(katalog);
  const pay = genelGiderPayi(v, V.AYAR, BUGUN);
  let modeller = modelMaliyetleri(kat, pay.payK);
  if (modelOrtusu) modeller = modeller.map(modelOrtusu);
  const partiPay = partiGenelPaylari(v, BUGUN).partiler.find(x => x.id === id);
  const parti = v.uretimPartileri.find(p => p.id === id);
  return { h: partiHesabi(parti, v, { payK: pay.payK, modeller, rates: {}, bugun: BUGUN, katalog: kat, partiPay }), pay, partiPay };
};
const satir = (h, anahtar) => h.satirlar.find(r => r.anahtar === anahtar);
// Rulman 2026-05-01'den 20 TL (zam sonrası bugün): kapanmış partinin rakamı değişmemeli.
const ZAM = { parts: [{ ...V.PARCALAR[0], maliyet: 20, maliyetGecmisi: [...V.RULMAN_GECMISI, { gecerli: "2026-05-01", kurus: 2000 }] }, V.PARCALAR[1]] };

describe("Spec 0097: tarihli direkt maliyet ve satırlar (R9–R12/6)", () => {
  it("AC-18: Ocak makinası 10 TL'den, Şubat makinası 15 TL'den; parti açık olsa da aynı", () => {
    for (const bitisAy of ["2026-03", null]) {
      const { h } = hesapla(1, { veri: { uretimPartileri: V.PARTILER.map(p => (p.id === 1 ? { ...p, bitisAy } : p)) } });
      expect(satir(h, "AK100#1")).toMatchObject({ direktK: 2600, adet: 2 });
      expect(satir(h, "AK100#2")).toMatchObject({ direktK: 3600, adet: 1 });
    }
  });
  it("AC-19 / AC-20 / AC-50 / AC-51: iki maliyet grubu iki satır, ay aralığı ve adetle; aynı maliyet tek satır; anahtarlar farklı", () => {
    const { h } = hesapla(1);
    const ak = h.satirlar.filter(r => r.model === "AK100");
    expect(ak.map(r => r.anahtar)).toEqual(["AK100#1", "AK100#2", "AK100#3"]);
    expect(ak.map(r => [r.adet, r.turetilenAdet, ayAraligiMetni(r.ayAraligi)])).toEqual([[2, 2, "01.2026"], [1, 1, "02.2026"], [1, 1, ""]]);
    expect(new Set(h.satirlar.map(r => r.anahtar)).size).toBe(h.satirlar.length);
    expect(h.ozet.toplamStandartK).toBe(h.satirlar.reduce((a, r) => a + r.toplamMaliyetK, 0));
    // Tek gruplu model yalın adla.
    expect(hesapla(2).h.satirlar.map(r => r.anahtar)).toEqual(["AK100", "OZ"]);
  });
  it("AC-21: tarihsiz makina bugünkü maliyetle, kendi satırında (Şubat grubuyla aynı rakam olsa da), ay aralığı yok", () => {
    const { h } = hesapla(1);
    expect(satir(h, "AK100#3")).toMatchObject({ tarihsiz: true, ayAraligi: null, direktK: 3600, adet: 1 });
    expect(satir(h, "AK100#2").direktK).toBe(3600);
    // Zamdan sonra tarihsiz makina bugünkü (20 TL) maliyete geçer, Ocak'ın 10 TL'sine değil (R2/4, AC-38).
    expect(satir(hesapla(1, { katalog: ZAM }).h, "AK100#3").direktK).toBe(4600);
  });
  it("AC-22: kapanmış partinin planlanan adedi bitiş ayının son günündeki, açık partininki bugünkü maliyetle", () => {
    expect(satir(hesapla(1, { katalog: ZAM }).h, "OZ")).toMatchObject({ planlanan: true, direktK: 1500, adet: 3, ayAraligi: null });
    expect(satir(hesapla(2, { katalog: ZAM }).h, "OZ")).toMatchObject({ planlanan: true, direktK: 2000 });
  });
  it("AC-23 / R14/2 (plan P6): önerilen fiyat satırın maliyetinden ve bugünkü katsayıdan; ciro satır toplamından", () => {
    const { h } = hesapla(1, { modelOrtusu: m => (m.model === "AK100" ? { ...m, katsayi: 2 } : m) });
    const r = satir(h, "AK100#1");
    expect(r.oneriK).toBe(Math.round(r.toplamK * 2));
    expect(r.oneriCiroK).toBe(Math.round(r.toplamMaliyetK * 2));
  });
  it("AC-24 / AC-48 / R9/5: satılmış makinanın standart maliyeti kendi gününün direkt + kendi payı; zam eski partinin kârını değiştirmez", () => {
    const once = hesapla(1).h.ozet;
    expect(once.satilmisStandartK).toBe(3600 + 150000);
    expect(once.gercegeGoreKarK).toBe(1000000 - 153600);
    expect(hesapla(1, { katalog: ZAM }).h.ozet.gercegeGoreKarK).toBe(once.gercegeGoreKarK);
    // Tedarik karşılaştırmasının standart direkt maliyeti satırların tarihli direktinden: 2×2600 + 3600 + 3600 + 3×1500.
    expect(hesapla(1).h.tedarik.standartDirektK).toBe(16900);
  });
  it("AC-44 / C7: çöpteki parça tarihli okumada da eksiktir", () => {
    const { h } = hesapla(1, { katalog: { parts: [V.PARCALAR[0], { ...V.PARCALAR[1], deletedAt: "2026-05-01T00:00:00.000Z" }] } });
    expect(satir(h, "AK100#1")).toMatchObject({ eksikSayisi: 1, direktK: 2000 });
  });
  it("R12/6 (plan P9): aynı direkt maliyet ama farklı eksik sayısı ayrı satırdır", () => {
    // Vida Şubat'tan önce girilmemiş (eksik). Ocak: 2 × 13 TL + eksik Vida = 26 TL; Şubat sonrası: 2 × 10 + 3 × 2 = 26 TL. Aynı direkt, farklı eksik.
    const parts = [{ ...V.PARCALAR[0], maliyet: 10, maliyetGecmisi: [{ gecerli: "", kurus: 1300 }, { gecerli: "2026-02-01", kurus: 1000 }] },
      { ...V.PARCALAR[1], maliyet: 2, maliyetGecmisi: [{ gecerli: "", kurus: null }, { gecerli: "2026-02-01", kurus: 200 }] }];
    const { h } = hesapla(1, { katalog: { parts } });
    expect(satir(h, "AK100#1")).toMatchObject({ direktK: 2600, eksikSayisi: 1 });
    expect(satir(h, "AK100#2")).toMatchObject({ direktK: 2600, eksikSayisi: 0 });
  });
  it("Triyaj bulgu 5 (bilinçli): maliyeti eski değerine dönen makinalar (10 → 15 → 10) tek satırda; ay aralığı aradaki dönemi de kapsar", () => {
    const parts = [{ ...V.PARCALAR[0], maliyet: 10, maliyetGecmisi: [{ gecerli: "", kurus: 1000 }, { gecerli: "2026-02-01", kurus: 1500 }, { gecerli: "2026-03-01", kurus: 1000 }] }, V.PARCALAR[1]];
    const stock = [...V.STOCK.filter(s => s.partiId !== 1), { id: 21, model: "AK100", serialNo: "A", partiId: 1, uretimTarihi: "2026-01-10" },
      { id: 22, model: "AK100", serialNo: "B", partiId: 1, uretimTarihi: "2026-02-10" }, { id: 23, model: "AK100", serialNo: "C", partiId: 1, uretimTarihi: "2026-03-10" }];
    const { h } = hesapla(1, { katalog: { parts }, veri: { stock, customers: [] } });
    const ak = h.satirlar.filter(r => r.model === "AK100");
    expect(ak.map(r => [r.direktK, r.adet, ayAraligiMetni(r.ayAraligi)])).toEqual([[2600, 2, "01.2026 – 03.2026"], [3600, 1, "02.2026"]]);
  });
  it("AC-46: `modeller` bugünkü liste: planlanan açık satır onun direktini, tarihli satır katalogun tarihli hesabını okur", () => {
    const { h } = hesapla(2, { modelOrtusu: m => ({ ...m, direktK: m.direktK + 7 }) });
    expect(satir(h, "OZ").direktK).toBe(1500 + 7);
    expect(satir(h, "AK100").direktK).toBe(3600);
  });
  it("AC-49 / AC-51: planlanan adedi olan model tek satır; makinası olsa da bölünmez, turetilenAdet bugünkü anlamıyla", () => {
    const stock = [...V.STOCK, { id: 6, model: "OZ", serialNo: "O6", partiId: 1, uretimTarihi: "2026-01-05" }];
    const { h } = hesapla(1, { veri: { stock } });
    expect(h.satirlar.filter(r => r.model === "OZ")).toEqual([expect.objectContaining({ anahtar: "OZ", planlanan: true, adet: 3, turetilenAdet: 1 })]);
  });
  it("AC-47 / R9/4: stoğa dönen makina ham müşteri dizisiyle gerçek tarihe çözülür ve tarihsiz dala düşmez", () => {
    const stock = [...V.STOCK, { id: 7, model: "AK100", serialNo: "D7", partiId: 1, note: GERI_DONEN_STOK_NOTU }];
    const cop = { id: 12, name: "Silinen", model: "AK100", serialNo: "D7", uretimTarihi: "2026-01-12", deletedAt: "2026-04-01T00:00:00.000Z" };
    const ham = hesapla(1, { veri: { stock, customers: [...V.CUSTOMERS, cop] } }).h;
    expect(satir(ham, "AK100#1").adet).toBe(3); // Ocak grubuna katıldı
    const canli = hesapla(1, { veri: { stock } }).h;
    expect(satir(canli, "AK100#3").adet).toBe(2); // canlı diziyle tarihsiz kalırdı
  });
});

describe("Spec 0097: genel gider payı (R16–R18/2)", () => {
  it("AC-26: türetilen satırın birim payı Üretim Partileri'nin makina başı payıdır", () => {
    const { h, partiPay } = hesapla(1);
    expect(partiPay.makinaBasiK).toBe(150000);
    for (const r of h.satirlar.filter(x => !x.planlanan)) expect(r.payK).toBe(partiPay.makinaBasiK);
  });
  it("AC-27: satırın pay toplamı makina paylarının toplamı; türetilen satırların toplamı makinaPaylari toplamına eşit (artık kuruş kaybolmaz)", () => {
    const { h, partiPay } = hesapla(1);
    const r = satir(h, "AK100#1");
    expect(r.payToplamK).toBe(300001); // artık kuruş ilk Ocak makinasında
    expect(r.payK * r.adet).toBe(300000); // birim × adet toplamla eşit olmak zorunda değil (R16/3)
    expect(r.toplamMaliyetK).toBe(2600 * 2 + 300001);
    const turetilen = h.satirlar.filter(x => !x.planlanan).reduce((a, x) => a + x.payToplamK, 0);
    expect(turetilen).toBe(partiPay.makinaPaylari.reduce((a, x) => a + x.payK, 0));
    expect(turetilen).toBe(partiPay.havuzK);
  });
  it("AC-27/2: planlanan modelin ve modeli bulunamayan makinanın payı satırların dışında; fark görünür nedenlerle", () => {
    const stock = [...V.STOCK, { id: 6, model: "OZ", serialNo: "O6", partiId: 1, uretimTarihi: "2026-01-05" }, { id: 8, model: "SILINEN", serialNo: "X8", partiId: 1, uretimTarihi: "2026-01-06" }];
    const { h, partiPay } = hesapla(1, { veri: { stock } });
    const turetilen = h.satirlar.filter(x => !x.planlanan).reduce((a, x) => a + x.payToplamK, 0);
    expect(turetilen).toBeLessThan(partiPay.havuzK);
    expect(h.bulunamayan).toEqual([{ model: "SILINEN", adet: 1, planlanan: false }]);
    expect(satir(h, "OZ").planlanan).toBe(true);
  });
  it("AC-28 / R18/2: başlamamış partide türetilen satırın payı yazılmaz (toplamda sıfır), neden tek bilgi", () => {
    const { h } = hesapla(3);
    expect(satir(h, "AK100")).toMatchObject({ payK: null, payToplamK: 0, toplamK: 3600, toplamMaliyetK: 3600 });
    expect(h.payDurumu).toEqual({ durum: "baslamadi", neden: PARTI_NEDEN.baslamadi });
  });
  it("AC-29 / R17 / R17/2: planlanan satırın payı açık partide hesap ayarlarından (başlamamışta da), kapanmışta partinin makina başı payından", () => {
    expect(hesapla(2).pay.payK).toBe(65000);
    expect(satir(hesapla(2).h, "OZ")).toMatchObject({ payK: 65000, payKaynak: PAY_KAYNAK.AYARLAR, payToplamK: 130000 });
    expect(satir(hesapla(3).h, "OZ")).toMatchObject({ payK: 65000, payKaynak: PAY_KAYNAK.AYARLAR });
    expect(satir(hesapla(1).h, "OZ")).toMatchObject({ payK: 150000, payKaynak: PAY_KAYNAK.PARTI });
  });
  it("R18/2 (plan P8): kapanmış ama makinası olmayan partide planlanan satırın payı yok", () => {
    const uretimPartileri = [...V.PARTILER, { id: 4, ad: "Boş", baslangicAy: "2026-02", bitisAy: "2026-02", planlananAdetler: { OZ: 2 } }];
    const r = satir(hesapla(4, { veri: { uretimPartileri } }).h, "OZ");
    expect(r).toMatchObject({ payK: null, payKaynak: PAY_KAYNAK.PARTI, payToplamK: 0, payNeden: PARTI_NEDEN.makinaYok });
  });
  it("Triyaj bulgu 2: kapanmış partide durum \"rol yok\" ya da \"yürürlük öncesi\" ise planlanan satırın payı da yazılmaz, nedeni taşır", () => {
    const rolYok = hesapla(1, { veri: { giderTurleri: V.TURLER.map(t => ({ ...t, maliyetRolu: "yok" })) } });
    expect(rolYok.partiPay.durum).toBe("rolYok");
    expect(satir(rolYok.h, "OZ")).toMatchObject({ payK: null, payNeden: PARTI_NEDEN.rolYok, payToplamK: 0, toplamMaliyetK: 3 * 1500 });
    const yururluk = hesapla(1, { veri: { yururlukAy: "2026-04" } });
    expect(yururluk.partiPay.durum).toBe("yururlukOncesi");
    expect(satir(yururluk.h, "OZ")).toMatchObject({ payK: null, payNeden: PARTI_NEDEN.yururlukOncesi });
    // Açık partide planlanan satır hesap ayarlarının payını almaya devam eder (R17/2), neden taşımaz.
    expect(satir(hesapla(2).h, "OZ")).toMatchObject({ payK: 65000, payNeden: null });
  });
});

describe("Spec 0097: içe aktarma (R20, R20/2)", () => {
  const mevcut = [parca({ id: 1, ad: "Rulman", maliyet: 10 }), parca({ id: 2, ad: "Vida", maliyet: 2 })];
  const satirlar = (maliyet) => [PARCA_AKTARMA_BASLIKLARI, ["Rulman", "", "", "", "", "", "", "", "", maliyet], ["Vida", "", "", "", "", "", "", "", "", "2"]];
  it("AC-32: değişen maliyet içe aktarma gününden geçerli; değer değişmeyen satırda geçmiş alanı hiç yok", () => {
    const r = parcaSatirlariniCoz(satirlar("15"), mevcut, 100, "2026-10-20");
    expect(r.parts.find(p => p.ad === "Rulman").maliyetGecmisi).toEqual([{ gecerli: "", kurus: 1000 }, { gecerli: "2026-10-20", kurus: 1500 }]);
    expect("maliyetGecmisi" in r.parts.find(p => p.ad === "Vida")).toBe(false);
    const uygulanan = parcaIceAktarmaUygula(mevcut, r.parts);
    expect(uygulanan.find(p => p.ad === "Rulman").maliyetGecmisi).toHaveLength(2);
    // Değişmeyen satırda var olan geçmiş uygulama kolunda korunur.
    const gecmisli = [{ ...mevcut[0], maliyet: 15, maliyetGecmisi: V.RULMAN_GECMISI }, mevcut[1]];
    const ayni = parcaSatirlariniCoz(satirlar("15"), gecmisli, 100, "2026-10-20");
    expect(parcaIceAktarmaUygula(gecmisli, ayni.parts).find(p => p.ad === "Rulman").maliyetGecmisi).toEqual(V.RULMAN_GECMISI);
  });
  it("AC-54 / R20/2 (plan P11): bugun parametresi zorunlu; modül saat okumaz", () => {
    expect(() => parcaSatirlariniCoz(satirlar("15"), mevcut, 100)).toThrow(/bugun/);
  });
});

describe("Spec 0097: birleştirme sınırı (C6, AC-35)", () => {
  it("AC-35: var olan parçanın geçmiş düzenlemesi birleştirmede geri uygulanmaz (yalnız eklemeler); yeni remap yok", () => {
    const yerel = { parts: [{ id: 7, ad: "Rulman", maliyet: 15, maliyetGecmisi: V.RULMAN_GECMISI }] };
    const sunucu = { parts: [{ id: 7, ad: "Rulman", maliyet: 10 }] };
    const plan = buildMergePlan(yerel, sunucu);
    expect((plan.adds.parts || []).length).toBe(0);
    expect(readFileSync("src/lib/merge.js", "utf8")).not.toMatch(/maliyetGecmisi/);
  });
});

// ── Kaynak taramaları ────────────────────────────────────────────────────────────────────────────────────────────────
const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? (p === "src/lib/map" ? [] : tara(p)) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const say = (desen, kokler = ["src"]) => Object.fromEntries(kokler.flatMap(tara).map(f => [f, kod(f).split("\n").filter(l => desen.test(l)).length]).filter(([, n]) => n > 0));

describe("Spec 0097: kaynak taramaları", () => {
  it("R4 / AC-54: karar motorunun iki çağıranı var (parça kartı, içe aktarma); geçmiş alanını yazan başka yer yok", () => {
    // Tanım satırı `= (` ile eşleşmez; urunAgaci'ndeki tek çağrı kayıt fonksiyonunun geçmiş adımı `gecmisliKayit` (triyaj bulgu 4).
    expect(Object.keys(say(/maliyetGecmisiYaz\(/))).toEqual(["src/components/PartManager.jsx", "src/lib/parcaAktarma.js", "src/lib/urunAgaci.js"]);
    expect(kod("src/lib/urunAgaci.js").match(/maliyetGecmisiYaz\(/g)).toHaveLength(1);
    expect(Object.keys(say(/maliyetGecmisi/, ["src", "electron"])).sort()).toEqual(["electron/db.cjs", "src/components/PartManager.jsx", "src/lib/parcaAktarma.js", "src/lib/urunAgaci.js"]);
    expect(kod("src/lib/parcaAktarma.js")).not.toMatch(/gecerli:|kurus:/);
  });
  it("AC-37 / C1: geçmişin kuruşu TL alanıyla toplanmaz; tarihli okuma ikinci bir çözücüye kopyalanmadı", () => {
    for (const [f] of Object.entries(say(/maliyetGecmisi/))) expect(kod(f)).not.toMatch(/maliyetGecmisi[^\n]*\.maliyet\b|\.maliyet\b[^\n]*maliyetGecmisi/);
    expect(Object.keys(say(/\.gecerli\s*<=/))).toEqual(["src/lib/urunAgaci.js"]);
  });
  it("AC-41 / R5/4: urunAgaci saat okumaz; parça paneli varsayılan günü useBugun'dan alır, today() kullanmaz", () => {
    expect(kod("src/lib/urunAgaci.js")).not.toMatch(/Date\.now|new Date\(\)|yerelBugun|today\(/);
    expect(kod("src/lib/parcaAktarma.js")).not.toMatch(/Date\.now\(\)[^,]|new Date\(\)|yerelBugun|today\(/);
    const pm = kod("src/components/PartManager.jsx");
    expect(pm).toMatch(/const bugun = useBugun\(\);/);
    expect(pm).not.toMatch(/today\(/);
  });
  it("AC-55 / R11/2: kapanmış partinin tek ölçütü partiGenelPaylari'nın `acik` alanı; kapanmaZamani okunmaz", () => {
    const m = kod("src/lib/makinaStandartMaliyet.js");
    expect(m).not.toMatch(/kapanmaZamani/);
    expect(m).toMatch(/const kapanmis = partiPay\?\.acik === false;/);
  });
  it("AC-52 için önkoşul / C12: parti hesabı tarihli maliyeti (model, gün) önbelleğinden okur", () => {
    expect(kod("src/lib/makinaStandartMaliyet.js")).toMatch(/const anahtar = `\$\{k\}\|\$\{gun\}`;/);
  });
  it("AC-34: yeni izin, veri bölümü, sunucu kuralı ve kilit alanı yok (spec 0093'ün tarama fikstürü aynı)", () => {
    const simdi = JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI }));
    expect(simdi).toEqual(JSON.parse(readFileSync("tests/fixtures/0093-tarama-once.json", "utf8")));
    expect(Object.keys(KILIT_ALANLARI).join()).not.toMatch(/gecmis/i);
    expect(kod("electron/serverAuth.cjs")).not.toMatch(/maliyetGecmisi/);
  });
  it("AC-59: ters çevrilen kriterlerin test yorumlarında \"spec 0097 ile\" notu var", () => {
    for (const f of ["tests/gider-kapsami-0092-kiyas.test.js", "tests/ui/makina-maliyeti-0088.test.jsx", "tests/ui/parti-genel-payi-0090-app.test.jsx",
      "tests/ui/plan-adetler-0093.test.jsx", "tests/hammadde-0096.test.js", "tests/makina-standart-maliyet-0088.test.js", "tests/parca-aktarma-0087.test.js", "tests/gider-dagitim-0072.test.js"]) {
      expect(readFileSync(f, "utf8"), f).toMatch(/spec 0097 ile/i);
    }
  });
});
