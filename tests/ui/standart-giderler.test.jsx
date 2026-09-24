// @vitest-environment jsdom
// Spec 0001: Giderler › Standart Genel Giderler (R22, K37). Sürüm mantığı motorda (gider.test.js);
// burada ekran akışı.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { StandartGiderler } from "../../src/components/gider/StandartGiderler";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

describe("Standart Genel Giderler (R22)", () => {
  function SgHarness({ s0 = [], perms, onState }) {
    const [sg, setSg] = useState(s0);
    onState?.(sg);
    return <StandartGiderler standartGiderler={sg} setStandartGiderler={setSg} showToast={vi.fn()} canDo={perms || (() => true)} />;
  }
  it("AC-95: kalıcı açıklama satırı görünür", () => {
    render(<SgHarness />);
    expect(screen.getByText("Bu tutarlar maliyet hesabı içindir, dönem gider raporuna girmez.")).toBeTruthy();
  });
  it("AC-92 / AC-96: ekle; tutar değişince yeni sürüm, eski kendi ayında kalır; son sürüm geri alınır; sil", () => {
    let st;
    render(<SgHarness onState={s => { st = s; }} />);
    fireEvent.change(screen.getByPlaceholderText("Örn. Kira"), { target: { value: "Kira" } });
    fireEvent.change(screen.getByLabelText("Aylık tutar"), { target: { value: "20.000" } });
    fireEvent.change(screen.getByLabelText("Geçerlilik başlangıcı"), { target: { value: "2026-01" } });
    fireEvent.click(screen.getByText("Ekle"));
    expect(st).toHaveLength(1);
    fireEvent.click(screen.getByText("Tutarı değiştir"));
    fireEvent.change(screen.getByLabelText("Yeni aylık tutar"), { target: { value: "25.000" } });
    fireEvent.change(screen.getByLabelText("Yeni geçerlilik başlangıcı"), { target: { value: "2026-07" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st).toHaveLength(2);
    expect(st.find(s => s.tutar === 20000)).toMatchObject({ baslangicAy: "2026-01", bitisAy: "2026-06" });
    expect(st.find(s => s.tutar === 25000)).toMatchObject({ baslangicAy: "2026-07", bitisAy: null });
    fireEvent.click(screen.getByText("Son sürümü geri al"));
    expect(st).toHaveLength(1);
    expect(st[0].bitisAy).toBeNull();
    fireEvent.click(screen.getByTitle("Sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st).toEqual([]);
  });
  it("AC-96: yeni geçerlilik ayı açık sürümün başlangıcından önce olamaz", () => {
    let st;
    render(<SgHarness s0={[{ id: 1, grupId: 1, ad: "Kira", tutar: 20000, baslangicAy: "2026-05", bitisAy: null }]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Tutarı değiştir"));
    fireEvent.change(screen.getByLabelText("Yeni aylık tutar"), { target: { value: "25.000" } });
    fireEvent.change(screen.getByLabelText("Yeni geçerlilik başlangıcı"), { target: { value: "2026-05" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(/2026-05 sonrasında olmalı/)).toBeTruthy();
    expect(st).toHaveLength(1);
  });
  it("gider_tanim yoksa yönetim düğmeleri çizilmez", () => {
    render(<SgHarness s0={[{ id: 1, grupId: 1, ad: "Kira", tutar: 20000, baslangicAy: "2026-05" }]} perms={() => false} />);
    expect(screen.queryByText("Tutarı değiştir")).toBeNull();
    expect(screen.queryByText("Ekle")).toBeNull();
  });
});
