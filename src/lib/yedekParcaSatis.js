// Yedek parça (kargo) satışı ortak kayıt mantığı. Stok > Yedek Parça Satışı sekmesi, müşteri detay
// modalı ve bayi detay modalı aynı doğrulama + kayıt yolunu kullanır (ayrışmasın diye tek kaynak).
import { uid, today, parseMoney, simdiYerel, totalMiktar } from "./utils";
import { yedekParcaDus } from "./yedekParcaStok";
import { yerelServisEkle } from "./yerelServis";

// Form → normalize + doğrula → { ok, rec } | { ok:false, hata }. Alıcı bayi VEYA müşteri olabilir.
export function yedekParcaRec(form) {
  const aliciTipi = form.aliciTipi === "musteri" ? "musteri" : "bayi";
  const dealerId = aliciTipi === "bayi" && form.dealerId ? Number(form.dealerId) : null;
  const musteriId = aliciTipi === "musteri" && form.musteriId ? Number(form.musteriId) : null;
  const partId = form.partId ? String(form.partId) : null;
  const miktar = parseInt(form.miktar) || 0;
  if (aliciTipi === "bayi" ? !dealerId : !musteriId) return { ok: false, hata: aliciTipi === "bayi" ? "Alıcı bayi seçin." : "Alıcı müşteri seçin." };
  if (!partId) return { ok: false, hata: "Yedek parça seçin." };
  if (!(miktar > 0)) return { ok: false, hata: "Miktar 0'dan büyük olmalı." };
  return { ok: true, rec: {
    aliciTipi, dealerId, musteriId, partId, miktar,
    birimFiyat: parseMoney(form.birimFiyat), currency: form.currency || "TRY",
    tarih: form.tarih || today(), faturaTipi: form.faturaTipi || "Faturalı Yurtiçi", odendi: !!form.odendi,
    // Her yedek parça satışı kargoyla gider → varsayılan "Hazırlanıyor" ki NEREDEN girilirse girilsin
    // (müşteri/bayi detayı, Stok, pano) Servis ve Kargo Panosu'na (Bekliyor sütunu) düşsün.
    kargoFirma: form.kargoFirma || "", kargoTakipNo: form.kargoTakipNo || "", kargoTarih: form.kargoTarih || "", kargoDurum: form.kargoDurum || "Hazırlanıyor",
    kargoSorumlusu: form.kargoSorumlusu || "", panoDusmeZamani: form.panoDusmeZamani || "", notlar: form.notlar || "",
  } };
}

// Yedek parça satışı "planlanmış" mı? = panoya düşme zamanı ileride → o zamana kadar panoda gizli.
// Servisteki servisPlanlandiMi'nin kargo karşılığı. Damgalar yerel duvar-saati string'i (new Date yerel).
export function kargoPlanlandiMi(s, nowIso) {
  if (!s?.panoDusmeZamani || !nowIso) return false;
  const g = new Date(s.panoDusmeZamani).getTime(), n = new Date(nowIso).getTime();
  return !isNaN(g) && !isNaN(n) && g > n;
}

// Alıcı MÜŞTERİ ise (musteriId = belirli bir makina), parça baştan o makinaya tam-tahsis edilir —
// nereden eklendiğine bakılmaksızın (Stok / pano / müşteri-bayi detayı). Alıcı bayiyse boş döner
// (bayi hangi makinaya taktığını sonra bildirir → elle tahsis). Saf → test edilebilir.
export function musteriTahsisi(rec) {
  const miktar = parseInt(rec?.miktar) || 0;
  if (rec?.aliciTipi !== "musteri" || !rec?.musteriId || !(miktar > 0)) return [];
  return [{ miktar, customerId: Number(rec.musteriId), serialNo: "", makinaSerbest: "", tarih: today() }];
}

// Yeni satış oluştur (add) + parçayı stoktan düş. Alıcı müşteriyse otomatik o makinaya tahsis eder.
// Stok yetersiz olsa da satış TAM miktarla kaydedilir; stoktan yalnız MEVCUT kadarı düşülür (stok
// eksiye düşmez). Dönüş { ok, id } | { ok:false, hata }.
export function yeniYedekParcaSatis(form, { setYedekParcaSatislar, setPartStock, setPartStockLog, partStock = [] }) {
  const sonuc = yedekParcaRec(form);
  if (!sonuc.ok) return sonuc;
  const id = uid();
  const tahsisler = musteriTahsisi(sonuc.rec); // alıcı müşteri → otomatik tam tahsis; bayi → boş
  // Oluşturma anı: panoda "en son eklenen en üstte" sıralaması için (id rastgele, tarih gün hassasiyetinde).
  setYedekParcaSatislar(p => [{ ...sonuc.rec, id, olusturmaZamani: simdiYerel(), tahsisler }, ...p]);
  // Stok eksiye düşmesin: yalnız mevcut kadarını düş (log da düşülen kadar → geri-alma tutarlı).
  const dusulen = Math.min(sonuc.rec.miktar, Math.max(0, totalMiktar(partStock, sonuc.rec.partId)));
  yedekParcaDus(sonuc.rec.partId, dusulen, id, setPartStock, setPartStockLog);
  // Hemen düşen kargoyu "kendi ekledik" işaretle (oluşturmada ses çıkmasın). PLANLANMIŞ (ileri düşme
  // zamanlı) kargo İŞARETLENMEZ → düştüğünde oluşturan dahil herkese alarm/bildirim gelsin (servisle aynı).
  if (!kargoPlanlandiMi(sonuc.rec, simdiYerel())) yerelServisEkle(id);
  return { ok: true, id };
}
