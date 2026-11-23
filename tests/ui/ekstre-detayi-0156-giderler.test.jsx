// @vitest-environment jsdom
// Spec 0156 C: ekstrenin "Kalemde göster" düğmesi gerçek Giderler'de. Düğme beş durumu birlikte yazar (görünüm, dönem kipi,
// ay, açık kalemler ve hatırlatma kipleri), kalem süzgeci kalemin metniyle dolar; süzgeç Giderler'in kendi durumunda (C6/2).
// Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import { EKSTRE_METIN as M } from "../../src/components/gider/EkstrePenceresi";
import { GIDERLER, HAREKETLER, HESAPLAR, turler, tedarikciler } from "../fixtures/0156-veri.js";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-23T10:00:00")); });

function GH() {
  const [giderler, setGiderler] = useState(GIDERLER);
  const [hesapHareketleri, setHesapHareketleri] = useState(HAREKETLER);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={turler} tedarikciler={tedarikciler} setTedarikciler={vi.fn()}
    calisanlar={[]} standardModels={[]} customModels={[]} rates={{ usd: 45, eur: 50 }} ratesErr={false}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null}
    kasaHesaplari={HESAPLAR} kasaYetki cekler={[]} setCekler={vi.fn()} payments={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const ekstreAc = () => {
  fireEvent.click(screen.getByText("Tedarikler ve Ekstre"));
  const sat = screen.getAllByRole("row").find(r => r.textContent.includes("Sistem Civata"));
  fireEvent.click(within(sat).getByText("Ekstre"));
  return screen.getByTestId("ekstre-penceresi");
};
const satirBul = (kap, islem, metin) => within(kap).getAllByTestId("ekstre-satiri").find(s => s.getAttribute("data-ad").endsWith(islem) && s.textContent.includes(metin));
const kayit = (s) => s.closest('[data-testid="ekstre-kayit"]');
const kalemSatirlari = () => within(screen.getByTestId("kalem-listesi")).getAllByRole("row").map(r => r.textContent);

describe("Spec 0156: Kalemde göster (gerçek Giderler)", () => {
  it("AC-26 / AC-39: borç satırından açık kalemler kipi ve aralık kipiyle başlansa da ekstre kapanır, Dönem Raporu kalemin ayıyla, kalem listesi süzülmüş açılır", () => {
    render(<GH />);
    fireEvent.click(screen.getByText("Tarih Aralığı"));
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    expect(screen.getByTestId("acik-kalemler-modu")).toBeTruthy();
    const kap = ekstreAc();
    fireEvent.click(within(kayit(satirBul(kap, "Borç doğdu", "Montaj"))).getByText(M.kalemdeGoster));
    expect(screen.queryByTestId("ekstre-penceresi")).toBeNull();
    expect(screen.queryByTestId("acik-kalemler-modu")).toBeNull();
    expect(screen.getByLabelText("Dönem ayı").value).toBe("2026-09");
    expect(screen.getByLabelText("Açıklama ara").value).toBe("Montaj hizmeti");
    const satirlar = kalemSatirlari().filter(t => /Montaj|cıvata|Somun|Pul/.test(t));
    expect(satirlar.length).toBe(1);
    expect(satirlar[0]).toContain("Montaj hizmeti");
  });
  it("AC-39: hatırlatma kipi açıkken başlansa da düğme onu kapatır", () => {
    render(<GH />);
    fireEvent.click(screen.getByTestId("hatirlatma-dugmesi"));
    expect(screen.getByTestId("hatirlatma-modu")).toBeTruthy();
    const kap = ekstreAc();
    fireEvent.click(within(kayit(satirBul(kap, "Borç doğdu", "Somun"))).getByText(M.kalemdeGoster));
    expect(screen.queryByTestId("hatirlatma-modu")).toBeNull();
    expect(screen.getByTestId("hatirlatma-dugmesi").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByLabelText("Açıklama ara").value).toBe("Somun");
  });
  it("AC-27: ödeme satırındaki düğme ödemenin bağlı olduğu kalemi aynı biçimde açar (kalemin gider ayı, ödemenin ayı değil)", () => {
    render(<GH />);
    const kap = ekstreAc();
    const odeme = within(kap).getAllByTestId("ekstre-satiri").find(s => s.getAttribute("data-ad") === "12/10/2026 Ödeme");
    fireEvent.click(within(kayit(odeme)).getByText(M.kalemdeGoster));
    expect(screen.getByLabelText("Dönem ayı").value).toBe("2026-09");
    expect(screen.getByLabelText("Açıklama ara").value).toBe("Pres kalıbı");
  });
  it("AC-41 (C6/2, 0125 emsali): elle Tedarikler'e gidip Dönem Raporu'na dönünce süzgeç bir kez daha dolu gelir", () => {
    render(<GH />);
    const kap = ekstreAc();
    fireEvent.click(within(kayit(satirBul(kap, "Borç doğdu", "Montaj"))).getByText(M.kalemdeGoster));
    fireEvent.click(screen.getByText("Tedarikler ve Ekstre"));
    fireEvent.click(screen.getByText("Dönem Raporu"));
    expect(screen.getByLabelText("Açıklama ara").value).toBe("Montaj hizmeti");
  });
});
