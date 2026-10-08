// Spec 0076: kısmen indirilebilen gider ve indirilemeyen KDV (binek araç). Motor (src/lib/gider.js) testleri, AC adlı.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  kisitHesabi, kalemGiderTutari, kalemTutari, kalemKdv, kalemIndirilebilirKdv, odenecekTutar, kalemTevkifat, kisitliGiderMi, kisitEtkiliMi,
  kisitOranOf, varsayilanIndirilebilirOran, kisitDogrula, kisitliRozetMetni, giderKalemDogrula, hesaplaGiderRaporu, kovaDagilimi, dagitimPaylari,
  tekrarlayanUret, turHaritasi, canliModelSeti, odemeHedefleri, borcOzeti, KISIT_ORAN_HATASI, KISIT_ORAN_BOS_HATASI, DAVRANIS, HEDEF, kurus,
} from "../src/lib/gider";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { acikKalemler } from "../src/lib/acikKalemler";
import { tedarikciEkstresi } from "../src/lib/kasa";
import { motorCiktilari, GIDERLER } from "./fixtures/0076-veri";

const TURLER = [{ id: 1, ad: "Yakıt", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "SGK", davranis: "sgk" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Akaryakıt A.Ş." }];
const yakit = (o = {}) => ({ id: 1, tarih: "2026-03-10", turId: 1, tutar: 1000, kdvOrani: 20, tedarikciId: 11, kisitliGider: true, indirilebilirOran: 70, ...o });
const bayraksiz = (o = {}) => { const k = yakit(o); delete k.kisitliGider; delete k.indirilebilirOran; return k; };
const K = (x) => Math.round(x * 100);
const oku = (f) => readFileSync(f, "utf-8");
const kod = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
const dosyalar = (d) => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? dosyalar(p) : /\.(js|jsx|cjs|mjs)$/.test(f) ? [p] : []; });

describe("Spec 0076 hesap (R10–R13)", () => {
  it("AC-9: matrah 1.000, KDV %20, oran %70: 200 / 140 / 60 / KKEG 300 + 60 = 360 / gider 1.060 / tedarikçiye 1.200", () => {
    const h = kisitHesabi(yakit(), DAVRANIS.NORMAL);
    expect(h).toMatchObject({ oran: 70, etkili: true, matrahK: K(1000), kdvK: K(200), indirilebilirK: K(140), indirilemeyenK: K(60), kkegMatrahK: K(300), kkegKdvK: K(60), kkegToplamK: K(360), giderK: K(1060) });
    expect(kalemGiderTutari(yakit())).toBe(1060);
    expect(kalemIndirilebilirKdv(yakit())).toBe(140);
    expect(odenecekTutar(yakit())).toBe(1200);
  });
  it("AC-10: yuvarlama gereken oranda parçalar bütüne kuruşu kuruşuna eşit; artık kuruş indirilemeyen ve KKEG tarafında", () => {
    for (const [tutar, kdv, oran] of [[333.33, 18, 70], [1234.57, 20, 88], [0.07, 20, 70], [999.99, 1, 33]]) {
      const h = kisitHesabi(yakit({ tutar, kdvOrani: kdv, indirilebilirOran: oran }));
      expect(h.indirilebilirK + h.indirilemeyenK).toBe(h.kdvK);
      expect(h.matrahK + h.indirilemeyenK).toBe(h.giderK);
      expect(h.kkegMatrahK + Math.round(h.matrahK * oran / 100)).toBe(h.matrahK);
      expect(h.indirilebilirK).toBe(Math.round(h.kdvK * oran / 100)); // beyan edilen tutar yuvarlanır (R12)
      expect(Number.isInteger(h.indirilemeyenK) && Number.isInteger(h.kkegMatrahK)).toBe(true);
    }
    // 333,33 × %18 = 60,00 (kuruş 5999,94 → 6000); %70'i 4200; kalan 1800 indirilemeyen.
    expect(kisitHesabi(yakit({ tutar: 333.33, kdvOrani: 18 }))).toMatchObject({ kdvK: 6000, indirilebilirK: 4200, indirilemeyenK: 1800 });
  });
  it("AC-12: bayraksız kalemde gider tutarı matraha eşit, indirilemeyen KDV ve KKEG sıfır", () => {
    const h = kisitHesabi(bayraksiz());
    expect(h).toMatchObject({ oran: 100, etkili: false, indirilemeyenK: 0, kkegMatrahK: 0, kkegToplamK: 0, giderK: K(1000), indirilebilirK: K(200) });
    expect(kalemGiderTutari(bayraksiz())).toBe(kalemTutari(bayraksiz()));
  });
  it("AC-31: tevkifat ve kısıtlama birlikte: indirilebilir toplam KDV × oran, tevkifat toplam KDV × pay/payda, tedarikçiye matrah + (KDV − tevkifat), maliyete matrah + indirilemeyen", () => {
    const k = yakit({ tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 });
    expect(kalemTevkifat(k)).toBe(100);
    expect(kalemIndirilebilirKdv(k)).toBe(140);
    expect(odenecekTutar(k)).toBe(1100);
    expect(kalemGiderTutari(k)).toBe(1060);
  });
});

describe("Spec 0076 kapı, oran ve doğrulama (R1–R9)", () => {
  it("AC-6: bayrak yalnız normal davranışta; kira, personel ve SGK kaleminde yok sayılır ve doğrulama alanları siler", () => {
    expect([DAVRANIS.NORMAL, DAVRANIS.KIRA, DAVRANIS.PERSONEL, DAVRANIS.SGK].map(kisitliGiderMi)).toEqual([true, false, false, false]);
    const kira = { id: 2, tarih: "2026-03-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 20, kisitliGider: true, indirilebilirOran: 70 };
    expect(kisitEtkiliMi(kira, DAVRANIS.KIRA)).toBe(false);
    expect(kalemGiderTutari(kira, DAVRANIS.KIRA)).toBe(kalemTutari(kira, DAVRANIS.KIRA));
    const r = giderKalemDogrula(kira, { turMap, tedarikciler: TED });
    expect(r.hatalar).toEqual([]);
    expect("kisitliGider" in r.kayit || "indirilebilirOran" in r.kayit).toBe(false);
  });
  it("AC-4: oran 0–100 dışı ve tam sayı olmayan değer reddedilir, nedeni yazılır; kalemde boş oran reddedilir", () => {
    for (const o of ["-1", "101", "70,5", "abc"]) expect(kisitDogrula({ kisitliGider: true, indirilebilirOran: o }, DAVRANIS.NORMAL).hatalar).toEqual([{ alan: "indirilebilirOran", mesaj: KISIT_ORAN_HATASI }]);
    expect(kisitDogrula({ kisitliGider: true, indirilebilirOran: "" }, DAVRANIS.NORMAL).hatalar[0].mesaj).toBe(KISIT_ORAN_BOS_HATASI);
    const r = giderKalemDogrula({ ...yakit(), indirilebilirOran: "150" }, { turMap, tedarikciler: TED });
    expect(r.kayit).toBeNull();
    expect(r.hatalar).toContainEqual({ alan: "indirilebilirOran", mesaj: KISIT_ORAN_HATASI });
  });
  it("AC-5: kutu kapalıyken oran temizlenir ve kayda yazılmaz", () => {
    const r = giderKalemDogrula({ ...yakit(), kisitliGider: false, indirilebilirOran: "70" }, { turMap, tedarikciler: TED });
    expect(r.hatalar).toEqual([]);
    expect("kisitliGider" in r.kayit || "indirilebilirOran" in r.kayit).toBe(false);
    const a = giderKalemDogrula({ ...yakit(), indirilebilirOran: "70" }, { turMap, tedarikciler: TED });
    expect(a.kayit).toMatchObject({ kisitliGider: true, indirilebilirOran: 70 });
  });
  it("AC-7: KDV oranı sıfır olan kısıtlı kalem kaydedilir; KKEG matrahı hesaplanır, KDV bölünmesi sıfır", () => {
    const r = giderKalemDogrula({ ...yakit(), kdvOrani: "0", indirilebilirOran: "70" }, { turMap, tedarikciler: TED });
    expect(r.hatalar).toEqual([]);
    expect(kisitHesabi(r.kayit)).toMatchObject({ kdvK: 0, indirilebilirK: 0, indirilemeyenK: 0, kkegMatrahK: K(300), kkegToplamK: K(300), giderK: K(1000) });
  });
  it("AC-30: KDV dâhil girişte ayırma bugünkü gibi, oran ayırmadan sonra; saklanan tutar KDV hariç matrah", () => {
    const r = giderKalemDogrula({ ...yakit(), tutar: "1200", kdvYonu: "dahil", indirilebilirOran: "70" }, { turMap, tedarikciler: TED });
    expect(r.kayit.tutar).toBe(1000);
    expect(kalemGiderTutari(r.kayit)).toBe(1060);
  });
  it("AC-39: oran 0'da KDV'nin tamamı indirilemez, KKEG bütündür, gider tutarı matrah + tam KDV; oran 100 bayraksıza birebir eşit", () => {
    expect(kisitHesabi(yakit({ indirilebilirOran: 0 }))).toMatchObject({ etkili: true, indirilebilirK: 0, indirilemeyenK: K(200), kkegMatrahK: K(1000), kkegToplamK: K(1200), giderK: K(1200) });
    const y = yakit({ indirilebilirOran: 100 });
    expect(kisitEtkiliMi(y, DAVRANIS.NORMAL)).toBe(false);
    expect(kisitliRozetMetni(y)).toBe("");
    const { oran: _o, ...h100 } = kisitHesabi(y), { oran: _b, ...hB } = kisitHesabi(bayraksiz());
    expect(h100).toEqual(hB);
    const r = hesaplaGiderRaporu({ giderler: [y], turler: TURLER, tedarikciler: TED }, { baslangic: "2026-03-01", bitis: "2026-03-31" });
    expect("kisitli" in r).toBe(false);
  });
  it("AC-40: bayrağı açık ama oranı boş ya da geçersiz (dış veri) kalem %100 sayılır; NaN yok", () => {
    for (const o of [null, undefined, "", "abc", 150, -5, 70.5]) {
      const k = yakit({ indirilebilirOran: o });
      expect(kisitOranOf(k, DAVRANIS.NORMAL)).toBe(100);
      const h = kisitHesabi(k);
      expect(Object.values(h).every(v => typeof v !== "number" || Number.isFinite(v))).toBe(true);
      expect(h).toMatchObject({ indirilemeyenK: 0, kkegToplamK: 0, giderK: K(1000) });
    }
  });
  it("AC-41: ayar yok ya da bozukken varsayılan oran 70; boşaltmak 70'e döner (kısıtlamayı kapatmaz)", () => {
    expect([undefined, null, {}, { indirilebilirOran: "" }, { indirilebilirOran: null }, { indirilebilirOran: "x" }, { indirilebilirOran: 120 }].map(varsayilanIndirilebilirOran)).toEqual([70, 70, 70, 70, 70, 70, 70]);
    expect(varsayilanIndirilebilirOran({ indirilebilirOran: 88 })).toBe(88);
    expect(varsayilanIndirilebilirOran({ indirilebilirOran: 0 })).toBe(0);
  });
  it("AC-11: tek hesap; bileşenlerde oran çarpımı yok, kaynakta ikinci '?? 70' yok, motor ayar okumuyor, ekranlarda kalem bayrağı dalı yok", () => {
    const kaynak = dosyalar("src");
    for (const f of kaynak) {
      const s = kod(f);
      expect(s, f).not.toMatch(/(\?\?|\|\|)\s*70\b/);
      if (f.includes("components")) {
        expect(s, f).not.toMatch(/indirilebilirOran\)?\s*\/\s*100|\*\s*\(?\s*(Number\()?\s*\w*\.?indirilebilirOran/);
        // C1: gösterim ekranları kalem bayrağına dal yazmaz, kararlar motorun kapılarından (kisitEtkiliMi, kisitHesabi). Bayrağı
        // ve varsayılan oranı yalnız iki form, ortak alan bileşeni ve Ayarlar (girişin kendisi) okur.
        if (!/(GiderForm|GiderAlanlari|SettingsGiderTanimlari|SettingsGider)\.jsx$/.test(f)) expect(s, f).not.toMatch(/kisitliGider\b|indirilebilirOran\b/);
      }
    }
    expect(kod("src/lib/gider.js")).not.toMatch(/appSettings/);
    expect(kod("src/lib/gider.js").match(/indirilebilirK = Math\.round/g)).toHaveLength(1);
  });
});

describe("Spec 0076 maliyet tarafı (R14, R15, R18, R23–R25)", () => {
  const rapor = (giderler, o = {}) => hesaplaGiderRaporu({ giderler, turler: TURLER, tedarikciler: TED, canliModeller: canliModelSeti([{ model: "AK100" }], []), ...o }, { baslangic: "2026-03-01", bitis: "2026-03-31" });
  it("AC-13 / AC-14 / AC-23 / AC-26: toplam, tür ve tedarikçi gider tutarını sayar; indirilecek KDV 140; KKEG toplama eklenmez", () => {
    const r = rapor([yakit(), bayraksiz({ id: 2, tutar: 500 })]);
    expect(r.toplam).toBe(1560);
    expect(r.turKirilimi[0].toplam).toBe(1560);
    expect(r.tedarikciKirilimi.satirlar[0].harcama).toBe(1560);
    expect(r.indirilecekKdv).toBe(240);
    expect(r.kisitli).toEqual({ adet: 1, indirilebilirKdv: 140, indirilemeyenKdv: 60, kkegMatrah: 300, kkegKdv: 60, kkegToplam: 360 });
    expect(r.toplam).toBe(1000 + 60 + 500); // KKEG (360) toplama ikinci kez eklenmedi
    expect(r.odenmeyen).toBe(1560);
  });
  it("AC-15: kova gider tutarından; dört atama türünde dört kova = genel toplam; model satırları değişmez, fark ortağa", () => {
    const canli = canliModelSeti([{ model: "AK100" }], []);
    const stock = [{ id: 501, model: "AK100", serialNo: "T1" }];
    const kova = (o) => kovaDagilimi(yakit(o), { davranis: DAVRANIS.NORMAL, stock, canliModeller: canli });
    expect(kova({})).toEqual({ makina: 0, model: 0, dagitma: 0, ortak: 1060 });
    expect(kova({ atamaTur: "makina", makinaTur: "stok", makinaId: 501 })).toEqual({ makina: 1060, model: 0, dagitma: 0, ortak: 0 });
    expect(kova({ atamaTur: "dagitma" })).toEqual({ makina: 0, model: 0, dagitma: 1060, ortak: 0 });
    expect(kova({ atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 200, adet: 3 }] })).toEqual({ makina: 0, model: 600, dagitma: 0, ortak: 460 });
    // Plan Q2: model kovası matrahla sınırlı; matrahı tam dağıtan (ya da aşan eski) satırda indirilemeyen KDV yine ortakta.
    expect(kova({ atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1000, adet: 1 }] })).toEqual({ makina: 0, model: 1000, dagitma: 0, ortak: 60 });
    expect(kova({ atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 1050, adet: 1 }] })).toEqual({ makina: 0, model: 1000, dagitma: 0, ortak: 60 });
    const r = rapor([yakit({ id: 1 }), yakit({ id: 2, atamaTur: "makina", makinaTur: "stok", makinaId: 501 }), yakit({ id: 3, atamaTur: "dagitma" }),
      yakit({ id: 4, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 200, adet: 3 }] })], { stock });
    const { makina, model, dagitma, ortak } = r.kovalar;
    expect(kurus(makina) + kurus(model) + kurus(dagitma) + kurus(ortak)).toBe(kurus(r.toplam));
    expect(r.toplam).toBe(4 * 1060);
  });
  it("R15/2: model dağılımının doğrulama sınırı matrah; uyarı indirilemeyen KDV'nin de ortağa yazıldığını söyler", () => {
    const f = { ...yakit(), indirilebilirOran: "70", atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: "200", adet: "3" }] };
    const r = giderKalemDogrula(f, { turMap, tedarikciler: TED });
    expect(r.uyarilar.map(u => u.mesaj)).toEqual(["Dağıtılmayan 400 ₺ ve indirilemeyen KDV ortak gidere yazılacak."]);
    const asim = giderKalemDogrula({ ...f, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: "1050", adet: "1" }] }, { turMap, tedarikciler: TED });
    expect(asim.kayit).toBeNull(); // sınır gider tutarı (1.060) değil, matrah (1.000)
    const tam = giderKalemDogrula({ ...f, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: "1000", adet: "1" }] }, { turMap, tedarikciler: TED });
    expect(tam.uyarilar.map(u => u.mesaj)).toEqual(["İndirilemeyen KDV ortak gidere yazılacak."]);
    const bayraksizUyari = giderKalemDogrula({ ...f, kisitliGider: false }, { turMap, tedarikciler: TED });
    expect(bayraksizUyari.uyarilar.map(u => u.mesaj)).toEqual(["Dağıtılmayan 400 ₺ ortak gidere yazılacak."]);
  });
  it("AC-17 (motor): 0072 dağıtımı gider tutarının ortak kovasını böler", () => {
    expect(dagitimPaylari(yakit({ dagitimAy: 2 }), DAVRANIS.NORMAL).map(p => p.payK)).toEqual([K(530), K(530)]);
  });
});

describe("Spec 0076 fatura ve ödeme tarafı değişmez (R16, R17)", () => {
  const bugun = "2026-04-15";
  const veri = { turler: TURLER, tedarikciler: TED };
  it("AC-19 / AC-21: ödenecek tam KDV ile 1.200; KDV, stopaj, tevkifat matrahtan; ödeme hedefi aynı", () => {
    expect(odenecekTutar(yakit())).toBe(odenecekTutar(bayraksiz()));
    expect(kalemKdv(yakit())).toBe(200);
    expect(kalemTutari(yakit())).toBe(1000);
    expect(odemeHedefleri(yakit(), DAVRANIS.NORMAL)).toEqual(odemeHedefleri(bayraksiz(), DAVRANIS.NORMAL));
    expect(odemeHedefleri(yakit(), DAVRANIS.NORMAL).find(h => h.hedef === HEDEF.ANA).toplamK).toBe(K(1200));
    const tv = { tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 };
    expect(kalemTevkifat(yakit(tv))).toBe(kalemTevkifat(bayraksiz(tv)));
  });
  it("AC-20: borç özeti, hatırlatıcı, açık kalemler ve tedarikçi ekstresi kısıtlamadan etkilenmez", () => {
    const g = [yakit({ sonOdemeTarihi: "2026-04-10" })], b = [bayraksiz({ sonOdemeTarihi: "2026-04-10" })];
    // Çıktılar kalem nesnesini de taşır; kalemin kendi iki alanı ayıklanınca rakamlar ve satırlar birebir aynı olmalı.
    const ayikla = (x) => JSON.parse(JSON.stringify(x, (key, v) => (key === "kisitliGider" || key === "indirilebilirOran" ? undefined : v)));
    expect(ayikla(borcOzeti(g, veri, bugun))).toEqual(ayikla(borcOzeti(b, veri, bugun)));
    expect(ayikla(odemeHatirlatmalari(g, veri, bugun))).toEqual(ayikla(odemeHatirlatmalari(b, veri, bugun)));
    expect(ayikla(acikKalemler(g, veri, bugun))).toEqual(ayikla(acikKalemler(b, veri, bugun)));
    expect(ayikla(tedarikciEkstresi(11, { giderler: g, turler: TURLER, bugun }))).toEqual(ayikla(tedarikciEkstresi(11, { giderler: b, turler: TURLER, bugun })));
    expect(acikKalemler(g, veri, bugun).toplamK).toBe(K(1200));
    expect(borcOzeti(g, veri, bugun).toplam).toBe(1200);
  });
});

describe("Spec 0076 tekrarlayan tanım (R8/3, R35)", () => {
  const tanim = (o = {}) => ({ id: 70, turId: 1, ad: "Binek yakıt", tutar: 1000, kdvOrani: 20, baslangicAy: "2026-01", uretilenAylar: [], kisitliGider: true, ...o });
  const uret = (t, giderAyarlari = {}, tm = turMap) => tekrarlayanUret([t], [], "2026-03", { turMap: tm, giderAyarlari, uid: () => 900 }).yeniKalemler[0];
  it("AC-34: üretilen kalem somut oran taşır: tanımın oranı, yoksa o anki ayar oranı, ayar da yoksa 70", () => {
    expect(uret(tanim({ indirilebilirOran: 60 }), { indirilebilirOran: 88 })).toMatchObject({ kisitliGider: true, indirilebilirOran: 60 });
    expect(uret(tanim(), { indirilebilirOran: 88 })).toMatchObject({ kisitliGider: true, indirilebilirOran: 88 });
    expect(uret(tanim(), {})).toMatchObject({ kisitliGider: true, indirilebilirOran: 70 });
    const kapali = uret(tanim({ kisitliGider: false }));
    expect("kisitliGider" in kapali || "indirilebilirOran" in kapali).toBe(false);
  });
  it("AC-34: davranışı normal olmayan tanımda kalmış bayrak kaleme taşınmaz", () => {
    const k = uret(tanim({ turId: 4, indirilebilirOran: 70 }));
    expect("kisitliGider" in k).toBe(false);
  });
  it("AC-32 (tanım): tanım boş oranla saklanabilir (doğrulayıcı tanımda boşu serbest bırakır)", () => {
    expect(kisitDogrula({ kisitliGider: true, indirilebilirOran: "" }, DAVRANIS.NORMAL, { oranBosSerbest: true })).toEqual({ hatalar: [], alanlar: { kisitliGider: true } });
  });
});

describe("Spec 0076 göç yok, sıfır fark, sunucu değişmedi (R36–R39, C3, C5)", () => {
  it("AC-35: alanları olmayan eski kalem kısıtsız; db.cjs'te kısıtlama göçü yok", () => {
    expect(kisitHesabi({ id: 1, tutar: 1000, kdvOrani: 20 })).toMatchObject({ oran: 100, indirilebilirK: K(200), giderK: K(1000) });
    expect(oku("electron/db.cjs")).not.toMatch(/kisit\w*Gocu|0076Gocu|meta\.\w*0076/i);
  });
  it("AC-36: bayraksız veri kümesinde dönem raporu, kova, makina maliyeti (iki kaynak), kârlılık, fiyat önerisi ve KDV karşılaştırması bu işten önceki çıktıyla birebir aynı", () => {
    expect(GIDERLER.some(k => "kisitliGider" in k)).toBe(false);
    expect(motorCiktilari()).toEqual(JSON.parse(oku("tests/fixtures/0076-bayraksiz-once.json")));
  });
  it("AC-38: sunucu kuralı, izin ve birleştirme kısıtlama alanlarını tanımıyor", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/permissions.js", "src/components/settings/serverPermissionDefs.js"]) {
      expect(oku(f), f).not.toMatch(/kisitliGider|indirilebilirOran/);
    }
  });
});

// Triyaj (spec 0076 bulgu 3): onaylı planı olan spec "Taslak" durumunda kalmaz; durum satırı revizyonu ve onayı yansıtır.
describe("Spec 0076 belge durumu", () => {
  it("onaylı plan varken spec başlığı Taslak değil, revizyon 2 onayını yazar", () => {
    const yol = ["specs/0076-kisitli-gider-ve-indirilemeyen-kdv.md", "specs/done/0076-kisitli-gider-ve-indirilemeyen-kdv.md"].find(f => { try { statSync(f); return true; } catch { return false; } });
    const durum = oku(yol).split("\n").find(l => l.startsWith("| **Durum** |"));
    expect(durum).not.toMatch(/Taslak/);
    expect(durum).toMatch(/Onaylandı|Tamamlandı/);
    expect(oku(yol.replace(/kisitli-gider-ve-indirilemeyen-kdv/, "uygulama-plani"))).toMatch(/\*\*Onay\*\* \| Takım Yöneticisi/);
  });
});
