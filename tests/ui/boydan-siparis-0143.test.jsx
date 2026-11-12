// @vitest-environment jsdom
// Spec 0143 A, B, D: parça kartının malzeme kalemi (gerçek Settings › Katalog › Parça/Yedek Parça, durumlu kap), malzeme kartı ve
// "Fiyatı Güncelle" penceresi (gerçek Settings › Katalog › Malzemeler) ve sipariş penceresi.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import { FIYAT_GUNCELLE } from "../../src/components/MalzemeManager";
import * as M from "../../src/lib/malzeme";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); });

const KART = { id: 501, ad: "Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 200, fire: 5, tedarikciId: 11, fireBantlari: [{ alt: 0, kg: 0.2 }] };
const DAYAMA = { tur: "malzeme", malzemeId: 501, bicim: "mil", cap: 35, boy: 45.71, adet: 1 };
const PARCALAR = [
  { id: 50, ad: "Dayama", models: [], maliyetKalemleri: [DAYAMA] },
  { id: 51, ad: "Eski boylu", models: [], maliyetKalemleri: [{ ...DAYAMA, yontem: "boy" }] },
];
const TED = [{ id: 11, ad: "Alfa Çelik", hammadde: true }];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.58.0", setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], setTedarikciler: vi.fn(),
};
let durum;
function Katalog() {
  const [parts, setParts] = useState(structuredClone(PARCALAR));
  durum = { parts };
  return <Settings {...BASE} appSettings={{}} initialTab="yedekparca" parts={parts} setParts={setParts} rawParts={parts} malzemeler={[KART]} rawMalzemeler={[KART]} tedarikciler={TED} giderYetki />;
}
function MalzemePaneli() {
  const [m, setM] = useState([{ ...KART, boyFiyati: 1600, geldigiBoy: 6 }]);
  durum = { malzemeler: m };
  return <Settings {...BASE} appSettings={{}} initialTab="malzemeler" malzemeler={m} rawMalzemeler={m} setMalzemeler={setM} tedarikciler={TED} giderYetki />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const yaz = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
const kalem = (id) => durum.parts.find(p => p.id === id).maliyetKalemleri[0];

describe("Spec 0143: parça kartının malzeme kalemi", () => {
  it("AC-1 / AC-7 / AC-8: yöntem seçicisi yok; kutu varsayılan işaretsiz; işaretlenince çubuk boyu alanı çizilir", () => {
    render(<Katalog />); duzenle("Dayama");
    expect(screen.queryByRole("radiogroup", { name: /Maliyet yöntemi/ })).toBeNull();
    const kutu = screen.getByLabelText("Sipariş boydan verilir 1");
    expect(kutu.checked).toBe(false); expect(screen.queryByLabelText("Çubuk boyu 1")).toBeNull();
    fireEvent.click(kutu);
    expect(screen.getByLabelText("Çubuk boyu 1")).toBeTruthy();
  });
  it("AC-9: işaretli ve çubuk boyu boşken kayıt reddedilir, hata çubuk boyu alanında", () => {
    render(<Katalog />); duzenle("Dayama");
    fireEvent.click(screen.getByLabelText("Sipariş boydan verilir 1"));
    kaydet();
    expect(screen.getByText(M.CUBUK_BOYU_HATASI)).toBeTruthy();
    expect(kalem(50)).toEqual(DAYAMA);
  });
  it("AC-25 / AC-26: kaydedilen kalemde işaret ve çubuk boyu var, yontem yok", () => {
    render(<Katalog />); duzenle("Dayama");
    fireEvent.click(screen.getByLabelText("Sipariş boydan verilir 1")); yaz("Çubuk boyu 1", "400"); kaydet();
    expect(kalem(50)).toMatchObject({ boydanSiparis: true, cubukBoyu: 400 }); expect(kalem(50)).not.toHaveProperty("yontem");
  });
  it("AC-10: kutu kaldırılınca çubuk boyu kayda yazılmaz", () => {
    render(<Katalog />); duzenle("Dayama");
    fireEvent.click(screen.getByLabelText("Sipariş boydan verilir 1")); yaz("Çubuk boyu 1", "400");
    fireEvent.click(screen.getByLabelText("Sipariş boydan verilir 1")); kaydet();
    expect(kalem(50)).not.toHaveProperty("cubukBoyu"); expect(kalem(50)).not.toHaveProperty("boydanSiparis");
  });
  it("AC-43: kutu dört biçimde de çizilir", () => {
    render(<Katalog />); duzenle("Dayama");
    for (const b of ["mil", "boru", "lama", "sac"]) { yaz("Biçim 1", b); expect(screen.getByLabelText("Sipariş boydan verilir 1"), b).toBeTruthy(); }
  });
  it("AC-45: parça çubuktan uzunken engellemeyen uyarı görünür ve kayıt geçer", () => {
    render(<Katalog />); duzenle("Dayama");
    fireEvent.click(screen.getByLabelText("Sipariş boydan verilir 1")); yaz("Çubuk boyu 1", "40");
    expect(screen.getByTestId("cubuk-kisa-uyarisi").textContent).toBe(M.CUBUK_KISA_UYARISI);
    kaydet();
    expect(kalem(50)).toMatchObject({ boydanSiparis: true, cubukBoyu: 40 });
  });
  it("AC-46: fire-kg-uygulanmadi satırı hiç çizilmez; eski boy kaleminde de ağırlık ve fire dahil kilo yazar", () => {
    render(<Katalog />); duzenle("Eski boylu");
    expect(screen.queryByTestId("fire-kg-uygulanmadi")).toBeNull();
    expect(screen.getByTestId("malzeme-fireli-kg").textContent).not.toBe("—");
  });
  it("AC-65 / D-R3/5: maliyet bölümüne dokunulmadan kaydedilen parçanın kalemi yontem anahtarını korur (göç çevirsin)", () => {
    render(<Katalog />); duzenle("Eski boylu");
    fireEvent.change(screen.getByPlaceholderText("Örn: KES-001"), { target: { value: "EB-1" } }); kaydet();
    expect(durum.parts.find(p => p.id === 51).kod).toBe("EB-1");
    expect(kalem(51).yontem).toBe("boy");
  });
});

describe("Spec 0143: malzeme kartı ve fiyat penceresi", () => {
  it("AC-2 / AC-3: yeni malzeme kartında boy fiyatı ve geldiği boy alanı yok", () => {
    render(<MalzemePaneli />);
    fireEvent.click(screen.getByRole("button", { name: /Yeni Malzeme/ }));
    expect(screen.queryByLabelText("Boy fiyatı")).toBeNull(); expect(screen.queryByLabelText("Geldiği boy")).toBeNull();
  });
  it("AC-3 / D-R2: düzenleme kaydı eski kartın iki ölü alanını kayda taşımaz", () => {
    render(<MalzemePaneli />);
    fireEvent.click(screen.getByRole("button", { name: "Paslanmaz düzenle" }));
    expect(screen.queryByLabelText("Geldiği boy")).toBeNull();
    yaz("Asgari sipariş", "50"); kaydet();
    expect(durum.malzemeler[0]).not.toHaveProperty("geldigiBoy"); expect(durum.malzemeler[0]).not.toHaveProperty("boyFiyati");
  });
  it("AC-4: Fiyatı Güncelle penceresinde boy fiyatı alanı yok; kaydı ölü alanları taşımaz", () => {
    render(<MalzemePaneli />);
    fireEvent.click(screen.getByRole("button", { name: "Paslanmaz düzenle" }));
    fireEvent.click(screen.getByRole("button", { name: FIYAT_GUNCELLE }));
    expect(screen.queryByLabelText("Boy fiyatı")).toBeNull();
    expect(screen.getAllByLabelText("Kilo fiyatı").length).toBeGreaterThan(0);
  });
});

describe("Spec 0143: sipariş penceresi", () => {
  const VERI = (kalemler) => ({ parts: [{ id: 50, ad: "Dayama", maliyetKalemleri: kalemler }], partStock: [], malzemeler: [KART], tedarikciler: TED, hamTedarikciler: TED,
    standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "50", miktar: 1 }] }], customModels: [], uretimPartileri: [{ id: 1, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100: 70 } }],
    appSettings: {}, factory: { name: "Altuntaş" } });
  const kesitSatiri = () => screen.getByTestId("siparis-kesit-satiri");
  const hucre = (r) => [...r.querySelectorAll("td")].map(td => td.textContent);
  it("AC-21 / AC-23 / AC-63: işaretli satırın miktarı N boy; net ve fire kilosu yazar; kesit metninde çubuk boyu", () => {
    render(<SiparisPenceresi veri={VERI([{ ...DAYAMA, boydanSiparis: true, cubukBoyu: 400 }])} bugun="2026-11-12" onClose={vi.fn()} />);
    const h = hucre(kesitSatiri());
    expect(h[0]).toContain("Ø35 · 400 mm çubuk");
    expect(within(kesitSatiri()).getByTestId("siparis-kesit-oneri").textContent).toBe("8 boy");
    expect(within(kesitSatiri()).getByTestId("siparis-boy").textContent).toBe("8 boy");
    expect(h[1]).toMatch(/kg$/); expect(h[2]).toMatch(/kg$/); expect(h[1]).not.toBe("—");
  });
  it("AC-22: düzenleme alanına girilen değer boy sayısıdır", () => {
    render(<SiparisPenceresi veri={VERI([{ ...DAYAMA, boydanSiparis: true, cubukBoyu: 400 }])} bugun="2026-11-12" onClose={vi.fn()} />);
    const alan = within(kesitSatiri()).getByRole("textbox");
    expect(alan.value).toBe("8");
    fireEvent.change(alan, { target: { value: "10" } });
    expect(within(kesitSatiri()).getByTestId("siparis-boy").textContent).toBe("10 boy");
    fireEvent.change(alan, { target: { value: "8,5" } });
    expect(kesitSatiri().textContent).toMatch(/Boy adedi 0 ile 1\.000\.000 arasında tam sayı olmalı/);
  });
  it("AC-19 (ekran): işaretsiz satırın miktarı kilogram, boy hücresi boş", () => {
    render(<SiparisPenceresi veri={VERI([DAYAMA])} bugun="2026-11-12" onClose={vi.fn()} />);
    expect(within(kesitSatiri()).getByTestId("siparis-kesit-oneri").textContent).toMatch(/kg$/);
    expect(within(kesitSatiri()).getByTestId("siparis-boy").textContent).toBe("—");
  });
});
