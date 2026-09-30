// Spec 0044: servis, Extra Kalıp ve yedek parça tahsilatlarının hesaba bağlanması (saf motor).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { hesapBakiyeleri, hesapKullanimi, hesapsizTahsilatlar, hesapsizOdemeler, sonTahsilatHesabi, HESAPSIZ_NOTU } from "../src/lib/kasa";
import { finansOzetiHesapla } from "../src/components/settings/SettingsExport";
import { tahsilatHesapDurumu, satisTahsilatKalemleri, SATIS_KAYNAK } from "../src/lib/satisTahsilat";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";

const HESAPLAR = [
  { id: 1, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0 },
  { id: 2, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0 },
  { id: 3, ad: "Dolar Hesabı", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0 },
  { id: 4, ad: "Eski Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: true },
];
const CUSTOMERS = [{ id: 10, name: "Ayhan Gıda", faturali: "Faturalı Yurtiçi" }];
const DEALERS = [{ id: 20, name: "Bayi A", anlasmaliServisMi: true }];
const BUGUN = "2026-09-29";
const sv = (o = {}) => ({ id: 100, customerId: 10, type: "Garanti Dışı", servisUcreti: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", date: "2026-09-10", odendi: true, tahsilatTarihi: "2026-09-12", yontem: "Nakit", hesapId: 1, ...o });
const ks = (o = {}) => ({ id: 200, customerId: 10, tur: "Kalıp", ad: "Kalıp 1", ucret: 2000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-11", odendi: true, tahsilatTarihi: "2026-09-13", yontem: "Nakit", hesapId: 1, ...o });
const yp = (o = {}) => ({ id: 300, aliciTipi: "bayi", dealerId: 20, partId: 5, miktar: 2, birimFiyat: 250, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-14", odendi: true, tahsilatTarihi: "2026-09-14", yontem: "Havale", hesapId: 2, ...o });
const veri = (o = {}) => ({ payments: [], services: [], partSales: [], yedekParcaSatislar: [], customers: CUSTOMERS, dealers: DEALERS, factory: { name: "Altuntaş Makina" }, bugun: BUGUN, ...o });
const bakiye = (v, id = 1) => hesapBakiyeleri(HESAPLAR, [], v).get(String(id)).bakiye;

describe("Spec 0044: tahsilatın hesap bakiyesi", () => {
  it("AC-4: hesap seçilen tahsilat kadar o hesabın bakiyesi artar (üç kaynak)", () => {
    expect(bakiye(veri({ services: [sv()] }))).toBe(1200);
    expect(bakiye(veri({ partSales: [ks()] }))).toBe(2400);
    expect(bakiye(veri({ yedekParcaSatislar: [yp()] }), 2)).toBe(600);
    expect(bakiye(veri({ services: [sv()], partSales: [ks()] }))).toBe(3600);
  });
  it("AC-21: bakiyeye giren tutar brüttür (bize ait bedeller + KDV); faturasızda KDV yok", () => {
    const parcali = sv({ parcaUcreti: 500, parcaUcretiAltuntastan: 500, parcaUcretsizMi: false, parcaCurrency: "TRY" });
    expect(bakiye(veri({ services: [parcali] }))).toBe(1800);
    expect(bakiye(veri({ services: [sv({ faturaTipi: "Faturasız Yurtiçi" })] }))).toBe(1000);
    // Dış tedarik parça bize ait değildir, tutara girmez.
    expect(bakiye(veri({ services: [sv({ parcaUcreti: 500, parcaUcretiAltuntastan: 0, parcaUcretsizMi: false })] }))).toBe(1200);
  });
  it("AC-9: anlaşmalı bayinin yaptığı servisin ücreti hiçbir hesabın bakiyesine girmez", () => {
    const bayiServisi = sv({ islemFirma: "Bayi A" });
    expect(bakiye(veri({ services: [bayiServisi] }))).toBe(0);
    const d = tahsilatHesapDurumu(SATIS_KAYNAK.SERVIS, bayiServisi, { factoryName: "Altuntaş Makina" });
    expect(d.sor).toBe(false);
    expect(d.neden).toBe("Bu bedel anlaşmalı firmaya ait, kasaya girmez.");
    // Anlaşmalı servise satılan Altuntaş parçası ise bizimdir (Q1).
    expect(bakiye(veri({ services: [sv({ islemFirma: "Bayi A", parcaUcreti: 500, parcaUcretiAltuntastan: 500, parcaUcretsizMi: false })] }))).toBe(600);
  });
  it("AC-10: bayi aracılığıyla satılan kalıbın bedeli tahsil edilince bizim bakiyemize girer", () => {
    expect(bakiye(veri({ partSales: [ks({ satisFirma: "Bayi A" })] }))).toBe(2400);
    expect(tahsilatHesapDurumu(SATIS_KAYNAK.KALIP, ks({ satisFirma: "Bayi A" })).sor).toBe(true);
  });
  it("AC-11: çekle ödenen servis, çek tahsil edilene kadar bakiyeye girmez; tahsil edilince girer", () => {
    expect(bakiye(veri({ services: [sv({ yontem: "Çek", tahsilEdildi: false, tahsilatTarihi: null })] }))).toBe(0);
    const b = hesapBakiyeleri(HESAPLAR, [], veri({ services: [sv({ yontem: "Çek", tahsilEdildi: true, tahsilatTarihi: "2026-09-20" })] })).get("1");
    expect(b.bakiye).toBe(1200);
    expect(b.satirlar[0].tarih).toBe("2026-09-20");
  });
  it("AC-12: kredi kartı tahsilatı blokaj bitince, hesaba geçiş tarihiyle girer; makina tahsilatı (payments) için de aynı kural", () => {
    const kk = { blokajGun: 30, hesabaGecis: "2026-10-10" };
    const kart = sv({ yontem: "Kredi Kartı", tahsilatTarihi: null, kartKomisyonu: kk });
    expect(bakiye(veri({ services: [kart] }))).toBe(0);
    const sonra = hesapBakiyeleri(HESAPLAR, [], veri({ services: [kart], bugun: "2026-10-10" })).get("1");
    expect(sonra.bakiye).toBe(1200);
    expect(sonra.satirlar[0].tarih).toBe("2026-10-10");
    const odeme = { id: 1, customerId: 10, tutar: 5000, tarih: "2026-09-10", yontem: "Kredi Kartı", hesapId: 1, kartKomisyonu: kk };
    expect(bakiye(veri({ payments: [odeme] }))).toBe(0);
    const p2 = hesapBakiyeleri(HESAPLAR, [], veri({ payments: [odeme], bugun: "2026-10-11" })).get("1");
    expect(p2.bakiye).toBe(5000);
    expect(p2.satirlar[0].tarih).toBe("2026-10-10");
  });
  it("AC-13: ödendi geri alınınca tahsilat bakiyeden çıkar, hesap alanı sayıma engel olmaz", () => {
    const geri = sv({ odendi: false, tahsilatTarihi: null });
    expect(bakiye(veri({ services: [geri] }))).toBe(0);
    expect(hesapsizTahsilatlar(veri({ services: [geri] })).adet).toBe(0);
    expect(sonTahsilatHesabi(veri({ services: [geri] }), HESAPLAR, "TRY")).toBe(1);
  });
  it("AC-14 / AC-30: hareket satırında tür ve firma adı motorda çözülür (yedek parçada aliciAd)", () => {
    const b = hesapBakiyeleri(HESAPLAR, [], veri({ services: [sv({ hesapId: 2 })], partSales: [ks({ hesapId: 2 })], yedekParcaSatislar: [yp(), yp({ id: 301, aliciTipi: "musteri", dealerId: null, musteriId: 10 }), yp({ id: 302, aliciTipi: "disFirma", dealerId: null, disFirma: true, disFirmaAd: "Kara Tamir" })] })).get("2");
    expect(b.satirlar.map(s => [s.turAdi, s.firma])).toEqual([
      ["Servis tahsilatı", "Ayhan Gıda"], ["Extra Kalıp tahsilatı", "Ayhan Gıda"],
      ["Yedek parça tahsilatı", "Bayi A"], ["Yedek parça tahsilatı", "Ayhan Gıda"], ["Yedek parça tahsilatı", "Kara Tamir"],
    ]);
  });
  it("AC-15 / AC-26: hesapKullanimi üç kaynağı da sayar; yalnız servis tahsilatı olan hesap da kullanımdadır", () => {
    expect(hesapKullanimi(1, [], veri({ services: [sv()] }))).toBe(1);
    expect(hesapKullanimi(2, [], veri({ yedekParcaSatislar: [yp()] }))).toBe(1);
    expect(hesapKullanimi(1, [], veri({ partSales: [ks()] }))).toBe(1);
    expect(hesapKullanimi(1, [], veri({ services: [sv({ deletedAt: "2026-09-20" })] }))).toBe(0);
  });
  it("AC-5 / AC-6: ön seçili hesap aynı para birimindeki son tahsilatın açık hesabıdır (makina tahsilatı dahil)", () => {
    const v = veri({ services: [sv({ hesapId: 1 })], payments: [{ id: 7, customerId: 10, tutar: 10, tarih: "2026-09-25", yontem: "Havale", hesapId: 2 }], partSales: [ks({ hesapId: 4, tahsilatTarihi: "2026-09-28" })] });
    expect(sonTahsilatHesabi(v, HESAPLAR, "TRY")).toBe(2); // kapalı hesap (4) atlanır
    expect(sonTahsilatHesabi(v, HESAPLAR, "USD")).toBe(null);
  });
  it("AC-7 / AC-8: hesapsız tahsilat listede görünür; hesap atanınca bakiye artar ve listeden çıkar", () => {
    const hesapsiz = veri({ services: [sv({ hesapId: null })] });
    const l = hesapsizTahsilatlar(hesapsiz);
    expect(l.adet).toBe(1);
    expect(l.liste[0]).toMatchObject({ kaynak: "servis", turAdi: "Servis tahsilatı", firma: "Ayhan Gıda", tutar: 1200 });
    expect(bakiye(hesapsiz)).toBe(0);
    const atanmis = veri({ services: [sv({ hesapId: 1 })] });
    expect(hesapsizTahsilatlar(atanmis).adet).toBe(0);
    expect(bakiye(atanmis)).toBe(1200);
  });
  it("AC-22 / AC-23: bize ait bedeli olmayan kayıtta hesap sorulmaz, hesapsız sayıya da girmez", () => {
    const ucretsiz = ks({ ucretsizMi: true, hesapId: null });
    const sifir = yp({ birimFiyat: 0, hesapId: null });
    const bayiServisi = sv({ islemFirma: "Bayi A", hesapId: null });
    expect(tahsilatHesapDurumu(SATIS_KAYNAK.KALIP, ucretsiz)).toMatchObject({ sor: false, neden: "Kasaya girecek tutar yok." });
    expect(tahsilatHesapDurumu(SATIS_KAYNAK.YEDEK, sifir)).toMatchObject({ sor: false, neden: "Kasaya girecek tutar yok." });
    expect(hesapsizTahsilatlar(veri({ partSales: [ucretsiz], yedekParcaSatislar: [sifir], services: [bayiServisi] })).adet).toBe(0);
  });
  it("AC-24: hesapsız tahsilatlar gider tarafındaki hesapsız ödemelerden ayrı sayılır", () => {
    const hareketler = [{ id: 1, tur: "odeme", tutar: 100, tarih: "2026-09-01", giderId: 9, hesapId: null }];
    const v = veri({ services: [sv({ hesapId: null })] });
    expect(hesapsizOdemeler(hareketler).adet).toBe(1);
    expect(hesapsizTahsilatlar(v).adet).toBe(1);
  });
  it("AC-27: parça bedelinin para birimi servisten farklıysa hesap sorulmaz, neden yazılır ve bakiyeye girmez", () => {
    const bozuk = sv({ parcaUcreti: 100, parcaUcretiAltuntastan: 100, parcaUcretsizMi: false, parcaCurrency: "USD" });
    expect(tahsilatHesapDurumu(SATIS_KAYNAK.SERVIS, bozuk)).toEqual({ sor: false, neden: "Parça bedelinin para birimi servisle aynı değil; bu tahsilat bir hesaba bağlanamaz." });
    expect(bakiye(veri({ services: [bozuk] }))).toBe(0);
    expect(hesapsizTahsilatlar(veri({ services: [{ ...bozuk, hesapId: null }] })).adet).toBe(0);
  });
  it("R3: farklı para birimindeki hesaba yazılmış tahsilat o hesaba girmez", () => {
    expect(bakiye(veri({ services: [sv({ hesapId: 3 })] }), 3)).toBe(0);
    expect(bakiye(veri({ services: [sv({ currency: "USD", faturaTipi: "Faturalı Yurtdışı", hesapId: 3 })] }), 3)).toBe(1000);
  });
  it("R6, Q10: tahsil edilmemiş çek ve müşterisi silinmiş kayıt hesapsız listede kalır", () => {
    const l = hesapsizTahsilatlar(veri({ services: [sv({ hesapId: null, yontem: "Çek", tahsilEdildi: false }), sv({ id: 101, hesapId: null, customerId: 999 })] }));
    expect(l.adet).toBe(2);
    expect(l.liste.map(k => k.firma).sort()).toEqual(["Ayhan Gıda", "Silinmiş müşteri"]);
  });
  it("triyaj: hesabının para birimi uyuşmayan (ya da hesabı bulunmayan) tahsilat bakiyeye girmez, hesapsız listede görünür", () => {
    // Ödendi geri alınıp (R9 hesap korunur) para birimi USD'ye çevrilen servis TL hesaba bağlı kalmıştır.
    const usd = sv({ currency: "USD", faturaTipi: "Faturalı Yurtdışı", hesapId: 1 });
    const v = veri({ services: [usd, sv({ id: 101, hesapId: 77 })] });
    expect(bakiye(v)).toBe(0);
    const l = hesapsizTahsilatlar(v, HESAPLAR);
    expect(l.adet).toBe(2);
    expect(l.liste.map(k => [k.kayit.id, k.neden]).sort()).toEqual([[100, "paraBirimi"], [101, "hesapYok"]]);
    expect(hesapsizTahsilatlar(veri({ services: [sv({ hesapId: 1 })] }), HESAPLAR).adet).toBe(0); // uyumlu hesap listeye girmez
  });
  it("AC-25: ciro hareketi hesapsız ödeme sayılmaz, hesapsız avans ayrı sayılır (0040 R18, 0024 B4)", () => {
    const h = [
      { id: 1, tur: "odeme", tutar: 100, tarih: "2026-09-01", giderId: 9, hesapId: null },
      { id: 2, tur: "odeme", tutar: 500, tarih: "2026-09-02", giderId: 9, hesapId: null, cekId: 44, yontem: "Çek (ciro)" },
      { id: 3, tur: "avans", tutar: 800, tarih: "2026-09-03", calisanId: 21, hesapId: null },
    ];
    expect(hesapsizOdemeler(h)).toEqual({ adet: 1, gocAdet: 0, avansAdet: 1 });
    expect(hesapsizTahsilatlar(veri({ services: [sv({ hesapId: null })] }), HESAPLAR).adet).toBe(1); // tahsilat sayımı ayrı
  });
  it("AC-16: bilgi notu R17 metnidir", () => {
    expect(HESAPSIZ_NOTU).toBe("Bakiye, hesabı belirtilmiş hareket ve tahsilatları sayar. Hesabı belirtilmemiş kayıtlar aşağıda ayrıca listelenir.");
    expect(HESAPSIZ_NOTU).not.toMatch(/hiç|girmez/);
  });
});

describe("Spec 0044: gelir rakamları değişmez (C2, C3)", () => {
  const veriRapor = (hesapId) => ({
    customers: CUSTOMERS, dealers: DEALERS, payments: [],
    services: [sv({ hesapId }), sv({ id: 101, islemFirma: "Bayi A", hesapId })],
    partSales: [ks({ hesapId }), ks({ id: 201, satisFirma: "Bayi A", hesapId })],
    yedekParcaSatislar: [yp({ hesapId })],
  });
  it("AC-18: hesap alanı dolu ve boş iki veri kümesinde aylık rapor birebir aynıdır", () => {
    const a = hesaplaAylikRapor(veriRapor(1), "2026-09", { factoryName: "Altuntaş Makina" });
    const b = hesaplaAylikRapor(veriRapor(null), "2026-09", { factoryName: "Altuntaş Makina" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("AC-17: Finans özeti hesap alanı dolu ve boş iki veri kümesinde birebir aynıdır", () => {
    const oz = (hesapId) => finansOzetiHesapla({ customers: CUSTOMERS, services: veriRapor(hesapId).services, partSales: veriRapor(hesapId).partSales, factoryName: "Altuntaş Makina" });
    expect(JSON.stringify(oz(1))).toBe(JSON.stringify(oz(null)));
  });
  it("AC-18: aylikRapor.js ve Finance.jsx hesapId alanını okumaz", () => {
    for (const f of ["src/lib/aylikRapor.js", "src/components/Finance.jsx", "src/lib/satisTahsilat.js"]) expect(readFileSync(f, "utf8")).not.toMatch(/hesapId/);
  });
  it("C2, R4: kasa motoru gelir kuralını yeniden yazmaz; aylık rapor ile aynı ortak kalemi çağırır", () => {
    const kasa = readFileSync("src/lib/kasa.js", "utf8");
    expect(kasa).toMatch(/satisTahsilatKalemleri/);
    expect(kasa).not.toMatch(/isServisUcretliMi|isParcaUcretliMi|altuntasParcaBedeli|calcKDV|Garanti Dışı/);
    expect(readFileSync("src/lib/aylikRapor.js", "utf8")).toMatch(/satisTahsilatKalemleri/);
  });
  it("R13, Q2: bakiye tutarı aylık raporun tahsilat kalemiyle aynı fonksiyondan gelir", () => {
    const v = veriRapor(1);
    const kalemler = satisTahsilatKalemleri(v, { factoryName: "Altuntaş Makina" });
    const toplam = kalemler.reduce((a, k) => a + k.tutar, 0);
    const hesaplar = [{ ...HESAPLAR[0] }];
    const v2 = { ...v, yedekParcaSatislar: v.yedekParcaSatislar.map(r => ({ ...r, hesapId: 1 })) };
    expect(hesapBakiyeleri(hesaplar, [], { ...v2, bugun: BUGUN, factory: { name: "Altuntaş Makina" } }).get("1").bakiye).toBe(toplam);
  });
});
