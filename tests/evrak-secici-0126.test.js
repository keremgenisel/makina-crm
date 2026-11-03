// Spec 0126: Evrak kalem seçicileri; yazdırma ve CRM'e Kaydet değişmez, kaynak taramaları.
import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildPrintHtml } from "../src/lib/printTemplates";
import { teklifUretimPlani } from "../src/lib/evrakUretim";
import { evrakAdimlariniYaz } from "../src/lib/evrakUygula";

const kod = (f) => readFileSync(f, "utf8");
const yorumsuz = (f) => kod(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const DOC = "src/components/Documents.jsx";
const PEN = "src/components/documents/KalemSecPenceresi.jsx";

const SET = { id: 8, ad: "Bıçak Seti", kod: "BS-1", setIcerigi: [{ partId: 7, miktar: 2 }, { partId: 9, miktar: 1 }] };
const PARTS = [{ id: 7, ad: "Rulman Bileşeni" }, SET, { id: 9, ad: "Bıçak Bileşeni" }];
const setSatiri = { rowId: "r1", pickTip: "parca", selectedModel: "", selectedKalip: "", selectedPart: "8",
  subItems: [{ id: "p1", type: "parca", kod: "BS-1", makinaAdi: "Bıçak Seti", tanim: "", miktar: "2", birimFiyat: "1.250", tlKarsiligi: "" }] };
const teklif = { id: 900, no: "2026-00001", type: "teklif", durum: "onaylandi", dil: "TR", currency: "TRY", iskonto: "", tarih: "2026-09-24",
  firma: "Kutu Gıda", customerId: 500, satirlar: [setSatiri] };

describe("Spec 0126: çıktı ve kayıt yolu değişmez", () => {
  it("AC-8: yazdırma çıktısında set tek kalemdir, içerik basılmaz", () => {
    const html = buildPrintHtml(teklif, { name: "Altuntaş" });
    expect(html).toContain("Bıçak Seti");
    expect(html).not.toContain("Rulman Bileşeni");
    expect(html).not.toContain("Bıçak Bileşeni");
    expect(html).not.toMatch(/SET · \d+ bileşen|Set · \d+ bileşen/);
    expect(kod("src/lib/printTemplates.js")).not.toMatch(/setIcerigi|SetIcerik|setEtiketEki/);
  });

  it("AC-9: CRM'e Kaydet set satırından tek yedek parça satışı üretir ve stoktan setin kendi adedi düşer", () => {
    const plan = teklifUretimPlani(teklif, { parts: PARTS, customers: [{ id: 500, name: "Kutu Gıda" }], dealers: [], factoryName: "Altuntaş" });
    expect(plan.yedekParcaKayitlari).toHaveLength(1);
    const durum = { yedekParcaSatislar: [], partSales: [], customers: [{ id: 500, name: "Kutu Gıda" }],
      partStock: [{ id: 1, partId: "8", miktar: 5 }, { id: 2, partId: "7", miktar: 10 }, { id: 3, partId: "9", miktar: 10 }], partStockLog: [] };
    const set = (k) => vi.fn(u => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
    evrakAdimlariniYaz(teklif, plan, null, { setYedekParcaSatislar: set("yedekParcaSatislar"), setPartStock: set("partStock"), setPartStockLog: set("partStockLog"),
      get partStock() { return durum.partStock; }, setPartSales: set("partSales"), setCustomers: set("customers"), bugun: "2026-09-24" });
    expect(durum.yedekParcaSatislar).toHaveLength(1);
    expect(durum.yedekParcaSatislar[0]).toMatchObject({ partId: "8", miktar: 2 });
    expect(Object.fromEntries(durum.partStock.map(s => [s.partId, s.miktar]))).toEqual({ 8: 3, 7: 10, 9: 10 });
    expect(durum.partStockLog).toEqual([expect.objectContaining({ partId: "8", miktar: -2 })]);
  });
});

describe("Spec 0126: kaynak taramaları", () => {
  it("AC-10: pencere tek bileşen, Documents iki tür için onu çağırır; Documents'ta doğrudan SearchPick yok; içerik satırı var olan bileşenden", () => {
    const tanimlar = [];
    const gez = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) gez(p); else if (/\.jsx?$/.test(f) && /export const KalemSecPenceresi\b/.test(kod(p))) tanimlar.push(p); } };
    gez("src");
    expect(tanimlar).toEqual([PEN]);
    const d = yorumsuz(DOC);
    expect(d.match(/<KalemSecPenceresi\b/g)).toHaveLength(2);
    expect(d).not.toMatch(/<SearchPick\b/);
    expect(d).toMatch(/import \{ SetIcerikSatiri, setEtiketEki, PARCA_YER_TUTUCU \} from "\.\/stock\/SetRozeti"/);
    expect(d).toMatch(/<SetIcerikSatiri part=\{secili\} parts=\{parts\} \/>/);
    // Evrak kendi içerik çözümünü yazmaz: setin içeriğini okumaz, başlık ve ibareyi yazmaz.
    expect(d).not.toMatch(/setIcerigi|setIcerikSatiri\(|bileşen"|listede olmayan parça"\)/);
    expect(yorumsuz(PEN)).toMatch(/<SearchPick\b/);
    // Triyaj: yer tutucu metni Documents'ta düz yazılmaz, SetRozeti üzerinden urunAgaci'dan gelir.
    expect(d).not.toMatch(/listede olmayan parça/);
    expect(d).toMatch(/item\?\.makinaAdi \|\| PARCA_YER_TUTUCU/);
  });

  it("AC-11: ui.jsx'in SearchPick ve Modal imzaları, belge alan listeleri değişmedi; izin ve sunucu dosyaları işi anmaz", () => {
    const ui = kod("src/components/ui.jsx");
    expect(ui).toContain('export const SearchPick = ({ items, onPick, getLabel = (x) => String(x), getKey = (x) => getLabel(x), placeholder = "Ara...", emptyText = "Bulunamadı." }) => {');
    expect(ui).toContain("export const Modal = ({ title, onClose, children, footer, wide, maxWidth, maxHeight, overflowVisible }) => {");
    expect(ui).toMatch(/\{getLabel\(it\)\}/);
    const d = kod(DOC);
    expect(d).toContain('const teklif_keys = ["no", "tarih", "dil", "currency", "kdvOrani", "gtipNo", "modelYiliDegeri", "kur"];');
    expect(d).toContain('const proforma_keys = ["no", "tarih", "dil", "currency", "kdvOrani", "gtipNo", "modelYiliDegeri", "kur", "teslimYeri", "not", "ek"];');
    for (const f of ["src/lib/permissions.js", "src/components/settings/serverPermissionDefs.js", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "electron/db.cjs"]) {
      expect(kod(f), f).not.toMatch(/KalemSecPenceresi|setEtiketEki|spec 0126/);
    }
  });

  it("AC-12: pencere footer'sız, overflowVisible, maxWidth 600, wide değil; SearchPick gövdenin tek öğesi", () => {
    const p = yorumsuz(PEN);
    const modal = p.match(/<Modal\b[^>]*>/)[0];
    expect(modal).toMatch(/\boverflowVisible\b/);
    expect(modal).toMatch(/maxWidth=\{600\}/);
    expect(modal).not.toMatch(/\bfooter\b|\bwide\b/);
    expect(p).toMatch(/<Modal\b[^>]*>\s*<div ref=\{kap\} data-testid="kalem-sec-penceresi">\s*<SearchPick\b[\s\S]*?\/>\s*<\/div>\s*<\/Modal>/);
  });

  it("AC-21: set eki SetRozeti'nden; Documents ve pencere urunAgaci adını anmaz (0087 AC-6); parça etiketi ad · kod", () => {
    for (const f of [DOC, PEN]) expect(kod(f), f).not.toMatch(/urunAgaci/);
    expect(kod("src/components/stock/SetRozeti.jsx")).toMatch(/export const setEtiketEki = \(part\) =>/);
    expect(yorumsuz(DOC)).toContain('getLabel={p => `${p.ad || ""}${p.kod ? " · " + p.kod : ""}${setEtiketEki(p)}`}');
  });

  it("R3/6: belge formunun kapatma işleyicisi seçim penceresi açıkken çalışmaz", () => {
    expect(yorumsuz(DOC)).toContain("onClose={() => { if (secim) return; setForm(null); }}");
  });
});
