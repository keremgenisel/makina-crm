// @vitest-environment jsdom
// Spec 0014 (plan Z7): Stok ve Evrak alt sekmeleri, Stok'un yedek parça süzgeci ve derin bağlantı. Dönüşümden ÖNCE bugünkü
// koda yazıldı ve yeşildi; dönüşümden sonra da aynı kalmalı. Sekmeler rolden bağımsız, erişilebilir adıyla sorgulanır
// (bugün button, dönüşümde tab).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Stock } from "../../src/components/Stock";
import { Documents } from "../../src/components/Documents";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const dugme = (ad) => screen.queryByRole("button", { name: ad }) || screen.getByRole("tab", { name: ad });
const aktifSayfa = () => document.querySelector(".page-num--active")?.textContent ?? null;
const STOK_SEKME = ["Makina Stoğu", "Parça/Yedek Parça Stoğu", "Yedek Parça Satışı", "Kalıp Üretim"];
const ISARET = {
  "Makina Stoğu": () => screen.queryByPlaceholderText("Model veya seri no ara..."),
  "Parça/Yedek Parça Stoğu": () => screen.queryByPlaceholderText("Parça adı veya model ara..."),
  "Yedek Parça Satışı": () => screen.queryByPlaceholderText("Alıcı, parça, kargo no ile ara..."),
  "Kalıp Üretim": () => screen.queryByText("Kalıp Üretim Formları"),
};
const acikSekme = () => Object.keys(ISARET).filter(k => ISARET[k]());

const YP = [
  { id: 1, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: 10, currency: "TRY", tarih: "2026-09-01", faturaTipi: "Faturasız Yurtiçi", odendi: false, tahsisler: [] },
  { id: 2, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 1, birimFiyat: 10, currency: "TRY", tarih: "2026-09-02", faturaTipi: "Faturasız Yurtiçi", odendi: true, tahsisler: [{ miktar: 1, makinaSerbest: "X", tarih: "2026-09-03" }] },
];
const stok = (o = {}) => render(<Stock factory={{ name: "Altuntaş" }} stock={[]} setStock={vi.fn()} customers={[]} setCustomers={vi.fn()} parts={[{ id: 7, ad: "Rulman" }]} dealers={[{ id: 3, name: "Ege Bayi" }]} yedekParcaSatislar={YP} {...o} />);

describe("Stok alt sekmeleri", () => {
  it("AC-9: Stok'un alt sekmeleri aynı sekmeleri aynı sırayla gösterir ve seçim davranışı değişmez", () => {
    stok();
    const sirali = STOK_SEKME.map(dugme);
    for (let i = 1; i < sirali.length; i++) expect(sirali[i - 1].compareDocumentPosition(sirali[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(acikSekme()).toEqual(["Makina Stoğu"]);
    for (const s of STOK_SEKME) { fireEvent.click(dugme(s)); expect(acikSekme(), s).toEqual([s]); }
  });
  it("AC-18: Anasayfa'dan Stok'un 'Yedek Parça Satışı' alt sekmesine gitmek gibi derin bağlantılar bugünkü gibi çalışır", () => {
    stok({ defaultSubTab: "yedeksatis" });
    expect(acikSekme()).toEqual(["Yedek Parça Satışı"]);
    cleanup();
    stok({ yedekOdakId: 1, onYedekOdakConsumed: vi.fn() });
    expect(acikSekme()).toEqual(["Yedek Parça Satışı"]);
    cleanup();
    stok({ defaultSubTab: "uretim" });
    expect(acikSekme()).toEqual(["Kalıp Üretim"]);
  });
  it("AC-2/AC-4 (Stok yedek parça süzgeci, Z5): adlar ve sayılar aynı, erişilebilir ad ve metin içeriği bugünkü metne eşit", () => {
    stok({ defaultSubTab: "yedeksatis" });
    expect(dugme("Tümü (2)").textContent).toBe("Tümü (2)");
    expect(dugme("Tahsisi eksik (1)").textContent).toBe("Tahsisi eksik (1)");
    expect(screen.getByRole("button", { name: /Tahsisi eksik/ })).toBeTruthy(); // mevcut testin sorgusu
  });
});

const alt = (id, type, fiyat) => ({ id, type, kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: String(fiyat), tlKarsiligi: "" });
const belge = (i, type = "teklif") => ({ id: 900 + i, type, no: `${type === "teklif" ? "T" : "P"}-${String(i).padStart(3, "0")}`, tarih: "2026-09-20",
  createdAt: `2026-09-01T${String(i).padStart(2, "0")}:00`, dil: "TR", currency: "TRY", durum: "taslak", firma: `Firma ${i}`,
  satirlar: [{ rowId: "r1", pickTip: "makina", selectedModel: "AK100", selectedKalip: "", selectedPart: "", subItems: [alt("m1", "makina", 1000)] }] });
const BELGELER = [...Array.from({ length: 17 }, (_, i) => belge(i + 1)), belge(30, "proforma")]; // Evrak sayfası 15'lik
function Evrak() {
  const [teklifler, setTeklifler] = useState(BELGELER);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={[]} parts={[]}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}

describe("Evrak alt sekmeleri", () => {
  it("AC-10: Evrak'ın teklif, proforma ve fatura sekmeleri aynı biçimde çalışır (sıra, içerik)", () => {
    render(<Evrak />);
    const s = ["Teklifler", "Proformalar", "Yurt Dışı Fatura"].map(dugme);
    for (let i = 1; i < s.length; i++) expect(s[i - 1].compareDocumentPosition(s[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("T-017")).toBeTruthy();
    expect(screen.queryByText("P-030")).toBeNull();
    fireEvent.click(dugme("Proformalar"));
    expect(screen.getByText("P-030")).toBeTruthy();
    expect(screen.queryByText("T-017")).toBeNull();
    fireEvent.click(dugme("Yurt Dışı Fatura"));
    expect(screen.getByPlaceholderText("Firma adı veya fatura no ara...")).toBeTruthy();
  });
  it("AC-12: Evrak'ta sekme değişince sayfa 1'e döner ve arama temizlenir (bugünkü davranış)", () => {
    render(<Evrak />);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(aktifSayfa()).toBe("2");
    fireEvent.change(screen.getByPlaceholderText("Firma adı veya belge no ara..."), { target: { value: "Firma" } });
    fireEvent.click(dugme("Proformalar"));
    fireEvent.click(dugme("Teklifler"));
    expect(screen.getByPlaceholderText("Firma adı veya belge no ara...").value).toBe("");
    expect(aktifSayfa()).toBe("1");
  });
});
