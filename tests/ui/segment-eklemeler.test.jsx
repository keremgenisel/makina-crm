// @vitest-environment jsdom
// Spec 0014: segmentli seçiciye sözlük eklemeleri (sayı rozeti, sekme kipi, içerik genişliği). Varsayılan çıktı,
// değişiklikten ÖNCE bugünkü bileşenden alınıp aşağıya sabitlendi; Giderler ve Evrak alıcı tipi aynı kalmalı.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Segment } from "../../src/components/tasarim";

afterEach(cleanup);
const O = [{ value: "a", label: "Birinci" }, { value: "b", label: "İkinci" }];
const ONCE_HTML = {
  "varsayilan": "<div role=\"radiogroup\" aria-label=\"Seçim\" style=\"display: flex; gap: 2px; background: var(--n150, #f1f5f9); border: 1px solid var(--n200, #e2e8f0); border-radius: 8px; padding: 3px; flex-wrap: wrap;\"><button type=\"button\" role=\"radio\" aria-checked=\"false\" style=\"border: medium; border-radius: 6px; padding: 7px 10px; font-size: 12.5px; cursor: pointer; white-space: nowrap; background: transparent; color: var(--n500, #64748b); font-weight: 600; box-shadow: none;\">Birinci</button><button type=\"button\" role=\"radio\" aria-checked=\"true\" style=\"border: medium; border-radius: 6px; padding: 7px 10px; font-size: 12.5px; cursor: pointer; white-space: nowrap; background: var(--surface, #ffffff); color: var(--orTx, #c2410c); font-weight: 700; box-shadow: 0 1px 2px rgba(15,23,42,.12);\">İkinci</button></div>",
  "dugme": "<div role=\"group\" aria-label=\"Seçim\" style=\"display: flex; gap: 2px; background: var(--n150, #f1f5f9); border: 1px solid var(--n200, #e2e8f0); border-radius: 8px; padding: 3px; flex-wrap: wrap;\"><button type=\"button\" aria-pressed=\"false\" style=\"border: medium; border-radius: 6px; padding: 7px 10px; font-size: 12.5px; cursor: pointer; white-space: nowrap; background: transparent; color: var(--n500, #64748b); font-weight: 600; box-shadow: none;\">Birinci</button><button type=\"button\" aria-pressed=\"true\" style=\"border: medium; border-radius: 6px; padding: 7px 10px; font-size: 12.5px; cursor: pointer; white-space: nowrap; background: var(--surface, #ffffff); color: var(--orTx, #c2410c); font-weight: 700; box-shadow: 0 1px 2px rgba(15,23,42,.12);\">İkinci</button></div>",
  "cerceve": "<div role=\"group\" aria-label=\"Seçim\" style=\"display: flex; gap: 6px;\"><button type=\"button\" aria-pressed=\"false\" style=\"flex: 1 1 0%; padding: 6px 10px; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid var(--n200, #e2e8f0); background: var(--surface, #ffffff); color: var(--n900, #0f172a);\">Birinci</button><button type=\"button\" aria-pressed=\"true\" style=\"flex: 1 1 0%; padding: 6px 10px; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid var(--brand, #e85d1a); background: var(--ambBg3, #fff7ed); color: var(--n900, #0f172a);\">İkinci</button></div>",
  "devreDisi": "<div role=\"radiogroup\" aria-label=\"Seçim\" style=\"display: flex; gap: 2px; background: var(--n150, #f1f5f9); border: 1px solid var(--n200, #e2e8f0); border-radius: 8px; padding: 3px; flex-wrap: wrap;\"><button type=\"button\" disabled=\"\" role=\"radio\" aria-checked=\"false\" style=\"border: medium; border-radius: 6px; padding: 7px 10px; font-size: 12.5px; cursor: not-allowed; white-space: nowrap; background: transparent; color: var(--n500, #64748b); font-weight: 600; box-shadow: none;\">Birinci</button><button type=\"button\" disabled=\"\" role=\"radio\" aria-checked=\"true\" style=\"border: medium; border-radius: 6px; padding: 7px 10px; font-size: 12.5px; cursor: not-allowed; white-space: nowrap; background: var(--surface, #ffffff); color: var(--orTx, #c2410c); font-weight: 700; box-shadow: 0 1px 2px rgba(15,23,42,.12);\">İkinci</button></div>"
};

describe("Segment: bugünkü çıktı korunur", () => {
  const d = { varsayilan: {}, dugme: { kip: "dugme" }, cerceve: { kip: "dugme", gorunum: "cerceve" }, devreDisi: { disabled: true } };
  it.each(Object.keys(d))("R9/Z3: %s çıktısı değişiklik öncesiyle birebir aynı (varsayılan genişlik eşit)", (k) => {
    const { container } = render(<Segment options={O} value="b" onChange={() => {}} ariaLabel="Seçim" {...d[k]} />);
    expect(container.innerHTML).toBe(ONCE_HTML[k]);
  });
});

describe("Segment: sözlük eklemeleri", () => {
  it("AC-4: Sayı rozetine geçen bir süzgeç düğmesinin erişilebilir adı bugünkü metne birebir eşittir ('Borçlu Firmalar (3)')", () => {
    render(<Segment kip="dugme" genislik="icerik" ariaLabel="Süzgeç" options={[{ value: "h", label: "Hepsi", sayi: 12 }, { value: "d", label: "Borçlu Firmalar", sayi: 3 }]} value="h" onChange={() => {}} />);
    const b = screen.getByRole("button", { name: "Borçlu Firmalar (3)" });
    expect(b.textContent).toBe("Borçlu Firmalar (3)");
    expect(b.getAttribute("aria-label")).toBe("Borçlu Firmalar (3)");
    const [ac, rz, kapa] = b.querySelectorAll("span");
    expect([ac.textContent, rz.textContent, kapa.textContent]).toEqual([" (", "3", ")"]);
    expect(ac.style.clip).toMatch(/^rect\(0/); // parantezler görsel olarak gizli
    expect(kapa.style.position).toBe("absolute");
    expect(rz.style.borderRadius).toBe("999px"); // sayı görsel rozette
    expect(screen.getByRole("button", { name: "Hepsi (12)" }).querySelectorAll("span")[1].style.color).toBe("var(--orTx, #c2410c)"); // seçili rozet
    expect(rz.style.color).toBe("var(--n600, #475569)");
  });
  it("sayı verilmeyen seçenekte rozet ve gizli parça yok; 0 bir sayıdır ve gösterilir", () => {
    render(<Segment kip="dugme" options={[{ value: "a", label: "Yok" }, { value: "b", label: "Sıfır", sayi: 0 }]} value="a" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Yok" }).querySelectorAll("span").length).toBe(0);
    expect(screen.getByRole("button", { name: "Sıfır (0)" })).toBeTruthy();
  });
  it("AC-16: sekme kipi sekme listesi, sekme ve seçili sekme niteliklerini taşır; radyo grubu olarak duyurulmaz", () => {
    const onChange = vi.fn();
    render(<Segment kip="sekme" genislik="icerik" ariaLabel="Stok bölümleri" options={O} value="b" onChange={onChange} />);
    expect(screen.getByRole("tablist", { name: "Stok bölümleri" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "İkinci" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Birinci" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.queryAllByRole("radio")).toEqual([]);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByRole("tab", { name: "İkinci" }).hasAttribute("aria-pressed")).toBe(false);
    fireEvent.click(screen.getByRole("tab", { name: "Birinci" }));
    expect(onChange).toHaveBeenCalledWith("a");
  });
  it("AC-17 (bileşen): içerik genişliğinde kap içerik kadar, satır sarar; düğmeler tam genişliğe yayılmaz", () => {
    const { container } = render(<Segment kip="dugme" genislik="icerik" options={O} value="a" onChange={() => {}} />);
    const kap = container.firstChild;
    expect(kap.style.display).toBe("inline-flex");
    expect(kap.style.flexWrap).toBe("wrap");
    expect(kap.style.maxWidth).toBe("100%");
    for (const b of kap.querySelectorAll("button")) expect(b.style.flex).toBe("0 0 auto");
  });
});
