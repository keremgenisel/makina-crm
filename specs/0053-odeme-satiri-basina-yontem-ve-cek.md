# 0053 — Ödeme Yöntemi Satırın Alanı Olsun, Çek Her Ödeme Yolundan Kullanılsın

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-09-30) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider formunun ödeme bölümü, ödeme kayıt penceresi, tekrarlayan gider tanımı |
| **Bağımlı spec'ler** | 0023 (ek ödemeler) · 0040, 0049 (çek ve ciro) · 0041 (çok yöntemli ödeme) · 0042 (personelin iki hedefi) · 0046 (formdan hedef bazlı ödeme) · 0048 (düzenleme formunun canlı ödeme kutusu) · 0052 (Kasa sekme izni) |
| **Revizyon** | R1 (2026-09-30): Takım Yöneticisi kararı, **her şey formda yapılacak**. Ödeme girişi düzenleme kipinde de açılır (0046 R15 geri alınır), ciro ve kendi çekimiz formda kullanılır, ödeme penceresi ile form **tek paylaşılan bileşen** olur. D bölümü (R15–R19) eklendi, eski X2 kaldırıldı, AC-23…AC-30 eklendi. R2 (2026-09-30): **hedef ile yöntem birbirinden bağımsızdır** kuralı eklendi (R20, C7); "elden" sözcüğünün iki anlamı Context'e yazıldı; çok satırlı ödemenin her gider türü için geçerli olduğu örneklendi (AC-31…AC-34). **R3 (QA turu, 2026-10-01):** geliştirici hazırlığı denetimi, 16 bulgu işlendi, 5'i bloklayıcıydı. Context'in "ödeme penceresinde çek yolu hiç yok" tespiti **yanlıştı** (0049 ile "Kendi çekiyle öde" düğmesi var, eksik olan yalnız ciro) ve iki tasarım tek yola indirildi (R10); birleşik bileşenin şekli ile mahsubun yeri yazıldı (R17); "Çek vadesi" etiketi uygulanamaz olduğu için kaldırıldı (R4); "en son kullanılan yöntem" için yardımcı tanımlandı (R23); 0048 ile çelişki çözüldü (R24). E bölümü (R23–R29) ve AC-36…AC-48 eklendi.<br>**R4 (2026-10-01, plan onayı):** tek giriş fonksiyonu `formOdemesi.odemeGirisiHazirla` ve tek bileşen `gider/OdemeGirisi.jsx` (Q8 ortak yazım `odemeGirisiYaz`); satır hedefe ve taksit sırasına bağlanır, taksit kimliği kayıt anında çözülür (yeni kalemde kimlik kayıtta doğar); taksitli hedef yeni kalemde pasif, düzenlemede yapı aynıysa taksit seçiciyle açık (Q1, R30); hedef katmanı `cokluOdemeDogrula`'da (Q2); çek satırı aynı hedefteki diğer satırlardan sonra kalanı kapatır (Q3); formda silme Kaydet'e kadar bekler (Q4); pencere hedefle açılınca o hedefe iner (Q5); mahsup kipi formda da (Q6); Anasayfa penceresine çek verisi (Q9); `DonemRaporu` ve doğrulama mesajındaki yöntem gösterimi de kalkar (Q10, R31); uçtan uca kontrol (Q12). F bölümü (R30–R32) eklendi. |

---

## Intent

Üç şikâyet geldi ve üçü de aynı yere bakıyor: **ödeme yöntemi yanlış yerde duruyor.**

- Yeni gider formunda tepede tek bir **"Varsayılan ödeme yöntemi"** kutusu var. Kullanıcı onu kalemin
  yöntemi sanıyor, oysa 0041'den beri yöntem **ödemenin** alanı; o kutu yalnız aşağıdaki satırlara ön
  değer veriyor. Aynı soruyu iki yerde sormak, birini yanlış cevap sanmaya yol açıyor.
- Personelde prim ve mesai elden kısmına giriyor, ama kullanıcı o parayı maaştan **başka bir yöntemle ve
  başka bir kasadan** ödüyor. Formda hedef başına tek satır olduğu için bunu yazamıyor.
- Gider formundan çek ciro edilebiliyordu, "şimdi kalktı" deniyor. Doğrusu: ciro **yeni kalem** açarken
  ana hedef satırında duruyor, ama **mevcut bir gideri öderken** (düzenleme ya da listeden ödeme
  penceresi) hiç yok. Kullanıcı çoğu zaman mevcut bir gideri ödediği için ciro ona kalkmış görünüyor.

Başarı şu demek: yöntem yalnız ödeme satırında soruluyor; bir hedef birden çok satırla, her satırı kendi
yöntemi, tutarı ve hesabıyla ödenebiliyor; ve çek, ödemenin girildiği **her** yerden kullanılabiliyor.

---

## Requirements

### A. Yöntem satırın alanıdır

- **R1.** Gider formundaki kalem düzeyindeki **"Varsayılan ödeme yöntemi"** alanı kaldırılır. Aynı alan
  tekrarlayan gider tanımı formundan da kaldırılır.
- **R2.** Yeni bir ödeme satırı eklendiğinde yöntemi **en son kullanılan yöntemle** gelir (hesabın
  bugünkü "son kullanılan hesap" davranışının eşi); kullanıcı satırda değiştirir. Kaynak R23'te tanımlı
  saf yardımcıdır; bugün böyle bir yardımcı **yok** (`kasa.js`'te yalnız `sonKullanilanHesap` ve
  `sonTahsilatHesabi` var).
- **R3.** Kalemin kayıtlı yöntem alanı **veride kalır**, göç yapılmaz; hiçbir ekranda gösterilmez ve
  yeni kayıtlarda doldurulmaz.
- **R4.** Bugün bu alandan beslenen tek görünür davranış olan "Çek vade tarihi" etiketi **kaldırılır**;
  alan her zaman **"Son ödeme tarihi"** der (taksitli kalemde "İlk taksitin vadesi", stopajlı kirada
  "Kiraya verene son ödeme" dalları aynen kalır). Satırdan türetilemez: `GiderForm.jsx:177` bu etiketi
  kalemin yönteminden (`cekMi`) kuruyor ve vade alanı **ödeme satırlarından önce** doldurulur, yani satır
  henüz yokken türetilecek bir yöntem de yoktur. Vade kalemin borç vadesidir, ödeme yönteminin değil;
  0041 Q9'daki "tek istisna" böylece kapanır ve R3'ün "hiçbir ekranda gösterilmez" kuralı gerçekten
  sağlanır.

### B. Hedef başına birden çok ödeme satırı

- **R5.** Gider formunun ödeme bölümünde bir hedef **birden çok satırla** ödenebilir; her satırın kendi
  **tutarı, yöntemi ve hesabı** olur.
- **R6.** Sınır **üç katmanlıdır** (0046 R6 ile aynı kural): (1) her satır kendi hedefinin kalanını,
  (2) aynı hedefe giden satırların **toplamı** o hedefin kalanını, (3) bütün satırların toplamı kalemin
  kalanını aşamaz. Hata aşan hedefi adıyla söyler. Bugünkü `cokluOdemeDogrula` iki katmanı (taksit ve
  genel toplam) zaten uyguluyor; eklenen hedef katmanıdır.
- **R7.** Satır sayısı üst sınırı ödeme penceresindekiyle aynıdır ve **hedef başınadır**
  (`COKLU_ODEME_MAX_SATIR` = 10; pencere tek hedefe baktığı için oradaki anlamı da budur). Üç hedefli bir
  kalemde teorik üst sınır 30 satırdır.
- **R8.** Doğrulama ve hareket üretimi ödeme penceresiyle **aynı fonksiyonlardan** geçer; formda ikinci
  bir kural yazılmaz.
- **R9.** Personelde prim, mesai ve ikramiye **ayrı bir ödeme hedefi değildir**; girildiği gibi resmi
  ya da elden bileşenine katılmaya devam eder (0023 kararı korunur). İstenen ayrım, o hedefin birden çok
  satırla ödenebilmesiyle karşılanır.
- **R20.** **Ödeme hedefi ile ödeme yöntemi birbirinden bağımsızdır.** Hedef paranın *kime ve hangi
  bileşene* ait olduğunu söyler, yöntem *nasıl* ödendiğini. Personelin **elden** bileşeni havaleyle
  ödenebilir, **resmi** bileşeni nakit verilebilir; uygulama hiçbirini kısıtlamaz ve yöntemi hedeften
  türetmez.
- **R21.** Çok satırlı ödeme **her gider türü için** geçerlidir, yalnız personele özel değildir: normal
  bir kalemin (örnek: 100.000 TL hammadde) yarısı havaleyle, yarısı nakit ödenebilir.
- **R22.** Ödeme satırının **açıklaması serbesttir**; kullanıcı isterse satıra "prim" ya da "mesai"
  yazarak hangi parçayı ödediğini not eder. Uygulama bu metni yorumlamaz.

### C. Çek her ödeme yolundan

- **R10.** Çek yöntemleri (**"Çek (ciro)"** ve **"Çek (kendi)"**) ödemenin girildiği **her yerde** ve
  **satırın yöntemi olarak** seçilebilir: yeni gider formu, **gider düzenleme formu** ve ödeme kayıt
  penceresi. Kullanıcı ciro yapmak için başka bir ekrana gitmez. **Tek yol kuralı:** 0049 ile ödeme
  penceresine eklenen **"Kendi çekiyle öde" düğmesi kaldırılır** (`OdemeKayitPenceresi.jsx:230`); kendi
  çek de ciro gibi satır yöntemi olur. Aksi hâlde aynı soru iki biçimde sorulur, ki bu spec'in çözmek
  istediği şeyin kendisidir.
- **R11.** Çek kuralları 0040 ve 0049'dan aynen gelir: çek bütün olarak tek alacaklıya gider, ciro
  hiçbir hesabın bakiyesini değiştirmez, kendi çekimizde bakiye banka çeki ödediğinde düşer, karşılıksız
  ya da iptalde borç yeniden açılır.
- **R12.** Bir **yazımda** en çok **bir** çek satırı olur ve yalnız ana hedefte; stopaj ve elden
  hedeflerinde çek seçilemez, nedeni yazılır (0046 kuralı korunur). Ciro ile kendi çek **aynı yazımda
  birlikte** girilemez: iki çek iki ayrı çek işlemidir ve ayrı ayrı kaydedilir.
- **R13.** Portföyde uygun çek yoksa seçenek görünür ama seçilecek çek olmadığı ve nedeni yazılır.
- **R14.** Çek seçenekleri yalnız Kasa görünen kullanıcıda çizilir (bugünkü kural).

### D. Her şey formda (0046 R15 geri alınır)

- **R15.** **Gider düzenleme formunda ödeme girilir.** Kullanıcı ödeme kaydetmek, satır eklemek, çek
  ciro etmek ya da kendi çekini yazmak için formdan çıkmak zorunda kalmaz.
- **R16.** Düzenleme formu kayıtlı ödemeleri de gösterir ve **silinebilir**; bugün yalnız ödeme
  penceresinden yapılan bu işlem forma taşınır. **İki istisna aynen taşınır:** `cekId` taşıyan hareketler
  (ciro ve kendi çek) formdan **silinmez**, nedeni yazılır ve kullanıcı ciro iptaline ya da çek iptaline
  yönlendirilir (bugün pencerede `ciro-hareketi` işaretiyle korunuyor; 0049'da verilen çek hareketleri
  çekin durumundan türüyor).
- **R17.** Form ile ödeme penceresi **tek ve aynı bileşendir**; pencere, o bileşenin listeden ve
  Anasayfa hatırlatıcısından açılan hâlidir. İki ayrı ödeme editörü yazılmaz. **Birleşik bileşenin şekli:**
  hedef listesi + hedef başına satırlar (tutar, yöntem, hesap, açıklama) + kayıtlı ödemeler listesi
  (silme, R16) + çek yöntemleri + **"Avanstan mahsup" kipi**. Pencere aynı bileşenin tek kalem kapsamında
  açılan hâlidir ve hedef listesi orada tek hedefe iner. Bugün iki ayrı bileşen var ve şekilleri farklı:
  `OdemeFormSatirlari` (hedef listesi, hedef başına tek satır, işaret kutusu) ile `OdemeKayitPenceresi`
  (tek hedef, çok satır, taksit seçici, mahsup kipi, kayıtlı ödemeler ve silme). **Mahsup kipi de
  taşınır**, yoksa kullanıcı bir işlem için yine pencereye gider ve R15'in amacı yarım kalır.
- **R18.** Kaydetme yine **tek işlemdir**: kalem, yeni ödemeler, silinen ödemeler ve çek durumu aynı
  yazımda gider; biri reddedilirse hiçbiri kaydedilmez.
- **R19.** Kayıtlı ödemesi olan kalemde tutar düşürülürse 0048'in uyarısı çalışmaya devam eder (ödenen,
  yeni toplamı aşamaz).

### E. QA turunda eklenenler (R3)

- **R23.** **`sonKullanilanYontem(hareketler)`** saf yardımcısı eklenir: en son tarihli `tur: "odeme"`
  hareketin `yontem`i; **ciro ve kendi çek yöntemleri hariç** (elle seçilemezler) ve boş yöntem hariç;
  hiç yoksa boş döner ("Belirtilmemiş"). `kasa.sonKullanilanHesap` deseni, yeni kalıcı alan yok. R2'nin
  kaynağı budur.
- **R24.** **0048'in "Kaydedince ödenebilir" kısıtı formda kalkar.** 0048 R5, "Ödeme gir" düğmesini yalnız
  hedef **kayıtlı** kalemde aynı satır yapısıyla varsa çiziyordu, çünkü pencere kayıtlı kalemi öder. R15
  ile form kalem ile ödemeyi **aynı yazımda** yazdığı için yeni doğan hedefe de (örnek: ek ödemeyle ilk kez
  doğan elden hedefi) ödeme girilebilir. Uygulama biçimi 0046'nın iki aşamalı kaydıdır: geçici kalem
  kimliğiyle doğrula, gerçek kimlikle yeniden çağır. Düzenleme kipinde de gerekir, çünkü yeni taksit
  satırlarının gerçek kimlikleri kayıt anında üretilir. 0048'in ibaresi yalnız **pencereden** açılan yolda
  kalır.
- **R25.** **"Hepsini ödendi işaretle"** (0046 R21) her çizilebilir hedefin **ilk** satırını varsayılan
  yöntem ve hesapla tam tutarla doldurur, ek satırlara dokunmaz; ikinci kez basılırsa yalnız boş ilk
  satırları doldurur.
- **R26.** **Tekrarlayan üretimde** kaldırılan alan **boş** kalır: tanımdan üretilen kaleme yöntem
  kopyalanmaz (R3 ile tutarlı). Tanımdaki eski değer veride korunur ama hiçbir yerde okunmaz.
- **R27.** **Mahsup tek satırlık kiptir** (0041 C8): çok satır yalnız "Ödeme" kipinde açılır, mahsup satır
  listesine karışmaz. Birleşik bileşen kipi taşır (R17).
- **R28.** **Görsel kanıt yükümlülüğü:** form görünümü bilerek değişiyor (alan kalkıyor, satır listesi
  geliyor), bu yüzden `docs/evidence/kanit-eslemesi.json`'da ilgili dosyaların kaydı `beklenen: "degisti"`
  + `onay` (`Takım Yöneticisi · YYYY-AA-GG · spec 0053 R1/R5`) taşır; spec `done`'a taşınırken kayıtlar
  `ayni`ye çevrilir (0009/0011 kuralı, `tests/kanit-eslemesi.test.js`).
- **R29.** **Ölçülebilirlik:** "form ile pencere aynı bileşendir" şu üçüyle sınanır: ikisi de aynı
  bileşeni (aynı `testId`) çizer, ikisi de aynı doğrulama ve hareket üretim fonksiyonunu çağırır (kaynak
  taraması), ve bir birim testi aynı girdiyle iki yoldan üretilen hareket dizilerinin alan alan eşit
  olduğunu gösterir.

### F. Plan onayında eklenenler (R4)

- **R30.** **Taksitli hedef formda.** İki ve daha çok taksitli hedef yeni kalemde pasif kalır (taksit kimlikleri
  kayıtta doğar). Düzenlemede, o hedefin taksit sayısı kayıtlıyla aynıysa satır taksit seçiciyle açılır;
  bu düzenlemede değiştiyse pasif kalır ve "Taksit planı değişti; kaydettikten sonra ödeyin." yazar. R24'ün
  "Kaydedince ödenebilir" kaldırması tek satırlı hedefler içindir.
- **R31.** **Kalemin yöntem alanının kalan iki gösterimi de kalkar.** Dönem Raporu'nun kalem satırındaki
  "çek vade" etiketi her zaman "vade" yazar; doğrulamadaki "Çek vade tarihi … önce olamaz" mesajı her zaman
  "Son ödeme tarihi" der. R3'ün "hiçbir ekranda gösterilmez" kuralı böylece tamamlanır.
- **R32.** **Bilinen sınır:** satırsız eski çok hedefli kalemde (göç görmemiş iki hedefli personel ya da
  stopajlı kira) **pencereden** girilen ödeme hedef seçemez, önce ana hedefe dağılır (0042 Q3, bugünkü
  davranış). Formdan girilen ödeme kalemi kaydederken satırlıya çevirdiği için hedefine bağlanır.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır.
- **C2.** **Tek motor ve tek bileşen:** çok satırlı ödeme doğrulaması ile ciro planı bugünkü
  fonksiyonlardan geçer, **ve** ödeme editörü tek bir bileşendir (R17, şekli orada yazılı). 0046 R15'in
  "iki editör ayrışır" gerekçesi böylece ortadan kalkar: iki yer değil, iki yerde çizilen tek yer vardır.
  Bileşenin tek olduğu R29'daki üç ölçütle sınanır.
- **C3.** Kayıt tek işlemdir: kalem, ödeme hareketleri ve çek durumu aynı yazımda gider; biri reddedilirse
  hiçbiri kaydedilmez (0046 kuralı).
- **C4.** Gider tutarı, KDV'si, dönem raporu ve makina maliyeti bu işten **etkilenmez**.
- **C5.** Yeni kalıcı alan, yeni izin ve **yeni sunucu eşlemesi** yoktur; ödeme yine `gider_odeme`, ciro
  yine 0040'ın kurallarına tabidir. İki mevcut kural bu işte de geçerlidir: formdan **verilen çek** yazmak
  0052'nin `KASA_SEKMELI_KAYITLAR` kuralına girer (Kasa sekmesi + önkoşul; R14 zaten `kasaYetki` ile
  çiziyor) ve **silinen** ödeme hareketleri `gider_odeme` ile denetlenir.
- **C6.** Kullanıcıya görünen metinler Türkçedir.
- **C7.** **Yöntem listesine "Elden" diye bir seçenek eklenmez.** Elden vermek bugünkü **Nakit**
  yöntemidir; "elden" sözcüğü uygulamada personelin bordro dışı bileşeninin adıdır ve ikisi
  karıştırılmamalıdır (Context).

### KAPSAM DIŞI

- **X1.** Ek ödemenin (prim, mesai, ikramiye) kendi ödeme hedefi olması — *neden:* **0054'e devredildi.**
  Takım Yöneticisi 2026-10-01'de bu kararı gözden geçirdi: çok satırlı ödeme "aynı hedefi iki parçada
  ödemeyi" çözüyor, ama "maaşı ödenmiş kaleme ek ödeme eklenince kapanmış hedefin yeniden açılması"
  sorununu çözmüyor. Ek ödeme kendi hedefi olur; sınırları (ayrı vade ve taksit yok, hedef sayısı dörtle
  sınırlı) 0054'te. R9 bu spec'te geçerliliğini yitirir.
- **X2.** Ödeme penceresinin tümüyle kaldırılması — *neden:* R17; pencere aynı bileşenin listeden ve
  Anasayfa hatırlatıcısından açılan hâli olarak kalır, çünkü oralarda form açık değildir.
- **X3.** Kalemin kayıtlı yöntem alanının veritabanından silinmesi — *neden:* R3; göç riski alınmaz,
  alan sessizce kullanımdan düşer.
- **X4.** Bir ödemenin birden çok kalemi birden kapatması — *neden:* 0024'ün "bir ödeme bir kalemi
  kapatır" kuralı duruyor.
- **X5.** Çekin bölünerek birden çok hedefe dağıtılması — *neden:* kâğıt bölünmez (0040 C4).

---

## Context

- **Bugünkü hâl (doğrulandı).** `GiderForm` hâlâ kalem düzeyinde bir **"Varsayılan ödeme yöntemi"**
  açılır listesi çiziyor. Altındaki ödeme bölümü (0046) **hedef başına tek satır** veriyor; her satırın
  kendi yöntemi ve hesabı var ama ikinci satır eklenemiyor. Ödeme penceresi (0041) ise çok satırlı.
  Yani çok yöntemli ödeme mümkün, ama yalnız pencereden; formdan değil.
- **Ciro nerede var, nerede yok (QA turunda düzeltildi).** Form ödeme satırında "Çek (ciro)" ve
  "Çek (kendi)" seçenekleri yalnız **ana hedefte**, yalnız **yeni kalem** açılırken ve yalnız **Kasa
  görünen** kullanıcıda çiziliyor (`h.ciroOlur && ciroYetkisi`). Ödeme penceresinde ise durum spec'in ilk
  taslağında yazıldığı gibi değil: **0049 ile "Kendi çekiyle öde" düğmesi eklendi**
  (`OdemeKayitPenceresi.jsx:230`, `onKendiCek`), yani kendi çek yolu **var** ama bir düğme olarak (ayrı
  pencere açar). Eksik olan yalnız **ciro**. R10 bu yüzden iki tasarımı tek yola indiriyor: çek her yerde
  **satır yöntemi** olarak seçilir, düğme kaldırılır.
- **Vade etiketi satırdan türetilemez (QA turunda ölçüldü).** `GiderForm.jsx:177`
  `vadeEtiket = taksitli ? "İlk taksitin vadesi" : (kira+stopaj) ? "Kiraya verene son ödeme" : cekMi ? "Çek vade tarihi" : "Son ödeme tarihi"`
  ve `cekMi` kalemin yönteminden geliyor. Vade alanı ödeme satırlarından önce doldurulduğu için satırdan
  türetme mümkün değil; R4 etiketi sabitliyor.
- **"En son kullanılan yöntem" yardımcısı yok.** `kasa.js`'te yalnız `sonKullanilanHesap` (gider ödemesi)
  ve `sonTahsilatHesabi` var; R23 yeni saf yardımcıyı tanımlıyor.
- **İki bileşenin şekli farklı.** `OdemeFormSatirlari`: hedef listesi, hedef başına tek satır, işaret
  kutusu. `OdemeKayitPenceresi`: tek hedef, çok satır, taksit seçici, "Avanstan mahsup" kipi, kayıtlı
  ödemeler listesi ve silme, "Kendi çekiyle öde". R17 birleşmenin şeklini bu envanterden yazıyor.
- **Neden ek ödeme ayrı hedef olmamalı.** 0023 C8: ek ödeme maaşla aynı ödemedir, ayrı vadesi ve ödendi
  durumu yoktur; 0042 ise personeli resmi ve elden diye ikiye böldü. Ek ödemeyi üçüncü, dördüncü hedef
  yapmak borç özetini, ödeme hatırlatıcısını, çalışan ekstresini ve taksit planını yeniden açar.
  Kullanıcının söylediği ihtiyaç ("her ödemenin kendi yöntemi, tutarı ve kasası") bir **hedef** ihtiyacı
  değil, bir **ödeme satırı** ihtiyacıdır; B bölümü onu karşılar.
- **Tek soru, tek yer.** 0041 yöntemi ödemenin alanı yaptı ve kalemdeki alanı "varsayılan"a indirdi;
  0042 onu açılır listeye çevirdi. Kullanıcı yine de kalemin yöntemi sanıyor. Aynı soruyu iki yerde
  sormanın bedeli bu; alanı kaldırmak hem ekranı kısaltır hem yanlış anlamayı bitirir.
- **"Elden" sözcüğünün iki anlamı (dikkat).** Uygulamada **elden**, personel kaleminin bordro dışı
  bileşeninin adıdır ve 0042'den beri bir **ödeme hedefidir**. Günlük konuşmada ise "elden ödemek" bir
  **ödeme yöntemidir** (nakit vermek). İkisi aynı şey değildir: personelin elden bileşeni havaleyle
  ödenebilir, resmi bileşeni nakit verilebilir, normal bir hammadde alımının yarısı elden (nakit)
  ödenebilir. R20 bunu kural hâline getiriyor, C7 de yöntem listesine ikinci bir "Elden" girmesini
  yasaklıyor. Bu, 0023 R10'daki "mesai" tuzağının aynısı: aynı sözcük iki kavram.
- **Risk nerede.** İşin kendisi dar ama üç yeri birden değiştiriyor: form, pencere ve tanım formu.
  Doğrulamanın tek fonksiyondan geçmesi (C2) ve kaydın tek işlem olması (C3) korunmazsa, aynı kalem iki
  yoldan farklı davranır.

---

## Acceptance Criteria

### Yöntem alanı

- **AC-1.** Gider formunda kalem düzeyinde ödeme yöntemi alanı görünmez.
- **AC-2.** Tekrarlayan gider tanımı formunda da görünmez.
- **AC-3.** Yeni ödeme satırı en son kullanılan yöntemle gelir ve satırda değiştirilebilir.
- **AC-4.** Eski kayıtların yöntem alanı korunur; kayıt açılıp kaydedilince veri bozulmaz.
- **AC-5.** Vade alanının etiketi her zaman "Son ödeme tarihi"dir (taksitli ve stopajlı kira dalları
  aynen); hiçbir yerde "Çek vade tarihi" yazmaz (R4).

### Çok satırlı ödeme

- **AC-6.** Bir hedefe iki ödeme satırı girilir; biri nakit, biri havale olur ve iki ayrı hareket doğar.
- **AC-7.** İki satır farklı hesaplardan seçilebilir ve iki hesabın bakiyesi ayrı ayrı azalır.
- **AC-8.** Personelin elden hedefi iki satırla ödenir (biri nakit, biri havale).
- **AC-9.** Bir hedefteki satırların toplamı kalanı aşarsa kayıt yapılmaz ve hata toplam üzerinden
  söylenir.
- **AC-10.** Satır sayısı üst sınırı ödeme penceresindekiyle aynıdır.
- **AC-11.** Formdan ve pencereden girilen aynı ödeme birebir aynı hareket kaydını üretir: ikisi aynı
  doğrulama ve üretim fonksiyonunu çağırır (kaynak taraması) ve üretilen hareket dizileri alan alan
  eşittir (R29).

### Çek

- **AC-12.** Ödeme penceresinde "Çek (ciro)" seçilip portföydeki bir çekle gider ödenir.
- **AC-13.** Ödeme penceresinde "Çek (kendi)" ile kendi çekimiz yazılır.
- **AC-14.** Bu ciro hiçbir hesabın bakiyesini değiştirmez; kendi çekimizde bakiye çek ödendiğinde düşer.
- **AC-15.** Mevcut bir gider, düzenleme formundaki "Ödeme gir" düğmesinden çekle ödenebilir.
- **AC-16.** Stopaj ve elden hedeflerinde çek seçeneği çıkmaz ve nedeni yazılır.
- **AC-17.** Bir ödeme kaydında ikinci bir çek satırı girilemez.
- **AC-18.** Kasa görünmeyen kullanıcıda çek seçenekleri hiç çizilmez.
- **AC-19.** Portföyde uygun çek yokken seçenek nedeni yazılı olarak boş kalır ve kayıt engellenmez.

### Koruma

- **AC-20.** Ek ödemeler ayrı ödeme hedefi oluşturmaz; borç özeti, hatırlatıcı ve ekstre değişmez.
- **AC-21.** Gider toplamları, KDV ve makina maliyeti bu işten önce ve sonra aynıdır.
- **AC-22.** Ödeme satırındaki bir hata yüzünden kayıt durduğunda gider kalemi de kaydedilmemiştir.

### Her şey formda

- **AC-23.** Mevcut bir gider düzenlenirken formdan ödeme girilir ve kaydedilir.
- **AC-24.** Aynı formda ikinci bir ödeme satırı eklenip farklı yöntemle kaydedilir.
- **AC-25.** Mevcut bir gider formdan çekle (ciro) ödenir; başka ekrana gidilmez.
- **AC-26.** Mevcut bir gider formdan kendi çekimizle ödenir.
- **AC-27.** Formda kayıtlı bir ödeme silinir ve kalemin kalanı artar.
- **AC-28.** Form ile ödeme penceresi aynı bileşeni çizer (aynı `testId`) ve aynı veriyle aynı sonucu
  üretir (R29).
- **AC-29.** Kalem, ödemeler ve çek durumu tek yazımda kaydedilir; biri reddedilince hiçbiri yazılmaz.
- **AC-30.** Kayıtlı ödemesi olan kalemde tutar ödenenin altına düşürülünce 0048'in uyarısı çıkar.

### Hedef ile yöntem bağımsızlığı

- **AC-31.** 100.000 TL'lik normal bir kalem, yarısı havale yarısı nakit olacak şekilde iki satırla
  ödenir; iki ayrı hareket doğar ve kalem "ödendi" olur.
- **AC-32.** Personelin **elden** hedefi havale yöntemiyle ödenebilir.
- **AC-33.** Personelin **resmi** hedefi nakit yöntemiyle ödenebilir.
- **AC-34.** Ödeme yöntemi listesinde "Elden" diye bir seçenek yoktur.
- **AC-35.** Ödeme satırına yazılan açıklama kaydedilir ve ödeme listesinde görünür.

### QA turunda eklenen kriterler

- **AC-36.** Ödeme penceresinde "Kendi çekiyle öde" düğmesi yoktur; kendi çek satır yöntemi olarak
  seçilir (R10).
- **AC-37.** Çek yöntemleri üç yerde de (yeni form, düzenleme formu, pencere) satırın yöntem listesinde
  görünür.
- **AC-38.** Yeni ödeme satırı `sonKullanilanYontem`'den gelen yöntemle açılır; ciro ve kendi çek bu
  varsayılan olarak asla gelmez (R2, R23).
- **AC-39.** Hiç ödeme hareketi yoksa yeni satırın yöntemi boş gelir (R23).
- **AC-40.** Ek ödemeyle ilk kez doğan elden hedefine düzenleme formundan ödeme girilebilir ve kalem ile
  ödeme aynı yazımda kaydedilir (R24).
- **AC-41.** Aynı hedefte on bir satır girilemez; sınır hedef başınadır (R7).
- **AC-42.** Aynı hedefe giden satırların toplamı o hedefin kalanını aşarsa hata o hedefin adıyla
  söylenir (R6).
- **AC-43.** Aynı yazımda ikinci bir çek satırı (ciro + kendi çek dahil) girilemez (R12).
- **AC-44.** `cekId` taşıyan kayıtlı hareket formdan silinemez; nedeni yazılır ve kullanıcı ciro ya da çek
  iptaline yönlendirilir (R16).
- **AC-45.** "Hepsini ödendi işaretle" yalnız her hedefin ilk satırını doldurur, ek satırlara dokunmaz
  (R25).
- **AC-46.** Tekrarlayan tanımdan üretilen kalemin yöntem alanı boş kalır (R26).
- **AC-47.** Mahsup kipi tek satırlıdır ve satır listesine karışmaz (R27).
- **AC-48.** Kanıt eşlemesinde değişen dosyaların kaydı `beklenen: "degisti"` + onay taşır (R28).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Form ile pencere aynı doğrulama ve hareket üretim fonksiyonlarını çağırıyor ve **aynı bileşeni**
      çiziyor; R29'un üç ölçütü de testli (C2, AC-11, AC-28).
- [ ] "Kendi çekiyle öde" düğmesi kaldırıldı ve çek üç yerde de satır yöntemi (AC-36, AC-37).
- [ ] `sonKullanilanYontem` saf ve testli; ciro ile kendi çek varsayılan olarak gelmiyor (AC-38, AC-39).
- [ ] 0048'in "Kaydedince ödenebilir" kısıtının formda kalktığı, pencerede kaldığı testle gösterildi
      (R24, AC-40).
- [ ] Kanıt eşlemesindeki kayıtlar `degisti` + onayla işaretlendi ve `kanit-eslemesi.test.js` yeşil (R28,
      AC-48).
- [ ] Kayıt tek işlem; ödeme hatasında kalem de kaydedilmiyor (C3, AC-22).
- [ ] Kaldırılan alanın veride korunduğu ve göç yapılmadığı testle gösterildi (AC-4).
- [ ] Görsel kanıt eklendi (`docs/evidence/0053-*.jpg`): alansız form başlığı, iki satırlı hedef ödemesi,
      ödeme penceresinde çek seçenekleri.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: yöntemin yalnız ödeme satırında olduğu, hedef başına çok satır ve çekin
      her ödeme yolundan kullanılabildiği.
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
