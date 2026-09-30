// Spec 0011 R2, AC-11b / AC-11c: docs/evidence/kanit-eslemesi.json'daki "degisti" (bilinçli görünüm değişikliği) kayıtlarının
// kuralları. Temel eşleme kuralı (kullanan her dosyanın kaydı, ekranın raporda çizilmiş olması) tasarim-kaynak.test.js'te.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const kok = path.join(__dirname, "..");
const { dosyalar } = JSON.parse(readFileSync(path.join(kok, "docs/evidence/kanit-eslemesi.json"), "utf-8"));
const doneSpecNolari = new Set(readdirSync(path.join(kok, "specs/done")).map(f => f.match(/^(\d{4})-/)?.[1]).filter(Boolean));

// AC-11b biçimi: "Takım Yöneticisi · YYYY-AA-GG · spec <no> <madde>"
const ONAY = /^Takım Yöneticisi · (\d{4})-(\d{2})-(\d{2}) · spec (\d{4}) (\S.*)$/;
const gecerliTarih = (y, a, g) => { const d = new Date(Date.UTC(+y, +a - 1, +g)); return d.getUTCFullYear() === +y && d.getUTCMonth() === +a - 1 && d.getUTCDate() === +g; };

// Tek kaydın kuralları; hata listesi döner (boş = geçerli). Gerçek veri ve örnek kayıtlar aynı fonksiyondan geçer.
const kayitHatalari = (k, done = doneSpecNolari) => {
  const h = [];
  const beklenen = k.beklenen ?? "ayni";
  if (!["ayni", "degisti"].includes(beklenen)) h.push(`beklenen tanımsız: ${beklenen}`);
  if (beklenen !== "degisti") return h;
  const m = typeof k.onay === "string" ? k.onay.match(ONAY) : null;
  if (!m) { h.push(`onay biçimi AC-11b'ye uymuyor: ${k.onay}`); return h; }
  const [, y, a, g, specNo] = m;
  if (!gecerliTarih(y, a, g)) h.push(`onay tarihi geçersiz: ${y}-${a}-${g}`);
  if (done.has(specNo)) h.push(`spec ${specNo} specs/done'da; 'degisti' kaydı 'ayni'ye çevrilmeliydi (AC-11c)`);
  return h;
};

describe("kanıt eşlemesindeki 'degisti' kayıtları", () => {
  const kayitlar = Object.entries(dosyalar).flatMap(([dosya, l]) => l.map(k => ({ dosya, ...k })));
  it("AC-11b / AC-11c: eşlemedeki her kayıt kurallara uyar", () => {
    const hatalar = kayitlar.flatMap(k => kayitHatalari(k).map(h => `${k.dosya} · ${k.ekran}: ${h}`));
    expect(hatalar).toEqual([]);
  });

  describe("kural örnekleri (eşlemede bugün 'degisti' kaydı olmasa da kural sınanır)", () => {
    const k = (onay, o = {}) => ({ ekran: "musteriler-liste", beklenen: "degisti", onay, ...o });
    it("AC-11b: onay metni 'Takım Yöneticisi · <YYYY-AA-GG> · spec <no> <madde>' biçimindedir", () => {
      expect(kayitHatalari(k("Takım Yöneticisi · 2026-09-24 · spec 0010 AC-12"), new Set())).toEqual([]);
      for (const yanlis of [undefined, "", "tamam", "Analist · 2026-09-24 · spec 0010 AC-12", "Takım Yöneticisi · 24.09.2026 · spec 0010 AC-12",
        "Takım Yöneticisi · 2026-09-24 · spec 10 AC-12", "Takım Yöneticisi · 2026-09-24 · spec 0010", "Takım Yöneticisi - 2026-09-24 - spec 0010 AC-12"]) {
        expect(kayitHatalari(k(yanlis), new Set()).length, String(yanlis)).toBeGreaterThan(0);
      }
      expect(kayitHatalari(k("Takım Yöneticisi · 2026-02-30 · spec 0010 AC-12"), new Set())).toEqual(["onay tarihi geçersiz: 2026-02-30"]);
    });
    it("AC-11c: spec'i specs/done'a taşınmış bir 'degisti' kaydı kalamaz; 'ayni' kaydı onay istemez", () => {
      expect(kayitHatalari(k("Takım Yöneticisi · 2026-09-24 · spec 0010 AC-12"), new Set(["0010"]))[0]).toMatch(/AC-11c/);
      expect(kayitHatalari({ ekran: "x", beklenen: "ayni" }, new Set(["0010"]))).toEqual([]);
      expect(kayitHatalari({ ekran: "x" }, new Set(["0010"]))).toEqual([]);
      expect(kayitHatalari({ ekran: "x", beklenen: "farkli" })).toEqual(["beklenen tanımsız: farkli"]);
    });
    it("specs/done klasörü okunuyor (AC-11c denetimi boşa çalışmıyor)", () => {
      expect(doneSpecNolari.has("0009")).toBe(true);
    });
  });
});
