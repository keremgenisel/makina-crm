// Spec 0088 AC-42 (plan adım 1): bugünkü maliyet modelinin ve Dönem Raporu'nun çıktısını spec ÖNCESİ kodla üretir.
// 0076 veri kümesi kullanılır; KAT yönteminin dört sınır değeri (katDegeriDogrula çıkarılırken çıktı aynı kalsın) eklenir.
import { writeFileSync } from "node:fs";
import { motorCiktilari } from "../../tests/fixtures/0076-veri.js";
import { hesaplaMakinaMaliyetleri, fiyatOnerisi } from "../../src/lib/makinaMaliyeti.js";
import { TURLER, MODELLER, STOCK, CUSTOMERS, PARTILER, GIDERLER, BUGUN } from "../../tests/fixtures/0076-veri.js";
const gercek = hesaplaMakinaMaliyetleri({ customers: CUSTOMERS, stock: STOCK, giderler: GIDERLER, giderTurleri: TURLER, standardModels: MODELLER,
  uretimPartileri: PARTILER, giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: BUGUN });
const kat = Object.fromEntries(["2", "0,8", 0.8, 0, -1, "", "abc"].map(d => [String(d), fiyatOnerisi(gercek, { model: "AK100", baslangic: "2026-01-01", bitis: "2026-12-31", yontem: "kat", deger: d })]));
writeFileSync("tests/fixtures/0088-maliyet-once.json", JSON.stringify({ motor: motorCiktilari(), kat }, null, 2) + "\n");
console.log("yazildi");
