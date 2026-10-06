// Belgelerdeki `specs/done/<dosya>.md` atıfları gerçek dosyaya çıkmalı (triyaj, spec 0020 bulgu 2). Uygulaması biten ama
// henüz done'a taşınmamış spec'in atıfları TASINACAK listesinde durur: dosya o sırada `specs/` altında olmalı. Spec done'a
// taşınınca liste kendiliğinden bayatlar ve test kırılır; listeden çıkarmak taşımanın unutulmadığının kanıtıdır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const KOK = path.join(__dirname, "..");
const TASINACAK = ["0073-kasa-hareketlerinin-duzenlenmesi.md", "0073-uygulama-plani.md"];

const gez = (d) => readdirSync(path.join(KOK, d)).flatMap(ad => {
  const f = path.join(d, ad);
  return statSync(path.join(KOK, f)).isDirectory() ? gez(f) : ad.endsWith(".md") ? [f] : [];
});
const BELGELER = ["CLAUDE.md", ...gez("specs"), ...gez("docs")];
const atiflar = () => {
  const m = new Map();
  for (const f of BELGELER) {
    for (const [, ad] of readFileSync(path.join(KOK, f), "utf-8").matchAll(/specs\/done\/([A-Za-z0-9._-]+\.md)/g)) {
      if (!m.has(ad)) m.set(ad, new Set());
      m.get(ad).add(f);
    }
  }
  return m;
};

describe("specs/done atıfları", () => {
  it("her atıf done'da bir dosyaya çıkar; taşınmayı bekleyenler specs/ altında durur", () => {
    const kirik = [...atiflar()].filter(([ad]) => !existsSync(path.join(KOK, "specs/done", ad))
      && !(TASINACAK.includes(ad) && existsSync(path.join(KOK, "specs", ad))))
      .map(([ad, f]) => `${ad} (${[...f].join(", ")})`);
    expect(kirik).toEqual([]);
  });
  it("TASINACAK listesi bayat değil: listedekiler henüz specs/ altında (done'a taşınınca listeden çıkarın)", () => {
    for (const ad of TASINACAK) expect(existsSync(path.join(KOK, "specs", ad)), ad).toBe(true);
  });
});
