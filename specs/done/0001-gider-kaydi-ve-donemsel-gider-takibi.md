# 0001 — Gider Kaydı ve Dönemsel Gider Takibi

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-23) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Yeni "Giderler" sekmesi, tedarikçi kayıtları, Ayarlar (gider türü tanımları, tekrarlayan tanımlar, stopaj oranı, yürürlük ayı), Finans (KDV karşılaştırması), Firma Çalışanları, kullanıcı izinleri, yedekleme, işlem geçmişi ve çöp kutusu |
| **Bağımlı spec'ler** | yok (0002 buna bağlıdır) |
| **Revizyon** | R1 (2026-09-22): geliştirme öncesi QA boşluk analizi. 43 açık soru karara bağlandı; Requirements, Constraints ve Acceptance Criteria bölümleri güncellendi. R2 (2026-09-22): uygulama planı onaylandı (`specs/done/0001-uygulama-plani.md`, kararlar K1–K11); C18 eklendi. R3 (2026-09-22): plan turunda açık kalan üç konu karara bağlandı (K12–K15); R2/R5/R9 güncellendi, AC-35…AC-38 eklendi. R4 (2026-09-23): tedarikçi kavramı eklendi (R13–R15, X4 yeniden yazıldı, AC-39…AC-48). R5 (2026-09-23): personel maliyeti iki bileşene ayrıldı (R5/R16/R17, C7b, C19, X17, AC-49…AC-58). R6 (2026-09-23): ikinci QA boşluk analizi; 22 açık nokta karara bağlandı, R5/R13/R14/R15/R16/R17, C6/C7b/C17/C19 ve AC-2/13/44/47 güncellendi, AC-59…AC-67 eklendi. R7 (2026-09-23): ödeme yöntemi ve son ödeme tarihi alanları, çalışanları da kapsayan "kime ne kadar borçluyuz" özeti (R1/R18/R19, AC-68…AC-74); ödeme hatırlatıcısı 0003'e, kasa/avans/cari 0004'e, çalışan mesaisi 0005'e ayrıldı. R8 (2026-09-23): toplu malzeme alımı senaryosu — "makina maliyetine dağıtılmasın" işareti ve model bazlı atama + kaç makinalık adedi (R20/R21, AC-75…AC-81). R9 (2026-09-23): üçüncü QA boşluk analizi; 18 açık nokta karara bağlandı — tek vade alanı, "vadesi geçti" tanımı, borç özetinin gizlilik ve dönem kuralları, dört kovanın tam bölme olması, R8'in motor sözleşmesinin model ve dağıtılmayan kovalarıyla güncellenmesi, model bağının ad ile tutulması; R1/R8/R14/R18/R19/R21, X4 güncellendi, X18–X21 ve AC-82…AC-86 eklendi. R10 (2026-09-23): müşterinin gerçek maliyet tablosu (MASRAFLAR.xlsx) incelendi; model dağılımı çok satırlı hâle geldi (model + birim maliyet + adet, toplam kontrolü), aylık standart genel gider tanımları eklendi; R21/R22, X13, AC-87…AC-94. R11 (2026-09-23): dördüncü QA boşluk analizi; 14 açık nokta karara bağlandı — R10'un geride bıraktığı kriterler (AC-78/79/80/82/90) çok satırlı dağılıma ve tutar bazlı kova bölmesine göre yeniden yazıldı, satır toplamının kalemi aşması engellendi, standart genel gidere geçerlilik ayı eklendi; R12/R21/R22, C12 güncellendi, Context'e kaynak maddesi ve AC-90b/AC-95/AC-96 eklendi. |

---

## Intent

Fabrika yönetimi bugün yalnız kazandığını görüyor, harcadığını görmüyor. Kira, personel,
elektrik gibi giderler uygulamanın tamamen dışında duruyor; bu yüzden "bu ay ne harcadık",
"kiranın stopajını ne kadar kestik", "satışlardan doğan KDV'nin ne kadarını giderlerden
indirebiliriz" sorularının hiçbiri uygulamadan cevaplanamıyor. Aynı boşluk yüzünden bir
makinanın gerçekte neye mal olduğu da bilinmiyor.

Başarı şu demek: kullanıcı giderlerini düzenli olarak uygulamaya giriyor, seçtiği ay için
gider türü kırılımlı toplamı, ödenmemiş kalemleri, kesilen kira stopajını ve aynı dönemin
hesaplanan ile indirilecek KDV farkını tek ekranda görüyor. Bu iş bittiğinde makina maliyeti
hesaplanabilir hâle gelir, ancak maliyet hesabının kendisi ayrı bir iştir (0002).

---

## Requirements

- **R1.** Kullanıcı gider kalemi kaydedebilir, düzenleyebilir ve silebilir. Bir kalemde şunlar bulunur:
  tarih, gider türü, açıklama (opsiyonel), tedarikçi (opsiyonel, R13), KDV hariç tutar, KDV oranı,
  **ödeme yöntemi** (opsiyonel: Nakit, Havale, Çek, Kredi Kartı; boş bırakılırsa "belirtilmemiş";
  ödeme durumundan bağımsızdır, kalem ödenmeden önce de girilebilir ve ödendi işaretlenince değişmez),
  **son ödeme tarihi** (opsiyonel, vade; tek alandır, bkz. R18),
  ödeme durumu (ödendi / ödenmedi) ve ödendiyse ödeme tarihi. Gider tarihi ileri tarihli olabilir, engellenmez; kalem her durumda yalnız kendi
  tarihinin ayında raporlanır.
- **R2.** Gider türleri kullanıcı tarafından tanımlanır ve yeniden adlandırılabilir. Her türün, adından
  bağımsız bir **davranışı** vardır: *normal*, *kira* veya *personel*. Davranış tür oluşturulurken seçilir ve
  tür yeniden adlandırıldığında korunur; kira davranışı stopaj alanlarını, personel davranışı çalışan bağını
  açar. Kullanımda olan bir türün **davranışı değiştirilemez** (adı serbestçe değiştirilebilir). Kullanımda olan
  bir tür silindiğinde mevcut kayıtlar türsüz kalmaz; kayıtlar yalnız **aynı davranıştaki** başka bir türe
  taşınabilir. Aynı davranışta başka tür yoksa taşıma seçeneği sunulmaz, silme engellenir ve kullanıcıya önce o
  davranışta bir tür tanımlaması gerektiği söylenir.
- **R3.** Her ay tekrar eden giderler (kira, maaş, abonelik) için tekrarlayan gider tanımı yapılabilir.
  Tanımın **başlangıç ayı zorunlu, bitiş ayı opsiyoneldir**; bu aralığın dışındaki aylar için o tanımdan kalem
  üretilmez. Kullanıcı bir ayın tekrarlayan kalemlerini tek işlemle oluşturabilir ve oluşturduktan sonra tek
  tek düzenleyebilir. Oluşturma **yalnız kullanıcı tetiklediğinde** çalışır, kendiliğinden çalışmaz.
- **R4.** Tekrarlayan kalem oluşturma **tanım ve ay çiftine göre tekildir**: çalıştırma, o ay için kalemi
  bulunmayan tanımları ekler, kalemi olanları atlar ve sonucu kullanıcıya adetle bildirir. Bir tanımdan bir ay
  için üretilmiş kalem sonradan silinse bile o tanım o ay için yeniden üretilmez. Aynı gider iki kez kaydedilmez.
- **R5.** Personel gideri çalışan bazlı girilir; çalışan listesi firma çalışanları listesidir, ayrı bir liste
  tutulmaz. Çalışanın aylık maliyeti **iki bileşenlidir: resmi işveren maliyeti** (bordroda görünen, SGK
  dâhil) ve **elden ödenen**. İkisi ayrı tutulur ve ayrı gösterilir; gider olarak sayılan tutar ikisinin
  **toplamıdır**. Bir bileşen boş bırakılabilir, o zaman sıfır sayılır. Çalışan kaydındaki aylık maliyet
  **yalnız tekrarlayan tanımın girdisidir**; gerçek gider
  her ay ayrı kalem olarak üretilir, böylece tutar güncellendiğinde geçmiş aylar değişmez. Kalem, çalışanın
  adını kendi içinde saklar; çalışan listeden çıkarıldığında geçmiş kalemler ve tutarları değişmez. Elle
  girilen bir personel kaleminde çalışan seçildiğinde her iki bileşen, çalışan kaydındaki karşılıklarından
  **yalnız boş alana** ön doldurulur ve kullanıcı değiştirebilir. Ön doldurma **tek yönlüdür**: kalemdeki tutar çalışan
  kaydını değiştirmez, çalışan kaydının sonradan güncellenmesi de kaydedilmiş kalemleri değiştirmez. Çalışanın
  aylık maliyeti girilmemişse alan **boş bırakılır, sıfır yazılmaz.** Bir personel gideri **tek kalemdir**:
  iki bileşen aynı kalemin iki ayrı alanıdır, kalemin tutarı ikisinin toplamıdır ve doğruluk kaynağı
  bileşenlerdir. Personel davranışlı kalemde **KDV oranı alanı gösterilmez ve sıfır kabul edilir.** Aynı
  çalışan ve ay için zaten kalem varken elle ikinci bir kalem girilirse form uyarı gösterir; bu bir engel
  değildir (C17'nin dar istisnası). Bir çalışan listeden çıkarılırken ona bağlı açık tekrarlayan tanım varsa
  kullanıcıya bildirilir ve tanım **silinmez, bitiş ayı son üretilen ay yapılarak kapatılır**; böylece
  üretim izi korunur ve çalışan geri eklenirse geçmiş aylar ikinci kez üretilmez.
- **R6.** Kira giderinde stopaj takip edilir: brüt kira, stopaj oranı ve net ödenen tutar birlikte tutulur.
  Kullanıcı brüt veya net tutarlardan birini girer, sistem diğerini hesaplar; **hangisinin girildiği kayıtta
  saklanır ve kullanıcıya gösterilir.** Stopaj oranı kalem bazında girilir, varsayılanı tek bir firma ayarından
  gelir. Hesap kuralı: stopaj her zaman **KDV hariç brüt** tutar üzerinden hesaplanır, gider toplamına **brüt**
  tutar girer, indirilecek KDV **brüt** tutar üzerinden hesaplanır, fiilen ödenen nakit **brüt − stopaj + KDV**
  olur. Kesilen stopaj ayrıca raporlanır.
- **R7.** Bir gider kalemi isteğe bağlı olarak tek bir makinaya atanabilir. Atama hem Makina Stoğu'ndaki hem
  müşteriye satılmış makinalar arasından yapılabilir; stoktaki bir makinaya yapılan atama, makina satıldığında
  o satışa takip edilir. Atanmış kalem o makinanın doğrudan gideridir; atanmamış kalemler ortak giderdir.
  Atanmış olduğu makina silinirse kullanıcı silme onayında bağlı gider sayısını görür, atama kalkar ve kalem
  ortak gidere döner. *(Bu alan 0002'nin girdisidir; 0001 yalnız veriyi toplar, dağıtım veya maliyet hesabı yapmaz.)*
- **R8.** Sistem seçilen ay veya tarih aralığı için gider raporu üretir: gider türü kırılımlı toplam,
  ödenen ve ödenmeyen ayrımı, dönemde kesilen toplam kira stopajı. Rapor ayrıca **dört kovanın toplamını**
  verir: makinaya atanmış (R7), modele atanmış (R21), makina maliyetine dağıtılmayan (R20) ve ortak
  (hiçbirine girmeyen). Bunların yanında **makina bazlı toplam** ve **model bazlı toplam** (model, kaç
  makinalık adedi, makina başına düşen tutar) da döndürülür; 0002 bu rakamları yeniden hesaplamaz, bu çıktıyı
  tüketir. Aynı tanımdan aynı ayda birden fazla kalem bulunuyorsa rapor bunu uyarı olarak gösterir.
- **R9.** Sistem aynı dönem için satışlardan hesaplanan KDV ile giderlerden indirilecek KDV'yi
  karşılaştırıp farkı gösterir. İndirilecek KDV, kalemin ödenmiş olup olmamasından **bağımsız** olarak gider
  tarihine göre sayılır. Karşılaştırma ay bazlıdır; tam ayları kapsamayan bir aralık seçildiğinde karşılaştırma
  **gizlenmez**, yerinde kalır ve neden rakam üretilemediğini seçili aralığı anarak yazıyla açıklar. Gizleme
  yalnız yetkisizlik anlamına gelir (R11, AC-30).
- **R10.** Kullanıcı gider takibinin hangi aydan itibaren geçerli olduğunu belirtir; **belirtilen ay dahildir.**
  Bu aydan önceki dönemler için rapor rakam üretmez, "gider verisi girilmemiş" bilgisini gösterir. Eşiği kesen
  bir tarih aralığı seçildiğinde rapor üretilir ve aralığın kapsam dışı kalan kısmı yazıyla belirtilir. Eşik
  sonradan ileri alındığında mevcut kalemler silinmez, yalnız raporda görünmez; ayar ekranı eşiğin altında kalan
  kalem sayısını uyarı olarak gösterir.
- **R11.** Gider verisi yalnız yetkisi olan kullanıcılara gösterilir. Gider verisinden **türeyen** rakamlar da
  (KDV karşılaştırması dâhil) aynı yetkiye bağlıdır ve yetkisiz kullanıcının ekranında hiç çizilmez.
- **R12.** Silinen gider kaydı çöp kutusuna düşer ve geri alınabilir; geri alındığında dönem raporlarına
  yeniden dahil olur. Gider **türü**, **tekrarlayan gider tanımı**, **tedarikçi** ve **aylık standart genel
  gider kalemi** (R22) silme çöp kutusuna düşmez, kalıcıdır; koruma R2'nin ve R13'ün kullanımda olan kayıt
  kurallarıyla sağlanır.
- **R13.** Kullanıcı tedarikçi kaydedebilir, düzenleyebilir ve silebilir. Bir tedarikçide **ad zorunludur**;
  yetkili kişi, telefon, e-posta, vergi dairesi ve numarası, adres ve not opsiyoneldir. Bir gider kaleminde
  kullanılmakta olan tedarikçi silinemez; kullanıcıya kaç kalemde kullanıldığı bildirilir. **Çöp kutusundaki
  kalemler de kullanımda sayılır** (gider türünde olduğu gibi), yoksa geri alınan kalemin tedarikçi bağı
  kopardı. **Tedarikçi adı benzersizdir**; karşılaştırma Türkçe büyük ve küçük harf duyarsızdır, aynı ad
  ikinci kez girilirse kayıt yapılmaz ve nedeni söylenir. Tedarikçi adı değiştirildiğinde geçmiş kalemler
  yeni adla görünür. **Tedarikçi yönetimi Giderler sekmesi içinde yapılır, Ayarlar altında değildir**;
  aksi halde `settings` izni olan ama gider yetkisi olmayan bir kullanıcı listeyi görür ve AC-48 kırılır.
- **R14.** Gider kaleminde tedarikçi seçimi opsiyoneldir. **"Ödenecek tutar" terimi** bu spec'te tek anlam
  taşır: normal kalemde *tutar artı KDV*, kira davranışlı kalemde *brüt eksi stopaj artı KDV* (yani net kira
  artı KDV). Kesilen stopaj tedarikçiye değil vergi dairesine gittiği için hiçbir zaman ödenecek tutara
  girmez; kira kaleminin brüt veya net girilmiş olması sonucu değiştirmez. Personel davranışlı kalemde
  ödenecek tutar, iki bileşenin **toplamıdır** (KDV ve stopaj yoktur).
  Rapor **tedarikçi kırılımı** üretir: her tedarikçi için seçili dönemin **harcama tutarı** (KDV hariç) ve
  **açık borç** (KDV dâhil ödenecek tutar toplamı). Açık borç **seçili dönemden bağımsızdır**: yürürlük
  ayından bugüne kadarki tüm ödenmemiş kalemleri kapsar ve sütun başlığında bu belirtilir. Rakamların
  etiketleri farkı söyler: "Ödenmemiş gider (KDV hariç)" ve "Tedarikçilere açık borç (KDV dâhil)".
  **Personel davranışlı kalemler tedarikçi kırılımına girmez** ve bu kalemlerde tedarikçi alanı gösterilmez;
  çalışan tedarikçi değildir ve maaş toplamının bu kırılımda belirmesi hem anlamsız hem de C7b'ye aykırıdır.
- **R15.** Tedarikçisi seçilmemiş kalemler (personel kalemleri hariç, bkz. R14) rapordan düşmez; tedarikçi
  kırılımında ayrı bir "tedarikçi seçilmemiş" grubunda toplanır. Hiçbir kalemde tedarikçi seçilmemişse
  kırılım boş durum mesajı göstermez, yalnız bu grubu gösterir.
- **R16.** Firma ayarlarında tek bir **varsayılan resmi aylık işveren maliyeti** tutulur. Yeni çalışan
  tanımlanırken resmi bileşen bu değerle ön doldurulur, çalışan bazında serbestçe değiştirilebilir. Bu
  varsayılanın sonradan değişmesi, tanımlı çalışanların kayıtlı tutarlarını ve üretilmiş kalemleri
  **değiştirmez.** Alanın kendisi de gider yetkisine bağlıdır: gider yetkisi olmayan kullanıcı Ayarlar'da
  bu değeri görmez.
- **R17.** Dönem raporunda personel gideri, **çalışan bazlı ayrıntısı varsayılan olarak kapalı** biçimde
  görünür; satır açıldığında her çalışanın resmi ve elden bileşenleri ayrı ayrı listelenir. Bu kural
  gizlilik içindir, toplama biçimi değildir: gider türü kırılımı normal çalışmaya devam eder ve personel
  davranışlı her tür kendi satırında görünür (AC-12 bozulmaz).
- **R18.** Vade için **tek bir alan** vardır: son ödeme tarihi. Ödeme yöntemi **Çek** seçildiğinde bu alanın
  etiketi "Çek vade tarihi" olur; ikinci bir alan açılmaz ve yöntem değiştiğinde girilmiş tarih **boşlanmaz.**
  **Son ödeme tarihi, gider tarihinden önce olamaz.**
- **R19.** Sistem "kime ne kadar borçluyuz" özeti üretir ve iki kaynağı **tek listede** toplar: tedarikçi
  bazlı açık borç (R14) ve ödenmemiş personel kalemlerinden doğan **çalışan bazlı borç**. Her satır borcun
  kime ait olduğunu ve kaynağını (tedarikçi / çalışan) gösterir; **personel borcu isim isim listelenmez,
  tek satırda toplanır** ("Çalışanlar · N kişi · toplam X TL") ve yalnız satır açıldığında çalışan adları ile
  tutarları görünür (R17 ile aynı koruma). Özet gider yetkisine ve C7b'nin gizlilik kuralına tabidir.
  Özet **seçili dönemden bağımsızdır** (R14 ile aynı kural) ve bu başlıkta belirtilir. Açık borcu sıfıra inen
  taraf, tedarikçi de olsa çalışan da olsa özet listesinden düşer; tedarikçi harcama kırılımında görünmeye
  devam eder. Ödenmemiş bir satırın **son ödeme tarihi bugünden önceyse** satır "vadesi geçti" olarak
  işaretlenir; bu salt görsel bir işarettir, hatırlatma ve bildirim 0003'ün konusudur. Özet **Giderler
  sekmesi içinde**, dönem raporunun yanında durur; Anasayfa'ya kart konmaz.
- **R20.** Bir gider kalemi **"makina maliyetine dağıtılmasın"** olarak işaretlenebilir. İşaretli kalem
  gider raporunda ve borç özetinde normal görünür, ancak 0002'nin hiçbir dağıtımına girmez ve hiçbir
  makinanın maliyetine yazılmaz. Dönem raporunda bu kalemler **ayrı bir toplam** olarak gösterilir.
  Kullanım amacı: satılmak üzere alınan mal (yedek parça stoğuna giren alımlar) gibi, üretim gideri
  olmayan harcamalar.
- **R21.** Bir gider kalemi, tek bir makina yerine **bir veya birden çok makina modeline** dağıtılabilir.
  Kalem içinde her model için bir satır girilir: **model, makina başına birim maliyet ve adet**. Adet
  sıfırdan büyük olmak zorundadır ve bir modelden yalnız bir satır olabilir. Satır toplamı **birim maliyet ×
  adet**'tir; bu bir gösterim rakamıdır, kullanıcı birim maliyeti kendisi girer. Makina ataması (R7), model
  dağılımı (R21) ve dağıtılmama işareti (R20) **birbirini dışlar**: bir kalemde yalnız biri seçilebilir,
  hiçbiri seçilmezse kalem ortak giderdir. Model dağılımının **kısmi olması bu kuralın istisnası değildir**:
  dağıtılmayan kısım tanım gereği ortak giderdir. Bu üç alan yalnız **normal davranışlı** kalemlerde
  gösterilir; kira ve personel kalemleri her zaman ortak giderdir. Dağıtım kuralı 0002'nin konusudur; 0001
  yalnız model, birim maliyet ve adet bilgisini toplar.
  **Toplam kontrolü:** satırların toplamı kalemin KDV hariç tutarına eşit değilse kullanıcıya fark gösterilir.
  **Eksik kalması serbesttir** ve uyarıdır, engel değildir: bir faturanın bir kısmı modellere dağıtılıp kalanı
  boş bırakılabilir, dağıtılmayan kısım ortak gider sayılır. **Aşım ise engellenir**: satır toplamı kalemin
  tutarını geçerse kalem kaydedilmez, çünkü aşan tutarın karşılığı yoktur ve kova toplamlarını bozar.
  **Model bağı ad ile tutulur** (bu uygulamada modellerin kimliği yoktur, ad ile yaşarlar): model yeniden
  adlandırıldığında mevcut yeniden adlandırma zinciri gider kalemlerini de taşır, model silindiğinde bağlı
  kalemler ortak gidere döner ve kullanıcı silme onayında bağlı gider sayısını görür (R7'nin makina silme
  deseninin aynısı). **Adet, alım anındaki niyettir**: o modelden gerçekte kaç makina üretildiğiyle otomatik
  eşleşmez ve sonradan kendiliğinden güncellenmez; artan veya eksik kalanın nasıl ele alınacağı 0002'nin
  konusudur. 0002 kendi dağıtımında bu satırları olduğu gibi kullanmak zorunda değildir. Tekrarlayan gider
  tanımı da bu üç alternatiften birini taşıyabilir ve ürettiği kaleme kopyalar.
- **R22.** Kullanıcı, maliyet hesabında kullanılmak üzere **aylık standart genel gider tutarları**
  tanımlayabilir: ad, aylık tutar ve **geçerlilik başlangıç ayından** oluşan bir liste (kira, elektrik,
  maaşlar gibi). Tutar değiştiğinde mevcut satırın üzerine yazılmaz; **yeni bir satır eklenir ve eskisi
  kapatılır**, böylece geçmiş dönemler kendi dönemlerinin rakamıyla hesaplanır. Tutarlar **KDV hariç** ve
  **TL**'dir (C1, C2 ile aynı kural).
  Bu liste **bütçe ve varsayım** rakamıdır; tekrarlayan gider tanımı (R3) ise **fiili** kaydı üretir. İkisi
  arasında otomatik bağ kurulmaz ve ad benzerliği bir bağ anlamına gelmez. Liste gerçekleşen gider
  kayıtlarından bağımsızdır, dönem gider raporunun hiçbir toplamına girmez ve yalnız 0002'nin maliyet
  hesabına kaynaklık eder; hangi kaynağın (gerçekleşen / standart) kullanılacağı 0002'nin konusudur.
  Liste **Giderler sekmesi içinde** yaşar (Ayarlar'da değil, tedarikçiyle aynı gerekçe: R13) ve ekranında
  kalıcı bir açıklama satırı bulunur: "Bu tutarlar maliyet hesabı içindir, dönem gider raporuna girmez."

---

## Constraints

### Uyulması zorunlu

- **C1.** Maliyet ve gider toplamlarına **KDV hariç** tutar girer. KDV indirilebilir bir tutardır, gider değildir.
- **C2.** Gider tutarları TL'dir.
- **C3.** Hesaplar arayüzden bağımsız saf motorda yapılır ve kendi testiyle gelir.
- **C4.** Gider kaleminin KDV oranı **kalem bazında girilir**; alan, kalemin tarihinde geçerli olan dönemsel
  orandan ön doldurulur ve kullanıcı değiştirebilir. Gider tarafı için **ayrı bir dönemsel oran listesi
  tanımlanmaz**; ön doldurma uygulamanın mevcut dönemsel KDV oranı kaynağını kullanır.
- **C5.** Bu veri yeni kalıcı veri sınıfıdır: kolon kuralı, yedekleme, çoklu kullanıcı birleştirmesi,
  çöp kutusu ve sunucu yetki eşlemesi birlikte kurulur.
- **C6.** Gider görünürlüğü için **yeni bir izin boyutu** tanımlanır (mevcut `financeActions` bugün yalnız salt
  okunur ekran eylemlerini kapsıyor ve hiçbir veri bölümüne bağlı değil; gider ise finans tarafında yazılabilen
  ilk veridir). Varsayılanın kapalı olması bu kod tabanında üç parçalı kuralla sağlanır:
  1. Yerel modda ve sunucu PC'sinde gider **her zaman açıktır**; orada kullanıcı ayrımı yoktur (bkz. C7).
  2. LAN'da sekme listesi tanımlı kullanıcılar gider sekmesini listelerinde olmadığı için görmez.
  3. Sekme listesi **tanımsız** olan `user` rolü için tek istisna kodlanır: bu uygulamadaki "tanımsız = serbest"
     kuralının aksine gider sekmesi yalnız **açıkça verildiğinde** görünür. Bu istisna testle sabitlenir.

  Boyutun içi tek parça değildir: **kalem ekleme, düzenleme ve silme**, **tanım yönetimi** (gider türü,
  tekrarlayan tanım, gider ayarları) ve **tedarikçi yönetimi** ayrı ayrı yetkilendirilebilir. Eylem
  kimliklerinin adlandırması uygulama planına aittir.
- **C7.** **Kabul edilen sınır:** bu uygulamada sunucu veriyi kullanıcıya göre süzmüyor, yalnız yazmayı
  denetliyor. Sekmenin gizlenmesi gider verisini görsel olarak gizler, teknik olarak gizlemez. Aynı şekilde
  yerel (tek kullanıcı) modda izin kavramı yoktur, gider verisi o PC'yi açan herkese görünür. İkisi de bilinerek
  kabul edilmiştir; gerçek veri gizliliği ayrı bir iştir.
- **C7b.** **Kabul edilen sınır (personel verisi).** R5'in elden ödenen bileşeni, uygulamadaki en hassas
  veridir ve C7'nin sınırları ona da aynen uygulanır: oturum açmış her istemci veri blob'unun tamamını
  indirir, yedek dosyaları düz JSON'dur. Bu veri hiçbir yazdırma çıktısına ve hiçbir dışa aktarma dosyasına
  girmez (X14, X16). `giderActions` izninin varsayılanı kapalıdır ve öyle kalır.
  **Yazma tarafı da aynı sınıra tabidir:** çalışan maliyeti alanları çalışan listesiyle birlikte saklandığı
  için, sunucuda `settings` yazma izni olan kısıtlı bir kullanıcı bu alanları yazabilir. Alan bazlı sunucu
  denetimi bu mimaride yalnız birkaç alan için var ve gider için kurmak orantısız olurdu; bu da bilinerek
  kabul edilmiştir. Arayüzde alan gider yetkisine bağlıdır.
- **C8.** Kullanıcıya görünen tüm metinler Türkçedir.
- **C9.** **Dönem esası tahakkuktur:** her toplam, kalemin **gider tarihine** göre raporlanır (stopaj toplamı
  dâhil). Ödeme tarihi yalnız bilgi ve ödendi/ödenmedi ayrımı içindir, hiçbir toplamın dönemini belirlemez.
- **C10.** Satışlardan hesaplanan KDV rakamı bu iş kapsamında **yeniden hesaplanmaz**: aylık rapor motorunun
  ürettiği KDV değeri tek kaynaktır ve gider motoruna girdi olarak verilir. Finans ekranı ile gider ekranının
  aynı dönem için aynı hesaplanan KDV rakamını verdiği testle gösterilir.
- **C11.** Gider kalemi türe **kimlikle** bağlanır, adla değil. Yeniden adlandırma kalemlere otomatik yansır,
  "kullanımda mı" denetimi kimlik üzerinden yapılır.
- **C12.** Saklama biçimi: gider kalemleri, tekrarlayan gider tanımları, **tedarikçiler** (R13) ve **aylık
  standart genel gider listesi** (R22) kimlikli, çoklu kullanıcı birleştirmesine dâhil edilen ayrı veri
  toplulukları olarak durur. Gider türleri, projedeki küçük tanım listesi desenini izler. **Model dağılım
  satırları** (R21) ayrı bir topluluk değil, kalemin **alt kaydıdır**: kalemle birlikte yazılır, silinir ve
  birleştirilir (bu projedeki ana kayıt artı alt tablo deseni).
- **C13.** Gider ekleme, düzenleme ve silme işlemleri işlem geçmişine yazılır ve etiketleri tanımlanır
  (tanımsız etiket ekranda ham anahtar olarak görünür).
- **C14.** Gider ekranı **kendi üst sekmesidir**, Finans'ın alt sekmesi değildir; aksi halde R11'in gizlemesi
  ya tüm Finans'ı gizler ya da gizlemeyi imkânsız kılar.
- **C15.** **Kabul edilen sınır:** gider kaydında eş zamanlı düzenleme kilidi yoktur. Kilit alanları çok
  ekrandan ulaşılan kayıtlar için kurulmuştu; gider kalemi tek ekrandan girilir.
- **C16.** **Kabul edilen sınır:** tekrarlayan kalem tekilliği (R4) istemcide korunur. İki kullanıcı aynı ayı
  aynı anda oluşturursa mükerrer kalem oluşabilir; bu durum R8'in uyarısıyla görünür kılınır, teknik bir
  tekillik kısıtı sözü verilmez (yazma bütün veri bloğunu gönderir ve birleştirme eklenen kayıtları korur).
- **C17.** **Kabul edilen sınır:** elle girilen mükerrer kalem için uyarı yoktur; mükerrer koruması yalnız
  tekrarlayan tanımlardan üretilen kalemler içindir. **Tek istisna personel kalemidir** (R5): orada doğal bir
  anahtar (çalışan artı ay) bulunduğu ve tutar en yüksek kalem olduğu için uyarı gösterilir, yine de
  engellenmez.
- **C18.** **Kabul edilen sınır:** Makina Stoğu'ndaki bir makinaya atanmış gider, makina **seri numarası elle girilerek**
  satılırsa satışa takip edilmez (kodda bu yolda kaynak stok bağı yazılmıyor) ve ortak gidere düşer. Stoktan seçilerek yapılan
  satışta takip çalışır (R7). Satış akışını değiştirmek bu spec'in kapsamı dışıdır.
- **C19.** **Çifte sayım yasağı.** Çalışan başına girilen resmi işveren maliyeti, SGK ve işsizlik
  primlerini **içerir** (bkz. Context, 2026 rakamı). Bu yüzden SGK'ya yapılan prim ödemesi ve çalışana
  yapılan maaş transferi **ayrıca gider kalemi olarak girilmez**; girilirse aynı para iki kez sayılır ve
  makina maliyeti (0002) şişer. Gider kaleminde personel davranışlı bir tür seçildiğinde kullanıcıya bu
  hatırlatılır: form açık olduğu sürece görünen, kapatılamayan bir satır içi not olarak. Ayrı bir onay
  diyaloğu kurulmaz (AC-58 zaten engel olmadığını söylüyor).

### KAPSAM DIŞI

- **X1.** Makina maliyeti ve kârlılık hesabı — *neden:* 0002'nin konusu; dağıtım kuralı ayrı bir karardır.
- **X2.** Parça alış maliyeti ve stok değerleme — *neden:* karar verildi, v1'de alış fiyatı toplanmayacak;
  geriye dönük alış fiyatı da yok.
- **X3.** Beyanname, muhtasar, e-fatura veya e-defter üretimi ve entegrasyonu — *neden:* mali müşavirin işi;
  uygulama takip eder, beyan etmez.
- **X4.** Tam cari hesap: açılış bakiyesi, tedarikçi ekstresi, kalemden bağımsız toplu ödeme kaydı ve bir
  ödemenin birden çok faturaya dağıtılması, kasa ve banka hesapları, mutabakat — *neden:* kullanıcı
  tedarikçilerine fatura fatura ödüyor, dolayısıyla "bu tedarikçiye ne kadar borcumuz var" sorusu kalem
  bazlı ödeme durumundan türetilebiliyor (R14). Defter kurmak, bu soruyu cevaplamak için gerekmiyor.
  Ödeme biçimi toplu ödemeye kayarsa bu karar kendi spec'iyle yeniden açılır (0004, henüz yazılmadı).
- **X5.** Bordro kırılımı (brüt, net, SGK, gelir vergisi) — *neden:* çalışan başına tek işveren maliyeti
  rakamı kararlaştırıldı.
- **X6.** Kira dışındaki stopaj türleri — *neden:* kullanıcı yalnız kira stopajı takip ediyor.
- **X7.** TL dışı para biriminde gider — *neden:* tedarikçilerin tamamı yurt içi ve giderler TL
  (23.09.2026 teyidi); döviz gideri ayrı bir kur kuralı ister ve bugün karşılığı olmayan bir ihtiyaçtır.
- **X8.** Servis, Extra Kalıp ve yedek parça kârlılığı — *neden:* v1 yalnız makina tarafına bakıyor.
- **X9.** Gider kalemine fatura görüntüsü veya belge eklenmesi — *neden:* dosya arşivi ayrı bir mekanizma;
  ihtiyaç doğarsa kendi spec'iyle bağlanır.
- **X10.** Kısmi ödeme — *neden:* ödeme durumu v1'de ikili (ödendi / ödenmedi). Kısmi ödeme cari hesap ister,
  X4 ile aynı sebeple dışarıda. **Sonucu bilerek kabul ediliyor:** yarısı ödenmiş bir fatura açık borçta
  tam tutarıyla görünür (R14).
- **X11.** Negatif gider kalemi, gider iadesi ve alacak notu — *neden:* v1'de düzeltme, kalemin kendisi
  düzenlenerek yapılır; iade akışı ayrı bir muhasebe kavramıdır.
- **X12.** Ay ortasında işe giriş veya çıkışta kıst personel maliyeti — *neden:* kullanıcı o ayın kalemini elle
  düzeltir; AC-9 bunu zaten mümkün kılıyor.
- **X13.** Bir gider kaleminin birden fazla **makinaya** (belirli seri numaralarına) bölünmesi — *neden:*
  R7 tek makina atamasıdır. **Model düzeyinde bölme artık mümkündür** (R21): bir kalem birden çok modele,
  her biri için ayrı birim maliyet ve adetle dağıtılabilir. Belirli makinalara bölmek isteyen kullanıcı
  kalemi birkaç satır hâlinde girer.
- **X14.** Gider raporunun kendi yazdırma çıktısı ve Aylık Faaliyet Raporu'na gider bölümü eklenmesi —
  *neden:* rapor şablonu 0002'nin kârlılık bölümüyle birlikte tek seferde değişmeli; aynı dosyayı iki ayrı işte
  değiştirmek gereksiz çakışma üretir. **Personel kırılımı için bu karar kalıcıdır:** ileride gider bölümü
  eklense bile çalışan bazlı tutarlar ve elden bileşen hiçbir yazdırma çıktısına girmez (C7b).
- **X15.** Servisteki "dış tedarik" parçaların otomatik olarak gider kalemine dönüşmesi — *neden:* bunlar
  bugün servis kaydının içinde yaşıyor (`ServiceForm.jsx:56-60`) ve gider olarak kaydedilmiyor. Bağlamak,
  servis formunu ve stok düşümünü etkiler; önce gider modülü gerçek kullanımda otursun. Kullanıcı isterse
  bu harcamayı elle gider kalemi olarak girebilir.
- **X16.** Gider verisinin CSV ve XLSX dışa aktarımı — **personel kırılımı için kalıcı olarak** (C7b),
  diğer gider verisi için şimdilik — *neden:* bu projede dışa aktarma sütunları elle seçilmiş
  listelerdir; v1'de ekrandaki dönem raporu yeterli. (JSON yedekleme bütün nesneyi taşıdığı için veri yine de
  yedeklenir.)
- **X17.** Kıdem tazminatı karşılığı, yemek ve yol istisnası hesabı, personel devir (turnover) maliyeti
  gibi hesaplanmış kalemlerin uygulama tarafından otomatik üretilmesi — *neden:* bunlar nakit çıkışı değil,
  muhasebe karşılığıdır; otomatik üretmek bordro mantığı ister ve "bu ay ne harcadık" rakamını bulanıklaştırır.
  Kullanıcı isterse bunları kendi gider türü olarak elle girer, o yol açıktır.
- **X18.** Kredi kartıyla ödenen giderde banka komisyonunun takibi — *neden:* satış tarafındaki komisyon
  yansıtma modeli gider tarafına uygulanmaz; gider kartla ödendiğinde komisyonu satıcı öder, bizi bağlamaz.
- **X19.** Ödeme hatırlatıcısı, vade bildirimi ve uyarı akışı — *neden:* **0003**'ün konusu. 0001 yalnız
  vadeyi toplar ve borç özetinde "vadesi geçti" işaretini gösterir (R19), bildirim üretmez.
- **X20.** Personel avansı ve çalışan cari hesabı — *neden:* **0004**'ün konusu (kasa, avans ve cari ile
  birlikte; spec henüz yazılmadı). 0001'de personel borcu yalnız ödenmemiş kalemden türer.
- **X21.** Çalışan mesai ve fazla mesai takibi — *neden:* **0005**'in konusu (spec henüz yazılmadı).
  0001 çalışan başına aylık tek maliyet rakamı tutar (X5 ile aynı ilke).

---

## Context

Kodda doğrulanmış mevcut durum:

- **Uygulamada hiç gider kavramı yok.** "Gider" kelimesinin geçtiği tek yer kredi kartı banka komisyonudur
  (`src/components/Finance.jsx:617-621`, aylık raporda "Gider · POS kesintisi",
  `src/lib/printTemplates.js:1823`). Dışarı çıkan ödeme, gider kategorisi veya gider kalemi yoktur.
  `payments` tablosu yalnız müşteriden gelen tahsilattır (`electron/db.cjs`).
- **Personel maliyeti rakamı dışarıdan gelir, uygulama hesaplamaz.** Türkiye'de bir çalışanın işverene
  maliyeti brüt ücret artı SGK işveren payı artı işsizlik işveren payıdır ve oranlar her yıl değişir.
  2026 için asgari ücret brüt 33.030,00 TL; imalat sektöründeki 5 puanlık indirimle işverene aylık
  maliyeti **39.223,13 TL** (teşviksiz 40.874,63; imalat dışı 2 puanla 40.214,03). Altuntaş imalatçı
  olduğu için geçerli olan 39.223,13'tür ve R16'daki varsayılan bu amaçla kullanılır. **Bu rakam spec'e
  veya koda gömülmez**, yalnız kullanıcının hangi değeri gireceğini açıklar; her yıl değişir ve teşvik
  şartları (doğru NACE kodu, prim borcu bulunmaması) bozulursa yükselir. Asgari ücretten gösterilen bir
  çalışanda gelir ve damga vergisi istisnası nedeniyle bu tutar yıl boyunca sabittir; bu, R5'in çalışan
  başına tek tutar tutmasını doğrular. Asgari ücretin üstünden gösterilen bir çalışanda tutar yıl içinde
  değişebilir, kullanıcı o kalemi elle günceller.
- **Bağkur ve SGK gibi düzenli resmi ödemeler normal türdür.** Şirket sahibinin Bağkur primi (4/b) bir
  işletme giderdir ve *normal* davranışlı bir gider türü artı tekrarlayan tanımla girilir (KDV oranı 0).
  Personel davranışı **yalnız çalışanlar** içindir: sahibi çalışan listesinde değildir ve personel
  kırılımına karışırsa "çalışanlarımıza ne ödüyoruz" rakamı bozulur. Bağkur makinaya atanmamış bir ortak
  giderdir, dolayısıyla 0002'de makina maliyetine dağıtılır.
- **Toplu alımlar tek kalem değildir.** Bir faturada alınan malın bir kısmı makinalara, bir kısmı yedek
  parça stoğuna gidebilir (kullanıcının örneği: 100 bandın 70'i makinalara, 30'u yedek parçaya). Böyle bir
  fatura **iki ayrı gider kalemi** olarak girilir: makinalara giden kısım (gerekirse modele atanmış, R21),
  stoğa giden kısım (R20 işaretiyle). Sistem bir kalemi kendi bölmez; iki satır girmek aynı sonucu verir
  ve kuralı basit tutar. Fatura numarası her iki kalemin açıklamasına yazılarak ikisi ilişkilendirilir.
- **R21 ve R22'nin kaynağı müşterinin kendi maliyet tablosudur.** Takım Yöneticisi 23.09.2026'da
  `MASRAFLAR.xlsx` dosyasını paylaştı. Tabloda iki ayrı yapı vardı: (1) bir alımın makina **modellerine**
  dağıtıldığı satırlar (model, makina başına birim maliyet, adet) — R21'in çok satırlı hâli buradan geliyor;
  (2) aylık sabit giderlerin (kira, elektrik, maaşlar) ad ve tutar olarak tutulduğu ayrı bir liste — R22
  buradan geliyor. Tabloda tutarlar KDV hariç ve TL idi, bir geçerlilik tarihi taşımıyorlardı; R22'nin
  geçerlilik ayı bu eksiği kapatmak için eklendi. Dosya uygulamaya aktarılmıyor, yalnız gereksinimin
  kaynağıdır.
- **Tedarikçi kavramı da yok.** Uygulamadaki firma kayıtları satış tarafındadır: müşteriler ve bayiler.
  Bayi bir satış kanalıdır, tedarikçi değildir; ikisini aynı listede toplamak bayi raporlarını bozar.
  Servis kayıtlarında "dış tedarik" işareti var (`src/components/ServiceForm.jsx:56-60`) ama o, parçanın
  Altuntaş'tan alınmadığını söyleyen bir bayraktır; kimden alındığı tutulmaz (X15).
- **Tedarikçilerin tamamı yurt içidir.** Takım Yöneticisi 23.09.2026'da teyit etti: yurt dışı tedarikçi
  yok. Bu yüzden gider ve tedarikçi tarafında döviz kuralı gerekmiyor ve X7 (gider yalnız TL) geçerli
  kalıyor. Bu bir varsayım değil, alınmış karardır; ileride yurt dışı tedarikçi girerse spec revize edilir.
- **KDV tek yönlüdür.** Satışlardan hesaplanan KDV dönemsel oranlarla hesaplanıyor
  (`appSettings.kdvRates`, `getKdvRateForDate` — `src/lib/utils.js:291`). İndirilecek KDV kavramı yok,
  dolayısıyla Finans'taki "Ödenmesi Muhtemel KDV" bugün brüt bir rakamdır. R9 bu rakamın yanına
  karşılaştırmayı koyar; kartın kendisinin anlamı değişiyorsa bu PR'da açıkça yazılmalıdır.
- **Hesaplanan KDV'nin saf kaynağı aylık rapor motorudur.** Finans'ın "Ödenmesi Muhtemel KDV" hesabı
  `Finance.jsx:126-231` içinde, React bileşeninin içinde durur ve dışarıdan çağrılamaz; `aylikRapor.js`
  (`hesaplaAylikRapor`) aynı kuralları saf biçimde uygular ve KDV kalemlerini döndürür. C10'un gerekçesi budur.
  Yalnız **Faturalı Yurtiçi** satışta KDV doğar (`calcKDV`, `src/lib/utils.js:363`), yani yurtdışı satış sıfır
  KDV üretir; TL dışı hesaplanan KDV ancak Faturalı Yurtiçi bir satış dövizle kaydedildiğinde oluşur (AC-15).
- **Çalışan kaydı yalnız isimdir** (`calisanlar` = `{id, ad}`, meta-JSON deseniyle saklanıyor,
  `src/components/CalisanManager.jsx`). Maaş veya maliyet alanı yok. R5 bu listeye maliyet bağlar ve
  `services.tech` gibi kalemde adı kopya tutar.
- **Makina tarafında maliyet yok.** Müşteri kaydındaki `faturaBedeli`, `fabrikaSatisBedeli`, `komisyon`
  gelir tarafıdır. Stoktaki makinanın parça kiti var (`stock.parcalar`, üretimde stoktan düşüyor,
  hareket tipi `makina_uretimi` — `src/components/stock/MakinaStokTab.jsx:57`) ama parçaların alış
  maliyeti tutulmuyor: `parts` tablosundaki `fiyatTRY/USD/EUR` satış fiyatıdır, stok girişinde
  (`stok_girisi`) fiyat alanı yoktur. X2'nin gerekçesi budur.
- **Stoktan müşteriye geçen makinanın izi mevcuttur.** Satışta müşteri kaydına kaynak stok satırı yazılıyor
  (`sourceStockId`, `src/components/Customers.jsx:244-256`; çöp kutusu geri alma da bu bağı kullanıyor,
  `SettingsTrash.jsx:51`). R7'nin "stoktaki makinaya atanan gider satışa takip edilir" kuralı bu bağa dayanır.
- **İzin modeli "tanımsız = serbest" çalışır.** `makeCanDo` izin listesi yoksa her eyleme izin veriyor
  (`src/lib/permissions.js:21`); sekme filtresi yerel modda ve sunucu PC'sinde tüm sekmeleri açıyor, `tabs`
  dizisi tanımsızsa yine tüm sekmeleri açıyor (`src/App.jsx:139-147`). C6'nın üç parçalı kuralı bu yüzden
  gerekli: genel kuralı tersine çevirmek mevcut kullanıcıları kırar.
- **İzin boyutları** `tabs, settings, customerActions, dealerActions, stockActions, evrakActions,
  notActions, financeActions` (`src/components/settings/serverPermissionDefs.js`). `financeActions` bugün
  yalnız arayüz eylemlerini (tarih aralığı pilleri, rapor) kapsıyor; sunucudaki `SECTION_GROUP` haritasında ona
  bağlı **hiçbir veri bölümü yok** (`electron/serverAuth.cjs`), çünkü Finans salt okunur. Gider, finans
  tarafında yazılabilir ilk veri olacak; bölüm eşlemesi bu yüzden yeni kurulacak ve `BOLUM_SEKMELERI` en az
  gider sekmesini ve `settings`'i içermelidir (tür tanımları Ayarlar'dan yazılıyor).
- **Tanım listeleri deseni.** Kalıp modelleri, parça tipleri ve çalışanlar gibi küçük tanım listeleri
  Ayarlar > Katalog altında yaşıyor ve meta-JSON olarak saklanıyor (`electron/db.cjs:710`). C12'deki gider türü
  bu desenin adayıdır; kimlikli ve düzenlenen tekrarlayan tanımlar ise kendi veri topluluğu olmalıdır.
- **Çöp kutusu deseni.** Soft-delete `deletedAt` damgasıyla yapılıyor, geri alma ve kalıcı silme
  `SettingsTrash.jsx` üzerinden yürüyor. R12 bu desene uyar.

Bilinen tuzaklar:

- **Sessiz veri kaybı riski.** Bu projede yeni bir alan dört yere birden eklenmezse (`SCHEMA_SQL`,
  `applyColumnMigrations`, `INSERT`, `SELECT`) değer sessizce kaybolur; yeni bir veri dizisi
  `MERGE_KEYS` ve `mergeLocalIntoReloaded`'a eklenmezse çoklu kullanıcıda eklenen kayıtlar kaybolur
  (`calisanlar` tam olarak böyle kayboldu). İkisi de daha önce yaşandı.
- **Aynı rakamın iki kaynağı.** KDV karşılaştırması Finans ve aylık raporla aynı KDV kaynağını
  kullanmalı; bu projede Finans ile raporun ayrışması iki kez hata oldu. C10 bunu bağlar.
- **Stopajda yön karışıklığı.** Kira sözleşmeleri kimi zaman brüt, kimi zaman net konuşulur. Hangi
  tutarın girildiği kayıtta belli olmazsa rakam sonradan doğrulanamaz. R6 giriş yönünü saklatarak kapatır.
- **Ekran açılıyor ama kaydetme 403 veriyor.** Yeni bölüm `BOLUM_SEKMELERI`'ye yazılmazsa kısıtlı kullanıcıda
  bu yaşanır (servis kiosk kullanıcısında yaşandı).

---

## Acceptance Criteria

- **AC-1.** Tarihi, türü ve KDV hariç tutarı girilen bir gider kalemi kaydedilir ve o tarihin ayına ait
  gider raporunda görünür.
- **AC-2.** Türü seçilmemiş, tutarı sıfır ya da negatif olan veya tutar alanına sayıya çevrilemeyen bir metin
  girilmiş kalem kaydedilmez; kullanıcıya nedenini söyleyen bir uyarı gösterilir. Personel kaleminde bu
  denetim **bileşenlerin toplamı** üzerinden çalışır: toplam sıfırdan büyükse kalem kaydedilir, negatif
  bileşen reddedilir.
- **AC-3.** KDV hariç 10.000 TL ve %20 KDV oranı girilen bir kalemde KDV tutarı 2.000 TL, toplam ödenecek
  tutar 12.000 TL olarak gösterilir; gider toplamına 10.000 TL girer.
- **AC-4.** Brüt 20.000 TL kira ve %20 stopaj girildiğinde stopaj 4.000 TL, net ödenen 16.000 TL hesaplanır;
  gider toplamına 20.000 TL girer.
- **AC-5.** Net ödenen 16.000 TL ve %20 stopaj girildiğinde brüt 20.000 TL, stopaj 4.000 TL hesaplanır.
- **AC-6.** Stopaj oranı sıfır girilen kira kaleminde net ve brüt tutar eşittir; kalem stopaj raporunda satır
  olarak görünür, stopaj tutarı 0 TL yazar ve dönem stopaj toplamına 0 ekler. Satır listeden düşürülmez.
- **AC-7.** Tekrarlayan gider tanımı olan bir ay için oluşturma çalıştırıldığında, o ay aralığına giren her
  tanımdan o aya bir kez kalem eklenir.
- **AC-8.** Aynı ay için oluşturma ikinci kez çalıştırıldığında, o ay için kalemi bulunan tanımlardan yeni kalem
  eklenmez ve kullanıcıya kaç kalemin zaten var olduğu bildirilir.
- **AC-9.** Tekrarlayan tanımdan oluşan bir kalem sonradan düzenlendiğinde yalnız o ayın kalemi değişir,
  tanımın kendisi ve diğer ayların kalemleri değişmez.
- **AC-10.** Bir çalışan için aylık maliyet girildiğinde iki bileşenin toplamı ilgili ayın personel gideri
  toplamına dahil olur ve çalışan adıyla listelenir (bileşen ayrıntısı AC-49 ve AC-51).
- **AC-11.** Bir gider kalemi bir makinaya atandığında, kalem hem dönem raporunda hem de o makinaya atanmış
  giderler listesinde görünür; atanmamış kalemler yalnız dönem raporunda görünür.
- **AC-12.** Dönem raporunda gider türü kırılımındaki tutarların toplamı, aynı dönemin genel gider
  toplamına eşittir. Kırılım tahakkuk toplamıdır: ödenmemiş kalemler de kırılıma dâhildir.
- **AC-13.** Ödenmemiş kalemler dönem raporunda "Ödenmemiş gider (KDV hariç)" başlığıyla ayrı bir toplam
  olarak gösterilir ve tedarikçilerin "açık borç" toplamından (KDV dâhil, R14) farklı bir rakamdır; iki
  başlık ekranda birbirinden ayırt edilir. Bir kalem ödendi işaretlendiğinde her iki toplamdan da düşer.
- **AC-14.** Seçilen dönem için satışlardan hesaplanan KDV 50.000 TL, giderlerden indirilecek KDV
  12.000 TL ise fark 38.000 TL olarak gösterilir.
- **AC-15.** Seçilen dönemde TL dışı para biriminde hesaplanan KDV varsa karşılaştırma yalnız TL üzerinden
  yapılır ve altında dışarıda bırakılan tutarlar para birimiyle listelenir (örn. "Karşılaştırmaya dahil
  edilmeyen hesaplanan KDV: 1.200 USD").
- **AC-16.** Yürürlük ayından önceki bir dönem seçildiğinde rapor rakam göstermez, "gider verisi
  girilmemiş" bilgisini gösterir.
- **AC-17.** Hiç gider kaydı olmayan bir dönemde rapor boş durum mesajı gösterir, sıfır tutarlı bir tablo
  değil. Yürürlük ayından sonraki gelecek bir ay seçildiğinde de aynı boş durum gösterilir.
- **AC-18.** Gider yetkisi olmayan bir kullanıcının arayüzünde gider alanı ve gider verisi görünmez.
- **AC-19.** Silinen bir gider kalemi dönem raporundan düşer, çöp kutusunda görünür; geri alındığında
  rapora aynı tutarla geri döner.
- **AC-20.** Kullanımda olan bir gider türü silinmek istendiğinde işlem ya engellenir ya da kayıtların
  aktarılacağı tür sorulur; hiçbir gider kalemi türsüz kalmaz.
- **AC-21.** KDV oranı 0 girilen bir gider kalemi (örn. maaş) kaydedilir, tutarı gider toplamına girer ve
  dönemin indirilecek KDV toplamına 0 ekler.
- **AC-22.** Bir ayın kalemleri oluşturulduktan sonra yeni bir tekrarlayan tanım eklenip aynı ay için oluşturma
  yeniden çalıştırıldığında yalnız yeni tanımın kalemi eklenir; kullanıcıya kaç kalem eklendiği ve kaçının
  zaten var olduğu ayrı ayrı bildirilir.
- **AC-23.** Başlangıç ayı Mart, bitiş ayı Mayıs olan bir tekrarlayan tanım için Şubat veya Haziran ayı
  çalıştırıldığında bu tanımdan kalem üretilmez.
- **AC-24.** Bir tanımdan üretilmiş kalem silindikten sonra aynı ay için oluşturma yeniden çalıştırıldığında
  o kalem yeniden oluşmaz.
- **AC-25.** Brüt girilerek kaydedilen bir kira kalemi "brüt girildi" bilgisini taşır ve bunu ekranda gösterir;
  net girilerek kaydedilen kalemde "net girildi" gösterilir.
- **AC-26.** Brüt 20.000 TL kira, %20 stopaj ve %20 KDV girildiğinde stopaj 4.000 TL, indirilecek KDV
  4.000 TL ve fiilen ödenen nakit 20.000 TL hesaplanır; gider toplamına 20.000 TL girer.
- **AC-27.** Makina Stoğu'ndaki bir makinaya atanmış gider kalemi, makina bir müşteriye satıldıktan sonra da
  aynı makinanın doğrudan gideri olarak görünür.
- **AC-28.** Atanmış olduğu makina silinen bir gider kalemi silinmez; ataması kalkar ve aynı dönemin ortak
  gider toplamına dahil olur.
- **AC-29.** Seçilen dönemde indirilecek KDV hesaplanan KDV'den büyükse fark, eksi işaretli ham sayı olarak
  değil, "sonraki döneme devreden KDV" etiketiyle pozitif tutar olarak gösterilir.
- **AC-30.** Gider yetkisi olmayan bir kullanıcının Finans ekranında KDV karşılaştırması hiç çizilmez; mevcut
  "Ödenmesi Muhtemel KDV" kartı olduğu gibi kalır.
- **AC-31.** Yürürlük ayından önce başlayıp sonra biten bir tarih aralığı seçildiğinde rapor üretilir ve
  aralığın kapsam dışı kalan kısmı yazıyla belirtilir.
- **AC-32.** Yürürlük ayının kendisi seçildiğinde rapor rakam üretir (eşik o ay dâhil çalışır).
- **AC-33.** Yürürlük ayı ileri alındığında eşiğin altında kalan kalemler silinmez ve ayar ekranı kapsam dışı
  kalan kalem sayısını uyarı olarak gösterir.
- **AC-34.** Aynı tekrarlayan tanımdan aynı ayda birden fazla kalem bulunuyorsa dönem raporu bunu uyarı olarak
  gösterir.
- **AC-35.** Kullanımda olan bir *kira* türü silinmek istendiğinde taşıma listesinde yalnız diğer kira türleri
  görünür; *normal* veya *personel* türler seçenek olarak sunulmaz. Aynı davranışta başka tür yoksa silme
  engellenir ve kullanıcıya nedeni söylenir.
- **AC-36.** Kullanımda olan bir türün davranışı değiştirilemez; değiştirme denendiğinde işlem yapılmaz ve
  kullanıcıya nedeni söylenir. Aynı türün adı değiştirildiğinde işlem başarılı olur ve kalemler yeni adla
  listelenir.
- **AC-37.** Elle personel kalemi girilirken aylık maliyeti tanımlı bir çalışan seçildiğinde resmi ve elden
  alanları o çalışanın kayıtlı tutarlarıyla dolar ve kullanıcı değiştirebilir; kullanıcı tutarı
  değiştirdiğinde çalışan kaydındaki maliyet değişmez. Hiçbir bileşeni tanımlı olmayan bir çalışan
  seçildiğinde alanlar boş kalır (sıfır yazılmaz) ve kalem AC-2 gereği kaydedilmez.
- **AC-38.** Tam ayları kapsamayan bir tarih aralığı seçildiğinde KDV karşılaştırması ekrandan kaldırılmaz;
  yerinde kalır ve seçili aralığı anarak karşılaştırmanın ay bazlı yapıldığını yazıyla açıklar.
- **AC-39.** Tedarikçi seçilmeden kaydedilen bir gider kalemi kabul edilir ve tedarikçi kırılımında
  "tedarikçi seçilmemiş" grubunda görünür.
- **AC-40.** Adı boş bırakılan bir tedarikçi kaydedilmez; kullanıcıya nedenini söyleyen bir uyarı gösterilir.
- **AC-41.** Bir tedarikçiye ait, KDV hariç 10.000 TL ve %20 KDV'li ödenmemiş bir kalemde o tedarikçinin
  açık borcu 12.000 TL olarak gösterilir.
- **AC-42.** Aynı tedarikçiye ait iki ödenmemiş kalemin ödenecek tutarları 12.000 TL ve 6.000 TL ise açık
  borç 18.000 TL gösterilir; biri ödendi işaretlendiğinde 6.000 TL'ye düşer.
- **AC-43.** Brüt 20.000 TL, %20 stopaj ve %20 KDV'li ödenmemiş bir kira kaleminde tedarikçinin (kiraya
  verenin) açık borcu 20.000 TL gösterilir (net 16.000 artı KDV 4.000); kesilen 4.000 TL stopaj bu borca
  eklenmez.
- **AC-44.** Bir gider kaleminde kullanılan tedarikçi silinmek istendiğinde silme yapılmaz ve kullanıcıya
  tedarikçinin kaç kalemde kullanıldığı bildirilir. Yalnız çöp kutusundaki bir kalemde kullanılıyor olması da
  silmeyi engeller.
- **AC-45.** Hiçbir kalemde kullanılmayan bir tedarikçi silinebilir ve listeden kalkar.
- **AC-46.** Bir tedarikçinin adı değiştirildiğinde, o tedarikçiye bağlı geçmiş gider kalemleri yeni adla
  görünür.
- **AC-47.** Tedarikçi kırılımı, tedarikçileri dönemin **KDV hariç** harcama tutarına göre çoktan aza
  sıralar; eşitlikte tedarikçi adına göre Türkçe alfabetik sıralanır.
- **AC-48.** Gider yetkisi olmayan bir kullanıcıya tedarikçi listesi, tedarikçi kırılımı ve açık borç
  rakamları görünmez.
- **AC-49.** Bir çalışan için resmi 30.000 TL ve elden 20.000 TL girildiğinde o ayın personel gideri
  50.000 TL olarak sayılır ve dönem gider toplamına 50.000 TL girer.
- **AC-50.** Yalnız resmi bileşeni girilmiş bir çalışanda elden bileşen sıfır sayılır ve kalem yine
  kaydedilir.
- **AC-51.** Dönem raporunda personel gideri tek satır toplam gösterir; satır açıldığında her çalışanın
  resmi ve elden tutarları ayrı ayrı görünür ve bu tutarların toplamı satır toplamına eşittir.
- **AC-52.** Yeni bir çalışan tanımlanırken resmi bileşen, firma ayarındaki varsayılan resmi aylık işveren
  maliyetiyle ön doldurulur ve kullanıcı bunu değiştirebilir.
- **AC-53.** Firma ayarındaki varsayılan değer değiştirildiğinde, önceden tanımlanmış çalışanların kayıtlı
  tutarları ve daha önce üretilmiş gider kalemleri değişmez.
- **AC-54.** Elle personel kalemi girilirken çalışan seçildiğinde resmi ve elden alanlarının **yalnız boş
  olanları** çalışan kaydından doldurulur; dolu bir alan ezilmez.
- **AC-55.** Gider yetkisi olmayan bir kullanıcıya çalışan bazlı tutarlar ve elden bileşen hiçbir ekranda
  görünmez.
- **AC-56.** Uygulamanın hiçbir yazdırma çıktısında ve hiçbir CSV/XLSX dışa aktarma dosyasında çalışan
  bazlı personel tutarı veya elden bileşen yer almaz.
- **AC-57.** Gider kaleminde personel davranışlı bir tür seçildiğinde, kullanıcıya girilen tutarın SGK ve
  işsizlik primlerini içerdiği ve prim ödemesinin ayrıca girilmemesi gerektiği ekranda hatırlatılır.
- **AC-58.** Bu hatırlatma bir engel değildir: kullanıcı yine de ayrı bir kalem girmek isterse sistem onu
  engellemez, kalem normal biçimde kaydedilir.
- **AC-59.** Önceki bir döneme ait ödenmemiş bir kalem, bugünkü dönem seçiliyken de tedarikçinin açık
  borcunda görünür; açık borç seçili dönemle sınırlı değildir.
- **AC-60.** Personel davranışlı bir kalem girilirken tedarikçi alanı gösterilmez ve bu kalem tedarikçi
  kırılımında (ne bir tedarikçi altında ne de "tedarikçi seçilmemiş" grubunda) yer almaz.
- **AC-61.** Net 16.000 TL girilerek kaydedilen, %20 stopajlı ve %20 KDV'li ödenmemiş bir kira kaleminde
  tedarikçinin açık borcu 20.000 TL gösterilir; brüt girilen aynı kalemle (AC-43) aynı sonucu verir.
- **AC-62.** Var olan bir tedarikçiyle aynı adda (büyük ve küçük harf farkı dâhil) ikinci bir tedarikçi
  kaydedilmez; kullanıcıya nedeni söylenir.
- **AC-63.** Tedarikçi kırılımındaki tutarların toplamı ("tedarikçi seçilmemiş" grubu dâhil), aynı dönemin
  **personel dışı** gider toplamına eşittir.
- **AC-64.** Personel davranışlı bir tür seçildiğinde kalem formunda KDV oranı alanı görünmez ve kalem
  dönemin indirilecek KDV toplamına 0 ekler.
- **AC-65.** Tekrarlayan tanımı bulunan bir çalışan listeden çıkarıldığında kullanıcıya bu bildirilir, tanım
  silinmez ve bitiş ayı son üretilen aya çekilir; sonraki ay çalıştırıldığında o tanımdan kalem üretilmez.
- **AC-66.** Aynı çalışan ve ay için zaten bir personel kalemi varken elle ikinci kalem girilmeye
  çalışıldığında uyarı gösterilir; kullanıcı devam ederse kalem yine de kaydedilir.
- **AC-67.** Hiçbir kalemde tedarikçi seçilmemiş bir dönemde tedarikçi kırılımı boş durum mesajı göstermez,
  yalnız "tedarikçi seçilmemiş" grubunu tutarıyla gösterir.
- **AC-68.** Ödeme yöntemi seçilmeden kaydedilen bir gider kalemi kabul edilir ve kalem listesinde yöntemi
  "belirtilmemiş" olarak görünür. (Dönem raporunda ödeme yöntemi kırılımı üretilmez.)
- **AC-69.** Ödeme yöntemi Çek seçildiğinde son ödeme tarihi alanının etiketi "Çek vade tarihi" olur;
  yöntem Nakit, Havale veya Kredi Kartı olarak değiştirildiğinde etiket eski hâline döner ve **girilmiş
  tarih korunur**. İkinci bir vade alanı hiçbir yöntemde açılmaz.
- **AC-70.** Son ödeme tarihi boş bırakılan bir kalem kaydedilir ve borç özetinde "vadesi geçti" olarak
  işaretlenmez.
- **AC-71.** Son ödeme tarihi gider tarihinden önce girildiğinde kalem kaydedilmez ve kullanıcıya nedenini
  söyleyen bir uyarı gösterilir.
- **AC-72.** "Kime ne kadar borçluyuz" özetinde tedarikçi borçları ad ad görünür; ödenmemiş personel
  kalemlerinden doğan borç ise tek bir "Çalışanlar" satırında kişi sayısı ve toplam tutarla görünür, çalışan
  adları yalnız satır açıldığında listelenir.
- **AC-73.** Ödenmemiş bir personel kalemi ödendi işaretlendiğinde o çalışanın borcu kalemin ödenecek
  tutarı kadar azalır; borç sıfırlanırsa çalışan özet listesinden düşer. Aynı kural tedarikçi için de
  geçerlidir: açık borcu sıfırlanan tedarikçi özet listesinden düşer, harcama kırılımında kalır.
- **AC-74.** Gider yetkisi olmayan bir kullanıcıya "kime ne kadar borçluyuz" özeti hiç çizilmez.
- **AC-75.** "Makina maliyetine dağıtılmasın" işaretli bir kalem dönem gider toplamına ve borç özetine
  normal biçimde girer, dönem raporunda "Makina maliyetine girmeyen giderler" başlıklı ayrı bir toplam olarak
  da gösterilir.
- **AC-76.** İşaret konduğunda makina ve model atama alanları seçilemez hâle gelir; daha önce yapılmış bir
  atama varsa kaldırılır ve kullanıcıya bildirilir.
- **AC-77.** Bir kalemde makina seçiliyken model seçilemez, model seçiliyken makina seçilemez; seçim
  değiştirildiğinde diğeri temizlenir ve kullanıcıya tek satırlık bilgi gösterilir (AC-76 ile aynı davranış).
- **AC-78.** Kira veya personel davranışlı bir kalemde makina ataması, model dağılımı ve "dağıtılmasın"
  işareti alanları gösterilmez; bu kalemler her zaman ortak gider olarak sayılır.
- **AC-79.** Bir modele 4.000 TL birim maliyet ve 35 adet girildiğinde o satırın toplamı 140.000 TL olarak
  gösterilir. (Birim maliyeti kullanıcı girer, sistem türetmez.)
- **AC-80.** Bir kalemin modellere dağıtılan tutarı dönem raporunun ortak (atanmamış) gider toplamına
  girmez; kısmi dağıtımda yalnız **dağıtılmayan kalan kısım** ortak toplama girer.
- **AC-81.** Ne makinaya ne modele atanmış, işaretsiz bir kalem ortak gider olarak sayılır ve dönem
  raporunda ortak toplamda görünür.
- **AC-82.** Dönem raporunda makinaya atanmış, modele atanmış, dağıtılmayan ve ortak toplamların toplamı,
  aynı dönemin genel gider toplamına eşittir. Bölme **tutar bazlıdır, kalem bazlı değil**: kısmi dağıtılan bir
  kalemin dağıtılan kısmı model kovasına, kalanı ortak kovaya girer; hiçbir tutar iki kovada birden sayılmaz
  ve hiçbir tutar kovasız kalmaz.
- **AC-83.** Bir makina modeli yeniden adlandırıldığında o modele atanmış gider kalemleri yeni adla
  görünmeye devam eder; atama kopmaz.
- **AC-84.** Bir makina modeli silindiğinde kullanıcı silme onayında o modele atanmış gider sayısını görür;
  silme sonrası bu kalemler silinmez, ortak gidere döner.
- **AC-85.** Model ataması veya "dağıtılmasın" işareti taşıyan bir tekrarlayan tanımdan üretilen kalem, bu
  bilgiyi tanımdan devralır.
- **AC-86.** Son ödeme tarihi bugünden önce olan ödenmemiş bir kalem, borç özetinde "vadesi geçti" olarak
  işaretlenir; ödendi işaretlendiğinde işaret kalkar.
- **AC-87.** Bir gider kalemine iki farklı model satırı eklenebilir; her satırın kendi birim maliyeti ve
  adedi olur.
- **AC-88.** Aynı model için ikinci bir satır eklenemez; kullanıcıya nedeni söylenir.
- **AC-89.** 70.000 TL tutarlı bir kaleme 1.000 TL birim maliyetle 5, 40 ve 25 adetlik üç model satırı
  girildiğinde satır toplamı 70.000 TL olur ve fark uyarısı çıkmaz.
- **AC-90.** Satır toplamı kalemin tutarından **az** olduğunda fark tutarı kullanıcıya gösterilir, kalem yine
  de kaydedilir ve dağıtılmayan kalan kısım ortak gidere yazılır.
- **AC-90b.** Satır toplamı kalemin tutarını **aştığında** kalem kaydedilmez; kullanıcıya aşan tutar
  gösterilir.
- **AC-91.** Model satırında adet sıfır, boş veya negatif girildiğinde o satır kaydedilmez ve kullanıcıya
  nedeni söylenir.
- **AC-92.** Aylık standart genel gider listesine bir kalem (ad ve aylık tutar) eklenebilir, düzenlenebilir
  ve silinebilir.
- **AC-93.** Aylık standart genel gider tutarları dönem gider raporunun hiçbir toplamına girmez; rapor
  yalnız gerçekleşen gider kayıtlarını sayar.
- **AC-94.** Gider yetkisi olmayan bir kullanıcıya aylık standart genel gider listesi görünmez.
- **AC-95.** Aylık standart genel gider listesi ekranında, bu tutarların dönem gider raporuna girmediğini
  söyleyen açıklama kalıcı olarak görünür.
- **AC-96.** Bir standart genel gider kaleminin tutarı değiştirildiğinde eski satır üzerine yazılmaz: yeni
  geçerlilik ayıyla ikinci bir satır oluşur ve eski satır kendi döneminde geçerli kalır.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Gider ve KDV hesapları React'sız **saf motorda**; arayüz yalnız gösteriyor.
- [ ] KDV karşılaştırması satış KDV'sini yeniden hesaplamıyor, aylık rapor motorundan alıyor (C10); Finans ile
      gider ekranının aynı dönem için aynı rakamı verdiği çapraz testle gösterildi.
- [ ] Motor, 0002'nin ihtiyaç duyduğu **dört kovayı** (makinaya atanmış, modele atanmış, dağıtılmayan, ortak)
      ve makina ile model bazlı toplamları döndürüyor (R8); dört kovanın genel toplama eşit olduğu testle
      sabitlendi (AC-82).
- [ ] Yeni kalıcı alanlar için **dört nokta kuralı** uygulandı ve `db-roundtrip` testine eklendi.
- [ ] Yeni veri bölümleri için `BLOB_SECTIONS` + `SECTION_GROUP` + `BOLUM_SEKMELERI` + `MERGE_KEYS` +
      `App.mergeLocalIntoReloaded` birlikte güncellendi; `BOLUM_SEKMELERI` gider sekmesini **ve** `settings`'i
      içeriyor (tür tanımları Ayarlar'dan yazılıyor). Tedarikçi bölümü **yalnız gider sekmesinden** yazılıyor
      (Ayarlar'dan değil, R13).
- [ ] Yeni izin boyutu sunucu tarafında (`serverAuth.cjs`), izin tanımlarında ve kullanıcı yönetimi
      ekranında birlikte tanımlandı; C6'nın üç parçalı kuralı, özellikle **sekme listesi tanımsız kullanıcıda
      gider sekmesinin kapalı kaldığı**, testle sabitlendi. Kalem işlemleri, tanım yönetimi ve tedarikçi
      yönetimi ayrı eylem kimlikleriyle yetkilendiriliyor (C6).
- [ ] Tedarikçi açık borcu **ödenecek tutar** üzerinden hesaplanıyor (KDV dâhil, kira kaleminde stopaj
      hariç) ve bu kural testle sabitlendi (AC-41, AC-43); kullanımda olan tedarikçinin silinemediği test edildi.
- [ ] Personel maliyetinin iki bileşeni (resmi, elden) ayrı saklanıyor, gider olarak toplamı sayılıyor ve
      çalışan bazlı tutarların hiçbir yazdırma veya dışa aktarma çıktısına girmediği testle gösterildi
      (AC-49, AC-56, C7b).
- [ ] Gider ekle / düzenle / sil işlem geçmişine yazılıyor ve etiketleri `SettingsAuditLog` haritasına eklendi.
- [ ] Çöp kutusu geri alma ve kalıcı silme simetrisi kuruldu; tür ve tekrarlayan tanım silmenin çöpe düşmediği
      açıkça test edildi.
- [ ] Yedekleme ve geri yükleme yeni veriyi taşıyor.
- [ ] Kullanıcıya görünen tüm metinler Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (`docs/evidence/0001-ac<n>.png`), boş durum ve yetkisiz
      kullanıcı görünümü dâhil. **Personel ekranlarının kanıtı uydurma çalışan adları ve uydurma tutarlarla
      alınır**; hiçbir kanıt dosyasında gerçek çalışan adı veya gerçek maaş bulunmaz (C7b).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` yeni veri sınıfı, izin boyutu ve C6'daki izin istisnasıyla güncellendi.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 11 | Geliştirme başlamadan önceki QA boşluk analizi turu (2026-09-22): 43 açık soru karara bağlandı, R2-R12, C4/C6, X10-X15 ve AC-2/6/8/12/15/17 güncellendi, AC-21…AC-34 eklendi. R2 (plan turu): C18 eklendi. R3 (plan turunda açık kalan üç konu): R2/R5/R9 güncellendi, AC-35…AC-38 eklendi. R4 (tedarikçi turu): R13–R15, AC-39…AC-48. R5 (personel iki bileşen turu): R5/R16/R17, C7b, C19, AC-49…AC-58. R6 (ikinci QA turu, 23.09.2026): 22 açık nokta, AC-59…AC-67. R7 (ödeme yöntemi, vade, borç özeti turu): R18/R19, AC-68…AC-74. R8 (toplu malzeme alımı turu): R20/R21, AC-75…AC-81. R9 (üçüncü QA turu, 23.09.2026): 18 açık nokta; R1/R8/R14/R18/R19/R21 ve AC-68/69/70/72/73/75/77 güncellendi, X18–X21 ve AC-82…AC-86 eklendi. R10 (maliyet tablosu turu): R21/R22, X13, AC-87…AC-94. R11 (dördüncü QA turu, 23.09.2026): 14 açık nokta; R12/R21/R22, C12 ve AC-78/79/80/82/90 güncellendi, AC-90b/AC-95/AC-96 eklendi. |
| **Düzeltme turu sayısı** | 0 | Uygulama tek turda bitti; plan P2/P3 kararları kodlamadan önce netleşti. |
| **Bulgu gerçek/gürültü oranı** | 1 / 0 | Uygulama sırasında e2e testi önceden var olan bir sunucu hatası yakaladı (stableStringify undefined anahtarları); ayrı kod incelemesi yapılmadı. |
| **Regresyon sayısı** | 0 | Mevcut tüm testler yeşil kaldı (149 dosya, 1453 test). |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok; görsel kanıt turu kullanıcı kararıyla atlandı. |

**Bu spec'ten çıkarılan ders:** Sekmesi dar bir kullanıcıyla uçtan uca "değişikliksiz tam blob" yazımı, yıllardır gizli kalmış bir
yetki hatasını (her kayıtta 403) ilk denemede ortaya çıkardı; yeni bir izin boyutu eklenirken bu test her zaman yapılmalı. Spec 11
revizyon geçirdi ama plan turları kararları kodlamadan önce sabitlediği için uygulama geri dönmeden bitti. Görsel kanıt maddesi
(DoD) kullanıcı kararıyla atlandı.
