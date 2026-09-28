// @vitest-environment jsdom
// Regresyon: teklifte kalıp seçici aramalı açılır listeydi; liste satır tablosunun kabında (overflow) kırpılıyor ve satırın
// dışına taşamıyordu. Artık yedek parça ve model seçicisi gibi yerel <select>: tarayıcının açılır listesi kaba bağlı değildir.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { Documents } from "../../src/components/Documents";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const alt = (id, type, fiyat) => ({ id, type, kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: String(fiyat), tlKarsiligi: "" });
const T0 = (kalip = "") => ({ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency: "TRY", durum: "taslak", firma: "Kutu Gıda",
  satirlar: [{ rowId: "r1", pickTip: "kalip", selectedModel: "", selectedKalip: kalip, selectedPart: "", subItems: [alt("k1", "kalip", 10000)] }] });
const KALIPLAR = [{ id: 1, ad: "Hamburger" }, { id: 2, ad: "Köfte" }];

function H({ t0, onState }) {
  const [teklifler, setTeklifler] = useState([t0]);
  onState?.(teklifler);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={KALIPLAR} parts={[{ id: 7, ad: "Rulman" }]}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}
const ac = () => fireEvent.click(screen.getByText("2026-00001").closest("tr"));

describe("Evrak: kalıp seçici (satır dışına taşan liste)", () => {
  it("kalıp seçici yedek parça gibi yerel liste; seçenekler kalıp tanımları, seçim satıra yazılır", () => {
    let st;
    render(<H t0={T0()} onState={s => { st = s; }} />);
    ac();
    const sec = screen.getByLabelText("Kalıp");
    expect(sec.tagName).toBe("SELECT");
    expect([...sec.querySelectorAll("option")].map(o => o.textContent)).toEqual(["— Kalıp Seç —", "Hamburger", "Köfte"]);
    expect(screen.queryByPlaceholderText("Kalıp ara...")).toBeNull();
    fireEvent.change(sec, { target: { value: "Köfte" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0].satirlar[0].selectedKalip).toBe("Köfte");
  });
  it("tanımlarda artık olmayan eski kalıp adı kaybolmaz, seçili kalır", () => {
    render(<H t0={T0("Eski Kalıp")} />);
    ac();
    const sec = screen.getByLabelText("Kalıp");
    expect(sec.value).toBe("Eski Kalıp");
    expect([...sec.querySelectorAll("option")].map(o => o.textContent)).toContain("Eski Kalıp");
  });
});
