// Spec 0104: kaynak taramaları. Düşüm kuralı değişmedi (iki istisna: R17/b bildirimi ve Karar 36'nın sıra değişikliği), veri ve
// sunucu tarafında yeni kural yok, spec 0103'ün ifadeleri yerinde. Ekran kriterleri tests/ui/serisiz-seri-0104.test.jsx,
// uçtan uca AC-27 ve Karar 36 tests/ui/stok-durumu-0100-app.test.jsx'te.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALAN_IZINLERI } from "../electron/serverAuth.cjs";
import { KILIT_ALANLARI } from "../src/lib/kilitAlanlari";

const kok = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(kok, p), "utf-8");
const FORM = "src/components/customers/CustomerAddEditForm.jsx";
const MUS = "src/components/Customers.jsx";

describe("Spec 0104: düşüm kuralı (AC-20, C1)", () => {
  it("AC-20: serisiz dal bugünkü satırları taşır; eklenen tek şey satır bulunamazsa uyarı bildirimi (R17/b)", () => {
    const k = oku(MUS);
    expect(k).toMatch(/if \(_stokSerisiz\) \{\n\s+delete clean\.partiId;/);
    expect(k).toMatch(/const srcEntry = serisizDusulecek\(stock, clean\.model\);\n\s+if \(srcEntry\) \{ stoktanDamgala\(srcEntry\); setStock\(p => p\.filter\(s => s\.id !== srcEntry\.id\)\); \} else showToast\("Stoktan düşülecek satır bulunamadı, satış stok bağı olmadan kaydedildi", "warn"\);/);
    expect(k).toMatch(/\} else if \(clean\.serialNo && !_manualSerial\) \{/);
    expect(k).toMatch(/const srcEntry = stock\.find\(s => s\.model === clean\.model && s\.serialNo === clean\.serialNo\);/);
  });
  it("Karar 36: ekleme kolunda düşüm kayıt yazılmadan önce; düzenleme kolu aynen", () => {
    const k = oku(MUS);
    const ekle = k.slice(k.indexOf("const doAdd = () => {"), k.indexOf("const doAdd = () => {") + 6000);
    const dus = ekle.indexOf("if (setStock) deductMachineStock(clean, { _stokSerisiz, _manualSerial });");
    const yaz = ekle.indexOf("setCustomers(p => p.some(c => c.id === newId) ? p : [{ ...clean, id: newId }, ...p]);");
    expect(dus).toBeGreaterThan(0);
    expect(yaz).toBeGreaterThan(dus);
    expect((k.match(/deductMachineStock\(clean, \{ _stokSerisiz, _manualSerial \}\)/g) || []).length).toBe(2);
    expect(k).toMatch(/setCustomers\(p => p\.map\(c => c\.id === clean\.id \? clean : c\)\);\n\s+if \(wasSerialPending && setStock\) deductMachineStock\(clean, \{ _stokSerisiz, _manualSerial \}\);/);
  });
  it("AC-20: satisKaydi.js ve stokDurumu.js bu işin adlarını anmaz", () => {
    for (const f of ["src/lib/satisKaydi.js", "src/lib/stokDurumu.js"]) expect(oku(f), f).not.toMatch(/spec 0104|stokBagliBekleyen|stoktaDuranSeri/);
  });
});

describe("Spec 0104: form (R1/2, R16, R18, AC-30)", () => {
  it("R1/2: serisiz daldaki alanın erişilebilir adı tek", () => {
    expect((oku(FORM).match(/aria-label="Seri numarası"/g) || []).length).toBe(1);
  });
  it("R16 (Karar 10, 27): stok seçicisinin kapısı sourceStockId'li seri bekleyen kaydı dışarıda bırakır, düz giriş işaretler", () => {
    const k = oku(FORM);
    expect(k).toMatch(/const stokBagliBekleyen = !!\(isSerialPendingEdit && modal\.edit\.sourceStockId\);/);
    expect(k).toMatch(/if \(\(modal === "add" \|\| isSerialPendingEdit\) && !stokBagliBekleyen && stock && form\.model && stockForModel\.length > 0 && !form\._manualSerial\) \{/);
    expect(k).toMatch(/\.\.\.\(stokBagliBekleyen \? \{ _manualSerial: true \} : \{\}\)/);
  });
  it("Karar 28: model değişiminde yalnız serisiz seçim sıfırlanır", () => {
    expect(oku(FORM)).toMatch(/\.\.\.\(p\._stokSerisiz && p\.model !== m\.model \? \{ _stokSerisiz: false, serialNo: "" \} : \{\}\)/);
  });
  it("AC-30 (C8): spec 0103'ün ifadeleri yerinde", () => {
    const k = oku(FORM);
    expect(k).toMatch(/const stokSecicisiKipi = modal === "add" \|\| seriBekleyenDuzenleme;/);
    expect(k).toMatch(/const partiSecicisi = giderYetki && !\(stokSecicisiKipi && stoktanSecildi\);/);
    expect((k.match(/useLock\(/g) || []).length).toBe(2);
    const kilit = k.slice(k.indexOf("const isStockSerialPick"), k.indexOf('useLock("stok-seri"'));
    expect(kilit).toMatch(/&& \(modal === "add" \|\| \(modal\?\.edit && form\.seriNoBekliyor && !modal\.edit\.serialNo\)\);/);
    expect(k).toMatch(/\$\{PANO_SEKME_ADI\}'nun satılan adedinde görünmez\./);
    expect(fs.existsSync(path.join(kok, "tests/parti-duzeltme-0103.test.js"))).toBe(true);
  });
});

describe("Spec 0104: değişmeyenler (AC-21, R14)", () => {
  it("AC-21: ALAN_IZINLERI'nde customers yok", () => expect(ALAN_IZINLERI.customers).toBeUndefined());
  it("AC-21: KILIT_ALANLARI aynı liste", () => {
    expect(Object.keys(KILIT_ALANLARI)).toEqual(["customer", "dealer", "note", "teklif", "fatura", "yedek_parca", "part_sale", "partstock", "stock",
      "stok-seri", "uretim_formu", "gider", "cek", "kasa_hesap", "tedarikci", "uretim_partisi", "calisan", "ayar", "maliyet_ayar"]);
  });
  it("AC-21: birleştirmenin müşteri parti remap'i ve db.cjs'in müşteri maliyet sütunları aynı", () => {
    expect(oku("src/lib/merge.js")).toMatch(/\.\.\.\(c\.partiId != null \? \{ partiId: remapRef\(maps\.uretimPartileri, c\.partiId\) \} : \{\}\),/);
    expect(oku("electron/db.cjs")).toMatch(/const CUSTOMERS_MALIYET_COLUMNS = \[\["satisKuru", "REAL"\], \["uretimTarihi", "TEXT"\], \["partiId", "INTEGER"\]\];/);
    expect(oku("electron/db.cjs")).not.toMatch(/0104/);
  });
  it("triyaj (bulgu 4): stokta duran numaranın ipucusu sözlüğün Ipucu'su, satır içi kırmızı kopya değil", () => {
    const k = oku(FORM);
    expect(k).toMatch(/\{stoktaDuranSeri && <Ipucu>Bu seri numarası stokta duruyor; o makinayı satmak için listeden serili satırı seçin\.<\/Ipucu>\}/);
    expect(k).not.toMatch(/data-testid="stokta-duran-seri"/);
  });
  it("triyaj (bulgu 2): planın sürüm notu Karar 36'nın sonucunu ve eski kayıtların yolunu söyler", () => {
    const plan = oku("specs/done/0104-uygulama-plani.md");
    const not = plan.slice(plan.indexOf("## 4. Sürüm notu"));
    expect(not).toMatch(/Stoktan eklenen satışlar artık partiye ve üretim tarihine bağlanıyor; eski kayıtların partisi müşteri düzenlemesinden düzeltilebilir\./);
    expect(not).toMatch(/Manuel gir/);
    expect(not).not.toMatch(/karışık sürüm riski yok\.$/m);
  });
});

