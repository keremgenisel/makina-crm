// Spec 0071: KDV dâhil tutar girişi ve tutarı sonra girilen tekrarlayan kalem (motor). Saat dilimi sabit (CI UTC'de koşar).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  kdvAyir, kdvYonuOf, KDV_YONU, giderKalemDogrula, tekrarlayanUret, turHaritasi, kalemTutari, kalemKdv, kalemStopaj, odenecekTutar,
  kiraHesapla, odemeleriUygula, borcOzeti, hesaplaGiderRaporu, standartYeni, standartTutarDegistir, kurus, DAVRANIS, odemeDurumu,
} from "../src/lib/gider";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { acikKalemler } from "../src/lib/acikKalemler";
import { donemYontemKirilimi } from "../src/lib/odemeYontemi";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { extractKDV } from "../src/lib/utils";

const kok = path.join(__dirname, "..");
const kod = (f) => readFileSync(path.join(kok, f), "utf-8").split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Enerjisa" }];
let n = 100;
const uid = () => ++n;
const dogrula = (f) => giderKalemDogrula(f, { turMap, tedarikciler: TED, uid });
const kayit = (f) => { const r = dogrula(f); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const KDV_TABLOSU = [{ from: "2026-01-01", rate: 20 }, { from: "2026-10-01", rate: 10 }];
const ctx = { turMap, calisanlar: [{ id: 7, ad: "Hasan", resmiMaliyet: 30000, eldenMaliyet: 0 }], giderAyarlari: { stopajOrani: 20 }, kdvRates: KDV_TABLOSU, uid };
const AYAR = { turler: TURLER, tedarikciler: TED, yururlukAy: "2026-01" };

describe("spec 0071 A: KDV ayırma tek fonksiyondan (R3, C1)", () => {
  it("AC-4: 1.180,00 ve %20 → tutar 983,33, KDV 196,67, ödenecek 1.180,00; elle 983,33 yazanla birebir aynı kayıt", () => {
    expect(kdvAyir(1180, 20)).toEqual({ tutarK: 98333, kdvK: 19667, farkK: 0 });
    const dahil = kayit({ id: 1, tarih: "2026-09-10", turId: 4, tutar: "1180", kdvOrani: "20", kdvYonu: "dahil", tedarikciId: 12 });
    const haric = kayit({ id: 1, tarih: "2026-09-10", turId: 4, tutar: "983,33", kdvOrani: "20", kdvYonu: "haric", tedarikciId: 12 });
    expect(dahil.tutar).toBe(983.33);
    expect(kalemKdv(dahil)).toBe(196.67);
    expect(odenecekTutar(dahil)).toBe(1180);
    const { kdvYonu: a, ...d } = dahil, { kdvYonu: b, ...h } = haric;
    expect(a).toBe("dahil");
    expect(b).toBe("haric");
    expect(d).toEqual(h);
  });
  it("AC-5: 0,03 ve %20 sınırında fark yazılır; ayırmanın KDV'si motorun KDV'siyle aynı", () => {
    const r = kdvAyir(0.03, 20);
    expect(r).toEqual({ tutarK: 3, kdvK: 1, farkK: -1 });
    const k = kayit({ id: 2, tarih: "2026-09-10", turId: 4, tutar: "0,03", kdvOrani: "20", kdvYonu: "dahil" });
    expect(kurus(kalemKdv(k))).toBe(r.kdvK);
    expect(kurus(odenecekTutar(k))).toBe(4);
  });
  it("AC-3: kaydedilen tutar KDV hariç tutardır (bütün tüketiciler bugünkü anlamla okur)", () => {
    const k = kayit({ id: 3, tarih: "2026-09-10", turId: 4, tutar: "120", kdvOrani: "20", kdvYonu: "dahil" });
    expect(k.tutar).toBe(100);
    expect(kalemTutari(k)).toBe(100);
  });
  it("AC-11 (motor): oran sıfırken iki yön aynı tutarı verir", () => {
    expect(kdvAyir(500, 0)).toEqual({ tutarK: 50000, kdvK: 0, farkK: 0 });
    expect(kayit({ id: 4, tarih: "2026-09-10", turId: 4, tutar: "500", kdvOrani: "0", kdvYonu: "dahil" }).tutar).toBe(500);
  });
  it("AC-43 (motor): kdvYonu alanı olmayan eski kalem hariç sayılır", () => {
    expect(kdvYonuOf({})).toBe(KDV_YONU.HARIC);
    expect(kdvYonuOf({ kdvYonu: null })).toBe(KDV_YONU.HARIC);
    expect(kdvYonuOf({ kdvYonu: "dahil" })).toBe(KDV_YONU.DAHIL);
    expect(kayit({ id: 5, tarih: "2026-09-10", turId: 4, tutar: "100", kdvOrani: "20" }).kdvYonu).toBe("haric");
  });
});

describe("spec 0071 A: kira ve personel (R6, R18)", () => {
  it("AC-13: kira + brüt + KDV dâhil → önce KDV ayrılır, sonra kiraHesapla; ödenecek = girilen − stopaj", () => {
    const k = kayit({ id: 10, tarih: "2026-09-01", turId: 1, girisYonu: "brut", tutar: "24000", stopajOrani: "20", kdvOrani: "20", kdvYonu: "dahil", tedarikciId: 11 });
    expect(k.tutar).toBe(20000);
    expect(k.netTutar).toBe(16000);
    expect(kalemKdv(k, DAVRANIS.KIRA)).toBe(4000);
    expect(kalemStopaj(k, DAVRANIS.KIRA)).toBe(4000);
    expect(odenecekTutar(k, DAVRANIS.KIRA)).toBe(24000 - 4000);
    expect(k.kdvYonu).toBe("dahil");
  });
  it("AC-13 (R6 Q1): net ödenen kira girişinde KDV yönü hariçtir; formdan dâhil gelse bile ayrılmaz", () => {
    const k = kayit({ id: 11, tarih: "2026-09-01", turId: 1, girisYonu: "net", netTutar: "16000", stopajOrani: "20", kdvOrani: "20", kdvYonu: "dahil" });
    expect(k.kdvYonu).toBe("haric");
    expect(k.tutar).toBe(20000);
    expect(k.netTutar).toBe(16000);
  });
  it("AC-12: brüt/net seçimi ve kira özeti bu işten önceki değerlerle aynı (hariç girişte)", () => {
    const k = kayit({ id: 12, tarih: "2026-09-01", turId: 1, girisYonu: "brut", tutar: "20000", stopajOrani: "20", kdvOrani: "20" });
    expect(k.girisYonu).toBe("brut");
    expect(kiraHesapla({ girisYonu: "brut", tutar: k.tutar, stopajOrani: 20, kdvOrani: 20 })).toEqual({ brut: 20000, stopaj: 4000, net: 16000, kdv: 4000, nakit: 20000 });
    expect(kiraHesapla({ girisYonu: "net", netTutar: 16000, stopajOrani: 20, kdvOrani: 20 })).toEqual({ brut: 20000, stopaj: 4000, net: 16000, kdv: 4000, nakit: 20000 });
  });
  it("AC-14 (motor): personel kaleminde kdvYonu null", () => {
    const k = kayit({ id: 13, tarih: "2026-09-30", turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: "30000", eldenTutar: "", kdvYonu: "dahil" });
    expect(k.kdvYonu).toBeNull();
  });
});

describe("spec 0071 A: tekrarlayan tanım dâhil tutarı saklar, üretim ayırır (R7)", () => {
  it("AC-8: üretim, üretim ayının oranıyla ayırır (tanımın kendi oranı varsa o)", () => {
    const t = { id: 50, turId: 4, ad: "Elektrik", tutar: 1180, kdvOrani: 20, kdvYonu: "dahil", baslangicAy: "2026-06", uretilenAylar: [] };
    const k = tekrarlayanUret([t], [], "2026-10", ctx).yeniKalemler[0];
    expect(k.tutar).toBe(983.33);
    expect(k.kdvOrani).toBe(20);
    expect(k.kdvYonu).toBe("dahil");
    expect(odenecekTutar(k)).toBe(1180);
  });
  it("AC-9: oranı boş (\"KDV tarihe göre\") tanımda ayırma o ayın oranıyla yapılır", () => {
    const t = { id: 51, turId: 4, ad: "Su", tutar: 1180, kdvOrani: null, kdvYonu: "dahil", baslangicAy: "2026-06", uretilenAylar: [] };
    const eylul = tekrarlayanUret([t], [], "2026-09", ctx).yeniKalemler[0];
    const ekim = tekrarlayanUret([t], [], "2026-10", ctx).yeniKalemler[0];
    expect([eylul.kdvOrani, eylul.tutar]).toEqual([20, 983.33]);
    expect([ekim.kdvOrani, ekim.tutar]).toEqual([10, 1072.73]);
    expect(odenecekTutar(ekim)).toBe(1180);
  });
  it("AC-8: hariç tanım bugünkü gibi tutarı aynen kopyalar", () => {
    const t = { id: 52, turId: 4, ad: "İnternet", tutar: 500, kdvOrani: 20, baslangicAy: "2026-06", uretilenAylar: [] };
    const k = tekrarlayanUret([t], [], "2026-09", ctx).yeniKalemler[0];
    expect(k.tutar).toBe(500);
    expect(k.kdvYonu).toBe("haric");
  });
  it("AC-44: kira tanımında brüt + dâhil önce KDV ayrılmış brütle doğar; net + dâhil hariç sayılır", () => {
    const brut = tekrarlayanUret([{ id: 53, turId: 1, ad: "Kira", tutar: 24000, kdvOrani: 20, girisYonu: "brut", kdvYonu: "dahil", baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", ctx).yeniKalemler[0];
    expect([brut.tutar, brut.netTutar, brut.kdvYonu]).toEqual([20000, 16000, "dahil"]);
    const net = tekrarlayanUret([{ id: 54, turId: 1, ad: "Kira", tutar: 16000, kdvOrani: 20, girisYonu: "net", kdvYonu: "dahil", baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", ctx).yeniKalemler[0];
    expect([net.tutar, net.netTutar, net.kdvYonu]).toEqual([20000, 16000, "haric"]);
  });
  it("AC-14 (üretim): personel tanımından üretilen kalemde kdvYonu null", () => {
    const k = tekrarlayanUret([{ id: 55, turId: 3, ad: "Hasan", calisanId: 7, baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", ctx).yeniKalemler[0];
    expect(k.kdvYonu).toBeNull();
  });
});

// ── B. Sıfır tutarlı tekrarlayan kalem ─────────────────────────────────────
const SIFIR_TANIM = { id: 60, turId: 4, ad: "Elektrik", tutar: 0, kdvOrani: null, tedarikciId: 12, baslangicAy: "2026-06", uretilenAylar: [] };
const uret = (ay = "2026-09", giderler = []) => tekrarlayanUret([SIFIR_TANIM], giderler, ay, ctx);
const SIFIR = { ...uret().yeniKalemler[0], sonOdemeTarihi: "2026-10-05" };
const DOLU = kayit({ id: 70, tarih: "2026-09-12", turId: 4, tutar: "1000", kdvOrani: "20", tedarikciId: 12, aciklama: "Doğalgaz", sonOdemeTarihi: "2026-10-05" });

describe("spec 0071 B: sıfır yalnız tanımdan üretilen normal kalemde (R9, R10, R14, R24)", () => {
  it("AC-20: sıfır tanımdan üretilen kalem 0 tutarla doğar (null değil) ve formdan kaydedilir", () => {
    expect(SIFIR.tutar).toBe(0);
    expect(SIFIR.tanimId).toBe(60);
    const k = kayit({ ...SIFIR, tutar: "0", kdvOrani: "20" });
    expect(k.tutar).toBe(0);
  });
  it("AC-40: tanımdan üretilmiş normal kalemde boş tutar 0 olarak kaydedilir", () => {
    expect(kayit({ ...SIFIR, tutar: "", kdvOrani: "20" }).tutar).toBe(0);
  });
  it("AC-25: elle açılan kalemde sıfır ve boş tutar reddedilir", () => {
    for (const tutar of ["0", ""]) {
      const r = dogrula({ id: 71, tarih: "2026-09-12", turId: 4, tutar, kdvOrani: "20" });
      expect(r.hatalar).toContainEqual({ alan: "tutar", mesaj: "Tutar sıfırdan büyük olmalı." });
    }
    // Negatif tutar tanım kaleminde de reddedilir.
    expect(dogrula({ ...SIFIR, tutar: "-5", kdvOrani: "20" }).hatalar.map(h => h.alan)).toContain("tutar");
  });
  it("AC-18 (motor): tanımdan üretilmiş kira kaleminde sıfır reddedilir", () => {
    const r = dogrula({ id: 72, tarih: "2026-09-01", turId: 1, girisYonu: "brut", tutar: "0", stopajOrani: "20", kdvOrani: "20", tanimId: 99, donem: "2026-09" });
    expect(r.hatalar).toContainEqual({ alan: "tutar", mesaj: "Tutar sıfırdan büyük olmalı." });
  });
  it("AC-26: dört bileşeni sıfır olan personel kalemi reddedilir (tanımdan üretilmiş olsa da)", () => {
    const r = dogrula({ id: 73, tarih: "2026-09-30", turId: 3, calisanId: 7, resmiTutar: "0", eldenTutar: "", ekOdemeler: [], tanimId: 98, donem: "2026-09" });
    expect(r.hatalar).toContainEqual({ alan: "resmiTutar", mesaj: "Tutar sıfırdan büyük olmalı." });
  });
  it("AC-19: standart genel giderde sıfır iki noktada da reddedilir", () => {
    expect(standartYeni([], { ad: "Kira", tutar: "0", baslangicAy: "2026-09" }, uid).hata).toBe("Tutar sıfırdan büyük olmalı.");
    const l = standartYeni([], { ad: "Kira", tutar: "100", baslangicAy: "2026-09" }, uid).liste;
    expect(standartTutarDegistir(l, l[0].grupId, { tutar: "0", baslangicAy: "2026-10" }, uid).hata).toBe("Tutar sıfırdan büyük olmalı.");
  });
  it("AC-32: sıfır kalem mükerrer üretim uyarısına ve uretilenAylar kaydına normal kalem gibi girer", () => {
    const u1 = uret();
    expect(u1.guncelTanimlar[0].uretilenAylar).toEqual(["2026-09"]);
    const u2 = tekrarlayanUret(u1.guncelTanimlar, u1.yeniKalemler, "2026-09", ctx);
    expect(u2).toMatchObject({ eklenen: 0, zatenVardi: 1 });
    const iki = [u1.yeniKalemler[0], { ...u1.yeniKalemler[0], id: 999 }];
    const r = hesaplaGiderRaporu({ giderler: iki, turler: TURLER, tedarikciler: TED, yururlukAy: "2026-01" }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-10-02" });
    expect(r.mukerrerUyari).toHaveLength(1);
  });
});

describe("spec 0071 B: sıfır kalem borç ve rapor zincirinde (R15, R20; ölçülüp sabitlendi)", () => {
  const G = odemeleriUygula([SIFIR, DOLU], [], turMap);
  const sifirOdemeli = G.find(k => k.id === SIFIR.id);
  it("AC-33: türetilmiş ödeme durumu ölçüldü: kalanı sıfır olan kalem 'ödenmemiş' sayılır (Ödenmemiş süzgecinde görünür)", () => {
    expect(sifirOdemeli.odendi).toBe(false);
    expect(odemeDurumu(sifirOdemeli)).toBe("odenmedi");
  });
  it("AC-27: borç özetinde, hatırlatıcıda ve açık kalemlerde görünmez", () => {
    const b = borcOzeti(G, AYAR, "2026-10-02");
    expect(b.toplam).toBe(1200);
    expect(JSON.stringify(b)).not.toContain(`"id":${SIFIR.id}`);
    const h = odemeHatirlatmalari(G, { ...AYAR, esikGun: 30 }, "2026-10-02");
    expect([...h.kalemIdleri]).toEqual([String(DOLU.id)]);
    const a = acikKalemler(G, AYAR, "2026-10-02");
    expect(a.satirlar.map(s => s.kalemId ?? s.id)).not.toContain(SIFIR.id);
  });
  it("AC-28, AC-29: dönem toplamı değişmez; kalem listesinde ve sayısında görünür; ödenmemiş kartta ve tedarikçi borcunda yok", () => {
    const aralik = { baslangic: "2026-09-01", bitis: "2026-09-30" };
    const ile = hesaplaGiderRaporu({ giderler: G, ...AYAR }, aralik, { bugun: "2026-10-02" });
    const olmadan = hesaplaGiderRaporu({ giderler: G.filter(k => k.id !== SIFIR.id), ...AYAR }, aralik, { bugun: "2026-10-02" });
    expect(ile.kalemler.map(k => k.id)).toContain(SIFIR.id);
    expect(ile.kalemler).toHaveLength(olmadan.kalemler.length + 1);
    expect([ile.toplam, ile.odenmeyen, ile.odenmeyenAdet, ile.indirilecekKdv]).toEqual([olmadan.toplam, olmadan.odenmeyen, olmadan.odenmeyenAdet, olmadan.indirilecekKdv]);
    expect(ile.tedarikciKirilimi.tedarikciBorcu).toBe(olmadan.tedarikciKirilimi.tedarikciBorcu);
    expect(ile.tedarikciKirilimi.satirlar.map(s => [s.id, s.acikBorc])).toEqual(olmadan.tedarikciKirilimi.satirlar.map(s => [s.id, s.acikBorc]));
  });
  it("AC-30: ödeme yöntemi kırılımında görünmez", () => {
    const r = donemYontemKirilimi(G, [], turMap);
    expect(r.toplamK).toBe(0);
  });
  it("AC-34: yazdırılan raporda sıfır kalem 0,00 ile basılır, 'Tutar girilmedi' basılmaz", () => {
    const rapor = giderKasaRaporu({ giderler: [SIFIR, DOLU], turler: TURLER, tedarikciler: TED, yururlukAy: "2026-01" }, "2026-09");
    const html = buildGiderKasaRaporuHtml(rapor);
    expect(html).toContain("Elektrik");
    // Raporun para biçimi fmtCur ("₺0"); sıfır kalem kalem listesinde tutarıyla basılır.
    expect(html).toMatch(/Elektrik[^₺]*₺0</);
    expect(html).not.toContain("Tutar girilmedi");
  });
});

describe("spec 0071 (triyaj): karışık sürüm sürüm notu", () => {
  it("planın sürüm notu ve CLAUDE.md önce sunucu, sonra istemcilerin güncellenmesini ve o süre dâhil seçilmemesini yazar", () => {
    const plan = readFileSync(path.join(kok, "specs/done/0071-uygulama-plani.md"), "utf-8");
    const not = plan.slice(plan.indexOf("## 7. Sürüm notu metni"));
    expect(not).toMatch(/önce sunucu bilgisayarı, sonra bütün istemciler güncellenmelidir/);
    expect(not).toMatch(/güncelleme bitene kadar tekrarlayan tanımda "KDV dâhil" seçmeyin/);
    expect(readFileSync(path.join(kok, "CLAUDE.md"), "utf-8")).toMatch(/Önce sunucu PC, sonra bütün istemciler güncellenir; güncelleme bitene kadar tanımda "KDV dâhil" seçilmez/);
  });
});

describe("spec 0071: tek kaynak ve değişmeyenler (C2, C8)", () => {
  it("AC-15: GiderForm'da yerel KDV formülü yok; gider yolunda extractKDV çağrılmıyor", () => {
    const form = kod("src/components/GiderForm.jsx");
    expect(form).not.toMatch(/normalKdv/);
    expect(form).not.toMatch(/kdvOrani\)\.deger\s*\|\|\s*0\)\)\s*\/\s*100/);
    for (const f of ["src/components/GiderForm.jsx", "src/lib/gider.js", "src/components/settings/SettingsGiderTanimlari.jsx", "src/components/gider/DonemRaporu.jsx"]) {
      expect(kod(f), f).not.toMatch(/extractKDV/);
    }
  });
  it("AC-36: kiraHesapla ve ileri KDV çıktıları değişmedi", () => {
    expect(kiraHesapla({ girisYonu: "brut", tutar: 12345.67, stopajOrani: 20, kdvOrani: 18 })).toEqual({ brut: 12345.67, stopaj: 2469.13, net: 9876.54, kdv: 2222.22, nakit: 12098.76 });
    expect(kalemKdv({ tutar: 983.33, kdvOrani: 20 })).toBe(196.67);
    expect(kalemKdv({ tutar: 100, kdvOrani: 20 }, DAVRANIS.PERSONEL)).toBe(0);
  });
  it("AC-37: utils.extractKDV değişmedi (servis ücreti yolu)", () => {
    expect(extractKDV(1200, "2026-09-01", [{ from: "2023-07-10", rate: 20 }])).toBeCloseTo(200, 9);
    expect(kod("src/lib/utils.js")).toMatch(/return tutar - \(tutar \/ \(1 \+ r \/ 100\)\);/);
  });
  it("AC-38: izin, sunucu ve birleştirme dosyalarında yeni alan yok", () => {
    for (const f of ["electron/serverAuth.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js", "src/lib/giderRaporu.js", "src/lib/printTemplates.js"]) {
      expect(kod(f), f).not.toMatch(/kdvYonu|Tutar girilmedi/);
    }
  });
});
