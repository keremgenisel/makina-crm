// Yedek parça (kargo) satışı ortak kayıt mantığı. Stok > Yedek Parça Satışı sekmesi, müşteri detay
// modalı ve bayi detay modalı aynı doğrulama + kayıt yolunu kullanır (ayrışmasın diye tek kaynak).
import { uid, today, yerelBugun, fmtTR, parseMoney, simdiYerel, totalMiktar, tahsilEdilecekKdv, tahsilKdvOrani } from "./utils";
import { satisTevkifatUygula, satisTevkifatDogrula, kartTabanKaydi, kartTabanIsaretle } from "./satisTevkifat";
import { ihracKayitliUygula, ihracKayitliDogrula } from "./ihracKayitli";
import { yedekParcaDus } from "./yedekParcaStok";
import { netDusumleri, netDusumAyni } from "./stokHareketi";
import { yerelServisEkle } from "./yerelServis";
import { kartKomisyonuSnapshot, kartYansitmaAyrim } from "./krediKarti";

// ── Garanti içi ücretsiz verme (spec 0095) ──────────────────────────────────────────────────────────────────────────
// İşaretin TEK yazım yolu (R14/2, AC-34): alan her çağrıda silinir, yalnız form işaretliyse `true` yazılır (kapalı değer
// gövdeye girmez, C4; `{ ...eski, ...rec }` birleştirmesi eski `true`'yu korumasın). İşaretliyken ödeme ve tahsilat
// alanları temizlenir (R7/2), tevkifat anahtarları silinir (R7) ve fatura tipi boşalır (R18c). Birim fiyat saklanır (R12).
export const ucretsizUygula = (rec, form) => {
  const k = { ...rec };
  delete k.ucretsizMi;
  if (!form?.ucretsizMi) return k;
  delete k.tevkifatli; delete k.tevkifatPay; delete k.tevkifatPayda;
  return { ...k, ucretsizMi: true, faturaTipi: "", yontem: "", vadeTarihi: "", tahsilEdildi: false, taksitSayisi: null,
    kartKomisyonu: null, hesapId: null, odendi: false, tahsilatTarihi: null };
};
// Alıcı müşterinin (makina kaydı) garanti durumu (R4, R4/2): ölçüt `warrantyEnd >= bugün`, bugün YEREL gündür
// (`ServiceForm`'un `today()` satırı UTC'dir ve bilinçli olarak değişmedi, X9). Alıcı yoksa null.
// Spec 0095 R23 (triyaj) → spec 0111 C10: işaret form düzeyindedir; toplu düzenleme form işaretini partinin bütün satırlarına
// uygular, yani karışık partide ücretsiz satır saklı fiyatıyla ücretli olur.
export const KARISIK_PARTI_UYARISI = "Bu partide ücretsiz satır var; kaydedince ücretli olur, ayrı düzenleyin.";
export const GARANTI_UYARISI = "Bu makinanın garantisi aktif görünmüyor; parça yine de ücretsiz kaydedilebilir.";
export const garantiDurumu = (musteri, bugun = yerelBugun()) => {
  if (!musteri) return null;
  const bitis = musteri.warrantyEnd || "";
  if (!bitis) return { aktif: false, metin: "Garanti bitiş tarihi girilmemiş" };
  return bitis >= bugun ? { aktif: true, metin: `Garanti aktif · bitiş ${fmtTR(bitis)}` } : { aktif: false, metin: `Garanti ${fmtTR(bitis)} tarihinde bitti` };
};

// Form → normalize + doğrula → { ok, rec } | { ok:false, hata }. Alıcı bayi VEYA müşteri olabilir.
// ayar = krediKartiKomisyonlari (kredi kartı komisyon tablosu), kdvRates = KDV oran dönemleri —
// yöntem Kredi Kartı ise komisyon, KDV DAHİL satış tutarı (birimFiyat×miktar + KDV) üzerinden hesaplanır
// (banka komisyonu KDV dahil çekilen tutardan keser). yansitildi=false → Finance komisyonu net cirodan düşer.
export function yedekParcaRec(form, ayar = null, kdvRates = undefined) {
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
  // Kredi kartı: birimFiyat + komisyon snapshot. Komisyon müşteriye YANSITILDIYSA (kkYansit) birimFiyat
  // KDV matrahına ((kalem+komisyon)/miktar) ölçeklenir → komisyon KDV matrahına girer ama ciroya girmez
  // (Finance düşer). Yansıtılmadıysa birimFiyat = kalem, snapshot KDV dahil satış tutarı üzerinden (yansitildi=false).
  const netBirim = parseMoney(form.birimFiyat);
  const netBedel = netBirim * miktar;
  const kdvTarih = form.tarih || today();                     // KDV oranı SATIŞ tarihinden
  const kkTarih = form.kartTarihi || form.tarih || today();   // blokaj KART İŞLEM tarihinden (boşsa satış tarihi)
  const kkFatura = form.faturaTipi || "Faturalı Yurtiçi";
  const ucretsiz = !!form.ucretsizMi; // spec 0095 R7/4: ücretsizde tevkifat doğrulanmaz, kart dalı çalışmaz
  const tevkifatHata = ucretsiz ? null : (satisTevkifatDogrula(form, kkFatura) || ihracKayitliDogrula(form, kkFatura)); // spec 0079 R6, spec 0114 R12
  if (tevkifatHata) return { ok: false, hata: tevkifatHata };
  // Spec 0079 R13 (revizyon 2): kart tutarı tahsil edilen KDV ile; düzenlemede kayıtlı anlık görüntünün tabanı korunur.
  const taban = kartTabanKaydi(form);
  let birimFiyatSave = netBirim, kartKomisyonu = null;
  if (!ucretsiz && form.yontem === "Kredi Kartı" && form.taksitSayisi && ayar) {
    if (form.kkYansit && netBedel > 0) {
      const kdvOran = tahsilKdvOrani(kkFatura, kdvTarih, kdvRates, taban); // uygulanan (tahsil edilen) oran; Yurtdışı/Faturasız → 0
      const a = kartYansitmaAyrim(netBedel, form.taksitSayisi, ayar, kdvOran, kkTarih);
      if (a) { birimFiyatSave = miktar > 0 ? a.kdvMatrah / miktar : a.kdvMatrah; kartKomisyonu = kartKomisyonuSnapshot(a.kartTutari, form.taksitSayisi, ayar, kkTarih, true); }
    }
    if (!kartKomisyonu) {
      const kdvDahil = netBedel + tahsilEdilecekKdv(kkFatura, netBedel, kdvTarih, kdvRates, taban);
      kartKomisyonu = kartKomisyonuSnapshot(kdvDahil, form.taksitSayisi, ayar, kkTarih, false);
    }
    kartKomisyonu = kartTabanIsaretle(kartKomisyonu, taban);
  }
  return { ok: true, rec: ucretsizUygula(ihracKayitliUygula(satisTevkifatUygula({
    aliciTipi, dealerId, musteriId, partId, miktar,
    // Anlaşmasız dış firma alıcı bilgileri (yalnız bu kayda; bayi/müşteri kaydı oluşturulmaz).
    disFirma,
    disFirmaAd: disFirma ? String(form.disFirmaAd || "").trim() : "", disFirmaYetkili: disFirma ? (form.disFirmaYetkili || "") : "",
    disFirmaTel: disFirma ? (form.disFirmaTel || "") : "", disFirmaAdres: disFirma ? (form.disFirmaAdres || "") : "",
    disFirmaUlke: disFirma ? (form.disFirmaUlke || "") : "", disFirmaSehir: disFirma ? (form.disFirmaSehir || "") : "",
    birimFiyat: birimFiyatSave, currency: form.currency || "TRY",
    tarih: form.tarih || today(), faturaTipi: form.faturaTipi || "Faturalı Yurtiçi", odendi: !!form.odendi,
    // Ödeme yöntemi (makina satışıyla aynı). Çek ise vade + tahsil takibi; çek tahsil edilene kadar
    // borçlu sayılır (bkz. satisTahsilEdildi). Çek değilse çek alanları boşlanır.
    yontem: form.yontem || "Nakit", vadeTarihi: form.yontem === "Çek" ? (form.vadeTarihi || "") : "",
    tahsilEdildi: form.yontem === "Çek" ? !!form.tahsilEdildi : false,
    taksitSayisi: form.yontem === "Kredi Kartı" ? (form.taksitSayisi ?? null) : null,
    kartKomisyonu,
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
    // Evrak'tan üretildiyse kaynak belge ve alt kalem (spec 0006 R10/R15); elle girilen satışta boş.
    teklifId: form.teklifId ?? null, teklifKalemId: form.teklifKalemId ?? null,
    // Spec 0044 R1: tahsilatın girdiği hesap; formda alan hiç yoksa kayda dokunulmaz (düzenleme ...rec ile birleşir).
    ...(form.hesapId !== undefined ? { hesapId: form.hesapId ?? null } : {}),
  }, form, kkFatura), form, kkFatura), form) }; // spec 0079 R5, R7: toplu satışta her satıra aynı tevkifat; spec 0095 R13: aynı işaret; spec 0114 R6/2: ihraç işareti ucretsizUygula'dan önce
}
// Düzenleme kolu (spec 0079 R5/1): `{ ...eski, ...rec }` birleştirmesi eski tevkifat alanlarını silmez; buradan geçer.
// Spec 0095 R14/2: aynı tuzak işaret için de geçerli; `ucretsizUygula` alanı siler ya da yazar (son adım).
// Spec 0114 R6/2: ihraç işareti de buradan (ucretsizUygula'dan önce); 0111'in toplu düzenlemesi de bu yoldan geçer.
export const yedekParcaGuncelle = (eski, rec, form) => ucretsizUygula(ihracKayitliUygula(satisTevkifatUygula({ ...eski, ...rec }, form, rec.faturaTipi), form, rec.faturaTipi), form);

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
export function yeniYedekParcaSatis(form, { setYedekParcaSatislar, setPartStock, setPartStockLog, partStock = [], ayar = null, kdvRates = undefined }) {
  const sonuc = yedekParcaRec(form, ayar, kdvRates);
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
      { ...form, partId: pid, miktar: s.miktar, birimFiyat: s.birimFiyat, batchId, teklifKalemId: s.teklifKalemId ?? form.teklifKalemId ?? null },
      { ...deps, partStock: [{ id: "_v", partId: pid, miktar: Math.max(0, eldeki) }] }
    );
    if (!r.ok) return r;
    ids.push(r.id);
    stokGorunum.set(pid, eldeki - (parseInt(s.miktar) || 0));
  }
  return { ok: true, ids, n: satirlar.length };
}

// Spec 0030 R5/R6: bir satış kimliğinden kargo partisini çözer (etiket partinin tamamını kapsar). batchId varsa silinmemiş
// bütün kardeşler, yoksa yalnız o satış; satış yoksa ya da silinmişse boş dizi (düğme çizilmez).
export function satisPartisi(satislar, satisId) {
  const liste = (satislar || []).filter(s => s && !s.deletedAt);
  const s = liste.find(x => String(x.id) === String(satisId));
  if (!s) return [];
  return s.batchId != null ? liste.filter(x => x.batchId === s.batchId) : [s];
}

// Yedek parça satışının alıcı adı: müşteri / anlaşmasız dış firma / bayi (spec 0044 Q9: saf modülde, kasa motoru da kullanır).
export const aliciAd = (s, dealers = [], customers = []) => {
  if (s?.aliciTipi === "musteri") return (customers.find(c => c.id === s.musteriId)?.name) || "(müşteri yok)";
  if (s?.disFirma) return s.disFirmaAd || "(dış firma)"; // anlaşmasız dış firma alıcı (kayıtlı bayi değil)
  return (dealers.find(d => d.id === s?.dealerId)?.name) || "(bayi yok)";
};

// ── Toplu satışın yerinde düzenlenmesi (spec 0111) ───────────────────────────────────────────────────────────────────
export const TOPLU_PARTI_DEGISTI = "Bu parti başka bir bilgisayarda değişti, pencereyi kapatıp yeniden açın.";
export const TOPLU_SATIR_HATASI = "Kayıt yapılmadı: işaretli satırları düzeltin ya da satırı çöp düğmesiyle çıkarın.";
export const TOPLU_BOS_HATASI = "En az bir yedek parça ekleyin (parça + miktar).";
export const TOPLU_GUNCELLENDI = "Toplu yedek parça satışı güncellendi.";
export const TOPLU_BAYIYE_GECTI = "Toplu yedek parça satışı güncellendi. Alıcı artık bu makina değil, satış bu makinanın geçmişinden çıktı; Stok sekmesinden düzenlenebilir.";
export const TOPLU_BASKA_MUSTERIYE_GECTI = "Toplu yedek parça satışı güncellendi ve başka bir müşterinin makinasına taşındı; satış artık o makinanın geçmişinde görünür.";
// R9/2 (triyaj): kayıttan sonraki bildirim. Ölçüt alıcının açık olan makina olup olmadığıdır, yalnız alıcı türü değil.
export const topluBildirimi = (form, makinaId) => (form?.aliciTipi !== "musteri" ? TOPLU_BAYIYE_GECTI
  : String(form.musteriId ?? "") !== String(makinaId ?? "") ? TOPLU_BASKA_MUSTERIYE_GECTI : TOPLU_GUNCELLENDI);

// R10: otomatik tam tahsis = tek satır, miktarı kaydın miktarı, müşterisi kaydın alıcısı, seri no ve serbest metin boş. Tarih ölçüte girmez (R10/2).
export const otomatikTamTahsisMi = (kayit) => {
  const t = Array.isArray(kayit?.tahsisler) ? kayit.tahsisler : [];
  return t.length === 1 && kayit.aliciTipi === "musteri" && kayit.musteriId != null
    && Number(t[0].miktar) === Number(kayit.miktar) && String(t[0].customerId) === String(kayit.musteriId)
    && !t[0].serialNo && !t[0].makinaSerbest;
};
// R10–R12: miktar ve alıcı değişmediyse dokunulmaz; otomatik tam tahsis yeni miktar ve alıcıyla yeniden damgalanır (kendi
// tarihi korunur), alıcı bayi olduysa boşalır; elle yapılmış tahsis olduğu gibi kalır.
export const tahsisYenile = (eski, rec) => {
  const t = Array.isArray(eski?.tahsisler) ? eski.tahsisler : [];
  const miktarDegisti = Number(eski?.miktar) !== Number(rec?.miktar);
  const aliciDegisti = eski?.aliciTipi !== rec?.aliciTipi || String(eski?.musteriId ?? "") !== String(rec?.musteriId ?? "");
  if (!miktarDegisti && !aliciDegisti) return t;
  if (!otomatikTamTahsisMi(eski)) return t;
  if (rec.aliciTipi !== "musteri" || !rec.musteriId) return [];
  return [{ ...t[0], miktar: rec.miktar, customerId: Number(rec.musteriId) }];
};

// Formun satıra ait olmayan alanları (ortak alanlar); satır ve form içi işaretler kayda girmez.
const ortakAlanlar = (form) => {
  const { satirlar, _satirHatalari, _kilitId, batchEdit, _karisikUcretsiz, _odendiAcilis, _acilisIdleri, ...ortak } = form || {};
  return ortak;
};

/**
 * R17: toplu (aynı batchId) satışın düzenleme kararı. React'sız ve saftır; kimlik ve zaman parametreden gelir (R17/2).
 * Girdi: partinin canlı kayıtları, form (ortak alanlar + `satirlar[]`, her satır geldiği kaydın kimliğini `_kayitId` ile taşır).
 * Çıktı: { ok, guncellenen, eklenen, silinen (kimlik), silmeDamgasi, stok: [{ islem: "geriAl", kayitId } | { islem: "dus",
 * partId, miktar, kayitId }] } ya da { ok:false, hata, satirHatalari? }. Ya hep ya hiç: hata varsa hiçbir liste dönmez.
 */
export function topluDuzenlemePlani(eskiler, form, { partStock = [], partStockLog = [], ayar = null, kdvRates = undefined, yeniId, olusturmaZamani, silmeDamgasi, bugun = null } = {}) {
  const canli = (eskiler || []).filter(s => s && !s.deletedAt);
  const kayitlar = new Map(canli.map(s => [String(s.id), s]));
  const satirlar = Array.isArray(form?.satirlar) ? form.satirlar : [];
  // R2/2: satırın taşıdığı kimlik partide yoksa yeni kayıt sayılmaz, düzenleme bütünüyle reddedilir.
  if (satirlar.some(s => s && s._kayitId != null && !kayitlar.has(String(s._kayitId)))) return { ok: false, hata: TOPLU_PARTI_DEGISTI };
  // Triyaj (R2/3): form açılırken partide olmayan canlı kayıt (başka bilgisayarın eklediği satır) "çıkarıldı" sayılmaz, reddedilir.
  if (Array.isArray(form?._acilisIdleri)) {
    const acilis = new Set(form._acilisIdleri.map(String));
    if (canli.some(s => !acilis.has(String(s.id)))) return { ok: false, hata: TOPLU_PARTI_DEGISTI };
  }
  // Triyaj (R6/4): formdaki "Ödendi" kutusuna dokunulduysa (açılış değerinden farklı) değer ücretli bütün satırlara yazılır;
  // dokunulmadıysa her satır kendi ödeme durumunu korur (0109 Karar 21 emsali).
  const odemeDokunuldu = form?._odendiAcilis !== undefined && !!form.odendi !== !!form._odendiAcilis;
  // R1/2, R1/3: listede duran satırın değeri geçersizse kayıt bütünüyle reddedilir; silme yalnız satırın çıkarılmasıyla olur.
  const satirHatalari = {};
  satirlar.forEach((s, i) => {
    if (!s?.partId) satirHatalari[i] = "Yedek parça seçin.";
    else if (!((parseInt(s.miktar) || 0) > 0)) satirHatalari[i] = "Miktar 0'dan büyük olmalı.";
  });
  const hataSayisi = Object.keys(satirHatalari).length;
  if (hataSayisi) return { ok: false, hata: hataSayisi === satirlar.length ? TOPLU_BOS_HATASI : TOPLU_SATIR_HATASI, satirHatalari };
  if (!satirlar.length) return { ok: false, hata: TOPLU_BOS_HATASI };
  const ortak = ortakAlanlar(form);
  const kurulan = [];
  for (const s of satirlar) {
    const eski = s._kayitId != null ? kayitlar.get(String(s._kayitId)) : null;
    // R7, R7/2: formun göstermediği teklif bağı ve kart anlık görüntüsü güncellenen kaydın kendisinden.
    const satirFormu = {
      ...ortak, partId: s.partId, miktar: s.miktar, birimFiyat: s.birimFiyat, batchId: form.batchId ?? null,
      teklifId: eski ? (eski.teklifId ?? null) : null, teklifKalemId: eski ? (eski.teklifKalemId ?? null) : null,
      ...(eski?.kartKomisyonu ? { kartKomisyonu: eski.kartKomisyonu } : {}),
    };
    const r = yedekParcaRec(satirFormu, ayar, kdvRates);
    if (!r.ok) return { ok: false, hata: r.hata };
    kurulan.push({ eski, satirFormu, rec: r.rec });
  }
  const kullanilan = new Set(kurulan.filter(k => k.eski).map(k => String(k.eski.id)));
  const silinenKayitlar = canli.filter(s => !kullanilan.has(String(s.id)));
  // R13–R15/2: taban = anlık görüntü + bu düzenlemede geri alınan bütün net düşümler; satırlar form sırasıyla düşer.
  const taban = new Map();
  const tabanOf = (pid) => { if (!taban.has(pid)) taban.set(pid, totalMiktar(partStock, pid)); return taban.get(pid); };
  const geriAl = (kayitId) => {
    stok.push({ islem: "geriAl", kayitId });
    for (const [pid, adet] of netDusumleri(partStockLog, kayitId, "bayi_satis")) taban.set(pid, tabanOf(pid) + adet);
  };
  const stok = [];
  silinenKayitlar.forEach(s => geriAl(s.id));
  const guncellenen = [], eklenen = [], dusulecek = [];
  let yeniSira = 0;
  for (const { eski, satirFormu, rec } of kurulan) {
    if (eski) {
      let k = yedekParcaGuncelle(eski, rec, satirFormu);
      // R6/3: ödeme durumu satır başınadır; form işaretiyle ücretsizse ödeme durumu yoktur (0095 R7/2). panoGizli birleştirmeyle kalır.
      if (!k.ucretsizMi) {
        if (!odemeDokunuldu) k = { ...k, odendi: !!eski.odendi, tahsilatTarihi: eski.tahsilatTarihi ?? null };
        else if (!form.odendi) k = { ...k, odendi: false, tahsilatTarihi: null };
        else {
          // Zaten ödenmiş satır tarihini korur; yeni işaretlenen satıra tek tık anahtarının kuralıyla o gün (çek ve kartta boş).
          const cekKK = k.yontem === "Çek" || k.yontem === "Kredi Kartı";
          k = { ...k, odendi: true, tahsilatTarihi: eski.odendi ? (eski.tahsilatTarihi ?? null) : (cekKK ? null : bugun) };
        }
      }
      k = { ...k, tahsisler: tahsisYenile(eski, k) };
      guncellenen.push(k);
      if (!netDusumAyni(partStockLog, eski.id, "bayi_satis", [k])) { geriAl(eski.id); dusulecek.push(k); }
    } else {
      const id = yeniId(yeniSira++);
      const k = { ...rec, id, olusturmaZamani, tahsisler: musteriTahsisi(rec) };
      eklenen.push(k);
      dusulecek.push(k);
    }
  }
  for (const k of dusulecek) {
    const pid = String(k.partId);
    const dusulen = Math.min(k.miktar, Math.max(0, tabanOf(pid)));
    taban.set(pid, tabanOf(pid) - dusulen);
    if (dusulen > 0) stok.push({ islem: "dus", partId: pid, miktar: dusulen, kayitId: k.id });
  }
  return { ok: true, guncellenen, eklenen, silinen: silinenKayitlar.map(s => s.id), silmeDamgasi, stok };
}

