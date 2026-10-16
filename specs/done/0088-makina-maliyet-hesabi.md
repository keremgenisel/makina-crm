# 0088 — Makina Maliyet Hesabı: Mali İşler altında yeni ekran

| | |
|---|---|
| **Durum** | Tamamlandı (commit `b06c721`) |
| **Sahip** | Analist (spec) · Geliştirici (uygulama) |
| **Etkilenen alanlar** | Yeni üst sekme (Mali İşler grubu), yeni saf maliyet motoru, Üretim Partileri yönetiminin taşınması (Giderler dört görünüme iner), gider türü tanımları ve tür silme penceresi, `appSettings` maliyet ayarları, makina modeli tanımları, izin ekranı ve sunucunun **beş** bölümünün sekme eşlemesi, genel aramanın parti yönlendirmesi, üretim tarihi çözümü için `makinaMaliyeti.makinaListesi`'nin kullanılması (revizyon 3), görsel kanıt aracı |
| **Onaylayan** | Takım Yöneticisi |
| **Bağımlı spec'ler** | 0087 (parça maliyeti ve ürün ağacı; **önkoşul**), 0022 (üretim partileri ve kapanış anlık görüntüsü), 0052 (kendi sekme izni + sunucudaki önkoşul aynası), 0043 (Mali İşler menü grubu), 0076 (gider tutarı = matrah + indirilemeyen KDV), 0001 (gider türleri ve davranışları), 0002 (bugünkü maliyet, fiyat önerisi ve üretim tarihi çözümü), 0083 (Giderler görünüm sırasının taraması), 0082 ve 0084 (aynı çubuğu sabitleyen kriterler), 0026 (genel aramanın gider kapısı), 0078 (çöp kutusu ve ham tür okuması), 0064 (parti kilidi), 0086 (yedek paketi notu), 0059 (paylaşılan yardımcının dışa verilmesi emsali), 0071 (sessiz sıfır yerine rozet dersi), 0023 (ad tuzağı dersi), 0051 ("Öneriyi kullan" deseni), 0006 (bölüm düzeyinde güven sınırı emsali), 0089 (eski görünümlerin kaldırılması, bu işten **sonra**) |
| **Taban** | 0087 kapanışı |
| **Revizyon** | · 1 · 2026-10-16 ilk taslak · 2 · 2026-10-16 QA turu: taşımanın Giderler'e ve testlere etkisi yazıldı (R23, C14), R24 ters çevrildi (kutu Makina ve Model'de kalır, `makinaMaliyet` verilir), sunucu eşlemesi beş bölüme çıktı (C9), varsayılan adedin birimi ve kuruş kuralı tanımlandı (R8, C12), gerçek üretim adedinin kümesi yazıldı (R9), parti payının dönemi sabitlendi (R28) · 3 · 2026-10-16 uygulama planı onayı: sunucu önkoşulu sekme düzeyinde (C9/2), `appSettings` alan düzeyinde denetleniyor ve AC-6/3 ters çevrildi (C9/3), üretim tarihi `makinaListesi`'nden (R9/3), KAT doğrulaması ortak fonksiyon (R14/2), yeni yazımların kilidi (R32), planlanan adetler ad zincirine girmez (R18/2), alan adları (C7), yedek notu (R29, AC-43/3), Giderler kanıtı bu spec'te yenilenir (P9) |

---

## Intent

Fabrika yönetimi bir makinanın maliyetini ve satış fiyatını Excel'de hesaplıyor. Uygulamadaki
maliyet görünümleri (Üretim Partileri, Makina Kârlılığı, Makina ve Model) bu soruyu
cevaplamıyor diye değil, **karmaşık bulunduğu** için kullanılmıyor: hesap gider kalemlerinin tek
tek makinaya ya da modele atanmasına dayanıyor, yani doğru rakamı görmek için her gider kaydının
doğru atanmış olması gerekiyor ve atama gider formunun içinde dağınık.

Excel'in yolu tersten: önce **ürün ağacı** (hangi modelde hangi parça kaç adet, birim maliyetiyle),
sonra **genel masrafların makina başına payı** (yıllık toplam ÷ varsayılan üretim adedi), sonra
**kâr katsayısı** ile önerilen satış bedeli. Yani gider kayıtlarının tek tek atanmasına hiç ihtiyaç
duymuyor; atama yerine iki karar var: hangi gider türleri maliyete girer, ve yılda kaç makina
üretildiği varsayılır.

Başarı şu: Mali İşler altında yeni bir ekran açılıyor; orada her modelin bugünkü maliyeti (malzeme
+ dış işçilik + genel gider payı) ve önerilen satış bedeli listeleniyor, bir üretim partisi seçilince
o partinin model-adet tablosu, toplam maliyeti, önerilen cirosu ve gerçekleşen satışı yan yana
görünüyor. Hangi gider türlerinin maliyete girdiği ve üretim adedi varsayımı **bu ekrandan**
seçiliyor, Giderler ekranından değil. Kullanıcı Excel'i açmadan aynı rakamı uygulamada görüyor ve
rakamın hangi girdiden geldiğini satır satır izleyebiliyor.

---

## Requirements

### Ekran, görünümler, izin

- **R1.** Uygulamaya yeni bir üst sekme eklenir: **"Makina Maliyeti"**, kimliği **`maliyet`**,
  kenar çubuğunda **Mali İşler** grubunun içinde, Kasa'dan sonra. Ekranın dosyaları
  `src/components/MakinaMaliyeti.jsx` ve `src/components/maliyet/*`, saf motoru
  **`src/lib/makinaStandartMaliyet.js`**'tir (ad bugünkü `makinaMaliyeti.js`'ten ayrı durur; 0089
  eski motoru kaldırırken hangi dosyanın kaldığı adından okunur).
- **R2.** Sekmenin **kendi izni** vardır ve **varsayılan kapalıdır**; görünmesi için izin listesinde
  yazması **ve** Giderler sekmesinin görünür olması gerekir (gider verisi okur). Önkoşul Kasa'nın
  kuralıyla aynı biçimde kurulur; önkoşul sağlanmıyorsa sekme menüde hiç çizilmez.
- **R3.** Ekran dört görünümden oluşur, bu sırayla: **Model Maliyetleri** (açılış) · **Parti
  Hesabı** · **Üretim Partileri** · **Hesap Ayarları**.
- **R4.** Ekranın yazdığı dört şey vardır ve **dört ayrı veri bölümüne** düşer: gider türünün
  maliyet rolü (`giderTurleri`), hesap ayarları (`appSettings`), modelin kâr katsayısı ve Extra
  Kalıp liste fiyatı (`standardModels` ve `customModels`), üretim partisi kayıtları
  (`uretimPartileri`). Dördü de bugünkü **`gider_tanim`** iznini ister; **yeni eylem izni
  açılmaz.** Sunucu tarafı C9'da.

### Hesap ayarları: hangi gider maliyete girer

- **R5.** Her gider türü üç rolden birini taşır: **"Ürün ağacından gelir"** (malzeme ve dış
  işçilik; genel gider havuzuna girmez), **"Genel gidere girer"** (makina başına paylaşılır),
  **"Maliyete girmez"**. Rol seçimi Hesap Ayarları görünümünde yapılır. Alanın adı
  **`maliyetRolu`**, değerleri `urunAgaci | genel | yok`; tür kaydında `davranis` ile yan yana
  durur ve ikisi karıştırılmaz (ad tuzağı, C15).
- **R5/2.** Rol davranışla sınırlanmaz, ama **personel, kira ve SGK** davranışlı bir türe "Ürün
  ağacından gelir" verilince ekran uyarır (engel değil): bu türler ürün ağacında yoktur, seçim
  maliyeti sessizce eksiltir.
- **R6.** Rolü belirtilmemiş tür **"Maliyete girmez"** sayılır. Ekran kaç türün rolünün
  belirtilmediğini yazar; hiçbir türe rol verilmemişse genel gider payı sıfırdır ve ekran bunu boş
  durum olarak söyler (sessiz sıfır yasak).
- **R6/2.** Türü seçilmemiş gider kalemleri tür kırılımında **tek satırda** toplanır
  (`gider.js:1127`, `ad: "(türsüz)"`, `turId` tanımsız). Bu satır rol seçiminde **çizilmez**,
  yalnız kalem sayısı yazılır; motor onu her zaman "maliyete girmez" sayar.
- **R7.** **Çift sayım yasağı:** "Ürün ağacından gelir" rolündeki türlerin tutarı genel gider
  havuzuna **hiçbir koşulda** eklenmez. Ekran iki havuzu tek rakamda birleştirmez; makina maliyeti
  = ürün ağacından gelen direkt maliyet + genel gider payı, iki bileşen her zaman ayrı satırda
  görünür.
- **R8.** Genel gider havuzunun **dönemi** (ay–ay aralığı) ve **varsayılan üretim adedi** Hesap
  Ayarları'nda elle girilir. Makina başına genel gider payı = dönem havuzu ÷ varsayılan adet.
  Havuz `gider.kalemGiderTutari` tabanındadır, yani **indirilemeyen KDV'yi içerir** (0076 R14) ve
  pay da onu içerir; bu ekranda yazılıdır.
- **R8/2.** Varsayılan adet **dönemin tamamı için toplam adettir**, aylık adet değildir. Alanın
  etiketi "Dönemde varsayılan üretim adedi (toplam)" ve yanında türetilmiş "≈ n makina/ay" yazar.
  *Neden:* Excel'in `D88 = 10`'u aylıktır (`G87 = G86/12` ile ay bulunup sonra bölünüyor); on iki
  aylık dönem seçip 10 yazan kullanıcı payı 12 katına çıkarır ve hiçbir yerde uyarı görmez.
- **R8/3.** Sınırlar: varsayılan adet **1 ile 10000 arası tam sayıdır** (ondalık reddedilir, taksit
  sayısının 1–60 emsali). Dönem ve adet hiç girilmemişken ekran boş durum çizer ve dönem için
  öneri **gösterir** (son on iki tam ay), kendiliğinden yazmaz (0051'in "Öneriyi kullan" deseni).
- **R9.** Ekran, aynı dönemde **gerçekte üretilmiş** makina adedini de gösterir ve varsayılan adede
  göre hesaplanan payın yanında gerçek adede göre hesaplanan payı kıyas olarak yazar. Hesapta
  kullanılan **varsayılan adettir** (Takım Yöneticisi kararı 2026-10-16: fiyatlama ileriye dönük bir
  karardır, gerçekleşen adet dalgalanır).
- **R9/2.** Gerçek adedin kümesi bu spec'te tanımlıdır: **canlı stok satırları + canlı müşteri
  makinaları**, üretim tarihi dönem içindeyse; **partili olup olmadığına bakılmaz**. Üretim tarihi
  çözülemeyen makina sayılmaz ve sayısı ayrıca yazılır. Gerçek adet sıfırsa kıyas payı yazılmaz,
  nedeni yazılır (bölme yapılmaz).
  *Neden bugünkü sayı okunmuyor:* `makinaMaliyeti.js:254` ayın üretim sayısından partili makinayı
  **çıkarıyor** (`if (m.veriYok || m.parti) continue;`, 0022 R12); parti kullanan fabrikada o sayı
  neredeyse sıfırdır ve kıyas anlamsız olur.
- **R9/3.** Üretim tarihi çözümü ikinci kez yazılmaz: bugünkü zincir kullanılır. Revizyon 3 (ölçüldü):
  `makinaMaliyeti.makinaListesi` zaten dışa verilidir ve R9/2'nin kümesini birebir verir (canlı stok ve canlı müşteri,
  `uretimTarihi` ve `uretimKaynak` çözülmüş); motor onu çağırır, `stokUretimTarihi`'nin ayrıca dışa verilmesine gerek kalmaz.
  *Gerekçe:* 0002 C2'nin dersi, iki yerde iki kural iki rakam üretir.
- **R10.** Dönem havuzu, gider kayıtlarının bugünkü tek kaynağından okunur; bu ekran gider
  kalemlerini kendi kuralıyla süzmez ve tutarı yeniden türetmez.

### Model maliyeti

- **R11.** Modelin **direkt maliyeti** = makina kiti satırlarının (parça birim maliyeti × adet)
  toplamı + modelin ek maliyet kalemlerinin toplamı (0087 R9).
- **R12.** Modelin **toplam maliyeti** = direkt maliyet + makina başına genel gider payı.
- **R13.** Kitinde maliyeti girilmemiş parça olan modelin rakamı **eksik** işaretlenir; işaretin
  yanında kaç parçanın maliyetinin girilmediği yazar. Eksik parça sıfır sayılır ama rakam
  işaretsiz gösterilmez.
- **R13/2.** Kit satırı **canlı bir parçaya bakmıyorsa** (parça çöpte ya da hiç yok) satır da
  "eksik" sayılır ve eksik sayısına girer. Bu 0087 R17'nin bu spec'e devrettiği karardır
  (birebir: "0088'in hesabı canlı parçaları sayar ve çöpteki parçanın kit satırı 'eksik' sayılır");
  çöpe atılan parçanın kit satırı geri alınabilirlik için silinmiyor.
- **R14.** Model başına **kâr katsayısı** saklanır ve **önerilen satış bedeli** = toplam maliyet ×
  katsayı. Katsayı girilmemiş modelde öneri fiyat gösterilmez ("—"), toplam maliyet gösterilir.
- **R14/2.** Katsayı bugünkü fiyat önerisinin **KAT** yöntemiyle aynı kavramdır
  (`makinaMaliyeti.js:472`, `FIYAT_YONTEM.KAT`); doğrulaması ve uyarısı aynen kullanılır: katsayı
  sıfırdan büyük olmalı, 1'in altındaysa "zararına satış" uyarısı çıkar, üst sınır yok. Giriş
  virgüllü ondalık ve en çok beş ondalık (Excel `E5 = 2,19498`). Bugünkü ekranın diğer iki yöntemi
  (marj, ekle) buraya taşınmaz, 0089'a kadar yerinde kalır.
- **R14/3.** Öneri fiyat ve önerilen ciro **KDV hariçtir** ve ekran bunu yazar; gerçekleşen satış
  da KDV hariç bedeldir (`utils.gercekSatisBedeli`), yani kıyas aynı tabandadır.
- **R15.** Model başına **Extra Kalıp liste fiyatı** saklanır ve model satırında gösterilir; maliyet
  hesabına girmez, yalnız fiyat listesi bilgisidir. Tanımı dar: **model başına tek TL liste fiyatı,
  KDV hariç**. Ölçü bazlı kalıp fiyatı ve satış kayıtlarıyla karşılaştırma kapsam dışıdır (X10).
  *Ölçüm:* `kalip_defs` tablosunda fiyat alanı yok (`db.cjs:316`); Extra Kalıp fiyatı bugün yalnız
  satış kaydında (`partSales.fiyat`) duruyor ve Analiz ölçü artı model kırılımı yapıyor.
- **R16.** Model Maliyetleri görünümü bütün canlı modelleri (standart ve özel) listeler; satır
  açıldığında maliyetin kalem kalem dökümü görünür (parça adı · adet · birim maliyet · satır
  tutarı, sonra ek maliyet kalemleri, sonra genel gider payı).

### Parti hesabı

- **R17.** Parti Hesabı görünümünde bir üretim partisi seçilir. Partinin **model-adet tablosu**
  partiye bağlı makina kayıtlarından türetilir (makina stoğundaki ve müşteriye geçmiş makinalar).
- **R18.** Partinin **planlanan adetleri** elle de girilebilir (henüz üretilmemiş parti
  fiyatlanabilsin). Planlanan adet girilmişse hesap onu kullanır ve tabloda "planlanan" ibaresi
  yazar; girilmemişse türetilen adet kullanılır.
- **R19.** Parti satırı model başına şunları gösterir: adet, direkt maliyet (birim), genel gider
  payı (birim), toplam maliyet (birim), önerilen satış bedeli (birim), toplam maliyet (adet ×) ve
  önerilen ciro (adet ×).
- **R20.** Parti özetinde dört rakam yan yana durur: toplam standart maliyet, önerilen ciro,
  **gerçekleşen satış** (partinin satılmış makinalarının gerçek bedeli) ve iki kâr rakamı
  (öneriye göre ve gerçeğe göre).
- **R20/2.** İki kâr rakamının kümesi **farklıdır** ve özette yazılıdır:
  "öneriye göre kâr" = önerilen ciro − toplam standart maliyet (partinin **bütün** adedi),
  "gerçeğe göre kâr" = gerçekleşen satış − **yalnız satılmış** makinaların standart maliyeti.
  Özet ayrıca adet kırılımını yazar: satılmış, stokta, bedelsiz, kuru olmayan. *Gerekçe:* satılmış
  makinaların bedelini partinin tamamının maliyetinden düşmek yarısı stokta duran partide kârı
  yapay olarak negatif gösterir. İkinci el devir ve bedelsiz satış için ayrı kural yazılmaz
  (`gercekSatisBedeli` üzerinden gelir, 0002 C2), yalnız sayıları görünür.
- **R21.** Parti özetinde **gerçekleşen tedarik karşılaştırması** bulunur: partinin döneminde
  "Ürün ağacından gelir" rolündeki türlerin gider toplamı, partinin standart direkt maliyeti
  toplamı ve ikisinin **farkı**. Fark bir hata değildir, bilgi satırıdır; ekran farkın ne anlama
  geldiğini bir cümleyle söyler.
- **R21/2.** Farkın iki yapısal nedeni ekranda yazılıdır. (a) **Taban farkı:** standart direkt
  maliyet KDV hariç matrahtır (0087 R1), gerçekleşen tedarik ise `kalemGiderTutari` tabanındadır,
  yani indirilemeyen KDV'yi de içerir (0076 R14); bu yüzden farkın sıfırdan başka bir şey olması
  normaldir. (b) **Dönem farkı:** partinin başlamasından önce alınmış tedarik kapsam dışıdır ve
  aynı ayları kapsayan iki açık parti varsa o ayların tedariki **bölünmez**, iki partide de aynı
  toplam görünür; ekran o ayları paylaşan parti sayısını yazar.
  *Reddedilen seçenek:* tedariki partilere bölmek; bu atamadır, yani kullanıcının karmaşık bulduğu
  modelin geri gelmesi.
- **R22.** Partisi olmayan makinalar (parti bağı yok) parti hesabına girmez; ekran kaç makinanın
  partisiz olduğunu yazar.

### Üretim partileri yönetiminin taşınması

- **R23.** Üretim partisi ekleme, düzenleme, kapatma ve silme işlemleri bu ekrana taşınır. Veri
  bölümü, kayıt alanları, kilit alanı, çöp kutusu satırı, yedek paketi ve izin kimliği
  **değişmez**; ekranın yeri, sunucunun sekme eşlemesi ve aşağıdaki dört bağ değişir.
- **R23/2.** **Giderler dört görünüme iner:** Dönem Raporu · Tedarikler ve Ekstre · Makina
  Kârlılığı · Makina ve Model. `GORUNUMLER` dizisi (tek satır kuralı 0083 ile sabit) ve
  `DONEMSIZ = new Set(["partiler"])` birlikte güncellenir; 0083'ün beş etiketli sıra taraması ve
  0082 ile 0084'ün aynı çubuğu sabitleyen kriterleri bu spec'le **ters çevrilir** (listesi C14).
- **R23/3.** Genel aramanın üretim partisi sonucu yeni sekmeye yönlendirilir (`giderAcilis` /
  `kasaAcilis` deseni) ve 0026'nın `KAT` kapısı yeni sekmenin görünürlüğü olur.
  *Neden kriter:* bugün sonuç `onGoGider`'i `{ gorunum: "partiler" }` ile açıyor
  (`GlobalSearch.jsx:163`) ve `Giderler.jsx:46` `gecerliGorunum` bilinmeyen görünümü **sessizce**
  `"rapor"`a çeviriyor; taşımadan sonra arama sonucu hata vermeden Dönem Raporu'nu açar.
- **R23/4.** Görsel kanıt aracının `giderler-uretim-partileri` ekranı yeni sekmeye taşınır
  (`scripts/evidence/0009-sayfa.jsx:728`); `giderler-model-parti-degisim` ekranı **yerinde kalır**
  (o ekran Makina ve Model görünümüne gidiyor, R24).
- **R24.** Taşınan parti ekranına bugünkü maliyet motorunun sonucu (`makinaMaliyet`) **aynen
  verilir** ve parti tablosunun üç sütunu (Makina · Ortak gider havuzu · Makina başı pay) ile
  "Açık · geçici" rozeti bugünkü hâliyle kalır. Yeni sekme Giderler'i önkoşul tuttuğu için
  `giderYetki` zaten vardır. Bu sütunların yeni motorun rakamlarıyla değişmesi **0089'un işidir**.
- **R24/2.** "Kapanmış partilerin aylarında değişen ortak gider" kutusu **parti ekranında değildir**
  ve bu spec'te hiç dokunulmaz: `MakinaModelGorunumu.jsx:125` (`testId="parti-degisimleri"`), yani
  Giderler'in Makina ve Model görünümünde durur.
  *Neden prop kesilmiyor:* `UretimPartileri.jsx:39` kayıtta
  `partiKapanisUygula(eski, kayit, makinaMaliyet?.aylar, simdiYerel())` çağırıyor ve
  `uretimPartisi.js:39-42` `kapanisAnlikGoruntusu` `aylar` yoksa **`{}`** döndürüyor; prop'u
  kesmek 0022 R15'in kapanış anlık görüntüsünü sessizce boşaltır (kayıt gövdesi değişir) ve
  tablonun üç sütununu "—" yapar, makinası olan partide bile "Bağlı makina yok" ipucu çizilir.

### Hesap ve gizlilik

- **R25.** Bütün hesap React'sız **saf bir motorda** yapılır; ekran yalnız gösterir. Ekranda çarpım
  ya da bölme yazılmaz.
- **R25/2.** Hesabın tamamı **kuruş tamsayısıyla** yapılır (gider ve kasa motorlarının `kurus`/`tl`
  yardımcıları). Makina başına pay `Math.floor` ile yuvarlanır ve **artık kuruş dağıtılmaz** (bu bir
  birim fiyattır, dağıtım değil); öneri fiyat katsayı çarpımından sonra kuruşa yuvarlanır. Bu, 0087
  C6'nın bu spec'e bıraktığı karardır (`parts.maliyet` `REAL` ve TL ondalıklı saklanıyor).
- **R26.** Genel gider havuzuna giren personel gideri **tek satır** olarak görünür; çalışan adı,
  kişi bazlı tutar, resmi/elden ayrımı ve ek ödeme ayrıntısı bu ekranda ve bu ekranın ürettiği
  hiçbir çıktıda yer almaz.
- **R27.** Ekran salt gösterim tarafında hiçbir gider kaydını değiştirmez: gider kalemlerinin
  atama, kova ve dağıtım alanlarına dokunmaz, yazmaz.

- **R18/2.** Planlanan adet model **adıyla** tutulur ve model yeniden adlandırılınca **taşınmaz** (revizyon 3): adı
  bulunamayan planlanan satır Parti Hesabı'nda "model bulunamadı" ibaresiyle görünür çizilir ve hesaba girmez (bilinen sınır).
  *Gerekçe:* ad zincirine eklemek model panelini gider bölümüne yazdırır ve Ayarlar'ı olup Giderler'i olmayan kullanıcıda yeni
  bir 403 sınıfı açar.

### Tek pay, tek varsayım

- **R28.** Parti hesabı da **hesap ayarlarının payını** kullanır; partinin kendi döneminden ikinci
  bir pay hesaplanmaz. Partinin dönemi yalnız iki yerde okunur: R21'in gerçekleşen tedarik
  karşılaştırması ve R17'nin makina türetimi. *Gerekçe:* aksi hâlde aynı model Model
  Maliyetleri'nde bir, Parti Hesabı'nda başka toplam gösterir ve kullanıcı hangisinin doğru olduğunu
  bilemez; Excel de tek `G88` kullanıyor. *Reddedilen seçenek:* partinin dönemine göre pay; R9'un
  gerekçesiyle aynı (dalgalanan gerçek adetle fiyatlama yapılmaz).

### Ayarların yeri ve tür silme

- **R29.** Hesap ayarları `appSettings` içinde **kendi anahtarında** durur:
  **`appSettings.maliyetAyarlari`** (`{ baslangicAy, bitisAy, varsayilanAdet }`). `disAppSettingsSuz`'a **girmez**
  (sunucu paylaşımlıdır, makinaya özgü değildir) ve "Firma ve ayarlar" paketine bir **not** eklenir (`MALIYET_AYAR_NOTU`,
  0086'nın `GIDER_AYAR_NOTU` kardeşi; paket cümlesi bölüm adlarından üretildiği ve `appSettings` tek bölüm olduğu için cümle
  bu ayarları ayrıca sayamaz, revizyon 3).
  *Reddedilen seçenek:* `appSettings.giderAyarlari`'na eklemek; Ayarlar › Gider Ayarları formu
  (`SettingsGider.jsx:51`) aynı nesneyi bütün olarak yazıyor, iki ekranın tek nesneyi yazması
  0082'nin ölü anahtar düşürme işinde bedelini gösterdi.
- **R30.** Gider türü silme penceresi (`GiderTurManager`) **hedef türün maliyet rolünü** gösterir ve
  roller farklıysa uyarır (engel değil).
  *Neden:* ölçüldü, kullanımdaki tür silinince kalemler kalıcı olarak **hedef türe taşınıyor**
  (`GiderTurManager.jsx:64-82`, `turKullanim` + `hedefId` + `tur_tasindi`); rolü "genel gidere girer"
  olan kalemler rolü "ürün ağacından gelir" olan türe taşınınca havuz bir anda düşer ve nedeni
  hiçbir yerde yazmaz.
- **R31.** Ekranda "rakamlar bugünkü ayarlarla hesaplanır" ibaresi durur: tür rolünü, varsayılan
  adedi ya da bir parçanın maliyetini değiştirmek **kapanmış partinin** standart maliyetini de
  oynatır (X6'nın bilinen sınırı).

### Kilit (revizyon 3)

- **R32.** Ekranın yazımları bugünkü kilit alanlarıyla korunur (0064 R25 "bir kayıt, bir kilit"): tür rolü kayıt anında
  `ayar:gidertur` kilidine, kâr katsayısı ve Extra Kalıp fiyatı `ayar:models` kilidine anlık bakar ve başkası tutuyorsa yazmaz
  (`kilitRedMesaji`); parti bugünkü `uretim_partisi` kilidini kullanır; Hesap Ayarları formu `useLock("ayar", "maliyet")` alır
  (`AYAR_KILITLI`'ya bir giriş). `src/components/maliyet/` kilit kapsam taramasına girer.

---

## Constraints

### Uyulması zorunlu

- **C1.** 0087 **önkoşuldur**: parça maliyeti ve ek maliyet kalemleri olmadan bu ekranın direkt
  maliyet rakamı yoktur.
- **C2.** Gider kaleminin tutarı bugünkü tek kaynaktan okunur: `gider.kalemGiderTutari`
  (0076 R14: matrah + indirilemeyen KDV). Dönem havuzu `hesaplaGiderRaporu`'nun tür kırılımından
  alınır (`gider.js:1077`, çıktı `:1196` `turKirilimi`); satırları `turId`, `ad`, `davranis`,
  `toplam`, `adet` ve `calisanlar` taşır, ikinci bir süzme ve ikinci bir toplama yazılmaz.
- **C2/2.** **Bilinen dal:** dönem bütünüyle yürürlük ayından önceyse `hesaplaGiderRaporu`
  `turKirilimi`'ni **hiç döndürmez** (`gider.js:1086-1088`, dönüş `{ ...bos, kalemler: [] }`).
  Motor bu dalı açıkça karşılar: havuz sıfırdır, hata atılmaz ve ekran "seçilen dönem gider
  takibinin yürürlüğünden önce" boş durumunu çizer.
- **C3.** `turKirilimi`'nin personel satırındaki **`calisanlar` listesi bu ekrana geçmez** (R26);
  motor onu kendi çıktısına kopyalamaz.
- **C4.** Yürürlük ayı kuralı aynen geçerlidir: yürürlük öncesi tarihli gider hiçbir havuza girmez
  (bugünkü `yururlukKapsami`).
- **C5.** Bugünkü maliyet modeli bu spec'te **değişmez**: `makinaMaliyeti.js`, kova dağıtımı, model
  havuzları, üretim partisinin ortak gider tabanı, 0072'nin aylara dağıtımı, 0020'nin personel
  ataması ve gider formundaki atama alanları yerinde kalır. İki hesap bir süre yan yana yaşar; eski
  görünümlerin kaldırılması 0089'un işidir.
- **C6.** Yeni sekme eklemenin bütün noktaları birlikte güncellenir: kenar çubuğu sekme listesi,
  izin ekranının sekme listesi, varsayılan kapalı sekmeler kümesi, görünür sekme süzgecinin
  önkoşulu, Mali İşler grubunun çocukları. Kiosk kipi (yalnız servis sekmeli kullanıcı) etkilenmez.
- **C7.** Yeni **veri bölümü açılmaz**. Yeni kalıcı alanlar var olan yerlere gider: gider türünün
  `maliyetRolu` alanı tür tanımlarının JSON'una (tür listesi `meta` anahtarında tek satır olarak
  saklanır, yazma `db.cjs:883`, okuma `:1491`, yani yeni sütun gerekmez), hesap ayarları
  `appSettings.maliyetAyarlari`'na (JSON dört nokta kuralı, `musteriSutunlari` deseni), kâr katsayısı
  ve Extra Kalıp fiyatı iki model tablosuna, partinin planlanan adetleri üretim partisi tablosuna.
  Alan adları (revizyon 3): `giderTurleri[].maliyetRolu`, iki model tablosunda `karKatsayisi REAL` ve
  `kalipListeFiyati REAL`, `uretim_partileri.planlananAdetler TEXT` (JSON `{ model: adet }`), `appSettings.maliyetAyarlari`
  (JSON sütun). Boş değer gövdeye yazılmaz (`appSettings` dahil, 0087 deseni).
  Her biri dört nokta kuralına, `db-roundtrip`'e, `db-clean-install`'a ve `src/types.d.ts`'ye girer
  (0087'nin K-24 dersi).
- **C8.** Boş değer gövdeye yazılmaz: rolü verilmemiş tür, katsayısı girilmemiş model ve planlanan
  adedi olmayan parti bugünkü kayıt gövdesini birebir korur.
- **C8/2.** **Ölçülen tuzak:** üretim partisi okuması alanları yayıyor
  (`db.cjs:1529`, `.map(({ kapanisOrtaklari, ...rest }) => ...)`), yani yeni sütun NULL kalınca
  gövdeye `null` yazılır, sunucunun karşılaştırması sahte fark görür ve kısıtlı kullanıcı her parti
  kaydında 403 alır. Planlanan adet alanı okumada ayıklanır (`bosOlmayan` deseni, 0078 C4 ve
  0087 C4 aynı sınıfı ölçtü). Model okumasının emsali `ekMaliyetOku` (`db.cjs:1437`).
- **C9.** Sunucu sekme eşlemesine **beş bölüm** birlikte girer, yalnız parti değil. Ölçüm
  (`electron/serverAuth.cjs`): `standardModels: ["settings"]` ve `customModels: ["settings"]`
  (`:125-126`), `giderTurleri: ["settings"]` (`:135`), `appSettings: ["settings", "stock"]`
  (`:128`), `uretimPartileri: ["gider"]` (`:146`). `sekmeEngelli` haritadaki sekmelerden hiçbiri
  kullanıcıda yoksa reddediyor, yani R2'nin tanımladığı kullanıcı (yeni sekme + Giderler, **Ayarlar
  sekmesi yok**) bugün yalnız partiyi kaydedebilir; tür rolü, kâr katsayısı, Extra Kalıp fiyatı ve
  hesap ayarları 403 alır. Dört bölüme yeni sekme eklenir; `appSettings`'te kapı alan düzeyindedir (C9/3).
- **C9/2.** Yeni sekmenin önkoşulu sunucuda **sekme düzeyindedir** (revizyon 3, ölçüldü): `ON_KOSUL_SEKMELERI` bölüme
  uygulanır (`serverAuth.cjs:235`), oraya model bölümleri için `["gider"]` yazmak Ayarlar'ı olup Giderler'i olmayan kullanıcının
  model düzenlemesini de reddederdi. Yeni tablo `SEKME_ON_KOSULLARI = { maliyet: ["gider"] }`: kullanıcının ham sekme listesi
  denetimden önce bundan geçer (istemcinin `gorunurSekmeler` kuralının aynası; sunucu ham `perms.tabs`'ı okur). Bölümlerin
  izin grubu ve eylem kimliği değişmez: `giderTurleri` ve `uretimPartileri` `giderActions` ile `gider_tanim`, modeller ve
  `appSettings` `"settings"` grubunda; asıl kapı sekme eşlemesidir.
- **C9/3.** **`appSettings` alan düzeyinde denetlenir** (revizyon 3, ölçüldü: `ayarAlanEngelli`, `AYAR_ALAN_SEKMELERI`):
  `maliyetAyarlari` alanı `["settings", "maliyet"]` alır, `appSettings`'in bölüm eşlemesi değişmez. Yani yalnız bu sekmesi
  olan kullanıcı KDV oranı gibi diğer ayarları **yazamaz** (revizyon 2'nin "kabul edilen sınır"ı yanlış ölçümdü). **Kabul edilen
  sınır** başka yerdedir: `giderTurleri`, `standardModels` ve `customModels` bölüm düzeyinde güvenilir; yeni sekmeli kullanıcı
  tür adını ya da model kitini de yazabilir (0006 C8 emsali), `server-authz` ile sabitlenir.
- **C10.** Satış bedeli tek kuraldan okunur: `utils.gercekSatisBedeli` (0002 C2). Bu ekran kendi
  gelir kuralını yazmaz.
- **C11.** Para: hesabın tamamı TL'dir (0087 R1 kararı). Satış bedeli döviz cinsindeyse bugünkü kur
  kuralı (`makinaMaliyeti.satisKurBilgisi`, `:331`) ile TL'ye çevrilir; durumu ("kayıtlı",
  "yaklaşık", "yok") satırda görünür (0002 R13 emsali) ve yalnız "yok" toplamın dışında bırakılıp
  sayısı yazılır. Uydurma kur kullanılmaz.
- **C12.** Yuvarlama tek yerde: R25/2'nin kuruş kuralı. Ekran hiçbir yerde kendi yuvarlamasını
  yapmaz; `turKirilimi.toplam` iki ondalıklı TL olarak geldiği için kuruşa çevrim kayıpsızdır.
- **C13.** Rolün ve maliyet ayarlarının değişmesi **geçmişi de değiştirir** (R31). Bu bilinçli: bu
  ekran bir anlık görüntü değil, bugünkü ayarlarla hesaplanan ileriye dönük bir fiyatlama aracıdır
  (0002 C10 ve 0022'nin "geçici" etiketiyle aynı karar).
- **C14.** Bu spec'le **ters çevrilen kriterler** (taşıma yüzünden; her biri test yorumunda
  "spec 0088 ile" notuyla işaretlenir):
  `tests/yerlesim-0083.test.js` AC-6 ve AC-24 (beş etiketli `ETIKETLER`, `GORUNUMLER`'in tek satırı,
  `DONEMSIZ`), `tests/ui/yerlesim-0083.test.jsx` AC-1 · AC-4 ve boş durum adımı,
  `tests/ui/standart-kalkar-0082.test.jsx` AC-1 ve AC-6, `tests/ui/stopaj-donemi-0084.test.jsx:37`,
  `tests/ui/uretim-partisi.test.jsx` (düzeneği Giderler'den yeni ekrana geçer),
  `tests/menu-gruplari.test.js:17` (Mali İşler'in çocukları bugün
  `["finance", "gider", "kasa"]` olarak sabit), `tests/ui/genel-arama-0026.test.jsx`'in parti
  yönlendirmesi ve kapısı.
- **C15.** Ad tuzağı: `maliyetRolu` ile `davranis` aynı tür kaydında yan yana durur ve farklı
  kavramlardır (rol maliyete girişi, davranış kira/personel/SGK alanlarını belirler). 0023 R10'un
  "mesai" dersi ve 0087 C9'un `ekMaliyetler` ↔ `ekOdemeler` dersiyle aynı sınıf; kaynak taraması
  ikisini birlikte arar.

### KAPSAM DIŞI

- **X1.** Eski üç görünümün (Üretim Partileri hariç) kaldırılması ve Giderler çubuğunun
  kısaltılması — *neden:* 0089. Yeni hesap gerçek veride doğrulanmadan eski rakama bakma yolu
  kapatılmaz.
- **X2.** Gider formundaki atama alanlarının (makina ataması, model satırları, dağıtım ayı)
  sadeleştirilmesi — *neden:* bu alanlar 0076'nın indirilemeyen KDV kovası, 0072'nin dağıtımı ve
  0020'nin personel ataması tarafından okunuyor; kaldırmak altı motoru elden geçirmek demek ve
  kullanıcı bunu istemedi.
- **X3.** Gider **kalemi** bazında maliyet seçimi — *neden:* Takım Yöneticisi kararı tür bazlı
  seçim (2026-10-16); kalem bazlı seçim bugünkü atama alanının aynısıdır, yani şikâyet edilen
  karmaşıklığın tekrarı.
- **X4.** Bu ekranın yazdırma çıktısı ve dışa aktarması — *neden:* ilk sürümde rakamın doğruluğu
  ölçülür; yazdırma, gider gizliliği taramalarının genişletilmesini de gerektirir ve ayrı iş olarak
  daha güvenli.
- **X5.** Makina (seri) bazında maliyet ve kârlılık — *neden:* bu ekranın birimi **model** ve
  **parti**. Seri bazında maliyet bugünkü Makina Kârlılığı görünümünün işidir ve 0089'a kadar
  yerinde kalır.
- **X6.** Parça maliyetlerinin parti kapanışında dondurulması (anlık görüntü) — *neden:* önce
  hesabın doğru olduğu görülür; dondurma kararı kapanmış partilerin geçmişini etkiler ve kendi
  göçünü gerektirir. Bilinen sınır yazılır: parça maliyeti **ve ayrıca tür rolü, varsayılan üretim
  adedi, dönem** değişince kapanmış partinin standart maliyeti de değişir (R31).
- **X7.** Çap · boy · yoğunluk üzerinden kilo ve maliyet türetmek — *neden:* 0087 X3.
- **X8.** Excel'in "KAR ZARAR" satırının birebir taklidi — *neden:* ölçüldü, o satır
  (`C8 = C7 - G87`) makina başına payı zaten içeren kârdan bir ay daha genel masraf düşüyor, yani
  genel masrafı iki kez sayıyor. Hesap taklit edilmez; doğrusu kurulur ve farkın nedeni Context'te
  yazılıdır.
- **X9.** Yedek parça satışının kârı ve parça stoğunun değerlenmesi — *neden:* 0087 X4.
- **X10.** Extra Kalıp liste fiyatının ölçü bazında tutulması ve satış kayıtlarıyla karşılaştırılması
  — *neden:* R15 bir fiyat listesi bilgisidir, maliyet hesabına girmez; ölçü bazlı fiyat kendi
  ekranını ve kalıp tanımlarına yeni alan ister.
- **X11.** Parti tablosundaki üç sütunun (Makina · Ortak gider havuzu · Makina başı pay) yeni motorun
  rakamlarıyla değişmesi ve bugünkü fiyat önerisinin diğer iki yönteminin (marj, ekle) taşınması
  — *neden:* 0089. Eski motor yerinde durduğu sürece bu sütunlar bugünkü rakamı göstermeye devam
  eder (R24).
- **X12.** Tür ve model bölümlerinin (`giderTurleri`, `standardModels`, `customModels`) alan düzeyinde sunucu denetimi —
  *neden:* C9/3'ün kabul edilen sınırı; bu bölümlerin bölüm düzeyinde güven modelini değiştirmek ayrı iştir. (Revizyon 3:
  `appSettings` zaten alan düzeyinde denetleniyor, `maliyetAyarlari` o denetimi kullanır.)

---

## Context

### Excel'in formül zinciri (`MASRAFLAR.xlsx`, sayfa "2017 1NCİ PARTİ", ölçüldü)

| Katman | Hücre | Formül / değer |
|---|---|---|
| Partide üretilen model ve adet | satır 13-14 | `L=AK100_DSC:5`, `P=AK100_DS:40`, `Q=AK120_DS:25` (toplam 70 makina) |
| Tedarik kalemi, model başına **birim** tutar | 15-71, kolon J…R (dokuz model kolonu) | elle girilen birim fiyat |
| Kalemin toplamı = fatura tutarı | `U15=(L15*L14)` … `AB15=SUM(S15:AA15)`, `B15=AB15` | birim × adet; satır toplamı fatura tutarına eşit olmalı (elle denetim) |
| Model başına direkt maliyet | `F5=SUM(L15:L71)` | sütun toplamı; başlığı **"1 ADET MAKİNA İÇİN MALİYET (İŞÇİLİĞİMİZ HARİÇ)"** |
| Genel masraflar | `G74:G85 = (aylık × 12)`, `G86=SUM(...)` | yıllık **9.582.000** (kira, elektrik, su, dört maaş satırı, sigorta, yemek, araç, CNC takım, CNC yağ) |
| Makina başına pay | `G87=G86/12` → `G88=G87/D88` (`D88=10`) | **79.850** (yıl 12 ay × ay 10 makina = 120 makina varsayımı) |
| Toplam maliyet | `D5=(F5+G88)` | direkt + pay |
| Kâr katsayısı ve öneri fiyat | `E5=2,19498`, `J5=(D5*E5)` | katsayılar modele göre **1,97 – 2,85** |
| Ciro ve maliyet | `M5=(J5*L14)`, `N5=(D5*L14)` | öneri fiyat × adet, toplam maliyet × adet |
| Özet | `C5=20.630.130`, `C6=9.842.945`, `C7=C5-C6=10.787.185` | toplam ciro, toplam maliyet, kâr |

Excel'de üç tutarsızlık var ve hiçbiri taklit edilmeyecek:

1. `C8 = C7 - G87` ("KAR ZARAR") kârdan bir ay daha genel masraf düşüyor; `G87` payı `D` içinde
   zaten var (X8).
2. `G87`'nin etiketi "MAKİNA BAŞINA MASRAF" ama değeri aylık toplam; `G88`'in etiketi "1 AYLIK
   DÜKKAN MASRAFI" ama değeri makina başına pay. İki etiket yer değiştirmiş.
3. Model adları iki yerde tutarsız: `H6=AK140_DSC` ↔ başlık `M13=AK140_DS`,
   `H11=SWP140_DSC` ↔ `R13=SWP140_DS`. Uygulamada model listesi tek kaynak olduğu için bu sapma
   kendiliğinden kapanır.

Ayrıca Excel'in "CİRO"su **teorik**tir (öneri fiyat × adet), gerçek satış değil. Uygulama gerçek
satışı biliyor, bu yüzden parti özetinde iki rakam yan yana durur (R20).

### Bugünkü maliyet modeliyle fark

| | Bugünkü model (0001 · 0002 · 0020 · 0022 · 0072 · 0076) | Bu spec'in modeli |
|---|---|---|
| Yön | gerçekleşen gider kayıtlarından makinaya dağıtım (aşağıdan yukarı) | ürün ağacından ileriye dönük standart maliyet (yukarıdan aşağı) |
| Birim | makina (seri) | model ve parti |
| Girdi | her gider kaleminin ataması (makina / model satırları / ortak), kova bölmesi, parti payları | parça maliyeti × kit adedi + ek kalemler + tür rolü + varsayılan adet |
| Malzeme | **içermiyor** (`makinaMaliyeti.js:20` `MALZEME_HARIC_NOTU`, 0002 R3) | ana bileşen |
| Kullanım amacı | geçmişin muhasebesi | fiyatlama |

İkisi aynı soruyu cevaplamadığı için **toplanamaz**; aynı tedarik faturası hem gider kaydı hem
parça maliyeti olarak iki kez sayılabilir. R5'in üç rollü seçimi bu yüzden var: bir tür ya ürün
ağacından gelir ya genel gidere girer, ikisi birden olamaz.

### Ölçülen kod noktaları

| Konu | Yer |
|---|---|
| Kenar çubuğu sekme listesi | `App.jsx:53` (`TABS`, dizi `:66`'da biter) |
| İzin ekranının sekme listesi, varsayılanlar | `settings/serverPermissionDefs.js:7` (`ALL_TABS`), `:23` (`DEFAULT_USER_TABS`), `:25` (`VARSAYILAN_KAPALI_SEKMELER`) |
| Önkoşullu sekme süzgeci (Kasa deseni) | `permissions.js:33-48` (`gorunurSekmeler`), süzgecin kendisi `:37` (`kasaSuz`) |
| Mali İşler grubu | `lib/menuGruplari.js:4` (`MENU_GRUPLARI`, çocuklar `finance · gider · kasa`) |
| Gider türü tanımlarının saklanması | yazma `db.cjs:883`, okuma `:1491` (meta JSON; yeni sütun gerekmez), kaydın şekli `{id, ad, davranis}` artı 0078'in `deletedAt`'i |
| Dönem havuzunun kaynağı | `gider.js:1077` `hesaplaGiderRaporu({…}, {baslangic, bitis})`, çıktı `:1196` `turKirilimi` |
| Gider tutarı | `gider.js:274` `kalemGiderTutari` |
| Üretim partisi kaydı | `db.cjs` `uretim_partileri` (`id, ad, baslangicAy, bitisAy, aciklama, kapanmaZamani, kapanisOrtaklari, deletedAt`) |
| Partiye bağlı makina adedi | `uretimPartisi.js:54` `partiMakinaSayisi({stock, customers})` |
| Parti ekranı ve kilidi | `gider/UretimPartileri.jsx:19` (prop `makinaMaliyet = null` **varsayılanı var**, yani maliyet kutusu prop verilmezse kendiliğinden çizilmez), `:25` `useLock("uretim_partisi", …)` |
| Parti bölümünün sunucu eşlemesi | `serverAuth.cjs:19` (bölüm), `:62` (`giderActions`), `:76` (`GIDER_BOLUMLERI`), `:146` (`["gider"]`), `:542` (`gider_tanim`) |
| Makina kiti | `db.cjs:317-318` iki model tablosunda `defaultParcalar`, satır `{partId, ad, miktar}`, ekranı `ModelsManager.jsx:231-250` |
| Gerçek satış bedeli | `utils.gercekSatisBedeli`, kur `makinaMaliyeti.js:331` `satisKurBilgisi` |
| Türsüz kalemlerin tek satırı | `gider.js:1127` (`ad: "(türsüz)"`, `turId` tanımsız) |
| Yürürlük öncesi dalı (`turKirilimi` yok) | `gider.js:1086-1088` |
| Ayın üretim sayısından partili makinanın çıkarılması | `makinaMaliyeti.js:254` (0022 R12) |
| Üretim tarihi çözümü | `makinaMaliyeti.js:69` `musteriUretimTarihi` (dışa verili), `:95` `stokUretimTarihi` (**dışa verilmemiş**), `:34` `URETIM_KAYNAK` |
| Bugünkü fiyat önerisi ve KAT doğrulaması | `makinaMaliyeti.js:472-492` (`FIYAT_YONTEM`) |
| Parti kapanış anlık görüntüsü | `UretimPartileri.jsx:39` → `uretimPartisi.js:39-42` `kapanisAnlikGoruntusu` (`aylar` yoksa `{}`) |
| Parti tablosunun maliyet sütunları | `UretimPartileri.jsx:83-86` (`ozet` = `makinaMaliyet.partiler`) |
| "Değişen ortak gider" kutusunun gerçek yeri | `MakinaModelGorunumu.jsx:125` (`testId="parti-degisimleri"`) |
| Giderler görünüm dizisi ve taraması | `Giderler.jsx:40` (`GORUNUMLER`, tek satır), `:46` `gecerliGorunum`, tarama `tests/yerlesim-0083.test.js:14-40` |
| Genel aramanın parti yönlendirmesi | `GlobalSearch.jsx:93` ve `:163` |
| Tür silme: kalemlerin hedef türe taşınması | `GiderTurManager.jsx:64-82` (`turKullanim`, `hedefId`, `tur_tasindi`) |
| Gider ayarlarının yedek notu | `yedekPaketleri.js:10-12` (`GIDER_AYAR_NOTU`, sekiz alanı adıyla sayar) |
| Gider ayarları formunun tek nesneyi yazması | `SettingsGider.jsx:51` |
| Üretim partisi okumasının yayılması | `db.cjs:1529`; boş değer ayıklama emsali `:1437` `ekMaliyetOku` |
| Mali İşler grubunun çocukları | `menuGruplari.js:4`, kriteri `tests/menu-gruplari.test.js:17` |

### Taşımanın ölçülen bedeli (QA turu)

Parti görünümünü taşımak Giderler'in görünüm çubuğunu beşten dörde indirir ve bu çubuk üç spec
tarafından testle sabitlenmiş durumda. Ölçülen bağlar:

| Bağ | Yer | Sonuç |
|---|---|---|
| Beş etiketin tek dizide birlikte durması | `tests/yerlesim-0083.test.js:14` (`ETIKETLER`), `:34-40` | tarama ve `GORUNUMLER` iddiası kırılır |
| Dönemsiz görünüm kümesi | aynı test, `DONEMSIZ = new Set(["partiler"])` | küme boşalır |
| Çubuğun sırası (iki ayrı spec) | `tests/ui/yerlesim-0083.test.jsx:36`, `tests/ui/standart-kalkar-0082.test.jsx:47` | kriter ters çevrilir |
| Dönem seçicisinin pasif olduğu görünüm | `ui/yerlesim-0083` AC-4, `ui/standart-kalkar-0082` AC-6 | koşul kalkar |
| Diğer görünümlerin adlarını sayan kriter | `tests/ui/stopaj-donemi-0084.test.jsx:37` | liste kısalır |
| Parti ekranının bütün arayüz testi | `tests/ui/uretim-partisi.test.jsx` (`partilerSekmesi`) | düzenek yeni ekrana geçer |
| Menü grubunun çocukları | `tests/menu-gruplari.test.js:17` | dördüncü çocuk eklenir |
| Genel aramanın yönlendirmesi | `GlobalSearch.jsx:163` → `Giderler.jsx:46` | **sessizce** Dönem Raporu açılır |
| Görüntü aracı ekranı | `scripts/evidence/0009-sayfa.jsx:728` | adım yeni sekmeye taşınır |

*Reddedilen seçenek:* partiyi iki ekranda birlikte göstermek. Aynı kaydı iki yer yazar, 0064 R25'in
"bir kayıt, bir kilit" kuralıyla çatışır ve kullanıcı hangisinin doğru olduğunu bilemez.

### Sunucu eşlemesinin ölçümü

| Bölüm | Bugünkü `BOLUM_SEKMELERI` | İzin grubu | Bu ekran yazar mı |
|---|---|---|---|
| `uretimPartileri` | `["gider"]` (`:146`) | `giderActions` (`:62`) | evet (parti kaydı) |
| `giderTurleri` | `["settings"]` (`:135`) | `giderActions` (`:60`) | evet (`maliyetRolu`) |
| `standardModels` | `["settings"]` (`:125`) | `"settings"` (`:53`) | evet (katsayı, kalıp fiyatı) |
| `customModels` | `["settings"]` (`:126`) | `"settings"` (`:54`) | evet (katsayı, kalıp fiyatı) |
| `appSettings` | `["settings", "stock"]` (`:128`) | `"settings"` | evet (`maliyetAyarlari`) |

Yani bugünkü hâliyle R2'nin kullanıcısı (yeni sekme + Giderler, Ayarlar sekmesi yok) dört yazımdan
üçünde 403 alır. `grupEngelli`'nin settings dalı yalnız "sadece server" listesini engellediği için
izin grubu kapı değildir; kapı `sekmeEngelli`'dir (C9).

### Tabanların ve kuruşun ölçümü

| Rakam | Taban | Saklama |
|---|---|---|
| Parça alış maliyeti | TL, **KDV hariç matrah** (0087 R1) | `parts.maliyet` `REAL`, TL ondalıklı |
| Modelin ek maliyet kalemi | TL, KDV hariç, her makina için (0087 R9) | `ekMaliyetler` JSON |
| Genel gider havuzu | `kalemGiderTutari` = **matrah + indirilemeyen KDV** (0076 R14) | `turKirilimi.toplam`, `tl()` ile iki ondalık |
| Gerçek satış bedeli | KDV hariç bedel (`gercekSatisBedeli`) | kayıttan, kur `satisKurBilgisi` |

İki taban bilinçli olarak farklı: indirilemeyen KDV gerçek bir maliyettir ve 0076 R15 onu kova
tabanına da koydu. Sonucu R21'in fark satırının sıfır **olmaması**, ve bunun ekranda yazılı olması.
Gider ve kasa motorlarının tamamı kuruş tamsayısı olduğu için bu motor da kuruşla hesaplar (R25/2);
0087 C6 kuruşa çevirmeyi açıkça bu spec'e bıraktı.

### Üretim adedinin ölçümü

Bugünkü ay tablosunun `uretimAdedi`'si partili makinayı **saymıyor**
(`makinaMaliyeti.js:254`, `if (m.veriYok || m.parti) continue;`, 0022 R12) ve üretim tarihi tek
alan değil, bir çözüm zinciri: kayıt → `makina_uretimi` stok hareketi → satış tarihi, kaynağı
`URETIM_KAYNAK` ile etiketli (`kayit` · `hareket` · `tahmin` · `dogrudan` · `bilinmiyor`). Müşteri
tarafı dışa verili (`musteriUretimTarihi`), stok tarafı modül içi (`stokUretimTarihi`). Bu yüzden
R9/2 kümeyi kendisi tanımlar ve R9/3 zincirin dışa verilmesini ister; ikinci bir üretim tarihi
kuralı yazmak 0002 C2'nin (`gercekSatisBedeli`) dersinin tersidir.

### Tür silmenin ölçümü

Kullanımdaki gider türü silinirken pencere kalem ve tanım sayısını gösteriyor, bir **hedef tür**
seçtiriyor, kalemleri oraya taşıyor ve `tur_tasindi` izini yazıyor (`GiderTurManager.jsx:64-82`).
Davranış kullanıma girince kilitleniyor (`:56`), ama rol bir davranış değil, her zaman
değiştirilebilir. İki sonuç: (a) AC-17'nin "havuzdan düşer"i yalnız kalemler başka türe gittiği için
doğrudur; (b) taşıma rolü farklı bir türe denk gelirse havuz sessizce değişir, bu yüzden R30
pencereye hedef türün rolünü yazdırıyor.

### Bulgular (öneri kuralı 5)

- **B1. Gider türü rolü iki değerli mi, üç değerli mi?** Takım Yöneticisi "hangi giderler maliyete
  girer" seçimini onayladı; ölçüm sırasında rolün **üç** değer gerektirdiği çıktı.
  *Önerim:* üç rol (R5). *Gerekçe:* Excel iki havuzu (4.253.445 tedarik ve 9.582.000 genel masraf)
  hiçbir yerde toplamıyor; iki değerli bir işaret ("maliyete girer / girmez") tedarik faturalarını
  genel gider havuzuna sokar ve makina başına pay üç katına çıkar. *Maliyeti:* tür tanımında tek
  alan, ekranda üç durumlu seçim. *Reddedilen seçenek:* iki değerli işaret + ayrıca "bu tür ürün
  ağacında var" notu; aynı bilgi iki yerde durur ve biri unutulur.
- **B2. Varsayılan rol ne olmalı?** *Önerim:* rolü verilmemiş tür "maliyete girmez" (R6).
  *Gerekçe:* sessiz varsayılan yanlış maliyet üretir ve yanlış olduğu anlaşılmaz; 0071'in "Tutar
  girilmedi" rozeti aynı sorunu böyle çözdü. *Maliyeti:* ilk kurulumda kullanıcı türleri bir kez
  işaretler, o zamana kadar ekran boş durum gösterir.
- **B3. Planlanan adet (R18) gerekli mi?** *Önerim:* evet, ama işin **kesilebilir** parçası.
  *Gerekçe:* fiyat kararı üretimden önce veriliyor; henüz makinası olmayan parti seçilince ekran
  boş kalır. *Maliyeti:* parti kaydında bir JSON alan ve tabloda düzenlenebilir adet kolonu.
  *Kesilirse:* yalnız makinası girilmiş partiler hesaplanır, fiyatlama Model Maliyetleri
  görünümünden yapılır (orada adet gerekmiyor).
- **B4. Parti kapanışında maliyet dondurulsun mu?** *Önerim:* bu spec'te **hayır** (X6).
  *Gerekçe:* 0022'nin "geçici" etiketi ve 0002 C10 ("rakam dondurulmaz") aynı kararı veriyor;
  dondurma kendi göçünü ve kapanmış partilerin geçmiş rakamlarının korunmasını gerektirir.
  *Bilinen sınır yazılır.*
- **B5. "Kapanmış partilerin aylarında değişen ortak gider" kutusu (revizyon 1'in ölçümü
  YANLIŞTI).** Revizyon 1 kutuyu parti ekranında sanıyor ve `UretimPartileri.jsx:19`'daki
  `makinaMaliyet = null` varsayılanını kanıt sayıyordu. Yeniden ölçüldü: kutu
  `MakinaModelGorunumu.jsx:125`'te, yani **Makina ve Model** görünümünde (görüntü aracının
  `giderler-model-parti-degisim` adımı da oraya gidiyor). Prop'u kesmenin gerçek sonucu başka:
  `UretimPartileri.jsx:39` kayıtta `partiKapanisUygula(…, makinaMaliyet?.aylar, …)` çağırıyor ve
  `kapanisAnlikGoruntusu` `aylar` yoksa `{}` döndürüyor, yani 0022 R15'in kapanış anlık görüntüsü
  sessizce boşalır; ayrıca parti tablosunun üç sütunu "—" olur ve makinası olan partide "Bağlı
  makina yok" ipucu çizilir. *Önerim:* prop aynen verilir, R24 ters çevrilir, AC-37 kaldırılır.
  *Gerekçe:* C5 bugünkü maliyet modelinin değişmemesini istiyor; bu taşıma onu yan etkiyle
  bozuyordu. *Reddedilen seçenek:* yalnız `makinaMaliyet.aylar` geçmek; kapanış düzelir, tablo
  sütunları "—" kalır ve AC-34'ün "değişmemiştir" iddiası yine tutmaz.
- **B6. Sekmenin adı.** *Önerim:* "Makina Maliyeti". *Gerekçe:* menüde kısa durur, Giderler'deki
  "Makina Kârlılığı" ile karışmaz ve 0089'dan sonra o ad boşalır. *Alternatif:* "Maliyet ve
  Fiyatlama" (ekranın fiyat önerisi tarafını da söyler, ama menüde uzun).
- **B7. Varsayılan adedin birimi.** *Önerim:* dönemin tamamı için toplam adet, etiketle ve türetilmiş
  "≈ n makina/ay" ile birlikte (R8/2). *Gerekçe:* Excel'in `D88 = 10`'u aylık; on iki aylık dönemde
  aynı rakamı yazan kullanıcı payı 12 katına çıkarır ve bu sessiz hata doğrudan fiyat kararına
  giriyor. *Reddedilen seçenek:* aylık adet istemek ve dönem uzunluğuyla çarpmak; dönem tam ay
  sayısı olmayabilir ve Excel'in yer değiştirmiş iki etiketini (Context'teki tutarsızlık 2)
  uygulamaya taşır.
- **B8. Parti hesabındaki payın dönemi.** Revizyon 1'de R12 hesap ayarlarının dönemini, R19 parti
  satırını, AC-32 partinin dönemini tanımlıyor ve hangisinin kullanıldığı yazılı değildi.
  *Önerim:* tek pay, hesap ayarlarından (R28). *Gerekçe:* iki dönem iki rakam üretir, aynı model iki
  görünümde farklı toplam gösterir; Excel de tek `G88` kullanıyor. *Maliyeti:* parti dönemi yalnız
  tedarik karşılaştırması ve makina türetimi için okunur.
- **B9. Kuruş kuralı.** *Önerim:* motorun tamamı kuruş tamsayısı, pay `Math.floor`, artık kuruş
  dağıtılmaz (R25/2). *Gerekçe:* 0087 C6 bu kararı bu spec'e bıraktı; yetmiş satırlık ürün
  ağacında float toplamı kuruş kaydırır ve R21'in fark satırı sıfır olması gereken yerde kuruş
  gösterip kullanıcıya hesabı yanlış sandırır.
- **B10. Gerçek üretim adedi.** *Önerim:* kümeyi bu spec tanımlar ve bugünkü çözücü dışa verilir
  (R9/2, R9/3). *Gerekçe:* bugünkü `uretimAdedi` partili makinayı saymıyor, yani parti kullanan
  fabrikada kıyas sıfır çıkar; ikinci bir üretim tarihi kuralı yazmak iki rakam demek.
  *Reddedilen seçenek:* kıyas rakamını hiç göstermemek; Takım Yöneticisi kararı R9'da gerçek adedin
  görünmesini istiyor.
- **B11. Hesap ayarlarının yeri.** *Önerim:* `appSettings.maliyetAyarlari` kendi anahtarı (R29).
  *Gerekçe:* `giderAyarlari`'nı Ayarlar › Gider Ayarları formu bütün olarak yazıyor
  (`SettingsGider.jsx:51`); tek nesneyi iki ekranın yazması 0082'nin ölü anahtar düşürme işinde
  bedelini gösterdi. *Maliyeti:* bir JSON sütun daha ve yedek paketi notuna bir cümle.

### Karar kaydı (Takım Yöneticisi, 2026-10-16)

| Soru | Karar |
|---|---|
| Üretim partisi kavramı kalsın mı? | Kalır, Giderler'den çıkar ve bu ekrana taşınır. |
| Hesap standart mı, gerçekleşen mi? | İkisi ve farkı (R21). |
| Gider seçimi tür bazlı mı? | Tür bazlı (R5); kalem bazlı seçim kapsam dışı (X3). |
| Genel gider payı hangi adede bölünür? | Varsayılan adede; gerçekleşen adet kıyas olarak gösterilir (R8, R9). |
| Parça maliyeti para birimi | Yalnız TL (0087 R1). |
| Eski görünümler bu işte mi kalkar? | Hayır, sonraki işte (0089). |
| Giderler kaç görünüme iner? | Dörde; parti taşındığı için (R23/2). |
| Parti ekranı eski maliyet rakamlarını göstermeye devam eder mi? | Eder; `makinaMaliyet` verilir, sütunlar 0089'da değişir (R24). |
| Varsayılan adet aylık mı, dönemsel mi? | Dönemsel toplam; aylık karşılığı türetilip gösterilir (R8/2). |
| Parti hesabı hangi payı kullanır? | Hesap ayarlarının payını; tek varsayım (R28). |

---

### Uygulama planı kararları (2026-10-16, revizyon 3, Takım Yöneticisi onayı)

| # | Konu | Karar |
|---|---|---|
| P1 | `ON_KOSUL_SEKMELERI` bölüm düzeyinde | Sekme düzeyinde önkoşul `SEKME_ON_KOSULLARI` (C9/2) |
| P2 | `appSettings` alan düzeyinde denetleniyor | `maliyetAyarlari` alanı, AC-6/3 ters; bilinen sınır tür ve model bölümlerinde (C9/3) |
| P3 | Üretim tarihi çözümü | `makinaListesi` kullanılır (R9/3) |
| P4 | KAT doğrulaması gömülü | `katDegeriDogrula` çıkarılır, çıktı aynı (R14/2) |
| P5 | Yeni yazımların kilidi | R32 |
| P6 | Planlanan adet ve model adı | Taşınmaz, görünür "model bulunamadı" (R18/2) |
| P7 | Üretim Partileri bileşeni | `gider/UretimPartileri.jsx` yerinde kalır, yeni sekme içe alır |
| P8 | Alan adları | C7 |
| P9 | Görsel kanıt | Giderler çubuğu dörde indiği için Giderler ekranlarının tamamı bu spec'te değişir; kabul |
| P10 | Yedek | Not (`MALIYET_AYAR_NOTU`), AC-43/3 nota çevrildi (R29) |
| P11 | Gizlilik | Yeni dosyalar `gider-gizlilik` taramalarına, çıktı testi ayırt edici adlarla (AC-39, AC-40) |

### QA turu kararları (2026-10-16, Takım Yöneticisi onayı)

| # | Bulgu | Karar |
|---|---|---|
| B-1 | R23 ile AC-42 çelişiyor, taşıma altı test dosyasında kriter ters çeviriyor | Giderler dörde iner; ters çevrilen kriterler listelenir (R23/2, C14) |
| B-2 | R24 ve B5 yanlış ölçüm; prop'u kesmek kapanış anlık görüntüsünü bozuyor | R24 ters çevrildi, `makinaMaliyet` verilir, AC-37 kaldırıldı |
| B-3 | R4'ün yazdığı dört bölümün üçü sunucuda yalnız `["settings"]` | Dört bölüme yeni sekme, `appSettings`'te alan düzeyinde `maliyetAyarlari`; önkoşul sekme düzeyinde `SEKME_ON_KOSULLARI` `{ maliyet: ["gider"] }` (C9, revizyon 3) |
| B-4 | Varsayılan adedin birimi tanımsız, Excel'in sayısı aylık | Dönemsel toplam adet, "≈ n makina/ay" (R8/2, R8/3) |
| B-5 | Kuruş kuralı yazılmamış (0087 C6 bu spec'e bıraktı) | Kuruş tamsayısı, pay `Math.floor`, artık dağıtılmaz (R25/2) |
| B-6 | R9'un gerçek adedi bugünkü `uretimAdedi`'nden okunamaz | Küme tanımlandı, çözücü dışa verilir (R9/2, R9/3) |
| Ö-7 | Parti payının dönemi belirsiz | Hesap ayarlarının payı; tek pay (R28) |
| Ö-8 | Yürürlük öncesi dönemde `turKirilimi` dönmüyor | Dal açıkça karşılanır, boş durum çizilir (C2/2) |
| Ö-9 | İki karşılaştırmanın tabanı farklı | `kalemGiderTutari` korunur, iki yere yazılır (R8, R21/2) |
| Ö-10 | AC-17 eksik ölçüm; kalemler hedef türe taşınıyor | AC-17 yeniden yazıldı, pencere hedef rolü gösterir (R30) |
| Ö-11 | Rol ve adet değişikliği geçmişi oynatıyor | X6 genişletildi, ekranda ibare (R31, C13) |
| Ö-12 | 0087 R17'nin çöpteki parça kararı geçmemiş | Kit satırı canlı parçaya bakmıyorsa "eksik" (R13/2) |
| Ö-13 | Kâr tanımları yok, satılmamış makinaların yeri belirsiz | İki kâr iki kümeden, adet kırılımı yazılır (R20/2) |
| Ö-14 | R21'in dönem çakışması ve parti öncesi tedarik | İki bilgi cümlesi; tedarik bölünmez (R21/2) |
| Ö-15 | Arama yönlendirmesi taşınmazsa sessizce yanlış ekran açılıyor | Yönlendirme ve kapı taşınır (R23/3) |
| Ö-16 | `uretim_partileri` okuması yayıyor, NULL gövdeye düşer | Okumada ayıklama (`bosOlmayan`), C8/2 |
| Ö-17 | Rol alanının adı ve `davranis` ile karışma riski | `maliyetRolu`, üç değer, ad tuzağı notu (R5, C15) |
| Ö-18 | Motorun ve ekranın dosya adları yazılmamış | `makinaStandartMaliyet.js`, `MakinaMaliyeti.jsx`, kimlik `maliyet` (R1) |
| Ö-19 | Hesap ayarlarının yeri ve yedek notu | `appSettings.maliyetAyarlari`, nota bir cümle (R29) |
| Ö-20 | Katsayı bugünkü KAT yöntemiyle aynı kavram | Aynı doğrulama ve uyarı, beş ondalık (R14/2) |
| K-21 | AC-13 ve AC-14'ün sınır değerleri eksik | 1–10000 tam sayı, dönem önerisi yazılmaz gösterilir (R8/3) |
| K-22 | R15 ölçülmemiş | Model başına tek TL liste fiyatı, KDV hariç; ölçü bazlı kapsam dışı (R15, X10) |
| K-23 | `types.d.ts` DoD'da yok (0087'nin K-24 dersi) | Dört yeni alan oraya da yazılır (C7) |
| K-24 | Menü grubu kriteri çocukları sabitliyor | Ters çevrilen kriter listesine girdi (C14) |
| K-25 | Satış tarafının tabanı yazılmamış | Öneri fiyat ve ciro KDV hariç, kur durumu satırda (R14/3, C11) |
| K-26 | AC-12'nin kümesi | "(türsüz)" satırı rol seçiminde çizilmez (R6/2) |
| K-27 | Beş satır ölçüm hatası | `App.jsx:53`, `db.cjs:883` ve `:1491`, `ModelsManager.jsx:231-250`, `permissions.js:33-48`, kutunun yeri `MakinaModelGorunumu.jsx:125` düzeltildi |

---

## Acceptance Criteria

### Sekme ve izin

- **AC-1.** Yeni sekme kenar çubuğunda Mali İşler grubunun içinde, Kasa'dan sonra çizilir.
- **AC-2.** İzin listesinde yeni sekme yazmayan kullanıcıda sekme menüde hiç görünmez.
- **AC-3.** İzin listesinde yeni sekme yazan ama Giderler'i olmayan kullanıcıda sekme görünmez.
- **AC-4.** Yerel kipte, sunucu bilgisayarında ve admin kullanıcıda sekme görünür.
- **AC-5.** İzin ekranında sekme kutusu "(varsayılan kapalı)" ibaresiyle çizilir ve varsayılan
  kullanıcı sekme listesinde yoktur.
- **AC-6.** Yalnız bu sekmesi (ve Giderler'i) olan, **Ayarlar sekmesi olmayan** kullanıcı ekranın
  dört yazımını da kaydedebilir (sunucu 403 vermez): tür rolü, hesap ayarları, modelin kâr katsayısı
  ve Extra Kalıp fiyatı, üretim partisi.
- **AC-6/2.** Yeni sekmesi yazılı ama Giderler'i olmayan kullanıcı bu beş bölümü **yazamaz**
  (sunucudaki önkoşul aynası, sekme düzeyinde `SEKME_ON_KOSULLARI`, revizyon 3).
- **AC-6/3.** Yalnız bu sekmesi (ve Giderler'i) olan kullanıcı `appSettings`'in **diğer** alanlarını yazamaz (alan
  düzeyinde denetim, C9/3 revizyon 3); bölüm düzeyinde güvenilen tür ve model bölümlerinin sınırı sabitlenir.
- **AC-7.** `gider_tanim` izni olmayan kullanıcı ekranı görür ama tür rolü, varsayılan adet, kâr
  katsayısı ve parti düğmelerini görmez.

### Hesap ayarları

- **AC-8.** Gider türüne üç rolden biri verilir ve kaydedilip yeniden açıldığında aynı kalır.
- **AC-9.** Rolü verilmemiş tür "maliyete girmez" sayılır ve ekran rolü verilmemiş tür sayısını
  yazar.
- **AC-10.** Hiçbir türe rol verilmemişken Model Maliyetleri görünümü genel gider payını sıfır
  gösterir ve bunun nedenini söyleyen boş durum çizilir.
- **AC-11.** "Ürün ağacından gelir" rolündeki türün tutarı genel gider havuzuna girmez: aynı veride
  rol "genel gidere girer"e çevrilince havuz o tür kadar artar, geri çevrilince eski değere döner.
- **AC-12.** Türsüz gider kalemleri (türü seçilmemiş) hiçbir havuza girmez ve ekran sayısını yazar;
  tür kırılımının "(türsüz)" satırı rol seçiminde **çizilmez**.
- **AC-13.** Varsayılan üretim adedi sıfır, negatif, ondalık ya da 10000'den büyük girilemez; hata
  metni çıkar ve kayıt yazılmaz.
- **AC-13/2.** Alanın etiketi dönemsel toplam adedi söyler ve yanında türetilmiş "≈ n makina/ay"
  yazar; on iki aylık dönemde 120 girilince aylık karşılık 10 görünür.
- **AC-14.** Dönem aralığı ters girilirse (başlangıç > bitiş) hata metni çıkar ve hesap
  çalışmaz.
- **AC-14/2.** Dönem ve adet hiç girilmemişken ekran boş durum çizer, dönem önerisini (son on iki
  tam ay) **gösterir** ama kendiliğinden kaydetmez.
- **AC-15.** Makina başına pay = dönem havuzu ÷ varsayılan adet, kuruşla ve `Math.floor` ile; ekran
  aynı dönemde gerçekte üretilmiş adedi ve ona göre hesaplanmış payı ayrıca gösterir.
- **AC-15/2.** Gerçek adet, partili makinaları da sayar (bugünkü ay tablosunun `uretimAdedi`'si ile
  **aynı değildir**): partili bir makinayla kurulmuş veride gerçek adet sıfır çıkmaz.
- **AC-15/3.** Gerçek adet sıfırken kıyas payı yazılmaz, nedeni yazılır ve bölme yapılmaz.
- **AC-15/4.** Üretim tarihi çözülemeyen makina gerçek adede girmez ve sayısı ayrıca yazılır.
- **AC-16.** Yürürlük ayından önceki tarihli gider kalemi hiçbir havuza girmez.
- **AC-16/2.** Dönem bütünüyle yürürlük ayından önceyse (gider motorunun `turKirilimi` döndürmediği
  dal) hesap hata atmaz: havuz sıfırdır ve nedenini söyleyen boş durum çizilir.
- **AC-17.** Kullanımdaki tür silinince kalemler hedef türe taşınır ve havuz **hedef türün rolüne
  göre** değişir; silme penceresi hedef türün rolünü gösterir ve roller farklıysa uyarır.
- **AC-17/2.** Kullanımda olmayan rolü verilmiş tür çöpe atılınca havuz değişmez (kalemi yoktur).

### Model maliyeti

- **AC-18.** Model satırı direkt maliyeti, genel gider payını ve toplamı ayrı ayrı gösterir; üçü
  tek rakamda birleştirilmez.
- **AC-19.** Direkt maliyet = Σ(kit parçasının birim maliyeti × adet) + Σ(ek maliyet kalemleri).
- **AC-20.** Kitinde maliyeti girilmemiş parça olan modelin satırı "eksik" işareti taşır ve eksik
  parça sayısını yazar.
- **AC-20/2.** Kit satırı çöpteki ya da hiç bulunmayan bir parçaya bakıyorsa o satır da "eksik"
  sayılır ve sayıya girer (0087 R17'nin devrettiği karar).
- **AC-21.** Kiti boş olan modelin direkt maliyeti sıfırdır ve satır "ürün ağacı girilmemiş"
  ibaresiyle çizilir; rakam sessizce sıfır gösterilmez.
- **AC-22.** Kâr katsayısı girilmiş modelde öneri fiyat = toplam maliyet × katsayı; girilmemişse
  öneri fiyat "—".
- **AC-22/2.** Katsayı sıfır ya da negatif girilemez (hata metni), 1'in altında girilince "zararına
  satış" uyarısı çıkar ve beş ondalıklı virgüllü değer (2,19498) kabul edilir.
- **AC-22/3.** Öneri fiyatın ve önerilen cironun KDV hariç olduğu ekranda yazar.
- **AC-23.** Extra Kalıp liste fiyatı model satırında görünür ve maliyete eklenmez.
- **AC-24.** Satır açıldığında döküm görünür: her parça adı · adet · birim maliyet · satır tutarı,
  ek maliyet kalemleri ve genel gider payı.
- **AC-25.** Çöpteki model listede görünmez.

### Parti hesabı

- **AC-26.** Parti seçilince model-adet tablosu partiye bağlı makinalardan türetilir; stoktaki ve
  müşteriye geçmiş makinalar birlikte sayılır.
- **AC-27.** Planlanan adet girilen modelde hesap planlanan adedi kullanır ve satır "planlanan"
  ibaresi taşır.
- **AC-28.** Makinası olmayan ve planlanan adedi girilmemiş parti için boş durum çizilir.
- **AC-29.** Parti özeti toplam standart maliyeti, önerilen ciroyu, gerçekleşen satışı ve iki kâr
  rakamını gösterir.
- **AC-29/2.** İki kâr farklı kümeden hesaplanır: öneriye göre kâr partinin bütün adedinden,
  gerçeğe göre kâr yalnız satılmış makinalardan; yarısı stokta duran partide gerçek kâr yapay
  olarak negatif çıkmaz.
- **AC-29/3.** Özet adet kırılımını yazar: satılmış, stokta, bedelsiz, kuru olmayan.
- **AC-29/4.** Parti satırındaki genel gider payı **hesap ayarlarının** payıdır; aynı model Model
  Maliyetleri görünümünde ve Parti Hesabı'nda aynı birim toplamı gösterir.
- **AC-30.** Döviz cinsinden satılmış ve kuru olmayan makina gerçekleşen satış toplamına girmez;
  ekran kaç makinanın dışarıda kaldığını yazar.
- **AC-31.** Gerçekleşen tedarik karşılaştırması partinin döneminde "Ürün ağacından gelir"
  rolündeki türlerin toplamını, standart direkt maliyeti ve farkı gösterir.
- **AC-31/2.** Karşılaştırma farkın iki yapısal nedenini yazar: tabanların farkı (gerçekleşen tutar
  indirilemeyen KDV'yi içerir) ve dönem farkı (parti öncesi tedarik kapsam dışıdır, aynı ayları
  paylaşan parti sayısı yazılır).
- **AC-32.** Açık partide dönem bugünün ayına kadar alınır; kapalı partide bitiş ayına kadar.
- **AC-33.** Partisiz makina sayısı ekranda yazar ve bu makinalar parti hesabına girmez.

### Üretim partilerinin taşınması

- **AC-34.** Üretim partisi ekleme, düzenleme, kapatma ve silme yeni ekranda çalışır; kayıt alanları
  ve doğrulama metinleri değişmemiştir.
- **AC-35.** Parti kaydının kilidi aynı alanda çalışır: başka kullanıcı aynı partiyi açmışken form
  yerine çakışma penceresi çizilir.
- **AC-36.** Çöpe atılan parti çöp kutusunda bugünkü satır türüyle görünür, geri alınır ve kalıcı
  silinir.
- **AC-37.** Parti kapanışı bugünkü gibi çalışır: bitiş ayı girilince `kapanisOrtaklari` anlık
  görüntüsü dolu yazılır (boş nesne değil) ve parti tablosunun üç sütunu ile "Açık · geçici" rozeti
  bugünkü rakamları gösterir.
- **AC-37/2.** "Kapanmış partilerin aylarında değişen ortak gider" kutusu Giderler'in Makina ve
  Model görünümünde yerinde kalır ve bu spec'ten önceki hâliyle çalışır.
- **AC-37/3.** Genel aramanın üretim partisi sonucu yeni sekmeyi açar; yeni sekmesi olmayan
  kullanıcıda parti kategorisi hiç çıkmaz.
- **AC-38.** Yedekten geri yüklemede üretim partileri bugünkü paketle gelir (paket cümlesi
  değişmez).

### Gizlilik ve değişmeyenler

- **AC-39.** Genel gider havuzuna personel gideri giren bir veride ekranda çalışan adı, kişi bazlı
  tutar ve resmi/elden ayrımı geçmez; personel tek satır olarak görünür.
- **AC-40.** Kaynak taraması: yeni ekranın ve motorunun dosyaları gider gizliliği taramasının
  yasaklı ad listesine girer.
- **AC-41.** Bu ekran hiçbir gider kalemini değiştirmez: ekranda gezinip ayar değiştirdikten sonra
  gider kayıtlarının gövdesi birebir aynıdır.
- **AC-42.** Giderler ekranı **dört görünüme** iner (Dönem Raporu · Tedarikler ve Ekstre · Makina
  Kârlılığı · Makina ve Model) ve kalan dördünün içeriği, Dönem Raporu'nun rakamları ile bugünkü
  Makina Kârlılığı görünümü bu spec öncesiyle birebir aynıdır (kıyas fikstürüyle ölçülür).
- **AC-42/2.** Giderler'in dönem seçicisi artık hiçbir görünümde pasif değildir (dönemsiz görünüm
  kümesi boşaldı) ve bilinmeyen başlangıç görünümü yine sessizce Dönem Raporu'na düşer.
- **AC-43.** Veritabanı gidiş-dönüşünde tür rolü, hesap ayarları, kâr katsayısı, Extra Kalıp fiyatı
  ve planlanan adetler korunur; temiz kurulumda da alanlar mevcuttur.
- **AC-43/2.** Hesap ayarları `appSettings`'in kendi anahtarındadır, çakışma birleştirmesinde bu
  PC'nin değişikliği korunur (`mergeAppSettings`) ve `disAppSettingsSuz` onu **düşürmez** (yani
  istemciler arasında taşınır).
- **AC-43/3.** Yedekten geri yüklemede hesap ayarları "Firma ve ayarlar" paketiyle gelir ve paketin altında bunu söyleyen
  not (`MALIYET_AYAR_NOTU`) çizilir.
- **AC-44.** Rolü verilmemiş tür, katsayısı girilmemiş model ve planlanan adedi olmayan partinin
  kayıt gövdesi bu spec öncesiyle birebir aynıdır.
- **AC-45.** Çakışma birleştirmesinde yeni alanlar bugünkü bölüm kurallarıyla taşınır: `customModels`
  kimliği model adıdır, `uretimPartileri` kimliği `id`'dir.
- **AC-45/2.** **Bilinen sınır (kriterle sabitlenir):** `standardModels` birleştirmeye hiç girmez
  (0077 X7), yani standart bir modelin kâr katsayısı ve Extra Kalıp fiyatı çakışmada sunucu
  kopyasına yenilir; 0087 C8 ile aynı sınıftır.
- **AC-46.** Hesap sırası kuruşla yapılır: aynı veride float toplamla hesaplanan rakamla kuruş
  toplamı arasındaki sapma yoktur ve pay `Math.floor`'dan sonra artık kuruş dağıtılmaz.
- **AC-47.** Personel, kira ve SGK davranışlı türe "Ürün ağacından gelir" rolü verilince uyarı
  çıkar ama kayıt engellenmez.
- **AC-48.** Ekranda "rakamlar bugünkü ayarlarla hesaplanır" ibaresi görünür ve kapanmış partinin
  rakamı tür rolü değişince değişir (bilinen sınır, kriterle sabit).
- **AC-49.** Kaynak taraması: üretim tarihi çözümü yalnız `makinaMaliyeti.js`'te tanımlıdır; yeni
  motor onu içe aktarır, kendi zincirini yazmaz.
- **AC-50.** Kaynak taraması: `maliyetRolu` ile `davranis` aynı kayıtta durur, yeni motor ve ekran
  rolü davranışla karıştırmaz (ad tuzağı).
- **AC-51.** `src/types.d.ts` dört yeni alanı taşır.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Hesap React'sız **saf motorda** yazıldı ve kendi testi var; ekranda çarpım/bölme olmadığı
      kaynak taramasıyla sabitlendi (R25).
- [x] Dönem havuzu bugünkü gider motorundan okunuyor; ikinci bir süzme/toplama yazılmadığı
      taramayla sabitlendi (C2).
- [x] Dört nokta kuralı uygulandı (hesap ayarları, kâr katsayısı, Extra Kalıp fiyatı, planlanan
      adetler) ve `db-roundtrip` + `db-clean-install`e eklendi; tür rolünün JSON'da taşındığı
      ölçüldü. Boş değerin gövdeye yazılmadığı ölçüldü (parti okuması alanları yaydığı için
      ayıklama gerekti, C8/2) ve `src/types.d.ts` güncellendi.
- [x] Yeni veri bölümü **yok**; bu açıkça yazıldı. Yeni eylem izni **yok**, yalnız yeni sekme izni;
      **beş** bölümün sunucu sekme eşlemesi, yeni sekmenin önkoşulu ve izin ekranı birlikte
      güncellendi (C6, C9) ve kabul edilen `appSettings` sınırı `server-authz` ile sabitlendi.
- [x] Hesap kuruş tamsayısıyla yapıldı; yuvarlama ve artık kuruş kuralı testle sabitlendi (R25/2).
- [x] Üretim tarihi çözümü dışa verili `makinaListesi`'nden okunuyor (revizyon 3) ve ikinci bir zincir yazılmadığı taramayla
      sabitlendi (R9/3, AC-49).
- [x] Taşımanın bedeli ödendi: Giderler dört görünüme indi, C14'teki ters çevrilen kriterlerin
      hepsi yorumda "spec 0088 ile" notuyla güncellendi, genel aramanın yönlendirmesi ve görüntü
      aracının ekran adımı taşındı, parti ekranına `makinaMaliyet` verildi ve parti kapanışının
      anlık görüntüsünün dolu yazıldığı ölçüldü (AC-37).
- [x] Çift sayım yasağının testi var (AC-11) ve eski maliyet modelinin değişmediği kıyas
      fikstürüyle ölçüldü (AC-42).
- [x] Gizlilik taraması yeni dosyaları kapsıyor (AC-40); personel ayrıntısı hiçbir yerde yok.
- [x] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı yok (bu da yazıldı).
- [x] Para kuralına uyuldu: hesap TL, kuru olmayan döviz satışı tanımlı biçimde dışarıda
      bırakılıyor ve sayısı yazıyor (AC-30).
- [x] Arayüz kriterlerinin görsel kanıtı eklendi: dört görünüm, boş durumlar (tür rolü yok, ürün
      ağacı yok, parti boş), eksik maliyet işareti, hata durumları.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi (yeni sekme, yeni hesap modeli, iki maliyet modelinin yan yana
      yaşadığı ve hangisinin neyi cevapladığı, Giderler'in dört görünümü, `maliyetRolu` ile
      `davranis` ayrımı, kuruş kuralı).
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | 1 ilk taslak, 2 QA turu (27 bulgu), 3 uygulama planı onayı (P1–P11; iki sunucu ölçümü düzeltildi: önkoşul bölüm düzeyindeydi, `appSettings` alan düzeyinde denetleniyordu) |
| **Düzeltme turu sayısı** | 1 | Triyaj 2026-10-17 |
| **Bulgu gerçek/gürültü oranı** | 5/0 | Modeli bulunamayan satılmış makina kârı şişiriyordu, çöpteki genel tür çelişkisi, silinemeyen bulunamayan plan, gelecekteki partide ters dönem, spec metni |
| **Regresyon sayısı** | 0 | Bugünkü maliyet modeli ve Dönem Raporu taban koddan üretilmiş kıyas fikstürüyle birebir aynı |
| **Kaçan hata** | 0 | |

**Bu spec'ten çıkarılan ders:** Yeni bir hesap eski bir veriyle eşleşirken (model adı, tür kimliği) eşleşmeyen kaydın nereye düştüğü
yazılı olmalı: "bulunamazsa 0 ekle" varsayılanı satışın tamamını kâr gösterdi. Eşleşme kuralı eski motordan alınmalı (`modelKey`,
`trLower`) ve bulunamayan kayıt hiçbir toplama girmeden ayrı sayılmalı. Ayrıca durum bilgisi (ör. "pay yok") hesapla aynı kümeden
türemeli; canlı sayım ile ham havuz ayrışınca ekran kendi kendisiyle çelişti. Spec yazımında sunucu davranışı kod okunarak
ölçülmeli: iki "ölçüm" (önkoşul tablosu, `appSettings` sınırı) uygulama planında yanlış çıktı.
