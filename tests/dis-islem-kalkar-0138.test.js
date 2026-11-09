// Spec 0138: dış işlem kataloğu kalkar. Saf motor (eski biçimli kalemin savunması, tarihli okuma, tedarikçi koruması) ve kaynak
// taramaları (C3, C3/2, C7, R11/2, R11/3, R11/4, R12/2, R19, R20, R22, R25). Ekran: tests/ui/dis-islem-kalkar-0138.test.jsx; gerçek
// App: tests/ui/dis-islem-kalkar-0138-app.test.jsx; kıyas: tests/dis-islem-kalkar-0138-kiyas.test.js; göç: tests/dis-islem-gocu-0138.test.js
// ve scripts/tests/dis-islem-gocu.cjs (Electron).
import { describe, it, expect, vi } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import {
  parcaMaliyetKurus, maliyetKalemleriOzeti, kalemFormu, kalemleriFormu, kalemlerDogrula, formKalemOzeti, setKatalogu, setOzeti, maliyetGecmisiYaz,
  KALEM_BOS_METNI, ESKI_KALEM_ADI, ESKI_KATALOG_KALEMI_NEDENI, MALZEME_GECMIS_IBARESI,
} from "../src/lib/urunAgaci";
import * as MK from "../src/lib/maliyetKalemleri";
import * as MZ from "../src/lib/malzeme";
import * as TG from "../src/lib/tutarGirdisi";
import { kalemdeGecenTedarikciler, tedarikciKullanim, KALEMDE_TEDARIKCI_NEDENI } from "../src/lib/gider";
import { YER_TUTUCU_AD } from "../electron/disIslemGocuSaf.mjs";

const require_ = createRequire(import.meta.url);
const kod = (f) => readFileSync(f, "utf8");
const dosyalar = (kok) => readdirSync(kok).flatMap(a => { const y = join(kok, a); return statSync(y).isDirectory() ? dosyalar(y) : [y]; })
  .filter(f => /\.(m?jsx?|cjs)$/.test(f));
const KAYNAK = [...dosyalar("src"), ...dosyalar("electron")];

const SACK = { tur: "malzeme", malzemeId: 502, bicim: "sac", kalinlik: 3, en: 200, boy: 300, adet: 1 };
const MALZ = [{ id: 502, ad: "DKP Sac", ozgulAgirlik: 7.85, kiloFiyati: 38 }];
const mk = () => MZ.malzemeKatalogu(MALZ);
const ESKI = { tur: "islem", islemId: 701, miktar: 2 };
const SERBEST = { tur: "islem", ad: "Lazer", tedarikciId: 32, tutar: 40 };

describe("Spec 0138: eski biçimli kalemin savunması (R2/2, C3/2, Karar 27, 28)", () => {
  it("AC-37: islemId taşıyan kalem ile malzeme kalemi birlikte duran parçanın maliyeti girilmedi; toplam öteki kalemlerden hesaplanıp düşmez", () => {
    const p = { id: 1, maliyetKalemleri: [SACK, ESKI, SERBEST] };
    const temiz = { id: 2, maliyetKalemleri: [SACK, SERBEST] };
    expect(parcaMaliyetKurus(temiz, undefined, setKatalogu([temiz]), mk())).not.toBeNull();
    expect(parcaMaliyetKurus(p, undefined, setKatalogu([p]), mk())).toBeNull();
    const oz = maliyetKalemleriOzeti(p.maliyetKalemleri, mk());
    expect(oz.toplamK).toBeNull();
    expect(oz.eskiKalem).toBe(1);
    expect(oz.satirlar[1]).toEqual({ tur: "islem", tutarK: null, eski: true, cozuldu: false });
  });
  it("Karar 28 (B2): eski kalemli parça tarihli sorguda da girilmedi; kendi geçmişine düşüp eski rakam vermez", () => {
    const p = { id: 3, maliyetKalemleri: [ESKI], maliyetGecmisi: [{ gecerli: "", kurus: 5000 }, { gecerli: "2026-05-01", kurus: 7000 }] };
    for (const t of [undefined, "2026-01-15", "2026-06-15"]) expect(parcaMaliyetKurus(p, t, setKatalogu([p]), mk())).toBeNull();
    const yalniz = { id: 4, maliyetKalemleri: [SERBEST], maliyetGecmisi: [{ gecerli: "", kurus: 3000 }, { gecerli: "2026-05-01", kurus: 4000 }] };
    expect(parcaMaliyetKurus(yalniz, "2026-01-15", setKatalogu([yalniz]), mk())).toBe(3000); // serbest kalem eskisi gibi (AC-11)
  });
  it("Set bileşeninde eski kalem varsa setin maliyeti de girilmedi (bileşen eksik)", () => {
    const b = { id: 5, maliyetKalemleri: [ESKI] }; const s = { id: 6, setIcerigi: [{ partId: 5, miktar: 1 }] };
    expect(setOzeti(s.setIcerigi, setKatalogu([b, s]), undefined, mk()).maliyetK).toBeNull();
  });
  it("AC-39 (motor): eski kalem forma yer tutucu adla açılır, kayıt engellenmez, kaydedilen kalemde islemId yok", () => {
    const f = kalemFormu(ESKI);
    expect(f).toMatchObject({ tur: "islem", _eskiKatalog: true, ad: "Dış işlem", tedarikciId: "", tutar: "" });
    expect(ESKI_KALEM_ADI).toBe(YER_TUTUCU_AD); // göçün yer tutucusuyla aynı ad (R15/3)
    const d = kalemlerDogrula([{ ...f, tutar: "30" }]);
    expect(d.gecerli).toBe(true);
    expect(d.kayit).toEqual([{ tur: "islem", ad: "Dış işlem", tutar: 30 }]);
  });
  it("Triyaj bulgu 1 (AC-39 tamamlayıcı, R2/2): tutarı boş bırakılan eski kalem eski biçimiyle aynen yazılır; maliyet girilmedi kalır", () => {
    const f = kalemleriFormu([SACK, ESKI]);
    const d = kalemlerDogrula([f[0], { ...f[1], ad: "Başka ad" }]);
    expect(d.gecerli).toBe(true);
    expect(d.kayit[1]).toBe(ESKI); // kayıttaki nesne aynen (islemId, miktar)
    const p = { id: 9, maliyetKalemleri: d.kayit };
    expect(parcaMaliyetKurus(p, undefined, setKatalogu([p]), mk())).toBeNull();
    expect(formKalemOzeti([f[0], { ...f[1], ad: "Başka ad" }], mk()).toplamK).toBeNull();
  });
  it("AC-38 (motor): tutarı girilmedikçe formun canlı özeti girilmedi; tutar girilince serbest kalem gibi toplanır", () => {
    const formlar = kalemleriFormu([SACK, ESKI]);
    expect(formKalemOzeti(formlar, mk()).toplamK).toBeNull();
    expect(formKalemOzeti(formlar, mk()).eskiBos).toBe(true);
    formlar[1] = { ...formlar[1], tutar: "25" };
    const oz = formKalemOzeti(formlar, mk());
    expect(oz.toplamK).toBe(maliyetKalemleriOzeti([SACK], mk()).toplamK + 2500);
    expect(ESKI_KATALOG_KALEMI_NEDENI).toMatch(/girilmedi/);
  });
  it("C3/2, Karar 27 (R11/4): tek savunma ayracı eskiKatalogKalemi; katalog yardımcıları silindi, kalemTedarikciIdleri 0135 hâlinde", () => {
    expect(MK.eskiKatalogKalemi(ESKI)).toBe(true);
    expect(MK.eskiKatalogKalemi(SERBEST)).toBe(false);
    for (const ad of ["katalogIslemMi", "serbestIslemMi", "katalogIslemVarMi", "kalemYoluMu", "kalemIslemIdleri"]) expect(MK).not.toHaveProperty(ad);
    expect(MK.kalemTedarikciIdleri({ maliyetKalemleri: [SERBEST, { tur: "islem", ad: "X", tedarikciId: 40, islemId: 1 }] })).toEqual(["32", "40"]);
  });
});

describe("Spec 0138: tarihli okuma ve geçmiş kapısı (R12, R12/2)", () => {
  it("AC-46 (motor): geçmiş kapısı yalnız set ve malzeme; katalogIslem/islemKat seçenekleri yok sayılır", () => {
    const eski = { id: 7, maliyetKalemleri: [SERBEST], maliyetGecmisi: [{ gecerli: "", kurus: 3000 }] };
    const r = maliyetGecmisiYaz(eski, 5000, { tarih: "2026-06-10", bugun: "2026-06-15", katalogIslem: true });
    expect(r.gecmis).toHaveLength(2); // katalogIslem artık kapı değil: motor çalıştı
    expect(maliyetGecmisiYaz(eski, 5000, { tarih: "2026-06-10", bugun: "2026-06-15", malzeme: true }).gecmis).toHaveLength(1);
    const u = kod("src/lib/urunAgaci.js");
    expect(u).toMatch(/if \(set \|\| malzeme\) return \{ gecmis: g, hata: null \};/);
    expect(u).not.toMatch(/KALEM_GECMIS_IBARESI|katalogIslem/);
    expect(MALZEME_GECMIS_IBARESI).toMatch(/malzemenin kendi fiyat geçmişinden/);
  });
  it("AC-4 (R23): boş durum metni 0135'in metniyle birebir (5d2f4285'ten); Katalogdan sözü yok", () => {
    expect(KALEM_BOS_METNI).toBe("Henüz maliyet kalemi yok. Malzeme kalemi malzemeden hesaplanır, işlem kalemi (lazer kesim, büküm, kaplama, işçilik) sabit tutardır.");
    expect(KALEM_BOS_METNI).not.toMatch(/Katalog/);
  });
});

describe("Spec 0138: tedarikçi koruması (R5, R22, X8)", () => {
  const PARTS = [{ id: 1, maliyetKalemleri: [SACK, SERBEST] }, { id: 2, deletedAt: "2026-10-01", maliyetKalemleri: [{ tur: "islem", ad: "K", tedarikciId: 33, tutar: 1 }] }];
  it("AC-17 / AC-19 (motor): kalemde geçen tedarikçi haritada, geçmeyen yok", () => {
    const h = kalemdeGecenTedarikciler(PARTS);
    // Spec 0140 ile: değer Ana tedarikçi ve malzeme sayılarını da taşır (A-R5); kalem sayıları aynı.
    expect(h.get("32")).toMatchObject({ parca: 1, cop: 0, ana: 0, malzeme: 0 });
    expect(h.get("33")).toMatchObject({ parca: 1, cop: 1, ana: 0, malzeme: 0 });
    expect(h.has("99")).toBe(false);
  });
  it("AC-18 (motor): yalnız bir malzeme kartının Ana tedarikçisi olan tedarikçi haritada değil (bugünkü davranış, X8)", () => {
    expect(kalemdeGecenTedarikciler(PARTS).has("801")).toBe(false);
    expect(kalemdeGecenTedarikciler.length).toBe(0); // tek parametre (varsayılanlı): dış işlem listesi almaz
    // Spec 0140 ile (A-R5/2): ikinci parametre malzemeler; verilmezse malzemenin bağı haritada yok (dış işlem listesi yine almaz).
    expect(kod("src/lib/gider.js")).toMatch(/export const kalemdeGecenTedarikciler = \(parts = \[\], malzemeler = \[\]\) =>/);
  });
  it("AC-20 / AC-51: kullanım nesnesinin dönüşü 0135 şeklinde (işlem alanı yok); ret metni tek adresli", () => {
    // Spec 0140 ile: Ana tedarikçi ve malzeme sayıları ve kalem adları eklendi; işlem alanı yine yok.
    expect(Object.keys(tedarikciKullanim(32, [], [], PARTS)).sort()).toEqual(["ana", "anaCop", "cop", "kalem", "kalemAdlari", "malzeme", "malzemeCop", "parca", "parcaCop", "tanim"]);
    expect(KALEMDE_TEDARIKCI_NEDENI).not.toMatch(/dış işlem|Dış İşlem/i);
    const hepsi = KAYNAK.map(kod).join("\n");
    for (const ad of ["disIslemCopEtiketi", "KALEMDE_ISLEM_NEDENI", "KALEMDE_ISLEM_RED", "kullanilanDisIslemler", "KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI", "tedarikciKorumaNedeni"]) {
      expect(hepsi).not.toContain(ad);
    }
    expect(hepsi).not.toMatch(/dış işlemde geçiyor/);
  });
});

// AC-35, C3, C3/2: kimlik bazlı tarama (0082 dersi). Gerekçeli istisnalar tam yollu ve SAYILI: sayı değişirse (istisna eskirse ya
// da yeni bir satır eklenirse) test kırılır.
const DIS_ISLEM_DESENI = /disIslem|DisIslem|dis_islem|islemKat|katalogIslem|islenmisKg|disislemler|\.islemId\b|Dış İşlemler|DIS_ISLEM/;
const ISTISNALAR = {
  // Göç modülü (R15): ölü tabloyu okuyan tek yer.
  "electron/disIslemGocuSaf.mjs": null, // bütün dosya
  // Ölü tablonun şeması (R17, Karar 30) ve göçün sarmalayıcısı, üç açılış dalı ve dışa verme.
  "electron/db.cjs": 14,
  // R2/2 savunması: kalemin islemId'sini okuyan tek satır (C3/2).
  "src/lib/maliyetKalemleri.js": 1,
  // R2/2: kart nedeni kaldırılan paneli adıyla anar.
  "src/lib/urunAgaci.js": 1,
};
describe("Spec 0138: kaynak taramaları", () => {
  it("AC-35 / C3 / C3/2: dış işlem motoru, ekranları, bölümü ve kalemin katalog alanı kaynakta yok; istisnalar tam yollu ve sayılı", () => {
    const bulgu = {};
    for (const f of KAYNAK) {
      const n = kod(f).split("\n").filter(l => DIS_ISLEM_DESENI.test(l)).length;
      if (n) bulgu[f] = n;
    }
    for (const [f, n] of Object.entries(ISTISNALAR)) {
      expect(existsSync(f), f).toBe(true);
      if (n != null) expect(bulgu[f], f).toBe(n);
      delete bulgu[f];
    }
    expect(bulgu).toEqual({});
    for (const f of ["src/lib/disIslem.js", "src/lib/disIslemEtkisi.js", "src/components/DisIslemManager.jsx", "src/components/DisIslemFiyatPenceresi.jsx"]) expect(existsSync(f)).toBe(false);
  });
  it("C3/2: savunma ayracı islemId'yi yalnız eskiKatalogKalemi'nde okur", () => {
    const satirlar = kod("src/lib/maliyetKalemleri.js").split("\n").filter(l => /\.islemId\b/.test(l));
    expect(satirlar).toHaveLength(1);
    expect(satirlar[0]).toMatch(/^export const eskiKatalogKalemi = /);
  });

  // Konumlu argüman sayacı (iç içe parantez, köşeli ve süslü ayraç, dize).
  const cagriArgSayilari = (src, ad) => {
    const out = []; const re = new RegExp(`(?<![\\w.])${ad}\\(`, "g"); let m;
    while ((m = re.exec(src))) {
      let i = m.index + m[0].length, d = 0, n = 0, dolu = false, q = null;
      for (; i < src.length; i++) {
        const c = src[i];
        if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
        if (c === '"' || c === "'" || c === "`") { q = c; dolu = true; continue; }
        if ("([{".includes(c)) { d++; dolu = true; continue; }
        if (")]}".includes(c)) { if (d === 0) break; d--; continue; }
        if (c === "," && d === 0) { n++; continue; }
        if (!/\s/.test(c)) dolu = true;
      }
      const onceki = src.slice(Math.max(0, m.index - 14), m.index);
      if (/const |export |function /.test(onceki)) continue; // tanım satırı
      out.push(dolu ? n + 1 : 0);
    }
    return out;
  };
  it("AC-36 / R11/2: tek okuma yolunun imzası dört parametre; hiçbir çağrı beşinci argüman geçmez", () => {
    const u = kod("src/lib/urunAgaci.js");
    for (const ad of ["parcaMaliyetKurus", "parcaMaliyetiVar", "parcaMaliyetMetni", "maliyetKaynagi"]) {
      expect(u).toMatch(new RegExp(`export const ${ad} = \\(p, tarih, katalog, malzemeKat\\) =>`));
    }
    expect(u).toMatch(/export const maliyetGirildiMi = parcaMaliyetiVar;/);
    expect(u).toMatch(/export const maliyetKalemleriOzeti = \(kalemler, malzemeKat, tarih\) =>/);
    expect(u).toMatch(/export const formKalemOzeti = \(formKalemler = \[\], malzemeKat\) =>/);
    expect(u).toMatch(/export const maliyetGecmisiSatirlari = \(p\) =>/); // 0136 hâli (tek parametre)
    expect(u).toMatch(/export const kalemlerDogrula = \(formKalemler = \[\]\) =>/);
    let cagri = 0;
    for (const f of dosyalar("src")) {
      const s = kod(f);
      for (const ad of ["parcaMaliyetKurus", "parcaMaliyetiVar", "maliyetGirildiMi", "parcaMaliyetMetni", "maliyetKaynagi"]) {
        for (const n of cagriArgSayilari(s, ad)) { cagri++; expect(n, `${f} ${ad}`).toBeLessThanOrEqual(4); }
      }
      for (const n of cagriArgSayilari(s, "maliyetKalemleriOzeti")) expect(n, f).toBeLessThanOrEqual(3);
      for (const n of cagriArgSayilari(s, "formKalemOzeti")) expect(n, f).toBeLessThanOrEqual(2);
      for (const n of cagriArgSayilari(s, "parcaDisaAktarmaSatiri")) expect(n, f).toBeLessThanOrEqual(4);
      for (const n of cagriArgSayilari(s, "parcaSatirlariniCoz")) expect(n, f).toBeLessThanOrEqual(6);
      for (const n of cagriArgSayilari(s, "modelMaliyeti")) expect(n, f).toBeLessThanOrEqual(5);
    }
    expect(cagri).toBeGreaterThan(10); // sayaç gerçekten çağrı buldu
  });
  it("AC-40 / R11/2 Karar: set özetinin fiyat okuyucusu beşinci konumda; iki çağıran o konumu kullanır", () => {
    const u = kod("src/lib/urunAgaci.js");
    expect(u).toMatch(/export const setOzeti = \(icerik, katalog, tarih, malzemeKat, fiyatOku = null\) =>/);
    expect(u).toMatch(/setOzeti\(p\.setIcerigi, katalog, tarih, malzemeKat\)\.maliyetK/);
    expect(kod("src/components/PartManager.jsx")).toMatch(/setOzeti\(icerik, katalog, undefined, malzemeKat, setFiyatOkuyucu\(fiyatBaglami\)\)/);
    const tum = dosyalar("src").map(f => [f, cagriArgSayilari(kod(f), "setOzeti")]).filter(([, a]) => a.length);
    expect(tum.flatMap(([, a]) => a).every(n => n <= 5)).toBe(true);
  });
  it("AC-41 / C7: bekçi fikstürü yok ve zincir onu içe almıyor", () => {
    expect(existsSync("tests/fixtures/0137-yeni-bolum.js")).toBe(false);
    expect(kod("tests/fixtures/0133-yeni-ayar.js")).not.toMatch(/0137-yeni-bolum/);
  });
  it("AC-42 / C7: çöp tablosu 23, otuz günlük temizlik 27, bölüm listesi 33", () => {
    const db = kod("electron/db.cjs");
    const liste = db.slice(db.indexOf("const TABLES_WITH_TRASH = ["), db.indexOf("];", db.indexOf("const TABLES_WITH_TRASH = [")));
    expect((liste.replace(/\/\/[^\n]*/g, "").match(/"[a-z_]+"/g) || []).length).toBe(23);
    expect((kod("src/App.jsx").match(/purgeOldTrash\(/g) || []).length).toBe(27);
    expect(require_("../electron/serverAuth.cjs").BLOB_SECTIONS).toHaveLength(33);
    expect(db).not.toMatch(/data\.disIslemler/); // R24: kimlik sayacının yedek hesabı dış işlem okumaz
  });
  it("AC-45 / R19: iki ağırlık yardımcısı ve neden sabitleri kaynakta yok", () => {
    for (const ad of ["islenmisKg", "parcaIslenmisKg", "netOlculer", "NEDEN_BOY_AGIRLIK", "NEDEN_OLCU_EKSIK", "NEDEN_MALZEME_KALEMI_YOK", "NEDEN_ADET_GECERSIZ"]) {
      expect(MZ).not.toHaveProperty(ad);
      expect(KAYNAK.some(f => kod(f).includes(ad)), ad).toBe(false);
    }
  });
  it("AC-47 / R20: işlem geçmişi etiketlerinde dis_islem yok", () => {
    expect(kod("src/components/settings/SettingsAuditLog.jsx")).not.toMatch(/dis_islem/);
  });
  it("AC-50 / R25: belirsiz sayı kuralı tek yerde (tutarGirdisi.js), malzeme motoru aynı adlarla yeniden dışa verir (0137'den taşındı)", () => {
    const tanim = dosyalar("src").filter(f => /export const BELIRSIZ_DESEN =/.test(kod(f)));
    expect(tanim).toEqual([join("src", "lib", "tutarGirdisi.js")]);
    expect(MZ.BELIRSIZ_DESEN).toBe(TG.BELIRSIZ_DESEN);
    expect(MZ.BELIRSIZ_HATASI).toBe(TG.BELIRSIZ_HATASI);
    expect(kod("src/lib/malzeme.js")).toMatch(/export \{ BELIRSIZ_DESEN, BELIRSIZ_HATASI \};/);
    expect(kod("src/lib/tutarGirdisi.js")).not.toMatch(/dış işlem doğrulayıcı/); // triyaj: bayat yorum
  });
  it("B11: döngüsel içe aktarma; iki yükleme sırasında da belirsiz sayı adları tanımlı ve fiyat etkisi çalışır", async () => {
    for (const sira of [["../src/lib/malzeme", "../src/lib/parcaFiyati"], ["../src/lib/parcaFiyati", "../src/lib/malzeme"]]) {
      vi.resetModules();
      const a = await import(sira[0]); const b = await import(sira[1]);
      const m = sira[0].endsWith("malzeme") ? a : b;
      expect(m.BELIRSIZ_DESEN).toBeInstanceOf(RegExp);
      expect(m.malzemeDogrula({ ad: "X", ozgulAgirlik: "2.955" }, []).gecerli).toBe(false);
    }
  });
  it("R11/3: Makina Maliyeti'nde BOS_ISLEMLER yok, yerine satır içi boş liste varsayılanı da yok", () => {
    const s = kod("src/components/MakinaMaliyeti.jsx");
    expect(s).not.toMatch(/BOS_ISLEMLER|disIslemler/);
  });
  it("AC-29 (B7, yapı ölçümü): göç yalnız yerel veritabanı açılışının üç dalında çağrılır; istemci IPC yolu onu bilmez", () => {
    const db = kod("electron/db.cjs");
    const govde = db.slice(db.indexOf("function migrateFromJsonIfNeeded() {"), db.indexOf("\nfunction ", db.indexOf("function migrateFromJsonIfNeeded() {") + 10));
    expect((govde.match(/disIslemGocu\(/g) || []).length).toBe(3);
    expect((db.match(/disIslemGocu\(/g) || []).length).toBe(4); // tanım + üç dal
    expect(kod("electron/ipc/data.cjs")).not.toMatch(/disIslemGocu|disIslem/);
  });
});
