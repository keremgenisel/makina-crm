// Spec 0113: ödeme işareti olan dört bedel kutusu yalnız tahsil edilen bedeli gösterir. Saf yardımcı, tahakkuk kalan iki
// arşiv belgesi (aylık rapor, Finans Özeti Excel) ve kaynak taramaları. Ekran tests/ui/finans-tahsil-0113.test.jsx'te.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { satisTahsilEdildi, tahsilBeklemeNedeni, TAHSIL_NEDEN_CEK, TAHSIL_NEDEN_KART } from "../src/lib/utils.js";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor.js";
import { finansOzetiHesapla } from "../src/components/settings/SettingsExport.jsx";
import { TAHSIL_KART_ADLARI, TAHSIL_EK } from "../src/components/Finance.jsx";
import { ayikla0113, ESKI_KART_ADLARI_0113 } from "./fixtures/0113-ayikla.js";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const srcDosyalari = () => {
  const { readdirSync, statSync } = require("node:fs");
  const gez = (d) => readdirSync(path.join(kok, d)).flatMap(n => { const r = path.join(d, n); return statSync(path.join(kok, r)).isDirectory() ? (r.endsWith(path.join("lib", "map")) ? [] : gez(r)) : /\.(m?js|jsx)$/.test(n) ? [r] : []; });
  return gez("src");
};

describe("Spec 0113: tahsil bekleme nedeni", () => {
  it("R18/2: neden yalnız ödendi işaretli ama tahsil edilmemiş kayıtta; ölçütle tutarlı", () => {
    const durumlar = [
      [{ odendi: false }, null],
      [{ odendi: true, yontem: "Nakit" }, null],
      [{ odendi: true, yontem: "" }, null],
      [{ odendi: true, yontem: "Çek", tahsilEdildi: false }, TAHSIL_NEDEN_CEK],
      [{ odendi: true, yontem: "Çek", tahsilEdildi: true }, null],
      [{ odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { blokajGun: 30, hesabaGecis: "2099-01-01" } }, TAHSIL_NEDEN_KART],
      [{ odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { blokajGun: 30, hesabaGecis: "2000-01-01" } }, null],
    ];
    for (const [k, beklenen] of durumlar) {
      expect(tahsilBeklemeNedeni(k), JSON.stringify(k)).toBe(beklenen);
      if (k.odendi) expect(beklenen === null, JSON.stringify(k)).toBe(satisTahsilEdildi(k));
    }
  });
});

describe("Spec 0113: arşiv belgeleri tahakkuk kalır", () => {
  const veri = (odendi) => ({
    customers: [{ id: 1, name: "Kutu Gıda", model: "AK100", currency: "TRY", installDate: "2026-10-01", faturali: "Faturalı Yurtiçi", fabrikaSatisBedeli: 100000, faturaBedeli: 100000 }],
    services: [{ id: 41, customerId: 1, date: "2026-10-06", type: "Garanti Dışı", islemFirma: "Altuntaş Makina", servisUcreti: "1000", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", parcaUcreti: "500", parcaCurrency: "TRY", odendi, yontem: "Nakit" }],
    partSales: [{ id: 31, customerId: 1, tur: "Kalıp", ad: "K", ucret: 10000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-05", odendi, yontem: "Nakit", satisFirma: "Altuntaş Makina" }],
    payments: [], teklifler: [], dealers: [],
    yedekParcaSatislar: [{ id: 51, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 1, birimFiyat: 300, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-07", odendi, yontem: "Nakit", tahsisler: [] }],
  });
  it("AC-23: aylık rapor ödenmedi yapılan kayıtları saymaya devam eder (ciro kalemleri iki varyantta aynı)", () => {
    const a = hesaplaAylikRapor(veri(true), "2026-10", {}), b = hesaplaAylikRapor(veri(false), "2026-10", {});
    for (const alan of ["ciroNet", "toplamKdv", "extraKalipTutar", "yedekKargoTutar"]) expect(b[alan], alan).toEqual(a[alan]);
    expect(a.extraKalipTutar.TRY).toBe(10000);
  });
  it("AC-40: Finans Özeti Excel'i ödendi işaretine bakmaz (tahakkuk)", () => {
    expect(finansOzetiHesapla(veri(false))).toEqual(finansOzetiHesapla(veri(true)));
  });
});

describe("Spec 0113: kaynak taramaları", () => {
  const fin = () => yorumsuz(oku("src/components/Finance.jsx"));
  it("AC-30 (C1): Finans elle ödeme koşulu yazmaz; ölçüt tek tanımdan", () => {
    const k = fin();
    expect(k).not.toMatch(/\.odendi\b/);
    expect(k).not.toMatch(/tahsilEdildi\s*===/);
    expect(k).not.toMatch(/yontem\s*===\s*"Çek"/);
    expect(k.match(/const tahsil = \(r\) => satisTahsilEdildi\(r\);/g)).toHaveLength(1);
  });
  it("AC-37 (R2/4): Finans tahsil ölçütüne gün argümanı geçmez", () => {
    expect([...fin().matchAll(/satisTahsilEdildi\(([^()]*)\)/g)].every(m => !m[1].includes(","))).toBe(true);
  });
  it("AC-35 (R16/2): dört ad ve ortak ek kaynakta yalnız sabit tanımında; eski adlar src altında yok", () => {
    const metinler = [...Object.values(TAHSIL_KART_ADLARI), TAHSIL_EK];
    const eski = Object.values(ESKI_KART_ADLARI_0113);
    for (const f of srcDosyalari()) {
      const k = yorumsuz(oku(f));
      for (const m of metinler) expect(k.split(`"${m}"`).length - 1, `${f}: ${m}`).toBe(f.endsWith(path.join("components", "Finance.jsx")) ? 1 : 0);
      for (const m of eski) expect(k.includes(m), `${f}: ${m}`).toBe(false);
    }
  });
  it("AC-45 / C4: Anasayfa, aylık rapor, Excel, Kasa ve Analiz bu işin sabitlerini ve süzgecini okumaz", () => {
    for (const f of ["src/components/Dashboard.jsx", "src/lib/aylikRapor.js", "src/components/settings/SettingsExport.jsx", "src/lib/kasa.js", "src/lib/analiz.js"]) {
      expect(oku(f), f).not.toMatch(/TAHSIL_KART_ADLARI|TAHSIL_EK|tahsilBeklemeNedeni|Tahakkuk\b/);
    }
  });
  it("AC-36 (C8): kıyas ayıklaması eski ve yeni kart adını birlikte tanır", () => {
    const parca = (ad) => `Toplam Bedel₺1KDV: ₺1altToplam Alacak₺0x${ad}₺5KDV: ₺1alt${TAHSIL_KART_ADLARI.parca}₺3Toplam Ödenen Komisyon₺0`;
    expect(ayikla0113(parca(ESKI_KART_ADLARI_0113.servis))).toBe(ayikla0113(parca(TAHSIL_KART_ADLARI.servis)));
    expect(ayikla0113(parca(TAHSIL_KART_ADLARI.servis))).toBe("Toplam Bedel[0113]Toplam Alacak₺0x[0113 dört kutu]Toplam Ödenen Komisyon₺0");
  });
});
