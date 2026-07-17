// Uygulamanın şehir açılır listesi (CountryCityFields) ile harita dizini anlaşmalı.
// Liste İngilizce dış adları kullanıyor ("Cologne"), GeoNames'in asıl adı yerel ("Köln"):
// eşleşmezse kullanıcı listeden şehri seçiyor ama harita tanımıyor ve bu SESSİZCE oluyor.
import { describe, it, expect } from "vitest";
import { sadeAd } from "../src/lib/mapStats";
import * as DEU from "../src/lib/map/regions/DEU.js";
import * as TUR from "../src/lib/map/regions/TUR.js";
import { CITIES_TR } from "../src/lib/constants";

describe("şehir listesi ↔ harita dizini", () => {
  it("programın Almanya listesindeki İngilizce adlar haritada yerini bulur", () => {
    // Bunlar countriesnow'un Almanya listesinden: kullanıcının seçebildiği gerçek adlar.
    const beklenen = { cologne: "Kuzey Ren-Vestfalya", munich: "Bavyera", nuremberg: "Bavyera", hamburg: "Hamburg" };
    for (const [ad, bolge] of Object.entries(beklenen)) {
      const i = DEU.SEHIR[ad];
      expect(i, ad + " haritada yok").toBeDefined();
      expect(DEU.BOLGE_ADLARI[i]).toBe(bolge);
    }
  });

  it("yerel yazımlar da çalışmaya devam eder", () => {
    expect(DEU.BOLGE_ADLARI[DEU.SEHIR[sadeAd("Köln")]]).toBe("Kuzey Ren-Vestfalya");
  });

  it("pin konabilen büyük şehirlerin konumu var", () => {
    for (const ad of ["cologne", "munich", "hamburg"]) expect(DEU.KONUM[ad], ad).toBeTruthy();
  });

  it("Türkiye'nin 81 ilinin tamamı hâlâ yerini buluyor", () => {
    const eksik = CITIES_TR.filter((il) => TUR.SEHIR[sadeAd(il)] === undefined);
    expect(eksik).toEqual([]);
  });
});
