// Aylık Faaliyet Raporu hesap motoru: ay sınırları, gerçekleşen tahsilat kuralı,
// servis gelir kuralları, silinmiş kayıtlar ve önceki ay.
import { describe, it, expect } from "vitest";
import { hesaplaAylikRapor, oncekiAyStr } from "../src/lib/aylikRapor";

const kdvRates = [{ from: "2000-01-01", rate: 20 }];
const secenekler = { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } };

const veri = {
  customers: [
    { id: 1, name: "A", model: "AK100", installDate: "2026-06-10", currency: "TRY", fabrikaSatisBedeli: 800000, faturaBedeli: 600000, faturali: "Faturalı Yurtiçi", komisyon: 20000, kalanBorc: 100000, satisYapan: "Altuntaş Makina" },
    { id: 2, name: "B", model: "AK100", installDate: "2026-05-28", currency: "USD", fabrikaSatisBedeli: 15000, faturali: "Faturalı Yurtdışı", kalanBorc: 0 },
    { id: 3, name: "C", model: "AK140", installDate: "2026-06-20", currency: "TRY", fabrikaSatisBedeli: 900000, faturali: "Faturasız Yurtiçi", kalanBorc: 0, deletedAt: "2026-06-25" },
    { id: 4, name: "D (2.el)", model: "AK100", installDate: "2026-06-15", isResale: true, currency: "TRY", kalanBorc: 0 },
  ],
  services: [
    { id: 10, customerId: 1, date: "2026-06-12", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: "Altuntaş Makina", odendi: false, faturaTipi: "Faturalı Yurtiçi" },
    { id: 11, customerId: 1, date: "2026-06-13", type: "Garanti İçi", servisUcreti: 4000, currency: "TRY", islemFirma: "Altuntaş Makina", odendi: false },
    { id: 12, customerId: 1, date: "2026-06-14", type: "Garanti Dışı", servisUcreti: 3000, currency: "TRY", islemFirma: "Ege Servis", odendi: false },
  ],
  partSales: [
    { id: 20, customerId: 1, tur: "Kalıp", tarih: "2026-06-05", ucret: 25000, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", odendi: true },
    { id: 21, customerId: 1, tur: "Kalıp", tarih: "2026-07-05", ucret: 99999, currency: "TRY", odendi: true },
  ],
  payments: [
    { id: 30, customerId: 1, tarih: "2026-06-08", tutar: 200000, currency: "TRY", yontem: "Nakit" },
    { id: 31, customerId: 1, tarih: "2026-06-09", tutar: 150000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-09-01", tahsilEdildi: false },
    { id: 32, customerId: 1, tarih: "2026-06-10", tutar: 50000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-06-20", tahsilEdildi: true },
    { id: 33, customerId: 1, tarih: "2026-06-11", tutar: 77777, currency: "TRY", yontem: "Nakit", deletedAt: "2026-06-12" },
  ],
  teklifler: [
    { id: 40, type: "teklif", tarih: "2026-06-02", durum: "gonderildi" },
    { id: 41, type: "teklif", tarih: "2026-06-03", durum: "onaylandi" },
    { id: 42, type: "teklif", tarih: "2026-05-03", durum: "gonderildi" },
  ],
};

const r = hesaplaAylikRapor(veri, "2026-06", secenekler);

describe("hesaplaAylikRapor", () => {
  it("dönem etiketi ayın ilk ve son gününü gösterir", () => {
    expect(r.donem).toBe("01.06.2026 - 30.06.2026");
  });

  it("sadece seçilen ayın satışları sayılır; silinmiş ve 2. el hariç", () => {
    expect(r.satisAdet).toBe(1);            // Mayıs satışı, silinmiş ve 2.el dışarıda
    expect(r.ikinciElAdet).toBe(1);
    expect(r.satisTutar).toEqual({ TRY: 800000 });
    expect(r.satisKdv.TRY).toBe(120000);    // faturalı yurtiçi 600.000 × %20
    expect(r.komisyonTutar).toEqual({ TRY: 20000 });
  });

  it("gerçekleşen tahsilata bekleyen çek girmez, tahsil edilmiş çek girer, silinmiş ödeme sayılmaz", () => {
    expect(r.tahsilatTutar).toEqual({ TRY: 250000 }); // 200.000 nakit + 50.000 tahsil edilmiş çek
    expect(r.tahsilatAdet).toBe(2);
    expect(r.bekleyenCekAdet).toBe(1);
    expect(r.bekleyenCekTutar).toEqual({ TRY: 150000 });
    expect(r.cekTahsilAdet).toBe(1);
  });

  it("işçilik gelirine garanti içi ve anlaşmalı firma servisi girmez", () => {
    expect(r.iscilikTutar).toEqual({ TRY: 5000 }); // sadece Garanti Dışı + Altuntaş servisi
    expect(r.servisAdet).toBe(3);                  // kayıt adedi hepsini sayar
  });

  it("Extra kalıp satışı diğer satışlarda görünür, başka ayınki görünmez", () => {
    expect(r.extraKalipAdet).toBe(1);
    expect(r.extraKalipTutar).toEqual({ TRY: 25000 });
  });

  it("teklifler: ay içinde verilen ve onaylanan sayılır", () => {
    expect(r.teklifAdet).toBe(2);
    expect(r.onaylananTeklif).toBe(1);
    expect(r.bekleyenTeklif).toBe(2); // haziran + mayıs gönderilmiş
  });

  it("alacak: kalan borç + ödenmemiş ücretli servis (KDV dahil)", () => {
    // 100.000 kalanBorc + 5.000 servis + 1.000 KDV + 3.000 anlaşmalı parça yok (parça ücreti yok)
    expect(r.acikBorc.TRY).toBe(106000);
  });
});

describe("oncekiAyStr", () => {
  it("bir ay geri gider, yıl sınırını aşar", () => {
    expect(oncekiAyStr("2026-06")).toBe("2026-05");
    expect(oncekiAyStr("2026-01")).toBe("2025-12");
  });
});
