# 0134 — Bir sonraki parti için tedarikçi sipariş ihtiyacı

| | |
|---|---|
| **Durum** | Uygulandı, kapanış bekliyor (2026-11-05; plan turu Karar 28–44, uygulama Karar 45–47, triyaj Karar 48–50) |
| **Sahip** | Analist (yazım) · geliştirici (uygulama) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Makina Maliyeti (beşinci görünüm **Sipariş İhtiyacı**), saf motor (yeni sipariş motoru), `src/lib/urunAgaci.js` ve 0132'nin malzeme motoru okunur, parça kartı ve malzeme kartı (emniyet payı alanı), `src/components/stock/MakinaStokTab.jsx` (ondalık kitin stok düşümü), yazdırma kurucusu (`src/lib/siparisRaporu.js`), `src/App.jsx` (yeni `partStock` prop'u) |
| **Bağımlı spec'ler** | **0132** (malzeme kartı ve malzemeden ağırlık; önkoşul), 0087 (makina kiti), 0121 (set içeriği), 0130 (setin parçalanması), 0091 (üretimde işareti), 0088 (Makina Maliyeti ekranı ve görünüm çubuğu), 0022 (üretim partileri), 0100 (parti seçicisi ve varsayılanı), 0065 (parça stoğu ve stok hareketi), 0096 (ham tedarikçi dizisinin emsali), 0059 (rapor sunum dili), 0128 (kilit kapsam taraması) |
| **Daraltılan kriterler** | AC-38 "aynı **ham kesitte**" diye daraltıldı (R12/2); AC-34 "firesi sıfır olan malzemede" (R15/2); AC-41 "kilo yöntemli parçada" (R12/3); AC-39 kiloyla alınan, AC-40 boyla alınan malzemeye bölündü (R18/2); AC-55 ile AC-56 oran ölçütüne geçti (R23/2); AC-1 ölçüm düzeneğini adıyla yazar (AC-100). |

---

## Intent

Fabrika yönetimi bir sonraki partiyi planlarken tedarikçiye ne sipariş vereceğini bilmiyor. Bugün elinde modelin parça listesi var, setlerin içeriği var, parça stoğu var, partinin planlanan adetleri var; ama bunları birleştirip "AK100_DS'den 70 makina üreteceğim, 304 paslanmazdan kaç kilo ve kaç boy almam lazım" diyen hiçbir hesap yok. Bu hesap bugün elle, Excel'de ve her defasında yeniden yapılıyor.

Bu iş bittiğinde model ve makina adedi girilecek, ekran parça parça ve malzeme malzeme ihtiyacı çıkaracak: eldeki stok ayrı sütunda düşülmüş, kaç kilo ve kaç boy gerektiği ve ne tutacağı yazılmış, tedarikçiye göre gruplanmış hâlde. Ekran hiçbir kayıt değiştirmez; yalnız var olan veriden hesap yapar ve yazdırılır.

---

## Requirements

### Girdi

- **R1.** Sipariş İhtiyacı, Makina Maliyeti ekranının beşinci görünümüdür.
- **R2.** Girdi iki yoldan verilir: bir üretim partisi seçilir ya da model ve makina adedi satırları elle girilir. Parti seçilirse partinin planlanan adetleri hazır gelir ve düzenlenebilir.
- **R2/2.** Parti seçicisi 0100'ün emsalini kullanır: açık partiler adının yanında "(açık)" ekiyle listelenir, kapanmış partiler listede kalır ama varsayılan olmaz, varsayılan en son başlayan açık partidir. Liste kuralı ekranda yeniden yazılmaz.
- **R3.** Model seçicisi yalnız üretimde olan modelleri listeler.
- **R4.** Makina adedi en az 1 tam sayıdır; sıfır, negatif ya da sayıya çevrilemez değer satırı reddeder.
- **R4/2.** Makina adedinin üst sınırı da vardır ve tek sabittedir: 10.000. Aşan değer satırda nedeniyle reddedilir.
- **R5.** Aynı modelden iki satır girilemez; ikinci satır reddedilir ve nedeni yazar.

### Parça ihtiyacı

- **R6.** Parça ihtiyacı makina kitinden hesaplanır: makina başı adet ile makina adedinin çarpımı, bütün satırların toplamı.
- **R6/2.** Ondalık adet **iki kit kapısında birlikte** geçerli olur: model kartının kit satırı ve parça kartının model ile adet satırı. Doğrulayıcı ikiye ayrılır (kit adedi ondalık, set içeriği tam sayı) ve set içeriğinin hata metni kendisine ait olur.
- **R6/3.** Ondalık kit adedi **stoktan düşerken** tam adede yukarı yuvarlanır. Yuvarlama kiti stoğa çeviren çağıranda yapılır; `utils.stokKirparakDus`'un imzası ve davranışı değişmez, çünkü o yol servis ve satış düşümleriyle ortaktır.
- **R6a.** Makina kitinin adedi ondalık olabilir (en çok üç ondalık), çünkü bir parça makina başına birden az girebilir. Setin içeriğinin adedi tam sayı kalır.
- **R6b.** Parça ihtiyacı kesirli çıkarsa tam adede **yukarı** yuvarlanır; kesirli parça sipariş edilemez. Yuvarlama parça başına ve model satırı başına yapılır, toplamın sonunda değil.
- **R6b/2.** Patlatmada sıra sabittir: **önce setin adedi yukarı yuvarlanır**, sonra bileşen miktarıyla çarpılır. Yarım set hazırlanamaz, bu yüzden çarpımı yuvarlamak yanlış rakam verir.
- **R6c.** Makina kitinde adet parti başına da girilebilir: girilen parti adedi ile parti büyüklüğü verilince program makina başı değeri kendisi hesaplar ve saklanan değer yine makina başıdır.
- **R6c/2.** Çevirme üç ondalığa **en yakına** yuvarlanır (yarım yukarı) ve çevrilen değer alanın yanında gösterilir. Girilen parti adedi ile parti büyüklüğü **saklanmaz**: kartı yeniden açan kullanıcı "70 makinaya 8 adet" bilgisini görmez, yalnız 0,114'ü görür. Bu bilinçli bedeldir.
- **R7.** Kitte set olan parça bileşenlerine patlatılır; setin kendisi de ayrı satırda görünür ki ne patlatıldığı anlaşılsın.
- **R7/2.** Sıra şudur: setin ihtiyacından **önce setin kendi stoğu** düşülür, kalan set adedi bileşenlere patlatılır, sonra bileşenlerin stoğu düşülür. Rafta duran hazır set yeniden sipariş edilmez; setin satırı üç sütunu da gösterir ve bileşen satırları yalnız patlatılan kalandan doğar.
- **R7/3.** Kitte hem set hem o setin bileşeni varsa ekran **uyarı yazar** ve bileşenin satırında adedin hangi iki kaynaktan geldiğini gösterir. Hesap 0121 X11 ile aynı yönde toplar; değişen yalnız uyarının varlığıdır.
- **R8.** İhtiyaç, stok ve sipariş üç ayrı sütundur ve birbirine karışmaz. Sipariş, ihtiyaçtan stok düşülerek bulunur ve sıfırın altına inmez.
- **R8/2.** Geçersiz model satırı hesabı durdurmaz: o satır hesaba girmez, öteki satırlar hesaplanır, tablonun başında "n satır hatalı" ibaresi çıkar ve hatalı satır varken yazdırma düğmesi pasiftir.
- **R9.** Emniyet payı yüzdesi malzeme ya da parça başına girilebilir; varsayılan sıfırdır ve uygulandığında kendi sütununda görünür.
- **R9/2.** Önceliği fire kuralının ikizidir: parçanın payı varsa o geçerlidir, yoksa malzemenin payı, ikisi de boşsa sıfır. Sıra tek yerde sabittir: ihtiyaç, pay ile çarpım, yukarı yuvarlama, stok düşümü, sipariş. Malzeme tarafında pay **ikinci kez** uygulanmaz.
- **R10.** Malzeme satırı olmayan parça (satın alınan hazır parça) parça ihtiyacı tablosunda görünür, malzeme tablosunda görünmez.
- **R10/2.** Hazır parça **eksik sayılmaz**: eksik sayısı yalnız malzeme satırı olup hesabı tamamlanamayan parçaları (ölçü, özgül ağırlık, fiyat ya da kur eksik) sayar; hazır parçalar kendi nötr sayısıyla yazılır. Eksik sayımının kapsamı da yalnız bu girdide geçen parçalar ve malzemelerdir, bütün katalog değil.
- **R11.** Kitinde hiç parça olmayan model satırı hesaba girer ama ihtiyaç üretmez; ekran bunu modelin adıyla yazar.
- **R11/2.** Çöpteki parça kit satırının **kendi ad kopyasıyla** ve "silinmiş parça" işaretiyle görünür (0115'in kaynak yokluğu emsali); canlı katalogdan ad çözülemediği için tek bilgi kaynağı o kopyadır.

### Malzeme ihtiyacı

- **R12.** Malzeme ihtiyacı, parçanın ham ölçüsünden (işleme payı dahil) hesaplanan ağırlık ile sipariş adedinin çarpımıdır ve malzeme başına toplanır.
- **R12/2.** Satır anahtarı malzeme **ve ham kesittir**, yalnız malzeme değil: yuvarlak milde ham çap, boruda ham çap ile et, lamada ham kalınlık ile genişlik, sacda ham kalınlık ile en. Aynı malzeme kaydından farklı kesitte iki parça iki ayrı satır üretir, çünkü tedarikçiye verilen kalem kesittir ve bantlı fiyat da ham çaptan seçilir. Malzeme başlığı yalnız kiloyu ve tutarı toplar; boy adedi başlık düzeyinde yazılmaz.
- **R12/3.** Boy fiyatından hesaplanan parça (malzeme satırının yöntemi "boy") kiloyla değil **oranla** hesaplanır: gereken boy, oran ile sipariş adedinin çarpımlarının toplamından yukarı yuvarlanır, tutar boy adedi ile boy fiyatının ve kurun çarpımıdır. Kilo sütunu boş kalır ve nedeni yazar; bu parça özgül ağırlık istemez ve **eksik sayılmaz**.
- **R13.** Boy adedi **uzunluktan** hesaplanır: bir boydan çıkan adet, boy uzunluğunun kesim boyuna bölümüdür ve aşağı yuvarlanır; gereken boy adedi, sipariş adedinin bir boydan çıkan adede bölümüdür ve yukarı yuvarlanır.
- **R13/2.** "Kesim boyu" **ham boydur**, yani işleme payı dahil ölçü. Testere payı modellenmez; kullanıcı gerekiyorsa onu boy payına yazar. Malzemenin boyu kartta metre, parçanın ölçüsü milimetre tutulduğu için hesap birimi milimetreye çevirir.
- **R13/3.** Boy adedi yalnız **tek boyutta kesilen** biçimlerde (yuvarlak mil ve boru) hesaplanır. Lama ve sacta hesaplanmaz ve nedeni satırda yazar: sacın eni malzeme kartında tutulmaz, lamanın kesiti de tutulmaz, yani programın iki boyutlu kesimi doğrulayacak verisi yok (kesim planı X3 ile kapsam dışı). O satırlarda sipariş kilosu net ihtiyaç ile firenin toplamıdır.
- **R14.** Ekran dört rakamı birlikte gösterir: net ihtiyaç kilosu, sipariş kilosu (boy adedinden gelen), artan kilo ve tutar. Tutar, sipariş kilosu ile kilo fiyatının ve kurun çarpımıdır.
- **R14/2.** Ara değerler yuvarlanmaz, yalnız sonuç kuruşa yuvarlanır (0132 Karar 30 ile aynı kural). Kilo üç ondalığa yuvarlanıp tutar ondan hesaplanırsa iki kuruşluk sapma doğar; ekranda üç ondalık **gösterim**dir, hesabın girdisi değil.
- **R15.** Malzeme kartında boy girilmemişse boy adedi hesaplanmaz; o malzemede sipariş kilosu net ihtiyaca eşittir, boy sütununda nedeni yazar.
- **R15/2.** İki rakamın adı ayrıdır: **net ihtiyaç** fire hariçtir ve fire kendi sütununda görünür, **sipariş kilosu** fire dahildir. R15'in "net ihtiyaca eşittir" cümlesi bu yüzden yalnız firesi sıfır olan malzemede geçerlidir; firesi olan malzemede R16 geçerlidir.
- **R16.** Fire yüzdesi boy adedi hesabına girmez. Boy adedi uzunluktan geldiğinde kesim kaybı artan kilosunda zaten görünür; fire de eklenirse aynı kayıp iki kez sayılır. Fire yalnız boy adedi hesaplanamayan (kiloyla alınan) malzemede ihtiyaca eklenir.
- **R17.** Fire yüzdesi sıfırdan büyük olan bir malzemede boy adedi de hesaplanabiliyorsa ekran bunu uyarı olarak yazar ve hangi rakamın hangi kaybı taşıdığını söyler.
- **R18.** Tedarikçinin asgari sipariş miktarı varsa sipariş bu şarta göre yukarı yuvarlanır ve fark kendi sütununda gösterilir. Boy katı şartı bu spec'te uygulanmaz (X9).
- **R18/2.** Yuvarlama **birimiyle** yapılır: kiloyla alınan malzemede asgari sipariş kilosuna, boyla alınan malzemede asgariyi aşan **en küçük boy adedine**. Asgari sipariş kartta kilogramdır; boyla alınan malzemede kiloya yuvarlamak sipariş edilemeyecek bir miktar söyler.

### Tedarikçi ve çıktı

- **R19.** Tedarikçi özeti malzemeleri ana tedarikçisine göre gruplar; ana tedarikçisi girilmemiş malzemeler kendi grubunda toplanır.
- **R19/2.** Çöpteki tedarikçinin adının yazılabilmesi için ekran **ham** tedarikçi dizisini de alır (0096'nın emsali: ham dizi yalnız gereken yere) ve onu **yalnız ad çözümünde** okur; grup "silinmiş" işaretiyle kendi başlığında kalır, tutarı toplamda durur ve hiçbir yazım yapılmaz.
- **R20.** Sipariş listesi yazdırılır.
- **R20/2.** Kurucu kendi modülündedir (`src/lib/siparisRaporu.js`) ve sunum dilini 0059'un `raporSunumu.js`'inden alır. `printTemplates.js`'e yazılmaz ve tanım adları "siparis" önekli olur: gider gizlilik taramasının deseni adında "makinaMaliyet" geçen her tanımı o dosyada reddeder.
- **R21.** Ekran salt okunurdur: hiçbir kayıt yazmaz, stok düşmez, sipariş kaydı oluşturmaz ve yeni bir yetki türü açmaz.
- **R21/2.** Emniyet payı da ekrandan yazılmaz: parça kartında malzeme satırının fire alanının komşusunda, malzeme kartında firenin komşusunda girilir. Ekranın yazım noktası **yoktur**; Context'in "tek yazım noktası emniyet payıdır" cümlesi bu kararla düşmüştür.

### Eksik veri

- **R22.** Eksik veri hesabı durdurmaz. Özgül ağırlığı, kilo fiyatı ya da malzeme satırı eksik olan parça ekranda eksik sayılır, tutarı yazılmaz ve toplamı bozmaz.
- **R22/2.** Fiyat **bugünkü** kümeden okunur (malzeme motoruna tarih verilmez). Malzemenin tarihli fiyat geçmişi sipariş hesabına girmez: sipariş ileriye dönüktür ve bugün geçerli fiyatla verilir.
- **R23.** Parça stoğu hiç sayılmamışsa ekran bunu söyler, çünkü o durumda sipariş ihtiyaca eşit çıkar ve rakam olduğundan büyük görünür.
- **R23/2.** Ölçüt **orandır**, yokluk değil: stoğu sıfırdan farklı parça sayısı, bu hesapta geçen canlı parça sayısının yüzde beşinden azsa uyarı çizilir ve iki sayı birlikte yazılır. "Hiçbir parçanın stoğu yok" ölçütü gerçek veride sağlanmıyor (ölçümde tek parçanın stoğu var), yani uyarıyı ilk günden susturuyordu.

### Veri zinciri

- **R24.** Ekran eldeki parça stoğunu **prop olarak** alır (`partStock`, salt okunur) ve motor stoğu parametre alır; bugün Makina Maliyeti ekranına yalnız stok hareketi geçiyor, eldeki miktar geçmiyor. Ekran stoğu kendi hesaplamaz, var olan okuma yolunu kullanır.
- **R25.** Model satırı daima **katalogdaki adı** taşır: partinin planlanan adetlerindeki anahtar katalogla Türkçe küçültmeyle eşlenir, sonra katalog adı kullanılır. Üretimde işareti adı birebir karşılaştırdığı için iki kural ayrı çalışırsa aynı model bir tabloda görünüp öbüründen düşebilir.

---

## Constraints

### Uyulması zorunlu

- **C1.** Adetin tek kaynağı makina kitidir (0087 R6). Ekran kendi kit kavramını yazmaz, patlatma kitten ve set içeriğinden okur.
- **C1/2.** Kit adedi doğrulayıcısının **üç** çağıranı var: model kartının kiti, parça kartının model ile adet satırı ve set içeriği. Doğrulayıcı ikiye ayrılırken iki kit kapısı birlikte gevşer; biri gevşer öbürü kalırsa aynı değer bir ekranda girilip öbüründe girilemez.
- **C2.** Malzeme ağırlığı ve kilo maliyeti 0132'nin saf motorundan okunur. İkinci bir ağırlık formülü yazılmaz; biçimden ağırlık türeten çarpımlar kaynakta yalnız 0132'nin motorunda bulunur ve bu kaynak taramasıyla sabitlenir.
- **C2/2.** Bir tam boyun ağırlığı da aynı fonksiyonla hesaplanır: ölçü nesnesinin boyu kartın geldiği boyuyla değiştirilip 0132'nin ağırlık fonksiyonu çağrılır. Parçanın ham ağırlığı ile fireli ağırlığı da motorun döndürdüğü iki ayrı alandan okunur; sipariş hesabı boy yolunda ham ağırlığı, kilo yolunda fireli ağırlığı kullanır ve kendi fire çarpımını yazmaz.
- **C3.** Hesap React'sız saf motorda yazılır ve kendi testi olur; arayüz yalnız gösterir. Motor saat okumaz, tarihi parametre alır.
- **C3/2.** Motorun girdisi tek veri nesnesidir ve parça stoğunu, malzeme listesini, kitleri, partileri ve tedarikçileri parametre olarak alır (0088 ve 0090'ın emsali). Ekran hiçbirini kendi içinde türetmez; yuvarlama, patlatma ve stok düşümü motorda kalır.
- **C4.** Emniyet payı bu spec'in kalıcı alanıdır (maliyetle ilgisi yok, yalnız siparişi etkiler) ve dört nokta kuralına uyar. Başka yeni kalıcı alan yoktur.
- **C4/2.** Payın girildiği yer **kartlardır**, Sipariş İhtiyacı ekranı değil: parçada malzeme satırının alanı, malzemede kartın alanı. Bu yüzden `serverAuth.cjs`'in bölüm eşlemesi **değişmez** (parça ve malzeme bölümleri yalnız Ayarlar sekmesinde kalır), parça bölümünün stok grubu kapısına dokunulmaz ve 0132'nin "Makina Maliyeti malzemeyi yalnız okur, ikinci sekme yazılmaz" kararı aynen geçerli kalır.
- **C5.** Yalnız üretimde olan modeller listelenir; işaret 0091'in `uretimdeMi` kuralından okunur, yeni bir işaret açılmaz.
- **C6.** Para: malzemenin kilo fiyatı TL, USD ya da EUR olabilir; tutar malzemenin kendi para biriminde ve TL karşılığıyla gösterilir, tanınmayan para birimi tanımlı biçimde ele alınır ve toplamı bozmaz.
- **C7.** Hesap bugünkü veriden türer ve saklanmaz: parti, kit, stok ya da malzeme fiyatı değişince ekran yeniden hesaplar. Geçmiş bir siparişin anlık görüntüsü tutulmaz.
- **C8.** Salt okunur iş olduğu için yeni eylem izni **eklenmez**; görünürlük bugünkü Makina Maliyeti sekmesinin yetkisidir.
- **C8/2.** Ekranın dosyası kilit kapsam taramasında **gerekçeli kilitsiz** listeye girer (0128'in taraması `maliyet/` klasörünün her dosyasını ister). Hiçbir veri bölümüne yazmadığı için kilit almaz ve başkasının kilidine bakmaz.

### KAPSAM DIŞI

- **X1.** Sipariş kaydı oluşturmak, sipariş durumu takip etmek, tedarikçiye e-posta ya da sipariş formu göndermek — *neden:* bunların kendi veri modeli, durumu, yetkisi ve çöp kutusu simetrisi olur; bu ekran bir hesap ekranıdır ve ondan önce gelir.
- **X2.** Stok düşmek ya da rezerve etmek — *neden:* R21, salt okunur; stok hareketi yazmak siparişin değil üretimin işi.
- **X3.** Kesim planı ve optimizasyon (hangi boydan hangi parçalar kesilsin, artan nasıl kullanılsın) — *neden:* başka bir problem sınıfı; bu ekran kaç boy gerektiğini söyler, nasıl kesileceğini söylemez.
- **X4.** Artan boyun bir sonraki partiye devredilmesi ve takibi — *neden:* artan malzeme stoğu diye bir kavram bugün yok; parça stoğu var, malzeme stoğu yok. Kendi spec'ini hak ediyor.
- **X5.** İngilizce çıktı — *neden:* tedarikçiler yurt içi ve liste Türkçe veriliyor. Yurt dışı tedarik gündeme gelirse çeviri anahtarı eklenir.
- **X6.** Emniyet payının tüketim geçmişinden otomatik hesaplanması — *neden:* geçmiş tüketim verisi yok (parça stoğu hiç sayılmadı); elle girilen yüzde bugün elde olan tek dürüst girdi.
- **X7.** Makina adedine karar vermeye yardım eden tahmin (siparişlere ya da geçen yılın aynı dönemine bakan) — *neden:* soru 33, Takım Yöneticisi kararı; adetler elle girilir, tahmin üretilmez.
- **X8.** Satış fiyatının maliyetten türemesi — *neden:* 0133'ün işi.
- **X9.** Boy katı şartı (tedarikçinin "yalnız üçün katı boy satarım" şartı) — *neden:* malzeme kaydında böyle bir alan yok ve C4 bu spec'e yalnız bir kalıcı alan (emniyet payı) açıyor. Şartı uygulamak ikinci bir kalıcı alan, kendi doğrulayıcısı ve yedek ile birleştirme simetrisi demek; asgari sipariş şartı bugün elde olan veriyle zaten uygulanıyor.

---

## Context

### Veri var, hesap yok

- `src/` altında sipariş ya da ihtiyaç hesabı yapan tek satır yoktur (arandı, sonuç boş). Eksik olan ekran değil, hesabın kendisi.
- Patlatmanın yarısı hazır: `src/lib/makinaStandartMaliyet.js:205` `modelMaliyeti(model, partMap, payK, tarih, malzemeKat)` (beşinci parametre 0132 ile geldi, Ölçüm C) modelin kitini (`model.defaultParcalar`) satır satır yürüyor, `Number(r.miktar)` ile adedi okuyor ve parçanın maliyetini tek okuma yolundan alıyor. Sipariş hesabı aynı yürüyüşün adet tarafıdır.
- Set patlatması hazır: `urunAgaci.setKatalogu` ve `setOzeti` (0121); `modelMaliyeti` kit haritasını aynı zamanda set kataloğu olarak kullanıyor.
- Partinin planlanan adetleri hazır: `uretim_partileri.planlananAdetler` (JSON, model adıyla; 0088). `src/lib/stokDurumu.js:154` bunu zaten model model yürüyor (Parti Üretim Panosu).
- Parça stoğu ve hareket geçmişi hazır: `partStock` ve `partStockLog` (0065); eldeki miktarın kırparak düşülmesi için emsal `utils.stokKirparakDus` (`src/lib/utils.js:887`).
- Makina Maliyeti ekranının görünüm çubuğu bugün dört öğe taşıyor: `src/components/MakinaMaliyeti.jsx:16` `GORUNUMLER` = Model Maliyetleri, Parti Hesabı, Üretim Partileri, Hesap Ayarları. Beşincisi buraya girer; 0083'ün çubuk yerleşim kuralı (sekmeler tek satırda ve daralmaz) gözetilir.

### Fire ile boy adedi aynı kaybı iki kez sayıyor, ölçüldü

Ø140 x 78 bitmiş ölçülü, çapta 4 mm ve boyda 5 mm işleme paylı, özgül ağırlığı 7,90 olan bir parça, 70 makinada 1 adet:

| Hesap | Sonuç |
|---|---|
| Ham ölçü (Ø144 x 83) ağırlığı | 10,679 kg |
| 70 adet net ihtiyaç | 747,512 kg |
| 6 m Ø144 bir boyun ağırlığı | 771,957 kg |
| Bir boydan çıkan adet (6000 ÷ 83, aşağı) | 72 |
| Gereken boy (70 ÷ 72, yukarı) | **1 boy** |
| Sipariş kilosu (1 boy) | 771,957 kg |
| Artan | 24,445 kg |
| **Üstüne %8 fire eklenirse net ihtiyaç** | **807,313 kg**, yani bir boydan fazla |

Yani fire eklenince kilo hesabı iki boy der, uzunluk hesabı bir boy der. Nedeni şudur: işleme payı satın alınan ham ölçüyü büyütür ve talaş olarak gidecek malzeme o ağırlığın içindedir; boy adedi uzunluktan hesaplandığında kesim kaybı da artan kilosunda görünür. Fire yüzdesi üçüncü bir kez aynı kaybı sayar. Müşterinin iki dosyası bu yüzden ayrışıyor: AKF dosyası ölçüyü büyütüyor (işleme payı), AK dosyası ölçüye dokunmadan kilo ekliyor (fire). İkisi aynı kaybın iki ayrı telafisidir. R16 ve R17 bu ölçümden doğdu.

### Bilinen tuzaklar

- **Kit adedi tam sayıdır:** `src/lib/urunAgaci.js:244` `kitAdediDogrula` yalnız `^\d+$` ve 1'den büyük değer kabul ediyor; motor `src/lib/makinaStandartMaliyet.js:207` ise `Number(r.miktar)` ile ondalığı sorunsuz okuyor. Doğrulayıcının **üç** çağıranı var (Ölçüm A): model kartının kiti, parça kartının model ile adet satırı ve set içeriği (`urunAgaci.js:449`), bu yüzden gevşetmek 0087 ve 0121'in kriterlerine dokunur. Müşterinin listesinde 70 makinaya 8 adet giren parça var, yani makina başına 0,114 adet. Karar aşağıda, "Kararlar" bölümünde seçenekleriyle duruyor.
- **Parça stoğu hiç sayılmadı:** 0121'in sürüm notu bunu yazılı olarak söylüyor ("parça stoğu sayılmadan setin stoğu anlam taşımaz; bugün bileşen stokları sıfır"). Bu yüzden ilk gün sipariş ihtiyaca eşit çıkar. R23 bunu ekranda söyletir, ama ölçüm yokluk ölçütünün sağlanmadığını gösterdi (bir parçanın stoğu var): uyarının ölçütü R23/2 ile orana çevrildi.
- **Model adı eşlemesi ada göredir:** partinin planlanan adetleri model **adıyla** tutuluyor ve yeniden adlandırma bunu taşımıyor (0088); katalogda bulunamayan ad hesaba girmez ve ekranda görünür.
- **Emniyet payı kalıcıdır ama ekran yine salt okunurdur (QA turunda karara bağlandı):** `parts` bölümü `stockActions` grubunda ve `BOLUM_SEKMELERI`'nde `["settings"]` (`electron/serverAuth.cjs:46` ve `:114`), `malzemeler` ise `settings` grubunda ve `["settings"]` (`:56` ve `:130`; 0132 C5/2 oraya "Makina Maliyeti malzemeyi yalnız okur, ikinci sekme yazılmaz" diye yazılı, Ölçüm I). Bu yüzden pay **kartlarda** girilir ve ekranın yazım noktası yoktur (R21/2, C4/2); bölüm eşlemesi, stok grubu kapısı ve 0132'nin kararı değişmez.

### Ölçüldü (2026-11-01 yedeği)

- **22 modelin hepsinin kiti dolu**; toplam 1.436 kit satırı, kit büyüklüğü en küçük 52, medyan 65, en büyük 76 parça. Yani patlatma gerçek bir iş yapıyor ve bir modelin parça ihtiyacı tablosu altmış satır civarında olacak. Yerleşim ve sayfalama kararı buna göre verilir (0080'in dersi: Gider Kalemleri 1.024 pikselde yatay kayıyordu).
- Üretimde olan model sayısı **7** (22 modelin 15'i üretimde değil), yani model seçicisi yedi satır gösterecek.
- **172 stok satırı var ama stoğu sıfırdan farklı yalnız 1 parça**, buna karşılık 1.021 stok hareketi kayıtlı. 0121'in sürüm notu böylece ölçümle doğrulandı: parça stoğu pratikte sayılmadı. Sonuç: ilk gün sipariş ihtiyaca eşit çıkar, ama "hiçbir parçanın stoğu sıfırdan farklı değil" ölçütü **sağlanmıyor** ve bugünkü hâliyle uyarı hiç çizilmezdi; R23/2 ölçütü orana çevirdi (AC-55, AC-56 yeniden yazıldı).
- **3 canlı üretim partisinin üçünde de planlanan adetler girili**, yani R2'nin hazır gelme yolu ilk günden değer üretiyor ve AC-4'ün boş dalı gerçek veride görünmez.
- 380 canlı parçanın 243'ünün maliyeti, yani malzeme bağı girilmemiş. Malzeme tarafı doldurulmadan malzeme ihtiyacı tablosu çoğunlukla eksik çıkar; R22 bunu sayıyla söylüyor ve ekranın ilk günkü hâli bu olacak.

### QA turunda ölçülenler (2026-11-05)

Her ölçüm kod üzerinde doğrulandı; aşağıdaki kararların dayanağı budur.

- **Ölçüm A.** Kit adedi doğrulayıcısı `src/lib/urunAgaci.js:244`'te ve **üç** çağıranı var: `ModelsManager.jsx:56` (model kartının kiti), `PartManager.jsx:426` (parça kartının model ile adet satırı, 0087'nin ikinci kit kapısı) ve `urunAgaci.js:449` (set içeriği). Spec iki çağıran sayıyordu.
- **Ölçüm B.** Ondalık kit adedi stok düşümünü sessizce boşa çıkarıyor: `MakinaStokTab.jsx:74` kalemleri `parseInt(r.miktar) > 0` ile süzüyor, `utils.js:894` istenen adedi `parseInt` ile okuyor. 0,114 adet satır hiç düşmez, 1,5 adet 1 düşer; `MakinaStokTab.jsx:323` "Kiti Uygula" ondalığı olduğu gibi forma kopyalar.
- **Ölçüm C.** Maliyet motorunun imzası 0132 ile beşinci parametreyi aldı: `makinaStandartMaliyet.js:205` `modelMaliyeti(model, partMap, payK, tarih, malzemeKat)`.
- **Ölçüm D.** Malzeme kaydının alanları `electron/db.cjs:309-310`'da: geldiği boy **metre**, asgari sipariş **kilogram**; **boy katı alanı yok** ve malzemenin kesitini (çap, en, kalınlık, genişlik) tutan alan da yok. Kesit yalnız parçanın malzeme satırında durur.
- **Ölçüm E.** Bandı seçen değer ham çaptır (`malzeme.js:72`), yani aynı malzeme kaydından farklı çaptaki iki parçanın kilo fiyatı farklı olabilir.
- **Ölçüm F.** Boy fiyatı yöntemi özgül ağırlık istemez ve ağırlık döndürmez: `malzeme.js:231-238` o dalda `hamKg` ve `fireliKg` alanlarını `null` bırakıp maliyeti boy oranından hesaplar.
- **Ölçüm G.** Kilo yolunda motor ham ağırlığı ve fireli ağırlığı **ayrı** döndürüyor (`malzeme.js:243-253`), yani sipariş hesabı fireyi kendi çarpmadan iki rakama da ulaşabiliyor.
- **Ölçüm H.** Fire önceliği kuralı hazır: `malzeme.js:179` `fireOf` önce parçanın satırına, sonra malzemeye bakıyor, ikisi de boşsa sıfır. Emniyet payı için ikinci bir öncelik kuralı yazmaya gerek yok.
- **Ölçüm I.** Bölüm eşlemeleri: `serverAuth.cjs:46` `parts: "stockActions"`, `:114` `parts: ["settings"]`, `:56` `malzemeler: "settings"`, `:130` `malzemeler: ["settings"]`. Satır `:129`'daki yorum 0132'nin kararını taşıyor. `EYLEM_IDLERI`'nde iki bölümün de kaydı yok, yani ikisi de bölüm düzeyinde güvenilir.
- **Ölçüm J.** Kilit kapsam taraması `tests/kilit-alanlari.test.js:62` ile `src/components/maliyet/` klasörünün **her** dosyasını istiyor; `src/lib/kilitAlanlari.js:44` ise `ModelMaliyetleri.jsx`'i `ayar` alanının penceresi olarak taşıyor (katalog alanı yazan maliyet ekranının emsali).
- **Ölçüm K.** Ekran eldeki stoğu hiç almıyor: `App.jsx:1759-1764` yalnız `partStockLog` geçiriyor, `partStock` geçirmiyor. Eldeki miktarın okuma yolu `utils.js:868` `totalMiktar`.
- **Ölçüm L.** Ekran tedarikçileri **canlı** dizi olarak alıyor (`App.jsx:1760`), yani çöpteki tedarikçinin adı bugünkü zincirde çözülemez.
- **Ölçüm M.** Görünüm çubuğu ölçülebilir: `tests/maliyet-yerlesim.test.js:17` gerçek ekranı Electron'da 1920, 1440 ve 1280 pikselde ölçüyor, düzenek `scripts/tests/layout/maliyet.jsx:15`'te ve bugün boş tedarikçi listesiyle, stok verisi olmadan çiziyor.
- **Ölçüm N.** `tests/gider-gizlilik.test.js:45-50` `printTemplates.js`'i `makinaMaliyet` ile başlayan adları da kapsayan bir desenle tarıyor; o dosyaya adında "makinaMaliyet" geçen bir tanım yazmak testi kırar.
- **Ölçüm O.** Fiyatın tarihsiz okuması bugünkü kümeyi veriyor (`malzeme.js:96-104`), yani sipariş hesabı tarih vermeyerek bugünkü fiyatı alır.
- **Ölçüm P.** Kitte hem set hem o setin bileşeni bulunması durumu ölçülü: `makinaStandartMaliyet.js:223-229` kesişimi hesaplayıp bilgi olarak döndürüyor (0121 R32/2).
- **Ölçüm Q.** Set patlatması tek düzeydir: `urunAgaci.js:78-98` `setOzeti` bileşenin kendi içeriğine hiç bakmıyor (iç içe set 0121 ile yasak), yani patlatma özyinelemesiz.
- **Ölçüm R.** Model adı iki ayrı kuralla eşleniyor: üretimde işareti adı **birebir** karşılaştırıyor (`uretimdekiModeller.js:19`), partinin planlanan adetleri Türkçe küçültmeyle eşlenen anahtarla yürüyor (`stokDurumu.js:150`).
- **Ölçüm S.** Aritmetik yeniden hesaplandı: AC-25 (10,679 kg), AC-26 (747,512 kg), AC-27 (72 adet), AC-28 (1 boy), AC-29 (771,957 kg), AC-30 (24,445 kg), AC-31 (113.863,68 TL), AC-32 (3 boy), AC-37 (807,313 kg) ve AC-39'un farkı (228,043 kg) doğru. Tek şart: AC-31 ancak **ara değer yuvarlanmazsa** tutuyor; kilo üç ondalığa yuvarlanıp tutar ondan hesaplanırsa 113.863,66 çıkıyor.

### QA turunda verilen kararlar (2026-11-05)

Analistin bulguları ve önerileri Takım Yöneticisi tarafından **tümüyle onaylandı**; aşağıdaki numaralar karar kaydı tablosuyla eşlidir.

1. **Ekran hiç yazmaz, emniyet payı kartlarda girilir (Bloklayıcı).** R21 ile Context'in "tek yazım noktası emniyet payıdır" cümlesi çelişiyordu; yazım ekranda olsa bölüm eşlemesi, stok grubu kapısı, kilit alanı ve 0132 AC-77 birden açılırdı. → R21/2, C4/2, C8/2, AC-59…AC-62.
2. **Malzeme satırının anahtarı malzeme ve ham kesittir (Bloklayıcı).** AC-38 iki ayrı çapı tek boy hesabında topluyordu; tedarikçiye verilen kalem kesittir ve bantlı fiyat ham çaptan seçilir (Ölçüm D, E). → R12/2, AC-38 yeniden yazıldı, AC-63…AC-66.
3. **Boy yöntemli parça oranla hesaplanır (Bloklayıcı).** O parçada ağırlık hiç hesaplanmıyor ve özgül ağırlık gerekmiyor (Ölçüm F); R12 ile R14'ün kilo zinciri çalışmazdı, AC-41 ise onu eksik sayardı. → R12/3, AC-41 daraltıldı, AC-67…AC-70.
4. **Boy katı şartı kapsam dışı, asgari sipariş birimiyle yuvarlanır (Bloklayıcı).** Boy katı alanı yok (Ölçüm D) ve AC-39 boyla alınan malzemede sipariş edilemeyecek bir kiloya yuvarlıyordu. → R18 yeniden yazıldı, R18/2, X9, AC-39 ile AC-40 bölündü, AC-71.
5. **Ondalık kit stoktan düşerken yukarı yuvarlanır (Önemli).** Bugünkü iki `parseInt` ondalığı sessizce düşürüyor (Ölçüm B) ve 0087'nin "tek kaynak kit" kuralı sipariş ile stok arasında ayrışırdı. → R6/3, AC-72, AC-73.
6. **Doğrulayıcı ikiye ayrılırken iki kit kapısı birlikte gevşer (Önemli).** Üçüncü çağıran sayılmamıştı (Ölçüm A). → R6/2, C1/2, AC-74, AC-75.
7. **Setin kendi stoğu önce düşülür, kalan patlatılır (Önemli).** Raftaki hazır setin bileşenleri yeniden sipariş edilirdi. → R7/2, AC-76, AC-77.
8. **Patlatmada set adedi önce yuvarlanır (Önemli).** R6b iki çarpımlı patlatmada sırayı söylemiyordu; sıra değişince rakam değişiyor. → R6b/2, AC-78.
9. **Kit kesişimi uyarıyla görünür (Önemli).** Ölçüm hazır (Ölçüm P), maliyette bilgi notu olan şey siparişte iki kez satın almak demek. → R7/3, AC-79, AC-80.
10. **Emniyet payının önceliği ve sırası fire emsaliyle sabitlendi (Önemli).** R9 iki yerde girilen payın ne olacağını ve sırayı söylemiyordu (Ölçüm H). → R9/2, AC-81…AC-84.
11. **Stok uyarısının ölçütü orana çevrildi (Önemli).** Yokluk ölçütü gerçek veride sağlanmıyor, yani uyarı ilk günden ölü doğuyordu. → R23/2, AC-55 ile AC-56 yeniden yazıldı, AC-85.
12. **Net ihtiyaç fire hariç, sipariş kilosu fire dahil (Önemli).** AC-34 ile AC-37 firesi olan ve boyu girilmemiş malzemede birbirini yalanlıyordu. → R15/2, AC-34 daraltıldı, AC-86.
13. **Çöpteki tedarikçinin adı ham diziden çözülür (Önemli).** Ekran canlı dizi alıyor (Ölçüm L), AC-46 ise silinmiş adı istiyordu. → R19/2, AC-87.
14. **Ekran eldeki stoğu prop olarak alır (Önemli).** Stok sütununun verisi bugünkü zincirde ekrana hiç gelmiyor (Ölçüm K). → R24, C3/2, AC-88, AC-89.
15. **Boy adedi yalnız mil ve boruda hesaplanır (Önemli).** Sacın eni ve lamanın kesiti kartta yok (Ölçüm D), tek boyutlu bölme sacda yanlış rakam verir. → R13/3, AC-90.
16. **Kesim boyu ham boydur, testere payı modellenmez (Önemli).** Kriterin rakamı bu tanımı varsayıyordu, kuralın metni söylemiyordu. → R13/2, AC-91.
17. **Ara değer yuvarlanmaz (Küçük).** AC-31 yalnız yuvarlanmamış zincirle tutuyor (Ölçüm S). → R14/2, AC-92.
18. **Parti başına adedin çevrilmesi en yakına yuvarlanır ve girdi saklanmaz (Küçük).** Yön ve kalıcılık yazılmamıştı. → R6c/2, AC-93, AC-94.
19. **Model satırı katalogdaki adı taşır (Küçük).** İki ayrı eşleme kuralı var (Ölçüm R). → R25, AC-95.
20. **Parti seçicisi 0100'ün emsalini kullanır (Küçük).** Hangi partilerin listelendiği ve varsayılanın hangisi olduğu yazılmamıştı. → R2/2, AC-96.
21. **Fiyat bugünkü kümeden okunur (Küçük).** Motor tarih parametresi alıyor ama sipariş ileriye dönük (Ölçüm O). → R22/2, AC-97.
22. **Eksik sayımı bu girdiyle sınırlı, hazır parça eksik değil (Küçük).** Katalog geneli sayı ölçümde 243 parça çıkıyor ve uyarıyı okunmaz yapıyor. → R10/2, AC-98, AC-99.
23. **Görünüm çubuğu var olan Electron düzeneğinde ölçülür (Küçük).** Düzenek hazır (Ölçüm M), spec atıf taşımıyordu. → AC-1 yeniden yazıldı, AC-100.
24. **Yazdırma kurucusu kendi modülünde ve "siparis" önekli (Küçük).** Gizlilik taraması adında "makinaMaliyet" geçen tanımı reddediyor (Ölçüm N). → R20/2, AC-101.
25. **Geçersiz satır hesabı durdurmaz, yazdırma pasifleşir (Küçük).** AC-8 ötekilerin hesaplanıp hesaplanmadığını söylemiyordu. → R8/2, AC-102.
26. **Makina adedinin üst sınırı 10.000 (Küçük).** R4 yalnız alt sınırı veriyordu. → R4/2, AC-103.
27. **Çöpteki parça kit satırının ad kopyasıyla görünür (Küçük).** Canlı katalogdan ad çözülemiyor. → R11/2, AC-104.

### Plan turunda verilen kararlar (2026-11-05)

Geliştiricinin uygulama planındaki on yedi öneri Takım Yöneticisi tarafından **tümüyle onaylandı**.

- **Karar 28.** Parçanın emniyet payı parçanın kendi alanıdır (`parts.emniyetPayi`), malzeme satırının içinde değil. Alan parça kartında malzeme bölümünde firenin yanında durur ama malzeme seçilmemiş hazır parçada da görünür; malzeme satırı kaldırılınca pay kaybolmaz. → R9, R21/2, C4, AC-19, AC-59
- **Karar 29.** Aynı kesitte farklı kesim boylu parçalar: her parçanın kesirli boyu (sipariş adedi ÷ bir boydan çıkan adet) hesaplanır, kesit satırında toplanır ve bir kez yukarı yuvarlanır (R12/3'ün oran kuralıyla aynı biçim). → R12/2, R13
- **Karar 30.** Satır anahtarına yöntem de girer: aynı kesitte kilo yöntemli ve boy yöntemli parça iki ayrı satırdır. → R12/2, R12/3
- **Karar 31.** Asgari sipariş kesit satırına uygulanır (tedarikçiye verilen kalem kesittir). → R18, R18/2
- **Karar 32.** Emniyet payı yalnız satın alınan kaleme uygulanır: doğrudan parçaya ve patlatılan bileşene; setin kendi satırına uygulanmaz (set satın alınmaz, hazırlanır). → R9/2
- **Karar 33.** Yuvarlama sırası: set ihtiyacı model satırı başına yukarı yuvarlanır, toplamdan setin stoğu düşülür, kalan × bileşen miktarı bileşene eklenir; bileşende (ihtiyaç × pay) yukarı yuvarlanır, sonra bileşenin stoğu düşülür. → R6b, R6b/2, R7/2, R9/2
- **Karar 34.** Ondalık kitte maliyet satırı kuruşa yuvarlanır (`modelMaliyeti`: `Math.round(birimK × adet)`); tam sayı kitte çıktı spec öncesiyle birebir aynıdır. → R6a, 0088
- **Karar 35.** Kit adedinin kendi ayrıştırıcısı vardır: virgül de nokta da ondalıktır (adette binlik ayracı yoktur), en çok üç hane. `tutarCoz` kullanılmaz ("0.114"ü 114 okurdu). → R6a, AC-11a, AC-11b
- **Karar 36.** "Kiti Uygula" stok formuna yukarı yuvarlanmış adedi kopyalar; `deductParts` de ayrıca yukarı yuvarlar. → R6/3, AC-72
- **Karar 37.** Parti başına çevirme yalnız model kartının kit satırındadır: satırın "parti başına" bağlantısı iki küçük alan açar, geçerli girişte makina başı değer yazılır ve yanında gösterilir. → R6c, R6c/2
- **Karar 38.** Tablolar sayfalanmaz; kap yatay kayar. → Context (ölçüm), 0080
- **Karar 39.** Parti değişince model satırları yeni partiden yeniden dolar; elle değişiklikler düşer (ekran durumu yereldir). → R2, AC-6
- **Karar 40.** TL karşılığı malzemenin kayıtlı kuruyla hesaplanır, günün kuruyla değil (0132 Karar 41). → C6, AC-48
- **Karar 41.** Üretimde işareti yeniden okunmaz: görünüm model maliyeti satırlarının `uretimde` alanından süzer (Parti Hesabı emsali; 0093 C6 Makina Maliyeti'nde süzmeyi yasaklıyor). 0091 ve 0093'ün okuyucu taramaları değişmez. → R3, C5
- **Karar 42.** Görünüm çubuğu 1280 pikselde sığmazsa uygulama durur ve Takım Yöneticisi'ne sorulur; etiket kendiliğinden kısaltılmaz. → AC-1
- **Karar 43.** Tam boy ağırlığı malzeme motorunun yardımcısından alınır; sipariş motorunda `ozgulAgirlik` geçmez ve 0132'nin C1 taraması değişmeden yeşil kalır. → C2, C2/2
- **Karar 44.** Beşinci sekme bütün Makina Maliyeti ekranlarının çubuğunu değiştirir; bu ekranlar `degisti` onayı alır, kapanışta taban raporu çekilir. → DoD

- **Karar 45 (uygulama).** Yazdırma düğmesi `src/components/rapor/SiparisRaporuDugmesi.jsx`'tedir, görünüm dosyasında değil: 0088'in gizlilik taraması (X4) `maliyet/` klasöründe yazdırma API'sini yasaklıyor ve kural gevşetilmedi (0047 `GiderKasaRaporuDugmesi` emsali). → R20/2
- **Karar 46 (uygulama).** AC-15'in "içeriği boş set"i, içeriği yazılı olup bileşenlerinin hiçbiri canlı listede olmayan settir: içeriği gerçekten boş parça 0121'e göre set değildir ve hazır parça olarak sayılır. → AC-15
- **Karar 47 (uygulama).** Hiç tutarı çözülemeyen malzemenin ve tedarikçi grubunun toplamı "—" yazar, sıfır yazmaz; genel toplam yalnız çözülen tutarları toplar. → R22, AC-42

- **Karar 48 (triyaj bulgu 2).** Boy yöntemli parçada boy adedi parça parça yerleşimden değil tüketim oranından gelir; kesim kaybı artan kiloda görünmediği için R16'nın çift sayım gerekçesi bu yolda yoktur. Fire orana eklenir (oran × (1 + fire) × adet, maliyetle aynı: 0132'nin boy yolu), satırda uyarı yazar (R17). → R12/3, R16, R17, AC-68
- **Karar 49 (triyaj bulgu 1).** Kesit anahtarı ve gösterimi ham ölçünün üç ondalığa yuvarlanmış hâlidir: ham ölçü kayan nokta toplamıdır (10,1 + 0,2 = 10,299999…) ve yuvarlanmazsa aynı kesit iki satıra bölünüp bir boy fazla ve asgari siparişi iki kez üretirdi. → R12/2, Karar 31
- **Karar 50 (triyaj bilgi 1).** Partinin planlanan adetlerinde üretimde olmayan bir model varsa satır hesaba girer ve seçici o satırın modelini korur; R3 yalnız seçicinin listesini sınırlar. → R3, R2

### Karar kaydı

| # | Derece | Bulgu | İşlendiği yer |
|---|---|---|---|
| 1 | Bloklayıcı | Ekranın yazıp yazmadığı spec içinde çelişiyor | R21/2, C4/2, C8/2, AC-59…AC-62 |
| 2 | Bloklayıcı | Malzeme satırı ham kesiti görmüyor | R12/2, AC-38, AC-63…AC-66 |
| 3 | Bloklayıcı | Boy yöntemli parçanın kilosu ve tutarı tanımsız | R12/3, AC-41, AC-67…AC-70 |
| 4 | Bloklayıcı | Boy katı şartının veri kaynağı yok, asgari sipariş birimi karışık | R18, R18/2, X9, AC-39, AC-40, AC-71 |
| 5 | Önemli | Ondalık kit stok düşümünü sessizce bozuyor | R6/3, AC-72, AC-73 |
| 6 | Önemli | Doğrulayıcının üçüncü çağıranı sayılmamış | R6/2, C1/2, AC-74, AC-75 |
| 7 | Önemli | Sette stoğun hangi tarafta düşüleceği tanımsız | R7/2, AC-76, AC-77 |
| 8 | Önemli | Patlatmada yuvarlama sırası tanımsız | R6b/2, AC-78 |
| 9 | Önemli | Kit kesişimi sessiz çift sipariş üretiyor | R7/3, AC-79, AC-80 |
| 10 | Önemli | Emniyet payının yeri ve sırası tanımsız | R9/2, AC-81…AC-84 |
| 11 | Önemli | Stok uyarısı gerçek veride hiç çizilmiyor | R23/2, AC-55, AC-56, AC-85 |
| 12 | Önemli | AC-34 ile AC-37 birbirini yalanlıyor | R15/2, AC-34, AC-86 |
| 13 | Önemli | Çöpteki tedarikçinin adı çözülemiyor | R19/2, AC-87 |
| 14 | Önemli | Stok sütununun verisi ekrana gelmiyor | R24, C3/2, AC-88, AC-89 |
| 15 | Önemli | Sac ve lamada boy adedi tek boyutla hesaplanamaz | R13/3, AC-90 |
| 16 | Önemli | "Kesim boyu" tanımsız | R13/2, AC-91 |
| 17 | Küçük | Ara değer yuvarlama kuralı yazılmamış | R14/2, AC-92 |
| 18 | Küçük | Parti başına çevirmede yön ve kalıcılık yazılmamış | R6c/2, AC-93, AC-94 |
| 19 | Küçük | Model eşlemesi iki ayrı kuralla | R25, AC-95 |
| 20 | Küçük | Parti listesi ve varsayılanı tanımsız | R2/2, AC-96 |
| 21 | Küçük | Fiyatın tarihi yazılmamış | R22/2, AC-97 |
| 22 | Küçük | Eksik sayımının kapsamı ve hazır parça ayrımı | R10/2, AC-98, AC-99 |
| 23 | Küçük | AC-1'in ölçüm düzeneği yazılmamış | AC-1, AC-100 |
| 24 | Küçük | Yazdırma kurucusunun yeri ve ad tuzağı | R20/2, AC-101 |
| 25 | Küçük | Geçersiz satırın hesabı durdurup durdurmadığı | R8/2, AC-102 |
| 26 | Küçük | Makina adedinin üst sınırı yok | R4/2, AC-103 |
| 27 | Küçük | Çöpteki parçanın adı tanımsız | R11/2, AC-104 |

---

## Acceptance Criteria

### Girdi ve boş durum

- **AC-1.** Sipariş İhtiyacı görünümü Makina Maliyeti'nin görünüm çubuğundan açılır ve çubuk 1920, 1440 ile 1280 piksel genişlikte tek satırda kalır; ölçüm var olan Electron yerleşim düzeneğinde yapılır (AC-100).
- **AC-2.** Hiç model satırı girilmemişken tablo çizilmez, yerine boş durum çıkar ve model eklemeyi adres gösterir.
- **AC-3.** Üretim partisi seçilince partinin planlanan adetleri model satırlarına hazır gelir.
- **AC-4.** Planlanan adedi olmayan parti seçilince satırlar boş gelir ve nedeni yazar.
- **AC-5.** Partinin planlanan adetlerinde katalogda bulunamayan model adı varsa o ad hesaba girmez ve ekranda adıyla listelenir.
- **AC-6.** Hazır gelen adet elle değiştirilebilir ve değişiklik partinin kaydına yazılmaz.
- **AC-7.** Model seçicisi üretimde olmayan modeli listelemez.
- **AC-8.** Makina adedi sıfır, negatif ya da sayıya çevrilemez girilirse satır reddedilir ve nedeni satırda yazar.
- **AC-9.** Aynı modelden ikinci satır eklenmez, nedeni satırda yazar.

### Parça ihtiyacı

- **AC-10.** Makina başı 1 adet olan parça, 70 makinalık girdide 70 adet ihtiyaç üretir.
- **AC-11.** Makina başı 8 adet olan parça, 70 makinalık girdide 560 adet ihtiyaç üretir.
- **AC-11a.** Makina kitine 0,114 adet girilebilir ve kaydedilir.
- **AC-11b.** Makina kitine dört ondalıklı adet (0,1143) girilirse reddedilir ve nedeni satırda yazar.
- **AC-11c.** Setin içeriğine ondalık adet girilirse reddedilir ve nedeni satırda yazar.
- **AC-11d.** Makina başı 0,114 adet olan parça, 70 makinalık girdide 8 adet ihtiyaç üretir (7,98 yukarı yuvarlanır).
- **AC-11e.** İki model satırında 0,114 adetle geçen parçanın ihtiyacı satır satır yukarı yuvarlanır, toplamın sonunda değil: 70 ve 10 makinalık iki satır 8 + 2 = 10 adet üretir.
- **AC-11f.** Makina kitinde parti başına adet girilebilir: 8 adet ve 70 makina girilince saklanan makina başı değer 0,114 olur.
- **AC-11g.** Parti büyüklüğü sıfır ya da boş girilirse parti başına çevirme yapılmaz ve nedeni alanın altında yazar.
- **AC-12.** İki modelde geçen parçanın ihtiyacı iki satırın toplamıdır.
- **AC-13.** Kitte set olan parça bileşenlerine patlatılır: içinde 2 adet A geçen bir set 70 makinada 140 adet A üretir.
- **AC-14.** Patlatılan set kendi satırında da görünür ve satırı "patlatıldı" olarak işaretlenir.
- **AC-15.** İçeriği boş olan set bileşen üretmez ve ekranda nedeni yazar.
- **AC-16.** Stoğu 100 olan ve ihtiyacı 70 olan parçanın siparişi sıfırdır.
- **AC-17.** Stoğu 100 olan ve ihtiyacı 560 olan parçanın siparişi 460'tır.
- **AC-18.** İhtiyaç, stok ve sipariş üç ayrı sütunda görünür; sipariş sütunu hiçbir satırda negatif değer göstermez.
- **AC-19.** Emniyet payı %10 girilince 560 adetlik ihtiyaç 616 adede çıkar ve pay kendi sütununda görünür.
- **AC-20.** Emniyet payı boşsa ya da sıfırsa ihtiyaç değişmez ve pay sütunu boş görünür.
- **AC-21.** Emniyet payı 0 ile 100 arasında olmalıdır; dışındaki değer reddedilir ve nedeni alanın altında yazar.
- **AC-22.** Malzeme satırı olmayan parça parça ihtiyacı tablosunda görünür, malzeme tablosunda görünmez.
- **AC-23.** Kiti boş olan model hesaba girer, ihtiyaç üretmez ve ekranda modelin adıyla yazar.
- **AC-24.** Çöpteki parça kitte geçiyorsa ihtiyaç üretmez ve ekranda eksik olarak sayılır.

### Malzeme ihtiyacı ve boy

- **AC-25.** Ø140 x 78 bitmiş ölçülü, çapta 4 ve boyda 5 mm işleme paylı, özgül ağırlığı 7,90 olan parçanın ham ağırlığı 10,679 kg çıkar.
- **AC-26.** Aynı parçadan 70 adet için net malzeme ihtiyacı 747,512 kg çıkar.
- **AC-27.** Malzemenin boyu 6000 mm ise bir boydan çıkan adet 72 olur.
- **AC-28.** Aynı girdide gereken boy adedi 1 olur.
- **AC-29.** Sipariş kilosu bir boyun ağırlığıdır ve 771,957 kg çıkar.
- **AC-30.** Artan kilo 24,445 kg çıkar ve kendi sütununda görünür.
- **AC-31.** Tutar, kilo fiyatı 2,95 dolar ve kur 50,00 ile 113.863,68 TL çıkar.
- **AC-32.** Boydan çıkan adet sipariş adedinden küçükse boy adedi yukarı yuvarlanır: 150 adet için 6000 mm boy ve 83 mm kesim boyunda 3 boy çıkar.
- **AC-33.** Kesim boyu boy uzunluğundan büyükse boy adedi hesaplanmaz ve nedeni satırda yazar.
- **AC-34.** Malzeme kartında boy girilmemiş **ve firesi sıfır** olan malzemede boy adedi hesaplanmaz, sipariş kilosu net ihtiyaca eşittir ve nedeni satırda yazar (firesi olan dalı AC-37 kapsar).
- **AC-35.** Fire yüzdesi sıfırdan büyük olan ve boy adedi hesaplanabilen malzemede fire sipariş kilosuna eklenmez.
- **AC-36.** Aynı durumda ekran uyarı yazar ve hangi rakamın hangi kaybı taşıdığını söyler.
- **AC-37.** Boy adedi hesaplanamayan (kiloyla alınan) malzemede fire yüzdesi net ihtiyaca eklenir: 747,512 kg ve %8 fire 807,313 kg verir.
- **AC-38.** İki ayrı parça aynı malzemeyi **aynı ham kesitte** kullanıyorsa malzeme satırı ikisinin toplamıdır.
- **AC-39.** Kiloyla alınan (boyu girilmemiş) ve asgari siparişi 1000 kg olan malzemede 771,957 kg sipariş 1000 kg'a yuvarlanır ve fark 228,043 kg olarak kendi sütununda görünür.
- **AC-40.** Boyla alınan ve asgari siparişi 1000 kg olan malzemede bir boy 771,957 kg ise sipariş 2 boya (1.543,914 kg) yuvarlanır ve fark 771,957 kg olarak gösterilir.
- **AC-41.** **Kilo yöntemli** parçada özgül ağırlığı girilmemiş malzemenin ağırlığı hesaplanmaz; satır eksik sayılır, tutarı yazılmaz ve toplamı bozmaz.
- **AC-42.** Kilo fiyatı girilmemiş malzemenin kilosu ve boyu hesaplanır ama tutarı yazılmaz.
- **AC-43.** Çöpteki malzemeye bağlı parça eksik sayılır ve ekranda nedeni yazar.

### Tedarikçi, para ve çıktı

- **AC-44.** Malzemeler ana tedarikçisine göre gruplanır ve her grubun kendi toplamı yazar.
- **AC-45.** Ana tedarikçisi girilmemiş malzemeler kendi grubunda toplanır ve grup adı bunu söyler.
- **AC-46.** Çöpteki tedarikçiye bağlı malzeme grubunda tedarikçinin adı silinmiş olarak görünür ve tutarı toplamda kalır.
- **AC-47.** Kilo fiyatı TL olan malzemede kur hesaba girmez ve tutar kilo ile fiyatın çarpımıdır.
- **AC-48.** Kilo fiyatı euro olan malzemenin tutarı kendi para biriminde ve TL karşılığıyla gösterilir.
- **AC-49.** Tanınmayan para birimli malzemenin tutarı TL toplamına katılmaz, satırında nedeni yazar ve toplam bozulmaz.
- **AC-50.** Sipariş listesi Türkçe yazdırılır ve parça, malzeme ve tedarikçi bölümlerini taşır.
- **AC-51.** Hiç satırı olmayan girdide yazdırma düğmesi pasiftir.

### Salt okunurluk ve eksik veri

- **AC-52.** Ekranda yapılan hiçbir işlem parça stoğunu değiştirmez (stok hareketi yazılmaz).
- **AC-53.** Ekranda yapılan hiçbir işlem partinin planlanan adetlerini değiştirmez.
- **AC-54.** Ekran yeni bir eylem izni istemez; bugünkü Makina Maliyeti yetkisiyle açılır.
- **AC-55.** Stoğu sıfırdan farklı parça sayısı, hesapta geçen canlı parça sayısının yüzde beşinden azsa ekran parça stoğunun sayılmadığını yazar.
- **AC-56.** Bu oran yüzde beşe ulaşıyorsa o uyarı çizilmez.
- **AC-57.** Eksik veri sayısı ekranın başında yazar: kaç parçanın malzeme satırı, kaç malzemenin özgül ağırlığı ya da fiyatı eksik.
- **AC-58.** Emniyet payı boş bırakılan parça ve malzeme kaydedilip yeniden okunduğunda gövdesi spec öncesiyle aynıdır.

### QA turu kriterleri (2026-11-05)

- **AC-59.** Emniyet payı parça kartında malzeme satırının fire alanının komşusunda girilir ve kaydedilip yeniden okunduğunda korunur.
- **AC-60.** Emniyet payı malzeme kartında firenin komşusunda girilir ve kaydedilip yeniden okunduğunda korunur.
- **AC-61.** Sipariş İhtiyacı ekranı sürülürken hiçbir veri bölümüne yazım yapılmaz; ölçüm mutasyonla yapılır (parça ve malzeme bölümlerinin yazıcıları ekrana hiç verilmez).
- **AC-62.** Sunucunun bölüm eşlemesi değişmez: parça ve malzeme bölümleri yalnız Ayarlar sekmesinde yazılabilir kalır ve 0132'nin "Makina Maliyeti malzemeyi yalnız okur" kriteri aynen geçerlidir.
- **AC-63.** Aynı malzeme kaydından Ø144 ve Ø60 ham çaplı iki parça malzeme tablosunda **iki ayrı satır** üretir.
- **AC-64.** Bu iki satırın boy adedi, sipariş kilosu ve tutarı ayrı ayrı hesaplanır; biri öbürünün boy hesabına girmez.
- **AC-65.** Malzeme başlığı yalnız kiloyu ve tutarı toplar; başlık düzeyinde boy adedi yazılmaz.
- **AC-66.** Bantlı malzemede her kesitin kilo fiyatı kendi ham çapının bandından seçilir.
- **AC-67.** Boy yöntemli parçanın bulunduğu malzeme satırında kilo sütunu boş kalır ve nedeni yazar.
- **AC-68.** Boy yöntemli parçanın gereken boy adedi, oran ile sipariş adedinin çarpımlarının toplamından yukarı yuvarlanır.
- **AC-69.** Boy yöntemli satırın tutarı boy adedi ile boy fiyatının ve kurun çarpımıdır.
- **AC-70.** Boy yöntemli parça özgül ağırlık istemez ve özgül ağırlığı girilmemiş olsa da eksik sayılmaz.
- **AC-71.** Malzeme kaydına boy katı alanı eklenmez; kaynak taraması bunu sabitler.
- **AC-72.** Makina başı 0,114 adet kit satırı taşıyan makina stoğa kaydedilince o parça stoktan 1 adet (yukarı yuvarlanmış) düşer.
- **AC-73.** Kırparak düşen ortak yardımcının imzası ve davranışı değişmez; servis ve satış düşümleri spec öncesiyle birebir aynıdır.
- **AC-74.** Parça kartının model ile adet satırına 0,114 girilebilir ve kaydedilir.
- **AC-75.** Set içeriğine ondalık adet girilirse ayrı doğrulayıcı reddeder ve hata metni set içeriğine aittir.
- **AC-76.** Stoğu 3 olan setin 70 adetlik ihtiyacında 67 set patlatılır; içinde 2 adet A geçen sette A'nın ihtiyacı 134 adettir.
- **AC-77.** Setin satırı ihtiyaç, stok ve sipariş sütunlarını da gösterir; bileşen satırı yalnız patlatılan kalandan doğar ve toplamda çift sayım olmaz.
- **AC-78.** Makina başı 0,114 set, 1 makina ve 3 adet bileşen taşıyan sette bileşen ihtiyacı 3 adet çıkar (set adedi önce yukarı yuvarlanır).
- **AC-79.** Kitte hem set hem o setin bileşeni varsa ekran uyarı yazar ve bileşenin satırı adedin iki kaynaktan geldiğini gösterir.
- **AC-80.** Aynı durumda hesap iki kaynağı toplamaya devam eder; rakam 0121'in bugünkü kuralıyla aynıdır.
- **AC-81.** Parçanın emniyet payı girilmişse malzemenin payı okunmaz.
- **AC-82.** Parçanın ve malzemenin payı ikisi de boşsa pay sıfır sayılır ve ihtiyaç değişmez.
- **AC-83.** Makina başı 0,114 adet, 70 makina, %10 emniyet payı ve 2 adet stok ile ihtiyaç 9, sipariş 7 çıkar (ihtiyaç, pay, yukarı yuvarlama, stok düşümü sırası).
- **AC-84.** Malzeme tarafında aynı pay ikinci kez uygulanmaz; malzeme kilosu parçanın sipariş adedinden türer.
- **AC-85.** Stok uyarısı iki sayıyı birlikte yazar: stoğu sıfırdan farklı parça sayısı ve hesapta geçen parça sayısı.
- **AC-86.** Net ihtiyaç sütunu fire hariçtir ve fire kendi sütununda görünür; sipariş kilosu fire dahildir.
- **AC-87.** Çöpteki tedarikçinin adı grubunda görünür ve "silinmiş" işaretlidir; ekran ham tedarikçi dizisini yalnız ad çözümünde okur ve hiçbir yazım yapmaz.
- **AC-88.** Ekran eldeki parça stoğunu prop olarak alır ve motor stoğu parametre olarak alır; ekran eldeki miktarı kendi hesaplamaz (kaynak taraması).
- **AC-89.** Yerleşim düzeneği beşinci sekmeyi, parça stoğunu ve tedarikçi listesini taşır.
- **AC-90.** Lama ve sac biçimli parçada boy adedi hesaplanmaz, nedeni satırda yazar ve sipariş kilosu net ihtiyaç ile firenin toplamıdır.
- **AC-91.** Kesim boyu ham boydur: 78 mm net ölçülü ve 5 mm boy paylı parçada bir boydan çıkan adet 83 mm ile hesaplanır ve 6000 mm boyda 72 çıkar.
- **AC-92.** Tutar yuvarlanmamış kilodan hesaplanır: AC-31'in girdisinde sonuç 113.863,68 TL çıkar, kilo üç ondalığa yuvarlanmış değerden hesaplanmaz.
- **AC-93.** Parti başına 8 adet ve parti büyüklüğü 70 girilince saklanan makina başı değer 0,114 olur (üç ondalığa en yakına, yarım yukarı) ve çevrilen değer alanın yanında görünür.
- **AC-94.** Girilen parti adedi ile parti büyüklüğü kayda yazılmaz; kart yeniden açıldığında yalnız makina başı değer görünür.
- **AC-95.** Model satırı katalogdaki adı taşır: planlanan adetteki ad katalogla Türkçe küçültmeyle eşlenir, üretimde işareti katalog adıyla okunur.
- **AC-96.** Parti seçicisi açık partileri "(açık)" ekiyle listeler, varsayılan en son başlayan açık partidir ve kapanmış partiler listede kalır.
- **AC-97.** Malzemenin fiyat geçmişi sipariş hesabına girmez; fiyat bugünkü kümeden okunur.
- **AC-98.** Eksik veri sayısı yalnız bu girdide geçen parçalar ve onların malzemeleri üzerinden hesaplanır, bütün katalog üzerinden değil.
- **AC-99.** Malzeme satırı olmayan hazır parça eksik sayılmaz; kendi nötr sayısıyla yazılır.
- **AC-100.** Görünüm çubuğunun tek satırda kaldığı var olan Electron yerleşim testinde beşinci sekmeyle ölçülür.
- **AC-101.** Sipariş listesinin kurucusu kendi modülündedir; yazdırma şablonları dosyasına yazılmaz ve gider gizlilik taraması yeşil kalır.
- **AC-102.** Geçersiz model satırı hesaba girmez, öteki satırlar hesaplanır, tablonun başında "n satır hatalı" ibaresi çıkar ve yazdırma düğmesi pasiftir.
- **AC-103.** Makina adedi 10.000'den büyük girilirse satır reddedilir ve nedeni satırda yazar.
- **AC-104.** Kitte geçen çöpteki parça kit satırının ad kopyasıyla ve "silinmiş parça" işaretiyle görünür.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap React'sız **saf motorda** yazıldı ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Ağırlık ve kilo maliyeti 0132'nin motorundan okunuyor; ikinci formül yok ve bu kaynak taramasıyla sabitlendi.
- [ ] Emniyet payı alanında **dört nokta kuralı** uygulandı ve `db-roundtrip` ile `db-clean-install` testlerine eklendi; alan **kartlarda** girilir, Sipariş İhtiyacı ekranından yazılmaz (C4/2, R21/2).
- [ ] Sunucunun bölüm eşlemesi **değişmedi** ve 0132'nin "Makina Maliyeti malzemeyi yalnız okur" kriteri aynen geçerli (AC-62).
- [ ] Malzeme satırının anahtarı malzeme ve **ham kesit**; aynı malzemenin iki kesiti ayrı satır (R12/2).
- [ ] Boy fiyatından hesaplanan parça oranla hesaplanıyor; kilo ve özgül ağırlık istenmiyor, satır eksik sayılmıyor (R12/3).
- [ ] Ondalık kit adedi stoktan düşerken yukarı yuvarlanıyor ve ortak kırpma yardımcısının imzası değişmedi (R6/3, AC-73).
- [ ] Kit adedi doğrulayıcısı ikiye ayrıldı; **iki** kit kapısı birlikte gevşedi, set içeriği tam sayı kaldı (C1/2).
- [ ] Ekran eldeki parça stoğunu prop olarak alıyor ve motor stoğu parametre alıyor (R24, C3/2).
- [ ] Boy adedi yalnız tek boyutta kesilen biçimlerde hesaplanıyor; lama ve sacda nedeni yazıyor (R13/3).
- [ ] Boy katı şartı kapsam dışı (X9) ve malzeme kaydına yeni alan eklenmedi (AC-71).
- [ ] Görünüm çubuğu var olan Electron yerleşim düzeneğinde beşinci sekmeyle ölçüldü (AC-1, AC-100).
- [ ] Yazdırma kurucusu kendi modülünde, adları "siparis" önekli ve gider gizlilik taraması yeşil (R20/2, AC-101).
- [ ] Yeni veri bölümü **yok** ve bu açıkça yazıldı.
- [ ] Yeni eylem izni **eklenmedi** ve bu açıkça yazıldı.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı **yalnız Türkçe** ve bunun gerekçesi (X5) spec'te yazılı.
- [ ] Para gösteriliyor: TL, USD ve EUR kuralına uyuldu, tanınmayan para birimi tanımlı biçimde ele alındı.
- [ ] Arayüz kriterlerinin **görsel kanıtı** eklendi, boş ve hata durumları dâhil.
- [ ] Salt okunurluk mutasyonla ölçüldü: ekranı sürerken hiçbir veri bölümüne yazım yapılmadığı kanıtlandı.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (yeni kavram: sipariş ihtiyacı hesabı ve fire ile boy adedi ayrımı).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

Takım Yöneticisi'nin 2026-11-05 cevaplarından bu spec'e düşenler:

| Soru | Karar | Nerede |
|---|---|---|
| 16 | Parti başına adet girilsin, makina başı türetilsin | R6c, AC-11f, AC-11g (formun çevirme kolaylığı) |
| 17 | Esas kaynak makina başı olsun, parti toplamı türetilsin | R6, R6a, AC-11a…AC-11e (saklanan kaynak makina başı) |
| 18 | Yalnız üretimde olan modeller | R3, C5, AC-7 |
| 29 | Kilo, boy adedi ve tutar birlikte gösterilsin; boy malzeme kartında yazsın | R13, R14, R15, AC-25…AC-34 |
| 30 | Stok düşülsün ama ayrı sütunda görünsün; emniyet payı yüzde, varsayılan sıfır | R8, R9, AC-16…AC-21 |
| 31 | Malzemenin bir ana tedarikçisi olsun, liste ona göre gruplansın | R19, AC-44, AC-45 |
| 32 | Asgari sipariş ve boy katı şartı uygulanıp farkı gösterilsin | R18, AC-39, AC-40 |
| 33 | Adetler elle girilsin, üretim partisinden hazır gelsin; tahmin üretilmesin | R2, X7, AC-3, AC-6 |

### Verilen karar: kit adedi ondalık olacak

Sorular 16 ve 17 ters yönde cevaplanmıştı (ikisi de "öneri" onayı aldı). Uzlaştırma şudur: **saklanan doğruluk kaynağı makina başıdır** (17; uygulamanın kiti ve üretim partileri ekranı o yöndedir, ters yön oturmuyor), **parti başına giriş formun çevirme kolaylığıdır** (16; girilen parti adedi parti büyüklüğüne bölünür, R6c). Bedeli ölçüldü: 70 makinaya 8 adet giren parça makina başına 0,114 adet düşüyor, oysa kit adedi bugüne kadar tam sayı zorunluydu.

**Takım Yöneticisi 2026-11-05'te birinci seçeneği seçti** (analistin önerisi): kit adedi en çok üç ondalık kabul eder, setin içeriğinin adedi tam sayı kalır. Reddedilen iki seçenek ve gerekçeleri kayıt için burada duruyor:

- **Kit tam sayı kalsın, parti başına adet parçanın kendi alanında dursun.** İki adet kavramı olurdu (makina başı ve parti başı) ve hangisinin geçerli olduğu her hesapta sorulurdu; 0087'nin "adetin tek kaynağı kittir" kuralı kırılır ve o kural bir kez kırıldığında stok düşümü ile sipariş hesabı ayrışabilir.
- **Kit tam sayı kalsın, makina başına birden az giren parçalar yuvarlanarak girilsin.** En ucuz ama yanlış: 70 makinaya 8 adet giren parça 70 adet sipariş edilir, yani dokuz kat fazla.

**Kararın ölçülmüş bedeli:** doğrulayıcı `urunAgaci.kitAdediDogrula` bugün hem kit satırını hem setin içeriğini doğruluyor (`urunAgaci.js:255` ve `:460`), bu yüzden ikiye ayrılır. Hesap motoru ondalığı zaten okuyor (`makinaStandartMaliyet.js:207`), yani maliyet tarafında iş yok. Spec 0087'nin "kit adedi en az 1 tam sayı" kriteri bu spec'le **ters çevrilir** ve test yorumuna "spec 0134 ile" notu düşülür; 0121'in set içeriği kriteri aynen kalır.
### Analistin ölçümle değiştirdiği bir kural

Soru 6'nın cevabında işleme payı ile firenin ayrı tutulması kabul edildi ve gerekçesi "bunlar fiziken iki ayrı şey" diye yazılmıştı. Hesabı kurarken ölçtüm: boy adedi uzunluktan hesaplandığında kesim kaybı artan kilosunda **zaten görünüyor**, yani fire yüzdesi aynı kaybı üçüncü kez sayıyor ve rakamı bir boy fazla çıkarıyor (Context'teki tablo). Bu yüzden R16 fireyi boy hesabından çıkardı ve yalnız kiloyla alınan malzemede bıraktı. İşleme payı ile fire ayrı alanlar olarak kalıyor (soru 6'nın kararı korundu), değişen yalnız firenin sipariş hesabına nerede girdiğidir.
