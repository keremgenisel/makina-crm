# 0030 — Bakım Paketi: Karanlık Tema Renkleri, Etiket Düğmesi, Tablo Genişliği, Tarih Bombası

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-27; commit `3234f65`, dal `feat/0030-bakim-paketi`; plan `specs/done/0030-uygulama-plani.md` B1–B11) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Tema değişkenleri, gider ekranları, servis/Extra Kalıp/yedek parça formları, Anasayfa ve pano rozetleri, müşteri detayı zaman çizelgesi, Ayarlar > Tekrarlayan Giderler, test paketi |
| **Bağımlı spec'ler** | yok (0009'un sözlüğünü ve 0007'nin etiket altyapısını tüketir) |
| **Revizyon** | R1 (2026-09-27): onay öncesi QA boşluk analizi; 14 açık nokta karara bağlandı — eksik renk adı sayısı beşe çıktı (`acc`) ve koruma testinin iki tarama istisnası yazıldı (R1, R3), eşleme kararı yedek değere göre kurala bağlandı (R1: aynı değerse eşle, değilse temaya ekle; yoksa aydınlık tema sessizce değişirdi), etiket grubunun modalda çözüleceği ve etiketin partinin tamamını kapsadığı yazıldı (R5, R6, AC-10/AC-11), tablo ölçütünün pencere genişliği olduğu ve "üretilen aylar" sütununun sayıya ineceği kararlaştırıldı (R8, R10, AC-13/AC-22), sahte saatin tek yol olduğu gerekçelendirildi ve iki testin adı yazıldı (R11), tarama yöntemi tanımlandı (R12, AC-18), C4'ün istisnası R12'yi kapsayacak biçimde genişletildi; AC-7/AC-15 ölçülebilir hâle getirildi, AC-20…AC-22 eklendi. R2 (2026-09-27, plan onayı): kodda doğrulanan noktalar işlendi: `#faf7ff` için temada karşılık olmadığından `purBg3` eklenir (R2/B2); gider formundaki ikinci mor kutu (`GiderForm.jsx:125`) kapsama alınır, metni için `pur900` (R2/B3); `tasarim-kontrast`'a yalnız ek blok (C4/B5); `gider-settings` K28 iddiası R10 ile çeliştiği için C4 istisnası (C4/B6); R12 taraması grep'e ek olarak saat kaydırma koşusuyla yapılır, çünkü grep bilinen bombayı yakalamıyor (R12/B9); AC-7 kanıt raporunu okuyan testle ölçülür (B10). R3 (2026-09-27, uygulama sırasında kullanıcı kararı): tekrarlayan giderler tablosunda düzenle/sil düğmeleri her zaman yan yana durur ve kart geniş pencerede sağa büyür (Ayarlar içerik sütunu bu sekmede 760 değil 1200 px); R8'e yazıldı. |

---

## Intent

Gerçek kullanımda dört küçük sorun ve bir test borcu birikti. Karanlık temada bazı kutular ve
rozetler beyaz kalıyor, çünkü renkleri ya temada tanımlı olmayan bir değişkene ya da doğrudan
sabit bir renge bağlı. Müşteri kartındaki makina geçmişinde bayiden gelen yedek parça satırı,
komşusu olan kalıp satırlarının aksine kargo etiketi yazdıramıyor. Tekrarlayan giderler tablosu
ekrana sığmıyor, kullanıcı her bakışında sağa kaydırmak zorunda. Bir de test paketi takvime
bağlı olduğu için 25 Eylül'den beri kırmızı.

Başarı şu demek: karanlık temada hiçbir kutu beyaz kalmıyor ve bunun tekrarını engelleyen bir
koruma var; bayi yedek parçasının etiketi de makina geçmişinden yazdırılabiliyor; tekrarlayan
giderler tablosu normal pencere genişliğinde yatay kaydırma olmadan okunuyor; test paketi
takvimden bağımsız olarak yeşil.

---

## Requirements

### A. Karanlık tema renk borcu

- **R1.** Temada tanımlı olmayan renk değişkenleri kalmaz. Bugün kullanılan ama `src/lib/theme.js`'te
  karşılığı olmayan adlar **beş tanedir**: `n050`, `purBg2`, `purBr`, `pur700` ve **`acc`**
  (`KargoPanosu.jsx:65` ve `:157`; yedeği marka turuncusu `#e85d1a`).
  **Karar kuralı burada sabittir, geliştiriciye bırakılmaz:** yedeği mevcut bir token'ın **aydınlık
  değeriyle birebir aynı** olan ad o token'a **eşlenir** (`n050 → n100`, çünkü ikisi de `#f8fafc`;
  `acc → brand`, çünkü ikisi de `#e85d1a`); diğerleri **temaya eklenir** ve aydınlık değeri bugünkü
  yedeği olur (`purBg2` = `#ede9fe`, `purBr` = `#ddd6fe`, `pur700` = `#6d28d9`), karanlık değerleri mevcut
  mor ailesiyle (`purBg`, `purTx`) uyumlu seçilir. Bunları "en yakın karşılığına" çevirmek aydınlık temayı
  da değiştirir (`purBg` aydınlıkta `#f5f3ff`, `purTx` `#7c3aed`) ve AC-7'yi çiğner.
- **R2.** Gider tarafındaki üç **sabit renk** kullanımı tema değişkenine geçer: davranış rozetinin
  personel satırı (`gider/GiderAlanlari.jsx`), firma çalışanları ekranındaki mor bilgi kutusu
  (`CalisanManager.jsx`) ve gider formundaki mor bilgi kutusu (`GiderForm.jsx`). Yeni ya da değişen
  renkler **`tests/tasarim-kontrast.test.js`**'e eklenir; projede beş ayrı kontrast testi var
  (`tasarim-`, `form-`, `liste-`, `segment-`, `uyari-seridi-`) ve sözlük dışı ekran renkleri için genel
  olan `tasarim-kontrast`'tır.
  (R2, B2, B3) Aynı kural iki ad daha doğurur: `#faf7ff` zemini için **`purBg3`** ve `GiderForm.jsx:125`'teki ikinci mor
  kutunun metni `#3b0764` için **`pur900`**; ikisinin aydınlık değeri bugünkü sabit renktir.
- **R3.** **Koruma testi:** kaynakta statik olarak yazılmış her `var(--ad)` için temada bir tanım
  bulunur. Dinamik kurulan adlar (şablon ifadesiyle üretilenler, örneğin harita yoğunluk renkleri `hk`)
  testin dışındadır ve test bunları adıyla listeler, sessizce atlamaz. **İki tarama kuralı daha:**
  yorum satırları taranmaz ve `src/lib/theme.js`'in kendisi taramanın dışındadır. Bu ikisi olmadan test
  ilk koşuda yanlış alarm verir: `theme.js`'in yorumunda örnek yazım olarak `var(--token, #hex)` geçiyor.
  (R2, B11) Dinamik adların açılımları (`hk1`…`hk5`) temada tanımlı olduğu ayrıca denetlenir; listede olmayan yeni bir dinamik ad
  testi kırar.
- **R4.** Etkilenen ekranlar karanlık temada gözle doğrulanır: gider formu, çalışan tanımı, tekrarlayan
  giderler, Anasayfa kredi kartı rozetleri, kargo panosu kalıp rozeti, tahsis modalı.

### B. Bayi yedek parçasında kargo etiketi

- **R5.** Müşteri detayındaki makina geçmişinde, bayi ya da anlaşmasız firma alımından bu makinaya
  tahsis edilmiş yedek parça satırı da **kargo etiketi yazdırabilir**; düğme komşu kalıp satırlarıyla
  aynı yerde, aynı adla ve aynı görünümde durur.
  **Satış grubu modalda çözülür, olay üretiminde değil:** tahsis olayı bugün yalnız satış kimliği taşıyor
  (`deriveCustomerDetail.js:116`), etiket ise satış kayıtlarından oluşan bir dizi istiyor. Kimlikten satış
  bulunur, aynı partinin (`batchId`) kardeşleri toplanır ve etikete verilir; olay üretimi salt okunur ve
  sade kalır, `deriveCustomerDetail` değişmez.
- **R6.** Etiketin içeriği satışın kendisinden gelir: gönderen fabrika, alıcı o satışı yapan taraf
  (bayi veya anlaşmasız firma). **Kabul edilen sonuç:** müşteri kartından yazdırılan bu etikette alıcı
  müşteri değil bayidir, çünkü kargo bayiye gitmiştir. Bu, mevcut etiket kuralının doğal sonucudur ve
  değiştirilmez.
  **Aynı mantığın ikinci sonucu:** etiket **partinin tamamını** kapsar, yalnız bu makinaya tahsis edilen
  kalemleri değil. Bir tahsis satırı partinin tek kalemine karşılık gelir, ama kargo parti olarak
  gönderilmiştir; yalnız bu makinanın kalemlerini yazmak gerçekte gönderilmemiş bir kargoyu tarif ederdi.
  Düğmenin ipucu metni bunu söyler.
- **R7.** Etiket yazdırma salt okunur bir işlemdir; yeni izin tanımlanmaz ve mevcut kayıt değişmez.
  Düğme, komşu kalıp düğmeleri gibi **izin aramaz**; satırdaki "yedek parça satışına git" bağlantısının
  Stok yetkisi ayrı bir konudur ve bu iş onu değiştirmez.

### C. Tekrarlayan giderler tablosu

- **R8.** Ayarlar > Giderler > Tekrarlayan Giderler tablosu, uygulamanın olağan pencere genişliğinde
  **yatay kaydırma olmadan** okunur. Ölçüt: **pencere** genişliği 1280 piksel iken bütün sütunlar görünür
  (tablo genişliği değil; Ayarlar'ın sol menüsü 220 piksel, üstüne uygulama kenar çubuğu ve dolgular
  biniyor, yani tabloya kalan yer 800 pikselin altındadır). Ölçüm mevcut Electron yerleşim testi deseniyle
  yapılır. Sığdırma yolları: başlık sarmasına izin verilir (bugün bütün başlıklar sarmıyor),
  "Başlangıç" ile "Bitiş" tek sütunda birleştirilir, "Üretilen aylar" sayıya iner (R10).
  (R3) Düzenle/sil düğmeleri her genişlikte yan yana durur; kart geniş pencerede sağdaki boşluğa büyür (Ayarlar içerik
  sütununun bu sekmedeki 760 px sınırı 1200'e çıkar). Yerleşim testi ikisini de denetler.
- **R9.** Daha dar pencerede yatay kaydırma kalabilir; bu kabul edilen davranıştır, tablo bozulmaz.
- **R10.** Hiçbir sütunun taşıdığı bilgi kaybolmaz. Sütun birleştirilir, kısaltılır veya sarılır; bilgi
  silinmez. **"Üretilen aylar" sütunu sayıya iner** ("14 ay") ve tam liste ipucunda ya da satır açılınca
  görünür: o sütun her üretimle büyüyen tek sütundur ve bugün kesilen de odur; sayıya indirmek genişliği
  kalıcı olarak sabitler.

### D. Test borcu

- **R11.** `tests/makina-odeme.test.js`'teki iki test takvimden bağımsız hale gelir: "bugün" testin
  içinde sabitlenir (ödeme hatırlatıcısı testindeki desen). **Kodun davranışı değişmez**, yalnız test
  kendi zamanını kurar. Kırmızı olan iki test: "kredi kartı TEK ÇEKİM (blokajlı) alınan tutara GİRMEZ…"
  ve "ÇEK (tahsil edilmemiş) borçta kalır; NAKİT + blokajlı KK karışımında yalnız nakit düşülür"; ikisi de
  `alinanTutar` iddiasında düşüyor.
  **Sahte saat tek yoldur ve koda parametre eklenmez:** `ilkSatisOdemeleri` bir "bugün" parametresi almıyor
  ve `kartTahsilEdildiMi` string olmayan `bugun` değerini bilerek `today()`'e düşürüyor
  (`krediKarti.js:162-164`, `Array.filter`'ın index'ine karşı savunma), yani parametre eklemek sonuç
  vermez.
- **R12.** Aynı sınıftan başka tarih bağımlılığı var mı diye `tests/` taranır; bulunanlar aynı desenle
  düzeltilir. **Tarama yöntemi:** `new Date(`, `Date.now(` ve `today(` çağrıları aranır; her bulgu için ya
  sabit zaman kurulduğu ya da tarih parametresi geçildiği PR özetinde tablo hâlinde raporlanır. Hiçbir şey
  bulunmasa bile tarama komutu ve sonucu yazılır.

  (R2, B9) **Ek yöntem:** grep, bağımlılığı test edilen kodda olan testleri görmez (`makina-odeme.test.js` grep'te çıkmıyor).
  Bu yüzden paket ayrıca iki kez saat kaydırılarak (geçici, depoya girmeyen bir kurulum dosyasıyla) koşulur; yalnız o koşularda
  kırmızı olan testler tarih bombasıdır.

---

## Constraints

- **C1.** Davranış değişikliği yalnız B bölümündedir (yeni bir düğme). A, C ve D yalnız görünüm ve test
  hijyenidir; hesap, veri ve izin davranışı değişmez.
- **C2.** Yeni yapı taşı icat edilmez; gerekirse 0009'un sözlüğüne eklenir.
- **C3.** Etiket şablonuna dokunulmaz: `printTemplates.js`'teki birleşik etiket ve veri uyarlayıcıları
  olduğu gibi kullanılır (0007/0006 ile kurulan tek şablon kuralı).
- **C4.** Mevcut testler değiştirilmeden geçer. **İstisna** R11'in adını verdiği dosya **ve R12'nin
  taramasında bulunan tarih bağımlı dosyalardır**; hepsinde değişiklik yalnız zamanı sabitlemekle
  sınırlıdır, iddialar gevşetilmez. (Yalnız R11'in dosyasına izin verip R12'yi emretmek, tarama bir şey
  bulduğunda spec'i kendi içinde çelişkiye düşürürdü.)
  (R2) **Ek istisnalar:** `tests/tasarim-kontrast.test.js`'e yalnız yeni bir blok eklenir, mevcut satırlar değişmez (B5);
  `tests/ui/gider-settings.test.jsx`'in K28 iddiası R10'la çeliştiği için "görünür `3 ay` + ipucunda tam liste" iddiasına çevrilir,
  aynı sıkılıkta (B6).
- **C5.** Kullanıcıya görünen metinler Türkçedir; mevcut metinler değişmez.
- **C6.** Yeni bağımlılık eklenmez.

### KAPSAM DIŞI

- **X1.** Uygulama genelindeki çıplak sabit renklerin temizliği — *neden:* ölçüldü, kaynakta 270 satırda
  tema değişkenine bağlı olmayan sabit renk var. Bunların 190'ı meşru (`printTemplates.js` 109 ve
  `uretimFormPrint.js` 5 yazdırma çıktısı içindir, `theme.js` 81 paletin kendi tanımıdır); geriye 15 dosyada
  75 satır kalıyor ve her biri tek tek bakmayı gerektiriyor (bir kısmı bilinçli olabilir). Bu spec yalnız R1 ve
  R2'de adı geçenleri düzeltir; geri kalanı **0031** olarak sıraya alındı. R3'ün koruma testi tanımsız
  *değişkenleri* yakalar, çıplak rengi yakalamaz; o koruma 0031 yapılırsa genişletilir.
- **X2.** Karanlık tema paletinin yeniden tasarlanması — *neden:* mevcut palet korunur, iş yalnız eksik
  bağlantıları tamamlar.
- **X3.** Yazdırma çıktılarının karanlık temaya uyarlanması — *neden:* çıktılar her zaman beyaz kâğıt
  içindir.
- **X4.** Tekrarlayan giderler tablosuna yeni sütun, süzgeç veya sıralama eklenmesi — *neden:* ürün
  kararı; bu iş yalnız sığdırır.
- **X5.** Etiketin bayi alımında müşteri adresine göre üretilmesi — *neden:* R6'daki karar; kargo
  gerçekte bayiye gitmiştir, etiket gerçeği yazar.
- **X6.** Test altyapısının değiştirilmesi (sahte zaman aracının genelleştirilmesi, ortak yardımcı) —
  *neden:* iki dosya için altyapı kurmak orantısız.

---

## Context

Kodda doğrulanmış bulgular:

- **Tanımsız renk değişkenleri (R1).** Kullanılan `var(--…)` adları ile `src/lib/theme.js`'teki tanımlar
  karşılaştırıldığında dört ad açıkta kalıyor: `n050` (5 yerde: `ServiceForm.jsx:506`,
  `PartSaleForm.jsx:244` ve `:318`, `YedekParcaSatisForm.jsx:231` ve `:303`), `purBg2`
  (`Dashboard.jsx:245`, `:536`, `stock/TahsisModal.jsx:86`), `purBr` (`KargoPanosu.jsx:36`) ve `pur700`.
  Her biri `var(--ad, #açıkRenk)` biçiminde yazıldığı için karanlık temada **yedek açık renge** düşüyor:
  kutu beyaz, rozet açık mor kalıyor. `n050`'nin temadaki karşılığı `n100` (açık `#f8fafc`, koyu
  `#221e18`). Kullanıcının bildirdiği "teslim ayrıntı kutusu" ve muhtemelen başka noktalar aynı kök.
- **Sabit renkli rozet (R2).** `gider/GiderAlanlari.jsx`'teki `DavranisRozeti`'nde kira ve normal satırları
  tema değişkeni kullanıyor, **personel satırı kullanmıyor**: `["#6d28d9", "#f5f3ff", "#ddd6fe"]`. Karanlık
  temada bu rozet açık mor zemin ve koyu mor yazıyla kalıyor. Kullanıcının "giderler personel beyaz
  görünüyor" dediği yer burası. Aynı sınıftan iki kutu daha var: `CalisanManager.jsx:96` ve
  `GiderForm.jsx:146` (`#faf7ff` zemin, `#ede9fe` kenarlık).
- **Tarama sonucu (R1, R3).** Tanımlı token'lar (`theme.js`, 94 ad) kaynaktaki bütün `var(--…)`
  kullanımlarıyla (87 ad) karşılaştırıldığında **yedi ad** açıkta kalıyor: spec'in saydığı dördün yanında
  `acc` (gerçek eksik, `KargoPanosu.jsx:65` ve `:157`), `hk` (harita yoğunluk renkleri, dinamik) ve `token`
  (`theme.js`'in **yorumunda** örnek yazım). Yani R1'in listesi beş, R3'ün istisnası ikidir.
- **Yedek değerler eşleşmeyi belirliyor (R1).** `n050` yedeği `#f8fafc` = `n100` aydınlık; `acc` yedeği
  `#e85d1a` = `brand` aydınlık. Ama `purBg2` yedeği `#ede9fe` ≠ `purBg` aydınlık `#f5f3ff`, `pur700` yedeği
  `#6d28d9` ≠ `purTx` aydınlık `#7c3aed`, `purBr` yedeği `#ddd6fe` ve temada karşılığı yok. R1'in karar
  kuralı bu ölçümden çıktı.
- **Koruma testinin sınırı (R3).** Bazı adlar çalışma anında kuruluyor (`Harita.jsx` yoğunluk renkleri
  `var(--hk${n})` gibi). Statik tarama bunları "tanımsız" sanır; test bu adları listeleyerek dışarıda
  bırakmalı, yoksa ya yanlış alarm verir ya da sessizce gevşetilir.
- **Etiket düğmesi (R5).** Zaman çizelgesinde etiket düğmesi üç yerde var: iki kalıp dalında
  (`MachineTimeline.jsx:136`, `:150`) ve müşterinin **kendi** yedek parça satışında (`:163`,
  `onPrintYedekParcaEtiket`). Bayi alımından bu makinaya tahsis edilen satır ayrı bir dalda
  (`ev.kind === "part" && ev.ypTahsisId`) ve salt okunur; düğmesi yok. Yazdırma bağlantısı
  `CustomerDetailModal.jsx:1063`'te hazır (`yedekParcaEtiketYazdir`), yani eksik olan yalnız bu daldaki
  düğme ve ona verilecek satış grubu.
- **Ayarlar'ın sol menüsü 220 piksel** (`settings/Settings.jsx:111`, `minWidth: 200`). Pencere 1280 iken
  tabloya kalan yer uygulama kenar çubuğu ve dolgularla birlikte 800 pikselin altına düşüyor; R8'in ölçüm
  noktası bu yüzden pencere genişliği olarak yazıldı.
- **Tablo genişliği (R8).** `settings/SettingsGiderTanimlari.jsx:120` zaten `KartBolum … wide` kullanıyor
  ve tablo sarmalayıcısında `overflowX: "auto"` var (`:131`). Yani "kartı genişlet" çözümü uygulanmış ama
  sütunlar hâlâ sığmıyor: tanım, tür, tedarikçi, tutar, başlangıç, bitiş, atama, üretilen aylar ve işlem
  sütunları yan yana. Ekran görüntüsünde "üretilen aylar" kesiliyor. Çözüm sütun tarafındadır.
- **Yerleşim ölçmenin emsali var (R8).** Bu projede yerleşim jsdom'da ölçülemiyor; bayi modalı ve süzgeç
  çubuğu için gerçek Electron penceresinde ölçen testler yazıldı (`tests/bayi-modal-layout.test.js`,
  `tests/suzgec-yerlesim.test.js`). R8'in kanıtı aynı desene oturur.
- **Testi koşturarak doğrulandı (R11).** `npx vitest run tests/makina-odeme.test.js` → 2 başarısız,
  3 geçer; ikisi de `alinanTutar` iddiasında. `alinanTutar`, `kayitlar.filter(isPaymentReceived)` ile
  hesaplanıyor (`makinaOdeme.js:34`) ve `isPaymentReceived`'ın tarih parametresi yok sayılıyor, çünkü
  `filter` ikinci argüman olarak index geçiriyor ve `kartTahsilEdildiMi` bunu `today()`'e düşürüyor.
- **Tarih bombası (R11).** `tests/makina-odeme.test.js` sabit bir satış tarihi (2026-08-16) ve 40 günlük
  kart blokajı kuruyor, ama beklentiyi gerçek "bugün"e göre doğruluyor. 40 gün 25 Eylül'de dolduğu için
  iki test o günden beri kırmızı. Kodda hata yok. Emsal düzeltme `tests/odeme-hatirlatma.test.js`'te:
  test kendi saat dilimini ve zamanını kuruyor.

Bilinen tuzaklar:

- **Yedek renk yanıltıcıdır.** `var(--ad, #açık)` yazımı, ad tanımsızken hata vermez; sessizce açık renge
  düşer. Bu yüzden R3'ün koruma testi bu işin kalıcı değerini taşır, tek tek düzeltmeler değil.
- **Rozet kontrastı.** Personel rozetini tema değişkenine bağlarken karanlık temada metin ve zemin
  kontrastı korunmalı; projede kontrast testi var (`tasarim-kontrast`), yeni renkler oraya uyar.
- **Etiketin alıcısı.** Bayi satırında etiket düğmesine basan kullanıcı, müşteri kartında dururken bayi
  adresli bir etiket görecek. Şaşırtıcı ama doğru; düğmenin ipucu metni bunu söylemeli.

---

## Acceptance Criteria

- **AC-1.** Kaynakta statik yazılmış hiçbir `var(--ad)` temada tanımsız değildir; koruma testi bunu her
  koşuda doğrular.
- **AC-2.** Koruma testi, dinamik kurulan renk adlarını adıyla listeleyerek dışarıda bırakır; liste
  testin içinde görünür.
- **AC-3.** Servis, Extra Kalıp ve yedek parça formlarındaki teslim ayrıntı kutusu karanlık temada koyu
  zeminlidir; içindeki metin okunur.
- **AC-4.** Gider davranış rozetinin personel varyantı karanlık temada koyu zeminli ve okunur; kira ve
  normal varyantlarının görünümü değişmez.
- **AC-5.** Firma çalışanları ekranındaki ve gider formundaki mor bilgi kutuları karanlık temada koyu
  zeminlidir.
- **AC-6.** Anasayfa kredi kartı rozetleri, kargo panosu kalıp rozeti ve tahsis modalı rozeti karanlık
  temada açık mor kalmaz.
- **AC-7.** Aydınlık temada bu altı yerin görünümü dönüşüm öncesiyle aynıdır; ölçüt gözle değil
  **0 piksel fark** raporudur (karanlık taraf `beklenen: "degisti"` kaydıyla açılır).
- **AC-8.** Müşteri detayındaki makina geçmişinde, bayi alımından tahsis edilmiş yedek parça satırında
  kargo etiketi düğmesi görünür ve tıklanınca etiket önizlemesi açılır.
- **AC-9.** O etikette gönderen fabrika, alıcı satışı yapan bayi ya da anlaşmasız firmadır.
- **AC-10.** Düğmenin ipucu metni, etiketin alıcısının bayi olduğunu **ve etiketin kargonun tamamını
  kapsadığını** söyler.
- **AC-11.** Toplu (aynı partiden) bir satışta düğme **partinin tamamı** için tek etiket üretir, yalnız bu
  makinaya tahsis edilen kalemler için değil; kalıp satırındaki davranışın aynısı. Parti, tahsis satırının
  taşıdığı satış kimliğinden çözülür.
- **AC-12.** Etiket yazdırmak hiçbir kaydı değiştirmez ve yeni bir izin gerektirmez.
- **AC-13.** **Pencere** genişliği 1280 piksel iken tekrarlayan giderler tablosu yatay kaydırma olmadan
  bütün sütunları gösterir; ölçüm gerçek pencerede yapılır (Electron yerleşim testi deseni).
- **AC-14.** Daha dar pencerede tablo bozulmaz; yatay kaydırma kalabilir.
- **AC-15.** Sütunların taşıdığı bilgilerin hiçbiri kaybolmaz: tanım, tür, tedarikçi, tutar, başlangıç,
  bitiş, atama ve üretilen aylar bilgisi ya doğrudan ya da ipucu veya açılır satırda **erişilebilir**
  durumdadır; hiçbir alan kaldırılmaz.
- **AC-16.** `tests/makina-odeme.test.js` kendi zamanını sabitler ve gerçek takvimden bağımsız geçer.
- **AC-17.** Aynı test dosyasındaki iddialar gevşetilmemiştir; yalnız zaman sabitlenmiştir.
- **AC-18.** `tests/` altındaki tarih bağımlılığı taraması (`new Date(`, `Date.now(`, `today(`) tablo
  hâlinde raporlanmıştır; her bulgu için sabit zaman kurulmuş ya da tarih parametresi geçilmiş olduğu
  yazılıdır ve bulunan her dosya aynı desenle düzeltilmiştir.
- **AC-19.** `npm test` tam paket olarak yeşildir.
- **AC-20.** Koruma testi `acc` dahil bütün statik adları denetler; `theme.js` ve yorum satırları taramanın
  dışındadır, dinamik adlar (`hk`) testte adıyla listelenir.
- **AC-21.** Temaya eklenen üç ad (`purBg2`, `purBr`, `pur700`) aydınlık temada bugünkü yedek değerlerini
  taşır, yani aydınlık görünüm birebir korunur (AC-7'nin piksel raporuyla kanıtlanır).
- **AC-22.** "Üretilen aylar" sütunu sayı gösterir ("14 ay") ve tam liste ipucunda ya da satır açılınca
  görünür.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor (görsel olanlar kanıt görüntüsüyle).
- [ ] Tanımsız renk değişkeni koruma testi eklendi; dinamik adların listesi testte açıkça duruyor ve
      `theme.js` ile yorum satırları taramanın dışında bırakıldı (R3, AC-20).
- [ ] Temaya eklenen üç ad aydınlık değerlerini bugünkü yedeklerinden aldı; eşlenen iki ad (`n050`, `acc`)
      birebir aynı değere sahip olduğu için aydınlık tema değişmedi (R1, AC-21).
- [ ] Değişen renkler `tests/tasarim-kontrast.test.js`'e eklendi (R2).
- [ ] Karanlık ve aydınlık tema kanıt görüntüleri eklendi (`docs/evidence/0030-*.jpg`): gider formu,
      çalışan tanımı, tekrarlayan giderler, Anasayfa rozetleri, kargo panosu, tahsis modalı, üç form
      teslim kutusu.
- [ ] Sözlüğü kullanan dosya değiştiyse `docs/evidence/kanit-eslemesi.json` kaydı güncellendi; görünüm
      bilerek değiştiği için `beklenen: "degisti"` ve onay gerekçesi yazıldı.
- [ ] Tablo genişliği gerçek pencerede ölçüldü (mevcut Electron yerleşim testi deseni) ve 1280'de
      kaydırma olmadığı testle gösterildi.
- [ ] Etiket düğmesinin grubu doğru geçirdiği testle gösterildi (AC-11).
- [ ] `tests/makina-odeme.test.js` ve R12 taramasının bulduğu dosyalar dışında hiçbir test dosyasına
      dokunulmadı (C4); PR dosya listesinden görülüyor ve dokunulan her dosyada değişikliğin yalnız zaman
      sabitlemesi olduğu yazıldı.
- [ ] Tarih bağımlılığı taramasının sonucu PR özetine yazıldı (AC-18).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'ye tanımsız renk değişkeni kuralı ve koruma testi eklendi.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R3: kullanıcı, uygulanmış tabloyu gördükten sonra düğmelerin yan yana durmasını ve kartın sağa büyümesini istedi; R8'e yazıldı. R2 plan turunda, onayla eş zamanlıydı, sayılmaz. |
| **Düzeltme turu sayısı** | 1 | Tablo: ilk sürümde düğmeler yer darsa alt alta diziliyordu (1280'de payı korumak için) ve kart 760 px'te kalıyordu. Kullanıcı ekran görüntüsüyle geri çevirdi; kök neden Ayarlar içerik sütununun sınırıydı, pay hücre dolgusundan geri kazanıldı. |
| **Bulgu gerçek/gürültü oranı** | 3 / 5 | Saat kaydırma taraması beş düşen test verdi: üçü gerçek tarih bombası (`makina-odeme`, `gider-perdesi-yedek`, `musteri-detay-bolumler`), ikisi yöntemin yapaylığı (`pinned-fetch` TLS saati, `servis-panosu` yalnız saat geri gidince). |
| **Regresyon sayısı** | 0 | Aydınlık tema renk ekranlarında 0 piksel fark (testle), 202 ekranlık çekimde diğer bütün ekranlar 0 fark; mevcut testler yalnız onaylı istisnalarla değişti. Son durum: tam paket yeşil (Electron dahil), lint 0 hata. |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok. |

**Bu spec'ten çıkarılan ders:** Tarih bağımlılığını testte grep ile aramak yetmez: bağımlılık çoğu zaman test edilen kodun
`today()` çağrısındadır. Paketi saati ileri ve geri kaydırarak koşmak, spec'in yönteminin göremediği bilinen bombayı ve iki
yenisini buldu (biri üç hafta sonra patlayacaktı); bu koşu periyodik bir hijyen adımı olmalı. İkinci ders: "sığdır" isteğinde
yalnız dar pencereyi ölçmek yetmedi; geniş pencerede kartın neden büyümediğine (üst kabın genişlik sınırı) bakılmadı ve pay
uğruna düğmelerin görünümü feda edildi. Yerleşim işinde önce kapsayıcı sınırları okunmalı, görünümü etkileyen ödünler ise
uygulamadan önce kullanıcıya sorulmalı. Üçüncüsü: koruma testi önce kırmızı görülünce (tam beş ad) testin gerçekten koruduğu
kanıtlandı; tek tek düzeltmelerden kalıcı olanı bu test.
