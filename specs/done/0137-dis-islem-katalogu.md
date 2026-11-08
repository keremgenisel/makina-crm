# 0137 — Dış işlem kataloğu ve işlem bedelinin zam zinciri

| | |
|---|---|
| **Durum** | **Tamamlandı** (2026-11-08, commit `85fcb759`; plan `specs/done/0137-uygulama-plani.md`, plan turu Karar 33–46, triyaj 47–48) |
| **Sahip** | Analist (yazdı), geliştirme atanmadı |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog (yeni panel), parça kartının maliyet kalemleri, maliyetin tek okuma yolu (`urunAgaci.parcaMaliyetKurus`), parçanın maliyet geçmişi (`maliyetGecmisiYaz`), setin özeti (`setOzeti`), malzeme zammının etki önizlemesi (`malzeme.fiyatEtkisi`), Makina Maliyeti (Model Maliyetleri, Parti Hesabı), satış fiyatı türetmesi (`parcaFiyati`), Excel dışa ve içe aktarma (`SettingsExport`, `SettingsImport`), tedarikçi koruması, çöp kutusu, İşlem Geçmişi etiketleri, kayıt kilidi, yeni veri bölümü |
| **Bağımlı spec'ler** | 0135 (X1'i bu spec açar), 0132 (emsal ve ikiz), 0133 (fiyat bağlamı), 0096, 0097, 0134, 0136, 0086 (üç senkron noktası), 0078 (çöp kutusu etiketleri), 0024 (birim kilidi emsali), 0023 (ad tuzağı dersi), 0121, 0122, 0123, 0126 |
| **QA turu** | 2026-11-08, 32 bulgu (7 Bloklayıcı / 14 Önemli / 11 Küçük), tümü onaylandı ve spec'e işlendi |
| **Daraltılan kriterler** | AC-52, AC-53 (karma okuma ibaresinin çizim koşulu bugünkü iddianın ikizine indirildi) |

---

## Intent

Fabrika yönetimi parçaların bir kısmını dışarıda işletiyor: ısıl işlem, galvano, eloksal, toz boya, lazer kesim, kama yeri açma, helis dişli açımı, tel erezyon, torna. Bu firmalardan biri fiyatını artırdığında programda hiçbir şey olmuyor, çünkü işlem bedeli her parçanın içine elle yazılmış sabit bir lira tutarı olarak duruyor; zam gelince o işlemin geçtiği parçaları tek tek bulup düzeltmek gerekiyor. Malzeme tarafında bu acı 2026-11-05'te kurulan zincirle geçti, işlem tarafı açık kaldı.

Başarı şöyle görünür: bir işlemin fiyatı katalogda bir kez yazılır, parça "şu işlemden şu kadar" der, ve o firmaya zam gelince işlemin geçtiği bütün parçaların maliyeti ve maliyetten türeyen satış fiyatı kendiliğinden değişir. Takım Yöneticisi ayrıca geçmişi bozmamak istiyor: bugünkü zam dün üretilmiş makinanın maliyetini değiştirmez.

---

## Requirements

### Katalog

- **R1.** Ayarlar › Katalog'un altına **"Dış İşlemler"** paneli gelir. Bir işlem kaydının alanları: ad, birim, birim fiyatı, para birimi, kur, tedarikçi ve fiyat geçmişi.
- **R1/2.** Panel üç göstergeyi taşır (malzeme panelinin ikizi, Ölçüm U): başlıkta **fiyatı girilmemiş işlem sayısı** rozeti, satırda **kullanım** ("n parçanın maliyet kaleminde"), çöpe atma onayında aynı sayı ve "bu parçaların maliyeti girilmedi olur" uyarısı. Kullanıcı bir parçanın neden "girilmedi" olduğunu panelden görebilir.
- **R2.** Birim iki değerdir: **adet** ve **kilo**. Varsayılan adettir. Üçüncü bir birim yoktur.
- **R2/2.** Bir parçanın (çöptekiler dahil) işlem kaleminde geçen işlemin **birimi değiştirilemez**; seçici pasif ve nedenlidir (kullanım sayısıyla). Hiç kullanılmayan işlemde birim serbesttir. Emsal 0024 R16'nın "hareketi olan hesabın para birimi değişmez" kuralıdır; aksi hâlde tek tıkla bütün bağlı kalemlerin anlamı ("3 adet" → "3 kilo") etki önizlemesi olmadan değişirdi. Birim bu yüzden fiyat kümesine de girmez (R9/2).
- **R3.** Para birimi TL, USD ya da EUR olabilir. TL varsayılandır ve kayda yazılmaz. Döviz seçilmişse kur zorunludur ve kayıtta sabitlenmiş değer saklanır; günün kuru yalnız öneridir.
- **R4.** İşlem adı zorunludur ve katalogda tekildir. Aynı ada ikinci işlem eklenemez; karşılaştırma Türkçe küçültmeyle yapılır.
- **R4/2.** Tekillik yalnız **canlı** işlemler arasındadır: çöpteki aynı adda bir işlem yeni kaydı engellemez (Ölçüm Z, `malzeme.adCakisiyorMu` ve `copKutusu.geriAlmaAdCakismasi` çöptekileri saymıyor). Geri almadaki çakışma kuralı R23'tedir.
- **R5.** Tedarikçi seçimi isteğe bağlıdır. Seçici yalnız gider yetkisi olan kullanıcıya çizilir; yetkisi olmayan kullanıcı işlemi kaydettiğinde var olan tedarikçi bağı korunur, silinmez.
- **R6.** Fiyat yalnız **"Fiyatı Güncelle"** penceresinden değişir. İşlem kartının düzenlemesi fiyat kümesine (birim fiyatı, para birimi, kur) dokunmaz.
- **R7.** Fiyat güncelleme penceresi kayıtlı kurla açılır, günün kuru ipucunda ve bir düğmeyle önerilir, kur alınamadığında neden yazılır ve kayıt engellenmez.
- **R8.** Fiyat güncelleme penceresi, bu değişikliğin kaç parçanın maliyetini ne kadar değiştireceğini kaydetmeden önce gösterir.
- **R8/2.** Önizleme maliyetin yanında **satış fiyatını da** söyler: "n parçanın satış fiyatı değişecek" (0133 R16'nın malzeme penceresine eklediği satırın ikizi, Ölçüm V). AC-65 fiyatın kendiliğinden değiştiğini söylüyor; kullanıcı bunu kaydetmeden önce görür.
- **R9.** İşlemin fiyat geçmişi tutulur: bir geçmiş satırı fiyat kümesinin bir tarihteki anlık görüntüsüdür. Satır yalnız küme gerçekten değişince doğar, ilk fiyat girişi geçmiş kaydı doğurmaz, aynı güne ikinci değişiklik son satırın üstüne yazar, geçerlilik tarihi gelecekte olamaz.
- **R9/2.** Fiyat kümesinin alanları yazılıdır: **`["birimFiyati", "paraBirimi", "kur"]`** (`malzeme.FIYAT_ALANLARI`'nın ikizi, Ölçüm Y). **Birim kümeye girmez** (R2/2 ile tutarlı). "Boş küme" (ilk fiyat girişi, `kumeBosMu` ikizi) = `birimFiyati == null`; AC-20 ve AC-23 bu tanımla ölçülür.

### Parçanın işlem kalemi

- **R10.** Parçanın maliyet kalemleri listesinde işlem kalemi iki çeşide ayrılır: **katalog bağlı** kalem (hangi işlem ve ne kadar) ve bugünkü **serbest** kalem (ad, tedarikçi, sabit tutar). İkisi aynı listede yan yana durur ve toplanır.
- **R10/2.** Çeşidin kayıttaki ayırt edicisi **`islemId` anahtarının varlığıdır**; `tur` değeri iki çeşitte de `"islem"` kalır. Üçüncü bir `tur` değeri açılmaz (Ölçüm A: `maliyetKalemleri.gecerliTur` yalnız iki değeri geçirir, üçüncüsü eski istemcide kalemi tamamen düşürür ve bütün `tur` karşılaştırmalarını açar).
- **R10/3.** Katalog bağlı kalemde işlem **arama kutusundan** seçilir (`SearchPick`, yer tutucu "İşlem ara..."; 0122'nin set bileşeni emsali, sözlüğün "beş ve üstü ya da uzun etiket" kuralı). Katalog boşken seçici yerine neden satırı çizilir (`MALZEME_KATALOG_BOS_NEDENI`'nin ikizi).
- **R10/4.** Seçilen işlemin **tedarikçisi parça kartında gösterilmez**; yalnız birimi ve birim fiyatı salt okunur görünür (R27). Gerekçe 0135 C6/2'nin gizlilik kuralıdır: tedarikçi adı kaleme yazılmaz.
- **R10/5.** Kalem sınırı değişmez: `MALIYET_KALEM_SINIRI` 20'dir ve iki çeşidi **birlikte** sayar (bugünkü kalem sayısı, Ölçüm AA).
- **R11.** Katalog bağlı kalemin tutarı okuma anında katalogdan türer ve parçaya kaydedilmez.
- **R12.** Birimi **adet** olan işlemde kalemin miktarı adettir: en az 1, en çok 1.000 tam sayı, varsayılan 1. Tutar birim fiyatı, kur ve adedin çarpımıdır.
- **R13.** Birimi **kilo** olan işlemde kalemin miktarı kilodur ve **boş bırakılabilir**: boşsa parçanın malzeme kalemlerinin **net** ağırlıkları (işleme payı ve fire hariç, kalem adediyle çarpılmış) toplanarak kullanılır, doluysa girilen kilo kullanılır.
- **R13/2.** Kilo miktarının doğrulaması yazılıdır (`malzeme.alanDogrula` disiplini, Ölçüm H): boş serbesttir (R13'ün türetmesi), **belirsiz sayı** reddedilir (`BELIRSIZ_DESEN`, "2.955"), negatif reddedilir, **sıfır reddedilir** ("Sıfırdan büyük bir sayı olmalı."; ücretsiz işlem kataloğun 0 fiyatıyla anlatılır), üst sınır **10.000 kg**, en çok **üç ondalık** (`ucOndalik` emsali). Doğrulama yazılmazsa `tutarCoz`'un nokta belirsizliği maliyete bin kat sapma olarak girer (0132 triyaj Karar 42).
- **R14.** Kilo birimli bir kalem, miktarı boş ve parçanın hiç malzeme kalemi yoksa çözülemez.
- **R14/2.** Aynı kalem, parçanın **ağırlığı çözülemeyen** bir malzeme kalemi varsa da çözülemez. Üç hâl ölçüldü (Ölçüm D): malzeme kalemi **boy fiyatından** hesaplanıyorsa ağırlık hiç yoktur (`malzemeOzeti` boy dalında `hamKg` ve `fireliKg` null; 0134 de bunu `NEDEN_BOY_YONTEMI` ile kabul ediyor), malzemenin **özgül ağırlığı** girilmemişse, kalemin **ölçüsü** eksikse. Üç hâlin nedeni ekranda ayrı metinle söylenir ("boy fiyatından hesaplanan malzemenin ağırlığı yok", "özgül ağırlık girilmedi", "ölçü eksik"). Sessizce 0 kilo alınmaz (0132 R7'nin "asla sıfır" kuralı).
- **R15.** Çözülemeyen bir katalog bağlı kalem (işlem çöpte ya da bulunamıyor, fiyatı girilmemiş, dövizde kuru yok, para birimi tanınmıyor, kilo tabanı çözülemiyor) parçanın maliyetinin tamamını "girilmedi" yapar. Kısmi toplam ya da sıfır üretilmez.
- **R15/2.** Bu, motorda yeni bir eksiklik bayrağı ister. Bugün işlem satırı koşulsuz `cozuldu: true` döndürüyor ve toplamı "girilmedi" yapan tek şart `malzemeEksik`'tir (Ölçüm C). `maliyetKalemleriOzeti`'ne **`islemEksik`** eklenir, katalog bağlı satırın `cozuldu`'su gerçekten hesaplanır ve toplam `malzemeEksik || islemEksik` ile null olur.
- **R15/3.** İki "boş" ayrı kalır ve bu açıkça yazılıdır: katalog bağlı kalemin çözülememesi parçanın tamamını "girilmedi" yapar (R15), serbest kalemin boş tutarı (R16) `cozuldu: true, bos: true` kalır ve yalnız toplama girmez. Çözülemeyen hâllerin tam listesi: işlem çöpte ya da bulunamıyor, birim fiyatı girilmemiş, dövizde kuru yok, para birimi tanınmıyor, miktar geçersiz (R13/2), kilo tabanı çözülemiyor (R14, R14/2).
- **R15/4.** Birim fiyatı **0** girilmiş işlem çözülür ve kaleme 0 TL katar (ücretsiz işlem); yalnız **boş** birim fiyatı çözülemez. Ayrım 0132'nin `maliyetMetni` disiplinidir (`—` ile `0,00 ₺` ayrı).
- **R16.** Serbest işlem kaleminin bugünkü davranışı birebir korunur: sabit TL tutarı, boş tutar uyarı verir ama kaydı engellemez ve toplama girmez.
- **R17.** Bir işlem kaleminin çeşidi değiştirilebilir (serbestten katalog bağlıya ve tersi); çeşit değişince öteki çeşidin alanları kalemden silinir.
- **R17/2.** Çeşit değişiminde silinecek alanda veri varsa **onay sorulur** (0135'in kip değişimindeki `ConfirmDialog` emsali); onay penceresi açıkken kartın Escape'i çalışmaz (0126'nın iç içe pencere kuralı).

### Tarihli okuma

- **R18.** Katalog bağlı işlem kalemi, sorgu tarihinde geçerli fiyatla okunur. Serbest kalem bugünkü sabit tutarıyla girmeye devam eder.
- **R19.** Parça kartındaki karma okuma ibaresi koşullu olur: yalnız parçada serbest işlem kalemi varken yazılır.
- **R19/2.** Aynı koşul kartın **iki metnini daha** kapsar, çünkü ikisi de bu spec'ten sonra yanlışa döner (Ölçüm R): `ISLEM_ZAM_IBARESI` ("İşlem tutarları sabittir; malzeme fiyatına gelen zam yalnız malzeme kalemlerini günceller.") yalnız **serbest** işlem kalemi varken çizilir, boş durum metni (`KALEM_BOS_METNI`, "işlem kalemi … sabit tutardır") **iki çeşidi** anlatacak biçimde yeniden yazılır.
- **R19/3.** Karma ibarenin çizim koşulu bugünkü iddianın birebir ikizidir: `serbestSayi > 0 && malzemeSayi > 0` (Ölçüm S: bugün `islemSayi > 0 && malzemeSayi > 0`; yalnız sayaç daralır). AC-53 buna göre daraltıldı; aksi hâlde serbest kalemli eski veride ekran metni değişir ve R25 kıyası kırılır.

### Tüketiciler ve koruma

- **R20.** Maliyetin tek okuma yolu korunur. Model Maliyetleri, Parti Hesabı, parça listesi, parça kartının canlı özeti, satış fiyatı türetmesi ve Excel dışa aktarması işlem bedelini bu yoldan okur; hiçbiri kendi çarpımını yazmaz.
- **R20/2.** Maliyetin kaynak ibaresi (`maliyetKaynagi`, `kalemKaynakMetni` "Maliyet kalemlerinden hesaplanıyor (n malzeme, m işlem kalemi)") **iki çeşidi ayırmaz**, metin aynen kalır; böylece 0135'in liste kıyası korunur.
- **R21.** Bir parçanın (çöptekiler dahil) işlem kaleminde geçen işlem **kalıcı silinemez**. Koruma **üç** kapıda birden uygulanır: Çöp Kutusu'nun kalıcı silmesi, "çöpü boşalt" ve otuz günlük otomatik temizlik (Ölçüm N, malzemenin birebir ikizi). Korunan satırda nedeni yazılır. **Dördüncü bir kapı yoktur:** çöpe atma koşulsuzdur (katalog panelinde engelleyen silme düğmesi yoktur, AC-55) ve geri alma bir silme kapısı değildir, onun kuralı R23'ün ad çakışmasıdır.
- **R22.** Tedarikçi silme koruması ve tedarikçi kullanım sayısı, katalog işlemlerinin tedarikçi bağını da sayar.
- **R22/2.** Koruma dört kapının **hepsinde** aynı hazır haritadan okunur (Ölçüm M): Tedarikler'in silme düğmesi, Çöp Kutusu'nun Kalıcı Sil'i, "çöpü boşalt" ve otuz günlük temizlik. `gider.kalemdeGecenTedarikciler` ikinci parametre olarak katalog işlemlerini alır (hazır harita disiplini korunur, satır başına tarama yapılmaz), `tedarikciKullanim`'a `islem` sayısı eklenir ve red metni **ikinci bir sabitle** iki adresi birden söyler (bugünkü `KALEMDE_TEDARIKCI_NEDENI` yalnız parça kartını adres gösteriyor).
- **R23.** İşlem kataloğu çöp kutusuna gider. Geri alınırken aynı adda canlı bir işlem varsa geri alınmaz ve nedeni yazılır.
- **R23/2.** Çöp Kutusu satırının etiketi sabit eşlemeden gelir: **"ad · birim"** (`malzemeCopEtiketi`'nin ikizi); tedarikçinin adı yazılmaz (0078 R24).
- **R24.** Yeni eylem izni yoktur. Panel Ayarlar sekmesine bağlıdır ve panelin kendisi ile fiyat güncelleme penceresi aynı kayıt kilidi altında çizilir.
- **R24/2.** Kilit iki satırla uygulanır: `AYAR_KILITLI`'ye yeni panel kimliği, `kilitAlanlari.js`'in `ayar.pencereler` listesine iki yeni dosya (panel ve fiyat penceresi). `kilit-alanlari.test.js` `BLOB_SECTIONS`'tan setter adlarını türetip tarar, satırlar eksikse kırılır (Ölçüm AB).
- **R24/3.** İşlem Geçmişi kaydı yazılır: entity **`dis_islem`**, etiketi **"Dış İşlem"** (`SettingsAuditLog`'un etiket haritası); eylemler bugünkü dördüdür (`olusturuldu`, `duzenlendi`, `silindi`, `fiyat_guncellendi`), yeni eylem adı açılmaz. `islem-gecmisi-etiketleri.test.js` eksik etikette kırılır (Ölçüm AC).
- **R25.** Katalog bağlı işlem kalemi olmayan bir veride bütün çıktılar (maliyet, satış fiyatı, Model Maliyetleri, Parti Hesabı, Excel) bu spec'ten önceki hâlleriyle birebir aynıdır.
- **R26.** Sürüm notu yazılır: yeni veri bölümü olduğu için önce sunucu PC güncellenir, bütün istemciler güncellenene kadar katalog kullanılmaz.
- **R26/2.** Sürüm notu karışık sürümdeki **veri kaybının şeklini** iki cümleyle açık yazar (Ölçüm A, Ölçüm B): güncellenmemiş bir bilgisayarda katalog bağlı kalem maliyete girmez, yani parçanın maliyeti "girilmedi" değil sessizce **daha düşük** görünür (boş tutarlı işlem satırı bugün `cozuldu: true` sayılıyor ve toplama girmiyor); o bilgisayarda parça **düzenlenip kaydedilirse** katalog bağı ve miktar silinir (`kalemFormu`'nun else dalı kalemi serbest şekle çeviriyor, `kalemlerDogrula` adsız kalemi reddediyor).

### Alan, modül ve ekran

- **R27.** Kalıcı adlar ve şekiller yazılıdır (C8'in istediği kod adı). Veri bölümü **`disIslemler`**, tablo **`dis_islemler`**, saf motor **`src/lib/disIslem.js`**, katalog Map'i `disIslemKatalogu(disIslemler)` (yalnız canlı kayıtlar, `malzemeKatalogu` emsali), Ayarlar paneli kimliği **`disislemler`** (Katalog listesinin altıncı öğesi), kilit alanı **`ayar:disislemler`**. Kayıt: `{ id, ad, birim: "adet" | "kilo", birimFiyati, paraBirimi, kur, tedarikciId, fiyatGecmisi: [{ gecerli, birimFiyati, paraBirimi, kur }], deletedAt }`. Boş alan kayda yazılmaz (C7).
- **R27/2.** Kalemin şekli: katalog bağlı kalem **`{ tur: "islem", islemId, miktar }`** (serbest alanlar yok), serbest kalem bugünkü **`{ tur: "islem", ad, tedarikciId?, tutar }`** (R10/2: ayırt edici `islemId`'nin varlığı). **Parçaya yeni sütun açılmaz:** kalem var olan `parts.maliyetKalemleri` JSON'unun içinde durur. Beşli kuralın noktaları: `SCHEMA_SQL`, `applyColumnMigrations`, INSERT, SELECT, `BLOB_SECTIONS`, `SECTION_GROUP: "settings"`, `BOLUM_SEKMELERI: ["settings"]`, `MERGE_KEYS`, `App.mergeLocalIntoReloaded`'ın `apply` ve `silmeUygula` satırları, `TABLES_WITH_TRASH`, kimlik sayacı listesi (`maxIdAcross`), yedek paketinin "Tanımlar" listesi, iki bölüm adı sözlüğü (`src/lib/bolumAdlari.js`, `electron/server.cjs`), `SettingsBackup.applyRestore` dalı ve `bumpId` listesi.
- **R28.** Kilo tabanının adı **`islenmisKg`**dir (ekranda "işlenmiş ağırlık", işleme payı ve fire hariç) ve yardımcısı **`src/lib/malzeme.js`**'e konur, çünkü 0132 C1 ağırlık çarpımlarını yalnız o dosyada bırakıyor; C3'ün taraması bu istisnayı yazılı taşır. "Net ağırlık" adı kullanılmaz: 0134 `netKg`'yi **ham** ağırlıkların toplamı anlamında kullanıyor ve raporda "net" diye basıyor (Ölçüm E), iki kavram aynı adla yan yana duramaz (0023 R10 "mesai" dersi).
- **R29.** Tarihli okumanın kapısı genişler: parçanın kendi maliyet geçmişi, parçada **en az bir malzeme kalemi ya da katalog bağlı işlem kalemi** varken ne yazılır ne okunur (0132'nin `malzeme` kapısının birebir ikizi). Bugün kapı yalnız malzeme kalemine bakıyor, bu yüzden yalnız katalog bağlı işlem kalemi olan parça hem kendi geçmişine satır yazar hem o satırdan okur (Ölçüm F, Ölçüm G). O parçada tarihli okuma kalem yolundan yapılır ve parça kartında geçerlilik tarihi ile geçmiş listesi çizilmez (`MALZEME_GECMIS_IBARESI`'nin ikizi).
- **R29/2.** Aynı kapının üç katalogsuz çağrısı düzeltilir (Ölçüm G): `bugunkuKurus`, `gecmisliKayit`'in `parcaMaliyetKurus(temel)` çağrısı ve `maliyetGecmisiSatirlari`'nın `bugunkuKurus(p)` çağrısı yeni katalogu (ve `malzemeKat`'ı) alır; yoksa eski değer çözülemez ve geçmiş yanlış yazılır.
- **R30.** Maliyetin tek okuma yolu **beşinci parametre** olarak işlem kataloğunu alır (konumlu, 0132'nin dördüncü parametresi emsali) ve iki koruma yazılır. (1) Kaynak taraması: `parcaMaliyetKurus(`, `parcaMaliyetiVar(`, `maliyetGirildiMi(` ve `setOzeti(` çağrılarının hepsi yeni katalogu taşır, gerekçeli istisna listesi tam yollu. (2) Bağlamı **tek kurucu** verir: `parcaFiyati.fiyatBaglamiKur` yeni anahtarı taşır, ekranlar kendi Map'ini kurmaz. Gerekçe 0133 Karar 32'nin dersidir: unutulan konumlu parametre hata vermez, sessizce "girilmedi" döner (Ölçüm I: bugün dört parametre, altı dosyada on iki çağrı, `parcaAktarma.js:195` zaten `undefined` yer tutucu geçiyor).
- **R31.** Yuvarlama noktası yazılıdır: katalog bağlı kalemde birim tutar (`birimFiyati × kur`) **bir kez** kuruşa yuvarlanır, sonra miktarla çarpılır; miktar ondalık olabildiği için (kilo) satır sonucu ikinci kez kuruşa yuvarlanır (Ölçüm L: malzeme kaleminde birim kuruşa yuvarlanıp adetle çarpılıyor, 0134 Karar 34 ondalık kitte satırı bir kez daha yuvarlıyor). Yazılmazsa kartın canlı özeti ile listedeki rakam bir kuruş ayrışır ve AC-48 ölçülemez.
- **R32.** 0132'nin zam etki önizlemesi yeni katalogu alır. `malzeme.fiyatEtkisi` iki hâli katalogsuz okuyor (Ölçüm J), yani hem malzeme hem katalog işlem kalemi taşıyan parça iki hâlde de `null` çözülür, `once === sonra` çıkar ve "maliyeti değişecek parça" sayısına **girmez**. Katalog isteğe bağlı seçenek nesnesinin anahtarı olarak geçer (konumlu liste büyümez) ve parametresiz çıktı birebir kalır (`0133-etki-once.json` korunur). Bu bir gerileme düzeltmesidir, yeni bir yetenek değil.
- **R33.** `setOzeti` de yeni katalogu alır ve bileşenin maliyetini çözen `tekilMaliyetKurus`'a iletir; iki çağıranı (`PartManager` canlı özeti ve `parcaAktarma`'nın set karşılaştırması) güncellenir (Ölçüm K). Yoksa bileşeninde katalog bağlı işlem kalemi olan setin maliyeti `null` olur (0121 AC-42'nin "bir bileşen eksikse setin maliyeti yok" kuralı bütün setleri kapsar).
- **R34.** Makina Maliyeti'nin parça kataloğu (`parcaKatalogu`) yeni diziyi taşır ve `tarihliDirekt` onu `modelMaliyeti`'ye iletir (Ölçüm P). Tembellik korunur: tamamen donmuş partide dış işlem motoru da çağrılmaz (0136 AC-19'un ikizi, aynı casus testiyle ölçülür); yoksa yeni motor her çizimde koşar.
- **R35.** Bağlama noktaları tam yazılıdır. Yeni dizi App'ten bugün `malzemeler`in gittiği **dokuz** yere aynı biçimde iner (sekiz prop ve ayrı pano penceresinin salt okunur anlık görüntüsü) ve `Settings` içinde **altı** noktaya (panel, Çöp Kutusu, Tedarikler, parça paneli, dışa aktarma, içe aktarma); Çöp Kutusu **ham** diziyi alır (`rawMalzemeler` emsali), yoksa çöptekileri çizemez. Excel iki ekrandan beslenir ve ikisi de güncellenir: `SettingsExport` katalogları kendi kuruyor, `SettingsImport` `parcaSatirlariniCoz`'a parametre geçiriyor (Ölçüm T).

---

## Constraints

### Uyulması zorunlu

- **C1.** **Maliyetin tek okuma yolu `urunAgaci.parcaMaliyetKurus` kalır.** İşlem kataloğu o fonksiyona yeni bir parametre olarak girer; ikinci bir maliyet hesabı yazılmaz (0132 C1, 0135 C1/2, 0121 C2 ile aynı kural).
- **C2.** Hesap React'sız **saf motorda** yazılır, saat okumaz, tarih parametredir (0132 C2).
- **C3.** İşlem bedelinden tutar türeten **çarpımlar kaynakta tek dosyada** durur (0132 C1'in kaynak taraması emsali). Ekranlar çarpım ve toplama yazmaz, hazır sonucu gösterir.
- **C4.** Yeni veri bölümü beşli kuralı uygular: şema, sütun göçü, INSERT, SELECT ve birleştirme (`BLOB_SECTIONS` + `SECTION_GROUP` + `BOLUM_SEKMELERI` + `MERGE_KEYS` + `App.mergeLocalIntoReloaded`). Yedek paketlerinin "Tanımlar" listesine, iki bölüm adı sözlüğüne ve kimlik sayacı listesine de eklenir (0086 C6'nın üç senkron noktası).
- **C5.** **Göç yoktur.** Bugünkü serbest işlem kalemleri olduğu gibi kalır ve okunmaya devam eder; katalog bağı kullanıcı girdikçe doğar.
- **C6.** Yeni eylem izni açılmaz; bölüm yazma yetkisi Ayarlar sekmesine bağlanır (0132'nin malzeme bölümüyle aynı eşleme).
- **C7.** Boş alan kayda yazılmaz (0132 C5/2, 0135 R45): girilmemiş alan gövdede anahtar olarak bile durmaz, yoksa sunucunun karşılaştırması sahte değişiklik görür.
- **C8.** **Ad tuzağı:** "işlem" sözcüğü uygulamada üç ayrı kavramda geçiyor ve bu spec dördüncüsünü getiriyor. Ekran etiketi bu yüzden **"Dış İşlemler"**dir; İşlem Geçmişi (denetim izi), izin ekranının "Gider işlemleri" / "Kasa işlemleri" akordeonları ve kasa hareketleri bu spec'le hiçbir alan paylaşmaz. Yeni kavramın kod adı bu ayrımı taşır ve kaynak taramasıyla sabitlenir (0023 R10'un "mesai" dersi).
- **C9.** Kıyas altını alınır: spec öncesi kodla üretilmiş çıktılar dosyaya yazılır ve R25 onunla birebir karşılaştırılır (0132, 0135, 0136 emsali).
- **C10.** Çöp kutusu simetrisi korunur: çöpe atma, geri alma, kalıcı silme ve otuz günlük temizlik aynı koruma yardımcısını okur (0096 ve 0132'nin malzeme koruması emsali).
- **C11.** Önceki spec'lerin "yeni bölüm, birleştirme anahtarı, izin ya da ayar alanı yok" bekçileri bu tek eklemeyi ayıklayıp aynı iddiayı sürdürür. `tests/fixtures/0137-yeni-bolum.js` yazılır ve 0132 ile 0133'ün fikstür zincirine eklenir; o zincir **dokuz** test dosyasında kullanılıyor (`extra-kalip-isareti-0107`, `hammadde-0096`, `harita-ilce-0094`, `makina-durumu-ondoldur-0109`, `maliyet-gecmisi-0097`, `plan-adetler-0093`, `tahsilat-hesap-izni-0098`, `ucretsiz-yedek-parca-0095`, `uretim-formu-bagi-0108`). Ayrıca iki sayı iddiası güncellenir: `cop-kutusu-0078.test.js` çöp tablosu sayısı (yirmi üç → yirmi dört) ve `yedek-paketleri-0086`'nın paket ↔ geri yükleme dalı eşitliği (Ölçüm O).

### KAPSAM DIŞI

- **X1.** Dakika, saat, m² ve dm² birimleri — *neden:* ikisi de parçaya yeni bir ölçü girişi (işlem süresi, boyanacak alan) ister, yani 380 parçada elle veri demek. İki birim zincirin tamamını açıyor; kullanıcı süre ve alan bazlı fiyatı adet fiyatına çevirip girer. Gerekirse ayrı spec.
- **X2.** "Bu partide kaç adet kama açılacak, kaç kilo ısıl işlem gidecek" listesi — *neden:* aynı veriden doğal olarak çıkar ama kendi başına bir iştir; 0134 malzeme siparişiyle yeni kapandı ve önce kataloğun dolması gerekiyor.
- **X3.** Asgari tutar ve parti kurulum bedeli — *neden:* parça başına maliyeti etkilemez, yalnız X2'nin ekranında anlam taşır. Alanı şimdi açmak boş kalacak bir alan açmaktır.
- **X4.** Malzemenin çap bandı benzeri kademeli işlem fiyatı — *neden:* bant çapa göre malzeme fiyatıdır; işlemde kademenin ölçütü ölçülmedi, varsayım yazılmaz.
- **X5.** İşlemin stok hareketi, sipariş kaydı ya da gider kalemi üretmesi — *neden:* katalog bir fiyat listesidir, muhasebe kaydı değil. Gider kalemi bugünkü gider akışından girilir.
- **X6.** Var olan serbest işlem kalemlerinin kataloğa otomatik dönüştürülmesi — *neden:* serbest kalemin adı serbest metindir ve hangi katalog işlemine denk geldiği makineyle çözülemez (133 düz satırın bir kısmı aslında hammadde alımı, işlem değil). Dönüştürme kullanıcının kararıdır.
- **X7.** Parça Excel şablonuna işlem sütunu — *neden:* 0124'ün set sütunu dersi: bir sütunun iki yönlü çözümü (yazım, okuma, hata metni, kıyas) kendi başına bir iştir. Dışa aktarma çözülmüş maliyeti yazmaya devam eder.
- **X8.** Genel aramaya eklenmesi — *neden:* 0132 X11 ile malzeme de eklenmedi; iki katalog birlikte ayrı bir spec'e konur ki arama tablosu bir kez büyüsün.
- **X9.** Modelin ek maliyet kalemleriyle (0087) birleştirme — *neden:* o kalemler model düzeyindedir (montaj işçiliği, büküm), bu katalog parça düzeyindedir. İkisini birleştirmek 0087'nin veri modelini açar.
- **X10.** Satış fiyatının işlem zammında otomatik güncellenmesi dışında yeni bir fiyat kuralı — *neden:* 0133 fiyatı maliyetten türetiyor; işlem zammı maliyeti değiştirince fiyat kendiliğinden değişir, yeni kural gerekmez.

---

## Context

### Bugünkü davranış, ölçülmüş

**İşlem kalemi düz TL'dir ve zam zincirinin dışındadır.** 0135'in kalem modelinde işlem kaleminin şekli `src/lib/maliyetKalemleri.js`'te yazılı: `{ ad, tedarikciId (yoksa anahtar yok), tutar (TL, KDV hariç; girilmemişse null) }`. Toplama `urunAgaci.js:45` `maliyetKalemleriOzeti` içinde yapılıyor ve işlem satırı için tek satır:

```
const bos = k.tutar == null || k.tutar === "";
return { tur: KALEM_TUR.ISLEM, tutarK: bos ? null : kurus(k.tutar), bos, cozuldu: true };
```

Yani işlem kaleminde çözülecek bir şey yok, `cozuldu` koşulsuz `true` ve tutar kayıttan okunuyor.

**Tarih işlem kalemine inmiyor.** Aynı fonksiyonun yorumu bunu açıkça söylüyor (`urunAgaci.js:43-44`): "`tarih` yalnız malzeme kalemlerine iner (R35/4: işlem kalemi bugünkü tutarıyla girer)". 0135 R35/4 bu karma okumayı parça kartında bir ibareyle duyuruyor. Bu spec katalog bağlı kalemler için o asimetriyi kapatır, serbest kalem için bırakır (R18, R19).

**Maliyetin tek okuma yolu dört parametreli:** `urunAgaci.js:86` `parcaMaliyetKurus(p, tarih, katalog, malzemeKat)`. Öncelik set içeriği, kalem listesi, elle değer. Beşinci parametre eklenecek ve bugün onu çağıran yerler şunlar (ölçüldü):

| Dosya | Satır | Ne için |
|---|---|---|
| `src/lib/makinaStandartMaliyet.js` | 213 | Model Maliyetleri ve Parti Hesabı'nın birim maliyeti |
| `src/lib/parcaAktarma.js` | 33, 195, 202 | Excel dışa aktarma hücresi ve içe aktarma karşılaştırması |
| `src/lib/parcaFiyati.js` | 75 | 0133'ün maliyetten türeyen satış fiyatı |
| `src/lib/malzeme.js` | 425, 426 | zam etki önizlemesinin önce/sonra karşılaştırması |
| `src/components/PartManager.jsx` | 462 | maliyet geçmişi kararı |
| `src/lib/urunAgaci.js` | 68, 93, 100, 190, 208, 299 | kendi iç yolları, `parcaMaliyetiVar`, `parcaMaliyetMetni`, set özeti |
| `src/components/settings/SettingsExport.jsx` | 360, 361 | katalogları kendi kurup `parcaDisaAktarmaSatiri`'ya veriyor (QA turu, Ölçüm T) |
| `src/components/settings/SettingsImport.jsx` | 180 | `parcaSatirlariniCoz`'a altı parametre geçiriyor (QA turu, Ölçüm T) |
| `src/components/Settings.jsx` | 79, 236, 290, 298, 361, 408 | malzemenin altı bağlama noktası; 408 **ham** diziyi (Çöp Kutusu) alıyor (QA turu, Ölçüm T) |

**Fiyat bağlamı tek yerde kuruluyor:** `src/lib/parcaFiyati.js:61` `fiyatBaglamiKur({ parts, malzemeler, fiyatAyarlari })` set kataloğunu, malzeme kataloğunu ve fiyat ayarını bir kez kurar; her ekran onu `useMemo` ile kurup formlara prop olarak verir (0133 Karar 32). İşlem kataloğu buraya girer.

**Prop zinciri ölçüldü:** `src/App.jsx`'te `malzemeler` sekiz yere prop olarak gidiyor (satır 1453 kiosk panosu, 1737 Müşteriler, 1738 Bayiler, 1739 Stok, 1761 Makina Maliyeti, 1769 Evrak, 1770 Servis ve Kargo Panosu, 1772 Ayarlar) ve ayrıca ayrı pano penceresinin anlık görüntüsünde **salt okunur** olarak duruyor (`App.jsx:1054`, yazılabilir bölümlere girmiyor). İşlem kataloğu aynı dokuz yere aynı biçimde iner; 0133'ün dersi bu zincirin gerçek App testiyle ölçülmesidir.

### Emsal: malzeme kataloğu (0132) birebir ikiz

Yeni kayıt tipinin her parçası var olan bir emsali kopyalar:

| İhtiyaç | Emsal |
|---|---|
| Katalog paneli | `src/components/MalzemeManager.jsx`, Ayarlar › Katalog'un beşinci öğesi (`Settings.jsx:57`) |
| Fiyat güncelleme penceresi | `src/components/MalzemeFiyatPenceresi.jsx` (kayıtlı kurla açılır, günün kuru öneri, etki önizlemesi) |
| Katalog Map'i | `malzeme.js:176` `malzemeKatalogu` (yalnız canlı kayıtlar) |
| Fiyat kümesi ve tarihli okuma | `malzeme.js:82` `FIYAT_ALANLARI`, `fiyatKumesi`, `fiyatKumesiTarihte`, `fiyatGecmisiYaz` |
| Geçerlilik tarihi kuralları | `src/lib/gecerlilik.js` (`gecerliGunMu`, `gecerlilikTarihiDogrula`, `tarihteGecerliIndeks`) |
| Zam etki önizlemesi | `malzeme.js:416` `fiyatEtkisi` (tek okuma yolundan önce/sonra) |
| Kullanım ve koruma | `malzeme.js:390` `malzemeKullanimi`, `:399` `kullanilanMalzemeler`; otuz günlük temizliğin `koru`'su `App.jsx:1119` |
| Tedarikçi koruması | `src/lib/gider.js:1054` `kalemdeGecenTedarikciler` (hazır harita, satır başına parça taranmaz) |
| Kilit alanı | `src/lib/kilitAlanlari.js:46,58` `ayar:malzemeler` (panel ve fiyat penceresi aynı alan) |
| Sunucu eşlemesi | `electron/serverAuth.cjs:27,56,130` (`BLOB_SECTIONS`, `SECTION_GROUP: "settings"`, `BOLUM_SEKMELERI: ["settings"]`) |
| Veritabanı | `electron/db.cjs:307` şema, `:654` bölüm listesi, `:1052` yazma, `:1188` sütun göçü, `:1703` okuma |
| Birleştirme | `src/lib/merge.js:44` `MERGE_KEYS`, `:215` kalem içi kimlik eşlemesi, `:219` tedarikçi eşlemesi |
| Yedek | `src/lib/yedekPaketleri.js` "Tanımlar" paketi |
| App bağları | `App.jsx:295` birleştirme, `:324` silme, `:820` durum, `:888` canlı dizi, `:1119` temizlik, `:1200` yükleme, `:1335` kayıt gövdesi |

### Kilo tabanı: hangi ağırlık

`malzeme.js:227` `malzemeOzeti(satir, malzemeKat, tarih)` bugün `{ maliyetK, eksik, hamKg, fireliKg, fire, … }` döndürüyor. İkisi de **ham** ölçüden (işleme payı dahil) hesaplanıyor; `fireliKg` üstüne fireyi de ekliyor. İşlenmiş ağırlık (payı ve firesi olmayan, yani biten parçanın ağırlığı) bugün döndürülmüyor ama aynı alanlardan hesaplanabiliyor: kalem net ölçüyü ve payı ayrı ayrı taşıyor, `hamOlculer` payı ekliyor.

Dış işlem biten parçaya yapılıyor ve tedarikçi teslim edilen parçayı tartıyor, bu yüzden **R13 işlenmiş ağırlığı taban alır.** Ham ya da fireli ağırlık, satın alınan çubuğun ağırlığıdır ve ısıl işleme giden parçanın ağırlığından sistemli olarak büyüktür (ölçülen örnek: Ø140x78 paslanmaz yatakta fire tek başına 1 kg, yani yüzde 10,5).

QA turunda iki şey ölçüldü ve kavramın adı ile sınırları buna göre yazıldı. (1) **Ağırlık her malzeme kaleminde yok:** `malzemeOzeti`'nin boy fiyatı dalı `hamKg` ve `fireliKg` için null döner, özgül ağırlığı girilmemiş ve ölçüsü eksik dallarda da ağırlık çözülmez (Ölçüm D); R14/2 bu üç hâli "çözülemez" sayar. (2) **"Net ağırlık" adı doludur:** `siparisIhtiyaci.js:281` `netKg`'yi ham ağırlıkların toplamı anlamında kullanıyor ve `siparisRaporu.js:24` onu "net" diye basıyor (Ölçüm E); bu yüzden yeni kavramın adı **`islenmisKg`**dir (R28).

### Neden şimdi: kullanım kanıtı

- Tedarikçi kataloğunda **45 canlı tedarikçinin en az 14'ü malzeme satıcısı değil işlem firmasıdır** (canlı veritabanından okundu, 2026-11-08): İSTANBUL DİŞLİ (helis dişli açımı), ÜÇLER GALVANO, MAHİR ISIL İŞLEM, MARMARA ISIL İŞLEM, AYŞE AYDIN KARADENİZ LAZER KESİM, UMUT MAKİNA (kama yeri açma), AKSU CNC TEÇ OTO (tel erezyon delik delme), ASEL GMO ELOKSAL STATİK TOZ BOYA, ODAK KAMA, NOKAY MAKİNA (ayna mahruti), TÜFEKÇİ KARDEŞLER TORNA, TIĞLI DÖKÜM, DOLAPÇI FİKRET (soğutma grubu montaj), SİSTEM OTOMASYON (pano imalatı).
- 2026-11-01 yedeğinden ölçülen hâl: 380 canlı parçanın 137'sinin maliyeti çözülüyor ve **133'ü 0096'nın düz TL kırılımından** geliyor. 0135 o satırları okuma anında "Hammadde alımı" adlı işlem kalemlerine çeviriyor, yani bugün maliyeti çözülen parçaların neredeyse tamamı zam zincirinin dışındadır. O 133 satır iki ayrı şeyin aynı kutuya atılmış hâli: bir kısmı hammadde alımı (malzeme kalemine dönüştürülecek, 0132), bir kısmı işlem bedeli (bu spec).

### Bilinen tuzaklar

1. **Döngüsel içe aktarma.** `maliyetKalemleri.js` hiçbir lib modülünü içe almıyor ve bu bilinçli (0135 Karar 39): türetme `gider.js`, `malzeme.js` ya da `urunAgaci.js`'e konsa döngü doğardı. Ayrıca 0133'te ölçülmüş bir tuzak var: `parcaFiyati.js` ile `malzeme.js` birbirini içe alıyor, bu yüzden modül düzeyinde karşı modülün bir adını okumak `undefined` veriyor; adlar çağrı anında okunmalı. Yeni modül aynı disipline uyar.
2. **Yeni veri bölümünün yükleme yolu.** 0091'in dersi: var olup olmama arasında gidip gelen bir alan, yükleme yolunda açıkça alınmazsa bellekteki bayat değer korunur ve sonraki kayıt onu geri yazar. Yeni bölüm `App.jsx:1200` emsaliyle açıkça yüklenir.
3. **Boş liste gövdeye yazılmaz** ama anahtar da silinmez (0091 R24/4): birleştirme `{ ...yeniden, ...yerel }` bindirdiği için silinmiş anahtar sunucudaki eski listeyi ezemez.
4. **Karışık sürüm.** Güncellenmemiş bir sunucu yeni bölümü tanımaz ve yeni istemcinin kataloğunu düşürür; güncellenmemiş bir istemci bölümü hiç göndermez. Sürüm notu bu yüzden zorunlu (R26, 0132'nin aynı notu).
5. **Otuz günlük temizliğin sırası.** 0123'ün dersi: koruma haritası süpürmeden ÖNCEki listeden kurulur, yoksa süresi dolmuş çöpteki bir kaydın koruduğu satır bir tur gecikmeyle gider.
6. **Kıyas altınının tarih kırılganlığı.** 0127'nin dersi: altın dosyası üretilirken bugünün tarihi çıktıya giriyorsa kıyas bir sonraki gün kırılır; ayıklama yazılır.
7. **İşlem satırı bugün koşulsuz "çözülü" sayılıyor.** `maliyetKalemleriOzeti`'nde işlem satırı `cozuldu: true` döndürür ve toplamı "girilmedi" yapan tek şart `malzemeEksik`'tir (Ölçüm C). R15'i yazmadan bu motorda uygulamak imkânsızdır; `islemEksik` eklenmezse çözülemeyen katalog kalemi sessizce atlanır ve maliyet **düşük** çıkar.
8. **Eski istemci bağı siler, maliyeti düşürür.** `maliyetKalemleri.gecerliTur` yalnız iki `tur` değerini geçirir (Ölçüm A) ve `kalemFormu`'nun else dalı tanımadığı kalemi serbest şekle çevirir, `kalemlerDogrula` adsız kalemi reddeder (Ölçüm B). Yani güncellenmemiş bir bilgisayarda hem rakam düşer hem düzenleme bağı yok eder; R26/2 bunu sürüm notuna yazdırır.
9. **Parçanın kendi maliyet geçmişi ikinci bir kaynak olur.** `tekilMaliyetKurus` kalem yolunu yalnız malzeme kalemi varken kullanıyor (Ölçüm F) ve `maliyetGecmisiYaz`'ın kapısı yalnız malzeme kalemine bakıyor (Ölçüm G); yalnız katalog bağlı işlem kalemi olan parça katalogdan türeyen bir rakamı kendi geçmişine yazar ve ondan okur. R29 kapıyı genişletir.
10. **Konumlu beşinci parametre sessiz kayıptır.** `parcaMaliyetKurus` on iki yerde çağrılıyor ve bir yerde zaten `undefined` yer tutucu var (Ölçüm I); unutulan parametre hata vermez, "girilmedi" döner ve testler yeşil kalır. R30'un taraması ve tek bağlam kurucusu bu yüzden zorunlu.
11. **0132'nin zam önizlemesi karma parçayı kaçırır.** `malzeme.fiyatEtkisi` iki hâli katalogsuz okuyor (Ölçüm J); hem malzeme hem katalog işlem kalemi taşıyan parça iki hâlde de null çözülür ve "maliyeti değişecek parça" sayısına girmez. R32 bunu bir gerileme düzeltmesi olarak yazar.
12. **Kartın iki metni yanlışa döner.** `ISLEM_ZAM_IBARESI` "işlem tutarları sabittir" diyor ve `KALEM_BOS_METNI` "işlem kalemi … sabit tutardır" diyor (Ölçüm R); ikisi de bu spec'ten sonra ekranda kurulan zincirin tersini söyler. R19/2 ikisini birden kapsar.

### QA turunda ölçülenler (2026-11-08)

Hepsi HEAD'deki kodda doğrulandı.

- **Ölçüm A.** `src/lib/maliyetKalemleri.js` `gecerliTur` yalnız `"malzeme"` ve `"islem"` değerlerini geçirir; `kayitliKalemler` tanınmayan türdeki öğeyi diziden atar. Üçüncü bir `tur` değeri eski istemcide kalemi tamamen düşürür.
- **Ölçüm B.** `urunAgaci.js` `kalemFormu` malzeme dışındaki her türü serbest işlem şekline çevirir (`{ ad: "", tedarikciId: "", tutar: "" }`) ve `kalemlerDogrula` adsız işlem kalemini `ISLEM_AD_HATASI` ile reddeder. Eski istemcide böyle bir parçanın düzenlenmesi kataloğ bağını siler ya da kaydı engeller.
- **Ölçüm C.** `urunAgaci.js:46-66` `maliyetKalemleriOzeti`'nde işlem satırı `cozuldu: true` döndürür (`return { tur: KALEM_TUR.ISLEM, tutarK: bos ? null : kurus(k.tutar), bos, cozuldu: true }`); toplamı null yapan tek şart `malzemeEksik`'tir; boş tutarlı satır `katkili`'ye girmez ve toplama katılmaz.
- **Ölçüm D.** `malzeme.js:227` `malzemeOzeti` boy fiyatı dalında `hamKg: null, fireliKg: null` döner; özgül ağırlığı girilmemiş ve ölçüsü eksik dallarda da ağırlık çözülmez. Yani ağırlık her malzeme kaleminde yok.
- **Ölçüm E.** `siparisIhtiyaci.js:281` `const netKg = ks.parcalar.reduce((a, p) => a + p.hamKg * p.adet, 0)`, yani 0134'ün `netKg`'si **ham** ağırlıkların toplamıdır; `siparisRaporu.js:24` onu "net" diye basar ve boy yöntemli kesitte `NEDEN_BOY_YONTEMI` ile kilo yoktur.
- **Ölçüm F.** `urunAgaci.js:94-101` `tekilMaliyetKurus` kalem yolunu yalnız `kalemler.some(k => k.tur === KALEM_TUR.MALZEME)` iken kullanır; yalnız işlem kalemi olan parça `maliyetGecmisi` dalına düşer.
- **Ölçüm G.** `maliyetGecmisiYaz`'ın kapısı `malzeme = malzemeKalemiVarMi(temel)` (`urunAgaci.js:184` `gecmisliKayit`, `PartManager.jsx:462`); `gecmisliKayit` `parcaMaliyetKurus(temel)`'i katalogsuz, `maliyetGecmisiSatirlari` `bugunkuKurus(p)`'u `malzemeKat`'sız çağırır.
- **Ölçüm H.** Adet için doğrulayıcı var (`urunAgaci.js:247` `kalemAdediDogrula`, 1..1.000 tam sayı), kilo için hiç yok. `malzeme.js:278` `alanDogrula` belirsiz sayıyı, negatifi, sıfırı ve üst sınırı tek yerde çözüyor; `malzemeDogrula`'nın `kiloFiyati` alanı bu yoldan geçtiği için AC-10 ve AC-11'in ikizi hazır.
- **Ölçüm I.** `parcaMaliyetKurus` bugün dört parametreli (`p, tarih, katalog, malzemeKat`) ve altı dosyada on iki kez çağrılıyor; `parcaAktarma.js:195` zaten `undefined` yer tutucu geçiyor.
- **Ölçüm J.** `malzeme.js:416-437` `fiyatEtkisi` iki hâli `parcaMaliyetKurus(p, undefined, setKat, katEski/katYeni)` ile okur; işlem kataloğu geçmediği için karma parça iki hâlde de `null` çözülür.
- **Ölçüm K.** `urunAgaci.js:121` `setOzeti(icerik, katalog, tarih, malzemeKat, fiyatOku)` bileşenin maliyetini `tekilMaliyetKurus(b, tarih, malzemeKat)` ile çözer; iki çağıranı `PartManager.jsx:493` ve `parcaAktarma.js:202`.
- **Ölçüm L.** Malzeme kaleminde birim kuruşa yuvarlanıp adetle çarpılıyor (`urunAgaci.js:52` `oz.maliyetK * adet`); 0134 Karar 34 ondalık kitte satırı bir kez daha yuvarlıyor (`makinaStandartMaliyet.js:214` `Math.round(birimK * adet)`).
- **Ölçüm M.** Tedarikçi koruması dört kapıda tek haritadan okunuyor: `Tedarikciler.jsx:61,94`, `SettingsTrash.jsx:222`, `:223`, `App.jsx:1116`. Red metni `gider.KALEMDE_TEDARIKCI_NEDENI` yalnız "Ayarlar › Katalog › Parça/Yedek Parça" adresini gösteriyor.
- **Ölçüm N.** Malzeme koruması **üç** kapıda: `SettingsTrash.jsx:238` Kalıcı Sil, `:315` çöpü boşalt, `App.jsx:1119` otuz gün. Geri almada yalnız `copKutusu.geriAlmaAdCakismasi` var, çöpe atma koşulsuz. Satır etiketi `malzemeCopEtiketi` ("ad · alaşım").
- **Ölçüm O.** `tests/fixtures/0132-yeni-bolum.js` → `tests/fixtures/0133-yeni-ayar.js` zinciri dokuz test dosyasında kullanılıyor; `cop-kutusu-0078.test.js:39` `expect(tablolar).toHaveLength(23)`; `yedek-paketleri-0086` paket listesi ile geri yükleme dalının eşitliğini satır bazlı ölçüyor.
- **Ölçüm P.** `makinaStandartMaliyet.js:300-316` `tarihliDirekt` haritaları `katalog.parts` ve `katalog.malzemeler`'den tembel kuruyor; `MakinaMaliyeti.jsx:53` `parcaKatalogu = { parts, malzemeler, standardModels, customModels }`; `tests/donan-maliyet-0136-cagri.test.js` donmuş partide iki motorun çağrılmadığını casusla ölçüyor.
- **Ölçüm R.** `urunAgaci.js:318` `ISLEM_ZAM_IBARESI` ve `:321` `KALEM_BOS_METNI` işlem kaleminin sabit tutarlı olduğunu söylüyor; `MaliyetKalemleriAlani.jsx:140` zam ibaresini `islemSayi > 0` iken çiziyor.
- **Ölçüm S.** `MaliyetKalemleriAlani.jsx:141` karma ibareyi `islemSayi > 0 && malzemeSayi > 0` iken çiziyor; malzeme kalemi olmayan ve yalnız serbest işlem kalemi olan parçada bugün çizilmiyor.
- **Ölçüm T.** `SettingsExport.jsx:360-361` katalogları kendi kuruyor; `SettingsImport.jsx:180` `parcaSatirlariniCoz(rows, parts, Date.now(), yerelBugun(), malzemeler, fiyatAyarlari)` ile altı parametre geçiyor; `Settings.jsx`'te malzeme altı noktada (79, 236, 290, 298, 361, 408) ve biri `rawMalzemeler`.
- **Ölçüm U.** Malzeme panelinde üç gösterge var: `eksikMalzemeSayisi` + `EKSIK_ROZETI`, satır başına `malzemeKullanimi` + `kullanimMetni`, silme onayında kullanım cümlesi.
- **Ölçüm V.** 0133 R16, `malzeme.fiyatEtkisi`'nin beşinci parametresi ve `fiyatEtkiMetni` ile malzeme fiyat penceresine satış fiyatı satırını eklemiş.
- **Ölçüm Y.** `malzeme.js:82` `FIYAT_ALANLARI` ve modül içi `kumeBosMu` fiyat kümesini ve "boş küme"yi tek yerde tanımlıyor; `fiyatGecmisiYaz` ikisini birden okuyor.
- **Ölçüm Z.** `malzeme.js:312` `adCakisiyorMu` ve `copKutusu.js:8` `geriAlmaAdCakismasi` çöpteki kayıtları saymaz (`!x.deletedAt`), yani tekillik yalnız canlılar arasında.
- **Ölçüm AA.** `maliyetKalemleri.MALIYET_KALEM_SINIRI` 20 ve `urunAgaci.KALEM_SINIRI_NEDENI` kalem sayısını türe bakmadan sayıyor.
- **Ölçüm AB.** `kilitAlanlari.js:57` `AYAR_KILITLI` panel kimliklerini, `:44-48` `ayar.pencereler` iki malzeme dosyasını taşıyor; `tests/kilit-alanlari.test.js` `BLOB_SECTIONS`'tan setter adlarını türetip `src/components` altını tarıyor.
- **Ölçüm AC.** `MalzemeManager.jsx:107,114` ve `MalzemeFiyatPenceresi.jsx:41` `entity: "malzeme"` ile dört eylem yazıyor (`olusturuldu`, `duzenlendi`, `silindi`, `fiyat_guncellendi`); etiket `SettingsAuditLog.jsx:14`'te ve `tests/islem-gecmisi-etiketleri.test.js` eksik etikette kırılıyor.

### QA turunda verilen kararlar (2026-11-08)

1. **Kalıcı adlar ve şekiller yazıldı** (Bloklayıcı). C8 kod adını istiyordu ama adı vermiyordu. Karar: bölüm `disIslemler`, tablo `dis_islemler`, motor `src/lib/disIslem.js`, panel kimliği `disislemler`, kilit `ayar:disislemler`, kayıt ve kalem şekli yazılı; parçaya yeni sütun açılmaz. İşlendi: R27, R27/2.
2. **Çeşidin ayırt edicisi `islemId`'nin varlığıdır ve karışık sürümdeki veri kaybı sürüm notuna yazılır** (Bloklayıcı). Üçüncü bir `tur` değeri açılmaz; güncellenmemiş bilgisayarda maliyet sessizce düşer ve o bilgisayardaki düzenleme bağı siler. İşlendi: R10/2, R27/2, R26/2.
3. **R15 için motora `islemEksik` eklenir ve iki "boş"un ayrımı yazılır** (Bloklayıcı). Bugünkü koşulsuz `cozuldu: true` davranışı R15'i uygulanamaz kılıyordu; çözülemeyen hâllerin tam listesi de yazıldı. İşlendi: R15/2, R15/3.
4. **Kilo tabanının çözülemediği üç hâl R14'e eklendi** (Bloklayıcı): boy yöntemi, özgül ağırlık, eksik ölçü; nedenleri ekranda ayrı metinle. İşlendi: R14/2, Context "Kilo tabanı".
5. **Kavramın adı `islenmisKg`, yardımcı `malzeme.js`'e** (Bloklayıcı). "Net ağırlık" adı 0134'te dolu. İşlendi: R28, Context "Kilo tabanı".
6. **Tarihli okumanın kapısı genişletilir ve üç katalogsuz çağrı düzeltilir** (Bloklayıcı): parçanın kendi geçmişi, malzeme kalemi **ya da** katalog bağlı işlem kalemi varken ne yazılır ne okunur. İşlendi: R29, R29/2.
7. **Kilo miktarının doğrulaması yazıldı** (Bloklayıcı): boş serbest, belirsiz sayı ve negatif ve sıfır reddedilir, üst sınır 10.000 kg, en çok üç ondalık. İşlendi: R13/2.
8. **Beşinci parametre konumlu kalır, iki koruma eklenir** (Önemli): kaynak taraması ve tek bağlam kurucusu. İşlendi: R30.
9. **`malzeme.fiyatEtkisi` yeni katalogu alır** (Önemli), parametresiz çıktı birebir kalır. İşlendi: R32.
10. **`setOzeti` yeni katalogu alır ve `tekilMaliyetKurus`'a iletir** (Önemli). İşlendi: R33.
11. **Kullanılan işlemin birimi değiştirilemez** (Önemli), 0024 R16 emsali. İşlendi: R2/2.
12. **Yuvarlama noktası yazıldı** (Önemli): birim kuruşa bir kez, sonra miktar, ondalık miktarda satır bir kez daha. İşlendi: R31.
13. **Tedarikçi korumasının dört kapısı, hazır haritası ve ikinci red metni yazıldı** (Önemli). İşlendi: R22/2.
14. **R21 "dört kapı" değil üç kapıdır** (Önemli); çöpe atma koşulsuz, geri alma silme kapısı değil. İşlendi: R21.
15. **Bekçi zinciri ve iki sayı iddiası güncellenir** (Önemli): `tests/fixtures/0137-yeni-bolum.js`, dokuz test dosyası, çöp tablosu sayısı, yedek paketi eşitliği. İşlendi: C11, DoD.
16. **Makina Maliyeti'nin kataloğu yeni diziyi taşır, tembellik ölçülür** (Önemli). İşlendi: R34.
17. **Kartın iki metni de koşullu olur** (Önemli): zam ibaresi ve boş durum metni. İşlendi: R19/2.
18. **Karma ibarenin koşulu bugünkü iddianın ikizine indirildi** (Önemli): `serbestSayi > 0 && malzemeSayi > 0`; AC-53 daraltıldı. İşlendi: R19/3, AC-52, AC-53.
19. **Context'in çağrı yeri tablosuna üç satır eklendi** (Önemli): iki Excel ekranı ve `Settings`'in altı noktası. İşlendi: Context tablosu, R35.
20. **Panelin üç göstergesi yazıldı** (Önemli): eksik rozeti, kullanım sayısı, çöpe atma onayının uyarısı. İşlendi: R1/2.
21. **Etki önizlemesi satış fiyatı satırını da taşır** (Önemli), 0133 simetrisi. İşlendi: R8/2.
22. **Fiyat kümesinin alanları ve "boş küme" tanımı yazıldı** (Küçük); birim kümeye girmez. İşlendi: R9/2.
23. **Birim fiyatı 0 çözülür, yalnız boş değer çözülemez** (Küçük). İşlendi: R15/4.
24. **Ad tekilliği yalnız canlılar arasında** (Küçük). İşlendi: R4/2.
25. **Katalog işlemi arama kutusundan seçilir; katalog boşken neden satırı** (Küçük). İşlendi: R10/3.
26. **İşlemin tedarikçisi parça kartında gösterilmez** (Küçük), 0135 C6/2 gizliliği. İşlendi: R10/4.
27. **Kaynak ibaresi iki çeşidi ayırmaz, metin aynen kalır** (Küçük). İşlendi: R20/2.
28. **Kalem sınırı 20 kalır ve iki çeşidi birlikte sayar** (Küçük). İşlendi: R10/5.
29. **Çöp Kutusu satırının etiketi "ad · birim"** (Küçük); tedarikçinin adı yazılmaz. İşlendi: R23/2.
30. **Kalem çeşidi değişiminde onay sorulur** (Küçük); onay açıkken kartın Escape'i çalışmaz. İşlendi: R17/2.
31. **Kilit iki satırla uygulanır** (Küçük): `AYAR_KILITLI` ve `ayar.pencereler`. İşlendi: R24/2.
32. **İşlem Geçmişi entity'si `dis_islem`, etiketi "Dış İşlem"** (Küçük); yeni eylem adı açılmaz. İşlendi: R24/3.

### QA turu karar kaydı (2026-11-08)

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Kalıcı adlar ve şekiller yazılı değil | Bloklayıcı | Adlar ve şekiller yazıldı | R27, R27/2 |
| 2 | Çeşidin ayırt edicisi tanımsız, karışık sürümde kayıp yazılmamış | Bloklayıcı | `islemId` varlığı, sürüm notuna iki cümle | R10/2, R27/2, R26/2 |
| 3 | R15 motorun bugünkü davranışıyla çelişiyor, iki "boş" ayrılmamış | Bloklayıcı | `islemEksik` ve tam liste | R15/2, R15/3 |
| 4 | Kilo tabanının çözülemediği hâller eksik | Bloklayıcı | Üç hâl eklendi | R14/2 |
| 5 | "Net ağırlık" adı 0134'te dolu | Bloklayıcı | `islenmisKg`, yardımcı `malzeme.js` | R28 |
| 6 | Tarihli okumanın kapısı tanımsız, üç çağrı katalogsuz | Bloklayıcı | Kapı genişletilir, çağrılar düzeltilir | R29, R29/2 |
| 7 | Kilo miktarının doğrulaması yok | Bloklayıcı | Beş kural yazıldı | R13/2 |
| 8 | Beşinci konumlu parametre sessiz kayıp | Önemli | Tarama ve tek kurucu | R30 |
| 9 | 0132 zam önizlemesi karma parçayı kaçırır | Önemli | Katalog isteğe bağlı eklenir | R32 |
| 10 | `setOzeti` imzası yazılmamış | Önemli | Katalog eklenir | R33 |
| 11 | Birim serbestçe değiştirilebiliyor | Önemli | Kullanılan işlemde değiştirilemez | R2/2 |
| 12 | Yuvarlama noktası yazılmamış | Önemli | İki aşamalı yuvarlama | R31 |
| 13 | Tedarikçi korumasının kapıları ve metni yarım | Önemli | Dört kapı, harita, ikinci metin | R22/2 |
| 14 | R21'in "dört kapı"sı yanlış | Önemli | Üç kapı olarak düzeltildi | R21 |
| 15 | Dokuz bekçi testi ve iki sayı iddiası | Önemli | Fikstür zinciri ve DoD maddesi | C11 |
| 16 | 0136 kataloğu ve tembelliği | Önemli | Katalog taşınır, casus ölçer | R34 |
| 17 | Kartın iki metni yanlışa döner | Önemli | İkisi de koşullu | R19/2 |
| 18 | AC-52 ve AC-53 çizim koşuluyla çelişiyor | Önemli | Koşul bugünkü ikizine indirildi | R19/3, AC-52, AC-53 |
| 19 | Çağrı yeri tablosu iki ekranı atlıyor | Önemli | Üç satır eklendi | Context tablosu, R35 |
| 20 | Panelin göstergeleri yazılmamış | Önemli | Üç gösterge | R1/2 |
| 21 | Etki önizlemesinde fiyat satırı yok | Önemli | Satır eklenir | R8/2 |
| 22 | Fiyat kümesinin alanları yazılmamış | Küçük | Üç alan, birim hariç | R9/2 |
| 23 | Sıfır fiyat ile boş fiyat ayrımı | Küçük | Sıfır çözülür | R15/4 |
| 24 | Ad tekilliğinin kapsamı | Küçük | Yalnız canlılar | R4/2 |
| 25 | Seçicinin biçimi | Küçük | Arama kutusu, boşta neden | R10/3 |
| 26 | Tedarikçi parça kartında görünsün mü | Küçük | Gösterilmez | R10/4 |
| 27 | Kaynak ibaresi çeşit ayırsın mı | Küçük | Ayırmaz | R20/2 |
| 28 | Kalem sınırı | Küçük | 20, birlikte sayar | R10/5 |
| 29 | Çöp satırının etiketi | Küçük | "ad · birim" | R23/2 |
| 30 | Çeşit değişiminde veri kaybı sessiz | Küçük | Onay sorulur | R17/2 |
| 31 | Kilit satırları yazılmamış | Küçük | İki satır | R24/2 |
| 32 | Denetim izinin entity'si ve etiketi | Küçük | `dis_islem` / "Dış İşlem" | R24/3 |

---

## Acceptance Criteria

### Katalog paneli

- **AC-1.** Ayarlar › Katalog listesinde "Dış İşlemler" öğesi, Malzemeler'den sonra altıncı sırada görünür.
- **AC-2.** Katalog boşken panelde tablo çizilmez, yerine boş durum kutusu çıkar.
- **AC-3.** Adı boş bırakılan işlem kaydedilmez ve ad alanının altında neden yazılır.
- **AC-4.** Katalogda "ISIL İŞLEM" varken "ısıl işlem" adıyla ikinci bir işlem kaydedilmez; neden ad alanının altında yazılır.
- **AC-5.** Düzenlenen işlemin kendi adı çakışma sayılmaz; adı değiştirmeden kaydetmek geçer.
- **AC-6.** Birim seçicisinin iki değeri vardır (adet, kilo) ve yeni kayıtta adet seçilidir.
- **AC-7.** Para birimi TL iken kayıtta para birimi alanı yazılmaz.
- **AC-8.** Para birimi USD seçilip kur boş bırakılırsa kayıt reddedilir ve neden kur alanının altında yazılır.
- **AC-9.** Para birimi EUR, kur 48 ve birim fiyatı 12 olan bir işlem kaydedilir ve listede "12,00 €" olarak görünür.
- **AC-10.** Birim fiyatı alanına tek noktalı ve noktadan sonra üç haneli virgülsüz bir sayı ("2.955") yazılırsa kayıt reddedilir ve belirsiz sayı nedeni yazılır.
- **AC-11.** Negatif birim fiyatı reddedilir.
- **AC-12.** Gider yetkisi olan kullanıcıda tedarikçi seçicisi çizilir; hammadde işaretli tedarikçiler listenin başında gelir.
- **AC-13.** Gider yetkisi olmayan kullanıcıda tedarikçi seçicisi çizilmez ve o kullanıcı işlemi kaydettiğinde kayıttaki tedarikçi bağı aynen korunur.
- **AC-14.** İşlem kartının düzenlemesi kaydedildiğinde birim fiyatı, para birimi ve kur değişmemiş olarak kalır.

### Fiyat güncelleme ve geçmiş

- **AC-15.** "Fiyatı Güncelle" penceresi kur alanını kayıtlı kurla açar.
- **AC-16.** Günün kuru alınabiliyorsa ipucunda yazar ve bir düğmeyle alana gelir.
- **AC-17.** Günün kuru alınamadıysa nedeni yazar ("henüz alınmadı" ile "çevrimdışı" ayrı metinler) ve kayıt engellenmez.
- **AC-18.** Fiyatı 20 TL olan ve iki parçada geçen bir işlemin fiyatı 25 TL'ye çekilince pencere kaydetmeden önce etkilenen parça sayısını ve her birinin maliyet değişimini gösterir.
- **AC-19.** Hiç parçada geçmeyen bir işlemin fiyat güncellemesinde etki önizlemesi sıfır parça yazar ve kayıt yine yapılabilir.
- **AC-20.** Fiyatı ilk kez girilen işlemde geçmiş kaydı doğmaz.
- **AC-21.** Fiyatı 20'den 25'e çıkarılan işlemde geçmişe bir satır yazılır ve o satır eski kümeyi (20) taşır.
- **AC-22.** Aynı gün ikinci kez fiyat değiştirilirse geçmişe ikinci satır eklenmez, son satır güncellenir.
- **AC-23.** Yalnız kur değişirse de geçmişe satır yazılır.
- **AC-24.** Geçerlilik tarihi yarın verilirse kayıt reddedilir ve neden yazılır.
- **AC-25.** Fiyat kümesi değişmeyen bir kayıtta geçmiş aynen kalır.

### Parçanın işlem kalemi

- **AC-26.** Parça kartında işlem kalemi eklerken çeşit seçilir: katalog bağlı ya da serbest.
- **AC-27.** Katalog bağlı kalemde işlem arama kutusundan seçilir ve seçilen işlemin birimi ile birim fiyatı kalemin yanında salt okunur gösterilir.
- **AC-28.** Birimi adet olan işlem seçilince miktar alanı 1 ile açılır.
- **AC-29.** Birim fiyatı 20 TL olan adet birimli bir işlemden 3 adet, parçanın maliyetine 60 TL ekler.
- **AC-30.** Birim fiyatı 2 USD, kuru 50 olan adet birimli bir işlemden 1 adet, parçanın maliyetine 100 TL ekler.
- **AC-31.** Miktarı 0 ya da ondalık girilen adet birimli kalem reddedilir ve neden kalemin altında yazılır.
- **AC-32.** Miktarı 1.001 girilen adet birimli kalem reddedilir.
- **AC-33.** Kilo birimli bir işlemde miktar alanı boş bırakılabilir ve yer tutucusu parçanın ağırlığından türeteceğini söyler.
- **AC-34.** Kilo başı 30 TL olan bir işlem, net ağırlığı 2 kg olan tek malzeme kalemli bir parçaya 60 TL ekler.
- **AC-35.** Aynı işlem, net ağırlığı 2 kg olan ve adedi 3 olan malzeme kalemli parçaya 180 TL ekler.
- **AC-36.** Aynı parçada iki malzeme kalemi varsa kilo tabanı ikisinin net ağırlıklarının toplamıdır.
- **AC-37.** Kilo tabanı net ağırlıktır: işleme payı ve fire tabana girmez (aynı kalemin ham ve fireli ağırlığıyla karşılaştırılarak ölçülür).
- **AC-38.** Kilo birimli kalemin miktarı 5 girilirse parçanın ağırlığı yok sayılır ve 5 kilo üzerinden hesaplanır.
- **AC-39.** Kilo birimli, miktarı boş kalem, malzeme kalemi olmayan bir parçada çözülemez ve parçanın maliyeti "girilmedi" olur.
- **AC-40.** Katalog bağlı kalemin işlemi çöpe atılırsa parçanın maliyeti "girilmedi" olur; eski tutar ya da sıfır gösterilmez.
- **AC-41.** Fiyatı girilmemiş bir işlemin kalemi parçanın maliyetini "girilmedi" yapar.
- **AC-42.** Para birimi tanınmayan bir işlemin kalemi parçanın maliyetini "girilmedi" yapar.
- **AC-43.** Bir parçada bir katalog bağlı kalem çözülemiyorsa, öteki kalemleri çözülse de parçanın maliyeti bütünüyle "girilmedi" olur.
- **AC-44.** Katalog bağlı ve serbest kalem aynı parçada yan yana durur ve ikisinin tutarı toplanır.
- **AC-45.** Serbest kalemin tutarı boş bırakılırsa uyarı yazılır, kayıt engellenmez ve o kalem toplama girmez.
- **AC-46.** Bir kalemin çeşidi serbestten katalog bağlıya çevrilince serbest alanları (ad, tedarikçi, tutar) kayıttan silinir.
- **AC-47.** Bir kalemin çeşidi katalog bağlıdan serbeste çevrilince işlem bağı ve miktar kayıttan silinir.
- **AC-48.** Parça kartının canlı maliyet özeti ile kaydedilen parçanın listedeki maliyeti aynı rakamı gösterir.

### Tarihli okuma

- **AC-49.** Fiyatı 2026-06-01'de 20, 2026-09-01'de 25 olan bir işlemin kalemi, 2026-07-15 tarihli bir sorguda 20 ile hesaplanır.
- **AC-50.** Aynı kalem tarihsiz sorguda bugünkü fiyatla (25) hesaplanır.
- **AC-51.** Serbest işlem kalemi tarihli sorguda da bugünkü sabit tutarıyla girer.
- **AC-52.** Parçada yalnız katalog bağlı işlem kalemi varsa (malzeme kalemi olsun ya da olmasın) parça kartındaki karma okuma ibaresi çizilmez.
- **AC-53.** Parçada en az bir **serbest** işlem kalemi **ve** en az bir malzeme kalemi varsa o ibare çizilir; yalnız serbest işlem kalemi olan parçada bugünkü gibi çizilmez (QA turu, karar 21; bugünkü koşulun birebir ikizi, Ölçüm S).
- **AC-54.** Kapanmış bir partinin donmuş maliyeti, işlem fiyatı sonradan değişse de değişmez (0136 ile çapraz).

### Koruma, çöp kutusu, tüketiciler

- **AC-55.** Bir parçanın işlem kaleminde geçen işlem çöpe atılabilir.
- **AC-56.** Çöpteki o işlem kalıcı silinemez; satırda nedeni yazar.
- **AC-57.** Çöpü boşaltmak o işlemi silmez ve bitiş bildirimi bırakılan kayıt sayısını yazar.
- **AC-58.** Otuz günlük otomatik temizlik o işlemi silmez.
- **AC-59.** Yalnız çöpteki bir parçanın kaleminde geçen işlem de korunur.
- **AC-60.** Hiçbir parçada geçmeyen çöpteki işlem kalıcı silinir.
- **AC-61.** Çöpten geri alınırken aynı adda canlı bir işlem varsa geri alınmaz ve nedeni yazılır.
- **AC-62.** Katalog işleminin tedarikçisi, tedarikçi silme penceresindeki kullanım sayısına girer.
- **AC-63.** O tedarikçi kalıcı silinemez ve nedeni yazar.
- **AC-64.** Model Maliyetleri, katalog bağlı işlem kalemi taşıyan parçanın maliyetini işlem bedeliyle birlikte gösterir.
- **AC-65.** 0133'ün maliyete bağlı satış fiyatı, işlem fiyatı değişince kendiliğinden değişir.
- **AC-66.** Excel dışa aktarması katalog bağlı işlem kalemi olan parçanın çözülmüş maliyetini yazar.
- **AC-67.** Excel içe aktarması o parçanın maliyet hücresini kayda yazmaz ve rakam farklıysa satır numarasıyla bildirir.

### Veri, yetki, kıyas

- **AC-68.** İşlem kataloğu kaydedilip uygulama yeniden açıldığında bütün alanları (ad, birim, birim fiyatı, para birimi, kur, tedarikçi, geçmiş) korunur.
- **AC-69.** Girilmemiş alan kaydedilen gövdede anahtar olarak bulunmaz.
- **AC-70.** Boş katalog kaydedildiğinde gövdede bölüm anahtarı durur ve sunucu sahte değişiklik görmez.
- **AC-71.** Temiz kurulumda panel açılır ve boş durum çizilir.
- **AC-72.** Çakışma birleştirmesinde bu bilgisayarda eklenen işlem korunur.
- **AC-73.** Birleştirmede yeniden kimliklendirilen bir işlemin kimliği, ona bağlı parça kalemlerinde de güncellenir.
- **AC-74.** Birleştirmede yeniden kimliklendirilen bir tedarikçinin kimliği işlem kaydında da güncellenir.
- **AC-75.** Yedek dosyasının "Tanımlar" paketi işlem kataloğunu geri yükler ve paket cümlesi onu sayar.
- **AC-76.** Ayarlar sekmesi olmayan bir kullanıcının yazımı işlem kataloğuna dokunduğunda sunucu reddeder.
- **AC-77.** Ayarlar sekmesi olan kullanıcı yeni eylem izni olmadan işlem ekleyebilir.
- **AC-78.** Panel başka bir kullanıcıda açıkken ikinci kullanıcıya kilit uyarısı çıkar.
- **AC-79.** Fiyat güncelleme penceresi panelin kilidini paylaşır.
- **AC-80.** Katalog bağlı işlem kalemi olmayan bir veride maliyet, satış fiyatı, Model Maliyetleri, Parti Hesabı ve Excel çıktıları spec öncesi altınla birebir aynıdır.
- **AC-81.** İşlem bedelinden tutar türeten çarpım kaynakta tek dosyada geçer (kaynak taraması).
- **AC-82.** Yeni kavramın kod adı denetim izi, izin ekranı ve kasa hareketleriyle karışmaz (kaynak taraması).
- **AC-83.** Panelin ve pencerenin bütün kullanıcıya görünen metinleri Türkçedir.

### QA turu kriterleri (2026-11-08)

**Alan, şekil ve veri**

- **AC-84.** Kaynakta bölüm adı `disIslemler`, tablo `dis_islemler`, Ayarlar paneli kimliği `disislemler` ve motor dosyası `src/lib/disIslem.js` olarak geçer (kaynak taraması).
- **AC-85.** Kaydedilen katalog işlemi R27'nin alanlarını taşır ve girilmemiş alan kaydedilen gövdede anahtar olarak bulunmaz.
- **AC-86.** Katalog bağlı kalem kayıtta `{ tur: "islem", islemId, miktar }` şeklindedir; serbest alanlar (`ad`, `tedarikciId`, `tutar`) o kalemde bulunmaz.
- **AC-87.** `parts` tablosuna yeni sütun eklenmedi; kalem var olan `maliyetKalemleri` JSON'unun içindedir (kaynak taraması).
- **AC-88.** `KALEM_TUR` iki değerde kalır; kaynakta üçüncü bir `tur` değeri yoktur (kaynak taraması).

**Motor ve çözülememe**

- **AC-89.** Katalog bağlı kalemi çözülemeyen parçada kalem özeti `islemEksik` döner ve toplam "girilmedi" olur.
- **AC-90.** Serbest kalemin boş tutarı `islemEksik` yapmaz; satır `bos: true` kalır, toplama girmez ve öteki kalemlerin toplamı bozulmaz.
- **AC-91.** Miktarı geçersiz (sıfır, negatif ya da sayı olmayan) katalog bağlı kalem parçanın maliyetini "girilmedi" yapar.
- **AC-92.** Birim fiyatı 0 olan işlemin kalemi çözülür ve parçanın maliyetine 0 TL ekler; birim fiyatı **boş** olan işlemin kalemi çözülemez.
- **AC-93.** Malzeme kalemi boy fiyatından hesaplanan parçada, miktarı boş kilo birimli kalem çözülemez ve nedeni "boy fiyatından hesaplanan malzemenin ağırlığı yok" yazar.
- **AC-94.** Malzemesinin özgül ağırlığı girilmemiş parçada aynı sonuç ve kendi nedeni yazılır.
- **AC-95.** Malzeme kaleminin ölçüsü eksik olan parçada aynı sonuç ve kendi nedeni yazılır.
- **AC-96.** Kilo tabanı `islenmisKg`dir ve `src/lib/malzeme.js`'ten gelir; dış işlem motorunda ağırlık çarpımı geçmez (kaynak taraması, 0132 C1 ile tutarlı).
- **AC-97.** Yeni kavram için kaynakta `netKg` adı kullanılmaz; 0134'ün `netKg`'si yerinde kalır (kaynak taraması).

**Miktar doğrulaması**

- **AC-98.** Kilo birimli kalemin miktarı boş bırakılabilir ve kayıt geçer.
- **AC-99.** Kilo miktarına "2.955" yazılırsa belirsiz sayı nedeniyle reddedilir.
- **AC-100.** Negatif kilo miktarı reddedilir.
- **AC-101.** Sıfır kilo miktarı reddedilir ve nedeni "sıfırdan büyük" der.
- **AC-102.** 10.001 kg reddedilir.
- **AC-103.** Dört ondalıklı kilo miktarı reddedilir (en çok üç ondalık).

**Yuvarlama ve tarihli okuma**

- **AC-104.** Birim fiyatı 0,335 TL olan adet birimli işlemden 3 adet, parçanın maliyetine **1,02 TL** ekler (birim bir kez kuruşa yuvarlanır; sondan yuvarlayan hesap 1,00 TL verirdi).
- **AC-105.** Birim fiyatı 0,33 TL olan kilo birimli işlemde 2,345 kg miktar **0,77 TL** ekler (satır sonucu ikinci kez kuruşa yuvarlanır).
- **AC-106.** Yalnız katalog bağlı işlem kalemi olan parçanın kendi maliyet geçmişine satır yazılmaz.
- **AC-107.** O parçada parça kartında geçerlilik tarihi alanı ve maliyet geçmişi listesi çizilmez; yerine nedeni yazılır.
- **AC-108.** O parçanın tarihli maliyeti kataloğun o tarihteki fiyatından gelir, parçanın kendi geçmişinden değil.

**Tüketiciler ve çağrı yerleri**

- **AC-109.** Hem malzeme hem katalog bağlı işlem kalemi taşıyan parça, malzeme zammının etki önizlemesindeki "maliyeti değişecek parça" sayısına girer.
- **AC-110.** `fiyatEtkisi` yeni seçeneği verilmeden çağrıldığında çıktısı spec öncesi altınla birebir aynıdır.
- **AC-111.** Bileşeninde katalog bağlı işlem kalemi olan setin maliyeti çözülür.
- **AC-112.** Tamamen donmuş bir partide dış işlem motoru çağrılmaz (casus; 0136 AC-19'un ikizi).
- **AC-113.** Excel dışa aktarma katalog bağlı işlem kalemi olan parçanın çözülmüş maliyetini yazar ve içe aktarma o hücreyi kayda yazmaz; iki ekran da yeni katalogu geçirir.
- **AC-114.** Çöp Kutusu ham diziyi aldığı için çöpteki işlemleri çizer.
- **AC-115.** `parcaMaliyetKurus`, `parcaMaliyetiVar`, `maliyetGirildiMi` ve `setOzeti` çağrılarının hepsi yeni katalogu taşır (kaynak taraması, gerekçeli istisna listesi tam yollu).

**Ekran**

- **AC-116.** Panel başlığında fiyatı girilmemiş işlem sayısı rozeti görünür; hepsinin fiyatı girilmişse rozet çizilmez.
- **AC-117.** Panel satırında işlemin kaç parçanın maliyet kaleminde geçtiği yazar.
- **AC-118.** Çöpe atma onayı o sayıyı ve "bu parçaların maliyeti girilmedi olur" uyarısını yazar.
- **AC-119.** Bir parçanın kaleminde geçen işlemin birim seçicisi pasif ve nedenlidir; hiç kullanılmayan işlemde etkindir.
- **AC-120.** Zam ibaresi (`ISLEM_ZAM_IBARESI`) yalnız serbest işlem kalemi varken çizilir; yalnız katalog bağlı kalemi olan parçada çizilmez.
- **AC-121.** Kalem listesinin boş durum metni iki çeşidi birden anlatır.
- **AC-122.** Katalog bağlı kalemde işlem arama kutusundan seçilir; katalog boşken seçici yerine neden satırı çizilir.
- **AC-123.** Seçilen işlemin tedarikçisi parça kartında görünmez.
- **AC-124.** Kalem çeşidi değişiminde silinecek alanda veri varsa onay sorulur ve onay açıkken Escape parça kartını kapatmaz.
- **AC-125.** Maliyetin kaynak ibaresinin metni spec öncesiyle birebir aynıdır.
- **AC-126.** Yirmi birinci kalem sınır nedeniyle reddedilir; sınır iki çeşidi birlikte sayar.
- **AC-127.** Fiyat güncelleme penceresi "n parçanın satış fiyatı değişecek" satırını taşır; değişen yoksa kendi metnini yazar.
- **AC-128.** Hiç kullanılmayan bir işlemin birimi değiştirilirse fiyat geçmişine satır yazılmaz (birim fiyat kümesine girmez).

**Koruma, çöp kutusu, kimlik**

- **AC-129.** Çöpteki işlemin Çöp Kutusu satırı "ad · birim" yazar ve tedarikçinin adını yazmaz.
- **AC-130.** Çöpte aynı adda bir işlem varken yeni işlem kaydedilir.
- **AC-131.** Katalog işleminin tedarikçisi dört kapıda birden korunur: Tedarikler'in silme düğmesi, Kalıcı Sil, çöpü boşalt ve otuz günlük temizlik.
- **AC-132.** O tedarikçinin red nedeni iki adresi birden söyler (parça kartı ve dış işlem kataloğu).
- **AC-133.** Panel ve fiyat güncelleme penceresi `ayar:disislemler` kilidini paylaşır ve kilit alanları listesinde yazılıdır.
- **AC-134.** İşlem Geçmişi'nde kayıt `dis_islem` entity'siyle ve "Dış İşlem" etiketiyle görünür; dört eylem adı bugünkülerdir.
- **AC-135.** Yeni bölüm dokuz bekçi testinde ayıklandı, çöp tablosu sayısı ve yedek paketi eşitliği güncellendi.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap React'sız saf motorda yazıldı ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Maliyet rakamını üreten bütün ekranlar aynı tek okuma yolunu kullanıyor (C1).
- [ ] Yeni kalıcı alanlar için dört nokta kuralı uygulandı ve `db-roundtrip` testine eklendi.
- [ ] Yeni veri bölümü için `BLOB_SECTIONS` + `SECTION_GROUP` + `BOLUM_SEKMELERI` + `MERGE_KEYS` + `App.mergeLocalIntoReloaded` satırı eklendi; yedek paketi, iki bölüm adı sözlüğü ve kimlik sayacı listesi güncellendi (C4).
- [ ] Yeni eylem izni **eklenmedi**; bu açıkça yazıldı ve sunucu bölüm eşlemesi Ayarlar sekmesine bağlandı.
- [ ] Çöp kutusu geri alma/temizleme simetrisi korundu; dört kapının hepsi aynı koruma yardımcısını okuyor.
- [ ] Kullanıcıya görünen tüm metinler Türkçe. Yazdırma çıktısı yok, çeviri anahtarı eklenmedi (bu açıkça yazıldı).
- [ ] Çoklu para kuralına uyuluyor; tanınmayan para birimi tanımlı biçimde ele alınıyor (AC-42).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi, boş ve hata durumları dâhil.
- [ ] Kıyas altını üretildi ve AC-80 onunla birebir geçti.
- [ ] Sürüm notu yazıldı (önce sunucu PC, R26).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi; 0135 X1'in kapandığı ve R35/4'ün koşullu hâle geldiği yazıldı.
- [ ] Yeni bölüm, önceki spec'lerin dokuz bekçisinde ayıklandı (`tests/fixtures/0137-yeni-bolum.js`); çöp tablosu sayısı ve yedek paketi eşitliği güncellendi (C11).
- [ ] Maliyetin tek okuma yolunun bütün çağrıları yeni katalogu taşıyor (kaynak taraması, R30) ve bağlam tek kurucudan geliyor.
- [ ] Ağırlık çarpımları yalnız `malzeme.js`'te, işlem bedelinin çarpımları yalnız yeni motorda (iki kaynak taraması, R28, C3).
- [ ] Tarihli okumanın kapısı genişletildi ve parçanın kendi maliyet geçmişiyle çakışmadığı ölçüldü (R29, R29/2).
- [ ] 0132'nin zam etki önizlemesinin karma parçayı kaçırmadığı ölçüldü; parametresiz çıktısı altınla birebir (R32, AC-109, AC-110).
- [ ] Kartın üç metninin (karma okuma, zam ibaresi, boş durum) koşulları yazıldı ve ölçüldü (R19, R19/2, R19/3).
- [ ] Çöp kutusunun üç kapısı ve tedarikçi korumasının dört kapısı aynı hazır haritayı okuyor (R21, R22/2).
- [ ] Yeni panel kilit alanları listesinde ve İşlem Geçmişi etiket haritasında (R24/2, R24/3).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin onayladığı iki nokta (2026-11-08)

**1. Birim kümesi: adet ve kilo (R2).** Analistin önerisi aynen kabul edildi. Dakika, saat ve m² kapsam dışı (X1), gerekçesi parçaya yeni ölçü girişi gerektirmesi.

**2. Ekran adı "Dış İşlemler" (C8).** Analistin önerisi aynen kabul edildi; "İşlemler" adı uygulamada üç kavramla çakışıyordu.

### Analistin kararı, onaya sunulan

QA turu (2026-11-08) bu iki kararı **doğruladı**, yalnız kavramın adını değiştirdi: kilo tabanının adı "net ağırlık" değil **`islenmisKg`**dir, çünkü "net" adı 0134'te ham ağırlık anlamında dolu (R28, Ölçüm E). Tabanın tanımı (işleme payı ve fire hariç) aynen durur; miktarın boş bırakılabilirliği de aynen durur ve çözülemediği hâller R14/2'ye yazıldı.

**3. Kilo tabanı işlenmiş ağırlıktır (R13, AC-37).** Gerekçe Context'te yazılı: dış işlem biten parçaya yapılır ve tedarikçi teslim edilen parçayı tartar; ham ve fireli ağırlık satın alınan çubuğun ağırlığıdır. **Önerim: işlenmiş ağırlık.** Alternatifi fireli ağırlıktır ve ölçülen örnekte yüzde 10,5 fazla çıkıyor. Ters karar verilirse R13, AC-34, AC-35, AC-36 ve AC-37 yeniden yazılır.

**4. Miktar boş bırakılabilir (R13).** Kilo biriminde boş miktar "parçanın ağırlığından türet" demektir ve dolu miktar elle geçersiz kılar. **Önerim: böyle kalsın**, çünkü malzeme kalemi olmayan parçada (dışarıdan hazır alınan ama işletilen parça) başka çıkış yolu yok ve aynı disiplin firede zaten var (parçada boşsa malzemeden, ikisi de boşsa sıfır).

### Plan turunda onaylanan kararlar (2026-11-08)

Takım Yöneticisi planın bütün önerilerini aynı gün onayladı. Spec'te yazılı olmayan ya da ölçümle düzeltilen noktalar:

**33. Tedarikçi koruması Giderler'e de iner (R35 düzeltmesi).** Tedarikler görünümü Ayarlar'da değil Giderler'dedir (`Giderler.jsx` → `gider/Tedarikciler.jsx`). App ham `disIslemler` dizisini Giderler'e ek olarak verir (onuncu bağlama noktası). Ham dizi gerekir: çöpteki işlem geri alınabildiği için tedarikçisi korunur (parçada da çöptekiler sayılıyor).

**34. `setOzeti`'nin konumu.** Yeni katalog beşinci parametredir, 0133'ün fiyat okuyucusu altıncıya kayar: `setOzeti(icerik, katalog, tarih, malzemeKat, islemKat, fiyatOku)`. `parcaMaliyetKurus` ile aynı konum düzeni korunur ve kaynak taraması tek kuralla yazılır. Kaynaktaki tek fiyat okuyuculu çağıran (parça kartı) ve `parca-fiyati-0133.test.js`'in iki satırı "spec 0137 ile" notuyla güncellenir.

**35. Türetilen kilo üç ondalığa yuvarlanır (R31'e ek).** Kilo birimli kalemde miktar boşsa parçanın işlenmiş ağırlığı `ucOndalik` ile üç ondalığa indirilir, sonra çarpılır. Elle girilen kilo en çok üç ondalıklıdır ve ekranda kilo üç ondalıkla gösterilir; böylece "gösterilen kilo × birim tutar = kalem tutarı" elle doğrulanabilir ve kayan nokta artığı satır yuvarlamasında kuruş kaydırmaz (0134 Karar 49 dersi). Yuvarlama sırası: kilo (üç ondalık), birim tutar (kuruş), satır (kuruş).

**36. İşlem seçilmemiş katalog kalemi kaydı engeller.** Metin "İşlem seçilmedi." (emsal `MALZEME_SECILMEDI`); kayda `islemId`'siz katalog kalemi yazılamaz.

**37. Yeni işlem kaleminin varsayılan çeşidi serbesttir.** Çeşit kalem satırındaki iki seçenekli bir seçiciyle ("Katalogdan" / "Serbest") değişir; bugünkü "İşlem kalemi ekle" davranışı ve 0135'in arayüz testleri aynen kalır. Formda çeşit geçici `_cesit` alanında tutulur (`_anahtar` gibi kayda yazılmaz), çünkü seçimi yapılmamış katalog kaleminin boş `islemId`'si serbest kalemden ayırt edilemez.

**38. Döngüsüz modül düzeni.** `disIslem.js` yalnız yaprak modülleri (`gecerlilik.js`, `gider.js`, `utils.js`, `tutarGirdisi.js`) içe alır; belirsiz sayı kuralı (`BELIRSIZ_DESEN`, `BELIRSIZ_HATASI`) bu yüzden `malzeme.js`'ten döngüsüz `tutarGirdisi.js`'e taşındı ve `malzeme.js` aynı adlarla yeniden dışa verir (uygulamada eklendi); kilo tabanını `urunAgaci` kurup parametre olarak verir. Zam önizlemesi ayrı `src/lib/disIslemEtkisi.js`'tedir (tek okuma yolunu ve satış fiyatını içe aldığı için `disIslem.js`'e konsa yeni bir döngü doğardı).

**39. Fiyat geçmişi yazıcısı dış işlem motorunun kendisinindir.** `malzeme.fiyatGecmisiYaz` beş alanlı kümeye bağlıdır ve genelleştirilmez (0132'nin testleri ve kıyası riske girmesin); `disIslem.js` aynı kuralları `gecerlilik.js`'in ortak tarih yardımcılarıyla uygular.

**40. Geçmiş kapısının seçeneği.** `maliyetGecmisiYaz` yeni `katalogIslem` seçeneği alır, kapı `set || malzeme || katalogIslem` olur; `malzeme` seçeneğinin anlamı değişmez. Üç çağıran ikisini birden geçirir.

**41. Kayıtta `birim` her zaman yazılır; boş kilo miktarında `miktar` anahtarı yazılmaz.** Birim iki değerli zorunlu alandır ("varsayılan yazılmaz" kuralı yalnız para biriminde yazılı); boş kilo miktarı C7 gereği gövdede anahtar olarak durmaz. AC-86'nın şekli "anahtar varsa sayı" diye ölçülür.

**42. Kalemde işlem değişince miktar.** Seçilen işlemin birimi öncekinden farklıysa miktar o birimin varsayılanına döner (adette "1", kiloda boş); birim aynıysa miktar korunur. Aksi hâlde "3 adet" sessizce "3 kilo" olurdu (R2/2'nin gerekçesi).

**43. Boy yöntemli malzemede kilo tabanı çözülemez (R14/2 aynen).** Özgül ağırlık girilmiş olsa da hesaplanmaz; spec'in kararı korunur.

**44. Değişen eski ekranlar `degisti` + onayla işlenir.** Boş durum metni (R19/2) yeniden yazıldığı için parça kartında boş kalem listesi gösteren eski ekranlar değişir; kayıtlar Takım Yöneticisi onay satırıyla `degisti` yazılır ve kapanışta `ayni`'ye çevrilir.

**45. Karışık sürüm uyarısı sürüm notunda belirgindir (R26/2).** Kodla önlenemez; plan §6'daki not iki cümleyi ve "önce sunucu PC, bütün istemciler güncellenene kadar katalog kullanılmaz" uyarısını taşır.

**46. Otuz günlük temizliğin sırası.** Tedarikçi koruması artık `data.disIslemler`'i de okur; dış işlem süpürme satırı tedarikçi satırından SONRA konur, böylece tedarikçi haritası süpürülmemiş listeden kurulur (0123 dersi) ve dış işlem haritası süpürülmemiş parçalardan.

### Triyaj kararları (2026-11-08)

**47. Malzeme zammı penceresi dış işlem listesini alır (bulgu 1, R32, AC-109).** Motor seçeneği okuyordu ama Malzemeler paneli ve fiyat penceresi listeyi iletmiyordu; ekranda karma parça hâlâ "0 parçanın maliyeti değişecek" yazıyordu. Panel `disIslemler`'i alır ve pencereye iletir, pencere `{ fiyatAyarlari, disIslemler }` geçirir; AC-109 ekranda da ölçülür.

**48. Kalem doğrulamasının birim kaynağı ham listedir (bulgu 2, R12).** Kart birimi ve "Adet" etiketini çöptekiler dahil ham diziden okurken doğrulama canlı haritaya bakıyor ve çöpteki adet birimli işlemde ondalık miktarı kilo kuralıyla kabul ediyordu. Parça kartı `disIslem.disIslemHamKatalogu` ile kurulan haritayı `kalemlerDogrula`'ya ve `formKalemOzeti`'nin dördüncü parametresine geçirir; tutar hesabı canlı haritada kalır.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `85fcb759` | Dal `feat/0137-dis-islem`, taban `5d2f4285`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 3 | QA turu (32 bulgu), plan turu (Karar 33–46), triyaj (Karar 47–48) |
| **Düzeltme turu sayısı** | 1 | Triyaj: bir orta, bir küçük bulgu |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | Malzeme zammı penceresi dış işlem listesini almıyordu (karma parça ekranda yine sayılmıyordu); çöpteki adet birimli işlemin miktarı kilo kuralıyla doğrulanıyordu |
| **Regresyon sayısı** | 0 | Tam takım 489 dosya, 7096 test ve Electron 14 dosya; lint 0 hata, uyarı 62 (tabanla aynı) |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** belirsiz sayı kuralı döngüsüz `tutarGirdisi.js`'e taşındı (dış işlem motoru malzemeyi içe almadan okusun); kilo yuvarlaması iki yerdeydi ve mutasyon ölçümü bunu gösterdi, tek yere indi; Makina Maliyeti'ndeki boş liste varsayılanı her çizimde yeni dizi üretip 0136'nın sapma sayacını yeniden koşturuyordu, sabit referansa çevrildi; Giderler'e eklenen prop sözlüğün satır atıflarını kaydırmasın diye aynı satıra alındı. Kıyas altını (`0137-once.json`) spec öncesi kodla üretildi; katalog kalemsiz veride bütün çıktılar birebir aynı. Mutasyon ölçümü: uygulamada on sekiz bozma (iki tur), triyajda iki bozma, hepsi yakalandı.

**Görsel kanıt:** 74 ekran (148 görüntü): 61 eski ekran değişti (Katalog menüsündeki yeni öğe, serbest işlem kalemindeki çeşit seçicisi, yeni boş durum metni, yedek paketi cümlesi), 13 ekran yeni. Taban eski kodla ayrı çalışma kopyasında çekildi; iki ekranın taban çekimi adım atlamıştı ve yeniden çekildi; saat metni taşıyan iki Stok kilit ekranı rapor dışı. Kapanışta son kod onaylı 148 görüntünün hepsiyle 0 fark verdi (`0137-taban-piksel-raporu.json`; ara bir kararlılık çekiminde `katalog-parca` aydınlık görüntüsünün tek seferlik gürültüsü yeniden çekimde kayboldu); 141 kayıt `ayni`ye çevrildi.

**Bu spec'ten çıkarılan ders:** motorun doğru olması ekranın doğru olduğunu göstermez: zam önizlemesi motor testinde karma parçayı sayıyordu, ama listeyi pencereye taşıyan iki halka eksikti ve ekranda hiçbir şey değişmemişti. Yeni bir parametre bir prop zinciriyle ekrana iniyorsa, ölçüm o zincirin ucunda (gerçek bileşende) yapılmalı. İkinci ders: aynı kavramın iki okuyucusu (kartın birim etiketi ve doğrulama) aynı kaynaktan okumalı; biri ham, biri canlı listeden okuyunca çöpteki kayıtta ayrıştılar.
