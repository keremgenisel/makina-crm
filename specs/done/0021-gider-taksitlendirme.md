# 0021 — Gider Taksitlendirme ve Vergi Ödemesi Takibi

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-27; commit `51690d4`, dal `feat/0021-gider-taksit`; plan `specs/done/0021-uygulama-plani.md` T1–T12) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider kalemi formu, gider dönem raporu, borç özeti, ödeme hatırlatıcısı, kira kalemi stopaj bölümü |
| **Bağımlı spec'ler** | 0001 (gider kaydı), 0003 (ödeme hatırlatıcısı) |
| **Revizyon** | R1 (2026-09-27): onay öncesi QA boşluk analizi, 0001 ve 0003'ün uygulanmış koduna göre; 14 açık nokta karara bağlandı — Context'in atıf yaptığı ama var olmayan madde R11 olarak yazıldı (KDV ile stopajın birlikte girilmesi uyarısı), kuruş artığının son taksite yazılacağı ve tutarların elle girilmeyeceği sabitlendi (R1, X7), türetilen ödeme durumunun kaleme yazılacağı gerekçelendirildi (R3; sunucu alan denetimi ve `vadesiGectiMi` o alanı okuyor), taksit işaretlemesinin sunucuda da denetlenmesi şart koşuldu (C5), vergi dairesinin sentetik satır olduğu ve hangi toplamlara girdiği yazıldı (R8), hatırlatıcıda satır sayısının ödeme hedefi başına olduğu netleşti (AC-9), AC-14 tespit yapmayan bilgi notuna çevrildi, plan değişikliğinin iki sınırı (R10) ve taksitlerin kimlikli alt tablo olduğu (C8) ile faiz içermediği (C9) yazıldı; AC-2 somutlaştı, AC-19…AC-25 eklendi. R2 (2026-09-27, plan onayı): veri modeli hedef başına ödeme satırları olarak sabitlendi, satırlar yalnız taksitli ve stopajlı kira kalemlerinde (C8/T1); satır kimliği SQLite birincil anahtarı değil ayrı sütun (C8/T2); sunucu denetimi satır bazında (C5/T3); aylık vade ay sonu kırpmalı (R1/T4); eski satırsız kira kaleminde stopaj durumu okuma anında kalemi izler, stopaj vadesi varsayılansız (R6/T5); hatırlatma kartı kalem sayar, pencere hedef başına satır gösterir (R4/T6); dönem raporunun "ödenmemiş gider" kartı değişmez (R5/T7); R8 yüzünden kırılan mevcut testler tek tek onaya gelir (C10/T8); AC-14 bilgi satırı kira ve normal formda (T9); taksit sayısı 1 planı kaldırır (R1/T10); tutar değişiminin kenar durumları (R10/T11). |

---

## Intent

Fabrika bazı giderlerini tek seferde ödemiyor. Kira stopajı vergi dairesine kredi kartıyla
taksitle ödeniyor, başka gider kalemleri de taksitlendirilebiliyor. Uygulamada ödeme durumu ise
ikili: ya ödendi ya ödenmedi. Bu yüzden altı taksitin ikisi ödenmiş bir borç, sistemde hâlâ
tamamen ödenmemiş görünüyor; ödeme hatırlatıcısı yanlış tutarı hatırlatıyor ve "kime ne kadar
borçluyuz" rakamı gerçeği göstermiyor.

Ayrıca kira kaleminin **iki ayrı alacaklısı** var: net kira ve KDV kiraya verene, kesilen stopaj
vergi dairesine gidiyor. Uygulama bugün bunu tek bir ödeme gibi görüyor, dolayısıyla vergi
dairesine olan borç hiçbir yerde görünmüyor.

Başarı şu demek: bir gider kalemi taksit planıyla kaydedilebiliyor, hangi taksitin ödendiği tek
tek işaretlenebiliyor, borç ve hatırlatma rakamları kalan taksitleri gösteriyor, ve kira
kaleminde vergi dairesine olan stopaj borcu kiraya verene olan borçtan ayrı izleniyor.

---

## Requirements

- **R1.** Bir gider kalemi **taksit planıyla** kaydedilebilir: **taksit sayısı ve ilk taksitin vadesi**
  girilir, tutarlar bunlardan türetilir. Eşit bölünmeyen tutarda kuruş artığı **son taksite** yazılır.
  Tutarlar tek tek elle girilmez (X7): serbest tutarlı plan, X1'in dışarıda tuttuğu serbest kısmi ödemeye
  açılan kapıdır.
- **R2.** Her taksit ayrı ayrı **ödendi** işaretlenebilir ve kendi ödeme tarihini taşır.
- **R3.** Kalemin ödeme durumu taksitlerden **türetilir**: hiçbiri ödenmemişse ödenmedi, hepsi ödenmişse
  ödendi, arası kısmen ödendi. Kullanıcı kalemin durumunu doğrudan çeviremez; taksitli kalemde durum
  taksitlerden gelir.
  **Güncelleme (2026-09-28, spec 0024 A, Q1):** aşağıdaki "kaleme yazılır" kararı değişti. Taksit satırı bayrakları
  ve kalemin `odendi`/`odemeTarihi`'si artık doğruluk kaynağı değildir: ödeme bir hareket kaydıdır, taksidin ve
  kalemin durumu hareketlerden okuma anında türer (`gider.odemeleriUygula`), taksit kısmen ödenebilir. Sunucunun
  `ALAN_IZINLERI.giderler` ve satır denetimi kaldırıldı; ödeme izni hareketin eklenmesinde aranır. Bkz.
  `specs/done/0024-kasa-ve-odeme-ayrimi.md`.
  **Türetilen durum kaleme yazılır, okuma anında hesaplanmaz:** `odendi` ve `odemeTarihi` alanları kalmaya
  devam eder ve taksit işaretlendiğinde tek yönlü olarak (taksitlerden kaleme) güncellenir. Sebep: sunucu
  `odendi`'yi **alan düzeyinde** denetliyor (`serverAuth.cjs` `ALAN_IZINLERI.giderler`) ve `vadesiGectiMi`
  doğrudan `k.odendi` ile `k.sonOdemeTarihi` okuyor (`gider.js:95`); o fonksiyon borç özeti, ödeme
  hatırlatıcısı ve dönem raporu süzgeci tarafından paylaşılıyor. Alanı türetilmiş tutmak üç ekranı ve
  yetki denetimini olduğu gibi çalışır durumda bırakır.
  **Kira kaleminde durum iki hedeften türer** (R6): ikisi de kapandıysa ödendi, biri kapandıysa kısmen
  ödendi, hiçbiri kapanmadıysa ödenmedi.
- **R4.** Borç özeti ve ödeme hatırlatıcısı taksitli kalemde **kalan taksitleri** sayar: tutar olarak
  ödenmemiş taksitlerin toplamı, vade olarak en yakın ödenmemiş taksitin vadesi. **Taksitli kalemde kalem
  düzeyinde vade aranmaz:** en yakın ödenmemiş taksitin vadesi kalemin vadesi sayılır, yani vadesiz
  görünen taksitli bir kalem hatırlatıcı kapsamından düşmez (0003'ün "son ödeme tarihi girilmiş olmalı"
  kuralının taksitli karşılığı budur).
- **R5.** **Taksit bir ödeme kavramıdır, gider kavramı değildir.** Kalemin gider tarihi, dönem raporundaki
  yeri, KDV'si ve makina maliyetine katkısı taksitten etkilenmez; gider doğduğu ayda sayılır, ödendiği
  aylara bölünmez.
- **R6.** Kira kaleminde **iki ödeme hedefi** ayrı izlenir: kiraya verene ödenecek tutar (net kira artı
  KDV) ve vergi dairesine ödenecek stopaj. İkisi ayrı ödendi işareti ve ayrı vade taşır; stopaj tarafı
  taksitlendirilebilir.
- **R7.** Vergi dairesine ödenen stopaj **yeni bir gider kalemi üretmez.** Stopaj zaten brüt kira
  tutarının içindedir; ayrı kalem olarak girilirse aynı para iki kez sayılır.
- **R8.** Borç özetinde vergi dairesi ayrı bir taraf olarak görünür; tedarikçi ve çalışan borçlarıyla
  karışmaz. **Sentetik satırdır**, tedarikçi kaydı açtırmaz (bugünkü "Çalışanlar" satırının deseni);
  tedarikçi kaydı istemek kullanıcıya gereksiz iş yükler ve tedarikçi kırılımını kirletir.
  **Toplamlara etkisi tanımlıdır:** stopaj borcu **genel açık borç toplamına girer**, "Tedarikçilere açık
  borç" kartına **girmez** (kartın adı zaten tedarikçi diyor). Bugün stopaj hiçbir borçta yok
  (`odenecekKurus = tutar − stopaj + KDV`, `gider.js:92`), yani bu iş genel borç rakamını bilinçli olarak
  artırır.
- **R9.** Taksitli ödemede ödeme yöntemi kalem düzeyinde seçilir (kredi kartı, havale, nakit, çek) ve
  bütün taksitler için geçerlidir.
- **R12.** (R2, T4) Taksit vadeleri **ilk vadenin gününden** ay eklenerek bulunur; ay o güne yetmiyorsa ayın son
  gününe kırpılır (31 Ocak → 28 Şubat → 31 Mart). Zincirleme eklenmez, gün kaymaz.
- **R13.** (R2, T5) **Eski kira kalemleri:** bu işten önce kaydedilmiş, ödeme satırı olmayan stopajlı kira kaleminde
  stopaj hedefinin durumu okuma anında **kalemin ödeme durumunu izler** (ödenmiş eski kira vergi dairesi borcu
  doğurmaz; ödenmemiş olanın stopajı borç özetine girer, R8). Stopaj vadesi bilinmediğinden bu hedef hatırlatıcıya
  girmez. Kalem düzenlenip kaydedilince satırlar kalıcı olur. Veri taşıma yazılmaz. **Stopaj vadesi için varsayılan
  yoktur**; alan boş gelir, kullanıcı girer.
- **R14.** (R2, T6, T7) Anasayfa hatırlatma kartındaki iki sayı **kalem** sayar (kalem en acil kovaya girer: vadesi
  geçmiş, yaklaşandan önce); liste penceresi hedef başına satır gösterir. Böylece 0003 AC-14'ün "kart toplamı =
  süzgeçteki kalem sayısı" eşitliği korunur. Dönem raporunun "ödenmemiş gider" kartı gider kavramıdır ve değişmez:
  kısmen ödenmiş kalem orada ödenmemiş sayılır; kalan borç yalnız borç kartlarında görünür.
- **R15.** (R2, T9) AC-14'ün bilgi satırı iki yerdedir: kira formunun vergi dairesi (stopaj) bölümü ve normal
  davranışlı kalemin formu (tek satır ipucu). Tespit yapılmaz.
- **R10.** Taksit planı sonradan değiştirilebilir; ödenmiş taksitler korunur, yalnız ödenmemiş olanlar
  yeniden düzenlenir. **İki sınır tanımlıdır:** (1) taksit sayısı **ödenmiş taksit sayısının altına
  indirilemez**; denenirse işlem yapılmaz ve nedeni söylenir. (2) Kalemin tutarı sonradan değişirse
  **yalnız ödenmemiş taksitler** yeniden bölünür (ödenmişler olduğu gibi kalır) ve toplam yine kalemin
  ödenecek tutarına tam eşit olur (C1).
  **Kenar durumları (R2, T11):** yeni ödenecek tutar ödenmiş taksitlerin toplamının altındaysa kayıt yapılmaz ve
  nedeni söylenir; kalan tutar var ama ödenmemiş taksit yoksa son vadeden bir ay sonrasına tek taksit eklenir;
  kalan sıfırsa ödenmemiş taksitler düşer. **Taksit sayısı 1** planı kaldırır (T10): normal kalem taksitsiz hâle
  döner; ödenmiş taksit varsa birinci sınır işler.
- **R11.** Kira kaleminde **stopaj oranı sıfırdan büyük ve KDV oranı sıfırdan büyük** girildiğinde form bir
  bilgi notu gösterir: kiraya veren şahıssa stopaj olur KDV olmaz, şirketse tersi; ikisi birlikte
  giriliyorsa istisnai bir durum olduğu hatırlatılır. **Engel değildir**, kullanıcı istisnai durumu
  girebilir.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır (0001 ile aynı); taksitlerin toplamı kalemin ödenecek
  tutarına **tam** eşittir.
- **C2.** Maliyet ve kârlılık hesabı (0002) taksitten **etkilenmez**; taksit yalnız ödeme tarafındadır.
- **C3.** KDV karşılaştırması değişmez: indirilecek KDV kalemin tarihine göre sayılır, ödendiği taksitlere
  bölünmez.
- **C4.** **Stopaj ile KDV birbirine karışmaz.** Stopaj bir gelir vergisi kesintisidir, KDV beyanından
  düşülmez; uygulamada da hiçbir KDV toplamına girmez.
- **C5.** Yeni izin boyutu tanımlanmaz; taksit işaretleme mevcut ödeme iznine (`gider_odeme`) bağlıdır ve
  bu **sunucuda da** geçerlidir. İki katman birlikte kurulur: taksit işaretlemesi kalemin `odendi` ve
  `odemeTarihi` alanlarını da güncellediği için (R3) mevcut alan denetimi devreye girer, **ayrıca taksit
  alanları `ALAN_IZINLERI`'ne eklenir**. (R2, T3) Denetim **satır bazındadır**: mevcut bir satırın `odendi` veya
  `odemeTarihi` alanı değişirse ya da yeni satır ödenmiş gelirse `gider_odeme` istenir; plan ve tutar değişikliği
  (R10 yeniden bölme) `gider_edit` ile geçer. Diziyi bütün olarak izlemek tutar düzenleyen kullanıcıyı da reddederdi.
  Aksi hâlde `gider_odeme` izni olmayan ama gider sekmesi olan bir
  kullanıcı taksitleri ödendi işaretler ve sunucu bunu bölüm düzeyinde geçirir.
- **C6.** Kullanıcıya görünen metinler Türkçedir.
- **C7.** Taksitli kalem, 0001'in "ödeme durumu ikili" kuralının (X10) **bilinçli istisnasıdır**; serbest
  kısmi ödeme (istediğin tutarı istediğin zaman öde) yine kapsam dışıdır.
- **C8.** Taksitler **kimlikli bir alt tabloda** tutulur (yedek parça tahsis deseni), kalemle birlikte
  yazılır, silinir ve birleştirilir. Bu projede iki alt kayıt deseni var: kimliksiz satırlar (gider model
  satırları, ana kayıtla birlikte yazılır) ve kimlikli alt tablo; taksitler **tek tek işaretlendiği** için
  kalıcı kimlik ister. Çöp kutusu simetrisi (AC-18) buradan gelir.
  **Model (R2, T1):** alt tablo `gider_taksitleri`, satır `{id, hedef: "ana" | "stopaj", sira, vade, tutar, odendi,
  odemeTarihi}`. Satırı olan kalemler: taksitli kalem (ana hedefte n satır) ve stopajı sıfırdan büyük kira kalemi
  (her zaman iki hedef; taksitsiz hedef tek satır). Taksitsiz normal ve personel kalemi satır taşımaz, bugünkü
  alanlarla çalışır. Satırı olan kalemde `odendi`, `odemeTarihi` ve `sonOdemeTarihi` (en yakın ödenmemiş vade)
  türetilip yazılır. Borç özeti, tedarikçi borcu, hatırlatıcı ve liste aynı saf hedef hesabını kullanır.
  **Kimlik (R2, T2):** satır kimliği SQLite birincil anahtarı değildir (yedek parça tahsis tablosundaki rowid
  çakışması bütün kaydı geri almıştı, `db.cjs`); ayrı bir sütunda tutulur, kalem başına silinip yeniden yazılır.
- **C9.** **Kabul edilen sınır:** taksit planı faiz ve komisyon içermez; borcun zamana bölünmesidir. Kredi
  kartı taksidi gerçekte faiz taşıyabilir, ama gider tarafında banka maliyeti hesaplanmıyor (X2) ve
  taksitlerin toplamı ödenecek tutara tam eşit kalır (C1).
- **C10.** (R2, T8) R8 genel açık borç rakamını bilinçli olarak artırdığı için stopajlı ödenmemiş kira içeren mevcut
  borç testleri kırılabilir. Her biri uygulama sırasında tek tek listelenir ve Takım Yöneticisi onayıyla güncellenir;
  toplu önceden istisna yoktur.

### KAPSAM DIŞI

- **X1.** Serbest kısmi ödeme — *neden:* taksit planı belirli sayıda ve belirli vadede ödemedir; serbest
  kısmi ödeme cari hesap ister (0024'ün konusu).
- **X2.** Kredi kartı komisyonu, faizi veya blokajının gider tarafında hesaplanması — *neden:* satış
  tarafındaki komisyon altyapısı gelir içindir; gider tarafında banka maliyeti ayrı bir karardır ve
  kullanıcı bugün böyle bir takip istemiyor.
- **X3.** Muhtasar beyanname veya vergi dairesi entegrasyonu — *neden:* uygulama takip eder, beyan etmez
  (0001 X3 ile aynı çizgi).
- **X4.** Stopajın gelir veya kurumlar vergisinden mahsubunun izlenmesi — *neden:* bu mali müşavirin
  yıllık hesabıdır; uygulamanın ödeme takibiyle ilgisi yok.
- **X5.** Kira dışındaki stopaj türleri (serbest meslek, ücret stopajı) — *neden:* 0001 X6'daki karar
  sürüyor; kullanıcı yalnız kira stopajı takip ediyor. Serbest meslek stopajı gerekirse aynı iki hedefli
  model oraya da taşınır.
- **X6.** Taksitlerin ayrı ayrı gider kalemi olarak raporlanması — *neden:* R5; gider doğduğu ayda sayılır.
- **X7.** Taksit tutarlarının tek tek elle girilmesi — *neden:* plan taksit sayısından türetilir (R1);
  serbest tutarlı plan, X1'in dışarıda tuttuğu serbest kısmi ödemenin kapısıdır.

---

## Context

- **Bugünkü ödeme modeli ikili.** Gider kaydında `odemeYontemi`, `sonOdemeTarihi`, `odendi` ve
  `odemeTarihi` var (`electron/db.cjs`, `giderler` tablosu); taksit diye bir alan yok. Ödeme yöntemi
  listesinde kredi kartı zaten seçilebiliyor (`gider/GiderAlanlari.jsx:140`), ama taksit bilgisi
  tutulmuyor.
- **Satış tarafında taksit altyapısı var ama başka amaçla.** `src/lib/krediKarti.js` kredi kartı
  komisyonu, blokaj ve hesaba geçiş tarihini hesaplıyor; bunlar **tahsilat** kavramlarıdır (bizim paramız
  ne zaman hesaba geçer). Gider tarafında soru bunun tersi: borcumuzu ne zaman kapatacağız. X2 bu yüzden
  kapsam dışı; iki taraf aynı altyapıyı paylaşmak zorunda değil. Buna karşılık **adlandırma oradan
  alınmalıdır**: tahsilat tarafında `payments.taksitSayisi` ve `payments.kartKomisyonu` sütunları zaten
  var (`electron/db.cjs`), ayrıca kayıt anında anlık görüntü saklama deseni (`kartKomisyonuSnapshot`)
  oturmuş durumda. Gider tarafı aynı sözcükleri ve aynı anlık görüntü desenini kullanırsa iki taraf
  okunurken karışmaz.
- **Kira kaleminin iki alacaklısı.** 0001 R6 brüt kira, stopaj oranı ve net ödenen tutarı birlikte
  tutuyor; 0007 ile gelen kural gereği ödenecek tutar "net kira artı KDV" olarak hesaplanıyor ve kesilen
  stopaj borca girmiyor. Bu doğru ama eksik: stopaj **ödenmiyor** demek değil, **başka tarafa** ödeniyor
  demek. R6 ve R8 bu eksiği kapatır.
- **Çift sayım tuzağı (R7).** Vergi dairesine ödenen stopaj yeni bir gider değildir; brüt kira zaten
  gider olarak sayılmıştır. Ayrı kalem açılırsa aynı para hem kira hem vergi olarak iki kez sayılır. Bu,
  0001 C19'daki personel çift sayımıyla aynı sınıftır ve aynı sertlikte yasaklanmalıdır.
- **Vergi kuralları (kullanıcının paylaştığı kaynak).** İşyeri kirasında stopaj oranı yüzde 20; net
  sözleşmede brüt = net × 1,25 ve stopaj = brüt / 5. Uygulamadaki iki yönlü hesap bu kuralla uyumlu.
  Kaynak ayrıca şunu söylüyor: **kiraya veren şahıssa stopaj vardır ve KDV yoktur; şirketse KDV vardır ve
  stopaj yoktur.** Uygulama bugün ikisini birden girmeye izin veriyor. Bu bir hata değil (kullanıcı
  istisnai bir durumu girebilmeli) ama bir uyarıya değer; **R11** bunu ele alır.
- **Ödeme durumu üç ekranın paylaştığı bir alandan okunuyor (R3).** `vadesiGectiMi(k, bugun)` doğrudan
  `k.odendi` ve `k.sonOdemeTarihi` okuyor (`gider.js:95`); borç özeti, ödeme hatırlatıcısı ve dönem
  raporunun ödeme süzgeci aynı fonksiyonu çağırıyor. Ayrıca sunucu `odendi`'yi alan düzeyinde denetliyor
  (`serverAuth.cjs` `ALAN_IZINLERI.giderler` → `gider_odeme`). Bu yüzden durum okuma anında hesaplanmaz,
  türetilip kaleme yazılır.
- **Stopaj bugün hiçbir borçta yok.** `odenecekKurus = kalemKurus − stopaj + KDV` (`gider.js:92`), yani
  0007'nin kuralı gereği kesilen stopaj tedarikçi borcuna girmiyor. R8 onu vergi dairesi tarafında borç
  yapar ve bu, genel açık borç rakamını bilinçli olarak artırır.
- **Borç özeti satır türleri üç tane:** `tedarikci`, `secilmemis`, `calisanlar`. Vergi dairesi dördüncü
  sentetik tür olarak eklenir (R8).
- **Hatırlatıcı kapsamı.** 0003'ün hesabı "ödenmemiş ve son ödeme tarihi girilmiş" kalemleri alıyor ve
  tutar olarak ödenecek tutarı kullanıyor. Taksit geldiğinde bu iki tanım da değişir (R4); hatırlatıcının
  saf hesabı tek kaynak olduğu için değişiklik oraya yapılır, ekrana değil.

Bilinen tuzaklar:

- **Kuruş kaçağı.** Taksitlerin toplamı kalemin tutarını tutmazsa borç özeti ile kalem sonsuza kadar
  birbirini tutmaz (C1).
- **Durumun iki kaynağı.** Kalemde hem elle çevrilebilen bir "ödendi" hem taksitlerden türeyen bir durum
  olursa ikisi ayrışır. R3 bu yüzden tek yön tanımlar.
- **Hatırlatıcının şişmesi.** Altı taksitli bir borç, hatırlatıcıda altı satır olarak görünürse liste
  kullanılamaz hale gelir. Öneri, kalem başına tek satır ve en yakın vadeyi göstermek.

---

## Acceptance Criteria

- **AC-1.** 12.000 TL ödenecek tutarı olan bir kalem 6 taksite bölündüğünde altı taksitin her biri
  2.000 TL olur ve toplamı 12.000 TL'dir.
- **AC-2.** 10.000 TL'lik bir kalem 3 taksite bölündüğünde ilk iki taksit 3.333,33 TL, **son taksit**
  3.333,34 TL olur; toplam tam 10.000 TL kalır.
- **AC-3.** İlk taksit vadesi girildiğinde sonraki taksitlerin vadeleri birer ay arayla oluşur.
- **AC-4.** Bir taksit ödendi işaretlendiğinde kalemin durumu "kısmen ödendi" olur.
- **AC-5.** Bütün taksitler ödendiğinde kalemin durumu "ödendi" olur.
- **AC-6.** Taksitli bir kalemde kullanıcı kalemin ödeme durumunu doğrudan değiştiremez.
- **AC-7.** Altı taksitin ikisi ödenmiş bir kalemde borç özeti kalan dört taksitin toplamını gösterir.
- **AC-8.** Aynı kalemde ödeme hatırlatıcısı en yakın ödenmemiş taksitin vadesini kullanır.
- **AC-9.** Hatırlatıcı listesinde satır sayısı **ödeme hedefi başınadır**, taksit sayısı kadar değil: altı
  taksitli bir kalem tek satır, iki hedefli bir kira kalemi en çok iki satır olarak görünür.
- **AC-10.** Taksit planı, kalemin gider tarihini, dönem raporundaki yerini ve KDV'sini değiştirmez.
- **AC-11.** Taksit planı, makina maliyeti ve kârlılık rakamlarını değiştirmez.
- **AC-12.** Brüt 20.000 TL, yüzde 20 stopajlı bir kira kaleminde kiraya verene ödenecek tutar ile vergi
  dairesine ödenecek 4.000 TL stopaj ayrı ayrı izlenir.
- **AC-13.** Kira kaleminde stopaj tarafı taksitlendirilebilir; kiraya veren tarafı ayrı ödeme durumu
  taşır.
- **AC-14.** Gider kalemi formunda, kira stopajının ayrı kalem olarak girilmemesi gerektiğini söyleyen
  kalıcı bir bilgi satırı bulunur (0001 C19'un personel notuyla aynı desen). Sistem "bu kalem bir stopaj
  ödemesidir" diye **tespit yapmaz**; kalemi stopaj ödemesi olarak tanıyacak bir işaret yoktur ve tutar
  eşleştirmesi güvenilmez.
- **AC-15.** Borç özetinde vergi dairesi ayrı bir taraf olarak listelenir.
- **AC-16.** Stopaj hiçbir KDV toplamına girmez; KDV karşılaştırması stopajdan etkilenmez.
- **AC-17.** Ödenmiş taksiti olan bir planda taksit sayısı değiştirildiğinde ödenmiş taksitler korunur.
- **AC-18.** Taksitli bir kalem silinip çöpten geri alındığında taksitleri ve ödeme durumları aynen döner.
- **AC-19.** Kira kaleminde stopaj oranı ve KDV oranı birlikte sıfırdan büyük girildiğinde bilgi notu
  gösterilir; kayıt engellenmez (R11).
- **AC-20.** `gider_odeme` izni olmayan bir kullanıcı taksiti ödendi işaretleyemez; arayüzde düğme
  görünmez ve sunucuya gönderilen böyle bir yazma reddedilir (C5).
- **AC-21.** Borç özetinde vergi dairesi sentetik bir satır olarak listelenir; stopaj borcu genel açık borç
  toplamına girer, "Tedarikçilere açık borç" kartına girmez.
- **AC-22.** İki taksiti ödenmiş bir planda taksit sayısı 1'e indirilmeye çalışıldığında işlem yapılmaz ve
  kullanıcıya nedeni söylenir.
- **AC-23.** Kalemin tutarı değiştirildiğinde ödenmiş taksitler aynen kalır, yalnız ödenmemiş taksitler
  yeniden bölünür ve taksitlerin toplamı yeni ödenecek tutara tam eşit olur.
- **AC-24.** Kalem düzeyinde son ödeme tarihi girilmemiş ama taksit planı olan bir kalem hatırlatıcıda
  görünür; vadesi en yakın ödenmemiş taksitin vadesidir.
- **AC-25.** Taksit işaretlendiğinde kalemin `odendi` ve `odemeTarihi` alanları türetilmiş değerle
  güncellenir; kullanıcı bu alanları doğrudan çeviremez (R3).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Taksit hesabı saf motorda (`gider.js` ile aynı desen), kuruş tamsayısıyla; toplamın tutarı tam
      karşıladığı testle gösterildi (C1).
- [x] Borç özeti ve ödeme hatırlatıcısı **aynı** taksit hesabını kullanıyor; iki yerde ayrı kural
      yazılmadı.
- [x] Maliyet ve kârlılığın değişmediği çapraz testle gösterildi (AC-11).
- [x] Yeni kalıcı alanlar **beşli kural** ile eklendi (şema, göç, yazma, okuma, birleştirme) ve
      `db-roundtrip` ile `db-clean-install` testlerine girdi; taksitler **kimlikli alt tablo** olarak
      kuruldu (C8).
- [x] Taksit alanları `ALAN_IZINLERI`'ne eklendi ve `gider_odeme` izni olmayan kullanıcının taksit
      yazımının reddedildiği uçtan uca testle gösterildi (C5, AC-20).
- [x] Vergi dairesi satırının genel borç toplamına girdiği, tedarikçi kartına girmediği testle sabitlendi
      (R8, AC-21).
- [x] Çöp kutusu geri alma simetrisi kuruldu (AC-18).
- [x] Kullanıcıya görünen tüm metinler Türkçe.
- [x] Görsel kanıt eklendi (`docs/evidence/0021-*.jpg`), aydınlık ve karanlık tema; kısmen ödenmiş kalem
      ve kira kaleminin iki hedefi dâhil.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` taksit modeli ve stopajın iki hedefli ödemesiyle güncellendi; çift sayım yasağı yazıldı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 0 | R2 onay anında işlendi (T1–T12); onaydan sonra Requirements, Constraints ve AC değişmedi. Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: beş bulgu (iki orta, üç düşük); kod davranışı değişti, görünüm değişmedi (taban 0 piksel). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 5 / 0 | Orta: ödenmiş eski kiranın ödeme izni olmayan kullanıcıca düzenlenememesi (R13 dönüşümü C5'e takılıyordu) ve stopaj sıfırlanınca kiraya verene ödemenin kaybı. Düşük: taksit üst sınırı, yeni kalemde ödeme izni (önceden var olan açık, kapatıldı), okunaklılık. | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Mevcut testlerin hiçbiri kırılmadı (T8 istisnası gerekmedi); 222 çekimde değişen yalnız gider ekranları. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**

- İki kural ayrı ayrı doğru olup birlikte çelişebilir: R13'ün "eski kalem ilk düzenlemede satıra çevrilir" dönüşümü C5'in
  satır bazlı ödeme denetimine takıldı. Veri dönüşümü yapan her kural, yetki denetiminin gözünden de test edilmeli
  (motorun ürettiği kayıt `eylemDenetimi`'nden geçirilerek; `server-authz` bulgu 1 testi bu çapraz deseni kurar).
- "Satır gerekli mi" koşulu yalnız planın bugünkü parametrelerine bakıyordu; geçmiş ödeme satırlarının varlığı da bir
  gerekçedir. Ödeme verisi taşıyan yapıyı kaldıran her dal, kaldırmadan önce ödenmiş veriyi aramalı.
- Görüntü karşılaştırmasında tek seferlik fark çıkabilir (evrak, 83 piksel): "sonra" görüntüsünü bir önceki onaylı
  çekimle bayt bayt karşılaştırmak, farkın koddan mı çekimden mi geldiğini hızlıca ayırır.
