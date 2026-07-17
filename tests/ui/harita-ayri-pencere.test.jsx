// @vitest-environment jsdom
// "Ayrı pencerede aç" düğmesi yalnız ana penceredeki sekmede (onAyriPencere prop'u verilince)
// görünmeli; ayrı pencerenin İÇİNDE (prop yok) çıkmamalı — yoksa harita penceresinde
// "kendini ayrı pencerede aç" düğmesi olurdu.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { Harita } from "../../src/components/Harita";

describe("Harita — ayrı pencerede aç düğmesi", () => {
  it("onAyriPencere verilince düğme görünür ve tıklayınca çağrılır", () => {
    const cb = vi.fn();
    render(<Harita customers={[]} dealers={[]} factory={null} onAyriPencere={cb} />);
    const dugme = screen.getByRole("button", { name: /Ayrı pencerede aç/ });
    expect(dugme).toBeTruthy();
    fireEvent.click(dugme);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("onAyriPencere verilmeyince düğme YOK", () => {
    render(<Harita customers={[]} dealers={[]} factory={null} />);
    expect(screen.queryByRole("button", { name: /Ayrı pencerede aç/ })).toBeNull();
  });
});
