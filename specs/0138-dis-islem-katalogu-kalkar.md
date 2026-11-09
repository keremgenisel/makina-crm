# 0138 — Dış işlem kataloğu kalkar

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-09) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog (Dış İşlemler paneli), parça kartının maliyet kalemleri, tedarikçi silme kapıları, çöp kutusu, yedekleme, sunucu bölüm eşlemeleri, kilit alanları, işlem geçmişi etiketleri, örnek katalog düğmesi, bekçi fikstür zinciri, saf motorlar (`disIslem.js`, `disIslemEtkisi.js`, `urunAgaci.js`, `malzeme.js`, `maliyetKalemleri.js`, `makinaStandartMaliyet.js`, `parcaFiyati.js`, `parcaAktarma.js`, `merge.js`, `kilitAlanlari.js`, `bolumAdlari.js`, `yedekPaketleri.js`, `ornekKatalog.js`), ekranlar (`SettingsExport.jsx`, `SettingsImport.jsx`, `SettingsTrash.jsx`, `SettingsBackup.jsx`, `ServisPencere.jsx`) |
| **Bağımlı spec'ler** | 0137 (geri alınıyor), 0135 (işlem kalemi kalıyor), 0132, 0096, 0086 (üç senkron noktası), 0082 (emsal), 0139 ve 0140 (sonra uygulanır) |
| **QA turu** | 2026-11-09, 26 bulgu (5 Bloklayıcı, 13 Önemli, 8 Küçük); hepsi onaylandı ve işlendi |
| **Düzeltilen iddialar** | R3 (olmayan ibare), R5 ile AC-17 ve AC-18 (malzeme kolu kodda yok), etkilenen alanlar listesi (`siparisIhtiyaci.js` dış işlem okumuyor) |

---

## Intent

Fabrika yönetimi dış işlem kataloğunu istemiyor. Katalog, her fason işlemi bir kez tanımlayıp
fiyatını tek yerden güncellemek için yapılmıştı; karşılığında 25 işlem kaydının 381 parçaya tek
tek bağlanmasını gerektiriyor ve bu kurulum hiç yapılmadı. Bugün hiçbir parça kataloğu
kullanmıyor, yani katalog yalnız kurulum yükü olarak duruyor.

Bu iş bittiğinde Ayarlar › Katalog'da bir öğe azalır, parça kartındaki işlem kalemi tek çeşide
iner ve kullanıcı bir fason bedelini yazmak için önce katalog kaydı açmak zorunda kalmaz.
Parçanın fason maliyetini yazma yeteneği kaybolmaz: parça kartındaki işlem kalemi satırı (ad,
tutar, isteğe bağlı tedarikçi) bugünkü hâliyle kalır.

---

## Requirements

### Kalkanlar

- **R1.** Ayarlar › Katalog'daki **Dış İşlemler** paneli kalkar. Panelin altındaki fiyat
  güncelleme penceresi, fiyat geçmişi, kullanım sayacı ve çöpe atma onayı da kalkar.
- **R2.** Parçanın işlem kaleminin **katalogdan seçilen çeşidi** kalkar. "Katalogdan / Serbest"
  çeşit seçicisi, işlem arama kutusu, salt okunur birim ve birim fiyatı alanları, kilo miktarı
  alanı ve çeşit değiştirme onayı kalkar; işlem kalemi tek çeşit olur.
- **R2/2.** Kalmayan tek şey **savunmadır**: `islemId` taşıyan eski biçimli bir kalem yeni kodda
  **çözülemeyen** sayılır. Ölçüm C'de yazılı: bugünkü serbest dalı tutarı boş kalemi
  `cozuldu: true` yapıp toplamı öteki kalemlerden hesaplıyor, yani kalan bir katalog kalemi
  maliyeti "girilmedi" yapmaz, **sessizce düşürür**. Tek satırlık okuyucu
  (`eskiKatalogKalemi = k => k.tur === "islem" && k.islemId != null`) `maliyetKalemleri.js`'te
  kalır; `maliyetKalemleriOzeti` böyle bir satırı çözülemeyen sayar (toplam `null`), parça
  kartı nedeni yazar ve `kalemFormu` o kalemi `ad = "Dış işlem"` ile serbest forma açar.
  C3/2 bunun gerekçeli istisnasıdır.
- **R3.** Dış işlemin fiyat zammı önizlemesi kalkar (`disIslemEtkisi.js` ve
  `DisIslemFiyatPenceresi.jsx`). Malzeme fiyat güncelleme penceresinde **kaldırılacak bir ibare
  yoktur** (ölçüm D): 0137'nin o pencereye tek dokunuşu `malzeme.fiyatEtkisi`'ne dış işlem
  kataloğunu geçirmekti ve bu bir gerileme düzeltmesiydi. Kalkan şey o seçenek anahtarı ile
  `MalzemeManager.jsx` üstünden inen prop'tur; pencerenin etki önizlemesi spec öncesiyle birebir
  aynı kalır. Parça kartındaki karma tarih ibaresi (`KARMA_TARIH_IBARESI`) 0135'in malıdır ve
  kalır; koşulu yalnız serbest işlem kalemiyle sağlanır.
- **R4.** Çöp kutusundaki dış işlem satırı, geri alma ve kalıcı silme kapıları kalkar.
- **R5.** Tedarikçi silme kapılarının dış işlem kolu kalkar. Dört kapı (Tedarikler'in silme
  düğmesi, çöp kutusunun kalıcı silmesi, çöpü boşaltma, otuz günlük temizlik) yalnız
  **parçaların kalemlerini** okur. Malzeme kartının Ana tedarikçisi bugün hiçbir kapıda
  okunmuyor (ölçüm E) ve bu iş onu değiştirmez; bulgu X8'de yazılıdır. İki adresli ret metni
  tek adresli hâline döner ve `tedarikciKullanim`'ın dönüş şekli 0135'teki hâline döner
  (R22).
- **R6.** Yedekleme "Tanımlar" paketinden dış işlem çıkar. Dış işlem bölümü taşıyan eski bir
  yedek dosyası geri yüklenirken o bölüm **yok sayılır**, hata vermez.
- **R6/2.** Dış işlem yedek zincirinin **beş** yerinden birden çıkar (ölçüm F): elle yedeğin
  gövde kurucusu (`SettingsBackup.jsx`), otomatik yedeğin gövde kurucusu (`App.jsx`), geri
  yükleme dalı, kısmi geri yüklemenin bölüm listesi ve paket listesi (`yedekPaketleri.js`).
  Otomatik yedek atlanırsa yeni sürüm hâlâ dış işlem yazan bir yedek üretir ve 0082'nin yedek
  anahtarı testi kırılır.
- **R7.** Sunucunun bölüm eşlemeleri ve bölüm adı sözlükleri dış işlemi tanımaz. Güncellenmemiş
  bir istemcinin gövdesinde dış işlem bölümü gelirse **yok sayılır**, 403 üretmez ve işlem
  geçmişine bölüm adı düşmez (0082'nin standart gider emsali).
- **R8.** `ayar:disislemler` kilit alanı ve etiketi kalkar.
- **R9.** Örnek katalog düğmesinin dış işlem örnekleri kalkar.
- **R9/2.** Dosyanın hangi yarısının kaldığı yazılıdır: `ornekKatalog.js`'ten yalnız
  `ISLEM_FORMLARI` ve `ornekDisIslemler` silinir; `ORNEK_DUGMESI`, `ORNEK_ONEKI`, `ORNEK_IPUCU`
  ve malzeme yarısı (`MALZEME_FORMLARI`, `ornekMalzemeler`) **aynen kalır**. Düğme ve ipucu
  yalnız dış işlem panelinden kalkar; `ornek-katalog.test.js`'in dış işlem blokları da.

### Kalanlar

- **R10.** Parça kartındaki **serbest işlem kalemi** birebir kalır: ad (zorunlu), tutar
  (isteğe bağlı, boş bırakılabilir), tedarikçi (isteğe bağlı). Doğrulaması, boş tutar uyarısı,
  toplama girmemesi ve kalem sayısı sınırı değişmez.
- **R11.** Maliyetin tek okuma yolu korunur. Parça maliyetinin dış işlem kataloğunu alan
  parametresi kalkar, imza daralır ve bütün çağıranlar aynı işte güncellenir; öncelik sırası
  (set içeriği, kalem listesi, elle maliyet) değişmez.
- **R11/2.** Daralan imzaların tamamı yazılıdır ve **aynı işte** güncellenir (ölçüm G): beşinci
  parametre `parcaMaliyetKurus`, `parcaMaliyetiVar`, `maliyetGirildiMi`, `parcaMaliyetMetni` ve
  `maliyetKaynagi`'ndan; `maliyetKalemleriOzeti`'nin dördüncüsü; `formKalemOzeti`'nin üçüncüsü
  ve dördüncüsü (`birimKat`); `maliyetGecmisiSatirlari`'nın üçüncüsü; `kalemlerDogrula`'nın
  ikincisi; `maliyetGecmisiYaz`'ın `katalogIslem` ve `islemKat` seçenekleri;
  `malzeme.fiyatEtkisi`'nin `disIslemler` seçeneği; `parcaSatirlariniCoz`'ün yedincisi;
  `parcaDisaAktarmaSatiri`'nın beşincisi; `fiyatBaglamiKur`'un `disIslemler` anahtarı ve
  `islemKat` alanı; `modelMaliyeti`'nin altıncısı; `modelMaliyetleri`'nin veri nesnesi.
  **Karar:** `setOzeti`'nin `fiyatOku`'su 0137 Karar 34 ile altıncıya kaymıştı, **beşinciye
  geri döner** ve iki çağıranı aynı işte düzeltilir. Konumlu parametrede atlanan çağıran
  derleme hatası vermez, sessizce `undefined` geçer; bu yüzden liste yazılıdır.
- **R11/3.** Makina Maliyeti ekranının `BOS_ISLEMLER` kararlı referansı ve onu kullanan
  varsayılan prop kalkar; `parcaKatalogu` memo'sunun bağımlılıkları daralır. Yerine satır içi
  `[]` varsayılan **yazılmaz**: 0136'nın sapma sayacı her çizimde koşar ve o spec'in ölçülmüş
  çağrı sayısı testi kırılır.
- **R11/4.** `maliyetKalemleri.js`'in katalog yardımcılarının akıbeti yazılıdır: `kalemYoluMu`
  yerini `malzemeKalemiVarMi`'ye bırakır, `kalemTedarikciIdleri` 0135'teki hâline döner
  (katalog süzgeci kalkar), `katalogIslemVarMi` ile `serbestIslemMi` silinir ve `katalogIslemMi`
  yalnız R2/2'nin savunması olarak kalır.
- **R12.** Tarihli okumanın kapısı yalnız **malzeme kalemine** döner: en az bir malzeme kalemi
  olan parçada kalem yolu kullanılır ve parçanın kendi maliyet geçmişi ne yazılır ne okunur;
  yalnız serbest işlem kalemi olan parçada parçanın kendi geçmişi çalışır. Serbest kalem
  tarihli sorguda da bugünkü tutarıyla girer.
- **R12/2.** Kapı ve ibareler adıyla yazılıdır: `maliyetGecmisiYaz`'ın kapısı
  `set || malzeme || katalogIslem`'den `set || malzeme`'ye döner, `katalogIslem` ve `islemKat`
  seçenekleri kalkar, üç çağıranı (`gecmisliKayit`, parça kartı, `parcaSatirlariniCoz`) aynı
  işte güncellenir. Parça kartındaki iki ibareden `KALEM_GECMIS_IBARESI` **kalkar**,
  `MALZEME_GECMIS_IBARESI` tek başına kalır. İkisi aynı `data-testid`'yi taşıdığı için
  (`kalem-gecmis-ibaresi`) yanlış olanın bırakılması testten geçer; bu yüzden hangisinin
  kaldığı yazılıdır.
- **R13.** Sipariş ihtiyacı hesabının bugünkü çıktısı değişmez: işlem kalemi (serbest ya da
  katalog bağlı) zaten sipariş satırı üretmiyordu.
- **R14.** Tedarikçinin hammadde işareti, malzeme kartındaki Ana tedarikçi alanı ve parça
  kaleminin tedarikçi alanı değişmez.

### Göç ve veri

- **R15.** Katalog bağlı kalem taşıyan parça **yoktur** (ölçüldü, Context). Yine de bu sürüm
  yüklenmeden önce başka bir bilgisayarda böyle bir kalem eklenmişse maliyeti sessizce
  düşmemelidir: veritabanı açılışında bir kerelik göç, katalog bağlı her kalemi **serbest
  kaleme çevirir** (ad = işlemin adı, tutar = o kalemin göç anındaki hesaplanmış satır tutarı,
  tedarikçi = işlemin tedarikçisi). Çözülemeyen kalem (işlem çöpte, fiyatı boş, kilo tabanı
  yok) **tutarsız** serbest kaleme çevrilir, yani adı ve tedarikçisi korunur, tutarı boş kalır.
- **R15/2.** Göç **kilo birimli kalemi her zaman tutarsız** serbest kaleme çevirir; yalnız adet
  birimli kalemin tutarı hesaplanır. Gerekçe ölçüm H'de: göçün saf çekirdeği `electron/` altında
  durur ve paketlenmiş uygulamada `src/`'yi okuyamaz; adet birimli tutar yalın aritmetiktir
  (birim fiyatı çarpı kur bir kez kuruşa, sonra çarpı adet), kilo tabanı ise malzeme
  geometrisinin tamamını ister. O zinciri ikinci bir yere kopyalamak 0132 C1'in "ağırlık
  çarpımları tek yerde" kuralını kırar ve sıfır kayıtlı bir sigorta maddesi için ölçüsüzdür.
- **R15/3.** Kaydı **hiç bulunamayan** işlemin kalemi (kimlik karşılığı yok) de tutarsız
  serbest kaleme çevrilir ve adı sabit yer tutucudan gelir: `ad = "Dış işlem"`. Serbest kalem
  adsız kaydedilemez; adsız kalem yazmak parçayı kullanıcı için kilitlerdi.
- **R15/4.** Göçün yazdığı tutarın birimi **TL**'dir: katalog kaleminin satır tutarı kuruştur,
  serbest kalemin `tutar` alanı TL'dir ve iki ondalığa yuvarlanır. Göç `tutarK / 100` yazar ve
  kalemin kendi doğrulayıcısının yuvarlamasını uygular; kuruşu TL alanına yazmak maliyeti yüz
  kat şişirirdi.
- **R16.** Göç yalnız yerel veritabanı açılışında bir kez çalışır, izini bırakır ve öncesinde
  veritabanı yedeği alır (`kasaGocu` emsali).
- **R16/2.** Göç **üç açılış dalında da** çağrılır (mevcut veritabanı, temiz kurulum, JSON
  göçü) ve bayrak her hâlde yazılır; taşınacak veri yoksa iş de yoktur. 0115'in "verisi yoksa
  bayrağı yazma" deseni burada yanlış olur, çünkü dış işlem tablosu temiz kurulumda boş doğar
  ve ikinci açılışta yeniden denemenin karşılığı yoktur (AC-27). Yedek **yalnız değişecek parça
  varsa** alınır (`kasaGocu` bunu `yeni.length` ile yapıyor); koşulsuz yedek bütün
  kullanıcılarda sıfır kazanç karşılığında bir veritabanı kopyası demektir.
- **R17.** Dış işlem tablosu **silinmez, ölü tablo olarak durur**: okuma ve yazma yolu kalkar,
  satırlar yerinde kalır (0082'nin `standart_giderler` emsali). Göç bu tabloyu yalnız okur.
- **R17/2.** Yazma yolunun kalkması **ölçülür**, iddia olarak kalmaz. Okumanın kalkması
  bedavadır (sunucunun bölüm karşılaştırması yalnız bölüm listesi üzerinden gezer, ölçüm I),
  ama yazma bloğu kalmazsa güncellenmemiş bir istemcinin gövdesi tabloyu `DELETE` ile
  **boşaltır**. 0082'nin birinci dersi tam olarak buydu; X6'nın geri dönüş yolu gerekçesi
  satırların gerçekten yerinde kaldığı ölçülmezse boş bir iddiadır (AC-32).
- **R18.** Bugünkü 25 dış işlem kaydı bu spec'in ekinde saklanır (işlem adı, birim, birim
  fiyatı, para birimi, tedarikçi adı). Kayıtlar **uygulamadan kalkar**; ölü tabloda ve bu
  yazılı kayıtta durur. R17 satırların silinmesini yasaklar; "dosyadan silinir" diye okunmasın.

### QA turunda eklenen maddeler (2026-11-09)

- **R19.** Katalog kaleminin kilo tabanını kuran iki ağırlık yardımcısı (`islenmisKg`,
  `parcaIslenmisKg`) ve yalnız onlara hizmet eden neden sabitleri `malzeme.js`'ten silinir ve
  C3'ün taramasına girer. Tek üretim tüketicisi katalog kaleminin kilo tabanıydı (ölçüm J);
  0139 da bu zincire dayanmıyor. Çağıransız bir ağırlık API'si bırakmak 0132 C1'in "ağırlık
  çarpımları tek yerde" kuralını bir sonraki spec'te ikinci bir hesap yoluna davet eder.
- **R20.** İşlem geçmişinin `dis_islem` etiketi kaldırılır (0082 emsali) ve bilinçli sonuç
  yazılır: bu iş öncesinde yazılmış dış işlem kayıtları on iki aylık saklama süresi boyunca
  **ham anahtarla** görünür. Etiketi bırakmak, etiket haritasının ters yön denetimini kırar.
- **R21.** Prop zinciri sayı ve dosya adıyla yazılıdır (ölçüm K): App dokuz yerden birden
  çıkarır (Müşteriler, Bayiler, Stok, Makina Maliyeti, Evrak, Servis ve Kargo Panosu'nun sekme
  ve kiosk çağrıları, Ayarlar, Giderler) ve ayrı pano penceresinin salt okunur anlık
  görüntüsünden; altı ekran `fiyatBaglamiKur`'a geçirmeyi bırakır; Ayarlar yedi alt bileşene
  dağıtmayı bırakır. App'in kayıt gövdesi, kayıt bağımlılık dizisi ve otomatik yedeği de temizlenir.
  Kalan tek bir prop lint hatası vermez, sessizce ölü kod bırakır.
- **R22.** Çöp kutusu ve tedarikçi tarafının metin ve yardımcıları adıyla kalkar:
  `disIslemCopEtiketi`, `KALEMDE_ISLEM_NEDENI`, `KALEMDE_ISLEM_RED`, `kullanilanDisIslemler`,
  çöp satırının ad çakışması çağrısı, Tedarikler silme onayındaki "n dış işlemde geçiyor"
  cümlesi ve `KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI`. `tedarikciKullanim`'ın dönüş şekli
  0135'teki hâline döner: `islem` ve `islemCop` alanları kalmaz. Dönüş şeklinde kalan sıfır
  değerli alanlar kıyas altınlarını kirletir ve kaynak taramasından geçer.
- **R23.** Kalem listesinin boş durum metni (`KALEM_BOS_METNI`) 0135'teki hâline **aynen**
  geri yazılır; metin git geçmişinden alınır, yeniden yazılmaz. Türkçe çıktıyı geliştiricinin
  kalemine bırakmak keyfi fark üretir ve eski metin zaten kayıtta duruyor (AC-4).
- **R24.** Kimlik sayacının yedek hesabı (`maxIdAcross`) dış işlem listesini okumaz; bölüm
  okunmadığı için orada kalmasının karşılığı da yok. Bilinen sınır X6'nın altına yazılır: ölü
  tablonun kimlikleri yeniden kullanılabilir hâle gelir ve bu yalnız sürüm geri alınırsa
  görünür.
- **R25.** Belirsiz sayı kuralının yeri **geri alınmaz**: 0137 Karar 38 onu `tutarGirdisi.js`'e
  taşımıştı, orada kalır ve `malzeme.js` aynı adlarla yeniden dışa vermeyi sürdürür. Tek yer
  taraması 0137'nin test dosyasından bu işin test dosyasına taşınır. Taşımayı geri almak iki
  modülü yeniden döngüsel içe aktarmaya sokar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Serbest işlem kalemi taşıyan ya da hiç kalemi olmayan parçada bu işin çıktısı
  **birebir eskisiyle aynı** olmalıdır: parça maliyeti, satış fiyatı, model maliyetleri, parti
  hesabı, sipariş ihtiyacı, Excel dışa aktarması ve aylık rapor. Kıyas altını spec öncesi
  koddan üretilir.
- **C1/2.** Kıyas altınının **neyi kapsadığı** yazılır (0137'nin kıyas testi emsal). İki
  kalemin dikkat gerektiren yanı ölçüldü: sipariş ihtiyacı motoru dış işlemi hiç okumuyor
  (ölçüm L) ve aylık rapor parçanın alış maliyetini okumuyor, yani bu iki yarı yazılı kapsam
  olmadan boş geçer. Boş geçen "birebir aynı" iddiası yanlış güven üretir.
- **C2.** Maliyetin tek okuma yolu kuralı korunur: parça maliyeti kaynakta yalnız tek
  fonksiyondan okunur, ikinci bir hesap yazılmaz.
- **C3.** Kaldırma eksiksiz olmalıdır: dış işlem adını, kimliğini ve kalemin katalog alanını
  okuyan hiçbir satır kaynakta kalmaz (göç modülü ve bu spec'in eki istisnadır). Kaynak
  taramasıyla sabitlenir.
- **C3/2.** C3'ün **gerekçeli üçüncü istisnası** R2/2'nin savunmasıdır: `maliyetKalemleri.js`
  kalemin `islemId` alanını yalnız "eski biçimli kalem" ayracı olarak okumayı sürdürür ve
  `maliyetKalemleriOzeti` ile `kalemFormu` bu ayraca bakar. İstisna tam yollu yazılır ve
  eskiyince test kırılır. Gerekçe: C3'ü harfiyen uygulamak, R15'in göçünün kapatmak için
  yazıldığı sessiz maliyet düşmesini istemci PC'de açık bırakır, çünkü göç yalnız yerel
  veritabanı açılışında çalışır (ölçüm B).
- **C4.** Göç parçanın başka hiçbir alanına dokunmaz; kalem sırası korunur.
- **C5.** Sunucu, izin ve birleştirme tarafında **yeni** bir kural eklenmez; yalnız var olan
  dış işlem satırları kalkar. Yeni eylem izni yoktur.
- **C6.** Kaldırma, bu sürümü almayan bir istemcinin verisini bozmamalıdır: eski istemci dış
  işlem bölümünü göndermeye devam edebilir ve bu yazım sessizce yok sayılır. Sürüm notunda
  önce sunucu PC'nin güncellenmesi yazılır.

- **C7.** Bekçi zinciri ve sayı iddiaları aynı işte güncellenir (0137 C11'in ikizi, ölçüm M).
  Fikstür `tests/fixtures/0137-yeni-bolum.js` silinir ve `tests/fixtures/0133-yeni-ayar.js`'in
  zincirinden çıkarılır; o zincir **dokuz** test dosyasında kullanılıyor ve orada unutulan bir
  güncelleme 0137'yi yok sayan ayıklamayı yerinde bırakıp bekçiyi kalıcı olarak gevşetir.
  Güncellenecek sayılar: çöp kutusu tablo listesi yirmi dörtten yirmi üçe, otuz günlük temizlik
  çağrısı yirmi sekizden yirmi yediye, bölüm listesi otuz dörtten otuz üçe, kimlikli bölüm
  sayısı otuzdan yirmi dokuza. Ayrıca `dis_islemler` çöp kutusu tablo listesinden ve kimlik
  sayacının yedek hesabından çıkar (R24), dış işlem `SettingsExport` imzasından ve
  `kalemdeGecenTedarikciler` deseninden çıkar, 0082'nin yedek anahtar listesi ile App kayıt
  gövdesi deseni güncellenir, sunucu yetki testinin ve iki Electron veritabanı testinin dış
  işlem blokları kalkar.

### KAPSAM DIŞI

- **X1.** İşlem kaleminin kendisi kalkmaz — *neden:* Takım Yöneticisi kararı (2026-11-09).
  Bir parçanın fason bedelini yazmanın tek yolu bu satır; kalkarsa o bedel yalnız elle
  maliyetin içinde, kırılımsız ve tedarikçisiz durur.
- **X2.** Parçaya Ana tedarikçi alanı eklenmez — *neden:* 0140'ın (tedarikçi odaklı sipariş
  ekranı) işi, orada tek kuralla tanımlanacak.
- **X3.** 25 kaydın bedelleri parçalara dağıtılmaz — *neden:* hangi bedelin hangi parçaya
  gittiği veride yok; dağıtım bir veri girişi işidir, kaldırma işi değil.
- **X4.** Malzeme kataloğuna, fire kuralına ve malzeme kaleminin hesabına dokunulmaz — *neden:* 0139'un işi.
- **X5.** Sipariş ihtiyacı ekranının yeri ve düzenlenebilirliği değişmez — *neden:* 0140'ın işi.
- **X6.** Ölü tablo silinmez ve satırları temizlenmez — *neden:* geri dönüş yolu açık kalsın;
  tabloyu düşürmek sürüm geri alınırsa veri kaybıdır.
- **X7.** Genel aramaya dokunulmaz — *neden:* dış işlem arama kapsamında hiç değildi
  (ölçüldü).
- **X8.** Malzeme kartının Ana tedarikçisine silme koruması eklenmez — *neden:* bugün hiçbir
  kapıda okunmuyor (ölçüm E), yani koruma eklemek yeni davranıştır ve C5'in "yeni kural
  eklenmez" ilkesine aykırıdır. Bulgu yazılı kalır: yalnız bir malzeme kartının Ana tedarikçisi
  olan tedarikçi kalıcı silinebilir ve bağ sessizce kopar. 0140 malzeme tedarikçisini merkeze
  alacağı için düzeltme oraya aittir.
- **X9.** Ölü tablonun kimlik aralığı korunmaz — *neden:* bölüm okunmadığı için kimlik
  sayacının yedek hesabından çıkar (R24). Sonuç yazılı: sürüm geri alınırsa ölü tablonun
  kimlikleriyle çakışma olabilir; risk yalnız kimlik sayacı meta kaydı olmayan yolda doğar.

---

## Context

### Ölçüm (2026-11-09, müşterinin canlı veritabanı)

| Ölçüm | Sonuç |
|---|---|
| Canlı parça | 381 |
| Maliyet kalemi olan parça | **0** |
| Katalog bağlı işlem kalemi | **0** |
| Serbest işlem kalemi | **0** |
| Malzeme kalemi | **0** |
| Canlı dış işlem kaydı | 25 |
| Çöpteki dış işlem kaydı | 0 |
| Malzeme kartı | 8 (hiçbiri bir parçaya bağlı değil) |
| Tedarikçi | 45 (31'i hammadde işaretli) |
| Üretim partisi | 3 |

Sonuç: kaldırma hiçbir parçanın maliyetini değiştirmez, göç edilecek veri yoktur ve hiçbir
kullanıcının gördüğü rakam kaymaz. R15'in göçü bu yüzden bir veri taşıma işi değil, sürüm
penceresi sigortasıdır.

### Kod yayılımı

Dış işlem adı kaynakta **54** dosyada geçiyor (ölçüm A; spec yazılırken 53'tü, örnek katalog
düğmesi sonradan eklendi): 14'ü test, 2'si betik, kalanı prop zinciri ve bölüm eşlemeleri. Kendine ait iki saf modül (`disIslem.js`, `disIslemEtkisi.js`) ve iki ekran
dosyası (`DisIslemManager.jsx`, `DisIslemFiyatPenceresi.jsx`) var. Prop zinciri uzun, çünkü
dış işlem kataloğu maliyetin tek okuma yolunun beşinci parametresi olarak altı ekrana ve ayrı
pano penceresine kadar iniyor.

### Emsal: standart genel giderlerin kaldırılması (0082)

Aynı sınıfta bir iş daha önce yapıldı. Oradan gelen üç ders bu spec'e yazıldı:

1. **Yalnız okuma yolunu kaldırmak yetmez.** 0082'de yazma yolu da kaldırıldı, çünkü yalnız
   okuma kalkarsa güncellenmemiş bir istemci tabloyu boşaltıyordu (R7, C6).
2. **Tablo ölü tablo olarak durur**, satırlar silinmez (R17, X6).
3. **Tarama kimlik bazlı olmalı**, düz sözcük aramasıyla değil; gerekçeli istisna listesi tam
   yollu yazılır ve eskiyince test kırılır (C3).

### Neden katalog kullanılmadı

0137'nin kendi kapsam dışı maddesi, 53 satırlık gider kırılımını parça kalemlerine çeviren
otomatik bir dönüştürücüyü yasaklıyordu: hangi fason bedelinin hangi parçaya gittiği veride
yok, bu yüzden eşleme elle yapılacaktı. 381 parça ve 25 işlem için bu elle eşleme hiç
yapılmadı. Katalogun değer verdiği şey (fiyatı tek yerden güncellemek) ancak eşleme bittikten
sonra değer üretiyordu.

### Bilinen tuzaklar

- **Çeşit alanı geçici bir form alanıdır**, kayda yazılmaz. Kaldırılırken kayıt gövdesinin
  değişmediğinin kıyasla gösterilmesi gerekir (C1).
- **Parça maliyetinin imzası konumlu parametre alır.** Beşinci parametre kalkarken bütün
  çağıranların aynı işte güncellenmesi zorunlu; bir çağıran atlanırsa sessizce `undefined`
  geçer ve katalog kalemli parça (varsa) "girilmedi" döner.
- **Döngüsel içe aktarma var.** Malzeme motoru ile fiyat motoru birbirini çağrı anında okuyor;
  dış işlem motorunu bu zincirden çıkarırken modül düzeyinde okunan bir ad bırakılmamalı,
  yoksa yükleme sırasına göre sessizce tanımsız kalır (0137'de bir kez oldu).
- **`paraBirimi` kayıtlarda boş.** 25 kaydın hepsi TL; boş değer kayda yazılmıyor. Göç
  tutarı hesaplarken bunu TL saymalı.
- **Kalan bir katalog kalemi "girilmedi" demez, sessizce düşürür.** Kaldırmadan SONRAKİ
  davranış, yukarıdaki tuzağın tersidir: katalog yolu kodda kalmadığı için `islemId` taşıyan
  kalem boş tutarlı serbest kalem gibi okunur, satır `cozuldu: true` sayılır ve toplam öteki
  kalemlerden hesaplanır (ölçüm C). Malzeme kalemi de olan parçada maliyet sessizce düşer.
  R2/2 bu yüzden tek satırlık bir savunma bırakıyor.
- **Göç istemci PC'de hiç çalışmaz.** Üç açılış dalı da yerel veritabanına bağlı (ölçüm B), yani
  istemci sunucu PC'den önce güncellenirse göç o pencerede hiçbir şey düzeltmez. Sürüm notu
  sırayı söyler ama sırayı garanti etmez.
- **Serbest kalem adsız kaydedilemez.** Göç ya da form yolu adı boş bir işlem kalemi yazarsa
  parçanın kaydı engellenir (ölçüm N); kullanıcı o parçayı hiç kaydedemez. R15/3'ün yer
  tutucusu bunu kapatıyor.
- **İki ibare aynı `data-testid`'yi taşıyor.** Parça kartının geçmiş ibaresi iki koşulda iki
  ayrı sabitle çiziliyor ve ikisinin de kimliği `kalem-gecmis-ibaresi`; yanlış olanın
  bırakılması testten geçer (R12/2).

### QA turunda ölçülenler (2026-11-09)

Aşağıdaki on sekiz ölçümün hepsi HEAD'de doğrulandı ve bu turun kararlarının dayanağıdır.

- **Ölçüm A.** Dış işlem adı kaynakta 54 dosyada geçiyor (14 test, 2 betik).
- **Ölçüm B.** Göç deseni üç açılış dalında da yerel veritabanına bağlı (mevcut veritabanı,
  temiz kurulum, JSON göçü); istemci kipinde hiçbiri çalışmaz.
- **Ölçüm C.** Kalem özetinin serbest dalı, tutarı boş kalemi `cozuldu: true` yapıyor ve toplamı
  katkısı olan satırlardan hesaplıyor; yani tek bir kalemin düşmesi toplamı null yapmaz.
- **Ölçüm D.** Malzeme fiyat güncelleme penceresinde "karma" geçen hiçbir metin yok; 0137'nin o
  pencereye tek dokunuşu etki hesabına dış işlem kataloğunu geçirmekti.
- **Ölçüm E.** Tedarikçi silmenin dört kapısı malzeme kartlarını **hiç** okumuyor; harita yalnız
  parçaların kalem tedarikçilerinden ve dış işlem kayıtlarının tedarikçisinden kuruluyor.
- **Ölçüm F.** Yedek gövdesi beş yerde dış işlem taşıyor: iki gövde kurucusu (elle ve otomatik),
  geri yükleme dalı, kısmi geri yüklemenin bölüm listesi ve paket listesi.
- **Ölçüm G.** Beşinci parametreyi beş fonksiyon alıyor; dış işlem kataloğu ayrıca on bir imza
  ya da seçenekte geçiyor ve `setOzeti`'nin fiyat okuyucusu 0137 ile altıncı konuma kaymış.
- **Ölçüm H.** Paket yalnız derlenmiş arayüzü ve `electron/` klasörünü içeriyor; kaynak klasörü
  pakete girmiyor, iki saf göç modülü bu yüzden `electron/` altında duruyor.
- **Ölçüm I.** Sunucunun bölüm karşılaştırması yalnız bölüm listesi üzerinden geziyor; listede
  olmayan bir gövde anahtarı kendiliğinden yok sayılıyor, yani R7 yeni kural gerektirmiyor.
- **Ölçüm J.** İki ağırlık yardımcısının tek üretim tüketicisi katalog kaleminin kilo tabanı;
  başka çağıranı yok.
- **Ölçüm K.** App dokuz yere ve ayrı pano penceresinin anlık görüntüsüne veriyor; altı ekran
  fiyat bağlamını kendisi kuruyor; Ayarlar yedi alt bileşene dağıtıyor.
- **Ölçüm L.** Sipariş ihtiyacı motorunda dış işlem hiç geçmiyor; o dosya bu işten etkilenmiyor.
- **Ölçüm M.** Bekçi fikstürü zinciri dokuz test dosyasında kullanılıyor; kırılacak dört sayı
  iddiası ve altı desen iddiası var.
- **Ölçüm N.** Serbest işlem kalemi adsız doğrulamadan geçmiyor; kayıttan forma çeviren yardımcı
  katalog kalemini boş adla serbest forma çeviriyor.
- **Ölçüm O.** Katalog kaleminin satır tutarı kuruş, serbest kalemin tutar alanı TL ve
  doğrulayıcı onu iki ondalığa yuvarlıyor.
- **Ölçüm P.** Emsal göçün veritabanı yedeği yalnız taşınacak kayıt varken alınıyor.
- **Ölçüm R.** İşlem geçmişinde `dis_islem` etiketi var; o anahtarı yazan tek yer dış işlem
  paneli (örnek veri düğmesi dahil).
- **Ölçüm S.** Genel aramanın kategori listesi dış işlemi içermiyor (X7 doğru); ekteki 25 kaydın
  ikisinin fiyatı hiç girilmemiş (R18 doğru).

### QA turunda verilen kararlar (2026-11-09)

Yirmi altı bulgunun hepsi onaylandı. Her karar hangi maddeye işlendiğini söyler.

1. **Bloklayıcı.** Kalan bir katalog kalemi sessizce düşük maliyet verir ve C3 savunmayı
   yasaklıyor: tek satırlık okuyucu kalır, kalem çözülemeyen sayılır, form yer tutucu adla
   açılır. → R2/2, C3/2, AC-37, AC-38, AC-39.
2. **Bloklayıcı.** Göç kilo tabanını hesaplayamaz (saf çekirdek kaynak klasörünü okumaz): kilo
   birimli kalem her zaman tutarsız çevrilir, yalnız adet hesaplanır. → R15/2, AC-25.
3. **Bloklayıcı.** Tedarikçi korumasının malzeme kolu kodda yok: R5 düzeltildi, AC-17 ve AC-18
   düzeltildi, bulgu kapsam dışına yazıldı. → R5, X8, AC-17, AC-18.
4. **Bloklayıcı.** Daralan imzalar sayılmamış ve set özetinin konumlu parametresi geri kayıyor:
   liste yazıldı, geri kayma karar oldu. → R11/2, AC-40.
5. **Bloklayıcı.** Bekçi fikstür zinciri ve dört sayı iddiası kapsamda değil: 0137 C11'in ikizi
   bir kısıt yazıldı. → C7, AC-41, AC-42.
6. **Önemli.** Kaldırılacak "karma" ibaresi kodda yok: R3 ve AC-5 düzeltildi. → R3, AC-5.
7. **Önemli.** Göçün çözülemeyen kaleminde ad kaynağı tanımsız: kaydı bulunamayan işlem için
   sabit yer tutucu. → R15/3, AC-43.
8. **Önemli.** Göçün tutar birimi belirsiz: kuruştan TL'ye çevrilir ve iki ondalığa yuvarlanır.
   → R15/4, AC-44.
9. **Önemli.** Yedek koşulsuz isteniyordu: emsalin koşuluna döndü. → R16/2, AC-28.
10. **Önemli.** İki ağırlık yardımcısı ölü kalıyordu: silinir ve taramaya girer. → R19, AC-45.
11. **Önemli.** Maliyet geçmişi kapısı ve iki ibare sayılmamış: kapı, seçenekler, üç çağıran ve
    kalan ibare yazıldı. → R12/2, AC-46.
12. **Önemli.** İşlem geçmişi etiketi kapsamda değil: etiket kalkar, eski kayıtlar ham anahtarla
    görünür. → R20, AC-47.
13. **Önemli.** Eski istemcinin yazımı ölü tabloyu boşaltabilir: yazma yolunun kalkması ölçülür.
    → R17/2, AC-32.
14. **Önemli.** Örnek katalog dosyasının hangi yarısı kaldığı yazılı değildi: adlarıyla yazıldı.
    → R9/2, AC-48.
15. **Önemli.** Yedek gövdesi iki yerde kuruluyor: beş yer birden sayıldı. → R6/2, AC-30.
16. **Önemli.** Etkilenen alanlar listesi bir dosyayı yanlış, on dosyayı hiç söylüyordu: başlık
    düzeltildi. → Başlık, C1/2.
17. **Önemli.** Prop zinciri ve ayrı pano penceresi yazılı değildi: sayı ve dosya adıyla yazıldı.
    → R21, AC-49.
18. **Önemli.** Göçün hangi açılış dallarında çağrılacağı yazılı değildi: üç dal ve bayrak kuralı
    yazıldı. → R16/2, AC-34.
19. **Küçük.** Ek'in "dosyadan silinir" cümlesi R17 ile çelişiyordu: düzeltildi. → R18.
20. **Küçük.** Kimlik sayacının yedek hesabı ve geri dönüş yolu: listeden çıkar, sınır yazıldı.
    → R24, X9.
21. **Küçük.** Belirsiz sayı kuralının yeri geri alınmamalı: karar yazıldı. → R25, AC-50.
22. **Küçük.** Kıyasın iki yarısı boş geçiyordu: kapsam kuralı yazıldı. → C1/2.
23. **Küçük.** Kararlı boş liste referansı: satır içi varsayılan yazılmaz. → R11/3.
24. **Küçük.** Çöp ve tedarikçi metinleri ile dönüş şekli: adıyla yazıldı. → R22, AC-20, AC-51.
25. **Küçük.** Katalog yardımcılarının akıbeti: beşinin hangisi kalıyor yazıldı. → R11/4.
26. **Küçük.** Boş durum metni yazılı değildi: 0135'in metni aynen geri yazılır. → R23, AC-4.

### QA turu karar kaydı (2026-11-09)

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Kalan katalog kalemi sessizce düşük maliyet verir | Bloklayıcı | Savunma kalır, kalem çözülemeyen sayılır | R2/2, C3/2, AC-37–AC-39 |
| 2 | Göç kilo tabanını hesaplayamaz | Bloklayıcı | Kilo her zaman tutarsız çevrilir | R15/2, AC-25 |
| 3 | Tedarikçi korumasının malzeme kolu kodda yok | Bloklayıcı | İddia düzeltildi, bulgu kapsam dışına | R5, X8, AC-17, AC-18 |
| 4 | Daralan imzalar sayılmamış | Bloklayıcı | Liste yazıldı, set özeti geri kayar | R11/2, AC-40 |
| 5 | Bekçi zinciri ve sayı iddiaları | Bloklayıcı | 0137 C11'in ikizi kısıt | C7, AC-41, AC-42 |
| 6 | Kaldırılacak karma ibaresi yok | Önemli | R3 ve AC-5 düzeltildi | R3, AC-5 |
| 7 | Göçte ad kaynağı tanımsız | Önemli | Sabit yer tutucu ad | R15/3, AC-43 |
| 8 | Göçün tutar birimi belirsiz | Önemli | Kuruştan TL'ye, iki ondalık | R15/4, AC-44 |
| 9 | Yedek koşulsuz isteniyordu | Önemli | Emsalin koşuluna döndü | R16/2, AC-28 |
| 10 | İki ağırlık yardımcısı ölü kalıyor | Önemli | Silinir, taramaya girer | R19, AC-45 |
| 11 | Geçmiş kapısı ve iki ibare | Önemli | Kapı, seçenek ve ibare yazıldı | R12/2, AC-46 |
| 12 | İşlem geçmişi etiketi | Önemli | Etiket kalkar, eski kayıt ham anahtar | R20, AC-47 |
| 13 | Eski istemci ölü tabloyu boşaltabilir | Önemli | Yazma yolunun kalkması ölçülür | R17/2, AC-32 |
| 14 | Örnek katalog dosyasının yarısı | Önemli | Kalan yarı adıyla yazıldı | R9/2, AC-48 |
| 15 | Yedek gövdesi iki yerde | Önemli | Beş yer birden | R6/2, AC-30 |
| 16 | Etkilenen alanlar listesi yanlış | Önemli | Başlık düzeltildi | Başlık, C1/2 |
| 17 | Prop zinciri yazılı değil | Önemli | Sayı ve dosya adıyla | R21, AC-49 |
| 18 | Göçün açılış dalları | Önemli | Üç dal, bayrak her hâlde | R16/2, AC-34 |
| 19 | Ek'in cümlesi R17 ile çelişiyor | Küçük | Düzeltildi | R18 |
| 20 | Kimlik sayacı ve geri dönüş | Küçük | Listeden çıkar, sınır yazıldı | R24, X9 |
| 21 | Belirsiz sayı kuralının yeri | Küçük | Geri alınmaz | R25, AC-50 |
| 22 | Kıyasın iki yarısı boş geçiyor | Küçük | Kapsam kuralı | C1/2 |
| 23 | Kararlı boş liste referansı | Küçük | Satır içi varsayılan yazılmaz | R11/3 |
| 24 | Çöp ve tedarikçi metinleri | Küçük | Adıyla yazıldı | R22, AC-20, AC-51 |
| 25 | Katalog yardımcılarının akıbeti | Küçük | Beşinin akıbeti yazıldı | R11/4 |
| 26 | Boş durum metni | Küçük | 0135'in metni aynen | R23, AC-4 |

---

## Acceptance Criteria

### Panel ve ekran

- **AC-1.** Ayarlar › Katalog listesinde "Dış İşlemler" öğesi yoktur.
- **AC-2.** Parça kartında işlem kalemi eklenince çeşit seçicisi çizilmez; doğrudan ad, tutar
  ve tedarikçi alanları gelir.
- **AC-3.** Parça kartında katalog araması, salt okunur birim ve birim fiyatı alanları ve kilo
  miktarı alanı çizilmez.
- **AC-4.** Kalem listesinin boş durumu tek çeşidi anlatır; "Katalogdan" sözü geçmez ve metin
  0135'in metninin **birebir** aynısıdır (R23).
- **AC-5.** Malzeme fiyat güncelleme penceresinin etki önizlemesi spec öncesi altınla birebir
  aynıdır ve pencere dış işlem kataloğu almaz; penceredeki kaldırılacak bir ibare yoktu (R3).
- **AC-6.** Çöp kutusunda dış işlem türünde satır çizilmez; çöpte dış işlem kaydı olan
  veritabanında da çizilmez.

### Serbest işlem kalemi korunur

- **AC-7.** Adı girilmiş, tutarı girilmiş serbest işlem kalemi parçanın maliyetine girer.
- **AC-8.** Adı girilmiş, tutarı boş serbest işlem kalemi maliyete girmez ve kartta uyarısı
  görünür.
- **AC-9.** Adı boş bırakılan işlem kalemi kaydı engeller ve nedeni satırın altında görünür.
- **AC-10.** Serbest işlem kaleminin tedarikçisi isteğe bağlıdır; boş bırakılan kalem kaydedilir.
- **AC-11.** Yalnız serbest işlem kalemi olan parçada **parçanın kendi maliyet geçmişi**
  çalışır: geçerlilik tarihi alanı ve geçmiş listesi kartta çizilir.
- **AC-12.** En az bir malzeme kalemi olan parçada geçerlilik tarihi ve geçmiş listesi
  çizilmez (bugünkü kural).

### Kıyas: hiçbir rakam kaymaz

- **AC-13.** Katalog bağlı kalem taşımayan veride parça maliyetleri, satış fiyatları, model
  maliyetleri, parti hesabı ve sipariş ihtiyacı çıktısı spec öncesi altınla **birebir** aynıdır.
- **AC-14.** Parça Excel dışa aktarması spec öncesi altınla birebir aynıdır.
- **AC-15.** Parçanın kaydedilen gövdesi, maliyet bölümüne dokunulmayan bir düzenlemede spec
  öncesi altınla birebir aynıdır.
- **AC-16.** Aylık rapor ve Finans Özeti çıktısı spec öncesi altınla birebir aynıdır.

### Tedarikçi koruması

- **AC-17.** Hiçbir parça kaleminde geçmeyen tedarikçi kalıcı silinir.
- **AC-18.** Yalnız bir malzeme kartının Ana tedarikçisi olan tedarikçi **kalıcı silinebilir**
  ve bu bugünkü davranıştır: malzeme kartları hiçbir kapıda okunmuyor (ölçüm E) ve bu iş onu
  değiştirmez (X8).
- **AC-19.** Bir parçanın serbest işlem kaleminde geçen tedarikçi kalıcı silinmez ve nedeni
  satırda görünür.
- **AC-20.** Ret metni tek adreslidir; dış işlem kataloğundan söz etmez. Kullanım nesnesinin
  dönüşünde işlem alanları yoktur (R22).
- **AC-21.** Çöpü boşaltma ve otuz günlük temizlik aynı korumayı uygular.

### Göç

- **AC-22.** Katalog bağlı kalemi olmayan veritabanında göç hiçbir parçayı değiştirmez ve
  izini yazar.
- **AC-23.** Katalog bağlı, fiyatı girilmiş, adet birimli kalem taşıyan parçada göç o kalemi
  serbest kaleme çevirir; ad işlemin adı, tutar göç anındaki satır tutarı, tedarikçi işlemin
  tedarikçisidir.
- **AC-24.** İşlemi çöpte olan ya da fiyatı girilmemiş katalog bağlı kalem **tutarsız** serbest
  kaleme çevrilir: ad ve tedarikçi korunur, tutar boş kalır.
- **AC-25.** Kilo birimli katalog bağlı kalem **her zaman** tutarsız serbest kaleme çevrilir:
  ad ve tedarikçi korunur, tutar boş kalır, kilo tabanı hesaplanmaya çalışılmaz (R15/2).
- **AC-26.** Göç, parçanın kalem sırasını ve kalemin dışındaki alanlarını değiştirmez.
- **AC-27.** Göç ikinci açılışta yeniden çalışmaz.
- **AC-28.** Değişecek parça varsa göçten önce veritabanı yedeği alınır; değişecek parça yoksa
  yedek alınmaz (R16/2, emsalin kuralı).
- **AC-29.** İstemci kipinde (yerel veritabanı yok) göç çalışmaz.

### Yedek, sunucu, veri

- **AC-30.** Yedekleme ekranındaki "Tanımlar" paketinin kapsam cümlesinde dış işlem geçmez ve
  **hem elle hem otomatik** yedeğin gövdesinde dış işlem anahtarı yoktur (R6/2).
- **AC-31.** Dış işlem bölümü taşıyan eski bir yedek geri yüklenir, hata vermez ve o bölüm
  yazılmaz.
- **AC-32.** Güncellenmemiş bir istemcinin gövdesindeki dış işlem bölümü sunucuda yok sayılır:
  yazım 200 döner, bölüm yazılmaz, işlem geçmişine bölüm adı düşmez **ve aynı yazımdan sonra
  ölü tablonun satırları değişmemiştir** (uçtan uca ölçülür, R17/2).
- **AC-33.** Dış işlem tablosu veritabanında durur ve satırları silinmez.
- **AC-34.** Temiz kurulumda dış işlem bölümü hiç oluşmaz, uygulama hata vermez ve göç bayrağı
  yine yazılır (R16/2).

### Tarama

- **AC-35.** Kaynakta dış işlem motorunu, ekranlarını, bölümünü ve kalemin katalog alanını
  okuyan satır yoktur; gerekçeli istisna listesi tam yollu yazılır (göç modülü ve bu spec).
- **AC-36.** Maliyetin tek okuma yolunun imzası daralmıştır ve hiçbir çağıran beşinci
  parametre geçmez.

### QA turu kriterleri (2026-11-09)

**Eski biçimli kalemin savunması**

- **AC-37.** `islemId` taşıyan bir kalem ile bir malzeme kalemi birlikte duran parçanın
  maliyeti **"girilmedi"**dir; toplam öteki kalemlerden hesaplanıp sessizce düşmez.
- **AC-38.** Aynı parçanın kartında eski biçimli kalemin nedeni görünür ve tutar alanı
  doldurulabilir.
- **AC-39.** Eski biçimli kalem düzenleme formunda yer tutucu adla (`Dış işlem`) açılır; form
  adsız kalem yüzünden kaydı engellemez.

**İmza, bekçi ve tarama**

- **AC-40.** Set özetinin fiyat okuyucusu beşinci konumdadır ve iki çağıranı da o konumu
  kullanır.
- **AC-41.** Bekçi fikstürü kaynakta yoktur ve zincir dosyası onu içe almaz; "yeni bölüm,
  birleştirme anahtarı, izin ya da ayar alanı yok" bekçileri dokuz dosyada yeşildir.
- **AC-42.** Çöp kutusu tablo listesi yirmi üç, otuz günlük temizlik çağrısı yirmi yedi, bölüm
  listesi otuz üç, kimlikli bölüm sayısı yirmi dokuzdur.

**Göç**

- **AC-43.** Kaydı hiç bulunamayan işleme bağlı kalem tutarsız serbest kaleme çevrilir ve adı
  `Dış işlem` olur; parça kaydedilebilir kalır.
- **AC-44.** Göçün yazdığı tutar TL'dir ve iki ondalığa yuvarlanmıştır; kuruş değeri TL alanına
  yazılmaz.

**Ölü kod, ekran, prop ve iz**

- **AC-45.** İki ağırlık yardımcısı kaynakta yoktur ve hiçbir yerden çağrılmaz.
- **AC-46.** Maliyet geçmişi kapısı yalnız set ve malzemeye bakar; parça kartında yalnız
  malzeme ibaresi çizilir, katalog ibaresi hiçbir koşulda çizilmez.
- **AC-47.** İşlem geçmişi ekranında `dis_islem` etiketi yoktur ve etiket haritasının ters yön
  denetimi yeşildir.
- **AC-48.** Malzeme panelinde örnek veri düğmesi ve ipucusu aynen çalışır; dış işlem örnekleri
  kaynakta yoktur.
- **AC-49.** App'in kayıt gövdesi, kayıt bağımlılık dizisi, otomatik yedeği ve ayrı pano
  penceresinin anlık görüntüsü dış işlem taşımaz; dokuz ekran çağrısında ve Ayarlar'ın yedi alt
  bileşen çağrısında dış işlem prop'u yoktur.
- **AC-50.** Belirsiz sayı kuralı hâlâ tek yerdedir (`tutarGirdisi.js`) ve malzeme motoru onu
  yeniden dışa vermeyi sürdürür; tek yer taraması bu işin test dosyasındadır.
- **AC-51.** Çöp kutusu ve tedarikçi tarafının kalkan metin ve yardımcıları kaynakta yoktur;
  kullanım nesnesinin dönüş şekli 0135'teki hâlindedir.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kaldırma kaynak taramasıyla sabitlendi; istisna listesi tam yollu ve eskiyince kırılıyor.
- [ ] Kıyas altınları spec öncesi koddan üretildi ve birebir tutuyor.
- [ ] Göç saf çekirdekte yazıldı ve kendi testi var (Electron).
- [ ] Ölü tablo yerinde; okuma ve yazma yolu kalktı (`db-roundtrip` ve `db-clean-install` güncel).
- [ ] Sunucu tarafında yeni kural yok; eski istemcinin yazımı yok sayılıyor (e2e ile ölçüldü).
- [ ] **Salt kaldırma işi olduğu için yeni eylem izni eklenmedi**, açıkça yazıldı.
- [ ] Çöp kutusu geri alma ve temizleme simetrisi korundu (dış işlem satırı kalktı).
- [ ] Eski biçimli kalemin savunması yazıldı ve ölçüldü: maliyet sessizce düşmüyor (AC-37).
- [ ] Daralan imzaların tamamı R11/2'nin listesine göre güncellendi; set özetinin konumu
      geri alındı (AC-40).
- [ ] Bekçi fikstür zinciri ve dört sayı iddiası güncellendi (C7, AC-41, AC-42).
- [ ] İki ağırlık yardımcısı silindi ve taramaya girdi (AC-45).
- [ ] İşlem geçmişi etiketi kaldırıldı; eski kayıtların ham anahtarla görüneceği yazıldı (AC-47).
- [ ] Prop zinciri dokuz ekran, ayrı pano penceresi ve Ayarlar'ın yedi alt bileşeni için
      temizlendi (AC-49).
- [ ] Ölü tablonun satırlarının eski istemci yazımından sonra da yerinde kaldığı uçtan uca
      ölçüldü (AC-32).
- [ ] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı etkilenmedi.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (panel listesi, parça kartı, çöp kutusu,
      yedek ekranı; boş durumlar dâhil).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0137 bölümü kaldırma notuyla güncellendi, 0135 bölümünün X1 satırı düzeltildi.
- [ ] Sürüm notu yazıldı: önce sunucu PC, sonra istemciler.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin kararları (2026-11-09)

1. **Dış işlem kataloğu kalkar.** Müşteri istedi.
2. **İşlem kalemi satırı kalır.** Analistin önerisi kabul edildi: katalog kalkar, parça
   kartındaki serbest satır kalır.
3. **25 kayıt spec'in ekine yazılır.** Analistin önerisi kabul edildi.
4. **Göç yazılır (R15, R16).** Analistin önerisi kabul edildi (2026-11-09). Bugün taşınacak
   veri yok (ölçüm sıfır), ama bu sürüm yayınlanana kadar başka bir bilgisayarda katalog bağlı
   kalem eklenebilir. Sessiz maliyet düşmesi bu projede iki kez hata oldu; göçün bedeli küçük,
   deseni hazır. Reddedilen alternatif: göç yazmamak ve katalog bağlı kalemi okumada yok
   saymak, ki o parçanın maliyeti sessizce düşerdi.

QA turu (2026-11-09) bu kararı doğruladı ve iki yerden **daralttı**: göç yalnız yerel
veritabanı açılışında çalıştığı için istemci PC'de hiçbir şey düzeltmiyor, bu yüzden okuma
tarafına tek satırlık bir savunma eklendi (karar 1); ve göçün saf çekirdeği kaynak klasörünü
okuyamadığı için kilo birimli kalem her zaman tutarsız çevriliyor (karar 2). Tur ayrıca üç
iddianın kodla çeliştiğini ölçtü (R3'ün ibaresi, R5 ile AC-17 ve AC-18'in malzeme kolu,
etkilenen alanlar listesindeki sipariş motoru) ve bunları düzeltti.

---

### Plan turu kararları (Takım Yöneticisi, 2026-11-09)

Uygulama planının (`specs/0138-uygulama-plani.md` §3) on dört önerisinin hepsi kabul edildi.
Spec maddelerini değiştirenler:

27. **Savunma ayracının tek adı `eskiKatalogKalemi`** (B1). R11/4'ün "`katalogIslemMi` kalır"
    cümlesi bu kararla değişir: `katalogIslemMi` silinir, aynı işi `eskiKatalogKalemi` yapar;
    C3/2 istisnası bu tek adla yazılır.
28. **Eski biçimli kalemi olan parça her tarihte "girilmedi"dir** (B2). R12'nin kapısı
    (`maliyetGecmisiYaz`: `set || malzeme`) değişmez; okuma tarafında `tekilMaliyetKurus` eski
    biçimli kalem gördüğünde tarihten bağımsız `null` döner. Gerekçe: yalnız eski kalemli parça
    bugün "girilmedi", geçmiş tarihte parçanın kendi geçmişinden eski bir rakam gösterirdi.
29. **Göç çöpteki parçaları da kapsar** (B3, R15). Göç bir kez çalışır; çöpten geri alınan parça
    göçsüz kalmasın.
30. **`CREATE TABLE dis_islemler` şemada kalır** (B4, 0082 emsali). AC-34'teki "dış işlem bölümü
    hiç oluşmaz" ifadesi blob bölümünü söyler, tabloyu değil.
31. **Miktarı elle girilmiş kilo kalemi de tutarsız çevrilir** (B5, R15/2 aynen).
32. **Göçün adet kuralı 0137'nin kaydedilmiş miktar kuralıdır** (B6): adet 1..1000 tam sayı
    değilse kalem tutarsız çevrilir; tutar 0137 motorunun göç anında göstereceği satır tutarıdır
    ve altınla sabitlenir.
33. **AC-29 yapı ölçümüyle kanıtlanır** (B7): göçün çağrıldığı yerlerin kaynak taraması ve yerel
    veritabanı yokken yazım olmadığı.
34. Öteki kabul edilenler (B8–B14) yalnız uygulama yöntemidir: kıyasın kapsam yorumu ve dolu
    veri, eski yedek anahtarının açıkça anılmaması, 0137 testlerinin geçerli iddialarının
    taşınması, döngü taraması, `setOzeti` imza taraması, kanıt onay satırı, `specs/README.md`'ye
    dokunulmaması.

---

## Ek: kaldırılan 25 dış işlem kaydı (2026-11-09)

Aşağıdaki tablo müşterinin canlı veritabanından alınmıştır. Dosyadan silinir, kayıttan
silinmez. İki işlemin fiyatı hiç girilmemişti.

| İşlem | Birim | Birim fiyatı | Para | Tedarikçi |
|---|---|---|---|---|
| Ayna mahruti dişli takımı (AK100/AK120) | adet | 2.465,00 | TL | NOKAY MAKİNA TEKSTİL SANAYİ VE TİCARET LİMİTED ŞİRKETİ (AYNA MAHRUTİ) |
| Ayna mahruti dişli takımı (AK140/SWP) | adet | 2.805,00 | TL | NOKAY MAKİNA TEKSTİL SANAYİ VE TİCARET LİMİTED ŞİRKETİ (AYNA MAHRUTİ) |
| Ayna mahruti ısıl işlem (AK100/AK120) | adet | 35,00 | TL | MARMARA ISIL İŞLEM |
| Ayna mahruti ısıl işlem (AK140/SWP) | adet | 195,00 | TL | MARMARA ISIL İŞLEM |
| Eloksal ve toz boya, yan sıyırıcı (AK100) | adet | 11,00 | TL | ASEL GMO ELOKSAL STATİK TOZ BOYA ALÜMİNYUM SANAYİ VE TİC.LTD.ŞTİ. |
| Eloksal ve toz boya, yan sıyırıcı (AK120) | adet | 35,00 | TL | ASEL GMO ELOKSAL STATİK TOZ BOYA ALÜMİNYUM SANAYİ VE TİC.LTD.ŞTİ. |
| Eloksal ve toz boya, yan sıyırıcı (AK140/SWP) | adet | 200,00 | TL | ASEL GMO ELOKSAL STATİK TOZ BOYA ALÜMİNYUM SANAYİ VE TİC.LTD.ŞTİ. |
| Eloksal ve toz boya, üst tabla (AK100) | adet | 1.750,00 | TL | ASEL GMO ELOKSAL STATİK TOZ BOYA ALÜMİNYUM SANAYİ VE TİC.LTD.ŞTİ. |
| Eloksal ve toz boya, üst tabla (AK120) | adet | 1.850,00 | TL | ASEL GMO ELOKSAL STATİK TOZ BOYA ALÜMİNYUM SANAYİ VE TİC.LTD.ŞTİ. |
| Eloksal ve toz boya, üst tabla (AK140/SWP) | adet | 2.800,00 | TL | ASEL GMO ELOKSAL STATİK TOZ BOYA ALÜMİNYUM SANAYİ VE TİC.LTD.ŞTİ. |
| Etiket baskı | adet | 50,00 | TL | RECEP ÇAYIRLI (ETİKETÇİ) |
| Fason torna, paslanmaz kazan (AK100/AK120) | adet | 335,00 | TL | TÜFEKÇİ KARDEŞLER TORNA (ŞABAN USTA) |
| Fason torna, paslanmaz kazan (AK140) | adet | 500,00 | TL | TÜFEKÇİ KARDEŞLER TORNA (ŞABAN USTA) |
| Galvano kalaylama | adet | 20,00 | TL | ÜÇLER GALVANO |
| Helis dişli açımı (AK100/AK120) | adet | 187,50 | TL | İSTANBUL DİŞLİ (HELİS DİŞLİ AÇIMI) |
| Helis dişli açımı (AK140/SWP) | adet | 200,00 | TL | İSTANBUL DİŞLİ (HELİS DİŞLİ AÇIMI) |
| Isıl işlem | kilo | girilmedi | TL | MAHİR ISIL İŞLEM |
| Kama yeri açma (AK100/AK120) | adet | 260,00 | TL | UMUT MAKİNA (KAMA YERİ AÇMA) |
| Kama yeri açma (AK140/SWP) | adet | 350,00 | TL | UMUT MAKİNA (KAMA YERİ AÇMA) |
| Pleksiglas kazan kapağı kesimi (Ø385) | adet | 1.360,00 | TL | DD PLEKSİ VE REKLAMCILIK PLEKSİGLAS İŞLEME İTH. İHR. SAN. TİC. LTD. ŞTİ. |
| Pleksiglas kazan kapağı kesimi (Ø431) | adet | 1.635,00 | TL | DD PLEKSİ VE REKLAMCILIK PLEKSİGLAS İŞLEME İTH. İHR. SAN. TİC. LTD. ŞTİ. |
| Pleksiglas kazan kapağı kesimi (Ø538) | adet | 3.060,00 | TL | DD PLEKSİ VE REKLAMCILIK PLEKSİGLAS İŞLEME İTH. İHR. SAN. TİC. LTD. ŞTİ. |
| Sac lazer kesim (malzeme dahil) | adet | 5.305,00 | TL | AYŞE AYDIN KARADENİZ LAZER KESİM |
| Soğutma grubu montaj işçiliği | adet | 3.000,00 | TL | DOLAPÇI FİKRET (SOĞUTMA GRUPU MONTAJ) |
| Tel erezyon delik delme | adet | girilmedi | TL | AKSU CNC TEÇ OTO (TEL EREZYON DELİK DELME) |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
