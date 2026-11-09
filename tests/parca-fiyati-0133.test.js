// Spec 0138 ile: spec 0137'nin bu dosyaya eklediği dış işlem iddiaları kaldırıldı, dosya 0136 hâline döndü (C7, AC-41, AC-42).
// Spec 0133: satış fiyatının maliyetten türemesi. Saf motor (parcaFiyati.js), etki hesabı, Excel, fiyat listesi ve kaynak taramaları.
// Ekran testleri: tests/ui/parca-fiyati-0133*.test.jsx; kıyas (C4, AC-45/46/95): tests/parca-fiyati-0133-kiyas.test.jsx.
import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  fiyatKipiOf, maliyeteBagliMi, katDogrula, karKatiOf, katMetni, fiyatAyariOf, fiyatBaglamiKur, turetilmisFiyat, parcaSatisFiyati,
  formSatisFiyati, setFiyatOkuyucu, katsizUyariMetni, TOPLU_KAT_YOK_NEDENI, turetilmisFiyatSayisi, turetilmisFiyatMetni, kipYaz, topluKipOzeti, topluKipMetni, maliyetsizUyariMetni,
  KIP_MALIYET, KIP_ELLE, NEDEN_MALIYET_YOK, NEDEN_KAT_YOK, DOVIZ_NOTU, TURETILEMEDI, KAT_SAYI_HATASI, KAT_POZITIF_HATASI, KAT_UST_HATASI,
  ONERILEN_KAT, YUVARLAMA_SECENEKLERI,
} from "../src/lib/parcaFiyati";
import * as urunAgaci from "../src/lib/urunAgaci";
import { setOzeti, setKatalogu, setFiyatsizMetni } from "../src/lib/urunAgaci";
import { fiyatEtkisi, fiyatEtkiMetni, malzemeKatalogu, BELIRSIZ_HATASI } from "../src/lib/malzeme";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula, PARCA_AKTARMA_BASLIKLARI, FIYAT_EXCEL_HATASI } from "../src/lib/parcaAktarma";
import { fiyatListesiHtml, fiyatListesiSatiri, FIYAT_LISTESI_SUTUNLARI } from "../src/lib/fiyatListesiRaporu";
import { partFiyatForCurrency } from "../src/lib/utils";
import { PARCALAR, MALZEMELER, P304 } from "./fixtures/0133-veri.js";
import { ETKI_ESKI, ETKI_YENI, ETKI_PARCALAR } from "./fixtures/0133-etki-girdisi.js";

const kod = (f) => readFileSync(f, "utf8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
const tumKaynak = (d, out = []) => {
  for (const a of readdirSync(d)) {
    const y = join(d, a);
    if (statSync(y).isDirectory()) tumKaynak(y, out); else if (/\.(js|jsx|mjs|cjs)$/.test(a)) out.push(y);
  }
  return out;
};
const bag = (fiyatAyarlari = { varsayilanKat: 2.4 }, parts = PARCALAR) => fiyatBaglamiKur({ parts, malzemeler: MALZEMELER, fiyatAyarlari });
const bagli = (p, ek = {}) => ({ ...p, fiyatKipi: KIP_MALIYET, ...ek });
const MILI = PARCALAR.find(p => p.id === 65); // maliyeti 1.701,12 TL (malzemeden; altın 170112 kuruş)

describe("Spec 0133: kip ve kat (R1, R1/2, R6, R7, R7/2)", () => {
  it("AC-1 / AC-94: kipi girilmemiş ya da tanınmayan değerli parça elle sabittir ve fiyatı girilen değerdir", () => {
    for (const p of [{ fiyatTRY: 450 }, { fiyatTRY: 450, fiyatKipi: "otomatik" }, { fiyatTRY: 450, fiyatKipi: "" }]) {
      expect(fiyatKipiOf(p)).toBe(KIP_ELLE);
      expect(maliyeteBagliMi(p)).toBe(false);
      expect(parcaSatisFiyati(p, "TRY", bag()).deger).toBe(450);
    }
    expect(fiyatKipiOf({ fiyatKipi: "maliyet" })).toBe(KIP_MALIYET);
  });
  it("AC-6 / AC-63: sıfır, negatif ve sayıya çevrilemez kat reddedilir", () => {
    expect(katDogrula("0").hata).toBe(KAT_POZITIF_HATASI);
    expect(katDogrula("-2").hata).toBe(KAT_POZITIF_HATASI);
    expect(katDogrula("abc").hata).toBe(KAT_SAYI_HATASI);
  });
  it("AC-7 / AC-88: 0,90 kat geçerlidir, zarar işaretlidir", () => {
    expect(katDogrula("0,90")).toEqual({ bos: false, deger: 0.9, hata: null, zarar: true });
    expect(katDogrula("2,4").zarar).toBe(false);
  });
  it("AC-60: `2.400` belirsizdir ve reddedilir, `2,4` kabul edilir", () => {
    expect(BELIRSIZ_HATASI).toBeTruthy();
    expect(katDogrula("2.400").hata).toBe(BELIRSIZ_HATASI);
    expect(katDogrula("2,4").deger).toBe(2.4);
  });
  it("AC-61: 100'den büyük kat reddedilir, 100 kabul", () => {
    expect(katDogrula("100,5").hata).toBe(KAT_UST_HATASI);
    expect(katDogrula("100").deger).toBe(100);
  });
  it("AC-64: dört ondalıklı kat üç ondalığa en yakına yuvarlanır, gösterilen saklananla aynı", () => {
    const d = katDogrula("2,4567");
    expect(d.hata).toBeNull();
    expect(d.deger).toBe(2.457);
    expect(katMetni(d.deger)).toBe("2,457");
    expect(karKatiOf({ karKati: d.deger })).toBe(2.457);
  });
  it("AC-62: varsayılan kat ve parçanın katı aynı doğrulayıcıdan geçer (iki ekran tek fonksiyonu çağırır)", () => {
    expect(fiyatAyariOf({ varsayilanKat: "2.400" }).varsayilanKat).toBeNull();
    expect(karKatiOf({ karKati: "2.400" })).toBeNull();
    for (const f of ["src/components/settings/SettingsFiyat.jsx", "src/components/PartManager.jsx"]) expect(kod(f), f).toMatch(/katDogrula\(/);
    expect(kod("src/lib/parcaFiyati.js").match(/export const katDogrula/g)).toHaveLength(1);
  });
  it("AC-66: temiz kurulumda varsayılan kat boş, yuvarlama kapalı; 2,77 yalnız öneri (gizli varsayılan yok)", () => {
    expect(fiyatAyariOf(undefined)).toEqual({ varsayilanKat: null, yuvarlama: "" });
    expect(ONERILEN_KAT).toBe(2.77);
    expect(yorumsuz(kod("src/lib/parcaFiyati.js"))).not.toMatch(/\?\?\s*2\.77|\|\|\s*2\.77/);
  });
});

describe("Spec 0133: türetme (R2, R2/2, R2/3, R8, R9, R11)", () => {
  it("AC-3: maliyeti 1.000,00 TL, katı 2,40 olan parçanın fiyatı 2.400,00 TL", () => {
    const p = bagli({ id: 1, maliyet: 1000 });
    expect(parcaSatisFiyati(p, "TRY", bag()).deger).toBe(2400);
  });
  it("AC-4 / AC-5: kendi katı yoksa varsayılan, varsa kendisi", () => {
    const p = bagli({ id: 1, maliyet: 1000 });
    expect(turetilmisFiyat(p, bag()).kat).toBe(2.4);
    expect(turetilmisFiyat({ ...p, karKati: 3 }, bag()).fiyatK).toBe(300000);
  });
  it("AC-9: varsayılan kat yoksa fiyat yok, nedeni yazar", () => {
    const r = parcaSatisFiyati(bagli({ id: 1, maliyet: 1000 }), "TRY", bag({}));
    expect(r).toMatchObject({ deger: "", neden: NEDEN_KAT_YOK, turetilmis: true });
  });
  it("AC-10 / AC-68: yuvarlama kapalı, kuruşa kadar: 1.701,12 × 2,40 = 4.082,69; gösterim iki hane", () => {
    const r = parcaSatisFiyati(bagli(MILI), "TRY", bag());
    expect(r.deger).toBe(4082.69);
    expect(turetilmisFiyatSayisi(r.deger)).toBe("4.082,69");
    expect(turetilmisFiyatMetni(r.deger)).toBe("4.082,69 ₺");
    expect(turetilmisFiyatMetni("")).toBe("—");
  });
  it("AC-11 / AC-12 (Karar 34: yukarı): 4.082,69 → 4.090,00 (10) ve 4.100,00 (50)", () => {
    expect(parcaSatisFiyati(bagli(MILI), "TRY", bag({ varsayilanKat: 2.4, yuvarlama: "yukari10" })).deger).toBe(4090);
    expect(parcaSatisFiyati(bagli(MILI), "TRY", bag({ varsayilanKat: 2.4, yuvarlama: "yukari50" })).deger).toBe(4100);
  });
  it("AC-13: tam katı değişmez (4.100,00, yukarı 50)", () => {
    expect(parcaSatisFiyati(bagli({ id: 1, maliyet: 1640 }), "TRY", bag({ varsayilanKat: 2.5, yuvarlama: "yukari50" })).deger).toBe(4100);
  });
  it("AC-65 / R8/2: 2.010,00 yukarı 50'de 2.050,00 (en yakın 2.000 verirdi); seçenek metni yönü söyler", () => {
    expect(parcaSatisFiyati(bagli({ id: 1, maliyet: 2010 }), "TRY", bag({ varsayilanKat: 1, yuvarlama: "yukari50" })).deger).toBe(2050);
    expect(YUVARLAMA_SECENEKLERI.map(o => o.label)).toEqual(["Kapalı", "Yukarı 10 TL", "Yukarı 50 TL"]);
  });
  it("Triyaj (bulgu 6): tam yarım kuruş yukarı yuvarlanır (7,50 × 2,002 = 15,015 → 15,02); taramada hiçbir çift aşağı kaçmaz", () => {
    expect(turetilmisFiyat(bagli({ id: 1, maliyet: 7.5 }), bag({ varsayilanKat: 2.002 })).fiyatK).toBe(1502);
    let kacan = 0;
    for (let mk = 1; mk <= 2000; mk += 7) for (let kb = 1000; kb <= 4000; kb += 13) {
      const beklenen = Math.floor((mk * kb * 2 + 1000) / 2000); // tam sayı aritmetiğiyle yarım yukarı (kat binde birlik)
      if (turetilmisFiyat(bagli({ id: 1, maliyet: mk / 100 }), bag({ varsayilanKat: kb / 1000 })).fiyatK !== beklenen) kacan++;
    }
    expect(kacan).toBe(0);
  });
  it("AC-14: yuvarlama elle sabit parçaya uygulanmaz", () => {
    expect(parcaSatisFiyati({ fiyatTRY: 4082.69 }, "TRY", bag({ varsayilanKat: 2.4, yuvarlama: "yukari50" })).deger).toBe(4082.69);
  });
  it("AC-15: yuvarlama varsayılan kapalı", () => {
    expect(fiyatAyariOf({ varsayilanKat: 2 }).yuvarlama).toBe("");
    expect(fiyatAyariOf({ yuvarlama: "bilinmeyen" }).yuvarlama).toBe("");
  });
  it("AC-23: maliyeti girilmemiş maliyete bağlı parçanın fiyatı boş ve nedenli; sıfır üretilmez", () => {
    const r = parcaSatisFiyati(bagli({ id: 1, fiyatTRY: 900 }), "TRY", bag());
    expect(r).toMatchObject({ deger: "", neden: NEDEN_MALIYET_YOK });
    expect(formSatisFiyati(bagli({ id: 1 }), "TRY", bag())).toBe("");
  });
  it("AC-31 / AC-33 / AC-34 / X1: döviz türetilmez; dolar fiyatı elle girilen, girilmemişse boş", () => {
    const p = bagli({ id: 1, maliyet: 1000, fiyatUSD: 12 });
    expect(parcaSatisFiyati(p, "USD", bag()).deger).toBe(12);
    expect(formSatisFiyati(p, "USD", bag())).toBe(12);
    expect(parcaSatisFiyati(p, "EUR", bag()).deger).toBe(partFiyatForCurrency(p, "EUR"));
    expect(DOVIZ_NOTU).toMatch(/elle girilir/);
  });
  it("AC-54 (0087 AC-6 ters çevrildi): maliyete bağlı parçanın maliyeti değişince fiyatı değişir, elle sabit parçanınki değişmez", () => {
    const b = bagli({ id: 1, maliyet: 1000 });
    expect(parcaSatisFiyati({ ...b, maliyet: 1100 }, "TRY", bag()).deger).not.toBe(parcaSatisFiyati(b, "TRY", bag()).deger);
    const e = { id: 2, maliyet: 1000, fiyatTRY: 450 };
    expect(parcaSatisFiyati({ ...e, maliyet: 1100 }, "TRY", bag()).deger).toBe(450);
  });
  it("Karar 29: tam liralık form değeri yukarı tam liraya; elle sabit birebir", () => {
    expect(formSatisFiyati(bagli(MILI), "TRY", bag())).toBe(4083);
    expect(formSatisFiyati({ fiyatTRY: "1250" }, "TRY", bag())).toBe("1250");
  });
  it("AC-93: fiyat yolu maliyeti tarih vermeden okur (çağrı ölçülür)", () => {
    const casus = vi.spyOn(urunAgaci, "parcaMaliyetKurus");
    try {
      turetilmisFiyat(bagli({ id: 1, maliyet: 10 }), bag());
    } catch { /* ES modül casusu bağlanmıyorsa kaynakla ölçülür */ }
    casus.mockRestore();
    expect(kod("src/lib/parcaFiyati.js")).toMatch(/parcaMaliyetKurus\(p, undefined, baglam\?\.setKat, baglam\?\.malzemeKat\)/);
    expect(yorumsuz(kod("src/lib/parcaFiyati.js"))).not.toMatch(/tarih/);
  });
  it("AC-55: tek imza: parça, para birimi, bağlam (ayar, set kataloğu, malzeme kataloğu); dönüş nedenli", () => {
    const b = bag();
    expect(Object.keys(b).sort()).toEqual(["ayar", "malzemeKat", "setKat"]);
    expect(Object.keys(parcaSatisFiyati(bagli({ id: 1 }), "TRY", b))).toEqual(expect.arrayContaining(["deger", "kip", "neden", "turetilmis"]));
    expect(kod("src/lib/parcaFiyati.js").match(/export const parcaSatisFiyati/g)).toHaveLength(1);
  });
  it("AC-56 (motor yarısı): malzeme kataloğu verilmezse malzemeden hesaplanan parçanın fiyatı boş", () => {
    const b = fiyatBaglamiKur({ parts: PARCALAR, malzemeler: [], fiyatAyarlari: { varsayilanKat: 2.4 } });
    expect(parcaSatisFiyati(bagli(MILI), "TRY", b).deger).toBe("");
  });
});

describe("Spec 0133: set (R22, R22/2, Karar 30)", () => {
  const SETLI = PARCALAR.map(p => (p.id === 61 ? bagli(p) : p));
  it("AC-22: elle sabit setin toplamı bileşenlerin yürürlükteki fiyatıyla, tam lira (maliyete bağlı bileşen türetilmiş)", () => {
    const b = bag({ varsayilanKat: 2.4 }, SETLI);
    const set = SETLI.find(p => p.id === 64);
    const oz = setOzeti(set.setIcerigi, setKatalogu(SETLI), undefined, malzemeKatalogu(MALZEMELER), setFiyatOkuyucu(b));
    expect(oz.fiyatToplam).toBe(240 * 2 + 1250); // Rulman 100 × 2,4 = 240
    const eski = setOzeti(set.setIcerigi, setKatalogu(PARCALAR), undefined, malzemeKatalogu(MALZEMELER));
    expect(eski.fiyatToplam).toBe(450 * 2 + 1250); // okuyucusuz bugünkü kural
  });
  it("AC-71: maliyete bağlı setin fiyatı setin maliyeti × kat (bileşen fiyat toplamı değil)", () => {
    const set = bagli(PARCALAR.find(p => p.id === 64));
    const parts = PARCALAR.map(p => (p.id === 64 ? set : p));
    // Kayış'ın maliyeti girilmemiş: setin maliyeti yok → türetilemez
    expect(parcaSatisFiyati(set, "TRY", bag({ varsayilanKat: 2.4 }, parts)).neden).toBe(NEDEN_MALIYET_YOK);
    const tam = parts.map(p => (p.id === 62 ? { ...p, maliyet: 300 } : p));
    const s2 = tam.find(p => p.id === 64);
    expect(parcaSatisFiyati(s2, "TRY", bag({ varsayilanKat: 2 }, tam)).deger).toBe((100 * 2 + 300) * 2);
  });
  it("AC-72: fiyatsız sayaç maliyete bağlı ama türetilemeyen bileşeni de sayar ve metni iki nedeni söyler", () => {
    const parts = PARCALAR.map(p => (p.id === 62 ? bagli(p) : p)); // Kayış maliyetsiz ve maliyete bağlı
    const set = parts.find(p => p.id === 64);
    const oz = setOzeti(set.setIcerigi, setKatalogu(parts), undefined, null, setFiyatOkuyucu(bag({ varsayilanKat: 2 }, parts)));
    expect(oz.fiyatsiz).toBe(1);
    expect(setFiyatsizMetni(1)).toMatch(/girilmemiş ya da maliyetten türetilemiyor/);
  });
});

describe("Spec 0133: toplu kip (R4, R4/2, R13/2)", () => {
  it("AC-80 / AC-94: kip yazıcısı elle sabitte alanı siler, maliyette tek değer yazar", () => {
    expect(kipYaz({ id: 1, fiyatKipi: "maliyet" }, KIP_ELLE)).toEqual({ id: 1 });
    // Triyaj (bulgu 5, R13/2): elle sabite geçişte parçanın katı da silinir (kartın kayıt fonksiyonuyla aynı); maliyete geçişte korunur.
    expect(kipYaz({ id: 1, fiyatKipi: "maliyet", karKati: 2.5 }, KIP_ELLE)).toEqual({ id: 1 });
    expect(kipYaz({ id: 1, karKati: 2.5 }, KIP_MALIYET)).toEqual({ id: 1, karKati: 2.5, fiyatKipi: "maliyet" });
    expect(kipYaz({ id: 1 }, KIP_MALIYET)).toEqual({ id: 1, fiyatKipi: "maliyet" });
  });
  it("Triyaj (bulgu 1): varsayılan kat boşken kendi katı olmayan parçalar `katsiz` sayılır; metin ve neden tek sabitten", () => {
    const parts = [{ id: 1, maliyet: 10, fiyatTRY: 30 }, { id: 2, maliyet: 20, fiyatTRY: 50 }, { id: 3, maliyet: 5, karKati: 2 }];
    expect(topluKipOzeti(parts, KIP_MALIYET, bag({}, parts))).toMatchObject({ maliyetsiz: 0, katsiz: 2 });
    expect(topluKipOzeti(parts, KIP_MALIYET, bag({ varsayilanKat: 2 }, parts)).katsiz).toBe(0);
    expect(topluKipOzeti(parts, KIP_ELLE, bag({}, parts)).katsiz).toBe(0);
    expect(katsizUyariMetni(2)).toMatch(/^2 parçanın kendi katı yok/);
    expect(TOPLU_KAT_YOK_NEDENI).toMatch(/Varsayılan kâr katı girilmeden/);
  });
  it("AC-26 / AC-27: kip değişince elle girilmiş fiyat alanları silinmez", () => {
    const p = { id: 1, fiyatTRY: 450, fiyatUSD: 12, maliyet: 100 };
    const m = kipYaz(p, KIP_MALIYET);
    expect(m.fiyatTRY).toBe(450);
    expect(parcaSatisFiyati(kipYaz(m, KIP_ELLE), "TRY", bag()).deger).toBe(450);
  });
  it("AC-29 / AC-49 / AC-77: toplu özet listenin bütününü sayar, maliyetsiz sayısı yalnız maliyet yönünde", () => {
    const oz = topluKipOzeti(PARCALAR, KIP_MALIYET, bag());
    expect(oz).toMatchObject({ toplam: 6, degisecek: 6 });
    expect(oz.maliyetsiz).toBe(3); // Kayış, Pim ve set (bileşeni Kayış maliyetsiz)
    expect(topluKipOzeti(PARCALAR, KIP_ELLE, bag())).toMatchObject({ degisecek: 0, maliyetsiz: 0 });
    expect(topluKipMetni(6, KIP_MALIYET)).toBe("Listedeki 6 parçayı maliyete bağla");
    expect(maliyetsizUyariMetni(2)).toMatch(/fiyatları boş görünür/);
  });
});

describe("Spec 0133: etki hesabı (R16, R16/2)", () => {
  it("AC-73: parametresiz dönüş spec öncesi altınla birebir", () => {
    const altin = JSON.parse(kod("tests/fixtures/0133-etki-once.json"));
    expect(fiyatEtkisi(ETKI_ESKI, ETKI_YENI, ETKI_PARCALAR, MALZEMELER)).toEqual(altin);
  });
  it("AC-38 / AC-39 / AC-74: fiyat ayarı verilince satırlara eski/yeni fiyat, sonuca değişen fiyat sayısı eklenir", () => {
    const e = fiyatEtkisi(ETKI_ESKI, ETKI_YENI, ETKI_PARCALAR, MALZEMELER, { fiyatAyarlari: { varsayilanKat: 2 } });
    expect(e.degisen).toBe(3);
    const bagliMil = e.satirlar.find(r => r.id === 67); // kendi katı 2,4
    expect(bagliMil.oncekiFiyat).toBe(Math.round(14233 * 2.4) / 100);
    expect(bagliMil.yeniFiyat).toBe(Math.round(16404 * 2.4) / 100);
    expect(e.satirlar.find(r => r.id === 65).oncekiFiyat).toBe(4500); // elle sabit: girilen
    expect(e.fiyatDegisen).toBe(1);
    expect(fiyatEtkiMetni(e)).toBe("1 parçanın satış fiyatı değişecek.");
  });
  it("AC-40: fiyatı değişen yoksa sıfır ve nedeni", () => {
    const parts = ETKI_PARCALAR.filter(p => p.id !== 67);
    const e = fiyatEtkisi(ETKI_ESKI, ETKI_YENI, parts, MALZEMELER, { fiyatAyarlari: { varsayilanKat: 2 } });
    expect(e.fiyatDegisen).toBe(0);
    expect(fiyatEtkiMetni(e)).toMatch(/^Satış fiyatı değişecek parça yok/);
  });
  it("AC-74 (kaynak): pencere kendi çarpımını yazmaz, metni motordan alır", () => {
    // Spec 0139 ile (karar 43): etki özetinin çizimi tek bileşene (MalzemeEtkiOzeti) taşındı; pencere onu çizer.
    const k = yorumsuz(kod("src/components/MalzemeFiyatPenceresi.jsx")) + yorumsuz(kod("src/components/MalzemeEtkiOzeti.jsx"));
    expect(k).toMatch(/fiyatEtkiMetni\(/);
    expect(kod("src/components/MalzemeFiyatPenceresi.jsx")).toMatch(/<MalzemeEtkiOzeti etki=\{etki\} \/>/);
    expect(k).not.toMatch(/karKati|varsayilanKat|\*\s*kat\b/);
  });
});

describe("Spec 0133: dışa ve içe aktarma (R18, R19, R19/2)", () => {
  const AYAR = { varsayilanKat: 2.4 };
  const PARTS = PARCALAR.map(p => (p.id === 65 ? bagli(p) : p));
  const katalog = setKatalogu(PARTS);
  const mk = malzemeKatalogu(MALZEMELER);
  it("AC-42 / AC-43: maliyete bağlı satırda türetilmiş fiyat, elle sabitte girilen değer", () => {
    expect(parcaDisaAktarmaSatiri(PARTS.find(p => p.id === 65), katalog, mk, AYAR)[6]).toBe(4082.69);
    expect(parcaDisaAktarmaSatiri(PARTS.find(p => p.id === 66), katalog, mk, AYAR)[6]).toBe(99.5);
  });
  const satirlar = (tl) => [PARCA_AKTARMA_BASLIKLARI, ["Kesme mili", "", "M-65-YENI", "Standart", "", "", tl, "", "", "", ""]];
  it("AC-75: dışa aktar ve değiştirmeden içe aktar turunda uyarı yok, fiyat yazılmaz", () => {
    const r = parcaSatirlariniCoz(satirlar(4082.69), PARTS, 1000, "2026-11-08", MALZEMELER, AYAR);
    expect(r.errors.filter(e => e.includes(FIYAT_EXCEL_HATASI))).toEqual([]);
    expect(r.parts.find(p => p.id === 65).fiyatTRY).toBe(4500);
  });
  it("AC-44 / AC-76: farklı değer satır numarasıyla bildirilir, fiyat alınmaz, öteki hücreler yazılır", () => {
    const r = parcaSatirlariniCoz(satirlar("5000"), PARTS, 1000, "2026-11-08", MALZEMELER, AYAR);
    expect(r.errors).toContain(`Satır 2: ${FIYAT_EXCEL_HATASI}`);
    const p = parcaIceAktarmaUygula(PARTS, r.parts).find(x => x.id === 65); // uygulanmış kayıt: kip ve kat korunur
    expect(p.fiyatTRY).toBe(4500);
    expect(p.kod).toBe("M-65-YENI");
    expect(p.fiyatKipi).toBe("maliyet");
  });
  it("R19 (elle sabit): fiyat hücresi bugünkü gibi alınır", () => {
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ["Rulman", "", "", "Standart", "", "", "500", "", "", "", ""]], PARTS, 1000, "2026-11-08", MALZEMELER, AYAR);
    expect(r.parts.find(x => x.id === 61).fiyatTRY).toBe("500");
    expect(r.errors).toEqual([]);
  });
});

describe("Spec 0133: fiyat listesi (R17, R17/2)", () => {
  const PARTS = [bagli(MILI), { ...PARCALAR[0] }, bagli({ id: 70, ad: "Boş <b>", kod: "B&1" }), { id: 71, ad: "Silik", deletedAt: "x", fiyatTRY: 5 }];
  it("AC-41 / AC-91: Türkçe, sütunlar ad/kod/kip/kat/fiyat, canlı parçalar katalog sırasıyla", () => {
    expect(FIYAT_LISTESI_SUTUNLARI).toEqual(["Parça", "Kod", "Kip", "Kâr katı", "Fiyat (TL)"]);
    const html = fiyatListesiHtml(PARTS, bag({ varsayilanKat: 2.4 }, PARTS), { bugun: "2026-11-08" });
    expect(html).toMatch(/FİYAT LİSTESİ/);
    expect(html.indexOf("Kesme mili")).toBeLessThan(html.indexOf("Rulman"));
    expect(html).not.toMatch(/Silik/);
    expect(html).toMatch(/4\.082,69 ₺/);
    expect(html).toMatch(/Maliyete bağlı/);
    expect(html).toMatch(/Elle sabit/);
  });
  it("AC-25: türetilemeyen satır 'fiyat türetilemedi'", () => {
    expect(fiyatListesiSatiri(bagli({ id: 70, ad: "X" }), bag())[4]).toBe(TURETILEMEDI);
  });
  it("AC-90: hücreler kaçışlı, sunum dili ortak modülden", () => {
    const html = fiyatListesiHtml(PARTS, bag({}, PARTS), { bugun: "2026-11-08" });
    expect(html).toMatch(/Boş &lt;b&gt;/);
    expect(html).toMatch(/B&amp;1/);
    expect(kod("src/lib/fiyatListesiRaporu.js")).toMatch(/from "\.\/raporSunumu"/);
    expect(kod("src/lib/printTemplates.js")).not.toMatch(/fiyatListesi/);
  });
  it("AC-92: düğme salt okunur (yazıcı almaz), PartManager başlığında", () => {
    const d = yorumsuz(kod("src/components/rapor/FiyatListesiDugmesi.jsx"));
    expect(d).not.toMatch(/set[A-Z]\w*\(/);
    expect(kod("src/components/PartManager.jsx")).toMatch(/<FiyatListesiDugmesi/);
  });
});

describe("Spec 0133: kaynak taramaları", () => {
  const SATIS = ["src/components/Documents.jsx", "src/components/ServiceForm.jsx", "src/components/YedekParcaSatisForm.jsx",
    "src/components/stock/PartStokTab.jsx", "src/components/PartSaleForm.jsx", "src/lib/yedekParcaSatis.js", "src/components/documents/KalemSecPenceresi.jsx"];
  it("Döngü dersi: parcaFiyati.js malzeme.js'ten aldığı adı modül düzeyinde kullanmaz (yükleme sırasına göre undefined kalırdı)", () => {
    const k = yorumsuz(kod("src/lib/parcaFiyati.js"));
    expect(k).not.toMatch(/^export const \w+ = (BELIRSIZ_HATASI|BELIRSIZ_DESEN|malzemeKatalogu)\b/m);
  });
  it("AC-51: tek okuma yolu saf: React ve saat yok", () => {
    const k = yorumsuz(kod("src/lib/parcaFiyati.js"));
    expect(k).not.toMatch(/from "react"|Date\.now|new Date|yerelBugun|today\(/);
  });
  it("AC-52: yedi satış dosyasında maliyet alanı ve maliyet motorunun adı geçmez", () => {
    for (const f of SATIS) expect(yorumsuz(kod(f)), f).not.toMatch(/parcaMaliyetKurus|\.maliyet\b|urunAgaci/);
  });
  it("AC-21 / AC-53: satış dosyaları ve katalog listesi fiyat alanlarını doğrudan okumaz; ortak yoldan okur", () => {
    for (const f of SATIS) expect(yorumsuz(kod(f)), f).not.toMatch(/\.fiyat(TRY|USD|EUR)\b|partFiyatForCurrency/);
    for (const f of ["src/components/Documents.jsx", "src/components/ServiceForm.jsx", "src/components/YedekParcaSatisForm.jsx", "src/components/stock/PartStokTab.jsx"]) {
      expect(kod(f), f).toMatch(/from "(\.\.\/)+lib\/parcaFiyati"/);
    }
    const ps = kod("src/components/PartManager.jsx");
    const ozet = ps.slice(ps.indexOf("const priceSummary"), ps.indexOf("const priceSummary") + 900);
    expect(ozet).toMatch(/parcaSatisFiyati\(/);
  });
  it("C3 / C3/2: kat ve yuvarlama çarpımı yalnız parcaFiyati.js'te (makina öneri fiyatı ayrı kavram, 0088)", () => {
    const ihlal = tumKaynak("src").filter(f => !f.endsWith("parcaFiyati.js") && !f.endsWith("makinaStandartMaliyet.js"))
      .filter(f => /karKati|varsayilanKat/.test(yorumsuz(kod(f))) && /\*\s*(kat|karKati|varsayilanKat)\b/.test(yorumsuz(kod(f))));
    expect(ihlal).toEqual([]);
    expect(yorumsuz(kod("src/lib/parcaFiyati.js"))).toMatch(/Math\.round\(Number\(\(maliyetK \* kat\)\.toFixed\(6\)\)\)/);
  });
  it("AC-85: nedenler tek sabit kümesinden; kaynakta ikinci kopya yok", () => {
    for (const metin of [NEDEN_MALIYET_YOK, NEDEN_KAT_YOK, DOVIZ_NOTU, TURETILEMEDI]) {
      const yer = tumKaynak("src").filter(f => kod(f).includes(metin));
      expect(yer, metin).toEqual(["src/lib/parcaFiyati.js"]);
    }
  });
  it("AC-96: maliyet motoru fiyat kavramını bilmez; tek okuma yolunun imzası aynı", () => {
    const k = yorumsuz(kod("src/lib/urunAgaci.js"));
    expect(k).not.toMatch(/parcaFiyati|karKati|fiyatKipi|yuvarlama/);
    expect(k).toMatch(/export const parcaMaliyetKurus = \(p, tarih, katalog, malzemeKat\)/);
  });
  it("AC-78: katalog listesinde satır seçimi onay kutusu yok", () => {
    const ps = kod("src/components/PartManager.jsx");
    const liste = ps.slice(ps.indexOf("<tbody"));
    expect(liste).not.toMatch(/type="checkbox"/);
  });
  it("AC-81 / R21: yeni ayar alanı sunucu eşlemesinde Ayarlar sekmesiyle açıkça", () => {
    expect(kod("electron/serverAuth.cjs")).toMatch(/fiyatAyarlari: \["settings"\]/);
  });
  it("AC-82: panel Ayarlar kilit listesinde; bugünkü Uygulama paneli yazıcı almaz", () => {
    expect(kod("src/lib/kilitAlanlari.js")).toMatch(/fiyat: "Fiyat Ayarları"/);
    expect(kod("src/components/Settings.jsx")).not.toMatch(/<SettingsApp[^>]*setAppSettings/);
  });
  it("AC-84: kip süzgeci ve yuvarlama ayarı Segment dugme", () => {
    expect(kod("src/components/PartManager.jsx")).toMatch(/<Segment kip="dugme"[^>]*ariaLabel="Fiyat kipi süzgeci"/);
    expect(kod("src/components/settings/SettingsFiyat.jsx")).toMatch(/<Segment kip="dugme"/);
  });
  it("AC-89: birden küçük kat listede rozet taşımaz", () => {
    const ps = kod("src/components/PartManager.jsx");
    expect(ps.slice(ps.indexOf("<tbody"))).not.toMatch(/ZARAR_UYARISI|zarar/);
  });
  it("C5/2 / AC-47: db.cjs dört nokta; elle sabit değer saklanmaz", () => {
    const d = kod("electron/db.cjs");
    expect(d).toMatch(/fiyatKipi TEXT/);
    expect(d).toMatch(/karKati REAL/);
    expect(d).toMatch(/fiyatAyarlari TEXT/);
  });
  it("R10/4 / AC-59: ayrı pencere malzeme listesini salt okunur alır (yazılabilir bölümlere girmez)", () => {
    const sp = kod("src/components/ServisPencere.jsx");
    expect(sp).toMatch(/malzemeler=\{snap\.malzemeler\}/);
    expect(sp).not.toMatch(/setMalzemeler/);
    const y = kod("electron/ipc/servis-pencere.cjs");
    expect(y.slice(y.indexOf("YAZILABILIR"), y.indexOf("YAZILABILIR") + 200)).not.toMatch(/malzemeler/);
  });
});
