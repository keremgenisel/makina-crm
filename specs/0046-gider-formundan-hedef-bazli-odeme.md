# 0046 — Gider Formundan Hedef Bazlı Ödeme, Hesap Seçimi ve Çek Cirosu

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-29, plan onayıyla; plan `specs/0046-uygulama-plani.md` Q1–Q12). Uygulanıyor, dal `feat/0046-form-odeme`. |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider kalemi formu, ödeme hareketi üretimi, ödeme kayıt penceresi, çek portföyü |
| **Bağımlı spec'ler** | 0021 (ödeme hedefleri, tamam) · 0024 (ödeme hareketi ve kasa, tamam) · 0040 (çek ve ciro, tamam) · 0041 (çok yöntemli ödeme, tamam) · 0042 (personelin iki hedefi, tamam) |
| **Revizyon** | R1 (QA turu, 2026-09-29): 16 bulgu işlendi, 5'i bloklayıcıydı. En önemlisi, cironun yalnız ANA hedefinde olabileceği (R11) ve "tek işlem"in bu mimarideki karşılığı (R17). R2 (2026-09-29, plan onayı): doğrulama formda geçici kimlikle, kayıt Giderler'de gerçek kimlikle aynı saf fonksiyondan (R17/Q1); satır hedefe bağlı (R2/Q2); `tamOdemeHareketleri` kalkar (C2/Q3); tek ödeme tarihi (R2/Q4); ciro tutarı salt okunur, çek listesi portföy + TL (R9, R12/Q5); alacaklı kalemden (R23/Q6); düzenlemede pencere formun üstünde (R15/Q7); çek verisi yalnız kasa yetkisiyle gelir (R24/Q8); sunucu testleri (R17/Q9); "Hepsini ödendi" ciro seçmez (R21/Q10); değişen testler (Q11); görsel kanıt (Q12). |

---

## Intent

Gider girilirken parayı nereden ödediğimiz zaten bellidir. Kullanıcı personel kalemini kaydederken
resmi kısmı bankadan havale ettiğini, elden kısmı kasadan nakit verdiğini biliyor; kira kaydederken
kirayı havaleyle, stopajı kredi kartıyla ödediğini biliyor. Uygulama bunların hiçbirini kayıt anında
sormuyor.

Bugünkü tek seçenek şu: formda "Kaydederken ödendi olarak kaydet" kutusu var, ama **tek bir hesap ve
tek bir yöntem** alıyor ve kalemin bütün hedeflerine aynısını uyguluyor. Üstelik kalemde iki ya da daha
çok taksit varsa kutu hiç görünmüyor. Sonuç: kullanıcı kalemi kaydediyor, listeye dönüyor, kalemi
buluyor, ödeme penceresini açıyor, bir hedefi ödüyor, pencereyi kapatıyor, aynı kalem için ikinci kez
açıyor ve öbür hedefi ödüyor. Tek bir personel maaşı için kayıttan sonra iki tur daha.

Çekte durum daha uzak: fabrika müşteriden gelen çeki tedarikçiye ciro ederek ödüyor, ama bunu ancak
Kasa › Çek Portföyü'ne gidip çeki bulup oradan yapabiliyor. Gideri girerken "bunu şu çekle ödedim"
diyemiyor.

Başarı şu demek: gider formunda her ödeme hedefinin kendi satırı var; kullanıcı hangi hedefi hangi
yöntemle, hangi hesaptan ödediğini kaydederken söylüyor; çekle ödeyecekse portföydeki çeki oradan
seçiyor; ve kaydet dediğinde kalem, ödemeleri ve çekin durumu tek seferde yazılıyor.

---

## Requirements

### A. Hedef bazlı ödeme satırları

- **R1.** Yeni gider kaydedilirken ödeme **hedef başına** girilir. Hedefler kalemin bugünkü ödeme
  hedefleridir: normal kalemde tek hedef (tedarikçiye), **personelde resmi ve elden**, **kirada kiraya
  verene ve vergi dairesine (stopaj)**.
- **R2.** Her hedef satırı şunları taşır: ödenecek mi işareti, **tutar** (varsayılan o hedefin ödenecek
  tutarı), **ödeme yöntemi**, **hesap**.
  **Uygulama (R2, Q2, Q4):** satır **hedefe** bağlıdır; taksit kimliği kayıttaki kalemden hedefe göre çözülür (formdan
  ödenen hedefin tek satırı vardır). Bütün satırlar için tek "Ödeme tarihi" vardır; ciro tarihi de odur.
- **R3.** Yöntem, kalemin "ödeme yöntemi" varsayılanıyla ön dolu gelir; her hedef **farklı yöntem**
  taşıyabilir. **İki liste birbirinden ayrıdır:** kalemin varsayılan yöntem listesi (`ODEME_SECENEKLERI`,
  beş seçenek) değişmez ve **asla "Çek (ciro)" içermez** (0040 R19, 0041 R11, 0042 R11: elle seçilemez);
  **satırın** yöntem listesi ise yalnız ANA hedefinde bir seçenek fazladır ("Çek (ciro)", koşulları R9,
  R11 ve R24'te). Ciro seçilen satırda hesap alanı gizlenir, çünkü ciro hesapsız bir harekettir.
- **R4.** Hesap **açık ve TL** hesaplardan seçilir (`secilebilirHesaplar(hesaplar, "TRY")`), çünkü gider
  kalemleri TL'dir ve `kasa.odemeDogrula` "Gider ödemesi yalnız TL hesaptan yapılır." kuralını uygular. En
  son kullanılan hesap (`sonKullanilanHesap`) bütün satırlarda ön seçili gelir, satırlar birbirinden
  bağımsızdır; alan boş bırakılabilir. Boş hesapla kaydedilen ödeme hiçbir bakiyeye girmez ve "hesabı
  belirtilmemiş" sayılır.
- **R5.** Tutarı sıfır olan hedefin satırı çizilmez (stopajsız kira, elden kısmı olmayan personel).
- **R6.** Bir hedefte **iki ya da daha çok taksit** varsa o hedef formdan ödenmez: satırı pasif kalır,
  nedeni yazılır ve ödeme penceresine yönlendirir. Diğer hedefler etkilenmez; kirada ana taksitliyken
  tek ödemelik stopaj formdan ödenebilir. **Çizilebilir hiçbir satır kalmazsa** (bütün hedefler taksitli)
  ödeme bölümü yerine tek satır açıklama görünür ve ödeme penceresine yönlendirir; boş bir bölüm
  gösterilmez.
- **R7.** Hedefin tamamından **az** tutar girilebilir; kalan borç olarak durur ve ödeme penceresinden
  tamamlanır.
- **R8.** Hiçbir hedef işaretlenmezse kalem bugünkü gibi ödenmemiş kaydedilir; ödeme girişi isteğe
  bağlıdır.

### B. Çek cirosu

- **R9.** Ödeme yöntemi **"Çek (ciro)"** seçildiğinde portföydeki çeklerden biri seçilir ve o hedef bu
  çekle kapanır.
- **R10.** Ciro, 0040'ın kurallarına uyar: çek **bütün olarak** çıkar, hesap seçilmez, **hiçbir hesabın
  bakiyesini değiştirmez**, çekin durumu "ciro edildi" olur ve geçmişine kime ciro edildiği yazılır.
- **R11.** **Çekle yalnız ANA hedefi kapatılabilir:** normal kalemde tedarikçi, kirada kiraya veren,
  personelde resmi kısım. **Stopaj ve elden satırlarında "Çek (ciro)" seçeneği hiç görünmez** ve nedeni
  yazılır. Bu, hem uygulanmış motor kuralıdır (`cek.js:130` `ciroAdaylari` ANA dışındaki hedefleri aday
  saymaz) hem de gerçeğe uygundur (vergi dairesi ciro edilmiş çek kabul etmez). Böylece "bir çek tek
  alacaklıya gider" kuralı kendiliğinden sağlanır: bir kalemde ciro edilebilecek tek hedef vardır.
- **R12.** Çekin tutarı seçilen hedefin tutarından büyükse fark uyarı olarak gösterilir ve **hiçbir
  borcu kapatmaz**. Uyarı metni motordan gelir: `ciroPlani`'nın döndürdüğü `uyari` alanı **olduğu gibi**
  gösterilir, ikinci bir cümle yazılmaz (0040 ile ayrışmasın).
  **Uygulama (R2, Q5):** ciro satırında tutar salt okunurdur: çek tutarı ile hedef kalanının küçüğü. Çek küçükse
  hedef kısmen kapanır. Listede yalnız portföydeki TL çekler vardır (vade sırasıyla, `portfoySatirlari`).
- **R13.** Portföyde uygun çek yoksa kullanıcı bunu satırın yanında okur ve yöntemi değiştirir.
- **R14.** Ciro edilen çek kaydedildikten sonra portföyden düşer ve o hedefte ödeme olarak görünür.

### C. Mevcut kalemi düzenlerken

- **R15.** Düzenleme formunda ödeme **girilmez**: her hedef satırı durumunu (ödendi / kısmen / kalan
  tutar) gösterir ve yanındaki düğme o hedef için **ödeme penceresini ön dolu açar**. Pencere
  `OdemeKayitPenceresi`'nin **mevcut** `hedef` parametresiyle açılır (tutar = o hedefin kalanı, hesap =
  `sonKullanilanHesap`); yeni pencere ya da yeni parametre yazılmaz. Düğme `gider_odeme` ister; izni
  olmayan kullanıcıda çizilmez ama durum yine okunur. Form **zenginleştirilmiş** kalemi alır (kalan
  tutarlar `odemeleriUygula`'nın yazdığı `_odenen` ve `_odenenK` alanlarından okunur; `Giderler` bunu
  `giderlerOdemeli` olarak zaten üretiyor). Ham kalemle çizilirse kalan yanlış görünür.
  **Uygulama (R2, Q7):** "Ödeme gir" düğmesi pencereyi formun **üstünde** açar; form açık kalır, girilen düzenleme
  kaybolmaz ve durum satırları canlı (zenginleştirilmiş) kalemden hemen güncellenir.
- **R16.** Kaydedilmiş ödemeler yine yalnız ödeme penceresinden silinir.

### D. Kayıt ve doğrulama

- **R17.** Kaydetme **tek yazımdır**: gider kalemi, ödeme hareketleri ve varsa çekin durum değişikliği
  **aynı durum güncellemesinde** yazılır, böylece gecikmeli kayıt üçünü **tek POST'ta** gönderir ve
  0040'ın "ciro edildi durumuna geçiş aynı yazımda o çeke bağlı bir ödeme hareketi ister" şartı sağlanır
  (eksikse sunucu 403 verir). Doğrulama **kayıttan önce** çalışır: ödeme satırındaki bir hata kalemi hiç
  oluşturmaz. Sunucu yazımı reddederse bugünkü hata yolu geçerlidir; **yeni bir geri alma mekanizması bu
  işin kapsamında değildir** (X9).
  **Uygulama (R2, Q1, Q9):** form `formOdemesiHazirla`'yı geçici kalem kimliğiyle çağırır, hataları satırlara yazar;
  hata yoksa `onSave` çağrılır. `Giderler` gerçek kimliği atar, aynı saf fonksiyonu yeniden çağırır ve kalem, hareket ve
  çeki aynı işleyicide yazar. Sunucu değişmez; tek yazımın kabulü `server-authz` ve gerçek sunucu testiyle sabitlenir.
- **R18.** Doğrulama ödeme penceresiyle **aynı kurallardan** geçer: kalandan fazla ödeme yok, kapalı
  hesaba hareket yok, hesabın para birimi uyumlu, ciro yalnız "Çek (ciro)" yöntemiyle. Hata, ilgili
  satırın yanında gösterilir ve hiçbir kayıt yapılmaz.
- **R19.** Ödeme girişi **`gider_odeme`** izni ister. İzni olmayan kullanıcıda satırlar hiç çizilmez;
  kalem yine kaydedilebilir.
- **R20.** Kasa görünmüyorsa (yetki ya da yayın perdesi) hesap seçici çizilmez; ödeme yine kaydedilir ve
  hesapsız olur.

### E. QA turunda eklenenler

- **R21.** Satırların üstünde bir **"Hepsini ödendi işaretle"** kutusu olur: işaretlenince çizilebilen
  bütün satırlar varsayılan yöntem, varsayılan hesap ve tam tutarla dolar, sonra kullanıcı istediği satırı
  değiştirir. Bu, bugünkü tek kutunun ("Kaydederken ödendi olarak kaydet") birebir karşılığıdır ve en sık
  durumu (her şey aynı hesaptan) yavaşlatmamak içindir.
  **Uygulama (R2, Q10):** kutu kalemin varsayılan yöntemiyle doldurur; varsayılan liste ciro içermediği için kutu
  asla ciro seçmez. Kutu kaldırılınca satırlar temizlenir.
- **R22.** **Satır sınırları:** işaretli bir satırda tutar boş, sıfır ya da negatifse hata **o satırda**
  gösterilir ve hiçbir kayıt yapılmaz (`kasa.odemeDogrula`'nın "Tutar sıfırdan büyük olmalı" kuralı).
  İşaretlenmemiş satır doğrulanmaz ve hareket üretmez.
- **R23.** **Ciroda alacaklı adı kalemden türetilir:** tedarikçili kalemde tedarikçi adı, personelde
  çalışan adı, kirada kiraya veren (kalemin tedarikçisi). Tedarikçisi seçilmemiş kalemde kullanıcı serbest
  ad yazar; boş bırakılırsa ciro kaydedilemez ve nedeni o satırda görünür. Motor bu adı zorunlu tutuyor
  (`ciroPlani`: "Kime ciro edildi girilmedi") ve çekin geçmişine yazıyor (0040 R9).
  **Uygulama (R2, Q6):** `ciroAdaylari`'na giden alacaklı: tedarikçili kalemde tedarikçi, personelde çalışan,
  tedarikçisiz kalemde serbest (ad kutusu satırda).
- **R24.** **"Çek (ciro)" seçeneği ve çek listesi yalnız `kasaYetki` olan kullanıcıya çizilir** (Çek
  Portföyü ekranıyla aynı kitle, 0040 R13: gider ve finans birlikte). Yetkisi olmayan kullanıcıda seçenek
  hiç görünmez; böylece müşteri çeklerinin numarası, bankası ve tutarı gider formundan sızmaz.
  **Uygulama (R2, Q8):** App `cekler`, `setCekler` ve çekli `payments`'ı `Giderler`'e yalnız `kasaYetki` varken
  geçirir; yetkisiz kullanıcıya müşteri çekleri hiç ulaşmaz.
- **R25.** **Ciro motoru formdan şöyle çağrılır:** form, kaydedilecek kalemi (üretilmiş taksit id'leriyle
  ve geçici kalem id'siyle) `ciroAdaylari`'nın beklediği biçimde verir, tek aday ve tek dağıtım satırıyla
  `ciroPlani`'nı çağırır, dönen `hareketler` ile `cek`'i kaydın parçası yapar. Motor imzası değişmez ve
  formda ikinci bir ciro üretimi yazılmaz (C2).
- **R26.** Ödeme satırları motordaki `HEDEF_SIRASI` (`[ANA, ELDEN, STOPAJ]`) sırasıyla çizilir; ekran ile
  motor aynı sırayı kullanır (borç özeti ve ekstre de bu sırada).

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır; satırların toplamı hedefin ödenecek tutarını aşamaz.
- **C2.** **Tek gerçek kaynak:** ödeme hareketlerini üreten ve doğrulayan kod saf motorda tek yerdedir;
  form ile ödeme penceresi aynı fonksiyonları çağırır. Bugünkü `tamOdemeHareketleri` bu tek yerin içinde
  erir, ikinci bir üretim yolu yazılmaz. **İki davranışı aynen korunur** (0024 R17): satırlı kalemde her
  satıra kendi tutarıyla bir hareket, satırsız kalemde ödenecek tutarın tamamı. Bugün tek çağrı yeri var
  (`Giderler.jsx:125`); kaldırılırken o yer güncellenir ve regresyon testi 0024 R17 senaryosunu korur.
  **Uygulama (R2, Q3):** `tamOdemeHareketleri` kaldırılır; "Hepsini ödendi" ile işaretli satırlar tam tutarla aynı
  yoldan geçer. Eski fonksiyonun beklenen çıktıları AC-40 testinde sabit veri olarak karşılaştırılır.
- **C3.** **Yeni kalıcı alan yok.** Ödeme zaten bir hareket kaydı, çek zaten bir kayıt; bu iş yalnız
  onların **nereden girildiğini** değiştirir. Veri modeli, göç ve yedek biçimi aynı kalır.
- **C4.** **Çift sayım yasağı:** ciro hesaptan para çıkarmaz ve ödeme hareketi ile çek durumu aynı borcu
  iki kez kapatmaz.
- **C5.** Gider tutarı, KDV'si, stopajı, dönem raporu ve makina maliyeti bu işten **etkilenmez**; ödeme
  tarafı ile gider tarafı ayrı kalır (0021 R5 çizgisi).
- **C6.** Yeni izin boyutu ya da yeni eylem kimliği tanımlanmaz.
- **C7.** Gider modülünün yayın perdesi (0008) inikken bu ekranlar zaten kapalıdır.
- **C8.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Düzenleme formuna tam ödeme editörü koymak — *neden:* R15; 0024 ödemenin tek yerden
  yazılmasına karar verdi. Kalemin ödemesi zamanla değişen bir kayıt; iki editör er geç ayrışır.
  Form ön dolu pencereyi açarak aynı kolaylığı verir.
- **X2.** Bir hedef için formda birden çok ödeme satırı (yarısı nakit, yarısı kart) — *neden:* 0041 bunu
  ödeme penceresinde zaten yapıyor; form kayıt anının kısayoludur, ödeme defteri değildir.
- **X3.** Taksitli hedefin formdan ödenmesi — *neden:* R6; hangi taksitin ödendiği ayrı bir seçim ve
  ödeme penceresinin işi.
- **X4.** Tekrarlayan gider tanımının ürettiği kalemlerin otomatik ödenmiş doğması — *neden:* üretim
  toplu çalışıyor, ödeme kararı kalem kalem verilir.
- **X5.** Avanstan mahsubun formdan yapılması — *neden:* mahsup çalışanın avans borcuna bakar (0024 B);
  ödeme penceresindeki kipinde kalır.
- **X6.** Formdan yeni çek kaydı açmak — *neden:* çek tahsilat tarafında doğar (0040 R2); buradan yalnız
  portföyde duran çek seçilir.
- **X7.** Çekin bir kısmıyla ödeme, çekin bölünmesi — *neden:* 0040 C4; kâğıt bölünmez.
- **X8.** Ödeme yöntemi listesinin değişmesi — *neden:* liste 0041 ve 0042'de karara bağlandı.
- **X9.** Sunucu yazımı reddettiğinde yerel değişikliklerin geri alınması — *neden:* kayıt yolu bütün
  bloğu gecikmeli gönderen tek bir POST'tur; 403'te yerel durum çoktan değişmiştir ve bugün yalnız bir
  hata uyarısı verilir (`App.jsx:1096`). Geri alma mekanizması kurmak bütün uygulamayı kapsayan ayrı bir
  iştir; bu iş doğrulamayı kayıttan önce yaparak hatayı sunucuya hiç göndermemeyi hedefler (R17).
- **X10.** Stopaj ve elden hedeflerinin çekle ödenmesi — *neden:* R11; motor ANA dışındaki hedefleri ciro
  adayı saymıyor ve vergi dairesi ciro kabul etmiyor. İhtiyaç doğarsa 0040'ın kuralını değiştiren ayrı bir
  iştir.

---

## Context

- **Bugün formda ne var (doğrulandı).** `GiderForm` yeni kalemde "Kaydederken ödendi olarak kaydet"
  kutusu, bir **ödeme tarihi** ve bir **hesap** gösteriyor; yöntem kalemin varsayılanından geliyor.
  Kayıtta `Giderler.jsx` bunu `kasa.tamOdemeHareketleri(kalem, turMap, {tarih, hesapId, yontem})`'e
  veriyor; o da kalemin bütün ödeme satırlarına **aynı hesabı ve aynı yöntemi** yazıyor. Yani
  "resmi bankadan, elden kasadan" bugün ifade edilemiyor.
- **Blok taksitte tamamen kayboluyor.** Formdaki `tekOdemeDegil` koşulu, ana ya da stopaj taksit sayısı
  ikiden büyükse ödeme kutusunu **hiç çizmiyor**. Kirada ana taksitliyse tek ödemelik stopaj da
  kayıt anında ödenemiyor. R6 bunu hedef bazına indiriyor.
- **Hedefler zaten var.** 0021 kirada ana ile stopajı, 0042 personelde resmi ile eldeni ayrı ödeme hedefi
  yaptı: `gider.js` içinde `HEDEF = { ANA, ELDEN, STOPAJ }`. Borç özeti, hatırlatıcı, ekstre ve ödeme
  penceresi bu hedefleri okuyor. Bu iş yeni bir kavram getirmiyor, var olan hedefleri **kayıt anında**
  görünür kılıyor.
- **Ödeme penceresi hedefi zaten alıyor.** `OdemeKayitPenceresi` bir `hedef` parametresiyle açılıyor ve
  0041'den beri çok satırlı (her satırın kendi yöntemi ve hesabı var). R15'in "ön dolu aç" isteği bu
  mevcut parametreyi kullanır, yeni bir pencere yazılmaz.
- **Çek bugün nereden ciro ediliyor.** Yalnız Kasa › Çek Portföyü'nden: çek seçilir, `CiroPenceresi`
  açılır, alacaklı seçilir ve tutar o alacaklının açık kalemlerine dağıtılır. Gider tarafından çeke
  ulaşmanın yolu yok. Bu iş ters yönü açıyor: kalemden çeke.
- **Ciroda alacaklı ayrımı (kritik, QA turunda düzeltildi).** Kira kaleminin iki ayrı alacaklısı var
  (kiraya veren ve vergi dairesi) ve 0040 bir çekin bütün olarak tek alacaklıya gittiğini söylüyor. Spec'in
  ilk taslağı buradan "aynı çek iki hedefi kapatamaz" kuralını çıkarıyordu, yani stopaja ciro
  yapılabileceğini varsayıyordu. **Motor buna zaten izin vermiyor:** `cek.js:130` `ciroAdaylari` içinde
  `if ((t.hedef || HEDEF.ANA) !== HEDEF.ANA) continue;` satırı stopaj ve elden hedeflerini aday listesinden
  çıkarıyor. Gerçekte de vergi dairesi ciro edilmiş çek kabul etmez. R11 bu yüzden tersine yazıldı: çekle
  yalnız ANA hedefi kapatılır.
- **Ciro motorunun beklediği girdi (doğrulandı).** `ciroAdaylari(kalemler, alacakli, turMap)` **mevcut**
  kalemlerden `anahtar` değeri `giderId:taksitId` olan adaylar üretiyor; `ciroPlani({cek, odeme, adaylar,
  dagitim, tarih, alacakliAd, turMap})` bu anahtarlara bakıyor, çekin portföyde ve **TL** olmasını şart
  koşuyor, `alacakliAd` boşsa hata veriyor, her hareketi `odemeDogrula(..., {ciro: true})`'dan geçiriyor ve
  `{hareketler, cek, farkK, uyari}` döndürüyor. Formda kalem ve taksit kimlikleri kayıt anında üretildiği
  için R25 çağrı biçimini yazıyor.
- **Yöntem listesi ciro içermiyor (doğrulandı).** `ODEME_SECENEKLERI` beş seçenek (Belirtilmemiş, Nakit,
  Havale, Çek, Kredi Kartı) ve "Çek (ciro)" listede **yok**; ödeme penceresi bunu bir ipucu satırıyla
  söylüyor. R3 bu yüzden kalem varsayılanı ile satır listesini ayırıyor.
- **"Tek işlem" bu mimaride ne demek (doğrulandı).** Kayıt tek bir uç noktaya yapılan atomik bir çağrı
  değil, 500 ms gecikmeli bütün-blob kaydıdır. Sunucu 403 verdiğinde yerel durum çoktan değişmiştir ve geri
  alma yoktur, yalnız `App.jsx:1096`'daki "Değişiklikler kaydedilemedi! Uygulamayı kapatıp yeniden açın."
  uyarısı vardır. R17 bu yüzden "aynı durum güncellemesi, tek POST" ve "doğrulama kayıttan önce" olarak
  yazıldı; geri alma X9 ile kapsam dışıdır.
- **Sunucu tarafı hazır ama şartlı.** 0040, "ciro edildi" durumuna geçişin **aynı yazımda o çeke bağlı
  bir ödeme hareketi** içermesini şart koşuyor; eksikse 403. Formun kaydı bu yüzden tek işlem olmalı
  (R17). Ayrıca ciroya giriş `gider_odeme` istiyor, ki formdaki ödeme girişi zaten bu izne bağlı.
- **Kaç tur kazandırıyor.** Bugün resmi ve elden kısmı farklı hesaptan ödenen bir personel kalemi için:
  kaydet, listede bul, ödeme penceresini aç, resmi hedefi öde, kapat, yeniden aç, elden hedefi öde. Bu
  işten sonra: formda iki satırı doldur, kaydet.
- **Veri modeli değişmiyor.** Ödeme hareketi (0024) ve çek kaydı (0040) zaten var; bu iş yalnız giriş
  yüzeyini değiştiriyor. Dört nokta kuralı, göç ve yedek biçimi gündeme gelmiyor (C3). İşin riski veri
  değil, **doğrulama ve yazım bütünlüğü** tarafında.

---

## Acceptance Criteria

### Hedef bazlı ödeme

- **AC-1.** Yeni personel kaleminde resmi ve elden için iki ayrı ödeme satırı görünür.
- **AC-2.** Resmi satırı bir hesaptan, elden satırı başka bir hesaptan ödenebilir; iki ayrı ödeme
  hareketi doğar ve iki hesabın bakiyesi ayrı ayrı azalır.
- **AC-3.** İki satır farklı ödeme yöntemi taşıyabilir (biri havale, biri nakit).
- **AC-4.** Yeni kira kaleminde kiraya veren ve vergi dairesi (stopaj) için iki ayrı satır görünür.
- **AC-5.** Stopaj satırı ayrı hesaptan ödenebilir ve kalemin stopaj hedefi kapanır.
- **AC-6.** Stopajı sıfır olan kirada stopaj satırı çizilmez.
- **AC-7.** Elden kısmı olmayan personelde elden satırı çizilmez.
- **AC-8.** Normal (kira ve personel dışı) kalemde tek satır görünür ve hesabı seçilebilir.
- **AC-9.** Hiçbir satır işaretlenmeden kaydedilen kalem "ödenmedi" olur.
- **AC-10.** Bir hedefe tam tutarından az girilirse kalem "kısmen" olur ve kalan doğru görünür.
- **AC-11.** Ana hedefi taksitli, stopajı tek ödemelik kirada stopaj formdan ödenebilir, ana hedef satırı
  pasiftir ve nedenini yazar.
- **AC-12.** Hedefin kalanından fazla tutar girildiğinde kayıt yapılmaz ve hata o satırda gösterilir.
- **AC-13.** En son kullanılan hesap satırlarda ön seçili gelir.
- **AC-14.** Hesap boş bırakılarak ödeme kaydedilebilir; bu ödeme hiçbir bakiyeye girmez ve "hesabı
  belirtilmemiş" sayılır.

### Çek cirosu

- **AC-15.** Ödeme yöntemi "Çek (ciro)" seçilince portföydeki çekler listelenir ve biri seçilebilir.
- **AC-16.** Çekle ödenen hedef kapanır ve kalemde bu ödeme çek bilgisiyle görünür.
- **AC-17.** Ciro hiçbir hesabın bakiyesini değiştirmez.
- **AC-18.** Ciro edilen çekin durumu "ciro edildi" olur, geçmişine kime ciro edildiği yazılır ve çek
  portföyden düşer.
- **AC-19.** Kirada stopaj satırında ve personelde elden satırında "Çek (ciro)" seçeneği hiç görünmez;
  nedeni yazılır. Bir kalemde ciro edilebilecek tek hedef ANA hedefidir.
- **AC-20.** Çek tutarı hedeften büyükse fark uyarı olarak gösterilir ve borç kapatmaz.
- **AC-21.** Portföyde çek yokken yöntem "Çek (ciro)" seçildiğinde kullanıcı nedenini okur ve kayıt
  engellenmez (yöntem değiştirilerek devam edilir).
- **AC-22.** Ciro içeren kayıt tek işlemde yazılır; sunucu çek durumu ile ödeme hareketini birlikte kabul
  eder (403 almaz).

### Düzenleme, izin ve koruma

- **AC-23.** Mevcut kalemin düzenleme formunda ödeme girişi çizilmez; her hedef durumunu gösterir.
- **AC-24.** Hedefin yanındaki düğme ödeme penceresini o hedef seçili ve kalan tutar dolu açar.
- **AC-25.** `gider_odeme` izni olmayan kullanıcıda ödeme satırları hiç çizilmez; kalem yine kaydedilir.
- **AC-26.** Kasa görünmeyen kullanıcıda hesap seçici çizilmez, ödeme hesapsız kaydedilir.
- **AC-27.** Ödeme satırındaki bir hata yüzünden kayıt durduğunda gider kalemi de kaydedilmemiştir.
- **AC-28.** Gider tutarı, KDV'si, dönem raporu ve makina maliyeti bu işten önce ve sonra aynıdır.
- **AC-29.** Ödeme penceresinden girilen ödemeler ile formdan girilenler aynı hareket kaydını üretir:
  ikisi de **aynı saf fonksiyonu** çağırır (kaynak taraması) ve aynı girdiyle iki yoldan üretilen
  hareketler alan alan eşittir (birim testi).

### QA turunda eklenen kriterler

- **AC-30.** "Hepsini ödendi işaretle" kutusu çizilebilen bütün satırları varsayılan yöntem, varsayılan
  hesap ve tam tutarla doldurur; sonra tek satır değiştirilebilir (R21).
- **AC-31.** İşaretli bir satırda tutar boş, sıfır ya da negatifse hata o satırda gösterilir ve hiçbir
  kayıt yapılmaz (R22).
- **AC-32.** Bütün hedefleri taksitli olan kalemde ödeme bölümü yerine tek satır açıklama görünür (R6).
- **AC-33.** Ciroda alacaklı adı kalemden türetilir; tedarikçisi seçilmemiş kalemde ad boş bırakılırsa
  ciro kaydedilemez ve nedeni o satırda görünür (R23).
- **AC-34.** `kasaYetki` olmayan kullanıcıda "Çek (ciro)" seçeneği ve çek listesi hiç çizilmez (R24).
- **AC-35.** Hesap seçenekleri açık ve TL hesaplardan gelir; TL dışı hesap listede yer almaz (R4).
- **AC-36.** Düzenleme formu zenginleştirilmiş kalemle çizilir: kısmen ödenmiş hedef "kısmen · kalan X"
  yazar (R15).
- **AC-37.** Hedefin yanındaki düğme `gider_odeme` izni yokken çizilmez ama hedefin durumu yine okunur
  (R15).
- **AC-38.** Ödeme satırları `HEDEF_SIRASI` sırasıyla (ana, elden, stopaj) çizilir (R26).
- **AC-39.** Fark uyarısının metni `ciroPlani`'nın döndürdüğü metnin aynısıdır (R12).
- **AC-40.** Yeni üretim yolu 0024 R17 davranışını korur: satırlı kalemde her satıra kendi tutarıyla bir
  hareket, satırsız kalemde ödenecek tutarın tamamı (C2).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hareket üretimi ve doğrulaması saf motorda **tek yerde**; form ile ödeme penceresi aynı
      fonksiyonları çağırıyor (C2, kaynak taraması testi).
- [ ] Ciro kuralları 0040'tan çağrılıyor, yeniden yazılmıyor (R10, R11, R25); `ciroAdaylari` ve
      `ciroPlani` imzaları değişmedi ve formda ikinci bir ciro üretimi yok (kaynak taraması).
- [ ] Cironun yalnız ANA hedefinde olduğu testle sabitlendi (AC-19); stopaj ve elden satırlarında seçenek
      hiç çizilmiyor.
- [ ] `tamOdemeHareketleri` kaldırıldıysa tek çağrı yeri (`Giderler.jsx`) güncellendi ve 0024 R17
      regresyon testi yeşil (AC-40).
- [ ] Tek işlem bütünlüğü testle gösterildi: ödeme hatasında kalem de kaydedilmiyor (AC-27), ciro
      sunucudan tek yazımda geçiyor (AC-22).
- [ ] Çift sayım yasağı testle sabitlendi: ciro bakiyeye dokunmuyor (AC-17).
- [ ] Gider tarafının değişmediği çapraz testle gösterildi (AC-28).
- [ ] Görsel kanıt eklendi (`docs/evidence/0046-*.jpg`): personel iki satırlı ödeme, kira stopaj satırı,
      çek seçimi, taksitli hedefin pasif satırı; aydınlık ve karanlık tema. Kanıt eşlemesi güncellendi.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: ödemenin kayıt anında hedef bazlı girilebildiği, ciroya ikinci giriş
      noktası açıldığı ve düzenleme formunun hâlâ ödeme yazmadığı yazıldı.
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
