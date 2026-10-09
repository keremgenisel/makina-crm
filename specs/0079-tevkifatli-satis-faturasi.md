# 0079 — Tevkifatlı Satış Faturası (gelir tarafı)

| | |
|---|---|
| **Durum** | Onaylandı, uygulamada (plan `specs/0079-uygulama-plani.md`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Makina satışı (müşteri), servis, Extra Kalıp, yedek parça satışı; satış KDV'sinin hesaplandığı her yer (`calcKDV` zinciri), müşteri borcu, tahsilat tutarı, kredi kartı komisyonu yansıtması, Finans, aylık faaliyet raporu, KDV karşılaştırması, servis formu çıktısı, dışa aktarma |
| **Bağımlı spec'ler** | **0075 (gider tarafı tevkifat; oran listesi ve form deseni oradan)** · 0044 (satış tahsilatı tek kaynak) · 0063 (tahsilat giriş noktaları) · 0076 (KDV kartı bilgi satırı emsali) · 0002 (dondurulmuş kart komisyonu anlık görüntüsü) · 0007 (kalıp borç atfı) · 0001 (KDV karşılaştırması tek kaynak) · 0047 ve 0059 (altın çıktılar) · 0071 (karışık sürüm cümlesi) |
| **Revizyon** | **0075'in X1'ini açar** ("satış tarafı kapsam dışı" kararı geri alınır) · 1 · 2026-10-09 QA turu (B-1…B-4, Ö-5…Ö-19, K-20…K-24 işlendi) · **2 · 2026-10-09 plan onayı (Karar 1): oran sondası ikiye ayrıldı, `tahsilKdvOrani` eklendi (R9/2, R13, C1, AC-36)** |

---

## Intent

Spec 0075 tevkifatı yalnız **aldığımız** faturalar için çözdü ve satış tarafını kapsam dışı bıraktı:
fabrikanın bakım onarım hizmeti mevzuat listesinde olsa da (7/10) yalnız **belirlenmiş alıcılara**
uygulanıyor ve müşteri profili özel firmalar olduğu için "pratikte çıkmıyor" denmişti.

**Bu varsayım yanlış çıktı: kullanıcı kendisi de tevkifatlı fatura kesiyor.** Bugün uygulamada bu
satış girilemiyor; girilirse rakamlar yanlış oluyor:

- **Müşteri fazla borçlu görünüyor.** Tevkifatlı faturada müşteri KDV'nin yalnız bir kısmını bize
  öder, kalanını kendisi vergi dairesine beyan eder. Uygulama KDV'nin tamamını müşteriye borç yazıyor.
- **Beyan edeceğimiz KDV fazla görünüyor.** Hesaplanan satış KDV'si olduğundan yüksek, yani Finans'ın
  KDV Karşılaştırması ödenecek KDV'yi **fazla** gösteriyor (gider tarafındaki 0076'nın tam tersi hata).
- **Tahsilat tutarı yanlış.** Kasa'ya girmesi beklenen brüt tutar gerçekte tahsil edilenden büyük.

İstenen: **"Faturalı Yurtiçi" seçilince gelir doğan dört yerde de bir tevkifat onay kutusu çıksın**,
tıpkı yeni gider formundaki gibi: müşteri (makina satışı), yeni servis talebi, Extra Kalıp satışı,
yedek parça satışı.

Başarı şu demek: tevkifatlı satış olduğu gibi giriliyor, müşterinin borcu gerçekte tahsil edeceğimiz
tutar oluyor, beyan edeceğimiz KDV doğru çıkıyor ve alıcının beyan edeceği kısım ayrı bir bilgi
rakamı olarak görünüyor.

---

## Requirements

### A. Onay kutusu ve alanlar

- **R1.** Dört formda **"Bu fatura tevkifatlı"** onay kutusu bulunur: müşteri ekleme ve düzenleme
  (makina satışı), servis talebi, Extra Kalıp satışı, yedek parça satışı. Varsayılan **kapalı**.
- **R2.** Kutu **yalnız fatura tipi "Faturalı Yurtiçi" iken** çizilir. Gerekçe: tevkifat KDV'nin
  bölünmesidir; yurt dışı satışta KDV yok, faturasız satışta fatura yok. Bu, bugünkü `calcKDV`
  kapısının kendisidir. **Kapı dize karşılaştırması DEĞİLDİR:** `isFaturali(x) && isYurtIci(x)`
  çifti kullanılır; `=== "Faturalı Yurtiçi"` kaynak taramasıyla yasaktır. Üç alt kural:
  1. `normalizeSaleType(undefined)` bugün "Faturalı Yurtiçi" döndürür, yani **alanı hiç olmayan
     kayıt faturalı yurtiçi sayılır** ve kutu onda da çizilir; formların `Select`'i de bu
     varsayılanı gösteriyor (üç formda `form.faturaTipi || "Faturalı Yurtiçi"`).
  2. Eski kayıtlar "Faturalı Yurt İçi", "Faturalı İhracat", düz "Faturalı" gibi değerler taşır;
     kapı normalleştirilmiş çiftle sorulduğu için bunlar da doğru sınıflanır.
  3. Dize karşılaştırmasıyla yazılırsa eski kayıtta kutu hiç çıkmaz ama R5'in temizliği her kayıtta
     çalışır, yani kullanıcının işaretlediği tevkifat **sessizce silinir**. Bu, kapının neden
     yardımcı çiftiyle sorulduğunun tek gerekçesidir.
- **R3.** **Ödeme yöntemi "Kredi Kartı" seçilince fatura tipi kendiliğinden "Faturalı Yurtiçi"ye
  döner** (bugünkü davranış: `ServiceForm`, `PartSaleForm`, `YedekParcaSatisForm`; kartta KDV
  zorunlu olduğu için kasıtlı). Yani tevkifat kutusu bir yöntem değişikliğinin yan etkisiyle
  görünür hâle gelebilir; tersi (karttan çıkınca tipin dönmesi) olmaz. **Davranış korunur**, kutu
  her hâlde kapalı doğar. Bu yan etki burada yazılıdır çünkü yazılı olmazsa testi yazan kişi
  "kutu neden çıktı" sorusuna kaynaktan cevap arar.
- **R4.** Kutu açılınca **tevkifat oranı** seçicisi çıkar; liste **0075'in `TEVKIFAT_ORANLARI`
  sabitidir** (2/10, 3/10, 4/10, 5/10, 7/10, 9/10), ikinci bir liste tanımlanmaz. **Sabit
  `src/lib/constants.js`'e taşınır**, `src/lib/gider.js` oradan yeniden dışa verir (bugünkü
  çağıranlar değişmez). Gerekçe: sabit bugün `gider.js` içinde, `gider.js` ise `utils.js`'i içe
  alıyor; R10'un yardımcısı `utils.js`'te yaşadığı için sabit orada kalsa **döngü** olurdu.
  Ayrıca `aylikRapor.js` ve `SettingsExport.jsx` gizlilik taramasının kapsamındadır ve gider
  motoruna bağlanmamaları gerekir. R10'un yardımcısı sabit listeye ihtiyaç duymaz (yalnız kaydın
  `tevkifatPay`/`tevkifatPayda` alanlarını okur); listeye yalnız dört **form** bakar.
- **R5.** Fatura tipi "Faturalı Yurtiçi"den çıkınca ya da kutu kapanınca üç alan **kayıttan
  silinir** (`delete`; `false`/`null` yazılmaz). Yoksa tip geri çevrilince gizli bir tevkifat
  yeniden devreye girer. İki alt kural:
  1. Silme **her kayıt kolunda** uygulanır. Makina tarafında iki kol var (`Customers.jsx`'in
     ekleme ve düzenleme dalları); servis iki yerde kurulur (R6/3); Extra Kalıp ve yedek parça
     ortak kurucudan geçer.
  2. Yanı başındaki emsal **kopyalanmaz:** bugünkü kod `faturaBedeli`'ni boş dizeye çeker,
     silmez. `tevkifatli: false` göndermek sunucu karşılaştırmasında hayalet fark üretir
     (blob'da alan hiç yokken istemci `false` yazar), bu yüzden burada silme seçilmiştir.
- **R6.** Doğrulama tek saf fonksiyonda (0075'in `tevkifatDogrula`'sının gelir tarafı kardeşi;
  gider tarafı `DAVRANIS` kapısına bağlı olduğu için aynı fonksiyon paylaşılamaz): oran
  seçilmemiş, payı sıfır ya da paydadan büyük kayıt reddedilir ve nedeni yazılır. Dört alt kural:
  1. Doğrulama ve alan yazımı **ortak kayıt kurucularına** konur: yedek parçada `yedekParcaRec`,
     Extra Kalıp'ta `kalipSatisOrtak`, makinada `Customers.jsx`'in iki kolu. Formların kendisi
     bugün doğrulama yapmıyor (`ServiceForm`'un Kaydet'i doğrudan `onSave` çağırıyor).
  2. **Hata gösterimi mevcut desenle:** serviste `showToast(hatalar.join(" · "), "err")`
     (`ServiceForm`'un bugünkü parça hatası emsali), diğer üç formda `HataMetni`.
  3. **Servisin ortak kurucusu yok:** servis kaydı iki yerde kurulur (`CustomerDetailModal`'ın
     `saveService`'i ve `ServisPanosu`'nun `kaydet`'i; biri ötekinin birebir kopyası). Üç alan
     **ikisinde birden** yazılır ve bunu sabitleyen bir kaynak taraması eklenir; yoksa panodan
     girilen tevkifat sessizce kaybolur.
  4. Giriş noktası sayısı formdan fazladır (yedek parçanın dördü, Extra Kalıp'ın üçü, servisin
     ikisi, makinanın ikisi); kural kuruculara konduğu için hepsi kapsanır. Evrak yolu X2'dedir.
- **R7.** **Çok satırlı formlarda ayar bütün satırlara uygulanır** (bir fatura, bir tevkifat): Extra
  Kalıp'ın `kaliplar` satırları ve yedek parçanın `satirlar`/`batchId` grubu. `teslimatFarkli`'nın
  "bütün partiye uygulanır" emsali. Yazım R6/1'deki ortak kurucularda yapılır.

### B. Tek kapı: satış KDV'si

- **R8.** **Bütün satış KDV'si bugün tek fonksiyondan geçiyor: `utils.calcKDV`** (ölçüldü: 106 çağrı
  yeri). Tevkifat indirimi **bu zincirin içine** konur; hiçbir tüketici kendi çıkarmasını yazmaz.
- **R9.** **106 çağrının 33'ü gelir hesabı değildir ve tevkifat uygulanmaz.** Çağrılar üç
  kategoriye bölünür ve tarama (R11) bu bölmeyi kabul eder:
  1. **Gelir, borç, alacak, tahsilat ve KDV toplamı** hesaplayan çağrılar (73 çağrı) R10'un
     yardımcısına geçer.
  2. **Oran sondası** (ölçüldü: 17 çağrı, ikinci argümanı sabit `100`). Revizyon 2 (plan onayı,
     Karar 1): ölçüm 17 çağrının üç iş yaptığını gösterdi ve ikiye ayrılır:
     - **Etiket oranı** (5 çağrı: dört formun ve makina tahsilat formunun `kdvOrani` prop'u):
       ekranda "KDV (%20)" yazan yasal oran. Ham `calcKDV` kalır; tevkifat buraya uygulanırsa
       5/10 satışta oran %10 görünürdü.
     - **Tahsil oranı** (12 çağrı: kart tutarının hesabı `kartYansitmaAyrim` / `makinaKartOdemesi`
       ve makina ödemesinin mal/KDV ayrıştırması `Finance`, `aylikRapor.odemeKdv`, `Dashboard`,
       `deriveCustomerDetail`): yeni saf yardımcı **`tahsilKdvOrani(tip, tarih, kdvRates, kayit)`**
       = oran × (1 − pay/payda). Gerekçe: ham oranla 100.000 matrah, 5/10 tevkifatlı makinada
       müşteri borcu 110.000 iken kartla "mal 100.000" girilen ödeme 120.000 yazılır; borç sıfırda
       kırpılır ve 10.000 fazla tahsil görünmez, raporun tahsilat KDV'si fazla ayrılır.
     Muafiyet taramada **biçimsel** tanımlanır (ikinci argümanı sabit `100` olan çağrı) ve muaf
     çağrının etiket yerlerinde kaldığı ayrıca taranır.
  3. **Kredi kartı komisyonu tabanı** (ölçüldü: ~16 çağrı) R13'e tabidir.
  Bu bölme yazılı olmasa taramanın kanıt değeri kalmazdı: ya hiç yeşile dönmez, ya geliştirici
  gelişigüzel muafiyet yazar.
- **R10.** `calcKDV` **ham (toplam) KDV** anlamını korur ve dokunulmaz; yeni yardımcı
  "bizim beyan edeceğimiz ve tahsil edeceğimiz KDV"yi verir (toplam KDV eksi tevkifat). Üç alt
  kural:
  1. **Adı `satisKdv` OLAMAZ.** `aylikRapor.js`'te `satisKdv` zaten yerel değişken ve
     **rapor çıktısının alanı** (`rapor.satisKdv`, yazdırma şablonunda basılıyor); o dosyada 18
     çağrı taşınacağı için aynı ad gölgeleme ve karışıklık üretir. Ayrıca `rapor.satisKdv` bugün
     "makina satışlarının KDV'si" demek, yardımcı ise "her satışın bize kalan KDV'si" olurdu.
     Ad **`tahsilEdilecekKdv`** olur (ikinci aday `beyanKdv`).
  2. **İmza `calcKDV`'nin ilk dört parametresini aynı sırada korur**, kaydı **beşinci** parametre
     olarak alır: `tahsilEdilecekKdv(saleType, bedel, tarih, kdvRates, kayit)`. Böylece 73 çağrı
     yeri tek argüman eklenerek mekanik taşınır.
  3. Satış tipi **ayrı parametre kalır** çünkü alan adı bölüme göre değişiyor: müşteride
     `faturali`, servis/Extra Kalıp/yedek parçada `faturaTipi`. Kayıt yalnız
     `tevkifatli`/`tevkifatPay`/`tevkifatPayda` için okunur.
- **R11.** **Kaynak taraması.** Gelir hesaplayan dosyalarda doğrudan `calcKDV(` çağrısı kalmaz;
  yalnız R9/2'nin oran sondası biçimi muaftır. Ölçülen dosya listesi ve çağrı sayıları
  (toplam 106):
  `aylikRapor.js` 18, `Finance.jsx` 17, `Dashboard.jsx` 14, `SimpleDealers.jsx` 9,
  **`customers/detail/deriveCustomerDetail.js` 9**, **`customers/CustomerDetailModal.jsx` 5**,
  `settings/SettingsExport.jsx` 4, **`customers/detail/MachineTimeline.jsx` 4**,
  `satisTahsilat.js` 3, dört form 3+3+3+3 = **12**, `yedekParcaSatis.js` 2, `kalipSatisi.js` 2,
  **`printTemplates.js` 2**, **`ServisPanosu.jsx` 2**, `utils.js` 1 (`calcCiro`),
  **`stock/YedekParcaSatisTab.jsx` 1**, `Customers.jsx` 1.
  Kalın yazılanlar bu spec'in ilk hâlinde listede yoktu (23 çağrı). Tarama **gelir rolüne** göre
  tanımlanır, sabit dosya listesine göre değil. Liste eksikse tarama yeşil kalır ama müşteri
  detayının borç toplamı, zaman çizelgesi ve Stok'taki bayi borcu ham KDV'de kalır; o zaman
  "eksiksizliğin tek kanıtı" dediğimiz şey kanıt olmaz.
- **R12.** **`calcCiro`'daki ikinci KDV kaynağı da tevkifata tabidir.** Yansıtılan kredi kartı
  komisyonunun KDV'si `calcKDV` ile değil, satır içinde `komisyon * oran / 100` ile hesaplanıyor
  (`utils.calcCiro`; `Finance.jsx`'in `kartKomisyonKdv`'si aynı şeyi yapıyor), yani **R11'in
  taraması bu satırı göremez**. Aynı faturanın parçası olduğu için aynı oranda tevkifata tabidir
  ve düşülmüş tutarla hesaba girer. Alınmazsa tevkifatlı satışta müşteri borcu komisyon KDV'sinin
  tevkifat payı kadar fazla kalır, yani bu spec'in düzeltmeye çalıştığı hatanın küçük bir kopyası
  yerinde durur. (Reddedilen seçenek: "komisyon KDV'si tevkifatsız"; tek fatura gerçeğine aykırı.)
- **R13.** **Kredi kartı komisyonu tabanı düşülmüş tutardır; dondurulmuş anlık görüntü geriye
  dönük hesaplanmaz.** Tevkifatlı satışta müşteri karttan matrah artı kalan KDV öder, yani
  komisyon tabanı düşer. Ama `kartKomisyonuSnapshot` KDV dâhil taban üzerinden hesaplanıp
  `kartKomisyonu` JSON'una **donuyor** (`kalipSatisi`, `yedekParcaSatis`, `CustomerDetailModal`,
  `ServisPanosu` ve üç formun `KartTaksitAlani` tabanı). İki alt kural:
  1. Yeni kayıtta ve kart bilgisi yeniden girildiğinde taban tevkifat düşülmüş tutardır;
     yansıtmalı kart hesabı `tahsilKdvOrani` ile yapılır (R9/2, revizyon 2).
  2. **Mevcut anlık görüntü yeniden hesaplanmaz.** Bayrağı sonradan açılan kayıtta formda
     "kart komisyonu eski tabanla hesaplanmış, gerekiyorsa kart bilgilerini yeniden girin"
     uyarısı çıkar (tek sabit). Gerekçe: anlık görüntüyü geçmişe dönük değiştirmek 0002'nin
     dondurulmuş snapshot desenini bozar ve müşteriye yansıtılmış komisyonu geçmişe dönük oynatır.
- **R14.** `calcKDV`'nin kendisi ham KDV'yi döndürmeye devam ettiği için **tevkifatsız kayıtta bütün
  çıktılar birebir bugünküdür** (regresyon eşiği sıfır).
- **R15.** **Yuvarlama yalnız bölmenin içinde kuruşla yapılır.** Satış tarafının tamamı bugün
  **float**: `calcKDV` `(bedel * oran) / 100` döndürüyor, `parseMoney` float üretiyor,
  `calcKalanBorc` tam liraya yuvarlıyor, rapor toplamları float. Gider tarafının kuruş disiplini
  bu zincirde yok. Bu yüzden:
  1. `tahsilEdilecekKdv` **kendi içinde** toplam KDV'yi kuruşa çevirir, **tevkifat tutarını
     yuvarlar** (beyan edilen taraf), bize kalanı "toplam eksi tevkifat" olarak bulur ve ikisini
     TL'ye döndürür. İki parçanın toplamı toplam KDV'ye kuruşu kuruşuna eşittir, artık kuruş bize
     kalan tarafta olur (0075 ile aynı kural).
  2. Zincirin geri kalanı float kalır; `calcKalanBorc`'un tam lira yuvarlaması **değişmez**.
  3. Bütün gelir zincirini kuruşa çevirmek bu spec'in kapsamı değildir (ayrı ve çok daha büyük iş).
- **R16.** **Tevkifat para birimi bağımsız çalışır.** `calcKDV` para birimine bakmıyor, yani
  "Faturalı Yurtiçi" bir USD satış da KDV üretiyor. Bölme oranla yapıldığı için para birimi
  fark etmez; **bilgi rakamları (R22, R29, R31) para birimi başına tutulur** (raporun bugünkü
  `{TRY, USD, EUR}` deseni) ve KDV karşılaştırması bugünkü gibi yalnız TL'yi karşılaştırır.
  Tek para birimi varsayılırsa USD'li yurtiçi faturanın bilgi satırı sessizce TL'ye yazılır.

### C. Hangi rakam neyi gösterir

- **R17.** **Ciro (net) değişmez.** Tevkifat KDV'nin bölünmesidir, bedelin değil.
- **R18.** **Müşterinin borcu azalır:** `calcCiro` (ve ondan türeyen `calcKalanBorc`) tevkifat
  düşülmüş KDV'yi kullanır; yansıtılan komisyonun KDV'si de R12'ye tabidir. Tevkifatlı bir makina
  satışında müşteri matrah artı kalan KDV kadar borçludur.
- **R19.** **Tahsilat tutarı azalır:** 0044'ün `satisTahsilatKalemleri`'ndeki brüt tutar (servis,
  Extra Kalıp, yedek parça) tevkifat düşülmüş KDV ile hesaplanır; Kasa'nın beklediği tahsilat
  gerçekte tahsil edilecek tutar olur. **Kapsam kuralı değişmez:** anlaşmalı ve dış servisin
  işçiliği bugün olduğu gibi hariçtir, yani o kayıtta tahsilat tabanı faturanın tamamı değildir
  (bkz. R23/1).
- **R20.** **Beyan edeceğimiz KDV azalır:** aylık raporun `toplamKdv`'si ve ondan beslenen
  `hesaplananKdvAylar` tevkifat düşülmüş KDV'yi toplar; Finans'ın KDV Karşılaştırması buradan
  düzelir (karşılaştırma satış KDV'sini yeniden hesaplamıyor, 0001 C10).
- **R21.** **Alacak azalır:** aylık raporun `alacak`/`alacakMap`'i ve Finans'ın toplam alacağı aynı
  düşülmüş tutarı kullanır.
- **R22.** **Alıcının beyan edeceği kısım kaybolmaz, bilgi rakamı olur:** dönemin tevkifatlı
  satışlarının toplamı ve alıcıların beyan edeceği KDV toplamı raporda ve KDV kartında ayrı satırda
  görünür, **bizim borcumuza eklenmez**. Motor çıktısının şekli:
  1. `hesaplaAylikRapor` çıktısına **tek nesne** `tevkifatliSatis` eklenir; alanları
     `adet`, `matrah`, `toplamKdv`, `aliciBeyan`, `bizBeyan` (para birimi başına, R16).
  2. **Tevkifatlı satış yokken alan hiç eklenmez** (0076'nın `kisitli` deseni). Gerekçe: 0059'un
     altın JSON'u ve 0047 raporu alan eklenince kırılır; "yoksa hiç yok" kuralı ayıklama satırını
     tek satırda tutar.
  3. `kdvKarsilastir`'a **dördüncü parametre** verilir; verilmediğinde çıktı birebir eskidir
     (0075'in üçüncü parametre deseni).

### D. Ekranlar

- **R23.** Dört formda, kutu açıkken özet bloğu: Matrah, Toplam KDV, Tevkifat (alıcı beyan edecek),
  **Tahsil edilecek KDV**, **Fatura toplamı (tahsil edilecek)**. Rakamlar kaydedilecek motorun
  kendisinden gelir. İki alt kural:
  1. **Blok faturayı temsil eder, tahsilat kapsamını değil.** Formun bugünkü kutusu serviste
     işçilik artı parçayı topluyor; `satisTahsilatKalemleri` ise anlaşmalı ve dış servisin
     işçiliğini hariç tutuyor, yani dış servise Altuntaş parçası satılan kayıtta iki rakam farklı.
     Bu yüzden son satır "müşteriden tahsil edilecek toplam" değil **"fatura toplamı (tahsil
     edilecek)"**dir ve blokta "bize ait tahsilat" satırı **yoktur**; tahsilat tarafı 0044'ün
     kendi hesabında kalır. İkisini tek blokta birleştirmek anlaşmalı serviste yanlış rakam
     yazdırırdı.
  2. **Yeni kutu açılmaz:** satırlar formun **mevcut** KDV kutusunun içine eklenir (0076 R24
     emsali). Mevcut kutu bugün `kkYansit` açıkken KDV satırını hiç basmıyor (üç formda aynı
     desen); **o dalda da tevkifat satırları basılır**, yoksa tevkifat kart yansıtmasıyla
     birlikte görünmez olur. Yeni kutu dört formun yerleşim testlerini ve piksel kanıtını
     gereksiz büyütürdü.
- **R24.** Üç kalıcı bilgi notu, her biri tek sabitten: (a) tevkifatın müşteriden tahsil edilecek
  tutarı düşürdüğü ve bu kısmı alıcının kendisinin beyan edeceği; (b) ciro ve bedelin değişmediği;
  (c) alt sınırın (2026'da KDV dâhil 12.000 TL karşılığı) **satıcı olarak bizim sorumluluğumuzda**
  olduğu ve uygulamanın bunu denetlemediği. R13/2'nin kart uyarısı dördüncü, **koşullu** sabittir.
- **R25.** **Alt sınır denetlenmez** (0075 R14 ile aynı karar, gerekçesi farklı): sayı her yıl
  değişiyor, bazı işlemlerde uygulanmıyor ve kararı veren muhasebedir. Fark şu: gider tarafında
  sorumluluk satıcıdaydı, burada bizdeyiz, bu yüzden not daha güçlü yazılır.
- **R26.** Kayıt listelerinde tevkifatlı satış **ayırt edilir** (rozet: oran ve alıcının beyan
  edeceği tutar), 0076'nın kısıtlı gider rozeti emsali. Rozet **müşteri detayının zaman
  çizelgesinde** ve **Stok › Yedek Parça Satışı satırında** çizilir; müşteri tablosuna ve
  Servis ve Kargo Panosu kartına **girmez**. Gerekçe: rozetin işi "borç neden fatura toplamından
  küçük" sorusunu kaydın yanında cevaplamak; bu soru detayda ve satış listesinde sorulur, servis
  sahası ekranında sorulmaz ve kart yeri dardır.
- **R27.** Müşteri detayında borç satırı tevkifatlı satışta bunu yazar (borç neden fatura toplamından
  küçük sorusunun cevabı ekranda dursun).
- **R28.** **Yazdırılan Servis Formu tevkifatı yazar.** X1 "yurt içi fatura çıktısı yok" diyor ama
  servis formu çıktısı var ve bugün KDV basıyor (`printTemplates.js`, iki çağrı). Tevkifatlı
  serviste üç satır basılır (toplam KDV, tevkifat, tahsil edilecek); tevkifatsız serviste çıktı
  **birebir bugünküdür**. Gerekçe: müşterinin eline giden kâğıt uygulamanın beklediği tahsilattan
  farklı toplam yazarsa hata en görünür yerde çıkar.

### E. Rapor ve dışa aktarma

- **R29.** Aylık Faaliyet Raporu'na **"TEVKİFATLI SATIŞLAR"** kutusu (matrah, toplam KDV, alıcının
  beyan edeceği, bizim beyan edeceğimiz); tevkifatlı satış yoksa basılmaz. Kaynağı R22'nin
  `tevkifatliSatis` nesnesidir, kutu rakamı yeniden hesaplamaz.
- **R30.** Raporun bugünkü KDV rakamları **bizim beyan edeceğimiz** KDV'dir; tevkifatlı satış varsa
  kutuya bakılmasını söyleyen bir dipnot bulunur (tevkifatlı satış yoksa dipnot da basılmaz).
- **R31.** KDV Karşılaştırması kartına bilgi satırı. **Farka eklenmez** (0076'nın `kisit-kdv-bilgi`
  satırının emsali ve tersi: orada biz indiremiyorduk, burada biz beyan etmiyoruz). İki alt kural:
  1. **Metin "Tevkifatlı satışta alıcının beyan edeceği KDV"dir** ve gider tarafının bugünkü
     satırının metni ("Tevkifatla beyan edilecek KDV (KDV2)") değişmez. Gerekçe: aynı kartta iki
     "tevkifat" satırı yan yana ve **zıt** anlamda olacak (gider: biz beyan ederiz; satış: alıcı
     beyan eder); aynı kelimeyle iki zıt rakam en kolay yanlış okunan şeydir, bu yüzden ad
     uzunluğu pahasına netlik seçilir.
  2. Satır **iki ekranda birden** çizilir (Finans ve Giderler; aynı kart Giderler'de de aynı
     hesaplanan KDV ile çiziliyor). Yalnız Finans'a konursa Giderler'de "hesaplanan KDV neden
     düştü" sorusunun cevabı ekranda olmaz.
- **R32.** Dışa aktarmaya tevkifat sütunları eklenir (oran ve alıcının beyan edeceği tutar); bu
  tedarikçi/müşteri tarafı veridir, kişi bazlı gizlilik yasağına girmez. Kapsam: sütunlar
  **müşteri (makina)**, **servis** ve **Extra Kalıp / yedek parça** raporlarının her birine
  eklenir; **"Finans Özeti"ne sütun eklenmez** (orada satır yok, toplam var) ama toplam KDV'si
  düşülmüş tutarı sayar. Gerekçe: `finansOzetiHesapla` ile raporun eşitliğini
  `tests/finans-ozeti-export.test.js` sabitliyor; hangi tarafın değiştiği yazılmazsa o test
  gürültü üretir.

### F. Veri

- **R33.** Dört bölüme üç alan: `tevkifatli` (INTEGER boolean, açık `toInt`/`toBool`), `tevkifatPay`,
  `tevkifatPayda` (INTEGER). Tablolar `customers`, `services`, `part_sales`, `yedek_parca_satis`;
  dört nokta kuralı tablo başına. Kapalı ya da boş değer okumada blob'a **yazılmaz**. İki alt kural:
  1. **`customers` okuması bu iş için destructuring'e geçer.** Bugün `SELECT * FROM customers`
     sonucu `...c` ile ham yayılıyor, yani üç sütun eklenince **her müşteri kaydı
     `tevkifatli: null, tevkifatPay: null, tevkifatPayda: null` taşır** ve "boş değer yazılmaz"
     kuralı müşteride çalışmaz. Dört okumanın hepsi 0075 desenine çevrilir (üç alan destructure
     edilip `tevkifatOku` ile geri yazılır). Yoksa karışık sürümde blob sürekli "değişmiş"
     görünür; aynı sınıf hata 0001 triyajında kısıtlı kullanıcıda 403 yağmuruna yol açmıştı.
  2. **Sütun kümesi yeniden adlandırılır:** bugünkü `GIDER_TEVKIFAT_COLUMNS` adı dört yeni tabloda
     yanıltıcı olur, `TEVKIFAT_COLUMNS` olur (iki kullanım yeri güncellenir). `tevkifatYaz` ve
     `tevkifatOku` aynen paylaşılır, böylece R34'ün "tek küme" sözünün kodda karşılığı olur.
- **R34.** Alan adları 0075'in gider tarafıyla **bilerek aynıdır** (farklı tablolar, aynı kavram);
  okuma ve yazma yardımcıları paylaşılır.
- **R35.** **Göç yok:** alanları olmayan eski kayıt tevkifatsızdır.
- **R36.** Sunucu, izin ve merge değişmez: bu alanlar mevcut bölümlerin mevcut ekleme/düzenleme
  izinleriyle yazılır.

---

## Constraints

- **C1.** **Tek kapı:** satış KDV'si tek fonksiyondan geçer ve tevkifat indirimi orada uygulanır;
  ekranlara çıkarma dağıtılmaz (R8–R11). Tek kapının **iki yazılı istisnası** vardır: etiket oranı
  (R9/2; tahsil oranı ise `tahsilKdvOrani`'dan geçer) ve `calcCiro`'daki satır içi komisyon KDV'si
  (R12); ikincisi kapıya alınır ama taramayla değil, elle doğrulanır.
- **C2.** **Tevkifatsız kayıtta her şey birebir bugünküdür** (regresyon eşiği sıfır): ciro, borç,
  tahsilat, kart komisyonu, rapor, KDV karşılaştırması, servis formu çıktısı, dışa aktarma.
- **C3.** **Çift sayım yasağı:** alıcının beyan edeceği KDV bizim hiçbir borç, alacak ya da KDV
  toplamımıza girmez; yalnız bilgi rakamıdır.
- **C4.** **Kuruş sınırı yalnız bölmededir:** tevkifat artı bize kalan KDV, toplam KDV'ye kuruş
  düzeyinde eşittir (R15/1). Satış zincirinin geri kalanı bugünkü float hesabıyla kalır ve
  `calcKalanBorc`'un tam lira yuvarlaması değişmez (R15/2).
- **C5.** Yeni izin, yeni sunucu kuralı ve yeni bölüm yoktur.
- **C6.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** **Yurt içi fatura çıktısı** — *neden:* uygulamada yok. Tek fatura çıktısı **Yurt Dışı
  Fatura** (ihracat, KDV'siz, tevkifat olmaz). Kullanıcı tevkifatlı faturayı e-fatura
  uygulamasından kesiyor; bu spec yalnız **rakamların doğru olmasını** sağlar, bir fatura basmaz.
  Var olan **Servis Formu** çıktısı fatura değildir ama KDV basıyor; o R28 ile kapsamdadır.
- **X2.** **Teklif ve proformada tevkifat gösterimi** — *neden:* tevkifat faturada doğar, teklifte
  değil. Teklif onaylanıp CRM'e kaydedilince üretilen kayıtlarda kutu kapalı doğar ve kullanıcı
  gerekirse kaydı düzenler (R35 ile aynı mantık).
- **X3.** **Hangi işlemin tevkifata tabi olduğunun uygulama tarafından belirlenmesi** — *neden:*
  oran işlemin cinsine ve alıcının "belirlenmiş alıcı" olup olmadığına bağlı; ikisini de uygulama
  bilmiyor. Kullanıcı faturayı keserken biliyor ve işaretliyor (0075 X5 ile aynı karar).
- **X4.** **Alt sınırın denetlenmesi** — *neden:* R25.
- **X5.** **Tevkifatlı satışın tahsilatının kısmi takibi** (alıcı KDV2'yi ödedi mi) — *neden:* o
  bizim alacağımız değil, devletin alacağı; takip bize düşmez.
- **X6.** **Bayi ve dış firmaya kesilen faturalarda ayrı bir kural** — *neden:* alıcı kim olursa
  olsun kural aynı; borç atfı (0007) değişmez, yalnız tutarı düşer.
- **X7.** **Dondurulmuş kart komisyonunun geriye dönük düzeltilmesi** — *neden:* R13/2. Geçmişe
  dönük değiştirmek 0002'nin snapshot desenini bozar; onun yerine uyarı gösterilir.
- **X8.** **Satış zincirinin kuruş tamsayısına çevrilmesi** — *neden:* R15/3. Bu spec'in on katı
  bir iştir ve tevkifat için gerekmez.

---

## Context

- **0075'in varsayımı neden yanlış çıktı.** O spec "fabrikanın bakım onarım hizmeti listede var
  (7/10) ama yalnız belirlenmiş alıcılara (kamu, banka, BİT, KİT); müşteri profili özel firmalar
  olduğu için pratikte çıkmıyor" diyordu. Kullanıcı bunun doğru olmadığını bildirdi. Varsayım
  yanlıştı, karar değil: 0075 satış tarafını **bilerek** kapsam dışı bıraktı ve gerekçesini yazdı,
  bu spec onu açıyor. Geriye dönük bir hata değil, bilginin değişmesi.
- **İşin boyutu, ölçülen rakamlarla.** `calcKDV(` kaynakta **106 yerde** çağrılıyor. Dağılım
  R11'de dosya dosya yazılı. Önemli olan şu: **bu 106 çağrının 33'ü gelir hesabı değil.**
  17'si oran sondası (`calcKDV(tip, 100, …)`, kredi kartı komisyonu yansıtması için uygulanan
  yüzdeyi öğreniyor), yaklaşık 16'sı kredi kartı komisyonu tabanı. Yani "iş geniş ama mekanik"
  teşhisi yalnız 73 çağrı için doğru; kalan 33'ü karar gerektiriyor (R9, R13) ve bu kararların
  ikisi bu işin en sessiz hata kaynağı: tevkifat oran sondasına uygulanırsa oran yarıya iner,
  kart tabanına uygulanmazsa müşteri kartından fazla çekilir.
- **Kaynak taraması tek başına kanıt değil.** R11'in taraması yeşilken bile bir gelir yolu ham
  KDV'de kalabilir: `calcCiro`'nun yansıtılan komisyon KDV'si `calcKDV` çağrısı değil, satır içi
  bir çarpım (`komisyon * oran / 100`). Bu yüzden R12 ayrı bir gereksinim olarak yazıldı ve
  doğrulaması elle yapılır. Ders: "hepsi tek fonksiyondan geçiyor" cümlesi, aynı rakamı üreten
  **ikinci bir yol** olup olmadığı sorulmadan kanıt sayılmaz.
- **Neden `calcKDV`'nin kendisi değiştirilmiyor.** İmzası `(saleType, bedel, tarih, kdvRates)`, yani
  kaydı görmüyor; tevkifatı içine koymak için 106 çağrının hepsine kaydı geçirmek gerekir ve o
  sırada atlanan her çağrı **sessizce ham KDV** döndürür. `tahsilEdilecekKdv` ayrı bir ad olunca
  atlanan çağrı taramada görünür (R11). Ham `calcKDV` oran sondası, yazdırmanın "toplam KDV"
  satırı ve kart tabanı için kalır.
- **Yardımcının adı neden `satisKdv` değil.** `aylikRapor.js` hem yerel bir `satisKdv`
  değişkeni tutuyor hem de `rapor.satisKdv` alanını dışa veriyor (yazdırma şablonu "Makina
  KDV'si" olarak basıyor). O dosyada 18 çağrı taşınacağı için aynı ad gölgeleme üretirdi; iki
  kavram da farklı ("makina satışlarının KDV'si" ile "her satışın bize kalan KDV'si").
- **"Faturalı Yurtiçi" kapısının tuzağı.** `normalizeSaleType(undefined)` "Faturalı Yurtiçi"
  döndürüyor, yani alanı boş kayıt faturalı yurtiçi sayılıyor; eski kayıtlar "Faturalı Yurt İçi"
  gibi değerler taşıyor. Kapı dize karşılaştırmasıyla yazılırsa kutu eski kayıtta hiç çıkmaz ama
  temizlik her kayıtta çalışır, yani işaretlenen tevkifat sessizce silinir (R2).
- **Gider tarafıyla karıştırmayın (0075 ve 0076):**
  | | Gider tarafı (0075) | **Satış tarafı (bu spec)** |
  |---|---|---|
  | Faturayı kim kesiyor | Tedarikçi | **Biz** |
  | Tevkifatı kim beyan edip ödüyor | **Biz** (KDV2) | Alıcı |
  | Bizim nakit etkimiz | Tedarikçiye az, vergi dairesine ayrı | **Müşteriden az tahsil** |
  | KDV1'e etkisi | Yok (tamamını indiririz) | **Hesaplanan KDV azalır** |
  Alanlar aynı adda ama ayrı kayıtlarda; biri ötekini etkilemez. KDV kartında iki satır yan yana
  gelecek ve zıt anlamda olacak, bu yüzden metinleri R31/1'de ayrıştırıldı.
  Spec 0076 (binek araç) indirilecek KDV'yi azaltıyordu, bu spec hesaplanan KDV'yi azaltıyor:
  ikisi KDV karşılaştırmasının iki ayrı ucu ve birbirinden bağımsız.
- **Dört kaydın şekli.** Makina satışında KDV `faturaBedeli` üzerinden (`calcCiro`), servis
  kaydında işçilik ve parça ayrı hesaplanıyor ama **tek fatura** olduğu için tek tevkifat ayarı
  yeter; Extra Kalıp ve yedek parça çok satırlı formlarda tek faturaya karşılık geldiği için ayar
  bütün satırlara yazılır (R7). Satış tipinin alan adı bölüme göre değişiyor (müşteride
  `faturali`, diğer üçünde `faturaTipi`), bu yüzden tip yardımcıya ayrı parametre olarak geçer
  (R10/3).
- **Servisin iki kurucusu.** Servis kaydı `CustomerDetailModal` ve `ServisPanosu` içinde iki kez,
  birbirinin kopyası olarak kuruluyor (pano formunun "hepsi aynı" sözü bunu gerektiriyordu). Üç
  alan ikisinde birden yazılmazsa panodan girilen tevkifat kaybolur; bu yüzden R6/3 bir kaynak
  taraması istiyor.
- **Faturanın tamamı ile bize ait bedel aynı şey değil.** `satisTahsilatKalemleri` anlaşmalı ve dış
  servisin işçiliğini hariç tutuyor, Altuntaş parçasını tutuyor. Yani dış servise parça satılan bir
  kayıtta fatura toplamı ile tahsilat tabanı farklıdır. Formun özet bloğu faturayı gösterir
  (R23/1), tahsilat tarafı 0044'ün kendi hesabında kalır; ikisini tek blokta birleştirmek o kayıtta
  yanlış rakam yazdırır. `tahsilEdilecekKdv` kaydı ve bedeli birlikte aldığı için yalnız kendisine
  verilen bedel üzerinde çalışır, ek bir kural gerekmez.
- **Alt sınırda sorumluluk bizde ama denetim yine yok.** Satıcı biziz, yani sınırın altında tevkifat
  uygulamamak bizim sorumluluğumuz. Yine de uygulamanın denetlemesini önermiyorum: tutar her yıl
  değişiyor (2024'te 6.900, 2026'da 12.000), bazı teslimlerde sınır uygulanmıyor ve faturayı kesen
  muhasebe zaten bu kararı veriyor. Uygulama yanlış bir "bu tutarda tevkifat olmaz" uyarısı verirse
  doğru girişi engeller. Not güçlü yazılır (R24c).
- **Müşteri borcu düşeceği için eski kayıtlar etkilenmez ama yeni kayıtlar farklı görünür.** Yayın
  anında hiçbir kayıtta bayrak olmadığı için rakamlar değişmez; kullanıcı geçmiş bir satışı
  işaretlerse o müşterinin borcu ve o ayın KDV'si düşer. Bu beklenen davranıştır ve sürüm notunda
  yazılır. Tek istisna dondurulmuş kart komisyonudur: o anlık görüntü eski tabanla kalır ve
  kullanıcı uyarılır (R13/2).

---

## Acceptance Criteria

### Onay kutusu

- **AC-1.** Müşteri formunda fatura tipi "Faturalı Yurtiçi" seçilince tevkifat kutusu görünür.
- **AC-2.** Servis, Extra Kalıp ve yedek parça formlarında aynı kutu görünür.
- **AC-3.** Fatura tipi "Faturalı Yurtdışı", "Faturasız Yurtiçi" ya da "Faturasız Yurtdışı" iken kutu
  hiç çizilmez; fatura tipi **hiç olmayan** ve eski biçimli ("Faturalı Yurt İçi", düz "Faturalı")
  kayıtta kutu çizilir (normalleştirilmiş kapı, R2).
- **AC-4.** Fatura tipi "Faturalı Yurtiçi"den çıkınca tevkifat alanları kayıttan **silinir**
  (`false`/`null` değil); kural hem ekleme hem düzenleme kolunda çalışır (R5).
- **AC-5.** Kutu kapalıyken form bugünküyle birebir aynıdır.
- **AC-6.** Oran seçicisi 0075'in sabit listesini kullanır ve sabit `constants.js`'tedir; ikinci bir
  liste yok ve gelir motorları `gider.js`'i içe almıyor (kaynak taraması, R4).
- **AC-7.** Oran seçilmemiş ya da geçersiz kayıt reddedilir ve nedeni yazılır: serviste bildirimle,
  diğer üç formda `HataMetni` ile (R6/2).
- **AC-8.** Çok satırlı Extra Kalıp ve yedek parça formunda ayar bütün satırlara yazılır ve yazım
  ortak kayıt kurucusunda yapılır (R6/1, R7).

### Hesap

- **AC-9.** Matrah 100.000, KDV %20, tevkifat 5/10 olan satışta: toplam KDV 20.000; alıcının beyan
  edeceği 10.000; bizim tahsil edeceğimiz KDV 10.000; fatura toplamı 110.000.
- **AC-10.** Yuvarlama gereken oranda tevkifat artı bize kalan KDV toplam KDV'ye kuruşu kuruşuna
  eşittir ve artık kuruş bize kalan tarafındadır: matrah 1.333,33 ve %20 ile toplam KDV 266,67;
  3/10 tevkifat **80,00**; bize kalan **186,67**; toplam 266,67.
- **AC-11.** Gelir hesaplayan dosyalarda doğrudan `calcKDV(` çağrısı kalmamıştır; tarama R11'in
  ölçülen dosya listesini kapsar ve yalnız oran sondası biçimini muaf tutar (kaynak taraması).
- **AC-12.** Tevkifatsız kayıtta `tahsilEdilecekKdv` ile `calcKDV` birebir aynı sonucu verir.

### Türev rakamlar

- **AC-13.** Tevkifatlı makina satışında müşterinin kalan borcu matrah artı kalan KDV kadardır
  (komisyon yansıtması varsa AC-38 ile birlikte).
- **AC-14.** Tevkifatlı servisin, Extra Kalıbın ve yedek parçanın tahsilat tutarı (0044) düşülmüş
  KDV ile hesaplanır.
- **AC-15.** Aylık raporun toplam KDV'si tevkifat düşülmüş tutarı sayar.
- **AC-16.** Finans'ın KDV Karşılaştırmasındaki hesaplanan KDV aynı tutarı kullanır.
- **AC-17.** Aylık raporun ve Finans'ın alacak toplamı düşülmüş tutarı kullanır.
- **AC-18.** Ciro (net) tevkifattan etkilenmez.
- **AC-19.** Anlaşmalı ve dış servis işçiliği bugünkü gibi kapsam dışı kalır.
- **AC-20.** Bayiye ve dış firmaya kesilen tevkifatlı satışta borç atfı (0007) değişmez, tutarı düşer.

### Ekran ve rapor

- **AC-21.** Kutu açıkken özet bloğu beş satırı gösterir, rakamları kaydedilecek değerlerle aynıdır,
  **mevcut KDV kutusunun içinde** çizilir ve `kkYansit` açık dalda da görünür (R23).
- **AC-22.** Üç bilgi notu ekranda yazılıdır ve her biri tek sabitten gelir; kart uyarısı koşullu
  dördüncü sabittir.
- **AC-23.** Tutar alt sınırın altında olsa da kayıt engellenmez ve uyarı üretilmez.
- **AC-24.** Rozet müşteri detayının zaman çizelgesinde ve Stok › Yedek Parça Satışı satırında
  çizilir; müşteri tablosunda ve Servis ve Kargo Panosu kartında çizilmez (R26).
- **AC-25.** Müşteri detayında tevkifatlı satışın borç satırı nedenini yazar.
- **AC-26.** Aylık raporda "TEVKİFATLI SATIŞLAR" kutusu çıkar ve rakamları motorun
  `tevkifatliSatis` nesnesinden gelir; tevkifatlı satış yoksa kutu da dipnot da basılmaz ve
  **alan motor çıktısında hiç bulunmaz** (R22/2, R29, R30).
- **AC-27.** KDV kartındaki "Tevkifatlı satışta alıcının beyan edeceği KDV" satırı bilgi satırıdır,
  farka eklenmez, gider tarafının KDV2 satırının metnini değiştirmez ve **Finans ile Giderler'de
  birden** görünür (R31).
- **AC-28.** Dışa aktarmada tevkifat sütunları müşteri (makina), servis ve Extra Kalıp / yedek parça
  raporlarında bulunur; "Finans Özeti" sütunsuzdur ama toplam KDV'si düşülmüş tutarı sayar (R32).

### Veri ve regresyon

- **AC-29.** Üç alan dört tabloda roundtrip edilir; kapalı ya da boş değerler blob'a yazılmaz ve
  bu **müşteri bölümünde de** geçerlidir (okuma destructuring'e geçmiştir, R33/1).
- **AC-30.** Alanları olmayan eski kayıt tevkifatsız davranır; göç kodu yazılmamıştır.
- **AC-31.** Tevkifatsız kayıtlardan oluşan bir veri kümesinde ciro, borç, tahsilat, kart komisyonu,
  aylık rapor, KDV karşılaştırması, servis formu çıktısı ve dışa aktarma bu işten **önce ve sonra
  birebir aynıdır**.
- **AC-32.** 0075'in gider tarafı tevkifatı bu işten etkilenmez (çapraz test).
- **AC-33.** 0076'nın indirilecek KDV kısıtlaması bu işten etkilenmez (çapraz test).
- **AC-34.** Temiz kurulum ve roundtrip testleri tevkifatlı kayıtla yeşildir.
- **AC-35.** Yeni izin, sunucu kuralı ve bölüm eklenmemiştir.



### Sınır durumları, tek kapının istisnaları ve kanıt

- **AC-36.** Etiket oranı ham `calcKDV` kalır: tevkifatlı 5/10 bir satışta ekrandaki KDV oranı yine
  %20 okunur; kart tutarı ve ödeme ayrıştırması `tahsilKdvOrani` (%10) ile yapılır, yani kartla
  ödenen makinada borçtan düşen tutar borcu aşmaz (R9/2, revizyon 2).
- **AC-37.** Tevkifatlı yeni kayıtta kredi kartı komisyonu tabanı tevkifat düşülmüş tutardır;
  bayrağı sonradan açılan kayıtta **mevcut anlık görüntü değişmez** ve formda uyarı sabiti görünür
  (R13).
- **AC-38.** Yansıtılan kart komisyonunun KDV'si de tevkifata tabidir: tevkifatlı, komisyonu
  yansıtılmış bir makina satışında müşteri borcu komisyon KDV'sinin tevkifat payı kadar da düşer
  (R12).
- **AC-39.** Kuruş sınırı yalnız bölmede geçerlidir: `calcKalanBorc`'un tam lira yuvarlaması ve
  zincirin float hesabı değişmemiştir (R15/2, kaynak ve çıktı karşılaştırması).
- **AC-40.** Ödeme yöntemi "Kredi Kartı" seçilip fatura tipi kendiliğinden "Faturalı Yurtiçi"ye
  dönünce kutu görünür ama **kapalı** doğar ve hiçbir alan yazılmaz (R3).
- **AC-41.** Servis kaydının üç alanı **iki kurucuda birden** yazılır (müşteri detayı ve Servis
  Panosu) ve bunu sabitleyen kaynak taraması yeşildir (R6/3).
- **AC-42.** Yazdırılan Servis Formu tevkifatlı serviste üç satır basar; tevkifatsız serviste çıktı
  birebir bugünküdür (R28).
- **AC-43.** "Faturalı Yurtiçi" bir USD satışta tevkifat oranla bölünür ve bilgi rakamları para
  birimi başına tutulur; KDV karşılaştırması yalnız TL'yi karşılaştırmaya devam eder (R16).
- **AC-44.** Altın çıktılar adıyla denetlenir: `tests/fixtures/0059-aylik-faaliyet.html` tevkifatsız
  veriyle **birebir aynı** kalır, `tests/fixtures/0059-gider-rapor-once.json` hiç değişmez.
- **AC-45.** Yardımcının adı `satisKdv` değildir; `aylikRapor.js`'in yerel `satisKdv` değişkeni ve
  `rapor.satisKdv` alanı bugünkü anlamıyla korunmuştur (R10/1, kaynak taraması).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] **Kaynak taraması yeşil:** gelir hesaplayan dosyalarda doğrudan `calcKDV(` kalmadı (AC-11),
      muafiyetler yazılı (oran sondası biçimi) ve R11'in ölçülen dosya listesi kapsandı.
- [ ] **Taramanın görmediği iki yol elle doğrulandı:** `calcCiro`'nun satır içi komisyon KDV'si
      (AC-38) ve dondurulmuş kart komisyonu tabanı (AC-37).
- [ ] **Tevkifatsız veride sıfır fark** çapraz testlerle gösterildi: ciro, borç, tahsilat, kart
      komisyonu, aylık rapor, KDV karşılaştırması, servis formu çıktısı, dışa aktarma (AC-31) ve
      iki altın dosya adıyla denetlendi (AC-44).
- [ ] Context'teki örnek rakamlar motor testinde birebir sabitlendi: AC-9 (yuvarlamasız) ve AC-10
      (yuvarlamalı, artık kuruş bizde).
- [ ] 0075 ve 0076 ile kesişim testleri yazıldı (AC-32, AC-33).
- [ ] Görsel kanıt eklendi (`0079-taban-piksel-raporu.json` + `0079-piksel-raporu.json`): dört formda
      kutu kapalı (0 piksel) ve açık, özet bloğu mevcut kutunun içinde, `kkYansit` açık dal,
      listedeki rozet (iki yer), müşteri detayındaki borç satırı, raporun yeni kutusu, Finans ve
      Giderler'in KDV kartı. Bilinçli değişen ekranlar `docs/evidence/kanit-eslemesi.json`'da
      `beklenen: "degisti"` + onay satırıyla kayıtlı.
- [ ] `npm test` yeşil (çıktısıyla, Electron testleri dahil), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: satış KDV'sinin tek kapısının `tahsilEdilecekKdv` olduğu,
      `calcKDV`'nin ham KDV anlamına geldiği ve iki yazılı istisnası (oran sondası, kart tabanı),
      dört bölümdeki alanlar, borcun ve tahsilatın düştüğü, yansıtılan komisyon KDV'sinin de
      tevkifata tabi olduğu, dondurulmuş kart komisyonunun geriye dönük düzeltilmediği, alıcının
      beyan edeceği kısmın bilgi rakamı olduğu, ve **0075 X1'in açıldığı**.
- [ ] Sürüm notu: tevkifatlı satış faturası artık girilebiliyor; işaretlenen eski bir satışın
      müşteri borcu ve o ayın KDV'si düşer, ama o kaydın kredi kartı komisyonu eski tabanla kalır.
      **Karışık sürüm uyarısı:** güncellenmemiş istemci tevkifat alanlarını görmez ve hesaba
      katmaz, o makinada müşteri borcu ve aylık KDV **fazla** görünür; güncellenmemiş sunucu
      alanları düşürür. Önce sunucu PC, sonra bütün istemciler; güncelleme bitene kadar kutu
      işaretlenmez.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
