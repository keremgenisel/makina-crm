// Müşteri silme kaskadı saf yardımcıları (lib/musteriKaskad.js): bağlı kayıt sayımı, onay özeti,
// yedek parça dizisine kaskad (alıcı = müşteri → çöp; bayi alımı + tahsis → satış kalır, tahsis serbest metin).
import { describe, it, expect } from "vitest";
import { musteriBagliSayilar, bagliKayitOzeti, yedekParcaKaskad, silinenMakinaEtiketi, yedekParcaAlicisiMi, yedekParcaTahsisliMi } from "../src/lib/musteriKaskad";

const M = 500;
const veri = {
  services: [{ id: 1, customerId: M }, { id: 2, customerId: M, deletedAt: "x" }, { id: 3, customerId: 501 }],
  partSales: [{ id: 10, customerId: M, tur: "Kalıp" }],
  payments: [{ id: 20, customerId: M }, { id: 21, customerId: M }],
  yedekParcaSatislar: [
    { id: 30, aliciTipi: "musteri", musteriId: M, partId: "7", miktar: 2, tahsisler: [{ customerId: M, miktar: 2 }] },
    { id: 31, aliciTipi: "bayi", dealerId: 9, partId: "7", miktar: 5, tahsisler: [{ customerId: M, miktar: 1 }, { customerId: 501, miktar: 1 }] },
    { id: 32, aliciTipi: "musteri", musteriId: 501, partId: "8", miktar: 1, tahsisler: [] },
  ],
  gorusmeler: [{ id: 40, customerId: M }, { id: 41, customerId: M, deletedAt: "x" }],
  dosyalar: [{ id: 50, customerId: M }, { id: 51, dealerId: 9 }],
};

describe("musteriBagliSayilar / bagliKayitOzeti", () => {
  it("yalnız canlı ve bu müşteriye bağlı kayıtları sayar; bayi tahsisi ayrı", () => {
    expect(musteriBagliSayilar(M, veri)).toEqual({ servis: 1, kalip: 1, odeme: 2, yedekParca: 1, tahsis: 1, gorusme: 1, dosya: 1 });
    expect(musteriBagliSayilar(999, veri)).toEqual({ servis: 0, kalip: 0, odeme: 0, yedekParca: 0, tahsis: 0, gorusme: 0, dosya: 0 });
    expect(musteriBagliSayilar(M, {})).toEqual({ servis: 0, kalip: 0, odeme: 0, yedekParca: 0, tahsis: 0, gorusme: 0, dosya: 0 });
  });
  it("özet sıfırları atlar, hiçbiri yoksa boş", () => {
    expect(bagliKayitOzeti(musteriBagliSayilar(M, veri))).toBe("1 servis kaydı, 1 Extra Kalıp satışı, 1 yedek parça satışı, 2 ödeme/kapora kaydı, 1 görüşme, 1 dosya");
    expect(bagliKayitOzeti(musteriBagliSayilar(999, veri))).toBe("");
  });
});

describe("yedekParcaKaskad", () => {
  const ts = "2026-09-18T10:00:00.000Z";
  const sonuc = yedekParcaKaskad(veri.yedekParcaSatislar, M, ts, silinenMakinaEtiketi({ name: "BAL KÖFTE&BURGER", serialNo: "F11224822" }));
  it("alıcısı müşteri olan satış aynı damgayla çöpe gider (bayi alımı ve başka müşterininki kalır)", () => {
    expect(sonuc.find(s => s.id === 30).deletedAt).toBe(ts);
    expect(sonuc.find(s => s.id === 31).deletedAt).toBeUndefined();
    expect(sonuc.find(s => s.id === 32).deletedAt).toBeUndefined();
  });
  it("bayi alımındaki bu makinaya ait tahsis serbest metne çevrilir, diğer tahsis dokunulmaz", () => {
    const t = sonuc.find(s => s.id === 31).tahsisler;
    expect(t[0]).toEqual({ customerId: null, miktar: 1, makinaSerbest: "BAL KÖFTE&BURGER · F11224822 (silinen müşteri)" });
    expect(t[1]).toEqual({ customerId: 501, miktar: 1 });
  });
  it("zaten çöpteki alıcı satışı yeniden damgalanmaz (kendi damgasıyla kalır → ayrı geri alınır)", () => {
    const r = yedekParcaKaskad([{ id: 1, aliciTipi: "musteri", musteriId: M, deletedAt: "eski" }], M, ts, "e");
    expect(r[0].deletedAt).toBe("eski");
  });
  it("toplu satış (batchId) tüm satırlarıyla gider; dış firma alımı ve aliciTipi'siz eski kayıt alıcı sayılmaz", () => {
    const arr = [
      { id: 1, batchId: 77, aliciTipi: "musteri", musteriId: M, partId: "7", miktar: 1 },
      { id: 2, batchId: 77, aliciTipi: "musteri", musteriId: M, partId: "8", miktar: 2 },
      { id: 3, disFirma: true, disFirmaAd: "Dış Servis", partId: "7", miktar: 1, tahsisler: [{ customerId: M, miktar: 1 }] },
      { id: 4, dealerId: 9, musteriId: M, partId: "7", miktar: 1, tahsisler: [] }, // eski kayıt: aliciTipi yok → bayi
    ];
    const r = yedekParcaKaskad(arr, M, ts, "E");
    expect(r.filter(s => s.batchId === 77).every(s => s.deletedAt === ts)).toBe(true);
    expect(r[2].deletedAt).toBeUndefined();
    expect(r[2].tahsisler[0]).toEqual({ customerId: null, miktar: 1, makinaSerbest: "E" });
    expect(r[3].deletedAt).toBeUndefined();
    expect(r[3].tahsisler).toEqual([]);
    expect(musteriBagliSayilar(M, { yedekParcaSatislar: arr })).toMatchObject({ yedekParca: 2, tahsis: 1 });
  });
  it("etiket: ad/seri boşsa '?' düşer; yardımcılar tipe bakar", () => {
    expect(silinenMakinaEtiketi({})).toBe("? (silinen müşteri)");
    expect(silinenMakinaEtiketi({ name: "X" })).toBe("X (silinen müşteri)");
    expect(yedekParcaAlicisiMi({ aliciTipi: "bayi", musteriId: M }, M)).toBe(false);
    expect(yedekParcaTahsisliMi({ aliciTipi: "musteri", musteriId: M, tahsisler: [{ customerId: M }] }, M)).toBe(false); // alıcı zaten kendisi
  });
});
