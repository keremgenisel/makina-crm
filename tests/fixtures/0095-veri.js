// Spec 0095 AC-27 (plan adım 0): işaret alanı OLMAYAN veri kümesi. "Önce" çıktıları (tests/fixtures/0095-ucretsizsiz-once.json)
// bu veriyle, spec 0095'ten ÖNCEKİ kodla üretildi (YAZ_0095=1); veriyi değiştirmek altını geçersiz kılar.
// Temel spec 0079'un tevkifatsız kümesidir; üstüne bugünkü kaçamak (sıfır fiyatlı, ödenmemiş satış: müşteri ve bayi),
// çekle ödenmiş (tahsil edilmemiş ve edilmiş) ve dış firma satışları eklenir.
import { yedekParcaBedeli, isYedekParcaBorcluMu, customerHasAnyDebt } from "../../src/lib/utils";
import { hesaplaAylikRapor } from "../../src/lib/aylikRapor";
import { buildAylikRaporHtml } from "../../src/lib/printTemplates";
import { satisTahsilatKalemleri, tahsilatHesapDurumu, SATIS_KAYNAK } from "../../src/lib/satisTahsilat";
import { yedekParcaExportRow } from "../../src/components/settings/SettingsExport";
import { bayiBagliSayilar } from "../../src/lib/bayiKaskad";
import { sonSatislar } from "../../src/lib/dashboardStats";
import { CUSTOMERS, PAYMENTS, SERVICES, PART_SALES, YEDEK as YEDEK_0079, DEALERS, PARTS, KDV, FAB } from "./0079-veri";

export { CUSTOMERS, PAYMENTS, SERVICES, PART_SALES, DEALERS, PARTS, KDV, FAB };
export const YEDEK = [
  ...YEDEK_0079,
  // Bugünkü kaçamak: garanti parçası sıfır fiyatla, ödenmemiş (müşteri ve bayi alıcı).
  { id: 5101, aliciTipi: "musteri", musteriId: 1004, partId: "81", miktar: 2, birimFiyat: 0, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-05", odendi: false, tahsisler: [], kargoDurum: "Hazırlanıyor" },
  { id: 5102, aliciTipi: "bayi", dealerId: 71, partId: "82", miktar: 1, birimFiyat: 0, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-06", odendi: false, tahsisler: [], fabrikaTeslim: true },
  // Çekle ödenmiş: tahsil edilmemiş (borçlu) ve tahsil edilmiş.
  { id: 5103, aliciTipi: "musteri", musteriId: 1005, partId: "82", miktar: 2, birimFiyat: 80, currency: "EUR", faturaTipi: "Faturalı Yurtdışı", tarih: "2026-10-07", odendi: true,
    yontem: "Çek", vadeTarihi: "2026-12-10", tahsilEdildi: false, tahsisler: [] },
  { id: 5104, aliciTipi: "bayi", dealerId: 71, partId: "81", miktar: 5, birimFiyat: 300, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-08", odendi: true,
    yontem: "Çek", vadeTarihi: "2026-10-08", tahsilEdildi: true, tahsilatTarihi: "2026-10-08", tahsisler: [], hesapId: 61 },
  // Bilinmeyen para birimi (bugünkü TL kovası kuralı).
  { id: 5105, aliciTipi: "bayi", disFirma: true, disFirmaAd: "Batı Servis", partId: "82", miktar: 1, birimFiyat: 50, currency: "GBP", faturaTipi: "Faturasız Yurtiçi", tarih: "2026-10-09", odendi: false, tahsisler: [] },
];
export const VERI = { customers: CUSTOMERS, services: SERVICES, partSales: PART_SALES, payments: PAYMENTS, teklifler: [], dealers: DEALERS, yedekParcaSatislar: YEDEK };
export const SECENEK = { factoryName: FAB.name, kdvRates: KDV, factory: FAB };

export const motorCiktilari = (veri = VERI) => {
  const kayit = veri.yedekParcaSatislar.map(s => ({ id: s.id, bedel: yedekParcaBedeli(s), borclu: isYedekParcaBorcluMu(s),
    hesap: tahsilatHesapDurumu(SATIS_KAYNAK.YEDEK, s, { factoryName: FAB.name, kdvRates: KDV, dealers: veri.dealers, customers: veri.customers }) }));
  const tahsilat = satisTahsilatKalemleri(veri, { factoryName: FAB.name, kdvRates: KDV })
    .map(k => ({ kaynak: k.kaynak, id: k.kayit.id, bedel: k.bedel, kdv: k.kdv, tutar: k.tutar, currency: k.currency, tarih: k.tarih }));
  const borc = veri.customers.map(c => ({ id: c.id, borclu: customerHasAnyDebt(c, veri.services, veri.partSales, FAB.name, veri.yedekParcaSatislar) }));
  const rapor = (ay) => hesaplaAylikRapor(veri, ay, SECENEK);
  const eylul = rapor("2026-09"), ekim = rapor("2026-10");
  return JSON.parse(JSON.stringify({
    kayit, tahsilat, borc, eylul, ekim, eylulHtml: buildAylikRaporHtml(eylul, FAB), ekimHtml: buildAylikRaporHtml(ekim, FAB),
    yedekExport: veri.yedekParcaSatislar.map(s => yedekParcaExportRow(s, { dealers: veri.dealers, customers: veri.customers, parts: PARTS, kdvRates: KDV })),
    bayiSilme: veri.dealers.map(d => bayiBagliSayilar(d.id, veri)),
    sonSatislar: sonSatislar(veri.customers, veri.partSales, veri.yedekParcaSatislar, veri.dealers, PARTS, 50),
  }));
};
