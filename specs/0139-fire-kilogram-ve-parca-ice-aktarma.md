# 0139 — Malzeme kartında kilogram fire ve malzeme listesinden parça içe aktarma

| | |
|---|---|
| **Durum** | Onaylandı, revizyon 2 (Takım Yöneticisi, 2026-11-09; plan onayı) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog › Malzemeler (`MalzemeManager.jsx`), Ayarlar › Veri Yönetimi (yeni araç paneli), parça kartının malzeme kalemi (`MalzemeSatiriAlani.jsx`), saf motorlar (`malzeme.js`, `siparisIhtiyaci.js`, `urunAgaci.js`, `parcaAktarma.js` dokunulmaz), model kitleri (`urunAgaci.kitleriGuncelle`), kilit listesi (`kilitAlanlari.js`), örnek katalog (`ornekKatalog.js`), Ayarlar menüsü (`Settings.jsx`), İşlem Geçmişi etiketleri (`SettingsAuditLog.jsx`), `electron/db.cjs` |
| **Bağımlı spec'ler** | 0132 (malzeme kataloğu), 0134 (ondalık kit, emniyet payı), 0135 (maliyet kalemleri), 0087 (kit, parça kataloğu, karşı panel kilidi), 0124 (parça Excel şablonu), 0138 (önce uygulanır), 0064 (kilit alanları), 0077 (birleştirme sınırı), 0096 (hammadde kırılımı), 0133 (fiyat kipi), 0136 (donmuş parti) |
| **QA turu** | 2026-11-09, 29 bulgu (5 Bloklayıcı, 14 Önemli, 10 Küçük); kararlar Context'te, karar kaydı tabloda |
| **Plan turu** | 2026-11-09, revizyon 2: Takım Yöneticisi planın on altı önerisini onayladı; kararlar 30–45 aşağıda ("Plan turunda verilen kararlar") |
| **Düzeltilen iddialar** | 3: C2'nin tek yer kuralı (fire çarpımı bugün iki dosyada), A-R9'un "fiyat bantlarıyla aynı kurallar"ı (ilk bandın alt sınırı 0'a sabit, boş değer reddedilir), B-R7'nin model adları (katalogda AK100 yok, AK100_DS ve AK100_DSC var) |

---

## Intent

Fabrika yönetimi parça maliyetlerini bugün bir Excel dosyasında hesaplıyor (`MALZEME LİSTESİ`,
yedi sayfa, dördü hesap yapıyor, yaklaşık 140 parça satırı). Uygulamaya geçmenin önünde iki şey
duruyor.

Birincisi: atölyenin fire kuralı uygulamada ifade edilemiyor. Paslanmaz millerde fire bir yüzde
değil, çap bandına göre **sabit kilogram** (Ø20 altına hiç fire yok, Ø141-180 arasına 1,75 kg).
Uygulamada yalnız yüzde var ve tek bir yüzde bu kuralın yerine geçemiyor: toplamı tutturan
yüzde %6,63, ama o yüzdeyle kısa ve kalın bir parça %12,6 düşük, bütün ince miller %6,6 yüksek
çıkıyor. Parça maliyeti satış fiyatını türettiği için bu sapma doğrudan fiyata geçiyor.

İkincisi: 140 parçayı elle girmek iki günlük ve hatalı bir iş. Veri zaten dosyada duruyor.

Bu iş bittiğinde malzeme kartı atölyenin fire kuralını olduğu gibi taşır, parça kataloğu
dosyadan tek seferde kurulur ve zam geldiğinde tek bir malzeme kartı güncellenerek bütün
parçaların maliyeti ve maliyete bağlı satış fiyatları kendiliğinden düzelir.

---

## Requirements

### A. Kilogram fire

- **A-R1.** Malzeme kartında, bugünkü fire yüzdesinin yanında **çap bandına göre ek fire (kg)**
  tablosu bulunur: her satır bir alt çap ve o banda düşen kilogram. Tablo fiyat bantlarının
  düzenleyicisiyle aynı şekildedir.
- **A-R1/2.** Tablonun düzenleyicisi `FiyatAlanlari`'nın **dışındadır** ve kartın hem ekleme hem
  **düzenleme** kipinde çizilir (fire ve emniyet payının yanında). Kartın kayıt yolu fiyat kümesini
  eski kayıttan taşıyıp form alanlarını beyaz listeyle aldığı için (`MalzemeManager.jsx` `kaydet`,
  ölçüm F) yeni alan o beyaz listeye eklenir; "Fiyatı Güncelle" penceresi tabloya dokunmaz
  (yalnız `FIYAT_ANAHTARLARI`'nı yazar).
- **A-R2.** İkisi **birlikte** uygulanır, biri diğerini bastırmaz:
  `fire kg = ham kg × yüzde / 100 + bandın kilogramı`. Fire türü seçicisi yoktur; alanlar
  kartta yan yana durur ve dolu olan çalışır (kilo fiyatı, bantlar ve boy fiyatının yan yana
  durması gibi).
- **A-R2/2.** Formüldeki **ham kg** işleme payı **dahil** ağırlıktır (bugünkü hesabın çarptığı değer,
  ölçüm C). "Net" sözcüğü bu spec'te kullanılmaz: 0137'nin kalkan `islenmisKg`'si onu pay **hariç**
  anlamında kullanıyordu ve iki anlam payı iki kez ya da hiç saymaya açıktır.
- **A-R3.** Yüzdenin önceliği bugünkü kuraldır: parçanın malzeme kaleminde yazılıysa o, yoksa
  malzeme kartının yüzdesi, ikisi de boşsa sıfır.
- **A-R4.** Kilogram tablosu yalnız malzeme kartında tutulur; parçanın kaleminde kilogram alanı
  yoktur ve parça onu geçersiz kılamaz.
- **A-R5.** Tablo yalnız **çaplı biçimlerde** (yuvarlak mil, boru) uygulanır. Lama ve sacta yok
  sayılır ve kartta bu yazılıdır.
- **A-R6.** Bandı seçen değer **ham çaptır**, yani işleme payı eklenmiş çap. Fiyat bandının
  kuralıyla aynıdır: alt sınırı ham çaptan büyük olmayan en son band. En üst band açık uçludur.
- **A-R6/2.** Tablonun **en alt** bandının alt sınırının altında kalan ham çapa fire **eklenmez**
  (`bantSec` band bulamaz, ölçüm E). Context'teki önerilen tablonun ilk satırı bu yüzden Ø0'dır;
  böylece bu dal pratikte hiç çalışmaz ve "fire eklenmedi" sessizliği oluşmaz.
- **A-R7.** Kilogram **adet başınadır**: kalemin adediyle çarpılmadan önce bir parçanın ham
  ağırlığına eklenir.
- **A-R8.** Tablosu boş olan malzemede bu işin çıktısı **birebir bugünküyle aynıdır**.
- **A-R9.** Doğrulama **ayrı** bir fonksiyondur (`fireBantlariDogrula`), fiyat bantlarının
  doğrulayıcısı yeniden kullanılmaz: alt çaplar **serbest** girilir (ilk band da yazılır, 0'a
  sabitlenmez), kesin artan sırada olur, kilogram zorunludur, negatif olamaz ve belirsiz yazılmış
  sayı reddedilir. Kilogramı **sıfır** olan band geçerlidir ve "bu bantta fire yok" demektir; boş
  bırakılan kilogram reddedilir, kullanıcı sıfırı açıkça yazar. Gerekçe ölçülmüştür (ölçüm D):
  fiyat bantlarının doğrulayıcısı ilk bandın alt sınırını 0'a sabitler ve ekranda o alanı pasif
  yapar, yani Context'teki Ø5 ile başlayan tablo olduğu gibi girilemezdi.
- **A-R10.** Fire, malzemenin **fiyat kümesine girmez**, yani tarihlenmez. Tabloyu değiştirmek
  açık partilerin bugünkü maliyetini değiştirir; kapanmış parti donmuş olduğu için etkilenmez.
- **A-R11.** Parça kartının canlı ağırlık özeti kilogram fireyi de içerir; "pay dahil" ve "fire
  dahil" satırları bugünkü anlamlarını korur.
- **A-R11/2.** Kilogram fire, fiyatı ya da kuru **eksik** malzemede de ağırlık özetine girer
  (maliyet yine "girilmedi" kalır). Ağırlık bugün iki ayrı dalda hesaplanıyor (ölçüm B: eksik dalı
  ve tam hesap); kilogram ikisine de eklenir, yoksa aynı parçanın ağırlığı malzemenin fiyatı
  girilip girilmemesine göre değişirdi. Fiyatsız kart kalacağı için (X1) bu dal canlıdır.
- **A-R12.** Sipariş ihtiyacının **Fire kg** sütunu kilogram fireyi de içerir (satır başına
  `fire dahil − ham`, adetle çarpılarak). Sipariş kilosu **boy adedinden** hesaplanan çaplı
  kesitte fire bugünkü gibi eklenmez (kesim kaybı artan kiloda görünür, 0134 Karar 29 ve 48);
  o yolun çıktısı spec öncesiyle birebir aynı kalır. Net, fire, artan ve asgari sipariş arasındaki
  ilişki değişmez.
- **A-R12/2.** Boy adedi hesaplanan kesitteki fire uyarısının koşulu "fire var mı" olur: yüzde
  **ya da** kilogram. Bugünkü koşul yalnız yüzdeye bakıyor (ölçüm G), yani yüzdesi boş ve yalnız
  kilogram tablosu olan malzemede (paslanmaz çubuk kartı tam bu) uyarı hiç çıkmazdı. Uyarının
  metni kilogram firenin de artan kiloda göründüğünü söyler.
- **A-R13.** Emniyet payı, asgari sipariş ve boy yöntemi etkilenmez. Boy yönteminde fire
  bugünkü gibi orana eklenir ve kilogram tablosu uygulanmaz (o yolda ağırlık hesaplanmıyor).
- **A-R13/2.** Nedenin görüneceği yer yeni bir satırdır: boy yöntemli kalemde ağırlık satırı bugün
  hiç çizilmiyor (ölçüm H). Kalemde `data-testid="fire-kg-uygulanmadi"` satırı, metni tek sabitten
  (`FIRE_KG_BOY_NEDENI`), **yalnız** malzemenin kilogram tablosu doluyken çizilir; tablosu olmayan
  malzemelerde satır yoktur.

#### QA turunda eklenen maddeler (2026-11-09)

- **A-R14.** Kullanıcıya görünen bütün metinler adlı sabitte ve tek yerde durur (`malzeme.js`;
  `BANT_LAMA_NOTU` emsali): bölüm başlığı "Çap bandına göre ek fire (kg)", lama ve sac notu
  "Ek fire yalnız yuvarlak mil ve boruda uygulanır; lama ve sacda yok sayılır." (A-R5'in "kartta
  bu yazılıdır"ı), hata metinleri (`FIRE_KG_SIRA_HATASI`, `FIRE_KG_HATASI`), boy yöntemi nedeni
  (`FIRE_KG_BOY_NEDENI`) ve aracın panel adı "Malzeme Listesinden Aktar". Ekranlar metin yazmaz.
- **A-R15.** Örnek malzemelerden biri kilogram tablosu taşır (`ornekKatalog.js`, "8620 mil"
  örneğine Ø0 → 0 kg ve Ø50 → 0,30 kg). Örnekler özelliğin keşfedildiği yerdir; bantlı fiyat
  örneği aynı gerekçeyle duruyor.
- **A-R16.** Kartın kaydında fire alanları (yüzde ya da kilogram tablosu) değiştiyse, fiyat
  penceresindeki **aynı** etki özeti (`fiyatEtkisi`: kaç parçanın maliyeti ve satış fiyatı
  değişecek, beş örnek satır) onay olarak gösterilir. Kilogram tablosu bütün paslanmaz parçaların
  maliyetini ve maliyete bağlı satış fiyatlarını tek kayıtla değiştiren bir koldur; bugün fire
  yüzdesi de önizlemesiz değişiyor (ölçüm I) ve bu madde o boşluğu da kapatır.

### B. Malzeme listesinden parça içe aktarma

- **B-R1.** Ayarlar › Veri Yönetimi'nde **tek seferlik** bir araç bulunur: dosya seçilir,
  önizleme gösterilir, kullanıcı onaylayınca yazılır. Onaydan önce hiçbir şey yazılmaz.
- **B-R1/2.** Araç Veri Yönetimi'nde **kendi panelidir** (`id: "malzemeaktar"`); var olan "İçe Aktar"
  paneli müşteri ve parça şablonlarının yolu olarak dokunulmaz (C4 ile tutarlı). Panel
  `kilitAlanlari.js` `AYAR_KILITLI` ve `AYAR_PANEL_DOSYALARI` listelerine eklenir ve
  `ayar:malzemeaktar` kilidi altında çizilir; listelere girmeyen panel bekçi testini düşürür
  (ölçüm J). Araç parça kataloğunu **ve** model dizilerini yazdığı için 0087 R16 emsaliyle **kayıt
  anında** `ayar:yedekparca` ve `ayar:models` kilitlerine anlık bakar (`useKilitListesi`); biri
  başkasındaysa hiçbir şey yazılmaz ve nedeni kaydın adıyla bildirilir.
- **B-R2.** Araç yalnız **parça kataloğuna ve model kitlerine** yazar. Malzeme kartı, fiyat,
  tedarikçi, stok ve başka hiçbir bölüm yazılmaz.
- **B-R2/2.** Malzeme kartlarının **önceden kurulmuş olması ön koşuldur** (B-R2 aracın kart
  yazmadığını söylüyor). Önizleme, Context'teki kartlardan eksik olanı bulursa ön koşul listesini
  yazar ve yazma düğmesi pasif kalır; kullanıcı kartları Ayarlar › Katalog › Malzemeler'den kurar.
- **B-R3.** **Hesap yapan dört sayfanın** her kaynak satırından bir parça oluşur: adı, tek malzeme
  kalemi (malzeme, biçim, ölçüler, adet 1) ve kullanıldığı modelin kit adedi. Hesap yapmayan üç
  sayfa kapsam dışıdır (X9).
- **B-R3/2.** *(Revizyon 2, karar 31: plastik sayfalarında malzeme önce satırın **E sütunundan** okunur; aşağıdaki iki kademe yalnız
  E boşken çalışır.)* Satırın **malzemesi** iki kademeli eşlenir: (1) sayfa adı o sayfanın varsayılan
  kartını verir (paslanmaz sayfaları `PASLANMAZ 304 ÇUBUK`), (2) satırın kendi metninde
  `KESTAMİT`, `DELRİN LEVHA`, `DELRİN` ya da `TEFLON` geçiyorsa o kart kazanır. Kart adları
  `trLower` ile eşlenir; eşlenemeyen satır **atlanır**, nedeni raporda yazar ve sayılır. Ek 1'in
  iki boru satırı ile iki lama satırının kartı Ek 1'den gelir.
- **B-R3/3.** Kaynağın **sütun haritası** (sayfa başına: ad, ölçü, adet hücreleri) uygulamadan
  önce ölçülür ve **Ek 3**'e yazılır; harita olmadan ayrıştırıcı yazılamaz, bu yüzden uygulamanın
  ön koşuludur (ölçüm A: spec bugün hangi hücrenin ne olduğunu söylemiyor).
- **B-R3/4.** Oluşan parça `models` **uyumluluk işaretini** de taşır (kitine girdiği modeller):
  `urunAgaci.kitleriGuncelle` kit adedini işaretle birlikte yönetir ve işaretsiz modeldeki kit
  satırına sonraki düzenleme dokunmaz (ölçüm K). *(Triyaj: işaret kit adedi yazılamayan satırda da hedef modellere yazılır, AC-69.)*
  `tip` yazılmaz (veritabanı "Standart" yazar),
  `kod` yazılmaz, `fiyatKipi` yazılmaz (X10).
- **B-R4.** Ölçüler **ham ölçü** olarak yazılır ve işleme payı alanları **boş** kalır. Dosyada
  bitmiş ölçü yoktur; girilen ölçü satın alınan ölçüdür.
- **B-R5.** *(Revizyon 2, karar 30: hesap yapan dört sayfada ölçü ayrı sütunlardadır (Ek 3). Paslanmazda G = "Ø" yuvarlak mil
  (çap H, boy K); plastikte E = "DELRİN LEVHA" sac (kalınlık K, en J, boy O), öteki plastikler yuvarlak mil (çap J, boy O).
  Aşağıdaki metin kuralı kapsam dışı sayfalara aittir ve bu işte yazılmaz.)* Biçim kaynaktan türer: `Ø…` ile başlayan iki ölçülü metin yuvarlak mil, üç ölçülü
  metin **sac**, `YUVARLAK` eki yuvarlak mil, plastik sayfasında "DELRİN LEVHA" sac,
  diğer plastikler yuvarlak mil. Boru yalnız ekte adı geçen satırlarda kullanılır.
- **B-R5/2.** Üç ölçülü satırın varsayılanı **sac**'tır (AC-24'ün "en" adlandırmasıyla tutarlı);
  yalnız Ek 1'de lama olarak işaretli iki kazan iç çubuğu satırı **lama** olur. İki biçimin hacim
  hesabı aynıdır (ölçüm L), ama sipariş ihtiyacı kesiti biçimle birlikte grupluyor: aynı malzemenin
  iki biçimde yazılması aynı kesiti iki satıra böler ve asgari siparişi iki kez uygular.
- **B-R6.** **Öneksiz** satırın kit adedi = kaynak adedi / sayfanın parti adedi, **üç ondalığa**
  yuvarlanır (0134'ün ondalık kit kuralı, hesap `urunAgaci.partiAdediCevir`, ölçüm M). Metrelik
  çubuk alımları bu yolla birebir taşınır.
- **B-R6/2.** **Önekli** satır (B-R7) kendi modelinin makina adedine bölünür, sayfanın partisine
  değil. Araç sayfa başına iki girdi alır: parti adedi (70 ve 10) ve **model başına adet** (AK100
  40, AK120 30; teyit gelene kadar boş). Model adedi girilmemişse satır **kitsiz** oluşur ve
  raporda "adedi doğrulanmalı" olarak listelenir. Gerekçe: B-R6'nın formülü önekli satırda
  40 / 70 = 0,571 yazıyordu, Kararlar'daki teyit #1 ise o satırların ilgili modelde 1 adet
  olduğunu söylüyor; 0,571 makul görünen ve kimsenin yakalamayacağı bir hatadır, boş kit ise en az
  bir kez rapora düşer.
- **B-R7.** Model eşlemesi ad önekinden gelir ve **önek eşlemesidir, model adı eşlemesi değildir**:
  `100_` → adı `AK100` ile başlayan bütün canlı modeller, `120_` ve "(120 İÇİN)" → `AK120*`,
  `140_` → `AK140*`, `SWP` → `SWP140*`. Öneksiz satır sayfanın bütün modellerine (bütün
  varyantlarına) girer; sayfa → model öneki eşlemesi Ek 2'de yazılıdır. Kit adedi her varyanta
  aynı yazılır, çünkü kit makina başınadır ve soğutmalı/soğutmasız ayrımı bu parçaları
  değiştirmez. **Düzeltilen iddia (ölçüm N):** katalogda AK100, AK120, AK140 ve SWP140 adlı model
  **yok**; standart liste AK100_DS, AK100_DSC, AK120_DS, AK120_DSC, AK140_DSC ve SWP140_DSC
  taşıyor. Ad eşlemesi yazıldığı gibi uygulansa 141 satırın tamamı B-R14'e düşer, bütün parçalar
  kitsiz oluşur ve AC-28 ile AC-30'dan AC-32'ye kadarki kriterler ölçülemezdi. B-R12'nin "oluşacak
  kit satırı" sayısı bu yüzden varyant sayısıyla çarpılır ve rapor model adlarını açıkça listeler.
- **B-R8.** Aynı adlı parça farklı ölçüdeyse **ayrı parça** olur ve adının sonuna modeli yazılır.
  Ölçüsü de aynıysa tek parça olur ve iki modelin kitine girer.
- **B-R8/2.** Ad normalizasyonu tek yerdedir: `100_`, `120_`, `140_` ve `SWP` önekleri ile
  `(… İÇİN)` ibaresi adın başından ve sonundan **temizlenir** ve ad kırpılır; model bilgisi yalnız
  kit satırında durur. B-R9'un karşılaştırması **temizlenmiş** adla ve `trLower` ile yapılır
  (0124'ün `YINELENEN_AD_HATASI` emsali). Önek adda kalsa aynı parça katalogda iki kez farklı adla
  durur ve B-R9'un koruması hiç çalışmazdı.
- **B-R8/3.** B-R8'in ayrımı gerektiğinde ad sonuna ` (AK100)` biçiminde **model öneki** eklenir.
  İki satır da öneksizse (ikisi de bütün modellere ait) model yazılamaz; o durumda ad sonuna
  **ölçü** yazılır (` (Ø60×175)`), yoksa ikinci satır birincinin adıyla çakışıp B-R9 ile sessizce
  atlanırdı.
- **B-R9.** Kataloğunda aynı adlı canlı parça bulunan satır **güncellenmez, atlanır** ve raporda
  nedeniyle listelenir.
- **B-R9/2.** Atlanan satırın **kit satırı da yazılmaz** (tek kural) ve rapor bunu ayrı sayar:
  "n satır atlandı (aynı adlı parça var); kit satırı da yazılmadı, kiti elle girin". Kit yazıp
  kalemi yazmamak, maliyeti olmayan bir parçayı modele sokar ve Model Maliyetleri'nde "eksik"
  sayısını sessizce büyütürdü.
- **B-R10.** Ekte listelenen dört satır (iki konveyör borusu, iki kazan iç çubuğu) kaynağın
  hesap sütunlarından değil **notundaki gerçek veriden** aktarılır; bunlar dosyada tutar
  tutsun diye adedi değiştirilmiş satırlardır.
- **B-R10/2.** İki **boru** satırının biçimi, ölçüleri ve malzemesi Ek 1'den yazılır, **kit adedi
  yazılmaz**: notundaki "70 makinaya 2 boy" malzeme miktarıdır, parça adedi değildir ve makina
  başına kaç parça girdiği dosyada yok. Satır B-R6/2'nin kuralıyla "adedi doğrulanmalı" olarak
  raporlanır. Boy kapasitesinden adet türetmek (12 m / 173 mm = 69 parça, 2 boy = 138, 70 makinaya
  1,971) kaynağın hatalı satırına dayanan bir tahmin olurdu.
- **B-R11.** Malzemesinin fiyatı girilmemiş olması aktarmayı engellemez; o parçanın maliyeti
  "girilmedi" çıkar ve rapor kaç parçanın bu durumda olduğunu yazar.
- **B-R11/2.** Hesap yapan dört sayfanın malzemeleri (paslanmaz çubuk, paslanmaz boru ve dört
  plastik, **altı kart**) bu işin kapsamında Context'teki değerlerle kurulur; alüminyum, 8620 ve
  1050 fiyatsız kalır (X1, X3). Fiyat girilmeden 141 parçanın tamamının maliyeti "girilmedi"
  çıkardı (ölçüm O) ve AC-43 ile Ek 2'nin dört toplam karşılaştırması ölçülemezdi.
- **B-R12.** Önizleme ve sonuç raporu şunları sayar: oluşacak parça, oluşacak kit satırı,
  atlanan satır (nedeniyle), maliyeti çözülemeyen parça, modeli belirlenemeyen satır.
- **B-R12/2.** İşlem geçmişine **tek özet satırı** yazılır (`action: "ice_aktarildi"`,
  `entity: "parca_tanimi"`, `entityName: "141 parça"`, `detail: { parca, kit, atlanan }`); etiket
  `SettingsAuditLog`'un haritalarına eklenir, yoksa ham anahtar görünür ve etiket bekçisi kırılır.
  Emsal 0133'ün toplu fiyat kipi değişikliğidir (ölçüm P); parça başına iz 141 ayrı istek demekti.
- **B-R13.** Araç ikinci kez çalıştırılabilir ve var olanı bozmaz: yalnız eksik parçaları ekler
  (B-R9 gereği var olanı atlar).
- **B-R13/2.** Araç **sunucu PC'de** ve başka kullanıcı yazmazken çalıştırılır (sürüm notu).
  Kayıttan sonra rapor veriden yeniden okunarak doğrulanır ("beklenen n kit satırı, bulunan m");
  tutmuyorsa eksikler listelenir ve tekrar çalıştırmak önerilir (B-R13 gereği parçalar ikinci kez
  oluşmaz). Gerekçe ölçülmüştür (ölçüm R): birleştirme yalnız eklemeleri geri uygular, kit satırı
  var olan model kaydının **düzenlemesidir** ve çakışmada sunucu kopyasına yenilir; `standardModels`
  ise hiç birleşmez. Yani çakışmada 141 parça kalır, kit satırları sessizce kaybolurdu.
- **B-R14.** Kaynak dosyada bulunamayan model adı aktarmayı durdurmaz; o satır modeli
  belirlenemeyen olarak raporlanır ve parçası kitsiz oluşturulur.

#### QA turunda eklenen maddeler (2026-11-09)

- **B-R15.** Araç **kalıcı** bir paneldir; B-R1'in "tek seferlik" ibaresi "toplu" anlamındadır ve
  aracın kaldırılması beklenmez (B-R13 yeniden çalıştırmayı zaten tanımlıyor). DoD'de kaldırma
  maddesi yoktur.
- **B-R16.** Saf modülün imzası: kimlik ve gün **parametredir** (`yeniId`, gerekiyorsa `bugun`);
  modülde `uid()` ve saat okuması yoktur (kaynak taraması). Emsaller `parcaSatirlariniCoz`,
  `ornekMalzemeler` ve 0111'in `topluDuzenlemePlani`'dır.

---

## Constraints

### Uyulması zorunlu

- **C1.** Kilogram tablosu boş olan veride bütün çıktılar spec öncesiyle **birebir** aynı
  olmalıdır: parça maliyeti, satış fiyatı, model maliyetleri, parti hesabı, sipariş ihtiyacı,
  Excel dışa aktarması. Kıyas altını spec öncesi koddan üretilir.
- **C2.** Fire hesabı tek yerde kalır: **kilogram bandının seçimi ve eklenmesi** kaynakta yalnız
  malzeme motorundadır (tarama yeni adı arar); ekranlar ve sipariş motoru oradan okur, ikinci bir
  kilogram hesabı yazılmaz. **Düzeltilen iddia (ölçüm S):** "fire çarpımları yalnız malzeme
  motorundadır" bugün doğru değil; fire yüzdesi `siparisIhtiyaci.js`'in boy yolunda da çarpılıyor
  ve bu 0134 Karar 48'in gerekçeli, tam yollu istisnasıdır. Yüzdenin o kopyası kaldırılmaz; onu
  "ikinci fire hesabı" sayan bir tarama HEAD'de kırılırdı.
- **C3.** İçe aktarma kararları **saf modülde** verilir (ayrıştırma, biçim türetme, model
  eşlemesi, kit adedi, atlama nedenleri); ekran yalnız gösterir ve planı uygular.
- **C4.** Araç 0124'ün on bir sütunlu parça Excel şablonuna **dokunmaz**; o şablon ve bu araç
  ayrı yollardır ve birbirinin kurallarını değiştirmez.
- **C5.** Kaynak dosya güvenilmeyen veridir ve savunma ölçülebilir kurallardır (var olan emsal
  `SettingsImport.jsx`, ölçüm T): dosya en çok **20 MB** ve **50.000 satır** olur, aşarsa okunmaz;
  hücreler `raw: false` ile **biçimlenmiş değer** okunur, yani formül hücresi kendi önbelleklenmiş
  değerini verir ve formül metni yorumlanmaz; sayfa adları `trLower` ile eşlenir, beklenen sayfa
  yoksa hiçbir şey yazılmaz (AC-40); ayrıştırıcı sözlükleri `Object.create(null)` ile kurar ve
  `__proto__` ile `constructor` adlı anahtarları yok sayar (xlsx paketinde kapanmamış prototip
  kirlenmesi açığı var). Rapor ve önizleme ham HTML yazmaz (AC-42).
- **C6.** Yeni eylem izni **eklenmez**. Fire tablosu malzeme kartının bugünkü iznindedir
  (Ayarlar); içe aktarma aracı parça kataloğunun bugünkü iznindedir.
- **C7.** Fire kilogramı yeni bir kalıcı alandır ve dört nokta kuralına uyar; boş tablo gövdeye
  yazılmaz.

### KAPSAM DIŞI

- **X1.** Alüminyum, 8620 ve 1050 kartlarının fiyatı girilmez — *neden:* Takım Yöneticisi kararı
  (2026-11-09); o üç sayfa hesap yapmıyor ve kapsam dışıdır (X9). Hesap yapan dört sayfanın altı
  malzemesinin fiyatı B-R11/2 ile bu işin kapsamındadır, çünkü AC-43 ve Ek 2'nin dört toplam
  karşılaştırması fiyatsız ölçülemez.
- **X2.** İşleme payları girilmez — *neden:* dosyada bitmiş ölçü yok; payları sonradan parça
  parça girmek başka hiçbir şeye dokunmaz.
- **X3.** Alüminyum ve çelik kartlarının fire oranı boş bırakılır — *neden:* o üç sayfa hesap
  yapmıyor, fire kuralı dosyada yok; müşteri söyleyene kadar varsaymıyoruz.
- **X4.** Fason ve dış işlem bedelleri aktarılmaz — *neden:* 0138 ile katalog kalkıyor; bedeller
  parça kartına elle işlem kalemi olarak girilir.
- **X5.** Kaynağın fiyat, kur, toplam ve "1 makinalık maliyet" sütunları aktarılmaz — *neden:* o
  hesabı uygulama kendisi yapıyor; kaynaktan kopyalamak iki doğruluk kaynağı demek olur.
- **X6.** Set içeriği, dış işlem kalemi ve stok adedi aktarılmaz — *neden:* dosyada yok.
- **X7.** Kaynağın kendi hataları düzeltilmez (ekte listelenen kopyalama hatası) — *neden:*
  uygulamaya girmiyor; dosya müşterinin elinde kalıyor.
- **X8.** Kilogram fire lama ve saca uygulanmaz — *neden:* tablo çapa göre; kalınlığa göre ikinci
  bir tablo istenmedi ve dosyada da yok.
- **X9.** Hesap yapmayan üç sayfa (ALÜMİNYUM 36, 8620 SEMENTE 10, 1050 İMALAT ÇELİĞİ 4; toplam 50
  satır) aktarılmaz — *neden:* o sayfalarda ölçü sütunu ve parti adedi yok, malzeme bilgisi adın
  içinde yazılı ve model ad önekinden değil blok başlığından geliyor; B-R3, B-R5 ve B-R6
  uygulanamaz. Araç bu sayfaları okumaz ve önizlemede "üç sayfa atlandı (ölçü ve parti verisi yok)"
  satırını yazar; o 50 parça elle ya da 0124'ün Excel şablonuyla girilir.
- **X10.** Oluşan parçanın fiyat kipi yazılmaz — *neden:* 141 parçanın satış fiyatı kararı
  kullanıcınındır ve 0133'ün toplu "maliyete bağla" düğmesi bunun hazır yoludur; araç yazsa
  141 parçanın satış fiyatı bir anda değişirdi.

---

## Context

### Kaynağın ölçümü (2026-11-09)

Yedi sayfa, dördü hesap yapıyor. Hesap yapan sayfaların zinciri:

| | Paslanmaz | Plastik |
|---|---|---|
| Ağırlık | `çap × çap × boy × 0,0000062` | yuvarlakta `çap² × boy × 0,785 × ρ / 1e6`, levhada `kalınlık × en × boy × ρ / 1e6` |
| İçindeki özgül ağırlık | 7,894 (katsayıya gömülü) | kartta ayrı: kestamit 1,15 · teflon 2,2 · delrin 1,42 |
| Fire | **çap bandına göre kilogram** | **sabit %10, istisnasız** |
| Kilo fiyatı | çap bandından ($) | malzeme ve çap basamağından (TL) |
| Çıktı | parti toplamı ve 1 makinalık | parti toplamı ve 1 makinalık |

Uygulamanın motoruyla sapma ölçüldü: yuvarlak milde %0,075 (katsayı 0,0000062 ile ρ 7,9
arasındaki fark), plastik yuvarlakta %0,051 (0,785 ile π/4 arasındaki fark), levhada %0,000.
Hepsi önemsiz.

### Fire: neden kilogram tablosu gerekiyor

| Sayfa | Firesiz kilo | Eklenen fire | Fire payı |
|---|---|---|---|
| AK100_AK120 paslanmaz | 2.419,0 kg | 154,8 kg | %6,44 |
| AK140_SWP paslanmaz | 769,1 kg | 56,5 kg | %7,35 |
| Plastikler | | sabit %10 | %10,00 |

Fire payı sütunu **firesiz kiloya** oranıdır (QA turu düzeltmesi, karar 27): AK140 satırı
56,5 / 769,1 = %7,35'tir (%7,40 yazılıydı) ve plastik satırı sabit %10'un kendisidir (önceki
%9,09 toplama oranıydı, yani başka bir tabandı).

43 paslanmaz satırının 22'si firesiz çıkıyor ve hepsi Ø20 ve altı mil; bu bir ihmal değil,
formülün kuralı. Toplamı tutturan tek yüzde %6,63, ama o yüzdeyle:

| Parça | Gerçek fire | Tek yüzdeyle maliyet |
|---|---|---|
| BAKALİT PASLANMAZ Ø70×45 | %21,9 | %12,6 düşük |
| KONVEYÖR BORU MİLİ Ø16×235 | %0 | %6,6 yüksek |
| YÜZÜK Ø10×3000 | %0 | %6,6 yüksek |

Ø20 altı on bir parçanın hepsi %6,6 yüksek çıkar. `YÜZÜK` ve `KAPAK AÇMA SETİSKURU` gibi
satırlarda fire 0 **doğrudur**, çünkü çubuğun tamamı alınıyor, kesim artığı yok.

Kilogram firenin eşdeğer boy payına çevrilmesi denendi, tutmuyor: aynı bandın içinde eşdeğer ek
boy 6 mm ile 37 mm arasında değişiyor (Ø36'da 37,3 mm, Ø90'da 6,0 mm).

### Adetler: 64 satır mekanik, 23 satır değil

Hesap yapan dört sayfa Ek 2'ye göre 91 satır taşıyor; **dördü boş** olduğu için adet analizi
87 satır sayar (QA turu düzeltmesi, karar 27; önizlemenin beklediği satır sayısı budur).
87 satırın 64'ü makina başına tam sayı veriyor. Kalanı dört sebeple kesirli:

| Tür | Satır | Çözüm |
|---|---|---|
| Metrelik çubuk alımı ("70 MAKİNALIK" notu) | 9 | Ondalık kit birebir taşır (B-R6) |
| Model ayrımı (40 + 30 = 70) | 6 | Ekteki teyide bağlı |
| Adedi uydurulmuş satır | 4 | Notundaki gerçek veriden (B-R10) |
| Belirsiz | 4 | Ekteki teyide bağlı |

### Kaynağın zorlandığı yerler

Dosyanın geometri modeli yalnız "girilen ölçünün karesi × boy". Boru ve lama yok, bu yüzden
dört satırda rakamı tutturmak için **adet değiştirilmiş** ve hücrenin yanına not düşülmüş
("ADET FİYATI ÇIKSIN DİYE 29 YAZIYOR NORMALDE 2 BOY"). Uygulamada boru, lama ve sac biçimleri
olduğu için bu dört uydurma kalkıyor.

Kestamit fiyat basamakları ayrık: Ø15, Ø20, Ø30, Ø50 ve Ø80-250 tanımlı, aradaki çaplarda
formül **boş** dönüyor, yani o çapta bir parça girilirse fiyat sessizce sıfır oluyor.
Uygulamanın alt sınırlı bant modeli bu boşlukları kendiliğinden dolduruyor.

Dosyada bir kopyalama hatası var: `100_120_PLASTİKLER` 56. satırda kestamit Ø19-21 bandı yanlış
hücreyi okuyor (1.180 yerine 1.015 TL). O satır boş olduğu için sonuca girmiyor.

### Paslanmazda üç ayrı kilo fiyatı

| Biçim | Kaynaktaki fiyat | Nereden |
|---|---|---|
| Yuvarlak mil | 2,85 / 2,95 / 3,40 $ | Çap bandı tablosu |
| Lama (kazan iç çubukları 10×20) | **3,20 $** | Malzeme adının içinde yazılı |
| Boru (konveyör borusu Ø19) | **~4,08 $** | Notundan hesaplandı: 1.600 TL / 12 m, parça 0,113 kg, 23 TL |

Bantlar hem mile hem boruya uygulandığı için boru ayrı kart istiyor; lama kartın kilo fiyatı
alanından beslenir. Boru fiyatı hesaplanırken et kalınlığı 1,5 mm varsayıldı (AK140 sayfasında
iç çap 16 yazılı); teyit gerekiyor.

### Kurulacak malzeme kartları (öneri)

| Kart | ρ | Fiyat | Fire |
|---|---|---|---|
| PASLANMAZ 304 ÇUBUK | 7,9 | Bantlar 2,85 / 2,95 / 3,40 $ (kur 50) + kilo fiyatı 3,20 $ | kg tablosu |
| PASLANMAZ 304 BORU | 8,0 | Kilo fiyatı ~4,08 $ (teyit) | kg tablosu ya da yüzde |
| POM DELRİN | 1,42 | Ø20-150 → 175 TL · Ø151-285 → 190 TL | %10 |
| DELRİN LEVHA | 1,42 | 190 TL | %10 |
| POM KESTAMİD | 1,15 | Ø15 → 1.270 · Ø20 → 1.180 · Ø30 → 1.015 · Ø50 → 880 · Ø80 → 330 TL | %10 |
| POM TEFLON | 2,2 | 10,5 $ | %10 |
| ALÜMİNYUM 5083 | 2,66 | 290 TL | boş |
| ALÜMİNYUM 6013 | 2,70 | 295 TL | boş |
| KESTAMİT 7075 | 1,15 | 425 TL | boş |
| 8620 SEMENTE | 7,85 | girilmedi | boş |
| 1050 İMALAT ÇELİĞİ | 7,85 | girilmedi | boş |

PASLANMAZ 304 ÇUBUK kartının kg fire tablosu (ilk satır A-R6/2 gereği Ø0; Ø5 yazılıydı ve
altındaki çapta fire eklenmemesi sessiz bir dal olurdu):

| Alt çap | Fire |
|---|---|
| Ø0 | 0 kg |
| Ø21 | 0,05 kg |
| Ø36 | 0,30 kg |
| Ø91 | 0,35 kg |
| Ø101 | 1,00 kg |
| Ø141 | 1,75 kg |

### QA turunda ölçülenler (2026-11-09)

Aşağıdaki yirmi ölçümün hepsi HEAD'de doğrulandı.

- **Ölçüm A.** Spec, kaynağın hangi hücresinin ad, ölçü ve adet olduğunu hiçbir yerde yazmıyor;
  satırın malzeme kartına nasıl bağlandığı da yazılı değil. B-R5 biçimi, B-R7 modeli, B-R6 kit
  adedini tanımlıyor, `malzemeId` cevapsız.
- **Ölçüm B.** `malzeme.js` `malzemeOzeti` fireyi **iki** dalda uyguluyor: fiyat ya da kur eksikken
  dönen dalda ve tam hesapta. İkisi de `fireliKg` döndürüyor ve parça kartı ile sipariş motoru
  ikisini de okuyabiliyor.
- **Ölçüm C.** Fire çarpımının tabanı `hamKg`, yani `hamOlculer` ile işleme payı **eklenmiş**
  ölçülerden hesaplanan ağırlık.
- **Ölçüm D.** `bantlarDogrula` ilk bandın alt sınırını koşulsuz 0 yapıyor (`i === 0`) ve ekranda
  o alan `disabled`; her bandın değeri zorunlu (boş değer `BANT_FIYAT_HATASI`), yazılı "0" kabul
  ediliyor. Yani Context'in Ø5 ile başlayan tablosu olduğu gibi girilemez.
- **Ölçüm E.** `bantSec`, alt sınırı ham çaptan büyük olmayan bir band bulamazsa `null` döndürüyor;
  fiyat tarafında bu dal ilk bandın 0'a sabitlenmesi yüzünden hiç çalışmıyor.
- **Ölçüm F.** `MalzemeManager.jsx` `kaydet`, düzenlemede kaydı eski kayıttan taşıyıp form
  alanlarını **beyaz listeyle** alıyor; listede olmayan her form alanı eski değerine döner. Bant
  düzenleyicisi `FiyatAlanlari` içinde ve o bileşen yalnız **yeni** malzeme kartında çiziliyor.
  "Fiyatı Güncelle" penceresi yalnız `FIYAT_ANAHTARLARI`'nı yazıyor.
- **Ölçüm G.** Sipariş motorunun fire uyarısının koşulu `ks.parcalar.some(p => p.fire > 0)`, yani
  yalnız yüzde. Sipariş kilosu boy adedinden geldiğinde fire hiç eklenmiyor (`boyAdedi * tamKg`).
- **Ölçüm H.** Parça kartının ağırlık satırı `oz.yontem !== "boy"` koşuluyla çiziliyor; boy
  yönteminde ağırlık ve fire satırı hiç görünmüyor.
- **Ölçüm I.** Fire yüzdesinin değişiminin etki önizlemesi bugün de yok; önizleme yalnız
  "Fiyatı Güncelle" penceresinde (`fiyatEtkisi`) var.
- **Ölçüm J.** `kilitAlanlari.js` `AYAR_KILITLI` ve `AYAR_PANEL_DOSYALARI` listeleriyle
  `Settings.jsx`'in panel kimlikleri bekçi testinde iki yönlü karşılaştırılıyor; listeye girmeyen
  yeni panel testi düşürür.
- **Ölçüm K.** `urunAgaci.kitleriGuncelle` kit adedini uyumluluk işaretiyle birlikte yönetiyor;
  işareti olmayan modelde duran kit satırına sonraki düzenleme dokunmuyor (`isaretsizKitteMetni`).
- **Ölçüm L.** Lama ve sacın hacim hesabı aynı (`kalinlik × genislik × boy` ve
  `kalinlik × en × boy`), yani maliyet aynı çıkıyor; kesit metni, ekran etiketleri ve sipariş
  gruplaması ayrışıyor.
- **Ölçüm M.** `urunAgaci.partiAdediCevir` B-R6'nın bölmesini üç ondalığa yarım yukarı yuvarlayarak
  zaten yapıyor; 2 / 70 = 0,029 ve 40 / 70 = 0,571.
- **Ölçüm N.** `constants.js` `ALTUNMAK_MODELS` altı model taşıyor: AK100_DS, AK100_DSC, AK120_DS,
  AK120_DSC, AK140_DSC, SWP140_DSC. "AK100", "AK120", "AK140" ve "SWP140" adlı model yok; kit ve
  sipariş motoru model adını birebir (`trLower`) eşliyor.
- **Ölçüm O.** `malzemeOzeti` kilo fiyatı ya da dövizde kur yoksa `maliyetK: null` döndürüyor ve
  `maliyetKalemleriOzeti` bir malzeme kalemi çözülemediğinde toplamı `null` yapıyor; yani fiyatsız
  malzemeye bağlı parçanın maliyeti "girilmedi" çıkıyor.
- **Ölçüm P.** `PartManager` toplu fiyat kipi değişikliğini **tek** iz satırıyla yazıyor
  (`entityName: "n parça"`); etiket bekçisi her yeni `action` ve `entity` sabitinin İşlem Geçmişi
  haritalarında olmasını istiyor.
- **Ölçüm R.** Birleştirme yalnız `MERGE_KEYS` **eklemelerini** geri uyguluyor; var olan kaydın
  düzenlemesi sunucu kopyasına yeniliyor ve `standardModels` hiç birleşmiyor. Kit satırı var olan
  model kaydının düzenlemesidir.
- **Ölçüm S.** Fire çarpımı bugün dört yerde: malzeme motorunun boy yolu, eksik dalı ve kilo yolu,
  artı `siparisIhtiyaci.js`'in boy yolu (`p.oran * (1 + p.fire / 100) * p.adet`). 0132'nin var olan
  taraması özgül ağırlığı arıyor, fireyi aramıyor.
- **Ölçüm T.** `SettingsImport.jsx` içe aktarmayı 20 MB ve 50.000 satırla sınırlıyor (xlsx
  paketindeki kapanmamış prototip kirlenmesi ve ReDoS açığı yüzünden), `sheet_to_json`'u
  `raw: false` ile çağırıyor ve yalnız **ilk** sayfayı okuyor (`wb.SheetNames[0]`).
- **Ölçüm U.** `parts` bölümü sunucuda `stockActions` grubunda ve sekme eşlemesi `["settings"]`;
  `EYLEM_IDLERI`'nde kaydı yok, yani ekleme bölüm düzeyinde geçiyor. C6 doğrulandı: yeni izin
  gerekmiyor. Bilinen sınır (0087 C7): `stockActions` açıkça boş bırakılmış kullanıcı parça
  yazamaz, aracı da kullanamaz.

### QA turunda verilen kararlar (2026-11-09)

1. **Bloklayıcı**, B-R3/2, B-R3/3 ve B-R2/2: kaynağın sütun haritası uygulamadan önce ölçülüp
   Ek 3'e yazılır, malzeme eşlemesi iki kademeli kural olur, malzeme kartlarının varlığı ön
   koşuldur ve önizleme eksik kartı adıyla söyler.
2. **Bloklayıcı**, B-R7: model eşlemesi **önek** eşlemesine çevrildi; `100_` adı `AK100` ile
   başlayan bütün canlı modellere gider.
3. **Bloklayıcı**, B-R6 ve B-R6/2: önekli satır kendi modelinin makina adedine bölünür; adet
   girilmemişse satır kitsiz oluşur ve raporda işaretlenir.
4. **Bloklayıcı**, X1, B-R11/2, AC-43 ve DoD: hesap yapan dört sayfanın altı malzemesinin fiyatı
   bu işin kapsamına alındı; X1 kalan üç sayfaya daraldı.
5. **Bloklayıcı**, X9 ve B-R3: hesap yapmayan üç sayfa (50 satır) kapsam dışı.
6. **Önemli**, C2: tek yer kuralı "kilogram fire"ye daraltıldı; yüzdenin boy yolundaki kopyası
   0134 Karar 48'in gerekçeli istisnası olarak yazıldı.
7. **Önemli**, A-R9, A-R6/2 ve Context tablosu: fire bandının doğrulayıcısı ayrı yazılır, alt
   sınırlar serbest girilir, kilogram zorunlu ve sıfır geçerli; en alt bandın altında fire
   eklenmez ve önerilen tablonun ilk satırı Ø0 oldu.
8. **Önemli**, A-R1/2: tablonun düzenleyicisi düzenleme kipinde de çizilir ve kartın beyaz
   listesine eklenir.
9. **Önemli**, A-R11/2: kilogram fire, fiyatı eksik malzemenin ağırlık özetine de girer.
10. **Önemli**, A-R12, A-R12/2 ve AC-17: kilogram fire Fire kg sütununa girer, boy adedinden gelen
    sipariş kilosu değişmez; uyarının koşulu yüzde ya da kilogram olur.
11. **Önemli**, A-R13/2: boy yönteminde neden yeni bir satırda, tek sabitten ve yalnız tablo
    doluyken yazılır.
12. **Önemli**, B-R1/2: araç kendi paneli olur, kilit listelerine girer ve kayıt anında parça ile
    model panellerinin kilidine bakar.
13. **Önemli**, B-R9/2: atlanan satırın kit satırı da yazılmaz ve rapor bunu ayrı sayar.
14. **Önemli**, B-R8/2: ad önekleri ve "(… İÇİN)" ibaresi adından temizlenir, karşılaştırma
    temizlenmiş adla yapılır.
15. **Önemli**, B-R5 ve B-R5/2: üç ölçülü satırın varsayılanı sac; yalnız Ek 1'in iki satırı lama.
16. **Önemli**, B-R3/4 ve X10: oluşan parça uyumluluk işaretini taşır; fiyat kipi, kod ve tip
    yazılmaz.
17. **Önemli**, C5: kaynak dosyanın savunması sayılarak yazıldı (boyut, satır, `raw: false`, sayfa
    eşlemesi, prototip kirlenmesi).
18. **Önemli**, B-R10/2 ve Ek 1: iki boru satırının kit adedi yazılmaz ve raporda işaretlenir;
    Ek 1'in "25 makina" notunun Ek 2 ile çeliştiği yazıldı.
19. **Önemli**, B-R13/2: araç sunucu PC'de ve başka yazım yokken çalıştırılır, kayıttan sonra
    doğrulama turu yapılır.
20. **Küçük**, B-R12/2: iz kaydı tek özet satırıdır ve etiketi İşlem Geçmişi haritalarına eklenir.
21. **Küçük**, A-R2 ve A-R2/2: formülün tabanı "ham kg" olarak yazıldı, "net" sözcüğü bırakıldı.
22. **Küçük**, A-R14: kullanıcıya görünen metinler adlı sabitte ve tek yerde toplandı.
23. **Küçük**, A-R15: örnek malzemelerden biri kilogram tablosu taşır.
24. **Küçük**, B-R15: araç kalıcıdır, kaldırma maddesi yoktur.
25. **Küçük**, B-R16: saf modülün kimliği ve günü parametredir.
26. **Küçük**, AC-42: kriter ölçülebilir hâle getirildi (ham HTML yok, yazdırma yok).
27. **Küçük**, Context: dört ölçüm düzeltildi (91 ve 87 satır, AK140 fire payı %7,35, fire payı
    tabanı, teyit #2'nin satır sayısı).
28. **Küçük**, B-R8/3: aynı sayfadaki iki öneksiz satırda ad sonuna ölçü yazılır.
29. **Küçük**, A-R16: fire alanları değişince kartın kaydında etki özeti gösterilir.

### QA turu karar kaydı (2026-11-09)

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Sütun haritası ve malzeme eşlemesi tanımsız | Bloklayıcı | İki kademeli eşleme, harita ön koşul, kart ön koşulu | B-R2/2, B-R3/2, B-R3/3 |
| 2 | Model adları katalogda yok | Bloklayıcı | Önek eşlemesi | B-R7 |
| 3 | Kit formülü önekli satırda yanlış | Bloklayıcı | Model başına adet, yoksa kitsiz | B-R6, B-R6/2 |
| 4 | X1 ile AC-43 çelişiyor | Bloklayıcı | Altı kartın fiyatı kapsamda | X1, B-R11/2, AC-43, DoD |
| 5 | Üç düz liste sayfası | Bloklayıcı | Kapsam dışı | X9, B-R3 |
| 6 | C2'nin tek yer kuralı kodla çelişiyor | Önemli | Kural kilograma daraltıldı | C2 |
| 7 | "Fiyat bantlarıyla aynı kurallar" tutmuyor | Önemli | Ayrı doğrulayıcı, Ø0 ilk band | A-R6/2, A-R9, Context |
| 8 | Kartın beyaz listesi ve düzenleme kipi | Önemli | Düzenleyici iki kipte, listeye eklenir | A-R1/2 |
| 9 | Fire iki dalda hesaplanıyor | Önemli | Kilogram ikisine de girer | A-R11/2 |
| 10 | Boy adedinde fire sayılmıyor, uyarı yüzdeye bakıyor | Önemli | Sütun değişir, sipariş kilosu değişmez | A-R12, A-R12/2, AC-17 |
| 11 | Boy yönteminde neden çizilecek yer yok | Önemli | Yeni satır ve tek sabit | A-R13/2 |
| 12 | Aracın yeri, kilit kaydı, karşı panel | Önemli | Kendi paneli, kilit listeleri, anlık denetim | B-R1/2 |
| 13 | Atlanan satırın kiti | Önemli | Kit de yazılmaz, rapor sayar | B-R9/2 |
| 14 | Ad normalizasyonu tanımsız | Önemli | Önek temizlenir, karşılaştırma temiz adla | B-R8/2 |
| 15 | Üç ölçülü satır lama mı sac mı | Önemli | Varsayılan sac, Ek 1'in ikisi lama | B-R5, B-R5/2 |
| 16 | Parçanın öteki alanları | Önemli | İşaret yazılır, fiyat kipi yazılmaz | B-R3/4, X10 |
| 17 | C5'in ölçülebilir kuralı yok | Önemli | Sayılarla yazıldı | C5 |
| 18 | Boru satırlarının kit adedi türetilemiyor | Önemli | Kit yazılmaz, işaretlenir | B-R10/2, Ek 1 |
| 19 | Çakışmada kit satırı kaybolabilir | Önemli | Sunucu PC, doğrulama turu | B-R13/2 |
| 20 | İz kaydı parça başına mı | Küçük | Tek özet satırı | B-R12/2 |
| 21 | "net kg" terimi belirsiz | Küçük | "ham kg" yazıldı | A-R2, A-R2/2 |
| 22 | Metin sabitleri tanımsız | Küçük | Metin tablosu | A-R14 |
| 23 | Örnek katalogda tablo yok | Küçük | Bir örneğe eklenir | A-R15 |
| 24 | Aracın ömrü | Küçük | Kalıcı panel | B-R15 |
| 25 | Saf modülün imzası | Küçük | Kimlik ve gün parametre | B-R16 |
| 26 | AC-42 ölçülemez | Küçük | Taramaya çevrildi | AC-42 |
| 27 | Context ölçümleri tutmuyor | Küçük | Dördü düzeltildi | Context |
| 28 | AC-33 iki öneksiz satırda tanımsız | Küçük | Ad sonuna ölçü | B-R8/3 |
| 29 | Fire değişiminin önizlemesi yok | Küçük | Kartın kaydında etki özeti | A-R16 |

---

### Plan turunda verilen kararlar (2026-11-09, revizyon 2)

Kaynak dosya ölçüldü (Ek 3). Takım Yöneticisi planın on altı önerisinin hepsini onayladı.

30. **AC-23, AC-24, AC-25 ve B-R5 sütun düzenine çevrildi.** Hesap yapan dört sayfada ölçü ayrı sütunlarda; spec'teki
    metinler yalnız kapsam dışı sayfalarda (ALÜMİNYUM D8, D3; 8620 SEMENTE M3) geçiyor. Metin ayrıştırıcısı yazılmaz.
31. **Plastikte malzeme E sütunundan.** Sıra: satırın E hücresi (`trLower` ile kart adı), E boşsa sayfa varsayılanı
    (paslanmazda `PASLANMAZ 304 ÇUBUK`, Ek 1'in boru satırı `PASLANMAZ 304 BORU`), metin anahtar sözcüğü yalnız E boşken.
32. **Adedi sıfır satır atlanır** (dört satır, "dişi kalıbın içinden çıkıyor"); neden raporda sayılır, parça oluşmaz.
33. **Teyit #1'in iki öneksiz satırı** (PASLANMAZ KALIP MİLİ, YAN SIYIRICI GRAMAJ İÇİN; ikisi de 70 makinalık sayfada 40 adet)
    adlı sabit tabloyla `AK100` önekli sayılır; kit adedi B-R6/2 ile model adedinden, boşsa kitsiz ve "adedi doğrulanmalı".
34. **Ad çakışması bütün sayfalar üzerinden çözülür.** Temiz ad, malzeme, biçim ve ölçüler aynıysa tek parça. Farklıysa
    **her** parçaya ek yazılır (sıra bağımsız): önekli satırda model öneki `(AK100)`, öneksizde sayfanın önek kümesi
    `(AK100-AK120)` / `(AK140-SWP140)`; ek yine çakışırsa ölçü `(Ø60×175)`. B-R8 ve B-R8/3 bu kuralın özel hâlleridir.
35. **Kesirli kit raporda listelenir:** "MAKİNALIK" notu taşımayan, kit adedi tam sayı olmayan öneksiz satır "kesirli kit,
    doğrulanmalı" listesine girer; kit yine yazılır.
36. **Altı malzeme kartını kullanıcı kurar** (Ayarlar › Katalog › Malzemeler); kod ve örnek katalog kart yazmaz. DoD'nin
    kart maddesi testlerde sentetik kartlarla, gerçek veride sürüm notundaki tabloyla karşılanır.
37. **Paslanmaz boru kartının kilogram tablosu boş önerilir** (tek boru satırı Ø19, Ø0–21 bandında fire zaten 0).
38. **Ad temizliği:** baştan `100`, `120`, `140` (alt çizgi ya da boşlukla), `SWP` (alt çizgi ya da boşlukla) ve
    `(… İÇİN)` ibaresi silinir; ibare önek bilgisi olarak okunur. Ek 1'in iki satırının not içeren adı Ek 1'deki adla
    değiştirilir ("KONVEYÖR BORUSU", "KAZAN İÇ ÇUBUKLARI").
39. **Hücre sayısı tek yardımcıyla okunur:** tek ayırıcılı (nokta ya da virgül) sayı ondalıktır; iki ayırıcı ya da harf
    "ölçü okunamadı" (AC-41).
40. **Aynı ölçünün iki kopyası** (paslanmazda H ve I, plastikte J ve M) farklıysa satır "ölçü tutarsız" nedeniyle atlanır.
    Plastikte biçim E'den, L işareti kullanılmaz.
41. **Doğrulama turu canlıdır:** "beklenen / bulunan kit satırı" panel açık kaldıkça bugünkü model dizilerinden sayılır.
42. **Kit yazımı** `urunAgaci.kitleriGuncelle` ile; kalem 0135 biçiminde (`maliyetKalemleri`, tek malzeme kalemi, adet 1),
    eski `malzemeSatiri` yazılmaz.
43. **Etki özeti tek bileşen:** fiyat penceresinin özet çizimi dışa verilen bir bileşene ayrılır, kartın kaydı onu çizer.
44. **Model adedi girdileri** (AK100, AK120, AK140, SWP140) boş başlar; parti 70 ve 10 ön dolu; girdiler saklanmaz.
45. **AC-43 CI'da sentetik satırlarla** kaynağın formülüne karşı ölçülür; gerçek dosya yalnız yerelde, salt okunarak
    ölçülür ve depoya girmez.

## Acceptance Criteria

### A. Kilogram fire

- **AC-1.** Kilogram tablosu boş olan malzemede parçanın fire dahil ağırlığı spec öncesiyle
  birebir aynıdır.
- **AC-2.** Yüzdesi boş, kilogram bandı 0,30 olan malzemede Ø60 mil parçasının fire dahil
  ağırlığı ham ağırlık + 0,30 kg'dır.
- **AC-3.** Yüzdesi 10, kilogram bandı 0,30 olan malzemede fire dahil ağırlık
  `ham × 1,10 + 0,30` kg'dır; ikisi birlikte uygulanır.
- **AC-4.** Parçanın kaleminde yazılı yüzde malzemenin yüzdesini geçersiz kılar; kilogram
  tablosu yine uygulanır.
- **AC-5.** Bandı seçen değer ham çaptır: çap payı parçayı üst banda taşıdığında o bandın
  kilogramı uygulanır.
- **AC-6.** Kilogramı 0 olan band geçerlidir ve o çapta fire eklenmez.
- **AC-7.** Lama biçimli parçada kilogram tablosu uygulanmaz; yalnız yüzde çalışır.
- **AC-8.** Sac biçimli parçada kilogram tablosu uygulanmaz.
- **AC-9.** Boru biçimli parçada kilogram tablosu ham çapla uygulanır.
- **AC-10.** Kilogram adet başınadır: adedi 3 olan kalemde fire üç kez eklenir.
- **AC-11.** Boy yönteminde kilogram tablosu uygulanmaz ve nedeni kalemde görünür.
- **AC-12.** Alt çapları azalan sırada girilen tablo reddedilir ve nedeni alanın altında görünür.
- **AC-13.** Negatif kilogram reddedilir.
- **AC-14.** Belirsiz yazılmış kilogram (tek noktalı, noktadan sonra üç haneli, virgülsüz)
  reddedilir.
- **AC-15.** Tablo kaydedilince malzemenin fiyat geçmişine kayıt **yazılmaz**.
- **AC-16.** Kilogram tablosu olan malzemeye bağlı parçanın geçmiş tarihli maliyeti bugünkü
  kilogram tablosuyla hesaplanır.
- **AC-17.** Sipariş ihtiyacının **Fire kg sütunu** kilogram fireyi içerir (A-R12).
- **AC-18.** Emniyet payı ve asgari sipariş çıktısı spec öncesiyle birebir aynıdır.
- **AC-19.** Boş tablo veritabanı gövdesine yazılmaz.
- **AC-20.** Kaydedilen tablo veritabanı turunda birebir geri okunur.

### B. İçe aktarma

- **AC-21.** Dosya seçilince önizleme oluşacak parça ve kit satırı sayısını gösterir; hiçbir
  şey yazılmaz.
- **AC-22.** Onaylanınca parçalar ve kit satırları yazılır; başka hiçbir bölüm değişmez
  (kaydedilen gövdeyle ölçülür).
- **AC-23.** *(Revizyon 2, karar 30.)* Paslanmaz sayfasında G = "Ø", H = 60, K = 175 olan satır yuvarlak mil, çap 60, boy 175
  olarak okunur.
- **AC-24.** *(Revizyon 2.)* Plastik sayfasında E = "DELRİN LEVHA", K = 70, J = 390, O = 390 olan satır sac olarak okunur:
  kalınlık 70, en 390, boy 390.
- **AC-25.** *(Revizyon 2.)* Plastik sayfasında E = "POM DELRİN", J = 150, O = 42 olan satır yuvarlak mil, çap 150, boy 42
  olarak okunur.
- **AC-26.** Plastik sayfasında "DELRİN LEVHA" satırı sac, diğer plastikler yuvarlak mil olur.
- **AC-27.** Oluşan parçanın işleme payı alanları boştur.
- **AC-28.** Kit adedi 70 makinalık sayfada 70 adet olan satırda 1'dir.
- **AC-29.** Kit adedi 70 makinalık sayfada 2 adet olan satırda 0,029'dur (üç ondalık).
- **AC-30.** `100_` önekli satır yalnız `AK100` önekli modellerin kitine girer.
- **AC-31.** `(120 İÇİN)` ibareli satır yalnız `AK120` önekli modellerin kitine girer.
- **AC-32.** Öneksiz satır sayfanın bütün öneklerinin bütün canlı varyantlarının kitine girer.
- **AC-33.** Aynı adlı iki satır farklı ölçüdeyse iki parça oluşur ve adlarının sonunda modeli
  yazılıdır.
- **AC-34.** Aynı adlı ve aynı ölçülü iki satır tek parça oluşturur ve iki modelin kitine girer.
- **AC-35.** Kataloğunda aynı adlı canlı parça olan satır atlanır ve raporda nedeniyle görünür.
- **AC-36.** Ekteki dört uydurma satır notundaki gerçek adet ve biçimle aktarılır.
- **AC-37.** Malzemesinin fiyatı girilmemiş parça oluşturulur, maliyeti "girilmedi" çıkar ve
  rapor sayısını yazar.
- **AC-38.** Modeli belirlenemeyen satırın parçası kitsiz oluşturulur ve raporda listelenir.
- **AC-39.** Araç ikinci kez çalıştırıldığında hiçbir parça ikinci kez oluşmaz.
- **AC-40.** Bozuk ya da beklenen sayfaları olmayan dosya seçilirse hiçbir şey yazılmaz ve neden
  ekranda görünür.
- **AC-41.** Ölçüsü okunamayan satır atlanır, nedeni raporda görünür ve kalan satırlar yazılır.
- **AC-42.** Rapor ve önizleme ham HTML yazmaz: `dangerouslySetInnerHTML` kullanılmaz ve yazdırma
  yolu yoktur (kaynak taraması).
- **AC-43.** Aktarma sonrası **fiyatı girilmiş** malzemeden yapılan bir parçanın maliyeti, kaynağın
  aynı satırı için hesapladığı tutarla kabul edilen sapma içinde aynıdır (yuvarlak milde %0,1,
  levhada %0,01). *(Triyaj, 2026-11-09: eşik "%0,1 (levhada %0,01) artı 1 kuruş" okunur: uygulama tutarı kuruşa yuvarlar ve
  9-12 TL'lik parçada yuvarlama geometri sapmasının (%0,075) üstüne biner; ölçümde 10,19 TL ile 10,178 TL farkı 1,2 kuruştur, yani
  "ya da" okuması iki satırı yine kaçırırdı. Ölçümde teflonun iki satırı kartın değeri yüzünden ayrışır (kaynak ₺550/kg, Context
  10,5 $ × 50 = ₺525); kart ₺550 girilirse tutar, sürüm notu kartı ₺550 önerir.)*

### QA turu kriterleri (2026-11-09)

**Kilogram fire**

- **AC-44.** Fire bandının doğrulayıcısı ayrıdır: ilk bandın alt sınırı serbest girilir, 0'a
  sabitlenmez ve girilen değer kaydedilir.
- **AC-45.** Boş bırakılan kilogram reddedilir; "0" yazılı band kabul edilir ve o çapta fire
  eklenmez.
- **AC-46.** En alt bandın alt sınırının altında kalan ham çapa fire eklenmez.
- **AC-47.** Kilogram tablosu olan malzemenin **adı** değiştirilip kaydedilince tablo aynen kalır
  (kaydedilen gövdeyle ölçülür).
- **AC-48.** Tablonun düzenleyicisi hem yeni malzeme kipinde hem düzenleme kipinde çizilir;
  "Fiyatı Güncelle" penceresinde çizilmez ve o pencerenin kaydı tabloya dokunmaz.
- **AC-49.** Kilo fiyatı girilmemiş, kilogram bandı 0,30 olan malzemede parça kartının "fire dahil"
  satırı ham ağırlık + 0,30 kg yazar ve maliyet "girilmedi" kalır.
- **AC-50.** Boy adedi hesaplanan çaplı kesitte sipariş kilosu spec öncesiyle birebir aynıdır
  (kilogram fire sipariş kilosunu büyütmez).
- **AC-51.** Yüzdesi boş, yalnız kilogram tablosu olan malzemede boy adedi hesaplanınca fire
  uyarısı çizilir.
- **AC-52.** Boy yöntemli kalemde `fire-kg-uygulanmadi` satırı yalnız malzemenin kilogram tablosu
  doluyken çizilir.
- **AC-53.** Kartın kaydında fire alanları değiştiyse etki özeti gösterilir; değişmediyse
  gösterilmez.
- **AC-54.** Örnek malzemelerden biri kilogram tablosu taşır ve kartın doğrulayıcısından geçer.
- **AC-55.** Fire bölümünün bütün metinleri adlı sabittedir; ekran dosyasında düz metin yok
  (kaynak taraması).

**İçe aktarma**

- **AC-56.** Araç `ayar:malzemeaktar` kilidi altında çizilir; kimliği `AYAR_KILITLI` ve dosyası
  `AYAR_PANEL_DOSYALARI` listesindedir.
- **AC-57.** Kayıt anında `ayar:yedekparca` ya da `ayar:models` başkasındaysa hiçbir şey yazılmaz
  ve neden kaydın adıyla bildirilir.
- **AC-58.** Hesap yapmayan üç sayfa okunmaz; önizleme atlandıklarını yazar.
- **AC-59.** Malzeme kartları kurulmadan açılan önizleme ön koşul listesini yazar ve yazma düğmesi
  pasif kalır.
- **AC-60.** Satırın malzemesi sayfadan ve satırın kendi metninden eşlenir; eşlenemeyen satır
  atlanır ve raporda nedeniyle sayılır.
- **AC-61.** `100_` önekli satır `AK100` ile başlayan bütün canlı modellerin kitine girer
  (AK100_DS ve AK100_DSC).
- **AC-62.** Önekli satırın modeli için makina adedi girilmemişse parça kitsiz oluşur ve raporda
  "adedi doğrulanmalı" olarak görünür.
- **AC-63.** Model başına adet girilince önekli satırın kit adedi 1 olur (40 adet, 40 makina).
- **AC-64.** Öneksiz satır sayfanın bütün öneklerinin bütün canlı varyantlarının kitine aynı
  adetle girer.
- **AC-65.** `100_`, `120_`, `140_`, `SWP` önekleri ve `(… İÇİN)` ibaresi parça adından temizlenir.
- **AC-66.** Aynı adlı ve aynı ölçülü satır tek parça olur; farklı ölçüde ad sonuna model yazılır,
  iki satır da öneksizse ölçü yazılır.
- **AC-67.** Kataloğunda aynı adlı canlı parça olan satırın kit satırı da yazılmaz ve rapor bunu
  ayrı sayar.
- **AC-68.** Üç ölçülü satır sac biçiminde oluşur; Ek 1'in iki kazan iç çubuğu satırı lama olur.
- **AC-69.** Oluşan parça uyumluluk işaretini (`models`) taşır; fiyat kipi, kod ve tip yazılmaz. *(Triyaj, 2026-11-09: işaret kit
  olmasa da hedef modellere yazılır; Makina Modelleri kartının parça seçicisi yalnız işaretli parçaları listeler, kitsiz parçanın
  kiti oradan girilir.)*
- **AC-70.** İki boru satırı Ek 1'in biçim, ölçü ve malzemesiyle aktarılır; kit adedi yazılmaz ve
  satır raporda işaretlenir.
- **AC-71.** İşlem geçmişine tek özet satırı yazılır ve etiketi İşlem Geçmişi haritalarındadır.
- **AC-72.** Kayıttan sonra doğrulama turu beklenen ve bulunan kit satırı sayısını karşılaştırır ve
  farkı listeler.
- **AC-73.** 20 MB'den büyük ya da 50.000 satırdan fazla dosya okunmaz ve nedeni ekranda görünür.
- **AC-74.** Formül hücresi değer olarak okunur; `__proto__` adlı sayfa ya da anahtar yok sayılır.
- **AC-75.** Saf modül kimliği ve günü parametre alır; modülde `uid()` ve saat okuması yoktur
  (kaynak taraması).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Fire hesabı saf motorda; kilogram bandının seçimi ve eklenmesi tek yerde, yüzdenin boy
      yolundaki kopyası gerekçeli istisna olarak yazılı (kaynak taraması).
- [ ] Fire bandının doğrulayıcısı ayrı; ilk bandın alt sınırı serbest, kilogram zorunlu.
- [ ] Kilogram tablosunun düzenleyicisi kartın iki kipinde de çizilir ve kartın beyaz listesinde.
- [ ] Hesap yapan dört sayfanın altı malzeme kartı Context'teki değerlerle kuruldu (fiyat ve fire).
- [ ] Kaynağın sütun haritası ölçülüp Ek 3'e yazıldı (uygulamanın ön koşulu).
- [ ] Model eşlemesi önek kuralıyla yazıldı ve AK100 gibi adların katalogda olmadığı doğrulandı.
- [ ] Araç kendi Ayarlar paneli; `AYAR_KILITLI` ve `AYAR_PANEL_DOSYALARI` kaydı var, kayıt anında
      parça ve model panellerinin kilidine bakıyor.
- [ ] Kullanıcıya görünen metinler adlı sabitte ve tek yerde (kaynak taraması).
- [ ] Sürüm notu yazıldı: araç sunucu PC'de ve başka yazım yokken çalıştırılır.
- [ ] İçe aktarmanın kararları saf modülde; ekran yalnız gösterip uyguluyor (kaynak taraması).
- [ ] Kilogram tablosu dört nokta kuralıyla eklendi ve `db-roundtrip` testinde.
- [ ] Kıyas altınları spec öncesi koddan üretildi ve birebir tutuyor.
- [ ] **Salt ayar ve araç işi olduğu için yeni eylem izni eklenmedi**, açıkça yazıldı.
- [ ] Kullanıcıya görünen bütün metinler Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (malzeme kartının fire bölümü, içe aktarma
      önizlemesi ve raporu, boş ve hata durumları dâhil).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (fire kuralı ve içe aktarma aracı).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin kararları (2026-11-09)

1. **Fire alanı açılır.**
2. **İçe aktarma yazılır**, elle giriş yapılmaz.
3. **Fiyat şimdilik boş kalır** (8620 ve 1050).
4. **Fire türü seçicisi olmaz: yüzde ve kilogram kartta yan yana durur ve ikisi birlikte
   uygulanır**, diğer fiyat alanları gibi.
5. **Fire tarihlenmez**, fiyat kümesine girmez.
6. **Ölçüler ham ölçü olarak aktarılır**, işleme payları boş kalır; kilo üzerinden fiyatlanan
   dış işlemde kilo tabanının yüksek çıkacağı kabul edildi (0138 ile dış işlem kataloğu
   kalktığı için bu etki bugün yok).

### Müşteriden teyit bekleyen iki nokta

Bunlar cevaplanmadan içe aktarma on satırı yanlış adetle yazar. Araç bu satırları raporda
işaretler, yani aktarma bu cevap olmadan da yapılabilir ve sonra düzeltilebilir.

1. **70 makinalık sayfa 40 AK100 + 30 AK120 mi?** Üç çiftin tam 40 + 30 vermesi bunu söylüyor
   (PASLANMAZ KALIP MİLİ 40 / 120 KALIP YATAK MİLİ 30, YAN SIYIRICI 40 / 120_YAN SIYIRICI 30,
   100_KALIP DİŞİ 40 / 120_KALIP DİŞİ 30). Doğruysa bu altı satır ilgili modelde 1 adettir.
2. **Üç satırın makina başına gerçek adedi nedir?** (QA turu düzeltmesi, karar 27: "dört" yazılıydı,
   üç satır listeliydi.) M12 BAKALİT 250/70 = 3,571 ·
   M10 KAPAĞI SIKAN BAKALİT 100/70 = 1,429 · KAPAK AÇMA PİSTON SİYAH DERLİN YATAK 71/70 = 1,014.
   Kıyas: M10 KAZANI SIKAN BAKALİT 350/70 = tam 5. Yuvarlak lot alındığı için kesir çıkıyor
   olabilir.

Ayrıca **boru kartının kilo fiyatı** hesaplanmış bir değerdir (~4,08 $), et kalınlığı 1,5 mm
varsayıldı; teyit alınması önerilir.

### QA turunun kararlara etkisi (2026-11-09)

QA turu Takım Yöneticisi'nin altı kararını doğruladı ve ikisini daralttı. **Karar 3** (fiyat
şimdilik boş kalır) yalnız alüminyum, 8620 ve 1050 için geçerli kaldı: hesap yapan dört sayfanın
altı malzemesi fiyatsız bırakılsa AC-43 ve Ek 2'nin dört toplam karşılaştırması ölçülemezdi
(ölçüm O). **Karar 4** (yüzde ve kilogram yan yana durur ve ikisi birlikte uygulanır) aynen
yürürlükte, ama alanın doğrulayıcısı fiyat bantlarının doğrulayıcısı olamaz (ölçüm D). Üç iddia
kodla çelişiyordu ve düzeltildi: C2'nin tek yer kuralı, A-R9'un "aynı kurallar" cümlesi ve B-R7'nin
model adları. Aktarmanın kapsamı 141 satırdan **91 satıra** indi (X9).

---

## Ek 1: adedi uydurulmuş dört satır

Kaynakta tutar doğru çıksın diye adedi değiştirilmiş satırlar. Gerçek veri notlarında yazılı.

| Sayfa | Satır | Kaynakta | Gerçek |
|---|---|---|---|
| AK100_AK120 paslanmaz | KONVEYÖR BORUSU | mil Ø19 × 173, adet 29 | **boru** dış çap 19, et 1,5, boy 173; 70 makinaya 2 boy (12 m), 1.600 TL |
| AK100_AK120 paslanmaz | KAZAN İÇ ÇUBUKLARI | mil Ø20 × 125, adet 101 | **lama** 10 × 20, boy 125; makina başına 2 adet (70 makinaya 140); kilo fiyatı 3,20 $ |
| AK140_SWP paslanmaz | KONVEYÖR BORUSU | mil Ø19 × 222, adet 11,5 | **boru** dış çap 19, et 1,5, boy 222; 1 boy (6 m), 800 TL; notu "25 makinaya" diyor ama Ek 2 o sayfanın partisini 10 makina yazıyor, kit adedi B-R10/2 gereği yazılmaz |
| AK140_SWP paslanmaz | KAZAN İÇ ÇUBUKLARI | mil Ø20 × 155, adet 18 | **lama** 12 × 20, boy 155; makina başına 2 adet (10 makinaya 20); kilo fiyatı 3,20 $ |

---

## Ek 2: kaynak dosyanın haritası

| Sayfa | Hesap | Satır | Parti |
|---|---|---|---|
| ALÜMİNYUM | yok, düz liste (üç model bloğu) | 9 + 10 + 17 | — |
| AK100_AK120 PASLANMAZ | var | 24 | 70 makina |
| AK140_SWP PASLANMAZ | var | 19 | 10 makina |
| 8620 SEMENTE | yok, düz liste | 5 + 5 | — |
| 1050 İMALAT ÇELİĞİ | yok, düz liste | 2 + 2 | — |
| 100_120_PLASTİKLER | var | 26 | 70 makina |
| AK140_SWP PLASTİKLER | var | 22 | 10 makina |

Sayfa → model öneki eşlemesi (B-R7; öneksiz satır sayfanın bütün öneklerine ve her önekin bütün
canlı varyantlarına girer):

| Sayfa | Önekler |
|---|---|
| AK100_AK120 PASLANMAZ | `AK100`, `AK120` |
| AK140_SWP PASLANMAZ | `AK140`, `SWP140` |
| 100_120_PLASTİKLER | `AK100`, `AK120` |
| AK140_SWP PLASTİKLER | `AK140`, `SWP140` |

Hesap yapan sayfaların bugünkü toplamı: AK100_AK120 paslanmaz 370.425,07 TL (1 makina
5.291,79 TL), AK140_SWP paslanmaz 125.365,76 TL (12.536,58 TL), 100_120 plastik
304.180,88 TL (4.345,44 TL), AK140_SWP plastik 61.999,47 TL (6.199,95 TL). Bu rakamlar
aktarma sonrası uygulamanın ürettiğiyle karşılaştırılacak ölçüttür (AC-43).

Alüminyum ve çelik sayfalarında fiyat ve kilo bilgisi malzeme **adının içinde** yazılı
("DİŞLİ KUTUSU BAĞLAMA ALT PLAKA 14,8 KG*290 TL 5083"); aktarmada ad olduğu gibi alınır,
içindeki rakamlar ayrıştırılmaz.

---

## Ek 3: kaynağın sütun haritası (uygulamadan önce doldurulacak)

B-R3/3'ün ön koşulu. Hesap yapan dört sayfanın her biri için hangi sütunun ne olduğu ölçülüp
buraya yazılır; harita yazılmadan ayrıştırıcıya başlanmaz (ölçüm A). Satır numarası veri satırının
başladığı yerdir.

Ölçüldü (2026-11-09, plan turu).

| Sayfa | İlk veri satırı | Ad | Ölçü | Adet | Malzeme (varsa) | Not |
|---|---|---|---|---|---|---|
| AK100_AK120 PASLANMAZ | 7 (son 37; 32 ve 33 Ek 1) | C | G biçim işareti ("Ø"), H çap, I = H kopyası, K boy | Q | yok (sayfa varsayılanı) | R |
| AK140_SWP PASLANMAZ | 7 (son 37; 32 ve 33 Ek 1) | C | aynı | Q | yok | R |
| 100_120_PLASTİKLER | 28 (son 58; boş şablon satırları ad hücresi boş) | G | J çap / en, K kalınlık (levhada), L "Ø" / "x", M = J kopyası, O boy | U | E | V |
| AK140_SWP PLASTİKLER | 28 (son 58) | G | aynı | U | E | V |

Ad hücresi boş satır şablondur ve okunmaz. Adedi 0 olan dört satır karar 32 ile atlanır.

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
