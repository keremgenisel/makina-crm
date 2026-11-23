// Spec 0156: tedarikçi ve çalışan ekstresi ayrıntısının ortak test verisi. Bütün vergi biçimleri tek tedarikçide (11):
// normal KDV'li kısmen ödenmiş, tevkifatlı, kira stopajlı, kısıtlı (binek), döviz (USD ödemeli), taksitli, KDV'si kuruşa
// yuvarlanınca sıfıra inen, göç hareketli, hiç ödenmemiş; çalışan (21) maaş, ödeme, mahsup ve avansla. Kıyas altını
// (`tests/fixtures/0156-once.json`) bu veriyle spec ÖNCESİ koddan üretildi; veriyi değiştirmek altını geçersiz kılar.
import { giderKalemDogrula, turHaritasi, HEDEF, odemeleriUygula } from "../../src/lib/gider";

export const turler = [
  { id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Maaşlar", davranis: "personel" },
  { id: 4, ad: "Yakıt", davranis: "normal" },
];
export const turMap = turHaritasi(turler);
export const tedarikciler = [{ id: 11, ad: "Sistem Civata" }, { id: 12, ad: "Boş Tedarik" }];
let n = 9000;
const uid = () => ++n;
const kayit = (form) => {
  const r = giderKalemDogrula({ turId: 1, tedarikciId: 11, ...form }, { turMap, tedarikciler, uid });
  if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar));
  return r.kayit;
};
export const NORMAL = kayit({ id: 1, tarih: "2026-09-02", tutar: 10000, kdvOrani: 20, aciklama: "M8 cıvata kolisi uzun açıklamalı bir fatura satırı", sonOdemeTarihi: "2026-09-20" });
export const TEVKIFAT = kayit({ id: 2, tarih: "2026-09-05", tutar: 20000, kdvOrani: 20, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, aciklama: "Montaj hizmeti" });
export const KIRA = kayit({ id: 3, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 20, aciklama: "Depo kirası", stopajVade: "2026-10-26" });
export const KISITLI = kayit({ id: 4, tarih: "2026-09-08", turId: 4, tutar: 5000, kdvOrani: 20, kisitliGider: true, indirilebilirOran: 70, aciklama: "Binek yakıt" });
export const DOVIZ = kayit({ id: 5, tarih: "2026-09-10", tutar: "1.000", paraBirimi: "USD", kur: "40", kdvOrani: 20, aciklama: "İthal rulman" });
export const TAKSITLI = kayit({ id: 6, tarih: "2026-09-12", tutar: 12000, kdvOrani: 0, taksitSayisi: 3, sonOdemeTarihi: "2026-10-12", aciklama: "Pres kalıbı" });
export const SIFIR_KDV = kayit({ id: 7, tarih: "2026-09-14", tutar: "0,40", kdvOrani: 1, aciklama: "Pul" });
export const GOC = kayit({ id: 8, tarih: "2026-08-20", tutar: 3000, kdvOrani: 0, aciklama: "Eski fatura" });
export const ODENMEMIS = kayit({ id: 9, tarih: "2026-09-25", tutar: 1500, kdvOrani: 20, aciklama: "Somun" });
export const PERSONEL = kayit({ id: 20, tarih: "2026-09-30", turId: 3, tedarikciId: null, calisanId: 21, calisanAd: "Çalışan", resmiTutar: 30000, eldenTutar: 5000,
  ekOdemeler: [{ tur: "prim", aciklama: "Prim", resmiTutar: 2000, eldenTutar: "" }], sonOdemeTarihi: "2026-10-05" });
export const GIDERLER = [NORMAL, TEVKIFAT, KIRA, KISITLI, DOVIZ, TAKSITLI, SIFIR_KDV, GOC, ODENMEMIS, PERSONEL];
const satir = (k, hedef = HEDEF.ANA, sira = 1) => k.taksitler.find(t => t.hedef === hedef && t.sira === sira);
export const HESAPLAR = [
  { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: false },
  { id: 53, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 5000, acilisTarihi: "2026-01-01", kapali: false },
];
export const HAREKETLER = [
  { id: 101, tur: "odeme", tarih: "2026-09-10", tutar: 5000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: null, aciklama: "1. kısım" },
  { id: 102, tur: "odeme", tarih: "2026-10-03", tutar: 2000, yontem: "Nakit", hesapId: null, giderId: 1, taksitId: null },
  { id: 103, tur: "odeme", tarih: "2026-09-20", tutar: 19000, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: satir(TEVKIFAT).id },
  { id: 104, tur: "odeme", tarih: "2026-09-21", tutar: 3000, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: satir(TEVKIFAT, HEDEF.TEVKIFAT).id },
  { id: 105, tur: "odeme", tarih: "2026-09-15", tutar: 20000, yontem: "Havale", hesapId: 51, giderId: 3, taksitId: satir(KIRA).id },
  { id: 106, tur: "odeme", tarih: "2026-09-22", tutar: 24000, yontem: "Havale", hesapId: 53, giderId: 5, taksitId: null, dovizTutar: 600, kur: 40, paraBirimi: "USD" },
  { id: 107, tur: "odeme", tarih: "2026-10-12", tutar: 4000, yontem: "Havale", hesapId: 51, giderId: 6, taksitId: satir(TAKSITLI, HEDEF.ANA, 1).id },
  { id: 108, tur: "odeme", tarih: "2026-08-25", tutar: null, yontem: "", hesapId: null, giderId: 8, taksitId: null, tamKapatir: true, kaynak: "goc", gocKaynak: "kalem:8" },
  { id: 120, tur: "odeme", tarih: "2026-10-05", tutar: 30000, yontem: "Havale", hesapId: 51, giderId: 20, taksitId: satir(PERSONEL).id },
  { id: 121, tur: "avans", tarih: "2026-09-08", tutar: 3000, calisanId: 21, hesapId: 51, aciklama: "Bayram avansı" },
  { id: 122, tur: "mahsup", tarih: "2026-10-05", tutar: 1000, calisanId: 21, giderId: 20, taksitId: satir(PERSONEL, HEDEF.ELDEN).id, hesapId: null },
];
export const ARALIKLAR = [null, { bas: "2026-09-11", bit: "" }, { bas: "2026-09-01", bit: "2026-09-30" }, { bas: "2026-10-01", bit: "2026-10-31" }];
export const BUGUN = "2026-11-23";
// Tedarikler ve Kasa ekranları motora zenginleştirilmiş kalemleri verir (`odemeleriUygula`).
export const ZENGIN = odemeleriUygula(GIDERLER, HAREKETLER, turMap);
export const secenek = (aralik = null, o = {}) => ({ giderler: ZENGIN, hareketler: HAREKETLER, turler, yururlukAy: "2026-01", bugun: BUGUN, aralik, ...o });
