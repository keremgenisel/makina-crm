// @vitest-environment jsdom
// Spec 0009 AC-3 / AC-15: Evrak alıcı tipi seçicisi paylaşılan Segment'e (kip "dugme", görünüm "cerceve") taşındıktan
// sonra aynı çalışır: müşteri seçilince bayi alanları, bayi seçilince müşteri alanı temizlenir; aria-pressed korunur.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { Documents } from "../../src/components/Documents";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const DEALERS = [{ id: 3, name: "Ege Bayi", city: "İzmir", country: "Türkiye", bayiMi: true }];
const CUST = [{ id: 500, name: "Kutu Gıda", model: "AK100", serialNo: "S-1" }];
const alt = (id, type, fiyat) => ({ id, type, kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: String(fiyat), tlKarsiligi: "" });
const teklif = (o) => ({ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency: "TRY", durum: "taslak", firma: "Kutu Gıda",
  satirlar: [{ rowId: "r1", pickTip: "makina", selectedModel: "AK100", selectedKalip: "", selectedPart: "", subItems: [alt("m1", "makina", 60000)] }], ...o });

function H({ t0, onState }) {
  const [teklifler, setTeklifler] = useState([t0]);
  onState(teklifler);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={CUST} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={[]} parts={[]}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={DEALERS} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}
const ac = () => fireEvent.click(screen.getByText("2026-00001").closest("tr"));

describe("Evrak alıcı tipi seçicisi (paylaşılan Segment)", () => {
  it("AC-3: müşteri → bayi seçilince müşteri bağı temizlenir; seçili düğme aria-pressed=true", () => {
    let st;
    render(<H t0={teklif({ aliciTipi: "musteri", customerId: 500 })} onState={s => { st = s; }} />);
    ac();
    expect(screen.getByRole("group", { name: "Alıcı tipi" })).toBeTruthy();
    expect(screen.getByText("Alıcı: Müşteri").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByText("Alıcı: Bayi"));
    expect(screen.getByText("Alıcı: Bayi").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Alıcı: Müşteri").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0]).toMatchObject({ aliciTipi: "bayi", customerId: null });
  });
  it("AC-3: bayi → müşteri seçilince bayi ve nihai müşteri bağları temizlenir", () => {
    let st;
    render(<H t0={teklif({ aliciTipi: "bayi", dealerId: 3, nihaiMusteriId: 500, firma: "Ege Bayi" })} onState={s => { st = s; }} />);
    ac();
    expect(screen.getByText("Alıcı: Bayi").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByText("Alıcı: Müşteri"));
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0]).toMatchObject({ aliciTipi: "musteri", dealerId: null, nihaiMusteriId: null });
  });
});
