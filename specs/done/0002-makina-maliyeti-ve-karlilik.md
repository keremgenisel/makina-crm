# 0002 — Makina Maliyeti ve Kârlılık

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-24, commit `61ac0cf`; plan `specs/done/0002-uygulama-plani.md`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Makina kârlılık görünümü, müşteri/makina detayı, Finans dönem raporu, gider verisi (0001) |
| **Bağımlı spec'ler** | **0001** (gider verisi olmadan bu spec hesap üretemez) |
| **Revizyon** | R1 (2026-09-23): satış anındaki kurun kayda yazılması ve iki yöntemli kâr marjı. R2 (2026-09-23): toplu malzeme alımı senaryosu — model havuzu, dağıtılmayan kalemler, stoktaki makinaya atanmış giderler (R2/R16–R21, C7, X8, AC-23…AC-31). R3 (2026-09-23): müşterinin gerçek maliyet tablosu (MASRAFLAR.xlsx) incelendi — maliyet tabanı satıştan **üretime** taşındı, model havuzu çok satırlı birim maliyete bağlandı, standart ortak gider kaynağı ve kâr çarpanı eklendi, ağırlıklandırma fikri kapatıldı (R1/R1b/R2/R7/R10/R11/R16–R19/R22–R25, C8, X2, X9, AC-1/11/23/24/25/28/29/30, AC-32…AC-40). R4 (2026-09-24): geliştirme öncesi QA boşluk analizi. 30 boşluk karara bağlandı — üretim tarihinin satışta kaybolması (R1b/R1c, C4), X3 ile R19 çelişkisi, havuz tüketim sırası ve ileri-yönlü pencere (R17b/R17c), yuvarlama ve artık kuruş (R2), para birimi ve satış tarihi (R4/R4b), kısmi dönem (R7), fiyat önerisinin model bazlı olması ve geçerli aralıklar (R9/R9b), sıfıra bölme (R8/R23), standart sürüm kuralı (R22), ekranın yeri (R26), canlı kayıt ve ikinci el (R27), Extra Kalıp geliri (R28), performans (C9); AC-41…AC-69 eklendi. R5 (2026-09-24): ikinci QA boşluk analizi, 0001'in uygulanmış hâline göre; 16 açık nokta karara bağlandı — ortak gider tanımı tutar bazına çevrildi (R2), kira/personel kalemlerinin atanamazlığı (R21), silinmiş model satırının ortağa düşmesi (R16), aylık rapor bölümünün kapsam dışı olması (X10), maliyetin türetilmiş rakam olduğu (C10), para birimi değişince kurun yenilenmesi (R12), üretim tarihinin elle düzeltilebilmesi (R1b); R5/R7/R9/R19, C4/C8 güncellendi, AC-70…AC-76 eklendi. |

---

## Intent

Fabrika yönetimi bir makinayı sattığında gerçekte kâr edip etmediğini bilmiyor. Satış bedeli
kayıtlı, ama o satışın arkasındaki gider yükü hiçbir yerde rakama dönüşmüyor; bu yüzden hem
geçmiş satışların kârı belirsiz kalıyor hem de yeni bir makinaya fiyat verirken tek dayanak
sezgi oluyor. Bayiye ödenen komisyon da bugün gelir tarafında bir azalma olarak görünmüyor.

Başarı şu demek: kullanıcı bir makinanın maliyetini ve kârını, kârın nasıl oluştuğunu
görecek şekilde açabiliyor; bir dönem için satılan makinaların kârlılığını topluca
görebiliyor; ve hedeflediği kârı girerek yeni bir makina için makul bir satış fiyatı
görebiliyor. Rakamın neyi kapsamadığı (stoktan çekilen parçaların maliyeti) her görüldüğü yerde yazıyor.

---

## Requirements

- **R1.** Sistem, **üretilmiş her makina** için bir **üretim maliyeti** hesaplar; maliyet üretimde oluşur,
  satışta değil. Üretim maliyeti üç kalemden oluşur: o makinaya atanmış doğrudan giderler, modelinden aldığı
  malzeme payları (R16) ve üretildiği aya ait ortak gider payı (R2). Makina satıldığında buna o satışta
  ödenen komisyon eklenir ve **toplam maliyet** oluşur; kâr bu toplam üzerinden hesaplanır.
- **R1b.** **Üretim tarihi**, makinanın Makina Stoğu'na eklendiği tarihtir. Makina satıldığında bu tarih
  **satış kaydına yazılır ve sonradan değişmez** (kur snapshot'ıyla aynı desen, C4); aksi hâlde kaybolur,
  çünkü satışta stok satırı siliniyor. Kayıtlı tarihi olmayan eski satışlarda üretim tarihi şu sırayla
  çözülür: (1) satış kaydındaki üretim tarihi, (2) o stok satırına ait makina üretimi stok hareketinin
  tarihi, (3) hiçbiri yoksa satış tarihi. Üçüncü durumda rakam **"üretim tarihi tahmini"** etiketiyle
  gösterilir. Stoğa hiç girmeden doğrudan müşteri kaydı olarak açılan makinalarda satış tarihi üretim
  tarihidir ve bu da maliyet detayında belirtilir. **Üretim tarihi makina düzenleme formunda elle
  düzeltilebilir**; elle girilen tarih çözüm zincirinin en üstünde yer alır ve "üretim tarihi tahmini"
  etiketini kaldırır. Bu yeni bir alan gerektirmez, C4'ün ikinci istisnasıyla eklenen alanın aynısıdır.
- **R1c.** **Üretim sayısı**, bir ayın payını bölen paydadır ve şu makinaları sayar: o ay stoğa eklenen
  makinalar ile o ay doğrudan müşteri kaydı olarak açılan makinalar. Şunlar **sayılmaz**: çöp kutusundaki
  kayıtlar, ikinci el devirler (`isResale`), ve silinen bir müşteriden stoğa geri dönen makinalar. Geri
  dönen makina zaten bir kez üretilmiştir; yeni bir üretim sayılırsa o ayın payı sulanır ve o ay üretilen
  bütün makinaların maliyeti yanlış düşer.
- **R2.** Ortak gider payı şöyle bulunur: bir ayın **ortak** giderleri toplanır ve o ay **üretilen** makina
  sayısına eşit olarak bölünür. Bir makinanın payı, **üretildiği** ayın pay tutarıdır. **Ortak gider,
  0001 motorunun kova dağılımındaki "ortak" TUTARIDIR** (`gider.js` `kovaDagilimi`); 0002 bu bölmeyi
  yeniden türetmez, aynı fonksiyonu çağırır. Bölme **kalem bazlı değil tutar bazlıdır**: kısmi dağıtılan
  bir kalemin modellere yazılmayan kalanı, ataması çözülemeyen (makinası çöpte veya silinmiş) bir kalemin
  tamamı ve silinmiş bir modele ait satırın tutarı ortak gidere düşer. **Pay eşittir**: model büyüklüğüne
  göre ağırlıklandırılmaz (X2).
  Hesap **kuruş tamsayısıyla** yapılır (0001 ile aynı), pay aşağı yuvarlanır ve bölmeden artan kuruşlar o
  ayın **ilk üretilen** makinasına yazılır; böylece payların toplamı ayın ortak giderine tam eşit kalır.
- **R3.** Maliyet rakamı, **gider olarak girilmiş** malzeme alımlarını (model satırları, R16) içerir; ancak
  **parça stoğundan çekilen parçaların alış maliyetini içermez**, çünkü parça alış fiyatı uygulamada
  tutulmuyor (0001 X2). Maliyetin gösterildiği her yerde bu sınır kullanıcıya yazıyla belirtilir:
  "stoktan çekilen parçaların maliyeti hariç".
- **R4.** Kâr = gerçek satış bedeli eksi toplam maliyet. Gerçek satış bedeli fabrika satış bedelidir;
  o boşsa fatura bedeli kullanılır. **Satış tarihi** olarak makinanın kurulum/satış tarihi (`installDate`)
  kullanılır, Finans ile aynı alan (C2). **İkisi de boş veya sıfırsa** kâr hesaplanmaz: makina
  "satış bedeli girilmemiş" olarak ayrı sayılır, dönem toplamlarına girmez ve tüm maliyeti zarar gibi
  gösterilmez.
- **R4b.** **Kârlılığın para birimi TL'dir.** Satış bedeli TL dışı bir para birimindeyse kayıtlı kurla
  (R12) TL'ye çevrilir; ekranda hem orijinal tutar hem TL karşılığı görünür. **Komisyon, satış bedeliyle
  aynı para biriminde kabul edilir** (müşteri kaydında ikisi tek bir para birimi alanını paylaşır) ve aynı
  kurla çevrilir.
- **R5.** Tüm hesaplar KDV hariç tutarlar üzerinden yapılır. Fatura bedeli ve fabrika satış bedeli
  uygulamada **zaten KDV hariç** saklanır; bu tutarların üzerinden KDV **çıkarılmaz**. (Bu projede tam bu
  hata yaşandı: Finans Özeti dışa aktarımı ücretleri KDV dâhil sanıp ayrıştırmış, Excel ile rapor aynı
  kayıt için farklı rakam vermişti.)
- **R6.** Kullanıcı bir makinanın maliyet ve kâr rakamını, kalem kalem nasıl oluştuğunu görecek biçimde
  açabilir: doğrudan giderler, ortak gider payı, komisyon ve satış bedeli ayrı ayrı görünür.
- **R7.** Sistem seçilen dönem için kârlılık özeti üretir: o dönemde satılan makinalar, her birinin
  maliyeti, kârı, kâr marjı ve çarpanı (R23), ayrıca dönem toplamı. Özet ayrıca **üretilmiş ama henüz
  satılmamış** makinaların taşıdığı toplam maliyeti ayrı bir satırda gösterir; bu satır **aralığın bitiş
  tarihi itibarıyla** hâlâ satılmamış olanları sayar ve başlığında bu tarih yazar. **Satış bedeli
  girilmemiş** makinalar (R4) da ayrı bir satırda adetleriyle ve taşıdıkları toplam maliyetle gösterilir;
  aksi hâlde bu makinaların maliyeti hiçbir yerde görünmez. **Dönem serbest bir tarih
  aralığıdır**; makinanın hangi döneme düştüğü satış tarihine bakar. Ortak gider payı üretim ayında
  sabitlendiği için kısmi ay sorun çıkarmaz, ancak **ay bazlı olan iki satır** ("dağıtılmamış ortak gider"
  ve standart fark satırı, R25) yalnız aralığa **tam giren aylar** için hesaplanır; aralık bir ayı ortadan
  kesiyorsa o satır gizlenmez, yerinde kalır ve neden hesaplanamadığını yazıyla açıklar (0001 AC-38 deseni).
- **R8.** Kâr marjı, raporlarda ve makina kartında **tek tanımla** hesaplanır: kârın satış bedeline
  oranı. Bu tanım karşılaştırma rakamıdır ve başka bir yerde başka bir marj tanımıyla gösterilmez.
  Marj **bir ondalık** basamakla gösterilir (%81,0). Satış bedeli sıfırsa marj hesaplanmaz, yerine "—"
  gösterilir ve hesap hata vermez.
- **R9.** Kullanıcı hedef kârını girerek önerilen satış fiyatını görebilir ve hesabın hangi yöntemle
  yapılacağını seçebilir: **satış bedeli üzerinden marj** veya **maliyetin üstüne kâr ekleme**.
  Seçilen yöntem ekranda yazar. Öneri **model bazlıdır**: kullanıcı bir model seçer ve öneri o modelin
  ortalama üretim maliyeti üzerinden hesaplanır. Ortalama, o dönemde o modelden **üretilmiş** makinaların
  (satılmış olsun olmasın) **üretim maliyeti** ortalamasıdır ve **komisyon içermez**, çünkü komisyon
  satışta oluşur. Varsayılan dönem **son 12 aydır** ve hangi dönemin
  ortalaması olduğu ekranda yazar. Seçilen modelden o dönemde hiç makina üretilmemişse öneri üretilmez ve
  nedeni yazılır.
- **R9b.** **Geçerli aralıklar:** satış bedeli üzerinden marj yönteminde değer sıfırdan büyük ve yüzden
  küçük olmalıdır; maliyetin üstüne kâr ekleme yönteminde sıfır ve üzeri; maliyetin katı yönteminde
  (R24) sıfırdan büyük. Kat değeri 1'in altında girildiğinde "zararına satış" uyarısı gösterilir, ancak
  öneri yine üretilir. Önerilen fiyat **en yakın tam TL'ye** yuvarlanır.
- **R10.** Gider verisi girilmemiş bir dönemde **üretilmiş** makina için maliyet ve kâr rakamı gösterilmez;
  bunun yerine gider verisinin eksik olduğu bilgisi gösterilir. **"Gider verisi girilmemiş" yalnız tek bir
  şey demektir:** üretim ayı, 0001'deki yürürlük ayının öncesindedir. Yürürlük ayının içinde kalan ama hiç
  gider kalemi bulunmayan bir ay gerçek sıfırdır; o ayın payı sıfır olarak hesaplanır ve maliyet gösterilir.
- **R11.** Bir ayda hiç makina **üretilmemişse** o ayın ortak giderleri hiçbir makinaya dağıtılmaz; tutar
  dönem özetinde "dağıtılmamış ortak gider" olarak gösterilir ve sonraki aylara devredilmez.
- **R12.** Bir makina satışı kaydedilirken, satış TL dışı bir para birimindeyse o günkü kur satışın
  kaydına yazılır ve sonradan değişmez. Kaydedilen değer **"1 birim yabancı para = X TL"** biçimindedir.
  Kâr hesabı bu sabit kurla yapılır. **Kur o anda alınamıyorsa** (uygulama çevrimdışı) kayıt engellenmez;
  alan boş kalır ve makina R13'e düşer.
  **Kur alanı para birimine bağlıdır:** TL dışı bir para birimiyle kaydedilirken kur alanı boşsa o günün
  kuru yazılır; kayıt sonradan **başka bir para birimine** çevrilirse eski kur temizlenir ve yenisi yazılır;
  TL'ye dönülürse kur temizlenir. Aksi hâlde kayıtta yanlış para biriminin kuru kalır ve kâr sessizce
  yanlış hesaplanır.
- **R13.** Kuru kayıtlı olmayan eski satışlarda kâr güncel kurla hesaplanır ve rakamın yaklaşık olduğu
  ekranda belirtilir.
- **R14.** İkinci el devirler için yeniden maliyet hesaplanmaz; maliyet ve kâr yalnız makinanın fabrikadan
  ilk satışına aittir.
- **R15.** Maliyet ve kâr verisi, **0001'in gider sekmesi görünürlüğüne** sahip kullanıcılara gösterilir.
  Bu spec salt okunurdur; yeni bir eylem izni tanımlanmaz ve mevcut gider eylem izinleri aranmaz.
- **R16.** **Model havuzu.** Bir gider kalemindeki her model satırı (0001 R21: model, birim maliyet, adet)
  kendi havuzunu oluşturur. Havuz yalnız **canlı** modeller için kurulur: 0001'in kuralı gereği silinmiş bir
  modele ait satırın tutarı model kovasına değil **ortak gider havuzuna** düşer, dolayısıyla o ayın payını
  değiştirir. Havuzun makina başına payı **girilen birim maliyettir**, kapasitesi girilen
  **adettir**; havuzun toplam büyüklüğü birim maliyet çarpı adettir.
- **R17.** O modelden **üretilen** her makina, üretim tarihi sırasına göre havuzdan **bir pay** tüketir.
  Havuz tükendiğinde o satırdan başka makinaya pay yazılmaz. Bir makina birden çok havuzdan pay alabilir
  (aynı modele birden çok malzeme alımı yapılmışsa); bu payların toplamı o makinanın **malzeme maliyetidir**.
- **R17b.** **Havuz yalnız ileriye çalışır:** bir havuz, kendi gider kaleminin tarihinden **önce** üretilmiş
  makinalara pay vermez. Aksi hâlde bugün girilen bir fatura geçmiş ayların maliyetini geriye dönük
  değiştirir ve kullanıcı dün gördüğü rakamı bir daha göremez. Geç girilen bir fatura hiçbir makinaya
  düşmezse tutarı "henüz makinalara yüklenmemiş malzeme gideri" olarak kalır (R18); kullanıcı kalemin
  tarihini düzelterek çözer.
- **R17c.** **Sıra kuralları deterministiktir.** Aynı modele birden çok havuz varsa tüketim sırası kalemin
  tarihine, tarihler eşitse kalem kimliğine göredir. Aynı gün üretilmiş iki makina arasında sıra seri
  numarasına, seri numarası yoksa kayıt kimliğine göredir. Amaç anlamlı bir öncelik değil, aynı veride her
  zaman aynı sonucu üretmektir.
- **R18.** Havuzların **tüketilmemiş kalanı** hiçbir makinanın maliyetine girmez; dönem özetinde "henüz
  makinalara yüklenmemiş malzeme gideri" olarak model bazında gösterilir.
- **R18b.** Tersi durumda, yani o modelden havuz kapasitesinden **daha çok** makina üretilmişse, artan
  makinalar malzeme payı almaz. Dönem özeti bunu **"malzeme payı alamamış makina sayısı"** olarak model
  bazında gösterir ve makina detayında da belirtir. Bu sayı, kullanıcının "kaç makinalık" beyanının
  eksik kaldığının tek sinyalidir; gösterilmezse o makinalar sessizce olduğundan ucuz görünür.
- **R19.** Bir makinaya doğrudan atanmış gider, o makinanın maliyetine **üretim anında** girer. Doğrudan
  atamada R17b'nin ileri-yönlü kuralı **uygulanmaz**: kalemin tarihi satıştan sonra olsa bile maliyete
  girer. Asimetri bilinçlidir; doğrudan atamayı kullanıcı o makina için açıkça yazmıştır, havuz ise
  "kaç makinalık" beyanına dayandığı için geriye dönük sürpriz üretmemelidir. Makina
  satılmamışsa bu maliyet stokta bekler ve dönem özetinde "stoktaki makinaların taşıdığı maliyet" satırında
  görünür; satış gerçekleştiğinde o satırdan düşer ve kârlılık hesabına geçer.
- **R20.** "Makina maliyetine dağıtılmasın" işaretli kalemler (0001 R20) hiçbir makinanın maliyetine
  girmez ve hiçbir havuza katılmaz.
- **R21.** **Kira ve personel davranışlı kalemler her zaman ortak gider havuzuna girer**; makinaya veya
  modele atanamazlar (0001 R21 bu alanları yalnız normal davranışlı kalemlerde gösterir ve 0001 motoru
  davranış normal değilse atamayı yok sayıp tutarın tamamını ortağa yazar). Maliyet hesabı bu kuralı
  yeniden yorumlamaz.
- **R22.** **Ortak gider kaynağı seçilebilir.** Maliyet hesabı, ortak giderleri iki kaynaktan birinden alır:
  **gerçekleşen** gider kayıtları veya 0001 R22'deki **aylık standart tutarlar**. Seçim uygulama genelindedir
  ve maliyetin gösterildiği her ekranda hangi kaynağın kullanıldığı yazar. İki kaynak **asla toplanmaz**.
  Standart kaynakta bir ayın tutarı, 0001'in sürüm kuralıyla bulunur: o aya uyan sürümlerin toplamı. O ay
  için hiçbir sürümü olmayan bir standart kalem sıfır sayılır ve dönem özeti bu durumu ayrıca belirtir.
- **R23.** Kârlılıkta marj yanında **çarpan** da gösterilir: satış bedelinin toplam maliyete oranı
  (örneğin 2,19 kat). Çarpan **iki ondalık** basamakla gösterilir. Toplam maliyet sıfırsa çarpan
  hesaplanmaz, yerine "—" gösterilir ve hesap hata vermez.
- **R24.** Fiyat önerisinde (R9) üçüncü bir yöntem sunulur: **maliyetin katı** (kullanıcı 2,2 girer, öneri
  ortalama maliyetin 2,2 katıdır).
- **R25.** Standart kaynak seçiliyken dönem özeti, aynı dönemin **gerçekleşen ortak gideri ile standart
  toplamı arasındaki farkı** ayrı bir satırda gösterir.
- **R26.** Kârlılık, **Giderler sekmesinde yeni bir alt görünüm** ("Makina Kârlılığı") olarak yaşar; ayrıca
  müşteri/makina detayında o makinanın maliyet ve kâr kutusu bulunur. Finans ekranı değiştirilmez, çünkü
  Finans yetkisi gider yetkisinden farklı bir kitleye açıktır.
- **R27.** Hesap yalnız **canlı** kayıtlarla çalışır: çöp kutusundaki makinalar ve gider kalemleri hiçbir
  toplama girmez, çöpten geri alındıklarında geri döner. **İkinci el devirler hiç listelenmez**: ne ikinci
  satışın döneminde görünür ne de yeni bir maliyet üretir (X6).
- **R28.** Makina kârı yalnız **makina satış bedelinden** hesaplanır. Aynı makinaya yapılmış Extra Kalıp,
  servis ve yedek parça satışlarının geliri bu hesaba girmez (X4).

---

## Constraints

### Uyulması zorunlu

- **C1.** Bu spec **yeni gider verisi toplamaz**; yalnız 0001'in topladığı veriden hesap üretir.
- **C2.** Gelir tarafı, Finans ekranının bugün kullandığı gerçek bedel kuralıyla aynı olmalıdır; iki ekran
  aynı makina için farklı satış bedeli kullanamaz.
- **C3.** Hesap, arayüzden bağımsız saf motorda yapılır ve kendi testiyle gelir.
- **C4.** Bu spec hesap tarafında salt okunurdur. **Üç istisna vardır, üçü de burada sayılıdır:**
  (1) satış anındaki kurun satış kaydına yazılması (R12), (2) üretim tarihinin satış kaydına yazılması ve
  elle düzeltilebilmesi (R1b), (3) ortak gider kaynağı seçiminin (R22) uygulama ayarı olarak saklanması.
  Üçüncüsü 0001'in `giderAyarlari` desenini izler: `appSettings` içinde JSON dört nokta kuralıyla saklanır,
  makinaya özgü alanlar listesine **girmez** (yani sunucu üzerinden paylaşılır) ve değiştirildiğinde
  **bütün kullanıcıların** rakamı değişir; bu, ayarın yanında yazar. Bunların dışında yeni kalıcı alan
  eklenmez ve mevcut kayıtlar değiştirilmez.
- **C5.** Yeni izin tanımlanmaz; görünürlük 0001'in gider yetkisine bağlıdır.
- **C6.** Kullanıcıya görünen tüm metinler Türkçedir.
- **C7.** **Model havuzu bir stok değerlemesi değildir.** Parça bazında alış maliyeti tutulmaz; havuz,
  kullanıcının beyan ettiği "kaç makinalık" adedine dayanır ve doğruluğu o beyana bağlıdır. İleride gerçek
  parça alış maliyeti toplanmaya başlanırsa (0001 X2), havuz mantığı **devre dışı bırakılmalıdır**; ikisi
  aynı anda çalışırsa aynı malzeme iki kez maliyete girer. Bu geçiş kuralı o spec'in sorumluluğudur.
- **C8.** **Standart ve gerçekleşen karıştırılmaz.** Bir dönemin ortak gideri ya tamamen gerçekleşen
  kayıtlardan ya tamamen standart tutarlardan alınır; ikisinin karışımı veya toplamı hiçbir hesapta
  kullanılmaz. Aksi hâlde aynı gider iki kez sayılır (0001 C19'un aynı sınıfı). Seçim **yalnız ortak gider
  payını** etkiler: doğrudan atanmış giderler ve model havuzları her zaman gerçekleşen kayıtlardan gelir.
- **C10.** **Kabul edilen sınır: maliyet türetilmiş bir rakamdır, kaydedilmez.** Geçmiş bir ayın verisi
  değiştiğinde (o aya gider kalemi eklenmesi, bir makinanın veya modelin silinmesi, bir makinanın modelinin
  değiştirilmesi, çöpten geri alma) o ayın payları ve ondan türeyen kârlar **yeniden hesaplanır**. R17b
  yalnız havuzları geriye dönük sürprizden korur, ortak gider payı doğası gereği korunmaz. Rakamı
  dondurmak bu spec'in salt okunur olma kararını (C4) bozacağı için kabul edilmiştir; maliyetin
  gösterildiği ekranda "bugünkü veriye göre hesaplanmıştır" notu bulunur.
- **C9.** Hesap, makina, havuz ve ay üçlüsünü **tek geçişte** çözer; her makina için bütün kalemleri
  yeniden taramaz. Arayüz sonucu memoize eder. Bu projede binlerce kayıt var ve maliyet ekranı her
  açılışta yeniden hesaplanacak.

### KAPSAM DIŞI

- **X1.** Parça stoğundan çekilen parçaların alış maliyeti — *neden:* parça bazında alış fiyatı toplanmıyor
  ve geçmişe dönük de yok (0001 X2). Gider olarak girilen malzeme alımları model satırlarıyla maliyete
  girdiği için asıl malzeme yükü yakalanıyor; eksik kalan, üretimde ve serviste stoktan çekilen parçalardır.
  Alış fiyatı toplanmaya başlanırsa formüle eklenir ve C7'deki geçiş kuralı uygulanır.
- **X2.** Ortak gider payının model büyüklüğüne göre ağırlıklandırılması — *neden:* **müşterinin kendi
  maliyet tablosu da eşit pay kullanıyor** (MASRAFLAR.xlsx: aylık genel gider bölü aylık üretim adedi,
  makina başına 79.850 TL, beş modelin hepsinde aynı). Modeller arasındaki maliyet farkı genel giderden
  değil **malzemeden** doğuyor ve malzeme zaten model bazında toplanıyor (R16). Ağırlık katsayısı bu yüzden
  gereksiz bir ayar olurdu.
- **X3.** Muhasebe anlamında **stok değerlemesi** (stoktaki makinaların bilanço değeri, dönem sonu
  envanter değeri) — *neden:* bu bir muhasebe konusudur ve mali müşavirin işidir. **Karıştırılmasın:**
  R19 gereği stoktaki makina taşıdığı maliyeti **bilgi amaçlı** gösterir ve dönem özetinde ayrı bir
  satırda durur; kapsam dışı olan, bu rakamın muhasebe değeri gibi kullanılmasıdır.
- **X4.** Servis, Extra Kalıp ve yedek parça kârlılığı — *neden:* v1 yalnız makina tarafına bakıyor.
- **X5.** Geçmiş satışlar için tarihsel kurun geriye dönük doldurulması — *neden:* o gün hangi kurun
  geçerli olduğu hiçbir yerde tutulmamış. Bundan sonraki satışlar kurunu kaydeder (R12), eski satışlar
  yaklaşık kalır (R13).
- **X6.** İkinci el devirlerin kârlılığı — *neden:* fabrika o satışın tarafı değil.
- **X7.** Bütçe, hedef takibi ve sapma analizi — *neden:* önce gerçekleşen rakamın doğru görünmesi gerekiyor.
- **X8.** Havuz paylarının makinalar arasında ağırlıklı dağıtılması (örneğin büyük makinanın daha çok bant
  kullanması) — *neden:* X2 ile aynı gerekçe, v1'de eşit pay. Farklı malzeme kullanan modeller için ayrı
  kalem girilerek aynı sonuç elde edilebilir.
- **X10.** **Aylık Faaliyet Raporu'na gider veya kârlılık bölümü eklenmesi** — *neden:* 0001 X14 bu işi
  "0002 ile gelecek" diye devretmişti, ancak rapor Finans'tan `fin_rapor` eylem izniyle alınıyor ve bu izin
  **gider yetkisinden bağımsız** bir kitleye açık. Rapora gider veya kârlılık bölümü eklemek R15'i ve
  0001 C7b'nin personel gizliliği sınırını deler. Konu kendi spec'ine bırakılır; o spec önce raporun yetki
  kapısını çözmek zorundadır.
- **X9.** Üretim partisi (batch) kavramı — *neden:* müşterinin tablosu maliyeti parti bazında topluyor
  ("2017 1nci parti", 70 makina), ancak uygulamada üretim partisi diye bir kayıt yok ve eklemek üretim
  planlamasını baştan kurmak demek. Ay bazlı üretim adedi yeterince iyi bir tabandır. Sonucu bilerek kabul
  ediliyor: bir partinin başında alınıp sonunda kullanılan malzemenin maliyeti aylara yayılır ve
  "bu partinin maliyeti" tek rakamda görünmez.

---

## Context

- **Bu spec'in girdisi 0001'dir.** Gider kalemleri, makinaya atama alanı (0001 R7) ve yürürlük ayı
  (0001 R10) olmadan burada hiçbir rakam hesaplanamaz. 0001 onaylanmadan bu spec geliştirmeye açılmamalıdır.
- **Gelir tarafı bugün nasıl okunuyor.** Finans, "gelir" sayarken her zaman gerçek bedeli kullanıyor,
  ham fatura bedelini değil; çünkü Faturasız satışlarda fatura bedeli kasıtlı olarak gerçek bedelden düşük
  tutulabiliyor (`src/components/Finance.jsx:128-132`). R4 aynı kuralı tekrarlar, C2 ikisinin ayrışmasını
  yasaklar.
- **Komisyon bugün nerede.** Müşteri kaydında `komisyon` alanı var ve aylık raporda satış tarafında
  ayrı bir toplam olarak duruyor (`src/lib/aylikRapor.js`, `komisyonTutar`). Bu spec onu maliyet tarafına
  taşır; aylık rapordaki mevcut gösterim değişmez, yalnız kârlılık hesabı onu maliyet sayar. İki yerde
  farklı anlam taşıdığı için PR'da bu ayrım açıkça yazılmalıdır.
- **Döviz.** Uygulama yalnız **güncel** kuru çekiyor (`src/App.jsx:627`, ücretsiz API, tek noktadan
  çekilip Dashboard ve Finans'a prop olarak dağıtılıyor); tarihsel kur saklanmıyor ve Finans TL
  karşılığını "yaklaşık" etiketiyle gösteriyor (`Finance.jsx:51-52`). Güncel kurla hesaplanan kâr her
  gün değişeceği için R12 kuru satış anında donduruyor. **Bu, uygulamada zaten var olan bir desendir:**
  evrak kaydı kurunu kendi içinde donduruyor (`src/lib/utils.js:423-425`, `kurRate`) ve kredi kartı
  komisyonu işlem anındaki tabloyla hesaplanıp kayda snapshot olarak yazılıyor (`src/lib/krediKarti.js`).
  Kur snapshot'ı bu desenin üçüncüsüdür.
- **Kâr marjı iki farklı şey olabilir.** "Yüzde 25 kâr" cümlesi hem satış bedelinin yüzde 25'i hem de
  maliyetin üstüne yüzde 25 eklemek anlamına gelebiliyor ve aynı maliyette farklı fiyat veriyor
  (80.000 TL maliyette 106.667 TL'ye karşı 100.000 TL). Bu yüzden rapor tarafı tek tanıma sabitlendi
  (R8), seçim yalnız fiyat önerisi ekranında sunuluyor (R9).
- **İkinci el.** Makina devri `isResale` ve `prevOwners` ile tutuluyor; Finans'ta ikinci el devir orijinal
  satışın bedelini değiştirmiyor. R14 aynı çizgidedir.
- **Satışta stok satırı siliniyor.** Bir stok makinası müşteriye işlendiğinde stok satırı kalıcı olarak
  siliniyor ve müşteri kaydında yalnız `sourceStockId` kalıyor (`src/components/Customers.jsx:248-261`).
  Yani `addedDate` satıştan sonra hiçbir yerde yok; R1b'nin üretim tarihini kayda yazması bu yüzden
  zorunlu. Ayrıca bir müşteri silindiğinde makina stoğa **bugünün tarihiyle yeni bir satır** olarak
  dönüyor (`Customers.jsx:422`, not: "Silinen müşteriden geri döndü"); R1c bu satırı üretim saymayarak
  o ayın payının sulanmasını engelliyor.
- **0001'in motoru hazır kovaları veriyor.** `src/lib/gider.js` içinde `kovaDagilimi` (makina / model /
  dağıtılmayan / ortak), `hesaplaGiderRaporu`, `yururlukKapsami` ve `standartGiderAyi` zaten var ve kuruş
  tamsayısıyla çalışıyor. 0002 bu kuralları **yeniden türetmez**, aynı kaynağı tüketir; aksi hâlde iki
  ekran aynı gider için farklı kova üretir (bu projede Finans ile aylık raporun ayrışması iki kez hata
  oldu).
- **Emsal.** Salt okunur, saf motorlu, yeni kolonsuz bir hesap ekranının emsali Analiz sekmesidir
  (`src/lib/analiz.js` + `src/components/Analiz.jsx`). C3 ve C4 bu emsale dayanır.

Bilinen tuzaklar:

- **Sıfıra bölme.** Bir ayda hiç makina satılmamışsa pay hesabı bölme yapmamalı (R11).
- **Dönem sınırı.** Tarihler metin olarak saklanıyor ve bu projede tarih karşılaştırmaları metin üzerinden
  yapılıyor; ay sınırındaki bir satışın yanlış aya sayılması daha önce yaşanmış bir hata sınıfıdır
  (`Finance.jsx:74-79`).
- **Bilinen ayrışma: devredilmiş makina (uygulama triyajı, 24.09.2026).** İkinci el devir yeni kayıt açmaz; aynı
  kayıt `isResale` olur ve fabrikanın ilk satışını taşımaya devam eder. Finans ve bu spec'in kârlılığı o satışı
  sayar (plan M1), **Aylık Faaliyet Raporu ise `isResale` kaydı satıştan çıkarır** (`aylikRapor.js`). Ayrışma bu
  spec'ten önce de vardı; C2 devredilmiş kayıt için bu yüzden Finans'a göre sağlanır, rapora göre değil.
  `tests/gercek-bedel-capraz.test.js` farkı açıkça sabitler. Raporun da ilk satışı sayması ayrı iş olarak önerildi.
- **Rakamın yanıltıcılığı.** Malzeme maliyeti hariç bir "maliyet" rakamı, etiketlenmezse kullanıcıyı
  yanıltır. R3 bu yüzden bir görünüm tercihi değil, gereksinimdir.

---

## Acceptance Criteria

- **AC-1.** Bir ayda ortak giderler toplamı 300.000 TL ve o ay 5 makina **üretilmişse**, o ay üretilen her
  makinanın ortak gider payı 60.000 TL olur.
- **AC-2.** Ortak gider payı 60.000 TL olan bir makinaya 20.000 TL doğrudan gider atanmışsa ve satışta
  15.000 TL komisyon ödenmişse, maliyeti 95.000 TL olarak gösterilir.
- **AC-3.** Maliyeti 95.000 TL olan ve gerçek bedeli 500.000 TL olan makinanın kârı 405.000 TL, kâr marjı
  %81,0 olarak gösterilir (bir ondalık, AC-58).
- **AC-4.** Maliyeti satış bedelinden yüksek olan bir makina için kâr negatif değil, zarar olarak
  etiketlenmiş biçimde gösterilir.
- **AC-5.** Fabrika satış bedeli girilmiş bir makinada kâr bu bedel üzerinden hesaplanır, fatura bedeli
  farklı olsa bile.
- **AC-6.** Fabrika satış bedeli boş olan bir makinada kâr fatura bedeli üzerinden hesaplanır.
- **AC-7.** Maliyetin gösterildiği her ekranda, stoktan çekilen parçaların maliyetinin hariç olduğu bilgisi
  görünür.
- **AC-8.** Bir makinanın maliyet detayı açıldığında doğrudan giderler, ortak gider payı, komisyon ve
  satış bedeli ayrı satırlar hâlinde listelenir ve bu satırların toplamı gösterilen maliyete eşittir.
- **AC-9.** Dönem kârlılık özetindeki makina kârlarının toplamı, dönem toplam kârına eşittir.
- **AC-10.** 0001'deki yürürlük ayından önce satılmış bir makinada maliyet ve kâr rakamı gösterilmez;
  yerine gider verisinin girilmemiş olduğu bilgisi gösterilir.
- **AC-11.** Bir ayda gider var ama hiç makina **üretilmemişse** hesap hata vermez, o ayın ortak giderleri
  hiçbir makinaya dağıtılmaz ve dönem özetinde "dağıtılmamış ortak gider" olarak belirtilir.
- **AC-12.** USD para biriminde bir makina satışı kaydedildiğinde o günkü kur satış kaydına yazılır ve
  kayıt tekrar açıldığında aynı kur görünür.
- **AC-13.** Kuru kayıtlı bir USD satışın TL kârı, güncel kur değişse bile değişmez; hesap kayıtlı kuru
  kullanır.
- **AC-14.** Kuru kayıtlı olmayan eski bir USD satışın kârı güncel kurla hesaplanır ve ekranda "yaklaşık"
  bilgisi gösterilir.
- **AC-15.** Makina başına ortalama maliyet 80.000 TL iken "satış bedeli üzerinden marj" yöntemiyle
  yüzde 25 girildiğinde önerilen fiyat 106.667 TL olarak gösterilir.
- **AC-16.** Aynı maliyette "maliyetin üstüne kâr ekleme" yöntemiyle yüzde 25 girildiğinde önerilen fiyat
  100.000 TL olarak gösterilir.
- **AC-17.** Fiyat önerisi ekranında hangi yöntemin seçili olduğu yazar.
- **AC-18.** "Satış bedeli üzerinden marj" yönteminde yüzde 100 veya daha büyük bir değer girildiğinde
  fiyat önerisi üretilmez, kullanıcıya geçerli aralık bildirilir.
- **AC-19.** Fiyat önerisinin hangi dönemin ortalama maliyetine dayandığı ekranda yazar.
- **AC-20.** Hiç satılmış makina olmayan bir dönem seçildiğinde kârlılık özeti boş durum mesajı gösterir.
- **AC-21.** İkinci el olarak devredilmiş bir makina için ikinci satışa ait maliyet veya kâr hesaplanmaz.
- **AC-22.** Gider yetkisi olmayan bir kullanıcıya maliyet ve kâr rakamları görünmez.
- **AC-23.** Bir model satırında birim maliyet 1.000 TL ve adet 40 girildiğinde o havuzun büyüklüğü
  40.000 TL, makina başına payı 1.000 TL olur.
- **AC-24.** O modelden **üretilen** ilk makinaya bu havuzdan 1.000 TL yazılır ve havuzun kalanı 39.000 TL
  (39 makinalık) olarak gösterilir.
- **AC-25.** Havuzu tükenmiş bir satırdan, o modelden sonradan **üretilen** makinalara pay yazılmaz.
- **AC-26.** Aynı modele iki ayrı malzeme kalemi atanmışsa, o modelden satılan bir makinanın doğrudan
  gideri iki havuzdan aldığı payların toplamıdır.
- **AC-27.** Bir modele atanmış kalem, ortak gider payı hesabına (R2) girmez.
- **AC-28.** Bir model satırının bulunduğu ayda o modelden hiç makina **üretilmemişse** hesap hata vermez;
  tutarın tamamı dönem özetinde "henüz makinalara yüklenmemiş malzeme gideri" olarak görünür.
- **AC-29.** Stoktaki bir makinaya atanmış gider, makina satılmadan önce o makinanın **üretim maliyetine**
  girer ve dönem özetinde "stoktaki makinaların taşıdığı maliyet" satırında görünür.
- **AC-30.** Makina satıldığında taşıdığı maliyet "stoktaki makinaların taşıdığı maliyet" satırından düşer
  ve o dönemin kârlılık hesabına geçer.
- **AC-31.** "Makina maliyetine dağıtılmasın" işaretli bir kalem hiçbir makinanın maliyetinde ve hiçbir
  havuzda görünmez.
- **AC-32.** Bir makinanın ortak gider payı, **üretildiği** ayın payıdır; makina başka bir ayda satılsa
  bile pay değişmez.
- **AC-33.** Stoğa hiç girmeden doğrudan müşteri kaydı olarak açılan bir makinada üretim tarihi satış
  tarihi sayılır ve maliyet detayında bu durum yazar.
- **AC-34.** Ortak gider kaynağı "standart" seçildiğinde ortak gider payı, o ayın standart tutarları
  toplamından hesaplanır; gerçekleşen gider kayıtları hesaba katılmaz.
- **AC-35.** Ortak gider kaynağı "gerçekleşen" seçildiğinde standart tutarlar hesaba katılmaz.
- **AC-36.** Maliyetin gösterildiği ekranda hangi ortak gider kaynağının kullanıldığı yazar.
- **AC-37.** Standart kaynak seçiliyken dönem özeti, aynı dönemin gerçekleşen ortak gideri ile standart
  toplam arasındaki farkı ayrı bir satırda gösterir.
- **AC-38.** Toplam maliyeti 145.781 TL ve satış bedeli 319.986 TL olan bir makinada çarpan 2,19 olarak
  gösterilir.
- **AC-39.** Fiyat önerisinde "maliyetin katı" yöntemi seçilip 2,2 girildiğinde, ortalama maliyeti
  80.000 TL olan bir makina için önerilen fiyat 176.000 TL olur.
- **AC-40.** Bir gider kaleminde üç model satırı varsa (5, 40 ve 25 adet), her modelin üretilen
  makinaları yalnız kendi satırının havuzundan pay alır; bir modelin makinası başka modelin havuzundan
  pay almaz.
- **AC-41.** Bir stok makinası müşteriye satıldığında üretim tarihi satış kaydına yazılır ve kayıt
  yeniden açıldığında aynı tarih görünür.
- **AC-42.** Üretim tarihi kayıtlı olmayan eski bir satışta, o stok satırına ait makina üretimi stok
  hareketinin tarihi üretim tarihi olarak kullanılır.
- **AC-43.** Ne kayıtlı üretim tarihi ne de stok hareketi bulunan bir satışta satış tarihi kullanılır ve
  maliyet detayında "üretim tarihi tahmini" etiketi görünür.
- **AC-44.** Silinen bir müşteriden stoğa geri dönen makina, geri döndüğü ayın üretim sayısına eklenmez.
- **AC-45.** Çöp kutusundaki bir makina hiçbir ayın üretim sayısına girmez; çöpten geri alındığında sayıya
  geri döner.
- **AC-46.** İkinci el olarak devredilmiş bir makina, ikinci satışın döneminde kârlılık listesinde
  görünmez.
- **AC-47.** 300.000 TL ortak gider o ay üretilen 7 makinaya bölündüğünde paylar kuruş bazında aşağı
  yuvarlanır, artan kuruşlar o ayın ilk üretilen makinasına yazılır ve payların toplamı 300.000 TL'ye tam
  eşit olur.
- **AC-48.** Tarihi 15 Mart olan bir malzeme kalemi, 1 Mart'ta üretilmiş bir makinaya pay yazmaz.
- **AC-49.** Aynı modele ait iki havuzdan önce kalem tarihi erken olan tüketilir; tarihler eşitse sıra
  kalem kimliğine göre belirlenir ve aynı veri iki kez hesaplandığında aynı sonucu verir.
- **AC-50.** Aynı gün üretilmiş iki makinada havuz payı seri numarası sırasına göre dağıtılır.
- **AC-51.** 40 makinalık bir havuza karşılık o modelden 45 makina üretilmişse 5 makina malzeme payı
  almaz ve dönem özetinde "malzeme payı alamamış makina sayısı" 5 olarak görünür.
- **AC-52.** Fabrika satış bedeli ve fatura bedeli boş olan bir makinada kâr hesaplanmaz; makina
  "satış bedeli girilmemiş" sayısına girer ve dönem toplamlarını değiştirmez.
- **AC-53.** USD satışta kâr TL olarak gösterilir ve ekranda hem USD tutar hem TL karşılığı görünür.
- **AC-54.** Komisyon satış bedeliyle aynı para biriminde kabul edilir ve TL'ye aynı kurla çevrilir.
- **AC-55.** Kur alınamadığı sırada kaydedilen bir USD satışı engellenmez; kur alanı boş kalır ve makina
  "yaklaşık" etiketiyle görünür.
- **AC-56.** Toplam maliyeti sıfır olan bir makinada çarpan "—" gösterilir ve hesap hata vermez.
- **AC-57.** Satış bedeli sıfır olan bir makinada marj "—" gösterilir.
- **AC-58.** Marj bir ondalık basamakla (%81,0), çarpan iki ondalık basamakla (2,19) gösterilir.
- **AC-59.** Fiyat önerisi, seçilen modelin son 12 aydaki ortalama üretim maliyetini kullanır ve bu dönem
  ekranda yazar.
- **AC-60.** Seçilen modelden son 12 ayda hiç makina üretilmemişse fiyat önerisi üretilmez ve nedeni
  yazılır.
- **AC-61.** Maliyetin katı yönteminde 0,8 girildiğinde "zararına satış" uyarısı gösterilir ve öneri yine
  üretilir.
- **AC-62.** Maliyetin üstüne kâr ekleme yönteminde negatif bir değer girildiğinde öneri üretilmez ve
  geçerli aralık kullanıcıya bildirilir.
- **AC-63.** Önerilen fiyat en yakın tam TL'ye yuvarlanır.
- **AC-64.** Yürürlük ayının içinde kalan ama hiç gider kalemi bulunmayan bir ayda üretilen makinanın
  ortak gider payı sıfırdır; maliyet gösterilir ve "gider verisi girilmemiş" uyarısı çıkmaz.
- **AC-65.** Standart kaynakta bir ayın tutarı o aya uyan sürümlerin toplamıdır; o ay için hiç sürümü
  olmayan standart kalem sıfır sayılır ve dönem özeti bunu belirtir.
- **AC-66.** Kârlılık özeti serbest tarih aralığıyla çalışır; aralık bir ayı ortadan kesiyorsa
  "dağıtılmamış ortak gider" ve standart fark satırları rakam yerine açıklama gösterir.
- **AC-67.** Bir makinanın hangi dönemin kârlılık özetinde göründüğü satış tarihine (`installDate`) göre
  belirlenir.
- **AC-68.** Aynı makinaya yapılmış bir Extra Kalıp satışının geliri makina kârına eklenmez.
- **AC-69.** Maliyet ve kâr rakamları Giderler sekmesindeki "Makina Kârlılığı" alt görünümünde ve makina
  detayında görünür; Finans ekranında gösterilmez.
- **AC-70.** Kira veya personel davranışlı bir gider kalemi, üzerinde bir atama bilgisi bulunsa bile
  hiçbir makinanın doğrudan gideri sayılmaz; tutarının tamamı o ayın ortak gider havuzuna girer.
- **AC-71.** Silinmiş bir modele ait model satırının tutarı hiçbir havuza girmez; o ayın ortak gider
  havuzuna eklenir ve o ayın payını yükseltir.
- **AC-72.** USD olarak kaydedilmiş, kuru yazılı bir satış EUR'ya çevrildiğinde eski kur temizlenir ve
  o günün EUR kuru yazılır; TL'ye çevrildiğinde kur alanı boşalır.
- **AC-73.** Satış bedeli girilmemiş makinalar dönem özetinde ayrı bir satırda adetleriyle ve taşıdıkları
  toplam maliyetle görünür; kâr ve marj toplamlarına girmezler.
- **AC-74.** "Stoktaki makinaların taşıdığı maliyet" satırı, seçilen aralığın bitiş tarihi itibarıyla hâlâ
  satılmamış makinaları sayar ve başlığında bu tarih yazar.
- **AC-75.** Üretim tarihi elle düzeltilen bir makinada "üretim tarihi tahmini" etiketi kalkar ve ortak
  gider payı yeni tarihin ayından hesaplanır.
- **AC-76.** Bir kalemin 70.000 TL tutarından 50.000 TL'si modellere dağıtılmışsa, kalan 20.000 TL o ayın
  ortak gider payına girer; kalemin tamamı model havuzu sayılmaz.

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap React'sız **saf motorda**; arayüz yalnız gösteriyor.
- [ ] Gelir tarafı Finans ile **aynı kuralı** kullanıyor; aynı makina için iki ekran aynı satış bedelini
      gösteriyor (testle kanıtlandı).
- [ ] Satış kuru **ve üretim tarihi** alanları **dört nokta kuralıyla** eklendi (`SCHEMA_SQL` +
      `applyColumnMigrations` + `INSERT` + `SELECT`) ve `db-roundtrip` testine girdi; kuru olmayan eski
      kayıtların yaklaşık hesaba, üretim tarihi olmayanların çözüm zincirine (R1b) düştüğü testle gösterildi.
- [ ] Ortak gider kaynağı seçimi `appSettings` içinde 0001'in `giderAyarlari` desenine göre saklanıyor,
      makinaya özgü alanlar listesine girmiyor ve ayarın herkesi etkilediği ekranda yazıyor (C4-3, M-12).
- [ ] Ortak gider tutarı 0001 motorunun kova dağılımından okunuyor, yeniden türetilmiyor; kısmi dağıtılan
      kalemin kalanının ortak paya girdiği testle gösterildi (R2, AC-76).
- [ ] Bunun dışında yeni kalıcı alan eklenmedi ve mevcut kayıtlar değiştirilmedi (C4); PR özetinde yazıldı.
- [ ] Yeni izin eklenmedi; görünürlüğün 0001'in gider yetkisine bağlandığı testle gösterildi.
- [ ] Sıfıra bölme ve dönem sınırı durumları testle kapsandı; "kaç makinalık" adedi sıfır olan kalem
      motora hiç ulaşmıyor (0001 AC-78) ve ulaşsa bile hesap çökmüyor.
- [ ] Havuz tüketimi **üretim tarihine** göre deterministik sırayla çalışıyor (R17, R17c); aynı gün
      üretilen iki makinada ve aynı tarihli iki havuzda sıranın nasıl belirlendiği testle sabitlendi.
- [ ] Havuzun kendi kaleminin tarihinden önce üretilmiş makinalara pay vermediği testle gösterildi (R17b).
- [ ] Dört gider sınıfının (makinaya atanmış, modele atanmış, ortak, dağıtılmayan) toplamı 0001'in dönem
      gider toplamına eşit; hiçbir kalem iki sınıfta birden sayılmıyor.
- [ ] Hesap tek geçişte çalışıyor ve arayüz memoize ediyor (C9); binlerce kayıtla ekranın açılış süresi
      ölçüldü ve PR özetinde yazıldı.
- [ ] Kullanıcıya görünen tüm metinler Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (`docs/evidence/0002-ac<n>.png`), boş durum ve
      "gider verisi yok" durumu dâhil.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` maliyet ve kârlılık kuralıyla güncellendi; malzeme maliyetinin hariç olduğu yazıldı.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 5 | R1 kur ve marj turu; R2 toplu malzeme alımı turu; R3 müşterinin gerçek maliyet tablosu (MASRAFLAR.xlsx) turu; R4 geliştirme öncesi QA boşluk analizi (30 boşluk, AC-41…AC-69). R5 ikinci QA turu (16 boşluk, AC-70…AC-76): 0001 uygulandıktan sonra iki spec'in ayrıştığı noktalar. Beşi de kod yazılmadan önce yapıldı. |
| **Düzeltme turu sayısı** | 1 | Tek triyaj turu (dört bulgu), hepsi aynı gün düzeltildi. Ayrıca kodlama sırasında spec içi bir çelişki (R17/AC-26 paralel, R17c/AC-49 sıralı havuz tüketimi) kullanıcıya soruldu, paralel seçildi (plan M13). |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Dördü de gerçek: ay tablosunun ilk veri ayından başlaması (R11/R25 sessiz sıfır), çapraz testte devredilmiş kaydın yokluğu (ayrışma 0002'den önce de vardı, karar b ile sabitlendi), geri dönen stok satırının not metnine bağlılığı, bakım (yedek hesap, ölü alan, eksik key). |
| **Regresyon sayısı** | 0 | Mevcut davranış bozulmadı. Bir test beklentisi bilinçli güncellendi (Gider Ayarları kaydı artık kaynak alanını da yazıyor). Son durum: 162 dosya, 1614 test yeşil, lint 0 hata. |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok; görsel kanıt turu plan M12 ile atlandı. |

**Bu spec'ten çıkarılan ders:** Beş QA turundan geçmiş bir spec'te bile iki gereksinim birbirine ters düşebiliyor (havuz
tüketimi paralel mi sıralı mı); plan turunda her AC çiftinin aynı algoritmayla sağlanabildiği kontrol edilmeli. Triyajın iki
gerçek bulgusu kenar verilerden geldi: ilk üretimden önceki aylar ve devredilmiş kayıt. Çapraz testler, ekranların bilinen
farklı davrandığı veri türlerini (ikinci el, geri dönen stok, yürürlük öncesi) bilinçli olarak içermeli; aksi hâlde "aynı rakam"
güvencesi eksik okunur. Görsel kanıt maddesi (DoD) kullanıcı kararıyla atlandı.
