// Veri Yönetimi > Dışa Aktar: yedek parça (kargo) satışları export satırı.
// Regresyon: anlaşmasız dış firma alıcı eskiden "—"/"Bayi" görünüyordu (aliciAd kullanılmıyordu);
// ayrıca teslim şekli ve farklı teslimat adresi sütunları yoktu.
import { describe, it, expect } from "vitest";
import { YEDEK_PARCA_EXPORT_HEAD, yedekParcaExportRow, komisyonYansitildiEtiket, urunBedeliKomisyonHaric } from "../src/components/settings/SettingsExport";

const dealers = [{ id: 5, name: "Bayi X" }];
const customers = [{ id: 1, name: "Müşteri A" }];
const parts = [{ id: "7", ad: "Dişli" }];
const deps = { dealers, customers, parts };
const col = (row, ad) => row[YEDEK_PARCA_EXPORT_HEAD.indexOf(ad)];

describe("yedekParcaExportRow", () => {
  it("başlık yeni sütunları içerir", () => {
    for (const h of ["Teslim Şekli", "Farklı Teslimat Adresi", "Ödeme Yöntemi", "Çek Durumu"]) expect(YEDEK_PARCA_EXPORT_HEAD).toContain(h);
  });

  it("komisyon müşteriye yansıtıldı sütunu (Evet/Hayır/boş)", () => {
    expect(YEDEK_PARCA_EXPORT_HEAD).toContain("Komisyon Müşteriye Yansıtıldı");
    const yansit = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { toplamKesinti: 300, yansitildi: true } }, deps);
    expect(col(yansit, "Komisyon Müşteriye Yansıtıldı")).toBe("Evet");
    const ustlendik = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { toplamKesinti: 300, yansitildi: false } }, deps);
    expect(col(ustlendik, "Komisyon Müşteriye Yansıtıldı")).toBe("Hayır");
    const cekYok = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, odendi: true, yontem: "Nakit" }, deps);
    expect(col(cekYok, "Komisyon Müşteriye Yansıtıldı")).toBe(""); // KK değil → boş
  });
  it("ürün bedeli (komisyon hariç): yansıtta matrah − komisyon; yansıt yoksa aynı", () => {
    expect(YEDEK_PARCA_EXPORT_HEAD).toContain("Ürün Bedeli (Komisyon Hariç)");
    // 5 adet × 2200 = 11.000 matrah; komisyon 1000 → ürün bedeli 10.000
    const yansit = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, birimFiyat: 2200, odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { toplamKesinti: 1000, yansitildi: true } }, deps);
    expect(col(yansit, "Toplam")).toBe(11000);
    expect(col(yansit, "Ürün Bedeli (Komisyon Hariç)")).toBe(10000);
    // yansıt yok → aynı
    const nakit = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 5, birimFiyat: 2000, odendi: true, yontem: "Nakit" }, deps);
    expect(col(nakit, "Ürün Bedeli (Komisyon Hariç)")).toBe(10000);
  });
  it("urunBedeliKomisyonHaric saf yardımcısı (orantılı düşüm)", () => {
    const rec = { yontem: "Kredi Kartı", kartKomisyonu: { yansitildi: true, toplamKesinti: 1000 } };
    expect(urunBedeliKomisyonHaric(11000, rec)).toBe(10000);                 // tek bedel
    expect(urunBedeliKomisyonHaric(5500, rec, 11000)).toBe(5000);            // matrahTotal=11000 → orantılı yarısı
    expect(urunBedeliKomisyonHaric(11000, { yontem: "Nakit" })).toBe(11000); // yansıt yok
  });
  it("komisyonYansitildiEtiket saf yardımcısı", () => {
    expect(komisyonYansitildiEtiket({ yontem: "Kredi Kartı", kartKomisyonu: { yansitildi: true } })).toBe("Evet");
    expect(komisyonYansitildiEtiket({ yontem: "Kredi Kartı", kartKomisyonu: { yansitildi: false } })).toBe("Hayır");
    expect(komisyonYansitildiEtiket({ yontem: "Çek" })).toBe("");
    expect(komisyonYansitildiEtiket(null)).toBe("");
  });

  it("ödeme yöntemi + çek durumu sütunları", () => {
    const cek = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, odendi: true, yontem: "Çek", tahsilEdildi: false }, deps);
    expect(col(cek, "Ödendi")).toBe("Evet");
    expect(col(cek, "Ödeme Yöntemi")).toBe("Çek");
    expect(col(cek, "Çek Durumu")).toBe("Beklemede");
    const nakit = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, odendi: true, yontem: "Nakit" }, deps);
    expect(col(nakit, "Ödeme Yöntemi")).toBe("Nakit");
    expect(col(nakit, "Çek Durumu")).toBe("");
    const odenmemis = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, odendi: false }, deps);
    expect(col(odenmemis, "Ödeme Yöntemi")).toBe(""); // ödenmemişte yöntem boş
  });

  it("müşteri alıcı: tür 'Müşteri', ad doğru", () => {
    const r = yedekParcaExportRow({ aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 3, kargoDurum: "Hazırlanıyor" }, deps);
    expect(col(r, "Alıcı Tipi")).toBe("Müşteri");
    expect(col(r, "Alıcı")).toBe("Müşteri A");
    expect(col(r, "Teslim Şekli")).toBe("Kargo");
  });

  it("bayi alıcı: tür 'Bayi', ad bayi adından", () => {
    const r = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2 }, deps);
    expect(col(r, "Alıcı Tipi")).toBe("Bayi");
    expect(col(r, "Alıcı")).toBe("Bayi X");
    expect(col(r, "Teslim Şekli")).toBe("—"); // panoda değil
  });

  it("anlaşmasız dış firma alıcı: tür 'Anlaşmasız Servis', ad dış firma adından (regresyon)", () => {
    const r = yedekParcaExportRow({ aliciTipi: "bayi", disFirma: true, disFirmaAd: "Servis Dükkanı", partId: "7", miktar: 1 }, deps);
    expect(col(r, "Alıcı Tipi")).toBe("Anlaşmasız Servis");
    expect(col(r, "Alıcı")).toBe("Servis Dükkanı"); // eskiden "—"/"Bayi" idi
  });

  it("fabrika teslim: teslim şekli 'Fabrika Teslim'", () => {
    const r = yedekParcaExportRow({ aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 1, fabrikaTeslim: true, kargoDurum: "Hazırlanıyor" }, deps);
    expect(col(r, "Teslim Şekli")).toBe("Fabrika Teslim");
  });

  it("farklı teslimat adresi: birleşik metin; farklı değilse boş", () => {
    const r = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, teslimatFarkli: true, teslimatAd: "Yılmaz Plastik", teslimatAdres: "OSB No:2", teslimatSehir: "İzmir", teslimatIlce: "Çiğli", teslimatUlke: "Türkiye" }, deps);
    const adres = col(r, "Farklı Teslimat Adresi");
    expect(adres).toContain("Yılmaz Plastik");
    expect(adres).toContain("Çiğli / İzmir");
    const r2 = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1 }, deps);
    expect(col(r2, "Farklı Teslimat Adresi")).toBe("");
  });
});

import { kartTaksitEtiket, kartKomisyonTutar } from "../src/components/settings/SettingsExport";

describe("kredi kartı export kolonları (taksit + komisyon)", () => {
  it("başlıkta Taksit Sayısı + Kredi Kartı Komisyonu var", () => {
    for (const h of ["Taksit Sayısı", "Kredi Kartı Komisyonu"]) expect(YEDEK_PARCA_EXPORT_HEAD).toContain(h);
  });
  it("kredi kartı satırında taksit etiketi + komisyon tutarı çıkar", () => {
    const rec = { yontem: "Kredi Kartı", taksitSayisi: 3, kartKomisyonu: { toplamKesinti: 7.97 } };
    expect(kartTaksitEtiket(rec)).toBe("3 Taksit");
    expect(kartKomisyonTutar(rec)).toBe(7.97);
    expect(kartTaksitEtiket({ yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: {} })).toBe("Tek Çekim");
  });
  it("kredi kartı değilse boş", () => {
    expect(kartTaksitEtiket({ yontem: "Nakit" })).toBe("");
    expect(kartKomisyonTutar({ yontem: "Çek", kartKomisyonu: { toplamKesinti: 5 } })).toBe("");
  });
  it("yedek parça export satırında kredi kartı kolonları dolu gelir", () => {
    const row = yedekParcaExportRow({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, birimFiyat: 100, currency: "TRY", odendi: true, yontem: "Kredi Kartı", taksitSayisi: 6, kartKomisyonu: { toplamKesinti: 60.54 } }, deps);
    expect(col(row, "Taksit Sayısı")).toBe("6 Taksit");
    expect(col(row, "Kredi Kartı Komisyonu")).toBe(60.54);
  });
});
