// @vitest-environment jsdom
// Ayarlar > Katalog > Makina Modelleri: her model satırındaki "Analiz'de Göster" onay kutusu.
// appSettings.analizGizliModeller = GİZLENEN model adları; işaretli = gizli listede DEĞİL (gösterilir).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { ModelsManager } from "../../src/components/ModelsManager";

const std = [{ model: "AK-100" }, { model: "AK-140" }, { model: "AK-160" }];

const ac = (appSettings, setAppSettings) => render(
  <ModelsManager standardModels={std} setStandardModels={vi.fn()} customModels={[]} setCustomModels={vi.fn()}
    setCustomers={vi.fn()} setStock={vi.fn()} showToast={vi.fn()} appSettings={appSettings} setAppSettings={setAppSettings} />
);
const kutular = () => [...document.querySelectorAll('input[type="checkbox"]')];

describe("ModelsManager — Analiz'de Göster onay kutusu", () => {
  it("varsayılan (gizli liste yok): tüm modeller işaretli", () => {
    ac({}, vi.fn());
    expect(screen.getByText("Analiz")).toBeTruthy(); // yeni sütun başlığı
    const cbs = kutular();
    expect(cbs.length).toBe(3);
    expect(cbs.every(cb => cb.checked === true)).toBe(true);
  });

  it("gizli listedeki model işaretsiz, diğerleri işaretli", () => {
    ac({ analizGizliModeller: ["AK-140"] }, vi.fn());
    const cbs = kutular();
    // Satır sırası: AK-100, AK-140, AK-160
    expect(cbs[0].checked).toBe(true);
    expect(cbs[1].checked).toBe(false); // AK-140 gizli
    expect(cbs[2].checked).toBe(true);
  });

  it("işareti kaldırınca model gizli listeye eklenir", () => {
    let sonuc = null;
    const setAppSettings = vi.fn((updater) => { sonuc = updater({ analizGizliModeller: [] }); });
    ac({ analizGizliModeller: [] }, setAppSettings);
    fireEvent.click(kutular()[0]); // AK-100'ü kapat
    expect(setAppSettings).toHaveBeenCalled();
    expect(sonuc.analizGizliModeller).toEqual(["AK-100"]);
  });

  it("tekrar işaretleyince model gizli listeden çıkar", () => {
    let sonuc = null;
    const setAppSettings = vi.fn((updater) => { sonuc = updater({ analizGizliModeller: ["AK-160"] }); });
    ac({ analizGizliModeller: ["AK-160"] }, setAppSettings);
    fireEvent.click(kutular()[2]); // AK-160'ı aç
    expect(sonuc.analizGizliModeller).toEqual([]);
  });
});
