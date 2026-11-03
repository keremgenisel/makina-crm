// Spec 0128: kilit tamamlama, kaynak taramaları (red metni, kaskad, tek kanca, dokunulmayanlar).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { grupKimlikleri } from "../src/lib/utils";

const oku = (f) => readFileSync(f, "utf-8");
const kod = (f) => oku(f).split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
const dosyalar = (k) => readdirSync(k).flatMap(a => { const p = path.join(k, a); return statSync(p).isDirectory() ? dosyalar(p) : /\.(jsx?|mjs)$/.test(a) ? [p] : []; });
const BILESEN = dosyalar("src/components").map(f => f.split(path.sep).join("/"));

describe("Spec 0128: red metni tek yerde (R4, R4/2, C5)", () => {
  it("AC-19: src/components'ta locked_by yalnız TAMIR_KILITLI istisnasında; panonun yerel kilitReddet'i ve 'taşınamadı' yok", () => {
    const yerler = BILESEN.flatMap(f => kod(f).split("\n").filter(l => l.includes("locked_by")).map(l => `${f}: ${l.trim()}`));
    expect(yerler).toEqual(["src/components/ServisPanosu.jsx: if (k) { showToast(TAMIR_KILITLI(k.locked_by), \"err\"); return; }"]);
    expect(BILESEN.filter(f => oku(f).includes("taşınamadı"))).toEqual([]);
    expect(kod("src/components/ServisPanosu.jsx")).not.toMatch(/const kilitReddet\b/);
    // Tek red metni kancanın kilitliIse'inden (kilitRedMesaji) geçer.
    expect(kod("src/hooks/useKilitListesi.js")).toMatch(/kilitRedMesaji\(k, ad \|\| undefined\)/);
    expect(oku("src/lib/kalipTamiri.js")).toMatch(/export const TAMIR_KILITLI = /);
  });
});

describe("Spec 0128: tek kanca ve tek grup yardımcısı (C2, Karar 20)", () => {
  it("ekranlar kendi kilit listesini çekmez; grup kimliği yardımcısı tek tanım", () => {
    // Tek istisna: geri yükleme ön denetimi bütün kilitleri devralmak için listeyi okur (spec 0064 R11–R13), anlık denetim değildir.
    expect(BILESEN.filter(f => /crmLocks\.list\(/.test(kod(f)))).toEqual(["src/components/settings/SettingsBackup.jsx"]);
    expect(BILESEN.filter(f => /const grupIdleri\b/.test(kod(f)))).toEqual([]);
    expect(grupKimlikleri([{ id: 1, batchId: 9 }, { id: 2, batchId: 9 }, { id: 3 }], 2)).toEqual([1, 2]);
    expect(grupKimlikleri([{ id: 3 }], 3)).toEqual([3]);
    expect(grupKimlikleri([], 7)).toEqual([7]);
  });
});

describe("Spec 0128: kaskad denetimi (R3, R3/2)", () => {
  it("AC-20: müşteri kaskadı yedek parça ve Extra Kalıp kilidine (partileriyle) bakar, bayi kaskadı yedek parçaya; customer çocuklarına ikinci denetim yok", () => {
    const c = kod("src/components/Customers.jsx");
    expect(c).toMatch(/kilitliIse\("customer", confirmId/);
    expect(c).toMatch(/kilitliIse\("yedek_parca", ypIdleri/);
    expect(c).toMatch(/kilitliIse\("part_sale", psIdleri/);
    expect(c).toMatch(/grupKimlikleri\(yedekParcaSatislar, s\.id\)/);
    expect(c.match(/kilitliIse\(/g)).toHaveLength(3);
    const d = kod("src/components/SimpleDealers.jsx");
    expect(d).toMatch(/kilitliIse\("dealer", confirmId/);
    expect(d).toMatch(/kilitliIse\("yedek_parca", ypIdleri/);
    expect(d.match(/kilitliIse\(/g)).toHaveLength(2);
  });
});

describe("Spec 0128: dokunulmayanlar (C1, C3, AC-17, AC-26)", () => {
  it("AC-17 / AC-26: veri şeması, izin, sunucu, birleştirme ve kanıt eşlemesi işi anmaz", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/permissions.js",
      "src/components/settings/serverPermissionDefs.js", "docs/evidence/kanit-eslemesi.json", "scripts/evidence/0009-sayfa.jsx"]) {
      expect(oku(f), f).not.toMatch(/spec 0128|kilitliIse|grupKimlikleri/);
    }
  });
  it("C1: kanca kilit okunamazsa ya da köprü yoksa engellemez (fail-open)", () => {
    const k = kod("src/hooks/useKilitListesi.js");
    expect(k).toMatch(/if \(!window\.crmLocks\?\.list\) return;/);
    expect(k).toMatch(/\.catch\(\(\) => \{\}\)/);
  });
});
