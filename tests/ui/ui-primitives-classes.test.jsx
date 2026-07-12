// @vitest-environment jsdom
// Faz 1 CSS-sınıf dönüşümü regresyon koruması: paylaşılan primitive'ler inline stil yerine
// ui.css sınıflarını üretmeli (gerçek :hover/:focus durumları oradan gelir). Ayrıca eski
// davranışı koru: Input/Select caller `style` prop'unu YOK SAYAR (aydınlık mod birebir aynı).
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { Btn, Input, Select, PasswordInput, MoneyInput, StatCard, Pagination, Warn } from "../../src/components/ui";

describe("UI primitive'leri — CSS sınıfları", () => {
  it("Btn varyant + boyut sınıflarını verir", () => {
    const { container } = render(<Btn variant="ghost" small>Tık</Btn>);
    const btn = container.querySelector("button");
    expect(btn.className).toContain("btn");
    expect(btn.className).toContain("btn--ghost");
    expect(btn.className).toContain("btn--sm");
  });

  it("Btn varsayılan primary, small yoksa --sm yok", () => {
    const { container } = render(<Btn>Kaydet</Btn>);
    const btn = container.querySelector("button");
    expect(btn.className).toContain("btn--primary");
    expect(btn.className).not.toContain("btn--sm");
  });

  it("Input .input sınıfını verir ve caller style'ı yok sayar", () => {
    const { container } = render(<Input value="" onChange={() => {}} style={{ marginTop: 99 }} />);
    const inp = container.querySelector("input");
    expect(inp.className).toBe("input");
    expect(inp.style.marginTop).toBe(""); // caller style düşürülür — eski davranış
  });

  it("Select .select sınıfını verir ve caller style'ı yok sayar", () => {
    const { container } = render(<Select value="" onChange={() => {}} style={{ marginTop: 99 }}><option value="">x</option></Select>);
    const sel = container.querySelector("select");
    expect(sel.className).toBe("select");
    expect(sel.style.marginTop).toBe("");
  });

  it("PasswordInput .input + sağ padding (göz ikonu için) verir", () => {
    const { container } = render(<PasswordInput value="" onChange={() => {}} />);
    const inp = container.querySelector("input");
    expect(inp.className).toContain("input");
    expect(inp.style.paddingRight).toBe("36px");
  });

  it("MoneyInput .input + sağa hizalı kalın stil verir", () => {
    const { container } = render(<MoneyInput value={1200} onChange={() => {}} />);
    const inp = container.querySelector("input");
    expect(inp.className).toContain("input");
    expect(inp.style.textAlign).toBe("right");
    expect(inp.style.fontWeight).toBe("600");
  });

  // ── Faz 2 ──
  it("StatCard tıklanabilirse --clickable sınıfı (CSS hover için), değilse yok", () => {
    const { container: c1 } = render(<StatCard label="X" value="1" color="#e85d1a" onClick={() => {}} />);
    expect(c1.querySelector(".stat-card").className).toContain("stat-card--clickable");
    const { container: c2 } = render(<StatCard label="Y" value="2" color="#e85d1a" />);
    expect(c2.querySelector(".stat-card").className).not.toContain("stat-card--clickable");
  });

  it("Pagination buton ve aktif sayfa sınıflarını verir", () => {
    const { container } = render(<Pagination total={50} page={2} setPage={() => {}} perPage={10} />);
    expect(container.querySelectorAll(".page-btn").length).toBe(2); // önceki + sonraki
    const active = container.querySelector(".page-num--active");
    expect(active).toBeTruthy();
    expect(active.textContent).toBe("2");
  });

  it("Warn .warn-msg sınıfını verir, boşsa render etmez", () => {
    const { container } = render(<Warn>Dikkat</Warn>);
    expect(container.querySelector(".warn-msg")).toBeTruthy();
    const { container: empty } = render(<Warn>{null}</Warn>);
    expect(empty.querySelector(".warn-msg")).toBeNull();
  });
});
