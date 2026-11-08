# 0133 — Satış fiyatının maliyetten türemesi

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-05); plan turu Karar 29–40 (2026-11-08) |
| **Sahip** | Analist (yazım) · geliştirici (uygulama) |
| **Onaylayan** | Takım Yöneticisi |
| **QA turu** | 2026-11-08, 28 bulgu (4 Bloklayıcı / 13 Önemli / 11 Küçük); hepsi onaylandı ve işlendi |
| **Ters çevrilen kriterler** | 0087 AC-6'nın fiyat yarısı (`partFiyatForCurrency` maliyetten etkilenmez) R2 ile ters çevrilir; taramanın dosya listesi korunur, deseni daraltılır (R10/2) |
| **Daraltılan kriterler** | AC-10 örneği tek maliyetle yazıldı; AC-22 "elle sabit kipteki set" diye daraltıldı (R22); AC-48 ölçüsüyle yazıldı (AC-98) |
| **Etkilenen alanlar** | Ayarlar › Katalog › Parça/Yedek Parça, **Ayarlar › Uygulama › Fiyat Ayarları (yeni panel)**, Stok › Parça Stoğu, Evrak satır fiyatı, servis değişen parçaları, yedek parça satış formu, malzeme fiyatı güncelleme penceresi (`src/components/MalzemeFiyatPenceresi.jsx`, `MalzemeManager.jsx`), yeni saf modüller `src/lib/parcaFiyati.js` ile `src/lib/fiyatListesiRaporu.js`, yeni düğme `src/components/rapor/FiyatListesiDugmesi.jsx`, prop zinciri `src/App.jsx` · `Customers.jsx` · `CustomerDetailModal.jsx` · `Stock.jsx` · `ServisPanosu.jsx` · `ServisPencere.jsx`, saf motorlar `src/lib/utils.js` · `src/lib/urunAgaci.js` · `src/lib/malzeme.js` · `src/lib/parcaAktarma.js` |
| **Bağımlı spec'ler** | **0132** (malzeme kartı ve maliyetin malzemeden türemesi; önkoşul), 0087 (parça alış maliyeti; **AC-6 taraması bu spec'le ters çevrilir**), 0096 (maliyetin tek okuma yolu), 0097 (maliyetin tarihli geçmişi), 0121 (set maliyeti ve satış ekranının `urunAgaci` yasağı emsali), 0088 (modelin kâr katsayısı emsali), 0124 (parça Excel'inin konuma göre eşlemesi), 0126 (satış ekranı yasağının ikinci uygulaması), 0134 (emniyet payı doğrulayıcısı ve yazdırma kurucusunun yeri), 0058 (sayfalı listede toplu işlem emsali), 0092 (opt-in motor parametresi emsali), 0100 · 0101 · 0114 (boş değer gövdeye yazılmaz deseni), 0064 (Ayarlar panel kilidi), 0051 · 0076 (varsayılan değer ile öneri ayrımı) |

---

## Intent

Zam zincirinin son halkası budur. 0132 ile hammadde zammı parçanın maliyetine kendiliğinden yansıyacak, ama satış fiyatı hâlâ elle girilen ve maliyetle hiçbir bağı olmayan bir sayı olarak kalacak. Müşterinin asıl şikâyeti tam olarak bu: zam gelince yedek parça fiyatlarını tek tek elle düzeltmek çok uzun sürüyor, bu yüzden yapılmıyor ve eski fiyattan satış sürüyor.

Bu iş bittiğinde parçanın satış fiyatı maliyetinin katı olarak türeyecek, yani hammadde zammı fiyata kendiliğinden geçecek. İstenen parçada fiyat elle sabitlenebilecek, çünkü satın alınan hazır parçaların ve yuvarlak tutulmak istenen fiyatların istisnası gerekiyor. Gönderilmiş teklif ve kayıtlı satış değişmeyecek.

---

## Requirements

### Fiyat kipi

- **R1.** Her parçanın bir fiyat kipi vardır: **maliyete bağlı** ya da **elle sabit**. Varsayılan elle sabittir, yani bugünkü davranış hiç değişmez.
- **R1/2.** Kipin kalıcı alanı `parts.fiyatKipi` (TEXT), tek anlamlı değeri `"maliyet"`tir; elle sabit kipte alan **hiç yazılmaz** (0100'ün `uretimDurumu` emsali). Parçanın kendi katı `parts.karKati` (REAL) ve o da yalnız doluyken yazılır. Tanınmayan değer elle sabit sayılır.
- **R2.** Maliyete bağlı parçanın TL satış fiyatı, maliyetinin kâr katı ile çarpımından türer ve hiçbir yere kaydedilmez.
- **R2/2.** Türetme **bugünkü** maliyetten yapılır: tek okuma yolu maliyeti tarih vermeden okur. Fiyatın tarihli sorgusu yoktur (X2) ve tarihli maliyet okuması yalnız maliyet tarafında kalır (0097).
- **R2/3.** Türetilmiş fiyat **kuruş** hassasiyetindedir ve ara değeri yuvarlanmaz; gösterimi tek yardımcıdan (iki hane) gelir. Setin "bileşenlerin TL fiyatı toplamı" rakamı bugünkü gibi **tam lira** kalır, çünkü o rakam `fiyatTRY` alanına yazılır.
- **R3.** Elle sabit parçanın fiyatı bugün olduğu gibi elle girilir ve girilen değer kullanılır.
- **R4.** Katalogda kipe göre süzme ve toplu kip değiştirme yapılabilir.
- **R4/2.** Toplu işlem **satır seçimi kullanmaz**: süzgeçten geçen bütün liste üzerinde çalışır ve düğme listedeki parça sayısını yazar (0058 emsali). Sayfa kavramı toplu işleme girmez.
- **R4/3.** Kip süzgeci üç seçeneklidir ve `Segment` (kip `dugme`) ile çizilir; parça panelindeki ikinci süzgeç olduğu için tasarım sözlüğüne not düşülür (tedarikçi süzgeci 0096'dan beri `Select` ve adıyla istisnadır).
- **R5.** Satın alınan hazır parçalar için ayrı bir kural yazılmaz; varsayılanın elle sabit olması onları zaten kapsar.

### Kat ve yuvarlama

- **R6.** Varsayılan kâr katı bir uygulama ayarıdır; parçada kendi katı yazılabilir ve yazıldığında varsayılanın önüne geçer.
- **R6/2.** Ayar **boş doğar** (kodda gizli varsayılan yoktur, AC-9); ölçülen medyan 2,77 yalnız form açılırken **öneri** olarak gösterilir ve "Öneriyi kullan" düğmesiyle alana yazılır (0051 `hesapsizBaslangic` ve 0132 kur önerisi emsali).
- **R7.** Kat sıfırdan büyük olmalıdır. Birden küçük kat kaydedilir ama zarar uyarısı verir.
- **R7/2.** Katın doğrulayıcısı 0132'nin `alanDogrula` emsalini izler: **belirsiz sayı reddedilir** (`"2.400"` gibi nokta binlik mi ondalık mı anlaşılmayan giriş), sıfır ve negatif reddedilir, **üst sınır 100**, en çok **üç ondalık** (fazlası reddedilmez, en yakına yuvarlanıp öyle saklanır). Varsayılan kat ile parçanın katı **aynı** doğrulayıcıdan geçer.
- **R7/3.** Zarar uyarısı kaydı engellemez ve hata biçiminde çizilmez: form içinde `UyariSeridi` (aile `uyari`) ya da `Ipucu` olarak görünür, listede rozet basılmaz.
- **R8.** Yuvarlama bir uygulama ayarıdır: kapalı, **yukarı 10 TL** ya da **yukarı 50 TL**. Varsayılan kapalıdır.
- **R8/2.** Ayarın ekran metni yönü söyler ("yukarı"), çünkü "en yakın" ile "yukarı" aynı rakamı vermez ve kullanıcı fiyatın neden yükseldiğini metinden okur.
- **R8/3.** Yuvarlama ayarı da üç seçeneklidir ve `Segment` (kip `dugme`) ile çizilir.
- **R9.** Yuvarlama yukarı yapılır ve yalnız türetilmiş fiyata uygulanır; elle girilen fiyata dokunulmaz.

### Türetmenin yolu

- **R10.** Satış fiyatının **tek okuma yolu** kurulur ve bütün gösterim ile seçim noktaları ondan geçer. Bugün fiyat alanlarını doğrudan okuyan yerler bu yola bağlanır.
- **R10/2.** Yol **yeni bir saf modülde** durur: `src/lib/parcaFiyati.js`. `urunAgaci.js`'e yazılmaz, çünkü 0087 AC-6 taraması satış ekranlarında `urunAgaci` adını yasaklıyor (0121'in `SetRozeti` ve 0126'nın aynı kararı emsaldir). Modül maliyeti ve katalog kurucularını kendi içinde `urunAgaci` ile `malzeme`'den alır, satış ekranlarına yalnız kendi adlarını verir. Taramanın dosya listesi korunur, deseni `parcaMaliyetKurus|\.maliyet\b` ile daraltılır ve 0087 AC-6'nın "fiyat maliyetten etkilenmez" yarısı bu spec'le ters çevrilir.
- **R10/3.** Türetme maliyeti, set kataloğunu, malzeme kataloğunu ve fiyat ayarını birlikte ister; bu yüzden **prop zinciri kurulur**: `src/App.jsx` canlı malzeme listesini Müşteriler, Stok ve Evrak'a, uygulama ayarını servis formu ile yedek parça satış formuna indirir. İmza tek yerde yazılır ve dönüşü sayıyla birlikte nedeni taşır.
- **R10/4.** Servis ve Kargo Panosu'nun **ayrı penceresi** aynı formları çizdiği için köprünün anlık görüntüsüne malzeme listesi **salt okunur** eklenir (yazılabilir bölümlere girmez, 0115 emsali); yoksa aynı parça ana pencerede türetilmiş, panoda boş fiyatla gelir.
- **R11.** Maliyeti olmayan maliyete bağlı parçanın türetilmiş fiyatı yoktur: fiyat boş görünür ve nedeni yazar. Sıfır fiyat üretilmez.
- **R11/2.** Nedenler **tek sabit kümesinden** gelir (maliyeti girilmemiş, varsayılan kat girilmemiş) ve yerleri ekrana göre tanımlıdır: parça kartında alanın altında tam cümle, liste hücrelerinde bugünkü "—" ile açıklayıcı başlık, Evrak ile servis ve yedek parça satırında boş değer (satır metni yazılmaz, kullanıcı elle girer).
- **R12.** Türetme yalnız TL fiyatı için yapılır. Döviz fiyatları elle kalır ve parça kartı bunun nedenini yazar.
- **R12/2.** Dövizin nedeni parça kartında döviz alanlarının altında **tek metin sabiti** olarak durur (0132'nin malzeme ipucusu emsali); kaynağa gömülmez.
- **R13.** Bir parçayı maliyete bağlı kipe almak elle girilmiş fiyat alanlarını silmez; kip elle sabite döndürülünce eski fiyat geri görünür.
- **R13/2.** Kayıt fonksiyonunun kuralı açıkça yazılıdır: kip ile parçanın katı **her çağrıda silinir** ve yalnız dolu değerle yeniden yazılır (0096'nın maliyet alanı ile 0132'nin malzeme satırı deseni); maliyete bağlı kipte TL fiyat alanı **formdan okunmaz**, kayıttaki değer aynen korunur. Pasif alanın gösterdiği türetilmiş değer kayda sızmaz.
- **R14.** Maliyete bağlı kipe alınan parçanın elle girilmiş fiyatı ile türetilen fiyat farklıysa kip değiştirilirken fark gösterilir.

### Satış anı ve geçmiş

- **R15.** Satış anında fiyatın belgenin ya da kaydın içine kopyalanması bugünkü gibi sürer; gönderilmiş teklif, kayıtlı servis ve kayıtlı yedek parça satışı sonradan değişmez.
- **R16.** Malzeme fiyatı güncelleme penceresi, maliyet özetinin yanında fiyat özetini de gösterir: kaç parçanın fiyatı değişecek ve örnek satırlarda eski ile yeni fiyat nedir.
- **R16/2.** Bunun için var olan etki hesabına **isteğe bağlı** bir fiyat ayarı parametresi eklenir (0092'nin opt-in deseni): parametresiz çağrının dönüşü birebir aynıdır, verildiğinde satırlara eski ve yeni fiyat ile değişen fiyat sayısı eklenir. Pencere kendi çarpımını yazmaz (C3) ve uygulama ayarı Ayarlar üzerinden pencereye prop'la iner.
- **R17.** Bugünkü türetilmiş fiyatlarla bir fiyat listesi yazdırılır.
- **R17/2.** Kurucu kendi modülündedir (`src/lib/fiyatListesiRaporu.js`, sunum dilini 0059'un ortak modülünden alır, kendi kaçışıyla, yalnız Türkçe), düğme `src/components/rapor/FiyatListesiDugmesi.jsx`, giriş noktası Ayarlar › Katalog › Parça/Yedek Parça başlığıdır (0134 emsali). Kapsam **ekrandaki süzgeçten geçen canlı parçalar**, sıra katalog sırası; sütunlar ad, kod, kip, kat ve yürürlükteki fiyat.

### Dışa ve içe aktarma

- **R18.** Parça dışa aktarması, o parçanın yürürlükteki fiyatını yazar: maliyete bağlı parçada türetilmiş fiyat, elle sabit parçada girilen fiyat.
- **R19.** Parça içe aktarması maliyete bağlı bir parçanın fiyat hücresini yazmaz; satır atlanmaz, yalnız fiyat alınmaz ve nedeni satır numarasıyla bildirilir.
- **R19/2.** Bildirim yalnız dosyadaki değer o parçanın **yürürlükteki fiyatından farklıysa** yazılır (0121 ile 0132'nin maliyet hücresi emsali); aynıysa sessiz geçilir. Yoksa dışa aktar ve değiştirmeden içe aktar turu maliyete bağlı her satırda uyarı üretir.

### Ayar, panel ve set

- **R20.** Kâr katı ile yuvarlama ayarı **kendi panelinde** yaşar: Ayarlar › Uygulama grubunda yeni panel ("Fiyat Ayarları"). Panel veri yazdığı için Ayarlar kilit listesine kimliğiyle eklenir (0064). Bugünkü "Uygulama" paneli salt okunurdur ve yazıcı prop'u almaz; ona yazma eklenmez.
- **R21.** Yeni ayar alanı sunucunun ayar alanı eşlemesine **açıkça** yazılır (Ayarlar sekmesi); varsayılan eşlemeye bırakılmaz ki kural okunur olsun (0091 emsali). Yeni eylem izni eklenmez (C7) ve bunun bedeli, yani ayarın bütün maliyete bağlı parçaların fiyatını birlikte değiştirmesi, panelde ipucu olarak yazılır.
- **R22.** Setin "TL fiyatı toplamına eşitle" düğmesi **yalnız elle sabit kipte** etkindir; maliyete bağlı kipte pasiftir ve nedeni yazar (fiyat maliyetten türüyor). Maliyete bağlı bir setin fiyatı, setin maliyetinin kâr katıyla çarpımıdır.
- **R22/2.** Setin fiyatı çözülemeyen bileşen sayacının anlamı genişler (fiyatı girilmemiş ya da maliyete bağlı olup maliyeti girilmemiş bileşen) ve metni bunu kapsar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Fiyat saklanmaz, okuma anında türer. Bu kural bu spec'in bütün değerini taşıyor: saklanan bir fiyat maliyet değişince bayatlar ve "kendiliğinden değişsin" isteği karşılanmaz.
- **C2.** Maliyetin tek okuma yolu (`urunAgaci.parcaMaliyetKurus`) değişmez; fiyat o fonksiyonun **üstünde** durur ve maliyet motoruna fiyat kavramı sızmaz.
- **C2/2.** Fiyat modülü ayrı dosyadır ve satış ekranları **maliyeti doğrudan okumaz**: yedi dosyada (Evrak, Evrak seçim penceresi, servis formu, yedek parça satış formu ile kurucusu, Parça Stoğu, Extra Kalıp formu) maliyet alanı ile maliyet motorunun adı geçmez; fiyat tek modülden okunur. 0087 AC-6'nın dosya listesi korunur.
- **C3.** Hesap React'sız saf fonksiyonda yazılır ve kendi testi olur; arayüz yalnız gösterir. Kâr katını ve yuvarlamayı uygulayan çarpım kaynakta tek yerde bulunur ve bu kaynak taramasıyla sabitlenir.
- **C3/2.** Taramanın kapsamı yazılır: çarpım yalnız `src/lib/parcaFiyati.js`'te bulunur. Makina tarafının öneri fiyatı (`makinaStandartMaliyet.js`'in modül içi `oneriKurus`'u) **ayrı kavramdır** (modelin kâr katsayısı, 0088) ve taramanın dışındadır; gerekçesi tarama dosyasında yazılı olur.
- **C4.** Bugünkü davranış korunur: kipi elle sabit olan parçada fiyat alanları, liste hücreleri, Evrak satırı, servis parça fiyatı, yedek parça satır fiyatı ve dışa aktarma satırı spec öncesiyle **birebir** aynıdır ve bu bir kıyas testiyle sabitlenir.
- **C4/2.** Kıyas kümesi sayılıdır: katalog listesinin fiyat hücresi, Parça Stoğu listesi ile pano kartları, Evrak'ın parça seçimi sonucu, servis sepeti satırının fiyatı, yedek parça satır fiyatı, setin bileşen fiyatı toplamı ve parça dışa aktarma satırı. Kapsam yazılmazsa altın dosya eksik kalır (0121 ve 0132 turlarının dersi).
- **C5.** Kâr katı ve yuvarlama uygulama ayarıdır, yeni veri bölümü değildir. Parçanın kendi katı ve fiyat kipi parça kaydının alanlarıdır ve dört nokta kuralına uyar; boş değer kayıt gövdesine yazılmaz.
- **C5/2.** Dört nokta `electron/db.cjs`'in dört yerindedir: şemanın `parts` tablosu, sütun göçü, `INSERT` listesi ve okuma ayıklaması. Elle sabit kip bir **değer olarak saklanmaz** (R1/2), yoksa dokunulmamış parçanın gövdesi değişir ve kıyas kriteri kırılır.
- **C6.** Para: türetme yalnız TL'dir. Döviz alanları elle kalır, tanınmayan para birimi bugünkü tanımlı biçimde ele alınır.
- **C7.** Yeni eylem izni **eklenmez**. Fiyat kipi ve parçanın katı parça kaydının alanı olduğu için yazımı bugünkü parça yetkisine bağlıdır; türetme okuma anında olduğu için Ayarlar sekmesi olmayan kullanıcı da doğru fiyatı görür.
- **C7/2.** Bunun bedeli yazılıdır: varsayılan katı ve yuvarlamayı Ayarlar sekmesi olan **her** kullanıcı değiştirebilir (gider ayarlarının `gider_tanim` istemesinden bilinçli sapma), çünkü ayar bir eylem değil bir görünüm kuralıdır ve hiçbir kayda yazılmaz. Kural sunucunun ayar alanı eşlemesinde açıkça görünür (R21).
- **C8.** Yuvarlama ayarı değiştiğinde ya da bir parçanın katı değiştiğinde hiçbir kayda yazım yapılmaz; ekranlar yeniden hesaplar.

### KAPSAM DIŞI

- **X1.** Döviz satış fiyatının maliyetten türemesi — *neden:* maliyet TL'dir (0087 R1) ve bir parça birden çok malzemeden oluşabilir, yani tek bir kur yoktur; günlük kurla türetmek de soru 28'in reddettiği şeydir (aynı parça iki günde iki fiyattan çıkar).
- **X2.** Fiyatın tarihli geçmişi — *neden:* fiyat türetilmiş bir değerdir; geçmişi maliyetin geçmişinden (0097 ve 0132) okunur, ikinci bir geçmiş iki doğruluk kaynağı yaratır.
- **X3.** Müşteri ya da bayi bazlı fiyat listesi, iskonto kademesi, miktar iskontosu — *neden:* ayrı kavram; bu spec kataloğun liste fiyatını türetir.
- **X4.** Gönderilmiş teklifin yeni fiyatla yeniden üretilmesi düğmesi — *neden:* soru 26, Takım Yöneticisi kararı; müşteriye verilen fiyatın arkadan değişmemesi esas, gerekirse kendi işi olur.
- **X5.** Makina satış fiyatı — *neden:* modelin kâr katsayısı 0088'de zaten var; bu spec parça fiyatıdır.
- **X6.** Kalıp liste fiyatı — *neden:* modelin kendi alanı (0088) ve kalıp malzemesi makina maliyetine girmiyor (0132 X4).
- **X7.** Fiyatın KDV dâhil gösterilmesi ya da KDV'li liste — *neden:* maliyet ve fiyat bu uygulamada KDV hariç matrahtır; KDV satış anında hesaplanıyor ve o zincir değişmiyor.
- **X8.** Kâr marjı (yüzde) yöntemi ve maliyete sabit tutar ekleme yöntemi — *neden:* soru 23 tek kat istedi; iki yöntem daha eklemek üç ayrı fiyat kuralı demek. İstenirse kendi işi olur.
- **X9.** Parça Excel'ine fiyat kipi sütunu — *neden:* kipi Excel'den yazdırmak toplu kip değiştirmenin ikinci bir kapısı olur ve C5'in "kip parça kaydının alanıdır" kararını, Ayarlar sekmesi gerektirmeyen içe aktarma yoluna taşır; şablon konuma göre eşlendiği için (0124) yeni sütun ayrıca eski dosyaları kaydırma riski taşır.
- **X10.** Katalog listesinde satır seçimi (onay kutusu) — *neden:* toplu işlem süzülmüş listede çalışır (R4/2); sayfalı bir listeye seçim eklemek "sayfa değişince seçim kayboldu" sınıfını açar ve 0058 bu sorunu listenin bütünü üzerinde çalışarak çözdü.
- **X11.** Yuvarlamanın elle girilen fiyata ya da döviz fiyatına uygulanması — *neden:* R9 ile C6; elle girilen değer kullanıcının kararıdır, türetilmiş değil.

---

## Context

### Bugünkü durum

- Parçanın satış fiyatı üç alanda duruyor (TL, dolar, euro) ve maliyetiyle hiçbir bağı yok. Alanların anlamı kodda yazılı: `src/types.d.ts:202` "alış maliyeti, TL, KDV hariç (matrah); `fiyatTRY/USD/EUR` satış fiyatıdır".
- Fiyat satış anında belgenin ya da kaydın içine kopyalanıyor: `src/components/Documents.jsx:720`, `src/components/YedekParcaSatisForm.jsx:59`, `:148`, `:190`, `src/components/ServiceForm.jsx:416`, `:515`. Ölçülmüş sonuç: türetilmiş fiyat geçmişi bozamaz, çünkü kayıt kendi fiyatını taşıyor. Soru 26'nın cevabı bu yüzden ek iş gerektirmiyor.
- Maliyet tarafında tek okuma yolu var ve disiplinle korunuyor: `urunAgaci.parcaMaliyetKurus` (0096 C1 ve C9, 0121 C2), ayrıca tarihli geçmişi var (0097).
- Kâr katının emsali uygulamada çalışıyor: `src/lib/makinaStandartMaliyet.js:201` `oneriKurus(toplamK, katsayi)` modelin kâr katsayısını maliyetle çarpıp kuruşa yuvarlıyor ve katsayı sıfırdan büyük değilse `null` döndürüyor. Parça tarafında aynı mantık kurulur.
- Setin fiyatını bileşenlerinin fiyat toplamına eşitleyen bir düğme zaten var: `urunAgaci.js:392` `SET_FIYAT_DUGMESI` "TL fiyatı toplamına eşitle" ve `:88` fiyatı ortak yardımcıdan okuyor (atıflar QA turunda düzeltildi, Ölçüm H). Yani "fiyatı hesaptan doldur" kavramı uygulamaya yabancı değil; farkı, o düğmenin bir kerelik yazım yapması, bu spec'in ise okuma anında türetmesidir.

### Ölçülmüş kusur: satış fiyatının tek okuma yolu yok

Maliyetin aksine fiyat tek kapıdan okunmuyor. `src/lib/utils.js:578` `partFiyatForCurrency` bir ortak yardımcı olarak duruyor ve yalnız **altı** yerden çağrılıyor (`ServiceForm.jsx:416` ve `:515`, `YedekParcaSatisForm.jsx:59`, `:148`, `:190`, ayrıca `urunAgaci.js:88`). Ama fiyat alanlarını **doğrudan** okuyan yerler de var:

| Yer | Ne yapıyor | Bu spec'te |
|---|---|---|
| `src/components/Documents.jsx:720` | Teklif/proforma satırının fiyatını parçadan alıyor | Ortak yola bağlanır |
| `src/components/stock/PartStokTab.jsx:124` ve `:182` | Parça Stoğu listesinde üç fiyatı gösteriyor | Ortak yola bağlanır |
| `src/components/PartManager.jsx:378` (`priceSummary`) | Katalog listesinde üç fiyatı gösteriyor | Ortak yola bağlanır |
| `src/lib/parcaAktarma.js:31` | Dışa aktarma satırına fiyatı yazıyor | Ortak yola bağlanır (R18) |
| `src/lib/parcaAktarma.js:206` | İçe aktarmada fiyat hücresini kayda yazıyor | Yazım kuralı değişir (R19, R19/2) |
| `src/components/PartManager.jsx:226`, `:624`, `:687` | Setin "TL fiyatı toplamına eşitle" düğmesi `fiyatTRY`'ye **yazıyor** | Maliyete bağlı kipte pasifleşir (R22) |
| `src/components/MalzemeFiyatPenceresi.jsx:29` | Etki önizlemesi yalnız maliyeti karşılaştırıyor | Fiyat özeti opt-in parametreyle eklenir (R16/2) |
| `src/components/PartManager.jsx:28`–`:30` | Formun fiyat girişleri | Değişmez (elle giriş) |
| `src/components/settings/SettingsImport.jsx:436` | İçe aktarma önizlemesinde **dosyanın** değerini gösteriyor | Değişmez (katalogu okumuyor) |

Bu yüzden R10 bir kural olarak yazıldı: türetme eklenmeden önce tek okuma yolunun kurulması gerekiyor, yoksa türetilmiş fiyat Evrak satırında ve Parça Stoğu listesinde görünmez ve uygulama aynı parça için iki ayrı fiyat gösterir. 0096'nın maliyet tarafında kurduğu disiplinin fiyat tarafındaki karşılığı budur.

### Bilinen tuzaklar

- **`parts` bölümünün yetkisi:** `electron/serverAuth.cjs:44` `parts` bölümü `stockActions` grubunda ve `:110` `BOLUM_SEKMELERI` onu `["settings"]` ile eşliyor. Yani parçaya yazmak Ayarlar sekmesi ve kısıtlanmamış stok yetkisi ister. Fiyat **türetildiği** için uygulamada hiçbir yazım gerekmiyor ve bu kullanıcı da doğru fiyatı görüyor (C7). Fiyatı kayda yazan bir tasarım seçilseydi, fiyat listesini uygulamak Ayarlar sekmesi isteyecekti.
- **Boş değer gövdeye yazılmaz:** fiyat kipi ve parçanın kendi katı, dokunulmamış parçada kayıt gövdesine girmemelidir (0100, 0101, 0114 deseni), yoksa sunucunun karşılaştırması her parçayı "değişmiş" görür.
- **Kıyas kümesi:** bugünkü veride hiçbir parçanın kipi yok, yani ilk gün bütün parçalar elle sabit sayılır ve uygulamanın hiçbir rakamı değişmez. Kıyas testi bunu sabitler (C4).

### Ölçüldü (2026-11-01 yedeği)

Bu bölümün rakamları bir **yedek dosyasından** ölçüldü; depoda kanıtı yok, yani kodla doğrulanamaz. Tasarım gerekçesi olarak kullanılır, hiçbir kabul kriterinin girdisi değildir (Ölçüm S).

- 380 canlı parçanın **362'sinin TL satış fiyatı girili**, yani katalog fiyat tarafında neredeyse tamamlanmış.
- Buna karşılık **237 parçanın fiyatı var ama maliyeti yok**. Bu parçalar maliyete bağlı kipe alınırsa fiyatları kaybolur (R11). Yani bu spec'in değeri 0132'nin veri girişine bağlıdır ve sıranın sonda olması ölçümle doğrulanıyor.
- Yalnız **125 parçada fiyat ile maliyet birlikte girili**. Bu kümede fiyatın maliyete oranı çok dağınık: %25'lik dilim **1,63**, medyan **2,77**, %75'lik dilim **5,88**, en küçük 1,00 ve en büyük 2.500.
- Bunun tasarıma etkisi şudur: **tek bir varsayılan kat bu katalogda parçaların çoğunu doğru fiyatlamaz.** Parçanın kendi katı (R6) bir istisna değil, ana yol olacak. Varsayılanın ilk değeri için ölçülmüş medyan 2,77'dir. Soru 23'ün cevabı (tek varsayılan kat, parçada kendi katı) değişmiyor, ama ekranın parçanın kendi katını kolay girdirmesi gerekiyor.
- En büyük oranın 2.500 olması bir veri hatası işaretidir (maliyeti 1 TL girilmiş ya da fiyatı yanlış yazılmış bir parça). Kip değiştirirken farkı göstermek (R14) bu hataları görünür hâle getirir; bu, spec'in ikincil ama gerçek bir faydasıdır.
- Maliyeti girili ama fiyatı girilmemiş yalnız **2 parça** var, yani ters yön sorun değil.


### QA turunda ölçülenler (2026-11-08)

Aşağıdaki her satır koddan okundu; doküman ile kod çeliştiğinde kod doğrulandı.

- **Ölçüm A.** `tests/urun-agaci-0087.test.js:76` AC-6 iki şey sabitliyor: (1) `partFiyatForCurrency({ ...p, maliyet: 99.9 }, c)` sonucu maliyetsiz hâliyle **eşit** olmalı; (2) yedi dosyada `.maliyet` ve `urunAgaci` adları geçmemeli: `Documents.jsx`, `ServiceForm.jsx`, `YedekParcaSatisForm.jsx`, `stock/PartStokTab.jsx`, `PartSaleForm.jsx`, `lib/yedekParcaSatis.js`, `documents/KalemSecPenceresi.jsx`. Tarama yardımcısı `kod()` (`:23`) yalnız yorum satırlarını atar, gerçek import'u yakalar. R2 birinci yarıyı, R10 ikinciyi karşılıyor.
- **Ölçüm B.** Prop zinciri eksik: `ServiceForm.jsx` ve `YedekParcaSatisForm.jsx` dosyalarında `malzemeler` ile `appSettings` adları **hiç geçmiyor**; `Documents.jsx:168` ve `stock/PartStokTab.jsx:17` `appSettings` alıyor, malzeme listesi almıyor. `src/App.jsx` malzeme listesini yalnız iki yere veriyor: `:1760` Makina Maliyeti ve `:1771` Ayarlar.
- **Ölçüm C.** `src/components/ServisPencere.jsx:20`–`:24` anlık görüntü anahtarları `services, customers, calisanlar, parts, dealers, factory, appSettings, geoData, loadingGeo, partStock, partStockLog, uretimFormlari, partTypeDefs`; **malzeme listesi yok**. Yazılabilir bölümler `:17` `YAZILABILIR` ile altı taneyle sınırlı.
- **Ölçüm D.** `src/lib/gider.js:42` `tutarCoz` ve `:41` `noktaOndalikMi` yalnız bir veya iki haneli ondalığı kabul ediyor; `"2.400"` binlik sayılıp **2400** dönüyor. 0132 bu tuzağı `src/lib/malzeme.js:41` `BELIRSIZ_DESEN` ile `BELIRSIZ_HATASI` ve `:280` `alanDogrula` (`pozitif`, `ust`, `ustHata`) üzerinden kapatmış.
- **Ölçüm E.** `src/components/ui.jsx:385` `MoneyInput` girdiden rakam dışını atıp `parseInt` ediyor, yani bugün elle girilen parça fiyatları **tam lira**.
- **Ölçüm F.** `src/lib/urunAgaci.js:91` `setOzeti.fiyatToplam` `Math.round(...)` ile **tam lira** dönüyor; `:89` fiyatı olmayan bileşeni `fiyatsiz` sayacıyla sayıyor.
- **Ölçüm G.** Aynı fiyat iki biçimde basılıyor: `stock/PartStokTab.jsx:124` ve `:182` `maximumFractionDigits: 0`, `PartManager.jsx:378` `priceSummary` `fmtCur` ile iki hane. Türetilmiş 4.082,69 katalogda kuruşlu, Parça Stoğu'nda 4.083 görünür.
- **Ölçüm H.** `urunAgaci.js:392` `SET_FIYAT_DUGMESI`, `PartManager.jsx:226` düğme, `:624` ile `:687` `fiyatTRY` alanına **yazıyor**. Spec'in `:364` ve `:82` atıfları 0132'den sonra kaymış.
- **Ölçüm I.** `src/lib/malzeme.js:412` `fiyatEtkisi(eski, yeni, parts, malzemeler)` yalnız maliyeti karşılaştırıyor ve `{ bagli, degisen, satirlar }` dönüyor (satır alanları kimlik, ad, önce, sonra); örnek satır sayısı `ORNEK_SATIR = 5`. `MalzemeFiyatPenceresi.jsx:15` ve `MalzemeManager.jsx:80` uygulama ayarını almıyor.
- **Ölçüm J.** `src/lib/parcaAktarma.js:11` şablon on bir sütun ve içe aktarma **başlık okumaz, konuma göre** eşler; `:206` `fiyatTRY: cell(6) || (mevcut?.fiyatTRY ?? "")`; `:190` set ile malzeme hücresinin hata kuralı "dosyadaki değer çözülmüş değerden farklıysa bildir" biçiminde; `:31` dışa aktarma satırı.
- **Ölçüm K.** `PartManager.jsx` sayfalı (`PER_PAGE = 10`, `useFilteredList`) ve dosyada **hiç onay kutusu yok**. Sayfalı listede toplu işlemin emsali `src/components/Kasa.jsx:491`–`:492`: erişilebilir ad ile düğme metni listenin bütününü sayıyor.
- **Ölçüm L.** `PartManager`'ın kayıt fonksiyonu 0096'dan beri maliyet anahtarını **her çağrıda siliyor** (düzenleme bir nesne birleşmesidir), 0132 aynı deseni malzeme satırı için uygulamış; `:457` `formMaliyeti` pencere başına **tek** canlı sonuç üretiyor (0099 C1/2) ve fiyat önizlemesi bu sonucun üstüne biner.
- **Ölçüm M.** `electron/serverAuth.cjs:161` `AYAR_ALAN_SEKMELERI` ayar alanlarını sekmeye eşliyor, `:179` `AYAR_VARSAYILAN_SEKMELER` değeri `["settings"]`. Karşılaştırma: maliyet ayarları `["settings", "maliyet"]`, gider ayarları ayrıca `gider_tanim` eylem izni istiyor.
- **Ölçüm N.** `src/components/Settings.jsx:51` Uygulama grubunda üç panel var (`app`, `musteri`, `servispano`); `settings/SettingsApp.jsx:12` yalnız sürüm ve güncelleme prop'ları alıyor, uygulama ayarını ve yazıcısını **almıyor**. `src/lib/kilitAlanlari.js:56` `AYAR_KILITLI` veri yazan her paneli kimliğiyle listeliyor.
- **Ölçüm O.** Fiyatın yokluğu bugün sessiz: `urunAgaci.maliyetMetni(undefined)` ve `PartManager.priceSummary` ikisi de `"—"` dönüyor, yani R11'in "nedeni yazar" şartı için yeni metin ve yeni yer gerekiyor.
- **Ölçüm P.** Yazdırma kurucusunun emsali kurulu: `src/components/rapor/` altında iki düğme var (`GiderKasaRaporuDugmesi`, `SiparisRaporuDugmesi`) ve `src/lib/siparisRaporu.js` sunum dilini 0059'un ortak modülünden alıyor, hücreleri kendi kaçışlıyor ve yalnız Türkçe basıyor.
- **Ölçüm Q.** `urunAgaci.parcaMaliyetKurus(p, tarih, katalog, malzemeKat)` imzasında tarih **ikinci** parametre; verilmezse bugünkü, verilirse o günde geçerli maliyet dönüyor (0097). Fiyat tarafının hangisini kullandığı yazılmamıştı.
- **Ölçüm R.** Spec'in yetki iddiası doğru: `electron/serverAuth.cjs:46` `parts` bölümü `stockActions` grubunda ve `:114` `BOLUM_SEKMELERI` onu `["settings"]` ile eşliyor.
- **Ölçüm S.** 2026-11-01 yedeği depoda yok; "Ölçüldü" bölümünün 380, 362, 237 ve 125 rakamları kodla doğrulanamıyor.
- **Ölçüm T.** Dört nokta kuralının yerleri: `electron/db.cjs:170` `parts` şeması, `:479` `PARTS_NEW_COLUMNS` göçü, `:914` `INSERT` listesi ve aynı satırın okuma ayıklaması.

### QA turunda verilen kararlar (2026-11-08)

28 bulgu çıktı, Takım Yöneticisi hepsini onayladı. Her karar bulgusuyla ve işlendiği yerle birlikte:

1. **Bloklayıcı.** 0087 AC-6 taraması R10 ile R2'yi reddediyordu (Ölçüm A). Fiyatın tek okuma yolu yeni bir saf modüle (`src/lib/parcaFiyati.js`) yazılır, tarama deseni daraltılır ve AC-6'nın fiyat yarısı ters çevrilir. → R10/2, C2/2, AC-51…AC-54
2. **Bloklayıcı.** Türetmenin imzası ve prop zinciri yazılmamıştı; iki satış formunda gerekli veri hiç yok (Ölçüm B). İmza tek yerde yazılır, prop zinciri kurulur ve etkilenen alanlara eklenir. → R10/3, AC-55…AC-58
3. **Bloklayıcı.** Ayrı pano penceresi ve kiosk türetilmiş fiyatı göremiyordu (Ölçüm C). Köprünün anlık görüntüsüne malzeme listesi salt okunur eklenir. → R10/4, AC-59
4. **Bloklayıcı.** Katın sayı kuralı yoktu, `"2.400"` sessizce 2400 okunuyordu (Ölçüm D). Doğrulayıcı belirsiz sayıyı reddeder, üst sınır 100, en çok üç ondalık. → R7/2, AC-60…AC-63
5. **Önemli.** "En yakın 10/50 TL" ile "yukarı yuvarlanır" çelişiyordu ve tek örnek iki ayarı ayırt etmiyordu. Ayarın adı yönü söyler, ayrımı gösteren kriter eklenir. → R8, R8/2, AC-65
6. **Önemli.** Varsayılan katın ilk değeri tanımsızdı (AC-9 ile Context çelişiyordu). Ayar boş doğar, 2,77 yalnız öneridir. → R6/2, AC-66, AC-67
7. **Önemli.** Fiyatın hassasiyeti tanımsızdı ve aynı fiyat iki ekranda iki biçimde görünüyordu (Ölçüm E, F, G). Hesap kuruş, gösterim tek yardımcı, setin toplamı tam lira kalır. → R2/3, AC-68, AC-69
8. **Önemli.** Maliyete bağlı sette "TL fiyatı toplamına eşitle" düğmesi fiyat alanına yazıyordu (Ölçüm H). Düğme o kipte pasifleşir, setin fiyatı maliyetinden türer. → R22, AC-70, AC-71
9. **Önemli.** R16 etki hesabının imzasını değiştirmek zorundaydı ve bu yazılmamıştı (Ölçüm I). Opt-in fiyat ayarı parametresi eklenir, parametresiz dönüş birebir korunur. → R16/2, AC-73, AC-74
10. **Önemli.** Excel'de kip sütunu yoktu ve dışa aktarma geri okunamıyordu (Ölçüm J). Kip sütunu eklenmez (X9), bildirim yalnız değer farklıysa yazılır. → R19/2, X9, AC-75, AC-76
11. **Önemli.** Toplu kip değiştirmenin kapsamı ve seçim altyapısı tanımsızdı (Ölçüm K). Satır seçimi eklenmez, işlem süzülmüş listenin bütününde çalışır. → R4/2, X10, AC-77, AC-78
12. **Önemli.** Kipin ve fiyatın kayıt fonksiyonundaki yeri yazılmamıştı (Ölçüm L). Alanlar her çağrıda silinir; maliyete bağlı kipte TL fiyat formdan okunmaz. → R13/2, AC-79, AC-80
13. **Önemli.** Ayarı kimin değiştirebileceği tanımsızdı (Ölçüm M). Alan sunucunun ayar eşlemesine açıkça yazılır, yeni eylem izni eklenmez ve bedeli yazılır. → R21, C7/2, AC-81
14. **Önemli.** Panelin yeri ve kilit alanı tanımsızdı; bugünkü "Uygulama" paneli veri yazmıyor (Ölçüm N). Yeni panel açılır ve kilit listesine eklenir. → R20, AC-82, AC-83
15. **Önemli.** "Nedeni yazar" şartının metni ve yeri tanımsızdı (Ölçüm O). Nedenler tek sabit kümesinden gelir, yerleri ekrana göre tanımlıdır. → R11/2, AC-85, AC-86
16. **Önemli.** Fiyat listesinin kapsamı, sırası ve giriş noktası tanımsızdı (Ölçüm P). Kurucu kendi modülünde, kapsam süzülmüş canlı parçalar, sıra katalog sırası. → R17/2, AC-90…AC-92
17. **Önemli.** Türetmenin hangi tarihin maliyetini okuduğu yazılmamıştı (Ölçüm Q). Tek okuma yolu tarih vermeden okur. → R2/2, AC-93
18. **Küçük.** AC-10 kendi örneğiyle çelişiyordu (iki ayrı maliyet rakamı). Kriterin ilk yarısı silindi. → AC-10
19. **Küçük.** Context'te beş atıf kaymıştı (Ölçüm H, J). Beşi düzeltildi. → Context, bugünkü durum ve tablo
20. **Küçük.** Kipin değer kümesi ve alan adları yazılmamıştı. Alanlar adlarıyla ve "elle sabit değer olarak saklanmaz" kuralıyla yazıldı. → R1/2, C5/2, AC-94
21. **Küçük.** Süzgeç ile yuvarlama ayarının denetim türü yazılmamıştı. İkisi de üç seçenekli olduğu için `Segment`. → R4/3, R8/3, AC-84
22. **Küçük.** Katın ondalık hassasiyeti yazılmamıştı. En çok üç ondalık, fazlası en yakına yuvarlanır. → R7/2, AC-64
23. **Küçük.** Ölçüm bölümünün verisi depodan doğrulanamıyor (Ölçüm S). Bölüm kaynağıyla işaretlendi ve kriter girdisi yapılmadı. → Context, Ölçüldü bölümünün girişi
24. **Küçük.** AC-48'in ölçüsü eksikti. Kullanıcının izni ve kaydedilen gövde ile yazıldı. → AC-98
25. **Küçük.** Dövizin nedeninin metin sabiti ve yeri yazılmamıştı. Parça kartında döviz alanlarının altında tek sabit. → R12/2, AC-87
26. **Küçük.** Zarar uyarısının biçimi ve kalıcılığı yazılmamıştı. Kayıt engellenmez, hata biçiminde çizilmez, listede rozet yok. → R7/3, AC-88, AC-89
27. **Küçük.** Setin "fiyatı çözülemeyen bileşen" sayacının anlamı genişliyordu (Ölçüm F). Sayacın anlamı ve metni genişletildi. → R22/2, AC-72
28. **Küçük.** AC-46'nın kıyas kümesi sayılmamıştı. Yedi kalemle sayıldı. → C4/2, AC-95

### Plan turunda verilen kararlar (2026-11-08)

Geliştiricinin uygulama planındaki on iki öneri Takım Yöneticisi tarafından **tümüyle onaylandı**.

- **Karar 29.** Servis ve yedek parça satış formlarının fiyat girdisi `MoneyInput`'tur ve tam liradır (Ölçüm E; dokunulan girdi rakam dışını atıp `parseInt` eder, 4.082,69 düzeltilirken 408.269 olurdu). Bu iki formun satırına türetilmiş fiyat **yukarı tam liraya** yuvarlanarak gelir (yuvarlama ayarıyla aynı yön); Evrak satırı kuruşu kabul ettiği için kuruşlu gelir; liste, kart ve fiyat listesinde gösterim kuruşludur. `MoneyInput` değişmez. → R2/3, AC-19, AC-20
- **Karar 30.** Setin "TL fiyatı toplamına eşitle" rakamı `urunAgaci.setOzeti`'de kalır ve isteğe bağlı bir fiyat okuyucu fonksiyonu alır; verilmezse bugünkü `partFiyatForCurrency`. Parça kartı fiyat modülünün okuyucusunu geçirir. Maliyet motoruna fiyat adı girmez, döngü olmaz. → R22, AC-22, AC-96
- **Karar 31.** Bayiler ekranı da prop zincirine girer: `SimpleDealers.jsx` yedek parça satış formunu çiziyor; yoksa aynı parça bayi formunda boş fiyatla gelirdi. → R10/3, AC-56
- **Karar 32.** Ham listeler ekran düzeyine iner (Müşteriler, Stok, Evrak, Bayiler, Pano, ayrı pencere); her ekran fiyat bağlamını `fiyatBaglamiKur` ile bir kez `useMemo`'da kurar, formlar yalnız `fiyatBaglami` prop'u alır. Ayrı pencere köprüden gelen düz listeden kendi bağlamını kurar (`Map` IPC'den geçmez). → R10/3, R10/4, AC-55, AC-57
- **Karar 33.** Ayarın kalıcı yeri `app_settings.fiyatAyarlari` (TEXT, JSON; dört nokta), yapısı `{ varsayilanKat, yuvarlama: "yukari10" | "yukari50" }`; boş alan yazılmaz, yuvarlama kapalıyken anahtar yoktur. → R6, R8, C5
- **Karar 34.** AC-11 ve AC-12 kuralın diliyle uygulanır: "yukarı 10 TL" ve "yukarı 50 TL" (rakamlar aynı). AC-29 ve AC-49 "süzgeçten geçen liste" olarak uygulanır (R4/2, X10). → AC-11, AC-12, AC-29, AC-49
- **Karar 35.** Fiyat listesi ve toplu kip düğmesi aynı kümeyi kullanır: sayfaya bakılmaz, süzülmüş listenin tamamı. → R4/2, R17/2
- **Karar 36.** Kat alanı düz metin alanıdır ve 0132'nin `alanDogrula` desenini izler (belirsiz sayı, üst sınır, ondalık); varsayılan kat ile parçanın katı aynı `katDogrula`'dan geçer. `TutarInput` kullanılmaz. → R7/2, AC-62
- **Karar 37.** Kip değişirken fark parça kartında TL alanının altında yazar ("Elle girilen …, türetilen …"); toplu işlemin onayı yalnız sayıları yazar. → R14, AC-28, AC-49
- **Karar 38.** Fiyat listesinin kurucusu 0134'ün `siparisRaporu.js` emsalini izler (kendi kaçışı, `raporSunumu` dili, düğme `rapor/` altında). → R17/2
- **Karar 39.** Görsel kanıt iki taban × iki sonra çapraz kıyasla alınır; değişenler `degisti` onayı alır, kapanışta taban raporu çekilir. → DoD
- **Karar 40.** Kiosk ve sekmesi kısıtlı kullanıcı ayarı yüklemede zaten alır (okuma filtresi yok, C7); ek yetki işi yoktur, AC-48 ve AC-98 gerçek uygulamada ölçülür. → C7

Uygulamada (2026-11-08):

- **Karar 41.** `malzeme.js` ile `parcaFiyati.js` birbirini içe alır (etki hesabı ve belirsiz sayı sabiti). Fiyat modülünde malzemeden gelen ad modül düzeyinde kullanılmaz: takma ad (`KAT_BELIRSIZ_HATASI = BELIRSIZ_HATASI`) yükleme sırasına göre `undefined` kalıyor ve parça kartında belirsiz kat (`2.400`) sessizce kabul ediliyordu (ekran testi yakaladı). Sabit çağrı anında okunur, tarama testi var. → AC-60, R7/2
- **Karar 42.** Toplu kip onayı silme işlemi değildir; ortak onay penceresi Kasa'nın emsaliyle onay simgesiyle açılır (çöp kutusu simgesi yanıltıcıydı). → R4/2
- **Karar 43.** Fiyat Ayarları'nda iki alan boşaltılınca ayar silinmez, değeri `undefined` yazılır; App yükleme yolu alanı gövdeden açıkça alır. Yoksa çakışma birleştirmesi sunucudaki eski ayarı geri getirir, yeniden yüklemede bellekteki bayat değer kalırdı (0091 R24/4 ve yükleme yolu dersi). → AC-66, Karar 33

Triyaj (2026-11-08):

- **Karar 44.** Varsayılan kâr katı boşken toplu "maliyete bağla" pasiftir ve nedeni yazar (`TOPLU_KAT_YOK_NEDENI`); ayar boş doğduğu için ilk gün bütün fiyatları boşaltabiliyordu ve onay bunu söylemiyordu. Özet ayrıca kendi katı ve varsayılan katı olmayan parçaları sayar (`katsiz`). → R4/2, R6/2, AC-49
- **Karar 45.** Toplu kip değişikliğinin işlem geçmişi kaydı `serverPermissions` ile yazılır (istemcide `/api/audit`); Ayarlar bunu parça paneline geçirir. Eskiden istemcide kayıt kayboluyordu. → R4
- **Karar 46.** Fiyat listesi firma bilgisiyle basılır (`factory` Ayarlar → parça paneli → düğme). → R17/2
- **Karar 47.** Toplu yazıcı elle sabite geçerken parçanın katını da siler; parça kartının kayıt fonksiyonuyla tek kural. → R13/2
- **Karar 48.** Türetmede çarpım önce altı haneye sabitlenir, sonra yarım yukarı yuvarlanır (7,50 × 2,002 = 15,015 → 15,02; kayan nokta 15,01 veriyordu). → R2/3, AC-68
- **Karar 49.** Fiyat Ayarları formu kayıtlı değerler değişince yeniden kurulur, nesnenin kimliği değişince değil (başka bilgisayarın kaydı yazılmış ama kaydedilmemiş katı silmesin). → R20

### Karar kaydı

| # | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | 0087 AC-6 taraması R10 ile R2'yi reddediyor | Bloklayıcı | Fiyat yolu yeni saf modülde, tarama deseni daraltılır, AC-6'nın fiyat yarısı ters çevrilir | R10/2, C2/2, AC-51…AC-54 |
| 2 | Türetmenin imzası ve prop zinciri yazılmamış | Bloklayıcı | İmza tek yerde, prop zinciri kurulur | R10/3, AC-55…AC-58 |
| 3 | Ayrı pano penceresi türetilmiş fiyatı göremez | Bloklayıcı | Köprüye malzeme listesi salt okunur eklenir | R10/4, AC-59 |
| 4 | Katın sayı kuralı yok, "2.400" 2400 okunur | Bloklayıcı | Belirsiz sayı reddedilir, üst sınır 100, üç ondalık | R7/2, AC-60…AC-63 |
| 5 | "En yakın" ile "yukarı" çelişiyor | Önemli | Ayarın adı yönü söyler, ayrım kriteri eklenir | R8, R8/2, AC-65 |
| 6 | Varsayılan katın ilk değeri tanımsız | Önemli | Ayar boş doğar, 2,77 öneridir | R6/2, AC-66, AC-67 |
| 7 | Fiyatın hassasiyeti tanımsız | Önemli | Hesap kuruş, gösterim tek yardımcı, set toplamı tam lira | R2/3, AC-68, AC-69 |
| 8 | Set düğmesi maliyete bağlı kipte fiyata yazıyor | Önemli | Düğme pasifleşir, setin fiyatı maliyetinden türer | R22, AC-70, AC-71 |
| 9 | Etki hesabının imzası değişmek zorunda | Önemli | Opt-in fiyat ayarı parametresi | R16/2, AC-73, AC-74 |
| 10 | Excel'de kip sütunu yok, tur geri okunamıyor | Önemli | Sütun eklenmez, bildirim yalnız farklıysa | R19/2, X9, AC-75, AC-76 |
| 11 | Toplu işlemin kapsamı ve seçim altyapısı tanımsız | Önemli | Seçim yok, süzülmüş listenin bütünü | R4/2, X10, AC-77, AC-78 |
| 12 | Kayıt fonksiyonundaki yer yazılmamış | Önemli | Alanlar her çağrıda silinir, TL fiyat formdan okunmaz | R13/2, AC-79, AC-80 |
| 13 | Ayarı kimin değiştirebileceği tanımsız | Önemli | Eşlemeye açıkça yazılır, izin eklenmez, bedeli yazılır | R21, C7/2, AC-81 |
| 14 | Panelin yeri ve kilit alanı tanımsız | Önemli | Yeni panel, kilit listesine eklenir | R20, AC-82, AC-83 |
| 15 | "Nedeni yazar" şartının metni ve yeri tanımsız | Önemli | Tek sabit kümesi, ekrana göre yer | R11/2, AC-85, AC-86 |
| 16 | Fiyat listesinin kapsamı ve giriş noktası tanımsız | Önemli | Kendi modülü, süzülmüş canlı parçalar, katalog sırası | R17/2, AC-90…AC-92 |
| 17 | Türetmenin maliyet tarihi yazılmamış | Önemli | Tarih vermeden okunur | R2/2, AC-93 |
| 18 | AC-10 kendi örneğiyle çelişiyor | Küçük | İlk yarı silindi | AC-10 |
| 19 | Context'te beş atıf kaymış | Küçük | Beşi düzeltildi | Context |
| 20 | Kipin değer kümesi ve alan adları yazılmamış | Küçük | Adlar ve "değer olarak saklanmaz" kuralı | R1/2, C5/2, AC-94 |
| 21 | Süzgeç ve yuvarlama denetim türü yazılmamış | Küçük | İkisi de `Segment` | R4/3, R8/3, AC-84 |
| 22 | Katın ondalık hassasiyeti yazılmamış | Küçük | En çok üç ondalık | R7/2, AC-64 |
| 23 | Ölçüm verisi depodan doğrulanamıyor | Küçük | Kaynağıyla işaretlendi, kriter girdisi değil | Context |
| 24 | AC-48'in ölçüsü eksik | Küçük | İzin ve gövde ile yazıldı | AC-98 |
| 25 | Dövizin nedeninin sabiti ve yeri yazılmamış | Küçük | Tek sabit, döviz alanlarının altında | R12/2, AC-87 |
| 26 | Zarar uyarısının biçimi yazılmamış | Küçük | Engellemez, hata biçiminde değil, rozet yok | R7/3, AC-88, AC-89 |
| 27 | Set sayacının anlamı genişliyor | Küçük | Anlam ve metin genişletildi | R22/2, AC-72 |
| 28 | AC-46'nın kıyas kümesi sayılmamış | Küçük | Yedi kalemle sayıldı | C4/2, AC-95 |

---

## Acceptance Criteria

### Kip ve varsayılan

- **AC-1.** Fiyat kipi hiç girilmemiş parça elle sabit sayılır ve fiyatı girilen değerdir.
- **AC-2.** Parça kartında fiyat kipi seçilir; maliyete bağlı seçiliyken TL fiyat alanı pasiftir ve türetilmiş değeri gösterir.
- **AC-3.** Maliyeti 1.000,00 TL, katı 2,40 olan maliyete bağlı parçanın TL fiyatı 2.400,00 TL çıkar.
- **AC-4.** Parçanın kendi katı yoksa varsayılan kat kullanılır.
- **AC-5.** Parçanın kendi katı varsa varsayılanın önüne geçer.
- **AC-6.** Kat sıfır, negatif ya da sayıya çevrilemez girilirse kayıt reddedilir ve nedeni alanın altında yazar.
- **AC-7.** Katı 0,90 girilen parça kaydedilir ve zarar uyarısı gösterilir.
- **AC-8.** Varsayılan kat uygulama ayarında saklanır ve değiştirilince maliyete bağlı parçaların fiyatı yeniden hesaplanır.
- **AC-9.** Varsayılan kat girilmemişse maliyete bağlı parçanın fiyatı yoktur ve nedeni yazar.

### Yuvarlama

- **AC-10.** Yuvarlama kapalıyken fiyat kuruşuna kadar gösterilir: maliyeti 1.701,12 TL, katı 2,40 olan parçanın fiyatı 4.082,69 TL çıkar.
- **AC-11.** Yuvarlama en yakın 10 TL iken aynı fiyat 4.090,00 TL çıkar.
- **AC-12.** Yuvarlama en yakın 50 TL iken aynı fiyat 4.100,00 TL çıkar.
- **AC-13.** Yuvarlama tam katına denk gelen fiyatı değiştirmez: 4.100,00 TL, en yakın 50 TL ayarında 4.100,00 TL kalır.
- **AC-14.** Yuvarlama elle sabit parçanın fiyatına uygulanmaz.
- **AC-15.** Yuvarlama ayarı varsayılan olarak kapalıdır.

### Tek okuma yolu

- **AC-16.** Maliyete bağlı parça Evrak satırında seçilince satıra türetilmiş fiyat gelir.
- **AC-17.** Maliyete bağlı parça Parça Stoğu listesinde türetilmiş fiyatıyla görünür.
- **AC-18.** Maliyete bağlı parça katalog listesinde türetilmiş fiyatıyla görünür.
- **AC-19.** Maliyete bağlı parça servis formunun değişen parçalar sepetine eklenince satıra türetilmiş fiyat gelir.
- **AC-20.** Maliyete bağlı parça yedek parça satış formunda seçilince satıra türetilmiş fiyat gelir.
- **AC-21.** Fiyat alanlarını doğrudan okuyan kaynak satırı kalmaz; gösterim ve seçim noktaları ortak yoldan okur (kaynak taraması).
- **AC-22.** **Elle sabit kipteki** setin "TL fiyatı toplamına eşitle" düğmesi bileşenlerin yürürlükteki fiyatını toplar: maliyete bağlı bileşen türetilmiş fiyatıyla girer, toplam bugünkü gibi tam liradır.

### Maliyeti olmayan ve kip değişimi

- **AC-23.** Maliyeti girilmemiş maliyete bağlı parçanın fiyatı boş görünür ve nedeni yazar; sıfır gösterilmez.
- **AC-24.** Aynı parça Evrak satırında seçilince satırın fiyatı boş gelir ve kullanıcı elle girebilir.
- **AC-25.** Maliyeti girilmemiş maliyete bağlı parça için yazdırılan fiyat listesinde satır "fiyat türetilemedi" olarak görünür.
- **AC-26.** Elle girilmiş fiyatı olan parça maliyete bağlı kipe alınınca elle girilen değer kayıttan silinmez.
- **AC-27.** Aynı parça elle sabit kipe geri döndürülünce eski fiyatı yeniden görünür.
- **AC-28.** Kip değiştirilirken elle girilen fiyat ile türetilen fiyat farklıysa fark gösterilir.
- **AC-29.** Toplu kip değiştirme seçili parçaların hepsine uygulanır ve kaç parçanın etkilendiğini yazar.
- **AC-30.** Katalogda kipe göre süzme yapılır: maliyete bağlı, elle sabit ve tümü.

### Döviz ve çoklu para

- **AC-31.** Maliyete bağlı parçanın dolar ve euro fiyatları elle girilmeye devam eder ve türetilmez.
- **AC-32.** Parça kartı dövizin türetilmediğini ve nedenini yazar.
- **AC-33.** Dolar para biriminde açılmış bir yedek parça satışında maliyete bağlı parça seçilince satıra parçanın elle girilmiş dolar fiyatı gelir.
- **AC-34.** Aynı parçanın dolar fiyatı girilmemişse satır boş gelir ve kullanıcı elle girer.

### Satış anı, zam ve geçmiş

- **AC-35.** Maliyete bağlı parçayla oluşturulmuş teklif kaydedildikten sonra malzeme fiyatı değişse de belgenin satır fiyatı değişmez.
- **AC-36.** Kayıtlı servisin değişen parça fiyatı malzeme zammından sonra değişmez.
- **AC-37.** Kayıtlı yedek parça satışının birim fiyatı malzeme zammından sonra değişmez.
- **AC-38.** Malzeme fiyatı güncelleme penceresi, maliyet özetinin yanında kaç parçanın fiyatının değişeceğini yazar.
- **AC-39.** Aynı pencere örnek satırlarda eski ve yeni fiyatı birlikte gösterir.
- **AC-40.** Fiyatı değişen parça yoksa (hepsi elle sabit) pencere bunu söyler ve sıfır yazar.
- **AC-41.** Fiyat listesi Türkçe yazdırılır ve her satırda parçanın adı, kipi ve yürürlükteki fiyatı yazar.

### Aktarma ve geriye dönük uyum

- **AC-42.** Dışa aktarma, maliyete bağlı parçanın satırına türetilmiş fiyatı yazar.
- **AC-43.** Dışa aktarma, elle sabit parçanın satırına girilen fiyatı yazar.
- **AC-44.** İçe aktarma, maliyete bağlı parçanın fiyat hücresini yazmaz; satırın öteki hücreleri yazılır ve nedeni satır numarasıyla bildirilir.
- **AC-45.** Kipi elle sabit olan parçada fiyat alanları, liste hücreleri, Evrak satırı, servis parça fiyatı, yedek parça satır fiyatı ve dışa aktarma satırı spec öncesi kodla birebir aynıdır (kıyas testi, altın dosya).
- **AC-46.** Hiçbir parçanın kipi girilmemiş veride uygulamanın bütün fiyat rakamları spec öncesiyle birebir aynıdır.
- **AC-47.** Fiyat kipi ve parçanın katı boş bırakılan parça kaydedilip yeniden okunduğunda gövdesi spec öncesiyle aynıdır.
- **AC-48.** Ayarlar sekmesi olmayan ve stok yetkisi kısıtlı kullanıcı (sekme listesinde `settings` yok, stok eylemleri boş dizi) maliyete bağlı parçanın türetilmiş fiyatını görür.
- **AC-49.** Toplu kip değiştirme maliyete bağlı yönünde yapılırken seçili parçaların kaçının maliyeti olmadığını ve o parçaların fiyatının kaybolacağını yazar.
- **AC-50.** Aynı işlem yine de uygulanabilir; uygulandığında o parçaların fiyatı boş görünür ve nedeni yazar.


### QA turu kriterleri (2026-11-08)

**Tek okuma yolunun yeri ve tarama (karar 1)**

- **AC-51.** Fiyatın tek okuma yolu `src/lib/parcaFiyati.js`'tedir; dosya React almaz, saat okumaz ve kendi testi vardır.
- **AC-52.** Yedi satış dosyasında maliyet alanının adı ve maliyet motorunun adı geçmez (kaynak taraması; 0087 AC-6'nın dosya listesi aynen korunur, deseni daraltılmıştır).
- **AC-53.** Aynı satış dosyaları fiyatı yalnız fiyat modülünden okur: fiyat alanlarını doğrudan okuyan gösterim ya da seçim satırı kalmaz (kaynak taraması).
- **AC-54.** 0087 AC-6'nın "fiyat maliyetten etkilenmez" iddiası bu spec'le ters çevrilir: maliyete bağlı bir parçanın maliyeti değişince fiyatı da değişir, elle sabit parçanın fiyatı değişmez.

**İmza ve prop zinciri (karar 2)**

- **AC-55.** Fiyat modülünün imzası tek yerde tanımlıdır; parçayı, fiyat ayarını, set kataloğunu ve malzeme kataloğunu alır ve sonucu nedeniyle birlikte döndürür.
- **AC-56.** Canlı malzeme listesi uygulamadan Müşteriler, Stok ve Evrak ekranlarına iner; zincir kesilirse maliyete bağlı parçanın fiyatı boş görünür ve bu bir testle ölçülür.
- **AC-57.** Uygulama ayarı servis formuna ve yedek parça satış formuna iner; formlar izin ya da ayar okumaz, prop okur.
- **AC-58.** Servis formunun sepetine eklenen maliyete bağlı parça, müşteri detayından da panodan da aynı türetilmiş fiyatla gelir.

**Ayrı pencere (karar 3)**

- **AC-59.** Servis ve Kargo Panosu'nun ayrı penceresinde ve kiosk kipinde maliyete bağlı parça türetilmiş fiyatıyla gelir; malzeme listesi köprüde salt okunurdur ve pencereden yazılamaz.

**Katın sayı kuralı (karar 4, 22)**

- **AC-60.** Kat alanına `2.400` yazılırsa kayıt reddedilir ve nedeni belirsiz sayı olarak yazar; `2,4` kabul edilir.
- **AC-61.** Kat 100'den büyük girilirse kayıt reddedilir ve nedeni alanın altında yazar.
- **AC-62.** Varsayılan kat ile parçanın katı aynı doğrulayıcıdan geçer (tek fonksiyon; iki ekran onu çağırır).
- **AC-63.** Sıfır, negatif ve sayıya çevrilemez kat her iki alanda da reddedilir.
- **AC-64.** Dört ondalıklı kat reddedilmez, üç ondalığa en yakına yuvarlanıp öyle saklanır ve gösterilen değer saklananla aynıdır.

**Yuvarlamanın yönü (karar 5)**

- **AC-65.** Yuvarlama "yukarı 50 TL" iken 2.010,00 TL fiyat 2.050,00 TL çıkar (en yakın 50 kuralı 2.000,00 TL verirdi); ayarın ekran metni yönü söyler.

**Varsayılanın ilk değeri (karar 6)**

- **AC-66.** Temiz kurulumda varsayılan kat boştur; kodda gizli bir varsayılan yoktur.
- **AC-67.** Ayar formu açılırken 2,77 öneri olarak görünür ve "Öneriyi kullan" yalnız alanı doldurur; kaydedilmeden ayar değişmez.

**Hassasiyet ve gösterim (karar 7)**

- **AC-68.** Türetilmiş fiyat kuruş hesaplanır ve ara değeri yuvarlanmaz; gösterimi iki hanelidir.
- **AC-69.** Aynı parçanın fiyatı katalog listesinde ve Parça Stoğu listesinde aynı biçimde görünür (tek gösterim yardımcısı).

**Set (karar 8, 27)**

- **AC-70.** Maliyete bağlı kipte "TL fiyatı toplamına eşitle" düğmesi pasiftir ve nedeni yazar.
- **AC-71.** Maliyete bağlı bir setin fiyatı, setin maliyetinin kâr katıyla çarpımıdır; bileşenlerinin fiyat toplamı değildir.
- **AC-72.** Setin fiyatı çözülemeyen bileşen sayacı iki nedeni de kapsar (fiyatı girilmemiş bileşen ve maliyete bağlı olup maliyeti girilmemiş bileşen) ve metni bunu söyler.

**Zam penceresi (karar 9)**

- **AC-73.** Etki hesabı fiyat ayarı verilmeden çağrıldığında dönüşü spec öncesiyle birebir aynıdır (altın dosya).
- **AC-74.** Fiyat ayarı verildiğinde dönüş satırlara eski ve yeni fiyatı, sonuca da fiyatı değişen parça sayısını ekler; pencere kendi çarpımını yazmaz (kaynak taraması).

**Aktarma (karar 10)**

- **AC-75.** Dışa aktar ve değiştirmeden içe aktar turunda maliyete bağlı parça için uyarı yazılmaz.
- **AC-76.** Dosyadaki fiyat o parçanın yürürlükteki fiyatından farklıysa satır numarasıyla bildirilir, fiyat alınmaz, satırın öteki hücreleri yazılır.

**Toplu kip değiştirme (karar 11)**

- **AC-77.** Toplu işlem düğmesi süzgeçten geçen listedeki parça sayısını yazar ve işlem o listenin bütününe uygulanır; sayfa kavramı girmez.
- **AC-78.** Katalog listesinde satır seçimi için onay kutusu yoktur (kaynak taraması).

**Kayıt fonksiyonu (karar 12)**

- **AC-79.** Maliyete bağlı kipte kaydedilen parçanın TL fiyat alanı kayıttaki eski değerini korur; pasif alanın gösterdiği türetilmiş değer gövdeye yazılmaz (kaydedilen gövde ölçülür).
- **AC-80.** Kip elle sabite çevrilip kaydedilince aynı parçanın gövdesinde kip alanı hiç bulunmaz.

**Ayar, yetki ve panel (karar 13, 14, 21)**

- **AC-81.** Yeni ayar alanı sunucunun ayar alanı eşlemesinde Ayarlar sekmesiyle açıkça listelenir; varsayılan eşlemeye bırakılmaz.
- **AC-82.** Ayar yeni bir panelde ("Fiyat Ayarları") yaşar ve panel Ayarlar kilit listesinde kimliğiyle bulunur; bugünkü "Uygulama" paneli yazıcı prop'u almaz (kaynak taraması).
- **AC-83.** Panel, ayarın bütün maliyete bağlı parçaların fiyatını birlikte değiştirdiğini ipucu olarak yazar.
- **AC-84.** Kip süzgeci ile yuvarlama ayarı `Segment` ile çizilir (üç seçenek, kip `dugme`).

**Nedenin metni ve yeri (karar 15, 25, 26)**

- **AC-85.** Nedenler tek sabit kümesinden gelir; kaynakta ikinci bir neden metni yazılmaz (kaynak taraması).
- **AC-86.** Parça kartında neden tam cümledir, liste hücresinde bugünkü "—" ile açıklayıcı başlıktır, Evrak ile servis ve yedek parça satırında satır metni yazılmaz ve değer boş gelir.
- **AC-87.** Parça kartı dövizin türetilmediğini döviz alanlarının altında tek metin sabitiyle yazar.
- **AC-88.** Katı 0,90 girilen parça kaydedilir ve uyarı hata biçiminde değil uyarı biçiminde görünür.
- **AC-89.** Katı birden küçük parça katalog listesinde rozet taşımaz.

**Fiyat listesi (karar 16)**

- **AC-90.** Fiyat listesinin kurucusu kendi modülündedir, sunum dilini ortak modülden alır, hücrelerini kendi kaçışlar ve yalnız Türkçe basar.
- **AC-91.** Liste ekrandaki süzgeçten geçen canlı parçaları katalog sırasıyla basar; sütunları ad, kod, kip, kat ve yürürlükteki fiyattır.
- **AC-92.** Düğme Ayarlar › Katalog › Parça/Yedek Parça başlığındadır ve yazdırma salt okunurdur (hiçbir kayda yazmaz).

**Tarih (karar 17)**

- **AC-93.** Türetme bugünkü maliyetten yapılır: fiyat yolu maliyeti tarih vermeden okur (çağrı ölçülür) ve tarihli maliyet sorgusu yalnız maliyet tarafında kalır.

**Alanlar ve kıyas (karar 20, 24, 28)**

- **AC-94.** Kip alanı yalnız maliyete bağlı kipte yazılır ve değeri tek anlamlıdır; tanınmayan değer elle sabit sayılır.
- **AC-95.** Kıyas testinin kümesi yedi kalemi kapsar: katalog listesinin fiyat hücresi, Parça Stoğu listesi ile pano kartları, Evrak'ın parça seçimi sonucu, servis sepeti satırının fiyatı, yedek parça satır fiyatı, setin bileşen fiyatı toplamı ve parça dışa aktarma satırı.
- **AC-96.** Fiyat modülü maliyetin tek okuma yolunun imzasını ve çıktısını değiştirmez; maliyet motorunda fiyat, kat ya da yuvarlama adı geçmez (kaynak taraması).
- **AC-97.** Varsayılan kat ya da yuvarlama ayarı değiştirildiğinde parça kayıtlarına hiçbir yazım yapılmaz (kaydedilen gövde ölçülür, mutasyonla).
- **AC-98.** Ayarlar sekmesi olmayan ve stok eylemleri boş dizi olan kullanıcı türetilmiş fiyatı gördüğü sırada kaydedilen gövdenin parça bölümü değişmez.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap React'sız **saf fonksiyonda** yazıldı ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Satış fiyatının **tek okuma yolu** kuruldu ve kaynak taramasıyla sabitlendi; fiyat alanlarını doğrudan okuyan gösterim satırı kalmadı.
- [ ] Yol **yeni bir saf modülde** (`src/lib/parcaFiyati.js`) duruyor; yedi satış dosyasında maliyet alanının ve maliyet motorunun adı geçmiyor, 0087 AC-6'nın dosya listesi korundu ve fiyat yarısı "spec 0133 ile" ters çevrildi.
- [ ] Kâr katını ve yuvarlamayı uygulayan çarpımın **tek yeri** taramayla sabitlendi; makina tarafının öneri fiyatı gerekçeli istisna olarak yazılı.
- [ ] Prop zinciri kuruldu (malzeme listesi Müşteriler, Stok ve Evrak'a; uygulama ayarı iki satış formuna) ve zincirin kesilmesi testle ölçüldü.
- [ ] Panonun ayrı penceresi ile kiosk türetilmiş fiyatı gösteriyor; malzeme listesi köprüde **salt okunur** ve yazılabilir bölümlere girmedi.
- [ ] Katın doğrulayıcısı belirsiz sayıyı reddediyor, üst sınırı 100 ve en çok üç ondalık; varsayılan kat ile parçanın katı aynı fonksiyondan geçiyor.
- [ ] Yuvarlamanın yönü ekran metninde yazılı ve "en yakın" ile ayrımı bir kriterle ölçüldü.
- [ ] Varsayılan kat temiz kurulumda boş; 2,77 yalnız öneri olarak gösteriliyor.
- [ ] Türetilmiş fiyat kuruş hesaplanıyor, gösterimi tek yardımcıdan geliyor ve setin bileşen fiyatı toplamı bugünkü gibi tam lira kaldı.
- [ ] Maliyete bağlı kipte setin fiyat düğmesi pasif ve nedeni yazıyor; setin fiyatı maliyetinden türüyor.
- [ ] Zam penceresinin etki hesabı **opt-in** parametreyle genişledi; parametresiz dönüş altın dosyayla birebir aynı.
- [ ] Excel'e kip sütunu eklenmedi (X9) ve içe aktarma bildirimi yalnız değer farklıysa yazılıyor.
- [ ] Toplu kip değiştirme süzülmüş listenin bütününde çalışıyor; satır seçimi eklenmedi (X10, tarama).
- [ ] Kayıt fonksiyonu kip ile katı her çağrıda siliyor ve maliyete bağlı kipte TL fiyatı formdan okumuyor; kaydedilen gövdeyle ölçüldü.
- [ ] Yeni ayar alanı sunucunun ayar alanı eşlemesinde açıkça listelendi ve yeni eylem izni eklenmemesinin bedeli yazıldı.
- [ ] Ayar kendi panelinde ("Fiyat Ayarları") yaşıyor ve panel Ayarlar kilit listesinde; bugünkü "Uygulama" paneli yazıcı prop'u almıyor.
- [ ] Fiyatın yokluğunun nedenleri tek sabit kümesinden geliyor ve her ekrandaki yeri kriterle sabitlendi.
- [ ] Fiyat listesinin kurucusu kendi modülünde, kapsamı süzülmüş canlı parçalar ve sırası katalog sırası.
- [ ] Türetme bugünkü maliyetten yapılıyor (çağrı ölçüldü); tarihli maliyet sorgusu yalnız maliyet tarafında kaldı.
- [ ] Zarar uyarısı kaydı engellemiyor, hata biçiminde çizilmiyor ve listede rozet basılmıyor.
- [ ] Maliyetin tek okuma yoluna fiyat kavramı sızmadı (tarama).
- [ ] Yeni kalıcı alanlarda **dört nokta kuralı** uygulandı ve `db-roundtrip` ile `db-clean-install` testlerine eklendi; boş değerin gövdeye yazılmadığı ölçüldü.
- [ ] Yeni veri bölümü **yok** ve bu açıkça yazıldı.
- [ ] Yeni eylem izni **eklenmedi** ve bu açıkça yazıldı; yetkisiz kullanıcının türetilmiş fiyatı gördüğü ölçüldü.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı **yalnız Türkçe** ve gerekçesi spec'te yazılı.
- [ ] Para kuralına uyuldu: türetme yalnız TL, döviz elle, tanınmayan para birimi tanımlı biçimde.
- [ ] Arayüz kriterlerinin **görsel kanıtı** eklendi, boş ve hata durumları dâhil.
- [ ] Kıyas testi yeşil: kipi girilmemiş veride bütün fiyat rakamları ve ekran metinleri spec öncesiyle birebir aynı; kıyas kümesi yedi kalemle sayıldı (C4/2).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (yeni kavram: fiyat kipi ve satış fiyatının tek okuma yolu).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

Takım Yöneticisi'nin 2026-11-05 cevaplarından bu spec'e düşenler:

| Soru | Karar | Nerede |
|---|---|---|
| 23 | Tek varsayılan kat olsun, istenen parçada kendi katı yazılabilsin | R6, AC-3…AC-9 |
| 24 | Fiyat kendiliğinden değişsin; uygulamadan önce etki özeti gösterilsin ve "fiyatı elle sabit" kaçış kapısı olsun | C1, R1, R16, AC-38…AC-40 |
| 25 | Satın alınan hazır parçalar elle sabit kalsın, maliyeti yine güncellenebilsin | R1, R5 (varsayılan elle sabit) |
| 26 | Gönderilmiş, onay bekleyen teklifler etkilenmesin | R15, X4, AC-35 |
| 27 | Yuvarlama seçeneği olsun, varsayılan kapalı | R8, R9, AC-10…AC-15 |
| 28 | Kur malzeme kartında sabitlensin, kuru değiştirmek zam sayılsın | 0132'de karşılandı; buradaki sonucu X1 (döviz fiyatı türetilmez) |

### Analistin kodu ölçerek eklediği kural

Soru 24'ün cevabı "kendiliğinden değişsin" olduğu için fiyatın **saklanmaması** gerekiyor (C1). Bu tasarım seçildikten sonra ölçtüm ki satış fiyatının maliyet gibi tek okuma yolu yok: ortak yardımcı beş yerden çağrılıyor ama Evrak satırı, Parça Stoğu listesi, katalog listesi ve dışa aktarma fiyat alanlarını doğrudan okuyor (Context'teki tablo). Bu yüzden R10 ayrı bir kural olarak yazıldı. Bağlanmazsa sonuç sessiz ve kötü olurdu: aynı parça katalogda türetilmiş, Evrak satırında eski elle girilmiş fiyatla görünürdü.

### Bir seçenek bilinçli olarak reddedildi

Fiyatı zam uygulanırken parça kayıtlarına **yazmak** da düşünülebilirdi (o zaman fiyat elle düzeltilebilir bir sayı olarak kalır ve fiyat listesi bir kayda dayanır). Reddedildi, çünkü üç bedeli ölçüldü: (1) maliyet sonradan değişince yazılan fiyat bayatlar ve "kendiliğinden değişsin" isteği yine karşılanmaz; (2) `parts` bölümü `stockActions` grubunda ve Ayarlar sekmesi istiyor, yani fiyat listesini uygulamak Makina Maliyeti kullanıcısının yetkisini aşardı; (3) aynı sayının iki doğruluk kaynağı olurdu (maliyet × kat ile yazılmış fiyat) ve bu uygulamada ayrışan iki kaynak daha önce iki kez hata oldu. Karar geri çevrilmek istenirse C1 ile R2 birlikte yeniden yazılır.
