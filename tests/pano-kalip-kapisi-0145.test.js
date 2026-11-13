// Spec 0145 A-R2, A-R2/3, A-R3/2, A-R6/2, C1–C3: panonun kargo kapıları tek yerde (saf) ve kaynak taramaları.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { kargoKapisi, kalipKargoKapisi, gorunurSekmeler, IZIN_BEKLEME_MS } from "../src/lib/permissions";

const sekmeler = (...idler) => idler.map(id => ({ id }));
const kod = (f) => fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");

describe("Spec 0145 A: kapının tek tanımı", () => {
  it("AC-1 / AC-17 / AC-4 / AC-8: kalıp kargosu Stok YA DA Müşteriler; yedek parça kargosu yalnız Stok", () => {
    expect(kalipKargoKapisi(sekmeler("servis", "stock"))).toBe(true);
    expect(kalipKargoKapisi(sekmeler("servis", "customers"))).toBe(true);
    expect(kalipKargoKapisi(sekmeler("servis", "dashboard"))).toBe(false);
    expect(kargoKapisi(sekmeler("servis", "stock"))).toBe(true);
    expect(kargoKapisi(sekmeler("servis", "customers"))).toBe(false);
    expect(kalipKargoKapisi(null)).toBe(false);
  });
  it("AC-7 (saf): kiosk (yalnız pano) iki kapıyı da kapalı görür; yerel mod hepsini açık", () => {
    const kiosk = gorunurSekmeler(sekmeler("servis", "stock", "customers"), "active", { role: "user", permissions: JSON.stringify({ tabs: ["servis"] }) });
    expect(kiosk.map(t => t.id)).toEqual(["servis"]);
    expect(kalipKargoKapisi(kiosk)).toBe(false); expect(kargoKapisi(kiosk)).toBe(false);
    expect(kalipKargoKapisi(gorunurSekmeler(sekmeler("servis", "stock", "customers"), "none", null))).toBe(true);
  });
  it("B-R2/2: bekleme üst sınırı 1,5 saniye", () => { expect(IZIN_BEKLEME_MS).toBe(1500); });
  it("Triyaj bulgu 3: kapı yorumu kapı fonksiyonlarının hemen üstünde; bekleme sabiti kapı bloğunun dışında", () => {
    const s = fs.readFileSync("src/lib/permissions.js", "utf8");
    const yorum = s.indexOf("// Spec 0145 A-R2"); const fonk = s.indexOf("const sekmeVar"); const sabit = s.indexOf("export const IZIN_BEKLEME_MS");
    expect(s.slice(yorum, fonk)).not.toMatch(/IZIN_BEKLEME_MS|B-R2\/2/);
    expect(sabit).toBeGreaterThan(s.indexOf("export const kalipKargoKapisi"));
    const spec = fs.readFileSync("specs/done/0145-pano-kalip-kargo-yetkisi-ve-izin-yarisi.md", "utf8");
    expect(spec.indexOf("**X6.**")).toBeLessThan(spec.indexOf("**X7.**"));
  });
});

describe("Spec 0145 taramalar", () => {
  const app = kod("src/App.jsx");
  it("AC-22 / A-R2/3: kapı App'te iki fonksiyondan; App'te panoya ait ikinci sekme denetimi yok; prop adları aynı", () => {
    expect(app).toMatch(/const kargoYetki = useMemo\(\(\) => kargoKapisi\(visibleTabs\)/);
    expect(app).toMatch(/const kalipYetki = useMemo\(\(\) => kalipKargoKapisi\(visibleTabs\)/);
    // Menü tıklamasının süzgeç sıfırlaması (`if (t.id === "customers")`) bir kapı değildir; `.some(` ile sekme denetimi App'te yok.
    expect(app).not.toMatch(/visibleTabs\.some\(t => t\.id === "(customers|stock)"\)/);
    // Altı okuyucu: pano (prop), ayrı pencere görüntüsü (prop), uygulama bildirimi (ref); pano içinde üç liste ve alarm aynı prop'u okur.
    expect((app.match(/kalipYetki=\{kalipYetki\}/g) || []).length).toBe(1);
    expect(app).toMatch(/kargoYetki, kalipYetki, dosyaCevrimdisi/);
    expect(app).toMatch(/const kalipYetkiRef = useRef\(kalipYetki\)/);
    const pano = kod("src/components/ServisPanosu.jsx");
    expect((pano.match(/!kalipYetki \?|if \(!kalipYetki\)/g) || []).length).toBe(3);
    expect(pano).toMatch(/kalipYetkiRef\.current \?/);
    expect(kod("src/lib/permissions.js")).toMatch(/export const kalipKargoKapisi = /);
  });
  it("AC-23 / A-R6/2: kiosk çağrısı Extra Kalıp dizisini de kapı bayrağını da geçirmez", () => {
    const kiosk = app.slice(app.indexOf("if (kioskMode) return ("), app.indexOf("</div>\n  );", app.indexOf("if (kioskMode) return (")));
    expect(kiosk).toMatch(/<ServisPanosu kiosk/);
    expect(kiosk).not.toMatch(/partSales=|kalipYetki=|setPartSales=/);
  });
  it("AC-21 (kaynak): Extra Kalıp detayının kilidi yalnız düzenleme izniyle", () => {
    expect(kod("src/components/ServisPanosu.jsx")).toMatch(/useLock\("part_sale", canKalipDuzenle \? kalipDetayId : null\)/);
  });
  it("AC-15 / AC-16: sunucu kuralı, izin kimliği, veri ve birleştirme değişmedi", () => {
    const sa = kod("electron/serverAuth.cjs");
    expect(sa).toMatch(/partSales:\s+\[[^\]]*"servis"/); expect(sa).toMatch(/partSales:\s+\[\{ alan: "kargoDurum", group: "customerActions", id: "cust_kalip_edit" \}\]/);
    for (const f of ["electron/serverAuth.cjs", "electron/db.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js"]) expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/0145/);
  });
  it("B-R1/2, B-R1/3, B-R1/4 (kaynak): tazeleme izni yazar ve döndürür; açılışta tek çağrı; yoklama hemen bir tur", () => {
    const ipc = kod("electron/ipc/data.cjs");
    expect(ipc).toMatch(/saveServerConfig\(app, \{ \.\.\.cfg, token: body\.token, role, permissions \}\)/);
    expect(ipc).toMatch(/return \{ ok: true, role, permissions \}/);
    expect((app.match(/window\.appServer\.refreshToken\(\)/g) || []).length).toBe(2); // açılış + günlük aralık
    expect(app).toMatch(/tur\(true\);\n\s*const id = setInterval\(\(\) => tur\(false\), 10000\)/);
    expect(app).toMatch(/if \(serverMode === "active" && !izinYerlesti\) return null;/);
  });
});
