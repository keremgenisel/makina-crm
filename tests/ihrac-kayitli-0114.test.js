// Spec 0114: ihraç kayıtlı teslim. Saf motor (tek kapı, dönüş şekli, kart tabanı, yazıcı, doğrulama), rapor motoru ve çıktısı,
// KDV karşılaştırması, dışa aktarma hücreleri, birleştirme ve kaynak taramaları. Ekranlar tests/ui/ihrac-kayitli-0114*.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { SALE_TYPES, SALE_TYPE_STYLE } from "../src/lib/constants";
import {
  calcKDV, satisKdvBolumu, tahsilEdilecekKdv, tahsilKdvOrani, calcKalanBorc, ihracKayitliEtkinMi, normalizeSaleType,
} from "../src/lib/utils";
import * as IHR from "../src/lib/ihracKayitli";
import {
  ihracKayitliSecilebilirMi, satisTipiSecimi, satisTipiUygula, ihracKayitliUygula, ihracKayitliDogrula, satisTipiSecenekleri,
  IHRAC_SECENEK, IHRAC_IBARE, IHRAC_TEVKIFAT_NEDENI, IHRAC_TEVKIFAT_HATASI, IHRAC_EXPORT_HEAD, ihracKayitliExportHucreleri,
  ihracKayitliRozeti, ihracRozetGosterilirMi, IHRAC_RAPOR_BASLIK, IHRAC_RAPOR_DIPNOTU, IHRAC_KDV_OZETI_DIPNOTU, IHRAC_RAPOR_SATIRLARI,
  IHRAC_KART_ETIKETI, ihracKayitliFormu, satisTipiPilStili,
} from "../src/lib/ihracKayitli";
import { kartTabanKaydi, kartTabanIsaretle, kartTabaniEskiMi, makinaKartTabaniEskiMi, satisTevkifatOzeti, satisTevkifatRozeti } from "../src/lib/satisTevkifat";
import { kalipKartHesabi, kalipSatisOrtak, kalipGuncelle, kalipSatisiEkle } from "../src/lib/kalipSatisi";
import { yedekParcaRec, yedekParcaGuncelle, topluDuzenlemePlani } from "../src/lib/yedekParcaSatis";
import { ilkSatisOdemeleri } from "../src/lib/makinaOdeme";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { buildAylikRaporHtml } from "../src/lib/printTemplates";
import { satisKdvAylar } from "../src/lib/giderKdv";
import { kdvKarsilastir } from "../src/lib/gider";
import { yedekParcaExportRow, YEDEK_PARCA_EXPORT_HEAD } from "../src/components/settings/SettingsExport";
import { buildMergePlan } from "../src/lib/merge";
import { KDV, FAB, FY, IK, T5, CUSTOMERS, PAYMENTS, PART_SALES, YEDEK, VERI, SECENEK } from "./fixtures/0114-veri";
import { KK_AYAR } from "./fixtures/0079-veri";

const oku = (f) => readFileSync(f, "utf8");
const kodu = (f) => oku(f).replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const dosyalar = (kok) => readdirSync(kok).flatMap(a => { const p = path.join(kok, a); return statSync(p).isDirectory() ? dosyalar(p) : /\.(jsx?|cjs|mjs)$/.test(a) ? [p] : []; });
const KAYIT = { ...IK, faturali: FY };

describe("Spec 0114: adlar ve kapı (AC-54, R5/2, Ö-1)", () => {
  it("AC-54: modül, dört yardımcı, alan ve dönüş anahtarlarının adları spec'teki gibi", () => {
    for (const ad of ["ihracKayitliSecilebilirMi", "satisTipiSecimi", "satisTipiUygula", "ihracKayitliUygula"]) expect(typeof IHR[ad], ad).toBe("function");
    expect(IHR.IHRAC_ALANI).toBe("ihracKayitli");
    expect(Object.keys(satisKdvBolumu(FY, 100, "2026-09-10", KDV, KAYIT))).toEqual(expect.arrayContaining(["ihracKayitli", "ertelenenKdv"]));
    expect(hesaplaAylikRapor(VERI, "2026-09", SECENEK)).toHaveProperty("ihracKayitliTeslim");
    const db = oku("electron/db.cjs");
    expect(db).toContain('const IHRAC_KAYITLI_COLUMN = [["ihracKayitli", "INTEGER"]];');
  });
  it("Ö-1: modülün kapısı ile utils'in kapısı her satış tipinde eşdeğer (eski biçimli, boş ve tanımsız dahil)", () => {
    for (const tip of [...SALE_TYPES, "Faturalı Yurt İçi", "Faturalı İhracat", "Faturalı", "Faturasız", "", undefined, null]) {
      expect(ihracKayitliEtkinMi({ ihracKayitli: true }, tip), String(tip)).toBe(ihracKayitliSecilebilirMi(tip));
    }
  });
  it("C1, C2: satış tipi listesi dört değerde kalır; seçici beş seçenek, servis seçicisi dört", () => {
    expect(SALE_TYPES).toHaveLength(4);
    expect(satisTipiSecenekleri()).toEqual([...SALE_TYPES, "İhraç Kayıtlı"]);
    expect(satisTipiSecenekleri(false)).toEqual(SALE_TYPES);
    // C1'in ölçtüğü tuzak: çözücü "ihrac" geçen her değeri Yurtdışı sayar (ör. "Faturalı ihrac kayıtlı"); bu yüzden tip DEĞERİ yazılmaz.
    expect(normalizeSaleType("Faturalı ihrac kayıtlı")).toBe("Faturalı Yurtdışı");
  });
});

describe("Spec 0114 B: KDV'nin tek kapısı", () => {
  it("AC-55: dönüş şekli işaretli kayıtta donmuş; işaretsiz ve tevkifatsızda bugünküyle aynı", () => {
    expect(satisKdvBolumu(FY, 200000, "2026-09-10", KDV, KAYIT)).toEqual({ toplamKdv: 40000, tevkifat: 0, bizKdv: 0, tevkifatli: false, ihracKayitli: true, ertelenenKdv: 40000 });
    expect(satisKdvBolumu(FY, 200000, "2026-09-10", KDV, { faturali: FY })).toEqual({ toplamKdv: 40000, tevkifat: 0, bizKdv: 40000, tevkifatli: false });
    expect(satisKdvBolumu(FY, 200000, "2026-09-10", KDV, null)).toEqual({ toplamKdv: 40000, tevkifat: 0, bizKdv: 40000, tevkifatli: false });
  });
  it("AC-14 / AC-15 / AC-16: 200.000 TL matrahta ham KDV 40.000, tahsil edilecek 0, ertelenen 40.000 ve saklanmaz", () => {
    const c = CUSTOMERS[0];
    expect(calcKDV(c.faturali, c.faturaBedeli, c.installDate, KDV)).toBe(40000);
    expect(tahsilEdilecekKdv(c.faturali, c.faturaBedeli, c.installDate, KDV, c)).toBe(0);
    const b = satisKdvBolumu(c.faturali, c.faturaBedeli, c.installDate, KDV, c);
    expect(b.ertelenenKdv).toBe(40000);
    expect(b.ertelenenKdv).toBe(b.toplamKdv);
    expect(Object.keys(c)).not.toContain("ertelenenKdv");
  });
  it("AC-17: 2023-07-07 öncesi tarihli işaretli satışta ham KDV %18 ile", () => {
    const c = CUSTOMERS[3];
    expect(satisKdvBolumu(c.faturali, c.faturaBedeli, c.installDate, KDV, c)).toMatchObject({ toplamKdv: 18000, ertelenenKdv: 18000, bizKdv: 0 });
  });
  it("AC-8 / R6: yurtdışı ya da faturasız tipte saklı kalmış işaret yok sayılır; sonuç calcKDV ile aynı", () => {
    for (const tip of ["Faturalı Yurtdışı", "Faturasız Yurtiçi", "Faturasız Yurtdışı"]) {
      expect(satisKdvBolumu(tip, 1000, "2026-09-10", KDV, IK), tip).toEqual(satisKdvBolumu(tip, 1000, "2026-09-10", KDV, null));
      expect(tahsilEdilecekKdv(tip, 1000, "2026-09-10", KDV, IK)).toBe(calcKDV(tip, 1000, "2026-09-10", KDV));
    }
    expect(satisTipiSecimi({ faturali: "Faturalı Yurtdışı", ihracKayitli: true })).toBe("Faturalı Yurtdışı");
  });
  it("R12: işaret ve tevkifat aynı kayıtta bulunursa ihraç kazanır (tahsil edilecek KDV sıfır, tevkifat rozeti yok)", () => {
    const b = satisKdvBolumu(FY, 100000, "2026-09-10", KDV, { ...IK, ...T5 });
    expect(b).toMatchObject({ bizKdv: 0, tevkifat: 0, tevkifatli: false, ertelenenKdv: 20000 });
    expect(tahsilKdvOrani(FY, "2026-09-10", KDV, { ...IK, ...T5 })).toBe(0);
  });
  it("AC-19: USD ve EUR işaretli satışta tahsil edilecek KDV sıfır, ertelenen kendi para biriminde biriktirilir", () => {
    const r = hesaplaAylikRapor(VERI, "2026-09", SECENEK).ihracKayitliTeslim;
    expect(r.ertelenenKdv.USD).toBe(200);
    expect(r.ertelenenKdv.EUR).toBe(60);
    expect(tahsilEdilecekKdv(FY, 1000, "2026-09-19", KDV, YEDEK[1])).toBe(0);
  });
  it("AC-20: tanınmayan para birimi (GBP) taşıyan işaretli kayıt TL kovasına düşer (plan Karar 33)", () => {
    const r = hesaplaAylikRapor(VERI, "2026-09", SECENEK).ihracKayitliTeslim;
    expect(Object.keys(r.ertelenenKdv).sort()).toEqual(["EUR", "TRY", "USD"]);
    expect(r.ertelenenKdv.TRY).toBe(40000 + 10000 + 4000 + 2000 + 20);
  });
});

describe("Spec 0114 B: tahsil oranı ve kart tabanı (R11, R11/2)", () => {
  const f = (o = {}) => ({ faturaTipi: FY, tarih: "2026-09-16", yontem: "Kredi Kartı", taksitSayisi: 1, ...IK, ...o });
  it("AC-18: yeni işaretli satışta tahsil oranı sıfır; kart anlık görüntüsü KDV'siz tabandan ve `ihracTaban` taşır", () => {
    expect(tahsilKdvOrani(FY, "2026-09-16", KDV, f())).toBe(0);
    const ihr = kalipKartHesabi(f(), "2026-09-16", KK_AYAR, KDV)(50000);
    const kdvsiz = kalipKartHesabi(f({ faturaTipi: "Faturasız Yurtiçi" }), "2026-09-16", KK_AYAR, KDV)(50000);
    expect(ihr.kartKomisyonu.ihracTaban).toBe(true);
    const { ihracTaban: _taban, ...gerisi } = ihr.kartKomisyonu;
    expect(gerisi).toEqual(kdvsiz.kartKomisyonu);
    // işaretsiz faturalı yurtiçinin tabanı KDV'lidir ve işaret taşımaz
    const normal = kalipKartHesabi(f({ ihracKayitli: false }), "2026-09-16", KK_AYAR, KDV)(50000);
    expect(normal.kartKomisyonu.ihracTaban).toBeUndefined();
    expect(normal.kartKomisyonu).not.toEqual(kdvsiz.kartKomisyonu);
  });
  it("AC-18: makina ilk ödemesinin anlık görüntüsü kaydın kendisinden işareti alır", () => {
    const { kayitlar } = ilkSatisOdemeleri([{ tutar: 100000, yontem: "Kredi Kartı", taksitSayisi: 1 }], {
      customerId: 9, currency: "TRY", tarih: "2026-09-10", ayar: KK_AYAR, kdvOran: 0, yeniId: () => 1, kartTaban: { faturali: FY, ...IK } });
    expect(kayitlar[0].kartKomisyonu.ihracTaban).toBe(true);
  });
  it("AC-57: kayıtlı `ihracTaban` anlık görüntüsü geri okununca taban KDV'sizdir; işaret ile taban farklıysa eskime uyarısı", () => {
    const kk = { toplamKesinti: 10, ihracTaban: true };
    const yeniden = { ...f(), kartKomisyonu: kk };
    expect(tahsilKdvOrani(FY, "2026-09-16", KDV, kartTabanKaydi(yeniden))).toBe(0);
    expect(kartTabaniEskiMi(yeniden, FY)).toBe(false);
    expect(kartTabaniEskiMi({ ...yeniden, ihracKayitli: false }, FY)).toBe(true); // işaret kaldırıldı, taban KDV'siz kaldı
    expect(kartTabaniEskiMi({ ...f(), kartKomisyonu: { toplamKesinti: 10 } }, FY)).toBe(true); // işaret sonradan açıldı
    expect(kartTabaniEskiMi({ ...f(), kartKomisyonu: { toplamKesinti: 10 }, _kartYeniTaban: true }, FY)).toBe(false);
    // eski anlık görüntü (işaretsiz) işaretsiz kayıtla eski sayılmaz (0079 R13 kuralı)
    expect(kartTabaniEskiMi({ ...f({ ihracKayitli: false }), kartKomisyonu: { toplamKesinti: 10 } }, FY)).toBe(false);
    const pay = (kartKomisyonu) => [{ id: 1, customerId: 7, yontem: "Kredi Kartı", kartKomisyonu }];
    expect(makinaKartTabaniEskiMi({ id: 7, faturali: FY, ...IK }, pay({ toplamKesinti: 1 }))).toBe(true);
    expect(makinaKartTabaniEskiMi({ id: 7, faturali: FY, ...IK }, pay({ toplamKesinti: 1, ihracTaban: true }))).toBe(false);
    expect(kartTabanIsaretle({ a: 1 }, { faturaTipi: "Faturalı Yurtdışı", ...IK })).toEqual({ a: 1 }); // kapı kapalı: işaret yok
  });
});

describe("Spec 0114 A: seçim çevrimi ve tek yazıcı", () => {
  it("R5, AC-56, AC-67 (saf yarısı): seçim yardımcısı yalnız satış tipi ve işaret anahtarlarını döndürür; ihraçta tevkifatı temizler", () => {
    expect(satisTipiUygula(IHRAC_SECENEK)).toEqual({ faturaTipi: FY, ihracKayitli: true, tevkifatli: false, tevkifatPay: null, tevkifatPayda: null });
    expect(satisTipiUygula(IHRAC_SECENEK, "faturali")).toMatchObject({ faturali: FY, ihracKayitli: true });
    expect(satisTipiUygula("Faturasız Yurtiçi", "faturali")).toEqual({ faturali: "Faturasız Yurtiçi", ihracKayitli: false });
    expect(satisTipiSecimi({ faturaTipi: FY, ...IK })).toBe(IHRAC_SECENEK);
    expect(satisTipiSecimi({ faturali: FY, ...IK })).toBe(IHRAC_SECENEK);
    expect(satisTipiSecimi({ faturaTipi: "" })).toBe(FY);
  });
  it("R6/2, C5: yazıcı alanı her çağrıda siler, yalnız kapı açık ve form işaretliyken `true` yazar (false yazılmaz)", () => {
    expect(ihracKayitliUygula({ a: 1, ihracKayitli: true }, { ihracKayitli: false }, FY)).toEqual({ a: 1 });
    expect(ihracKayitliUygula({ a: 1 }, IK, FY)).toEqual({ a: 1, ihracKayitli: true });
    expect(ihracKayitliUygula({ a: 1, ihracKayitli: true }, IK, "Faturalı Yurtdışı")).toEqual({ a: 1 });
  });
  it("AC-10 (saf yarısı), R7/2: işaret açıkken yazıcı tevkifat alanlarını kayıttan siler", () => {
    expect(ihracKayitliUygula({ a: 1, ...T5 }, IK, FY)).toEqual({ a: 1, ihracKayitli: true });
    expect(ihracKayitliUygula({ a: 1, ...T5 }, {}, FY)).toEqual({ a: 1, ...T5 }); // işaretsizde tevkifata dokunmaz
  });
  it("AC-11: işaret ve tevkifat birlikte gelirse doğrulama reddeder; iki kurucu bu kaydı yazmaz (formdan üretilemez, R12/2)", () => {
    expect(ihracKayitliDogrula({ ...IK, ...T5 }, FY)).toBe(IHRAC_TEVKIFAT_HATASI);
    expect(ihracKayitliDogrula(IK, FY)).toBeNull();
    expect(ihracKayitliDogrula({ ...IK, ...T5 }, "Faturasız Yurtiçi")).toBeNull();
    const ypForm = { aliciTipi: "musteri", musteriId: 1, partId: "81", miktar: 1, birimFiyat: 100, faturaTipi: FY, ...IK, ...T5 };
    expect(yedekParcaRec(ypForm)).toEqual({ ok: false, hata: IHRAC_TEVKIFAT_HATASI });
    const kalip = kalipSatisiEkle({ customerId: 1, faturaTipi: FY, kaliplar: [{ ad: "K", fiyat: 10 }], ...IK, ...T5 },
      { customers: [{ id: 1 }], setPartSales: () => {}, setCustomers: () => {}, uid: () => 1, simdi: () => "x", bugun: "2026-09-10", kdvRates: KDV });
    expect(kalip).toEqual({ hata: IHRAC_TEVKIFAT_HATASI });
  });
  it("AC-12 (saf yarısı) / AC-13 / R8: ücretsiz yedek parçada işaret silinir (yeni kayıt ve düzenleme)", () => {
    const form = { aliciTipi: "musteri", musteriId: 1, partId: "81", miktar: 1, birimFiyat: 100, faturaTipi: FY, ...IK, ucretsizMi: true };
    expect(yedekParcaRec(form).rec.ihracKayitli).toBeUndefined();
    expect(yedekParcaGuncelle({ id: 5, ...IK, faturaTipi: FY }, { faturaTipi: "" }, form).ihracKayitli).toBeUndefined();
    expect(yedekParcaRec({ ...form, ucretsizMi: false }).rec.ihracKayitli).toBe(true);
  });
  it("AC-64 (saf yarısı): Extra Kalıp ve yedek parça yollarında dokunulmadan işaret korunur, tip değişince gövdede yok", () => {
    const eskiKalip = PART_SALES[0];
    const ac = { ...eskiKalip, ...ihracKayitliFormu(eskiKalip) };
    expect(kalipGuncelle(eskiKalip, { ucret: 50000 }, ac).ihracKayitli).toBe(true);
    expect("ihracKayitli" in kalipGuncelle(eskiKalip, { ucret: 50000 }, { ...ac, ...satisTipiUygula("Faturalı Yurtdışı") })).toBe(false);
    expect(kalipSatisOrtak({ faturaTipi: FY, ...IK }, 1, "2026-09-10").ihracKayitli).toBe(true);
    expect("ihracKayitli" in kalipSatisOrtak({ faturaTipi: "Faturasız Yurtiçi", ...IK }, 1, "2026-09-10")).toBe(false);
    const eskiYp = YEDEK[0];
    const ypForm = { ...eskiYp, miktar: String(eskiYp.miktar) };
    const r = yedekParcaRec(ypForm);
    expect(yedekParcaGuncelle(eskiYp, r.rec, ypForm).ihracKayitli).toBe(true);
    const tipli = { ...ypForm, ...satisTipiUygula("Faturalı Yurtdışı") };
    expect("ihracKayitli" in yedekParcaGuncelle(eskiYp, yedekParcaRec(tipli).rec, tipli)).toBe(false);
  });
  it("AC-64 (0111 yolu): toplu düzenleme planı formdaki işareti partinin bütün satırlarına korur", () => {
    const parti = [{ ...YEDEK[0], batchId: 9 }, { ...YEDEK[0], id: 36, batchId: 9 }];
    const form = { ...parti[0], ...ihracKayitliFormu(parti[0]), batchEdit: true, _acilisIdleri: [31, 36], satirlar: parti.map(s => ({ _kayitId: s.id, partId: s.partId, miktar: "10", birimFiyat: 1000 })) };
    const p = topluDuzenlemePlani(parti, form, { yeniId: () => 99, olusturmaZamani: "t", silmeDamgasi: "d", bugun: "2026-10-28" });
    expect(p.ok).toBe(true);
    expect(p.guncellenen.map(k => k.ihracKayitli)).toEqual([true, true]);
  });
  it("Ek düzeltme: satış tipi pilinin rengi; ihraç teal, dört tip SALE_TYPE_STYLE'dan, tanınmayan gri", () => {
    expect(satisTipiPilStili(IHRAC_SECENEK)).toEqual({ bg: "var(--tealBg, #f0fdfa)", fg: "var(--teal2, #0f766e)" });
    for (const t of SALE_TYPES) expect(satisTipiPilStili(t), t).toEqual(SALE_TYPE_STYLE[t]);
    expect(satisTipiPilStili("Bilinmeyen")).toEqual({ bg: "var(--n150, #f1f5f9)", fg: "var(--n600, #475569)" });
    // İki pil aynı kaynaktan okur, kendi renk tablosunu yazmaz (tarama).
    for (const f of ["src/components/Customers.jsx", "src/components/customers/detail/MachineTimeline.jsx"]) expect(kodu(f), f).not.toMatch(/SALE_TYPE_STYLE/);
    expect(kodu("src/components/customers/detail/deriveCustomerDetail.js")).toMatch(/tip: satisTipiSecimi\(detailView\)/);
  });
  it("ihracKayitliFormu: yalnız etkin işareti forma taşır", () => {
    expect(ihracKayitliFormu({ faturaTipi: FY, ...IK })).toEqual(IK);
    expect(ihracKayitliFormu({ faturaTipi: "Faturalı Yurtdışı", ...IK })).toEqual({});
    expect(ihracKayitliFormu({ faturaTipi: FY })).toEqual({});
  });
});

describe("Spec 0114 C: borç ve alacak", () => {
  it("AC-21: işaretli 200.000 bedelli, 150.000 tahsil edilmiş makinanın kalan borcu 50.000 (işaretsizde 90.000)", () => {
    const c = CUSTOMERS[0];
    expect(calcKalanBorc(c, PAYMENTS, KDV)).toBe(50000);
    const { ihracKayitli: _ik, ...isaretsiz } = c;
    expect(calcKalanBorc(isaretsiz, PAYMENTS, KDV)).toBe(90000);
  });
  it("R25, R25/2: form özeti beş satırın rakamlarını motordan verir; tahsil edilecek fatura toplamı matraha eşit", () => {
    expect(satisTevkifatOzeti(FY, 200000, "2026-09-10", KDV, KAYIT)).toEqual({ matrah: 200000, toplamKdv: 40000, tevkifat: 0, bizKdv: 0,
      faturaToplami: 200000, tevkifatli: false, ihracKayitli: true, ertelenenKdv: 40000 });
    expect(satisTevkifatOzeti(FY, 200000, "2026-09-10", KDV, { faturali: FY })).not.toHaveProperty("ihracKayitli");
  });
});

describe("Spec 0114 C: KDV karşılaştırması ve Finans ile rapor", () => {
  it("AC-24: ertelenen KDV hesaplanan satış KDV'sine girmez ve farkı değiştirmez", () => {
    const { kdv, ertelenen } = satisKdvAylar(VERI, ["2026-09"], SECENEK);
    const sonuc = kdvKarsilastir(kdv, 1000, 0, 0, { ertelenenKdvTL: ertelenen.TRY });
    const isaretsiz = satisKdvAylar({ ...VERI, customers: VERI.customers.map(({ ihracKayitli: _ik, ...c }) => c) }, ["2026-09"], SECENEK);
    expect(sonuc.hesaplananTL).toBe(kdv.TRY);
    expect(isaretsiz.kdv.TRY - kdv.TRY).toBe(40000); // makinanın 40.000'i hesaplanandan düştü
    expect(sonuc.fark).toBe(Math.round((kdv.TRY - 1000) * 100) / 100);
    expect(sonuc.ertelenenKdv).toBe(ertelenen.TRY);
  });
  it("C11, AC-58 (saf yarısı): seçenek verilmeyen çağrı birebir eski; 0047 raporunun iki argümanlı çağrısı değişmedi", () => {
    const k = { TRY: 5000, USD: 10 };
    expect(kdvKarsilastir(k, 1000)).toEqual(kdvKarsilastir(k, 1000, undefined, undefined, {}));
    expect(kdvKarsilastir(k, 1000)).not.toHaveProperty("ertelenenKdv");
    expect(kodu("src/lib/giderRaporu.js")).not.toMatch(/ertelenen|ihracKayitli/);
    expect(kodu("src/lib/giderRaporu.js").match(/kdvKarsilastir\(([^)]*)\)/)[1].split(",")).toHaveLength(2);
  });
  it("AC-29 / C9: tek ay için Finans'ın kaynağı (satisKdvAylar) ile aylık rapor ertelenen KDV'yi aynı üretir", () => {
    const rapor = hesaplaAylikRapor(VERI, "2026-09", SECENEK).ihracKayitliTeslim;
    expect(satisKdvAylar(VERI, ["2026-09"], SECENEK).ertelenen).toEqual(rapor.ertelenenKdv);
  });
  it("AC-46 / AC-47 / R33: rapor KDV toplamı ertelenen KDV'yi saymaz; işaretli makina 'Faturalı Yurtiçi' satırında, beşinci satır yok", () => {
    const r = hesaplaAylikRapor(VERI, "2026-09", SECENEK);
    const isaretsiz = hesaplaAylikRapor({ ...VERI, customers: VERI.customers.map(({ ihracKayitli: _ik, ...c }) => c) }, "2026-09", SECENEK);
    expect(isaretsiz.toplamKdv.TRY - r.toplamKdv.TRY).toBe(40000);
    const tipler = r.makinaFaturaKirilimi.map(x => x.tip ?? x.faturaTipi ?? x.ad);
    expect(tipler).not.toContain(IHRAC_SECENEK);
    expect(JSON.stringify(r.makinaFaturaKirilimi)).toContain(FY);
  });
  it("R31: ayında teslim yoksa rapor nesnesinde alan hiç yok", () => {
    expect(hesaplaAylikRapor(VERI, "2026-08", SECENEK)).not.toHaveProperty("ihracKayitliTeslim");
  });
});

describe("Spec 0114 E: aylık rapor kutusu", () => {
  const html = (ay = "2026-09", veri = VERI) => buildAylikRaporHtml(hesaplaAylikRapor(veri, ay, SECENEK), FAB);
  it("AC-42 / AC-43 / AC-60: kutu teslim adedini, matrahı, toplam KDV'yi, ertelenen KDV'yi ve matraha eşit beşinci rakamı yazar", () => {
    const r = hesaplaAylikRapor(VERI, "2026-09", SECENEK).ihracKayitliTeslim;
    expect(r.adet).toBe(7); // makina, iki ücretli kalıp, dört yedek parça (ücretsiz kalıp atlanır)
    expect(r.matrah.TRY).toBe(280100);
    expect(r.faturaToplami).toEqual(r.matrah);
    const h = html();
    expect(h).toContain(IHRAC_RAPOR_BASLIK);
    expect(h).toContain("7 teslim");
    for (const e of Object.values(IHRAC_RAPOR_SATIRLARI)) expect(h).toContain(e);
    expect(IHRAC_RAPOR_SATIRLARI.faturaToplami).toBe("Tahsil edilecek fatura toplamı");
    expect(IHRAC_RAPOR_DIPNOTU).toContain("matraha eşittir");
  });
  it("AC-42 (triyaj 1): aynı batchId'li iki satırlı yedek parça partisi tek teslim sayılır; partisiz iki satır iki teslim", () => {
    const adet = (yp) => hesaplaAylikRapor({ ...VERI, yedekParcaSatislar: [...YEDEK, ...yp] }, "2026-09", SECENEK).ihracKayitliTeslim.adet;
    const satir = (id, o = {}) => ({ ...YEDEK[0], id, ...o });
    expect(adet([])).toBe(7);
    expect(adet([satir(41, { batchId: 900 }), satir(42, { batchId: 900 })])).toBe(8); // bir parti, bir fatura, bir teslim
    expect(adet([satir(41), satir(42)])).toBe(9); // partisiz iki kayıt iki teslim
    // aynı mantık Extra Kalıp'ta da: iki kalemli bir parti tek teslim
    const kalip = (id) => ({ ...PART_SALES[0], id, batchId: 901 });
    expect(hesaplaAylikRapor({ ...VERI, partSales: [...PART_SALES, kalip(51), kalip(52)] }, "2026-09", SECENEK).ihracKayitliTeslim.adet).toBe(8);
  });
  it("AC-44 / AC-68: dipnot ertelenen KDV'nin KDV özetine ve açık alacağa girmediğini ve kırılımın KDV'sini yazar", () => {
    expect(html()).toContain(IHRAC_RAPOR_DIPNOTU.replace(/"/g, "\""));
    expect(IHRAC_RAPOR_DIPNOTU).toMatch(/KDV özetine ve açık alacağa girmez/);
    expect(IHRAC_RAPOR_DIPNOTU).toMatch(/"Faturalı Yurtiçi" satırının KDV'si ertelenen KDV'yi içermez/);
  });
  it("AC-45 / AC-69 / R31: teslim olmayan ayda kutu ve iki dipnot hiç basılmaz; teslim olan ayda KDV özetinin altında kardeş dipnot", () => {
    const bos = html("2026-08");
    expect(bos).not.toContain(IHRAC_RAPOR_BASLIK);
    expect(bos).not.toContain(IHRAC_KDV_OZETI_DIPNOTU);
    expect(html()).toContain(IHRAC_KDV_OZETI_DIPNOTU);
  });
  it("AC-48 / AC-70: tevkifat kutusu ve dipnotu önce, ihraç kutusu ve dipnotu hemen sonra", () => {
    const h = html();
    expect(h).toContain("TEVKİFATLI SATIŞLAR");
    expect(h.indexOf("TEVKİFATLI SATIŞLAR")).toBeLessThan(h.indexOf(IHRAC_RAPOR_BASLIK));
    const tevDip = h.indexOf("Tevkifatlı satış var:");
    expect(tevDip).toBeGreaterThan(-1);
    expect(tevDip).toBeLessThan(h.indexOf(IHRAC_KDV_OZETI_DIPNOTU));
    expect(h.indexOf(IHRAC_KDV_OZETI_DIPNOTU)).toBeLessThan(h.indexOf("TEVKİFATLI SATIŞLAR"));
    // ihraç kutusu tevkifat kutusunun HEMEN altında: aralarında başka bölüm başlığı yok
    const ara = h.slice(h.indexOf("TEVKİFATLI SATIŞLAR"), h.indexOf(IHRAC_RAPOR_BASLIK));
    expect(ara).not.toMatch(/VERİLEN TEKLİFLER|BAKIM ONARIM/);
  });
  it("AC-59 (rapor yarısı): USD işaretli satışta kutu USD rakamını basar", () => {
    expect(html()).toMatch(/\$|USD/);
    const r = hesaplaAylikRapor(VERI, "2026-09", SECENEK).ihracKayitliTeslim;
    expect(r.matrah.USD).toBe(1000);
  });
  it("AC-66: işaretli ve ücretsiz Extra Kalıp rapor kutusuna matrah katmaz ve rozet taşımaz", () => {
    const sadeceUcretsiz = { ...VERI, customers: [], yedekParcaSatislar: [], partSales: [PART_SALES[1]] };
    expect(hesaplaAylikRapor(sadeceUcretsiz, "2026-09", SECENEK)).not.toHaveProperty("ihracKayitliTeslim");
    expect(ihracRozetGosterilirMi(PART_SALES[1], FY)).toBe(false);
    expect(ihracRozetGosterilirMi(PART_SALES[0], FY)).toBe(true);
  });
});

describe("Spec 0114 D: metinler ve dışa aktarma", () => {
  it("R23/2, Karar 26, AC-9 metni: ibare ve tevkifat nedeni spec'teki birebir metin", () => {
    expect(IHRAC_IBARE).toBe("3065 sayılı KDV Kanunu'nun 11/1-c maddesi hükümlerine göre ihraç edilmek şartıyla teslim edildiğinden KDV tahsil edilmemiştir.");
    expect(IHRAC_TEVKIFAT_NEDENI).toBe("İhraç kayıtlı teslimde tevkifat uygulanmaz.");
    expect(ihracKayitliRozeti("40.000 ₺")).toBe("İHRAÇ KAYITLI · tecil edilen KDV 40.000 ₺");
    expect(IHRAC_KART_ETIKETI).not.toBe("Tevkifatlı satışta alıcının beyan edeceği KDV");
  });
  it("AC-65 (yedek parça): satırın sonunda iki sütun; işaretlide 'Evet' ve tutar, işaretsizde boş", () => {
    expect(YEDEK_PARCA_EXPORT_HEAD.slice(-2)).toEqual(IHRAC_EXPORT_HEAD);
    expect(IHRAC_EXPORT_HEAD).toEqual(["İhraç Kayıtlı", "Ertelenen KDV"]);
    const ctx = { kdvRates: KDV, parts: [{ id: 81, ad: "Rulman" }], customers: CUSTOMERS, dealers: [] };
    expect(yedekParcaExportRow(YEDEK[0], ctx).slice(-2)).toEqual(["Evet", 2000]);
    expect(yedekParcaExportRow(YEDEK[4], ctx).slice(-2)).toEqual(["", ""]);
    expect(ihracKayitliExportHucreleri(FY, 100, "2026-09-10", KDV, { faturaTipi: FY })).toEqual(["", ""]);
  });
  it("rozet: tevkifat rozeti metni değişmedi (işaretli kayıtta tevkifat rozeti çizilmez çünkü tevkifatli false)", () => {
    expect(satisTevkifatRozeti(T5, "x")).toBe("Tevkifat 5/10 · alıcı beyan eder: x");
    expect(satisKdvBolumu(FY, 100, "2026-09-10", KDV, { ...IK, ...T5 }).tevkifatli).toBe(false);
  });
});

describe("Spec 0114: veri, birleştirme, sunucu (C5, C7, AC-53)", () => {
  it("AC-53: birleştirme kuralı değişmez; yeni kayıt işaretiyle eklenir, kod işareti bilmez", () => {
    const sunucu = { customers: [], partSales: [], yedekParcaSatislar: [] };
    const plan = buildMergePlan({ customers: [{ id: 777, name: "Yeni", faturali: FY, ...IK }], partSales: [], yedekParcaSatislar: [] }, sunucu);
    expect(plan.adds.customers[0].ihracKayitli).toBe(true);
    expect(oku("src/lib/merge.js")).not.toMatch(/ihracKayitli/);
  });
  it("C7, AC-52 (kaynak yarısı): sunucu, izin ve alan izinleri işareti bilmez", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"]) {
      expect(oku(f), f).not.toMatch(/ihracKayitli|ihrac_kayitli/);
    }
  });
  it("C5 (kaynak yarısı): üç tablo dört noktada, servis tablosunda sütun yok; okumalar destructuring ile ayırır", () => {
    const db = oku("electron/db.cjs");
    expect(db).toContain('for (const t of ["customers", "part_sales", "yedek_parca_satis"]) ensureColumns(conn, t, IHRAC_KAYITLI_COLUMN);');
    expect(db.match(/@ihracKayitli\)/g)).toHaveLength(3);
    expect(db.match(/ihracKayitli: ihracYaz\(/g)).toHaveLength(3);
    expect(db.match(/\.\.\.ihracOku\(ihracKayitli\)/g)).toHaveLength(3);
    const servisSema = db.slice(db.indexOf("CREATE TABLE IF NOT EXISTS services ("), db.indexOf(");", db.indexOf("CREATE TABLE IF NOT EXISTS services (")));
    expect(servisSema).not.toMatch(/ihracKayitli/);
  });
});

describe("Spec 0114: kaynak taramaları (C3, C10, C12, R4, R28, AC-41)", () => {
  const src = dosyalar("src");
  it("AC-64 / C12 (Ö-2): `ihracKayitli` kayda yalnız ihracKayitli.js'te yazılır; iki gerekçeli istisna", () => {
    // Yakalanan: atama (`.ihracKayitli =`), silme (`delete x.ihracKayitli`) ve nesne değişmezi içinde anahtar (`ihracKayitli:`).
    // İstisnalar kayıt değil: motorun dönüş şekli (utils.js, R9/2), kart tabanının geri okunan nesnesi ve formun KDV kutusu
    // özetinin dönüşü (satisTevkifat.js, R11/2 ve R25).
    const ISTISNA = { "src/lib/utils.js": 1, "src/lib/satisTevkifat.js": 2 };
    const bulunan = {};
    for (const f of src) {
      if (f === "src/lib/ihracKayitli.js") continue;
      const n = (kodu(f).match(/\.ihracKayitli\s*=(?!=)|delete\s+[\w.[\]"]+\.ihracKayitli|[{,]\s*ihracKayitli\s*:/g) || []).length;
      if (n) bulunan[f] = n;
    }
    expect(bulunan).toEqual(ISTISNA);
  });
  it("R4, R5: dört form kendi satış tipi seçenek listesini yazmaz (SALE_TYPES formlarda geçmez)", () => {
    for (const f of ["src/components/customers/CustomerAddEditForm.jsx", "src/components/PartSaleForm.jsx", "src/components/YedekParcaSatisForm.jsx", "src/components/ServiceForm.jsx"]) {
      expect(kodu(f), f).not.toMatch(/SALE_TYPES/);
      expect(kodu(f), f).toMatch(/<SatisTipiSecici /);
    }
    expect(kodu("src/components/ServiceForm.jsx")).toMatch(/<SatisTipiSecici[^>]*ihracDahil=\{false\}/);
  });
  it("AC-41 / R28: rozet, satır, ibare ve rapor metinlerinin düz metni ekran ve rapor dosyalarında geçmez", () => {
    const metinler = ["İHRAÇ KAYITLI", "tecil edilen KDV", "11/1-c", "İhraç kayıtlı teslimde", "İhraç kayıtlı fatura:", "Ertelenen KDV", "İHRAÇ KAYITLI TESLİMLER", "İhraç Kayıtlı"];
    for (const f of src) {
      if (f === "src/lib/ihracKayitli.js") continue;
      for (const m of metinler) expect(kodu(f).includes(m), `${f}: ${m}`).toBe(false);
    }
  });
  it("C3 / C10: ertelenen KDV ekranlarda hesaplanmaz; yeni bir KDV çarpımı yazılmaz", () => {
    for (const f of ["src/components/IhracKayitliAlani.jsx", "src/components/SatisTipiSecici.jsx", "src/components/customers/detail/PaymentSection.jsx", "src/components/gider/KdvKarsilastirmaKarti.jsx"]) {
      expect(kodu(f), f).not.toMatch(/calcKDV\(|getKdvRateForDate\(|\*\s*\d+\s*\/\s*100/);
    }
    expect(kodu("src/lib/ihracKayitli.js")).not.toMatch(/calcKDV\(|getKdvRateForDate\(/);
  });
  it("R5/2: modül React almaz ve gider motoruna bağlanmaz; satisTevkifat.js modülü içe almaz (döngü yok, Ö-1)", () => {
    const m = oku("src/lib/ihracKayitli.js");
    expect(m).not.toMatch(/from "react"|from "\.\/gider"|giderKdv/);
    expect(oku("src/lib/satisTevkifat.js")).not.toMatch(/ihracKayitli"/);
    expect(oku("src/lib/utils.js")).not.toMatch(/from "\.\/ihracKayitli"/);
  });
});

// Kapanış belge düzeni (0111–0113 emsali). Plan specs/done'a taşındığında CLAUDE.md'nin 0114 bölümü commit satırını taşır,
// TASINACAK'ta 0114 yok, eski spec kopyası kalmaz, kanıt kayıtları tabanda `ayni`dır, açık madde SCORECARD'da yazılıdır.
describe("Spec 0114: kapanış belge düzeni", () => {
  it("plan done'daysa: 'Tamamlandı: commit', TASINACAK'ta 0114 yok, eski kopya yok, kanıt tabanda ayni, açık madde yazılı", async () => {
    const { existsSync } = await import("node:fs");
    if (!existsSync("specs/done/0114-uygulama-plani.md")) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0114, plan"), claude.indexOf("(spec 0113, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(bolum).not.toMatch(/specs\/0114-/);
    expect(oku("tests/spec-atiflari.test.js")).not.toMatch(/TASINACAK = \[[^\]]*0114/);
    expect(existsSync("specs/0114-ihrac-kayitli-fatura.md")).toBe(false);
    const kayitlar = Object.values(JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar).flat().filter(k => k.rapor.includes("/0114-"));
    expect(kayitlar.length).toBeGreaterThan(0);
    expect(kayitlar.filter(k => k.beklenen === "degisti" || k.onay)).toEqual([]);
    const spec = oku("specs/done/0114-ihrac-kayitli-fatura.md");
    expect(spec).toMatch(/\| \*\*Durum\*\* \| Tamamlandı/);
    expect(spec).toMatch(/\*\*Açık madde:\*\* Extra Kalıp düzenleme formu tevkifat/);
    expect(oku("specs/README.md")).toMatch(/\| \*\*0114\*\* \| [^|]*\(Tamamlandı\)/);
  });
});
