# 0129 — Ayrı pano penceresinde kayıt perdesi ve kayıt sonucu

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-03, uygulama commit `7c7add09`; plan turu Karar 17–23, uygulama Karar 24–27, triyaj Karar 28). Kökeni: analist 2026-11-02, QA boşluk analizi 2026-11-03, 16 bulgu işlendi |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/ServisPencere.jsx` (perde ve sonuç bildirimi), `src/App.jsx` (kayıt durumunu köprüye veren hafif kanal), `electron/ipc/servis-pencere.cjs` (saf `servisKayitDeposu` ve iki kanal: `servis:kayitPush`, `servis:ilkKayitAl`; Karar 20), `electron/preload.cjs` (`appServisPano.kayitPush`) ve `electron/preload-servis.cjs` (`servisBridge.ilkKayitAl`, `onKayit`) (tek yönlü yeni kanal), `electron/main.cjs` (pencere kapanınca kayıt durumu önbelleğinin boşaltılması, R2/2). **Test:** yeni `tests/ui/servis-pencere-perde-0129.test.jsx` (pencere sahte köprüyle, gerçek App sahte zamanlayıcıyla, taramalar), ek blok `tests/servis-veri-deposu.test.js`. **Kanıt:** `scripts/evidence/0009-sayfa.jsx` üç ekran (sahte köprüyle çizilen pencere), `docs/evidence/0129-piksel-raporu.json` ve JPEG'leri; `kanit-eslemesi.json`'a kayıt **girmez** (Karar 24). **Belge:** `CLAUDE.md`, `specs/README.md`. Veri şeması, göç, izin tanımları, sunucu kuralları, birleştirme, kilitler ve kayıt yolunun kendisi dokunulmaz. |
| **Bağımlı spec'ler** | 0077 (kayıt perdesini, kayıt durumunu ve nedenli kayıt sonucunu kuran spec; X4 ile ayrı pencereyi bilinçli olarak dışarıda bıraktı). |
| **Ters çevrilen kriterler** | 0077 **X4 ve R29** ("Bilinen sınır, yazılır: Servis Panosu ayrı penceresinde perde görünmez … perdeyi pop-out'a da taşımak köprüye yeni bir bayrak eklemek demek, ayrı iştir") bu spec'le kapanır; R29'un gerekçesi bu işi tanımlıyor, yeni hafif kanal o "bayrak"tır (ölçüm 18). Perdenin ana penceredeki bütün kuralları (eşik, kaçış, bastırma, çevrimdışı) aynen korunur; 0077'nin perde kriterleri ana pencerede dokunulmadan geçer. |

---

## Intent

Pano ikinci monitöre ayrı pencere olarak açılabiliyor ve orada yapılan her yazma köprüyle ana pencereye gidiyor; kaydı ana pencere yapıyor. Ama kayıt perdesi ve kayıt sonucu bildirimi de ana pencerede kalıyor. Yani ayrı pencerede çalışan kişi kaydın sürdüğünü görmüyor, tıklamaya devam ediyor; kayıt başarısız olursa hatayı hiç görmüyor, çünkü bildirim öteki monitörde çıkıyor. Spec 0077 bunu bilinçli olarak dışarıda bırakmıştı, çünkü köprü o zaman durum taşımıyordu. Bu iş bittiğinde ayrı pencere de kayıt sürerken perdeyi gösterir ve kaydın sonucunu söyler.

---

## Requirements

### A. Hafif kanal

- **R1.** Kayıt durumu ana pencereden ayrı pencereye **kendi hafif kanalıyla** gider ve yük **iki parçalıdır**: perde için durum (`perdeAcik`, `durum`), bildirim için mesaj nesnesi. Tek yönlüdür (ana pencere gönderir, pencere yalnız okur).
- **R1/2.** Durum **büyük anlık görüntüye eklenmez.** Ölçtüm: bugünkü anlık görüntü **altı** yazılabilir diziyi (servisler, kargo satışları, Extra Kalıp, parça stoğu ve hareketleri, dosyalar) ve **altı** salt okunur diziyi (müşteriler, bayiler, parçalar, çalışanlar, üretim formları, parça tipleri) artı dokuz tekil alanı birlikte taşıyor; bağımlılık listesi yirmi iki değer (ölçüm 12). Perde her kayıtta en az iki kez (açılış ve kapanış) değişir, yani durumu o görüntüye koymak her kayıtta bütün verinin iki kez IPC'den geçmesi olurdu.
- **R1/4.** **Mesaj gönderimi olaydır, durum gönderimi efekttir (Karar 17).** `bildir` gösterme kararından hemen sonra göndericiyi yeni `no` ile **doğrudan** çağırır; perde durumu (`perdeAcik`, `durum`) efektle gider. Mesaj durum değişkenine yazılıp efektle gönderilseydi aynı tıkta iki `bildir` çağrısında React güncellemeleri birleştirir ve pencere yalnız sonuncuyu görürdü (ör. kaçış bildiriminin hemen ardından gelen hata). Her gönderim küçük bir değişimdir; ana süreç onu son durumla birleştirip pencereye tam durumu (`perdeAcik`, `durum`, son `mesaj`) iletir, önbellek her zaman tutarlıdır (Karar 25). Gönderilen tür `bildir`'in **çevrilmiş** türüdür (`"ok"` → yok); pencere türü yorumlamaz, olduğu gibi kendi şeridine verir (Karar 18, R8/2).
- **R1/3.** **Mesaj bir olaydır, perde bir durumdur** ve ikisi aynı kurala tabi değildir: mesaj `{ metin, tur, no }` taşır, `no` tek yönlü artan sayaçtır ve pencere mesajı yalnız `no` **değişince** gösterir. Pencere `ilkVeriAl` ile gelen mesajı **göstermez**, yalnız `no`'yu başlangıç değeri olarak alır. Yoksa (a) kayıttan sonra açılan pencere geçmiş bir hatayı yeniden gösterir, (b) aynı metin üst üste iki kez gösterilmek istendiğinde nesne değişmediği için pencere ikincisini hiç görmez.
- **R2.** Kanal aynı önbellek desenini kullanır: pencere açılışta son durumu **ister** (istek ve yanıt), sonra canlı iletilir. Yoksa pencere kayıt sürerken açıldığında perdesiz kalır.
- **R2/2.** Önbellek **bayatlamaz**: ana süreç pencerenin `closed` olayında kayıt durumu önbelleğini boşaltır (veri önbelleği bugünkü gibi kalır, orada bayatlık bir sonraki push'la düzeliyor) ve App'in gönderim efekti pencerenin açık olmasına bağlıdır, yani pencere açılınca taze durum hemen gider. Yoksa kayıt sürerken kapatılan pencere yeniden açıldığında "perde açık" değerini çeker ve perde **asla kapanmaz** (sonraki kayda kadar yeni push gelmez, R6 klavyeyi de yutuyor, kullanıcının çaresi kalmaz; ölçüm 9).
- **R2/3.** Uygulama kilidi yolu ayrıdır: kilitlenince pencere kapanmıyor, **gizleniyor** (`hide()`), `closed` atmıyor. Gizli pencere kanalı almaya devam eder (zararsız, pencere yaşıyor) ve önbellek temizliği yalnız `closed` olayında çalışır.
- **R3.** Pencere kapalıyken ana pencere bu kanala hiçbir şey göndermez (bugünkü anlık görüntü etkisinin kuralı).
- **R3/2.** **Açılış yarışı (Karar 19):** pencere `ilkKayitAl`'ı App'in ilk gönderiminden önce çağırabilir ve boş bulabilir; ardından gelen canlı gönderim durumu getirir. Pencere kapanınca önbellek boşaltıldığı için eski "perde açık" değeri hiç gelmez.

### B. Perde

- **R4.** Ayrı pencere kaydın perdesini ana pencereyle **aynı bileşenle** çizer; ikinci bir perde yazılmaz.
- **R4/2.** Perde bildirim şeridinin kardeşi olarak, ama **yalnız ilk görüntü geldikten sonra** (`hazir`) çizilir: pencere görüntüyü beklerken zaten tam ekran "Yükleniyor…" gösteriyor (ölçüm 16) ve iki engelleyici göstergeyi üst üste koymak bilgi vermez.
- **R4/3.** Perdenin zemini token'dan gelir ve karanlık temada beyaz değildir. Ayrı pencere **ayrı bir belgedir**: token zinciri kendi girişinde kurulu (`servis-main.jsx` `applyTheme` → `theme.js` `ensureStyle` bütün token'ları enjekte ediyor, `perdeBg` iki değerle listede; ölçüm 15), yani bugün doğru çalışıyor ve bu bir kriterle sabitlenir (spec 0030'un dersi: ad tanımsızken `var(--ad, açık)` sessizce beyaz kutu verir).
- **R5.** Perdenin bütün zaman kuralları ana pencerede kalır ve ayrı pencereye **karar olarak** iner: altı yüz milisaniyelik eşik, on saniyelik kaçış, açılış bastırması ve çevrimdışı modda hiç açılmaması. Pencere kendi zamanlayıcısını kurmaz, yoksa iki pencere aynı kaydı farklı anlarda perdeler.
- **R5/2.** Perde **her kayıtta** açılır, kaydın kökenine bakmaz: ana penceredeki ofis düzenlemesi de ayrı pencerede perdeyi açar. Sonucu yazılıdır ve doğrudur, çünkü panonun kendi yazması da aynı bloba girer ve aynı kuyruğu bekler. Köken ayrımı **ölçülemez**: kayıt tek blobdur, beş yüz milisaniyelik debounce ile batch'lenir ve bir kayıt hem ofisin düzenlemesini hem panonun sürüklemesini taşıyabilir (ölçüm 10); gövdede köken alanı yok (X7).
- **R6.** Perde ayrı pencerede de tıklamayı ve klavyeyi yutar. Kazancın yarısı budur: ayrı pencerede kullanıcı kayıt sürerken ikinci bir yazma başlatmaz.
- **R7.** Perdenin logosu pencerenin kendi paketinden gelir; köprü görüntü taşımaz. Maliyeti ölçüldü: varlık 18.593 bayt, `?inline` ile veri URI'si olarak paketlenir (ayrı pencerenin paketine yaklaşık 25 KB base64) ve `servis.html`'in içerik güvenlik politikası veri URI'li görüntüye izin veriyor (ölçüm 14).

### C. Kayıt sonucu

- **R8.** Ana pencerenin göstermeye karar verdiği **her** kayıt mesajı ayrı pencerede de görünür ve pencerenin kendi bildirim şeridiyle gösterilir: nedenli hata, kaçış bildirimi ("Kayıt uzun sürüyor; arka planda devam ediyor"), çakışma birleştirmesi, denemelerin tükenmesi, yeniden bağlanma ve kaçış sonrası başarı. Kapı tektir ve dokuz çağrı yeri onu kullanıyor (ölçüm 8), yani kural tek yerde uygulanır; mesajları tek tek saymak dördüncüsünü unutmak olur.
- **R8/2.** Mesaj metni ana pencerenin tablosundan gelir (0077'nin neden tablosu); pencere kendi metnini yazmaz ve nedeni kendisi yorumlamaz.
- **R8/3.** Bilinen sınır, yazılır: bildirim şeridi iki renk biliyor (hata kırmızı, geri kalan yeşil) ve bu **ana pencerede de** böyle, yani "uyarı" türündeki mesajlar bugün de yeşil çıkıyor (ölçüm 13). Ayrı pencerede **farklı** davranılmaz: üçüncü rengi yalnız pop-out'a eklemek iki pencereyi ayrıştırır (C4'ün ruhu); renk işi ayrı spec'tir.
- **R9.** Aynı neden için bastırma kuralı ana pencerededir: ayrı pencere yalnız gösterilmesi kararlaştırılmış mesajı alır, iki pencerede iki ayrı bastırma sayacı tutulmaz.
- **R10.** R8'in örneği: perde on saniyede kaçtıktan sonra kayıt başarılıysa ana penceredeki "kaydedildi" bildirimi ayrı pencerede de görünür (aksi hâlde kullanıcı perdenin neden kaybolduğunu bilmez). Kaçışın kendi bildirimi de aynı kuralla iner, çünkü perdenin neden kaybolduğunu söyleyen mesaj odur.

### D. Değişmeyenler

- **R11.** Kayıt yolu, sıraya alma, yeniden deneme, çakışma birleştirmesi ve veri yenileme kapısı dokunulmaz: ayrı pencere hâlâ yazmıyor, yalnız gösteriyor.
- **R12.** Panonun yazma köprüsü (tek yönlü mutasyon), kilit kanalları, dosya, yazdırma ve denetim kanalları dokunulmaz.
- **R13.** Harita penceresi kapsam dışıdır (salt okunur, yazma yapmıyor).

---

## Constraints

### Uyulması zorunlu

- **C1.** Karar ana pencerededir: perdenin görünürlüğünü ve mesajı 0077'nin tek kapısı belirler, ayrı pencere o kararı çizer. İki yerde iki kural olursa ikisi ayrışır.
- **C2.** Yeni kanal hafiftir: **hiçbir kayıt dizisi taşımaz** ve yükü sabit boyutludur (iki durum alanı + mesaj nesnesi). Ölçülen kural budur; alan sayısı sayılmaz, çünkü mesaj nesnesi büyüyünce alan sayan bir tarama yanlış pozitif verir.
- **C3.** Köprü yoksa (jsdom testinde ve köprüsüz render'da; pencerenin bütün köprü çağrıları bugün de `?.` ile korunuyor) ayrı pencere bugünkü gibi çalışır: perde çizilmez, hata vermez. **Sürüm sapması gerekçesi geçersizdir:** preload, ana süreç tarafı ve ana pencerenin kodu aynı paketten çıkıp aynı süreçte çalışıyor (ölçüm 17); bu uygulamada sapma yalnız istemci ile sunucu PC arasında olur.
- **C4.** Perde bileşeni tek tanımdır ve iki pencerede aynı dosyadan gelir.
- **C5.** Metinler Türkçe ve 0077'nin mesaj tablosundan.

### KAPSAM DIŞI

- **X1.** Ayrı pencerenin kendi kaydı yapması — *neden:* ana pencere verinin tek sahibidir (iki kaydedici sürüm çakışması üretir, 0077 ve pano köprüsünün kurucu kararı).
- **X2.** Harita penceresine perde — *neden:* salt okunur, yazma yapmıyor.
- **X3.** Perdenin eşik, kaçış ve bastırma sürelerinin değişmesi — *neden:* 0077'nin ölçülmüş değerleri; bu iş yalnız kapsamı genişletir.
- **X4.** Ayrı pencerede çevrimdışı mod göstergesi, oturum uyarısı ve salt okunur perdesi — *neden:* ayrı bir iş; bu spec kaydın beklemesine nişanlıdır.
- **X5.** Yazdırma önizleme penceresine perde — *neden:* orada kayıt yapılmıyor.
- **X6.** Ayrı pencerenin kayıt kuyruğunu görmesi (kaç yazma beklediği) — *neden:* ana pencerede de gösterilmiyor; perde tek bir "yolda" durumu anlatıyor.
- **X7.** Perdenin yalnız panodan gelen yazmalarda açılması (kaydın kökeni) — *neden:* ölçülemez; kayıt tek blobdur ve debounce ile batch'lenir, bir kayıt hem ofisin düzenlemesini hem panonun sürüklemesini taşıyabilir (R5/2, ölçüm 10). Köken bayrağı eklemek 0077 R29'un kaçındığı işin ta kendisi olurdu.

---

## Context

Ölçümler bugünkü kaynakla yapıldı.

1. **Perde bugün iki yerde çiziliyor**, ikisi de ana pencerede: normal kabuk (`App.jsx:1429`) ve kiosk (`:1447`). Yani servis kiosk'u kapsanmış durumda, eksik olan yalnız ayrı pencere. (QA turunda düzeltildi: spec 1423/1441 diyordu, o iki numara bildirim şeridi bloğuna düşüyor, `:1426` ve `:1449`.)
2. **Köprü tek yönlü:** pencere yazmayı `servis:mutate` ile **send** ediyor (`preload-servis.cjs:27`), ana süreç onu ana pencereye iletiyor (`ipc/servis-pencere.cjs:39`) ve geri dönüş kanalı yok. Yani kaydın sonucu bugün hiçbir biçimde pencereye ulaşamıyor.
3. **Aşağı akış deseni hazır:** ana pencere anlık görüntüyü `veriPush` ile gönderiyor, ana süreç önbelleğe alıyor, pencere açılışta `servis:ilkVeriAl` ile çekiyor ve sonra `servis:veri` ile canlı alıyor (`ipc/servis-pencere.cjs:28`, `:35`, `preload-servis.cjs:18`, `:23`). Yeni kanal bu üçlünün küçük kardeşidir.
4. **Anlık görüntü ağır:** `App.jsx:1045` altı yazılabilir diziyi tam hâliyle, **altı** salt okunur diziyi ve dokuz tekil alanı birlikte gönderiyor; bağımlılık listesi **yirmi iki** değer taşıyor (QA turunda düzeltildi: `:1040` yorum satırı, salt okunur dizi beş değil altı, bağımlılık yirmi değil yirmi iki). Perde durumu bu nesneye eklenirse her kayıtta iki kez bütün veri yeniden serileşir; bu yüzden R1/2 ayrı kanalı şart koşuyor.
5. **Pencerede bildirim altyapısı var:** kendi `showToast(metin, tur)`'u ve şeridi çiziyor (`ServisPencere.jsx:49` ve şerit `:67`), imzası ana pencerenin `bildir`'inin geçirdiğiyle birebir uyuyor, yani sonuç mesajı için yeni bir bileşen gerekmiyor. Sınırı yazılı: şerit iki renk biliyor ve ana pencere de öyle (R8/3, ölçüm 13).
6. **Perde bileşeni hazır ve bağımsız:** `acik`, `durum` ve `logo` prop'larıyla çalışıyor ve `logo` isteğe bağlı; logo ana pencerede paket içinden `?inline` ile içe aktarılıyor (veri URI'si), aynı yolu pencere de kullanabilir (köprüden geçirmek gerekmez). Maliyet ve politika ölçüldü: 18.593 bayt, yaklaşık 25 KB base64, `servis.html` izin veriyor (ölçüm 14).
7. **Pencerede tema zinciri kurulu:** anlık görüntü temayı taşıyor ve pencere uyguluyor; ayrıca pencerenin kendi girişi açılışta temayı uyguluyor ve o çağrı bütün token'ları `:root`'a enjekte ediyor, `perdeBg` de listede (ölçüm 15). Yani perdenin karanlık tema tonu bugün doğru, ama ikinci pencere ayrı bir belge olduğu için bu bir kriterle sabitlenir (R4/3).

### QA turu ölçümleri (2026-11-03)

Hepsi bugünkü kaynakla doğrulandı.

8. **Mesajın tek kapısı var:** App'in `bildir(mesaj, anahtar)` yardımcısı bastırmayı uygulayıp `showToast`'u çağırıyor ve dokuz yerden çağrılıyor (`App.jsx:397` çakışma, `:519` ve `:525` yeniden bağlanma, `:522` ve `:1339` ve `:1349` nedenli hata, `:1283` kaçış, `:1297` kaçış sonrası başarı, `:1348` denemeler tükendi). Yani "gösterilmesine karar verilen her mesaj" tek satırla kanala düşer.
9. **Önbellek pencere kapanınca temizlenmiyor:** `main.cjs:146-147` `servisWin.on("closed")` yalnız pencere değişkenini boşaltıyor, ana sürecin deposuna dokunmuyor; uygulama kilidi yolunda pencere kapanmıyor, `hide()` ile gizleniyor (`:379`).
10. **Kaydın kökeni yok:** kayıt tek blobdur, beş yüz milisaniyelik debounce ile batch'lenir ve gövdede köken alanı bulunmuyor; bir kayıt hem ana penceredeki düzenlemeyi hem panodaki sürüklemeyi taşıyabilir.
11. **Perde ve şerit komşu:** normal kabukta şerit `App.jsx:1426`, perde `:1429`; kiosk dalında şerit `:1449` (ikonlu varyant), perde `:1447`.
12. **Anlık görüntünün ölçüsü:** push `App.jsx:1045`; altı yazılabilir dizi (`services`, `yedekParcaSatislar`, `partSales`, `partStock`, `partStockLog`, `dosyalar`), altı salt okunur dizi (`customers`, `dealers`, `parts`, `calisanlar`, `uretimFormlari`, `partTypeDefs`), dokuz tekil alan ve yirmi iki bağımlılık.
13. **Şerit iki renk biliyor:** pencerede `ServisPencere.jsx:70-71` ("hata" kırmızı, geri kalan yeşil) ve ana pencerede aynısı (`App.jsx:1427`, kiosk `:1452`). 0077'nin beş mesajı "uyarı" türünde, yani bugün de yeşil çıkıyor.
14. **Logo ve politika:** `src/assets/logo.avif` 18.593 bayt, App'e `?inline` ile giriyor (`App.jsx:3`); ayrı pencerenin sayfası veri URI'li görüntüye izin veriyor (`servis.html` içerik güvenlik politikası).
15. **Token zinciri ayrı pencerede kurulu:** `servis-main.jsx:14` açılışta temayı uyguluyor, `theme.js` `applyTheme` → `ensureStyle` bütün token'ları tek stil öğesiyle `:root`'a yazıyor ve `perdeBg` aydınlık/karanlık iki değerle listede (`theme.js:33`). Perde zemini `var(--perdeBg, …)` ile çiziliyor, yani ad tanımsız kalsa açık yedeğe düşerdi.
16. **Pencere görüntüyü beklerken engelleyici bir ekran gösteriyor:** `hazir` false iken tam ekran "Yükleniyor…" (`ServisPencere.jsx:75-78`); bildirim şeridi bu koşulun dışında (`:67`), yani perde için iki yerleşim seçeneği var.
17. **Sürüm sapması bu pencerede olamaz:** preload (`electron/preload-servis.cjs`), ana süreç tarafı (`electron/ipc/servis-pencere.cjs`) ve ana pencerenin kodu aynı paketten çıkıp aynı süreçte çalışıyor; pencerenin bütün köprü çağrıları bugün de `?.` ile korunuyor (`ServisPencere.jsx:44-45`).
18. **0077'nin bilinen sınırı bu işi tanımlıyor:** R29 "Servis Panosu ayrı penceresinde perde görünmez … perdeyi pop-out'a da taşımak köprüye yeni bir bayrak eklemek demek, ayrı iştir" diyor (`0077:189-191`), X4 ise R29'a atıf veriyor (`:312`).

### QA turunda verilen kararlar (2026-11-03)

16 bulgunun hepsi Takım Yöneticisi tarafından onaylandı.

- **Karar 1 (B‑1).** Mesaj sayaçlı olay olarak taşınır; pull'dan gelen mesaj gösterilmez. → R1, R1/3
- **Karar 2 (B‑2).** Kayıt durumu önbelleği `closed` olayında boşalır, gönderim penceresinin açıklığına bağlanır. → R2/2, başlık, ölçüm 9
- **Karar 3 (B‑3).** Perde her kayıtta açılır; köken ayrımı ölçülemez ve kapsam dışıdır. → R5/2, X7, ölçüm 10
- **Karar 4 (Ö‑1).** R8 genelleşir: gösterilmesine karar verilen her mesaj kanala düşer. → R8, R10, ölçüm 8
- **Karar 5 (Ö‑2).** AC-2 ve AC-6 kanal düzeyine çevrilir; zamanlama iddiaları 0077'de kalır. → AC-2, AC-6, AC-16
- **Karar 6 (Ö‑3).** Perde bildirim şeridinin kardeşi olarak, yalnız görüntü geldikten sonra çizilir. → R4/2, AC-9
- **Karar 7 (Ö‑4).** C3'ün gerekçesi köprüsüzlüktür, sürüm sapması değil. → C3, AC-11, ölçüm 17
- **Karar 8 (Ö‑5).** Perdenin iki satır atfı düzeltilir. → ölçüm 1, ölçüm 11
- **Karar 9 (Ö‑6).** Anlık görüntünün ölçüsü düzeltilir. → R1/2, ölçüm 4, ölçüm 12
- **Karar 10 (Ö‑7).** C2 alan sayısı yerine "kayıt dizisi taşımaz" kuralını ölçer. → C2
- **Karar 11 (K‑1).** İki renkli şerit bilinen sınır olarak yazılır; pop-out ayrıştırılmaz. → R8/3, ölçüm 5, ölçüm 13
- **Karar 12 (K‑2).** Logonun maliyeti ve politika uygunluğu yazılır. → R7, ölçüm 6, ölçüm 14
- **Karar 13 (K‑3).** Karanlık tema kriteri eklenir (0077 AC-29'un kardeşi). → R4/3, AC-17, ölçüm 15
- **Karar 14 (K‑4).** Uygulama kilidinin gizleme yolu yazılır. → R2/3, ölçüm 9
- **Karar 15 (K‑5).** Ters çevrilen kriter satırına 0077 R29 eklenir. → başlık, ölçüm 18
- **Karar 16 (K‑6).** Görsel kanıt maddesi plan turunda ölçülerek karara bağlanır. → DoD, AC-22

### Plan turunda verilen kararlar (2026-11-03)

Takım Yöneticisi planın bütün önerilerini onayladı.

- **Karar 17.** Mesaj olay olarak `bildir`'den doğrudan gönderilir, perde durumu efektle; tek kanal, küçük tam yük. → R1/4
- **Karar 18.** Kanala `bildir`'in çevrilmiş türü gider; pencere türü yorumlamaz. → R1/4, R8/2
- **Karar 19.** Açılış yarışı kabul: boş önbellek sonrası canlı gönderim düzeltir; iki yönü testle ölçülür. → R3/2
- **Karar 20.** Saf depo `servisKayitDeposu` (`yaz` birleştirir, `oku`, `temizle`) `servis-pencere.cjs`'te; `main.cjs` yalnız `closed`'da `temizle` çağırır (tarama `hide()` yolunda çağrı olmadığını da sınar). → R2/2, R2/3, AC‑15
- **Karar 21.** App tarafı gerçek App'te 0077 perde testinin düzeneğiyle (sahte zamanlayıcı, yavaş kayıt) ve sahte `appServisPano` ile ölçülür. → AC‑1, AC‑5, AC‑6, AC‑10, AC‑19, AC‑20
- **Karar 22.** AC‑22 ölçüldü: kanıt aracı Electron'un ikinci penceresini çekemez, ama `ServisPencere`'yi sahte `servisBridge` ile çizebilir (`kilit-*` ekranlarının `crmLocks` emsali). Üç ekran sahte köprüyle çekilir: perde açık, kaçış sonrası bildirim, hata bildirimi. → AC‑22, DoD
- **Karar 23.** Kiosk ve ana pencere etkilenmez; 0077'nin perde testleri dokunulmadan geçmelidir (tam takımla ölçülür). → AC‑13

### Uygulamada verilen kararlar (2026-11-03)

- **Karar 24.** Kanıt eşlemesine kayıt girmez: eşlemenin anahtarları `tasarim.jsx`'i içe alan dosyalarla birebir eşittir (`tasarim-kaynak` AC‑12) ve `ServisPencere.jsx`, `ServisPanosu.jsx`, `KayitPerdesi.jsx` sözlüğü kullanmıyor (0119'un pano ekranları da aynı nedenle eşlemede değil). Kanıt `0129-piksel-raporu.json` ve JPEG'leridir; AC‑22 testi raporu (üç ekran, iki tema, çizim hatası ve adım uyarısı yok, perde şeridi) ve dosyaları sınar.
- **Karar 25.** App her gönderimde yalnız değişeni yollar (perde durumu ya da mesaj); `servisKayitDeposu.yaz` birleştirir ve `servis:kayit` tam durumu taşır. R1/4'ün "tam yük" cümlesi buna göre düzeltildi.
- **Karar 26.** AC‑6/AC‑16'nın "pencerede `setTimeout` yok" taraması: pencerede tek `setTimeout` bildirim şeridinin 3 saniyelik süresidir (spec öncesinden); tarama perde süre sabitlerini (`PERDE_ESIK_MS`, `PERDE_KACIS_MS`), `perdeGorunurMu`'yu ve kayıt durumu modülünü arar, `setTimeout` sayısını bire sabitler.
- **Karar 27.** Kanıt aracındaki sahte görüntü temayı sayfa kurulurken `data-theme`'den okuyordu ve pencere onu uygulayınca karanlık çekim aydınlık çıkıyordu; tema artık adres parametresinden okunur (ölçüldü: iki tema farklı piksel). Mutasyon ölçümü: on bozmanın biri (pencere kapalıyken gönderme) ilk turda kaçtı, AC‑10 testi mesaj üreten bir kayıtla güçlendirildi.

### Triyajda verilen karar (2026-11-03)

- **Karar 28.** (1) Pencerenin türü yorumlamadığı davranışla sabitlendi: "warn" türlü mesaj pencerede ana penceredeki gibi yeşil şeritle çıkar (R8/2, R8/3; "warn"→"err" bozması artık test kırar). (2) AC‑19'un çakışma ve yeniden bağlanma mesajları için tarama: App'te hiçbir kayıt mesajı sabiti `bildir`'i atlayıp doğrudan `showToast`'a gitmez ve bu mesajlar `bildir` üzerinden çağrılır.

### Karar kaydı

| # | Bulgu | Derece | Spec'e işlenen yer |
|---|---|---|---|
| 1 | Mesaj olay, perde durum; ikisi aynı önbellekli nesnede | Bloklayıcı | R1, R1/3 |
| 2 | Önbellek bayatlayınca perde asılı kalıyor | Bloklayıcı | R2/2, başlık |
| 3 | Perdenin hangi kayıtlarda açılacağı tanımsız | Bloklayıcı | R5/2, X7 |
| 4 | R8 ile R10 arasında mesajlar düşüyor (kaçış bildirimi) | Önemli | R8, R10 |
| 5 | AC-2 ve AC-6 ayrı pencerede ölçülemez | Önemli | AC-2, AC-6, AC-16 |
| 6 | Perdenin yerleşimi ve `hazir` hâli yazılmamış | Önemli | R4/2, AC-9 |
| 7 | C3 ve AC-11'in sürüm sapması gerekçesi geçersiz | Önemli | C3, AC-11 |
| 8 | Perdenin satır atıfları kaymış | Önemli | ölçüm 1, ölçüm 11 |
| 9 | Anlık görüntünün rakamları yanlış | Önemli | R1/2, ölçüm 4 |
| 10 | C2'nin "üç alan" sayısı tutmuyor | Önemli | C2 |
| 11 | Şerit iki renk biliyor (ana pencerede de) | Küçük | R8/3, ölçüm 13 |
| 12 | R7'nin maliyeti ölçülmemiş | Küçük | R7, ölçüm 14 |
| 13 | Karanlık tema kriteri yok | Küçük | R4/3, AC-17 |
| 14 | Uygulama kilidinin gizleme yolu yazılmamış | Küçük | R2/3 |
| 15 | Ters çevrilen kriter 0077 R29'u atlıyor | Küçük | başlık |
| 16 | Kanıt maddesi ölçülmeden yazılmış | Küçük | DoD, AC-22 |

---

## Acceptance Criteria

- **AC-1.** Ayrı pencereden yapılan bir yazmada kayıt uzun sürerse pencerede perde açılır.
- **AC-2.** Ayrı pencere aldığı kararı birebir çizer: kanal "perde kapalı" derken perde yoktur, "açık" derken vardır; pencere kendi eşiğini hesaplamaz (zamanlama iddiası 0077 AC-25'tedir, AC-13 ile korunur).
- **AC-3.** Perde açıkken ayrı pencerede tıklama ve klavye işlemez.
- **AC-4.** Kayıt bitince perde kapanır.
- **AC-5.** On saniyede kaçış kuralı ayrı pencerede de uygulanır ve sonra başarı bildirimi görünür.
- **AC-6.** Açılış bastırması ve çevrimdışı modda ana pencere "perde kapalı" gönderir ve ayrı pencere hiçbir şey çizmez; pencerede bu üç koşulu okuyan kod yoktur (kaynak taraması: `setTimeout` ve perde süre sabitleri pencerede geçmez).
- **AC-7.** Kayıt başarısız olduğunda nedenin mesajı ayrı pencerede bildirim olarak görünür.
- **AC-8.** Mesaj metni ana pencerenin tablosundan gelir; pencerede metin sabiti yazılmaz (kaynak taraması).
- **AC-9.** Pencere kayıt sürerken açılırsa son durumu alır ve **ilk görüntü geldikten sonra** perdeyi gösterir; görüntü beklenirken yalnız "Yükleniyor…" görünür, perde onun üstüne çizilmez.
- **AC-10.** Pencere kapalıyken ana pencere bu kanala hiçbir şey göndermez.
- **AC-11.** Köprü hiç yokken (testte köprü sahtelenmediğinde) pencere bugünkü gibi çalışır, perde çizilmez ve hata vermez.
- **AC-12.** Perde bileşeni tek tanımdır ve iki pencerede aynı dosyadan gelir (tarama).
- **AC-13.** Ana pencerenin perde davranışı değişmez (0077'nin kriterleri dokunulmadan geçer).
- **AC-14.** Yazma köprüsü, kilit kanalları ve kayıt yolu değişmez (tarama).

### QA turu kriterleri (2026-11-03)

- **AC-15.** Kayıt durumu önbelleği pencere kapanınca boşalır: kayıt sürerken kapatılıp yeniden açılan pencere asılı perdeyle açılmaz; gizlenen (uygulama kilidi) pencerede önbellek korunur.
- **AC-16.** Pencerede perde zamanlayıcısı yok (kaynak taraması) ve kanal "açık" demedikçe perde hiç çizilmez.
- **AC-17.** Karanlık temada ayrı pencerede perdenin zemini beyaz değildir ve değeri `perdeBg` token'ından gelir (0077 AC-29'un kardeşi).
- **AC-18.** Aynı neden için iki ayrı kayıt mesajı gönderildiğinde pencere ikincisini de gösterir (sayaç artar); `ilkVeriAl` ile gelen mesaj gösterilmez.
- **AC-19.** Kaçış bildirimi, çakışma birleştirmesi, denemelerin tükenmesi ve yeniden bağlanma mesajları da ayrı pencerede görünür (R8'in kapsamı).
- **AC-20.** Ana penceredeki bir düzenlemenin kaydı da ayrı pencerede perdeyi açar (köken ayrımı yok) ve bu bilinçlidir.
- **AC-21.** Kanal hiçbir kayıt dizisi taşımaz ve yükü sabit boyutludur (tarama: kanal gövdesinde `services`, `partSales` gibi bölüm adları geçmez).
- **AC-22.** Görsel kanıtın alınabilirliği plan turunda ölçülür: kanıt aracı ayrı pencereyi çekebiliyorsa üç ekran (perde, kaçış sonrası bildirim, hata bildirimi) çekilir, çekemiyorsa kanıt köprü sahtesiyle çizilen pencereden alınır ya da kanıt gerekmediği gerekçesiyle yazılır.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Kararın ana pencerede kaldığı ve pencerenin kendi zamanlayıcısı olmadığı testle sabitlendi (C1).
- [x] Yeni kanalın hiçbir kayıt dizisi taşımadığı ölçüldü (C2).
- [x] Yeni kalıcı alan yok, yeni veri bölümü yok, yeni eylem izni yok.
- [x] Kullanıcıya görünen bütün metinler Türkçe ve 0077'nin tablosundan.
- [x] Görsel kanıt kararı AC-22'nin ölçümüne göre uygulandı (araç ayrı pencereyi çekiyorsa üç ekran; çekmiyorsa gerekçe yazıldı).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi (0077 X4'ün kapandığı ve yeni kanal).
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `7c7add09` | Dal `feat/0129-pencere-perde`, taban `61a7619a`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 4 | QA turu (16 bulgu, Karar 1–16), plan turu (Karar 17–23), uygulama (Karar 24–27), triyaj (Karar 28) |
| **Düzeltme turu sayısı** | 1 | Triyaj: "warn" türünün pencerede yeşil çizildiği ve kayıt mesajlarının bildir'i atlamadığı testle sabitlendi; kod değişmedi |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | İkincisi isteğe bağlı tarama önerisiydi, uygulandı |
| **Regresyon sayısı** | 0 | Tam takım 468 dosya, 6451 test (Electron dahil); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** kanıt eşlemesine kayıt girmedi, çünkü eşleme anahtarları `tasarim.jsx`'i içe alan dosyalarla birebir ve pencere sözlüğü kullanmıyor (Karar 24). Kanıt aracının sahte görüntüsü temayı sayfa kurulurken okuduğu için karanlık çekim aydınlık çıkıyordu; iki temanın piksel sayısının birebir aynı olması ipucuydu (Karar 27). Mutasyon ölçümü: uygulamada on bozmanın biri kaçtı (pencere kapalıyken gönderme; test hiç mesaj üretmiyordu) ve AC‑10 güçlendirildi; triyajda iki bozma, ikisi de test kırdı.

**Bu spec'ten çıkarılan ders:** bir olayı (mesaj) duruma yazıp efektle göndermek, aynı tıktaki iki olayı birleştirir; olaylar karar anında doğrudan gönderilmeli, durumlar efektle. İkinci ders: "kapalıyken gönderme" gibi bir kapıyı sınayan test, o kapının arkasındaki her gönderim yolunu tetiklemeli; tek yol tetiklenince öteki yolun kapısı ölçülmez. Üçüncüsü: kanıt görüntülerinde iki temanın piksel sayısı birebir aynıysa tema uygulanmamıştır.
