// Spec 0157: parça maliyeti döviz cinsinden (elle maliyet ve işlem kalemi). Motor, maliyet geçmişi, Excel, sipariş motoru ve
// belgesi, taramalar. Test adları AC-<n> taşır. Kıyas (lira veride birebir) `tests/ui/doviz-parca-0157-kiyas.test.jsx`'te.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as U from "../src/lib/urunAgaci";
import { malzemeKatalogu, malzemeOzeti } from "../src/lib/malzeme";
import { KUR_KAYNAK, KUR_SAPMA_ORANI, KUR_CEVRIMDISI, KUR_ALINMADI } from "../src/lib/kur";
import { BELIRSIZ_HATASI } from "../src/lib/tutarGirdisi";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { modelMaliyetleri, partiHesabi } from "../src/lib/makinaStandartMaliyet";
import { PARCA_AKTARMA_BASLIKLARI, PARCA_SABLON_ORNEGI, parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula } from "../src/lib/parcaAktarma";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml } from "../src/lib/siparisRaporu";
import { PARCALAR, MALZEMELER, MODELLER, BUGUN, FACTORY, veri } from "./fixtures/0157-veri.js";

const MK = malzemeKatalogu(MALZEMELER);
const KAT = U.setKatalogu(PARCALAR);
const ITHAL = { id: 30, ad: "İthal rulman", tedarikciId: 22, maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40 };
const kod = (dosya) => fs.readFileSync(dosya, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const srcDosyalari = (kok) => fs.readdirSync(kok, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? srcDosyalari(`${kok}/${d.name}`) : /\.(js|jsx)$/.test(d.name) ? [`${kok}/${d.name}`] : []));

describe("Spec 0157 A: elle maliyet", () => {
  it("AC-7: 120 USD ve 40 kurla lira karşılığı 4.800 TL", () => {
    expect(U.parcaMaliyetKurus(ITHAL)).toBe(480000);
    expect(U.parcaMaliyetMetni(ITHAL)).toBe("4.800,00 ₺");
  });
  it("AC-60: kuruş sapmalı çevrim (33,33 USD × 41,1234) tek yuvarlamayla", () => {
    // 3333 kuruş × 41,1234 = 137064,29… → 137064 (bir kez kuruşa)
    expect(U.parcaMaliyetKurus({ maliyet: 33.33, maliyetParaBirimi: "USD", maliyetKuru: 41.1234 })).toBe(137064);
    expect(U.maliyetKalemleriOzeti([{ tur: "islem", ad: "Kaplama", tutar: 33.33, paraBirimi: "EUR", kur: 41.1234 }]).toplamK).toBe(137064);
  });
  it("AC-8 / AC-9: maliyet donmuş kurdan; günün kuru okunmaz, kur güncellenip kaydedilince yeni kurdan", () => {
    expect(U.parcaMaliyetKurus(ITHAL)).toBe(480000); // motor rates almaz
    expect(fs.readFileSync("src/lib/urunAgaci.js", "utf8")).not.toMatch(/bugunkuKurus = \([^)]*rates/);
    expect(U.parcaMaliyetKurus({ ...ITHAL, maliyetKuru: 42 })).toBe(504000);
  });
  it("AC-7 / R7 / AC-32: kuru girilmemiş döviz ve tanınmayan para birimi \"girilmedi\" (asla sıfır); boş ya da TRY lira", () => {
    expect(U.parcaMaliyetKurus({ ...ITHAL, maliyetKuru: undefined })).toBeNull();
    expect(U.parcaMaliyetKurus({ ...ITHAL, maliyetKuru: 0 })).toBeNull();
    expect(U.parcaMaliyetKurus({ ...ITHAL, maliyetParaBirimi: "GBP" })).toBeNull();
    expect(U.maliyetGirildiMi({ ...ITHAL, maliyetParaBirimi: "GBP" })).toBe(false);
    expect(U.parcaMaliyetKurus({ maliyet: 12.5, maliyetParaBirimi: "TRY" })).toBe(1250);
    expect(U.parcaMaliyetKurus({ maliyet: 12.5, maliyetParaBirimi: "" })).toBe(1250);
  });
  it("AC-37: kardeş okuyucu yalnız çözülen elle döviz maliyette dolu; lira, kalem listeli, set ve kursuz parçada null", () => {
    expect(U.parcaDovizMaliyeti(ITHAL)).toEqual({ tutar: 120, paraBirimi: "USD", kur: 40 });
    expect(U.parcaDovizMaliyeti({ maliyet: 12 })).toBeNull();
    expect(U.parcaDovizMaliyeti({ ...ITHAL, maliyetKalemleri: [{ tur: "islem", ad: "X", tutar: 10 }] })).toBeNull();
    expect(U.parcaDovizMaliyeti({ ...ITHAL, setIcerigi: [{ partId: 4, miktar: 1 }] })).toBeNull();
    expect(U.parcaDovizMaliyeti({ ...ITHAL, maliyetKuru: null })).toBeNull();
  });
  it("AC-42 / AC-52 / AC-6: tek yazıcı: tutar tutar ayrıştırıcısıyla, kur kur ayrıştırıcısıyla; TL'de iki alan yok; dövizde kur zorunlu", () => {
    expect(U.elleMaliyetDogrula("1.234,5", "USD", "40.5").alanlar).toEqual({ maliyet: 1234.5, maliyetParaBirimi: "USD", maliyetKuru: 40.5 });
    expect(U.elleMaliyetDogrula("1.234,5", "", "40").alanlar).toEqual({ maliyet: 1234.5 });
    expect(U.elleMaliyetDogrula("1.234,5", "TRY", "").alanlar).toEqual({ maliyet: 1234.5 });
    expect(U.elleMaliyetDogrula("120", "USD", "").kurHata).toBe("Kur girilmedi; kur olmadan kaydedilmez.");
    expect(U.elleMaliyetDogrula("120", "USD", "40,12345").kurHata).toBe("Kur en çok 4 ondalık hane taşır.");
    // Öneriden ya da kayıttan gelen kur altı ondalık taşıyabilir (kaynağı).
    expect(U.elleMaliyetDogrula("120", "USD", "50,370257", KUR_KAYNAK.TURETILEN).alanlar.maliyetKuru).toBe(50.370257);
    expect(U.elleMaliyetDogrula("", "USD", "40").alanlar).toEqual({}); // tutar boşsa hiçbir alan
    // Triyaj (bulgu 2, R19/2): tanınmayan para birimi kaydedilmez, nedeni kartın metni.
    expect(U.elleMaliyetDogrula("120", "GBP", "50")).toEqual({ alanlar: {}, hata: null, kurHata: null, pbHata: U.MALIYET_PB_TANINMAYAN_NEDENI });
    expect(U.elleMaliyetNedeni("GBP", "50")).toBe(U.MALIYET_PB_TANINMAYAN_NEDENI);
    expect(U.elleMaliyetNedeni("USD", "")).toBe(U.MALIYET_KUR_EKSIK_NEDENI);
    expect([U.elleMaliyetNedeni("USD", "40"), U.elleMaliyetNedeni("", ""), U.elleMaliyetNedeni("TRY", "")]).toEqual([null, null, null]);
    // Triyaj (bulgu 1): alandaki metin kayıtlı kurun form metniyse kayıttaki (uzun ondalıklı) kur aynen yazılır.
    expect(U.elleMaliyetDogrula("120", "USD", "41,123457", KUR_KAYNAK.TURETILEN, 41.12345678).alanlar.maliyetKuru).toBe(41.12345678);
    expect(U.elleMaliyetDogrula("120", "USD", "41,5", KUR_KAYNAK.ELLE, 41.12345678).alanlar.maliyetKuru).toBe(41.5);
    // İşlem kaleminde belirsiz tutar reddi bugünkü metniyle sürer; kur ayrıştırıcısı noktayı ondalık sayar.
    const d = U.kalemlerDogrula([{ tur: "islem", ad: "Lazer", tutar: "2.400", paraBirimi: "USD", kur: "40" }, { tur: "islem", ad: "Büküm", tutar: "10", paraBirimi: "USD", kur: "40.5" }]);
    expect(d.hatalar[0].tutar).toBe(BELIRSIZ_HATASI);
    expect(d.kayit).toEqual([{ tur: "islem", ad: "Büküm", tutar: 10, paraBirimi: "USD", kur: 40.5 }]);
  });
  it("AC-43 / AC-13: işlem kalemi para birimi ve kuru kendisinde; TL kalemde iki anahtar yok; tutarı boş döviz kalem para birimini korur", () => {
    const d = U.kalemlerDogrula([{ tur: "islem", ad: "A", tutar: "10" }, { tur: "islem", ad: "B", tutar: "5", paraBirimi: "TRY", kur: "40" },
      { tur: "islem", ad: "C", tutar: "", paraBirimi: "EUR", kur: "" }, { tur: "islem", ad: "D", tutar: "3", paraBirimi: "EUR", kur: "" }]);
    expect(d.kayit.slice(0, 3)).toEqual([{ tur: "islem", ad: "A", tutar: 10 }, { tur: "islem", ad: "B", tutar: 5 }, { tur: "islem", ad: "C", tutar: null, paraBirimi: "EUR" }]);
    expect(d.hatalar[3]).toEqual({ kur: "Kur girilmedi; kur olmadan kaydedilmez." });
    // Form kayıtla açılır: kayıttaki kur altı ondalık (kaynağı kayıt), para birimi aynen.
    const f = U.kalemFormu({ tur: "islem", ad: "C", tutar: 12, paraBirimi: "USD", kur: 50.370257 });
    expect([f.paraBirimi, f.kur, f._kurKaynak]).toEqual(["USD", "50,370257", KUR_KAYNAK.TURETILEN]);
    expect(U.kalemlerDogrula([f]).kayit[0]).toEqual({ tur: "islem", ad: "C", tutar: 12, paraBirimi: "USD", kur: 50.370257 });
  });
});

describe("Spec 0157 B: işlem kalemi ve karışık kalemler", () => {
  const malzemeKalemi = { tur: "malzeme", adet: 1, malzemeId: 601, bicim: "mil", cap: 40, boy: 50 };
  it("AC-14 / R10: dolar işlem + lira işlem + dolar malzeme; maliyet üç kalemin lira karşılıklarının toplamı (kalem başına tek yuvarlama)", () => {
    const kalemler = [{ tur: "islem", ad: "Kaplama", tutar: 10.01, paraBirimi: "USD", kur: 41.1234 }, { tur: "islem", ad: "Büküm", tutar: 25 }, malzemeKalemi];
    const oz = U.maliyetKalemleriOzeti(kalemler, MK);
    const malzemeK = malzemeOzeti(malzemeKalemi, MK).maliyetK;
    expect(oz.satirlar.map(r => r.tutarK)).toEqual([41165, 2500, malzemeK]); // 1001 kuruş × 41,1234 = 41164,52… → 41165
    expect(oz.toplamK).toBe(41165 + 2500 + malzemeK);
    expect(U.parcaMaliyetKurus({ maliyetKalemleri: kalemler }, undefined, null, MK)).toBe(oz.toplamK);
  });
  it("AC-59 / R12/3: döviz kalemin satırı kendi tutarını ve kurunu da taşır (yalnız dövizde); lira kalemde yeni anahtar yok", () => {
    const oz = U.maliyetKalemleriOzeti([{ tur: "islem", ad: "K", tutar: 10, paraBirimi: "USD", kur: 40 }, { tur: "islem", ad: "B", tutar: 25 }]);
    expect(oz.satirlar[0]).toMatchObject({ tutarK: 40000, paraBirimi: "USD", kur: 40, dovizTutarK: 1000 });
    expect(Object.keys(oz.satirlar[1]).sort()).toEqual(["bos", "cozuldu", "tur", "tutarK"]);
    expect(oz).not.toHaveProperty("islemEksik");
    expect(U.dovizMaliyetMetni(10, "USD", 40, 40000)).toBe("$10,00 · kur 40,00 · 400,00 ₺");
  });
  it("AC-15 / R11: tutarı girilmemiş döviz işlem kalemi toplama girmez ve uyarı olarak görünür", () => {
    const oz = U.maliyetKalemleriOzeti([{ tur: "islem", ad: "K", tutar: null, paraBirimi: "USD" }, { tur: "islem", ad: "B", tutar: 25 }]);
    expect(oz.toplamK).toBe(2500); expect(oz.bosIslem).toBe(1);
    expect(U.kalemlerDogrula([{ tur: "islem", ad: "K", tutar: "", paraBirimi: "USD", kur: "" }]).uyarilar[0]).toBe(U.ISLEM_TUTAR_UYARISI);
  });
  it("AC-16: kuru girilmemiş (ya da para birimi tanınmayan) döviz işlem kalemi maliyeti \"girilmedi\" yapar, sıfır yapmaz", () => {
    for (const k of [{ paraBirimi: "USD" }, { paraBirimi: "GBP", kur: 40 }]) {
      const oz = U.maliyetKalemleriOzeti([{ tur: "islem", ad: "K", tutar: 10, ...k }, { tur: "islem", ad: "B", tutar: 25 }]);
      expect(oz.toplamK).toBeNull(); expect(oz.islemEksik).toBe(1);
      expect(oz.satirlar[0].neden).toBe(k.paraBirimi === "GBP" ? U.ISLEM_PB_TANINMAYAN : U.ISLEM_KUR_EKSIK);
    }
  });
});

describe("Spec 0157 A: maliyet geçmişi", () => {
  const eski = { ...ITHAL, maliyetGecmisi: [{ gecerli: "", kurus: 450000 }, { gecerli: "2026-06-01", kurus: 480000 }] };
  it("AC-10: kur değişip kaydedilince geçmişe döviz tutarı, kur ve lira karşılığını taşıyan yeni kayıt düşer", () => {
    const yeni = { ...eski, maliyetKuru: 42 };
    const r = U.maliyetGecmisiYaz(eski, U.parcaMaliyetKurus(yeni), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: yeni });
    expect(r.gecmis.at(-1)).toEqual({ gecerli: "2026-11-01", kurus: 504000, dovizTutar: 120, kur: 42, paraBirimi: "USD" });
    expect(r.gecmis.at(-2)).toEqual({ gecerli: "2026-06-01", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD" }); // son kayıt bugünkü değer
  });
  it("AC-40 / R5/2: döviz tutar ile kur birlikte değişip lira aynı kalsa da kayıt düşer (üçlü anahtar)", () => {
    const yeni = { ...eski, maliyet: 100, maliyetKuru: 48 }; // 100 × 48 = 4.800 = 120 × 40
    expect(U.parcaMaliyetKurus(yeni)).toBe(U.parcaMaliyetKurus(eski));
    const r = U.maliyetGecmisiYaz(eski, U.parcaMaliyetKurus(yeni), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: yeni });
    expect(r.gecmis.at(-1)).toEqual({ gecerli: "2026-11-01", kurus: 480000, dovizTutar: 100, kur: 48, paraBirimi: "USD" });
    // Hiçbiri değişmezse kayıt yok.
    expect(U.maliyetGecmisiYaz(eski, 480000, { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: { ...eski } }).gecmis).toEqual(U.maliyetGecmisiOf(eski));
  });
  it("AC-41 / AC-11: okuma döviz alanlarını korur; lira satırlarda bu alanlar yok", () => {
    const g = U.maliyetGecmisiOf({ maliyetGecmisi: [{ gecerli: "", kurus: 100 }, { gecerli: "2026-06-01", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD", fazla: 1 }] });
    expect(g).toEqual([{ gecerli: "", kurus: 100 }, { gecerli: "2026-06-01", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD" }]);
  });
  it("AC-11 / R14: geçmiş listesi döviz satırda döviz tutarı, kuru ve lira karşılığını; lira satırda bugünkü metni yazar", () => {
    const p = { ...ITHAL, maliyetGecmisi: [{ gecerli: "", kurus: 450000 }, { gecerli: "2026-06-01", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD" }] };
    expect(U.maliyetGecmisiSatirlari(p).map(x => x.tutarMetni)).toEqual(["$120,00 · kur 40,00 · 4.800,00 ₺", "4.500,00 ₺"]);
  });
  it("AC-12: geçmişe dönük tarihli sorgu o günün lira karşılığını döndürür", () => {
    const p = { ...ITHAL, maliyetKuru: 42, maliyetGecmisi: [{ gecerli: "", kurus: 450000 }, { gecerli: "2026-06-01", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD" }, { gecerli: "2026-11-01", kurus: 504000, dovizTutar: 120, kur: 42, paraBirimi: "USD" }] };
    expect(U.parcaMaliyetKurus(p, "2026-03-01")).toBe(450000);
    expect(U.parcaMaliyetKurus(p, "2026-07-01")).toBe(480000);
    expect(U.parcaMaliyetKurus(p, "2026-11-10")).toBe(504000);
  });
  it("P4: işlem kalemli parçada geçmiş satırı döviz alanı taşımaz, karar lira kuruştan", () => {
    const e = { id: 1, maliyetKalemleri: [{ tur: "islem", ad: "K", tutar: 10, paraBirimi: "USD", kur: 40 }] };
    const y = { id: 1, maliyetKalemleri: [{ tur: "islem", ad: "K", tutar: 10, paraBirimi: "USD", kur: 42 }] };
    const r = U.maliyetGecmisiYaz(e, U.parcaMaliyetKurus(y), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: y });
    expect(r.gecmis).toEqual([{ gecerli: "", kurus: 40000 }, { gecerli: "2026-11-01", kurus: 42000 }]);
  });
});

describe("Spec 0157 A: kur alanının kararları (saf)", () => {
  const rates = { usd: 41.5, eur: 47.25 };
  it("AC-4 / R2/2 / P5: dövize her geçişte günün kuru öneri; TL'ye geçişte kur silinir; para birimi aynıysa karar yok", () => {
    expect(U.pbDegisimi("", "USD", rates, false)).toEqual({ kur: "41,5", kurKaynak: KUR_KAYNAK.ONERI });
    expect(U.pbDegisimi("USD", "EUR", rates, false)).toEqual({ kur: "47,25", kurKaynak: KUR_KAYNAK.ONERI });
    expect(U.pbDegisimi("EUR", "", rates, false)).toEqual({ kur: "", kurKaynak: KUR_KAYNAK.ELLE });
    expect(U.pbDegisimi("USD", "USD", rates, false)).toBeNull();
    expect(U.pbDegisimi("", "TRY", rates, false)).toBeNull();
  });
  it("AC-5 / R6: çevrimdışıyken öneri gelmez, nedeni yazar; alan boş kalır", () => {
    expect(U.pbDegisimi("", "USD", null, true)).toEqual({ kur: "", kurKaynak: KUR_KAYNAK.ELLE });
    expect(U.kurAlaniDurumu("USD", "", KUR_KAYNAK.ELLE, null, true)).toMatchObject({ oneri: null, neden: KUR_CEVRIMDISI });
    expect(U.kurAlaniDurumu("USD", "", KUR_KAYNAK.ELLE, null, false).neden).toBe(KUR_ALINMADI);
  });
  it("AC-48 / AC-50: kayıtlı kur alanda kalır, günün kuru yalnız farklıysa ipucunda; %50'den fazla sapma engellemeyen uyarı", () => {
    expect(U.kurAlaniDurumu("USD", "40", KUR_KAYNAK.TURETILEN, rates, false)).toEqual({ oneri: 41.5, neden: null, sapma: null });
    expect(U.kurAlaniDurumu("USD", "41,5", KUR_KAYNAK.ELLE, rates, false).oneri).toBeNull();
    expect(KUR_SAPMA_ORANI).toBe(0.5);
    expect(U.kurAlaniDurumu("USD", "4", KUR_KAYNAK.ELLE, rates, false).sapma).toMatch(/yüzde 50'den fazla sapıyor/);
    expect(U.kurAlaniDurumu("", "", KUR_KAYNAK.ELLE, rates, false)).toBeNull();
  });
  it("AC-48 (triyaj bulgu 4): uzun ondalıklı öneri alana yazıldıktan sonra ipucu ve düğme kalmaz (karşılaştırma yuvarlanmış öneriyle)", () => {
    const uzun = { usd: 42.123456789, eur: 41.5 / 0.8796543 };
    for (const pb of ["USD", "EUR"]) {
      const y = U.pbDegisimi("", pb, uzun, false);
      expect(U.kurAlaniDurumu(pb, y.kur, y.kurKaynak, uzun, false).oneri, pb).toBeNull();
    }
    expect(U.kurAlaniDurumu("USD", "40", KUR_KAYNAK.ELLE, uzun, false).oneri).toBe(42.123456789);
  });
});

describe("Spec 0157 C: tüketiciler değişmedi (lira karşılığı tek okuma yolundan)", () => {
  it("AC-19 / AC-20: satış fiyatı lira maliyet × kâr katından; kur güncellenince yeni lira maliyetten", () => {
    const p = { ...ITHAL, fiyatKipi: "maliyet", karKati: 2 };
    expect(parcaSatisFiyati(p, "TRY", fiyatBaglamiKur({ parts: [p] })).deger).toBe(9600);
    const q = { ...p, maliyetKuru: 42 };
    expect(parcaSatisFiyati(q, "TRY", fiyatBaglamiKur({ parts: [q] })).deger).toBe(10080);
  });
  it("AC-21: Model Maliyetleri döviz maliyetli parçayı lira karşılığıyla hesaplar", () => {
    const parts = [ITHAL, { id: 31, ad: "Lira", maliyet: 10 }];
    const m = modelMaliyetleri({ standardModels: [{ model: "AK", defaultParcalar: [{ partId: "30", miktar: 2 }, { partId: "31", miktar: 1 }] }], parts }, 0);
    expect(m[0].direktK).toBe(2 * 480000 + 1000);
  });
  it("AC-22: Parti Hesabı açık partide bugünkü lira karşılığını, kapanmış partide donmuş rakamı kullanır", () => {
    const katalog = { standardModels: [{ model: "AK", defaultParcalar: [{ partId: "30", miktar: 1 }] }], customModels: [], parts: [ITHAL], malzemeler: [] };
    const modeller = modelMaliyetleri(katalog, 0);
    const acik = { id: 9, ad: "A", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK: 2 } };
    expect(partiHesabi(acik, { stock: [], customers: [], uretimPartileri: [acik] }, { modeller, rates: {}, bugun: BUGUN, katalog }).satirlar[0].direktK).toBe(480000);
    const kapali = { ...acik, bitisAy: "2026-10", kapanisMaliyeti: { kapanisGunu: "2026-10-31", makinalar: {}, planlar: { AK: { direktK: 123456, eksikSayisi: 0 } }, havuzK: 0, makinaBasiK: 0, adet: 0, durum: "tamam", neden: null } };
    expect(partiHesabi(kapali, { stock: [], customers: [], uretimPartileri: [kapali] }, { modeller, rates: {}, bugun: BUGUN, katalog, partiPay: { acik: false, durum: "tamam", makinaBasiK: 0, makinaPaylari: [] } }).satirlar[0].direktK).toBe(123456);
  });
  it("AC-23: dövizli bileşeni olan setin maliyeti bileşenlerin lira karşılıklarının toplamı", () => {
    const set = { id: 40, ad: "Set", setIcerigi: [{ partId: 30, miktar: 2 }, { partId: 31, miktar: 3 }] };
    const kat = U.setKatalogu([ITHAL, { id: 31, ad: "Lira", maliyet: 10 }, set]);
    expect(U.parcaMaliyetKurus(set, undefined, kat)).toBe(2 * 480000 + 3 * 1000);
    expect(U.parcaDovizMaliyeti(set)).toBeNull(); // setin para birimi kavramı yok
  });
  it("AC-62 (tarama): satış fiyatı, Model Maliyetleri, Parti Hesabı ve set için yeni kod yok (para birimini okumazlar)", () => {
    for (const f of ["src/lib/parcaFiyati.js", "src/lib/makinaStandartMaliyet.js"]) expect(kod(f), f).not.toMatch(/maliyetParaBirimi|maliyetKuru|parcaDovizMaliyeti|dovizdenLiraK/);
    expect(kod("src/lib/urunAgaci.js").match(/export const setOzeti[\s\S]*?\n};/)[0]).not.toMatch(/Doviz|doviz|ParaBirimi/);
  });
});

describe("Spec 0157 C: Excel", () => {
  const ADLAR = (r) => r.parts.map(p => p.ad);
  it("AC-44: şablon on altı sütun, 12–13 okunur; örnek satır iki hücreye örnek değer yazar", () => {
    expect(PARCA_AKTARMA_BASLIKLARI).toHaveLength(16);
    expect(PARCA_AKTARMA_BASLIKLARI.slice(11, 13)).toEqual(["Maliyet Para Birimi", "Maliyet Kuru"]);
    expect(PARCA_SABLON_ORNEGI.slice(9, 13)).toEqual(["120,50", PARCA_SABLON_ORNEGI[10], "USD", "40"]);
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, PARCA_SABLON_ORNEGI], [], 1, BUGUN);
    expect(r.errors.filter(e => !/Set içeriği/.test(e))).toEqual([]); // örnek set bileşeni katalogda yok (0124'ün bildirimi)
    expect(r.parts[0]).toMatchObject({ maliyet: 120.5, maliyetParaBirimi: "USD", maliyetKuru: 40 });
  });
  it("AC-27 / AC-54: döviz parçanın maliyet hücresi kendi tutarı, iki sütun para birimi ve kur; kalem listeli ve set parçada lira ve boş", () => {
    const disa = (p) => parcaDisaAktarmaSatiri(p, KAT, MK);
    expect(disa({ ...ITHAL, maliyetKuru: 50.370257 }).slice(9, 13)).toEqual([120, "", "USD", 50.370257]);
    const kalemli = PARCALAR.find(p => p.id === 8);
    expect(disa(kalemli).slice(11, 13)).toEqual(["", ""]); expect(disa(kalemli)[9]).toBe(40);
    expect(disa(PARCALAR.find(p => p.id === 21)).slice(11, 13)).toEqual(["", ""]);
    expect(disa({ id: 3, ad: "Lira", maliyet: 12.5 }).slice(9, 13)).toEqual([12.5, "", "", ""]);
  });
  it("AC-28 / AC-29 / AC-30: para birimi ve kur dolu satır döviz; para birimi boş satır lira (kayıtlı döviz kalkar); eski on bir sütunlu şablon lira", () => {
    const mevcut = { id: 7, ad: "Rulman", maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40 };
    const satir = (ad, maliyet, pb = "", kur = "") => [ad, "", "", "", "", "", "", "", "", maliyet, "", pb, kur];
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, satir("Yeni", "99,5", "EUR", "47,123456"), satir("Rulman", "4800", "TL"), ["Eski", "", "", "", "", "", "", "", "", "15", ""]], [mevcut], 100, BUGUN);
    expect(r.errors).toEqual([]);
    expect(r.parts.find(p => p.ad === "Yeni")).toMatchObject({ maliyet: 99.5, maliyetParaBirimi: "EUR", maliyetKuru: 47.123456 });
    const son = parcaIceAktarmaUygula([mevcut], r.parts);
    const rulman = son.find(p => p.id === 7);
    expect(rulman.maliyet).toBe(4800); expect(rulman).not.toHaveProperty("maliyetParaBirimi"); expect(rulman).not.toHaveProperty("maliyetKuru");
    const eski = son.find(p => p.ad === "Eski");
    expect(eski.maliyet).toBe(15); expect(eski).not.toHaveProperty("maliyetParaBirimi");
    expect(ADLAR(r)).toEqual(["Yeni", "Rulman", "Eski"]);
  });
  it("AC-31 / AC-55 / P7: kuru boş döviz, kuru dolu ama para birimi boş ya da TL, tanınmayan para birimi: maliyet yazılmaz, satır numarasıyla bildirilir", () => {
    const satir = (ad, pb, kur) => [ad, "", "", "", "", "", "", "", "", "100", "", pb, kur];
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, satir("A", "USD", ""), satir("B", "", "40"), satir("C", "TL", "40"), satir("D", "GBP", "40"), satir("E", "USD", "abc")], [], 100, BUGUN);
    expect(r.errors).toEqual([
      `Satır 2: ${U.excelKurHatasi("Kur girilmedi; kur olmadan kaydedilmez.")}`, `Satır 3: ${U.EXCEL_KUR_PB_BOS_HATASI}`, `Satır 4: ${U.EXCEL_KUR_PB_BOS_HATASI}`,
      `Satır 5: ${U.excelPbTaninmayanHatasi("GBP")}`, `Satır 6: ${U.excelKurHatasi("Kur sayıya çevrilemedi. Örnek: 35,5")}`]);
    for (const p of r.parts) { expect(p, p.ad).not.toHaveProperty("maliyet"); expect(p).not.toHaveProperty("maliyetParaBirimi"); }
  });
  it("AC-53 / R18/3: dışa aktarılan dosya değiştirilmeden içe aktarılınca bildirim ve değişiklik yok (altı ondalıklı kur dahil)", () => {
    const parts = [...PARCALAR, { ...ITHAL, maliyetKuru: 50.370257, maliyetGecmisi: [{ gecerli: "", kurus: 500000 }] }];
    const kat = U.setKatalogu(parts);
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ...parts.map(p => parcaDisaAktarmaSatiri(p, kat, MK))], parts, 100, BUGUN, MALZEMELER);
    expect(r.errors).toEqual([]);
    const son = parcaIceAktarmaUygula(parts, r.parts);
    const ithal = son.find(p => p.id === 30);
    expect(ithal).toMatchObject({ maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 50.370257 });
    expect(ithal.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 500000 }]); // değişmeyen maliyet geçmiş yazmaz
  });
  it("AC-53 / R18/3 (triyaj bulgu 1): sekiz ondalıklı sayı hücresi altı ondalığa yuvarlanır; ikinci tur sessiz, geçmiş kirlenmez", () => {
    const p = { id: 30, ad: "İthal rulman", maliyet: 100, maliyetParaBirimi: "USD", maliyetKuru: 40, maliyetGecmisi: [{ gecerli: "", kurus: 400000 }] };
    const satir = ["İthal rulman", "", "", "", "", "", "", "", "", 100, "", "USD", 41.12345678];
    const r1 = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, satir], [p], 100, BUGUN);
    expect(r1.errors).toEqual([]);
    const sonra = parcaIceAktarmaUygula([p], r1.parts);
    expect(sonra[0].maliyetKuru).toBe(41.123457);
    const gecmis = sonra[0].maliyetGecmisi;
    const disa = parcaDisaAktarmaSatiri(sonra[0]);
    expect(disa[12]).toBe(41.123457);
    const r2 = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, disa], sonra, 100, BUGUN);
    expect(r2.errors).toEqual([]);
    const ikinci = parcaIceAktarmaUygula(sonra, r2.parts)[0];
    expect(ikinci.maliyetKuru).toBe(41.123457); expect(ikinci.maliyetGecmisi).toEqual(gecmis);
  });
  it("P7 (triyaj bulgu 3): kalem listeli ve set parçanın satırında dolu para birimi ve kur sessizce yok sayılmaz, satır numarasıyla bildirilir", () => {
    const kalemli = PARCALAR.find(p => p.id === 8); const set = PARCALAR.find(p => p.id === 21);
    const satir = (ad, maliyet = "") => [ad, "", "", "", "", "", "", "", "", maliyet, "", "USD", 40];
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, satir(kalemli.ad), satir(set.ad)], PARCALAR, 100, BUGUN, MALZEMELER);
    expect(r.errors).toEqual([`Satır 2: ${U.EXCEL_DOVIZ_KALEM_SET_HATASI}`, `Satır 3: ${U.EXCEL_DOVIZ_KALEM_SET_HATASI}`]);
    const son = parcaIceAktarmaUygula(PARCALAR, r.parts);
    for (const id of [8, 21]) { expect(son.find(p => p.id === id)).not.toHaveProperty("maliyetParaBirimi"); }
  });
  it("AC-10 (Excel yolu): içe aktarmayla kur değişince geçmişe döviz alanlı kayıt düşer", () => {
    const p = { ...ITHAL, maliyetGecmisi: [{ gecerli: "", kurus: 450000 }] };
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ["İthal rulman", "", "", "", "", "", "", "", "", 120, "", "USD", 42]], [p], 100, BUGUN);
    expect(r.parts[0].maliyetGecmisi.at(-1)).toEqual({ gecerli: BUGUN, kurus: 504000, dovizTutar: 120, kur: 42, paraBirimi: "USD" });
  });
});

describe("Spec 0157 C: sipariş motoru ve belge", () => {
  const ISLEMLI = { id: 32, ad: "Fason döviz", tedarikciId: 22, maliyetKalemleri: [{ tur: "islem", ad: "İthal kaplama", tedarikciId: 23, tutar: 2.5, paraBirimi: "EUR", kur: 50 }, { tur: "islem", ad: "Galvaniz", tedarikciId: 23, tutar: 40 }] };
  const parts = [...PARCALAR, ITHAL, ISLEMLI];
  const r = S.siparisIhtiyaci(veri({ parts, modeller: [{ model: "AK", defaultParcalar: parts.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
  const aksu = r.tedarikciBolumleri.belge.find(b => b.ad === "Aksu CNC");
  const fason = r.tedarikciBolumleri.belge.find(b => b.ad === "Fason Kaplama");
  const fli = siparisRaporuHtml(r, { bugun: BUGUN, factory: FACTORY, fiyatli: true });
  const bolumHtml = (ad) => fli.split('<div class="siparis-bolum"').find(p => p.includes(`${ad} · `)) || "";
  it("AC-24 / AC-38: döviz hazır parçanın tutarı kendi para biriminde; lira tutarı tek okuma yolunun lira birimi × adet (P9)", () => {
    const x = aksu.satirlar.find(s => s.ad === "İthal rulman");
    expect(x).toMatchObject({ paraBirimi: "USD", dovizTutarK: 12000 * 70, tutarK: 480000 * 70, birimK: 480000 });
    expect(bolumHtml("Aksu CNC")).toContain("8.400,00 $");
  });
  it("AC-25 / AC-38: aynı bölümde dolar ve lira tutar birlikte: bölüm toplamı para birimi başına, lira toplamı kayıtlı kurdan", () => {
    const tl = aksu.toplamlar.find(t => t.pb === "TRY").k;
    expect(aksu.toplamlar.find(t => t.pb === "USD").k).toBe(12000 * 70);
    expect(aksu.dovizVar).toBe(true);
    expect(aksu.toplamTLK).toBe(tl + 480000 * 70);
    expect(bolumHtml("Aksu CNC")).toMatch(/data-bolum-toplami[\s\S]*\$[\s\S]*kayıtlı kurla/);
  });
  it("AC-39 / R8/2: döviz işlem kaleminin satırı kendi para biriminde, işlemler toplamı para birimi başına, genel toplam lira karşılıklarından", () => {
    const x = fason.islemler.find(i => i.ad === "İthal kaplama");
    expect(x).toMatchObject({ paraBirimi: "EUR", birimK: 12500, tutarK: 12500 * 70, dovizTutarK: 250 * 70 });
    expect(fason.islemToplamlar).toEqual([{ pb: "TRY", k: (4000 * 2) * 70 }, { pb: "EUR", k: 250 * 70 }]);
    expect(fason.islemToplamK).toBe((4000 * 2 + 12500) * 70);
    expect(fason.genelToplamK).toBe(fason.islemToplamK); // parça tutarı kaynağı yok: genel toplam işlemler toplamı (lira)
    const h = bolumHtml("Fason Kaplama");
    expect(h).toContain("175,00 €");
    expect(h).toMatch(/data-islem-toplami[^>]*>[\s\S]*?175,00 €[\s\S]*?kayıtlı kurla/);
  });
  it("AC-57: lira satırlarda (hazır parça, işlem kalemi) yeni anahtar yok", () => {
    for (const b of r.tedarikciBolumleri.belge) {
      for (const x of [...b.satirlar, ...b.islemler].filter(s => s.ad !== "İthal rulman" && s.ad !== "İthal kaplama")) { expect(x).not.toHaveProperty("paraBirimi"); expect(x).not.toHaveProperty("dovizTutarK"); }
      if (!b.islemler.some(i => i.paraBirimi)) expect(b).not.toHaveProperty("islemToplamlar");
    }
  });
  it("AC-38 (kuru eksik döviz hazır parça): tutarsız sayılır ve nedenini yazar (kardeş okuyucu null, lira birim null)", () => {
    const p2 = [...PARCALAR, { ...ITHAL, maliyetKuru: null }];
    const k = S.siparisIhtiyaci(veri({ parts: p2, modeller: [{ model: "AK", defaultParcalar: p2.map(p => ({ partId: String(p.id), miktar: 1 })) }] }), { tedarikciOdakli: true });
    const x = k.tedarikciBolumleri.belge.find(b => b.ad === "Aksu CNC").satirlar.find(s => s.ad === "İthal rulman");
    expect(x.tutarK).toBeNull(); expect(x).not.toHaveProperty("paraBirimi"); expect(x.tutarNeden).toBe(S.MALIYET_YOK);
  });
});

describe("Spec 0157: kaynak taramaları", () => {
  const SRC = srcDosyalari("src");
  it("AC-34 / C1/2 / P3: kardeş okuyucu yalnız sipariş motorunda çağrılır; iki alanı okuyan yer motor ve parça kartının formu", () => {
    const cagiran = SRC.filter(f => f !== "src/lib/urunAgaci.js" && /parcaDovizMaliyeti\(/.test(kod(f)));
    expect(cagiran).toEqual(["src/lib/siparisIhtiyaci.js"]);
    const okuyan = SRC.filter(f => /\.maliyet(ParaBirimi|Kuru)\b/.test(kod(f)));
    expect(okuyan.sort()).toEqual(["src/components/PartManager.jsx", "src/lib/urunAgaci.js"]);
  });
  it("AC-34 / AC-56 / C2 / C2/2 / P8: lira karşılığının çarpımı tek yardımcıda; ekranlar, Excel ve parça motoru kur çarpımı yazmaz", () => {
    const desen = /\*\s*[\w.]*\bkur\b|\bkur\w*\s*\*/i;
    const taranan = [...SRC.filter(f => f.startsWith("src/components/")), "src/lib/parcaAktarma.js", "src/lib/urunAgaci.js"];
    expect(taranan.filter(f => desen.test(kod(f)))).toEqual([]);
    expect(kod("src/lib/urunAgaci.js")).toMatch(/dovizdenLiraK\(tutar, d\.kur\)/);
    expect(kod("src/lib/gider.js")).toMatch(/export const dovizdenLiraK = /);
    // Gerekçeli istisnalar (malzeme tarafı, X5): malzeme kaleminin kendi çarpımı ve sipariş motorundaki malzeme kesidinin lira çarpımları.
    expect(kod("src/lib/malzeme.js")).toMatch(/kurus\(fireliKg \* fiyat \* kur\)/);
    expect((kod("src/lib/siparisIhtiyaci.js").match(/tutar \* (r\.)?kur\b/g) || []).length).toBe(4);
  });
  it("AC-34 / C3: kur ayrıştırıcısı yaprak modülden; ikinci kur ayrıştırıcısı yok", () => {
    expect(kod("src/lib/urunAgaci.js")).toMatch(/from "\.\/kur"/);
    for (const f of ["src/lib/urunAgaci.js", "src/lib/parcaAktarma.js", "src/components/MaliyetKalemleriAlani.jsx", "src/components/PartManager.jsx"]) expect(kod(f), f).not.toMatch(/const kurCoz\s*=/);
  });
  it("AC-35 / C8: yeni veri bölümü, izin kimliği ve sunucu kuralı yok", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "src/components/settings/serverPermissionDefs.js", "src/lib/merge.js"]) expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/maliyetParaBirimi|maliyetKuru|0157/);
  });
  it("AC-58 / R12/2: maliyet etiketi ve ipucu para biriminden bağımsız; \"TL karşılığını girin\" ve iki \"(TL, KDV hariç)\" etiketi kaynakta yok", () => {
    expect(U.MALIYET_ETIKETI).not.toMatch(/TL/);
    expect(U.ISLEM_TUTAR_ETIKETI).not.toMatch(/TL/);
    expect(SRC.filter(f => /TL karşılığını girin/.test(fs.readFileSync(f, "utf8")))).toEqual([]);
    for (const f of ["src/lib/urunAgaci.js", "src/components/MaliyetKalemleriAlani.jsx"]) expect(kod(f), f).not.toMatch(/"(Alış maliyeti|Tutar) \(TL, KDV hariç\)"/);
  });
  it("C7/2: alan adları satış fiyatı alanlarıyla karışmaz", () => {
    expect(U.ELLE_PB_ANAHTARLARI).toEqual(["maliyetParaBirimi", "maliyetKuru"]);
    expect(kod("src/lib/urunAgaci.js")).not.toMatch(/fiyatUSD|fiyatEUR/);
  });
});
