// Spec 0076 R15/4, R24–R26, R28 (AC-25, AC-27, AC-44, AC-45): Aylık Gider ve Kasa Raporu'nda kısıtlı (binek araç) kalem.
// Bilgi rakamları "GİDER · KDV KARŞILAŞTIRMASI" kutusunun içinde (yeni kutu yok), kısıtlı kalem yoksa basılmaz; KALEMLER
// tablosu gider tutarını basar ve "Toplam gider" ile tutar; vergi matrahı notu her zaman basılır.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { giderKalemDogrula, turHaritasi, KKEG_ETIKETI, VERGI_MATRAHI_NOTU } from "../src/lib/gider";

const TURLER = [{ id: 4, ad: "Yakıt", davranis: "normal" }];
let n = 7600;
const k = (o) => giderKalemDogrula({ tarih: "2026-09-10", turId: 4, tutar: "1000", kdvOrani: "20", aciklama: "Binek yakıt", ...o },
  { turMap: turHaritasi(TURLER), uid: () => ++n }).kayit;
const R = (giderler) => giderKasaRaporu({ giderler, hareketler: [], turler: TURLER, yururlukAy: "2026-01", hesaplar: [] }, "2026-09");
const bolum = (html, baslik) => { const i = html.indexOf(baslik); return html.slice(i, html.indexOf("background:#211d19", i + 20)); };

describe("Spec 0076: Gider ve Kasa Raporu", () => {
  const KIS = k({ id: 1, kisitliGider: true, indirilebilirOran: "70" });
  it("AC-25 / AC-44: KDV kutusunda indirilemeyen KDV ve KKEG (matrah, KDV, toplam); KKEG ilk geçtiği yerde açık adıyla", () => {
    const r = R([KIS]);
    expect(r.gider.kisitli).toEqual({ adet: 1, indirilebilirKdv: 140, indirilemeyenKdv: 60, kkegMatrah: 300, kkegKdv: 60, kkegToplam: 360 });
    const html = buildGiderKasaRaporuHtml(r);
    const kdv = bolum(html, "GİDER · KDV KARŞILAŞTIRMASI");
    expect(kdv).toMatch(/İndirilemeyen KDV \(kısıtlı giderler\)[\s\S]*?₺60/);
    expect(kdv).toContain(`${KKEG_ETIKETI} · matrah`);
    expect(kdv).toMatch(/KKEG · KDV[\s\S]*?₺60/);
    expect(kdv).toMatch(/KKEG · toplam[\s\S]*?₺360/);
    expect(kdv).toMatch(/İndirilecek gider KDV'si[\s\S]*?₺140/);
    expect(html.indexOf(KKEG_ETIKETI)).toBeLessThanOrEqual(html.indexOf("KKEG"));
    // Yeni kutu açılmaz: şerit başlıkları kısıtlı kalemle ve kalemsiz aynı.
    const basliklar = (h) => [...h.matchAll(/letter-spacing:.4px;">([^<]*)<\/span>/g)].map(m => m[1]);
    expect(basliklar(html)).toEqual(basliklar(buildGiderKasaRaporuHtml(R([k({ id: 2 })]))));
  });
  it("AC-25: kısıtlı kalem yoksa satırlar basılmaz ve rapor nesnesine alan eklenmez; oran 100 kalem de kısıtsız sayılır", () => {
    for (const g of [[k({ id: 2 })], [k({ id: 3, kisitliGider: true, indirilebilirOran: "100" })]]) {
      const r = R(g);
      expect("kisitli" in r.gider).toBe(false);
      const html = buildGiderKasaRaporuHtml(r);
      expect(html).not.toContain("KKEG ·");
      expect(html).not.toContain("İndirilemeyen KDV");
    }
  });
  it("AC-45: KALEMLER tablosunun tutarı gider tutarı (1.060) ve 'Toplam gider' ile tutar", () => {
    const r = R([KIS, k({ id: 4, tutar: "500" })]);
    expect(r.gider.kalemler.map(x => x.tutar)).toEqual([1060, 500]);
    expect(r.gider.ozet.toplam).toBe(1560);
    expect(r.gider.kalemler.reduce((a, x) => a + x.tutar, 0)).toBe(r.gider.ozet.toplam);
  });
  it("AC-27: vergi matrahı notu gider bölümünün dipnotu; kısıtlı kalem olmasa da basılır", () => {
    expect(buildGiderKasaRaporuHtml(R([k({ id: 5 })]))).toContain(VERGI_MATRAHI_NOTU);
    expect(buildGiderKasaRaporuHtml(R([KIS]))).toContain(VERGI_MATRAHI_NOTU);
  });
  it("AC-26: KKEG toplamı gider toplamına eklenmez (1.060 + 360 değil)", () => {
    expect(R([KIS]).gider.ozet.toplam).toBe(1060);
  });
});
