# 0064 — Eksik Kayıt Kilitleri: Giderler, Kasa, Katalog, Ayarlar ve Veri Araçları

| | |
|---|---|
| **Durum** | Tamamlandı (commit `6e112f2`, dal `feat/0064-kilit`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler ve Kasa'nın bütün pencereleri, çek portföyü, Ayarlar > Katalog, Ayarlar > Giderler/Firma/Uygulama, Çöp Kutusu, Sahipsiz Kayıtlar, yedekten geri yükleme |
| **Bağımlı spec'ler** | 0001, 0003 (Anasayfa ödeme penceresi), 0021, 0024, 0040, 0046, 0049, 0053, 0056, 0058 (kilitsiz doğan ekranlar) · 0065 (parça stoğu, kilitle çözülmeyen kardeş sorun) |
| **Revizyon** | R1 (QA turu, 2026-10-01): geliştirici hazırlığı denetimi, 18 bulgu işlendi, 3'ü bloklayıcıydı. Ödeme penceresinin **Anasayfa'dan da** açıldığı ve tek kilidin para hatasını kapatmadığı bulundu (R1), katalog satır kilidinin dayandığı ekleme kaybını çözmediği görülüp panel kilidine çevrildi (R7), "devralarak devam"ın bugünkü API'de karşılığı olmadığı tespit edildi (R13). R20–R24, C6–C7, X6 ve AC-24…AC-38 eklendi.<br>**R2 (2026-10-01, plan onayı):** bütün öneriler kabul (Q1–Q11): aynı kaydı tutan pencereler ebeveynde tek kilit paylaşır (R25), ortak sarmalayıcı yazılmaz (R26), `optimize` ve `mailsablon` kilitli panellere eklendi ve AC-28'in listesinden `optimize` çıktı (R27), anlık denetim tek kancada (R28), kapsam dışı işleminin baktığı kilitler (R29), çalışan paneli ve satırı (R30), Ayarlar açılış paneli (R31), devralma sınırı ve bırakma (R32), AC-35 ölçüsü (R33), kanıt (R34), bilinen sınırlar (R35).<br>**R3 (2026-10-01, triyaj):** ciro ve "Çek Yaz" ödediği kalemlerin kilidine bakar (R36, spec'in kapsam boşluğuydu), gider kalemini çöpe taşıma kilit alır (R37), kilit listesi birden çok abonede canlı kalır (R38), avans formu çalışan seçili açılmaz (AC-37'nin uygulaması); AC-39…AC-42 eklendi. |

---

## Intent

Uygulamada çok kullanıcılı çalışmanın iki koruması var: iyimser `dataVersion` kilidi (çakışmada 409 ve
birleştirme) ve kayıt bazlı **karamsar kilit** (`useLock`, "bu kaydı şu an başkası düzenliyor").
İkinci koruma on bir alanda var: teklif, fatura, müşteri, bayi, not, yedek parça, Extra Kalıp, parça
stoğu kartı, makina stoğu, stok serisi, üretim formu.

**Giderler, Kasa ve çek portföyünde hiç yok.** Tarama `src/components/gider/`,
`src/components/kasa/` ve `src/components/cek/` klasörlerinde `useLock`, `LockConflict` ve `crmLocks`
sözcüklerinin **hiçbirini** bulmuyor. Ayarlar klasöründe de yok: katalog yöneticileri (modeller,
kalıplar, parçalar), çalışanlar, Çöp Kutusu ve Sahipsiz Kayıtlar araçları kilitsiz.

Geriye kalan `dataVersion` koruması yetmiyor, çünkü çakışma birleştirmesi yalnız **eklemeleri** geri
uygular; var olan kaydın düzenlemesi yeniden yüklenen kopyaya yeniliyor. Bu iki sonuç doğuruyor:

1. **Sessiz kayıp.** Aynı gider kalemini, aynı modeli ya da aynı çalışanı iki kişi düzenlerse birinin
   işi kaybolur.
2. **Para hatası.** Aynı kaleme iki kişi aynı anda ödeme girerse iki ödeme hareketi de **yeni kayıt**
   olduğu için ikisi de birleştirmeden sağ çıkar: kalem iki kez ödenmiş olur. Aynı mekanizma çek
   cirosunda bir çeki iki alacaklıya gönderebilir.

Başarı şu demek: para ve tanım yazan her pencere, uygulamanın geri kalanıyla aynı kilidi kullanıyor;
iki kullanıcı aynı kayda girdiğinde ikincisi bugünkü "başkası düzenliyor" ekranını görüyor.

---

## Requirements

### A. Giderler, Kasa ve çek

- **R1.** **Gider kalemi:** `gider` alanı, kalem kimliğiyle. Tek alan **dört pencereyi** kapsar:
  gider formu, **Giderler'in** ödeme penceresi, **Anasayfa'nın** ödeme penceresi ve ödeme planı. Müşteri
  kilidinin servis formunu kapsaması emsali; böylece aynı kaleme iki kişi aynı anda ödeme giremez.
  **Anasayfa kolu atlanamaz:** `OdemeKayitPenceresi`'nin iki çağıranı var (`Giderler.jsx:349` ve
  `Dashboard.jsx:591`, 0003 ödeme hatırlatıcısı); yalnız Giderler bağlanırsa biri Giderler'den öbürü
  Anasayfa'dan aynı kaleme ödeme girer ve bu spec'in var olma sebebi olan para hatası açık kalır. App
  `savedUsername`'i Dashboard'a `aktifKullanici` olarak geçirir (bugün yalnız Notes ve ServisPanosu'na
  geçiyor, `App.jsx:1493`, `:1495`).
  **Listedeki ödendi anahtarı ve ödeme planı satırı da bu kilide tabidir**, R14'e değil: 0024/0053'ten
  beri anlık yazmıyorlar, ödeme penceresini açıyorlar (`Giderler.jsx:178`
  `odendiDegistir = (k) => setOdemeHedefi({ … })`; `hedefDegistir` aynı).
- **R2.** **Çek:** `cek` alanı, çek kimliğiyle. Ciro, kendi çekimiz, çek durumu ve çek geçmişi
  pencerelerini kapsar. Yeni çek eklemede kimlik yok, kilit alınmaz (bugünkü kural).
- **R3.** **Kasa hesabı:** `kasa_hesap` alanı. Hesap formu ve 0056'nın hesap silme/taşıma penceresini
  kapsar.
- **R4.** **Tedarikçi** (`tedarikci`) ve **üretim partisi** (`uretim_partisi`) formları kilitlenir.
- **R5.** **Çalışan:** `calisan` alanı. Avans ver, avanstan mahsup ve Ayarlar'daki çalışan düzenlemesini
  kapsar (ad değişikliği servis teknisyeni alanına yayıldığı için). **Avans penceresi mount anında
  kilitlenemez:** form açıldığında çalışan henüz seçilmemiştir (`kasa/CalisanAvanslari.jsx:15`) ama
  `useLock` kimliği mount anında ister (`useLock.js:14-19`). Bu yüzden kilit **seçilen çalışana** bağlanır
  ve seçim değişince yeniden alınır (`useLock("calisan", form.calisanId || null)`); emsal
  `CustomerAddEditForm.jsx:32`'deki `useLock("stok-seri", isStockSerialPick ? … : null)`. Var olan
  çalışana bağlandığı için R17'ye aykırı değildir.
- **R6.** Virman penceresi **kaynak** hesabın `kasa_hesap` kilidini alır. **Hedef hesap kilitlenmez:**
  hedefi de kilitlemek tek virmanın iki hesabı bloke etmesine ve ikinci meşru virmanın veri sebebi
  olmadan reddedilmesine yol açar. İki karşıt virman (A→B ve B→A) ayrı kaynakları kilitler, ikisi de yeni
  hareket kaydı doğurur ve ikisi de birleştirmeden sağ çıkar; bu bir hata değil, iki ayrı meşru virmandır.

### B. Katalog ve ayarlar

- **R7.** **Katalog panelleri** kilitlenir, satır değil: R9'un şemasıyla alan `ayar`, kimlik Ayarlar
  kalem kimliği (`models`, `kaliplar`, `yedekparca`, `parcatipi`). **Satır kilidi bu işi yapamaz:** katalog
  listeleri birleştirmeye girmediği için (`merge.js`'te `standardModels`, `customModels`, `kalipDefs`,
  `parts`, `partTypeDefs` **hiç geçmiyor**) çakışmada yeni eklenen kayıt da kayboluyor; R17 gereği yeni
  kayıtta kilit alınmadığından satır kilidi yalnız düzenleme yarışını kapatırdı. Panel kilidiyle iki
  kullanıcı aynı panelde aynı anda olamaz, böylece **düzenleme yarışı ve ekleme kaybı birlikte** kapanır
  ve tek şema kullanılır (R19). Bedeli, iki yöneticinin katalog panelinde eşzamanlı çalışamamasıdır;
  bunlar seyrek dokunulan tanım listeleridir. **Reddedilen alternatif:** listeleri `MERGE_KEYS`'e eklemek
  hem C1'i ihlal eder hem başka bir iştir, çünkü katalog kayıtlarına atıflar **adla** yapılıyor (gider
  model satırları, `customers.model`) ve kimlik yeniden atama bir şey çözmez.
- **R8.** **Model yeniden adlandırma** (çok bölümlü yazım) kilidi alınmadan başlatılmaz. **Bilinen
  sınır:** satır kilidi aynı modelin iki eşzamanlı adlandırmasını önler, bu adlandırmayla alakasız bir
  müşteri düzenlemesinin yarışını önlemez; o yarış `dataVersion` korumasında kalır.
- **R9.** **Veri yazan ayar panelleri** kilitlenir: alan `ayar`, kimlik **Ayarlar kalem kimliği**
  (`Settings.jsx:44-54`'teki sabit `id`'ler). Kilitlenenler: `app`, `musteri`, `servispano`, `company`,
  `calisanlar`, `models`, `kaliplar`, `yedekparca`, `parcatipi`, `gidertur`, `gidertanim`, `giderayar`,
  `kdv`, `kkkomisyon`, `evrak`, `ceviri`, `takip`, `backup`, `import`, `trash`, `sahipsiz`. Ölçüt
  "bu panel veri yazıyor mu"dur; **salt okunur paneller hiç kilitlenmez** (`securitylog`, `auditlog`,
  `sentmail`, `securitystatus`, `export`, `optimize`). Farklı panellerde çalışan iki yönetici birbirini
  engellemez. İki düzeltme: **"çalışma saatleri" ayrı panel değildir** (`company`'nin içinde, onun
  kimliğini paylaşır) ve `appSettings` yazan `kdv`, `kkkomisyon`, `takip`, `servispano` listeye eklenmiştir.
  **Yazan panel açılınca kilitlenir** (`useLock` mount anında alır); yani ikinci yönetici o paneli
  görüntüleyemez de. Bu uygulamada emsalli: `CustomerDetailModal.jsx:106` müşteri detayını **okumak** için
  açınca `customer` kilidini alıyor. X5'in "okuma kilidi yok" maddesi **kim nereye bakıyor göstergesini**
  yasaklar, bunu değil; "ilk düzenlemede kilitle" diye yeni bir desen uydurmak `useLock`'u değiştirmek
  demektir ve X3'e aykırıdır.
- **R10.** Ayarlar kilidi, `appSettings` birleştirmesindeki "yerel kazanır" kuralını **değiştirmez**;
  kilit o kuralın devreye girmesini baştan engeller.

### C. Veri araçları

- **R11.** **Çöp Kutusu** araç düzeyinde tek sahiplidir: geri alma, kalıcı silme ve çöpü boşaltma aynı
  anda iki kullanıcıda açılamaz. **Yeni alan açılmaz**, R9'un şeması kullanılır (`ayar` + `trash`); Çöp
  Kutusu bir Ayarlar panelidir ve ayrı bir `cop_kutusu` alanı R19'un tek listesini gereksiz büyütürdü.
- **R12.** **Sahipsiz Kayıtlar** aynı şekilde (`ayar` + `sahipsiz`); yeni alan yok.
- **R13.** **Yedekten geri yükleme** iki adımdır ve kendisi de R9 şemasıyla kilitlenir (`ayar` + `backup`
  / `import`):
  **(a) Ön denetim.** `crmLocks.list()` ile başka kullanıcının elinde kilit olup olmadığı denetlenir;
  varsa **sahip + alanın insan okunur etiketi + kayıt kimliği** yazılır ve işlem yapılmaz. Etiket haritası
  R19'un tek listesinden gelir; ham değerle yazılsa ekranda "customer 412" görünürdü.
  **(b) Devralma.** Yönetici devam etmek isterse listedeki **her kilit için sırayla**
  `crmLocks.acquire(tur, id, true)` çağrılır; sunucu değişmez. Bugünkü API'de "başkalarının bütün
  kilitlerini bırak" diye tek bir çağrı **yoktur**: `crmLocks` yalnız dört işlem veriyor
  (`acquire`, `release`, `list`, `releaseAll`; `preload.cjs:234-239`) ve `DELETE /api/locks/all` isteyenin **kendi** kilitlerini
  bırakıyor. Döngüde başarısız olan kilitler sayıyla bildirilir (R24).
  **Neyi koruduğu:** ön denetim başkasının **yarım kalmış işini görünür kılar**, geri yüklemenin verisini
  korumaz; veri koruması `dataVersion` ve yedeğin kendisidir.

### D. Anlık işlemler

- **R14.** Pencere açmayan anlık işlemler kilit **tutmaz**, Servis Panosu emsalini kullanır: işlem
  anında canlı kilit listesine bakılır ve kayıt **başkası** tarafından kilitliyse işlem reddedilip
  bildirim verilir (`ServisPanosu.jsx:131-133`, `k.locked_by !== aktifKullanici`). **Ölçüt:** pencere
  açmayan, doğrudan `setX` çağıran işlem. **Kapsam** (ölçülmüş): Kasa'da **hesabı kapat/aç**
  (`Kasa.jsx:233`), **kapsam dışı bırak / kapsama al** (`:302`) ve ekstreden **avans silme**.
  Giderler'in ödendi anahtarı ile ödeme planı satırı bu listede **değildir**: 0024/0053'ten beri pencere
  açıyorlar, dolayısıyla R1'in kalem kilidine tabidirler.
- **R15.** Kendi kullanıcısının tuttuğu kilit hiçbir yerde engel değildir.

### E. Ortak davranış

- **R16.** Kilitli kayıtta bugünkü **aynı** ekran gösterilir (`LockConflict`: kimin tuttuğu, ne zaman
  aldığı ve "kilidi devral"); yeni bir uyarı dili yazılmaz.
- **R17.** Yeni kayıtta (kimlik yok) kilit alınmaz.
- **R18.** Kilit **fail-open** kalır: kilit servisine ulaşılamazsa iş engellenmez (bugünkü davranış).
- **R19.** Kilit alanları ve kimlikleri **tek yerde** listelenir, böylece hangi pencerenin hangi alanı
  paylaştığı tek bakışta görünür ve iki pencere aynı kaydı farklı alan adıyla kilitlemez. **Ölçülebilir
  biçim:** liste saf bir modülde durur (ör. `src/lib/kilitAlanlari.js`: alan adı → insan okunur etiket +
  alanı paylaşan pencereler) ve ölçü `useLock(` çağrılarının birinci argümanlarının **tamamının** bu
  listede olmasıdır (kaynak taraması). Etiket haritası R13 (a)'nın ekranını da besler. Yorum satırıyla
  "karşılanmış" sayılamaz.
  **Ad paylaşımı kasıtlıdır:** `kasa_hesap` gibi adlar hem denetim kaydı varlığı
  (`logAction({ entity: "kasa_hesap" })`) hem izin kimliği hem kilit alanıdır; aynı kavram üç listede aynı
  adla geçer ve bu bilinçlidir, ileride "çakışıyor" diye yeniden adlandırılmaz.

### F. QA turunda eklenenler (R1)

- **R20.** **Mahsup iki kilit ister.** "Avanstan mahsup" kipi `OdemeGirisi`'nin içindedir, yani pencere
  zaten `gider` kilidini tutar; ama mahsup bir **çalışanın** açık avansını tüketir. Mahsup kipi açıkken
  ikinci kilit (`calisan`, kalemin `calisanId`'si) de alınır; ikisinden biri çakışıyorsa `LockConflict`
  çizilir. Gerekçe: iki kişi aynı çalışanın tek avansını iki ayrı maaş kalemine mahsup ederse
  `mahsupDogrula` her istemcide kendi eski durumuna bakar ve avans iki kez tüketilir; bu, R1'in kapattığı
  çift ödemeyle aynı sınıf bir para hatasıdır.
- **R21.** **Panel ve araç kilidinde de `LockConflict` kullanılır, yeni bileşen yazılmaz** (R16). Ekran
  kayıt dilinde yazılmıştır; başlığa geçirilen **ad** çağırandan gelir (bugün de bağlam çağırandan
  geliyor). Panel kilidi de aynı üç bilgiyi gösterir: kim, ne zaman, devral.
- **R22.** `useLock`'un JSDoc'undaki alan listesi **elle sayılmaz**, `kilitAlanlari.js`'e atıf yapar.
  Bugünkü liste zaten eksik ve yanlış: sekiz ad sayıyor (`customer`, `dealer`, `stock`, `note`, `teklif`,
  `fatura`, `service`, `part_sale`), oysa `yedek_parca`, `partstock`, `stok-seri` ve `uretim_formu` da
  kullanılıyor ve `service` hiç kullanılmıyor.
- **R23.** **Görsel kanıt sahte çakışma durumuyla üretilir.** Görüntü aracı ikinci kullanıcıyı simüle
  edemez; kanıt ekranları `LockConflict` çizilmiş hâlde (sahte `lockConflict` nesnesiyle) eklenir ve
  kayıtları `docs/evidence/kanit-eslemesi.json`'a girer. Yeni ekran oldukları için `beklenen: "degisti"`
  gerekmez.
- **R24.** **Devralma döngüsünün sınırı yazılır.** Kilit uç noktaları `writeLimiter(200)` ile sınırlıdır
  (kullanıcı başına dakikada 200 yazım) ve her kilit 60 saniyede bir yeniden alınır (`useLock.js:51`).
  Gündelik kullanımda bir kullanıcı bir kilit tutar, risk yoktur; tek gerçek risk R13 (b)'nin yığın
  devralmasıdır. O döngüye üst sınır konur ve 429 dönerse anlamlı bir mesaj yazılır ("kilitlerin bir kısmı
  devralınamadı, az sonra yeniden deneyin"), sessizce yarıda kalmaz.

### G. Plan onayında eklenenler (R2)

- **R25.** **Aynı kaydı tutan pencereler tek kilidi paylaşır.** `useLock` kapanışta kilidi bütünüyle bıraktığı için her
  pencere ayrı kilit alırsa (ör. ödeme planı açıkken içinden ödeme penceresi) üstteki kapanınca alttaki kilitsiz kalır.
  Kilit pencereleri açan **ebeveynde tek** `useLock` ile alınır: Giderler'de `gider` (ödeme / form / plan kalemi), çek
  portföyünde `cek` (ciro, durum, geçmiş, verilen çek durumu ve geçmişi), Kasa'da `kasa_hesap` (hesap formu ve silme).
- **R26.** **Ortak sarmalayıcı bileşen yazılmaz:** bugünkü desen aynen (ebeveyn `useLock`, çakışmada `Modal` +
  `LockConflict`). Kimliği formun içinde belirlenen pencerelerde (virman kaynak hesabı, avans çalışanı, mahsup) kilit
  formun içinde alınır ve `LockConflict` pencerenin gövdesinde çizilir.
- **R27.** **`optimize` ve `mailsablon` kilitli panellerdir** (R9'un ölçütü: veri yazıyor). `optimize` model ve kalıp
  resimlerini ve ayarları yazar; kendi kimliğiyle kilitlenir, katalog panelleriyle yarışı `dataVersion`'a kalır.
  `eposta`, `security`, `server` bilgisayara özgü ayar yazar (blob değil), kilitlenmez.
- **R28.** **Anlık işlem denetimi tek kancadadır:** Servis Panosu'nun canlı kilit listesi ve `baskasiKilitli`
  `src/hooks/useKilitListesi.js`'e taşınır; pano ve Kasa aynı kancayı kullanır.
- **R29.** **Kapsam dışı işlemi satırın kendi kaydının kilidine bakar:** servis tahsilatı `customer` (müşteri kimliği),
  Extra Kalıp `part_sale`, yedek parça `yedek_parca`, gider ödemesi `gider` (kalem), avans `calisan`. Toplu işlemde tek
  satır başkasının kilidindeyse işlem bütünüyle reddedilir. Hesap kapat/aç `kasa_hesap`, ekstreden avans silme `calisan`.
- **R30.** **Firma Çalışanları:** panel `ayar` + `calisanlar` kilidini alır (R9), satır içi düzenleme ayrıca satırın
  `calisan` kilidini alır (R5).
- **R31.** **Ayarlar'ın açılış paneli `app` kalır;** ikinci yönetici o panelde `LockConflict` görür, sol menü açık kalır.
  "Geri Dön" kullanıcının görebildiği ilk salt okunur panele geçer (yoksa yerinde kalır).
- **R32.** **Devralma döngüsü en çok 50 kilit** alır; fazlasında işlem yapılmaz ve sebebi yazılır. Başarısız ya da 429
  dönen kilit sayılır ve hepsi alınmadıkça geri yükleme başlamaz; geri yükleme bitince devralınan kilitlerin hepsi
  bırakılır.
- **R33.** **AC-35 ölçüsü:** `gider/`, `kasa/`, `cek/` ve `settings/` altındaki her dosya `kilitAlanlari.js`'te ya bir
  alanın pencere listesinde ya gerekçeli "kilitsiz" listesindedir; listede olmayan yeni dosya testi düşürür.
- **R34.** **Kanıt:** görüntü aracı ilgili ekranlarda `window.crmLocks`'u sahte kurar; kilitli gider formu, ödeme penceresi,
  katalog paneli, Çöp Kutusu ve geri yükleme ön denetimi. Kilitsiz hâldeki mevcut ekranlar 0 piksel kalır.
- **R35.** **Bilinen sınırlar:** katalog listelerine Ayarlar dışından yapılan eklemeler panel kilidinin dışındadır; müşteri
  detayı ile servis formunun aynı `customer` kilidini ayrı ayrı alması (R25'teki açık) bugünkü hâliyle kalır.

### H. Triyajda eklenenler (R3)

- **R36.** Çek Portföyü'nde ciro ve "Çek Yaz" seçilen gider kalemlerine ödeme hareketi yazar. Kayıt anında bu kalemlerden
  biri başka kullanıcının `gider` kilidindeyse işlem reddedilir ve hiçbir hareket ya da çek yazılmaz (R14 deseni). Çekin
  kendi kilidi (R2) bu kalemleri korumaz.
- **R37.** Gider kalemini çöpe taşıma onayı kalemin `gider` kilidini alır (R25: form, ödeme penceresi, ödeme planı ve
  silme tek kilit); başkası tutuyorsa onay yerine çakışma ekranı çıkar.
- **R38.** Canlı kilit listesi (`useKilitListesi`) aynı anda birden çok ekranda açık olabilir; kilit değişikliği olayı
  bütün açık abonelere ulaşır (tek köprü dinleyicisi, referans sayımı).

---

## Constraints

- **C1.** **Sunucu, veritabanı, izin ve birleştirme değişmez.** Kilit uç noktası `entityType`'ı serbest
  metin olarak alıyor, beyaz liste yok; iş tamamen istemci tarafı bağlamadır.
- **C2.** Kilit **görünüm katmanı değil veri koruması**dır, ama hesap yapmaz: tutar, durum ve izin
  hiçbir yerde kilide bağlanmaz.
- **C3.** Kilit süresi, kalp atışı ve devralma bugünkü hâliyle kalır (2 dakika, 60 saniyede bir, zorla
  devralma güvenlik günlüğüne yazılır).
- **C4.** Tek kullanıcılı yerel kipte davranış değişmez (kilit servisi yoksa kilit yok).
- **C5.** Kullanıcıya görünen metinler Türkçedir.
- **C6.** **`useLock` ve `LockConflict` değişmez** (X3): kilit mount anında alınır, unmount'ta bırakılır;
  "ilk düzenlemede kilitle" gibi yeni bir desen uydurulmaz. Yeni pencereler bugünkü kancaya bağlanır.
- **C7.** **Kilit kimliği mount anında bilinmiyorsa alan boş bırakılır ve seçim yapılınca alınır**
  (`stok-seri` emsali); kimlik uydurulmaz ve "yeni kayıt" sayılmaz.

### KAPSAM DIŞI

- **X1.** **Parça stoğunun çakışmada kaybolması** — *neden:* bu bir kilit sorunu değil, birleştirme
  boşluğu; stok küresel olduğu için kilitle çözülemez. Ayrı spec **0065**.
- **X2.** Kullanıcı yönetimi (izin düzenleme) — *neden:* blob değil, kullanıcı başına sunucu uç
  noktası; son yazan kazanır ve bu kabul edilebilir. İstenirse ayrı iştir.
- **X3.** Kilit süresinin, devralma kurallarının ya da `LockConflict` ekranının değişmesi — *neden:*
  R16, C3; bu iş var olan deseni eksik ekranlara taşır, deseni yeniden tasarlamaz.
- **X4.** Satır düzeyinde eşzamanlı düzenleme (iki kişinin aynı kaydın farklı alanlarını birlikte
  düzenlemesi) — *neden:* uygulamanın modeli bütün blobu yazıyor; alan bazlı birleştirme bambaşka bir iş.
- **X5.** "Şu an kim nereye bakıyor" göstergesi — *neden:* istenmedi, gürültü yapar. **Bu madde, yazan bir
  panelin açılınca kilitlenmesini yasaklamaz** (R9); bugünkü müşteri detayı da okumak için açılınca
  kilitleniyor.
- **X6.** Katalog listelerinin `MERGE_KEYS`'e eklenmesi — *neden:* R7; C1'i ihlal eder ve atıflar adla
  yapıldığı için kimlik yeniden atama bir şey çözmez. Ayrı iştir.

---

## Context

- **Tarama (doğrulandı).** `useLock` on bir dosyada ve on bir alanda: `teklif`, `fatura`, `customer`,
  `dealer`, `note`, `yedek_parca`, `part_sale`, `partstock`, `stock`, `stok-seri`, `uretim_formu`.
  `gider/`, `kasa/`, `cek/` ve `settings/` klasörlerinde tek bir kilit izi yok.
- **Kilit eklemek ucuz.** `POST /api/lock` gövdesinde `entityType` ve `entityId` istiyor, türü
  doğrulamıyor; yani yeni alan açmak için sunucuda yapılacak hiçbir şey yok. Kanca
  (`useLock(entityType, entityId)`) ve ekran (`LockConflict`) hazır. İşin tamamı pencere başına iki
  satır bağlama ve bir koşullu çizim.
- **Neden `dataVersion` yetmiyor.** Birleştirme planı (`buildMergePlan` + `mergeLocalIntoReloaded`)
  yirmi bir bölümün **eklemelerini** geri uygular. Var olan kaydın düzenlemesi geri uygulanmaz. Yani
  iki kişi aynı kalemi düzenlediğinde kaybeden taraf sessizce kaybeder.
- **Para hatasının mekanizması.** Ödeme bir **hareket kaydıdır** (0024). İki kullanıcı aynı kaleme
  ödeme girdiğinde iki ayrı yeni kayıt doğar; ikisi de "ekleme" olduğu için birleştirmede ikisi de
  korunur. `kasa.odemeDogrula`'nın "kalandan fazla ödeme" denetimi her istemcide **kendi eski
  durumuna** göre çalıştığı için bunu yakalayamaz. Sonuç: kalem iki kez ödenmiş görünür, kasa bakiyesi
  iki kez düşer. Ciroda aynı mekanizma bir çeki iki alacaklıya gönderir; çekin durumu düzenleme olduğu
  için yalnız biri kazanır ve ortada kaydı tutmayan hareketler kalır.
- **Katalogda kayıp daha sert.** `standardModels`, `customModels`, `kalipDefs`, `parts` ve
  `partTypeDefs` **birleştirmeye girmiyor** (`MERGE_KEYS` listesinde yok). Yani çakışmada bu
  listelerde yalnız düzenleme değil, **yeni eklenen kayıt da** toptan kayboluyor; sunucudan gelen liste
  olduğu gibi kazanıyor. Kilitli olan `dealers`, `notes` ve `stock` da birleştirmeye girmiyor; oradaki
  koruma tam olarak kilidin kendisi. Yani tasarımın mantığı şu: bölüm birleşiyorsa ekleme güvende,
  birleşmiyorsa kilit şart. Katalog her ikisinin de dışında kalmış.
- **Çalışanlar yarı korumalı.** `calisanlar` birleştirmede var (bir kez kaybolduğu için eklenmişti),
  ama kilit yok: ekleme güvende, ad değişikliği değil.
- **`appSettings`'te kayıp bilinçli bir kuralın yan etkisi.** `mergeAppSettings` bu bilgisayarın
  ayarlarını yeniden yüklenenin üstüne yazıyor ("yerel kazanır"), çünkü LAN'da kendi değişikliğinin
  geri alınması daha kötüydü. Doğru karar, ama iki yönetici aynı anda ayar değiştirdiğinde birinin
  değişikliği sessizce geri alınıyor. Kilit bu çakışmayı baştan engeller (R10).
- **Eşzamanlılık bu modülde zaten yaşandı.** Giderler bugün şu uyarıyı taşıyor: "Aynı tanımdan bu
  dönemde birden fazla kalem var. **İki kullanıcı aynı ayı aynı anda oluşturmuş olabilir**; fazla
  olanı silin." Yani tekrarlayan gider üretiminde çakışma görülmüş ve kilit yerine uyarıyla idare
  edilmiş. Bu spec o uyarıyı gereksizleştirmeyi değil, sınıfı kapatmayı hedefliyor.
- **QA turu: iki çağıran ve iki stale madde.** (1) `OdemeKayitPenceresi` Giderler'den **ve** Anasayfa'dan
  açılıyor (`Giderler.jsx:349`, `Dashboard.jsx:591`); tek kol bağlanırsa para hatası kapanmaz (R1).
  (2) Giderler'in ödendi anahtarı ve ödeme planı satırı 0024/0053'ten beri **anlık değil**, pencere
  açıyorlar; R14'ün kapsamı buna göre daraltıldı. Gerçekten anlık olanlar `Kasa.jsx:233` (kapat/aç) ve
  `:302` (kapsam dışı).
- **Kilit mount anında alınıyor.** `useLock(entityType, entityId)` kimlik verildiği anda kilidi alıyor ve
  unmount'ta bırakıyor (`useLock.js:18-63`); "ilk düzenlemede kilitle" diye bir kip yok. Bu yüzden panel
  ve araç kilitleri **açılışta** devreye girer (R9) ve avans gibi kimliği sonradan belirlenen formlarda
  kimlik boş başlar (R5, C7).
- **Devralma API'si tek yönlü.** `crmLocks` yalnız `acquire / release / list / releaseAll` veriyor ve
  sunucudaki `DELETE /api/locks/all` isteyenin **kendi** kilitlerini bırakıyor; "başkalarının kilitlerini
  topluca devral" diye bir uç nokta yok. R13 (b) bu yüzden döngüyle çözülür, sunucu değişmez (C1).
- **Anlık işlemler için emsal var.** Servis Panosu'nda kutu sürükleme kilit tutmuyor; bunun yerine
  canlı kilit listesi izleniyor ve bırakma anında kayıt başkasındaysa hareket reddedilip bildirim
  veriliyor. Ödendi anahtarları ve kapsam dışı düğmeleri aynı şekle oturur (R14).

---

## Acceptance Criteria

### Giderler, Kasa, çek

- **AC-1.** Bir kullanıcı gider kalemini düzenlerken ikinci kullanıcı aynı kalemi açınca "başkası
  düzenliyor" ekranını görür.
- **AC-2.** Aynı kaleme ödeme girişi ikinci kullanıcıda açılamaz (gider formu ve **Giderler'in** ödeme
  penceresi aynı alanı paylaşır).
- **AC-3.** Ödeme planı penceresi, listedeki ödendi anahtarı ve hedef anahtarları da aynı kalem kilidine
  tabidir (hepsi pencere açar, R1).
- **AC-4.** Aynı çeki iki kullanıcı aynı anda ciro edemez.
- **AC-5.** Çek durumu ve geçmişi pencereleri aynı çek kilidine tabidir.
- **AC-6.** Aynı kasa hesabını iki kullanıcı aynı anda düzenleyemez; hesap silme/taşıma penceresi de
  aynı kilide tabidir.
- **AC-7.** Tedarikçi, üretim partisi ve Ayarlar'daki çalışan düzenlemesi kilitlidir.
- **AC-8.** Virman penceresi kaynak hesabı kilitler.
- **AC-9.** Yeni kayıt (kimliksiz) açılışında kilit alınmaz ve kimse engellenmez.

### Katalog, ayarlar, araçlar

- **AC-10.** Aynı makina modelini iki kullanıcı aynı anda düzenleyemez (panel kilidi, R7).
- **AC-11.** Kalıp tanımı, parça ve parça türü **panelleri** kilitlidir ve ikinci kullanıcı o panelde
  **yeni kayıt da ekleyemez** (ekleme kaybı böyle kapanır, R7).
- **AC-12.** Model yeniden adlandırma kilitsiz başlatılamaz.
- **AC-13.** Aynı ayar panelini iki kullanıcı aynı anda düzenleyemez; farklı paneller birbirini
  engellemez.
- **AC-14.** Çöp Kutusu aynı anda yalnız bir kullanıcıda açıktır (`ayar` + `trash`, yeni alan yok).
- **AC-15.** Sahipsiz Kayıtlar aracı aynı anda yalnız bir kullanıcıda açıktır (`ayar` + `sahipsiz`).
- **AC-16.** Yedekten geri yükleme, başka kullanıcının elinde kilit varken **sahibi, alanın insan okunur
  etiketini ve kayıt kimliğini** yazar ve durur; devralma her kilit için sırayla `acquire(force)` çağırarak
  yapılır ve devam eder.

### Anlık işlemler ve ortak davranış

- **AC-17.** Başkasının kilitli tuttuğu hesabın **kapat/aç** işlemi reddedilir ve bildirim verilir.
- **AC-18.** Kapsam dışı bırakma düğmeleri ve ekstreden avans silme aynı denetimden geçer.
- **AC-19.** Kendi kilidi hiçbir işlemi engellemez.
- **AC-20.** Kilitli ekranda gösterilen bilgi bugünkü ekranla aynıdır (kim, ne zaman, devral).
- **AC-21.** Kilit servisi yoksa (yerel kip) hiçbir iş engellenmez.
- **AC-22.** Kilit alanlarının listesi saf bir modüldedir; `useLock(` çağrılarının birinci argümanlarının
  tamamı o listede geçer (kaynak taraması).
- **AC-23.** Sunucu yazma denetimi, veritabanı şeması ve birleştirme bu işten önce ve sonra aynıdır.

### QA turunda eklenenler (R1)

- **AC-24.** **Anasayfa'nın** ödeme penceresi de kalem kilidine tabidir: Giderler'de kalemi tutan kullanıcı
  varken Anasayfa'dan ödeme girilemez.
- **AC-25.** Avans penceresinde çalışan seçilince kilit alınır; seçim değişince yeni çalışanın kilidi
  alınır ve eskisi bırakılır.
- **AC-26.** Mahsup kipinde hem kalem hem çalışan kilidi aranır; ikisinden biri başkasındaysa
  `LockConflict` çizilir.
- **AC-27.** Virman penceresi yalnız kaynak hesabı kilitler; hedef hesap başka kullanıcıda düzenlenebilir.
- **AC-28.** Salt okunur ayar panelleri (`securitylog`, `auditlog`, `sentmail`, `securitystatus`,
  `export`) kilit almaz. *(R2: `optimize` veri yazdığı için listeden çıktı, R27.)*
- **AC-29.** `kdv`, `kkkomisyon`, `takip` ve `servispano` panelleri kilitlenir; "çalışma saatleri"
  `company` kimliğini paylaşır.
- **AC-30.** Panel kapatıldığında (sekme değiştirilince) kilit bırakılır.
- **AC-31.** Panel kilidinde `LockConflict` aynı üç bilgiyi gösterir (kim, ne zaman, devral) ve yeni bir
  bileşen yazılmamıştır.
- **AC-32.** Geri yükleme ön denetiminde alan adı insan okunur etiketiyle yazılır; ham `entity_type`
  ekranda görünmez.
- **AC-33.** Devralma döngüsünde 429 dönerse kullanıcı bilgilendirilir ve işlem sessizce yarıda kalmaz.
- **AC-34.** `useLock`'un JSDoc alan listesi tek listeye atıf yapar, elle sayılmış bir liste içermez.
- **AC-35.** Kaynak taraması `gider/`, `kasa/`, `cek/` ve `settings/` klasörlerinde kilitsiz kalan veri
  yazan pencere olmadığını doğrular.
- **AC-36.** Katalog listeleri `MERGE_KEYS`'e eklenmemiştir (X6) ve `merge.js` bu işten önce ve sonra
  aynıdır.
- **AC-37.** Kilit kimliği mount anında bilinmeyen formlarda kimlik boş başlar ve bu "yeni kayıt" sayılmaz
  (C7).
- **AC-38.** Görsel kanıt ekranları sahte çakışma durumuyla üretilmiştir ve `kanit-eslemesi.json`'da
  kayıtlıdır.
- **AC-39.** Kalemlerinden biri başkasının `gider` kilidindeyken ciro ve "Çek Yaz" kaydı reddedilir; hareket ve çek
  yazılmaz, bildirim kilidin sahibini adlandırır (R36).
- **AC-40.** Başkasının tuttuğu gider kalemini çöpe taşıma onayı açılmaz, çakışma ekranı çıkar; kalem çöpe gitmez (R37).
- **AC-41.** Kilit listesine aynı anda iki ekran abone iken kilit değişikliği olayı ikisini de yeniler; biri kapanınca
  diğeri canlı kalır (R38).
- **AC-42.** Avans formu çalışan seçili açılmaz; seçim yapılana kadar hiçbir çalışanın kilidi alınmaz (C7, AC-37).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Kilit alanı listesi tek yerde; kaynak taraması aynı kaydı iki ayrı alan adıyla kilitleyen pencere
      olmadığını doğruluyor (AC-22).
- [x] İki kullanıcı senaryosu testle sürülüyor: aynı kaleme iki ödeme girişi denemesi **Giderler'den ve
      Anasayfa'dan** engellenir (AC-2, AC-24).
- [x] Mahsupta iki kilidin birlikte arandığı testle gösterildi (R20, AC-26).
- [x] Katalog panelinde ikinci kullanıcının **ekleme de** yapamadığı testle gösterildi (R7, AC-11).
- [x] Geri yükleme ön denetimi ve devralma döngüsü testle sürüldü; sunucuya yeni uç nokta eklenmedi
      (R13, AC-16, AC-32, AC-33).
- [x] Sunucu, DB, izin ve birleştirmenin değişmediği testle gösterildi; `merge.js` dokunulmadı
      (AC-23, AC-36).
- [x] `useLock` ve `LockConflict` değişmedi; JSDoc listesi tek listeye atıf yapıyor (C6, R22, AC-34).
- [x] Görsel kanıt eklendi (`docs/evidence/0064-*.jpg` + `0064-piksel-raporu.json`): sahte çakışma
      durumuyla kilitli gider formu, kilitli ödeme penceresi, kilitli katalog paneli ve Çöp Kutusu kilidi;
      kayıtları `kanit-eslemesi.json`'a girdi (R23, AC-38).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: kilit alanlarının tam listesi ve tek kaynağı, hangi pencerelerin aynı alanı
      paylaştığı (özellikle gider kaleminin dört penceresi), panel ve araç kilitlerinin açılışta alındığı,
      anlık işlemlerin Servis Panosu emsalini kullandığı ve katalogdaki ekleme kaybının panel kilidiyle
      kapandığı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | R1 QA turu (18 bulgu, 3'ü bloklayıcı), R2 plan onayı (Q1–Q11; R25–R35), R3 triyaj (R36–R38, AC-39…AC-42; ciro ve Çek Yaz'ın kalem kilidi spec'in kapsam boşluğuydu). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: 7 bulgu (ikisi yüksek: kilit listesi tek abone, ciro/Çek Yaz kalem kilidi). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 7 / 0 | Yedisi de gerçekti; kanıt bulgusu araç çalıştırılmadan inceleme yapıldığı içindi. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Avans formunun boş açılması bilinçli değişiklik (AC-42, TY onaylı); 226 mevcut ekran 0 piksel. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Paylaşılan bir köprü aboneliğini (onLocksChanged) ikinci kez kullanmadan önce köprünün kaç aboneyi taşıdığına bakılmalı; tek aboneye göre yazılmış köprü sessizce birini bayatlatır ve sahte kilit servisiyle yazılan testler olayı hiç tetiklemediği için bunu görmez. İkincisi: kilit kapsamını "hangi pencere hangi kaydı açar" diye değil "hangi yazım hangi kayda dokunur" diye çıkarmak gerekir; ciro çeki kilitliyordu ama yazdığı ödeme kalemi korumasızdı.
