# 0136 — Üretilmiş makinanın maliyeti donar

| | |
|---|---|
| **Durum** | **Uygulanıyor** (2026-11-08 onaylandı; plan turu Karar 36–47 aynı gün onaylandı, plan `specs/0136-uygulama-plani.md`) |
| **Sahip** | Analist (yazım) · geliştirici (uygulama) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Makina Maliyeti › Üretim Partileri ve Parti Hesabı, saf motorlar `src/lib/uretimPartisi.js` ve `src/lib/makinaStandartMaliyet.js`, `src/components/MakinaMaliyeti.jsx` (yeni geri çağırım ve sapma memosu), `src/components/gider/UretimPartileri.jsx` (kapanış girdisi, kapanma tarihi, yeniden açma onayı, sapma kutusu), `src/components/maliyet/PartiHesabi.jsx` (dondurulmuş satır, şerit, planlanan adet kapısı), `electron/db.cjs` (yeni sütun) |
| **Bağımlı spec'ler** | **0090** (parti kapanış anlık görüntüsü ve genel gider payı; önkoşul), **0022** (üretim partisi ve "geçici" etiketi; R8 ters çevrilir), **0002** (makina maliyeti; C10 ters çevrilir), 0088 (Makina Maliyeti ekranı ve standart maliyet motoru), 0092 (opt-in seçenek deseni ve kıyas altını), 0093 (planlanan adetler penceresi), 0097 (tarihli parça maliyeti ve Parti Hesabı), 0100 ve 0103 (stok makinasının parti bağı sonradan değişir), 0132 (malzemeden maliyet), 0135 (maliyet kalemleri) |
| **QA turu** | 2026-11-08, 35 bulgu (7 Bloklayıcı, 16 Önemli, 12 Küçük); hepsi Takım Yöneticisi tarafından onaylandı ve bu spec'e işlendi |
| **Ters çevrilen kriterler** | Bu spec'in kendi AC-11'i (boş harita taşıyan nesne gövdeye yazılır) ve AC-26'sı (model adının değişmesi anahtarı bozmaz); 0090'ın “boş nesne gövdeye yazılmaz” kuralı korunur ve bu alanda markörle uygulanır |
| **Daraltılan kriterler** | AC-5 (ret ölçütü yalnız girdi yokluğu), AC-19 (ölçüm sınırı parça ve malzeme motorları), AC-33 (sapma parti başına tek satır) |
| **Ters çevirdiği kararlar** | **0002 C10** ("maliyet türetilmiş bir rakamdır, kaydedilmez") ve **0022 R8** ("kapanınca etiket kalkar, rakam dondurulmaz") |

---

## Intent

Fabrika yönetimi kapanmış bir partinin maliyetine güvenemiyor. Bugün o rakam ekran her açıldığında yeniden hesaplanıyor; bir parçanın ölçüsü düzeltilince, bir malzemenin firesi güncellenince ya da bir makina kitine bir parça eklenince geçen yılın partisinin maliyeti de değişiyor. Yönetici aynı partiye iki hafta arayla bakıp iki farklı rakam görüyor ve hangisinin doğru olduğunu söyleyemiyor.

Takım Yöneticisi'nin koyduğu ilke şu: **geçmişte üretilmiş makinanın maliyeti değişmez, çünkü o makina artık üretilmiştir.** Üretim bittiğinde ne harcandıysa o harcanmıştır; bugün katalogda yapılan bir düzeltme geçmişi geriye dönük yeniden yazmamalıdır.

Bu iş bittiğinde parti kapandığı anda o partinin makina maliyetleri kayda yazılacak ve bir daha hesaplanmayacak. Kapanmış partiye bakan herkes her zaman aynı rakamı görecek. Rakamın yanlış olduğu anlaşılırsa düzeltmenin yolu açık olacak: parti yeniden açılıp yeniden kapatılacak. Bugünkü veriyle arada fark oluşursa rakam değişmeyecek ama fark ekranda görünecek.

---

## Requirements

### İlke

- **R1.** Kapanmış bir üretim partisinin makina maliyeti **kapanış anında kayda yazılır** ve sonraki okumalarda yeniden hesaplanmaz.
- **R1/2.** Anlık görüntü **kapanışta kaydedilecek kaydın kendisiyle** hesaplanır, kapanıştan önce ekranda duran canlı sonuçtan okunmaz. Açık partinin canlı payı başlangıçtan içinde bulunulan aya kadar hesaplanır; bitiş ayı geçmişe girilerek kapatılan partide bu, partinin hiç kapsamadığı ayların payını dondurmak olur.
- **R2.** Donan şey maliyetin **iki yarısıdır**: makinanın direkt maliyeti (parça ve modelin ek maliyetleri) ve makinaya düşen genel gider payı. Biri donup öteki canlı kalırsa makinanın toplam maliyeti yine değişir, yani söz tutulmamış olur.
- **R2/2.** “Donduruldu mu” sorusunun **tek ölçütü yeni alanın varlığıdır**. 0090 ile bu spec arasında kapanmış parti ay havuzu görüntüsünü taşır ama maliyet görüntüsünü taşımaz; o parti **dondurulmadı** sayılır, iki yarısı da canlı hesaplanır ve ay havuzu görüntüsü sapma kutusunu beslemeyi sürdürür (C8).
- **R3.** Açık parti ve hiçbir partiye bağlı olmayan makina **donmaz**; bugünkü "geçici" davranışı ve ekrandaki ibaresi aynen sürer.
- **R3/2.** **Bitiş ayı gelecekte olamaz:** parti doğrulaması gelecek ayı reddeder. Bugün reddetmiyor ve ay haritası en geç parti bitişine kadar uzadığı için gelecek aylar sıfır havuzla haritada yer alıyor; yani gelecek bitişle kapatılan parti sıfır donduruyor ve henüz üretilmemiş makinaları hiç saymıyor.
- **R3/3.** Donmuş parti **canlı ay bölüşmesinde hak sahibi olmayı sürdürür** (ağırlığı canlı makina adedidir); yalnız kendi gösterilen rakamı görüntüden okunur. Donmuş partiyi bölüşmeden çıkarmak öteki partilerin canlı payını zıplatır, yani bir partinin kapanması başkasının maliyetini değiştirir.

### Kapanış anlık görüntüsü

- **R4.** Kapanış anlık görüntüsü partinin kendi kaydında saklanır ve şunları taşır: makina başına direkt maliyet, makina başına genel gider payı, makina başına eksik veri sayısı, planlanan adet satırlarının model başına direkt maliyeti, partinin havuzu, makina başı pay, pay durumu ve nedeni.
- **R4/2.** Görüntünün kalıcı alanı, adı ve şekli R19'da yazılıdır; görüntüyü üreten tek motor fonksiyonu R20'de.
- **R5.** Makinanın anlık görüntüdeki anahtarı kapanış anındaki makina anahtarıdır (stoktaki makina ile satılmış makina ayrı anahtar taşır).
- **R5/2.** Anahtar **modeli taşımaz** (makina kimliğidir). Model kaydının yeniden adlandırılması makina kayıtlarının modelini de taşıdığı için anahtarı bozmaz; modelin adını değiştirmek bir makinayı dondurulmamış yapmaz.
- **R6.** **Kapanıştan sonra satılan stok makinası anahtarını değiştirir;** okuma bunu çözer: anahtar bulunamazsa satılan kaydın stok bağından (satışta damgalanan stok satırı kimliği) ikinci kez aranır.
- **R6/2.** Ters yön izlenmez: müşteri kaydı silinip makina stoğa dönerse stok satırı **yeni kimlik** alır ve satış bağını taşımaz, yani kapanıştaki anahtara geri bağlanamaz. Böyle makina dondurulmamış sayılır (X10).
- **R7.** İki arama da sonuç vermezse o satır **dondurulmamış** sayılır: bugünkü hesapla çizilir ve satırda nedeni yazar. Ölçüt yalnız “anahtar iki aramada da bulunamadı”dır; kapanıştan sonra partiye eklenen makina buna girer.
- **R7/2.** Dondurulmamış makinanın **genel gider payı canlı hesaptan** gelir (o hesap ekranın her görünümünde zaten kuruluyor, yeni ağır hesap yok) ve satırı dondurulmuş satırlarla **birleştirilmez**. Bu yüzden “makina paylarının toplamı = donmuş havuz” değişmezi yalnız kapanıştaki makina kümesi için iddia edilir.
- **R7/3.** Satır gruplaması **dondurulmuş değerlerden** kurulur (birim direkt maliyet ve eksik sayısı); satırın ay aralığı canlı üretim tarihlerinden gelir ve bilgi olarak kalır.
- **R8.** Anlık görüntü alınamıyorsa parti **kapatılmaz** ve nedeni bildirilir. Bugünkü genel gider havuzu için geçerli olan kural (harita yoksa kayıt yapılmaz) direkt maliyete de uygulanır.
- **R8/2.** Ret ölçütü dardır: kapanış yalnız **hesabın girdisi yoksa** (ekran katalogu ya da model satırlarını geçirmediyse) reddedilir. Makina düzeyindeki çözümsüzlükler kapanışı engellemez, görüntüye nedeniyle yazılır: modeli katalogda bulunamayan makinanın direkt maliyeti boş (`null`) olarak dondurulur. Ay havuzunun bugünkü ret kuralı (haritada eksik ay) aynen kalır.
- **R9.** Maliyeti girilmemiş parça varken kapanış **engellenmez**: rakam eksik sayısıyla birlikte dondurulur ve satır eksik sayısını gösterir. Düzeltme yolu R11'dir.
- **R9/2.** Görüntü **boş olsa da yazılır**. Makinası ve planlanan adedi olmayan parti bugün sorunsuz kapanıyor ve kapandıktan sonra makina bağlanabiliyor; boş görüntü gövdeye hiç yazılmazsa o parti sonsuza dek “dondurulmadı” görünür ve sonradan bağlanan makinalar canlı hesaplanır. Bu yüzden alan her zaman boş olmayan bir markör taşır (R19) ve 0090'ın “boş nesne gövdeye yazılmaz” kuralı o markörle korunur.

### Okuma

- **R10.** Anlık görüntüsü olan kapanmış partide Parti Hesabı ve Üretim Partileri ekranı rakamları **yalnız anlık görüntüden** okur; parça kataloğu, malzeme kataloğu, kit ve gider kayıtları o parti için okunmaz.
- **R10/2.** Partinin makina **adedi** canlı kalır (bilgi rakamıdır, maliyet değil). Donan şey havuz, makina başı pay, makina başına düşen tutar, pay durumu ve direkt maliyettir.
- **R10/3.** Hangi sütun donar, sütun sütun yazılıdır. **Donan:** direkt maliyet (birim) ve genel gider payı (birim). **Türeyen:** toplam (birim) = ikisinin toplamı; toplam maliyet = donmuş birim × **canlı** adet; parti özetinin bütün kartları bu satırların toplamı. Yani donan şey **birim** tutarlardır; satır ve özet toplamları donmuş birimlerin canlı makina kümesi üzerinden toplamıdır.
- **R10/4.** **Kâr katsayısı ve ondan türeyen sütunlar donmaz:** katsayı modelin bugünkü değeridir (0097 R14) ve “Önerilen satış”, “Önerilen ciro”, “Öneriye göre kâr” onunla oynamayı sürdürür. Donan şey maliyettir, fiyat değil (X6 ile aynı çizgi); bu, Parti Hesabı'nda bir ipucuyla yazılır.
- **R10/5.** Gerçekleşen tedarik karşılaştırmasının iki yarısı ayrı zamana aittir: **standart direkt maliyet donmuş**, **gerçekleşen tedarik canlı**. Tedarik tarafı dondurulmaz, çünkü gider kayıtları geriye dönük düzeltilebilir ve bu bilinçlidir; “Fark” satırının bu yüzden oynadığı kutuda yazılır.
- **R10/6.** R10'un “okunmaz” sözü **partinin gösterilen rakamlarıyla** sınırlıdır. Ekran düzeyinde kurulan model maliyetleri (Model Maliyetleri görünümünün girdisi), parti payı hesabı ve tedarik kutusunun gider okuması bu sınırın dışındadır; ölçüm yalnız parti hesabının kapanmış parti dalındaki parça ve malzeme motoru çağrılarını sayar.
- **R10/7.** Satırların **makina kümesi canlı kalır** (R10/2 ve adedin canlılığı bunu gerektirir); görüntü yalnız o kümenin rakamlarını besler. Görüntüde olup bugün partide olmayan anahtar sessizce yok sayılır ve satır üretmez.
- **R10/8.** Üretim tarihi çözülemeyen makinanın “bugünkü maliyetle hesaplandı” ibaresi **görüntüdeki işaretten** okunur, canlı kayıttan değil. Kapanıştan sonra tarih girilirse ibare kalkmaz, çünkü rakam hâlâ kapanış gününün rakamıdır.
- **R11.** Partiyi yeniden açmak anlık görüntüyü siler; yeniden kapatmak yeni görüntüyü yazar. Düzeltmenin tek yolu budur ve ekranda yazılıdır.
- **R11/2.** Yeniden açmak geri alınamaz bir kayıptır, bu yüzden **onay sorulur** (R23); engel değil, uyarı.
- **R11/3.** Bitiş ayı **değiştirilen** kapalı parti yeni görüntüyü yazar (bugünkü ay havuzu kuralının aynısı); aralığı değişmeyen kapalı partinin düzenlenmesi görüntüye dokunmaz.
- **R11/4.** Çöpe atma ve geri alma dondurulmuş görüntüye **dokunmaz**: parti çöpteyken makinaları aylık kurala döner (0022 R11), geri alınınca donmuş rakamlar kendiliğinden geri gelir.
- **R12.** Anlık görüntüsü **olmayan** kapanmış parti (bu spec'ten önce kapanmış partiler) bugünkü davranışını sürdürür: rakam yeniden hesaplanır ve satır "dondurulmadı" ibaresi taşır. Göç yoktur.
- **R12/2.** “Dondurulmadı” ibaresi tek metin sabitidir ve iki yerde görünür: Parti Hesabı'nda tablonun üstünde **tek şerit** (satır başına tekrar etmez) ve Üretim Partileri'nin Durum hücresinde kapalı rozetinin altında kısa ibare. Kullanıcı rakama iki ekrandan da baktığı için ikisinde de görünür.

### Sapmanın görünürlüğü

- **R13.** Bugünkü veriyle hesaplanan rakam dondurulmuş rakamdan farklıysa **rakam değişmez**, fark ayrı bir kutuda gösterilir.
- **R13/2.** Sapma **parti başına tek satırdır**: dondurulmuş toplam standart direkt maliyet ile bugünküsü. Ölçüt kuruş eşitliğidir, makina başına döküm yoktur (X11). 70 makinalı partide makina dökümü kutuyu okunmaz eder, kullanıcının sorusu ise “güvenebilir miyim”dir.
- **R14.** Sapma kutusu bugün var olan "Kapanmış partilerin aylarında değişen ortak gider" kutusunun genişletilmiş hâlidir; genel gider sapmasının yanına direkt maliyet sapması da girer.
- **R14/2.** Genel gider tarafında **iki ayrı sapma** vardır ve ikisi de yazılır: ayın havuzunun değişmesi (bugünkü satır, metni aynı) ve **partinin kendi payının** değişmesi. Ayların toplamı hiç değişmese de partiye makina eklenince ya da aynı ayları paylaşan yeni bir parti doğunca bölüşme değişir; kullanıcının ekranda gördüğü rakam partinin payıdır.
- **R15.** Sapma kutusu partinin adını, sapan kalemi ve iki rakamı yazar; düzeltme için yeniden açma yolunu adıyla söyler. Kutunun başlığı, alt başlığı, satır düzeni ve düzeltme cümlesi R25'te yazılıdır.

### Kapsam

- **R16.** Model Maliyetleri görünümü bugünkü veriyle hesaplanmaya devam eder; o bir fiyatlama aracıdır, geçmişin kaydı değil.
- **R17.** Satılmış makinaların kâr özeti de dondurulmuş rakamı okur; tablo ile özet aynı kaynaktan beslenir.
- **R18.** Sipariş ihtiyacı (0134) bugünkü veriyle çalışmaya devam eder; o gelecek için hesap yapar.

### Alan, motor ve ekran

- **R19.** Kalıcı alanın adı ve şekli yazılıdır: `uretim_partileri.kapanisMaliyeti` (TEXT, JSON) = `{ kapanisGunu, makinalar: { "<anahtar>": { direktK, eksikSayisi, payK, tarihsiz } }, planlar: { "<model adı>": { direktK, eksikSayisi } }, havuzK, makinaBasiK, adet, durum, neden }`. `makinalar`'ın anahtarı R5'in makina anahtarı, `planlar`'ın anahtarı planlanan adetlerdeki model adıdır.
- **R19/2.** Bütün tutarlar **kuruş tamsayısıdır**. `kapanisGunu` aynı zamanda R9/2'nin markörüdür: makinası ve planı olmayan partide iki harita boş kalır ama alan yazılır, böylece “görüntü yok” ile “görüntü boş” ayrılır. `adet` kapanıştaki makina sayısıdır ve **bilgi** rakamıdır (X8 bozulmaz, R22 onu ekranda kullanır). Alan dört nokta kuralıyla eklenir ve okuma yolunda **koşullu** yazılır (`kapanisGenelHavuzlari` deseni; kardeş alan `kapanisOrtaklari` koşulsuz yazıldığı için yanlış emsal odur).
- **R20.** Görüntüyü üreten **tek motor fonksiyonu** `makinaStandartMaliyet.partiKapanisGoruntusu(veri, parti, bugun, { katalog, modeller, partiPay })`'dir; ekranlar kendi hesabını yazmaz (C3). Fonksiyon saftır, React ve saat okumaz.
- **R20/2.** `uretimPartisi.partiKapanisUygula`'nın imzası görüntüyü de alacak şekilde genişler ve Makina Maliyeti ekranı bugünkü ay havuzu geri çağırımının (`kapanisHavuzu`) kardeşi olarak tek bir görüntü geri çağırımı daha verir. Katalog ve model satırları o ekranda zaten yüklüdür; kapanışı yapan görünüm onları prop olarak bugün hiç almıyor.
- **R21.** Direkt maliyet sapması **ayrı ve opt-in** bir motor fonksiyonundan gelir; parti payı hesabına eklenmez. Parti payı hesabının çıktısı 0090, 0092, 0100 ve 0101 testlerinde birebir sabitlenmiştir ve girdisinde parça ile malzeme listesi yoktur; oraya alan eklemek kıyas altınını kırar (C6).
- **R21/2.** Sapma hesabı Üretim Partileri görünümünde **bir kez** çalışır (kapanmış partinin bugünkü maliyetini yeniden hesaplamak pahalıdır) ve Parti Hesabı görünümünde çalışmaz (X12).
- **R22.** Donmuş rakamın **ne zaman** donduğu ekranda görünür: Üretim Partileri'nin Durum hücresinde kapalı rozetinin altında kapanma tarihi, Adet hücresinde kapanıştaki adet (`kapanışta n`). Kapanma zamanı bugün kayda yazılıyor ama hiçbir ekran okumuyor; rakamın tarihi görünmezse yönetici hangi anın rakamına baktığını yine bilemez.
- **R22/2.** Parti Hesabı'nda tablonun üstünde tek şerit: dondurulmuş partide “Rakamlar GG.AA.YYYY kapanışında donduruldu”, dondurulmamışta R12/2'nin ibaresi.
- **R23.** Dondurulmuş partinin bitiş ayı **silinirken onay sorulur**: dondurulmuş maliyetin silineceği ve parti yeniden kapatıldığında rakamların bugünkü veriyle yeniden hesaplanacağı yazılır. Bugün bu eylem sessizdir ve yalnız “güncellendi” der.
- **R24.** Kapanmış partide **planlanan adetler penceresi açılmaz** (düğme pasif ve nedenli). Bugün o pencere kapalılığı hiç denetlemiyor ve kaydı kapanış yolundan geçmeden yazıyor; yani kapanmış partiye dondurulmuş maliyeti olmayan yeni bir model satırı eklenebiliyor. Planlanan adet kapanmış partide bir fiyatlama artığıdır ve donmuş görüntüyle çelişir.
- **R25.** Sapma kutusunun metinleri yazılıdır: başlık artık yalnız ortak gideri anlatmaz, alt başlık “gösterilen rakam değişmedi, yalnız bugünkü veriyle arada fark oluştu” der, direkt maliyet satırının ilk hücresi `Direkt maliyet` etiketini taşır (ızgara değişmez, ay sütunu ona uymaz) ve düzeltme cümlesi tek sabittir: `Düzeltmek için Üretim Partileri'nde partinin bitiş ayını silip yeniden girin.`

---

## Constraints

### Uyulması zorunlu

- **C1.** **0002 C10 ve 0022 R8 bu spec'le ters çevrilir.** İkisi de "maliyet türetilmiş rakamdır, dondurulmaz" diyordu; gerekçeleri ekranın salt okunur kalmasıydı. Yeni gerekçe daha güçlüdür: üretilmiş makinanın maliyeti muhasebe gerçeğidir. Her iki spec'in metnine bu spec'e atıf düşülür.
- **C2.** Ekranın salt okunurluğu **korunur**: dondurma kullanıcının var olan bir eylemine (partiyi kapatma) bağlıdır, ekranın kendisi hiçbir şey yazmaz. 0088'in salt okunur kararı bozulmaz.
- **C3.** Dondurulan rakam **tek yerde** üretilir ve tek yerden okunur; ekranlar kendi yedek hesaplarını yazmaz.
- **C3/2.** Üretim yeri de yazılıdır (R20): görüntü tek dışa verilen motor fonksiyonunda üretilir, kapanışı yapan görünümde değil. Bugün direkt maliyet yalnız parti hesabının içindeki kapalı bir yardımcıda hesaplanıyor ve çıktısı makina başına değil; yeri yazılmazsa hesap ekrana sızar ve C2 ile C7 kâğıt üstünde kalır.
- **C3/3.** Sapma hesabı da tek yerde üretilir ama **parti payı hesabının içinde değil** (R21): o fonksiyonun çıktısı dört spec'in testinde birebir sabitlenmiştir.
- **C4.** Yeni kalıcı alan **dört nokta kuralıyla** eklenir; boş harita gövdeye yazılmaz ama alanın kendisi markörle yazılır (R9/2, R19/2). 0090'ın `kapanisGenelHavuzlari` emsali korunur: boş **nesne** yazılmaz, boş **harita taşıyan nesne** yazılır.
- **C5.** **Yeni eylem izni eklenmez.** Dondurma partiyi kapatma eyleminin bir parçasıdır ve bugünkü izniyle yapılır. Sunucu tarafında yeni bölüm ve yeni kural yoktur.
- **C6.** **Kıyas zorunludur:** anlık görüntüsü olmayan veride Parti Hesabı, Üretim Partileri, kâr özeti ve sapma kutusu spec öncesi koddan üretilmiş altınla birebir aynı kalır.
- **C6/2.** Kıyas kapsamı yazılıdır: parti payı hesabının çıktısı (0090, 0092, 0100, 0101 testleri) **hiç değişmez**; parti hesabının ve iki ekranın çıktısı görüntüsü olmayan veride birebir aynı kalır.
- **C7.** Hesap React'sız saf motorda yazılır; ekran dondurulmuş ile canlı rakamı karşılaştırmaz, karşılaştırmanın sonucunu motordan alır.
- **C8.** Mevcut `kapanisGenelHavuzlari` alanı **silinmez ve anlamı değişmez**: ay bazında genel gider havuzunu taşır ve sapma kutusunun kaynağı olmayı sürdürür. Yeni alan onun yerine geçmez, yanına gelir.
- **C9.** **Karışık sürüm kuralı:** yeni sütunu tanımayan sunucu, kaydı yazarken alanı düşürür ve o anda bütün donmuş partiler birden “dondurulmadı” olur. Sürüm notu bu yüzden sırayı adıyla söyler: **önce sunucu PC, sonra bütün istemciler**; güncelleme bitene kadar parti kapatılmaz. Eski istemcinin yaptığı kapanış yalnız ay havuzunu yazar, maliyet görüntüsünü yazmaz ve R2/2 gereği “dondurulmadı” sayılır.

### KAPSAM DIŞI

- **X1.** Her girdinin tarihlenmesi (parçanın geometrisi, malzemenin özgül ağırlığı ve geldiği boyu, kit adedi, modelin ek maliyetleri) — *neden:* dondurma bu sorunun tamamını kapanmış parti için zaten çözer; her girdiyi tarihlemek pahalı, kırılgan ve hiçbir zaman tam olmaz, çünkü her yeni girdi aynı soruyu yeniden açar.
- **X2.** Üretim anında (makina stokta "satışa hazır" olduğunda) dondurma — *neden:* maliyetin ikinci yarısı olan genel gider payı ancak parti kapandığında bilinebilir, bu yüzden üretim anında dondurmak toplamı sabitlemez ve verdiği sözü tutmaz.
- **X3.** Partisiz makinanın dondurulması — *neden:* partisiz makinanın payı hesap ayarlarından geliyor ve o da canlı; dondurmak için önce o makinanın hangi dönemin payını aldığına karar vermek gerekir, bu ayrı bir karardır.
- **X4.** Model Maliyetleri görünümünün dondurulması — *neden:* fiyatlama aracıdır, bugünkü maliyetle çalışması gerekir (R16).
- **X5.** Dondurulmuş rakamın ekrandan elle düzeltilmesi — *neden:* elle düzeltilen maliyet izlenemez; düzeltme yolu yeniden açıp kapatmaktır (R11) ve o yol izini kapanma zamanında bırakır.
- **X6.** Kapanmış partinin kârlılığının ve satış bedelinin dondurulması — *neden:* satış maliyetten sonra gelir ve sonradan düzeltilebilir; donan şey maliyettir, gelir değil.
- **X7.** Sapma kutusunun yazdırma çıktısına girmesi — *neden:* Makina Maliyeti ekranının bugünkü yazdırma kapsamı değişmiyor.
- **X8.** Partinin makina adedinin dondurulması — *neden:* adet bilgi rakamıdır; donmuş paylar zaten makina başına saklandığı için adedin değişmesi tutarları etkilemez (R10/2). Kapanıştaki adet yalnız ekranda göstermek için görüntüye yazılır (R19/2, R22).
- **X9.** Modeli artık katalogda olmayan makinanın dondurulmuş rakamının satırda gösterilmesi — *neden:* böyle makina bugün de hesaba girmiyor ve kendi satırını üretmiyor, yalnız uyarı şeridinde sayılıyor; bu bilinen sınır korunur.
- **X10.** Müşteri kaydı silinip stoğa dönen makinanın anahtarının izlenmesi — *neden:* dönen stok satırı yeni kimlik alıyor ve satış bağını taşımıyor, yani izlenecek bir bağ yok (R6/2); böyle makina dondurulmamış sayılır ve nedeni satırda yazar.
- **X11.** Sapma kutusunun makina başına dökümü — *neden:* 70 makinalı partide kutuyu okunmaz eder; kullanıcının sorusu tek rakamla cevaplanır (R13/2).
- **X12.** Sapma kutusunun Parti Hesabı görünümünde de çizilmesi — *neden:* hesap pahalı, iki görünümde iki kez koşmaması için tek yerde kalır (R21/2).
- **X13.** Çakışma birleştirmesinin dondurulmuş görüntüyü geri uygulaması — *neden:* birleştirme yalnız eklemeleri geri uyguluyor ve var olan kaydın düzenlemesi sunucu kopyasına yeniliyor (0073 R24 emsali); iki bilgisayar aynı anda çalışırken kapanış kaybolabilir, kullanıcı partiyi yeniden kapatır (R11). Yeni birleştirme kuralı eklenmez.

---

## Context

### Bugünkü davranış (2026-11-08, kodda doğrulandı)

**Direkt maliyet her okumada yeniden hesaplanıyor.** `makinaStandartMaliyet.js:306` `direktOf(k, gun)`, model ve gün başına `modelMaliyeti(...)` çağırıyor ve sonucu yalnız o çağrı için önbelleğe alıyor. Kapanmış partide gün, bitiş ayının son günü (`planGunu`); türetilen satırlarda her makinanın kendi üretim günü. Yani ekran her açıldığında bugünkü katalogla yeniden hesap yapılıyor.

**Genel gider payı da yeniden hesaplanıyor.** `makinaStandartMaliyet.js:466` `partiGenelPaylari` ayları, havuzları ve payları her çağrıda baştan kuruyor (`aylikGenelTablosu`), partinin kapalı olup olmadığına bakmıyor.

**Kapanış anlık görüntüsü var ama okunmuyor.** `uretimPartisi.js:58` `partiKapanisUygula` kapanışta `kapanisGenelHavuzlari` alanına ay bazında genel gider havuzunu yazıyor. Bu alan `makinaStandartMaliyet.js:518`'de **yalnız sapma kutusunu** (`degisimler`) üretmek için okunuyor; rakamın kaynağı değil. Yani bugün "kaydedilmiş ama kullanılmayan" bir anlık görüntü var.

**Analistin düzeltmesi:** bu spec'e gelmeden önce sözlü olarak "genel gider payı kapanışta zaten donduruluyor" denmişti. Doğru değil. Donduruluyor sanılan şey ay havuzunun karşılaştırma kopyasıdır; partinin kendi payı canlı hesaplanıyor. Bu yüzden bu spec iki yarıyı birden dondurur (R2) ve iş, yalnız direkt maliyetin dondurulmasından büyüktür.

### Neden rakam oynuyor

Tarihli okuma eksik. `malzeme.js:227` `malzemeOzeti(satir, malzemeKat, tarih)` tarihi **yalnız** fiyat kümesine veriyor; ölçü, işleme payı, fire, biçim ve yöntem bugünkü satırdan okunuyor. Malzeme kartının fiyat anlık görüntüsü de beş alan taşıyor (`malzeme.js:82` `FIYAT_ALANLARI` = kiloFiyati, paraBirimi, kur, bantlar, boyFiyati); **özgül ağırlık, geldiği boy ve malzemenin varsayılan firesi içinde yok.** Kit adedi ve modelin ek maliyetleri hiç tarihli değil (0097'de yazılı bilinen sınır). 0135 ile gelen işlem kalemlerinin tutarı da tarihli olmayacak (0135 R35/4).

Yani tarihli okuma bugün maliyetin yalnız bir kısmını koruyor ve her yeni girdi bu listeyi uzatıyor. Dondurma listeyi kapatır.

### Makina anahtarı ve satış tuzağı

`makinaMaliyeti.js:114` ve `:123`: makina anahtarı `musteri:<id>` ya da `stok:<id>`. **Kapanmış bir partinin stoktaki makinası sonradan satılınca anahtarı değişir** (stok satırı silinir, müşteri kaydı doğar). Anlık görüntü yalnız anahtarla aranırsa o makina dondurulmamış görünür. Bağ var: satışta `customers.sourceStockId` damgalanıyor (`makinaMaliyeti.js:71` o bağı zaten okuyor), yani ikinci arama bu alandan yapılabilir (R6).

### Bilinen tuzaklar

1. **Dört nokta kuralı.** Yeni sütun dört yere yazılmazsa görüntü sessizce düşer ve bütün kapanmış partiler bir anda "dondurulmadı" olur.
2. **Boş nesne gövdeye yazılmamalı.** 0090 bunu `Object.keys(goruntu).length` ile çözdü; aynı kural uygulanmalı, yoksa sunucu karşılaştırması her kayıtta sahte değişiklik görür.
3. **Yeniden açma anahtarı silmeli, null yazmamalı** (0090 R36'nın aynısı).
4. **Kapanış girdisi büyüyor.** `partiKapanisUygula` bugün yalnız ay havuzu haritasını alıyor; direkt maliyet de gerekince imzası genişler ve çağıranın (Üretim Partileri ekranı) elinde o hesabın olması gerekir. Hesap Makina Maliyeti ekranında zaten yüklü.
5. **Kıyas altını kapanış davranışını da kapsamalı:** anlık görüntüsü olmayan parti üzerinde çalışan bütün testler aynen yeşil kalmalı.
6. **Sapma kutusu susmamalı.** 0090'ın dersi: görüntü sessizce boş yazılırsa kutu o parti için sonsuza dek susar.
7. **Kapanıştan önceki canlı sonuç yanlış rakam taşır.** Ekranın parti payı hesabı kayıttan önce koşuyor ve o anda partinin bitiş ayı hâlâ boş; açık partinin ayları içinde bulunulan aya kadar gidiyor. Ay havuzu haritası için bu tuzak 0090'da yeni kaydı geçirmekle çözüldü, partinin kendi payı için çözülmedi (R1/2).
8. **Boş görüntü ile görüntüsüzlük aynı veriyle temsil edilemez.** Direkt maliyette boş görüntü makinası olmayan partide çıkar ve o parti sonradan makina kazanabilir; markör olmazsa sonsuza dek dondurulmamış görünür (R9/2).
9. **Dondurulmamış satır canlı paya ihtiyaç duyar.** Kapanmış partide hiçbir motorun çağrılmayacağını söylemek, kapanıştan sonra eklenen makinanın payını kaynaksız bırakır; pay hesabı ekranda zaten kurulduğu için o kaynak bedavadır (R7/2, R10/6).
10. **Donmuş havuz ile canlı adet aynı satırda çelişir.** Üretim Partileri havuzu, adedi ve makina başı payı yan yana çiziyor; üçü aynı anda donmazsa `makina başı × adet ≠ havuz` olur ve kullanıcı güveni dondurmanın kazandırdığından hızlı kaybeder (R22).
11. **Kapanmış partinin planlanan adetleri hâlâ düzenlenebiliyor** ve o yol kapanış mantığından geçmiyor; kapanmış partiye dondurulmuş maliyeti olmayan satır eklenebilir (R24).
12. **Gelecek bitiş ayı bugün reddedilmiyor** ve ay haritası en geç parti bitişine kadar uzadığı için gelecek aylar sıfır havuzla haritada var; yani gelecek bitişle kapatılan parti sıfır donduruyor (R3/2).

### Karar kaydı (2026-11-08)

| No | Soru | Karar | Gerekçe |
|---|---|---|---|
| 1 | Geçmişin maliyeti sabitlensin mi? | Evet | Takım Yöneticisi ilkesi: üretilmiş makinanın maliyeti değişmez |
| 2 | Her girdi tarihlensin mi, rakam mı dondurulsun? | Rakam dondurulsun | Tarihleme pahalı, kırılgan ve hiçbir zaman tam olmaz |
| 3 | Dondurma anı üretim mi, parti kapanışı mı? | Parti kapanışı | Genel gider payı ancak kapanışta bilinebilir; üretim anında dondurmak toplamı sabitlemez |
| 4 | Kaç yarı dondurulacak? | İkisi birden | Biri canlı kalırsa toplam yine değişir |
| 5 | Mevcut `kapanisGenelHavuzlari` ne olacak? | Yerinde kalır, sapma kutusunun kaynağı olmayı sürdürür | Anlamı farklı (ay havuzu), yeni alan onun yerine geçmez |
| 6 | Eski kapanmış partiler ne olacak? | Göç yok, bugünkü davranış sürer, satırda ibare | Geçmişin rakamını bugünkü veriyle dondurmak yanlış rakamı sabitler |
| 7 | Düzeltme yolu ne? | Yeniden aç, yeniden kapat | 0090'da kurulu; izini kapanma zamanında bırakır |
| 8 | Eksik maliyetli parça kapanışı engellesin mi? | Hayır, eksik sayısıyla dondurulsun | Engellemek işi durdurur; düzeltme yolu zaten var |
| 9 | Sapma görünsün mü? | Evet, ayrı kutuda, rakam değişmeden | Sessiz sapma güveni daha çok bozar |
| 10 | Makina adedi donsun mu? | Hayır | Bilgi rakamı; paylar makina başına saklandığı için tutarları etkilemez |

### QA turunda ölçülenler (2026-11-08)

Aşağıdaki her madde HEAD'deki kodda doğrulandı.

- **Ölçüm A.** Direkt maliyet her okumada yeniden hesaplanıyor: `makinaStandartMaliyet.js:306` `direktOf(k, gun)` model ve gün başına `modelMaliyeti(...)` çağırıyor ve önbelleği yalnız o çağrı boyunca yaşıyor.
- **Ölçüm B.** `makinaStandartMaliyet.js:466` `partiGenelPaylari` ayları, havuzları ve payları her çağrıda baştan kuruyor ve partinin kapalı olup olmadığına hiç bakmıyor.
- **Ölçüm C.** `makinaStandartMaliyet.js:518` kapanış anlık görüntüsünü yalnız sapma kutusunu (`degisimler`) üretmek için okuyor; rakamın kaynağı değil.
- **Ölçüm D.** Makina anahtarı `makinaMaliyeti.js:114` ve `:123`'te `musteri:<id>` ya da `stok:<id>`; modeli taşımıyor.
- **Ölçüm E.** Satış kaydının stok bağı `makinaMaliyeti.js:71`'de okunuyor (`sourceStockId`), yani ikinci arama için bağ var.
- **Ölçüm F.** Kapanışı yapan görünüm `UretimPartileri.jsx:26` parça, malzeme, model ve model satırı prop'larının hiçbirini almıyor.
- **Ölçüm G.** Ay havuzu haritası kaydedilecek YENİ kayıtla hesaplanıyor (`UretimPartileri.jsx:53` → `MakinaMaliyeti.jsx:55`), ama partinin kendi payı kayıttan ÖNCE kurulmuş canlı sonuçtan geliyor (`MakinaMaliyeti.jsx:50`).
- **Ölçüm H.** `uretimPartisi.js:29-33` `partiDogrula` yalnız bitişin başlangıçtan önce olmadığını denetliyor; gelecek ayı reddetmiyor.
- **Ölçüm I.** Planlanan adetler penceresi kapalılığı hiç denetlemiyor (`PartiHesabi.jsx:86` yalnız `gider_tanim` istiyor).
- **Ölçüm J.** `makinaStandartMaliyet.js:404` parti hesabı tedarik kutusu için `rolHavuzlari` çağırıyor, yani kapanmış partide de gider motoru koşuyor.
- **Ölçüm K.** `MakinaMaliyeti.jsx:45` model maliyetleri (parça ve malzeme motorları) ve `:50` parti payı hesabı ekran düzeyinde her görünümde koşuyor.
- **Ölçüm L.** `kapanmaZamani` kapanışta kayda yazılıyor (`uretimPartisi.js:68`) ama `src` altında hiçbir bileşen onu okumuyor (yalnız `types.d.ts` ve `uretimPartisi.js`).
- **Ölçüm M.** Kâr katsayısı modelin bugünkü değerinden geliyor (parti hesabında `modelMap`'ten okunan `mm.katsayi`), 0097 R14 gereği.
- **Ölçüm N.** Satır gruplamasının anahtarı `${direktK}|${eksikSayisi}`; satırın ay aralığı makinaların canlı üretim tarihlerinden kuruluyor.
- **Ölçüm O.** `db.cjs:1714` okuma yolunda `kapanisOrtaklari` koşulsuz yazılıyor (boşsa `null`), `kapanisGenelHavuzlari` ise yalnız doluyken; yeni alan için doğru emsal ikincisidir.
- **Ölçüm P.** `PartiHesabi.jsx:61` planlanan adetleri `planAdetleriYaz` ile doğrudan yazıyor ve kapanış yolundan geçmiyor.
- **Ölçüm R.** İki atıf eskimiş: `malzemeOzeti` `malzeme.js:227`'de, `FIYAT_ALANLARI` `:82`'de.
- **Ölçüm S.** Müşterisi silinen makina stoğa yeni kimlikle dönüyor (`GERI_DONEN_STOK_NOTU` ile tanınıyor) ve satış bağını taşımıyor; parti bağı `partiId` ile geliyor.
- **Ölçüm T.** Parti payı hesabının çıktısı 0090, 0092, 0100 ve 0101 testlerinde birebir sabitlenmiş.
- **Ölçüm U.** `uretimPartileri` birleştirme anahtarlarında; birleştirme yalnız eklemeleri geri uyguluyor, var olan kaydın düzenlemesi sunucu kopyasına yeniliyor.
- **Ölçüm V.** Parti hesabı makina kümesini canlı listeden kuruyor (`makinaListesi` + `partiId` süzgeci), görüntüden değil.
- **Ölçüm Y.** Model kaydının yeniden adlandırılması makina kayıtlarının modelini de taşıyor (`ModelsManager` zinciri), yani anahtarı bozmuyor.

### QA turunda verilen kararlar (2026-11-08)

Takım Yöneticisi 35 bulgunun tamamını onayladı.

1. **Görüntüyü üreten motor yazılı değildi (B1).** Tek dışa verilen fonksiyon `partiKapanisGoruntusu` olur, imzası ve dönüş şekli yazılır → R20, R20/2, C3/2.
2. **Kapanış öncesi canlı sonuç yanlış rakam taşıyor (B2).** Görüntü kaydedilecek kayıtla hesaplanır → R1/2, Bilinen tuzaklar 7.
3. **Dondurulmamış satırın payı kaynaksızdı (B3).** Pay canlı hesaptan gelir, satır birleştirilmez, ölçüm sınırı daraltılır → R7, R7/2, R10/6.
4. **Ret ölçütü tanımsızdı (B4).** Tek ret nedeni girdi yokluğu; makina düzeyi çözümsüzlükler görüntüye yazılır → R8/2.
5. **Sapmanın kalemi, eşiği ve motoru tanımsızdı (B5).** Parti başına tek satır, kuruş eşitliği, ayrı ve opt-in motor → R13/2, R21, R21/2, C3/3, X11.
6. **Boş görüntü “donduruldu mu” sorusunu çözülemez yapıyordu (B6).** Alan markörle her zaman yazılır → R9/2, R19/2, C4.
7. **Alanın adı ve şekli yazılı değildi (B7).** `kapanisMaliyeti` ve dört bölümlü şekil yazılır → R19, R19/2.
8. **Hangi sütun donar, yazılı değildi (Ö1).** Donan birim tutarlardır, toplamlar türer → R10/3.
9. **Kâr katsayısının donmadığı yazılı değildi (Ö2).** Katsayı ve öneri sütunları canlı kalır → R10/4.
10. **Donmuş havuz ile canlı adet çelişiyordu (Ö3).** Görüntü kapanıştaki adedi taşır, ekran onu yazar → R19/2, R22, Bilinen tuzaklar 10.
11. **Paylar toplamı değişmezi kırılıyordu (Ö4).** Değişmez yalnız kapanıştaki küme için iddia edilir → R7/2.
12. **Donmuş partinin canlı bölüşmedeki yeri yazılı değildi (Ö5).** Hak sahibi olmayı sürdürür → R3/3.
13. **“Modeli değiştirilen makina” ölçütü çelişiyordu (Ö6).** Ölçüt yalnız anahtarın bulunamaması; model değişimi anahtarı bozmaz → R5/2, R7, X9.
14. **Stoğa dönen makinanın anahtarı sessizce kopuyordu (Ö7).** Ters yön izlenmez, bilinen sınır yazılır → R6/2, X10.
15. **Kapanmış partinin planlanan adetleri düzenlenebiliyordu (Ö8).** Pencere kapanmış partide açılmaz → R24, Bilinen tuzaklar 11.
16. **Gelecek bitiş ayı sıfır donduruyordu (Ö9).** Doğrulama gelecek ayı reddeder → R3/2, Bilinen tuzaklar 12.
17. **Tedarik kutusunun hangi yarısı donduğu yazılı değildi (Ö10).** Standart donmuş, tedarik canlı → R10/5.
18. **Ölçüm sınırı yazılı değildi (Ö11).** Sayaç yalnız parça ve malzeme motorlarını sayar → R10/6.
19. **“Donduruldu mu” ölçütü ve 0090 arası parti yazılı değildi (Ö12).** Ölçüt yeni alanın varlığı → R2/2.
20. **“Dondurulmadı” ibaresinin metni ve yeri yazılı değildi (Ö13).** Tek sabit, iki ekranda, tek şerit → R12/2, R22/2.
21. **Yeniden açma sessizdi (Ö14).** Onay sorulur → R11/2, R23.
22. **Rakamın donma tarihi görünmüyordu (Ö15).** Kapanma tarihi iki ekranda yazılır → R22, R22/2.
23. **Sürüm notunun sırası yazılı değildi (Ö16).** Önce sunucu PC → C9.
24. **İki eskimiş atıf (K1).** Düzeltildi → Context, Ölçüm R.
25. **Tarihsiz işareti rakamla çelişiyordu (K2).** İşaret görüntüden okunur → R10/8, R19.
26. **Gruplamanın kaynağı yazılı değildi (K3).** Donmuş değerlerden, ay aralığı canlı → R7/3.
27. **Makina kümesinin kaynağı yazılı değildi (K4).** Küme canlı, görüntü yalnız rakam besler → R10/7.
28. **İki ayrı genel gider sapması vardı (K5).** İkisi de yazılır → R14/2.
29. **Kutunun başlığı artık yalnız ortak gideri anlatmıyor (K6).** Yeni başlık ve alt başlık yazılır → R25.
30. **Sapma satırının düzeni yazılı değildi (K7).** İlk hücre tür etiketi taşır → R25.
31. **Düzeltme cümlesinin metni yazılı değildi (K8).** Tek sabit → R25.
32. **Kutunun Parti Hesabı'nda çıkıp çıkmadığı yazılı değildi (K9).** Çıkmaz → R21/2, X12.
33. **Aralığı değişen kapalı parti için kriter yoktu (K10).** Yeni görüntü yazar → R11/3.
34. **Çöp ve geri alma yazılı değildi (K11).** Görüntüye dokunulmaz → R11/4.
35. **Okuma yolunun emsali yanlış seçilebilirdi (K12).** Koşullu yazım, `kapanisGenelHavuzlari` deseni → R19/2, Ölçüm O.

### QA turu karar kaydı (2026-11-08)

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Anlık görüntüyü üreten motor yazılı değil | Bloklayıcı | Tek fonksiyon `partiKapanisGoruntusu`, imzası yazılı | R20, R20/2, C3/2 |
| 2 | Kapanış öncesi canlı sonuçtan donma | Bloklayıcı | Görüntü kaydedilecek kayıtla hesaplanır | R1/2, tuzak 7 |
| 3 | Dondurulmamış satırın payı tanımsız | Bloklayıcı | Pay canlı hesaptan, satır birleşmez | R7, R7/2, R10/6 |
| 4 | “Hesaplanamadı” ölçütü tanımsız | Bloklayıcı | Tek ret nedeni girdi yokluğu | R8/2 |
| 5 | Sapmanın kalemi, eşiği ve motoru tanımsız | Bloklayıcı | Parti başına tek satır, ayrı opt-in motor | R13/2, R21, R21/2, C3/3, X11 |
| 6 | Boş görüntü ile görüntüsüzlük ayrılamıyor | Bloklayıcı | Alan markörle her zaman yazılır | R9/2, R19/2, C4 |
| 7 | Alanın adı ve şekli yazılı değil | Bloklayıcı | `kapanisMaliyeti`, dört bölümlü şekil | R19, R19/2 |
| 8 | Hangi sütun donar, yazılı değil | Önemli | Birim donar, toplamlar türer | R10/3 |
| 9 | Kâr katsayısı donmuyor, yazılı değil | Önemli | Katsayı ve öneri sütunları canlı | R10/4 |
| 10 | Donmuş havuz ile canlı adet çelişiyor | Önemli | Kapanıştaki adet görüntüde ve ekranda | R19/2, R22, tuzak 10 |
| 11 | Paylar toplamı değişmezi kırılıyor | Önemli | Değişmez yalnız kapanıştaki küme için | R7/2 |
| 12 | Donmuş partinin bölüşmedeki yeri | Önemli | Hak sahibi olmayı sürdürür | R3/3 |
| 13 | “Modeli değiştirilen makina” ölçütü çelişiyor | Önemli | Ölçüt yalnız anahtarın bulunamaması | R5/2, R7, X9 |
| 14 | Stoğa dönen makinanın anahtarı kopuyor | Önemli | Ters yön izlenmez, bilinen sınır | R6/2, X10 |
| 15 | Kapanmış partinin planlanan adetleri açık | Önemli | Pencere kapanmışta açılmaz | R24, tuzak 11 |
| 16 | Gelecek bitiş ayı sıfır donduruyor | Önemli | Doğrulama gelecek ayı reddeder | R3/2, tuzak 12 |
| 17 | Tedarik kutusunun yarıları karışık | Önemli | Standart donmuş, tedarik canlı | R10/5 |
| 18 | Ölçüm sınırı yazılı değil | Önemli | Yalnız parça ve malzeme motorları sayılır | R10/6 |
| 19 | “Donduruldu mu” ölçütü yazılı değil | Önemli | Ölçüt yeni alanın varlığı | R2/2 |
| 20 | “Dondurulmadı” ibaresinin yeri yazılı değil | Önemli | Tek sabit, iki ekran, tek şerit | R12/2, R22/2 |
| 21 | Yeniden açma sessiz | Önemli | Onay sorulur | R11/2, R23 |
| 22 | Donma tarihi görünmüyor | Önemli | Kapanma tarihi iki ekranda | R22, R22/2 |
| 23 | Sürüm notunun sırası yazılı değil | Önemli | Önce sunucu PC | C9 |
| 24 | İki eskimiş atıf | Küçük | Düzeltildi | Context, Ölçüm R |
| 25 | Tarihsiz işareti rakamla çelişiyor | Küçük | İşaret görüntüden okunur | R10/8, R19 |
| 26 | Gruplamanın kaynağı yazılı değil | Küçük | Donmuş değerlerden | R7/3 |
| 27 | Makina kümesinin kaynağı yazılı değil | Küçük | Küme canlı kalır | R10/7 |
| 28 | İki ayrı genel gider sapması | Küçük | İkisi de yazılır | R14/2 |
| 29 | Kutu başlığı artık yanlış | Küçük | Yeni başlık ve alt başlık | R25 |
| 30 | Sapma satırının düzeni yazılı değil | Küçük | İlk hücre tür etiketi | R25 |
| 31 | Düzeltme cümlesinin metni yok | Küçük | Tek sabit | R25 |
| 32 | Kutunun Parti Hesabı'ndaki yeri | Küçük | Çizilmez | R21/2, X12 |
| 33 | Aralığı değişen kapalı parti kriteri yok | Küçük | Yeni görüntü yazar | R11/3 |
| 34 | Çöp ve geri alma yazılı değil | Küçük | Görüntüye dokunulmaz | R11/4 |
| 35 | Okuma yolunun emsali yanlış seçilebilir | Küçük | Koşullu yazım | R19/2, Ölçüm O |

---

## Acceptance Criteria

### Kapanış

- **AC-1.** Bitiş ayı girilip kaydedilen parti, kapanış anlık görüntüsünü kaydına yazar.
- **AC-2.** Anlık görüntü, partinin her makinası için direkt maliyeti, genel gider payını ve eksik veri sayısını taşır.
- **AC-3.** Anlık görüntü, partinin planlanan adet satırları için model başına direkt maliyeti taşır.
- **AC-4.** Anlık görüntü partinin havuzunu, makina başı payını, pay durumunu ve nedenini taşır.
- **AC-5.** Direkt maliyet hesabının **girdisi yoksa** (katalog geçirilmemişse) parti kapatılmaz ve nedeni bildirilir. *(Spec 0136 QA turu, karar 4 ile daraltıldı: makina düzeyindeki çözümsüzlükler kapanışı engellemez, AC-56.)*
- **AC-6.** Genel gider havuzu hesaplanamıyorsa parti bugünkü gibi kapatılmaz ve bugünkü neden metni değişmez.
- **AC-7.** Maliyeti girilmemiş parça içeren partide kapanış yapılır ve anlık görüntü eksik sayısını taşır.
- **AC-8.** Aralığı değişmeyen kapalı partinin düzenlenip kaydedilmesi anlık görüntüyü değiştirmez.
- **AC-9.** Bitiş ayı silinen (yeniden açılan) partinin kaydından anlık görüntü anahtarı kalkar; null yazılmaz.
- **AC-10.** Yeniden açılıp yeniden kapatılan parti yeni anlık görüntüyü yazar.
- **AC-11.** Bütün ayları yürürlük öncesinde kalan partide görüntünün **haritaları boştur** ama alan markörüyle gövdeye yazılır. *(Spec 0136 QA turu, karar 6 ile ters çevrildi: boş harita taşıyan nesne yazılır, boş nesne yazılmaz.)*

### Okuma ve kararlılık

- **AC-12.** Anlık görüntüsü olan kapanmış partinin Parti Hesabı satırlarındaki direkt maliyet, görüntüdeki değerdir.
- **AC-13.** Aynı partinin genel gider payı da görüntüdeki değerdir.
- **AC-14.** Kapanıştan sonra bir parçanın ölçüsü değiştirilirse partinin rakamları **değişmez**.
- **AC-15.** Kapanıştan sonra bir malzemenin kilo fiyatı değiştirilirse partinin rakamları **değişmez**.
- **AC-16.** Kapanıştan sonra bir makina kitine parça eklenirse partinin rakamları **değişmez**.
- **AC-17.** Kapanıştan sonra o aylara gider kalemi eklenirse partinin genel gider payı **değişmez**.
- **AC-18.** Kapanıştan sonra bir parça çöpe atılırsa partinin rakamları **değişmez**.
- **AC-19.** Kapanmış partinin **gösterilen rakamları** okunurken **parça ve malzeme** motorları çağrılmaz (çağrı sayacıyla ölçülür). *(Spec 0136 QA turu, kararlar 3 ve 18 ile daraltıldı: ekran düzeyindeki hesaplar, parti payı hesabı ve tedarik kutusunun gider okuması sayıma girmez, AC-83.)*
- **AC-20.** Partinin satılmış makinalarından türeyen kâr özeti de dondurulmuş rakamı okur.
- **AC-21.** Üretim Partileri ekranındaki havuz ve makina başı pay sütunları dondurulmuş değeri gösterir.
- **AC-22.** Partinin makina adedi sütunu canlı kalır: kapanıştan sonra partiye makina eklenirse adet artar, tutarlar değişmez.

### Anahtar çözümü

- **AC-23.** Kapanıştan sonra satılan stok makinası, dondurulmuş payını ve direkt maliyetini korur.
- **AC-24.** AC-23'teki çözüm satış kaydındaki stok bağı üzerinden yapılır; bağ yoksa satır dondurulmamış sayılır.
- **AC-25.** Kapanıştan sonra partiye eklenen makina dondurulmamış sayılır, bugünkü hesapla çizilir ve satırında nedeni yazar.
- **AC-26.** Model kaydının adı kapanıştan sonra değiştirilen makina **dondurulmuş kalır** (yeniden adlandırma zinciri makina kaydının modelini de taşır, anahtar bozulmaz). *(Spec 0136 QA turu, karar 13 ile ters çevrildi.)*
- **AC-27.** Dondurulmamış satırı olan partide öteki satırlar dondurulmuş değerlerini korur.

### Eski partiler ve göç

- **AC-28.** Anlık görüntüsü olmayan kapanmış partinin rakamları bugünkü gibi yeniden hesaplanır.
- **AC-29.** AC-28'deki partinin satırında "dondurulmadı" ibaresi vardır.
- **AC-30.** Anlık görüntüsü olmayan partide bu spec öncesi kodla üretilmiş altın çıktı birebir eşleşir.
- **AC-31.** Açık partinin rakamları bugünkü gibi canlı hesaplanır ve "geçici" ibaresi değişmeden kalır.
- **AC-32.** Hiçbir partiye bağlı olmayan makinanın maliyeti bugünkü gibi canlı hesaplanır.

### Sapma kutusu

- **AC-33.** Dondurulmuş **toplam** standart direkt maliyet bugünkü hesaptan farklıysa sapma kutusunda **parti başına tek satır** çıkar ve iki rakamı yazar. *(Spec 0136 QA turu, karar 5 ile daraltıldı: makina başına döküm yok.)*
- **AC-34.** Dondurulmuş genel gider havuzu bugünkü hesaptan farklıysa sapma kutusu bugünkü metniyle çıkmayı sürdürür.
- **AC-35.** Sapma varken partinin gösterilen rakamı **değişmez**.
- **AC-36.** Sapma yokken kutu çizilmez.
- **AC-37.** Sapma kutusu düzeltme için yeniden açma yolunu adıyla söyler.
- **AC-38.** Anlık görüntüsü olmayan partide sapma kutusu bugünkü gibi yalnız genel gider için çıkar.

### Kapsam dışı kalanlar

- **AC-39.** Model Maliyetleri görünümü kapanmış partinin varlığından etkilenmez ve bugünkü maliyetle hesaplanır.
- **AC-40.** Sipariş İhtiyacı görünümü kapanmış partinin varlığından etkilenmez ve bugünkü veriyle hesaplanır.
- **AC-41.** Makina Maliyeti ekranının yazdırma çıktıları değişmez.

### Veri

- **AC-42.** Anlık görüntü kaydedilip yeniden okunduğunda bütün alanları birebir geri gelir.
- **AC-43.** Temiz kurulumda yeni sütun oluşur ve görüntü yazılıp okunabilir.
- **AC-44.** Anlık görüntüsü olmayan partinin veritabanına yazılan gövdesinde yeni alanın anahtarı bulunmaz.
- **AC-45.** Yeni alan için sunucu bölüm eşlemesi, izin ve birleştirme kuralı eklenmemiştir (tarama).

### QA turu kriterleri (2026-11-08)

**Alan ve şekil**

- **AC-46.** Kalıcı alanın adı `kapanisMaliyeti`; görüntü `kapanisGunu`, `makinalar`, `planlar`, `havuzK`, `makinaBasiK`, `adet`, `durum` ve `neden` anahtarlarını taşır.
- **AC-47.** Görüntüdeki bütün tutarlar kuruş tamsayısıdır.
- **AC-48.** Makinası ve planlanan adedi olmayan parti kapatılır; görüntünün iki haritası boştur, `kapanisGunu` doludur ve alan gövdeye yazılır.
- **AC-49.** Görüntüsü olmayan partinin gövdesinde alanın anahtarı yoktur ve `null` da yazılmaz.
- **AC-50.** Görüntü kapanıştaki makina adedini taşır.

**Motor ve kapanış anı**

- **AC-51.** Görüntüyü tek motor fonksiyonu üretir; o fonksiyon React, saat ve ekran durumu okumaz (kaynak taraması).
- **AC-52.** Kapanış yolu görüntüyü parametre olarak alır; ekranlar kendi maliyet hesabını yazmaz (kaynak taraması).
- **AC-53.** Bitiş ayı geçmişe girilerek kapatılan partinin dondurulmuş havuzu yalnız partinin kendi aylarının payıdır, kapanıştan önce ekranda duran canlı havuz değildir.
- **AC-54.** AC-53'teki partide dondurulmuş makina başı pay, kapanıştan sonra canlı hesabın verdiğinden farklı olsa da görüntüdeki değer gösterilir.

**Ret ve sınırlar**

- **AC-55.** Katalog geçirilmezse parti kapatılmaz ve nedeni bildirilir.
- **AC-56.** Modeli katalogda bulunamayan makina kapanışı engellemez; görüntüde direkt maliyeti boştur ve nedeni yazılıdır.
- **AC-57.** Bitiş ayı gelecekte olan parti kaydedilmez ve nedeni alanın altında yazar.

**Donmuş ve dondurulmamış satır**

- **AC-58.** Kapanıştan sonra partiye eklenen makinanın genel gider payı canlı hesaptan gelir.
- **AC-59.** AC-58'deki makinanın satırı dondurulmuş makinaların satırıyla birleşmez.
- **AC-60.** Satır gruplaması dondurulmuş birim direkt maliyet ve eksik sayısıyla yapılır.
- **AC-61.** Görüntüde olup bugün partiye bağlı olmayan anahtar satır üretmez.
- **AC-62.** Müşterisi silinip stoğa dönen makina dondurulmamış sayılır ve nedeni satırda yazar.
- **AC-63.** Üretim tarihi çözülemeyen makinanın ibaresi görüntüdeki işaretten okunur; kapanıştan sonra tarih girilse de ibare kalkmaz.

**Donan ve türeyen rakamlar**

- **AC-64.** Donmuş partide satırın toplam maliyeti, donmuş birim tutarların canlı adetle çarpımıdır ve partiye makina eklenince büyür.
- **AC-65.** Kâr katsayısı kapanıştan sonra değiştirilirse önerilen satış ve önerilen ciro değişir, direkt maliyet ve pay değişmez.
- **AC-66.** Donmuş partide standart direkt maliyet görüntüden, gerçekleşen tedarik canlı hesaptan gelir.
- **AC-67.** Bir partinin kapanması öteki partilerin canlı payını değiştirmez.

**Ekran**

- **AC-68.** Üretim Partileri satırı kapanma tarihini gösterir.
- **AC-69.** Kapanıştaki adet bugünküden farklıysa adet hücresi kapanıştaki adedi de yazar.
- **AC-70.** Parti Hesabı tablosunun üstünde dondurulmuş partide kapanış tarihli tek şerit vardır.
- **AC-71.** Dondurulmamış kapanmış partide aynı yerde “dondurulmadı” ibaresi vardır ve satır başına tekrar etmez.
- **AC-72.** Dondurulmuş partinin bitiş ayı silinirken onay sorulur ve onay metni rakamın yeniden hesaplanacağını söyler.
- **AC-73.** AC-72'deki onay iptal edilirse görüntü kayıtta kalır.
- **AC-74.** Kapanmış partide planlanan adetler düğmesi pasiftir ve nedeni yazar.
- **AC-75.** Bitiş ayı değiştirilen kapalı parti yeni görüntüyü yazar.
- **AC-76.** Çöpe atılıp geri alınan partinin görüntüsü değişmez.

**Sapma**

- **AC-77.** Direkt maliyet sapması parti başına tek satırdır ve dondurulmuş ile bugünkü toplamı yazar.
- **AC-78.** Partinin kendi genel gider payı değişmişse kutuda kendi satırı çıkar.
- **AC-79.** Sapma hesabı parti payı hesabının çıktısına alan eklemez; o çıktı birebir aynı kalır.
- **AC-80.** Sapma hesabı Üretim Partileri görünümünde bir kez çalışır ve Parti Hesabı'nda çalışmaz (çağrı sayacı).
- **AC-81.** Sapma kutusunun başlığı, alt başlığı ve düzeltme cümlesi yazılı sabitlerdir; direkt maliyet satırının ilk hücresi tür etiketini taşır.

**Ölçüm sınırı, eski partiler ve karışık sürüm**

- **AC-82.** Kapanmış partinin rakamları okunurken parça ve malzeme motorları çağrılmaz; ekran düzeyindeki hesaplar, parti payı hesabı ve tedarik kutusu sayıma girmez.
- **AC-83.** Ay havuzu görüntüsü olup maliyet görüntüsü olmayan parti dondurulmadı sayılır ve iki yarısı da canlı hesaplanır.
- **AC-84.** Sürüm notu “önce sunucu PC, sonra istemciler” sırasını adıyla söyler.
- **AC-85.** Çakışma birleştirmesi için yeni kural eklenmemiştir (tarama) ve kapanışın kaybedilebileceği bilinen sınır spec'te yazılıdır.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Dondurma ve okuma kararı React'sız saf motorda; ekran karşılaştırma yapmıyor (kaynak taraması).
- [ ] Görüntüyü üreten **tek motor fonksiyonu** (R20) ve sapma hesabının **ayrı opt-in fonksiyonu** (R21) yazıldı; ikisi de ekrandan karar istemiyor (tarama).
- [ ] Anlık görüntü **kaydedilecek kayıtla** hesaplanıyor; kapanıştan önce ekranda duran canlı sonuçtan okunmadığı testle sabitlendi (R1/2, AC-53, AC-54).
- [ ] Alanın adı, şekli ve markörü R19'daki gibi; boş haritalı görüntünün gövdeye yazıldığı ve görüntüsüzün yazılmadığı ayrı ayrı ölçüldü (AC-48, AC-49).
- [ ] Hangi sütunun donup hangisinin türediği R10/3 ve R10/4'teki gibi uygulandı ve ikisi ayrı kriterle ölçüldü (AC-64, AC-65).
- [ ] Parti payı hesabının çıktısına **alan eklenmedi**; 0090, 0092, 0100 ve 0101 testleri dokunulmadan yeşil (AC-79, C6/2).
- [ ] Kapanmış partide **parça ve malzeme** motorlarının çağrılmadığı çağrı sayacıyla ölçüldü; sayımın sınırı (ekran düzeyindeki hesaplar, parti payı, tedarik kutusu dışarıda) testte yazılı (AC-19, AC-82).
- [ ] Sapma hesabının Üretim Partileri'nde bir kez, Parti Hesabı'nda hiç çalışmadığı çağrı sayacıyla ölçüldü (AC-80).
- [ ] Yeni sütun dört nokta kuralıyla eklendi ve `db-roundtrip` ile `db-clean-install` testlerine girdi.
- [ ] **Yeni eylem izni eklenmedi** ve bu açıkça yazıldı; sunucu tarafı değişmedi (tarama).
- [ ] Anlık görüntüsü olmayan veride kıyas altını birebir eşleşiyor (C6).
- [ ] Kullanıcıya görünen tüm metinler Türkçe; bu iş yazdırma çıktısı üretmiyor.
- [ ] Para kuralına uyuluyor: dondurulan tutarlar kuruş tamsayısı, bilinmeyen para birimi bugünkü gibi ele alınıyor.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi: dondurulmuş parti, dondurulmamış parti, sapma kutusu, açık parti.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi; **0002 C10 ve 0022 R8'in ters çevrildiği** iki spec'in metnine de işlendi.
- [ ] Sürüm notu yazıldı: **önce sunucu PC, sonra bütün istemciler**; güncelleme bitene kadar parti kapatılmaz. Bu sürümden sonra kapatılan partiler donar, önceden kapanmış partiler donmaz ve satırlarında ibare taşır (C9, AC-84).
- [ ] Ekran metinleri tek sabitte: “dondurulmadı” ibaresi, kapanış tarihi şeridi, yeniden açma onayı, planlanan adet kapısının nedeni ve sapma kutusunun üç metni (R12/2, R22, R22/2, R23, R24, R25).
- [ ] Bilinen sınırlar yazıldı: stoğa dönen makina (X10), modeli katalogda olmayan makina (X9), çakışma birleştirmesi (X13).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin onayladığı iki nokta (2026-11-08)

**1. Önceden kapanmış partiler donmuyor (R12, AC-28).** Bu spec yayınlandığında bugüne kadar kapanmış bütün partiler "dondurulmadı" ibaresiyle kalır ve rakamları bugünkü gibi oynamaya devam eder. **Karar: böyle kalsın.** Gerekçe: o partileri bugünkü veriyle dondurmak, bugün yanlış olan bir rakamı sonsuza dek sabitlemek demektir; kapanış anındaki doğru rakam artık bilinmiyor. İsteyen kullanıcı partiyi yeniden açıp kapatarak bugünkü rakamı bilerek dondurabilir. Alternatif, yayın sırasında hepsini toplu dondurmak, ama o sessizce yanlış rakamı sabitler.

**2. Partisiz makina donmuyor (X3, AC-32).** Hiçbir partiye bağlı olmayan makinanın maliyeti canlı kalır. **Karar: bu spec'te böyle kalsın.** Gerekçe: partisiz makinanın genel gider payı hesap ayarlarının dönemine ve varsayılan adedine bağlı; onu dondurmak için önce "hangi anda ve hangi dönemin payıyla donar" sorusuna karar vermek gerekir, bu da ayrı bir karardır. Pratikte fabrika partiyle çalışıyor. Alternatif, partiyi her makina için zorunlu kılmak, ama bu veri girişine yeni bir zorunluluk ekler ve ayrı bir karardır.

### Plan turu kararları (2026-11-08, Takım Yöneticisi onayı)

| No | Soru | Karar | Gerekçe |
|---|---|---|---|
| 36 | `partiPay` imzada, ama R1/2 payın kaydedilecek kayıtla hesaplanmasını istiyor | Makina Maliyeti'nin kapanış geri çağırımı `partiGenelPaylari`'nı partinin yerine yeni kayıt konmuş veriyle bir kez daha koşar ve o partinin satırını `partiPay` olarak geçirir; motor imzası spec'teki gibi kalır | Ekrandaki canlı sonuç bitiş ayı boşken kurulmuştur (tuzak 7); ağır hesap yalnız kapanış anında koşar |
| 37 | AC-56'nın "nedeni yazılıdır" iddiası R19'un makina şeklinde yok | Yalnız `direktK` boş (`null`) iken isteğe bağlı `neden` anahtarı (`"modelYok"`) yazılır; öteki makinalarda şekil değişmez | R19'un şekli korunur, neden kayıtta kalır |
| 38 | AC-67 bugünkü davranışla çelişiyor: geçmiş bitişle kapanan parti 0090'dan beri sonraki aylarda hak sahibi değildir | AC-67 R3/3'ün dediği gibi okunur: **dondurma (görüntünün varlığı) bölüşmeyi değiştirmez**. Aynı veride görüntülü ve görüntüsüz durumda öteki partilerin payı birebir aynıdır | Kapanmanın kendisinin bölüşmeye etkisi 0090 kuralıdır, bu spec onu değiştirmez |
| 39 | C6 kıyası ile R12/2 ve R22 (yeni ibare ve tarih) ekranda çelişiyor | Motor çıktıları (parti hesabı, parti payı, kâr özeti, sapma) birebir; ekran metninin kıyasında yalnız yeni ibareler ayıklanır. "Dondurulmadı" kararı motorun yardımcısından gelir, parti hesabının görüntüsüz çıktısına yeni alan eklenmez | 0113/0135 ayıklama deseni |
| 40 | Direkt maliyet sapmasının toplam kümesi | Görüntüdeki anahtarlardan bugün çözülebilenler (satışla değişen anahtar dahil) ve görüntüdeki planlanan satırlar; bulunamayan anahtar iki tarafta da yok sayılır; kapanıştan sonra eklenen makina sapmaya girmez | O makina zaten dondurulmamış satırında görünür |
| 41 | Gelecek bitiş reddi için doğrulama bugünü bilmeli | `partiDogrula`'nın bugün parametresi isteğe bağlı; ekran her zaman geçirir, verilmeyince eski davranış | 0022/0090 motor testleri etkilenmez |
| 42 | AC-19 ve AC-82'nin ölçüm koşulu | Sayaç tamamen donmuş partide sıfırı iddia eder; dondurulmamış satırlı partide motor yalnız o satırlar için çağrılır, ayrı testle | R7 dondurulmamış satırda canlı hesap ister |
| 43 | İki tarih | Üretim Partileri'nin Durum hücresi `kapanmaZamani`'nın gününü, Parti Hesabı şeridi görüntünün `kapanisGunu`'nu yazar | Aynı kapanışta ikisi aynı gündür; 0090 öncesi partide yalnız ilki var |
| 44 | Kapıların kapsamı | Planlanan adetler kapısı bütün kapanmış partilerde (dondurulmamış dahil); yeniden açma onayı yalnız dondurulmuş partide | Dondurulmamış partide silinecek görüntü yok |
| 45 | Sapma hesabının yeri | Üretim Partileri bileşeninin içinde tek `useMemo`; Makina Maliyeti üst düzeyinde değil | R21/2 ve AC-80 |
| 46 | Satılmış stok makinasının ikinci araması | Makina listesindeki satış kaydının `sourceStockId`'si ile `stok:<id>` anahtarı | Bağ listede zaten var (Ölçüm E) |
| 47 | Sapma kutusunun metni görüntüsüz veride | Kutuda dondurulmuş parti yokken başlık ve alt başlık bugünkü gibi kalır (C6, AC-38); dondurulmuş partinin satırı varken R25'in yeni metinleri çizilir | Görüntüsüz partinin payı gerçekten yeniden hesaplanıyor; yeni alt başlık ("gösterilen rakam değişmedi") onun için yanlış olurdu |

### Uygulamada verilen kararlar (2026-11-08)

| # | Konu | Karar | Gerekçe |
|---|---|---|---|
| 48 | Sapma satırının işareti ve mutlak değeri | Motor (`partiMaliyetSapmalari`) her sapmaya `artti` ve `farkMutlakK` yazar; ekran yalnız çizer | 0090 AC-51 parti ekranında çarpma, bölme ve `Math` kullanımını yasaklar; ay satırlarının `artti`/`farkMutlakK` deseni aynen |
| 49 | Kapanış bildirimi ve yeniden açma onayının düğmesi | Görüntü yazılan kapanışta bildirim `KAPANIS_DONDU_BILDIRIMI`; onay başlığı `YENIDEN_ACMA_BASLIGI`, düğmesi "Bitiş ayını sil" | Eski bildirim ("geçici ibaresi kalktı") dondurmayı söylemiyordu; onayın varsayılan "Evet, Sil" metni neyin silindiğini söylemiyordu |
| 50 | Karar 44'ün eski testlere etkisi | Planlanan adetler penceresini kapanmış partide açan eski testlerin partileri açık partiye çevrildi (0093'ün ızgara testleri, 0091 AC-32/43, 0097 AC-46 Bahar'a); 0093'ün ölçüm 1 partisi (AC-13, pencere açmaz) kapalı kaldı. 0090'ın triyaj testi gelecek bitiş yerine bu ayda biten partiyle | İddiaların konusu pencere ya da yürürlük boşken kapanıştır, partinin kapalılığı değil; gelecek bitiş artık reddedilir (R3/2) |
| 51 | AC-41'in ölçümü | Kaynak taraması: Sipariş İhtiyacı'nın motoru, raporu ve düğmesi görüntüyü okumaz | Makina Maliyeti'nin tek yazdırma çıktısı Sipariş İhtiyacı raporudur ve girdisinde parti görüntüsü yoktur |
| 52 | Donmuş partinin aralığı değişince (triyaj bulgu 2) | Başlangıç ya da bitiş ayı değişen donmuş partide de onay sorulur (`ARALIK_DEGISIM_ONAYI`, düğme "Yeniden dondur"); onaylanınca maliyet bugünkü veriyle yeniden dondurulur ve bildirim `KAPANIS_YENIDEN_DONDU_BILDIRIMI`. "Aralık aynı mı" kararı tek yerde (`kapanisAraligiAyniMi`); aralığı aynı düzenlemede görüntü hesaplanmaz | R11/3 yalnız bitişin silinmesini yazıyordu; başlangıç ayı değişimi aynı sessiz kaybı yaşatıyordu (R23'ün amacı) |
| 53 | Dondurulmamış satırın nedeni (triyaj bulgu 4) | Tek nötr metin: "Kapanış görüntüsünde bu makinanın maliyeti yok; bugünkü maliyetle hesaplandı (dondurulmadı)." | R7'nin ölçütü yalnız "görüntüde maliyet yok"tur; sonradan bağlanan, stoğa dönen ve kapanışta modeli bulunamayan makina aynı dala düşer, eski metin ikisinde yanlıştı |

### Bu spec'in kapattığı açık bulgu

`specs/README.md`'nin açık bulgular tablosundaki "geçmişte üretilmiş makinanın maliyeti geriye dönük değişiyor" bulgusu bu spec'le kapanır. Aynı bulguda önerilen dar düzeltme (malzemenin geldiği boyu ve varsayılan firesinin fiyat anlık görüntüsüne katılması) **önceliğini yitirir**: dondurma kapanmış partiyi zaten korur, o düzeltme yalnız açık partideki geçici rakamı ve kapanış anındaki hesabın doğruluğunu etkiler. İstenirse ayrı ve küçük bir spec olarak sonra ele alınır.

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
