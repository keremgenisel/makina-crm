# 0087 — Parça maliyeti ve ürün ağacı adetleri

| | |
|---|---|
| **Durum** | Tamamlandı (commit `332f2a6`) |
| **Sahip** | Analist (spec) · Geliştirici (uygulama) |
| **Etkilenen alanlar** | Ayarlar › Katalog › Parça/Yedek Parça (`PartManager`), Ayarlar › Katalog › Makina Modelleri (`ModelsManager`), parça ve model tanımlarının veritabanı alanları, parça dışa/içe aktarması, `ui.jsx` (kuruşlu tutar alanının taşınması), katalog panellerinin kilidi, görüntü aracı ve görsel kanıt |
| **Onaylayan** | Takım Yöneticisi |
| **Bağımlı spec'ler** | 0088 (maliyet hesabı ekranı; bu spec onun girdisidir), 0002 (R3: maliyetin parça alışını içermediği sınır), 0065 (makina kiti ile stok hareketi ilişkisi), 0064 (katalog panellerinin kilidi, R25 "bir kayıt bir kilit"), 0076 (R14: uygulamanın gider tutarı matrahtır), 0045 (kuruşlu tutar girdisi `tutarGirdisi.js`), 0059 (paylaşılan yardımcının kitaplığa taşınması emsali), 0077 (X7: standart modeller birleşmez), 0023 (R10: ad tuzağı dersi), 0078 (çöp kutusu okuma anında çözüm), 0001 (Ayarlar zinciri izin istisnası) |
| **Taban** | `4110a6a` (v3.46.0, main) |
| **Revizyon** | · 1 · 2026-10-16 ilk taslak · 2 · 2026-10-16 QA turu: 25 bulgu işlendi (KDV tabanı, işaret ile adedin ayrı kavram olması, kuruşlu alanın bileşeni, ad taşıma zincirinin bugünkü eksiği, iki yeni bilinen sınır) · 3 · 2026-10-16 uygulama planı onayı: AC-3'ün taraması gider klasörü dışındaki sekiz içe aktarmayı `ui`'ya çevirir, kanca üç panelde paylaşılıyor, `add`/`saveEdit` kimlik döner, kancaya `hazirla`, `tutarMetni` `tutarGirdisi.js`'e (Karar tablosu R3 altında) |

---

## Intent

Fabrika bir makinanın maliyetini bugün Excel'de hesaplıyor. O hesabın en alt katmanı iki bilgi:
her parçanın **bize kaça geldiği** ve o parçanın **hangi modelde kaç adet kullanıldığı**. İkinci
bilgi uygulamada zaten var (makina kiti, adetleriyle), birincisi hiç yok: katalogtaki üç fiyat alanı
**satış** fiyatıdır, teklifte ve yedek parça satışında kullanılır.

Bunun iki sonucu var. Makina maliyeti ekranı bugün "stoktan çekilen parçaların maliyeti hariç"
notunu basmak zorunda, yani uygulamanın verdiği maliyet rakamı eksik ve kullanıcı bu yüzden Excel'e
dönüyor. İkincisi, adet bilgisi bugün yalnız **model kartından** girilebiliyor; kullanıcı parçaya
bakarken "bu parça hangi makinalarda, kaçar tane" sorusunu aynı yerde cevaplamak istiyor.

Başarı şu: her parçanın TL alış maliyeti katalogta yazılı, maliyeti girilmemiş parçalar ekranda
sayılıyor (hesap eksik girdiyle sessizce küçük çıkmasın), parça kartından modele adet girilebiliyor
ve bu adet makina kitiyle **aynı veri**, iki ekran birbirinden ayrışamıyor. Ayrıca modelin
parça olmayan maliyet kalemleri (dışarıda yapılan işçilik ve hizmetler) yazılabiliyor, çünkü
Excel'deki 57 tedarik satırının yarısı malzeme değil işçilik.

---

## Requirements

- **R1.** Parça tanımı **tek bir alış maliyeti** alanı taşır, para birimi **TL**'dir
  (Takım Yöneticisi kararı 2026-10-16: döviz bazlı tedarikler elle TL'ye çevrilip girilir).
  Maliyet **KDV hariçtir (matrah)**; alanın etiketinde ve `Ipucu`'sunda bu yazar. Gerekçe: 0088
  bu rakamı gider kayıtlarının yanında kullanacak ve uygulamanın gider tutarı 0076 R14'ten beri
  matrahtır; KDV dahil girilen maliyet makina maliyetini şişirir ve iki kaynak toplanamaz hâle
  gelir. Alan KDV ayırma hesabı yapmaz, girilen rakam olduğu gibi matrahtır.
- **R2.** Maliyet alanı bugünkü satış fiyatı alanlarından ayrıdır. Teklif, proforma, servis
  formunun "Değişen Parçalar" fiyatı, yedek parça satışı, Extra Kalıp ve parça stoğu ekranlarının
  okuduğu fiyat değişmez; maliyet hiçbir satış yolunda fiyat olarak kullanılmaz.
- **R3.** Maliyet alanı kuruş hassasiyetlidir (Excel'de 7,50 · 30,50 · 145,60 gibi birim fiyatlar
  var; tam sayıya yuvarlanırsa 46 adetlik kit satırında sapma büyür). Bu yüzden alan **`TutarInput`**
  ile çizilir ve metin **`gider.tutarCoz`** ile çözülür; `ui.jsx` `MoneyInput` ve `utils.parseMoney`
  bu alanda kullanılmaz (ölçümü Context'te: `parseMoney("7.50")` sonucu 750'dir). `TutarInput`
  bugün `src/components/gider/GiderAlanlari.jsx`'tedir ve **`ui.jsx`'e taşınır**, `GiderAlanlari`
  onu aynı adla yeniden dışa verir (0059'un `hedefAdi` taşıma emsali); gider tarafının çağrıları
  değişmez. Revizyon 3 (ölçüldü): gider klasörünün dışında sekiz dosya (`GiderForm`, `CalisanManager`,
  `Kasa`, `SettingsGider`, `SettingsGiderTanimlari`, `cek/CekEklePenceresi`, `cek/CiroPenceresi`,
  `kasa/CalisanAvanslari`) alanı `GiderAlanlari`'ndan alıyor; bunların **yalnız içe aktarma satırı**
  `ui`'ya çevrilir, çağrılar değişmez. Yeniden dışa verme `gider/` klasörünün içi için durur. Saklanan
  sayıyı forma ham metin koyan `tutarMetni` de saf yardımcı olarak `src/lib/tutarGirdisi.js`'e taşınır,
  `GiderAlanlari` onu da yeniden dışa verir. Gerekçe: katalog panelinin bir gider bileşenini içe alması katman yönünü tersine
  çevirir. Satış fiyatı alanları `MoneyInput` ile tam sayı kalır (0045 X1).
- **R4.** Boş maliyet "**girilmedi**" demektir, sıfır demez. Liste ve kart ikisini ayırır; sıfır
  maliyet açıkça girilebilir (ücretsiz gelen parça). Ayrımın tek kaynağı `tutarCoz`'un `bos`
  bayrağıdır.
- **R5.** Parça kartındaki model satırı **iki bilgi** taşır: modelin **işareti** (bugünkü
  "kullanıldığı modeller", parçanın o modelle uyumlu olduğunu söyler) ve **isteğe bağlı adet**
  (o parçanın bir makinada kaç adet kullanıldığı). Adet girilirse makina kitine yazılır, boş
  bırakılırsa yalnız işaret kalır ve kitte satır doğmaz. Gerekçe: iki kavram bugün ayrıdır ve
  işaret kitin kapısıdır (Context'te ölçüldü); "işaretli ama kitte yok" normal bir durumdur ve
  Stok ekranının parça süzgeci buna dayanır. İkisini tek alana indirmek o ara durumu ve Stok
  süzgecinin anlamını yok eder.
- **R6.** Adetin **tek kaynağı** bugünkü makina kiti listesidir (`defaultParcalar`). Parça
  kartından girilen adet aynı listeye yazar; model kartından girilen adet parça kartında görünür;
  iki ekran aynı veriyi gösterir ve ayrışamaz. **0088'in hesabı adedi yalnız kitten okur**; parça
  işareti bir süzgeç işaretidir, hesap girdisi değildir (C8'in bilinen sınırı bu kuralla zararsız
  kalır).
- **R7.** Parça kartından bir modelin **işareti** kaldırılınca o modelin kitinden de düşer; bir
  modele **adet** girilince kite eklenir ya da var olan satırın adedi güncellenir; adet boşaltılınca
  kit satırı düşer, işaret kalır. İşaret ile kit satırları **aynı yazımda** birlikte güncellenir.
- **R8.** Ad taşıma zinciri iki yönde de tamamlanır:
  1. **Model yeniden adlandırılınca** modelin kiti (modelin kendi kaydında) bugün olduğu gibi
     taşınır **ve parçanın işareti de yeni ada taşınır**. Bu ikincisi bugün yapılmıyor (Context'te
     ölçüldü: `ModelsManager.cascadeRename` parçaya hiç dokunmuyor, `setParts` prop'u bile
     geçilmiyor), yani ad değiştirmek bugün R6'nın yasakladığı ayrışmayı üretiyor; bu spec onu
     düzeltir.
  2. **Parça yeniden adlandırılınca** kit satırının kopyaladığı `ad` alanı da taşınır (bugün
     taşınmıyor, model kartı eski adı basıyor).
  3. Model silinince bugünkü davranış korunur (R17).
- **R9.** Modelin **ek maliyet kalemleri** listesi olur: alan adı **`ekMaliyetler`**, satır
  `{ ad, tutar }`, tutar **o modelden üretilen her makina için** TL (KDV hariç, R1 ile aynı taban).
  Bunlar parça değildir (dışarıda yapılan büküm, taşlama, dişli açımı, kaplama, montaj işçiliği,
  kilo bazlı hammadde gibi), yalnız maliyet hesabında kullanılır, makina kitine ve stok düşümüne
  **girmez**.
- **R10.** Parça listesi maliyeti sütun olarak gösterir ve ekranda "maliyeti girilmemiş parça
  sayısı" yazar. Sayının kümesi **bütün canlı parçalardır**: arama ve sayfa onu değiştirmez,
  çöptekiler sayılmaz. Kite göre daraltılmış "eksik" uyarısı 0088'in hesabının yanında durur
  (B4 kararı).
- **R11.** Parça dışa aktarması maliyeti ayrı sütun olarak yazar; parça içe aktarması aynı sütunu
  okur ve mevcut kayıtta maliyeti korur (kullanıcının elinde 70 satırlık tedarik tablosu var, ilk
  dolum elle yapılmaz). Sütun **en sona** eklenir (bugünkü dokuz sütunun ardına, onuncu sütun),
  çünkü içe aktarma başlığı okumaz ve hücreleri **konuma** göre eşler; araya sütun eklenirse eski
  şablonla alınmış dosyalar sessizce kayar.
- **R12.** Maliyet ve ek maliyet kalemleri salt veri alanıdır: **yeni eylem izni açılmaz**, bugünkü
  katalog paneli kuralları (Ayarlar sekmesi ve panel kilidi) aynen geçerlidir.
- **R13.** Maliyetin görülmesi için gider yetkisi aranmaz. Parça alış fiyatı tedarik bilgisidir,
  kişi bazlı gider verisi değildir; katalog bugün kimlere açıksa onlara açık kalır.
- **R14.** Maliyetin doğrulaması tek saf fonksiyondadır (`parcaMaliyetDogrula`): boş serbest,
  negatif ve sayıya çevrilemeyen metin hatadır (`tutarCoz`'un `gecersiz` bayrağı). Fonksiyon
  parça formunda kayıt **öncesinde** çağrılır ve hata `HataMetni` ile alanın altında çizilir; aynı
  fonksiyon içe aktarma önizlemesinin satır hatalarını da üretir. Gerekçe: `useSimpleDefList`
  bugün yalnız boş ve çakışan ada bakıyor, fiyat alanlarının hiç doğrulaması yok.
- **R15.** İşaret ile kitin birlikte yazılması **tek yoldan** geçer: yeni saf modül
  `src/lib/urunAgaci.js` kararı verir (girdi parça, iki model dizisi ve satırlar; çıktı güncellenmiş
  parça ve iki model dizisi), ekranlar "hangi dizi" dalı yazmaz. Bunun için:
  1. `Settings` parça paneline standart ve özel model dizilerini **ve yazıcılarını** geçirir
     (bugün yalnız `allModels` okuması var), yoksa standart modelin kitine yazılamaz (AC-16).
  2. Paylaşılan kanca `useSimpleDefList`'in `saveEdit`'i `add` gibi **başarı değeri döner**;
     kit yazımı yalnız kayıt gerçekten yazıldıysa yapılır. Başarı değeri kaydın **kimliğidir**
     (`add` yeni kaydın, `saveEdit` düzenlenenin; ikisi de sıfırdan büyük, başarısızlıkta `false`),
     çünkü yeni parçanın kit satırı kimlik ister. Kanca üç panelde paylaşılıyor (`KalipManager`,
     `PartManager`, `CalisanManager`); diğer ikisi dönüşü yok sayar, davranışları değişmez. Kanca ayrıca isteğe bağlı **`hazirla(kayit)`** parametresi alır (varsayılan kaydı
     değiştirmeden geçirir): parça paneli bununla maliyetin ham metnini sayıya çevirir ve boşsa alanı
     siler (C4). Kit adetleri kancanın formunda tutulmaz, panelin kendi durumundadır.
  3. Kancanın kendisi kit yazmaz (iki ekran paylaşıyor); çağrı parça panelindedir.
- **R16.** İki katalog paneli artık karşı bölümü yazdığı için ikisi de kayıt anında karşı panelin
  kilidine **anlık** bakar ve başkası tutuyorsa yazmaz, nedeni `kilitRedMesaji` ile bildirilir
  (0084 R19'un anlık denetim emsali, tek saf yardımcı). Gerekçe: `models` ve `yedekparca` ayrı
  kilit alanlarıdır; iki panel aynı kaydı kilitsiz değiştirirse 0064 R25'in "bir kayıt, bir kilit"
  kuralı kalkar. İki paneli tek kilit alanında birleştirmek reddedildi: katalogda iki paneli
  karşılıklı kapatır.
- **R17.** Çöp etkileşimi bugünkü davranışla korunur ve kriterle sabitlenir: çöpe atılan parçanın
  kit satırı silinmez (geri alınabilirlik), seçici canlı parçalardan beslendiği için satır yeniden
  eklenemez; çöpteki modelin satırı parça kartında çizilmez ama işaret ve kit satırı durur, model
  geri alınınca ikisi birden döner. 0088'in hesabı canlı parçaları sayar ve çöpteki parçanın kit
  satırı "eksik" sayılır.
- **R18.** Görsel kanıt kümesi bu spec'le genişler: `PartManager.jsx` ve `ModelsManager.jsx`'in
  kanıt kayıtları bilinçli değişikliği taşır (`beklenen: "degisti"` ve `onay`), yeni ekranlar
  görüntü aracına eklenir (parça formu, maliyeti girilmemiş ibaresi, adetli kit ve ek kalem satırı);
  ayrıntısı Context'teki tabloda.

---

## Constraints

### Uyulması zorunlu

- **C1.** Yeni kalıcı alanlar **dört nokta kuralıyla** eklenir (`SCHEMA_SQL` +
  `applyColumnMigrations` + `INSERT` + `SELECT`) ve `db-roundtrip` ile `db-clean-install`
  testlerine girer. `parts` tablosu bugün `db.cjs:167`'de tanımlı, kolon göçleri `:1030`, `:1031`
  ve `:1077`, yazma `:830`, okuma `:1355`. Modeller `:317` ve `:318`, göçleri `:1032`–`:1039`,
  yazma `:854` ve `:860`, okuma `:1426` ve `:1434`.
- **C2.** Modeller **iki bölümdedir** (`standard_models` ve `custom_models`, `db.cjs:317`); ikisinin
  de kiti (`defaultParcalar`) var, ikisi de kapsamdadır. Standart modeller düzenlenebilir ama
  silinemez (bugünkü kural).
- **C3.** Makina kitinin bugünkü işi değişmez: Stok › Makina Stoğu'nda "Kiti Uygula" kit satırlarını
  forma doldurur ve kaydedilince parça stoğundan düşer (`MakinaStokTab.jsx:271` ve `:50-62`,
  `makina_uretimi` hareketleri). Kite parça olmayan satır yazılmaz (R9) ve bu kaynak taramasıyla
  sabitlenir.
- **C4.** Boş değer okumada gövdeye yazılmaz (0075 · 0076 · 0078 deseni): maliyeti girilmemiş
  parça ve ek kalemi olmayan model bugünkü kayıt gövdesini birebir korur, yoksa sunucunun
  bölüm karşılaştırması her kayıtta sahte değişiklik görür ve kısıtlı kullanıcı 403 alır. **İki
  okuma yolu farklı davranır ve ikisi de elle düzeltilir:**
  1. Parça okuması bugün `...p` yayıyor (`db.cjs:1355`), yani yeni sütun kendiliğinden gelir ve
     her parçaya `maliyet: null` yazar. Okuma `({ maliyet, ...p })` ile ayrıştırılır ve
     `...bosOlmayan({ maliyet })` ile koşullu yazılır (`db.cjs:1496` emsali).
  2. Model okuması alan alan yazılı ve bugünkü iki JSON listesini **her zaman** `[]` olarak
     yazıyor; `ekMaliyetler` bu deseni izlemez, boş liste gövdeye hiç yazılmaz.
  3. İçe aktarma da gövdeye yazar: boş hücreden `maliyet: ""` doğmaz (koşullu yayma).
- **C5.** `parts`, `standardModels` ve `customModels` bölümlerinin sunucu eşlemesi, izin grubu ve
  birleştirme kuralları **değişmez**; yeni sunucu istisnası açılmaz. İki bilinen sınır C7 ve
  C8'de yazılı. (`customModels`'in kimliği model adıdır, 0077.)
- **C6.** Para gösterimi uygulamanın bugünkü kuralına uyar (`fmtCur`, kuruşlu giriş alanı);
  bilinmeyen para birimi kavramı bu alanda **yoktur**, çünkü alan tanımı gereği TL'dir (R1).
  Saklama `REAL` sütundur (TL, ondalıklı; `giderler.tutar REAL` emsali) ve kuruşa çevirme hesabın
  tarafındadır (0088). Kuruş tamsayısı saklamak reddedildi: bu bölümün tek ondalıklı alanı için
  yeni bir birim kuralı açar.
- **C7. Bilinen sınır (sunucu izni).** R8/1'in düzeltmesi model panelini `parts` bölümünü yazar
  hâle getirir. Ölçüldü: `serverAuth.cjs:44` `parts` bölümü **`stockActions`** grubunda (sekme
  eşlemesi `:110` `["settings"]`), modeller `:53-54` `settings` grubunda ve `grupEngelli` (`:207`)
  `stockActions: []` olan kullanıcıyı `parts` yazımından tümden reddeder. Yani `stockActions`'ı
  boş bırakılmış ama Ayarlar'ı gören kullanıcı, işaretli bir parça varken model adını değiştirince
  403 alır. Bu sınıf **bugün de var**: `cascadeRename` `setStock`'u yazıyor, o modelde stok
  makinası varsa aynı kullanıcı bugün de 403 alıyor. Bu yüzden 0001'in `giderZincirDegisikligiMi`
  istisnasına benzer yeni bir sunucu kuralı açılmaz; sınır yazılı kalır. Daraltmak istenirse
  "katalog zinciri" istisnası ayrı iştir.
- **C8. Bilinen sınır (çakışma birleştirmesi).** Ölçüldü: `merge.js:42` `parts` ve `customModels`
  `MERGE_KEYS`'te, **`standardModels` bilinçli olarak yok** (0077 X7) ve birleştirme yalnız
  **eklemeleri** geri uygular, düzenlemeler sunucu kopyasına yenilir. Sonuç: yeni bir parça
  (ekleme, korunur) ile var olan modelin kiti (düzenleme, kaybolur) aynı çakışmada ayrışabilir;
  standart modelin kiti çakışmada hiç korunmaz. 0073 R24'ün emsali: tek yazma yolu yazımı garanti
  eder, birleştirmeyi etmez. R6'nın "hesap yalnız kitten okur" kuralı bu ayrışmayı zararsız kılar
  (yalnız seçicinin süzgeci daralır). `standardModels`'i birleştirmeye almak bu spec'in kapsamı
  dışındadır.
- **C9. Ad tuzağı.** `ekMaliyetler` gider tarafının `ekOdemeler`'iyle (0023, personel ek ödemeleri)
  hiçbir alanı, tabloyu ve hesabı paylaşmaz; iki kavram ayrıdır ve ayrı kalır (0023 R10'un "mesai"
  dersi). Kaynak taraması ek maliyet kaleminin gider alt yapısını kullanmadığını sabitler.

### KAPSAM DIŞI

- **X1.** Döviz cinsinden parça maliyeti ve kur çevrimi — *neden:* Takım Yöneticisi kararı
  (2026-10-16) maliyetin yalnız TL olması. Bilinen sınır yazılı: dolar bazlı tedarikin fiyatı
  değişince TL karşılığı elle güncellenir.
- **X2.** Tarihli maliyet (fiyat geçmişi, geçerlilik tarihi) — *neden:* katalog tek güncel maliyeti
  tutar; geçmişin dondurulması partinin kapanışına ait bir karardır ve 0088'de ele alınır.
- **X3.** Çap · boy · yoğunluk üzerinden kilo ve maliyet türetmek — *neden:* kullanıcının Excel'inde
  bu blok yarım kalmış (paslanmazın yoğunluğu boş, hücrelerde formül yok); kazancı maliyeti elle
  girmek yerine türetmekten fazlası değil. Sonradan parça kartında isteğe bağlı bir yardımcı hesap
  olarak açılabilir.
- **X4.** Yedek parça satışının kârı, parça stoğunun değeri ve bu rakamların raporlanması —
  *neden:* maliyet alanı bunları teknik olarak açar ama ikisi de ayrı ekran ve ayrı gizlilik
  kararı; bu spec yalnız veriyi kurar.
- **X5.** Bant ve kalıp kitleri (`defaultBantlar`) — *neden:* ölçüldü, bu alan bugün hiçbir ekranda
  okunmuyor (ölü alan): kaynakta yalnız `db.cjs`'in dört noktası geçiyor (şema `:317` ve `:318`,
  göç `:460`, yazma `:855` ve `:861`, okuma `:1431` ve `:1439`), hiçbir bileşen ve hiçbir test
  okumuyor. Maliyete girmesi gerekiyorsa ek maliyet kalemi olarak yazılır (R9).
- **X6.** Makina maliyetinin hesaplanması ve gösterilmesi — *neden:* 0088'in işi. Bu spec'in çıktısı
  yalnız girdi verisidir; bu yüzden `makinaMaliyeti.js:20` `MALZEME_HARIC_NOTU` bu spec'te
  **kaldırılmaz** (notu kaldırmak hesabın düzelmesine bağlıdır, AC-38).
- **X7.** Makina kitinin maliyetinin Stok ekranında gösterilmesi — *neden:* Stok ekranı adet
  ekranıdır; maliyet orada gösterilirse makina başına maliyet iki yerde iki kuralla doğar.

---

## Context

### Bugünkü parça tanımı (ölçüldü)

`parts` tablosunun sütunları (`db.cjs:167`): `id`, `ad`, `adEN`, `kod`, `tanim`, `tanimEN`,
`fiyatTRY`, `fiyatUSD`, `fiyatEUR`, `models`, `deletedAt`, `tip`, `resim`.

| Alan | Bugünkü anlamı | Okuyucular |
|---|---|---|
| `fiyatTRY` / `fiyatUSD` / `fiyatEUR` | **satış** fiyatı | teklif satırı (`Documents.jsx:700`), servis formunun "Değişen Parçalar" fiyatı (`ServiceForm.jsx:396`, `:491`), yedek parça satış formu (`YedekParcaSatisForm.jsx:52`, `:136`, `:174`), Parça Stoğu kartı (`PartStokTab.jsx:115`, `:173`), dışa aktarma (`SettingsExport.jsx:334`), içe aktarma (`SettingsImport.jsx:200`) |
| `models` | parçanın kullanıldığı **model adları** (JSON dizi, adet yok) | `PartManager.jsx:232` ve `:280` rozet seçici, `ModelsManager.jsx:207` kit seçicisinin süzgeci, `MakinaStokTab.jsx:33` kit önerisi süzgeci, `PartStokTab.jsx:49` arama |
| `tip` | kullanıcı tanımlı parça tipi (`partTypeDefs`) | liste rozeti |

Üç fiyatın tek okuma yolu `utils.partFiyatForCurrency` (`utils.js:560`; revizyon 1'de yanlışlıkla
`parcaFiyat` yazılmıştı, öyle bir fonksiyon yok).

**Alış maliyeti alanı yok.** Bu yüzden `makinaMaliyeti.js:20` sabit bir not basıyor:
`MALZEME_HARIC_NOTU = "Stoktan çekilen parçaların maliyeti hariç."` (0002 R3).

### Tutar girdisinin ölçümü (R3'ün gerekçesi)

| Yol | Girdi | Sonuç | Nerede |
|---|---|---|---|
| `utils.parseMoney` | `"7.50"` | **750** (noktayı binlik sayar) | `utils.js:423`–`:435`; parça listesinin fiyat özeti bunu kullanıyor (`PartManager.jsx:100`) |
| `gider.tutarCoz` | `"7.50"` | **7,5** (tek nokta ve 1–2 hane ondalık kabul edilir) | `gider.js:41` `noktaOndalikMi`, `:42` |
| `ui.jsx` `MoneyInput` | `"7,50"` | **750** (rakam dışını siler, `parseInt`) | `ui.jsx:348`–`:353` |
| `GiderAlanlari` `TutarInput` | `"7,50"` | ham `"7,50"`, imleç korunur | `GiderAlanlari.jsx:20`; 0045'in `tutarGirdisi.js`'i üstünde |

Yani bugünkü üç fiyat alanı **tam sayıdır** ve kuruş hassasiyeti bugünkü alt yapıyla sağlanamaz.
`tutarCoz` ayrıca boş ile sıfırı `bos` bayrağıyla ayırır, yani R4'ün tam karşılığıdır.

### İşaret ile kit arasındaki fark (R5'in gerekçesi)

- Model kartının kit seçicisi yalnız **işaretli** parçaları listeler:
  `parts.filter(p => p.models?.includes(mForm.model))` (`ModelsManager.jsx:207`). Yani kit her
  zaman işaretin alt kümesidir.
- "İşaretli ama kitte yok" normal bir durumdur: parça o modelle uyumludur ama varsayılan kite
  konmamıştır. Stok ekranı bunun üstüne kurulu: `modelParts` süzgeci (`MakinaStokTab.jsx:33`),
  `availableParts` ve "Tüm parçaları göster" kutusu (`:34`, `:282`–`:285`).
- Kit satırı `{ partId, ad, miktar }` (`ModelsManager.jsx:211`); adet alanı `type="number"`,
  `min="1"` ve boşaltılınca sessizce 1'e çekiliyor (`:218`–`:223`). Kit satırının `ad` kopyası
  parça yeniden adlandırılınca **taşınmıyor** (`PartManager.jsx:89`–`:93` `onRename` yalnız
  `services.degisenParcalar`'ı taşıyor), model kartı eski adı basıyor.
- Kitin bugünkü işi: Stok › Makina Stoğu'nda model seçilince "Kiti Uygula" ile forma dolar
  (`MakinaStokTab.jsx:271`), kaydedilince parça stoğundan düşer ve `makina_uretimi` hareketi yazar
  (`:50-62`); `deductParts` `partId`'si boş satırı süzer. Makinaya **gerçekte giren** parçalar
  ayrıca makina kaydında durur (`stock.parcalar`).
- Yani "hangi modelde kaç adet" sorusunun cevabı bugün **modelde** yazılı, parça kartında yalnız
  "kullanılır / kullanılmaz" işareti var. Kullanıcının istediği giriş noktası parça kartı, ama veri
  zaten mevcut; bu spec ikinci bir adet listesi açmaz, var olana ikinci bir giriş kapısı açar (R6).

### Ad taşıma zincirinin bugünkü hâli (R8'in gerekçesi)

`ModelsManager.cascadeRename` (`:49`–`:62`) şunları taşıyor: `customers.model`, `stock.model`,
`appSettings.analizGizliModeller`, `giderler` ve `giderTanimlari`'nın model satırları
(`gider.modelAdiTasi`). Kitin kendisi modelin kaydında olduğu için ad değişiminde birlikte taşınır.

**Parçanın işareti taşınmıyor:** `setParts` prop'u ModelsManager'a hiç geçilmiyor
(`Settings.jsx:245`–`:248` yalnız okuma için `parts` veriyor) ve kaynakta `parts[].models`'i
taşıyan tek satır yok. Bugünkü sonuç: ad değişince parça kit seçicisinden kaybolur, kit satırı
durur. Bu, R6'nın yasakladığı ayrışmanın bugün bir model adı değiştirerek üretilebildiği anlamına
gelir.

Model silme (`:153`) özel modeli çöpe atar ve `analizGizliModeller`'dan çıkarır; parçanın işaretine
dokunmaz (R17 bu davranışı korur).

### Yazma noktaları (R15'in gerekçesi)

- Parça kartı `useSimpleDefList` ile çalışıyor (`PartManager.jsx:79`): **ekleme** (`add`, `:107`)
  ve **düzenleme** (`saveEdit`) ayrı yollar, kanca üç panelde paylaşılıyor (`KalipManager`,
  `CalisanManager`; revizyon 3'te ölçüldü; `PartTypeManager` bilinçli olarak kullanmıyor).
- `add` başarı değeri döner (`useSimpleDefList.js:15`–`:24`), **`saveEdit` dönmez** (`:27`–`:42`);
  ad çakışmasında kayıt yazılmadan kit yazılırdı.
- Kanca yalnız `setItems`'ı yazar, yani kit yazımı kancaya konulamaz (iki ekran paylaşıyor).
- Parça paneli bugün yalnız `allModels={[...standardModels, ...customModels]}` alıyor
  (`Settings.jsx:267`): standart ile özel ayrımı ve yazıcılar yok, yani standart modelin kitine
  yazamaz.
- Doğrulama yok: `add` yalnız boş ve çakışan ada bakıyor (`useSimpleDefList.js:16`–`:18`), üç fiyat
  alanı hiç doğrulanmıyor (negatif maliyet bugünkü kodla sessizce kaydedilirdi).

### İçe ve dışa aktarmanın ölçümü (R11'in gerekçesi)

- Dışa aktarma dokuz sütun yazıyor (`SettingsExport.jsx:333`–`:334`).
- İçe aktarma **başlığı okumuyor**, hücreleri konuma göre eşliyor: `cell(0)`'dan `cell(8)`'e
  (`SettingsImport.jsx:179`–`:206`). Araya sütun eklenirse eski şablonla alınmış dosyalar sessizce
  kayar; bu yüzden maliyet sütunu sona eklenir.
- Uygulama kolu mevcut kaydı koruyor: `{ ...x, ...guncel }` (`:310`), yani `models`, `resim` ve
  `deletedAt` düşmüyor; AC-29 bu yolla sağlanır.
- Boş hücre deseni `cell(n) || (mevcut?.alan ?? "")`: var olan kaydın değerini korur ama **yeni**
  parçaya boş dize yazar; maliyet için bu C4'e aykırıdır, koşullu yazılır.

### İzin ve birleştirme ölçümü

| Bölüm | Grup (`SECTION_GROUP`) | Sekme (`BOLUM_SEKMELERI`) | Birleştirme |
|---|---|---|---|
| `parts` | `stockActions` (`serverAuth.cjs:44`) | `["settings"]` (`:110`) | `MERGE_KEYS` (0077) |
| `standardModels` | `settings` (`:53`) | `["settings"]` (`:125`) | **yok** (0077 X7) |
| `customModels` | `settings` (`:54`) | `["settings"]` (`:126`) | `MERGE_KEYS`, kimlik model adı |

`grupEngelli` (`:207`) eylem gruplarında boş diziyi "her şey engelli" sayar; `settings` grubunda
ise yalnız "server" dışında hiç alt sekme görünmüyorsa engeller. Sonuçları C7 ve C8'de.

### Kilit ölçümü (R16'nın gerekçesi)

`Settings.jsx` açık panelin kimliğiyle `useLock("ayar", id)` alıyor; `kilitAlanlari.js:46`'da
`models` ve `yedekparca` **ayrı** kilit alanları. Yani bugün iki panel aynı anda iki kullanıcıda
açık olabilir; parça kartı kite yazmaya başlayınca (ve model kartı parçaya yazınca) aynı kayıt iki
panelden kilitsiz değişir.

### Fikstür ölçümü (AC-30'un gerekçesi)

`db-roundtrip.cjs:226` fikstüründe `parts: []` ve model bölümleri **hiç yok**;
`db-clean-install.cjs` ikisine de dokunmuyor. Yani bugünkü testler yeni alanları kendiliğinden
kapsamaz, fikstüre maliyeti olan ve olmayan parça ile ek kalemli ve kalemsiz model eklenmesi
gerekir.

### Görsel kanıt (R18)

| Ekran | Bugünkü durumu | Bu spec'te |
|---|---|---|
| `ayarlar-yedekparca` | parça listesi (`0015-piksel-raporu.json`, kayıt `beklenen: "ayni"`, `kanit-eslemesi.json:5181`) | **değişti**: maliyet sütunu ve "maliyeti girilmemiş" ibaresi |
| `katalog-model` | model formu açık (`0015-taban-piksel-raporu.json`, kayıt `ayni`, `:5167`) | **değişti**: ek maliyet kalemi listesi |
| `ayarlar-models` | model listesi | **0 piksel**: liste sütunları değişmiyor |
| yeni `katalog-parca` | yok (parça formu hiçbir ekranda açılmıyor) | maliyetli ve maliyetsiz parça formu |
| yeni `ayarlar-yedekparca-maliyetsiz` | yok | ibarenin göründüğü liste |
| yeni `katalog-model-ekmaliyet` | yok | adetli kit ve ek kalem satırı, `ayarlar("models", o)` ile (0086'nın varyant ekranı emsali) |
| yeni `katalog-parca-yeni` | yok | maliyetsiz yeni parça formu (revizyon 3, plan S6; triyaj bulgu 4) |

Araç bugün `ayarlar()` çağrısına `parts={[{ id: 7, ad: "Rulman" }]}` veriyor (`0009-sayfa.jsx:262`),
yani modelsiz tek parça: `katalog-model`'in kit listesi boş çiziliyor. Yeni ekran kendi verisini
`o` ile geçirir. İki kanıt kaydı `beklenen: "degisti"` ve `onay` satırına çevrilir, spec `done`'a
taşınırken `ayni`ye döner (CLAUDE.md kuralı).

### Excel'in bu katmanda ne beklediği

`MASRAFLAR.xlsx` ("2017 1NCİ PARTİ") 15-71. satırlarda 57 tedarik kalemi tutuyor ve her kalemi
model model **birim** tutara bölüyor. Bu 57 kalemin yapısı:

| Tür | Örnek | Bu spec'teki karşılığı |
|---|---|---|
| Katalogta parça olabilecek kalem | redüktör, rulman takımı, konveyör bant, pleksi kapak, etiket, perçin | parça + maliyet + kit adedi (R1, R5) |
| Kilo bazlı hammadde | alüminyum malzeme (162 TL/kg), paslanmaz saç (99 TL/kg), derlin (128 TL/kg) | ek maliyet kalemi (R9); kilo hesabı X3 |
| Dışarıda yapılan işçilik ve hizmet | büküm işçiliği, helis dişli açımı, sulama, kaplama, profil taşlama, montaj işçiliği, gaz basma | ek maliyet kalemi (R9) |

Ek maliyet kalemlerinin **yedek parça kataloğuna** yazılmaması bilinçli: o katalog teklif satırı ve
yedek parça satışı seçicilerini besliyor, "büküm işçiliği" oraya girerse satış ekranlarına sızar.

### Bilinen tuzaklar

- **İki alanın ayrışması (R7, R8).** Parçanın model işareti (`parts.models`) ile modelin kiti
  (`defaultParcalar`) bugün birbirinden bağımsız yazılıyor: kullanıcı kitte parça kullandığı hâlde
  işareti kaldırabiliyor (kit satırı kalır, yalnız Stok'un öneri süzgeci daralır) ve bir model adı
  değişince işaret eski adda kalıyor. Adet kite yazılmaya başlayınca bu ayrışma maliyeti etkiler,
  bu yüzden iki alan **tek yazma yolundan** geçmeli ve ayrışmanın imkânsızlığı testle
  sabitlenmeli.
- **`useSimpleDefList`.** `PartManager` ekleme, satır içi düzenleme ve silmeyi bu paylaşılan
  kancadan alıyor (`PartManager.jsx:79`); kanca iki başka panelle ortak olduğu için kit yazımı
  kancaya konulamaz, `saveEdit`'in dönüş değeri de yok (R15).
- **Model adı kimliktir.** `customModels`'in birleştirme kimliği model adıdır (0077); kit ve parça
  işareti de ada bağlı. Yeniden adlandırma zinciri `ModelsManager.cascadeRename`'de.
- **Standart model listesi kullanıcıdan gelebilir.** `ALTUNMAK_MODELS` altı model taşıyor
  (`constants.js`); Excel'de `AK140_DSC` yerine bir sütun başlığında `AK140_DS`, `SWP140_DSC`
  yerine `SWP140_DS` yazılı ve uygulamada tanımlı `AK120_DSC` Excel'de hiç kullanılmamış. Yani ilk
  dolumda model listesinin kullanıcıyla birlikte gözden geçirilmesi gerekir; uygulamada liste tek
  kaynak olduğu için bu sapma kendiliğinden kapanır.
- **`src/types.d.ts:192`** Part tipinde `fiyatTRY` yazılı; yeni alanlar oraya da eklenir
  (TypeScript yok ama dosya bakımlı).

### Bulgular (öneri kuralı 5)

- **B1. Adet hangi tarafta saklanacak?** Kullanıcı adedi parça kartından girmek istiyor, bugün adet
  modelde (kit). *Önerim:* kaynak kitte kalır, parça kartı ikinci giriş kapısı olur (R6).
  *Gerekçe:* kit zaten stok düşümünün kaynağı ve adetli; adedi parçaya taşımak, stok düşümünün
  kaynağını değiştirmek demek (0065'in bütün hareket zinciri oraya bakıyor). *Maliyeti:*
  `PartManager`'ın model yazıcılarını alması, tek yazma yolu ve bir ayrışma testi.
  *Reddedilen seçenek:* adedi `parts` tarafında ikinci bir listede tutmak. İki liste bir hafta
  içinde ayrışır ve hangisinin doğru olduğu belirsizleşir.
- **B2. Ek maliyet kalemleri nerede durur?** *Önerim:* modelin kendi listesinde (R9).
  *Gerekçe:* kalemin tutarı modele özgü (aynı büküm işçiliği AK100'de 90 TL, AK140'ta 900 TL;
  Excel satır 19), yani parça kataloğunda tek bir tutarla duramaz. *Maliyeti:* iki model
  tablosunda bir JSON alan. *Reddedilen seçenek:* işçilikleri parça kataloğuna "İşçilik" tipiyle
  eklemek. Satış seçicilerini kirletir.
- **B3. İlk dolum nasıl yapılacak?** Kullanıcının elinde 57 satırlık tedarik tablosu ve dokuz model
  kolonu var. *Önerim:* dışa ve içe aktarmaya maliyet sütunu eklenir (R11) ve ilk dolum Excel'den
  yapılır. *Gerekçe:* 57 kalem × beş model elle girilirse hem uzun sürer hem yanlış girilir.
  *Maliyeti:* iki sütun, bir içe aktarma eşlemesi. Kit adetlerinin içe aktarması bu spec'te yok
  (model × parça matrisi ayrı bir dosya şekli olurdu); öneri: adetler ekrandan girilir, maliyetler
  içe aktarılır.
- **B4. Maliyeti girilmemiş parça.** Hesap bu parçayı sıfır sayarsa maliyet sessizce küçük çıkar.
  *Önerim:* katalogta sayı olarak gösterilir (R10) ve 0088'de hesabın yanında "eksik" işareti
  olur. *Gerekçe:* 0071'in "Tutar girilmedi" rozeti aynı sorunu gider tarafında böyle çözdü.
- **B5. Maliyetin KDV tabanı.** *Önerim:* KDV hariç matrah (R1). *Gerekçe:* 0076 R14 ile uygulamanın
  gider tutarı matrahtır ve 0088 iki kaynağı aynı tabanda toplar. *Reddedilen seçenek:* fatura
  genel toplamını girmek. Kullanıcıya kolay ama hesabı iki tabanlı yapar.

### Uygulama planı kararları (2026-10-16, revizyon 3, Takım Yöneticisi onayı)

| # | Konu | Karar |
|---|---|---|
| P1 | AC-3 ile bugünkü kod | Gider klasörü dışındaki sekiz dosyanın yalnız içe aktarma satırı `ui`'ya çevrilir; `tutarMetni` `tutarGirdisi.js`'e (R3) |
| P2 | Kancayı üç panel paylaşıyor | Dönüş değeri üçünde zararsız, AC-20 üçünü kapsar (R15/2) |
| P3 | Yeni parçanın kimliği | `add` yeni kaydın, `saveEdit` düzenlenenin kimliğini döner (R15/2) |
| P4 | Ham metin gövdeye yazılmasın | Kancaya `hazirla`; kit adetleri panelin kendi durumunda (R15/2, C4) |
| P5 | Kilit reddinin kapsamı | Denetim yalnız karşı bölüme yazılacaksa; reddedilirse kayıt bütünüyle yazılmaz (R16) |
| P6 | Çöpteki modelin işareti | Saf modül yalnız ekranda düzenlenen modellere dokunur, yazım tam dizide işlevsel güncelleyiciyle (R17) |
| P7 | İşaret kaldırınca kit adedi | Onay penceresi yok, satırda "kaydedince kitten de düşecek" ipucu (R7) |
| P8 | Model satırının biçimi | İşaret düğmeleri durur, altında işaretli canlı modeller için "Model · Adet" satırları (R5) |
| P9 | Görsel kanıtın kapsamı | Tam tur (parçalı); `ui.jsx` değiştiği için bütün ekranlar ölçülür, yalnız R18'deki ekranlar değişir (R18) |
| P10 | Gövde fikstürü | Taban koddan Electron betiğiyle `tests/fixtures/0087-govde-once.json` (DoD) |
| P11 | Ek kalemin saklanması | JSON `{ ad, tutar: sayı }`, formda ham metin; boş liste veritabanına `null`, gövdeye hiç (R9, C4) |

### QA turu kararları (2026-10-16, revizyon 2)

| # | Bulgu | Karar |
|---|---|---|
| B-1 | Maliyetin KDV tabanı yazılı değildi | KDV hariç matrah, etiketinde ve ipucunda yazar (R1, B5) |
| B-2 | R5 işaret ile adedi aynı kavram sayıyordu | Satır işaret artı isteğe bağlı adet (R5, R7); Stok süzgecinin ara durumu korunur |
| B-3 | Kuruş hassasiyeti bugünkü alanla sağlanamaz | `TutarInput` artı `tutarCoz`, `TutarInput` `ui.jsx`'e taşınır (R3) |
| B-4 | R8 "bugünkü zincir çalışır" diyordu, parça işareti taşınmıyor | Zincir bu spec'te düzeltilir, iki yönde (R8) |
| B-5 | Düzeltme model panelini `parts` yazar hâle getiriyor | Yeni sunucu istisnası açılmaz, bilinen sınır yazılır (C7) |
| Ö-6 | AC'ler kendiliğinden sağlanmıyor, iki okuma yolu farklı | Parça okuması ayrıştırılır, model okumasında boş liste yazılmaz (C4) |
| Ö-7 | İçe aktarma konuma bağlı | Sütun en sona, boş hücre gövdeye yazılmaz (R11, C4/3) |
| Ö-8 | Ekleme ve düzenleme iki ayrı yol, `saveEdit` dönüş vermiyor | `saveEdit` başarı değeri döner, kit yazımı kayıttan sonra (R15/2) |
| Ö-9 | Parça paneli hangi bölüme yazacağını bilmiyor | İki dizi ve yazıcıları geçirilir, karar saf modülde (R15/1, R15) |
| Ö-10 | Panel kilidi yazdığı kaydı kapsamıyor | İki panelde kayıt anında anlık denetim (R16) |
| Ö-11 | Çakışma birleştirmesi ayrışma üretebilir | Bilinen sınır, hesap yalnız kitten okur (C8, R6) |
| Ö-12 | "Maliyeti girilmemiş" sayısının kümesi yazılı değildi | Bütün canlı parçalar, aramadan ve sayfadan bağımsız (R10) |
| Ö-13 | Çöp etkileşimi tanımsızdı | Bugünkü davranış korunur ve kriterle sabitlenir (R17) |
| Ö-14 | Ek kalemin adı ve birimi belirsizdi | `ekMaliyetler`, `{ ad, tutar }`, her makina için TL (R9, C9) |
| Ö-15 | Kit satırının `ad` kopyası parça adıyla taşınmıyor | Taşıma aynı saf fonksiyona girer (R8/2) |
| Ö-16 | Negatif maliyetin kapısı yok | Saf `parcaMaliyetDogrula`, kayıt öncesinde (R14) |
| K-17 | Context'te `parcaFiyat` yazılıydı | Doğru ad `partFiyatForCurrency` (`utils.js:560`) |
| K-18 | Satış fiyatı okuyucuları eksikti | Servis formu da eklendi (Context tablosu, R2, AC-6) |
| K-19 | Fikstürde parça ve model yok | Fikstür genişletilir, DoD'a yazıldı (AC-30) |
| K-20 | Kanıt kayıtları `ayni` duruyor | İkisi `degisti` artı `onay`, `0087-piksel-raporu.json` (R18) |
| K-21 | Parça formunun kanıt ekranı yok | Üç yeni ekran (R18, Context tablosu) |
| K-22 | X5 ölçümü yazılı değildi | `defaultBantlar`'ın dört noktası sayıldı (X5) |
| K-23 | Saklama biçimi yazılı değildi | `REAL`, TL ondalıklı; kuruşa çevirme 0088'de (C6) |
| K-24 | `types.d.ts` atlanmıştı | Yeni alanlar oraya da yazılır (Context, bilinen tuzaklar) |
| K-25 | 0002'nin notunun kaderi belirsizdi | Bu spec'te kaldırılmaz (X6, AC-38) |

---

## Acceptance Criteria

### Parça maliyeti

- **AC-1.** Parça kartında TL maliyet alanı var; girilen değer kaydedilip yeniden açıldığında
  kuruşuyla aynı görünür.
- **AC-2.** Maliyet alanına `"7,50"` ve `"7.50"` girişlerinin ikisi de **7,50 TL** olarak
  çözülür (`tutarCoz` kuralı); `"1.234,56"` 1.234,56 TL olur. Alan `MoneyInput` ya da `parseMoney`
  kullanmaz (kaynak taraması).
- **AC-3.** `TutarInput` `ui.jsx`'ten dışa verilir, `GiderAlanlari` onu aynı adla yeniden dışa
  verir ve gider tarafının çağrıları değişmez (gider klasörü dışındaki sekiz dosyada yalnız içe aktarma
  satırı değişir, R3 revizyon 3); `src/components/gider/` dışındaki hiçbir dosya
  `GiderAlanlari`'ndan tutar alanı içe almaz (kaynak taraması).
- **AC-4.** Maliyet alanı boş bırakıldığında kayıt gövdesine maliyet alanı **hiç yazılmaz** (null
  da yazılmaz) ve kaydın gövdesi bu spec öncesiyle birebir aynıdır.
- **AC-5.** Maliyeti girilmemiş parçanın listedeki maliyet hücresi "—" gösterir; maliyeti sıfır
  girilmiş parça "0,00 ₺" gösterir (ikisi ayırt edilir).
- **AC-6.** Maliyet alanı satış fiyatlarını değiştirmez: aynı parça için teklif satırının birim
  fiyatı, **servis formundaki "Değişen Parçalar" fiyatı**, yedek parça satış formunun fiyatı ve
  Parça Stoğu kartının fiyat satırı bu spec öncesiyle birebir aynı kalır.
- **AC-7.** Negatif maliyet reddedilir ve alanın altında hata metni çıkar; kayıt yazılmaz. Sayıya
  çevrilemeyen metin de reddedilir. Karar tek saf fonksiyondadır ve kendi testi vardır.
- **AC-8.** Parça listesi başlığında maliyeti girilmemiş parça sayısı yazar; hepsinin maliyeti
  girilmişse bu ibare çizilmez.
- **AC-9.** Bu sayı aramadan ve sayfadan bağımsızdır (süzgeç uygulanmış listede de bütün canlı
  parçaları sayar) ve çöptekileri saymaz.

### Ürün ağacı adetleri

- **AC-10.** Parça kartında bir modele adet girildiğinde o modelin makina kitinde aynı parça aynı
  adetle görünür.
- **AC-11.** Model kartındaki kitten adet değiştirildiğinde parça kartında aynı adet görünür.
- **AC-12.** Parça kartında bir model **işaretlenip adet boş bırakıldığında** kitte satır doğmaz;
  parça o modelin kit seçicisinde görünür (bugünkü "uyumlu ama kitte yok" durumu korunur) ve
  Stok › Makina Stoğu'nun model süzgeci bu spec öncesiyle aynı davranır.
- **AC-13.** Adet girilmiş bir modelin adedi boşaltıldığında kit satırı düşer, işaret kalır.
- **AC-14.** Parça kartından modelin işareti kaldırıldığında o modelin kitinden de düşer; işaret
  ve kit satırı **aynı yazımda** değişir.
- **AC-15.** Adet girilirse en az 1 tam sayıdır; 0, negatif ya da ondalık değer kabul edilmez ve
  kit satırı yazılmaz. Kural tek saf fonksiyondan gelir ve iki kapıda aynıdır.
- **AC-16.** Standart modelde de (silinemeyen) kit adedi parça kartından girilebilir; yazım
  `standardModels` bölümüne gider.
- **AC-17.** Model yeniden adlandırıldığında parça işareti ve kit satırı birlikte yeni ada taşınır;
  parça kartında eski ad kalmaz ve parça yeni adın kit seçicisinde görünür.
- **AC-18.** Parça yeniden adlandırıldığında kit satırının gösterdiği ad da yeni addır.
- **AC-19.** Kaynak taraması: parçanın model işaretini ve modelin kitini yazan tek bir yol vardır
  (saf modül); iki alanı ayrı ayrı yazan ikinci bir çağrı kaynakta yoktur.
- **AC-20.** Ad çakışması yüzünden kaydedilemeyen parça düzenlemesinde kit **yazılmaz** (kanca
  başarı değeri döner); kancayı paylaşan diğer iki panelin (`KalipManager`, `CalisanManager`)
  davranışı değişmez.
- **AC-21.** Başkası Makina Modelleri panelini açık tutuyorsa parça kartından adet yazımı
  reddedilir ve nedeni bildirilir; kendi kilidi engellemez. Aynı kural ters yönde de geçerlidir
  (başkası Parça/Yedek Parça panelini tutuyorsa model adı taşıma reddedilir).

### Ek maliyet kalemleri

- **AC-22.** Model kartında ek maliyet kalemi (ad + TL tutar) eklenir, düzenlenir ve silinir;
  kaydedilip yeniden açıldığında aynı ve aynı sırada görünür.
- **AC-23.** Ek maliyet kalemleri makina kitine girmez: aynı modelle Stok › Makina Stoğu'nda "Kiti
  Uygula" basıldığında forma yalnız parça satırları dolar, ek kalem satırı dolmaz.
- **AC-24.** Kaynak taraması: ek maliyet listesi `defaultParcalar`'a hiçbir yoldan yazmaz ve gider
  tarafının ek ödeme alt yapısını (`ekOdemeler`, `gider_ek_odemeleri`) kullanmaz.
- **AC-25.** Ek maliyet kalemi olmayan modelin kayıt gövdesi bu spec öncesiyle birebir aynıdır.
- **AC-26.** Adı boş ya da tutarı negatif ek kalem reddedilir; hata satırda gösterilir.

### Stok, çöp ve aktarma

- **AC-27.** Makina üretiminde kit parçalarının stoktan düşmesi, kırpma kuralı ve `makina_uretimi`
  hareketleri bu spec öncesiyle birebir aynıdır (maliyet alanı stok hareketine girmez).
- **AC-28.** Çöpe atılan parçanın kit satırı silinmez ve seçiciden yeniden eklenemez; çöpteki
  modelin satırı parça kartında çizilmez, model geri alınınca işaret ve adet birlikte döner.
- **AC-29.** Parça dışa aktarmasında maliyet **son sütundur**; maliyeti girilmemiş parçanın hücresi
  boştur.
- **AC-30.** Parça içe aktarmasında maliyet sütunu okunur; sütun boşsa mevcut kayıttaki maliyet
  korunur (silinmez), yeni parçaya boş maliyet alanı **yazılmaz**. Maliyet sütunu olmayan eski
  şablonla alınmış dosya aynı sonucu verir (diğer sütunlar kaymaz).
- **AC-31.** Veritabanı gidiş-dönüşünde maliyet ve ek maliyet kalemleri kuruşuyla ve sırasıyla
  korunur; temiz kurulumda da aynı alanlar mevcuttur. Fikstür maliyeti olan ve olmayan parçayı,
  ek kalemli ve kalemsiz modeli (iki model bölümünde) birlikte taşır.

### Yetki ve değişmeyenler

- **AC-32.** Yeni eylem izni eklenmez: katalog panelini bugün açabilen kullanıcı maliyeti de
  girebilir, açamayan ikisini de göremez.
- **AC-33.** Gider sekmesi olmayan kullanıcı parça maliyetini görür ve girer (maliyet tedarik
  bilgisidir, gider verisi değildir).
- **AC-34.** Katalog panellerinin kilidi bugünkü gibi çalışır: parça paneli başkasında açıkken
  maliyet değişikliği yazılmaz.
- **AC-35.** Sunucu bölüm eşlemeleri, izin grupları ve birleştirme kuralları değişmez: yalnız
  parça maliyetini değiştiren bir yazım bugünkü parça düzenlemesiyle aynı izni ister
  (`stockActions` ve Ayarlar sekmesi).
- **AC-36.** Parça kartından adet yazımı iki bölümü birden değiştirir (`parts` ve ilgili model
  bölümü); bugünkü katalog kullanıcısı (Ayarlar sekmesi, `stockActions` kısıtsız) bu yazımı
  yapabilir. C7'nin sınırı sunucu testinde ölçülür ve yazılı kalır.
- **AC-37.** Çakışma birleştirmesinde yeni parçanın eklenmesi korunur; var olan modelin kit
  düzenlemesi sunucu kopyasına yenilir (C8). Bu ölçülür ve bilinen sınır olarak yazılır.
- **AC-38.** `makinaMaliyeti.js` `MALZEME_HARIC_NOTU` ve makina maliyeti hesabının çıktısı bu
  spec'le **değişmez** (X6); not bu spec'te kaldırılmaz.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Adet, işaret ve maliyetin birlikte yazılması **saf bir modülde** (`src/lib/urunAgaci.js`) ve
      kendi testi var; iki alanın ayrışmasını yasaklayan kaynak taraması yazıldı (AC-19).
- [x] Doğrulama saf fonksiyonda (`parcaMaliyetDogrula`) ve içe aktarma önizlemesi de onu kullanıyor
      (AC-7).
- [x] `TutarInput` `ui.jsx`'e taşındı, `GiderAlanlari` yeniden dışa veriyor ve gider tarafının
      testleri dokunulmadan yeşil (AC-3).
- [x] Dört nokta kuralı uygulandı (`parts` maliyet sütunu, iki model tablosunda ek maliyet
      kalemleri) ve `db-roundtrip` + `db-clean-install` testlerine eklendi; fikstüre parça ve model
      satırları eklendi (bugün ikisi de boş, AC-31).
- [x] Boş değerin gövdeye yazılmadığı üç yolda da ölçüldü (parça okuması, model okuması, içe
      aktarma; AC-4, AC-25, AC-30): spec öncesi gövdeyle birebir karşılaştırma fikstürü var.
- [x] Yeni veri bölümü yok; bu açıkça yazıldı. Yeni eylem izni ve yeni sunucu istisnası yok; bu
      açıkça yazıldı (C5, C7).
- [x] İki bilinen sınır spec'te yazılı ve testle ölçülü (C7 sunucu izni, C8 çakışma birleştirmesi).
- [x] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı yok (bu da yazıldı).
- [x] Para kuralına uyuldu: alan tanımı gereği TL ve KDV hariç, kuruş korunuyor, para birimi seçimi
      yok, saklama `REAL` (C6).
- [x] Arayüz kriterlerinin görsel kanıtı eklendi: `0087-piksel-raporu.json` ve taban raporu; dört
      yeni ekran (`katalog-parca`, `katalog-parca-yeni`, `ayarlar-yedekparca-maliyetsiz`, `katalog-model-ekmaliyet`),
      `ayarlar-models` 0 piksel; `kanit-eslemesi.json`'daki iki kayıt `degisti` + `onay` (R18).
- [x] `src/types.d.ts` parça ve model tipleri güncellendi.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi (parçanın iki fiyatı: satış ve alış; maliyetin KDV hariç olduğu;
      adetin tek kaynağı kit, parça işareti süzgeç; `TutarInput`'un yeni yeri).
- [x] `specs/README.md`'nin açık bulgular tablosu ve `tests/spec-atiflari.test.js`'in `TASINACAK`
      listesi bu spec için güncellendi.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | 1 ilk taslak, 2 QA turu (25 bulgu), 3 uygulama planı onayı (P1–P11; kancayı paylaşan panel sayısı üçe düzeltildi) |
| **Düzeltme turu sayısı** | 1 | Triyaj 2026-10-16 |
| **Bulgu gerçek/gürültü oranı** | 4/0 | Yanlış "kitten düşecek" ipucu, içe aktarmada belirsiz noktalı maliyet, yalnız çöpteki modelde kit adı, iki belge tutarsızlığı |
| **Regresyon sayısı** | 0 | Gider tarafının testleri `TutarInput` taşımasından sonra dokunulmadan yeşil |
| **Kaçan hata** | 0 | |

**Bu spec'ten çıkarılan ders:** İki kaynaklı veride (işaret ve kit) ekranın gösterdiği uyarı, yazma kuralıyla aynı kümeden
türemeli; ipucunu "kitte olan her model"den kurmak, kuralı "kayıttaki işaretten kaldırılan model" olan yazımla ayrıştı ve ancak
spec öncesi bozulmuş veride (eski adda kalan işaret) görünür oldu. Ayrıca "X'i kullanan dosyalar" sayımı metin aramasıyla değil
içe aktarma ve çağrıyla yapılmalı (`PartTypeManager` yorumunda kancanın adı geçiyordu).
