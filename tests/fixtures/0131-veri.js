// Spec 0131: tahsilat günü test verisi. Altın (tests/fixtures/0131-once.json) bu veriyle spec ÖNCESİ koddan üretildi; veriyi
// değiştirmek altını geçersiz kılar. Hiçbir kayıtta tahsilatTarihi yok (spec öncesi gerçek verinin 2997/3012 hâli, ölçüm 2).
export const HESAPLAR = [
  { id: 1, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 1000, acilisTarihi: "2024-01-01" },
  { id: 2, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2024-01-01" },
  { id: 3, ad: "Dolar Hesabı", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, acilisTarihi: "2024-01-01" },
];
export const CUSTOMERS = [{ id: 10, name: "Ayhan Gıda", faturali: "Faturalı Yurtiçi" }, { id: 11, name: "Bafra Köfte", faturali: "Faturasız Yurtiçi" }];
export const DEALERS = [{ id: 20, name: "Bayi A", anlasmaliServisMi: true }];
export const FACTORY = { name: "Altuntaş Makina" };
export const BUGUN = "2026-11-04";
export const KDV = [{ from: "2008-01-01", rate: 18 }, { from: "2023-07-07", rate: 20 }];
const sv = (o) => ({ customerId: 10, type: "Garanti Dışı", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", islemFirma: "Altuntaş Makina", yontem: "Nakit", ...o });
const ks = (o) => ({ customerId: 10, tur: "Kalıp", ad: "Kalıp", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", yontem: "Nakit", ...o });
const yp = (o) => ({ aliciTipi: "bayi", dealerId: 20, partId: 5, miktar: 2, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", yontem: "Nakit", tahsisler: [], ...o });
export const veri = () => ({
  customers: CUSTOMERS, dealers: DEALERS, factory: FACTORY, kdvRates: KDV, bugun: BUGUN,
  payments: [{ id: 900, customerId: 10, tarih: "2026-10-03", tutar: 5000, currency: "TRY", yontem: "Havale", hesapId: 2 }],
  services: [
    sv({ id: 100, date: "2024-03-09", servisUcreti: 1500, odendi: true, hesapId: 1 }),
    sv({ id: 101, date: "2026-10-12", servisUcreti: 800, odendi: true }),
    sv({ id: 102, date: "2026-10-20", servisUcreti: 900, odendi: false }),
    sv({ id: 103, date: "2026-10-21", servisUcreti: 700, odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, hesapId: 2,
      kartKomisyonu: { toplamKesinti: 10, yansitildi: false, hesabaGecis: "2026-10-22", bazTarih: "2026-10-21" } }),
  ],
  partSales: [ks({ id: 200, tarih: "2025-06-01", ucret: 2000, odendi: true, hesapId: 1 }), ks({ id: 201, tarih: "2026-10-05", ucret: 1200, odendi: true })],
  yedekParcaSatislar: [
    yp({ id: 300, tarih: "2024-09-14", birimFiyat: 250, odendi: true, hesapId: 1 }),
    yp({ id: 301, tarih: "2026-10-15", birimFiyat: 100, currency: "USD", faturaTipi: "Faturalı Yurtdışı", odendi: true, hesapId: 3 }),
    yp({ id: 302, tarih: "2026-10-16", birimFiyat: 50, odendi: true }),
  ],
});
