# 0052 — Kasa Sekmesinin Kendi İzni

| | |
|---|---|
| **Durum** | Taslak |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kullanıcı izinleri (UserManager), sekme görünürlüğü, sunucu yetki eşlemesi |
| **Bağımlı spec'ler** | 0001 (gider sekmesinin izin kuralı) · 0024 (Kasa sekmesi ve C6 kuralı) · 0043 (Mali İşler grubu) · 0040, 0044, 0046 (kasa yetkisine bağlı türev görünümler) |
| **Revizyon** | R1 (QA turu, 2026-09-30): geliştirici hazırlığı denetimi, 15 bulgu işlendi, 4'ü bloklayıcıydı. Eski kayıt kuralı **veriye taşındı** (bir kerelik geri doldurma, R12) çünkü yokluk "verilmedi" ile "kaldırıldı"yı ayırt edemiyordu ve sunucu ham listeyi okuyor; uygulama noktası tek şart olarak adlandırıldı (R2), sunucu ön koşulu ve `GIDER_BOLUMLERI` etkileşimi yazıldı (R7).<br>**R2 (2026-09-30, plan onayı):** geri doldurma `db.cjs`'te `kasaGocu`'nun yanında, üç açılış dalında; yerel modda ayrı dal yok, kullanıcısız veritabanında döngü boş geçer ve yalnız işaret yazılır (Q1); temiz kurulumda da işaret yazılır (Q2); tanımsız, bozuk ve admin izin kaydına dokunulmaz (Q3); önkoşul `sekmeEngelli`'nin yanında `ON_KOSUL_SEKMELERI` haritası (Q4); admin rolü davranışı değişmez, testle sabitlenir (Q5); ipucu yalnız düzenlenen listede kasa yokken (Q6); Kasa kutusu "(varsayılan kapalı)" ibaresi alır (Q7); sürüm notu planın §6'sında (Q8); `"kasa"`ya dayanan mevcut testlere yalnız `"kasa"` eklenir (Q9); kanıt iki menü ekranı ve izin ekranı (Q10). Planlamada bulunan iki ek nokta R19 ve R20 olarak yazıldı.<br>**R3 (2026-09-30, triyaj):** virman, avans ve verilen çek Kasa sekmesi ister (R21, bulgu 1); geri yükleme bunları da korur ve hesabı olmayan harekete dair sınır R19'a yazıldı (bulgu 2). |

---

## Intent

Sunucu kullanıcı izinlerinde Giderler ve Finans için sekme kutusu var, **Kasa için yok.** Bu bir unutma
değil, 0024 C6'da verilmiş bilinçli bir karardı: Kasa türev bir sekme, Giderler ve Finans birlikte
görünüyorsa kendiliğinden görünüyor. Gerekçesi hâlâ geçerli, çünkü Kasa ekranı paranın hem girişini hem
çıkışını gösteriyor ve yarım veriyle yanlış bakiye üretmemesi gerekiyor.

Ama kararın iki sonucu yönetimi kilitliyor:

- **Kasa'yı geri alamıyorsunuz.** Giderler ve Finans verilen her kullanıcı Kasa'yı otomatik görüyor:
  hesap bakiyeleri, çalışan avansları, çek portföyü. Bunu kapatmanın yolu yok.
- **Kasa'yı Finans vermeden veremiyorsunuz.** Gideri ve kasayı yöneten ama satış cirosunu görmemesi
  gereken bir kullanıcıya Kasa açmak için Finans'ı da açmak gerekiyor.

Bugün yalnız kısmi bir imkân var: `giderActions` altındaki hesap, virman ve avans izinleri ayrı ayrı
kısıtlanabiliyor, yani kullanıcının Kasa'da ne **yapacağı** sınırlanabiliyor; ekranı **görmesi**
engellenemiyor.

Başarı şu demek: yönetici Kasa'yı bir kullanıcıya açıkça verebiliyor ya da alabiliyor, ve bunu yaparken
yanlış bakiye gösterme ihtimali açılmıyor.

---

## Requirements

- **R1.** Kullanıcı izinlerindeki sekme listesine **"Kasa"** eklenir ve yönetici onu işaretleyip
  kaldırabilir.
- **R2.** Kasa'nın görünürlüğü şu kuralla belirlenir: **kutu işaretli** **ve** Giderler görünür **ve**
  Finans görünür. 0024 C6'nın veri kuralı ortadan kalkmaz, **önkoşul** olarak kalır.
  **Uygulama noktası tek şarttır:** `src/lib/permissions.js:45` bugün
  `tabs.filter(t => allowed.includes(t.id) || t.id === "kasa")` diyor; `|| t.id === "kasa"` kasayı izin
  listesinden **muaf** tutuyor. Yapılacak iş bu muafiyeti kaldırmak ve `kasaSuz`'u aynen korumaktır;
  ikinci bir kapı açılmaz.
  **Sekme listesi tanımsız kullanıcıda** Kasa görünmez: `gorunurSekmeler` tanımsızda gider'i düşürüyor ve
  `kasaSuz` önkoşul sağlanmadığı için kasayı da düşürüyor. Bu, 0001 C6 kural 3'ün doğal sonucudur; yeni bir
  istisna yazılmaz.
- **R3.** **Mevcut kullanıcılar hak kaybetmez**, ama bu **istemcide bir yokluk kuralıyla değil, veride bir
  kerelik geri doldurmayla** sağlanır (R12). Geri doldurmadan sonra kural tektir: listede "kasa" varsa
  görünür, yoksa görünmez. Yokluğa bakan bir kural yazılmaz, çünkü UserManager her kayıtta **tam diziyi**
  yazıyor (`UserManager.jsx:313` kutuları `ALL_TABS` üzerinden çiziyor): yönetici eski bir kullanıcıda Kasa
  kutusunu kaldırıp kaydederse liste yine "kasa" içermez ve yokluk kuralı hakkı **geri verirdi**; AC-2 ile
  AC-6 aynı veride birbirini iptal ederdi.
- **R4.** Geri doldurmadan sonra eski kullanıcının listesinde "kasa" yazılı olduğu için yönetici onu
  düzenlemek açtığında kutu **işaretli gelir** ve kaydetmek hakkı kazara almaz; bu, özel bir arayüz kuralı
  değil, verinin doğal sonucudur.
  **Kapsam notu:** kural sekme listesi **olan** kullanıcılar içindir. Listesi **tanımsız** bir kullanıcıyı
  düzenlemek için açıp kaydetmek onu bugün de altı varsayılan sekmeye daraltıyor
  (`UserManager.jsx:79`: `parseTabPerms(u.permissions) ?? [...DEFAULT_USER_TABS]`); bu, bu işten önce var
  olan bir davranıştır ve kapsam dışıdır (X6).
- **R5.** Yeni kullanıcının varsayılan sekme listesi değişmez: Giderler gibi Kasa da varsayılanda yoktur
  ve yalnız açıkça verilir.
- **R6.** Yönetici (admin) rolü etkilenmez; bugünkü gibi her şeyi görür.
- **R7.** Sunucu tarafında **hesap tanımları** (`kasaHesaplari`) Kasa sekmesine bağlanır: Kasa'sı olmayan
  kullanıcı hesap açamaz, düzenleyemez, kapatamaz. Üç ayrıntı birlikte yazılıdır:
  1. `BOLUM_SEKMELERI.kasaHesaplari` `["kasa"]` olur.
  2. Bölüm **`GIDER_BOLUMLERI` kümesinde kalır**, böylece sekme listesi tanımsız kullanıcı yine yazamaz
     (`sekmeEngelli` `:218` ve `giderAynaEngeli` `:288-293` o kümeye bakıyor); kümeden çıkarılmaz.
  3. Sunucu **ön koşulu da uygular**: bu bölüm için `"kasa"` **ve** `"gider"` **ve** `"finance"` aranır.
     Gerekçe: `sekmeEngelli` türetilmiş görünür listeyi değil **ham `perms.tabs` dizisini** okuyor
     (`tabs.includes(t)`), dolayısıyla ön koşul yazılmazsa "kasa" yazılı ama Finans'ı olmayan kullanıcı,
     arayüzde göremediği ekranın verisini sunucuda yazabilir. Küçük bir yardımcı olarak `sekmeEngelli`'nin
     yanında durur ve testle sabitlenir.
- **R8.** **Ödeme hareketleri** (`hesapHareketleri`) Giderler sekmesinde kalır, çünkü ödeme gider
  formundan ve ödeme penceresinden de yazılıyor; Kasa'sı olmayan bir gider kullanıcısı ödemesini
  kaydedebilmeye devam eder.
- **R9.** Kasa'sı olmayan kullanıcıda bugünkü türev davranışlar aynen sürer: tahsilat ve ödeme
  formlarındaki hesap seçici çizilmez, kayıt hesapsız yapılır ve hiçbir bakiyeye girmez.
- **R10.** Çek portföyü Kasa ekranının içindedir: Kasa kapalıysa portföy de kapanır ve gider formundaki
  "Çek (ciro)" ile "Çek (kendi)" seçenekleri görünmez (bugünkü kural korunur).
- **R11.** Kasa'nın eylem izinleri (`kasa_hesap`, `virman`, `avans`, `gider_odeme`) bugünkü yerinde
  kalır; sekme izni onların yerine geçmez, üstüne gelir. İzin ekranında bu kutular **Kasa'sı olmayan
  kullanıcıda da yerinde kalır ve işaretlenebilir** (izin ekranı bir bağımlılık ağacı değildir); etkisiz
  oldukları tek satır ipucuyla söylenir ("Kasa sekmesi olmayan kullanıcıda bu eylemler kullanılmaz").
  Böylece yönetici Kasa'yı sonradan açtığında izinler hazır olur.

### QA turunda eklenenler

- **R12.** **Bir kerelik geri doldurma (sunucu tarafı).** Sunucu veritabanı açılışında, sekme listesinde
  hem `gider` hem `finance` olup `kasa` olmayan kullanıcıların listesine `"kasa"` eklenir; işlem
  `meta.kasaSekmeGocu0052` ile **bir kez** çalışır (`kasaGocu0024` ile aynı yer ve aynı desen). Yedek
  almaya gerek yoktur, yalnız izin listesine bir değer eklenir. **Yerel modda çalışmaz**, çünkü orada
  kullanıcı kaydı ve izin yoktur. Geri doldurmadan sonra istemci ve sunucu **aynı ham listeyi** okur ve
  R3'ün belirsizliği ortadan kalkar.
- **R13.** **Salt okunur modda** (`READONLY_SERVER_PERMISSIONS`, bağlantı kopukluğu) bugünkü davranış
  korunur: o set bilerek `tabs` taşımıyor, tanımsız dalı çalışır, gider görünmez ve dolayısıyla Kasa da
  görünmez. Ekran bağlantı kopukluğunda kendiliğinden açılmaz.
- **R14.** **0044'ün sunucu istisnası Kasa sekmesine bağlanmaz.** `tahsilatHesabiYalnizMi` bugünkü gider
  **ve** finans şartıyla kalır; aksi hâlde "Kasa sekmesi olmayan Kasa kullanıcısı" gibi bir kavram doğar.
- **R15.** **Mali İşler grubu (0043):** Kasa kapatılıp Finans ile Giderler kaldığında grup **çizilmeye
  devam eder** (0043'ün kuralı yalnız **tek** ekran kalınca grubu kaldırıyor); yalnız biri kalırsa düz
  satır olur.
- **R16.** **Okuma tarafı değişmez.** Bu iş **yazma yetkisini** ve **ekran görünürlüğünü** düzenler;
  `GET /api/data` bütün blobu vermeye devam eder, yani `kasaHesaplari` verisi Kasa'sı olmayan kullanıcıya
  da iner. Okuma filtresi bu uygulamada bilinçli olarak yoktur ve bu spec o kararı değiştirmez.
- **R17.** **Güncellenmemiş istemci.** Sekme görünürlüğü istemcide hesaplandığı için eski sürümlü bir PC
  muafiyet şartıyla çalışmaya devam eder ve kaldırılan Kasa o ekranda görünür. Gerçek kapı **sunucu
  eşlemesidir** (R7): yazma o PC'de de reddedilir. Sürüm notunda tek cümleyle söylenir.
- **R18.** **`ALL_TABS`'a kasa eklemenin iki yan etkisi kabul edilir:** admin rolüne geçirilen kullanıcının
  listesine "kasa" yazılır (`UserManager.jsx:300`, zararsız) ve izin özetindeki "n / m" oranının m değeri
  değişir (`:340`, kozmetik).

### Plan onayında eklenenler

- **R19.** **Yedek geri yüklemesi hesap tanımlarına Kasa izniyle dokunur.** Giderler paketinin geri yüklenmesi
  `kasaHesaplari`'nı da yazıyor. R7'den sonra Kasa'sı olmayan kullanıcının bu yazımı sunucuda 403 alır ve bütün
  kayıt reddedilirdi. Kasa sekmesi olmayan kullanıcıda geri yükleme hesap tanımlarına dokunmaz, geri kalan her şey
  bugünkü gibi yüklenir. Karar perdeden bağımsızdır (0008 K3 deseni). Triyajdan sonra (R21) aynı kural virman ve
  avans hareketleri ile verilen çekler için de geçerlidir: bu kayıtlar bugünkü hâliyle korunur, bölümün geri kalanı
  (ödeme ve mahsup hareketleri, alınan çekler) yedekten gelir.
  **Bilinen sınır (triyaj bulgu 2, kabul edildi):** yedekten gelen ödeme hareketleri, yedekten sonra silinmiş ya da
  bugünkü veride hiç olmayan bir hesaba bağlı olabilir. Böyle bir hareket hiçbir bakiyeye girmez ve `hesapId`'si dolu
  olduğu için hesapsız listede de görünmez; aynı şekilde korunan bir verilen çekin yedekte olmayan ödeme hareketi
  düşebilir. Kasa'sı olan bir kullanıcının tam geri yüklemesi bölümleri tutarlı hâle getirir.
- **R20.** **Salt okunur mod (R13) netleştirildi.** Uygulama sekme görünürlüğünü bağlantı kopukken de son bilinen
  sunucu izninden hesaplar; `READONLY_SERVER_PERMISSIONS` yalnız eylem düğmelerini kapatır. Yani bağlantı koptuğunda
  menü değişmez, Kasa'sı olmayan kullanıcıda Kasa açılmaz. R13'ün kanıtı fonksiyon düzeyindedir: salt okunur izin
  seti `gorunurSekmeler`'e verilirse Kasa görünmez (AC-21). Bu, bu işten önce de böyleydi ve değişmedi.

### Triyajda eklenenler

- **R21.** **Kasa ekranına özgü hareketler de Kasa sekmesi ister (triyaj bulgu 1).** R7 yalnız hesap tanımlarını
  bağlıyordu; ama bakiyeyi yalnız Kasa ekranından değiştiren başka kayıtlar da var. Sunucuda virman ve avans hareketi
  ile verilen (kendi) çekin eklenmesi, düzenlenmesi ve silinmesi `"kasa"` **ve** `"gider"` **ve** `"finance"` ister,
  eylem izni (`virman`, `avans`, `gider_odeme`) ayrıca aranır. Ödeme ve mahsup hareketleri ile alınan çekler Giderler'de
  kalır (R8 bozulmaz). Böylece R17'nin "gerçek kapı sunucudadır" cümlesi virman, avans ve kendi çek için de doğrudur.

---

## Constraints

- **C1.** Yeni izin **boyutu** tanımlanmaz; eklenen tek şey bir sekme kimliğidir.
- **C2.** Veri modeli değişmez: sekme listesi zaten bir metin listesidir, yeni sütun ya da yeni alan
  açılmaz. **Tek veri işlemi R12'nin bir kerelik geri doldurmasıdır** (mevcut listeye bir değer ekler,
  `meta` işaretiyle bir kez çalışır); şema göçü değildir.
- **C3.** Kiosk kipi ve menü grubu (0043) etkilenmez; Mali İşler grubu izin süzmesinden sonra tek ekran
  kalırsa bugünkü gibi düz satır olur.
- **C4.** Hiçbir bakiye, tutar ya da kayıt değişmez.
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Kasa'nın **Finans olmadan** verilebilmesi — *neden:* bakiye müşteri tahsilatlarından da
  besleniyor; Finans'ı göremeyen kullanıcıya bakiye göstermek, göremediği veriden üretilmiş bir rakam
  göstermek olur. Bunu açmak kasa modelinin baştan gözden geçirilmesini gerektirir ve kendi spec'ini
  ister.
- **X2.** Kasa için ayrı bir izin boyutu (`kasaActions`) — *neden:* eylemler zaten `giderActions` içinde
  ve orada doğru yerde duruyor (0024 C6/Q7).
- **X3.** Çek portföyünün kendi sekmesi olması — *neden:* portföy kasa ekranının bir görünümü; ayırmak
  menüyü uzatır ve 0043'ün grup kuralına takılır.
- **X4.** Giderler sekmesinin izin kuralının değişmesi — *neden:* 0001 C6 kural 3 yerinde duruyor.
- **X5.** İstemcide yokluğa bakan bir eski kayıt kuralı — *neden:* R3 ve R12; yokluk "verilmedi" ile
  "kaldırıldı"yı ayırt edemediği için kural veriye taşındı. Geri doldurma bir kez çalışır ve arkasında
  temizlenecek bir kural bırakmaz.
- **X6.** Sekme listesi **tanımsız** kullanıcıyı düzenlemenin onu varsayılan altı sekmeye daraltması —
  *neden:* `UserManager.jsx:79` bugün de böyle davranıyor; bu işten önce var olan bir davranıştır, Kasa ile
  ilgisi yoktur ve düzeltilmesi ayrı bir iştir.
- **X7.** Okuma filtresi (Kasa verisinin yetkisiz kullanıcıya hiç inmemesi) — *neden:* R16; bu uygulamada
  okuma filtresi bilinçli olarak yok ve değiştirmek bütün veri akışını kapsayan ayrı bir karardır.

---

## Context

- **Bugünkü kural (satırıyla doğrulandı).** `src/lib/permissions.js` `gorunurSekmeler` içinde `kasaSuz`
  (`:35-38`) `kasa`'yı yalnız `gider` ve `finance` birlikte görünüyorsa geçiriyor. Asıl nokta **`:45`**:
  `return kasaSuz(tabs.filter(t => allowed.includes(t.id) || t.id === "kasa"));` — `|| t.id === "kasa"`
  kasayı izin listesinden muaf tutuyor. İşin tamamı bu şartın kaldırılmasıdır (R2).
  `serverPermissionDefs.js` `ALL_TABS` listesinde `kasa` **yok**, bu yüzden UserManager'da kutusu
  çizilmiyor; `DEFAULT_USER_TABS` ise `["dashboard","customers","dealers","stock","evrak","notes"]`, yani
  ne gider ne finance ne kasa içeriyor (R5 kendiliğinden sağlanıyor).
- **Sunucu ham listeyi okuyor (doğrulandı).** `serverAuth.cjs:216-222` `sekmeEngelli` türetilmiş görünür
  listeyi değil `perms.tabs.includes(t)`'yi kullanıyor. Bu iki yönlü ayrışma üretir: eski kullanıcı ekranı
  görüp kayıtta 403 alır, "kasa" yazılı ama Finans'ı olmayan kullanıcı görmediği ekranın verisini yazabilir.
  R7'nin üçüncü maddesi ve R12'nin geri doldurması bu yüzden şart.
- **Kayıt tam diziyi yazıyor (doğrulandı).** UserManager kutuları `ALL_TABS` üzerinden çiziyor (`:313`) ve
  kayıtta listenin tamamını gönderiyor; bu yüzden "listede kasa yok" bir niyet bilgisi taşımıyor (R3).
- **0044'ün istisnası ayrı durur.** `serverAuth.tahsilatHesabiYalnizMi` Giderler **ve** Finans sekmesi
  isteyen bir gevşetme; Kasa sekmesine bağlanmaz (R14), yoksa kasasız bir Kasa kullanıcısı kavramı doğar.
- **Eylem izinleri zaten ayrı.** Aynı dosyada `giderActions` altında "Hesap ekle, düzenle, kapat ve sil"
  (`kasa_hesap`), "Hesaplar arası virman" (`virman`) ve "Çalışana avans ver ve sil" (`avans`) kutuları
  var. Yani yöneticinin elinde kısmi bir araç var; eksik olan ekranın kendisini kapatmak.
- **Sunucu eşlemesi.** `serverAuth.cjs`'te `kasaHesaplari` ve `hesapHareketleri` bölümleri
  `giderActions` grubunda ve ikisinin de sekme eşlemesi `["gider"]`. R7 ile hesap tanımları Kasa'ya
  bağlanıyor; R8 ile hareketler Giderler'de kalıyor, çünkü 0024'ten beri ödeme bir harekettir ve gider
  formundan (0046) da yazılıyor. Bu ayrımı atlamak, Kasa'sı olmayan gider kullanıcısının ödeme
  kaydedememesine yol açar.
- **Türev görünümler zaten kasa yetkisine bakıyor.** 0044 tahsilat hesabı seçicisini, 0046 gider
  formundaki hesap alanını ve ciro seçeneğini `kasaYetki`ye bağladı. Sekme izni bu değişkeni beslediği
  için türev ekranlar kendiliğinden doğru davranır; yeni bir kapı açmak gerekmez (R9, R10).
- **Neden eski kayıt kuralı şart.** Sekme listeleri kullanıcı kayıtlarında duruyor ve hiçbirinde "kasa"
  yazmıyor. Kuralı katı yaparsak sürüm çıktığı gün Giderler ve Finans yetkisi olan **herkes** Kasa'yı
  kaybeder ve yönetici tek tek açmak zorunda kalır. R3 bunu önlüyor, R4 de yöneticinin bir kullanıcıyı
  kaydederken hakkı kazara almasını engelliyor.

---

## Acceptance Criteria

- **AC-1.** Kullanıcı izinleri ekranında "Kasa" sekme kutusu görünür.
- **AC-2.** Giderler ve Finans verilmiş bir kullanıcıda Kasa kutusu kaldırılınca kullanıcı Kasa sekmesini
  görmez.
- **AC-3.** Kasa kutusu işaretli ama Finans verilmemiş kullanıcı Kasa'yı görmez.
- **AC-4.** Kasa kutusu işaretli ama Giderler verilmemiş kullanıcı Kasa'yı görmez.
- **AC-5.** Üçü birden olan kullanıcı Kasa'yı görür.
- **AC-6.** Geri doldurmadan (R12) sonra, Giderler ve Finans'ı olan eski kullanıcının listesinde "kasa"
  yazılıdır ve Kasa'yı görmeye devam eder.
- **AC-7.** Böyle bir kullanıcı düzenlemek için açıldığında Kasa kutusu işaretli gelir ve kaydedilince
  hakkı korunur; kutu kaldırılıp kaydedilirse hak **kalıcı olarak** gider (yokluk kuralı yoktur).
- **AC-8.** Yeni kullanıcının varsayılan sekmelerinde Kasa yoktur.
- **AC-9.** Yönetici rolü Kasa'yı her hâlükârda görür.
- **AC-10.** Kasa'sı olmayan kullanıcı sunucudan hesap tanımı ekleyemez, düzenleyemez, silemez (403);
  listesinde "kasa" olsa bile Finans'ı yoksa yine reddedilir (R7 ön koşulu).
- **AC-11.** Kasa'sı olmayan gider kullanıcısı ödeme kaydedebilir (hareket yazımı 403 almaz).
- **AC-12.** Kasa'sı olmayan kullanıcıda tahsilat ve ödeme formlarındaki hesap seçici çizilmez; kayıt
  hesapsız yapılır ve bakiyeye girmez.
- **AC-13.** Kasa'sı olmayan kullanıcıda çek portföyü ve gider formundaki çek seçenekleri görünmez.
- **AC-14.** Kasa kapatılıp Finans ile Giderler kaldığında Mali İşler grubu çizilmeye devam eder.
- **AC-15.** Süzmeden sonra grupta tek ekran kalırsa düz satır olarak çizilir (0043 kuralı bozulmaz).
- **AC-16.** Bu iş hiçbir bakiyeyi, tutarı ya da kaydı değiştirmez.

### QA turunda eklenen kriterler

- **AC-17.** Geri doldurma bir kez çalışır; ikinci açılışta aynı kullanıcıya ikinci bir "kasa" eklenmez
  (`meta.kasaSekmeGocu0052`).
- **AC-18.** Geri doldurma yalnız gider **ve** finance'ı olan kullanıcılara dokunur; başka hiçbir
  kullanıcının listesi değişmez.
- **AC-19.** Yerel modda geri doldurma çalışmaz ve hata vermez.
- **AC-20.** Sekme listesi tanımsız kullanıcı Kasa'yı görmez (R2).
- **AC-21.** Salt okunur modda (bağlantı kopuk) Kasa görünmez (R13).
- **AC-22.** `kasaHesaplari` bölümü `GIDER_BOLUMLERI` kümesinde kalır: sekme listesi tanımsız kullanıcı
  hesap yazamaz (R7).
- **AC-23.** 0044'ün tahsilat hesabı istisnası Kasa sekmesi olmadan da çalışmaya devam eder (R14).
- **AC-24.** `kasa_hesap`, `virman` ve `avans` kutuları Kasa'sı olmayan kullanıcıda da çizilir ve
  etkisizlik ipucusu görünür (R11).
- **AC-25.** Kasa verisi Kasa'sı olmayan kullanıcıya inmeye devam eder; okuma filtresi eklenmemiştir
  (R16).
- **AC-26.** İzin özetindeki "n / m" oranı yeni sekmeyle güncellenir ve admin rolüne geçirilen kullanıcının
  listesine "kasa" yazılır (R18).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Görünürlük kuralı tek yerde (`gorunurSekmeler`); ekranlar kendi kuralını yazmadı.
- [ ] Geri doldurma testle kapsandı: bir kez çalışır, yalnız doğru kullanıcılara dokunur, yerel modda
      çalışmaz (AC-17, AC-18, AC-19).
- [ ] İstemcide yokluğa bakan bir kural yazılmadı (kaynak taraması); görünürlük yalnız `gorunurSekmeler`
      içindeki tek şartla belirlenir (R2, R3).
- [ ] Sunucu ön koşulu (kasa + gider + finance) ve `GIDER_BOLUMLERI` üyeliği testle sabitlendi (AC-10,
      AC-22).
- [ ] Sunucu eşlemesi güncellendi ve uçtan uca testte sabitlendi (AC-10, AC-11).
- [ ] Görsel kanıt eklendi (`docs/evidence/0052-*.jpg`): izin ekranındaki kutu, kasasız kullanıcının
      menüsü.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: Kasa artık kendi sekme iznine sahip, önkoşul kuralı ve eski kayıt kuralı.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
