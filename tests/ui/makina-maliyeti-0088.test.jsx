// @vitest-environment jsdom
// Spec 0088: Makina Maliyeti ekranı (dört görünüm). Veri tests/fixtures/0088-veri.js (havuz 45.000 TL, 120 makina → pay 375 TL;
// AK100 direkt 726,20, toplam 1.101,20, öneri × 2,19498 = 2.417,11 TL). Hesap motorda; burada çizim, yazım, kilit ve gizlilik.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { readFileSync, readdirSync } from "node:fs";
import { MakinaMaliyeti, BUGUNKU_AYAR_IBARESI } from "../../src/components/MakinaMaliyeti";
import { GiderTurManager } from "../../src/components/settings/GiderTurManager";
import { ROL_DAVRANIS_UYARISI, ADET_HATASI, DONEM_SIRA_HATASI, KATSAYI_BICIM_HATASI } from "../../src/lib/makinaStandartMaliyet";
import { KAT_HATASI, KAT_ZARAR_UYARISI } from "../../src/lib/makinaMaliyeti";
import { TURLER, GIDERLER, PARCALAR, MODELLER, OZEL, PARTILER, STOCK, CUSTOMERS, AYAR } from "../fixtures/0088-veri.js";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-16T10:00:00")); });

let durum;
function H({ ayar = AYAR, turler = TURLER, perms = null, giderler = GIDERLER, toast = vi.fn(), gorunum = "modeller" }) {
  const [giderTurleri, setGiderTurleri] = useState(structuredClone(turler));
  const [standardModels, setStandardModels] = useState(structuredClone(MODELLER));
  const [customModels, setCustomModels] = useState(structuredClone(OZEL));
  const [uretimPartileri, setUretimPartileri] = useState(structuredClone(PARTILER));
  const [appSettings, setAppSettings] = useState({ giderAyarlari: { yururlukAy: "2026-01" }, ...(ayar ? { maliyetAyarlari: ayar } : {}) });
  durum = { giderTurleri, standardModels, customModels, uretimPartileri, appSettings, giderler };
  return <MakinaMaliyeti aktifKullanici="kerem" giderler={giderler} giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} tedarikciler={[]}
    stock={STOCK} customers={CUSTOMERS} partStockLog={[]} parts={PARCALAR} standardModels={standardModels} customModels={customModels.filter(m => !m.deletedAt)}
    setStandardModels={setStandardModels} setCustomModels={setCustomModels} uretimPartileri={uretimPartileri.filter(p => !p.deletedAt)} setUretimPartileri={setUretimPartileri}
    appSettings={appSettings} setAppSettings={setAppSettings} rates={{ usd: 41 }} serverPermissions={perms} showToast={toast} baslangicGorunum={gorunum} />;
}
const git = (ad) => fireEvent.click(screen.getByRole("radio", { name: ad }));
const modelSatiri = (m) => screen.getByTestId(`model-satiri-${m}`);
const hucreler = (el) => [...el.querySelectorAll("td")].map(td => td.textContent);

describe("Spec 0088: ekran ve görünümler", () => {
  it("R3, AC-48: dört görünüm bu sırayla, açılış Model Maliyetleri; \"bugünkü ayarlarla\" ibaresi", () => {
    render(<H />);
    expect(within(screen.getByRole("radiogroup", { name: "Görünüm" })).getAllByRole("radio").map(r => r.textContent))
      .toEqual(["Model Maliyetleri", "Parti Hesabı", "Üretim Partileri", "Hesap Ayarları"]);
    expect(screen.getByRole("radio", { name: "Model Maliyetleri" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("bugunku-ayar-ibaresi").textContent).toBe(BUGUNKU_AYAR_IBARESI);
  });
});

describe("Spec 0088: Model Maliyetleri", () => {
  it("AC-15: pay özeti varsayılan adede göre pay ve gerçek adet kıyası", () => {
    render(<H />);
    expect(screen.getByTestId("pay-havuz").textContent).toContain("45.000,00 ₺");
    expect(screen.getByTestId("pay-adet").textContent).toContain("≈ 10 makina/ay");
    expect(screen.getByTestId("pay-makina").textContent).toContain("375,00 ₺");
    expect(screen.getByTestId("pay-gercek").textContent).toMatch(/7 makina.*Gerçek adede göre pay: 6\.428,57 ₺ \(kıyas\)/);
  });

  it("AC-18, AC-19, AC-22, AC-23: model satırında direkt, pay ve toplam ayrı; öneri fiyat, katsayı ve Extra Kalıp liste fiyatı", () => {
    render(<H />);
    expect(hucreler(modelSatiri("AK100")).slice(1, 7)).toEqual(["726,20 ₺", "375,00 ₺", "1.101,20 ₺", "2,19498", "2.417,11 ₺", "4.500,00 ₺"]);
  });

  it("AC-20, AC-20/2, AC-21: eksik işareti sayıyla; ürün ağacı boş modelde ibare; katsayısız modelde öneri \"—\"", () => {
    render(<H />);
    expect(within(modelSatiri("AK120")).getByTestId("eksik-isareti").textContent).toBe("eksik · 3 parçanın maliyeti yok");
    expect(within(modelSatiri("AK200")).getByTestId("urun-agaci-yok")).toBeTruthy();
    expect(hucreler(modelSatiri("AK200"))[5]).toBe("—");
  });

  it("AC-22/3: öneri fiyatın KDV hariç olduğu yazar; AC-25: çöpteki model listede yok", () => {
    render(<H />);
    expect(screen.getByTestId("oneri-kdv-haric").textContent).toMatch(/KDV hariç/);
    expect(screen.queryByTestId("model-satiri-COP")).toBeNull();
  });

  it("AC-24: satır açılınca döküm: parça · adet · birim · tutar, ek kalem ve genel gider payı", () => {
    render(<H />);
    fireEvent.click(within(modelSatiri("AK100")).getByRole("button", { name: /AK100/ }));
    const d = screen.getByTestId("dokum-AK100");
    const satirlar = [...d.querySelectorAll("tr")].map(hucreler).filter(h => h.length);
    expect(satirlar).toEqual([["Rulman", "46", "7,50 ₺", "345,00 ₺"], ["Bant", "2", "145,60 ₺", "291,20 ₺"],
      ["Büküm işçiliği (ek maliyet)", "1", "90,00 ₺", "90,00 ₺"], ["Genel gider payı", "1", "375,00 ₺", "375,00 ₺"]]);
  });

  it("AC-22/2: katsayı sıfır reddedilir, biçim hatası, 1'in altı uyarıyla kaydedilir; liste fiyatı yazılır", () => {
    const toast = vi.fn();
    render(<H toast={toast} />);
    fireEvent.click(within(modelSatiri("AK200")).getByTitle("Katsayı ve liste fiyatı"));
    fireEvent.change(screen.getByLabelText("Kâr katsayısı"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(screen.getByText(KAT_HATASI)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Kâr katsayısı"), { target: { value: "1,123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(screen.getByText(KATSAYI_BICIM_HATASI)).toBeTruthy();
    expect(durum.standardModels.find(m => m.model === "AK200").karKatsayisi).toBeUndefined();
    fireEvent.change(screen.getByLabelText("Kâr katsayısı"), { target: { value: "0,8" } });
    fireEvent.change(screen.getByLabelText("Extra Kalıp liste fiyatı"), { target: { value: "1250,5" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(durum.standardModels.find(m => m.model === "AK200")).toMatchObject({ karKatsayisi: 0.8, kalipListeFiyati: 1250.5 });
    expect(toast).toHaveBeenCalledWith(`Kaydedildi. ${KAT_ZARAR_UYARISI}`);
  });

  it("AC-44: katsayı ve fiyat boşaltılınca alanlar kayıttan silinir (gövde eski hâline döner)", () => {
    render(<H />);
    fireEvent.click(within(modelSatiri("AK100")).getByTitle("Katsayı ve liste fiyatı"));
    fireEvent.change(screen.getByLabelText("Kâr katsayısı"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Extra Kalıp liste fiyatı"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    const m = durum.standardModels.find(x => x.model === "AK100");
    expect("karKatsayisi" in m || "kalipListeFiyati" in m).toBe(false);
  });

  it("AC-10, AC-14/2: rol yoksa ve ayar yoksa boş durumlar; öneri gösterilir, kendiliğinden kaydedilmez", () => {
    render(<H turler={TURLER.map(({ maliyetRolu: _r, ...t }) => t)} />);
    expect(screen.getByTestId("pay-bos-rolYok")).toBeTruthy();
    cleanup();
    render(<H ayar={null} />);
    expect(screen.getByTestId("pay-bos-ayarsiz")).toBeTruthy();
    git("Hesap Ayarları");
    expect(screen.getByTestId("donem-onerisi").textContent).toContain("2025-10 – 2026-09");
    fireEvent.click(screen.getByRole("button", { name: "Öneriyi kullan" }));
    expect(screen.getByLabelText("Dönem başlangıcı").value).toBe("2025-10");
    expect(durum.appSettings.maliyetAyarlari).toBeUndefined();
  });
});

describe("Spec 0088: Hesap Ayarları", () => {
  it("AC-8, AC-9: tür rolü seçilir ve yeniden açılınca aynı; rolsüz tür sayısı yazar", () => {
    render(<H gorunum="ayarlar" />);
    expect(screen.getByTestId("rolsuz-sayi").textContent).toBe("1 türün rolü belirtilmedi.");
    fireEvent.change(screen.getByLabelText("Kira maliyet rolü"), { target: { value: "yok" } });
    expect(durum.giderTurleri.find(t => t.id === 4).maliyetRolu).toBe("yok");
    expect(screen.getByLabelText("Kira maliyet rolü").value).toBe("yok");
    expect(screen.queryByTestId("rolsuz-sayi")).toBeNull();
  });

  it("AC-12: türsüz kalem rol tablosunda yok, sayısı yazar; çöpteki tür listede yok", () => {
    render(<H gorunum="ayarlar" />);
    const tablo = screen.getByTestId("rol-tablosu");
    expect(tablo.textContent).not.toContain("(türsüz)");
    expect(tablo.textContent).toContain("Türü seçilmemiş 1 gider kalemi hiçbir havuza girmez.");
    expect(screen.queryByTestId("rol-satiri-5")).toBeNull();
  });

  it("AC-47: personel türüne ürün ağacı rolü uyarı verir ama yazılır", () => {
    render(<H gorunum="ayarlar" />);
    fireEvent.change(screen.getByLabelText("Personel maliyet rolü"), { target: { value: "urunAgaci" } });
    expect(durum.giderTurleri.find(t => t.id === 3).maliyetRolu).toBe("urunAgaci");
    expect(within(screen.getByTestId("rol-satiri-3")).getByTestId("rol-uyarisi").textContent).toBe(ROL_DAVRANIS_UYARISI);
  });

  it("AC-13, AC-13/2, AC-14: adet 0/ondalık/10001 ve ters dönem reddedilir; 120 → ≈ 10 makina/ay; geçerli kayıt kendi anahtarına", () => {
    render(<H gorunum="ayarlar" ayar={null} />);
    const adet = screen.getByLabelText("Dönemde varsayılan üretim adedi (toplam)");
    fireEvent.change(screen.getByLabelText("Dönem başlangıcı"), { target: { value: "2026-01" } });
    fireEvent.change(screen.getByLabelText("Dönem bitişi"), { target: { value: "2026-12" } });
    for (const x of ["0", "2,5", "10001"]) {
      fireEvent.change(adet, { target: { value: x } });
      fireEvent.click(within(screen.getByTestId("maliyet-ayar-formu")).getByRole("button", { name: /Kaydet/ }));
      expect(screen.getByText(ADET_HATASI), x).toBeTruthy();
      expect(durum.appSettings.maliyetAyarlari).toBeUndefined();
    }
    fireEvent.change(adet, { target: { value: "120" } });
    expect(screen.getByTestId("aylik-karsilik").textContent).toBe("≈ 10 makina/ay");
    fireEvent.change(screen.getByLabelText("Dönem bitişi"), { target: { value: "2025-12" } });
    fireEvent.click(within(screen.getByTestId("maliyet-ayar-formu")).getByRole("button", { name: /Kaydet/ }));
    expect(screen.getByText(DONEM_SIRA_HATASI)).toBeTruthy();
    expect(durum.appSettings.maliyetAyarlari).toBeUndefined();
    fireEvent.change(screen.getByLabelText("Dönem bitişi"), { target: { value: "2026-12" } });
    fireEvent.click(within(screen.getByTestId("maliyet-ayar-formu")).getByRole("button", { name: /Kaydet/ }));
    expect(durum.appSettings.maliyetAyarlari).toEqual({ baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 120 });
    expect(durum.appSettings.giderAyarlari).toEqual({ yururlukAy: "2026-01" });
  });
});

describe("Spec 0088: Parti Hesabı", () => {
  it("AC-26, AC-29, AC-29/3, AC-30, AC-33: model-adet tablosu, özet, kırılım, kursuz ve partisiz sayısı", () => {
    render(<H gorunum="parti" />);
    expect(hucreler(screen.getByTestId("parti-satiri-AK100"))[1]).toBe("5");
    expect(screen.getByTestId("ozet-standart").textContent).toContain("5.506,00 ₺");
    expect(screen.getByTestId("ozet-satis").textContent).toContain("140.000,00 ₺");
    expect(screen.getByTestId("ozet-kirilim").textContent).toBe("Satılmış 2 · Stokta 1 · Bedelsiz 1 · Kuru olmayan 1");
    expect(screen.getByTestId("kursuz-not").textContent).toMatch(/^1 döviz satışının kuru yok/);
    expect(screen.getByTestId("partisiz-makina").textContent).toMatch(/^2 makinanın partisi yok/);
  });

  it("AC-29/4: parti satırındaki birim toplam Model Maliyetleri ile aynı", () => {
    render(<H />);
    const model = hucreler(modelSatiri("AK100"))[3];
    git("Parti Hesabı");
    expect(hucreler(screen.getByTestId("parti-satiri-AK100"))[4]).toBe(model);
  });

  it("AC-31, AC-31/2: tedarik karşılaştırması, fark ve iki yapısal neden cümlesi", () => {
    render(<H gorunum="parti" />);
    expect(screen.getByTestId("tedarik-gercek").textContent).toContain("5.000,00 ₺");
    expect(screen.getByTestId("tedarik-standart").textContent).toContain("3.631,00 ₺");
    expect(screen.getByTestId("tedarik-fark").textContent).toContain("1.369,00 ₺");
    expect(screen.getByTestId("tedarik-karsilastirmasi").textContent).toMatch(/indirilemeyen KDV/);
    expect(screen.getByTestId("tedarik-donem").textContent).toMatch(/1 partiyle daha paylaşılıyor/);
  });

  it("AC-27, AC-28, R18/2: planlanan parti \"planlanan\" ibaresi ve bulunamayan model uyarısı; boş parti boş durum", () => {
    render(<H gorunum="parti" />);
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "803" } });
    expect(within(screen.getByTestId("parti-satiri-AK100")).getByTestId("planlanan")).toBeTruthy();
    expect(screen.getByTestId("plan-bulunamayan").textContent).toMatch(/ESKI_AD \(4\)/);
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "802" } });
    expect(screen.getByTestId("bos-parti")).toBeTruthy();
  });

  it("AC-27: planlanan adet girilir, boşaltılan silinir, bulunamayan ad korunur; geçersiz adet reddedilir", () => {
    render(<H gorunum="parti" />);
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "803" } });
    fireEvent.click(screen.getByRole("button", { name: /Planlanan adetler/ }));
    fireEvent.change(screen.getByLabelText("AK120 planlanan adedi"), { target: { value: "2,5" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(screen.getByText("Planlanan adet 1 ile 10000 arasında tam sayı olmalı.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("AK120 planlanan adedi"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("AK100 planlanan adedi"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(durum.uretimPartileri.find(p => p.id === 803).planlananAdetler).toEqual({ ESKI_AD: 4, AK120: 3 });
  });
});

describe("Spec 0088 triyaj", () => {
  it("Bulgu 1: modeli bulunamayan partili makina ayrı uyarıyla (planlı değil) ve kırılımda \"Modeli bulunamayan\" olarak görünür", () => {
    function H1() {
      const [p, setP] = useState(structuredClone(PARTILER));
      return <MakinaMaliyeti giderler={GIDERLER} giderTurleri={TURLER} setGiderTurleri={vi.fn()} stock={STOCK} parts={PARCALAR}
        customers={CUSTOMERS.map(c => (c.id === 601 ? { ...c, model: "COP" } : c))} standardModels={MODELLER} customModels={[]} setStandardModels={vi.fn()} setCustomModels={vi.fn()}
        uretimPartileri={p} setUretimPartileri={setP} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: AYAR }} setAppSettings={vi.fn()} rates={{ usd: 41 }} baslangicGorunum="parti" />;
    }
    render(<H1 />);
    expect(screen.getByTestId("model-bulunamayan").textContent).toMatch(/^Partiye bağlı ama modeli tanımlı olmayan makinalar: COP \(1\)/);
    expect(screen.queryByTestId("plan-bulunamayan")).toBeNull();
    expect(screen.getByTestId("ozet-kirilim").textContent).toBe("Satılmış 1 · Stokta 1 · Bedelsiz 1 · Kuru olmayan 1 · Modeli bulunamayan 1");
    expect(screen.getByTestId("ozet-satis").textContent).toContain("40.000,00 ₺");
  });

  it("Bulgu 2: tek genel türü çöpte ama kalemi duran veride \"pay 0\" boş durumu çizilmez; çöpteki tür rol tablosunda satır olarak görünür ve rolü değişir", () => {
    const turler = TURLER.map(t => (t.id === 3 ? { ...t, maliyetRolu: "yok" } : t.id === 1 ? { ...t, deletedAt: "2026-10-01T00:00:00.000Z" } : t));
    render(<H turler={turler} />);
    expect(screen.queryByTestId("pay-bos-rolYok")).toBeNull();
    expect(screen.getByTestId("pay-makina").textContent).toContain("83,33 ₺");
    git("Hesap Ayarları");
    expect(within(screen.getByTestId("rol-satiri-1")).getByTestId("tur-copte")).toBeTruthy();
    expect(screen.getByTestId("rol-satiri-1").textContent).toContain("10.000,00 ₺");
    expect(screen.queryByTestId("rol-satiri-5")).toBeNull(); // kalemi olmayan çöpteki tür yok
    fireEvent.change(screen.getByLabelText("Genel giderler maliyet rolü"), { target: { value: "yok" } });
    expect(durum.giderTurleri.find(t => t.id === 1).maliyetRolu).toBe("yok");
    expect(screen.getByTestId("rolsuz-sayi").textContent).toBe("1 türün rolü belirtilmedi.");
  });

  it("Bulgu 3: modeli bulunamayan planlanan adet pencereden kaldırılır", () => {
    render(<H gorunum="parti" />);
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "803" } });
    fireEvent.click(screen.getByRole("button", { name: /Planlanan adetler/ }));
    expect(screen.getByTestId("plan-bulunamayan-listesi").textContent).toContain("ESKI_AD (4)");
    fireEvent.click(screen.getByRole("button", { name: "ESKI_AD planlanan adedini kaldır" }));
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(durum.uretimPartileri.find(p => p.id === 803).planlananAdetler).toEqual({ AK100: 10 });
    expect(screen.queryByTestId("plan-bulunamayan")).toBeNull();
  });

  it("Bulgu 4: başlangıcı gelecekte olan partide karşılaştırma yerine \"henüz başlamadı\" ibaresi", () => {
    function H4() {
      const [p, setP] = useState([{ id: 900, ad: "Gelecek", baslangicAy: "2027-02", bitisAy: null, planlananAdetler: { AK100: 3 } }]);
      return <MakinaMaliyeti giderler={GIDERLER} giderTurleri={TURLER} setGiderTurleri={vi.fn()} stock={[]} customers={[]} parts={PARCALAR}
        standardModels={MODELLER} customModels={[]} setStandardModels={vi.fn()} setCustomModels={vi.fn()} uretimPartileri={p} setUretimPartileri={setP}
        appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: AYAR }} setAppSettings={vi.fn()} baslangicGorunum="parti" />;
    }
    render(<H4 />);
    expect(screen.getByTestId("parti-baslamadi").textContent).toMatch(/Parti henüz başlamadı \(başlangıç 2027-02\)/);
    expect(screen.queryByTestId("tedarik-fark")).toBeNull();
    expect(screen.getByTestId("tedarik-karsilastirmasi").textContent).not.toMatch(/2027-02 – 2026-10/);
  });
});

describe("Spec 0088: izin, kilit, gizlilik, değişmeyenler", () => {
  it("AC-7: gider_tanim izni yoksa rol seçici, ayar kaydı, katsayı ve planlanan adet düğmeleri yok; ekran görünür", () => {
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "maliyet"], giderActions: ["gider_add"] }) };
    render(<H perms={perms} />);
    expect(screen.queryByTitle("Katsayı ve liste fiyatı")).toBeNull();
    git("Parti Hesabı");
    expect(screen.queryByRole("button", { name: /Planlanan adetler/ })).toBeNull();
    git("Hesap Ayarları");
    expect(screen.queryByLabelText("Kira maliyet rolü")).toBeNull();
    expect(within(screen.getByTestId("maliyet-ayar-formu")).queryByRole("button", { name: /Kaydet/ })).toBeNull();
    git("Üretim Partileri");
    expect(screen.queryByText("Yeni Üretim Partisi")).toBeNull();
  });

  it("R32: başkası Gider Türleri / Makina Modelleri / partiyi tutuyorsa rol, katsayı ve plan yazılmaz; Hesap Ayarları formu çakışma gösterir", async () => {
    window.crmLocks = {
      acquire: vi.fn(async (t) => (t === "maliyet_ayar" ? { ok: false, lockedBy: "ayse", lockedAt: "2026-10-16T09:00:00" } : { ok: true })),
      release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}),
      list: vi.fn(async () => [{ entity_type: "ayar", entity_id: "gidertur", locked_by: "ayse" }, { entity_type: "ayar", entity_id: "models", locked_by: "ayse" },
        { entity_type: "uretim_partisi", entity_id: "803", locked_by: "ayse" }]),
    };
    const toast = vi.fn();
    render(<H toast={toast} />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 0));
    fireEvent.click(within(modelSatiri("AK200")).getByTitle("Katsayı ve liste fiyatı"));
    fireEvent.change(screen.getByLabelText("Kâr katsayısı"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(durum.standardModels.find(m => m.model === "AK200").karKatsayisi).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    git("Parti Hesabı");
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "803" } });
    fireEvent.click(screen.getByRole("button", { name: /Planlanan adetler/ }));
    fireEvent.change(screen.getByLabelText("AK120 planlanan adedi"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
    expect(durum.uretimPartileri.find(p => p.id === 803).planlananAdetler).toEqual({ AK100: 10, ESKI_AD: 4 });
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    git("Hesap Ayarları");
    fireEvent.change(screen.getByLabelText("Kira maliyet rolü"), { target: { value: "genel" } });
    expect(durum.giderTurleri.find(t => t.id === 4).maliyetRolu).toBeUndefined();
    expect(toast.mock.calls.filter(c => c[1] === "err").map(c => c[0]).join(" | ")).toMatch(/Makina Modelleri.*ayse.*Üretim partisi.*ayse.*Gider Türleri.*ayse/);
    await screen.findByText("Bu kayıt şu an düzenleniyor");
  });

  it("AC-39: personel gideri havuzdayken ekranda çalışan adı ve resmi/elden tutarları yok; personel tek satır", () => {
    const giderler = GIDERLER.map(k => (k.id === 3 ? { ...k, calisanAd: "Zeynep Gizlisoy", resmiTutar: 31111, eldenTutar: 4444 } : k));
    render(<H giderler={giderler} />);
    for (const ad of ["Model Maliyetleri", "Parti Hesabı", "Hesap Ayarları"]) {
      git(ad);
      const metin = document.body.textContent;
      expect(metin, ad).not.toMatch(/Zeynep|Gizlisoy|31\.111|4\.444|Resmi|Elden/);
    }
    expect(screen.getByTestId("rol-satiri-3").textContent).toContain("35.555,00 ₺");
  });

  it("AC-41, R27: ekran gider kalemlerini yazmaz (gider yazıcısı almaz, kaynakta yok)", () => {
    const dosyalar = ["src/components/MakinaMaliyeti.jsx", ...readdirSync("src/components/maliyet").map(f => `src/components/maliyet/${f}`)];
    for (const f of dosyalar) expect(readFileSync(f, "utf8"), f).not.toMatch(/setGiderler|setGiderTanimlari|setHesapHareketleri/);
  });

  it("R25: ekran dosyalarında çarpım ya da bölme yok (hesap motorda)", () => {
    const dosyalar = ["src/components/MakinaMaliyeti.jsx", ...readdirSync("src/components/maliyet").map(f => `src/components/maliyet/${f}`)];
    for (const f of dosyalar) {
      const kod = readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\{\/\*)/.test(l)).join("\n");
      expect(kod, f).not.toMatch(/[\w)\]]\s+[*/]\s+[\w(]/);
    }
  });
});

describe("Spec 0088 R30: tür silme penceresi hedefin rolünü söyler", () => {
  function TurH() {
    const [giderTurleri, setGiderTurleri] = useState([{ id: 1, ad: "Genel", davranis: "normal", maliyetRolu: "genel" }, { id: 2, ad: "Tedarik", davranis: "normal", maliyetRolu: "urunAgaci" }]);
    const [giderler, setGiderler] = useState([{ id: 9, tarih: "2026-02-01", turId: 1, tutar: 100 }]);
    return <GiderTurManager giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} giderler={giderler} setGiderler={setGiderler} giderTanimlari={[]} setGiderTanimlari={vi.fn()} />;
  }
  it("AC-17: kullanımdaki tür silinirken hedef türün rolü gösterilir, roller farklıysa uyarı", () => {
    render(<TurH />);
    const satir = screen.getAllByText("Genel").find(e => e.tagName === "TD" || e.closest("td")).closest("tr");
    fireEvent.click(within(satir).getByTitle("Sil"));
    expect(screen.getByTestId("hedef-maliyet-rolu").textContent).toContain("Hedef türün maliyet rolü: Ürün ağacından gelir.");
    expect(screen.getByTestId("rol-farki-uyarisi").textContent).toMatch(/Genel gidere girer.*Ürün ağacından gelir/);
  });
});
