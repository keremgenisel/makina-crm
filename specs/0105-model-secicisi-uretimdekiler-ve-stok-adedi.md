# 0105 — Müşteri formunun model seçicisi üretimdeki modelleri ve stok adedini gösterir

| | |
|---|---|
| **Durum** | Onaylandı (revizyon 3, plan turu 2026-10-24) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteri ekleme ve düzenleme formunun model seçicisi (`src/components/customers/CustomerAddEditForm.jsx:167-191`); `src/lib/uretimdekiModeller.js` (yeni saf yardımcı `uretimdeSuzulmusModeller`, ipucu metni); `src/lib/stokDurumu.js` (yeni saf stok sayacı); `src/components/Customers.jsx` (forma `appSettings` iletimi); **iki** tarama dosyası: `tests/uretimdeki-modeller-0091.test.js` (izinli liste `:146`, desen `:152`) ve `tests/plan-adetler-0093.test.js` (desen `:18`, ikinci izinli liste `:88`, ipucunun tam dizesi `:54`, meta-assertion `:100`); `tests/ui/uretimdeki-modeller-0091.test.jsx` (AC-33 ters çevrilir, ipucu desenleri `:106-107`); `scripts/evidence/0009-sayfa.jsx` (yeni kanıt ekranı), `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0105-piksel-raporu.json` ve kapanışta yeniden çekilen `docs/evidence/0105-taban-piksel-raporu.json` |
| **Bağımlı spec'ler** | 0091 (üretimde işareti, saklama ve okuma kuralı, ipucu metni, okuyucu taraması), 0093 (işaretin ikinci tüketicisi ve taramanın ad bazlı hâli; "üretimde değil" ibaresinin tek tanımı), 0100 (stok üretim durumu, "satışa hazır" ve "montajda" sözlüğü, serisiz seçenek metni), 0101 ve 0104 (aynı form ve aynı stok seçicisi), 0006 (Evrak'tan gelen ön doldurulmuş model) |
| **Ters çevrilen kriterler** | Var. 0091'in R21, X1 ve AC-33'ünün **müşteri formu yarısı**, 0091 R28 ile 0093 R8 ve R8/2'nin ipucu metni (beş bağlı yer, ölçüm 16 ve uygulama notu), ve okuyucu taramasının **iki kopyası** (ölçüm 17). Ayrıntı "Ters çevrilen kriterler" bölümünde |

---

## Intent

Satış yapan kullanıcı yeni müşteri kaydederken model seçiyor ve iki sorunla karşılaşıyor.

Birincisi, seçicide fabrikanın artık üretmediği modeller de duruyor. Ayarlar › Katalog › Makina Modelleri'nde "Üretimde" kutusu zaten var ve kullanıcı bugüne kadar 22 modelin 15'ini üretimde değil diye işaretlemiş, ama bu işaret satış formuna hiç yansımıyor. Kullanıcı her satışta artık üretilmeyen modellerin arasından doğru olanı bulmak zorunda kalıyor ve yanlış model seçme riski taşıyor.

İkincisi, kullanıcı model seçerken o modelden stokta makina olup olmadığını göremiyor. Stok bilgisi formda yalnız model seçildikten sonra, seri numarası alanında ortaya çıkıyor. Yani kullanıcı "hangi modeli satabilirim" sorusunu seçmeden önce cevaplayamıyor.

Bu iş bittiğinde seçicide yalnız üretimdeki modeller görünecek ve her modelin kartında o modelden stokta kaç makina olduğu, kaçının satışa hazır kaçının montajda olduğu yazacak. Bugünkü veriyle seçici 22 karttan 7 karta iner.

---

## Requirements

### Seçicinin süzülmesi

- **R1.** Müşteri formunun model seçicisi yalnız üretimde olan modelleri listeler.
- **R2.** Üretimde olup olmama ölçütü Ayarlar › Katalog › Makina Modelleri'ndeki "Üretimde" kutusudur; başka bir ayar, başka bir liste ya da modelin kendi alanları ölçüt değildir.
- **R3.** Düzenlenen ya da forma ön doldurulmuş kaydın **kendi modeli** her zaman listede kalır, üretimde olmasa bile.
- **R3/2.** Korunan küme iki değerin **birleşimidir**: düzenlenen kaydın özgün modeli (`modal?.edit?.model`) ve formun o anki modeli (`form.model`). Yalnız birincisi okunursa Evrak'tan gelen ön doldurma kapsanmaz (ölçüm 18: ön doldurma **ekleme** kipinde olur ve orada `modal.edit` yoktur); yalnız ikincisi okunursa kullanıcı başka bir modele geçtiği anda kaydın özgün modeli ızgaradan kaybolur ve geri dönülemez.
- **R3/3.** R3 yalnız `models` içinde karşılığı olan modeli koruyabilir. Kaydın modeli katalogda yoksa (çöpteki özel model, ölçüm 24) ızgara onu bugünkü gibi hiç göstermez; kapalı seçici kaydın adını yazmaya devam eder. Emsal spec 0093'ün `planBulunamayan` maddesidir.
- **R4.** Stokta canlı satırı olan model her zaman listede kalır, üretimde olmasa bile.
- **R4/2.** "Stokta satırı var mı" ölçütü, kartın yazdığı sayıyla **aynı anahtardan** okunur: stok sayacının normalize ettiği model anahtarı (`stokDurumu.js:23`, `trLower(trim)`). Kartın hayatta kalması ile kartın yazdığı sayı aynı veriden gelmelidir; iki ayrı ölçüt kullanılırsa kart "2 satışa hazır" yazarken aynı formun seri seçicisi "stokta makina yok" diyebilir (ölçüm 14, X7).
- **R5.** R3 ve R4 ile listede kalan model, üretimde olmadığını söyleyen bir ibare taşır. İbare spec 0093'ün tek tanımından gelir (`URETIM_DEGIL_IBARESI`).
- **R5/2.** İbarenin biçimi bugünkü tek kullanımla aynıdır: model adının yanında soluk renkle `· üretimde değil` (`PartiHesabi.jsx:187` emsali, ölçüm 26). Sabit tek yerden gelse de biçim her ekranda yeniden kurulursa aynı bilgi iki ayrı görünüm kazanır.
- **R6.** R3 ve R4 dışında üretimde olmayan hiçbir model çizilmez.
- **R7.** Üretimde işareti hiç verilmemişse (ayar yok ya da liste boş) bütün modeller çizilir; bu bugünkü davranıştır ve değişmez.
- **R8.** Listede çizilecek model kalmazsa ızgara yerine boş durum metni çizilir ve metin işaretin nereden değiştirileceğini söyler.
- **R8/2.** Boş durum **iki** ayrı hâli ayırır (spec 0093'ün `bos-plan-model` ve `bos-plan-uretimde` emsali, ölçüm 22): katalogda hiç model yoksa metin model eklemeyi adres gösterir, katalog doluyken hepsi süzülmüşse metin "Üretimde" kutusunu adres gösterir. İki durumun kimliği ayrıdır. Katalog boşken kullanıcıyı "Üretimde kutusunu değiştir" diye yönlendirmek yanlış adres olurdu.

### Stok adedi

- **R9.** Her model kartı o modelden stokta kaç makina olduğunu yazar.
- **R9/2.** Sayaç çizim başına **bir kez** hesaplanır (bağımlılığı `stock`), girdisi yalnız `{ stock }`'tur (parti listesi verilmez: hazır ile montajda sayıları partiye bakmaz ve formun parti listesi yalnız gider yetkisiyle doludur) ve kart kendi modelini **anahtarla** okur, sayacın döndürdüğü diziyi gezmez. Dizi satışa hazır adedine göre sıralıdır (`stokDurumu.js:56`), yani gezilirse R15 ile AC-18'in katalog sırası sessizce bozulur (ölçüm 23).
- **R10.** Sayı iki parçadır: satışa hazır adedi ve montajda adedi. Sıfır olan parça hiç yazılmaz.
- **R11.** Modelin hiç stok satırı yoksa kart "stokta yok" bilgisini yazar.
- **R12.** Sayıya yalnız canlı stok satırları girer; çöp kutusundaki satır sayılmaz.
- **R13.** Seri numarası olan ve olmayan satırların ikisi de sayılır.
- **R14.** Üretim durumu alanı hiç doğmamış eski stok satırı satışa hazır sayılır; bu spec 0100'ün kuralıdır ve değişmez.

### Değişmeyenler

- **R15.** Kartların sırası katalog sırasıdır ve stok adedine göre değişmez.
- **R16.** Stoğu olmayan model gizlenmez; yalnız stok bilgisi "yok" yazar.
- **R17.** Karta tıklayınca modelin seçilmesi, ızgaranın kapanması ve model değişince serisiz stok işaretinin sıfırlanması bugünkü gibi çalışır.
- **R18.** Stok formunun ve Evrak teklif satırının model seçicileri süzülmez ve stok adedi yazmaz.
- **R19.** Kaydedilen müşteri kaydının gövdesi değişmez: aynı model seçildiğinde yazılan kayıt spec öncesiyle birebir aynıdır.
- **R20.** Seri numarası seçicisi, kalıp çapı ön doldurması, üretim partisi seçicisi ve kayıt yolu değişmez.
- **R21.** Yeni izin eklenmez; stok adedi ve üretimde işareti formda herkese görünür.
- **R22.** Ayarlar panelindeki kapsam ipucusu, işaretin artık müşteri formunun model seçicisini de süzdüğünü söyler ve stok ile Evrak seçicilerinin etkilenmediğini söylemeye devam eder.
- **R22/2.** Metnin birebir hâli şudur: `"Üretimde" işareti Makina Maliyeti › Model Maliyetleri'ni, Parti Hesabı'nın planlanan adetler penceresini ve müşteri formunun model seçicisini süzer; Parti Hesabı'nın model-adet tablosu, stok ve Evrak model seçicileri, Analiz ve makina kayıtları etkilenmez.` İki parçalı yapı korunur, üçüncü tüketici adıyla girer ve "model seçicileri" ifadesi "stok ve Evrak model seçicileri" diye daraltılır. Metin beş yerde bağlıdır (ölçüm 16 dördünü, uygulama notu beşincisini sayar) ve beşi birlikte güncellenir.

### Yeni yardımcılar ve prop

- **R23.** Süzme yardımcısının adı **`uretimdeSuzulmusModeller(ayar, models, { korunan })`**'dir ve `src/lib/uretimdekiModeller.js`'te durur. Ad spec'te sabitlenir, çünkü okuyucu taraması modül yolundan değil **adlardan** yapılıyor (ölçüm 15): desen yeni adı yakalamazsa form `okuyan` listesine hiç girmez ve tarama forma bakmadan yeşil kalır. `uretimde` ön eki, iki taramanın desenine tek bir alternatif eklemeyi yeterli kılar (`uretimdeSuzulmusModeller\b`).
- **R24.** Form ayarı **bütün olarak** alır: `appSettings = {}` varsayılanlı yeni bir prop, `Customers` onu olduğu gibi geçirir (`Customers`'ın kendi varsayılanı da `{}`, ölçüm 13). Form işaret listesini doğrudan okumaz, yalnız yardımcıya verir; böylece `Customers.jsx` işareti "okuyan" dosya olmaz ve izinli liste yalnız formla genişler (AC-25). Varsayılan zorunludur: altı test dosyası formu doğrudan çiziyor ve yeni prop'u vermeyecek (ölçüm 13).
- **R25.** Stok sayacı `src/lib/stokDurumu.js`'te saf fonksiyondur ve metni spec 0100'ün sözlüğünden kurar; kart yalnız çağırır.

---

## Constraints

### Uyulması zorunlu

- **C1.** Yeni kalıcı alan, yeni veri bölümü, yeni izin ve yeni sunucu kuralı yok. Veritabanı şeması, `serverAuth.cjs` ve birleştirme dokunulmadan kalır.
- **C2.** Üretimde işaretinin okuma yolu tektir: `src/lib/uretimdekiModeller.js`. Form kendi süzmesini yazmaz, kütüphanedeki saf yardımcıyı (`uretimdeSuzulmusModeller`, R23) çağırır ve ayarı bütün olarak geçirir (R24). `Customers` ayarı süzmez, ayıklamaz ve okumaz; yalnız iletir.
- **C3.** Okuyucu taraması **iki dosyada** duruyor ve ikisi birlikte güncellenir (ölçüm 17): `tests/uretimdeki-modeller-0091.test.js` (izinli liste `:146`, desen `:152`) ve `tests/plan-adetler-0093.test.js` (desen `OKUYAN` `:18`, ikinci izinli liste `:88`, kendi `tara("src")` taraması `:91`). İkisinin de izinli listesi yalnız müşteri formuna açılır ve iki desen de yeni yardımcının adını kapsar. Tarama yeni bir ad uydurarak atlatılmaz: amacı işareti okuyan ekranların sayılı kalmasıdır.
- **C4.** Stok sayısı `src/lib/stokDurumu.js`'te saf yardımcıdan gelir. Kart içinde toplama, filtreleme ve metin kurma yasaktır; sayaç çizim başına bir kez çağrılır ve kart anahtarla okur (R9/2).
- **C5.** Stok dili spec 0100'ün sözlüğünden türer ("satışa hazır", "montajda"); formda ikinci bir ifade kümesi oluşmaz.
- **C6.** Seri numarası seçicisinin bugünkü birebir model eşleştirmesine dokunulmaz (`CustomerAddEditForm.jsx:196`). Yeni sayaç ve R4/2'nin hayatta kalma ölçütü stok özetinin normalizasyonunu kullanır; ölçütler bilerek farklı kalır (X7).
- **C7.** "Üretimde değil" ibaresi spec 0093'ün tek tanımından (`URETIM_DEGIL_IBARESI`) gelir, formda yeni bir metin yazılmaz; biçimi de bugünkü tek kullanımla aynıdır (R5/2).
- **C8.** Üretimde işareti yokken (ayar boş ya da prop hiç verilmemiş) çizim bugünküyle birebir aynı olmalıdır; kanıt ekranlarının çoğu ayar vermeden kurulduğu için bu aynı zamanda 0 piksel güvencesidir (ölçüm 10) ve formu doğrudan çizen altı testin yeşil kalma güvencesidir (ölçüm 13).
- **C9.** AC-26'nın kaynak taraması bugünkü kodu kırmayacak biçimde yazılır (ölçüm 19): form `uretimdeSuzulmusModeller(` ile stok sayacını çağırır; dosyada işaret listesini doğrudan okuyan ad (`URETIM_ALANI`, `uretimdeOlmayanModeller`) geçmez; `stock` üzerinde `reduce` ya da sayma amaçlı ikinci bir `filter` yoktur. Formun bugünkü tek `stock.filter`'ı seri seçicisinindir (`:196`) ve `trLower` zaten seri anahtarı için içe aktarılmıştır (`:3`, `:204`); ikisi de gerekçeli istisnadır.

### KAPSAM DIŞI

- **X1.** Stok › Makina Stoğu formunun model seçicisinin süzülmesi — *neden:* stoğa iade dönen ya da yenilenen eski model girilebilmeli; 0091 X1'in gerekçesi orada aynen geçerli.
- **X2.** Evrak teklif satırının model seçicisinin süzülmesi — *neden:* geçmiş bir modele teklif verilebilir, belge geçmişi veri girişiyle kısıtlanmaz.
- **X3.** Servis, kalıp ve parça seçicileri — *neden:* üretimi bırakılmış makinanın servisi ve yedek parçası sürüyor (0091 X1).
- **X4.** Model seçicisine arama kutusu eklenmesi — *neden:* süzmeden sonra yedi kart kalıyor, arama bugün karşılığı olmayan bir iş; katalog büyürse ayrı spec.
- **X5.** Kartların stok adedine göre sıralanması — *neden:* kullanıcı kartın yerini ezberliyor, sıranın her stok hareketinde değişmesi yanlış tıklama üretir (Karar 6).
- **X6.** Stok adedinin müşteri listesinde, dışa aktarmada ya da yazdırma çıktısında gösterilmesi — *neden:* bu spec yalnız seçim anını kolaylaştırır.
- **X7.** Model adı eşleştirmesinin formda tek ölçüte indirilmesi — *neden:* seri seçicisi birebir, yeni sayaç normalize eşliyor. Bugünkü veride stok modellerinin hepsi katalog adıyla birebir aynı (ölçüm 5), yani fark kuramsal; birleştirmek seri seçicisinin davranışını değiştirir ve ayrı iştir.
- **X8.** İşaretin Analiz, Parti Hesabı'nın model-adet tablosu ve makina kayıtları üzerindeki etkisizliği — *neden:* 0091 ve 0093 ile verilmiş kararlar, bu spec onlara dokunmaz.
- **X9.** Üretimde işaretinin kendi düzenleme ekranı — *neden:* kutu ve kaydı 0091 ile kuruldu, bu spec'te yalnız kapsam ipucusunun metni değişir.
- **X10.** Satışa hazır makinası olmayan modelin seçilmesinin engellenmesi ya da uyarı verilmesi — *neden:* sipariş üzerine üretilen makina da satılıyor, kullanıcı bilgilendirilir ama kısıtlanmaz.

---

## Context

Model seçicisi `src/components/customers/CustomerAddEditForm.jsx:167-191`'de duruyor: kapalıyken seçili model adını yazan bir satır, açıkken iki sütunlu kart ızgarası. Her kart dört satır taşıyor: model adı, soğutma bilgisi, kapasite ve kalıp çapı. Izgara `models` prop'unu olduğu gibi `map` ediyor, hiçbir süzme yok.

`models` zinciri: App'te `allModels = [...standardModels, ...liveCustomModels]` (`src/App.jsx:749`), oradan `Customers`'a, oradan forma. `Customers`'ın prop varsayılanı `ALTUNMAK_MODELS` (`src/components/Customers.jsx:24`), yani prop verilmezse yerleşik altı model çiziliyor; kanıt aracının müşteri ekranları bu yoldan besleniyor.

Üretimde işareti spec 0091 ile geldi. Saklama `appSettings.uretimdeOlmayanModeller`, yani **üretilmeyen** adların listesi; adı listede olmayan model üretimdedir. Okuma, yazma ve ad taşıma kuralları `src/lib/uretimdekiModeller.js`'te. İşaretin bugünkü iki tüketicisi var: Makina Maliyeti › Model Maliyetleri (0091) ve Parti Hesabı'nın planlanan adetler penceresi (0093).

Form `appSettings` almıyor ama `stock` alıyor ve `src/lib/stokDurumu.js`'ten beş şey içe aktarıyor (`CustomerAddEditForm.jsx:6`): `serisizDusulecek`, `serisizSecenekMetni`, `seriliSecenekMetni`, `partiSecenekAdi`, `PANO_SEKME_ADI`. Yani stok sözlüğü formda zaten kurulu.

Bilinen tuzaklar:

- **Okuyucu taraması.** İzinli liste beş dosya sayıyor ve tarama modül yolundan değil işareti okuyan **adlardan** yapılıyor (0093 R12/2). Liste ve desen **iki** test dosyasında ayrı ayrı duruyor (ölçüm 17); form ikisine de eklenmeden çalışmaz.
- **İpucu metni.** `uretimdekiModeller.js:9`'daki sabit bugün aynen "model seçicileri ... etkilenmez" diyor. Bu cümle bu spec'ten sonra yanlış olur ve beş yerde bağlıdır (ölçüm 16 ve uygulama notu).
- **Sahte yeşil test.** 0091'in AC-33 testi (`tests/ui/uretimdeki-modeller-0091.test.jsx:268`) forma işaret verisi hiç vermiyor. İşaretsiz veride bütün modeller çizileceği için o test bu spec'ten sonra da kendiliğinden yeşil kalır. Bilerek yeniden yazılmazsa geriye dönük güvence sahte olur (ölçüm 9).
- **Boş liste kuralı.** 0091 R24/4: işaret listesi boşalınca anahtar silinmez, değeri `undefined` olur. Yeni yardımcı bu hâli bugünkü gibi "hepsi üretimde" diye okumalıdır.
- **Model anahtarı.** `stokDurumOzeti` model adını normalize ederek sayıyor, formun seri seçicisi `s.model === form.model` ile birebir eşliyor (`CustomerAddEditForm.jsx:194`). İki ölçüt bu spec'te bilerek ayrı kalıyor (C6, X7).

---

## Ölçümler

Hepsi bu spec yazılırken kod ve 2026-10-22 tarihli müşteri yedeği üzerinde yapıldı.

1. Seçici kart ızgarasıdır ve `models` dizisini süzmeden çizer (açık ızgara `CustomerAddEditForm.jsx:175-190`, kartın kendisi `:178-187`); kartta model, soğutma, kapasite ve kalıp çapı yazar, stok bilgisi yoktur. (Satır numaraları spec 0104'ün uygulanmasından sonra güncellendi, ölçüm 27.)
2. `models` zinciri App → Customers → form; Customers varsayılanı `ALTUNMAK_MODELS` (`Customers.jsx:24`).
3. Yedekte katalog 22 model: 6 standart, 16 canlı özel.
4. `appSettings.uretimdeOlmayanModeller` listesinde 15 ad var. Yani seçicide 7 model kalır: AK100_DS, AK100_DSC, AK120_DS, AK120_DSC, AK140_DSC, SWP140_DSC, AKF3705_DS. Gizlenecekler arasında ÖZEL, AKF3701, AKF3702, AKF3703, AKF3704 de var; ekran görüntüsünde bugün hepsi duruyor.
5. İşaret listesindeki 15 adın hepsinin katalogda karşılığı var (katalogda olmayan ad sayısı 0). Stokta 6 model geçiyor (AK100_DS, AK120_DS, AK120_DSC, AK140_DSC, AKF3705_DS, SWP140_DSC) ve altısı da hem katalogda hem üretimde. Yani R4'ün açtığı istisna bugünkü veride hiçbir modeli kurtarmıyor; kural ileriye dönüktür.
6. Stokta 21 canlı satır var, 10'unun üretim durumu montaj.
7. Form `appSettings` almıyor; `stock` alıyor ve `stokDurumu.js`'ten beş şey içe aktarıyor (`CustomerAddEditForm.jsx:6`).
8. İşareti okuyabilecek dosyalar beşle sınırlı: `uretimdekiModeller.js`, `ModelsManager.jsx`, `MakinaMaliyeti.jsx`, `Settings.jsx`, `App.jsx` (`tests/uretimdeki-modeller-0091.test.js:146`).
9. 0091'in AC-33 testi forma işaret vermiyor (`tests/ui/uretimdeki-modeller-0091.test.jsx:268-278`), yani ters çevrilmezse sahte yeşil kalır.
10. Kanıt aracında açık model ızgarası hiçbir görüntüde yok. `musteri-formu-0104-stok` ızgarayı açıp bir kart seçiyor, kart seçimi ızgarayı kapattığı için görüntüye girmiyor. Müşteri formu ekranlarının hiçbiri `appSettings` vermiyor, yani işaretsiz veride süzme olmaz ve o ekranlar değişmez.
11. `stokDurumOzeti` model anahtarını normalize ediyor; formun seri seçicisi birebir eşliyor (`CustomerAddEditForm.jsx:196`).
12. Stok dili hazır: `DURUM_ADLARI` "Montajda" ve "Satışa hazır" diyor, `serisizSecenekMetni` "3 satışa hazır, 1 montajda" biçimini kuruyor (`stokDurumu.js:9` ve `:102-108`).

### QA turu ölçümleri (2026-10-24)

13. **Formun yeni prop'u ve doğrudan çizen altı test.** `CustomerAddEditForm` bugün `appSettings` hiç almıyor (dosyada o ad geçmiyor). Altı test dosyası formu **doğrudan** çiziyor ve yeni prop'u vermeyecek: `tests/ui/uretimdeki-modeller-0091.test.jsx:268`, `ui/fatura-bedeli-temizlik`, `ui/tahsilat-hesap-0063`, `ui/ilce-formlari-0094`, `ui/kalan-borc-komisyon`, `ui/serisiz-seri-0104`. `Customers`'ın kendi `appSettings` varsayılanı `{}` (`Customers.jsx:43`) ve kütüphane `Array.isArray(ayar?.[URETIM_ALANI])` kapısı taşıyor (`uretimdekiModeller.js:13`), yani boş nesne "hepsi üretimde" demektir. Prop varsayılansız bırakılıp ayar doğrudan okunursa altı test TypeError ile patlar.
14. **Aynı kartta üç ayrı eşleştirme ölçütü.** Üretimde işareti **birebir** karşılaştırıyor (`uretimdekiModeller.js:17`, `!liste(ayar).includes(ad)`; birebirlik 0091 R24/3 ile bilinçli, Türkçe küçültme yeniden adlandırma zincirini koparırdı). Stok sayacı **normalize** ediyor (`stokDurumu.js:23`, `modelAnahtari = trLower(trim)`). Seri numarası seçicisi **birebir** eşliyor (`CustomerAddEditForm.jsx:196`, `s.model === form.model`). Bugünkü veride fark yok (ölçüm 5), ama kural ileriye dönük.
15. **Taramanın deseni ada bakıyor.** `tests/uretimdeki-modeller-0091.test.js:152` ve `tests/plan-adetler-0093.test.js:18` aynı deseni taşıyor: `/uretimdeOlmayanModeller|\bURETIM_ALANI\b|uretimdeMi\b|uretimdeOlmayanlar\b|uretimIsareti(Degistir|Tasi|Dusur)\b/`. Form desende olmayan bir ad çağırırsa `okuyan` listesine girmez ve tarama forma hiç bakmadan yeşil kalır.
16. **İpucu metni dört yerde bağlı.** Sabit `uretimdekiModeller.js:9`; `tests/plan-adetler-0093.test.js:54` tam dizeyi `toBe` ile; `tests/ui/uretimdeki-modeller-0091.test.jsx:106` ve `:107` iki `toMatch` ile (ikincisi `/model seçicileri, Analiz/`); ve `tests/plan-adetler-0093.test.js:100` bir **meta-assertion** ile 0091 testinin o satırının kaynağını birebir pinliyor (`expect(u).toContain("expect(URETIM_ISARETI_IPUCU).toMatch(/model seçicileri, Analiz/);")`). Sabiti değiştirip dördünü güncellemeyen bir tur, anlaşılması zor bir yerde kırılır. *(Uygulamada düzeltildi: beşinci yer `tests/ui/plan-adetler-0093.test.jsx:267-268`; ayrıntı Karar 39'un altındaki uygulama notunda.)*
17. **İzinli liste ve desen iki dosyada.** `tests/uretimdeki-modeller-0091.test.js:146` beş dosyalık `izinli` kümesini ve `:152` deseni taşıyor; `tests/plan-adetler-0093.test.js` ise `:18`'de kendi `OKUYAN` desenini, `:88`'de **aynı beş dosyalık kümenin ikinci kopyasını** ve `:91`'de kendi `tara("src")` taramasını taşıyor. İkisi birbirinden bağımsız çalışıyor.
18. **Evrak ön doldurması ekleme kipinde.** `Customers.jsx:226-230` `openNewPrefill` geldiğinde `openAddWithPrefill`'i çağırıyor, yani belgeden gelen model **ekleme** kipinde forma giriyor ve `modal.edit` yoktur; o modelin tek kaynağı `form.model`'dir.
19. **Formun bugünkü stok süzmesi ve `trLower` kullanımı.** Form stoğu zaten süzüyor (`:196`, seri seçicisi) ve `trLower`'ı zaten içe aktarıp kullanıyor (`:3` ve `:204` `seriAnahtari`, spec 0104 ile geldi). Yani `stock.filter` ya da `trLower` arayan bir tarama bugünkü koda takılır; `uretimdeOlmayanModeller` arayan bir tarama ise hiçbir şey ölçmez.
20. **"Değişmez" kriteri testle ölçülemiyor.** Depoda bir dosyanın değişmediğini sabitleyen test yok; yerleşik desen içerik taramasıdır. Canlı emsal `tests/parti-duzeltme-0103.test.js:54-69` (`ALAN_IZINLERI.customers` tanımsız, `KILIT_ALANLARI` tam liste, `MERGE_KEYS` satırı, `db.cjs` sütun sabiti); spec 0104 aynı taramaları tekrarladı.
21. **Kanıt kaydının dönüşümü ve 0091 ile 0093'ün çözümü.** `tasarim-kaynak.test.js:160` `ayni` kaydın **gösterdiği raporda** `piksel === 0` ister; `degisti` kaydında yalnız `onay` ve çizim hatasızlığı denetlenir. Yeni ekranın iş raporundaki satırı `fark: "önce görüntüsü yok"` taşır ve `piksel` anahtarı yoktur (`0009-ekran.cjs:68`); değişen ekranın satırı sıfırdan büyük bir `piksel` taşır. Yani iki kayıt da yalnız `beklenen` değiştirilerek `ayni`ye çevrilemez. Bu işin ters çevirdiği iki spec'in çözümü ölçüldü: **0091 ve 0093'ün bütün kayıtları kendi `-taban-piksel-raporu.json`'unu gösteriyor ve `beklenen: "ayni"`**, yani kapanışta taban bugünkü kodla, onaylı "sonra" görüntüleri taban alınarak yeniden çekilmiş.
22. **0093'ün iki boş durumu.** Planlanan adetler penceresi iki ayrı boş hâli ayırıyor: `bos-plan-model` (katalog boş) ve `bos-plan-uretimde` (hepsi süzülmüş). Müşteri formunun ızgarası bugün katalog boşken sessizce boş çiziliyor, hiç mesaj yok.
23. **Stok özetinin maliyeti, sırası ve parti girdisi.** `stokDurumOzeti(veri)` bütün canlı stoğu geziyor ve `satirlar` haritasını da kuruyor (`stokDurumu.js:37-57`); döndürdüğü `modeller` dizisi **satışa hazır adedine göre azalan** sıralı (`:56`). Fonksiyon `uretimPartileri` de alıyor ama hazır ile montajda sayıları partiye bakmıyor; formun parti listesi yalnız gider yetkisiyle dolu (`App.jsx:1702`). Kart başına çağrı O(n·m) olur, dizi sırayla okunursa katalog sırası bozulur.
24. **Çöpteki özel model katalogda yok.** `allModels = [...standardModels, ...liveCustomModels]` (`App.jsx:749`), yani çöpe atılmış özel model `models` dizisinde bulunmaz. Böyle bir modele bağlı kaydın düzenlemesinde R3 çizilecek bir model nesnesi bulamaz.
25. **AC-34'ün ekran testi var, AC-35'in yok.** 0091'in AC-34'ü gerçek bileşenle ölçülüyor (`tests/ui/uretimdeki-modeller-0091.test.jsx:279`, `MakinaStokTab`'ın seçicisi); AC-35 (Evrak) yalnız kaynak taramasının test adında geçiyor (`tests/uretimdeki-modeller-0091.test.js:147`), kendi ekran testi yok.
26. **İbarenin bugünkü biçimi.** `URETIM_DEGIL_IBARESI` (`uretimdekiModeller.js:11`) tek tanım; tek kullanım biçimi `PartiHesabi.jsx:187`'de etiketin yanında soluk renkle `· üretimde değil` ve `:188`'de erişilebilir adın içinde parantezle.
27. **Spec 0104 uygulandı.** Commit `6d87636` (uygulama) ve `e6fd35c` (SCORECARD, kapanış kanıtı, `specs/done`'a taşıma). Form dosyası yine kaydı: model alanının bloğu `:167-191`, açık ızgara `:175-190`, kart `:178-187`, seri seçicisinin birebir eşlemesi `:196`. `Customers.jsx`, `uretimdekiModeller.js` ve `stokDurumu.js` atıfları etkilenmedi.

---

## Kararlar (Takım Yöneticisi, 2026-10-24)

1. **Kapsam yalnız müşteri formudur** (onaylandı). Stok formu ve Evrak seçicileri dokunulmaz (X1, X2). Gerekçe: stoğa iade ve geçmiş modele teklif meşru işlerdir. Bedeli: Ayarlar'daki ipucu cümlesi değişmek zorunda (Karar 11).
2. **Düzenlenen kaydın kendi modeli her zaman görünür** (onaylandı), "üretimde değil" ibaresiyle. Gerekçe: aksi hâlde kullanıcı kendi kaydının modelini ızgarada göremez ve seçili kart kaybolur. Emsal spec 0093'ün gizli ama adedi kayıtlı model bölümüdür.
3. **Stoğu olan model, işaret ne olursa olsun görünür** (onaylandı), aynı ibareyle. Gerekçe: elde duran makina satılabilmeli. Ölçüm 5: bugün hiçbir modeli kurtarmıyor, ileriye dönük güvenlik.
4. **Sayı iki parçalıdır** (onaylandı): "n satışa hazır · m montajda", sıfır olan parça yazılmaz, stok yoksa "Stokta yok". Gerekçe: aynı formun seri numarası seçicisi birebir bu dili kullanıyor, iki yerde iki ayrı dil olmaz.
5. **Sayı saf yardımcıda hesaplanır** (onaylandı) ve stok özetinin normalizasyonunu kullanır; seri seçicisinin birebir ölçütüne dokunulmaz, fark zorunlu kısıt olarak yazılır (C6, X7).
6. **Sıralama değişmez** (onaylandı): katalog sırası korunur. Gerekçe: sıranın stok hareketiyle değişmesi yanlış tıklama üretir.
7. **Stoğu olmayan model gizlenmez** (onaylandı), "Stokta yok" yazar. Gerekçe: sipariş üzerine üretim de satıştır.
8. **Liste boş kalırsa boş durum çizilir** (onaylandı) ve ayarın yeri yazılır. Emsal spec 0093.
9. **Yetki eklenmez** (onaylandı). Gerekçe: aynı formun stok seçicisi zaten herkese adet gösteriyor, stok adedi gider verisi değil.
10. **İşaret kütüphaneden okunur ve izinli dosya listesi forma açılır** (onaylandı). Gerekçe: taramayı yeni bir ad uydurarak atlatmak kuralın amacını boşa çıkarır; bu bilinçli bir ters çevirmedir.
11. **Ayarlar'daki kapsam ipucusu güncellenir** (onaylandı): müşteri formunun seçicisini kapsadığı yazılır, stok ve Evrak seçicilerinin etkilenmediği korunur. Bu `katalog-model-uretimde` kanıt ekranını bilinçli değiştirir.
12. **Yeni kanıt ekranı eklenir** (onaylandı) ve `models`, `appSettings`, `stock` üçünü birden verir. Gerekçe: ölçüm 10, aksi hâlde değişiklik kanıtta 0 piksel çıkar.

Ek karar: seçiciye arama kutusu eklenmez (X4).

### QA turu kararları (2026-10-24)

13. **Kanıt kayıtları kapanışta taban raporuna bağlanır** (onaylandı, Bloklayıcı). İki kayıt da (`musteri-formu-0105-model` ve `katalog-model-uretimde`) iş turunda `beklenen: "degisti"` + onay ile girer; kapanışta `docs/evidence/0105-taban-piksel-raporu.json` bugünkü kodla, onaylanan görüntüler taban alınarak yeniden çekilir (0 piksel verir) ve iki kayıt o rapora bağlanıp `ayni` yapılır. Gerekçe ölçüm 21: `ayni` kayıt gösterdiği raporda `piksel === 0` ister, yeni ekranın iş raporunda `piksel` anahtarı hiç yok, değişen ekranın satırında ise sıfırdan büyük bir değer var. Reddedilenin bedeli olurdu: DoD'nin son maddesi (`specs/done/`'a taşıma) `tasarim-kaynak` testini kırar. Emsal, bu işin ters çevirdiği iki spec'in kendisidir (0091 ve 0093'ün bütün kayıtları taban raporunu gösteriyor).
14. **Formun yeni prop'u `appSettings` ve varsayılanı `{}`** (onaylandı, Önemli). Gerekçe ölçüm 13: altı test dosyası formu doğrudan çiziyor ve yeni prop'u vermeyecek; kütüphanenin kapısı boş nesneyi "hepsi üretimde" diye okuyor. Reddedilenin bedeli olurdu: altı test ya patlar ya sessizce farklı davranır ve C8'in 0 piksel güvencesi dayanaksız kalır.
15. **R4'ün hayatta kalma ölçütü stok sayacının anahtarıdır** (onaylandı, Önemli). Gerekçe ölçüm 14: aynı kartta üç ayrı eşleştirme ölçütü var; kartın hayatta kalması ile kartın yazdığı sayı aynı veriden gelmezse kart "2 satışa hazır" yazarken aynı formun seri seçicisi "stokta makina yok" der. X7 üçüncü ölçütü (işaretin birebirliği) de sayar. Reddedilenin bedeli olurdu: kullanıcı aynı ekranda çelişen iki bilgiyle kalır.
16. **Süzme yardımcısının adı `uretimdeSuzulmusModeller`** (onaylandı, Önemli). Gerekçe ölçüm 15: tarama ada bakıyor, desende olmayan bir ad taramayı sessizce boşa çıkarır; `uretimde` ön eki iki desenin genişletilmesini tek alternatifle bitirir. Reddedilenin bedeli olurdu: C3'ün "yeni bir ad uydurarak atlatılmaz" uyarısı uygulanabilir bir kurala dönüşmez.
17. **Yeni ipucu metni birebir yazılır** (onaylandı, Önemli). Metin R22/2'de; 0091 testinin deseni `/stok ve Evrak model seçicileri, Analiz/` olur ve 0093'ün meta-assertion satırı o yeni literale güncellenir. Gerekçe ölçüm 16: metin dört yerde bağlı ve biri bir test satırının kaynağını pinliyor. Reddedilenin bedeli olurdu: uygulama turu metni kendi uydurur ve dört bağlı yerden biri atlanırsa `npm test` anlaşılması zor bir yerde kırılır.
18. **Okuyucu taramasının iki kopyası birlikte güncellenir** (onaylandı, Önemli). Gerekçe ölçüm 17: izinli liste ve desen `tests/uretimdeki-modeller-0091.test.js` ile `tests/plan-adetler-0093.test.js`'te ayrı ayrı duruyor ve bağımsız çalışıyor. Reddedilenin bedeli olurdu: tek dosyayı güncelleyen tur ikinci taramada kırılır ve daha kötüsü, listeyi genişletmenin tek yerde yetmediğini fark etmeden "tarama güncellendi" sayar.
19. **Korunan model kümesi iki değerin birleşimidir** (onaylandı, Önemli). `modal?.edit?.model` ve `form.model` birlikte okunur (R3/2). Gerekçe ölçüm 18: ön doldurma ekleme kipinde olur ve orada `modal.edit` yoktur; yalnız `form.model` okunursa kaydın özgün modeli başka bir modele geçildiği anda kaybolur ve geri dönülemez. Reddedilenin bedeli olurdu: AC-4 ile AC-5'ten biri karşılanamaz.
20. **AC-26'nın taraması desenle yazılır** (onaylandı, Önemli). Gerekçe ölçüm 19: form stoğu ve `trLower`'ı zaten kullanıyor, yani naif bir tarama bugünkü koda takılır; `uretimdeOlmayanModeller` arayan tarama ise hiçbir şey ölçmez. Kural C9'da. Reddedilenin bedeli olurdu: tarama ya atlanır ya mevcut kodu bozacak biçimde "düzeltilir".
21. **AC-23 içerik taramasına çevrilir** (onaylandı, Önemli). Gerekçe ölçüm 20: "değişmez" testle ölçülemez, deponun deseni içerik taramasıdır ve 0103 ile 0104 aynı kararı verdi. Commit'in değişen dosya listesi SCORECARD'a yazılır.
22. **Boş durum ikiye ayrılır** (onaylandı, Küçük). Katalog boş ve hepsi süzülmüş hâlleri ayrı kimliklerle ve ayrı metinlerle çizilir (R8/2). Gerekçe ölçüm 22: emsal 0093'te var ve katalog boşken kullanıcıyı "Üretimde kutusunu değiştir" diye yönlendirmek yanlış adres olur.
23. **Sayaç çizim başına bir kez, `{ stock }` ile ve anahtarla okunur** (onaylandı, Küçük). Gerekçe ölçüm 23: kart başına çağrı O(n·m) olur, döndürdüğü dizi satışa hazıra göre sıralı olduğu için gezilirse katalog sırası sessizce bozulur, parti listesi ise sayıyı etkilemediği hâlde yetkiye bağlı bir bağımlılık getirir.
24. **Kataloğda karşılığı olmayan model R3 ile kurtarılmaz** (onaylandı, Küçük). Sınır R3/3'te yazılı. Gerekçe ölçüm 24: çöpteki özel model `models` dizisinde yok, çizilecek nesne yok; kapalı seçici kaydın adını yazmaya devam eder. Emsal 0093'ün `planBulunamayan` maddesi.
25. **AC-17 prop değişimiyle ölçülür** (onaylandı, Küçük). Açık formdan stok satırı silinemediği için kriter "`stock` prop'u değişince kartın sayısı yeni değeri gösterir" diye yazılır ve testte `rerender` ile ölçülür.
26. **AC-22 tam nesne karşılaştırmasıyla ölçülür** (onaylandı, Küçük). Kaydedilen nesne küçük ve tam sayılabilir; testte `toEqual` ile ölçülür, ayrıca formun mevcut kayıt testlerinin dokunulmadan yeşil kalması yazılır. Bu iş kayıt yoluna hiç dokunmuyor (R19, R20). Emsal spec 0104'ün aynı kararı.
27. **AC-21 kaynak taramasıyla ölçülür** (onaylandı, Küçük). Gerekçe ölçüm 25: Evrak seçicisinin ekran testi yok, güvence kaynak taramasıdır (Evrak dosyası işareti okumaz); kriter hangi güvenceye dayandığını yazar.
28. **İbarenin biçimi 0093'ün biçimidir** (onaylandı, Küçük). Model adının yanında soluk renkle `· üretimde değil` (R5/2). Gerekçe ölçüm 26: sabit tek yerden gelse de biçim her ekranda yeniden kurulursa aynı bilgi iki ayrı görünüm kazanır.
29. **`Customers` ayarı bütün olarak iletir** (onaylandı, Küçük). Gerekçe: ayarı ayıklayıp geçirirse `Customers.jsx` işareti "okuyan" dosya olur ve izinli listeye girmek zorunda kalır, bu da AC-25'in "yalnız müşteri formuyla genişler" sözünü bozar. Kural C2 ve R24'te.
30. **Beş satır atfı düzeltilir** (onaylandı, Küçük). Model bloğu `:167-191`, açık ızgara `:175-190`, kart `:178-187`, seri seçicisi `:196`, ipucu sabiti `uretimdekiModeller.js:9`. Gerekçe ölçüm 27: spec 0104 uygulandı ve form dosyası kaydı. Doğrulanıp aynen bırakılanlar: `App.jsx:749`, `Customers.jsx:24` ve `:43`, formun `:6` içe aktarması, `stokDurumu.js:9` ve `:102`, `tests/uretimdeki-modeller-0091.test.js:146`, `tests/ui/uretimdeki-modeller-0091.test.jsx:268`.


### Plan turu kararları (2026-10-24)

**Karar 31 (onaylandı): R4 yardımcının ikinci seçeneğiyle hesaplanır.** İmza `uretimdeSuzulmusModeller(ayar, models, { korunan, stoktaMi })`. Form `stoktaMi`'yi `ad => modelStokOku(sayac, ad).toplam > 0` diye verir; böylece hayatta kalma ile kartın sayısı aynı normalize anahtardan gelir (R4/2). Stoktaki adları `korunan`'a koymak birebir karşılaştırmaya düşerdi, formda `models`'i stoğa göre süzmek C4'ü bozardı. Ad R23'teki gibi kalır.

**Karar 32 (onaylandı): yardımcı katalog sırasıyla `[{ m, uretimde }]` döner.** Kart ibareyi bu alandan çizer, form `uretimdeMi`'yi çağırmaz (C2). Boş durumlar: `models.length === 0` katalog boş, sonuç boş ise hepsi süzülmüş.

**Karar 33 (onaylandı): C8 "aynı kart kümesi, ibare yok" diye okunur.** R9 gereği stok satırı işaretsiz veride de karta girer; eski kanıt ekranlarının hiçbiri ızgarayı açık bırakmadığı için piksel güvencesi bozulmaz (ölçüm 10).

**Karar 34 (onaylandı): sözlüğün iki form atfı güncellenir.** Sayacın `useMemo`'su erken dönüşten önce durmak zorunda olduğu için `CustomerAddEditForm.jsx:123` ve `:150` atıfları kayar; `docs/tasarim-sozlugu.md`'de düzeltilir. Uygulamada: `:123` → `:128` (HataMetni); `BolumBasligi`'nın `:150` atfı bu işten önce de boş bir satırı gösteriyordu (0103'te bulunan açık bulgu), doğru satıra `:163` ("Makina Bilgileri") çevrildi.

**Karar 35 (onaylandı): stok metni `DURUM_ADLARI`'ndan kurulur.** `modelStokMetni` sözcükleri `trLower(DURUM_ADLARI.hazir)` ve `trLower(DURUM_ADLARI.montaj)`'dan, ayraç `·` ile (Karar 4); `serisizSecenekMetni` değişmez (R20). "Stokta yok" `STOKTA_YOK` sabiti.

**Karar 36 (onaylandı): kapanışta taban raporu yeniden çekilir (Karar 13), iş turundaki eski ↔ eski sonucu SCORECARD'a tek satırla yazılır.** Ayrı kapanış raporu üretilmez.

**Karar 37 (onaylandı): boş durum metinleri formun sonunda dışa verilir.** `MODEL_BOS_KATALOG`, `MODEL_BOS_URETIMDE`; kimlikler `bos-model-secici` ve `bos-model-secici-uretimde`. Maliyet bileşeninin `PLAN_BOS_*` sabitleri içe alınmaz.

**Karar 38 (onaylandı): ibare model adından ayrı soluk `span`'dadır** (`PartiHesabi.jsx:187` biçimi); model adı kart başlığının kendi metni olarak kalır, böylece adı arayan mevcut sorgular (`getByText("AK100")`) ibareli kartta da eşleşir. Uygulamada netleşti: adı ayrı bir `span`'a almak 0104'ün kart yardımcısını kırardı. Stok satırı `data-testid="model-stok-<model>"` taşır.

**Karar 39 (onaylandı): AC-21'in taraması `Documents.jsx`, `documents/` ve `evrak/` altını kapsar;** teklif satırı seçicisinin dosyası uygulamada doğrulanır. Uygulamada: seçici `Documents.jsx`'te (`allModels`); tarama üç konumu kapsar.

**Uygulama notu (2026-10-24): ipucunun beşinci bağlı yeri.** Ölçüm 16 dört yer sayıyordu; tam koşu beşincisini buldu: `tests/ui/plan-adetler-0093.test.jsx:267-268` (Ayarlar panelinde ipucunun iki deseni). Aynı biçimde güncellendi, "spec 0105 ile" notlu.

---

## Acceptance Criteria

### Süzme

- **AC-1.** Üretimde olmadığı işaretlenmiş bir model, müşteri formunun açık model ızgarasında çizilmez.
- **AC-2.** İşaretlenmemiş model ızgarada çizilir.
- **AC-3.** Ayarda işaret listesi hiç yokken, boşken **ya da prop hiç verilmemişken** bütün modeller çizilir ve ızgara spec öncesiyle aynı kartları gösterir (R24, ölçüm 13).
- **AC-4.** Düzenleme kipinde kaydın modeli üretimde olmasa da ızgarada çizilir ve kartı "üretimde değil" ibaresini `· üretimde değil` biçiminde taşır (R5/2).
- **AC-5.** Ekleme kipinde ön doldurulmuş model (Evrak'tan gelen kayıt) üretimde olmasa da çizilir, aynı ibareyle; o kipte `modal.edit` yoktur ve kaynak `form.model`'dir (R3/2, ölçüm 18).
- **AC-6.** Stokta canlı satırı olan model üretimde olmasa da çizilir, aynı ibareyle. Ölçüt stok sayacının normalize ettiği model anahtarıdır (R4/2).
- **AC-7.** Yalnız çöp kutusundaki stok satırı olan model bu istisnayı doğurmaz ve çizilmez.
- **AC-8.** Üretimde olan modelin kartında "üretimde değil" ibaresi bulunmaz.
- **AC-9.** Katalog doluyken bütün modeller süzülmüşse ızgara yerine boş durum metni çizilir ve metin Ayarlar › Katalog › Makina Modelleri'ndeki "Üretimde" kutusunu adres gösterir.

### Stok adedi

- **AC-10.** Modelin 2 satışa hazır ve 1 montajda satırı varsa kart "2 satışa hazır · 1 montajda" yazar.
- **AC-11.** Montajda satırı yokken kart yalnız satışa hazır adedini yazar.
- **AC-12.** Satışa hazır satırı yokken kart yalnız montajda adedini yazar.
- **AC-13.** Modelin hiç canlı stok satırı yoksa kart "Stokta yok" yazar.
- **AC-14.** Çöp kutusundaki stok satırı sayıya girmez.
- **AC-15.** Seri numarası olan ve olmayan satırların ikisi de sayıya girer.
- **AC-16.** Üretim durumu alanı hiç doğmamış stok satırı satışa hazır sayılır.
- **AC-17.** `stock` prop'u değişince kartın sayısı yeni değeri gösterir (sayı saklanmaz, okuma anında türer); testte `rerender` ile ölçülür. Açık formdan stok satırı silinemediği için ölçüm prop değişimidir (Karar 25).

### Değişmeyenler

- **AC-18.** Kartların sırası katalog sırasıdır; stok adedi değiştiğinde sıra değişmez. Sayacın döndürdüğü dizi satışa hazıra göre sıralı olduğu için kart kendi modelini anahtarla okur, diziyi gezmez (R9/2, ölçüm 23).
- **AC-19.** Karta tıklanınca model seçilir, ızgara kapanır ve model değiştiyse serisiz stok işareti sıfırlanır.
- **AC-20.** Stok › Makina Stoğu formunun model seçicisi üretimde olmayan modeli listelemeye devam eder (0091 AC-34 yeşil kalır).
- **AC-21.** Evrak teklif satırının model seçicisi üretimde olmayan modeli listelemeye devam eder (0091 AC-35 yeşil kalır).
- **AC-22.** Aynı model seçilip kaydedildiğinde yazılan müşteri kaydı spec öncesiyle birebir aynıdır; ölçümü testte tam nesne karşılaştırmasıdır (`toEqual`) ve formun mevcut kayıt testlerinin dokunulmadan yeşil kalmasıdır (Karar 26).
- **AC-23.** Yeni izin kimliği eklenmez ve sunucu yazma denetimi değişmez. Ölçümü içerik taramasıdır (ölçüm 20): `serverPermissionDefs.js`'e yeni kimlik girmez, `serverAuth.cjs`'in `ALAN_IZINLERI`'nde `customers` yok, `kilitAlanlari.js`'in listesi aynı, `merge.js`'in müşteri satırı aynı, `db.cjs`'de yeni sütun sabiti yok.
- **AC-24.** Ayarlar panelindeki kapsam ipucusu müşteri formunun model seçicisini sayar ve stok ile Evrak seçicilerinin etkilenmediğini söylemeye devam eder.
- **AC-25.** İşareti okuyan dosyalar taramasının **iki kopyası da** yalnız müşteri formuyla genişler ve iki desen de yeni yardımcının adını kapsar; başka hiçbir dosya işareti okumaz. `Customers.jsx` listeye girmez, çünkü ayarı yalnız iletir (C2, C3, ölçüm 17).
- **AC-26.** Kartın süzme kuralı ve stok metni saf kütüphanelerden gelir. Kaynak taramasının deseni C9'da: form `uretimdeSuzulmusModeller(` ile stok sayacını çağırır, işaret listesini doğrudan okuyan ad geçmez, `stock` üzerinde `reduce` ya da sayma amaçlı ikinci bir `filter` yoktur; seri seçicisinin `stock.filter`'ı ve `trLower` kullanımı gerekçeli istisnadır (ölçüm 19).

### QA turu kriterleri (2026-10-24)

- **AC-27.** Düzenleme kipinde başka bir modele geçildikten sonra kaydın **özgün** modeli ızgarada kalmaya devam eder ve geri seçilebilir (R3/2, Karar 19).
- **AC-28.** Kaydın modeli katalogda yoksa (çöpteki özel model) ızgara onu çizmez ve kapalı seçici kaydın adını yazmaya devam eder (R3/3, ölçüm 24).
- **AC-29.** Katalogda hiç model yokken ızgara yerine kendi kimliğiyle ikinci bir boş durum çizilir ve metni model eklemeyi adres gösterir; "Üretimde" kutusunu adres göstermez (R8/2, ölçüm 22).
- **AC-30.** Stok sayacı çizim başına bir kez çağrılır, girdisi yalnız `{ stock }`'tur ve kart kendi modelini anahtarla okur (R9/2, kaynak taraması ve çağrı sayısı casusu).
- **AC-31.** Formu doğrudan çizen altı test dosyası yeni prop'u vermeden yeşil kalır ve ızgara bütün modelleri çizer (R24, ölçüm 13).
- **AC-32.** İki kanıt kaydı kapanışta `docs/evidence/0105-taban-piksel-raporu.json`'u gösterir, `beklenen: "ayni"` taşır ve o raporda iki temada da `piksel: 0` verir (Karar 13, ölçüm 21).

---

## Görsel kanıt

- **Yeni ekran.** `musteri-formu-0105-model`: yeni müşteri formu açık, model ızgarası açık, `models` (bir kısmı işaretli), `appSettings` (işaret listesi dolu) ve `stock` (bir model satışa hazır ve montajda karışık, bir model stoksuz) birlikte verilir. İş turunda kaydı `beklenen: "degisti"` ve onay satırıyla girer.
- **Değişen ekran.** `katalog-model-uretimde`: kapsam ipucusunun metni değişiyor (Karar 11, R22/2). İş turunda `beklenen: "degisti"` ve onay.
- **Kapanış (Karar 13, ölçüm 21).** İki kaydı yalnız `beklenen`'i değiştirerek `ayni`ye çevirmek **mümkün değildir**: `ayni` kayıt gösterdiği raporda `piksel === 0` ister, yeni ekranın iş raporundaki satırında `piksel` anahtarı hiç yoktur ve değişen ekranın satırında sıfırdan büyük bir değer vardır. Bu yüzden spec `done`'a taşınırken `docs/evidence/0105-taban-piksel-raporu.json` bugünkü kodla, onaylanan "sonra" görüntüleri taban alınarak **yeniden çekilir** (0 piksel verir) ve iki kayıt o rapora bağlanıp `beklenen: "ayni"` yapılır. Emsal, bu işin ters çevirdiği iki spec'in kendisidir: 0091 ve 0093'ün bütün kayıtları kendi taban raporunu gösteriyor ve `ayni` taşıyor.
- **Değişmeyen ekranlar.** Mevcut müşteri formu ekranlarının hiçbiri `appSettings` vermiyor ve ızgarayı açık bırakmıyor (ölçüm 10), bu yüzden `musteri-formu`, `musteri-formu-hata`, `musteri-formu-ilk-odeme`, `musteri-formu-0079`, `musteri-formu-0094-ilce`, `musteri-formu-0103-parti` ve `musteri-formu-0104-stok` 0 piksel fark vermelidir. Fark çıkarsa süzme işaretsiz veride de çalışıyordur ve C8 bozulmuştur.

---

## Ters çevrilen kriterler

| Nerede | Bugünkü hâli | Bu spec'le |
|---|---|---|
| 0091 **R21** | Model, kalıp ve parça seçicileri işaretten etkilenmez | Müşteri formunun model seçicisi etkilenir; stok, Evrak, servis, kalıp ve parça seçicileri aynen kalır |
| 0091 **X1** | Model seçicilerinin süzülmesi kapsam dışı; gerekçesi "kullanıcı seçicilerde de kirlilik bildirirse ayrı iş" | Kullanıcı bildirdi, müşteri formu yarısı açıldı; kalan seçiciler bu spec'in X1 ve X2'siyle kapsam dışı kalır |
| 0091 **AC-33** ve `tests/ui/uretimdeki-modeller-0091.test.jsx:268` | Müşteri makinası formunun model seçicisi üretimde olmayan modeli listeler | Ters çevrilir. Test işaret verisiyle yeniden yazılır; bugünkü hâli işaret vermediği için kendiliğinden yeşil kalırdı (ölçüm 9) |
| 0091 **R28**, 0093 **R8** ve **R8/2**, `uretimdekiModeller.js:9` | İpucu "model seçicileri ... etkilenmez" diyor | Metin R22/2'deki birebir hâline güncellenir: üçüncü tüketici adıyla girer, "model seçicileri" ifadesi "stok ve Evrak model seçicileri" diye daralır. **Beş bağlı yer** birlikte güncellenir (ölçüm 16 ve uygulama notu): sabit, `plan-adetler-0093.test.js:54` (tam dize), `ui/uretimdeki-modeller-0091.test.jsx:106-107` (iki desen) `plan-adetler-0093.test.js:100` (0091 testinin kaynak satırını pinleyen meta-assertion) ve `ui/plan-adetler-0093.test.jsx:267-268` (Ayarlar panelindeki iki desen) |
| 0091 okuyucu taraması, `tests/uretimdeki-modeller-0091.test.js:146` ve `:152` | İşareti beş dosya okuyabilir | Liste müşteri formuna açılır ve desen `uretimdeSuzulmusModeller` adını da kapsar (C3, R23) |
| 0093 okuyucu taramasının **ikinci kopyası**, `tests/plan-adetler-0093.test.js:18`, `:88` ve `:91` | Aynı beş dosyalık küme ve aynı desen ikinci kez, bağımsız çalışıyor | Bu kopyanın da listesi ve deseni aynı biçimde genişler (ölçüm 17); tek dosyayı güncellemek yetmez |

0091'in AC-34 ve AC-35'i (stok ve Evrak seçicileri) **yeşil kalır** ve bu spec'in AC-20 ile AC-21'i onları ayrıca sabitler. AC-34'ün ekran testi var (`ui/uretimdeki-modeller-0091.test.jsx:279`), AC-35'in yok; AC-21 bu yüzden kaynak taramasıyla ölçülür (Karar 27, ölçüm 25). 0100, 0101, 0103 ve 0104'ün kriterleri değişmez; 0104'ün model değişiminde serisiz işareti sıfırlama kuralı (`:180`) bu işin kart tıklamasında aynen korunur (AC-19).

---

## Definition of Done

- [ ] Otuz iki kabul kriterinin hepsi karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Süzme kuralı `uretimdekiModeller.js`'te `uretimdeSuzulmusModeller` adıyla (R23), stok sayısı `stokDurumu.js`'te saf fonksiyon olarak yazıldı; form yalnız çiziyor ve ayarı bütün olarak alıyor (C2, C4, R24) ve kaynak taraması C9'un deseniyle bunu sabitliyor.
- [ ] Ters çevrilen kriterlerin testleri "spec 0105 ile" notuyla güncellendi; 0091 AC-33'ün testi işaret verisiyle yeniden yazıldı; ipucunun **beş** bağlı yeri (ölçüm 16 ve uygulama notu) ve okuyucu taramasının **iki** kopyası (ölçüm 17) birlikte güncellendi.
- [ ] Yeni kalıcı alan, veri bölümü, izin ve sunucu kuralı **eklenmediği** AC-23'ün içerik taramalarıyla doğrulandı (C1, Karar 21) ve commit'in değişen dosya listesi (`git diff --name-only`) SCORECARD'a yazıldı.
- [ ] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı yok.
- [ ] Görsel kanıt alındı: yeni ekran ve `katalog-model-uretimde` onaylı değişiklik, diğer yedi müşteri formu ekranı 0 piksel; kapanışta taban raporu yeniden çekildi ve iki kayıt `ayni`ye çevrildi (Karar 13, AC-32).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] CLAUDE.md'nin ilgili bölümü güncellendi (işaretin üçüncü tüketicisi ve müşteri formunun model seçicisi).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu 2026-10-24)

| Kod | Derece | Boşluk | Karar | İşlendiği yer |
|---|---|---|---|---|
| **B-1** | Bloklayıcı | Kanıt kayıtlarının `done`'da `ayni`ye çevrilmesi tanımsız (hangi rapor?) | Kapanışta taban raporu yeniden çekilir, iki kayıt ona bağlanır | Karar 13, ölçüm 21, AC-32, Görsel kanıt, DoD |
| **Ö-1** | Önemli | Formun yeni prop'unun varsayılanı yazılı değil, altı test formu doğrudan çiziyor | `appSettings = {}` varsayılanı | Karar 14, ölçüm 13, R24, AC-3, AC-31, C8 |
| **Ö-2** | Önemli | R4'ün eşleştirme ölçütü tanımsız; aynı kartta üç ayrı ölçüt var | Ölçüt stok sayacının anahtarı; X7 üçüncü ölçütü de sayar | Karar 15, ölçüm 14, R4/2, C6, AC-6 |
| **Ö-3** | Önemli | Yeni yardımcının adı yazılı değil, oysa iki tarama ada bakıyor | Ad `uretimdeSuzulmusModeller` | Karar 16, ölçüm 15, R23, C3, AC-25 |
| **Ö-4** | Önemli | Yeni ipucu metni yazılı değil, oysa dört yer onu pinliyor (biri meta-assertion) | Metin birebir yazıldı, dört yer birlikte güncellenir | Karar 17, ölçüm 16, R22/2, Ters çevrilen kriterler, DoD |
| **Ö-5** | Önemli | İzinli liste ve desen iki test dosyasında; spec birini sayıyor | İkisi de güncellenir, ikisi de spec'te adlı | Karar 18, ölçüm 17, C3, AC-25, başlık, Ters çevrilen kriterler |
| **Ö-6** | Önemli | R3'ün "kendi modeli" kaynağı tanımsız; biri AC-4'ü, öteki AC-5'i kırıyor | Korunan küme `modal.edit.model` ∪ `form.model` | Karar 19, ölçüm 18, R3/2, AC-5, AC-27 |
| **Ö-7** | Önemli | AC-26'nın taraması bugünkü kodda yanlış kırılır | Tarama deseni C9'da yazılı, iki gerekçeli istisna | Karar 20, ölçüm 19, C9, AC-26 |
| **Ö-8** | Önemli | AC-23 ve C1'in "değişmez" iddiası ölçülemiyor | Beş içerik taraması ve commit dosya listesi | Karar 21, ölçüm 20, AC-23, DoD |
| **K-1** | Küçük | AC-9 tek boş durum yazıyor, iki ayrı nedeni var | İki boş durum, ayrı kimlik ve ayrı metin | Karar 22, ölçüm 22, R8/2, AC-9, AC-29 |
| **K-2** | Küçük | Stok sayacının çağrı biçimi, girdisi ve sırası yazılı değil | Bir kez, `{ stock }` ile, anahtarla okunur | Karar 23, ölçüm 23, R9/2, C4, AC-18, AC-30 |
| **K-3** | Küçük | Kataloğda karşılığı olmayan model R3 ile kurtarılamaz | Sınır yazıldı, kapalı seçici adı yazmaya devam eder | Karar 24, ölçüm 24, R3/3, AC-28 |
| **K-4** | Küçük | AC-17'nin ölçümü belirsiz (açık formdan stok silinemez) | Prop değişimiyle, `rerender` ile ölçülür | Karar 25, AC-17 |
| **K-5** | Küçük | AC-22'nin ölçümü belirsiz | Tam nesne karşılaştırması ve mevcut testlerin yeşilliği | Karar 26, AC-22 |
| **K-6** | Küçük | AC-21'in (Evrak) kendi ekran testi yok | Kaynak taramasıyla ölçülür, yazılı | Karar 27, ölçüm 25, AC-21, Ters çevrilen kriterler |
| **K-7** | Küçük | Beş satır atfı kaymış (0104 uygulandı) | Atıflar güncellendi, doğru çıkanlar listelendi | Karar 30, ölçüm 1, 11, 27, Bağlam, başlık |
| **K-8** | Küçük | "Üretimde değil" ibaresinin kart içindeki biçimi yazılı değil | 0093'ün biçimi: soluk `· üretimde değil` | Karar 28, ölçüm 26, R5/2, C7, AC-4 |
| **K-9** | Küçük | `Customers`'ın forma ne geçireceği yazılı değil ve izinli listeyi etkiliyor | `appSettings` bütün olarak iletilir | Karar 29, R24, C2, AC-25 |

Toplam **18 bulgu: 1 Bloklayıcı, 8 Önemli, 9 Küçük**; tamamı Takım Yöneticisi tarafından 2026-10-24'te kabul edildi ve bu spec'e işlendi.

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
