// @vitest-environment jsdom
// Spec 0001: Ayarlar > Firma Çalışanları maliyet alanları (R5, R16, K7, K20) ve çalışan silinince açık
// personel tanımının kapanması (K28); triyaj bulgu 6 (yetkisiz kullanıcıya tanım varlığı sızmaz).
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
import { CalisanManager } from "../../src/components/CalisanManager";

afterEach(cleanup);

describe("Firma Çalışanları: maliyet (R5, R16, K7, K20, K28)", () => {
  function CalHarness({ c0 = [], t0 = [], giderYetki = true, ayar = {}, onState }) {
    const [calisanlar, setCalisanlar] = useState(c0);
    const [giderTanimlari, setGiderTanimlari] = useState(t0);
    const [appSettings, setAppSettings] = useState(ayar);
    onState?.({ calisanlar, giderTanimlari, appSettings });
    return <CalisanManager calisanlar={calisanlar.filter(c => !c.deletedAt)} setCalisanlar={setCalisanlar} giderYetki={giderYetki} maliyetDuzenleyebilir={giderYetki}
      appSettings={appSettings} setAppSettings={setAppSettings} giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} />;
  }
  it("AC-52: yeni çalışanda resmi alan varsayılandan dolar, değiştirilebilir; sayı olarak saklanır", () => {
    let st;
    render(<CalHarness ayar={{ giderAyarlari: { varsayilanResmiMaliyet: 39223.13 } }} onState={s => { st = s; }} />);
    expect(screen.getByLabelText("Resmi işveren maliyeti").value).toBe("39223,13");
    fireEvent.change(screen.getByPlaceholderText("Ad Soyad"), { target: { value: "Zeynep" } });
    fireEvent.change(screen.getByLabelText("Elden ödenen"), { target: { value: "10.000" } });
    fireEvent.click(screen.getByText("Ekle"));
    expect(st.calisanlar[0]).toMatchObject({ ad: "Zeynep", resmiMaliyet: 39223.13, eldenMaliyet: 10000 });
  });
  it("AC-53: varsayılan değişince mevcut çalışanların tutarı değişmez", () => {
    let st;
    render(<CalHarness c0={[{ id: 1, ad: "Ali", resmiMaliyet: 30000 }]} ayar={{ giderAyarlari: { varsayilanResmiMaliyet: 30000 } }} onState={s => { st = s; }} />);
    fireEvent.change(screen.getByLabelText("Varsayılan resmi aylık işveren maliyeti"), { target: { value: "40.000" } });
    fireEvent.click(screen.getAllByText("Kaydet")[0]);
    expect(st.appSettings.giderAyarlari.varsayilanResmiMaliyet).toBe(40000);
    expect(st.calisanlar[0].resmiMaliyet).toBe(30000);
  });
  it("AC-55: gider yetkisi yoksa maliyet sütunları, varsayılan kutusu ve alanlar hiç çizilmez", () => {
    render(<CalHarness giderYetki={false} c0={[{ id: 1, ad: "Ali", resmiMaliyet: 30000, eldenMaliyet: 20000 }]} ayar={{ giderAyarlari: { varsayilanResmiMaliyet: 30000 } }} />);
    expect(screen.getByText("Ali")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/30\.000|20\.000|Resmi|Elden|maliyet/i);
  });
  it("AC-65: açık tanımı olan çalışan silinince bildirim çıkar, tanım son üretilen ayda kapanır", () => {
    let st;
    render(<CalHarness c0={[{ id: 1, ad: "Murat", resmiMaliyet: 30000 }]}
      t0={[{ id: 50, turId: 3, ad: "Murat", calisanId: 1, baslangicAy: "2026-01", bitisAy: null, uretilenAylar: ["2026-07", "2026-08"] }]} onState={s => { st = s; }} />);
    fireEvent.click(document.querySelector("button.btn--danger"));
    expect(screen.getByText(/açık bir tekrarlayan personel tanımı var/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Sil ve Tanımı Kapat/));
    expect(st.giderTanimlari[0]).toMatchObject({ bitisAy: "2026-08", kapatildi: true });
    expect(st.calisanlar[0].deletedAt).toBeTruthy();
  });
  it("triyaj bulgu 6: gider yetkisi yoksa onay mesajı genel kalır (tanım sızmaz), tanım yine arka planda kapanır", () => {
    let st;
    render(<CalHarness giderYetki={false} c0={[{ id: 1, ad: "Murat", resmiMaliyet: 30000 }]}
      t0={[{ id: 50, turId: 3, ad: "Murat", calisanId: 1, baslangicAy: "2026-01", bitisAy: null, uretilenAylar: ["2026-07", "2026-08"] }]} onState={s => { st = s; }} />);
    fireEvent.click(document.querySelector("button.btn--danger"));
    expect(document.body.textContent).not.toMatch(/tanım|gider/i);
    expect(screen.queryByText(/Sil ve Tanımı Kapat/)).toBeNull();
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(st.giderTanimlari[0]).toMatchObject({ bitisAy: "2026-08", kapatildi: true });
    expect(st.calisanlar[0].deletedAt).toBeTruthy();
  });
  it("açık tanımı olmayan çalışanda mesaj tanımdan söz etmez", () => {
    render(<CalHarness c0={[{ id: 1, ad: "Ayşe" }]} t0={[{ id: 51, turId: 3, calisanId: 2, baslangicAy: "2026-01", uretilenAylar: [] }]} />);
    fireEvent.click(document.querySelector("button.btn--danger"));
    expect(screen.queryByText(/açık bir tekrarlayan personel tanımı/)).toBeNull();
    expect(screen.getByText("Evet, Sil")).toBeTruthy();
  });
});
