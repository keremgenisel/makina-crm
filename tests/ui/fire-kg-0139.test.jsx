// @vitest-environment jsdom
// Spec 0139 A: malzeme kartının "Çap bandına göre ek fire (kg)" bölümü (gerçek Settings › Katalog › Malzemeler, durumlu kap), fiyat
// penceresinin tabloya dokunmaması, fire değişikliğinin etki onayı ve parça kartının malzeme kalemi (gerçek Settings › Parça/Yedek Parça).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import * as M from "../../src/lib/malzeme";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); });

const TABLO = [{ alt: 0, kg: 0 }, { alt: 36, kg: 0.3 }];
const CUBUK = { id: 501, ad: "304 Çubuk", ozgulAgirlik: 7.9, kiloFiyati: 3, fireBantlari: TABLO, fiyatGecmisi: [{ gecerli: "", kiloFiyati: 2, paraBirimi: "TRY" }] };
const FIYATSIZ = { id: 502, ad: "Fiyatsız", ozgulAgirlik: 7.9, fireBantlari: TABLO };
const BOYLU = { id: 503, ad: "Boylu", boyFiyati: 600, geldigiBoy: 6, fireBantlari: TABLO };
const BOYLU_TABLOSUZ = { id: 504, ad: "Boylu tablosuz", boyFiyati: 600, geldigiBoy: 6 };
const mk = (malzemeId, o = {}) => ({ tur: "malzeme", malzemeId, bicim: "mil", yontem: "kilo", cap: 60, boy: 175, adet: 1, ...o });
const PARCALAR = [
  { id: 41, ad: "Kalın mil", models: [], maliyetKalemleri: [mk(501)] },
  { id: 42, ad: "Fiyatsız mil", models: [], maliyetKalemleri: [mk(502)] },
  { id: 43, ad: "Boy mil", models: [], maliyetKalemleri: [mk(503, { yontem: "boy" })] },
  { id: 44, ad: "Tablosuz boy mil", models: [], maliyetKalemleri: [mk(504, { yontem: "boy" })] },
];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(), tedarikciler: [],
};
let durum;
function Kap({ sekme = "malzemeler", m0 = [CUBUK, FIYATSIZ, BOYLU, BOYLU_TABLOSUZ] }) {
  const [malzemeler, setMalzemeler] = useState(structuredClone(m0));
  const [parts, setParts] = useState(structuredClone(PARCALAR));
  durum = { malzemeler };
  return <Settings {...BASE} initialTab={sekme} malzemeler={malzemeler.filter(m => !m.deletedAt)} setMalzemeler={setMalzemeler} rawMalzemeler={malzemeler}
    parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts} rates={null} ratesErr={false} giderYetki />;
}
const satir = (ad) => screen.getAllByTestId("malzeme-satiri").find(r => r.textContent.startsWith(ad));
const yaz = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
const malzeme = (id) => durum.malzemeler.find(m => m.id === id);
const onayKaydet = () => { const b = screen.getAllByRole("button", { name: /Kaydet/ }); fireEvent.click(b[b.length - 1]); };

describe("Spec 0139 A: malzeme kartının kilogram fire bölümü", () => {
  it("AC-48: düzenleyici yeni malzeme ve düzenleme kipinde çizilir; Fiyatı Güncelle penceresinde çizilmez", () => {
    render(<Kap />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    expect(screen.getByTestId("fire-kg-bolumu").textContent).toContain(M.FIRE_KG_BASLIK);
    expect(screen.getByTestId("fire-kg-lama-notu").textContent).toBe(M.FIRE_KG_LAMA_NOTU);
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    fireEvent.click(within(satir("304 Çubuk")).getByRole("button", { name: "304 Çubuk düzenle" }));
    expect(screen.getByLabelText("Fire bandı 2 kilogramı").value).toBe("0,3");
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    fireEvent.click(within(satir("304 Çubuk")).getByRole("button", { name: "Fiyatı Güncelle" }));
    expect(screen.queryByTestId("fire-kg-bolumu")).toBeNull();
  });
  it("AC-48: Fiyatı Güncelle penceresinin kaydı tabloya dokunmaz", () => {
    render(<Kap />);
    fireEvent.click(within(satir("304 Çubuk")).getByRole("button", { name: "Fiyatı Güncelle" }));
    yaz("Kilo fiyatı", "4");
    fireEvent.click(screen.getByRole("button", { name: "Fiyatı Kaydet" }));
    expect(malzeme(501).kiloFiyati).toBe(4);
    expect(malzeme(501).fireBantlari).toEqual(TABLO);
  });
  it("AC-44 / AC-12 (ekran): ilk bandın alt çapı serbest girilir ve kaydedilir; azalan sıra alanın altında reddedilir", () => {
    render(<Kap m0={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    yaz("Malzeme adı", "Yeni çubuk");
    fireEvent.click(screen.getByRole("button", { name: "Fire bandı ekle" }));
    fireEvent.click(screen.getByRole("button", { name: "Fire bandı ekle" }));
    expect(screen.getByLabelText("Fire bandı 1 alt çapı").disabled).toBe(false);
    yaz("Fire bandı 1 alt çapı", "21"); yaz("Fire bandı 1 kilogramı", "0,05");
    yaz("Fire bandı 2 alt çapı", "5"); yaz("Fire bandı 2 kilogramı", "0");
    kaydet();
    expect(within(screen.getByTestId("fire-kg-listesi")).getByText(M.FIRE_KG_SIRA_HATASI)).toBeTruthy();
    expect(durum.malzemeler).toHaveLength(0);
    yaz("Fire bandı 2 alt çapı", "36"); kaydet();
    expect(durum.malzemeler[0].fireBantlari).toEqual([{ alt: 21, kg: 0.05 }, { alt: 36, kg: 0 }]);
  });
  it("AC-45 (ekran): boş kilogram reddedilir", () => {
    render(<Kap m0={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    yaz("Malzeme adı", "A");
    fireEvent.click(screen.getByRole("button", { name: "Fire bandı ekle" }));
    yaz("Fire bandı 1 alt çapı", "0");
    kaydet();
    expect(within(screen.getByTestId("fire-kg-listesi")).getByText(M.FIRE_KG_HATASI)).toBeTruthy();
  });
  it("AC-47 / AC-53: yalnız adı değişen kartta tablo aynen kalır ve etki onayı gösterilmez", () => {
    render(<Kap />);
    fireEvent.click(within(satir("304 Çubuk")).getByRole("button", { name: "304 Çubuk düzenle" }));
    yaz("Malzeme adı", "304 Çubuk yeni");
    kaydet();
    expect(screen.queryByTestId("fire-etki-onayi")).toBeNull();
    expect(malzeme(501)).toMatchObject({ ad: "304 Çubuk yeni", fireBantlari: TABLO });
  });
  it("AC-53 / AC-15: tablo değişince aynı etki özeti onay olarak gösterilir; vazgeçince yazılmaz, onaylanınca yazılır, fiyat geçmişi değişmez", () => {
    render(<Kap />);
    fireEvent.click(within(satir("304 Çubuk")).getByRole("button", { name: "304 Çubuk düzenle" }));
    yaz("Fire bandı 2 kilogramı", "0,5");
    kaydet();
    const onay = screen.getByTestId("fire-etki-onayi");
    expect(onay.textContent).toContain(M.FIRE_ETKI_SORUSU);
    expect(within(onay).getByTestId("fiyat-etki-metni").textContent).toBe(M.etkiMetni({ bagli: 1, degisen: 1 }));
    expect(within(onay).getAllByTestId("fiyat-etki-satiri")).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Vazgeç" }).at(-1));
    expect(malzeme(501).fireBantlari).toEqual(TABLO);
    kaydet(); onayKaydet();
    expect(malzeme(501).fireBantlari).toEqual([{ alt: 0, kg: 0 }, { alt: 36, kg: 0.5 }]);
    expect(malzeme(501).fiyatGecmisi).toEqual(CUBUK.fiyatGecmisi);
  });
  it("AC-53: yüzde fire değişince de onay gösterilir", () => {
    render(<Kap />);
    fireEvent.click(within(satir("304 Çubuk")).getByRole("button", { name: "304 Çubuk düzenle" }));
    yaz("Varsayılan fire", "5"); kaydet();
    expect(screen.getByTestId("fire-etki-onayi")).toBeTruthy();
    onayKaydet();
    expect(malzeme(501).fire).toBe(5);
  });
});

describe("Spec 0139 A: parça kartının malzeme kalemi", () => {
  const ac = (ad) => fireEvent.click(within(screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean)).getByTitle("Düzenle"));
  it("AC-49 / A-R11: fire dahil satırı kilogram fireyi içerir; fiyatsız malzemede de girer, maliyet girilmedi kalır", () => {
    render(<Kap sekme="yedekparca" />);
    ac("Kalın mil");
    const ham = M.agirlikKg("mil", { cap: 60, boy: 175 }, 7.9);
    expect(screen.getByTestId("malzeme-fireli-kg").textContent).toBe(M.kgMetni(ham + 0.3));
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    ac("Fiyatsız mil");
    expect(screen.getByTestId("malzeme-ham-kg").textContent).toBe(M.kgMetni(ham));
    expect(screen.getByTestId("malzeme-fireli-kg").textContent).toBe(M.kgMetni(ham + 0.3));
    expect(screen.getByTestId("malzeme-maliyet").textContent).toMatch(/^girilmedi/);
  });
  // Spec 0143 ile (A-R4/2, AC-46): 0139 A-R13/2 ters çevrildi; "uygulanmadı" satırı hiç çizilmez, kilogram fire her kalemde uygulanır.
  it("AC-11 / AC-52 (spec 0143 ile): eski boy yöntemli kalemde de neden satırı yok; ağırlık ve fire dahil kilo yazar", () => {
    render(<Kap sekme="yedekparca" />);
    ac("Boy mil");
    expect(screen.queryByTestId("fire-kg-uygulanmadi")).toBeNull();
    expect(screen.getByTestId("malzeme-fireli-kg")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    ac("Tablosuz boy mil");
    expect(screen.queryByTestId("fire-kg-uygulanmadi")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    ac("Kalın mil");
    expect(screen.queryByTestId("fire-kg-uygulanmadi")).toBeNull();
  });
});
