// Veri Yönetimi > Dışa Aktar: yedek parça (kargo) satışları export satırı.
// Regresyon: anlaşmasız dış firma alıcı eskiden "—"/"Bayi" görünüyordu (aliciAd kullanılmıyordu);
// ayrıca teslim şekli ve farklı teslimat adresi sütunları yoktu.
import { describe, it, expect } from "vitest";
import { YEDEK_PARCA_EXPORT_HEAD, yedekParcaExportRow } from "../src/components/settings/SettingsExport";

const dealers = [{ id: 5, name: "Bayi X" }];
const customers = [{ id: 1, name: "Müşteri A" }];
const parts = [{ id: "7", ad: "Dişli" }];
const deps = { dealers, customers, parts };
const col = (row, ad) => row[YEDEK_PARCA_EXPORT_HEAD.indexOf(ad)];

describe("yedekParcaExportRow", () => {
  it("başlık yeni sütunları içerir", () => {
    for (const h of ["Teslim Şekli", "Farklı Teslimat Adresi", "Ödeme Yöntemi", "Çek Durumu"]) expect(YEDEK_PARCA_EXPORT_HEAD).toContain(h);
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
