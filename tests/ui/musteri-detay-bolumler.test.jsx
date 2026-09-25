// @vitest-environment jsdom
// Spec 0016 AC-9 (plan Ek B, H8): müşteri detay penceresinin bölümleri. Dönüşümden ÖNCE bugünkü koda yazıldı ve yeşildi;
// dönüşümden sonra da aynı kalmalı: başlıklar ve sayılar, olay sırası, katlanma (tıklama, odak, dosya süzgeci), boş durum
// metinleri, düğmeler ve mesaj metinleri. H2 gereği büyük harfle yazılmış iki başlık olağan yazıma döner; iki yazım da kabul
// edilir (Türkçe İ/ı yüzünden /i bayrağı kullanılamaz).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const var_ = (re) => screen.queryAllByText(re).length > 0;
const once = (a, b) => !!(screen.getAllByText(a)[0].compareDocumentPosition(screen.getAllByText(b)[0]) & Node.DOCUMENT_POSITION_FOLLOWING);
const tikla = (re) => fireEvent.click(screen.getAllByRole("button").filter(b => re.test(b.textContent.trim())).pop());

const MAKINA = {
  id: 1, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", currency: "TRY", installDate: "2025-01-10", warrantyEnd: "2027-01-10",
  kaliplar: [{ ad: "Hamburger", olcu: "55x125" }],
  prevOwners: [{ name: "Eski Sahip Ltd", city: "Konya", country: "Türkiye", saleDate: "2024-06-01" }],
};
const IKINCI = { id: 2, name: "Kutu Gıda", model: "AK120_DSC", serialNo: "S-2", currency: "TRY", installDate: "2025-03-01" };
const OLAYSIZ = { id: 3, name: "Boş Firma", model: "AK100", serialNo: "S-3", currency: "TRY" };
const SERVIS = [
  { id: 71, customerId: 1, date: "2026-05-10", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş" },
  { id: 72, customerId: 1, date: "2025-08-02", type: "Garanti Dışı", repairPlace: "Fabrikada Onarım", islemFirma: "Altuntaş", servisUcreti: "100", currency: "USD", odendi: false, faturaTipi: "Faturasız Yurtiçi" },
];
const KALIP = [{ id: 81, tur: "Kalıp", customerId: 1, ad: "Köfte Kalıbı", tarih: "2026-03-04", ucret: 500, currency: "TRY", odendi: true, faturaTipi: "Faturasız Yurtiçi" }];
const GORUSME = [{ id: 91, customerId: 1, tarih: "2026-09-01", tur: "Gelen Arama", not: "fiyat sordu", takipTarihi: "", tamamlandi: false }];
const DOSYA = [{ id: 95, customerId: 1, refType: "makina", refId: 1, ad: "fatura.pdf", tur: "PDF", boyut: 1000, tarih: "2026-09-02" }];

const ciz = (o = {}) => render(<Customers customers={[MAKINA, IKINCI, OLAYSIZ]} setCustomers={vi.fn()} services={SERVIS} setServices={vi.fn()}
  partSales={KALIP} setPartSales={vi.fn()} payments={[]} dealers={[]} parts={[]} factory={{ name: "Altuntaş" }}
  gorusmeler={GORUSME} setGorusmeler={vi.fn()} dosyalar={DOSYA} setDosyalar={vi.fn()} yedekParcaSatislar={[]} setYedekParcaSatislar={vi.fn()}
  initialDetailId={1} {...o} />);

describe("Müşteri detayı bölümleri", () => {
  it("AC-9: bölüm başlıkları ve sayıları aynı", () => {
    ciz();
    expect(var_(/^(BU FİRMANIN MAKİNALARI|Bu Firmanın Makinaları) \(2\)$/)).toBe(true);
    expect(var_(/^Görüşmeler \(1\)$/)).toBe(true);
    expect(var_(/^Dosyalar \(1\)$/)).toBe(true);
    expect(var_(/^(KALIPLAR|Kalıplar) \(1\)$/)).toBe(true);
    expect(var_(/^İşlemler$/)).toBe(true);
    expect(var_(/^Sahiplik Geçmişi$/)).toBe(true);
    expect(var_(/Makina Geçmişi/)).toBe(true);
    expect(var_(/\d+ olay$/)).toBe(true);
  });
  it("AC-9: makina geçmişi olayları eskiden yeniye aynı sırada; sahiplik satırı aynı", () => {
    ciz();
    expect(once(/^Satış$/, "Garanti Dışı")).toBe(true);
    expect(once("Garanti Dışı", /^Kalıp Verildi/)).toBe(true);
    expect(once(/^Kalıp Verildi/, "Periyodik Bakım")).toBe(true);
    expect(once("Periyodik Bakım", /^Garanti Bitişi$/)).toBe(true);
    expect(var_(/1\. Sahip: Eski Sahip Ltd/)).toBe(true);
  });
  it("AC-9: Görüşmeler ve Dosyalar kapalı başlar, başlığa tıklayınca açılıp kapanır", () => {
    ciz();
    expect(var_(/fiyat sordu/)).toBe(false);
    expect(var_(/^fatura\.pdf$/)).toBe(false);
    fireEvent.click(screen.getByText(/^Görüşmeler \(1\)$/));
    expect(var_(/fiyat sordu/)).toBe(true);
    fireEvent.click(screen.getByText(/^Görüşmeler \(1\)$/));
    expect(var_(/fiyat sordu/)).toBe(false);
    fireEvent.click(screen.getByText(/^Dosyalar \(1\)$/));
    expect(var_(/^fatura\.pdf$/)).toBe(true);
  });
  it("AC-9: görüşme odağı Görüşmeler'i dışarıdan açar", () => {
    ciz({ focusGorusmeId: 91 });
    expect(var_(/fiyat sordu/)).toBe(true);
  });
  it("AC-9: başlık yanındaki düğmeler aynı: Yeni Görüşme, Dosya Ekle, Yazdır, E-posta Gönder; İşlemler sırası aynı", () => {
    ciz();
    for (const ad of [/Yeni Görüşme/, /Dosya Ekle/, /^Yazdır$/, /^E-posta Gönder$/]) expect(screen.getAllByRole("button").some(b => ad.test(b.textContent.trim())), String(ad)).toBe(true);
    expect(once("Ödeme Ekle", "Yeni Servis Talebi")).toBe(true);
    expect(once("Yeni Servis Talebi", "Extra Kalıp Satışı")).toBe(true);
    expect(once("Yeni Sahip", "Düzenle")).toBe(true);
    // Yeni Görüşme görüşmeleri açar ve formu gösterir.
    tikla(/Yeni Görüşme/);
    expect(var_(/fiyat sordu/)).toBe(true);
  });
  it("AC-9: kayıt yokken boş metinler: görüşme, makina geçmişi, dosya (süzgeçsiz ve süzgeçli)", () => {
    ciz({ initialDetailId: 3 });
    expect(var_(/Bu makinaya ait kayıt bulunmuyor\./)).toBe(true);
    fireEvent.click(screen.getByText(/^Görüşmeler \(0\)$/));
    expect(var_(/Henüz görüşme kaydı yok\./)).toBe(true);
    fireEvent.click(screen.getByText(/^Dosyalar \(0\)$/));
    expect(var_(/Henüz dosya yok\./)).toBe(true);
    expect(var_(/PDF, resim veya Office belgesi ekleyebilirsiniz \(dosya başına en fazla 20 MB\)\./)).toBe(true);
    expect(var_(/Bu kayda ait dosya yok\./)).toBe(false);
  });
  it("AC-5: farklı para birimi borcu mesajı aynı metinle", () => {
    ciz();
    expect(var_(/Ayrıca farklı para biriminden ödenmemiş servis\/parça\/Extra Kalıp borcu var \(yukarıdaki toplama dahil edilmedi\):/)).toBe(true);
  });
  it("AC-5: Yeni Sahip penceresinin bilgi ve borç mesajları aynı metinle", () => {
    ciz();
    tikla(/^Yeni Sahip$/);
    expect(var_(/sahiplik geçmişine/)).toBe(true);
    expect(var_(/orijinal satış bedeli/)).toBe(true);
    expect(var_(/Ayrıca farklı para biriminden:/)).toBe(true);
    expect(var_(/Devam edersen bu borç yeni sahibin kaydına geçecek\./)).toBe(true);
  });
  it("AC-5: sunucu bağlantısı yokken dosyalar bölümünde aynı uyarı", () => {
    ciz({ dosyaCevrimdisi: true });
    fireEvent.click(screen.getByText(/^Dosyalar \(1\)$/));
    expect(var_(/Sunucu bağlantısı yok: dosya listesi görünür ama/)).toBe(true);
    expect(var_(/^ekleme, açma ve indirme$/)).toBe(true);
  });
});

// ── Dönüşümden sonra eklenen denetimler (Ek B: boş kutular, H2 yazımı, katlanmanın kart başlığından çalışması) ──
describe("Dönüşüm sonrası: müşteri detayı", () => {
  it("AC-9 / AC-4: boş bölümler düğmesiz boş durum kutusu gösterir", () => {
    ciz({ initialDetailId: 3 });
    fireEvent.click(screen.getByText(/^Görüşmeler \(0\)$/));
    fireEvent.click(screen.getByText(/^Dosyalar \(0\)$/));
    for (const id of ["bos-makina-gecmisi", "bos-gorusmeler", "bos-dosyalar"]) {
      const k = screen.getByTestId(id);
      expect(k.style.border, id).toBe("1.5px dashed var(--n300, #cbd5e1)");
      expect(k.querySelectorAll("button").length, id).toBe(0);
    }
  });
  it("H2: büyük harfle yazılmış iki başlık olağan yazımla", () => {
    ciz();
    expect(var_(/^Bu Firmanın Makinaları \(2\)$/)).toBe(true);
    expect(var_(/^Kalıplar \(1\)$/)).toBe(true);
  });
  it("AC-5: detay mesajları uyarı şeridinde, doğru ailede", () => {
    ciz({ dosyaCevrimdisi: true });
    expect(screen.getByTestId("farkli-pb-borc").style.background).toBe("var(--redBg, #fef2f2)");
    fireEvent.click(screen.getByText(/^Dosyalar \(1\)$/));
    expect(screen.getByTestId("dosya-cevrimdisi").style.background).toBe("var(--ambBg, #fffbeb)");
    tikla(/^Yeni Sahip$/);
    expect(screen.getByTestId("yeni-sahip-bilgi").style.background).toBe("var(--bluBg, #eff6ff)");
    expect(screen.getByTestId("yeni-sahip-borc").style.background).toBe("var(--redBg, #fef2f2)");
  });
});
