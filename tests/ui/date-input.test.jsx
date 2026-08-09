// @vitest-environment jsdom
// Native <input type="date"> KONTROLLÜ kullanıldığında Chromium/Electron, kullanıcı tarihi ELLE
// yazarken re-render'da düzenleme durumunu sıfırlıyordu → yazılan tarih "eski değerine dönüyordu".
// DateInput alanı KONTROLSÜZ tutup (defaultValue) DOM'u yalnız harici (odak dışı) value değişiminde
// senkronlar. Bu test o davranışı doğrular.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { DateInput } from "../../src/components/ui";

afterEach(cleanup);

describe("DateInput (elle yazım eski değere dönmez)", () => {
  it("başlangıç değerini gösterir", () => {
    const { container } = render(<DateInput value="2024-01-15" onChange={() => {}} />);
    expect(container.querySelector("input").value).toBe("2024-01-15");
  });

  it("değişiklikte onChange yazılan değerle çağrılır", () => {
    const onChange = vi.fn();
    const { container } = render(<DateInput value="2024-01-15" onChange={onChange} />);
    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "2026-08-22" } });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].target.value).toBe("2026-08-22");
  });

  it("ODAKTAYKEN stale value ile re-render DOM'u SIFIRLAMAZ (asıl hata)", () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<DateInput value="2024-01-15" onChange={onChange} />);
    const input = container.querySelector("input");
    input.focus();
    fireEvent.change(input, { target: { value: "2026-08-22" } });
    // Parent henüz güncellemedi gibi ESKİ value ile yeniden render — odakta olduğu için ezilmemeli.
    rerender(<DateInput value="2024-01-15" onChange={onChange} />);
    expect(input.value).toBe("2026-08-22"); // eski değere DÖNMEDİ
  });

  it("ODAK DIŞINDA harici value değişimi DOM'a yansır", () => {
    const { container, rerender } = render(<DateInput value="2024-01-15" onChange={() => {}} />);
    const input = container.querySelector("input");
    // Odak yok → harici güncelleme (ör. otomatik garanti bitişi) yansımalı
    rerender(<DateInput value="2026-01-15" onChange={() => {}} />);
    expect(input.value).toBe("2026-01-15");
  });

  it("datetime-local türünü de destekler", () => {
    const { container } = render(<DateInput type="datetime-local" value="2026-08-22T09:30" onChange={() => {}} />);
    const input = container.querySelector("input");
    expect(input.type).toBe("datetime-local");
    expect(input.value).toBe("2026-08-22T09:30");
  });
});
