// Faaliyet Haritası penceresini hangi ekrana açacağımızı seçen saf mantık.
// Yanlış seçim = harita ana pencereyle aynı monitörde açılır (kullanıcının 2. monitör
// isteğini boşa çıkarır) ya da tek monitörde patlar.
import { describe, it, expect } from "vitest";
import { ikinciEkran, ekranKapsar } from "../electron/haritaEkran.cjs";

const ekran = (id, x, y, w, h, taskbar = 0) => ({
  id,
  bounds: { x, y, width: w, height: h },
  workArea: { x, y, width: w, height: h - taskbar },
});

describe("ikinciEkran", () => {
  it("iki ekranda ana pencerenin OLMADIĞI ekranın workArea'sını döndürür", () => {
    const sol = ekran(1, 0, 0, 1920, 1080, 40);
    const sag = ekran(2, 1920, 0, 2560, 1440, 40);
    // Ana pencere sol ekranda
    const wa = ikinciEkran([sol, sag], { x: 200, y: 100, width: 1280, height: 820 });
    expect(wa).toEqual({ x: 1920, y: 0, width: 2560, height: 1400 });
  });

  it("ana pencere hangi ekrandaysa onu ELEMEZ (ters yerleşim)", () => {
    const sol = ekran(1, 0, 0, 1920, 1080);
    const sag = ekran(2, 1920, 0, 2560, 1440);
    // Ana pencere SAĞ ekranda → sol dönmeli
    const wa = ikinciEkran([sol, sag], { x: 2100, y: 100, width: 1280, height: 820 });
    expect(wa).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });

  it("tek ekranda null döndürür (ana pencerenin üstünde varsayılan boyda açılsın)", () => {
    const tek = ekran(1, 0, 0, 1920, 1080);
    expect(ikinciEkran([tek], { x: 100, y: 100, width: 1280, height: 820 })).toBeNull();
  });

  it("bozuk/eksik girdilerde null (patlamaz)", () => {
    expect(ikinciEkran(null, { x: 0, y: 0, width: 100, height: 100 })).toBeNull();
    expect(ikinciEkran([], { x: 0, y: 0, width: 100, height: 100 })).toBeNull();
    expect(ikinciEkran([ekran(1, 0, 0, 100, 100), ekran(2, 200, 0, 100, 100)], null)).toBeNull();
  });

  it("workArea yoksa bounds'a düşer", () => {
    const sol = { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
    const sag = { id: 2, bounds: { x: 1920, y: 0, width: 1000, height: 800 } }; // workArea yok
    const wa = ikinciEkran([sol, sag], { x: 10, y: 10, width: 800, height: 600 });
    expect(wa).toEqual({ x: 1920, y: 0, width: 1000, height: 800 });
  });
});

describe("ekranKapsar", () => {
  it("nokta sınır içindeyse true, dışındaysa false", () => {
    const d = ekran(1, 0, 0, 1920, 1080);
    expect(ekranKapsar(d, { x: 960, y: 540 })).toBe(true);
    expect(ekranKapsar(d, { x: 1920, y: 540 })).toBe(false); // sağ kenar dışta (x < x+width)
    expect(ekranKapsar(d, { x: -1, y: 10 })).toBe(false);
  });
});
