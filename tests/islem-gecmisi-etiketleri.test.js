// Spec 0068 R1, R2, R23 (AC-1…AC-4, AC-34, AC-40): İşlem Geçmişi'nin etiket haritaları kaynakta kullanılan her kayıt türünü
// ve eylemi kapsar. Test TEK YÖNLÜ ve kümeye bağlı: kaynakta kullanılan her ad haritada olmalı; haritada fazlası zararsız.
// Kaynak: istemcinin logAction({…}) çağrıları ve sunucunun writeAuditEntry({…}) çağrıları (kullanıcı geçmişinin eylemleri
// ayrı haritadır, X5). Üçlü ifadedeki karşılaştırma değerleri (=== "mahsup" gibi) eylem sayılmaz.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { regexKacis } from "./yardimci/regexKacis.js";

const kok = resolve(__dirname, "..");
const oku = (f) => readFileSync(resolve(kok, f), "utf-8");
const tara = (d) => readdirSync(resolve(kok, d), { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? tara(`${d}/${e.name}`) : /\.jsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));

// Bilinen dinamik yerler ve aldıkları değerler. Yeni bir dinamik yer eklenirse test onu adıyla ister.
const DINAMIK = {
  "src/components/Documents.jsx|entity|logEntity": ["teklif", "proforma"],
  "src/components/settings/SettingsSahipsiz.jsx|entity|TUR_AUDIT[tur]": null, // değerleri TUR_AUDIT haritasından
  "src/components/settings/SettingsAuditLog.jsx|entity|onizle.row.entity": [], // var olan kaydın türünü aynen taşır
};

export const kullanilanAdlar = () => {
  const ent = new Set(), act = new Set(), dinamik = new Set();
  const topla = (blok, f) => {
    for (const [alan, hedef] of [["entity", ent], ["action", act]]) {
      for (const m of blok.matchAll(new RegExp(`\\b${regexKacis(alan)}:\\s*([^,}\\n]+)`, "g"))) {
        const ifade = m[1].replace(/(===|!==)\s*"[^"]*"/g, "");
        const sabitler = [...ifade.matchAll(/"([a-z0-9_]+)"/g)].map(x => x[1]);
        if (sabitler.length) sabitler.forEach(x => hedef.add(x));
        else dinamik.add(`${f}|${alan}|${m[1].trim()}`);
      }
    }
  };
  const bloklar = (s, cagri, f) => {
    let i = 0;
    while ((i = s.indexOf(cagri, i)) !== -1) { const j = s.indexOf("})", i); topla(s.slice(i + cagri.length, j + 2), f); i = j; }
  };
  for (const f of tara("src")) { const s = oku(f); if (s.includes("logAction(")) bloklar(s, "logAction(", f); }
  bloklar(oku("electron/server.cjs"), "writeAuditEntry(", "electron/server.cjs");
  return { ent, act, dinamik };
};
const harita = (ad) => {
  const s = oku("src/components/settings/SettingsAuditLog.jsx");
  const i = s.indexOf(`const ${ad} = {`), j = s.indexOf("};", i);
  return new Set([...s.slice(i, j).matchAll(/\b([a-z0-9_]+):/g)].map(m => m[1]));
};
const turAudit = () => {
  const s = oku("src/components/settings/SettingsSahipsiz.jsx");
  return [...s.match(/const TUR_AUDIT = \{([^}]*)\}/)[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]);
};

describe("Spec 0068: İşlem Geçmişi etiket kapsamı", () => {
  const { ent, act, dinamik } = kullanilanAdlar();
  it("AC-40: dinamik yerler bilinen listede; değerleri kapsama eklenir", () => {
    expect([...dinamik].sort()).toEqual(Object.keys(DINAMIK).sort());
    for (const [k, v] of Object.entries(DINAMIK)) (v || turAudit()).forEach(x => k.includes("|entity|") ? ent.add(x) : act.add(x));
  });
  it("AC-1 / AC-2 / AC-34: kaynakta kullanılan her kayıt türünün etiketi var (üretim partisi dahil)", () => {
    expect(ent.has("uretim_partisi")).toBe(true);
    expect([...ent].filter(x => !harita("ENTITY_LABELS").has(x))).toEqual([]);
  });
  it("AC-3 / AC-40: kaynakta kullanılan her eylemin etiketi var; karşılaştırma değerleri (mahsup, verilen) eylem sayılmaz", () => {
    expect(act.has("mahsup")).toBe(false);
    expect(act.has("mahsup_edildi")).toBe(true);
    expect([...act].filter(x => !harita("ACTION_LABELS").has(x))).toEqual([]);
  });
  it("AC-4: etiketi olmayan yeni bir tür eklenirse kapsam testi kırılır (aynı denetim sahte bir türle)", () => {
    const sahte = new Set([...ent, "yeni_bolum_0068"]);
    expect([...sahte].filter(x => !harita("ENTITY_LABELS").has(x))).toEqual(["yeni_bolum_0068"]);
  });
});
