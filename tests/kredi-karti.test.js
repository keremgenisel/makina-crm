// Kredi Kartı Taksit Komisyonu saf hesaplaması — ileri (kart→net), ters/gross-up (net→kart),
// blokaj tarihi ve tahsil eşiği. Bu testler krediKarti.js hatalarını yakalar (kural: her fix testli).
import { describe, it, expect } from "vitest";
import {
  hesaplaKartKomisyonu, hesaplaKartTutariNetten, hesabaGecisTarihi, kartTahsilEdildiMi, kkToplamOran, kkSatir,
  kartYansitmaAyrim, yansitilanKomisyon, makinaKartOdemesi, kartKomisyonuSnapshot,
} from "../src/lib/krediKarti";

// 3 taksit: gerçek üye işyeri %7,12 → BSMV dâhil oran 7,12×1,05 = 7,476 (banka ekranı 7,47'ye yuvarlar).
// Birebir banka ekstresini tutturmak için oranı 7,476 giriyoruz; katkı payı %0,50, BSMV %5.
const AYAR = {
  bsmv: 5,
  satirlar: [
    { taksit: 1, oran: 3.10, katkiPayi: 0.5, blokajGun: 40 },
    { taksit: 3, oran: 7.476, katkiPayi: 0.5, blokajGun: 0 },
    { taksit: 6, oran: 9.34, katkiPayi: 0.75, blokajGun: 0 },
  ],
};
const AYAR_YUVARLI = { bsmv: 5, satirlar: [{ taksit: 3, oran: 7.47, katkiPayi: 0.5, blokajGun: 0 }] };

describe("hesaplaKartKomisyonu (ileri: kart tutarı → kesinti)", () => {
  it("455.000 / 3 taksit → banka ekstresiyle birebir", () => {
    const r = hesaplaKartKomisyonu(455000, 3, AYAR);
    expect(r.uyeIsyeriUcreti).toBeCloseTo(32396, 2);
    expect(r.bsmvTutar).toBeCloseTo(1619.8, 2);
    expect(r.katkiPayiTutar).toBeCloseTo(2275, 2);
    expect(r.toplamKesinti).toBeCloseTo(36290.8, 2);
    expect(r.netTutar).toBeCloseTo(455000 - 36290.8, 2);
    expect(r.blokajGun).toBe(0);
    expect(r.hesabaGecis).toBeTruthy();
  });
  it("tek çekim satırının blokaj günü snapshot'a taşınır", () => {
    const r = hesaplaKartKomisyonu(80000, 1, AYAR, "2026-08-12");
    expect(r.blokajGun).toBe(40);
    expect(r.hesabaGecis).toBe("2026-09-21"); // 12.08 + 40 gün
  });
  it("geçersiz girdi (tutar<=0 veya taksit tanımsız) → null", () => {
    expect(hesaplaKartKomisyonu(0, 3, AYAR)).toBeNull();
    expect(hesaplaKartKomisyonu(1000, 99, AYAR)).toBeNull();
  });
});

describe("hesaplaKartTutariNetten (ters: hedef net → çekilecek kart tutarı)", () => {
  it("faturalı 100.000 net / 3 taksit / KDV %20 (yuvarlı oran 7,47)", () => {
    const r = hesaplaKartTutariNetten(100000, 3, AYAR_YUVARLI, 20);
    expect(r.kartTutari).toBeCloseTo(132690.52, 1);
    expect(r.malBedeli).toBeCloseTo(110575.43, 1);
    expect(r.kdvTutar).toBeCloseTo(22115.09, 1);
    expect(r.komisyonTutar).toBeCloseTo(10575.43, 1);
  });
  it("faturasız 100.000 net / 3 taksit (KDV 0)", () => {
    const r = hesaplaKartTutariNetten(100000, 3, AYAR_YUVARLI, 0);
    expect(r.kartTutari).toBeCloseTo(108660.22, 1);
  });
  it("round-trip: çekilecek kartı ileri hesaba verince net = hedef net (oran/kdv bağımsız)", () => {
    for (const [N, taksit, kdv] of [[100000, 3, 20], [55000, 6, 20], [250000, 3, 0], [18000, 1, 20]]) {
      const r = hesaplaKartTutariNetten(N, taksit, AYAR, kdv);
      const netHesaba = r.kartTutari - r.komisyonTutar - r.kdvTutar; // bankadan gelen − KDV
      expect(netHesaba).toBeCloseTo(N, 2);
      expect(r.kirilim.toplamKesinti).toBeCloseTo(r.komisyonTutar, 6);
    }
  });
  it("çözümsüz (komisyon+KDV ≥ %100) → null", () => {
    const imkansiz = { bsmv: 5, satirlar: [{ taksit: 3, oran: 95, katkiPayi: 10, blokajGun: 0 }] };
    expect(hesaplaKartTutariNetten(100000, 3, imkansiz, 20)).toBeNull();
  });
});

describe("hesabaGecisTarihi & kartTahsilEdildiMi", () => {
  it("blokaj 0 → aynı gün; blokaj 40 → +40", () => {
    expect(hesabaGecisTarihi("2026-08-12", 0)).toBe("2026-08-12");
    expect(hesabaGecisTarihi("2026-08-12", 40)).toBe("2026-09-21");
  });
  it("blokajlı ödeme, tarih gelene kadar tahsil sayılmaz; sonra sayılır", () => {
    const km = { blokajGun: 40, hesabaGecis: "2026-09-21" };
    expect(kartTahsilEdildiMi(km, "2026-09-20")).toBe(false);
    expect(kartTahsilEdildiMi(km, "2026-09-21")).toBe(true);
    expect(kartTahsilEdildiMi(km, "2026-10-01")).toBe(true);
  });
  it("blokajsız / eksik snapshot → hemen tahsil", () => {
    expect(kartTahsilEdildiMi({ blokajGun: 0, hesabaGecis: "2026-08-12" }, "2026-08-01")).toBe(true);
    expect(kartTahsilEdildiMi(null, "2026-08-01")).toBe(true);
    expect(kartTahsilEdildiMi(undefined)).toBe(true);
  });
  it("bugun sayı gelirse (Array.filter index) bugünü kullanır — geçmişte hesaba geçen bloke ödeme tahsil sayılır", () => {
    const gecmis = { blokajGun: 40, hesabaGecis: "2020-01-01" }; // çoktan hesaba geçti
    expect(kartTahsilEdildiMi(gecmis, 0)).toBe(true);       // 2. arg sayı (filter index) → today() kullan
    expect([gecmis].filter(k => kartTahsilEdildiMi(k)).length).toBe(1);
    const gelecek = { blokajGun: 40, hesabaGecis: "2999-01-01" };
    expect(kartTahsilEdildiMi(gelecek, 2)).toBe(false);     // hâlâ bloke
  });
});

describe("yardımcılar", () => {
  it("kkToplamOran = oran + katkı; kkSatir taksit bulur", () => {
    expect(kkToplamOran({ oran: 7.47, katkiPayi: 0.5 })).toBeCloseTo(7.97, 6);
    expect(kkSatir(6, AYAR).oran).toBe(9.34);
    expect(kkSatir(2, AYAR)).toBeNull();
  });
});

describe("kartYansitmaAyrim (üçlü ayrım: satış / komisyon / KDV)", () => {
  it("kalem 10.000 / 3 taksit / %20 → satış+komisyon+kdv = çekilen kart", () => {
    const a = kartYansitmaAyrim(10000, 3, AYAR_YUVARLI, 20);
    expect(a.satis).toBe(10000);
    expect(a.komisyon).toBeCloseTo(1057.54, 1);
    expect(a.kdvMatrah).toBeCloseTo(11057.54, 1);  // = satis + komisyon
    expect(a.kdv).toBeCloseTo(2211.51, 1);          // matrah × %20
    expect(a.kartTutari).toBeCloseTo(13269.05, 1);
    // özdeşlik: kdvMatrah = satis + komisyon; kartTutari = matrah + kdv
    expect(a.kdvMatrah).toBeCloseTo(a.satis + a.komisyon, 4);
    expect(a.kartTutari).toBeCloseTo(a.kdvMatrah + a.kdv, 4);
  });
  it("KDV komisyon ÜZERİNDEN de hesaplanır (matrah = kalem + komisyon), 2000 değil", () => {
    const a = kartYansitmaAyrim(10000, 3, AYAR_YUVARLI, 20);
    expect(a.kdv).toBeGreaterThan(2000); // sadece kalemin KDV'si (2000) değil, komisyon dahil
  });
  it("geçersiz → null", () => {
    expect(kartYansitmaAyrim(0, 3, AYAR_YUVARLI, 20)).toBeNull();
    expect(kartYansitmaAyrim(10000, 99, AYAR_YUVARLI, 20)).toBeNull();
  });
});

describe("makinaKartOdemesi (makina kredi kartı ödemesi)", () => {
  it("yansıtma (option B): borçtan düşen = çekilecek kart − komisyon = mal + (komisyon dahil KDV)", () => {
    const mk = makinaKartOdemesi(100000, 3, AYAR, "2026-08-15", true, 20);
    const a = kartYansitmaAyrim(100000, 3, AYAR, 20, "2026-08-15");
    expect(mk.tutar).toBeCloseTo(a.kartTutari - a.komisyon, 4);   // ~122.117 (mal 100.000 + KDV ~22.117)
    expect(mk.tutar).toBeCloseTo(100000 + a.kdv, 4);              // özdeşlik: mal + komisyon dahil KDV
    expect(mk.tutar).toBeGreaterThan(120000);                    // salt mal×1.20 (120.000) değil
    expect(mk.kartKomisyonu.yansitildi).toBe(true);
    expect(mk.kartKomisyonu.toplamKesinti).toBeCloseTo(a.komisyon, 4);
  });
  it("faturasız (kdvOran=0): borçtan mal düşer, karta KDV eklenmez", () => {
    const mk = makinaKartOdemesi(100000, 3, AYAR, "2026-08-15", true, 0);
    expect(mk.tutar).toBeCloseTo(100000, 0);
  });
  it("yansıtma yok: komisyonu biz üstleniriz (yansitildi=false), tutar mal×(1+KDV) (komisyon vergisiz)", () => {
    const mk = makinaKartOdemesi(100000, 3, AYAR, "2026-08-15", false, 20);
    expect(mk.tutar).toBeCloseTo(120000, 0);
    expect(mk.kartKomisyonu.yansitildi).toBe(false);
  });
  it("taksit yoksa snapshot null, tutar mal×(1+KDV)", () => {
    const mk = makinaKartOdemesi(100000, null, AYAR, "2026-08-15", true, 20);
    expect(mk.tutar).toBeCloseTo(120000, 0);
    expect(mk.kartKomisyonu).toBeNull();
  });
});

describe("yansıt kaydından KALEM geri çıkar (düzenleme yüklemesi)", () => {
  // Kayıtta ucret=matrah(kalem+komisyon), kartKomisyonu.yansitildi=true saklanır.
  // Düzenlemeye girince form kalem'i göstermeli: kalem = ucret − yansitilanKomisyon(rec).
  // Bu invaryant bozulursa "düzenlemede ürün fiyatı değişiyor" hatası olur.
  it("matrah − yansitilanKomisyon = girilen kalem; yansitildi=true", () => {
    const kalem = 10000;
    const a = kartYansitmaAyrim(kalem, 3, AYAR_YUVARLI, 20);
    const rec = { yontem: "Kredi Kartı", ucret: a.kdvMatrah, kartKomisyonu: kartKomisyonuSnapshot(a.kartTutari, 3, AYAR_YUVARLI, "2026-08-12", true) };
    expect(rec.kartKomisyonu.yansitildi).toBe(true);             // kutu seçili gelmeli
    expect(a.kdvMatrah - yansitilanKomisyon(rec)).toBeCloseTo(kalem, 0); // fiyat kalem'e döner (değişmez)
  });
  it("çeşitli taksit/kdv için de kalem geri çıkar", () => {
    for (const [kalem, taksit, kdv] of [[42163, 3, 20], [5000, 6, 20], [100000, 1, 20]]) {
      const a = kartYansitmaAyrim(kalem, taksit, AYAR, kdv);
      const rec = { yontem: "Kredi Kartı", ucret: a.kdvMatrah, kartKomisyonu: kartKomisyonuSnapshot(a.kartTutari, taksit, AYAR, "2026-08-12", true) };
      expect(a.kdvMatrah - yansitilanKomisyon(rec)).toBeCloseTo(kalem, 0);
    }
  });
});

describe("yansitilanKomisyon (ciro düşümü)", () => {
  const kk = { toplamKesinti: 1057.54, yansitildi: true };
  it("yansitildi=true kredi kartı → toplamKesinti; değilse 0", () => {
    expect(yansitilanKomisyon({ yontem: "Kredi Kartı", kartKomisyonu: kk })).toBeCloseTo(1057.54, 2);
    expect(yansitilanKomisyon({ yontem: "Kredi Kartı", kartKomisyonu: { toplamKesinti: 500, yansitildi: false } })).toBe(0);
    expect(yansitilanKomisyon({ yontem: "Nakit", kartKomisyonu: kk })).toBe(0);
    expect(yansitilanKomisyon({ yontem: "Kredi Kartı" })).toBe(0);
    expect(yansitilanKomisyon(null)).toBe(0);
  });
});
