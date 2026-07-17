// @vitest-environment jsdom
// Ayrı harita penceresinin sarmalayıcısı: IPC köprüsünden (window.haritaBridge) gelen veriyi
// salt-okunur <Harita/>'ya geçirir, canlı güncellemeleri yansıtır, temayı uygular. Bu üçü
// koparsa harita penceresi boş/eski/yanlış temada açılır.
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";

afterEach(() => {
  cleanup();
  delete window.haritaBridge;
  document.documentElement.removeAttribute("data-theme");
});

import { HaritaPencere } from "../../src/components/HaritaPencere";

const dunyaBekle = () => waitFor(() => expect(document.querySelector('[data-ad="Türkiye"]')).toBeTruthy(), { timeout: 10000 });

const kur = (ilk) => {
  let veriCb = null;
  window.haritaBridge = {
    ilkVeriAl: () => Promise.resolve(ilk),
    onVeri: (cb) => { veriCb = cb; return () => { veriCb = null; }; },
  };
  return { yayinla: (v) => act(() => veriCb?.(v)) };
};

describe("HaritaPencere", () => {
  it("mount'ta ilkVeriAl'dan gelen veriyi haritaya çizer", async () => {
    kur({ customers: [{ name: "A", country: "Türkiye", city: "Konya" }], dealers: [], factory: null, tema: "light" });
    render(<HaritaPencere />);
    await dunyaBekle();
    expect(document.querySelector('[data-ad="Türkiye"]').getAttribute("data-adet")).toBe("1");
  });

  it("canlı onVeri güncellemesini yansıtır (sayı artar)", async () => {
    const { yayinla } = kur({ customers: [{ name: "A", country: "Türkiye", city: "Konya" }], dealers: [], factory: null, tema: "light" });
    render(<HaritaPencere />);
    await dunyaBekle();
    expect(document.querySelector('[data-ad="Türkiye"]').getAttribute("data-adet")).toBe("1");
    yayinla({ customers: [
      { name: "A", country: "Türkiye", city: "Konya" },
      { name: "B", country: "Türkiye", city: "İzmir" },
    ], dealers: [], factory: null, tema: "light" });
    await waitFor(() => expect(document.querySelector('[data-ad="Türkiye"]').getAttribute("data-adet")).toBe("2"));
  });

  it("tema payload'unu uygular (data-theme)", async () => {
    const { yayinla } = kur({ customers: [], dealers: [], factory: null, tema: "dark" });
    render(<HaritaPencere />);
    await waitFor(() => expect(document.documentElement.getAttribute("data-theme")).toBe("dark"));
    // Canlı tema değişimi de gelir
    yayinla({ customers: [], dealers: [], factory: null, tema: "light" });
    await waitFor(() => expect(document.documentElement.getAttribute("data-theme")).toBe("light"));
  });

  it("köprü yoksa çökmez", async () => {
    // window.haritaBridge tanımsız (ör. tarayıcı/preview) — patlamamalı
    render(<HaritaPencere />);
    await waitFor(() => expect(document.querySelector('[data-ad="Türkiye"]')).toBeTruthy(), { timeout: 10000 });
  });
});
