// @vitest-environment jsdom
// Spec 0116: ihraç kayıtlı açıklama kutusu üç satış formundan kalkar. Kutunun dört parçası ve yedek parçanın sınır satırı hiçbir
// formda çizilmez; satış tipi seçicisi, KDV kutusundaki beş özet satırı ve pasif tevkifat kutusu aynen kalır. Değişmeyen hesap,
// rozet, rapor ve dışa aktarma 0114'ün testlerinde dokunulmadan ölçülür (AC-13 – AC-17, Karar 9 ve 14).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { useState } from "react";
import { PartSaleForm } from "../../src/components/PartSaleForm";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";
import { Customers } from "../../src/components/Customers";
import { IHRAC_SECENEK, IHRAC_TEVKIFAT_NEDENI, IHRAC_OZET_ETIKETLERI } from "../../src/lib/ihracKayitli";
import { SALE_TYPES } from "../../src/lib/constants";
import { KK_AYAR } from "../fixtures/0079-veri";
import { KDV, FY, IK, CUSTOMERS, PARTS } from "../fixtures/0114-veri";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); });

const M = [CUSTOMERS[0], CUSTOMERS[1]];
const son = { form: null };
const Kab = ({ Bilesen, ilk, ...rest }) => {
  const [form, setForm] = useState(ilk);
  son.form = form;
  return <Bilesen title="T" form={form} setForm={setForm} customers={M} dealers={[]} parts={PARTS} kdvRates={KDV} krediKartiKomisyonlari={KK_AYAR} onCancel={vi.fn()} onSave={vi.fn()} {...rest} />;
};
const kalip = (ek = {}) => render(<Kab Bilesen={PartSaleForm} ilk={{ customerId: 2, tarih: "2026-09-10", currency: "TRY", faturaTipi: FY, kaliplar: [{ ad: "K", olcu: "1", fiyat: 100000 }], ...ek }} />);
const yp = (ek = {}) => render(<Kab Bilesen={YedekParcaSatisForm} ilk={{ aliciTipi: "musteri", musteriId: 2, tarih: "2026-09-10", currency: "TRY", faturaTipi: FY, satirlar: [{ partId: "81", miktar: 1, birimFiyat: 100000 }], ...ek }} />);
// Müşteri formu: işaretli makina kaydının düzenlemesi (KDV kutusu fatura bedeliyle dolu).
const musteri = () => {
  render(<Customers customers={M} setCustomers={vi.fn()} services={[]} partSales={[]} payments={[]} dealers={[]} parts={PARTS} kdvRates={KDV}
    setPayments={vi.fn()} gorusmeler={[]} dosyalar={[]} initialDetailId={1} />);
  fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.trim() === "Düzenle"));
};
const FORMLAR = [["müşteri", musteri], ["Extra Kalıp", () => kalip(IK)], ["yedek parça", () => yp(IK)]];
const secici = () => screen.getAllByRole("combobox").find(s => s.options && [...s.options].some(o => o.value === "Faturasız Yurtdışı"));
const kutu = () => screen.queryByRole("checkbox", { name: "Bu fatura tevkifatlı" });
const kutuParcalariYok = (ad) => {
  // Gerileme bekçisi (AC-31): kutunun kabı testid'iyle tek olumsuz iddia.
  expect(screen.queryByTestId("ihrac-kayitli-alani"), ad).toBeNull();
  expect(document.body.textContent, ad).not.toContain("11/1-c");
  expect(document.body.textContent, ad).not.toContain("e-fatura yazılımında");
  expect(screen.queryByRole("button", { name: "Kopyala" }), ad).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Faturaya yazılacak ibare" }), ad).toBeNull();
};

describe("Spec 0116 A: kutu yok (AC-1 – AC-7)", () => {
  it("AC-1 / AC-2 / AC-3: üç formda ihraç kayıtlı seçiliyken açıklama kutusu çizilmez", () => {
    for (const [ad, ciz] of FORMLAR) {
      ciz();
      expect(secici().value, ad).toBe(IHRAC_SECENEK);
      kutuParcalariYok(ad);
      cleanup();
    }
  });
  it("AC-1 (seçim anında): işaretsiz formda 'İhraç Kayıtlı' seçilince de kutu açılmaz", () => {
    for (const [ad, ciz] of [["Extra Kalıp", () => kalip()], ["yedek parça", () => yp()]]) {
      ciz();
      fireEvent.change(secici(), { target: { value: IHRAC_SECENEK } });
      expect(son.form.ihracKayitli, ad).toBe(true);
      kutuParcalariYok(ad);
      cleanup();
    }
  });
  it("AC-4: üç formun hiçbirinde ibare metni ekranda geçmez (düz metin '11/1-c', Karar 22)", () => {
    for (const [ad, ciz] of FORMLAR) { ciz(); expect(document.body.textContent, ad).not.toContain("11/1-c"); cleanup(); }
  });
  it("AC-5: üç formun hiçbirinde Kopyala düğmesi yok", () => {
    for (const [ad, ciz] of FORMLAR) { ciz(); expect(screen.queryByRole("button", { name: "Kopyala" }), ad).toBeNull(); cleanup(); }
  });
  it("AC-6: yedek parça formunda üretim sınırı satırı yok", () => {
    yp(IK);
    expect(document.body.textContent).not.toContain("hazır alıp sattığımız parçada");
  });
  it("AC-7: yedek parça formunda ücretsiz işareti açıkken satış tipi seçicisi çizilmez", () => {
    yp({ ucretsizMi: true, ...IK });
    expect(secici()).toBeUndefined();
  });
});

describe("Spec 0116 B: kalanlar (AC-8 – AC-12)", () => {
  it("AC-8: üç formda seçici beş seçenek taşır ve 'İhraç Kayıtlı' seçilebilir", () => {
    for (const [ad, ciz] of FORMLAR) {
      ciz();
      expect([...secici().options].map(o => o.value), ad).toEqual([...SALE_TYPES, IHRAC_SECENEK]);
      cleanup();
    }
  });
  it("AC-9 / AC-10 / AC-11: işaret seçiliyken üç formun KDV kutusunda beş özet satırı bugünkü etiketlerle", () => {
    const E = IHRAC_OZET_ETIKETLERI;
    for (const [ad, ciz] of FORMLAR) {
      ciz();
      const satirlar = [...screen.getByTestId("ihrac-kayitli-ozet").children].map(d => d.textContent);
      expect(satirlar.length, ad).toBe(5);
      [E.matrah, E.toplamKdv, E.ertelenenKdv, E.tahsilKdv, E.faturaToplami].forEach((et, i) => expect(satirlar[i].startsWith(et), `${ad} ${et}`).toBe(true));
      cleanup();
    }
  });
  it("AC-12: işaret seçiliyken tevkifat kutusu üç formda pasif ve nedeni yanında", () => {
    for (const [ad, ciz] of FORMLAR) {
      ciz();
      expect(kutu().disabled, ad).toBe(true);
      expect(kutu().checked, ad).toBe(false);
      expect(within(document.body).getByTestId("satis-tevkifat-pasif-nedeni").textContent, ad).toBe(IHRAC_TEVKIFAT_NEDENI);
      cleanup();
    }
  });
});
