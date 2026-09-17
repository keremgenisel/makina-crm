// Aylık Faaliyet Raporu hesap motoru: ay sınırları, gerçekleşen tahsilat kuralı,
// servis gelir kuralları, silinmiş kayıtlar ve önceki ay.
import { describe, it, expect } from "vitest";
import { hesaplaAylikRapor, oncekiAyStr } from "../src/lib/aylikRapor";
import { kartYansitmaAyrim, kartKomisyonuSnapshot } from "../src/lib/krediKarti";

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

  it("Faturalı'dan Faturasız'a çevrilmiş kayıttaki hayalet faturaBedeli faturaTutar'a girmez", () => {
    const veri2 = {
      customers: [{ id: 9, name: "Z", model: "AK100", installDate: "2026-06-12", currency: "TRY", fabrikaSatisBedeli: 500000, faturaBedeli: 400000, faturali: "Faturasız Yurtiçi", kalanBorc: 0 }],
      services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [],
    };
    const r2 = hesaplaAylikRapor(veri2, "2026-06", secenekler);
    expect(r2.faturaTutar.TRY || 0).toBe(0);   // Faturasız → hayalet fatura bedeli sayılmaz
    expect(r2.satisKdv.TRY || 0).toBe(0);      // Faturasız → KDV yok
    expect(r2.satisTutar.TRY).toBe(500000);    // gerçek bedel fabrikaSatisBedeli'nden gelir
  });

  it("gerçekleşen tahsilata bekleyen çek girmez, tahsil edilmiş çek girer, silinmiş ödeme sayılmaz", () => {
    // 200.000 nakit + 50.000 tahsil edilmiş çek + 25.000 tahsil edilmiş Extra Kalıp (id=20, Nakit, KDV yok)
    expect(r.tahsilatTutar).toEqual({ TRY: 275000 });
    expect(r.tahsilatAdet).toBe(3);
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
    expect(r.satisDetay[0]).toMatchObject({ firma: "A", model: "AK100", faturaTipi: "Faturalı Yurtiçi" });
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

  it("extraKalipDetay: alan firmaları listeler, başka ay hariç (legacy yedek parça yolu kaldırıldı)", () => {
    expect(r.extraKalipDetay).toHaveLength(1);
    expect(r.extraKalipDetay[0]).toMatchObject({ firma: "A", adet: 1, teslimSekli: "Kargo" });
    expect(r.extraKalipDetay[0].tutar).toEqual({ TRY: 25000 });
    expect(r.yedekParcaDetay).toBeUndefined(); // legacy alan artık dönmüyor
  });

  it("tahsilatDetay: kimden tahsil edildiğini yöntemle listeler, bekleyen çek ayrı dizide", () => {
    // nakit 200.000 + tahsil edilmiş çek 50.000 + Extra Kalıp tahsilatı 25.000 (Nakit)
    expect(r.tahsilatDetay).toHaveLength(3);
    expect(r.tahsilatDetay.map(x => x.yontem).sort()).toEqual(["Nakit", "Nakit", "Çek"]);
    expect(r.tahsilatDetay.every(x => x.firma === "A")).toBe(true);
    // En eskiden en yeniye sıralı: Extra Kalıp 06-05, nakit ödeme 06-08, tahsil edilmiş çek 06-10
    expect(r.tahsilatDetay.map(x => x.tarih)).toEqual(["2026-06-05", "2026-06-08", "2026-06-10"]);
    expect(r.bekleyenCekDetay).toHaveLength(1);
    expect(r.bekleyenCekDetay[0].tutar).toEqual({ TRY: 150000 });
  });

  it("tahsilatYontemKirilimi: gerçekleşen tahsilatı yöntem başına (Nakit/Çek) toplar; satış tahsilatları da katılır", () => {
    const map = Object.fromEntries(r.tahsilatYontemKirilimi.map(x => [x.yontem, x]));
    expect(map["Nakit"].tutar).toEqual({ TRY: 225000 }); // 200.000 ödeme + 25.000 Extra Kalıp
    expect(map["Nakit"].adet).toBe(2);
    expect(map["Çek"].tutar).toEqual({ TRY: 50000 }); // yalnız tahsil edilmiş çek
    expect(map["Çek"].adet).toBe(1);
    // Bekleyen çek (150.000) gerçekleşen sayılmadığı için yöntem kırılımına girmez
    expect(map["Çek"].tutar.TRY).toBe(50000);
  });

  it("alacakDetay: firma firma açık borcu kaynaklarıyla toplar", () => {
    expect(r.alacakDetay).toHaveLength(1);
    expect(r.alacakDetay[0].firma).toBe("A");
    expect(r.alacakDetay[0].tutar).toEqual({ TRY: 106000 }); // 100.000 bakiye + 6.000 servis (KDV dahil)
    expect(r.alacakDetay[0].kaynaklar).toEqual(expect.arrayContaining(["Makina bakiyesi", "Servis"]));
  });

  it("tahsilatKaynakKirilimi: giren para kaynağa göre (makina ödemesi / extra kalıp)", () => {
    const k = Object.fromEntries(r.tahsilatKaynakKirilimi.map(x => [x.kaynak, x]));
    expect(k["Makina ödemesi"].tutar).toEqual({ TRY: 250000 }); // 200.000 nakit + 50.000 tahsil edilmiş çek
    expect(k["Makina ödemesi"].adet).toBe(2);
    expect(k["Extra kalıp"].tutar).toEqual({ TRY: 25000 });
  });

  it("alacakKaynakKirilimi: açık alacak kaynağa göre (makina bakiyesi / servis)", () => {
    const k = Object.fromEntries(r.alacakKaynakKirilimi.map(x => [x.kaynak, x.tutar]));
    expect(k["Makina bakiyesi"]).toEqual({ TRY: 100000 });
    expect(k["Servis"]).toEqual({ TRY: 6000 });
  });

  it("bakım onarım (servis) tahsilatı giren paraya girer (KDV dahil); ödenmemiş girmez", () => {
    const veriS = {
      customers: [{ id: 1, name: "S", installDate: "2026-06-01", currency: "TRY", kalanBorc: 0 }],
      services: [
        { id: 60, customerId: 1, date: "2026-06-10", type: "Garanti Dışı", servisUcreti: 10000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", odendi: true },
        { id: 61, customerId: 1, date: "2026-06-11", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: "Faturalı Yurtiçi", odendi: false },
      ],
      partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [],
    };
    const rs = hesaplaAylikRapor(veriS, "2026-06", secenekler);
    // ödenen 10.000 + %20 KDV = 12.000 giren; ödenmemiş 5.000 hariç (o Açık Alacak'ta)
    expect(rs.tahsilatTutar).toEqual({ TRY: 12000 });
    const k = Object.fromEntries(rs.tahsilatKaynakKirilimi.map(x => [x.kaynak, x]));
    expect(k["Bakım onarım"].tutar).toEqual({ TRY: 12000 });
    expect(k["Bakım onarım"].adet).toBe(1);
  });

  it("tahsilat KDV hariç net + içindeki KDV olarak ayrışır (makina ödemesi faturalı)", () => {
    const veriT = {
      customers: [{ id: 1, name: "T", installDate: "2026-06-01", currency: "TRY", faturali: "Faturalı Yurtiçi", kalanBorc: 0 }],
      services: [], partSales: [], teklifler: [], dealers: [], yedekParcaSatislar: [],
      payments: [{ id: 40, customerId: 1, tarih: "2026-06-10", tutar: 120000, currency: "TRY", yontem: "Nakit" }],
    };
    const rt = hesaplaAylikRapor(veriT, "2026-06", secenekler);
    expect(rt.tahsilatTutar).toEqual({ TRY: 120000 }); // KDV dahil giren para
    expect(rt.tahsilatNet.TRY).toBeCloseTo(100000, 2); // 120.000 / 1,20
    expect(rt.tahsilatKdv.TRY).toBeCloseTo(20000, 2);
    // kaynak kırılımı da net taşır
    expect(rt.tahsilatKaynakKirilimi[0].net.TRY).toBeCloseTo(100000, 2);
  });

  it("tutar girilmemiş (bedeli 0) yedek parça satışı da listede görünür (para toplamı 0)", () => {
    const veriZ = {
      customers: [{ id: 1, name: "Z", currency: "TRY", kalanBorc: 0 }],
      services: [], partSales: [], payments: [], teklifler: [], dealers: [{ id: 5, name: "BayiZ" }],
      yedekParcaSatislar: [
        { id: 80, aliciTipi: "bayi", dealerId: 5, tarih: "2026-06-10", miktar: 2, birimFiyat: 0, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", kargoDurum: "Hazırlanıyor", odendi: false },
      ],
    };
    const rz = hesaplaAylikRapor(veriZ, "2026-06", secenekler);
    expect(rz.yedekKargoAdet).toBe(1);            // sayılır
    expect(rz.yedekKargoDetay).toHaveLength(1);   // detayda görünür
    expect(rz.yedekKargoDetay[0].firma).toBe("BayiZ");
    expect(rz.yedekKargoTutar).toEqual({ TRY: 0 }); // para toplamına 0 ekler
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

// ── Yeni yapı: fatura tipi / teslim şekli / onarım yeri kırılımları, bölüm toplamları, sıralama ──
describe("hesaplaAylikRapor — yeni kırılımlar ve bölüm toplamları", () => {
  const v = {
    customers: [
      { id: 1, name: "Mak1", model: "AK", installDate: "2026-06-20", currency: "TRY", fabrikaSatisBedeli: 100000, faturaBedeli: 100000, faturali: "Faturalı Yurtiçi", kalanBorc: 0 },
      { id: 2, name: "Mak2", model: "AK", installDate: "2026-06-05", currency: "TRY", fabrikaSatisBedeli: 50000, faturali: "Faturasız Yurtiçi", kalanBorc: 0 },
    ],
    services: [
      { id: 10, customerId: 1, date: "2026-06-15", type: "Garanti Dışı", servisUcreti: 10000, currency: "TRY", islemFirma: "Altuntaş Makina", repairPlace: "Yerinde Onarım", faturaTipi: "Faturalı Yurtiçi", odendi: true },
      { id: 11, customerId: 2, date: "2026-06-08", type: "Garanti Dışı", servisUcreti: 0, parcaUcreti: 5000, parcaUcretiAltuntastan: 5000, parcaCurrency: "TRY", currency: "TRY", islemFirma: "Altuntaş Makina", repairPlace: "Fabrikada Onarım", faturaTipi: "Faturalı Yurtiçi", odendi: true },
    ],
    partSales: [
      { id: 20, customerId: 1, tur: "Kalıp", tarih: "2026-06-10", ucret: 30000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", fabrikaTeslim: true, odendi: true },
      { id: 21, customerId: 2, tur: "Kalıp", tarih: "2026-06-03", ucret: 20000, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", odendi: true },
    ],
    yedekParcaSatislar: [
      { id: 30, aliciTipi: "musteri", musteriId: 1, tarih: "2026-06-12", miktar: 2, birimFiyat: 5000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", kargoDurum: "Hazırlanıyor", odendi: true },
      { id: 31, aliciTipi: "bayi", dealerId: 9, tarih: "2026-06-02", miktar: 1, birimFiyat: 8000, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", fabrikaTeslim: true, odendi: true },
    ],
    payments: [], teklifler: [], dealers: [{ id: 9, name: "Bayi9" }],
  };
  const rv = hesaplaAylikRapor(v, "2026-06", secenekler);
  const bul = (arr, ft) => arr.find(x => x.faturaTipi === ft);

  it("makina fatura tipi kırılımı: net/KDV/adet doğru", () => {
    const fi = bul(rv.makinaFaturaKirilimi, "Faturalı Yurtiçi");
    expect(fi).toMatchObject({ adet: 1 });
    expect(fi.net).toEqual({ TRY: 100000 });
    expect(fi.kdv).toEqual({ TRY: 20000 });
    expect(bul(rv.makinaFaturaKirilimi, "Faturasız Yurtiçi").net).toEqual({ TRY: 50000 });
  });

  it("extra kalıp teslim şekli + fatura tipi kırılımı", () => {
    expect(rv.extraKalipTeslim.fabrikaTeslim.net).toEqual({ TRY: 30000 });
    expect(rv.extraKalipTeslim.kargo.net).toEqual({ TRY: 20000 });
    expect(bul(rv.extraKalipFaturaKirilimi, "Faturalı Yurtiçi").net).toEqual({ TRY: 30000 });
  });

  it("yedek parça (kargo) teslim şekli tutarı + fatura tipi kırılımı", () => {
    expect(rv.yedekKargoTeslimTutar.kargo.net).toEqual({ TRY: 10000 }); // id30 2×5000
    expect(rv.yedekKargoTeslimTutar.fabrikaTeslim.net).toEqual({ TRY: 8000 }); // id31
    expect(bul(rv.yedekKargoFaturaKirilimi, "Faturasız Yurtiçi").net).toEqual({ TRY: 8000 });
  });

  it("bakım onarım bölüm toplamı (net + KDV) ve onarım yeri kırılımı", () => {
    expect(rv.servisNet).toEqual({ TRY: 15000 }); // işçilik 10.000 + Altuntaş parça 5.000
    expect(rv.servisBolumKdv).toEqual({ TRY: 3000 }); // 15.000 × %20
    const yerler = Object.fromEntries(rv.onarimYeriKirilimi.map(x => [x.yer, x]));
    expect(yerler["Yerinde Onarım"]).toMatchObject({ adet: 1 });
    expect(yerler["Yerinde Onarım"].net).toEqual({ TRY: 10000 });
    expect(yerler["Fabrikada Onarım"].net).toEqual({ TRY: 5000 });
    // Sabit sıra: Yerinde önce
    expect(rv.onarimYeriKirilimi[0].yer).toBe("Yerinde Onarım");
    expect(bul(rv.servisFaturaKirilimi, "Faturalı Yurtiçi")).toMatchObject({ adet: 2 });
  });

  it("firma firma olay tabloları eskiden yeniye sıralı", () => {
    expect(rv.satisDetay.map(x => x.tarih)).toEqual(["2026-06-05", "2026-06-20"]);
    expect(rv.extraKalipDetay.map(x => x.tarih)).toEqual(["2026-06-03", "2026-06-10"]);
    expect(rv.yedekKargoDetay.map(x => x.tarih)).toEqual(["2026-06-02", "2026-06-12"]);
  });
});

describe("hesaplaAylikRapor — açık alacak yaşlandırması (aging)", () => {
  const bugun = new Date().toISOString().slice(0, 10);
  const va = {
    customers: [
      { id: 1, name: "Eski", currency: "TRY", kalanBorc: 100000, installDate: "2020-01-01" }, // çok eski → 90+
      { id: 2, name: "Yeni", currency: "TRY", kalanBorc: 50000, installDate: bugun },          // bugün → 0-30
    ],
    services: [], partSales: [], payments: [], teklifler: [], yedekParcaSatislar: [], dealers: [],
  };
  const ra = hesaplaAylikRapor(va, "2026-06", secenekler);
  it("borcu yaşına göre kovalara dağıtır (tutar + firma sayısı)", () => {
    const yas = Object.fromEntries(ra.alacakYaslandirma.map(x => [x.aralik, x]));
    expect(yas["90+ gün"].tutar).toEqual({ TRY: 100000 });
    expect(yas["90+ gün"].firma).toBe(1);
    expect(yas["0-30 gün"].tutar).toEqual({ TRY: 50000 });
    expect(yas["0-30 gün"].firma).toBe(1);
  });
});

describe("hesaplaAylikRapor yönetici özeti + KDV beyanname özeti", () => {
  it("ozet.ciroNet: makina + işçilik + parça + extra kalıp + yedek parça + anlaşmalı parça (KDV hariç)", () => {
    // 800.000 makina + 5.000 işçilik + 25.000 extra kalıp = 830.000
    expect(r.ozet.ciroNet).toEqual({ TRY: 830000 });
    expect(r.ozet.tahsilat).toEqual({ TRY: 275000 }); // + 25.000 tahsil edilmiş Extra Kalıp (satış tahsilatı)
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

describe("hesaplaAylikRapor — yedek parça (kargo) satışları (yeni dizi)", () => {
  const kargoVeri = {
    customers: [{ id: 1, name: "Müş A", currency: "TRY", kalanBorc: 0 }],
    services: [], partSales: [], payments: [], teklifler: [],
    dealers: [{ id: 5, name: "Bayi X" }],
    yedekParcaSatislar: [
      // Müşteriye satış (ay içi, ödendi, KARGO) — bedel 2000, KDV 400
      { id: 70, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 2, birimFiyat: 1000, currency: "TRY", tarih: "2026-06-10", faturaTipi: "Faturalı Yurtiçi", odendi: true, kargoDurum: "Kargoya Verildi" },
      // Bayiye satış (ay içi, ödenmedi, FABRİKA TESLİM) — bedel 1500, KDV 300
      { id: 71, aliciTipi: "bayi", dealerId: 5, partId: "8", miktar: 3, birimFiyat: 500, currency: "TRY", tarih: "2026-06-12", faturaTipi: "Faturalı Yurtiçi", odendi: false, fabrikaTeslim: true, kargoDurum: "Hazırlanıyor" },
      // Anlaşmasız servise (dış firma) satış (ay içi, ödenmedi, faturasız → KDV 0, PANOYA GÖNDERİLMEMİŞ) — bedel 100
      { id: 72, aliciTipi: "bayi", disFirma: true, disFirmaAd: "Harici Ltd", partId: "8", miktar: 1, birimFiyat: 100, currency: "TRY", tarih: "2026-06-20", faturaTipi: "Faturasız Yurtiçi", odendi: false },
      // Başka ay (Mayıs, ödenmedi) — ciroya girmez ama açık alacağa girer (anlık bakiye)
      { id: 73, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 5, birimFiyat: 200, currency: "TRY", tarih: "2026-05-01", faturaTipi: "Faturasız Yurtiçi", odendi: false },
      // Silinmiş — hiç sayılmaz
      { id: 74, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, birimFiyat: 100, currency: "TRY", tarih: "2026-06-15", odendi: false, deletedAt: "2026-06-16" },
    ],
  };
  const rk = hesaplaAylikRapor(kargoVeri, "2026-06", secenekler);

  it("ay içi kargo satışları adet/miktar/tutar (müşteri+bayi+dış firma; Mayıs ve silinmiş hariç)", () => {
    expect(rk.yedekKargoAdet).toBe(3);
    expect(rk.yedekKargoMiktar).toBe(6);                       // 2+3+1
    expect(rk.yedekKargoTutar).toEqual({ TRY: 3600 });         // 2000+1500+100
  });

  it("müşteri / bayi ayrımı: dış firma bayi tarafında sayılır", () => {
    expect(rk.yedekKargoMusteriTutar).toEqual({ TRY: 2000 });  // yalnız 70
    expect(rk.yedekKargoBayiTutar).toEqual({ TRY: 1600 });     // 71 bayi + 72 dış firma
  });

  it("kargo KDV'si ciroNet ve toplamKdv'ye katılır", () => {
    expect(rk.yedekKargoKdv).toEqual({ TRY: 700 });            // 400+300+0
    expect(rk.kdvKalemleri.yedekKargo).toEqual({ TRY: 700 });
    expect(rk.toplamKdv).toEqual({ TRY: 700 });                // başka KDV kaynağı yok
    expect(rk.ozet.ciroNet).toEqual({ TRY: 3600 });            // net bedel (KDV hariç), başka ciro yok
  });

  it("yedekKargoDetay: alıcı adı + türü verir (anlaşmasız servis adıyla)", () => {
    expect(rk.yedekKargoDetay).toHaveLength(3);
    const dis = rk.yedekKargoDetay.find(x => x.aliciTuru === "Anlaşmasız Servis");
    expect(dis.firma).toBe("Harici Ltd");
    const bayi = rk.yedekKargoDetay.find(x => x.aliciTuru === "Bayi");
    expect(bayi.firma).toBe("Bayi X");
    expect(rk.yedekKargoDetay.some(x => x.aliciTuru === "Müşteri" && x.firma === "Müş A")).toBe(true);
  });

  it("teslim şekli ayrımı: kargo / fabrika teslim / panoya gönderilmemiş", () => {
    // 70 kargo · 71 fabrika teslim · 72 panoya gönderilmedi
    expect(rk.yedekKargoTeslim).toEqual({ kargo: 1, fabrikaTeslim: 1, gonderilmedi: 1 });
    expect(rk.yedekKargoDetay.find(x => x.firma === "Müş A").teslimSekli).toBe("Kargo");
    expect(rk.yedekKargoDetay.find(x => x.firma === "Bayi X").teslimSekli).toBe("Fabrika Teslim");
    expect(rk.yedekKargoDetay.find(x => x.firma === "Harici Ltd").teslimSekli).toBe("Panoya gönderilmedi");
  });

  it("ödenmemiş kargo açık alacağa girer (tarih filtresiz, silinmiş hariç); borçlu firma sayısı kaynak bazlı", () => {
    // 71: 1500+300=1800 · 72: 100+0=100 · 73(Mayıs): 1000+0=1000 → toplam 2900
    expect(rk.acikBorc).toEqual({ TRY: 2900 });
    // Borçlular: Müş A (73), Bayi X (71), Harici Ltd (72) = 3 farklı firma
    expect(rk.borcluFirma).toBe(3);
    expect(rk.alacakDetay).toHaveLength(3);
    expect(rk.alacakDetay.find(x => x.firma === "Bayi X").kaynaklar).toContain("Yedek parça (kargo ve fabrika teslim)");
  });
});

describe("oncekiAyStr", () => {
  it("bir ay geri gider, yıl sınırını aşar", () => {
    expect(oncekiAyStr("2026-06")).toBe("2026-05");
    expect(oncekiAyStr("2026-01")).toBe("2025-12");
  });
});

describe("hesaplaAylikRapor — kredi kartı komisyonu (banka kesintisi)", () => {
  const veriKK = {
    customers: [{ id: 1, name: "A", model: "AK100", installDate: "2026-06-10", currency: "TRY", fabrikaSatisBedeli: 100000, faturali: "Faturasız Yurtiçi", kalanBorc: 0, satisYapan: "Altuntaş Makina" }],
    services: [], partSales: [], teklifler: [], dealers: [], yedekParcaSatislar: [],
    payments: [
      // Kredi kartı, biz yüklendik (yansitildi=false), blokaj yok → tahsilata girer + komisyon net gelirden düşer
      { id: 50, customerId: 1, tarih: "2026-06-08", tutar: 108000, currency: "TRY", yontem: "Kredi Kartı", taksitSayisi: 3, kartKomisyonu: { toplamKesinti: 8000, blokajGun: 0, hesabaGecis: "2026-06-08", yansitildi: false } },
      // Komisyonu müşteriye yansıttık (yansitildi=true) → tahsilata girer ama komisyon DÜŞÜLMEZ
      { id: 51, customerId: 1, tarih: "2026-06-09", tutar: 105000, currency: "TRY", yontem: "Kredi Kartı", taksitSayisi: 3, kartKomisyonu: { toplamKesinti: 5000, blokajGun: 0, hesabaGecis: "2026-06-09", yansitildi: true } },
      // Tek çekim, bloke (hesaba geçiş uzak gelecek) → tahsilata GİRMEZ; komisyonu yine tahakkuk eder
      { id: 52, customerId: 1, tarih: "2026-06-10", tutar: 30000, currency: "TRY", yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: { toplamKesinti: 2000, blokajGun: 40, hesabaGecis: "2999-01-01", yansitildi: false } },
    ],
  };
  const rk = hesaplaAylikRapor(veriKK, "2026-06", secenekler);

  it("banka komisyonu = TÜM kredi kartı komisyonlarının toplamı (müşteriye yansıtılan dahil)", () => {
    expect(rk.bankaKomisyonuTutar.TRY).toBe(15000); // 8000 + 5000 (gross-up) + 2000 (bloke)
    expect(rk.ozet.bankaKomisyonu.TRY).toBe(15000);
  });
  it("kredi kartı ile satış = kredi kartlı ödeme/satış toplamı (ödeme p.tutar KDV dahil)", () => {
    expect(rk.krediKartiSatisTutar.TRY).toBe(243000); // 108000 + 105000 + 30000 (üç kredi kartı ödemesi)
    expect(rk.ozet.krediKartiSatis.TRY).toBe(243000);
  });
  it("bloke tek çekim tahsilata girmez; hemen geçen kart + gross-up girer", () => {
    expect(rk.tahsilatTutar.TRY).toBe(213000); // 108000 + 105000 (bloke 30000 hariç)
  });
});

describe("hesaplaAylikRapor — bloke kredi kartı / çek servisleri alacağa (borçlu firma) girer", () => {
  const mk = (svc) => ({
    customers: [{ id: 1, name: "S Firma", currency: "TRY", kalanBorc: 0 }],
    services: [{ id: 10, customerId: 1, date: "2026-06-12", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: "Altuntaş Makina", faturaTipi: "Faturasız Yurtiçi", ...svc }],
    partSales: [], teklifler: [], dealers: [], yedekParcaSatislar: [], payments: [],
  });
  it("kredi kartı tek çekim BLOKE servis (odendi olsa da) açık borçta görünür", () => {
    const rk = hesaplaAylikRapor(mk({ odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { blokajGun: 40, hesabaGecis: "2999-01-01" } }), "2026-06", secenekler);
    expect(rk.acikBorc.TRY).toBe(5000); // faturasız → KDV yok
    expect(rk.borcluFirma).toBe(1);
  });
  it("hesaba geçmiş (blokaj dolmuş) kredi kartı servis alacakta değil", () => {
    const rk = hesaplaAylikRapor(mk({ odendi: true, yontem: "Kredi Kartı", kartKomisyonu: { blokajGun: 0, hesabaGecis: "2020-01-01" } }), "2026-06", secenekler);
    expect(rk.acikBorc.TRY || 0).toBe(0);
    expect(rk.borcluFirma).toBe(0);
  });
});

// Kredi kartı komisyonu müşteriye yansıtıldığında: komisyon KDV matrahına girer ama CİROYA girmez
// (çift sayım olmaz). Extra Kalıp üzerinden test — Finance ile aynı yansitilanKomisyon düşümü.
describe("yansıtılan komisyon: ciroya girmez, KDV matrahında kalır (çift sayım yok)", () => {
  const AYAR = { bsmv: 5, satirlar: [{ taksit: 3, oran: 7.47, katkiPayi: 0.5, blokajGun: 0 }] };
  const a = kartYansitmaAyrim(10000, 3, AYAR, 20, "2026-06-10"); // kalem 10.000, faturalı yurtiçi %20
  const kkKalip = {
    id: 50, customerId: 1, tur: "Kalıp", tarih: "2026-06-10", currency: "TRY", faturaTipi: "Faturalı Yurtiçi",
    odendi: true, yontem: "Kredi Kartı", taksitSayisi: 3,
    ucret: a.kdvMatrah, // kayıtta ucret = KDV matrahı (kalem + komisyon)
    kartKomisyonu: kartKomisyonuSnapshot(a.kartTutari, 3, AYAR, "2026-06-10", true),
  };
  const veri2 = {
    customers: [{ id: 1, name: "X", installDate: "2020-01-01", currency: "TRY", kalanBorc: 0 }],
    services: [], partSales: [kkKalip], payments: [], teklifler: [],
  };
  const r2 = hesaplaAylikRapor(veri2, "2026-06", secenekler);

  it("Extra Kalıp cirosu = kalem (10.000), komisyon düşülmüş", () => {
    expect(r2.extraKalipTutar.TRY).toBeCloseTo(10000, 0);
    expect(r2.ozet.ciroNet.TRY).toBeCloseTo(10000, 0); // 11.057 değil
  });
  it("KDV kalem+komisyon (matrah) üzerinden — 2.000'den büyük", () => {
    expect(r2.extraKalipKdv.TRY).toBeCloseTo(a.kdv, 0);
    expect(r2.extraKalipKdv.TRY).toBeGreaterThan(2000);
  });
  it("komisyon yalnız 'Toplam Ödenen Banka Komisyonu'nda görünür", () => {
    expect(r2.bankaKomisyonuTutar.TRY).toBeCloseTo(a.komisyon, 0);
  });
});
