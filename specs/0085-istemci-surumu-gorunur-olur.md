# 0085 — İstemci sürümü görünür olur: tek sürüm kaynağı, sunucuda kayıt, iki ekranda gösterim

| | |
|---|---|
| **Durum** | Uygulanıyor (revizyon 3: plan onayı kararları P1–P4 işlendi; dal `feat/0085-istemci-surumu`) |
| **Sahip** | Analist (spec) · Geliştirici (uygulama) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Sunucu › Sunucu Bağlantısı ve Kullanıcı Geçmişi; Ayarlar › Uygulama'nın "Kurulu sürüm" metinleri; kenar çubuğundaki sürüm yazısı; üst güncelleme şeridi; elle ve otomatik yedeğin sürüm damgası; istemcinin HTTP istek başlıkları; `security_log` ve `audit_log` kayıtlarının detayı; görüntü aracı |
| **Bağımlı spec'ler** | 0071 · 0074 · 0075 · 0076 · 0082 · 0084 (hepsinin sürüm notu "önce sunucu PC, sonra istemciler" diyor), 0077 (kayıt hatası nedenleri, "403 istemciyi salt okunur yapmaz"), 0068 (işlem geçmişi etiket kapsamı), 0009 ve 0011 (kanıt eşlemesi, `tasarim.jsx` kullanan dosyanın kaydı), 0082 (otomatik yedek çağrısının kaynak taraması), 0064 (görüntü aracında köprü sahteleme deseni) |
| **Taban** | main `7768968` (0084 birleşmiş, bağımlılık güncellemeleri ve Giderler metin düzeltmesi sonrası; spec revizyon 1 `a111de4` diyordu, bir commit eskiydi) |
| **Revizyon** | · 1 · 2026-10-14 ilk taslak · 2 · 2026-10-14 geliştirme öncesi QA turu (B-1…B-5, Ö-6…Ö-12, K-13…K-18 işlendi; alan adı çakışması, kartın veri yolu, boş sürümün güncelleme uyarısı, yedi tüketici, üçüncü istek yolu) · 3 · 2026-10-14 plan onayı (P1 kanıt ekranı, P2 geri döngü satırları, P3 kullanıcı başına satır, P4 rozet ve boş sürüm; plan `specs/0085-uygulama-plani.md`) |

---

## Intent

Son altı işin (0071, 0074, 0075, 0076, 0082, 0084) sürüm notu aynı cümleyle başlıyor: **önce sunucu
bilgisayarı, sonra istemciler.** İkisi bunu bir tavsiye olmaktan çıkarıp veri güvenliği şartına
çevirdi: 0071'de güncellenmemiş bir istemci "KDV dâhil" tanımından yanlış kalem üretiyor, 0082'de
güncellenmemiş istemcinin ilk kaydı bir tabloyu boşaltabileceği için yazma yolunun tamamı
kaldırıldı. Yani "bütün istemciler güncellendi mi" sorusu artık gerçek bir işletme sorusu.

Uygulama bu soruya cevap veremiyor. Ölçtüm: istemcinin uygulama sürümü sunucuya **hiç
gitmiyor** (yazma kaydına yalnız veri sürümü düşüyor), Sunucu Bağlantısı ekranında bağlı bilgisayar
ya da oturum listesi **yok**, Kullanıcı Geçmişi'nde giriş satırının yanında sürüm **yok**. Üstelik
uygulamanın kendi sürüm göstergesi de güvenilmez: `APP_VERSION` sabiti **3.42.0**'da kalmış, paket
sürümü **3.45.0**; sabit yalnız açılış anındaki değer olarak kullanılıyor ve gerçek sürüm sonradan
köprüden geliyor.

Başarı şu: sürümün tek bir kaynağı var; her istemci sunucuya hangi sürümle bağlandığını söylüyor;
yönetici Sunucu Bağlantısı ekranında hangi bilgisayarın hangi sürümde olduğunu ve eski kalanı
görüyor; Kullanıcı Geçmişi'nde giriş kaydı sürümü taşıyor.

Bu iş **hiçbir yazmayı engellemez** (bulgu B3): yalnız görünürlük ekler.

---

## Requirements

### A. Tek sürüm kaynağı

- **R1.** Uygulama sürümünün tek kaynağı `package.json`'dur (Electron'da `app.getVersion()`).
  `src/lib/constants.js`'teki `APP_VERSION` sabiti **kaldırılır**; `App.jsx` sürüm durumunu boş
  başlatır ve köprüden (`window.appUpdater.version()`) doldurur. Değerin **yedi** tüketicisi var
  ve hepsi bu işin kapsamındadır (bulgu B-4, ölçüm Context'te): güncelleme denetimi
  (`App.jsx:697`, `:719`), şerit kararı (`:732`), kenar çubuğu (`:1609`), şerit metni (`:1649`),
  otomatik yedek (`:1390`) ve Ayarlar'a geçen `version` prop'u (`:1717`) ile onun iki tüketicisi
  (`SettingsApp.jsx:44` ve `:100`, `SettingsBackup.jsx:65`).
- **R2.** Sürüm henüz gelmemişken ekranda eski bir rakam **yazılmaz**. Kapsam üç metindir: kenar
  çubuğundaki sürüm yazısı, Ayarlar › Uygulama'nın "Kurulu sürüm: v…" satırı ve iki yerdeki
  "(kurulu: v…)" ibaresi. Sürüm bilinene kadar bu metinler çizilmez ya da "…" gösterir, yanlış
  sürüm göstermez. **Revizyon 3 (P4):** "…" seçilmez, metinler sürüm bilinene kadar **hiç çizilmez**
  (dev kipinde kalıcı "…" yüklenme izlenimi verirdi). **Geliştirme ve önizleme kipinde** (`npm run dev`, `npm run preview`)
  `window.appUpdater` hiç yoktur, yani sürüm hiç gelmez ve bu metinler hiç çizilmez; bu kabul
  edilir (bugün o kiplerde yanlış rakam yazıyordu, bulgu K-16). Boş değerin güncelleme
  karşılaştırmasındaki etkisi R22'de ayrıca kapatılır.
- **R3.** Yedek dosyasının `version` damgası da bu kaynaktan gelir ve **iki yedek yolu** kapsamdadır
  (bulgu B-4): otomatik yedek (`App.jsx:1390`) ve **elle yedek** (`SettingsBackup.jsx:65`). Sürüm
  bilinmiyorsa alan boş yazılır, eski bir rakam yazılmaz.
- **R4.** Kaynak taraması: **`src/` ve `electron/` altında** sabit sürüm dizesi (`"3.x.y"` biçiminde)
  bulunmaz; sürüm yalnız `package.json`'dan okunur. Test paket sürümünü okuyup kaynakta ikinci bir
  sürüm tanımı olmadığını sabitler (sürüm yükseltmesi bu testi kırmaz). Kapsam `scripts/`'i
  **içermez** ve bunun gerekçesi yazılıdır: araç ve yerleşim düzenekleri Settings'e sabit bir
  `version` prop'u veriyor (`scripts/evidence/0009-sayfa.jsx:233`,
  `scripts/tests/layout/calisan.jsx:16`, `scripts/tests/layout/gider-tanim.jsx:16`); bunlar
  gerekçeli istisnadır ve değiştirilmez (bulgu K-17).

### B. İstemci sürümü sunucuya gider

- **R5.** İstemcinin bütün HTTP istekleri sürümünü bir başlıkta taşır (`X-App-Surum`). Başlık
  **iki yerde** eklenir ve üçüncü bir yer açılmaz (bulgu B-5, ölçüm Context'te):
  1. **`clientFetch`** (`electron/ipc/data.cjs:192`), yani `apiFetch` (`:209`) **ve** dosya yolu
     `fileFetch` (`:235`) birlikte kapsanır. Başlık `apiFetch`'e konmaz: `fileFetch` kendi
     `headers` bloğunu kurduğu için dosya yükleme, indirme ve silme istekleri dışarıda kalırdı.
  2. **Giriş isteği** (`:394`), pinli `fetch` ile kendi yolundan gittiği için ayrı eklenir.
- **R6.** Sunucu başlığı üç kayda yazar, **yeni sütun açılmadan**, var olan JSON `detail` alanına:
  giriş (`giris_basarili`), oturum yenileme (`oturum_yenilendi`) ve her veri yazımı
  (`veri_kaydedildi`). Ayrıca **başarısız giriş** satırları da taşır (bulgu K-15): `giris_basarisiz`
  dört dalı zaten `detail` yazıyor (`server.cjs:254`, `:261`, `:267`, `:275`) ve başlık o istekte
  de geliyor; sürüm `sebep` ile birlikte durur. **Alan adı `istemciSurum`'dur** ve bir sabit olarak
  tek yerde tanımlanır (bulgu B-1): `veri_kaydedildi`'nin detayındaki bugünkü **`surum`** anahtarı
  **veri sürümüdür** (`server.cjs:500`) ve **dokunulmaz**; ikisi aynı detayda yan yana durur
  (`{ bolumler, surum, istemciSurum }`).
- **R7.** Başlık yoksa (güncellenmemiş istemci) **anahtar hiç yazılmaz**, `null` da yazılmaz (bulgu
  Ö-10): `oturum_yenilendi` bugün hiç `detail` taşımıyor ve `null` yazılırsa Kullanıcı Geçmişi'nin
  Detay sütunu "istemciSurum: null" basar (`SettingsSecurityLog.jsx:146` detayı ham anahtar
  adlarıyla döküyor). Ekran anahtarın **yokluğundan** "bilinmiyor" der.
- **R8.** Sunucu başlığı **doğrulamaz ve kullanmaz**: yetki, kabul ya da ret kararı sürüme
  bakmaz (R20). Başlık yalnız kayda yazılan, istemcinin beyan ettiği bir bilgidir; sunucu onu
  biçim yönünden kırpar ve olduğu gibi saklar. Kırpma kuralı (bulgu K-14): `[0-9A-Za-z.+-]`
  dışındaki karakterler düşürülür, sonuç en çok **32** karaktere kırpılır, sonuç boş kalırsa
  anahtar yazılmaz (R7).
- **R9.** Yerel modda (sunucusuz tek bilgisayar) hiçbir şey değişmez: istek yok, kayıt yok.

### C. Kullanıcı Geçmişi (Ayarlar › Sunucu)

- **R10.** Listede giriş, oturum yenileme **ve başarısız giriş** satırlarının yanında istemcinin
  sürümü görünür; sürüm yoksa "bilinmiyor". **Revizyon 3 (P4):** rozet, Eylem hücresinde, başarısız
  giriş nedeninin (`sebep`) yanında; ayrı sütun açılmaz (diğer eylemlerde boş kalırdı). Rozet düz bir
  öğedir, `tasarim.jsx` bileşeni değildir; `SettingsSecurityLog.jsx` kanıt eşlemesi kaydı gerektirmez. Satırın bugünkü alanları (eylem,
  kullanıcı, IP, başarısız giriş nedeni) **değişmez**. **Kabul edilen yineleme (bulgu Ö-11):**
  `detayGoster` (`SettingsSecurityLog.jsx:146`) detayı `anahtar: değer` olarak genel biçimde
  döküyor, yani sürüm hem yeni rozette hem Detay hücresinde (`istemciSurum: 3.45.0`) görünür. Bu
  bilinçli olarak böyle kalır, çünkü bugün aynı yineleme `sebep` için de var (başarısız giriş
  nedeni hem Eylem hücresine ekleniyor hem Detay hücresinde basılıyor, `:23`–`:27`); `detayGoster`
  genel kalır, anahtar gizleme mantığı eklenmez (X7).
- **R11.** Dışa aktarma (CSV) sürüm alanını da içerir; sütun sonuna eklenir, var olan sütunların
  sırası değişmez. Var olan "Detay" sütunu sürümü zaten içereceği için CSV'de de aynı yineleme
  olur (R10) ve bu kabul edilir.
- **R12.** Eylem türü filtresi ve etiket haritası değişmez: yeni eylem adı **eklenmez** (sürüm bir
  alan, bir olay değil).

### D. Sunucu Bağlantısı (Ayarlar › Sunucu)

- **R13.** Sunucu bilgisayarında, sunucu çalışırken, **"Bağlı bilgisayarlar ve sürümleri"** kartı
  gösterilir: kullanıcı adı · son görülen sürüm · o sürümün görüldüğü son zaman · son IP.
  Satırlar en son görülenden eskiye sıralanır. **Kart yalnız istemcileri listeler** (bulgu Ö-8):
  sunucu bilgisayarı HTTP isteği yapmıyor (yerel veritabanını doğrudan okuyor), yani hiçbir zaman
  başlık göndermiyor. **Revizyon 3 (P2):** tek istisna sunucu kurulum akışıdır (`server:setupAdmin`,
  `electron/ipc/data.cjs:514`): `authenticateLogin`'i `ip: "127.0.0.1"` ile çağırır ve başlıksız bir
  `giris_basarili` yazar. Özet geri döngü adresinden (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) gelen
  satırları **atlar**; bu satırlar sunucu bilgisayarının kendisidir ve karta girmez. Sunucunun kendi sürümü
  kartın üstünde **karşılaştırma tabanı** olarak yazılır ("Bu bilgisayar: v3.45.0"), satır olarak
  değil.
- **R14.** Kartın verisi **var olan okuma yolundan** gelir ve bu yol **IPC'dir** (bulgu B-2, ölçüm
  Context'te): kart yalnız sunucu PC'de çizildiği için (R17) ve sunucu PC'nin kendi arayüzünde JWT
  bulunmadığı için `GET /api/security-log` **kullanılmaz**; veri `window.securityLog.get`
  (`electron/preload.cjs:166` → `electron/ipc/audit.cjs:20` → `db.getSecurityLog`) ile okunur.
  Yeni uç, yeni tablo ve yeni izin **yoktur**. Okuma penceresi şöyledir (bulgu Ö-6): `action`
  süzgeci tek değerli olduğu için **iki çağrı** yapılır (`giris_basarili` ve `oturum_yenilendi`,
  her biri `limit` 200), satırlar birleştirilir, `detail` `JSON.parse` ile açılır. Özetleme saf bir
  fonksiyondur (`src/lib/surumOzeti.js`): ham kayıt listesi girer, kullanıcı başına tek satır
  çıkar; ekran kendi gruplamasını yazmaz. **Satır anahtarı kullanıcı adıdır (P3):** admin dışı
  kullanıcılarda tek oturum kuralı var (son giriş kazanır); admin iki istemcide aynı anda olabilir ve
  yalnız en son görüleni listelenir. Kullanıcı + IP anahtarı IP değiştikçe (DHCP, Tailscale/LAN
  geçişi) aynı bilgisayarı iki satır yapacağı için seçilmedi; satır son IP'yi gösterir. Özet **yalnız bu iki sunucu yazdığı eylemi** sayar,
  "anahtarı taşıyan her satırı" saymaz: `POST /api/security-log/ingest` (`server.cjs:800`)
  istemcinin `detail`'ini olduğu gibi yazıyor (yalnız app-lock eylemlerinde), yani anahtar bazlı
  tarama sahte sürüm beyanını kabul ederdi (C2).
- **R15.** Sunucunun kendi sürümünden **eski** olan satır uyarı rengiyle ve "güncellenmeli"
  ibaresiyle işaretlenir; karşılaştırma mevcut sürüm karşılaştırma yardımcısıyla yapılır
  (`surumDahaYeni`), yeni karşılaştırma yazılmaz. Bunun için `version` değeri `SettingsServer`'a
  **geçirilir** (bulgu Ö-9): ölçüldü, bugün yalnız `SettingsApp` (`Settings.jsx:201`) ve
  `SettingsBackup` (`:224`) alıyor, `SettingsServer` almıyor.
- **R16.** Eski sürümlü ya da sürümü bilinmeyen en az bir satır varsa kartın başlığında sayı
  görünür ("2 bilgisayar güncellenmeli"); hepsi güncelse kart bunu tek satırla söyler. Sayı yalnız
  **istemci** satırlarını sayar (R13).
- **R17.** Kart yalnız sunucu bilgisayarında çizilir (kapı `mode === "server"`); istemci
  bilgisayarının Sunucu Bağlantısı ekranı **değişmez** (kendi sürümünü zaten kenar çubuğunda
  görüyor). Sunucu PC'de ayrı bir rol kapısı **yoktur**: o bilgisayarda kısıtlı kullanıcı yok
  (CLAUDE.md: admin, yerel mod ve sunucu PC her şeyi görür), yani "yalnız admin" şartı orada
  kendiliğinden sağlanır.
- **R18.** Liste "bağlı" değil **"son görülen"** bilgisidir ve ekranda böyle yazar: kayıt
  girişten ve oturum yenilemeden geliyor, canlı oturum izlenmiyor. **Tazelik ölçüldü (bulgu Ö-7):**
  istemci `/auth/me`'yi açılışta bir kez ve **günde bir** çağırıyor (`App.jsx:472`–`:476`), sunucu
  her çağrıda `oturum_yenilendi` yazıyor (`server.cjs:343`, kısıtlama yok); yani "son görülen"
  en kötü hâlde **bir gün** eskidir ve uygulama her açılışta tazelenir. Kartın ibaresi bunu söyler.
- **R19.** Saklama süresi `security_log`'un bugünkü süresidir (on iki ay); ayrı saklama kuralı
  yoktur. Geçmiş temizlenirse liste boşalır ve kart bunu söyler. Okuma penceresine (R14) girmeyen
  kullanıcı kartta görünmez ve kart bunu da söyler.

### E. Sınırlar ve kanıt

- **R20.** Sürüm uyumsuzluğu **hiçbir şeyi engellemez**: eski istemci yazmaya devam eder, 403
  üretilmez. Gerekçe 0077'nin dersi: yetki ve sınır hataları istemciyi salt okunur moda
  düşürmüyor, çünkü yanlış pozitif bütün bilgisayarı çalışamaz hâle getirir (bulgu B3).
- **R21.** İzin, veri bölümü, birleştirme ve veritabanı şeması değişmez.
- **R22.** Sürüm bilinmiyorken sürüm karşılaştırması **güncelleme varmış gibi davranmaz** (bulgu
  B-3). Ölçüldü: `utils.js:492` `surumDahaYeni` sürümü `parseInt(...) || 0` ile parçalıyor, yani
  `surumDahaYeni("3.45.0", "")` bugün **`true`** döner; sürüm boş başlatıldığında `onAvailable`
  olayı (main.cjs'in açılış denetimi) gelirse şerit açılır ve "kurulu: **v**" yazar.
  `surumDahaYeni`'ye "mevcut sürüm boşsa `false`" kapısı eklenir (fonksiyonun tek çağıranı App'tir)
  ve şerit ile "kurulu: v…" ibareleri sürüm bilinene kadar çizilmez.
- **R23.** Görüntü aracı bu işte **değişir** (bulgu Ö-12): Kullanıcı Geçmişi'nin kanıt ekranı
  bugün yok, bu yüzden yeni bir **`ayarlar-guvenlik-gecmisi`** ekranı eklenir. **Revizyon 3 (P1):**
  `ayarlar-server` ekranı araçta sunucu kipinde **çizilmiyor** (köprü yok; ekran "Bu özellik yalnızca
  Electron uygulamasında kullanılabilir" kutusunu çiziyor, `docs/evidence/0062-ayarlar-server-aydinlik.jpg`),
  yani kart orada görünmez. Kartın kanıtı yeni **`ayarlar-server-sunucu`** ekranıdır (sahte
  `window.appServer`: sunucu kipi, çalışıyor; sahte `window.securityLog`); `ayarlar-server` 0 fark kalır.
  Her iki yeni ekranda ve araçta
  `window.securityLog` sahte kurulur (0064'ün `window.crmLocks` sahtelemesi emsali). Rozet ya da
  kart `tasarim.jsx` bileşeni (`KartBolum`, `UyariSeridi`) kullanırsa `SettingsSecurityLog.jsx`
  kanıt eşlemesine kayıt alır (bugün kaydı yok, çünkü yalnız `../ui`'den içe aktarıyor); yoksa
  `tasarim-kaynak` testi kırılır.

---

## Constraints

### Uyulması zorunlu

- **C1.** Başlık adı ve `detail` alan adı (`istemciSurum`) birer sabit olarak **tek yerde**
  tanımlanır; istemci, sunucu ve iki ekran onu okur. Başlığın eklendiği yer **ikidir** ve kaynak
  taraması bunu sabitler (`clientFetch` ve giriş isteği, R5); üçüncü bir başlık eklemesi yasaktır.
- **C2.** Sunucu istemcinin beyanına güvenmez ve ona göre karar vermez (R8, R20). Bu bir denetim
  izi alanıdır, güvenlik sınırı değil; spec'te ve kodda böyle yazar. Kartın özeti de bu yüzden
  yalnız sunucunun kendi yazdığı iki eylemi sayar (R14): istemci `ingest` ucundan app-lock
  satırının `detail`'ini kendisi yazabiliyor.
- **C3.** `security_log` ve `audit_log` şeması değişmez: sürüm var olan JSON `detail` alanının
  içinde taşınır. `veri_kaydedildi`'nin `surum` (veri sürümü) anahtarı korunur (R6).
- **C4.** Kullanıcı Geçmişi'nin eylem etiketi haritasına yeni anahtar eklenmez (R12), yani
  `islem-gecmisi-etiketleri` ve etiket kapsam testleri dokunulmadan yeşil kalır.
- **C5.** Sürüm yükseltmesi hiçbir testi kırmaz: testler sürüm rakamını sabitlemez, `package.json`
  ile karşılaştırır (R4). Ölçüldü: bugün hiçbir test kenar çubuğundaki sürüm metnini ya da
  `APP_VERSION`'ı sabitlemiyor, yani R1 mevcut testleri kırmaz.
- **C6.** Kart admin dışına sızmaz. Kapı **HTTP yetkisi değil** yerleşimdir (B-2): kart yalnız
  `mode === "server"` dalında çizilir ve veriyi yerel veritabanından IPC ile okur; istemci PC'nin
  ekranı değişmediği için `GET /api/security-log`'un bugünkü admin kapısı aynen kalır ve bu işte
  hiç kullanılmaz.
- **C7.** Görsel kanıt kümesi ölçülmüş hâliyle yazılır (bulgu Ö-12, tablo Context'te):
  1. **Bilinçli değişen:** altı `uygulama-menu-*` ekranı (gerçek `<App />`; araç `appUpdater`'ı
     sahte kurmuyor, bugün sabitten gelen 3.42.0 yazıyor, R2'den sonra hiç yazmayacak), yeni
     `ayarlar-server-sunucu` (kart, revizyon 3 P1) ve yeni `ayarlar-guvenlik-gecmisi`.
  2. **0 fark beklenen:** `ayarlar-server` (araçta sunucu kipinde çizilmiyor, P1),
     `ayarlar-server-istemci` (R17'nin ölçülebilir kanıtı) ve `ayarlar-app` (araç `version="3.39.0"`
     prop'unu elle veriyor, R4'ün istisna listesi).
- **C8.** Otomatik yedek çağrısının biçimi korunur: `tests/ui/standart-kalkar-0082.test.jsx:278`
  `window.crmStorage.writeBackup(` ile ilk `});` arasını dilimleyip o bölgede bir bölüm adının
  olmadığını iddia ediyor. R3 yalnız `version` alanını değiştirir; çağrı yeniden biçimlendirilmez,
  yoksa başka bir spec'in taraması kırılır (bulgu K-18).

### KAPSAM DIŞI

- **X1.** Otomatik güncellemeyi zorlamak, eski istemciyi uzaktan güncellemek ya da sunucudan
  güncelleme tetiklemek. Güncelleme bugünkü `electron-updater` akışında kalır.
- **X2.** Sürüm uyumsuzluğunda yazmayı kısıtlamak, uyarı penceresi açmak ya da istemciyi kilitlemek
  (R20).
- **X3.** Canlı oturum listesi, "şu an bağlı" göstergesi, kalp atışı ya da yeni bir oturum tablosu
  (R18). Sunucu bilgisayarını listeye koymak için yeni bir kayıt yolu açmak da buna dahildir
  (R13 onu karşılaştırma tabanı olarak yazar).
- **X4.** Veri sürümü (`dataVersion`) ile ilgili hiçbir değişiklik; o ayrı bir kavramdır ve
  çakışma denetiminde kalır. `veri_kaydedildi` detayındaki `surum` anahtarı odur ve korunur (R6).
- **X5.** Servis Panosu'nun ayrı penceresi ve Faaliyet Haritası penceresi (kendi istekleri yok,
  ana pencerenin köprüsünden geçerler).
- **X6.** İstemci başına not, etiket ya da bilgisayar adı yönetimi.
- **X7.** Kullanıcı Geçmişi'nin Detay sütununa anahtar adı için etiket haritası yazmak ya da
  sürüm anahtarını o dökümden gizlemek. `detayGoster` bugün bütün anahtarları ham adıyla basıyor
  (`rol`, `ikiAdimli`, `sebep`) ve öyle kalır; sürümün iki yerde görünmesi kabul edilen yinelemedir
  (R10, bulgu Ö-11).

---

## Context

### Ölçümler (taban `7768968`)

| Ne | Yer | Bugün |
|---|---|---|
| Paket sürümü | `package.json:4` | **3.45.0** |
| Koddaki sabit | `src/lib/constants.js:262` | **`APP_VERSION = "3.42.0"`** (üç sürüm geride) |
| Sabitin tek kullanımı | `src/App.jsx:91` | sürüm durumunun **başlangıç değeri** |
| Gerçek sürüm | `src/App.jsx:666` | `window.appUpdater.version()` → `app.getVersion()` (`electron/main.cjs:199`) |
| Sürüm karşılaştırma | `src/lib/utils.js:492`, `:504` | `surumDahaYeni`, `guncellemeSeridiGorunur`; boş `current` **`true`** üretir |
| İstemci istek yolu (ortak) | `electron/ipc/data.cjs:192` | `clientFetch`, pinli taşıyıcıyı ekliyor |
| Veri istek yolu | `electron/ipc/data.cjs:209` | `apiFetch`, başlıkları kuruyor; `/auth/me` dahil bütün veri, kilit ve sürüm istekleri buradan |
| **Dosya istek yolu** | `electron/ipc/data.cjs:235` | `fileFetch`, **kendi `headers` bloğu**; yükleme, indirme, silme |
| Giriş isteği | `electron/ipc/data.cjs:394` | pinli `fetch`, kendi başlığıyla |
| Güvenlik kaydı yazımı | `electron/server.cjs:172` | `logSecurity`, `detail` nesneyi JSON'a çeviriyor |
| Başarısız giriş dalları | `electron/server.cjs:254`, `:261`, `:267`, `:275` | dördü de `detail: { sebep }` yazıyor |
| Başarılı giriş | `electron/server.cjs:285` | `detail: { rol, ikiAdimli }` |
| Oturum yenileme | `electron/server.cjs:343` | `detail` **yok** |
| Yazma kaydı | `electron/server.cjs:497`–`:501` | `veri_kaydedildi`; detayda `bolumler` ve **`surum` = veri sürümü** |
| İstemci kaynaklı kayıt ucu | `electron/server.cjs:800` | `/api/security-log/ingest`; yalnız app-lock eylemleri, `detail` istemciden olduğu gibi |
| Güvenlik kaydı alanları | `electron/db.cjs:1748` | `ts, actor, action, target, ip, detail` (serbest metin) |
| Güvenlik logu sorgusu | `electron/db.cjs:1767`–`:1782` | `action` süzgeci **tek değerli**, varsayılan `limit` 100, `SELECT *` (detay ham dize) |
| HTTP okuma ucu | `electron/server.cjs:779` | `GET /api/security-log`, `requireAuth + requireAdmin` |
| **IPC okuma yolu** | `electron/preload.cjs:166` → `electron/ipc/audit.cjs:20` | `window.securityLog.get` → `db.getSecurityLog`; süzgeçler doğrudan geçiyor |
| Kullanıcı Geçmişi ekranı | `src/components/settings/SettingsSecurityLog.jsx:41`, `:72` | `isServerMode = !!serverPermissions`; **istemcide HTTP, sunucu PC'de IPC** |
| Detay sütunu | `src/components/settings/SettingsSecurityLog.jsx:146` | `detayGoster`, detayı `anahtar: değer` olarak ham döküyor |
| CSV çıktısı | `src/components/settings/SettingsSecurityLog.jsx:155` | altı sütun, sonunda "Detay" |
| Sunucu Bağlantısı ekranı | `src/components/settings/SettingsServer.jsx:239`, `:354` | sunucu ve istemci dalları; **bağlı bilgisayar listesi yok**, `version` prop'u **yok** |
| Jeton yenileme sıklığı | `src/App.jsx:472`–`:476` | açılışta bir kez, sonra **günde bir** |

### `appVersion`'ın yedi tüketicisi (bulgu B-4)

| Yer | Ne yapıyor | Boş değerde ne olur |
|---|---|---|
| `App.jsx:697`, `:719` | güncelleme denetimi `surumDahaYeni(latest, appVersion)` | her sürüm "daha yeni" görünür (R22) |
| `App.jsx:732` | `guncellemeSeridiGorunur` `current` | şerit açılır |
| `App.jsx:1609` | kenar çubuğu `v{appVersion}` | "v" tek başına |
| `App.jsx:1649` | şerit metni "(kurulu: v…)" | "kurulu: v" |
| `App.jsx:1390` | otomatik yedeğin `version` damgası | boş damga (istenen, R3) |
| `App.jsx:1717` → `SettingsApp.jsx:44`, `:100` | "Kurulu sürüm: v…" ve panel şeridi | "v" tek başına |
| `App.jsx:1717` → `SettingsBackup.jsx:65` | **elle** yedeğin `version` damgası | boş damga (istenen, R3) |

### Üç ölçülmüş sonuç

1. **Sürüm göstergesi bugün yanlış olabiliyor.** Sabit üç sürüm geride ve sürüm durumunun ilk
   değeri; köprü cevap verene kadar ekranda 3.42.0 yazıyor, yedek o aralıkta yazılırsa dosyaya da
   o damga düşüyor. Boş değere geçmek bu sorunu çözer ama güncelleme karşılaştırmasını bozar, bu
   yüzden R22 eklendi.
2. **İstemci sürümü sunucuya hiç gitmiyor.** Yazma kaydının detayındaki `surum` alanı **veri
   sürümüdür** (çakışma sayacı), uygulama sürümü değil; bu yüzden yeni alanın adı `istemciSurum`
   olur ve ikisi aynı detayda yan yana durur (R6, C2, X4).
3. **Yeni altyapı gerekmiyor, ama okuma yolu HTTP değil IPC.** Başlık `clientFetch`'e eklenir,
   kayıt var olan JSON alana yazılır, kart sunucu PC'nin yerel veritabanını IPC ile okur. Veri
   ayak izi sıfır, yeni uç yok.

### Görsel kanıt kümesi (ölçüldü, bulgu Ö-12)

| Ekran | Nerede | Durum |
|---|---|---|
| `uygulama-menu-acik`, `-kapali`, `-dar`, `-tek-cocuk`, `-kasasiz`, `-kasali` | `scripts/evidence/0009-sayfa.jsx:778`–`:784` | **değişir**: gerçek `<App />`, `appUpdater` sahte kurulmuyor, bugün 3.42.0 yazıyor |
| `ayarlar-server` | `:588` jeneratörü | **0 fark** (revizyon 3 P1: araçta köprü yok, sunucu kipi çizilmiyor) |
| `ayarlar-server-sunucu` | **yok** | **eklenir** (P1): sahte `appServer` sunucu kipinde, sahte `securityLog`; kartın kanıtı |
| `ayarlar-guvenlik-gecmisi` | **yok** | **eklenir** (R23), `window.securityLog` sahtelenir |
| `ayarlar-server-istemci` | `:588` | **0 fark** (R17'nin kanıtı) |
| `ayarlar-app` | jeneratör, `version="3.39.0"` prop'u (`:233`) | **0 fark** |

Kanıt eşlemesinde `SettingsServer.jsx`'in iki kaydı var (`ayarlar-server`, `ayarlar-server-istemci`),
`SettingsApp.jsx`'in bir kaydı var; `SettingsSecurityLog.jsx` ve `App.jsx` **kayıtsız** (ikisi de
`tasarim.jsx` kullanmıyor, bu yüzden bugün gerekmiyor). Rozet ya da kart `tasarim.jsx` bileşeni
kullanırsa `SettingsSecurityLog.jsx` kayıt almak zorundadır (R23).

### Bulgular (öneri kuralı 5)

**B1 · Sabit sürüm kaynağı ne olsun?**

- **(a) Karar: `APP_VERSION` kaldırılır, tek kaynak `app.getVersion()` (R1–R3).** Gerekçe: sabit
  bugün elle güncellenmiyor ve üç sürüm geride; "iki kaynak" hâli yanlış rakam üretiyor.
  Maliyeti: sürüm bilinene kadar ekranda rakam yok (R2), bu da yanlış rakamdan iyidir.
- (b) Sabit kalır ve bir test onu `package.json` ile eşitler. Maliyeti: her sürüm yükseltmesinde
  iki yeri güncellemek; test unutmayı yakalar ama yükseltme adımı kalıcı olarak uzar.
- **QA turu eki (B-3, B-4):** boş değerin iki görünmeyen etkisi var ve ikisi de yazıldı: yedi
  tüketici adıyla sayıldı (elle yedek dahil) ve sürüm karşılaştırması boş `current`'ta `false`
  dönecek şekilde kapatıldı.

**B2 · Kart neyi okusun?**

- **(a) Karar: var olan okuma yolu (R14).** Gerekçe: kayıtlar on iki ay duruyor, yeni tablo ve uç
  açmak bu görünürlük için fazla. Maliyeti: liste "son görülen" bilgisidir, "şu an bağlı" değil
  (R18, ekranda yazılı ve tazeliği ölçülü).
- (b) Sunucuda bellekte oturum ve sürüm tablosu: gerçekten "bağlı" listesi verir. Maliyeti: yeni
  durum, sunucu yeniden başlayınca boşalır, yeni uç ve testleri; X3'te kapsam dışı.
- **QA turu eki (B-2, Ö-6):** "var olan uç" HTTP değil **IPC**'dir, çünkü kart sunucu PC'de
  çizilir ve orada JWT yoktur; okuma penceresi iki eylem süzgeçli çağrı olarak yazıldı ve özet
  yalnız sunucunun yazdığı eylemleri sayar.

**B3 · Eski istemci engellenmeli mi?** 0082'de güncellenmemiş istemcinin yazması veri kaybı
riskiydi ve çözüm yazma yolunu kaldırmak olmuştu.

- **Karar: engellenmez (R20).** Gerekçe: 0077'nin dersi, yetki ve sınır hataları istemciyi salt
  okunur moda düşürmüyor; sürüme bakıp 403 vermek, sürüm beyanı istemciden geldiği için hem
  aldatılabilir hem de yanlış pozitifte bütün bilgisayarı çalışamaz hâle getirir. Maliyeti:
  görünürlük yöneticinin eline kalır, zorlama yoktur.
- Alternatif: sunucu, kendisinden eski sürümlü istemcinin yazımını reddeder. Karışık sürüm
  penceresinde (güncelleme turu sürerken) fabrika yarım gün çalışamaz; TY bunu istemediği sürece
  önerilmez.

### QA turu kararları (revizyon 2, Takım Yöneticisi, 2026-10-14)

| Bulgu | Karar | Nereye işlendi |
|---|---|---|
| B-1 | Alan adı `istemciSurum`; `veri_kaydedildi`'nin `surum` (veri sürümü) anahtarı korunur, ikisi yan yana durur | R6, C3, X4, AC-6, AC-8 |
| B-2 | Kart sunucu PC'de **IPC** ile okur (`window.securityLog.get`); HTTP ucu bu işte hiç kullanılmaz; kapı yerleşimdir | R14, R17, C6, AC-16, AC-23 |
| B-3 | Sürüm bilinmiyorken karşılaştırma `false` döner; şerit ve "kurulu: v…" çizilmez | R22, AC-4, AC-5 |
| B-4 | `appVersion`'ın yedi tüketicisi adıyla sayılır; R3 elle yedeği de kapsar | R1, R2, R3, Context tablosu, AC-2, AC-3 |
| B-5 | Başlık `clientFetch`'e eklenir (dosya yolu dahil) artı giriş isteği; üçüncü yer yasak | R5, C1, AC-9, AC-10 |
| Ö-6 | Okuma penceresi iki eylem süzgeçli çağrı (`limit` 200); özet yalnız sunucunun yazdığı iki eylemi sayar (`ingest` beyanı sayılmaz) | R14, C2, AC-24, AC-25 |
| Ö-7 | Tazelik ölçümü yazılır: en kötü hâlde bir gün, her açılışta tazelenir | R18, AC-22 |
| Ö-8 | Kart yalnız istemcileri listeler; sunucunun kendi sürümü karşılaştırma tabanı olarak üstte | R13, R16, X3, AC-21 |
| Ö-9 | `version` prop'u `SettingsServer`'a geçirilir | R15, AC-20 |
| Ö-10 | Başlık yoksa anahtar hiç yazılmaz, `null` yazılmaz | R7, AC-11 |
| Ö-11 | Detay sütunundaki yineleme kabul edilir; `detayGoster` genel kalır, anahtar gizlenmez | R10, R11, X7, AC-18 |
| Ö-12 | Kanıt kümesi ölçülmüş hâliyle yazılır; yeni `ayarlar-guvenlik-gecmisi` ekranı ve `securityLog` sahtesi | R23, C7, Context tablosu, DoD |
| K-13 | Taban `7768968` olarak güncellenir | Başlık tablosu |
| K-14 | Kırpma kuralı: `[0-9A-Za-z.+-]`, en çok 32 karakter, boşsa anahtar yazılmaz | R8, AC-12 |
| K-15 | Başarısız giriş satırları da sürümü taşır | R6, R10, AC-13 |
| K-16 | Dev ve önizleme kipinde sürüm hiç gelmez, kabul edilir | R2, AC-5 |
| K-17 | R4'ün kapsamı `src/` + `electron/`; `scripts/` altındaki üç düzenek gerekçeli istisna | R4, AC-7 |
| K-18 | Otomatik yedek çağrısı yeniden biçimlendirilmez (0082'nin dilimleyen taraması) | C8, AC-3 |

### Plan onayı kararları (revizyon 3, Takım Yöneticisi, 2026-10-14)

| Karar | Ne | Nereye işlendi |
|---|---|---|
| P1 | `ayarlar-server` araçta sunucu kipinde çizilmiyor; kartın kanıtı yeni `ayarlar-server-sunucu` ekranı, `ayarlar-server` 0 fark | R23, C7, görsel kanıt tablosu, AC-33 |
| P2 | Sunucu kurulum akışı geri döngüden başlıksız `giris_basarili` yazıyor; özet geri döngü satırlarını atlar | R13, AC-30 |
| P3 | Satır anahtarı kullanıcı adı kalır (admin iki istemcide olabilir, en son görülen listelenir) | R14 |
| P4 | Rozet Eylem hücresinde (`sebep` yanında, düz öğe); boş sürümde metinler hiç çizilmez ("…" yok) | R2, R10 |

---

## Acceptance Criteria

### Sürüm kaynağı

- **AC-1.** Kaynakta sabit sürüm dizesi yok; sürüm `package.json`'dan gelir ve `APP_VERSION`
  içe aktarımı hiçbir dosyada bulunmaz.
- **AC-2.** Köprü cevap vermeden kenar çubuğunda, Ayarlar › Uygulama'nın "Kurulu sürüm" satırında
  ve iki şerit metninde eski bir sürüm rakamı **görünmez**; cevap gelince doğru sürüm görünür
  (yedi tüketicinin hepsi ölçülür).
- **AC-3.** Sürüm bilinmiyorken yazılan **otomatik ve elle** yedeğin `version` alanı boştur, eski
  rakam taşımaz; bilindiğinde paket sürümüne eşittir. Otomatik yedek çağrısının biçimi korunduğu
  için 0082'nin kaynak taraması yeşil kalır.
- **AC-4.** Sürüm bilinmiyorken `surumDahaYeni` **`false`** döner: güncelleme şeridi açılmaz ve
  "(kurulu: v…)" ibaresi çizilmez; sürüm gelince bugünkü davranış aynen sürer.
- **AC-5.** Geliştirme ve önizleme kipinde (köprü yok) sürüm metinleri hiç çizilmez ve hata
  oluşmaz.
- **AC-6.** Sürüm yükseltmesi hiçbir testi kırmaz (testler rakamı sabitlemez, pakete bakar).
- **AC-7.** Kaynak taramasının kapsamı `src/` ve `electron/`'dur; `scripts/` altındaki üç düzenek
  (`evidence/0009-sayfa.jsx`, `tests/layout/calisan.jsx`, `tests/layout/gider-tanim.jsx`)
  gerekçeli istisna listesinde ve dokunulmamıştır.

### Başlık ve kayıt

- **AC-8.** `veri_kaydedildi` kaydının detayı **hem** `surum` (veri sürümü) **hem** `istemciSurum`
  (uygulama sürümü) taşır; iki alan birbirini ezmez ve adları tek sabitten gelir.
- **AC-9.** İstemci modunda yapılan veri isteği, **dosya yükleme isteği** ve giriş isteği sürüm
  başlığını taşır.
- **AC-10.** Kaynak taraması: başlık yalnız iki yerde eklenir (`clientFetch` ve giriş isteği);
  `apiFetch` ya da `fileFetch` içinde ayrı bir başlık eklemesi yok.
- **AC-11.** Başlık göndermeyen istemcinin kaydında `istemciSurum` anahtarı **hiç yoktur**
  (`null` da yazılmaz); `oturum_yenilendi` satırının detayı bugünkü gibi boş kalır ve ekranda
  "bilinmiyor" görünür.
- **AC-12.** Sunucu, başlıktaki değeri biçim yönünden kırpar (`[0-9A-Za-z.+-]` dışı düşer, en çok
  32 karakter, boş kalırsa anahtar yazılmaz) ve bu değere göre **hiçbir yetki kararı vermez**.
- **AC-13.** Başarılı giriş, başarısız girişin dört dalı, oturum yenileme ve veri yazımı sürümü
  taşır; `security_log` ve `audit_log` sütunları değişmez.
- **AC-14.** Yerel modda (sunucusuz) hiçbir ek istek ya da kayıt oluşmaz.

### Kullanıcı Geçmişi

- **AC-15.** Giriş, başarısız giriş ve oturum yenileme satırlarında sürüm görünür; sürümsüz
  kayıtta "bilinmiyor".
- **AC-16.** Ekranın iki okuma yolu da çalışmaya devam eder: istemci PC'de HTTP ucu, sunucu PC'de
  `window.securityLog` IPC'si.
- **AC-17.** Başarısız giriş satırının bugünkü nedeni (hız limiti, bilinmeyen kullanıcı, yanlış
  şifre, yanlış 2FA) aynen görünmeye devam eder.
- **AC-18.** Detay sütunu bugünkü genel dökümünü sürdürür (anahtarlar ham adıyla) ve sürüm orada
  da görünür; bu yineleme kabul edilmiştir, anahtar gizleme mantığı eklenmemiştir.
- **AC-19.** CSV çıktısı sürüm alanını sonda içerir ve var olan sütunların sırası değişmez.
- **AC-20.** Eylem etiketi haritasına yeni anahtar eklenmemiştir.

### Sunucu Bağlantısı

- **AC-21.** Sunucu bilgisayarında, sunucu çalışırken "Bağlı bilgisayarlar ve sürümleri" kartı
  çizilir; kullanıcı başına tek satır, en son görülen üstte. Kart yalnız **istemcileri** listeler
  ve sunucunun kendi sürümünü karşılaştırma tabanı olarak üstte yazar (satır olarak değil).
- **AC-22.** Kart "son görülen" ibaresini ve tazelik cümlesini taşır (açılışta ve günde bir
  yenilenir); canlı bağlantı iddiası yoktur.
- **AC-23.** Kart verisini sunucu PC'de IPC ile okur; `GET /api/security-log` bu akışta hiç
  çağrılmaz.
- **AC-24.** Okuma iki eylem süzgeçli çağrıyla yapılır (`giris_basarili`, `oturum_yenilendi`;
  `limit` 200) ve özet yalnız bu iki eylemi sayar: `ingest` ucundan gelen app-lock satırının
  detayına sürüm yazılmış olsa bile karta girmez.
- **AC-25.** `version` değeri `SettingsServer`'a ulaşır ve karşılaştırma `surumDahaYeni` ile
  yapılır; yeni karşılaştırma yazılmamıştır.
- **AC-26.** Sunucudan eski sürümlü satır uyarı işaretiyle, sürümü bilinmeyen satır "bilinmiyor"
  ile görünür; hepsi güncelse kart bunu tek satırla söyler.
- **AC-27.** Başlıktaki sayı, eski ve bilinmeyen **istemci** satırlarının toplamıdır.
- **AC-28.** İstemci bilgisayarının Sunucu Bağlantısı ekranı değişmez: kart hiç çizilmez.
- **AC-29.** Kayıt yoksa (geçmiş temizlendi, hiç giriş olmadı) kart boş durumunu söyler, hata
  vermez; okuma penceresine girmeyen kullanıcı için de aynı ibare geçerlidir.
- **AC-30.** Özetleme saf fonksiyonla ölçülür: aynı kullanıcının iki farklı sürümlü kaydından en
  yenisi kalır, kullanıcı adı yoksa kayıt atlanır, `detail` bozuk JSON ise satır atlanır, geri döngü
  adresinden gelen satır (sunucu kurulum akışı) atlanır (revizyon 3 P2).

### Değişmeyenler ve kanıt

- **AC-31.** İzin tanımları, veri bölümleri, birleştirme ve veritabanı şeması değişmemiştir
  (kaynak taraması).
- **AC-32.** Eski sürümlü istemcinin yazımı kabul edilir (403 üretilmez); uçtan uca sunucu testiyle
  ölçülür.
- **AC-33.** Görsel kanıt C7'deki kümeyle aynıdır: altı `uygulama-menu-*` ekranı ile yeni
  `ayarlar-server-sunucu` ve `ayarlar-guvenlik-gecmisi` bilinçli değişir; `ayarlar-server`,
  `ayarlar-server-istemci` ve `ayarlar-app` 0 piksel fark verir (revizyon 3 P1). Yeni ekran araçta `window.securityLog` sahtesiyle çizilir ve rozet
  `tasarim.jsx` kullanıyorsa `SettingsSecurityLog.jsx` kanıt eşlemesinde kayıtlıdır.

---

## Definition of Done

- [ ] R1–R23 uygulanmış; başlık iki yerde, alan adı (`istemciSurum`) tek sabitte, özetleme saf
      modülde, kart IPC'den besleniyor.
- [ ] AC-1…AC-33 testlerle karşılanmış: `tests/surum-gorunurlugu-0085.test.js` (saf özet,
      taramalar, paket sürümü eşitliği, boş sürümde `surumDahaYeni`),
      `tests/ui/surum-gorunurlugu-0085.test.jsx` (iki ekran, sunucu ve istemci dalları, boş
      sürümde şeridin çizilmemesi), `scripts/tests/server-security.cjs` bloğu (başlıklı ve
      başlıksız yazım, kırpma, eski sürümle yazım kabul edilir),
      `scripts/tests/db-roundtrip.cjs` (detay JSON'unda iki sürüm alanı birlikte).
- [ ] `npm test` ve `npm run lint` yeşil; Electron testleri koşulmuş.
- [ ] Görsel kanıt C7'deki kümeyle çekilmiş: yeni `ayarlar-guvenlik-gecmisi` ekranı araca
      eklenmiş ve `window.securityLog` sahtelenmiş; `docs/evidence/0085-*` ile
      `kanit-eslemesi.json` güncel (gerekliyse `SettingsSecurityLog.jsx` kaydı eklenmiş).
- [ ] `CLAUDE.md`'ye yazılmış: tek sürüm kaynağı kuralı, başlık sabiti ve eklendiği iki yer,
      `detail`'deki iki sürüm alanının ayrımı (`surum` = veri sürümü, `istemciSurum` = uygulama
      sürümü), kartın IPC'den beslendiği.
- [ ] `specs/README.md` güncel; `tests/spec-atiflari.test.js` `TASINACAK` listesi bu işin
      dosyalarıyla doldurulmuş ve done'a taşınırken boşaltılmış.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu**, kanıt eşlemesindeki `degisti` kayıtları `ayni`ye çevrildi
      (`kanit-eslemesi.test.js`, 0011 AC-11c) ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

Uygulama bittiğinde doldurulur.
