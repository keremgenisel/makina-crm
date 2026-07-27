// Bayiye yedek parça (kargo) satışında parçanın stoktan düşülmesi / geri alınması.
// servisStok.js'in kardeşi: fark yalnız stok hareketi tipinin "bayi_satis" olması — böylece
// raporlarda "serviste kullanılan parça" ile "bayiye satılan parça" karışmaz. Stok YALNIZ satışta
// düşer; makina tahsisi (yedek_parca_tahsis) stok hareketi DEĞİL, sadece izlenebilirliktir.
import { uid, today, mergeAndUpdate, totalMiktar } from "./utils";

/** Bir yedek parça satışının (partId + miktar) parçasını stoktan düş ve stok logu yaz. */
export const yedekParcaDus = (partId, miktar, satisId, setPartStock, setPartStockLog) => {
  if (!setPartStock || !setPartStockLog) return;
  const pid = partId != null ? String(partId) : null;
  const adet = parseInt(miktar);
  if (!pid || !(adet > 0)) return;
  setPartStock(ps => mergeAndUpdate([...ps], pid, totalMiktar(ps, pid) - adet));
  setPartStockLog(lg => [
    ...lg,
    { id: uid(), partId: pid, miktar: -adet, tip: "bayi_satis", referansId: satisId, tarih: today(), notlar: "" },
  ]);
};

/** Bir yedek parça satışının daha önce düşülmüş stok hareketini geri al ve o log kaydını sil. */
export const yedekParcaGeriAl = (satisId, setPartStock, setPartStockLog) => {
  if (!setPartStock || !setPartStockLog) return;
  setPartStockLog(lg => {
    const toRestore = lg.filter(l => l.referansId === satisId && l.tip === "bayi_satis" && l.partId);
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
    return lg.filter(l => !(l.referansId === satisId && l.tip === "bayi_satis" && l.partId));
  });
};
