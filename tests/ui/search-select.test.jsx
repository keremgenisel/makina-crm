// @vitest-environment jsdom
// SearchSelect: uzun listede baştan yalnızca initialLimit kadar seçenek göster, gerisi aramayla bulunsun.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { SearchSelect } from "../../src/components/ui";

const options = Array.from({ length: 25 }, (_, i) => ({ value: String(i + 1), label: `Parça ${i + 1}` }));

describe("SearchSelect — initialLimit + arama", () => {
  it("açılınca yalnızca ilk 10 seçeneği ve '+15 sonuç daha' ipucunu gösterir", () => {
    render(<SearchSelect value="" onChange={vi.fn()} options={options} placeholder="Parça seçin..." initialLimit={10} />);
    fireEvent.click(screen.getByText("Parça seçin..."));
    expect(screen.getByText("Parça 10")).toBeTruthy();
    expect(screen.queryByText("Parça 11")).toBeNull(); // limitin ötesi gizli
    expect(screen.getByText("+15 sonuç daha — aramak için yazın")).toBeTruthy();
  });

  it("arama tüm seçeneklerde filtreler (limitin ötesindekiler dahil)", () => {
    render(<SearchSelect value="" onChange={vi.fn()} options={options} placeholder="Parça seçin..." initialLimit={10} />);
    fireEvent.click(screen.getByText("Parça seçin..."));
    fireEvent.change(screen.getByPlaceholderText("Ara..."), { target: { value: "Parça 20" } });
    expect(screen.getByText("Parça 20")).toBeTruthy(); // 20 > 10 olduğu halde aramayla bulunur
    expect(screen.queryByText(/sonuç daha/)).toBeNull(); // arama varken ipucu yok
  });

  it("seçenek tıklanınca onChange değeriyle çağrılır", () => {
    const onChange = vi.fn();
    render(<SearchSelect value="" onChange={onChange} options={options} placeholder="Parça seçin..." initialLimit={10} />);
    fireEvent.click(screen.getByText("Parça seçin..."));
    fireEvent.click(screen.getByText("Parça 3"));
    expect(onChange).toHaveBeenCalledWith("3");
  });
});
