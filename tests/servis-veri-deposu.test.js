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

// Spec 0129 R1–R3, AC-15, AC-21: ayrı pencerenin kayıt durumu kanalı (perde + son kayıt mesajı).
import { servisKayitDeposu, registerServisPencereHandlers } from "../electron/ipc/servis-pencere.cjs";
import { readFileSync } from "node:fs";

describe("Spec 0129: servisKayitDeposu ve kanal", () => {
  it("depo değişimi son durumla birleştirir, temizle boşaltır", () => {
    const d = servisKayitDeposu();
    expect(d.oku()).toBeNull();
    d.yaz({ perdeAcik: true, durum: "yolda" });
    d.yaz({ mesaj: { metin: "Hata", tur: "err", no: 3 } });
    expect(d.oku()).toEqual({ perdeAcik: true, durum: "yolda", mesaj: { metin: "Hata", tur: "err", no: 3 } });
    d.yaz({ perdeAcik: false, durum: "bos" });
    expect(d.oku()).toEqual({ perdeAcik: false, durum: "bos", mesaj: { metin: "Hata", tur: "err", no: 3 } });
    d.yaz(undefined); d.yaz("x");
    expect(d.oku().perdeAcik).toBe(false);
    d.temizle();
    expect(d.oku()).toBeNull();
  });

  const kur = (acik = true) => {
    const on = {}, handle = {};
    const ipcMain = { on: (k, f) => { on[k] = f; }, handle: (k, f) => { handle[k] = f; } };
    const gonderilen = [];
    const win = { isDestroyed: () => false, webContents: { send: (k, v) => gonderilen.push([k, v]) } };
    const r = registerServisPencereHandlers(ipcMain, { acVeyaOdakla: () => {}, getServisWin: () => (acik ? win : null), mutasyonAnaPencere: () => {} });
    return { on, handle, gonderilen, r };
  };
  it("AC-15: kayitPush önbelleğe alır ve açık pencereye tam durumu iletir; ilkKayitAl son durumu verir; kayitTemizle boşaltır", () => {
    const { on, handle, gonderilen, r } = kur();
    on["servis:kayitPush"]({}, { perdeAcik: true, durum: "yolda" });
    expect(gonderilen).toEqual([["servis:kayit", { perdeAcik: true, durum: "yolda" }]]);
    expect(handle["servis:ilkKayitAl"]()).toEqual({ perdeAcik: true, durum: "yolda" });
    // Kayıt sürerken kapatılan pencere: closed → temizle; yeniden açılan pencere asılı perde çekmez.
    r.kayitTemizle();
    expect(handle["servis:ilkKayitAl"]()).toBeNull();
    // Veri önbelleği temizlenmez (bugünkü davranış).
    on["servis:veriPush"]({}, { services: [] });
    r.kayitTemizle();
    expect(handle["servis:ilkKayitAl"]()).toBeNull();
    expect(r.depo.oku()).toEqual({ services: [] });
  });
  it("pencere kapalıyken kayitPush yalnız önbelleğe yazar, iletmez", () => {
    const { on, gonderilen } = kur(false);
    on["servis:kayitPush"]({}, { perdeAcik: true });
    expect(gonderilen).toEqual([]);
  });
  it("AC-15 (tarama): main.cjs temizliği yalnız closed'da yapar, uygulama kilidinin hide() yolunda yapmaz", () => {
    const m = readFileSync("electron/main.cjs", "utf8");
    const closed = m.slice(m.indexOf('servisWin.on("closed"'), m.indexOf("});", m.indexOf('servisWin.on("closed"')));
    expect(closed).toMatch(/servisIpc\?\.kayitTemizle\?\.\(\)/);
    expect(m.match(/kayitTemizle/g)).toHaveLength(1);
    const hideSatiri = m.split("\n").find(l => l.includes("servisWin.hide()"));
    expect(hideSatiri).toBeTruthy();
    expect(hideSatiri).not.toMatch(/kayitTemizle/);
  });
  it("AC-21 / C2: kanal gövdesi kayıt dizisi taşımaz (bölüm adı yok)", () => {
    const k = readFileSync("electron/ipc/servis-pencere.cjs", "utf8");
    const gov = k.slice(k.indexOf("function servisKayitDeposu"), k.indexOf("function registerServisPencereHandlers"))
      + k.slice(k.indexOf('ipcMain.on("servis:kayitPush"'), k.indexOf("return { depo"));
    for (const b of ["services", "partSales", "yedekParcaSatislar", "partStock", "dosyalar", "customers"]) expect(gov, b).not.toContain(b);
  });
});
