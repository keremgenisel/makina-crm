// Spec 0098: tahsilat hesabı seçiminin kendi yetkisi. Kapının dört dalı (saf yardımcı, plan P1), izin tanımları, iki küme ve
// kaynak taramaları (tek kapı, prop adı, kasaYetki'nin öteki tüketicileri, motorlar, ayrı pencere, makina tahsilatı).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import {
  tahsilatHesapKapisi, TAHSILAT_HESAP_ID, TAHSILAT_HESAP_IPUCU, KASA_EYLEM_IDLERI, KASA_ETKISIZ_IDLERI, kasaEtkisizGrupMu,
  KASA_AKORDEON_GRUPLARI, GIDER_AKORDEON_GRUPLARI, GIDER_ACTION_GROUPS,
} from "../src/components/settings/serverPermissionDefs";
import { READONLY_SERVER_PERMISSIONS } from "../src/lib/permissions";
import { hesapsizTahsilatlar } from "../src/lib/kasa";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { MERGE_KEYS } from "../src/lib/merge";
import { KILIT_ALANLARI } from "../src/lib/kilitAlanlari";

const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? (p === "src/lib/map" ? [] : tara(p)) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
// Sunucu izin nesnesinin biçimi (App'in effectivePermissions'ı): { role, permissions: "<json>" }.
const izin = (o) => ({ role: "user", permissions: JSON.stringify(o) });
const geçenler = (desen, kok = "src") => tara(kok).filter(f => desen.test(kod(f)));

describe("Spec 0098: kapının bileşimi (R12/2, R12/3, AC-52)", () => {
  it("AC-22 / AC-20 / AC-21: izinler tanımsız (yerel mod, sunucu PC, admin) ya da giderActions tanımsızken açık", () => {
    expect(tahsilatHesapKapisi(null, false)).toBe(true);
    expect(tahsilatHesapKapisi({ role: "admin", permissions: JSON.stringify({ giderActions: [] }) }, false)).toBe(true);
    expect(tahsilatHesapKapisi(izin({ tabs: ["dashboard", "customers"] }), false)).toBe(true);
  });
  it("AC-1 / R1: gider sekmesi şart değil; Finans ve Kasa sekmeleri okunmaz", () => {
    expect(tahsilatHesapKapisi(izin({ tabs: ["dashboard", "customers", "stock", "servis"] }), false)).toBe(true);
    expect(tahsilatHesapKapisi(izin({ tabs: ["dashboard", "customers", "gider", "finance", "kasa"], giderActions: ["kasa_hesap", "virman", "avans"] }), false)).toBe(false);
  });
  it("AC-13 / AC-56: giderActions yeni kimlik olmadan özelleştirilmişse kapalı; kimlikle açık", () => {
    expect(tahsilatHesapKapisi(izin({ giderActions: ["gider_add"] }), false)).toBe(false);
    expect(tahsilatHesapKapisi(izin({ giderActions: [TAHSILAT_HESAP_ID] }), false)).toBe(true);
  });
  it("AC-18 / AC-19: salt okunur modda ve perde inikken kapalı", () => {
    expect(tahsilatHesapKapisi(READONLY_SERVER_PERMISSIONS, false)).toBe(false);
    expect(tahsilatHesapKapisi(null, true)).toBe(false);
  });
  it("AC-52 / C1 / C11: App kapıyı tek yerde effectivePermissions ve perdeyle çağırır; kimlik dizesi yalnız izin tanımlarında", () => {
    const app = kod("src/App.jsx");
    expect(app.match(/tahsilatHesapKapisi\(/g)).toHaveLength(1);
    expect(app).toMatch(/const tahsilatHesapYetki = useMemo\(\(\) => tahsilatHesapKapisi\(effectivePermissions, giderPerdesiIndi\(\)\), \[effectivePermissions\]\);/);
    const dize = geçenler(/tahsilat_hesap/);
    expect(dize).toEqual(["src/components/settings/serverPermissionDefs.js"]);
    expect(dize.every(f => ["src/App.jsx", "src/components/settings/serverPermissionDefs.js"].includes(f))).toBe(true);
  });
  it("C1 / R4/2: tahsilat dağıtımı beş çağrıda yeni kapıdan (Müşteriler, Bayiler, Stok, pano sekmesi, kiosk); ön seçim de aynı kapıdan", () => {
    const app = kod("src/App.jsx");
    expect(app.match(/kasaHesaplari=\{tahsilatHesapYetki \? canliKasaHesaplari : (?:\[\]|null)\}/g)).toHaveLength(5);
    expect(app.match(/tahsilatHesapVarsayilan=\{tahsilatHesapYetki \? tahsilatHesapVarsayilan : null\}/g)).toHaveLength(5);
    expect(app).not.toMatch(/tahsilatHesapVarsayilan=\{kasaYetki/);
  });
  it("C9 / AC-41 / AC-57: kasaYetki'nin öteki tüketicileri aynen (Kasa ekranı, Giderler, Finans raporu, genel arama)", () => {
    const app = kod("src/App.jsx");
    expect(app).toMatch(/const kasaYetki = useMemo\(\(\) => giderYetki && visibleTabs\.some\(t => t\.id === "kasa"\)/);
    expect(app).toMatch(/\{activeTab === "kasa"\s+&& kasaYetki && <Kasa /);
    expect(app).toMatch(/giderYetki=\{giderYetki\} kasaYetki=\{kasaYetki\}/); // genel arama
    expect(app).toMatch(/onGoKasa=\{kasaYetki \?/);
    expect(app).toMatch(/const giderKasaRaporVerisi = useMemo\(\(\) => \(kasaYetki \?/);
  });
});

describe("Spec 0098: izin tanımları (R2/2, R13/2)", () => {
  it("AC-53 / AC-23 / AC-24: dört dize birebir; grup Kasa akordeonunda Hesaplar ve hareketler'in önünde, tek kutu", () => {
    expect(TAHSILAT_HESAP_ID).toBe("tahsilat_hesap");
    expect(TAHSILAT_HESAP_IPUCU).toBe("Bu yetki Kasa ekranını açmaz; yalnız tahsilatın hangi hesaba girdiğinin kaydın formunda seçilmesini sağlar.");
    expect(KASA_AKORDEON_GRUPLARI.map(g => g.grup)).toEqual(["Tahsilat hesabı", "Hesaplar ve hareketler"]);
    const g = KASA_AKORDEON_GRUPLARI[0];
    expect(g.items).toEqual([{ id: "tahsilat_hesap", label: "Tahsilat hesabını seçme (servis, Extra Kalıp, yedek parça ve makina tahsilatı)" }]);
    expect(g.notu).toBe(TAHSILAT_HESAP_IPUCU);
    expect(GIDER_AKORDEON_GRUPLARI.some(x => x.items.some(i => i.id === TAHSILAT_HESAP_ID))).toBe(false);
  });
  it("AC-30 / AC-54: yerleşim kümesi Kasa akordeonunun kimlikleriyle birebir; etkisizlik kümesi bugünkü üç kimlik", () => {
    expect(new Set(KASA_AKORDEON_GRUPLARI.flatMap(g => g.items.map(i => i.id)))).toEqual(KASA_EYLEM_IDLERI);
    expect([...KASA_ETKISIZ_IDLERI]).toEqual(["kasa_hesap", "virman", "avans"]);
    expect(KASA_AKORDEON_GRUPLARI.map(kasaEtkisizGrupMu)).toEqual([false, true]);
  });
  it("R14 / C3: yeni izin boyutu yok; kimlik giderActions listesinin üyesi", () => {
    expect(GIDER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id))).toContain(TAHSILAT_HESAP_ID);
    expect(kod("src/components/settings/UserManager.jsx")).not.toMatch(/tahsilatActions|kasaActions/);
  });
});

describe("Spec 0098: kaynak taramaları", () => {
  it("AC-55 / R8/2: kasaYetki adı tahsilat zincirinin dört bileşeninde yok; boolean prop tahsilatHesapYetki", () => {
    for (const f of ["src/components/Customers.jsx", "src/components/customers/CustomerDetailModal.jsx", "src/components/Stock.jsx", "src/components/SimpleDealers.jsx"]) {
      expect(kod(f), f).not.toMatch(/\bkasaYetki\b/);
    }
    expect(kod("src/components/Customers.jsx")).toMatch(/tahsilatHesapYetki=\{tahsilatHesapYetki\}/);
    expect(kod("src/components/customers/CustomerDetailModal.jsx")).toMatch(/tahsilatHesapYetki = false/);
  });
  it("C11: formlar kendi izin koşulunu yazmaz (yalnız prop okur)", () => {
    for (const f of ["src/components/ServiceForm.jsx", "src/components/PartSaleForm.jsx", "src/components/YedekParcaSatisForm.jsx", "src/components/customers/CustomerAddEditForm.jsx",
      "src/components/stock/YedekParcaSatisTab.jsx", "src/components/ServisPanosu.jsx", "src/components/SimpleDealers.jsx"]) {
      expect(kod(f), f).not.toMatch(/tahsilatHesapKapisi|canDo\(["']tahsilat|["']giderActions["']/);
    }
  });
  it("AC-37 / P5: motorlar yeni kimliği ve prop'u okumaz (bakiye, gelir, rapor rakamları aynı veri için aynı)", () => {
    for (const f of ["src/lib/kasa.js", "src/lib/satisTahsilat.js", "src/lib/aylikRapor.js", "src/lib/giderRaporu.js"]) {
      expect(kod(f), f).not.toMatch(/tahsilat_hesap|tahsilatHesapYetki|tahsilatHesapKapisi/);
    }
  });
  it("AC-45 / X8: ayrı pencere iki prop'u geçirmez; nedeni kodda yazılı", () => {
    const k = kod("src/components/ServisPencere.jsx");
    expect(k).not.toMatch(/kasaHesaplari=|tahsilatHesapVarsayilan=/);
    expect(readFileSync("src/components/ServisPencere.jsx", "utf8")).toMatch(/Spec 0098 R4\/3, X8 \(AC-45\)/);
    expect(kod("src/components/ServisPanosu.jsx")).toMatch(/kasaHesaplari=\{kasaHesaplari\} hesapVarsayilan=\{tahsilatHesapVarsayilan\}/g);
  });
  it("AC-40 / R21 / R22: veri bölümü, birleştirme anahtarı, eylem kimliği ve kilit alanı değişmedi", () => {
    const simdi = JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI }));
    expect(simdi).toEqual(JSON.parse(readFileSync("tests/fixtures/0093-tarama-once.json", "utf8")));
    expect(Object.keys(KILIT_ALANLARI).join()).not.toMatch(/tahsilat/);
    expect(kod("electron/db.cjs")).not.toMatch(/tahsilat_hesap/);
  });
  it("Triyaj bulgu 3: tahsilat zincirinin yorumları eski kapıyı anlatmaz (Kasa ekranı ile tahsilat yetkisi ayrı kavram)", () => {
    const ham = (f) => readFileSync(f, "utf8");
    for (const f of ["src/components/Customers.jsx", "src/components/customers/CustomerDetailModal.jsx"]) {
      expect(ham(f), f).not.toMatch(/yalnız kasa yetkisiyle/);
    }
    expect(ham("src/App.jsx")).not.toMatch(/kasa \(hesap seçimi dahil\)/);
    expect(ham("src/App.jsx")).toMatch(/Tahsilat hesabı\n\s*\/\/ seçimi bu kapıda DEĞİL, kendi yetkisinde \(`tahsilatHesapYetki`, spec 0098\)/);
    expect(ham("src/components/customers/CustomerDetailModal.jsx").match(/tahsilat hesabı yetkisiyle/g)).toHaveLength(2);
  });
  it("Triyaj bulgu 4 / C12/2 (bilinen sınır): alanın ipucusu Kasa'yı anar; metin C8 gereği değişmedi, sınır spec'te ve kodda yazılı", () => {
    const k = readFileSync("src/components/kasa/TahsilatHesap.jsx", "utf8");
    expect(k).toMatch(/boş bırakılırsa Kasa'da hesabı belirtilmemiş tahsilatlar arasında bekler\./);
    expect(k).toMatch(/Spec 0098 C12\/2/);
    expect(readFileSync("specs/0098-tahsilat-hesabi-kendi-izni.md", "utf8")).toMatch(/\*\*C12\/2\.\*\*/);
  });
  it("AC-58 / X1: makina tahsilatı hesapsız da olsa iş listesinde görünmez (satisTahsilat payments okumaz)", () => {
    expect(kod("src/lib/satisTahsilat.js")).not.toMatch(/payments/);
    const r = hesapsizTahsilatlar({ payments: [{ id: 1, customerId: 5, tutar: 1000, currency: "TRY", tarih: "2026-10-01", yontem: "Nakit" }], customers: [{ id: 5, name: "A" }] }, []);
    expect(r.adet).toBe(0);
  });
});
