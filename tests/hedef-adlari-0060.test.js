// Spec 0060 A/B: hedef adlarının tek tablosu (iki hâl), taksit adı, ek ödeme tür toplamı ve kaynak taramaları.
// Ekran davranışı tests/ui/hedef-adlari-0060.test.jsx'te, rapor tests/gider-kasa-raporu-0060.test.js'te.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { HEDEF_ADLARI, HEDEF_AD, hedefAdi, hedefBasligi, taksitAdi, hedefEtiketi } from "../src/lib/odemeYontemi";
import { HEDEF, DAVRANIS, VERGI_DAIRESI, EK_ODEME_TUR_AD, ekOdemeTurToplamlari, stopajOzeti, giderKalemDogrula, turHaritasi, odemeleriUygula } from "../src/lib/gider";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const dosyalar = (d) => readdirSync(path.join(kok, d)).flatMap(f => {
  const y = path.join(d, f);
  return statSync(path.join(kok, y)).isDirectory() ? dosyalar(y) : /\.(js|jsx)$/.test(f) ? [y.split(path.sep).join("/")] : [];
});
const kod = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("{/*")).join("\n");

describe("Spec 0060 R3, R29: tek tablo, iki hâl", () => {
  it("AC-27: hedefAdi (yönelme) bugünkü çıktısını korur, hedefBasligi (yalın) aynı tablodan türer", () => {
    const { NORMAL, KIRA, PERSONEL } = DAVRANIS;
    expect([hedefAdi(HEDEF.ANA, NORMAL), hedefAdi(HEDEF.ANA, KIRA), hedefAdi(HEDEF.STOPAJ, KIRA), hedefAdi(HEDEF.ELDEN, NORMAL),
      hedefAdi(HEDEF.ANA, PERSONEL, true), hedefAdi(HEDEF.ELDEN, PERSONEL, true), hedefAdi(HEDEF.EK_RESMI, PERSONEL, true), hedefAdi(HEDEF.EK_ELDEN, PERSONEL, true),
      hedefAdi(HEDEF.ANA, PERSONEL, false)])
      .toEqual(["Tedarikçiye", "Kiraya verene", "Vergi dairesine (stopaj)", "Elden", "Maaş (resmi)", "Maaş (elden)", "Ek ödeme (resmi)", "Ek ödeme (elden)", "Çalışana"]);
    expect([hedefBasligi(HEDEF.ANA, NORMAL), hedefBasligi(HEDEF.ANA, KIRA), hedefBasligi(HEDEF.STOPAJ, KIRA), hedefBasligi(HEDEF.ANA, PERSONEL, true), hedefBasligi(HEDEF.ANA, PERSONEL, false)])
      .toEqual(["Tedarikçi", "Kiraya veren", "Vergi dairesi", "Maaş (resmi)", "Çalışan"]);
    expect(HEDEF_AD).toEqual(Object.fromEntries(Object.entries(HEDEF_ADLARI.genel).map(([k, v]) => [k, v.yonelme])));
  });
  it("AC-27: ad tablosu tek yerde; odemeYontemi.js dışında hedef adı tablosu tanımlanmaz", () => {
    const tanim = dosyalar("src").filter(f => /(HEDEF_ADLARI|PERSONEL_AD|HEDEF_AD)\s*=\s*[{O]/.test(kod(f)));
    expect(tanim).toEqual(["src/lib/odemeYontemi.js"]);
  });
  it("AC-28: VERGI_DAIRESI taraf adı, HEDEF_AD[STOPAJ] hedef adı olarak kalır; DonemRaporu'ndaki yerel kopya kalktı", () => {
    expect(VERGI_DAIRESI).toBe("Vergi dairesi");
    expect(HEDEF_AD[HEDEF.STOPAJ]).toBe("Vergi dairesine (stopaj)");
    expect(kod("src/components/gider/DonemRaporu.jsx")).not.toMatch(/"Vergi dairesi"|"Kiraya veren"/);
  });
  // Triyaj (bulgu 2): genel tablonun yönelme adı "Tedarikçiye" de taranır. Gerekçeli istisnalar: yalın "Tedarikçi" tedarikçi
  // KAYDININ adıdır (alan, sütun, süzgeç, izin etiketi; hedef adı değil) ve taranmaz; tedarikçinin "Vergi dairesi" alanı başka
  // kavramdır (vergi kaydı); "Elden" / "Çalışan" alan ve varlık adı olarak her yerde geçtiği için taranmaz.
  it("AC-6 (R27, R30): src/components altında hedef adlarının düz metni yok (gerekçeli istisnalar hariç)", () => {
    const AD = /["'`>]\s*(Kiraya veren|Kiraya verene|Vergi dairesi|Vergi dairesine|Tedarikçiye|Maaş \((resmi|elden)\)|Ek ödeme \((resmi|elden)\))(?=["'`<:\s(])/;
    const ISTISNA = (f, satir) => f === "src/components/gider/Tedarikciler.jsx" && satir.includes('alan("Vergi dairesi", "vergiDairesi")');
    const bulunan = dosyalar("src/components").flatMap(f => kod(f).split("\n").filter(l => AD.test(l) && !ISTISNA(f, l)).map(l => `${f}: ${l.trim().slice(0, 90)}`));
    expect(bulunan).toEqual([]);
  });
});

describe("Spec 0060 R4, R35: taksit adı tek kaynak", () => {
  const turler = [{ id: 2, ad: "Kira", davranis: "kira" }, { id: 1, ad: "Hammadde", davranis: "normal" }];
  const turMap = turHaritasi(turler);
  let n = 100;
  const kira = giderKalemDogrula({ id: 1, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, sonOdemeTarihi: "2026-09-10",
    stopajTaksitSayisi: 2, stopajVade: "2026-09-20" }, { turMap, uid: () => ++n }).kayit;
  const tekHedef = giderKalemDogrula({ id: 2, tarih: "2026-09-01", turId: 1, tutar: 6000, kdvOrani: 0, taksitSayisi: 3, sonOdemeTarihi: "2026-09-10" }, { turMap, uid: () => ++n }).kayit;
  it("AC-29 / AC-7: taksitli hedefte 'Ad n/m. taksit', tek satırlı hedefte ad; satır yoksa null", () => {
    const stp = kira.taksitler.filter(t => t.hedef === HEDEF.STOPAJ);
    const ana = kira.taksitler.find(t => t.hedef === HEDEF.ANA);
    expect(taksitAdi(kira, stp[1].id, DAVRANIS.KIRA)).toBe("Vergi dairesine (stopaj) 2/2. taksit");
    expect(taksitAdi(kira, ana.id, DAVRANIS.KIRA)).toBe("Kiraya verene");
    expect(taksitAdi(tekHedef, tekHedef.taksitler[1].id, DAVRANIS.NORMAL)).toBe("Tedarikçiye 2/3. taksit");
    expect(taksitAdi(tekHedef, 999, DAVRANIS.NORMAL)).toBeNull();
    // Tek hedefli kalemde hedef etiketi yok (bugünkü kural); Kasa satırına taksit adı eksik olan bilgiyi verir.
    expect(hedefEtiketi(tekHedef, DAVRANIS.NORMAL, [{ hedef: HEDEF.ANA, payK: 200000 }])).toBeNull();
  });
  it("AC-29: taksitAdi yalnız odemeYontemi.js'te tanımlı; ödeme penceresi ve Kasa onu çağırır", () => {
    const tanim = dosyalar("src").filter(f => /export const taksitAdi\s*=|const taksitAdi\s*=\s*\(id\)\s*=>\s*\{/.test(kod(f)));
    expect(tanim).toEqual(["src/lib/odemeYontemi.js"]);
    expect(kod("src/components/gider/OdemeGirisi.jsx")).toMatch(/ortakTaksitAdi\(kalem, id, davranis\)/);
    expect(kod("src/components/Kasa.jsx")).toMatch(/taksitAdi\(k, m\.taksitId, kDav\)/);
  });
  it("stopajOzeti: taksitli stopajın bir taksidi ödenince ödenen ve açık ayrılır (AC-41)", () => {
    const stp = kira.taksitler.filter(t => t.hedef === HEDEF.STOPAJ);
    const k = odemeleriUygula([kira], [{ id: 1, tur: "odeme", tarih: "2026-09-15", tutar: stp[0].tutar, giderId: 1, taksitId: stp[0].id }], turMap);
    expect(stopajOzeti(k, turMap)).toEqual({ kesilenK: 400000, odenenK: Math.round(stp[0].tutar * 100), acikK: 400000 - Math.round(stp[0].tutar * 100) });
  });
});

describe("Spec 0060 R10: ek ödeme tür adları tek kaynaktan", () => {
  it("AC-12: tür adları yalnız gider.js'te; ekranlar ve rapor düz metin yazmaz", () => {
    expect(EK_ODEME_TUR_AD).toEqual({ fazlaCalisma: "Fazla mesai", prim: "Prim", ikramiye: "İkramiye" });
    const bulunan = dosyalar("src").filter(f => f !== "src/lib/gider.js" && /["'`>](Fazla mesai|İkramiye|Prim)["'`<]/.test(kod(f)));
    expect(bulunan).toEqual([]);
  });
  it("ekOdemeTurToplamlari: tür sırası sabit, toplamı 0 olan ve tanımsız tür dönmez", () => {
    const k = { ekOdemeler: [{ tur: "ikramiye", resmiTutar: 100 }, { tur: "prim", resmiTutar: 0, eldenTutar: 0 }, { tur: "fazlaCalisma", eldenTutar: 50 }, { tur: "x", resmiTutar: 9 }] };
    expect(ekOdemeTurToplamlari([k, k]).map(t => [t.ad, t.toplamK])).toEqual([["Fazla mesai", 10000], ["İkramiye", 20000]]);
  });
});

describe("Spec 0060 AC-23: müşteriye giden çıktılar gider alanlarını okumaz", () => {
  it("AC-23: müşteri ve e-posta şablonları, aylık faaliyet raporu ve dışa aktarma 0060'ın ad ve toplam yardımcılarını ve gider alanlarını okumaz", () => {
    const DESEN = /ekOdemeTurToplamlari|stopajOzeti|hedefBasligi|taksitAdi|HEDEF_ADLARI|ekOdemeler|giderler|hesapHareketleri/;
    for (const f of ["src/lib/printTemplates.js", "src/lib/mailTemplates.js", "src/lib/aylikRapor.js", "src/components/settings/SettingsExport.jsx"]) {
      expect(kod(f), f).not.toMatch(DESEN);
    }
  });
});
describe("Spec 0060 triyaj bulgu 1: tür özeti bileşen başına", () => {
  it("ekOdemeTurToplamlari bilesen: resmi yalnız resmi tutarı, elden yalnız elden tutarı olan türleri verir", () => {
    const k = { ekOdemeler: [{ tur: "prim", resmiTutar: 2000, eldenTutar: 0 }, { tur: "ikramiye", resmiTutar: 0, eldenTutar: 5000 }] };
    expect(ekOdemeTurToplamlari([k], { bilesen: "resmi" }).map(t => [t.ad, t.toplamK])).toEqual([["Prim", 200000]]);
    expect(ekOdemeTurToplamlari([k], { bilesen: "elden" }).map(t => [t.ad, t.toplamK])).toEqual([["İkramiye", 500000]]);
    expect(ekOdemeTurToplamlari([k]).map(t => t.ad)).toEqual(["Prim", "İkramiye"]);
  });
});
