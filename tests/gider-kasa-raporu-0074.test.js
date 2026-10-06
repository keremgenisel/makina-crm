// Spec 0074 R23 (AC-25, AC-26, AC-42): Aylık Gider ve Kasa Raporu'nda SGK kutusu SGK davranışlı kalemlerden; SGK ödemesi
// normal kalem ödemesi olarak listelenir ("SGK ödemeleri" toplu satırı yok); vade tablosunda toplu SGK dalı yok.
// 0070'in rapor testinin (gider-kasa-raporu-0070) yerine geçer.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { giderKalemDogrula, turHaritasi } from "../src/lib/gider";

const TURLER = [{ id: 3, ad: "Maaşlar", davranis: "personel" }, { id: 5, ad: "SGK", davranis: "sgk" }];
let n = 400;
const k = (o) => giderKalemDogrula({ tarih: "2026-09-30", sonOdemeTarihi: "2026-10-05", ...o }, { turMap: turHaritasi(TURLER), uid: () => ++n }).kayit;
const SGK_EYLUL = k({ id: 1, turId: 5, tutar: "9333", aciklama: "Eylül SGK" });
const SGK_EK = k({ id: 2, turId: 5, tutar: "1000", aciklama: "Eylül SGK (ek bildirge)" });
const MAAS = k({ id: 3, turId: 3, calisanId: 7, calisanAd: "Ayten Kara", resmiTutar: "31000", eldenTutar: "" });
const HESAP = { id: 501, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01" };
const H = [
  { id: 11, tur: "odeme", tarih: "2026-09-30", tutar: 9333, giderId: 1, taksitId: null, hesapId: 501, yontem: "Havale" },
  { id: 12, tur: "odeme", tarih: "2026-09-30", tutar: 31000, giderId: 3, taksitId: null, hesapId: 501, yontem: "Havale" },
];
const R = (giderler = [SGK_EYLUL, SGK_EK, MAAS], hareketler = H) => giderKasaRaporu({ giderler, hareketler, turler: TURLER, yururlukAy: "2026-01", hesaplar: [HESAP] }, "2026-09");

describe("Spec 0074: rapor", () => {
  it("AC-25: SGK kutusu SGK davranışlı kalemlerin toplamı; ödenen ve açık odemeDurumu kaynağından; SGK'sız ayda basılmaz", () => {
    const r = R();
    expect(r.gider.sgk).toEqual({ toplam: 10333, odenen: 9333, acik: 1000 });
    const kutu = buildGiderKasaRaporuHtml(r).match(/<!--sgk-->[\s\S]*?<!--\/sgk-->/)[0];
    expect(kutu).toContain("GİDER · SGK");
    expect(kutu).toContain("₺10.333");
    const sgksiz = R([MAAS], [H[1]]);
    expect(sgksiz.gider.sgk).toBeNull();
    expect(buildGiderKasaRaporuHtml(sgksiz)).not.toContain("GİDER · SGK");
  });
  it("AC-26: SGK ödemesi normal kalem ödemesi olarak listelenir; 'SGK ödemeleri' toplu satırı yok", () => {
    const r = R();
    expect(r.kasa.odemeler.filter(o => o.toplu).map(o => o.kalem)).toEqual(["Personel ödemeleri · 1 adet"]);
    const sgkOdeme = r.kasa.odemeler.find(o => !o.toplu);
    expect(sgkOdeme).toMatchObject({ kalem: "Eylül SGK", tutarK: 933300 });
    const html = buildGiderKasaRaporuHtml(r);
    expect(html).not.toContain("SGK ödemeleri");
    expect(html).not.toMatch(/Ayten/);
  });
  it("AC-42: vade tablosunda toplu SGK satırı dalı yok; SGK kalemi kendi satırında, tarafı SGK", () => {
    const src = readFileSync(path.join(__dirname, "../src/lib/giderRaporu.js"), "utf-8");
    expect(src).not.toMatch(/v\.tur === "sgk"/);
    const r = R([SGK_EYLUL, SGK_EK], []);
    const vade = [...(r.gider.vadesiGecmis || []), ...(r.gider.yaklasan || [])];
    expect(vade.every(v => !v.toplu)).toBe(true);
  });
});
