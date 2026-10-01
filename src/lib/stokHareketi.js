// Spec 0065: parça stoğu hareketlerinin TEK hesabı (C2). Saf modül: React almaz, zaman okumaz (tarih çağırandan gelir).
//
// Adet (`partStock[].miktar`) ekranların okuduğu TÜRETİLMİŞ ÖNBELLEKTİR (C1); hareket (`partStockLog`) yalnız büyür:
// geri alma satır silmez, ayrı tipte bir karşı hareket yazar (R6, R14). Hareketin anlamı tipine bağlıdır (R4):
// - fark taşıyanlar: stok girişi (+), servis / yedek parça satışı / eski satış / makina üretimi (−), karşı hareketleri (+);
// - mutlak taşıyan: sayım düzeltmesi (`manuel_duzelt`), adedi o değere çeker ve kendinden önceki geçmişi geçersiz kılar.
// Birleştirme (`merge.js` + App) ve tutarlılık raporu aynı `stokEtkisi`'ni çağırır; log'u başka yerde toplamayın.
import { uid, mergeAndUpdate, totalMiktar } from "./utils";

// R14: her düşüm tipinin karşı hareketi. referansId ve partId aslıyla aynı, miktar pozitif.
export const IADE_TIPI = { servis: "servis_iade", bayi_satis: "bayi_satis_iade", satis: "satis_iade", makina_uretimi: "makina_uretimi_iade" };
export const MUTLAK_TIPLER = new Set(["manuel_duzelt"]);

// R8: ekranda ve dışa aktarmada okunur ad.
export const HAREKET_TIP_AD = {
  stok_girisi: "Stok girişi", manuel_duzelt: "Sayım düzeltmesi",
  servis: "Serviste kullanıldı", servis_iade: "Servisten stoğa geri alındı",
  bayi_satis: "Yedek parça satışı", bayi_satis_iade: "Yedek parça satışı stoğa geri alındı",
  satis: "Satış", satis_iade: "Satış stoğa geri alındı",
  makina_uretimi: "Makina üretimi", makina_uretimi_iade: "Makina üretimi stoğa geri alındı",
};
export const hareketTipAdi = (tip) => HAREKET_TIP_AD[tip] || tip || "";
export const iadeMi = (tip) => Object.values(IADE_TIPI).includes(tip);

/** R2, R4: hareketlerin parça başına etkisi, verildikleri sırayla. Sonuç Map(partId → { mutlak: sayı | null, fark }). */
export const stokEtkisi = (hareketler) => {
  const m = new Map();
  for (const l of hareketler || []) {
    if (!l || l.partId == null) continue;
    const pid = String(l.partId);
    const n = Number(l.miktar) || 0;
    const e = m.get(pid) || { mutlak: null, fark: 0 };
    if (MUTLAK_TIPLER.has(l.tip)) { e.mutlak = n; e.fark = 0; } else e.fark += n;
    m.set(pid, e);
  }
  return m;
};
/** Etkiyi bir başlangıç adedine uygular. R20: sonuç 0'ın altına inmez (kırpma kuralı ve DB okuması). */
export const etkiliAdet = (mevcut, e) => Math.max(0, (e.mutlak ?? (Number(mevcut) || 0)) + e.fark);
/** R3: yalnız etkide geçen parçaların adedi değişir; diğer satırlar aynen kalır. */
export const stokuUygula = (partStock, etki) => {
  let u = [...(partStock || [])];
  for (const [pid, e] of etki || []) u = mergeAndUpdate(u, pid, etkiliAdet(totalMiktar(u, pid), e));
  return u;
};

/** R7, R14: bir kaydın parça başına NET düşümü (düşüm eksi karşı hareket), Map(partId → adet > 0). */
export const netDusumleri = (log, referansId, tip) => {
  const iade = IADE_TIPI[tip];
  const m = new Map();
  for (const l of log || []) {
    if (!l || l.partId == null || String(l.referansId) !== String(referansId)) continue;
    const pid = String(l.partId);
    if (l.tip === tip) m.set(pid, (m.get(pid) || 0) + Math.abs(Number(l.miktar) || 0));
    else if (iade && l.tip === iade) m.set(pid, (m.get(pid) || 0) - Math.abs(Number(l.miktar) || 0));
  }
  for (const [pid, n] of m) if (!(n > 0)) m.delete(pid);
  return m;
};
export const netDusum = (log, referansId, tip, partId) => netDusumleri(log, referansId, tip).get(String(partId)) || 0;
/** R6, R8: kalan net düşüm için karşı hareketler. Düşümü kalmamış kayıtta boş (ikinci geri alma etkisiz, R7). */
export const karsiHareketler = (log, referansId, tip, { tarih, notlar = "" } = {}) =>
  [...netDusumleri(log, referansId, tip)].map(([partId, adet]) => ({
    id: uid(), partId, miktar: adet, tip: IADE_TIPI[tip], referansId, tarih, notlar,
  }));
/**
 * Düzenlemede "geri al + yeniden düş" gereksiz mi: kaydın net düşümü istenen kalemlerle (parça başına toplam) birebir
 * aynıysa iki adım stok sonucunu değiştirmez, yalnız log'a iki satır yazardı. Eksik düşülmüş (kırpılmış) kayıtta false
 * döner; o zaman eski akış çalışır ve stok uygunsa eksik kısım düşülür (R5: canlı yazma yolunun sonucu aynı).
 */
export const netDusumAyni = (log, referansId, tip, kalemler) => {
  const istenen = new Map();
  for (const k of kalemler || []) {
    const pid = k && k.partId != null && k.partId !== "" ? String(k.partId) : null;
    const n = parseInt(k && k.miktar) || 0;
    if (pid && n > 0) istenen.set(pid, (istenen.get(pid) || 0) + n);
  }
  const net = netDusumleri(log, referansId, tip);
  if (net.size !== istenen.size) return false;
  for (const [pid, n] of istenen) if (net.get(pid) !== n) return false;
  return true;
};
/** Net düşümü stoğa geri eklenmiş adet (kayıt düzenlenirken kırpma tabanı; satır yazılmaz). */
export const netGeriEklenmis = (partStock, log, referansId, tip) => {
  let u = [...(partStock || [])];
  for (const [pid, adet] of netDusumleri(log, referansId, tip)) u = mergeAndUpdate(u, pid, totalMiktar(u, pid) + adet);
  return u;
};

/**
 * R6: bir kaydın düşülmüş parçalarını stoğa geri al. Satır silinmez, karşı hareket eklenir; adet net düşüm kadar artar.
 * Canlı state'e işlevsel güncelleyiciyle, yalnız ilgili parçalara uygulanır.
 */
export const stokGeriAl = (referansId, tip, setPartStock, setPartStockLog, { tarih, notlar = "" } = {}) => {
  if (!setPartStock || !setPartStockLog) return;
  setPartStockLog(lg => {
    const ek = karsiHareketler(lg, referansId, tip, { tarih, notlar });
    if (!ek.length) return lg;
    setPartStock(ps => stokuUygula(ps, stokEtkisi(ek)));
    return [...lg, ...ek];
  });
};

/**
 * R9–R11, R19: salt okunur tutarlılık raporu. Her parça için saklı adet ile log'dan (0'dan başlayarak, tarih sırasıyla)
 * türeyen adet karşılaştırılır. Saklı log'un ekleme sırası korunmadığından aynı günde sayım düzeltmesiyle başka bir hareketi
 * olan parça "sıra belirsiz" grubuna gider. Hiçbir şeyi değiştirmez (R10).
 */
export const stokTutarliligi = (partStock = [], partStockLog = [], parts = []) => {
  const ad = new Map((parts || []).map(p => [String(p.id), p.ad]));
  const gruplar = new Map();
  (partStockLog || []).forEach((l, i) => {
    if (!l || l.partId == null) return;
    const pid = String(l.partId);
    if (!gruplar.has(pid)) gruplar.set(pid, []);
    gruplar.get(pid).push({ l, i });
  });
  const pidler = new Set([...(partStock || []).map(s => String(s.partId)), ...gruplar.keys()]);
  const sapmalar = [], belirsizler = [];
  let tutarli = 0;
  for (const pid of pidler) {
    const satirlar = (gruplar.get(pid) || []).sort((a, b) => String(a.l.tarih || "").localeCompare(String(b.l.tarih || "")) || a.i - b.i).map(x => x.l);
    const gunSayisi = new Map();
    for (const l of satirlar) gunSayisi.set(l.tarih || "", (gunSayisi.get(l.tarih || "") || 0) + 1);
    const belirsiz = satirlar.some(l => MUTLAK_TIPLER.has(l.tip) && gunSayisi.get(l.tarih || "") > 1);
    const e = stokEtkisi(satirlar).get(pid) || { mutlak: null, fark: 0 };
    const turetilen = etkiliAdet(0, e);
    const sakli = totalMiktar(partStock || [], pid);
    const satir = { partId: pid, ad: ad.get(pid) || "Silinmiş parça", sakli, turetilen, fark: sakli - turetilen };
    if (belirsiz) belirsizler.push(satir);
    else if (satir.fark !== 0) sapmalar.push(satir);
    else tutarli++;
  }
  const sirala = (a, b) => a.ad.localeCompare(b.ad, "tr");
  return { sapmalar: sapmalar.sort(sirala), belirsizler: belirsizler.sort(sirala), tutarli };
};
// R11 (AC-16): raporun kesin söyleyemediği.
export const TUTARLILIK_NOTU = "Sapmanın sebebi kesin bilinemez: hiç kaydedilmemiş eski bir hareketten (bu özellikten önce girilmiş stok) "
  + "ya da adedin elle değiştirilmesinden doğmuş olabilir. Rapor hiçbir adedi değiştirmez; düzeltmek için Parça Stoğu'ndaki sayım düzeltmesini kullanın.";
export const SIRA_BELIRSIZ_NOTU = "Bu parçalarda aynı gün hem sayım düzeltmesi hem başka hareket var; hareketlerin saati tutulmadığı için sıraları bilinemez, adet karşılaştırılmadı.";
