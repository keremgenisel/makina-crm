# 0132 — Malzeme kataloğu ve malzemeden türeyen parça maliyeti

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-05, commit `75f8402d`; plan turu Karar 24–34, uygulama Karar 35–40, triyaj Karar 41–46). Kökeni: Takım Yöneticisi'nin 33 sorusu, QA turu 23 bulgu |
| **Sahip** | Analist (yazım) · geliştirici (uygulama) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog (yeni **Malzemeler** paneli), Ayarlar › Katalog › Parça/Yedek Parça, Ayarlar › Çöp Kutusu, Ayarlar › Yedekleme ve İçe Aktar, Makina Maliyeti › Model Maliyetleri, Excel parça şablonu (`src/lib/parcaAktarma.js`), saf motor `src/lib/urunAgaci.js` ve yeni saf malzeme motoru |
| **Bağımlı spec'ler** | 0087 (parça alış maliyeti ve kit), 0096 (hammadde tedarikçisi kırılımı, maliyetin tek okuma yolu), 0097 (maliyetin tarihli geçmişi), 0121 (set içeriğinden maliyet), 0124 (Excel set içeriği sütunu), 0123 (kullanımda olan kaydın kalıcı silinmemesi), 0091 (üretimde işareti), 0088 (Makina Maliyeti ekranı), 0086 (yedek paketleri ve iki bölüm adı sözlüğü), 0128 (kilit kapsam taraması), 0099 (pencere başına tek canlı maliyet) |
| **Daraltılan kriterler** | AC-52 yalnız iki okuyucuyu bağlar (R18/3); 0091'in "Üretimde olmayanları da göster" düğmesi ile stok formu ve Evrak'ın model seçicileri **değişmez**. AC-26 "malzeme satırı olmayan parçada" diye daraltıldı (R16/3). |

---

## Intent

Fabrika yönetimi, tedarikçi hammaddeye zam yaptığında o hammaddeden yapılan parçaların ve yedek parçaların maliyetinin kendiliğinden güncellenmesini istiyor. Bugün "kilo fiyatı" diye bir kayıt yok: fiyat her parçanın içine gömülü duruyor, bu yüzden tek bir zam onlarca parçanın tek tek elle düzeltilmesi anlamına geliyor, bu iş yapılmıyor ve maliyet eskiyor. Müşteri bugün bu hesabı iki ayrı Excel dosyasında, iki ayrı yöntemle tutuyor; ikisinde de malzeme sözlüğü eksik ve formül yuvarlak olmayan malzemeyi yanlış hesaplıyor.

Bu iş bittiğinde kilo fiyatı tek bir yerde, malzemenin kartında duracak. Fiyat değişince o malzemeden yapılan her parçanın maliyeti aynı anda değişecek, elle hiçbir parçaya dokunulmayacak. Geçen ayın maliyeti o günün fiyatıyla kalacak, yani bir zam kapanmış partinin maliyetini bozmayacak.

---

## Requirements

### Malzeme kartı

- **R1.** Malzemeler programda kendi tanım listesidir. Program hazır bir malzeme listesi getirmez; kullanıcı kullandığı malzemeleri kendisi girer.
- **R2.** Bir malzeme kartı şunları taşır: ad, alaşım ya da kalite, özgül ağırlık, kilo fiyatı, fiyatın para birimi, kur, geldiği boy, ana tedarikçi, asgari sipariş şartı ve varsayılan fire yüzdesi. Ad dışındaki alanlar boş bırakılabilir.
- **R2/2.** `asgariSiparis` **kilogram**, `geldigiBoy` **metre** cinsindendir. İkisi de bu spec'te yalnız saklanır, hiçbir maliyet hesabında okunmaz; sipariş yuvarlaması 0134'e aittir (X2).
- **R3.** Kilo fiyatı çapa göre bantlı girilebilir. Her bant bir alt sınır ve bir fiyat taşır; en üst bant üst sınır istemez, açık uçludur. Bandı olmayan malzemede tek kilo fiyatı kullanılır.
- **R3/2.** Bant yalnız çap taşıyan biçimlerde (yuvarlak mil, boru) uygulanır; lama ve sacda malzemenin tek kilo fiyatı kullanılır ve bu kartta yazar. Bandı seçen değer **ham çaptır**, yani işleme payı eklenmiş çap, çünkü satın alınan çubuk o kalınlıktadır.
- **R4.** Kilo fiyatı KDV hariçtir.
- **R5.** Fiyatı döviz olan malzemede kur malzeme kartında sabitlenir ve kuru değiştirmek zam ile aynı muameleyi görür. Fiyat güncelleme penceresinde günün kuru öneri olarak gelir, kaydedilen değer sabitlenen kurdur.
- **R5/2.** Önerilen kur uygulamanın günlük kur verisinden gelir. "Kur bilinmiyor"un iki ayrı nedeni ayrı ayrı yazılır: kur henüz alınmadı ve çevrimdışı olduğu için alınamadı. İki hâlde de kayıt engellenmez.
- **R6.** Malzeme fiyatının tarihli geçmişi tutulur. Fiyat değiştirilirken geçerlilik tarihi girilir; o tarihten önceki hesaplar eski fiyatla kalır.
- **R6/2.** Geçmişin bir satırı fiyat kümesinin tamamının anlık görüntüsüdür: geçerlilik tarihi, fiyat, para birimi, kur ve bantlar. Kur ya da herhangi bir bant değişince yeni satır doğar. Tarih kuralları 0097'den aynen gelir, yalnız saklanan şey tek sayı değildir.
- **R7.** Özgül ağırlığı ya da kilo fiyatı girilmemiş malzeme hiçbir maliyet hesabına girmez. Hesap sessizce sıfır üretmez; eksik malzeme listede işaretlenir ve sayısı ekranda yazar.
- **R7/2.** Kayıtta tanınmayan para birimi bulunursa malzeme eksik sayılır ve ona bağlı parçanın maliyeti "girilmedi" döner. Tanınmayan para birimi TL kovasına katlanmaz.
- **R8.** Kullanımda olan malzeme kalıcı silinmez; silme onayı o malzemeyi kullanan parça sayısını söyler.

### Parçanın malzeme satırı

- **R9.** Bir parçanın maliyeti dördüncü bir kaynaktan, malzeme hesabından türeyebilir. Parça kartında maliyetin kaynağı açıkça seçilir; malzeme hesabı seçiliyken elle girilen maliyet ve tedarikçi kırılımı okunmaz.
- **R9/2.** Maliyetin kaynağı kayıtta **saklanmaz, türetilir** (bugünkü desen korunur); öncelik set içeriği, malzeme satırı, hammadde kırılımı, elle girilen tutar sırasındadır. Kartta kaynak seçmek "o kaynağın alanlarını etkinleştirmek" demektir: malzeme satırı doluyken kırılım ve elle alan pasiftir, set içeriği doluyken malzeme satırı da pasiftir. İkisi aynı parçada bulunabilir, set kazanır ve nedeni kartta yazar.
- **R10.** Malzeme satırı şunları taşır: malzeme, biçim, biçmin istediği ölçüler, işleme payı ve fire.
- **R10/2.** İşleme payı alanları biçimin ölçüleriyle birebir eşlenir: yuvarlak milde çap ve boy payı, boruda çap ve boy payı (et kalınlığına pay eklenmez), lamada kalınlık, genişlik ve boy payı, sacda kalınlık, en ve boy payı. Boş pay sıfırdır.
- **R11.** Biçim bir alandır ve program hangi ölçüyü isteyeceğini biçimden bilir: yuvarlak milde çap ve boy, lamada kalınlık, genişlik ve boy, boruda çap, et kalınlığı ve boy, sacda kalınlık, en ve boy.
- **R12.** İşleme payı ile fire iki ayrı şeydir ve ayrı alanlarda durur. İşleme payı satın alınan ham ölçüye eklenen milimetredir ve çapa ile boya ayrı ayrı girilir; fire talaş ve kesim kaybıdır.
- **R12/2.** Hesap zinciri tek sıradadır: net ölçü, artı işleme payı eşittir satın alınan ölçü, ağırlık, çarpı (1 + fire yüzdesi) eşittir faturalanan ağırlık, çarpı kilo fiyatı çarpı kur, kuruşa yuvarla. "Ham ağırlık" ifadesi bu spec'te **pay dahil ağırlık** demektir; fire payın üstüne biner, altına değil.
- **R13.** Fire yüzde olarak girilir. Parça satırında boş bırakılırsa malzeme kartındaki varsayılan kullanılır; ikisi de boşsa fire sıfırdır ve hesap yine çalışır.
- **R13/2.** Parça satırının fire alanı da malzeme kartındaki varsayılanla aynı doğrulayıcıdan geçer: 0 ile 100 arası, dışındaki değer reddedilir ve nedeni alanın altında yazar.
- **R14.** Boy fiyatından satın alınan malzemede maliyet kilo yerine boy fiyatından hesaplanabilir: girilen boy fiyatı ve bir makinaya giren boy uzunluğu üzerinden.
- **R14/2.** Boy fiyatı ve malzemenin geldiği boy **malzeme kartının** alanıdır, kullanılacak yöntem **parça satırının** alanıdır (kilo ya da boy, varsayılan kilo). Boy yönteminde özgül ağırlık istenmez ve R7'nin kapısı yönteme bakar; tutar, parçanın boy ölçüsü ile boy payının toplamının malzemenin boyuna oranı çarpı boy fiyatı çarpı kurdur ve fire bu orana aynen uygulanır. Malzemenin boyu ya da boy fiyatı boşsa maliyet "girilmedi" döner.
- **R15.** Ara değerler yuvarlanmaz. Ağırlık ekranda üç ondalıkla gösterilir ama hesapta tam değeriyle kullanılır; yuvarlama yalnız para adımında, kuruşa yapılır.
- **R15/2.** Üç ondalıklı gösterimde tam yarım değer yukarı yuvarlanır; hesap R15 gereği tam değerle sürer.
- **R16.** Malzeme fiyatı değişince ona bağlı parçaların maliyeti kendiliğinden değişir. Hiçbir yerde kaydedilmiş bir maliyet toplamı tutulmaz; maliyet okuma anında türer.
- **R16/2.** Malzeme listesi maliyetin tek okuma yoluna **parametre olarak** iner. Liste verilmeyen çağrıda malzeme kaynaklı parçanın maliyeti `null` döner, asla sıfır (0121'in katalogsuz set kuralının ikizi). Parçanın maliyet geçmişini yazan karar motoru malzeme kaynaklı parçada **hiç çalışmaz**.
- **R16/3.** Malzeme kaynaklı parçanın kendi maliyet geçmişine dokunulmaz (silinmez) ve **okunmaz**; tarihli okuma yalnız malzemenin fiyat geçmişinden gelir. Böylece aynı tarih için iki rakam doğmaz.
- **R16/4.** Malzeme listesi hesabın girdisidir: model maliyeti motorunun veri nesnesine ve ekranların önbellek bağımlılıklarına girer. Zammın etkisi **ekranda** okunan rakamla ölçülür, yalnız motorla değil.
- **R17.** Fiyat güncelleme penceresi, uygulamadan önce etkisini gösterir: kaç parçanın maliyeti değişecek ve örnek satırlarda eski ve yeni maliyet nedir.

### Kapsam ve yetki

- **R18.** Hesap yalnız üretimde olan modeller için yapılır: model listeleri ve model seçicileri üretimde olmayan modeli süzer. "Maliyeti girilmemiş" sayımı bütün canlı parçaları sayar ve kit bağına bakmaz (ölçüm gerekçesi Context'te).
- **R18/2.** "Maliyeti girilmemiş" sayacı malzeme listesini alır: malzeme kaynaklı ve malzemesi tam olan parça bu sayıma **girmez**. Çöpteki ya da eksik malzemeye bağlı parça sayımda kalır.
- **R18/3.** Süzme bugünkü iki okuyucuyla sınırlıdır (Makina Maliyeti › Model Maliyetleri ve müşteri formunun model seçicisi); 0091'in "Üretimde olmayanları da göster" düğmesi yerinde kalır, stok formunun ve Evrak'ın model seçicileri bu spec'te **değişmez**.
- **R19.** Kalıp malzemeleri makina maliyetine girmez; kalıp tarafında kalır.
- **R20.** Bu iş yeni bir yetki türü açmaz. Malzeme kartını görmek ve yazmak bugünkü katalog ve Makina Maliyeti yetkisine bağlıdır.
- **R20/2.** Ana tedarikçi seçicisi gider yetkisine bağlıdır (0096 emsali birebir): yetkisiz kullanıcıda alan çizilmez ve saklı değer kayıtta aynen korunur. Kilo fiyatı, özgül ağırlık ve ölçüler açık kalır, çünkü parçanın alış maliyeti alanı bugün de yetkisiz kullanıcıya açıktır.

### Excel ve yedek

- **R21.** Excel parça şablonunun maliyet hücresi malzeme kaynaklı parçada **okunmaz**: içe aktarma o hücreyi almaz ve nedenini satır numarasıyla yazar (hammadde kırılımı ve set içeriği emsalinin kardeşi). Dışa aktarma çözülmüş maliyeti yazmaya devam eder. Malzeme satırı Excel'den girilmez ve şablona yeni sütun eklenmez.
- **R22.** Malzeme listesi yedek dosyasında taşınır ve geri yüklenir; yedek paketinin hangi bölümleri geri yüklediğini söyleyen cümle malzeme listesini de sayar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Maliyetin tek okuma yolu `urunAgaci.parcaMaliyetKurus` / `parcaMaliyetiVar` kalır (0096 C1 ve C9, 0121 C2). Dördüncü kaynak bu fonksiyonun içine girer; ekran, rapor ve dışa aktarma kendi hesabını yazmaz. Malzemeden ağırlık ve tutar türeten çarpımlar kaynakta yalnız yeni saf motorda bulunur ve bu kaynak taramasıyla sabitlenir.
- **C1/2.** Dördüncü kaynak için tek okuma yolu **dördüncü bir parametre** alır (malzeme listesinden bir kez kurulan harita, `setKatalogu` emsali) ve bu parametre setin bileşen hesabına da iner. Liste verilmeyen çağrı `null` döner. Geçmiş yazan karar motoruna 0121'in `set` kapısının ikizi olan malzeme kapısı eklenir; on üç çağrı yerinden hangisinin listeyi geçirdiği uygulama planında tek tek sayılır (ölçüm Context'te).
- **C2.** Hesap React'sız saf motorda yazılır ve kendi testi olur; arayüz yalnız gösterir. Motor saat okumaz, tarihi parametre alır (0097 deseni).
- **C3.** Tarihli okuma 0097'nin kuralını birebir izler: geçerlilik tarihi sorgu tarihinden büyük olmayan en son kayıt uygulanır, boş tarih "başlangıçtan beri" sayılır, sorgu son kaydın aralığına düşerse saklı değer değil bugünkü çözülmüş değer döner.
- **C4.** Malzeme fiyatı KDV hariç matrahtır (0076 R14 ile aynı sınıf); alan KDV ayırmaz.
- **C5.** Yeni kalıcı alanlarda dört nokta kuralı uygulanır. Malzeme listesi yeni bir veri bölümüdür: `BLOB_SECTIONS`, `SECTION_GROUP`, `BOLUM_SEKMELERI`, `MERGE_KEYS` ve `App.mergeLocalIntoReloaded` satırları birlikte yazılır; parçanın malzeme satırındaki malzeme bağı birleştirmede yeniden atanan kimliği izler (0096'nın `tedarikciId` emsali).
- **C5/2.** Bölümün adı `malzemeler`; sunucu haritalarındaki değerleri `SECTION_GROUP: "settings"` ve `BOLUM_SEKMELERI: ["settings"]`'tir. Makina Maliyeti ekranı malzemeyi yalnız okur, yazmaz, bu yüzden haritaya ikinci sekme yazılmaz; `stockActions` grubu seçilmez, yoksa 0087 C7'nin bilinen sınırı büyür.
- **C5/3.** Yeni bölüm C5'in beş yerinden fazlasına dokunur: yedek paketinin `bolumler` listesi, geri yükleme dalı, kimlik sayacı listesi ve **iki** bölüm adı sözlüğü (istemci ile sunucu, birebir aynı olmak zorunda). Dördü yazılmazsa 0086'nın kapsam ve eşitlik testleri kırılır ve yedekten dönen kullanıcı malzemelerini kaybeder.
- **C6.** Malzeme paneli Ayarlar panel kilidini alır ve kimliği `kilitAlanlari.AYAR_KILITLI`'ya yazılır; yoksa 0064'ün kapsam taraması kırılır.
- **C6/2.** Panel kimliği `AYAR_KILITLI`'ya yazılırken yeni dosyalar (malzeme paneli ve fiyat güncelleme penceresi) `KILIT_ALANLARI.ayar.pencereler` listesine de yazılır. 0128 R11'in taraması bölüm adlarından setter adı türetir ve yazan her dosyayı kapsar; liste eksikse iş yeşil takımla bitmiş sanılır, sonraki turda kırılır.
- **C7.** Malzeme kartı çöp kutusuna gider (tedarikçi ve üretim partisi emsali, 0068): `deletedAt` damgası, geri alma, kalıcı silme ve otuz günlük temizlik. Kullanımda olan malzeme kalıcı silinmez ve nedeni satırda yazar (0096'nın kırılımda geçen tedarikçi koruması ile aynı sınıf).
- **C7/2.** Ad karşılaştırması `trLower` iledir (aynı malzeme iki kez girilmesin); kayıtta kullanıcının yazdığı biçim korunur. Aynı ölçüt kayıt denetiminde ve çöpten geri almada kullanılır. Çöp satırının etiketi tek yardımcıdan gelir (ad, varsa nokta ile alaşım); üç yerde üç ayrı metin yazılmaz.
- **C8.** Geriye dönük uyum: bugünkü üç maliyet kaynağı (elle girilen tutar, tedarikçi kırılımı, set içeriği) aynen çalışır. Malzeme satırı olmayan parçanın maliyeti, liste hücreleri, dışa aktarma satırları ve model maliyeti rakamları spec öncesiyle **birebir** aynıdır ve bu bir kıyas testiyle sabitlenir (0121 AC-14 ve 0096 kıyas emsali).
- **C9.** Ana tedarikçi Giderler'in tedarikçi listesinden seçilir; yeni bir tedarikçi kavramı açılmaz (0096'nın `hammadde` işareti okunur).
- **C10.** Göç yazılmaz. Var olan parçaların elle maliyeti ve tedarikçi kırılımı olduğu gibi kalır; malzeme satırı kullanıcı girdikçe doğar.

### KAPSAM DIŞI

- **X1.** Satış fiyatının maliyetten türemesi: kâr katsayısı, yuvarlama, parça başına "fiyatı elle sabit" kipi, zam sonrası fiyat listesi — *neden:* kendi spec'ini hak ediyor (öneri sırasında **B**). Bu spec maliyeti düzeltir, ticari kararı taşımaz; maliyet doğru olmadan fiyat türetmek yanlışı büyütür.
- **X2.** Tedarikçi sipariş ihtiyacı ekranı (model ve makina adedinden kilo, boy ve tutar) — *neden:* kendi spec'i (**C**); malzeme kartı onun önkoşuludur, tersi değil.
- **X3.** Hurda ve talaşın geri satılması — *neden:* Takım Yöneticisi kararı (soru 21); getireceği doğruluk, ekleyeceği karmaşıklığa değmiyor.
- **X4.** Kalıp malzemelerinin makina maliyetine katılması — *neden:* soru 19; kalıbın satışı (Extra Kalıp) ve modelin kalıp liste fiyatı ayrı alanlardır, ikisini tek maliyete katmak çift sayım yapar.
- **X5.** Müşterinin Excel dosyasındaki AKF ile başlayan model adlarının katalogla eşleştirilmesi ve eski adların göçü — *neden:* soru 18; hesap yalnız üretimde olan modeller için yapılacak, artık üretilmeyen makinaların adlarını eşlemek boşa iş.
- **X6.** Kilo fiyatının günlük kurla kendiliğinden değişmesi — *neden:* soru 28; her gün değişen bir fiyat listesiyle teklif vermek zorlaşır, aynı parça iki günde iki fiyattan çıkar.
- **X7.** Müşterinin iki Excel dosyasının içe aktarılması — *neden:* soru 2, kullanıcı malzemelerini kendisi girecek. Dosyaların altı ölçülmüş kusuru var (boş özgül ağırlık, parça adının içine yazılmış kilo ve fiyat, yuvarlak olmayan biçim hatası, elle düzeltilmiş adetler, boşalan bant hücreleri, iki ayrı yöntem); bozuk veriyi taşımak hatayı da taşır.
- **X8.** Bir malzemenin birden çok tedarikçisi — *neden:* soru 31; tek ana tedarikçi yeterli, çoklu tedarikçi ikinci aşamada eklenir.
- **X9.** Kit adedinin ondalık olabilmesi — *neden:* adet sorusu (16 ve 17) sipariş hesabının konusudur ve 0134'e aittir; Takım Yöneticisi 2026-11-05'te kit adedinin ondalık olmasını seçti ve kural 0134'te yazılı. Ölçüm bu spec'in Context'inde duruyor ki bağ kopmasın.
- **X10.** Teflon ve kestamitin listede kalıp kalmayacağı (soru 3) ve "BAKALİT PASLANMAZ" satırının gerçekte hangi malzeme olduğu (soru 5) — *neden:* soru 2'nin cevabı ikisini de çözüyor. Program hazır liste getirmediği için teflonun listede durup durmaması kullanıcının kendi kararı; bakalit satırı da müşterinin kendi dosyasındaki bir veri hatasıdır, parçayı girerken malzemesi seçilir.

- **X11.** Malzemelerin genel aramaya eklenmesi — *neden:* plan turu Karar 29; 0125'in katalog araması parçayı zaten buluyor, malzeme araması kendi kapısını ve tıklama hedefini ister ve kriteri yazılmadı.
---

## Context

### Bugünkü maliyet zinciri ve eksik olan tek kavram

- Maliyetin tek okuma yolu `src/lib/urunAgaci.js:47` `parcaMaliyetKurus(p, tarih, katalog)`; öncelik **set içeriği > hammadde kırılımı > elle girilen tutar** (satır 28-46 yorumu). Dördüncü kaynak bu fonksiyonun içine girer.
- `parts[].hammaddeler = [{ tedarikciId, tutar }]` bir **TL tutarıdır, fiyat listesi değil** (`urunAgaci.js:28`). Yani bugün "304 paslanmazın kilosu 2,95 $" diyen hiçbir kayıt yok: fiyat her parçanın içine gömülü. Zam zincirinin eksik tek kavramı budur ve şikâyetin kaynağı tam olarak buradadır.
- Uygulama bugünkü elle telafiyi kendi ipucusunda adıyla sayıyor: `urunAgaci.js:15` `EK_MALIYET_IPUCU` "kilo bazlı hammadde"yi model kartındaki ek maliyet kalemlerine yazmayı öneriyor. Yani kilo hesabı bugün modelin ek maliyet satırına elle yazılan bir tutar olarak yaşıyor.
- Tarihli geçmiş altyapısı hazır: `maliyetGecmisi` ve `maliyetGecmisiYaz` (spec 0097). Malzeme fiyatının geçmişi aynı deseni izler, bu yüzden zam kapanmış partinin maliyetini değiştirmez.

### Otomatik maliyetin geçmiş belgeleri bozmadığı ölçüldü

- Satış fiyatı maliyetten bağımsız ve elle giriliyor (`src/lib/utils.js:578` `partFiyatForCurrency`), ve her satış yolunda fiyat **seçim anında belgenin içine kopyalanıyor**: `src/components/Documents.jsx:720`, `src/components/YedekParcaSatisForm.jsx:59`, `:148`, `:190`, `src/components/ServiceForm.jsx:416`, `:515`. Ölçülmüş sonuç: maliyet kendiliğinden değişince gönderilmiş teklif, kayıtlı servis ve yedek parça satışı kendi fiyatını korur. Soru 26'nın cevabı bu yüzden ek iş gerektirmiyor.

### Hazır olan altyapı

- **Üretimde işareti:** `src/lib/uretimdekiModeller.js` `uretimdeMi(ayar, ad)` (spec 0091); saklama `appSettings.uretimdeOlmayanModeller` = üretilmeyen adların listesi. Model Maliyetleri, Parti Hesabı'nın planlanan adetler penceresi ve müşteri formunun model seçicisi bunu zaten süzüyor. Soru 18'in istediği süzme yeni bir mekanizma gerektirmiyor.
- **Kur:** `src/App.jsx:778` `rates` = `{ usd, eur }` (1 birim kaç TL), çevrimdışıyken `ratesErr`. Günün kurunu bir kayda sabitlemenin emsali `src/lib/satisKaydi.js:16` `satisKuruUygula`.
- **Tedarikçi:** tedarikçinin `hammadde` işareti ve parçanın kırılımındaki `tedarikciId` bağı spec 0096'dan var. Malzemenin ana tedarikçisi aynı listeden seçilir.
- **Panel kilidi:** `src/lib/kilitAlanlari.js:54` `AYAR_KILITLI` kilitlenen Ayarlar panellerinin kimliklerini tutar.

### Müşterinin iki Excel dosyasından ölçülenler

- AK100_DS listesinde 24 paslanmaz, 5 semente çelik (8620) ve 2 imalat çeliği (1050) satırı var; kalıp dosyasında 26 derlin satırı. 9 alüminyum satırı var ama hangi alaşım olduğu yazılı değil.
- Özgül ağırlık sözlüğünde 304 paslanmazın hücresi **boş** (en çok kullanılan malzeme), alüminyumlar listede hiç yok, 8620 ve 1050 için 7,8 yazıyor (bu malzemelerin bilinen değeri 7,85).
- Formül lamayı ve boruyu yuvarlak mil gibi hesaplıyor, kalınlığı hiç okumuyor: kazan iç çubuğu (10 x 20 x 125 lama) dosyada 0,310 kg yazıyor, doğrusu 0,196 kg; konveyör borusu (Ø19, et 1,5, boy 173) dosyada 0,387 kg, doğrusu 0,112 kg. Yani 1,57 ve 3,44 kat şişik.
- Çap bandı tablosunda Ø181 ve üstünde fire hücresi boşalıyor, Ø186 ve üstünde kilo fiyatı da boşalıyor; dosyadaki en kalın parça Ø180, yani sınırın bir adım altında.
- Fire sabit kilo girildiği için boy uzadıkça anlamını yitiriyor: aynı 0,30 kg fire Ø50 x 138 parçada ağırlığın %14'ü, Ø90 x 88 parçada %6,8'i.

### Bilinen tuzaklar

- **Kit adedi tam sayıdır, motor değil doğrulayıcı kısıtlıyor:** `src/lib/urunAgaci.js:255` `kitAdediDogrula` yalnız `^\d+$` ve 1'den büyük değer kabul ediyor, oysa motor `src/lib/makinaStandartMaliyet.js:207` `Number(r.miktar)` ile ondalığı sorunsuz okuyor. Aynı doğrulayıcıyı set içeriği de kullanıyor (`urunAgaci.js:460`). Müşterinin listesinde 70 makinaya 8 adet giren parça var, yani makina başına 0,114 adet. Bu spec kit adedine **dokunmaz** (X9), ama **C** yazılırken bu ölçüm kararın girdisidir.
- **Boş değer gövdeye yazılmaz:** yeni alanlar okumada boş değerle gövdeye girmemeli (0100, 0101, 0114 deseni), yoksa sunucunun karşılaştırması her kaydı "değişmiş" görür ve sekmesi kısıtlı kullanıcı 403 alır.
- **Boş liste anahtarı silmez:** malzeme listesi uygulama ayarına değil kendi bölümüne yazılır, bu yüzden 0091'in `undefined` kuralı burada geçerli değil; ama yeni bölüm `mergeLocalIntoReloaded` satırını almadan eklenirse bu PC'de yeni girilen malzeme ilk yenilemede sessizce kaybolur (`calisanlar` bu şekilde kaybolmuştu).

### Ölçüldü (2026-11-01 yedeği)

- **380 canlı parça** var; 137'sinin maliyeti çözülüyor, **243'ünün maliyeti girilmemiş**.
- Çözülen 137'nin **133'ü hammadde tedarikçisi kırılımından** geliyor (0096 yoğun kullanımda), 4'ü elle girilen tutardan, **sıfırı set içeriğinden** (0121 yeni yayınlandı, hiçbir setin içeriği henüz girilmemiş). Yani C8'in kıyas kümesi 133 parçadır ve bu kayıtların rakamı bu spec'ten sonra değişmemelidir.
- 45 canlı tedarikçinin **32'si hammadde işaretli**, yani ana tedarikçi seçicisi (AC-15) gerçek bir liste gösterecek.
- **22 model** var ve **15'i "üretimde değil" işaretli**: üretimde yalnız 7 model kaldı. Soru 18'in süzmesi model listelerinde çok etkili.
- Kitte geçen 135 parçanın **hiçbiri yalnız üretimde olmayan modelin kitinde değil** (sayı sıfır): üretimdeki 7 modelin kitleri, kitte geçen bütün parçaları kapsıyor. Buna karşılık **245 parça hiçbir kitte geçmiyor**; bunlar yalnız yedek parça olarak satılan kalemlerdir ve maliyetleri 0133 için gereklidir, yani sayımdan çıkarılmamalıdır.
- Bu son ölçüm R18'in sayaç yarısının bugün hiçbir şeyi değiştirmediğini gösterdi; karar aşağıdadır.

### Ölçümden sonra verilen karar: R18'in sayaç yarısı kalktı

R18 ilk yazımında iki şey söylüyordu: (a) model listeleri üretimde olmayan modeli süzer, (b) üretimde olmayan modelin kitinde geçen parça "maliyeti girilmemiş" sayımına girmez. Ölçüm (a)'yı güçlü, (b)'yi **boş** buldu: yalnız üretimde olmayan modelin kitinde geçen parça sayısı sıfırdır ve asıl sinyal başka yerdedir (245 parça hiçbir kitte geçmiyor, yani sayımın büyük kısmı kitle ilgisiz yedek parçalardan geliyor).

**Takım Yöneticisi 2026-11-05'te (b)'nin kalkmasını seçti** (analistin önerisi). R18 yalnız model listesi süzmesidir; sayım bütün canlı parçaları sayar ve kit bağına bakmaz. AC-52 ile AC-53 bu yönde yeniden yazıldı: biri süzmeyi, öteki sayımın kit bağına bakmadığını sabitliyor. Bu, spec onaylandıktan sonraki **birinci revizyondur** (SCORECARD'a yazılır).

### QA turunda ölçülenler (2026-11-05)

- **Ölçüm A (tek okuma yolunun imzası).** `src/lib/urunAgaci.js:47` `parcaMaliyetKurus(p, tarih, katalog)` üç parametre alıyor ve dördüncü kaynağın ihtiyacı olan malzeme listesine yer yok. Dört kaynağın hesabı `tekilMaliyetKurus` (`:51`) içinde; setin bileşen hesabı `setOzeti` (`:76`) onu doğrudan çağırıyor, yani AC-58'in "bileşenin malzemeden hesaplanan maliyeti sete yansır" iddiası da aynı imzaya bağlı. Bu, R16/2 ile C1/2'nin gerekçesidir.
- **Ölçüm B (listesiz çağrı yerleri).** Tek okuma yolunun on üç çağrı yeri var; üçü hiçbir şey geçirmiyor: `urunAgaci.js:166` (`gecmisliKayit` içindeki `parcaMaliyetKurus(temel)`), `PartManager.jsx:443` (formun canlı maliyeti), `parcaAktarma.js:175` (içe aktarmanın kırılım denetimi). Bu yüzden malzeme kaynaklı parça kaydedilirken maliyet "girilmedi" olarak çözülür ve yanlış bir geçmiş satırı doğar; R16/2'nin ikinci yarısı (geçmiş kapısı) tam bunu kapatır.
- **Ölçüm C (saklanan kaynak alanı yok).** Bugün kaynak alanı yok; öncelik örtük (`urunAgaci.js:47`: set, kırılım, elle) ve `maliyetKaynagi` (`:191`) onu yalnız göstermek için türetiyor. Pasiflik satırların varlığından geliyor (`PartManager.jsx:594`, `:653`). R9/2 bu deseni dördüncü kaynağa genişletir; saklanan bir alan 380 parçada göç isterdi ve C10 göç yazılmayacağını söylüyor.
- **Ölçüm D (bant bir çap kavramı).** Müşterinin bant tablosu çap eşikleriyle kurulu (Ø181 ve Ø186), oysa AC-29'a göre lamanın ve sacın çapı yok. R3/2 bandı çaplı biçimlere daraltır; dosyadaki en kalın parça Ø180, yani sınırın bir adım altında, dolayısıyla ham ile net ölçü ayrımı gerçek bir fiyat farkı üretir.
- **Ölçüm E (Excel'in üç kaynak için kuralı var, dördüncüde yok).** `parcaAktarma.js:27` dışa aktarmada çözülmüş maliyeti yazıyor; içe aktarma kırılımlı parçada (`:175`) ve setli parçada (`:181`) maliyet hücresini almıyor ve nedenini satır numarasıyla bildiriyor. Şablon on bir sütun (`PARCA_AKTARMA_BASLIKLARI:11`) ve malzeme satırı yedi alan taşıyor, yani tek hücreye sığmıyor. R21'in gerekçesi budur.
- **Ölçüm F (tedarikçi listesinin bugünkü kapısı).** 0096 C11 tedarikçi listesini parça paneline gider yetkisiyle kapatarak veriyor (`Settings.jsx:283`) ve hammadde bölümü yetkisiz kullanıcıda hiç çizilmiyor (`PartManager.jsx:594`); buna karşılık elle maliyet alanı kapısız. R20/2 bu sınırı malzeme kartına aynen taşır, kaydırmaz.
- **Ölçüm G (bölüm haritalarının bugünkü değerleri).** `parts` → `SECTION_GROUP: "stockActions"`, `BOLUM_SEKMELERI: ["settings"]` (`serverAuth.cjs:44`, `:110`); `kalipDefs` ve `partTypeDefs` → `"settings"` (`:50`, `:122`); `standardModels` ve `customModels` iki sekme taşıyor (`:126`). C5/2 malzemeyi katalog emsaline bağlar.
- **Ölçüm H (yedek paketlerinin kapsam testi).** 0086 AC-15 paketlerin `bolumler` birleşiminin bütün veri bölümlerine (bugün 32) **eşit** olmasını, AC-17 kimlik sayacı listesinin kimlikli bölümleri kapsamasını sabitliyor (`tests/yedek-paketleri-0086.test.js:154`, `:162`); iki `BOLUM_ADLARI` sözlüğü (`src/lib/bolumAdlari.js` ve `electron/server.cjs`) birebir aynı olmak zorunda. C5/3 bunun dört satırını sayar.
- **Ölçüm I (kilit kapsam taraması bölüm adlarından türüyor).** 0128 R11'in taraması `BLOB_SECTIONS`'tan setter adlarını türetip `src/components` altında veri bölümüne yazan her dosyayı kapsıyor; dört katalog yöneticisi bu yüzden `ayar`ın pencere listesinde (`kilitAlanlari.js:43`). Yeni bölüm eklenince ölçüt kendiliğinden büyüyor, C6/2 bunu karşılar.
- **Ölçüm J (önbellek bağımlılıkları malzemeyi bilmiyor).** `MakinaMaliyeti.jsx:40-41` motoru üç diziyle çağırıyor ve bağımlılık dizisinde malzeme yok; motorun veri nesnesi de üç dizi (`makinaStandartMaliyet.js:239`). R16/4 yazılmazsa zam kaydedilir, veri doğru olur, ama Model Maliyetleri eski rakamı göstermeye devam eder.
- **Ölçüm K (sayaç bugün kit bağına bakmıyor).** `PartManager.jsx:381` sayacı bütün canlı parçaları sayıyor; AC-53 bu yüzden bugünkü davranışın bekçisidir. Aynı sayaç malzeme listesini almazsa malzeme kaynaklı her parça "maliyeti girilmemiş" görünür ve 243 rakamı hiç düşmez, yani işin görünür faydası kaybolur (R18/2).
- **Ölçüm L (süzmenin üç okuyucusu).** Üretimde işaretini okuyan yalnız üç yer var: `ModelsManager.jsx:132` (kutunun kendisi), `MakinaMaliyeti.jsx:39`, `CustomerAddEditForm.jsx:198`. Model Maliyetleri'nde ayrıca "Üretimde olmayanları da göster" düğmesi var (`ModelMaliyetleri.jsx:58`, `:84`). AC-52'nin ilk yazımı harfiyen uygulansa stok formu ile Evrak'ın seçicileri değişir ve 0091'in bilinçli kapsamı ters çevrilirdi; R18/3 kriteri bekçiye indirir.
- **Ölçüm M (kur Ayarlar'a hiç gitmiyor).** `App.jsx:778` `rates` ve `:779` `ratesErr`; `Settings` ikisini de almıyor. Ayrıca `rates` açılışta henüz getirilmemişken de `null`, yani "bilinmiyor"un iki nedeni var ve AC-10 yalnız çevrimdışını anıyor. R5/2 iki hâli ayırır ve prop zincirini şart koşar.
- **Ölçüm N (aritmetik doğrulandı).** Spec'in örnekleri tutuyor: pay dahil ağırlık 10,678741 kg, fire dahil 11,533040 kg, sonuç 1.701,1235 ₺, yani AC-38'in 1.701,12 ₺ rakamı doğru ve AC-39'un "ara değer yuvarlanmaz" iddiası kendi içinde tutarlı. Buna karşılık AC-33'ün 0,3925 kg sonucu tam yarım değerdir ve yuvarlama yönü yazılı değildi (R15/2).

### QA turunda verilen kararlar (2026-11-05)

Takım Yöneticisi analistin 23 bulgusunun hepsini onayladı. Bu, spec onaylandıktan sonraki **ikinci revizyondur** (SCORECARD'a yazılır).

1. **Tek okuma yolu dördüncü parametre alır ve geçmiş kapısı eklenir** (Bloklayıcı): R16/2, C1/2, AC-62, AC-63, AC-64.
2. **Maliyetin kaynağı saklanmaz, türetilir; öncelik dörtlüdür** (Bloklayıcı): R9/2, AC-65, AC-66.
3. **Boy fiyatı malzemenin, yöntem parçanın alanıdır; boy yönteminde özgül ağırlık istenmez** (Bloklayıcı): R14/2, AC-67, AC-68, AC-69.
4. **Bant yalnız çaplı biçimlerde ve ham çapla uygulanır** (Bloklayıcı): R3/2, AC-70, AC-71.
5. **Excel'in maliyet hücresi malzeme kaynaklı parçada okunmaz; malzeme satırı Excel'den girilmez** (Önemli): R21, AC-72, AC-73, AC-74.
6. **Ana tedarikçi seçicisi gider yetkisine bağlı, fiyat ve ölçüler açık** (Önemli): R20/2, AC-75, AC-76.
7. **Bölüm adı `malzemeler`, grup `settings`, sekme yalnız Ayarlar** (Önemli): C5/2, AC-77.
8. **Parçanın kendi maliyet geçmişi dokunulmaz ve okunmaz; AC-26 daraltıldı** (Önemli): R16/3, AC-26, AC-78.
9. **Fiyat geçmişinin satırı fiyat kümesinin anlık görüntüsüdür** (Önemli): R6/2, AC-79, AC-80.
10. **İşleme payı alanları biçimin ölçüleriyle birebir eşlenir** (Önemli): R10/2, AC-81, AC-82.
11. **Hesap zinciri tek sırada yazılı; "ham ağırlık" pay dahil demektir** (Önemli): R12/2, AC-35, AC-83.
12. **Parça satırının firesi de 0 ile 100 arasıdır** (Önemli): R13/2, AC-84.
13. **"Maliyeti girilmemiş" sayacı malzeme listesini alır** (Önemli): R18/2, AC-85.
14. **Yeni dosyalar kilit alanının pencere listesine yazılır** (Önemli): C6/2, AC-86.
15. **Yedek paketi, geri yükleme dalı, kimlik sayacı ve iki bölüm adı sözlüğü birlikte yazılır** (Önemli): R22, C5/3, AC-87, AC-88.
16. **Malzeme listesi motorun veri nesnesinde ve önbellek bağımlılıklarında; zam ekranda ölçülür** (Önemli): R16/4, AC-89.
17. **AC-52 iki okuyucuya daraltıldı; stok formu ve Evrak değişmez** (Küçük): R18/3, AC-52.
18. **AC-53 bugünkü davranışın bekçisidir ve bu yazılı** (Küçük): AC-53.
19. **Üç ondalıklı gösterimde yarım yukarı yuvarlanır** (Küçük): R15/2, AC-90.
20. **Kayıtta tanınmayan para birimi "girilmedi" üretir, TL'ye katlanmaz** (Küçük): R7/2, AC-91.
21. **Asgari sipariş kilogram, geldiği boy metre; ikisi hesapta okunmaz** (Küçük): R2/2, AC-14, AC-92.
22. **Ad karşılaştırması `trLower`; çöp etiketi tek yardımcıdan** (Küçük): C7/2, AC-93, AC-94.
23. **Kurun iki bilinmeyen hâli ayrı metinlerle ayrılır ve prop zinciri yazılır** (Küçük): R5/2, AC-95.

### Plan turunda verilen kararlar (2026-11-05)

Takım Yöneticisi planın on bir önerisinin hepsini onayladı.

- **Karar 24.** Tarih doğrulamasının iki yardımcısı (`gecerliGunMu`, `gecerlilikTarihiDogrula`) küçük bir ortak modüle (`src/lib/gecerlilik.js`) taşınır ve `urunAgaci` onları aynı adla yeniden dışa verir; malzeme motoru oradan okur (içe aktarma döngüsü olmaz, C4'ün "ikinci kez yazılmaz" kuralı korunur). → C3, C4
- **Karar 25.** Fiyat geçmişinin anlık görüntüsü boy fiyatını da taşır; boy yöntemli parçanın tarihli maliyeti de malzemenin geçmişinden gelir. → R6/2, R14/2, R16/3
- **Karar 26.** İlk bandın alt sınırı 0'a sabittir (alan kilitli); her ham çap bir banda düşer. → R3, AC-11, AC-12
- **Karar 27.** Fiyatı döviz olup kuru boş malzeme "eksik" sayılır ve nedeni "kur girilmedi" yazar; kayıt engellenmez. → R5/2, R7, R7/2
- **Karar 28.** Bir parçanın tek malzeme satırı vardır (`parts.malzemeSatiri`, dizi değil); çok malzemeli parça bugünkü hammadde kırılımıyla girilir. → R9, R10
- **Karar 29.** Malzemeler genel aramaya bu spec'te eklenmez (bkz. X11). → X11
- **Karar 30.** Kuruş yuvarlaması bugünkü tek yardımcıyla (`gider.kurus`, yarım yukarı). → R15
- **Karar 31.** Fiyat güncelleme penceresi yalnız panelin kendi kilidini (`ayar:malzemeler`) kullanır; parça panelinin kilidine bakmaz, çünkü parçaya yazmaz. → C6
- **Karar 32.** Görsel kanıtın değişen kümesi iki taban ve iki sonra çekiminin çaprazıyla belirlenir; taban raporu onaylı görüntünün çekildiği toplu listeyle alınır (0131 dersi). → DoD
- **Karar 33.** Malzeme satırı doluyken kayıtta duran elle maliyet okunmaz ve kartta bunu söyleyen ipucu durur. → R9/2, C10, AC-62
- **Karar 34.** Karışık sürüm `server-security.cjs` ile ölçülür ve sürüm notuna "önce sunucu PC" yazılır. → C5

### Uygulamada verilen kararlar (2026-11-05)

- **Karar 35.** Parçanın malzeme satırı bileşeni kendi dosyasındadır (`src/components/MalzemeSatiriAlani.jsx`). Parça paneli içinde kalsaydı 0096 AC-44'ün "parça panelinde segment yok" ve 0122 AC-26'nın "panelde iki açılır liste" bekçileri kendi iddialarını değil bu yeni bölümü yakalardı; ayrı dosyada iki bekçi dokunulmadan yeşil, yöntem seçimi sözlüğün kuralıyla `Segment` (iki kısa seçenek). → R14/2
- **Karar 36.** Tarihli okumanın kuralı da ortak modüle indi (`gecerlilik.tarihteGecerliIndeks`; Karar 24'ün genişlemesi): parça geçmişi ve malzeme geçmişi aynı fonksiyonu çağırır. 0097 AC-37'nin "kural tek yerde" taraması yeni yeri arar ("spec 0132 ile"). → C3
- **Karar 37.** AC-38'in girdilerinde tam değerli ve üç ondalığa yuvarlanmış ağırlık tesadüfen aynı kuruşa düşer (1.701,1235 ve 1.701,1175); AC-39 bu yüzden aynı geometride kilo fiyatı 1.000 TL ile ölçülür (11.533,04 ile 11.533,00 ayrışır), AC-38'in rakamı aynen. → AC-39
- **Karar 38.** Önceki spec'lerin "yeni veri bölümü yok" bekçileri (0093, 0094, 0095, 0096, 0097, 0098, 0107, 0108, 0109) malzeme bölümünü tek yardımcıyla (`tests/fixtures/0132-yeni-bolum.js`) ayıklayıp aynı iddiayı sürdürür; fikstürleri yenilenmedi. Sayı bekçileri (0086 bölüm ve sayaç sayısı, 0078 çöp tablosu ve temizlik çağrısı sayısı) "spec 0132 ile" notuyla bir artar. → C5/3
- **Karar 39.** İçe aktarmada malzeme kaynaklı parçanın hücresi dışa aktarmanın yazdığı rakamla aynıysa bildirim yazılmaz (0096 triyaj emsali); farklı rakamda ve malzeme listesi verilmemiş çağrıda `MALZEME_EXCEL_HATASI`. Set kazanır, malzeme kırılımdan önce gelir. → R21, AC-73
- **Karar 40.** Hammadde kırılımı tutarlı ve malzeme satırı da dolu parçada kayıtta elle maliyet 0096'nın kuralıyla silinir (bugünkü davranış; malzeme bunu değiştirmez); Karar 33'ün "elle değer durur" iddiası kırılımsız parça içindir. → Karar 33

- **Karar 41 (triyaj bulgu 1).** Fiyat penceresi kur alanını kayıtlı kurla açar; günün kuru ipucunda ve "Günün kurunu kullan" düğmesiyle gelir, çevrimdışıyken kayıtlı kur kalır. Eski davranış (alanı günün kuruyla doldurmak, bilinmiyorsa boşaltmak) yalnız kilo fiyatına dokunan kullanıcıya fark ettirmeden kur zammı yapıyor ya da kuru silip parçayı "girilmedi"ye düşürüyordu; R5'in "kur kartta sabitlenir, değiştirmek zamdır" kuralı bunu yasaklar. AC-9 ve AC-10'un metni buna göre yeniden yazıldı. → R5, AC-9, AC-10
- **Karar 42 (triyaj bulgu 2).** Malzeme kartında, bantlarda ve parçanın malzeme satırında tek noktalı ve noktadan sonra üç ya da daha çok haneli virgülsüz sayı ("2.955", "7.850") belirsizdir ve reddedilir (`malzeme.BELIRSIZ_HATASI`, 0087 `MALIYET_BELIRSIZ_HATASI` emsali). `tutarCoz` bu metni binlik sayıp sessizce bin kat büyütüyordu; kural gider tarafıyla ortak olduğu için `tutarCoz`'a yazılmaz. → R2, AC-6
- **Karar 43 (triyaj bulgu 3).** Fiyat etkisi önizlemesi maliyetin tek okuma yolundan (`parcaMaliyetKurus`, set kataloğuyla) bütün canlı parçaları karşılaştırır: set içeriği dolu parçanın malzeme satırı okunmadığı için sayılmaz, bileşeni bu malzemeden olan set sayılır. "Bağlı parça" sayısı malzeme satırında bu malzeme geçen canlı parçalardır. → R17, C1, AC-48
- **Karar 44 (triyaj bulgu 4).** Bantlı malzemede çaplı biçimin (yuvarlak mil, boru) parçası tek kilo fiyatı istemez, çünkü her ham çap bir banda düşer (Karar 26). Tek fiyat yalnız bantsız malzemede ya da lama ve sacda gerekir; bantlı malzemede tek fiyat eksikse rozet "lama ve sac için tek kilo fiyatı girilmedi" yazar. → R3/2, R7
- **Karar 45 (triyaj bulgu 6).** Parçadan malzeme satırı kaldırılınca geçmiş kararının eski değeri malzemeden çözülen bugünkü maliyettir (kayıttaki elle tutar değil): geçmişe "geçerlilik tarihine kadar malzeme maliyeti" satırı yazılır, yeni değer o tarihten geçerlidir, kapanmış partilerin maliyeti değişmez. Malzemenin kendi fiyat geçmişi parçanın geçmişine taşınmaz (o güne kadarki bütün dönem malzemenin bugünkü maliyetiyle okunur; bilinen sınır). Malzeme listesi verilmeyen ya da malzemesi eksik çağrıda eski değer bilinmez ve kayıt yazılmaz. → R16/3, Intent
- **Karar 46 (triyaj bulgu 7).** Boruda et kalınlığı çapın yarısından küçük olmalıdır (`malzeme.ET_HATASI`); büyük ya da eşit et iç çapı sıfıra kırpıp boruyu sessizce dolu mil gibi hesaplıyordu. → R10, AC-32

### Karar kaydı

| # | Bulgu | Derece | İşlendiği yer |
|---|---|---|---|
| 1 | Tek okuma yolu dördüncü kaynağı taşıyamıyor; geçmiş kapısı yok | Bloklayıcı | R16/2, C1/2, AC-62…AC-64 |
| 2 | Maliyet kaynağının saklanması ve dört kaynağın önceliği tanımsız | Bloklayıcı | R9/2, AC-65, AC-66 |
| 3 | Boy fiyatının sahibi, seçim şartı ve özgül ağırlık şartı tanımsız | Bloklayıcı | R14/2, AC-67…AC-69 |
| 4 | Bandın ölçütü yuvarlak olmayan biçimde ve ham/net ayrımında tanımsız | Bloklayıcı | R3/2, AC-70, AC-71 |
| 5 | Excel içe ve dışa aktarmada malzeme kaynaklı parça tanımsız | Önemli | R21, AC-72…AC-74 |
| 6 | Malzeme kartının gider verisi için yetki kapısı yazılı değil | Önemli | R20/2, AC-75, AC-76 |
| 7 | Yeni bölümün sunucu haritalarındaki değerleri yazılı değil | Önemli | C5/2, AC-77 |
| 8 | Parçanın kayıtlı maliyet geçmişine ne olacağı tanımsız | Önemli | R16/3, AC-26, AC-78 |
| 9 | Malzeme fiyat geçmişi satırının neyi sakladığı tanımsız | Önemli | R6/2, AC-79, AC-80 |
| 10 | İşleme payının biçim başına eşlemesi tanımsız | Önemli | R10/2, AC-81, AC-82 |
| 11 | Hesap zincirinin sırası ve "ham ağırlık" sözcüğü iki anlamda | Önemli | R12/2, AC-35, AC-83 |
| 12 | Parça satırındaki firenin üst sınırı yok | Önemli | R13/2, AC-84 |
| 13 | Maliyetsiz sayacı malzeme listesini almazsa iş fayda üretmiyor | Önemli | R18/2, AC-85 |
| 14 | Kilit kapsam taraması yalnız panel kimliğiyle geçmiyor | Önemli | C6/2, AC-86 |
| 15 | Yedek paketi ve iki bölüm adı sözlüğü C5'te yok | Önemli | R22, C5/3, AC-87, AC-88 |
| 16 | Malzeme listesi önbellek bağımlılıklarında yok | Önemli | R16/4, AC-89 |
| 17 | AC-52 bugünkü kodla çelişiyor ve 0091'i ters çeviriyor | Küçük | R18/3, AC-52 |
| 18 | AC-53 bugünkü davranışı tekrarlıyor | Küçük | AC-53 |
| 19 | Üç ondalıkta tam yarım değerin yönü yazılı değil | Küçük | R15/2, AC-90 |
| 20 | Kayıtta tanınmayan para biriminin okuma kuralı yok | Küçük | R7/2, AC-91 |
| 21 | Asgari sipariş ve geldiği boy'un birimi yazılı değil | Küçük | R2/2, AC-14, AC-92 |
| 22 | Ad denetiminin harf katlaması ve çöp etiketi tanımsız | Küçük | C7/2, AC-93, AC-94 |
| 23 | Kurun kaynağı ve iki bilinmeyen hâli ayrılmıyor | Küçük | R5/2, AC-95 |

---

## Acceptance Criteria

### Malzeme kartı

- **AC-1.** Ayarlar › Katalog › Malzemeler paneli açılır; hiç malzeme yokken tablo çizilmez, yerine boş durum çıkar ve malzeme eklemeyi adres gösterir.
- **AC-2.** Temiz kurulumda malzeme listesi boştur: program hiçbir ad, özgül ağırlık ya da kilo fiyatı önceden yazmaz.
- **AC-3.** Adı boş malzeme kaydedilmez, nedeni alanın altında yazar.
- **AC-4.** Aynı adda ikinci canlı malzeme kaydedilmez, nedeni satırda yazar.
- **AC-5.** Özgül ağırlığı boş malzeme kaydedilir, listede "eksik" rozeti taşır ve panelin başlığındaki eksik sayısına girer.
- **AC-6.** Özgül ağırlık sıfır, negatif ya da sayıya çevrilemez girilirse kayıt reddedilir, nedeni alanın altında yazar.
- **AC-7.** Kilo fiyatı TL, USD ve EUR olarak girilebilir; tanınmayan para birimi reddedilir.
- **AC-8.** Fiyatı döviz olan malzemede kur alanı istenir; TL olan malzemede kur alanı çizilmez.
- **AC-9.** Fiyat güncelleme penceresi kur alanını kayıtlı kurla açar; günün kuru ipucunda yazar ve yalnız "Günün kurunu kullan" düğmesiyle alana gelir. Kayıtlı kuru olmayan malzemede günün kuru öneri olarak alana gelir (triyaj Karar 41).
- **AC-10.** Kur bilinmiyorsa (çevrimdışı) kayıtlı kur alanda kalır, kayıtlı kur da yoksa alan boş gelir; nedeni yanında yazar ve kayıt engellenmez (triyaj Karar 41).
- **AC-11.** Çap bandı girilebilir: her bant bir alt sınır ve bir fiyat taşır, en üst bant üst sınır istemez ve ekranda "Ø151 ve üstü" biçiminde okunur.
- **AC-12.** Bantların alt sınırları artan sırada değilse ya da iki bant çakışıyorsa kayıt reddedilir, nedeni satırda yazar.
- **AC-13.** Bandı olmayan malzemede parçanın çapı ne olursa olsun tek kilo fiyatı kullanılır.
- **AC-14.** Geldiği boy (metre), ana tedarikçi, asgari sipariş şartı (kilogram) ve varsayılan fire yüzdesi kartta saklanır, hepsi boş bırakılabilir ve ilk üçü bu spec'te hiçbir maliyet hesabında okunmaz.
- **AC-15.** Ana tedarikçi seçicisi Giderler'in canlı tedarikçilerini listeler; hammadde işaretli olanlar listenin başındadır.
- **AC-16.** Varsayılan fire yüzdesi 0 ile 100 arasında olmalıdır; dışındaki değer reddedilir, nedeni alanın altında yazar.
- **AC-17.** Kullanımda olan malzemenin silme onayı o malzemeyi kullanan parça sayısını yazar.
- **AC-18.** Çöpe atılan malzeme geri alınabilir; aynı adda canlı malzeme varsa geri alma yapılmaz ve nedeni satırda yazar.
- **AC-19.** Bir parçanın malzeme satırında geçen malzeme kalıcı silinmez; düğme kalır, satırda nedeni yazar ve onayda hata bildirimi çıkar.
- **AC-20.** Çöpü boşaltma ve otuz günlük temizlik, bir parçanın malzeme satırında geçen malzemeyi bırakır.

### Fiyat geçmişi

- **AC-21.** Fiyat değiştirilirken geçerlilik tarihi girilir; bugünden sonraki tarih reddedilir, nedeni alanın altında yazar.
- **AC-22.** Geçmişi hiç olmayan malzemede ilk fiyat girişi geçmiş kaydı doğurmaz.
- **AC-23.** Aynı güne ikinci fiyat kaydı yazılmaz; o gün yapılan ikinci değişiklik son kaydın üstüne yazar.
- **AC-24.** 01.03.2026'da 2,85 $, 01.06.2026'da 3,15 $ olan malzemede 15.04.2026 tarihli maliyet sorgusu 2,85 $ ile hesaplanır.
- **AC-25.** Aynı malzemede 15.07.2026 tarihli sorgu (son kaydın aralığı) saklı değeri değil bugünkü çözülmüş değeri verir.
- **AC-26.** Malzeme satırı olmayan parçada tarihsiz maliyet sorgusu bugünkü çözülmüş değeri verir ve çıktısı spec öncesiyle birebir aynıdır; malzeme kaynaklı parçada tarihsiz sorgu malzemenin bugünkü fiyatını kullanır.
- **AC-27.** Fiyat geçmişi kartta en yeni üstte, salt okunur listelenir.

### Malzemeden ağırlık ve maliyet

- **AC-28.** Parça kartında maliyetin kaynağı seçilir; "malzemeden hesapla" seçiliyken elle maliyet alanı ve tedarikçi kırılımı pasiftir ve maliyet hesabında okunmaz.
- **AC-29.** Biçim "yuvarlak mil" seçilince program çap ve boy ister; lamada kalınlık, genişlik ve boy; boruda çap, et kalınlığı ve boy; sacda kalınlık, en ve boy ister.
- **AC-30.** Yuvarlak mil, çap 140 mm, boy 78 mm, özgül ağırlık 7,90 girildiğinde ağırlık 9,486 kg çıkar.
- **AC-31.** Lama, kalınlık 10 mm, genişlik 20 mm, boy 125 mm, özgül ağırlık 7,85 girildiğinde ağırlık 0,196 kg çıkar (yuvarlak mil formülü uygulanmaz).
- **AC-32.** Boru, çap 19 mm, et kalınlığı 1,5 mm, boy 173 mm, özgül ağırlık 7,85 girildiğinde ağırlık 0,112 kg çıkar (dolu mil olarak hesaplanmaz).
- **AC-33.** Sac, kalınlık 2 mm, en 100 mm, boy 250 mm, özgül ağırlık 7,85 girildiğinde ağırlık 0,393 kg çıkar.
- **AC-34.** İşleme payı çapa ve boya ayrı ayrı eklenir: çap 140, boy 78 parçaya çapta 4 mm, boyda 5 mm pay girilince hesap çap 144, boy 83 ham ölçüyle yapılır ve ağırlık 10,679 kg çıkar.
- **AC-35.** Fire yüzdesi **pay dahil** ağırlığın üstüne eklenir: 10,679 kg'a %8 fire 11,533 kg verir.
- **AC-36.** Parça satırında fire boşsa malzeme kartındaki varsayılan kullanılır.
- **AC-37.** Parça satırında ve malzeme kartında fire boşsa fire sıfırdır, hesap çalışır ve ham ağırlık kullanılır.
- **AC-38.** Maliyet, fire dahil ağırlık ile parçanın **ham çapına** düşen bandın kilo fiyatının ve kurun çarpımıdır: özgül ağırlık 7,90, çap 144, boy 83, fire %8, kilo fiyatı 2,95 $, kur 50,00 ile sonuç 1.701,12 ₺ olur.
- **AC-39.** Ara değerler yuvarlanmaz: aynı girdilerde ağırlık üç ondalığa yuvarlanarak hesaba sokulursa çıkan rakam reddedilir, hesap tam değerle yapılır ve yuvarlama yalnız kuruşa uygulanır.
- **AC-40.** Fiyatı TL olan malzemede kur hesaba girmez; sonuç fire dahil ağırlık ile kilo fiyatının çarpımıdır.
- **AC-41.** Kilo yöntemiyle hesaplanan ve özgül ağırlığı girilmemiş malzemeye bağlı parçanın maliyeti "girilmedi" döner, sıfır dönmez.
- **AC-42.** Kilo fiyatı girilmemiş malzemeye bağlı parçanın maliyeti "girilmedi" döner, sıfır dönmez.
- **AC-43.** Çöpe atılmış malzemeye bağlı parçanın maliyeti "girilmedi" döner ve parça "maliyeti girilmemiş" sayımına girer.
- **AC-44.** Parça satırının yöntemi boy iken maliyet, malzemenin boy fiyatı ile bir makinaya giren uzunluktan türer ve kilo hesabı yapılmaz.
- **AC-45.** Ölçüsü eksik malzeme satırı (biçmin istediği alanlardan biri boş) kaydedilir ama maliyeti "girilmedi" döner; kayıt engellenmez.
- **AC-46.** Ölçüsü sıfır ya da negatif girilirse kayıt reddedilir, nedeni alanın altında yazar.

### Zam ve etki önizlemesi

- **AC-47.** Malzemenin kilo fiyatı değiştirilip kaydedildiğinde o malzemeye bağlı parçaların maliyeti hiçbir parçaya dokunulmadan yeni fiyatla okunur.
- **AC-48.** Fiyat güncelleme penceresi, uygulamadan önce kaç parçanın maliyetinin değişeceğini yazar.
- **AC-49.** Pencere örnek satırlarda eski ve yeni maliyeti birlikte gösterir.
- **AC-50.** Hiçbir parçaya bağlı olmayan malzemenin fiyatı değiştirilince pencere "bağlı parça yok" der ve sayı sıfır yazar.
- **AC-51.** Geçerlilik tarihi geçmişe verilen zam, o tarihten önceki tarihli maliyet sorgularını değiştirmez.

### Kapsam, yetki ve geriye dönük uyum

- **AC-52.** Makina Maliyeti › Model Maliyetleri ve müşteri formunun model seçicisi üretimde olmayan modeli varsayılan olarak göstermez (0091 ile zaten böyle; kriter gerilemeyi yakalar). Model Maliyetleri'nin "Üretimde olmayanları da göster" düğmesi yerinde kalır; stok formunun ve Evrak'ın model seçicileri değişmez.
- **AC-53.** "Maliyeti girilmemiş" sayımı bütün canlı parçaları sayar; parçanın hiçbir kitte geçmemesi ya da yalnız üretimde olmayan modelin kitinde geçmesi sayımı değiştirmez (bugünkü davranış; kriter gerilemeyi yakalar).
- **AC-54.** Malzeme paneli yeni bir eylem izni istemez; bugünkü katalog yetkisiyle açılır ve yazılır.
- **AC-55.** Panel başkasının açık kilidi altındaysa panel yerine kilit uyarısı çizilir.
- **AC-56.** Malzeme satırı olmayan parçanın maliyeti, liste hücresi, dışa aktarma satırı ve model maliyeti rakamı spec öncesi kodla birebir aynıdır (kıyas testi, altın dosya).
- **AC-57.** Tedarikçi kırılımı dolu parçanın maliyeti bu spec'ten sonra da kırılımdan gelir ve rakamı değişmez.
- **AC-58.** Set içeriği olan parçanın maliyeti bileşenlerinden gelmeye devam eder; setin bileşeninin malzemeden hesaplanan maliyeti sete yansır.
- **AC-59.** Malzeme listesi birleştirmede korunur: bu bilgisayarda eklenen malzeme, sunucudan yeniden yükleme sonrası listede kalır.
- **AC-60.** Yeniden atanan kimlikli malzemeye bağlı parça satırı yeni kimliği izler.
- **AC-61.** Boş bırakılan yeni alanlar kayıt gövdesine yazılmaz: dokunulmamış malzeme ve parça kaydedilip yeniden okunduğunda gövde spec öncesiyle aynıdır.

### QA turu kriterleri (2026-11-05)

- **AC-62.** Malzeme listesi verilmeyen çağrıda malzeme kaynaklı parçanın maliyeti "girilmedi" döner; sıfır dönmez ve kayıtta duran eski elle değer okunmaz.
- **AC-63.** Malzeme kaynaklı parça kaydedildiğinde parçanın kendi maliyet geçmişine satır yazılmaz ve kayıtta duran geçmiş silinmez.
- **AC-64.** Bir setin bileşeni malzemeden hesaplanıyorsa setin maliyeti o bileşenin malzeme maliyetinden türer; liste setin bileşen hesabına kadar iner.
- **AC-65.** Maliyetin kaynağı kayıt gövdesinde saklanmaz; aynı parçada hem malzeme satırı hem hammadde kırılımı varsa maliyet malzeme satırından gelir.
- **AC-66.** Set içeriği dolu parçada malzeme satırı pasiftir, maliyet hesabında okunmaz ve nedeni kartta yazar.
- **AC-67.** Parça satırının yöntemi boy iken özgül ağırlık istenmez; özgül ağırlığı boş malzemeyle de maliyet çözülür.
- **AC-68.** Boy yönteminde malzemenin geldiği boyu ya da boy fiyatı boşsa maliyet "girilmedi" döner.
- **AC-69.** Boy yönteminde fire, hesaplanan uzunluk oranının üstüne aynı yüzdeyle uygulanır.
- **AC-70.** Bandı seçen değer ham çaptır: çap 140, çap payı 4 olan parçada 144'e düşen bant uygulanır, 140'a düşen bant değil.
- **AC-71.** Lama ve sac biçiminde bant uygulanmaz; bantlı malzemeye bağlı lama parçası malzemenin tek kilo fiyatıyla hesaplanır.
- **AC-72.** Excel dışa aktarması malzeme kaynaklı parçanın çözülmüş maliyetini yazar, hücre boş kalmaz.
- **AC-73.** Excel içe aktarması malzeme kaynaklı parçanın maliyet hücresini almaz ve nedenini satır numarasıyla bildirir; parçanın öteki hücreleri yazılır.
- **AC-74.** Parça şablonunun sütun sayısı değişmez; malzeme satırı Excel'den girilemez.
- **AC-75.** Gider yetkisi olmayan kullanıcıda ana tedarikçi alanı çizilmez ve kaydedilen gövdede saklı tedarikçi bağı aynen korunur.
- **AC-76.** Gider yetkisi olmayan kullanıcı kilo fiyatını, özgül ağırlığı ve ölçüleri görür ve yazabilir.
- **AC-77.** Ayarlar sekmesi olmayan kullanıcının malzeme yazımı 403 alır; Ayarlar sekmeli kullanıcı yazabilir ve Makina Maliyeti sekmesi tek başına yazma hakkı vermez.
- **AC-78.** Malzeme kaynaklı parçada tarihli maliyet sorgusu malzemenin fiyat geçmişinden gelir; parçanın kendi maliyet geçmişi okunmaz.
- **AC-79.** Yalnız kur değiştirilip kaydedildiğinde malzemenin fiyat geçmişine yeni satır doğar.
- **AC-80.** Yalnız bir bandın fiyatı değiştirilip kaydedildiğinde malzemenin fiyat geçmişine yeni satır doğar.
- **AC-81.** Lamada işleme payı kalınlığa, genişliğe ve boya ayrı ayrı eklenir.
- **AC-82.** Boruda işleme payı çapa ve boya eklenir, et kalınlığına eklenmez.
- **AC-83.** Hesap zinciri sırası sabittir: fire pay dahil ağırlığa uygulanır; fire payın altındaki ağırlığa uygulanarak çıkan rakam reddedilir.
- **AC-84.** Parça satırında 100'den büyük ya da negatif fire reddedilir, nedeni alanın altında yazar.
- **AC-85.** Malzeme kaynaklı ve malzemesi tam olan parça "maliyeti girilmemiş" sayımına girmez; malzemesi eksik ya da çöpteki olan parça sayımda kalır.
- **AC-86.** Yeni malzeme dosyaları kilit kapsam taramasından geçer: panel ve fiyat güncelleme penceresi Ayarlar panel kilidi altında çizilir.
- **AC-87.** Yedek dosyası malzeme listesini taşır; geri yükleme listeyi yazar ve yedekten dönen kullanıcının malzemeleri yerinde kalır.
- **AC-88.** Yedek paketlerinin bölüm birleşimi bütün veri bölümlerini kapsar ve istemci ile sunucudaki bölüm adı sözlükleri birebir aynıdır.
- **AC-89.** Malzemenin kilo fiyatı değiştirildikten sonra Makina Maliyeti › Model Maliyetleri ekranındaki rakam yeni fiyatla okunur (ekranda ölçülür, yalnız motorda değil).
- **AC-90.** Üç ondalıklı gösterimde tam yarım değer yukarı yuvarlanır: 0,3925 kg ekranda 0,393 yazar.
- **AC-91.** Kayıtta tanınmayan para birimi bulunan malzeme listede "eksik" rozeti taşır ve ona bağlı parçanın maliyeti "girilmedi" döner.
- **AC-92.** Asgari sipariş ve geldiği boy alanları değiştirildiğinde hiçbir parçanın maliyeti değişmez.
- **AC-93.** "304 Paslanmaz" dururken "304 paslanmaz" adıyla ikinci malzeme kaydedilmez ve çöpten geri alma aynı ölçütü uygular.
- **AC-94.** Çöp Kutusu'ndaki malzeme satırının etiketi tek yardımcıdan gelir; alaşımı boş malzemede yalnız ad yazar.
- **AC-95.** Kur alanı boş geldiğinde nedeni iki ayrı metinle ayrılır (kur henüz alınmadı, çevrimdışı olduğu için alınamadı) ve iki hâlde de kayıt yapılabilir.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Hesap içeren iş React'sız **saf motorda** yazıldı ve kendi testi var; arayüz yalnız gösteriyor.
- [x] Aynı sayıyı üreten başka bir ekran/rapor varsa ikisi **aynı kaynağı** kullanıyor (maliyetin tek okuma yolu kaynak taramasıyla sabitlendi).
- [x] Yeni kalıcı alanlarda **dört nokta kuralı** uygulandı ve `db-roundtrip` ile `db-clean-install` testlerine eklendi.
- [x] Yeni veri bölümü için `BLOB_SECTIONS` + `SECTION_GROUP` + `BOLUM_SEKMELERI` + `MERGE_KEYS` + `App.mergeLocalIntoReloaded` satırı eklendi; değerleri C5/2'de yazılı.
- [x] Yedek paketinin `bolumler` listesi, geri yükleme dalı, kimlik sayacı listesi ve **iki** bölüm adı sözlüğü birlikte yazıldı; yedek kapsam ve sözlük eşitliği testleri yeşil (C5/3).
- [x] Maliyetin tek okuma yolunun dördüncü parametresi eklendi, listesiz çağrının "girilmedi" döndüğü ölçüldü ve geçmiş kapısı (malzeme kaynaklı parçada motor çalışmaz) sabitlendi (R16/2).
- [x] Excel içe ve dışa aktarmanın malzeme kaynaklı parçadaki davranışı ölçüldü; şablonun sütun sayısı değişmedi (R21).
- [x] Malzeme listesi model maliyeti motorunun veri nesnesine ve ekranların önbellek bağımlılıklarına yazıldı; zammın etkisi **ekranda** ölçüldü (R16/4).
- [x] Yeni eylem izni **eklenmedi** ve bu açıkça yazıldı; panel kimliği `AYAR_KILITLI`'ya, yeni dosyalar `KILIT_ALANLARI.ayar.pencereler`'e eklendi ve kilit kapsam taraması yeşil (C6/2).
- [x] Ana tedarikçi alanının gider yetkisi kapısı ölçüldü: yetkisiz kullanıcıda alan çizilmiyor ve saklı bağ kayıtta korunuyor (R20/2).
- [x] Çöp kutusu geri alma, kalıcı silme, çöpü boşaltma ve otuz günlük temizlik simetrisi korundu.
- [x] Kullanıcıya görünen tüm metinler Türkçe; bu spec'te yazdırma çıktısı yok ve bu açıkça yazıldı.
- [x] Para gösteriliyor: TL, USD ve EUR kuralına uyuldu, tanınmayan para birimi tanımlı biçimde ele alındı.
- [x] Arayüz kriterlerinin **görsel kanıtı** eklendi, boş ve hata durumları dâhil.
- [x] Kıyas testi yeşil: malzeme satırı olmayan veride çıktı spec öncesiyle birebir aynı.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi (yeni kavram: malzeme kartı ve maliyetin dördüncü kaynağı).
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

Takım Yöneticisi 2026-11-05'te 33 sorunun hepsini cevapladı. Aşağıdaki tablo cevapları bu spec'in kuralına bağlar. "Öneri" = analistin soru kâğıdındaki önerisi aynen kabul edildi.

| Soru | Karar | Nerede |
|---|---|---|
| 1 | Tek yöntem olsun, iki ayrı Excel hesabı tek kurala indirilsin | Intent, X7 |
| 2 | **Kullanıcı malzemelerini kendisi girsin**, program hazır liste getirmesin | R1, AC-2 |
| 3 | Kapsam dışı: soru 2 çözüyor | X10 |
| 4 | **Özgül ağırlık ve kilo fiyatını kullanıcı verecek**; boş değerle başlanmaz, eksik malzeme hesaba girmez | R7, AC-5, AC-41, AC-42 |
| 5 | Kapsam dışı: soru 2 çözüyor | X10 |
| 6 | İşleme payı ve fire iki ayrı alan | R12, AC-34, AC-35 |
| 7 | Fire yüzde olsun | R13, AC-16 |
| 8 | En üst çap bandı açık uçlu olsun | R3, AC-11 |
| 9 | Fiyat bandı malzemenin kartında dursun | R3, AC-13 |
| 10 | Günün kuru öneri olarak gelsin, elle değiştirilebilsin | R5, AC-9, AC-10 |
| 11 | Kilo fiyatı KDV hariç | R4, C4 |
| 12 | Fiyatın tarihli geçmişi tutulsun | R6, AC-21…AC-27 |
| 13 | Biçim ayrı alan olsun, ölçüleri biçim belirlesin | R11, AC-29…AC-33 |
| 14 | Boruda boy fiyatı girilsin | R14, AC-44 |
| 15 | Elle düzeltilmiş adetler kalksın | X7 (dosya temizliği, programa girmiyor) |
| 16 | Parti başına adet girilsin, makina başı türetilsin | **C**'ye ait, X9; ölçüm Context'te |
| 17 | Esas kaynak makina başı olsun, parti toplamı türetilsin | **C**'ye ait, X9; ölçüm Context'te |
| 18 | **Yalnız üretimde olan modeller için**; eskiden üretilip artık üretilmeyen makinalar var | R18 (yalnız model listesi süzmesi; sayaç yarısı 2026-11-05'te kalktı), X5, AC-52, AC-53 |
| 19 | Kalıp malzemesi ayrı tutulsun | R19, X4 |
| 20 | Alüminyum, 8620 ve 1050 da aynı hesaba girsin | R1, R2 (malzeme ayrımı yok) |
| 21 | Hurda ve talaş kapsam dışı | X3 |
| 22 | Bugünkü yetki yeterli, yeni yetki açılmasın | R20, AC-54 |
| 23 | Tek varsayılan kat, parçada kendi katı yazılabilsin | **B**'ye ait, X1 |
| 24 | Fiyat kendiliğinden değişsin, önce etki özeti gösterilsin, "elle sabit" kaçışı olsun | Maliyet tarafı R16, R17, AC-47…AC-50; fiyat tarafı **B**, X1 |
| 25 | Satın alınan hazır parçalar "elle sabit" kalsın | **B**'ye ait, X1 |
| 26 | Gönderilmiş teklifler etkilenmesin | Ölçüldü, ek iş yok (Context) |
| 27 | Yuvarlama seçeneği olsun, varsayılan kapalı | **B**'ye ait, X1 |
| 28 | Kur malzeme kartında sabitlensin, kuru değiştirmek zam sayılsın | R5, X6 |
| 29 | Sipariş ekranı kilo, boy adedi ve tutarı birlikte göstersin; boy malzeme kartında yazsın | Boy alanı R2 ve AC-14; ekran **C**'ye ait, X2 |
| 30 | Stok düşülsün, ayrı sütun olsun; emniyet payı yüzde, varsayılan sıfır | **C**'ye ait, X2 |
| 31 | Malzemenin bir ana tedarikçisi olsun | R2, C9, AC-15, X8 |
| 32 | Asgari sipariş ve boy katı şartı malzeme kartına yazılsın | R2, AC-14; yukarı yuvarlama **C**'ye ait, X2 |
| 33 | Parti adetleri elle girilsin, üretim partisinden hazır gelsin | **C**'ye ait, X2 |

### Analistin iki önerisi çakıştı, uzlaştırması burada

1. **Kur (10 ile 28).** Soru 10 "günün kuru varsayılan gelsin" diyordu, soru 28 "kur malzeme kartında elle sabitlensin ve kuru değiştirmek zam gibi muamele görsün". İkisi birden kabul edilince çeliştiler. Uzlaştırma: **saklanan değer sabitlenmiş kurdur** (28 kazanır, çünkü sebebi daha güçlü: her gün değişen fiyat listesiyle teklif vermek zorlaşır), **günün kuru yalnız güncelleme penceresinde öneri olarak gelir** (10 bu biçimde yaşar). Böylece kur değiştirmek bir zam kaydıdır ve tarihli geçmişe girer. Karar tek satırda geri çevrilebilir: öneri kaldırılırsa kur her zaman elle yazılır.
2. **Adet (16 ile 17).** Soru 16 "parti başına girilsin, makina başı türetilsin", soru 17 "esas kaynak makina başı olsun, parti toplamı türetilsin" diyordu; ikisi ters yönde. Uzlaştırma önerisi **C** spec'ine aittir ve orada karara sunulacak: **saklanan doğruluk kaynağı makina başıdır** (17; uygulamanın kiti ve üretim partileri ekranı bu yöndedir), **parti başına giriş formun çevirme kolaylığı olur** (16; girilen parti adedi parti büyüklüğüne bölünür). Bunun ölçülmüş bir bedeli var ve C yazılırken karar gerekecek: kit adedi bugün tam sayı zorunlu (`urunAgaci.js:255`), oysa motor ondalığı okuyor (`makinaStandartMaliyet.js:207`); 70 makinaya 8 adet giren parça makina başına 0,114 adet düşüyor.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `75f8402d` | Dal `feat/0132-malzeme`, taban `cda169c9`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 5 | Onaydan sonra iki revizyon (R18 sayımı, QA'nın 23 bulgusu), plan turu (Karar 24–34), uygulama (Karar 35–40), triyaj (Karar 41–46) |
| **Düzeltme turu sayısı** | 1 | Triyaj: dokuz bulgu |
| **Bulgu gerçek/gürültü oranı** | 9 / 0 | Dördü önemli (kur sessizce değişiyordu, noktalı üç ondalık bin kat büyüyordu, etki önizlemesi seti yanlış sayıyordu, bantlı malzemede gereksiz tek fiyat), dördü küçük, biri süreç |
| **Regresyon sayısı** | 0 | Tam takım 478 dosya, 6652 test (Electron dahil); lint 0 hata |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** önceki spec'lerin "yeni veri bölümü yok" bekçileri (0093–0109) tek ayıklama yardımcısıyla sürdürüldü (Karar 38); AC-38'in girdileri tam ve yuvarlanmış ağırlıkta tesadüfen aynı kuruşa düştüğü için AC-39 ayrı fiyatla ölçüldü (Karar 37); AC-89'un önbellek bozması varsayılan `[]` prop'larının her çizimde önbelleği zaten bozması yüzünden yakalanmıyordu, sabit referanslı test eklendi. Triyajda iki bozma (her bağlı parçayı değişmiş say; düzenleme kartı fiyatı formdan yazar) bütün testlerden geçiyordu; ikisine bekçi yazıldı ve mutasyonla ölçüldü.

**Görsel kanıt:** değişen küme iki taban × iki sonra çekiminin çapraz karşılaştırmasıyla bulundu (açılır liste oku 96 piksel katlarında gidip geliyor): 39 ekran (78 görüntü, 20'si yeni). Triyajdan sonra 39 ekran son kodla yeniden çekildi, gerçek değişiklik yalnız dört fiyat penceresi görüntüsünde. Taban son kodla 78 görüntüde 0 fark; dokuz dosyadaki 43 `degisti` kaydı kapanışta `ayni` ve `0132-taban-piksel-raporu.json`'a çevrildi.

**Bu spec'ten çıkarılan ders:** bir kriterin metnine harfiyen uyan kod, kuralın kendisini çiğneyebilir: AC-9 "kur alanına günün kuru gelir" diyordu, R5 ise "kuru değiştirmek zamdır". Testlerin önce alana eski değeri yazmak zorunda kalması bu çelişkinin işaretiydi; bir test kendi düzeneğinde kodun davranışını geri alıyorsa kriter yeniden okunmalı.

