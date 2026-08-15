// @vitest-environment jsdom
// Regresyon: "kısıtlı kullanıcı arama kutusundan yetkisiz alana erişiyor" —
// izinli olmayan sekmenin verisi arama sonuçlarında hiç listelenmemeli.
// + tüm kategori grupları (servis/yedek parça/not/üretim/dosya/çalışan) + limitsizlik + klavye.
// Not: yeni tasarımda başlık ikon rozeti + <mark> vurgusuyla bölündüğü için satırları
// full textContent üzerinden buluyoruz (getByText düğüm sınırında kırılırdı).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { GlobalSearch } from "../../src/components/GlobalSearch";

const veri = {
  customers: [
    { id: 1, name: "Genisel Catering", phone: "0500", model: "AK100", serialNo: "GEN-1" },
    { id: 5, name: "Yeni Sahip Gıda", phone: "0501", model: "AK140", prevOwners: [{ name: "Devreden Eski Firma" }] },
  ],
  teklifler: [{ id: 2, type: "teklif", no: "T-99", firma: "Genisel Catering" }],
  dealers: [{ id: 3, name: "Genisel Bayi", city: "İstanbul" }],
  stock: [{ id: 4, model: "AK100_DS", serialNo: "GEN-1" }],
};

// Full textContent'e göre sonuç satırını bul (rozet + <mark> vurgusu metni böler → getByText yetmez).
// Yalnız sonuç satırlarına bak (data-sel taşırlar) — çip/tetik butonlarını dışla.
const norm = (s) => s.replace(/\s+/g, " ").trim();
const sonucButonlari = () => screen.getAllByRole("button").filter(b => b.hasAttribute("data-sel"));
const rows = (re) => sonucButonlari().filter(b => re.test(norm(b.textContent)));
const row = (str) => sonucButonlari().find(b => norm(b.textContent).includes(str));

const ac = (props, sorgu = "genisel") => {
  render(<GlobalSearch {...veri} {...props} />);
  fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
  fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: sorgu } });
};

describe("GlobalSearch sekme yetkisi", () => {
  it("evrak sekmesi izinli değilse teklif sonuçları listelenmez", () => {
    ac({ allowedTabs: ["dashboard", "customers"] });
    expect(row("Genisel Catering")).toBeTruthy(); // müşteri sonucu var
    expect(row("T-99")).toBeFalsy();               // teklif sonucu yok
    expect(row("Genisel Bayi")).toBeFalsy();       // bayi sonucu yok
  });

  it("eski sahibin adıyla aranınca yeni sahip bulunur", () => {
    ac({ allowedTabs: null }, "devreden");
    const r = row("Yeni Sahip Gıda");
    expect(r).toBeTruthy();
    expect(norm(r.textContent)).toMatch(/eski sahibi: Devreden Eski Firma/);
  });

  it("ad dışı alandan (yetkili/telefon) yakalanınca eşleşme nedeni gösterilir", () => {
    const customers = [{ id: 9, name: "Hatay Makina San.", phone: "0532", yetkili1Ad: "Genisel Bey" }];
    render(<GlobalSearch customers={customers} onOpenCustomer={vi.fn()} allowedTabs={["customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    const r = row("Hatay Makina San.");
    expect(r).toBeTruthy();
    expect(norm(r.textContent)).toMatch(/yetkili: Genisel Bey/); // neden çıktığı görünür
  });

  it("ad zaten eşleşiyorsa neden etiketi gösterilmez", () => {
    const customers = [{ id: 10, name: "Genisel Gıda", yetkili1Ad: "Genisel Bey" }];
    render(<GlobalSearch customers={customers} onOpenCustomer={vi.fn()} allowedTabs={["customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    const r = row("Genisel Gıda");
    expect(r).toBeTruthy();
    expect(norm(r.textContent)).not.toMatch(/yetkili:/);
  });

  it("kısıt yoksa (yerel mod) tüm kategoriler listelenir", () => {
    ac({ allowedTabs: null });
    expect(row("T-99")).toBeTruthy();
    expect(row("Genisel Bayi")).toBeTruthy();
  });

  it("yedek parça (kargo) satışı aramada çıkar ve tıklayınca onGoYedekParca çağrılır", () => {
    const onGoYedekParca = vi.fn();
    const parts = [{ id: 7, ad: "Genisel Dişli" }];
    const yedekParcaSatislar = [{ id: 900, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 2, tarih: "2026-07-01", kargoDurum: "Hazırlanıyor" }];
    render(<GlobalSearch {...veri} parts={parts} yedekParcaSatislar={yedekParcaSatislar} onGoYedekParca={onGoYedekParca} allowedTabs={["dashboard", "stock"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    fireEvent.click(row("Genisel Dişli"));
    expect(onGoYedekParca).toHaveBeenCalledWith(900);
  });

  it("Extra Kalıp satışı aramada çıkar ve tıklayınca müşteri detayına gider", () => {
    const onOpenCustomer = vi.fn();
    const partSales = [{ id: 800, tur: "Kalıp", customerId: 1, ad: "Genisel Kalıbı", olcu: "55x125", tarih: "2026-07-01" }];
    render(<GlobalSearch {...veri} partSales={partSales} onOpenCustomer={onOpenCustomer} allowedTabs={["dashboard", "customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel kalıbı" } });
    fireEvent.click(row("Genisel Kalıbı"));
    expect(onOpenCustomer).toHaveBeenCalledWith(1, null, 800); // müşteri id + odaklanılacak kalıp id
  });

  it("müşteri araması LİMİTSİZ — 8'den fazla eşleşme hepsi listelenir", () => {
    const customers = Array.from({ length: 12 }, (_, i) => ({ id: 100 + i, name: `Genisel Firma ${i}`, phone: "0500" }));
    render(<GlobalSearch customers={customers} allowedTabs={["customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    expect(rows(/Genisel Firma \d+/).length).toBe(12); // eski 8 limiti kalktı
  });

  it("bayi araması da LİMİTSİZ — eski 6 limiti kalktı", () => {
    const dealers = Array.from({ length: 10 }, (_, i) => ({ id: 200 + i, name: `Genisel Bayi ${i}`, city: "İzmir" }));
    render(<GlobalSearch dealers={dealers} onOpenDealer={vi.fn()} allowedTabs={["dealers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel bayi" } });
    expect(rows(/Genisel Bayi \d+/).length).toBe(10);
  });

  it("servis kaydı (teknisyen/tip/not) aramada çıkar ve tıklayınca müşteri detayına gider", () => {
    const onOpenCustomer = vi.fn();
    const services = [{ id: 700, customerId: 1, type: "Garanti Dışı", tech: "Ahmet Usta", yapilanIsler: "rulman değişimi", date: "2026-07-01", durum: "Tamamlandı" }];
    render(<GlobalSearch {...veri} services={services} onOpenCustomer={onOpenCustomer} allowedTabs={["dashboard", "customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "ahmet usta" } });
    fireEvent.click(row("Garanti Dışı"));
    expect(onOpenCustomer).toHaveBeenCalledWith(1, 700); // müşteri id + odaklanılacak servis id
  });

  it("yedek parça satışında farklı teslimat adresi (şehir) ile bulunur", () => {
    const parts = [{ id: 7, ad: "Dişli" }];
    const yedekParcaSatislar = [{ id: 901, aliciTipi: "bayi", dealerId: 3, partId: "7", miktar: 1, teslimatFarkli: true, teslimatAd: "Depo A", teslimatSehir: "Antalya" }];
    render(<GlobalSearch {...veri} parts={parts} yedekParcaSatislar={yedekParcaSatislar} onGoYedekParca={vi.fn()} allowedTabs={["stock"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "antalya" } });
    expect(row("Dişli")).toBeTruthy();
  });

  it("not içeriği aramada çıkar ve tıklayınca onGoNotes çağrılır", () => {
    const onGoNotes = vi.fn();
    const notes = [{ id: 600, content: "Genisel için özel indirim notu", updatedAt: 1750000000000 }];
    render(<GlobalSearch notes={notes} onGoNotes={onGoNotes} allowedTabs={["notes"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "indirim" } });
    fireEvent.click(row("özel indirim notu"));
    expect(onGoNotes).toHaveBeenCalledWith(600);
  });

  it("üretim formu (kalıp adı) aramada çıkar ve tıklayınca onGoUretim çağrılır", () => {
    const onGoUretim = vi.fn();
    const uretimFormlari = [{ id: 500, baslangicTarihi: "2026-07-01", satirlar: [{ kalipAdi: "Genisel Kalıp X", kalipKodu: "GK-1" }] }];
    render(<GlobalSearch uretimFormlari={uretimFormlari} onGoUretim={onGoUretim} allowedTabs={["stock"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel kalıp x" } });
    fireEvent.click(row("Üretim"));
    expect(onGoUretim).toHaveBeenCalledWith(500);
  });

  it("dosya (etiket) aramada çıkar ve tıklayınca müşteri detayına gider", () => {
    const onOpenCustomer = vi.fn();
    const dosyalar = [{ id: 400, customerId: 1, ad: "Genisel Sözleşme", dosyaAdi: "sozlesme.pdf", tarih: "2026-07-01" }];
    render(<GlobalSearch {...veri} dosyalar={dosyalar} onOpenCustomer={onOpenCustomer} allowedTabs={["customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "sözleşme" } });
    fireEvent.click(row("Genisel Sözleşme"));
    expect(onOpenCustomer).toHaveBeenCalledWith(1);
  });

  it("firma çalışanı aramada çıkar ve tıklayınca onGoCalisanlar çağrılır", () => {
    const onGoCalisanlar = vi.fn();
    const calisanlar = [{ id: 300, ad: "Genisel Teknisyen" }];
    render(<GlobalSearch calisanlar={calisanlar} onGoCalisanlar={onGoCalisanlar} allowedTabs={["settings"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel teknisyen" } });
    fireEvent.click(row("Genisel Teknisyen"));
    expect(onGoCalisanlar).toHaveBeenCalledWith(300);
  });

  it("çalışan sekmesi (settings) izinli değilse çalışan listelenmez", () => {
    const calisanlar = [{ id: 301, ad: "Genisel Gizli" }];
    render(<GlobalSearch calisanlar={calisanlar} onGoCalisanlar={vi.fn()} allowedTabs={["dashboard", "customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    expect(row("Genisel Gizli")).toBeFalsy();
  });

  it("kategori çipi listeyi o gruba daraltır (canlı sayı ile)", () => {
    const onOpenCustomer = vi.fn();
    const services = [{ id: 700, customerId: 1, type: "Garanti Dışı", tech: "Genisel Usta", date: "2026-07-01" }];
    render(<GlobalSearch {...veri} services={services} onOpenCustomer={onOpenCustomer} allowedTabs={["dashboard", "customers", "evrak", "dealers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    // Tümü modunda müşteri + teklif + bayi + servis görünür (4 sonuç satırı)
    expect(sonucButonlari().length).toBe(4);
    expect(row("AK100")).toBeTruthy();       // müşteri satırı (model yalnız burada)
    expect(row("Garanti Dışı")).toBeTruthy(); // servis satırı
    // "Servis" çipine tıkla (data-sel taşımaz → sonuç değil) → yalnız servis kalır
    const cip = screen.getAllByRole("button").find(b => !b.hasAttribute("data-sel") && /^Servis\b/.test(norm(b.textContent)));
    expect(cip).toBeTruthy();
    fireEvent.click(cip);
    expect(sonucButonlari().length).toBe(1);
    expect(row("AK100")).toBeFalsy();         // müşteri satırı gitti
    expect(row("Garanti Dışı")).toBeTruthy();
  });

  it("bir sonuca tıklayıp geri dönünce arama korunur (sıfırlanmaz)", () => {
    const onOpenCustomer = vi.fn();
    render(<GlobalSearch {...veri} onOpenCustomer={onOpenCustomer} allowedTabs={["customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    fireEvent.click(row("Genisel Catering")); // sonuca tıkla → palet kapanır + onOpenCustomer
    expect(onOpenCustomer).toHaveBeenCalledWith(1);
    // paleti tekrar aç → metin ve sonuçlar korunmuş, sıfırdan yazmak gerekmiyor
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    expect(screen.getByPlaceholderText(/Müşteri, seri no/).value).toBe("genisel");
    expect(row("Genisel Catering")).toBeTruthy();
  });

  it("klavye: ok tuşu + Enter seçili sonucu açar", () => {
    const onOpenCustomer = vi.fn();
    const customers = [
      { id: 1, name: "Genisel Bir", phone: "0500" },
      { id: 2, name: "Genisel İki", phone: "0500" },
    ];
    render(<GlobalSearch customers={customers} onOpenCustomer={onOpenCustomer} allowedTabs={["customers"]} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: "genisel" } });
    fireEvent.keyDown(window, { key: "ArrowDown" }); // 0 → 1 (ikinci sonuç)
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onOpenCustomer).toHaveBeenCalledWith(2);
  });
});
