// Spec 0077 C2, R42, R45: kaydın tek kapısı (saf). Başarısızlık nedeni, nedene göre mesaj, yeniden deneme kuralı, mesaj
// bastırma, "şimdi veri yenilenebilir mi" kararı ve perdenin görünürlüğü yalnız buradan okunur; App ve ekranlar kendi
// koşulunu yazmaz (kaynak taraması).

// R1: crm:save'in nedenleri. BILINMIYOR yalnız eski (boolean dönen) köprü ve test sahteleri içindir.
export const SEBEP = {
  CAKISMA: "cakisma", OTURUM: "oturum", YETKI: "yetki", SINIR: "sinir", SUNUCU: "sunucu", BAGLANTI: "baglanti",
  YEREL: "yerel", BILINMIYOR: "bilinmiyor",
};

// R1: HTTP durum kodu → neden (istemci modu). 2xx bu fonksiyona gelmez.
export const sebepHttp = (status) => (status === 401 ? SEBEP.OTURUM : status === 403 ? SEBEP.YETKI : status === 409 ? SEBEP.CAKISMA
  : status === 429 ? SEBEP.SINIR : SEBEP.SUNUCU);

// R1: köprünün dönüşünü tek şekle çevirir. Eski köprü (ve test sahteleri) boolean döner; nesne { ok, sebep } yeni şekildir.
export const kayitSonucu = (r) => {
  if (r === true) return { ok: true, sebep: null };
  if (r && typeof r === "object") return r.ok ? { ok: true, sebep: null } : { ok: false, sebep: r.sebep || SEBEP.BILINMIYOR };
  return { ok: false, sebep: SEBEP.BILINMIYOR };
};

// R2–R5, R42: nedene göre TEK mesaj tablosu. null = kayıt yolu mesaj üretmez: çakışmanın sahibi onConflict'tir (R2),
// oturumun sahibi onSessionExpired'dır (R3). "Kapatıp yeniden açın" yalnız kurtarılamaz yerel yazma hatasında (R5).
export const KAYIT_MESAJLARI = {
  [SEBEP.CAKISMA]: null,
  [SEBEP.OTURUM]: null,
  [SEBEP.YETKI]: { metin: "Bu veriyi değiştirme yetkiniz yok; değişiklik kaydedilmedi.", tur: "err" },
  [SEBEP.SINIR]: { metin: "Kayıt şu an yapılamadı, kısa süre sonra yeniden denenecek.", tur: "warn" },
  [SEBEP.SUNUCU]: { metin: "Kayıt şu an yapılamadı, kısa süre sonra yeniden denenecek.", tur: "warn" },
  [SEBEP.BAGLANTI]: { metin: "Sunucuya ulaşılamıyor; bağlantı gelince değişiklikler kaydedilecek.", tur: "warn" },
  [SEBEP.YEREL]: { metin: "Değişiklikler kaydedilemedi! Uygulamayı kapatıp yeniden açın.", tur: "err" },
  [SEBEP.BILINMIYOR]: { metin: "Değişiklikler kaydedilemedi; biraz sonra yeniden deneyin.", tur: "err" },
};
// R2: çakışmanın tek mesajı (onConflict basar), sonucu söyler.
export const CAKISMA_MESAJI = { metin: "Başka bir kullanıcı veriyi değiştirdi; değişiklikleriniz birleştirildi.", tur: "warn" };
// R6, AC-7: yeniden denemeler tükendi.
export const DENEME_TUKENDI_MESAJI = { metin: "Değişiklikler kaydedilemedi (sunucu yanıt vermedi). Biraz sonra yeniden deneyin.", tur: "err" };
// R23 (Ö-15), AC-57: perde kaçtıktan sonra kayıt başarıyla biterse.
export const KAYDEDILDI_MESAJI = { metin: "Değişiklikler kaydedildi.", tur: "ok" };
// R23: perde 10 sn'de kaçarken.
export const KACIS_MESAJI = { metin: "Kayıt uzun sürüyor; arka planda devam ediyor.", tur: "warn" };
// R6 (B-2), AC-52: çevrimiçine dönüşteki yeniden deneme.
export const YENIDEN_BAGLANDI_MESAJI = { metin: "Sunucu bağlantısı yeniden kuruldu.", tur: "ok" };
export const YENIDEN_BAGLANDI_KAYDEDILDI_MESAJI = { metin: "Sunucu bağlantısı yeniden kuruldu; değişiklikler kaydedildi.", tur: "ok" };
export const kayitMesaji = (sebep) => (sebep in KAYIT_MESAJLARI ? KAYIT_MESAJLARI[sebep] : KAYIT_MESAJLARI[SEBEP.BILINMIYOR]);

// R6 (Ö-9), AC-53: yalnız yazma sınırı ve geçici sunucu hatası otomatik denenir; en çok üç deneme, 1 / 4 / 10 sn.
export const YENIDEN_DENEME_BEKLEMELERI = [1000, 4000, 10000];
export const yenidenDenenirMi = (sebep) => sebep === SEBEP.SINIR || sebep === SEBEP.SUNUCU;
// Başarısız gövde çevrimiçine dönüşte yeniden denenmek üzere saklanır mı (R41)? Çakışmayı birleştirme, oturumu giriş ekranı
// çözer; yetki hatası aynı gövdeyle yine reddedilir.
export const govdeSaklanirMi = (sebep) => !(sebep === SEBEP.CAKISMA || sebep === SEBEP.OTURUM || sebep === SEBEP.YETKI);

// R7, AC-8: 20 sn'lik tekrar bastırma NEDEN BAŞINA. sonUyarilar: { sebep → zaman }.
export const UYARI_ARALIGI_MS = 20000;
export const uyariGosterilsinMi = (sonUyarilar, anahtar, simdi) => {
  const son = sonUyarilar?.[anahtar];
  return son == null || simdi - son > UYARI_ARALIGI_MS;
};

// R8, R11, R13 (Ö-7, Ö-8), AC-10–AC-16, AC-54, AC-55: "şimdi veri yenilenebilir mi". Kayıt bekliyor (debounce kurulu),
// yolda (zincirde kayıt var), bitişinden 500 ms geçmedi ya da açılış bastırması sürüyorsa HAYIR. İki yoklama ve sunucu
// PC'nin itmesi (R9, S7) bunu çağırır; atlanan turda pendingSave ve saveTimer'a dokunulmaz.
export const YENILEME_SONRASI_BEKLEME_MS = 500;
export const veriYenilenebilirMi = ({ bekleyen = false, yoldaSayisi = 0, sonBitis = 0, bastirma = false, simdi = Date.now() } = {}) =>
  !bastirma && !bekleyen && !(yoldaSayisi > 0) && !(sonBitis && simdi - sonBitis < YENILEME_SONRASI_BEKLEME_MS);

// R19, R22, R23, R25 (S4), AC-25, AC-30, AC-32: perde "yolda" başlangıcından 600 ms sonra görünür, 10 sn'de kaçar; açılışta,
// bastırma penceresinde ve çevrimdışı (salt okunur) modda hiç görünmez; kaçtıktan sonra aynı zincir için ikinci kez açılmaz.
export const PERDE_ESIK_MS = 600;
export const PERDE_KACIS_MS = 10000;
export const perdeGorunurMu = ({ yoldaBaslangic = null, simdi = Date.now(), loaded = true, bastirma = false, cevrimdisi = false, kacildi = false } = {}) =>
  !!loaded && !bastirma && !cevrimdisi && !kacildi && yoldaBaslangic != null
  && simdi - yoldaBaslangic >= PERDE_ESIK_MS && simdi - yoldaBaslangic < PERDE_KACIS_MS;
