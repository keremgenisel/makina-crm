// Spec 0155 C8/2: tedarikçi avansı OLMAYAN veride bütün çıktıların kıyas verisi (0059'un genişletilmiş düzeneği: çalışan
// avansı ve mahsubu, hesapsız avans, döviz ödeme, ciro, vergi dairesi ödemesi). Altın `tests/fixtures/0155-once.json` bu
// veriyle spec ÖNCESİ koddan üretildi; veriyi değiştirmek altını geçersiz kılar.
import { girdi as girdi0059, GIDERLER, H, HESAPLAR, turler, tedarikciler, turMap, CEKLER, PAYMENTS, SERVICES, PART_SALES, CUSTOMERS } from "./0059-veri";
import { odemeleriUygula } from "../../src/lib/gider";

export { GIDERLER, HESAPLAR, turler, tedarikciler, turMap };
// Döviz hesaptan TL kaleme döviz ödeme (0152) ve çalışan avansının döviz alanı olmayan hâli.
export const HAREKETLER = [...H, { id: 130, tur: "odeme", tarih: "2026-09-24", tutar: 1000, yontem: "Havale", hesapId: 53, giderId: 6, taksitId: null, dovizTutar: 25, kur: 40, paraBirimi: "USD" }];
export const BUGUN = "2026-09-30";
export const AYAR = { turler, tedarikciler, yururlukAy: "2026-01" };
export const ZENGIN = odemeleriUygula(GIDERLER, HAREKETLER, turMap);
export const VERI = { payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, yedekParcaSatislar: [], customers: CUSTOMERS, dealers: [], factory: { name: "Altuntaş Makina" }, bugun: BUGUN, cekler: CEKLER };
export const girdi = (o = {}) => girdi0059({ hareketler: HAREKETLER, ...o });
