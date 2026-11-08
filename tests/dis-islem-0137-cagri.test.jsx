// Spec 0137 R34 (AC-112, 0136 AC-19'un ikizi): tamamen donmuş partinin gösterilen rakamları okunurken dış işlem motoru çağrılmaz
// (tek okuma yolu `disIslem.islemKalemiOzeti` sayılır); görüntüsüz partide çağrılır (ölçüm duyarlı). AC-54: kapanmış partinin donmuş
// maliyeti işlem fiyatı sonradan değişse de değişmez (0136 ile çapraz); donmamış parti yeni fiyatı okur.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi } from "vitest";

const sayac = vi.hoisted(() => ({ islem: 0 }));
vi.mock("../src/lib/disIslem", async (orijinal) => {
  const m = await orijinal();
  return { ...m, islemKalemiOzeti: (...a) => { sayac.islem++; return m.islemKalemiOzeti(...a); } };
});
const { partiGenelPaylari, partiHesabi, partiKapanisGoruntusu, modelMaliyetleri } = await import("../src/lib/makinaStandartMaliyet");
const V = await import("./fixtures/0136-veri");

// 0136 verisine katalog bağlı işlem kalemli bir parça eklenir: AK100 kiti 1 × "Isıl işlemli pim" (2 adet × işlem fiyatı).
const ISLEM = { id: 901, ad: "Isıl İşlem", birim: "adet", birimFiyati: 20 };
const PIM = { id: 9, ad: "Isıl işlemli pim", models: ["AK100"], maliyetKalemleri: [{ tur: "islem", islemId: 901, miktar: 2 }] };
const STANDART = [{ ...V.STANDART[0], defaultParcalar: [...V.STANDART[0].defaultParcalar, { partId: "9", ad: "Isıl işlemli pim", miktar: 1 }] }];
const katalog = (disIslemler) => ({ parts: [...V.PARCALAR, PIM], disIslemler, standardModels: STANDART, customModels: V.OZEL });
const modeller = (disIslemler) => modelMaliyetleri({ ...katalog(disIslemler) }, 65000, {});
const KIS0 = V.PARTILER[0];
const veri0 = V.veri();
const pay = partiGenelPaylari(veri0, V.BUGUN).partiler.find(p => p.id === 1);
const GORUNTU = partiKapanisGoruntusu(veri0, KIS0, V.BUGUN, { katalog: katalog([ISLEM]), modeller: modeller([ISLEM]), partiPay: pay });
const KIS = { ...KIS0, kapanisMaliyeti: GORUNTU };
const veriD = V.veri({ uretimPartileri: [KIS, ...V.PARTILER.slice(1)] });
const hesap = (parti, v, disIslemler) => partiHesabi(parti, v, { payK: 65000, modeller: modeller(disIslemler), bugun: V.BUGUN, katalog: katalog(disIslemler), partiPay: pay });

describe("Spec 0137: çağrı sayacı ve donmuş maliyet", () => {
  it("AC-112: tamamen donmuş partide dış işlem motoru çağrılmaz; görüntüsüz partide çağrılır (ölçüm duyarlı)", () => {
    const m = modeller([ISLEM]); // model maliyeti listesi (bugünkü) önceden kurulur; sayılan yalnız parti hesabının kendisi
    sayac.islem = 0;
    const h = partiHesabi(KIS, veriD, { payK: 65000, modeller: m, bugun: V.BUGUN, katalog: katalog([ISLEM]), partiPay: pay });
    expect(h.dondurma.dondurulmamis).toBe(0);
    expect(sayac.islem).toBe(0);
    partiHesabi(KIS0, veri0, { payK: 65000, modeller: m, bugun: V.BUGUN, katalog: katalog([ISLEM]), partiPay: pay });
    expect(sayac.islem).toBeGreaterThan(0);
  });
  it("AC-54: işlem fiyatı sonradan 20 → 35 olsa da donmuş partinin direkt maliyeti değişmez; donmamış parti yeni fiyatı okur", () => {
    const zamli = [{ ...ISLEM, birimFiyati: 35 }];
    const donmus = (d) => hesap(KIS, veriD, d).satirlar.map(s => [s.model, s.direktK]);
    expect(donmus(zamli)).toEqual(donmus([ISLEM]));
    const canli = (d) => hesap(KIS0, veri0, d).satirlar.filter(s => s.direktK != null).map(s => s.direktK);
    const once = canli([ISLEM]); const sonra = canli(zamli);
    expect(sonra.some((k, i) => k !== once[i])).toBe(true);
    // Görüntü işlem bedelini içerir (2 adet × 20 TL = 40 TL makina başına fark), yani dondurulan rakam işlemsiz rakam değildir.
    const islemsiz = partiKapanisGoruntusu(veri0, KIS0, V.BUGUN, { katalog: katalog([]), modeller: modeller([]), partiPay: pay });
    const fark = Object.keys(GORUNTU.makinalar).map(k => (GORUNTU.makinalar[k].direktK ?? 0) - (islemsiz.makinalar[k].direktK ?? 0)).filter(x => x);
    expect(fark.length).toBeGreaterThan(0);
  });
});
