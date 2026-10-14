// Spec 0084: kira stopajı beyan dönemi için ortak test verisi. AC-35'in "önce" çıktısı (tests/fixtures/0084-stopaj-once.json)
// bu veriyle, spec 0084'ten ÖNCEKİ kodla üretildi; veriyi değiştirmek altını geçersiz kılar. İçerik: 2026'nın ilk çeyreğinde üç
// stopajlı kira kalemi (biri vadeli, biri vadesiz, biri taksitli stopajlı), dördüncü çeyrekte bir kira, satırsız (eski) bir kira,
// stopajsız (oran 0) bir kira, normal ve personel kalemi, çöpteki ve yürürlük öncesi kira; ödeme hareketleri.
import { giderKalemDogrula, turHaritasi, HEDEF } from "../../src/lib/gider";

export const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Maaşlar", davranis: "personel" }];
export const turMap = turHaritasi(TURLER);
export const TEDARIKCILER = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Yıldız Gayrimenkul" }, { id: 13, ad: "Kuzey Depo" }];
export const AYAR = { yururlukAy: "2026-01", stopajOrani: 20 };
let n = 84000;
export const uid = () => ++n;
const kayit = (form) => {
  const r = giderKalemDogrula(form, { turMap, tedarikciler: TEDARIKCILER, uid });
  if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar));
  return r.kayit;
};
const kira = (o) => kayit({ turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 12, ...o });

export const K1 = kira({ id: 1, tarih: "2026-01-05", aciklama: "Ocak kirası", sonOdemeTarihi: "2026-01-10", stopajVade: "2026-04-26" });
export const K2 = kira({ id: 2, tarih: "2026-02-05", aciklama: "Şubat kirası", sonOdemeTarihi: "2026-02-10" });
export const K3 = kira({ id: 3, tarih: "2026-03-05", aciklama: "Mart kirası", sonOdemeTarihi: "2026-03-10", tedarikciId: 13, tutar: 30000,
  stopajTaksitSayisi: "2", stopajVade: "2026-04-20" });
export const K4 = kira({ id: 4, tarih: "2026-11-05", aciklama: "Kasım kirası", sonOdemeTarihi: "2026-11-10", stopajVade: "2027-01-26" });
// Satırsız (eski) kira: satır dizisi boş, stopaj okuma anında kalemin durumunu izler (0021 R13).
export const K5 = { id: 5, tarih: "2026-02-15", turId: 2, girisYonu: "brut", tutar: 10000, netTutar: 8000, stopajOrani: 20, kdvOrani: 0,
  tedarikciId: 13, aciklama: "Eski depo kirası", taksitler: [] };
export const K6 = kira({ id: 6, tarih: "2026-03-20", aciklama: "Stopajsız kira", stopajOrani: 0, tedarikciId: 13, tutar: 5000 });
export const K7 = kayit({ id: 7, tarih: "2026-02-12", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac levha", sonOdemeTarihi: "2026-02-28" });
export const K8 = kayit({ id: 8, tarih: "2026-02-28", turId: 3, calisanId: 21, calisanAd: "Deniz Ak", resmiTutar: 30000, eldenTutar: 0, sonOdemeTarihi: "2026-03-05" });
export const K9 = { ...kira({ id: 9, tarih: "2026-01-20", aciklama: "Çöpteki kira" }), deletedAt: "2026-02-01T10:00:00" };
export const K10 = kira({ id: 10, tarih: "2025-12-05", aciklama: "Yürürlük öncesi kira" });
export const GIDERLER = [K1, K2, K3, K4, K5, K6, K7, K8, K9, K10];
export const stopajSatirlari = (k) => k.taksitler.filter(t => t.hedef === HEDEF.STOPAJ);
export const ana = (k) => k.taksitler.find(t => t.hedef === HEDEF.ANA);
export const HESAPLAR = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 500000, acilisTarihi: "2026-01-01" }];
// K1'in stopajı ödenmiş (dönem kapanmadan erken), K3'ün ilk stopaj taksiti kısmen ödenmiş.
export const HAREKETLER = [
  { id: 901, tur: "odeme", tarih: "2026-01-10", tutar: 16000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: ana(K1).id },
  { id: 902, tur: "odeme", tarih: "2026-03-30", tutar: 4000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: stopajSatirlari(K1)[0].id },
  { id: 903, tur: "odeme", tarih: "2026-04-01", tutar: 1000, yontem: "Havale", hesapId: 51, giderId: 3, taksitId: stopajSatirlari(K3)[0].id },
];
export const BUGUN = "2026-05-10";
