// Serviste değişen parçaların stoktan düşülmesi / geri alınması. Hem müşteri detay modalı
// (CustomerDetailModal) hem Servis Panosu (ServisPanosu) aynı servis formunu kullandığından bu
// mantık tek kaynakta tutulur — yoksa iki yerde ayrışıp stok tutarsız kalır.
import { uid, today, mergeAndUpdate, totalMiktar } from "./utils";

/** Servisteki (partId + miktar taşıyan) parçaları stoktan düş ve stok logu yaz. */
export const servisParcaDus = (degisenParcalar, serviceId, setPartStock, setPartStockLog) => {
  if (!setPartStock || !setPartStockLog) return;
  const valid = (degisenParcalar || []).filter(p => p && p.partId && parseInt(p.miktar) > 0);
  if (valid.length === 0) return;
  setPartStock(ps => {
    let updated = [...ps];
    valid.forEach(r => {
      const pid = String(r.partId);
      updated = mergeAndUpdate(updated, pid, totalMiktar(updated, pid) - parseInt(r.miktar));
    });
    return updated;
  });
  setPartStockLog(lg => [
    ...lg,
    ...valid.map(r => ({ id: uid(), partId: String(r.partId), miktar: -parseInt(r.miktar), tip: "servis", referansId: serviceId, tarih: today(), notlar: "" })),
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
