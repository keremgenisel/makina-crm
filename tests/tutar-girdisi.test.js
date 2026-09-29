// Spec 0045: tutar girdisinin biçimlemesi (saf motor). İmleç hesabı DOM'suz ölçülür (AC-3, AC-6).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { tutarGosterim, tutarGirdisiIsle, hamaCevir } from "../src/lib/tutarGirdisi";
import { tutarCoz } from "../src/lib/gider";

// Harf harf yazma benzetimi: her tuş imlecin olduğu yere eklenir, sonuç bir sonrakinin "önceki"si olur.
const yaz = (tuslar, bas = { gosterim: "", imlec: 0 }) => {
  let d = { ham: hamaCevir(bas.gosterim) ?? "", ...bas };
  for (const t of tuslar) {
    const yeni = d.gosterim.slice(0, d.imlec) + t + d.gosterim.slice(d.imlec);
    d = tutarGirdisiIsle({ yeni, onceki: d.gosterim, imlec: d.imlec + t.length });
  }
  return d;
};
// Geri silme / Delete benzetimi.
const sil = (gosterim, imlec, tus = "Backspace") => {
  const yeni = tus === "Backspace" ? gosterim.slice(0, imlec - 1) + gosterim.slice(imlec) : gosterim.slice(0, imlec) + gosterim.slice(imlec + 1);
  return tutarGirdisiIsle({ yeni, onceki: gosterim, imlec: tus === "Backspace" ? imlec - 1 : imlec, tus });
};

describe("Spec 0045: tutar girdisi (saf)", () => {
  it("AC-1: \"80000\" yazılınca \"80.000\" görünür, ham değer noktasız", () => {
    const d = yaz("80000");
    expect(d).toMatchObject({ gosterim: "80.000", ham: "80000", imlec: 6 });
  });
  it("AC-2: \"1234,56\" yazılınca \"1.234,56\" görünür, kuruş korunur", () => {
    const d = yaz("1234,56");
    expect(d.gosterim).toBe("1.234,56");
    expect(tutarCoz(d.ham).deger).toBe(1234.56);
  });
  it("AC-3: sayının ortasına rakam eklenince imleç eklenen rakamın sağında kalır", () => {
    // "80.000" içinde "80" ile "." arasına 5 → "805.000", imleç 5'in sağında (3).
    const d = tutarGirdisiIsle({ yeni: "805.000", onceki: "80.000", imlec: 3 });
    expect(d).toMatchObject({ gosterim: "805.000", imlec: 3 });
    // Ayraç doğarken: "1.234" başına 9 → "91.234", imleç 9'un sağında (1).
    expect(tutarGirdisiIsle({ yeni: "91.234", onceki: "1.234", imlec: 1 })).toMatchObject({ gosterim: "91.234", imlec: 1 });
    // Ayraç kayarken: "999" içine (ikinci 9'dan sonra) 1 → "9.919", imleç 1'in sağında.
    const k = tutarGirdisiIsle({ yeni: "9919", onceki: "999", imlec: 3 });
    expect(k.gosterim).toBe("9.919");
    expect(k.gosterim.slice(0, k.imlec)).toBe("9.91");
  });
  it("AC-4: yarım girdi korunur (\"80000,\" ve \"1.234,5\")", () => {
    expect(yaz("80000,").gosterim).toBe("80.000,");
    expect(yaz("1234,5").gosterim).toBe("1.234,5");
    expect(yaz("80000,").ham).toBe("80000,");
  });
  it("AC-5: yapıştırılan \"1.234,56\", \"1234,56\" ve \"1234.56\" aynı tutarı okur", () => {
    for (const p of ["1.234,56", "1234,56", "1234.56"]) {
      const d = tutarGirdisiIsle({ yeni: p, onceki: "", imlec: p.length });
      expect(d.gosterim, p).toBe("1.234,56");
      expect(tutarCoz(d.ham).deger, p).toBe(1234.56);
    }
    expect(tutarGirdisiIsle({ yeni: "1.234", onceki: "", imlec: 5 }).ham).toBe("1234"); // binlik
  });
  it("AC-6: geri silme ayracın üzerinden geçerken tek vuruşta bir rakam siler; Delete simetriği", () => {
    // "80.000", imleç noktanın sağında (3): geri silme 0'ı siler → "8.000".
    const d = sil("80.000", 3);
    expect(d).toMatchObject({ gosterim: "8.000", ham: "8000" });
    expect(d.gosterim.slice(0, d.imlec)).toBe("8");
    // Delete, imleç noktanın solunda (2): sağdaki rakam gider → "8.000".
    expect(sil("80.000", 2, "Delete")).toMatchObject({ gosterim: "8.000", ham: "8000" });
    // Sıradan geri silme: "1.234" sonundan → "123".
    expect(sil("1.234", 5)).toMatchObject({ gosterim: "123", imlec: 3 });
  });
  it("AC-9: boş alan boş kalır, sıfır yazılmaz", () => {
    expect(tutarGosterim("")).toBe("");
    expect(tutarGosterim(null)).toBe("");
    expect(sil("5", 1)).toEqual({ ham: "", gosterim: "", imlec: 0 });
  });
  it("Q2: yazarken nokta binliktir ve yok sayılır (\"80.000\" yazan 80.000 kaydeder)", () => {
    const d = yaz("80.000");
    expect(d).toMatchObject({ gosterim: "80.000", ham: "80000" });
    expect(tutarCoz(d.ham).deger).toBe(80000);
  });
  it("Q4: üçüncü ondalık hane yazılamaz; gelen değer kesilmez", () => {
    expect(yaz("12,345").gosterim).toBe("12,34");
    expect(tutarGosterim("1234,567")).toBe("1.234,567");
  });
  it("Q5 / AC-10: geçersiz metin biçimlenmez, tutarCoz bugünkü gibi geçersiz der", () => {
    const d = tutarGirdisiIsle({ yeni: "12a", onceki: "12", imlec: 3 });
    expect(d).toMatchObject({ ham: "12a", gosterim: "12a" });
    expect(tutarCoz(d.ham).gecersiz).toBe(true);
    expect(tutarGosterim("1,2,3")).toBe("1,2,3");
  });
  it("tutarGosterim: kayıttan gelen sayı ve eksi değer", () => {
    expect(tutarGosterim(39223.13)).toBe("39.223,13");
    expect(tutarGosterim("-1500")).toBe("-1.500");
  });
  it("AC-7: aynı giriş aynı değeri kaydeder (ham ile özgün girdinin tutarCoz değeri eşit)", () => {
    // Türkçe biçimli girdiler harf harf; yapıştırma kolunda İngilizce ondalık dahil (Q2 sapması yalnız harf harf "12.5").
    for (const g of ["80000", "80.000", "1234,56", "1.234,56", "39223,13", "0,5", "100000", "-250"]) {
      expect(tutarCoz(yaz(g).ham).deger, g).toBe(tutarCoz(g).deger);
    }
    for (const g of ["1234.56", "12.5", "1.234.567,89", "₺ 2.500"]) {
      expect(tutarCoz(tutarGirdisiIsle({ yeni: g, onceki: "", imlec: g.length }).ham).deger, g).toBe(tutarCoz(g).deger);
    }
  });
  it("C2: biçimleme tek yerde; ekranlar kendi tutar biçimleyicisini yazmaz", () => {
    const dosyalar = [];
    const gez = (d) => { for (const a of readdirSync(d)) { const y = path.join(d, a); if (statSync(y).isDirectory()) gez(y); else if (/\.jsx?$/.test(a)) dosyalar.push(y); } };
    gez("src");
    const kullanan = dosyalar.filter(f => /tutarGirdisiIsle|hamaCevir/.test(readFileSync(f, "utf8")));
    expect(kullanan.map(f => f.split(path.sep).join("/")).sort()).toEqual(["src/components/gider/GiderAlanlari.jsx", "src/lib/tutarGirdisi.js"]);
  });
});
