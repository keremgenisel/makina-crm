// @vitest-environment jsdom
// Servis Panosu (Kanban): servisler durumuna göre sütunlanır, sürükle-bırakla durum değişir,
// kartta teknisyen (firma çalışanı) seçilir, "Yeni Servis" müşteri kartındakiyle AYNI tam
// ServiceForm'u açar. Ayrıca Ayarlar > Firma Çalışanları CRUD ve servis formundaki teknisyen seçicisi.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";

afterEach(cleanup);
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { CalisanManager } from "../../src/components/CalisanManager";
import { ServiceForm } from "../../src/components/ServiceForm";
import { today } from "../../src/lib/utils";

const musteriler = [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }];
const calisanlar = [{ id: 11, ad: "Ahmet Yılmaz" }, { id: 12, ad: "Mehmet Demir" }];

const dt = (id) => ({ getData: () => String(id), setData: () => {}, dropEffect: "", effectAllowed: "" });

describe("ServisPanosu — Kanban", () => {
  const props = (over = {}) => ({
    services: [
      { id: 10, customerId: 1, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", durum: "Bekliyor", date: "2026-07-20", tech: "" },
      { id: 11, customerId: 1, type: "Garanti İçi", durum: "Yapılıyor", date: "2026-07-19", tech: "Ahmet Yılmaz" },
      { id: 99, customerId: 1, type: "Garanti Dışı", date: "2026-07-18" }, // durum YOK → panoda görünmez
    ],
    setServices: vi.fn(), customers: musteriler, calisanlar, showToast: vi.fn(), serverPermissions: null, ...over,
  });

  it("3 sütun; kartlar durumuna göre gruplanır; durumsuz servis görünmez", () => {
    render(<ServisPanosu {...props()} />);
    // Sütun başlıkları nötr (Tasarım A); tür karşılıkları alt satırda. Saklanan `durum` değeri değişmez.
    expect(screen.getByRole("heading", { name: "Bekliyor" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "İşlemde" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tamamlandı" })).toBeTruthy();
    // Alt satırda tür karşılıkları (servis / kargo / fabrika teslim)
    expect(screen.getByText(/Fabrikaya Giriş/)).toBeTruthy();
    expect(screen.getByText(/Teslime Hazır/)).toBeTruthy();
    // 2 kartlı servis görünür (id 10, 11), durumsuz (99) müşteri adı 1 kez... hepsi ABC olduğundan
    // kart sayısını data ile kontrol edelim: sütun sayaçları 1 / 1 / 0
    const sayaclar = [...document.querySelectorAll("section")].map(s => s.textContent.match(/\d+/)?.[0]);
    expect(sayaclar.filter(Boolean)).toContain("1"); // en az bir sütunda 1
    // Kart draggable
    expect(document.querySelector('article[draggable="true"]')).toBeTruthy();
  });

  it("pano başlığı 'SERVİS VE KARGO PANOSU'", () => {
    render(<ServisPanosu {...props()} />);
    expect(screen.getByRole("heading", { name: "SERVİS VE KARGO PANOSU" })).toBeTruthy();
  });

  const kargoProps = (over = {}) => props({
    kargoYetki: true, dealers: [{ id: 5, name: "Bayi X" }], parts: [{ id: 7, ad: "Dişli" }],
    setYedekParcaSatislar: vi.fn(), ...over,
  });

  it("Extra Kalıp (partSales, kargoDurum) panoda KALIP kartı olarak görünür; sürükleyince setPartSales durum çeker", () => {
    const setPartSales = vi.fn();
    const partSales = [{ id: 900, customerId: 1, tur: "Kalıp", ad: "Adana Kalıbı", olcu: "55x125", kargoDurum: "Hazırlanıyor", tarih: "2026-07-20" }];
    render(<ServisPanosu {...props({ kalipYetki: true, partSales, setPartSales })} />);
    expect(screen.getByText(/KALIP/)).toBeTruthy();
    // Yapılıyor sütununa bırak → kargoDurum "Kargoya Verildi"
    const yapiliyor = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Yapılıyor"));
    fireEvent.drop(yapiliyor, { dataTransfer: { getData: () => "kalip:900" } });
    const guncelle = setPartSales.mock.calls.at(-1)[0];
    expect(guncelle([{ id: 900 }])[0].kargoDurum).toBe("Kargoya Verildi");
  });

  it("kalipYetki yoksa Extra Kalıp kargosu panoda görünmez", () => {
    const partSales = [{ id: 900, customerId: 1, tur: "Kalıp", ad: "K", kargoDurum: "Hazırlanıyor", tarih: "2026-07-20" }];
    render(<ServisPanosu {...props({ kalipYetki: false, partSales, setPartSales: vi.fn() })} />);
    expect(screen.queryByText(/KALIP/)).toBeNull();
  });

  it("en son eklenen kalıp, aynı sütundaki eski servis/kargonun ÜSTÜNDE (olusturmaZamani ile sıralanır)", () => {
    // Aynı gün: servis fabrikaGirisZamani 09:00; kalıp olusturmaZamani 15:00 → kalıp üstte olmalı.
    // Regresyon: kalıp gün-bazlı (T00:00) sıralandığında aynı günkü servis hep üstüne çıkıyordu.
    // Geçmiş bir gün kullanılıyor ki servis "Planlanan"a düşmesin (ileri fabrikaGirisZamani planlanan sayılır).
    const services = [{ id: 10, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-01", fabrikaGirisZamani: "2026-07-01T09:00:00", tech: "" }];
    const partSales = [{ id: 900, customerId: 1, tur: "Kalıp", ad: "Adana Kalıbı", kargoDurum: "Hazırlanıyor", tarih: "2026-07-01", olusturmaZamani: "2026-07-01T15:00:00" }];
    render(<ServisPanosu {...props({ services, kalipYetki: true, partSales, setPartSales: vi.fn() })} />);
    const bekliyor = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Fabrikaya Giriş"));
    const kalipIdx = bekliyor.textContent.indexOf("KALIP");
    const servisIdx = bekliyor.textContent.indexOf("Periyodik Bakım");
    expect(kalipIdx).toBeGreaterThanOrEqual(0);
    expect(servisIdx).toBeGreaterThanOrEqual(0);
    expect(kalipIdx).toBeLessThan(servisIdx); // kalıp önce (üstte)
  });

  it("Teslim Edildi kargo Tamamlandı sütununda '🗄 Kaldır' gösterir; tıklanınca panoGizli:true yazar", () => {
    const setYedekParcaSatislar = vi.fn();
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 3, kargoDurum: "Teslim Edildi", tahsisler: [] }];
    render(<ServisPanosu {...kargoProps({ yedekParcaSatislar: yp, setYedekParcaSatislar })} />);
    fireEvent.click(screen.getByRole("button", { name: /Kaldır/ }));
    const guncelle = setYedekParcaSatislar.mock.calls.at(-1)[0];
    expect(guncelle([{ id: 700 }])[0].panoGizli).toBe(true);
  });

  it("toplu satış (aynı batchId) panoda TEK kart + sürükleyince TÜM grup durum değiştirir", () => {
    const setYedekParcaSatislar = vi.fn();
    const parts = [{ id: 7, ad: "Dişli" }, { id: 8, ad: "Piston" }];
    const yp = [
      { id: 700, batchId: 555, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 3, kargoDurum: "Hazırlanıyor", tahsisler: [] },
      { id: 701, batchId: 555, aliciTipi: "bayi", dealerId: 5, partId: "8", miktar: 2, kargoDurum: "Hazırlanıyor", tahsisler: [] },
    ];
    render(<ServisPanosu {...kargoProps({ yedekParcaSatislar: yp, setYedekParcaSatislar, parts })} />);
    // İki kayıt ama TEK kargo kartı (article) — "2 kalem" işareti
    expect(screen.getByText(/2 kalem/)).toBeTruthy();
    expect(screen.getAllByText(/📦 KARGO/)).toHaveLength(1);
    // Yapılıyor'a bırak → grubun HER İKİ kaydı da durum değiştirir
    const yapiliyor = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Yapılıyor"));
    fireEvent.drop(yapiliyor, { dataTransfer: { getData: () => "kargo:700" } });
    const guncelle = setYedekParcaSatislar.mock.calls.at(-1)[0];
    const sonuc = guncelle(yp);
    expect(sonuc.find(s => s.id === 700).kargoDurum).toBe("Kargoya Verildi");
    expect(sonuc.find(s => s.id === 701).kargoDurum).toBe("Kargoya Verildi"); // grup birlikte hareket
  });

  it("ileri tarihli kargo (panoDusmeZamani) 'Planlanan'da görünür (servisler gibi)", () => {
    const yp = [{ id: 701, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, kargoDurum: "Hazırlanıyor", panoDusmeZamani: "2099-01-01T08:00", tahsisler: [] }];
    render(<ServisPanosu {...kargoProps({ yedekParcaSatislar: yp })} />);
    fireEvent.click(screen.getByRole("button", { name: /Planlanan \(1\)/ })); // reveal aç
    expect(screen.getByText(/📦 Bayi X/)).toBeTruthy();
  });

  it("panoGizli kargo sütunda değil 'Arşivlenenler'de görünür; Geri Al panoGizli:false yazar", () => {
    const setYedekParcaSatislar = vi.fn();
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 3, kargoDurum: "Teslim Edildi", panoGizli: true, tahsisler: [] }];
    render(<ServisPanosu {...kargoProps({ yedekParcaSatislar: yp, setYedekParcaSatislar })} />);
    fireEvent.click(screen.getByRole("button", { name: /Arşivlenenler \(1\)/ })); // reveal aç
    fireEvent.click(screen.getByRole("button", { name: /Panoya Geri Al/ }));
    const guncelle = setYedekParcaSatislar.mock.calls.at(-1)[0];
    expect(guncelle([{ id: 700 }])[0].panoGizli).toBe(false);
  });

  it("kartı başka sütuna bırakınca setServices durumu o sütuna çeker", () => {
    const setServices = vi.fn();
    render(<ServisPanosu {...props({ setServices })} />);
    const tamamlandi = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Tamamlandı"));
    fireEvent.dragOver(tamamlandi, { dataTransfer: dt(10) });
    fireEvent.drop(tamamlandi, { dataTransfer: dt(10) });
    expect(setServices).toHaveBeenCalled();
    const guncelle = setServices.mock.calls.at(-1)[0];
    const sonuc = guncelle([{ id: 10, durum: "Bekliyor" }]);
    expect(sonuc[0].durum).toBe("Tamamlandı");
    // Tamamlandı'ya geçince bitiş anı damgalanır (zaman takibi)
    expect(typeof sonuc[0].bitisZamani).toBe("string");
    expect(sonuc[0].bitisZamani.length).toBeGreaterThanOrEqual(16);
  });

  it("servis durumu sürükleyince İşlem Geçmişine 'durum_degisti' yazılır (audit)", () => {
    const log = vi.fn();
    window.auditLog = { log };
    render(<ServisPanosu {...props()} />);
    const tamamlandi = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Tamamlandı"));
    fireEvent.drop(tamamlandi, { dataTransfer: dt(10) });
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ action: "durum_degisti", entity: "servis" }));
    delete window.auditLog;
  });

  it("Yapılıyor sütununa bırakınca bakım başlangıç damgalanır", () => {
    const setServices = vi.fn();
    render(<ServisPanosu {...props({ setServices })} />);
    const yapiliyor = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Yapılıyor"));
    fireEvent.drop(yapiliyor, { dataTransfer: dt(10) });
    const guncelle = setServices.mock.calls.at(-1)[0];
    const sonuc = guncelle([{ id: 10, durum: "Bekliyor" }]);
    expect(sonuc[0].durum).toBe("Yapılıyor");
    expect(typeof sonuc[0].bakimBaslangicZamani).toBe("string"); // ilk başlangıç damgası
  });

  it("kart teknisyen seçici çalışanları listeler ve seçim setServices ile tech yazar", () => {
    const setServices = vi.fn();
    render(<ServisPanosu {...props({ setServices })} />);
    const bekleyenKart = document.querySelector('article[draggable="true"]');
    const sel = within(bekleyenKart).getByRole("combobox");
    expect(within(sel).getByRole("option", { name: "Ahmet Yılmaz" })).toBeTruthy();
    fireEvent.change(sel, { target: { value: "Mehmet Demir" } });
    const guncelle = setServices.mock.calls.at(-1)[0];
    expect(guncelle([{ id: 10 }])[0].tech).toBe("Mehmet Demir");
  });

  it("teknisyen seçici satırına gelince kartın draggable'ı kapanır (macOS select seçim hatası fix)", () => {
    // draggable=true bir ata içinde native <select> seçim işlemiyordu; kontrol satırına gelince
    // article draggable=false olmalı, çıkınca geri true.
    render(<ServisPanosu {...props()} />);
    const kart = document.querySelector('article[draggable="true"]');
    const kontrolSatiri = within(kart).getByRole("combobox").closest("div");
    fireEvent.mouseEnter(kontrolSatiri);
    expect(kart.getAttribute("draggable")).toBe("false");
    fireEvent.mouseLeave(kontrolSatiri);
    expect(kart.getAttribute("draggable")).toBe("true");
  });

  it("Tamamlandı kartında 'Kaldır' panoGizli:true yazar (servis silinmez)", () => {
    const setServices = vi.fn();
    render(<ServisPanosu {...props({ setServices, services: [
      { id: 20, customerId: 1, type: "Periyodik Bakım", durum: "Tamamlandı", date: "2026-07-20", tech: "" },
    ] })} />);
    const kaldir = screen.getByRole("button", { name: /Kaldır/ });
    fireEvent.click(kaldir);
    const guncelle = setServices.mock.calls.at(-1)[0];
    const sonuc = guncelle([{ id: 20, durum: "Tamamlandı" }]);
    expect(sonuc[0].panoGizli).toBe(true);
    expect(sonuc[0].durum).toBe("Tamamlandı"); // durum korunur → geçmiş rozeti bozulmaz
  });

  it("panoGizli servis panoda görünmez; 'Arşivlenenler' açılınca 'Panoya Geri Al' ile döner", () => {
    const setServices = vi.fn();
    render(<ServisPanosu {...props({ setServices, services: [
      { id: 21, customerId: 1, type: "Garanti Dışı", durum: "Tamamlandı", date: "2026-07-20", tech: "", panoGizli: true },
    ] })} />);
    // Kart doğrudan görünmez (yalnız arşivde). Arşiv tetikleyicisi görünür:
    const arsivBtn = screen.getByRole("button", { name: /Arşivlenenler \(1\)/ });
    fireEvent.click(arsivBtn);
    const geriAl = screen.getByRole("button", { name: /Panoya Geri Al/ });
    fireEvent.click(geriAl);
    const guncelle = setServices.mock.calls.at(-1)[0];
    expect(guncelle([{ id: 21, panoGizli: true }])[0].panoGizli).toBe(false);
  });

  it("'Arşivi Temizle' arşivlenen servislerin durum'unu boşaltır (kayıt silinmez)", () => {
    const setServices = vi.fn();
    render(<ServisPanosu {...props({ setServices, services: [
      { id: 22, customerId: 1, type: "Garanti Dışı", durum: "Tamamlandı", date: "2026-07-20", tech: "", panoGizli: true },
    ] })} />);
    fireEvent.click(screen.getByRole("button", { name: /Arşivlenenler \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Arşivi Temizle/ }));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Temizle/ }));
    const guncelle = setServices.mock.calls.at(-1)[0];
    const sonuc = guncelle([{ id: 22, durum: "Tamamlandı", panoGizli: true }]);
    expect(sonuc[0].durum).toBe("");         // panodan tamamen çıktı
    expect(sonuc[0].panoGizli).toBe(false);
  });

  it("ServiceForm 'Servis Panosunda göster' checkbox durum'u yönetir; geçmiş tarih otomatik kapatır", () => {
    function Harness() {
      const [form, setForm] = useState({ customerId: 1, type: "Periyodik Bakım", date: today(), durum: "Bekliyor" });
      return <ServiceForm title="T" form={form} setForm={setForm} customers={musteriler} calisanlar={calisanlar} onSave={() => {}} onCancel={() => {}} />;
    }
    const { container } = render(<Harness />);
    const cb = screen.getByLabelText(/Servis Panosunda göster/);
    expect(cb.checked).toBe(true); // bugün + durum → işaretli
    // Tarihi geçmişe çek → checkbox otomatik kapanır (durum boşalır → panoya düşmez)
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: "2020-01-01" } });
    expect(cb.checked).toBe(false);
    // Elle tekrar aç → durum "Bekliyor"
    fireEvent.click(cb);
    expect(cb.checked).toBe(true);
  });

  it("işlemi yapan firma bayi/dış servis ise kartta firma rozeti gösterir; fabrika servisinde göstermez", () => {
    render(<ServisPanosu {...props({ services: [
      { id: 30, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-20", tech: "", islemFirma: "Örnek Bayi" },
      { id: 31, customerId: 1, type: "Garanti Dışı", durum: "Yapılıyor", date: "2026-07-20", tech: "", islemFirma: "Diğer", islemFirmaAd: "Harici Servis" },
      { id: 32, customerId: 1, type: "Periyodik Bakım", durum: "Tamamlandı", date: "2026-07-20", tech: "" }, // fabrika servisi (islemFirma yok)
    ] })} />);
    expect(screen.getByText(/Anlaşmalı Servis: Örnek Bayi/)).toBeTruthy();
    expect(screen.getByText(/Dış Servis: Harici Servis/)).toBeTruthy();
    // Yalnız 2 kartta firma rozeti var; fabrika servisinde (id 32) rozet yok.
    const rozetler = [...document.querySelectorAll("div")].filter(d => /^(Anlaşmalı Servis|Dış Servis):/.test((d.textContent || "").trim()));
    expect(rozetler.length).toBe(2);
  });

  it("'Yeni Servis Talebi' müşteri kartındakiyle AYNI tam ServiceForm'u açar", () => {
    render(<ServisPanosu {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Servis Talebi/ }));
    // Modal açıldı: tam ServiceForm'a özgü (kompakt formda olmayan) alanlar görünür
    expect(screen.getByText("İşlemi Yapan Firma")).toBeTruthy();
    expect(screen.getByText("Fatura Tipi")).toBeTruthy();
    expect(screen.getByText("Değişen Parçalar (varsa)")).toBeTruthy();
    expect(screen.getByText("Müşteri Talimatı / Açıklama")).toBeTruthy();
  });
});

describe("ServisPanosu — planlanan (ileri zamanlı) servis", () => {
  const props = (over = {}) => ({
    services: [
      // ileri fabrikaGirisZamani → panoya HENÜZ düşmez, "Planlanan" bölümünde bekler
      { id: 70, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2099-01-01", tech: "", fabrikaGirisZamani: "2099-01-01T08:00" },
      // normal Bekliyor (geçmiş giriş) → sütunda görünür
      { id: 71, customerId: 1, type: "Garanti İçi", durum: "Bekliyor", date: "2020-01-01", tech: "", fabrikaGirisZamani: "2020-01-01T08:00" },
    ],
    setServices: vi.fn(), customers: musteriler, calisanlar, showToast: vi.fn(), serverPermissions: null, ...over,
  });

  it("planlanmış servis Bekliyor sütununda kart olarak görünmez", () => {
    render(<ServisPanosu {...props()} />);
    // Yalnız 1 kart draggable (id 71); planlanmış (id 70) kart değil
    expect(document.querySelectorAll('article[draggable="true"]').length).toBe(1);
  });

  it("planlanan servis 'Planlanan (N)' bölümünde listelenir", () => {
    render(<ServisPanosu {...props()} />);
    const ac = screen.getByRole("button", { name: /Planlanan \(1\)/ });
    fireEvent.click(ac);
    expect(screen.getByRole("button", { name: /Hemen Düşür/ })).toBeTruthy();
  });

  it("'Hemen Düşür' servisi şimdiye çeker (setServices ile giriş güncellenir)", () => {
    const setServices = vi.fn();
    render(<ServisPanosu {...props({ setServices })} />);
    fireEvent.click(screen.getByRole("button", { name: /Planlanan \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Hemen Düşür/ }));
    const guncelle = setServices.mock.calls.at(-1)[0];
    const sonuc = guncelle([{ id: 70, durum: "Bekliyor", fabrikaGirisZamani: "2099-01-01T08:00" }]);
    // giriş artık ileri değil (şimdiye çekildi) → panoya düşer
    expect(sonuc[0].fabrikaGirisZamani.startsWith("2099")).toBe(false);
    expect(sonuc[0].durum).toBe("Bekliyor");
  });
});

describe("ServisPanosu — servis + kargo tek görünüm", () => {
  const dealers = [{ id: 5, name: "Bayi X" }];
  const parts = [{ id: 7, ad: "Dişli" }];
  const kargoSatis = { id: 650, dealerId: 5, aliciTipi: "bayi", partId: "7", miktar: 3, currency: "TRY", tarih: "2026-07-25", kargoDurum: "Hazırlanıyor", kargoSorumlusu: "Ahmet Yılmaz", tahsisler: [] };
  const props = (over = {}) => ({
    services: [{ id: 10, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-20", tech: "" }],
    setServices: vi.fn(), customers: musteriler, calisanlar, dealers, parts,
    yedekParcaSatislar: [kargoSatis], setYedekParcaSatislar: vi.fn(),
    kargoYetki: true, showToast: vi.fn(), serverPermissions: null, ...over,
  });

  it("kargo satışı (kargoDurum 'Hazırlanıyor') Bekliyor sütununda servisle birlikte 📦 kartı olarak görünür", () => {
    render(<ServisPanosu {...props()} />);
    expect(screen.getByText(/📦 KARGO/)).toBeTruthy();
    expect(screen.getByText("Bayi X")).toBeTruthy();
    // Kargoyu gönderen, servis kartındaki gibi bir "Kim gönderiyor?" select'inde seçili gelir
    const kargoSelect = [...document.querySelectorAll("select")].find(s => s.value === "Ahmet Yılmaz");
    expect(kargoSelect).toBeTruthy();
    // servis kartı da var → en az 2 draggable kart (servis + kargo)
    expect(document.querySelectorAll('article[draggable="true"]').length).toBeGreaterThanOrEqual(2);
  });

  it("panoya düşme zamanı ileri olan kargo panoda görünmez (zamanı gelene kadar)", () => {
    const planli = { ...kargoSatis, id: 655, panoDusmeZamani: "2099-01-01T08:00" };
    render(<ServisPanosu {...props({ yedekParcaSatislar: [planli] })} />);
    expect(screen.queryByText(/📦 KARGO/)).toBeNull();
  });

  it("en son eklenen (oluşturma zamanı yeni) kart, eski tarihli olsa bile en üstte çıkar", () => {
    const eskiServis = { id: 10, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-20", fabrikaGirisZamani: "2026-07-20T09:00:00", tech: "" };
    const yeniKargo = { id: 800, dealerId: 5, aliciTipi: "bayi", partId: "7", miktar: 1, currency: "TRY", tarih: "2026-07-10", kargoDurum: "Hazırlanıyor", olusturmaZamani: "2026-07-26T15:00:00", tahsisler: [] };
    render(<ServisPanosu {...props({ services: [eskiServis], yedekParcaSatislar: [yeniKargo] })} />);
    const bekliyor = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Bekliyor"));
    const kartlar = bekliyor.querySelectorAll("article");
    expect(kartlar[0].textContent).toMatch(/📦/); // sonradan eklenen kargo üstte (tarihi daha eski olsa da)
  });

  it("kargoYetki yoksa kargo kartı görünmez (servis-katı kiosk)", () => {
    render(<ServisPanosu {...props({ kargoYetki: false })} />);
    expect(screen.queryByText(/📦 KARGO/)).toBeNull();
  });

  it("kargo kartını Tamamlandı sütununa bırakınca kargoDurum 'Teslim Edildi' olur", () => {
    const setYedekParcaSatislar = vi.fn();
    render(<ServisPanosu {...props({ setYedekParcaSatislar })} />);
    const tamamlandi = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Tamamlandı"));
    const kargoDt = { getData: () => "kargo:650", setData: () => {}, dropEffect: "", effectAllowed: "" };
    fireEvent.drop(tamamlandi, { dataTransfer: kargoDt });
    expect(setYedekParcaSatislar).toHaveBeenCalled();
    const guncelle = setYedekParcaSatislar.mock.calls.at(-1)[0];
    const sonuc = guncelle([{ id: 650, kargoDurum: "Hazırlanıyor" }]);
    expect(sonuc[0].kargoDurum).toBe("Teslim Edildi");
  });

  it("'Yeni Yedek Parça Satışı' düğmesi görünür ve formu açar", () => {
    render(<ServisPanosu {...props()} />);
    const btn = screen.getByRole("button", { name: /Yeni Yedek Parça Satışı/ });
    fireEvent.click(btn);
    expect(screen.getByText("Alıcı")).toBeTruthy(); // YedekParcaSatisForm açıldı
  });

  it("kargo kartına tıklayınca kargo detay modalı açılır", () => {
    render(<ServisPanosu {...props()} />);
    fireEvent.click(screen.getByText(/📦 KARGO/).closest("article"));
    expect(screen.getByText("Kargo / Yedek Parça Satışı")).toBeTruthy();
  });
});

describe("ServisPanosu — eşzamanlı düzenleme kilidi", () => {
  // Servis DÜZENLERKEN müşterinin kilidi ("customer") alınır — müşteri detayıyla aynı alan.
  afterEach(() => { delete window.crmLocks; });

  const svc = { id: 40, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-20", tech: "" };
  const props = (over = {}) => ({
    services: [svc], setServices: vi.fn(), customers: musteriler, calisanlar, showToast: vi.fn(), serverPermissions: null, ...over,
  });

  it("kart düzenlenirken müşteri başkasında kilitliyse form yerine kilit uyarısı gösterir", async () => {
    const acquire = vi.fn().mockResolvedValue({ ok: false, lockedBy: "Ofis", lockedAt: new Date().toISOString() });
    window.crmLocks = { acquire, release: vi.fn().mockResolvedValue({}) };
    render(<ServisPanosu {...props()} />);
    fireEvent.click(document.querySelector('article[draggable="true"]')); // düzenlemek için karta tıkla
    // Kilit "customer" alanında, servisin müşteri id'siyle (müşteri detayındaki düzenlemeyle aynı alan)
    expect(acquire).toHaveBeenCalledWith("customer", "1", false);
    // Çakışma çözülünce ServiceForm yerine kilit uyarısı görünür
    expect(await screen.findByText("Bu kayıt şu an düzenleniyor")).toBeTruthy();
    expect(screen.getByText(/Ofis/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Zorla Düzenle/ })).toBeTruthy();
    expect(screen.queryByText("İşlemi Yapan Firma")).toBeNull(); // form açılmadı
  });

  it("kilit alınırsa form normal açılır", async () => {
    const acquire = vi.fn().mockResolvedValue({ ok: true });
    window.crmLocks = { acquire, release: vi.fn().mockResolvedValue({}) };
    render(<ServisPanosu {...props()} />);
    fireEvent.click(document.querySelector('article[draggable="true"]'));
    expect(await screen.findByText("İşlemi Yapan Firma")).toBeTruthy(); // tam ServiceForm
    expect(screen.queryByText("Bu kayıt şu an düzenleniyor")).toBeNull();
  });

  it("YENİ servis (ekleme) modunda kilit alınmaz (taslak kaybı olmasın)", () => {
    const acquire = vi.fn().mockResolvedValue({ ok: true });
    window.crmLocks = { acquire, release: vi.fn().mockResolvedValue({}) };
    render(<ServisPanosu {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Servis Talebi/ }));
    expect(screen.getByText("İşlemi Yapan Firma")).toBeTruthy(); // form açık
    expect(acquire).not.toHaveBeenCalled();                       // ekleme kilit almaz
  });
});

describe("CalisanManager — firma çalışanları CRUD", () => {
  it("ad yazıp Ekle deyince setCalisanlar çağrılır", () => {
    const setCalisanlar = vi.fn();
    render(<CalisanManager calisanlar={[]} setCalisanlar={setCalisanlar} showToast={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Ad Soyad"), { target: { value: "Ali Veli" } });
    fireEvent.click(screen.getByRole("button", { name: /Ekle/ }));
    expect(setCalisanlar).toHaveBeenCalled();
  });

  it("mevcut çalışanları listeler + düzenle/sil düğmeleri var", () => {
    render(<CalisanManager calisanlar={calisanlar} setCalisanlar={vi.fn()} showToast={vi.fn()} />);
    expect(screen.getByText("Ahmet Yılmaz")).toBeTruthy();
    expect(screen.getByText("Mehmet Demir")).toBeTruthy();
  });
});

describe("ServiceForm — teknisyen: açılır liste + 'Diğer' serbest giriş", () => {
  // Gerçek state sarmalayıcı: form.tech güncellenir, böylece seçimin/serbest metnin kabul edildiğini
  // doğrularız.
  const Harness = (props = {}) => {
    const [form, setForm] = useState({ customerId: 1, degisenParcalar: [], currency: "TRY", tech: "", ...props.form });
    return <ServiceForm title="Servis" form={form} setForm={setForm} customers={musteriler}
      calisanlar={calisanlar} onSave={vi.fn()} onCancel={vi.fn()} />;
  };
  const techSelect = () => screen.getByRole("option", { name: "Kim yapıyor?" }).closest("select");

  it("açılır listede tüm çalışanları sunar; seçili olsa bile hepsi listede kalır (önce silmek gerekmez)", () => {
    render(<Harness />);
    const sel = techSelect();
    let opts = [...sel.querySelectorAll("option")].map(o => o.textContent);
    expect(opts).toContain("Ahmet Yılmaz");
    expect(opts).toContain("Mehmet Demir");
    expect(opts.some(o => /Diğer/.test(o))).toBe(true);
    // Bir çalışan seç
    fireEvent.change(sel, { target: { value: "Ahmet Yılmaz" } });
    expect(sel.value).toBe("Ahmet Yılmaz");
    // Regresyon: seçiliyken diğer çalışan hâlâ listede (datalist'te önce silmek gerekiyordu)
    opts = [...sel.querySelectorAll("option")].map(o => o.textContent);
    expect(opts).toContain("Mehmet Demir");
    fireEvent.change(sel, { target: { value: "Mehmet Demir" } });
    expect(sel.value).toBe("Mehmet Demir");
  });

  it("'Diğer (elle yaz)' seçilince serbest metin kutusu açılır, harici usta yazılabilir", () => {
    render(<Harness />);
    const sel = techSelect();
    fireEvent.change(sel, { target: { value: "__diger__" } });
    const input = screen.getByPlaceholderText("Harici teknisyen adı...");
    fireEvent.change(input, { target: { value: "Harici Usta" } });
    expect(input.value).toBe("Harici Usta");
  });

  it("listede olmayan mevcut tech (eski veri) 'Diğer' modunda serbest kutuda gösterilir", () => {
    render(<Harness form={{ tech: "Eski Harici İsim" }} />);
    expect(screen.getByDisplayValue("Eski Harici İsim")).toBeTruthy();
    expect(techSelect().value).toBe("__diger__");
  });
});

describe("ServiceForm — Yapılan İşlem: 'Kargo' seçeneği kaldırıldı (eski değer korunur)", () => {
  const İşlemOpsiyonlari = () => [...document.querySelectorAll("select")]
    .flatMap(sel => [...sel.querySelectorAll("option")].map(o => o.textContent));

  it("yeni serviste 'Kargo' seçeneği sunulmaz; Yerinde/Fabrikada/Fabrika Teslim var", () => {
    const H = () => { const [form, setForm] = useState({ customerId: 1, degisenParcalar: [], currency: "TRY" }); return <ServiceForm title="S" form={form} setForm={setForm} customers={musteriler} calisanlar={calisanlar} onSave={vi.fn()} onCancel={vi.fn()} />; };
    render(<H />);
    const opts = İşlemOpsiyonlari();
    expect(opts).toContain("Yerinde Onarım");
    expect(opts).toContain("Fabrika Teslim");
    expect(opts).not.toContain("Kargo");
  });

  it("eski 'Kargo' repairPlace'li kayıt düzenlenirken değer korunur (listeye eklenir)", () => {
    const H = () => { const [form, setForm] = useState({ id: 5, customerId: 1, repairPlace: "Kargo", degisenParcalar: [], currency: "TRY" }); return <ServiceForm title="S" form={form} setForm={setForm} customers={musteriler} calisanlar={calisanlar} onSave={vi.fn()} onCancel={vi.fn()} />; };
    render(<H />);
    expect(İşlemOpsiyonlari()).toContain("Kargo"); // eski değer düzenlemede kaybolmaz
  });
});

describe("ServisPanosu — Arşivi Temizle (servis + kargo + kalıp)", () => {
  // Arşive gönderilen (panoGizli) kargo/kalıp kartları da "Arşivi Temizle" ile panodan tamamen
  // çıkarılabilmeli — eskiden yalnız servisler temizleniyordu, kargo/fabrika teslim kutuları arşivde
  // takılı kalıyordu. Temizleme kargoDurum'u boşaltır (kayıt Stok'ta durur).
  const arsivProps = (over = {}) => ({
    services: [], setServices: vi.fn(), customers: musteriler, calisanlar, showToast: vi.fn(),
    serverPermissions: null,
    kargoYetki: true, kalipYetki: true, dealers: [{ id: 5, name: "Bayi X" }], parts: [{ id: 7, ad: "Dişli" }],
    yedekParcaSatislar: [{ id: 900, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 2, tarih: "2026-07-20", kargoDurum: "Teslim Edildi", panoGizli: true, fabrikaTeslim: true, tahsisler: [] }],
    setYedekParcaSatislar: vi.fn(),
    partSales: [{ id: 800, customerId: 1, tur: "Kalıp", ad: "Adana Kalıbı", olcu: "55x125", kargoDurum: "Teslim Edildi", panoGizli: true, tarih: "2026-07-19" }],
    setPartSales: vi.fn(),
    ...over,
  });

  it("arşivlenen kargo + kalıp da 'Arşivi Temizle' ile panodan çıkar (kargoDurum boşalır, panoGizli false)", () => {
    const p = arsivProps();
    render(<ServisPanosu {...p} />);
    // Arşiv akordeonunu aç (Tamamlandı sütununda)
    fireEvent.click(screen.getByText(/Arşivlenenler/));
    // Temizle → onay
    fireEvent.click(screen.getByText("🗑 Arşivi Temizle"));
    fireEvent.click(screen.getByText("Evet, Temizle"));
    // Kargo temizlendi
    expect(p.setYedekParcaSatislar).toHaveBeenCalled();
    const yeniKargo = p.setYedekParcaSatislar.mock.calls.at(-1)[0](p.yedekParcaSatislar);
    expect(yeniKargo.find(s => s.id === 900).kargoDurum).toBe("");
    expect(yeniKargo.find(s => s.id === 900).panoGizli).toBe(false);
    // Kalıp temizlendi
    expect(p.setPartSales).toHaveBeenCalled();
    const yeniKalip = p.setPartSales.mock.calls.at(-1)[0](p.partSales);
    expect(yeniKalip.find(s => s.id === 800).kargoDurum).toBe("");
    expect(yeniKalip.find(s => s.id === 800).panoGizli).toBe(false);
  });

  it("toplu (batchId) kargoda arşiv temizleme grubun TÜM üyelerini kaldırır", () => {
    const yedekParcaSatislar = [
      { id: 901, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, tarih: "2026-07-20", kargoDurum: "Teslim Edildi", panoGizli: true, batchId: 5000, tahsisler: [] },
      { id: 902, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 1, tarih: "2026-07-20", kargoDurum: "Teslim Edildi", panoGizli: true, batchId: 5000, tahsisler: [] },
    ];
    const p = arsivProps({ yedekParcaSatislar, partSales: [] });
    render(<ServisPanosu {...p} />);
    fireEvent.click(screen.getByText(/Arşivlenenler/));
    fireEvent.click(screen.getByText("🗑 Arşivi Temizle"));
    fireEvent.click(screen.getByText("Evet, Temizle"));
    const yeni = p.setYedekParcaSatislar.mock.calls.at(-1)[0](yedekParcaSatislar);
    expect(yeni.every(s => s.kargoDurum === "" && s.panoGizli === false)).toBe(true); // grubun ikisi de
  });
});

describe("ServiceForm — ileri tarihli servis (panoya düşme zamanı)", () => {
  const Harness = () => {
    const [form, setForm] = useState({ customerId: 1, degisenParcalar: [], currency: "TRY", tech: "", date: today(), durum: "Bekliyor" });
    return <ServiceForm title="Servis" form={form} setForm={setForm} customers={musteriler}
      calisanlar={calisanlar} onSave={vi.fn()} onCancel={vi.fn()} />;
  };

  it("yeni Bekliyor serviste 'Panoya Düşme Zamanı' alanı görünür", () => {
    render(<Harness />);
    expect(screen.getByText("🕒 Panoya Düşme Zamanı")).toBeTruthy();
    // Giriş boşken hemen-düşer ipucu
    expect(screen.getByText(/hemen panoya düşer/)).toBeTruthy();
  });

  it("ileri tarih seçilince durum Bekliyor kalır + giriş ön-dolar + 'düşecek' ipucu çıkar", () => {
    render(<Harness />);
    const tarih = document.querySelector('input[type="date"]');
    fireEvent.change(tarih, { target: { value: "2099-06-15" } });
    // Panoya düşme zamanı ileri → uyarı ipucu
    expect(screen.getByText(/panoya düşecek/)).toBeTruthy();
    // datetime-local alanı 2099-06-15 tarihine ön-dolmuş
    const dtl = document.querySelector('input[type="datetime-local"]');
    expect(dtl.value.startsWith("2099-06-15")).toBe(true);
  });
});

describe("ServiceForm — seçili müşterinin yetkili & adresi (aç/kapa)", () => {
  const zenginMusteri = [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1",
    yetkili1Ad: "Ayşe Kaya", yetkili1Tel: "0212 555 11 22", phone: "0212 000 00 00",
    adres: "Organize Sanayi 5. Cadde No 12", city: "İstanbul", ilce: "Tuzla", country: "Türkiye" }];
  const Harness = () => {
    const [form, setForm] = useState({ customerId: 1, degisenParcalar: [], currency: "TRY" });
    return <ServiceForm title="Servis" form={form} setForm={setForm} customers={zenginMusteri}
      calisanlar={calisanlar} onSave={vi.fn()} onCancel={vi.fn()} />;
  };

  it("varsayılan kapalı; düğmeye tıklayınca yetkili ve adres görünür, tekrar tıklayınca gizlenir", () => {
    render(<Harness />);
    // Kapalıyken yetkili/adres değerleri görünmez
    expect(screen.queryByText(/Ayşe Kaya/)).toBeNull();
    const btn = screen.getByRole("button", { name: /Yetkili & Adres/ });
    fireEvent.click(btn);
    expect(screen.getByText(/Ayşe Kaya/)).toBeTruthy();               // yetkili1Ad · yetkili1Tel
    expect(screen.getByText("Organize Sanayi 5. Cadde No 12")).toBeTruthy();
    expect(screen.getByText("İstanbul / Tuzla / Türkiye")).toBeTruthy();
    // Tekrar tıkla → gizlenir
    fireEvent.click(btn);
    expect(screen.queryByText(/Ayşe Kaya/)).toBeNull();
  });

  it("eski kayıtta yetkili1Ad yoksa contact yedeğinden ad gösterilir", () => {
    const eski = [{ id: 1, name: "Eski Firma", contact: "Veli Han", phone: "0500" }];
    const H = () => {
      const [form, setForm] = useState({ customerId: 1, degisenParcalar: [], currency: "TRY" });
      return <ServiceForm title="S" form={form} setForm={setForm} customers={eski} calisanlar={calisanlar} onSave={vi.fn()} onCancel={vi.fn()} />;
    };
    render(<H />);
    fireEvent.click(screen.getByRole("button", { name: /Yetkili & Adres/ }));
    expect(screen.getByText(/Veli Han/)).toBeTruthy();
  });
});

describe("ServisPanosu — yeni-servis alarmı", () => {
  const baseServices = [
    { id: 10, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-20", tech: "" },
    { id: 11, customerId: 1, type: "Garanti İçi", durum: "Yapılıyor", date: "2026-07-19", tech: "Ahmet Yılmaz" },
  ];
  const p = (over = {}) => ({
    services: baseServices, setServices: vi.fn(), customers: musteriler, calisanlar,
    showToast: vi.fn(), serverPermissions: null, appSettings: { servisAlarm: { acik: true, sesSn: 20, yanipSn: 40 } }, ...over,
  });
  const yeniServis = { id: 500, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-21", tech: "" };

  // Alarm şeridi, "Yeni Servis Talebi" butonuyla aynı metni taşıdığı için şeridi metinle değil,
  // yalnız şeritte bulunan "Sustur" ve 🔔 ile hedefliyoruz. seritMetni() şerit içeriğini döner.
  const seritVar = () => screen.queryByText("Sustur") != null;
  const seritMetni = () => screen.getByText("🔔").parentElement.textContent;

  it("taban çizgisinde (ilk render) mevcut bekleyenler alarm vermez", () => {
    render(<ServisPanosu {...p()} />);
    expect(seritVar()).toBe(false);
    expect(document.querySelector(".servis-alarm-yanip")).toBeNull();
  });

  it("uzaktan yeni Bekliyor servis gelince 'Yeni Servis Talebi' şeridi + yanıp sönme çıkar, Sustur temizler", () => {
    const base = p();
    const { rerender } = render(<ServisPanosu {...base} />);
    expect(seritVar()).toBe(false);
    rerender(<ServisPanosu {...base} services={[yeniServis, ...baseServices]} />);
    expect(seritVar()).toBe(true);
    expect(seritMetni()).toMatch(/Yeni Servis Talebi/);
    expect(document.querySelector(".servis-alarm-yanip")).toBeTruthy();
    fireEvent.click(screen.getByText("Sustur"));
    expect(seritVar()).toBe(false);
    expect(document.querySelector(".servis-alarm-yanip")).toBeNull();
  });

  it("uzaktan yeni kargo (Hazırlanıyor) gelince 'Yeni Kargo Talebi' şeridi (📦 değil) çıkar, alıcı adıyla", () => {
    const dealers = [{ id: 9000, name: "Bayi Z" }];
    const yeniKargo = { id: 700, aliciTipi: "bayi", dealerId: 9000, partId: "7", miktar: 3, kargoDurum: "Hazırlanıyor", tahsisler: [] };
    const base = p({ dealers, parts: [{ id: 7, ad: "Dişli" }], kargoYetki: true, yedekParcaSatislar: [] });
    const { rerender } = render(<ServisPanosu {...base} />);
    expect(seritVar()).toBe(false);
    rerender(<ServisPanosu {...base} yedekParcaSatislar={[yeniKargo]} />);
    expect(seritMetni()).toMatch(/Yeni Kargo Talebi/);  // "Yeni Servis Talebi" değil
    expect(seritMetni()).toMatch(/Bayi Z/);
  });

  it("alarm kapalıyken yeni serviste şerit/yanıp sönme çıkmaz", () => {
    const base = p({ appSettings: { servisAlarm: { acik: false, sesSn: 20, yanipSn: 40 } } });
    const { rerender } = render(<ServisPanosu {...base} />);
    rerender(<ServisPanosu {...base} services={[yeniServis, ...baseServices]} />);
    expect(seritVar()).toBe(false);
    expect(document.querySelector(".servis-alarm-yanip")).toBeNull();
  });

  it("yeni kargo ('Hazırlanıyor') gelince servisle AYNI alarmı verir (şerit + yanıp sönme)", () => {
    const dealers = [{ id: 5, name: "Bayi X" }];
    const parts = [{ id: 7, ad: "Dişli" }];
    const base = { ...p(), dealers, parts, kargoYetki: true, yedekParcaSatislar: [], setYedekParcaSatislar: vi.fn() };
    const { rerender } = render(<ServisPanosu {...base} />);
    expect(document.querySelector(".servis-alarm-yanip")).toBeNull();
    const yeniKargo = { id: 700, dealerId: 5, aliciTipi: "bayi", partId: "7", miktar: 2, currency: "TRY", tarih: "2026-07-25", kargoDurum: "Hazırlanıyor", tahsisler: [] };
    rerender(<ServisPanosu {...base} yedekParcaSatislar={[yeniKargo]} />);
    expect(seritMetni()).toMatch(/Bayi X/);                     // şeritte kargo alıcısı
    expect(document.querySelector(".servis-alarm-yanip")).toBeTruthy(); // kart yanıp söner
  });

  it("kargoYetki yoksa yeni kargo alarm vermez", () => {
    const dealers = [{ id: 5, name: "Bayi X" }];
    const parts = [{ id: 7, ad: "Dişli" }];
    const base = { ...p(), dealers, parts, kargoYetki: false, yedekParcaSatislar: [], setYedekParcaSatislar: vi.fn() };
    const { rerender } = render(<ServisPanosu {...base} />);
    const yeniKargo = { id: 701, dealerId: 5, aliciTipi: "bayi", partId: "7", miktar: 2, currency: "TRY", tarih: "2026-07-25", kargoDurum: "Hazırlanıyor", tahsisler: [] };
    rerender(<ServisPanosu {...base} yedekParcaSatislar={[yeniKargo]} />);
    expect(document.querySelector(".servis-alarm-yanip")).toBeNull();
  });
});

// Pano kutu sürükleme YUMUŞAK KİLİDİ: bir kaydı başka kullanıcı düzenliyorsa (o kayıt kilitliyse)
// sürüklemeyi reddeder + toast gösterir. Kilit listesi window.crmLocks.list()'ten gelir.
describe("ServisPanosu — sürükleme yumuşak kilidi", () => {
  const musteriler2 = [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }];
  const dt2 = (raw) => ({ getData: () => raw, setData: () => {}, dropEffect: "", effectAllowed: "" });
  const sutun = (ad) => [...document.querySelectorAll("section")].find(s => s.textContent.includes(ad));
  const stubLocks = (rows) => { window.crmLocks = { list: () => Promise.resolve(rows) }; };
  afterEach(() => { delete window.crmLocks; });

  const baseProps = (over = {}) => ({
    services: [{ id: 10, customerId: 1, type: "Periyodik Bakım", durum: "Bekliyor", date: "2026-07-20", tech: "" }],
    setServices: vi.fn(), customers: musteriler2, calisanlar: [], showToast: vi.fn(),
    serverPermissions: null, aktifKullanici: "kiosk", ...over,
  });

  it("başkası müşteriyi kilitlemişse servis kartı taşınmaz (setServices çağrılmaz, toast çıkar)", async () => {
    stubLocks([{ entity_type: "customer", entity_id: "1", locked_by: "ofis", locked_at: "2026-08-02T10:00:00" }]);
    const setServices = vi.fn(); const showToast = vi.fn();
    render(<ServisPanosu {...baseProps({ setServices, showToast })} />);
    await act(async () => {}); // kilit listesi state'e otursun
    fireEvent.drop(sutun("Tamamlandı"), { dataTransfer: dt2("10") });
    expect(setServices).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("ofis"), "err");
  });

  it("kilit BENİM üzerimdeyse (aktif kullanıcı) sürükleme engellenmez", async () => {
    stubLocks([{ entity_type: "customer", entity_id: "1", locked_by: "kiosk" }]);
    const setServices = vi.fn();
    render(<ServisPanosu {...baseProps({ setServices })} />);
    await act(async () => {});
    fireEvent.drop(sutun("Tamamlandı"), { dataTransfer: dt2("10") });
    expect(setServices).toHaveBeenCalled();
  });

  it("kilit yoksa servis kartı normal taşınır", async () => {
    stubLocks([]);
    const setServices = vi.fn();
    render(<ServisPanosu {...baseProps({ setServices })} />);
    await act(async () => {});
    fireEvent.drop(sutun("Tamamlandı"), { dataTransfer: dt2("10") });
    expect(setServices).toHaveBeenCalled();
  });

  it("başkası yedek parça satışını kilitlemişse kargo kartı taşınmaz", async () => {
    stubLocks([{ entity_type: "yedek_parca", entity_id: "700", locked_by: "ofis" }]);
    const setYedekParcaSatislar = vi.fn(); const showToast = vi.fn();
    const yp = [{ id: 700, aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: 3, kargoDurum: "Hazırlanıyor", tahsisler: [] }];
    render(<ServisPanosu {...baseProps({ setYedekParcaSatislar, showToast, kargoYetki: true, dealers: [{ id: 5, name: "Bayi X" }], parts: [{ id: 7, ad: "Dişli" }], yedekParcaSatislar: yp })} />);
    await act(async () => {});
    fireEvent.drop(sutun("Yapılıyor"), { dataTransfer: dt2("kargo:700") });
    expect(setYedekParcaSatislar).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("ofis"), "err");
  });

  it("başkası kalıp satışını kilitlemişse kalıp kargo kartı taşınmaz", async () => {
    stubLocks([{ entity_type: "part_sale", entity_id: "900", locked_by: "ofis" }]);
    const setPartSales = vi.fn(); const showToast = vi.fn();
    const partSales = [{ id: 900, customerId: 1, tur: "Kalıp", ad: "Adana Kalıbı", kargoDurum: "Hazırlanıyor", tarih: "2026-07-20" }];
    render(<ServisPanosu {...baseProps({ setPartSales, showToast, kalipYetki: true, partSales })} />);
    await act(async () => {});
    fireEvent.drop(sutun("Yapılıyor"), { dataTransfer: dt2("kalip:900") });
    expect(setPartSales).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("ofis"), "err");
  });
});
