// @vitest-environment jsdom
// Spec 0001: Giderler › Tedarikçiler (R13). Standart Genel Giderler standart-giderler.test.jsx içinde.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
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
