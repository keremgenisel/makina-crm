// Spec 0139 A: çap bandına göre ek fire (kg). Motor (`malzeme.js`), doğrulayıcı, sipariş ihtiyacı, örnek katalog ve kaynak taramaları.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as M from "../src/lib/malzeme";
import { kurus } from "../src/lib/gider";
import { parcaMaliyetKurus, setKatalogu } from "../src/lib/urunAgaci";
import { siparisIhtiyaci, FIRE_BOY_UYARISI } from "../src/lib/siparisIhtiyaci";
import { ornekMalzemeler } from "../src/lib/ornekKatalog";

const TABLO = [{ alt: 0, kg: 0 }, { alt: 21, kg: 0.05 }, { alt: 36, kg: 0.3 }, { alt: 91, kg: 0.35 }, { alt: 101, kg: 1 }, { alt: 141, kg: 1.75 }];
const kart = (o = {}) => ({ id: 501, ad: "304 Çubuk", ozgulAgirlik: 7.9, kiloFiyati: 3, paraBirimi: "TRY", fireBantlari: TABLO, ...o });
const oz = (satir, m) => M.malzemeOzeti({ malzemeId: 501, yontem: "kilo", ...satir }, M.malzemeKatalogu([m]));
const ham = (bicim, o, ro = 7.9) => M.agirlikKg(bicim, o, ro);
const yakin = (a, b) => expect(a).toBeCloseTo(b, 9);

describe("Spec 0139 A: kilogram fire motoru", () => {
  it("AC-1: tablosu boş malzemede fire dahil ağırlık eski formülle (ham × (1 + yüzde))", () => {
    const r = oz({ bicim: "mil", cap: 60, boy: 175 }, kart({ fireBantlari: undefined, fire: 8 }));
    yakin(r.fireliKg, ham("mil", { cap: 60, boy: 175 }) * 1.08);
    expect(r.ekFireKg).toBe(0);
  });
  it("AC-2: yüzdesi boş, bandı 0,30 olan malzemede Ø60 milin fire dahil ağırlığı ham + 0,30 kg", () => {
    const r = oz({ bicim: "mil", cap: 60, boy: 175 }, kart());
    yakin(r.fireliKg, ham("mil", { cap: 60, boy: 175 }) + 0.3);
  });
  it("AC-3: yüzde 10 ve band 0,30 birlikte uygulanır: ham × 1,10 + 0,30", () => {
    const r = oz({ bicim: "mil", cap: 60, boy: 175 }, kart({ fire: 10 }));
    yakin(r.fireliKg, ham("mil", { cap: 60, boy: 175 }) * 1.1 + 0.3);
  });
  it("AC-4: kalemin yüzdesi malzemeninkini geçersiz kılar; kilogram tablosu yine uygulanır", () => {
    const r = oz({ bicim: "mil", cap: 60, boy: 175, fire: 2 }, kart({ fire: 10 }));
    yakin(r.fireliKg, ham("mil", { cap: 60, boy: 175 }) * 1.02 + 0.3);
  });
  it("AC-5: bandı ham çap seçer; çap payı parçayı üst banda taşıyınca o bandın kilogramı uygulanır", () => {
    const r = oz({ bicim: "mil", cap: 34, payCap: 2, boy: 100 }, kart()); // ham çap 36 → 0,30 bandı
    yakin(r.fireliKg, ham("mil", { cap: 36, boy: 100 }) + 0.3);
    const p = oz({ bicim: "mil", cap: 34, boy: 100 }, kart()); // paysız 34 → 0,05 bandı
    yakin(p.fireliKg, ham("mil", { cap: 34, boy: 100 }) + 0.05);
  });
  it("AC-6 / AC-45: kilogramı 0 olan band geçerlidir; o çapta fire eklenmez", () => {
    const r = oz({ bicim: "mil", cap: 16, boy: 235 }, kart());
    yakin(r.fireliKg, r.hamKg);
    expect(r.ekFireKg).toBe(0);
  });
  it("AC-7: lama biçimli parçada kilogram tablosu uygulanmaz, yalnız yüzde çalışır", () => {
    const r = oz({ bicim: "lama", kalinlik: 60, genislik: 60, boy: 100 }, kart({ fire: 5 }));
    yakin(r.fireliKg, r.hamKg * 1.05);
    expect(r.ekFireKg).toBe(0);
  });
  it("AC-8: sac biçimli parçada kilogram tablosu uygulanmaz", () => {
    const r = oz({ bicim: "sac", kalinlik: 60, en: 200, boy: 200 }, kart());
    yakin(r.fireliKg, r.hamKg);
  });
  it("AC-9: boru biçimli parçada kilogram tablosu ham çapla uygulanır", () => {
    const r = oz({ bicim: "boru", cap: 100, et: 5, payCap: 2, boy: 200 }, kart()); // ham çap 102 → 1 kg
    yakin(r.fireliKg, ham("boru", { cap: 102, et: 5, boy: 200 }) + 1);
  });
  it("AC-10: kilogram adet başınadır; adedi 3 olan kalemde maliyet ve fire üç kez sayılır", () => {
    const m = kart();
    const p = { id: 1, ad: "Mil", maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 60, boy: 175, adet: 3 }] };
    const birim = kurus((ham("mil", { cap: 60, boy: 175 }) + 0.3) * 3);
    expect(parcaMaliyetKurus(p, undefined, setKatalogu([p]), M.malzemeKatalogu([m]))).toBe(birim * 3);
    const s = siparisIhtiyaci({ modeller: [{ model: "X", defaultParcalar: [{ partId: "1", miktar: 1 }] }], satirlar: [{ model: "X", adet: "1" }], parts: [p], partStock: [], malzemeler: [m], tedarikciler: [] });
    yakin(s.kesitler[0].fireKg, 0.9);
  });
  it("AC-11: boy yönteminde kilogram tablosu uygulanmaz (oran yalnız yüzdeyle büyür)", () => {
    const m = kart({ boyFiyati: 600, geldigiBoy: 6, fire: 5 });
    const r = oz({ bicim: "mil", yontem: "boy", cap: 60, boy: 300 }, m);
    expect(r.fireliKg).toBeNull();
    expect(r.maliyetK).toBe(kurus((300 / 6000) * 1.05 * 600));
  });
  it("AC-46 / A-R6/2: en alt bandın alt sınırının altındaki ham çapa fire eklenmez", () => {
    const r = oz({ bicim: "mil", cap: 4, boy: 100 }, kart({ fireBantlari: [{ alt: 5, kg: 0.2 }] }));
    yakin(r.fireliKg, r.hamKg);
  });
  it("AC-49 (motor): kilo fiyatı girilmemiş malzemede ağırlığa kilogram fire girer, maliyet null kalır", () => {
    const r = oz({ bicim: "mil", cap: 60, boy: 175 }, kart({ kiloFiyati: undefined }));
    expect(r.maliyetK).toBeNull();
    yakin(r.fireliKg, ham("mil", { cap: 60, boy: 175 }) + 0.3);
  });
  it("AC-16: geçmiş tarihli maliyet o tarihin fiyatıyla ama BUGÜNKÜ kilogram tablosuyla", () => {
    const m = kart({ kiloFiyati: 5, fiyatGecmisi: [{ gecerli: "", kiloFiyati: 3, paraBirimi: "TRY" }, { gecerli: "2026-06-01", kiloFiyati: 5, paraBirimi: "TRY" }] });
    const p = { id: 1, ad: "Mil", maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap: 60, boy: 175, adet: 1 }] };
    expect(parcaMaliyetKurus(p, "2026-01-15", setKatalogu([p]), M.malzemeKatalogu([m]))).toBe(kurus((ham("mil", { cap: 60, boy: 175 }) + 0.3) * 3));
  });
  it("AC-15 / A-R10: kilogram tablosu fiyat kümesine girmez (tarihlenmez)", () => {
    expect(M.FIYAT_ALANLARI).not.toContain("fireBantlari");
    expect(M.fiyatKumesi(kart())).not.toHaveProperty("fireBantlari");
    const a = kart({ kiloFiyati: 3 }); const b = { ...a, fireBantlari: [{ alt: 0, kg: 1 }] };
    expect(M.fiyatGecmisiYaz(a, b, { tarih: "2026-11-09", bugun: "2026-11-09" }).fiyatGecmisi ?? []).toEqual(a.fiyatGecmisi ?? []);
    const pencere = fs.readFileSync("src/components/MalzemeFiyatPenceresi.jsx", "utf8");
    expect(pencere).not.toMatch(/fireBantlari/);
  });
});

describe("Spec 0139 A-R9: fire bandının doğrulayıcısı (ayrı)", () => {
  const d = M.fireBantlariDogrula;
  it("AC-44: ilk bandın alt çapı serbest girilir, 0'a sabitlenmez ve kaydedilir", () => {
    expect(d([{ alt: "5", kg: "0" }, { alt: "21", kg: "0,05" }])).toEqual({ kayit: [{ alt: 5, kg: 0 }, { alt: 21, kg: 0.05 }], hata: null });
  });
  it("AC-12: azalan sırada girilen tablo reddedilir", () => {
    expect(d([{ alt: "36", kg: "0,3" }, { alt: "21", kg: "0,05" }]).hata).toBe(M.FIRE_KG_SIRA_HATASI);
    expect(d([{ alt: "21", kg: "0,3" }, { alt: "21", kg: "0,05" }]).hata).toBe(M.FIRE_KG_SIRA_HATASI);
  });
  it("AC-13: negatif kilogram reddedilir", () => {
    expect(d([{ alt: "0", kg: "-0,1" }]).hata).toBe(M.FIRE_KG_HATASI);
  });
  it("AC-14: belirsiz yazılmış kilogram (tek nokta, üç hane, virgülsüz) reddedilir", () => {
    expect(d([{ alt: "0", kg: "1.250" }]).hata).toBe(M.BELIRSIZ_HATASI);
  });
  it("AC-45: boş bırakılan kilogram reddedilir, yazılı 0 kabul edilir; tamamen boş satır atılır", () => {
    expect(d([{ alt: "0", kg: "" }]).hata).toBe(M.FIRE_KG_HATASI);
    expect(d([{ alt: "0", kg: "0" }])).toEqual({ kayit: [{ alt: 0, kg: 0 }], hata: null });
    expect(d([{ alt: "", kg: "" }])).toEqual({ kayit: [], hata: null });
  });
  it("C7: boş tablo kayda yazılmaz; dolu tablo malzemeDogrula'dan kayda geçer", () => {
    const bos = M.malzemeDogrula({ ad: "A", fireBantlari: [] });
    expect(bos.kayit).not.toHaveProperty("fireBantlari");
    const dolu = M.malzemeDogrula({ ad: "A", fireBantlari: [{ alt: "0", kg: "0" }, { alt: "50", kg: "0,30" }] });
    expect(dolu.kayit.fireBantlari).toEqual([{ alt: 0, kg: 0 }, { alt: 50, kg: 0.3 }]);
    expect(M.malzemeFormu(dolu.kayit).fireBantlari).toEqual([{ alt: "0", kg: "0" }, { alt: "50", kg: "0,3" }]);
  });
});

describe("Spec 0139 A-R12: sipariş ihtiyacı", () => {
  const p = (cap, boy) => ({ id: 1, ad: "Mil", maliyetKalemleri: [{ tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "kilo", cap, boy, adet: 1 }] });
  const sip = (m, parca) => siparisIhtiyaci({ modeller: [{ model: "X", defaultParcalar: [{ partId: "1", miktar: 1 }] }], satirlar: [{ model: "X", adet: "10" }],
    parts: [parca], partStock: [], malzemeler: [m], tedarikciler: [] });
  it("AC-17: Fire kg sütunu kilogram fireyi de içerir", () => {
    const s = sip(kart(), p(60, 175)).kesitler[0];
    yakin(s.fireKg, 0.3 * 10);
  });
  it("AC-51: yüzdesi boş, yalnız kilogram tablosu olan malzemede boy adedi hesaplanınca fire uyarısı çizilir", () => {
    const tablolu = sip(kart({ geldigiBoy: 6 }), p(60, 175)).kesitler[0];
    expect(tablolu.boyAdedi).not.toBeNull();
    expect(tablolu.fireUyarisi).toBe(FIRE_BOY_UYARISI);
    const tablosuz = sip(kart({ geldigiBoy: 6, fireBantlari: undefined }), p(60, 175)).kesitler[0];
    expect(tablosuz.fireUyarisi).toBeNull();
    expect(FIRE_BOY_UYARISI).toMatch(/kilogram/);
  });
});

describe("Spec 0139 A-R15, A-R14, C2: örnek ve taramalar", () => {
  it("AC-54: örnek malzemelerden biri kilogram tablosu taşır ve kartın doğrulayıcısından geçer", () => {
    let n = 0;
    const ornek = ornekMalzemeler({ mevcut: [], rates: null, ratesErr: false, yeniId: () => ++n });
    const tablolu = ornek.filter(m => M.fireBantlariOf(m).length > 0);
    expect(tablolu.length).toBe(1);
    expect(tablolu[0].fireBantlari).toEqual([{ alt: 0, kg: 0 }, { alt: 50, kg: 0.3 }]);
    expect(M.malzemeDogrula(M.malzemeFormu(tablolu[0])).gecerli).toBe(true);
  });
  it("AC-55: fire bölümünün metinleri adlı sabitte; ekran dosyalarında düz metin yok", () => {
    const sabitler = [M.FIRE_KG_BASLIK, M.FIRE_KG_LAMA_NOTU, M.FIRE_KG_IPUCU, M.FIRE_KG_SIRA_HATASI, M.FIRE_KG_HATASI, M.FIRE_KG_BOY_NEDENI, M.FIRE_ETKI_BASLIGI, M.FIRE_ETKI_SORUSU];
    for (const dosya of ["src/components/MalzemeManager.jsx", "src/components/MalzemeSatiriAlani.jsx"]) {
      const k = fs.readFileSync(dosya, "utf8");
      for (const s of sabitler) expect(k.includes(s), `${dosya}: ${s}`).toBe(false);
    }
    expect(M.FIRE_KG_BASLIK).toBe("Çap bandına göre ek fire (kg)");
    expect(M.FIRE_KG_LAMA_NOTU).toBe("Ek fire yalnız yuvarlak mil ve boruda uygulanır; lama ve sacda yok sayılır.");
  });
  it("C2: kilogram bandının seçimi ve eklenmesi yalnız malzeme motorunda; yüzdenin sipariş boy yolundaki kopyası gerekçeli istisna", () => {
    const dosyalar = [];
    const gez = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const y = path.join(d, e.name); if (e.isDirectory()) gez(y); else if (/\.(js|jsx)$/.test(e.name)) dosyalar.push(y); } };
    gez("src");
    const yorumsuz = (k) => k.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const d of dosyalar) {
      if (d === path.join("src", "lib", "malzeme.js")) continue;
      const k = yorumsuz(fs.readFileSync(d, "utf8"));
      expect(/\bekFireKg\s*\(/.test(k), `${d}: ekFireKg çağrısı`).toBe(false);
      expect(/bantSec\s*\(\s*fireBantlariOf/.test(k), `${d}: kilogram bandı seçimi`).toBe(false);
      // Düzenleyici (MalzemeManager) bandın kilogramını yalnız giriş alanının değeri olarak okur; aritmetikte okunması yasak.
      expect(/\.kg\b\s*[-+*/]|[-+*/]\s*[\w.]*\.kg\b/.test(k), `${d}: band kilogramıyla hesap`).toBe(false);
    }
    // 0134 Karar 48: yüzdenin boy yolundaki kopyası tam yolla istisna (kaldırılmaz).
    expect(fs.readFileSync("src/lib/siparisIhtiyaci.js", "utf8")).toMatch(/p\.oran \* \(1 \+ p\.fire \/ 100\)/);
  });
});
