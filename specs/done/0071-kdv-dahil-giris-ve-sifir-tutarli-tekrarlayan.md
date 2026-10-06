# 0071 — Gider Girişinde İki Kolaylık: KDV Dâhil Tutar ve Tutarı Sonra Girilen Tekrarlayan Kalem

| | |
|---|---|
| **Durum** | Tamamlandı (commit `bcba891`, dal `feat/0071-kdv-dahil`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider formu (yeni ve düzenleme), tekrarlayan gider tanımı, gider kalemi doğrulaması, kalem listesi |
| **Bağımlı spec'ler** | 0001 (kalem ve tanım doğrulaması, kira brüt/net emsali) · 0003 (borç kapsamı) · 0021, 0024 (ödeme hedefleri ve kalan) · 0048, 0053 (form ödeme kutusu) · 0061 (açık kalemler) · 0062 (sayfa sıfırlama anahtarı) · 0026 (genel arama) |
| **Revizyon** | 2 · 2026-10-06 uygulama planı onayı: Q1–Q7 işlendi (R6, R23–R28, AC-13, AC-39–AC-44, DoD); plan `specs/done/0071-uygulama-plani.md` |
| **Önceki revizyon** | 1 · 2026-10-06 QA turu: B-1..B-7, Ö-8..Ö-20, K-21..K-25 işlendi (Takım Yöneticisi onayı) |

---

## Intent

İki ayrı şikâyet, ikisi de aynı yerde: gider girerken kullanıcının kafadan hesap yapmak zorunda
kalması.

1. **KDV dâhil fatura.** Eline gelen faturanın üstünde KDV dâhil tutar yazıyor; uygulama KDV hariç
   tutar istiyor. Kullanıcı her faturada KDV'yi eliyle ayırıyor, yuvarlama hatası yapıyor ve zaman
   kaybediyor.
2. **Tutarı her ay değişen tekrarlayan gider.** Elektrik ve su her ay farklı tutuyor. Kullanıcı bunları
   tekrarlayan tanım olarak **sıfır tutarla** kurup, fatura geldiğinde kalemin tutarını girmek istiyor.
   Bugün sıfır tutar reddediliyor ("Tutar sıfırdan büyük olmalı"), bu yüzden ya tanım yazamıyor ya da
   uydurma bir tutar yazıyor.

İkisi de aynı iki ekranı etkiliyor (gider formu ve tekrarlayan tanım) ve ikisi de motorun çıktısını
değiştirmiyor. Bu yüzden tek spec. İki düzeltme: doğrulama **tek dosyada değil**, kalem tarafı
`src/lib/gider.js`'te, tanım tarafı `SettingsGiderTanimlari.jsx`'tedir (B-7, R19); ve KDV tarafı
`gider.js`'e yeni bir saf fonksiyon ekler, yani "motor hiç değişmiyor" değil "motorun çıktısı
değişmiyor" (C2).

Başarı şu demek: faturadaki rakam olduğu gibi yazılabiliyor, her ay değişen giderler tanımdan
üretiliyor ve tutarı girilmemiş kalem gözden kaçmıyor.

---

## Requirements

### A. KDV dâhil tutar girişi

- **R1.** Gider formunda tutarın **KDV hariç mi dâhil mi** girildiği seçilir. Seçenek iki değerlidir ve
  varsayılan **KDV hariç**'tir (bugünkü davranış).
- **R2.** "KDV dâhil" seçildiğinde kullanıcı faturadaki toplamı yazar; form **gerçekten kaydedilecek üç
  rakamı** gösterir: KDV hariç tutar, KDV tutarı (motorun hesaplayacağı değer) ve Ödenecek tutar.
  Yuvarlama yüzünden Ödenecek tutar girilen fatura toplamından sapıyorsa form **farkı da yazar**
  (B-2). Form, motorların üretmeyeceği bir KDV rakamı göstermez.
- **R3.** KDV ayırma **tek yerden** yapılır: `src/lib/gider.js`'e yeni bir saf kuruş fonksiyonu
  (`kdvAyir(dahilTutar, kdvOrani)` → `{tutarK, kdvK}`) eklenir ve bu, `kdvKurus`'un
  (`gider.js:141`) tersidir. **`utils.extractKDV` KULLANILMAZ ve dokunulmaz** (B-1): o fonksiyon
  oranı kalemden değil satış tarafının tarih bazlı tablosundan okur (`getKdvRateForDate`,
  `utils.js:377-382`) ve float döndürür; gider kaleminin oranı kendi alanıdır (`giderler.kdvOrani`,
  formda elle değiştirilebilir). Servis ücretleri `extractKDV`'yi kullanmaya devam eder.
- **R4.** Kayıtta saklanan **KDV hariç tutardır**; kalemin bütün tüketicileri (rapor, kova, maliyet,
  borç, KDV karşılaştırması) bugünkü alanı bugünkü anlamıyla okumaya devam eder.
- **R5.** Seçim kalemle birlikte **saklanır** ve düzenlemeye dönüldüğünde kullanıcı girdiği biçimi görür.
  **Girilen dâhil tutar saklanmaz** (Ö-9): her açılışta hariç tutar artı KDV ile yeniden kurulur. Sonuç
  olarak kullanıcı KDV oranını değiştirirse gösterilen dâhil tutar da değişir; bu beklenen davranıştır
  ve ikinci bir "girilen dâhil tutar" alanı eklenmez (C3).
- **R6.** Kira kaleminde bugünkü brüt/net seçimi aynen durur ve **hesap sırası tek ve yazılıdır**
  (B-4): **önce KDV ayrılır** (dâhil → hariç), sonra bugünkü `kiraHesapla` o hariç tutarla brüt/net
  dönüşümünü yapar. Yani "KDV dâhil" seçimi yalnız tutar alanının anlamını değiştirir;
  `kiraHesapla`'nın girdisi her zaman KDV hariçtir ve fonksiyon değişmez. Form iki eksenin bağımsız
  olduğunu bir ipucuyla söyler (Context).
  **Revizyon 2 (plan Q1):** KDV dâhil seçimi kirada **yalnız brüt girişte** vardır. "Net ödenen kira"
  seçiliyken KDV yönü seçicisi çizilmez, kayıtta `kdvYonu` `"haric"` yazılır ve bir ipucu net tutarın KDV
  hariç girildiğini söyler. Gerekçe: KDV brüt üzerinden hesaplandığı için "önce KDV ayır, sonra neti brüte
  çevir" sırası net girişte girilen rakamla tutmayan bir ödenecek tutar üretir (stopaj %20, KDV %20'de
  1.000,00 → ödenecek ≈1.041,67); brüt girişte ayırma birebir tersine çevrilir. Pratikte iki seçim birlikte
  nadiren anlamlıdır (Context: şahsa kira KDV'siz, şirkete kira stopajsız). Tanımda da aynı kural.
- **R7.** Aynı seçim **tekrarlayan gider tanımında** da bulunur. Tanım **dâhil tutarı olduğu gibi
  saklar**, ayırma **üretim anında** çözülen oranla yapılır (Ö-8): tanımın `kdvOrani` alanı null
  olabilir ("KDV tarihe göre"; `gider.js:685` `t.kdvOrani ?? getKdvRateForDate(tarih, kdvRates)`,
  ekranda `SettingsGiderTanimlari.jsx:111`), bu yüzden tanım kaydedilirken doğru oran bilinemez. Emsal
  birebir kiradır: tanım yönü saklar, `tekrarlayanUret` hesabı yapar. Tanım listesinde tutarın altına
  "KDV dâhil girildi" / "KDV hariç girildi" yazılır (kira satırının "Brüt girildi" ibaresinin emsali).
- **R8.** KDV oranı sıfır ya da boşken iki seçenek aynı sonucu verir ve bu **somut olarak** belli olur
  (Ö-17): seçici pasifleştirilmez, altında `Ipucu` ile "KDV oranı sıfır olduğu için dâhil ve hariç aynı
  tutarı verir." yazar ve kutudaki KDV satırı 0 görünür.
- **R17.** Giriş yönü **yeni bir sütunda** tutulur: `kdvYonu` (`"haric"` varsayılan | `"dahil"`), **iki
  tabloda** (`giderler` ve `gider_tanimlari`), dört nokta kuralıyla (`SCHEMA_SQL`,
  `applyColumnMigrations`, INSERT listesi ve parametreleri, SELECT eşlemesi). **Mevcut `girisYonu`
  alanı kullanılamaz** (B-3): o alan kira brüt/net için dolu ve kira dışı kalemde null'a çekiliyor
  (`gider.js:477`, `:490`, `:498`; `db.cjs:257`), oysa R6 iki seçimin bir arada durmasını istiyor.
- **R18.** Seçici **personel davranışında çizilmez** ve kayıtta `kdvYonu` null yazılır (B-5); kira dışı
  kalemde `girisYonu`'nun null'a çekilmesiyle aynı desen. Personelde KDV oranı ve tedarikçi alanı yok
  (`GiderForm.jsx:265`) ve `kdvKurus` personelde 0 döner.

### B. Tutarı sonra girilen tekrarlayan kalem

- **R9.** Tekrarlayan gider tanımına **sıfır tutar** girilebilir, ama yalnız **davranışı `normal`** olan
  tanımda (B-6). Kira (stopajın sıfır üzerinden hesabı anlamsız), personel (R16) ve standart gider
  bugünkü "sıfırdan büyük olmalı" kuralını korur. Yasak bugün altı yerdedir: normal kalem
  (`gider.js:496`), kira kalemi (`:483`), personel toplamı (`:470`), tekrarlayan tanım
  (`SettingsGiderTanimlari.jsx:51`), standart gider iki fonksiyonda (`gider.js:981` ve `:993`);
  bunlardan yalnız ikisi (tanım ve normal kalem) açılır.
- **R10.** Sıfır tutarlı tanımdan üretilen kalem de sıfır tutarla doğar ve kaydedilebilir. Tutar **0
  olarak saklanır, null değil** (Ö-15): null "bu davranışta tutar alanı kullanılmıyor" anlamını taşıyor
  ve personel kaleminde o anlamda kullanılıyor (`gider.js:474`).
- **R11.** İşaretin ölçütü **ödenecek tutarı sıfır olan kalemdir** (Ö-11), tanım bağı değil; böylece eski
  ve içe aktarılmış sıfır kalemler de yakalanır. Rozet kalem listesi satırında, kira `girisYonu`
  rozetinin yanında (`DonemRaporu.jsx:371` emsali), metni "Tutar girilmedi". Sıfır kalemin türetilmiş
  ödeme durumunun (`odemeleriUygula`, kalanı sıfır) "Ödenmiş" mi "Ödenmemiş" mi saydığı **iddia
  edilmez**: ölçülür ve çıkan davranış testle sabitlenir.
- **R12.** Kalem listesindeki süzme, ödeme süzgecinin **altıncı değeridir** (Ö-12): `"tutarsiz"`, etiket
  "Tutar girilmedi (N)", sayı etikette. 0061'in ayrı kip deseni seçilmez, çünkü o dönem seçicisini
  pasifleştiriyor ve burada dönem bağlamı korunmalı (fatura o ayın faturasıdır). Süzgeç Giderler'den
  denetimli prop'la gelen değerle çakışmaz (bugünkü yapıda denetimli değer yalnız `"hatirlatma"`,
  `DonemRaporu.jsx:239-243`) ve 0062'nin sayfa sıfırlama anahtarı `filtre.odeme`'yi zaten içerdiği için
  yeni anahtar gerekmez (`:268`).
- **R13.** Kullanıcı tutarı girdiğinde işaret kendiliğinden kalkar; ayrıca bir onay adımı yoktur.
- **R14.** Sıfır tutar **yalnız tekrarlayan tanımdan üretilen kalemde** serbesttir; elle açılan yeni
  kalemde bugünkü "sıfırdan büyük olmalı" kuralı sürer (gerekçe Context'te). Bu bir **giriş kolaylığı
  kuralıdır, güvenlik sınırı değildir** (C6).
- **R15.** Sıfır tutarlı kalem hiçbir borç listesine, hatırlatıcıya ve açık kalemler listesine girmez.
  Bu bugün **hedef kalanı düzeyinde** sağlanıyor (`borcOzeti`'nde `o <= 0` elemesi, `acikKalemler.js`'te
  `h.kalanK > 0`, `odemeHatirlatma.js`'te `h.kalanK > 0`), `borcKapsamindaMi`'de değil
  (`gider.js:894`); bu spec o kuralı **değiştirmez**, yalnız bozulmadığını testle sabitler.
- **R16.** Personel kaleminin bugünkü kuralı değişmez: dört bileşeni birden sıfır olan personel kalemi
  yazılamaz.
- **R19.** Tanım doğrulaması **saf motorda değil, bileşendedir** (`SettingsGiderTanimlari.jsx:51`;
  `giderTanimDogrula` gibi bir fonksiyon yok) ve bu işte **saf fonksiyona taşınmaz** (B-7, kapsamı
  büyütür). Yani değişiklik iki ayrı yerdedir: kalem tarafı `gider.js`, tanım tarafı bileşen. Testleri
  de ayrıdır (Ö-20).
- **R20.** Sıfır tutarlı kalemin raporun hangi kutusunda göründüğü (Ö-13): **kalem listesinde ve kalem
  sayısında** görünür, toplamlara sıfır katkı verir, "ödenmemiş gider" kartında ve tedarikçi borcu
  kırılımında görünmez (kalanı sıfır), ödeme yöntemi kırılımında görünmez (ödemesi yok).
  *Uygulama notu:* "ödenmemiş gider" kartı sayısında görünmemesi için `hesaplaGiderRaporu` ödenmemiş toplamına
  yalnız tutarı sıfırdan büyük kalemi katar; tutarlı kalemde çıktı aynıdır (C2 korunur, AC-35). Ölçülen türetilmiş durum
  "ödenmemiş"tir (AC-33; plan §6).
- **R21.** Formun canlı ödeme kutusu (0048, 0053) sıfır tutarlı kalemde **satır çizmez**, çünkü tutarı
  sıfır olan hedef çizilmiyor (0046 kuralı). Beklenen davranış budur (Ö-18): tutar girilip
  kaydedildikten sonra ödeme girilebilir; 0046'nın kuralı gevşetilmez.
- **R22.** Tekrarlayan üretimin **mükerrer uyarısı ve `uretilenAylar` kaydı değişmez** (Ö-16): sıfır
  tutarlı kalem de normal kalem gibi girer, ikinci üretim bugünkü uyarıyı verir.

- **R23 (plan Q3).** Tutar alanı **tektir**: "KDV dâhil" seçilince alandaki rakam değişmez, yalnız anlamı
  değişir (kullanıcı faturadaki rakamı yazar, sonra seçer). İkinci bir form alanı ve yön değişiminde
  dönüştürme yoktur.
- **R24 (plan Q4).** Sıfırın serbest olduğu iki yolda (tanımdan üretilmiş normal kalem, normal davranışlı
  tanım) **boş tutar alanı 0 sayılır** ve 0 olarak kaydedilir. Başka her yerde boş alan bugünkü gibi
  reddedilir.
- **R25 (plan Q5).** Tanımda model dağılımının sınırı **KDV hariç** tutardır: "dâhil" tanımda tanımın kendi
  oranıyla ayrılmış tutar, oran "tarihe göre" ise bugünün oranıyla ayrılmış tutar. **Sıfır tutarlı tanımda
  model dağılımı reddedilir**: "Tutarı sonra girilecek tanımda model dağılımı yapılamaz." (Üretilen kalem
  formda açılınca doğrulamadan geçemeyecek bir kalem üretilmesin.)
- **R26 (plan Q6).** Sıfır tutarlı kalemin kalem listesindeki **ödeme hücresi durum yazmaz, "—" yazar**
  (ölçülen türetilmiş durum "ödendi" çıksa bile "Ödendi" görünmez); işi "Tutar girilmedi" rozeti yapar. Ödeme
  süzgeçlerindeki davranış ölçülüp AC-33 ile sabitlenir.
- **R27 (plan Q7).** `kdvYonu` alanı olmayan eski kalem ve tanım her yerde **"hariç"** sayılır; kayıt bir
  sonraki düzenlemede alanı yazar. Veri göçü yoktur.
- **R28 (plan Q2).** AC-25 ve AC-26 testleri `tests/kdv-dahil-0071.test.js`'e yazılır; `gider.test.js`
  dokunulmaz (AC-35'in kanıt gücü korunur).

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla; KDV ayırma kuruş artığını yutmaz. İleri yön
  `kdvKurus = round(kurus(tutar) * oran / 100)` (`gider.js:141`), ters yön
  `tutarK = round(dahilK * 100 / (100 + oran))`. İkisi küçük tutarlarda bir kuruş sapabilir (0,03 ve
  %20 → tutar 0,03, KDV 0,01, toplam 0,04); R2 bu farkı gizlemez, yazar.
- **C2.** **Motorun çıktısı değişmez** (K-24). Gider raporu, kova, makina maliyeti, KDV karşılaştırması
  ve borç hesapları bu işten etkilenmez. `src/lib/gider.js`'e **yalnız ters yön hesabı eklenir**
  (R3 `kdvAyir`); mevcut fonksiyonlar dokunulmaz. Hesap bileşene yazılmaz, yoksa B-1'in hatası tekrar
  eder. **İstisnalar (triyaj):** işin kendisi gereği `giderKalemDogrula` (yön, ayırma, sıfır kuralı) ve `tekrarlayanUret`
  (üretimde ayırma, sıfır tanım) değişir; `hesaplaGiderRaporu` yalnız R20 uygulama notundaki ödenmemiş sayımıyla değişir.
  Üçünde de KDV hariç girilmiş, tutarı sıfırdan büyük kalemin çıktısı aynıdır (AC-35).
- **C3.** Yeni kalıcı alan en aza indirilir: giriş yönü için **iki tabloda bir sütun** yeter
  (R17 `kdvYonu`), tutar alanı bugünküdür ve girilen dâhil tutar saklanmaz (R5).
- **C4.** Yeni izin ve yeni sunucu denetimi yoktur.
- **C5.** Kullanıcıya görünen metinler Türkçedir.
- **C6.** **Kabul edilen sunucu sınırı (Ö-14):** `serverAuth.tanimliUretimMi` (`:691-696`) tanımı, türü
  ve dönemi doğruluyor ama **tutara bakmıyor**; kurgulanmış bir istek sahte `tanimId` ile sıfır tutarlı
  serbest kalem yazabilir. R14 bir giriş kolaylığı kuralıdır, güvenlik sınırı değildir; sıfır tutarlı
  kalem hiçbir tutarı, borcu ya da bakiyeyi etkilemediği için sunucuda ayrıca denetlenmez (C4 korunur).
- **C7.** İşaret ve süzgeç **ekran ögesidir** (K-23): yazdırılan rapor değişmez, sıfır kalem kalem
  listesinde 0,00 ile basılır ve "Tutar girilmedi" rozeti basılmaz; `giderRaporu.js` ile
  `printTemplates.js`'e yeni ad girmez, `gider-gizlilik.test.js` taramaları gevşetilmez.
- **C8.** İleri yön de tek kaynaktan gelir (Ö-10): formun yerel KDV formülü (`GiderForm.jsx:95`
  `normalKdv`) `gider.kalemKdv`'ye bağlanır. İki formül aynı faturada farklı kuruş üretebilir, R3'ün
  gerekçesi tam olarak bu.

### KAPSAM DIŞI

- **X1.** Fatura okuma, OCR ya da e-fatura entegrasyonu — *neden:* bu iş yalnız elle girişi
  kolaylaştırıyor.
- **X2.** Tutarı girilmemiş kalem için bildirim, ses ya da açılışta pencere — *neden:* 0003'ün
  "sessizdir" kararı sürüyor; işaret ve süzgeç yeterli.
- **X3.** Sıfır tutarlı kalemin borç ve hatırlatıcı kapsamına alınması — *neden:* R15; ödenecek tutarı
  sıfır olan kalem borç değildir.
- **X4.** Elle açılan kalemde sıfır tutara izin verilmesi — *neden:* R14; orada sıfır bir eksiklik
  işareti değil, yanlış girişin ta kendisidir.
- **X5.** Tanımdan üretilen kalemin faturadan otomatik güncellenmesi — *neden:* X1.
- **X6.** **Standart genel giderde sıfır tutar** — *neden:* R9; standart gider aylık sabit tutarın
  kaynağı, orada sıfır bir eksiklik değil tanımsızlıktır. İki doğrulama noktası (`gider.js:981` ve
  `:993`) bugünkü hâliyle kalır.
- **X7.** **Kira ve personel tanımında sıfır tutar** — *neden:* R9; kirada stopajın sıfır üzerinden
  hesabı anlamsız, personelde R16 kuralı var.
- **X8.** **Girilen dâhil tutarla genel arama** — *neden:* 0026'nın araması tutarı eşitlikle ve yalnız
  sayısal sorguda, hariç tutar ile ödenecek tutar üzerinden yapıyor (`aramaGider.js`); dâhil tutar
  saklanmadığı için (R5) aranamaz. Kullanıcı faturadaki rakamla arayıp bulamazsa bu beklenen
  davranıştır; istenirse ayrı iş.

## Context

- **KDV dâhil girişin emsali uygulamada var (doğrulandı).** Kira kalemi bugün **"Hangi tutarı
  giriyorsunuz?"** diye soruyor ve brüt ya da net girilen tutardan ötekini hesaplıyor; kayıtta hangi
  yönün girildiği saklanıyor ve düzenlemede kullanıcı girdiği gibi görüyor. KDV dâhil/hariç seçimi
  **aynı desendir**: aynı soru, aynı saklama, aynı "kaydetmeden önce iki rakamı da göster" davranışı.
  Yeni bir kalıp icat edilmiyor.
- **Hazır sanılan yardımcı kullanılamıyor (doğrulandı).** `utils.extractKDV` KDV dâhil tutardan KDV'yi
  çıkarıyor ama oranı **satış tarafının tarih bazlı tablosundan** okuyor (`getKdvRateForDate`,
  `utils.js:377-382`) ve float döndürüyor. Gider kaleminin oranı kendi alanıdır ve formda elle
  değiştirilebilir (`GiderForm.jsx:286`, `:293`); ileri yön `kdvKurus` kuruş tamsayısıyla çalışıyor
  (`gider.js:141`). Bu yüzden R3 tek kaynağı **yeni** bir fonksiyona (`kdvAyir`) bağlıyor ve
  `extractKDV`'ye dokunmuyor. Ayrıca bugün formun kendi yerel KDV formülü var (`GiderForm.jsx:95`
  `normalKdv`); C8 onu da tek kaynağa bağlıyor, çünkü ikinci bir formül aynı faturada farklı kuruş
  üretir.
- **Gösterim de büyük ölçüde hazır.** Form normal kalemde "KDV" ve "Ödenecek" satırlarını zaten yazıyor
  (`GiderForm.jsx:310-313`), kirada dört satırlı kutu var (`:301-305`). R2'nin eklediği şey yön seçimi,
  ayrılan hariç tutar ve yuvarlama farkının yazılması.
- **Kira ile çakışma yok ama açıklama gerekiyor.** Kirada iki soru birden sorulabilir: tutar brüt mü net
  mi (stopaj için) ve KDV dâhil mi hariç mi. İkisi farklı eksenlerdir ve birbirini dışlamaz, ama
  ekranda yan yana durduklarında kafa karıştırabilir. Pratikte kiraya veren şahıssa KDV yoktur,
  şirketse stopaj yoktur; yani ikisi aynı anda nadiren anlamlıdır. Form bunu bir ipucuyla söylemeli.
- **Sıfır tutar bugün ALTI ayrı yerde engelli (sayıldı).** Normal kalem (`gider.js:496`), kira kalemi
  (`:483`), personel toplamı (`:470`), tekrarlayan tanım (`SettingsGiderTanimlari.jsx:51`) ve standart
  gider iki fonksiyonda (`gider.js:981`, `:993`); hepsinde aynı metin var ("Tutar sıfırdan büyük
  olmalı"). Bu yüzden R9 ve R14 önemli: kuralı topyekûn kaldırmak elle giriş hatalarını da serbest
  bırakır. Yalnız **davranışı normal olan tanım** ve **o tanımdan üretilen kalem** için açılmalı; kira,
  personel ve standart gider kapsam dışıdır (X6, X7).
- **Borç tarafı kendiliğinden güvende, ama kural sanılan yerde değil (doğrulandı).** Eleme
  `borcKapsamindaMi`'de DEĞİL (`gider.js:894`; o yalnız çöp, ödendi, tarihsiz, yürürlük öncesi ve
  gelecek tarihi süzer), **hedef kalanı düzeyinde**: `borcOzeti` içinde `o <= 0` ile,
  `acikKalemler.js` ve `odemeHatirlatma.js` içinde `h.kalanK > 0` ile. Sıfır tutarlı kalemin tek
  hedefinin tutarı sıfır doğduğu için üçü de onu atlar. Bu, R15'i bedava getiriyor; tek yapılacak,
  kuralın bu işte **bozulmadığını** testle sabitlemek.
- **Sıfır kalemin ödeme durumu türetilmiştir.** 0024'ten beri `odendi` saklanmıyor,
  `odemeleriUygula` kalandan türetiyor. Kalanı sıfır olan kalemin "Ödenmiş" mi sayıldığı ölçülmeden
  bilinmiyor; bu yüzden R11 onu iddia etmiyor, ölçüp sabitliyor. Rozet her hâlde kalemi ayırır.
- **Asıl risk unutulmasıdır.** Sıfır tutarlı kalem sessizce dururken ay kapanırsa o ayın gideri eksik
  raporlanır ve kimse fark etmez. Bu yüzden R11 ve R12 işin asıl değeri: kalem görünür bir işaretle
  duracak ve tek süzgeçle toplanabilecek. İşaretsiz bir "sıfıra izin ver" değişikliği bu işi
  yapmış sayılmaz.

---

## Acceptance Criteria

### KDV dâhil giriş

- **AC-1.** Gider formunda tutarın KDV hariç mi dâhil mi olduğu seçilir; varsayılan hariçtir.
- **AC-2.** KDV dâhil seçilip faturadaki toplam yazıldığında form, kaydedilecek **üç rakamı** gösterir:
  KDV hariç tutar, KDV tutarı ve Ödenecek tutar.
- **AC-3.** Kaydedilen kalemin tutarı KDV hariç tutardır.
- **AC-4.** Ayırma `kdvKurus`'un tersidir: 1.180,00 ve %20 girildiğinde kalemin tutarı 983,33, KDV'si
  196,67 ve ödeneceği 1.180,00 olur. Elle 983,33 yazan kullanıcıyla birebir aynı kayıt doğar.
- **AC-5.** Yuvarlama yüzünden Ödenecek tutar girilen fatura toplamından sapan sınır durumda (0,03 ve
  %20) form **farkı yazar** ve gösterdiği KDV, motorun hesapladığı KDV ile aynıdır.
- **AC-6.** Düzenlemeye dönüldüğünde kullanıcı girdiği biçimi görür; dâhil tutar hariç tutar artı KDV
  ile yeniden kurulur, ayrı bir alanda saklanmaz.
- **AC-7.** Dâhil girilmiş bir kalemde KDV oranı değiştirilince gösterilen dâhil tutar da değişir
  (beklenen davranış, R5).
- **AC-8.** Tekrarlayan tanımda da aynı seçim vardır; tanım dâhil tutarı saklar ve üretilen kalem
  **üretim ayının** oranıyla ayrılmış doğru tutarla doğar.
- **AC-9.** `kdvOrani` alanı null olan ("KDV tarihe göre") bir tanıma dâhil tutar girilebilir ve üretim
  o ayın oranıyla ayırır.
- **AC-10.** Tanım listesinde tutarın altında "KDV dâhil girildi" / "KDV hariç girildi" yazar.
- **AC-11.** KDV oranı sıfırken iki seçenek aynı sonucu verir, seçici pasif değildir ve ekranda
  "KDV oranı sıfır olduğu için dâhil ve hariç aynı tutarı verir." ipucu görünür.
- **AC-12.** Kira kaleminde brüt/net seçimi bu işten önce ve sonra aynı çalışır; kira kutusunun dört
  satırı (brüt, stopaj, net, KDV) ve ödenecek satırı aynı değerleri yazar.
- **AC-13.** *(Revizyon 2, R6 Q1)* Kirada "KDV dâhil" ve "brüt kira" birlikte seçilince **önce KDV ayrılır**,
  sonra `kiraHesapla` o hariç tutarla brüt/net dönüşümünü yapar (ödenecek = girilen tutar − stopaj, kuruş
  farkı yazılır). "Net ödenen kira" seçiliyken KDV yönü seçicisi çizilmez ve kayıtta `kdvYonu` `"haric"`tır.
- **AC-14.** Personel davranışında KDV yönü seçicisi **çizilmez** ve kayıtta `kdvYonu` null kalır.
- **AC-15.** KDV ayırma tek fonksiyondan gelir ve ileri yön de tek kaynaktan: kaynak taraması
  `GiderForm.jsx`'te yerel KDV formülü (`normalKdv` gibi bir çarpma) bulunmadığını ve `extractKDV`'nin
  gider yolunda hiç çağrılmadığını doğrular.
- **AC-16.** `kdvYonu` sütunu `giderler` ve `gider_tanimlari` tablolarında roundtrip eder (dört nokta),
  temiz kurulumda da vardır.

### Sıfır tutarlı tekrarlayan kalem

- **AC-17.** Davranışı normal olan tekrarlayan tanıma sıfır tutar girilebilir.
- **AC-18.** Kira tanımına ve personel tanımına sıfır tutar hâlâ reddedilir.
- **AC-19.** Standart genel gidere sıfır tutar hâlâ reddedilir (iki doğrulama noktası).
- **AC-20.** Sıfır tutarlı tanımdan üretilen kalem kaydedilir ve tutarı **0 olarak** saklanır, null
  değil.
- **AC-21.** Bu kalem listede "Tutar girilmedi" rozetiyle görünür; rozetin ölçütü ödenecek tutarın sıfır
  olmasıdır, tanım bağı değildir (tanımı silinmiş sıfır kalem de işaretli görünür).
- **AC-22.** Ödeme süzgecinin altıncı değeri bu kalemleri getirir ve etiketinde sayıyı yazar.
- **AC-23.** Süzgeç değişince kalem listesi 1. sayfaya döner (0062 anahtarı) ve hatırlatma kipiyle
  çakışmaz.
- **AC-24.** Tutar girilince rozet kalkar.
- **AC-25.** Elle açılan yeni kalemde sıfır tutar hâlâ reddedilir.
- **AC-26.** Dört bileşeni sıfır olan personel kalemi hâlâ reddedilir.
- **AC-27.** Sıfır tutarlı kalem borç özetinde, ödeme hatırlatıcısında ve açık kalemler listesinde
  görünmez.
- **AC-28.** Sıfır tutarlı kalem dönem raporunun toplamını değiştirmez, **kalem listesinde ve kalem
  sayısında** görünür.
- **AC-29.** Sıfır tutarlı kalem "ödenmemiş gider" kartında ve tedarikçi borcu kırılımında görünmez.
- **AC-30.** Sıfır tutarlı kalem ödeme yöntemi kırılımında görünmez.
- **AC-31.** Sıfır tutarlı kalemin formundaki ödeme kutusu satır çizmez; tutar girilip kaydedildikten
  sonra ödeme girilebilir.
- **AC-32.** Sıfır tutarlı kalem de mükerrer üretim uyarısına ve `uretilenAylar` kaydına normal kalem
  gibi girer; ikinci üretim bugünkü uyarıyı verir.
- **AC-33.** Sıfır tutarlı kalemin türetilmiş ödeme durumu ölçülüp sabitlenmiştir (hangi süzgeçte
  göründüğü testle yazılıdır).
- **AC-34.** Yazdırılan dönem raporunda sıfır kalem 0,00 ile basılır ve "Tutar girilmedi" rozeti
  basılmaz.

### Revizyon 2 eklemeleri

- **AC-39.** *(R23)* "KDV dâhil" seçilince tutar alanındaki rakam değişmez; özet kutusu ayrılmış tutarları
  gösterir.
- **AC-40.** *(R24)* Tanımdan üretilmiş normal kalemde ve normal tanımda boş tutar 0 olarak kaydedilir;
  elle açılan kalemde boş tutar reddedilir.
- **AC-41.** *(R25)* "Dâhil" tanımda model satırları toplamı KDV hariç tutarı aşarsa reddedilir; sıfır
  tutarlı tanımda model dağılımı reddedilir.
- **AC-42.** *(R26)* Sıfır tutarlı kalemin ödeme hücresi "—" yazar, "Ödendi" ya da ödeme düğmesi çizilmez.
- **AC-43.** *(R27)* `kdvYonu` alanı olmayan eski kalem formda "KDV hariç" seçili açılır ve tutarı aynen
  gösterir; eski tanım listede "KDV hariç girildi" yazar.
- **AC-44.** *(R6 Q1)* Tanımda kira + net + dâhil seçilemez; kira + brüt + dâhil tanımdan üretilen kalem
  önce KDV ayrılmış brütle doğar.

### Değişmeyenler

- **AC-35.** Gider raporu, kova dağılımı, makina maliyeti ve KDV karşılaştırması bu işten önce ve sonra
  aynı sonucu üretir; ölçüt `gider.test.js`, `makina-maliyeti.test.js` ve `gider-kdv-capraz.test.js`
  dosyalarının **dokunulmadan** yeşil kalmasıdır.
- **AC-36.** `kiraHesapla` ve `kdvKurus` imzaları ve çıktıları değişmemiştir.
- **AC-37.** `utils.extractKDV` değişmemiştir ve servis ücreti yolunda aynı sonucu verir.
- **AC-38.** İki sütun dışında yeni alan eklenmez; izin, sunucu denetimi ve `MERGE_KEYS` değişmez.

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. Dosyalar: motor
      `tests/kdv-dahil-0071.test.js`, bileşen `tests/ui/kdv-dahil-0071.test.jsx`, ek bloklar
      `kdv-dahil-0071.test.js` (AC-25, AC-26; R28: `gider.test.js` dokunulmaz), `ui/gider-settings`
      (AC-17, AC-18, AC-10),
      `db-roundtrip.cjs` ve `db-clean-install.cjs` (AC-16); `merge` dokunulmaz (yeni bölüm yok).
- [x] Ayırmanın `kdvKurus`'un tersi olduğu ve sınır durumda farkın yazıldığı testle gösterildi
      (AC-4, AC-5).
- [x] Kirada hesap sırasının "önce KDV, sonra brüt/net" olduğu ve net girişte seçicinin çizilmediği testle
      gösterildi (AC-13, AC-44).
- [x] Sıfır tutarlı kalemin borç zincirine girmediği testle sabitlendi (AC-27).
- [x] Motorların değişmediği, mevcut üç test dosyası dokunulmadan yeşil kalarak gösterildi (AC-35).
- [x] Tek kaynak kaynak taraması yazıldı: formda yerel KDV formülü yok, gider yolunda `extractKDV`
      çağrısı yok (AC-15).
- [x] Görsel kanıt: `docs/evidence/0071-taban-piksel-raporu.json` ve `0071-piksel-raporu.json`;
      ekranlar gider formu (normal ve kira, KDV dâhil seçimi ve ayrılan tutarlar), tanım formu ve
      listesi, kalem listesi rozeti, ödeme süzgeci. `GiderForm` ve `DonemRaporu` tasarım sözlüğünü
      kullandığı için `docs/evidence/kanit-eslemesi.json` kayıtları `beklenen: "degisti"` artı onay
      satırı taşıdı ve `done`'a taşınırken `0071-taban-piksel-raporu.json` (22 görüntü, hepsi 0 piksel) ile
      `ayni`ye çevrildi.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: `kdvYonu` sütununun iki tabloda olduğu, ayırmanın `kdvAyir` ile tek
      yerden yapıldığı ve `extractKDV`'nin bu yolda kullanılmadığı, kirada hesap sırası, sıfır tutarın
      yalnız normal davranışlı tanım yolunda serbest olduğu ve rozetin ölçütünün ödenecek tutar olduğu.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R2 plan onayı (Q1–Q7: kirada dâhil yalnız brüt, tek tutar alanı, boş = 0, model sınırı, "—" hücresi, eski kayıt hariç, AC-35/DoD çelişkisi). Uygulamada R20 notu (ölçülen durum "ödenmemiş", ödenmemiş sayımı); triyajda Durum ve C2 istisnaları. Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: model önizlemesi dâhil rakamla sınanıyordu, karışık sürüm sürüm notu, görsel kanıt, spec metni. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Dördü de gerçek; görsel kanıt bulgusu çekim sürerken verildi (kanıt o anda henüz üretilmemişti). Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Güncellenen dört eski test bilinçli değişiklik (spec atfıyla); Electron dahil bütün testler yeşil. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Spec'in istediği hesap sırası matematiksel olarak doğrulanmalı: "önce KDV ayır, sonra neti brüte çevir" kurala benziyordu ama KDV brüt üzerinden hesaplandığı için net girişte girilen rakamla tutmayan bir ödenecek üretiyordu; plan aşamasında bir örnekle hesaplanınca ortaya çıktı. İkincisi: bir alanın anlamını değiştiren her iş (burada tutar alanı dâhil/hariç) o alanı okuyan bütün önizlemeleri de taramalı; kayıt doğru, ekran yanlış kalan model önizlemesi testsizdi. Üçüncüsü: görsel kanıt çekilirken başka hiçbir iş (lint dahil) koşulmamalı; tabanda üç ekran kararsız çizildi.
