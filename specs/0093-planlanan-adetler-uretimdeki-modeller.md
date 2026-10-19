# 0093 — Planlanan adetler penceresi yalnız üretimdeki modelleri listeler

| | |
|---|---|
| **Durum** | Onaylandı (revizyon 4, uygulama planı onayı 2026-10-19) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Mali İşler › Makina Maliyeti › Parti Hesabı ("Planlanan adetler" penceresi): ızgaranın süzülmesi, üretimde olmayan ama planlanan adedi girilmiş modellerin kendi bölümü, iki boş durum, süzgeç ibaresi ve pencerenin beş yeni metin sabiti; Ayarlar › Katalog › Makina Modelleri'nin kapsam ipucusu (`src/lib/uretimdekiModeller.js`) ve "üretimde değil" ibaresinin aynı kütüphaneye taşınması; 0091'in **üç** testi; üç yeni ve üç değişen görsel kanıt ekranı. Saf motor, veri ve izin tarafı değişmez. |
| **Bağımlı spec'ler** | 0091 (üretim işareti; bu spec R29, X9 ve AC-43'ü **ters çevirir**, R28'in ipucu metnini daraltır), 0088 (Parti Hesabı görünümü, planlanan adet alanı ve penceresi), 0022 (üretim partisi), 0016 (boş durum kuralı) |
| **Revizyon** | · 1 · 2026-10-19 ilk taslak · 2 · 2026-10-19 Takım Yöneticisi onayı: Context'teki üç karar da önerilen seçenekle kapandı (gizlenen modelin kayıtlı adedi ayrı bölümde görünür, boş durum metni, pencere içi süzgeç düğmesi yok); R3 ve R7 kesinleşti, karar 3 X7 olarak kapsam dışına yazıldı · 3 · 2026-10-19 QA boşluk analizi: yirmi üç bulgu (üç bloklayıcı, on önemli, on küçük) onaylandı ve işlendi; kaldırma mekanizması, süzgecin yeri, iki boş durum, ipucunun birebir metni, ters çevrilen üçüncü test ve kanıt ekranları kesinleşti (Karar kaydı tablosu) · 4 · 2026-10-19 uygulama planı onayı (`specs/0093-uygulama-plani.md` §4): dokuz öneri kabul edildi; R7/5, R11/2, R12/2, C7/2, AC-21/3, AC-19/3 eklendi, AC-23 yeniden yazıldı (Plan kararları tablosu) |

---

## Intent

Fabrika yönetimi bir üretim partisini henüz üretmeden fiyatlamak için "Planlanan adetler" penceresini kullanıyor. Pencere bugün kataloğun **bütün** modellerini listeliyor, yani yıllar önce üretimden kalkmış modeller de her parti planlamasında karşısına çıkıyor. Takım Yöneticisi 2026-10-19'da bu pencerede yalnız Ayarlar'da "Üretimde" işaretli modellerin görünmesini istedi.

Acı küçük ama her parti planlamasında tekrarlıyor: pencere bir veri girme formudur, kullanıcı orada aradığı modeli bulup adet yazmak ister; artık üretilmeyen model o listede yalnız gürültüdür ve yanlış satıra adet girme riskini taşır. Katalog büyüdükçe pencere uzuyor.

Başarı şu: Takım Yöneticisi Ayarlar › Katalog › Makina Modelleri'nde bir modelin "Üretimde" işaretini kaldırdığında o model bir daha planlanan adetler penceresinde çıkmaz, ama o modele girilmiş eski bir planlanan adet **kaybolmaz ve görünmez olmaz**: pencerede ayrı bir yerde durur, düzeltilebilir ve kaldırılabilir. Parti hesabının rakamları değişmez.

---

## Requirements

- **R1.** "Planlanan adetler" penceresindeki model alanları yalnız **üretimde** olan modeller için çizilir. Üretimde olmayan model için alan çizilmez.
- **R1/2.** (QA B-2.) Süzme `PartiHesabi` içinde, **yalnız çizim anında türetilen ikinci bir değişkenle** yapılır (ör. `cizilen = modeller.filter(m => m.uretimde !== false)`); ızgara (`:134`) yalnız onu dolaşır. `modeller` adı hiçbir yerde yeniden bağlanmaz ve `MakinaMaliyeti.jsx` değişmez. **Tam listeyle kalan beş yer** şunlardır ve hiçbiri süzülmez: saf motor çağrısı (`:32`), pencerenin ilk durumunu kuran `planAc` tohumu (`:37`), `planBulunamayan` (`:39`), `planKaydet`'in başlangıç nesnesi (`:41`) ve R3 bölümünün kaynağı.
- **R1/3.** (QA K-4.) Karşılaştırma `m.uretimde !== false` biçimindedir (Model Maliyetleri'nin birebir aynı formu, `ModelMaliyetleri.jsx:56`): alanı hiç taşımayan bir satır üretimde sayılır, yani eksik veri modeli gizlemez.
- **R2.** Alanların sırası bugünkü sırada kalır (önce standart modeller, sonra özel modeller; kataloğun kendi sırası).
- **R3.** Üretimde olmayan bir modelin **kayıtlı planlanan adedi varsa** o model pencerede kendi bölümünde, "üretimde değil" ibaresiyle görünür; adedi düzeltilebilir ve kaldırılabilir (karar 1, onaylandı).
- **R3/2.** (QA B-1, bloklayıcı.) Bölümün satırı **yalnız bir girdi alanıdır**; kaldırma, alanı boşaltmaktır. Ayrı bir "Kaldır" düğmesi **yoktur** ve satır bugünkü `kaldirilan` dizisine girmez. Gerekçe ölçülmüştür (ölçüm 3, dördüncü satır): `planKaydet` önce `kaldirilan`'ı siliyor (`:42`), sonra `plan.adetler` döngüsü aynı adı dolu değerle geri yazıyor (`:43`), yani iki mekanizma birlikte konursa kullanıcının kaldırması sessizce geri alınır ve bildirim yine "kaydedildi" der.
- **R3/3.** (QA Ö-7.) Bölümün ölçütü `planAc`'ın bugünkü doğruluk kuralıyla aynıdır: saklı değeri doğruluk değeri taşıyan gizli model çizilir. Saklı 0 ya da boş değer "girilmedi" sayılır ve hiçbir yerde çizilmez (motorun 0 = girilmedi kuralı, 0088 AC-27). Doğruluk değeri taşıyan **geçersiz** saklı değer (birleştirme ya da içe aktarmadan kalma) çizilir, hatası alanının altında görünür ve düzeltilebilir.
- **R3/4.** (QA K-1.) Bölümün satır sırası kataloğun kendi sırasıdır (`modeller` sırası korunarak süzülenler).
- **R3/5.** (QA Ö-5.) Bölümün girdisinin erişilebilir adı ızgaranınkinden **ayrıdır**: `<model> planlanan adedi (üretimde değil)`. Izgaranın adı bugünkü gibi `<model> planlanan adedi` kalır.
- **R3/6.** (QA K-2.) Bölümün başlığı kardeş bölümün `Ipucu` kalıbıyla (`:144`) yazılır: "Üretimde olmayan ama planlanan adedi girilmiş modeller:" ve altında "Kaldırmak için alanı boşaltın."
- **R4.** Pencere, listenin süzüldüğünü ve işaretin nerede değiştirildiğini tek satırda söyler.
- **R4/2.** (QA Ö-6.) Satırın yeri ve biçimi: pencerenin bugünkü `Ipucu`'su (`:132`, alanların anlamı) **aynen kalır**, hemen altına ikinci bir `Ipucu` gelir. Taban cümle koşulsuz ve sayısızdır: *Liste yalnız Ayarlar › Katalog › Makina Modelleri'nde "Üretimde" işaretli modelleri gösterir.* Gizli model varsa tek ek cümle gelir: *Üretimde olmayan n model listede yok.* Sayı sıfırken bu ek hiç yazılmaz.
- **R4/3.** (QA K-5.) Aynı satır X7'nin gerekçesini kullanıcıya söyler: *Üretimden kalkmış bir modele adet girmek gerekiyorsa işaret Ayarlar'da geri konur.*
- **R5.** Parti Hesabı'nın geri kalanı süzülmez: model-adet tablosunun satırları, parti özeti, gerçekleşen tedarik karşılaştırması ve iki "bulunamayan" uyarısı bütün canlı modelleri okumaya devam eder (0091 R20 ve AC-32 ters çevrilmez).
- **R6.** Pencerenin kaydı, **çizilmeyen** bir modelin kayıtlı planlanan adedini değiştirmez; R3 bölümünde kaldırılan ad ile pencerede boşaltılan alan dışında hiçbir ad listeden düşmez, hiçbiri eklenmez.
- **R7.** (Karar 2, onaylandı.) Üretimde işaretli hiç model yoksa pencere boş ızgara çizmez; süzgecin kapsamını ve işaretin yerini söyleyen bir boş durum metni gösterir. R3 bölümü ve "modeli bulunamayan planlanan adetler" bölümü varsa yine çizilir, Kaydet düğmesi çalışmaya devam eder.
- **R7/2.** (QA B-3, bloklayıcı.) Pencerede **iki ayrı boş durum** vardır, Model Maliyetleri'nin emsali birebir alınır (`ModelMaliyetleri.jsx:88-89`): katalog boşsa "Tanımlı makina modeli yok" (metin: modeller Ayarlar › Katalog › Makina Modelleri'nde tanımlanır), katalog dolu ama üretimde işaretli model yoksa R7'nin sayılı metni. Katalog boşken sayılı metin **çizilmez**: üretimde olmayan model sayısı sıfır olduğu için cümle yanlış olurdu.
- **R7/5.** (Plan kararı P5.) Üretimde işaretli model yokken boş durumun metni birebir: başlık *Üretimde işaretli model yok*, açıklama *n model üretimde değil olarak işaretli. İşaret Ayarlar › Katalog › Makina Modelleri'nde değiştirilir.* (Model Maliyetleri'nin metni oradaki aç/kapa düğmesine yönlendirir; pencerede o düğme yok, X7.)
- **R7/3.** (QA Ö-4.) Metnin sayısı motordan okunur (`modelSayilari(modeller).uretimdeDisi`); ekranda ikinci bir sayaç yazılmaz (0091 C7, AC-42). Boş durum dalının kararı süzülmüş dizinin boşluğundan verilir (`cizilen.length === 0`), bu bir çizim kararıdır, sayım değildir.
- **R7/4.** (QA K-6.) Boş durum yalnız **ızgaranın** yerine geçer: pencerenin bugünkü `Ipucu`'su, R4 satırı, R3 bölümü, "modeli bulunamayan planlanan adetler" bölümü ve alt düğmeler aynen çizilir.
- **R8.** Ayarlar › Katalog › Makina Modelleri panelindeki kapsam ipucusu, işaretin artık **Model Maliyetleri ile Parti Hesabı'nın planlanan adetler penceresini** süzdüğünü söyler; model seçicilerinin, Analiz'in ve makina kayıtlarının etkilenmediğini söylemeye devam eder.
- **R8/2.** (QA Ö-1.) Sabitin (`uretimdekiModeller.js:8`) yeni metni birebir şudur: *"Üretimde" işareti Makina Maliyeti › Model Maliyetleri'ni ve Parti Hesabı'nın planlanan adetler penceresini süzer; Parti Hesabı'nın model-adet tablosu, model seçicileri, Analiz ve makina kayıtları etkilenmez.* Cümle **Parti Hesabı'nın tablosunu** ayrıca sayar, çünkü tablo R5 ve X3 ile süzülmez; yalnız "Parti Hesabı'nı süzer" demek yeni bir yanlış olurdu.
- **R9.** Yeni kalıcı alan, yeni veri bölümü, yeni izin ve göç yoktur. İşaret bugünkü yerinde ve bugünkü anlamında kalır: salt görünüm tercihi.
- **R10.** Pencerenin kaydetme yetkisi (`gider_tanim`) ve kayıt anındaki üretim partisi kilidi denetimi değişmez.
- **R11.** (QA Ö-10.) Pencerenin kullanıcıya görünen beş yeni metni (R4 taban cümlesi, R4'ün sayı eki ve X7 cümlesi, R3 bölüm başlığı, iki boş durum metni) `PartiHesabi.jsx`'ten **dışa verilen sabitlerdir**; aynı dosyadaki emsaller `KAR_KUMELERI_NOTU`, `PAY_AYRIM_IBARESI` ve `TEDARIK_FARK_CUMLESI`. Testler metni ekrandan değil sabitten okur.
- **R11/2.** (Plan kararı P4.) "Beş metin" sayımı cümle başına bir sabite açılır; yedi ad: `PLAN_SUZGEC_CUMLESI` (R4 taban), `planGizliEki(n)` (R4 sayı eki), `PLAN_GERI_KOYMA_CUMLESI` (R4/3), `PLAN_GIZLI_BASLIK` ve `PLAN_GIZLI_KALDIRMA` (R3/6), `PLAN_BOS_MODEL` ve `PLAN_BOS_URETIMDE` (R7/2; `{ baslik, metin }`, ikincinin metni sayı alır). Katalog boş metni Model Maliyetleri'nin satır içi metniyle aynıdır ama oradan içe alınmaz (P6: C6 o ekranı değiştirmemeyi, R12 kardeş görünüme bağlanmamayı ister; bilinen küçük yineleme).
- **R12.** (QA Ö-8.) "üretimde değil" ibaresi işaretin kendi kütüphanesine taşınır (`src/lib/uretimdekiModeller.js`, `URETIM_DEGIL_IBARESI`) ve `ModelMaliyetleri.jsx`'in `URETIM_METIN.uretimdeDegil` anahtarı onu **yeniden dışa verir**; pencere ibareyi kütüphaneden okur. İki ekranda iki kopya metin olmaz ve bir görünüm kardeş görünüme bağlanmaz (desenin emsali `GiderAlanlari`'nın `TutarInput`'u).
- **R12/2.** (Plan kararı P2.) R12 ile C7 çelişiyordu: 0091'in taraması işareti okuyan dosyayı **modül yolundan** (`uretimdekiModeller`) tanıyordu, yani ibareyi kütüphaneden alan iki ekran "işareti okuyor" sayılırdı. Tarama işareti okuyan **adlara** çevrilir (`uretimdeOlmayanModeller`, `URETIM_ALANI`, `uretimdeMi`, `uretimdeOlmayanlar`, `uretimIsaretiDegistir/Tasi/Dusur`); `PartiHesabi.jsx` ile `ModelMaliyetleri.jsx`'in bu modülden içe aldığı ad kümesi tam olarak `{URETIM_DEGIL_IBARESI}`'dir. Metin sabiti okumak işaret okumak değildir.

---

## Constraints

### Uyulması zorunlu

- **C1.** Süzme **yalnız pencerenin alan listesine** uygulanır. Parti hesabına verilen model listesi tam kalır. Ölçtüm (Context, ölçüm 1): liste süzülürse partiye bağlı ya da planlı makinanın modeli "bulunamayan" sayılıyor, satır tablodan düşüyor, toplam standart maliyet 14.000 TL'den **0'a** iniyor ve ekran "model silinmiş ya da adı değişmiş olabilir" diye yanlış uyarı veriyor.
- **C2.** "Modeli bulunamayan planlanan adetler" listesi (bugün `PartiHesabi.jsx:39`) karşılaştırmasını **tam** canlı model listesiyle yapmaya devam eder. Süzülmüş listeyle karşılaştırılırsa üretimde olmayan ama var olan model "silinmiş" damgası yer.
- **C2/2.** (QA B-2.) Pencerenin durumu da tam listeden doğar: `planAc` (`:37`) bütün modelleri tohumlar, `planKaydet` başlangıç nesnesini partinin kayıtlı adetlerinden kurar (`:41`). Ölçüm 3'ün ilk iki satırı tam ve süzülmüş tohumun R6 bakımından eşit olduğunu gösteriyor, yani seçim bedelsizdir; tam tohum seçilir çünkü R3 satırı böylece ızgarayla aynı anahtar uzayını, aynı `planAdediDogrula`'yı, aynı `plan.hatalar`'ı ve aynı kayıt döngüsünü kullanır.
- **C3.** İşaret karşılaştırması 0091 C14a'daki gibi **birebir** model adıyla yapılır; Türkçe küçültme kullanılmaz (yeniden adlandırma zincirini koparır). Makina ile model eşlemesi ayrı sorudur ve bugünkü Türkçe küçültmeli hâliyle kalır (0091 C14b).
- **C4.** Pencere işareti uygulama ayarından yeniden türetmez: satırlar 0091 R25/2'den beri `uretimde` bilgisini taşıyor ve Parti Hesabı bu listeyi hâlihazırda alıyor. İkinci bir okuma yolu açılmaz (tek kaynak kuralı).
- **C5.** Hesap içeren hiçbir şey eklenmez; bu iş **çizim, beş kullanıcı metni ve bir kütüphane sabitidir** (QA Ö-10 ile düzeltildi: revizyon 2 "bir metin sabiti" diyordu, oysa R4, R3/6 ve R7/2 ile pencerenin kendi metinleri de doğuyor). Saf motorun imzası ve çıktısı değişmez, yani 0088 ve 0091'in motor testleri dokunulmadan yeşil kalır.
- **C6.** Üretim Partileri görünümü, Model Maliyetleri ve Hesap Ayarları bu spec'te değişmez. `MakinaMaliyeti.jsx` de değişmez (süzme orada yapılırsa Model Maliyetleri'nin kendi aç/kapa düğmesi ve parti tablosu birlikte bozulur; C1, X3).
- **C7/2.** (Plan kararı P8.) Tamamlanmış `specs/done/0091-…md` metnine dokunulmaz; R29, X9 ve AC-43'ün ters çevrilmesi test yorumlarında "spec 0093 ile" notuyla ve `CLAUDE.md`'de kayıtlıdır (0089, 0090 emsali).
- **C7.** (QA Ö-3.) C4'ün "ikinci okuma yolu açılmaz" kuralının **kriteri** olur: `PartiHesabi.jsx` işaretin kendisini (`uretimdeOlmayanModeller`, `uretimdekiModeller`, `uretimdeMi`) okuyan dosyalar listesine **girmez**, yalnız satırın kendi alanını (`m.uretimde`) okur. 0091'in taraması (`uretimdeki-modeller-0091.test.js:149`) bu yüzden **silinmez, daraltılır**: ters çevrilen yalnız `PartiHesabi.jsx` için konmuş `not.toMatch(/uretimde/)` satırıdır, bir üstteki izinli dosya kümesi güvencesi yerinde kalır.

### KAPSAM DIŞI

- **X1.** Model seçicilerinin (Yeni Müşteri, Makina Geçmişi, makina stoğu) süzülmesi — *neden:* 0091 X1 aynen geçerli; üretimden kalkmış modelin ikinci el devri, servisi ve yedek parçası sürüyor, o seçicilerden kalkarsa eski makina kaydedilemez.
- **X2.** Analiz'in model süzmesiyle birleştirme — *neden:* 0091 X2; iki ayrı soru ("hâlâ üretiyor muyuz" ile "Analiz'de görmek istiyor muyum").
- **X3.** Parti Hesabı'nın model-adet tablosundaki satırların süzülmesi — *neden:* C1 ve 0091 R20; geçmiş partide üretimden kalkmış modelin makinaları vardır ve maliyeti hesaplanmalıdır.
- **X4.** Pencerede modelin "Üretimde" işaretini değiştirme imkânı — *neden:* işaretin tek yeri Ayarlar › Katalog › Makina Modelleri'dir; ikinci giriş kapısı iki ekranı ayrı ayrı doğru tutma yükü getirir, R4 nerede olduğunu söyler.
- **X5.** Kataloğa model emeklilik tarihi ya da parti bazında model listesi — *neden:* bugünkü işaret tek bir soruya cevap veriyor ve istenen yalnız o; tarih bazlı kural ayrı iştir.
- **X6.** Kullanıcı rehberinin (`docs/rehber/`) güncellenmesi — *neden:* rehber 0080–0083 sonrası zaten güncel değil, açık bulgu olarak kayıtlı; tek seferde ayrı işte yapılmalı.
- **X7.** Pencerenin içinde "üretimde olmayanları da göster" aç/kapa düğmesi — *neden:* karar 3, onaylandı; Model Maliyetleri bir rapordur ve orada bütün kataloğu göstermek anlamlıdır, bu pencere veri girme formudur ve istenen tam olarak listenin kısalmasıdır. Üretimden kalkmış bir modele yeni parti planlanması gerekiyorsa doğru hamle Ayarlar'da işareti geri koymaktır, çünkü o model gerçekten yeniden üretiliyor demektir. R3 zaten kayıtlı adedi olan gizli modeli gösterir, yani görülmesi gereken tek şey görünür kalır.
- **X8.** (QA B-1'in reddedilen seçeneği.) R3 satırına ızgaranın girdisinin yanında ayrı bir "Kaldır" düğmesi koymak — *neden:* ölçüm 3'ün dördüncü satırı; iki mekanizma birlikte konursa `planKaydet`'in sırası kaldırmayı geri alır ve spec'e bir öncelik kuralı yazmak (döngünün `kaldirilan`'daki adı atlaması) zorunlu olur, yani C5'in "yalnız çizim" iddiası düşer. "Modeli bulunamayan" bölümünde düğme vardır çünkü orada düzeltilecek bir değer yoktur; burada model vardır ve düzeltilebilir, soru farklıdır.

---

## Context

### Bugünkü hâl

Pencere `src/components/maliyet/PartiHesabi.jsx` içinde ve model listesini **iki yerde** okuyor:

| Yer | Satır | Ne yapıyor |
|---|---|---|
| `planAc` | `:37` | Pencerenin ilk durumunu kurar: her modelin adı için bir alan, değeri partinin kayıtlı adedi |
| Pencere ızgarası | `:133-141` | `modeller.map(...)` ile alanları çizer |
| `planBulunamayan` | `:39` | Kayıtlı planlanan adedi olup kataloğun hiçbir satırıyla eşleşmeyen adlar (C2) |
| `planKaydet` | `:40-50` | Doğrular, kilide bakar, partinin `planlananAdetler` nesnesini yazar |
| Parti hesabı çağrısı | `:32` | Aynı `modeller` listesini saf motora verir (`partiHesabi`) |

`modeller` listesi `src/components/MakinaMaliyeti.jsx:38`'de bir kez kurulur (`modelMaliyetleri(..., { uretimdeDisi, uretim: gercek })`) ve dört görünüme **aynı nesne** olarak dağıtılır (`:45` `ortak`). Her satır 0091'den beri `uretimde` boole değerini taşıyor; Model Maliyetleri süzmesini bu alanla yapıyor (`ModelMaliyetleri.jsx:56`: `modeller.filter(m => m.uretimde !== false)`). Yani bu spec'in ihtiyaç duyduğu veri **hazır**, yeni hesap gerekmez (C4).

İşaretin kendisi `appSettings.uretimdeOlmayanModeller` (üretilmeyen adların listesi; adı listede olmayan model üretimdedir) ve kütüphanesi `src/lib/uretimdekiModeller.js`. Kapsam ipucusu o dosyanın `:8` satırındaki sabitte duruyor ve bugün şöyle: *"Üretimde" işareti yalnız Makina Maliyeti › Model Maliyetleri'ni süzer; model seçicileri, Analiz, Parti Hesabı ve makina kayıtları etkilenmez.* Bu cümle bu iş bitince **yanlış** olur, R8 onu düzeltir.

### 0091 bilinçli olarak tersini söylüyordu

Spec 0091 bu pencereyi bilerek dışarıda bıraktı: R29 ("pencere modellerin tamamını listelemeye devam eder: o bir model seçicisidir"), X9 (aynı gerekçe) ve AC-43 ("pencere üretimde olmayan modeli listelemeye devam eder"). Gerekçe pencereyi bir **seçici** saymaktı. Takım Yöneticisi'nin bugünkü isteği bu sınıflandırmayı değiştiriyor: pencere bir seçici değil, planlama formudur. Karar Takım Yöneticisi'nindir ve bu spec onu kayda geçirir; 0091'in **üç** testi ters çevrilecek ya da güncellenecek ve yorumlarında "spec 0093 ile" notu taşıyacak (QA Ö-2: revizyon 2 iki test sayıyordu, üçüncüsü atlanmıştı):

| Test | Satır | Ne olacak |
|---|---|---|
| `uretimdeki-modeller-0091.test.js` (AC-33…AC-43) | `:147` | Yalnız `PartiHesabi.jsx` için konmuş `not.toMatch(/uretimde/)` satırı düşer; izinli dosya kümesi güvencesi C7 ile korunur ve daraltılır |
| `ui/uretimdeki-modeller-0091.test.jsx` (AC-32 / AC-43) | `:240` | "pencere üretimde olmayan modeli listeler" beklentisi tersine çevrilir; AC-32'nin parti tablosu yarısı aynen kalır |
| `ui/uretimdeki-modeller-0091.test.jsx` (AC-12/2) | `:102-106` | İpucu metnini birebir sınıyor; birinci düzenli ifade (`/yalnız Makina Maliyeti › Model Maliyetleri/`) yeni kapsamı arar, **ikinci ifade (`/model seçicileri, Analiz/`) aynen korunur** ve AC-16'nın "söylemeye devam eder" yarısının kanıtı sayılır |

### Ölçüm 1: listeyi motora süzülmüş vermek hesabı çökertiyor

Gerçek motorla ölçtüm (2026-10-19). Kurulum: iki model (AK100, AK200_ESKI), AK200_ESKI'nin planlanan adedi 4 ve partide o modelden bir stok makinası var, birim pay 500 TL.

| Motora verilen liste | Tablo satırı | Toplam standart maliyet | Önerilen ciro | Uyarı |
|---|---|---|---|---|
| **Tam** (bugünkü hâl) | AK200_ESKI, adet 4, planlanan | **14.000,00 TL** | 28.000,00 TL | yok |
| **Süzülmüş** (yanlış uygulama) | yok | **0,00 TL** | 0,00 TL | "Partiye bağlı ama modeli tanımlı olmayan makinalar" |

Yani süzgeç yanlış yere konursa parti hesabı sessizce sıfırlanır ve ekran modelin silindiğini söyler. C1 bu yüzden zorunlu kuraldır.

### Ölçüm 2: gizlenen modelin kayıtlı adedi görünmeden yaşıyor

`planKaydet` kaydı partinin **mevcut** nesnesinden başlatıp (`:41`) yalnız pencerede çizilen alanları ve kaldırılan adları işliyor. Bu 0091 R18/2'nin bilinçli kuralıdır (listede olmayan ad korunur) ve doğru bir kuraldır, ama süzgeçle birlikte şu sonucu veriyor. Pencerenin kendi kodunu birebir kopyalayıp ölçtüm:

| Durum | Kayıtta ne kalıyor |
|---|---|
| Tam liste, kullanıcı AK200_ESKI'yi boşaltıp kaydeder | `{AK100: 3}` (silinir, doğru) |
| Süzülmüş liste, kullanıcı AK100'ü 5 yapıp kaydeder | `{AK100: 5, AK200_ESKI: 4}` |
| Süzülmüş liste, kullanıcı hiçbir şeyi değiştirmeden kaydeder | `{AK100: 3, AK200_ESKI: 4}` |

AK200_ESKI'nin 4 adedi duruyor, parti tablosunda **görünmeye devam ediyor** (C1 gereği satır çizilir) ve toplam maliyete 14.000 TL katıyor, ama kullanıcının onu düzeltebileceği ya da kaldırabileceği hiçbir yer kalmıyor. Kapalı döngü: rakamı görüyorsunuz, kaynağına ulaşamıyorsunuz. R3 bunu kapatır.

### Karara bağlanan üç soru (Takım Yöneticisi onayı, 2026-10-19)

Üçü de önerilen seçenekle kapandı. Reddedilen seçenekler ve gerekçeleri kayıt olarak burada kalır; kararı yeniden açmak gerekirse tartışma baştan kurulmaz.

**Karar 1 (onaylandı: a): gizlenen modelin kayıtlı planlanan adedi ne olur?**

| Seçenek | Sonuç | Bedel |
|---|---|---|
| **(a) Pencerede ayrı bölümde görünür, düzeltilebilir ve kaldırılabilir** | Rakamın kaynağına her zaman ulaşılır | Pencerede ikinci bir bölüm; "modeli bulunamayan planlanan adetler" bölümünün (`:142-158`) aynı deseni, yani yeni kalıp değil |
| (b) Kaydederken üretimde olmayan modellerin adedi kendiliğinden düşer | Pencere en temiz hâlde kalır | Kullanıcının görmediği bir veri, onun bir tıklamasıyla **sessizce** silinir; parti maliyeti kaydetmekle değişir |
| (c) Hiç görünmez, kayıtlı adet olduğu gibi kalır | En az iş | Ölçüm 2'deki kapalı döngü; uygulamada "nereden geliyor bu rakam" sorusu doğurur |

**Onaylanan (a), önerim de buydu.** Gerekçe: pencerede bu deseni taşıyan bir bölüm zaten var ve kullanıcı ona alışkın; (b) sessiz veri değişikliğidir ve bu projede daha önce kaç kez acı verdiği CLAUDE.md'de yazılı; (c) ölçüm 2'nin kendisidir. Maliyeti: bir bölüm, kabaca on satır çizim, yeni kural yok.

**Karar 2 (onaylandı: a): üretimde işaretli hiç model yoksa pencere ne gösterir?**

| Seçenek | Sonuç |
|---|---|
| **(a) Boş durum metni: kaç modelin üretimde olmadığı ve işaretin Ayarlar'da olduğu** | Kullanıcı neden boş olduğunu okur ve nereye gideceğini bilir |
| (b) "Planlanan adetler" düğmesi hiç çizilmez | Kullanıcı düğmenin neden kaybolduğunu anlamaz; R3 bölümündeki eski adetlere de ulaşamaz |

**Onaylanan (a), önerim de buydu.** Gerekçe: 0016'nın boş durum kuralı (boş ızgara yerine açıklamalı boş durum) ve Model Maliyetleri'nin aynı durumdaki emsali (`bos-model-maliyet-uretimde`). Ayrıca R3 ve "bulunamayan" bölümlerinin hâlâ çizilmesi gerekiyor, yani pencere açılabilir kalmalı. Maliyeti: bir metin.

**Karar 3 (onaylandı: a): pencerenin içinde "üretimde olmayanları da göster" düğmesi olsun mu?**

| Seçenek | Sonuç |
|---|---|
| **(a) Olmasın** | Pencere kısa kalır; görülmesi gereken tek şey (kayıtlı adedi olan gizli model) R3 ile zaten görünür |
| (b) Model Maliyetleri'ndeki gibi bir aç/kapa düğmesi olsun | Kullanıcı istediğinde bütün kataloğa adet girebilir, yani işaret bir öneri olur |

**Onaylanan (a), önerim de buydu; X7 olarak kapsam dışına yazıldı.** Gerekçe: Model Maliyetleri bir rapordur, orada "bütün kataloğu göster" anlamlıdır; bu pencere veri girme formudur ve istek tam olarak listenin kısalmasıdır. Üretimden kalkmış bir modele yeni parti planlamak gerekiyorsa doğru hamle Ayarlar'da işareti geri koymaktır, çünkü o model gerçekten yeniden üretiliyor demektir. Maliyeti: sıfır; (b) seçilirse süzgeç durumu, erişilebilir adı ve iki metni gerekir.

### Ölçüm 3: kayıt döngüsünün yedi senaryosu (QA B-1 ve C2/2'nin dayanağı)

`planKaydet`'in (`:40-50`) mantığını birebir kopyalayıp ölçtüm (2026-10-19). Kurulum: partinin kayıtlı adetleri `{AK100: 3, AK200_ESKI: 4}`, AK200_ESKI üretimde değil.

| Senaryo | Kayıtta kalan |
|---|---|
| Tam tohum, kullanıcı hiçbir şeyi değiştirmeden kaydeder | `{AK100: 3, AK200_ESKI: 4}` |
| Süzülmüş tohum (gizli alan hiç yok), değişiklik yok | `{AK100: 3, AK200_ESKI: 4}` |
| R3 satırı yalnız "Kaldır" düğmesi taşıyor | `{AK100: 3}` |
| **R3 satırı input ile "Kaldır" düğmesini birlikte taşıyor** | **`{AK100: 3, AK200_ESKI: 4}`** |
| R3 satırının alanı boşaltılarak kaldırılıyor | `{AK100: 3}` |
| R3 satırının alanı düzeltiliyor (4 → 7) | `{AK100: 3, AK200_ESKI: 7}` |
| Gizli modelde geçersiz saklı değer | kayıt olmaz; hata `AK200_ESKI` anahtarında |

Dördüncü satır R3/2'nin ve X8'in gerekçesidir: satır 42 `kaldirilan`'daki adı siliyor, satır 43 döngüsü aynı adı dolu değerle geri yazıyor, yani kullanıcı "Kaldır" diyor, Kaydet'e basıyor, bildirim "kaydedildi" diyor ve adet olduğu yerde duruyor. Beşinci satır boşaltmanın AC-6'yı zaten karşıladığını gösteriyor. İlk iki satır tam ve süzülmüş tohumun R6 bakımından eşit olduğunu gösteriyor (C2/2). Yedinci satır R3/3'ün ikinci yarısının gerekçesidir: gizli bir modelin geçersiz saklı değeri hiçbir yerde çizilmezse kullanıcı Kaydet'e basar, hiçbir hata görmez ve hiçbir şey kaydedilmez; pencere sessizce kilitlenir.

### Ölçüm 4: görsel kanıtın bedeli (QA Ö-9)

Kanıt eşlemesini (`docs/evidence/kanit-eslemesi.json`) ve görüntü aracının ekran tanımlarını taradım (2026-10-19).

| Ekran | Tanım | Bu işte ne olur |
|---|---|---|
| `maliyet-parti-plan-formu` | `0009-sayfa.jsx:767` (işaretsiz veri) | R4 satırı eklendiği için pikseli **değişir**; ızgara değişmez, çünkü bu veride gizli model yok |
| `katalog-model` | `:672` | İpucu metni değiştiği için **değişir** |
| `katalog-model-uretimde` | `:674` | İpucu metni değiştiği için **değişir** |
| `katalog-model-ekmaliyet` | `:679` (Düzenle penceresi açık, kaydırılmış) | İpucu kadrajın dışında kalabilir; raporla doğrulanır |
| `kilit-katalog-paneli` | `:1033` (kilit çakışması çizilir) | Panel çizilmediği için değişmesi beklenmez |
| Süzülmüş ızgara, R3 bölümü, boş durum | yok | Üç **yeni** ekran gerekir |

Yeni ekran adları: `maliyet-0093-plan-suzulmus`, `maliyet-0093-plan-gizli-adet`, `maliyet-0093-plan-bos`. Değişen üç mevcut ekranın kaydı `beklenen: "degisti"` + `onay: "Takım Yöneticisi · 2026-10-19 · spec 0093 R1/R4/R8"` ile açılır; bu yalnız TY onayıyla yazılır, yani iş başlamadan hazır olmalıdır.

### Bilinen tuzaklar

- **Dört nokta, MERGE_KEYS, serverAuth:** hiçbiri gerekmiyor. Yeni kalıcı alan yok; işaretin kendisi 0091'de kuruldu (`db.cjs` dört noktası, `AYAR_ALAN_SEKMELERI`, `mergeAppSettings`).
- **Çoklu kullanıcı:** işaret uygulama ayarıdır ve `mergeAppSettings` yerel değeri korur (0091 X8'in bilinen sınırı aynen geçerli: iki bilgisayar aynı anda farklı model işaretlerse biri kaybolur).
- **Çöp kutusu:** çöpe atılan modelin adı işaret listesinden düşer (`uretimIsaretiDusur`), yani geri alınan model üretimde sayılır; bu pencere bakımından ek bir simetri gerekmez.
- **Kilit:** pencerenin kaydı `uretim_partisi` kilidine anlık bakıyor (`:45`), değişmez.
- **Etkilenmeyen testler ölçüldü (QA K-10):** 0088'in pencere testleri (`ui/makina-maliyeti-0088.test.jsx:211-216, 254-256, 308-309`) ve yeni Electron yerleşim testi (`tests/maliyet-yerlesim.test.js`) dokunulmadan yeşil kalır; ikisinin de fikstüründe `uretimdeOlmayanModeller` yok, yani bütün modeller üretimdedir ve alanlar aynen çizilir, yerleşim testi de pencerenin içini değil düğmenin hizasını ölçer. Bu satır, o testleri "uyarlamak" için kurcalamayı önlemek içindir.
- **Sessiz kilit (ölçüm 3, yedinci satır):** gizli modelin geçersiz saklı değeri çizilmezse bütün kayıt sessizce engellenir; R3/3 bu yüzden geçersiz değeri de çizdirir.
- **Metin sabitleri:** pencerenin metinleri ekrana gömülürse test metne bağlanır ve ilk cümle değişikliğinde kırılır; R11 aynı dosyadaki kurulu deseni zorunlu kılar.
- **Aynı adlı iki model:** katalogda standart ve özel tarafta aynı adın bulunması bugün de ızgaranın `key`'ini ve `plan.adetler` anahtarını çakıştırıyor; bu spec bu sınırı ne büyütür ne küçültür, kapsam dışıdır.

---

## Acceptance Criteria

- **AC-1.** Ayarlar'da "Üretimde" işareti kaldırılmış bir model, Parti Hesabı'nın "Planlanan adetler" penceresinde alan olarak çizilmez.
- **AC-1/2.** Izgara yalnız çizim anında türetilen süzülmüş listeyi dolaşır; `modeller` adı bileşende yeniden bağlanmaz ve R1/2'nin beş yeri (motor çağrısı, `planAc` tohumu, `planBulunamayan`, `planKaydet` başlangıcı, R3 bölümünün kaynağı) tam listeyle çalışır (kaynak taramasıyla sabitlenir).
- **AC-1/3.** Süzme `m.uretimde !== false` biçimindedir: `uretimde` alanını hiç taşımayan bir satır çizilir (motorun seçeneksiz çıktısı modelleri gizlemez).
- **AC-2.** Üretimde işaretli modellerin hepsi pencerede alan olarak çizilir ve sırası kataloğun sırasıdır (önce standart, sonra özel).
- **AC-3.** İşaret kaldırılan modelin **kayıtlı planlanan adedi yoksa** pencerede hiçbir yerde görünmez (ne alan, ne ayrı bölüm).
- **AC-4.** İşaret kaldırılan modelin kayıtlı planlanan adedi varsa pencerede ayrı bölümde adı, adedi ve "üretimde değil" ibaresiyle görünür.
- **AC-4/2.** O bölümdeki girdinin erişilebilir adı ızgaranınkinden ayrıdır (`<model> planlanan adedi (üretimde değil)`), yani AC-1 ile AC-4 birbirinden bağımsız olarak ad üzerinden ölçülebilir ve aynı model iki bölümde birden çizilmez.
- **AC-4/3.** Saklı adedi 0 ya da boş olan gizli model hiçbir yerde çizilmez ("girilmedi"); saklı değeri geçersiz olan gizli model bölümde çizilir, hatası alanının altında görünür ve düzeltilebilir.
- **AC-5.** AC-4'teki satırın adedi pencereden düzeltilip kaydedilebilir ve yeni değer partiye yazılır.
- **AC-6.** AC-4'teki satır pencereden kaldırılıp kaydedilince adı partinin planlanan adetlerinden düşer.
- **AC-6/2.** Kaldırma, alanı boşaltmaktır: bölümde ayrı bir "Kaldır" düğmesi yoktur ve satır `kaldirilan` dizisine girmez (ölçüm 3'ün dördüncü satırı; iki mekanizma birlikte olursa kaldırma sessizce geri alınır). Kaynak taraması bu satırın `kaldirilan`'a girmediğini sabitler.
- **AC-7.** Pencere kaydedildiğinde, çizilmeyen ve kaldırılmayan hiçbir modelin kayıtlı planlanan adedi değişmez (ölçüm 2'nin üçüncü satırı: değişiklik yapmadan kaydetmek hiçbir adedi düşürmez ve hiçbirini eklemez).
- **AC-7/2.** Gizli modelin alanına geçersiz değer yazılırsa bütün kayıt bugünkü gibi engellenir **ve hata kullanıcıya görünür** (sessiz kilit yok, ölçüm 3'ün yedinci satırı).
- **AC-8.** Pencere, listenin yalnız üretimdeki modelleri gösterdiğini ve işaretin Ayarlar › Katalog › Makina Modelleri'nde değiştirildiğini söyleyen bir satır gösterir.
- **AC-8/2.** Bu satırın taban cümlesi koşulsuz çizilir ve sayı taşımaz; "Üretimde olmayan n model listede yok" eki yalnız gizli model varken gelir (sıfırken hiç yazılmaz). Pencerenin bugünkü alan anlamı ipucusu da aynen kalır.
- **AC-8/3.** Aynı satır, üretimden kalkmış bir modele adet girmek gerekirse işaretin Ayarlar'da geri konacağını söyler (X7'nin gerekçesi kullanıcıya görünür).
- **AC-9.** Üretimde işaretli hiç model yokken pencere boş ızgara değil, kaç modelin üretimde olmadığını ve işaretin yerini söyleyen boş durum metni gösterir.
- **AC-9/2.** Bu metnin sayısı motordan okunur (`modelSayilari(...).uretimdeDisi`); ekranda ikinci bir sayaç yoktur (kaynak taraması, 0091 C7 ve AC-42'nin aynı disiplini).
- **AC-10.** AC-9 durumunda bile, kayıtlı planlanan adedi olan üretimde olmayan modellerin bölümü ve "modeli bulunamayan planlanan adetler" bölümü çizilir, Kaydet düğmesi çalışır ve kaldırmalar yazılır.
- **AC-11.** Pencerenin iki ayrı boş durumu vardır: katalog boşken "Tanımlı makina modeli yok" metni, katalog dolu ama üretimde işaretli model yokken AC-9 metni. Katalog boşken AC-9'un sayılı metni çizilmez (sayı sıfır olduğu için cümle yanlış olurdu). Bugünkü "Üretim partisi yok" boş durumu ayrı kavramdır ve değişmez. (Revizyon 2'nin AC-11'i "bugünkü hâliyle aynı" ile "AC-9 metni" arasında çelişiyordu; QA B-3 ile yeniden yazıldı.)
- **AC-11/2.** Her iki boş durumda da boş durum yalnız ızgaranın yerine geçer: alan anlamı ipucusu, AC-8 satırı, R3 bölümü, "modeli bulunamayan" bölümü ve Kaydet düğmesi çizilir.
- **AC-12.** Parti Hesabı'nın model-adet tablosu, işaret kaldırılmış modelin partiye bağlı makinalarını saymaya ve satırını çizmeye devam eder (0091 AC-32 korunur).
- **AC-13.** Parti Hesabı'nın toplam standart maliyeti, önerilen cirosu ve gerçekleşen tedarik karşılaştırması, hiçbir model işareti kaldırılmamış hâlle **birebir** aynı kalır (ölçüm 1'in tablosu: 14.000,00 TL satırı değişmez).
- **AC-14.** İşaret kaldırılmış ama katalogda var olan model, "Partiye bağlı ama modeli tanımlı olmayan makinalar" ve "Planlanan adeti olan ama bulunamayan model" uyarılarının hiçbirinde görünmez.
- **AC-15.** Adı katalogda gerçekten bulunamayan (silinmiş ya da yeniden adlandırılmış) modelin planlanan adedi bugünkü "modeli bulunamayan" bölümünde görünmeye ve kaldırılabilmeye devam eder.
- **AC-16.** Ayarlar › Katalog › Makina Modelleri'ndeki kapsam ipucusu Parti Hesabı'nın planlanan adetler penceresini de sayar ve model seçicileri, Analiz ile makina kayıtlarının etkilenmediğini söylemeye devam eder.
- **AC-16/2.** Sabitin metni R8/2'deki cümlenin birebir aynısıdır ve **Parti Hesabı'nın model-adet tablosunu** etkilenmeyenler arasında ayrıca sayar.
- **AC-17.** Model Maliyetleri görünümünün süzgeci, sayı satırı, işaretleri ve boş durumları bu spec'le değişmez (0091 kriterleri dokunulmadan yeşil).
- **AC-17/2.** "üretimde değil" ibaresi tek yerde tanımlıdır: kütüphanedeki `URETIM_DEGIL_IBARESI`, `URETIM_METIN.uretimdeDegil` onu yeniden dışa verir; Model Maliyetleri'nin ekranı, metni ve 0091'in `URETIM_METIN` testleri değişmez.
- **AC-18.** Üretim Partileri görünümü ve Hesap Ayarları görünümü bu spec'le değişmez.
- **AC-19.** İşaret karşılaştırması birebir yapılır: yalnız harf büyüklüğüyle ayrılan iki ad aynı model sayılmaz (0091 C14a).
- **AC-19/2.** AC-19 pencere düzeyinde ölçülür: katalogda yalnız harf büyüklüğüyle ayrılan iki model varken biri işaretliyse ızgarada yalnız diğerinin alanı çizilir (pencere motorun kararını olduğu gibi kullanır, kendi karşılaştırmasını yazmaz).
- **AC-19/3.** (Plan kararı P9.) AC-19/2'nin fikstürü kurulmadan önce motorun yalnız harf büyüklüğüyle ayrılan iki model için iki satır ürettiği ölçülür; üretmiyorsa kriter değiştirilmez, Takım Yöneticisi'ne bildirilir.
- **AC-20.** Pencerenin kaydı `gider_tanim` izni olmayan kullanıcıya bugünkü gibi hiç açılmaz ("Planlanan adetler" düğmesi çizilmez) ve başka kullanıcı partiyi açık tutuyorsa kayıt bugünkü red mesajıyla reddedilir.
- **AC-21.** Yeni kalıcı alan, yeni veri bölümü, yeni izin kimliği ve yeni sunucu kuralı eklenmediği kaynak taramasıyla sabitlenir.
- **AC-21/2.** Taramanın hedefleri adıyla şunlardır: `BLOB_SECTIONS`, `MERGE_KEYS`, `EYLEM_IDLERI`, `AYAR_ALAN_SEKMELERI` dosyaları değişmez ve `PartiHesabi.jsx` `setAppSettings` çağırmaz.
- **AC-21/3.** (Plan kararı P3.) AC-21/2'nin "değişmez" iddiası git farkıyla değil, dört listenin anahtar kümesinin spec öncesi koddan üretilmiş fikstürle (`tests/fixtures/0093-tarama-once.json`, `YAZ_0093=1`) eşitliğiyle ölçülür.
- **AC-22.** Saf motorun (`makinaStandartMaliyet.js`) imzası ve çıktısı değişmez; 0088 ve 0091'in motor testleri dokunulmadan yeşil kalır.
- **AC-23.** C7'nin bekçisi kurulur (R12/2 ile): `PartiHesabi.jsx` işaretin kendisini okuyan adları (`uretimdeOlmayanModeller`, `URETIM_ALANI`, `uretimdeMi`, `uretimdeOlmayanlar`, `uretimIsareti*`) kullanan dosyalar kümesine girmez, kütüphaneden yalnız `URETIM_DEGIL_IBARESI`'ni alır ve yalnız satırın `uretimde` alanını okur; 0091'in izinli dosya kümesi güvencesi silinmez, daraltılır.
- **AC-24.** 0091'in üç testi "spec 0093 ile" notuyla güncellenir (Context'teki tablo); AC-12/2 testinin `/model seçicileri, Analiz/` ifadesi **korunur** ve AC-16'nın "söylemeye devam eder" yarısının kanıtı sayılır.
- **AC-25.** Pencerenin beş yeni kullanıcı metni `PartiHesabi.jsx`'ten dışa verilen sabitlerdir ve testler metni sabitten okur (aynı dosyadaki `KAR_KUMELERI_NOTU` deseni).
- **AC-26.** R3 bölümünün satır sırası kataloğun kendi sırasıdır.
- **AC-27.** R3 bölümünün başlığı ve "Kaldırmak için alanı boşaltın." cümlesi çizilir.
- **AC-28.** Yeni bölümler kendi kimliğiyle sınanır: `plan-suzgec-ibaresi` (AC-8), `plan-gizli-listesi` (AC-4), `bos-plan-uretimde` (AC-9), `bos-plan-model` (AC-11'in katalog boş dalı).
- **AC-29.** 0088'in pencere testleri ve Electron yerleşim testi dokunulmadan yeşil kalır (fikstürlerinde işaret yok, ölçüldü).
- **AC-30.** Görsel kanıt ölçüm 4'ün tablosuna göre eklenir: üç yeni ekran (`maliyet-0093-plan-suzulmus`, `maliyet-0093-plan-gizli-adet`, `maliyet-0093-plan-bos`) ve değişen üç mevcut ekranın kaydı `beklenen: "degisti"` + TY onay dizesiyle açılır. (Plan kararı P7.) `katalog-model-ekmaliyet` değişirse onay dizesi kendiliğinden yazılmaz, Takım Yöneticisi'ne sorulur.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap içeren iş yok; süzme ekranda ve motorun çıktısı birebir aynı (AC-22) ölçüldü.
- [ ] Aynı sayıyı üreten başka ekran etkilenmedi: parti hesabının rakamları önce/sonra birebir (AC-13).
- [ ] Yeni kalıcı alan yok; dört nokta kuralı gerekmedi ve bu **açıkça yazıldı** (AC-21).
- [ ] Yeni veri bölümü yok; `BLOB_SECTIONS` / `MERGE_KEYS` dokunulmadı (AC-21).
- [ ] Yeni eylem izni yok; **salt görünüm tercihi olduğu açıkça yazıldı** (R9, AC-20, AC-21).
- [ ] Soft-delete simetrisi: çöpe atılan ve geri alınan modelin işaret davranışı 0091'deki gibi kaldı.
- [ ] Kullanıcıya görünen bütün yeni metinler Türkçe; yazdırma çıktısı yok, çeviri anahtarı gerekmedi.
- [ ] Para gösterimi değişmedi (AC-13 birebir eşitlik).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi: pencere süzülmüş hâli, üretimde olmayan ama adedi olan model bölümü, iki boş durum ve Ayarlar'ın yeni ipucusu. Ölçüm 4'ün üç yeni ekranı çekildi; değişen üç mevcut ekranın kaydı `beklenen: "degisti"` + `onay: "Takım Yöneticisi · 2026-10-19 · spec 0093 R1/R4/R8"` ile açıldı (AC-30).
- [ ] 0091'in ters çevrilen kriterleri (R29, X9, AC-43) ve **üç** testi (Context'teki tablo: `test.js:147`, `ui:240`, `ui:102-106`) "spec 0093 ile" notuyla güncellendi; AC-12/2'nin ikinci ifadesi korundu (AC-24).
- [ ] Kaldırma tek mekanizmadır: R3 satırı `kaldirilan` dizisine girmiyor, ölçüm 3'ün dördüncü satırındaki sessiz geri alma yeniden ölçülerek oluşmadığı gösterildi (AC-6/2).
- [ ] Süzme tek yerde: `modeller` yeniden bağlanmadı, tam listeyle kalan beş yer kaynak taramasıyla sabitlendi, `MakinaMaliyeti.jsx` değişmedi (AC-1/2, C6).
- [ ] C4'ün bekçisi kuruldu: `PartiHesabi.jsx` işareti okuyan dosyalar kümesine girmiyor (AC-23, C7).
- [ ] Pencerenin beş metni dosyadan dışa verildi ve testler sabitten okudu (AC-25, R11); "üretimde değil" ibaresi kütüphaneye taşındı ve `URETIM_METIN` yeniden dışa verdi (AC-17/2, R12).
- [ ] Testler iki dosyada: arayüz (`tests/ui/plan-adetler-0093.test.jsx`, AC-1…AC-20, AC-26…AC-28) ve tarama (`tests/plan-adetler-0093.test.js`, AC-21…AC-25, AC-29, AC-30). **Yeni motor testi yok**, çünkü motor değişmiyor (C5, AC-22).
- [ ] Dokunulmayan testler koşuldu ve yeşil: 0088'in pencere testleri ve Electron yerleşim testi (AC-29).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0091 bölümündeki kapsam cümlesi ("yalnız Model Maliyetleri'ni süzer") güncellendi.
- [x] Takım Yöneticisi spec'i ve üç kararı onayladı (2026-10-19). **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu 2026-10-19)

Yirmi üç bulgu çıktı (üç bloklayıcı, on önemli, on küçük); Takım Yöneticisi hepsini onayladı. Her bulgunun cevabı spec'te şu maddelerdedir:

| Bulgu | Konu | Cevabı veren madde |
|---|---|---|
| B-1 | R3 satırının kaldırma mekanizması tanımsız; input + "Kaldır" birlikte ölçülen hatayı üretir | R3/2, X8, AC-6/2, ölçüm 3 |
| B-2 | Süzgecin yeri ve `planAc` tohumu tanımsız; R6 ile AC-7 buna bağlı | R1/2, C2/2, C6, AC-1/2 |
| B-3 | AC-9 ile AC-11 çelişiyor; katalog boşken sayı sıfır | R7/2, AC-11, AC-11/2 |
| Ö-1 | R8'in yeni ipucu cümlesi yazılmamış; tablo ile pencere ayrılmalı | R8/2, AC-16/2 |
| Ö-2 | Ters çevrilecek 0091 testi iki değil üç | Context tablosu, AC-24, DoD |
| Ö-3 | C4'ün bekçisi kaybolma riski taşıyor | C7, AC-23 |
| Ö-4 | AC-9'un sayısı nereden gelecek (C5 ile 0091 C7) | R7/3, AC-9/2 |
| Ö-5 | AC-1 ile AC-4 aynı erişilebilir adı taşırsa ayrı ayrı sınanamaz | R3/5, AC-4/2 |
| Ö-6 | R4 satırının yeri, biçimi ve sayı taşıyıp taşımadığı | R4/2, AC-8/2 |
| Ö-7 | R3 bölümünün ölçütü sınır değerleri için tanımsız; geçersiz değer sessiz kilit | R3/3, AC-4/3, AC-7/2, ölçüm 3 |
| Ö-8 | "üretimde değil" ibaresi iki ekranda iki sabit olmaya aday | R12, AC-17/2 |
| Ö-9 | Görsel kanıtın bedeli ölçülmemiş; TY onay dizesi gerekiyor | Ölçüm 4, AC-30, DoD |
| Ö-10 | Yeni metinlerin yeri ve adı tanımsız; C5 eksik sayıyor | R11, C5, AC-25 |
| K-1 | R3 bölümünün satır sırası | R3/4, AC-26 |
| K-2 | R3 bölümünün başlık metni | R3/6, AC-27 |
| K-3 | Yeni `data-testid` adları | AC-28 |
| K-4 | Süzgecin karşılaştırma biçimi | R1/3, AC-1/3 |
| K-5 | R4 satırı X7'nin gerekçesini söylemiyor | R4/3, AC-8/3 |
| K-6 | Boş durumda pencerenin geri kalanı | R7/4, AC-11/2 |
| K-7 | Test dosyası ve AC eşlemesi tanımsız | DoD (iki dosya, motor testi yok) |
| K-8 | AC-21'in taraması neyi arayacak | AC-21/2 |
| K-9 | AC-19'un pencere düzeyinde ölçümü | AC-19/2 |
| K-10 | Etkilenmeyen mevcut testler DoD'de yazılı değil | Bilinen tuzaklar, AC-29, DoD |

### Plan kararları (uygulama planı onayı 2026-10-19)

Takım Yöneticisi planın §4'teki dokuz önerisini kabul etti.

| No | Konu | Cevabı veren madde |
|---|---|---|
| P1 | 0092 dalındaki commitlenmemiş hizalama işi önce ayrı commit, 0093 dalı oradan | Uygulama (commit `bf74e10`) |
| P2 | R12 ile C7 çelişkisi: tarama modül yolundan değil okuyan adlardan | R12/2, AC-23 |
| P3 | AC-21/2'nin ölçümü fikstürle | AC-21/3 |
| P4 | Yedi metin sabiti | R11/2 |
| P5 | Hepsi gizliyken boş durum metni | R7/5 |
| P6 | Katalog boş metni pencerede kendi sabiti | R11/2 |
| P7 | `katalog-model-ekmaliyet` değişirse sorulur | AC-30 |
| P8 | 0091 done metni yerinde | C7/2 |
| P9 | Harf büyüklüğü fikstüründen önce motor ölçülür | AC-19/3 |

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
