// Spec 0090: gider ataması ve aylara dağıtım kalkar. Motor düzeyinde giriş kapıları (AC-4–AC-8, R5/2, R5/3) ve kaynak
// taramaları (AC-46, AC-47, AC-54, AC-55, AC-56, C13, C18). Ekran düzeyi tests/ui/gider-atama-kalkar-0090.test.jsx'te,
// görsel kanıt aracı AC-57 ve kriter kapsamı bu dosyanın sonunda.
import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { buildAylikRaporHtml } from "../src/lib/printTemplates";
import { girdi, faaliyetVeri, faaliyetSecenek } from "./fixtures/0059-veri";
import { giderKalemDogrula, tekrarlayanUret, turHaritasi, atamaVerisiKoru, ATAMA_ANAHTARLARI, ATAMA } from "../src/lib/gider";

// Yorumları atar (satır ve blok; JSX içindeki {/* */} dahil), dizeleri korur.
const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? tara(p) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 5, ad: "SGK", davranis: "sgk" }];
const turMap = turHaritasi(TURLER);
const dogrula = (f) => giderKalemDogrula({ tarih: "2026-10-05", kdvOrani: 20, ...f }, { turMap, uid: () => 777 });

describe("Spec 0090: giriş kapıları, motor (R4–R6)", () => {
  it("AC-4: model ataması ve iki model satırı taşıyan eski kalem kaydedilince atama türü ve satırlar birebir korunur", () => {
    const satirlar = [{ modelAd: "AK100", birimMaliyet: 300, adet: 2 }, { modelAd: "AK200", birimMaliyet: 100, adet: 1 }];
    const r = dogrula({ id: 9, turId: 1, tutar: 1000, atamaTur: ATAMA.MODEL, modelSatirlari: satirlar });
    expect(r.hatalar).toEqual([]);
    expect(r.kayit).toMatchObject({ atamaTur: "model", modelSatirlari: satirlar });
  });
  it("AC-5: on iki aya dağıtılmış eski kalem kaydedilince dağıtım ayı korunur", () => {
    expect(dogrula({ id: 9, turId: 1, tutar: 1200, dagitimAy: 12 }).kayit.dagitimAy).toBe(12);
  });
  it("AC-6: yeni kalemin gövdesinde atama türü, makina alanları, model satırları ve dağıtım ayı anahtarları hiç yok", () => {
    for (const [turId, ek] of [[1, { tutar: 100 }], [2, { tutar: 100, girisYonu: "brut", stopajOrani: 20, kdvOrani: 0 }],
      [3, { calisanId: 7, calisanAd: "A", resmiTutar: 100, eldenTutar: 0 }], [5, { tutar: 100, kdvOrani: 0 }]]) {
      const k = dogrula({ turId, ...ek, atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [], dagitimAy: "" }).kayit;
      for (const a of ATAMA_ANAHTARLARI) expect(k, `${turId} ${a}`).not.toHaveProperty(a);
    }
  });
  it("R5/3 (K1): atama taşıyan kalemde hata ve uyarı yok; biçim çözülür; atanamayan davranışta atama, makina atamasında dağıtım düşer", () => {
    // Bugün aşım hatası verecek model dağılımı: kullanıcının düzeltecek alanı yok, kayıt kilitlenmez.
    const asim = dogrula({ turId: 1, tutar: 100, atamaTur: ATAMA.MODEL, modelSatirlari: [{ modelAd: " AK100 ", birimMaliyet: "1.000", adet: "3" }] });
    expect(asim.hatalar).toEqual([]);
    expect(asim.uyarilar).toEqual([]);
    expect(asim.kayit.modelSatirlari).toEqual([{ modelAd: "AK100", birimMaliyet: 1000, adet: 3 }]);
    const kira = dogrula({ turId: 2, tutar: 100, girisYonu: "brut", stopajOrani: 20, kdvOrani: 0, atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 5, dagitimAy: 6 });
    expect(kira.kayit).not.toHaveProperty("atamaTur");
    expect(kira.kayit.dagitimAy).toBe(6); // kira ortak kovada kalır, dağıtım ortak payın kuralıdır
    const makina = dogrula({ turId: 1, tutar: 100, atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 5, dagitimAy: 6 });
    expect(makina.kayit).toMatchObject({ atamaTur: "makina", makinaTur: "stok", makinaId: 5 });
    expect(makina.kayit).not.toHaveProperty("dagitimAy");
    expect(atamaVerisiKoru({ atamaTur: ATAMA.DAGITMA, dagitimAy: 12 }, true)).toEqual({ atamaTur: "dagitma" });
  });
  it("AC-8: atama ve dağıtım taşıyan eski tanımdan üretilen kalem bu veriyi bugünkü gibi taşır", () => {
    const tanim = { id: 40, ad: "Sigorta", turId: 1, tutar: 1200, kdvOrani: 20, baslangicAy: "2026-01", uretilenAylar: [],
      atamaTur: ATAMA.MODEL, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 100, adet: 2 }], dagitimAy: 12 };
    const r = tekrarlayanUret([tanim], [], "2026-03", { turMap, uid: () => 501 });
    const k = r.yeniKalemler[0];
    expect(k).toMatchObject({ tanimId: 40, atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 100, adet: 2 }], dagitimAy: 12 });
    const yalin = tekrarlayanUret([{ ...tanim, id: 41, atamaTur: undefined, modelSatirlari: undefined, dagitimAy: undefined }], [], "2026-03", { turMap, uid: () => 502 });
    const k2 = yalin.yeniKalemler[0];
    for (const a of ATAMA_ANAHTARLARI) expect(k2, a).not.toHaveProperty(a);
  });
});

describe("Spec 0090: yazdırılan raporlar (R11, R11/2, C12, C16, C17)", () => {
  const BASLIK = "GİDER · MALİYET DAĞILIMI";
  const kutuCikar = (html) => {
    const i = html.indexOf(BASLIK);
    if (i < 0) return html;
    const bas = html.lastIndexOf('<div style="border:1px solid #e2e8f0;', i);
    const son = html.indexOf("\n    </div>", i) + "\n    </div>".length;
    return html.slice(0, bas).replace(/\s*$/, "") + html.slice(son);
  };
  const html = () => buildGiderKasaRaporuHtml(giderKasaRaporu(girdi(), "2026-09"));
  it("AC-14: Aylık Gider ve Kasa Raporu'nda maliyet dağılımı kutusunun başlığı geçmez; rapor nesnesinde kova alanı ölü alan olarak durur", () => {
    expect(html()).not.toMatch(/MALİYET DAĞILIMI/);
    expect(giderKasaRaporu(girdi(), "2026-09").gider.kovalar).toBeTruthy(); // R11/2
  });
  it("AC-15 (C16): kalan bütün kutular ve satırlar spec öncesi altın HTML ile birebir aynı (yalnız maliyet dağılımı kutusu ayıklanır)", () => {
    const altin = readFileSync("tests/fixtures/0089-gider-kasa-raporu-once.html", "utf8");
    expect(altin).toContain(BASLIK);
    expect(html()).toBe(kutuCikar(altin));
  });
  it("AC-16 (C12, C17): Aylık Faaliyet Raporu bayt bayt aynı; 0059 altınları değişmedi", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-15T09:00:00Z"));
    const r = hesaplaAylikRapor(faaliyetVeri, "2026-06", faaliyetSecenek);
    r.onceki = hesaplaAylikRapor(faaliyetVeri, "2026-05", faaliyetSecenek);
    const bos = hesaplaAylikRapor({ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }, "2026-06", faaliyetSecenek);
    const cikti = [buildAylikRaporHtml(r, { name: "Altuntaş <Makina>", adres: "OSB", city: "Konya", country: "Türkiye", phone: "0332", email: "a@b.c", web: "x.com" }),
      buildAylikRaporHtml(bos, { name: "Altuntaş Makina" })].join("\n<!-- ===== -->\n");
    vi.useRealTimers();
    expect(cikti).toBe(readFileSync("tests/fixtures/0059-aylik-faaliyet.html", "utf-8"));
    const ozet = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
    expect(ozet("tests/fixtures/0059-gider-rapor-once.json")).toBe("befe1ba83e688dd896b59b1618276f274eaceec833285e8f354b8dd1a0cafbaf");
  });
});

describe("Spec 0090: kaynak taramaları", () => {
  it("AC-46 (C18): bugünkü motorun dört hesabı src altında çağrılmaz; scripts altında iki gerekçeli istisna", () => {
    const desen = /\b(hesaplaMakinaMaliyetleri|karlilikOzeti|makinaKarlilik|fiyatOnerisi)\s*\(/;
    expect(tara("src").filter(f => f !== "src/lib/makinaMaliyeti.js" && desen.test(kod(f)))).toEqual([]);
    expect(tara("scripts").filter(f => desen.test(kod(f))).sort()).toEqual(["scripts/evidence/0009-sayfa.jsx", "scripts/tests/0088-kiyas-fikstur.mjs"]);
    expect(kod("src/App.jsx")).not.toMatch(/from "\.\/lib\/makinaMaliyeti"/);
  });
  it("AC-47 (R28): Üretim Partileri ve Makina Maliyeti bugünkü maliyet sonucunu almaz", () => {
    for (const f of ["src/components/gider/UretimPartileri.jsx", "src/components/MakinaMaliyeti.jsx", "src/App.jsx"]) expect(kod(f), f).not.toMatch(/\bmakinaMaliyet\b/);
    expect(kod("src/components/MakinaMaliyeti.jsx")).toMatch(/partiGenelPaylari\(/);
  });
  it("AC-54 (R38): silinen bileşenler, kova kartı, kopmuş atama yardımcıları ve ekran metinleri kaynakta yok", () => {
    const adlar = /\b(AtamaAlani|DagitimAlani|ModelSatirlari|KovaKarti|dusenAtamaKalemSayisi|dusenAtamaMetni|MakinaSecici|ATAMA_SECENEKLERI)\b/;
    const metinler = /Makina maliyeti ataması|Maliyete dağıtım \(ay\)|Makina Maliyeti Kovaları|dusen-atama-sayisi|dagitim-rozeti|ataması ortak gidere düştü/;
    // "kova-karti" kimliği açık kalemlerin yaşlandırma kovası düğmesinde de vardır (ayrı kavram, 0061; R43): taranmaz.
    const src = tara("src").filter(f => f.startsWith("src/components") || f === "src/App.jsx");
    expect(src.filter(f => adlar.test(kod(f)))).toEqual([]);
    expect(src.filter(f => metinler.test(kod(f)))).toEqual([]);
  });
  it("R5/2 (triyaj bulgu 3): src altında boş atama değeri yazan yer yok (kural tek yerde, atamaVerisiKoru)", () => {
    expect(tara("src").filter(f => /atamaTur:\s*""/.test(kod(f)))).toEqual([]);
  });
  it("AC-55 (R40): gider formu stok, müşteri, model; kalem listesi stok, müşteri, standart ve özel model prop'u almaz", () => {
    const form = kod("src/components/GiderForm.jsx").match(/export const GiderForm = \(\{([^}]*)\}/)[1];
    for (const p of ["stock", "customers", "modeller"]) expect(form, p).not.toMatch(new RegExp(`\\b${p}\\b`));
    const liste = kod("src/components/gider/DonemRaporu.jsx").match(/export const KalemListesi = \(\{([^}]*)\}/)[1];
    for (const p of ["stock", "customers", "standardModels", "customModels"]) expect(liste, p).not.toMatch(new RegExp(`\\b${p}\\b`));
    expect(kod("src/components/Giderler.jsx")).not.toMatch(/<GiderForm[^>]*\b(stock|customers|modeller)=/);
  });
  it("R40 (triyaj bulgu 4): silme onayının ölü giderler prop'u ve kalkan ekranların dört yardımcısı yok", async () => {
    const app = kod("src/App.jsx");
    expect(app).not.toMatch(/<Customers [^\n]*\bgiderler=/);
    expect(app).not.toMatch(/<Stock [^\n]*\bgiderler=/);
    expect(kod("src/components/Stock.jsx")).not.toMatch(/\bgiderler\b/);
    const G = await import("../src/lib/gider");
    for (const ad of ["dagitimRozetMetni", "makinaGiderSayisi", "modelKullanim", "modelSatirlariDogrula"]) {
      expect(G[ad], ad).toBeUndefined();
      expect(tara("src").filter(f => new RegExp(`\\b${ad}\\b`).test(kod(f))), ad).toEqual([]);
    }
  });
  it("AC-53 (R39): silme onaylarında atama cümlesi yok; model adı taşıma zinciri duruyor", () => {
    for (const f of ["src/components/Customers.jsx", "src/components/stock/MakinaStokTab.jsx", "src/components/ModelsManager.jsx"]) {
      expect(kod(f), f).not.toMatch(/makinaGiderSayisi|modelKullanim|atanmış .*gider kalemi|ortak gidere düşer/);
    }
    expect(kod("src/components/ModelsManager.jsx")).toMatch(/modelAdiTasi/);
  });
  it("AC-56 (R41): tasarım sözlüğünde atama kutusu 'Ödenen borç (spec 0090)' bölümünde, 'Bilinen borç'ta yok", () => {
    const s = readFileSync("docs/tasarim-sozlugu.md", "utf8");
    const bilinen = s.slice(s.indexOf("Bilinen borç"), s.indexOf("Ödenen borç"));
    expect(bilinen).not.toMatch(/atama alanı|AtamaAlani/i);
    expect(s).toMatch(/Ödenen borç \(spec 0090\)/);
  });
  it("C13: sunucu izinleri, bölüm eşlemeleri ve birleştirme kuralları yeni alanı bilmez; yeni bölüm yok", () => {
    for (const f of ["electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/permissions.js"]) expect(kod(f), f).not.toMatch(/kapanisGenelHavuzlari/);
  });
  it("C10: bugünkü maliyet motoru ve testi bir sürüm yerinde", () => {
    expect(existsSync("src/lib/makinaMaliyeti.js")).toBe(true);
    expect(existsSync("tests/makina-maliyeti.test.js")).toBe(true);
  });
});

describe("Spec 0090: görsel kanıt aracı ve kriter kapsamı (R42, AC-57)", () => {
  const arac = readFileSync("scripts/evidence/0009-sayfa.jsx", "utf8");
  // Ekran kayıtları: `"ad": [` ile başlayan satırlar ve adımları (kayıt sonuna kadar).
  const ekranlar = [...arac.matchAll(/^\s*"([a-z0-9-]+)":\s*(?=[[<\w])/gm)].map(m => m[1]);
  it("AC-57: silinen altı ekran yok, iki yeni ekran var; atama ya da dağıtım adımı taşıyan ekran kalmadı", () => {
    for (const e of ["gider-formu-personel-makina", "gider-formu-0072", "gider-formu-0072-makina", "gider-formu-0072-kira", "ayarlar-gidertanim-0072", "giderler-0089-kova-dusen"])
      expect(ekranlar, e).not.toContain(e);
    for (const e of ["maliyet-0090-parti-neden", "giderler-0090-rapor"]) expect(ekranlar, e).toContain(e);
    expect(arac).not.toMatch(/"(tikla|kaydir|doldur|dugme|sec):(Makina Maliyeti Kovaları|Maliyete dağıtım|Makina maliyeti ataması)/);
    expect(arac).not.toMatch(/\["Yeni Gider", "(Makina|Model|Dağıtılmasın)"/);
  });
  it("AC-57: değişen ekranların kanıt kaydı 'degisti' ve spec 0090 R42 onayını taşır", () => {
    const e = JSON.parse(readFileSync("docs/evidence/kanit-eslemesi.json", "utf8"));
    const kayitlar = Object.values(e.dosyalar).flat().filter(x => /\/0090-piksel-raporu\.json$/.test(x.rapor || ""));
    expect(kayitlar.length).toBeGreaterThan(0);
    expect(kayitlar.some(x => x.beklenen === "degisti")).toBe(true);
    for (const x of kayitlar) if (x.beklenen === "degisti") expect(x.onay, x.ekran).toMatch(/^Takım Yöneticisi · \d{4}-\d{2}-\d{2} · spec 0090 R42/);
    for (const e of ["maliyet-0090-parti-neden", "giderler-0090-rapor"]) expect(kayitlar.some(x => x.ekran === e), e).toBe(true);
  });
  it("DoD: spec'teki her kabul kriterinin adıyla bir testi var", () => {
    const spec = existsSync("specs/0090-gider-atamasi-kalkar-parti-payi-rolden.md") ? "specs/0090-gider-atamasi-kalkar-parti-payi-rolden.md" : "specs/done/0090-gider-atamasi-kalkar-parti-payi-rolden.md";
    const ac = [...new Set([...readFileSync(spec, "utf8").matchAll(/^- \*\*(AC-[\d/]+)\.\*\*/gm)].map(m => m[1]))];
    expect(ac.length).toBeGreaterThan(60);
    const testler = tara("tests").filter(f => /0090/.test(f)).map(f => readFileSync(f, "utf8")).join("\n");
    // AC-45 (gidiş dönüş) gerçek SQLite katmanında, Electron betiğinin check() adlarıyla ölçülür (tests/db-electron.test.js).
    const roundtrip = readFileSync("scripts/tests/db-roundtrip.cjs", "utf8");
    const adlar = [...testler.matchAll(/\bit\("([^"]+)"/g), ...roundtrip.matchAll(/check\("(spec 0090 [^"]+)"/g)].map(m => m[1]).join("\n");
    // AC-58 rehberin el ölçümüdür (analistin dosyası, git'te izlenmez; revizyon 3, K7): plan dosyasında kayıtlı.
    const eksik = ac.filter(a => a !== "AC-58" && !new RegExp(`(^|[^\\d/])${a.replace("/", "\\/")}(?![\\d/])`, "m").test(adlar));
    expect(eksik).toEqual([]);
  });
});
