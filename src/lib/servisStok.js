// Serviste değişen parçaların stoktan düşülmesi / geri alınması. Hem müşteri detay modalı
// (CustomerDetailModal) hem Servis Panosu (ServisPanosu) aynı servis formunu kullandığından bu
// mantık tek kaynakta tutulur — yoksa iki yerde ayrışıp stok tutarsız kalır.
import { uid, today, mergeAndUpdate, totalMiktar, stokKirparakDus } from "./utils";
import { netGeriEklenmis, stokGeriAl, netDusumAyni, netDusumleri, IADE_TIPI, stokEtkisi, stokuUygula } from "./stokHareketi";

/**
 * Servisteki (partId + miktar taşıyan) parçaları stoktan düş ve stok logu yaz.
 * Stok hiçbir zaman eksiye düşmez: mevcuttan fazla parça değişse de yalnız MEVCUT kadarı düşülür,
 * servis kaydı yine tam tutulur (fantom fark izlenmez). Log kırpılmış gerçek düşümü tutar → geri-alma
 * tutarlı. Düzenlemede çağrı sırası "servisParcaGeriAl → servisParcaDus" olduğundan, kırpma tabanı
 * geri-alma SONRASI stok olmalı: `partStock`+`partStockLog` snapshot'larından bu servise ait eski
 * düşümler geri eklenerek taban hesaplanır (add'de o servise log olmadığı için taban = partStock).
 * Canlı state'e uygulama functional updater ile HEDEFLİ yapılır (yalnız ilgili parçalar), böylece
 * eşzamanlı ilgisiz stok değişiklikleri ezilmez.
 */
export const servisParcaDus = (degisenParcalar, serviceId, setPartStock, setPartStockLog, partStock = [], partStockLog = []) => {
  if (!setPartStock || !setPartStockLog) return;
  const valid = (degisenParcalar || []).filter(p => p && p.partId && parseInt(p.miktar) > 0);
  if (valid.length === 0) return;
  const taban = netGeriEklenmis(partStock, partStockLog, serviceId, "servis"); // geri-al sonrası taban (spec 0065: net etki)
  const { dusumler } = stokKirparakDus(taban, valid); // stok eksiye düşmesin; log ile ortak sayı
  if (dusumler.length === 0) return; // hiç stok yok → servis yine kaydedilir, stok 0 kalır
  setPartStock(ps => {
    let updated = [...ps];
    dusumler.forEach(d => { updated = mergeAndUpdate(updated, d.partId, totalMiktar(updated, d.partId) - d.adet); });
    return updated;
  });
  setPartStockLog(lg => [
    ...lg,
    ...dusumler.map(d => ({ id: uid(), partId: d.partId, miktar: -d.adet, tip: "servis", referansId: serviceId, tarih: today(), notlar: "" })),
  ]);
};

/**
 * Bir servisin daha önce düşülmüş parçalarını stoğa geri ekle. Spec 0065 R6: log satırı silinmez, `servis_iade` karşı
 * hareketi yazılır (birleştirme eklemeyle çalışır, geçmiş okunur kalır); net düşümü kalmamış serviste etkisizdir (R7).
 */
export const servisParcaGeriAl = (serviceId, setPartStock, setPartStockLog) =>
  stokGeriAl(serviceId, "servis", setPartStock, setPartStockLog, { tarih: today(), notlar: "Servis kaydı silindi ya da düzenlendi" });

/**
 * Servis düzenlemesi: eski düşümü geri al, yenisini düş. Spec 0065: parçalar ve net düşüm aynıysa hiçbir şey yazılmaz
 * (karşı hareketle her düzenleme log'a iki satır eklerdi); stok sonucu eski akışla aynıdır.
 */
export const servisParcaYenile = (degisenParcalar, serviceId, setPartStock, setPartStockLog, partStock = [], partStockLog = []) => {
  if (netDusumAyni(partStockLog, serviceId, "servis", degisenParcalar)) return;
  servisParcaGeriAl(serviceId, setPartStock, setPartStockLog);
  servisParcaDus(degisenParcalar, serviceId, setPartStock, setPartStockLog, partStock, partStockLog);
};

/**
 * Spec 0065 R17: çöpten geri alınan servislerin parçalarını yeniden düş. Yalnız stoğu bu kayıt için izlenmiş ve şu an net
 * düşümü kalmamış (silinirken iade edilmiş) serviste çalışır; log'u hiç olmayan eski kayıtta (iadesi yazılmamış, 0065 öncesi
 * silme) hiçbir şey düşülmez, yoksa hiç düşülmemiş parçalar düşülürdü.
 * Triyaj (bulgu 2): müşteriyle birlikte birden çok servis dönebilir; kırpma tabanı servisler arasında BİRİKİMLİDİR (tek
 * geçiş, tek yazım), yoksa her servis aynı anlık stokla kırpılır ve stok eksiye, log adetten sapmaya düşerdi. Canlı state'e
 * yazım 0 tabanlıdır (stokuUygula).
 */
export const servisParcalariYenidenDus = (svler, setPartStock, setPartStockLog, partStock = [], partStockLog = []) => {
  if (!setPartStock || !setPartStockLog) return;
  let taban = [...(partStock || [])];
  const yeni = [];
  for (const sv of svler || []) {
    if (!sv) continue;
    const izlendi = (partStockLog || []).some(l => l && String(l.referansId) === String(sv.id) && (l.tip === "servis" || l.tip === IADE_TIPI.servis));
    if (!izlendi || netDusumleri(partStockLog, sv.id, "servis").size > 0) continue;
    const valid = (sv.degisenParcalar || []).filter(p => p && p.partId && parseInt(p.miktar) > 0);
    const r = stokKirparakDus(taban, valid);
    taban = r.partStock;
    r.dusumler.forEach(d => yeni.push({ id: uid(), partId: d.partId, miktar: -d.adet, tip: "servis", referansId: sv.id, tarih: today(), notlar: "Çöp kutusundan geri alındı" }));
  }
  if (!yeni.length) return;
  setPartStock(ps => stokuUygula(ps, stokEtkisi(yeni)));
  setPartStockLog(lg => [...lg, ...yeni]);
};
