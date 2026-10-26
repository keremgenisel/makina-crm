// @vitest-environment jsdom
// Spec 0113: ödeme işareti olan dört bedel kutusu yalnız tahsil edilen bedeli gösterir. Gerçek Finans ekranı; her kriter aynı
// kaydın ödendi / ödenmedi (ya da tahsil edildi / edilmedi) iki varyantıyla ölçülür. Saf ölçüt ve taramalar
// tests/finans-tahsil-0113.test.js'te.
import React from "react";
import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { Finance, TAHSIL_KART_ADLARI, TAHSIL_EK, TOPLAM_BEDEL_ALT_YAZI, TAHSIL_ALT_TOPLAM_ETIKETI } from "../../src/components/Finance";
import { TAHSIL_NEDEN_CEK } from "../../src/lib/utils";
import { hesapBakiyeleri } from "../../src/lib/kasa";
import { CUSTOMERS as C79, PAYMENTS as P79, SERVICES as S79, PART_SALES as PS79, YEDEK as Y79, DEALERS as D79, KDV as K79, FAB as F79 } from "../fixtures/0079-veri";
import ONCE79 from "../fixtures/0079-ekran-once.json";
import { ESKI_KART_ADLARI_0113 } from "../fixtures/0113-ayikla";

beforeAll(() => { vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-20T10:00:00") }); });
afterAll(() => vi.useRealTimers());
afterEach(cleanup);

const FAB = { name: "Altuntaş Makina" };
const DEALERS = [{ id: 7, name: "Ege Bayi" }];
const MAKINA = { id: 1, name: "Kutu Gıda", model: "AK100", currency: "TRY", installDate: "2026-10-01", faturali: "Faturalı Yurtiçi", fabrikaSatisBedeli: 100000, faturaBedeli: 100000, kalanBorc: 0 };
const kalip = (o = {}) => ({ id: 31, customerId: 1, tur: "Kalıp", ad: "Hamburger", ucret: 10000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-05", odendi: true, yontem: "Nakit", satisFirma: "Altuntaş Makina", ...o });
const servis = (o = {}) => ({ id: 41, customerId: 1, date: "2026-10-06", type: "Garanti Dışı", islemFirma: "Altuntaş Makina", servisUcreti: "1000", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", parcaUcreti: "500", parcaCurrency: "TRY", parcaUcretsizMi: false, odendi: true, yontem: "Nakit", ...o });
const yp = (o = {}) => ({ id: 51, aliciTipi: "musteri", musteriId: 1, partId: "7", miktar: 1, birimFiyat: 300, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-07", odendi: true, yontem: "Nakit", tahsisler: [], ...o });

const ac = ({ customers = [MAKINA], services = [], partSales = [], yedekParcaSatislar = [], payments = [] } = {}) => {
  render(<Finance customers={customers} services={services} dealers={DEALERS} partSales={partSales} yedekParcaSatislar={yedekParcaSatislar}
    factory={FAB} rates={{ USD: 30, EUR: 33 }} payments={payments} teklifler={[]} serverPermissions={null} />);
  fireEvent.click(screen.getByTitle("Tutarları göster"));
};
const kart = (ad) => screen.getByText(ad).parentElement;
const tutarlar = (ad) => [...kart(ad).children].slice(1).map(c => c.textContent).filter(t => /^[₺$€]/.test(t));
const kdvSatiri = (ad) => [...kart(ad).children].map(c => c.textContent).find(t => t.startsWith("KDV:")) || null;
const iki = (veri, varyant) => { ac(veri(false)); const a = varyant(); cleanup(); ac(veri(true)); const b = varyant(); cleanup(); return [a, b]; };

describe("Spec 0113: Extra Kalıp kutusu tahsil edileni sayar", () => {
  it("AC-1 / AC-2 / AC-3 / AC-33: ödendi 10.000 (KDV 2.000); ödenmedi tam sıfır ve KDV satırı yok; yeniden ödendi 10.000", () => {
    ac({ partSales: [kalip()] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺10.000"]);
    expect(kdvSatiri(TAHSIL_KART_ADLARI.kalip)).toBe("KDV: ₺2.000");
    cleanup();
    ac({ partSales: [kalip({ odendi: false })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺0"]);
    expect(kdvSatiri(TAHSIL_KART_ADLARI.kalip)).toBeNull();
    cleanup();
    ac({ partSales: [kalip({ odendi: true })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺10.000"]);
  });
  it("AC-4: ödenmedi satış Toplam Alacak'ta KDV dâhil tutarıyla; ödendi yapılınca oradan düşer", () => {
    ac({ partSales: [kalip({ odendi: false })] });
    expect(tutarlar("Toplam Alacak")).toEqual(["₺12.000"]);
    cleanup();
    ac({ partSales: [kalip()] });
    expect(tutarlar("Toplam Alacak")).toEqual(["₺0"]);
  });
  it("AC-13 / AC-34: ücretsiz işaretli, ücreti dolu ve ödendi işaretli kalıp kutuya girmez", () => {
    ac({ partSales: [kalip({ ucretsizMi: true })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺0"]);
    expect(tutarlar("Toplam Alacak")).toEqual(["₺0"]);
    // Karar 20 (triyaj): ücretsiz kalıbın KDV'si tahakkuk kartında kalır (makina 20.000 + kalıp 2.000).
    expect(tutarlar("Ödenmesi Muhtemel KDV")).toEqual(["₺22.000"]);
  });
  it("AC-27: yansıtılan komisyon tahsil edilmiş kayıtta düşülür; tahsil edilmemiş kayıtta kutu eksiye düşmez", () => {
    const kk = (o) => kalip({ yontem: "Kredi Kartı", kartKomisyonu: { yansitildi: true, toplamKesinti: 500, blokajGun: 0 }, ...o });
    ac({ partSales: [kk()] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺9.500"]);
    cleanup();
    ac({ partSales: [kk({ odendi: false })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺0"]);
  });
  it("AC-43: yöntemi boş, ödendi işaretli kayıt nakit gibi kutuya girer", () => {
    ac({ partSales: [kalip({ yontem: "" })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺10.000"]);
  });
});

describe("Spec 0113: servis ve yedek parça kutuları", () => {
  it("AC-5: Altuntaş servisi ödenmedi yapılınca işçilik ve parça birlikte düşer", () => {
    ac({ services: [servis()] });
    expect(tutarlar(TAHSIL_KART_ADLARI.servis)).toEqual(["₺1.000"]);
    expect(tutarlar(TAHSIL_KART_ADLARI.parca)).toEqual(["₺500"]);
    cleanup();
    ac({ services: [servis({ odendi: false })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.servis)).toEqual(["₺0"]);
    expect(tutarlar(TAHSIL_KART_ADLARI.parca)).toEqual(["₺0"]);
  });
  it("AC-6: anlaşmalı firmanın servisi ödenmedi yapılınca Anlaşmalı Parça kutusundan düşer; Servis Ücreti kutusu etkilenmez", () => {
    const [once, sonra] = iki(o => ({ services: [servis({ islemFirma: "Ege Bayi", odendi: !o })] }),
      () => [tutarlar(TAHSIL_KART_ADLARI.anlasmali), tutarlar(TAHSIL_KART_ADLARI.servis)]);
    expect(once).toEqual([["₺500"], ["₺0"]]);
    expect(sonra).toEqual([["₺0"], ["₺0"]]);
  });
  it("AC-7 / AC-8 / AC-9: yedek parça satışı alıcısına göre kendi kutusundan düşer (müşteri → parça, bayi ve dış firma → anlaşmalı)", () => {
    const durumlar = [
      [yp(), TAHSIL_KART_ADLARI.parca],
      [yp({ aliciTipi: "bayi", musteriId: null, dealerId: 7 }), TAHSIL_KART_ADLARI.anlasmali],
      [yp({ aliciTipi: "bayi", musteriId: null, disFirma: true, disFirmaAd: "Kuzey Servis" }), TAHSIL_KART_ADLARI.anlasmali],
    ];
    for (const [kayit, ad] of durumlar) {
      const [once, sonra] = iki(o => ({ yedekParcaSatislar: [{ ...kayit, odendi: !o }] }), () => tutarlar(ad));
      expect(once, ad).toEqual(["₺300"]);
      expect(sonra, ad).toEqual(["₺0"]);
    }
  });
  it("AC-27 (servis, plan turu Karar 17): yansıtılan komisyon tahsil edilmemiş serviste kutudan düşülmez, kutu eksiye inmez", () => {
    const kk = (o) => servis({ yontem: "Kredi Kartı", kartKomisyonu: { yansitildi: true, toplamKesinti: 150, blokajGun: 0 }, ...o });
    ac({ services: [kk()] });
    expect(tutarlar(TAHSIL_KART_ADLARI.servis)).toEqual(["₺900"]);
    expect(tutarlar(TAHSIL_KART_ADLARI.parca)).toEqual(["₺450"]);
    cleanup();
    ac({ services: [kk({ odendi: false })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.servis)).toEqual(["₺0"]);
    expect(tutarlar(TAHSIL_KART_ADLARI.parca)).toEqual(["₺0"]);
  });
  it("AC-12: ücretsiz işaretli yedek parça satışı hiçbir kutuya girmez", () => {
    ac({ yedekParcaSatislar: [yp({ ucretsizMi: true })] });
    for (const ad of Object.values(TAHSIL_KART_ADLARI)) expect(tutarlar(ad), ad).toEqual(["₺0"]);
  });
});

describe("Spec 0113: çek ve kredi kartı dalları", () => {
  it("AC-10: çekle ödenmiş ama çeki tahsil edilmemiş kayıt girmez, tahsil edilince girer (Extra Kalıp, servis, yedek parça)", () => {
    const durumlar = [
      [t => ({ partSales: [kalip({ yontem: "Çek", tahsilEdildi: t })] }), TAHSIL_KART_ADLARI.kalip, "₺10.000"],
      [t => ({ services: [servis({ yontem: "Çek", tahsilEdildi: t })] }), TAHSIL_KART_ADLARI.servis, "₺1.000"],
      [t => ({ yedekParcaSatislar: [yp({ yontem: "Çek", tahsilEdildi: t })] }), TAHSIL_KART_ADLARI.parca, "₺300"],
    ];
    for (const [veri, ad, tam] of durumlar) {
      const [bekleyen, tahsil] = iki(veri, () => tutarlar(ad));
      expect(bekleyen, ad).toEqual(["₺0"]);
      expect(tahsil, ad).toEqual([tam]);
    }
  });
  it("AC-11: kredi kartında blokaj bitmemiş (gelecek hesaba geçiş) girmez, geçmiş hesaba geçiş girer; sahte saat yok, fikstür tarihleri", () => {
    const kk = (gecis) => kalip({ yontem: "Kredi Kartı", kartKomisyonu: { yansitildi: false, toplamKesinti: 0, blokajGun: 30, hesabaGecis: gecis } });
    ac({ partSales: [kk("2099-01-01")] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺0"]);
    cleanup();
    ac({ partSales: [kk("2020-01-01")] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺10.000"]);
  });
});

describe("Spec 0113: değişmeyen kartlar ve iki birikim kümesi", () => {
  const veri = (o) => ({ partSales: [kalip({ odendi: !o })] });
  it("AC-14: makina kutuları ödenmedi yapılınca değişmez", () => {
    const [a, b] = iki(veri, () => [kart("Toplam Fabrika Satış Bedeli").textContent, kart("Toplam Fatura Bedeli").textContent]);
    expect(b).toEqual(a);
  });
  it("AC-15 / AC-16 / AC-32: Toplam Bedel kaydın payı kadar düşer, makina payı kalır; KDV satırı kendi bileşenlerinden; alt yazı esası söyler", () => {
    ac(veri(false));
    expect(tutarlar("Toplam Bedel")).toEqual(["₺110.000"]);
    expect(kdvSatiri("Toplam Bedel")).toBe("KDV: ₺22.000");
    expect(kart("Toplam Bedel").textContent).toContain(TOPLAM_BEDEL_ALT_YAZI);
    cleanup();
    ac(veri(true));
    expect(tutarlar("Toplam Bedel")).toEqual(["₺100.000"]);
    expect(kdvSatiri("Toplam Bedel")).toBe("KDV: ₺20.000");
    expect(TOPLAM_BEDEL_ALT_YAZI).toMatch(/satış anında/);
    expect(TOPLAM_BEDEL_ALT_YAZI).toMatch(/tahsil edilen/);
  });
  it("AC-17 / AC-32: Ödenmesi Muhtemel KDV ödenmedi yapılan kaydın KDV'sini düşürmez", () => {
    const [a, b] = iki(veri, () => tutarlar("Ödenmesi Muhtemel KDV"));
    expect(a).toEqual(["₺22.000"]);
    expect(b).toEqual(a);
  });
  it("AC-17 (triyaj, beş kol): servis ücreti, Altuntaş ve anlaşmalı servis parçası, müşteriye ve bayiye yedek parça ödenmedi yapılınca KDV kartı değişmez", () => {
    const kollar = [
      ["servis ücreti", o => ({ services: [servis({ parcaUcreti: "0", odendi: !o })] }), "₺20.200"],
      ["Altuntaş servis parçası", o => ({ services: [servis({ servisUcreti: "0", odendi: !o })] }), "₺20.100"],
      ["anlaşmalı servis parçası", o => ({ services: [servis({ islemFirma: "Ege Bayi", servisUcreti: "0", odendi: !o })] }), "₺20.100"],
      ["müşteriye yedek parça", o => ({ yedekParcaSatislar: [yp({ odendi: !o })] }), "₺20.060"],
      ["bayiye yedek parça", o => ({ yedekParcaSatislar: [yp({ aliciTipi: "bayi", musteriId: null, dealerId: 7, odendi: !o })] }), "₺20.060"],
    ];
    for (const [kol, veri, beklenen] of kollar) {
      const [a, b] = iki(veri, () => tutarlar("Ödenmesi Muhtemel KDV"));
      expect(a, kol).toEqual([beklenen]);
      expect(b, kol).toEqual(a);
    }
  });
  it("AC-18: KDV kartı ile Toplam Bedel'in KDV satırı arasındaki fark tahsil edilmemiş kayıtların KDV'si kadar", () => {
    ac({ partSales: [kalip(), kalip({ id: 32, odendi: false })] });
    expect(tutarlar("Ödenmesi Muhtemel KDV")).toEqual(["₺24.000"]);
    expect(kdvSatiri("Toplam Bedel")).toBe("KDV: ₺22.000"); // fark 2.000 = ödenmemiş kalıbın KDV'si
    expect(kdvSatiri(TAHSIL_KART_ADLARI.kalip)).toBe("KDV: ₺2.000");
  });
  it("AC-19 / AC-20 / AC-21: adet, kredi kartı satışı, banka komisyonu ve ödenen komisyon kartları ödenmedi yapılınca değişmez", () => {
    const kk = (o) => ({ customers: [{ ...MAKINA, komisyon: 4000 }], partSales: [kalip({ odendi: !o, yontem: "Kredi Kartı", kartKomisyonu: { yansitildi: false, toplamKesinti: 400, blokajGun: 0, oran: 4 } })] });
    const adlar = ["Toplam Satılan Makina", "Toplam Satılan Kalıp", "İlk Satışta Verilen Toplam Kalıp", "Satılan Extra Kalıp", "Satılan Yedek Parça",
      "Toplam Kredi Kartı ile Satış", "Toplam Ödenen Banka Komisyonu", "Toplam Ödenen Komisyon"];
    const [a, b] = iki(kk, () => adlar.map(ad => kart(ad).textContent));
    expect(b).toEqual(a);
  });
  it("AC-44: eski partSales tur 'YedekParca' hiçbir bedel kutusuna girmez, adet kartına katkısı korunur", () => {
    const eski = { id: 61, customerId: 1, tur: "YedekParca", ucret: 900, miktar: 2, currency: "TRY", tarih: "2026-10-08", odendi: false };
    ac({ partSales: [] });
    const bos = Object.values(TAHSIL_KART_ADLARI).map(tutarlar);
    cleanup();
    ac({ partSales: [eski] });
    expect(Object.values(TAHSIL_KART_ADLARI).map(tutarlar)).toEqual(bos);
    expect(kart("Satılan Yedek Parça").textContent).toContain("2");
  });
});

describe("Spec 0113: adlar, kapsam ve boş hâller", () => {
  it("AC-22: dört kutunun adı sabitlerdeki addır ve alt yazıları ortak eki taşır", () => {
    ac({});
    expect(Object.values(TAHSIL_KART_ADLARI)).toEqual(["Tahsil Edilen Servis Ücreti", "Tahsil Edilen Parça Ücreti", "Tahsil Edilen Anlaşmalı Servis Parçası", "Tahsil Edilen Extra Kalıp Bedeli"]);
    expect(TAHSIL_EK).toBe("tahsil edilen tutar; tahsil edilmeyen, tarih filtresinden bağımsız Toplam Alacak kartında");
    for (const ad of Object.values(TAHSIL_KART_ADLARI)) expect(kart(ad).textContent, ad).toContain(TAHSIL_EK);
  });
  it("AC-26: TL, USD ve EUR ayrı sayılır; bilinmeyen para birimi TL kovasına düşer", () => {
    ac({ partSales: [kalip({ currency: "USD", ucret: 1000 }), kalip({ id: 33, currency: "EUR", ucret: 2000 }), kalip({ id: 34, currency: "GBP", ucret: 3000 }), kalip({ id: 35, currency: "USD", ucret: 500, odendi: false })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺3.000", "$1.000", "€2.000"]);
  });
  it("AC-28 / AC-39: süzgeç satış tarihine bakar; dönem dışı satış girmez, dönemde satılıp dönem dışında tahsil edilen girer", () => {
    ac({ partSales: [kalip({ tarih: "2025-03-01" }), kalip({ id: 36, tarih: "2026-02-01", tahsilatTarihi: "2027-01-05" })] });
    fireEvent.click(within(screen.getByRole("group", { name: "Tarih aralığı" })).getByRole("button", { name: "Bu Yıl" }));
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺10.000"]);
  });
  it("AC-29: hiç kayıt olmayan dönemde kartlar çizilir, dört kutu sıfır; model ve satıcı boş durumları bugünkü ölçütle", () => {
    ac({ customers: [] });
    for (const ad of Object.values(TAHSIL_KART_ADLARI)) expect(tutarlar(ad), ad).toEqual(["₺0"]);
    expect(document.querySelectorAll('[data-testid^="bos-"]').length).toBeGreaterThan(0);
  });
  it("AC-42: kayıt var ama hiçbiri tahsil edilmemiş; kart bloğu çizilir, dört kutu sıfır, boş durum kartların yerine geçmez", () => {
    ac({ services: [servis({ odendi: false })], partSales: [kalip({ odendi: false })], yedekParcaSatislar: [yp({ odendi: false }), yp({ id: 52, aliciTipi: "bayi", musteriId: null, dealerId: 7, odendi: false })] });
    for (const ad of Object.values(TAHSIL_KART_ADLARI)) expect(tutarlar(ad), ad).toEqual(["₺0"]);
    expect(tutarlar("Toplam Alacak")).not.toEqual(["₺0"]);
  });
  it("AC-38: hesabı atanmamış tahsil edilmiş kayıt kutuda sayılır ama hiçbir Kasa bakiyesine girmez", () => {
    const k = kalip({ hesapId: null });
    ac({ partSales: [k] });
    expect(tutarlar(TAHSIL_KART_ADLARI.kalip)).toEqual(["₺10.000"]);
    const hesap = [{ id: 401, ad: "Banka", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 5000, acilisTarihi: "2026-01-01" }];
    const bak = (ps) => JSON.stringify([...hesapBakiyeleri(hesap, [], { partSales: ps, customers: [MAKINA], factory: FAB, bugun: "2026-10-20" }).entries()]);
    expect(bak([k])).toBe(bak([]));
  });
  it("AC-45: model kırılımı, bayi kırılımı ve 12 aylık trend ödenmedi yapılınca değişmez", () => {
    const [a, b] = iki(o => ({ services: [servis({ odendi: !o })], partSales: [kalip({ odendi: !o })] }), () => {
      const t = document.body.textContent;
      return t.slice(t.indexOf("Son 12 Ay"));
    });
    expect(b).toEqual(a);
  });
});

describe("Spec 0113: Anlaşmalı Servis detay penceresi (R18, R18/2)", () => {
  const veri = { services: [
    servis({ id: 71, islemFirma: "Ege Bayi", parcaUcreti: "500" }),
    servis({ id: 72, islemFirma: "Ege Bayi", parcaUcreti: "300", yontem: "Çek", tahsilEdildi: false }),
    servis({ id: 73, islemFirma: "Ege Bayi", parcaUcreti: "200", odendi: false }),
  ] };
  it("AC-24 / AC-25 / AC-41: bütün satırlar durur, sütun 'Tahsil edildi' türetilmiş ölçütten; çeki bekleyen satır nedeniyle; alt toplam kartla tutar", () => {
    ac(veri);
    expect(tutarlar(TAHSIL_KART_ADLARI.anlasmali)).toEqual(["₺500"]);
    fireEvent.click(kart(TAHSIL_KART_ADLARI.anlasmali));
    const pencere = screen.getByText("Anlaşmalı Servislere Satılan Parça Detayı").closest("[role=dialog]") || document.body;
    expect(within(pencere).getByText("Tahsil edildi", { selector: "th" })).toBeTruthy();
    const durumlar = within(pencere).getAllByTestId("anlasmali-tahsil").map(e => e.textContent);
    expect(durumlar.sort()).toEqual(["Tahsil edildi", "Tahsil edilmedi", "Tahsil edilmedi"]);
    expect(within(pencere).getAllByTestId("anlasmali-tahsil-neden").map(e => e.textContent)).toEqual([TAHSIL_NEDEN_CEK]);
    expect(within(pencere).getByTestId("anlasmali-tahsil-alt-toplam").textContent).toBe(`${TAHSIL_ALT_TOPLAM_ETIKETI}: ₺500`);
  });
  it("Karar 22 (triyaj): alt toplam arama süzgecinden bağımsız; tanınmayan parça para birimi kartla aynı kuralla TL kovasına", () => {
    ac({ services: [...veri.services, servis({ id: 74, customerId: 1, islemFirma: "Kuzey Servis", parcaUcreti: "250", parcaCurrency: "GBP" })] });
    expect(tutarlar(TAHSIL_KART_ADLARI.anlasmali)).toEqual(["₺750"]);
    fireEvent.click(kart(TAHSIL_KART_ADLARI.anlasmali));
    const alt = () => screen.getByTestId("anlasmali-tahsil-alt-toplam").textContent;
    expect(alt()).toBe(`${TAHSIL_ALT_TOPLAM_ETIKETI}: ₺750`);
    fireEvent.change(screen.getByPlaceholderText("Müşteri firma veya servis firması ara..."), { target: { value: "Kuzey" } });
    expect(screen.getAllByTestId("anlasmali-tahsil")).toHaveLength(1);
    expect(alt()).toBe(`${TAHSIL_ALT_TOPLAM_ETIKETI}: ₺750`);
  });
});

// AC-31: tahsil süzgecinin bugünkü veride etkisi sıfırdır. Spec öncesi kod ödeme durumunu hiç okumadığı için 0079 verisinin
// her kaydı tahsil edilmiş yapılınca dört kutunun metni (ad ve ortak ek dışında) spec öncesi altınla birebir aynı olmalıdır.
describe("Spec 0113: bugünkü veride etki sıfır", () => {
  it("AC-31: bütün kayıtlar tahsil edilmişken dört kutu spec öncesi rakamlarını korur (0079 altını)", () => {
    const tahsilli = (r) => ({ ...r, odendi: true, tahsilEdildi: true, ...(r.kartKomisyonu ? { kartKomisyonu: { ...r.kartKomisyonu, hesabaGecis: "2000-01-01" } } : {}) });
    const f = render(<Finance customers={C79} services={S79.map(tahsilli)} dealers={D79} partSales={PS79.map(tahsilli)} yedekParcaSatislar={Y79.map(tahsilli)}
      factory={F79} rates={{}} payments={P79} teklifler={[]} serverPermissions={null} kdvRates={K79} appSettings={{ kdvRates: K79 }} />);
    fireEvent.click(screen.getByTitle("Tutarları göster"));
    const metin = f.container.textContent.replace(/\s+/g, " ").trim();
    const kesit = (t, bas) => t.slice(t.indexOf(bas), t.indexOf("Toplam Ödenen Komisyon"));
    let simdi = kesit(metin, TAHSIL_KART_ADLARI.servis).split(` · ${TAHSIL_EK}`).join("");
    for (const k of Object.keys(TAHSIL_KART_ADLARI)) simdi = simdi.split(TAHSIL_KART_ADLARI[k]).join(ESKI_KART_ADLARI_0113[k]);
    const once = kesit(ONCE79.finans, ESKI_KART_ADLARI_0113.servis);
    expect(once.length).toBeGreaterThan(100);
    expect(simdi).toBe(once);
  });
});
