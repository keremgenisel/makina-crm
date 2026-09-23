// @vitest-environment jsdom
// Spec 0001: Giderler › Tedarikçiler (R13) ve Standart Genel Giderler (R22).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import { StandartGiderler } from "../../src/components/gider/StandartGiderler";
import { KalemListesi } from "../../src/components/gider/DonemRaporu";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

function TedHarness({ t0, giderler = [], tanimlar = [], onState }) {
  const [tedarikciler, setTedarikciler] = useState(t0);
  onState?.(tedarikciler);
  return <Tedarikciler tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} giderler={giderler} giderTanimlari={tanimlar} showToast={vi.fn()} />;
}
const satir = (ad) => screen.getByText(ad).closest("tr");

describe("Tedarikçiler (R13)", () => {
  it("AC-40: adı boş tedarikçi kaydedilmez, neden yazılır", () => {
    let st;
    render(<TedHarness t0={[]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Yeni Tedarikçi"));
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText("Tedarikçi adı boş olamaz.")).toBeTruthy();
    expect(st).toEqual([]);
  });
  it("AC-62: aynı ad (büyük/küçük harf farkı dahil) ikinci kez kaydedilmez", () => {
    let st;
    render(<TedHarness t0={[{ id: 1, ad: "Demir Bant San." }]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Yeni Tedarikçi"));
    fireEvent.change(screen.getByPlaceholderText("Tedarikçi adı"), { target: { value: "DEMİR BANT SAN." } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(/Bu adda bir tedarikçi zaten var/)).toBeTruthy();
    expect(st).toHaveLength(1);
  });
  it("AC-44: kullanımdaki tedarikçi (yalnız çöpteki kalemde bile) silinmez, sayı bildirilir", () => {
    let st;
    render(<TedHarness t0={[{ id: 1, ad: "Kaya Metal" }]} giderler={[{ id: 9, tedarikciId: 1, deletedAt: "x" }]} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Kaya Metal")).getByTitle("Sil"));
    expect(screen.getByText("“Kaya Metal” silinemez")).toBeTruthy();
    expect(screen.getByText(/1’i çöp kutusunda/)).toBeTruthy();
    fireEvent.click(screen.getByText("Tamam"));
    expect(st).toHaveLength(1);
  });
  it("AC-45 / R12: kullanılmayan tedarikçi kalıcı silinir", () => {
    let st;
    render(<TedHarness t0={[{ id: 1, ad: "Boş Firma" }]} onState={s => { st = s; }} />);
    fireEvent.click(within(satir("Boş Firma")).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st).toEqual([]);
  });
  it("AC-46: ad değişince bağlı kalemler yeni adla görünür (bağ kimlikle)", () => {
    const kalem = { id: 5, tarih: "2026-09-10", turId: 4, tutar: 100, kdvOrani: 20, tedarikciId: 1, aciklama: "Sac" };
    const liste = (ted) => <KalemListesi kalemler={[kalem]} giderTurleri={[{ id: 4, ad: "Hammadde", davranis: "normal" }]} tedarikciler={ted} stock={[]} customers={[]}
      standardModels={[]} customModels={[]} bugun="2026-09-23" canDo={() => true} onDuzenle={vi.fn()} onSil={vi.fn()} onOdendi={vi.fn()} />;
    const { rerender } = render(liste([{ id: 1, ad: "Eski Ad" }]));
    const govde = () => within(screen.getByTestId("kalem-listesi").querySelector("tbody"));
    expect(govde().getByText("Eski Ad")).toBeTruthy();
    rerender(liste([{ id: 1, ad: "Yeni Ad" }]));
    expect(govde().getByText("Yeni Ad")).toBeTruthy();
    expect(govde().queryByText("Eski Ad")).toBeNull();
  });
});

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
