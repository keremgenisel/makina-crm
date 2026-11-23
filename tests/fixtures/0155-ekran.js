// Spec 0155: görsel kanıt ekranlarının verisi (scripts/evidence/0009-sayfa.jsx). Tedarikçi avansı TL ve USD kovası, mahsup, geri
// ödeme, silinmiş tedarikçinin avansı, iki kalem; testlerde kullanılmaz.
export const TUR = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
export const TED = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Yıldız Ticaret" }, { id: 13, ad: "Eski Firma", deletedAt: "2026-09-01T00:00:00Z" }];
export const HESAP = [{ id: 1, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 200000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 2, ad: "Dolar Hesabı", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 10000, acilisTarihi: "2026-01-01", kapali: false }];
export const GIDERLER = [
  { id: 6, tarih: "2026-09-10", turId: 4, tutar: 120000, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac levha (fazla fatura)", sonOdemeTarihi: "2026-09-30", taksitler: [] },
  { id: 7, tarih: "2026-09-12", turId: 4, tutar: 30000, kdvOrani: 0, tedarikciId: 11, aciklama: "Rulman", sonOdemeTarihi: "2026-10-15", taksitler: [] },
  { id: 8, tarih: "2026-09-14", turId: 4, tutar: 8000, kdvOrani: 0, tedarikciId: 12, aciklama: "Bant", taksitler: [] },
];
export const HAREKETLER = [
  { id: 61, tur: "odeme", tarih: "2026-09-15", tutar: 120000, yontem: "Havale", hesapId: 1, giderId: 6, taksitId: null },
  { id: 62, tur: "avans", tarih: "2026-09-18", tutar: 200000, dovizTutar: 5000, kur: 40, paraBirimi: "USD", tedarikciId: 11, hesapId: 2, yontem: "Havale", aciklama: "Fazla ödeme farkı" },
  { id: 63, tur: "avans", tarih: "2026-09-19", tutar: 15000, tedarikciId: 11, hesapId: 1, yontem: "Havale" },
  { id: 64, tur: "mahsup", tarih: "2026-09-25", tutar: 10000, tedarikciId: 11, giderId: 7, taksitId: null, hesapId: null },
  { id: 65, tur: "avans", yon: "giren", tarih: "2026-09-27", tutar: 2000, tedarikciId: 11, hesapId: 1, yontem: "Havale" },
  { id: 66, tur: "avans", tarih: "2026-08-20", tutar: 3000, tedarikciId: 13, hesapId: null },
];
export const COP = [{ ...HAREKETLER[1], id: 67, deletedAt: "2026-09-28T10:00:00Z" }];
