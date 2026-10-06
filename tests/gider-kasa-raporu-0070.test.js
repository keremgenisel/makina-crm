// Spec 0070 R18, R31 (AC-22, AC-44): Aylık Gider ve Kasa Raporu'nda SGK kutusu ve ödeme hareketlerinde "SGK ödemeleri" toplu
// satırı. Gizliliğin çıktı temelli taraması tests/gider-gizlilik.test.js'in 0070 bloğundadır.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { giderKalemDogrula, turHaritasi, HEDEF } from "../src/lib/gider";

const TURLER = [{ id: 3, ad: "Maaşlar", davranis: "personel" }];
let n = 400;
const k = (o) => giderKalemDogrula({ tarih: "2026-09-30", turId: 3, eldenTutar: "", sonOdemeTarihi: "2026-10-05", ...o }, { turMap: turHaritasi(TURLER), uid: () => ++n }).kayit;
const A = k({ id: 1, calisanId: 7, calisanAd: "Ayten Kara", resmiTutar: "31000", sgkTutar: "4111" });
const B = k({ id: 2, calisanId: 8, calisanAd: "Bora Kaya", resmiTutar: "29000", sgkTutar: "5222" });
const HESAP = { id: 501, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01" };
const satir = (kalem, hedef) => kalem.taksitler.find(t => t.hedef === hedef).id;
// Eylül içinde: A'nın SGK'sı ödendi (kuruma), B'nin maaşı ödendi (çalışana).
const H = [
  { id: 11, tur: "odeme", tarih: "2026-09-30", tutar: 4111, giderId: 1, taksitId: satir(A, HEDEF.SGK), hesapId: 501, yontem: "Havale" },
  { id: 12, tur: "odeme", tarih: "2026-09-30", tutar: 29000, giderId: 2, taksitId: satir(B, HEDEF.ANA), hesapId: 501, yontem: "Havale" },
];
const R = (giderler = [A, B], hareketler = H) => giderKasaRaporu({ giderler, hareketler, turler: TURLER, yururlukAy: "2026-01", hesaplar: [HESAP] }, "2026-09");

describe("Spec 0070: rapor", () => {
  it("AC-22: SGK kutusu toplam, ödenen ve açık ayrımıyla basılır; SGK'sız ayda hiç basılmaz", () => {
    const r = R();
    expect(r.gider.sgk).toEqual({ toplam: 9333, odenen: 4111, acik: 5222 });
    const html = buildGiderKasaRaporuHtml(r);
    const kutu = html.match(/<!--sgk-->[\s\S]*?<!--\/sgk-->/)[0];
    expect(kutu).toContain("GİDER · SGK");
    expect(kutu).toContain("₺9.333");
    const sgksiz = R([k({ id: 3, calisanId: 7, calisanAd: "Ayten Kara", resmiTutar: "31000" })], []);
    expect(sgksiz.gider.sgk).toBeNull();
    expect(buildGiderKasaRaporuHtml(sgksiz)).not.toContain("GİDER · SGK");
  });
  it("AC-44: SGK ödemesi kendi toplu satırında, 'Personel ödemeleri'ne karışmaz", () => {
    const top = R().kasa.odemeler.filter(o => o.toplu).map(o => [o.kalem, o.tutarK]);
    expect(top).toEqual([["Personel ödemeleri · 1 adet", 2900000], ["SGK ödemeleri · 1 adet", 411100]]);
    const html = buildGiderKasaRaporuHtml(R());
    expect(html).toContain("SGK ödemeleri · 1 adet");
    expect(html).not.toMatch(/Ayten|Bora/);
  });
});
