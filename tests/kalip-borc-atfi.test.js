// Spec 0007: Extra Kalıp borç atıfı, tek kaynak kalipBorcTarafi (src/lib/utils.js) ve tüketicileri.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { kalipBorcTarafi, partSaleMusteriBorcuMu, customerHasAnyDebt, fabrikaSatisiMi } from "../src/lib/utils";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { kalipSatisiEkle } from "../src/lib/kalipSatisi";

const FAB = "Altuntaş Fabrika";
const CUST = [{ id: 500, name: "Kutu Gıda", model: "AK100", currency: "TRY" }];
const DEALERS = [{ id: 3, name: "Ege Bayi" }];
const kalip = (o = {}) => ({ id: 1, customerId: 500, tur: "Kalıp", ad: "Hamburger", ucret: 1000, currency: "TRY", tarih: "2026-07-10", faturaTipi: "Faturasız Yurtiçi", odendi: false, ...o });
const rapor = (partSales) => hesaplaAylikRapor({ customers: CUST, services: [], partSales, payments: [], teklifler: [], dealers: DEALERS, yedekParcaSatislar: [] }, "2026-07", { factoryName: FAB });

describe("kalipBorcTarafi (R4, R6–R8, R12)", () => {
  it("AC-6: satış yapan bir bayi → borçlu o bayi", () => {
    expect(kalipBorcTarafi(kalip({ satisFirma: "Ege Bayi" }), FAB)).toEqual({ tip: "bayi", ad: "Ege Bayi" });
  });
  it("AC-11: 'Diğer' → kayıttaki firma adı, müşteri değil", () => {
    expect(kalipBorcTarafi(kalip({ satisFirma: "Diğer", satisFirmaAd: "Aracı Ltd" }), FAB)).toEqual({ tip: "disFirma", ad: "Aracı Ltd" });
  });
  it("AC-12: satış yapan boş → müşteri", () => {
    expect(kalipBorcTarafi(kalip(), FAB)).toEqual({ tip: "musteri", customerId: 500 });
  });
  it("AC-13 / K1: fabrika (güncel ad veya eski varsayılan 'Altuntaş Makina') → müşteri", () => {
    expect(kalipBorcTarafi(kalip({ satisFirma: FAB }), FAB).tip).toBe("musteri");
    expect(kalipBorcTarafi(kalip({ satisFirma: "Altuntaş Makina" }), FAB).tip).toBe("musteri");
    expect(fabrikaSatisiMi("", FAB)).toBe(true);
  });
  it("AC-14: ücretsiz kalıp hiçbir tarafta borç üretmez (bayi satışı dahil)", () => {
    expect(kalipBorcTarafi(kalip({ ucretsizMi: true }), FAB)).toBeNull();
    expect(kalipBorcTarafi(kalip({ ucretsizMi: true, satisFirma: "Ege Bayi" }), FAB)).toBeNull();
  });
  it("AC-15: ödendi → borç yok", () => {
    expect(kalipBorcTarafi(kalip({ satisFirma: "Ege Bayi", odendi: true }), FAB)).toBeNull();
  });
  it("R12 / K5: Kalıp dışı eski türler bugünkü gibi müşteride", () => {
    expect(kalipBorcTarafi(kalip({ tur: "Parça", satisFirma: "Ege Bayi" }), FAB)).toEqual({ tip: "musteri", customerId: 500 });
  });
});

describe("tüketiciler: Müşteriler (customerHasAnyDebt) ve aylık rapor (R5, R9, R13)", () => {
  it("AC-7 (kural): bayinin sattığı ödenmemiş kalıp yüzünden müşteri borçlu sayılmaz; fabrika satışında sayılır", () => {
    expect(customerHasAnyDebt(CUST[0], [], [kalip({ satisFirma: "Ege Bayi" })], FAB)).toBe(false);
    expect(customerHasAnyDebt(CUST[0], [], [kalip({ satisFirma: FAB })], FAB)).toBe(true);
    expect(customerHasAnyDebt(CUST[0], [], [kalip({ ucretsizMi: true })], FAB)).toBe(false);
  });
  it("AC-9: aylık raporda alacak bayinin satırında (yedek parça bayi anahtarıyla aynı 'b:' satırı), müşteride değil", () => {
    const r = rapor([kalip({ satisFirma: "Ege Bayi" })]);
    expect(r.borcluFirma).toBe(1);
    expect(r.alacakDetay.map(x => x.firma)).toEqual(["Ege Bayi"]);
    expect(rapor([kalip({ satisFirma: FAB })]).alacakDetay.map(x => x.firma)).toEqual(["Kutu Gıda"]);
    expect(partSaleMusteriBorcuMu(kalip({ satisFirma: "Ege Bayi" }), FAB)).toBe(false);
  });
  it("AC-10: kuralın devreye girmesi toplam alacağı değiştirmez (aynı tutar bir kez)", () => {
    const musteride = rapor([kalip({ satisFirma: FAB })]);
    const bayide = rapor([kalip({ satisFirma: "Ege Bayi" })]);
    expect(bayide.acikBorc).toEqual(musteride.acikBorc);
    expect(bayide.acikBorc.TRY).toBe(1000);
    expect(bayide.borcluFirma).toBe(1);
  });
  it("AC-11 (rapor): 'Diğer' firmanın borcu ad anahtarlı satırda", () => {
    const r = rapor([kalip({ satisFirma: "Diğer", satisFirmaAd: "Aracı Ltd" })]);
    expect(r.alacakDetay.map(x => x.firma)).toEqual(["Aracı Ltd"]);
    expect(r.acikBorc.TRY).toBe(1000);
  });
  it("AC-14 (rapor) / K2: ücretsiz kalıp toplam alacağa girmez", () => {
    expect(rapor([kalip({ ucretsizMi: true })]).acikBorc.TRY || 0).toBe(0);
  });
  it("R13: aynı bayinin kalıp ve yedek parça borcu tek borçlu firma sayılır", () => {
    const r = hesaplaAylikRapor({ customers: CUST, services: [], partSales: [kalip({ satisFirma: "Ege Bayi" })], payments: [], teklifler: [], dealers: DEALERS,
      yedekParcaSatislar: [{ id: 9, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 1, birimFiyat: 50, currency: "TRY", tarih: "2026-07-11", faturaTipi: "Faturasız Yurtiçi", odendi: false, tahsisler: [] }] }, "2026-07", { factoryName: FAB });
    expect(r.borcluFirma).toBe(1);
    expect(r.acikBorc.TRY).toBe(1050);
  });
});

describe("C3: beş tüketici tek fonksiyona bağlı (kaynak taraması)", () => {
  const kok = path.join(__dirname, "..");
  it("Müşteriler, Anasayfa, Bayiler, aylık rapor ve müşteri detayı kalıp kolunda kalipBorcTarafi / partSaleMusteriBorcuMu kullanır", () => {
    for (const f of ["src/lib/utils.js", "src/components/Dashboard.jsx", "src/components/SimpleDealers.jsx", "src/lib/aylikRapor.js", "src/components/customers/detail/deriveCustomerDetail.js"]) {
      expect(readFileSync(path.join(kok, f), "utf-8"), f).toMatch(/kalipBorcTarafi|partSaleMusteriBorcuMu/);
    }
    for (const f of ["src/components/Dashboard.jsx", "src/components/SimpleDealers.jsx", "src/lib/aylikRapor.js", "src/components/customers/detail/deriveCustomerDetail.js"]) {
      expect(readFileSync(path.join(kok, f), "utf-8"), f).not.toMatch(/isPartSaleBorcluMu/);
    }
  });
});

describe("C2: tek kayıt yolu (kalipSatisiEkle)", () => {
  const deps = () => {
    const d = { partSales: [], customers: CUST.map(c => ({ ...c, kaliplar: [] })) };
    const set = (k) => (u) => { d[k] = typeof u === "function" ? u(d[k]) : u; };
    let n = 100;
    return { d, deps: { customers: d.customers, setPartSales: set("partSales"), setCustomers: set("customers"), uid: () => ++n, simdi: () => "2026-07-10T10:00:00", bugun: "2026-07-10" } };
  };
  it("AC-5 (kural): müşterisiz kayıt yapılmaz, neden döner", () => {
    const { d, deps: dp } = deps();
    expect(kalipSatisiEkle({ customerId: "", kaliplar: [{ ad: "H", fiyat: "10" }] }, dp).hata).toMatch(/müşteriyi ve makinayı seçin/);
    expect(d.partSales).toEqual([]);
  });
  it("bayi aracılığıyla kayıt: satış yapan bayi, kalıp müşterinin listesinde", () => {
    const { d, deps: dp } = deps();
    const r = kalipSatisiEkle({ customerId: 500, kaliplar: [{ ad: "Hamburger", fiyat: "1.000" }], satisFirma: "Ege Bayi", faturaTipi: "Faturalı Yurtiçi" }, dp);
    expect(r.ok).toBe(true);
    expect(d.partSales[0]).toMatchObject({ customerId: 500, tur: "Kalıp", satisFirma: "Ege Bayi", ucret: 1000 });
    expect(d.customers[0].kaliplar).toEqual([{ ad: "Hamburger", olcu: "", partSaleId: d.partSales[0].id }]);
  });
});
