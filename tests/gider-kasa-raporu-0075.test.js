// Spec 0075 R25, R42 (AC-27, AC-48): Aylık Gider ve Kasa Raporu'nda "GİDER · TEVKİFAT" kutusu stopaj kutusunun eşi; tevkifatsız
// ayda basılmaz; özet kutusunda "Kesilen tevkifat" satırı ve hesaplaGiderRaporu'nda tevkifatToplam yok (0059 altını değişmez).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { giderKalemDogrula, turHaritasi, hesaplaGiderRaporu } from "../src/lib/gider";

const TURLER = [{ id: 4, ad: "Nakliye", davranis: "normal" }, { id: 1, ad: "Kira", davranis: "kira" }];
let n = 7700;
const k = (o) => giderKalemDogrula({ tarih: "2026-09-10", turId: 4, tutar: "20000", kdvOrani: "20", sonOdemeTarihi: "2026-09-30", ...o },
  { turMap: turHaritasi(TURLER), uid: () => ++n }).kayit;
const TV = k({ id: 1, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, tevkifatVade: "2026-10-26", aciklama: "Eylül nakliye" });
const tvId = TV.taksitler.find(r => r.hedef === "tevkifat").id;
const R = (giderler, hareketler = []) => giderKasaRaporu({ giderler, hareketler, turler: TURLER, yururlukAy: "2026-01", hesaplar: [] }, "2026-09");

describe("Spec 0075: rapor", () => {
  it("AC-27: kutu kesilen, ödenen ve ay sonunda açık tutarı basar; dönem kilidi ödemeyi ay sonuna göre sayar", () => {
    const r = R([TV], [{ id: 1, tur: "odeme", tarih: "2026-09-20", tutar: 500, giderId: 1, taksitId: tvId }, { id: 2, tur: "odeme", tarih: "2026-10-03", tutar: 1500, giderId: 1, taksitId: tvId }]);
    expect(r.gider.tevkifat).toEqual({ kesilen: 2000, odenen: 500, acik: 1500 });
    const html = buildGiderKasaRaporuHtml(r);
    expect(html).toContain("GİDER · TEVKİFAT");
    expect(html).toContain("Kesilen KDV tevkifatı");
    // Sıra: stopaj kutusundan hemen sonra, kova kutusundan önce.
    expect(html.indexOf("GİDER · TEVKİFAT")).toBeLessThan(html.indexOf("MAKİNA MALİYETİ") === -1 ? Infinity : html.indexOf("MAKİNA MALİYETİ"));
  });
  it("AC-27: tevkifatsız ayda kutu basılmaz", () => {
    const r = R([k({ id: 2 })]);
    expect(r.gider.tevkifat).toBeNull();
    expect(buildGiderKasaRaporuHtml(r)).not.toContain("TEVKİFAT");
  });
  it("AC-48: özet kutusunda 'Kesilen tevkifat' yok; hesaplaGiderRaporu tevkifatToplam döndürmez; raporun KDV kutusu tam KDV", () => {
    const r = R([TV]);
    expect(buildGiderKasaRaporuHtml(r)).not.toMatch(/Kesilen tevkifat/);
    const gr = hesaplaGiderRaporu({ giderler: [TV], turler: TURLER, yururlukAy: "2026-01" }, { baslangic: "2026-09-01", bitis: "2026-09-30" });
    expect("tevkifatToplam" in gr).toBe(false);
    expect(r.gider.kdv.indirilecek).toBe(4000);
    expect("tevkifatKdv2" in r.gider.kdv).toBe(false);
    const src = readFileSync(path.join(__dirname, "../src/lib/gider.js"), "utf-8");
    expect(src).not.toMatch(/tevkifatToplam/);
  });
});
