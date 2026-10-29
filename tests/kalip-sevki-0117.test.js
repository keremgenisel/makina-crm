// Spec 0117: tamir edilen kalıbın dönüşü. Tek yazıcı (tamirSevkKur + tamirYaz), etiket adaptörü (teslim şekli ve tarih kayıttan),
// liste başlığının iki okuma yolu, kaynak taramaları (yazıcı, ad tuzağı, sunucu, üretim formunun ölü parçaları, kanıt aracı)
// ve kapanış belge düzeni.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { tamirSevkKur, tamirYaz, sevkTarihi, sevkTeslimSekli, SEVK_ALANLARI, SERVIS_KALIPLARI_ETIKETI } from "../src/lib/kalipTamiri";
import { buildServiceFormHtml, buildKargoEtiketiHtml, tamirEtiketVerisi, DEFAULT_SERVIS_TRANSLATIONS } from "../src/lib/printTemplates";
import { GROUPS } from "../src/components/settings/SettingsTranslations";
import { ALAN_IZINLERI } from "../electron/serverAuth.cjs";
import { KDV, FAB, CUSTOMERS, SERVICES } from "./fixtures/0115-veri";

const oku = (f) => readFileSync(f, "utf8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const dosyalar = (kok) => readdirSync(kok).flatMap(a => { const p = path.join(kok, a); return statSync(p).isDirectory() ? dosyalar(p) : /\.(jsx?|cjs|mjs)$/.test(a) ? [p] : []; });
const SRC = dosyalar("src");
const LISTE = [{ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }, { id: 2, ad: "HAMBURGER", olcu: "Ø98" }];
const SV = { ...SERVICES[0], atolyeKaliplari: LISTE };
const ALANLAR = ["kalipFabrikaTeslim", "kalipKargoFirma", "kalipKargoTakipNo", "kalipKargoTarih", "kalipKargoSorumlusu"];
const vArgs = (v) => [v.gonderen, v.alici, v.icerik, v.opts];

describe("Spec 0117 E: tek yazıcı (R26–R29, C3)", () => {
  it("AC-38: beş alanın adı spec'teki gibi", () => {
    expect(SEVK_ALANLARI).toEqual(ALANLAR);
  });
  it("AC-8, AC-11: kutu açık, alanlar boş → sevk boş; boşluk dolu değer kırpılır ya da düşer", () => {
    expect(tamirSevkKur({ _kalipAtolye: true })).toEqual({});
    expect(tamirSevkKur({ _kalipAtolye: true, kalipKargoFirma: "   ", kalipKargoTarih: "", kalipFabrikaTeslim: false })).toEqual({});
    expect(tamirSevkKur({ _kalipAtolye: true, kalipKargoFirma: "  Aras ", kalipKargoSorumlusu: "Ayşe" })).toEqual({ kalipKargoFirma: "Aras", kalipKargoSorumlusu: "Ayşe" });
  });
  it("AC-10, R9: kutu kapalıyken (geçici alan ya da listesiz kayıt) hiçbir sevk değeri yazılmaz", () => {
    expect(tamirSevkKur({ _kalipAtolye: false, kalipKargoFirma: "Aras", kalipFabrikaTeslim: true })).toEqual({});
    expect(tamirSevkKur({ kalipKargoFirma: "Aras" })).toEqual({});
  });
  it("AC-39, R6: Fabrika Teslim yalnız true yazılır; firma ve takip düşer, tarih ve kişi kalır", () => {
    expect(tamirSevkKur({ _kalipAtolye: true, kalipFabrikaTeslim: true, kalipKargoFirma: "Aras", kalipKargoTakipNo: "T1", kalipKargoTarih: "2026-10-20", kalipKargoSorumlusu: "Ali" }))
      .toEqual({ kalipFabrikaTeslim: true, kalipKargoTarih: "2026-10-20", kalipKargoSorumlusu: "Ali" });
    expect("kalipFabrikaTeslim" in tamirSevkKur({ _kalipAtolye: true, kalipFabrikaTeslim: false, kalipKargoFirma: "Aras" })).toBe(false);
  });
  it("R29, R9: tamirYaz beş anahtarı her çağrıda siler; yalnız liste doluyken sevki yazar", () => {
    const kayit = { id: 41, kalipKargoFirma: "eski", kalipFabrikaTeslim: true, _kalipAtolye: true };
    expect(tamirYaz(kayit, [])).toEqual({ id: 41 });
    expect(tamirYaz(kayit, [], { kalipKargoFirma: "Aras" })).toEqual({ id: 41 });
    expect(tamirYaz(kayit, LISTE, { kalipKargoFirma: "Aras" })).toEqual({ id: 41, atolyeKaliplari: LISTE, kalipKargoFirma: "Aras" });
    expect(tamirYaz({ id: 42 }, LISTE)).toEqual({ id: 42, atolyeKaliplari: LISTE }); // iki argümanlı çağrı aynen
  });
  it("AC-54, R7/2: doğrulama yok; erken tarih ve uzun takip numarası olduğu gibi yazılır", () => {
    const uzun = "X".repeat(500);
    expect(tamirSevkKur({ _kalipAtolye: true, kalipKargoTarih: "1999-01-01", kalipKargoTakipNo: uzun })).toEqual({ kalipKargoTarih: "1999-01-01", kalipKargoTakipNo: uzun });
  });
});

describe("Spec 0117 C: etiketin içeriği (R17–R20)", () => {
  const veri = (ek) => tamirEtiketVerisi({ ...SV, ...ek }, { customers: CUSTOMERS, factory: FAB });
  it("AC-21, AC-22: Fabrika Teslim → 'Fabrika Teslim'; boş → 'Kargo'", () => {
    expect(veri({ kalipFabrikaTeslim: true }).opts.teslimSekli).toBe("Fabrika Teslim");
    expect(veri({}).opts.teslimSekli).toBe("Kargo");
    expect(sevkTeslimSekli({ kalipFabrikaTeslim: false })).toBe("Kargo");
  });
  it("AC-23, AC-24: kargo tarihi doluysa o; boş dize ya da alan yoksa servis tarihi ('—' hücreye girmez)", () => {
    expect(veri({ kalipKargoTarih: "2026-10-25" }).opts.tarih).toBe("25/10/2026");
    expect(veri({ kalipKargoTarih: "" }).opts.tarih).toBe("12/10/2026");
    expect(veri({}).opts.tarih).toBe("12/10/2026");
  });
  it("AC-50 (plan Ö1): bozuk ya da takvimde olmayan sevk tarihinde servis tarihi basılır", () => {
    for (const bozuk of ["abc", "2026-02-30", "25.10.2026", "2026-10"]) expect(veri({ kalipKargoTarih: bozuk }).opts.tarih, bozuk).toBe("12/10/2026");
    expect(sevkTarihi({ kalipKargoTarih: "2024-02-29", date: "2026-01-01" })).toBe("2024-02-29");
  });
  it("AC-49, AC-26: opts yalnız iki anahtar; kargo firması ve takip numarası etikette geçmez", () => {
    const v = veri({ kalipKargoFirma: "ArasKargoX", kalipKargoTakipNo: "TK-998877", kalipKargoTarih: "2026-10-25", kalipFabrikaTeslim: false });
    expect(v.opts).toEqual({ teslimSekli: "Kargo", tarih: "25/10/2026" });
    const html = buildKargoEtiketiHtml(...vArgs(v));
    expect(html).not.toContain("ArasKargoX");
    expect(html).not.toContain("TK-998877");
  });
  it("AC-25: altı başlık ve iki hücreli alt bant değişmez", () => {
    const html = buildKargoEtiketiHtml(...vArgs(veri({ kalipFabrikaTeslim: true })));
    for (const b of ["SEVK / KARGO ETİKETİ", "GÖNDEREN", "ALICI", "İÇERİK", "TESLİM ŞEKLİ", "TARİH"]) expect(html, b).toContain(b);
    expect(html).not.toMatch(/KARGO-TAKİP|Takip/);
  });
});

describe("Spec 0117 D: liste başlığının iki okuma yolu (C10, C11)", () => {
  it("AC-27, AC-28, AC-31: TR, EN, Çeviriler ekranı ve kod sabiti aynı turda yeni adda; anahtarın adı aynı", () => {
    expect(DEFAULT_SERVIS_TRANSLATIONS.TR.atolyeKaliplariLabel).toBe("SERVİS GÖREN KALIPLAR");
    expect(DEFAULT_SERVIS_TRANSLATIONS.EN.atolyeKaliplariLabel).toBe("SERVICED MOLDS");
    const k = GROUPS.filter(g => g.ns === "servis").flatMap(g => g.keys).find(x => x.key === "atolyeKaliplariLabel");
    expect(k?.label).toBe("Servis Gören Kalıplar");
    expect(SERVIS_KALIPLARI_ETIKETI).toBe("Servis gören kalıplar");
    expect(SRC.filter(f => /ATÖLYEYE ALINAN KALIPLAR|MOLDS TAKEN INTO WORKSHOP|Atölyeye [Aa]lınan [Kk]alıplar|ATOLYE_KALIPLARI_ETIKETI/.test(oku(f)))).toEqual([]);
  });
  it("AC-42, AC-43: çıktı çeviri anahtarından okur; kullanıcının spec öncesi düzenlemesi basılmaya devam eder", () => {
    const ozel = buildServiceFormHtml(SV, CUSTOMERS, KDV, { factory: FAB, translations: { TR: { atolyeKaliplariLabel: "TAMİRE GELENLER" }, _lang: "TR" } });
    expect(ozel).toContain("<tr><th>TAMİRE GELENLER</th>");
    expect(ozel).not.toContain("SERVİS GÖREN KALIPLAR");
    expect(buildServiceFormHtml(SV, CUSTOMERS, KDV, { factory: FAB })).toContain("<tr><th>SERVİS GÖREN KALIPLAR</th>");
    expect(oku("src/lib/printTemplates.js")).toMatch(/L\.atolyeKaliplariLabel/);
    expect(oku("src/components/customers/detail/MachineTimeline.jsx")).toMatch(/SERVIS_KALIPLARI_ETIKETI as KAYIT_ETIKETI/);
  });
});

describe("Spec 0117 F: kaynak taramaları", () => {
  it("AC-38 (plan Ö7): beş anahtarı yazan yalnız tek yazıcı ve formu düzenleyen bölüm; kurucular üçüncü adımı çağırır", () => {
    const yazan = SRC.filter(f => /\b(kalipFabrikaTeslim|kalipKargoFirma|kalipKargoTakipNo|kalipKargoTarih|kalipKargoSorumlusu)\s*:/.test(yorumsuz(oku(f)))).sort();
    expect(yazan).toEqual([path.join("src", "components", "KalipAtolyeAlani.jsx"), path.join("src", "lib", "kalipTamiri.js")]);
    for (const f of ["src/components/customers/CustomerDetailModal.jsx", "src/components/ServisPanosu.jsx"]) {
      expect(oku(f), f).toMatch(/tamirYaz\(recTevkifat, tamirListesiKur\([a-zA-Z]+, uid\), tamirSevkKur\([a-zA-Z]+\)\)/);
    }
    const b = oku("src/components/KalipAtolyeAlani.jsx");
    for (const t of ["kalip-sevk", "kalip-sevk-firma", "kalip-sevk-takip", "kalip-sevk-tarih", "kalip-sevk-kisi"]) expect(b, t).toContain(`data-testid="${t}"`);
    expect(b).toContain('ariaLabel="Kalıp Teslim Şekli"');
    expect(b).toContain('id="kalip-sevk-kisi-listesi"');
  });
  it("C1, C12 (plan Ö8): ad tuzağı; kalıbın dönüşü onarım yeriyle karışmaz", () => {
    for (const f of ["src/lib/kalipTamiri.js", "src/components/KalipAtolyeAlani.jsx"]) {
      expect(yorumsuz(oku(f)), f).not.toMatch(/repairPlace|[^p]fabrikaTeslim\b/);
    }
    expect(oku("src/components/ServisPanosu.jsx")).not.toMatch(/kalipFabrikaTeslim|sevkTeslimSekli|sevkFabrikaTeslimMi/);
    const ad = oku("src/lib/printTemplates.js");
    const fn = ad.slice(ad.indexOf("export function tamirEtiketVerisi"), ad.indexOf("export function buildKargoEtiketiHtml"));
    expect(fn).not.toMatch(/repairPlace/);
    const db = oku("electron/db.cjs");
    const ins = db.slice(db.indexOf("INSERT INTO services"), db.indexOf("INSERT INTO services") + 2500);
    expect(ins).not.toMatch(/[^p]fabrikaTeslim\b/);
  });
  it("AC-51 (R30): üretim formu etiketi içe almaz, yardımcı ve düğme yok; factory yerinde", () => {
    const k = oku("src/components/stock/UretimFormu.jsx");
    expect(k).not.toMatch(/tamirEtiketYazdir|tamirEtiketi|Kargo Etiketi|tamirKaynagi\b/); // tamirKaynagi yalnız düğmenin kapısıydı
    expect(k).toMatch(/factory\?\.evrakFirmaAdi \|\| factory\?\.name/);
  });
  it("AC-52 (R31): ALAN_IZINLERI.services yalnız durum; serverAuth beş adı anmaz", () => {
    expect(ALAN_IZINLERI.services.map(x => x.alan)).toEqual(["durum"]);
    const s = oku("electron/serverAuth.cjs");
    for (const a of ALANLAR) expect(s, a).not.toContain(a);
  });
  it("C4: yeni izin yok (izin tanımları ve sunucu)", () => {
    expect(oku("src/components/settings/serverPermissionDefs.js")).not.toMatch(/sevk|kalipKargo/i);
  });
  it("AC-44 (R32, plan Ö9): kanıt aracı kaldırılan başlığa kaymaz; sayfanın adım uyarıları rapora yazılır", () => {
    const a = oku("scripts/evidence/0009-sayfa.jsx");
    expect(a).not.toContain("ATÖLYEYE ALINAN KALIPLAR");
    expect(a).toContain('"kaydirgenis:SERVİS GÖREN KALIPLAR"');
    expect(a).toContain('"kaydirgenis:Bekleyen Tamirleri Getir"');
    expect(a).not.toContain('"kaydir:Atölyeye girecek"');
    expect(oku("scripts/evidence/0009-ekran.cjs")).toMatch(/adimUyarilari/);
  });
  it("AC-44: 0117 kanıt kayıtları spec 0117 onayını taşır (degisti iken)", () => {
    const k = Object.values(JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar).flat().filter(x => /\/0117-/.test(x.rapor));
    expect(k.length).toBeGreaterThan(0);
    for (const x of k.filter(x => x.beklenen === "degisti")) expect(x.onay, x.ekran).toMatch(/^Takım Yöneticisi · \d{4}-\d{2}-\d{2} · spec 0117 /);
  });
});

describe("Spec 0117: belge düzeni (triyaj)", () => {
  const sp = () => oku(["specs/0117-tamir-edilen-kalibin-sevki.md", "specs/done/0117-tamir-edilen-kalibin-sevki.md"].find(existsSync));
  const plan = () => oku(["specs/0117-uygulama-plani.md", "specs/done/0117-uygulama-plani.md"].find(existsSync));
  it("Sürüm notu: risk yalnız güncellenmemiş sunucuda; güncellenmemiş istemcinin sevki sildiği yazılmaz", () => {
    const not = plan().slice(plan().indexOf("## 6. Sürüm notu"));
    expect(not).toMatch(/güncellenmemiş sunucu yeni sütunları bilmez ve değerleri düşürür/);
    expect(not).not.toMatch(/güncellenmemiş istemci servisi düzenlerse sevk bilgisi silinir/);
    expect(not).toMatch(/Önce sunucu PC/);
  });
  it("R32 ve DoD'nin değişen ekran listesi Karar 47'nin ölçümünü anar (-bekleyen ve -kopuk 0 piksel)", () => {
    const satirlar = sp().split("\n");
    const r32 = satirlar.find(l => l.startsWith("- **R32.**"));
    const dod = satirlar.find(l => l.startsWith("- [") && l.includes("Görsel kanıt alındı; değişen ekranlar"));
    for (const [ad, l] of [["R32", r32], ["DoD", dod]]) expect(l, ad).toMatch(/Karar 47 ile ölçüldü:.*-bekleyen.*-kopuk.*0 piksel/);
    const esleme = Object.values(JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar).flat().filter(x => /\/0117-/.test(x.rapor));
    for (const e of ["uretim-formu-0115-bekleyen", "uretim-formu-0115-kopuk"]) expect(esleme.find(x => x.ekran === e)?.beklenen, e).toBe("ayni");
  });
});

// Kapanış belge düzeni (plan Ö6: 0117 bölümü CLAUDE.md'de 0116'nın önünde, dilim 0116 başlığında biter).
describe("Spec 0117: kapanış belge düzeni (AC-57)", () => {
  it("plan done'daysa: 'Tamamlandı: commit', TASINACAK'ta 0117 yok, eski kopya yok, README Tamamlandı, kanıt ayni", () => {
    if (!existsSync("specs/done/0117-uygulama-plani.md")) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0117, plan"), claude.indexOf("(spec 0116, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(bolum).not.toMatch(/specs\/0117-/);
    expect(oku("tests/spec-atiflari.test.js")).not.toMatch(/TASINACAK = \[[^\]]*0117/);
    expect(existsSync("specs/0117-tamir-edilen-kalibin-sevki.md")).toBe(false);
    expect(oku("specs/README.md")).toMatch(/\| \*\*0117\*\* \| [^|]*\(Tamamlandı\)/);
    const k = Object.values(JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar).flat().filter(x => /\/0117-/.test(x.rapor));
    expect(k.filter(x => x.beklenen === "degisti" || x.onay)).toEqual([]);
  });
});
