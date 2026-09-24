// Evrak → CRM: planın makina DIŞI adımlarını mevcut ortak yollarla yazar (spec 0006 C3, C4, R8).
// Yedek parça: yedekParcaSatis (stok düşümü dahil); Extra Kalıp: kalipSatisi; "makinayla" kalıp: müşterinin
// kalıp listesi. Önce hepsi doğrulanır; biri geçersizse HİÇBİR şey yazılmaz (kısmi yazma yok).
// Dönüş: { ids, satirlar } (üretilen alt kalem kimlikleri + özet satırları) | { hata }.
import { uid, simdiYerel, today } from "./utils";
import { yedekParcaRec, yeniYedekParcaSatisCoklu } from "./yedekParcaSatis";
import { kalipSatisOrtak, yeniKalipSatislari } from "./kalipSatisi";

export const evrakAdimlariniYaz = (t, plan, musteriId, deps) => {
  const { setYedekParcaSatislar, setPartStock, setPartStockLog, partStock = [], setPartSales, setCustomers, ayar = null, kdvRates, bugun = today() } = deps;
  const satirlar = [], idSet = new Set();
  const ids = { push: (...x) => x.forEach(i => idSet.add(i)) }; // miktarlı kalıpta aynı kalem kimliği birden çok kayıtta
  const musteri = musteriId ?? plan.hedefMusteriId;
  const ypForm = (r) => ({
    aliciTipi: r.aliciTipi, dealerId: r.dealerId, musteriId: r.aliciTipi === "musteri" ? musteri : null,
    partId: r.partId, miktar: r.miktar, birimFiyat: r.birimFiyat, currency: plan.currency, faturaTipi: plan.faturaTipi,
    // R17: Evrak'tan üretilen yedek parça Servis ve Kargo Panosuna düşmez (kargoDurum boş).
    tarih: plan.tarih || bugun, odendi: false, kargoDurum: "", teklifId: t.id, teklifKalemId: r.kalemId,
  });
  for (const r of plan.yedekParcaKayitlari) { const v = yedekParcaRec(ypForm(r)); if (!v.ok) return { hata: `${r.ad}: ${v.hata}` }; }
  if ((plan.kalipKayitlari.length || plan.makinaylaTek.length) && musteri == null) return { hata: "Kalıpların bağlanacağı müşteri yok." };

  if (plan.yedekParcaKayitlari.length) {
    const r = yeniYedekParcaSatisCoklu(
      { ...ypForm(plan.yedekParcaKayitlari[0]), satirlar: plan.yedekParcaKayitlari.map(x => ({ partId: x.partId, miktar: x.miktar, birimFiyat: x.birimFiyat, teklifKalemId: x.kalemId })) },
      { setYedekParcaSatislar, setPartStock, setPartStockLog, partStock, ayar, kdvRates });
    if (!r.ok) return { hata: r.hata };
    plan.yedekParcaKayitlari.forEach(x => { ids.push(x.kalemId); satirlar.push({ tur: "Yedek parça satışı", ad: x.ad, not: `${x.miktar} adet${x.makinaSatirindan ? " · makina satırından" : ""}` }); });
  }
  if (plan.kalipKayitlari.length) {
    const ortak = kalipSatisOrtak({ tarih: plan.tarih, currency: plan.currency, faturaTipi: plan.faturaTipi, odendi: false, yontem: "Nakit",
      satisFirma: plan.kalipKayitlari[0].satisFirma, teklifId: t.id }, Number(musteri), bugun);
    yeniKalipSatislari(ortak, plan.kalipKayitlari.map(k => ({ ad: k.ad, olcu: "", ucret: k.ucret, teklifKalemId: k.kalemId })),
      { setPartSales, setCustomers, uid, simdi: simdiYerel });
    plan.kalipKayitlari.forEach(k => { ids.push(k.kalemId); satirlar.push({ tur: "Extra Kalıp satışı", ad: k.ad, not: k.satisFirma }); });
  }
  if (plan.makinaylaTek.length) {
    setCustomers(p => p.map(c => (c.id === Number(musteri)
      ? { ...c, kaliplar: [...(c.kaliplar || []), ...plan.makinaylaTek.map(k => ({ ad: k.ad, olcu: "" }))], kalipSayisi: (c.kaliplar || []).length + plan.makinaylaTek.length } : c)));
    plan.makinaylaTek.forEach(k => { ids.push(k.kalemId); satirlar.push({ tur: "Makinayla verilen kalıp", ad: k.ad, not: "müşterinin kalıp listesine" }); });
  }
  return { ids: [...idSet], satirlar };
};
