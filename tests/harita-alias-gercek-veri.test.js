// Şehir takma adlarını GERÇEK harita verisiyle (fake dizin değil) uçtan uca doğrular.
// Kullanıcının bildirdiği iki kaçak: Afganistan "Sharif" (dizinde "Mazar-e Sharif") ve
// Almanya "München" (dizinde İngilizce "Munich"). Bunlar ya da bölge verisi ayrışırsa
// şehir haritada sessizce boyanmaz — bu test o eşleşmeyi kilitler.
import { describe, it, expect } from "vitest";
import { bolgeToplami } from "../src/lib/mapStats";
import { SEHIR as AFG_SEHIR, BOLGE_ADLARI as AFG_BOLGE } from "../src/lib/map/regions/AFG.js";
import { SEHIR as DEU_SEHIR, BOLGE_ADLARI as DEU_BOLGE } from "../src/lib/map/regions/DEU.js";

const bolgeAdi = (bolgeler, adlar) => Object.keys(bolgeler).map((i) => adlar[i]);

describe("takma adlar gerçek bölge verisine oturuyor", () => {
  it("Afganistan: 'Sharif' → Belh Vilayeti (Mazar-e Sharif)", () => {
    const { bolgeler, eslesmeyen } = bolgeToplami({ "Sharif": 3 }, AFG_SEHIR);
    expect(eslesmeyen).toEqual([]);
    expect(bolgeAdi(bolgeler, AFG_BOLGE)).toEqual(["Belh Vilayeti"]);
    expect(Object.values(bolgeler)).toEqual([3]);
  });

  it("Almanya: 'München' → Bavyera", () => {
    const { bolgeler, eslesmeyen } = bolgeToplami({ "München": 2 }, DEU_SEHIR);
    expect(eslesmeyen).toEqual([]);
    expect(bolgeAdi(bolgeler, DEU_BOLGE)).toEqual(["Bavyera"]);
    expect(Object.values(bolgeler)).toEqual([2]);
  });

  it("takma adsız da çalışır: Almanya 'Köln' → Kuzey Ren-Vestfalya", () => {
    const { bolgeler, eslesmeyen } = bolgeToplami({ "Köln": 1 }, DEU_SEHIR);
    expect(eslesmeyen).toEqual([]);
    expect(bolgeAdi(bolgeler, DEU_BOLGE)).toEqual(["Kuzey Ren-Vestfalya"]);
  });
});
