// @vitest-environment jsdom
// Spec 0006: Evrak'ta bayi alıcı (R12), nihai müşteri (R13), kalıp rolü (R3/R4, plan E1), müşteri formu ön
// doldurmasında satış yapan firma (R14), bayi adı kaskadı (R19) ve özet penceresi (R16).
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, screen, fireEvent, within } from "@testing-library/react";
import { Documents } from "../../src/components/Documents";
import { Customers } from "../../src/components/Customers";
import { SimpleDealers } from "../../src/components/SimpleDealers";
import { UretimOzeti } from "../../src/components/evrak/UretimOzeti";
import { buildPrintHtml } from "../../src/lib/printTemplates";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const DEALERS = [{ id: 3, name: "Ege Bayi", contact: "Veli Usta", phone: "0232 111", email: "ege@bayi.com", adres: "Bornova", country: "Türkiye", city: "İzmir", bayiMi: true }];
const CUST = [{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-1" }];
const alt = (id, type, fiyat) => ({ id, type, kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: String(fiyat), tlKarsiligi: "" });
const T0 = { id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency: "TRY", durum: "taslak", firma: "Eski Firma", satirlar: [
  { rowId: "r1", pickTip: "makina", selectedModel: "AK100", selectedKalip: "", selectedPart: "", subItems: [alt("m1", "makina", 60000)] },
  { rowId: "r2", pickTip: "kalip", selectedModel: "", selectedKalip: "Hamburger", selectedPart: "", subItems: [alt("k1", "kalip", 10000)] },
] };

function DocHarness({ onState }) {
  const [teklifler, setTeklifler] = useState([T0]);
  onState(teklifler);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={CUST} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={[{ ad: "Hamburger" }]} parts={[]}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={DEALERS} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}
const ac = () => { fireEvent.click(screen.getByText("2026-00001").closest("tr")); };

describe("Evrak: bayi alıcı ve nihai müşteri (R12, R13)", () => {
  it("AC-38: bayi seçilince firma bilgileri bayiden dolar, düzenlenebilir; kaydedip açınca alıcı tipi, bayi ve nihai müşteri korunur", () => {
    let st;
    render(<DocHarness onState={s => { st = s; }} />);
    ac();
    fireEvent.click(screen.getByText("Alıcı: Bayi"));
    fireEvent.change(screen.getByLabelText("Bayi ara"), { target: { value: "Ege" } });
    fireEvent.click(screen.getByText("Ege Bayi"));
    const firma = screen.getByLabelText("Firma Adı");
    expect(firma.value).toBe("Ege Bayi");
    fireEvent.change(firma, { target: { value: "Ege Bayi Ltd." } });
    expect(firma.value).toBe("Ege Bayi Ltd.");
    fireEvent.change(screen.getByLabelText("Nihai müşteri ara"), { target: { value: "Kutu" } });
    fireEvent.click(within(screen.getByTestId("bayi-alici")).getByText("Kutu Gıda"));
    expect(screen.getByTestId("nihai-musteri").textContent).toMatch(/Kutu Gıda/);
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0]).toMatchObject({ aliciTipi: "bayi", dealerId: 3, nihaiMusteriId: 500, firma: "Ege Bayi Ltd.", yetkili: "Veli Usta", tel: "0232 111", city: "İzmir", customerId: null });
    ac();
    expect(screen.getByText("Alıcı: Bayi").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("nihai-musteri").textContent).toMatch(/Kutu Gıda/);
  });
  it("AC-39: bayi alıcılı belgenin yazdırma çıktısı (şablon değişmeden) bayinin firma bilgileriyle çıkar", () => {
    const html = buildPrintHtml({ ...T0, aliciTipi: "bayi", dealerId: 3, firma: "Ege Bayi", yetkili: "Veli Usta", tel: "0232 111", adres: "Bornova", city: "İzmir", country: "Türkiye" }, { name: "Altuntaş" });
    expect(html).toContain("Ege Bayi");
    expect(html).toContain("Veli Usta");
    expect(html).toContain("Bornova");
  });
});

describe("Evrak: kayıt gerektirmeyen onaylı belge (triyaj bulgu 3, AC-27)", () => {
  it("yalnız bant kalemli teklif onaylanınca hata yok, kullanıcıya söylenir, 'CRM'e Kaydet' önerisi çıkmaz", () => {
    const showToast = vi.fn();
    const bantli = { ...T0, satirlar: [{ rowId: "b", pickTip: "", selectedModel: "", selectedKalip: "", selectedPart: "", subItems: [alt("b1", "bant", 100)] }] };
    function H() {
      const [teklifler, setTeklifler] = useState([bantli]);
      return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={CUST} partSales={[]} allModels={[]}
        factory={{ name: "Altuntaş" }} appSettings={{}} showToast={showToast} kalipDefs={[]} parts={[]} geoData={{}} loadingGeo={false} serverPermissions={null}
        dealers={DEALERS} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
    }
    render(<H />);
    ac();
    fireEvent.change(screen.getByDisplayValue("Taslak"), { target: { value: "onaylandi" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/kayıt gerektirmiyor/));
    expect(screen.queryByTestId("crm-kaydet-banner")).toBeNull();
    expect(screen.getByTestId("kayit-gerektirmiyor")).toBeTruthy();
  });
});

describe("Evrak: kalıp rolü (E1)", () => {
  it("AC-2 / AC-4 (arayüz): makinalı belgede kalıp varsayılan 'Makinayla verilir'; 'Extra Kalıp' seçilip kaydedilir", () => {
    let st;
    render(<DocHarness onState={s => { st = s; }} />);
    ac();
    const rol = screen.getByLabelText("Kalıp rolü");
    expect(rol.value).toBe("makinayla");
    fireEvent.change(rol, { target: { value: "extra" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0].satirlar.find(r => r.rowId === "r2").kalipRolu).toBe("extra");
  });
});

describe("Müşteri formu ön doldurması (R14)", () => {
  it("AC-40: bayi aracılığıyla makina satışında satış yapan firma bayinin adıyla dolu gelir, değiştirilebilir", () => {
    render(<Customers customers={[]} setCustomers={vi.fn()} dealers={DEALERS} factory={{ name: "Altuntaş" }} models={[{ model: "AK100" }]} services={[]} partSales={[]} parts={[]}
      openNewPrefill={{ name: "Son Kullanıcı", model: "AK100", satisYapan: "Ege Bayi", fromTeklifId: 900 }} onPrefillConsumed={vi.fn()} />);
    const sec = screen.getByDisplayValue("Ege Bayi");
    expect(sec.tagName).toBe("SELECT");
    fireEvent.change(sec, { target: { value: "Altuntaş" } });
    expect(sec.value).toBe("Altuntaş");
  });
});

describe("Bayi adı kaskadı (R19)", () => {
  it("AC-22: bayi adı değişince onu satış yapan firma olarak taşıyan Extra Kalıp satışları yeni adla güncellenir", () => {
    const durum = { dealers: DEALERS.map(d => ({ ...d })), partSales: [{ id: 1, tur: "Kalıp", satisFirma: "Ege Bayi", odendi: false, ucret: 100 }, { id: 2, tur: "Kalıp", satisFirma: "Altuntaş" }] };
    const set = (k) => vi.fn(u => { durum[k] = typeof u === "function" ? u(durum[k]) : u; });
    render(<SimpleDealers dealers={durum.dealers} setDealers={set("dealers")} factory={{ name: "Altuntaş" }} setFactory={vi.fn()} partSales={durum.partSales} setPartSales={set("partSales")}
      services={[]} customers={[]} setServices={vi.fn()} setCustomers={vi.fn()} showToast={vi.fn()} />);
    const satir = screen.getByText("Ege Bayi").closest("tr");
    const dugmeler = within(satir).getAllByRole("button");
    fireEvent.click(dugmeler.find(b => b.className.includes("ghost")));
    fireEvent.change(screen.getByDisplayValue("Ege Bayi"), { target: { value: "Ege Bayi A.Ş." } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(durum.partSales.map(p => p.satisFirma)).toEqual(["Ege Bayi A.Ş.", "Altuntaş"]);
  });
});

describe("Özet penceresi (R16)", () => {
  it("AC-19 / AC-34 / AC-36: üretilenler, atlananlar ve nedenleri, eksik izinler ve silinmiş kalem uyarısı", () => {
    render(<UretimOzeti onClose={vi.fn()} ozet={{ teklifNo: "2026-00001", uretilen: [{ tur: "Yedek parça satışı", ad: "Bant Motoru", not: "2 adet · makina satırından" }],
      atlananlar: [{ ad: "Özel conta", neden: "Katalogda karşılığı olmayan (serbest metin) parça" }], eksikIzinler: [{ id: "yedek_parca_add", ad: "Yedek parça satışı ekleme (Stok işlemleri)" }],
      silinmisUretilenler: ["x"], bilgi: [] }} />);
    expect(screen.getByTestId("ozet-uretilen").textContent).toMatch(/Yedek parça satışı · Bant Motoru.*makina satırından/);
    expect(screen.getByTestId("ozet-atlanan").textContent).toMatch(/Özel conta.*Katalogda karşılığı olmayan/);
    expect(screen.getByTestId("ozet-eksik-izin").textContent).toMatch(/Yedek parça satışı ekleme/);
    expect(screen.getByTestId("ozet-silinmis").textContent).toMatch(/silinmedi/);
  });
});
