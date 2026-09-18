// Bayi silme kaskadı saf yardımcıları (lib/bayiKaskad.js): bağlı kayıt sayımı + açık alacak, özet, kaskad.
import { describe, it, expect } from "vitest";
import { bayiBagliSayilar, bayiBagliOzeti, yedekParcaBayiKaskad, yedekParcaBayininMi, bayiDosyasiMi } from "../src/lib/bayiKaskad";

const B = 9;
const yp = [
  { id: 1, aliciTipi: "bayi", dealerId: B, partId: "7", miktar: 2, birimFiyat: 100, currency: "TRY", odendi: false, batchId: 77 },
  { id: 2, aliciTipi: "bayi", dealerId: B, partId: "8", miktar: 1, birimFiyat: 50, currency: "TRY", odendi: true, batchId: 77 },
  { id: 3, dealerId: B, partId: "7", miktar: 1, birimFiyat: 30, currency: "USD", odendi: false },          // aliciTipi'siz eski kayıt → bayi
  { id: 4, aliciTipi: "bayi", dealerId: 10, partId: "7", miktar: 1, birimFiyat: 999, odendi: false },          // başka bayi
  { id: 5, aliciTipi: "musteri", musteriId: 1, dealerId: B, partId: "7", miktar: 1, birimFiyat: 999, odendi: false }, // müşteri alımı
  { id: 6, disFirma: true, dealerId: B, disFirmaAd: "Dış", partId: "7", miktar: 1, birimFiyat: 999, odendi: false },  // dış firma
  { id: 7, aliciTipi: "bayi", dealerId: B, partId: "7", miktar: 1, birimFiyat: 5, odendi: false, deletedAt: "eski" },  // zaten çöpte
];
const dosyalar = [{ id: 20, dealerId: B, ad: "a.pdf" }, { id: 21, dealerId: B, customerId: 3, ad: "m.pdf" }, { id: 22, dealerId: 10, ad: "b.pdf" }, { id: 23, dealerId: B, ad: "c.pdf", deletedAt: "x" }];

describe("bayiBagliSayilar / bayiBagliOzeti", () => {
  it("alıcısı bayi olan canlı satışları (eski kayıt dahil) ve bayi dosyalarını sayar; ödenmemişlerin alacağını para birimiyle toplar", () => {
    const s = bayiBagliSayilar(B, { yedekParcaSatislar: yp, dosyalar });
    expect(s).toEqual({ yedekParca: 3, odenmemis: 2, acikAlacak: { TRY: 200, USD: 30 }, dosya: 1 });
    expect(bayiBagliOzeti(s)).toBe("3 yedek parça satışı, 1 dosya");
    expect(bayiBagliOzeti(bayiBagliSayilar(999, { yedekParcaSatislar: yp, dosyalar }))).toBe("");
    expect(bayiBagliSayilar(B)).toEqual({ yedekParca: 0, odenmemis: 0, acikAlacak: {}, dosya: 0 });
  });
});

describe("yedekParcaBayiKaskad", () => {
  const ts = "2026-09-18T10:00:00.000Z";
  const r = yedekParcaBayiKaskad(yp, B, ts);
  it("bu bayinin canlı satışları (batch'in tüm satırları, eski kayıt) aynı damgayla çöpe; diğerleri dokunulmaz", () => {
    expect(r.filter(s => [1, 2, 3].includes(s.id)).every(s => s.deletedAt === ts)).toBe(true);
    expect(r.find(s => s.id === 4).deletedAt).toBeUndefined();
    expect(r.find(s => s.id === 5).deletedAt).toBeUndefined();
    expect(r.find(s => s.id === 6).deletedAt).toBeUndefined();
    expect(r.find(s => s.id === 7).deletedAt).toBe("eski");
  });
  it("yardımcılar tipe bakar", () => {
    expect(yedekParcaBayininMi({ aliciTipi: "musteri", dealerId: B }, B)).toBe(false);
    expect(yedekParcaBayininMi({ disFirma: true, dealerId: B }, B)).toBe(false);
    expect(bayiDosyasiMi({ dealerId: B, customerId: 3 }, B)).toBe(false);
    expect(bayiDosyasiMi({ dealerId: B }, B)).toBe(true);
  });
});
