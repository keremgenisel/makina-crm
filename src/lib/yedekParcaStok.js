// Bayiye yedek parça (kargo) satışında parçanın stoktan düşülmesi / geri alınması.
// servisStok.js'in kardeşi: fark yalnız stok hareketi tipinin "bayi_satis" olması — böylece
// raporlarda "serviste kullanılan parça" ile "bayiye satılan parça" karışmaz. Stok YALNIZ satışta
// düşer; makina tahsisi (yedek_parca_tahsis) stok hareketi DEĞİL, sadece izlenebilirliktir.
import { uid, today, mergeAndUpdate, totalMiktar } from "./utils";
import { stokGeriAl } from "./stokHareketi";

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

/**
 * Bir yedek parça satışının düşülmüş stoğunu geri al. Spec 0065 R6: log satırı silinmez, `bayi_satis_iade` karşı hareketi
 * yazılır; net düşümü kalmamış satışta etkisizdir (R7).
 */
export const yedekParcaGeriAl = (satisId, setPartStock, setPartStockLog) =>
  stokGeriAl(satisId, "bayi_satis", setPartStock, setPartStockLog, { tarih: today(), notlar: "Yedek parça satışı silindi ya da düzenlendi" });
