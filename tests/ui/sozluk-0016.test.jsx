// @vitest-environment jsdom
// Spec 0016 sözlük ekleri (plan G1, G4): BosDurum'un açıklama satırı isteğe bağlı; UyariSeridi'nin hata ailesi.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { BosDurum, UyariSeridi, KartBolum } from "../../src/components/tasarim";

afterEach(cleanup);

// Değişiklikten önceki çıktı (Giderler bugün hep açıklamayla çağırıyor; görünümü değişmemeli).
const ONCE = '<div style="border:1.5px dashed var(--n300, #cbd5e1);border-radius:12px;padding:32px 20px;text-align:center;background:var(--surface, #ffffff)">'
  + '<div style="font-size:16px;font-weight:800;margin-bottom:6px">Kayıt yok</div>'
  + '<div style="font-size:13px;color:var(--n600, #475569);max-width:460px;margin:0 auto;line-height:1.55">Açıklama</div></div>';

describe("BosDurum (spec 0016 G1)", () => {
  it("açıklamalı çıktı değişiklik öncesiyle birebir aynı", () => {
    expect(renderToStaticMarkup(<BosDurum baslik="Kayıt yok" metin="Açıklama" />)).toBe(ONCE);
  });
  it("açıklama yoksa açıklama satırı ve başlık alt boşluğu çizilmez", () => {
    const html = renderToStaticMarkup(<BosDurum baslik="Kayıt yok" />);
    expect(html).toBe('<div style="border:1.5px dashed var(--n300, #cbd5e1);border-radius:12px;padding:32px 20px;text-align:center;background:var(--surface, #ffffff)">'
      + '<div style="font-size:16px;font-weight:800;margin-bottom:0">Kayıt yok</div></div>');
  });
  it("AC-4: eylem verilmezse kutuda düğme yok", () => {
    render(<BosDurum baslik="Kayıt yok" testId="b" />);
    expect(screen.getByTestId("b").querySelectorAll("button").length).toBe(0);
  });
});

describe("UyariSeridi hata ailesi (spec 0016 G4)", () => {
  it("kırmızı tema değişkenleriyle çizilir, role=status taşır", () => {
    render(<UyariSeridi aile="hata" baslik="3 parça tükendi" testId="h" />);
    const s = screen.getByTestId("h");
    expect(s.getAttribute("role")).toBe("status");
    expect(s.style.background).toBe("var(--redBg, #fef2f2)");
    expect(s.style.border).toBe("1px solid var(--redBr, #fecaca)");
    expect(screen.getByText("3 parça tükendi").style.color).toBe("var(--red700, #b91c1c)");
  });
  it("serbest içerikte metin rengi ailenin 800 tonu", () => {
    render(<UyariSeridi aile="hata" testId="h2">Borç <b>var</b></UyariSeridi>);
    expect(screen.getByTestId("h2").style.color).toBe("var(--red800, #991b1b)");
  });
});

// Değişiklikten önceki "baslik" çıktısı (yeni özellikler verilmezse birebir aynı kalmalı).
const KAP = '<div style="background:var(--surface, #ffffff);border:1px solid var(--n200, #e2e8f0);border-radius:12px;padding:18px">';
describe("KartBolum kart: katlanma ve eylem yuvası (spec 0016 G10, Ek B.4)", () => {
  it("yeni özellikler verilmezse baslik çıktısı değişiklik öncesiyle aynı", () => {
    expect(renderToStaticMarkup(<KartBolum varyant="kart" baslikStili="baslik" title="T" altBaslik="A">i</KartBolum>)).toBe(
      KAP + '<div style="margin-bottom:12px"><div style="font-size:15px;font-weight:700;color:var(--n900, #0f172a)">T</div>'
      + '<div style="font-size:12px;color:var(--n500, #64748b);margin-top:2px">A</div></div>i</div>');
  });
  it("iç durumlu katlanma: defaultOpen kapalıyken içerik yok, başlığa tıklayınca açılır/kapanır", () => {
    render(<KartBolum varyant="kart" baslikStili="baslik" collapsible title="Dosyalar (2)">icerik</KartBolum>);
    expect(screen.queryByText("icerik")).toBeNull();
    fireEvent.click(screen.getByText("Dosyalar (2)")); // başlık metni kendi öğesinde (ok ayrı öğe)
    expect(screen.getByText("icerik")).toBeTruthy();
    fireEvent.click(screen.getByText("Dosyalar (2)"));
    expect(screen.queryByText("icerik")).toBeNull();
  });
  it("denetimli katlanma: acik dışarıdan gelir, tıklama onAcikDegis(yeni) çağırır", () => {
    const degis = vi.fn();
    const { rerender } = render(<KartBolum varyant="kart" baslikStili="baslik" collapsible acik={false} onAcikDegis={degis} title="G">icerik</KartBolum>);
    expect(screen.queryByText("icerik")).toBeNull();
    fireEvent.click(screen.getByText("G"));
    expect(degis).toHaveBeenCalledWith(true);
    expect(screen.queryByText("icerik")).toBeNull(); // durum dışarıda
    rerender(<KartBolum varyant="kart" baslikStili="baslik" collapsible acik onAcikDegis={degis} title="G">icerik</KartBolum>);
    expect(screen.getByText("icerik")).toBeTruthy();
  });
  it("eylemler başlık satırının sağında; tıklaması katlanmayı tetiklemez", () => {
    const ekle = vi.fn();
    render(<KartBolum varyant="kart" baslikStili="baslik" collapsible title="G" eylemler={<button onClick={ekle}>Ekle</button>}>icerik</KartBolum>);
    fireEvent.click(screen.getByText("Ekle"));
    expect(ekle).toHaveBeenCalled();
    expect(screen.queryByText("icerik")).toBeNull();
  });
  it("katlanmasız eylemli kartta içerik hep görünür", () => {
    render(<KartBolum varyant="kart" baslikStili="baslik" title="Makina Geçmişi" altBaslik="3 olay" eylemler={<button>Yazdır</button>}>olaylar</KartBolum>);
    expect(screen.getByText("olaylar")).toBeTruthy();
    expect(screen.getByText("3 olay")).toBeTruthy();
  });
});
