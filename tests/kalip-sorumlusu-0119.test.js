// Spec 0119: panodaki kalıbı gönderen kişi. Saf yazıcı, metin sabiti, kaynak taramaları (tek yazıcı, ad tuzağı, hook yok,
// tek kap, izin bölümü), etiket haritası, kanıt aracı ve kapanış belge düzeni.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { sevkSorumluYaz, SEVK_SORUMLU_SORUSU, SEVK_ALANLARI } from "../src/lib/kalipTamiri";

const oku = (f) => readFileSync(f, "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const PANO = "src/components/ServisPanosu.jsx";
const pano = () => yorumsuz(oku(PANO));
// Kart dilimi (plan Ö5): `  const Kart = ` satırından aynı girintideki bir sonraki `  const ` ya da `  return (` satırına kadar.
const kartDilimi = () => {
  const s = oku(PANO);
  const bas = s.indexOf("  const Kart = ");
  const kalan = s.slice(bas + 1);
  const m = /\n {2}(const |return \()/.exec(kalan);
  return s.slice(bas, bas + 1 + m.index);
};

describe("Spec 0119 B: saf yazıcı", () => {
  const SV = { id: 1, durum: "Tamamlandı", atolyeKaliplari: [{ id: 1, ad: "K", olcu: "" }], kalipKargoFirma: "Aras", kalipKargoTakipNo: "T", kalipKargoTarih: "2026-10-26", kalipFabrikaTeslim: true };
  it("AC-14: kırpar ve yazar; boşta (boşluk dahil) anahtarı siler; girdiyi değiştirmez", () => {
    expect(sevkSorumluYaz(SV, "  Ayşe  ").kalipKargoSorumlusu).toBe("Ayşe");
    const dolu = { ...SV, kalipKargoSorumlusu: "Ayşe" };
    for (const v of ["", "   ", null, undefined]) expect("kalipKargoSorumlusu" in sevkSorumluYaz(dolu, v)).toBe(false);
    expect(dolu.kalipKargoSorumlusu).toBe("Ayşe");
  });
  it("AC-13: öteki sevk alanlarına ve kalıp listesine dokunmaz", () => {
    const k = sevkSorumluYaz(SV, "Ayşe");
    for (const a of [...SEVK_ALANLARI.filter(a => a !== "kalipKargoSorumlusu"), "atolyeKaliplari", "durum", "id"]) expect(k[a]).toEqual(SV[a]);
  });
  it("AC-38: kutu kapısı yok; kalıp listesi boş kayıtta da yazar", () => {
    expect(sevkSorumluYaz({ id: 2 }, "Ayşe").kalipKargoSorumlusu).toBe("Ayşe");
    expect(sevkSorumluYaz({ id: 2, atolyeKaliplari: [] }, "Ayşe").kalipKargoSorumlusu).toBe("Ayşe");
    const govde = oku("src/lib/kalipTamiri.js").split("export const sevkSorumluYaz")[1].split("\nexport ")[0];
    expect(govde).not.toMatch(/kutuAcikMi|_kalipAtolye|tamirListesi/);
  });
  it("AC-8: boş seçeneğin metni tek sabit; src/components'te düz metin yok", () => {
    expect(SEVK_SORUMLU_SORUSU).toBe("Kalıbı kim veriyor?");
    expect(pano()).toContain("{SEVK_SORUMLU_SORUSU}");
    for (const f of ["ServisPanosu.jsx", "KargoPanosu.jsx", "KalipAtolyeAlani.jsx", "ServiceForm.jsx"]) expect(oku(`src/components/${f}`)).not.toContain("Kalıbı kim veriyor?");
  });
});

describe("Spec 0119: kaynak taramaları", () => {
  it("AC-7: kalıp ölçütü kalipAtolyedeMi'den; panoda ikinci ölçüt yok", () => {
    expect(pano()).toMatch(/const sevkSatiri = tamamlandi && kalipAtolyedeMi\(sv\);/);
    expect(pano()).not.toMatch(/atolyeKaliplari\s*(\?\.)?\s*\.length/);
  });
  it("AC-16 (plan Ö2): panoda kalipKargoSorumlusu yalnız dört izinli biçimde; öteki dört sevk alanı hiç yok", () => {
    const s = pano();
    const toplam = (s.match(/kalipKargoSorumlusu/g) || []).length;
    const izinli = [
      /sv\.kalipKargoSorumlusu/g,
      /sevkSorumluDegistir = \(id, kalipKargoSorumlusu\)/g,
      /sevkSorumluYaz\(s, kalipKargoSorumlusu\)/g,
      /auditServis\("kalip_sorumlu_degisti", id, \{ kalipKargoSorumlusu \}\)/g,
    ].reduce((n, d) => n + (s.match(d) || []).length, 0);
    expect(izinli).toBe(toplam);
    expect(s).not.toMatch(/\.\.\.\s*s\s*,\s*kalipKargoSorumlusu/);
    for (const a of ["kalipFabrikaTeslim", "kalipKargoFirma", "kalipKargoTakipNo", "kalipKargoTarih"]) expect(s, a).not.toContain(a);
  });
  it("AC-23, AC-43: Kart diliminde hook yok", () => {
    const d = kartDilimi();
    expect(d).toContain("sevkSatiri");
    expect(d.match(/\buse[A-Z]/g)).toBeNull();
  });
  it("AC-33: koruma tek dış kapta; ikinci satır korumayı kopyalamaz", () => {
    const d = kartDilimi();
    expect((d.match(/onMouseEnter=\{\(\) => setDragKapaliId\(sv\.id\)\}/g) || []).length).toBe(1);
    expect((d.match(/onClick=\{e => e\.stopPropagation\(\)\}/g) || []).length).toBe(2); // arşiv dalı + dış kap
    const satir = d.slice(d.indexOf('data-testid="sevk-sorumlu-satiri"'));
    expect(satir.slice(0, satir.indexOf("</div>"))).not.toMatch(/onMouse|stopPropagation|borderTop/);
  });
  it("AC-36: seçicinin disabled'ı yalnız izne bakar; setServices işleyicide", () => {
    const s = pano();
    expect(s).toMatch(/aria-label="Kalıbı gönderen kişi" value=\{sv\.kalipKargoSorumlusu \|\| ""\} disabled=\{!canDo\("cust_service_edit"\)\}/);
    expect(s).toMatch(/const sevkSorumluDegistir = \(id, kalipKargoSorumlusu\) => \{\s*if \(!setServices \|\| !canDo\("cust_service_edit"\)\) return;/);
  });
  it("AC-41: işleyicinin adı sevkSorumluDegistir; kalipSorumluDegistir Extra Kalıp kargosunu yazmaya devam eder", () => {
    const s = pano();
    expect(s).toContain("onChange={e => sevkSorumluDegistir(sv.id, e.target.value)}");
    const govde = s.split("const kalipSorumluDegistir = ")[1].split("\n  };")[0];
    expect(govde).toContain("setPartSales(");
    expect(govde).not.toContain("setServices(");
  });
  it("AC-48: liste tekAdlari'nı yeniden kullanır; ikinci çalışan okuması yok", () => {
    const s = pano();
    expect((s.match(/\bcalisanlar\.(map|filter|find)\(/g) || []).length).toBe(1);
    expect(s).toMatch(/const sevkListe = [^\n]*tekAdlari/);
  });
  it("AC-26: sorumlu_degisti eylemi ve kargo işleyicileri değişmedi", () => {
    const s = pano();
    expect(s).toMatch(/const kargoSorumluDegistir = [\s\S]*?setYedekParcaSatislar\(/);
    expect((s.match(/"sorumlu_degisti"/g) || []).length).toBe(2);
    expect(oku("src/components/settings/SettingsAuditLog.jsx")).toContain('sorumlu_degisti: "Kargo Sorumlusu Değişti"');
  });
  it("AC-27: pano teslim şekli adlarını anmaz (0117 C12)", () => {
    for (const ad of ["kalipFabrikaTeslim", "sevkTeslimSekli", "sevkFabrikaTeslimMi"]) expect(pano()).not.toContain(ad);
  });
  it("AC-29: veri, sunucu ve izin tarafında yeni ad yok; ALAN_IZINLERI.services yalnız durum", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "src/components/settings/serverPermissionDefs.js", "src/lib/merge.js"]) {
      expect(oku(f), f).not.toMatch(/sevkSorumlu|kalip_sorumlu/);
    }
    expect(oku("electron/serverAuth.cjs")).toMatch(/services:\s*\[\{ alan: "durum",[^\]]*\}\],/);
  });
});

describe("Spec 0119 C: iz", () => {
  it("AC-25, AC-40: ACTION_LABELS'ta kalip_sorumlu_degisti birebir", () => {
    expect(oku("src/components/settings/SettingsAuditLog.jsx")).toContain('kalip_sorumlu_degisti: "Kalıp Sorumlusu Değişti"');
  });
});

describe("Spec 0119 E: kanıt ve belge", () => {
  it("AC-44: yeni ekran araçta, verisi yerel; 0115 fikstürü sevk sorumlusu taşımaz", () => {
    const a = oku("scripts/evidence/0009-sayfa.jsx");
    expect(a).toContain('"servis-pano-0119-sorumlu": [pano0115({ ilk: SERVIS_0119 }), []]');
    expect(a).toMatch(/const SERVIS_0119 = SERVIS_0115\.map/);
    expect(oku("tests/fixtures/0115-veri.js")).not.toContain("kalipKargoSorumlusu");
  });
  it("AC-46: 0117 AC-55'in testi ve metni 'spec 0119 ile' notlu", () => {
    expect(oku("tests/ui/kalip-sevki-0117.test.jsx")).toMatch(/it\("AC-55 \(C12\)[^"]*spec 0119 ile/);
    expect(oku("specs/done/0117-tamir-edilen-kalibin-sevki.md")).toMatch(/\*\*AC-55\.\*\*[^\n]*spec 0119 ile/);
  });
});

// Kapanış belge düzeni (0118 deseni, spec 0119 R19: 0119 bölümü CLAUDE.md'de 0118'in önünde, dilim 0118 başlığında biter).
describe("Spec 0119: kapanış belge düzeni (AC-49)", () => {
  it("plan done'daysa: 'Tamamlandı: commit', eski kopya yok, README Tamamlandı", () => {
    if (!existsSync("specs/done/0119-uygulama-plani.md")) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0119, plan"), claude.indexOf("(spec 0118, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(bolum).not.toMatch(/specs\/0119-/);
    expect(existsSync("specs/0119-pano-kartinda-kalibi-gonderen-kisi.md")).toBe(false);
    expect(oku("specs/README.md")).toMatch(/\| \*\*0119\*\* \| [^|]*\(Tamamlandı\)/);
  });
});
