// Servis penceresi mount olmadan ana pencere veri push edebilir; yarışı kapatan güvence önbellek
// pull'u (servis:ilkVeriAl). Depo "en son push edilen görüntüyü oku" invaryantını tutmalı, yoksa
// pano penceresi boş açılır. (haritaVeriDeposu'nun eşi.)
import { describe, it, expect } from "vitest";
import { servisVeriDeposu } from "../electron/ipc/servis-pencere.cjs";

describe("servisVeriDeposu", () => {
  it("başlangıçta boş (null)", () => {
    const d = servisVeriDeposu();
    expect(d.oku()).toBeNull();
  });

  it("yazılan son görüntüyü döndürür (pull yarışsız)", () => {
    const d = servisVeriDeposu();
    const v1 = { services: [{ id: 1 }], tema: "light" };
    d.yaz(v1);
    expect(d.oku()).toBe(v1);
    const v2 = { services: [{ id: 1 }, { id: 2 }], tema: "dark" };
    d.yaz(v2);
    expect(d.oku()).toBe(v2); // en son push kazanır
  });

  it("null/undefined yazımı temizler (patlamaz)", () => {
    const d = servisVeriDeposu();
    d.yaz({ services: [] });
    d.yaz(undefined);
    expect(d.oku()).toBeNull();
  });
});
