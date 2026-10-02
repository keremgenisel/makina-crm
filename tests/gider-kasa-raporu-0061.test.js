// Spec 0061 C: Aylık Gider ve Kasa Raporu'nda açık kalemler yaşlandırması. Ortak veri 0059'unki; ay sonu (30.09) itibarıyla
// açık olanlar: kiranın kiraya veren tarafı (ödemesi 05.10'da, ay sonrası), personelin elden ve ek ödeme kalanı, "Vida & somun".
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { giderKasaRaporu, buildGiderKasaRaporuHtml, NOT_YASLANDIRMA } from "../src/lib/giderRaporu";
import { girdi, AD } from "./fixtures/0059-veri";

afterEach(() => vi.useRealTimers());
const R = (o, ay = "2026-09") => giderKasaRaporu(girdi(o), ay);
const HTML = (o, ay) => buildGiderKasaRaporuHtml(R(o, ay));
const kutu = (h) => { const i = h.indexOf("GİDER · AÇIK KALEMLER YAŞLANDIRMASI"); return i < 0 ? "" : h.slice(i, h.indexOf("GİDER · STOPAJ", i) > 0 ? h.indexOf("GİDER · STOPAJ", i) : h.indexOf("GİDER · MALİYET DAĞILIMI", i)); };
const kod = () => readFileSync("src/lib/giderRaporu.js", "utf8").split("\n").filter(l => !l.trim().startsWith("//")).join("\n");

describe("Spec 0061 rapor yaşlandırması", () => {
  it("AC-19 / AC-42: kovalar ve taraf kırılımı basılır; kutu ödeme durumundan sonra", () => {
    const r = R();
    // Kira kiraya veren 16.000 + personel elden 16.777 ve ek ödeme (resmi) 2.345 (0054: ayrı hedef) + Vida & somun 3.000.
    expect(r.gider.yaslandirma.kovalar).toEqual([{ ad: "0-30 gün", kalemAdet: 3, kalanK: 1600000 + 1677700 + 234500 + 300000 }]);
    expect(r.gider.yaslandirma.gruplar.map(x => x.ad)).toEqual(["Çalışanlar", "Yıldız Gayrimenkul", "A<B Ticaret"]);
    const h = HTML();
    expect(h.indexOf("GİDER · ÖDEME DURUMU")).toBeLessThan(h.indexOf("GİDER · AÇIK KALEMLER YAŞLANDIRMASI"));
    expect(kutu(h)).toContain("A&lt;B Ticaret");
    expect(kutu(h)).toContain(NOT_YASLANDIRMA);
  });
  it("AC-33 / AC-42: tablo sütunları spec'teki gibi", () => {
    const k = kutu(HTML()).replace(/style="[^"]*"/g, "");
    expect(k).toContain("<th >Yaş aralığı</th><th >Kalem</th><th >Kalan</th><th >Pay</th>");
    expect(k).toContain("<th >Taraf</th><th >0-30 gün</th><th >31-60 gün</th><th >61-90 gün</th><th >90+ gün</th><th >Toplam</th>");
  });
  it("AC-20: yaş ay sonundan; aynı girdi aynı HTML ve sistem saati değişse de belge aynı", () => {
    const a = HTML();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2027-03-15T10:00:00"));
    expect(HTML()).toBe(a);
    expect(R().gider.yaslandirma.kovalar.map(x => x.ad)).toEqual(["0-30 gün"]); // bugünden sayılsaydı 90+ olurdu
  });
  it("AC-21: açık kalemi olmayan ayda kutu hiç basılmaz", () => {
    expect(R({}, "2026-08").gider.yaslandirma).toBeNull();
    expect(HTML({}, "2026-08")).not.toContain("AÇIK KALEMLER YAŞLANDIRMASI");
  });
  it("AC-23: raporun bugünkü toplamları değişmedi", () => {
    const altin = JSON.parse(readFileSync("tests/fixtures/0059-gider-rapor-once.json", "utf8"))["2026-09"];
    const r = R();
    expect(r.gider.ozet).toEqual(altin.gider.ozet);
    expect(r.gider.kdv).toEqual(altin.gider.kdv);
    expect(r.kasa.bloklar).toEqual(altin.kasa.bloklar);
  });
  it("AC-22 / AC-37: kutuda çalışan adı ve kişi kırılımı yok; çalışanlar tek satır; kurucu kişi alanı okumaz", () => {
    const k = kutu(HTML());
    for (const yasak of [AD, "Zümrüt", "Kaplanoğlu", "17.777", "Resmi", "Elden", "Maaş ("]) expect(k, yasak).not.toContain(yasak);
    expect((k.match(/>Çalışanlar</g) || []).length).toBe(1);
    expect(kod()).not.toMatch(/ayrinti|calisanAd|calisanlar\b/);
  });
});
