import { uid, bumpId, wasMintedHere } from "./utils";
import { stokEtkisi } from "./stokHareketi";

// ── Çakışma birleştirme planı ────────────────────────────────────────────────
// İki PC aynı anda kayıt yaptığında kaybeden taraf sunucudan güncel veriyi çeker ve
// kendi değişikliklerini üzerine birleştirir. Bu modül birleştirmenin KARAR kısmıdır:
// saf fonksiyon, React'e/Electron'a bağımlı değildir ve vitest ile test edilir.
// State'e uygulama App.jsx'te (mergeLocalIntoReloaded) kalır.
//
// Kurallar:
// - Yerel kaydın ID'si sunucuda yoksa → eklenir.
// - Aynı ID + birebir aynı içerik → zaten kaydedilmiş (tekrar deneme), atlanır.
// - Aynı ID + farklı içerik + ID'yi BU süreç üretti → iki PC aynı numarayı üretmiş;
//   kayıt yeni ID ile kurtarılır, ona işaret eden referanslar düzeltilir.
// - Aynı ID + farklı içerik + ID bizim değil → mevcut kaydın düzenlenme çakışması,
//   kapsam dışı (entity kilitleri koruyor), sunucu kazanır.
// - Eklenen müşterinin seri numarası sunucuda silinmemiş başka bir müşteride varsa →
//   makina iki kez satılmasın diye kayıt "seri no bekliyor" durumuna düşürülür.
// - Eklenen müşterilerin sourceStockId'leri toplanır: stok düşümü korunur (yoksa
//   sunucudan gelen stok listesi satılan makinayı geri diriltir).

// id-anahtarlı, eşzamanlı eklenebilen kayıt listeleri. Yeni bir kalıcı dizi eklenince BURAYA da
// eklenmeli — yoksa sunucu-PC yeniden yükle+birleştir (mergeLocalIntoReloaded) sırasında o dizideki
// yerel eklemeler düşer (calisanlar bu yüzden kayboluyordu). calisanlar'ın dış id referansı yok,
// bu yüzden 2. geçişteki remap listelerine eklenmesi gerekmez.
// Gider kaydı (spec 0001): kalem, tekrarlayan tanım, tür, tedarikçi ve standart genel gider listeleri.
// Model dağılım satırları kalemin içinde taşınır (tahsis deseni), ayrı anahtar değildir.
export const MERGE_KEYS = ["customers", "teklifler", "partSales", "services", "payments", "gorusmeler", "dosyalar", "uretimFormlari", "faturalar", "calisanlar", "yedekParcaSatislar",
  "giderTurleri", "tedarikciler", "giderTanimlari", "giderler", "standartGiderler", "uretimPartileri",
  // Spec 0024: kasa hesapları ve hesap hareketleri (ödeme, virman).
  "kasaHesaplari", "hesapHareketleri",
  // Spec 0040: çek portföyü (tahsilata bağlı).
  "cekler",
  // Spec 0058 R14: kasa iş listesinden kapsam dışı bırakılan kayıtlar (satırın kaydına kimlikle bağlı).
  "kasaKapsamDisi",
  // Spec 0065 R1: parça stok hareketi (yalnız büyür). Adet (partStock) birleşmez; eklenen hareketlerin etkisi (planın
  // stokEtkisi) yeniden yüklenmiş adede uygulanır (R2). Karşılığı App.mergeLocalIntoReloaded'da.
  "partStockLog",
  // Spec 0077 R30, R35: bugüne kadar birleşmeyen yedi bölüm (çakışmada yeni bayi, not, stok satırı, parça, kalıp ve parça
  // türü tanımı ile özel model kayboluyordu). Bayilerin birleştirilmemesi kararı bu spec'le geri alındı. standardModels
  // bilinçli olarak YOK (X7: soft-delete taşımıyor, tek mutasyonu düzenleme).
  "dealers", "notes", "stock", "parts", "kalipDefs", "partTypeDefs", "customModels"];

// Spec 0077 R30 (S3): bölümün kimlik alanı. Özel makina modelinin kimliği adıdır (custom_models.model), `id` yoktur;
// yeniden kimliklendirilmez (aynı ad aynı modeldir). Diğer bölümler `id`.
export const KIMLIK_ALANI = { customModels: "model" };
export const kimlikOf = (key, x) => x?.[KIMLIK_ALANI[key] || "id"];

// Spec 0077 R14, R16, X1: deletedAt'i birleştirmede korunan bölümler = MERGE_KEYS'ten kalıcı silinen bölümler ve stok
// hareketi (yalnız büyür) çıkınca kalanlar. Kalıcı silinen bölümlerde silme diziden çıkarmaktır, iki blobla ayırt edilemez.
export const KALICI_SILINEN = new Set(["hesapHareketleri", "giderTanimlari", "giderTurleri", "standartGiderler", "kasaHesaplari", "cekler", "kasaKapsamDisi", "partStockLog"]);
export const SILME_KORUNAN = MERGE_KEYS.filter(k => !KALICI_SILINEN.has(k));
// Spec 0077 R14 (S2), R33 (S8): birleştirmenin TABANI. Son yükleme ya da son başarılı kayıt anındaki sunucu hâli: bölüm başına
// kimlik → deletedAt (yoksa null) ve firma bilgisinin JSON'u. Yerel değer ancak TABANDAN farklıysa (bu PC değiştirdiyse) kazanır;
// tabansız kural başka PC'nin her silmesini ilk birleştirmede diriltirdi.
export const birlesmeTabaniKur = (blob) => {
  if (!blob) return null;
  const silmeler = new Map();
  for (const key of SILME_KORUNAN) {
    if (!Array.isArray(blob[key])) continue;
    silmeler.set(key, new Map(blob[key].map(x => [kimlikOf(key, x), x?.deletedAt ?? null])));
  }
  return { silmeler, factory: blob.factory !== undefined ? JSON.stringify(blob.factory ?? null) : undefined };
};
// Kimlikler çoğu yerde sayı, bazı bağlarda metin ("7"): remap iki biçimi de tanır ve bağın biçimini korur.
const remapGevsek = (map, val) => {
  if (val == null || !map?.size) return val;
  for (const [eski, yeni] of map) if (String(eski) === String(val)) return typeof val === "string" ? String(yeni) : yeni;
  return val;
};

// Spec 0065 R15: stok hareketinin özü. Aynı kimlikli log satırı yalnız bağı (referansId) ya da notu değişmişse aynı
// harekettir (müşteri silmede makina kitinin bağı taşınır); yeni kimlikle eklenirse stok ikinci kez düşerdi.
const hareketOzu = (l) => JSON.stringify([String(l?.partId), Number(l?.miktar), l?.tip ?? null, l?.tarih ?? null]);

// secenekler.bilinenLogIdleri (spec 0065 triyaj): sunucuda olduğu son yükleme ya da başarılı kayıtta bilinen stok hareketi
// kimlikleri. Bu kümede olup artık sunucuda olmayan satır sunucuda SİLİNMİŞTİR; yeniden eklenirse stok etkisi bir kez daha
// uygulanırdı (eski istemcinin geri alması, başka PC'de yedekten geri yükleme).
export function buildMergePlan(myData, serverData, { bilinenLogIdleri = null, taban = null } = {}) {
  if (!myData || !serverData) return null;
  // Yeniden atanacak ID'ler iki tarafın da maksimumundan sonra gelsin
  bumpId(...MERGE_KEYS.flatMap(k => [serverData[k] || [], myData[k] || []]));

  // 1. geçiş: eklenecekler ve ID yeniden atamaları
  const maps = {}; // key → Map(eskiId → yeniId)
  const adds = {}; // key → eklenecek kayıtlar
  // Spec 0077 R15 (B-4), AC-56: deletedAt kararları ayrı çıktıdır (key → Map(kimlik → deletedAt | null)); App onu adds'ten
  // AYRI bir geçişle uygular (var olan kaydı değiştirir, eklemez).
  const silmeler = {};
  for (const key of MERGE_KEYS) {
    const byId = new Map((serverData[key] || []).map(x => [kimlikOf(key, x), x]));
    maps[key] = new Map();
    adds[key] = [];
    const tabanSilme = taban?.silmeler?.get(key);
    for (const rec of (myData[key] || [])) {
      const kimlik = kimlikOf(key, rec);
      const existing = byId.get(kimlik);
      if (!existing && key === "partStockLog" && bilinenLogIdleri?.has(rec.id)) continue;
      // Spec 0077 triyaj (bulgu 1): kimlik tabanda var ama sunucuda yoksa sunucu (başka PC) onu diziden çıkarmıştır: satılan
      // makinanın stok satırı, boşaltılan çöp, 30 günlük temizlik. Ekleme sayılmaz; yoksa satılmış makina stoğa dönüp ikinci
      // kez satılabilirdi. 0065'in bilinenLogIdleri deseninin genellemesi (taban yalnız SILME_KORUNAN bölümlerde kurulur).
      if (!existing && tabanSilme?.has(kimlik)) continue;
      if (!existing) { adds[key].push(rec); continue; }
      if (JSON.stringify(existing) === JSON.stringify(rec)) continue;
      // Spec 0077 R14 (S2), R17, R18: silme ve çöpten geri alma bu PC'nin kararıysa (yerel değer tabandan farklı) sunucu
      // kopyasına yenilmez. Yalnız deletedAt; kaydın öteki alanları sunucudan kalır (X2). Tabanda olmayan kayıtta sunucu kalır.
      if (tabanSilme && SILME_KORUNAN.includes(key)) {
        const yerel = rec.deletedAt ?? null, sunucu = existing.deletedAt ?? null;
        if (yerel !== sunucu && tabanSilme.has(kimlik) && yerel !== tabanSilme.get(kimlik)) {
          (silmeler[key] ||= new Map()).set(kimlik, yerel);
          continue;
        }
      }
      if (KIMLIK_ALANI[key]) continue; // ad kimlikli bölüm yeniden kimliklendirilmez (S3)
      if (key === "partStockLog" && hareketOzu(existing) === hareketOzu(rec)) continue;
      // Spec 0073 triyaj (bulgu 1): kasa hareketi düzenlenebilir; aynı kimlikli kayıt bu oturumda üretilmiş olsa da yeni kimlikle
      // eklenmez (aynı ödeme iki kez yazılıp bakiye iki kez düşerdi). Düzenleme R24'teki gibi sunucu kopyasına yenilir.
      if (key === "hesapHareketleri") continue;
      if (!wasMintedHere(rec.id)) continue;
      const nid = uid();
      maps[key].set(rec.id, nid);
      adds[key].push({ ...rec, id: nid });
    }
  }

  // 2. geçiş: yeniden atanan ID'lere işaret eden referansları düzelt
  const remapRef = (map, val) => (map.has(val) ? map.get(val) : val);
  // Spec 0044 R16: tahsilatın girdiği hesap da yeniden atanan hesap kimliğini izler (ödeme deseni).
  const hesapRemap = (r) => (r.hesapId != null ? { hesapId: remapRef(maps.kasaHesaplari, r.hesapId) } : {});
  // Spec 0077 R31 (Ö-11): servisin değişen parçaları bir JSON alt dizisidir; parça kimliği dizinin içinde taşınır.
  adds.services  = adds.services.map(s => ({ ...s, customerId: remapRef(maps.customers, s.customerId), ...hesapRemap(s),
    ...(Array.isArray(s.degisenParcalar) ? { degisenParcalar: s.degisenParcalar.map(dp => (dp?.partId != null ? { ...dp, partId: remapGevsek(maps.parts, dp.partId) } : dp)) } : {}) }));
  adds.payments  = adds.payments.map(p => ({ ...p, customerId: remapRef(maps.customers, p.customerId),
    ...(p.hesapId != null ? { hesapId: remapRef(maps.kasaHesaplari, p.hesapId) } : {}) }));
  adds.gorusmeler = adds.gorusmeler.map(g => ({ ...g, customerId: remapRef(maps.customers, g.customerId) }));
  // Dosya künyesi: müşteri dosyası customerId'yi, bağ (refId) ise türüne göre servis/partSale/ödeme
  // haritasını izler. Spec 0077 R31: bayi dosyası (dealerId) yeniden atanan bayi kimliğini izler.
  adds.dosyalar = adds.dosyalar.map(d => {
    const refMap = { servis: maps.services, kalip: maps.partSales, parca: maps.partSales, odeme: maps.payments }[d.refType];
    return {
      ...d,
      customerId: remapRef(maps.customers, d.customerId),
      ...(d.dealerId != null ? { dealerId: remapGevsek(maps.dealers, d.dealerId) } : {}),
      ...(refMap && d.refId != null ? { refId: remapRef(refMap, d.refId) } : {}),
    };
  });
  adds.partSales = adds.partSales.map(p => ({ ...p, customerId: remapRef(maps.customers, p.customerId), teklifId: remapRef(maps.teklifler, p.teklifId), ...hesapRemap(p) }));
  // Yedek parça satışı: alıcı müşteri (musteriId) ve tahsislerin makina referansı (customerId) yeniden atanan müşteri
  // id'lerini izler. Spec 0077 R31: alıcı bayi (dealerId) ve satılan parça (partId) de.
  adds.yedekParcaSatislar = adds.yedekParcaSatislar.map(s => ({
    ...s,
    musteriId: remapRef(maps.customers, s.musteriId),
    ...(s.dealerId != null ? { dealerId: remapGevsek(maps.dealers, s.dealerId) } : {}),
    ...(s.partId != null ? { partId: remapGevsek(maps.parts, s.partId) } : {}),
    // Spec 0006: Evrak'tan üretildiyse kaynak belge de yeniden atanan teklif kimliğini izler.
    ...(s.teklifId != null ? { teklifId: remapRef(maps.teklifler, s.teklifId) } : {}),
    tahsisler: (s.tahsisler || []).map(t => ({ ...t, customerId: remapRef(maps.customers, t.customerId) })),
    ...hesapRemap(s),
  }));
  // Spec 0006 R12/R13: nihai müşteri de müşteri kimliğidir. Spec 0077 R31, R35: bayiler artık birleşir, bayi kimliği de izlenir.
  adds.teklifler = adds.teklifler.map(t => ({ ...t, customerId: remapRef(maps.customers, t.customerId),
    ...(t.nihaiMusteriId != null ? { nihaiMusteriId: remapRef(maps.customers, t.nihaiMusteriId) } : {}),
    ...(t.dealerId != null ? { dealerId: remapGevsek(maps.dealers, t.dealerId) } : {}) }));
  // Gider kaydı: tür/tedarikçi/tanım/çalışan/müşteri makinası referansları yeniden atanan id'leri izler.
  const giderRef = (x) => ({
    ...x,
    turId: remapRef(maps.giderTurleri, x.turId),
    tedarikciId: remapRef(maps.tedarikciler, x.tedarikciId),
    // Personel kalemi/tanımı çalışana kimlikle bağlı; çalışan yeniden id alırsa bağ kopmasın (triyaj bulgu 5).
    calisanId: remapRef(maps.calisanlar, x.calisanId),
    ...(x.makinaTur === "musteri" ? { makinaId: remapRef(maps.customers, x.makinaId) } : {}),
  });
  adds.giderTanimlari = adds.giderTanimlari.map(giderRef);
  adds.giderler = adds.giderler.map(g => ({ ...giderRef(g), tanimId: remapRef(maps.giderTanimlari, g.tanimId) }));
  // Spec 0024: hareket kaleme ve hesaplara kimlikle bağlı; taksit kimliği kalemin içinde taşındığı için değişmez.
  adds.hesapHareketleri = adds.hesapHareketleri.map(h => ({
    ...h,
    ...(h.giderId != null ? { giderId: remapRef(maps.giderler, h.giderId) } : {}),
    ...(h.hesapId != null ? { hesapId: remapRef(maps.kasaHesaplari, h.hesapId) } : {}),
    ...(h.karsiHesapId != null ? { karsiHesapId: remapRef(maps.kasaHesaplari, h.karsiHesapId) } : {}),
    // Spec 0024 B: avans ve mahsup çalışana kimlikle bağlı.
    ...(h.calisanId != null ? { calisanId: remapRef(maps.calisanlar, h.calisanId) } : {}),
    // Spec 0040: ciro hareketi çeke bağlı.
    ...(h.cekId != null ? { cekId: remapRef(maps.cekler, h.cekId) } : {}),
  }));
  // Spec 0040: çek, tahsilata kimlikle bağlı.
  // Spec 0049: bağsız çekte paymentId null kalır; bağsız alınan çekin müşterisi, verilen çekin banka hesabı ve alacaklısı
  // (tedarikçi / çalışan) yeniden atanan kimlikleri izler.
  adds.cekler = adds.cekler.map(c => ({ ...c, paymentId: c.paymentId == null ? c.paymentId : remapRef(maps.payments, c.paymentId),
    ...(c.customerId != null ? { customerId: remapRef(maps.customers, c.customerId) } : {}),
    ...(c.hesapId != null ? { hesapId: remapRef(maps.kasaHesaplari, c.hesapId) } : {}),
    ...(c.alacakliId != null && c.alacakliTur === "tedarikci" ? { alacakliId: remapRef(maps.tedarikciler, c.alacakliId) } : {}),
    ...(c.alacakliId != null && c.alacakliTur === "calisan" ? { alacakliId: remapRef(maps.calisanlar, c.alacakliId) } : {}) }));
  // Spec 0058 R14 (Q3): kapsam dışı girişi kaynağına göre kaydını izler (servis, Extra Kalıp, yedek parça ya da hareket).
  // Bilinen sınır: birleştirme yalnız eklemeleri yeniden uygular; başka PC yazarken yapılan "kapsama al" geri gelebilir.
  const KAPSAM_HARITA = { servis: "services", kalip: "partSales", yedekParca: "yedekParcaSatislar" };
  adds.kasaKapsamDisi = adds.kasaKapsamDisi.map(g => ({ ...g,
    kayitId: remapRef(maps[g.tur === "hareket" ? "hesapHareketleri" : KAPSAM_HARITA[g.kaynak]] || new Map(), g.kayitId) }));
  adds.standartGiderler = adds.standartGiderler.map(x => ({ ...x, grupId: remapRef(maps.standartGiderler, x.grupId) }));
  // Üretim partisi (spec 0022): satılmış makinanın damgalı parti bağı yeniden atanan parti id'sini izler.
  // Spec 0077 R31: makina stoğu artık birleşir; satılan makinanın kaynak stok satırı (sourceStockId) yeniden atanan stok
  // kimliğini izler (seri/stok düşümü koruması aşağıda bu değerle çalışır).
  adds.customers = adds.customers.map(c => ({
    ...c,
    ...(c.sourceStockId != null ? { sourceStockId: remapGevsek(maps.stock, c.sourceStockId) } : {}),
    ...(c.partiId != null ? { partiId: remapRef(maps.uretimPartileri, c.partiId) } : {}),
    kaliplar: (c.kaliplar || []).map(k => k.partSaleId ? { ...k, partSaleId: remapRef(maps.partSales, k.partSaleId) } : k),
  }));

  // Seri no çakışması + stok düşümü koruması
  const serverSerials = new Set((serverData.customers || []).filter(c => !c.deletedAt && c.serialNo).map(c => c.serialNo));
  const stockDeductIds = new Set();
  const serialConflicts = []; // { serialNo, name } — çağıran kullanıcıyı uyarır
  adds.customers = adds.customers.map(c => {
    if (c.serialNo && serverSerials.has(c.serialNo)) {
      serialConflicts.push({ serialNo: c.serialNo, name: c.name });
      return { ...c, serialNo: "", seriNoBekliyor: true, sourceStockId: null };
    }
    if (c.sourceStockId != null) stockDeductIds.add(c.sourceStockId);
    return c;
  });

  // Spec 0065 triyaj (bulgu 3): stok hareketinin bağı (referansId) tipine göre yeniden atanan kaydı izler; yoksa yeni
  // kimlik alan servisin / yedek parça satışının net düşümü 0 okunur (silinince iade yok, düzenlemede çift düşüm).
  // Makina stoğu birleştirilmediği için makina_uretimi bağı olduğu gibi kalır.
  // Spec 0077 R31: makina stoğu birleştiği için makina_uretimi bağı da yeniden atanan stok kimliğini izler.
  const logBagHaritasi = { servis: maps.services, servis_iade: maps.services, bayi_satis: maps.yedekParcaSatislar, bayi_satis_iade: maps.yedekParcaSatislar,
    makina_uretimi: maps.stock, makina_uretimi_iade: maps.stock };
  adds.partStockLog = adds.partStockLog.map(l => {
    const m = logBagHaritasi[l.tip];
    const bagli = m && l.referansId != null && m.has(l.referansId) ? { ...l, referansId: m.get(l.referansId) } : l;
    // Spec 0077 R31, R32 (S9): hareketin parçası yeniden atanan parça kimliğini izler; stokEtkisi'nden ÖNCE (adet yeni kimlikte doğar).
    return bagli.partId != null ? { ...bagli, partId: remapGevsek(maps.parts, bagli.partId) } : bagli;
  });

  // Spec 0065 R2, R3: yalnız bu birleştirmede eklenen hareketlerin etkisi (hareketi olmayan parça yok).
  const etki = stokEtkisi(adds.partStockLog);
  // Spec 0077 R32 (S9): yeniden kimliklendirilen parçanın HİÇ hareketi yoksa yerel stok satırı yeni kimlikle ayrıca eklenir;
  // hareketi varsa adet zaten etkiden doğar (ikisi birden adedi iki katına çıkarırdı).
  const etkiliParcalar = new Set([...etki.keys()].map(String));
  const parcaStoklari = [];
  for (const [eski, yeni] of maps.parts) {
    if (etkiliParcalar.has(String(yeni))) continue;
    const satir = (myData.partStock || []).find(ps => String(ps?.partId) === String(eski));
    if (satir) parcaStoklari.push({ ...satir, id: uid(), partId: typeof satir.partId === "string" ? String(yeni) : yeni });
  }
  // Spec 0077 R33 (S8): firma bilgisi yalnız bu PC'de değiştiyse (tabandan farklıysa) yeniden yüklenen kopyanın üstüne yazılır.
  const firma = taban && taban.factory !== undefined && myData.factory !== undefined && JSON.stringify(myData.factory ?? null) !== taban.factory
    ? myData.factory : null;
  return { adds, maps, stockDeductIds, serialConflicts, stokEtkisi: etki, silmeler, parcaStoklari, firma };
}
