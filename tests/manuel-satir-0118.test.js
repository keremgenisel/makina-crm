// Spec 0118: Manuel Satır Ekle penceresinin kaynak taramaları (ölü alan, pencere boyutu, ölçüt çağrısı, tek kurucu, sabitler,
// tasarım içe aktarımı, sütunlar) ve kapanış belge düzeni.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const oku = (f) => readFileSync(f, "utf-8");
const gez = (d) => readdirSync(d).flatMap(ad => {
  const f = path.join(d, ad);
  return statSync(f).isDirectory() ? gez(f) : /\.(m?js|cjs|jsx)$/.test(ad) ? [f] : [];
});
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const PENCERE = "src/components/stock/UretimSatirEkleModal.jsx";
const FORM = "src/components/stock/UretimFormu.jsx";
const BASKI = "src/components/stock/uretimFormPrint.js";

describe("Spec 0118: ölü alan (Karar 35)", () => {
  it("AC-9, AC-30: `torna` anahtarı src/ ve electron/ altında yok (harita verisi gerekçeli dışarıda); fikstürdeki kopya da yok", () => {
    // Harita verisi (`src/lib/map/`) şehir adlarında "torna" alt dizesini taşır (ör. Tornavacas); anahtar değildir.
    const dosyalar = [...gez("src").filter(f => !f.startsWith(path.join("src", "lib", "map"))), ...gez("electron"), "tests/fixtures/0115-veri.js"];
    const desen = /\btorna\b|torna\s*:|\.torna\b/;
    expect(dosyalar.filter(f => desen.test(oku(f)))).toEqual([]);
    expect(oku(PENCERE)).not.toContain("CNC Programı");
  });
});

describe("Spec 0118: pencere taramaları", () => {
  const p = () => oku(PENCERE);
  it("AC-33: pencere `wide` açılır; Modal'a width=, maxWidth, maxHeight verilmez (iç listelerin kaydırma sınırı stil değeridir, R7/2)", () => {
    const etiket = p().match(/<Modal\b[^>]*>/)[0];
    expect(etiket).toMatch(/\bwide\b/);
    expect(etiket).not.toMatch(/width=|maxWidth|maxHeight/);
    expect(p()).not.toMatch(/\bwidth=\{/);
  });
  it("AC-34: pencere bekleyen ölçütünü çağırmaz, haritayı kurmaz, servis girişlerini okumaz", () => {
    const k = yorumsuz(p());
    for (const ad of ["bekleyenTamirler(", "tamirSatirHaritasi(", "atolyeKaliplari"]) expect(k, ad).not.toContain(ad);
  });
  it("AC-39: pencere tasarim.jsx'i içe almaz ve kanıt eşlemesinde anahtarı yok", () => {
    expect(p()).not.toMatch(/from\s+["'][^"']*tasarim["']/);
    expect(Object.keys(JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar)).not.toContain(PENCERE);
  });
  it("AC-43: başlık ve boş durum metinleri sabitten; pencere satır içi yazmaz", () => {
    const k = yorumsuz(p());
    expect(k).toContain("{MANUEL_TAMIR_BASLIGI}");
    expect(k).toContain("{TAMIR_YOK}");
    for (const m of ["SERVİSTE BEKLEYEN KALIPLAR", "Bekleyen tamir yok", "Kalıp atölyeye girecek", "Ayarlar › Katalog"]) expect(k, m).not.toContain(m);
  });
  it("AC-47: tamirSatiriKur( pencerede tam bir kez", () => {
    expect(yorumsuz(p()).split("tamirSatiriKur(").length - 1).toBe(1);
  });
  it("AC-48: kalipCapi okumaları yalnız c.kalipCapi ve cust?.kalipCapi", () => {
    for (const f of [PENCERE, FORM]) {
      const okumalar = [...yorumsuz(oku(f)).matchAll(/([\w?.]+)\.kalipCapi\b/g)].map(m => `${m[1]}.kalipCapi`);
      for (const o of okumalar) expect(["c.kalipCapi", "cust?.kalipCapi"], `${f}: ${o}`).toContain(o);
    }
  });
  it("AC-49: satır üreten yol iki (üretim satırları ve tamir satırları), manuel alan üç", () => {
    const k = yorumsuz(p());
    expect(k).toMatch(/onAdd\(\[\.\.\.newRows, \.\.\.tamirSatirlari\]\)/);
    expect(k.split("onAdd(").length - 1).toBe(1);
    expect([...k.matchAll(/aria-label="(Kalıp Kodu|Kalıp Ölçüsü|Makina Kalıp Çapı)"/g)].map(m => m[1]))
      .toEqual(["Kalıp Kodu", "Kalıp Ölçüsü", "Makina Kalıp Çapı"]);
  });
  it("AC-24 (Karar 37): kapalı dönem metni ekranda tek sabit; üç kapı onu okur", () => {
    const k = yorumsuz(oku(FORM));
    expect(k.split("Bu dönem sonlandırılmış, yeni kalıp eklenemez.").length - 1).toBe(1);
    expect(k.split("showToast(DONEM_KAPALI_METNI)").length - 1).toBe(3);
  });
  it("Karar 41: pencere services ve uretimFormlari almaz, `bekleyenler` alır", () => {
    const imza = p().match(/export function UretimSatirEkleModal\(\{([^}]*)\}/)[1];
    expect(imza).toContain("bekleyenler");
    expect(imza).not.toMatch(/services|uretimFormlari/);
    expect(yorumsuz(oku(FORM))).toMatch(/<UretimSatirEkleModal[\s\S]*?bekleyenler=\{bekleyenler\}/);
  });
});

describe("Spec 0118: sütunlar değişmez", () => {
  it("AC-10, AC-46: ekran altı veri + bir işlem sütunu, çıktı altı sütun; CNC Torna sütunu ve makinaKalipCapi hücresi aynen", () => {
    expect(oku(FORM)).toContain("Kalıp CNC Torna Ölçüleri");
    expect(oku(BASKI)).toContain("Kalıp CNC Torna Ölçüleri");
    expect(oku(FORM)).toMatch(/r\.makinaKalipCapi/);
    expect(oku(BASKI)).toMatch(/makinaKalipCapi/);
    expect(oku(BASKI).split("<th ").length - 1).toBe(6);
  });
});

// Kapanış belge düzeni (Karar 44: 0118 bölümü CLAUDE.md'de 0117'nin önünde, dilim 0117 başlığında biter).
describe("Spec 0118: kapanış belge düzeni", () => {
  it("plan done'daysa: 'Tamamlandı: commit', eski kopya yok, README Tamamlandı, kanıt ayni", () => {
    if (!existsSync("specs/done/0118-uygulama-plani.md")) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0118, plan"), claude.indexOf("(spec 0117, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(bolum).not.toMatch(/specs\/0118-/);
    expect(existsSync("specs/0118-manuel-satir-ekle-kod-ve-tamir.md")).toBe(false);
    expect(oku("specs/README.md")).toMatch(/\| \*\*0118\*\* \| [^|]*\(Tamamlandı\)/);
    const k = Object.values(JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar).flat().filter(x => /\/0118-/.test(x.rapor));
    expect(k.filter(x => x.beklenen === "degisti" || x.onay)).toEqual([]);
  });
});
