# 0070 — Çalışan Maliyetinde Yol Parası ve SGK

| | |
|---|---|
| **Durum** | Tamamlandı (commit `14b74b4`, dal `feat/0070-sgk-yol`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar > Firma > Firma Çalışanları, personel gider kalemi, ödeme hedefleri, borç özeti ve hatırlatıcı, tekrarlayan üretim |
| **Bağımlı spec'ler** | 0001 (personel kalemi) · 0021 (stopaj hedefi, emsal) · 0042 (resmi/elden hedefleri) · 0054 (ek ödeme hedefleri) · 0020 (personel atanabilir) · 0024 (hareket ve ekstre) · 0053 (tek ödeme editörü) · 0061 (açık kalemler) · 0062 (sayfalama) · 0064 (kayıt kilidi) · 0047 ve 0060 (gizlilik) |
| **Revizyon** | 2 · 2026-10-06 uygulama planı onayı: Q1–Q10 işlendi (R14, R15, R20, R23, R26–R32, AC-5, AC-33, AC-40, AC-41–AC-45); plan `specs/done/0070-uygulama-plani.md` |
| **Önceki revizyon** | 1 · 2026-10-06 QA turu: B-1..B-8, Ö-9..Ö-23, K-24..K-26 işlendi (Takım Yöneticisi onayı) |

---

## Intent

Çalışan kartında bugün iki tutar var: **resmi işveren maliyeti (SGK dâhil)** ve **elden ödenen**.
Müşteri iki alan daha istiyor:

1. **Yol parası**: çalışana ödenen, maaştan ayrı izlenmesi istenen bir bileşen.
2. **SGK**: çalışan başına ödenen SGK tutarı; üstelik bu tutarların **aylık toplamı bir gider olarak
   ödenecek**, çünkü SGK'ya yapılan ödeme tek kalemde, kuruma yapılır.

İkisi aynı ekrana aynı anda girilecek ve ikisi de personel giderinin bileşeni olacak, bu yüzden tek
spec. Ama ödeme tarafında **farklı davranırlar**: yol parası çalışana gider, SGK kuruma gider. Bu ayrım
bu işin bütün tasarımını belirliyor.

Başarı şu demek: çalışan kartında dört tutar var, personel gideri dördünü de kapsıyor, SGK ayrı bir
alacaklı olarak izleniyor ve ayın bütün SGK borcu tek yerden ödenebiliyor.

---

## Requirements

### A. Çalışan kartı

- **R1.** <span>Ayarlar > Firma > Firma Çalışanları</span> ekranında, resmi ve elden alanlarından sonra
  **yol parası** ve **SGK** alanları bulunur. Sıra: resmi, SGK, elden, yol parası (SGK resmi tarafın
  devamı, yol parası elden tarafın devamı).
- **R2.** İki alan da boş bırakılabilir; boş alan sıfır sayılır ve o çalışan için bugünkü davranış
  sürer.
- **R3.** Satır içi hızlı girişte ve düzenleme penceresinde aynı alanlar bulunur.
- **R4.** **Çalışan kartı için** yeni veritabanı sütunu gerekmez: `calisanlar` meta JSON deseniyle
  saklanıyor ve yeni alanlar kayıtla birlikte taşınır (Context'te doğrulandı). **Bu muafiyet kalemi
  kapsamaz** (R20).
- **R23.** Bu işle **yanlış hâle gelen iki yazılı kural** aynı işte güncellenir (Ö-10): çalışan
  kartındaki `Field label="Resmi işveren maliyeti (SGK dahil)"` (`CalisanManager.jsx:199`) etiketinden
  "(SGK dahil)" kaldırılır (AC-4), ve gider formundaki "Girilen tutar SGK ve işsizlik primlerini
  içerir. SGK prim ödemesini ve maaş transferini ayrıca gider olarak girmeyin" notu
  (`GiderForm.jsx:260`) yenilenir: SGK kendi kutusuna yazılır, SGK ödemesi ayrı bir gider kalemi
  değildir, kalemin SGK hedefinden ödenir. Yeni alanı olmayan eski kalemlerde eski anlamın geçerli
  kaldığı da yazılır (R7). *(Revizyon 2, Q7: kullanıcı rehberi `docs/rehber/` depoda değil ve Takım
  Yöneticisi kararıyla bu işin kapsamından çıkarıldı.)*
- **R24.** Çalışan kartının **normalize kapıları ve tablosu** dört alana genişler (Ö-12, Ö-13):
  `maliyetNormalize`'ın `"resmiMaliyet" in c` kapıları (`CalisanManager.jsx:22-25`), `setItems`
  sarmalayıcısının koşulu (`:46`) ve `calisanMaliyetsiz` denetimi (`GiderForm.jsx:91`) dört alanı
  sayar; `calisanMaliyetsiz` uyarısı "dört alan da boş" olur. Liste tablosu dört sütuna çıkar, "Aylık
  toplam" dört bileşeni toplar (bugün `r.deger + e.deger`, `:153-156`) ve altındaki ipucu
  "resmi + SGK + elden + yol parası" olur (bugün "resmi + elden", `:171`). Dar genişlikte sütunlar
  sığmazsa SGK ve yol parası tek sütunda alt satır olarak gösterilir (TY kararı).

### B. Personel gider kalemi

- **R5.** Tekrarlayan personel kalemi üretilirken dört bileşen de **çalışan kartından** okunur: resmi,
  SGK, elden, yol parası. Kalem formunda dördü de ayrı alandır ve elle düzeltilebilir. **Tekrarlayan
  tanım formunda yeni alan AÇILMAZ** (Ö-20): bugünkü resmi ve elden davranışının aynısı, tanımın kendi
  SGK alanı yoktur ve tek kaynak çalışan kartıdır (personel tanımları çalışan başına üretiliyor,
  `SettingsGiderTanimlari.jsx:93`, `tutar: null`).
- **R6.** **Kalemin toplam tutarı dört bileşenin toplamıdır** (artı ek ödemeler): resmi + SGK + elden +
  yol parası. Gider raporu, KDV'siz gider toplamı, kova dağılımı ve makina maliyeti bu toplamı okur;
  bugünkü "tek toplam" kuralı korunur. **Çalışana ödenecek tutar toplamdan SGK düşülerek bulunur**
  (B-2): `odenecekKurus = kalemKurus − stopajKurus + kdvKurus` (`gider.js:150`) deseninin aynısı, SGK
  stopajın yerinde. `hedefToplamKurus` ve `personelHedefTutarlari` bu ayrımı yapar, `kalemKurus` dört
  bileşeni toplamaya devam eder. Yazılmazsa SGK iki hedefte birden görünür (ANA içinde ve kendi
  hedefinde) ve kalan borç şişer.
- **R7.** **Göç yoktur.** Yeni alanları olmayan eski kalemler bugünkü gibi davranır (SGK ve yol parası
  sıfır); hiçbir eski kaydın tutarı ve ödeme durumu değişmez.
- **R20.** Kalemin yeni alanları **veritabanı sütunu ister** (B-1): `giderler` normalize tablodur ve
  `resmiTutar` ile `eldenTutar` orada ayrı sütunlardır (`electron/db.cjs:221-230`). **İki** yeni sütun
  eklenir (`sgkTutar`, `yolParasi`; revizyon 2, plan Q2: `sgkVade` sütunu açılmaz, SGK vadesi SGK satırının
  vadesidir, kira stopajının `stopajVade` emsali), dört nokta kuralıyla: `SCHEMA_SQL`,
  `applyColumnMigrations` içinde `ensureColumns`, INSERT listesi ve parametreleri, SELECT eşlemesi.
  `gider_taksitleri.hedef` yeni `"sgk"` değerini taşır. `db-roundtrip.cjs` ve `db-clean-install.cjs`
  kapsamına girer.

### C. Ödeme hedefleri

- **R8.** **Yol parası çalışana ödenir** ve **elden** hedefine katılır; ayrı bir ödeme hedefi açılmaz
  (X1). Karar kapatıldı (B-7): bordroda gösteren kullanıcı için **ayrı anahtar eklenmez**, öyle bir
  kullanıcı tutarı resmi alanına yazar ve yol parası alanını boş bırakır; bu cümle ekrandaki ipucuna da
  yazılır. **Hedef adı değişmez** (B-8): çok hedefli personelde ELDEN'in adı "Maaş (elden)" olarak kalır
  (`odemeYontemi.js:139`), ve yalnız yol parası sıfırdan büyükken hedef bloğunun altında `Ipucu` ile
  "Yol parası bu tutarın içindedir." yazar. `HEDEF_ADLARI` tek tablo kuralı ve
  `hedef-adlari-0060.test.js`'in düz metin yasağı korunur.
- **R9.** **SGK kuruma ödenir ve kendi ödeme hedefidir.** Kira kaleminin vergi dairesi hedefinin
  emsalidir: aynı kalemin içindedir, ayrı vadesi ve ayrı ödeme durumu vardır. **Adı `HEDEF_ADLARI.genel`
  tablosuna yazılır** (B-3; yönelme "SGK'ya", yalın "SGK") ve `HEDEF_SIRASI`'na eklenir, ama
  **`PERSONEL_HEDEFLERI`'ne EKLENMEZ** (`gider.js:185`): `hedefAdKaydi` personel davranışında
  `HEDEF_ADLARI.personel[hedef]` varsa ve kalem çok hedefli değilse adı `personelTek` yani "Çalışana"
  yapıyor (`odemeYontemi.js:144-146`), yani SGK'yı personel tablosuna koymak yalnız SGK'sı olan kalemde
  adı yanlış üretir ve `personelCokHedef` kapısını bozar. SGK hedefi `satirsizHedefler`'de stopajın
  yanına kendi satırıyla eklenir (`gider.js:221-222` emsali).
- **R10.** SGK hedefi **taksitlenmez, tek satırdır** ve taksit sayısı alanı yoktur (Ö-17);
  `planYenidenBol` onu ödenmiş olsa bile korur (ELDEN'in tek satır kuralının emsali, 0042 X7). Stopajın
  `stopajTaksitSayisi` alanı kopyalanmaz.
- **R11.** SGK hedefine çek ciro edilmez ve kendi çekimiz yazılmaz. Mekanizma mevcuttur (Ö-18): çek
  satırı yalnız ANA hedefinde çizilir, SGK bloğunda seçenek yoktur ve nedeni 0054'ün
  `CIRO_YALNIZ_ANA_NEDENI` sabitinden yazılır; yeni kod değil, mevcut kuralın testlenmesi.
- **R12.** Hedef adları tek tablodan gelir (R9); SGK hedefinin adı listede, ödeme ekranında, Kasa
  hareket listesinde ve ekstrede aynıdır.
- **R21.** **SGK'sı sıfır olan kalemde SGK hedefi hiç doğmaz** (Ö-19): `stK > 0` kapısının emsali
  (`gider.js:221`). Böylece bugünkü kalemler tek hedefli kalır ve `personelCokHedef` sayımı değişmez;
  sıfır tutarlı hedef ödeme ekranında boş blok, borç özetinde sıfır satır üretmez.
- **R22.** **Çalışan ekstresi SGK'yı dışlar** (Ö-9): `kasa.calisanEkstresi` bugün kalemin bütün
  hedeflerini okuyor (0024 B, 0042), ama SGK çalışana ödenmiyor. Ekstre "bu kişiye ne ödedik"
  belgesidir ve kişi bazlı SGK tutarını açığa çıkarmamalı (R17); stopajın tedarikçi ekstresinde
  olmamasının emsali. SGK'nın izi borç özeti satırı, ödeme hatırlatıcısı ve Kasa hareket listesidir.

### D. SGK borcunun toplu görünmesi ve ödenmesi

- **R13.** Borç özetinde SGK, **tek bir taraf satırı** olarak toplanır (vergi dairesi emsali): kişi
  bazında dağılmaz, çalışan adı görünmez. Satırın türü `sgk`, taraf adı tek sabitten
  (`gider.SGK` = "SGK", `gider.VERGI_DAIRESI` ile aynı kalıpta; 0060 R24'ün "taraf adı hedef adından
  ayrı kavramdır" kuralı) ve rozet metni "Kurum" (Ö-16; bugünkü üç tür `calisanlar` / `vergiDairesi` /
  tedarikçi ve rozetleri "Çalışan" / "Kira stopajı" / "Tedarikçi"). Aynı satır `AcikKalemler` ve
  `OdemeHatirlatma`'da da taraf olarak görünür; ad üç ekranda tek sabitten okunur.
- **R14.** Ödeme hatırlatıcısında SGK borcu kendi satırında görünür. Bunun için **vade şarttır** (B-6):
  hatırlatıcı vadesi olmayan hedefi hiç almıyor (`odemeHatirlatma.js:92`, `h.vade` şartı). Kalem
  formuna "SGK vadesi" alanı eklenir; boşsa kalemin `sonOdemeTarihi`'ni izler ve satırsız stopajın
  "vadesi bilinmez" davranışına düşmez. **Revizyon 2 (Q2):** SGK'sı olan kalem satırlıdır (kira stopajı
  emsali) ve vade SGK satırının vadesi olarak saklanır; form alanı satırdan geri kurulur, ayrı sütun
  yoktur. Tekrarlayan üretim kalemi vadesiz doğurur (bugünkü gibi); vade kalemde girilene kadar SGK
  hatırlatıcıya girmez.
- **R15.** **Ayın bütün SGK borcu tek işlemde ödenebilir.** İki parça gerekir, ikisi de bugün yok:
  - **Yeni saf fonksiyon** (B-4): `sgkToplamOdeme(kalemler, { turMap, hesaplar, tarih, hesapId })`,
    her kalemin SGK hedefi için bugünkü `cokluOdemeDogrula`'yı **kalem kalem** çağırır, hataları kalem
    adıyla toplar, ya hep ya hiç döner ve tek hareket dizisi üretir. Mevcut doğrulayıcı tek kalem alıyor
    (`kasa.js:429`), `odemeGirisiHazirla` tek kalem alıyor (0053) ve `odemeDogrula` birden çok kalemi
    açıkça reddediyor (`kasa.js:396`); bunlar **değiştirilmez**, üstüne sarmalayıcı yazılır.
  - **Yeni giriş noktası** (B-5): borç özeti satırları bugün salt okunurdur (metin, rozet, çalışanlarda
    "Adları göster"; vergi dairesi satırının da ödeme düğmesi yok). SGK satırına `gider_odeme` ile
    "SGK'yı Öde" düğmesi ve yeni pencere (`gider/SgkToplamOdeme.jsx`, `wide`, 0050 Sınıf 1). Pencere
    kalemleri çalışan adıyla değil **ay ve kişi sayısıyla** listeler (R13), toplamı ve hesabı gösterir.
    Satır hangi kapsamı ödediğini yazar: dönem raporu kipinde o dönem, açık kalemler kipinde tüm
    dönemler. **Revizyon 2 (Q4):** borç özeti satırı dönemden bağımsızdır (bütün açık SGK), bu yüzden
    kapsam **pencerenin ay seçicisiyle** belirlenir: açık SGK'sı olan aylar kişi sayısı ve toplamıyla
    listelenir, varsayılan Dönem Raporu'nun ayı (o ayda açık SGK varsa), yoksa en eski açık ay; seçilen
    ayın bütün SGK hedefleri tek işlemde ödenir. Açık kalemler kipinde de aynı pencere açılır.
- **R16.** Toplu ödeme bugünkü ödeme kurallarını **gevşetmez**: her hareket kendi kalemine bağlanır,
  kalandan fazla ödeme reddedilir, TL dışı hesaptan ödeme yapılamaz, hepsi ya da hiçbiri yazılır.
- **R25.** Toplu ödeme **kilit denetimi yapar** (Ö-21): kayıt anında kapsamdaki **her kalemin** `gider`
  kilidine bakar (0064 R25 alanı, R36 emsali) ve başkasının kilitlediği tek bir kalem varsa yazım
  bütünüyle reddedilir (R16'nın "hepsi ya da hiçbiri"yle tutarlı). Pencere kendisi kilit tutmaz (çok
  kayıt, anlık işlem); emsal `useKilitListesi` ile `baskasiKilitli`.

### F. Revizyon 2 (plan onayı)

- **R26 (Q1).** İş `feat/0071-kdv-dahil` üstünde yapılır (0071 main'e alınmadı ve aynı dosyalara dokunuyor).
- **R27 (Q3).** 0071'in "Tutar girilmedi" ölçütü **kalem tutarının sıfır olması** olur (`kalemTutari`): bu iş
  personelde ödenecek tutarı toplam − SGK yaptığı için yalnız SGK'sı girilmiş kalem eski ölçütle yanlışlıkla
  işaretlenir ve SGK'sı gizlenirdi. Personel dışı kalemde sonuç aynıdır.
- **R28 (Q5).** Avanstan mahsup SGK hedefine yapılamaz: mahsup kipinde SGK hedefi listelenmez ve motor
  reddeder (avans çalışanın borcudur, SGK kurumun alacağı; R22 ilkesi).
- **R29 (Q6).** Dönem Raporu tür kırılımının personel ayrıntısına "SGK" ve "Yol parası" sütunları eklenir
  (satır toplamı sütunlarla tutsun); ayrıntı yalnız ekranda ve varsayılan kapalıdır (R19).
- **R30 (Q8).** Ayda tek çalışan varsa rapordaki SGK kutusunun toplamı o kişinin SGK'sıdır; kabul edilen risk
  (0061 R33 emsali).
- **R31 (Q9).** Raporun "ayın ödeme hareketleri" tablosunda SGK hedefine yapılan ödemeler "Personel ödemeleri"
  toplu satırına değil kendi "SGK ödemeleri · Ay geneli" toplu satırına düşer; kişi bilgisi yine çıkmaz.
- **R32 (Q10).** Alan adları: çalışan kartında `sgkMaliyet` ve `yolParasiMaliyet`, kalemde `sgkTutar` ve
  `yolParasi`; dördü de `gider-gizlilik` yasaklı listesindedir.
- Hatırlatıcı kartı kalem saymaya devam eder: SGK ayrı satırda görünse de bir kalem bir kez sayılır
  (0021 R14).

### E. Gizlilik

- **R17.** Yol parası ve SGK çalışan bazlı tutarlardır: yazdırılan hiçbir belgede çalışan adı ya da
  kişi bazlı tutar olarak görünmez.
- **R18.** Aylık Gider ve Kasa Raporu'nda SGK **zorunlu olarak tek toplam kutu** basar (Ö-15):
  "GİDER · SGK", ayın personel kalemlerinin SGK toplamı, ödenen ve açık ayrımıyla; boşsa hiç basılmaz.
  0060'ın stopaj kutusunun birebir emsali (`stopajOzeti` gibi bir `sgkOzeti`). Kişi kırılımı basılmaz
  ve koruma çıktı temellidir (C7).
- **R19.** Ekranlarda personel ayrıntısı bugünkü gibi varsayılan kapalı kalır.

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla.
- **C2.** **Çift sayım yasağı:** SGK, personel kaleminin içindedir. Ayrıca bir "SGK gideri" kalemi
  üretilmez; kuruma yapılan ödeme yeni bir masraf değil, var olan kalemin bir hedefinin ödenmesidir.
  (0021 R7'nin kira stopajındaki kuralının aynısı.) Bu kuralı kullanıcıya anlatan tek yer gider
  formundaki nottur; R23 onu güncel tutar.
- **C3.** Bileşen tutarlarının tek kaynağı motordur; ekranlar toplamı yeniden türetmez.
- **C4.** Yeni izin yoktur ve **sunucuda şu listeler değişmez** (K-25): `BOLUM_SEKMELERI`,
  `EYLEM_IDLERI`, `ALAN_IZINLERI`. SGK ödemesi bugünkü `gider_odeme` izniyle geçer (hareket bölümünün
  ekleme izni), yeni kalem sütunları bölüm düzeyinde `gider_edit` ile yazılır ve
  `gider_taksitleri.hedef` yeni `"sgk"` değerini taşır (roundtrip testli).
- **C5.** Kullanıcıya görünen metinler Türkçedir.
- **C6.** Ödeme doğrulamasının **tek kalem kuralı korunur** (B-4): `odemeDogrula`,
  `cokluOdemeDogrula` ve `odemeGirisiHazirla` imzaları ve davranışları değişmez; toplu ödeme bunların
  üstüne yazılan bir sarmalayıcıdır. Mevcut doğrulayıcıyı çok kalemli hâle getirmek 0041, 0053 ve
  0057'nin bütün çağıranlarını riske atar.
- **C7.** **Gizlilik koruması çıktı temellidir ve taramalar gevşetilmez** (Ö-14): yeni alan adları
  (`sgkTutar`, `yolParasi`, ve çalışan kartındaki karşılıkları) `tests/gider-gizlilik.test.js`'in
  `YASAKLI` listesine eklenir (bugün `resmiMaliyet|eldenMaliyet` var, `:11`). R18'in izin verdiği SGK
  toplamı için 0060'ın deseni uygulanır: `giderRaporu.js` SGK kutusunu `<!--sgk-->` yorum işaretleri
  arasına yazar, test kutunun **dışında** eski yasakları aynen uygular ve kutunun **içinde** çalışan adı
  ile kişi bazlı tutar yasağını ayrıca arar. SGK hedefi `PERSONEL_HEDEFLERI`'ne girmediği için (R9)
  0054'ün `giderRaporu.js`'i de kapsayan taraması (`:82`) gevşetilmez.

### KAPSAM DIŞI

- **X1.** Yol parasının ayrı ödeme hedefi olması — *neden:* R8; beşinci hedef ödeme ekranını şişirir ve
  yol parası çalışana giden paradır, elden ile aynı kişiye aynı gün ödenir. İstenirse ayrı iştir.
- **X2.** SGK'nın ayrı bir gider kalemi olarak üretilmesi — *neden:* C2; masraf zaten personel
  kalemindedir, ikinci kalem çift sayım olur.
- **X3.** Bugünkü kayıtların SGK'sının resmi tutardan ayrıştırılması (göç) — *neden:* R7; eski kayıtta
  SGK resmi tutarın içindedir ve orada kalır, her kalemin kendi toplamı doğrudur.
- **X4.** SGK oranının otomatik hesaplanması (brüt maaştan) — *neden:* tutar elle girilir; oran, matrah
  ve tavan kuralları bordro işidir, bu uygulamanın konusu değil.
- **X5.** Yol parasının vergi istisnası ve bordro etkileri — *neden:* X4 ile aynı.
- **X6.** Yol parasının hedefini seçen bir ayar anahtarı (`giderAyarlari`'nda elden / resmi) — *neden:*
  B-7; hedef hesabını ikiye böler ve 0042 ile 0054'ün bölünmezlik kurallarının test matrisini iki katına
  çıkarır, kazanç ise tek bir alan seçiminden ibarettir. Bordroda gösteren kullanıcı tutarı resmi
  alanına yazar.
- **X7.** Tekrarlayan gider tanımında SGK ve yol parası alanı — *neden:* R5; aynı değeri tanımda ve
  çalışan kartında tutmak hangisinin kazandığı sorusunu açar, bugünkü davranış çalışan kartını tek
  kaynak yapıyor.
- **X8.** Toplu ödemenin **tek birleşik hareket** olarak yazılması — *neden:* C6; kalan borç kalem
  başına hesaplanıyor ve bir hareket yalnız bir kalemi kapatır. Kullanıcının "tek işlem" beklentisi
  girişte karşılanır, veride N hareket doğar (R15, AC-20).

## Context

- **Çalışan kartı veritabanı sütunu istemiyor, KALEM istiyor (doğrulandı).** Çalışanlar `calisanlar`
  meta JSON listesinde ve maliyet alanları kayıtla birlikte saklanıyor; orada yeni alan sütun açmadan
  taşınır, yani A bölümü ucuz. Ama kalem tarafı öyle değil: `giderler` normalize tablodur ve
  `resmiTutar` ile `eldenTutar` orada ayrı sütunlardır (`electron/db.cjs:221-230`). R20 üç yeni sütun
  istiyor (`sgkTutar`, `yolParasi`, `sgkVade`) ve dört nokta kuralı burada geçerlidir; bu projede sütunu
  atlamak sessiz veri kaybıdır.
- **Bugünkü etiket ve bugünkü uyarı, SGK kutusuyla çelişiyor.** Alanın adı bugün
  **"Resmi işveren maliyeti (SGK dahil)"** (`CalisanManager.jsx:199`) ve gider formunda şu uyarı var:
  "Girilen tutar SGK ve işsizlik primlerini içerir. SGK prim ödemesini ve maaş transferini ayrıca gider
  olarak girmeyin; aynı para iki kez sayılır." (`GiderForm.jsx:260`). Aynı iddia kullanıcı rehberinde de
  iki yerde geçiyor (`docs/rehber/gider-kasa-kurulum.html:94` ve `:235`). Üçü de bu işte güncellenir
  (R23), yoksa kullanıcı SGK'yı hem resmi hem SGK kutusuna yazar.
  SGK'yı ayrı kutuya alırsak bu etiket yanlış olur ve iki anlam bir arada yaşar. Çözüm **göç değil,
  sınır:** etiketten "(SGK dâhil)" kaldırılır, yeni alanı olmayan eski kalemler bugünkü hâliyle
  (SGK resmi içinde) kalır, yeni kalemler SGK'yı ayrı taşır. Her kalemin kendi toplamı her iki durumda
  da doğrudur; bozulan tek şey iki dönem arasında "resmi" sözcüğünün anlamıdır ve bu, 0042 ile 0054'te
  de aynı biçimde çözülmüş bir durumdur (göç yok, eski kayıt bugünkü davranışını korur).
- **SGK neden ayrı hedef, ayrı kalem değil.** Gider, çalışanın işverene toplam maliyetidir ve makina
  maliyetine o çalışanın üzerinden dağılır; ama SGK'ya ödenen para çalışana gitmez, kuruma gider. Bu
  tam olarak **kira ve stopaj** şeklidir: brüt kira giderdir, stopaj onun bir ödeme hedefidir ve vergi
  dairesine ödenir. Aynı şekli kullanmak hem çift sayımı engelliyor hem de borç, hatırlatıcı, ekstre
  ve rapor zincirinin tamamını bedavaya getiriyor, çünkü o zincir hedef kavramını zaten biliyor.
- **"Toplamı tek kalemde ödeyeceğim" ihtiyacı gerçek, ama altyapı yarım hazır (ölçüldü).** Ödeme
  doğrulaması bir hareketin **tek kaleme** bağlanmasını şart koşuyor (`kasa.js:396`, birden çok kalem
  açıkça reddediliyor), çünkü kalan borç kalem başına hesaplanıyor. R15 bunu kuralı gevşeterek değil,
  **tek kayıtta çok hareket** yazarak çözüyor: pencere on çalışanın SGK hedefine on hareket yazar,
  kullanıcı tek işlem yapmış olur. Hazır olan kısım `onKaydet`'in hareket **dizisi** alması; hazır
  OLMAYAN kısım doğrulama: `cokluOdemeDogrula` tek kalem alıyor (`kasa.js:429`) ve
  `odemeGirisiHazirla` tek kalem alıyor (0053). Bu yüzden R15 yeni bir saf sarmalayıcı istiyor ve C6
  mevcut üç imzayı dondurur. Ayrıca borç özeti satırları bugün salt okunurdur (vergi dairesi satırının
  bile ödeme düğmesi yok), yani giriş noktası da yeni (B-5).
- **Yol parası neden elden hedefine katılıyor (karar kapatıldı).** Beşinci bir hedef açmak ödeme
  ekranında her personel kalemi için bir blok daha demek; oysa yol parası çalışana, elden ile aynı gün,
  çoğunlukla nakit ödeniyor. Bordroda ve bankadan gösteren kullanıcı için ayrı bir ayar **eklenmiyor**
  (X6): öyle bir kullanıcı tutarı resmi alanına yazar ve yol parası alanını boş bırakır. Böylece tek kod
  yolu kalıyor ve 0042 ile 0054'ün bölünmezlik kurallarının test matrisi ikiye katlanmıyor (R8).
- **SGK'nın adı personel tablosuna yazılamaz (ölçüldü).** `hedefAdKaydi` personel davranışında
  `HEDEF_ADLARI.personel[hedef]` varsa ve kalem çok hedefli değilse adı `personelTek` yani "Çalışana"
  yapıyor (`odemeYontemi.js:144-146`). Yalnız SGK'sı olan bir kalemde bu ad çıkar, oysa para kuruma
  gider. Stopaj bu yüzden `genel` tablosunda duruyor; SGK da orada durur (R9). Ayrıca
  `PERSONEL_HEDEFLERI` (`gider.js:185`) ad tablosundan farklı bir iş yapıyor
  (`personelHedefTutarlari` ve satırsız personel hedefleri, `:219`), SGK oraya girmez.
- **Gizlilik zinciri hazır.** Personel verisi ekranlarda varsayılan kapalı, çıktılarda hiç yok. SGK bir
  **kurum** borcu olduğu için toplam olarak basılabilir (stopajın bugün basıldığı gibi); kişi bazında
  basılamaz. R18 bu ayrımı yazılı tutuyor.

---

## Acceptance Criteria

### Çalışan kartı

- **AC-1.** Çalışan kartında yol parası ve SGK alanları vardır ve sıra resmi, SGK, elden, yol parasıdır.
- **AC-2.** Boş bırakılan alan sıfır sayılır; o çalışanın kalemi bugünkü gibi üretilir.
- **AC-3.** Alanlar hem satır içi girişte hem düzenleme penceresinde vardır.
- **AC-4.** Resmi alanının etiketi artık SGK'yı kapsadığını söylemez.
- **AC-5.** *(Revizyon 2, Q2)* **Çalışan kartı için** veritabanı şeması değişmez; **kalem için iki sütun
  eklenir** (`sgkTutar`, `yolParasi`) ve roundtrip eder, temiz kurulumda da vardır; SGK vadesi
  `gider_taksitleri`'nde `hedef: "sgk"` satırının vadesi olarak roundtrip eder.
- **AC-24.** Yalnız SGK alanı girilmiş bir çalışan kaydedilince değer **sayı olarak** normalize edilir
  (üç kapının hepsi dört alanı sayar: `maliyetNormalize`, `setItems`, `calisanMaliyetsiz`).
- **AC-25.** Çalışan listesindeki "Aylık toplam" dört bileşeni toplar ve altındaki ipucu dört bileşeni
  sayar.
- **AC-26.** Gider formundaki SGK notu yenilenmiştir: SGK kendi kutusuna yazılır ve ayrı gider kalemi
  olarak girilmez.

### Kalem ve toplam

- **AC-6.** Tekrarlayan üretim dört bileşeni de kaleme çalışan kartından yazar.
- **AC-7.** Kalem toplamı dört bileşenin toplamına eşittir; **çalışana ödenecek tutar toplamdan SGK
  düşülmüş hâlidir** ve SGK yalnız kendi hedefinde görünür (ANA hedefinin içinde değil).
- **AC-8.** Gider raporu, kova dağılımı ve makina maliyeti bu toplamı okur.
- **AC-9.** Yeni alanı olmayan eski kalemin tutarı ve ödeme durumu değişmez.
- **AC-27.** Tekrarlayan gider tanımı formunda SGK ve yol parası alanı **yoktur**.

### Hedefler

- **AC-10.** Yol parası elden hedefinin tutarına katılır; yeni hedef açılmaz.
- **AC-28.** Yol parası sıfırdan büyükken elden hedef bloğunun altında "Yol parası bu tutarın
  içindedir." ipucu görünür; sıfırken görünmez ve hedefin adı değişmez.
- **AC-11.** SGK'sı sıfırdan büyük personel kaleminde ayrı bir SGK hedefi vardır.
- **AC-29.** SGK'sı sıfır olan kalemde SGK hedefi **hiç doğmaz** ve kalemin hedef sayısı değişmez.
- **AC-12.** SGK hedefi kendi vadesini (`sgkVade`, boşsa kalemin vadesi) ve kendi ödeme durumunu taşır;
  kalem, SGK ödenmeden "Ödendi" olmaz.
- **AC-13.** SGK hedefi taksitlenmez; taksit sayısı alanı yoktur ve plan yeniden bölünürken ödenmiş SGK
  satırı korunur.
- **AC-14.** SGK hedefinde çek seçeneği yoktur ve nedeni mevcut sabitten yazılıdır.
- **AC-15.** SGK hedefinin adı listede, ödeme ekranında, Kasa hareket listesinde ve ekstrede aynıdır ve
  **tek tablodan** gelir; yalnız SGK'sı olan kalemde ad "Çalışana" değil "SGK'ya" çıkar.
- **AC-30.** SGK hedefi `PERSONEL_HEDEFLERI` listesinde **yoktur** (kaynak taraması) ve
  `personelHedefTutarlari` çıktısı bu işten önce ve sonra aynıdır.
- **AC-31.** Çalışan ekstresinde SGK hedefi **görünmez**; ekstrenin son bakiyesi çalışana olan borçla
  eşit kalır.

### Borç ve toplu ödeme

- **AC-16.** Borç özetinde SGK tek taraf satırıdır; çalışan adı görünmez, rozet "Kurum" yazar ve taraf
  adı tek sabitten gelir.
- **AC-32.** Aynı SGK taraf satırı açık kalemler listesinde ve ödeme hatırlatıcısında da aynı adla
  görünür.
- **AC-17.** Ödeme hatırlatıcısında SGK borcu kendi satırındadır (vadesi olduğu için kapsama girer).
- **AC-18.** SGK satırındaki "SGK'yı Öde" düğmesi `gider_odeme` ile görünür, kapsamdaki bütün SGK
  hedeflerini listeleyen pencereyi açar ve tek kayıtla öder; pencere çalışan adı değil ay ve kişi sayısı
  yazar.
- **AC-33.** *(Revizyon 2, Q4)* Pencere açık SGK'sı olan ayları kişi sayısı ve toplamıyla listeler;
  varsayılan Dönem Raporu'nun ayıdır (açık SGK varsa), yoksa en eski açık ay; ödeme seçilen ayı kapsar.
- **AC-19.** Toplu ödemede bir hedefte hata varsa hiçbiri yazılmaz ve hata o kalemin adıyla gösterilir.
- **AC-34.** Toplu ödeme kapsamındaki bir kalem **başkası tarafından kilitliyse** yazım bütünüyle
  reddedilir ve bildirim kilit sahibini söyler; kendi kilidi engellemez.
- **AC-20.** Toplu ödemeden sonra her kalemin SGK hedefi kapanır, hesap bakiyesi toplam tutar kadar
  düşer ve Kasa hareket listesinde **kalem başına bir satır** görünür (tek birleşik satır değil);
  satırların hedef etiketi "SGK" yazar.
- **AC-35.** `odemeDogrula`, `cokluOdemeDogrula` ve `odemeGirisiHazirla` imzaları ve davranışları
  değişmemiştir (kaynak taraması artı mevcut testlerin dokunulmadan yeşil kalması).
- **AC-36.** SGK ödemesi gider toplamını artırmaz (çift sayım yasağı, C2).

### Gizlilik

- **AC-21.** Yazdırılan belgelerde çalışan adı ve kişi bazlı yol parası / SGK tutarı geçmez; yeni alan
  adları `YASAKLI` taramasındadır.
- **AC-22.** Raporda SGK **zorunlu olarak** tek toplam kutu basar ("GİDER · SGK", ödenen ve açık
  ayrımıyla), boşsa hiç basılmaz; kutu `<!--sgk-->` işaretleri arasındadır, kutunun dışında eski
  yasaklar aynen geçerlidir ve kutunun içinde çalışan adı ile kişi bazlı tutar yoktur.
- **AC-37.** 0054'ün `giderRaporu.js`'i de kapsayan taraması gevşetilmemiştir (aynı desenle yeşil).
- **AC-23.** Ekranlarda personel ayrıntısı varsayılan kapalıdır.

### Değişmeyenler

- **AC-38.** Gider raporu, kova dağılımı, makina maliyeti ve KDV karşılaştırması yeni alanı olmayan
  veriyle bu işten önce ve sonra aynı sonucu üretir; ölçüt `gider.test.js` ve
  `makina-maliyeti.test.js` dosyalarının **dokunulmadan** yeşil kalmasıdır.
- **AC-39.** Yeni izin yoktur ve `BOLUM_SEKMELERI`, `EYLEM_IDLERI`, `ALAN_IZINLERI` değişmemiştir;
  `MERGE_KEYS` değişmez (yeni bölüm yok).
- **AC-40.** *(Revizyon 2, Q7: kaldırıldı; kullanıcı rehberi kapsam dışı.)*

### Revizyon 2 eklemeleri

- **AC-41.** *(R27)* Yalnız SGK'sı girilmiş personel kalemi "Tutar girilmedi" rozeti almaz ve ödeme hücresi
  SGK hedefini gösterir; tutarı tamamen sıfır kalem rozeti alır.
- **AC-42.** *(R28)* Mahsup kipinde SGK hedefi listelenmez; SGK satırına mahsup motorda reddedilir.
- **AC-43.** *(R29)* Personel ayrıntısında SGK ve yol parası sütunları vardır ve satır toplamı sütunlarla
  tutar; ayrıntı varsayılan kapalıdır.
- **AC-44.** *(R31)* Raporun ödeme hareketleri tablosunda SGK ödemeleri "SGK ödemeleri" toplu satırındadır.
- **AC-45.** *(R32)* Dört alan adı `gider-gizlilik` yasaklı listesindedir.

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. Dosyalar: motor
      `tests/calisan-sgk-0070.test.js`, bileşen `tests/ui/calisan-sgk-0070.test.jsx`, ek bloklar
      `gider-gizlilik` (yeni adlar ve SGK kutusu), `gider-kasa-raporu-0070.test.js` (rapor kutusu ve SGK ödemeleri
      satırı), ad tablosu ve ekstre dışlaması `calisan-sgk-0070.test.js`'te (triyaj), `db-roundtrip.cjs` ve
      `db-clean-install.cjs` (iki sütun ve `hedef` yeni değeri; revizyon 2); `merge` dokunulmaz.
- [x] Eski kalemlerin değişmediği çapraz testle gösterildi (AC-9, AC-38).
- [x] Çift sayım yasağı testle sabitlendi: SGK ödemesi gider toplamını artırmaz ve SGK yalnız kendi
      hedefinde görünür (AC-7, AC-36).
- [x] Ödeme doğrulamasının üç imzasının değişmediği kaynak taramasıyla ve mevcut testlerin
      dokunulmadan yeşil kalmasıyla gösterildi (AC-35).
- [x] Toplu ödemenin kilit denetimi testle gösterildi (AC-34).
- [x] Gizlilik testleri yeni alanları kapsıyor ve rapor kutusu işaretlerle sınırlı (AC-21, AC-22,
      AC-37).
- [x] Görsel kanıt: `docs/evidence/0070-taban-piksel-raporu.json` ve `0070-piksel-raporu.json`;
      ekranlar çalışan kartı (satır içi ve pencere), gider formunun personel dalı, kalem listesi, borç
      özetindeki SGK satırı, SGK toplu ödeme penceresi. `CalisanManager`, `GiderForm` ve `DonemRaporu`
      tasarım sözlüğünü kullandığı için `docs/evidence/kanit-eslemesi.json` kayıtları
      `beklenen: "degisti"` artı onay satırı taşıdı ve `done`'a taşınırken `0070-taban-piksel-raporu.json` (18 görüntü,
      hepsi 0 piksel) ile `ayni`ye çevrildi.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: dört bileşen ve toplamdan SGK'nın düşülmesi, SGK'nın ayrı hedef olduğu ve
      adının `HEDEF_ADLARI.genel`'de durduğu (`PERSONEL_HEDEFLERI`'nde DEĞİL), yol parasının elden
      hedefine katıldığı, eski kayıtların neden göçmediği, toplu ödemenin sarmalayıcı olduğu ve iki yeni
      kalem sütunu.
- [x] ~~Kullanıcı rehberi güncellendi (AC-40).~~ *(Revizyon 2, Q7: kapsam dışı.)*
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R2 plan onayı (Q1–Q10: iki sütun, ay seçicili toplu ödeme, rozet ölçütü, mahsup, personel ayrıntı sütunları, rehber kapsam dışı, alan adları); uygulamada hatırlatıcıda SGK toplu satırı (R17 gereği). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: satırsız SGK kaleminde toplu ödeme ve mahsup çalışan hedefine düşüyordu; karışık sürüm sürüm notu; AC-44 testi ve plan tablosu; kanıt (çekim sürüyordu). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Dördü gerçek; kanıt bulgusu çekim sürerken verildi. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Güncellenen yedi eski test bilinçli değişiklik (spec atfıyla); Electron dahil bütün testler yeşil. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Yeni bir ödeme hedefi eklemek yalnız hedef listesine bir değer eklemek değildir; hedefi okuyan her yer (borç özeti, açık kalemler, hatırlatıcının bölüm satırları, ekstre, mahsup, rapor) tek tek gözden geçirilmeli. Hatırlatıcının bölüm satırı kurum hedeflerini kalem kalem çiziyordu ve SGK oraya girseydi kişi bazlı SGK tutarı rapora düşerdi; bunu çıktı temelli gizlilik testi yakaladı. İkincisi: "yeni kod hep satırlı doğurur" varsayımı eski sürümden gelen satırsız kalemi unutturur; satırsız dağıtımın hedef sırası yeni bir hedefin parasını başka hedefe yazabilir, bu yol ayrıca sınanmalı. Üçüncüsü: görüntü aracının sabit "bugün"ü fikstür tarihlerini de bağlar; gelecek tarihli fikstür ekranı sessizce boş çizer, kanıt ekranları gözle de doğrulanmalı.
