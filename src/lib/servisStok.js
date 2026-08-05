// Serviste değişen parçaların stoktan düşülmesi / geri alınması. Hem müşteri detay modalı
// (CustomerDetailModal) hem Servis Panosu (ServisPanosu) aynı servis formunu kullandığından bu
// mantık tek kaynakta tutulur — yoksa iki yerde ayrışıp stok tutarsız kalır.
import { uid, today, mergeAndUpdate, totalMiktar, stokKirparakDus, stokGeriEklenmis } from "./utils";

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
  const taban = stokGeriEklenmis(partStock, partStockLog, serviceId, "servis"); // geri-al sonrası taban
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

/** Bir servisin daha önce düşülmüş parçalarını stoğa geri ekle ve o log kayıtlarını sil. */
export const servisParcaGeriAl = (serviceId, setPartStock, setPartStockLog) => {
  if (!setPartStock || !setPartStockLog) return;
  setPartStockLog(lg => {
    const toRestore = lg.filter(l => l.referansId === serviceId && l.tip === "servis" && l.partId);
    if (toRestore.length > 0) {
      setPartStock(ps => {
        let updated = [...ps];
        toRestore.forEach(l => {
          const pid = String(l.partId);
          updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) + Math.abs(l.miktar));
        });
        return updated;
      });
    }
    return lg.filter(l => !(l.referansId === serviceId && l.tip === "servis" && l.partId));
  });
};
