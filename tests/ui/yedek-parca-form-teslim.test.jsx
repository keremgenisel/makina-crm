// @vitest-environment jsdom
// Teslim şekli (Fabrika Teslim / Kargo) ile "Servis ve Kargo Panosuna gönder" AYRI kararlar olmalı:
// teslim şeklini seçmek kaydı panoya DÜŞÜRMEMELİ (eski/geçmiş tarihli satışlar canlı panoyu kirletmesin).
// Eskiden iki teslim kutusu da kargoDurum'u set edip panoya düşürüyordu; bu test o coupling'in geri
// gelmediğini korur.
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { YedekParcaSatisForm } from "../../src/components/YedekParcaSatisForm";

afterEach(cleanup);

function Harness({ initial = {} }) {
  const [form, setForm] = React.useState({
    aliciTipi: "bayi", currency: "TRY",
    satirlar: [{ partId: "", miktar: "", birimFiyat: "" }],
    ...initial,
  });
  return <YedekParcaSatisForm title="Yeni Satış" form={form} setForm={setForm} onSave={() => {}} onCancel={() => {}} />;
}

describe("YedekParcaSatisForm — teslim şekli panoya düşürmez", () => {
  it("Teslim Şekli seçici (Fabrika Teslim / Kargo) her zaman görünür", () => {
    render(<Harness />);
    expect(screen.getByText("Teslim Şekli")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fabrika Teslim/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /📦 Kargo/ })).toBeTruthy();
  });

  it("teslim şeklini seçmek panoya DÜŞÜRMEZ (Pano Durumu görünmez, kutu kapalı kalır)", () => {
    render(<Harness />);
    // Başlangıçta pano kapalı.
    expect(screen.queryByText("Pano Durumu")).toBeNull();
    expect(screen.getByText(/Kapalı: yalnızca kayıt olur, panoya düşmez/)).toBeTruthy();
    // Fabrika Teslim'e geç → yine panoya düşmemeli.
    fireEvent.click(screen.getByRole("button", { name: /Fabrika Teslim/ }));
    expect(screen.queryByText("Pano Durumu")).toBeNull();
    expect(screen.getByText(/Kapalı: yalnızca kayıt olur, panoya düşmez/)).toBeTruthy();
  });

  it("ayrı 'Panoya gönder' kutusu işaretlenince pano alanları (Pano Durumu) açılır", () => {
    // fabrikaTeslim:true → Kargo'ya özel teslimatFarkli kutusu yok, tek checkbox = panoya gönder.
    render(<Harness initial={{ fabrikaTeslim: true }} />);
    expect(screen.queryByText("Pano Durumu")).toBeNull();
    const kutular = screen.getAllByRole("checkbox");
    expect(kutular).toHaveLength(1); // yalnız "Panoya gönder"
    fireEvent.click(kutular[0]);
    expect(screen.getByText("Pano Durumu")).toBeTruthy();
  });
});
