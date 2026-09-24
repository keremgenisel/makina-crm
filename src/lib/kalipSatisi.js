// Extra Kalıp satışı ortak kayıt yolu (spec 0006 C3). Müşteri detayındaki Extra Kalıp formu ve Evrak'tan
// üretim AYNI alanları üretir; iki yol ayrışmasın diye kayıt kuruluşu burada tek kaynaktır.

// Form → batch'teki bütün kalıplara uygulanan ortak alanlar (kalem fiyatı ve kredi kartı hariç).
export const kalipSatisOrtak = (f, customerId, bugun) => ({
  customerId, tur: "Kalıp", tarih: f.tarih || bugun,
  currency: f.currency || "TRY", ucretsizMi: false,
  odendi: !!f.odendi, faturaTipi: f.faturaTipi,
  // Ödeme yöntemi (makina satışıyla aynı). Çek ise vade + tahsil; çek tahsil edilene kadar borçlu.
  yontem: f.yontem || "Nakit", vadeTarihi: f.yontem === "Çek" ? (f.vadeTarihi || "") : "",
  tahsilEdildi: f.yontem === "Çek" ? !!f.tahsilEdildi : false,
  // Kredi kartı: taksit sayısı (batch geneli). kartKomisyonu snapshot'ı her kalem kaydına ayrı yazılır.
  taksitSayisi: f.yontem === "Kredi Kartı" ? (f.taksitSayisi ?? null) : null,
  // Satış yapan firma bilgisi YALNIZ partSale kaydına yazılır (müşteri kaydına değil)
  satisFirma: f.satisFirma ?? null, satisFirmaAd: f.satisFirmaAd ?? "", satisFirmaYetkili: f.satisFirmaYetkili ?? "",
  satisFirmaTel: f.satisFirmaTel ?? "", satisFirmaUlke: f.satisFirmaUlke ?? "", satisFirmaSehir: f.satisFirmaSehir ?? "",
  // Servis ve Kargo Panosu (kargo takibi) alanları — form-seviyesi, batch'teki tüm kalıplara uygulanır.
  kargoDurum: f.kargoDurum || "", kargoFirma: f.kargoFirma ?? "", kargoTakipNo: f.kargoTakipNo ?? "",
  kargoTarih: f.kargoTarih ?? "", kargoSorumlusu: f.kargoSorumlusu ?? "", panoDusmeZamani: f.panoDusmeZamani ?? "",
  fabrikaTeslim: !!f.fabrikaTeslim, // panoda kargo yerine "Fabrika Teslim"
  // Teslim şekli açık işaret: form her zaman bir seçim yapar (Kargo varsayılan).
  teslimSekli: f.fabrikaTeslim ? "fabrika" : "kargo",
  // Farklı teslimat (sevk) adresi — yalnız Kargo'da. teslimatFarkli false ise diğer alanlar boşlanır.
  ...(() => {
    const farkli = !f.fabrikaTeslim && !!f.teslimatFarkli;
    return {
      teslimatFarkli: farkli,
      teslimatAd: farkli ? (f.teslimatAd ?? "") : "", teslimatTel: farkli ? (f.teslimatTel ?? "") : "",
      teslimatAdres: farkli ? (f.teslimatAdres ?? "") : "", teslimatUlke: farkli ? (f.teslimatUlke ?? "") : "",
      teslimatSehir: farkli ? (f.teslimatSehir ?? "") : "", teslimatIlce: farkli ? (f.teslimatIlce ?? "") : "",
    };
  })(),
  // Evrak'tan üretildiyse kaynak belge (R15); alt kalem kimliği kalem başına (kalemler[].teklifKalemId).
  teklifId: f.teklifId ?? null,
});

// Yeni kalıp satışları: kayıtlar + müşterinin kalıp listesine extra olarak ekleme. kalemler:
// [{ ad, olcu, ucret, uretimFormGonder, kartKomisyonu, teklifKalemId }]. Dönüş: oluşan kayıtlar.
export const yeniKalipSatislari = (ortak, kalemler, { setPartSales, setCustomers, uid, simdi }) => {
  const batchId = uid();
  // olusturmaZamani: panoda "en son eklenen üstte" sıralaması için tam zaman damgası.
  const olusturmaZamani = simdi();
  const yeniKayitlar = kalemler.map(k => ({
    id: uid(), batchId, olusturmaZamani, ...ortak, ad: k.ad, olcu: k.olcu || "", ucret: k.ucret,
    uretimFormGonder: !!k.uretimFormGonder, kartKomisyonu: k.kartKomisyonu ?? null, teklifKalemId: k.teklifKalemId ?? null,
  }));
  setPartSales(p => [...p, ...yeniKayitlar]);
  setCustomers(p => p.map(c => c.id === ortak.customerId
    ? { ...c, kaliplar: [...(c.kaliplar || []), ...yeniKayitlar.map(r => ({ ad: r.ad, olcu: r.olcu, partSaleId: r.id }))], kalipSayisi: (c.kaliplar || []).length + yeniKayitlar.length }
    : c));
  return yeniKayitlar;
};
