// Spec 0087: parça maliyeti ve ürün ağacı adetleri, saf katman ve kaynak taramaları.
// Tek yazma yolu `src/lib/urunAgaci.js`; doğrulayıcılar parça formu, model formu ve içe aktarma tarafından paylaşılır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parcaMaliyetDogrula, kitAdediDogrula, ekMaliyetDogrula, kitleriGuncelle, parcaKitPlani, parcaKitAdetleri,
  modelAdiParcalardaTasi, modelAdiParcalaraDokunurMu, maliyetMetni, maliyetGirildiMi, KIT_ADET_HATASI } from "../src/lib/urunAgaci";
import { tutarCoz } from "../src/lib/gider";
import { partFiyatForCurrency } from "../src/lib/utils";
import { MALZEME_HARIC_NOTU } from "../src/lib/makinaMaliyeti";
import { TutarInput as UiTutar } from "../src/components/ui";
import { TutarInput as GiderTutar, tutarMetni as GiderTutarMetni } from "../src/components/gider/GiderAlanlari";
import { tutarMetni } from "../src/lib/tutarGirdisi";

const oku = (f) => readFileSync(f, "utf8");
const kaynaklar = () => {
  const d = [];
  const gez = (k) => { for (const a of readdirSync(k)) { const y = path.join(k, a); if (statSync(y).isDirectory()) gez(y); else if (/\.(jsx?|mjs|cjs)$/.test(a)) d.push(y.split(path.sep).join("/")); } };
  gez("src");
  return d;
};
// Yorum satırları taramaya girmez.
const kod = (f) => oku(f).split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

const STD = () => [
  { model: "AK100_DS", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 2 }] },
  { model: "AK120_DS", defaultParcalar: [] },
];
const OZEL = () => [
  { model: "OZEL_1", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 1 }] },
  { model: "COP_1", deletedAt: "2026-10-01T00:00:00.000Z", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 9 }] },
];

describe("Spec 0087: parça maliyeti (saf)", () => {
  it("AC-2: \"7,50\" ve \"7.50\" 7,50 TL, \"1.234,56\" 1.234,56 TL olarak çözülür (tutarCoz kuralı)", () => {
    expect(parcaMaliyetDogrula("7,50").deger).toBe(7.5);
    expect(parcaMaliyetDogrula("7.50").deger).toBe(7.5);
    expect(parcaMaliyetDogrula("1.234,56").deger).toBe(1234.56);
    expect(tutarCoz("7.50").deger).toBe(7.5);
  });

  it("AC-2: maliyet alanı MoneyInput ya da parseMoney kullanmaz (kaynak taraması)", () => {
    for (const f of ["src/components/PartManager.jsx", "src/components/ModelsManager.jsx", "src/lib/urunAgaci.js", "src/lib/parcaAktarma.js"]) {
      const satirlar = kod(f).split("\n").filter(l => /maliyet/i.test(l));
      for (const l of satirlar) expect(l, `${f}: ${l.trim()}`).not.toMatch(/MoneyInput|parseMoney/);
    }
    const blok = oku("src/components/PartManager.jsx").split("const MaliyetAlani")[1].split("\n);")[0];
    expect(blok).toContain("<TutarInput");
    expect(blok).not.toMatch(/MoneyInput|parseMoney/);
  });

  it("AC-3: TutarInput ui.jsx'ten dışa verilir, GiderAlanlari aynı bileşeni yeniden verir; gider/ dışında GiderAlanlari'ndan tutar alanı alınmaz", () => {
    expect(GiderTutar).toBe(UiTutar);
    expect(GiderTutarMetni).toBe(tutarMetni);
    const ihlal = kaynaklar().filter(f => !f.startsWith("src/components/gider/")).filter(f => {
      const m = oku(f).match(/import\s*\{([^}]*)\}\s*from\s*"[^"]*gider\/GiderAlanlari"/);
      return m && /\bTutarInput\b/.test(m[1]);
    });
    expect(ihlal).toEqual([]);
  });

  it("AC-4, R4: boş maliyet \"girilmedi\"dir (değer yok), sıfır açıkça girilebilir", () => {
    expect(parcaMaliyetDogrula("")).toEqual({ bos: true, deger: null, hata: null });
    expect(parcaMaliyetDogrula(undefined).bos).toBe(true);
    expect(parcaMaliyetDogrula("0")).toEqual({ bos: false, deger: 0, hata: null });
    expect(maliyetGirildiMi({ maliyet: 0 })).toBe(true);
    expect(maliyetGirildiMi({})).toBe(false);
  });

  it("AC-5: girilmemiş maliyet \"—\", sıfır \"0,00 ₺\", kuruşlu değer iki haneyle", () => {
    expect(maliyetMetni(undefined)).toBe("—");
    expect(maliyetMetni(0)).toBe("0,00 ₺");
    expect(maliyetMetni(1234.5)).toBe("1.234,50 ₺");
  });

  it("AC-6: maliyet satış fiyatı değildir; satışın tek fiyat okuyucusu maliyetten etkilenmez ve satış ekranları maliyeti okumaz", () => {
    const p = { fiyatTRY: 450, fiyatUSD: 12, fiyatEUR: "" };
    for (const c of ["TRY", "USD", "EUR"]) expect(partFiyatForCurrency({ ...p, maliyet: 99.9 }, c)).toBe(partFiyatForCurrency(p, c));
    for (const f of ["src/components/Documents.jsx", "src/components/ServiceForm.jsx", "src/components/YedekParcaSatisForm.jsx",
      "src/components/stock/PartStokTab.jsx", "src/components/PartSaleForm.jsx", "src/lib/yedekParcaSatis.js"]) {
      expect(kod(f), f).not.toMatch(/\.maliyet\b|urunAgaci/);
    }
  });

  it("AC-7: negatif ve sayıya çevrilemeyen maliyet reddedilir", () => {
    expect(parcaMaliyetDogrula("-3").hata).toBe("Maliyet negatif olamaz.");
    expect(parcaMaliyetDogrula("abc").hata).toBe("Maliyet sayı olmalı.");
    expect(parcaMaliyetDogrula("12,5x").hata).toBe("Maliyet sayı olmalı.");
  });
});

describe("Spec 0087: ürün ağacı adetleri (saf)", () => {
  const kit = (ek) => ({ partId: 7, ad: "Rulman", models: ["AK100_DS", "AK120_DS", "OZEL_1"], eskiModeller: ["AK100_DS", "OZEL_1"], adetler: {}, ...ek });

  it("AC-10: parça kartından girilen adet kite yazılır (yeni satır ve var olan satırın güncellemesi)", () => {
    const s = kitleriGuncelle(STD(), kit({ adetler: { AK100_DS: 4, AK120_DS: 3 } }));
    expect(s[0].defaultParcalar).toEqual([{ partId: "7", ad: "Rulman", miktar: 4 }]);
    expect(s[1].defaultParcalar).toEqual([{ partId: "7", ad: "Rulman", miktar: 3 }]);
  });

  it("AC-11: parça kartı adedi kitten okur (iki model bölümünden)", () => {
    expect(parcaKitAdetleri(7, [STD(), OZEL()])).toEqual({ AK100_DS: 2, OZEL_1: 1, COP_1: 9 });
  });

  it("AC-12: işaretli ama adedi boş model için kitte satır doğmaz", () => {
    const s = kitleriGuncelle(STD(), kit({ adetler: { AK120_DS: null } }));
    expect(s[1].defaultParcalar).toEqual([]);
  });

  it("AC-13: adet boşaltılınca kit satırı düşer, işaret kalır", () => {
    const plan = parcaKitPlani(kit({ adetler: { AK100_DS: null } }), STD(), OZEL());
    expect(plan.standartDegisir).toBe(true);
    expect(kitleriGuncelle(STD(), plan.kit)[0].defaultParcalar).toEqual([]);
    expect(plan.kit.models).toContain("AK100_DS");
  });

  it("AC-14: işareti kaldırılan modelin kitinden de düşer (aynı plan nesnesiyle)", () => {
    const plan = parcaKitPlani(kit({ models: ["AK100_DS"], adetler: { AK100_DS: 2 } }), STD(), OZEL());
    expect(plan.ozelDegisir).toBe(true);
    expect(kitleriGuncelle(OZEL(), plan.kit)[0].defaultParcalar).toEqual([]);
  });

  it("AC-15: adet en az 1 tam sayı; 0, negatif ve ondalık reddedilir", () => {
    for (const x of ["0", "-1", "1,5", "1.5", "abc"]) expect(kitAdediDogrula(x).hata, x).toBe(KIT_ADET_HATASI);
    expect(kitAdediDogrula("3")).toEqual({ bos: false, deger: 3, hata: null });
    expect(kitAdediDogrula(" ").bos).toBe(true);
  });

  it("AC-16: standart modelin kitine de yazılır (standardModels değişir)", () => {
    const plan = parcaKitPlani(kit({ adetler: { AK120_DS: 5 } }), STD(), OZEL());
    expect(plan.standartDegisir).toBe(true);
    expect(plan.ozelDegisir).toBe(false);
  });

  it("AC-17: model yeniden adlandırılınca parça işareti yeni ada taşınır, ilgisiz dizi aynı referans", () => {
    const parts = [{ id: 7, models: ["AK100_DS", "OZEL_1"] }, { id: 8, models: ["OZEL_1"] }];
    const y = modelAdiParcalardaTasi(parts, "AK100_DS", "AK100_DSX");
    expect(y[0].models).toEqual(["AK100_DSX", "OZEL_1"]);
    expect(y[1]).toBe(parts[1]);
    expect(modelAdiParcalardaTasi(parts, "YOK", "X")).toBe(parts);
    expect(modelAdiParcalaraDokunurMu(parts, "OZEL_1", "OZEL_2")).toBe(true);
    expect(modelAdiParcalaraDokunurMu(parts, "OZEL_1", "OZEL_1")).toBe(false);
  });

  it("AC-18: parça yeniden adlandırılınca bütün kitlerde satırın ad kopyası taşınır (işaretli olmayanda da)", () => {
    const s = kitleriGuncelle(OZEL(), { partId: 7, ad: "Rulman 6204", models: [], eskiModeller: [], adetler: {} });
    expect(s.map(m => m.defaultParcalar[0].ad)).toEqual(["Rulman 6204", "Rulman 6204"]);
  });

  it("AC-28, plan P6: ekranda çizilmeyen (çöpteki) modelin işareti ve kit satırı adet planında değişmez", () => {
    const oz = OZEL();
    const s = kitleriGuncelle(oz, { partId: 7, ad: "Rulman", models: ["OZEL_1", "COP_1"], eskiModeller: ["OZEL_1", "COP_1"], adetler: { OZEL_1: 2 } });
    expect(s[0].defaultParcalar[0].miktar).toBe(2);
    expect(s[1]).toBe(oz[1]);
    expect(s[1].defaultParcalar).toEqual([{ partId: "7", ad: "Rulman", miktar: 9 }]);
  });

  it("R15: hiçbir şey değişmezse iki dizi de aynı referansla döner, plan karşı bölüme yazmaz", () => {
    const std = STD(); const oz = OZEL();
    const plan = parcaKitPlani({ partId: 7, ad: "Rulman", models: ["AK100_DS", "OZEL_1"], eskiModeller: ["AK100_DS", "OZEL_1"], adetler: { AK100_DS: 2, OZEL_1: 1 } }, std, oz);
    expect(plan.karsiBolumeYazar).toBe(false);
    expect(kitleriGuncelle(std, plan.kit)).toBe(std);
  });

  it("AC-19: işaret ile kiti birlikte yazan tek yol urunAgaci'dir (kaynak taraması)", () => {
    const yazan = kaynaklar().filter(f => /defaultParcalar/.test(kod(f)));
    // Spec 0088 ile: Makina Maliyeti motoru kiti OKUR (direkt maliyet, R11); yazmaz (taraması aşağıda).
    expect(yazan.sort()).toEqual(["src/components/ModelsManager.jsx", "src/components/stock/MakinaStokTab.jsx", "src/lib/makinaStandartMaliyet.js", "src/lib/urunAgaci.js"]);
    expect(kod("src/lib/makinaStandartMaliyet.js")).not.toMatch(/defaultParcalar\s*:/);
    // Parça paneli kite yalnız urunAgaci üzerinden yazar; model paneli parçanın işaretini yalnız urunAgaci üzerinden taşır.
    expect(kod("src/components/PartManager.jsx")).toMatch(/setStandardModels\?\.\(p => kitleriGuncelle\(p, kit\)\)/);
    expect(kod("src/components/PartManager.jsx")).not.toMatch(/defaultParcalar/);
    expect(kod("src/components/ModelsManager.jsx")).toMatch(/setParts\?\.\(p => modelAdiParcalardaTasi\(p, oldName, name\)\)/);
    expect(kod("src/components/ModelsManager.jsx")).not.toMatch(/setParts\?\.\(p => p\.map/);
    // Stok yalnız okur.
    expect(kod("src/components/stock/MakinaStokTab.jsx")).not.toMatch(/setStandardModels|setCustomModels/);
  });
});

describe("Spec 0087: ek maliyet kalemleri (saf)", () => {
  it("AC-26: adı boş ya da tutarı negatif/boş kalem reddedilir; tamamen boş satır atılır, sıra korunur", () => {
    const r = ekMaliyetDogrula([{ ad: "Büküm", tutar: "90" }, { ad: "", tutar: "" }, { ad: "", tutar: "5" }, { ad: "Kaplama", tutar: "-1" }, { ad: "Montaj", tutar: "" }, { ad: "Taşlama", tutar: "145,60" }]);
    expect(r.gecerli).toBe(false);
    expect(r.hatalar).toEqual({ 2: "Kalem adı boş olamaz.", 3: "Tutar negatif olamaz.", 4: "Tutar girilmedi." });
    expect(r.kalemler).toEqual([{ ad: "Büküm", tutar: 90 }, { ad: "Taşlama", tutar: 145.6 }]);
    expect(ekMaliyetDogrula([{ ad: "", tutar: "" }])).toEqual({ kalemler: [], hatalar: {}, gecerli: true });
  });

  it("AC-24, C9: ek maliyet listesi makina kitine yazılmaz ve gider ek ödeme altyapısını kullanmaz (kaynak taraması)", () => {
    for (const f of ["src/components/ModelsManager.jsx", "src/lib/urunAgaci.js"]) {
      for (const l of kod(f).split("\n").filter(x => /ekMaliyet/.test(x))) expect(l, `${f}: ${l.trim()}`).not.toMatch(/defaultParcalar[^,;]*ekMaliyet|ekMaliyet[^,;]*defaultParcalar/);
      expect(kod(f), f).not.toMatch(/ekOdemeler|gider_ek_odemeleri|EK_ODEME/);
    }
    expect(kod("src/components/stock/MakinaStokTab.jsx")).not.toMatch(/ekMaliyet/);
    expect(kod("electron/db.cjs")).not.toMatch(/ekMaliyetler[^\n]*gider_ek_odemeleri|gider_ek_odemeleri[^\n]*ekMaliyetler/);
  });
});

describe("Spec 0087: değişmeyenler", () => {
  it("AC-38: MALZEME_HARIC_NOTU yerinde ve makina maliyeti motoru yeni alanları okumaz", () => {
    expect(MALZEME_HARIC_NOTU).toBe("Stoktan çekilen parçaların maliyeti hariç.");
    expect(kod("src/lib/makinaMaliyeti.js")).not.toMatch(/urunAgaci|ekMaliyetler|parcaMaliyet|maliyetGirildiMi/);
  });

  it("AC-32: yeni eylem izni ve yeni sunucu istisnası yok (izin tanımları ve sunucu yeni alanları bilmez)", () => {
    for (const f of ["src/components/settings/serverPermissionDefs.js", "electron/serverAuth.cjs", "src/lib/permissions.js", "src/lib/merge.js"]) {
      expect(oku(f), f).not.toMatch(/ekMaliyet|parca_maliyet|maliyetDogrula|urunAgaci/);
    }
  });
});
