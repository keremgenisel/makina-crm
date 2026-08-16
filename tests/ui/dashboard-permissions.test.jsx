// @vitest-environment jsdom
// Regresyon: "takipten kaldır yetkisi olmayan kullanıcı takipten kaldırdı" —
// anasayfadaki Takipten Kaldır butonu evrak_teklif_edit iznine bağlı olmalı.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { Dashboard } from "../../src/components/Dashboard";
import { fmtCur } from "../../src/lib/utils";

const eskiTarih = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
const teklifler = [
  { id: 1, type: "teklif", durum: "gonderildi", tarih: eskiTarih, firma: "Test Firma", no: "T-1" },
];
const ortak = {
  customers: [], dealers: [], services: [], stock: [], partSales: [], payments: [],
  rates: null, teklifler, teklifTakipGun: 7,
  onOpenTeklif: () => {}, onDismissTakip: () => {},
};

describe("Dashboard Takipten Kaldır yetkisi", () => {
  it("teklif düzenleme izni yokken buton görünmez", () => {
    const kisitli = { role: "user", permissions: JSON.stringify({ evrakActions: [] }) };
    render(<Dashboard {...ortak} serverPermissions={kisitli} />);
    expect(screen.getByText("Test Firma")).toBeTruthy(); // kutu render oldu
    expect(screen.queryByText("Takipten Kaldır")).toBeNull();
  });

  it("izinliyken (yerel mod) buton görünür", () => {
    render(<Dashboard {...ortak} serverPermissions={null} />);
    expect(screen.getByText("Takipten Kaldır")).toBeTruthy();
  });
});

describe("Beklenen Tahsilat — çeklerin hepsi görünür (7 gün penceresi çekleri kısıtlamaz)", () => {
  const uzakVade = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10); // 90 gün sonra (pencere dışı)
  const props = {
    ...ortak, teklifler: [],
    customers: [{ id: 1, name: "Çek Firma", currency: "TRY" }],
    payments: [{ id: 10, customerId: 1, yontem: "Çek", tahsilEdildi: false, vadeTarihi: uzakVade, tutar: 5000, currency: "TRY" }],
    tahsilatTakipGun: 7,
  };
  it("vadesi 90 gün sonra olan tahsil edilmemiş çek anasayfada görünür", () => {
    render(<Dashboard {...props} serverPermissions={null} />);
    expect(screen.getByText(/Beklenen Tahsilat/)).toBeTruthy();
    expect(screen.getByText("Çek Firma")).toBeTruthy();
  });
  it("tahsil edilmiş çek görünmez", () => {
    const odenmis = { ...props, payments: [{ ...props.payments[0], tahsilEdildi: true }] };
    render(<Dashboard {...odenmis} serverPermissions={null} />);
    expect(screen.getByText("Bekleyen tahsilat yok.")).toBeTruthy();
  });
  it("vadesi 90 gün sonra olan açık taksit de anasayfada görünür", () => {
    const taksitli = {
      ...ortak, teklifler: [], payments: [],
      customers: [{ id: 2, name: "Taksit Firma", currency: "TRY", odemePlani: [{ id: 5, vadeTarihi: uzakVade, tutar: 3000, odemeId: null }] }],
    };
    render(<Dashboard {...taksitli} serverPermissions={null} />);
    expect(screen.getByText(/Beklenen Tahsilat/)).toBeTruthy();
    expect(screen.getByText("Taksit Firma")).toBeTruthy();
  });
});

describe("Beklenen Tahsilat — bloke kredi kartı (tek çekim) anasayfada görünür", () => {
  const gelecek = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10); // hesaba geçiş ileride
  const gecmis = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);   // çoktan hesaba geçti
  const base = {
    ...ortak, teklifler: [],
    customers: [{ id: 1, name: "Kart Müşteri", currency: "TRY" }],
  };
  it("blokajı devam eden tek çekim kredi kartı ödemesi görünür", () => {
    const props = { ...base, payments: [{ id: 20, customerId: 1, yontem: "Kredi Kartı", tutar: 120000, currency: "TRY", kartKomisyonu: { blokajGun: 40, hesabaGecis: gelecek, toplamKesinti: 3000, netTutar: 117000 } }] };
    render(<Dashboard {...props} serverPermissions={null} />);
    expect(screen.getByText(/Beklenen Tahsilat/)).toBeTruthy();
    expect(screen.getByText("Kart Müşteri")).toBeTruthy();
  });
  it("hesaba geçmiş (blokaj dolmuş) kredi kartı görünmez", () => {
    const props = { ...base, payments: [{ id: 21, customerId: 1, yontem: "Kredi Kartı", tutar: 120000, currency: "TRY", kartKomisyonu: { blokajGun: 40, hesabaGecis: gecmis, toplamKesinti: 3000, netTutar: 117000 } }] };
    render(<Dashboard {...props} serverPermissions={null} />);
    expect(screen.getByText("Bekleyen tahsilat yok.")).toBeTruthy();
  });
  it("taksitli (blokaj 0) kredi kartı görünmez", () => {
    const props = { ...base, payments: [{ id: 22, customerId: 1, yontem: "Kredi Kartı", tutar: 120000, currency: "TRY", kartKomisyonu: { blokajGun: 0, hesabaGecis: gecmis, toplamKesinti: 3000, netTutar: 117000 } }] };
    render(<Dashboard {...props} serverPermissions={null} />);
    expect(screen.getByText("Bekleyen tahsilat yok.")).toBeTruthy();
  });
  it("gösterilen tutar çekilen kart (Bloke = net + komisyon), borçtan düşen p.tutar değil", () => {
    // Yansıtmalı: borçtan düşen 120.121; çekilen kart = 120.121 net + 605 komisyon = 120.726.
    const props = { ...base, payments: [{ id: 23, customerId: 1, yontem: "Kredi Kartı", tutar: 120121, currency: "TRY", kartKomisyonu: { blokajGun: 40, hesabaGecis: gelecek, toplamKesinti: 605, netTutar: 120121, yansitildi: true } }] };
    render(<Dashboard {...props} serverPermissions={null} />);
    expect(screen.getByText(fmtCur(120726, "TRY"))).toBeTruthy();   // çekilen kart tutarı (Bloke)
    expect(screen.queryByText(fmtCur(120121, "TRY"))).toBeNull();   // borçtan düşen değil
  });
});

describe("Beklenen Tahsilat — çekler tüm satış kaynaklarından + vadesiz de görünür", () => {
  const bugun = new Date().toISOString().slice(0, 10);
  it("Extra Kalıp satışındaki tahsil edilmemiş çek anasayfada görünür", () => {
    const props = {
      ...ortak, teklifler: [], payments: [], kdvRates: [{ from: "2000-01-01", rate: 20 }],
      customers: [{ id: 1, name: "Kalıp Müşteri", currency: "TRY" }],
      partSales: [{ id: 30, customerId: 1, tur: "Kalıp", ucret: 10000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, yontem: "Çek", vadeTarihi: "2027-01-01", tahsilEdildi: false }],
    };
    render(<Dashboard {...props} serverPermissions={null} />);
    expect(screen.getByText(/Beklenen Tahsilat/)).toBeTruthy();
    expect(screen.getByText("Kalıp Müşteri")).toBeTruthy();
  });
  it("vade tarihi girilmemiş çek de görünür (vade belirtilmemiş)", () => {
    const props = {
      ...ortak, teklifler: [],
      customers: [{ id: 1, name: "Vadesiz Çek Firma", currency: "TRY" }],
      payments: [{ id: 31, customerId: 1, yontem: "Çek", tutar: 5000, currency: "TRY", tahsilEdildi: false, vadeTarihi: "" }],
    };
    render(<Dashboard {...props} serverPermissions={null} />);
    expect(screen.getByText(/Beklenen Tahsilat/)).toBeTruthy();
    expect(screen.getByText("Vadesiz Çek Firma")).toBeTruthy();
    expect(screen.getByText(/vade belirtilmemiş/)).toBeTruthy();
    expect(bugun).toBeTruthy();
  });
});
