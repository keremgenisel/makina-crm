// @vitest-environment jsdom
// Parça tipleri yönetimi: kullanıcı-tanımlı tipler + davranış bayrakları (makinaSecici/
// stokDus/raporGoster), sistem tipi kilidi, silince parçaların Standart'a taşınması.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { PartTypeManager } from "../../src/components/PartTypeManager";
import { INIT_PART_TYPES } from "../../src/lib/constants";

// setPartTypeDefs/setParts updater fonksiyonunu mevcut listeyle çalıştırıp sonucu döndürür.
const applyUpdater = (fn, cur) => (typeof fn === "function" ? fn(cur) : fn);

const withCustom = [
  ...INIT_PART_TYPES,
  { id: "tip_x", ad: "Filtre", renk: "amb", makinaSecici: false, stokDus: false, raporGoster: true, sistem: false },
];

describe("PartTypeManager", () => {
  it("yeni tip ekler; hiçbir davranış bayrağı varsayılan seçili gelmez, sistem false", () => {
    const setDefs = vi.fn();
    render(<PartTypeManager partTypeDefs={INIT_PART_TYPES} setPartTypeDefs={setDefs} parts={[]} setParts={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Filtre, Motor/), { target: { value: "Filtre" } });
    fireEvent.click(screen.getByRole("button", { name: /Ekle/ }));
    const result = applyUpdater(setDefs.mock.calls[0][0], INIT_PART_TYPES);
    const yeni = result.find(t => t.ad === "Filtre");
    expect(yeni).toBeTruthy();
    expect(yeni.sistem).toBe(false);
    expect(yeni.makinaSecici).toBe(false);
    expect(yeni.stokDus).toBe(false);
    expect(yeni.raporGoster).toBe(false);
  });

  it("aynı adlı tip iki kez eklenemez (setPartTypeDefs çağrılmaz)", () => {
    const setDefs = vi.fn();
    render(<PartTypeManager partTypeDefs={INIT_PART_TYPES} setPartTypeDefs={setDefs} parts={[]} setParts={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Filtre, Motor/), { target: { value: "Bant" } }); // sistem tipi adı
    fireEvent.click(screen.getByRole("button", { name: /Ekle/ }));
    expect(setDefs).not.toHaveBeenCalled();
  });

  it("sistem tiplerinin sil butonu yok, kullanıcı tipinin var", () => {
    render(<PartTypeManager partTypeDefs={withCustom} setPartTypeDefs={vi.fn()} parts={[]} setParts={vi.fn()} />);
    // 3 sistem tipi kilitli, yalnız 1 kullanıcı tipi silinebilir
    expect(screen.getAllByTitle("Parça tipini sil").length).toBe(1);
  });

  it("kullanıcı tipi silinince o tipteki parçalar Standart'a taşınır, tip soft-delete edilir", () => {
    const setDefs = vi.fn();
    const setParts = vi.fn();
    const parts = [{ id: 1, ad: "P1", tip: "Filtre" }, { id: 2, ad: "P2", tip: "Standart" }];
    render(<PartTypeManager partTypeDefs={withCustom} setPartTypeDefs={setDefs} parts={parts} setParts={setParts} />);
    fireEvent.click(screen.getByTitle("Parça tipini sil"));
    fireEvent.click(screen.getByRole("button", { name: /Evet, Sil/ }));
    const pResult = applyUpdater(setParts.mock.calls[0][0], parts);
    expect(pResult.find(p => p.id === 1).tip).toBe("Standart");
    expect(pResult.find(p => p.id === 2).tip).toBe("Standart");
    const dResult = applyUpdater(setDefs.mock.calls[0][0], withCustom);
    expect(dResult.find(t => t.id === "tip_x").deletedAt).toBeTruthy();
  });

  it("'Stoktan düş' yalnız 'Müşteri formunda seç' açıkken etkinleşir; ikisi birlikte eklenir", () => {
    const setDefs = vi.fn();
    render(<PartTypeManager partTypeDefs={INIT_PART_TYPES} setPartTypeDefs={setDefs} parts={[]} setParts={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Filtre, Motor/), { target: { value: "Motor" } });
    // Başlangıçta stokDus kutucuğu pasif
    expect(screen.getAllByText(/Stoktan düş/)[0].closest("button").disabled).toBe(true);
    // Müşteri formunda seç aç → stokDus etkinleşir
    fireEvent.click(screen.getAllByText(/Müşteri formunda seç/)[0]);
    expect(screen.getAllByText(/Stoktan düş/)[0].closest("button").disabled).toBe(false);
    fireEvent.click(screen.getAllByText(/Stoktan düş/)[0]);
    fireEvent.click(screen.getByRole("button", { name: /Ekle/ }));
    const motor = applyUpdater(setDefs.mock.calls[0][0], INIT_PART_TYPES).find(t => t.ad === "Motor");
    expect(motor.makinaSecici).toBe(true);
    expect(motor.stokDus).toBe(true);
  });
});
