# 0010 — Müşteriler Ekranının Yeni Tasarıma Geçmesi

| | |
|---|---|
| **Durum** | **Kapatıldı** (kapsamı 0014, 0015 ve 0016 devraldı) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteriler listesi, müşteri ekle/düzenle formu, müşteri detay modalı (sahiplik geçmişi, makina geçmişi, ödemeler, dosyalar) |
| **Bağımlı spec'ler** | **0009** (tasarım sözlüğü) · **0011** (uyarı şeridinin serbest içerik desteği) |
| **Devralan spec'ler** | **0014** (süzgeç çubuğu ve sayaç) · **0015** (müşteri formu ve hata gösterimi) · **0016** (liste, boş durumlar, uyarı şeridi, detay bölümlerinin kart çerçevesi) |
| **Revizyon** | R1 (2026-09-24): onay öncesi QA boşluk analizi; 15 açık nokta karara bağlandı — 0009'un uygulanmış bileşen API'siyle bu ekranın içeriğinin örtüşmediği üç yer (boş durumun başlık+açıklama yapısı, gruplama düğmesinin süzgeç olmaması, bilgi şeridindeki cümle içi kalın parça), kapsam sınırları (ölü bayi kipi, detay içerik dosyaları, arama kutusu) ve ölçülemez kriterler; R1/R3/R4/R7 güncellendi, R10/R11 eklendi, C6'ya boş durum istisnası, X3 dosya sınırı, X6/X7 eklendi, AC-1/4/5/13/16/17/18 düzeltildi, AC-19…AC-24 eklendi. R2 (2026-09-24): R10'un gerektirdiği sözlük değişikliği bu spec'ten çıkarılıp kendi işine alındı (**0011**); 0010 böylece saf bir ekran dönüşümü olarak kaldı ve 0011'e bağımlı hâle geldi. Spec henüz "Taslak" olduğu için SCORECARD'ın revizyon sayacı işlemez (o sayaç onaydan sonrasını ölçer). R2 (2026-09-24, 0011 R2 incelemesi sonrası): kanıt biçimi JPEG artı piksel raporuna çevrildi ve aşama başına ayrı rapor kuralı yazıldı (DoD); kanıt eşlemesi kaydı zorunlu hâle geldi; gruplu görünüm şeridinin ekran okuyucuya duyurulması kabul edilen değişiklik olarak yazıldı (R10b, AC-25); şeridin biçim kanıtı öğe düzeyinde teste bağlandı (AC-26). |

---

## ⛔ Bu spec kapatıldı (2026-09-25)

Bu iş yazıldığında Müşteriler ekranını tek başına dönüştüren bir işti. Sonradan yazılan üç birlik
spec'i (**0014** sekme ve süzgeç, **0015** form, **0016** liste, boş durum ve uyarı) aynı ekranı
uygulama genelindeki kendi kapsamlarına aldı ve birlikte bu spec'in neredeyse tamamını kapsadı.
Dört spec'in aynı ekrana ayrı ayrı dokunması iki somut çelişki üretiyordu: süzgeç sayacı için iki
farklı çözüm (burada etiket metni, 0014'te sözlüğe eklenen sayı rozeti) ve boş durum metni için iki
ters kural (burada yeni açıklama satırı, 0016'da "metinler değişmez").

**Karar:** Müşteriler ekranı üç birlik spec'inin içinde dönüşür. Bu spec'in kendine özgü üç kazancı
devralan spec'lere taşındı:

1. **İki aşamalı teslim** (önce liste ve form, sonra detay modalı) → 0016.
2. **Test ağının adıyla sayılması**, özellikle detay modalını süren `gorusme-odak` ve
   `taksit-odeme-odak` → 0016 (ve karşılıkları 0014 ile 0015'te).
3. **Kanıt kuralı** (görüntü aracına ekran ekleme, önek parametresi, kanıt eşlemesi kaydı) → üçüne de.

Aşağıdaki metin **tarihsel kayıttır**; geliştirmeye açılmaz. İçindeki kararlar geçerliliğini
devralan spec'lerdeki karşılıkları üzerinden sürdürür.

---

## Intent

Gider ve Evrak ekranlarının tasarımı beğenildi, uygulamanın geri kalanı ise eski görünümde kaldı.
Müşteriler, uygulamanın en çok kullanılan ekranı ve yeni ekranların yanında en eski duran yer:
süzgeçleri kendi hapıyla, boş durumları düz metinle, uyarıları gelişigüzel çözülmüş. Kullanıcı
gün içinde en çok baktığı ekranda eski tasarımı görmeye devam ederse, yenilenme hissi oluşmaz.

Başarı şu demek: Müşteriler listesi, ekle/düzenle formu ve müşteri detayı yeni tasarım
sözlüğünün yapı taşlarıyla çizilmiş; kullanıcı Giderler'den Müşteriler'e geçtiğinde aynı
uygulamada olduğunu hissediyor; ve ekranın yaptığı hiçbir şey değişmemiş.

---

## Requirements

- **R1.** Müşteriler listesi, 0009'daki paylaşılan yapı taşlarıyla çizilir: süzgeç seçimi segmentli
  seçiciyle, boş durumlar boş durum kutusuyla, uyarılar uyarı şeridiyle, bölümler başlıklı kart bölümle.
  Üç sınır burada belirlenir: (1) **"Firmaya Göre Grupla" düğmesi bir süzgeç değildir**, bağımsız bir
  aç/kapa olarak segmentin dışında kalır ve kendi düğmesi olarak korunur; (2) süzgeç etiketlerindeki
  **sayaçlar korunur** ve etiketin parçası olarak geçirilir ("Hepsi (128)"); (3) tabloyu saran kap
  **başlıksız kart varyantına** çevrilir, ona yeni bir başlık uydurulmaz.
- **R2.** Müşteri **ekle/düzenle formu** aynı sözlükle çizilir: alan hataları hata metniyle, açıklamalar
  ipucu metniyle, gruplar başlıklı kart bölümle.
- **R3.** Müşteri **detay modalı** aynı sözlükle çizilir: sahiplik geçmişi, makina geçmişi, ödemeler ve
  dosyalar bölümleri başlıklı kart bölüm olur; kayıt bulunmayan bölümler boş durum kutusu gösterir.
  Başlık biçimi kuralı: detay modalındaki bölümler kart varyantının **"baslik"** biçimini kullanır
  (bugünkü koyu başlıklara en yakın olan), liste üstündeki kartlar **"etiket"** biçimini kullanır. Bölüm
  başına yeniden karar verilmez. Dönüşüm yalnız **saran kabı** değiştirir: `customers/detail/` altındaki
  içerik dosyaları bu işte açılmaz (X3).
- **R4.** İş **iki aşamada** teslim edilir: önce liste ve ekle/düzenle formu, sonra detay modalı. Her aşama
  **kendi PR'ı ve kendi görsel kanıtıyla** gelir; spec ancak ikisi de birleştikten sonra `done` klasörüne
  taşınır. Sebep: detay modalı uygulamanın en büyük bileşeni; tek seferde dönüştürmek gözden geçirilemez bir
  değişiklik üretir. **Kabul edilen sonuç:** iki aşama arasında liste yeni, detay eski görünecektir.
- **R5.** Ekranın **davranışı değişmez**: süzgeçler aynı kayıtları getirir, arama aynı alanlarda arar,
  sayfalama aynı sayıda kayıt gösterir, sıralama aynı kalır.
- **R6.** Bugün anlam taşıyan görsel işaretler korunur: borçlu müşteri satırının vurgusu, garanti ve seri no
  rozetleri, opsiyonel fiyat sütunlarının ayırt edici zemini.
- **R7.** Kullanıcının açık/kapalı tercihleri korunur: fiyat sütunlarının görünürlüğü, süzgeç seçimi ve
  sayfa numarası **dönüşüm yüzünden** sıfırlanmaz. Süzgeç veya arama değiştiğinde sayfanın 1'e dönmesi
  bugünkü davranıştır ve aynen korunur.
- **R8.** Kilit çakışması, taslak geri yükleme ve silme onayı gibi araya giren ekranlar bugünkü gibi çalışır
  ve aynı metinleri gösterir.
- **R9.** Karanlık temada bütün bölümler okunabilir kalır.
- **R10.** Gruplu görünüm bilgi şeridi bugünkü cümlesini bugünkü biçimiyle gösterir ve bunu **0011'in
  eklediği serbest içerik desteğiyle** yapar. Bu spec sözlüğü değiştirmez: 0011 tamamlanmadan bu ekran
  dönüşümüne başlanmaz, tek kullanımlık varyant yazılmaz (C2).
- **R10b.** **Kabul edilen erişilebilirlik değişikliği:** paylaşılan uyarı şeridi her zaman durum bildiren
  bir rol taşır, bugünkü gruplu görünüm kutusunun ise hiç rolü yok. Şeride geçince bu bilgi ekran okuyucuya
  duyurulur hâle gelir ve bu **bilerek kabul edilmiştir**: gruplu görünüm, listenin neden kısaldığını açıklayan
  bir durum bilgisidir; duyurulması kazançtır. Rolsüz bir varyant için sözlüğe yeni bir seçenek eklenmez,
  çünkü tek ekran için sözlüğü genişletmek 0011'in kapsam kararlarına aykırıdır.
- **R11.** Boş durum kutusu iki farklı durumu ayırt eder ve metinleri burada sabittir:
  **arama sonucu boşsa** başlık "Müşteri bulunamadı.", açıklama "Arama ölçütünü değiştirmeyi deneyin.";
  **hiç müşteri kaydı yoksa** başlık "Henüz müşteri kaydı yok", açıklama yeni müşteri eklemeye yönlendiren
  kısa bir cümle. Başlıklar bugünkü metni korur, açıklama satırları bileşenin yapısı gereği yenidir
  (C6'nın istisnası).

---

## Constraints

### Uyulması zorunlu

- **C1.** **Davranış değişikliği yasak.** Bu spec yalnız görünümü değiştirir; alan, hesap, akış, izin ve
  kayıt davranışı aynı kalır.
- **C2.** Yeni yapı taşı icat edilmez. İhtiyaç çıkarsa 0009'un sözlüğüne eklenir ve orada tartışılır; bu
  ekranda tek kullanımlık bir varyant yazılmaz.
- **C3.** **Paylaşılan formlara dokunulmaz** (aşağıda X1). Müşteri detayından açılan servis, Extra Kalıp ve
  yedek parça formları bu spec'in dışındadır.
- **C4.** Mevcut arayüz testleri **değiştirilmeden** geçmelidir. Bu ekranı kapsayan sekiz test dosyası var;
  biri kırılıyorsa davranış değişmiş demektir ve kod düzeltilir, test değil.
- **C5.** Yeni bağımlılık, CSS framework, CSS module veya styled-components eklenmez.
- **C6.** Kullanıcıya görünen metinler Türkçedir ve **değişmez**; metin değişikliği ayrı bir karardır.
  **Tek istisna boş durum kutusudur** (R11): bileşen başlık artı açıklama yapısında olduğu için, bugünkü tek
  satır metin başlığa taşınır ve altına yeni bir açıklama satırı eklenir. Eklenecek metinler R11'de sabittir;
  geliştirici kendi metnini yazmaz.

### KAPSAM DIŞI

- **X1.** Servis formu, Extra Kalıp formu ve yedek parça satış formu — *neden:* üçü de paylaşılan; servis
  formu aynı zamanda Servis ve Kargo Panosu ile kiosk kullanıcısında, Extra Kalıp formu bayi detayında
  çalışıyor. Dönüştürmek panoyu ve kiosk'u da test etmeyi gerektirir. **Kabul edilen sonuç:** yeni görünümlü
  müşteri detayından eski görünümlü bir form açılacak; bu geçici tutarsızlık bilerek göze alınıyor.
- **X2.** Müşteri ekranının işlevsel iyileştirmeleri (yeni sütun, yeni süzgeç, yeni sıralama) — *neden:* bu
  iş görünüm işidir; işlev isteği kendi spec'ini hak eder.
- **X3.** Makina geçmişi zaman çizelgesinin içerik düzeni (hangi olay nasıl özetlenir) — *neden:* orada
  gösterilen bilgi bir ürün kararı; bu spec yalnız çerçeveyi yeniler. **Sınır dosya düzeyindedir:**
  `customers/detail/` altındaki içerik dosyaları bu işte açılmaz; yalnız onları saran kap kart bölüme
  çevrilir.
- **X4.** Yazdırma çıktıları — *neden:* basılı belgelerin kendi düzeni var ve ekran tasarımıyla ilgisi yok.
- **X5.** Görsel regresyon test altyapısı — *neden:* 0009'da verilen kararla aynı; doğrulama mevcut testler
  artı önce ve sonra görüntüsüyle yapılır.
- **X6.** Müşteriler bileşenindeki bayi kipinin (`isCustomer` yanlış olan dal) dönüştürülmesi — *neden:*
  bu dal bugün hiçbir yerden çağrılmıyor; Bayiler ekranı ayrı bir bileşen. Ölü dalın temizliği ayrı bir
  iştir ve bu işte ona dokunulmaz.
- **X7.** Arama kutusunun görünümü — *neden:* sözlükte arama kutusu diye bir yapı taşı yok ve yedincisini
  icat etmek 0009 X5 ile yasak. Kutu bugünkü hâliyle kalır.

---

## Context

- **Dal:** bu iş `feat/0011-uyari-seridi-serbest` dalının ucundan açılır; 0009 ve 0011 henüz
  `main`'e alınmadı.

- **Yüzey büyük.** Müşteriler listesi 711 satır (`src/components/Customers.jsx`), ekle/düzenle formu 511
  satır (`customers/CustomerAddEditForm.jsx`), detay modalı 1431 satır
  (`customers/CustomerDetailModal.jsx`) ve detay alt bölümleri ayrı dosyalarda
  (`customers/detail/`: sahiplik, ödemeler, dosyalar, makina geçmişi). Toplam 2650 satırın üzerinde arayüz
  kodu. R4'ün iki aşamalı teslim kuralı bu büyüklükten doğuyor.
- **Güvenlik ağı var.** Bu ekranı kapsayan sekiz arayüz testi mevcut: arama, fiyat sütunları, satış
  alanları, giriş numarası, detayın yeniden açılması, dosya bölümü, maliyet kutusu, silme kaskadı. Testler
  metin ve rol üzerinden sorguluyor, dolayısıyla görünüm taşınırken metin ve roller korunursa kendiliğinden
  geçerler. C4 bunu şart koşuyor.
- **Görsel işaretlerin anlamı var.** Borçlu müşteri satırının sarı vurgusu dört ayrı kaynaktan hesaplanan
  bir duruma dayanıyor (kalan bakiye, ödenmemiş servis, ödenmemiş kalıp, ödenmemiş kargo). Fiyat sütunları
  kullanıcı ayarına bağlı ve turuncu zeminleri "bu sütun opsiyonel" demek. Bunlar süs değil, R6 onları
  koruyor.
- **Paylaşılan formlar.** Müşteri detayı; servis formunu, Extra Kalıp formunu ve yedek parça formunu
  açıyor. Aynı formlar Servis ve Kargo Panosu ile bayi detayından da açılıyor. X1'in gerekçesi bu.
- **Sözlük önce gelmeli.** 0009 tamamlanmadan bu iş başlarsa geliştirici kendi yorumunu uygular ve
  uygulamada üçüncü bir varyant doğar. Bağımlılık bu yüzden zorunludur.

Bilinen tuzaklar:

- **Sessiz davranış kayması.** Süzgeç veya sıralama kodu, görünüm taşınırken farkında olmadan
  değişebilir. R5 ve C4 bunu yakalar.
- **Tercihlerin sıfırlanması.** Dönüşüm sırasında bileşen yeniden kurulursa seçili süzgeç veya sayfa
  numarası sıfırlanabilir; kullanıcı bunu "listem kayboldu" diye yaşar (R7).
- **Kapsam kayması.** "Zaten dokunmuşken şu sütunu da ekleyelim" bu işin en olası çıkış yolu; X2 kapatıyor.

---

## Acceptance Criteria

- **AC-1.** Müşteriler listesindeki süzgeç seçimi 0009'daki segmentli seçiciyle çizilir ve aynı süzgeçleri
  aynı isimlerle, **aynı sayaçlarla** sunar ("Hepsi (128)" gibi).
- **AC-2.** Süzgeç seçildiğinde dönen kayıt kümesi dönüşüm öncesiyle aynıdır.
- **AC-3.** Arama kutusu aynı alanlarda arar; eski sahip adıyla arama dâhil, sonuçlar değişmez.
- **AC-4.** Arama sonucu boş kaldığında boş durum kutusu gösterilir; başlığı bugünkü metindir
  ("Müşteri bulunamadı.") ve altında R11'deki açıklama satırı bulunur.
- **AC-5.** Hiç müşteri kaydı yokken gösterilen boş durumun başlığı "Henüz müşteri kaydı yok"tur ve arama
  sonucu boş olan durumdan ayırt edilir.
- **AC-6.** Sayfalama aynı sayıda kayıt gösterir ve sayfa numarası dönüşümden etkilenmez.
- **AC-7.** Borçlu müşteri satırının vurgusu korunur ve aynı müşterilerde görünür.
- **AC-8.** Opsiyonel fiyat sütunları ayarda açıkken görünür, kapalıyken görünmez; ayırt edici zeminleri
  korunur.
- **AC-9.** Müşteri ekle/düzenle formunda alan hataları hata metniyle, açıklamalar ipucu metniyle gösterilir
  ve metinler değişmez.
- **AC-10.** Formdaki zorunlu alan kontrolleri ve uyarılar bugünkü davranışını sürdürür.
- **AC-11.** Taslak geri yükleme şeridi bugünkü gibi çalışır.
- **AC-12.** Müşteri detay modalındaki sahiplik geçmişi, makina geçmişi, ödemeler ve dosyalar bölümleri
  başlıklı kart bölüm olarak çizilir.
- **AC-13.** Kaydı olmayan bölümler boş durum kutusu gösterir; bugünkü düz metinler kutunun başlığına
  taşınır (C6'nın R11'deki istisnası).
- **AC-14.** Detay modalından açılan servis, Extra Kalıp ve yedek parça formları bugünkü hâliyle çalışır
  (X1); açılış, kaydetme ve iptal davranışı değişmez.
- **AC-15.** Kilit çakışması ekranı ve silme onayı bugünkü metinlerle ve davranışla gösterilir.
- **AC-16.** Her aşama için aydınlık ve karanlık temada, **aynı pencere boyutunda** önce ve sonra
  görüntüsü alınır ve PR'da yan yana konur; okunabilirliğin kabul edilebilir olup olmadığına Takım
  Yöneticisi karar verir (0009'daki yöntemin aynısı).
- **AC-17.** Bu ekranı kapsayan sekiz arayüz testi **değiştirilmeden** geçer: `customers-search`,
  `customers-fiyat-sutunlari`, `customers-satis-alanlari`, `customers-giris-no`, `customers-delete-cascade`,
  `customer-detail-reopen`, `customer-files-section`, `customer-maliyet-kutusu`. (`settings-musteri` bir
  Ayarlar testidir, bu listeye dâhil değildir.)
- **AC-18.** Dönüşüm iki aşamada, iki ayrı PR olarak teslim edilir ve her aşamanın kendi önce/sonra
  görüntüsü vardır.
- **AC-19.** "Firmaya Göre Grupla" düğmesi segmentin dışında ayrı bir düğme olarak durur ve açma/kapama
  davranışı bugünkü gibidir.
- **AC-20.** Gruplu görünüm bilgi şeridi bugünkü cümlesini bugünkü biçimiyle gösterir; kalın parça cümlenin
  ortasında kalır.
- **AC-21.** Tabloyu saran kap başlıksız kart varyantıyla çizilir; tabloya yeni bir başlık eklenmez.
- **AC-22.** Süzgeç veya arama değiştiğinde sayfa 1'e döner; bu bugünkü davranıştır ve korunur.
- **AC-23.** Dönüşüm öncesi ve sonrası aynı veriyle süzgeç, arama ve sayfalama çıktıları birebir aynıdır;
  bu, mevcut testlere dokunmadan eklenen yeni bir testle gösterilir.
- **AC-25.** Gruplu görünüm bilgi şeridi ekran okuyucuya durum olarak duyurulur; bu, bugünkü rolsüz
  kutuya göre bilerek yapılmış tek erişilebilirlik değişikliğidir (R10b).
- **AC-26.** Şeridin görünümünün bugünkü kutuyla aynı olduğu, **öğe düzeyinde** bir testle gösterilir (zemin,
  kenarlık, köşe yarıçapı, dolgu, punto, metin rengi); dış boşluk çağıranın sarıcısında kalır. Tüm ekranın
  piksel karşılaştırması bu kriteri kanıtlayamaz, çünkü ekranın geri kalanı bilerek değişiyor.
- **AC-24.** Detay modalındaki bölümler kart varyantının "baslik" biçimini, liste üstündeki kartlar
  "etiket" biçimini kullanır.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor (görsel olanlar kanıt görüntüsüyle).
- [ ] 0009'un sözlüğü kullanıldı; bu ekrana özel yeni bir yapı taşı yazılmadı (C2).
- [ ] Mevcut test dosyalarına **hiç dokunulmadı**; PR'ın dosya listesinden görülüyor (C4).
- [ ] Paylaşılan formlara dokunulmadığı PR özetinde yazıldı (C3, X1).
- [ ] **Her aşama kendi kanıt raporunu üretir** (`0010a` ve `0010b` önekleriyle, mevcut görüntü aracıyla):
      depoda yan yana küçültülmüş JPEG'ler artı `<önek>-piksel-raporu.json`; karşılaştırma tam çözünürlüklü
      PNG'lerle yapılır. Aydınlık ve karanlık tema, boş durumlar dâhil.
- [ ] Sözlüğü kullanmaya başlayan her dosya için `docs/evidence/kanit-eslemesi.json`'a kayıt eklendi;
      yeni tasarım olduğu için `beklenen: "degisti"` ve `onay` gerekçesi yazıldı (0011 AC-11b biçimi).
      Hiçbir test dosyasına dokunulmadı (C4).
- [ ] Spec `specs/done/` klasörüne taşınırken bu spec'in açtığı bütün `degisti` kayıtları `ayni`ye çevrildi
      ve yeni görünüm taban alındı (0011 AC-11c).
- [ ] Süzgeç, arama, sıralama ve sayfalama sonuçlarının değişmediği **yeni bir testle** gösterildi
      (AC-2, AC-3, AC-6, AC-23); mevcut testlere dokunulmadı.
- [ ] 0011 tamamlanmış ve gruplu görünüm şeridi onun serbest içerik desteğiyle çizilmiş; bu ekranda
      sözlüğe dokunulmadığı PR özetinde yazıldı (R10, C2).
- [ ] İki aşama iki ayrı PR olarak teslim edildi; spec ikisi birleşmeden `done`'a taşınmadı (R4).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
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
