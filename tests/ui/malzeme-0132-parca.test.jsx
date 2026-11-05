// @vitest-environment jsdom
// Spec 0132: parça kartının malzeme satırı (gerçek Settings › Katalog › Parça/Yedek Parça, durumlu kap). Kaynak seçimi ve pasiflik,
// biçimin ölçüleri, canlı ağırlık ve tutar, doğrulama, kayıt gövdesi (geçmiş kapısı) ve "maliyeti girilmemiş" sayacı.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import * as M from "../../src/lib/malzeme";
import { MALZEME_BOLUM_BASLIGI } from "../../src/components/MalzemeSatiriAlani";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => { cleanup(); });

const P304 = { id: 501, ad: "304 Paslanmaz", ozgulAgirlik: 7.9, kiloFiyati: 2.95, paraBirimi: "USD", kur: 50 };
const ALU = { id: 503, ad: "Alüminyum", kiloFiyati: 4.1 }; // özgül ağırlık yok
const GECMIS = [{ gecerli: "", kurus: 500 }, { gecerli: "2026-06-01", kurus: 900 }];
const PARCALAR = [
  { id: 41, ad: "Kesme mili", models: [], maliyet: 12, maliyetGecmisi: GECMIS,
    malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 } },
  { id: 42, ad: "Pul", models: [], maliyet: 5 },
  { id: 43, ad: "Alüminyum kapak", models: [], malzemeSatiri: { malzemeId: 503, bicim: "sac", kalinlik: 2, en: 100, boy: 250 } },
  { id: 44, ad: "Çıplak", models: [] },
  { id: 45, ad: "Set", models: [], setIcerigi: [{ partId: 42, miktar: 2 }], malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 10, boy: 10 } },
];
const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [],
  tedarikciler: [{ id: 12, ad: "Ana Çelik", hammadde: true }], setTedarikciler: vi.fn(),
};
let durum;
function Katalog({ p0 = PARCALAR, malzemeler = [P304, ALU], giderYetki = true }) {
  const [parts, setParts] = useState(structuredClone(p0));
  durum = { parts };
  return <Settings {...BASE} initialTab="yedekparca" parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts}
    malzemeler={malzemeler} giderYetki={giderYetki} />;
}
const duzenle = (ad) => {
  const satir = screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
  fireEvent.click(within(satir).getByTitle("Düzenle"));
};
const yaz = (ad, v) => fireEvent.change(screen.getByLabelText(ad), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);

describe("Spec 0132: parça kartının malzeme satırı", () => {
  it("AC-28 / R9/2: malzeme satırı doluyken elle maliyet ve hammadde kırılımı pasif; kaynak ve neden kartta", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    expect(screen.getByLabelText("Alış maliyeti").disabled).toBe(true);
    expect(screen.getByTestId("maliyet-kaynagi").textContent).toBe(M.KAYNAK_MALZEME);
    expect(screen.getByText(M.MALZEME_ELLE_IPUCU)).toBeTruthy();
    const kirilim = screen.getByText("Hammadde tedarikçileri").closest("fieldset");
    expect(kirilim.disabled).toBe(true);
  });
  it("AC-29: biçim seçilince istediği ölçüler çizilir; boruda et kalınlığına pay alanı yok (AC-82)", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    const olculer = () => within(screen.getByTestId("malzeme-olculer")).getAllByRole("textbox").map(e => e.getAttribute("aria-label"));
    expect(olculer()).toEqual(["Çap", "Çap işleme payı", "Boy", "Boy işleme payı"]);
    fireEvent.change(screen.getByLabelText("Biçim"), { target: { value: "lama" } });
    expect(olculer()).toEqual(["Kalınlık", "Kalınlık işleme payı", "Genişlik", "Genişlik işleme payı", "Boy", "Boy işleme payı"]);
    fireEvent.change(screen.getByLabelText("Biçim"), { target: { value: "boru" } });
    expect(olculer()).toEqual(["Çap", "Çap işleme payı", "Et kalınlığı", "Boy", "Boy işleme payı"]);
    fireEvent.change(screen.getByLabelText("Biçim"), { target: { value: "sac" } });
    expect(olculer()).toEqual(["Kalınlık", "Kalınlık işleme payı", "En", "En işleme payı", "Boy", "Boy işleme payı"]);
  });
  it("AC-30–AC-38 (ekran): canlı ağırlık üç ondalıkla, maliyet 1.701,12 ₺; ölçü değişince anında güncellenir", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    expect(screen.getByTestId("malzeme-ham-kg").textContent).toBe("10,679 kg");
    expect(screen.getByTestId("malzeme-fireli-kg").textContent).toBe("11,533 kg");
    expect(screen.getByTestId("malzeme-maliyet").textContent).toBe("1.701,12 ₺");
    yaz("Çap işleme payı", ""); yaz("Boy işleme payı", ""); yaz("Parça firesi", "");
    expect(screen.getByTestId("malzeme-ham-kg").textContent).toBe("9,486 kg");
  });
  it("AC-41 (ekran): kilo yönteminde özgül ağırlığı boş malzeme: maliyet girilmedi ve nedeni", () => {
    render(<Katalog />);
    duzenle("Alüminyum kapak");
    expect(screen.getByTestId("malzeme-maliyet").textContent).toContain("girilmedi");
    expect(screen.getByTestId("malzeme-maliyet").textContent).toContain(M.EKSIK_OZGUL);
  });
  it("AC-45 / AC-46 / AC-84: eksik ölçü kaydedilir; sıfır ölçü ve aralık dışı fire reddedilir, nedeni alanda", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    yaz("Çap", "0"); yaz("Parça firesi", "150"); kaydet();
    expect(screen.getByText(M.OLCU_HATASI)).toBeTruthy();
    expect(screen.getByText(M.FIRE_HATASI)).toBeTruthy();
    expect(kayit(41).malzemeSatiri.cap).toBe(140);
    yaz("Çap", ""); yaz("Parça firesi", "8"); kaydet();
    expect(kayit(41).malzemeSatiri).not.toHaveProperty("cap");
    expect(kayit(41).malzemeSatiri.boy).toBe(78);
  });
  it("AC-63 / AC-65 / Karar 33: malzeme kaynaklı parça kaydında geçmişe satır yazılmaz, saklı geçmiş ve elle değer durur; kaynak alanı saklanmaz", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    yaz("Boy", "90"); kaydet();
    const k = kayit(41);
    expect(k.malzemeSatiri.boy).toBe(90);
    expect(k.maliyetGecmisi).toEqual(GECMIS);
    expect(k.maliyet).toBe(12);
    expect(Object.keys(k)).not.toContain("maliyetKaynagi");
    // Malzeme kaynaklı parçada geçerlilik tarihi ve parçanın geçmiş listesi çizilmez (R16/3).
    duzenle("Kesme mili");
    expect(screen.queryByLabelText("Geçerlilik tarihi")).toBeNull();
    expect(screen.queryByTestId("maliyet-gecmisi")).toBeNull();
  });
  it("AC-66: set içeriği dolu parçada malzeme satırı pasif ve nedeni kartta", () => {
    render(<Katalog />);
    duzenle("Set");
    expect(screen.getByTestId("malzeme-satiri-bolumu").disabled).toBe(true);
    expect(screen.getByTestId("malzeme-set-pasif").textContent).toBe(M.MALZEME_SET_IPUCU);
  });
  it("AC-28 (yeni parça): malzeme seçilip ölçü girilerek kaydedilir; malzeme kaldırılınca satır kayıttan düşer", () => {
    render(<Katalog />);
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    expect(screen.getByText(MALZEME_BOLUM_BASLIGI)).toBeTruthy();
    yaz("Yedek Parça Adı (TR)", "Yeni mil");
    fireEvent.change(screen.getByLabelText("Malzeme"), { target: { value: "501" } });
    yaz("Çap", "50"); yaz("Boy", "100"); kaydet();
    const y = durum.parts.find(p => p.ad === "Yeni mil");
    expect(y.malzemeSatiri).toEqual({ malzemeId: 501, bicim: "mil", cap: 50, boy: 100 });
    expect(y).not.toHaveProperty("maliyetGecmisi");
    duzenle("Yeni mil");
    fireEvent.change(screen.getByLabelText("Malzeme"), { target: { value: "" } });
    kaydet();
    expect(durum.parts.find(p => p.ad === "Yeni mil")).not.toHaveProperty("malzemeSatiri");
  });
  // Triyaj (bulgu 6, Karar 45): satır kaldırılınca geçmişe "o güne kadar malzeme maliyeti" yazılır; kapanmış partiler değişmez.
  it("Bulgu 6: malzeme satırı kaldırılınca geçmişe malzemenin maliyeti yazılır, yeni elle değer seçilen tarihten geçerli", () => {
    render(<Katalog p0={[{ id: 46, ad: "Geçiş mili", models: [], maliyet: 10, malzemeSatiri: { malzemeId: 501, bicim: "mil", cap: 140, boy: 78, payCap: 4, payBoy: 5, fire: 8 } }]} />);
    duzenle("Geçiş mili");
    fireEvent.change(screen.getByLabelText("Malzeme"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Geçerlilik tarihi"), { target: { value: "2026-10-01" } });
    kaydet();
    const k = kayit(46);
    expect(k).not.toHaveProperty("malzemeSatiri");
    expect(k.maliyetGecmisi).toEqual([{ gecerli: "", kurus: 170112 }, { gecerli: "2026-10-01", kurus: 1000 }]);
  });
  it("AC-61: dokunulmamış malzemesiz parça kaydedilince gövdesi aynı kalır", () => {
    render(<Katalog />);
    duzenle("Pul");
    kaydet();
    const { maliyetGecmisi: _g, ...k } = kayit(42);
    expect(k).toEqual({ id: 42, ad: "Pul", models: [], maliyet: 5 });
  });
  it("AC-85 / AC-53 (ekran): maliyetsiz sayacı malzemesi tam parçayı saymaz, eksik malzemeli parçayı sayar", () => {
    render(<Katalog />);
    // Çıplak (girilmedi) + Alüminyum kapak (eksik malzeme); Kesme mili, Pul ve Set sayılmaz.
    expect(screen.getByTestId("maliyetsiz-parca").textContent).toMatch(/^2 parçanın/);
    expect(screen.getAllByTestId("parca-maliyet-malzeme")).toHaveLength(2);
  });
  it("R20/2 / AC-76: gider yetkisi olmayan kullanıcı malzeme satırını görür ve yazar", () => {
    render(<Katalog giderYetki={false} />);
    duzenle("Kesme mili");
    expect(screen.getByTestId("malzeme-satiri-bolumu").disabled).toBe(false);
    yaz("Çap", "150"); kaydet();
    expect(kayit(41).malzemeSatiri.cap).toBe(150);
  });
  it("Çöpteki malzemeye bağlı parça: seçicide adı ibareyle, maliyet girilmedi (AC-43 ekran)", () => {
    function K() {
      const [parts, setParts] = useState(structuredClone(PARCALAR));
      return <Settings {...BASE} initialTab="yedekparca" parts={parts} setParts={setParts} rawParts={parts} malzemeler={[ALU]} rawMalzemeler={[{ ...P304, deletedAt: "2026-10-01" }, ALU]} giderYetki />;
    }
    render(<K />);
    duzenle("Kesme mili");
    expect(screen.getByLabelText("Malzeme").selectedOptions[0].textContent).toBe("304 Paslanmaz (silinmiş malzeme)");
    expect(screen.getByTestId("malzeme-maliyet").textContent).toContain("girilmedi");
  });
});
