// Sahipsiz (yetim) kayıtlar — müşterisi artık HİÇBİR müşteri kaydıyla eşleşmeyen servis / Extra Kalıp
// satışı / yedek parça satışı (alıcı=müşteri) / ödeme, ve bayisi hiçbir bayi kaydıyla eşleşmeyen
// yedek parça satışı (alıcı=bayi). Geçmişte müşteri/bayi silme kaskadı yedek parçayı kapsamadığı için
// oluştu (LEZZET BAHÇESİ, BAL KÖFTE&BURGER, "(bayi yok)" satırları); yedek geri yükleme / göç de üretebilir.
//
// İki kullanım:
//  - sahipsizKayitlar: Ayarlar > Veri Yönetimi > Sahipsiz Kayıtlar aracı (tüm müşteri/bayiler, çöptekiler
//    DAHİL eşleşme sayılır — çöpteki kayıt geri alınınca çocuğu da döner, sahipsiz değildir).
//  - sahipsizHaric: Finans ekranı + Aylık rapor. Verilen (canlı) müşteri/bayi kümesinde bulunmayan
//    sahibe bağlı kayıtlar hesaba hiç girmez (kullanıcı kararı: raporda "—" satırı olmasın).
//    Dış firma alımı yedek parça satışlarının müşteri/bayi bağı yoktur → daima kalır.

export const SAHIPSIZ_TURLER = ["servis", "kalip", "yedekParca", "yedekParcaBayi", "odeme"];

/** Kaydın bağlı olduğu müşteri id'si (yoksa null). */
export const musteriBagi = (tur, r) => {
  if (tur === "yedekParcaBayi") return null;
  if (tur === "yedekParca") return r?.aliciTipi === "musteri" ? (r.musteriId ?? null) : null;
  return r?.customerId ?? null;
};

/** Yedek parça satışının bağlı olduğu bayi id'si (alıcı bayi ya da aliciTipi'siz eski kayıt; dış firma hariç). */
export const bayiBagi = (r) => {
  if (!r || r.disFirma) return null;
  if (r.aliciTipi === "bayi" || (r.aliciTipi == null && r.musteriId == null)) return r.dealerId ?? null;
  return null;
};

export const musteriIdSeti = (customers) => new Set((customers || []).map(c => String(c?.id)));

export const sahipsizMi = (tur, r, idSet, bayiIdSet = null) => {
  if (tur === "yedekParcaBayi") {
    if (!bayiIdSet) return false;
    const b = bayiBagi(r);
    return b != null && !bayiIdSet.has(String(b));
  }
  const id = musteriBagi(tur, r);
  return id != null && !idSet.has(String(id));
};

const canli = (arr) => (arr || []).filter(x => x && !x.deletedAt);

/** Araç için liste: [{ tur, kayit, musteriId|bayiId }] — yalnız canlı kayıtlar, tüm müşteri/bayiler eşleşme sayılır. */
export const sahipsizKayitlar = ({ customers = [], dealers = [], services = [], partSales = [], yedekParcaSatislar = [], payments = [] } = {}) => {
  const idSet = musteriIdSeti(customers);
  const bayiSet = musteriIdSeti(dealers);
  const topla = (tur, arr) => canli(arr).filter(r => sahipsizMi(tur, r, idSet, bayiSet))
    .map(r => ({ tur, kayit: r, musteriId: musteriBagi(tur, r), bayiId: tur === "yedekParcaBayi" ? bayiBagi(r) : null }));
  return [
    ...topla("servis", services),
    ...topla("kalip", partSales),
    ...topla("yedekParca", yedekParcaSatislar),
    ...topla("yedekParcaBayi", yedekParcaSatislar),
    ...topla("odeme", payments),
  ];
};

/**
 * Finans/rapor için: sahipsizler ayıklanmış diziler + ayıklanan adet. deletedAt filtresi ÇAĞIRANA ait.
 * `dealers` verilmezse bayi bağı denetlenmez (yalnız müşteri).
 */
export const sahipsizHaric = (customers, { services = [], partSales = [], yedekParcaSatislar = [], payments = [] } = {}, dealers = null) => {
  const idSet = musteriIdSeti(customers);
  const bayiSet = dealers ? musteriIdSeti(dealers) : null;
  let sahipsizAdet = 0;
  const suz = (tur, arr) => (arr || []).filter(r => {
    const yetim = sahipsizMi(tur, r, idSet, bayiSet) || (tur === "yedekParca" && sahipsizMi("yedekParcaBayi", r, idSet, bayiSet));
    if (yetim && !r?.deletedAt) sahipsizAdet += 1;
    return !yetim;
  });
  const out = {
    services: suz("servis", services),
    partSales: suz("kalip", partSales),
    yedekParcaSatislar: suz("yedekParca", yedekParcaSatislar),
    payments: suz("odeme", payments),
  };
  return { ...out, sahipsizAdet };
};
