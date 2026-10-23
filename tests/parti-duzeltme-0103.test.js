// Spec 0103: kaynak taramaları. Parti seçicisinin kapısı tek yerde, stok-seri kilidi genişlemedi, ipucu panonun adını
// sabitten alır, kayıt ve veri tarafında yeni kural yok. Ekran kriterleri tests/ui/stok-durumu-0100-satis.test.jsx (0103
// bloğu), uçtan uca AC-31 tests/ui/stok-durumu-0100-app.test.jsx'te.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALAN_IZINLERI } from "../electron/serverAuth.cjs";
import { KILIT_ALANLARI } from "../src/lib/kilitAlanlari";
import { MERGE_KEYS } from "../src/lib/merge";

const kok = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(kok, p), "utf-8");
const FORM = "src/components/customers/CustomerAddEditForm.jsx";

describe("Spec 0103: seçicinin kapısı (R1/2, R4, R17, C1)", () => {
  it("R1/2, C1: kapı tek ifade; stok seçimi ölçütü yalnız stok seçicisinin kiplerinde", () => {
    const k = oku(FORM);
    expect(k).toMatch(/const stokSecicisiKipi = modal === "add" \|\| seriBekleyenDuzenleme;/);
    expect(k).toMatch(/const partiSecicisi = giderYetki && !\(stokSecicisiKipi && stoktanSecildi\);/);
    expect((k.match(/const partiSecicisi\b/g) || []).length).toBe(1);
    expect((k.match(/\{partiSecicisi && \(/g) || []).length).toBe(1);
  });
  it("AC-28 (R17, Karar 13): iki useLock çağrısı kalır; stok-seri kilidinin kipi stokSecicisiKipi'ni okumaz", () => {
    const k = oku(FORM);
    expect((k.match(/useLock\(/g) || []).length).toBe(2);
    expect(k).toMatch(/useLock\("customer", modal\?\.edit\?\.id \?\? null\)/);
    const kilit = k.slice(k.indexOf("const isStockSerialPick"), k.indexOf('useLock("stok-seri"'));
    expect(kilit).toMatch(/&& \(modal === "add" \|\| \(modal\?\.edit && form\.seriNoBekliyor && !modal\.edit\.serialNo\)\);/);
    expect(kilit).not.toMatch(/stokSecicisiKipi|partiSecicisi/);
  });
  it("AC-30 (R8/2, Karar 18, 36): ipucu panonun adını PANO_SEKME_ADI'ndan alır; ad form dosyasında düz yazılı değil", () => {
    const k = oku(FORM);
    expect(k).toMatch(/import \{[^}]*\bPANO_SEKME_ADI\b[^}]*\} from "\.\.\/\.\.\/lib\/stokDurumu";/);
    expect(k).toMatch(/\$\{PANO_SEKME_ADI\}'nun satılan adedinde görünmez\./);
    expect(k).not.toMatch(/Parti Üretim Panosu/);
    expect(k).not.toMatch(/\(ön sipariş\)/);
  });
  it("AC-24: üretim tarihi alanının koşulu ve yeri aynı (yalnız gider yetkisi, seçicinin hemen üstünde)", () => {
    const k = oku(FORM);
    const tarih = k.indexOf('aria-label="Üretim tarihi"');
    const secici = k.indexOf('aria-label="Üretim partisi"');
    expect(tarih).toBeGreaterThan(0);
    expect(tarih).toBeLessThan(secici);
    // Alanın bloğu kip ayrımı olmadan yalnız gider yetkisiyle açılır (ölçüm 2).
    expect(k.slice(tarih - 300, tarih)).toMatch(/\{giderYetki && \(\n\s+<div style=\{\{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 \}\}>\n\s+<Field label="Üretim Tarihi \(maliyet için\)">/);
  });
});

describe("Spec 0103: kayıt ve veri tarafı değişmedi (R9, R15, C4, Karar 30)", () => {
  it("AC-23: partiDamgala bugünkü muhafızıyla (mevcut değeri korur) ve düzenleme kolu yalnız seri bekleyen kayıtta stok düşer", () => {
    expect(oku("src/lib/satisKaydi.js")).toMatch(/export const partiDamgala = /);
    expect(oku("src/components/Customers.jsx")).toMatch(/if \(wasSerialPending[^)]*\)[^\n]*deductMachineStock\(/);
  });
  it("AC-25: ALAN_IZINLERI'nde customers yok", () => {
    expect(ALAN_IZINLERI.customers).toBeUndefined();
  });
  it("AC-25: KILIT_ALANLARI'nda yeni alan yok (bugünkü liste; alan ekleyen spec bu listeyi günceller)", () => {
    expect(Object.keys(KILIT_ALANLARI)).toEqual(["customer", "dealer", "note", "teklif", "fatura", "yedek_parca", "part_sale", "partstock", "stock",
      "stok-seri", "uretim_formu", "gider", "cek", "kasa_hesap", "tedarikci", "uretim_partisi", "calisan", "ayar", "maliyet_ayar"]);
  });
  it("AC-25: MERGE_KEYS customers'ı taşır ve müşteri satırının parti remap'i aynı", () => {
    expect(MERGE_KEYS).toContain("customers");
    expect(oku("src/lib/merge.js")).toMatch(/\.\.\.\(c\.partiId != null \? \{ partiId: remapRef\(maps\.uretimPartileri, c\.partiId\) \} : \{\}\),/);
  });
  it("AC-25: db.cjs'de müşteri maliyet sütunları bugünkü üç alan, yeni sütun sabiti yok", () => {
    const db = oku("electron/db.cjs");
    expect(db).toMatch(/const CUSTOMERS_MALIYET_COLUMNS = \[\["satisKuru", "REAL"\], \["uretimTarihi", "TEXT"\], \["partiId", "INTEGER"\]\];/);
    expect(db).not.toMatch(/0103/);
  });
  it("AC-26 (Karar 20): bayi ekranı formu kullanmaz; formun tek çağıranı Customers.jsx, Customers App'te tek satır", () => {
    expect(oku("src/components/SimpleDealers.jsx")).not.toMatch(/CustomerAddEditForm/);
    const cagiranlar = [];
    (function gez(d) {
      for (const e of fs.readdirSync(path.join(kok, d), { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) gez(f);
        else if (/\.jsx?$/.test(e.name) && /import \{[^}]*\bCustomerAddEditForm\b/.test(oku(f))) cagiranlar.push(f);
      }
    })("src");
    expect(cagiranlar).toEqual([path.join("src", "components", "Customers.jsx")]);
    expect((oku("src/App.jsx").match(/<Customers\b/g) || []).length).toBe(1);
  });
  it("C4: motorlar ve satış kaydı yardımcıları bu işin adlarını anmaz", () => {
    for (const f of ["src/lib/satisKaydi.js", "src/lib/stokDurumu.js", "src/lib/makinaStandartMaliyet.js", "src/lib/makinaMaliyeti.js"]) {
      expect(oku(f), f).not.toMatch(/stokSecicisiKipi|spec 0103/i);
    }
  });
});
