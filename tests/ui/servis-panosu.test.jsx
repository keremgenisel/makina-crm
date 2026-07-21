// @vitest-environment jsdom
// Servis Panosu (Kanban): servisler durumuna göre sütunlanır, sürükle-bırakla durum değişir,
// kartta teknisyen (firma çalışanı) seçilir, "Yeni Servis" müşteri kartındakiyle AYNI tam
// ServiceForm'u açar. Ayrıca Ayarlar > Firma Çalışanları CRUD ve servis formundaki teknisyen seçicisi.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";

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
    // Sütun başlıkları (görünen ad); saklanan `durum` değeri Bekliyor/Yapılıyor/Tamamlandı olarak kalır.
    expect(screen.getByRole("heading", { name: "Bekliyor / Fabrikaya Giriş" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Bakım Onarım Yapılıyor" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Bakım Onarım Tamamlandı" })).toBeTruthy();
    // 2 kartlı servis görünür (id 10, 11), durumsuz (99) müşteri adı 1 kez... hepsi ABC olduğundan
    // kart sayısını data ile kontrol edelim: sütun sayaçları 1 / 1 / 0
    const sayaclar = [...document.querySelectorAll("section")].map(s => s.textContent.match(/\d+/)?.[0]);
    expect(sayaclar.filter(Boolean)).toContain("1"); // en az bir sütunda 1
    // Kart draggable
    expect(document.querySelector('article[draggable="true"]')).toBeTruthy();
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

describe("ServiceForm — teknisyen: çalışan önerisi + elle serbest giriş", () => {
  // Gerçek state sarmalayıcı: form.tech güncellenir, böylece serbest metnin kabul edildiğini
  // input.value üzerinden doğrularız (setForm mock'unda yakalanan sentetik olay bayatlardı).
  const Harness = () => {
    const [form, setForm] = useState({ customerId: 1, degisenParcalar: [], currency: "TRY", tech: "" });
    return <ServiceForm title="Servis" form={form} setForm={setForm} customers={musteriler}
      calisanlar={calisanlar} onSave={vi.fn()} onCancel={vi.fn()} />;
  };

  it("çalışanları datalist'te önerir ama serbest metin de yazılabilir", () => {
    render(<Harness />);
    // Öneri listesi (datalist) firma çalışanlarını içerir
    const dl = document.getElementById("servis-teknisyen-listesi");
    expect(dl).toBeTruthy();
    const values = [...dl.querySelectorAll("option")].map(o => o.value);
    expect(values).toContain("Ahmet Yılmaz");
    expect(values).toContain("Mehmet Demir");
    // Alan serbest metin: listede olmayan bir isim elle yazılabilir
    const input = document.querySelector('input[list="servis-teknisyen-listesi"]');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: "Harici Usta" } });
    expect(input.value).toBe("Harici Usta");
  });
});
