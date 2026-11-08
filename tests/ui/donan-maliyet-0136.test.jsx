// @vitest-environment jsdom
// Spec 0136 ekran kriterleri: gerçek Makina Maliyeti (Üretim Partileri, Parti Hesabı, Model Maliyetleri, Sipariş İhtiyacı) durumlu
// kapla. Kapanış ekrandan yapılır ve görüntü kayda yazılır; donmuş, dondurulmamış ve açık partinin iki ekrandaki ibareleri;
// yeniden açma onayı; planlanan adetler kapısı; gelecek bitiş; genişleyen sapma kutusu.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { useState } from "react";
import { MakinaMaliyeti } from "../../src/components/MakinaMaliyeti";
import { UretimPartileri } from "../../src/components/gider/UretimPartileri";
import { partiGenelPaylari, partiKapanisGoruntusu, modelMaliyetleri } from "../../src/lib/makinaStandartMaliyet";
import {
  KAPANIS_DONDU_BILDIRIMI, KAPANIS_MALIYET_YOK, GELECEK_BITIS_HATASI, DONDURULMADI_IBARESI, DONDURULMADI_KISA, YENIDEN_ACMA_ONAYI,
  PLAN_KAPALI_NEDENI, SAPMA_BASLIGI, SAPMA_ALT_BASLIGI, SAPMA_DUZELTME, SAPMA_DIREKT_ETIKETI, SAPMA_PAY_ETIKETI, DEGISIM_BASLIGI,
  DEGISIM_ALT_BASLIGI, DONDURULMAMIS_SATIR_NEDENI, ARALIK_DEGISIM_ONAYI, KAPANIS_YENIDEN_DONDU_BILDIRIMI, DONMUS_KATSAYI_IPUCU, DONMUS_TEDARIK_NOTU,
} from "../../src/lib/uretimPartisi";
import * as V from "../fixtures/0136-veri";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-15T10:00:00")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const MALZ = { id: 2, ad: "8620", ozgulAgirlik: 7.85, kiloFiyati: 100 };
const PARCALAR = [...V.PARCALAR, { id: 3, ad: "Mil", models: ["AK100"], malzemeSatiri: { malzemeId: 2, bicim: "mil", cap: 20, boy: 100 } }];
const STANDART = [{ ...V.STANDART[0], defaultParcalar: [...V.STANDART[0].defaultParcalar, { partId: "3", ad: "Mil", miktar: 1 }] }];
const katalog = { parts: PARCALAR, malzemeler: [MALZ], standardModels: STANDART, customModels: V.OZEL };
const KIS0 = V.PARTILER[0];
const GORUNTU = partiKapanisGoruntusu(V.veri(), KIS0, V.BUGUN, { katalog, modeller: modelMaliyetleri(katalog, 65000, {}),
  partiPay: partiGenelPaylari(V.veri(), V.BUGUN).partiler.find(p => p.id === 1) });
const KIS = { ...KIS0, kapanisMaliyeti: { ...GORUNTU, kapanisGunu: "2026-04-02" } };
const DONMUS = [KIS, ...V.PARTILER.slice(1)];

function MH({ p0 = DONMUS, gorunum = "partiler", stock = V.STOCK, malzemeler = [MALZ], giderler = V.GIDERLER, standart = STANDART, showToast = vi.fn(), onState }) {
  const [uretimPartileri, setUretimPartileri] = useState(p0);
  onState?.(uretimPartileri);
  return <MakinaMaliyeti giderler={giderler} giderTurleri={V.TURLER} setGiderTurleri={vi.fn()} tedarikciler={[]} uretimPartileri={uretimPartileri}
    setUretimPartileri={setUretimPartileri} stock={stock} customers={V.CUSTOMERS} tumMusteriler={V.CUSTOMERS} parts={PARCALAR} malzemeler={malzemeler}
    standardModels={standart} customModels={V.OZEL} setStandardModels={vi.fn()} setCustomModels={vi.fn()} partStock={[]} rawParts={PARCALAR}
    appSettings={{ giderAyarlari: { yururlukAy: V.YURURLUK }, maliyetAyarlari: V.AYAR }} setAppSettings={vi.fn()} rates={{}} showToast={showToast} baslangicGorunum={gorunum} />;
}
const satir = (ad) => screen.getAllByTestId("parti-satiri").find(tr => within(tr).queryByText(ad));
const parti = (id) => fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: String(id) } });
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));

describe("Spec 0136: kapanış ekrandan (R1, R3/2, R8/2, R11/2, R23)", () => {
  it("AC-1: açık parti ekrandan kapatılınca görüntü kayda yazılır ve bildirim dondurmayı söyler", () => {
    let st; const showToast = vi.fn();
    render(<MH onState={s => { st = s; }} showToast={showToast} />);
    duzenle("Bahar");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-05" } });
    fireEvent.click(screen.getByText("Kaydet"));
    const b = st.find(p => p.id === 2);
    expect(b.kapanisMaliyeti).toMatchObject({ kapanisGunu: "2026-06-15", adet: 1 });
    expect(Object.keys(b.kapanisMaliyeti.makinalar)).toEqual(["stok:4"]);
    expect(showToast).toHaveBeenCalledWith(KAPANIS_DONDU_BILDIRIMI);
  });
  it("AC-53 (Karar 36): geçmişe bitişle kapatılan partinin havuzu kaydedilecek kayıtla kurulur, ekrandaki canlı havuz değil", () => {
    let st;
    render(<MH onState={s => { st = s; }} />);
    expect(within(satir("Bahar")).getByTestId("parti-havuz").textContent).toMatch(/^250,00 ₺/); // Mayıs 500 TL, partisiz P7 ile yarı yarıya
    duzenle("Bahar");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-04" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.find(p => p.id === 2).kapanisMaliyeti.havuzK).toBe(0);
  });
  it("AC-57: bitiş ayı gelecekteyse kaydedilmez, neden alanın altında", () => {
    let st;
    render(<MH onState={s => { st = s; }} />);
    duzenle("Bahar");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-08" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(GELECEK_BITIS_HATASI)).toBeTruthy();
    expect(st.find(p => p.id === 2).bitisAy).toBeNull();
  });
  it("AC-5 / AC-55: görüntü alınamazsa (katalog yok) kapanış yapılmaz ve nedeni bildirilir", () => {
    const set = vi.fn(); const showToast = vi.fn();
    render(<UretimPartileri uretimPartileri={V.PARTILER} setUretimPartileri={set} kapanisHavuzu={() => ({ aylar: new Map([["2026-04", 0], ["2026-05", 0]]), yururlukAy: "2026-01" })}
      kapanisGoruntusu={() => null} bugun={V.BUGUN} showToast={showToast} />);
    duzenle("Bahar");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-05" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(showToast).toHaveBeenCalledWith(KAPANIS_MALIYET_YOK, "err");
    expect(set).not.toHaveBeenCalled();
  });
  it("AC-72 / AC-73 / AC-9: donmuş partinin bitişi silinirken onay; iptal görüntüyü korur, onay anahtarı siler", () => {
    let st;
    render(<MH onState={s => { st = s; }} />);
    duzenle("Kış");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(YENIDEN_ACMA_ONAYI)).toBeTruthy();
    fireEvent.click(screen.getByText("Vazgeç"));
    expect(st.find(p => p.id === 1).kapanisMaliyeti).toEqual(KIS.kapanisMaliyeti);
    fireEvent.click(screen.getByText("Kaydet"));
    fireEvent.click(screen.getByText("Bitiş ayını sil"));
    const k = st.find(p => p.id === 1);
    expect(k.bitisAy).toBeNull();
    expect("kapanisMaliyeti" in k).toBe(false);
  });
  it("triyaj bulgu 2: donmuş partinin başlangıç ayı değişirken onay; iptal görüntüyü korur, onay yeniden dondurur ve bildirim bunu söyler", () => {
    let st; const showToast = vi.fn();
    render(<MH onState={s => { st = s; }} showToast={showToast} />);
    duzenle("Kış");
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2025-12" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(ARALIK_DEGISIM_ONAYI)).toBeTruthy();
    fireEvent.click(screen.getByText("Vazgeç"));
    expect(st.find(p => p.id === 1)).toMatchObject({ baslangicAy: "2026-01", kapanisMaliyeti: KIS.kapanisMaliyeti });
    fireEvent.click(screen.getByText("Kaydet"));
    fireEvent.click(screen.getByText("Yeniden dondur"));
    const k = st.find(p => p.id === 1);
    expect(k.baslangicAy).toBe("2025-12");
    expect(k.kapanisMaliyeti.kapanisGunu).toBe("2026-06-15");
    expect(showToast).toHaveBeenCalledWith(KAPANIS_YENIDEN_DONDU_BILDIRIMI);
  });
  it("triyaj bulgu 3: aralığı değişmeyen düzenlemede görüntü hesaplanmaz, var olan korunur", () => {
    const goruntu = vi.fn(() => ({ kapanisGunu: "2099-01-01", makinalar: {}, planlar: {} }));
    const set = vi.fn();
    render(<UretimPartileri uretimPartileri={DONMUS} setUretimPartileri={set} kapanisGoruntusu={goruntu} bugun={V.BUGUN} />);
    duzenle("Kış");
    fireEvent.change(screen.getByLabelText("Parti adı"), { target: { value: "Kış 2" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(goruntu).not.toHaveBeenCalled();
    expect(set.mock.calls[0][0](DONMUS).find(p => p.id === 1)).toMatchObject({ ad: "Kış 2", kapanisMaliyeti: KIS.kapanisMaliyeti });
  });
  it("AC-72: dondurulmamış partinin bitişi silinirken onay sorulmaz (Karar 44)", () => {
    let st;
    render(<MH p0={V.PARTILER} onState={s => { st = s; }} />);
    duzenle("Kış");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.queryByText(YENIDEN_ACMA_ONAYI)).toBeNull();
    expect(st.find(p => p.id === 1).bitisAy).toBeNull();
  });
});

describe("Spec 0136: Üretim Partileri (R10/2, R12/2, R22)", () => {
  it("AC-68 / AC-29 / AC-21: kapanma tarihi; dondurulmamışta kısa ibare; donmuş tutarlar görüntüden", () => {
    render(<MH p0={[{ ...KIS, kapanisMaliyeti: { ...KIS.kapanisMaliyeti, havuzK: 777700, makinaBasiK: 194425 } }, ...V.PARTILER.slice(1)]} />);
    expect(within(satir("Kış")).getByTestId("parti-kapanis-tarihi").textContent).toBe("Kapanış 02.04.2026");
    expect(within(satir("Kış")).queryByTestId("parti-dondurulmadi")).toBeNull();
    expect(within(satir("Eski")).getByTestId("parti-dondurulmadi").textContent).toBe(DONDURULMADI_KISA);
    expect(within(satir("Eski")).getByTestId("parti-dondurulmadi").getAttribute("title")).toBe(DONDURULMADI_IBARESI);
    expect(within(satir("Bahar")).queryByTestId("parti-kapanis-tarihi")).toBeNull();
    expect(within(satir("Kış")).getByTestId("parti-havuz").textContent).toMatch(/^7\.777,00 ₺/);
    expect(within(satir("Kış")).getByTestId("parti-makina-basi").textContent).toBe("1.944,25 ₺");
  });
  it("AC-22 / AC-69: kapanıştan sonra makina eklenince adet canlı, kapanıştaki adet yanında; tutar değişmez", () => {
    const stock = [...V.STOCK, { id: 8, model: "AK100", serialNo: "S8", partiId: 1, uretimTarihi: "2026-01-20" }];
    render(<MH stock={stock} />);
    const a = within(satir("Kış")).getByTestId("parti-adet");
    expect(a.textContent).toBe("5kapanışta 4");
    expect(within(satir("Kış")).getByTestId("parti-makina-basi").textContent).toBe("1.500,00 ₺");
  });
  it("AC-36 / AC-38: görüntüsüz veride kutu bugünkü metinle, görüntülü ve sapmasız veride kutu yok", () => {
    render(<MH p0={V.PARTILER} />);
    const kutu = screen.getByTestId("parti-degisimleri");
    expect(kutu.textContent).toContain(DEGISIM_BASLIGI);
    expect(kutu.textContent).toContain(DEGISIM_ALT_BASLIGI);
    expect(within(kutu).queryByTestId("sapma-duzeltme")).toBeNull();
    cleanup();
    // Donmuş Kış'ın ay havuzu görüntüsünü bugünküne eşitle: ay sapması da direkt sapması da yok.
    render(<MH p0={[{ ...KIS, kapanisGenelHavuzlari: { "2026-01": 100001, "2026-02": 200000, "2026-03": 300000 } }, ...V.PARTILER.slice(1, 3)]} />);
    expect(screen.queryByTestId("parti-degisimleri")).toBeNull();
  });
  it("AC-33 / AC-34 / AC-37 / AC-77 / AC-78 / AC-81 / AC-35: donmuş partide kutu yeni başlıkla; ay satırı, direkt ve pay satırları; düzeltme cümlesi", () => {
    const giderler = [...V.GIDERLER, { id: 9, tarih: "2026-02-20", turId: 1, tutar: 4000, kdvOrani: 0, modelSatirlari: [], taksitler: [] }];
    render(<MH malzemeler={[{ ...MALZ, kiloFiyati: 300 }]} giderler={giderler} />);
    const kutu = screen.getByTestId("parti-degisimleri");
    expect(kutu.textContent).toContain(SAPMA_BASLIGI);
    expect(kutu.textContent).toContain(SAPMA_ALT_BASLIGI);
    expect(within(kutu).getAllByTestId("parti-degisim-satiri").length).toBeGreaterThan(0);
    const d = within(kutu).getAllByTestId("parti-sapma-direkt");
    expect(d).toHaveLength(1);
    expect(d[0].firstChild.textContent).toBe(SAPMA_DIREKT_ETIKETI);
    expect(d[0].textContent).toMatch(/Kış · kapanışta .* bugün /);
    const p = within(kutu).getByTestId("parti-sapma-pay");
    expect(p.firstChild.textContent).toBe(SAPMA_PAY_ETIKETI);
    expect(p.textContent).toContain("kapanışta 6.000,01 ₺, bugün 10.000,01 ₺");
    expect(p.textContent).toContain("+ 4.000,00 ₺");
    expect(within(kutu).getByTestId("sapma-duzeltme").textContent).toBe(SAPMA_DUZELTME);
    expect(within(satir("Kış")).getByTestId("parti-makina-basi").textContent).toBe("1.500,00 ₺");
  });
});

describe("Spec 0136: Parti Hesabı (R10/4, R10/5, R12/2, R22/2, R24)", () => {
  it("AC-70 / AC-65 / AC-66: donmuş partide kapanış tarihli tek şerit; katsayı ipucu ve tedarik notu", () => {
    render(<MH gorunum="parti" />);
    expect(screen.getByTestId("donmus-serit").textContent).toBe("Rakamlar 02.04.2026 kapanışında donduruldu.");
    expect(screen.queryByTestId("dondurulmadi-serit")).toBeNull();
    expect(screen.getByTestId("donmus-katsayi").textContent).toBe(DONMUS_KATSAYI_IPUCU);
    expect(screen.getByTestId("donmus-tedarik").textContent).toBe(DONMUS_TEDARIK_NOTU);
  });
  it("AC-71 / AC-29: dondurulmamış kapanmış partide aynı yerde ibare, satır başına tekrar etmez; açık partide şerit yok", () => {
    render(<MH p0={V.PARTILER} gorunum="parti" />);
    expect(screen.getByTestId("dondurulmadi-serit").textContent).toBe(DONDURULMADI_IBARESI);
    expect(document.body.textContent.split("dondurulmadı").length - 1).toBe(1);
    expect(screen.queryByTestId("donmus-katsayi")).toBeNull();
    parti(2);
    expect(screen.queryByTestId("dondurulmadi-serit")).toBeNull();
    expect(screen.queryByTestId("donmus-serit")).toBeNull();
  });
  it("AC-74: kapanmış partide planlanan adetler düğmesi pasif ve nedenli; açıkta etkin", () => {
    render(<MH gorunum="parti" />);
    const d = screen.getByRole("button", { name: /Planlanan adetler/ });
    expect(d.disabled).toBe(true);
    expect(d.getAttribute("title")).toBe(PLAN_KAPALI_NEDENI);
    expect(screen.getByTestId("plan-kapali-nedeni").textContent).toBe(PLAN_KAPALI_NEDENI);
    parti(2);
    expect(screen.getByRole("button", { name: /Planlanan adetler/ }).disabled).toBe(false);
    expect(screen.queryByTestId("plan-kapali-nedeni")).toBeNull();
  });
  it("AC-25 / AC-12 / AC-14: kapanıştan sonra eklenen makina kendi satırında nedenle; donmuş satırlar malzeme zammından etkilenmez", () => {
    const stock = [...V.STOCK, { id: 8, model: "AK100", serialNo: "S8", partiId: 1, uretimTarihi: "2026-01-20" }];
    render(<MH gorunum="parti" />);
    const once = screen.getByTestId("parti-tablosu").textContent;
    cleanup();
    render(<MH gorunum="parti" malzemeler={[{ ...MALZ, kiloFiyati: 300 }]} />);
    expect(screen.getByTestId("parti-tablosu").textContent).toBe(once);
    cleanup();
    render(<MH gorunum="parti" stock={stock} />);
    const neden = screen.getAllByTestId("parti-satir-dondurulmadi");
    expect(neden).toHaveLength(1);
    expect(neden[0].textContent).toBe(DONDURULMAMIS_SATIR_NEDENI);
    expect(screen.getByTestId("donmus-serit")).toBeTruthy();
  });
});

describe("Spec 0136: dokunulmayan görünümler (R16, R18)", () => {
  it("AC-39 / AC-40: Model Maliyetleri ve Sipariş İhtiyacı donmuş partiden etkilenmez", () => {
    for (const g of ["modeller", "siparis"]) {
      render(<MH p0={V.PARTILER} gorunum={g} />);
      const a = document.body.textContent; cleanup();
      render(<MH gorunum={g} malzemeler={[MALZ]} />);
      expect(document.body.textContent, g).toBe(a); cleanup();
    }
  });
});
