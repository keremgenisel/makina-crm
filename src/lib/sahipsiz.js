// Sahipsiz (yetim) kayıtlar — müşterisi artık HİÇBİR müşteri kaydıyla eşleşmeyen servis / Extra Kalıp
// satışı / yedek parça satışı (alıcı=müşteri) / ödeme. Geçmişte müşteri silme kaskadı yedek parçayı
// kapsamadığı için oluştu (LEZZET BAHÇESİ, BAL KÖFTE&BURGER); yedek geri yükleme / göç de üretebilir.
//
// İki kullanım:
//  - sahipsizKayitlar: Ayarlar > Veri Yönetimi > Sahipsiz Kayıtlar aracı (tüm müşteriler, çöptekiler
//    DAHİL eşleşme sayılır — çöpteki müşteri geri alınınca kaydı da döner, sahipsiz değildir).
//  - sahipsizHaric: Finans ekranı + Aylık rapor. Verilen (canlı) müşteri kümesinde bulunmayan
//    müşteriye bağlı kayıtlar hesaba hiç girmez (kullanıcı kararı: raporda "—" satırı olmasın).
//    Bayi / dış firma alımı yedek parça satışlarının müşteri bağı yoktur → daima kalır.

export const SAHIPSIZ_TURLER = ["servis", "kalip", "yedekParca", "odeme"];

/** Kaydın bağlı olduğu müşteri id'si (yoksa null). */
export const musteriBagi = (tur, r) => {
  if (tur === "yedekParca") return r?.aliciTipi === "musteri" ? (r.musteriId ?? null) : null;
  return r?.customerId ?? null;
};

export const musteriIdSeti = (customers) => new Set((customers || []).map(c => String(c?.id)));

export const sahipsizMi = (tur, r, idSet) => {
  const id = musteriBagi(tur, r);
  return id != null && !idSet.has(String(id));
};

const canli = (arr) => (arr || []).filter(x => x && !x.deletedAt);

/** Araç için liste: [{ tur, kayit, musteriId }] — yalnız canlı kayıtlar, tüm müşteriler eşleşme sayılır. */
export const sahipsizKayitlar = ({ customers = [], services = [], partSales = [], yedekParcaSatislar = [], payments = [] } = {}) => {
  const idSet = musteriIdSeti(customers);
  const topla = (tur, arr) => canli(arr).filter(r => sahipsizMi(tur, r, idSet)).map(r => ({ tur, kayit: r, musteriId: musteriBagi(tur, r) }));
  return [
    ...topla("servis", services),
    ...topla("kalip", partSales),
    ...topla("yedekParca", yedekParcaSatislar),
    ...topla("odeme", payments),
  ];
};

/** Finans/rapor için: sahipsizler ayıklanmış diziler + ayıklanan adet. deletedAt filtresi ÇAĞIRANA ait. */
export const sahipsizHaric = (customers, { services = [], partSales = [], yedekParcaSatislar = [], payments = [] } = {}) => {
  const idSet = musteriIdSeti(customers);
  let sahipsizAdet = 0;
  const suz = (tur, arr) => (arr || []).filter(r => {
    const yetim = sahipsizMi(tur, r, idSet);
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
