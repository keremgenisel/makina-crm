# 0051 — Bakım Paketi: Hesapsız Kayıtlarda Başlangıç Tarihi ve Ödemenin Hangi Hedefi Kapattığı

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-09-30; plan `specs/0051-uygulama-plani.md` Q1–Q10). Uygulanıyor, dal `feat/0051-kasa-bakim`. |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kasa ekranı (hesapsız ödeme ve tahsilat listeleri, hareket listesi), gider ayarları |
| **Bağımlı spec'ler** | 0021 (ödeme hedefleri) · 0024 (kasa, hesapsız hareketler) · 0041 (`hareketPaylari`) · 0042 (personelin iki hedefi) · 0044 (hesapsız tahsilatlar) · 0047 (aynı süzme fonksiyonlarını çağırır) |
| **Revizyon** | R1 (QA turu, 2026-09-30): geliştirici hazırlığı denetimi, 16 bulgu işlendi, 5'i bloklayıcıydı. Tarihsiz kayıtların gizlenmesi (R12), süzme parametresinin tek eşiği alamaması (R13), eşiğin 0047 raporuna sızma riski (X6), R7'nin izin duvarı (R7) ve R8'in satırsız kalemde çözülemez olması (R8) karara bağlandı. **Spec onaylandıktan sonra değiştiği için SCORECARD'ın "Spec revizyon sayısı" ölçütü 1'dir.**<br>**R2 (2026-09-30, plan onayı):** `hareketPaylari` hedef bazlı pay vermediği için aynı yöntemle çalışan kardeş fonksiyon `hareketHedefPaylari` (R8/Q1); mahsup Kasa hareket listesinde görünmediği için etiket çalışan ekstresinde ve ödeme penceresinde de (R10/Q2); tarihsiz kayıt açık `tarihsizDahil` bayrağıyla (R12/Q3); etiket yalnız birden çok hedefli kalemde (R8/Q4); bölünmüş hareket tutarlarıyla (Q5); ödeme tarafında liste yok, sayılar ve eşik satırı (R5/Q6); öneri düğmesi (R4/Q7); doğrulama `kasa.js`'te, yerel bugün (R15/Q8); kalıcılık roundtrip (R14/Q9); görsel kanıt (Q10). |

---

## Intent

Gerçek kullanımda iki ayrı sorun bildirildi; ikisi de küçük, ikisi de Kasa ekranında ve tek işte
yapılabilir.

**Birincisi, hesabı belirtilmemiş kayıtlar listesi geçmişle dolu.** Sistem kullanılmaya başlamadan
önceki tahsilatlar ve ödemeler de bu listede duruyor. Kullanıcı onları hesaba bağlamaya kalkarsa geçmiş
dönemin bakiyesi değişir, oysa geçmişe dönük maliyet ve kasa hesabı yapılamaz. Liste bu hâliyle bir iş
listesi değil, bir gürültü yığını.

**İkincisi, bir ödemenin hangi borcu kapattığı Kasa'da görünmüyor.** Kira kaleminin stopajı için yapılan
ödeme, hareket listesinde "Kira" diye yazıyor ve yanında küçük bir tutar duruyor. Kullanıcı kirayı eksik
ödenmiş sanıyor. Aynı belirsizlik personelde de var: resmi kısma mı elden kısma mı ödendiği yazmıyor.

Başarı şu demek: hesapsız kayıtlar listesi yalnız gerçekten düzeltilebilecek dönemi gösteriyor, ve her
ödeme hareketinin hangi hedefi kapattığı okunuyor.

---

## Requirements

### A. Hesapsız kayıtlarda başlangıç tarihi

- **R1.** Kasa ekranındaki **hesabı belirtilmemiş ödemeler (ve avanslar)** ile **hesabı belirtilmemiş
  tahsilatlar** listeleri bir **başlangıç tarihine** göre süzülür: bu tarihten önceki kayıtlar listede
  görünmez. Ödeme listesi bugün hesapsız ödemeleri **ve hesapsız avansları** birlikte gösteriyor
  (0024 B4); eşik ikisine de aynı kuralla uygulanır. Ciro ve kendi çek hareketleri bu listede hiç yer
  almaz (0040 R18, 0049): kasıtlı olarak hesapsızdırlar, dolayısıyla eşikten de etkilenmezler.
  Tahsilat listesi yalnız "hesapsız" değil **üç sorunu** birlikte gösteriyor (`hesapsizTahsilatlar`'ın
  `neden` alanı: `hesapsiz`, `hesapYok` = silinmiş hesap, `paraBirimi` = hesap ile kaydın para birimi
  uyuşmuyor); eşik üçüne de uygulanır, ama R7'nin satırı gizlenenleri **nedene göre** kırar ki gerçek veri
  hataları eşik altında sessizce kaybolmasın.
- **R2.** Süzgeç bir **tek eşik tarihidir** ("bu tarihten sonrakileri göster"), tarih aralığı değildir.
  Karşılaştırılan tarih listede **görünen** tarihtir: hesapsız ödemede hareketin `tarih`i, hesapsız
  tahsilatta `tahsilatTarihiOf`'tan gelen `k.tarih`. Böylece kullanıcı neyin süzüldüğünü tablodan
  okuyabilir.
- **R3.** Tarih **Ayarlar › Giderler › Gider Ayarları**'nda tutulur; boş bırakılabilir, boşken bütün
  kayıtlar görünür (bugünkü davranış).
- **R4.** İlk kurulumda alan boş gelir; ekranda gider yürürlük ayının başlangıcı **önerilir**, ama
  kendiliğinden yazılmaz.
- **R5.** Listedeki **sayıların tamamı** aynı süzgeçten geçer. `hesapsizOdemeler` üç sayı döndürüyor
  (`adet`, `gocAdet`, `avansAdet`); ekranda gösterilen her sayı süzülmüş kümeden gelir ve sayı ile listenin
  uzunluğu her zaman uyuşur.
- **R6.** Bu bir **liste süzgecidir, bakiye süzgeci değildir.** Eşik altındaki hesapsız kayıt hesapsız
  kalmaya devam eder, hiçbir bakiyeye girmez ve silinmez; yalnız iş listesinde görünmez.
- **R7.** Ekran, listenin süzüldüğünü ve kaç kaydın eşik altında kaldığını söyler; sayı R1'deki nedenlere
  göre kırılır ve **tarihi olmayan kayıtlar ayrıca sayılır** (R12). "Hepsini göster" **ekran içinde geçici
  bir anahtardır**: ayarı değiştirmez ve hatırlanmaz. Ayarın kendisi Gider Ayarları'nda `gider_tanim` ile
  kalır (C4); Kasa kullanıcısının (gider **ve** finans sekmesi) bu eylem izni olmayabileceği için eşiği
  kaldırmak ayarı düzenlemeyi gerektirmez.

### B. Ödemenin hangi hedefi kapattığı

- **R8.** Kasa'nın hareket listesinde bir gider ödemesi, **kapattığı hedefi** yazar: kira stopajında
  **vergi dairesi**, personelde **resmi** ya da **elden**, diğerlerinde bugünkü karşı taraf. **Hedef iki
  dallı çözülür:**
  1. Hareketin `taksitId`'si varsa kalemin o satırının `hedef`i okunur.
  2. `taksitId` yoksa (satırsız kalem) **0041'in `hareketPaylari`'sı** ile o hareketin hangi hedefe ne
     kadar düştüğü hesaplanır; tek hedefe düştüyse o hedef, iki hedefe bölündüyse ikili ibare yazılır.

  İkinci dal zorunludur, çünkü satırsız kalemde ödeme `odemeleriUygula`'nın satırsız dalında **önce ana,
  artan ikinci hedefe** dağılıyor ve tek hareket iki hedefi birden kapatabiliyor. Bu küme satırsız eski
  kirayı (0021 R13) ve satırsız personeli (0042 R8) kapsar, yani R11'in "göç hareketi" istisnasından çok
  daha geniştir. Yeni bir hesap yazılmaz, mevcut fonksiyon çağrılır (C2).
  **Uygulama (R2, Q1, Q4, Q5):** `hareketPaylari` hareketin yalnız toplam payını verir, hedefini vermez. Aynı yöntemle
  (hareketler sırayla motordan geçer, hedef başına kalan farkı) çalışan `odemeYontemi.hareketHedefPaylari` hareket
  başına `[{hedef, payK}]` döndürür; `hareketPaylari` değişmez. Etiket yalnız kalemin birden çok ödeme hedefi varsa
  (stopajlı kira, resmi ve eldeni olan personel) yazılır; normal ve tek hedefli personel kalemi bugünkü metniyle kalır.
  İki hedefe bölünen hareket "Resmi 30.000 ₺ + Elden 9.500 ₺" biçiminde tutarlarıyla yazar.
  **Mahsup hareketleri de kapsamdadır** (0024 B: mahsup bir gider hedefini kapatır); etiket "Avanstan
  mahsup · Resmi" biçiminde olur.
- **R9.** Stopaj ödemesi artık yalnız "Kira" diye görünmez; kalemin türü ile hedefi birlikte okunur
  (örnek: "Kira · vergi dairesi (stopaj)").
- **R10.** Aynı kural hesap ekstresinde ve ödeme hareketinin göründüğü diğer listelerde de geçerlidir;
  hedef adı tek yerden gelir (`hedefAdi`), ekranlar kendi metnini yazmaz. **Ekstrede hedef zaten kayıtta
  var** (0042: ödeme satırı `hedef` taşır), dolayısıyla oradaki iş yalnız `hedefAdi` ile basmaktır.
  `hedefAdi(hedef, davranis, ikiHedef)` üçüncü parametresi için **`eldenHedefliMi(kalem.taksitler)`**
  (0042) kullanılır; ekranda ikinci bir koşul yazılmaz.
  **Uygulama (R2, Q2, Q4):** mahsup hesapsız olduğu için Kasa hareket listesinde hiç görünmez; etiket üç yerdedir:
  Kasa hareket listesi (hesaplı ödemeler), çalışan ekstresi (ödeme ve mahsup) ve ödeme penceresinin "Kayıtlı ödemeler"
  listesi (satırsız kalemde bugün "Kalem" yazıyor). Satırsız iki hedefli personelde satır olmadığı için üçüncü
  parametre `personelIkiHedef(k)`'dan gelir (tek ek koşul). Tedarikçi ekstresi yalnız ana hedefi saydığı için değişmez.
- **R11.** İki dalın da (R8) çözemediği hareketlerde bugünkü metin korunur; uydurma yapılmaz. Tipik durum:
  tutarsız göç hareketi ya da silinmiş kalem.

### C. QA turunda eklenenler

- **R12.** **Tarihi olmayan hesapsız kayıtlar eşikten bağımsız her zaman görünür.** Bugünkü süzme
  yardımcısı `kasa.js:124` `aralikta = (tarih, aralik) => !aralik || (!!tarih && ...)` olduğu için aralık
  verildiği an tarihsiz kayıtlar dışlanıyor; `kasaGocuSaf.mjs` göç hareketlerini `tarih: r.odemeTarihi ?? null`
  ile yazdığı için tarihsiz hesapsız hareket gerçek bir kümedir. Kural: tarih yoksa göster, varsa eşikle
  karşılaştır. R7'nin satırı bunları ayrıca sayar ("tarihi olmayan n kayıt").
  **Gerekçe:** eşiğin amacı gürültüyü azaltmak; tarihsiz göç kaydı gürültü değil, düzeltilmesi gereken
  şeyin kendisidir.
  **Uygulama (R2, Q3):** tarihsiz kayıt yalnız açık `tarihsizDahil: true` bayrağıyla dahil edilir (eşik çağrısı);
  0047'nin ay aralıklı çağrısı bayraksız olduğu için bugünkü gibi tarihsizi dışlar.
- **R13.** **Süzme parametresi tek eşiği kabul eder.** `hesapsizOdemeler(hareketler, aralik)` ve
  `hesapsizTahsilatlar(veri, hesaplar, aralik)` bugün `{baslangic, bitis}` bekliyor ve `aralikta` iki
  sınırı da şart koşuyor. `aralik.bitis` **isteğe bağlı** hâle getirilir
  (`(!aralik.bitis || tarih <= aralik.bitis)`); böylece 0047'nin ay aralığı aynen çalışır, 0051'in eşiği
  aynı parametreden geçer ve ikinci bir süzme yolu yazılmaz (C2). `bitis: "9999-12-31"` hilesi üst sınırın
  anlamını gizlediği için kullanılmaz.
- **R14.** **Ayar alanı:** `appSettings.giderAyarlari.hesapsizBaslangic`, `"YYYY-MM-DD"` biçiminde tam
  tarih (ay değil, R2 tek eşik tarihi diyor); boş dize "eşik yok" demektir. `hatirlatmaEsikGun` deseni,
  yeni sütun yok (C3).
- **R15.** **Geçersiz tarih:** biçimsiz değer ve **gelecek tarih** reddedilir, hata metni nedeni söyler.
  Alanın anlamı "sistemin kullanılmaya başladığı tarih"tir, gelecekte olamaz ve listeyi bütünüyle
  boşaltır. Gider yürürlük ayından önceki bir tarih **serbesttir**; ikisi farklı kavramdır.

---

## Constraints

- **C1.** Hiçbir tutar, bakiye ya da kayıt değişmez; bu iş yalnız süzme ve etiketleme.
- **C2.** **Tek gerçek kaynak:** hedef adı `hedefAdi`'dan, hesapsız kayıt listeleri
  `kasa.hesapsizOdemeler` / `hesapsizTahsilatlar`'dan, satırsız kalemin hedef payı 0041'in
  `hareketPaylari`'sından gelmeye devam eder; ikinci bir hesap ya da ikinci bir süzme yolu yazılmaz. Mevcut
  fonksiyonlar **geriye dönük uyumlu** genişletilir (R13): eşiksiz ve ay aralıklı çağrılar bugünkü
  çıktılarını birebir verir.
- **C6.** **Eşik yalnız Kasa ekranının iş listesine uygulanır.** 0047'nin raporu aynı iki fonksiyonu kendi
  ay aralığıyla çağırıyor (`giderRaporu.js:120` ve `:135`); eşik oraya geçmez (X6).
- **C3.** Yeni kalıcı sütun yoktur: başlangıç tarihi `appSettings.giderAyarlari` içinde bir alandır
  (`hatirlatmaEsikGun` deseni).
- **C4.** Tarih ayarı `gider_tanim` izni ister (Gider Ayarları'nın bugünkü kuralı).
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Eşik altındaki hesapsız kayıtların silinmesi ya da toplu kapatılması — *neden:* R6; veri
  duruyor, yalnız listede görünmüyor. Toplu işlem ayrı ve riskli bir karardır.
- **X2.** Başlangıç tarihinin bakiye hesabına uygulanması (o tarihten öncesini bakiyeden düşmek) —
  *neden:* açılış bakiyesi zaten bu işi yapıyor (0024); ikinci bir kesme noktası iki farklı bakiye üretir.
- **X3.** Gider listesine, borç özetine ya da rapora başlangıç tarihi süzgeci — *neden:* orada yürürlük
  ayı zaten var (0002).
- **X4.** Ödeme hareketinin hangi **taksite** gittiğinin listede yazılması — *neden:* hedef yeterli;
  taksit ayrıntısı ödeme planı penceresinde duruyor.
- **X5.** Kullanıcı başına ayrı başlangıç tarihi — *neden:* ayar firmanın, kullanıcının değil.
- **X6.** Başlangıç tarihinin **0047 aylık raporuna** uygulanması — *neden:* rapor bir muhasebe belgesi,
  eşik bir iş listesi kolaylığı. Rapor `hesapsizOdemeler` ve `hesapsizTahsilatlar`'ı kendi ay aralığıyla
  çağırıyor; eşik oraya da geçerse eşik öncesi bir ayın raporunda hesapsız bölümleri yanlışlıkla "yok"
  görünür. Rapor gerçeği yazmaya devam eder.
- **X7.** Eşiğin bakiyeye, gider listesine, borç özetine ya da ekstreye uygulanması — *neden:* X2 ve X3'ün
  aynı çizgisi; bakiye kesme noktası açılış bakiyesidir, dönem kesme noktası yürürlük ayıdır.

---

## Context

- **Hesapsız listeler nereden geliyor.** 0024 gider tarafında `hesapsizOdemeler`'i, 0044 gelir tarafında
  `hesapsizTahsilatlar`'ı getirdi; ikisi de Kasa ekranında sayı ve "Listeyi göster" ile duruyor. İkisinin
  de amacı **eksik veriyi düzeltmek**: kullanıcı kaydı açıp hesabını atıyor. Ama sistem öncesi kayıtlar
  da listede olduğu için liste iş listesi olmaktan çıkıyor.
- **Neden aralık değil eşik.** Kullanıcının kendi ifadesi: geçmişe dönük maliyet hesaplanamaz, kasa
  yanlış çıkar. Yani sorun "hangi aralığa bakayım" değil, "şu tarihten öncesi kapalı". Tek eşik hem
  daha az soru sorar hem yanlış kullanılamaz; aralık, kullanıcıyı ikinci bir tarih seçmeye zorlar ve
  arada kalan kayıtları gizlerken sebebini söylemez.
- **Bakiyeye dokunmama şartı kritik.** Eşik altındaki kayıtlar zaten hesapsız oldukları için hiçbir
  bakiyeye girmiyor (0024 R8). Süzgecin bakiyeye uygulanması gerekmiyor ve uygulanmamalı; yoksa
  ekrandaki bakiye ile motorun bakiyesi ayrışır. R6 bunu sabitliyor.
- **Stopaj etiketi (doğrulandı).** `Kasa.jsx` `satirAciklamasi` bir gider ödemesi için karşı tarafı
  şöyle çözüyor: çalışan adı, yoksa tedarikçi adı, yoksa **gider türünün adı**. Tedarikçisi olmayan bir
  kira kaleminde bu "Kira" oluyor. Fonksiyon hareketin `taksitId`'sine hiç bakmıyor, dolayısıyla
  ödemenin stopaj hedefine mi ana hedefe mi gittiği kayboluyor. Tutar stopaj taksidinin tutarı olduğu
  için satır "Kira" diyor ve küçük bir rakam gösteriyor; kullanıcının gördüğü tam olarak bu.
- **Hedef adı zaten var.** 0021 ve 0042 ile `hedefAdi(hedef, davranis, ikiHedef)` kira için "Kiraya
  veren" / "Vergi dairesine (stopaj)", personel için "Resmi" / "Elden" üretiyor. Eksik olan, hareketin
  taksit bağından hedefi çözüp bu fonksiyonu çağırmak. Üçüncü parametre için `eldenHedefliMi` (0042) var;
  ekstrenin ödeme satırı ise `hedef`i **zaten taşıyor** (0042), yani orada iş yalnız basmak.
- **Satırsız kalemde hedef hareketten okunamaz (QA turunda doğrulandı).** Hareket hedefi yalnız `taksitId`
  üzerinden taşıyor; satırsız kalemde `taksitId: null` ve ödeme `odemeleriUygula`'nın satırsız dalında önce
  ana, artan ikinci hedefe dağılıyor, yani tek hareket iki hedefi birden kapatabiliyor. Bu küme satırsız
  eski kirayı (0021 R13) ve satırsız personeli (0042 R8) kapsar. Çözüm 0041'in `hareketPaylari`'sıdır (R8),
  yeni hesap değil.
- **Süzme yardımcısının şekli (QA turunda ölçüldü).** `kasa.js:124`
  `aralikta = (tarih, aralik) => !aralik || (!!tarih && tarih >= aralik.baslangic && tarih <= aralik.bitis)`:
  iki sınır zorunlu ve **tarihsiz kayıt dışlanıyor**. `hesapsizOdemeler(hareketler, aralik)` aralık
  verildiğinde `liste` de döndürüyor (0047 ile eklendi), `hesapsizTahsilatlar(veri, hesaplar, aralik)` ise
  hep liste döndürüyor ve `neden` alanıyla üç ayrı sorunu işaretliyor. R12 ile R13 bu iki gözlemin
  karşılığıdır.
- **Aynı fonksiyonların ikinci tüketicisi rapor.** `giderRaporu.js:16` ikisini de içe aktarıyor ve
  `:120`/`:135`'te ay aralığıyla çağırıyor. Eşiğin oraya sızmaması bu yüzden açıkça yazıldı (X6).
- **`satirAciklamasi` bugün ne yapıyor (doğrulandı).** `Kasa.jsx:172-174`: gider ödemesinde karşı taraf
  `k.calisanAd || tedarikçi adı || gider türünün adı || "Gider"` ile çözülüyor ve **hareketin `taksitId`'sine
  hiç bakılmıyor**; ilk sütun sabit "Gider ödemesi". Hedef bilgisi ikinci sütuna (metin) eklenecek.
- **Neden tek spec.** İki madde de küçük, ikisi de Kasa ekranında, ikisi de aynı testlerin ve aynı
  görsel kanıtın kapsamına giriyor. 0030'daki bakım paketi deseni.

---

## Acceptance Criteria

### Başlangıç tarihi

- **AC-1.** Gider Ayarları'na başlangıç tarihi girilir ve kaydedilir.
- **AC-2.** Tarih boşken hesapsız listeler bugünkü gibi bütün kayıtları gösterir.
- **AC-3.** Tarih girilince eşikten önceki hesapsız ödemeler listede görünmez.
- **AC-4.** Aynı süzgeç hesapsız tahsilatlar için de çalışır.
- **AC-5.** Ekrandaki sayıların tamamı (`adet`, `gocAdet`, `avansAdet`) süzülmüş kümeden gelir ve liste
  uzunluğuyla uyuşur.
- **AC-6.** Ekran, kaç kaydın eşik altında kaldığını söyler ve eşik kaldırılabilir.
- **AC-7.** Eşik altındaki kayıt silinmez, hesapsız kalır ve hiçbir bakiyeye girmez.
- **AC-8.** Başlangıç tarihi hesap bakiyelerini değiştirmez (aynı hesabın bakiyesi önce ve sonra aynı).
- **AC-9.** Biçimsiz ya da gelecek tarih girildiğinde kayıt yapılmaz ve nedeni söylenir; yürürlük ayından
  önceki bir tarih kabul edilir.
- **AC-10.** `gider_tanim` izni olmayan kullanıcı alanı değiştiremez.

### Ödeme hedefi etiketi

- **AC-11.** Kira stopajı için yapılan ödeme, Kasa hareket listesinde vergi dairesi hedefiyle görünür.
- **AC-12.** Kiranın kendisine yapılan ödeme kiraya veren hedefiyle görünür.
- **AC-13.** Personelin resmi kısmına yapılan ödeme "Resmi", elden kısmına yapılan "Elden" yazar.
- **AC-14.** Normal kalemin ödemesinde bugünkü karşı taraf metni değişmez.
- **AC-15.** Hedefi çözülemeyen eski hareket bugünkü metniyle görünür ve hata vermez.
- **AC-16.** Hedef adı tek fonksiyondan gelir; ekranda ikinci bir metin üretilmez.
- **AC-17.** Hesap ekstresinde de aynı hedef bilgisi okunur.

### QA turunda eklenen kriterler

- **AC-18.** Tarihi olmayan hesapsız kayıt, eşik girilse de listede görünür ve R7'nin satırında ayrıca
  sayılır (R12).
- **AC-19.** Eşiksiz çağrıda `hesapsizOdemeler` ve `hesapsizTahsilatlar` bugünkü çıktılarını birebir verir
  (geriye dönük uyum, R13).
- **AC-20.** Yalnız `baslangic` verilen çağrı üst sınır olmadan çalışır; 0047'nin ay aralıklı çağrısı aynen
  sonuç verir (R13).
- **AC-21.** Eşik girilmiş olsa bile geçmiş bir ayın 0047 raporunda hesapsız bölümleri eşikten
  etkilenmez (X6).
- **AC-22.** "Hepsini göster" anahtarı ayarı değiştirmez, hatırlanmaz ve `gider_tanim` izni olmayan
  kullanıcıda da çalışır (R7).
- **AC-23.** Hesapsız avanslar da eşikten geçer (R1).
- **AC-24.** Ciro ve kendi çek hareketleri listede hiç görünmez; eşik onları etkilemez (R1).
- **AC-25.** Tahsilat listesinde gizlenen kayıtlar nedene göre (hesapsız, silinmiş hesap, para birimi
  uyuşmazlığı) ayrı sayılır (R1, R7).
- **AC-26.** Satırsız kira kalemine yapılmış, taksit bağı olmayan bir ödeme, `hareketPaylari` ile
  çözülerek hedefiyle görünür (R8).
- **AC-27.** Bir hareket iki hedefe bölünmüşse etiket ikisini birden söyler (R8).
- **AC-28.** Avanstan mahsup hareketi de hedefiyle görünür ("Avanstan mahsup · Resmi") (R8).
- **AC-29.** Ayar alanı `giderAyarlari.hesapsizBaslangic` olarak saklanır ve kapanıp açıldığında
  kaybolmaz (R14).
- **AC-30.** `hedefAdi`'nın üçüncü parametresi `eldenHedefliMi`'den gelir; ekranda ikinci bir koşul
  yazılmaz (R10).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Süzgeç yalnız listeye uygulanıyor; bakiye motoru değişmedi (C1, AC-8) ve 0047 raporuna sızmadı
      (X6, AC-21).
- [ ] Süzme parametresi geriye dönük uyumlu genişletildi: eşiksiz ve ay aralıklı çağrılar birebir aynı
      (AC-19, AC-20).
- [ ] Tarihsiz kayıtların gizlenmediği testle sabitlendi (AC-18).
- [ ] Satırsız kalemin hedef çözümü `hareketPaylari` ile; ikinci bir hesap yazılmadı (AC-26, AC-27, C2).
- [ ] Hedef adı `hedefAdi`'dan geliyor; ekranda kopya metin yok (C2, AC-16).
- [ ] Yeni ayar alanı `giderAyarlari` içinde; yeni sütun açılmadı (C3) ve roundtrip testi kapsıyor.
- [ ] Görsel kanıt eklendi (`docs/evidence/0051-*.jpg`): süzülmüş hesapsız liste, stopaj ödemesi satırı.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: hesapsız liste süzgeci ve ödemenin hedefiyle gösterilmesi.
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
