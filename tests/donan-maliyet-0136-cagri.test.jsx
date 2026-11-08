// @vitest-environment jsdom
// Spec 0136 AC-19, AC-82 (plan turu Karar 42) ve AC-80: tamamen donmuş partinin gösterilen rakamları okunurken parça ve malzeme
// motorları çağrılmaz (tek okuma yolu `urunAgaci.parcaMaliyetKurus` ve malzeme motoru `malzeme.malzemeOzeti` sayılır; ekran
// düzeyindeki hesaplar, parti payı hesabı ve tedarik kutusunun gider okuması sayıma girmez). Sapma hesabı Üretim Partileri
// görünümünde bir kez çalışır, Parti Hesabı'nda hiç çalışmaz.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const sayac = vi.hoisted(() => ({ parca: 0, malzeme: 0, sapma: 0 }));
vi.mock("../src/lib/urunAgaci", async (orijinal) => {
  const m = await orijinal();
  return { ...m, parcaMaliyetKurus: (...a) => { sayac.parca++; return m.parcaMaliyetKurus(...a); } };
});
vi.mock("../src/lib/malzeme", async (orijinal) => {
  const m = await orijinal();
  return { ...m, malzemeOzeti: (...a) => { sayac.malzeme++; return m.malzemeOzeti(...a); } };
});
vi.mock("../src/lib/makinaStandartMaliyet", async (orijinal) => {
  const m = await orijinal();
  return { ...m, partiMaliyetSapmalari: (...a) => { sayac.sapma++; return m.partiMaliyetSapmalari(...a); } };
});
vi.mock("../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
const { partiGenelPaylari, partiHesabi, partiKapanisGoruntusu, modelMaliyetleri } = await import("../src/lib/makinaStandartMaliyet");
const { MakinaMaliyeti } = await import("../src/components/MakinaMaliyeti");
const V = await import("./fixtures/0136-veri");

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-15T10:00:00")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const MALZ = { id: 2, ad: "8620", ozgulAgirlik: 7.85, kiloFiyati: 100 };
const PARCALAR = [...V.PARCALAR, { id: 3, ad: "Mil", models: ["AK100"], malzemeSatiri: { malzemeId: 2, bicim: "mil", cap: 20, boy: 100 } }];
const STANDART = [{ ...V.STANDART[0], defaultParcalar: [...V.STANDART[0].defaultParcalar, { partId: "3", ad: "Mil", miktar: 1 }] }];
const katalog = { parts: PARCALAR, malzemeler: [MALZ], standardModels: STANDART, customModels: V.OZEL };
const modeller = modelMaliyetleri({ ...katalog }, 65000, {});
const KIS0 = V.PARTILER[0];
const veri0 = V.veri();
const GORUNTU = partiKapanisGoruntusu(veri0, KIS0, V.BUGUN, { katalog, modeller, partiPay: partiGenelPaylari(veri0, V.BUGUN).partiler.find(p => p.id === 1) });
const KIS = { ...KIS0, kapanisMaliyeti: GORUNTU };
const veriD = V.veri({ uretimPartileri: [KIS, ...V.PARTILER.slice(1)] });

describe("Spec 0136: çağrı sayacı", () => {
  it("AC-19 / AC-82: tamamen donmuş partide parça ve malzeme motoru çağrılmaz; görüntüsüz partide çağrılır (ölçüm duyarlı)", () => {
    const partiPay = partiGenelPaylari(veriD, V.BUGUN).partiler.find(p => p.id === 1);
    sayac.parca = 0; sayac.malzeme = 0;
    const h = partiHesabi(KIS, veriD, { payK: 65000, modeller, bugun: V.BUGUN, katalog, partiPay });
    expect(h.dondurma.dondurulmamis).toBe(0);
    expect([sayac.parca, sayac.malzeme]).toEqual([0, 0]);
    partiHesabi(KIS0, veri0, { payK: 65000, modeller, bugun: V.BUGUN, katalog, partiPay });
    expect(sayac.parca).toBeGreaterThan(0);
    expect(sayac.malzeme).toBeGreaterThan(0);
  });
  // App bütün dizileri kararlı referansla verir; varsayılan `[]` her çizimde yeni dizi olurdu, test de kararlı dizi geçirir.
  const LOG = [];
  const MALZEMELER = [MALZ];
  const AYARLAR = { giderAyarlari: { yururlukAy: V.YURURLUK }, maliyetAyarlari: V.AYAR };
  const oge = (gorunum) => (<MakinaMaliyeti giderler={V.GIDERLER} giderTurleri={V.TURLER} setGiderTurleri={vi.fn()} tedarikciler={LOG}
    uretimPartileri={veriD.uretimPartileri} setUretimPartileri={vi.fn()} stock={V.STOCK} customers={V.CUSTOMERS} tumMusteriler={V.CUSTOMERS} partStockLog={LOG}
    parts={PARCALAR} malzemeler={MALZEMELER} standardModels={STANDART} customModels={V.OZEL} setStandardModels={vi.fn()} setCustomModels={vi.fn()}
    appSettings={AYARLAR} setAppSettings={vi.fn()} rates={{}} showToast={vi.fn()} baslangicGorunum={gorunum} />);
  const ekran = (gorunum) => render(oge(gorunum));
  it("AC-80: sapma hesabı Üretim Partileri'nde bir kez, Parti Hesabı'nda hiç çalışmaz", () => {
    sayac.sapma = 0;
    const r = ekran("partiler");
    expect(sayac.sapma).toBe(1);
    // Triyaj (bulgu 3): aynı prop'larla yeniden çizim sapmayı yeniden koşturmaz.
    r.rerender(oge("partiler")); r.rerender(oge("partiler"));
    expect(sayac.sapma).toBe(1);
    cleanup();
    sayac.sapma = 0;
    ekran("parti");
    expect(sayac.sapma).toBe(0);
  });
});
