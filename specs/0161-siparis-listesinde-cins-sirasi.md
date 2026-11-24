# 0161 — Sipariş listesinde parçalar cinse göre sıralanır

| | |
|---|---|
| **Durum** | Onaylandı (2026-11-24, plan turu) |
| **Revizyon** | 3 (2026-11-24 plan turu: P1–P10) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **QA turu** | 2026-11-24: 28 bulgu (4 Bloklayıcı / 13 Önemli / 11 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 3 (etkilenecek altınların listesi, 0160'ın "taslak" durumu, canlı veri ölçümünün doğrulanabilirliği) |
| **Etkilenen alanlar** | Sipariş motoru (`lib/siparisIhtiyaci.js`), sipariş penceresi (`stock/SiparisPenceresi.jsx`), sipariş belgesi (`lib/siparisRaporu.js`), yeni uygulama ayarı (`appSettings`, Ayarlar › Uygulama), ayar zinciri (`db.cjs`, `serverAuth.cjs` ayar alanı eşlemesi, `App.jsx` yükleme yolu, `lib/kilitAlanlari.js`), yeni Ayarlar paneli (`settings/SettingsCinsSira.jsx` ve `Settings.jsx`'in Uygulama grubu), pencerenin motor çağrısının bağımlılığı (`SiparisPenceresi.jsx:75`), kanıt eşlemesi (`docs/evidence/kanit-eslemesi.json`), bekçi zinciri (`tests/fixtures/0161-yeni-ayar.js` ve onu kullanan on test), `scripts/tests/db-roundtrip.cjs` ile `db-clean-install.cjs` |
| **Bağımlı spec'ler** | 0158 (parçanın cins alanı ve belgenin Cins sütunu), 0147 (belgenin hammadde gruplaması ve grup içi sıra), 0140 ve 0142 (sipariş penceresi ve belgesinin bugünkü şekli), 0144 (fiyatlı nüsha), 0133 (ayar alanı emsali), 0091 (ayarın yükleme yolu dersi), 0160 (aynı alanın arama ve görünüm işi; **tamamlandı**, commit `b2a2819b`, iki taraması bu işin kısıtı) |

---

## Intent

Sipariş listesi uzun olduğunda satın alma yapan kişi aynı türden parçaları tek tek listenin içinde arıyor: rulmanlar bir yerde, cıvatalar başka yerde, aradaki sıra modelin kit sırasından geliyor ve bu sıra satın alma işine hiçbir şey anlatmıyor. Satın alma zihinsel olarak türe göre çalışıyor, çünkü aynı türü aynı firmadan ve aynı telefonda sipariş ediyor. Bu iş bittiğinde sipariş listesinde aynı cinse sahip parçalar ard arda görünecek, blokların sırasını kullanıcı kendisi belirleyecek ve en çok sipariş edilen tür (bugün rulman) her zaman listenin başında olacak. Pencere ile basılan belge de aynı sırayı gösterecek, yani ekranda görülen liste ile elde taşınan kâğıt birbirinin aynısı olacak.

QA turu işin şeklini iki ölçümle değiştirdi. Birincisi: bugünkü kıyas verisinde cinsi dolu tek parça belgenin tablosunda zaten ilk sırada, yani bu iş belge tarafında hiçbir altını kırmıyor ve asıl değişen pencerenin listesi oluyor. İkincisi: yeni uygulama ayarı, deponun "yeni ayar alanı yok" bekçisini on test dosyasında birlikte kırıyor, yani ayar zinciri işin görünenden büyük bir parçası.

---

## Requirements

- **R1.** Sipariş listesinde parçalar **cinse göre bloklanır**: aynı cinse sahip parçalar ard arda gelir.
- **R1/2.** Blokların sırası: (1) Ayarlar'daki öncelik listesinde yazan cinsler, **listedeki sırayla**; (2) listede olmayan ama cinsi dolu parçalar, cins adına göre alfabetik (Türkçe sıralama); (3) **cinsi boş** parçalar en sonda.
- **R1/3.** Blok içinde bugünkü sıra korunur: **belgenin** hazır parçalar ve "Malzemesi belirtilmemiş" tablolarında kit sırası, hammadde tablosunda kesit sonra parça adı; **pencerenin** tablosunda bugünkü ekleme (kit) sırası. Pencere satırı `kitSira` alanını taşımaz (o alan yalnız belge satırındadır, `siparisIhtiyaci.js:594`) ve taşımayacak: blok içi sıra `Array.prototype.sort`'un kararlılığıyla korunur (C3), satıra ve parçaya yeni alan eklenmez (R7).
- **R1/4.** Cins karşılaştırması Türkçe küçük harfe indirilerek yapılır ve baştaki, sondaki boşluk yok sayılır, yani "RULMAN", "Rulman" ve " rulman " aynı bloktadır. Ekranda ve belgede parçanın kendi yazımı basılır, hiçbir değer değiştirilmez. Farklı yazılmış cinsler ("Rulmanlar") ayrı blok olur; bu bir veri girişi disiplinidir. Aynı katlama **öncelik listesinin satırlarına da** uygulanır: listeye "RULMAN" yazılması cinsi "rulman" olan parçaları da öne alır.
- **R1/5.** Hammadde tablosunda cins kesidin **üstündedir**: aynı kesidin iki parçası farklı cinslerdeyse araya başka kesitler girer. Bu bilinçli sonuçtur, isteğin kendisi budur (Takım Yöneticisi kararı, 2026-11-24); tersi X9'da.
- **R1/6.** Sıralama **dört yerde** uygulanır: pencerenin tedarikçi bölümündeki parça tablosu, pencerenin "Tedarikçi belirtilmemiş" kutusundaki parça tablosu ve belgenin üç grup tablosu (hammadde, "Malzemesi belirtilmemiş", hazır parçalar). **Ad tuzağı:** belgedeki "Malzemesi belirtilmemiş" **grubu** ile pencerenin "Tedarikçi belirtilmemiş" **kutusu** ayrı kavramlardır; ikisi de aynı parça tablosunu çizer ve ikisi de sıralanır. İşlemler tablosu ve motorun çizilmeyen düz listeleri (`parcalar`, `kesitler`, `kalemler`) dokunulmaz (X8).
- **R1/7.** Sıralama **koşulsuzdur**: her zaman çalışır, seçenek yalnız öncelik listesini taşır (varsayılan boş liste). Boş listede R1/2'nin (2) ve (3) kuralları işlediği için sıralamanın kendisi seçeneğe bağlanamaz. Bunun sonucu açıkça yazılı: "seçeneksiz çağrı spec öncesiyle birebir" güvencesi **yoktur**, eski kıyas altınlarını koruyan şey R5 (cinsi dolu parça yok) ile C3'ün kararlılığıdır.
- **R1/8.** Blok kimliği ile sıralama anahtarı aynıdır: ikisi de kırpılmış ve Türkçe küçük harfe indirilmiş değerdir, alfabetik karşılaştırma `localeCompare(…, "tr")` ile o anahtar üzerinde yapılır, eşitlikte kararlılık karar verir. Ham yazım üzerinde karşılaştırma yapılmaz, yoksa aynı bloğun iki satırı ayrı yerlere düşebilir.
- **R1/9.** Belgede sıralama **grubun satır listesinde**, grup sıralamasının hemen ardından ve tutar kurucusundan (`belgeTutarlariKur`), sütun kararından (`g.sutunlar`) ve üst hiza kararından önce uygulanır; bölümün düz satır listesi yine gruplardan türer (`siparisIhtiyaci.js:664` zinciri). Düz listeye uygulanması yasaktır: gruplar birbirine girer ve R4 çiğnenir.
- **R2.** Sipariş **penceresi** ve **belgesi** aynı sıralama **kuralını** kullanır: bir tablonun içindeki dolu cins bloklarının sırası ikisinde de aynıdır. Satır satır eşitlik beklenmez ve ölçülmez, çünkü ikisi yapısal olarak farklıdır: belge bir tedarikçi bölümünü hammadde grubu başına tabloya böler (0147), pencere tek tabloda malzemeli ve hazır parçaları birlikte yazar; bölüm üyeliği farklıdır (pencerede Ana tedarikçi, belgede malzemenin firması, 0142 triyajının "belgede başka bölümde" ibaresi bunun içindir); belge kapalı ve hatalı satırı hiç basmaz. Bugün pencere hiç sıralamıyor, belge grup içinde kendi ölçütlerini uyguluyor.
- **R2/2.** Pencerede cinsi boş malzemeli parçalar tablonun altına iner, çünkü pencere tek tabloda hazır ve malzemeli parçaları birlikte yazıyor. Bu kabul edilen sonuçtur, bir kayıp değildir (ikisi bugün de aynı tablodadır); pencerede hazır ile malzemeli ayrımı yapmak X9'da.
- **R3.** Blok sırasının öncelik listesi bir **uygulama ayarıdır**: Ayarlar'da sıralı bir cins listesi tutulur, satır eklenir, çıkarılır ve sırası değiştirilir. Alan `appSettings.cinsSirasi`, **düz dizidir** (0091'in `uretimdeOlmayanModeller` emsali: sıralı, basit ve boşalma kuralı orada kurulu); boşalınca değeri `undefined` yazılır, anahtar silinmez (C5).
- **R3/2.** Liste boş olabilir. Boş listede R1/2'nin (2) ve (3) kuralları işler: cinsi dolu parçalar alfabetik bloklanır, cinsi boş olanlar en sonda kalır.
- **R3/3.** Listeye katalogda bulunmayan bir cins yazılabilir (ileride girilecek cins önceden sıralanabilir); etkisizdir, hata vermez. Boş ya da yalnız boşluktan oluşan satır kaydedilmez. Yinelenen cins (yalnız büyük küçük harf farkı dahil) tek satır olarak tutulur.
- **R3/4.** Ayar yalnız sipariş listesinin sırasını etkiler. Maliyet, satış fiyatı, sipariş adedi, stok, arama, Excel, pano, genel arama ve yazdırılan öteki belgeler ayarı okumaz.
- **R3/5.** Satırın sırası **yukarı ve aşağı düğmeleriyle** değiştirilir, her düğme erişilebilir adını taşır. Sürükle bırak yazılmaz: uygulamada yalnız panoda var, hem erişilebilirliği hem testi zordur.
- **R3/6.** Liste en çok **100 satır**, satır en çok **100 karakter** tutar (giriş kuralı; 0135'in yirmi kalem emsali). Okuma kırpmaz: saklı uzun liste olduğu gibi işler.
- **R3/7.** Panel Ayarlar › Uygulama grubunda, kimliği `cinssira`, adı "Cins Sıralaması", kilidi `AYAR_KILITLI.cinssira`.
- **R3/8.** Ayar değişince, ya da sunucudan yeniden yüklenince, açık sipariş penceresinin sırası güncellenir: öncelik listesi pencerenin motor çağrısının bağımlılıklarına girer (`SiparisPenceresi.jsx:75`'in bugünkü bağımlılık dizisinde `appSettings` yok). İzlenen şey nesnenin kimliği değil türetilmiş listedir (0133'ün triyaj dersi).
- **R4.** Belgenin bugünkü düzeni korunur: tablo başlıkları (hammadde adı, "Malzemesi belirtilmemiş", "Hazır parçalar"), tablo sırası ve sütunları 0147 ile aynı kalır; cins sıralaması **tabloların içinde** uygulanır (Takım Yöneticisi kararı, 2026-11-24).
- **R5.** Hiçbir parçanın cinsi dolu değilse pencere ve belge sırası spec öncesiyle **birebir aynı** kalır.
- **R6.** Cins bloğu için başlık ya da ayraç satırı yazılmaz: belge satırı Cins sütununu (0158), pencere satırı cins bilgisini bugün zaten yazıyor.
- **R7.** Parçaya yeni alan eklenmez; sıralama hiçbir kaydın içeriğini değiştirmez.
- **R8.** Kapalı ("Sipariş etme" işaretli) ve hatalı adetli satırların bugünkü davranışı değişmez; sıralama onlara da aynı kuralla uygulanır.

---

## Constraints

### Uyulması zorunlu

- **C1.** Sıralama kuralı **tek yardımcıdadır** ve onu **motor** iki yerde çağırır (pencerenin bölüm listesi ve belgenin grup listesi); bileşenler sıralamaz ve kendi cins karşılaştırmasını yazmaz. İki sırayı da bugün motor kuruyor, yani "pencere ve belge çağırır" ifadesi C2'nin saf motor kuralına aykırı olurdu.
- **C2.** Saf motor ayarı kendisi okumaz: sıralı liste motora **seçenek olarak** gelir (`secenek.cinsSirasi`, varsayılan boş liste) ve ayarın **tek okuma yolu** `cinsSirasiOf(appSettings)` yardımcısıdır (0092'nin hatırlatma eşiği ve 0133'ün fiyat ayarları deseni). Yardımcının ve sıralama fonksiyonunun evi `lib/siparisIhtiyaci.js`'tir ve ikisi oradan dışa verilir; motor `trLower`'ı zaten içe alıyor (`:12`).
- **C2/2.** Yardımcının evi serbest değil, üç tarama onu belirliyor: 0160 AC-38 `lib/parcaBilgi.js`'e **hiçbir import** sokulmamasını sınıyor (Türkçe katlama `trLower` ister, yani alan listesinin yanına yazılamaz), 0158 AC-79 `siparisIhtiyaci.js`'te `PARCA_BILGI_ALANLARI` sayısını iki ve `parcaBilgisi(` sayısını bir olarak sabitliyor, 0160 AC-62 `parcaBilgisi` adının `src` altında yalnız sipariş motorunda geçmesini istiyor. Sıralama satırın kendi `cins` değerini okur, parça kaydını (`p.cins`) okumaz.
- **C3.** Sıralama **kararlıdır**: karşılaştırmanın eşit saydığı satırların bugünkü sırası korunur. R5 bu kuralın sonucudur. Eski kıyas altınlarını koruyan şey de budur, seçeneksizlik değil (R1/7): cinsi hiç dolu olmayan on altın (0135, 0138, 0139, 0140, 0141, 0142, 0143, 0144, 0147, 0150) ayıklama olmadan yeşil kalmalıdır (0159 P11 ile çıktı).
- **C4.** Cins yalnız bilgidir: 0158 R3'ün çapraz ölçümü korunur. Sıralama hiçbir tutarı, adedi, kilogramı ya da toplamı değiştirmez; yalnız satır sırası değişir.
- **C5.** Yeni ayar alanının zinciri eksiksiz kurulur: dört nokta veritabanı kuralı (`SCHEMA_SQL` + `applyColumnMigrations` + `INSERT` + `SELECT`, boş liste gövdeye yazılmaz), sunucunun ayar alanı eşlemesi (`AYAR_ALAN_SEKMELERI`), `App` yükleme yolunda alanın **açıkça** alınması (0091 R24/4 dersi: boşalan liste `undefined` yazılır, anahtar silinmez; yoksa bellekteki bayat liste geri yazılır ve Ayarlar sekmesi olmayan kullanıcının her kaydı 403 alır), ayar panelinin kilidi ve yedek paketindeki yeri. Veritabanı ölçümü iki Electron betiğinde birlikte yapılır: `db-roundtrip.cjs` (gidiş dönüş, boş liste gövdede yok) ve `db-clean-install.cjs` (temiz kurulumda sütun var ve yazıldı; 0133 emsali ikisinde de sınanıyor, `db-clean-install.cjs:298` ve `db-roundtrip.cjs:1082`). Yedek tarafına **not eklenmez**: `appSettings` bütün nesne olarak "Firma ve ayarlar" paketinde taşınıyor ve 0133 de not eklememişti, yani AC-23 kendiliğinden geçer.
- **C6.** Yeni eylem izni **yoktur**: ayar, Ayarlar sekmesi olan kullanıcının işidir (0133 C7/2 emsali) ve bu açıkça yazılır. **Bilinen sınır:** Ayarlar bölümleri daha önce özelleştirilmiş kısıtlı kullanıcı yeni paneli, admin kutuyu işaretleyip kaydedene kadar görmez (`Settings.jsx:92`'nin `clientVisible` süzgeci; 0098'in kabul edilen gerilemesiyle aynı sınıf).
- **C7.** Sürüm notu gerekir: yeni ayar bir `app_settings` sütunudur, yani **önce sunucu PC** güncellenir. Güncellenmemiş sunucu alanı tanımaz ve kaydetmez, güncellenmemiş istemci de sıralamayı uygulamaz; güncelleme bitene kadar liste girilmez. Sonucu ekranda görünmez: güncellenmiş istemci güncellenmemiş sunucuya bağlıyken kullanıcı listeyi girer ve liste her kayıtta **sessizce** düşer. Ekranda uyarı yazmak kapsam dışıdır.
- **C8.** Pencerenin ve belgenin bugünkü test kimlikleri (`siparis-hazir-tablosu`, `siparis-hazir-satiri`, `siparis-parca-bilgi`, belgenin `data-islemler` ve toplam işaretleri) korunur.
- **C9.** Yeni ayar alanı deponun "yeni ayar alanı yok" bekçisini **on test dosyasında** kırar: `tests/fixtures/0133-yeni-ayar.js` `AYAR_ALAN_SEKMELERI`'nden yalnız `fiyatAyarlari`'nı ayıklıyor ve onu 0093, 0094, 0095, 0096, 0097, 0098, 0107, 0108, 0109 ve 0138 testleri kullanıyor. Zincir 0132 ve 0133'te kurulduğu gibi uzatılır: `tests/fixtures/0161-yeni-ayar.js` `yeniAlanlariAyikla`'yı çağırıp yeni anahtarı da düşer, on dosyanın içe alması güncellenir ve aynı iddia ("başka hiçbir değişiklik bu listelere girmedi") sürer.
- **C10.** Yeni Ayarlar paneli `tasarim.jsx`'i kullanacağı için `docs/evidence/kanit-eslemesi.json`'a kaydı yazılır (emsal: `settings/SettingsFiyat.jsx` iki ekranla kayıtlı); kayıt olmadan `tasarim-kaynak.test.js` düşer, kanıt üretilse de.
- **C11.** C1'in taraması **karşılaştırma** arar, gösterimi yasaklamaz: pencere cinsi `BilgiSatiri`'nde (`SiparisPenceresi.jsx:48`) ve belge `HUCRE.Cins`'te bugün zaten yazıyor. Ölçüt "ekran dosyasında ikinci bir cins kuralı yazılmadı" (katlayıcı ya da `localeCompare` ile `cins` aynı ifadede, `sort(` içinde `cins`), "alan okunmadı" değil.

### KAPSAM DIŞI

- **X1.** Belgenin cins başlıklı tablolara dönmesi (tablo başlığı "Rulman", "Cıvata") — *neden:* 0147'nin hammadde gruplaması bir parçayı iki boyutta birden gruplayamaz; hangi hammaddeden ne kadar alınacağı ayrımı belgeden giderdi (Takım Yöneticisi kararı, 2026-11-24).
- **X2.** Parça kataloğu listesi, Parça Stoğu listesi ve arama kutularının sırası — *neden:* istek sipariş listesiydi; o listelerde arama ve süzgeç var, sıra adla kurulu.
- **X3.** Cinsin serbest metin olmaktan çıkıp tanım listesine (seçmeli) dönmesi — *neden:* ayrı ve belirgin biçimde daha büyük bir iş (yeni veri bölümü, göç, parça kartı); bugünkü iki dolu kayıt da serbest metinle yazıldı. İstenirse ayrı spec'te ele alınır ve bu spec'in öncelik listesi o işte tanım sırasına dönüşebilir.
- **X4.** Cinsin parça tipi tanımlarıyla (`tip`: Standart, Kalıp Revize, renkli rozet, kalıp işi bayrağı) birleştirilmesi — *neden:* tip eski ve ayrı bir sınıflamadır, davranış bayrakları taşır; cins onun yerine geçmez.
- **X5.** Pencerede ve belgede cins sütununun ya da bilgi satırının değişmesi — *neden:* ikisi de cinsi bugün yazıyor, blokların okunması için yeterli.
- **X6.** Cins verisinin girilmesi (bugün 435 parçanın 2'sinde dolu) — *neden:* veri girişi işidir; bu spec alanlar doldukça çalışan sırayı kurar.
- **X7.** Sipariş listesinin öteki sıraları (tedarikçi bölümlerinin sırası, hammadde tablolarının sırası, kesit sırası) — *neden:* istek parçaların sırasıydı; bölüm ve tablo sırası 0140 ve 0147'de kuruldu.
- **X8.** İşlemler tablosunun sırası ve motorun çizilmeyen düz listeleri (`parcalar`, `kesitler`, `kalemler`) — *neden:* işlemler tablosunun sırası işlem adına göre bloklu (`siparisIhtiyaci.js:448`), cins oraya ikinci bir boyut sokar; çizilmeyen listeyi sıralamak yalnız kıyas altınlarını kırar.
- **X9.** Pencerede hazır ile malzemeli parçanın ayrılması ve hammadde tablosunda kesidin cinsten önce gelmesi — *neden:* ikisi de bu işin kararlarının tersidir (R2/2, R1/5); pencereye belgenin grup yapısını taşımak ayrı ve belirgin biçimde daha büyük bir iştir.

---

## Context

Ölçümler 2026-11-24'te bu depo ve canlı veritabanı üzerinde yapıldı.

**Bugünkü sıra iki yerde farklı.** Pencerede hazır parça satırları hiç sıralanmıyor, kalem döngüsünün ekleme sırasıyla (modelin kit sırası) tedarikçi bölümüne yazılıyor (`siparisIhtiyaci.js:507`). Belgede 0147'den beri tedarikçi bölümü grup başına tabloya bölünüyor ve grup sırası tür sonra başlıktır (`:655`, `:662`); grup **içindeki** sıra hammadde tablosunda kesit sonra ad, öteki iki tabloda `kitSira`'dır (`:664`). `kitSira` kalem döngüsünde veriliyor (`:594`).

**Rulman hangi tabloya düşer.** Satın alınan parçanın malzeme kalemi olmadığı için grubu "Hazır parçalar"dır (`:600`); yani istek esas olarak o tabloyu ve pencerenin listesini etkiler. Malzemeli bir parçanın cinsi doluysa kendi hammadde tablosunun içinde bloklanır (R1/3).

**Cins alanı ve doluluğu.** Alan 0158 ile geldi (`lib/parcaBilgi.js`, `PARCA_BILGI_ALANLARI`: `olcu`, `hammaddeAdi`, `cins`). Canlı veritabanında 435 canlı parçanın **yalnız 2'sinde cins dolu** ("İmbus" ve bir deneme kaydı), yani bu iş bugün hiçbir sırayı değiştirmez ve alanlar doldukça işler (X6). QA turunda bu rakam **doğrulanamadı**: `~/Library/Application Support/Altunmak CRM/data.db` şifreli (`sqlite3` ile `file is not a database (26)`) ve yalnız uygulamanın içinden okunur, yani rakam kullanıcı beyanıdır (ölçüm 2026-11-24). Cins serbest metindir, bu yüzden karşılaştırma küçük harfe indirilir (R1/4). **Ad tuzağı:** parçanın `tip` alanı (parça tipi tanımları) ve tedarikçinin `hammadde` bayrağı başka kavramlardır (0158 C3/2, C4).

**Cins ekranda ve belgede bugün görünüyor.** Pencerenin parça satırı hammadde ve cinsi adın altında yazıyor (`stock/SiparisPenceresi.jsx:48`, `data-testid="siparis-parca-bilgi"`); belgenin parça tablosunda Cins kendi sütunudur ve o tabloda hiç dolu değilse sütun çizilmez (0158 `BELGE_SUTUNLARI.parca`, `g.sutunlar`). Bu yüzden blok başlığı gerekmez (R6).

**Motor ayarı bugün almıyor, ama zinciri hazır.** `siparisIhtiyaci(veri, secenek)` çağrısı pencereden yapılıyor (`SiparisPenceresi.jsx:75`) ve `veri` bugün `modeller, satirlar, parts, hamParts, partStock, malzemeler, tedarikciler, hamTedarikciler` taşıyor. Pencere `appSettings`'i zaten alıyor ve 0091'in üretim işareti için kullanıyor (`:81`, `uretimdeSuzulmusModeller(appSettings, ...)`), yani ayarı motora taşımak tek satırlık bir ekleme olur. Belge motorun çıktısından kuruluyor (0144, 0147), yani sıra motorda kurulunca belgeye kendiliğinden iner (R2).

**Yeni ayar alanının emsali 0133.** `appSettings.fiyatAyarlari` zinciri şöyle kurulu: `db.cjs` `app_settings` sütunu (`:356`), `APP_SETTINGS_FIYAT_COLUMN` (`:606`), INSERT'te boş nesne `null` yazılır (`:1112`), okumada koşullu gövdeye girer (`:1783`), `serverAuth.cjs:172` `AYAR_ALAN_SEKMELERI.fiyatAyarlari = ["settings"]` ("eylem izni yok" yorumuyla), `App.jsx:1262` yükleme yolunda alan **açıkça** alınıyor. Panel Ayarlar › Uygulama'da ve kendi kilidini taşıyor. Aynı zincir bu işte de kurulur (C5); **önerim panelin yeri Ayarlar › Uygulama**, çünkü ayar uygulama geneli bir tercihtir ve Katalog grubundaki paneller kayıt listeleridir.

**Etkilenecek altınlar ve testler (QA turunda ölçüldü, önceki tahmin düzeltildi).** Kıyas verilerinde cins yalnız `tests/fixtures/0158-dolu.js`'in bir parçasında dolu ("Cıvata M8", id 4, `cins: "DIN 933"`, Ana tedarikçisi 22). O parça belgenin hazır parçalar tablosunda **zaten ilk sırada**: motor koşturulduğunda tedarikçi 22'nin hazır grubu `4, 5, 8`, çözülemeyen grubu `14`, yani **belge tarafı hiç değişmiyor**. Değişen pencere tarafı: aynı tedarikçinin listesi bugün `1, 4, 5, 8, 14`, yeni kuralla `4, 1, 5, 8, 14`. Kırılan tek altın bu yüzden `tests/ui/doviz-parca-0157-kiyas.test.jsx`'tir (spec'in önceki yazımı dosya adını `doviz-parca-0157.test.jsx` diye veriyordu), çünkü altını bütün motor sonucunu (`siparis: s`) serileştiriyor ve pencerenin bölüm listesi onun içindedir; `tests/fixtures/0157-veri.js` 0158'in dolu verisinden türüyor. 0158'in beş dosyası **dokunulmaz**: kıyası `tests/fixtures/0158-veri.js` ile çalışıyor (cins boş, dokunulmamış profil) ve öteki üç dosya satırı `.find()` ile buluyor, yani sıraya duyarsız. Cinsi hiç dolu olmayan on bir kıyas altını (0135, 0138, 0139, 0140, 0141, 0142, 0143, 0144, 0147, 0150, 0159) C3 gereği **dokunulmadan** yeşil kalmalıdır; kalmazsa sıralama kararlı değildir (AC-33).

**0160 ile ilişki.** 0160 aynı alanı arama ve sonuç satırı için kullanır, bu iş sıralama ve yeni bir ayar getirir. 0160 **tamamlandı** (commit `b2a2819b`, kapanış `cacceb92`, `specs/done` altında); ayrı spec kararı yerinde kaldı (Takım Yöneticisi, 2026-11-24). Ortak yer `lib/parcaBilgi.js`'in alan tanımıdır ve 0160 oraya iki tarama bıraktı: dosyaya import sokulamaz (0160 AC-38) ve `parcaBilgisi` adı `src` altında yalnız sipariş motorunda geçebilir (0160 AC-62). İkisi bu işin kısıtıdır (C2/2).

### QA turunda ölçülenler (2026-11-24)

Bütün ölçümler `cacceb92` üzerinde yapıldı. Motor ölçümleri (B, C, D) `tests/fixtures/0158-dolu.js` verisiyle motoru koşturarak alındı.

| | Ölçüm | Sonuç |
|---|---|---|
| A | Spec'in bütün satır atıfları | Doğru: `siparisIhtiyaci.js:448`, `:507`, `:594`, `:600`, `:655`, `:662`, `:664`; `SiparisPenceresi.jsx:48`, `:75`, `:81`; `db.cjs:356`, `:606`, `:1112`, `:1783`; `serverAuth.cjs:172`; `App.jsx:1262` |
| B | Pencerede tedarikçi 22'nin bugünkü listesi | `1:100_AYNA…`, `4:Cıvata M8(DIN 933)`, `5:Rulman`, `8:Fason parça`, `14:Malzemesiz` |
| C | Belgede tedarikçi 22'nin bugünkü grupları | Çözülemeyen `14`; hazır `4, 5, 8`, yani cinsi dolu parça zaten ilk |
| D | Belgenin grup başına sütun kararı | Cins sütunu yalnız 22'nin hazır grubunda çizilir (`cins: true`), öteki gruplarda hiç |
| E | Kıyas fikstürlerinde `cins:` | Yalnız `0158-dolu.js` ve `0160-veri.js`; `0158-veri.js`'te sözcük yalnız yorumda |
| F | `0157-veri.js`'in kaynağı | `0158-dolu.js`'i içe alıyor, yani 0157'nin kıyası dolu cinsi görüyor |
| G | 0157 kıyasının altını | Bütün motor sonucunu serileştiriyor (`siparis: s`), pencerenin bölüm listesi içinde |
| H | 0158 kıyasının altını | Pencere HTML'i `PENCERE_VERI()` ile `0158-veri.js`'ten (cins boş); `adetli` belge sırasından |
| I | Öteki üç 0158 dosyası | Satırı `.find()` ile buluyor, sıraya duyarsız |
| J | `0133-yeni-ayar.js`'i kullanan test | On dosya: 0093, 0094, 0095, 0096, 0097, 0098, 0107, 0108, 0109, 0138 |
| K | `fiyatAyarlari`'nı sınayan veritabanı betikleri | İkisi: `db-clean-install.cjs:298` ve `db-roundtrip.cjs:1082` ile devamı |
| L | `AYAR_ALAN_SEKMELERI` | On üç alan; `fiyatAyarlari` `:172`'de, yorumunda "eylem izni yok" yazılı |
| M | `App.jsx:1262` yükleme satırı | İki alanı açıkça alıyor (`uretimdeOlmayanModeller`, `fiyatAyarlari`) |
| N | Ayarlar Uygulama grubu | Dört panel (`app`, `musteri`, `fiyat`, `servispano`); `allSettingIds` `SETTINGS_GROUPS`'tan türüyor ve hiçbir test sayı sabitlemiyor |
| O | Pencerenin motor çağrısının bağımlılıkları | `appSettings` dizide yok, yani ayar bayat okunur |
| P | İki giriş noktası | İkisi de `appSettings` geçiriyor (`Settings.jsx:296`, `Stock.jsx:81`) |
| Q | Motorun bilgi okuyucusu | `parcaBilgisi` değerleri `bilgiDegeri` ile kırpıyor, yani parça tarafı zaten kırpık |
| R | Motorun içe almaları | `siparisIhtiyaci.js:12` `trLower`'ı zaten alıyor |
| S | `parcaBilgi.js` | Hiçbir şey içe almıyor ve 0160 AC-38 bunu sınıyor |
| T | Kanıt eşlemesi | 96 dosya kaydı; `settings/SettingsFiyat.jsx` iki ekranla kayıtlı |
| U | Canlı veritabanı | Şifreli, okunamadı (`file is not a database (26)`) |
| V | Sipariş kanıt ekranlarının verisi | `0134-veri.js` ve `0142-veri.js`'te cins yok, yani bugünkü sipariş ekranları 0 piksel kalır |

### QA turunda verilen kararlar (2026-11-24)

**Bloklayıcı**

**B1. Pencere ile belge çapraz ölçümü.** R2 "aynı sıralama kuralı" olarak yazıldı, AC-11'in ölçümü bir tablonun içindeki blok sırasına indirildi — *neden:* satır satır eşitlik üç yapısal farkla imkânsız ve karşılanamayan kriter yalnız testi kilitler.
**B2. Pencerenin blok içi sırası.** R1/3'e pencerenin ekleme sırası ve `kitSira`'nın pencere satırında bulunmadığı yazıldı; koruma sort kararlılığı — *neden:* sort ES2019'dan beri kararlı, C3 kararlılık istiyor ve R7 yeni alanı yasaklıyor.
**B3. Sıralama koşulsuzdur.** R1/7 yazıldı: seçenek yalnız listeyi taşır, "seçeneksiz çağrı birebir" güvencesi yok — *neden:* R3/2 boş listede de bloklama istiyor, yani sıralama seçeneğe bağlanamaz.
**B4. Ayarın adı, şekli ve yardımcının evi.** `appSettings.cinsSirasi` düz dizi, yardımcı `cinsSirasiOf` ve sıralama `lib/siparisIhtiyaci.js`'te (R3, C2, C2/2) — *neden:* üç tarama başka evi kapatıyor ve motor `trLower`'ı zaten alıyor.

**Önemli**

**Ö1. Sıralanan dört yer ve ad tuzağı.** R1/6 yazıldı; işlemler tablosu ve çizilmeyen düz listeler X8'e — *neden:* belgedeki "Malzemesi belirtilmemiş" grubu ile pencerenin "Tedarikçi belirtilmemiş" kutusu ayrı kavramlar ve ikisi de sıralanmalı.
**Ö2. C1'in ifadesi mimariye aykırıydı.** C1 "motor iki yerde çağırır, bileşen sıralamaz" olarak yazıldı — *neden:* iki sırayı da motor kuruyor, C2 bileşenin hesap yazmasını yasaklıyor.
**Ö3. Taramanın ölçütü.** C11 yazıldı: tarama karşılaştırma arar, gösterim serbest — *neden:* pencere ve belge cinsi bugün zaten yazıyor, düz alan yasağı kendi ekranını düşürürdü.
**Ö4. Karşılaştırmanın anahtarı.** R1/8 yazıldı: blok kimliği ile sıralama anahtarı aynı, katlanmış değer üzerinde — *neden:* ham yazımla karşılaştırma aynı bloğun iki satırını ayrı yerlere düşürebilir.
**Ö5. Belgede uygulama noktası.** R1/9 yazıldı: grubun satır listesinde, tutar kurucusundan önce — *neden:* düz listeye uygulanırsa gruplar birbirine girer ve R4 çiğnenir.
**Ö6. Ayarın bayat okunması.** R3/8 yazıldı: öncelik listesi pencerenin motor çağrısının bağımlılıklarına girer — *neden:* bugünkü dizide `appSettings` yok, ayar değişince sıra güncellenmezdi.
**Ö7. Panelde sıra değiştirme biçimi.** R3/5 yazıldı: yukarı ve aşağı düğmeleri — *neden:* uygulamada sürükle bırak yalnız panoda var, düğme hem erişilebilir hem ölçülebilir.
**Ö8. On dosyanın ayar bekçisi.** C9 yazıldı: `0161-yeni-ayar.js` zinciri ve on dosyanın güncellenmesi — *neden:* zincir 0132 ve 0133'te böyle kuruldu, yoksa `npm test` kırmızı doğar.
**Ö9. Panelin kanıt eşlemesi.** C10 yazıldı — *neden:* kayıt olmadan `tasarim-kaynak.test.js` düşer, kanıt üretilse de.
**Ö10. Etkilenecek altınların listesi düzeltildi.** Yalnız 0157'nin kıyası yenilenir, 0158'in beş dosyası dokunulmaz (Context ve AC-34) — *neden:* ölçüm belge tarafının değişmediğini gösterdi; yanlış tahmin gereksiz altın yenilemesine ve gerçek regresyonun gizlenmesine yol açardı.
**Ö11. Pencerede malzemeli parçaların yeri.** R2/2 yazıldı: cinsi boş malzemeli parça tablonun altına iner, kabul edilir — *neden:* ikisi bugün de aynı tabloda, yani bu bir kayıp değil sıra değişimi.
**Ö12. Hammadde tablosunda cins kesidin üstünde.** R1/5 yazıldı, tersi X9'a — *neden:* isteğin kendisi bu, ama tablonun okunma biçimini değiştirdiği için karar olarak kayda geçti.
**Ö13. Altınların korunması kriterleşti.** AC-33 yazıldı: on bir altın ayıklama olmadan yeşil — *neden:* kararlılığın tek gerçek ölçümü bu, kriter olmadan ilk kırılmada altın yenilenip sessizce geçilir.

**Küçük**

**K1. AC-6 ikiye ayrıldı.** Kırpma ölçümü ayarın satırında, parça tarafı 0158'in tek yazıcısına atıfla (AC-6, AC-50) — *neden:* motor değeri `bilgiDegeri` ile zaten kırpıyor.
**K2. Liste sınırları.** R3/6: en çok 100 satır, satır en çok 100 karakter, okuma kırpmaz — *neden:* 0135'in yirmi kalem emsali; sınırsız liste giriş hatasını kalıcılaştırır.
**K3. Panel kimliği ve adı.** R3/7: `cinssira`, "Cins Sıralaması", `AYAR_KILITLI.cinssira` — *neden:* kimlik hem menüyü hem kilidi hem izin kutusunu belirliyor.
**K4. İki veritabanı betiği.** C5'e `db-clean-install.cjs` de yazıldı — *neden:* 0133 emsali sütunu iki betikte birlikte sınıyor.
**K5. Yedek notu eklenmez.** C5'e yazıldı — *neden:* `appSettings` bütün nesne olarak taşınıyor ve 0133 de not eklememişti.
**K6. 0160'ın durumu.** Bağımlı spec'ler satırı ve Context güncellendi — *neden:* 0160 bugün uygulandı ve `specs/done`'a taşındı; iki taraması bu işin kısıtı.
**K7. Canlı veri ölçümü.** Context'e yöntem ve "kullanıcı beyanı" niteliği yazıldı — *neden:* veritabanı şifreli, rakam bu turda doğrulanamadı.
**K8. Özelleştirilmiş kullanıcı paneli görmez.** C6'ya bilinen sınır olarak yazıldı — *neden:* 0098'de kabul edilmiş gerilemeyle aynı sınıf.
**K9. Öncelik listesi de katlanır.** R1/4'e açıkça yazıldı — *neden:* örtük kalırsa "RULMAN" yazan kullanıcı listesinin işlemediğini sanır.
**K10. Karışık sürümde sessiz kayıp.** C7'ye yazıldı — *neden:* kullanıcı listeyi girip kaybettiğini fark etmez, sürüm notu bunu söylemeli.
**K11. Etkilenen alanlar genişletildi.** Panel dosyası, kanıt eşlemesi, bağımlılık dizisi ve bekçi zinciri eklendi — *neden:* işin dört parçası başlıkta görünmüyordu.

### QA turu karar kaydı (2026-11-24)

| # | Bulgu | Derece | İşlendiği yer |
|---|---|---|---|
| B1 | Pencere ile belge çapraz ölçümü | Bloklayıcı | R2, AC-11 |
| B2 | Pencerenin blok içi sırası ve `kitSira` | Bloklayıcı | R1/3, AC-31 |
| B3 | Sıralama koşulsuz, seçenek yalnız liste | Bloklayıcı | R1/7, C2, C3, AC-32 |
| B4 | Ayarın adı, şekli ve yardımcının evi | Bloklayıcı | R3, C2, C2/2, AC-54, AC-55 |
| Ö1 | Sıralanan dört yer ve ad tuzağı | Önemli | R1/6, X8, AC-35, AC-36 |
| Ö2 | C1'in ifadesi mimariye aykırı | Önemli | C1, AC-48 |
| Ö3 | Taramanın ölçütü karşılaştırmadır | Önemli | C11, AC-49 |
| Ö4 | Karşılaştırmanın anahtarı | Önemli | R1/8, AC-40 |
| Ö5 | Belgede uygulama noktası | Önemli | R1/9, AC-37 |
| Ö6 | Ayarın bayat okunması | Önemli | R3/8, AC-41 |
| Ö7 | Panelde sıra değiştirme biçimi | Önemli | R3/5, AC-42 |
| Ö8 | On dosyanın ayar bekçisi | Önemli | C9, AC-46 |
| Ö9 | Panelin kanıt eşlemesi | Önemli | C10, AC-47 |
| Ö10 | Etkilenecek altınların listesi | Önemli | Context, AC-34 |
| Ö11 | Pencerede malzemeli parçaların yeri | Önemli | R2/2, X9, AC-39 |
| Ö12 | Hammadde tablosunda cins kesidin üstünde | Önemli | R1/5, X9, AC-38 |
| Ö13 | Altınların korunması kriterleşti | Önemli | C3, AC-33 |
| K1 | AC-6 ikiye ayrıldı | Küçük | AC-6, AC-50 |
| K2 | Liste sınırları | Küçük | R3/6, AC-43 |
| K3 | Panel kimliği ve adı | Küçük | R3/7, AC-44 |
| K4 | İki veritabanı betiği | Küçük | C5, AC-45 |
| K5 | Yedek notu eklenmez | Küçük | C5, DoD |
| K6 | 0160'ın durumu | Küçük | Başlık, Context |
| K7 | Canlı veri ölçümü | Küçük | Context |
| K8 | Özelleştirilmiş kullanıcı paneli görmez | Küçük | C6, AC-51 |
| K9 | Öncelik listesi de katlanır | Küçük | R1/4, AC-52 |
| K10 | Karışık sürümde sessiz kayıp | Küçük | C7, AC-53 |
| K11 | Etkilenen alanlar genişletildi | Küçük | Başlık tablosu |


### Plan turunda verilen kararlar (2026-11-24)

Takım Yöneticisi planın bütün önerilerini onayladı ("tum onerilerini onayliyorum, spece isle, plani yaz ve uygula"). Plan `specs/0161-uygulama-plani.md`.

- **P1 (spec'in kaçırdığı kanıt ekranı).** Ölçüm V'nin aksine `siparis-0158-pencere` ekranı `0158-dolu.js` ile çiziliyor ve orada id 4'ün cinsi dolu; pencere sırası `1,4,5,8,14`'ten `4,1,5,8,14`'e döner. Ekran onaylı `degisti` kaydıyla işlenir — *neden:* bilinçli değişim, ölçülmezse kapanışta kanıt testi düşer.
- **P2 (AC-53'ün ölçümü).** Gerçek eski sunucu koşturulamaz. İki parça: `serverAuth`'ta alan haritadan çıkarılmış hâl (eski sunucu) `AYAR_VARSAYILAN_SEKMELER`'e (`settings`) düşer, Ayarlar sekmesi olan kullanıcı 403 almaz ve başka alan etkilenmez; "liste düşer" yarısı `db.cjs` INSERT'inin sütunları tek tek sayması ve App yükleme yolunun alanı açıkça okuması üzerinden kaynak taramasıyla.
- **P3 (AC-11'in çapraz ölçümü).** Aynı veride pencerenin `hazirParcalar` listesi ile belgenin aynı tedarikçideki hazır grubunun ortak parçaları üzerinden dolu cins bloklarının sırası (katlanmış anahtar dizisi, ardışık tekrarlar birleştirilmiş) karşılaştırılır.
- **P4 (yardımcıların evi).** `cinsSirasiOf`, `cinsSirasiDogrula`, `cinseGoreSirala` `lib/siparisIhtiyaci.js`'te; panel onu içe alır.
- **P5 (liste sınırı).** Panel 100. satırdan sonra "Ekle"yi pasif yapar ve nedenini yazar, 100 karakterden uzun satır "Ekle"de reddedilir; doğrulayıcı aynı kuralı "Kaydet"te bir kez daha uygular.
- **P6 (taslak ve "Kaydet").** Panel yerel taslak tutar, tek "Kaydet" ile yazar (SettingsFiyat emsali) — *neden:* her tıklamada yazım ayrı sunucu kaydı üretirdi.
- **P7 (AC-51).** `Settings.jsx`'in `clientVisible` süzgeci özelleştirilmiş izinli kullanıcıyla gerçek `Settings` çizimiyle ölçülür.
- **P8 (satırın cinsi).** Sıralama yalnız satırın kırpılmış `cins` değerini okur; parça kaydına (`p.cins`) bakan ifade taramayla yasak.
- **P9 (kıyas verisi).** `tests/fixtures/0161-veri.js` 0158'in dolu verisinden türer; cinssiz hâlinin spec öncesi çıktısı `0161-once.json` (AC-9).
- **P10 (sürüm notu).** Önce sunucu PC, güncelleme bitene kadar liste girilmez (C7); plan §5.
- **P11 (uygulamada ölçüldü: 0159 kıyası da cinsi dolu veriyi görüyor).** C3 ve AC-33'ün "cinsi dolu olmayan on bir altın" listesindeki 0159, verisini 0157 üzerinden 0158'in dolu verisinden alıyor (`0159-veri.js` → `0157-veri.js` → `0158-dolu.js`); pencerenin sırası orada da değişti. İki altın (0157, 0159) **yenilenmedi**: eski altına yeni kural (öncelik listesi boş) uygulanarak karşılaştırılır (`tests/fixtures/0161-ayikla.js` `cinsSirasiUygula`), yani tek bilinçli fark pencerenin satır sırasıdır, satır içeriği ve belge birebir kalır. AC-34'ün "yalnız 0157'nin altını yenilenir" ifadesi bu daha dar yolla karşılandı; kalan on altın ayıklamasız yeşil.
- **P12 (uygulamada ölçüldü: bekçi zinciri dokuz dosyada).** C9'un saydığı on dosyadan 0138 `0133-yeni-ayar.js`'i içe almıyor, yalnız içeriğini tarıyor; zincir dokuz dosyada `0161-yeni-ayar.js`'e çevrildi, 0138'in taraması dokunulmadan yeşil.
- **P13 (uygulamada ölçüldü: kanıt).** Ayarlar menüsünün Uygulama grubuna "Cins Sıralaması" satırı eklendiği için o grubu açık çizen dört Fiyat Ayarları ekranı da değişti (36.461 piksel, yalnız menü); kayıtları onaylı `degisti`. `siparis-0161-cinssiz` iki çekimde de yalnız açılır liste okunda 92–192 piksel gürültü verdi (satırlar ve sıra birebir; cinssiz veride sıra değişmediği AC-9 testiyle ölçülür), raporda durur, eşlemeye yazılmadı. Kilit ekranlarındaki "5 dakika önce / az önce" farkı çekim saatine bağlıdır. Kanıt aracı 170 ekranlık listede 10 dakika sınırına takıldı, iki parçada çekildi.

---

## Acceptance Criteria

- **AC-1.** Öncelik listesinde "Rulman" varken, cinsi Rulman olan parçalar hazır parçalar tablosunun başında ve ard arda listelenir.
- **AC-2.** Öncelik listesinde iki cins varken (Rulman, Keçe) bloklar listedeki sırayla gelir: Rulman bloğu Keçe bloğundan önce.
- **AC-3.** Öncelik listesinde olmayan dolu cinsler, öncelikli bloklardan sonra cins adına göre alfabetik sırayla gelir.
- **AC-4.** Cinsi boş parçalar en sonda yer alır ve aralarında bugünkü sırasını korur.
- **AC-5.** "RULMAN" ve "rulman" yazımlı parçalar aynı blokta toplanır; satırlarda her parçanın kendi yazımı görünür.
- **AC-6.** Başında ve sonunda boşluk olan cins değeri aynı bloğa girer; parça tarafında bu 0158'in tek yazıcısıyla zaten garantidir (motor değeri `bilgiDegeri` ile kırpıyor), ölçüm öncelik listesinin satırında yapılır (AC-50).
- **AC-7.** Blok içinde hazır parçalar bugünkü kit sırasını korur.
- **AC-8.** Hammadde tablosunda blok içinde bugünkü sıra (kesit sonra ad) korunur.
- **AC-9.** Hiçbir parçanın cinsi dolu olmadığı veride pencere ve belge sırası spec öncesiyle birebir aynıdır (kıyas).
- **AC-10.** Öncelik listesi boşken dolu cinsler alfabetik bloklanır ve cinsi boş olanlar sonda kalır.
- **AC-11.** Pencere ile belge bir tablonun içindeki dolu cins bloklarının sırasında aynıdır (iki kümenin kesişimi üzerinde çapraz ölçüm); satır satır eşitlik beklenmez ve ölçülmez (R2).
- **AC-12.** Belgenin tablo başlıkları, tablo sırası ve sütun kümesi 0147 ve 0158 ile aynı kalır.
- **AC-13.** Cins bloğu için belgede ve pencerede başlık ya da ayraç satırı basılmaz.
- **AC-14.** Ayarlar'daki listeye yeni bir cins eklenir, kaydedilir ve sipariş listesinde o blok başa geçer.
- **AC-15.** Listedeki bir satırın sırası değiştirilince blok sırası da aynı yönde değişir.
- **AC-16.** Listeden satır silinince o cins öncelik ayrıcalığını kaybeder ve alfabetik bloklara düşer.
- **AC-17.** Boş ya da yalnız boşluktan oluşan satır ayara yazılmaz.
- **AC-18.** Yinelenen cins (yalnız büyük küçük harf farkıyla yazılmış olanı dahil) ayarda tek satır olarak tutulur.
- **AC-19.** Katalogda bulunmayan bir cins listede durabilir; hata verilmez ve sıra etkilenmez.
- **AC-20.** Liste boşaltılınca kayda yazılmaz (alan gövdede hiç yoktur) ve bir sonraki yüklemede eski liste geri gelmez.
- **AC-21.** Ayar panelini başka kullanıcı açmışsa panel yerine kilit ekranı çizilir.
- **AC-22.** Ayarlar sekmesi olmayan kullanıcıya panel çizilmez ve o kullanıcının bu alanı yazma denemesi sunucuda reddedilir.
- **AC-23.** Yedekten geri yüklemede liste "Firma ve ayarlar" paketiyle gelir.
- **AC-24.** Sıralama hiçbir rakamı değiştirmez: aynı veride satır sırası dışında bütün tutarlar, adetler, kilogramlar ve toplamlar birebir aynıdır.
- **AC-25.** Maliyet, satış fiyatı, stok, arama ve Excel çıktıları değişmez (0158'in çapraz ölçümü korunur).
- **AC-26.** Kapalı ("Sipariş etme") ve hatalı adetli satırlar bugünkü davranışını korur ve aynı sıralama kuralına girer.
- **AC-27.** Sıralama kuralı tek yardımcıdadır ve onu motor çağırır; ekranlarda ikinci bir cins karşılaştırması yoktur (kaynak taraması, ölçütü C11'de).
- **AC-28.** Saf motor ayarı kendisi okumaz; sıralı liste `secenek.cinsSirasi` ile gelir ve ayarın tek okuma yolu `cinsSirasiOf`'tur (kaynak taraması).
- **AC-29.** Yeni eylem izni yoktur (kaynak taraması).
- **AC-30.** Veritabanı gidiş dönüşü: liste yazılır ve okunur; boş liste gövdeye yazılmaz.

### QA turu kriterleri (2026-11-24)

- **AC-31.** Pencerede blok içinde bugünkü ekleme (kit) sırası korunur ve pencere satırı `kitSira` alanı taşımaz.
- **AC-32.** Öncelik listesi boşken de sıralama çalışır: dolu cinsler alfabetik bloklanır, yani sıralama seçeneğe bağlı değildir.
- **AC-33.** Cinsi hiç dolu olmayan on kıyas altını (0135, 0138, 0139, 0140, 0141, 0142, 0143, 0144, 0147, 0150) ayıklama olmadan yeşil kalır (triyaj: 0159 P11 ile bu listeden çıktı, AC-34'e taşındı).
- **AC-34.** Cinsi dolu veriden türeyen iki kıyas (`tests/ui/doviz-parca-0157-kiyas.test.jsx` ve `tests/alim-kalemi-0159-kiyas.test.js`) altınlarını yenilemez: eski altına yeni kural (öncelik listesi boş) uygulanarak karşılaştırılır (`tests/fixtures/0161-ayikla.js`, P11), gerekçesi test yorumunda "spec 0161 ile" notuyla yazılır; 0158'in beş dosyası dokunulmaz (triyaj düzeltmesi).
- **AC-35.** İşlemler tablosunun sırası ve motorun çizilmeyen düz listeleri (`parcalar`, `kesitler`, `kalemler`) sıralanmaz.
- **AC-36.** Pencerenin "Tedarikçi belirtilmemiş" kutusundaki parça tablosu da cinse göre bloklanır.
- **AC-37.** Belgede sıralama grubun içinde uygulanır: bölümün düz satır listesi gruplardan türer, tutarlar, sütun kümesi ve üst hiza kararı sıradan etkilenmez.
- **AC-38.** Hammadde tablosunda cins kesidin üstündedir: farklı cinsli iki parça aynı kesitte olsa da ayrı bloklara düşer.
- **AC-39.** Pencerede cinsi boş malzemeli parça, cinsi dolu hazır parçanın altına iner.
- **AC-40.** Karşılaştırma katlanmış anahtar üzerinde yapılır: "Rulmanlar" ile "rulman" ayrı bloklardır ve alfabetik sıraları katlanmış değere göre kurulur.
- **AC-41.** Ayar değişince açık sipariş penceresinin sırası güncellenir.
- **AC-42.** Listedeki satırın sırası yukarı ve aşağı düğmeleriyle değişir; düğmeler erişilebilir adlarını taşır.
- **AC-43.** 100 satırdan uzun liste ve 100 karakterden uzun satır girişi reddedilir; saklı uzun liste yine sıralamayı çalıştırır.
- **AC-44.** Panel Ayarlar › Uygulama grubundadır, kimliği `cinssira` ve adı "Cins Sıralaması".
- **AC-45.** Temiz kurulumda yeni sütun vardır, yazılır ve okunur (`db-clean-install`).
- **AC-46.** `tests/fixtures/0161-yeni-ayar.js` yeni ayar alanını ayıklar ve on bekçi dosyası aynı iddiayı sürdürür.
- **AC-47.** Yeni ayar panelinin kanıt eşlemesi kaydı vardır.
- **AC-48.** Sıralamayı motor çağırır; bileşen dosyalarında sıralama çağrısı yoktur (kaynak taraması).
- **AC-49.** Tarama karşılaştırmayı arar: pencere ve belge cinsi göstermeye devam eder ve tarama bunu yasaklamaz.
- **AC-50.** Öncelik listesine yalnız boşluktan oluşan ya da baştan sondan boşluklu satır girilirse değer kırpılarak tutulur, boş satır hiç yazılmaz.
- **AC-51.** Ayarlar bölümleri daha önce özelleştirilmiş kısıtlı kullanıcı yeni paneli görmez; admin kutuyu işaretleyip kaydettikten sonra görür (bilinen sınır, ölçülür).
- **AC-52.** Öncelik listesine "RULMAN" yazılması cinsi "rulman" olan parçaları da öne alır.
- **AC-53.** Alanı tanımayan sunucuya yapılan yazımda liste düşer, kayıt 403 almaz ve başka hiçbir alan etkilenmez (sunucu ölçümü).
- **AC-54.** Alan `appSettings.cinsSirasi` düz dizidir; liste boşalınca değeri `undefined` yazılır, anahtar silinmez ve bir sonraki yüklemede eski liste geri gelmez.
- **AC-55.** 0158 AC-79, 0160 AC-38 ve 0160 AC-62 taramalarının hiçbiri kırılmaz: sıralama satırın `cins` değerini okur, `parcaBilgi.js`'e import girmez.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Sıralama **saf motorda** yazıldı ve kendi testi var; pencere ve belge yalnız gösteriyor (AC-27, AC-28).
- [ ] Pencere ile belge aynı sırayı aynı kaynaktan alıyor; ayrışma yok (AC-11).
- [ ] Yeni ayar alanı için **dört nokta kuralı** uygulandı; `db-roundtrip.cjs` ve `db-clean-install.cjs` betiklerine birlikte eklendi (AC-30, AC-45).
- [ ] Yeni veri bölümü yok; `BLOB_SECTIONS` ve birleştirme zinciri değişmedi.
- [ ] Sunucunun ayar alanı eşlemesi eklendi, **yeni eylem izni eklenmediği açıkça yazıldı** (AC-22, AC-29).
- [ ] `App` yükleme yolunda alan açıkça alınıyor ve boşalan liste `undefined` yazılıyor (0091 dersi, AC-20).
- [ ] Ayar paneli kilit kapsam listesine eklendi (AC-21) ve `docs/evidence/kanit-eslemesi.json`'a kaydı yazıldı (AC-47).
- [ ] "Yeni ayar alanı yok" bekçi zinciri uzatıldı: `tests/fixtures/0161-yeni-ayar.js` yazıldı ve onu kullanan on test dosyası güncellendi (AC-46).
- [ ] Yedek tarafına not eklenmedi ve bunun gerekçesi yazıldı (`appSettings` bütün nesne olarak taşınıyor, 0133 emsali; AC-23).
- [ ] Sıralamanın koşulsuz olduğu, seçeneğin yalnız öncelik listesini taşıdığı ve eski altınları R5 ile kararlılığın koruduğu yazıldı (AC-32, AC-33).
- [ ] Pencere satırına yeni alan eklenmedi; blok içi sıra sort kararlılığıyla korunuyor (AC-31).
- [ ] Ayar değişince açık pencerenin sırası güncelleniyor; öncelik listesi motor çağrısının bağımlılıklarında (AC-41).
- [ ] Soft-delete ve çöp kutusu simetrisi etkilenmedi.
- [ ] Kullanıcıya görünen bütün metinler Türkçe; belgenin dili değişmedi, yeni çeviri anahtarı yok.
- [ ] Para gösterimi değişmedi; çoklu para kuralı korunuyor (AC-24).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (öncelikli blok, alfabetik bloklar, cinsi boş liste, boş ayar listesi, ayar paneli ve kilit ekranı).
- [ ] Cinsi dolu olmayan on kıyas altını ayıklama olmadan yeşil (AC-33); cinsi dolu veriden türeyen 0157 ve 0159 kıyasları altın yenilenmeden eski altına yeni kural uygulanarak karşılaştırıldı ve gerekçesi test yorumunda "spec 0161 ile" notuyla yazıldı (AC-34), 0158'in beş dosyası dokunulmadı (AC-34).
- [ ] Sürüm notu yazıldı (önce sunucu PC, sonra istemciler; C7).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (cins blokları, öncelik ayarı, tek sıralama kuralı).
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
