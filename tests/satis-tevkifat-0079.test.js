// Spec 0079: tevkifatlı satış faturası (gelir tarafı). Motor, kurucular, türev rakamlar, rapor ve kaynak taramaları.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import { motorCiktilari } from "./fixtures/0079-veri";

const ONCE = "tests/fixtures/0079-tevkifatsiz-once.json";
// Raporun oluşturma zamanı ve "bugün"e bağlı alanlar sabit güne bağlanır (önce/sonra karşılaştırması).
beforeAll(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-09T10:00:00") }));
afterAll(() => vi.useRealTimers());

describe("Spec 0079 AC-31: tevkifatsız veride motor çıktıları birebir aynı", () => {
  it("AC-31 / AC-39 / AC-42 / AC-28: ciro, borç, tahsilat, aylık rapor (+HTML), KDV karşılaştırması, Finans Özeti, yedek parça dışa aktarma ve Servis Formu önceki kodla aynı", () => {
    const simdi = motorCiktilari();
    if (process.env.YAZ_0079 === "1") { fs.writeFileSync(ONCE, JSON.stringify(simdi, null, 1)); return; }
    const once = JSON.parse(fs.readFileSync(ONCE, "utf8"));
    // R32: yedek parça satırına tevkifat sütunları eklenir (sonda, tevkifatsızda boş); eski sütunlar aynı.
    const { yedekExport: yOnce, ...oDiger } = once;
    const { yedekExport: ySimdi, ...sDiger } = simdi;
    expect(sDiger).toEqual(oDiger);
    // Spec 0095 R19 ile güncellendi: "Ücretsiz mi?" sütunu indis 8'e girer (işaretsiz kayıtta "Hayır"); kıyas onu çıkarır.
    yOnce.forEach((s, i) => {
      expect(ySimdi[i][8]).toBe("Hayır");
      ySimdi[i] = ySimdi[i].filter((_, j) => j !== 8);
      expect(ySimdi[i].slice(0, s.length)).toEqual(s);
      expect(ySimdi[i].slice(s.length).every(x => x === "" || x == null)).toBe(true);
    });
  });
});

// ── Spec 0079 motor, kurucular ve taramalar ─────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { calcKDV, calcCiro, calcKalanBorc, satisKdvBolumu, tahsilEdilecekKdv, tahsilKdvOrani, satisTevkifati } from "../src/lib/utils";
import { TEVKIFAT_ORANLARI } from "../src/lib/constants";
import { TEVKIFAT_ORANLARI as GIDER_ORANLARI, kdvKarsilastir } from "../src/lib/gider";
import {
  satisTevkifatSecilebilirMi, satisTevkifatDogrula, satisTevkifatUygula, satisTevkifatOzeti, kartTabanKaydi, kartTabaniEskiMi,
  makinaKartTabaniEskiMi, TEVKIFAT_ORAN_SECILMEDI, TEVKIFAT_ORAN_GECERSIZ, SATIS_TEVKIFAT_NOTU_TAHSIL, SATIS_TEVKIFAT_NOTU_CIRO,
  SATIS_TEVKIFAT_NOTU_SINIR, SATIS_TEVKIFAT_KART_UYARISI, satisTevkifatExportHucreleri,
} from "../src/lib/satisTevkifat";
import { kalipSatisOrtak, kalipKartHesabi, kalipSatisiEkle, kalipGuncelle } from "../src/lib/kalipSatisi";
import { yedekParcaRec, yeniYedekParcaSatisCoklu, yedekParcaGuncelle } from "../src/lib/yedekParcaSatis";
import { makinaKartOdemesi, kartYansitmaAyrim } from "../src/lib/krediKarti";
import { ilkSatisOdemeleri } from "../src/lib/makinaOdeme";
import { satisTahsilatKalemleri } from "../src/lib/satisTahsilat";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { buildAylikRaporHtml, buildServiceFormHtml } from "../src/lib/printTemplates";
import { satisKdvAylar, hesaplananKdvAylar } from "../src/lib/giderKdv";
import { finansOzetiHesapla, yedekParcaExportRow, YEDEK_PARCA_EXPORT_HEAD } from "../src/components/settings/SettingsExport";
import { KK_AYAR } from "./fixtures/0079-veri";

const KDV20 = [{ from: "2000-01-01", rate: 20 }];
const FY = "Faturalı Yurtiçi";
const T = (pay, payda = 10) => ({ tevkifatli: true, tevkifatPay: pay, tevkifatPayda: payda });
const oku = (f) => readFileSync(f, "utf8");
const dosyalar = (dir) => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? dosyalar(p) : (/\.(js|jsx)$/.test(f) ? [p] : []); });
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

describe("Spec 0079 A: kutu, kapı, doğrulama ve alan yazımı", () => {
  it("AC-3: kapı normalleştirilmiş çift; alanı olmayan ve eski biçimli faturalı yurtiçi kayıtta kutu çizilir, diğer tiplerde çizilmez", () => {
    for (const t of [FY, undefined, "", "Faturalı Yurt İçi", "Faturalı"]) expect(satisTevkifatSecilebilirMi(t), String(t)).toBe(true);
    for (const t of ["Faturalı Yurtdışı", "Faturasız Yurtiçi", "Faturasız Yurtdışı", "Faturalı İhracat", "Faturasız"]) expect(satisTevkifatSecilebilirMi(t), t).toBe(false);
  });
  it("AC-3 (R2 taraması): kapı dize karşılaştırmasıyla yazılmaz; tevkifat kodu taşıyan dosyalarda `=== \"Faturalı Yurtiçi\"` yok", () => {
    const bulunan = dosyalar("src").filter(f => /tevkifat/i.test(oku(f)) && /===\s*"Faturalı Yurtiçi"/.test(yorumsuz(oku(f))));
    expect(bulunan).toEqual([]);
  });
  it("AC-4: kapı kapalıysa ya da kutu kapalıysa üç alan SİLİNİR (false/null yazılmaz)", () => {
    const eski = { id: 1, ...T(5), faturaTipi: FY };
    for (const [form, tip] of [[{ tevkifatli: false }, FY], [{ ...T(5) }, "Faturalı Yurtdışı"], [{ ...T(5) }, "Faturasız Yurtiçi"]]) {
      const r = satisTevkifatUygula(eski, form, tip);
      for (const a of ["tevkifatli", "tevkifatPay", "tevkifatPayda"]) expect(a in r, a).toBe(false);
    }
    expect(satisTevkifatUygula({ id: 1 }, { ...T(5), _kartYeniTaban: true }, FY)).toEqual({ id: 1, ...T(5) });
  });
  it("AC-4: düzenleme kolları (kalıp, yedek parça) birleştirilen kayıttan alanı siler; ekleme kolları yazmaz", () => {
    const eski = { id: 7, ucret: 100, ...T(5) };
    const k = kalipGuncelle(eski, { ucret: 120 }, { faturaTipi: "Faturasız Yurtiçi", ...T(5) });
    expect(["tevkifatli", "tevkifatPay", "tevkifatPayda"].some(a => a in k)).toBe(false);
    const y = yedekParcaGuncelle(eski, { faturaTipi: FY, birimFiyat: 1 }, { tevkifatli: false });
    expect(["tevkifatli", "tevkifatPay", "tevkifatPayda"].some(a => a in y)).toBe(false);
    expect("tevkifatli" in kalipSatisOrtak({ faturaTipi: FY, tevkifatli: false }, 1, "2026-09-10")).toBe(false);
    expect(kalipSatisOrtak({ faturaTipi: FY, ...T(7) }, 1, "2026-09-10")).toMatchObject(T(7));
  });
  it("AC-6: oran listesi constants.js'te tek tanım (0075 ile aynı nesne); gelir motorları gider.js'i içe almaz", () => {
    expect(GIDER_ORANLARI).toBe(TEVKIFAT_ORANLARI);
    expect(dosyalar("src").filter(f => /TEVKIFAT_ORANLARI\s*=/.test(oku(f)))).toEqual(["src/lib/constants.js"]);
    for (const f of ["src/lib/aylikRapor.js", "src/components/settings/SettingsExport.jsx", "src/lib/satisTevkifat.js", "src/lib/utils.js", "src/lib/satisTahsilat.js"])
      expect(oku(f), f).not.toMatch(/from\s+"[./]*gider"/);
  });
  it("AC-7: oran seçilmemiş, payı sıfır ya da paydadan büyük kayıt reddedilir ve nedeni yazılır; kurucular reddeder", () => {
    expect(satisTevkifatDogrula({ tevkifatli: true }, FY)).toBe(TEVKIFAT_ORAN_SECILMEDI);
    expect(satisTevkifatDogrula({ tevkifatli: true, tevkifatPay: 0, tevkifatPayda: 10 }, FY)).toBe(TEVKIFAT_ORAN_GECERSIZ);
    expect(satisTevkifatDogrula({ tevkifatli: true, tevkifatPay: 11, tevkifatPayda: 10 }, FY)).toBe(TEVKIFAT_ORAN_GECERSIZ);
    expect(satisTevkifatDogrula({ ...T(5) }, FY)).toBeNull();
    expect(satisTevkifatDogrula({ tevkifatli: true }, "Faturalı Yurtdışı")).toBeNull(); // kapı kapalı: alanlar silinecek
    expect(kalipSatisiEkle({ customerId: 1, faturaTipi: FY, tevkifatli: true, kaliplar: [{ ad: "K", fiyat: 1 }] }, { customers: [{ id: 1 }] }).hata).toBe(TEVKIFAT_ORAN_SECILMEDI);
    expect(yedekParcaRec({ aliciTipi: "musteri", musteriId: 1, partId: "1", miktar: 1, birimFiyat: 1, faturaTipi: FY, tevkifatli: true })).toEqual({ ok: false, hata: TEVKIFAT_ORAN_SECILMEDI });
  });
  it("AC-8: çok satırlı Extra Kalıp ve yedek parçada ayar bütün satırlara ortak kurucuda yazılır", () => {
    let kalip = [];
    let n = 100;
    kalipSatisiEkle({ customerId: 1, faturaTipi: FY, ...T(5), kaliplar: [{ ad: "A", fiyat: 100 }, { ad: "B", fiyat: 200 }] },
      { customers: [{ id: 1 }], setPartSales: (f) => { kalip = f(kalip); }, setCustomers: () => {}, uid: () => ++n, simdi: () => "x", bugun: "2026-09-10" });
    expect(kalip).toHaveLength(2);
    for (const k of kalip) expect(k).toMatchObject(T(5));
    let yp = [];
    const r = yeniYedekParcaSatisCoklu({ aliciTipi: "bayi", dealerId: 3, faturaTipi: FY, ...T(9), tarih: "2026-09-10", satirlar: [{ partId: "1", miktar: 1, birimFiyat: 10 }, { partId: "2", miktar: 2, birimFiyat: 20 }] },
      { setYedekParcaSatislar: (f) => { yp = f(yp); }, setPartStock: () => {}, setPartStockLog: () => {}, partStock: [] });
    expect(r.ok).toBe(true);
    expect(yp).toHaveLength(2);
    for (const s of yp) expect(s).toMatchObject(T(9));
  });
});

describe("Spec 0079 B: tek kapı ve hesap", () => {
  it("AC-9: matrah 100.000, %20, 5/10 → toplam KDV 20.000, alıcı 10.000, bize 10.000, fatura toplamı 110.000", () => {
    expect(satisKdvBolumu(FY, 100000, "2026-09-10", KDV20, T(5))).toMatchObject({ toplamKdv: 20000, tevkifat: 10000, bizKdv: 10000, tevkifatli: true });
    expect(satisTevkifatOzeti(FY, 100000, "2026-09-10", KDV20, T(5))).toMatchObject({ matrah: 100000, toplamKdv: 20000, tevkifat: 10000, bizKdv: 10000, faturaToplami: 110000 });
  });
  it("AC-10: 1.333,33 ve %20 → toplam 266,67; 3/10 tevkifat 80,00; bize 186,67; parçalar toplama kuruşu kuruşuna eşit", () => {
    const b = satisKdvBolumu(FY, 1333.33, "2026-09-10", KDV20, T(3));
    expect(b).toMatchObject({ toplamKdv: 266.67, tevkifat: 80, bizKdv: 186.67 });
    expect(Math.round(b.tevkifat * 100) + Math.round(b.bizKdv * 100)).toBe(Math.round(b.toplamKdv * 100));
    // Bütün oranlarda ve rastgele tutarlarda iki parça toplama eşit (artık kuruş bizde).
    for (const o of TEVKIFAT_ORANLARI) for (const bedel of [0.01, 1, 99.99, 1333.33, 12345.67, 987654.32]) {
      const x = satisKdvBolumu(FY, bedel, "2026-09-10", KDV20, T(o.pay, o.payda));
      expect(Math.round(x.tevkifat * 100) + Math.round(x.bizKdv * 100), `${bedel} ${o.pay}/${o.payda}`).toBe(Math.round(x.toplamKdv * 100));
    }
  });
  it("AC-12: tevkifatsız kayıtta tahsilEdilecekKdv calcKDV ile birebir aynı (float dahil)", () => {
    for (const tip of [FY, "Faturalı Yurtdışı", "Faturasız Yurtiçi", undefined, "Faturalı Yurt İçi"])
      for (const bedel of [0, 1, 1333.33, "12.345,67", 100000, -50]) for (const kayit of [null, {}, { tevkifatli: false }, { tevkifatli: true }, { tevkifatli: true, tevkifatPay: 0, tevkifatPayda: 10 }])
        expect(tahsilEdilecekKdv(tip, bedel, "2026-09-10", KDV20, kayit)).toBe(calcKDV(tip, bedel, "2026-09-10", KDV20));
  });
  it("AC-11: gelir dosyalarında doğrudan calcKDV( kalmadı; muaf yalnız ikinci argümanı sabit 100 olan etiket çağrısı (kdvOrani prop'u)", () => {
    const ihlal = [], etiketDisi = [];
    for (const f of dosyalar("src")) {
      if (f === "src/lib/utils.js") continue; // tanım ve kapının kendisi
      const satirlar = yorumsuz(oku(f)).split("\n");
      satirlar.forEach((l, i) => {
        for (const m of l.matchAll(/(?<![\w.])calcKDV\(([^,]*),\s*([^,)]*)/g)) {
          if (m[2].trim() !== "100") ihlal.push(`${f}:${i + 1}`);
          else if (!/kdvOrani=\{calcKDV\(/.test(l)) etiketDisi.push(`${f}:${i + 1}`);
        }
      });
    }
    expect(ihlal).toEqual([]);
    expect(etiketDisi).toEqual([]);
    // Tahsil oranı (kart tutarı ve ödeme ayrıştırması) tek yardımcıdan: R9/2 revizyon 2'nin 12 yeri.
    const tahsilOrani = dosyalar("src").reduce((n, f) => n + (yorumsuz(oku(f)).match(/tahsilKdvOrani\(/g) || []).length, 0);
    expect(tahsilOrani).toBeGreaterThanOrEqual(12);
  });
  it("AC-45: yardımcının adı satisKdv değil; aylık raporun yerel satisKdv'si ve rapor.satisKdv alanı bugünkü anlamıyla duruyor", () => {
    expect(oku("src/lib/utils.js")).not.toMatch(/export const satisKdv\b/);
    expect(oku("src/lib/aylikRapor.js")).toMatch(/satisKdv = \{\}/);
    const r = hesaplaAylikRapor({ customers: [{ id: 1, name: "A", faturali: FY, faturaBedeli: 1000, fabrikaSatisBedeli: 1000, installDate: "2026-09-02", currency: "TRY" }] }, "2026-09", { kdvRates: KDV20 });
    expect(r.satisKdv).toEqual({ TRY: 200 });
  });
  it("AC-36: etiket oranı %20 kalır, tahsil oranı 5/10'da %10; kartla ödenen makinada borçtan düşen tutar borcu aşmaz", () => {
    const c = { id: 1, faturali: FY, fabrikaSatisBedeli: 100000, faturaBedeli: 100000, installDate: "2026-09-10", currency: "TRY", ...T(5) };
    expect(calcKDV(c.faturali, 100, c.installDate, KDV20)).toBe(20);
    expect(tahsilKdvOrani(c.faturali, c.installDate, KDV20, c)).toBe(10);
    for (const o of TEVKIFAT_ORANLARI) expect(Number.isInteger(tahsilKdvOrani(FY, "2026-01-01", KDV20, T(o.pay, o.payda)) * 10), `${o.pay}`).toBe(true);
    // Yansıtmasız: 100.000 mal → borçtan 110.000 düşer, kalan 0 (ham oranla 120.000 düşerdi).
    const duz = ilkSatisOdemeleri([{ yontem: "Kredi Kartı", tutar: "100.000", taksitSayisi: 1 }], { customerId: 1, tarih: "2026-09-10", ayar: KK_AYAR, kdvOran: tahsilKdvOrani(c.faturali, c.installDate, KDV20, c), yeniId: () => 9, kartTaban: c }).kayitlar;
    expect(duz[0].tutar).toBeCloseTo(110000, 6);
    expect(calcKalanBorc(c, duz, KDV20)).toBe(0);
    // Yansıtmalı: borç (110.000 + komisyonun tahsil edilen KDV'si) ile borçtan düşen tutar eşit.
    const mk = makinaKartOdemesi(100000, 1, KK_AYAR, "2026-09-10", true, 10);
    const p = { id: 9, customerId: 1, tarih: "2026-09-10", yontem: "Kredi Kartı", tutar: mk.tutar, kartKomisyonu: mk.kartKomisyonu };
    expect(Math.abs(calcCiro(c, KDV20, [p]) - mk.tutar)).toBeLessThan(0.01);
    expect(calcKalanBorc(c, [p], KDV20)).toBe(0);
  });
});

describe("Spec 0079 C: türev rakamlar", () => {
  const c = { id: 1, name: "A", faturali: FY, fabrikaSatisBedeli: 100000, faturaBedeli: 100000, installDate: "2026-09-10", currency: "TRY", ...T(5) };
  it("AC-13 / AC-18: tevkifatlı makinada borç matrah + kalan KDV (110.000); ciro (net) değişmez", () => {
    expect(calcCiro(c, KDV20, [])).toBe(110000);
    expect(calcKalanBorc(c, [], KDV20)).toBe(110000);
    const { tevkifatli, tevkifatPay, tevkifatPayda, ...cs } = c; void tevkifatli; void tevkifatPay; void tevkifatPayda;
    const r = hesaplaAylikRapor({ customers: [c] }, "2026-09", { kdvRates: KDV20 }), r0 = hesaplaAylikRapor({ customers: [cs] }, "2026-09", { kdvRates: KDV20 });
    expect(r.ozet.ciroNet).toEqual(r0.ozet.ciroNet);
    expect(r.satisTutar).toEqual({ TRY: 100000 });
  });
  it("AC-38: yansıtılan kart komisyonunun KDV'si de tevkifata tabi: borç komisyon KDV'sinin tevkifat payı kadar da düşer", () => {
    const p = { id: 5, customerId: 1, tarih: "2026-09-10", yontem: "Kredi Kartı", tutar: 0, kartKomisyonu: { toplamKesinti: 1000, yansitildi: true } };
    const { tevkifatli, tevkifatPay, tevkifatPayda, ...cs } = c; void tevkifatli; void tevkifatPay; void tevkifatPayda;
    expect(calcCiro(cs, KDV20, [p])).toBe(120200); // 100.000 + 20.000 + 200 (komisyon KDV'si)
    expect(calcCiro(c, KDV20, [p])).toBe(110100);  // 100.000 + 10.000 + 100: komisyon KDV'sinin 5/10'u da düştü
    expect(yorumsuz(oku("src/lib/utils.js"))).not.toMatch(/komToplam \* oran \/ 100/); // satır içi ikinci yol kapandı
  });
  it("AC-39: kuruş sınırı yalnız bölmede; calcKalanBorc tam liraya yuvarlamayı sürdürür", () => {
    const k = { ...c, faturaBedeli: 1333.33, fabrikaSatisBedeli: 1333.33, ...T(3) };
    expect(calcCiro(k, KDV20, [])).toBeCloseTo(1333.33 + 186.67, 6);
    expect(calcKalanBorc(k, [], KDV20)).toBe(1520);
    expect(oku("src/lib/utils.js")).toMatch(/Math\.max\(0, Math\.round\(calcCiro\(customer, kdvRates, payments\) - sumPayments/);
  });
  const SERVIS = [
    { id: 11, customerId: 1, date: "2026-09-12", type: "Garanti Dışı", servisUcreti: 10000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: FY, odendi: true, tahsilatTarihi: "2026-09-12", ...T(7) },
    { id: 12, customerId: 1, date: "2026-09-13", type: "Garanti Dışı", servisUcreti: 5000, parcaUcreti: 1000, parcaUcretiAltuntastan: 1000, currency: "TRY", islemFirma: "Ege Bayi", faturaTipi: FY, odendi: false, ...T(5) },
  ];
  const KALIP = [{ id: 21, customerId: 1, tur: "Kalıp", tarih: "2026-09-14", ucret: 8000, currency: "TRY", faturaTipi: FY, odendi: false, satisFirma: "Ege Bayi", ...T(2) }];
  const YP = [{ id: 31, aliciTipi: "bayi", dealerId: 3, partId: "1", miktar: 2, birimFiyat: 750, currency: "TRY", faturaTipi: FY, tarih: "2026-09-15", odendi: false, ...T(9) },
    { id: 32, aliciTipi: "musteri", musteriId: 1, partId: "1", miktar: 4, birimFiyat: 25, currency: "USD", faturaTipi: FY, tarih: "2026-09-16", odendi: false, ...T(5) }];
  it("AC-14 / AC-19: servis, Extra Kalıp ve yedek parçanın tahsilat tutarı düşülmüş KDV ile; anlaşmalı servisin işçiliği bugünkü gibi hariç", () => {
    const k = satisTahsilatKalemleri({ services: SERVIS, partSales: KALIP, yedekParcaSatislar: YP }, { kdvRates: KDV20 });
    const t = Object.fromEntries(k.map(x => [x.kayit.id, [x.bedel, x.kdv, x.tutar]]));
    expect(t[11]).toEqual([10000, 600, 10600]);     // 2.000 KDV, 7/10 alıcıda
    expect(t[12]).toEqual([1000, 100, 1100]);       // yalnız Altuntaş parçası, işçilik hariç
    expect(t[21]).toEqual([8000, 1280, 9280]);      // 1.600 KDV, 2/10 alıcıda
    expect(t[31]).toEqual([1500, 30, 1530]);        // 300 KDV, 9/10 alıcıda
  });
  it("AC-15 / AC-17 / AC-20 / AC-26 / AC-43: aylık rapor toplam KDV'si ve alacağı düşülmüş tutarı sayar; bilgi nesnesi para birimi başına; borç atfı değişmez", () => {
    const veri = { customers: [c], services: SERVIS, partSales: KALIP, yedekParcaSatislar: YP, dealers: [{ id: 3, name: "Ege Bayi" }] };
    const r = hesaplaAylikRapor(veri, "2026-09", { kdvRates: KDV20 });
    // makina 10.000 + servis 600 + anlaşmalı parça 100 + kalıp 1.280 + yedek 30 = 12.010 TL; USD yedek 100 × %20 = 20, 5/10 → 10
    expect(r.toplamKdv).toEqual({ TRY: 12010, USD: 10 });
    // Spec 0114 Karar 45 ile: nesne firma firma `detay` listesini de taşır; kutu rakamları aynen, detay toplamları onlara eşit.
    const { detay, ...kutu } = r.tevkifatliSatis;
    expect(kutu).toEqual({
      adet: 6, matrah: { TRY: 120500, USD: 100 }, toplamKdv: { TRY: 24100, USD: 20 },
      aliciBeyan: { TRY: 12090, USD: 10 }, bizBeyan: { TRY: 12010, USD: 10 },
    });
    expect(detay).toHaveLength(6);
    const topla = (alan) => detay.reduce((t, d) => { for (const [k, v] of Object.entries(d[alan] || {})) t[k] = Math.round(((t[k] || 0) + v) * 100) / 100; return t; }, {});
    expect(topla("matrah")).toEqual(kutu.matrah);
    expect(topla("toplamKdv")).toEqual(kutu.toplamKdv);
    expect(topla("aliciBeyan")).toEqual(kutu.aliciBeyan);
    // Alacak: makina bakiyesi kaydın kalanBorc'u (uygulama yazar); servis 1.100, kalıp 9.280 (bayide), yedek 1.530 + 110 USD.
    const alacak = (ad) => r.alacakDetay.find(x => x.firma === ad)?.tutar;
    expect(alacak("Ege Bayi")).toEqual({ TRY: 9280 + 1530 });
    expect(r.alacakDetay.find(x => x.firma === "A")?.tutar).toEqual({ TRY: 1100, USD: 110 });
    const html = buildAylikRaporHtml(r, { name: "F" });
    expect(html).toContain("TEVKİFATLI SATIŞLAR");
    expect(html).toContain("Alıcının beyan edeceği KDV (tevkifat)");
    expect(html).toContain("Tevkifatlı satış var: yukarıdaki KDV rakamları bizim beyan edeceğimiz KDV'dir");
  });
  it("AC-26 / R7 (triyaj bulgu 3): çok satırlı tek fatura (aynı batchId) bilgi nesnesinde tek satış sayılır; tutarlar satırların toplamı", () => {
    const kalip = (id, ucret) => ({ id, batchId: 77, customerId: 1, tur: "Kalıp", tarih: "2026-09-14", ucret, currency: "TRY", faturaTipi: FY, odendi: true, ...T(5) });
    const yp = (id, b) => ({ id, batchId: 88, aliciTipi: "bayi", dealerId: 3, partId: "1", miktar: 1, birimFiyat: b, currency: "TRY", faturaTipi: FY, tarih: "2026-09-15", odendi: true, ...T(5) });
    const r = hesaplaAylikRapor({ customers: [{ id: 1, name: "A" }], partSales: [kalip(1, 100), kalip(2, 200), kalip(3, 300)], yedekParcaSatislar: [yp(4, 1000), yp(5, 2000)], dealers: [{ id: 3, name: "B" }] }, "2026-09", { kdvRates: KDV20 });
    expect(r.tevkifatliSatis.adet).toBe(2);
    expect(r.tevkifatliSatis.matrah).toEqual({ TRY: 3600 });
    expect(r.tevkifatliSatis.aliciBeyan).toEqual({ TRY: 360 });
  });
  it("AC-15 (triyaj bulgu 4): servisin fatura tipi kırılımının KDV'si KDV özetiyle kuruşu kuruşuna aynı (333,33 + 333,33, 3/10)", () => {
    const sv = { id: 1, customerId: 1, date: "2026-09-12", type: "Garanti Dışı", servisUcreti: 333.33, parcaUcreti: 333.33, parcaUcretiAltuntastan: 333.33,
      currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: FY, odendi: true, ...T(3) };
    const r = hesaplaAylikRapor({ customers: [{ id: 1, name: "A" }], services: [sv] }, "2026-09", { kdvRates: KDV20 });
    const ft = r.servisFaturaKirilimi.reduce((t, x) => t + Object.values(x.kdv || {}).reduce((a, v) => a + v, 0), 0);
    expect(r.servisKdv).toEqual({ TRY: 93.33 });
    expect(Math.round(ft * 100)).toBe(9333);
  });
  it("AC-26: tevkifatlı satış yoksa alan motor çıktısında hiç yok, kutu ve dipnot basılmaz", () => {
    const r = hesaplaAylikRapor({ customers: [{ ...c, tevkifatli: false }] }, "2026-09", { kdvRates: KDV20 });
    expect("tevkifatliSatis" in r).toBe(false);
    const html = buildAylikRaporHtml(r, { name: "F" });
    expect(html).not.toContain("TEVKİFATLI SATIŞLAR");
    expect(html).not.toContain("Tevkifatlı satış var");
  });
  it("AC-16 / AC-27 / AC-32: KDV karşılaştırmasında alıcının beyanı bilgi satırıdır, farka eklenmez; gider tarafının KDV2'si ile yan yana bağımsız", () => {
    const veri = { customers: [c] };
    const { kdv, aliciBeyan } = satisKdvAylar(veri, ["2026-09"], { kdvRates: KDV20 });
    expect(kdv).toEqual({ TRY: 10000 });
    expect(aliciBeyan).toEqual({ TRY: 10000 });
    expect(hesaplananKdvAylar(veri, ["2026-09"], { kdvRates: KDV20 })).toEqual(kdv);
    const s = kdvKarsilastir(kdv, 3000, 400, aliciBeyan.TRY);
    expect(s).toMatchObject({ hesaplananTL: 10000, indirilecek: 3000, fark: 7000, odenecek: 7000, tevkifatKdv2: 400, satisTevkifatAlici: 10000 });
    expect(kdvKarsilastir(kdv, 3000, 400)).not.toHaveProperty("satisTevkifatAlici"); // parametresiz çıktı eski
  });
  it("AC-33: 0076'nın indirilecek KDV kısıtı satış tevkifatından etkilenmez (iki uç bağımsız)", () => {
    const s1 = kdvKarsilastir({ TRY: 10000 }, 1400, 0, 10000), s2 = kdvKarsilastir({ TRY: 10000 }, 1400, 0);
    expect(s1.indirilecek).toBe(s2.indirilecek);
    expect(s1.fark).toBe(s2.fark);
  });
  it("AC-28: dışa aktarma satırları tevkifat sütunlarını taşır; Finans Özeti sütunsuz ama toplam KDV'si düşülmüş tutarı sayar", () => {
    // Spec 0114 R34 ile: iki ihraç sütunu tevkifat sütunlarının arkasına eklendi; tevkifat sütunları sondan üçüncü ve dördüncü.
    expect(YEDEK_PARCA_EXPORT_HEAD.slice(-4, -2)).toEqual(["Tevkifat Oranı", "Alıcının Beyan Edeceği KDV"]);
    expect(yedekParcaExportRow(YP[0], { kdvRates: KDV20 }).slice(-4, -2)).toEqual(["9/10", 270]);
    expect(satisTevkifatExportHucreleri(FY, 100000, "2026-09-10", KDV20, c)).toEqual(["5/10", 10000]);
    expect(satisTevkifatExportHucreleri(FY, 100000, "2026-09-10", KDV20, {})).toEqual(["", ""]);
    const oz = finansOzetiHesapla({ customers: [c], services: SERVIS, partSales: KALIP, kdvRates: KDV20 });
    expect(oz.kdv.TRY).toBe(10000 + 600 + 100); // makina + servis işçiliği + anlaşmalıya parça (Finans Özeti kalıp KDV'si saymaz, bugünkü kural)
  });
  it("AC-42: Servis Formu tevkifatlı serviste toplam KDV, tevkifat ve tahsil edilecek KDV satırlarını basar", () => {
    const html = buildServiceFormHtml(SERVIS[0], [c], KDV20, {});
    expect(html).toContain("Faturadaki Toplam KDV");
    expect(html).toContain("KDV Tevkifatı (alıcı beyan eder) 7/10");
    expect(html).toContain("Tahsil Edilecek KDV");
    expect(html).toMatch(/KDV dahil: ₺10\.600/);
    const { tevkifatli, tevkifatPay, tevkifatPayda, ...duz } = SERVIS[0]; void tevkifatli; void tevkifatPay; void tevkifatPayda;
    expect(buildServiceFormHtml(duz, [c], KDV20, {})).not.toContain("Tahsil Edilecek KDV");
  });
});

describe("Spec 0079 R13: kredi kartı tabanı (AC-37)", () => {
  it("AC-37: yeni kayıtta taban tevkifat düşülmüş tutar ve anlık görüntü tabanını taşır; tevkifatsızda işaret yok", () => {
    const f = { yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: false, faturaTipi: FY, ...T(5) };
    const kk = kalipKartHesabi(f, "2026-09-10", KK_AYAR, KDV20)(8000);
    const beklenen = kalipKartHesabi({ ...f, tevkifatli: false }, "2026-09-10", KK_AYAR, KDV20);
    expect(kk.kartKomisyonu.tevkifatTaban).toBe("5/10");
    // Taban 8.000 + 800 (tahsil edilen KDV): komisyon tevkifatsız tabanın (8.000 + 1.600) 8.800/9.600'ü.
    expect(kk.kartKomisyonu.toplamKesinti / beklenen(8000).kartKomisyonu.toplamKesinti).toBeCloseTo(8800 / 9600, 9);
    expect("tevkifatTaban" in beklenen(8000).kartKomisyonu).toBe(false);
  });
  it("AC-37: bayrağı sonradan açılan kayıtta mevcut anlık görüntü değişmez ve uyarı koşulu doğar; 'yeni tabanla' denince yenilenir", () => {
    const eski = { yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: false, faturaTipi: FY, tarih: "2026-09-10" };
    const eskiKk = kalipKartHesabi(eski, "2026-09-10", KK_AYAR, KDV20)(8000).kartKomisyonu;
    const duzenleme = { ...eski, kartKomisyonu: eskiKk, ...T(5) };
    expect(kartTabanKaydi(duzenleme)).toBeNull();
    expect(kalipKartHesabi(duzenleme, "2026-09-10", KK_AYAR, KDV20)(8000).kartKomisyonu).toEqual(eskiKk);
    expect(kartTabaniEskiMi(duzenleme, FY)).toBe(true);
    const yeni = { ...duzenleme, _kartYeniTaban: true };
    expect(kartTabaniEskiMi(yeni, FY)).toBe(false);
    expect(kalipKartHesabi(yeni, "2026-09-10", KK_AYAR, KDV20)(8000).kartKomisyonu.tevkifatTaban).toBe("5/10");
    // Aynı tabanla kaydedilmiş (işaretli) anlık görüntüde uyarı yok, taban korunur.
    const isaretli = { ...duzenleme, kartKomisyonu: kalipKartHesabi(yeni, "2026-09-10", KK_AYAR, KDV20)(8000).kartKomisyonu };
    expect(kartTabaniEskiMi(isaretli, FY)).toBe(false);
    expect(satisTevkifati(kartTabanKaydi(isaretli))).toEqual({ pay: 5, payda: 10 });
    // Yedek parça kurucusu aynı kuralı uygular.
    const ypForm = { aliciTipi: "musteri", musteriId: 1, partId: "1", miktar: 2, birimFiyat: 1000, faturaTipi: FY, tarih: "2026-09-10", yontem: "Kredi Kartı", taksitSayisi: 1 };
    const ypEski = yedekParcaRec(ypForm, KK_AYAR, KDV20).rec.kartKomisyonu;
    expect(yedekParcaRec({ ...ypForm, kartKomisyonu: ypEski, ...T(5) }, KK_AYAR, KDV20).rec.kartKomisyonu).toEqual(ypEski);
  });
  it("AC-37 / AC-4 (triyaj bulgu 1): tip faturasıza ya da yurtdışına çevrilince kart tabanı ve işaret tevkifatsız; düzeltilince gereksiz uyarı yok", () => {
    const kalip = (tip, ek = {}) => ({ yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: false, faturaTipi: tip, ...ek });
    const duz = kalipKartHesabi(kalip(FY), "2026-09-10", KK_AYAR, KDV20)(100000).kartKomisyonu;
    // 1. Kutu işaretli (5/10) ama tip "Faturasız Yurtiçi"ye çevrilip kaydedildi: kayıtta tevkifat yok, anlık görüntüde işaret de yok.
    const ortak = kalipSatisOrtak(kalip("Faturasız Yurtiçi", T(5)), 1, "2026-09-10");
    expect("tevkifatli" in ortak).toBe(false);
    const kk1 = kalipKartHesabi(kalip("Faturasız Yurtiçi", T(5)), "2026-09-10", KK_AYAR, KDV20)(100000).kartKomisyonu;
    expect("tevkifatTaban" in kk1).toBe(false);
    expect("tevkifatTaban" in kalipKartHesabi(kalip("Faturalı Yurtdışı", T(5)), "2026-09-10", KK_AYAR, KDV20)(100000).kartKomisyonu).toBe(false);
    // 2. Kayıt "Faturalı Yurtiçi"ye düzeltilir, tevkifat kapalı: uyarı yok, taban 120.000 (tam KDV) ve komisyon tevkifatsızla aynı.
    const duzeltme = kalip(FY, { kartKomisyonu: kk1, _kartYeniTaban: true });
    expect(kartTabaniEskiMi({ ...kalip(FY), kartKomisyonu: kk1 }, FY)).toBe(false);
    expect(kalipKartHesabi(duzeltme, "2026-09-10", KK_AYAR, KDV20)(100000).kartKomisyonu).toEqual(duz);
    // Aynı kural yedek parçada.
    const yp = (tip) => yedekParcaRec({ aliciTipi: "musteri", musteriId: 1, partId: "1", miktar: 1, birimFiyat: 100000, faturaTipi: tip, tarih: "2026-09-10", yontem: "Kredi Kartı", taksitSayisi: 1, ...T(5) }, KK_AYAR, KDV20).rec;
    expect("tevkifatTaban" in yp("Faturasız Yurtiçi").kartKomisyonu).toBe(false);
    expect(yp("Faturalı Yurtdışı").kartKomisyonu.toplamKesinti).toBe(yedekParcaRec({ aliciTipi: "musteri", musteriId: 1, partId: "1", miktar: 1, birimFiyat: 100000, faturaTipi: "Faturalı Yurtdışı", tarih: "2026-09-10", yontem: "Kredi Kartı", taksitSayisi: 1 }, KK_AYAR, KDV20).rec.kartKomisyonu.toplamKesinti);
  });
  it("AC-37: makinada eski tabanlı kartlı tahsilat varsa uyarı koşulu doğar; yansıtma tutarı tahsil oranıyla", () => {
    const form = { id: 1, faturali: FY, ...T(5) };
    expect(makinaKartTabaniEskiMi(form, [{ customerId: 1, yontem: "Kredi Kartı", kartKomisyonu: { toplamKesinti: 10 } }])).toBe(true);
    expect(makinaKartTabaniEskiMi(form, [{ customerId: 1, yontem: "Kredi Kartı", kartKomisyonu: { toplamKesinti: 10, tevkifatTaban: "5/10" } }])).toBe(false);
    expect(makinaKartTabaniEskiMi({ ...form, tevkifatli: false }, [{ customerId: 1, yontem: "Kredi Kartı", kartKomisyonu: { toplamKesinti: 10 } }])).toBe(false);
    const a10 = kartYansitmaAyrim(1000, 1, KK_AYAR, 10, "2026-09-10"), a20 = kartYansitmaAyrim(1000, 1, KK_AYAR, 20, "2026-09-10");
    expect(a10.kartTutari).toBeLessThan(a20.kartTutari);
  });
});

describe("Spec 0079: kaynak taramaları, veri ve kapsam", () => {
  it("AC-41: servis kaydının üç alanı iki kurucuda birden yazılır (müşteri detayı ve Servis Panosu)", () => {
    for (const f of ["src/components/customers/CustomerDetailModal.jsx", "src/components/ServisPanosu.jsx"]) {
      const k = yorumsuz(oku(f));
      for (const ad of ["satisTevkifatDogrula(", "kartTabanKaydi(", "kartTabanIsaretle(", "satisTevkifatUygula("]) expect(k, `${f} ${ad}`).toContain(ad);
    }
  });
  it("AC-22: dört not tek sabitten, ekranda başka yerde düz metin yok", () => {
    for (const metin of [SATIS_TEVKIFAT_NOTU_TAHSIL, SATIS_TEVKIFAT_NOTU_CIRO, SATIS_TEVKIFAT_NOTU_SINIR, SATIS_TEVKIFAT_KART_UYARISI]) {
      const yer = dosyalar("src").filter(f => oku(f).includes(metin.slice(0, 40)));
      expect(yer, metin).toEqual(["src/lib/satisTevkifat.js"]);
    }
  });
  it("AC-23: alt sınır denetlenmez: 12.000 TL'nin altındaki tevkifatlı satış kaydedilir, uyarı yok", () => {
    expect(satisTevkifatDogrula({ faturaTipi: FY, ...T(5) }, FY)).toBeNull();
    const r = yedekParcaRec({ aliciTipi: "musteri", musteriId: 1, partId: "1", miktar: 1, birimFiyat: 10, faturaTipi: FY, ...T(5) });
    expect(r.ok).toBe(true);
    expect(r.rec).toMatchObject(T(5));
  });
  it("AC-30 / AC-35: alanları olmayan eski kayıt tevkifatsız; göç kodu, yeni izin ve sunucu/merge kuralı yok", () => {
    expect(satisTevkifati({})).toBeNull();
    expect(calcCiro({ id: 1, faturali: FY, faturaBedeli: 100, fabrikaSatisBedeli: 100 }, KDV20, [])).toBe(120);
    const db = oku("electron/db.cjs");
    expect(db).not.toMatch(/tevkifat\w*Goc|satisTevkifatGoc/i);
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/permissions.js", "src/components/settings/serverPermissionDefs.js"])
      expect(oku(f), f).not.toMatch(/tevkifat/i);
  });
});

// AC-44 (triyaj bulgu 5): iki altın dosya adıyla denetlenir. Dosyalar bu işte değişmedi (özet, spec 0079'dan önceki main
// 2a03596'daki içeriğin özetidir); tevkifatsız 0059 verisiyle faaliyet raporu altın dizeyle birebir aynı.
import { createHash } from "node:crypto";
import { faaliyetVeri, faaliyetSecenek } from "./fixtures/0059-veri";
describe("Spec 0079 AC-44: altın çıktılar", () => {
  it("AC-44: 0059-aylik-faaliyet.html tevkifatsız veriyle birebir aynı; 0059-gider-rapor-once.json ve altın HTML hiç değişmedi", () => {
    const ozet = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
    expect(ozet("tests/fixtures/0059-aylik-faaliyet.html")).toBe("a994e9dde1c8e25b9d28fd1ba4ef04ccf5f6e1efeb17364aeb412678a7d30e56");
    expect(ozet("tests/fixtures/0059-gider-rapor-once.json")).toBe("befe1ba83e688dd896b59b1618276f274eaceec833285e8f354b8dd1a0cafbaf");
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-15T09:00:00Z"));
    const r = hesaplaAylikRapor(faaliyetVeri, "2026-06", faaliyetSecenek);
    r.onceki = hesaplaAylikRapor(faaliyetVeri, "2026-05", faaliyetSecenek);
    const bos = hesaplaAylikRapor({ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }, "2026-06", faaliyetSecenek);
    const html = [buildAylikRaporHtml(r, { name: "Altuntaş <Makina>", adres: "OSB", city: "Konya", country: "Türkiye", phone: "0332", email: "a@b.c", web: "x.com" }),
      buildAylikRaporHtml(bos, { name: "Altuntaş Makina" })].join("\n<!-- ===== -->\n");
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-09T10:00:00") }); // dosyanın sabit günü geri
    expect("tevkifatliSatis" in r).toBe(false);
    expect(html).toBe(readFileSync("tests/fixtures/0059-aylik-faaliyet.html", "utf-8"));
  });
});
