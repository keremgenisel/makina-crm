// Spec 0064 R19, R22, R33 (AC-22, AC-23, AC-28, AC-29, AC-31, AC-34, AC-35, AC-36): kilit alanlarının tek listesi ve
// kaynak taramaları.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { KILIT_ALANLARI, AYAR_KILITLI, AYAR_SALT_OKUNUR, KILITSIZ_DOSYALAR, AYAR_PANEL_DOSYALARI, kilitEtiketi } from "../src/lib/kilitAlanlari";
import { MERGE_KEYS } from "../src/lib/merge";
import { regexKacis } from "./yardimci/regexKacis.js";

const oku = (f) => readFileSync(f, "utf-8");
const kod = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
const dosyalar = (k) => readdirSync(k).flatMap(a => { const p = path.join(k, a); return statSync(p).isDirectory() ? dosyalar(p) : /\.(jsx?|mjs)$/.test(a) ? [p] : []; });
const KAYNAK = dosyalar("src");

describe("Spec 0064: kilit alanlarının tek listesi (R19)", () => {
  it("AC-22: bütün useLock( ve baskasiKilitli( çağrılarının ilk argümanı listede; argüman her yerde sabit dizgi", () => {
    const disarida = [];
    for (const f of KAYNAK) {
      if (f.endsWith(path.join("hooks", "useLock.js")) || f.endsWith(path.join("hooks", "useKilitListesi.js"))) continue;
      const k = kod(f);
      for (const m of k.matchAll(/\b(useLock|baskasiKilitli)\(\s*([^,)]+)/g)) {
        const arg = m[2].trim();
        if (m[1] === "baskasiKilitli" && /^(entityType|alan|\.\.\.)/.test(arg)) continue; // kancanın ve sarmalayıcının iç çağrısı
        if (m[1] === "baskasiKilitli" && arg.startsWith("...")) continue;
        const ad = /^["']([^"']+)["']$/.exec(arg)?.[1];
        if (!ad || !KILIT_ALANLARI[ad]) disarida.push(`${f}: ${m[1]}(${arg}`);
      }
    }
    expect(disarida).toEqual([]);
  });
  it("AC-22: her alanın etiketi var, pencere dosyaları mevcut ve en az biri o alanı kilitliyor ya da denetliyor", () => {
    for (const [alan, { etiket, pencereler }] of Object.entries(KILIT_ALANLARI)) {
      expect(etiket, alan).toBeTruthy();
      for (const f of pencereler) expect(existsSync(f), `${alan}: ${f}`).toBe(true);
      const kullanan = pencereler.some(f => new RegExp(`(useLock|baskasiKilitli)\\(\\s*["']${regexKacis(alan)}["']`).test(kod(f)) || (alan === "ayar" && /useLock\("ayar"/.test(kod(f))));
      expect(kullanan, alan).toBe(true);
    }
  });
  it("AC-32: insan okunur etiket; Ayarlar panelinde panel adı", () => {
    expect(kilitEtiketi("customer", 412)).toBe("Müşteri · 412");
    expect(kilitEtiketi("ayar", "trash")).toBe("Ayarlar paneli · Çöp Kutusu");
    expect(kilitEtiketi("gider", 5)).toBe("Gider kalemi · 5");
  });
  it("AC-34 (R22): useLock'un JSDoc'u tek listeye atıf yapar, elle sayılmış alan listesi yok", () => {
    const s = oku("src/hooks/useLock.js");
    expect(s).toMatch(/kilitAlanlari\.js/);
    expect(s).not.toMatch(/'customer' \| 'dealer'/);
  });
  it("R25: Giderler'in üç penceresi TEK gider kilidiyle; pencere bileşenleri kendi gider kilidini almaz", () => {
    expect(kod("src/components/Giderler.jsx").match(/useLock\("gider"/g)).toHaveLength(1);
    for (const f of ["src/components/GiderForm.jsx", "src/components/gider/OdemeKayitPenceresi.jsx", "src/components/gider/OdemePlaniPenceresi.jsx"]) {
      expect(kod(f), f).not.toMatch(/useLock\("gider"/);
    }
    expect(kod("src/components/Dashboard.jsx")).toMatch(/useLock\("gider"/);
  });
});

describe("Spec 0064: kapsam taraması (R33, AC-35)", () => {
  it("AC-35: gider/, kasa/, cek/ ve settings/ altındaki her dosya ya bir kilit alanının penceresi ya Ayarlar paneli ya gerekçeli kilitsiz", () => {
    const kapsam = new Set([...Object.values(KILIT_ALANLARI).flatMap(a => a.pencereler), ...AYAR_PANEL_DOSYALARI, ...Object.keys(KILITSIZ_DOSYALAR)]);
    const eksik = ["src/components/gider", "src/components/kasa", "src/components/cek", "src/components/settings"].flatMap(dosyalar).map(f => f.split(path.sep).join("/")).filter(f => !kapsam.has(f));
    expect(eksik).toEqual([]);
    for (const [f, neden] of Object.entries(KILITSIZ_DOSYALAR)) { expect(existsSync(f), f).toBe(true); expect(neden.length, f).toBeGreaterThan(5); }
    for (const f of AYAR_PANEL_DOSYALARI) expect(existsSync(f), f).toBe(true);
  });
});

describe("Spec 0064: Ayarlar panelleri (R9, R27)", () => {
  it("AC-28 / AC-29: salt okunur paneller kilitli listede değil; kdv, kkkomisyon, takip, servispano, optimize, mailsablon kilitli; çalışma saatleri ayrı panel değil", () => {
    for (const id of ["securitylog", "auditlog", "sentmail", "securitystatus", "export"]) expect(AYAR_KILITLI[id], id).toBeUndefined();
    for (const id of ["kdv", "kkkomisyon", "takip", "servispano", "optimize", "mailsablon", "trash", "sahipsiz", "backup", "import", "company", "calisanlar", "models", "kaliplar", "yedekparca", "parcatipi"]) {
      expect(AYAR_KILITLI[id], id).toBeTruthy();
    }
    expect(Object.keys(AYAR_KILITLI).some(k => /calisma/.test(k))).toBe(false);
    for (const id of AYAR_SALT_OKUNUR) expect(AYAR_KILITLI[id], id).toBeUndefined();
    // Kimlikler Settings.jsx'teki gerçek sekme kimlikleridir.
    const settings = oku("src/components/Settings.jsx");
    for (const id of Object.keys(AYAR_KILITLI)) expect(settings, id).toMatch(new RegExp(`id: "${regexKacis(id)}"`));
  });
});

describe("Spec 0064: değişmeyenler (C1, C6, R16, X6)", () => {
  it("AC-20 / AC-31: yeni çakışma bileşeni yok; 'Bu kayıt şu an düzenleniyor' metni yalnız ui.jsx'in LockConflict'inde", () => {
    const yazan = KAYNAK.filter(f => oku(f).includes("Bu kayıt şu an düzenleniyor"));
    expect(yazan.map(f => f.split(path.sep).join("/"))).toEqual(["src/components/ui.jsx"]);
  });
  it("AC-23 / AC-36: katalog listeleri MERGE_KEYS'te değil; sunucu kilit uç noktası tür beyaz listesi taşımıyor", () => {
    // customModels, kalipDefs, parts, partTypeDefs spec 0077 R30 ile geri alındı (çakışmada yeni tanım kayboluyordu);
    // standardModels bilinçli olarak dışarıda (0077 X7).
    expect(MERGE_KEYS).not.toContain("standardModels");
    for (const k of ["customModels", "kalipDefs", "parts", "partTypeDefs"]) expect(MERGE_KEYS, k).toContain(k);
    for (const f of ["electron/server.cjs", "electron/serverAuth.cjs", "electron/db.cjs", "src/lib/merge.js"]) expect(oku(f), f).not.toMatch(/kilitAlanlari|KILIT_ALANLARI/);
  });
});
