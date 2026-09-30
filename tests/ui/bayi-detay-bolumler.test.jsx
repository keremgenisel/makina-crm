// @vitest-environment jsdom
// Spec 0016 AC-10 (plan §5): bayi detayındaki servis, yedek parça ve Extra Kalıp bölümleri. Dönüşümden ÖNCE bugünkü koda
// yazıldı ve yeşildi; sonra da aynı kalmalı: başlıklar ve sayılar, olay sırası, beşlik sayfa, arama ve boş durum metni.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SimpleDealers } from "../../src/components/SimpleDealers";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const CUST = Array.from({ length: 6 }, (_, k) => ({ id: 10 + k, name: `Müşteri ${k + 1}`, model: "AK100", serialNo: `S-${k + 1}` }));
const SVC = CUST.map((c, k) => ({ id: 100 + k, customerId: c.id, date: `2026-0${k + 1}-10`, type: "Periyodik Bakım", islemFirma: "Ege Servis" }));
const YP = [{ id: 300, aliciTipi: "bayi", dealerId: 3, partId: 7, miktar: 2, birimFiyat: 10, currency: "TRY", tarih: "2026-05-01", faturaTipi: "Faturasız Yurtiçi", odendi: true, tahsisler: [] }];
const KALIP = [{ id: 400, tur: "Kalıp", customerId: 10, ad: "Köfte Kalıbı", ucret: 1000, currency: "TRY", tarih: "2026-04-01", faturaTipi: "Faturasız Yurtiçi", odendi: true, satisFirma: "Ege Servis" }];
const D = [
  { id: 3, name: "Ege Servis", bayiMi: true, anlasmaliServisMi: true },
  { id: 4, name: "Boş Servis", bayiMi: false, anlasmaliServisMi: true },
];
const ciz = (id) => render(<SimpleDealers dealers={D} setDealers={vi.fn()} factory={{ name: "Altuntaş" }} setFactory={vi.fn()}
  partSales={KALIP} services={SVC} customers={CUST} showToast={vi.fn()} openDetailId={id} yedekParcaSatislar={YP} parts={[{ id: 7, ad: "Rulman" }]} />);
const sira = (adlar) => adlar.filter(a => screen.queryAllByText(a).length).sort((a, b) =>
  screen.getAllByText(a)[0].compareDocumentPosition(screen.getAllByText(b)[0]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
const ADLAR = CUST.map(c => c.name);

describe("Bayi detayı bölümleri", () => {
  it("AC-10: başlıklar sayılarıyla aynı; servisler yeniden eskiye, beşlik sayfa", () => {
    ciz(3);
    expect(screen.getByText(/Servis Geçmişi \(6\)/)).toBeTruthy();
    expect(screen.getByText(/Yedek Parça Geçmişi \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Sattığı Extra Kalıplar \(1\)/)).toBeTruthy();
    // İlk sayfa: en yeni beş servis (Müşteri 6 … Müşteri 2); Müşteri 1 ikinci sayfada.
    expect(sira(ADLAR.slice(1))).toEqual(["Müşteri 6", "Müşteri 5", "Müşteri 4", "Müşteri 3", "Müşteri 2"]);
    expect(screen.queryAllByText("Müşteri 1").filter(e => e.closest("[style*='border-left']")).length).toBe(1); // yalnız kalıp kartında
    expect(screen.queryAllByText(/Kayıt bulunamadı\./).length).toBe(0);
  });
  it("AC-10: arama hiçbir bölümde eşleşmezse üç bölüm de 'Kayıt bulunamadı.' gösterir", () => {
    ciz(3);
    fireEvent.change(screen.getByPlaceholderText("Servis, yedek parça veya kalıp ara..."), { target: { value: "zzz" } });
    expect(screen.queryAllByText(/Kayıt bulunamadı\./).length).toBe(3);
    expect(screen.getByText(/Servis Geçmişi \(6\)/)).toBeTruthy();
  });
  it("AC-10: servis kaydı olmayan anlaşmalı serviste servis bölümü 'Kayıt bulunamadı.' gösterir", () => {
    ciz(4);
    expect(screen.getByText(/Servis Geçmişi \(0\)/)).toBeTruthy();
    expect(screen.queryAllByText(/Kayıt bulunamadı\./).length).toBe(1);
  });
});
