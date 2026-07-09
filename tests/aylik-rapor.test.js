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

describe("hesaplaAylikRapor firma firma detay dizileri", () => {
  it("satisDetay: o ay makina satılan her firmayı model/tutar/fatura tipiyle listeler", () => {
    expect(r.satisDetay).toHaveLength(1); // sadece A (B mayıs, C silinmiş, D 2.el)
    expect(r.satisDetay[0]).toMatchObject({ firma: "A", model: "AK100", faturaTipi: "Faturalı" });
    expect(r.satisDetay[0].tutar).toEqual({ TRY: 800000 });
  });

  it("servisDetay: her servis kaydını firma + işçilik/parça/KDV kırılımıyla verir", () => {
    expect(r.servisDetay).toHaveLength(3);
    const s10 = r.servisDetay.find(x => x.tip === "Garanti Dışı" && x.islemFirma === "Altuntaş Makina");
    expect(s10).toMatchObject({ firma: "A", odendi: false });
    expect(s10.iscilik).toEqual({ TRY: 5000 });
    expect(s10.kdv).toEqual({ TRY: 1000 }); // 5000 × %20
    // Garanti İçi servisin işçiliği tutar olarak 0
    const s11 = r.servisDetay.find(x => x.tip === "Garanti İçi");
    expect(s11.iscilik).toEqual({ TRY: 0 });
  });

  it("extraKalipDetay/yedekParcaDetay: alan firmaları listeler, başka ay hariç", () => {
    expect(r.extraKalipDetay).toHaveLength(1);
    expect(r.extraKalipDetay[0]).toMatchObject({ firma: "A", adet: 1 });
    expect(r.extraKalipDetay[0].tutar).toEqual({ TRY: 25000 });
    expect(r.yedekParcaDetay).toHaveLength(0);
  });

  it("tahsilatDetay: kimden tahsil edildiğini yöntemle listeler, bekleyen çek ayrı dizide", () => {
    expect(r.tahsilatDetay).toHaveLength(2); // nakit 200.000 + tahsil edilmiş çek 50.000
    expect(r.tahsilatDetay.map(x => x.yontem).sort()).toEqual(["Nakit", "Çek"]);
    expect(r.tahsilatDetay.every(x => x.firma === "A")).toBe(true);
    expect(r.bekleyenCekDetay).toHaveLength(1);
    expect(r.bekleyenCekDetay[0].tutar).toEqual({ TRY: 150000 });
  });

  it("alacakDetay: firma firma açık borcu kaynaklarıyla toplar", () => {
    expect(r.alacakDetay).toHaveLength(1);
    expect(r.alacakDetay[0].firma).toBe("A");
    expect(r.alacakDetay[0].tutar).toEqual({ TRY: 106000 }); // 100.000 bakiye + 6.000 servis (KDV dahil)
    expect(r.alacakDetay[0].kaynaklar).toEqual(expect.arrayContaining(["Makina bakiyesi", "Servis"]));
  });

  it("teklifDetay: ay içi teklifleri durum etiketiyle listeler", () => {
    expect(r.teklifDetay).toHaveLength(2);
    expect(r.teklifDetay.map(x => x.durum).sort()).toEqual(["Gönderildi", "Onaylandı"]);
  });

  it("anlasmaliParcaDetay: Altuntaş dışı servisteki Altuntaş parçasını müşteri+servis firmasıyla verir", () => {
    const veri2 = {
      customers: [{ id: 1, name: "A", installDate: "2026-06-01", currency: "TRY", kalanBorc: 0 }],
      services: [{
        id: 50, customerId: 1, date: "2026-06-12", type: "Garanti Dışı", islemFirma: "Ege Servis",
        parcaUcreti: 8000, parcaUcretiAltuntastan: 8000, parcaCurrency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: false,
      }],
      partSales: [], payments: [], teklifler: [],
    };
    const r2 = hesaplaAylikRapor(veri2, "2026-06", secenekler);
    expect(r2.anlasmaliParcaDetay).toHaveLength(1);
    expect(r2.anlasmaliParcaDetay[0]).toMatchObject({ firma: "A", servisFirma: "Ege Servis", odendi: false });
    expect(r2.anlasmaliParcaDetay[0].tutar).toEqual({ TRY: 8000 });
    expect(r2.anlasmaliParcaDetay[0].kdv).toEqual({ TRY: 1600 });
  });
});

describe("hesaplaAylikRapor yönetici özeti + KDV beyanname özeti", () => {
  it("ozet.ciroNet: makina + işçilik + parça + extra kalıp + yedek parça + anlaşmalı parça (KDV hariç)", () => {
    // 800.000 makina + 5.000 işçilik + 25.000 extra kalıp = 830.000
    expect(r.ozet.ciroNet).toEqual({ TRY: 830000 });
    expect(r.ozet.tahsilat).toEqual({ TRY: 250000 });
    expect(r.ozet.alacak.TRY).toBe(106000);
  });

  it("toplamKdv: satış + servis + extra kalıp + anlaşmalı parça KDV toplamı", () => {
    // 120.000 makina KDV + 1.000 servis KDV (5.000×%20) + 0 (faturasız kalıp) + 0 anlaşmalı = 121.000
    expect(r.toplamKdv).toEqual({ TRY: 121000 });
    expect(r.kdvKalemleri.satis).toEqual({ TRY: 120000 });
    expect(r.kdvKalemleri.servis).toEqual({ TRY: 1000 });
  });

  it("rates verilince ozet yaklaşık TL toplamı da hesaplar; verilmezse null", () => {
    expect(r.ozet.ciroNetTL).toBeNull(); // ana fixture rates'siz çağrıldı
    const rTL = hesaplaAylikRapor(veri, "2026-06", { ...secenekler, rates: { usd: 40, eur: 45 } });
    expect(rTL.ozet.ciroNetTL).toBe(830000);   // hepsi TRY olduğu için TL == TRY
    expect(rTL.ozet.toplamKdvTL).toBe(121000);
  });
});

describe("oncekiAyStr", () => {
  it("bir ay geri gider, yıl sınırını aşar", () => {
    expect(oncekiAyStr("2026-06")).toBe("2026-05");
    expect(oncekiAyStr("2026-01")).toBe("2025-12");
  });
});
