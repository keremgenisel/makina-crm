// Spec 0140 A: parçanın Ana tedarikçisi (saf). Alan adı ve kalem bağından ayrılığı (AC-56), maliyet ve fiyata girmemesi (AC-6),
// birleştirmede remap (AC-10), koruma haritası (A-R5, A-R5/2), ad listesi ve cümle seçici (AC-60, AC-61), çöpe atma penceresini
// besleyen kullanımın bağı "silinemez" saymaması (AC-57).
import { describe, it, expect } from "vitest";
import { kalemdeGecenTedarikciler, tedarikciKullanim, korumaAdListesi, tedarikciKorumaCumlesi, tedarikciKorumaSatiri,
  KALEMDE_TEDARIKCI_NEDENI, ANA_TEDARIKCI_NEDENI, MALZEME_TEDARIKCI_NEDENI } from "../src/lib/gider";
import { parcaMaliyetKurus } from "../src/lib/urunAgaci";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { buildMergePlan } from "../src/lib/merge";
import { uid } from "../src/lib/utils";
import { parcaTedarikciIdleri } from "../src/components/PartManager";
import { kalemTedarikciIdleri } from "../src/lib/maliyetKalemleri";

const islem = (tedarikciId, tutar = 10) => ({ tur: "islem", ad: "Kaplama", tedarikciId, tutar });

describe("Spec 0140 A: alan ve bağımsızlık", () => {
  it("AC-56: Ana tedarikçi kök alan `tedarikciId`; kalem bağı ayrı okunur, süzgeç kümesi ikisinin birleşimi", () => {
    const p = { id: 1, ad: "Rulman", tedarikciId: 12, maliyetKalemleri: [islem(31)] };
    expect(kalemTedarikciIdleri(p)).toEqual(["31"]);
    expect(parcaTedarikciIdleri(p).sort()).toEqual(["12", "31"]);
    expect(parcaTedarikciIdleri({ id: 2, tedarikciId: "" })).toEqual([]);
    expect(parcaTedarikciIdleri({ id: 3, tedarikciId: 31, maliyetKalemleri: [islem(31)] })).toEqual(["31"]);
  });
  it("AC-6: Ana tedarikçi maliyeti ve satış fiyatını değiştirmez", () => {
    const yalin = { id: 1, ad: "Rulman", maliyet: 120, fiyatTRY: 300, fiyatKipi: "maliyet", karKati: 2 };
    const anali = { ...yalin, tedarikciId: 12 };
    expect(parcaMaliyetKurus(anali)).toBe(parcaMaliyetKurus(yalin));
    const b = (p) => fiyatBaglamiKur({ parts: [p], malzemeler: [], fiyatAyarlari: { varsayilanKat: 2 } });
    expect(parcaSatisFiyati(anali, "TRY", b(anali))).toEqual(parcaSatisFiyati(yalin, "TRY", b(yalin)));
  });
});

describe("Spec 0140 A: koruma haritası (A-R5, A-R5/2)", () => {
  const parts = [{ id: 1, ad: "Rulman", tedarikciId: 12 }, { id: 2, ad: "Motor", tedarikciId: 12, deletedAt: "x" },
    { id: 3, ad: "Mil", maliyetKalemleri: [islem(31)] }];
  const malzemeler = [{ id: 501, ad: "304 Paslanmaz", tedarikciId: 13 }, { id: 502, ad: "Eski çelik", tedarikciId: 13, deletedAt: "x" }];
  it("AC-7 / AC-8 / AC-59: Ana tedarikçi (çöpteki parça dahil) ve malzemenin Ana tedarikçisi haritada", () => {
    const h = kalemdeGecenTedarikciler(parts, malzemeler);
    expect([...h.keys()].sort()).toEqual(["12", "13", "31"]);
    expect(h.get("12")).toMatchObject({ parca: 0, ana: 2, anaCop: 1, malzeme: 0 });
    expect(h.get("13")).toMatchObject({ parca: 0, ana: 0, malzeme: 2, malzemeCop: 1 });
    expect(h.get("31")).toMatchObject({ parca: 1, cop: 0, ana: 0 });
  });
  it("Malzemesiz eski çağrı aynı kalem sayılarını verir", () => {
    const h = kalemdeGecenTedarikciler([parts[2]]);
    expect(h.get("31")).toMatchObject({ parca: 1, cop: 0 });
    expect(h.size).toBe(1);
  });
  it("AC-57: çöpe atma penceresini besleyen kullanım Ana ve malzeme bağını silinemez saymaz (parca = kalem bağı)", () => {
    const k = tedarikciKullanim(12, [], [], parts, kalemdeGecenTedarikciler(parts, malzemeler));
    expect(k.parca).toBe(0);
    expect(k.ana).toBe(2); expect(k.anaCop).toBe(1);
    expect(tedarikciKullanim(31, [], [], parts).parca).toBe(1);
  });
  it("AC-60: cümle seçici kalem > Ana > malzeme; bildirim cümlesinde ad yok", () => {
    expect(tedarikciKorumaCumlesi({ parca: 1, ana: 1, malzeme: 1 })).toBe(KALEMDE_TEDARIKCI_NEDENI);
    expect(tedarikciKorumaCumlesi({ parca: 0, ana: 1, malzeme: 1 })).toBe(ANA_TEDARIKCI_NEDENI);
    expect(tedarikciKorumaCumlesi({ parca: 0, ana: 0, malzeme: 1 })).toBe(MALZEME_TEDARIKCI_NEDENI);
    expect(tedarikciKorumaCumlesi(undefined)).toBeNull();
    for (const c of [KALEMDE_TEDARIKCI_NEDENI, ANA_TEDARIKCI_NEDENI, MALZEME_TEDARIKCI_NEDENI]) expect(c).not.toMatch(/Rulman|Motor/);
  });
  it("AC-61: ad listesi en çok üç ad + 've n parça daha'; çöpteki '(silinmiş parça)'", () => {
    const ad = (a, cop = false) => ({ ad: a, cop });
    expect(korumaAdListesi([ad("A"), ad("B", true)])).toBe("A, B (silinmiş parça)");
    expect(korumaAdListesi([ad("A"), ad("B"), ad("C"), ad("D"), ad("E")])).toBe("A, B, C ve 2 parça daha");
    expect(korumaAdListesi([ad("X", true)], "malzeme")).toBe("X (silinmiş malzeme)");
    const satir = tedarikciKorumaSatiri(kalemdeGecenTedarikciler(parts, malzemeler).get("12"));
    expect(satir).toBe(`${ANA_TEDARIKCI_NEDENI} Parçalar: Rulman, Motor (silinmiş parça).`);
    expect(tedarikciKorumaSatiri(kalemdeGecenTedarikciler(parts, malzemeler).get("13")))
      .toBe(`${MALZEME_TEDARIKCI_NEDENI} Malzemeler: 304 Paslanmaz, Eski çelik (silinmiş malzeme).`);
  });
});

describe("Spec 0140 A: birleştirme (C7)", () => {
  it("AC-10: yeniden kimlik alan tedarikçiye bakan yeni parçanın Ana tedarikçisi yeni kimliği taşır; sunucuda var olan kimlik değişmez", () => {
    const tedId = uid(), parcaId = uid(), parca2 = uid();
    const yerel = { tedarikciler: [{ id: tedId, ad: "Yerel Rulman" }],
      parts: [{ id: parcaId, ad: "Yeni rulman", models: [], tedarikciId: tedId }, { id: parca2, ad: "Yeni motor", models: [], tedarikciId: 31 }] };
    const sunucu = { tedarikciler: [{ id: tedId, ad: "Başka firma" }, { id: 31, ad: "Demir" }], parts: [] };
    const plan = buildMergePlan(yerel, sunucu);
    const yeniTed = plan.adds.tedarikciler.find(t => t.ad === "Yerel Rulman");
    expect(yeniTed.id).not.toBe(tedId);
    expect(plan.adds.parts.find(p => p.ad === "Yeni rulman").tedarikciId).toBe(yeniTed.id);
    expect(plan.adds.parts.find(p => p.ad === "Yeni motor").tedarikciId).toBe(31);
  });
});
