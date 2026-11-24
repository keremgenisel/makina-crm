# 0162 — Analiz'de aynı parça tek satırda toplanır

| | |
|---|---|
| **Durum** | Onaylandı (2026-11-24, plan turu) |
| **Revizyon** | 3 (2026-11-24 plan turu: P1–P6) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **QA turu** | 2026-11-24: 28 bulgu (4 Bloklayıcı / 13 Önemli / 11 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 3 (canlı veri ölçümünün doğrulanabilirliği, `ServiceForm.jsx:415` atfı, R1/3'ün "hiçbir satırı etkilemez" sunumu) |
| **Etkilenen alanlar** | Analiz motorunun parça anahtarı, satırın `partId` alanı ve ad çözümü (`lib/analiz.js`), ondan beslenen bütün kutular (En Çok Değişen Parça, Parça Kırılımı'nın Model ve Müşteri görünümleri, parça seçicisi ve seçicinin alt satırı), kanıt aracının yeni Analiz ekranı ile `docs/evidence/kanit-eslemesi.json` kaydı |
| **Bağımlı spec'ler** | **0160** (satırın `partId` alanı, seçicinin kod/ölçü/cins araması ve alt satırı; `tests/parca-arama-0160.test.js` 0160 AC-54 bu işin tasarımını kısıtlar, C6), 0154 (parça kırılımının müşteri görünümü), 0121 ve 0154 (analiz çıktısının kıyas altınları), 0065 (servis parçasının stok düşümü, kapsam dışı), 0123 ve çöp kutusu geri alma yolu (R1/3'ün doğduğu yer) |

---

## Intent

Takım Yöneticisi 2026-11-23'te Analiz ekranının parça seçicisinde aynı parçanın iki kez listelendiğini bildirdi: "100_ÖN KESTAMİD KAM" bir satırda 27, başka bir satırda 4 adet görünüyor. Katalogda o parçadan tek kayıt var; ikizlenme, servis kayıtlarının bir kısmının parça kimliğini taşımamasından geliyor ve analiz motoru kimliği olanla olmayanı ayrı parça sayıyor. Kullanıcı aynı parçanın gerçek toplamını hiçbir yerde göremiyor, listede iki satırdan hangisine bakacağını bilmiyor ve en çok değişen parça sıralaması olduğundan düşük çıkıyor. Bu iş bittiğinde aynı parça tek satırda ve gerçek toplamıyla görünecek, katalogda karşılığı olmayan serbest metin parçalar ise bugünkü gibi kendi satırında kalacak.

QA turu işin şeklini iki yerde değiştirdi. Birincisi, kural tek bir anahtar fonksiyonuna sığmıyor: aynı kararın üç çıktısı var (satırın anahtarı, satırın `partId` alanı ve satırın adı) ve bunlardan `partId` spec 0160'ın kod, ölçü, hammadde ve cins aramasını besliyor, yani yazılmazsa birleşen satır koduyla bulunamaz hâle gelir ve bunu hiçbir test yakalamaz (R1/7, C1). İkincisi, kural pratikte yalnız servis tarafında birleşme üretiyor: kargo satışı kimliksiz doğamıyor ve kayıtta kendi adını taşımıyor, bu yüzden kargo yolunda doğrulanacak şey "yanlışlıkla birleşmemesi"dir (R2, AC-23).

---

## Requirements

- **R1.** Analiz'in parça kırılımında aynı parça **tek satırda** toplanır: bir hareketin parça kimliği yoksa ya da kimliği canlı katalogda bulunamıyorsa, hareketin adı canlı katalogdaki tek bir parçayla birebir eşleşiyorsa o parçanın satırına katılır.
- **R1/2.** Birebir eşleşme şudur: **iki tarafın** (hareketin adı ve katalog kaydının adı) baştaki ve sondaki boşluğu yok sayılır, ikisi `utils.trLower` ile Türkçe küçük harfe indirilerek karşılaştırılır. Arama normalleştiricisi (`aramaNormalize`, aksanı ASCII'ye indiren) **kullanılmaz**: "ışık" ile "isik" eşleşmez. Kısmi eşleşme, ön ek eşleşmesi ya da benzerlik **aranmaz**: "Rulman" ile "Rulman 6204" ayrı kalır. Yalnız `ad` okunur; `adEN` eşleşmeye girmez.
- **R1/3.** Aynı ada sahip (aynı katlanmış ada inen) birden çok canlı parça varsa birleştirme yapılmaz (hangisi olduğu belirsizdir); satır bugünkü gibi kendi adıyla durur, kullanıcıya uyarı yazılmaz. Bu dal **ulaşılabilirdir**: parça kartı aynı adı engeller (`useSimpleDefList:25,37`, aynı `trLower` katlamasıyla) ve Excel içe aktarması var olan adı günceller, ama çöp kutusunun parça geri alması ad çakışması denetlemez (`SettingsTrash.restorePart`), yani silinen bir ad yeniden oluşturulup eskisi geri alınarak iki canlı aynı adlı parça doğabilir.
- **R1/4.** Katalogda karşılığı bulunmayan ad bugünkü gibi kendi satırında kalır; bunlar gerçekten serbest metin yazılmış parçalardır.
- **R1/5.** Eşleşmenin girdisi **kaydın kendi adıdır** (serviste `degisenParcalar[].ad`, kırpılmış ve boş olmayan). Motorun hesapladığı **gösterim** adı ve onun yer tutucuları ("Parça", "Yedek parça") eşleşmeye **hiç girmez**: katalogda "Parça" adlı bir kayıt varsa adsız hareketler oraya akmaz. Yer tutucuyla kalan satır bugünkü gibi durur.
- **R1/6.** Eşleşme bulunamazsa **hiçbir şey değişmez**: ada düşme yalnız birleşme hedefini arama adımıdır. Kimliği katalogda bulunamayan ve adı eşleşmeyen hareketin anahtarı `p:<kimlik>` kalır, `partId` ham kimlik kalır, ad kaydın kendi adı kalır. Böylece aynı ada sahip iki farklı ölü kimlik birbirine karışmaz.
- **R1/7.** Ada göre birleşen satırın `partId` alanı **çözülen katalog kaydının kendi `id` değeridir** (ham, `String()` sarmalanmaz) ve anahtarı `p:<id>`'dir. Bu, spec 0160'ın zinciridir: ekran `katalog.get(String(p.partId))` ile parçanın kod, ölçü, hammadde ve cins alanlarını okuyup hem seçicinin alt satırına yazar hem aramaya katar (`Analiz.jsx:164-166, 194`). Alan yazılmazsa satırın anahtarı doğru, `partId`'si null olur ve o parça koduyla bulunamaz; kusur hareketlerin sırasına bağlı olduğu için (kimliksiz hareket girişi önce oluşturursa) sessizdir.
- **R1/8.** Kimlik çözülüyorsa ad eşleşmesi **hiç aranmaz**: kimlik önceliklidir, hareketin adı katalogdaki başka bir parçayla eşleşse bile satır kimliğin satırıdır.
- **R1/9.** Silinen bir parça aynı adla yeniden tanımlanınca, o parçanın ölü kimliğini taşıyan geçmiş hareketler yeni kaydın satırına akar. Bu **istenen sonuçtur** (fiziksel olarak aynı parçadır), ama geçmiş adetlerin bir katalog düzenlemesiyle değişmesi anlamına gelir.
- **R2.** Kural hareketin kaynağından bağımsızdır, ama **kargo tarafında birleşme üretemez**: kargo satışı kimliksiz doğamıyor (`yedekParcaSatis.js:54`, "Yedek parça seçin.") ve kayıtta kendi `ad` alanı yok, yani kargo satırının adı her zaman katalogdan ya da yer tutucudan gelir. Kargo yolunda doğrulanacak şey yanlış birleşmenin olmamasıdır (R1/5, AC-23).
- **R3.** **Ada göre birleşen** satırın adı katalog kaydının adıdır ve bu ad, girişi kimliksiz hareket oluşturmuş olsa bile yazılır ("ilk görülen ad" mantığı onu ezemez).
- **R3/2.** Kimliği zaten çözülen satırın adı bugünkü gibi **kaydın kendi adıdır**; R3 ona uygulanmaz. Bugün servis satırının adı katalogdan önce gelir (`analiz.js:134`) ve `tests/parca-arama-0160.test.js` 0160 AC-54 bunu sabitler ("Eski Cıvata Adı" satırı, katalogdaki adı "Cıvata" olan 4 numaralı parçanın kimliğiyle duruyor).
- **R4.** Toplamlar korunur: bütün satırların adet toplamı bugünküyle aynıdır, yalnız satırlara dağılımı birleşir. Kutulardaki sayılar (En Çok Değişen Parça, model kırılımı, müşteri kırılımı, parça seçicisindeki adetler) aynı kaynaktan beslendiği için birlikte düzelir.
- **R4/2.** Eşit toplamlı satırların sırası bugünkü gibi ekleme sırasında kalır; ikincil sıralama ölçütü **eklenmez** (`parcalar` yalnız `toplam`a göre sıralanıyor). Birleşme yeni eşitlikler doğuracaktır, listenin o eşitlikler içindeki sırası alfabetik değildir.
- **R4/3.** Katalog boşsa (`parts: []`) hiçbir birleşme olmaz ve çıktı bugünküdür.
- **R5.** Analiz dışında hiçbir şey değişmez: servis kaydı, stok düşümü, aylık rapor, Finans, sipariş listesi ve yazdırma çıktıları bugünkü davranışını korur.
- **R6.** Hiçbir kayıt değiştirilmez: çözüm okuma anındadır, göç yoktur.
- **R7.** Düz metin (string) parça satırının adı **metnin kendisidir** (`utils.parcaAdi` ile okunur) ve kural ondan da geçer. Bu, bu işle birlikte yapılan bilinçli bir ek düzeltmedir: bugün motor string satırda `p.ad` okuyamadığı için adı "Parça" yer tutucusuna düşürüyor, yani bütün eski string satırlar tek satırda ve yanlış adla birikiyor (uygulama string satırları hâlâ tanıyor: `ServisPanosu.jsx:542`, `CustomerDetailModal.jsx:171`, `PartManager.jsx:393`). Düzeltilmezse bu iş "aynı parça tek satırda" derken string satırları yer tutucu bir satırda birleşik ve yanlış adla bırakır.

---

## Constraints

### Uyulması zorunlu

- **C1.** Eşleştirme kararı **tek yerde** verilir (`analiz.js`'in bugünkü `parcaAnahtar` yolu) ve o kararın üç çıktısı birlikte yazılır: satırın anahtarı, satırın `partId` alanı (R1/7) ve ada göre birleşen satırın adı (R3). Ekran anahtar ayrıştırmaz, ikinci bir eşleştirme yazmaz. Üç çıktıdan biri atlanırsa kusur sessizdir: anahtar doğru görünürken `partId` null kalır ya da ad yanlış kaynaktan gelir.
- **C2.** Katalog eşlemesi motorun zaten aldığı parça dizisinden kurulur, yeni parametre eklenmez. Motor ad haritasını kurarken `deletedAt` taşıyan kaydı **kendisi atar** (savunma: uygulama ekrana `liveParts` veriyor, `App.jsx:1791`, ama motora çöpteki parçayı doğrudan veren birim testi de doğru sonuç vermelidir).
- **C2/2.** Bilinen asimetri: kimlikle ad çözen bugünkü harita (`partsById`) çöpü **süzmez** ve süzmeye de başlamaz, yani çöpteki bir parçanın kimliğini taşıyan hareket gösterimde onun adını okumaya devam eder, ama o ad adla eşleştirmeye girmez. Uygulamada bu durum ekrana canlı dizi verildiği için doğmaz.
- **C3.** Eşleşme **birebir** olmalıdır. Benzerlik ya da parçalı eşleşme yasaktır: yanlış birleşme, kullanıcının göremeyeceği sessiz bir veri yanlışıdır ve bugünkü bölünmeden daha kötüdür. Katlama `trLower`'dır (R1/2); aksan katlayan arama normalleştiricisi bu yolda yasaktır.
- **C4.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı yoktur; Analiz salt okunur kalır.
- **C5.** Eşleme parça başına bir kez kurulur, hareket başına katalog taranmaz (motor bugün 4.377 hareket geziyor, Context'teki ölçüm notuyla). Ölçümün tutamağı: `parts` dizisinin her kaydının `ad` alanını **tam bir kez** okuyan getter casusu (`gider-kapsami-0092-cagri` ve `maliyet-gecmisi-0097-cagri` emsali); `trLower` çağrısını saymak kırılgandır, motor onu başka yerlerde de çağırıyor.
- **C6.** Spec 0160'ın zinciri bu işin kısıtıdır: `tests/parca-arama-0160.test.js` 0160 AC-54 satırın `partId` alanını üç durumda sabitliyor (kimliği çözülen satırda ham değer, kimliksizde null, kimliği katalogda bulunamayan "Eski Mil" satırında ham `9`) ve o test dokunulmadan yeşil kalmalıdır. Bu, R1/6 ve R3/2'nin ölçüsüdür.
- **C7.** Bilinen sınır: parça adı değişince kimliksiz satırın adını taşıyan kaskad (`PartManager.jsx:392-393`) `parcaAdi(x) === oldAd` ile, yani büyük küçük harfe ve boşluğa **duyarlı** karşılaştırıyor. Katlama sayesinde bugün birleşen bir satır (ör. "rulman") yeniden adlandırmadan sonra taşınmaz ve yeniden ikizlenir.
- **C8.** `Analiz.jsx` tasarım sözlüğünü kullanıyor (`Segment`, `KartBolum`, `BosDurum`), bu yüzden kanıt aracına eklenen yeni Analiz ekranının `docs/evidence/kanit-eslemesi.json` kaydı ve depoda JPEG'i olmalıdır (`tasarim-kaynak.test.js` AC-12).

### KAPSAM DIŞI

- **X1.** Servis kayıtlarına parça kimliği yazan bir kerelik veri düzeltmesi — *neden:* geri dönüşü yoktur ve kimlik yazılan servisler bir daha düzenlendiğinde stok düşümü kuralına girer, yani geçmiş stok hareketlerini etkileyebilir (Takım Yöneticisi kararı, 2026-11-24: önce okuma anında birleştirme). Açık bulgu olarak kalır.
- **X2.** Kimliksiz satırların stoktan hiç düşmemiş olması — *neden:* stok düşümü kimlik ister (`servisStok.js:19`); geçmişe dönük düşüm ayrı ve riskli bir iştir, bu iş yalnız görünümü düzeltir. Açık bulgu olarak kalır.
- **X3.** Katalogda karşılığı olmayan 18 satırın (en çok "100_KARIŞTIRICI RULMANLARI") kataloğa eklenmesi — *neden:* veri girişi işidir; kullanıcı o adla bir parça tanımlarsa satır kendiliğinden birleşir.
- **X4.** Benzer adların birleştirilmesi — *neden:* C3.
- **X5.** Analiz dışındaki ekranların kimliksiz satırları ayrıca göstermesi ya da uyarması — *neden:* istek Analiz'in bölünmesiydi; bir "kimliksiz satır" denetim aracı ayrı iştir.
- **X6.** Çöpteki parçanın kargo satırlarının yer tutucu adla görünmesi — *neden:* kargo satırı adını yalnız katalogdan alıyor, parça çöpe atılınca ad "Yedek parça"ya düşüyor ve üç farklı çöpteki parçanın satışı seçicide aynı adla üç satır oluyor. Motor çöpteki adı yeni parametre almadan göremez (C2). Kullanıcının "hangi satıra bakacağım" şikâyetinin ikinci hâlidir, **açık bulgu olarak kalır**.
- **X7.** Ad kaskadının katlamalı eşleşmeye çevrilmesi — *neden:* C7'nin sınırını kapatır ama servis kayıtlarına yazan bir iştir, bu iş yalnız okuma anını düzeltir.

---

## Context

Ölçümler 2026-11-24'te canlı veritabanı üzerinde yapıldı. **Doğrulanabilirlik notu:** canlı veritabanı şifreli (`~/Library/Application Support/Altunmak CRM/data.db`, `sqlite3` ile açılmaya çalışıldığında `file is not a database (26)` veriyor), bu yüzden aşağıdaki canlı rakamlar (190 kimliksiz satır, bunların 172'si eşleşen ve 18'i eşleşmeyen, 22 ölü kimlikli satır, 2.097 değişen parça satırı, 4.377 hareket, 73 servis, "24.06.2026'da 113 milisaniye içinde yazılmış 26 servis") QA turunda bağımsız olarak **doğrulanamadı**; "2026-11-24 ölçümü" olarak etiketlidirler. İşin büyüklüğünü ve X1 ile X3 kararlarını bu rakamlar taşıyor, ama **hiçbir test onlara bağlanmaz**: kriterler fikstür rakamlarıyla yazılır. Kaynak koda dayanan tespitlerin hepsi doğrulandı (`analiz.js:31` anahtar fonksiyonu, `servisStok.js:19` kimlik şartı, Excel içe aktarmasının değişen parça yazmaması, `tests/analiz.test.js` ve `0154-veri.js` fikstürlerinin etkilenmemesi).

**İkizlenmenin sebebi.** `analiz.js:31` `parcaAnahtar(partId, ad)` kimlik varsa `p:<partId>`, yoksa `n:<ad>` anahtarı üretir. Kimlikli ve kimliksiz hareketler bu yüzden ayrı kovalara düşer. Ekrandaki rakamlar bunu birebir doğruluyor: "100_ÖN KESTAMİD KAM" satırındaki **27** = 22 servis + 5 kargo (hepsi kimlikli), ikinci satırdaki **4** = kimliksiz dört servis satırı; "100_ÖN KESTAMİD KAM KEÇESİ" için aynı biçimde **12** ve **1**. Gerçek toplamlar 31 ve 13'tür.

**Katalogda yineleme yok, ama kural ölü değil.** "KESTAMİD KAM" geçen beş parçanın hepsi tek kayıt ve canlı; bütün katalogda aynı adlı ikinci bir canlı parça da yok (2026-11-24 ölçümü). Yani sorun katalog değil, hareketin kimliksizliğidir ve R1/3 bugün hiçbir satırı etkilemez. **Buna karşılık R1/3 teorik bir dal değildir:** parça kartı aynı adı `trLower` katlamasıyla engelliyor (`useSimpleDefList:25,37`) ve Excel içe aktarması var olan adı güncelliyor, ama çöp kutusunun parça geri alması ad çakışması denetlemiyor (`SettingsTrash.restorePart`; tedarikçi, malzeme ve gider türünde böyle bir denetim var, parçada yok). Bir adı silip aynı adla yenisini açıp eskisini geri almak iki canlı aynı adlı parça doğurur, yani kural kodlanmalı ve testlenmelidir.

**Kapsam.** Canlı servislerdeki 2.097 değişen parça satırının **190'ı (%9) kimliksiz**, 73 servise yayılmış ve 2013'ten 2026'ya her yılda var. Bu 190 satırın **172'sinin adı canlı katalogda birebir var** (yeni kuralla birleşir), 18'inin adı katalogda hiç yok (kendi satırında kalır). Ayrıca **22 satır kimlik taşıyor ama o kimlik katalogda yok**; R1 bunları da ada düşürerek toplar. Kargo satışlarında kimliksiz satır yok (0 tane). Satırların hiçbiri düz metin değil, hepsi `{ad, fiyat}` biçiminde nesne.

**Kaynak bugün kapalı görünüyor.** Uygulamada servis parçası ekleyen tek yol formun katalog seçicisidir ve kimliği yazar (`ServiceForm.jsx:415`); Excel içe aktarması servis kaydı üretir ama değişen parça satırı **hiç yazmaz** (`SettingsImport.jsx:165-173`) ve git geçmişinde de hiç yazmamıştır. Kimliksiz satırı olan 73 servisin 47'si eski göç kayıtlarının küçük kimliklerini taşıyor; kalan 26'sının kimliği `1782292269675`–`1782292269788`, yani **24.06.2026'da 113 milisaniye içinde toplu yazılmış**. İşlem geçmişi 12.07.2026'da başladığı için o günün izi yok, bu yüzden o toplu yazımın hangi araçla yapıldığını **kanıtlayamıyorum**; uygulamanın bugünkü yollarından biri olmadığı ölçüldü.

**Var olan testler tasarımı kısıtlıyor (C6).** `tests/parca-arama-0160.test.js` motoru `canli(PARCALAR)` ile çağırıyor, yani 9 numaralı parça (çöpte) katalogda yok. 0160 AC-54 üç iddiayı sabitliyor: `satir("Rulman 6204").partId` ham `1`, `satir("Eski Cıvata Adı").partId` ham `"4"` (katalogdaki adı "Cıvata", yani kimliği çözülen satır kendi adıyla duruyor) ve `satir("Eski Mil").partId` ham `9` (ölü kimlik, adı canlı katalogda yok). Bu üç iddia iki tasarım kararını zorunlu kılıyor: R3 yalnız ada göre birleşen satıra uygulanır (geniş okunursa "Eski Cıvata Adı" satırı "Cıvata" olur ve test `undefined.partId` ile çöker) ve eşleşmeyen ölü kimlikte anahtar `p:9` kalır (ada düşerse `partId` null olur ve kriter kırılır).

**Kargo tarafı birleşme üretemez.** `yedekParcaRec` kimliksiz satışı reddediyor (`yedekParcaSatis.js:54`), yani kargoda kimliksiz satır yapı gereği doğamaz (Context'in "0 tane" ölçümüyle aynı yönde). Kargo kaydının `ad` alanı da yok: satırın adı ya katalogdan gelir ya "Yedek parça" yer tutucusudur (`analiz.js:145`). Bu yüzden kargoda ada göre çözülecek tek şey yer tutucudur ve R1/5 onu eşleşmeden çıkarıyor. Kargo yolunun kriteri birleşme değil, **yanlış birleşmeme**dir (AC-23).

**Yer tutucu adlar neden eşleşmeye girmiyor.** Motorun gösterim adı adsız servis satırında "Parça"ya (`analiz.js:134`), kargoda "Yedek parça"ya düşüyor. Katalogda "Parça" adlı bir kayıt varsa, gösterim adı eşleştirilirse adsız bütün hareketler oraya akar. Bu C3'ün yasakladığı sessiz veri yanlışının tam örneğidir ve kullanıcı onu göremez; bu yüzden eşleşmenin girdisi kaydın kendi adıdır (R1/5).

**Düz metin satırlar.** Kaynak hâlâ string parça satırlarını tanıyor: servis düzenlemeye açılınca nesneye çevriliyor (`ServisPanosu.jsx:542-545`, `CustomerDetailModal.jsx:171`) ve ad kaskadı onları da taşıyor (`PartManager.jsx:393`). Motor ise string satırda `p.ad` okuyamadığı için adı "Parça" yapıyor, yani bütün eski string satırlar tek satırda ve yanlış adla birikiyor. Context'in "hepsi nesne" ölçümü doğrulanamadığı ve kod bu hâli hâlâ savunduğu için adın `utils.parcaAdi` ile okunması bu işe bilinçli bir ek düzeltme olarak girdi (R7, AC-27).

**Motorun tek tüketicisi.** `src/lib/analiz.js`'i içe alan tek dosya `src/components/Analiz.jsx` (ölçüldü). Stok düşümü, aylık rapor, Finans ve sipariş listesi motoru hiç okumuyor, bu yüzden R5'in ölçüsü çapraz çıktı kıyası değil bu tek tüketici taramasıdır (AC-16): yeni bir tüketici eklenirse tarama kırılır.

**Testler.** `tests/analiz.test.js`'in kataloğu `[{id:7, ad:"Rulman 6204"}, {id:8, ad:"V Kayış"}]`, kimliksiz satırları ise "Conta", "Rulman", "Kayış"; hiçbiri birebir eşleşmediği için bu testler yeni kuralla **değişmez**. Aynı biçimde `tests/fixtures/0154-veri.js`'in "Serbest conta" satırı da kendi başına kalır. Kıyas altınları QA turunda okundu ve beklenen etkilenmemeleridir: `0121-once.json`'u üreten verinin bütün servis ve kargo satırları kimlikli ve kimlikleri katalogda var (üstelik `tests/fixtures/0160-ayikla.js` `partId`'yi karşılaştırmadan ayıklıyor), `0154-once.json`'un kıyası ise satırın `key` alanını karşılaştırıyor ve o verinin tek kimliksiz satırı ("Serbest conta") katalogda yok. `tests/ui/analiz.test.jsx`'in kimliksiz satırları (`PARCA-01`…) boş katalogla (`parts={[]}`) çiziliyor, yani R4/3 gereği etkilenmez. `tests/set-parcalama-0130.test.js` analizi kendi iki çıktısını karşılaştırdığı için (donmuş altın değil) her hâlde yeşil kalır.

### QA turunda ölçülenler (2026-11-24)

HEAD `808ac151`. Kod ölçümleri bağımsız olarak doğrulandı; canlı veri ölçümleri doğrulanamadı (V).

| # | Ölçüm | Yer | Sonuç |
|---|---|---|---|
| A | Anahtar fonksiyonu | `src/lib/analiz.js:31-32` | Kimlik varsa `p:<partId>`, yoksa `n:<trLower(ad)>`; spec'in anlatımı doğru |
| B | Servis satırının gösterim adı | `src/lib/analiz.js:134` | `p.ad \|\| parcaAdi(partsById.get(...)) \|\| "Parça"`, yani kaydın adı katalogdan önce gelir |
| C | Kargo satırının adı | `src/lib/analiz.js:145` | Yalnız katalogdan ya da `"Yedek parça"` yer tutucusundan; kayıtta `ad` alanı yok |
| D | `partId`'nin yazıldığı yer | `src/lib/analiz.js:96-101` | Kimliksiz çağrıda `partId: null`; girişi hangi hareketin oluşturduğuna bağlı |
| E | Ekranın `partId` kullanımı | `src/components/Analiz.jsx:164-166, 194` | `katalog.get(String(p.partId))` ile alt satır ve kod/ölçü/hammadde/cins araması |
| F | 0160'ın `partId` iddiaları | `tests/parca-arama-0160.test.js:65-72` | Motor `canli(PARCALAR)` ile çağrılıyor; üç ham değer sabitlenmiş |
| G | 0160 fikstürü | `tests/fixtures/0160-veri.js:9,14,20-28` | Parça 4'ün adı "Cıvata", parça 9 ("Eski Mil") çöpte; servis satırı "Eski Cıvata Adı" adıyla kimlik `"4"` taşıyor |
| H | Kargoda kimlik zorunlu | `src/lib/yedekParcaSatis.js:48,54` | Kimliksiz satış reddediliyor ("Yedek parça seçin.") |
| I | Katalogda aynı ad engeli | `src/hooks/useSimpleDefList.js:23-25,36-37` | Ad kırpılıyor ve `trLower` ile yineleme engelleniyor |
| J | Çöpten geri almada ad denetimi | `src/components/settings/SettingsTrash.jsx:180` | Parçada ad çakışması denetimi **yok** (tedarikçi, malzeme ve türde var) |
| K | Ad kaskadı | `src/components/PartManager.jsx:392-393` | `parcaAdi(x) === oldAd`, büyük küçük harfe ve boşluğa duyarlı |
| L | Motorun tüketicisi | kaynak taraması | `src/lib/analiz.js`'i içe alan tek dosya `src/components/Analiz.jsx` |
| M | Çöp süzmesi | `src/App.jsx:1791`, `src/lib/analiz.js:74-75` | Ekrana `liveParts` gidiyor; `partsById` çöpü süzmüyor |
| N | Katlama fonksiyonları | `src/lib/utils.js:150-154` | `trLower` yalnız Türkçe küçültme; `aramaNormalize` aksanı da katlıyor |
| O | `parcaAdi` | `src/lib/utils.js:577` | String girdide metnin kendisini döndürüyor |
| P | Satır sıralaması | `src/lib/analiz.js:177` | Yalnız `toplam` azalan, ikincil ölçüt yok |
| Q | Müşteri kırılımının hareket anahtarı | `src/lib/analiz.js:117-119` | `${kaynak}:${kayitId}`, aynı serviste iki satır tek harekete toplanıyor |
| R | Stok düşümünün kimlik şartı | `src/lib/servisStok.js:19` | `p.partId &&` filtresi; X2 doğrulandı |
| S | Formun kimliği yazması | `src/components/ServiceForm.jsx:415-416` | Kimliği yazan satır **416** (`onPick`); spec `:415` diyordu |
| T | Excel içe aktarması | `src/components/settings/SettingsImport.jsx:165-173` | Servis üretiyor, `degisenParcalar` hiç yazmıyor (dosyada 0 geçiş); iddia doğru |
| U | Kanıt eşlemesi | `docs/evidence/kanit-eslemesi.json`, `tests/tasarim-kaynak.test.js:137-163` | `Analiz.jsx`'in 9 ekran kaydı var; yeni ekran kayıt ve JPEG ister |
| V | Canlı veri | `~/Library/Application Support/Altunmak CRM/data.db` | Şifreli (`file is not a database (26)`); Context'in canlı rakamları doğrulanamadı |
| W | Kıyas ve ekran fikstürleri | `0121`, `0154`, `ui/analiz`, `0130` | Hiçbirinde yeni kuralla çözülecek hareket yok; etkilenmeleri beklenmiyor |
| X | Excel parça aktarması | `src/lib/parcaAktarma.js:88-93` | Var olan adı güncelliyor, dosyada yineleneni reddediyor; yeni aynı adlı parça doğurmuyor |

### QA turunda verilen kararlar (2026-11-24)

**Bloklayıcı**

- **B1. Birleşen satırın `partId` alanı.** Ada göre birleşen satırın `partId`'si çözülen katalog kaydının ham `id` değeri olur, anahtarı `p:<id>`'dir (R1/7, C1, AC-19, AC-20). — *neden:* ölçüm D ve E birlikte gösteriyor ki alan yazılmazsa satırın anahtarı doğru görünürken `partId` null kalır, spec 0160'ın kod, ölçü, hammadde ve cins araması ile seçicinin alt satırı o parçada sessizce çalışmaz ve kusur hareketlerin sırasına bağlı olduğu için ara ara görünür.
- **B2. R3'ün kapsamı daraltıldı.** Katalog adı yalnız **ada göre birleşen** satıra yazılır; kimliği zaten çözülen satırın adı bugünkü gibi kaydın kendi adıdır (R3, R3/2, AC-10, AC-21). — *neden:* ölçüm B, F ve G birlikte gösteriyor ki geniş okuma "Eski Cıvata Adı" satırını "Cıvata" yapar ve `tests/parca-arama-0160.test.js` 0160 AC-54 `undefined.partId` ile çöker; R3 ayrıca bir görünüm kuralıdır, C1'in anahtar cümlesine kendiliğinden sığmaz.
- **B3. Eşleşmenin girdisi kaydın kendi adı.** Gösterim adı ve yer tutucuları ("Parça", "Yedek parça") eşleşmeye hiç girmez (R1/5, AC-22, AC-23). — *neden:* ölçüm B ve C gösteriyor ki adsız satırın adı yer tutucuya düşüyor; katalogda "Parça" adlı bir kayıt varsa bütün adsız hareketler oraya akar, bu C3'ün yasakladığı sessiz veri yanlışıdır ve yer tutucu bir ad iddiası değil "ad yok" demektir.
- **B4. Eşleşme bulunamazsa hiçbir şey değişmez.** Ada düşme yalnız hedefi arama adımıdır; eşleşme yoksa anahtar `p:<kimlik>`, `partId` ham kimlik ve ad kaydın adı kalır (R1/6, C6, AC-24, AC-25). — *neden:* ölçüm F ve G gösteriyor ki `satir("Eski Mil").partId === 9` iddiası ada düşmeyle kırılır; ayrıca aynı ada sahip iki farklı ölü kimlik birbirine karışırdı, bu da R1/3'ün belirsizlikte birleştirmeme ilkesine aykırıdır.

**Önemli**

- **Ö1. R2 ve AC-9 kargo için yeniden yazıldı.** Kural kaynak ayırmaz ama kargoda birleşme üretemez; kargo kriterinin içeriği yanlış birleşmemedir (R2, AC-23). — *neden:* ölçüm H ve C gösteriyor ki kargo satışı kimliksiz doğamaz ve kayıtta ad taşımaz, yani eski AC-9 ya anlamsız bir test doğurur ya geliştiriciyi yer tutucuyu eşleştirmeye iter.
- **Ö2. AC-14'ün koşulu genişletildi.** Kıyas "yeni kuralla ada göre çözülecek hiçbir hareketi olmayan veride" ölçülür, yani kimliksiz satır kadar ölü kimlikli satır da dışlanır (AC-14). — *neden:* R1 ölü kimlikli 22 satırı da birleştiriyor, bugünkü koşulla kıyas fikstürü yanlış kurulup güvence vermeyebilirdi.
- **Ö3. AC-15'in ölçüm tutamağı yazıldı.** Ölçüm `parts` dizisindeki her kaydın `ad` alanını tam bir kez okuyan getter casusuyla yapılır (C5, AC-15). — *neden:* ölçüm N gösteriyor ki `trLower` motorun başka yerlerinde de çağrılıyor, onu saymak kırılgandır; katalog haritasını kurmak için casuslanacak ayrı bir fonksiyon da yok.
- **Ö4. AC-16'nın ölçümü taramaya çevrildi.** Ölçü, motorun tek tüketicisinin `Analiz.jsx` olduğunu sabitleyen kaynak taramasıdır; çapraz çıktı kıyası kaldırıldı (AC-16). — *neden:* ölçüm L gösteriyor ki stok, aylık rapor, Finans ve sipariş listesi motoru hiç okumuyor (sipariş listesinin bu işle bağı yok); tarama daha güçlü güvence verir çünkü yeni bir tüketici eklenince kırılır.
- **Ö5. Çöp süzmesinin sahibi motor.** Motor ad haritasını kurarken `deletedAt` taşıyan kaydı kendisi atar (C2, AC-8). — *neden:* ölçüm M gösteriyor ki uygulamada ekrana `liveParts` gidiyor, yani kural çağırana bırakılırsa AC-8'in birim testi (motora çöpteki parçayı doğrudan veren test) başarısız olur.
- **Ö6. R1/3'ün ulaşılabilir yolu yazıldı.** Çöp kutusunun parça geri alması ad çakışması denetlemiyor, yani iki canlı aynı adlı parça doğabilir; sonuç sessizdir ve kabul edilir (R1/3, AC-26). — *neden:* ölçüm I, J ve X gösteriyor ki öteki yollar yineleneni engelliyor; yol yazılmazsa geliştirici R1/3'ü ölü dal sanıp testsiz bırakır.
- **Ö7. Ad kaskadının duyarlılığı bilinen sınır.** Yeniden adlandırma kimliksiz satırın adını yalnız birebir eşleşiyorsa taşır (C7, X7). — *neden:* ölçüm K gösteriyor ki kaskad büyük küçük harfe duyarlı, yani katlamayla birleşen bir satır yeniden adlandırmadan sonra yeniden ikizlenir; kullanıcı bunu kusur sanacaktır.
- **Ö8. Düz metin satırın adı düzeltildi.** Ad `utils.parcaAdi` ile okunur, yani string satırın adı metnin kendisidir ve kural ondan da geçer (R7, AC-27). — *neden:* ölçüm O gösteriyor ki düzeltme tek fonksiyon çağrısı; bugün bütün eski string satırlar "Parça" yer tutucusunda birleşik ve yanlış adla duruyor, yani kullanıcının şikâyeti başka kılıkta kalırdı.
- **Ö9. Çöpteki parçanın kargo satırları kapsam dışı.** Yer tutucu adla görünmeye devam eder, açık bulgu olarak kalır (X6). — *neden:* ölçüm C ve M gösteriyor ki motor çöpteki adı yeni parametre almadan göremez (C2 onu kapatıyor); kullanıcı bu satırları görünce "düzelmemiş" diyecektir, bu yüzden şimdiden yazılı olmalıdır.
- **Ö10. Canlı rakamlar etiketlendi.** Context'in canlı ölçümleri "2026-11-24 ölçümü" olarak işaretlendi, yöntem ve doğrulanamazlık yazıldı, testler onlara bağlanmaz (Context, AC-2). — *neden:* ölçüm V gösteriyor ki veritabanı şifreli ve rakamlar bağımsız doğrulanamıyor; rakamlar X1 ile X3 kararlarını taşıdığı için kaynakları yazılmazsa sonraki tur yeniden ölçmek zorunda kalır.
- **Ö11. Kanıt maddesi eşleme kaydını sayıyor.** Yalnız birleşmiş satır için yeni ekran eklenir, kaydı ve JPEG'i konur; serbest metin ve boş liste var olan ekranlardan gösterilir (C8, AC-37, DoD). — *neden:* ölçüm U gösteriyor ki `Analiz.jsx` tasarım sözlüğünü kullanıyor ve kaydı olmayan ekran `tasarim-kaynak` testini kırar; eski madde gereğinden fazla ekran da ürettiriyordu.
- **Ö12. Yeniden tanımlanan parçanın geçmişi istenen sonuç.** Silinen bir parça aynı adla yeniden açılınca ölü kimlikli hareketler yeni kayda akar (R1/9, AC-28). — *neden:* fiziksel olarak aynı parçadır, ama geçmiş adetlerin bir katalog düzenlemesiyle değişmesi yazılı olmazsa veri kaybı sanılır.
- **Ö13. Müşteri kırılımında hareket tekleşmesi.** Aynı servisin kimlikli ve kimliksiz satırı birleşince o servis tek hareket satırı olur ve adetler toplanır (AC-29). — *neden:* ölçüm Q gösteriyor ki hareket anahtarı `${kaynak}:${kayitId}`, yani sonuç spec 0154'ün R7/2 kuralıyla uyumludur; hareket sayısının düşmesi beklenen sonuçtur, yazılmazsa regresyon sanılır.

**Küçük**

- **K1. Katlama fonksiyonu adlandırıldı.** `trLower` kullanılır, `aramaNormalize` yasaktır (R1/2, C3, AC-31). — *neden:* ölçüm N gösteriyor ki arama normalleştiricisi aksanı da katlıyor, yani C3 sessizce ihlal edilirdi.
- **K2. Kırpma iki tarafta.** Hem hareketin hem katalog kaydının adı kırpılır (R1/2, AC-32). — *neden:* savunma bedavadır ve boşluklu alan verisi bu depoda görülüyor (0160 fikstüründe `kod: "  SM-8  "`).
- **K3. `adEN` eşleşmeye girmez.** Yalnız `ad` okunur (R1/2, AC-33). — *neden:* İngilizce ad bir satış alanıdır, servis satırının adı Türkçe yazılır; belirsizlik bırakmamak için yazıldı.
- **K4. AC-2 fikstür rakamlarıyla.** 27 artı 4 eşittir 31 örneği Intent'te kalır, kriter fikstür rakamlarıyla ölçülür (AC-2). — *neden:* ölçüm V gereği canlı rakamlar doğrulanamıyor, testin onlara bağlanması kırılgan olurdu.
- **K5. `ServiceForm` atfı düzeltildi.** Kimliği yazan satır 416'dır (Context, Ölçüm S). — *neden:* `:415` `SearchPick` satırıdır, kimlik `onPick` içinde yazılıyor.
- **K6. Etkilenen alanlar genişletildi.** Satırın `partId` alanı, ad çözümü, seçicinin alt satırı, kanıt ekranı ve eşleme kaydı eklendi (başlık tablosu). — *neden:* iş yalnız anahtar fonksiyonuna dokunmuyor, dokunduğu yerler başlıkta görünmeliydi.
- **K7. Bağımlı spec'ler genişletildi.** 0160 ve çöp kutusu geri alma yolu eklendi (başlık tablosu). — *neden:* 0160 bu işin tasarımını kısıtlıyor (C6) ve R1/3 çöpten geri almayla doğuyor.
- **K8. AC-17 taramaya indirildi.** Motor hiçbir yere yazmıyor ve ekran yazıcı prop'u almıyor; ölçü kaynak taramasıdır (AC-17). — *neden:* salt okunur bir motor için gerçek App gövdesi kıyası ölçünün ağırlığını boşa harcar.
- **K9. Satır sırası değişmiyor.** Eşit toplamlı satırların sırası ekleme sırasında kalır, ikincil ölçüt eklenmez (R4/2, AC-34). — *neden:* ölçüm P gösteriyor ki bugün ikincil ölçüt yok; birleşme yeni eşitlikler doğuracağı için davranışın yazılı olması gerekiyor.
- **K10. Boş katalog yazıldı.** `parts: []` ile hiçbir birleşme olmaz (R4/3, AC-35). — *neden:* kanıt ekranı `analiz-0154-bos` ve `tests/ui/analiz.test.jsx`'in kimliksiz satırları boş katalogla çiziliyor, yani dal gerçekten kullanılıyor.
- **K11. Kimlik önceliği netleştirildi.** Kimlik çözülüyorsa ad eşleşmesi hiç aranmaz (R1/8, AC-30). — *neden:* R1'in cümlesi bunu ima ediyordu ama yazılı değildi; ad eşleşmesinin kimliği ezmesi sessiz bir yanlış birleşme olurdu.

### QA turu karar kaydı (2026-11-24)

| # | Derece | Karar | İşlendiği yer |
|---|---|---|---|
| B1 | Bloklayıcı | Birleşen satırın `partId`'si katalog kaydının ham `id`'si | R1/7, C1, AC-19, AC-20 |
| B2 | Bloklayıcı | Katalog adı yalnız ada göre birleşen satıra yazılır | R3, R3/2, AC-10, AC-21 |
| B3 | Bloklayıcı | Eşleşmenin girdisi kaydın kendi adı; yer tutucular girmez | R1/5, AC-22, AC-23 |
| B4 | Bloklayıcı | Eşleşme yoksa anahtar, `partId` ve ad değişmez | R1/6, C6, AC-24, AC-25 |
| Ö1 | Önemli | Kargoda birleşme üretilemez, kriter yanlış birleşmeme | R2, AC-23 |
| Ö2 | Önemli | AC-14'ün koşulu ölü kimlikli satırı da dışlar | AC-14 |
| Ö3 | Önemli | AC-15 getter casusuyla ölçülür | C5, AC-15 |
| Ö4 | Önemli | AC-16 tek tüketici taraması | AC-16 |
| Ö5 | Önemli | Çöp süzmesini motor yapar | C2, AC-8 |
| Ö6 | Önemli | R1/3 çöpten geri almayla doğar, sonucu sessizdir | R1/3, AC-26 |
| Ö7 | Önemli | Ad kaskadı duyarlı, bilinen sınır | C7, X7 |
| Ö8 | Önemli | Düz metin satırın adı metnin kendisi | R7, AC-27 |
| Ö9 | Önemli | Çöpteki parçanın kargo satırları kapsam dışı | X6 |
| Ö10 | Önemli | Canlı rakamlar etiketlendi, testler bağlanmaz | Context, AC-2 |
| Ö11 | Önemli | Kanıt ekranı eşleme kaydı ister | C8, AC-37, DoD |
| Ö12 | Önemli | Yeniden tanımlanan parçanın geçmişi akar | R1/9, AC-28 |
| Ö13 | Önemli | Müşteri kırılımında hareket tekleşir | AC-29 |
| K1 | Küçük | Katlama `trLower`, `aramaNormalize` yasak | R1/2, C3, AC-31 |
| K2 | Küçük | Kırpma iki tarafta | R1/2, AC-32 |
| K3 | Küçük | `adEN` eşleşmeye girmez | R1/2, AC-33 |
| K4 | Küçük | AC-2 fikstür rakamlarıyla | AC-2 |
| K5 | Küçük | `ServiceForm` atfı 416 | Context, Ölçüm S |
| K6 | Küçük | Etkilenen alanlar genişletildi | Başlık tablosu |
| K7 | Küçük | Bağımlı spec'lere 0160 ve çöp yolu eklendi | Başlık tablosu |
| K8 | Küçük | AC-17 taramaya indirildi | AC-17 |
| K9 | Küçük | Eşit toplamlı satırların sırası değişmez | R4/2, AC-34 |
| K10 | Küçük | Boş katalogda birleşme yok | R4/3, AC-35 |
| K11 | Küçük | Kimlik önceliği netleştirildi | R1/8, AC-30 |

### Plan turunda verilen kararlar (2026-11-24)

Takım Yöneticisi planın bütün önerilerini onayladı ("tum onerilerini onayliyorum, spece isle, plani yaz ve uygula"). Plan `specs/0162-uygulama-plani.md`.

- **P1 (satırın adının kaynağı, sıradan bağımsız).** Bir satıra hem kimliği çözülen hem ada göre birleşen hareket düşebilir. Kural: satırda kimliği çözülen ve kendi adını taşıyan hareket varsa onun adı kalır (birden çoksa ilk görülen); yalnız ada göre birleşen hareketler varsa ad katalog adıdır; ada göre birleşen hareket kimlikli hareketin koyduğu adı ezmez, kimlikli hareket yer tutucuyu ve katalog adını ezer — *neden:* R3/2'yi (0160 AC-54'ün "Eski Cıvata Adı") ve AC-20'nin sıradan bağımsızlığını birlikte sağlar.
- **P1/2 (triyaj bulgu 1, 2026-11-24).** P1'in "kimlikli hareket katalog adını ezer" yarısı **yalnız ada göre birleşmeyle açılmış satıra** uygulanır. Satırı kimlik yolu açtıysa (adsız kimlikli hareketin katalogdan gelen gösterim adı dahil) ad kuralı spec öncesiyle aynıdır: ilk görülen ad kalır, yalnız yer tutucu ezilir. Böylece ada göre çözülecek hareket olmayan veride çıktı birebir eskidir (AC-14) ve R3/2 korunur; sıradan bağımsızlık (AC-20) yalnız birleşen satırda gerekir ve orada sürer. Yan etki (iyileşme): yalnız boşluktan oluşan kayıt adı artık ad sayılmaz, gösterim katalog adına düşer.
- **P2 (ad bir kez okunur).** Motor katalogu tek geçişte okur, her kaydın `ad`'ını bir kez okuyup iki haritaya yazar: `adById` (bütün kayıtlar, gösterim; C2/2 asimetrisi) ve canlı ad haritası (eşleşme). Gösterim adı her harekette katalog kaydından değil haritadan okunur, çıktı birebir aynıdır — *neden:* C5'in getter casusu (AC-15) ancak böyle "tam bir kez" görür.
- **P3 (AC-14'ün kapsamı).** İki güvence: var olan 0121 ve 0154 kıyasları dokunulmadan yeşil; ayrıca `tests/fixtures/0162-veri.js`'in çözülecek hareket içermeyen alt kümesi (`COZULECEKSIZ`) spec öncesi koddan alınmış altınla (`0162-once.json`) birebir.
- **P4 (düz metin satırın anahtarı).** R7 ile düz metin satırın adı metnin kendisi olur; katalogda karşılığı yoksa anahtarı `n:<metin>`, `partId`'si null; bugünkü tek "Parça" satırı metin başına ayrılır (AC-27).
- **P5 (kimliği canlı, kayıt adı boş).** Kimlik öncelikli; ada bakılmaz, gösterim adı bugünkü gibi katalogdan.
- **P6 (kanıt ekranı).** Yeni ekran seçicinin açık hâlini çizer (birleşmiş satır ve dolu alt satır); adım uyarısı olmadığı denetlenir.

---

## Acceptance Criteria

- **AC-1.** Kimliksiz bir servis satırının adı canlı katalogda birebir varsa, o hareket parçanın satırına katılır ve listede tek satır görünür.
- **AC-2.** Birleşen satırın adedi iki kovanın toplamıdır; ölçüm **fikstür rakamlarıyla** yapılır (canlı "27 + 4 = 31" örneği Intent'te kalır, teste bağlanmaz).
- **AC-3.** Kimliği katalogda bulunamayan hareket, adı katalogda birebir varsa aynı kuralla birleşir.
- **AC-4.** Adı katalogda bulunmayan kimliksiz hareket kendi satırında kalır ve adı değişmez.
- **AC-5.** Aynı ada sahip iki canlı parça varsa birleştirme yapılmaz; hareket kendi adıyla ayrı satırda kalır.
- **AC-6.** Benzer ad birleşmez: "Rulman" adlı hareket, katalogdaki "Rulman 6204" parçasının satırına katılmaz.
- **AC-7.** Baştaki ve sondaki boşluk ile büyük küçük harf farkı eşleşmeyi bozmaz.
- **AC-8.** Çöpteki parçanın adıyla eşleşme yapılmaz; süzmeyi **motor** yapar, yani çöpteki parçayı doğrudan motora veren birim testi de doğru sonuç verir.
- **AC-9.** Kargo yedek parça satışı aynı kuraldan geçer: kimliği çözülen kargo satırı bugünkü gibi parçanın satırına girer (kargoda ada göre birleşme üretilemez, R2).
- **AC-10.** **Ada göre birleşen** satırın adı katalog kaydının adıdır, hareketin ad kopyası değil; girişi kimliksiz hareket oluşturmuş olsa da öyledir.
- **AC-11.** Bütün satırların adet toplamı spec öncesiyle aynıdır.
- **AC-12.** Parça Kırılımı'nın Model görünümü birleşen satırda iki kaynağın modellerini birlikte gösterir.
- **AC-13.** Parça Kırılımı'nın Müşteri görünümü (0154) birleşen satırda iki kaynağın makinalarını birlikte gösterir.
- **AC-14.** Yeni kuralla ada göre çözülecek **hiçbir hareketi olmayan** veride (ne kimliksiz ne ölü kimlikli ne düz metin satır) analiz çıktısı birebir eskidir (kıyas).
- **AC-15.** Katalog eşlemesi parça başına bir kez kurulur; hareket başına katalog taraması yoktur. Ölçüm, `parts` dizisindeki her kaydın `ad` alanını **tam bir kez** okuyan getter casusudur.
- **AC-16.** Motorun tek tüketicisi `src/components/Analiz.jsx`'tir (kaynak taraması); stok düşümü, aylık rapor, Finans ve sipariş listesi motoru hiç okumadığı için değişmez.
- **AC-17.** Hiçbir kayıt değişmez: motor hiçbir yere yazmaz ve `Analiz` yazıcı prop'u almaz (kaynak taraması).
- **AC-18.** Yeni alan, veri bölümü, izin ve sunucu kuralı yoktur (kaynak taraması).

### QA turu kriterleri (2026-11-24)

- **AC-19.** Ada göre birleşen satırın `partId`'si çözülen katalog kaydının ham `id` değeridir ve anahtarı `p:<id>`'dir; satır o parçanın koduyla, ölçüsüyle ve cinsiyle aranabilir, seçicinin alt satırı dolu çizilir.
- **AC-20.** AC-19 hareketlerin sırasından bağımsızdır: kimliksiz hareket satırı önce oluştursa da `partId` doğrudur.
- **AC-21.** Kimliği çözülen ama adı katalogdakinden farklı olan satırın adı değişmez.
- **AC-22.** Yer tutucu ad eşleşmeye girmez: katalogda "Parça" adlı bir kayıt varsa adsız servis satırları onun satırına katılmaz.
- **AC-23.** Kargoda yer tutucu ad eşleşmeye girmez: kimliği katalogda bulunmayan kargo satırı "Yedek parça" adlı bir katalog kaydına katılmaz, kendi satırında kalır.
- **AC-24.** Kimliği katalogda bulunmayan ve adı eşleşmeyen hareketin anahtarı, `partId`'si ve adı spec öncesiyle aynıdır.
- **AC-25.** Aynı ada sahip iki farklı ölü kimlik birbirine karışmaz, iki ayrı satırda kalır.
- **AC-26.** Aynı ada sahip iki canlı parça (çöpten geri almayla doğan hâl) birleştirmeyi durdurur ve kullanıcıya uyarı yazılmaz.
- **AC-27.** Düz metin (string) parça satırının adı metnin kendisidir ve kural ondan da geçer; yer tutucu "Parça" satırında birikmez.
- **AC-28.** Silinen bir parça aynı adla yeniden tanımlanınca o parçanın ölü kimliğini taşıyan geçmiş hareketler yeni kaydın satırına akar.
- **AC-29.** Aynı servisin kimlikli ve kimliksiz satırı birleşince müşteri kırılımında (0154) tek hareket satırı görünür ve adetler toplanır.
- **AC-30.** Kimlik çözülüyorsa ad eşleşmesi aranmaz: hareketin adı katalogdaki başka bir parçayla eşleşse de satır kimliğin satırıdır.
- **AC-31.** Katlama `trLower`'dır: aksan katlanmaz, "ışık" ile "isik" eşleşmez.
- **AC-32.** Katalog kaydının adındaki baştaki ve sondaki boşluk da yok sayılır.
- **AC-33.** `adEN` eşleşmeye girmez.
- **AC-34.** Eşit toplamlı satırların sırası ekleme sırasında kalır; ikincil sıralama ölçütü eklenmemiştir.
- **AC-35.** Katalog boşken hiçbir birleşme olmaz ve çıktı bugünküdür.
- **AC-36.** `tests/parca-arama-0160.test.js` dokunulmadan yeşildir (0160 AC-54 dahil).
- **AC-37.** Kanıt aracına eklenen yeni Analiz ekranının `docs/evidence/kanit-eslemesi.json` kaydı ve depoda JPEG'i vardır.
- **AC-38.** Bilinen asimetri korunur: çöpteki bir parçanın kimliğini taşıyan hareket gösterimde onun adını okumaya devam eder, o ad adla eşleştirmeye girmez.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kural **saf motorda**: eşleştirme kararı tek yerde ve üç çıktısı (anahtar, `partId`, ad) birlikte yazıldı; ekran değişmedi (C1, AC-18, AC-19).
- [ ] Aynı sayıyı üreten bütün kutular (En Çok Değişen Parça, Model ve Müşteri kırılımı, parça seçicisi) aynı kaynaktan besleniyor (AC-12, AC-13).
- [ ] Yeni kalıcı alan yok; dört nokta kuralı uygulanmadı ve bu açıkça yazıldı.
- [ ] Yeni veri bölümü, eylem izni ve sunucu kuralı yok; **Analiz salt okunur kaldı** (açıkça yazıldı).
- [ ] Soft-delete simetrisi korundu: çöpteki parça eşleşmiyor (AC-8).
- [ ] Kullanıcıya görünen metinler Türkçe; yeni metin eklenmediyse bu yazıldı.
- [ ] Para gösterilmiyor; çoklu para kuralı bu işte geçerli değil.
- [ ] Görsel kanıt: **birleşmiş satır** için yeni ekran eklendi, `docs/evidence/kanit-eslemesi.json` kaydı ve JPEG'i konuldu (AC-37); serbest metin satırı ve boş liste var olan `analiz-0154-musteri` ile `analiz-0154-bos` ekranlarından gösterildi.
- [ ] Kıyas altınları (0121, 0154) ve ekran testleri (`ui/analiz`, `0130`) ölçüldü; değişen varsa gerekçesi test yorumunda "spec 0162 ile" notuyla yazıldı.
- [ ] Spec 0160 zinciri korundu: birleşen satır koduyla aranabiliyor, seçicinin alt satırı dolu ve `tests/parca-arama-0160.test.js` dokunulmadan yeşil (C6, AC-19, AC-36).
- [ ] Yer tutucu adlar ("Parça", "Yedek parça") eşleşmeye girmedi ve kargo yolunda yanlış birleşme olmadığı ölçüldü (AC-22, AC-23).
- [ ] C5'in ölçümü getter casusuyla yapıldı (AC-15).
- [ ] Motorun tek tüketicisi taramayla sabitlendi (AC-16).
- [ ] Düz metin satırın adı düzeltildi ve kendi kriteri var (R7, AC-27).
- [ ] Çöp süzmesi motorda yapıldı; `partsById` asimetrisi yazıldı (C2, C2/2, AC-8, AC-38).
- [ ] Canlı veri rakamları etiketli ve hiçbir test onlara bağlı değil (Context, AC-2).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (parça anahtarının ad düşüşü kuralı).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

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
