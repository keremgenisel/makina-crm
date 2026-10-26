// Spec 0085: istemci sürümü görünür olur. Saf modüller (başlık sabitleri, kırpma, özet, sürüm karşılaştırması) ve
// kaynak taramaları (tek sürüm kaynağı, başlığın iki ekleme yeri, değişmeyen katmanlar). Testler sürüm rakamını
// sabitlemez: paket sürümü package.json'dan okunur (C5, AC-6). Örnek sürümler bilerek paketinkinden farklıdır.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ISTEMCI_SURUM_BASLIGI, ISTEMCI_SURUM_ALANI, istemciSurumKirp, surumBasligiEkle, istektenIstemciSurum, detayaSurumEkle,
} from "../electron/istemciSurum.mjs";
import { surumOzeti, kayitIstemciSurumu, geriDonguMu, SURUM_KAYIT_EYLEMLERI, SURUM_OKUMA_LIMITI } from "../src/lib/surumOzeti";
import { surumDahaYeni, guncellemeSeridiGorunur } from "../src/lib/utils";

const KOK = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(KOK, p), "utf8");
const PAKET_SURUMU = JSON.parse(oku("package.json")).version;
const dosyalar = (d) => fs.readdirSync(path.join(KOK, d), { withFileTypes: true }).flatMap(e => {
  const r = path.join(d, e.name);
  if (e.isDirectory()) return r === path.join("src", "lib", "map") ? [] : dosyalar(r);
  return /\.(c|m)?jsx?$/.test(e.name) ? [r] : [];
});
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`\\])\/\/.*$/, "$1")).join("\n");
// Bir fonksiyon gövdesini (ilk `{`'den eşleşen `}`'ye) dilimler.
const govde = (kaynak, imza) => {
  const i = kaynak.indexOf(imza); if (i < 0) return null;
  let j = kaynak.indexOf(") {", i) + 2, d = 0; // parametrelerdeki `= {}` varsayılanını atla
  for (let k = j; k < kaynak.length; k++) { if (kaynak[k] === "{") d++; else if (kaynak[k] === "}" && --d === 0) return kaynak.slice(j, k + 1); }
  return null;
};
const SURUM_DIZESI = /["'`]v?\d{1,2}\.\d{1,3}\.\d{1,3}["'`]/;

describe("Spec 0085 A: tek sürüm kaynağı", () => {
  it("AC-1: src/ ve electron/ kaynağında (yorumlar hariç) sabit sürüm dizesi ve APP_VERSION yok", () => {
    const bulunan = [...dosyalar("src"), ...dosyalar("electron")].flatMap(f => {
      const k = yorumsuz(fs.readFileSync(path.join(KOK, f), "utf8"));
      return [...(SURUM_DIZESI.test(k) ? [`${f}: sürüm dizesi`] : []), ...(k.includes("APP_VERSION") ? [`${f}: APP_VERSION`] : []),
        ...(k.includes(`"${PAKET_SURUMU}"`) ? [`${f}: paket sürümü`] : [])];
    });
    expect(bulunan).toEqual([]);
  });
  it("AC-1: tarama deseni bir sürüm dizesini yakalar, tarih ve GTİP kodunu yakalamaz (desenin kendisi)", () => {
    expect(SURUM_DIZESI.test('const v = "3.42.0";')).toBe(true);
    expect(SURUM_DIZESI.test("x = `v12.0.1`")).toBe(true);
    expect(SURUM_DIZESI.test('t = "15.04.2024"')).toBe(false);
    expect(SURUM_DIZESI.test('g = "8438.10.90"')).toBe(false);
  });
  it("AC-7: kapsam dışı üç scripts/ düzeneği gerekçeli istisnadır ve sabit version prop'unu korur", () => {
    // Araç ve yerleşim düzenekleri Settings'e sabit bir version veriyor (R4, K-17); bu iş onları değiştirmez.
    for (const f of ["scripts/evidence/0009-sayfa.jsx", "scripts/tests/layout/calisan.jsx", "scripts/tests/layout/gider-tanim.jsx"]) {
      expect(oku(f), f).toMatch(/version="\d+\.\d+\.\d+"/);
    }
  });
  it("AC-6: testler paket sürümünü iddia etmez (paket sürüm dizesi hiçbir expect satırında geçmez)", () => {
    // Bir bileşene prop olarak verilen sürüm (ör. standart-kalkar-0082'nin version prop'u) iddia değildir, yükseltmede kırılmaz.
    const bulunan = dosyalar("tests").flatMap(f => fs.readFileSync(path.join(KOK, f), "utf8").split("\n")
      .filter(l => l.includes(PAKET_SURUMU) && /expect\(/.test(l)).map(l => `${f}: ${l.trim()}`));
    expect(bulunan).toEqual([]);
  });
  it("AC-4 (R22): mevcut sürüm boşken surumDahaYeni false; bilinince bugünkü davranış", () => {
    expect(surumDahaYeni("9.1.0", "")).toBe(false);
    expect(surumDahaYeni("9.1.0", null)).toBe(false);
    expect(surumDahaYeni("9.1.0", undefined)).toBe(false);
    expect(surumDahaYeni("9.1.0", "  ")).toBe(false);
    expect(surumDahaYeni("9.1.0", "9.0.4")).toBe(true);
    expect(surumDahaYeni("9.0.4", "9.1.0")).toBe(false);
    expect(guncellemeSeridiGorunur({ hasUpdater: true, state: "available", latest: "9.1.0", current: "", dismissed: null })).toBe(false);
    expect(guncellemeSeridiGorunur({ hasUpdater: true, state: "available", latest: "9.1.0", current: "9.0.4", dismissed: null })).toBe(true);
  });
  it("R1: App sürüm durumunu boş başlatır ve köprüden doldurur; yedi tüketici sürümü boş değerle güvenli okur", () => {
    const app = oku("src/App.jsx");
    expect(app).toContain('const [appVersion, setAppVersion] = useState("")');
    expect(app).toContain("window.appUpdater.version().then(v => { if (v) setAppVersion(v); })");
    expect(app).toContain("{appVersion && <span>{`v${appVersion}`}</span>}");
    expect(app).toContain("yayınlandı{appVersion ? ` (kurulu: v${appVersion})` : \"\"}.");
    // C8: otomatik yedek çağrısı yeniden biçimlendirilmedi, version alanı aynı yerde.
    expect(app).toContain("writeBackup(s.backupFolder, { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version: appVersion,");
  });
});

describe("Spec 0085 B: başlık ve kayıt (saf)", () => {
  it("C1: başlık ve alan adları tek sabitte", () => {
    expect(ISTEMCI_SURUM_BASLIGI).toBe("X-App-Surum");
    expect(ISTEMCI_SURUM_ALANI).toBe("istemciSurum");
  });
  it("AC-12: kırpma [0-9A-Za-z.+-], en çok 32 karakter, boş kalırsa null", () => {
    expect(istemciSurumKirp("9.1.0")).toBe("9.1.0");
    expect(istemciSurumKirp(" 9.1.0-beta+2 ")).toBe("9.1.0-beta+2");
    expect(istemciSurumKirp("9.1.0<script>alert(1)</script>")).toBe("9.1.0scriptalert1script");
    expect(istemciSurumKirp("1".repeat(40))).toHaveLength(32);
    expect(istemciSurumKirp("<>!?")).toBe(null);
    expect(istemciSurumKirp("")).toBe(null);
    expect(istemciSurumKirp(null)).toBe(null);
    expect(istektenIstemciSurum(["9.1.0", "x"])).toBe("9.1.0");
    expect(istektenIstemciSurum(undefined)).toBe(null);
  });
  it("AC-9: başlık ekleme mevcut başlıkları korur; sürüm yoksa seçenekler aynen döner", () => {
    const o = { method: "POST", headers: { Authorization: "Bearer t" } };
    expect(surumBasligiEkle(o, "9.1.0")).toEqual({ method: "POST", headers: { Authorization: "Bearer t", "X-App-Surum": "9.1.0" } });
    expect(surumBasligiEkle({ method: "GET" }, "9.1.0")).toEqual({ method: "GET", headers: { "X-App-Surum": "9.1.0" } });
    expect(surumBasligiEkle(o, null)).toBe(o);
    expect(o.headers).toEqual({ Authorization: "Bearer t" }); // girdi değişmez
  });
  it("AC-8, AC-11 (R6, R7): detay yalnız sürüm varken anahtarı taşır; veri sürümü (surum) korunur", () => {
    expect(detayaSurumEkle({ bolumler: ["notes"], surum: 7 }, "9.1.0")).toEqual({ bolumler: ["notes"], surum: 7, istemciSurum: "9.1.0" });
    expect(detayaSurumEkle({ bolumler: ["notes"], surum: 7 }, null)).toEqual({ bolumler: ["notes"], surum: 7 });
    expect(detayaSurumEkle(null, null)).toBe(null); // oturum_yenilendi bugünkü gibi detaysız
    expect(detayaSurumEkle(null, "9.1.0")).toEqual({ istemciSurum: "9.1.0" });
  });
});

describe("Spec 0085 B: kaynak taramaları", () => {
  const data = oku("electron/ipc/data.cjs");
  it("AC-10 (R5, C1): başlık yalnız iki yerde eklenir: clientFetch ve giriş isteği", () => {
    expect((yorumsuz(data).match(/surumBasligiEkle\(/g) || []).length).toBe(2);
    expect(govde(data, "function clientFetch(")).toContain("surumBasligiEkle(opts, uygulamaSurumu())");
    const giris = data.slice(data.indexOf("pinliFetch(`${loginUrl}/auth/login`"), data.indexOf("pinliFetch(`${loginUrl}/auth/login`") + 400);
    expect(giris).toContain("surumBasligiEkle({");
    expect(giris).toContain("app.getVersion()");
    for (const imza of ["async function apiFetch(", "async function fileFetch("]) {
      const g = govde(data, imza);
      expect(g, imza).not.toContain("surumBasligiEkle");
      expect(g, imza).not.toContain("X-App-Surum");
      expect(g, imza).toContain("clientFetch("); // ikisi de ortak yoldan geçer (dosya yolu dahil, AC-9)
    }
  });
  it("C1: başlık ve alan adı dizeleri yalnız sabit modülünde yazılı", () => {
    const bulunan = [...dosyalar("src"), ...dosyalar("electron")].filter(f => f !== path.join("electron", "istemciSurum.mjs"))
      .filter(f => { const k = yorumsuz(fs.readFileSync(path.join(KOK, f), "utf8")); return /["'`]X-App-Surum["'`]|["'`]istemciSurum["'`]/.test(k); });
    expect(bulunan).toEqual([]);
  });
  it("AC-13 (R6): sunucu beş giriş kaydında, oturum yenilemede ve veri yazımında sürümü detaya ekler", () => {
    const srv = oku("electron/server.cjs");
    const auth = govde(srv, "async function authenticateLogin(");
    expect((auth.match(/action: "giris_basarisiz"[^\n]*detayaSurumEkle\(/g) || []).length).toBe(4);
    expect(auth).toMatch(/action: "giris_basarili"[^\n]*detayaSurumEkle\(/);
    expect(srv).toMatch(/action: "oturum_yenilendi"[^\n]*detayaSurumEkle\(null, istektenIstemciSurum\(req\.get\(ISTEMCI_SURUM_BASLIGI\)\)\)/);
    expect(srv).toContain("detayaSurumEkle({ bolumler: degisen, surum: newVersion }, istektenIstemciSurum(req.get(ISTEMCI_SURUM_BASLIGI)))");
    expect(srv).toContain("istemciSurum: istektenIstemciSurum(req.get(ISTEMCI_SURUM_BASLIGI))");
  });
  it("AC-12, AC-32 (R8, R20): sürüm hiçbir yetki ya da kabul kararında okunmaz", () => {
    expect(oku("electron/serverAuth.cjs")).not.toMatch(/istemciSurum|X-App-Surum|ISTEMCI_SURUM/);
    // server.cjs'te sürüm yalnız kayıt detayına girer: her kullanım detayaSurumEkle/authenticateLogin argümanıdır.
    const srv = yorumsuz(oku("electron/server.cjs"));
    const satirlar = srv.split("\n").filter(l => /istektenIstemciSurum\(|istemciSurum\b/.test(l));
    for (const l of satirlar) expect(l, l.trim()).toMatch(/detayaSurumEkle|istemciSurum: istektenIstemciSurum|istemciSurum = null|require\("\.\/istemciSurum\.mjs"\)/);
  });
  it("AC-14 (R9): başlık yalnız istemci köprüsünde eklenir; yerel mod yolu (db, sunucusuz IPC) dokunulmadı", () => {
    const kullanan = [...dosyalar("src"), ...dosyalar("electron")].filter(f => /surumBasligiEkle\(/.test(yorumsuz(fs.readFileSync(path.join(KOK, f), "utf8"))));
    expect(kullanan.sort()).toEqual([path.join("electron", "ipc", "data.cjs"), path.join("electron", "istemciSurum.mjs")].sort());
  });
  it("AC-31 (R21): izin, bölüm, birleştirme ve şema katmanları sürümü bilmez", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/db.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"]) {
      expect(oku(f), f).not.toMatch(/istemciSurum|X-App-Surum|ISTEMCI_SURUM/);
    }
  });
  it("AC-25 (R15): kart ve özet kendi karşılaştırmasını yazmaz, surumDahaYeni'yi kullanır", () => {
    const oz = oku("src/lib/surumOzeti.js"), kart = oku("src/components/settings/BagliBilgisayarlar.jsx");
    expect(oz).toContain("surumDahaYeni(sunucuSurum, surum)");
    for (const k of [oz, kart]) { expect(k).not.toMatch(/\.split\(["']\.["']\)/); expect(k).not.toMatch(/parseInt/); }
  });
  // Spec 0112 C6 ile daraltıldı: kart kullanıcı listesini var olan /api/users ucundan apiRequest ile okur (tek erişilebilir yol);
  // güvenlik geçmişini HTTP ucundan okuma yasağı ve IPC okuması aynen durur.
  it("AC-23, C6: kart güvenlik geçmişini HTTP ucundan okumaz, yalnız IPC'den okur", () => {
    const kart = yorumsuz(oku("src/components/settings/BagliBilgisayarlar.jsx"));
    expect(kart).not.toContain("/api/security-log");
    expect(kart).toContain("window.securityLog?.get(");
    expect([...kart.matchAll(/path:\s*"([^"]+)"/g)].map(m => m[1])).toEqual(["/api/users"]);
  });
});

describe("Spec 0085 D: özet (saf)", () => {
  const k = (id, actor, action, ts, ip, detail) => ({ id, actor, action, ts, ip, detail: detail === undefined ? null : (typeof detail === "string" ? detail : JSON.stringify(detail)) });
  it("AC-24 (R14): okuma penceresi iki eylem, limit 200", () => {
    expect(SURUM_KAYIT_EYLEMLERI).toEqual(["giris_basarili", "oturum_yenilendi"]);
    expect(SURUM_OKUMA_LIMITI).toBe(200);
  });
  it("AC-30: aynı kullanıcının en yeni kaydı kalır; adsız ve bozuk JSON atlanır; en son görülen üstte", () => {
    const r = surumOzeti([
      k(1, "ayse", "giris_basarili", "2026-10-10T08:00:00Z", "10.0.0.5", { istemciSurum: "9.0.1" }),
      k(2, "ayse", "oturum_yenilendi", "2026-10-12T08:00:00Z", "10.0.0.5", { istemciSurum: "9.1.0" }),
      k(3, "", "giris_basarili", "2026-10-13T08:00:00Z", "10.0.0.6", { istemciSurum: "1.0.0" }),
      k(4, "mehmet", "giris_basarili", "2026-10-13T09:00:00Z", "10.0.0.7", "{bozuk"),
      k(5, "mehmet", "giris_basarili", "2026-10-11T09:00:00Z", "10.0.0.7", { istemciSurum: "9.0.4" }),
    ], "9.1.0");
    expect(r.satirlar.map(s => [s.kullanici, s.surum, s.durum])).toEqual([["ayse", "9.1.0", "guncel"], ["mehmet", "9.0.4", "eski"]]);
    expect(r.guncellenmeli).toBe(1);
  });
  it("AC-30 (P2): geri döngü adresinden gelen satır (sunucu kurulum akışı) atlanır", () => {
    expect(["127.0.0.1", "::1", "::ffff:127.0.0.1"].every(geriDonguMu)).toBe(true);
    expect(geriDonguMu("10.0.0.5")).toBe(false);
    const r = surumOzeti([k(1, "admin", "giris_basarili", "2026-10-13T08:00:00Z", "127.0.0.1", { rol: "admin", ikiAdimli: false })], "9.1.0");
    expect(r).toEqual({ satirlar: [], guncellenmeli: 0, karsilastirildi: true });
  });
  it("AC-24 (C2): ingest ucundan gelen app-lock satırı sürüm taşısa da sayılmaz; başka eylemler de sayılmaz", () => {
    const r = surumOzeti([
      k(1, "Cihaz: PC1", "uygulama_kilidi_basarili", "2026-10-13T08:00:00Z", "10.0.0.5", { istemciSurum: "9.9.9" }),
      k(2, "ayse", "giris_basarisiz", "2026-10-13T08:00:00Z", "10.0.0.5", { sebep: "Yanlış şifre", istemciSurum: "9.9.9" }),
      k(3, "ayse", "cikis", "2026-10-13T09:00:00Z", "10.0.0.5", { istemciSurum: "9.9.9" }),
    ], "9.1.0");
    expect(r.satirlar).toEqual([]);
  });
  it("AC-26, AC-27 (R15, R16): eski ve bilinmeyen istemci satırları sayılır, güncel sayılmaz", () => {
    const r = surumOzeti([
      k(1, "a", "giris_basarili", "2026-10-13T08:00:00Z", "10.0.0.1", { istemciSurum: "9.1.0" }),
      k(2, "b", "giris_basarili", "2026-10-13T07:00:00Z", "10.0.0.2", { istemciSurum: "8.9.0" }),
      k(3, "c", "oturum_yenilendi", "2026-10-13T06:00:00Z", "10.0.0.3"),
      k(4, "d", "giris_basarili", "2026-10-13T05:00:00Z", "10.0.0.4", { istemciSurum: "9.2.0" }),
    ], "9.1.0");
    expect(r.satirlar.map(s => s.durum)).toEqual(["guncel", "eski", "bilinmiyor", "guncel"]);
    expect(r.guncellenmeli).toBe(2);
  });
  // Triyaj: sunucu sürümü boşken sürümü bilinen satır "guncel" sayılıyordu (1.0.0 bile); kart "hepsi güncel" diyordu.
  it("R22 (triyaj): sunucunun kendi sürümü bilinmiyorken sürümü bilinen satır \"karsilastirilmadi\"; yalnız bilinmeyenler sayılır", () => {
    const r = surumOzeti([
      k(1, "b", "giris_basarili", "2026-10-13T07:00:00Z", "10.0.0.2", { istemciSurum: "1.0.0" }),
      k(2, "c", "oturum_yenilendi", "2026-10-13T06:00:00Z", "10.0.0.3"),
    ], "");
    expect(r.satirlar.map(s => s.durum)).toEqual(["karsilastirilmadi", "bilinmiyor"]);
    expect(r.guncellenmeli).toBe(1);
    expect(r.karsilastirildi).toBe(false);
    expect(surumOzeti([k(1, "b", "giris_basarili", "2026-10-13T07:00:00Z", "10.0.0.2", { istemciSurum: "9.1.0" })], "9.1.0").karsilastirildi).toBe(true);
  });
  it("kayitIstemciSurumu: dize, nesne, boş ve bozuk detay", () => {
    expect(kayitIstemciSurumu({ detail: '{"istemciSurum":"9.1.0"}' })).toBe("9.1.0");
    expect(kayitIstemciSurumu({ detail: { istemciSurum: "9.1.0" } })).toBe("9.1.0");
    expect(kayitIstemciSurumu({ detail: null })).toBe(null);
    expect(kayitIstemciSurumu({ detail: "{bozuk" })).toBe(null);
    expect(surumOzeti(null, "9.1.0")).toEqual({ satirlar: [], guncellenmeli: 0, karsilastirildi: true });
  });
});
