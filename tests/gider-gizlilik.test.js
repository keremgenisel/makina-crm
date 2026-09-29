// Spec 0001 AC-56 / C7b / X14 / X16: çalışan bazlı personel tutarı ve elden bileşen hiçbir yazdırma
// çıktısına ve hiçbir CSV/XLSX dışa aktarma dosyasına girmez. Yazdırma şablonları ve dışa aktarma
// üreticileri gider/personel alanlarını HİÇ okumamalı; biri ileride eklerse bu test kırılır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..");
const oku = (p) => readFileSync(path.join(root, p), "utf-8");
// Spec 0023: çalışan ek ödemeleri (alan, tablo ve tür kodu) de listede; listeye eklenmeyen ad testi yeşil bırakıp sızabilirdi.
const YASAKLI = /resmiTutar|eldenTutar|resmiMaliyet|eldenMaliyet|calisanAd|giderler|giderTanimlari|standartGiderler|tedarikciler|ekOdemeler|gider_ek_odemeleri|EK_ODEME_TUR|fazlaCalisma/;

describe("AC-56: personel tutarı yazdırma ve dışa aktarmaya girmez", () => {
  it("yazdırma şablonları (printTemplates.js) gider/personel alanlarını okumaz", () => {
    expect(oku("src/lib/printTemplates.js")).not.toMatch(YASAKLI);
  });
  it("aylık rapor motoru gider verisi almaz (X14: rapor şablonu 0002 ile birlikte değişecek)", () => {
    expect(oku("src/lib/aylikRapor.js")).not.toMatch(YASAKLI);
  });
  it("CSV/XLSX dışa aktarma (SettingsExport.jsx) gider/personel alanlarını okumaz", () => {
    expect(oku("src/components/settings/SettingsExport.jsx")).not.toMatch(YASAKLI);
  });
  it("gider bileşenleri yazdırma API'sini çağırmaz", () => {
    const dosyalar = ["src/components/Giderler.jsx", "src/components/GiderForm.jsx",
      ...readdirSync(path.join(root, "src/components/gider")).map(f => `src/components/gider/${f}`)];
    for (const f of dosyalar) expect(oku(f), f).not.toMatch(/appPrint|printHtml|downloadCSV|XLSX|writeFile/);
  });
});

// Spec 0020 AC-10 / R6: personel kalemi artık makinaya ve modele atanabilir; atama ve makina maliyeti çıktısı da
// hiçbir yazdırma, e-posta veya dışa aktarma üreticisine girmez. Maliyet yalnız ekranda (MakinaMaliyetDetay) çizilir.
describe("Spec 0020 AC-10: atanmış personel kalemi ve makina maliyeti çıktılara girmez", () => {
  const MALIYET = /makinaMaliyet|hesaplaMakinaMaliyetleri|makinaKarlilik|karlilikOzeti|dogrudanKalemler|malzemePaylari|kalemGorunenAd|PERSONEL_ETIKETI|Personel gideri|atamaTur|modelSatirlari|kovaDagilimi|kalemKovalariKurus/;
  it.each(["src/lib/printTemplates.js", "src/lib/aylikRapor.js", "src/lib/mailTemplates.js", "src/components/settings/SettingsExport.jsx",
    "src/components/settings/csvUtils.js", "src/components/Finance.jsx", "src/components/Documents.jsx", "src/components/stock/UretimFormu.jsx"])(
    "%s atama ve makina maliyeti alanlarını okumaz", (f) => {
      expect(oku(f)).not.toMatch(MALIYET);
    });
  it("müşteri detayında makina maliyeti yalnız ekrandaki maliyet kutusuna verilir, yazdırma yollarına girmez", () => {
    const satirlar = oku("src/components/customers/CustomerDetailModal.jsx").split("\n").filter(l => /makinaKarlilik\(/.test(l));
    expect(satirlar).toHaveLength(1);
    expect(satirlar[0]).toContain("<MakinaMaliyetDetay detay={makinaKarlilik(");
  });
});

// Spec 0041 AC-27 (X6): gider ödemelerinin yöntem kırılımı Aylık Faaliyet Raporu'na ve CSV/XLSX dışa aktarmaya girmez.
describe("Spec 0041 AC-27: yöntem kırılımı yazdırma ve dışa aktarmaya girmez", () => {
  it("AC-27: çıktı dosyaları yöntem motorunu ve gider ödeme hareketlerini okumaz", () => {
    const YONTEM = /odemeYontemi|yontemKirilimi|donemYontemKirilimi|hareketPaylari|hesapHareketleri/;
    for (const f of ["src/lib/printTemplates.js", "src/lib/aylikRapor.js", "src/components/settings/SettingsExport.jsx"]) {
      expect(oku(f)).not.toMatch(YONTEM);
    }
  });
});

// Spec 0042 AC-11 (C6, R15): personelin resmi/elden hedef adları ve tutarları yazdırma ve dışa aktarmaya girmez.
describe("Spec 0042 AC-11: personel hedefleri çıktılara girmez", () => {
  it("AC-11: çıktı dosyaları HEDEF.ELDEN değerini, hedef adlarını ve personel hedef hesabını okumaz", () => {
    const HEDEF_DESEN = /HEDEF\.ELDEN|["']elden["']|hedefAdi|personelHedefKurus|HEDEF_AD\b/;
    for (const f of ["src/lib/printTemplates.js", "src/lib/aylikRapor.js", "src/components/settings/SettingsExport.jsx"]) {
      expect(oku(f)).not.toMatch(HEDEF_DESEN);
    }
  });
});
