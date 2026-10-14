// Spec 0084 R21: Aylık Gider ve Kasa Raporu'nda "GİDER · STOPAJ" kutusuna beyan dönemi tablosu ve vade tablolarında
// gruplanmış kira stopajı satırı. 0059'un altın dosyası bu işle değişmez (D2; o test dokunulmadan yeşil).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { giderKasaRaporu, buildGiderKasaRaporuHtml, STOPAJ_RAPOR_TURU } from "../src/lib/giderRaporu";
import { giderKalemDogrula, VERGI_DAIRESI } from "../src/lib/gider";
import { stopajBeyanAyari } from "../src/lib/stopajDonemi";
import { GIDERLER, TURLER, TEDARIKCILER, HAREKETLER, HESAPLAR, turMap, uid } from "./fixtures/0084-veri";

const girdi = (o = {}) => ({ giderler: GIDERLER, hareketler: HAREKETLER, turler: TURLER, tedarikciler: TEDARIKCILER, yururlukAy: "2026-01", esikGun: 30, hesaplar: HESAPLAR, ...o });
const kira = (o) => giderKalemDogrula({ turId: 2, girisYonu: "brut", tutar: 10000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 12, ...o }, { turMap, tedarikciler: TEDARIKCILER, uid }).kayit;

describe("Spec 0084 R21/1: GİDER · STOPAJ kutusunda beyan dönemi tablosu", () => {
  it("AC-33: kutunun üç rakamı aynen; dönem tablosu ayın kalemlerinin dönemini ay sonu itibarıyla yazar", () => {
    const r = giderKasaRaporu(girdi(), "2026-03");
    const { donemler, ...uc } = r.gider.stopaj;
    // Mart'ın kalemleri: K3 (stopaj 6.000) ve stopajsız K6. Kutunun rakamları yalnız ayın kalemleri (bugünkü gibi).
    expect(uc).toEqual({ kesilen: 6000, odenen: 0, acik: 6000 });
    // Dönem tablosu bütün 1. dönem: K1 (ödendi 4.000, 2026-03-30), K2, K3, K5 (satırsız); çöpteki K9 ve stopajsız K6 hariç.
    expect(donemler).toEqual([{ donemAdi: "2026 1. dönem (Ocak-Mart)", odemeTarihi: "2026-04-26", kesilen: 16000, odenen: 4000, acik: 12000 }]);
    const h = buildGiderKasaRaporuHtml(r);
    expect(h).toMatch(/GİDER · STOPAJ[\s\S]*Kesilen stopaj[\s\S]*Ödenen[\s\S]*Ay sonunda açık[\s\S]*BEYAN DÖNEMLERİ[\s\S]*2026 1\. dönem \(Ocak-Mart\)[\s\S]*26\.04\.2026/);
  });
  it("AC-33: ayın stopajlı kira kalemi yoksa kutu ve tablo hiç basılmaz", () => {
    const r = giderKasaRaporu(girdi(), "2026-04");
    expect(r.gider.stopaj).toBeNull();
    expect(buildGiderKasaRaporuHtml(r)).not.toMatch(/GİDER · STOPAJ|BEYAN DÖNEMLERİ/);
  });
  it("AC-33: dönem tablosu ay sonu itibarıyladır (ay sonundan sonraki ödeme sayılmaz) ve beyan ayarını girdiden alır", () => {
    const sonra = [...HAREKETLER, { id: 950, tur: "odeme", tarih: "2026-04-26", tutar: 4000, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: GIDERLER[1].taksitler.find(t => t.hedef === "stopaj").id }];
    expect(giderKasaRaporu(girdi({ hareketler: sonra }), "2026-03").gider.stopaj.donemler[0].odenen).toBe(4000);
    const aylik = giderKasaRaporu(girdi({ stopajBeyan: stopajBeyanAyari({ stopajBeyanDonemi: "aylik", stopajOdemeGunu: 20 }) }), "2026-03").gider.stopaj.donemler;
    expect(aylik).toEqual([{ donemAdi: "Mart 2026", odemeTarihi: "2026-04-20", kesilen: 6000, odenen: 0, acik: 6000 }]);
  });
});

describe("Spec 0084 R21/2: vade tablolarında gruplanmış stopaj satırı (D2)", () => {
  const VERI = [
    kira({ id: 71, tarih: "2026-01-05", aciklama: "Ocak", sonOdemeTarihi: "2026-01-10", stopajVade: "2026-04-26" }),
    kira({ id: 72, tarih: "2026-03-05", aciklama: "Mart", sonOdemeTarihi: "2026-03-10", stopajVade: "2026-04-26" }),
  ];
  it("AC-31: gruplanmış stopaj satırı kendi dalıyla (tarih yok, tür Kira stopajı, taraf Vergi dairesi, dönem adı ve adet); '(türsüz)' yok", () => {
    const r = giderKasaRaporu({ ...girdi(), giderler: VERI, hareketler: [] }, "2026-03");
    const s = r.gider.vadeler.yaklasan.filter(v => v.stopaj);
    expect(s).toEqual([{ stopaj: true, tarih: null, tur: STOPAJ_RAPOR_TURU, donemAdi: "2026 1. dönem (Ocak-Mart)", tedarikci: VERGI_DAIRESI, adet: 2, kalanK: 400000, vade: "2026-04-26", gun: 26 }]);
    expect([...r.gider.vadeler.yaklasan, ...r.gider.vadeler.gecmis].some(v => v.tur === "(türsüz)")).toBe(false);
    expect(buildGiderKasaRaporuHtml(r)).toContain("Kira stopajı · 2026 1. dönem (Ocak-Mart) · 2 kalem");
  });
  it("AC-31 (D2): 0059'un altın dosyası bu işte değişmedi", () => {
    const altin = readFileSync("tests/fixtures/0059-gider-rapor-once.json", "utf8");
    expect(altin).not.toMatch(/Kira stopajı|donemler|BEYAN/);
  });
});
