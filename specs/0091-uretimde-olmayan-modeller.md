# 0091 — Üretimde olmayan modeller maliyet ekranında görünmez

| | |
|---|---|
| **Durum** | Uygulanıyor (revizyon 3, plan onayı 2026-10-17) |
| **Sahip** | Analist (spec) · Geliştirici (uygulama) |
| **Etkilenen alanlar** | Ayarlar › Katalog › Makina Modelleri (satır başına yeni onay kutusu, panelin ipucusu, iki kutunun erişilebilir adı, dokuz sütun), Makina Maliyeti › Model Maliyetleri (sayı satırı, süzgeç, dönem adedi sütunu, iki denetim işareti, iki boş durum, dokuz sütun ve `colSpan`), `makinaStandartMaliyet.js` (`gercekUretim` seçeneği ve `modelMaliyetleri` satır alanları), yeni bir uygulama ayarı alanı (şema, sütun göçü, yazma, okuma, gidiş dönüş), sunucunun ayar alanı eşlemesi, tasarım sözlüğünün istisna listesi, konum tabanlı bir mevcut test dosyası, görsel kanıt ve kanıt eşlemesi |
| **Onaylayan** | Takım Yöneticisi |
| **Bağımlı spec'ler** | 0088 (model maliyeti görünümü, hesap ayarları dönemi, R9/3 üretim tarihi zinciri, AC-15 ve AC-15/3'ün tam nesne eşitliği, AC-44'ün gövde altını, R25'in ekran taraması), 0087 (model kiti ve ek maliyet kalemleri, `0088-govde-once.json`'ın komşusu), 0086 (yedek paketlerinin notları birebir sabitli), 0077 (X7: `standardModels` birleştirmeye girmez; `mergeAppSettings` yerel değeri korur), 0064 (`kilitAlanlari` kapsam taraması `src/components/maliyet` klasörünü kapsar), 0022 (parti hesabı; bu spec'te **etkilenmez**), 0090 (aynı sekmeye dokunur, kanıt turu ayrı), 0016 ve 0014 (boş durum ve süzgeç kuralları), Analiz'in model süzmesi (emsal: `appSettings.analizGizliModeller`) |
| **Taban** | 0090 kapanışı |
| **Revizyon** | · 1 · 2026-10-17 ilk taslak · 2 · 2026-10-17 QA turu: motorun imzası opt-in seçeneğe bağlandı (R24, R25, C12), yeni alan boş liste yazmaz ve 0088'in gövde altını korunur (R26, C11), iki onay kutusuna erişilebilir ad ve mevcut testin yeniden yazımı (R1/2, C10), R15'in uyarısı varsayılan ekrana da taşındı (R8/2), sayı satırının ve süzgecin yeri ile biçimi (R8, R9, C16), iki boş durumun kimliği (R11), dönem adedi sütununun yeri, başlığı ve hücre metinleri (R13, R16), modeli bulunamayan makina sayısı (R27), panelin ipucusu (R28), `colSpan` ve sütun sayıları (R1, R13), AC-10 ve AC-11 ikiye bölündü, AC-30 makina eşlemesi olarak yazıldı, AC-38 yeniden tanımlandı, `App.jsx:1091` → `:1079` düzeltildi · 3 · 2026-10-17 plan onayı: boş liste `undefined` ile (R24/2), `gercekUretim` seçeneğine `katalog` (R25), `onAyarlar` silinir (R30), sayılar motorda (R26/2), metinler (R8), kanıt kapsamı ve test yolları (K1–K10) |

---

## Intent

Makina Maliyeti › Model Maliyetleri bugün kataloğun tamamını çiziyor: fabrikada yirmi model
tanımlıysa yirmi satır çıkıyor ve her satırda makina başına genel gider payı yazıyor. Oysa
fabrika bu modellerin bir bölümünü artık üretmiyor. Rakamlar yanlış değil (pay model sayısına
bölünmüyor, varsayılan üretim adedine bölünüyor), ama liste kirli ve yanlış okumaya davet
çıkarıyor: yirmi satırın toplamı alınırsa pay yirmi kez sayılır.

Artık üretilmeyen modeli silmek bir çözüm değil, ölçüldü: özel model silinince o modele ait eski
teklif, proforma ve faturaların resmi ile ürün açıklaması düşüyor, üstelik otuz gün sonra silme
geri alınamıyor. Standart katalogdaki altı model ise hiç silinemiyor.

Takım Yöneticisi kararı (2026-10-17): modelin üretilip üretilmediği kataloğa yazılır (Ayarlar ›
Katalog › Makina Modelleri'nde satır başına onay kutusu) ve maliyet ekranı varsayılan olarak
yalnız üretimdeki modelleri gösterir.

Bu iş bittiğinde kullanıcı fiyat kartı listesinde yalnız bugün ürettiği modelleri görecek,
üretilmeyenler tek tıkla açılabilen bir sayının arkasında duracak, ve hiçbir model, hiçbir belge
ve hiçbir makina kaydı bundan zarar görmeyecek.

---

## Requirements

### İşaret

- **R1.** Ayarlar › Katalog › Makina Modelleri'nde her model satırında "üretimde mi" onay kutusu bulunur. Standart ve özel modellerin ikisinde de çizilir. Sütun Analiz kutusunun hemen sağına, eylem sütununun soluna girer; tablo dokuz sütuna çıkar ve başlık dizisi dokuz girdi taşır (bugün sekiz, `ModelsManager.jsx:179`).
- **R1/2.** Satırdaki iki onay kutusunun da model adını taşıyan erişilebilir adı olur: Analiz kutusu "`<model>` · Analiz'de göster", üretim kutusu "`<model>` · üretimde". Bugün ikisinin de yalnız `title`'ı var (`ModelsManager.jsx:122`), erişilebilir adı yok.
- **R2.** İşaret kataloğun tamamı için tek bir yerde saklanır; model kayıtlarına sütun eklenmez.
- **R3.** İşareti hiç verilmemiş model **üretimdedir**. Mevcut kurulumlarda hiçbir şey değişmez, göç yazılmaz; kullanıcı yalnız üretmediklerini işaretten çıkarır.
- **R4.** Model yeniden adlandırılınca işaret adla birlikte taşınır.
- **R5.** Özel model silinince (çöp kutusuna atılınca) işaret listeden düşer; model geri alınırsa üretimde sayılır (R3).
- **R6.** Onay kutusu salt görünüm tercihi değildir, kataloğa ait bir bilgidir; ama bu spec'te **yalnız** maliyet ekranını etkiler.

### Alan ve saklama

- **R24.** Alanın adı `appSettings.uretimdeOlmayanModeller`'dir ve **üretimde olmayan** model adlarının listesini tutar (emsalin yönü: adı listede olmayan model üretimdedir, R3).
- **R24/2.** Liste boşken alan okunan gövdeye **hiç yazılmaz** (boş dizi de değil, null da değil) ve kutu son modeli yeniden işaretlediğinde anahtar listeden değil **gövdeden** silinir. Yazma `uretimdeOlmayanModeller?.length ? json(...) : null`, okuma koşullu yayılım; emsal `uretim_partileri.kapanisGenelHavuzlari` (`db.cjs:965` ve `:1549`, spec 0090 R36).
- **R24/4.** (revizyon 3, K1) Liste boşalınca anahtar bellekten **silinmez**, değeri `undefined` yapılır. Gerekçe: `mergeAppSettings` (`utils.js:361`) `{ ...yeniden, ...yerel }` ile bindirir; silinmiş anahtar sunucudan yeniden yüklenen eski listeyi ezemez ve bir çakışma birleştirmesinde işaret sessizce geri gelirdi. `undefined` spread'de eski değeri ezer, JSON gövdesinde anahtar oluşmaz, `stableStringify` undefined anahtarı yok sayar (0001 triyajı) ve veritabanı `null` yazar. Böylece AC-9/2'nin gövde iddiası ve AC-10/2 birlikte tutar; bellekte `"anahtar" in obj` doğru kalabilir.
- **R24/3.** İşaret listesi ile katalog adı **birebir** karşılaştırılır (emsal `ModelsManager.jsx:18`); Türkçe küçültme bu karşılaştırmaya girmez. Gerekçesi C14'te.

### Motorun imzası ve satır alanları

- **R25.** Dönem adedinin model kırılımı `gercekUretim`'in **isteğe bağlı** çıktısıdır: `gercekUretim(veri, ayarlar, havuzK, { modelKirilimi: true })`. Parametresiz çağrının çıktısı birebir bugünküdür (C12).
- **R25/3.** (revizyon 3, K2) Seçenek nesnesi canlı model adlarını da alır: `{ modelKirilimi: true, katalog }`. R27'nin "kataloğun hiçbir satırıyla eşleşmeyen makina" sayısı katalog ister; makina ile model eşlemesi böylece tek yerde kalır (C14b) ve ekran sayım yapmaz. Seçeneksiz çağrı C12 gereği birebir aynıdır.
- **R25/2.** `modelMaliyetleri`'nin bugünkü iki argümanı değişmez; üçüncü bir seçenek nesnesi eklenir: `modelMaliyetleri({ standardModels, customModels, parts }, payK, { uretimdeDisi, uretim })`. Seçeneksiz çağrının çıktısı bugünküyle aynı alanları taşır.
- **R26.** Motor her model satırına dört alan yazar: `uretimde` (işaret), `donemAdet` (dönemde üretilen adet ya da null), `adetNeden` (null ya da `ayarsiz`) ve `isaret` (null, `eskimis`, `yanlis`). Hangi satırın çizileceğine ve işaretin nasıl görüneceğine ekran karar verir, ama **kararın verisini motor üretir** (C6, C7).
- **R26/2.** (revizyon 3, K4) Sayı satırının üç sayısı (tanımlı, üretimde, işareti yanlış) motorun `modelSayilari(satirlar)` yardımcısından gelir; ekran sayım yapmaz ve işareti türetmez: dönem adedini ve üretim işaretini birbiriyle karşılaştırmaz, `isaret` değerini motorun sabitiyle (`MODEL_ISARET`) okuyup hangi etiketi çizeceğini seçer (C6, C7; AC-42 taraması `donemAdet` karşılaştırmasını ve ekranda `trLower`/`modelAdetleri` okumasını yasaklar).
- **R27.** Motor, modeli kataloğun hiçbir satırıyla eşleşmeyen makinaların dönem içindeki sayısını da verir (`modelYokAdet`). Bu makinalar hiçbir model satırının adedine girmez, bu yüzden model adetlerinin toplamı "Dönemde gerçekte üretilen" sayısından küçük olabilir; ekran farkı susarak bırakmaz (R27/2).
- **R27/2.** Sayı sıfırdan büyükse ekran tek satırda yazar: modeli kataloğda bulunamayan makina sayısı ve adede girmediği. Emsal `PartiHesabi.jsx:70-72`'nin uyarı şeridi ve `kirilim.modelYok` satırı.

### Maliyet ekranı

- **R7.** Model Maliyetleri varsayılan olarak yalnız üretimdeki modelleri çizer.
- **R8.** Tablonun **üstünde**, kartın dışında tek bir satır çizilir ve iki sayıyı yazar: tanımlı canlı model sayısı ve bunların kaçının üretimde olduğu. Ekranda bugün başlık diye bir şey yok (`PayOzeti`'nden sonra başlıksız bir kart geliyor, `ModelMaliyetleri.jsx:57-59`), bu yüzden satır yeni çizilir; sayılar tam sayıdır, yüzde yazılmaz (C13).
- **R8/2.** İşareti dönemle çelişen model varsa (`isaret === "yanlis"`: üretimde değil ama dönemde üretilmiş) sayısı **aynı satırda**, süzgeç kapalıyken de görünür. R15'in satır işareti yerinde kalır ama tek başına yetmez: R7 o satırı varsayılan olarak gizlediği için uyarı yalnız süzgeç açılınca görünürdü.
- **R9.** "Üretimde olmayanları da göster" süzgeci vardır; açıldığında üretimde olmayan modeller de çizilir ve satırlarında bunu söyleyen bir işaret bulunur. Biçimi tek aç kapa düğmesidir (etiketi duruma göre dönen hayalet düğme, `aria-pressed`), `Segment` değil; emsal `Kasa.jsx:593`'ün "Hepsini göster" düğmesi. Gerekçesi C16'da.
- **R9/2.** Sayı satırı ve süzgeç **üç durumda da** çizilir: tablo çizilirken, R11'in boş durumunda ve R12'nin boş durumunda. Süzgeç bugünkü `modeller.length === 0 ? … :` dalının dışındadır, yoksa R11'in boş durumundan süzgeç açılamazdı (AC-20).
- **R10.** Süzgeç durumu saklanmaz; ekran her açılışta varsayılan hâlde başlar. Görünüm değişince bileşen çözüldüğü için (`MakinaMaliyeti.jsx:50` koşullu çizim) yerel durum kendiliğinden sıfırlanır; ek kod yazılmaz.
- **R11.** Üretimdeki model kalmadıysa (hepsi işaretten çıkarılmış) tablo yerine boş durum çizilir ve üretimde olmayan sayısı ile süzgeç yolu yazılır. Kimliği `bos-model-maliyet-uretimde`, başlığı "Üretimde işaretli model yok"; kutuda düğme yoktur (sözlük: liste kutularında düğme yok).
- **R12.** Hiç model tanımlı değilse bugünkü boş durum korunur: kimliği `bos-model-maliyet`, başlığı ve metni birebir bugünkü (`ModelMaliyetleri.jsx:58`). İki durum iki ayrı kimlik ve iki ayrı başlıktır; sözlük "hiç kayıt yok" ile "süzgece uyan kayıt yok"u ayrı sayar.

### Denetim sütunu

- **R13.** Her model satırında o dönemde gerçekte üretilen makina adedi yazar. Dönem, hesap ayarlarındaki dönemdir. Sütun başlığı "Dönemde üretilen", yeri "Model" sütununun hemen sağıdır (denetim adın yanında durur, dokuz sütunlu satırın ucunda değil), sağa hizalıdır. Tablo dokuz sütuna çıkar; döküm satırının `colSpan`'ı sekizden dokuza çıkar (`ModelMaliyetleri.jsx:63` ve `:81`).
- **R13/2.** Sıfır adet "0" olarak yazılır, "—" olarak değil: R14'ün bilgi işaretinin yanında duracağı bir rakam olmalı.
- **R14.** Üretimde işaretli ama dönemde hiç üretilmemiş model satırında bilgi işareti bulunur: işaret eskimiş olabilir. İşaret, sayı hücresinin içinde değil, model adının altındaki bugünkü işaret yerinde çizilir (`urun-agaci-yok` ve `eksik-isareti` ile aynı yer, `ModelMaliyetleri.jsx:74-75`).
- **R15.** Üretimde olmayan ama dönemde üretilmiş model satırında uyarı işareti bulunur: işaret yanlış. Yeri R14 ile aynıdır. Bu satır varsayılan olarak gizli olduğu için sayısı R8/2 ile her zaman görünür.
- **R16.** Dönem adedi hesap ayarları girilmemişken yazılmaz; hücrede nedeni görünür ("hesap ayarları girilmedi") ve o hâlde R14 ile R15'in işaretleri hiç çizilmez (dönem tanımsızken "üretilmemiş" denemez).
- **R16/2.** Dönemin gider takibinin yürürlüğünden önce olması adedi **etkilemez**: üretim tarihi gider yürürlüğünden bağımsızdır ve `gercekUretim` yürürlük ayını hiç okumaz. O dönemde pay sıfırdır (`PayOzeti` kendi boş durumunu çizer) ama adet sayılmaya devam eder ve yazılır.
- **R17.** Dönem adedi, uygulamanın tek üretim tarihi zincirinden çözülür; ikinci bir kural yazılmaz. 0088 R9/3'ün zinciri (`makinaMaliyeti.makinaListesi`) kullanılır ve tarama hem motoru hem **ekran dosyalarını** kapsar (AC-39).

### Ekran metinleri (revizyon 3, K5)

- **R31.** Metinler tek yerde sabittir (testler sabitten okur): sayı satırı "`<n>` model tanımlı · üretimde: `<m>`" (Türkçe ek sayıya göre değiştiği için iyelik eki yazılmaz: "7'si", "3'ü", "6'sı"); uyarı eki "· `<k>` model üretimde değil ama dönemde üretilmiş"; süzgeç düğmesi kapalıyken "Üretimde olmayanları da göster (`<sayı>`)", açıkken "Yalnız üretimdekiler"; satır işaretleri "üretimde değil" (süzgeç açıkken), "dönemde üretilmedi, işaret eskimiş olabilir" (R14), "üretimde değil ama dönemde üretilmiş" (R15); R27/2 satırı "`<n>` makinanın modeli katalogda bulunamadı; model adetlerine girmedi."; R16 hücresi "hesap ayarları girilmedi".

### Dokunulmayanlar

- **R18.** Genel gider payı, havuz ve varsayılan üretim adedi değişmez: pay model sayısına bağlı değildir ve işaret payı etkilemez.
- **R19.** Üretimde olmayan modelin maliyet hesabı doğru kalır; süzgeç açıldığında rakamları bugünkü gibi çıkar.
- **R20.** Parti Hesabı görünümü işareti hiç okumaz: geçmiş partide üretimde olmayan model varsa hesaba girer ve görünür.
- **R21.** Model, kalıp ve parça seçicileri (teklif, stok, müşteri makinası, servis) işaretten etkilenmez.
- **R22.** Analiz'in model süzmesi ve onun ayarı bu işaretten bağımsız kalır; iki kutu birbirini etkilemez.
- **R23.** Yeni eylem izni yok; işaret bugünkü katalog yazma iznini ister. Kayıt kilidi de değişmez: `ModelMaliyetleri.jsx` zaten `ayar` alanının pencereleri arasındadır (`kilitAlanlari.js:40`).
- **R28.** Panelin giriş metninin altında işaretin **neyi etkilediğini** söyleyen bir ipucu bulunur: işaret yalnız Makina Maliyeti › Model Maliyetleri'ni süzer; model seçicileri, Analiz, Parti Hesabı ve makina kayıtları etkilenmez. Bugünkü giriş cümlesi "Buradaki modeller, Yeni Müşteri ve Makina Geçmişi ekranlarındaki model seçiminde görünür." (`Settings.jsx:246`), yani kutuyu kapatan kullanıcı modelin o seçicilerden de çıkmasını beklerdi.
- **R29.** Parti Hesabı'nın "Planlanan adetler" penceresi modellerin **tamamını** listelemeye devam eder (`PartiHesabi.jsx:37` ve `:133`): o bir model seçicisidir ve X1'in gerekçesi aynen geçerlidir. Süzülmez.
- **R30.** `MakinaMaliyeti.jsx:50`'nin bugün hiçbir yerde karşılanmayan `onAyarlar` prop'u **silinir** (revizyon 3, K3): R11'in kutusunda düğme yasak (AC-19/2), R16'nın nedeni dokuz satırda tekrar eden bir hücre metnidir ve oraya düğme konmaz (ölü prop bırakılmaz, spec 0090 R40 emsali).

---

## Constraints

### Uyulması zorunlu

- **C1.** Saklama, aynı panelde duran Analiz süzmesinin desenini izler: uygulama ayarlarında kendi anahtarında, model **adlarının** listesi, ve liste **üretilmeyenleri** tutar (adı listede olmayan model üretimdedir). Böylece R3'ün "göç yok" kuralı bedava gelir.
- **C2.** Model kayıtlarına alan eklenmez. Gerekçe ölçülmüştür: standart modeller çakışma birleştirmesine girmez (0077 X7), yani o tabloya yazılan işaret çok bilgisayarlı kurulumda kaybolabilir; uygulama ayarları ise birleştirmede yerel değeri korur.
- **C3.** Yeni ayar alanı dört nokta kuralıyla eklenir (şema, sütun göçü, yazma, okuma) ve veritabanı gidiş dönüş testine girer; JSON alan deseni Analiz süzmesiyle aynıdır.
- **C4.** Yeni ayar alanı sunucunun ayar alanı eşlemesine yazılır (emsalle aynı: yalnız Ayarlar sekmesi). Yeni izin açılmaz.
- **C5.** Alan, makinaya özgü ayarları süzen listeye **girmez**: işaret bütün bilgisayarlar için aynıdır.
- **C6.** Süzme ekranda yapılır, hesapta değil: maliyet motoru bütün canlı modelleri hesaplar ve her satıra işaretini ve dönem adedini yazar; hangi satırın çizileceğine ekran karar verir. Böylece sayılar tek geçişte çıkar ve R8 ile R11 aynı veriden beslenir.
- **C7.** Ekran hesap yapmaz: dönem adedi ve işaret motor çıktısından okunur (0088'in taraması).
- **C8.** Yedek paketi değişmez: alan uygulama ayarlarının içinde "Firma ve ayarlar" paketiyle taşınır; paket açıklaması bölüm listesinden türediği için elle metin yazılmaz.
- **C9.** Türkçe metinler; bu ekranın yazdırma çıktısı yok.
- **C10.** İki onay kutusu kaynak ayrımı olmadan ayırt edilemez: `tests/ui/models-manager-analiz.test.jsx:16` kutuları `document.querySelectorAll('input[type="checkbox"]')` ile **konumdan** okuyor ve üç model için `length === 3` iddia ediyor. İkinci kutu bu sayıyı altıya çıkarır ve `cbs[1]` artık AK-140'ın Analiz kutusu olmaz. O dosyanın dört testi erişilebilir ada göre yeniden yazılır (R1/2); konum tabanlı sorgu bırakılmaz.
- **C11.** **Hiçbir altın dosya yeniden üretilmez.** `scripts/tests/db-roundtrip.cjs:614` bütün `appSettings` gövdesini `JSON.stringify` eşitliğiyle `tests/fixtures/0088-govde-once.json` ile karşılaştırıyor; o altının `appSettings`'i `"analizGizliModeller": []` ile bitiyor. Her zaman yazılan yeni bir anahtar hem fazla anahtar hem sıra farkı üretirdi. R24/2'nin "boş liste yazılmaz" kuralı altını dokunulmadan bırakır; ayıklama listesi de genişletilmez.
- **C12.** `gercekUretim`'in bugünkü çıktısı iki testte **tam nesne eşitliğiyle** sabitli (`tests/makina-standart-maliyet-0088.test.js:74` AC-15 ve `:85` AC-15/3). Bu yüzden model kırılımı alan olarak eklenmez, isteğe bağlı seçenekle istenir (R25); parametresiz çağrının çıktısı birebir aynı kalır ve iki test dokunulmadan yeşil durur. Emsal: `kasa.hareketOzeti` ve `cek.cekAyOzeti`'nin `{ liste: true }` seçeneği (spec 0059).
- **C13.** Ekran dosyalarında hesap yasağının ölçülü koruması var: `tests/ui/makina-maliyeti-0088.test.jsx:335` (`R25`) `src/components/maliyet` altındaki her dosyada ` * ` ve ` / ` kalıbını reddediyor. Sayı satırı bu yüzden tam sayı yazar, oran ya da yüzde hesaplamaz. Aynı klasörün ikinci kuralı `tests/kilit-alanlari.test.js:62`: klasördeki her dosya `KILIT_ALANLARI` ya da `KILITSIZ_DOSYALAR`'da olmalı, yani süzgeç için yeni bir bileşen dosyası açılırsa kilit kaydı da yazılır.
- **C14.** Ad eşlemesi **iki ayrı sorudur** ve karıştırılmaz. (a) İşaret listesi ile katalog adı aynı `m.model` dizesinin iki yüzüdür, birebir karşılaştırılır (R24/3); oraya Türkçe küçültme konursa ham adı yazan yeniden adlandırma zinciri kopar (`ModelsManager.jsx:80`), üstelik gereksizdir çünkü `existsElsewhere` yalnız harf farkıyla iki modeli zaten yasaklıyor. (b) Makina ile model eşlemesi (R13) **Türkçe küçültmeyle** yapılır; `makinaListesi` hazır `modelKey` veriyor (`makinaMaliyeti.js:114` ve `:123`) ve `partiHesabi` haritalarını bugün böyle kuruyor (`:211`).
- **C15.** Birleştirme **nesne bütün** çalışır: `mergeAppSettings` (`utils.js:361`) bu PC'nin bütün `appSettings`'ini yeniden yüklenenin üzerine bindirir, ada göre liste birleştirmesi yapmaz. İki bilgisayar aynı anda farklı modelleri işaretten çıkarırsa biri sessizce kaybolur (X8). Bu emsalin de bugünkü sınırıdır; daraltılmaz, yazılır.
- **C16.** Süzgeç `Segment`'ten gelmez. Sözlük sekme ve süzgeç **çubuklarını** `Segment`'e bağlıyor (spec 0014); tek aç kapa anahtarının karşılığı sözlükte yok ve bu biçim "Kapsam dışı ekranlardaki kopyalar" altında zaten sayılı (`docs/tasarim-sozlugu.md:381`, Müşteriler'in "Firmaya Göre Grupla" düğmesi; Giderler'in `aria-pressed`'li "Hatırlatma kapsamı" düğmesi de yakın kopyalar listesinde). Bu ekran için sözlüğün istisna listesine tek satır eklenir.
- **C17.** Yedek paketine **not yazılmaz** ve C8 aynen durur. Emsaller bölünüyor: `analizGizliModeller`'in notu yok, `maliyetAyarlari`'na not yazıldı (`MALIYET_AYAR_NOTU`); üstelik notlar birebir sabitli (`tests/ui/yedek-paketleri-0086.test.jsx:55` "Firma ve ayarlar" paketinin notlarının tam olarak `[MALIYET_AYAR_NOTU, YEREL_AYAR_NOTU]` olduğunu iddia ediyor), yani not eklemek üç sabitli testi kırar. Bilinen sınır Context'e yazılır: modeller "Tanımlar" paketinde, işaretler "Firma ve ayarlar" paketinde geri yüklenir.

### KAPSAM DIŞI

- **X1.** Model seçicilerinin süzülmesi (teklif, stok, müşteri makinası, servis) — *neden:* üretimi bırakılmış modelin ikinci el devri, yedek parçası ve servisi sürüyor; seçiciden kalkması veri girişini engeller. Kullanıcı seçicilerde de kirlilik bildirirse ayrı iş.
- **X2.** Analiz'in model süzmesiyle birleştirme ya da tek kutuya indirme — *neden:* iki soru ayrı ("hâlâ üretiyor muyuz" ile "Analiz'de görmek istiyor muyum"); birleştirmek birini açanın ötekini de açmasına yol açar.
- **X3.** Modelin kataloğdan kalıcı emekliye ayrılması (silmenin güvenli alternatifi, bütün ekranları kapsayan kavram) — *neden:* model adı teklifte, stokta, serviste, Analiz'de ve gider model satırlarında geçiyor; kapsamı kataloğun tamamıdır ve ayrı spec ister.
- **X4.** Silinen özel modelin eski belgelerindeki resim ve ürün açıklaması kaybının giderilmesi — *neden:* ayrı bulgu, README'de kayıtlı, kendi kararını bekliyor; bu spec silmeye alternatif sunarak o kaybı zaten gereksizleştirir.
- **X5.** Üretimde olmayan modelin maliyet hesabından çıkarılması — *neden:* hesap doğru, yalnız çizim süzülüyor (R19); hesabı bozmak süzgeci açan kullanıcıya boş satır gösterirdi.
- **X6.** İşaretin geçmişi (ne zaman üretimden çıktı) — *neden:* istenmedi; işlem geçmişi kaydı bugünkü ayar yazımı kadarıyla kalır.
- **X7.** Dönem adedine göre otomatik işaretleme ya da öneri — *neden:* kullanıcı kararını veri üzerinden tahmin etmek yanlış işaretleri sessizce kalıcılaştırır; R14 ve R15 yalnız uyarır (ve R8/2 sayıyı her zaman görünür kılar).
- **X8.** İşaret listesinin çakışmada ada göre birleştirilmesi — *neden:* `mergeAppSettings` bütün `appSettings`'i tek parça bindirir (C15) ve bunu yalnız bu alan için bölmek uygulama ayarlarının birleştirme kuralını ikiye ayırırdı. İki bilgisayarın aynı anda farklı modelleri işaretten çıkarması bilinen sınırdır; kullanıcı bildirirse ayrı iş.
- **X9.** Parti Hesabı'nın "Planlanan adetler" penceresindeki model listesinin süzülmesi — *neden:* R29; o bir model seçicisidir, X1'in gerekçesi aynen geçerli.

---

## Context

### Ölçülmüş emsal: aynı paneldeki Analiz süzmesi

Ayarlar › Katalog › Makina Modelleri'nde satır başına onay kutusu deseni **zaten var**:
"Analiz'de Göster". Çalışma biçimi bu spec'in istediğinin aynısıdır ve dört noktası ölçüldü.

| Parça | Nerede | Not |
|---|---|---|
| Onay kutusu ve yazımı | `ModelsManager.jsx:16-24` | Liste gizlenenleri tutar; adı listede olmayan model gösterilir |
| Ad taşıma | `ModelsManager.jsx:73-80` `cascadeRename` | Yeniden adlandırmada liste de taşınır |
| Silmede düşme | `ModelsManager.jsx:175` | Silinen modelin adı listeden çıkar |
| Kalıcı alan | `db.cjs:338`, `:539`, `:995`, `:1496` | `app_settings.analizGizliModeller TEXT`, JSON dört nokta |
| Sunucu | `serverAuth.cjs:163` | `analizGizliModeller: ["settings"]`, yeni izin yok |
| Okuyan ekran | `Analiz.jsx:208` | Süzme görünüm katmanında, saf motorda değil |
| Birleştirme | `App.jsx` `mergeAppSettings` | Uygulama ayarları çakışmada yerel değeri korur (nesne bütün, C15) |
| Panele giden dizi | `App.jsx:1715`, `Settings.jsx:249` | İki ekran da `liveCustomModels` alır: çöpteki model hiç çizilmez, kutusu da olmaz |
| Mevcut testi | `tests/ui/models-manager-analiz.test.jsx:16` | Kutuları konumdan okur; ikinci kutu onu kırar (C10) |

Bu yüzden iş küçük: yeni bir kavram değil, kanıtlanmış bir desenin ikinci kullanımı.

### Kaldırmanın ve eklemenin kırdığı yerler (ölçüldü)

| Yer | Bugün | Bu spec'te |
|---|---|---|
| `ModelsManager.jsx:179` başlık dizisi | Sekiz girdi (`"", Model, Soğutma, Kapasite, Kalıp Çapı, Tanım, Analiz, ""`) | Dokuz ("Üretimde" Analiz'in sağına) |
| `ModelsManager.jsx:122` Analiz kutusu | Yalnız `title`, erişilebilir ad yok | İki kutuya da model adlı `aria-label` (R1/2) |
| `tests/ui/models-manager-analiz.test.jsx` | Dört test kutuları konumdan okur, `length === 3` | Ada göre yeniden yazılır (C10) |
| `ModelMaliyetleri.jsx:62-63` başlıkları | Sekiz `<th>` | Dokuz ("Dönemde üretilen" Model'in sağına) |
| `ModelMaliyetleri.jsx:81` döküm satırı | `colSpan={8}` | `colSpan={9}` |
| `ModelMaliyetleri.jsx:57-59` | `PayOzeti`, sonra başlıksız kart | Araya sayı satırı ve süzgeç (R8, R9) |
| `ModelMaliyetleri.jsx:58` boş durum | Tek kutu, `bos-model-maliyet` | İki kutu, ikinci `bos-model-maliyet-uretimde` (R11, R12) |
| `MakinaMaliyeti.jsx:35` memo | `[standardModels, customModels, parts, pay.payK]` | İşaret listesi ve `gercek` de bağımlılığa girer, yoksa kutu değişince satırlar bayat kalır |
| `MakinaMaliyeti.jsx:50` | `onAyarlar` geçiliyor, hiç alınmıyor | Kullanılır ya da silinir (R30) |
| `makinaStandartMaliyet.js:159` `gercekUretim` | Dört alan döner, iki test tam eşitlikle sabitliyor | Seçenekle beşinci ve altıncı alan (R25, C12) |
| `makinaStandartMaliyet.js:191` `modelMaliyetleri` | İki argüman | Üçüncü seçenek nesnesi (R25/2) |
| `db.cjs:338`, `:539`, `:995`, `:1496` | On beş `app_settings` alanı | On altı; yeni alan boş değer yazmaz (R24/2) |
| `scripts/tests/db-roundtrip.cjs:614` | `appSettings` gövdesi altınla birebir | Dokunulmaz (C11) |
| `serverAuth.cjs:163` komşuluğu | On bir alan eşlemesi | On iki (`uretimdeOlmayanModeller: ["settings"]`) |
| `Settings.jsx:246` panel girişi | Yalnız seçicileri anlatır | Altına işaretin kapsamı ipucusu (R28) |
| `docs/tasarim-sozlugu.md:381` istisna listesi | İki tek aç kapa düğmesi sayılı | Üç (bu ekranın süzgeci, C16) |

### Görsel kanıtın bedeli (ölçüldü)

`docs/evidence/kanit-eslemesi.json` dokunulan dosyalar için yirmi kayıt tutuyor ve **hepsi `beklenen: "ayni"`**.
Aşağıdaki kayıtların ekranı bu spec'te bilinçli olarak değişir, yani `degisti` ve onay ister.

| Dosya | Ekran | Neden değişir |
|---|---|---|
| `ModelsManager.jsx` | `katalog-model` | Dokuzuncu sütun ve ikinci kutu |
| `ModelsManager.jsx` | `katalog-model-ekmaliyet` | Aynı tablo arkada çizili |
| `ModelsManager.jsx` | `ayarlar-models` | Aynı panel |
| `ModelMaliyetleri.jsx` | `maliyet-modeller` | Sayı satırı, süzgeç, dokuzuncu sütun |
| `ModelMaliyetleri.jsx` | `maliyet-modeller-dokum` | `colSpan` ve döküm satırının genişliği |
| `ModelMaliyetleri.jsx` | `maliyet-katsayi-formu` | Arkadaki tablo |
| `PayOzeti.jsx` | `maliyet-modeller` | Kendi çizimi değişmez, ekran değişir |
| `PayOzeti.jsx` | `maliyet-bos-ayar` | Tablo yine çizilir; adet sütununda neden metni |
| `PayOzeti.jsx` | `maliyet-bos-rol` | Aynı |
| `MakinaMaliyeti.jsx` | `maliyet-modeller` | Aynı ekranın kabı |

Yeni ekranlar: `katalog-model-uretimde` (bir model işaretten çıkarılmış panel), `maliyet-modeller-uretimde-kapali`,
`maliyet-modeller-uretimde-acik`, `maliyet-modeller-isaret-bilgi` (R14), `maliyet-modeller-isaret-uyari` (R15),
`maliyet-modeller-bos-uretimde` (R11). `maliyet-parti*` ekranları değişmez (R20, R29).

**İki tuzak:** `tests/kanit-eslemesi.test.js` yalnız **biçimi** denetler (satır 31-34), kaydın gerçekten değişen ekranı
gösterdiğini ölçmez; unutulan kayıt sessizce geçer. Kanıt aracı da bulunamayan adımı yalnız `console.warn` ile geçer
(spec 0089'un yazılı borcu), yani yanlış ekran çekilir ve kimse görmez.

### Neden model kaydına sütun değil

`standardModels` çakışma birleştirmesine bilinçli olarak girmez (0077 X7) ve `standard_models`
tablosunda silme damgası bile yok (sabit Altunmak kataloğu, altı model). O tabloya yazılan bir
işaret çok bilgisayarlı kurulumda bir çakışmada kaybolabilir. Uygulama ayarları ise
`mergeAppSettings` ile yerel değeri koruyor. Özel modellerde durum tersidir (ad kimliğiyle
birleşir), ama işareti iki yere bölmek tek bir soruyu iki mekanizmayla cevaplamak olurdu.

### Neden işaret, türetilmiş süzgeçten iyi

Bu soruyu önce veriden türetmeyi önerdim ("bu dönemde üretilmiş mi"), Takım Yöneticisi işareti
seçti ve işaret bu amaç için doğru olan. Gerekçe: dönem gerçeği ile üretim kararı ayrı şeylerdir.
Her yıl ürettiğiniz bir modelin ilk çeyrekte hiç üretilmemesi onu kataloğdan düşürmez; türetilmiş
süzgeç o modeli yanlışlıkla gizlerdi. Buna karşılık türetilmiş adet ücretsiz bir denetimdir, bu
yüzden işaretin yerine değil **yanına** kondu (R13-R15): işaret eskidiğinde ekran bunu söyler.

### Neden silmek çözüm değil (README'de açık bulgu)

Özel model silinince o modele ait eski teklif, proforma ve faturaların resmi ile ürün açıklaması
çizim anında model kaydından arandığı için düşer (`Documents.jsx:242`, `:270`, `:668`); çöpteki
model o listeye girmez. Üstüne çöp kutusunun otuz günlük otomatik temizliği model tanımını kalıcı
siler (`App.jsx:1079`; `:1091` tedarikçilerin temizliğidir, spec 0068). Müşteri makinasının bilgisi düşmez (`customers[].model` düz metindir ve
müşteri formunun model seçicisi bilinmeyen değeri korur), kayıp belgelerdedir. Bu spec silmeye
gerek bırakmayan yolu açar.

### Yedeğin bilinen sınırı

Alan uygulama ayarlarının içindedir, yani **"Firma ve ayarlar"** paketiyle taşınır; modeller ise **"Tanımlar"** paketinde
(`yedekPaketleri.js` `YEDEK_PAKETLERI`). Yalnız birini seçen kısmi geri yükleme ötekini bayat bırakır: modelleri geri
yükleyip ayarları yüklemeyen kullanıcı yeni modelleri bugünkü işaretlerle, ayarları geri yükleyip modelleri yüklemeyen
kullanıcı var olmayan modellerin işaretlerini alır. Bu emsalin (`analizGizliModeller`) bugünkü davranışının aynısıdır ve
pakete not yazılmaz (C17); burada yazılması hatanın yeniden keşfedilmesini önlemek içindir.

### Bilinen tuzaklar

- **Ad listesiyle çalışmak:** yeniden adlandırma ve silme zincirleri unutulursa işaret sahipsiz kalır (emsalde ikisi de yazılı, `ModelsManager.jsx:80` ve `:175`; R4 ve R5 onları ister).
- **İki ayrı ad eşlemesi:** işaret listesi birebir, makina eşlemesi Türkçe küçültmeyle (C14). Birini ötekinin kuralıyla yazmak iki ayrı hata üretir: küçültülmüş liste yeniden adlandırmayı koparır, küçültülmemiş makina eşlemesi adedi sıfır gösterir (parti hesabının triyajında yaşanan tuzak, `partiHesabi` satır 211'in yorumu).
- **Boş değer:** liste boşken gövdeye **hiçbir şey** yazılmaz (R24/2). Emsalin her zaman `[]` yazan davranışı korunursa 0088'in gövde altını kırılır (C11) ve R3 yalnız ilk gidiş dönüşe kadar doğru kalır. Anahtarın silinmesi ayrıca sunucu karşılaştırmasının her yazımda sahte fark görmesini önler: istemci bellekte `[]` tutup veritabanı anahtarı düşürürse `ayarAlanEngelli` (`serverAuth.cjs:249`) alanı her kayıtta "değişmiş" sayar.
- **Dönem adedi:** üretim tarihi çözümü tek zincirdedir (0088 R9/3); ikinci bir tarih kuralı yazılması bu projede iki kez hataya yol açtı. Tarama ekran dosyalarını da kapsar (R17, AC-39).
- **Toplamların tutmaması:** model adetlerinin toplamı `PayOzeti`'nin "Dönemde gerçekte üretilen" sayısından küçük olabilir (modeli kataloğda bulunamayan makinalar ve üretim tarihi çözülemeyenler). İkisinin de sayısı ekranda yazılır (R27/2 ve bugünkü `cozulemeyen` ipucusu, `PayOzeti.jsx:39`).
- **Gizli uyarı:** R7'nin süzmesi R15'in uyarısını görünmez kılar; R8/2 olmadan yanlış işaret sessizce kalıcılaşır.
- **Haritada olmayan alan zaten Ayarlar'a düşer:** `AYAR_VARSAYILAN_SEKMELER = ["settings"]` (`serverAuth.cjs:171`), yani C4'ün satırı doğruluk için değil **açıklık** için eklenir; eklenmezse de davranış doğrudur, ama eşleme listesi eksik kalır.

---

## Acceptance Criteria

### İşaret ve saklama

- **AC-1.** Makina Modelleri panelinde her standart model satırında üretimde onay kutusu çizilir ve erişilebilir adıyla bulunur.
- **AC-1/2.** Tablonun başlık dizisi dokuz girdi taşır ve dokuzuncu başlıktan önceki yeni başlık "Üretimde"dir.
- **AC-1/3.** İki kutu da model adını taşıyan erişilebilir adla ayrı ayrı bulunur; aynı satırda ikisi karıştırılmaz.
- **AC-2.** Her özel model satırında da çizilir.
- **AC-3.** İşareti hiç verilmemiş model üretimde sayılır; ayar alanı hiç yokken bütün modeller üretimdedir.
- **AC-4.** Kutu işaretten çıkarıldığında modelin adı ayar listesine girer.
- **AC-5.** Kutu yeniden işaretlendiğinde ad listeden çıkar.
- **AC-6.** Üretimde olmayan model yeniden adlandırıldığında liste yeni adı taşır.
- **AC-7.** Üretimde olmayan özel model silindiğinde adı listeden düşer.
- **AC-8.** Silinen model çöpten geri alındığında üretimde sayılır.
- **AC-9.** Ayar alanı kaydedilip yeniden yüklendiğinde birebir geri gelir.
- **AC-9/2.** Liste boşken okunan gövdede anahtar **hiç yoktur** (boş dizi de değil, null da değil).
- **AC-9/3.** Son model yeniden işaretlendiğinde anahtar gövdeden düşer; bellekte boş dizi bırakılmaz.
- **AC-9/4.** Maliyet ayarı ve işaret alanı olmayan `appSettings` gövdesi spec öncesi altınla birebir aynı kalır (`0088-govde-once.json` yenilenmedi).
- **AC-10.** Alan makinaya özgü ayar süzmesine girmez: yükleme yolunda `disAppSettingsSuz` onu ayıklamaz, yani başka bilgisayardan gelen işaret gövdede kalır.
- **AC-10/2.** Çakışma birleştirmesinde bu PC'nin henüz gönderilmemiş işareti yaşar (`mergeAppSettings` yerel değeri bindirir); birleştirme ada göre değil nesne bütün çalışır ve bu bilinen sınırdır.
- **AC-11.** Ayarlar sekmesi olmayan kısıtlı kullanıcının bu alanı yazması reddedilir ve reddedilen alanın adı yeni alanın adıdır.
- **AC-11/2.** Ayarlar sekmesi açık kullanıcı alanı yazabilir.
- **AC-12.** Yeni eylem izni eklenmedi; kutu bugünkü katalog yazma iznini ister ve kilit alanları listesi değişmedi.
- **AC-12/2.** Panelde işaretin kapsamını söyleyen ipucu çizilir: yalnız Model Maliyetleri süzülür, seçiciler ve Analiz etkilenmez.

### Maliyet ekranı

- **AC-13.** Yirmi canlı modelden yedisi üretimdeyse tablo yedi satır çizer.
- **AC-14.** Sayı satırında tanımlı model sayısı ve üretimde olan sayısı yazar.
- **AC-14/2.** Sayı satırı ve süzgeç üç durumda da çizilir: tablo çizilirken, R11'in boş durumunda ve R12'nin boş durumunda.
- **AC-14/3.** İşareti dönemle çelişen model varsa sayısı aynı satırda, süzgeç kapalıyken de yazar.
- **AC-14/4.** Çelişen model yokken o uyarı hiç çizilmez.
- **AC-15.** Süzgeç açıldığında yirmi satır çizilir.
- **AC-16.** Süzgeç açıkken üretimde olmayan satırda bunu söyleyen işaret bulunur.
- **AC-17.** Süzgeç açıkken üretimdeki satırda o işaret bulunmaz.
- **AC-18.** Ekran yeniden açıldığında süzgeç varsayılan hâline döner.
- **AC-19.** Bütün modeller işaretten çıkarılmışsa tablo yerine `bos-model-maliyet-uretimde` kutusu çizilir, üretimde olmayan sayısını ve süzgeç yolunu yazar; `bos-model-maliyet` çizilmez.
- **AC-19/2.** O kutuda düğme yoktur.
- **AC-20.** O boş durumdan süzgeç açılınca bütün satırlar çizilir ve kutu kaybolur.
- **AC-21.** Hiç model tanımlı değilse bugünkü `bos-model-maliyet` kutusu bugünkü başlık ve metniyle çizilir; süzgeç açılsa da tablo çizilmez.
- **AC-22.** Üretimde olmayan modelin maliyet rakamları süzgeç açıldığında işaretsiz hâliyle birebir aynıdır.

### Denetim sütunu

- **AC-23.** Dönemde iki makinası üretilmiş model satırında adet iki yazar; sütun başlığı "Dönemde üretilen" ve yeri Model sütununun hemen sağıdır.
- **AC-23/2.** Tablo dokuz sütun çizer ve döküm satırının `colSpan`'ı dokuzdur.
- **AC-23/3.** Dönemde hiç üretilmemiş model satırında hücrede "0" yazar, "—" yazmaz.
- **AC-24.** Dönemde hiç üretilmemiş ve üretimde işaretli model satırında bilgi işareti çizilir.
- **AC-25.** Dönemde üretilmiş ama üretimde olmayan model satırında uyarı işareti çizilir.
- **AC-26.** Üretimde olup dönemde üretilmiş model satırında iki işaretten hiçbiri çizilmez.
- **AC-27.** Hesap ayarları girilmemişken adet hücresinde rakam yerine "hesap ayarları girilmedi" yazar.
- **AC-27/2.** O hâlde R14 ile R15'in işaretleri hiç çizilmez.
- **AC-27/3.** Dönem gider takibinin yürürlüğünden önce olsa da adet sayılır ve yazılır (pay sıfır olsa bile).
- **AC-28.** Dönem dışında üretilmiş makina adete girmez.
- **AC-29.** Üretim tarihi çözülemeyen makina adete girmez ve sayısı bugünkü yerinde görünmeye devam eder.
- **AC-29/2.** Modeli kataloğun hiçbir satırıyla eşleşmeyen makina hiçbir model satırının adedine girmez; sayısı sıfırdan büyükse ekranda yazar.
- **AC-29/3.** O sayı sıfırken satır hiç çizilmez.
- **AC-30.** Makina ile model eşlemesi Türkçe büyük küçük harf farkından etkilenmez: adı farklı yazılmış makina kendi modelinin adedine girer.
- **AC-30/2.** İşaret listesi ile katalog adı birebir karşılaştırılır: listeye yazılan ad, kutunun okuduğu adla aynı dizedir.

### Dokunulmayanlar

- **AC-31.** Makina başına genel gider payı işaretten etkilenmez: aynı veride işaret değiştirilerek pay yeniden ölçülür ve aynı çıkar.
- **AC-32.** Parti Hesabı görünümü üretimde olmayan modelin makinalarını hesaba katar ve satırını çizer.
- **AC-33.** Müşteri makinası formunun model seçicisi üretimde olmayan modeli listelemeye devam eder.
- **AC-34.** Stok makina formunun model seçicisi de listelemeye devam eder.
- **AC-35.** Teklif satırının model seçicisi de listelemeye devam eder.
- **AC-36.** Analiz'in model süzmesi bu işaretten etkilenmez: üretimde olmayan model Analiz'de görünmeye devam eder.
- **AC-37.** Analiz süzmesinin kutusu işaretten çıkarıldığında maliyet ekranındaki satır etkilenmez.
- **AC-38.** Yeni sütun para değil adettir: tam sayı yazar, para birimi simgesi taşımaz ve ekranın bugünkü para gösterimlerine dokunmaz.
- **AC-39.** Üretim tarihi zinciri tek yerdedir: motor `makinaListesi`'ni içe aktarır ve ne motor ne `src/components/maliyet` altındaki ekran dosyaları kendi tarih zincirini yazar (tarama).
- **AC-40.** `gercekUretim`'in seçeneksiz çıktısı bugünküyle birebir aynıdır; model kırılımı yalnız seçenekle gelir.
- **AC-41.** `modelMaliyetleri` seçeneksiz çağrıldığında bugünkü alanları aynen üretir.
- **AC-42.** Motor her satıra işaretini, dönem adedini ve işaret durumunu yazar; ekran bu dört alanı okur, kendisi türetmez (tarama).
- **AC-43.** Parti Hesabı'nın "Planlanan adetler" penceresi üretimde olmayan modeli listelemeye devam eder.
- **AC-44.** `MakinaMaliyeti.jsx`'te karşılanmayan prop kalmadı.
- **AC-45.** `tests/ui/models-manager-analiz.test.jsx`'in dört testi erişilebilir ada göre çalışır ve kaynakta konumdan okuyan kutu sorgusu kalmadı.
- **AC-46.** Yedek paketlerinin listesi, cümlesi ve notları değişmedi (`YEDEK_PAKETLERI` ve `paketNotlari` çıktıları aynı).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Süzme görünüm katmanında; motor her modele işaretini, dönem adedini, adet nedenini ve işaret durumunu yazıyor ve kendi testi var (C6, C7 taramaları).
- [ ] Dönem adedi tek üretim tarihi zincirinden çözülüyor; tarama **hem motoru hem ekran dosyalarını** kapsıyor.
- [ ] `gercekUretim` ve `modelMaliyetleri` **geriye dönük uyumlu** genişletildi; 0088'in AC-15 ve AC-15/3 tam eşitlik testleri dokunulmadan yeşil (C12).
- [ ] **Hiçbir altın dosya yeniden üretilmedi**; `tests/fixtures/0088-govde-once.json` ve onu okuyan gidiş dönüş denetimi dokunulmadı (C11).
- [ ] Yeni kalıcı ayar alanı dört nokta kuralıyla eklendi ve gidiş dönüş testine girdi; **boş liste gövdeye yazılmıyor** ve anahtar son işaretle birlikte düşüyor (R24/2).
- [ ] Sunucunun ayar alanı eşlemesine tek satır eklendi; yeni izin yok ve bu açıkça yazıldı. Eşleme olmasa da davranışın doğru olduğu (`AYAR_VARSAYILAN_SEKMELER`) yazıldı.
- [ ] Ad taşıma ve silmede düşme zincirleri emsalle aynı yerde ve testli; işaret listesi birebir, makina eşlemesi Türkçe küçültmeyle (C14).
- [ ] Yeni veri bölümü yok; birleştirme kuralları değişmedi ve nesne bütün birleştirmenin bilinen sınırı yazıldı (C15, X8).
- [ ] Yedek paketi listesi, cümlesi ve notları değişmedi; kısmi geri yüklemenin bilinen sınırı Context'e yazıldı (C17).
- [ ] İki onay kutusunun erişilebilir adı var ve `tests/ui/models-manager-analiz.test.jsx` konumdan okumayı bıraktı (C10).
- [ ] İki tablonun sütun sayıları ve `colSpan` güncellendi; sayı kriteri var (AC-1/2, AC-23/2).
- [ ] İki boş durum ayrı kimlik ve ayrı başlık taşıyor, kutularda düğme yok (R11, R12).
- [ ] Yanlış işaretin sayısı varsayılan ekranda görünüyor (R8/2).
- [ ] Panelde işaretin kapsamını söyleyen ipucu var (R28).
- [ ] Ölü prop kalmadı (R30).
- [ ] Tasarım sözlüğünün istisna listesine bu ekranın süzgeci için tek satır eklendi (C16).
- [ ] Kullanıcıya görünen bütün metinler Türkçe.
- [ ] Görsel kanıt eklendi (panelin iki kutulu satırı, süzgeç kapalı ve açık, iki denetim işareti, iki boş durum) ve kanıt eşlemesi güncellendi: Context'in "Görsel kanıtın bedeli" tablosundaki on kayıt `degisti` ve onaylı, altı yeni ekran kaydedildi.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: ikinci model işareti, hangi soruyu cevapladığı, Analiz süzmesinden farkı, alanın boş değer kuralı ve motorun iki yeni seçeneği.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (plan onayı 2026-10-17, revizyon 3)

| No | Konu | Karar |
|---|---|---|
| K1 | Son işaret kalkınca anahtar silinirse birleştirme eski listeyi geri getirir | Değer `undefined` yapılır, silinmez (R24/4) |
| K2 | R27 katalog ister, R25 imzası almıyor | Seçeneğe `katalog` eklenir (R25/3) |
| K3 | `onAyarlar` kullan ya da sil | Silinir (R30) |
| K4 | Sayılar ekranda mı motorda mı | Motorda `modelSayilari` (R26/2) |
| K5 | Metinler birebir yok | R31'deki metinler sabit olarak |
| K6 | Çöpten geri alma kod ister mi | İstemez; gerçek Çöp Kutusu ile davranış testi (AC-8) |
| K7 | Seçiciler ve Analiz nasıl kanıtlanır | Tarama (alan adı izinli dosyalarda) + davranış testi |
| K8 | Kanıtın kapsamı | Fark eden her ekran ad ad gerekçelenir; yeni ekranların adımları UI testiyle sınanır |
| K9 | AC-11 için uçtan uca test | Yalnız `server-authz` (jenerik yol, emsalde de e2e yok) |
| K10 | AC-13 verisi | Ortak fikstür `tests/fixtures/0091-veri.js` |

---

## Karar kaydı (QA turu 2026-10-17)

Yirmi üç bulgunun hepsi Takım Yöneticisi tarafından onaylandı ve aşağıdaki maddelere işlendi.

| Bulgu | Derece | Soru | Cevap |
|---|---|---|---|
| B-1 | Bloklayıcı | Motorun imzası ve dönem adedinin kaynağı | R25, R25/2, R26, C12, AC-40, AC-41, AC-42 |
| B-2 | Bloklayıcı | Alan her zaman `[]` yazarsa 0088'in gövde altını kırılır | R24, R24/2, C11, AC-9/2, AC-9/3, AC-9/4 |
| B-3 | Bloklayıcı | İkinci kutu dört testi kırıyor, iki kutu ayırt edilemiyor | R1, R1/2, C10, AC-1, AC-1/3, AC-45 |
| B-4 | Bloklayıcı | R15'in uyarısı varsayılan ekranda görünmüyor | R8/2, AC-14/3, AC-14/4 |
| B-5 | Bloklayıcı | R8'in başlığı yok, süzgecin ve boş durumun yeri belirsiz | R8, R9, R9/2, AC-14, AC-14/2, AC-20 |
| Ö-6 | Önemli | İki boş durumun başlığı ve kimliği yok | R11, R12, AC-19, AC-19/2, AC-21 |
| Ö-7 | Önemli | AC-10 iki karşıt davranışı birden iddia ediyor | C15, X8, AC-10, AC-10/2 |
| Ö-8 | Önemli | AC-11'in ikinci yarısı yanlış | AC-11, AC-11/2 |
| Ö-9 | Önemli | Ad eşlemesinde iki ayrı soru karışmış | R24/3, C14, AC-30, AC-30/2 |
| Ö-10 | Önemli | Modeli bulunamayan makina hiçbir adede girmiyor | R27, R27/2, AC-29/2, AC-29/3 |
| Ö-11 | Önemli | Panelde işaretin neyi etkilediği yazmıyor | R28, AC-12/2 |
| Ö-12 | Önemli | Değişen kanıt ekranları ölçülmedi | Context "Görsel kanıtın bedeli", DoD kanıt satırı |
| Ö-13 | Önemli | Sütun sayıları ve `colSpan` yazılmamış | R1, R13, AC-1/2, AC-23/2 |
| Ö-14 | Önemli | Tasarım sözlüğü kararı yok, DoD'de satır yok | R9, C16, DoD sözlük satırı |
| Ö-15 | Önemli | Dönem adedi hücresinin metinleri tanımsız | R13/2, R16, R16/2, AC-23/3, AC-27, AC-27/2, AC-27/3 |
| K-16 | Küçük | R17'nin kabul kriteri yok | R17, AC-39 |
| K-17 | Küçük | C7'nin ölçülü koruması adıyla yazılmalı | C13 |
| K-18 | Küçük | `App.jsx:1091` yanlış satır | Context "Neden silmek çözüm değil" (`:1079`), emsal tablosuna iki satır |
| K-19 | Küçük | Parti Hesabı'nın plan penceresi süzülmemeli | R29, X9, AC-43 |
| K-20 | Küçük | `onAyarlar` ölü prop | R30, AC-44 |
| K-21 | Küçük | Yedek paketine not yazılmaması kararı yazılı olmalı | C17, Context "Yedeğin bilinen sınırı", AC-46 |
| K-22 | Küçük | AC-38'in karşılığı yok | AC-38 yeniden tanımlandı |
| K-23 | Küçük | Dönem adedi sütununun başlığı ve yeri yok | R13, R14, R15, AC-23 |

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
