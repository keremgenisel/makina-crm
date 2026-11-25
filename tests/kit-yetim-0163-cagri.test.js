// Spec 0163 AC-33 (C5, C1/2, P6): ad haritası tüketici başına BİR KEZ kurulur; satır başına katalog gezilmez. Ölçüm: hiçbir kitte
// geçmeyen katalog parçalarının `ad` alanı sayaçlı getter'dır. Çözücü kurulurken her parçanın adı tam bir kez okunur; model sayısı
// ya da kit satırı sayısı arttıkça okuma artmaz. (Kite giren parçaların adı gösterim için ayrıca okunur, o yüzden sayılmaz.)
import { describe, it, expect } from "vitest";
import { modelMaliyetleri, modelMaliyeti } from "../src/lib/makinaStandartMaliyet";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import { MALZEMELER, TEDARIKCILER } from "./fixtures/0163-veri.js";

const sayacli = (n) => {
  const sayac = { okuma: 0 };
  const parts = Array.from({ length: n }, (_, i) => {
    const p = { id: 5000 + i, maliyet: 1 };
    Object.defineProperty(p, "ad", { enumerable: true, get() { sayac.okuma++; return `Katalog ${i}`; } });
    return p;
  });
  return { parts, sayac };
};
const SOMUN = { id: 1, ad: "Somun", maliyet: 2 };
const modeller = (m, satir) => Array.from({ length: m }, (_, i) => ({ model: `M${i}`, defaultParcalar: Array.from({ length: satir }, (_, j) => ({ partId: j === 0 ? "1" : `90${j}`, ad: j === 0 ? "Somun" : `Yetim ${j}`, miktar: 1 })) }));

describe("Spec 0163 AC-33: ad haritası tüketici başına bir kez", () => {
  it("model maliyeti: 50 katalog parçası, 1 ya da 40 model, 1 ya da 30 satır → her parçanın adı tam bir kez okunur", () => {
    for (const [m, s] of [[1, 1], [40, 30]]) {
      const { parts, sayac } = sayacli(50);
      modelMaliyetleri({ standardModels: modeller(m, s), customModels: [], parts: [SOMUN, ...parts], malzemeler: [] }, 0);
      expect(sayac.okuma).toBe(50);
    }
  });
  it("aynı harita ile modelMaliyeti'nin ardışık çağrıları ad haritasını yeniden kurmaz (WeakMap, P1)", () => {
    const { parts, sayac } = sayacli(20);
    const partMap = new Map([SOMUN, ...parts].map(p => [String(p.id), p]));
    for (const m of modeller(25, 5)) modelMaliyeti(m, partMap, 0);
    expect(sayac.okuma).toBe(20);
  });
  it("sipariş ihtiyacı: model ve satır sayısından bağımsız tek kurulum", () => {
    for (const [m, s] of [[1, 1], [30, 20]]) {
      const { parts, sayac } = sayacli(50);
      const md = modeller(m, s);
      siparisIhtiyaci({ modeller: md, satirlar: md.map(x => ({ model: x.model, adet: "2" })), parts: [SOMUN, ...parts], partStock: [], malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER }, { tedarikciOdakli: true });
      expect(sayac.okuma).toBe(50);
    }
  });
});
