// @vitest-environment jsdom
// Regresyon: "Yeni Not + boş Kaydet yine de kaydediyor" — boş not hiç oluşturulmamalı.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { Notes } from "../../src/components/Notes";

const kur = () => {
  const setNotes = vi.fn();
  const showToast = vi.fn();
  render(<Notes notes={[]} setNotes={setNotes} showToast={showToast} />);
  fireEvent.click(screen.getByText("Yeni Not"));
  return { setNotes, showToast };
};

describe("Notlar: boş yeni not", () => {
  it("hiçbir şey yazılmadan Kaydet not oluşturmaz, uyarı verir", () => {
    const { setNotes, showToast } = kur();
    expect(screen.getByText("Yeni not (kaydedilmedi)")).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(setNotes).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Boş not"), "warn");
  });

  it("içerik yazılınca Kaydet notu oluşturur", () => {
    const { setNotes } = kur();
    fireEvent.change(screen.getByPlaceholderText(/Notunuzu yazın/), { target: { value: "Deneme notu" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(setNotes).toHaveBeenCalledTimes(1);
  });
});
