// Spec 0097 AC-52, C12 (plan P12): Parti Hesabı'nın tarihli hesabı makina başına değil belirgin (model, üretim günü) başına yapılır.
// Sayaç tek okuma yolunun TARİHLİ çağrılarını sayar (`urunAgaci.parcaMaliyetKurus(p, tarih)`, kit satırı başına bir çağrı); beklenen
// çağrı sayısı = belirgin (model, gün) × kit satırı. Süre eşiği 0090 AC-52 emsaliyle 2 sn (0088'de süre ölçümü yok).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi } from "vitest";

const sayac = vi.hoisted(() => ({ tarihli: 0 }));
vi.mock("../src/lib/urunAgaci", async (orijinal) => {
  const m = await orijinal();
  return { ...m, parcaMaliyetKurus: (p, tarih) => { if (tarih !== undefined) sayac.tarihli++; return m.parcaMaliyetKurus(p, tarih); } };
});
const { partiHesabi, partiGenelPaylari, modelMaliyetleri } = await import("../src/lib/makinaStandartMaliyet");

describe("Spec 0097: süre ve çağrı sayısı (C12)", () => {
  it("AC-52: 600 makina, 3 model, 20 belirgin gün; tarihli okuma (model, gün) × kit satırı kadar, makina sayısı kadar değil", () => {
    const parts = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, ad: `P${i + 1}`, maliyet: 10 + i,
      maliyetGecmisi: [{ gecerli: "", kurus: 900 + i }, { gecerli: "2026-03-01", kurus: 1000 + i * 100 }] }));
    const kit = (bas) => Array.from({ length: 10 }, (_, i) => ({ partId: String(bas + i), miktar: 1 + (i % 3) }));
    const standardModels = [{ model: "A", defaultParcalar: kit(1) }, { model: "B", defaultParcalar: kit(11) }, { model: "C", defaultParcalar: kit(21) }];
    const gunler = Array.from({ length: 20 }, (_, i) => `2026-${String(1 + (i % 5)).padStart(2, "0")}-${String(1 + i).padStart(2, "0")}`);
    const stock = Array.from({ length: 600 }, (_, i) => ({ id: i + 1, model: ["A", "B", "C"][i % 3], serialNo: `S${i}`, partiId: 1, uretimTarihi: gunler[i % 20] }));
    const veri = { giderler: [], giderTurleri: [], tedarikciler: [], stock, customers: [], partStockLog: [], yururlukAy: "2026-01",
      uretimPartileri: [{ id: 1, ad: "Büyük", baslangicAy: "2026-01", bitisAy: "2026-05" }] };
    const katalog = { parts, standardModels, customModels: [] };
    const modeller = modelMaliyetleri(katalog, 0);
    const partiPay = partiGenelPaylari(veri, "2026-06-15").partiler[0];
    const belirgin = new Set(stock.map(s => `${s.model}|${s.uretimTarihi}`)).size;
    sayac.tarihli = 0;
    const t0 = performance.now();
    const h = partiHesabi(veri.uretimPartileri[0], veri, { payK: 0, modeller, bugun: "2026-06-15", katalog, partiPay });
    const sure = performance.now() - t0;
    console.log(`AC-52: ${Math.round(sure)} ms, tarihli okuma ${sayac.tarihli} (belirgin (model, gün) ${belirgin}, makina ${stock.length})`);
    expect(sure).toBeLessThan(2000);
    expect(sayac.tarihli).toBe(belirgin * 10);
    expect(h.satirlar.reduce((a, r) => a + r.adet, 0)).toBe(600);
  });
});
