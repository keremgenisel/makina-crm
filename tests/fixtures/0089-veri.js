// Spec 0089: Giderler'in iki görünümü kalkarken Dönem Raporu'nun değişmediğini ölçen ortak veri (AC-9, AC-13, AC-16, AC-17).
// Kapsadığı durumlar: iki modeli silinmiş tek kalem (dusenAtamalar'da iki kayıt, bir kalem; R12 benzersiz kalem sayar),
// takip edilemeyen makinaya atanmış kalem, geçerli makina ataması, kısıtlı (binek araç) kalem, aylara dağıtılmış kalem,
// stopajlı kira, personel ve "dağıtılmasın". Altın çıktı (tests/fixtures/0089-donem-raporu-once.json) bu veriyle,
// spec 0089'dan ÖNCEKİ kodla üretildi; veriyi değiştirmek altını geçersiz kılar.
import { giderKalemDogrula, turHaritasi, ATAMA } from "../../src/lib/gider";

export const TURLER = [
  { id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Fabrika kirası", davranis: "kira" },
  { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Yakıt", davranis: "normal" },
];
const turMap = turHaritasi(TURLER);
export const TED = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Akaryakıt AŞ" }];
export const STANDART = [{ model: "AK100" }];
export const OZEL = [{ model: "COP", deletedAt: "2026-09-01T00:00:00.000Z" }];
export const STOCK = [{ id: 501, model: "AK100", serialNo: "T1", uretimTarihi: "2026-09-01" }];
let nid = 8900;
const k = (f, ek = {}) => {
  const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++nid });
  if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar));
  return { ...r.kayit, ...ek };
};
export const KALEMLER = [
  // İki silinmiş model satırı: dusenAtamalar'da iki kayıt, tek kalem.
  k({ id: 1, tarih: "2026-10-01", turId: 1, tutar: 1000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac", sonOdemeTarihi: "2026-10-20" },
    { atamaTur: ATAMA.MODEL, modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 300, adet: 1 }, { modelAd: "COP", birimMaliyet: 100, adet: 1 }, { modelAd: "SILINEN", birimMaliyet: 50, adet: 2 }] }),
  // Takip edilemeyen makina.
  k({ id: 2, tarih: "2026-10-02", turId: 1, tutar: 400, kdvOrani: 20, tedarikciId: 11, aciklama: "Rulman" }, { atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 999 }),
  // Geçerli makina ataması.
  k({ id: 3, tarih: "2026-10-03", turId: 1, tutar: 600, kdvOrani: 20, tedarikciId: 11, aciklama: "Motor" }, { atamaTur: ATAMA.MAKINA, makinaTur: "stok", makinaId: 501 }),
  k({ id: 4, tarih: "2026-10-04", turId: 4, tutar: 2000, kdvOrani: 20, tedarikciId: 12, aciklama: "Binek yakıt", kisitliGider: true, indirilebilirOran: 70 }),
  k({ id: 5, tarih: "2026-10-05", turId: 1, tutar: 1200, kdvOrani: 20, tedarikciId: 11, aciklama: "Yıllık sigorta", dagitimAy: 12 }),
  k({ id: 6, tarih: "2026-10-01", turId: 2, tutar: 20000, stopajOrani: 20, girisYonu: "brut", kdvOrani: 0, tedarikciId: 11, aciklama: "Ekim kira" }),
  k({ id: 7, tarih: "2026-10-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 0, sonOdemeTarihi: "2026-10-05" }),
  k({ id: 8, tarih: "2026-10-06", turId: 1, tutar: 300, kdvOrani: 20, tedarikciId: 11, aciklama: "Bağış" }, { atamaTur: ATAMA.DAGITMA }),
];
export const HAREKET = [{ id: 90, tur: "odeme", tarih: "2026-10-02", tutar: 500, hesapId: null, giderId: 1, taksitId: null, yontem: "Havale" }];
export const KDV = [{ from: "2000-01-01", rate: 20 }];
export const SATIS = { customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] };
export const BUGUN = "2026-10-17";
export const DONEM = { baslangic: "2026-10-01", bitis: "2026-10-31" };
export const canliModeller = new Set(["ak100"]);
export const raporGirdisi = (o = {}) => ({ giderler: KALEMLER, turler: TURLER, tedarikciler: TED, stock: STOCK, customers: [], canliModeller, yururlukAy: "2026-01", ...o });
