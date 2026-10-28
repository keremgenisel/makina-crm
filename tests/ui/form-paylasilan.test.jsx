// @vitest-environment jsdom
// Spec 0015 AC-9 / AC-10 / AC-11 (plan F9, F11): paylaşılan formlar her açılış noktasında aynı biçimde çalışır. Alan
// etiketleri dönüşümden ÖNCE her açılış noktasında kaydedildi (aşağıda); sonra da aynı olmalı. Servis formu iki noktada
// birebir aynı; kiosk kullanıcısında dosya bölümü izin gereği gizli.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { ServisPanosu } from "../../src/components/ServisPanosu";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { Stock } from "../../src/components/Stock";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const M = [{ id: 1, name: "ABC Makina", model: "AK-100", serialNo: "SN-1" }];
const D = [{ id: 3, name: "Ege Bayi", bayiMi: true }];
const P = [{ id: 7, ad: "Rulman" }];
const sonPencere = () => { const m = document.querySelectorAll(".modal-backdrop"); return m[m.length - 1]; };
// Spec 0079 R1, R2 ile güncellendi: faturalı yurtiçi formda "Bu fatura tevkifatlı" kutusu yeni alandır. Kutu her paylaşılan
// formda bulunmalı (aşağıda ayrıca sayılır); geri kalan etiketler öncesiyle birebir aynıdır.
const TEVKIFAT_ETIKETI = "Bu fatura tevkifatlı";
const tumEtiketler = () => [...sonPencere().querySelectorAll("label")].map(l => l.textContent.trim()).filter(Boolean);
// Spec 0095 R1 ile güncellendi: yedek parça formunda "Garanti içi, ücretsiz verildi" kutusu yeni alandır; dört açılış noktasında
// birer kez bulunur (aşağıda), diğer formlarda hiç yoktur. Geri kalan etiketler öncesiyle birebir aynıdır.
const UCRETSIZ_ETIKETI = "Garanti içi, ücretsiz verildi";
// Spec 0115 R10 ile güncellendi (0015 AC-9/AC-10 genişletildi): servis formunda "Kalıp atölyeye girecek" kutusu yeni alandır;
// iki servis açılış noktasında birer kez bulunur (aşağıda), diğer formlarda hiç yoktur. Geri kalan etiketler öncesiyle birebir aynıdır.
const KALIP_KUTU_ETIKETI = "Kalıp atölyeye girecek";
const kalipKutuSayisi = () => tumEtiketler().filter(e => e === KALIP_KUTU_ETIKETI).length;
const etiketler = () => { const t = tumEtiketler(); expect(t.filter(e => e === TEVKIFAT_ETIKETI)).toHaveLength(1); return t.filter(e => e !== TEVKIFAT_ETIKETI && e !== UCRETSIZ_ETIKETI && e !== KALIP_KUTU_ETIKETI); };
const ucretsizEtiketSayisi = () => tumEtiketler().filter(e => e === UCRETSIZ_ETIKETI).length;
const tikla = (re) => fireEvent.click(screen.getAllByRole("button").filter(b => re.test(b.textContent.trim())).pop());
const musteri = () => render(<Customers customers={M} setCustomers={vi.fn()} partSales={[]} services={[]} payments={[]} dealers={D} parts={P}
  setServices={vi.fn()} setPartSales={vi.fn()} setYedekParcaSatislar={vi.fn()} initialDetailId={1} />);
const pano = (serverPermissions = null) => render(<ServisPanosu services={[]} setServices={vi.fn()} customers={M} dealers={D} parts={P} calisanlar={[]}
  showToast={vi.fn()} serverPermissions={serverPermissions} setYedekParcaSatislar={vi.fn()} yedekParcaSatislar={[]} setDosyalar={vi.fn()} dosyalar={[]} />);
const bayi = () => render(<SimpleDealers dealers={D} setDealers={vi.fn()} factory={{ name: "A" }} setFactory={vi.fn()} partSales={[]} setPartSales={vi.fn()}
  services={[]} customers={M} setCustomers={vi.fn()} showToast={vi.fn()} openDetailId={3} setYedekParcaSatislar={vi.fn()} parts={P} kalipDefs={[]} />);

// Dönüşüm öncesi (bugünkü kod) alan etiketleri.
const ONCE = {
 "servisMusteri": [
  "Müşteri",
  "Tarih",
  "Teknisyen",
  "Tür",
  "Yapılan İşlem",
  "Servis Panosunda göster(kapalıysa yalnız müşteri geçmişine kaydedilir, panoya düşmez)",
  "İşlemi Yapan Firma",
  "Fatura Tipi",
  "Müşteri Talimatı / Açıklama",
  "Fabrika Notu",
  "Yapılan İşler / Parça Değişimleri",
  "Değişen Parçalar (varsa)",
  "Para Birimi",
  "Servis Ücreti"
 ],
 "servisPano": [
  "Müşteri",
  "Tarih",
  "Teknisyen",
  "Tür",
  "Yapılan İşlem",
  "Servis Panosunda göster(kapalıysa yalnız müşteri geçmişine kaydedilir, panoya düşmez)",
  "İşlemi Yapan Firma",
  "Fatura Tipi",
  "Müşteri Talimatı / Açıklama",
  "Fabrika Notu",
  "Yapılan İşler / Parça Değişimleri",
  "Değişen Parçalar (varsa)",
  "Para Birimi",
  "Servis Ücreti"
 ],
 "kalipMusteri": [
  "Müşteri / Makina",
  "Veriliş Tarihi",
  "Para Birimi",
  "Satış Yapan Firma",
  "Fatura Tipi",
  "Kalıplar",
  "Teslim Şekli",
  "Kargo Tarihi",
  "Kargoyu Veren Kişi",
  "📍 Farklı adrese kargolat",
  "📦 Servis ve Kargo Panosuna gönder (takip)Kapalı: yalnızca kayıt olur, panoya düşmez."
 ],
 "kalipBayi": [
  "Müşteri / Makina",
  "Veriliş Tarihi",
  "Para Birimi",
  "Satış Yapan Firma",
  "Fatura Tipi",
  "Kalıplar"
 ],
 "ypMusteri": [
  "Alıcı",
  "Tarih",
  "Para Birimi",
  "Fatura Tipi",
  "Yedek Parçalar",
  "Teslim Şekli",
  "Kargo Tarihi",
  "Kargoyu Veren Kişi",
  "📍 Farklı adrese kargolat",
  "📦 Servis ve Kargo Panosuna gönder (takip)Kapalı: yalnızca kayıt olur, panoya düşmez.",
  "Not"
 ],
 "ypBayi": [
  "Alıcı",
  "Tarih",
  "Para Birimi",
  "Fatura Tipi",
  "Yedek Parçalar",
  "Teslim Şekli",
  "Kargo Tarihi",
  "Kargoyu Veren Kişi",
  "📍 Farklı adrese kargolat",
  "📦 Servis ve Kargo Panosuna gönder (takip)Kapalı: yalnızca kayıt olur, panoya düşmez.",
  "Not"
 ],
 "ypStok": [
  "Alıcı",
  "Tarih",
  "Para Birimi",
  "Fatura Tipi",
  "Yedek Parçalar",
  "Teslim Şekli",
  "Kargo Tarihi",
  "Kargoyu Veren Kişi",
  "📍 Farklı adrese kargolat",
  "📦 Servis ve Kargo Panosuna gönder (takip)Kapalı: yalnızca kayıt olur, panoya düşmez.",
  "Not"
 ],
 "ypPano": [
  "Alıcı",
  "Tarih",
  "Para Birimi",
  "Fatura Tipi",
  "Yedek Parçalar",
  "Teslim Şekli",
  "Kargo Tarihi",
  "Kargoyu Veren Kişi",
  "📍 Farklı adrese kargolat",
  "📦 Servis ve Kargo Panosuna gönder (takip)Panoda takip edilecek.",
  "Pano Durumu",
  "Panoya Düşme Zamanı",
  "Not"
 ]
};

// Dönüşüm öncesi onay kutusu ve açılır liste sayıları (müşteri detayından açılışta).
// Spec 0079 R1 ile güncellendi: her formda bir onay kutusu daha (tevkifat); oran seçicisi kutu kapalıyken çizilmez.
// Spec 0095 R1 ile güncellendi: yedek parça formunda bir onay kutusu daha var ("Garanti içi, ücretsiz verildi"; 3 → 4).
// Spec 0115 ile güncellendi (0015 AC-7 ters çevrildi): servis formunda "Kalıp atölyeye girecek" kutusu (2 → 3).
const SAYI = {"servis":{"kutu":3,"liste":6},"kalip":{"kutu":3,"liste":3},"yp":{"kutu":4,"liste":2}};

describe("Paylaşılan formlar", () => {
  it("AC-9: Servis formu müşteri detayından ve Servis ve Kargo Panosu'ndan aynı biçimde açılır (öncesiyle ve birbiriyle aynı)", () => {
    musteri(); tikla(/Yeni Servis Talebi/); expect(kalipKutuSayisi()).toBe(1); const a = etiketler(); cleanup();
    pano(); tikla(/Yeni Servis Talebi/); expect(kalipKutuSayisi()).toBe(1); const b = etiketler();
    expect(a).toEqual(ONCE.servisMusteri);
    expect(b).toEqual(ONCE.servisPano);
    expect(a).toEqual(b);
  });
  it("AC-9: kiosk kullanıcısında (yalnız servis sekmesi, dosya izni yok) servis formu açılır, dosya bölümü gizli; dosya izniyle görünür", () => {
    window.appFiles = { add: vi.fn(), open: vi.fn() }; // dosya bölümü yalnız masaüstü dosya köprüsüyle çizilir
    const kiosk = (ca) => ({ role: "user", permissions: JSON.stringify({ tabs: ["servis"], customerActions: ca }) });
    pano(kiosk(["cust_service_add", "cust_service_edit"])); tikla(/Yeni Servis Talebi/);
    expect(etiketler()).toEqual(ONCE.servisPano);
    expect(screen.queryByText(/Resim \/ Dosya Ekle/)).toBeNull();
    cleanup();
    pano(kiosk(["cust_service_add", "cust_service_edit", "cust_dosya_add"])); tikla(/Yeni Servis Talebi/);
    expect(screen.getByText(/Resim \/ Dosya Ekle/)).toBeTruthy();
    delete window.appFiles;
  });
  it("AC-10: Extra Kalıp formu müşteri detayından ve bayi kartından aynı biçimde çalışır (öncesiyle aynı)", () => {
    musteri(); tikla(/Extra Kalıp Satışı/); expect(kalipKutuSayisi()).toBe(0); expect(etiketler()).toEqual(ONCE.kalipMusteri); cleanup();
    bayi(); tikla(/Bayi Aracılığıyla Kalıp Satışı/); expect(kalipKutuSayisi()).toBe(0); expect(etiketler()).toEqual(ONCE.kalipBayi);
  });
  it("AC-11: Yedek parça formu dört açılış noktasında da aynı biçimde çalışır (öncesiyle aynı)", () => {
    musteri(); tikla(/^Yedek Parça Satışı$/); expect(etiketler()).toEqual(ONCE.ypMusteri); expect(ucretsizEtiketSayisi()).toBe(1); expect(kalipKutuSayisi()).toBe(0); cleanup();
    bayi(); tikla(/^Yedek Parça Satışı$/); expect(etiketler()).toEqual(ONCE.ypBayi); expect(ucretsizEtiketSayisi()).toBe(1); cleanup();
    render(<Stock factory={{ name: "A" }} stock={[]} setStock={vi.fn()} customers={M} setCustomers={vi.fn()} parts={P} dealers={D} defaultSubTab="yedeksatis" />);
    tikla(/Yeni Satış/); expect(etiketler()).toEqual(ONCE.ypStok); expect(ucretsizEtiketSayisi()).toBe(1); cleanup();
    pano(); tikla(/Yeni Yedek Parça Satışı/); expect(etiketler()).toEqual(ONCE.ypPano); expect(ucretsizEtiketSayisi()).toBe(1);
    expect(ONCE.ypMusteri).toEqual(ONCE.ypStok);
    expect(ONCE.ypBayi).toEqual(ONCE.ypStok);
  });
  it("AC-7: onay kutuları onay kutusu, açılır listeler açılır liste kalır (her paylaşılan formda sayı öncesiyle aynı)", () => {
    const say = () => ({ kutu: sonPencere().querySelectorAll('input[type="checkbox"]').length, liste: sonPencere().querySelectorAll("select").length });
    musteri(); tikla(/Yeni Servis Talebi/); expect(say()).toEqual(SAYI.servis); cleanup();
    musteri(); tikla(/Extra Kalıp Satışı/); expect(say()).toEqual(SAYI.kalip); cleanup();
    musteri(); tikla(/^Yedek Parça Satışı$/); expect(say()).toEqual(SAYI.yp);
  });
});
