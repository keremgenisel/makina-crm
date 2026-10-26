# 0112 — Bağlı bilgisayarlar kartı silinmiş kullanıcıyı listelemez

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 2: plan turu Karar 13–19, 2026-10-26; uygulama commit `cc47239`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Sunucu Bağlantısı'ndaki "Bağlı bilgisayarlar ve sürümleri" kartı (`src/components/settings/BagliBilgisayarlar.jsx`) ve saf özeti (`src/lib/surumOzeti.js` `surumOzeti`); tazeleme sinyali için `src/components/settings/UserManager.jsx` (geri çağırım) ve `src/components/settings/SettingsServer.jsx:350-352` (sayaç, R11); kart yine yalnız orada çizilir. Ayrıca `src/lib/kilitAlanlari.js:75` gerekçesi (R15), `docs/evidence/kanit-eslemesi.json` kaydı (C8) ve 0085'in iki test dosyası (C6) |
| **Bağımlı spec'ler** | 0085 (kartın kendisi, saf özet, geri döngü ve karşılaştırma kuralları) |
| **Ters çevrilen kriterler** | 0085'in kart **davranış** kriterlerinden hiçbiri ters çevrilmez; satır kümesi daralır, kuralları aynen kalır. `surumOzeti`'nin kullanıcı listesi verilmeyen çağrısı birebir bugünkü çıktıyı verir (R4). Tek daraltma 0085 **AC-23'ün kaynak taraması**: kartın `apiRequest` yasağı "güvenlik geçmişini HTTP ucundan okumaz" ile değiştirilir, çünkü kullanıcı listesinin tek erişilebilir yolu o köprüdür (C6, ölçüm 9) |

---

## Intent

Sunucu bilgisayarındaki Sunucu Bağlantısı ekranında "Bağlı bilgisayarlar ve sürümleri" kartı duruyor. Kullanıcı artık kullanılmayan bir bilgisayarı bu listeden çıkarmak istiyor ve bugün bunu yapamıyor: kartta silme yok, hesabı Kullanıcı Yönetimi'nden silmek de satırı kaldırmıyor, çünkü satır kullanıcı kaydından değil güvenlik kaydından okunuyor. Listeden çıkarmanın tek yolu bütün Kullanıcı Geçmişi'ni temizlemek, ki o denetim izini yok eder.

Burada anlaşılması gereken bir şey var: kart bilgisayarları değil **kullanıcıları** listeliyor, satırın anahtarı kullanıcı adıdır. Bir bilgisayar yenisiyle değiştirildiyse kullanıcı adı aynı kaldığı sürece satır kendiliğinden güncellenir ve silmeye gerek yoktur. Silmek gerçekten gerekiyorsa gerekçe "bu hesap artık kullanılmıyor" demektir, ki o hesabın durması zaten bir güvenlik sorunudur.

Bu iş bittiğinde kart yalnız var olan kullanıcıların satırlarını gösterecek, yani Kullanıcı Yönetimi'nden silinen hesap listeden de düşecek; Kullanıcı Geçmişi dokunulmamış kalacak ve kart listeden çıkarmanın yolunu kendi üstünde yazacak.

---

## Requirements

- **R1.** Kart yalnız **var olan** kullanıcıların satırlarını çizer. Kullanıcısı silinmiş satır çizilmez ve "güncellenmeli" sayısına girmez.
- **R1/2.** Süzme bir kesişimdir, bir birleşim değil: kart kullanıcı listesini **göstermez**, kendi satırlarını onunla süzer. Tanımlı ama hiç giriş yapmamış kullanıcı listede yer almaz ve sayısı da yazılmaz; tanımlı hesapların envanteri Kullanıcı Yönetimi'nin işidir (Karar 12, ölçüm 21).
- **R2.** Ölçüt, satırın kullanıcı adının bugünkü kullanıcı listesinde bulunmasıdır. Pasif (askıya alınmış) kullanıcı da vardır, satırı çizilir (Karar 2).
- **R2/2.** Karşılaştırma iki tarafı da kırptıktan sonra **birebir**dir. `trLower` ya da herhangi bir yerel küçültme kullanılmaz: giriş büyük ve küçük harfe duyarlı olduğu için (ölçüm 13) başarılı bir giriş kullanıcı adının tabloda birebir aynı yazıldığı anlamına gelir, harf katlamak silinmiş bir hesabın satırını sahte eşleşmeyle listede tutar (Karar 10).
- **R3.** Kullanıcı listesi okunamazsa (sunucu yeni başladı, yönetici anahtarı yok, istek hata verdi) kart bugünkü gibi **bütün satırları** çizer ve süzmenin yapılamadığını yazar. Kart **kullanıcı listesi okunamadığı için** boş görünmez (Karar 1). Güvenlik geçmişinin okunamadığı hâl değişmez: orada bugünkü boş durum kutusu çizilir (0085 AC-29 aynen).
- **R3/2.** Kart üç durumu ayırır: **bekliyor** (istek yolda; süzme yok, ibare **yok**), **hata** (süzme yok, ibare var), **ad kümesi** (süzme var, ibare yok). Liste gelmeden çizim bloke olmaz (C5) ve bekleme anında "süzme yapılamadı" ibaresi görünmez (Karar 7, AC-8).
- **R3/3.** Başarısızlığın sebebi kullanıcıya yazılmaz: dört yolun hepsi (yönetici anahtarı yok, 401, 429, ağ ya da ayrıştırma hatası) aynı tek ibareye düşer (ölçüm 14). Köprü hiç yoksa kart sessizce süzmesiz çalışır, hata vermez (Karar 7, AC-19).
- **R4.** Süzme saf fonksiyondadır: güvenlik kayıtları, bu bilgisayarın sürümü ve var olan kullanıcı adları girer, satırlar çıkar. Kullanıcı adları **verilmeyen** çağrı bugünkü çıktıyı birebir verir, yani 0085'in bütün kriterleri dokunulmadan geçer.
- **R4/2.** Sözleşme üç parçalıdır (Karar 6). (1) İmza `surumOzeti(kayitlar, sunucuSurum, adlar)`; `adlar` bir **ad dizisidir** ya da `null`. (2) Ucun cevabını normalleştiren ikinci bir saf yardımcı dışa verilir, `kullaniciAdlari(cevap)`: dizi değilse, boşsa ya da adsız satırlardan sonra boş kalıyorsa **`null`** döner (süzme yok), aksi hâlde kırpılmış adları verir; `is_active`'e **bakmaz** (R2, AC-5). (3) Dönüş nesnesinin şekli değişmez, yeni anahtar eklenmez (C7); "süzüldü mü" kararı kartın kendi okuma durumundadır (R3/2).
- **R5.** Kullanıcı Geçmişi değişmez: silinmiş kullanıcının giriş, başarısız giriş ve oturum yenileme kayıtları ile sürüm rozetleri orada aynen durur. Hiçbir güvenlik kaydı silinmez.
- **R6.** Kart, listeden çıkarmanın yolunu kendi üstünde yazar: artık kullanılmayan bir bilgisayarı listeden çıkarmak için kullanıcısını Kullanıcı Yönetimi'nden silmek (Karar 3). Kart silme düğmesi taşımaz.
- **R6/2.** Cümle dışa verilen yeni bir sabittir (`KALDIRMA_IBARESI`, `data-testid="kaldirma-ibaresi"`) ve `Ipucu`'nun içinde **pencere cümlesinden önce** yazılır. `PENCERE_IBARESI` olduğu gibi kalır: "geçmişi temizlenmiş kullanıcı listede yer almaz" bir olgu açıklamasıdır, bir öneri değil; önerilen yolun ilk okunan cümle olması kullanıcıyı denetim izini temizlemeye yönelmekten alıkoyar (Karar 9, C1).
- **R7.** Süzmeden sonra hiç satır kalmazsa bugünkü boş durum kutusu çizilir ve metni silinmiş kullanıcı hâlini de anlatır.
- **R7/2.** Tek kutu, tek metin: üç nedeni sayan bir cümle (hiç giriş olmadı, geçmiş temizlendi, kayıtlı kullanıcıların hepsi silinmiş). Başlık ve `testId="bos-bagli-bilgisayarlar"` korunur, ikinci bir boş durum varyantı açılmaz (0085 AC-29 bu kimliği ölçüyor).
- **R8.** 0085'in kart kuralları aynen kalır: kart yalnız sunucu bilgisayarında ve sunucu çalışırken çizilir, geri döngü adresinden gelen satır atlanır, satır anahtarı kullanıcı adıdır, en son görülen kayıt kalır, sürüm karşılaştırması ve "karşılaştırılmadı" hâli değişmez.
- **R9.** Satırın bir kullanıcı olduğu, bir bilgisayar olmadığı kartta yazılı kalır; bugünkü tazelik ve pencere ibareleri korunur.
- **R10.** Yeni izin, kalıcı alan, veri bölümü, sunucu ucu ve göç yok. Kart var olan kullanıcı listesi ucunu okur.
- **R10/2.** Okuma var olan `/api/users` ucundan `window.appServer.apiRequest` ile yapılır (`electron/server.cjs:522-525`, yalnız yönetici). Bu, güvenlik geçmişinin doğrudan IPC okumasından farklı olarak geri döngü üzerinden bir **HTTP** isteğidir; yeni uç ve yeni izin açılmaz (C3, ölçüm 9).
- **R10/3.** Liste **tek okumayla** gelir: kart ilk çizildiğinde ve R11'in tazeleme sinyali değiştiğinde. Yoklama ve zamanlayıcı yok; kart "son görülen" bilgisidir ve kendi güvenlik kaydı okuması da tek seferliktir (Karar 5).

### QA turunda eklenen kurallar (2026-10-26)

- **R11.** Kullanıcı silindiğinde satır **aynı ekranda**, sayfa yenilenmeden kaybolur. Mekanizma: `UserManager` isteğe bağlı bir `onKullaniciDegisti` geri çağırımı alır ve her başarılı `load()` sonunda çağırır, `SettingsServer` bunu artan bir sayaçta tutar ve karta prop olarak verir, kartın okuma efekti o sayaca bağlanır (Karar 5, ölçüm 10). Desen uygulamanın `giderAcilis` / `kasaAcilis` sayaçlarının aynısıdır.
- **R12.** "Süzme yapılamadı" ibaresi `Ipucu`'nun içinde, kendi kabında ve `data-testid="suzme-yapilamadi"` ile çizilir; metin dışa verilen bir sabittir (`SUZME_YAPILAMADI_IBARESI`, tek cümle: liste okunamadığı için silinmiş kullanıcıların da listelendiği). `UyariSeridi` kullanılmaz: bu bilgi niteliğinde bir hâldir, arıza değil, ve şerit kartın yüksekliğini her açılışta oynatır (Karar 9).
- **R13.** Pasif kullanıcının satırı ek bir işaret **taşımaz** (Karar 2'nin açık bıraktığı "pasif" ibaresi eklenmez, Karar 11). Pasiflik kartın sorusunu cevaplamıyor: hesap duruyor, yani bilgisayar tanımlı.
- **R14.** Kartın başlığı ve şeridi 0085'teki metinleriyle kalır ("N bilgisayar güncellenmeli"), satırın bir kullanıcı olduğunu R6 ve R9'un cümleleri söyler. Metni değiştirmek 0085'in iki testini ve kanıt ekranını yalnız sözcük düzeyinde bir kazanç için açar (Karar 12).
- **R15.** `src/lib/kilitAlanlari.js:75`'teki kilitsizlik gerekçesi güncellenir: kart artık güvenlik geçmişini **ve** kullanıcı listesini okur, yazma yapmaz. Dosya kilitsiz kalır, kilit davranışı değişmez (C2, ölçüm 16).

---

## Zorunlu kısıtlar

- **C1.** Güvenlik kaydı silinmez. "O kullanıcının kayıtlarını sil" yolu bilinçli olarak reddedildi: denetim izini yok eder, on iki aylık saklama kuralını ve Kullanıcı Geçmişi'ni bozar.
- **C2.** Kullanıcı silme işlemi bugünkü yerinde ve bugünkü izinle kalır (Kullanıcı Yönetimi, yalnız yönetici). Kart yazma yapmaz, salt okunurdur.
- **C3.** Kart **güvenlik geçmişini** sunucu bilgisayarında doğrudan IPC ile okur (0085 C6: o akışta oturum anahtarı yok, `window.securityLog.get`); bu değişmez. **Kullanıcı listesi** ayrı bir yoldan gelir: var olan `/api/users` ucundan `window.appServer.apiRequest` ile, yani geri döngü üzerinden yönetici anahtarıyla bir HTTP isteğiyle (`electron/ipc/data.cjs:471-495` sunucu dalı). İki ayrı köprüdür; yeni uç, yeni izin ve yeni IPC kanalı açılmaz.
- **C4.** 0085'in dışa verdiği iki metin sabiti (`TAZELIK_IBARESI`, `PENCERE_IBARESI`) ve kartın test kimlikleri **birebir** korunur; bu işin iki yeni cümlesi onları değiştirmez, yeni sabitler olarak eklenir (`KALDIRMA_IBARESI`, `SUZME_YAPILAMADI_IBARESI`). Metin değişirse testi birlikte güncellenir.
- **C5.** Kullanıcı listesinin okunması kartın çizimini bloke etmez: liste gelmeden kart bugünkü satırlarını gösterir, liste gelince süzülür.
- **C6.** 0085'in kart testlerinden yalnız **AC-23'ün kaynak taraması** daraltılır (`tests/surum-gorunurlugu-0085.test.js:160-164`): yasak "kart güvenlik geçmişini HTTP ucundan okumaz" olur, tarama `/api/security-log` yasağını ve `window.securityLog?.get(` koşulunu korur, `apiRequest`'i yalnız `/api/users` yolu için serbest bırakır ve yolun kaynakta yazılı olmasını sabitler. 0085'in davranış testleri (`tests/ui/surum-gorunurlugu-0085.test.jsx`'in "Bağlı bilgisayarlar kartı" bloğundaki dokuz test) **dokunulmadan** geçer (AC-28, ölçüm 20).
- **C7.** `surumOzeti`'nin dönüş nesnesinin şekli dondurulmuştur: `{ satirlar, guncellenmeli, karsilastirildi }`. "Birebir" bu depoda `toEqual` ile ölçülüyor (ölçüm 11), yani `suzuldu` gibi bir anahtar eklemek AC-10'u ve 0085'in testini kırar.
- **C8.** Görsel kanıt bir dosya değil, testle denetlenen bir kayıttır: `docs/evidence/kanit-eslemesi.json`'daki `BagliBilgisayarlar.jsx` kaydı (ölçüm 15) bu işin raporuna ve `beklenen: "degisti"` + onay dizesine çevrilir, kanıt aracının sunucu ekranı kullanıcı listesi döndüren bir sahte köprü kazanır ve üç yeni ekran eklenir (süzülmüş liste, süzme sonrası boş durum, liste okunamadı).

---

## Kapsam dışı

- **X1.** Satır başına "Listeden kaldır" gelmez — *neden:* Takım Yöneticisi hesabı silme yolunu seçti; hesabı silmeden gizlemek yeni kalıcı veri ve yeni bir IPC yolu ister, hesabın durması gerektiği bir durum çıkarsa ayrı spec'le gelir.
- **X2.** Bilgisayar kimliği (makina adı, donanım kimliği) toplanmaz — *neden:* istemci bugün sunucuya yalnız sürümünü bildiriyor; bilgisayar kimliği yeni bir alan, yeni bir başlık ve kendi gizlilik kararını ister. Satırın kullanıcı olduğu gerçeği yazılı kalır (R9).
- **X3.** Kullanıcı Geçmişi ekranı, süzgeçleri ve dışa aktarması değişmez — *neden:* denetim izi bu spec'in konusu değil, C1 onu korur.
- **X4.** Canlı bağlantı listesi (şu an kim bağlı) yapılmaz — *neden:* kart "son görülen" bilgisidir ve 0085 bunu bilinçli seçti; canlı liste ayrı bir mekanizmadır.
- **X5.** Sürüm uyumsuzluğunun bir şeyi engellemesi gelmez — *neden:* 0085 R20 kararı aynen geçerli, kart yalnız görünürlüktür.
- **X6.** Silinen kullanıcının kayıt satırlarının Kullanıcı Geçmişi'nde işaretlenmesi kapsam dışı — *neden:* ayrı bir okunurluk işi, bu spec'in sorusu değil.
- **X7.** Okuma penceresi büyütülmez — *neden:* süzme 200'lük pencereden **sonra** uygulanır, yani silinmiş kullanıcıların satırları pencere bütçesini yemeye devam eder ve hesabı silmek pencere dışında kalmış gerçek bir istemciyi listeye geri getirmez (bilinen sınır, ölçüm 3 penceresi). İki eylem × 200 kayıt pratikte bol; kuralın yönü yazılı olsun ki "sildim, yine görünmüyor" diye yeni bir bildirim olarak dönmesin.
- **X8.** Kendi hesabını silerek satırını kaldırmak mümkün değil — *neden:* uç kendi kimliğini reddediyor ("Kendi hesabınızı silemezsiniz", `electron/server.cjs:577`). Sunucu bilgisayarının yöneticisinin satırı normalde zaten listede değil (geri döngü atlanır), ama o yönetici bir istemciden giriş yaparsa (0085 P3) satırı hiçbir zaman süzülemez. Bilinen sınır, kart bunu ayrıca yazmaz.

---

## Ölçümler ve bugünkü davranış

1. **Satırın kaynağı güvenlik kaydıdır, kullanıcı kaydı değil.** Kart iki eylemin son kayıtlarını okuyup (`giris_basarili`, `oturum_yenilendi`, her biri için son 200 satır) kullanıcı adı başına tek satır üretir (`src/lib/surumOzeti.js`). Kullanıcı listesi hiç okunmaz.
2. **Kullanıcıyı silmek satırı kaldırmıyor.** Silme yalnız kullanıcı tablosundan siliyor (`electron/db.cjs:1764-1767`), güvenlik kaydına dokunmuyor. Yani bugün hesap silinse de kart o satırı göstermeye devam eder.
3. **Bugün listeden çıkarmanın tek yolu bütün geçmişi temizlemek.** Kartın kendi ibaresi bunu zaten söylüyor ("geçmişi temizlenmiş kullanıcı listede yer almaz"), ama bu bütün denetim izini siler.
4. **Kullanıcı listesi sunucu bilgisayarında okunabilir.** Kullanıcı Yönetimi aynı ekranda, aynı köprüyle kullanıcı listesini zaten okuyor (`electron/ipc/data.cjs:471-495` sunucu dalı yönetici anahtarıyla geri döngüye gider; uç `electron/server.cjs:522-525`, yalnız yönetici). Yani yeni bir uç ya da izin gerekmiyor.
5. **Kart ve Kullanıcı Yönetimi aynı ekranda ve yan yana** (`SettingsServer.jsx:350-352`), yani R6'nın yönlendirmesi kullanıcıyı başka bir yere göndermiyor.
6. **Kartın bugünkü dört sütunu** kullanıcı, son görülen sürüm, son görülme, son IP. Bilgisayar adı sütunu yok, çünkü istemci böyle bir bilgi göndermiyor (X2).
7. **Aynı kullanıcı adının iki bilgisayarda kullanılması tek satır üretir** ve en son görülen kayıt kalır. Bu yüzden "bir bilgisayarı sil" isteği, kullanıcı adı paylaşılıyorsa karşılanamaz; bunun kartta yazılı olması R9'un gerekçesidir.
8. **Sunucu bilgisayarının kendi satırı zaten listede değil** (geri döngü adresinden gelen kayıt atlanır, 0085 P2), yani bu spec sunucunun kendi satırına dokunmaz.

### QA turu ölçümleri (2026-10-26)

Yukarıdaki sekiz ölçümün satır atıfları bu turda tek tek doğrulandı ve hepsi yerinde çıktı (`surumOzeti.js`, `db.cjs:1764-1767`, `data.cjs:471-495`, `server.cjs:522-525`, `SettingsServer.jsx:350-352`, kartın dört sütunu, geri döngü atlaması).

9. **Kullanıcı listesine ulaşmanın tek yolu `appServer.apiRequest`.** Köprüde kullanıcı ucu yok (`electron/preload.cjs:106-157`: `appServer` yalnız genel `apiRequest`'i açar; `securityLog` köprüsünde iki kanal var, `security:get` ve `security:clear`), `getAllUsers` yalnız ana süreçte. Ama 0085'in kart taraması kartın kaynağında `apiRequest` dizesini yasaklıyor (`tests/surum-gorunurlugu-0085.test.js:160-164`), yani kart listeyi okuduğu anda o test kırılır. C6 bu taramayı daraltır.
10. **Kart listeyi yalnız bir kez okur ve silme onu tazelemez.** Kartın tek efekti `useEffect(..., [])` (`BagliBilgisayarlar.jsx:17-28`); silme `UserManager`'ın içinde (`:140`) ve ardından `load()` yalnız UserManager'ın kendi `users` durumunu tazeliyor. Yani sinyal olmadan kullanıcı hesabı siler, iki santim yukarıdaki karta bakar ve satırı olduğu yerde görür. R11 bu yüzden var.
11. **"Birebir" harfi harfine bir kısıttır.** `tests/surum-gorunurlugu-0085.test.js:225` dönüşü `toEqual({ satirlar: [], guncellenmeli: 0, karsilastirildi: true })` ile sınıyor; `toEqual` fazladan anahtarı hata sayar, yani nesneye `suzuldu` eklemek AC-10'u da o testi de kırar (C7).
12. **Var olan düzenekler kullanıcı listesini boş dizi döndürüyor.** `tests/ui/surum-gorunurlugu-0085.test.jsx:210` düzeneği `apiRequest`'i her yol için `{ ok: true, data: [] }` yapıyor, kanıt aracının sunucu ekranı da aynı (`scripts/evidence/0009-sayfa.jsx:76-81`). Boş dizi "hepsini süz" sayılsaydı 0085'in dokuz kart testi ve kanıt ekranı sıfır satıra düşerdi; AC-7'nin güvenli açık kuralı onları aynen yeşil tutuyor.
13. **Giriş büyük ve küçük harfe duyarlı.** `users.username TEXT NOT NULL UNIQUE` ve `COLLATE NOCASE` yok (`electron/db.cjs:353-362`), `getUserByUsername` düz `=` kullanıyor (`:1697-1700`). Yani başarılı bir giriş, kullanıcı adının tabloda birebir aynı yazıldığı anlamına gelir; güvenlik kaydının `actor`'ı da jetondaki addan gelir ve `surumOzeti` onu kırpar (`:51`).
14. **Süzmenin düşebileceği dört yol.** (1) Sunucu dalında `cfg.adminToken` yoksa istek `{ error: "Sunucuya bağlı değil" }` döner (`data.cjs:476-477`); (2) jeton 30 günlük ve `requireAuth` `token_version`'ı denetliyor, yöneticinin şifresi ya da rolü değiştiyse sayaç artar (`db.cjs:1746-1760`) ve istek 401 alır; (3) genel `/api` sınırlayıcısı 429 verebilir; (4) ağ ya da ayrıştırma hatası `{ error }` döner. Dördü de süzmesiz bir kart demektir. Ayrıca 0085'in bazı testleri `window.appServer`'ı siliyor (`tests/ui/surum-gorunurlugu-0085.test.jsx:25`), yani köprüsüz hâl de gerçek.
15. **Kanıt kaydı bugün 0085 tabanına bağlı.** `docs/evidence/kanit-eslemesi.json` (satır 5465) `BagliBilgisayarlar.jsx` için tek kayıt tutuyor: `0085-taban-piksel-raporu.json`, ekran `ayarlar-server-sunucu`, `beklenen: "ayni"`. Kartın metni değişeceği için o ekran artık 0 piksel vermez ve `tests/kanit-eslemesi.test.js` ile `tasarim-kaynak.test.js` bu kaydı denetliyor (C8).
16. **Kilit listesindeki gerekçe bayatlayacak.** `src/lib/kilitAlanlari.js:75` kartı "salt okunur kart (spec 0085); yalnız güvenlik geçmişini okur" diye yazıyor; kart kullanıcı listesini de okuyacak. Dosya kilitsiz kalır, yalnız metin güncellenir (R15).
17. **Kullanıcı listesi gerçek hayatta boş olamaz.** Son yönetici koruması en az bir etkin yöneticiyi garanti ediyor (`electron/server.cjs:549`, "Sistemde en az bir aktif yönetici kalmalı"), yani AC-7'nin boş liste dalı savunma amaçlıdır ve asıl işi var olan düzenekleri ayakta tutmaktır (ölçüm 12).
18. **Kendi hesabını silmek yasak.** `DELETE /api/users/:id` kendi kimliğini reddediyor (`electron/server.cjs:577`), yani bir satır hiçbir zaman süzülemez (X8).
19. **Silme kendi izini bırakıyor.** Uç `kullanici_silindi` güvenlik kaydı yazıyor (`electron/server.cjs:580`, hedef silinen kullanıcının adı) ve bu eylem kartın saydığı ikisinden biri olmadığı için satırı geri getirmez. C1'in "denetim izi korunur" iddiasının doğrudan kanıtı budur.
20. **0085'in kart bloğu dokuz testten oluşuyor** (`tests/ui/surum-gorunurlugu-0085.test.jsx:220-312`; test adları **0085'in** kriterleridir: AC-21/26/27, AC-26, AC-22/29, AC-29, AC-23/24, AC-25, iki R22 triyajı, AC-28). Bu işin AC-28'inin ölçüsü o dokuz testtir.
21. **Kart bugün kullanıcı listesini hiç okumuyor** (ölçüm 1), yani tanımlı ama hiç giriş yapmamış hesap bugün de kartta görünmüyor; R1/2 bu davranışı değiştirmiyor, yalnız yazıya geçiriyor.

---

## Kararlar (Takım Yöneticisi, 2026-10-26)

Takım Yöneticisi 2026-10-26'da **üç kararın hepsini analistin önerisiyle** verdi. Aşağıdaki maddeler verilen kararlardır; gerekçeleri kayda geçirilmiştir.

**Karar 1. Kullanıcı listesi okunamazsa kart ne yapsın?**
**Karar: bütün satırları çizsin** ve ipucunda süzmenin yapılamadığını yazsın (R3). Güvenli açık davranış: kart bilgi verme amaçlıdır, bir güvenlik sınırı değildir; liste gelmediğinde satırları saklamak çalışan bir kartı bozar ve kullanıcıya "hiç istemci yok" gibi yanlış bir cevap verir. Alternatif (liste gelmeden hiçbir şey çizmemek) yalnız geçici bir ağ hatasında ekranı boşaltır.

**Karar 2. Pasif (askıya alınmış) kullanıcı listede kalsın mı?**
**Karar: kalsın** (R2). Hesap duruyor, yani o bilgisayar hâlâ tanımlı ve yeniden etkinleştirilebilir. Pasifi de gizlemek "hesabı askıya al" eylemini sessizce bir listeden silme eylemine çevirir ve hesap geri açılınca satır eski zaman damgasıyla aniden geri gelir. İsterseniz adının yanına "pasif" ibaresi koyarım; bu ek bir karardır, önermiyorum ama zararsızdır.

**Karar 3. Kart listeden çıkarmanın yolunu yazsın mı?**
**Karar: yazsın** (R6), tek satır: artık kullanılmayan bir bilgisayarı listeden çıkarmak için kullanıcısını aşağıdaki Kullanıcı Yönetimi'nden silmek. Maliyeti bir cümle, kazancı bu sorunun bir daha sorulmaması. Kartın kendisine silme düğmesi koymayı önermiyorum: silme hesabı siler, yani sonucu listeden daha geniştir ve onayı Kullanıcı Yönetimi'nde durmalıdır.

### QA turunda verilen kararlar (2026-10-26)

QA boşluk turunda yirmi bir boşluk çıktı ve Takım Yöneticisi 2026-10-26'da **hepsini analistin önerisiyle** kapattı. Aşağıdaki maddeler verilen kararlardır.

**Karar 4. Kartın kullanıcı listesini okuması 0085'in hangi kriterini açar?**
**Karar: yalnız AC-23'ün kaynak taraması daraltılır** (C6, R10/2). Yasak "kart güvenlik geçmişini HTTP ucundan okumaz" olur; davranış testleri dokunulmaz. Gerekçe: spec'in başlığı uygulayıcıya "0085 testlerine dokunmayacaksın" diyordu, oysa listenin tek erişilebilir yolu o köprüdür (ölçüm 9); kararı spec vermezse geliştirici ya taramayı sessizce gevşetir ya da gereksiz yeni bir IPC kanalı açar.

**Karar 5. Satır ne zaman kaybolur?**
**Karar: aynı ekranda, sayfa yenilenmeden** (R11, R10/3). `UserManager` her başarılı yüklemede bir geri çağırım yapar, `SettingsServer` sayacı tutar, kart o sayaca bağlı okur. Gerekçe: AC-15'in "yeniden çizilince" ifadesi React'ta yeni bir istek doğurmuyor (ölçüm 10) ve kullanıcı silmeden hemen sonra karta bakacak, yani bu cümle spec'in bütün amacı. Yoklama gereksiz istek, listeyi UserManager'dan prop olarak almak ise bekleme ile hata hâlini ayırt edilemez kılar.

**Karar 6. Saf fonksiyonun sözleşmesi nedir?**
**Karar: R4/2'deki üç parça.** `surumOzeti(kayitlar, sunucuSurum, adlar)`, ucun şeklini bilen `kullaniciAdlari(cevap)` yardımcısı ve dondurulmuş dönüş nesnesi. Gerekçe: adların mı nesnelerin mi geçtiği ve boş dizinin ne anlama geldiği AC-7 ile AC-11'in ne ölçtüğünü değiştirir, yani plan turuna bırakılamaz; ucun şeklini saf yardımcıya koymak kartı karar vermekten kurtarır (R4).

**Karar 7. Bekleme ile hata ayrılsın mı?**
**Karar: ayrılsın, üç durum** (R3/2, R3/3). Bekleme anında ibare yok, hata hâlinde var, sebep yazılmaz, köprü yoksa sessizce süzmesiz. Gerekçe: aksi hâlde her açılışta bir an "süzme yapılamadı" yazar ve kullanıcı onu kalıcı arıza sanar; ayrıca AC-6 ile AC-8 aynı testte çelişirdi.

**Karar 8. Boş liste neden güvenli açık?**
**Karar: güvenli açık kalır ve gerekçesi yazılır** (AC-7, ölçüm 12, ölçüm 17). Gerekçe: kural keyfi görünüyor ve plan turunda ters çevrilmeye müsait, oysa var olan dokuz kart testini ve kanıt ekranını ayakta tutan şey tam olarak bu; gerçek hayatta liste zaten boş olamaz.

**Karar 9. İki yeni cümle nereye yazılır?**
**Karar: iki yeni dışa verilen sabit, ikisi de `Ipucu` içinde** (R6/2, R12). `KALDIRMA_IBARESI` pencere cümlesinden önce, `SUZME_YAPILAMADI_IBARESI` kendi kimliğiyle; `TAZELIK_IBARESI` ve `PENCERE_IBARESI` birebir korunur (C4). Gerekçe: Karar 1 yeri zaten seçmişti, R3 ile çelişkisi giderildi; şerit bilgi niteliğindeki bir hâli arızaya benzetir, kimlik olmadan da AC-6 ile AC-7 metin arayarak ölçülür ve metin değişince iki test birden kırılır.

**Karar 10. Kullanıcı adı nasıl karşılaştırılır?**
**Karar: kırpıp birebir, harf katlama yasak** (R2/2, AC-22). Gerekçe: bu depoda metin eşlemesi refleksle `trLower`'dan geçiyor (arama, model adları); burada yanlış olur, çünkü harf farkı olan bir `actor` hiç giriş yapamamış demektir (ölçüm 13) ve katlama silinmiş bir hesabı sahte eşleşmeyle listede tutar.

**Karar 11. Pasif kullanıcıya "pasif" ibaresi konsun mu?**
**Karar: konmasın** (R13, AC-24). Karar 2'nin açık bıraktığı öneri burada kapanır. Gerekçe: açık bırakılan öneri plan turunda yeniden tartışma açar ve pasiflik kartın sorusunu cevaplamıyor.

**Karar 12. Yazılmayacak şeyler nelerdir?**
**Karar: üçü de yazılmaz, ikisi bilinen sınır olarak kayda geçer.** Kartın başlığı ve şeridi 0085 metniyle kalır (R14), hiç görülmemiş kullanıcının sayısı eklenmez (R1/2), okuma penceresi büyütülmez (X7) ve kendi hesabını silememe sınırı karta yazılmaz (X8). Gerekçe: dördü de yalnız sözcük ya da savunma düzeyinde kazanç sağlar, karşılığında 0085'in testlerini ve kartın sorusunu bulanıklaştırır; sınırların yazılı olması ise aynı bildirimin ikinci kez gelmesini önler.


### Plan turunda verilen kararlar (Takım Yöneticisi onayı, 2026-10-26)

**Karar 13. R11 harfiyen uygulanır; açılışta ikinci okuma kabul edilir.** Kullanıcı Yönetimi açılışta da `load()` çağırdığı için sayaç 0'dan 1'e çıkar ve kart listeyi ikinci kez okur (geri döngü üzerinden tek GET). Yeniden okumada kart durumu "bekliyor"a döndürmez, son ad kümesi cevap gelene kadar kalır (silinen satır bir an geri gelmesin); eskimiş cevap iptal bayrağıyla atılır. AC-23 istek sayısını "ilk çizim + her başarılı yükleme başına bir" olarak ölçer. Açılış çağrısını atlamak R11'den sapma olurdu.

**Karar 14. Yeniden okuma hata verirse Karar 1 harfiyen.** Kart hata durumuna geçer, süzme yapmaz ve ibareyi gösterir (silinen satır ibareyle geri görünür). Son başarılı kümeyi saklamak spec'in tanımlamadığı dördüncü bir durum olurdu.

**Karar 15. AC-26'nın "`setX` geçmez" taraması yerel durumu kapsamaz.** Tarama prop olarak gelen setter'ı, `"GET"` dışında `method:` değerini ve `POST`/`PATCH`/`DELETE` dizelerini yasaklar; kartın kendi `useState` setter'ları serbesttir. Kriterin amacı kartın uygulama verisine yazmaması.

**Karar 16. Ipucu sırası `TAZELIK` → `KALDIRMA` → `PENCERE`.** Tazelik cümlesi listenin ne olduğunu anlatır; önerilen yol "geçmişi temizlenmiş" cümlesinden önce okunur (R6/2, C1). AC-25 bu sırayı DOM metninde ölçer.

**Karar 17. `kullaniciAdlari`'nın girdisi ucun gövdesidir (`data` dizisi).** Köprünün `{ ok, data }` sarmalayıcısı kartın işidir: `r?.ok ? kullaniciAdlari(r.data) : null`, `null` hata durumuna gider. AC-21 saf testi dizi, nesne, tanımsız ve adsız satır girdileriyle doğrudan ölçer.

**Karar 18. Köprüsüz hâl bekliyor dalına düşer.** Ayrı bir durum adı açılmaz: `apiRequest` yoksa efekt hiç istek atmaz, durum "bekliyor" kalır (süzme yok, ibare yok, AC-19).

**Karar 19. Hata yollarının arayüz testi kartı tek başına çizer.** Kullanıcı Yönetimi aynı ucu okuduğu için bozuk cevap onu da bozar (dizi olmayan veri `map` hatası); AC-6, AC-7, AC-8 ve AC-19 kartın kendisiyle, AC-15 ve AC-23 gerçek `SettingsServer` ile ölçülür.

---

## Kabul kriterleri

- **AC-1.** Güvenlik kaydında üç kullanıcının giriş satırı var ve üçü de kullanıcı listesinde: kart üç satır çizer (bugünkü davranış).
- **AC-2.** Üç kullanıcıdan biri kullanıcı listesinde yok: kart iki satır çizer ve silinen kullanıcının adı kartta hiç geçmez.
- **AC-3.** Silinen kullanıcının sürümü bu bilgisayardan eskiyse "güncellenmeli" sayısı onu saymaz.
- **AC-4.** Silinmiş kullanıcı süzüldükten sonra kalan bütün satırlar güncelse başarı şeridi çizilir.
- **AC-5.** Pasif (etkin olmayan) kullanıcının satırı çizilir.
- **AC-6.** Kullanıcı listesi isteği hata verirse kart bütün satırları çizer ve `suzme-yapilamadi` ibaresi görünür (metin `SUZME_YAPILAMADI_IBARESI` sabitinden okunur).
- **AC-7.** Kullanıcı listesi boş dönerse (hiç kullanıcı yok) kart süzme yapmaz ve bütün satırları çizer; bu hâl AC-6 ile aynı ibareyi taşır. Dizi olmayan cevap da (hata nesnesi, tanımsız) aynı dala düşer.
- **AC-8.** Kullanıcı listesi henüz gelmemişken kart bugünkü satırlarını çizer, liste gelince süzülür (çizim bloke olmaz) ve **bekleme anında** `suzme-yapilamadi` ibaresi görünmez.
- **AC-9.** Güvenlik kaydındaki bütün kullanıcılar silinmişse `bos-bagli-bilgisayarlar` kutusu çizilir; tek kutu, tek metin ve metin üç nedeni sayar (hiç giriş olmadı, geçmiş temizlendi, kayıtlı kullanıcıların hepsi silinmiş).
- **AC-10.** Saf özet fonksiyonu kullanıcı adları **verilmeden** çağrıldığında 0085'in bugünkü çıktısını birebir verir: dönüş nesnesine yeni anahtar eklenmez, şekil `{ satirlar, guncellenmeli, karsilastirildi }` kalır (`toEqual` ile ölçülür).
- **AC-11.** Saf özet fonksiyonu kullanıcı **adlarıyla** (ad dizisi, nesne değil) çağrıldığında yalnız listede olan kullanıcıların satırlarını döner; sıra, durum ve "güncellenmeli" sayısı aynı kuralla hesaplanır.
- **AC-12.** Geri döngü adresinden gelen satır, kullanıcısı silinmemiş olsa da atlanır (0085 P2 aynen).
- **AC-13.** Bozuk detay taşıyan kayıt bugünkü gibi atlanır.
- **AC-14.** Kart, listeden çıkarmanın yolunu söyleyen cümleyi taşır ve kart üzerinde silme düğmesi yoktur.
- **AC-15.** Kullanıcı Yönetimi'nden bir kullanıcı silindikten sonra satır **aynı ekranda, sayfa yenilenmeden** kaybolur (tazeleme sinyali ölçülür: `UserManager` geri çağırımı çağrılır, kart listeyi yeniden okur); Kullanıcı Geçmişi ekranında o kullanıcının kayıtları ve sürüm rozetleri aynen durur, üstüne silmenin kendi `kullanici_silindi` kaydı eklenir.
- **AC-16.** Kart istemci bilgisayarında ve sunucu durmuşken çizilmez (0085 R13, R17 aynen).
- **AC-17.** Bu bilgisayarın sürümü okunamamışken satırlar "karşılaştırılmadı" durumunda kalır ve süzme bu durumu değiştirmez.

### QA turu kriterleri (2026-10-26)

- **AC-18.** Kart kullanıcı listesini var olan `/api/users` ucundan `appServer.apiRequest` ile okur ve güvenlik geçmişini HTTP ucundan okumaz: daraltılmış tarama `/api/security-log` yasağını ve `window.securityLog?.get(` koşulunu korur, kaynakta yalnız `/api/users` yolunun geçtiğini sabitler.
- **AC-19.** `window.appServer` ya da `apiRequest` yokken (dev kipi, 0085'in köprüsüz testleri) kart hata vermez: süzmesiz çizilir.
- **AC-20.** Yönetici anahtarı yok, 401, 429 ve ağ hatası hâllerinin dördü de aynı tek ibareye düşer; sebep metni (durum kodu, sunucu mesajı) kullanıcıya yazılmaz.
- **AC-21.** `kullaniciAdlari`: dizi olmayan, boş ve adsız satırlardan oluşan cevapta `null` döner; dolu cevapta adları kırpar ve `is_active`'e bakmaz (pasif kullanıcının adı listede kalır).
- **AC-22.** Karşılaştırma birebirdir: güvenlik kaydındaki `ADMIN` satırı, kullanıcı listesinde yalnız `admin` varken çizilmez.
- **AC-23.** Kart listeyi yalnız ilk çizimde ve tazeleme sinyali değiştiğinde okur; zamanlayıcı ya da yoklama yoktur (istek sayısı ölçülür).
- **AC-24.** Pasif kullanıcının satırı ek bir işaret taşımaz ("pasif" ibaresi yoktur).
- **AC-25.** `KALDIRMA_IBARESI` kartta görünür ve pencere cümlesinden **önce** gelir; `TAZELIK_IBARESI` ile `PENCERE_IBARESI` birebir bugünkü metinleriyle kalır.
- **AC-26.** Kart üzerinde silme düğmesi yoktur (AC-14) ve kart hiçbir yazma yolu çağırmaz: kaynağında `setX`, `POST`, `PATCH` ve `DELETE` isteği geçmez.
- **AC-27.** Kartın başlığı ve özet şeridi 0085'teki metinleriyle çizilir; süzmeden sonra kalan satırlara göre hesaplanır.
- **AC-28.** `tests/ui/surum-gorunurlugu-0085.test.jsx`'in "Bağlı bilgisayarlar kartı" bloğundaki **dokuz** test dokunulmadan geçer.
- **AC-29.** Kanıt eşlemesindeki `BagliBilgisayarlar.jsx` kaydı bu işin raporuna ve `beklenen: "degisti"` + onay dizesine çevrilir; kanıt aracına üç yeni ekran eklenir (süzülmüş liste, süzme sonrası boş durum, liste okunamadı) ve aracın sunucu ekranı kullanıcı listesi döndürür.
- **AC-30.** `kilitAlanlari.js`'teki gerekçe kartın iki okumasını da söyler ve dosya kilitsiz listede kalır; kart `useLock` ya da `baskasiKilitli` çağırmaz.
- **AC-31.** Süzme güvenlik kaydı okuma penceresinden **sonra** uygulanır: pencerenin dışında kalmış bir kullanıcı, hesabı silinse de silinmese de listede görünmez (X7'nin bilinen sınırı).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Süzme kararı React'sız saf fonksiyonda yazıldı; kart yalnız gösteriyor.
- [ ] Yeni izin, kalıcı alan, veri bölümü ve sunucu ucu **eklenmediği** açıkça yazıldı (R10).
- [ ] Güvenlik kaydının silinmediği testle sabitlendi (C1, AC-15).
- [ ] 0085'in kart bloğundaki dokuz test dokunulmadan yeşil; yalnız AC-23'ün kaynak taraması daraltıldı ve bu "Ters çevrilen kriterler" satırına yazıldı (C6, AC-28).
- [ ] `surumOzeti`'nin dönüş nesnesine anahtar eklenmediği testle sabitlendi (C7, AC-10).
- [ ] Kanıt eşlemesindeki kart kaydı bu işin raporuna ve `beklenen: "degisti"` + onay dizesine çevrildi; üç yeni kanıt ekranı üretildi (C8, AC-29).
- [ ] Silmeden sonra satırın aynı ekranda kaybolduğu gerçek `SettingsServer` düzeneğinde ölçüldü (R11, AC-15).
- [ ] Kullanıcıya görünen bütün metinler Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (boş durum ve liste okunamadı durumu dâhil).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu, 2026-10-26)

| # | Boşluk | Derece | Karar | Nereye işlendi |
|---|---|---|---|---|
| B-1 | Kullanıcı listesinin tek yolu 0085'in kart taramasıyla yasaklı; "hiçbir kriter ters çevrilmez" doğru değil | Bloklayıcı | AC-23'ün taraması daraltılır, C3 düzeltilir | Başlık satırı, C3, C6, R10/2, AC-18, Karar 4, ölçüm 9 |
| B-2 | "Kart yeniden çizilince satır kaybolur" ölçülemez: kart listeyi yalnız mount'ta okuyor | Bloklayıcı | Tazeleme sinyali (UserManager geri çağırımı + sayaç) | R11, R10/3, AC-15, AC-23, Karar 5, ölçüm 10 |
| B-3 | Saf fonksiyonun sözleşmesi tanımsız (parametre şekli, "süzme yok" değerleri, dönüş şekli) | Bloklayıcı | R4/2'deki üç parça, dönüş dondurulur | R4/2, C7, AC-10, AC-11, AC-21, Karar 6, ölçüm 11 |
| Ö-1 | "Okunamadı" ile "henüz gelmedi" aynı değerse ibare yükleme anında yanıp söner | Önemli | Üç durum: bekliyor, hata, ad kümesi | R3/2, AC-8, Karar 7 |
| Ö-2 | Boş listenin neden güvenli açık sayıldığı yazılı değil | Önemli | Kural kalır, gerekçesi ve ölçümü yazılır | AC-7, Karar 8, ölçüm 12, ölçüm 17 |
| Ö-3 | "Süzme yapılamadı" ibaresinin yeri, metni ve kimliği tanımsız | Önemli | `Ipucu` içinde, sabit ve `suzme-yapilamadi` kimliğiyle | R12, AC-6, Karar 9 |
| Ö-4 | R6'nın cümlesi C4 ile çelişiyor; pencere ibaresi hâlâ "geçmişi temizle" diyor | Önemli | Yeni sabit, pencere cümlesinden önce; iki eski sabit korunur | R6/2, C4, AC-25, Karar 9 |
| Ö-5 | Kullanıcı adı karşılaştırmasının harf ve boşluk duyarlılığı tanımsız | Önemli | Kırpıp birebir, harf katlama yasak | R2/2, AC-22, Karar 10, ölçüm 13 |
| Ö-6 | Görsel kanıtın defter kaydı eksik (kart bugün 0085 tabanına "ayni" bağlı) | Önemli | Kayıt çevrilir, üç yeni ekran, araç mock'u genişler | C8, AC-29, DoD, ölçüm 15 |
| Ö-7 | Süzmenin düşebileceği hâller ölçülmemiş; kart çökmemeli ve sebep yazmamalı | Önemli | Dört yol yazılır, tek ibare, köprüsüz hâl sabitlenir | R3/3, AC-19, AC-20, Karar 7, ölçüm 14 |
| K-1 | `kilitAlanlari.js:75` gerekçesi bayatlıyor | Küçük | Gerekçe güncellenir, dosya kilitsiz kalır | R15, AC-30, ölçüm 16 |
| K-2 | Boş durumun tek metin mi iki hâl mi olduğu belirsiz | Küçük | Tek kutu, tek metin, üç neden | R7/2, AC-9 |
| K-3 | Süzme 200'lük pencereden sonra uygulanıyor | Küçük | Bilinen sınır, pencere büyütülmez | X7, AC-31, Karar 12 |
| K-4 | Kendi hesabını silmek yasak, o satır hiç süzülemez | Küçük | Bilinen sınır, karta yazılmaz | X8, Karar 12, ölçüm 18 |
| K-5 | Başlık ve şerit "bilgisayar" diyor, satır kullanıcı | Küçük | 0085 metni korunur | R14, AC-27, Karar 12 |
| K-6 | Tanımlı ama hiç görülmemiş kullanıcı kartta yok; R1 tersini çağrıştırıyor | Küçük | Kesişim olduğu yazılır, sayı eklenmez | R1/2, Karar 12, ölçüm 21 |
| K-7 | Karar 2 "pasif" ibaresini açık bırakmış | Küçük | Eklenmez, kriterle kapatılır | R13, AC-24, Karar 11 |
| K-8 | Listenin okuma sıklığı yazılı değil | Küçük | Tek okuma artı tazeleme sinyali, yoklama yok | R10/3, AC-23, Karar 5 |
| K-9 | Silmenin kendi izi (`kullanici_silindi`) kayda geçmemiş | Küçük | Ölçüm olarak eklenir, AC-15 onu da ölçer | AC-15, ölçüm 19 |
| K-10 | R3'ün "hiçbir hâlde boş görünmez" ifadesi 0085 AC-29 ile çelişiyor | Küçük | İfade daraltılır | R3 |
| K-11 | 0085 testlerinin dokunulmadan geçtiği iddiası ölçüsüz | Küçük | Kriter eklenir (dokuz test) | C6, AC-28, ölçüm 20 |

*Düzeltme:* QA raporunda 0085'in kart bloğu "altı test" diye yazılmıştı; sayım `tests/ui/surum-gorunurlugu-0085.test.jsx:220-312` üzerinde **dokuz** `it` bloğudur (ölçüm 20) ve kriterler o sayıyla yazıldı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `cc47239` | Dal `feat/0112-bagli-bilgisayarlar`, taban `c1d1df5`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | QA turu (B-1–B-3, Ö-1–Ö-7, K-1–K-11), plan turu (Karar 13–19) |
| **Düzeltme turu sayısı** | 1 | Triyaj: iki düşük bulgu: yeniden okumanın iki kuralı (bekleme durumuna dönmeme, eski cevabın atılması) testsizdi; ana dizindeki spec kopyası eskiydi |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 421 dosya, 5687 test (Electron dahil); lint 0 hata; tip denetimi temiz; 0085'in dokuz kart testi dokunulmadan |
| **Kaçan hata** | 0 | Davranış hatası yok; kaçan iki şey test kapsamı ve belgeydi |

**Görsel kanıt:** 6 ekran × 2 tema; sunucu ekranı ve üç yeni ekran (süzülmüş liste, hepsi silinmiş, liste okunamadı) değişti; Kullanıcı Geçmişi ve istemci ekranı 0 fark; taban son kodla 0 fark.

**Bu spec'ten çıkarılan ders:** Bir efektin "eski cevabı at" ve "yeniden okurken durumu sıfırlama" kuralları kodda doğru olsa da kendiliğinden testli değildir: her istek anında dönen sahte köprüler yarışı hiç üretmez, cevapları elle çözülen bir düzenek gerekir. Kaynak taramaları yalnız kendi spec'lerinin dosyalarını değil bütün dizini tarar: yeni bir bileşende iç durum için seçilen dize (`"bekliyor"`) ya da testteki örnek sürüm başka bir spec'in taramasına takılabilir; ilk tam takım koşusu bunu erken gösterir.
