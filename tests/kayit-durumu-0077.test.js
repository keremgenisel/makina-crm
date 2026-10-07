// Spec 0077: kaydın tek kapısı (saf) ve kaynak taramaları. Nedenler, mesaj tablosu, yeniden deneme, neden başına bastırma,
// veri yenileme kapısı ve perde kararı.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SEBEP, sebepHttp, kayitSonucu, KAYIT_MESAJLARI, kayitMesaji, CAKISMA_MESAJI, DENEME_TUKENDI_MESAJI, YENIDEN_DENEME_BEKLEMELERI, yenidenDenenirMi,
  govdeSaklanirMi, uyariGosterilsinMi, veriYenilenebilirMi, perdeGorunurMu, PERDE_ESIK_MS, PERDE_KACIS_MS,
} from "../src/lib/kayitDurumu";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const kod = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
const KAPAT = /kapatıp yeniden açın/i;

describe("Spec 0077 A: nedenler ve mesajlar", () => {
  it("AC-9: HTTP durumları nedene çevrilir; crm:save { ok, sebep } döner ve 403/429/5xx'te istemciyi salt okunur moda düşürmez", () => {
    expect([401, 403, 409, 429, 500, 503].map(sebepHttp)).toEqual(["oturum", "yetki", "cakisma", "sinir", "sunucu", "sunucu"]);
    const d = kod("electron/ipc/data.cjs");
    const blok = d.slice(d.indexOf('ipcMain.handle("crm:save"'), d.indexOf('ipcMain.on("crm:flush-save"'));
    expect(blok).not.toMatch(/return (true|false);/);
    for (const s of ["oturum", "cakisma", "yetki", "sinir", "sunucu", "baglanti", "yerel"]) expect(blok, s).toContain(`sebep: "${s}"`);
    expect(blok.match(/broadcast\("server:error"/g)).toHaveLength(1); // yalnız ağ hatasında
    expect(kayitSonucu(false)).toEqual({ ok: false, sebep: SEBEP.BILINMIYOR });
    expect(kayitSonucu({ ok: true })).toEqual({ ok: true, sebep: null });
  });
  it("AC-1, AC-2: çakışma ve oturumda kayıt yolu mesaj üretmez; çakışmanın tek mesajı sonucu söyler ve 'kaydedilemedi' demez", () => {
    expect(KAYIT_MESAJLARI[SEBEP.CAKISMA]).toBeNull();
    expect(KAYIT_MESAJLARI[SEBEP.OTURUM]).toBeNull();
    expect(CAKISMA_MESAJI.metin).toMatch(/birleştirildi/);
    expect(CAKISMA_MESAJI.metin).not.toMatch(/kaydedilemedi|kapatıp/i);
  });
  it("AC-3, AC-4, AC-5: yetki, bağlantı ve sunucu kendi mesajını alır; 'kapatıp yeniden açın' yalnız yerel yazma hatasında", () => {
    expect(kayitMesaji(SEBEP.YETKI).metin).toMatch(/yetkiniz yok/);
    expect(kayitMesaji(SEBEP.BAGLANTI).metin).toMatch(/ulaşılamıyor/);
    expect(kayitMesaji(SEBEP.SUNUCU).metin).toMatch(/yeniden denenecek/);
    const kapatan = Object.entries(KAYIT_MESAJLARI).filter(([, m]) => m && KAPAT.test(m.metin)).map(([k]) => k);
    expect(kapatan).toEqual([SEBEP.YEREL]);
    expect(DENEME_TUKENDI_MESAJI.metin).not.toMatch(KAPAT);
  });
  it("AC-53: yalnız sınır ve sunucu hatası yeniden denenir; en çok üç deneme, 1 / 4 / 10 sn", () => {
    expect(YENIDEN_DENEME_BEKLEMELERI).toEqual([1000, 4000, 10000]);
    expect(Object.values(SEBEP).filter(yenidenDenenirMi)).toEqual([SEBEP.SINIR, SEBEP.SUNUCU]);
    expect([SEBEP.CAKISMA, SEBEP.OTURUM, SEBEP.YETKI].some(govdeSaklanirMi)).toBe(false);
  });
  it("AC-8: bastırma neden başına (çakışma uyarısı bağlantı hatasını bastırmaz)", () => {
    const son = { cakisma: 1000 };
    expect(uyariGosterilsinMi(son, "cakisma", 5000)).toBe(false);
    expect(uyariGosterilsinMi(son, "baglanti", 5000)).toBe(true);
    expect(uyariGosterilsinMi(son, "cakisma", 21001)).toBe(true);
  });
  it("AC-9: App'te tek mesaj sabitine düşen ok === false dalı kalmadı; mesajlar tek tablodan", () => {
    const a = kod("src/App.jsx");
    expect(a).not.toMatch(/Değişiklikler kaydedilemedi/);
    expect(a).not.toMatch(/Birleştiriliyor/);
    expect(a).not.toMatch(/kayitHataUyariRef/);
  });
});

describe("Spec 0077 B: veri yenileme kapısı", () => {
  const T = 100000;
  it("AC-10, AC-11, AC-12, AC-14, AC-55: bekleyen, yoldaki kayıt, bitişten sonraki 500 ms ve bastırma yenilemeyi engeller", () => {
    expect(veriYenilenebilirMi({ simdi: T })).toBe(true);
    expect(veriYenilenebilirMi({ bekleyen: true, simdi: T })).toBe(false);
    expect(veriYenilenebilirMi({ yoldaSayisi: 1, simdi: T })).toBe(false);
    expect(veriYenilenebilirMi({ yoldaSayisi: 2, sonBitis: T - 10000, simdi: T })).toBe(false); // zincirde sıradaki kayıt
    expect(veriYenilenebilirMi({ sonBitis: T - 300, simdi: T })).toBe(false);
    expect(veriYenilenebilirMi({ sonBitis: T - 600, simdi: T })).toBe(true);
    expect(veriYenilenebilirMi({ bastirma: true, simdi: T })).toBe(false);
  });
  it("AC-16, AC-54: iki yoklama ve sunucu PC itmesi aynı kapıyı çağırır; atlanan turda pendingSave'e dokunmaz", () => {
    const a = kod("src/App.jsx");
    expect(a.match(/yenilemeSerbestMi\(\)/g).length).toBe(3);
    expect(a).toMatch(/v !== dataVersionRef\.current && yenilemeSerbestMi\(\)/);
    expect(a).toMatch(/sv !== dataVersionRef\.current && yenilemeSerbestMi\(\)/);
    expect(a).toMatch(/onDataChanged\?\.\(async \(\) => \{\s*if \(!yenilemeSerbestMi\(\)\) return;/);
    expect(kod("src/lib/kayitDurumu.js")).not.toMatch(/pendingSave|saveTimer/);
  });
});

describe("Spec 0077 D: perde kararı", () => {
  const T = 50000;
  it("AC-25, AC-26, AC-30: yolda başlangıcından 600 ms sonra görünür, 10 sn'de kaçar", () => {
    expect(PERDE_ESIK_MS).toBe(600);
    expect(PERDE_KACIS_MS).toBe(10000);
    expect(perdeGorunurMu({ yoldaBaslangic: T, simdi: T + 200 })).toBe(false);
    expect(perdeGorunurMu({ yoldaBaslangic: T, simdi: T + 599 })).toBe(false);
    expect(perdeGorunurMu({ yoldaBaslangic: T, simdi: T + 1500 })).toBe(true);
    expect(perdeGorunurMu({ yoldaBaslangic: T, simdi: T + 10000 })).toBe(false);
    expect(perdeGorunurMu({ yoldaBaslangic: null, simdi: T })).toBe(false); // "bekliyor" perdeyi açmaz (S4)
  });
  it("AC-32, AC-57: açılışta, bastırmada, çevrimdışında ve kaçtıktan sonra görünmez", () => {
    const g = { yoldaBaslangic: T, simdi: T + 1500 };
    expect(perdeGorunurMu({ ...g, loaded: false })).toBe(false);
    expect(perdeGorunurMu({ ...g, bastirma: true })).toBe(false);
    expect(perdeGorunurMu({ ...g, cevrimdisi: true })).toBe(false);
    expect(perdeGorunurMu({ ...g, kacildi: true })).toBe(false);
  });
  it("AC-33, AC-58: debounce 500 ms ve perdeye bağlı değil; kayitSirasi yalnız dönüş şeklini aldı (durum ve deneme App'te)", () => {
    const a = kod("src/App.jsx");
    expect(a).toMatch(/\}, 500\);\n\s*return \(\) => clearTimeout\(saveTimer\.current\);/);
    expect(a).not.toMatch(/perdeAcik \? 0|perde.*debounce/i);
    const k = kod("src/lib/kayitSirasi.js");
    // İçe aktarma satırı ve yorumlar taranmaz: yasak olan, kuyruğun durum tutması ya da beklemesidir.
    const govde = k.split("\n").filter(l => !/^\s*(\/\/|import )/.test(l)).join("\n").replace(/\/\/.*$/gm, "");
    expect(govde).not.toMatch(/setTimeout|YENIDEN_DENEME|perde|kayitDurumu|bekliyor|yolda/);
    expect(k).toMatch(/return \{ ok, sebep: r\.sebep, veri \}/);
  });
  it("AC-26: logo App'in mevcut içe aktarmasından (ikinci gömme yok)", () => {
    expect(kod("src/components/KayitPerdesi.jsx")).not.toMatch(/import .*logo|base64|\.avif/);
    expect(kod("src/App.jsx")).toMatch(/<KayitPerdesi acik=\{perdeAcik\} durum=\{kayitDurumu\} logo=\{LOGO\} \/>/);
  });
});

describe("Spec 0077: genel", () => {
  it("AC-35, R40: /api/data sınırı 60/dk, genel /api sınırı 600/dk kaldı", () => {
    const s = kod("electron/server.cjs");
    expect(s).toMatch(/app\.post\("\/api\/data", requireAuth, writeLimiter\(60\)/);
    expect(s).toMatch(/hizSiniri\(600\)/);
  });
  it("AC-49: yeni kalıcı alan, izin, bölüm ve göç yok", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "src/components/settings/serverPermissionDefs.js"]) {
      expect(kod(f), f).not.toMatch(/0077/);
    }
  });
});

describe("Spec 0077 DoD: görsel kanıt (triyaj bulgu 3)", () => {
  const rapor = (ad) => JSON.parse(kod(`docs/evidence/${ad}`));
  it("sonra raporu: perde iki temada yeni ekran, bütün mevcut ekranlar 0 piksel; taban raporu perdeyi 0 piksel tekrarlar", () => {
    const r = rapor("0077-piksel-raporu.json");
    const perde = r.filter(x => x.ad.startsWith("kayit-perdesi-")).map(x => x.ad).sort();
    expect(perde).toEqual(["kayit-perdesi-aydinlik.png", "kayit-perdesi-karanlik.png"]);
    const mevcut = r.filter(x => !x.ad.startsWith("kayit-perdesi-"));
    expect(mevcut.length).toBeGreaterThan(600);
    expect(mevcut.filter(x => x.piksel !== 0).map(x => x.ad)).toEqual([]);
    const t = rapor("0077-taban-piksel-raporu.json");
    expect(t.map(x => [x.ad, x.piksel]).sort()).toEqual([["kayit-perdesi-aydinlik.png", 0], ["kayit-perdesi-karanlik.png", 0]]);
  });
});
