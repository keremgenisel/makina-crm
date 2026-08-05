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
