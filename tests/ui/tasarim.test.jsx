// @vitest-environment jsdom
// Spec 0009: tasarım sözlüğünün altı yapı taşı (src/components/tasarim.jsx). Kip, varyant, rol ve kimlik davranışı.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Segment, KartBolum, BosDurum, UyariSeridi, HataMetni, Ipucu } from "../../src/components/tasarim";

afterEach(cleanup);

const SECENEK = [{ value: "a", label: "Birinci" }, { value: "b", label: "İkinci" }];

describe("Segment", () => {
  it("AC-2: varsayılan radyo kipi radiogroup + radio + aria-checked taşır, aria-pressed taşımaz", () => {
    render(<Segment ariaLabel="Seçim" options={SECENEK} value="b" onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Seçim" })).toBeTruthy();
    const [a, b] = screen.getAllByRole("radio");
    expect(a.getAttribute("aria-checked")).toBe("false");
    expect(b.getAttribute("aria-checked")).toBe("true");
    expect(b.hasAttribute("aria-pressed")).toBe(false);
  });
  it("AC-2 / AC-15: dugme kipi group + aria-pressed taşır, radio rolü taşımaz", () => {
    render(<Segment kip="dugme" gorunum="cerceve" ariaLabel="Alıcı tipi" options={SECENEK} value="a" onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Alıcı tipi" })).toBeTruthy();
    expect(screen.queryAllByRole("radio")).toEqual([]);
    expect(screen.getByText("Birinci").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("İkinci").getAttribute("aria-pressed")).toBe("false");
  });
  it("AC-1: iki görünüm varyantı; hap gri zeminli ve sarar, cerceve seçili düğmeyi marka kenarlığıyla çizer", () => {
    const { container, rerender } = render(<Segment options={SECENEK} value="a" onChange={vi.fn()} />);
    expect(container.firstChild.style.background).toBe("var(--n150, #f1f5f9)");
    expect(container.firstChild.style.flexWrap).toBe("wrap");
    expect(screen.getByText("Birinci").style.color).toBe("var(--orTx, #c2410c)");
    rerender(<Segment gorunum="cerceve" kip="dugme" options={SECENEK} value="a" onChange={vi.fn()} />);
    expect(container.firstChild.style.background).toBe("");
    expect(container.firstChild.style.flexWrap).toBe("");
    expect(screen.getByText("Birinci").style.border).toBe("1px solid var(--brand, #e85d1a)");
    expect(screen.getByText("İkinci").style.background).toBe("var(--surface, #ffffff)");
  });
  it("R3: tıklama seçilen değeri bildirir; disabled düğmeleri devre dışı bırakır", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Segment options={SECENEK} value="a" onChange={onChange} />);
    fireEvent.click(screen.getByText("İkinci"));
    expect(onChange).toHaveBeenCalledWith("b");
    rerender(<Segment options={SECENEK} value="a" onChange={onChange} disabled />);
    expect(screen.getByText("İkinci").disabled).toBe(true);
    expect(screen.getByText("İkinci").style.cursor).toBe("not-allowed");
  });
});

describe("KartBolum", () => {
  it("AC-9: varsayılan ayar varyantı Ayarlar bölümünün görünümünü taşır (gölge, 24 dolgu, 720 sınır, ikonlu başlık)", () => {
    const { container } = render(<KartBolum title="Firma Bilgileri" icon="settings"><p>içerik</p></KartBolum>);
    const kap = container.firstChild;
    expect(kap.style.boxShadow).toBe("0 1px 4px rgba(0,0,0,.08)");
    expect(kap.style.padding).toBe("24px");
    expect(kap.style.maxWidth).toBe("720px");
    expect(kap.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("içerik")).toBeTruthy();
  });
  it("AC-9: wide tam genişlik; collapsible başta kapalı, tıklanınca açılır ve dolgu değişir", () => {
    const { container } = render(<KartBolum title="Kaşe" icon="stamp" collapsible wide><p>gizli</p></KartBolum>);
    const kap = container.firstChild;
    expect(kap.style.maxWidth).toBe("100%");
    expect(kap.style.padding).toBe("18px 24px");
    expect(screen.queryByText("gizli")).toBeNull();
    fireEvent.click(screen.getByText("Kaşe"));
    expect(screen.getByText("gizli")).toBeTruthy();
    expect(kap.style.padding).toBe("24px");
  });
  it("AC-9: kart varyantı kenarlıklı, 18 dolgulu, gölgesiz; etiket başlığı gri büyük harf", () => {
    const { container } = render(<KartBolum varyant="kart" title="Alıcı Bilgileri">x</KartBolum>);
    const kap = container.firstChild;
    expect(kap.style.border).toBe("1px solid var(--n200, #e2e8f0)");
    expect(kap.style.padding).toBe("18px");
    expect(kap.style.boxShadow).toBe("");
    const baslik = screen.getByText("Alıcı Bilgileri");
    expect(baslik.style.textTransform).toBe("uppercase");
    expect(baslik.style.color).toBe("var(--n400, #94a3b8)");
    expect(kap.querySelector("svg")).toBeNull();
  });
  it("AC-19: kart varyantının baslik biçimi 15 punto başlık + gri alt satır; boşluk ve miras renk korunur; style kaba eklenir", () => {
    const { container } = render(<KartBolum varyant="kart" baslikStili="baslik" title="Satılan makinalar" altBaslik="Açıklama" baslikBosluk={10} baslikRengi="inherit" style={{ flex: "3 1 380px" }} testId="k">x</KartBolum>);
    const kap = container.firstChild;
    expect(kap.style.flex).toBe("3 1 380px");
    expect(kap.getAttribute("data-testid")).toBe("k");
    const t = screen.getByText("Satılan makinalar");
    expect(t.style.fontSize).toBe("15px");
    expect(t.style.color).toBe("");
    expect(t.parentElement.style.marginBottom).toBe("10px");
    expect(screen.getByText("Açıklama").style.color).toBe("var(--n500, #64748b)");
    cleanup();
    render(<KartBolum varyant="kart" baslikStili="baslik" title="KDV">x</KartBolum>);
    expect(screen.getByText("KDV").style.color).toBe("var(--n900, #0f172a)");
    expect(screen.getByText("KDV").parentElement.style.marginBottom).toBe("12px");
  });
});

describe("BosDurum, UyariSeridi, HataMetni, Ipucu", () => {
  it("AC-4: boş durum başlık, metin ve eylemleri çizer; kimliği çağırandan alır", () => {
    render(<BosDurum testId="gider-bos-durum" baslik="Kayıt yok" metin="Açıklama" eylemler={<button>Ekle</button>} />);
    const kutu = screen.getByTestId("gider-bos-durum");
    expect(kutu.style.border).toBe("1.5px dashed var(--n300, #cbd5e1)");
    expect(kutu.textContent).toContain("Kayıt yok");
    expect(screen.getByText("Ekle")).toBeTruthy();
  });
  it("AC-5: uyarı şeridi üç aileyi tema değişkenleriyle çizer ve role=status taşır", () => {
    const beklenen = { bilgi: ["--bluBg", "--blu700"], uyari: ["--ambBg", "--amb700"], basari: ["--grnBg", "--grn700"] };
    for (const [aile, [zemin, yazi]] of Object.entries(beklenen)) {
      render(<UyariSeridi aile={aile} baslik={`B-${aile}`} metin="M" testId={`u-${aile}`} />);
      const s = screen.getByTestId(`u-${aile}`);
      expect(s.getAttribute("role")).toBe("status");
      expect(s.style.background).toContain(zemin);
      expect(screen.getByText(`B-${aile}`).style.color).toContain(yazi);
    }
  });
  it("AC-16: tanımsız aile hata vermez, bilgi ailesiyle çizilir", () => {
    render(<><UyariSeridi aile="kirmizi" baslik="X" testId="x" /><UyariSeridi aile={undefined} baslik="Y" testId="y" /></>);
    for (const id of ["x", "y"]) expect(screen.getByTestId(id).style.background).toBe("var(--bluBg, #eff6ff)");
  });
  it("AC-6: hata metni role=alert ile gelir; boş içerikte hiç çizilmez", () => {
    const { container, rerender } = render(<HataMetni>Tutar geçersiz</HataMetni>);
    expect(screen.getByRole("alert").textContent).toBe("Tutar geçersiz");
    rerender(<HataMetni>{""}</HataMetni>);
    expect(container.innerHTML).toBe("");
  });
  it("ipucu küçük gri metin; boş içerikte çizilmez", () => {
    const { container, rerender } = render(<Ipucu>Not</Ipucu>);
    expect(screen.getByText("Not").style.color).toBe("var(--n500, #64748b)");
    rerender(<Ipucu />);
    expect(container.innerHTML).toBe("");
  });
  it("AC-17: kimlik verilmeyince hiçbir bileşen data-testid taşımaz", () => {
    const { container } = render(<>
      <Segment options={SECENEK} value="a" onChange={vi.fn()} />
      <KartBolum title="A" icon="settings">x</KartBolum>
      <KartBolum varyant="kart" title="B">y</KartBolum>
      <BosDurum baslik="C" metin="D" />
      <UyariSeridi baslik="E" />
      <HataMetni>F</HataMetni>
      <Ipucu>G</Ipucu>
    </>);
    expect(container.querySelectorAll("[data-testid]").length).toBe(0);
  });
});
