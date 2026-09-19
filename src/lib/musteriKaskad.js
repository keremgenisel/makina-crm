// Müşteri silme kaskadı — bir müşteri Çöp Kutusu'na taşınınca ona bağlı hangi kayıtların
// birlikte gideceğini sayan/işaretleyen saf yardımcılar. Customers.jsx (silme) ve
// SettingsTrash.jsx (geri al / kalıcı sil) aynı bağ tanımını kullansın diye burada.
//
// Neden: yedek parça satışı sonradan eklendi ve kaskada girmemişti; müşteri silinince satış
// "sahipsiz" kalıp raporlarda "—" çıkıyordu (LEZZET BAHÇESİ / BAL KÖFTE&BURGER vakaları).
// Görüşme ve dosyalar da silme anında işaretlenmiyordu (yalnız kalıcı silmede temizleniyordu).

/** Yedek parça satışının alıcısı bu müşteri mi (bayi/dış firma alımları hariç). */
export const yedekParcaAlicisiMi = (s, musteriId) =>
  s?.aliciTipi === "musteri" && s.musteriId === musteriId;

/** Bayi/başka alıcının aldığı ama bu makinaya tahsis edilmiş satırı var mı. */
export const yedekParcaTahsisliMi = (s, musteriId) =>
  !yedekParcaAlicisiMi(s, musteriId) && (s?.tahsisler || []).some(t => t.customerId === musteriId);

/** Tahsisin makina bağı koparken serbest metne yazılacak etiket (iz kaybolmasın). */
export const silinenMakinaEtiketi = (c) => {
  const ad = (c?.name || "").trim();
  const seri = (c?.serialNo || "").trim();
  return `${[ad, seri].filter(Boolean).join(" · ") || "?"} (silinen müşteri)`;
};

/**
 * Müşteriyle birlikte Çöp Kutusu'na gidecek canlı kayıt sayıları. Onay penceresi bunu gösterir.
 * Bayi alımı + bu makinaya tahsis edilen satışlar SİLİNMEZ (bayi borçlu kalır); ayrı sayılır.
 */
export const musteriBagliSayilar = (musteriId, veri = {}) => {
  const canli = (arr) => (arr || []).filter(x => x && !x.deletedAt);
  return {
    servis: canli(veri.services).filter(s => s.customerId === musteriId).length,
    kalip: canli(veri.partSales).filter(p => p.customerId === musteriId).length,
    odeme: canli(veri.payments).filter(p => p.customerId === musteriId).length,
    yedekParca: canli(veri.yedekParcaSatislar).filter(s => yedekParcaAlicisiMi(s, musteriId)).length,
    tahsis: canli(veri.yedekParcaSatislar).filter(s => yedekParcaTahsisliMi(s, musteriId)).length,
    gorusme: canli(veri.gorusmeler).filter(g => g.customerId === musteriId).length,
    dosya: canli(veri.dosyalar).filter(d => d.customerId === musteriId).length,
  };
};

/** "2 servis kaydı, 1 Extra Kalıp satışı, …" — sıfır olanlar yazılmaz; hiçbiri yoksa "". */
export const bagliKayitOzeti = (sayilar) => {
  const parcalar = [
    [sayilar.servis, "servis kaydı"],
    [sayilar.kalip, "Extra Kalıp satışı"],
    [sayilar.yedekParca, "yedek parça satışı"],
    [sayilar.odeme, "ödeme/kapora kaydı"],
    [sayilar.gorusme, "görüşme"],
    [sayilar.dosya, "dosya"],
  ].filter(([n]) => n > 0).map(([n, ad]) => `${n} ${ad}`);
  return parcalar.join(", ");
};

/**
 * Yedek parça dizisine kaskadı uygular: alıcısı bu müşteri olanlar `ts` damgasıyla çöpe; başkasının
 * alıp bu makinaya tahsis ettikleri kalır, tahsis satırı serbest metne çevrilir (customerId → null).
 */
export const yedekParcaKaskad = (arr, musteriId, ts, etiket) => (arr || []).map(s => {
  if (yedekParcaAlicisiMi(s, musteriId)) return s.deletedAt ? s : { ...s, deletedAt: ts };
  if (yedekParcaTahsisliMi(s, musteriId)) {
    return { ...s, tahsisler: s.tahsisler.map(t => t.customerId === musteriId ? { ...t, customerId: null, makinaSerbest: etiket } : t) };
  }
  return s;
});

// Müşteri silinirken makinası Makina Stoğu'na bu notla geri döner (Customers.jsx confirmDel).
export const GERI_DONEN_STOK_NOTU = "Silinen müşteriden geri döndü";
/** Çöpten geri alınan müşterinin makinasını temsil eden, silinirken stoğa düşmüş satır (yoksa null). */
export const geriDonenStokBul = (stock, c) => (stock || []).find(s =>
  s && !s.deletedAt && s.note === GERI_DONEN_STOK_NOTU && s.model === c?.model && (s.serialNo || "") === (c?.serialNo || "")) || null;
