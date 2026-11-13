# 0145 — Extra Kalıp kargo kartları görünmüyor, sekmeler izinler gelmeden çiziliyor

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-13; üç kararın üçü de analistin önerisi yönünde kapandı). Revizyon 2: plan turunun sekiz kararı işlendi (Plan kararı 27–34); uygulama planı `specs/0145-uygulama-plani.md` |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Panonun Extra Kalıp kargo kapısı (`App.jsx` yetki satırları; altı okuyucu: `ServisPanosu.jsx` üç liste ve alarm efekti, `App.jsx` uygulama geneli bildirim ve ayrı pencere anlık görüntüsü), Extra Kalıp kargo detay penceresinin kaydı kilitlemesi, uygulamanın açılış dalları (`App.jsx` çizim kapısı), istemcinin izin tazelemesi (`electron/ipc/data.cjs` `server:refreshToken`), yoklamanın ilk turu |
| **Bağımlı spec'ler** | 0100 (panoya düşme zamanı), 0111 (toplu yedek parça), 0115 (kalıp tamiri rozeti), 0119 (pano kartında kalıbı gönderen kişi), 0121 (set), 0128 (kilit tamamlama; Extra Kalıp tek kilit alanı), 0052 ve 0066 (sekme izinleri), 0098 (kendi izni deseni), 0077 (veri yenileme kapısı ve kayıt perdesi), 0085 (istemci sürümü, `/auth/me` tazelemesi) |
| **Kanıt** | Takım Yöneticisi'nin 2026-11-13 tarihli ekran videosu (istemci PC, v3.58.0); kareler 21,6 ile 22,2 saniye arası |
| **QA turu** | 2026-11-13, 26 bulgu (4 Bloklayıcı, 14 Önemli, 8 Küçük); hepsi onaylandı ve işlendi |
| **Düzeltilen iddialar** | 5 (okuyucu sayısı, arşiv izin kimlikleri, B parçasının kök nedeni, `permissions.js` satır numarası, yerel iznin tazelenmemesi) |

---

## Intent

İstemci bilgisayarda Servis ve Kargo Panosu açıldığında BEKLİYOR sütununda dört kart beliriyor ve yarım saniye sonra kayboluyor. Kullanıcı bunu veri kaybı sanıyor ve panodaki kargo takibine güvenmiyor.

Kartlar kaybolmuyor, hiç görünmemeleri gerekiyordu: dördü de Extra Kalıp kargo kartı ve panoda görünmeleri bugün **Müşteriler sekmesine** bağlı. Bu kullanıcıda Müşteriler sekmesi yok, dolayısıyla o kartları hiç göremiyor.

Kartların bir süre görünmesinin ayrı bir sebebi var ve QA turunda ilk teşhis düzeltildi. Uygulama izinleri "henüz gelmediği için" tam yetkili saymıyor: sunucu kipi ile izin bilgisi aynı cevapta ve aynı çizimde yerleşiyor (Ölçüm G), izin yerleşmeden önce de zaten hiçbir şey çizilmiyor (Ölçüm H). Çizilen tablo **bayat**: yerel ayardaki izin yalnız girişte yazılıyor ve jeton tazelemesi sunucudan gelen güncel izni atıyor (Ölçüm J), bu yüzden yönetici izni değiştirdikten sonra o bilgisayar yeni bir girişe kadar eski tabloyu çiziyor ve düzeltme ancak on saniyelik yoklamayla geliyor (Ölçüm I). Videodaki sıçrama bu yoklama turuyla uyumlu.

İki ayrı kusur var ve ikisi de tek başına yetersiz çözülür. Birincisi kalıcı: kargo takibini panodan yapan kullanıcı, kargolarının bir bölümünü göremiyor. İkincisi aralıklı ama güven kırıyor: yöneticinin izin değişikliğinden sonraki her açılışta, yoklamanın ilk turuna kadar yanlış bir yetki tablosu çiziliyor ve o sırada kullanıcı yetkisi olmayan bir sekmeye tıklayıp içeriğini açabiliyor.

Başarı şöyle görünür: Stok sekmesi olan bir kullanıcı panoda yedek parça kargolarının yanında Extra Kalıp kargolarını da görür, düzenleme yetkisi yoksa kartı yalnız okuyabilir; bugün kartları gören Müşteriler sekmeli kullanıcı hiçbir şey kaybetmez; ve uygulama açıldığında sekme çubuğu ilk çizildiği andan itibaren sunucunun doğruladığı yetkiyi gösterir.

---

## Requirements

### A. Extra Kalıp kargo kartlarının kapısı

- **A-R1.** Extra Kalıp kargo kartlarının panoda **görünmesi** Müşteriler sekmesine bağlı olmaktan çıkar.
- **A-R2.** Görünürlük kuralı **birleşimdir**: kullanıcının **Stok sekmesi ya da Müşteriler sekmesi** varsa Extra Kalıp kargo kartları çizilir. Yedek parça kargosunun kapısı (yalnız Stok) değişmez. Gerekçe: ikisi de aynı kavramdır (fabrikadan çıkan kargo), aynı sütunlara düşer, aynı kartı kullanır ve bugün yalnız biri Stok kullanıcısına görünüyor. (Karar 1)
  - **A-R2/2.** Kural bir **ekleme**dir, taşıma değil: bugün kartları gören Müşteriler sekmeli kullanıcı onları kaybetmez. (QA kararı 1) Gerekçe: Karar 1 kendi izin kimliğinin kapalı varsayılanını "bugün kartları gören kullanıcıları karartır" diye reddetmişti; yalnız Stok'a taşımak da aynı şeyi yapardı. Kabul edilen bedel: tutarsızlık ters yöne döner, yani Müşteriler sekmeli ama Stok'u olmayan kullanıcı kalıp kargosunu görür, yedek parça kargosunu görmez.
  - **A-R2/3.** Kapı **tek yerde** tanımlanır. Panodaki ve ayrı pencereye giden prop adları (`kalipYetki`, `kargoYetki`) korunur, ikisi de aynı tanımdan türer. (QA kararı 9) Gerekçe: prop adını değiştirmek on bir test dosyasını gereksiz açar (Ölçüm T), tekliği tek tanım zaten sağlar ve ileride ayrışma gerekirse ayrı prop ucuz kalır.
- **A-R3.** Kuralın kapsamı **altı okuyucuda** aynıdır: sütunlardaki kartlar, arşivlenen kartlar listesi, planlananlar listesi, panonun alarm efekti, uygulama geneli bildirim ve ayrı pano penceresine giden anlık görüntü. Hepsi bugün de tek bayrağı okuyor; bayrağın tanımı değişir, kapıların yeri değişmez.
  - **A-R3/2.** Okuyucuların yeri Ölçüm A'da sayılıdır; biri güncellenip öteki unutulamaz, çünkü tanım tektir. (QA kararı 26)
  - **A-R3/3.** Alarm ve bildirim **kuralı** değişmez, **kümesi** kapıyı izler: kapı açılan kullanıcı yeni Extra Kalıp kargosu düştüğünde kartın yanıp sönmesini, alarm sesini, alarm şeridini ve pano dışındayken uygulama bildirimini de alır. (QA kararı 5) Gerekçe: yedek parça kargosu bugün tam olarak böyle davranıyor; sessiz bırakmak iki kargo türünü yine ayırırdı ve beklenmedik gelen ses kusur olarak raporlanırdı.
- **A-R4.** Kartın **düzenlenmesi** bugünkü izinlerde kalır. Müşteriler sekmesi olmayan ama Stok sekmesi olan kullanıcı, izni yoksa kartı yalnız okur.
  - **A-R4/2.** İzin kimlikleri **dörttür** ve tek bir kimlik değildir (QA kararı 6): sütun değiştirme, sorumlu seçme ve detay penceresinin alanları `cust_kalip_edit`; panodan kaldırma (arşivleme) ve "Hemen Düşür" `kalip_pano_kaldir`; arşiv listesini görme ve panoya geri alma `kalip_pano_arsiv`. Yeni kimlik açılmaz, var olanların dağılımı yalnız yazıya geçer.
  - **A-R4/3.** `cust_kalip_edit` izin ekranında `Makina Geçmişi — Kalıp` grubundadır, yani **Müşteri işlemleri** akordeonunda; yedek parça kargosunun karşılığı ise Stok boyutundadır. Stok kullanıcısına kartı düzenletmek isteyen yönetici kutuyu müşteri grubundan işaretler. Bu adım sürüm notuna yazılır, izin ekranının düzeni değişmez (X2). (QA kararı 16)
- **A-R5.** Kart tıklanınca açılan detay penceresi salt okunur açılabilir olmalıdır: düzenleme yetkisi olmayan kullanıcıda alanlar pasiftir, pencere açılır.
  - **A-R5/2.** Pencere kaydın kilidini **yalnız düzenleme izni varken** alır. (QA kararı 8) Gerekçe: pasif pencerenin kilide ihtiyacı yok; kitle genişlediği için her bakış iki dakikalık kilit bırakır ve aynı alanı paylaşan müşteri detayındaki Extra Kalıp formunu (0128) başkasına kapatırdı.
- **A-R6.** Kiosk kullanıcısı (yalnız pano sekmesi) Extra Kalıp kargo kartlarını bugün olduğu gibi görmez. (Karar 3)
  - **A-R6/2.** Kiosk çağrısı bugün ne kapı bayrağını ne de Extra Kalıp dizisini geçiriyor; ikisi de geçirilmemeye devam eder ve kriter ikisini birden sabitler. (QA kararı 22) Gerekçe: yalnız bayrağa bakan bir test, ileride dizi geçirilirse kusuru yakalamaz.

### B. İzinler yerleşmeden çizim yapılmaz

- **B-R1.** İstemci modunda uygulama, sekme çubuğunu ve sekme içeriğini **sunucunun doğruladığı** izinle çizer; bayat yerel izinle çizip sonradan daraltmaz.
  - **B-R1/2.** Kusurun kökü "izin henüz gelmedi" değil, **yerel ayardaki iznin tazelenmemesi**dir (Ölçüm G, H, I, J; QA kararı 2). Açılışta atılan jeton tazelemesi sunucudan gelen güncel izni ayara **yazar** ve çağırana **döndürür**; bugün yalnız jeton kaydediliyor ve izin atılıyor.
  - **B-R1/3.** Uygulama ilk çizimi bu **ilk tazelemenin sonucuna** bağlar. Tazeleme zaten açılışta koşulsuz atılıyor, yani yeni bir ağ turu eklenmez.
  - **B-R1/4.** Yoklamanın ilk turu beklemeden bir kez çalışır, böylece düzeltme hiçbir durumda on saniye uzağa düşmez.
  - **B-R1/5.** İlk tur başarılı cevabın izin ve rolünü uygular (ve 401'de giriş ekranına gönderir); ilk yükleme veri sürümünü yerleştirmeden (`dataVersionRef` boşken) sürüm karşılaştırması ve veri yüklemesi atlanır, cevapsız ilk tur çevrimdışı işaretlemez (bunu ilk yükleme ve sonraki turlar yapar). Gerekçe: yoksa açılışta veri iki kez yüklenirdi. (Plan kararı 28)
  - **B-R1/6.** Tazelemenin dönüşü başarıda `{ ok: true, role, permissions }`, başarısızlıkta bugünkü gibi `false`'tur. (Plan kararı 29)
- **B-R2.** Bekleme, uygulamanın bugün sunucu durumunu beklerken kullandığı dalın aynısıdır; yeni bir açılış ekranı, yazı ya da gösterge eklenmez. (Karar 2)
  - **B-R2/2.** Beklemenin **üst sınırı 1,5 saniyedir**. Süre dolarsa ya da tazeleme hata dönerse uygulama yerel ayardaki izinle çizilir (bugünkü davranış) ve cevap gelince izin yerleşir. (QA kararı 3) Gerekçe: ağ isteği aday adres başına beş saniye bekliyor ve en çok üç aday deniyor (Ölçüm L), yani sınırsız bekleme çevrimdışı istemciyi on beş saniyeye kadar boş ekranda tutardı; giriş sonrası açılış ekranı da yok (Ölçüm M), yani boşluk kullanıcıya görünür.
  - **B-R2/3.** Sunucu köprüsü ya da tazeleme işlevi yoksa bekleme **hiç kurulmaz**, uygulama hemen çizilir. (QA kararı 12) Gerekçe: köprüsüz ortam yerel mod demektir (B-R3) ve bu kural App'i istemci kipinde kuran testleri boş ekrana düşürmemelidir.
  - **B-R2/4.** Süre dolup yerel izinle çizildikten sonra gelen cevap izni yerleştirir; bu yavaş ağda tek seferlik bir daralma doğurabilir ve kabul edilen sınırdır (AC-28'in ikinci yarısı). (Plan kararı 30)
- **B-R3.** Kural yalnız istemci modunu kapsar. Yerel mod ve sunucu bilgisayarı bugünkü gibi davranır: oralarda izin kavramı yoktur ve bekleme takılmaya dönüşür.
  - **B-R3/2.** "İzin yerleşti" ölçütü **ayrı bir durum bayrağıdır**, iznin kendisinin boşluğu değildir. (QA kararı 4) Gerekçe: kısıtsız kullanıcıda ve admin'de izin alanı boştur (Ölçüm N), yani boşluğa bakan ölçüt bu kullanıcıları sonsuza kadar bekletirdi.
- **B-R4.** Salt okunur mod (sunucuya ulaşılamıyor) bu kuraldan etkilenmez: izinler yerel ayardan okunur ve zaten yerleşir.
  - **B-R4/2.** Bekleme **ham** izni bekler, salt okunur modun yerine koyduğu izin setini değil. (QA kararı 14) Gerekçe: sekme listesi ham izinden, öteki kapılar etkin izinden okunuyor (Ölçüm O) ve bu ayrım bilinçli; beklemeyi yanlış tarafa bağlamak salt okunur istemciyi açılamaz yapardı.
- **B-R5.** Giriş ekranından sonra uygulama baştan yüklendiği için kural her girişte de geçerlidir.
- **B-R6.** Bekleme süresi uzadığında uygulama boş ekranda kilitlenmez; izin bilgisi gelmezse bugünkü davranış sürer (B-R2/2).
  - **B-R6/2.** Kiosk ilk çizimde de doğrudur: yalnız pano sekmesi olan kullanıcı doğrudan panoyu görür, kabuk bir an bile çizilmez; tersi de geçerlidir. (QA kararı 13) Gerekçe: kiosk kararı görünür sekmelerden hesaplanıyor (Ölçüm P), yani yanlış tablo en görünür hâliyle burada çıkar.

---

## Constraints

- **C1.** Sunucunun yetki kuralları değişmez. Panodan Extra Kalıp kargosu yazmak sunucuda bugün de pano sekmesiyle geçiyor ve alan denetimi Extra Kalıp düzenleme iznini istiyor; yani A parçası sunucuda yeni kural gerektirmez (Ölçüm 7).
  - **C1/2.** Kabul edilen sınır: `customerActions` dizisi **açıkça boşaltılmış** bir Stok kullanıcısı kartı sürüklerse sunucu bölüm düzeyinde reddeder, çünkü Extra Kalıp bölümü müşteri grubuna bağlıdır (Ölçüm Q). Pratikte görülmez, çünkü aynı kullanıcıda `cust_kalip_edit` de yoktur ve istemci düğmeyi zaten kapatır. (QA kararı 15)
- **C2.** Yeni izin boyutu, yeni izin kimliği ve izin ekranında yeni kutu açılmaz (Karar 1 ile kesinleşti).
- **C3.** Yeni kalıcı alan, veri bölümü, tablo, göç ve birleştirme kuralı yok.
- **C4.** Kartların içeriği, sütun eşlemesi, sürükleme, arşiv ve planlanan düşme davranışı değişmez. Alarmın ve uygulama geneli bildirimin **kuralı** da değişmez; yalnız **kümesi** kapıyı izler (A-R3/3).
- **C5.** B parçası izin kurallarının kendisine dokunmaz; yalnız kuralların uygulanmadan önce beklenmesini sağlar. Sekme listesini hesaplayan ortak fonksiyonun "izin yoksa hepsi görünür" davranışı yerinde kalır, çünkü yerel mod ve sunucu bilgisayarı ona dayanıyor.
- **C6.** Yalnız Türkçe.

---

## KAPSAM DIŞI

- **X1.** Sunucu bilgisayarının bayat kalması (Context'teki açık bulgu). Ayrı bir spec'in konusudur; bu işte yalnız kayda geçer.
- **X2.** Kargo kavramının izin ekranında kendi başlığı altında toplanması.
- **X3.** Kiosk kullanıcısına kargo kartlarının açılması.
- **X4.** Pano kartlarında ve kargo bildiriminde müşteri adının gizlenmesi. Yedek parça kargo kartı bugün de alıcı adını yazıyor, pano dışı bildirim de firma adını basıyor (Ölçüm A) ve ikisinin kuralı Stok sekmesi; A-R2 aynı sınırı Extra Kalıp'a taşır. (QA kararı 20)
- **X5.** İzin değişikliğinin açık uygulamaya anında yansıması (bugün en çok on saniyelik yoklamayla geliyor).
- **X6.** Giriş sonrası uygulamanın baştan yüklenmesi yerine durumun korunması.
- **X7.** Yedek parça kargo detay penceresinin kaydı koşulsuz kilitlemesi (`yedek_parca`); bu iş o pencerenin kitlesini genişletmiyor. (Plan kararı 32)

---

## Context

### Kanıt: videonun kareleri

| An | Müşteriler sekmesi | BEKLİYOR rozeti | Sütunda |
|---|---|---|---|
| 21,6 sn (pano açılır) | var | 4 | BERCESTE, ESCOM GIDA, BEYKOZ BELEDİYESİ, RESPORT CATERING |
| 21,8 sn | var | 4 | aynı dört kart |
| 22,2 sn | yok | 0 | — |
| 26,5 sn (video sonu) | yok | 0 | — |

Dört kart da KALIP ve KARGO rozetli, yani Extra Kalıp kargo kaydı; durumları "Hazırlanıyor". Sekme ile kartlar aynı karede birlikte gidiyor.

### Kodda doğrulananlar

- **Ölçüm 1.** Extra Kalıp kargo kartının kapısı `App.jsx:214`: bayrak, görünür sekmeler arasında Müşteriler var mı diye bakıyor. Yedek parça kargosunun kapısı `App.jsx:210`: Stok sekmesi. İkisi aynı panoda yan yana çizilir.
- **Ölçüm 2.** Kapı panoda üç listede okunuyor: sütunlar (`ServisPanosu.jsx:333`, bayrak yoksa boş sütun döner), arşivlenenler (`:339`) ve planlananlar (`:380`). **QA turunda düzeltildi:** okuyucu üç değil altıdır, kalan üçü Ölçüm A'da.
- **Ölçüm 3.** Kartın düzenleme yetkisi ayrı ve zaten doğru yerde: `ServisPanosu.jsx:96` Extra Kalıp düzenleme iznini okuyor, kart ona göre pasifleşiyor.
- **Ölçüm 4.** Sekme listesini hesaplayan fonksiyon, izin bilgisi yokken bütün sekmeleri döndürüyor (`permissions.js:43`; `:42` sunucu kipi denetimidir, QA turunda düzeltildi). Bu kural yerel mod ve sunucu bilgisayarı için doğrudur.
- **Ölçüm 5.** İzin bilgisi belleğe yalnız iki yerden yazılıyor: açılışta yerel ayardan (`App.jsx:246`) ve on saniyelik yoklamada sunucudan (`App.jsx:535`). **QA turunda düzeltildi:** birincisi uygulama ilk çizimini yapmadan önce gelir (Ölçüm G, H), yani sorun sıra değil **içerik**tir; yerel ayardaki izin yalnız girişte yazılıyor ve jeton tazelemesi güncel izni atıyor (Ölçüm J).
- **Ölçüm 6.** Giriş ekranından sonra uygulama baştan yükleniyor (`App.jsx:1445`), yani izin bilgisi her girişte sıfırdan ve eşzamansız geliyor. Videodaki üç saniyelik aralık bununla uyumlu: büyük veri çözümlenirken izin cevabı sırada bekliyor.
- **Ölçüm 7.** Sunucu tarafı A parçasına hazır: Extra Kalıp bölümünün sekme eşlemesinde pano zaten var (`serverAuth.cjs:104`) ve kargo durumu alanı Extra Kalıp düzenleme iznini istiyor (`serverAuth.cjs:585`). Yani Müşteriler sekmesi olmayan ama düzenleme izni olan kullanıcı kartı sürükleyince sunucu kabul eder; izni yoksa istemci düğmeyi zaten kapatır.
- **Ölçüm 8.** Kiosk çağrısı Extra Kalıp dizisini (`partSales`) de kapı bayrağını da hiç geçirmiyor (`App.jsx:1454` ile `:1462` arası), yani A-R6 bugünkü davranışın sabitlenmesidir, yeni kapı değildir.
- **Ölçüm 9.** Uygulama bugün de "durumu bekle, hiçbir şey çizme" desenini kullanıyor (`App.jsx:1441` ve `:1444`), yani B-R2 var olan bir deseni ikinci kez kullanır.

### Açık bulgu (bu spec'te çözülmüyor, X1)

Sunucu bilgisayarı, bir istemci veri yazdığında sürüm sayacını koşulsuz güncelliyor (`App.jsx:399`) ama o sırada kendi kaydı beklemedeyse veriyi yüklemiyor (`App.jsx:416`). Sayaç eşitlendiği için iki yoklama da farkı bir daha görmüyor (`App.jsx:472` ve `:543`), yani sunucu bilgisayarı o veriyi uygulama kapanana kadar yüklemiyor ve sonraki kaydı istemcinin eklediği kayıtları silebiliyor. Bu belirtiyle ilgisi yok, ayrı bir veri kaybı yoludur ve kendi spec'ini bekler.

### Tuzaklar

- **T1.** Kapı bayrağının adı panoda üç yerde geçiyor; birini güncelleyip ötekini unutmak kartı sütunda gösterip arşivde gizler.
- **T2.** Sekme listesi fonksiyonunun "izin yoksa hepsi" kuralını değiştirmek yerel modu ve sunucu bilgisayarını boş ekranda bırakır (C5).
- **T3.** Bekleme kapısını salt okunur modu da kapsayacak şekilde yazmak, sunucuya ulaşılamayan istemciyi açılamaz hâle getirir (B-R4).
- **T4.** Videodaki kullanıcının izninde Müşteriler sekmesinin olup olmadığı henüz ölçülmedi. Varsa, sekmenin kaybolması üçüncü bir kusurdur (sunucudan gelen izin sekmeyi yanlış kapatıyor) ve bu spec'e üçüncü bir parça eklenir.
- **T5.** Prop adını (`kalipYetki`) tanımla birlikte değiştirmek on bir test dosyasını açar (Ölçüm T); ad korunur, yalnız tanım değişir (A-R2/3).
- **T6.** Beklemeyi ağ isteğinin kendi süresine bırakmak çevrimdışı istemciyi on beş saniye boş ekranda tutar (Ölçüm L, M); üst sınır ve geri düşüş B-R2/2'de yazılıdır.
- **T7.** "İzin yerleşti" ölçütünü iznin boşluğuna bağlamak admin'i ve kısıtsız kullanıcıyı sonsuza kadar bekletir (Ölçüm N, B-R3/2).
- **T8.** Arşiv listesi çift kapılıdır (Ölçüm B): yalnız bayrağı açmak listeyi `kalip_pano_arsiv` izni olmayan kullanıcıda yine boş bırakır; kriter buna göre bölünmüştür (AC-2).
- **T9.** Detay penceresinin kilidini koşulsuz almak (Ölçüm E) kitle genişleyince müşteri detayındaki Extra Kalıp formunu başkasına kapatır (A-R5/2).

### Kararlar (Takım Yöneticisi, 2026-11-13)

1. **A parçasının kapısı Stok sekmesidir** (A-R2); kendi izin kimliği açılmaz. Gerekçe: kargo tek kavramdır ve bugün aynı panoda, aynı sütunda, aynı kart bileşeniyle çizilen iki kargo türünden biri Stok sekmesine, öteki Müşteriler sekmesine bağlı; bu tutarsızlık kapatılır. Kendi izin kimliği iki yönden de kötü: eylem izinlerinde "tanımsız = serbest" kuralı geçerli olduğu için varsayılanı açık bırakmak Stok kapısından daha geniş davranır (pano sekmesi olan herkes, kiosk dâhil), varsayılanı kapalı yapmak ise bugün kartları gören kullanıcıları da karartır ve kullanıcı başına elle açma işi doğurur. Kabul edilen bedel: Müşteriler sekmesi olmayan kullanıcı kartta müşteri firma adını görür; yeni bir sızıntı sınıfı değildir, yedek parça kargo kartı bugün de alıcı adını yazıyor ve kuralı Stok sekmesidir.
2. **Bekleme bugünkü boş dalla yapılır** (B-R2); yeni gösterge yazılmaz. Gerekçe: uygulama aynı deseni zaten iki yerde kullanıyor (uygulama kilidi durumu ve sunucu durumu beklenirken), üçüncü kez kullanmak küçük bir iştir; yeni bir açılış göstergesi ise yeni bileşen, yeni test ve yeni kanıt ekranı demektir. Kabul edilen bedel: izin cevabı gecikirse kullanıcı o süre boyunca boş ekran görür (videodaki üç saniyelik gecikme büyük verinin çözümlenmesi sırasında izin cevabının sırada beklemesinden doğuyor). Gösterge kararı, bekleme gerçekten uzun ölçülürse ikinci turda yeniden açılır.
3. **Kiosk davranışı değişmez** (A-R6). Gerekçe: kargo yönetiminin ofiste kalması daha önce bilinçli olarak kararlaştırıldı ve kiosk çağrısına Extra Kalıp verisi hiç geçirilmiyor (Ölçüm 8), yani değiştirmek yeni bir veri zinciri ve kiosk testleri demektir; ayrıca servis katındaki ekranda müşteri firma adları gereksiz görünür. Takım Yöneticisi'nin notu: kalıp kargoları servis katında hazırlanmıyor.

### QA turunda ölçülenler (2026-11-13)

Hepsi HEAD'de (v3.58.0 artı 0142, 0143, 0144) doğrulandı.

- **Ölçüm A.** Kapı bayrağının **altı** okuyucusu var: panonun sütunları (`ServisPanosu.jsx:333`), arşiv listesi (`:339`), planlananlar (`:380`), panonun alarm efekti (`:223`, `kalipYetkiRef`), uygulama geneli bildirim (`App.jsx:976`) ve ayrı pano penceresine giden anlık görüntü (`App.jsx:1058`, prop olarak). Bildirim metni firma adını basıyor (`App.jsx:997`).
- **Ölçüm B.** Arşiv listesi **çift kapılı**: hesap `kalipYetki` ile süzülüyor (`ServisPanosu.jsx:339`), çizim ayrıca `canKalipArsiv` istiyor (`:970`); başlık sayısı ve boş sütun metni de aynı izni okuyor (`:963`, `:886`).
- **Ölçüm C.** İzin kimlikleri ayrı: `cust_kalip_edit` (`:96`) sütun değişimi (`:350`), sorumlu seçimi (`:365`) ve detay alanları; `kalip_pano_kaldir` (`:97`) arşivleme (`:358`) ve "Hemen Düşür" (`:372`); `kalip_pano_arsiv` (`:98`) arşiv listesi ve panoya geri alma (`:358`).
- **Ölçüm D.** `cust_kalip_edit` izin ekranında `Makina Geçmişi — Kalıp` grubunda ve `servisPano` işareti taşımıyor (`serverPermissionDefs.js:118`), yani Müşteri işlemleri akordeonunda çiziliyor; `kalip_pano_kaldir` ve `kalip_pano_arsiv` ise `Extra Kalıp Kargo Panosu` grubunda ve Servis Panosu akordeonunda (`:113`). Yedek parça kargosunun düzenlemesi Stok boyutunda (`ServisPanosu.jsx:94`, `stockActions.yedek_parca_edit`).
- **Ölçüm E.** Detay penceresi kaydın kilidini **koşulsuz** alıyor (`ServisPanosu.jsx:171`, `useLock("part_sale", kalipDetayId)`); pencerenin alanları ve durum düğmeleri `canKargo` ile pasifleşiyor (`KargoPanosu.jsx:190` ile `:205` arası), yani salt okunur açılış bugün de çalışıyor.
- **Ölçüm F.** `partSales` dizisi panoya **koşulsuz** gidiyor (`App.jsx:1770`), yani A parçası yeni bir veri zinciri açmıyor, yalnız ekranda gösteriyor. Kiosk çağrısı diziyi de bayrağı da geçirmiyor (`App.jsx:1454` ile `:1462` arası).
- **Ölçüm G.** React 19 (`package.json` 19.3.1, `createRoot`) otomatik topluyor ve `setServerMode(active)` ile `setServerPermissions(...)` aynı `.then` gövdesinde (`App.jsx:245` ve `:246`), yani sunucu kipi "aktif" iken iznin boş olduğu bir çizim yok.
- **Ölçüm H.** `serverMode === null` dalı zaten hiçbir şey çizmiyor (`App.jsx:1444`), yani "izin gelene kadar sekme içeriği çizilmez" bugün de sağlanıyor.
- **Ölçüm I.** `setServerPermissions` kaynakta yalnız iki yerde (`App.jsx:246`, `:535`). Yoklama on saniyede bir ve **öncü turu yok** (`App.jsx:499` ile `:552` arası), yani oturum içindeki tek düzeltme yolu en geç on saniye sonra geliyor.
- **Ölçüm J.** `server:login` sunucudan gelen izni ayara yazıyor (`electron/ipc/data.cjs:410`), ama `server:refreshToken` `/auth/me` cevabındaki `body.user.permissions`'ı **atıyor** ve yalnız jetonu kaydediyor (`:465`). Yani yerel ayardaki izin bir sonraki girişe kadar tazelenmiyor.
- **Ölçüm K.** Sunucu izni iki uçta da veriyor: `/auth/me` (`server.cjs:350`) ve `/api/version` (`:444`), yani B-R1/2 yeni bir uç gerektirmiyor.
- **Ölçüm L.** İstemci isteği aday adres başına beş saniye bekliyor ve aday listesi üç kaynaktan kuruluyor (`electron/ipc/data.cjs:229`, `buildCandidates`), yani ulaşılamayan sunucuda bir istek on beş saniyeye kadar sürebilir.
- **Ölçüm M.** Açılış ekranı yalnız ilk açılışta ve 1,2 saniye görünüyor (`electron/main.cjs:394`); giriş ekranından sonra uygulama `window.location.reload()` ile yeniden yükleniyor (`App.jsx:1445`) ve açılış ekranı geri gelmiyor, yani oradaki boşluk kullanıcıya görünür.
- **Ölçüm N.** Sekme listesi izin yokken hepsini döndürüyor (`permissions.js:43`); kısıtsız kullanıcıda ve admin'de izin alanının kendisi boş (`server.cjs:292`), yani boşluk geçerli bir izin durumudur.
- **Ölçüm O.** `visibleTabs` **ham** izni okuyor (`App.jsx:189`), öteki kapılar etkin izni (`:184`); salt okunur modda ikisi bilinçli olarak ayrışıyor.
- **Ölçüm P.** Kiosk kararı görünür sekmelerden hesaplanıyor (`App.jsx:224`), yani yanlış sekme tablosu kiosk kullanıcısına bir an tam kabuğu gösterebilir.
- **Ölçüm Q.** Sunucu A parçasına hazır ama grup kapısı duruyor: `BOLUM_SEKMELERI.partSales` panoyu içeriyor (`serverAuth.cjs:104`), `ALAN_IZINLERI.partSales` kargo durumunu `cust_kalip_edit`'e bağlıyor (`:585`), `SECTION_GROUP.partSales` müşteri grubunda (`:36`) ve boş dizi bütün bölümü kapatıyor (`:217` ile `:225` arası, `:522`).
- **Ölçüm R.** Sütun rozeti birleşik listeyi sayıyor (`ServisPanosu.jsx:869`), boş sütun metni planlanan ve arşiv listelerini hesaba katıyor (`:886`), "Planlanan (n)" başlığı üç türü topluyor (`:892`); üçü de kapı açılınca kendiliğinden doğru sayar.
- **Ölçüm S.** Arşiv temizleme kalıp arşivini de kapsıyor (`ServisPanosu.jsx:505` ve `:1095`), yani kitle genişleyince temizlemenin kapsamı da genişler.
- **Ölçüm T.** `kalipYetki` prop'unu adıyla kuran on bir test dosyası var (`tests/ui/servis-panosu`, `servis-pencere-veri`, `servis-pencere-perde-0129`, `kalip-sorumlusu-0119`, `kalip-tamiri-0115-pano`, `kalip-sevki-0117`, `kilit-tamamlama-0128`, `parca-fiyati-0133-satis`, `parca-suzgeci-0120`, `tahsilat-gunu-0131-pano` ve `ui/servis-panosu`'nun ortak düzeneği).

### QA turunda verilen kararlar (2026-11-13)

Hepsi Takım Yöneticisi tarafından onaylandı. Derece: **Bloklayıcı** 1-4, **Önemli** 5-18, **Küçük** 19-26.

1. **Kapı birleşimdir (Bloklayıcı).** `Stok VEYA Müşteriler`; bugün kartları gören Müşteriler sekmeli kullanıcı kaybetmez (A-R2, A-R2/2).
2. **B'nin kökü yeniden yazıldı (Bloklayıcı).** Kusur "izin gelmedi" değil, yerel iznin tazelenmemesidir; çözüm üç parçalıdır (B-R1/2, B-R1/3, B-R1/4).
3. **Beklemenin üst sınırı 1,5 saniye, geri düşüş yerel izindir (Bloklayıcı).** (B-R2/2)
4. **"İzin yerleşti" ölçütü ayrı bayraktır (Bloklayıcı).** İznin boşluğu ölçüt olamaz (B-R3/2).
5. **Alarm ve bildirim kümesi kapıyı izler (Önemli).** Kural değişmez, küme genişler (A-R3/3, C4).
6. **Dört izin kimliği yazıya geçer (Önemli).** (A-R4/2)
7. **Arşiv ve planlanan listesinin kriteri izne göre bölünür (Önemli).** (AC-2, AC-18)
8. **Detay penceresi kilidi yalnız düzenleme izniyle alınır (Önemli).** (A-R5/2)
9. **Tanım tek, prop adları korunur (Önemli).** (A-R2/3)
10. **Sekme tablosu sözü ilk çizimle sınırlıdır (Önemli).** Sonraki daralma serbesttir (X5 ile çelişmesin; AC-9).
11. **Açılış süresi kriteri somutlanır (Önemli).** Ölçüt beklemenin üst sınırıdır (AC-14).
12. **Köprü yoksa bekleme kurulmaz (Önemli).** (B-R2/3)
13. **Kiosk ilk çizimi kriterlenir (Önemli).** (B-R6/2, AC-25)
14. **Bekleme ham izni bekler (Önemli).** (B-R4/2)
15. **Grup kapısının sınırı yazılır (Önemli).** Boş `customerActions` bölümü kapatır (C1/2).
16. **Düzenleme izninin akordeon yeri sürüm notuna girer (Önemli).** (A-R4/3)
17. **İki ölçüm uygulamadan önce yapılır (Önemli).** Videodaki kullanıcının sunucudaki izin listesi; video çekilirken giriş yapılıp yapılmadığı ve izinlerin o sırada değiştirilip değiştirilmediği. Gerekçe: ikisi de B'nin kapsamını belirler, çünkü izin uygulama açıkken değiştiyse kaybolma beklenen davranıştır (T4).
18. **Sürüm notu yazılır (Önemli).** Sunucu değişmez, istemciler güncellenir; kapı açılan kullanıcılar yeni kart ve kargo alarmı görmeye başlar.
19. **Arşiv temizlemenin kalıpları kapsadığı kayda geçer (Küçük).** Davranış doğru, yalnız yazılı değildi (Ölçüm S).
20. **Kapsam dışı maddesi bildirimi de kapsar (Küçük).** (X4)
21. **`permissions.js` satır numarası düzeltilir (Küçük).** (Ölçüm 4)
22. **Kiosk kriteri bayrağı ve diziyi birlikte sabitler (Küçük).** (A-R6/2, AC-7)
23. **Yeni veri zinciri olmadığı ölçülür (Küçük).** (Ölçüm F, C3)
24. **Rozet ve boş sütun metninin kendiliğinden düzeldiği kriterlenir (Küçük).** (AC-3)
25. **Görsel kanıt alınır (Küçük).** Pano ekranları çekilir, değişen ekranlar onaylı işaretlenir.
26. **Tanımlamanın tekliği ve altı okuyucu DoD'de yazılır (Küçük).** (A-R3/2)

### Plan turunda verilen kararlar (2026-11-13)

Uygulama planının sekiz önerisi Takım Yöneticisi tarafından onaylandı.

| # | Konu | Karar | Yeri |
|---|---|---|---|
| 27 | QA kararı 17'nin iki ölçümü | Takım Yöneticisi yapar (Kullanıcı Geçmişi ve İşlem Geçmişi); uygulama ölçümü beklemez, sonuç T4'e işlenir | QA kararı 17, T4 |
| 28 | Yoklamanın ilk turu çift yükleme yapabilir | İlk tur veri sürümü yerleşmeden yüklemez | B-R1/5 |
| 29 | Tazelemenin dönüş şekli | Başarıda nesne, başarısızlıkta `false` | B-R1/6 |
| 30 | Süre dolduktan sonra gelen cevap | İzni yerleştirir; tek seferlik daralma kabul edilen sınır | B-R2/4 |
| 31 | Admin ve kısıtsız kullanıcı | Bekleme ayrı bayrağa bakar, kural değişikliği yok; testte iki örnek | AC-31 |
| 32 | Yedek parça kargo detayının koşulsuz kilidi | Dokunulmaz, README'de açık bulgu | X7 |
| 33 | Kanıt | İki yeni ekran (Stok sekmeli kullanıcı, salt okunur detay); var olan pano ekranları 0 fark. Kapı prop olarak geçtiği için var olan ekranlarda "bilinçli değişen" ekran olmayabilir | AC-33 |
| 34 | Yerel mod ve sunucu bilgisayarı | Bekleme kurulmaz; sunucu PC'de tazeleme `false` döner, testte sabitlenir | AC-12 |

### QA turu karar kaydı (2026-11-13)

| # | Karar | Derece | Yeri |
|---|---|---|---|
| 1 | Kapı `Stok VEYA Müşteriler` | Bloklayıcı | A-R2, A-R2/2 |
| 2 | B'nin kökü: yerel izin tazelenmiyor | Bloklayıcı | B-R1, B-R1/2 |
| 3 | Bekleme 1,5 saniye, geri düşüş yerel izin | Bloklayıcı | B-R2/2 |
| 4 | "Yerleşti" ölçütü ayrı bayrak | Bloklayıcı | B-R3/2 |
| 5 | Alarm ve bildirim kümesi kapıyı izler | Önemli | A-R3/3, C4 |
| 6 | Dört izin kimliği | Önemli | A-R4/2 |
| 7 | Arşiv ve planlanan kriteri izne göre bölünür | Önemli | AC-2, AC-18 |
| 8 | Kilit yalnız düzenleme izniyle | Önemli | A-R5/2 |
| 9 | Tek tanım, iki prop adı | Önemli | A-R2/3 |
| 10 | Sekme sözü ilk çizimle sınırlı | Önemli | AC-9 |
| 11 | Açılış süresi ölçütü somut | Önemli | AC-14 |
| 12 | Köprü yoksa bekleme yok | Önemli | B-R2/3 |
| 13 | Kiosk ilk çizimi | Önemli | B-R6/2, AC-25 |
| 14 | Bekleme ham izni bekler | Önemli | B-R4/2 |
| 15 | Grup kapısının sınırı | Önemli | C1/2 |
| 16 | Düzenleme izninin akordeon yeri | Önemli | A-R4/3 |
| 17 | İki ölçüm uygulamadan önce | Önemli | QA kararı 17, T4 |
| 18 | Sürüm notu | Önemli | Definition of Done |
| 19 | Arşiv temizlemenin kapsamı | Küçük | Ölçüm S |
| 20 | Bildirim de kapsam dışıdır | Küçük | X4 |
| 21 | `permissions.js` satırı | Küçük | Ölçüm 4 |
| 22 | Kiosk bayrağı ve dizisi | Küçük | A-R6/2, AC-7 |
| 23 | Yeni veri zinciri yok | Küçük | Ölçüm F |
| 24 | Rozet ve boş sütun metni | Küçük | AC-3 |
| 25 | Görsel kanıt | Küçük | Definition of Done |
| 26 | Tanım tekliği ve altı okuyucu | Küçük | A-R3/2, Definition of Done |


---

## Acceptance Criteria

- **AC-1.** Stok sekmesi olan, Müşteriler sekmesi olmayan kullanıcıda panonun sütunlarında Extra Kalıp kargo kartları çizilir.
- **AC-2.** Aynı kullanıcıda planlanan Extra Kalıp kargoları listesi dolu gelir; arşivlenen Extra Kalıp kargoları listesi `kalip_pano_arsiv` izni olan kullanıcıda dolu gelir (izni olmayan için AC-18).
- **AC-3.** Aynı kullanıcıda BEKLİYOR sütununun sayı rozeti Extra Kalıp kargolarını da sayar.
- **AC-4.** Stok sekmesi de Müşteriler sekmesi de olmayan kullanıcıda Extra Kalıp kargo kartları çizilmez (altı okuyucunun hepsinde).
- **AC-5.** `cust_kalip_edit` izni olmayan kullanıcıda kart sürüklenemez ve sorumlu seçilemez; kart tıklanınca detay penceresi açılır ve alanları pasiftir. Arşivleme ve "Hemen Düşür" ayrı kimliklere bağlıdır (AC-19).
- **AC-6.** Extra Kalıp düzenleme izni olan ama Müşteriler sekmesi olmayan kullanıcı kartı bir sütundan ötekine taşıyabilir ve kayıt sunucuda kabul edilir.
- **AC-7.** Kiosk kullanıcısında Extra Kalıp kargo kartları görünmez.
- **AC-8.** Yedek parça kargo kartlarının görünürlüğü, sütun eşlemesi ve alarmı değişmez.
- **AC-9.** İstemci modunda uygulama açıldığında sekme çubuğu **ilk çizildiği anda** sunucunun doğruladığı sekme listesini gösterir. Aynı oturumda yönetici izni değiştirirse listenin yoklamayla daralması beklenen davranıştır ve bu kriterin dışındadır (X5).
- **AC-10.** Aynı anda pano kartları da ilk çizimde doğru kümeyle gelir; görünüp kaybolan kart kalmaz.
- **AC-11.** İzin bilgisi gelene kadar hiçbir sekme içeriği çizilmez ve bu sırada tıklanabilir bir sekme bulunmaz.
- **AC-12.** Yerel modda ve sunucu bilgisayarında uygulama bugünkü gibi açılır, bekleme oluşmaz.
- **AC-13.** Sunucuya ulaşılamayan istemci (salt okunur mod) açılır ve bekleme dalında takılmaz.
- **AC-14.** Uygulamanın açılış süresi beklemenin üst sınırından (1,5 saniye) fazla uzamaz; çevrimdışı istemcide de bu sınır aşılmaz.
- **AC-15.** Sunucunun yetki kuralları, izin kimlikleri ve izin ekranı değişmez.
- **AC-16.** Yeni kalıcı alan, veri bölümü, göç ve birleştirme kuralı yoktur.

### QA turu kriterleri (2026-11-13)

**Extra Kalıp kargo kapısı**

- **AC-17.** Müşteriler sekmesi olan ama Stok sekmesi olmayan kullanıcı kartları bugünkü gibi görmeye devam eder (sütun, arşiv ve planlanan listesi).
- **AC-18.** `kalip_pano_arsiv` izni olmayan kullanıcıda arşiv listesi ve başlık sayısı Extra Kalıp kargolarını içermez; sütunlardaki kartlar görünmeye devam eder.
- **AC-19.** `kalip_pano_kaldir` izni olmayan kullanıcıda kartın arşivleme düğmesi ve planlanan satırındaki "Hemen Düşür" çizilmez.
- **AC-20.** Kapısı olan kullanıcıda yeni bir Extra Kalıp kargosu düştüğünde kart yanıp söner, alarm şeridine girer ve pano dışındayken uygulama bildirimi çıkar; kapısı olmayanda hiçbiri olmaz.
- **AC-21.** `cust_kalip_edit` izni olmayan kullanıcı kartın detayını açtığında kayıt kilidi alınmaz; izni olan kullanıcıda kilit bugünkü gibi alınır.
- **AC-22.** Kapı tek yerde tanımlıdır ve altı okuyucu aynı değeri okur (kaynak taraması).
- **AC-23.** Kiosk çağrısı Extra Kalıp dizisini de kapı bayrağını da geçirmez.
- **AC-24.** Sütun rozeti, "Planlanan (n)" sayısı ve boş sütun metni Extra Kalıp kargolarını da hesaba katar.

**İzin beklemesi**

- **AC-25.** Kiosk kullanıcısı ilk çizimde doğrudan panoyu görür; kiosk olmayan kullanıcıya kiosk ekranı bir an bile çizilmez.
- **AC-26.** Jeton tazelemesi sunucudan gelen izni yerel ayara yazar ve çağırana döndürür.
- **AC-27.** Yönetici izni değiştirdikten sonra kullanıcı uygulamayı yeniden açtığında ilk çizim yeni izni gösterir; eski izinle çizip daralma olmaz.
- **AC-28.** Tazeleme 1,5 saniyede sonuçlanmazsa uygulama yerel ayardaki izinle çizilir ve bekleme dalında kalmaz; cevap gelince izin yerleşir.
- **AC-29.** Tazeleme hata dönerse (sunucuya ulaşılamayan istemci) uygulama açılır ve salt okunur mod bugünkü gibi çalışır.
- **AC-30.** Sunucu köprüsü ya da tazeleme işlevi yoksa bekleme hiç kurulmaz, uygulama hemen çizilir.
- **AC-31.** Bekleme ham izni bekler; izin alanı boş olan kullanıcı (admin, kısıtsız kullanıcı) beklemede kalmaz.
- **AC-32.** Yoklamanın ilk turu beklemeden bir kez çalışır.

**Kanıt**

- **AC-33.** Pano ekranlarının görsel kanıtı alınır; Extra Kalıp kargo kartı eklenen ekranlar bilinçli değişiklik olarak onaylı işaretlenir, öteki ekranlarda fark çıkmaz.

---

## Definition of Done

- A ve B parçalarının bütün kriterleri karşılanır.
- Panonun Extra Kalıp kapısı tek yerde tanımlıdır ve **altı** okuyucusu onu çağırır (Ölçüm A); panodaki ve ayrı pencereye giden prop adları korunur.
- Kapı birleşimdir: Stok sekmeli kullanıcı kartları görmeye başlar, Müşteriler sekmeli kullanıcı hiçbir şey kaybetmez.
- Kartın dört izin kimliği (`cust_kalip_edit`, `kalip_pano_kaldir`, `kalip_pano_arsiv` ve yedek parça tarafının `yedek_parca_edit`'i) spec'te yazılıdır ve kriterler bu dağılıma göre bölünmüştür.
- Detay penceresi salt okunur kullanıcıda kayıt kilidi almaz.
- Jeton tazelemesi sunucudan gelen izni yerel ayara yazar ve döndürür; ilk çizim bu sonuca bağlıdır, yoklamanın ilk turu beklemeden çalışır.
- İzin beklemesi istemci moduyla sınırlıdır, üst sınırı 1,5 saniyedir ve yerel mod, sunucu bilgisayarı, salt okunur mod ile köprüsüz ortam testlerle sabitlenir.
- Videodaki senaryo yeniden oynatıldığında kart ve sekme kaybolması görülmez.
- Uygulamadan önce iki ölçüm yapılır (QA kararı 17): videodaki kullanıcının sunucudaki izin listesi ve video çekilirken giriş yapılıp izinlerin değiştirilip değiştirilmediği. Sonuç T4'e işlenir.
- Görsel kanıt alınır (AC-33) ve `docs/evidence/kanit-eslemesi.json` kaydı güncellenir.
- Sürüm notu yazılır: sunucu değişmez, istemciler güncellenir; kapısı açılan kullanıcılar panoda yeni kartlar ve kargo alarmı görmeye başlar; kartı düzenletmek için yöneticinin `cust_kalip_edit` kutusunu Müşteri işlemleri akordeonundan işaretlemesi gerekir.
- Açık bulgu (X1) `specs/README.md`'ye ayrı bir kusur olarak yazılır (2026-11-13'te yazıldı).

---

## SCORECARD

| | |
|---|---|
| **Uygulama** | — |
| **Plan** | — |
| **Kanıt** | — |
| **Notlar** | — |
