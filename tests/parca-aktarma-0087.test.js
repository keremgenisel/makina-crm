// Spec 0087 R11 (AC-29, AC-30): parça dışa/içe aktarmasında maliyet SON sütundur; içe aktarma konuma göre eşler, boş hücre
// mevcut maliyeti korur ve yeni parçaya boş alan yazmaz; eski dokuz sütunlu şablon aynı sonucu verir. Taban çıktı spec öncesi
// koddan (aynen taşınmış çekirdek) üretildi: tests/fixtures/0087-aktarma-once.json.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PARCA_AKTARMA_BASLIKLARI, PARCA_SABLON_ORNEGI, parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula } from "../src/lib/parcaAktarma";
import { MEVCUT_PARCALAR, ESKI_SATIRLAR } from "./fixtures/0087-aktarma-girdisi.js";
// Spec 0097 ile (R20/2, plan P11): içe aktarma yerel günü zorunlu parametre olarak alır.
const BUGUN = "2026-10-20";

const ONCE = JSON.parse(readFileSync("tests/fixtures/0087-aktarma-once.json", "utf8"));

describe("Spec 0087: parça aktarması", () => {
  // Spec 0124 ile (R1, Karar 1): maliyet artık son değil onuncu sütun, on birincisi "Set İçeriği"; konuma göre eşleme iddiası aynen.
  it("AC-29: dışa aktarmada maliyet onuncu sütun (spec 0124 ile son değil); ilk dokuz sütun spec öncesiyle aynı, maliyetsiz hücre boş", () => {
    expect(PARCA_AKTARMA_BASLIKLARI).toHaveLength(11);
    expect(PARCA_AKTARMA_BASLIKLARI[9]).toBe("Maliyet (TL, KDV hariç)");
    expect(PARCA_SABLON_ORNEGI).toHaveLength(11);
    const satirlar = MEVCUT_PARCALAR.map(parcaDisaAktarmaSatiri);
    expect(satirlar.map(s => s.slice(0, 9))).toEqual(ONCE.disa);
    expect(satirlar.map(s => s[9])).toEqual([120.5, "", ""]);
  });

  it("AC-30: maliyet sütunu olmayan eski şablon spec öncesiyle birebir aynı sonucu verir (sütunlar kaymaz, alan yazılmaz)", () => {
    // Spec 0124 ile (R10): dönüşe `icerikYazilanlar` girdi; eski on sütunlu dosyada 0 ve öteki alanlar altınla birebir.
    const { icerikYazilanlar, ...coz } = parcaSatirlariniCoz(ESKI_SATIRLAR, MEVCUT_PARCALAR, 1000, BUGUN);
    expect(icerikYazilanlar).toBe(0);
    expect(coz).toEqual(ONCE.coz);
    expect(coz.parts.every(p => !("maliyet" in p))).toBe(true);
    const uygulanan = parcaIceAktarmaUygula(MEVCUT_PARCALAR, coz.parts);
    expect(uygulanan).toEqual(ONCE.uygulanan);
    expect(uygulanan.find(p => p.id === 7).maliyet).toBe(120.5);
  });

  it("AC-30: maliyet sütunu okunur (metin ve sayı hücresi), boş hücre mevcut maliyeti korur, yeni parçaya alan doğmaz", () => {
    const satirlar = [PARCA_AKTARMA_BASLIKLARI,
      ["Rulman", "", "", "", "", "", "", "", "", ""],
      ["Kayış", "", "", "", "", "", "", "", "", "7,50"],
      ["Yeni Pul", "", "", "", "", "", "", "", "", 1234.56],
      ["Yeni Vida", "", "", "", "", "", "", "", "", ""]];
    const coz = parcaSatirlariniCoz(satirlar, MEVCUT_PARCALAR, 2000, BUGUN);
    expect(coz.errors).toEqual([]);
    const ad = (a) => coz.parts.find(p => p.ad === a);
    expect("maliyet" in ad("Rulman")).toBe(false);
    expect(ad("Kayış").maliyet).toBe(7.5);
    expect(ad("Yeni Pul").maliyet).toBe(1234.56);
    expect("maliyet" in ad("Yeni Vida")).toBe(false);
    const u = parcaIceAktarmaUygula(MEVCUT_PARCALAR, coz.parts);
    expect(u.find(p => p.id === 7).maliyet).toBe(120.5);
    expect(u.find(p => p.id === 8).maliyet).toBe(7.5);
  });

  it("AC-7 (R14): içe aktarma önizlemesinin maliyet hataları parça formuyla aynı fonksiyondan; satır atlanmaz, maliyet alınmaz", () => {
    const coz = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ["Kayış", "", "", "", "", "", "", "", "", "-5"], ["Rulman", "", "", "", "", "", "", "", "", "abc"]], MEVCUT_PARCALAR, 3000, BUGUN);
    expect(coz.errors).toEqual(["Satır 2: Maliyet negatif olamaz. Maliyet alınmadı.", "Satır 3: Maliyet sayı olmalı. Maliyet alınmadı."]);
    expect(coz.parts.map(p => "maliyet" in p)).toEqual([false, false]);
    expect(parcaIceAktarmaUygula(MEVCUT_PARCALAR, coz.parts).find(p => p.id === 7).maliyet).toBe(120.5);
  });

  it("Triyaj bulgu 2: tek noktalı ve 3+ haneli ondalıklı METİN maliyet belirsizdir, sessizce büyümez, alınmaz; diğer biçimler aynı", () => {
    // Spec 0124 ile (R5/3, Karar 4): dosyada yinelenen ad artık atlanır; satırlar ayrı adlarla (iddia maliyet çözümü, aynı).
    let no = 0;
    const sat = (m) => [`Kayış ${++no}`, "", "", "", "", "", "", "", "", m];
    const coz = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, sat("48.5333"), sat("7.505"), sat("7.50"), sat("1.234,56"), sat("1.234.567"), sat(48.5333)], MEVCUT_PARCALAR, 4000, BUGUN);
    const b = "Maliyet belirsiz (nokta binlik mi ondalık mı anlaşılmıyor; ör. 1234,56 yazın), alınmadı.";
    expect(coz.errors).toEqual([`Satır 2: ${b}`, `Satır 3: ${b}`]);
    expect(coz.parts.map(p => p.maliyet)).toEqual([undefined, undefined, 7.5, 1234.56, 1234567, 48.53]);
  });
});
