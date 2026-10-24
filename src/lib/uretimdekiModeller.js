// Spec 0091: modelin üretimde olup olmadığı işareti. Saklama Analiz süzmesinin (`analizGizliModeller`) desenindedir:
// uygulama ayarlarında kendi anahtarında, ÜRETİLMEYEN model adlarının listesi; adı listede olmayan model üretimdedir (R3, C1).
// Liste ile katalog adı BİREBİR karşılaştırılır (R24/3, C14a): Türkçe küçültme yeniden adlandırma zincirini koparırdı.
// Liste boşalınca anahtar SİLİNMEZ, değeri `undefined` yapılır (R24/4): mergeAppSettings `{ ...yeniden, ...yerel }` ile
// bindirdiği için silinmiş anahtar sunucudan gelen eski listeyi ezemezdi. JSON gövdesinde anahtar oluşmaz, veritabanı null yazar.
export const URETIM_ALANI = "uretimdeOlmayanModeller";
// R28: panelin ipucusu, işaretin kapsamını söyler. Spec 0093 R8/2: işaret planlanan adetler penceresini de süzer; Parti
// Hesabı'nın tablosu süzülmediği için etkilenmeyenler arasında ayrıca sayılır.
// Spec 0105 R22/2: üçüncü tüketici müşteri formunun model seçicisi; etkilenmeyen seçiciler "stok ve Evrak" diye daraldı.
export const URETIM_ISARETI_IPUCU = "\"Üretimde\" işareti Makina Maliyeti › Model Maliyetleri'ni, Parti Hesabı'nın planlanan adetler penceresini ve müşteri formunun model seçicisini süzer; Parti Hesabı'nın model-adet tablosu, stok ve Evrak model seçicileri, Analiz ve makina kayıtları etkilenmez.";
// Spec 0093 R12: "üretimde değil" ibaresinin tek tanımı (Model Maliyetleri ve planlanan adetler penceresi buradan okur).
export const URETIM_DEGIL_IBARESI = "üretimde değil";

const liste = (ayar) => (Array.isArray(ayar?.[URETIM_ALANI]) ? ayar[URETIM_ALANI] : []);
const yaz = (ayar, yeni) => ({ ...(ayar || {}), [URETIM_ALANI]: yeni.length ? yeni : undefined });

export const uretimdeOlmayanlar = (ayar) => new Set(liste(ayar));
export const uretimdeMi = (ayar, ad) => !liste(ayar).includes(ad);
// R1: kutu işaretlenip kaldırılınca ad listeye girer ya da listeden çıkar.
export const uretimIsaretiDegistir = (ayar, ad) => {
  const l = liste(ayar);
  return yaz(ayar, l.includes(ad) ? l.filter(x => x !== ad) : [...l, ad]);
};
// R4: yeniden adlandırma işareti taşır; listede yoksa ayar aynen döner (gereksiz yazım yok).
export const uretimIsaretiTasi = (ayar, eski, yeni) => {
  const l = liste(ayar);
  return l.includes(eski) ? yaz(ayar, l.map(x => (x === eski ? yeni : x))) : ayar;
};
// R5: çöpe atılan modelin adı listeden düşer; geri alınan model böylece üretimde sayılır (R3, AC-8).
export const uretimIsaretiDusur = (ayar, ad) => {
  const l = liste(ayar);
  return l.includes(ad) ? yaz(ayar, l.filter(x => x !== ad)) : ayar;
};
// Spec 0105 R1–R7, R23, Karar 31, 32: müşteri formunun model ızgarası. Katalog sırasıyla `[{ m, uretimde }]` döner; üretimde
// olmayan model yalnız korunan kümedeyse (düzenlenen kaydın özgün modeli ∪ formun modeli, R3/2) ya da stokta canlı satırı
// varsa (`stoktaMi`, stok sayacının anahtarıyla, R4/2) kalır. Katalogda olmayan ad kurtarılmaz (R3/3). İşaret yoksa hepsi kalır.
export const uretimdeSuzulmusModeller = (ayar, models, { korunan = [], stoktaMi = () => false } = {}) => {
  const disari = uretimdeOlmayanlar(ayar);
  const kor = new Set(korunan.filter(Boolean));
  return (Array.isArray(models) ? models : [])
    .map(m => ({ m, uretimde: !disari.has(m.model) }))
    .filter(({ m, uretimde }) => uretimde || kor.has(m.model) || stoktaMi(m.model));
};
