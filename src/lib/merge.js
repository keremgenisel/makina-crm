import { uid, bumpId, wasMintedHere } from "./utils";

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
  "giderTurleri", "tedarikciler", "giderTanimlari", "giderler", "standartGiderler"];

export function buildMergePlan(myData, serverData) {
  if (!myData || !serverData) return null;
  // Yeniden atanacak ID'ler iki tarafın da maksimumundan sonra gelsin
  bumpId(...MERGE_KEYS.flatMap(k => [serverData[k] || [], myData[k] || []]));

  // 1. geçiş: eklenecekler ve ID yeniden atamaları
  const maps = {}; // key → Map(eskiId → yeniId)
  const adds = {}; // key → eklenecek kayıtlar
  for (const key of MERGE_KEYS) {
    const byId = new Map((serverData[key] || []).map(x => [x.id, x]));
    maps[key] = new Map();
    adds[key] = [];
    for (const rec of (myData[key] || [])) {
      const existing = byId.get(rec.id);
      if (!existing) { adds[key].push(rec); continue; }
      if (JSON.stringify(existing) === JSON.stringify(rec)) continue;
      if (!wasMintedHere(rec.id)) continue;
      const nid = uid();
      maps[key].set(rec.id, nid);
      adds[key].push({ ...rec, id: nid });
    }
  }

  // 2. geçiş: yeniden atanan ID'lere işaret eden referansları düzelt
  const remapRef = (map, val) => (map.has(val) ? map.get(val) : val);
  adds.services  = adds.services.map(s => ({ ...s, customerId: remapRef(maps.customers, s.customerId) }));
  adds.payments  = adds.payments.map(p => ({ ...p, customerId: remapRef(maps.customers, p.customerId) }));
  adds.gorusmeler = adds.gorusmeler.map(g => ({ ...g, customerId: remapRef(maps.customers, g.customerId) }));
  // Dosya künyesi: müşteri dosyası customerId'yi, bağ (refId) ise türüne göre servis/partSale/ödeme
  // haritasını izler. Bayi dosyaları (dealerId) merge edilmediği için dealerId olduğu gibi kalır.
  adds.dosyalar = adds.dosyalar.map(d => {
    const refMap = { servis: maps.services, kalip: maps.partSales, parca: maps.partSales, odeme: maps.payments }[d.refType];
    return {
      ...d,
      customerId: remapRef(maps.customers, d.customerId),
      ...(refMap && d.refId != null ? { refId: remapRef(refMap, d.refId) } : {}),
    };
  });
  adds.partSales = adds.partSales.map(p => ({ ...p, customerId: remapRef(maps.customers, p.customerId), teklifId: remapRef(maps.teklifler, p.teklifId) }));
  // Yedek parça satışı: alıcı bayi (dealerId) merge edilmiyor; alıcı müşteri (musteriId) ve tahsislerin
  // makina referansı (customerId) yeniden atanan müşteri id'lerini izlemeli.
  adds.yedekParcaSatislar = adds.yedekParcaSatislar.map(s => ({
    ...s,
    musteriId: remapRef(maps.customers, s.musteriId),
    tahsisler: (s.tahsisler || []).map(t => ({ ...t, customerId: remapRef(maps.customers, t.customerId) })),
  }));
  adds.teklifler = adds.teklifler.map(t => ({ ...t, customerId: remapRef(maps.customers, t.customerId) }));
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
  adds.standartGiderler = adds.standartGiderler.map(x => ({ ...x, grupId: remapRef(maps.standartGiderler, x.grupId) }));
  adds.customers = adds.customers.map(c => ({
    ...c,
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

  return { adds, maps, stockDeductIds, serialConflicts };
}
