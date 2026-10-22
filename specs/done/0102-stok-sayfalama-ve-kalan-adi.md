# 0102 — Makina Stoğu sayfalanmaz, panonun kalan sütunu "Planlanandan kalan" olur

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3; uygulama commit `fe5e8e6`, dal `feat/0102-stok-sayfalama`, 2026-10-22) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Stok › Makina Stoğu (liste), Stok › Parti Üretim Panosu (özet kartları, tablo başlığı, ipucu); `src/lib/stokDurumu.js` (iki yeni ekran metni sabiti: ad ve ipucu cümlesi); `docs/tasarim-sozlugu.md` (Sayfalama bölümünün üçüncü istisna maddesi); `scripts/evidence/0009-sayfa.jsx` (yeni uzun liste ekranı ve fikstürü); `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0102-piksel-raporu.json`, `docs/evidence/0102-kapanis-piksel-raporu.json`; `tests/ui/stok-durumu-0100.test.jsx` (AC-22'nin metni ve AC-46 testinin yeniden yazılması) |
| **Bağımlı spec'ler** | 0100 (durum süzgeci, parti üretim panosu ve sayıları), 0101 (listenin yedinci sütunu), 0062 (sayfalama kuralı ve kancası), 0080 (sayfalamanın kaldırılma emsali ve istisna maddesi), 0016 (liste ve boş durum birliği) |
| **Ters çevrilen kriterler** | spec 0062'nin sözlük kuralı (Makina Stoğu istisna listesine girer), spec 0100 **AC-22** (panonun beşinci sayısının metni) ve spec 0100 **R15/4 + AC-46** (durum süzgeci değişince listenin birinci sayfaya dönmesi; sayfa kalmadığı için testi silinip yeniden yazılır). Ayrıntı "Ters çevrilen kriterler" tablosunda. Görsel kanıtta `stok-0100-pano` bilinçli değişir ve bir yeni ekran eklenir, ayrıntı "Görsel kanıt" bölümünde |

---

## Intent

İki küçük rahatsızlık, ikisi de aynı ekranda. Birincisi: Makina Stoğu listesi onar satırlık sayfalara bölünüyor. Fabrikada stok bir "kayıt arşivi" gibi değil, bir "sayım listesi" gibi okunuyor: üretim sorumlusu partideki makinaları seri seri gözden geçirirken sayfa değiştirmek zorunda kalıyor, tarayıcının kendi arama kutusu yalnız o sayfada arıyor ve listenin tamamını tek bakışta görmek mümkün olmuyor.

İkincisi: Parti Üretim Panosu'nda son sütunun adı yalnızca "Kalan". Panoya bakan kişi bunu "stokta kalan makina" sanabiliyor, oysa o sayı planlanan adetten üretilmiş ve satılmış olanların düşülmesiyle kalan, yani "daha üretilecek" adettir. Ad, sayının ne olduğunu kendisi söylemiyor.

Başarı şu: Makina Stoğu'nda süzgeçten geçen bütün makinalar tek listede, tek kaydırmada görünür; sayfa düğmeleri yok. Panoda son sütunun adı "Planlanandan kalan" olur ve hem özet kartında hem tabloda hem ipucu cümlesinde aynı yazar. Hiçbir sayı değişmez.

---

## Requirements

### Makina Stoğu listesi

- **R1.** Makina Stoğu listesinde sayfalama yoktur: aramadan, model süzgecinden ve üretim durumu süzgecinden geçen
  **bütün** makina satırları tek seferde çizilir. Paylaşılan çubuğun çizdiği öğelerin hiçbiri ekranda bulunmaz:
  "‹ Önceki" ve "Sonraki ›" düğmeleri, numara düğmeleri ve aradaki "…" (ölçüm 12; uygulamada "n kayıttan x-y" diye bir
  ibare bugün de yok, o yüzden yasak öğe listesi çubuğun gerçekten çizdikleridir).
- **R1/2.** Sayfa durumunu temizlemek iki süzgeç işleyicisine dokunur (ölçüm 9): model kartının `onClick`'i ve durum
  süzgecinin `onChange`'i bugün elle `setPage(1)` çağırıyor. O çağrılar kalkar, **işleyicilerin geri kalan işi aynen
  korunur**: model kartı seçimi aç kapa yapmaya (seçili karta ikinci tıklama süzgeci kaldırır) ve durum süzgeci kendi
  değerini yazmaya devam eder. Sözlüğün "efekt ve elle `setPage(1)` yazılmaz" kuralı (`docs/tasarim-sozlugu.md:325`)
  **değişmez**; bu iş onu ihlal eden bugünkü tek yeri kapatır.
- **R2.** Arama kutusu, model süzgeci, üretim durumu süzgeci ve süzgeç rozetlerinin sayıları bugünkü gibi çalışır.
  Rozet sayıları bugün olduğu gibi arama ve model süzgecinden geçmiş kümeden okunur (spec 0100 R15/3) ve zaten
  sayfalanmamış kümeyi sayıyordu, yani hiçbir rozet sayısı değişmez.
- **R3.** Liste kabı bugünkü kabın kendisidir: `MakinaStokTab.jsx:211`'deki `KartBolum varyant="kart"`
  çağrısı, `style={{ padding: 0, overflow: "auto" }}` ile. Kabın bugün **yükseklik sınırı yoktur** (ölçüm 10), yani
  `overflow: auto` yalnız yatayda iş görür ve uzun liste sayfanın kendi kaydırmasıyla okunur. Listeye yükseklik sınırı
  (`maxHeight`), ikinci bir dikey kaydırma çubuğu (`overflowY`) ya da "daha fazla göster" düğmesi eklenmez; bu yasak
  kaynak taramasıyla ölçülür (AC-37).
- **R4.** Boş durumlar değişmez: stok hiç boşsa "Stokta makina yok.", süzgeçten hiçbir satır geçmiyorsa "Aramanıza uyan
  makina yok." (spec 0016 kutusu, kimlik `bos-makina-stok`).
- **R5.** Özet satırı (`stok-ozet`) bugünkü gibi süzgeçsiz bütün canlı stoğu sayar; listenin sayfalanmaması bu sayıları
  etkilemez.
- **R6.** Paylaşılan arama ve süzme kancası **kalır**; kancanın imzası ve davranışı değişmez. Değişen yalnız ekranın
  kancadan hangi kümeyi çizdiğidir: sayfa dilimi yerine süzgeçten geçen tam küme.
- **R7.** Stok'un öteki alt sekmeleri (Parça Stoğu, Yedek Parça Satışı, Üretim Formu) bugünkü sayfalamalarını aynen
  korur.
- **R8.** Sayfalama kuralının yazılı istisnası güncellenir: tasarım sözlüğünün Sayfalama bölümündeki istisna maddesine
  Makina Stoğu, gerekçesiyle ve "yavaşlama görülürse ayrı bir spec'le geri gelir" notuyla eklenir (spec 0080'in
  kalıbı).
- **R9.** Listenin büyük satır sayısında kabul edilemez biçimde yavaşlamadığı **ölçülür** ve ölçüm bir eşikle sabitlenir
  (spec 0080 AC-15 emsali). Eşik cömerttir ve ölçümün amacı bir hız iddiası değil, sayfalamanın kaldırılmasının
  listeyi kullanılamaz hâle getirmediğinin kanıtıdır.
- **R9/2.** Ölçümün biçimi spec 0080'in ölçümüyle aynıdır (ölçüm 17): `MakinaStokTab` doğrudan çizilir, fikstür **üç
  yüz** satır, eşik **10.000 ms** (çizim süresi artı arama sonrası yeniden çizim süresi, toplam), testin zaman aşımı
  **60.000 ms**, ölçülen süreler `console.log` ile yazılır. Arama kutusu **saat başlamadan önce** bulunur
  (`querySelector('input[placeholder="Model veya seri no ara..."]')`; kutu `Input` değil düz `<input>` ve `aria-label`
  taşımıyor, `MakinaStokTab.jsx:200`): sorgu ölçümün içinde kalırsa ölçülen şey uygulama değil test kütüphanesi olur,
  bu ders spec 0080'de bir kez ödendi.

### Parti Üretim Panosu'nun kalan sütunu

- **R10.** Panonun beşinci sayısının adı **"Planlanandan kalan"** olur. Yeni ad üç yerde birden görünür: özet kartının
  etiketi, tablo başlığı ve tablonun altındaki ipucu cümlesi.
- **R11.** Ad **tek bir sabitten** gelir ve kaynakta ikinci bir kopyası bulunmaz. Sabit, panonun öteki ekran metinleriyle
  aynı yerde (`src/lib/stokDurumu.js`) durur; böylece başlık ile ipucu cümlesi birbirinden sapamaz. Adı:
  **`PANO_KALAN_ADI`** (panonun bugünkü `PANO_*` deseni, ölçüm 19).
- **R11/2.** İpucu **cümlesinin tamamı** da aynı dosyada sabittir (**`PANO_KALAN_IPUCU`**) ve adını `PANO_KALAN_ADI`'ndan
  kurar; pano iki sabiti de okur, kendi metnini yazmaz. Gerekçe: panonun bugünkü beş ekran metninin hepsi orada
  (ölçüm 19) ve cümle ekranda kalırsa ad tek olsa bile cümle ikinci bir metin yazım yeri olarak kalır.
- **R12.** İpucu cümlesinin kuralı aynı kalır, **yalnız adı değişir**. Cümle: "Planlanandan kalan = planlanan −
  (montajda + satışa hazır + satıldı). Satılan makina partiye bağlı müşteri kayıtlarından sayılır." Eksi **işareti
  ("−") bugünkü karakteriyle korunur**, "eksi" sözcüğüne çevrilmez (Karar 13); cümlenin ikinci yarısı birebir aynıdır.
  Bu spec'in düzyazısında yer yer "eksi" diye okunan şey ekranda "−" karakteridir.
- **R13.** Hiçbir sayı, sıralama ya da işaret değişmez: motorun alan adı, "plandan fazla üretildi" ibaresi, kırpma
  kuralı (spec 0100 R21) ve model satırlarının sırası aynıdır.
- **R14.** Ekrandaki ölçüm kimlikleri (`pano-sayi-kalan`, `pano-satir`, `pano-toplam`, `pano-fazla`) aynı kalır: bunlar
  veri kimliğidir, ekran metni değil.
- **R15.** Panonun öteki dört sayısının adı değişmez: "Planlanan", "Montajda", "Satışa hazır", "Satıldı".
- **R15/2.** Öteki dört adın **bugünkü yeri de değişmez** (ölçüm 19): "Planlanan" ve "Satıldı" `PartiUretimPanosu.jsx:9`
  içinde satır içi düz metin, "Montajda" ve "Satışa hazır" `stokDurumu.js`'in `DURUM_ADLARI`'ndan. Bu spec yalnız
  değişen adı sabite taşır (Karar 5); dördünü sabite toplamak kapsam dışıdır ve kaynak taraması bunu istemez.

### Değişmeyenler

- **R16.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni, sunucu kuralı değişikliği ve veri taşıma yoktur.
- **R17.** Saf motorlar (`src/lib/stokDurumu.js`'in hesap fonksiyonları, `useFilteredList`'in süzme mantığı)
  davranış olarak değişmez; motor testleri dokunulmadan yeşil kalır.
- **R18.** Anasayfa'nın "Satışa Hazır Makina" kutusu, Makina Maliyeti ekranının Üretim Partileri görünümü ve parti
  seçicilerinin metinleri bu işten etkilenmez. Üçünün de ölçümü vardır (AC-35, AC-44): parti seçeneğinin adı tek
  yardımcıdan gelir (`stokDurumu.js:113` `partiSecenekAdi`) ve bu iş ona dokunmaz.

---

## Constraints

### Uyulması zorunlu

- **C1.** **Paylaşılan kancaya dokunulmaz.** `useFilteredList`'in imzası `tests/hammadde-0096.test.js:240` tarafından
  birebir sabitlenmiştir ve kancayı Makina Stoğu dışında dokuz ekran paylaşır: Müşteriler, Bayiler, Parça Stoğu, Evrak
  ve **beş** katalog/Ayarlar paneli (`KalipManager`, `ModelsManager`, `PartManager`, `settings/SettingsSentMail`,
  `settings/SettingsTrash`). **Notlar kancayı kullanmaz** (kendi elle pager'ı var, ölçüm 3). Sayfalama Makina Stoğu'nda
  ekranın kancadan `paged` yerine `filtered` okumasıyla kalkar; kancaya "sayfasız" kipi, yeni parametre ya da yeni
  dönüş alanı eklenmez (Karar 1).
- **C2.** Kanca Makina Stoğu'nda **kalmak zorundadır**: arama, model süzgeci, spec 0100'ün ikinci süzgeci ve rozet
  sayılarını besleyen `oncesi` kümesi ondan gelir (`MakinaStokTab.jsx:41-45`, `:47`). Süzme mantığı ekrana elle
  taşınmaz.
- **C3.** Sayfalama çubuğu ekrandan **tümüyle** kalkar: bileşenin içe aktarma satırı da, kullanılmayan sayfa
  değişkenleri de bırakılmaz. Spec 0080'in iki dosyada uyguladığı yasak kalıbı burada da geçerlidir (elle yazılmış
  "önceki / sonraki" düğmesi, sayfa dilimi alma yasağı).
- **C4.** Spec 0062'nin sayfalama tablosu (`tests/sayfalama-0062.test.js:66`) beş gider ve kasa dosyasını sayar;
  Makina Stoğu o tabloda değildir ve tablo bu işte **değişmez**. Yazılı emsal spec 0084 C6'nın sözlük maddesidir
  (`docs/tasarim-sozlugu.md:338`): sayfalanmayan listenin kaydı `LISTELER` tablosuna **eklenmez**, çünkü kayıt eklemek
  tersine sayfalama ister. Bu işin yasakları kendi tarama testinde yazılır (spec 0080'in
  `sayfalama-kalkar-0080.test.js` emsali); test dosyasının adı **`tests/sayfalama-stok-0102.test.js`**, ekran testi
  **`tests/ui/sayfalama-stok-0102.test.jsx`** olur.
- **C4/2.** 0080'in tarama kalıbı birebir kopyalanmaz, iki satırı bu işte yanlıştır (ölçüm 13): (a) o test
  `useFilteredList`'i de yasaklıyor, burada kanca **kalmak zorundadır** (AC-14, C2); (b) Türkçe "sayfa" sözcüğü
  taranmaz, çünkü dosyanın `:172`'deki yorumu "Anasayfa kutusuyla tutan rakam budur" diyor ve yanlış alarm verir.
  Yasak listesi kimliklerle yazılır: `Pagination`, `usePagination`, `hooks/usePagination`, `page`, `setPage`,
  `perPage`, `.slice((page`, "‹ Önceki", "Sonraki ›".
- **C5.** Panonun yeni adı **yalnız ekran metnidir.** Motorun `kalan` alanı, `fazla` işareti ve hesap kuralı
  değişmez; spec 0100'ün C1 kuralı (bütün sayılar motordan, ekran saymaz) korunur.
- **C6.** Aynı kavramın tek adı olur: tabloda kısa, kartta uzun ad kullanılmaz (Karar 5). Ad tek sabitten okunur
  (R11, `PANO_KALAN_ADI`) ve ipucu cümlesinin sabiti (R11/2, `PANO_KALAN_IPUCU`) adını o sabitten kurar; ikisi de
  `src/lib/stokDurumu.js`'te durur.
- **C7.** Görsel kanıt kuralı **iki rapor** ister (ölçüm 16, Karar 12). İş sırasında değişen ekranın ve yeni ekranın
  kaydı `docs/evidence/0102-piksel-raporu.json`'a `degisti` artı `onay` ile girer. Spec `done`'a taşınırken ayrıca
  **`docs/evidence/0102-kapanis-piksel-raporu.json`** çekilir (bugünkü kod, onaylanan "sonra" görüntüleri taban) ve
  kayıtlar **o rapora bağlanarak** `ayni`ye çevrilir. Kendi raporunda `ayni`ye çevirmek testi kırar: `tasarim-kaynak`
  `ayni` kaydında o raporda `piksel === 0` ister, oysa kendi raporunda pano bilinçli farkı, yeni ekran da
  `fark: "önce görüntüsü yok"` kaydını (hiç `piksel` anahtarı olmadan) taşır. Emsal: 0099, 0100 ve 0101 birer kapanış
  raporu çekti. `MakinaStokTab.jsx` ve `PartiUretimPanosu.jsx`'in geçmiş raporlardaki kayıtları kendi turlarının
  sonucudur ve çevrilmez.

### KAPSAM DIŞI

- **X1.** Parça Stoğu'nun on beşlik sayfalaması ve Yedek Parça Satışı'nın sayfalaması kalkmaz — *neden:* istek Makina
  Stoğu için geldi; parça tarafında satır sayısı bir mertebe büyük ve on beşlik sayfa sözlükte gerekçesiyle yazılı
  (yoğun tablo).
- **X2.** Müşteriler, Bayiler, Evrak, Notlar ve Ayarlar listelerinin sayfalaması kalkmaz — *neden:* her listenin
  okunma biçimi farklı ve tek tek ölçülmeden topluca kaldırmak kuralı kuralsızlığa çevirir. Dokuzu kancayı paylaşıyor
  (C1), Notlar ise kendi elle pager'ıyla sayfalıyor (ölçüm 3); ikisi de bu işin kapsamı dışında.
- **X3.** Yapışkan (kaydırmada sabit kalan) tablo başlığı eklenmez — *neden:* spec 0080 de aynı noktada durdu (X6);
  uzun listede başlığın takılı kalması ayrı bir tasarım kuralıdır ve bütün listeleri birlikte ilgilendirir.
- **X4.** Listeye yeni sıralama, sütun gizleme ya da gruplama eklenmez — *neden:* istek sayfalamanın kalkması;
  sıralama ihtiyacı doğarsa kendi ölçümüyle ayrı iş.
- **X5.** Panonun öteki sütun adları ve ipucu cümlesinin ikinci yarısı değişmez — *neden:* istek yalnız "Kalan"
  sütununun adı; öteki adlar bugün yanlış anlaşılmıyor.
- **X6.** Motorun `kalan` alan adı ve ölçüm kimlikleri değişmez — *neden:* veri adı ile ekran adı ayrı kavramlar;
  alan adını değiştirmek dört dosyada ve iki testte dokunuş ister, karşılığında hiçbir kullanıcı sorusu çözülmez.
- **X7.** Panoya para, tarih ya da yeni sütun eklenmez — *neden:* spec 0100 R23 panonun para göstermeyeceğini
  karara bağladı.
- **X8.** Makina Stoğu'nun dışa aktarması ve yazdırması değişmez — *neden:* ikisi zaten sayfalamayı görmüyor
  (spec 0062 R33).
- **X9.** Liste **sanallaştırılmaz** (pencereleme; `react-window` ve benzeri bir bağımlılık eklenmez) ve satır sayısına
  üst sınır konmaz — *neden:* satır çizimi ucuz (satır başına motor çağrısı yok, ölçüm 21) ve ölçüm eşiğin çok altında
  kalıyor; yavaşlama görülürse çözüm yeni bir bağımlılık değil, sözlüğe yazılan geri dönüş notudur (R8). Bu soru açık
  bırakılırsa en olası cevap, proje bugüne kadar hiç almadığı bir bağımlılık olur.
- **X10.** Listeye sıralama eklenmez (X4'ün gerekçesine ek ölçüm): liste bugün de sıralanmıyor, kanca çağrısı `sortFn`
  vermiyor (ölçüm 11) ve satırlar `stock` dizisinin kendi sırasında çiziliyor — *neden:* sayfalamanın kalkması sırayı
  değiştirmez; Intent'in "seri seri gözden geçirme" cümlesi tek listede okunabilmeyi anlatır, yeni bir sıralama
  kuralını değil.

---

## Context

**Ölçüm 1, bugünkü liste.** `src/components/stock/MakinaStokTab.jsx:41` listeyi paylaşılan kanca ile kuruyor:

```
const { search, setSearch, page, setPage, filtered, paged, perPage: PER_PAGE, oncesi } = useFilteredList(stock, {
  searchFields: ["model", "serialNo", "note"],
  filterFn: s => !modelFilter || s.model === modelFilter,
  ikinciFiltre: s => durumSuzgeciUyar(ozet.satirlar.get(s.id), durumSuzgec),
});
```

Sayfa boyutu kancanın varsayılanı olan **on**dur (`src/hooks/useFilteredList.js:11`), ekran kendi boyutunu yazmıyor
(Parça Stoğu yazıyor: `PartStokTab.jsx:11`, on beş). Dilim kancanın içinde alınıyor (`useFilteredList.js:27`,
`filtered.slice((page - 1) * perPage, page * perPage)`). Ekran `paged`'i çiziyor (`:222`), çubuğu tablonun hemen
altında çiziyor (`:247`) ve bileşeni `:7`'de içe aktarıyor. Boş durum dalı `:206`, liste kabı `:211`
(kenarlıklı kart, `padding: 0, overflow: auto`).

**Ölçüm 2.** Kancanın öteki dönüşleri bu ekranda **yük taşıyor**: `oncesi` (ikinci süzgeçten önceki küme) `:47`'de süzgeç
rozetlerinin sayılarını üreten ikinci bir özete giriyor, `filtered` boş durum dalında ve çubuğun toplamında
kullanılıyor. Yani kaldırılacak olan yalnız `page`, `setPage`, `paged` ve `PER_PAGE`.

**Ölçüm 3, kanca başka yerlerde.** `useFilteredList`'i **on** dosya paylaşıyor: Müşteriler, Bayiler, iki stok sekmesi
(Makina Stoğu ve Parça Stoğu), Evrak ve **beş** katalog/Ayarlar paneli (`KalipManager`, `ModelsManager`, `PartManager`,
`settings/SettingsSentMail`, `settings/SettingsTrash`). **Notlar bu listede yok:** kendi elle pager'ını kullanıyor
(farklı sayfa boyutu, paylaşılan `Pagination` yok; CLAUDE.md'de yazılı). Yani Makina Stoğu dışında etkilenebilecek
ekran sayısı dokuzdur (C1). İmzası bir testle birebir sabitlenmiş:

```
tests/hammadde-0096.test.js:240
expect(kod("src/hooks/useFilteredList.js")).toMatch(/export const useFilteredList = \(data, \{ searchFields, searchFn, filterFn, ikinciFiltre, sortFn, perPage = 10 \} = \{\}\) =>/);
```

Bu yüzden kancaya kip eklemek, en ucuz görünen yol olmasına karşın en pahalısıdır (Karar 1).

**Ölçüm 4, sayfalama kuralı iki yerde yazılı ve sözlükte bugün iki istisna var.** Birincisi tasarım sözlüğü:
`docs/tasarim-sozlugu.md:316` "Sayfalama (spec 0062)" bölümü, kural `:318`'de ("tanım gereği büyüyen her liste
paylaşılan `Pagination` ve kancalarla sayfalanır; elle pager yazılmaz"). İstisna maddesi **tek değil iki**:
`:334` spec 0080 (Gider Kalemleri ve Tedarikler ve Ekstre, "yavaşlama görülürse yalnız Tarih Aralığı kipine geri
gelir") ve `:338` **spec 0084 C6** (kira stopajı beyan dönemleri penceresinin iki listesi, ayrıca "`LISTELER`
tablosuna kayıt eklenmez" cümlesiyle; C4'ün yazılı emsali). R8'in yazacağı madde **üçüncüdür** ve 0084 maddesinin
ardına gelir. Aynı bölümün "Kanca" maddesi (`:325`) "efekt ve elle `setPage(1)` yazılmaz" diyor; bu işin kapattığı
ihlal odur (ölçüm 9). İkincisi test: `tests/sayfalama-0062.test.js:66` beş dosyayı ve on çağrıyı sayıyor
(4 + 2 + 1 + 1 + 2), Makina Stoğu o listede **yok** (tablo yalnız `usePagination` kullanan gider, kasa ve çek
dosyalarını kapsıyor), yani o tarama bu işten etkilenmiyor. Spec 0080'in kendi taraması
(`tests/sayfalama-kalkar-0080.test.js:11`) iki dosyada beş yasağı birlikte ölçüyor ve bu işin tarama kalıbıdır
(iki satırı hariç, C4/2).

**Ölçüm 5, bugünkü pano.** `src/components/stock/PartiUretimPanosu.jsx:9` tek dizi hem özet kartlarını hem tablo başlıklarını
besliyor:

```
const SUTUNLAR = [
  ["planlanan", "Planlanan"], ["montajda", DURUM_ADLARI.montaj], ["hazir", DURUM_ADLARI.hazir], ["satildi", "Satıldı"], ["kalan", "Kalan"],
];
```

Dizi üç yerde dolaşılıyor: `:35` özet kartı (`StatCard label={ad}`), `:44` tablo başlığı, `:51` ve `:58` hücreler.
İpucu `:63`: "Kalan = planlanan − (montajda + satışa hazır + satıldı). Satılan makina partiye bağlı müşteri
kayıtlarından sayılır." Panonun öteki ekran metinleri `src/lib/stokDurumu.js`'te sabit:
`DURUM_ADLARI` (`:9`), `ONCEKI_PARTI_ADI` (`:10`), `PANO_SEKME_ADI` (`:111`), `PANO_BOS_PARTI` (`:114`),
`PANO_BOS_VERI` (`:115`), `FAZLA_IBARESI` (`:116`). "Planlanan" ve "Satıldı" bugün satır içinde yazılı; bu spec
yalnız değişen adı sabite taşır (Karar 5), ötekileri yerinde bırakır.

**Ölçüm 6.** Hesap motorda: `stokDurumu.js:127` `partiUretimOzeti`, kırpma `:154` (`r.kalan = Math.max(0, fark)`), toplam `:151`
ve `:156`. Bu spec motora dokunmaz.

**Ölçüm 7, ölçülen metin bağımlılığı.** Panonun beş sayısını ölçen tek test metni de okuyor:

```
tests/ui/stok-durumu-0100.test.jsx:188
expect(["planlanan", "montajda", "hazir", "satildi", "kalan"].map(sayi)).toEqual(["Planlanan9", "Montajda1", "Satışa hazır2", "Satıldı2", "Kalan4"]);
```

Beşinci değer "Planlanandan kalan4" olacak (kartın etiketi ile sayısı aynı öğenin metni). İpucu cümlesinin testi yok
(`tests/` altında o cümleden tek satır geçmiyor), yani o **yeni** kriterdir. Panonun öteki testleri (`pano-satir`
sırası, `pano-fazla`, boş durumlar) metni okumadığı için dokunulmaz. **Aynı dosyada ikinci bir bağımlılık var ve o
metni değil sayfayı okuyor:** ölçüm 14.

**Ölçüm 8, görsel kanıt tarafı.** Makina Stoğu alt sekmesini çizen altı ekran var ama **yalnız dördü satır çiziyor**:
`stok-makina-parti` (`:878`, `PARTI_STOK` üç satır), `stok-0100-durum-suzgec` (`:881`, `STOK_0100` altı satır `:560`)
ve spec 0101'in iki ekranı `stok-0101-kalip-capi` (`:882`), `stok-0101-form-capli` (`:883`, `STOK_0101` üç satır
`:572`). Öteki ikisi, `stok-alt-sekme` (`:733`) ve `makina-stok-formu` (`:747`), `stokEkrani`'nı çağırıyor ve o
`stock={[]}` veriyor (`:341`): ikisi tabloyu hiç çizmiyor, `bos-makina-stok` kutusunu çiziyor. (Spec 0100'ün
kapanışında da aynı sapma kayıtlı: "`stok-alt-sekme` boş stokla çizildiği için değişmedi, spec 'değişir' diyordu".)
Satır çizen dört fikstürün hepsi **on satırın altında** ve `Pagination` tek sayfada kendini gizliyor
(`ui.jsx`, `if (pages <= 1) return null;`). Sonuç: sayfalamanın kalkması bugünkü ekranlarda **0 piksel** fark
verir, yani kanıt turu bu işin yarısını hiç görmez. Bu yüzden sayfa boyutunun üstünde satır taşıyan yeni bir ekran
gerekir (Karar 9, satır sayısı Karar 14). Pano ekranları `stok-0100-pano` (`:884`) ve `stok-0100-pano-bos` (`:885`);
birincisi bilinçli değişir, ikincisi boş durum olduğu için 0 piksel.

### QA turu ölçümleri (2026-10-22)

**Ölçüm 9, sayfa sıfırlaması iki işleyicinin içinde.** `MakinaStokTab.jsx:160` model kartının `onClick`'i
(`setModelFilter(active ? null : m); setPage(1);`) ve `:182` durum süzgecinin `onChange`'i
(`setDurumSuzgec(v); setPage(1);`) elle sıfırlıyor. AC-12 `setPage` adını yasakladığı için iki işleyici de
düzenlenecek; kör bir satır silme model kartının aç kapa davranışını da götürür, onu ölçen bir test yok (R1/2, AC-38).
Sözlük bu elle çağrıyı zaten yasaklıyor (`docs/tasarim-sozlugu.md:325`): `useFilteredList`'in sıfırlama anahtarı
olmadığı için bugün başka yolu yoktu, bu işten sonra ihlal kalmıyor.

**Ölçüm 10, liste kabının yükseklik sınırı yok.** `MakinaStokTab.jsx:211` `KartBolum varyant="kart"` çağrısı
`style={{ padding: 0, overflow: "auto" }}` veriyor; `tasarim.jsx`'in `kart` varyantı (`kartKabi` artı gelen `style`)
`maxHeight` taşımıyor. Yani kap dikeyde kaymıyor, uzun liste **sayfanın** kaydırmasıyla okunuyor ve `overflow: auto`
yalnız yatayda (yedi sütun dar pencerede) iş görüyor. Yükseklik sınırı artı iç kaydırma eklemek bugünkü bütün
kriterleri geçer ama Intent'in "tek kaydırmada görünür" sözünü bozar (R3, AC-37). Kabul edilen yan etki: kabın yatay
kaydırma çubuğu kabın altındadır, üç yüz satırlık listede ekranın dışında kalır (spec 0080 X7 ile aynı bilinen sınır;
yapışkan başlık ve çubuk ayrı iştir, X3).

**Ölçüm 11, liste sıralanmıyor.** Kanca çağrısı `sortFn` vermiyor (`:41-45`), yani satırlar `stock` dizisinin kendi
sırasında çiziliyor; bugün birinci sayfa da aynı sırayla ilk on satırdır. Sayfalamanın kalkması sırayı değiştirmez
(X4, X10).

**Ölçüm 12, çubuğun çizdikleri.** `ui.jsx` `Pagination` yalnız şunları çiziyor: `className="page-btn"` ile
"‹ Önceki", `className="page-num"` (aktifte `page-num--active`) ile numara düğmeleri, araya `…` ve yine `page-btn`
ile "Sonraki ›". "n kayıttan x-y" diye bir ibare **hiç yok**; R1'in yasak listesi bu öğelerdir ve AC-2 metin yerine
sınıfla da ölçülebilir.

**Ölçüm 13, taramanın iki tuzağı.** (a) Dosyanın `:172` yorumu "Anasayfa kutusuyla tutan rakam budur" diyor, yani
Türkçe "sayfa" sözcüğünü aramak yanlış alarm verir; değişiklikten sonra dosyada `page` dizesi hiç kalmaz, bu yüzden
tarama kimliklerle yazılır. (b) Spec 0080'in taraması `useFilteredList`'i de yasaklıyor; burada kanca kalmak zorunda
(C2, AC-14), o satır kopyalanmaz (C4/2).

**Ölçüm 14, sayfalamayı ölçen bir test var.** `tests/ui/stok-durumu-0100.test.jsx:145-152`
("AC-46 (R15/4): durum süzgeci değişince liste birinci sayfaya döner") yirmi beş satırlık stok kuruyor,
`screen.getByRole("button", { name: "3" })`'e tıklıyor, o sayfada beş satır olduğunu doğruluyor ve sonra süzgeci
değiştirip üç satır bekliyor. Sayfalama kalkınca o düğme hiç çizilmez ve `getByRole` **fırlatır**: test atlanmaz,
kırılır. Spec 0100'de bu bir gereklilik (R15/4), bir kriter (AC-46), bir karar kaydı (K-1) ve plan maddesidir (P2);
hepsi ters çevrilir (Karar 11, AC-39).

**Ölçüm 15, kanıt aracının yükseklik kapağı.** `scripts/evidence/0009-ekran.cjs:56` pencereyi sayfanın
`scrollHeight`'ına büyütüyor ama `Math.min(Math.max(900, h), 6000)` ile **6000 piksele kırpıyor**; `:25` iki
görüntünün boyutu farklıysa karşılaştırmayı `piksel: -1` yapıyor. Satır yüksekliği yaklaşık 47 CSS pikseli, pencere
genişliği 1440 (`:11`), yani bir çekime yaklaşık altmış satır sığar. Üç yüz satırlık bir kanıt fikstürü kapağa
takılır ve kanıt "sayfalama kalktı"yı değil kapağı gösterir; bu yüzden kanıt fikstürü on dört satırdır (Karar 14,
AC-43) ve üç yüz satır yalnız hız testinde kalır.

**Ölçüm 16, kanıt kaydı testinin kuralı.** `tests/tasarim-kaynak.test.js:146-162` bir kaydı `ayni` görürse o raporda
`r.piksel === 0` ister, `degisti` görürse yalnız `onay` ister (`tests/kanit-eslemesi.test.js` ayrıca onay biçimini ve
spec `done`'a taşındıysa kaydın çevrilmiş olmasını ister). Yeni bir ekran, işin kendi raporunda `piksel` anahtarı
olmadan `fark: "önce görüntüsü yok"` taşır (ölçülen örnek: `0101-piksel-raporu.json`'da `stok-0101-kalip-capi`), değişen
ekran ise sıfırdan büyük `piksel` taşır. Bu yüzden `ayni`ye çevirme **ikinci bir rapora** bakar: 0099, 0100 ve 0101
birer `*-kapanis-piksel-raporu.json` çekti (0101'inki on satır, hepsi `piksel: 0`) ve değişen ekranların kayıtlarını
ona bağladı. Bugün eşlemede hiç `degisti` kaydı yok; eşlemenin kendi açıklaması da çevrilen kaydın "onaylanan yeni
görünümü taban alan raporu" göstermesini söylüyor (C7, Karar 12, AC-42). Kayıt sayıları: `MakinaStokTab.jsx` yirmi üç,
`PartiUretimPanosu.jsx` dört.

**Ölçüm 17, hız ölçümünün yazılı biçimi.** `tests/ui/sayfalama-kalkar-0080.test.jsx:200-219`: `ESIK_MS = 10000`,
1.200 kalem, çizim ve süzgeç süreleri toplanıp eşikle karşılaştırılıyor, `console.log` ile yazılıyor, testin zaman
aşımı `60000`. Yorumunda ders yazılı: süzgeç öğesi ölçümden önce bulunur, yoksa ölçülen şey uygulama değil test
kütüphanesi olur. Bu işin üç yüz satırı o ölçümün dörtte biri ve satırı daha ucuz (ölçüm 21), yani pay geniştir
(R9/2, AC-19, AC-20).

**Ölçüm 18, "Kalan" başlığı uygulamada üç yerde daha var.** Tek başına "Kalan" etiketi
`gider/AcikKalemler.jsx:120` (tablo başlığı), `cek/CiroPenceresi.jsx:129` (sütun başlığı) ve
`gider/OdemeKayitPenceresi.jsx:117` (satır içi etiket). Bu yüzden "ekranda tek başına geçmez" ölçütü panonun kendi
öğesiyle sınırlanır (AC-24); genel bir tarama üç ilgisiz gider ve kasa ekranında yanlış alarm verir ve o adları
değiştirmek bu spec'in kapsamı değil (X5).

**Ölçüm 19, panonun metinleri ve adın sarması.** Panonun beş ekran metni `stokDurumu.js`'te sabit
(`DURUM_ADLARI` `:9`, `ONCEKI_PARTI_ADI` `:10`, `PANO_SEKME_ADI` `:111`, `PANO_BOS_PARTI` `:114`, `PANO_BOS_VERI`
`:115`, `FAZLA_IBARESI` `:116`), "Planlanan" ve "Satıldı" ise `PartiUretimPanosu.jsx:9` içinde satır içi düz metin.
Yeni ad ve ipucu cümlesi aynı dosyaya `PANO_KALAN_ADI` ve `PANO_KALAN_IPUCU` olarak girer (R11, R11/2), öteki dört ad
bugünkü yerinde kalır (R15/2, AC-26). Sarma ölçüsü: `ui.jsx` `StatCard`'ın etiket kutusu ve panonun `th` stili
`whiteSpace: nowrap` taşımıyor, özet ızgarası da `repeat(5, minmax(0, 1fr))` (`:31`); yani uzun ad kırpılmadan iki
satıra sarar ve ızgara taşmaz (Karar 8).

**Ölçüm 20, "önceki değerle aynı" kriterlerinin bugünkü bekçileri.** Bu spec motora dokunmadığı için bu kriterler
yeni altın dosya istemez, dokunulmamış testlere bağlanır (Karar 21): rozet sayıları
`tests/ui/stok-durumu-0100.test.jsx:132` (AC-8, on üç satır), özet satırı `:115` (AC-10), panonun satır sırası `:190`
(AC-57/AC-24) ve fazla üretim işareti `:195` (AC-23/AC-55), motor çıktısı `tests/stok-durumu-0100.test.js`'in
`partiUretimOzeti` blokları.

**Ölçüm 21, satır çizimi ucuz.** Liste satırı başına motor çağrısı yok: durum rozeti `uretimDurumuOf(s)` ile, "önceki
partiden" işareti `ozet.satirlar.get(s.id)` ile (tek `useMemo`'da kurulan Map), parti adı `partiAdi.get(...)` ile,
çap `fmtKalipCapi(s.kalipCapi)` ile okunuyor. Bu yüzden sanallaştırmaya gerek yok (X9) ve hız ölçümünün eşiği geniş
bırakılabilir.

**Bilinen tuzaklar.** Dört nokta veritabanı kuralı, `MERGE_KEYS`, sunucu bölüm eşlemesi, çöp kutusu simetrisi:
hiçbiri bu işte devreye girmez, çünkü yeni kalıcı alan ve yeni bölüm yok (R16). Tek dikkat noktası C1'dir: paylaşılan
kancaya dokunan bir çözüm, bu spec'in ölçmediği dokuz ekranı etkiler.

---

## Kararlar (Takım Yöneticisi, 2026-10-22)

1. **Sayfalama nasıl kalkar:** kanca kalır, ekran `paged` yerine `filtered` çizer, çubuk ve içe aktarma satırı
   kalkar. Reddedilen seçenek: kancaya "sayfasız" kipi eklemek; imza testini kırar ve dokuz başka ekranı risk
   altına alır (plan turunda "altı" dokuz olarak düzeltildi, C1 ve ölçüm 3 ile aynı; Karar 29).
2. **Kapsam yalnız Makina Stoğu:** Parça Stoğu ve Yedek Parça Satışı sayfalı kalır (X1).
3. **Sözlük istisnası yazılır:** Sayfalama bölümünün istisna maddesine Makina Stoğu, gerekçesi ve "yavaşlarsa ayrı
   spec'le geri gelir" notuyla eklenir (R8). Gerekçe: yoksa bir sonraki liste işinde kural kendisiyle çelişir.
4. **Hız ölçümü yapılır:** jsdom'da eşikli tek bir ölçüm (R9). Reddedilen seçenek: Electron yerleşim turu; tablo
   yedi sütun ve kap zaten kaydırılabilir, spec 0080'in geniş gider tablosundaki yatay kayma riski burada yok.
5. **Sütun adı tek metin, tek sabit:** "Planlanandan kalan" üç yerde aynı yazar ve tek sabitten gelir (R10, R11).
   Reddedilen seçenek: tabloda kısa, kartta uzun ad; aynı kavramın iki adı olur.
6. **Motor dokunulmaz:** alan adı, işaret ve ölçüm kimlikleri aynı kalır (C5, R14, X6).
7. **İpucu cümlesi güncellenir:** yalnız adı değişir, kuralı ve ikinci yarısı korunur (R12).
8. **Başlık genişliği kabul edilir:** "Planlanandan kalan" beş sayı sütununun en uzunudur ve dar pencerede iki
   satıra sarabilir; kısaltma ve kırpma yapılmaz (panoda altı sütun var, kap kaydırılabilir).
9. **Görsel kanıt:** `stok-0100-pano` bilinçli değişir; sayfalamanın kalktığını gösteren, sayfa boyutunun üstünde
   satır taşıyan yeni bir liste ekranı eklenir. Gerekçe: bugünkü fikstürler on satırın altında olduğu için çubuk zaten
   çizilmiyor (ölçüm 8).
10. **Ters çevrilen kriter:** spec 0100 AC-22'nin metni "spec 0102 ile" notuyla güncellenir; motor testleri
   (alan adı `kalan`) dokunulmaz.

### QA turu kararları (2026-10-22)

11. **0100'ün sayfa sıfırlaması da ters çevrilir:** R15/4 ve AC-46 bu spec'le düşer,
   `tests/ui/stok-durumu-0100.test.jsx:145`'teki test **silinir** ve yerine "durum süzgeci değişince eşleşen bütün
   satırlar görünür, sayfa düğmesi yok" kriteri "spec 0102 ile" notuyla yazılır (ölçüm 14, AC-39). Gerekçe: sayfa
   düğmesi kalmadığı için test güncellenemez, yeniden yazılır. *Reddedilen seçenek:* testi olduğu gibi bırakmak; tek
   kaçınılmaz kırılma odur ve yazılı olmazsa regresyon sanılır.
12. **Kanıt kaydı kapanış raporuyla `ayni`ye çevrilir:** iş sırasında `degisti` artı `onay` kendi raporuna yazılır,
   kapanışta `docs/evidence/0102-kapanis-piksel-raporu.json` çekilir ve kayıtlar ona bağlanır (ölçüm 16, C7, AC-42).
   *Reddedilen seçenek:* aynı rapordaki kaydı `ayni`ye çevirmek; `tasarim-kaynak` o raporda 0 piksel ister ve kırılır.
13. **İpucuda eksi işareti korunur:** ekranda "−" karakteri kalır, "eksi" sözcüğüne çevrilmez; yalnız ad değişir
   (R12, AC-23). Gerekçe: R12'nin kuralı "yalnız ad"; işareti sözcüğe çevirmek görsel kanıtta onaylanan cümleyi de
   değiştirir ve istekte olmayan bir metin kararıdır.
14. **Yeni kanıt ekranının fikstürü on dört satırdır:** sayfa boyutu on olduğu için ikinci sayfanın dört satırı ve
   çubuğun yokluğu tek çekimde görünür; aracın 6000 piksel kapağına da takılmaz (ölçüm 15, AC-43). *Reddedilen
   seçenek:* hız testiyle aynı üç yüz satır; kanıt kırpılır ve kapağı gösterir.
15. **Hız ölçümü 0080'in biçimiyle yapılır:** üç yüz satır, 10.000 ms eşik, 60.000 ms zaman aşımı, `console.log`,
   arama kutusu ölçümden önce bulunur (R9/2, ölçüm 17).
16. **Liste kabı taramayla sabitlenir:** `maxHeight`, `overflowY` ve "daha fazla göster" yasağı kriter olur (R3,
   ölçüm 10, AC-37). Gerekçe: yükseklik sınırı eklemek bugünkü bütün kriterleri geçer ama Intent'i bozar.
17. **"Kalan tek başına geçmez" ölçütü panoyla sınırlıdır:** `parti-uretim-panosu` öğesi (ya da yalnız
   `PartiUretimPanosu.jsx`) taranır; gider ve kasa ekranlarının "Kalan" başlıkları dokunulmaz (ölçüm 18, AC-24).
18. **Ad ve ipucu iki sabittir, ikisi de `stokDurumu.js`'te:** `PANO_KALAN_ADI` ve `PANO_KALAN_IPUCU`; cümle adını
   sabitten kurar, pano kendi metnini yazmaz (R11, R11/2, AC-40). *Reddedilen seçenek:* yalnız adı sabite almak;
   cümle ikinci bir metin yazım yeri olarak kalır.
19. **Sanallaştırma ve üst sınır kapsam dışıdır:** yeni bağımlılık eklenmez, satır sayısına sınır konmaz; yavaşlamanın
   cevabı sözlüğün geri dönüş notudur (X9, AC-41).
20. **Sınır değer sayfa boyutundan okunur:** kriterler "on ikiden fazla" demek yerine "sayfa boyutunun üstünde
   (bugün on bir satır ve fazlası)" der; kanıt fikstürü on dört satır kalır (AC-1, AC-5, Karar 14).
21. **"Önceki değerle aynı" kriterleri dokunulmamış testlere bağlanır:** yeni altın dosya üretilmez (ölçüm 20,
   AC-6, AC-7, AC-28, AC-29, AC-32). Gerekçe: bu spec motora dokunmuyor, altın dosya karşılığı olmayan bakım yükü.
22. **Test dosyalarının adı yazılır:** `tests/sayfalama-stok-0102.test.js` (kaynak taramaları) ve
   `tests/ui/sayfalama-stok-0102.test.jsx` (ekran ve ölçüm) (C4).
23. **Öteki dört adın yeri değişmez:** ikisi satır içi, ikisi `DURUM_ADLARI`'ndan kalır (R15/2, ölçüm 19, AC-26).

### Plan turu kararları (2026-10-22)

24. **Yeni kanıt ekranı önce eski koda eklenir:** `stok-0102-uzun-liste` görüntü aracına iş başında eklenip eski kodla
    da çekilir; böylece rapor yan yana "on satır + çubuk ↔ on dört satır, çubuk yok" kanıtını taşır. İki görüntünün
    yüksekliği farklıysa araç `piksel: -1` yazar; kayıt `degisti` + `onay` olduğu için bu kabul edilir (C7'nin
    "önce görüntüsü yok" beklentisinin yerine).
25. **AC-12'nin yasak listesine `paged` ve `PER_PAGE` eklenir** (C3: kullanılmayan sayfa değişkenleri bırakılmaz).
26. **AC-24'ün ölçüsü:** pano öğesinin metninde büyük harfli, kelime sınırlı `\bKalan\b` aranır (yeni ad küçük harfli
    "kalan" taşır) ve `PartiUretimPanosu.jsx` kaynağında `"Kalan"` dizesi taranır.
27. **"Değişmedi" kriterleri** (AC-15, AC-33, AC-34, AC-44) kaynak taraması (dosyalar yeni sabitleri anmaz, kancanın
    imza ve dilim satırı birebir) artı dokunulmamış bekçi testlerle ölçülür; kapanışta `git diff --stat` ayrıca bakılır.
28. **AC-46'nın yerine yazılan test** aynı dosyada, aynı `describe` bloğunda, "spec 0102 ile" notuyla durur.
29. **Karar 1'in "altı başka ekran" ifadesi dokuz olarak düzeltildi** (C1, ölçüm 3).
30. **Kancanın içeride dilim alması kabul edilir:** ekran `paged`'i okumaz ama kanca hesaplamaya devam eder; maliyeti
    ihmal edilebilir ve C1 kancaya dokunmayı yasaklar.
31. **AC-2 iki yoldan ölçülür:** `.page-btn` / `.page-num` sınıfları ve "‹ Önceki", "Sonraki ›", "…" metinleri; arama ve
    süzgeç sonrasında da (AC-3, AC-5).
32. **Hız eşiği spec'teki gibi 10.000 ms kalır;** ölçülen süre testin yorumuna yazılır (0080 deseni).
33. **Yeni adın sarması için yerleşim testi yazılmaz** (Karar 8); pano ekranı görsel kanıtta 1440 px'te çekilir.

---

## Acceptance Criteria

### Makina Stoğu listesi

- **AC-1.** Sayfa boyutunun üstünde makina bulunan stokta (bugünkü boyut on, yani on bir satır ve fazlası; ölçüm
  fikstürü on dört satır) Makina Stoğu listesi bütün satırları çizer: satır sayısı süzgeçten geçen makina sayısına
  eşittir.
- **AC-2.** Aynı ekranda sayfa düğmeleri bulunmaz: "‹ Önceki" ve "Sonraki ›" metinleri, numara düğmeleri ve aradaki
  "…" ekranda yoktur; çubuğun sınıfları da yoktur (`.page-btn`, `.page-num`; ölçüm 12).
- **AC-3.** Arama kutusuna bir seri no yazıldığında yalnız eşleşen satırlar kalır ve listede sayfa düğmesi yine
  görünmez.
- **AC-4.** Model süzgeci seçildiğinde listede yalnız o modelin makinaları kalır; satır sayısı o modelin süzgeçten
  geçen makina sayısına eşittir.
- **AC-5.** Üretim durumu süzgeci (Montajda) seçildiğinde listede yalnız montajdaki makinalar kalır ve bu satırların
  tamamı çizilir (sayfa boyutunun üstündeyse de).
- **AC-6.** Süzgeç rozetlerinin sayıları bu spec'ten önceki değerlerle birebir aynıdır; bekçisi bugünkü dokunulmamış
  test: `tests/ui/stok-durumu-0100.test.jsx:132` (0100 AC-8, on üç satırlık fikstür). Yeni altın dosya üretilmez
  (Karar 21, ölçüm 20).
- **AC-7.** Özet satırı (`stok-ozet`) süzgeç uygulanmış listede de bütün canlı stoğu sayar; sayısı süzgeçten önceki
  değerle aynıdır. Bekçisi `tests/ui/stok-durumu-0100.test.jsx:115` (0100 AC-10), dokunulmaz.
- **AC-8.** Stok hiç boşken `bos-makina-stok` kutusu "Stokta makina yok." yazar ve tablo çizilmez.
- **AC-9.** Stok dolu ama süzgeçten hiçbir satır geçmiyorken aynı kutu "Aramanıza uyan makina yok." yazar ve tablo
  çizilmez.
- **AC-10.** Tablonun sütunları ve sırası değişmez: `["Model", "Durum", "Kalıp Çapı", "Seri Numarası", "Stoğa Giriş",
  "Not", ""]` (spec 0101 R9).
- **AC-11.** Düzenleme ve silme düğmeleri listenin **her** satırında, izinlere bağlı olarak bugünkü gibi çizilir
  (eski ikinci sayfada kalan satırlarda da).
- **AC-12.** `MakinaStokTab.jsx`'te sayfalama bileşeni, sayfa durumu ve sayfa boyutu geçmez: dosyada `Pagination`
  (içe aktarma satırı dahil), `usePagination`, `hooks/usePagination`, `page`, `setPage`, `perPage`, `paged` ve
  `PER_PAGE` **kimlikleri** bulunmaz (son ikisi plan turunda eklendi, Karar 25; tarama kelime sınırıyla ve yorumlar
  atılarak yapılır) (kaynak taraması). Tarama Türkçe "sayfa" sözcüğünü aramaz: dosyanın `:172` yorumu "Anasayfa" diyor
  (ölçüm 13).
- **AC-13.** Aynı dosyada elle yazılmış pager yoktur: sayfa dilimi (`.slice((page`) ve "Sonraki ›" / "‹ Önceki"
  metinleri geçmez (kaynak taraması). Spec 0080'in kalıbındaki `useFilteredList` yasağı buraya kopyalanmaz, çünkü
  AC-14 tersini ister (C4/2).
- **AC-14.** `MakinaStokTab.jsx` paylaşılan süzme kancasını kullanmaya devam eder ve kancadan süzülmüş tam kümeyi
  (`filtered`) çizer (kaynak taraması).
- **AC-15.** `src/hooks/useFilteredList.js` bu işte değişmez: imzası ve dilim satırı birebir aynıdır (kaynak
  taraması; spec 0096 AC-22 ile aynı ifade).
- **AC-16.** Parça Stoğu ve Yedek Parça Satışı sekmelerinde sayfalama çubuğu ve kancası durur: iki dosyada
  `Pagination` çağrısı bugünkü sayıda bulunur (kaynak taraması).
- **AC-17.** Spec 0062'nin sayfalama tablosu (`LISTELER`) bu işte değişmez: beş dosya ve on çağrı beklentisi aynen
  geçer.
- **AC-18.** Tasarım sözlüğünün Sayfalama bölümünde Makina Stoğu'nun istisna maddesi bulunur ve madde hem gerekçeyi
  hem "yavaşlama görülürse ayrı spec'le geri gelir" cümlesini taşır.
- **AC-19.** Üç yüz satırlık stokta liste tek seferde çizilir (üç yüz gövde satırı) ve çizim süresi ile AC-20'nin
  yeniden çizim süresinin **toplamı 10.000 ms'nin altında** kalır; ölçüm `MakinaStokTab`'ı doğrudan çizer, süreleri
  `console.log` ile yazar ve testin zaman aşımı 60.000 ms'dir (R9/2, ölçüm 17; spec 0080 AC-15 emsali).
- **AC-20.** Aynı üç yüz satırlık listede arama yazıldıktan sonra yeniden çizim aynı eşiğin içindedir ve arama kutusu
  **saat başlamadan önce** bulunur (`input[placeholder="Model veya seri no ara..."]`); aksi hâlde ölçülen şey
  uygulama değil test kütüphanesi olur.

### Parti Üretim Panosu

- **AC-21.** Panonun beşinci özet kartının etiketi "Planlanandan kalan"dır ve sayısı bu spec'ten önceki değerle
  aynıdır.
- **AC-22.** Tablonun beşinci sayı başlığı "Planlanandan kalan"dır.
- **AC-23.** Tablonun altındaki ipucu cümlesi birebir şudur: "Planlanandan kalan = planlanan − (montajda + satışa
  hazır + satıldı). Satılan makina partiye bağlı müşteri kayıtlarından sayılır." Eksi işareti bugünkü "−"
  karakteridir (Karar 13) ve cümlenin ikinci yarısı korunur.
- **AC-24.** **Panoda** (`parti-uretim-panosu` öğesinin metninde) "Kalan" adı tek başına, yeni adın parçası olmayan
  bir başlık ya da etiket olarak geçmez. Ölçüt bu öğeyle (ya da kaynak taramasında yalnız `PartiUretimPanosu.jsx`
  ile) sınırlıdır: gider ve kasa ekranlarının "Kalan" başlıkları kapsam dışıdır (ölçüm 18, X5).
- **AC-25.** Yeni ad kaynakta tek yerde tanımlıdır: `PartiUretimPanosu.jsx` adı ve ipucu cümlesini sabitten okur,
  kendi içinde yazmaz (kaynak taraması).
- **AC-26.** Panonun öteki dört adı aynıdır: "Planlanan", "Montajda", "Satışa hazır", "Satıldı"; **bugünkü yerlerinde**
  kalırlar (ikisi `PartiUretimPanosu.jsx:9` içinde satır içi, ikisi `DURUM_ADLARI`'ndan; ölçüm 19, R15/2). Tarama
  dördünü sabite taşımayı istemez.
- **AC-27.** Plandan fazla üretilmiş model satırında sayı sıfırdır ve "plandan fazla üretildi" ibaresi bugünkü gibi
  çizilir.
- **AC-28.** Toplam satırının beşinci değeri ve fazla üretim işareti bu spec'ten önceki değerlerle aynıdır; bekçisi
  `tests/ui/stok-durumu-0100.test.jsx:195` (0100 AC-23/AC-55), dokunulmaz.
- **AC-29.** Model satırlarının sırası ve sayıları değişmez; bekçisi `tests/ui/stok-durumu-0100.test.jsx:190`
  (0100 AC-57/AC-24), dokunulmaz.
- **AC-30.** Ölçüm kimlikleri aynı kalır: `pano-sayi-kalan`, `pano-satir`, `pano-toplam`, `pano-fazla` ekranda
  bugünkü yerlerinde bulunur.
- **AC-31.** Panonun boş durumları değişmez: üretim partisi hiç yokken "Henüz üretim partisi yok.", partide plan ve
  makina yokken "Bu partide plan ve makina yok." yazar.
- **AC-32.** Motor çıktısı değişmez: `partiUretimOzeti` aynı veriyle bu spec'ten önceki nesneyi birebir döndürür
  (alan adları dahil); bekçisi `tests/stok-durumu-0100.test.js`'in motor blokları, dokunulmadan yeşil kalır
  (Karar 21).

### Değişmeyenler

- **AC-33.** Veritabanı şeması, blob bölümleri, birleştirme kuralları ve sunucu yetki eşlemesi değişmez
  (`db.cjs`, `serverAuth.cjs`, `merge.js` kaynak taraması).
- **AC-34.** Yeni eylem izni eklenmez: her iki değişiklik de salt görünümdür ve izin tanımları dosyası değişmez
  (kaynak taraması).
- **AC-35.** Anasayfa'nın "Satışa Hazır Makina" kutusunun metni ve sayıları değişmez.
- **AC-36.** Stok dışa aktarmasının başlıkları ve satırları değişmez.

### QA turu kriterleri (2026-10-22)

- **AC-37.** Liste kabı bugünkü çağrının kendisidir: `MakinaStokTab.jsx` `KartBolum varyant="kart"` çağrısı
  `style={{ padding: 0, overflow: "auto" }}` ile durur ve dosyada `maxHeight`, `overflowY` ve "daha fazla göster"
  geçmez (kaynak taraması; R3, ölçüm 10).
- **AC-38.** İki süzgeç işleyicisinin geri kalan işi korunur: seçili model kartına ikinci tıklama süzgeci kaldırır
  (aç kapa) ve durum süzgeci değerini yazmaya devam eder (R1/2, ölçüm 9).
- **AC-39.** Spec 0100'ün AC-46 testi (`tests/ui/stok-durumu-0100.test.jsx:145`) silinip yerine "durum süzgeci
  değişince eşleşen bütün satırlar görünür, sayfa düğmesi yok" kriteri "spec 0102 ile" notuyla yazılmıştır; 0100'ün
  R15/4'ü ve AC-46'sı ters çevrilenler tablosunda (ölçüm 14, Karar 11).
- **AC-40.** Yeni ad ve ipucu cümlesi `src/lib/stokDurumu.js`'te iki sabittir (`PANO_KALAN_ADI`, `PANO_KALAN_IPUCU`),
  cümle adını sabitten kurar ve pano ikisini de okur (R11, R11/2, Karar 18).
- **AC-41.** Liste sanallaştırılmaz: `package.json`'a yeni bir pencereleme bağımlılığı girmez ve
  `MakinaStokTab.jsx`'te pencereleme bileşeni kullanılmaz (X9, ölçüm 21).
- **AC-42.** Kanıt kayıtları kuralıyla yazılır: iş sırasında değişen pano ekranının ve yeni liste ekranının kaydı
  `0102-piksel-raporu.json`'a `degisti` artı onay biçimli `onay` ile girer; spec `done`'a taşınırken
  `0102-kapanis-piksel-raporu.json` çekilir ve kayıtlar o rapora bağlanarak `ayni`ye çevrilir, o raporda iki ekran da
  0 piksel ve çizim hatasızdır (C7, ölçüm 16).
- **AC-43.** Yeni kanıt ekranının fikstürü on dört makina satırı taşır (kaynak taraması; sayfa boyutunun üstünde ve
  aracın yükseklik kapağının altında, ölçüm 15, Karar 14).
- **AC-44.** Parti seçeneğinin metni ve Makina Maliyeti'nin Üretim Partileri görünümü bu işten etkilenmez:
  `stokDurumu.js`'in `partiSecenekAdi` yardımcısı ve `gider/UretimPartileri.jsx` değişmez (kaynak taraması; R18).

---

## Görsel kanıt

Bilinçli değişen ekran **bir**dir:

| Ekran | Satır | Neden değişir |
|---|---|---|
| `stok-0100-pano` | `0009-sayfa.jsx:884` | özet kartının etiketi ve tablo başlığı yeni ad; ipucu cümlesi |

Değişmemesi beklenenler (0 piksel): Makina Stoğu alt sekmesini çizen altı ekran, `stok-makina-parti`,
`stok-0100-durum-suzgec`, `stok-0101-kalip-capi`, `stok-0101-form-capli` (satır çizen dördü; fikstürlerin hepsi on
satırın altında ve sayfalama çubuğu bugün de çizilmiyor, çünkü `Pagination` tek sayfada kendini gizler) ile
`stok-alt-sekme` ve `makina-stok-formu` (bu ikisi `stokEkrani`'nı çağırıyor ve o boş stok veriyor, yani tabloyu hiç
çizmiyorlar, ölçüm 8); ayrıca `stok-bos`, `stok-0100-pano-bos` ve bütün müşteri, gider, kasa ekranları.

**Yeni ekran (Karar 9, Karar 14):** `stok-0102-uzun-liste`, **on dört** makina satırı taşıyan Makina Stoğu listesi.
Sayfalamanın kalktığının görünür kanıtı yalnız buradadır: bugünkü kodda on satır artı çubuk, yeni kodda on dört satır
ve çubuk yok. Fikstür bu iş için eklenir (`scripts/evidence/0009-sayfa.jsx`) ve satır sayısı kaynak taramasıyla
sabitlenir (AC-43). Üç yüz satır bu ekrana konmaz: araç çekimi 6000 piksele kırpar ve kanıt kapağı gösterir
(ölçüm 15).

Kayıt kuralı (C7, Karar 12, AC-42): iş sırasında değişen pano ekranının ve yeni ekranın kaydı bu işin kendi raporuna
(`docs/evidence/0102-piksel-raporu.json`) `degisti` artı `onay` ile yazılır. Spec `done`'a taşınırken
`docs/evidence/0102-kapanis-piksel-raporu.json` çekilir (bugünkü kod, onaylanan "sonra" görüntüleri taban) ve kayıtlar
**o rapora** bağlanarak `ayni`ye çevrilir; kendi raporunda `ayni`ye çevirmek testi kırar, çünkü orada pano bilinçli
farkı, yeni ekran da `piksel` anahtarı olmayan `fark: "önce görüntüsü yok"` kaydını taşır (ölçüm 16; emsal 0099, 0100
ve 0101'in kapanış raporları). `MakinaStokTab.jsx`'in geçmiş raporlardaki yirmi üç kaydı ve
`PartiUretimPanosu.jsx`'in dört kaydı kendi turlarının sonucudur, `ayni` olarak kalır.

---

## Ters çevrilen kriterler

| Spec | Kriter | Bugünkü hâli | Bu spec'ten sonra | Not |
|---|---|---|---|---|
| 0100 | **AC-22** panonun beş sayısı (`tests/ui/stok-durumu-0100.test.jsx:188`) | Beşinci değer `"Kalan4"` | Beşinci değer `"Planlanandan kalan4"`; sayı ve öteki dört metin aynı | Test "spec 0102 ile" notuyla güncellenir (R10, Karar 10, AC-21) |
| 0100 | **R15/4 + AC-46** durum süzgeci değişince liste birinci sayfaya döner (`tests/ui/stok-durumu-0100.test.jsx:145-152`) | Test yirmi beş satırlık stokta "3" düğmesine tıklıyor, o sayfada beş satır bekliyor, sonra süzgeçle üç satıra iniyor | Sayfa düğmesi kalmadığı için gereklilik ve kriter düşer; test silinip "süzgeç değişince eşleşen bütün satırlar görünür, sayfa düğmesi yok" diye yeniden yazılır | Ölçüm 14, Karar 11, AC-39; 0100'ün K-1 karar kaydı ve P2 plan maddesi de tarihsel kalır. `getByRole("button", { name: "3" })` fırlattığı için test atlanmaz, kırılır |
| 0062 | Sözlük kuralı: büyüyen her liste sayfalanır (`docs/tasarim-sozlugu.md:316`, kural `:318`) | **İki** istisna maddesi var: spec 0080'in iki gider listesi (`:334`) ve spec 0084 C6'nın stopaj dönemleri penceresi (`:338`) | Üçüncü madde olarak Makina Stoğu eklenir, gerekçesi ve geri dönüş notuyla (0084 maddesinin ardına) | Kuralın kendisi, "elle `setPage(1)` yazılmaz" maddesi ve `LISTELER` tablosu (AC-17) değişmez; ölçüm 4 |

Başka hiçbir kriter ters çevrilmez. Spec 0100'ün R15/3 ve AC-8'i ("rozet sayıları sayfalanmamış listenin tamamını
sayar") bu işle **doğrulanır**, çevrilmez: liste artık gerçekten sayfalanmıyor, kural aynı kalıyor. Ölçülenler:
panonun ipucu cümlesini sınayan bir test yok (ölçüm 7), bu yüzden AC-23 **yeni** kriterdir; Makina Stoğu'nun
sayfalama davranışını sınayan tek test ise 0100'ün AC-46'sıdır ve yukarıda ters çevriliyor (ölçüm 14). Listenin
sayfasız çizimini ölçen kriterler (AC-1, AC-2) de yenidir.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Hesap içeren iş yok: bu spec motora dokunmuyor (R17), bu açıkça yazıldı ve motor testleri dokunulmadan yeşil.
- [x] Aynı sayıyı üreten başka ekran yok; panonun sayıları tek motordan geliyor (C5).
- [x] Yeni kalıcı alan yok; dört nokta kuralı devreye girmiyor ve bu açıkça yazıldı (R16).
- [x] Yeni veri bölümü yok; `BLOB_SECTIONS` zinciri değişmedi (AC-33).
- [x] **Yeni eylem izni eklenmedi**: iki değişiklik de salt görünüm (AC-34).
- [x] Soft-delete edilen kayıt yok; çöp kutusu simetrisi etkilenmiyor.
- [x] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı yok, çeviri anahtarı gerekmiyor.
- [x] Para gösterimi yok (pano para göstermez, spec 0100 R23).
- [x] Arayüz kriterlerinin görsel kanıtı eklendi: değişen pano ekranı, yeni uzun liste ekranı (on dört satır) ve boş
      durumlar.
- [x] Kanıt kayıtları kapanış raporuyla `ayni`ye çevrildi; kendi raporunda `degisti` kaydı bırakılmadı (C7, AC-42).
- [x] Tasarım sözlüğünün Sayfalama istisnası **üçüncü madde** olarak yazıldı; kuralın kendisi, "elle `setPage(1)`
      yazılmaz" maddesi ve 0084'ün istisnası dokunulmadı (AC-18, ölçüm 4).
- [x] Spec 0100'ün R15/4 ve AC-46'sı ters çevrildi: testi silinip yeniden yazıldı ve "spec 0102 ile" notunu taşıyor
      (AC-39).
- [x] Liste kabına yükseklik sınırı, ikinci kaydırma çubuğu ya da "daha fazla göster" eklenmedi (AC-37); liste
      sanallaştırılmadı ve yeni bağımlılık girmedi (AC-41).
- [x] İki süzgeç işleyicisinden yalnız `setPage(1)` çağrıları kalktı; model kartının aç kapası ve durum süzgecinin
      değeri korundu (AC-38).
- [x] Panonun yeni adı ve ipucu cümlesi `stokDurumu.js`'te iki sabit; ekran kendi metnini yazmıyor (AC-40). İpucunda
      eksi işareti "−" olarak korundu (AC-23).
- [x] Hız ölçümü 0080'in biçiminde: üç yüz satır, 10.000 ms eşik, 60.000 ms zaman aşımı, süreler `console.log` ile
      yazıldı, arama kutusu ölçümden önce bulundu (AC-19, AC-20).
- [x] "Önceki değerle aynı" kriterleri dokunulmamış 0100 testlerine bağlandı; yeni altın dosya üretilmedi
      (AC-6, AC-7, AC-28, AC-29, AC-32).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md`'nin 0100 ve 0062 bölümleri güncellendi (Makina Stoğu'nun sayfalanmaması ve panonun yeni sütun adı).
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu 2026-10-22)

| No | Derece | Bulgu | Karar | İşlendiği yer |
|---|---|---|---|---|
| B-1 | Bloklayıcı | Spec 0100'ün R15/4 ve AC-46'sı ters çevriliyor ama tabloda yok; testi "3" düğmesine tıkladığı için kırılır | Ters çevrilenler tablosuna ikinci 0100 satırı; test silinip yeniden yazılır | Başlık, ölçüm 14, Karar 11, AC-39, ters çevrilen kriterler, DoD |
| B-2 | Bloklayıcı | C7 uygulanamaz: kendi raporundaki `degisti` kaydı `ayni`ye çevrilince 0 piksel şartı sağlanmaz (yeni ekranda `piksel` anahtarı hiç yok) | Kapanış raporu çekilir, kayıtlar ona bağlanarak çevrilir (0099/0100/0101 emsali) | C7, ölçüm 16, Karar 12, AC-42, Görsel kanıt, başlık, DoD |
| B-3 | Bloklayıcı | İpucu cümlesinde "−" mı "eksi" mi: R12'nin "yalnız ad değişir" kuralı ile AC-23'ün birebir metni çelişiyor | Ekranda "−" korunur, yalnız ad değişir; AC gerçek karakterle yazılır | R12, Karar 13, AC-23, DoD |
| Ö-1 | Önemli | R3'ün kriteri yok: yükseklik sınırı ve iç kaydırma yasağı ölçülmüyor | Yeni kriter ve kaynak taraması | R3, ölçüm 10, Karar 16, AC-37, DoD |
| Ö-2 | Önemli | Yeni kanıt ekranının satır sayısı yazılmamış; üç yüz satır aracın 6000 piksel kapağına takılır | Fikstür on dört satır, taramayla sabitlenir; üç yüz satır yalnız hız testinde | Ölçüm 15, Karar 14, AC-43, Görsel kanıt |
| Ö-3 | Önemli | AC-19/AC-20 eşiksiz: sayı, zaman aşımı, ölçülen bileşen ve arama kutusunun bulunma sırası tanımsız | 0080'in biçimi birebir yazılır | R9/2, ölçüm 17, Karar 15, AC-19, AC-20, DoD |
| Ö-4 | Önemli | AC-24'ün kapsamı tanımsız; tek başına "Kalan" başlığı üç gider ve kasa ekranında var | Ölçüt pano öğesiyle sınırlanır | Ölçüm 18, Karar 17, AC-24 |
| Ö-5 | Önemli | İpucunun tamamı mı sabit, yalnız ad mı belirsiz; AC-25'in taraması buna bağlı | Ad ve cümle iki sabit, ikisi de `stokDurumu.js`'te | R11, R11/2, C6, Karar 18, AC-25, AC-40 |
| Ö-6 | Önemli | Sanallaştırma ve satır üst sınırı kapsam dışı yazılmamış | Yeni kapsam dışı maddesi ve kriter | X9, ölçüm 21, Karar 19, AC-41 |
| Ö-7 | Önemli | `setPage(1)` iki süzgeç işleyicisinin içinde; kaldırılması ve işleyicilerin korunması yazılı değil | R1/2 yazıldı, kriter eklendi, sözlük kuralı doğrulandı | R1/2, ölçüm 9, AC-38 |
| Ö-8 | Önemli | Kancayı paylaşan dosyaların ölçümü yanlış: Notlar kancayı kullanmıyor, beş panel var | Üç yerde liste düzeltildi, X2'nin gerekçesi ayrıldı | C1, X2, ölçüm 3 |
| Ö-9 | Önemli | Sözlükte "tek istisna" ölçümü yanlış: iki istisna var (0080 ve 0084 C6) | Ölçüm ve tablo düzeltildi; yeni madde üçüncü olarak yazılır | Ölçüm 4, C4, ters çevrilen kriterler, DoD |
| Ö-10 | Önemli | "Boş olmayan stokla çizen altı ekran" ölçümü yanlış: ikisi boş stokla çiziliyor | Ölçüm dörde düzeltildi, sonuç (0 piksel) korundu | Ölçüm 8, Görsel kanıt |
| K-1 | Küçük | Sınır değer on iki değil on bir (sayfa boyutu on) | Kriterler sayfa boyutundan okur | Karar 20, AC-1, AC-5 |
| K-2 | Küçük | R1'in "n kayıttan x-y" ibaresi uygulamada hiç yok | Yasak listesi çubuğun gerçek öğeleri; AC sınıfla da ölçülür | R1, ölçüm 12, AC-2 |
| K-3 | Küçük | Taramanın iki tuzağı: "sayfa" sözcüğü ("Anasayfa" yorumu) ve kopyalanan `useFilteredList` yasağı | Yasak listesi kimliklerle yazıldı, kopyalanmayacak satır not edildi | C4/2, ölçüm 13, AC-12, AC-13 |
| K-4 | Küçük | Sabitin adı yazılmamış | `PANO_KALAN_ADI` (ve `PANO_KALAN_IPUCU`) | R11, R11/2, AC-40 |
| K-5 | Küçük | AC-26 öteki dört adın bugünkü yerini söylemiyor | Bileşim yazıldı (ikisi satır içi, ikisi `DURUM_ADLARI`) | R15/2, ölçüm 19, Karar 23, AC-26 |
| K-6 | Küçük | "Önceki değerle aynı" kriterlerinin ölçüm yolu yok | Dokunulmamış 0100 testlerine bağlandı, altın dosya yok | Ölçüm 20, Karar 21, AC-6, AC-7, AC-28, AC-29, AC-32 |
| K-7 | Küçük | Etkilenen alanlar kanıt aracını ve iki raporu saymıyor | Başlığa eklendi | Başlık |
| K-8 | Küçük | Tarama ve ekran testinin adı yazılmamış | `tests/sayfalama-stok-0102.test.js` ve `tests/ui/sayfalama-stok-0102.test.jsx` | C4, Karar 22 |
| K-9 | Küçük | Liste sıralanmıyor; Intent ile X4 çelişir görünüyor | Ölçüm yazıldı, kapsam dışı maddesi eklendi | Ölçüm 11, X10 |
| K-10 | Küçük | R18'in parti seçicisi yarısının kriteri yok | Kriter eklendi | R18, AC-44 |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | Revizyon 2 QA turu (23 bulgu), revizyon 3 plan onayı (on öneri, Karar 24–33) |
| **Düzeltme turu sayısı** | 1 | Triyaj: 4 düşük bulgu (AC-24 ekran testi eski kodla da geçiyordu; yerine yazılan testin adında AC-39 yoktu; düşen R15/4'ü anan yorum; CLAUDE.md'de "dokuz çağrı" ve iki spec kopyası) |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Biri testin gücüyle ilgili (boş ölçüt), üçü belge ve adlandırma |
| **Regresyon sayısı** | 0 | Tam takım 399 dosya, 5.232 test yeşil (Electron dahil); kanıt turunda 16 görüntü 0 fark, kapanış kanıtı 4 görüntü 0 fark |
| **Kaçan hata** | 0 | |

**Bu spec'ten çıkarılan ders:** Yokluk iddiası (`not.toMatch`) yazıldığı gibi değil, eski kodla koşturularak ölçülür: `\bKalan\b` panonun bitişik metninde (…Satıldı1Kalan5…) kelime sınırı bulamadığı için eski kodla da yeşildi ve yalnız mutasyonla görüldü. Kural: bir "X artık yok" testi yazılınca X'i geri koyup testin kırıldığı gösterilir; ölçüt birleşik `textContent` yerine tek tek öğeler olur.
