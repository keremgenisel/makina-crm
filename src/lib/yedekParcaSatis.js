// Yedek parça (kargo) satışı ortak kayıt mantığı. Stok > Yedek Parça Satışı sekmesi, müşteri detay
// modalı ve bayi detay modalı aynı doğrulama + kayıt yolunu kullanır (ayrışmasın diye tek kaynak).
import { uid, today, parseMoney, simdiYerel, totalMiktar } from "./utils";
import { yedekParcaDus } from "./yedekParcaStok";
import { yerelServisEkle } from "./yerelServis";

// Form → normalize + doğrula → { ok, rec } | { ok:false, hata }. Alıcı bayi VEYA müşteri olabilir.
export function yedekParcaRec(form) {
  const aliciTipi = form.aliciTipi === "musteri" ? "musteri" : "bayi";
  // "Diğer" = anlaşmasız dış firma alıcı (bayi tipinde; kayıtlı bayi yok, bilgiler yalnız bu kayda yazılır).
  const disFirma = aliciTipi === "bayi" && !!form.disFirma;
  const dealerId = (aliciTipi === "bayi" && !disFirma && form.dealerId) ? Number(form.dealerId) : null;
  const musteriId = aliciTipi === "musteri" && form.musteriId ? Number(form.musteriId) : null;
  const partId = form.partId ? String(form.partId) : null;
  const miktar = parseInt(form.miktar) || 0;
  if (aliciTipi === "bayi") {
    if (disFirma) { if (!String(form.disFirmaAd || "").trim()) return { ok: false, hata: "Dış firma adını girin." }; }
    else if (!dealerId) return { ok: false, hata: "Alıcı bayi seçin." };
  } else if (!musteriId) return { ok: false, hata: "Alıcı müşteri seçin." };
  if (!partId) return { ok: false, hata: "Yedek parça seçin." };
  if (!(miktar > 0)) return { ok: false, hata: "Miktar 0'dan büyük olmalı." };
  return { ok: true, rec: {
    aliciTipi, dealerId, musteriId, partId, miktar,
    // Anlaşmasız dış firma alıcı bilgileri (yalnız bu kayda; bayi/müşteri kaydı oluşturulmaz).
    disFirma,
    disFirmaAd: disFirma ? String(form.disFirmaAd || "").trim() : "", disFirmaYetkili: disFirma ? (form.disFirmaYetkili || "") : "",
    disFirmaTel: disFirma ? (form.disFirmaTel || "") : "", disFirmaAdres: disFirma ? (form.disFirmaAdres || "") : "",
    disFirmaUlke: disFirma ? (form.disFirmaUlke || "") : "", disFirmaSehir: disFirma ? (form.disFirmaSehir || "") : "",
    birimFiyat: parseMoney(form.birimFiyat), currency: form.currency || "TRY",
    tarih: form.tarih || today(), faturaTipi: form.faturaTipi || "Faturalı Yurtiçi", odendi: !!form.odendi,
    // Servis ve Kargo Panosuna gönderme OPT-IN (formda checkbox). kargoDurum boşsa panoya düşmez;
    // checkbox işaretlenince "Hazırlanıyor" gelir. (Eskiden her satış zorunlu panoya düşüyordu.)
    kargoFirma: form.kargoFirma || "", kargoTakipNo: form.kargoTakipNo || "", kargoTarih: form.kargoTarih || "", kargoDurum: form.kargoDurum || "",
    fabrikaTeslim: !!form.fabrikaTeslim, // panoda kargo yerine "Fabrika Teslim" göster
    // Farklı teslimat (sevk) adresi — alıcının kayıtlı adresi yerine bu satışa özel adres. Alıcı türünden
    // bağımsız (bayi/müşteri/dış firma hepsinde). teslimatFarkli false ise diğer alanlar boşlanır.
    teslimatFarkli: !!form.teslimatFarkli,
    teslimatAd: form.teslimatFarkli ? (form.teslimatAd || "") : "", teslimatTel: form.teslimatFarkli ? (form.teslimatTel || "") : "",
    teslimatAdres: form.teslimatFarkli ? (form.teslimatAdres || "") : "", teslimatUlke: form.teslimatFarkli ? (form.teslimatUlke || "") : "",
    teslimatSehir: form.teslimatFarkli ? (form.teslimatSehir || "") : "", teslimatIlce: form.teslimatFarkli ? (form.teslimatIlce || "") : "",
    kargoSorumlusu: form.kargoSorumlusu || "", panoDusmeZamani: form.panoDusmeZamani || "", notlar: form.notlar || "",
    // batchId: aynı formdan (toplu satış) çıkan satırlar tek grup → panoda tek kart, geçmişte tek olay.
    batchId: form.batchId ?? null,
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
  // Tahsis satış anında yapılıyor → tarihi satışın tarihi olsun (bugün DEĞİL). Geçmiş tarihli bir
  // satışta makina geçmiş raporu tahsis tarihini (t.tarih) satış tarihinin önüne aldığı için, bugünün
  // tarihi damgalanırsa raporda geçmiş tarih yerine bugün görünüyordu.
  return [{ miktar, customerId: Number(rec.musteriId), serialNo: "", makinaSerbest: "", tarih: rec.tarih || today() }];
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

// Çoklu satır (form.satirlar = [{partId, miktar, birimFiyat}]) → her satır AYRI bir satış kaydı
// (mevcut "parça başına kayıt" modeli). Ortak alanlar (alıcı, tarih, para birimi, kargo, fatura,
// ödeme, not) tüm satırlara uygulanır. Aynı parçadan birden çok satır olursa stok kontrolü yerel bir
// görünümle tükenir (React state güncellemesi asenkron; art arda yedekParcaDus gerçek state'i doğru
// biriktirir, yalnız kırpma hesabı için yerel görünüm gerekli). Dönüş { ok, ids, n } | { ok:false, hata }.
export function yeniYedekParcaSatisCoklu(form, deps) {
  const satirlar = (form.satirlar || []).filter(s => s && s.partId && (parseInt(s.miktar) || 0) > 0);
  if (!satirlar.length) return { ok: false, hata: "En az bir yedek parça ekleyin (parça + miktar)." };
  // Tek batchId → tüm satırlar aynı gruba (birden fazla satır varsa; tek satırda da grup id verilir,
  // panoda/geçmişte grup mantığı bozulmasın diye zararsız).
  const batchId = satirlar.length > 1 ? uid() : null;
  const ids = [];
  const stokGorunum = new Map(); // partId → kalan (aynı parça birden çok satırda tükensin)
  for (const s of satirlar) {
    const pid = String(s.partId);
    if (!stokGorunum.has(pid)) stokGorunum.set(pid, totalMiktar(deps.partStock, pid));
    const eldeki = stokGorunum.get(pid);
    const r = yeniYedekParcaSatis(
      { ...form, partId: pid, miktar: s.miktar, birimFiyat: s.birimFiyat, batchId },
      { ...deps, partStock: [{ id: "_v", partId: pid, miktar: Math.max(0, eldeki) }] }
    );
    if (!r.ok) return r;
    ids.push(r.id);
    stokGorunum.set(pid, eldeki - (parseInt(s.miktar) || 0));
  }
  return { ok: true, ids, n: satirlar.length };
}
