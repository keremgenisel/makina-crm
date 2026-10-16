// @vitest-environment jsdom
// Spec 0087: Ayarlar › Katalog'da parça maliyeti ve ürün ağacı adetleri. Gerçek Settings bileşeni, App gibi bağlanır:
// panellere çöpü süzülmüş diziler, setter'lara tam diziler (CLAUDE.md "live array" kuralı). Adetin tek kaynağı model kitidir.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { KalipManager } from "../../src/components/KalipManager";
import { CalisanManager } from "../../src/components/CalisanManager";

afterEach(() => { cleanup(); delete window.crmLocks; });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.46.0", appSettings: {}, setAppSettings: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
};
const STD = [{ model: "AK100_DS", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 2 }] }, { model: "AK120_DS", defaultParcalar: [] }];
const OZEL = [{ model: "OZEL_1", defaultParcalar: [] }, { model: "COP_1", deletedAt: "2026-10-01T00:00:00.000Z", defaultParcalar: [{ partId: "7", ad: "Rulman", miktar: 9 }] }];
const PARCALAR = [
  { id: 7, ad: "Rulman", models: ["AK100_DS", "COP_1"], fiyatTRY: 450, maliyet: 120.5 },
  { id: 8, ad: "Kayış", models: [], fiyatTRY: 90 },
  { id: 9, ad: "Silinen", models: [], deletedAt: "2026-10-02T00:00:00.000Z" },
];
const canli = (a) => a.filter(x => !x.deletedAt);

let durum;
function Katalog({ tab = "yedekparca", p0 = PARCALAR, s0 = STD, c0 = OZEL, ek = {} }) {
  const [parts, setParts] = useState(structuredClone(p0));
  const [standardModels, setStandardModels] = useState(structuredClone(s0));
  const [customModels, setCustomModels] = useState(structuredClone(c0));
  durum = { parts, standardModels, customModels };
  return <Settings {...BASE} initialTab={tab} parts={canli(parts)} setParts={setParts} standardModels={standardModels} setStandardModels={setStandardModels}
    customModels={canli(customModels)} setCustomModels={setCustomModels} rawParts={parts} rawCustomModels={customModels} {...ek} />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(satir(ad).querySelector("button.btn--ghost"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kit = (dizi, model) => dizi.find(m => m.model === model).defaultParcalar;
const panel = (ad) => fireEvent.click(screen.getByRole("button", { name: ad }));

describe("Spec 0087: parça maliyeti (ekran)", () => {
  it("AC-1: maliyet kaydedilip yeniden açıldığında kuruşuyla aynı görünür", () => {
    render(<Katalog />);
    duzenle("Kayış");
    fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "145,6" } });
    kaydet();
    expect(durum.parts.find(p => p.id === 8).maliyet).toBe(145.6);
    duzenle("Kayış");
    expect(screen.getByLabelText("Alış maliyeti").value).toBe("145,6");
  });

  it("AC-4: boş bırakılan maliyet kayda hiç yazılmaz; var olan maliyet boşaltılınca alan silinir", () => {
    render(<Katalog />);
    duzenle("Kayış"); kaydet();
    expect("maliyet" in durum.parts.find(p => p.id === 8)).toBe(false);
    expect(durum.parts.find(p => p.id === 8)).toEqual(PARCALAR[1]);
    duzenle("Rulman");
    fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "" } });
    kaydet();
    expect("maliyet" in durum.parts.find(p => p.id === 7)).toBe(false);
  });

  it("AC-5: maliyeti girilmemiş hücre \"—\", sıfır girilmiş \"0,00 ₺\"", () => {
    render(<Katalog p0={[{ id: 8, ad: "Kayış", models: [] }, { id: 10, ad: "Hediye", models: [], maliyet: 0 }]} />);
    expect(satir("Kayış").querySelector('[data-testid="parca-maliyet"]').textContent).toBe("—");
    expect(satir("Hediye").querySelector('[data-testid="parca-maliyet"]').textContent).toBe("0,00 ₺");
  });

  it("AC-7: negatif maliyet reddedilir, hata alanın altında, kayıt yazılmaz", () => {
    render(<Katalog />);
    duzenle("Kayış");
    fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "-5" } });
    kaydet();
    expect(screen.getByText("Maliyet negatif olamaz.")).toBeTruthy();
    expect(durum.parts.find(p => p.id === 8)).toEqual(PARCALAR[1]);
  });

  it("AC-8, AC-9: maliyeti girilmemiş sayısı bütün canlı parçaları sayar (aramadan bağımsız, çöptekiler hariç); hepsi girilince çizilmez", () => {
    render(<Katalog />);
    expect(screen.getByTestId("maliyetsiz-parca").textContent).toMatch(/^1 parçanın/);
    fireEvent.change(screen.getByPlaceholderText("Yedek parça ara..."), { target: { value: "Rulman" } });
    expect(screen.getByTestId("maliyetsiz-parca").textContent).toMatch(/^1 parçanın/);
    cleanup();
    render(<Katalog p0={[PARCALAR[0], PARCALAR[2]]} />);
    expect(screen.queryByTestId("maliyetsiz-parca")).toBeNull();
  });

  it("AC-33: gider yetkisi olmayan kullanıcı maliyeti görür ve girer", () => {
    render(<Katalog ek={{ giderYetki: false, giderVeriYetki: false }} />);
    expect(satir("Rulman").querySelector('[data-testid="parca-maliyet"]').textContent).toBe("120,50 ₺");
    duzenle("Kayış");
    fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "7.50" } });
    kaydet();
    expect(durum.parts.find(p => p.id === 8).maliyet).toBe(7.5);
  });
});

describe("Spec 0087: ürün ağacı adetleri (ekran)", () => {
  it("AC-10, AC-16: parça kartından girilen adet modelin kitinde görünür; yazım standart model bölümüne gider", () => {
    render(<Katalog />);
    duzenle("Kayış");
    fireEvent.click(screen.getByRole("button", { name: "AK120_DS" }));
    fireEvent.change(screen.getByLabelText("AK120_DS adedi"), { target: { value: "4" } });
    kaydet();
    expect(durum.parts.find(p => p.id === 8).models).toEqual(["AK120_DS"]);
    expect(kit(durum.standardModels, "AK120_DS")).toEqual([{ partId: "8", ad: "Kayış", miktar: 4 }]);
    panel("Makina Modelleri");
    fireEvent.click(screen.getByText("AK120_DS").closest("tr").querySelector("button.btn--ghost"));
    expect(screen.getByLabelText("Kayış kit adedi").value).toBe("4");
  });

  it("AC-10: yeni parça eklenirken girilen adet kancanın döndürdüğü kimlikle kite yazılır", () => {
    render(<Katalog />);
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Pul" } });
    fireEvent.click(screen.getByRole("button", { name: "OZEL_1" }));
    fireEvent.change(screen.getByLabelText("OZEL_1 adedi"), { target: { value: "46" } });
    kaydet();
    const pul = durum.parts.find(p => p.ad === "Pul");
    expect(pul.models).toEqual(["OZEL_1"]);
    expect(kit(durum.customModels, "OZEL_1")).toEqual([{ partId: String(pul.id), ad: "Pul", miktar: 46 }]);
    expect("maliyet" in pul).toBe(false);
  });

  it("AC-11: model kartında değiştirilen kit adedi parça kartında aynı görünür", () => {
    render(<Katalog tab="models" />);
    fireEvent.click(screen.getByText("AK100_DS").closest("tr").querySelector("button.btn--ghost"));
    fireEvent.change(screen.getByLabelText("Rulman kit adedi"), { target: { value: "6" } });
    kaydet();
    panel("Parça/Yedek Parça");
    duzenle("Rulman");
    expect(screen.getByLabelText("AK100_DS adedi").value).toBe("6");
  });

  it("AC-12: işaretlenip adedi boş bırakılan modelde kit satırı doğmaz; parça model kartının seçicisinde kalır", () => {
    render(<Katalog />);
    duzenle("Kayış");
    fireEvent.click(screen.getByRole("button", { name: "AK120_DS" }));
    expect(screen.getByText("kitte yok")).toBeTruthy();
    kaydet();
    expect(durum.parts.find(p => p.id === 8).models).toEqual(["AK120_DS"]);
    expect(kit(durum.standardModels, "AK120_DS")).toEqual([]);
    panel("Makina Modelleri");
    fireEvent.click(screen.getByText("AK120_DS").closest("tr").querySelector("button.btn--ghost"));
    fireEvent.focus(screen.getByPlaceholderText("Parça ekle..."));
    fireEvent.change(screen.getByPlaceholderText("Parça ekle..."), { target: { value: "Kay" } });
    expect(screen.getAllByText("Kayış").length).toBeGreaterThan(0);
  });

  it("AC-13: adet boşaltılınca kit satırı düşer, işaret kalır", () => {
    render(<Katalog />);
    duzenle("Rulman");
    fireEvent.change(screen.getByLabelText("AK100_DS adedi"), { target: { value: "" } });
    kaydet();
    expect(kit(durum.standardModels, "AK100_DS")).toEqual([]);
    expect(durum.parts.find(p => p.id === 7).models).toContain("AK100_DS");
  });

  it("AC-14: işaret kaldırılınca kitten de düşer, ipucu gösterilir; ikisi aynı kayıtta değişir", () => {
    render(<Katalog />);
    duzenle("Rulman");
    fireEvent.click(screen.getByRole("button", { name: "AK100_DS" }));
    expect(screen.getByText(/AK100_DS: Kaydedince bu modelin makina kitinden de düşecek/)).toBeTruthy();
    expect(kit(durum.standardModels, "AK100_DS")).toHaveLength(1);
    kaydet();
    expect(durum.parts.find(p => p.id === 7).models).not.toContain("AK100_DS");
    expect(kit(durum.standardModels, "AK100_DS")).toEqual([]);
  });

  it("Triyaj bulgu 1 (AC-14): işaretsiz ama kitte olan modelde \"kitten düşecek\" yazmaz, bilgi satırı çıkar ve kayıt kite dokunmaz", () => {
    // 0087 öncesi yeniden adlandırılmış model: parçanın işareti eski adda kaldı, kit satırı yeni adda.
    render(<Katalog p0={[{ id: 7, ad: "Rulman", models: ["ESKI_AD"], maliyet: 120.5 }]} />);
    duzenle("Rulman");
    expect(screen.queryByText(/Kaydedince bu modelin makina kitinden de düşecek/)).toBeNull();
    expect(screen.getByText("AK100_DS: işaretsiz, makina kitinde 2 adet (kayıt bu kite dokunmaz).")).toBeTruthy();
    kaydet();
    expect(kit(durum.standardModels, "AK100_DS")).toEqual([{ partId: "7", ad: "Rulman", miktar: 2 }]);
    // İşaretli olup bu düzenlemede kaldırılan model yine "düşecek" ipucunu alır (AC-14'ün normal yolu).
    cleanup();
    render(<Katalog />);
    duzenle("Rulman");
    fireEvent.click(screen.getByRole("button", { name: "AK100_DS" }));
    expect(screen.getByText(/AK100_DS: Kaydedince bu modelin makina kitinden de düşecek/)).toBeTruthy();
    expect(screen.queryByText(/işaretsiz, makina kitinde/)).toBeNull();
  });

  it("Triyaj bulgu 3 (AC-18): kit satırı yalnız çöpteki bir modelde duruyorsa parça adı yine taşınır", () => {
    render(<Katalog p0={[{ id: 8, ad: "Kayış", models: [] }]} s0={[{ model: "AK100_DS", defaultParcalar: [] }]}
      c0={[{ model: "COP_1", deletedAt: "2026-10-01T00:00:00.000Z", defaultParcalar: [{ partId: "8", ad: "Kayış", miktar: 3 }] }]} />);
    duzenle("Kayış");
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Kayış V" } });
    kaydet();
    expect(durum.customModels[0].defaultParcalar).toEqual([{ partId: "8", ad: "Kayış V", miktar: 3 }]);
    expect(durum.customModels[0].deletedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("AC-15: 0, negatif ve ondalık adet reddedilir, ne parça ne kit yazılır; model kartında da aynı kural", () => {
    render(<Katalog />);
    for (const deger of ["0", "-2", "1,5"]) {
      duzenle("Rulman");
      fireEvent.change(screen.getByLabelText("AK100_DS adedi"), { target: { value: deger } });
      fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "99" } });
      kaydet();
      expect(screen.getByText("Adet en az 1 tam sayı olmalı.")).toBeTruthy();
      expect(durum.parts.find(p => p.id === 7).maliyet).toBe(120.5);
      expect(kit(durum.standardModels, "AK100_DS")[0].miktar).toBe(2);
      fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    }
    panel("Makina Modelleri");
    fireEvent.click(screen.getByText("AK100_DS").closest("tr").querySelector("button.btn--ghost"));
    fireEvent.change(screen.getByLabelText("Rulman kit adedi"), { target: { value: "2,5" } });
    kaydet();
    expect(screen.getByText("Adet en az 1 tam sayı olmalı.")).toBeTruthy();
    expect(kit(durum.standardModels, "AK100_DS")[0].miktar).toBe(2);
  });

  it("AC-17: model yeniden adlandırılınca parça işareti ve kit satırı birlikte yeni ada taşınır", () => {
    render(<Katalog tab="models" />);
    fireEvent.click(screen.getByText("AK100_DS").closest("tr").querySelector("button.btn--ghost"));
    fireEvent.change(screen.getByPlaceholderText("Örn: AK160_DSC"), { target: { value: "AK100_DSX" } });
    kaydet();
    expect(durum.parts.find(p => p.id === 7).models).toEqual(["AK100_DSX", "COP_1"]);
    expect(kit(durum.standardModels, "AK100_DSX")).toEqual([{ partId: "7", ad: "Rulman", miktar: 2 }]);
    panel("Parça/Yedek Parça");
    duzenle("Rulman");
    expect(screen.getByLabelText("AK100_DSX adedi").value).toBe("2");
    expect(screen.queryByRole("button", { name: "AK100_DS" })).toBeNull();
  });

  it("AC-18: parça yeniden adlandırılınca kit satırının adı da yeni ad olur", () => {
    render(<Katalog />);
    duzenle("Rulman");
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Rulman 6204" } });
    kaydet();
    expect(kit(durum.standardModels, "AK100_DS")[0].ad).toBe("Rulman 6204");
    expect(durum.customModels.find(m => m.model === "COP_1").defaultParcalar[0].ad).toBe("Rulman 6204");
  });

  it("AC-20: ad çakışmasıyla kaydedilemeyen düzenlemede kit yazılmaz", () => {
    render(<Katalog />);
    duzenle("Rulman");
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Kayış" } });
    fireEvent.change(screen.getByLabelText("AK100_DS adedi"), { target: { value: "8" } });
    kaydet();
    expect(kit(durum.standardModels, "AK100_DS")[0]).toEqual({ partId: "7", ad: "Rulman", miktar: 2 });
    expect(durum.parts.find(p => p.id === 7).ad).toBe("Rulman");
  });

  it("AC-20: kancayı paylaşan Kalıp ve Çalışan panellerinin ekleme ve düzenlemesi değişmez", () => {
    let kaliplar; let calisanlar;
    function H() {
      const [k, setK] = useState([{ id: 1, ad: "Hamburger" }]); kaliplar = k;
      const [c, setC] = useState([{ id: 2, ad: "Ali" }]); calisanlar = c;
      return <><KalipManager kalipDefs={k} setKalipDefs={setK} showToast={vi.fn()} /><CalisanManager calisanlar={c} setCalisanlar={setC} showToast={vi.fn()} /></>;
    }
    render(<H />);
    expect(kaliplar).toEqual([{ id: 1, ad: "Hamburger" }]);
    expect(calisanlar).toEqual([{ id: 2, ad: "Ali" }]);
    fireEvent.change(screen.getByPlaceholderText(/Ad Soyad/), { target: { value: "Veli" } });
    fireEvent.keyDown(screen.getByPlaceholderText(/Ad Soyad/), { key: "Enter" });
    expect(calisanlar.map(x => x.ad)).toContain("Veli");
    expect(Object.keys(calisanlar.find(x => x.ad === "Veli")).sort()).toEqual(Object.keys({ ...calisanlar.find(x => x.ad === "Veli") }).sort());
  });

  it("AC-28: çöpteki modelin satırı parça kartında çizilmez ama işareti ve kit satırı kayıttan sonra durur; geri alınınca ikisi döner", () => {
    render(<Katalog />);
    duzenle("Rulman");
    expect(screen.queryByRole("button", { name: "COP_1" })).toBeNull();
    fireEvent.change(screen.getByLabelText("AK100_DS adedi"), { target: { value: "3" } });
    kaydet();
    expect(durum.parts.find(p => p.id === 7).models).toContain("COP_1");
    expect(durum.customModels.find(m => m.model === "COP_1").defaultParcalar).toEqual([{ partId: "7", ad: "Rulman", miktar: 9 }]);
    cleanup();
    render(<Katalog c0={OZEL.map(m => ({ ...m, deletedAt: undefined }))} />);
    duzenle("Rulman");
    expect(screen.getByLabelText("COP_1 adedi").value).toBe("9");
  });

  it("AC-28: çöpteki parça model kartının kit seçicisinde çıkmaz, kit satırı silinmez", () => {
    render(<Katalog tab="models" p0={[...PARCALAR, { id: 11, ad: "Çöpteki pul", models: ["OZEL_1"], deletedAt: "2026-10-03T00:00:00.000Z" }]}
      c0={[{ model: "OZEL_1", defaultParcalar: [{ partId: "11", ad: "Çöpteki pul", miktar: 2 }] }]} />);
    fireEvent.click(screen.getByText("OZEL_1").closest("tr").querySelector("button.btn--ghost"));
    expect(screen.getByLabelText("Çöpteki pul kit adedi").value).toBe("2");
    fireEvent.change(screen.getByPlaceholderText("Parça ekle..."), { target: { value: "Çöp" } });
    expect(screen.getAllByText("Çöpteki pul")).toHaveLength(1);
    kaydet();
    expect(kit(durum.customModels, "OZEL_1")).toEqual([{ partId: "11", ad: "Çöpteki pul", miktar: 2 }]);
  });
});

describe("Spec 0087: kilit (R16)", () => {
  const kilitKur = (kilitli) => {
    window.crmLocks = {
      acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}),
      list: vi.fn(async () => Object.entries(kilitli).map(([k, sahip]) => { const [t, id] = k.split(":"); return { entity_type: t, entity_id: id, locked_by: sahip }; })),
    };
  };
  it("AC-21: başkası Makina Modelleri'ni tutuyorsa parça kartından adet yazımı reddedilir, kayıt bütünüyle yazılmaz", async () => {
    kilitKur({ "ayar:models": "ayse" });
    const toast = vi.fn();
    render(<Katalog ek={{ showToast: toast }} />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 0));
    duzenle("Rulman");
    fireEvent.change(screen.getByLabelText("AK100_DS adedi"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "10" } });
    kaydet();
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/Makina Modelleri.*"ayse" tarafından düzenleniyor/), "err");
    expect(durum.parts.find(p => p.id === 7).maliyet).toBe(120.5);
    expect(kit(durum.standardModels, "AK100_DS")[0].miktar).toBe(2);
  });

  it("AC-21, AC-34: yalnız maliyet değişiyorsa karşı panelin kilidi aranmaz; kendi kilidi engellemez", async () => {
    kilitKur({ "ayar:models": "ayse" });
    render(<Katalog />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    duzenle("Rulman");
    fireEvent.change(screen.getByLabelText("Alış maliyeti"), { target: { value: "10" } });
    kaydet();
    expect(durum.parts.find(p => p.id === 7).maliyet).toBe(10);
    cleanup();
    kilitKur({ "ayar:models": "kerem" });
    render(<Katalog />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    duzenle("Rulman");
    fireEvent.change(screen.getByLabelText("AK100_DS adedi"), { target: { value: "5" } });
    kaydet();
    expect(kit(durum.standardModels, "AK100_DS")[0].miktar).toBe(5);
  });

  it("AC-21: ters yön, başkası Parça/Yedek Parça'yı tutuyorsa işaretli parçası olan modelin adı taşınmaz", async () => {
    kilitKur({ "ayar:yedekparca": "ayse" });
    const toast = vi.fn();
    render(<Katalog tab="models" ek={{ showToast: toast }} />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 0));
    fireEvent.click(screen.getByText("AK100_DS").closest("tr").querySelector("button.btn--ghost"));
    fireEvent.change(screen.getByPlaceholderText("Örn: AK160_DSC"), { target: { value: "AK100_DSX" } });
    kaydet();
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/Parça\/Yedek Parça.*"ayse"/), "err");
    expect(durum.standardModels.map(m => m.model)).toContain("AK100_DS");
    expect(durum.parts.find(p => p.id === 7).models).toContain("AK100_DS");
  });

  it("AC-34: parça paneli başkasında açıkken panel çizilmez, maliyet yazılamaz", async () => {
    window.crmLocks = { acquire: vi.fn(async (t, id) => (id === "yedekparca" ? { ok: false, lockedBy: "ayse", lockedAt: "2026-10-16T09:00:00" } : { ok: true })),
      release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}), list: vi.fn(async () => []) };
    render(<Katalog />);
    await screen.findByTestId("ayar-kilitli");
    expect(screen.queryByText("Rulman")).toBeNull();
  });
});
