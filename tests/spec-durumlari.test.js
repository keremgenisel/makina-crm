// Triyaj (spec 0080 bulgu 4; 0079 denetiminde de görüldü): spec'lerin durum satırları uygulamanın gerisinde kalıyordu.
// İki kural: (1) specs/done'daki spec'in README tablo satırı "Tamamlandı" der; (2) uygulama planı yazılmış ama henüz done'a
// taşınmamış spec ne kendi başlığında ne README'de "Taslak" der. Kapsam 0070 ve sonrası: daha eski satırların durum
// metinleri (0006–0058) bu triyajın dışında bırakıldı, onları düzeltmek ayrı iştir; eşik düşürülürse test onları da ister.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const KOK = path.join(__dirname, "..");
const ESIK = 70;
const README = readFileSync(path.join(KOK, "specs/README.md"), "utf-8");
const satirDurumu = (no) => (README.match(new RegExp(`^\\| \\*\\*${no}\\*\\* \\| ([^|]*)\\|`, "m")) || [])[1] || null;
const numaralar = (d) => [...new Set(readdirSync(path.join(KOK, d)).map(a => /^(\d{4})-/.exec(a)?.[1]).filter(Boolean))]
  .filter(no => Number(no) >= ESIK);

describe("Spec durum satırları (0070 ve sonrası)", () => {
  it("specs/done'daki her spec README'de \"Tamamlandı\" der", () => {
    const yanlis = numaralar("specs/done").filter(no => !/Tamamlandı/.test(satirDurumu(no) || ""));
    expect(yanlis).toEqual([]);
  });
  // Triyaj (spec 0085 bulgu 3): README tablosuna spec dosyası commitlenmeden satır eklenince README olmayan bir spec'e atıf
  // yapıyordu (0086 satırı, dosyası izlenmiyordu). CI yalnız izlenen dosyaları gördüğü için orada kırılır.
  it("README tablosundaki her satırın spec dosyası specs/ ya da specs/done altında var", () => {
    const satirlar = [...README.matchAll(/^\| \*\*(\d{4})\*\* \|/gm)].map(m => m[1]).filter(no => Number(no) >= ESIK);
    const dosyali = new Set([...numaralar("specs"), ...numaralar("specs/done")]);
    expect(satirlar.length).toBeGreaterThan(10);
    expect(satirlar.filter(no => !dosyali.has(no))).toEqual([]);
  });
  it("planı yazılmış, done'a taşınmamış spec ne başlıkta ne README'de \"Taslak\" der", () => {
    const yanlis = [];
    for (const no of numaralar("specs")) {
      if (!existsSync(path.join(KOK, "specs", `${no}-uygulama-plani.md`))) continue;
      const spec = readdirSync(path.join(KOK, "specs")).find(a => a.startsWith(`${no}-`) && !a.endsWith("-uygulama-plani.md"));
      const durum = (readFileSync(path.join(KOK, "specs", spec), "utf-8").match(/^\| \*\*Durum\*\* \| ([^|]*)\|/m) || [])[1] || "";
      if (/Taslak/.test(durum)) yanlis.push(`${no} başlık`);
      if (/Taslak/.test(satirDurumu(no) || "")) yanlis.push(`${no} README`);
    }
    expect(yanlis).toEqual([]);
  });
  // Triyaj (spec 0093 bulgu 1): README'nin sıra paragrafı plan yazılıp uygulandıktan sonra da "plan henüz yazılmadı" diyordu.
  it("planı yazılmış spec'in README paragrafı \"uygulama planı henüz yazılmadı\" demez", () => {
    const yanlis = numaralar("specs").filter(no => existsSync(path.join(KOK, "specs", `${no}-uygulama-plani.md`)))
      .filter(no => (README.match(new RegExp(`^\\*\\*${no}\\*\\* \\(.*$`, "m")) || [""])[0].match(/planı henüz yazılmadı/));
    expect(yanlis).toEqual([]);
  });
});
