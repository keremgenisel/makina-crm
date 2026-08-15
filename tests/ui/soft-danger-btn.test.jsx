// @vitest-environment jsdom
// Ortak SoftBtn/DangerBtn — modal aksiyon bölümlerinin (görüşme/dosya/timeline) tutarlı buton görünümü.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { SoftBtn, DangerBtn } from "../../src/components/ui";

describe("SoftBtn / DangerBtn", () => {
  it("SoftBtn tıklanır, disabled iken tıklanmaz", () => {
    const onClick = vi.fn();
    const { rerender } = render(<SoftBtn onClick={onClick}>Aç</SoftBtn>);
    fireEvent.click(screen.getByText("Aç"));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<SoftBtn onClick={onClick} disabled>Aç</SoftBtn>);
    fireEvent.click(screen.getByText("Aç"));
    expect(onClick).toHaveBeenCalledTimes(1); // disabled → tetiklenmez
  });

  it("DangerBtn kırmızı-tint stiliyle render olur ve tıklanır", () => {
    const onClick = vi.fn();
    render(<DangerBtn onClick={onClick} title="Sil">X</DangerBtn>);
    const btn = screen.getByTitle("Sil");
    expect(btn.style.color).toContain("red600"); // var(--red600, ...)
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalled();
  });
});
