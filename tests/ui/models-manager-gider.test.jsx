// @vitest-environment jsdom
// Spec 0001: Makina Modelleri gider zinciri (R21, K35). Model bağı adla tutulur; yeniden adlandırma
// kalem ve tanım satırlarını taşır (AC-83), silme onayı bağlı gider sayısını söyler (AC-84).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { ModelsManager } from "../../src/components/ModelsManager";

afterEach(cleanup);

describe("Makina Modelleri: gider zinciri (R21, K35)", () => {
  const std = [{ model: "AK-100" }];
  it("AC-84: özel model silme onayında bağlı gider sayısı görünür", () => {
    render(<ModelsManager standardModels={std} setStandardModels={vi.fn()} customModels={[{ model: "AK150_X" }]} setCustomModels={vi.fn()}
      setCustomers={vi.fn()} setStock={vi.fn()} showToast={vi.fn()} appSettings={{}} setAppSettings={vi.fn()}
      giderler={[{ id: 1, modelSatirlari: [{ modelAd: "AK150_X", birimMaliyet: 1, adet: 1 }] }]} giderTanimlari={[{ id: 2, modelSatirlari: [{ modelAd: "AK150_X" }] }]} />);
    const satirEl = screen.getByText("AK150_X").closest("tr");
    fireEvent.click(satirEl.querySelector("button.btn--danger"));
    expect(screen.getByText(/1 gider kalemi ve 1 tekrarlayan tanım var/)).toBeTruthy();
  });
  function ModHarness({ g0, t0, onState }) {
    const [customModels, setCustomModels] = useState([{ model: "AK150_X" }]);
    const [giderler, setGiderler] = useState(g0);
    const [giderTanimlari, setGiderTanimlari] = useState(t0);
    onState?.({ customModels, giderler, giderTanimlari });
    return <ModelsManager standardModels={std} setStandardModels={vi.fn()} customModels={customModels} setCustomModels={setCustomModels}
      setCustomers={vi.fn()} setStock={vi.fn()} showToast={vi.fn()} appSettings={{}} setAppSettings={vi.fn()}
      giderler={giderler} setGiderler={setGiderler} giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} />;
  }
  it("AC-83 (arayüz): model yeniden adlandırılınca kalem ve tanım satırları yeni adı taşır, başka modeller dokunulmaz", () => {
    let st;
    render(<ModHarness
      g0={[{ id: 1, modelSatirlari: [{ modelAd: "AK150_X", birimMaliyet: 10, adet: 2 }, { modelAd: "AK-100", birimMaliyet: 5, adet: 1 }] }, { id: 3, modelSatirlari: [] }]}
      t0={[{ id: 2, modelSatirlari: [{ modelAd: "AK150_X", birimMaliyet: 10, adet: 1 }] }]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("AK150_X").closest("tr").querySelector("button.btn--ghost"));
    fireEvent.change(screen.getByPlaceholderText("Örn: AK160_DSC"), { target: { value: "AK150_Y" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.customModels[0].model).toBe("AK150_Y");
    expect(st.giderler[0].modelSatirlari.map(m => m.modelAd)).toEqual(["AK150_Y", "AK-100"]);
    expect(st.giderler[0].modelSatirlari[0]).toMatchObject({ birimMaliyet: 10, adet: 2 });
    expect(st.giderTanimlari[0].modelSatirlari[0].modelAd).toBe("AK150_Y");
    expect(st.giderler[1]).toEqual({ id: 3, modelSatirlari: [] });
  });
});
