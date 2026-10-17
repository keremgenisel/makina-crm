// Spec 0091: modelin üretimde olup olmadığı işareti. Saklama Analiz süzmesinin (`analizGizliModeller`) desenindedir:
// uygulama ayarlarında kendi anahtarında, ÜRETİLMEYEN model adlarının listesi; adı listede olmayan model üretimdedir (R3, C1).
// Liste ile katalog adı BİREBİR karşılaştırılır (R24/3, C14a): Türkçe küçültme yeniden adlandırma zincirini koparırdı.
// Liste boşalınca anahtar SİLİNMEZ, değeri `undefined` yapılır (R24/4): mergeAppSettings `{ ...yeniden, ...yerel }` ile
// bindirdiği için silinmiş anahtar sunucudan gelen eski listeyi ezemezdi. JSON gövdesinde anahtar oluşmaz, veritabanı null yazar.
export const URETIM_ALANI = "uretimdeOlmayanModeller";
// R28: panelin ipucusu, işaretin kapsamını söyler.
export const URETIM_ISARETI_IPUCU = "\"Üretimde\" işareti yalnız Makina Maliyeti › Model Maliyetleri'ni süzer; model seçicileri, Analiz, Parti Hesabı ve makina kayıtları etkilenmez.";

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
