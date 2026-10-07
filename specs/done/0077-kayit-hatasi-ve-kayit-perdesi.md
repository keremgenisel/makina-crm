# 0077 — "Kaydedilemedi" Hatası, Kaybolan Silmeler ve Kayıt Perdesi

| | |
|---|---|
| **Durum** | Tamamlandı (commit `65b15fc`, dal `feat/0077-kayit`) |
| **Sahip** | Analist (spec) · Claude Code (uygulama) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | `App.jsx` kayıt etkisi ve sürüm yoklamaları, `electron/ipc/data.cjs` (`crm:save`), `src/lib/merge.js`, `electron/server.cjs` yazma sınırı, yeni kayıt perdesi bileşeni |
| **Bağımlı spec'ler** | 0004 (kayıt kilitleri) · 0009 (tasarım sözlüğü) · 0024 (`hesapHareketleri`'nin null başlangıcı) · 0030 (tema değişkeni kuralı) · 0065 (birleştirmede korunan eklemeler, `bilinenLogIdleri` deseni) · 0073 (`merge.js`'in `hesapHareketleri` istisnası) |
| **Revizyon** | 1 · 2026-10-07 QA turu: B-1..B-6, Ö-7..Ö-20, K-21..K-25 işlendi (Takım Yöneticisi onayı) · 2 · 2026-10-07 uygulama planı onayı: S1–S14 işlendi (R9, R14, R19, R22, R30, R32, R33, R37–R45, AC-58); plan `specs/done/0077-uygulama-plani.md` |

---

## Intent

İstemci PC'lerde gider kalemlerini ya da evrak kayıtlarını peş peşe silerken, ya da hızlı veri
girerken **sürekli** şu mesaj çıkıyor:

> Değişiklikler kaydedilemedi! Uygulamayı kapatıp yeniden açın.

Mesaj yanlış ve korkutucu: durumun çoğu kurtarılabilir bir çakışmadır ve uygulama zaten
birleştirmeyi yapar. Daha kötüsü, mesajın arkasında **gerçek bir veri kaybı** var: peş peşe yapılan
silmeler birleştirmede kaybolup kayıt geri geliyor, kullanıcı tekrar siliyor, döngü sürüyor.

Takım Yöneticisi'nin istediği çözüm: **kayıt bitene kadar uygulamanın üstüne yarı saydam beyaz bir
perde insin, Altuntaş logosu ve "Kaydediliyor" yazsın, kullanıcı o sırada işlem yapamasın.**

Teşhiste perdenin tek başına yetmediği görüldü (aşağıda Context): perde kullanıcının kendi
işlemlerini sıraya alır ama hatanın üç sebebinin ikisine hiç dokunmaz. Bu yüzden spec dört parçalı:
**(A)** mesajlar ayrılır, **(B)** sürüm yoklaması kendi yazımımızı dış değişiklik saymaz,
**(C)** silme birleştirmede korunur, **(D)** kayıt perdesi, **(E)** birleştirmeye hiç girmeyen sekiz
bölüm listeye alınır (bayiler ve notlar dahil: bugün oralarda yeni eklenen kayıt da kayboluyor).

Başarı şu demek: peş peşe on gider kalemi silindiğinde hiçbiri geri gelmiyor, hiçbir yanlış hata
mesajı çıkmıyor, ve kullanıcı her kaydın bittiğini görüyor.

---

## Requirements

### A. Mesajlar ayrılır (başarısızlığın nedeni taşınır)

- **R1.** Kayıt başarısızlığının **nedeni** istemciden arayüze taşınır. `crm:save` artık yalnız
  `true/false` değil `{ ok, sebep }` döndürür; nedenler: **çakışma / oturum / yetki / sınır (429) /
  sunucu hatası / bağlantı / yerel yazma hatası**. **Zincirin üç halkası birlikte değişir** (B-1),
  biri atlanırsa hata yolu tamamen ölür: `kayitSirasi.js:20`'de `ok = await save(veri)` yerine
  `const r = await save(veri)`, `:21`'in koşulu `r.ok`, `:26`'nın dönüşü
  `{ ok: r.ok, sebep: r.sebep, veri }`, `catch` dalı (`:20`) `{ ok: false, sebep: "yerel" }`; App'in
  `const { ok, veri } = await kaydetSirali(...)` satırı (`App.jsx:1156`) `sebep`'i de alır. Nesne
  döndürüp bu satırlara dokunmamak `ok`'u her zaman doğru yapar ve **başarısızlık dalını hiç
  çalıştırmaz** (`failedSaveRef` dolmaz, mesaj çıkmaz, kayıt sessizce kaybolur). `flushSave` ayrı bir
  IPC'dir (`App.jsx:1191`) ve dokunulmaz.
- **R2.** **Çakışmada "kaydedilemedi" denmez.** Bugün aynı olayda iki çelişen mesaj çıkıyor:
  `onConflict`'in "Veri çakışması tespit edildi. Birleştiriliyor..." uyarısı ve kayıt etkisinin
  "Değişiklikler kaydedilemedi! Uygulamayı kapatıp yeniden açın." hatası. Çakışmada **tek** mesaj
  kalır, bilgi tonunda ve **sonucu söyleyerek** ("başka bir kullanıcı veriyi değiştirdi,
  değişiklikleriniz birleştirildi"). **Mesajın tek sahibi `onConflict`'tir** (Ö-19): birleştirmeyi o
  yapıyor, bu yüzden kaydın 409 nedeni **mesaj üretmez**, yalnız kayıt durumu ve `failedSaveRef` için
  kullanılır. Kural iki modda da çalışır: yerel modda bile `crm:save` 409'da
  `broadcast("server:conflict")` yapıyor (`electron/ipc/data.cjs:723`). İki yerden tek mesaj çıkarmanın
  yolu "hangisi sahip" kararıdır; bastırma penceresiyle çözmek yarış koşulu bırakır.
- **R3.** **Oturum düştüğünde (401)** yalnız oturum mesajı gösterilir; kullanıcı giriş ekranına
  gidiyorken ayrıca "kaydedilemedi" denmez.
- **R4.** **Yetki hatası (403)** kendi mesajını alır ("bu veriyi değiştirme yetkiniz yok"), çünkü bu
  kullanıcı davranışıyla düzeltilemez ve uygulamayı kapatmak işe yaramaz.
- **R5.** **"Uygulamayı kapatıp yeniden açın"** yalnız gerçekten kurtarılamayan durumda söylenir
  (yerel veritabanına yazma hatası gibi).
- **R6.** **429 (yazma sınırı) ve geçici sunucu hataları otomatik yeniden denenir**: en çok **üç**
  deneme, bekleme **1 sn / 4 sn / 10 sn** (Ö-9); kullanıcıya "kısa süre sonra yeniden denenecek" denir.
  Deneme **kayıt zincirine** girer (`kayitSirasi`), yani sürüm gönderim anında okunur ve araya giren
  yeni gövde sırayı bozmaz; deneme sırasında daha yeni bir gövde oluştuysa **eski gövde düşer** ve yeni
  gövde gönderilir (`pendingSave` deseni). Gerekçe: bugün başarısız kayıt `failedSaveRef`'e konuyor ama
  **yalnız sunucu çevrimdışından çevrimiçine dönerken** yeniden deniyor; 429'da sunucu çevrimiçi olduğu
  için **kayıt hiç yeniden denenmiyor ve sessizce kayboluyor.** **Mevcut yeniden deneme yolu da
  düzeltilir** (B-2): `App.jsx:433`'teki `window.crmStorage.save(retry)` `await` edilmiyor, sonucu
  denetlenmiyor ve hemen ardından "değişiklikler kaydedildi" bildirimi basılıyor; kayıt yine başarısız
  olsa da kullanıcı "kaydedildi" görüyor. O yol da nedenli sonucu okur, başarısızlıkta `failedSaveRef`
  geri doldurulur ve mesaj "kaydedildi" demez.
- **R7.** Mesaj tekrarını önleyen bugünkü 20 saniyelik pencere korunur ama **neden başına** çalışır
  (çakışma uyarısı, bağlantı hatasını bastırmaz).

### B. Sürüm yoklaması kendi yazımımızı dış değişiklik saymaz

- **R8.** Kayıt **beklemede** (debounce sayacı kurulu) ya da **yolda** olduğu sürece hiçbir yoklama
  veri yenilemesi yapmaz. Yoklamanın diğer işleri (izin ve rol güncellemesi, çevrimiçi/çevrimdışı
  tespiti, oturum denetimi) aynen çalışmaya devam eder. **Atlama `pendingSave` ve `saveTimer`'a
  dokunmaz** (Ö-7): bugün iki yoklama da veri yenilemeden önce `clearTimeout(saveTimer.current)` yapıp
  `pendingSave`'i nulluyor ve gövdeyi `mergeLocalIntoReloaded`'a devrediyor (`App.jsx:388-390`,
  `:446-450`). Atlanan turda bu üç satır da atlanır, yani kayıt kendi akışını tamamlar ve birleştirme
  yalnız gerçek 409'da (push ya da kaydın nedenli dönüşü) çalışır. Yalnız `loadFromStorage` atlanırsa
  bekleyen kayıt silinmeye devam eder.
- **R9.** Aynı kural **iki yoklamaya** da uygulanır: istemci PC yoklaması (bugün 10 saniye) ve sunucu
  PC yoklaması (5 saniye). **Revizyon 2 (S7):** sunucu PC'deki `onDataChanged` itmesi de (`App.jsx:332-337`)
  aynı kapıdan geçer; kapı kapalıysa o tur atlanır ve değişikliği sunucu PC yoklaması bir sonraki turda alır.
- **R10.** İstemci yoklamasına eksik olan **`suppressSaveRef` denetimi** eklenir (sunucu PC
  yoklamasında var, istemcide yok; açılış yüklemesinin 700 ms'lik bastırma penceresinde bile veri
  yenilemesi yapabiliyor).
- **R11.** Veri yenilemesi, **kayıt zinciri boşalana kadar artı 500 ms** yapılmaz (Ö-8). Ölçüt sürüm
  eşitlenmesi **değildir** (`kayitSirasi.js:24` başarılı kayıttan sonra `getVersion()` ile `versionRef`'i
  zaten eşitliyor), **zincirin boşluğudur**: zincirde sıradaki bir kayıt varsa pencere uzar. Tek kapı
  (R13) bu durumu da okur.
- **R12.** Atlanan yoklama bir sonraki turda normal çalışır; dışarıdan gelen gerçek bir değişiklik en
  çok bir tur gecikir ve kaybolmaz. Tur süreleri farklıdır (K-22): istemci PC **10 saniye**
  (`App.jsx:455`), sunucu PC **5 saniye** (`:393`).
- **R13.** "Şimdi veri yenilenebilir mi" kararı **tek yerden** okunur; iki yoklama aynı kapıyı
  çağırır, kendi koşulunu yazmaz (kaynak taraması).

### C. Silme birleştirmede korunur

- **R14.** Birleştirmede **`deletedAt` alanında yerel değer kazanır**, iki yönde: benim silmem de,
  benim çöpten geri almam da sunucu kopyasına yenilmez. Yalnız bu alan için geçerlidir; diğer
  alanlarda bugünkü davranış (sunucu kopyası kazanır) sürer. **Revizyon 2 (S2):** "yerel değer" **bu PC'nin
  değiştirdiği** değerdir: App son yükleme ve son başarılı kayıt anında bölüm başına `id → deletedAt` tabanı tutar
  (0065'in `bilinenLogRef` deseni) ve yerel değer ancak **tabandan farklıysa** kazanır; tabanda olmayan kayıtta sunucu
  kopyası kalır. Tabansız kural başka PC'nin her silmesini ilk birleştirmede diriltirdi.
- **R15.** Kural **saf olarak `merge.js`'te** durur ve uygulaması `mergeLocalIntoReloaded`'da olur;
  ekranlar ve bileşenler bu kuralı bilmez. **Mevcut `apply` yolu kullanılamaz** (B-4):
  `apply(setter, key)` (`App.jsx:231-239`) yalnız `adds[key]`'i **ekliyor**, oysa `deletedAt` kuralı var
  olan kayıtları **değiştirmek** demek. Plan `silmeler` adlı ikinci bir çıktı verir
  (`{ bölüm → Map(id → deletedAt | null) }`) ve App'te **ayrı bir uygulama geçişi** olur:
  `setter(prev => prev.map(x => map.has(x.id) ? { ...x, deletedAt: map.get(x.id) } : x))`. `apply`
  değişmez. Uygulama yolu yazılmazsa geliştirici silinmiş kaydı `adds`'e koyar ve kayıt listeye iki kez
  girer.
- **R16.** Kapsam: `MERGE_KEYS`'te olup çöp kutusuna giren (yani `deletedAt` taşıyan) bölümler.
- **R17.** **Kaskad silmeler bütün olarak korunur:** müşteri ve bayi kaskadları tek bir ortak
  `deletedAt` damgası paylaşıyor; kural kayıt bazında çalıştığı için kaskadın bütün çocukları
  (servisler, tahsilatlar, kalıp satışları, görüşmeler, dosyalar) birlikte korunur.
- **R18.** Bilinen sınır, yazılır: aynı kaydı bir kullanıcı silip diğeri çöpten geri aldıysa
  **yerel olan kazanır**, yani iki kullanıcı birbirinin kararını geri alabilir. Bu, uygulamanın
  bugünkü "yerel değişiklik kazanır" felsefesiyle tutarlıdır.

### D. Kayıt perdesi

- **R19.** Kayıt durumu üç değerlidir: **boş / bekliyor / yolda** ve **App'te bir state'tir**
  (`kayitDurumu`, Ö-13): "bekliyor" `saveTimer` kurulduğunda, "yolda" `kaydetSirali` çağrısından hemen
  önce, "boş" sonuç döndükten sonra yazılır; kayıt durumu `kayitSirasi.js`'te tutulmaz (C5) ve perde yalnız bu state'i
  okur (C4). **Revizyon 2 (S4):** perde, durum **"yolda"** iken ve "yolda" başlangıcından **600 ms** geçtiyse görünür;
  "bekliyor" perdeyi açmaz. Zincirde birden çok kayıt varsa yoldaki kayıt sayacı sıfıra inene kadar perde kalır.
  Gerekçe: "bekliyor"dan ölçülürse LAN'da (500 ms debounce + 200 ms kayıt) perde her kayıtta flaş yapar (AC-25
  bozulur) ve peş peşe tıklayan kullanıcı debounce sıfırlandıkça perdenin arkasında kilitlenir.
- **R20.** Perde tam ekrandır, **yarı saydam** zemin, ortada **Altuntaş logosu** ve "Kaydediliyor"
  metni; bütün tıklama ve klavye olaylarını yakalar ve **`zIndex: 2000`** ile çizilir (B-5). Bugünkü
  yığın: `Modal` arka planı 1000 (`ui.jsx:405`), `ConfirmDialog` 1100 (`:442`), genel arama paleti 1200
  (`GlobalSearch.jsx:166`), bir açılır liste 1300 (`ui.jsx:313`); 2000 hepsinin açık ara üstünde ve
  araya yeni katman girse de güvenli. "Üstünde" demek yetmez, 1300'lük açılır liste perdenin üstünde
  kalırsa blokaj delinir. Logo **App'in mevcut içe aktarmasından** gelir
  (`App.jsx:3`, `import LOGO from "./assets/logo.avif?inline"`); ikinci bir gömme yapılmaz (K-21).
- **R21.** Zemin rengi **tema değişkeninden** gelir: aydınlık temada yarı saydam beyaz, karanlık temada
  yarı saydam koyu. **Yeni bir token açılır** (B-6): `theme.js` `TOKENS`'ta tam ekran perde için ad yok
  (`surface` `:28` ve `overlayW` `:30` var ama ikisi de başka iş yapıyor) ve 0030 kuralı kaynaktaki her
  statik `var(--ad)`'ın `TOKENS`'ta tanımlı olmasını şart koşuyor (`tests/tema-degisken.test.js`). Ad
  `perdeBg`, iki değeri `TOKENS`'a girer ve `tasarim-kontrast`'ın ilgili bloğuna eklenir. 0030'un
  "aydınlık değeri bugünkü sabit renk olur" kuralı burada **uygulanamaz** (bileşen yeni, bugünkü rengi
  yok) ve bu yazılıdır. Token açılmazsa `var(--perdeBg, #fff)` yedeğe düşer, karanlık temada perde beyaz
  çıkar ve tema testi kırılır.
- **R22.** **Gecikme neden 600 ms:** LAN'da kayıt çoğu zaman 200 ms'de biter; gecikmesiz perde her
  işlemde beyaz bir flaş olarak görünür ve uygulamayı bozuk gösterir. Eşik **debounce'tan büyük
  olmalıdır** (Ö-14): debounce 500 ms, yani 250 ms'lik bir eşikte perde her kayıtta çıkar ve R24'ün
  "perde açıkken debounce beklenmez" koşulu hiç gerçekleşmez. 600 ms = debounce artı bir tur gidiş
  dönüş; hızlı kayıtta perde hiç çıkmaz, yavaş kayıtta çıkar.
- **R23.** **Kaçış yolu:** perde en çok 10 saniye durur. Süre aşılırsa perde kapanır, A'nın nedenli
  mesajı gösterilir ve kullanıcı çalışmaya devam eder; kayıt arka planda kendi akışını sürdürür
  (yeniden deneme, çakışma birleştirmesi). Ağ koptuğunda kullanıcı beyaz perdenin arkasında kilitli
  kalmaz. **Kaçıştan sonra sessiz kalınmaz** (Ö-15): kayıt başarılı olursa kısa bir bilgi bildirimi
  ("değişiklikler kaydedildi") çıkar, başarısız olursa A'nın nedenli mesajı; aynı kayıt için perde
  ikinci kez açılmaz. Aksi hâlde kullanıcı perdeyi hata sanıp aynı işlemi tekrar yapar ve çift kayıt
  üretir.
- **R24.** **Debounce her hâlde 500 ms kalır** ve perdenin varlığına bağlanmaz (Ö-14). Eski kural
  ("perde açıkken debounce beklenmez") geri alındı: perde 600 ms gecikmeyle çıktığı için (R22) debounce
  o ana kadar zaten dolmuş olur, yani kural ölüydü. Debounce'u kaldırıp yazma sınırını yükseltmek
  (alternatif) reddedildi: yazma sayısını kat kat artırır, 429 riskini ve sunucu yükünü büyütür.
- **R25.** Perde **görünmez**: açılış yüklemesinde (zaten açılış ekranı var), yüklemeden sonraki
  700 ms'lik bastırma penceresinde, salt okunur / çevrimdışı modda (hiç kayıt yapılmıyor) ve kayıt
  tetiklemeyen değişikliklerde. Ölçütler koda bağlı (Ö-16): `serverOnline === false`,
  `suppressSaveRef.current` ve `loaded` yanlış; üçü de C2'nin tek kapısından okunur (`flushSave`'in
  bugünkü `serverOnlineRef.current === false` kapısı emsal, `App.jsx:1187`). Ölçüt adı yazılmazsa koşul
  birkaç yerde ayrı yazılır ve C2 bozulur.
- **R26.** Kayıt başarısız olursa perde kapanır ve A'nın mesajı çıkar; perde "başarılı" izlenimi
  bırakarak kapanmaz.
- **R27.** Erişilebilirlik: perde `role="status"` ve `aria-busy` taşır, metin Türkçedir.
- **R28.** **Yazma sınırı ölçüme bağlıdır, önkoşul değildir** (Ö-14): R24 geri alındığı ve debounce
  durduğu için perde yazma sayısını artırmıyor, yani `/api/data`'nın kullanıcı başına **60/dakika**
  sınırı olduğu gibi kalabilir. Yoğun girişte 429 **ölçülürse** sınır **120/dakika**'ya çıkarılır; 240
  gerekmez. Değişirse yalnız `/api/data` değişir: genel `/api` sınırı **600/dakika kalır** ama
  `server.cjs:305-310`'daki yorum düzeltilir (yoklama 30 saniye değil **10 saniye**; aynı hatanın
  `CLAUDE.md`'deki kopyası Context'te yazılı). `scripts/tests/server-security.cjs`'in bugünkü 429
  kontrolü (601 istek) **genel** sınırı ölçüyor; `/api/data`'nın sınırı **ayrı** bir kontrolle ölçülür
  (Ö-10), ikisi karıştırılırsa test yanlış sınırı doğrular.
- **R29.** Bilinen sınır, yazılır: **Servis Panosu ayrı penceresinde perde görünmez.** O pencerenin
  yazımları köprüyle ana pencereye gidiyor ve kayıt ana pencerede yapılıyor; perdeyi pop-out'a da
  taşımak köprüye yeni bir bayrak eklemek demek, ayrı iştir.

### E. Birleştirmeye hiç girmeyen bölümler listeye alınır

- **R30.** Bugün `MERGE_KEYS`'te **olmayan** şu **yedi** bölüm listeye alınır: **bayiler, notlar,
  makina stoğu, parça tanımları, kalıp tanımları, parça türleri, özel makina modelleri.** Bugün bu
  bölümlerde çakışma anında **ne ekleme ne silme** korunuyor: yeni eklenen bir bayi ya da not sessizce
  kayboluyor. Listeye alınınca hem eklemeleri korunur hem de C maddesinin `deletedAt` kuralı onları
  kendiliğinden kapsar. Üç şart yazılı:
  - **`standardModels` listeye ALINMAZ** (B-3, X7): soft-delete taşımıyor (`App.jsx:662` onu ham
    kullanıyor, `liveStandardModels` yok, `TABLES_WITH_TRASH` içinde değil) ve tek mutasyonu
    **düzenleme** (`ModelsManager.jsx:68` `setStandardModels(p => p.map(...))`, yeniden adlandırma).
    Ekleme yok, C'nin kuralı uygulanamaz, düzenleme X2 kapsamında; kazancı sıfır, riski gerçek.
  - **`apply` satırı şart** (Ö-17): her yeni bölüm için `mergeLocalIntoReloaded`'a bir
    `apply(setX, "x")` satırı (yedi satır) ve B-4'ün `deletedAt` geçişinin karşılığı. 0065'in dersi:
    `MERGE_KEYS`'e eklenip `apply` satırı yazılmayan bölüm sessizce hiçbir şey yapmaz (`calisanlar` tam
    böyle kaybolmuştu).
  - **Özel makina modellerinin kimliği adıdır** (revizyon 2, S3): `custom_models` tablosunun anahtarı `model`; kayıtta
    `id` yok. Birleştirme bölüm başına kimlik alanı tanır (`customModels` → `model`); yeniden kimliklendirme yoktur, aynı
    ad aynı modeldir.
  - **Saklama biçimi fark etmez** (Ö-20): `kalipDefs` normalize tablo (`kalip_defs`,
    `TABLES_WITH_TRASH` içinde), `partTypeDefs` meta JSON; ikisi de blob'da dizidir ve ikisinin de
    `deletedAt` taşıdığı doğrulanmıştır (`liveKalipDefs` ve `livePartTypeDefs`, `App.jsx:778-779`), yani
    C kuralı ikisini de kapsar.
- **R31.** Kimlik yeniden atandığında taşınacak referanslar (her biri bugünkü bölümlerin remap
  deseniyle):
  - **bayi** → `teklifler.dealerId`, `dosyalar.dealerId`, `yedekParcaSatislar.dealerId`.
    `partSales.satisFirma` ve `services.islemFirma` **ad** taşır, kimlik değil; onlara dokunulmaz.
  - **makina stoğu** → `customers.sourceStockId` ve `partStockLog.referansId`'nin `makina_uretimi`
    tipli satırları.
  - **parça** → `partStock.partId`, `partStockLog.partId`, `yedekParcaSatislar.partId` ve
    `services.degisenParcalar[].partId`. Son maddenin deseni farklıdır (Ö-11): kimlik bir **JSON alt
    dizisinde** duruyor, bu yüzden remap `adds.services`'in mevcut map zincirine (`merge.js:79`) bir
    alan daha ekler (`degisenParcalar` dizisini map'leyerek). Alt dizi remap'inin tek emsali
    `dosyalar`'ın `refType`'a göre remap'i (`:86`); yazılmazsa geliştirici üst düzey bir alan arar ve
    bulamaz.
  - **kalıp tanımı, parça türü, özel makina modelleri, notlar** → hiçbir kayıt bunların kimliğini
    taşımaz (model ve kalıp bağı **adla** kurulur), yalnız listeye eklenmeleri yeterlidir.
- **R32.** **Parça kimliği yeniden atanırsa o parçanın stok satırı (`partStock`) da eklenir** ve
  mekanizma yazılı (Ö-12): `partStock` `MERGE_KEYS`'e **girmez** (R34, 0065 kararı); bunun yerine plan
  `adds.parts`'ta yeniden kimliklendirilmiş parça varsa o parçanın yerel `partStock` satırını **ayrı
  bir plan çıktısı** olarak verir ve App onu `setPartStock`'a ekler (0065'in `stokEtkisi` çıktısının
  emsali); miktar yerel satırdan gelir. **Revizyon 2 (S9):** stok hareketinin `partId` remap'i `stokEtkisi`'nden
  **önce** yapılır, yani hareketi olan yeniden kimliklendirilmiş parçanın adedi mevcut yoldan (0 + hareket etkisi)
  doğar; ayrı çıktı yalnız **hiç hareketi olmayan** parçanın satırını taşır (iki yol birden adedi iki katına
  çıkarırdı). `MERGE_KEYS`'e eklemek 0065 kararını bozar. Gerekçe: yeniden
  kimliklendirilen parçanın hareketleri karşılığı olmayan bir kimliğe düşerse adet hiçbir ekranda
  görünmez.
- **R33.** `factory` (firma bilgileri) bir liste değil **tekil kayıttır**; bu bilgisayardaki yerel değişiklik
  yeniden yüklenen kopyanın üstüne uygulanır. **Revizyon 2 (S8):** "yerel değişiklik" R14'ün tabanıyla ölçülür:
  yerel firma bilgisi yalnız bu PC'de değiştiyse (taban kopyasından farklıysa) sunucunun üstüne yazılır; körlemesine
  yazmak başka PC'nin firma değişikliğini bu PC'nin eski kopyasıyla ezerdi.
- **R34.** `partStock` (parça adedi) birleştirmeye **girmez**; bu 0065'in bilinçli kararıdır ve
  değişmez (R32 onun yan koşuludur, kuralı değil).
- **R35.** **Bayilerin birleştirilmemesi bilinçli bir karardı ve bu spec onu geri alır.**
  `CLAUDE.md`'deki "`dealerId` remap edilmez (bayiler birleştirilmez)" notu güncellenir.
  **Aynı yolla iki eski karar daha geri alınır (triyaj, TY bilgisine):** 0065 X5 (makina stoğu birleşmez,
  `stok-hareketi.test.js` AC-17) ve 0064 AC-23/AC-36 (katalog listeleri `customModels`, `kalipDefs`, `parts`,
  `partTypeDefs` birleşmez, `kilit-alanlari.test.js`). İki test "spec 0077 R30 ile geri alındı" notuyla
  güncellenir. 0065 X5'in gerekçesi (satılan makinanın stok satırı diziden çıkarılır, iki blobla "yerelde var,
  sunucuda yok" ekleme sanılır) R35a ile karşılanır.
- **R35a (triyaj).** Kimliği **tabanda olan** ama sunucuda **olmayan** kayıt eklenmez: sunucu (başka PC) onu
  diziden çıkarmıştır (satılan makinanın stok satırı, boşaltılan çöp, 30 günlük temizlik). Kural tabanın kurulduğu
  bütün bölümlerde (`SILME_KORUNAN`) geçerlidir; 0065'in `bilinenLogIdleri` deseninin genellemesidir. Kalıcı
  silinen bölümler (X1) tabansız kalır. Tabansız çağrıda davranış eskisi gibidir.
- **R36.** Yeni bölümlerin eklenmesi bugünkü bölümlerin davranışını değiştirmez (çapraz test).

### F. Uygulama planı kararları (revizyon 2)

- **R37 (S1).** Dal `feat/0077-kayit`, `feat/0075-tevkifat` (`5b118af`) üstünde.
- **R38 (S5).** `kayitSirasi.js` yalnız R1'in dönüş şeklini alır; kayıt durumu ve yeniden deneme onda tutulmaz.
- **R39 (S6).** Yeniden deneme App'in kayıt geri çağırımında `kaydetSirali` ile yapılır (zincirden, gönderim anı
  sürümüyle). Beklerken yeni gövde oluştuysa (`pendingSave` dolu ya da sayaç kurulu) eski gövde düşer. Deneme süresince
  durum "yolda" sayılır; perde 10 sn sonra kaçar ve "kısa süre sonra yeniden denenecek" yazar.
- **R40 (S10).** `/api/data` sınırı **60/dakika kalır** (debounce değişmedi, perde yazma sayısını artırmıyor, R6 429'u
  kurtarıyor); `server-security.cjs`'e ayrı bir kullanıcıyla "61. yazım 429, genel `/api` sınırı etkilenmedi" kontrolü
  eklenir ve genel sınır kontrolünden önce koşar.
- **R41 (S11).** Bağlantı hatasında bugünkü akış kalır: salt okunur mod, gövde `failedSaveRef`'te, çevrimiçine dönüşte
  düzeltilmiş yolla yeniden deneme; otomatik deneme yalnız 429 ve sunucu hatasında.
- **R42 (S12).** Mesaj metinleri tek tablodadır (`src/lib/kayitDurumu.js` `KAYIT_MESAJLARI`).
- **R43 (S13).** Bilinen sınırlar: notların kimliği `Date.now()`, parça türlerininki metin, bu oturumda üretilmiş
  sayılmadıkları için kimlik çakışmasında yerel kayıt düşer (çok düşük olasılık); başka PC'nin kalıcı silmesi (çöpü
  boşaltma) yeni bölümlerde de bugünkü bölümlerdeki gibi geri eklenebilir (X1).
- **R44 (S14).** Görsel kanıt tek ekran (perde bir pencerenin üstünde), iki tema; mevcut ekranlar 0 piksel.
- **R45 (S4, S7).** Veri yenileme kapısı ve perde kararı saf `src/lib/kayitDurumu.js`'tedir (C2).

---

## Constraints

- **C1.** Yeni **veri bölümü** (blob anahtarı, tablo, sütun), yeni kalıcı alan, yeni izin ve veri göçü
  yoktur (K-24). E maddesinin `MERGE_KEYS`'e eklediği yedi bölüm **zaten var olan** bölümlerdir; yeni
  olan tek şey tema token'ıdır (R21) ve o bir veri alanı değildir.
- **C2.** **Tek kapı:** başarısızlık nedeni, "veri yenilenebilir mi" kararı ve kayıt durumu birer
  yerden okunur; ekranlara koşul dağıtılmaz.
- **C3.** Yerel modda (tek PC) da çalışır: çakışma orada zaten oluşmuyor ama A, B ve D aynı yoldan
  geçer ve davranış tutarlı olur.
- **C4.** Perde yalnız gösterim ve blokajdır; veri yazmaz, kayıt sırasını değiştirmez.
- **C5.** Kayıt sırası (`kayitSirasi.js`) ve çakışma birleştirmesinin bugünkü yapısı korunur; bu spec
  onları değiştirmez, üstüne koşul ekler.
- **C6.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** **Kalıcı silinen bölümlerde silmenin birleştirmede korunması** (`hesapHareketleri` yani
  ödeme ve virman silme, `giderTanimlari`, `giderTurleri`, `standartGiderler`, `kasaHesaplari`,
  `cekler`, `kasaKapsamDisi`) — *neden:* bu bölümlerde kayıt diziden çıkarıldığı için "benim
  sildiğim" ile "başkasının eklediği" ayrımı iki blob'a bakarak yapılamaz; 0065'in
  `bilinenLogIdleri` taban kümesinin bütün bölümlere genellenmesi gerekir ve o kendi başına bir
  spec'tir. **C ve E birlikte, çöp kutusuna giren bütün bölümleri kapsar;** dışarıda kalan yalnız bu
  yedi bölümdür.
- **X2.** **Alan düzeyinde genel birleştirme** (üç yollu merge): bugün `deletedAt` dışındaki her
  düzenleme sunucu kopyasına yeniliyor — *neden:* taban sürümün tutulmasını ve her bölüm için alan
  bazlı çakışma kuralını gerektirir; çok büyük bir iş.
- **X3.** **Bölüm bazlı kayıt** (bütün blob'u değil yalnız değişen bölümü göndermek) — *neden:* asıl
  mimari çözüm bu ve çakışmaları kökünden azaltır, ama sunucu, istemci, yetki denetimi ve işlem
  geçmişi birlikte değişir; ayrı ve en büyük iş.
- **X4.** Servis Panosu ayrı penceresine perde (R29).
- **X5.** Eşzamanlı düzenlemeyi çakışmadan mümkün kılacak kayıt kilidi genişletmesi — *neden:* kilit
  yumuşak koruma, asıl koruma sürüm numarası (0064'te yazılı).
- **X6.** Çevrimdışı düzenleme kuyruğu — *neden:* bugün salt okunur moda düşülüyor ve bu bilinçli.
- **X7.** **`standardModels`'in birleştirmeye alınması** — *neden:* R30; soft-delete taşımıyor, tek
  mutasyonu düzenleme ve düzenleme X2 kapsamında. Seed listesinde iki tarafın kimlikleri aynı olduğu
  için merge'e sokmak kazanç vermez, her çakışmada gereksiz karşılaştırma yapar ve ileride yeniden
  kimliklendirme riski açar.

---

## Context

- **Teşhis, üç mekanizma.**
  1. **Çakışma hata gibi gösteriliyor.** `App.jsx:1169` 409'da da tetikleniyor ve "uygulamayı
     kapatıp yeniden açın" diyor. Aynı anda `App.jsx:316` `onConflict` "birleştiriliyor" diyor. Aynı
     mesaj 401, 403, 429, 5xx ve ağ kopmasında da çıkıyor, çünkü `crm:save` hepsinde `false`
     döndürüyor ve neden taşınmıyor (`electron/ipc/data.cjs:686`).
  2. **Yoklama kendi yazımımızı dış değişiklik sanıyor.** İstemci yoklaması (`App.jsx:414`, 10
     saniye) sunucu sürümü yerel referanstan farklıysa bekleyen kaydı iptal ediyor, `pendingSave`'i
     boşaltıyor ve her şeyi yeniden yüklüyor. **Kayıt yolda mı diye bakan denetim yok**, üstelik
     `suppressSaveRef` de okunmuyor (sunucu PC yoklamasında, `App.jsx:382`, okunuyor). Bizim kaydımız
     sunucuda sürümü artırıp cevabı henüz dönmemişken yoklama araya girerse, yerel durum sunucudan
     geri yüklenir.
  3. **Birleştirme yalnız eklemeleri taşıyor.** `merge.js` planı yalnız `adds` üretiyor;
     `mergeLocalIntoReloaded` (`App.jsx:220`) yalnız onları yeniden uyguluyor. TY'nin saydığı iki
     silme de **soft-delete**, yani mevcut kayda `deletedAt` yazan bir **düzenleme**
     (`Documents.jsx:652`, `Documents.jsx:355`; `giderler` soft-delete). Düzenlemeler sunucu
     kopyasına yenildiği için **silinen kayıt geri geliyor.** "Sürekli hata veriyor" hissinin asıl
     kaynağı bu.
- **Perde neyi çözer, neyi çözmez.** Çözer: kullanıcının "oldu mu olmadı mı" belirsizliği ve aynı
  kaydı iki kez silmeye çalışması. Çözmez: yoklamanın kendi yazımımıza tepki vermesi (yoklama
  kullanıcıdan bağımsız çalışıyor), silmelerin birleştirmede kaybolması, başka bir istemci aynı anda
  yazarken çıkan 409, ve mesajın kendisi. Bu yüzden perde tek madde olarak yapılırsa şikâyet
  sürer; A ve B en küçük değişiklikle en büyük faydayı verir.
- **Perdenin ters etkisi ölçüldü ve karşılığı yazıldı.** Bugün 500 ms'lik debounce peş peşe yapılan
  silmeleri bir iki kayda indiriyor. Perde her işlemde beklettiği için işlem başına bir kayıt olur,
  yani yazma sayısı artar. Bu yüzden R28 yazma sınırının yükseltilmesini perdenin **önkoşulu**
  yapıyor; aksi hâlde perde 429 üretir ve R6 olmadan o kayıtlar sessizce kaybolur.
- **429'un yeniden denenmemesi bu işte bulundu.** Başarısız kayıt `failedSaveRef`'e konuyor ama
  yeniden deneme yalnız `serverOnline` yanlıştan doğruya dönerken çalışıyor (`App.jsx:414`
  bloğunda). 429'da sunucu çevrimiçi olduğu için bu dal hiç çalışmıyor: kayıt kaybolur ve kullanıcı
  yalnız bir mesaj görür. R6 bunu kapatıyor.
- **Neden `deletedAt` için "yerel kazanır".** Uygulamanın bugünkü felsefesi bu: `MERGE_KEYS`
  eklemeleri yerelden korunuyor, `mergeAppSettings` yerel ayarı sunucunun üstüne yazıyor. `deletedAt`
  için aynı kuralı uygulamak hem tutarlı hem de küçük: tek alan, iki yön, bölüm listesi hazır
  (çöp kutusuna giren bölümler). Alan düzeyinde genel bir birleştirme (X2) ise bambaşka bir iş.
- **Belge düzeltmesi.** `CLAUDE.md` istemci yoklamasını "30 saniye" diye yazıyor; kodda **10
  saniye** (`App.jsx:414`). Bu iş sırasında düzeltilecek.
- **Sıra önerisi.** A ve B birlikte çok küçük (neden taşıma, birkaç koşul) ve davranış değişikliği
  getirmiyor; şikâyetin büyük kısmını onlar kesiyor. C orta boy ve net. D en son, çünkü önkoşulu
  (R28) var ve faydası A, B, C yapıldıktan sonra görünür hâle geliyor. Tek bir ekran değişikliği
  istenirse önce A, tek bir veri düzeltmesi istenirse önce C.

---

## Acceptance Criteria

### A. Mesajlar

- **AC-1.** Çakışmada tek mesaj gösterilir, bilgi tonunda ve sonucu söyleyerek; "kaydedilemedi" ve
  "uygulamayı kapatıp yeniden açın" ifadeleri geçmez.
- **AC-2.** Oturum düştüğünde yalnız oturum mesajı çıkar; ikinci bir kayıt hatası mesajı çıkmaz.
- **AC-3.** Yetki hatasında (403) yetki mesajı çıkar, uygulamayı kapatma önerisi çıkmaz.
- **AC-4.** Bağlantı hatasında bağlantı mesajı, sunucu hatasında sunucu mesajı çıkar.
- **AC-5.** "Uygulamayı kapatıp yeniden açın" yalnız kurtarılamaz yerel yazma hatasında çıkar.
- **AC-6.** 429 alındığında kayıt artan beklemeyle yeniden denenir ve sonunda başarılı olur; kayıt
  kaybolmaz.
- **AC-7.** Yeniden denemeler tükenirse nedenli hata gösterilir ve son gövde korunur.
- **AC-8.** Mesaj bastırma penceresi neden başına çalışır: çakışma uyarısı bağlantı hatasını
  bastırmaz.
- **AC-9.** `crm:save` `{ ok, sebep }` döndürür ve arayüz nedene göre dallanır (kaynak taraması: tek
  mesaj sabitine düşen `ok === false` dalı kalmaz).
- **AC-51.** `kayitSirasi` nedeni taşır: başarısız kayıtta `ok` yanlıştır ve `sebep` doludur; nesne
  dönüşü başarısızlık dalını atlamaz (`kayit-sirasi.test.js` bloğu).
- **AC-52.** Çevrimiçine dönüşte yeniden denenen kayıt başarısız olursa "kaydedildi" bildirimi
  **çıkmaz** ve `failedSaveRef` yeniden dolar.
- **AC-53.** Yeniden deneme en çok üçtür ve beklemeler 1, 4, 10 saniyedir; deneme sırasında yeni bir
  gövde oluşursa eski gövde düşer.

### B. Yoklama

- **AC-10.** Kayıt beklemedeyken yoklama veri yenilemesi yapmaz.
- **AC-11.** Kayıt yoldayken yoklama veri yenilemesi yapmaz.
- **AC-12.** Kayıt bittikten sonraki kısa pencerede de veri yenilemesi yapılmaz.
- **AC-13.** Yoklama veri yenilemesini atlasa da izin, rol, oturum ve çevrimiçi denetimini yapmaya
  devam eder.
- **AC-14.** İstemci yoklaması `suppressSaveRef` doğruyken veri yenilemesi yapmaz.
- **AC-15.** Dışarıdan gelen gerçek bir değişiklik, kayıt bittikten sonraki ilk turda yüklenir.
- **AC-16.** Karar tek kapıdan okunur; iki yoklamada da aynı fonksiyon çağrılır (kaynak taraması).
- **AC-17.** Hızlı veri girişi senaryosu: aralıksız on işlem yapıldığında hiçbir işlem kaybolmaz ve
  hiçbir yeniden yükleme tetiklenmez.
- **AC-54.** Yoklama atlandığında `pendingSave` ve `saveTimer` **temizlenmez**: bekleyen kayıt kendi
  akışını tamamlar.
- **AC-55.** Veri yenilemesi zincir boşalana kadar artı 500 ms yapılmaz; zincirde sıradaki kayıt varsa
  pencere uzar.

### C. Silme birleştirmede korunur

- **AC-18.** Yerelde silinmiş (`deletedAt` dolu), sunucuda silinmemiş kayıt birleştirmeden sonra
  **silinmiş kalır**.
- **AC-19.** Yerelde çöpten geri alınmış (`deletedAt` boş), sunucuda silinmiş kayıt birleştirmeden
  sonra **geri alınmış kalır**.
- **AC-20.** Peş peşe silinen on gider kaleminin hiçbiri birleştirmeden sonra geri gelmez.
- **AC-21.** Peş peşe silinen evrak kayıtları (teklif, fatura) için aynı sonuç alınır.
- **AC-22.** Müşteri kaskadı silindiğinde çocuk kayıtların tamamı (servisler, tahsilatlar, kalıp
  satışları, görüşmeler, dosyalar) silinmiş kalır.
- **AC-23.** `deletedAt` dışındaki alanlarda bugünkü davranış değişmez (sunucu kopyası kazanır).
- **AC-24.** Kural `merge.js`'te saftır; bileşenlerde `deletedAt` birleştirme dalı yoktur (kaynak
  taraması).
- **AC-56.** Plan `silmeler` çıktısını verir ve App onu `adds`'ten **ayrı** bir geçişle uygular; silinen
  kayıt listeye ikinci kez eklenmez.

### D. Perde

- **AC-25.** 200 ms'de biten kayıtta perde hiç görünmez; 600 ms eşiğinin altındaki hiçbir kayıtta
  görünmez.
- **AC-26.** 1,5 saniye süren kayıtta perde görünür, logo ve "Kaydediliyor" metni vardır; logo App'in
  mevcut içe aktarmasından gelir (ikinci bir gömme yok, kaynak taraması).
- **AC-27.** Perde açıkken altındaki düğmelere tıklama ve klavye olayları geçmez.
- **AC-28.** Perde `zIndex: 2000` ile çizilir ve dört katmanın her birinin üstünde kalır: `Modal`
  (1000), `ConfirmDialog` (1100), arama paleti (1200), açılır liste (1300).
- **AC-29.** Perdenin zemin rengi `perdeBg` token'ından gelir, karanlık temada beyaz değildir ve token
  `TOKENS`'ta tanımlıdır (`tema-degisken.test.js` yeşil).
- **AC-30.** 10 saniye aşıldığında perde kapanır, nedenli hata gösterilir ve arayüz kullanılabilir
  olur.
- **AC-31.** Kayıt başarısız olduğunda perde kapanır ve A'nın mesajı çıkar.
- **AC-32.** Açılış yüklemesinde, bastırma penceresinde ve salt okunur modda perde görünmez.
- **AC-33.** Debounce 500 ms olarak kalır ve perdenin varlığına bağlı değildir (kaynak taraması:
  "perde açıkken debounce atlanır" dalı yoktur).
- **AC-34.** Perde `role="status"` ve `aria-busy` taşır.
- **AC-35.** Hızlı giriş senaryosunda `/api/data` 429 üretmez; sınır değiştirilirse yalnız `/api/data`
  değişir, genel `/api` sınırı 600/dk kalır ve iki sınır ayrı kontrollerle ölçülür.
- **AC-57.** Perde kaçıştan sonra kayıt başarılı olursa bilgi bildirimi çıkar; aynı kayıt için perde
  ikinci kez açılmaz.
- **AC-58.** Kayıt durumu App state'inden okunur; `kayitSirasi.js` yalnız R1'in dönüş şeklini almıştır, kayıt durumu
  ve yeniden deneme onda yoktur (revizyon 2, S5; kaynak taraması).

### E. Birleştirmeye alınan bölümler

- **AC-36.** Çakışma anında yeni eklenen **bayi** kaybolmaz.
- **AC-37.** Çakışma anında yeni eklenen **not** kaybolmaz.
- **AC-38.** Çakışma anında yeni eklenen **makina stoğu satırı** kaybolmaz.
- **AC-39.** Çakışma anında yeni eklenen **parça tanımı** kaybolmaz.
- **AC-40.** Çakışma anında yeni eklenen kalıp tanımı, parça türü ve **özel** makina modeli kaybolmaz.
- **AC-59.** `standardModels` `MERGE_KEYS`'te **yoktur** (kaynak taraması) ve bugünkü davranışı
  değişmemiştir.
- **AC-60.** Yeni yedi bölümün her biri için `mergeLocalIntoReloaded`'da bir `apply` satırı vardır
  (kaynak taraması).
- **AC-41.** Bayi kimliği yeniden atandığında teklifin, dosyanın ve yedek parça satışının bayi bağı
  yeni kimliğe taşınır; ad taşıyan alanlara (satış yapan firma, işlemi yapan firma) dokunulmaz.
- **AC-42.** Stok kimliği yeniden atandığında müşterinin `sourceStockId`'si ve o satırın
  `makina_uretimi` stok hareketleri yeni kimliğe taşınır.
- **AC-43.** Parça kimliği yeniden atandığında parça stoğu, stok hareketleri, yedek parça satışı ve
  servisin değişen parçaları yeni kimliğe taşınır.
- **AC-44.** Parça kimliği yeniden atandığında o parçanın stok satırı da eklenir; adet ekranda
  görünür.
- **AC-45.** Bayi ve not **silmeleri** de birleştirmeden sonra silinmiş kalır (C kuralı yeni
  bölümleri kapsar).
- **AC-46.** Firma bilgilerinde yapılan yerel değişiklik birleştirmeden sonra korunur.
- **AC-47.** `partStock` birleştirmeye girmez; adet eklenen hareketlerin etkisinden türer.
- **AC-48.** Yeni bölümler eklendikten sonra bugünkü bölümlerin birleştirme davranışı değişmez.

### Genel

- **AC-49.** Yeni kalıcı alan, izin, bölüm ve göç eklenmemiştir.
- **AC-50.** Tek kullanıcılı yerel modda kayıt davranışı bozulmaz; perde ve mesajlar aynı yoldan
  geçer.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. Dosyalar (Ö-18): `tests/merge.test.js`
      C ve E blokları (saf plan, `silmeler` çıktısı, yedi bölüm, remap zincirleri),
      `tests/ui/kayit-hatasi-0077.test.jsx` (gerçek App; nedenli mesajlar, yoklamanın susması,
      `useFakeTimers`), `tests/ui/kayit-perdesi-0077.test.jsx` (zamanlama, `zIndex`, tema, kaçış),
      `tests/kayit-sirasi.test.js`'e dönüş şekli bloğu (AC-51),
      `scripts/tests/server-security.cjs`'e `/api/data` sınırı için **ayrı** kontrol;
      `tests/tema-degisken.test.js` ve `tasarim-kontrast` yeni token ile yeşil.
- [x] **Gerçek App ile sürücülü test:** peş peşe on silme artı araya giren sunucu sürüm değişikliği
      senaryosu, hiçbir kaydın geri gelmediğini gösteriyor (AC-20, AC-21).
- [x] 409, 401, 403, 429 ve ağ hatası için ayrı ayrı mesaj testi (AC-1 … AC-4) ve çakışma mesajının tek
      sahibinin `onConflict` olduğu (AC-1).
- [x] 429'da yeniden denemenin kaydı kurtardığı, deneme sayısı ve beklemelerin sabitlendiği testlendi
      (AC-6, AC-53); çevrimiçine dönüşteki yeniden denemenin yanlış "kaydedildi" bildirimi vermediği
      (AC-52).
- [x] Yoklamanın kayıt yoldayken susmasının ve `pendingSave`'e dokunmamasının birim testi;
      `useFakeTimers` ile zamanlama sabitlendi (AC-10 … AC-12, AC-54, AC-55).
- [x] Perde zamanlaması (600 ms eşik, 10 sn kaçış) ve debounce'un değişmediği test edildi (AC-25,
      AC-26, AC-30, AC-33).
- [x] `/api/data` sınırının hızlı girişte 429 üretmediği doğrulandı; sınır değiştirilirse yeni değer
      `server-security.cjs`'te **genel sınırdan ayrı** bir kontrolle ölçüldü (AC-35).
- [x] Birleştirmeye alınan **yedi** bölümün her biri için ekleme ve silme testi var (AC-36 … AC-40,
      AC-45); remap zincirleri ayrı ayrı testlendi (AC-41 … AC-44) ve her bölümün `apply` satırı
      denetlendi (AC-60).
- [x] `standardModels`'in listeye alınmadığı ve davranışının değişmediği testle sabitlendi (AC-59).
- [x] Bugünkü bölümlerin birleştirme davranışının değişmediği `merge.test.js` ile gösterildi (AC-48).
- [x] Görsel kanıt: `docs/evidence/0077-taban-piksel-raporu.json` ve `0077-piksel-raporu.json` (K-23);
      görüntü aracına iki yeni ekran (perde aydınlık ve karanlık temada, pencere üstünde), mevcut
      ekranlar **0 piksel** beklenir. Perde `tasarim.jsx`'i kullanmazsa `kanit-eslemesi.json` kaydı
      gerekmez (0052 ve 0066 emsali), kullanırsa kayıt açılır.
- [x] `npm test` yeşil (çıktısıyla, Electron testleri dahil), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: istemci yoklaması **10 saniye** (bugün 30 yazılı, yanlış; aynı hata
      `server.cjs:305-310` yorumunda da var), yoklamanın kayıt yoldayken sustuğu ve bekleyen kayda
      dokunmadığı, `deletedAt`'in birleştirmede yerelden korunduğu, kalıcı silinen bölümlerin hâlâ
      korunmadığı (X1), kayıt perdesi ve `perdeBg` token'ı. Ayrıca **"bayiler birleştirilmez" notu
      kaldırıldı** (R35), `MERGE_KEYS`'in yeni **yedi** bölümü ile remap zincirleri yazıldı ve
      `standardModels`'in bilinçli olarak dışarıda kaldığı (X7) belirtildi.
- [x] Sürüm notu: "kaydedilemedi" uyarısı artık yalnız gerçek hatada çıkıyor, silinen kayıtlar geri
      gelmiyor, kayıt sırasında kısa bir bekleme perdesi görünüyor. Mesaj yolu bütün istemcilerde
      değiştiği için **istemciler güncellenmeli**; `/api/data` sınırı değişmediyse sunucu tarafında ek
      bir koşul yoktur.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | R1 QA turu (B-1..B-6, Ö-7..Ö-20, K-21..K-25), R2 plan onayı (S1–S14: onDataChanged kapısı, taban, customModels kimliği, perde eşiğinin "yolda"dan ölçülmesi, AC-58), triyajda R35 genişletildi ve R35a eklendi (0065 X5 ve 0064 AC-23/36 geri alındı; tabanda olup sunucuda olmayan kayıt eklenmez). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: satılan makinanın birleştirmede stoğa dönmesi, düşen iki eski karar testi, eksik görsel kanıt. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Üçü de gerçek; birincisi yüksek önemde bir veri bütünlüğü hatasıydı (her satışta oluşan yol). Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 1 | Stock'un birleştirmeye alınması, triyajda yakalanan "satılan makina stoğa döner" yolunu açtı (yayına çıkmadan düzeltildi). Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir bölümü birleştirmeye almak o bölümün bütün silme biçimlerini birleştirmeye almaktır: soft-delete taban kuralıyla çözülmüştü ama diziden çıkarma (makina satışı, çöp boşaltma) iki blobla "yerelde var, sunucuda yok" eklemesine benzer ve tabanın varlık bilgisini de kullanmak gerekir. Bir kararı geri alan spec, geri aldığı kararların testlerini ve gerekçelerini tek tek anmalı; 0065 X5'in gerekçesi tam da bulunan hatanın kendisiydi. İkincisi: gerçek App testleri korudukları kodu çıkarınca da geçebilir (birleştirme sonrası kayıt hiç gitmemişse son gövde eski gövdedir; teklifin eski özel dalı aynı sonucu üretiyordu); her yeni davranış testi en az bir mutasyonla ayırt edici olduğu gösterilmeden yeşil sayılmamalı. Üçüncüsü: kanıt aracında "sonra" çekimi karşılaştırma klasörüyle yapılmazsa birleştirme adımı rapor bulamayıp sessizce takılır; küçük piksel farkları iki ağaçta aynı turda yeniden çekilerek ayıklanmalı.
