// @vitest-environment jsdom
// Spec 0015 AC-8 (plan F5, R8): kapsamdaki form pencereleri düğmelerini pencerenin alt yuvasında çizer; ikincil
// eylemler solda, birincil eylem (Kaydet) en sağda; metinler aynı. "Stoğa Parça Ekle" gövde içi satırını korur (F5).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Stock } from "../../src/components/Stock";
import { KalipManager } from "../../src/components/KalipManager";
import { ModelsManager } from "../../src/components/ModelsManager";
import { PartManager } from "../../src/components/PartManager";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const M = [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }];
const D = [{ id: 3, name: "Ege Bayi", bayiMi: true }];
const P = [{ id: 7, ad: "Rulman" }];
const tikla = (re) => fireEvent.click(screen.getAllByRole("button").filter(b => re.test(b.textContent.trim())).pop());
const kutu = () => { const m = document.querySelectorAll(".modal-backdrop"); return m[m.length - 1].firstElementChild; };
// Alt yuvalı pencere: kutu üç parça (başlık, kaydırılan gövde, alt yuva); alt yuva kutunun son çocuğu.
const altYuva = () => { const k = kutu(); return k.children.length === 3 ? k.lastElementChild : null; };
const dugmeler = (el) => [...el.querySelectorAll("button")];
const metin = (b) => b.textContent.trim();

const denetle = (ikincil, birincil) => {
  const y = altYuva();
  expect(y, "pencerenin alt yuvası yok").toBeTruthy();
  const b = dugmeler(y);
  expect(b.map(metin)).toEqual([...ikincil, birincil]);
  expect(b[b.length - 1].className).toContain("btn--primary");
  for (const x of b.slice(0, -1)) expect(x.className).not.toContain("btn--primary");
  // Düğmeler gövdede ikinci kez çizilmez.
  const govde = kutu().children[1];
  expect(dugmeler(govde).some(x => metin(x) === birincil)).toBe(false);
};

const musteriDetay = () => render(<Customers customers={M} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} dealers={D} parts={P}
  setServices={vi.fn()} setPartSales={vi.fn()} setYedekParcaSatislar={vi.fn()} initialDetailId={1} />);

describe("AC-8: alt eylem satırı", () => {
  it("müşteri formu: İptal · Kaydet", () => {
    render(<Customers customers={[]} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} stock={[]} setStock={vi.fn()} />);
    tikla(/Yeni Müşteri/);
    denetle(["İptal"], "Kaydet");
  });
  it("bayi formu: İptal · Kaydet", () => {
    render(<SimpleDealers dealers={[]} setDealers={vi.fn()} factory={{ name: "A" }} setFactory={vi.fn()} partSales={[]} services={[]} customers={[]} showToast={vi.fn()} />);
    tikla(/Bayi\/Servis Ekle/);
    denetle(["İptal"], "Kaydet");
  });
  it("servis formu (müşteri detayı ve pano): İptal · Kaydet", () => {
    musteriDetay(); tikla(/Yeni Servis Talebi/); denetle(["İptal"], "Kaydet"); cleanup();
    render(<ServisPanosu services={[]} setServices={vi.fn()} customers={M} dealers={D} parts={P} calisanlar={[]} showToast={vi.fn()}
      serverPermissions={null} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
    tikla(/Yeni Servis Talebi/); denetle(["İptal"], "Kaydet");
  });
  it("Extra Kalıp ve yedek parça formları: Vazgeç · Kaydet", () => {
    musteriDetay(); tikla(/Extra Kalıp Satışı/); denetle(["Vazgeç"], "Kaydet"); cleanup();
    musteriDetay(); tikla(/^Yedek Parça Satışı$/); denetle(["Vazgeç"], "Kaydet");
  });
  it("stok formları: makina stoğu alt yuvada; 'Stoğa Parça Ekle' gövde içi satırını korur (F5)", () => {
    render(<Stock factory={{ name: "A" }} stock={[]} setStock={vi.fn()} customers={[]} setCustomers={vi.fn()} parts={P} />);
    tikla(/Stoğa Makina Ekle/); denetle(["İptal"], "Kaydet"); cleanup();
    render(<Stock factory={{ name: "A" }} stock={[]} setStock={vi.fn()} customers={[]} setCustomers={vi.fn()} parts={P} defaultSubTab="parca" />);
    tikla(/Stoğa Parça Ekle/);
    expect(altYuva()).toBeNull();
    const b = dugmeler(kutu()).filter(x => ["İptal", "Kaydet"].includes(metin(x)));
    expect(b.map(metin)).toEqual(["İptal", "Kaydet"]);
  });
  it("katalog yöneticileri: İptal · Kaydet", () => {
    render(<KalipManager kalipDefs={[]} setKalipDefs={vi.fn()} />); tikla(/Yeni Kalıp Ekle/); denetle(["İptal"], "Kaydet"); cleanup();
    render(<ModelsManager standardModels={[]} setStandardModels={vi.fn()} customModels={[]} setCustomModels={vi.fn()} />); tikla(/Yeni Model Ekle/); denetle(["İptal"], "Kaydet"); cleanup();
    render(<PartManager parts={[]} setParts={vi.fn()} />); tikla(/Parça\/Yedek Parça Ekle/); denetle(["İptal"], "Kaydet");
  });
});
