// Harita penceresi mount olmadan ana pencere veri push edebilir; yarışı kapatan güvence
// önbellek pull'u (harita:ilkVeriAl). Bu depo "en son push edilen görüntüyü oku" invaryantını
// tutmalı, yoksa harita penceresi boş açılır.
import { describe, it, expect } from "vitest";
import { haritaVeriDeposu } from "../electron/ipc/harita.cjs";

describe("haritaVeriDeposu", () => {
  it("başlangıçta boş (null)", () => {
    const d = haritaVeriDeposu();
    expect(d.oku()).toBeNull();
  });

  it("yazılan son görüntüyü döndürür (pull yarışsız)", () => {
    const d = haritaVeriDeposu();
    const v1 = { customers: [{ id: 1 }], dealers: [], factory: null, tema: "light" };
    d.yaz(v1);
    expect(d.oku()).toBe(v1);
    const v2 = { customers: [{ id: 1 }, { id: 2 }], dealers: [], factory: null, tema: "dark" };
    d.yaz(v2);
    expect(d.oku()).toBe(v2); // en son push kazanır
  });

  it("null/undefined yazımı temizler (patlamaz)", () => {
    const d = haritaVeriDeposu();
    d.yaz({ customers: [] });
    d.yaz(undefined);
    expect(d.oku()).toBeNull();
  });
});
