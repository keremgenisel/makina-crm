// @vitest-environment jsdom
// Regresyon: "Analiz Et"e basmadan doğrudan "Optimize Et"e basınca stats groups'suz yazılıyor,
// sonra render'da Object.entries(stats.groups) undefined ile çökerek "Cannot convert undefined
// or null to object" hatası veriyordu.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor } from "@testing-library/react";

afterEach(cleanup);
import { SettingsOptimize } from "../../src/components/settings/SettingsOptimize";

describe("SettingsOptimize — Analiz olmadan Optimize", () => {
  it("doğrudan Optimize Et'e basınca çökmez ve özet gösterilir", async () => {
    // resim düz metin (data:image değil) → recompress anında çözülür, jsdom'da Image/canvas beklemez
    render(<SettingsOptimize customModels={[{ model: "AK100", resim: "x" }]} flash={vi.fn()} />);
    fireEvent.click(screen.getByText("Optimize Et"));
    // Önceden burada render sırasında hata fırlıyordu; artık özet ("tasarruf") görünmeli.
    await waitFor(() => expect(screen.getByText(/tasarruf/)).toBeTruthy());
    expect(screen.getByText("Makina modeli:")).toBeTruthy(); // groups kırılımı da render edildi
  });
});
