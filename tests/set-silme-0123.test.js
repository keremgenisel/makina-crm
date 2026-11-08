// Spec 0123: sette ve kitte geçen parça silinirken koruma. Saf yardımcılar (`urunAgaci.js`) ve kaynak taramaları; ekran ve
// gerçek App testleri tests/ui/set-silme-0123.test.jsx'te.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as UA from "../src/lib/urunAgaci";
import {
  setteGecenParcalar, parcaKullanimi, setteGecenParcaMi, setKullanimAdlari, parcaKullanimMetni, adListesi,
  SETTE_PARCA_NEDENI, SETTE_PARCA_RED_METNI, SILINMIS_PARCA, parcaKitAdetleri, setteBirakilanEki,
} from "../src/lib/urunAgaci";
import { KALEMDE_TEDARIKCI_NEDENI } from "../src/lib/gider";
import { purgeOldTrash } from "../src/lib/utils";

const COP = "2026-10-01T09:00:00.000Z";
const PARTS = [
  { id: 1, ad: "Rulman" }, { id: 2, ad: "Pul" }, { id: 3, ad: "Kayış", deletedAt: COP },
  { id: 10, ad: "Rulman Seti", setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 2, miktar: 4 }] },
  { id: 11, ad: "Pul Seti", deletedAt: COP, setIcerigi: [{ partId: 2, miktar: 1 }, { partId: 3, miktar: 1 }] },
  { id: 12, ad: "Kendine atıf", setIcerigi: [{ partId: 12, miktar: 1 }, { partId: 1, miktar: 1 }] },
];
const MODELLER = [[{ model: "AK100", defaultParcalar: [{ partId: "1", ad: "Rulman", miktar: 2 }, { partId: "4", ad: "Mil", miktar: 1 }] }],
  [{ model: "OZEL", defaultParcalar: [{ partId: "1", ad: "Rulman", miktar: 1 }] }]];

describe("Spec 0123 A: saf yardımcılar (R1)", () => {
  it("AC-14: setteGecenParcalar Map(id → { set, cop }); parcaKullanimi { set, setCop, kit }", () => {
    const h = setteGecenParcalar(PARTS);
    expect(h).toBeInstanceOf(Map);
    expect(Object.fromEntries(h)).toEqual({ 1: { set: 2, cop: 0 }, 2: { set: 1, cop: 1 }, 3: { set: 0, cop: 1 } });
    expect(parcaKullanimi(2, { parts: PARTS, modelDizileri: MODELLER })).toEqual({ set: 1, setCop: 1, kit: 0 });
    expect(parcaKullanimi(1, { parts: PARTS, modelDizileri: MODELLER })).toEqual({ set: 2, setCop: 0, kit: 2 });
    expect(parcaKullanimi(99, { parts: PARTS })).toEqual({ set: 0, setCop: 0, kit: 0 });
  });
  it("AC-14 (triyaj bulgu 2): aynı setin içeriğinde yinelenen satır parçayı bir kez sayar", () => {
    const h = setteGecenParcalar([{ id: 1, ad: "R" }, { id: 10, ad: "S", setIcerigi: [{ partId: 1, miktar: 1 }, { partId: "1", miktar: 2 }] },
      { id: 11, ad: "T", deletedAt: COP, setIcerigi: [{ partId: 1, miktar: 1 }, { partId: 1, miktar: 1 }] }]);
    expect(h.get("1")).toEqual({ set: 1, cop: 1 });
  });
  it("Karar 46 (triyaj bulgu 1): çöpü boşalt bildiriminin eki sayıyla; sıfırda boş", () => {
    expect(setteBirakilanEki(2)).toBe(" Sette bileşen olan 2 yedek parça tanımı çöpte bırakıldı.");
    expect(setteBirakilanEki(0)).toBe("");
  });
  it("AC-15: hazır harita verilince yeniden kurulmaz (gezilince hata veren dizi casusu); verilmezse kendisi kurar", () => {
    const h = setteGecenParcalar(PARTS);
    const parts = new Proxy(PARTS, { get: (o, k) => { if (k === Symbol.iterator) throw new Error("harita yeniden kuruldu"); return o[k]; } });
    expect(parcaKullanimi(2, { parts, harita: h })).toEqual({ set: 1, setCop: 1, kit: 0 });
    expect(() => parcaKullanimi(2, { parts })).toThrow(/harita yeniden kuruldu/);
  });
  it("AC-16: modelDizileri dizi dizisi; verilmezse kit 0 ve sayım yapılmaz", () => {
    expect(parcaKullanimi(1, { parts: PARTS })).toMatchObject({ kit: 0 });
    expect(parcaKullanimi(1, { parts: PARTS, modelDizileri: MODELLER }).kit).toBe(Object.keys(parcaKitAdetleri(1, MODELLER)).length);
  });
  it("AC-19 / AC-25: set 0 ama setCop 1 olan parça korunur; setCop setin damgasını sayar, parçanınkini saymaz", () => {
    const h = setteGecenParcalar(PARTS);
    expect(setteGecenParcaMi(3, h)).toBe(true); // yalnız çöpteki setin içinde
    expect(h.get("3")).toEqual({ set: 0, cop: 1 });
    expect(setteGecenParcaMi(1, h)).toBe(true);
    expect(setteGecenParcaMi(99, h)).toBe(false);
    expect(setteGecenParcaMi(1, null)).toBe(false);
    // Parçanın kendisi çöpte, set canlı: `cop` değil `set` sayılır.
    expect(setteGecenParcalar([{ id: 1, ad: "R", deletedAt: COP }, { id: 10, ad: "S", setIcerigi: [{ partId: 1, miktar: 1 }] }]).get("1")).toEqual({ set: 1, cop: 0 });
  });
  it("AC-34: setin kendisinin bileşen olduğu satır atlanır; kendine atıf o parçayı korumaz", () => {
    const h = setteGecenParcalar(PARTS);
    expect(h.has("12")).toBe(false);
    expect(setteGecenParcaMi(12, h)).toBe(false);
    expect(setKullanimAdlari(12, PARTS)).toEqual([]);
  });
  it("AC-22 (adlar, Karar 36, 37): canlı setler adıyla, çöptekiler '(silinmiş parça)' ekiyle; kendisi hariç", () => {
    expect(setKullanimAdlari(2, PARTS)).toEqual(["Rulman Seti", `Pul Seti (${SILINMIS_PARCA})`]);
    expect(setKullanimAdlari(3, PARTS)).toEqual(["Pul Seti (silinmiş parça)"]);
    expect(setKullanimAdlari(1, PARTS)).toEqual(["Rulman Seti", "Kendine atıf"]);
  });
  it("AC-22: kullanım cümlesinin üç hâli birebir; '+n' adListesi'nden; kullanım yoksa boş", () => {
    expect(parcaKullanimMetni({ setAdlari: ["Rulman Seti", "Pul Seti"] })).toBe("Bu parça şu setlerin içeriğinde geçiyor: Rulman Seti, Pul Seti.");
    expect(parcaKullanimMetni({ kit: 4 })).toBe("Bu parça 4 model kitinde geçiyor.");
    expect(parcaKullanimMetni({ setAdlari: ["Rulman Seti", "Pul Seti"], kit: 4 })).toBe("Bu parça şu setlerin içeriğinde geçiyor: Rulman Seti, Pul Seti. 4 model kitinde de geçiyor.");
    expect(parcaKullanimMetni({ setAdlari: ["A", "B", "C", "D", "E"] })).toBe(`Bu parça şu setlerin içeriğinde geçiyor: ${adListesi(["A", "B", "C", "D", "E"])}.`);
    expect(adListesi(["A", "B", "C", "D", "E"])).toBe("A, B, C +2");
    expect(parcaKullanimMetni({})).toBe("");
  });
  it("AC-26 / AC-27 (metin): neden ve ret metni; 0096'nın kalıbı ve adresi", () => {
    expect(SETTE_PARCA_NEDENI).toBe("Bir setin içeriğinde bileşen olarak geçiyor; önce Ayarlar › Katalog › Parça/Yedek Parça'da o setin içeriğinden çıkarın.");
    expect(SETTE_PARCA_NEDENI.split("; önce ")[1].split("'da")[0]).toBe(KALEMDE_TEDARIKCI_NEDENI.split("; önce ")[1].split("'da")[0]);
    expect(SETTE_PARCA_RED_METNI).toBe(`Yedek parça tanımı kalıcı silinemez: ${SETTE_PARCA_NEDENI}`);
  });
});

describe("Spec 0123: otuz günlük temizliğin iki turu (R4/4)", () => {
  it("AC-21: süresi dolmuş çöpteki setin bileşeni ilk turda korunur, set aynı turda gittiği için sonraki turda silinir", () => {
    const ESKI = new Date(Date.now() - 60 * 86400000).toISOString();
    const tur = (parts) => { const h = setteGecenParcalar(parts); return purgeOldTrash(parts, undefined, p => setteGecenParcaMi(p.id, h)); };
    const t0 = [{ id: 3, ad: "Kayış", deletedAt: ESKI }, { id: 11, ad: "Eski Set", deletedAt: ESKI, setIcerigi: [{ partId: 3, miktar: 1 }] }];
    const t1 = tur(t0);
    expect(t1.map(p => p.id)).toEqual([3]);
    expect(tur(t1)).toEqual([]);
  });
});

describe("Spec 0123: kaynak taramaları", () => {
  const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const ham = (f) => readFileSync(f, "utf8");
  const pm = () => kod("src/components/PartManager.jsx");
  const cop = () => kod("src/components/settings/SettingsTrash.jsx");
  const app = () => kod("src/App.jsx");
  it("AC-10 / AC-11 / AC-26: kapılar sayımı yardımcılardan alır; setIcerigi/defaultParcalar gezmez; neden ve cümle düz metin değil", () => {
    expect(cop()).not.toMatch(/setIcerigi|defaultParcalar/);
    const temizlik = app().slice(app().indexOf("purgeOldTrash(data.customers"), app().indexOf("purgeOldTrash(data.yedekParcaSatislar"));
    expect(temizlik).not.toMatch(/setIcerigi|defaultParcalar/);
    const silme = pm().slice(pm().indexOf("const silmeKullanimi"), pm().indexOf("}, [confirmDel, hamParts"));
    expect(silme).not.toMatch(/setIcerigi|defaultParcalar|\.filter\(|\.reduce\(|for \(/);
    for (const f of ["src/components/PartManager.jsx", "src/components/settings/SettingsTrash.jsx", "src/App.jsx"]) {
      expect(kod(f), f).not.toContain("Bir setin içeriğinde bileşen olarak geçiyor");
      expect(kod(f), f).not.toContain("setlerin içeriğinde geçiyor");
      expect(kod(f), f).not.toContain("model kitinde");
    }
  });
  it("AC-15 (Karar 39): SettingsTrash'te iki harita, çizim başına ve satır metni sabit; satır içinde harita kurulmaz", () => {
    expect(cop()).toContain("const setteKorunanParcalar = setteGecenParcalar(rawParts || []);");
    expect(cop()).toContain("const bosaltmadaSetteKorunanParcalar = setteGecenParcalar((rawParts || []).filter(x => !x.deletedAt));");
    expect(cop().match(/setteGecenParcalar\(/g)).toHaveLength(2);
    expect(pm().match(/parcaKullanimi\(/g)).toHaveLength(1);
  });
  it("AC-21 / AC-32: otuz günlük temizliğin koru'su süpürmeden önceki diziden; dört kapı tablodaki diziyi okur", () => {
    expect(app()).toMatch(/const setteKorunan = setteGecenParcalar\(data\.parts\); data\.parts = purgeOldTrash\(data\.parts, undefined, p => setteGecenParcaMi\(p\.id, setteKorunan\)\)/);
    expect(pm()).toMatch(/parcaKullanimi\(confirmDel\.id, \{ parts: hamParts, modelDizileri: \[standardModels, customModels\] \}\)/);
    expect(pm()).toMatch(/setKullanimAdlari\(confirmDel\.id, hamParts\)/);
    expect(cop()).toMatch(/setParts\?\.\(p => p\.filter\(x => !x\.deletedAt \|\| setteGecenParcaMi\(x\.id, bosaltmadaSetteKorunanParcalar\)\)\)/);
    expect(cop()).toMatch(/if \(setteGecenParcaMi\(pt\.id, setteKorunanParcalar\)\)/);
  });
  it("AC-17 / AC-18 / C5: parça için 'silinemez' Modal'ı yok; parça satırının purge'u koşulsuz (düğme kalır), ret purgePart içinde", () => {
    expect(pm()).not.toMatch(/silinemez/);
    expect(cop()).toMatch(/purge: \(\) => purgePart\(p\),\s*neden: setteGecenParcaMi/);
  });
  it("AC-19: kapılar .has() kalıbını kullanmaz", () => {
    for (const s of [cop(), app(), pm()]) expect(s).not.toMatch(/setteKorunan\w*\.has\(|SetteKorunan\w*\.has\(/);
  });
  it("AC-23: parcayiIcerenSetler ve parcaKitAdetleri gövdeleri değişmedi", () => {
    const u = ham("src/lib/urunAgaci.js");
    expect(u).toContain(`export const parcayiIcerenSetler = (partId, parts = []) => (parts || [])
  .filter(p => p && !p.deletedAt && String(p.id) !== String(partId) && setIcerigiOf(p).some(r => String(r.partId) === String(partId)))
  .map(p => p.ad);`);
    const a = u.indexOf("export const parcaKitAdetleri");
    expect(u.slice(a, u.indexOf("\n};", a))).not.toMatch(/deletedAt/);
  });
  it("AC-24: SettingsTrash model prop'u almaz; temizlik model dizilerini koruma için okumaz", () => {
    const imza = cop().slice(cop().indexOf("export const SettingsTrash"), cop().indexOf("=> {", cop().indexOf("export const SettingsTrash")));
    expect(imza).not.toMatch(/standardModels|customModels\b(?!.*raw)/);
    expect(imza).not.toMatch(/\bstandardModels\b/);
    expect(app()).not.toMatch(/setteGecenParcalar\([^)]*[Mm]odel/);
  });
  it("AC-13 / AC-28 / AC-29 / AC-33: şema, izin, sunucu, birleştirme, stok, yedek, içe aktarma ve 0130 dosyaları yeni adları içermez", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js",
      "src/lib/setUretimi.js", "src/components/stock/SetParcalaPenceresi.jsx", "src/lib/stokHareketi.js", "src/components/settings/SettingsImport.jsx",
      // Spec 0124 ile (C6, Karar 2): parcaAktarma.js ters yön denetimi için setteGecenParcalar haritasını kullanır, listeden çıktı.
      "src/components/settings/SettingsBackup.jsx", "src/hooks/useSimpleDefList.js"])
      expect(ham(f), f).not.toMatch(/setteGecenParca|parcaKullanim|SETTE_PARCA|setKullanimAdlari/);
  });
  it("AC-27 / R4/5: ret iz yazmaz ve kilit almaz", () => {
    const purge = cop().slice(cop().indexOf("const purgePart"), cop().indexOf("const restorePartTypeDef"));
    expect(purge).not.toMatch(/logAction|useLock|baskasiKilitli/);
    expect(purge).toMatch(/showToast\(SETTE_PARCA_RED_METNI, "err"\)/);
  });
  it("AC-30: maliyet ekranlarının eksik sayısı yolları yerinde (değişmedi)", () => {
    expect(ham("src/lib/makinaStandartMaliyet.js")).toMatch(/neden: "parcaYok"/);
    expect(typeof UA.setEksikMetni).toBe("function");
  });
});
