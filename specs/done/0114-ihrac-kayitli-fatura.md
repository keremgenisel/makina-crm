# 0114 — İhraç kayıtlı fatura satış tipine eklenir

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3: QA turu, plan turu Karar 27–41, triyaj Karar 42, 2026-10-28; uygulama commit `e3768a8`; plan `specs/done/0114-uygulama-plani.md`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Satış tipi seçicisinin dört kopyası (`src/components/customers/CustomerAddEditForm.jsx:518-522`, `src/components/PartSaleForm.jsx:145-150`, `src/components/YedekParcaSatisForm.jsx:157-163`, `src/components/ServiceForm.jsx:282`); KDV'nin tek kapısı (`src/lib/utils.js:400-418` `satisKdvBolumu`, `tahsilEdilecekKdv`, `tahsilKdvOrani`); tevkifat kutusu ve özeti (`src/components/SatisTevkifatAlani.jsx`, kapı `src/lib/satisTevkifat.js:16`); müşteri detayının Kalan Borç kartı (`src/components/customers/detail/PaymentSection.jsx:52`) ve Makina Geçmişi rozeti (`src/components/customers/detail/MachineTimeline.jsx:35-43`); Stok yedek parça satırının rozeti (`src/components/stock/YedekParcaSatisTab.jsx:251`); Finans'ın KDV Karşılaştırması kartı (`src/components/gider/KdvKarsilastirmaKarti.jsx:65-71`) ve satış KDV'si köprüsü (`src/lib/giderKdv.js:12`, `src/lib/gider.js` `kdvKarsilastir`); aylık rapor motoru ve çıktısı (`src/lib/aylikRapor.js:572`, `src/lib/printTemplates.js:1676-1686`); üç tabloda yeni kalıcı alan `ihracKayitli` (`electron/db.cjs`: `TEVKIFAT_COLUMNS` emsali `:575-578`, üç okuma `:1379`, `:1457`, `:1468`, `applyColumnMigrations` `:1154`); yeni saf modül `src/lib/ihracKayitli.js` (R5/2); kart tabanının anlık görüntüsü (`src/lib/satisTevkifat.js:45-70` `tabanKaydi`, `kartTabanKaydi`, `kartTabanIsaretle`, `kartTabaniEskiMi`, `makinaKartTabaniEskiMi`); işaretin yazıldığı beş yer (`src/components/Customers.jsx:317` ve `:370`, `src/lib/kalipSatisi.js:9` ve `:82`, `src/lib/yedekParcaSatis.js:79` ve `:115`; 0111'in toplu düzenlemesi `:294` üzerinden aynı yoldan geçer); üç dışa aktarma raporu (`src/components/settings/SettingsExport.jsx:35`, `:207`, `:278` başlıkları ile `:55`, `:222`, `:295` satırları); KDV kartının **iki** çağıranı (`src/components/Finance.jsx:71-80` ve `src/components/Giderler.jsx:125-132`; 0047 raporunun iki argümanlı çağrısı `src/lib/giderRaporu.js:158` değişmez); rozetin teal tonları (`src/lib/theme.js:89-91` `teal`, `teal2`, `tealBg`, `tealBr`; yeni token eklenmez) |
| **Bağımlı spec'ler** | 0079 (tevkifatlı satış faturası: tahsil edilecek KDV kapısı, rozet, rapor kutusu ve kart bilgi satırının emsali), 0095 (ücretsiz yedek parça: bedelin tek okuma yolu), 0113 (bedel kutularının tahsilat esası) |
| **Ters çevrilen kriterler** | **Yok, ölçüldü.** Tasarım toplamsaldır: işaret taşımayan kayıtta bütün hesaplar ve bütün ekran metinleri bugünküyle birebir aynı kalır (R21, AC-30). Ölçüm 12: `SALE_TYPES`'ın seçenek sayısını ya da içeriğini iddia eden test yoktur; `tests/ui/form-paylasilan.test.jsx` yalnız alan etiketlerini sayar ve etiket değişmez; iki ekran kıyası altını (`tests/fixtures/0079-ekran-once.json`, `tests/fixtures/0095-ekran-once.json`) Finans, müşteri, bayi ve dışa aktarma metnini taşır, işaretsiz veride hiçbiri değişmez. 0079'un "tevkifatsız kayıtta sonuç `calcKDV` ile birebir aynıdır" güvencesi (R14, AC-12) korunur ve genişletilir: ikisi de işaretsiz kayıtta sonuç yine `calcKDV`'dir |

---

## Intent

Fabrika, ürettiği makinayı ve kalıbı bazen yurt içindeki bir ihracatçı firmaya, o malın ihraç edilmesi şartıyla satıyor. Bu satışta fatura KDV'li kesilir ama KDV tahsil edilmez; vergi dairesi bu KDV'yi erteler ve mal süresinde ihraç edilince siler. Uygulamada böyle bir satış tipi yok, dolayısıyla bu satışlar ya "Faturalı Yurtiçi" girilip tahsil edilmeyecek KDV müşteriye borç yazılıyor, ya "Faturalı Yurtdışı" girilip yurt içi satış yurt dışı sayılıyor. İkisi de yanlış.

Takım Yöneticisi satış tipi listesine beşinci bir fatura tipi eklemek istiyor. İş bittiğinde makina, Extra Kalıp ve yedek parça satışında "İhraç Kayıtlı" seçilebilecek; fatura üstünde KDV görünmeye devam edecek ama o KDV müşteriye borç yazılmayacak, bizim ödeyeceğimiz KDV'ye girmeyecek ve Finans ile aylık raporda kendi başlığı altında bilgi olarak duracak. Servis bu kapsama girmeyecek, çünkü ihraç kayıtlı yalnız mal teslimi için geçerlidir.

Başarı şudur: ihraç kayıtlı bir makina satışında müşterinin kalan borcu yalnız mal bedeli kadardır, Finans'ın Toplam Alacak kartı ertelenen KDV'yi saymaz, Ödenmesi Muhtemel KDV kartı onu ödenecek göstermez, ve muhasebe aylık raporda ertelenen KDV'nin toplamını tek bakışta görür.

---

## Requirements

### A. Model ve kapsam

- **R1.** İhraç kayıtlı satış, satış tipi "Faturalı Yurtiçi" olan bir satışın **işaretidir**. Satış tipi listesine beşinci bir değer eklenmez; kayıtta satış tipi "Faturalı Yurtiçi" kalır ve işaret ayrı bir alandır.
- **R2.** İşaret **üç kayıt türünde** bulunur: makina satışı, Extra Kalıp satışı, yedek parça satışı. Servis kaydında bulunmaz.
- **R3.** Kullanıcı tek bir açılır listede **beş** seçenek görür: bugünkü dört satış tipi ve "İhraç Kayıtlı". Beşinciyi seçmek satış tipini "Faturalı Yurtiçi" yapar ve işareti açar; diğer dördünü seçmek işareti **siler**.
- **R4.** Beşinci seçenek servis formunda **çizilmez**. Seçici bu soruyu parametreyle sorar; dört formun hiçbiri kendi seçenek listesini yazmaz.
- **R5.** Seçicinin gösterdiği değerin ve kayda yazılacak değerin çevrimi **tek bir yerden** yapılır: kayıttan ya da form durumundan beş değerli seçimi üreten ve seçimden kayıt alanlarını üreten iki saf yardımcı. Dört form bu yardımcıları çağırır, kendi çevrimini yazmaz.
- **R5/2.** Adlar bu spec'te sabitlenir, uygulama turunda uydurulmaz. Kalıcı alan **`ihracKayitli`** (boolean) ve üç tabloda aynı adı taşır. Saf modül **`src/lib/ihracKayitli.js`** şunları dışa verir: `ihracKayitliSecilebilirMi(saleType)` (kapı, `satisTevkifatSecilebilirMi` emsali), `satisTipiSecimi(kayit)` (kayıttan ya da form durumundan beş değerli seçimi üretir), `satisTipiUygula(secim)` (seçimden satış tipi ve işaret anahtarlarını üretir), `ihracKayitliUygula(rec, form, saleType)` (kayda yazar ya da siler) ve bu spec'in bütün ekran metinleri. Modül gider motoruna bağlanmaz (0079 R4 ile aynı kural) ve React almaz.
- **R6.** İşaret ancak satış tipi "Faturalı Yurtiçi" iken anlamlıdır. Satış tipi başka bir değere çevrilirse işaret kayıttan silinir; silinmez diye bırakılmış eski bir işaret okumada yok sayılır.
- **R6/2.** Silme ve yazma işini tek yazıcı yapar ve çağrıldığı yerler burada sayılır: `Customers`'ın ekleme (`:317`) ve düzenleme (`:370`) kolları, `kalipSatisi.kalipSatisOrtak` (`:9`) ile `kalipGuncelle` (`:82`), `yedekParcaSatis.yedekParcaRec` (`:79`) ile `yedekParcaGuncelle` (`:115`). Beş yol yeterlidir: 0111'in toplu düzenlemesi `yedekParcaGuncelle`'den geçer (`yedekParcaSatis.js:294`). Yedek parça zincirinde `ihracKayitliUygula` **`ucretsizUygula`'dan önce** çağrılır, böylece R8'in silmesi son söz olur (0095'in "son adım" kuralı korunur). Servisin iki kurucusunda (`CustomerDetailModal.saveService`, `ServisPanosu.kaydet`) çağrılmaz. Düzenleme kolları `{ ...eski, ...rec }` birleştirmesi yaptığı için yazıcıdan geçmeyen bir kol işareti **silmez**, sessizce kalıcı yapar; bu yüzden alanın başka bir yerde yazılması kaynak taramasıyla yasaktır (C12).
- **R7.** İşaret ile tevkifat **birlikte bulunamaz**. İşaret açıkken tevkifat kutusu çizilir ama pasiftir ve nedeni yanında yazar; tevkifat alanları kayıttan silinir.
- **R7/2.** Birlikte bulunmama kuralı **üç katmanda** uygulanır ve sırası bağlayıcıdır: (1) **seçim anında** `satisTipiUygula` formun üç tevkifat anahtarını da temizler, (2) **kayıt anında** `ihracKayitliUygula` aynı anahtarları kayıttan siler (ikinci savunma, R6/2'nin birleştirme tuzağı için), (3) **doğrulama** yalnız formdan gelmeyen veri için anlamlıdır (R12/2). Bu sıra olmadan kullanıcı çıkmaz sokağa girer: tevkifatlı bir kaydı açıp "İhraç Kayıtlı" seçince form `tevkifatli: true` taşımaya devam eder, doğrulama kaydı reddeder ve onay kutusu pasif olduğu için işaret kaldırılamaz, kayıt hiçbir şekilde kaydedilemez.
- **R7/3.** "Pasif" şu demektir: onay kutusu `disabled` ve **işaretsiz** çizilir (R7/2'nin birinci katmanı formu temizlediği için), nedeni yanında bir ipucu satırında durur, oran seçicisi ve tevkifatın üç kalıcı notu çizilmez. Kutu bugün kapı kapalıyken hiç çizilmiyor (`SatisTevkifatAlani.jsx:14`), yani bu yeni bir çizim dalıdır. "Pasif ama işaretli" bir kutu çizilmez: iki kavramın birlikte var olduğunu söyler ve C4'ün ayrımını bozar.
- **R8.** Ücretsiz verilen yedek parçada fatura yoktur: ücretsiz işareti açıkken ihraç kayıtlı seçicisi çizilmez ve işaret kayıttan silinir (0095'in ödeme alanlarını temizleme kuralıyla aynı yol).
- **R8/2.** R8 **yedek parçaya özgü** bir kuraldır ve nedeni ölçülmüştür: `partSales` de `ucretsizMi` taşır ve okunur (`kalipBorcTarafi` ücretsizde `null`, `aylikRapor.js:143` ücretsiz Extra Kalıp'ı atlar), ama Extra Kalıp formunda ücretsiz kutusu **yoktur** ve `kalipSatisi.js:12` her kayda `ucretsizMi: false` yazar, yani işaretli ve ücretsiz bir Extra Kalıp ancak eski veriden doğabilir. Buna karşı tek savunma okuma anındadır: rapor kutusu ve rozet `satisUcretsizMi(p)` olan Extra Kalıp kaydını `aylikRapor.js:143` ile aynı kuralla atlar, yani böyle bir kayıt kutuya matrah katmaz ve rozet taşımaz.

### B. KDV ve para

- **R9.** Faturanın **ham KDV'si değişmez**: fatura üstünde görünen ve yazdırmanın okuduğu toplam KDV bugünkü hesapla aynı kalır.
- **R9/2.** Tek kapının dönüş şekli bu spec'te sabitlenir ve donar. `satisKdvBolumu` bugün `{ toplamKdv, tevkifat, bizKdv, tevkifatli, pay?, payda? }` döndürüyor (`utils.js:400-408`) ve çağıranlar `b.tevkifatli` üzerinden dallanıyor (`MachineTimeline.jsx:38`, `YedekParcaSatisTab.jsx:250`, `printTemplates.js:288`, `aylikRapor.js:84`, `satisTevkifat.js:83`, `:94`). İhraç kayıtlı dalında nesne iki anahtarla büyür, **`ihracKayitli: true`** ve **`ertelenenKdv`**; `toplamKdv` ham KDV olarak değişmez, `bizKdv: 0`, `tevkifat: 0` ve `tevkifatli: false` olur. Böylece `b.tevkifatli` okuyan altı yer dokunulmadan doğru kalır (tevkifat rozeti ve tevkifat özeti işaretli kayıtta çizilmez) ve `ertelenenKdv` ile `toplamKdv` eşit olur. İşaretsiz ve tevkifatsız kayıtta dönüş bugünküyle birebir aynıdır.
- **R10.** **Tahsil edilecek KDV sıfırdır.** Bu, bugün tevkifatın geçtiği tek kapıdan geçer; yeni bir KDV hesabı yazılmaz ve hiçbir ekran kendi kuralını kurmaz.
- **R11.** Tek kapı aynı zamanda **tahsil oranını** sıfırlar: kredi kartı tutarının hesabı ve ödemenin mal ile KDV ayrıştırması ihraç kayıtlı satışta KDV'siz tabanla yapılır.
- **R11/2.** Kart tabanının anlık görüntüsü **kendi işaretini taşır**. Ölçülen kusur: `tahsilKdvOrani` kaydı okur ama kart tabanı kaydın kendisinden değil `kartTabanKaydi(form)`'dan gelir (`PartSaleForm.jsx:318`, `YedekParcaSatisForm.jsx:334`, `satisTevkifat.js:103`, `kalipSatisi.js:68`, `yedekParcaSatis.js:69`, `Customers.jsx:326`), o da kayıtlı bir `kartKomisyonu` varsa `tabanKaydi(kk)` döndürür ve `tabanKaydi` yalnız `kk.tevkifatTaban` dizesini okur (`satisTevkifat.js:45-56`), yani işareti taşımaz ve `null` döner. Sonuç: işaretli bir satışın formu ikinci kez açıldığında kart özeti **tam KDV oranıyla** hesaplanır ve `kartTabaniEskiMi` yalnız tevkifat etiketlerini karşılaştırdığı için uyarı da çıkmaz. Düzeltme: `kartTabanIsaretle` işaretli satışta anlık görüntüye **`ihracTaban: true`** yazar, `tabanKaydi` onu `{ ihracKayitli: true }` olarak geri okur, `kartTabaniEskiMi` ve `makinaKartTabaniEskiMi` ihraç işaretini de karşılaştırır ve fark varsa 0079'un var olan kart uyarısı ile "yeni tabanla hesapla" düğmesi çıkar. İşaret taşımayan eski anlık görüntüler tevkifatsız ve ihraçsız sayılır (0079 R13 ile aynı kural).
- **R12.** İşaret ile tevkifat bir şekilde aynı kayıtta bulunursa ihraç kayıtlı kazanır (tahsil edilecek KDV sıfırdır) ve bu sessizce olmaz: doğrulama bu kaydı reddeder.
- **R12/2.** Bu ret **kayıt düzeyindedir** ve form bu durumu üretemez (R7/2'nin birinci katmanı). Yani ret, verisi formdan gelmeyen kayıtlar için bir savunmadır: içe aktarma, birleştirme ve güncellenmemiş bir istemcinin gövdesi. Doğrulama saf motorda yaşar, saf motor testiyle ölçülür ve formdan tetiklenemediği için ekranda hata metni aranmaz. Reddin gerekçesi kaydın yanında değil, kaydı reddeden yolun bildirimiyle verilir.
- **R13.** Ertelenen KDV'nin tutarı **türetilir, saklanmaz**: ham KDV ile tahsil edilecek KDV'nin farkıdır.
- **R14.** Para birimi kısıtlanmaz; üç para biriminde de aynı kural işler. Tanınmayan para birimi bugünkü kuralla TL kovasına düşer.
- **R14/2.** Motor ile kart arasındaki para birimi ayrımı bilinçlidir ve burada yazılıdır: **motor** ertelenen KDV'yi para birimi başına biriktirir (`tevkifatliSatis` emsali), **aylık raporun kutusu** bütün para birimlerini basar (`paraSatir` çok paralıdır), **KDV Karşılaştırması kartının bilgi satırı ise yalnız TRY rakamını yazar**. Nedeni ölçülmüştür: kart kuruşla yalnız `TRY` üzerinden çalışır (`gider.js:1329-1335`), Finans ve Giderler ona `aliciBeyan.TRY || 0` geçer (`Finance.jsx:80`, `Giderler.jsx:132`) ve TL dışı tutarlar kartın ayrı "karşılaştırmaya dahil edilmeyen hesaplanan KDV" satırında durur (`KdvKarsilastirmaKarti.jsx:73`). Karşılaştırma beyanname kontrolüdür ve beyan TL'dir; motoru TL'ye indirgemek raporun çok paralı kutusunu bozar. İki tarafın farklı olması eksiklik değildir, sonradan "düzeltilmez".

### C. Borç, alacak ve Finans

- **R15.** Ertelenen KDV **müşteriye borç yazılmaz**: makinanın kalan borcu, servis ve parça alacağı, Extra Kalıp ve yedek parça alacağı yalnız mal bedelini içerir.
- **R16.** Ertelenen KDV Finans'ın **Toplam Alacak** kartına girmez.
- **R17.** Ertelenen KDV Finans'ın **Ödenmesi Muhtemel KDV** kartına girmez.
- **R18.** Ertelenen KDV, **KDV Karşılaştırması** kartındaki hesaplanan satış KDV'sine girmez ve ödenecek farkı değiştirmez; kartta kendi **bilgi satırı** olarak görünür (0079'un "alıcının beyan edeceği KDV" satırının komşusu, metni ayrıdır).
- **R18/2.** Bilgi satırı **iki ekranda** da aynı metinle görünür: Finans ve Giderler. Nedeni ölçülmüştür: kart tek bileşendir ve iki ekran da 0079'un bilgi satırını besler (`Finance.jsx:80`, `Giderler.jsx:132`); üçüncü çağıran olan Aylık Gider ve Kasa Raporu iki argümanla çağırır (`giderRaporu.js:158`), bu çağrı **değişmez** ve satır o belgede basılmaz. Satır Finans'ta `raporAy`'a bağlıdır, yani ekranın tarih aralığına değil seçilen aya aittir (0079 ile aynı).
- **R19.** Finans'ın **bedel kutuları değişmez**: tahsil edilmeyen yalnız KDV'dir, mal bedeli normal tahsil edilir ve 0113'ün tahsilat esası aynen işler.
- **R20.** Kayıt **kaydedildiğinde** makinanın saklı kalan borcu yeni kuralla yeniden yazılır. İşaret yalnız formdan açılabildiği için bu her zaman olur.
- **R21.** İşaret taşımayan kayıtta bütün bu hesapların çıktısı bugünküyle **birebir** aynıdır.

### D. Ekranda görünürlük

- **R22.** Üç formda, satış tipi seçicisinin altında kuralı anlatan tek bir açıklama satırı bulunur: fatura KDV'li kesilir, KDV tahsil edilmez, yalnız imalatçının kendi ürettiği malda ve alıcı ihracatçı firma olduğunda kullanılır.
- **R22/2.** R5'in seçim yardımcısı **yalnız** satış tipi ve işaret anahtarlarını döndürür; formun kendi yan etkileri yerinde kalır. Ölçülen yan etki: müşteri formunun satış tipi `onChange`'i aynı anda `faturaBedeli`'ni de temizliyor (`CustomerAddEditForm.jsx:519`) ve aynı temizlik kaydetmede de uygulanıyor (`Customers.jsx:319`). Bu temizlik formda kalır, yardımcıya girmez: saf yardımcıya ekran temizliği girerse dört formun üçünde var olmayan bir alanı silmeye kalkar ve iki yer farklı davranır.
- **R23.** Üç formda, faturaya yazılacak zorunlu ibare kopyalanabilir biçimde gösterilir ve yanında uygulamanın yurt içi fatura basmadığı yazar.
- **R23/2.** İbarenin metni burada sabitlenir, uygulama turunda yazılmaz: **"3065 sayılı KDV Kanunu'nun 11/1-c maddesi hükümlerine göre ihraç edilmek şartıyla teslim edildiğinden KDV tahsil edilmemiştir."** Metin `ihracKayitli.js`'te tek sabittir (R28) ve kopyalanabilir bir öğede gösterilir. Faturaya basılacak hukuki ibare uygulama turunda yazılırsa yanlış yazıldığında faturanın kendisi geçersiz sayılır ve bunu hiçbir test yakalamaz.
- **R24.** Yedek parça formunda ek bir sınır satırı bulunur: ihraç kayıtlı yalnız kendi ürettiğimiz parçada kullanılır, hazır alınıp satılan parçada kullanılmaz ve bu kararı uygulama veremez.
- **R25.** Formun **mevcut** KDV kutusunun içine, tevkifat özetinin kalıbıyla beş satırlık bir özet girer: matrah, faturadaki toplam KDV, ertelenen KDV, tahsil edilecek KDV, tahsil edilecek fatura toplamı. Yeni bir kutu açılmaz.
- **R25/2.** Son satırın anlamı yazılıdır: ihraç kayıtlı satışta tahsil edilecek KDV sıfır olduğu için **tahsil edilecek fatura toplamı matraha eşittir**. Özet tevkifat özeti gibi faturayı temsil eder, tahsilat kapsamını değil (**0079'un** R23/1 maddesi); yani ödeme durumuna bakan bir "tahsil edilen" rakamı bu özette hesaplanmaz.
- **R26.** İşaretli kayıt, müşteri detayının Makina Geçmişi satırında ve Stok yedek parça satırında bir **rozet** taşır; rozet ertelenen KDV'nin tutarını yazar. Rozet tevkifat rozetinin bulunduğu yerde, aynı ölçüde, ayrı renkte durur.
- **R26/2.** Rozetin çizildiği yerler sayılır: tevkifat rozetinin bugün çizildiği her yer, **servis satırı hariç**. Yani Makina Geçmişi'nde satış olayı (`MachineTimeline.jsx:272`), Extra Kalıp satırı (`:341`) ve yedek parça grubu (`:291`), ayrıca Stok yedek parça satırı (`YedekParcaSatisTab.jsx:250`). Servis satırı (`:436`) hariçtir çünkü servis kaydı hiçbir zaman işaretlenemez (R2). İşaretlenebilen üç kayıt türünden birinde rozet çizilmezse o kayıt ekranda sıradan bir faturalı satış gibi görünür.
- **R26/3.** Rozetin rengi **teal**'dir: zemin `tealBg`, metin `teal2` (`theme.js:89-91`'de tanımlı, yeni token eklenmez, dolayısıyla 0030'un tema taraması etkilenmez). Tevkifat rozeti mavidir (`bluBg2` / `blu700`) ve iki rozet aynı yerde, aynı ölçüde durur; aynı renkte olurlarsa kullanıcı iki kavramı ayırt edemez. `tasarim-kontrast`'a bu rozetin satırı eklenir.
- **R27.** Müşteri detayının Kalan Borç kartında, ertelenen KDV'nin borca girmediğini söyleyen bir satır bulunur. Satır yalnız işaretli kayıt varken çizilir.
- **R27/2.** "İşaretli kayıt" burada **makina kaydının kendisidir**, müşterinin herhangi bir kaydı değil. Satır `detailView`'ın işaretli olmasıyla çizilir ve makinanın ertelenen KDV tutarını yazar (0079'un emsali de yalnız makina kaydını okur: `CustomerDetailModal.jsx:136`, `:971`). İşaretli bir Extra Kalıp ya da yedek parça satışı kart satırına girmez, kendi zaman çizelgesi satırındaki rozetle görünür (R26/2) ve kart satırının onları kapsamadığı ekranda da iddia edilmez. Kartın toplamı servis, parça ve kalıp borcunu da taşıdığı için (`PaymentSection.jsx:46-49`) kapsamın yazılması zorunludur. Satır tevkifatın satırıyla **aynı prop'u paylaşmaz**: ayrı prop, ayrı sabit, ayrı `data-testid` (`ihrac-kayitli-borc`); müşterinin tevkifatlı makinası ile işaretli kalıbı aynı anda bulunabileceği için iki metin tek yere bindirilmez (C4).
- **R28.** Rozet ve satır metinlerinin her biri tek bir sabitten gelir; ekranlar metin yazmaz.

### E. Aylık rapor

- **R29.** Aylık Faaliyet Raporu'nda, tevkifat kutusunun hemen altında "İHRAÇ KAYITLI TESLİMLER" kutusu bulunur: teslim adedi, matrah, faturadaki toplam KDV, ertelenen KDV ve tahsil edilecek fatura toplamı.
- **R29/2.** Beşinci rakamın adı **"Tahsil edilecek fatura toplamı"**dır ve matraha eşittir; kutu bunu açıkça söyler. "Tahsil edilen bedel" yazılmaz: 0113'ten sonra "tahsil edilen" bu uygulamada bağlayıcı bir terimdir (`satisTahsilEdildi`, ödeme işareti geçmiş kayıt) ve kutu tevkifat kutusu gibi **tahakkuk esaslıdır**, tahsilat sormaz (`printTemplates.js:1680-1685`). Ödeme durumuna bakan bir rakam bu kutuda hesaplanmaz; tahsilat sorusu 0113'ün kendi kutularında cevaplanır. Aynı kutuda tahakkuk ile tahsilat rakamını yan yana koymak kutunun matrahıyla toplanamayan ikinci bir rakam üretirdi.
- **R30.** Kutunun altında ertelenen KDV'nin bilgi amaçlı olduğu, KDV özetine ve açık alacağa girmediği yazar.
- **R30/2.** Kutunun dipnotundan **ayrı** olarak, KDV özetinin altına da bir kardeş dipnot basılır. Emsali tevkifattır: `tevkifatDipnot` kutunun dipnotundan bağımsızdır ve KDV özetinin altına basılır (`printTemplates.js:1678`, basıldığı yer `:1836`), çünkü özetin rakamları artık tahsil edilecek KDV'dir. İki dipnot aynı raporda birlikte de basılabilir; sırası tevkifat dipnotu, sonra ihraç kayıtlı dipnotudur. Rapor beyanname öncesi kontrol içindir: özetin KDV'sinin neden düşük göründüğünü söyleyen cümle yalnız kutunun içinde kalırsa okuyucu özete bakıp yanlış rakam beyan eder.
- **R31.** Ayda ihraç kayıtlı teslim yoksa kutu ve dipnotu **hiç basılmaz**; rapor bugünküyle birebir aynı olur.
- **R32.** Kutunun rakamları rapor motorundan gelir, çıktı yeniden hesaplamaz.
- **R33.** Aylık raporun KDV toplamı ertelenen KDV'yi saymaz ve raporun fatura tipi kırılımında ihraç kayıtlı teslim "Faturalı Yurtiçi" satırında görünmeye devam eder; ayrı bir fatura tipi satırı açılmaz.
- **R33/2.** Kırılımın bozulmaması doğru karardır ama okuyucuyu yanıltır: `ftEkle` kaydı `normalizeSaleType` ile kovaya attığı için (`aylikRapor.js:28`) işaretli kayıt "Faturalı Yurtiçi" satırında görünür, ama o satırın **KDV sütunu** ertelenen KDV'yi içermez ve net ile KDV birbirini tutmaz. R30'un dipnotu bu yüzden bir cümle daha taşır: fatura tipi kırılımındaki "Faturalı Yurtiçi" satırının KDV'si ertelenen KDV'yi içermez. Yeni satır ve yeni sütun açılmaz.

### F. QA turunda eklenen kurallar (2026-10-28)

- **R34.** İşaret **dışa aktarmada** görünür. Bugün üç raporda kaybolur: müşteri raporunun "Satış Tipi" sütunu `normalizeSaleType` ile "Faturalı Yurtiçi" yazar ve "KDV" sütunu `tahsilEdilecekKdv` ile beslenir (`SettingsExport.jsx:207`, `:215`), yani işaretli bir 200.000 TL satış Excel'de sıfır KDV'li sıradan bir yurt içi satış olur; aynı şey Extra Kalıp (`:278`, `:295`) ve yedek parça (`:35`, `:55`) raporlarında da geçerlidir. Üç raporun sonuna, 0079'un iki sütununun yanına iki sütun daha eklenir: **"İhraç Kayıtlı"** ve **"Ertelenen KDV"**, tek bir dışa aktarma yardımcısından (`satisTevkifatExportHucreleri` emsali). İşaretsiz satırda iki hücre de boş kalır, böylece AC-30'un kıyası etkilenmez. Finans Özeti sayfası tahakkuk esaslı kalır ve sütun almaz (0113 C7 ile aynı karar). Bu spec'in varlık nedeni tahsil edilmeyen KDV'yi doğru yerde göstermek; muhasebenin okuduğu dosyada hem satış tipi hem KDV sütunu bilgiyi düşürüyorsa iş yarım kalır.
- **R35.** Güncellenmemiş bir istemci işareti yalnız **görmez** değil, ilk düzenlemede **siler**. Zincir ölçüldü: eski istemci kaydı okuduğunda alan gövdeye hiç girmez, o istemci kaydı düzenleyip kaydettiğinde gövde alanı taşımaz ve yeni sunucu sütuna `null` yazar; makinada ayrıca saklı kalan borç o istemcinin kendi hesabıyla (tam KDV) yeniden yazılır (`Customers.jsx:333`, `:377`), yani borç rakamı yükselir. Bu yüzden sürüm notu 0071'in dilini alır: önce sunucu PC, **sonra bütün istemciler** güncellenir ve güncelleme bitene kadar bu seçenek kullanılmaz (C13).

---

## Zorunlu kısıtlar

- **C1.** **Satış tipi listesi büyümez.** `SALE_TYPES` dört değerde kalır ve `normalizeSaleType` değişmez. Bu kural ölçülmüş bir tuzağı kapatıyor: çözücü eski değerleri metin içinde arıyor ve içinde "ihrac" geçen her değeri Yurtdışı sayıyor (`src/lib/utils.js:291`). Beşinci bir tip değeri eklenirse güncellenmemiş bir bilgisayar kaydı sessizce "Faturalı Yurtdışı"na çevirir ve ilk düzenlemede geri yazar.
- **C2.** `isFaturali` ve `isYurtIci` değişmez. İhraç kayıtlı satış ikisi için de doğrudur; ölçüm 7'deki kırk çağrı yerinin hiçbirine dokunulmaz.
- **C3.** **KDV'nin tek kapısı korunur.** Tahsil edilecek KDV ve tahsil oranı `satisKdvBolumu`'nun içinde hesaplanır; `calcKDV` ham KDV olarak kalır ve 0079'un kaynak taraması (AC-11) geçerli kalır.
- **C4.** Tevkifat alanları **yeniden kullanılmaz**. İhraç kayıtlı, oranı 10/10 bir tevkifat olarak yazılmaz: beyan ayrı tabloda, basılan ibare ayrı, raporda ayrı kutu. Aynı şekli paylaşan iki ayrı kavram tek alana bindirilmez (0074'ün SGK'yı personel kalemine gömmeme kararıyla aynı sınıf).
- **C5.** Yeni kalıcı alan **dört nokta kuralıyla** üç tabloya girer ve `tevkifatYaz` / `tevkifatOku` emsalini izler: kapalı değer gövdeye **yazılmaz** (false da değil), yoksa güncellenmemiş istemcinin gövdesiyle karşılaştırma bölümü değişmiş görünür ve kısıtlı kullanıcı her kayıtta 403 alır.
- **C6.** Göç yoktur. Var olan hiçbir kayıt işaretlenmez (ölçüm 2).
- **C7.** Yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı yoktur. Alan bölüm düzeyinde güvenilir; `ALAN_IZINLERI` yalnız `durum` ve `kargoDurum` alanlarını izler (`electron/serverAuth.cjs:569-573`, ölçüm 11). Bu, salt okunur bir iş olmadığı için bilinçli bir karardır ve açıkça yazılmıştır.
- **C8.** **Karışık sürüm:** güncellenmemiş bir sunucu alanı düşürür, güncellenmemiş bir istemci işareti taşımaz. İkisinde de sonuç aynı: işaret kaybolur ve KDV tahsil edilebilir hale döner, yani borç rakamı yükselir. Bu gürültülü ama görünür bir sapmadır, sessiz değildir. Sürüm notu önce sunucu PC'nin güncellenmesini ve güncelleme bitene kadar bu seçeneğin kullanılmamasını söyler.
- **C9.** Aynı sayıyı üreten iki yer tek kaynağı kullanır: Finans ekranı ile aylık rapor ertelenen KDV'yi aynı motordan okur (bu projede Finans ile raporun ayrışması iki kez hata oldu).
- **C10.** Ekranlarda çarpma ve bölme yapılmaz; rozetin, özetin ve kutunun rakamları motordan gelir.
- **C11.** `kdvKarsilastir`'ın **konumlu parametreleri büyümez.** İmza bugün dört konumlu parametreyle dolu (`gider.js:1328`) ve üçüncü çağıran iki argüman geçiyor (`giderRaporu.js:158`). Ertelenen KDV beşinci konumlu parametre olarak değil **adlandırılmış seçenek** olarak geçer: `kdvKarsilastir(hesaplanan, ind, tevkifatTL, satisTevkifatTL, { ertelenenKdvTL })`. Seçenek verilmeyen çağrının çıktısı birebir eskidir (0075'in parametresiz çıktı güvencesi korunur); beşinci konumlu parametre beşinci bir çağrı yerinde sessizce kayar.
- **C12.** Alan **tek yazıcıdan** yazılır. `ihracKayitli` anahtarına `src` altında yalnız `ihracKayitli.js` dokunur; başka bir dosyanın alanı yazması (ya da `delete` etmesi) kaynak taramasıyla yasaktır (0095'in `ucretsizUygula` taramasıyla aynı sınıf). Okumak serbesttir ama kuralı yazmak değildir: beş yazım yolundan birini atlamak işareti sessizce kalıcı yapar (R6/2).
- **C13.** **Bütün istemciler** güncellenir, yalnız sunucu PC değil. Gerekçesi R35'te ölçüldü: güncellenmemiş bir istemci işaretli bir kaydı düzenlediğinde işaret kalıcı olarak silinir ve saklı kalan borç tam KDV ile yeniden yazılır. Sürüm notu bunu birebir söyler.

---

## Kapsam dışı

- **X1.** Üç aylık ihracat süresinin, ek süre başvurusunun, "ihraç edildi mi" durumunun ve gecikme zammı riskinin takibi — *neden:* Takım Yöneticisi istemedi. Kavram başlı başına bir iş: teslim tarihi, türetilmiş son tarih, durum alanı, hatırlatıcı ve süre dolunca KDV'nin ödenebilir hale gelmesi demek. Fatura tipini ve KDV davranışını önce doğru oturtmak, süre takibini sonra kendi spec'inde yapmak tercih edildi.
- **X2.** İmalatçının yüklendiği KDV'nin iadesi ve beyanname kalemleri — *neden:* mali müşavirin işi. Uygulamanın görevi faturayı doğru işaretlemek ve tahsil edilmeyen KDV'yi hesaplara doğru yansıtmak.
- **X3.** Zorunlu 11/1-c ibaresinin bir fatura çıktısına basılması — *neden:* uygulamada yurt içi fatura çıktısı yok. Evrak'ın üç belgesi Teklif, Proforma ve Yurt Dışı Fatura (`src/components/Documents.jsx:847`); yurt içi faturayı e-fatura yazılımı kesiyor. İbare formda kopyalanabilir biçimde gösterilir (R23).
- **X4.** Teklif ve proforma çıktısına ihraç kayıtlı bilgisinin eklenmesi — *neden:* teklifin KDV oranı bugün elle yazılan serbest bir alan (`src/components/Documents.jsx:1285`), ihraç kayıtlı bir teklifte 0 yazmak yeterli. Teklif bir tekliftir, fatura değil.
- **X5.** Servis kaydının ihraç kayıtlı işaretlenmesi — *neden:* ihraç kayıtlı yalnız mal teslimi için geçerli, hizmet için değil. Servis kaydının tek fatura tipi alanı işçiliği ve değişen parçaları birlikte kapsıyor; işareti buraya koymak işçiliği de kapsama alırdı. Servis kaydına iki ayrı fatura tipi vermek bambaşka bir iştir.
- **X6.** Kendi ürettiğimiz parça ile hazır alıp sattığımız parçanın kodla ayırt edilmesi — *neden:* veride böyle bir işaret yok. Karar kullanıcının, uygulama yalnız kuralı yazar (0076'nın binek araç kutusuyla aynı yol).
- **X7.** Makinayı fiilen kullanan yurt dışındaki firmanın ayrıca kaydedilmesi — *neden:* faturanın doğru kesilmesi için gerekmiyor ve ikinci bir müşteri ilişkisi bütün Müşteriler ekranına dokunur. Kayıt faturanın kesildiği firmaya, yani ihracatçıya açılır. Bilinen sınır: garanti, servis geçmişi ve makina geçmişi ihracatçının altında durur; bayi aracılı satışta bu durum bugün de böyle.
- **X8.** Finans'ın bedel kutularının davranışının değişmesi — *neden:* tahsil edilmeyen yalnız KDV, mal bedeli normal tahsil ediliyor (R19).
- **X9.** Alt sınır denetimi (ihraç kayıtlı teslimin yıllık tutar eşiği) — *neden:* satıcının ve mali müşavirin sorumluluğu, uygulama vergi mevzuatı denetlemez. 0075'in tevkifat alt sınırını denetlememe kararıyla aynı.
- **X10.** Güncellenmemiş bir istemcinin sildiği işaretin veride onarılması — *neden:* onarmanın yolu yok. İşaretin kaybolduğu ile hiç konulmadığı veriden ayırt edilemez, dolayısıyla bir göç ya da uyarı yazılamaz. Çözüm sürüm notudur (C13, R35): bütün istemciler güncellenene kadar seçenek kullanılmaz. Kaybın görünür olması bu kararı taşıyor: borç rakamı yükselir, sessiz kalmaz.

---

## Ölçümler (2026-10-27 yedeği ve bugünkü kod)

1. **Satış tipi dağılımı, canlı kayıtlar.** Makina 1266 kayıt: 534 Faturalı Yurtiçi, 212 Faturalı Yurtdışı, 343 Faturasız Yurtiçi, 177 Faturasız Yurtdışı. Servis 883: 356 / 10 / 461 / 56 ve 12 kaydın alanı boş. Extra Kalıp 1214: 226 / 41 / 659 / 288. Yedek parça 992: 277 / 19 / 331 / 365 ve 26 kaydın alanı boş. İşaretin geleceği kitle "Faturalı Yurtiçi" olan 1037 satış kaydıdır (534 + 226 + 277).
2. **Göçün konusu yok.** 282 kayıt "Faturalı Yurtdışı" (212 makina, 10 servis, 41 kalıp, 19 yedek parça). Makina örnekleri RUSYA-MOSKOVA, WORLD OF KEBAP, ABRE ASLA CO. LTD., MEDITERRANEAN BBQ CHILI KEBAP: bunlar gerçek ihracat, yani KDV'den istisna doğrudan ihracat faturası, ihraç kayıtlı teslim değil. Hiçbir kaydın ihraç kayıtlıya çevrilmesi gerekmiyor, göç yazılmaz (C6).
3. **Tevkifat bugün neredeyse yok:** canlı kayıtlarda tevkifatlı tek kayıt var (bir servis). R7'nin birlikte bulunmama kuralı bugünkü veride hiçbir kaydı etkilemiyor, ileriye dönük bir kural.
4. **Para birimi.** "Faturalı Yurtiçi" olan 1393 kaydın (534 makina, 356 servis, 226 kalıp, 277 yedek parça) **tamamı TL**. R14 bugünkü veride ölçülemiyor, kuralın kendisi olarak yazılıyor ve testi kurulu veriyle yapılacak.
5. **Alanı boş kayıtlar.** 12 servis ve 26 yedek parça kaydının fatura tipi boş; çözücü bunları bugün "Faturalı Yurtiçi" sayıyor. İşaret ayrı bir alan olduğu için bu kayıtlar değişmiyor.
6. **KDV oranları.** 2008-01-01'den %18, 2023-07-07'den %20 (`appSettings.kdvRates`). Ertelenen KDV eski tarihli bir satışta %18 ile hesaplanır.
7. **Satış tipi okuyucuları.** `isFaturali` 11 çağrı / 6 dosya, `isYurtIci` 5 çağrı / 3 dosya, `normalizeSaleType` 24 çağrı / 11 dosya, `SALE_TYPES` dört form ile `aylikRapor.js` ve `utils.js`. İşaret ayrı alan olduğu için bu kırk çağrının hiçbiri değişmiyor (C2).
8. **`calcKDV`'nin kapısı dört yerde aynı ifade:** `utils.js:383`, `utils.js:800` (`calcCiro`), `Finance.jsx:172` (kart komisyonu KDV'si), `satisTevkifat.js:16` (tevkifat kapısı). Değişiklik bunların hiçbirinde değil, `satisKdvBolumu`'nun içindedir.
9. **Tek kapı dört kuralı birden karşılıyor.** `tahsilEdilecekKdv`'yi okuyanlar: Toplam Alacak (`Finance.jsx:341`), kalan borç zinciri (`calcCiro` → `calcKalanBorc`), Ödenmesi Muhtemel KDV'yi besleyen tahakkuk kümeleri (`Finance.jsx:162-163`), aylık raporun KDV toplamı, kredi kartı tabanı (`tahsilKdvOrani`). Yani R15, R16, R17 ve R33 tek yerden düzeltilince karşılanıyor; ekranlarda ayrı bir süzme yazılmıyor.
10. **Saklı kalan borç.** `customers.kalanBorc` saklı bir alandır ve **açılışta yeniden hesaplanmıyor** (`App.jsx:1144`, gerekçesi orada yazılı); yalnız müşteri düzenlenince ya da ödeme eklenip silinince (`Customers.jsx:333`, `:377`) ve çek kaydı olan müşteride okuma anında (`App.jsx:859`) yeniden hesaplanıyor. İşaret yalnız formdan açılabildiği için kayıt anında doğru değer yazılıyor (R20).
11. **Sunucu değişmiyor.** `ALAN_IZINLERI` yalnız `services.durum`, `partSales.kargoDurum` ve `yedekParcaSatislar.kargoDurum` alanlarını izliyor (`serverAuth.cjs:569-573`). Yeni alan bu listede olmadığı için bölüm düzeyinde geçer; üç bölümün sekme eşlemesi ve izin grupları değişmez.
12. **Testler.** `SALE_TYPES`'ın seçenek sayısını ya da içeriğini iddia eden test yok. `tests/ui/form-paylasilan.test.jsx` sekiz yerde "Fatura Tipi" etiketini listeliyor ama yalnız **alan etiketlerini** sayıyor, seçenekleri değil. İki ekran kıyası altını Finans, Anasayfa, bayi, altı müşteri detayı, müşteri listesi, yedek parça ve dışa aktarma metnini taşıyor; işaretsiz veride hiçbiri değişmiyor.
13. **Evrak etkilenmiyor.** Evrak `SALE_TYPES` kullanmıyor (ölçüldü), yani beşinci seçenek oraya sızmıyor. Teklifin KDV oranı elle yazılan serbest bir alan (`Documents.jsx:1285`, TR'de varsayılan 20), ihraç kayıtlı bir teklifte 0 yazmak yeterli.
14. **Yazdırma yolu yok.** `printTemplates.js`'in belge kurucuları: servis formu, makina raporu, sandık etiketi, kargo etiketi, teklif ve proforma, **yurt dışı** fatura, aylık rapor. Yurt içi fatura kurucusu yok (X3).

### QA turu ölçümleri (2026-10-28)

15. **Dönüş şeklini okuyan altı yer.** `satisKdvBolumu`'nun `tevkifatli` anahtarı üzerinden dallanan yerler: `MachineTimeline.jsx:38`, `YedekParcaSatisTab.jsx:250`, `printTemplates.js:288`, `aylikRapor.js:84`, `satisTevkifat.js:83` ve `:94`. Dönüş `{ toplamKdv, tevkifat, bizKdv, tevkifatli, pay?, payda? }` (`utils.js:400-408`). İhraç dalında `tevkifatli: false` kalınca bu altı yerin hiçbiri değişmiyor (R9/2).
16. **Pasif kutu kilidi.** `satisTevkifatDogrula` **form durumunu** okuyup kaydı engelliyor (`Customers.jsx:312`, `:367`, `yedekParcaSatis.js:62`, `kalipSatisi.js:94`), `satisTevkifatUygula` ise **kayıttan** siliyor (`satisTevkifat.js:32-38`). İkisi birlikte, pasif onay kutusuyla, tevkifatlı kaydı ihraç kayıtlıya çeviren kullanıcıyı kilitliyor: kayıt hiçbir şekilde kaydedilemiyor (R7/2).
17. **Kart tabanı işareti taşımıyor.** `kartTabanKaydi` kayıtlı anlık görüntü varsa `tabanKaydi(kk)` döndürüyor, o da yalnız `kk.tevkifatTaban` dizesini okuyup eşleşmezse `null` veriyor (`satisTevkifat.js:45-56`). Yani işaretli satışın formu ikinci kez açıldığında `tahsilKdvOrani(…, null)` tam oranı döndürüyor ve `kartTabaniEskiMi` de yalnız tevkifat etiketlerini karşılaştırdığı için uyarı çıkmıyor (R11/2).
18. **KDV kartının üç çağıranı.** Finans (`Finance.jsx:71-80`) ve Giderler (`Giderler.jsx:125-132`) dört argümanla ve 0079'un bilgi satırıyla çağırıyor; Aylık Gider ve Kasa Raporu iki argümanla (`giderRaporu.js:158`), yani o belgede bilgi satırı hiç basılmıyor. Kart tek bileşen (`KdvKarsilastirmaKarti.jsx`), yani "yalnız Finans" yazılamaz (R18/2).
19. **Kart TL ile çalışıyor.** `kdvKarsilastir` kuruşla yalnız `TRY` üzerinden hesaplıyor (`gider.js:1329-1335`), iki ekran ona `aliciBeyan.TRY || 0` geçiyor, TL dışı tutarlar kartın ayrı "karşılaştırmaya dahil edilmeyen" satırında duruyor (`KdvKarsilastirmaKarti.jsx:73`). Ölçüm 4 bugünkü bütün Faturalı Yurtiçi kayıtların TL olduğunu söylüyor, yani R14 ileriye dönük bir kural (R14/2).
20. **Kalan Borç kartı dört kaynağı birlikte taşıyor.** Kartın toplamı makina borcu artı servis, parça ve Extra Kalıp borcu (`PaymentSection.jsx:46-49`); 0079'un borç satırı ise yalnız makina kaydını okuyor (`CustomerDetailModal.jsx:136`, `:971`). "İşaretli kayıt varken" ifadesi bu yüzden kapsamını söylemeden ölçülemiyor (R27/2).
21. **Tevkifat rozeti dört satır türünde.** `MachineTimeline`'da satış olayı (`:272`), yedek parça grubu (`:291`), Extra Kalıp (`:341`) ve servis (`:436`), ayrıca Stok yedek parça satırı (`YedekParcaSatisTab.jsx:250`). İşaretlenebilen üç kayıt türünden Extra Kalıp için spec'te kriter yoktu (R26/2).
22. **Beş yazım yolu.** `Customers.jsx:317` ve `:370`, `kalipSatisi.js:9` ve `:82`, `yedekParcaSatis.js:79` ve `:115`; 0111'in toplu düzenlemesi `yedekParcaGuncelle` üzerinden geçiyor (`yedekParcaSatis.js:294`). Düzenleme kolları `{ ...eski, ...rec }` birleştirmesi yaptığı için yazıcıdan geçmeyen kol alanı silmiyor; `satisTevkifat.js:113`'ün yorumu bu tuzağı adıyla anıyor (R6/2).
23. **Dışa aktarma işareti düşürüyor.** Müşteri raporunun "Satış Tipi" sütunu `normalizeSaleType` (`SettingsExport.jsx:207`) ve "KDV" sütunu `tahsilEdilecekKdv` (`:215`); Extra Kalıp (`:278`, `:295`) ve yedek parça (`:35`, `:55`) raporlarında da aynı. 0079 tam bu nedenle üç rapora iki sütun eklemişti (`SATIS_TEVKIFAT_EXPORT_HEAD`, `satisTevkifat.js:92`) (R34).
24. **Extra Kalıp'ta ücretsiz kutusu yok.** `partSales` `ucretsizMi` taşıyor ve okunuyor (`kalipBorcTarafi` ücretsizde `null`, `aylikRapor.js:143` atlıyor), ama `PartSaleForm`'da kutu yok ve `kalipSatisi.js:12` her kayda `ucretsizMi: false` yazıyor; tek yazan yer toplu grubun hepsi ücretsizse çalışan dal (`CustomerDetailModal.jsx:320`). Yani işaretli ve ücretsiz Extra Kalıp ancak eski veriden doğabilir (R8/2).
25. **Teal tonları zaten tanımlı.** `theme.js:89-91` `teal`, `teal2`, `tealBg`, `tealBr` taşıyor; tevkifat rozeti mavi (`bluBg2` / `blu700`), 0106'nın yedi pili yeşil, mor, mavi ve kırmızıyı kullanıyor. Yeni token gerekmiyor, yani 0030'un tema taraması etkilenmiyor (R26/3).
26. **Kart ay kapsamlı.** Finans'ın KDV kartı `raporAy`'a bağlı (`Finance.jsx:71-80`), ekranın bedel kutuları ise seçilen tarih aralığına, aylık rapor da tek ay. "Finans ile rapor aynı rakamı üretir" ancak aynı ay için doğru (AC-29).
27. **Eski istemci işareti siliyor.** Eski istemcinin okuması alanı gövdeye koymuyor, kaydetmesi gövdeye yazmıyor, yeni sunucunun yazımı sütuna `null` koyuyor; makinada saklı kalan borç o istemcinin kendi hesabıyla yeniden yazılıyor (`Customers.jsx:333`, `:377`). Kayıp görünür (borç yükselir) ama kalıcı (R35, X10).

**Kaynak notu.** Ölçüm 1-14 2026-10-27 yedeği ve bugünkü koddan; QA turunun ölçüm 15-27'si yalnız kaynak kodundan, satır atıflarıyla.

---

## Kararlar (Takım Yöneticisi, 2026-10-27)

Takım Yöneticisi on iki kararın hepsini analistin önerisiyle verdi.

**Karar 1. Veri modeli işarettir, beşinci tip değeri değil.** *Gerekçe:* satış tipi listesi büyürse `normalizeSaleType`'ın metin araması güncellenmemiş bilgisayarda kaydı sessizce Yurtdışı'na çevirir (ölçüm, C1), ve `isFaturali` ile `isYurtIci`'nin kırk çağrı yeri ömür boyu özel durum taşır (ölçüm 7).

**Karar 2. Ekranda tek açılır liste, beş seçenek.** *Gerekçe:* kullanıcının istediği basitlik ekranda birebir karşılanır, veri modeli bozulmaz.

**Karar 3. Tevkifat alanları yeniden kullanılmaz, iki kutu birlikte açılmaz.** *Gerekçe:* C4.

**Karar 4. Üç kayıt türü: makina, Extra Kalıp, yedek parça. Servis hariç.** *Gerekçe:* X5.

**Karar 5. Kayıt ihracatçı firmaya açılır, yeni alan ve yeni ilişki yok.** *Gerekçe:* X7.

**Karar 6. Para birimi kısıtlanmaz.** *Gerekçe:* kanun böyle bir kural koymuyor, bugünkü kayıtlar para birimini serbest taşıyor.

**Karar 7. Süre takibi kapsam dışı.** *Gerekçe:* X1.

**Karar 8. İade ve beyanname kapsam dışı.** *Gerekçe:* X2.

**Karar 9. Yazdırma kapsam dışı, ibare formda gösterilir.** *Gerekçe:* X3. Bu karar analistin ilk önerisinin düzeltilmesidir: ibarenin basılacağı bir yurt içi fatura çıktısı olduğunu varsaymıştım, kodu okuyunca olmadığı görüldü (ölçüm 14).

**Karar 10. Seçeneğin adı "İhraç Kayıtlı".** *Gerekçe:* e-fatura standardının terimi bu (`IHRACKAYITLI`); "Faturalı Yurtiçi (İhraç Kayıtlı)" daha açık ama listede uzun durup diğer dört seçeneğin ritmini bozuyor.

**Karar 11. Rozet metni "İHRAÇ KAYITLI · tecil edilen KDV `<tutar>`".** *Gerekçe:* tevkifat rozeti "alıcının beyan edeceği KDV" diyor, buradaki karşılığı "tecil edilen"; muhasebenin kullandığı sözcük.

**Karar 12. Finans'ın bedel kutularına dokunulmaz.** *Gerekçe:* R19, X8.

### Mockup turunda verilen karar (2026-10-27)

**Karar 13.** Açıklama metni üç formda **aynı** sabitten gelir; mockupta üç formun açıklaması farklı yazılmıştı. *Gerekçe:* üç ayrı metin zamanla birbirinden ayrışır. Yedek parçaya özgü üretim sınırı ayrı bir sabit olarak yalnız o formda durur (R24), çünkü kural gerçekten yalnız orada bağlayıcıdır.

### QA turunda verilen kararlar (2026-10-28)

Takım Yöneticisi yirmi bir bulgunun hepsini analistin önerisiyle onayladı.

**Karar 14. Alanın ve dönüş anahtarlarının adı spec'te sabitlenir.** Alan `ihracKayitli`, motorun yeni anahtarları `ihracKayitli` ile `ertelenenKdv`, rapor nesnesi `ihracKayitliTeslim`, modül `src/lib/ihracKayitli.js` ve dört yardımcı adıyla yazılır (R5/2, R9/2). *Gerekçe:* 0112'nin dersi aynıydı; saf fonksiyonun imzası ve dönüş şekli spec'te yazılmazsa uygulama turunda uydurulur ve sonra dondurulamaz.

**Karar 15. Birlikte bulunmama kuralı üç katmanda, sırası bağlayıcı.** Seçim formu temizler, kayıt alanı siler, doğrulama yalnız formdan gelmeyen veri için savunma kalır (R7/2, R12/2). *Gerekçe:* "sessizce sil" ile "reddet" aynı kayıt için birlikte yazılamaz; pasif kutuyla birlikte kullanıcıyı kilitler.

**Karar 16. Kart anlık görüntüsü kendi işaretini taşır.** `kartKomisyonu.ihracTaban` alanı eklenir, `tabanKaydi` onu geri okur, iki eskime denetimi ihraç işaretini de karşılaştırır (R11/2). *Gerekçe:* 0079'un dondurulmuş anlık görüntü mekanizması tam bu sorun için kurulmuştu; işaret ona eklenmezse kural yalnız kaydın doğduğu ilk anda geçerli olur.

**Karar 17. Bilgi satırı iki ekranda, beşinci değer adlandırılmış seçenekle.** Satır Finans ve Giderler'de aynı metinle görünür, 0047 raporunun iki argümanlı çağrısı değişmez (R18/2, C11). *Gerekçe:* kart tek bileşendir ve konumlu beşinci parametre beşinci bir çağrı yerinde kayar.

**Karar 18. Motor para birimi başına, kart yalnız TL.** Rapor kutusu bütün para birimlerini basar, kartın bilgi satırı TRY rakamını yazar ve bu ayrım spec'te yazılıdır (R14/2). *Gerekçe:* beyanname TL'dir; motoru TL'ye indirgemek raporu bozar, kartı çok paralı yapmak karşılaştırmayı bozar.

**Karar 19. Rapor kutusu tahakkuk esaslı kalır, beşinci rakam "tahsil edilecek fatura toplamı"dır.** Matraha eşit olduğu kutuda yazar; ödeme durumuna bakan bir rakam hesaplanmaz (R25/2, R29/2). *Gerekçe:* 0113'ten sonra "tahsil edilen" bağlayıcı bir terim; aynı kutuda iki esası yan yana koymak toplanamayan bir rakam üretir.

**Karar 20. Borç kartının satırı yalnız makina kaydını kapsar.** Satır makina işaretliyken çizilir, Extra Kalıp ve yedek parça kendi rozetiyle görünür, satır tevkifatın satırıyla prop paylaşmaz (R27/2). *Gerekçe:* kartın toplamı dört kaynağı taşıyor; kapsamı yazmamak kriteri "ne yaptıysak o" haline getirir.

**Karar 21. Beş yazım yolu spec'te sayılır ve tek yazıcı taramayla korunur.** `ihracKayitliUygula` yedek parça zincirinde `ucretsizUygula`'dan önce çağrılır (R6/2, C12). *Gerekçe:* aynı tuzak bu projede iki kez ödendi (**0079'un** R5/1 ve **0095'in** R14/2 maddeleri); yolları saymayan spec düzenlemede işareti kaybeden bir uygulama üretir.

**Karar 22. Dışa aktarmaya iki sütun eklenir.** Üç raporun sonuna "İhraç Kayıtlı" ve "Ertelenen KDV", işaretsiz satırda boş (R34). *Gerekçe:* bu spec'in varlık nedeni tahsil edilmeyen KDV'yi doğru yerde göstermek; muhasebenin okuduğu dosyada bilgi düşüyorsa iş yarım kalır.

**Karar 23. Rozet teal, yeni token yok.** Zemin `tealBg`, metin `teal2`; `tasarim-kontrast`'a satırı eklenir (R26/3). *Gerekçe:* tevkifat rozeti mavi ve ikisi aynı yerde duruyor; var olan token ailesini seçmek yeni bir tema işi açmaz.

**Karar 24. Bütün istemciler güncellenir.** Sürüm notu 0071'in dilini alır ve eski istemcinin işareti sildiğini açıkça söyler; veride onarım yolu kapsam dışıdır (R35, C13, X10). *Gerekçe:* "işaret kaybolur" ile "ilk düzenlemede kalıcı silinir" farklı risklerdir.

**Karar 25. Rozet servis satırı hariç her tevkifat rozeti yerinde çizilir.** Extra Kalıp satırı için kendi kriteri eklenir (R26/2). *Gerekçe:* işaretlenebilen üç türden birinde rozet yoksa o kayıt ekranda sıradan bir faturalı satış gibi görünür.

**Karar 26. Zorunlu ibarenin metni spec'te sabitlenir.** Tek sabit, kopyalanabilir öğe, kriteri metni adıyla ölçer (R23/2). *Gerekçe:* faturaya basılacak hukuki ibare uygulama turunda yazılırsa yanlışı hiçbir test yakalamaz.

### Plan turunda verilen kararlar (2026-10-28)

Takım Yöneticisi planın on iki önerisini (Ö-1–Ö-12) analistin önerisiyle onayladı; uygulamada ölçülenler de buraya işlendi.

**Karar 27. Metinler (Ö-8).** Spec'te sabitlenmeyen metinler `ihracKayitli.js`'te tek sabittir: açıklama satırı, fatura notu ("Uygulama yurt içi fatura basmaz; bu ibareyi e-fatura yazılımında faturanın açıklamasına ekleyin."), yedek parça sınırı, özetin beş etiketi (Matrah · Faturadaki toplam KDV · Ertelenen KDV · Tahsil edilecek KDV · Tahsil edilecek fatura toplamı), Kalan Borç satırı ("İhraç kayıtlı fatura: `<tutar>` KDV tahsil edilmez, borca girmez."), kart satırı ("İhraç kayıtlı teslimde ertelenen KDV" ve notu), rapor kutusu dipnotu (R30, R29/2, R33/2 tek paragraf), KDV özetinin kardeş dipnotu, dışa aktarma hücreleri ("Evet" ve tutar).

**Karar 28. Kapı `utils.js`'te de yazılır (Ö-1).** `ihracKayitli.js` `utils.js`'i ve `satisTevkifat.js`'i içe aldığı için tek kapı (`satisKdvBolumu`, `tahsilKdvOrani`) kapıyı `utils.ihracKayitliEtkinMi` olarak aynı ifadeyle yazar; eşdeğerlik bütün satış tiplerinde testle sabittir. İçe aktarma yönü tektir (döngü yok, tarama).

**Karar 29. C12 taraması kayıt yazımını yakalar (Ö-2).** Atama, `delete` ve nesne değişmezi içindeki `ihracKayitli:` anahtarı `ihracKayitli.js` dışında yasaktır. Gerekçeli istisnalar kayıt değildir: `utils.js` (motorun dönüş şekli, R9/2) ve `satisTevkifat.js` iki yerde (kart tabanının geri okunan nesnesi, R11/2; formun KDV kutusu özetinin dönüşü, R25).

**Karar 30. `satisTipiUygula(secim, alan = "faturaTipi")` (Ö-3).** Müşteri formu `alan: "faturali"` geçirir; dönüş `{ [alan], ihracKayitli }`, ihraç seçiminde üç tevkifat anahtarı da temizlenir (R7/2 birinci katman). `satisTipiSecimi(kayit)` tipi `kayit.faturaTipi ?? kayit.faturali` ile okur.

**Karar 31. R8'in silmesi tek yazıcıda (Ö-4).** `ucretsizUygula` C12 gereği işareti silemez; `ihracKayitliUygula` `form.ucretsizMi` açıkken işareti kendisi siler. Zincir `ucretsizUygula(ihracKayitliUygula(satisTevkifatUygula(…)))`.

**Karar 32. Reddin yeri (Ö-5, Ö-6).** `ihracKayitliDogrula` dört kurucuda `satisTevkifatDogrula`'nın yanında çağrılır (makina ekleme ve düzenleme kolları, `kalipSatisiEkle`, `yedekParcaRec`). Formdan gelmeyen veri (içe aktarma, birleştirme, eski istemci) bugün hiçbir doğrulayıcıdan geçmez; asıl savunma R12'nin ilk yarısıdır (okumada ihraç kazanır). AC-11'in kanıtı saf motor testidir, ekranı yoktur.

**Karar 33. Tanınmayan para birimi (AC-20).** Rapor motorunun `paraEkle`'si anahtarı olduğu gibi tutar; ihraç kovaları Finans'ın kuralıyla (`CURRENCIES` dışı → TRY) biriktirilir, kart TRY rakamını okur. Diğer rapor kovaları değişmedi.

**Karar 34. Kopyalama (Ö-9).** İbare salt okunur metin alanında (her zaman seçilebilir), yanında Kopyala düğmesi; pano başarısız olursa satırda "Kopyalanamadı, metni seçip kopyalayın." yazar.

**Karar 35. Rozet tek bileşen (Ö-7).** `IhracKayitliRozeti` zaman çizelgesinde ve Stok satırında kullanılır; sözlüğe taşınmadı, "Bilinen borç"a kayıt işareti rozeti ailesi notu eklendi.

**Karar 36. Seçicinin gösterimi normalleşir (Ö-10).** Ölçüldü: var olan form ekranları iki temada 0 piksel.

**Karar 37. Servis kaydı işareti tutamaz (Ö-11).** `services` tablosunda sütun yok; roundtrip testi işaretin okumada düştüğünü sabitler.

**Karar 38. Alan alan kurulan iki düzenleme formu işareti taşımıyordu (uygulamada bulundu).** Toplu yedek parça (`openEditYedekParca` toplu kolu) ve Extra Kalıp (`openEditPartSale`) formları kayıttan alanları tek tek kopyalar; işaret taşınmasaydı tek yazıcı onu dokunulmadan kaydedilen kayıtta silerdi (AC-7, AC-64). Modül `ihracKayitliFormu(kayit)` ile taşır; gerçek App testi iki bozmayla ölçüldü. Aynı incelemede 0079'un bir kusuru bulundu ve bu işte düzeltilmedi: Extra Kalıp düzenleme formu tevkifat alanlarını da taşımıyor, tevkifatlı Extra Kalıp düzenlenince tevkifat siliniyor (açık bulgu).

**Karar 39. Ölçüm 12 eksikti; ters çevrilen kriter yine yok.** 0095'in iki kıyası dışa aktarma satırlarını tam eşitlikle karşılaştırıyordu; iki boş sütun onları kırdı. 0079'un önek + "ek sütun boş" desenine genişletildiler. Ayrıca 0106 AC-30'un iki okuma taraması (yeni alan destructuring'de) ve 0079 AC-28'in sütun indisi genişletildi. Dördü de "spec 0114 ile" notludur ve kriterlerin iddiası aynen korunur.

**Karar 40. Kartın sonuç anahtarı `ertelenenKdv`.** Finans ve Giderler seçeneği her zaman geçirir; satır yalnız tutar sıfırdan büyükken çizilir.

**Karar 41. AC-58'in kapsamı.** Aylık Gider ve Kasa Raporu'nun iki argümanlı çağrısı değişmedi ve bilgi satırını basmaz. Belgenin "satışlardan hesaplanan KDV" rakamı ise motorun `toplamKdv`'sinden gelir; işaretli satışta ertelenen KDV'yi saymaz (R33). "Birebir eski" işaretsiz veri içindir.

### Triyaj turunda verilen karar (2026-10-28)

**Karar 42. Müşteri detayının "KDV Miktarı" hücresi ihraç kayıtlı makinada boş kalmaz.** Hücre tahsil edilecek KDV'yi (0) yazar, alt satırında faturadaki ham KDV "Faturada `<tutar>` · ertelenir" olarak durur (`ihracKayitli.js` `ihracKdvHucreMetni`; 0079'un "Toplam … · alıcı beyan eder …" emsali). *Gerekçe:* R9'un amacı faturadaki ham KDV'nin görünür kalmasıdır; hücre boş kalınca 50.000 TL yalnız Kalan Borç kartının küçük satırında geçiyordu. İşaretsiz makinada hücre değişmez.

### Karar kaydı

| # | Derece | Konu | Karar |
|---|---|---|---|
| B-1 | Bloklayıcı | Alanın ve dönüş anahtarlarının adı yok | `ihracKayitli`, `ertelenenKdv`, `ihracKayitliTeslim`, `ihracKayitli.js` ve dört yardımcı adıyla sabitlendi (R5/2, R9/2, Karar 14) |
| B-2 | Bloklayıcı | R7 ile R12 kullanıcıyı kilitliyor | Üç katman ve bağlayıcı sıra; ret yalnız formdan gelmeyen veri için (R7/2, R12/2, Karar 15) |
| B-3 | Bloklayıcı | Kart anlık görüntüsü işareti hatırlamıyor | `kartKomisyonu.ihracTaban` + iki eskime denetimi (R11/2, Karar 16) |
| Ö-1 | Önemli | Kart Giderler'de de çizilir, imza dolu | Satır iki ekranda; beşinci değer adlandırılmış seçenekle (R18/2, C11, Karar 17) |
| Ö-2 | Önemli | Motor çok paralı, kart TL | Ayrım spec'te yazılı; rapor çok paralı, kart TRY (R14/2, Karar 18) |
| Ö-3 | Önemli | "Tahsil edilen bedel" tanımsız | "Tahsil edilecek fatura toplamı" = matrah; kutu tahakkuk esaslı (R25/2, R29/2, Karar 19) |
| Ö-4 | Önemli | "İşaretli kayıt varken" kapsamı yok | Yalnız makina kaydı; ayrı prop ve testId (R27/2, Karar 20) |
| Ö-5 | Önemli | Rozetin satırları eksik sayılmış | Servis hariç bütün tevkifat rozeti yerleri (R26/2, Karar 25) |
| Ö-6 | Önemli | Yazım yolları sayılmamış | Beş yol sayıldı, tek yazıcı taramayla korundu (R6/2, C12, Karar 21) |
| Ö-7 | Önemli | Dışa aktarmada işaret kayboluyor | Üç rapora iki sütun (R34, Karar 22) |
| K-1 | Küçük | Ücretsiz Extra Kalıp kuralı yok | R8 yedek parçaya özgü; okuma anında atlanır (R8/2) |
| K-2 | Küçük | AC-2 ölçülemez | Kritere "müşteri seçili" ön koşulu eklendi |
| K-3 | Küçük | AC-12 kodla uyuşmuyor | Kriter "fatura tipi seçicisi hiç çizilmez" olarak yazıldı |
| K-4 | Küçük | "Pasif" tanımsız | `disabled` ve işaretsiz, oran ve notlar çizilmez (R7/3) |
| K-5 | Küçük | Seçim yardımcısı yan etkiyi ezebilir | Yardımcı yalnız iki anahtar döndürür, temizlik formda kalır (R22/2) |
| K-6 | Küçük | Fatura tipi kırılımı yanıltıcı | Dipnota bir cümle eklendi, satır ve sütun açılmadı (R33/2) |
| K-7 | Küçük | KDV özetinin dipnotu eksik | Kardeş dipnot, sırası yazılı (R30/2) |
| K-8 | Küçük | Zorunlu ibarenin metni yok | Metin spec'te sabitlendi (R23/2, Karar 26) |
| K-9 | Küçük | Rozetin rengi belirsiz | Teal, var olan tokenlarla (R26/3, Karar 23) |
| K-10 | Küçük | AC-29'un çapası yok | Ölçüm tek ay üzerinden; kartın ay kapsamı not düşüldü (ölçüm 26) |
| K-11 | Küçük | Sürüm notu yetersiz | Bütün istemciler; eski istemcinin silmesi yazıldı (R35, C13, X10, Karar 24) |

---

## Kabul kriterleri

### Seçici ve işaret

- **AC-1.** Müşteri formunda satış tipi seçicisi beş seçenek listeler ve beşincisi "İhraç Kayıtlı" adını taşır.
- **AC-2.** Müşteri seçili Extra Kalıp formunda fatura tipi seçicisi beş seçenek listeler (seçici yalnız müşteri seçiliyken ya da satış yapan firma fabrika değilken çizilir, `PartSaleForm.jsx:131`).
- **AC-3.** Yedek parça formunda fatura tipi seçicisi beş seçenek listeler.
- **AC-4.** Servis formunda fatura tipi seçicisi **dört** seçenek listeler ve "İhraç Kayıtlı" yoktur.
- **AC-5.** "İhraç Kayıtlı" seçilip kaydedilen makina kaydının satış tipi "Faturalı Yurtiçi"dir ve işareti açıktır.
- **AC-6.** İşaretli bir kayıt düzenlenip satış tipi "Faturalı Yurtdışı" yapılırsa kaydedilen gövdede işaret **hiç yoktur**.
- **AC-7.** İşaretli bir kayıt düzenlenip hiçbir alanına dokunulmadan kaydedilirse işaret korunur.
- **AC-8.** Satış tipi "Faturalı Yurtiçi" dışında bir değer olan ve veride işaret taşıyan bir kayıt okunduğunda işaret yok sayılır: tahsil edilecek KDV bugünkü kuralla hesaplanır.
- **AC-9.** İşaret açıkken tevkifat kutusu çizilir, `disabled` ve **işaretsiz**dir, nedeni ("İhraç kayıtlı teslimde tevkifat uygulanmaz.") yanında görünür, oran seçicisi ile tevkifatın üç kalıcı notu çizilmez.
- **AC-10.** İşaret açıkken kaydedilen gövdede tevkifat alanları **hiç yoktur**.
- **AC-11.** Hata yolu: aynı **kayıtta** işaret ve tevkifat birlikte bulunursa doğrulama kaydı reddeder. Ölçüm saf motorda yapılır; form bu durumu üretemediği (AC-56) için ekranda hata metni aranmaz.
- **AC-12.** Yedek parça formunda ücretsiz işareti açıkken fatura tipi seçicisi hiç çizilmez, dolayısıyla beşinci seçenek de bulunmaz (`YedekParcaSatisForm.jsx:156`).
- **AC-13.** Ücretsiz işareti açılan, önceden ihraç kayıtlı olan yedek parça kaydı kaydedilince işaret kayıttan silinir.

### KDV

- **AC-14.** İşaretli 200.000 TL matrahlı bir makina satışında faturanın ham KDV'si 40.000 TL'dir (%20 dönemi).
- **AC-15.** Aynı kayıtta tahsil edilecek KDV 0,00 TL'dir.
- **AC-16.** Aynı kayıtta motorun dönüşündeki `ertelenenKdv` 40.000 TL'dir ve hiçbir alanda saklanmaz; `toplamKdv` ile eşittir.
- **AC-17.** 2023-07-07 öncesi tarihli işaretli bir satışta ham KDV %18 oranıyla hesaplanır.
- **AC-18.** Yeni kaydedilen işaretli satışta tahsil oranı sıfırdır: kredi kartı komisyonunun tabanı KDV'siz matrahtır (taban formdan gelir).
- **AC-19.** Çoklu para birimi: USD ve EUR işaretli satışlarda da tahsil edilecek KDV sıfırdır ve ertelenen KDV kaydın kendi para biriminde biriktirilir.
- **AC-20.** Tanınmayan para birimi taşıyan işaretli kayıt bugünkü kuralla TL kovasına düşer.

### Borç, alacak ve Finans

- **AC-21.** İşaretli, 200.000 TL bedelli ve 150.000 TL tahsil edilmiş bir makina kaydının kalan borcu 50.000 TL'dir (işaretsiz halinde 90.000 TL olurdu).
- **AC-22.** İşaretli ve ödenmemiş bir Extra Kalıp satışının Toplam Alacak kartına kattığı tutar yalnız mal bedelidir.
- **AC-23.** İşaretli bir satışın ertelenen KDV'si Ödenmesi Muhtemel KDV kartına girmez.
- **AC-24.** İşaretli bir satışın ertelenen KDV'si KDV Karşılaştırması kartındaki hesaplanan satış KDV'sine girmez ve ödenecek farkı değiştirmez.
- **AC-25.** Finans'ın KDV Karşılaştırması kartında ertelenen KDV kendi bilgi satırı olarak görünür ve açıklaması altında yazar.
- **AC-26.** Ertelenen KDV yoksa o bilgi satırı hiç çizilmez.
- **AC-27.** İşaretli ve tahsil edilmiş bir Extra Kalıp satışının mal bedeli, Tahsil Edilen Extra Kalıp Bedeli kutusunda bugünkü kuralla sayılır (0113 değişmez).
- **AC-28.** İşaret kaydedildiği anda makinanın saklı kalan borcu yeni kuralla yeniden yazılır.
- **AC-29.** Finans ekranı ile aylık rapor ertelenen KDV için aynı rakamı üretir; ölçüm **tek ay** üzerinden yapılır (kart `raporAy`'a bağlıdır, ekranın tarih aralığına değil).
- **AC-30.** Kıyas: işaret taşımayan bir veri kümesinde Finans ekranının metni, aylık rapor motorunun çıktısı ve dışa aktarma satırları spec öncesi kodla **birebir** aynıdır.

### Ekran metinleri

- **AC-31.** İşaret açıkken üç formda da kuralı anlatan açıklama satırı görünür ve metni üç formda **aynıdır**.
- **AC-32.** İşaret açıkken üç formda da R23/2'nin birebir metni ("3065 sayılı KDV Kanunu'nun 11/1-c maddesi hükümlerine göre ihraç edilmek şartıyla teslim edildiğinden KDV tahsil edilmemiştir.") kopyalanabilir biçimde ve uygulamanın yurt içi fatura basmadığı notu görünür.
- **AC-33.** İşaret kapalıyken açıklama satırı ve ibare **çizilmez**.
- **AC-34.** Yedek parça formunda işaret açıkken üretim sınırı satırı görünür; müşteri ve Extra Kalıp formunda görünmez.
- **AC-35.** İşaret açıkken formun mevcut KDV kutusunda beş satırlık özet görünür ve son satır tahsil edilecek fatura toplamıdır.
- **AC-36.** İşaretli bir makina satışı müşteri detayının Makina Geçmişi satırında rozet taşır, rozet ertelenen KDV tutarını yazar ve teal tonundadır (tevkifat rozetinden ayrı renk).
- **AC-37.** İşaretli bir yedek parça satışı Stok yedek parça satırında aynı rozeti taşır.
- **AC-38.** İşaretsiz kayıt rozet taşımaz.
- **AC-39.** **Makina kaydı** işaretli olan müşterinin Kalan Borç kartında ertelenen KDV'nin borca girmediğini söyleyen satır görünür (`data-testid="ihrac-kayitli-borc"`) ve makinanın ertelenen KDV tutarını yazar.
- **AC-40.** İşaretli kaydı olmayan müşterinin Kalan Borç kartında o satır çizilmez.
- **AC-41.** Rozet ve satır metinlerinin düz metni ekran dosyalarında geçmez (kaynak taraması).

### Aylık rapor

- **AC-42.** Ayında ihraç kayıtlı teslim olan raporda "İHRAÇ KAYITLI TESLİMLER" kutusu basılır ve teslim adedini yazar.
- **AC-43.** Kutu matrahı, faturadaki toplam KDV'yi, ertelenen KDV'yi ve tahsil edilecek fatura toplamını listeler.
- **AC-44.** Kutunun altında ertelenen KDV'nin KDV özetine ve açık alacağa girmediği yazar.
- **AC-45.** Ayında ihraç kayıtlı teslim olmayan raporda kutu ve dipnotu **hiç basılmaz**.
- **AC-46.** Raporun KDV toplamı ertelenen KDV'yi saymaz.
- **AC-47.** Raporun fatura tipi kırılımında işaretli kayıt "Faturalı Yurtiçi" satırında görünür; beşinci bir satır açılmaz.
- **AC-48.** Kutu tevkifat kutusunun hemen altında basılır; iki kutu birlikte varsa sıra bu olur.

### Veri ve sunucu

- **AC-49.** Yeni alan üç tabloda dört nokta kuralıyla yazılır ve `db-roundtrip` testinde gidip gelir.
- **AC-50.** İşaret kapalıyken alan okunan gövdeye **hiç yazılmaz** (false da değil).
- **AC-51.** Temiz kurulumda üç tablo da yeni sütunu taşır (`db-clean-install`).
- **AC-52.** Yeni eylem izni ve yeni sunucu kuralı eklenmediği testle sabitlenir: yalnız işareti değişen bir yazım, bugünkü düzenleme izniyle 200 döner.
- **AC-53.** Birleştirme kuralı değişmez: işaret kaydın kendi alanıdır, çakışmada kaydın geri kalanıyla aynı kuralla davranır.

### QA turu kriterleri (2026-10-28)

- **AC-54.** Kalıcı alanın adı üç tabloda `ihracKayitli`, motorun dönüşündeki yeni anahtarlar `ihracKayitli` ile `ertelenenKdv`, rapor nesnesinin anahtarı `ihracKayitliTeslim` ve saf modül `src/lib/ihracKayitli.js`; dört yardımcı R5/2'deki adları taşır.
- **AC-55.** Dönüş şekli `toEqual` ile dondurulur: işaretli kayıtta `{ toplamKdv: ham, tevkifat: 0, bizKdv: 0, tevkifatli: false, ihracKayitli: true, ertelenenKdv: ham }`; işaretsiz ve tevkifatsız kayıtta dönüş bugünküyle birebir aynıdır.
- **AC-56.** Tevkifatlı bir kayıt açılıp "İhraç Kayıtlı" seçilince formun üç tevkifat anahtarı **seçim anında** temizlenir ve kayıt sorunsuz kaydedilir; pasif kutu yüzünden kilitlenen bir yol yoktur.
- **AC-57.** Kayıtlı kart anlık görüntüsü olan işaretli bir satışın formu yeniden açıldığında kart özeti **KDV'siz** tabanla hesaplanır (anlık görüntü `ihracTaban` taşır); işaret ile anlık görüntünün tabanı farklıysa kart uyarısı ve "yeni tabanla hesapla" düğmesi görünür.
- **AC-58.** Aynı bilgi satırı **Giderler**'in KDV Karşılaştırması kartında da aynı metinle görünür; Aylık Gider ve Kasa Raporu'nda basılmaz ve o belgenin çıktısı birebir eski kalır.
- **AC-59.** USD işaretli bir satışta aylık raporun kutusu USD rakamını basar, Finans'ın kart satırı ise yalnız TRY rakamını yazar.
- **AC-60.** Kutunun beşinci satırının adı "Tahsil edilecek fatura toplamı"dır, matraha eşittir ve kutu bunun nedenini yazar.
- **AC-61.** İşaretli Extra Kalıbı olan ama makina kaydı işaretsiz olan müşterinin Kalan Borç kartında o satır **çizilmez**.
- **AC-62.** İşaretli bir Extra Kalıp satışı müşteri detayının zaman çizelgesi satırında rozet taşır.
- **AC-63.** Servis satırında bu rozet hiç çizilmez (servis kaydı işaretlenemez).
- **AC-64.** Beş yazım yolunun her birinden geçen işaretli kayıt, hiçbir alanına dokunulmadan kaydedildiğinde işareti korur; satış tipi değiştirilince gövdede işaret hiç bulunmaz. Alanın `ihracKayitli.js` dışında yazıldığı bir yer yoktur (kaynak taraması).
- **AC-65.** Müşteri, Extra Kalıp ve yedek parça dışa aktarma raporlarının sonunda "İhraç Kayıtlı" ve "Ertelenen KDV" sütunları bulunur; işaretsiz satırda ikisi de boştur.
- **AC-66.** İşaretli **ve** ücretsiz bir Extra Kalıp kaydı rapor kutusuna matrah katmaz ve rozet taşımaz.
- **AC-67.** Satış tipi Faturasız bir değere çevrilince `faturaBedeli` bugünkü gibi temizlenir; seçim yardımcısı yalnız satış tipi ve işaret anahtarlarını döndürür.
- **AC-68.** Raporun dipnotu fatura tipi kırılımındaki "Faturalı Yurtiçi" satırının KDV'sinin ertelenen KDV'yi içermediğini yazar.
- **AC-69.** İhraç kayıtlı teslim olan raporda KDV özetinin altında kardeş dipnot basılır; teslim yoksa basılmaz.
- **AC-70.** Tevkifatlı satış ile ihraç kayıtlı teslim aynı ayda varsa iki dipnot birlikte basılır ve sırası tevkifat, sonra ihraç kayıtlıdır.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Tahsil edilecek KDV ve ertelenen KDV React'sız saf motorda hesaplanıyor; ekranlar yalnız gösteriyor (C10).
- [ ] Finans ekranı ile aylık rapor ertelenen KDV'yi aynı kaynaktan okuyor (C9, AC-29).
- [ ] Yeni kalıcı alan üç tabloda dört nokta kuralıyla eklendi ve `db-roundtrip` ile `db-clean-install` testlerine girdi (C5).
- [ ] Yeni veri bölümü yok; yeni eylem izni ve sunucu kuralı **eklenmediği açıkça yazıldı** ve testle sabitlendi (C7, AC-52).
- [ ] Soft-delete ve çöp kutusu simetrisi etkilenmedi (yeni bölüm yok).
- [ ] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı kapsam dışı olduğu için TR/EN çeviri anahtarı eklenmedi ve nedeni yazıldı (X3).
- [ ] Para gösterimi çoklu para kuralına uyuyor; tanınmayan para birimi tanımlı biçimde ele alınıyor (AC-19, AC-20).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi; işaret açık ve kapalı durumlar ile hata yolu (AC-11) dâhil.
- [ ] İşaretsiz veride kıyas testi birebir geçiyor (AC-30).
- [ ] Sürüm notu yazıldı: önce sunucu PC, **sonra bütün istemciler** güncellenir ve eski bir istemcinin işaretli kaydı düzenlemesinin işareti sildiği ile saklı kalan borcu yükselttiği yazıldı; güncelleme bitene kadar bu seçenek kullanılmaz (C8, C13, R35).
- [ ] Alanın, motorun dönüş anahtarlarının, rapor nesnesinin ve dört yardımcının adı spec'teki gibi (R5/2, R9/2, AC-54) ve dönüş şekli `toEqual` ile donduruldu (AC-55).
- [ ] Kart anlık görüntüsünün `ihracTaban` işareti iki dalda ölçüldü: yeni kayıt ve kayıtlı anlık görüntüyle yeniden açılan kayıt (R11/2, AC-18, AC-57).
- [ ] Beş yazım yolu geçirildi ve alanın başka yerde yazılmadığı kaynak taramasıyla sabitlendi (R6/2, C12, AC-64).
- [ ] Üç dışa aktarma raporunun iki yeni sütunu eklendi ve işaretsiz satırda boş kaldığı ölçüldü (R34, AC-65).
- [ ] Rozetin teal tonu `tasarim-kontrast`'ın yeni satırıyla ölçüldü; `theme.js`'e yeni token eklenmedi (R26/3).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (yeni kavram ve ihraç kayıtlı ile tevkifatın ayrı kavramlar olduğu notu).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `e3768a8` | Dal `feat/0114-ihrac-kayitli`, taban `68fc888` (v3.51.0); kapanış ayrı commit |
| **Spec revizyon sayısı** | 3 | QA turu (B-1–B-3, Ö-1–Ö-7, K-1–K-11), plan turu (Karar 27–41), triyaj (Karar 42) |
| **Düzeltme turu sayısı** | 1 | Triyaj: dört bulgu (1 düşük-orta, 3 düşük): rapor kutusunun parti sayımı testsizdi; "KDV Miktarı" hücresi işaretli makinada boştu (Karar 42, kod düzeltmesi); servis formunun yalnız satış tipini alması testsizdi; ana dizindeki spec kopyası eskiydi |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 428 dosya, 5807 test (Electron dahil); lint 0 hata |
| **Kaçan hata** | 1 | "KDV Miktarı" hücresinin boş kalması (R9'un amacına ters); triyajda yakalandı |

**Uygulamada bulunanlar:** alan alan kurulan iki düzenleme formu (toplu yedek parça, Extra Kalıp) işareti taşımıyordu ve tek yazıcı onu dokunulmadan kaydedilen kayıtta silerdi (Karar 38, düzeltildi); ölçüm 12 0095'in iki tam eşitlikli kıyasını kaçırmıştı (Karar 39, ters çevrilen kriter yine yok).

**Açık madde:** Extra Kalıp düzenleme formu tevkifat alanlarını forma taşımıyor; tevkifatlı Extra Kalıp düzenlenince tevkifat siliniyor (0079'dan beri, plan §7). Ayrı iş.

**Görsel kanıt:** 25 ekran × 2 tema; var olan 14 ekran 0 piksel, 11 yeni ekran bilinçli değişti; taban son kodla 0 fark.

**Bu spec'ten çıkarılan ders:** Bir kayda yeni alan eklenirken "tek yazıcı her çağrıda siler, işaretliyse yazar" deseni ancak yazıcıya giden form alanı taşıyorsa güvenlidir; formu kaydı yayarak değil alan alan kuran düzenleme açılışları (burada iki tane) yeni alanı sessizce siler ve bunu yalnız gerçek uygulamanın kaydettiği gövde gösterir. Bu yüzden düzenleme açılışları spec'te yazım yolları kadar sayılmalı. "İşaretsiz satırda boş sütun kıyası bozmaz" gibi bir iddia, kıyasın önek mi tam eşitlik mi kullandığı her kıyas dosyasında ayrı ayrı okunarak ölçülmeli.
