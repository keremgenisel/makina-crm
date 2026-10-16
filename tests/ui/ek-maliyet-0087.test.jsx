// @vitest-environment jsdom
// Spec 0087 R9: modelin ek maliyet kalemleri ({ ad, tutar }, her makina için TL, KDV hariç). Model kartında eklenir,
// düzenlenir, silinir; sırasıyla saklanır. Kalemi olmayan modelin gövdesi değişmez (AC-25).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { ModelsManager } from "../../src/components/ModelsManager";

afterEach(cleanup);

let durum;
function H({ s0, c0 = [] }) {
  const [standardModels, setStandardModels] = useState(structuredClone(s0));
  const [customModels, setCustomModels] = useState(structuredClone(c0));
  durum = { standardModels, customModels };
  return <ModelsManager standardModels={standardModels} setStandardModels={setStandardModels} customModels={customModels} setCustomModels={setCustomModels}
    showToast={vi.fn()} setCustomers={vi.fn()} setStock={vi.fn()} appSettings={{}} setAppSettings={vi.fn()} />;
}
const ac = (model) => fireEvent.click(screen.getByText(model).closest("tr").querySelector("button.btn--ghost"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kalemEkle = () => fireEvent.click(within(screen.getByTestId("ek-maliyetler")).getByRole("button", { name: /Kalem ekle/ }));
const yaz = (i, ad, tutar) => {
  fireEvent.change(screen.getByLabelText(`Ek maliyet kalemi ${i} adı`), { target: { value: ad } });
  fireEvent.change(screen.getByLabelText(`Ek maliyet kalemi ${i} tutarı`), { target: { value: tutar } });
};

describe("Spec 0087: ek maliyet kalemleri (model kartı)", () => {
  it("AC-22: kalem eklenir, düzenlenir ve silinir; yeniden açıldığında aynı ve aynı sırada", () => {
    render(<H s0={[{ model: "AK100_DS", defaultParcalar: [] }]} />);
    ac("AK100_DS");
    kalemEkle(); yaz(1, "Büküm işçiliği", "90");
    kalemEkle(); yaz(2, "Kaplama", "145,60");
    kalemEkle(); yaz(3, "Montaj", "1.234,5");
    kaydet();
    expect(durum.standardModels[0].ekMaliyetler).toEqual([{ ad: "Büküm işçiliği", tutar: 90 }, { ad: "Kaplama", tutar: 145.6 }, { ad: "Montaj", tutar: 1234.5 }]);
    ac("AK100_DS");
    expect(screen.getByLabelText("Ek maliyet kalemi 2 adı").value).toBe("Kaplama");
    expect(screen.getByLabelText("Ek maliyet kalemi 2 tutarı").value).toBe("145,6");
    fireEvent.click(screen.getByRole("button", { name: "Ek maliyet kalemi 1 sil" }));
    yaz(2, "Montaj işçiliği", "1.300");
    kaydet();
    expect(durum.standardModels[0].ekMaliyetler).toEqual([{ ad: "Kaplama", tutar: 145.6 }, { ad: "Montaj işçiliği", tutar: 1300 }]);
  });

  it("AC-22: yeni özel modelde de kalem saklanır", () => {
    render(<H s0={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Model Ekle/ }));
    fireEvent.change(screen.getByPlaceholderText("Örn: AK160_DSC"), { target: { value: "OZEL_1" } });
    kalemEkle(); yaz(1, "Taşlama", "30,50");
    kaydet();
    expect(durum.customModels[0]).toMatchObject({ model: "OZEL_1", ekMaliyetler: [{ ad: "Taşlama", tutar: 30.5 }] });
  });

  it("AC-25: kalemi olmayan modelin gövdesi değişmez; bütün kalemler silinince alan gövdeden kalkar", () => {
    const m0 = { model: "AK100_DS", sogutma: "Soğutmalı", kapasite: "100", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 2 }] };
    render(<H s0={[m0]} />);
    ac("AK100_DS"); kaydet();
    expect(durum.standardModels[0]).toEqual(m0);
    ac("AK100_DS"); kalemEkle(); yaz(1, "Büküm", "90"); kaydet();
    ac("AK100_DS"); fireEvent.click(screen.getByRole("button", { name: "Ek maliyet kalemi 1 sil" })); kaydet();
    expect(durum.standardModels[0]).toEqual(m0);
  });

  it("AC-26: adı boş ya da tutarı negatif kalem reddedilir, hata satırda, kayıt yazılmaz; boş eklenmiş satır atılır", () => {
    render(<H s0={[{ model: "AK100_DS", defaultParcalar: [] }]} />);
    ac("AK100_DS");
    kalemEkle(); yaz(1, "", "50");
    kalemEkle(); yaz(2, "Kaplama", "-1");
    kaydet();
    expect(screen.getByText("Kalem adı boş olamaz.")).toBeTruthy();
    expect(screen.getByText("Tutar negatif olamaz.")).toBeTruthy();
    expect(durum.standardModels[0]).toEqual({ model: "AK100_DS", defaultParcalar: [] });
    yaz(1, "", ""); yaz(2, "Kaplama", "40");
    kaydet();
    expect(durum.standardModels[0].ekMaliyetler).toEqual([{ ad: "Kaplama", tutar: 40 }]);
  });
});
