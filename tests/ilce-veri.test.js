// Form listesi ile harita verisinin anlaştığını korur. İkisi de üretici script tarafından
// AYNI kaynaktan üretiliyor; biri değişip diğeri kalırsa kullanıcı formda ilçe seçer ama
// harita boyamaz ve bu sessizce olur. Spec 0094: liste on dört ilden on dokuza çıktı; testler
// kanıtladıkları kabul kriterinin adını taşır (R10/2, AC-33).
import { describe, it, expect } from "vitest";
import { ILCE_ILLERI, ILCELER } from "../src/lib/map/ilceler";
import { META } from "../src/lib/map/meta";
import { CITIES_TR } from "../src/lib/constants";
import { sadeAd } from "../src/lib/mapStats";

const ilceModulleri = import.meta.glob("../src/lib/map/ilce/*.js", { eager: true });
const modul = (il) => ilceModulleri["../src/lib/map/ilce/" + sadeAd(il) + ".js"];
const ESKI_14 = ["İstanbul", "Ankara", "İzmir", "Manisa", "Antalya", "Tekirdağ",
  "Bursa", "Balıkesir", "Konya", "Kocaeli", "Muğla", "Samsun", "Çanakkale", "Hatay"];
const YENI_5 = ["Aydın", "Sakarya", "Eskişehir", "Gaziantep", "Yalova"];

describe("ilçe verisi", () => {
  it("AC-1 / AC-28: ilçe kırılımı olan 19 il; beş yeni il Hatay'dan sonra, mevcut on dördün sırası değişmedi", () => {
    expect(ILCE_ILLERI).toEqual([...ESKI_14, ...YENI_5]);
  });

  it("AC-2 / AC-27 (program listesi yarısı): her il programın 81 il listesinde birebir aynı yazımla var", () => {
    for (const il of ILCE_ILLERI) expect(CITIES_TR, il).toContain(il);
  });

  it("AC-3 / AC-9: resmî ilçe sayıları tutuyor (mevcut on dört ve yeni beş il)", () => {
    // Kaynak hatası ya da il/ilçe eşleştirmesinin bozulması buradan yakalanır.
    const RESMI = { "İstanbul": 39, "Ankara": 25, "İzmir": 30, "Manisa": 17, "Antalya": 19,
      "Tekirdağ": 11, "Bursa": 17, "Balıkesir": 20, "Konya": 31, "Kocaeli": 12, "Muğla": 13,
      "Samsun": 17, "Çanakkale": 12, "Hatay": 16,
      "Aydın": 17, "Sakarya": 16, "Eskişehir": 14, "Gaziantep": 9, "Yalova": 6 };
    expect(Object.keys(RESMI).sort()).toEqual([...ILCE_ILLERI].sort());
    for (const [il, n] of Object.entries(RESMI)) expect(ILCELER[il], il).toHaveLength(n);
  });

  it("AC-4: her ilin harita dosyası var ve form listesiyle AYNI ilçe kümesini içeriyor", () => {
    for (const il of ILCE_ILLERI) {
      const m = modul(il);
      expect(m, il + " için harita dosyası yok").toBeTruthy();
      expect(m.ILCE_ADLARI.length).toBe(m.ILCELER.length);
      expect([...m.ILCE_ADLARI].sort()).toEqual([...ILCELER[il]].sort());
    }
  });

  it("AC-8: bilinen ilçeler doğru ilde (mevcut ve yeni iller)", () => {
    expect(ILCELER["İstanbul"]).toContain("Kadıköy");
    expect(ILCELER["İstanbul"]).toContain("Tuzla");      // Kocaeli'ye düşmüştü, düzeltildi
    expect(ILCELER["Kocaeli"]).not.toContain("Tuzla");
    expect(ILCELER["Kocaeli"]).toContain("Gebze");
    expect(ILCELER["Ankara"]).toContain("Çankaya");
    expect(ILCELER["İzmir"]).toContain("Bornova");
    // Türkçe ad düzeltmesi: geoBoundaries "Imbros"/"Ayvacik" → resmî "Gökçeada"/"Ayvacık"
    expect(ILCELER["Çanakkale"]).toContain("Gökçeada");
    expect(ILCELER["Çanakkale"]).not.toContain("Imbros");
    expect(ILCELER["Çanakkale"]).toContain("Ayvacık");
    const BILINEN = { "Aydın": ["Kuşadası", "Didim"], "Sakarya": ["Adapazarı", "Sapanca"], "Eskişehir": ["Odunpazarı", "Tepebaşı"],
      "Gaziantep": ["Şahinbey", "Şehitkamil"], "Yalova": ["Çınarcık"] };
    for (const [il, adlar] of Object.entries(BILINEN)) for (const ad of adlar) expect(ILCELER[il], `${il} ${ad}`).toContain(ad);
  });

  it("AC-6 / AC-7: Yalova'nın merkez ilçesi 'Yalova'; 'Yalova merkez' ne form listesinde ne çizim dosyasında", () => {
    expect(ILCELER["Yalova"]).toContain("Yalova");
    expect(ILCELER["Yalova"]).not.toContain("Yalova merkez");
    expect(modul("Yalova").ILCE_ADLARI).toContain("Yalova");
    expect(modul("Yalova").ILCE_ADLARI).not.toContain("Yalova merkez");
  });

  it("AC-6/2: 'Çanakkale merkez' bilinçli olarak duruyor (kayıtlarda bu ad olabilir, X7)", () => {
    expect(ILCELER["Çanakkale"]).toContain("Çanakkale merkez");
    expect(modul("Çanakkale").ILCE_ADLARI).toContain("Çanakkale merkez");
  });

  it("AC-5: çizim verisi boş değil, genişlik W = 1000, yükseklik ilin kendi oranından", () => {
    for (const il of ILCE_ILLERI) {
      const m = modul(il);
      for (const d of m.ILCELER) expect(d.startsWith("M")).toBe(true);
      expect(m.W).toBe(1000);
      expect(m.H).toBeGreaterThan(0);
    }
  });

  it("AC-12: üretim özeti ilçe kırılımı olan il sayısını on dokuz yazar", () => {
    expect(META.ilceIlleri).toBe(19);
    expect(META.ilceIlleri).toBe(ILCE_ILLERI.length);
  });
});
