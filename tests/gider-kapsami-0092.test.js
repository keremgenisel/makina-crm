// Spec 0092: peşin ödenen gider kapsadığı aylara yayılır ve bitişinde hatırlatır. Motor (gider.js kapsam ailesi, rapor
// motorunun opt-in aylık payı, makinaStandartMaliyet.js tek ay tablosu), hatırlatma kitaplığı (giderKapsami.js) ve kaynak
// taramaları. Ekran tests/ui/gider-kapsami-0092.test.jsx, gerçek App tests/ui/gider-kapsami-0092-app.test.jsx, çağrı sayısı
// tests/gider-kapsami-0092-cagri.test.js, spec öncesi altın tests/gider-kapsami-0092-kiyas.test.js.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import {
  kapsamAyOf, kapsamliMi, kapsamAraligi, kapsamAySayisiCoz, kapsamRozetMetni, kapsamVerisiKoru, kapsamSecilebilirMi,
  KAPSAM_AY_MAX, KAPSAM_AY_HATASI, KAPSAM_ETIKETI, KAPSAM_IPUCU, KAPSAM_ANAHTARI, ATAMA_ANAHTARLARI, ATAMA,
  giderKalemDogrula, tekrarlayanUret, turHaritasi, hesaplaGiderRaporu, odemeHedefleri, odenecekTutar, kalemGiderTutari, DAVRANIS,
  dagitimAyOf, dagitimPaylari,
} from "../src/lib/gider";
import { rolHavuzlari, aylikRolTablosu, aylikGenelHavuzlar, partiGenelPaylari, partiHesabi, genelGiderPayi, modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { kapsamBitisi, kapsamHatirlatmalari, kapsamBitisEsigi, kapsamBitisEsikDogrula, KAPSAM_BITIS_ESIK_VARSAYILAN, KAPSAM_SUZGEC_IBARESI, kapsamBosEki, KAPSAM_KART_ALT_METNI, TURSUZ_ADI } from "../src/lib/giderKapsami";
import { odemeHatirlatmalari, hatirlatmaEsigi } from "../src/lib/odemeHatirlatma";
import * as V from "./fixtures/0092-veri";
import * as V90 from "./fixtures/0090-veri";

const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? tara(p) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const TURLER = [{ id: 1, ad: "İnternet", davranis: "normal", maliyetRolu: "genel" }, { id: 2, ad: "Depo kirası", davranis: "kira", maliyetRolu: "genel" },
  { id: 3, ad: "Personel", davranis: "personel", maliyetRolu: "genel" }, { id: 5, ad: "SGK", davranis: "sgk", maliyetRolu: "genel" },
  { id: 6, ad: "Tedarik", davranis: "normal", maliyetRolu: "urunAgaci" }, { id: 7, ad: "Bağış", davranis: "normal", maliyetRolu: "yok" },
  { id: 8, ad: "Silinen", davranis: "normal", maliyetRolu: "genel", deletedAt: "2026-05-01T00:00:00.000Z" }];
const turMap = turHaritasi(TURLER);
const k = (id, tarih, turId, o = {}) => ({ id, tarih, turId, tutar: 1200, kdvOrani: 20, taksitler: [], modelSatirlari: [], ...o });
const v = (giderler, o = {}) => ({ giderler, giderTurleri: TURLER, tedarikciler: [], stock: [], customers: [], partStockLog: [], uretimPartileri: [], yururlukAy: "2026-01", ...o });
const ayHavuzu = (veri, bas, bit) => Object.fromEntries([...aylikRolTablosu(veri, bas, bit, "2026-12-31").aylar.entries()].map(([a, r]) => [a, r.genel]));

describe("Spec 0092: kapsam alanının motoru (R1–R8/2)", () => {
  it("AC-6 / AC-69 / AC-69/2: 0, 61, 'abc' ve ondalıklı değer tek metinle reddedilir; metinler R2/2'deki gibi", () => {
    for (const x of ["0", "61", "abc", "1,5", "2.5", "-3"]) expect(kapsamAySayisiCoz(x), x).toEqual({ hata: KAPSAM_AY_HATASI });
    expect(KAPSAM_AY_HATASI).toBe("Kapsadığı ay sayısı 1 ile 60 arasında tam sayı olmalı.");
    expect(KAPSAM_ETIKETI).toBe("Kapsadığı ay sayısı");
    expect(KAPSAM_IPUCU).toBe("Yılda bir peşin ödenen giderde 12 yazın; boş ya da 1 tek ayı kapsar.");
    expect(KAPSAM_AY_MAX).toBe(60);
    expect(kapsamAySayisiCoz("")).toEqual({ deger: 1 });
    const r = giderKalemDogrula({ tarih: "2026-03-01", turId: 1, tutar: "100", kdvOrani: "20", dagitimAy: "61" }, { turMap });
    expect(r.kayit).toBe(null);
    expect(r.hatalar).toEqual([{ alan: "dagitimAy", mesaj: KAPSAM_AY_HATASI }]);
  });
  it("AC-7 / AC-8 / AC-9 / AC-68: boş ve 1 değeri gövdeye yazılmaz, 12 yazılır", () => {
    const d = (x) => giderKalemDogrula({ tarih: "2026-03-01", turId: 1, tutar: "100", kdvOrani: "20", dagitimAy: x }, { turMap }).kayit;
    expect(d("")).not.toHaveProperty("dagitimAy");
    expect(d("1")).not.toHaveProperty("dagitimAy");
    expect(d("12").dagitimAy).toBe(12);
    expect(KAPSAM_ANAHTARI).toBe("dagitimAy"); // X10: kalıcı alanın adı değişmedi
  });
  it("AC-10 / AC-12 (R7, R8): kapsamı 12 olan eski kalem korunur; makina atamalı eski kalemde de aralık on iki aydır", () => {
    expect(giderKalemDogrula({ id: 5, tarih: "2026-03-01", turId: 1, tutar: 100, kdvOrani: 20, dagitimAy: 12 }, { turMap }).kayit.dagitimAy).toBe(12);
    const makinali = { tarih: "2026-03-01", dagitimAy: 12, atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 4 };
    expect(kapsamAraligi(makinali)).toEqual({ aySayisi: 12, ilkAy: "2026-03", sonAy: "2027-02" });
    expect(kapsamAyOf({ dagitimAy: 12, atamaTur: ATAMA.DAGITMA })).toBe(12);
  });
  it("AC-13 / AC-13/2 / AC-14 / AC-14/2: aralık gider tarihinin ayından başlar; bitiş son ayın son günü; 60 üst sınırı", () => {
    const a = { tarih: "2026-01-15", dagitimAy: 12 };
    expect(kapsamAraligi(a)).toEqual({ aySayisi: 12, ilkAy: "2026-01", sonAy: "2026-12" });
    expect(kapsamBitisi(a)).toBe("2026-12-31");
    const b = { tarih: "2026-01-03", dagitimAy: 60 };
    expect(kapsamAraligi(b).sonAy).toBe("2030-12");
    expect(kapsamBitisi(b)).toBe("2030-12-31");
    expect(kapsamBitisi({ tarih: "2027-01-31", dagitimAy: 2 })).toBe("2027-02-28"); // ay sonu yardımcısı, artık yıl tuzağı yok
  });
  it("R5/2, AC-15/2, AC-15/3: kapsam yalnız normal ve kirada; personel ve SGK'da saklı değer etkisiz", () => {
    expect(kapsamSecilebilirMi(DAVRANIS.NORMAL) && kapsamSecilebilirMi(DAVRANIS.KIRA)).toBe(true);
    expect(kapsamSecilebilirMi(DAVRANIS.PERSONEL) || kapsamSecilebilirMi(DAVRANIS.SGK)).toBe(false);
    expect(kapsamAyOf({ dagitimAy: 12 }, DAVRANIS.PERSONEL)).toBe(1);
    expect(kapsamliMi({ dagitimAy: 12 }, DAVRANIS.SGK)).toBe(false);
    expect(kapsamRozetMetni({ tarih: "2026-01-02", dagitimAy: 12 }, DAVRANIS.PERSONEL)).toBe("");
    expect(kapsamAyOf({ dagitimAy: 99 })).toBe(1); // saklı geçersiz değer 1 sayılır (R4/2)
  });
  it("R8/2, AC-11/2: kapsam anahtarı atama listesinden çıktı; koruyucunun iki bağımsız kapısı var", () => {
    expect(ATAMA_ANAHTARLARI).not.toContain("dagitimAy");
    expect(kapsamVerisiKoru({ dagitimAy: "12" }, true)).toEqual({ dagitimAy: 12 });
    expect(kapsamVerisiKoru({ dagitimAy: "12" }, false)).toEqual({});
    expect(kapsamVerisiKoru({ dagitimAy: "99" }, true)).toEqual({});
    const kira = giderKalemDogrula({ tarih: "2026-03-15", turId: 2, tutar: "20000", kdvOrani: "20", stopajOrani: "20", girisYonu: "brut", dagitimAy: "12" }, { turMap });
    expect(kira.kayit.dagitimAy).toBe(12);
    const per = giderKalemDogrula({ tarih: "2026-03-15", turId: 3, calisanId: 1, calisanAd: "A", resmiTutar: "100", eldenTutar: "0", dagitimAy: "12" }, { turMap });
    expect(per.kayit).not.toHaveProperty("dagitimAy");
  });
  it("AC-11 (R3, R7): kapsamı 12 olan tanımdan üretilen kalem kapsamı 12 taşır (atamalı ve kira tanımı dahil); personelde taşınmaz", () => {
    const t = [{ id: 9, turId: 1, ad: "Yazılım", tutar: 1200, kdvOrani: 20, baslangicAy: "2026-03", uretilenAylar: [], dagitimAy: 12 },
      { id: 8, turId: 1, ad: "Bakım", tutar: 100, kdvOrani: 20, baslangicAy: "2026-03", uretilenAylar: [], dagitimAy: 12, atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 1 },
      { id: 7, turId: 2, ad: "Depo", tutar: 1000, baslangicAy: "2026-03", uretilenAylar: [], dagitimAy: 6, girisYonu: "brut" },
      { id: 6, turId: 3, ad: "Ali", calisanId: 1, baslangicAy: "2026-03", uretilenAylar: [], dagitimAy: 12 }];
    let n = 100;
    const u = tekrarlayanUret(t, [], "2026-03", { turMap, uid: () => ++n, calisanlar: [{ id: 1, ad: "Ali", resmiMaliyet: 100 }] });
    const bul = (id) => u.yeniKalemler.find(x => x.tanimId === id);
    expect(bul(9).dagitimAy).toBe(12);
    expect(bul(8).dagitimAy).toBe(12);
    expect(bul(7).dagitimAy).toBe(6);
    if (bul(6)) expect(bul(6)).not.toHaveProperty("dagitimAy");
  });
  it("AC-33/2 / AC-35: rozet metni tek yardımcıdan, 'kaçıncı ay' yok", () => {
    expect(kapsamRozetMetni({ tarih: "2026-01-15", dagitimAy: 12 })).toBe("12 ayı kapsıyor · 01.2026 – 12.2026");
    expect(kapsamRozetMetni({ tarih: "2026-01-15" })).toBe("");
    expect(kapsamRozetMetni({ tarih: "2026-10-15", dagitimAy: 12 })).not.toMatch(/\d+\.\s*ay|ayda|\/\d+/);
  });
  it("X9/2: eski motorun dağıtım yardımcıları atama şartlı semantiğiyle aynen kalır", () => {
    expect(dagitimAyOf({ dagitimAy: 12, atamaTur: ATAMA.MAKINA })).toBe(1);
    expect(dagitimAyOf({ dagitimAy: 12 })).toBe(12);
    expect(dagitimPaylari({ tarih: "2026-01-01", dagitimAy: 3, tutar: 300, kdvOrani: 0 }).map(p => p.ay)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });
});

describe("Spec 0092: havuz kapsanan aylara yayılır (R9–R18)", () => {
  it("AC-15 / AC-17: 24.000 TL'lik, 12 ay kapsamlı kalem her aya 2.000 TL; kapsamsız elektrik yalnız kendi ayında", () => {
    const h = ayHavuzu(V.veri(), "2026-01", "2026-12");
    for (const [a, t] of Object.entries(h)) expect(t, a).toBe(500000);
    const tek = ayHavuzu(V.veri({ giderler: [V.INTERNET] }), "2026-01", "2026-12");
    expect(Object.values(tek)).toEqual(Array(12).fill(200000));
    const kapsamsiz = ayHavuzu(V.veri({ giderler: [{ ...V.INTERNET, dagitimAy: undefined }] }), "2026-01", "2026-12");
    expect(kapsamsiz).toEqual({ "2026-01": 2400000 });
  });
  it("AC-15/2 / AC-15/3: kapsamı 12 olan personel ve SGK kalemi yalnız kendi ayının havuzunda", () => {
    const per = k(1, "2026-02-28", 3, { calisanId: 1, calisanAd: "A", resmiTutar: 30000, eldenTutar: 0, tutar: null, dagitimAy: 12 });
    const sgk = k(2, "2026-03-28", 5, { tutar: 9000, kdvOrani: 0, dagitimAy: 12 });
    expect(ayHavuzu(v([per, sgk]), "2026-01", "2026-12")).toEqual({ "2026-02": 3000000, "2026-03": 900000 });
  });
  it("AC-16: artık kuruş son aya yazılır; aylar toplamı kalemin gider tutarına eşit", () => {
    const x = k(1, "2026-01-05", 1, { tutar: 1000, kdvOrani: 0, dagitimAy: 3 });
    const t = aylikRolTablosu(v([x]), "2026-01", "2026-12", "2026-12-31");
    expect([...t.aylar.values()].map(r => r.genel)).toEqual([33333, 33333, 33334]);
    expect([...t.aylar.values()].reduce((s, r) => s + r.genel, 0)).toBe(Math.round(kalemGiderTutari(x) * 100));
  });
  it("R11 (0076 tabanı): kısıtlı kalemde bölünen tutar matrah + indirilemeyen KDV", () => {
    const x = k(1, "2026-01-05", 1, { tutar: 1000, kdvOrani: 20, kisitliGider: true, indirilebilirOran: 70, dagitimAy: 2 });
    const t = aylikRolTablosu(v([x]), "2026-01", "2026-12", "2026-12-31");
    expect([...t.aylar.values()].reduce((s, r) => s + r.genel, 0)).toBe(Math.round(kalemGiderTutari(x) * 100));
    expect(kalemGiderTutari(x)).toBe(1060);
  });
  it("AC-20 / AC-20/2 (C4): dönem havuzu ayların toplamı; rol satırlarının toplamı dönem havuzuna eşit (yayma varken)", () => {
    for (const [b, s] of [["2026-01", "2026-12"], ["2026-01", "2026-03"], ["2026-04", "2026-06"], ["2026-05", "2026-05"]]) {
      const ayl = aylikGenelHavuzlar(V.veri(), Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`).filter(a => a >= b && a <= s), V.BUGUN);
      const d = rolHavuzlari(V.veri(), b, s, V.BUGUN);
      expect(d.genelK, `${b}|${s}`).toBe([...ayl.values()].reduce((x, y) => x + y, 0));
      expect(d.satirlar.filter(r => r.rol === "genel").reduce((x, r) => x + r.toplamK, 0)).toBe(d.genelK);
    }
  });
  it("AC-20/3 (R13/2): pencere dışında tarihli ama kapsamı pencereye uzanan türün satırı tabloda görünür; adet kalem sayar", () => {
    const d = rolHavuzlari(V.veri({ giderler: [V.INTERNET] }), "2026-06", "2026-08", V.BUGUN);
    expect(d.satirlar).toEqual([{ turId: 1, ad: "İnternet", rol: "genel", toplamK: 600000, adet: 1 }]);
    expect(d.yayilanAdet).toBe(1);
  });
  it("AC-21 / AC-22: ölçüm 1, yıllık dönem 750 TL (değişmez); çeyreklik dönem yayma ile 750 TL (öncesi 1.650 TL)", () => {
    const pay = (ayar, veri = V.veri()) => genelGiderPayi(veri, ayar, V.BUGUN).payK;
    const once = V.veri({ giderler: [{ ...V.INTERNET, dagitimAy: undefined }, ...V.ELEKTRIK] }); // kapsamsız = spec öncesi havuz
    expect(pay({ baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 80 })).toBe(75000);
    expect(pay({ baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 80 }, once)).toBe(75000);
    expect(pay({ baslangicAy: "2026-01", bitisAy: "2026-03", varsayilanAdet: 20 })).toBe(75000);
    expect(pay({ baslangicAy: "2026-01", bitisAy: "2026-03", varsayilanAdet: 20 }, once)).toBe(165000);
    expect(pay({ baslangicAy: "2026-04", bitisAy: "2026-06", varsayilanAdet: 20 }, once)).toBe(45000);
  });
  it("AC-23: dört çeyrek partisinin makina başı payı yayma ile dördünde 750 TL (öncesi 1.650 / 450 / 450 / 450)", () => {
    expect(partiGenelPaylari(V.veri(), V.BUGUN).partiler.map(p => p.makinaBasiK)).toEqual([75000, 75000, 75000, 75000]);
    const once = V.veri({ giderler: [{ ...V.INTERNET, dagitimAy: undefined }, ...V.ELEKTRIK] });
    expect(partiGenelPaylari(once, V.BUGUN).partiler.map(p => p.makinaBasiK)).toEqual([165000, 45000, 45000, 45000]);
  });
  it("AC-24 (R14): 2026-10 tarihli, 12 ay kapsamlı kalem 2026'ya üç, 2027'ye dokuz aylık pay verir", () => {
    const x = k(1, "2026-10-01", 1, { tutar: 1200, kdvOrani: 0, dagitimAy: 12 });
    expect(rolHavuzlari(v([x]), "2026-01", "2026-12", "2027-12-31").genelK).toBe(30000);
    expect(rolHavuzlari(v([x]), "2027-01", "2027-12", "2027-12-31").genelK).toBe(90000);
  });
  it("AC-25 / C19 (R15/2): gider tarihi yürürlükten önce olan 12 ay kapsamlı kalem hiçbir aya pay vermez", () => {
    const x = k(1, "2025-12-20", 1, { tutar: 1200, kdvOrani: 0, dagitimAy: 12 });
    expect(rolHavuzlari(v([x]), "2026-01", "2026-12", "2026-12-31")).toMatchObject({ genelK: 0, satirlar: [], yayilanAdet: 0 });
    expect(rolHavuzlari(v([x]), "2025-01", "2025-12", "2026-12-31").yururlukOncesi).toBe(true);
    // Yürürlük ayının içinde başlayan pencere: yürürlük öncesi aylar elenir (R15).
    const y = k(2, "2026-01-10", 1, { tutar: 1200, kdvOrani: 0, dagitimAy: 12 });
    expect(rolHavuzlari(v([y]), "2025-10", "2026-03", "2026-12-31").genelK).toBe(30000);
  });
  it("AC-26 / AC-26/2 / AC-26/3 (R12, R12/2): ürün ağacı rolü de yayılır, genel havuza girmez; tedarik karşılaştırması döneme düşen payı sayar, standart direkt değişmez", () => {
    const x = k(1, "2026-01-05", 6, { tutar: 12000, kdvOrani: 0, dagitimAy: 12 });
    const h = rolHavuzlari(v([x]), "2026-01", "2026-03", "2026-12-31");
    expect(h).toMatchObject({ genelK: 0, urunAgaciK: 300000 });
    const parti = { id: 1, ad: "P", baslangicAy: "2026-01", bitisAy: "2026-03" };
    const veri = v([x], { uretimPartileri: [parti], stock: [{ id: 5, model: "AK100", partiId: 1, uretimTarihi: "2026-02-01" }] });
    const modeller = modelMaliyetleri({ standardModels: [{ model: "AK100", defaultParcalar: [], ekMaliyetler: [{ ad: "İşçilik", tutar: 500 }] }] }, 0);
    const p = partiHesabi(parti, veri, { payK: 0, modeller, bugun: "2026-12-31" });
    expect(p.tedarik.tedarikK).toBe(300000);
    expect(p.tedarik.standartDirektK).toBe(50000);
    const pTek = partiHesabi(parti, v([{ ...x, dagitimAy: undefined }], { uretimPartileri: [parti], stock: veri.stock }), { payK: 0, modeller, bugun: "2026-12-31" });
    expect(pTek.tedarik.tedarikK).toBe(1200000);
    expect(pTek.tedarik.standartDirektK).toBe(p.tedarik.standartDirektK);
  });
  it("AC-27 / AC-28 / AC-29 / AC-30: maliyete girmez rolü ve türsüz kalem havuza girmez (türsüz sayılır); çöpteki tür türüyle yayılır; çöpteki kalem pay vermez", () => {
    const yok = k(1, "2026-01-05", 7, { tutar: 1200, kdvOrani: 0, dagitimAy: 12 });
    const tursuz = k(2, "2026-01-05", undefined, { tutar: 1200, kdvOrani: 0, dagitimAy: 12 });
    const copTur = k(3, "2026-01-05", 8, { tutar: 1200, kdvOrani: 0, dagitimAy: 12 });
    const copKalem = k(4, "2026-01-05", 1, { tutar: 1200, kdvOrani: 0, dagitimAy: 12, deletedAt: "2026-02-01T00:00:00.000Z" });
    const h = rolHavuzlari(v([yok, tursuz, copTur, copKalem]), "2026-01", "2026-06", "2026-12-31");
    expect(h.genelK).toBe(60000); // yalnız çöpteki türün kalemi, altı ayın payı
    expect(h.yokK).toBe(60000);
    expect(h.tursuzAdet).toBe(1);
    expect(h.yayilanAdet).toBe(1); // R21/3: maliyete girmez ve türsüz kalem sayılmaz
  });
  it("AC-31 (R16): ağırlıklı aylık bölme değişmez: çakışan iki partinin ortak ayında adet ağırlığı, artık en önce üretilene", () => {
    const x = k(1, "2026-04-10", 1, { tutar: 100, kdvOrani: 0, dagitimAy: 2 });
    const partiler = [{ id: 1, ad: "A", baslangicAy: "2026-03", bitisAy: "2026-04" }, { id: 2, ad: "B", baslangicAy: "2026-04", bitisAy: "2026-05" }];
    const stock = [{ id: 11, model: "M", partiId: 1, uretimTarihi: "2026-03-01" }, { id: 12, model: "M", partiId: 2, uretimTarihi: "2026-04-02" }, { id: 13, model: "M", partiId: 2, uretimTarihi: "2026-04-03" }];
    const s = partiGenelPaylari(v([x], { uretimPartileri: partiler, stock }), "2026-06-15");
    // Nisan payı 5.000 kuruş: A (1 makina) 1.667 + artık, B (2 makina) 3.333; Mayıs payı 5.000 yalnız B'ye.
    expect(s.partiler.map(p => p.havuzK)).toEqual([1667, 8333]);
    expect(s.yayilanAdet).toBe(1);
  });
  it("AC-19 (R10, C15): 0090 verisi kapsamlı kalem taşımaz; parti sonucunun yayma alanı sıfır (havuz altını parti-genel-payi-0090 AC-36'da dokunulmadan)", () => {
    expect(V90.GIDERLER.some(x => Number(x.dagitimAy) > 1)).toBe(false);
    const s = partiGenelPaylari(V90.veri(), V90.BUGUN);
    expect(s.yayilanAdet).toBe(0);
    const once = JSON.parse(readFileSync("tests/fixtures/0090-parti-once.json", "utf8"));
    for (const p of once) {
      const yeni = s.partiler.find(x => x.id === p.id);
      if (p.makinaBasiK != null && yeni.adet) expect(yeni.havuzK, String(p.id)).toBe(p.havuzK);
    }
  });
  it("R9/2 (0059 deseni): seçeneksiz rapor çıktısı aylık pay alanı taşımaz; seçenekle pay listesi döner", () => {
    const girdi = { giderler: V.GIDERLER, turler: V.TURLER, yururlukAy: "2026-01" };
    const r = hesaplaGiderRaporu(girdi, { baslangic: "2026-06-01", bitis: "2026-06-30" });
    expect(r).not.toHaveProperty("aylikPaylar");
    const p = hesaplaGiderRaporu(girdi, { baslangic: "2026-06-01", bitis: "2026-06-30" }, { aylikPay: true });
    expect(p.aylikPaylar.map(x => [x.kalemId, x.ay, x.payK])).toEqual([[100, "2026-06", 200000], [205, "2026-06", 300000]]);
    // R20: rapor nesnesinin geri kalanı seçenekten bağımsız (yayma Dönem Raporu'na sızmaz).
    const { aylikPaylar: _p, ...kalan } = p;
    expect(JSON.parse(JSON.stringify(kalan))).toEqual(JSON.parse(JSON.stringify(r)));
    expect(r.toplam).toBe(3000); // Haziran'ın raporunda Ocak'ın interneti yok
  });
});

describe("Spec 0092: değişmeyenler (R20, R38)", () => {
  it("AC-36 (rapor nesnesi): kapsamlı kalem kendi ayında tam tutarıyla raporlanır", () => {
    const r = hesaplaGiderRaporu({ giderler: V.GIDERLER, turler: V.TURLER, yururlukAy: "2026-01" }, { baslangic: "2026-01-01", bitis: "2026-01-31" });
    expect(r.toplam).toBe(27000);
    const tekli = hesaplaGiderRaporu({ giderler: [{ ...V.INTERNET, dagitimAy: undefined }, ...V.ELEKTRIK], turler: V.TURLER, yururlukAy: "2026-01" }, { baslangic: "2026-01-01", bitis: "2026-01-31" });
    const ayikla = (o) => JSON.parse(JSON.stringify(o, (key, val) => (key === "dagitimAy" ? undefined : val)));
    expect(ayikla(r)).toEqual(ayikla(tekli));
  });
  it("AC-64 / AC-65: kapsam ödenecek tutarı, taksit planını, vadeleri ve hedefleri değiştirmez; hareket üretmez", () => {
    const tur = turHaritasi(V.TURLER);
    const ham = { tarih: "2026-01-15", turId: 1, tutar: "24000", kdvOrani: "20", sonOdemeTarihi: "2026-02-01", taksitSayisi: "3" };
    const a = giderKalemDogrula({ ...ham, dagitimAy: "12" }, { turMap: tur, uid: (() => { let n = 0; return () => ++n; })() }).kayit;
    const b = giderKalemDogrula(ham, { turMap: tur, uid: (() => { let n = 0; return () => ++n; })() }).kayit;
    const { dagitimAy, ...aKalan } = a;
    expect(dagitimAy).toBe(12);
    expect(aKalan).toEqual(b);
    expect(odenecekTutar(a, DAVRANIS.NORMAL)).toBe(odenecekTutar(b, DAVRANIS.NORMAL));
    expect(odemeHedefleri(a, DAVRANIS.NORMAL)).toEqual(odemeHedefleri(b, DAVRANIS.NORMAL));
    expect(Object.keys(a).filter(x => /hareket/i.test(x))).toEqual([]);
  });
});

describe("Spec 0092: kapsam bitişi hatırlatması (R25–R37)", () => {
  const TUR = [{ id: 1, ad: "İnternet", davranis: "normal" }, { id: 2, ad: "Depo kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 5, ad: "SGK", davranis: "sgk" }];
  const TED = [{ id: 31, ad: "Türk Telekom" }];
  const h = (giderler, bugun, o = {}) => kapsamHatirlatmalari(giderler, { turler: TUR, tedarikciler: TED, yururlukAy: "2026-01", esikGun: 30, ...o }, bugun);
  const internet = k(1, "2026-01-15", 1, { tutar: 24000, dagitimAy: 12, tedarikciId: 31, odendi: true });
  it("AC-42 / AC-43 / AC-46 / AC-51 / AC-52: bitişe 30 günden az kalan ödenmiş kalem listede; satır aralık, gün ve gider tutarı yazar", () => {
    const s = h([internet], "2026-12-10");
    expect(s.sayi).toBe(1);
    expect(s.satirlar[0]).toMatchObject({ turAd: "İnternet", tedarikci: "Türk Telekom", ilkAy: "2026-01", sonAy: "2026-12", aySayisi: 12, bitis: "2026-12-31", gunFarki: 21, tutar: 24000 });
    expect(s.satirlar[0].tutar).toBe(kalemGiderTutari(internet)); // R30/2: kalem listesinin Tutar sütunu
  });
  it("AC-44 / AC-45 / AC-45/2 / AC-45/3: iki yönlü pencere, iki uç dahil; eşik 0'da yalnız bitişi bugün olan", () => {
    expect(h([internet], "2027-01-30").satirlar[0].gunFarki).toBe(-30); // yeni dolmuş, tam eşik
    expect(h([internet], "2027-01-31").sayi).toBe(0); // eşiği bir gün aşan (geçmiş yönde)
    expect(h([internet], "2026-12-01").satirlar[0].gunFarki).toBe(30); // tam eşik (gelecek yönde)
    expect(h([internet], "2026-11-30").sayi).toBe(0);
    expect(h([internet], "2026-12-31", { esikGun: 0 }).sayi).toBe(1);
    expect(h([internet], "2026-12-30", { esikGun: 0 }).sayi).toBe(0);
    expect(h([internet], "2027-01-01", { esikGun: 0 }).sayi).toBe(0);
  });
  it("AC-47 / AC-48 / AC-49 / AC-49/2 / AC-50: çöp, yürürlük öncesi, kapsamsız, tarihsiz, personel ve SGK listede yok", () => {
    const liste = [
      { ...internet, id: 2, deletedAt: "2026-06-01T00:00:00.000Z" },
      { ...internet, id: 3, tarih: "2025-01-10" },
      { ...internet, id: 4, dagitimAy: undefined, tarih: "2026-12-01" },
      { ...internet, id: 5, tarih: "" },
      k(6, "2026-01-31", 3, { calisanId: 9, calisanAd: "Gizli Çalışan", resmiTutar: 31337, eldenTutar: 7771, tutar: null, dagitimAy: 12 }),
      k(7, "2026-01-31", 5, { tutar: 9000, kdvOrani: 0, dagitimAy: 12 }),
    ];
    expect(h(liste, "2026-12-10").sayi).toBe(0);
    const kira = k(8, "2026-01-01", 2, { tutar: 10000, girisYonu: "brut", stopajOrani: 20, dagitimAy: 12 });
    expect(h([kira], "2026-12-10").sayi).toBe(1);
  });
  it("triyaj bulgu 3: türsüz kapsamlı kalemin satır başlığı 'Türü seçilmemiş' (boş değil)", () => {
    const s = h([k(30, "2026-01-15", undefined, { dagitimAy: 12 })], "2026-12-10");
    expect(s.sayi).toBe(1);
    expect(s.satirlar[0].turAd).toBe(TURSUZ_ADI);
    expect(TURSUZ_ADI).toBe("Türü seçilmemiş");
  });
  it("AC-53: bitişe göre artan sıra", () => {
    const a = k(10, "2026-02-03", 1, { dagitimAy: 11 }); // bitiş 2026-12-31
    const b = k(11, "2026-01-03", 1, { dagitimAy: 11 }); // bitiş 2026-11-30
    expect(h([a, b], "2026-12-05").satirlar.map(x => x.kalem.id)).toEqual([11, 10]);
  });
  it("AC-56 / R33 / C10: ödeme hatırlatıcısının sayıları kapsamlı kalem eklenince değişmez", () => {
    const borc = k(20, "2026-11-01", 1, { tutar: 500, sonOdemeTarihi: "2026-12-12" });
    const tek = odemeHatirlatmalari([borc], { turler: TUR, yururlukAy: "2026-01", esikGun: 7 }, "2026-12-10");
    const ikisi = odemeHatirlatmalari([borc, internet], { turler: TUR, yururlukAy: "2026-01", esikGun: 7 }, "2026-12-10");
    expect(ikisi.sayilar).toEqual(tek.sayilar);
    expect(kod("src/lib/odemeHatirlatma.js")).not.toMatch(/kapsam(Araligi|Bitisi|AyOf|liMi)/);
  });
  it("AC-58 / AC-59 / AC-60 / AC-63: eşik varsayılanı 30; yok ya da bozukta 30; -1, 366, 'abc' reddedilir; ödeme eşiğinden bağımsız", () => {
    expect(KAPSAM_BITIS_ESIK_VARSAYILAN).toBe(30);
    for (const g of [undefined, {}, { kapsamBitisEsikGun: "x" }, { kapsamBitisEsikGun: -1 }, { kapsamBitisEsikGun: 400 }, { kapsamBitisEsikGun: null }]) expect(kapsamBitisEsigi(g)).toBe(30);
    expect(kapsamBitisEsigi({ kapsamBitisEsikGun: 0 })).toBe(0);
    for (const x of ["-1", "366", "abc", "2.5"]) expect(kapsamBitisEsikDogrula(x).hata, x).toBeTruthy();
    expect(kapsamBitisEsikDogrula("45")).toEqual({ deger: 45 });
    const ayar = { hatirlatmaEsikGun: 12, kapsamBitisEsikGun: 45 };
    expect([hatirlatmaEsigi(ayar), kapsamBitisEsigi(ayar)]).toEqual([12, 45]);
    expect(hatirlatmaEsigi({ ...ayar, kapsamBitisEsikGun: 90 })).toBe(12);
    expect(kapsamBitisEsigi({ ...ayar, hatirlatmaEsikGun: 2 })).toBe(45);
  });
  it("R25/3: metinler", () => {
    expect(KAPSAM_KART_ALT_METNI).toBe("Ödenmemiş ve vadesi girilmiş kalemler, kapsadığı süre dolan peşin ödemeler · Görmek için tıkla");
    expect(KAPSAM_SUZGEC_IBARESI).toBe("Bu bölüm Giderler'in hatırlatma süzgecine girmez.");
    expect(kapsamBosEki(30)).toBe("Kapsadığı süre 30 gün içinde dolan ya da yeni dolmuş peşin ödenmiş gider de yok.");
  });
});

describe("Spec 0092: kaynak taramaları", () => {
  const SRC = tara("src");
  it("AC-41 / C6: kapsam payları yalnız motordan; ekranlarda çarpma ve bölme yok", () => {
    for (const f of ["src/components/maliyet/PayOzeti.jsx", "src/components/gider/UretimPartileri.jsx", "src/components/gider/OdemeHatirlatma.jsx"]) {
      const e = kod(f).replace(/"[^"\n]*"|`[^`\n]*`/g, '""');
      expect(e, f).not.toMatch(/esitBol|aylikPaylar|kapsamAyOf\(.*[*/]/);
    }
    for (const f of ["src/components/gider/UretimPartileri.jsx", "src/components/maliyet/PayOzeti.jsx"]) {
      const e = kod(f).replace(/"[^"\n]*"|`[^`\n]*`/g, '""');
      expect(e, f).not.toMatch(/[\w)\]]\s*[*/]\s*[\w(]/);
    }
  });
  it("AC-67 / AC-66 / R39: yeni veri bölümü, sunucu kuralı, izin ve birleştirme kuralı yok", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/permissions.js", "src/components/settings/serverPermissionDefs.js", "electron/db.cjs"])
      expect(kod(f), f).not.toMatch(/kapsam(AyOf|Araligi|liMi|BitisEsik|Hatirlatma)|giderKapsami/);
  });
  it("AC-70: yeni adlar yerinde (çözücüler, kitaplık, ortak alan, rozet yardımcısı ve kimliği)", async () => {
    const G = await import("../src/lib/gider");
    for (const ad of ["kapsamAyOf", "kapsamliMi", "kapsamAraligi", "kapsamRozetMetni"]) expect(typeof G[ad], ad).toBe("function");
    expect(G.KAPSAM_AY_MAX).toBe(60);
    expect(kod("src/components/gider/GiderAlanlari.jsx")).toMatch(/export const KapsamAlani\b/);
    expect(kod("src/components/GiderForm.jsx")).toMatch(/<KapsamAlani\b/);
    expect(kod("src/components/settings/SettingsGiderTanimlari.jsx")).toMatch(/<KapsamAlani\b/);
    expect(kod("src/components/gider/DonemRaporu.jsx")).toMatch(/data-testid="kapsam-rozeti"[\s\S]*kapsamRozetMetni\(/);
  });
  it("AC-71 / C17: eski bileşen adı ve 'aya dağıtılmış' kalıbı kaynakta yok; eski hata metni yok (AC-69/2)", () => {
    for (const f of SRC) {
      const c = kod(f);
      expect(c, f).not.toMatch(/\bDagitimAlani\b|aya dağıtılmış|Dağıtım ay sayısı|DAGITIM_AY_HATASI|dagitimAySayisiCoz/);
    }
  });
  it("X9/2: yeni yol, ekranlar ve hatırlatma eski dağıtım yardımcılarını çağırmaz", () => {
    for (const f of ["src/lib/makinaStandartMaliyet.js", "src/lib/giderKapsami.js", ...SRC.filter(f => f.startsWith("src/components"))])
      expect(kod(f), f).not.toMatch(/\bdagitim(AyOf|Araligi|Paylari|SecilebilirMi)\b/);
  });
  it("C13: kapsam okuyucusu ödeme tarafının taksit ve vade kavramlarıyla alan paylaşmaz; eşik adı ödeme eşiğine benzemez", () => {
    const g = kod("src/lib/gider.js");
    const blok = g.slice(g.indexOf("// ── Kapsadığı ay sayısı"), g.indexOf("export const giderKalemDogrula"));
    expect(blok).not.toMatch(/taksit|vade|sonOdeme/i);
    expect("kapsamBitisEsikGun").not.toMatch(/hatirlatma/i);
  });
  it("triyaj bulgu 2: aylık havuzun blok yorumu 0092'nin tek tablosunu anlatır (eski 'ay başına rolHavuzlari' cümlesi yok)", () => {
    const m = readFileSync("src/lib/makinaStandartMaliyet.js", "utf8");
    expect(m).not.toMatch(/her ay için 0088'in `rolHavuzlari`|tür kırılımı\) çağrılır/);
    const blok = m.slice(m.indexOf("// ── Spec 0090: aylık genel gider havuzu"), m.indexOf("const aylikGenelTablosu"));
    expect(blok).toMatch(/aylikRolTablosu/);
    expect(blok).toMatch(/TEK rapor çağrısında/);
  });
  it("AC-74 / R43 (a): yeni kitaplığın kaynağında çalışan alanları geçmez", () => {
    expect(kod("src/lib/giderKapsami.js")).not.toMatch(/calisan|resmiTutar|eldenTutar|ekOdeme/);
  });
  it("R24: yayma ve hatırlatma hiçbir yazdırma ya da dışa aktarma dosyasına girmez", () => {
    for (const f of ["src/lib/printTemplates.js", "src/lib/giderRaporu.js", "src/components/settings/SettingsExport.jsx", "src/lib/raporSunumu.js"])
      expect(kod(f), f).not.toMatch(/kapsam(AyOf|Araligi|liMi|RozetMetni|Hatirlatma)|aylikPay|giderKapsami/);
  });
});

// Triyaj (bulgu 1): kanıt eşlemesi yalnız biçimi denetliyordu; spec'in kanıt kayıtları (R42, R42/2, AC-73) burada sabitlenir
// (0090 AC-57 / 0091 emsali). Kapanışta "degisti" kayıtları 0092-taban raporuna "ayni" olarak çevrilir.
describe("Spec 0092: görsel kanıt kaydı (R42, R42/2, AC-73, DoD)", () => {
  const E = JSON.parse(readFileSync("docs/evidence/kanit-eslemesi.json", "utf8")).dosyalar;
  const arac = readFileSync("scripts/evidence/0009-sayfa.jsx", "utf8");
  const kayit = (f, ekran) => (E[f] || []).filter(x => x.ekran === ekran && /\/0092-(taban-)?piksel-raporu\.json$/.test(x.rapor));
  const TABLO = [
    ["src/components/GiderForm.jsx", "gider-formu"], ["src/components/GiderForm.jsx", "gider-formu-0092-dolu"], ["src/components/GiderForm.jsx", "gider-formu-0092-hata"],
    ["src/components/gider/GiderAlanlari.jsx", "gider-formu-0092-dolu"], ["src/components/gider/GiderAlanlari.jsx", "ayarlar-gidertanim-0092-form"],
    ["src/components/settings/SettingsGiderTanimlari.jsx", "ayarlar-gidertanim-0092"], ["src/components/settings/SettingsGiderTanimlari.jsx", "ayarlar-gidertanim-0092-form"],
    ["src/components/gider/DonemRaporu.jsx", "giderler-0092-liste"], ["src/components/gider/DonemRaporu.jsx", "giderler-0076-liste"], ["src/components/gider/DonemRaporu.jsx", "giderler-0076-kdv"],
    ["src/components/maliyet/PayOzeti.jsx", "maliyet-0092-pay"], ["src/components/gider/UretimPartileri.jsx", "maliyet-0092-partiler"],
    ["src/components/settings/SettingsGider.jsx", "ayarlar-giderayar-0092"],
  ];
  const YENI = ["gider-formu-0092-dolu", "gider-formu-0092-hata", "ayarlar-gidertanim-0092", "ayarlar-gidertanim-0092-form", "maliyet-0092-pay",
    "maliyet-0092-partiler", "anasayfa-0092-kart", "anasayfa-0092-hatirlatma", "ayarlar-giderayar-0092", "giderler-0092-liste"];
  it("R42/2 / AC-73: adı kaldırılan spec'e atıf yapan ekran yeniden adlandırıldı", () => {
    expect(arac).toContain('"giderler-0092-liste":');
    expect(arac).not.toContain('"giderler-0072-liste":');
  });
  it("R42 / AC-73: tablodaki kayıtlar 0092 raporunda (kapanışta 0092-taban'a 'ayni'); 'degisti' ise onay 'spec 0092'", () => {
    for (const [f, e] of TABLO) {
      const k = kayit(f, e);
      expect(k.length, `${f} ${e}`).toBeGreaterThan(0);
      for (const x of k) if (x.beklenen === "degisti") expect(x.onay, e).toMatch(/^Takım Yöneticisi · \d{4}-\d{2}-\d{2} · spec 0092 /);
    }
  });
  it("R42: yeni ekranlar görüntü aracında ve 0092 raporunda (iki tema)", () => {
    const rapor = JSON.parse(readFileSync("docs/evidence/0092-piksel-raporu.json", "utf8")).map(x => x.ad);
    for (const e of YENI) {
      expect(arac, e).toContain(`"${e}":`);
      for (const t of ["aydinlik", "karanlik"]) expect(rapor, `${e}-${t}`).toContain(`${e}-${t}.png`);
    }
  });
});
