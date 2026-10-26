// Spec 0112: bağlı bilgisayarlar kartı silinmiş kullanıcıyı listelemez. Saf özet (`surumOzeti` üçüncü parametre,
// `kullaniciAdlari`) ve kaynak taramaları. Ekran tests/ui/bagli-bilgisayarlar-0112.test.jsx'te; denetim izinin
// korunması uçtan uca scripts/tests/server-security.cjs'te (AC-15).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { surumOzeti, kullaniciAdlari, SURUM_OKUMA_LIMITI } from "../src/lib/surumOzeti";
import { KILITSIZ_DOSYALAR } from "../src/lib/kilitAlanlari";

const KOK = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(KOK, p), "utf8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const k = (id, actor, action, ts, ip, detail) => ({ id, actor, action, ts, ip, detail: detail === undefined ? null : (typeof detail === "string" ? detail : JSON.stringify(detail)) });
const KAYIT = [
  k(1, "ayse", "giris_basarili", "2026-10-26T10:00:00Z", "10.0.0.5", { istemciSurum: "9.5.0" }),
  k(2, "mehmet", "oturum_yenilendi", "2026-10-26T09:00:00Z", "10.0.0.7", { istemciSurum: "9.4.0" }),
  k(3, "servis", "giris_basarili", "2026-10-26T08:00:00Z", "10.0.0.8", { istemciSurum: "9.5.0" }),
];
const adlarOf = (r) => r.satirlar.map(s => s.kullanici);

describe("Spec 0112: saf özet", () => {
  it("AC-10 (R4, C7): adsız çağrı 0085 çıktısıyla birebir; dönüş şekli dondurulmuş", () => {
    expect(surumOzeti(KAYIT, "9.5.0")).toEqual(surumOzeti(KAYIT, "9.5.0", null));
    expect(Object.keys(surumOzeti(KAYIT, "9.5.0", ["ayse"])).sort()).toEqual(["guncellenmeli", "karsilastirildi", "satirlar"]);
    expect(surumOzeti([], "9.1.0", ["ayse"])).toEqual({ satirlar: [], guncellenmeli: 0, karsilastirildi: true });
  });
  it("AC-1 / AC-11: ad dizisiyle yalnız listede olanlar kalır; sıra, durum ve güncellenmeli sayısı aynı kuralla", () => {
    expect(adlarOf(surumOzeti(KAYIT, "9.5.0", ["ayse", "mehmet", "servis"]))).toEqual(["ayse", "mehmet", "servis"]);
    const r = surumOzeti(KAYIT, "9.5.0", ["ayse", "servis"]);
    expect(r.satirlar.map(s => [s.kullanici, s.durum])).toEqual([["ayse", "guncel"], ["servis", "guncel"]]);
    expect(r.guncellenmeli).toBe(0); // AC-3: silinen mehmet (eski sürüm) sayılmaz
    expect(surumOzeti(KAYIT, "9.5.0").guncellenmeli).toBe(1);
  });
  it("AC-12: geri döngü satırı kullanıcısı listede olsa da atlanır", () => {
    const r = surumOzeti([...KAYIT, k(9, "admin", "giris_basarili", "2026-10-26T11:00:00Z", "127.0.0.1", {})], "9.5.0", ["ayse", "admin"]);
    expect(adlarOf(r)).toEqual(["ayse"]);
  });
  it("AC-13: bozuk detaylı kayıt bugünkü gibi atlanır", () => {
    const r = surumOzeti([k(5, "ayse", "giris_basarili", "2026-10-26T10:00:00Z", "10.0.0.5", "{bozuk")], "9.5.0", ["ayse"]);
    expect(r.satirlar).toEqual([]);
  });
  it("AC-17: sunucu sürümü yokken satırlar karşılaştırılmadı kalır, süzme durumu değiştirmez", () => {
    const r = surumOzeti(KAYIT, "", ["ayse", "mehmet"]);
    expect(r.satirlar.map(s => s.durum)).toEqual(["karsilastirilmadi", "karsilastirilmadi"]);
    expect(r.karsilastirildi).toBe(false);
  });
  it("AC-22 (R2/2): karşılaştırma kırpılmış ve birebir; harf katlanmaz", () => {
    const kayit = [k(1, "ADMIN", "giris_basarili", "2026-10-26T10:00:00Z", "10.0.0.5", {}), k(2, " ayse ", "giris_basarili", "2026-10-26T09:00:00Z", "10.0.0.6", {})];
    expect(adlarOf(surumOzeti(kayit, "9.5.0", ["admin", "ayse "]))).toEqual(["ayse"]);
  });
  it("AC-31 (X7): süzme okuma penceresinden sonra uygulanır; pencere dışındaki kullanıcı hiç görünmez", () => {
    // Pencere okuma tarafındadır (limit 200); özet yalnız okunan kayıtları görür. Okunmayan "eski" kullanıcı hesabı
    // silinse de silinmese de satır doğmaz.
    const okunan = KAYIT.slice(0, 2);
    expect(adlarOf(surumOzeti(okunan, "9.5.0", ["ayse", "mehmet", "servis"]))).toEqual(["ayse", "mehmet"]);
    expect(SURUM_OKUMA_LIMITI).toBe(200);
  });
  it("AC-21: kullaniciAdlari dizi olmayan, boş ve adsız cevapta null; dolu cevapta kırpar, is_active'e bakmaz", () => {
    for (const c of [undefined, null, { error: "x" }, "x", [], [{}, { username: "  " }]]) expect(kullaniciAdlari(c), JSON.stringify(c)).toBeNull();
    expect(kullaniciAdlari([{ username: " ayse ", is_active: 1 }, { username: "pasif", is_active: 0 }])).toEqual(["ayse", "pasif"]);
  });
});

describe("Spec 0112: kaynak taramaları", () => {
  const kart = () => yorumsuz(oku("src/components/settings/BagliBilgisayarlar.jsx"));
  it("AC-18 (C3, C6): kullanıcı listesi yalnız /api/users ve GET; güvenlik geçmişi IPC'den, HTTP ucundan değil", () => {
    const k = kart();
    expect([...k.matchAll(/path:\s*"([^"]+)"/g)].map(m => m[1])).toEqual(["/api/users"]);
    expect([...k.matchAll(/method:\s*"([^"]+)"/g)].map(m => m[1])).toEqual(["GET"]);
    expect(k).not.toContain("/api/security-log");
    expect(k).toContain("window.securityLog?.get(");
  });
  it("AC-26 (C2): kart yazma yapmaz: POST/PATCH/DELETE yok, setter prop'u almaz; yalnız yerel useState setter'ları", () => {
    const k = kart();
    expect(k).not.toMatch(/"(POST|PATCH|DELETE)"/);
    const imza = /export function BagliBilgisayarlar\(\{([^}]*)\}\)/.exec(k)[1];
    expect(imza).not.toMatch(/\bset[A-Z]/);
    const setterlar = [...k.matchAll(/\b(set[A-Z]\w*)\(/g)].map(m => m[1]);
    const yerel = [...k.matchAll(/const \[\w+, (set[A-Z]\w*)\] = useState/g)].map(m => m[1]);
    expect(setterlar.every(s => yerel.includes(s))).toBe(true);
  });
  it("AC-30 (R15): kilitsizlik gerekçesi iki okumayı söyler, kart kilit çağırmaz", () => {
    const g = KILITSIZ_DOSYALAR["src/components/settings/BagliBilgisayarlar.jsx"];
    expect(g).toMatch(/güvenlik geçmişini/);
    expect(g).toMatch(/kullanıcı listesini/);
    expect(kart()).not.toMatch(/useLock|baskasiKilitli/);
  });
  it("AC-23 (R10/3): yoklama ve zamanlayıcı yok; kullanıcı listesi efekti tazeleme sinyaline bağlı", () => {
    const k = kart();
    expect(k).not.toMatch(/setInterval|setTimeout/);
    expect(k).toMatch(/\}, \[tazele\]\);/);
  });
  it("AC-14 (R6): kartta düğme yok", () => {
    expect(kart()).not.toMatch(/<button|<Btn\b/);
  });
});
