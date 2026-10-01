# 0057 — Taksitli Hedefin İlk Taksiti Formdan Ödenebilsin

| | |
|---|---|
| **Durum** | Taslak |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider formunun ödeme bölümü (yeni kalem ve düzenleme), ödeme editörü |
| **Bağımlı spec'ler** | 0021 (taksit planı) · 0024 (ödeme hareketi) · 0041 (çok satırlı ödeme doğrulaması) · 0046 (formdan hedef bazlı ödeme) · 0048 (düzenleme durumu, `yapiAyni`) · 0053 (tek ödeme editörü, R30) · 0054 (hedef kümesi) |
| **Revizyon** | R1 (QA turu, 2026-10-01): geliştirici hazırlığı denetimi, 15 bulgu işlendi, 5'i bloklayıcıydı. **İşin kapsamı daraldı:** taksit seçici, taksit bazlı kalan, sıra üzerinden bağ ve plan değişikliği ölçütü 0053 R30 ile **zaten kurulmuş**; eksik olan tek şey formdaki `pasif` ölçütü (R1, R11). Pasif kalkınca ortaya çıkan iki somut hata önceden kapatıldı ("Hepsini işaretle" tutarı R12, çek satırındaki taksit seçici R8), `ciroOlur` yan etkisi ve pasif metni yazıldı (R8, R9). AC-16…AC-28 eklendi.<br>**R2 (2026-10-01, plan onayı):** çek dağıtımı motorda mevcut fonksiyonlarla kurulur ve tek editör olduğu için ödeme penceresinde de geçerlidir (Q1, R19); pasif neden metni tek sabitte (Q2, R20); `taksitli` alanı `pasif`'ten ayrılır (Q3, R21); plan hatasında taksitli hedef pasif kalır (Q4, R22); AC-10 R7 ile hizalandı, ölçüt yalnız taksit sayısı (Q5); "Hepsini işaretle" hedef başına (Q6, R23). F bölümü (R19–R23) eklendi. |

---

## Intent

Yeni gider açarken taksit sayısı ikiden büyükse ödeme kutusunda **yalnız ödeme tarihi** kalıyor; ödeme
satırı hiç çizilmiyor ve "bu kalemin bütün ödemeleri taksitli, kaydedildikten sonra ödenir" notu
görünüyor. Oysa kullanıcının yaptığı şey çok sıradan: altı taksitli bir gider giriyor ve **ilk taksiti o
anda ödüyor.** Bugün bunun için kaydedip listeye dönmek, kalemi bulmak ve ödeme penceresini açmak
gerekiyor.

Kısıt 0046'da bilinçle konmuştu: "hangi taksitin ödendiği ayrı bir seçim ve ödeme penceresinin işi".
Gerekçe o gün makuldü, ama pratikte en sık senaryoyu kapatıyor ve cevabı belirsiz de değil: yeni bir
kalemde ödenen taksit ilk taksittir.

Başarı şu demek: taksitli bir hedef de formdan ödenebiliyor, satır hangi taksidi ödediğini söylüyor ve
varsayılanı en yakın vadeli açık taksit.

---

## Requirements

- **R1.** Taksitli hedefin ödeme satırı **formda çizilir**; hedef artık sırf taksitli olduğu için pasif
  kalmaz. **İşin tamamı `pasif` ölçütünün değişmesidir:** bugün `formOdemesi.js:38`
  `const pasif = satirlar.length > 1;` diyor. Yeni kural: `formOdemeHedefleri` `pasif` üretmez (`false`
  döndürür) ve **çağıran belirler** (dosyanın kendi yorumu bunu zaten söylüyor, satır 21): ödeme penceresi
  bugünkü gibi açık bırakır (`OdemeKayitPenceresi.jsx:26` `pasif: false, neden: null`),
  `duzenlemeOdemeDurumu` `pasif: taksitPlaniDegisti` verir (R7), yeni kalemde kimse pasif yapmaz.
- **R2.** Satır **hangi taksidi** ödediğini gösterir ve değiştirilebilir; varsayılan **en yakın vadeli
  açık taksit** (yeni kalemde birinci taksit). **Bu zaten var ve korunur:** `OdemeGirisi.jsx:106-110`
  taksit seçiciyi çiziyor ("n/m. taksit · vade · kalan"), `:58` ve `:374` varsayılanı
  `acikTaksitler[0].sira` yapıyor, `:51-54` kalanı taksit bazında hesaplıyor. Yeni bir seçici yazılmaz.
- **R3.** 0053'ün çok satırlı ödemesi burada da geçerlidir: ikinci bir satır başka bir taksidi
  ödeyebilir, kendi tutarı, yöntemi ve hesabıyla.
- **R4.** **Satır taksidi sırasıyla tutar, kimlikle değil** ve bu da **zaten böyle**: `formOdemesi.js:125`
  satır nesnesine `sira` yazıyor, `OdemeGirisi` baştan sona `sira` ile çalışıyor, `ilkGiris` (`:374-375`)
  dışarıdan gelen bir `taksitId`'yi `sira`'ya çeviriyor. Yeni kalemde önizleme planı geçici kimliklerle
  kurulsa da ödeme, kayıt sırasında aynı sıradaki **gerçek** taksite bağlanır. Yeni bir bağlama yolu
  yazılmaz; korunur ve testle sabitlenir.
- **R5.** Bir taksit **kısmen** ödenebilir (0024'ün bugünkü kuralı); kalan o taksitte durur. Sınır
  **taksit bazındadır**: satırın tutarı seçili taksidin kalanını aşamaz. Hedefin kalanı ayrı bir üst sınır
  değildir (taksitlerin toplamıdır); R6'nın "taksit başına ve toplam" ifadesi aynen geçerli.
- **R6.** Doğrulama bugünkü tek fonksiyondan geçer: taksit başına ve toplam üzerinden kalan sınırı
  (`cokluOdemeDogrula`), ya hep ya hiç.
- **R7.** **Dar istisna:** yalnız **o düzenlemede taksit sayısı değişen** hedef pasif kalır, çünkü
  satırlar kayıtta yeniden kurulacaktır; nedeni yazılır. Ölçüt **taksit sayısıdır**, tutar değil:
  `duzenlemeOdemeDurumu` bugün `yapiAyni = taksitSayisi(k.satirSayisi) === taksitSayisi(h.satirSayisi)` ve
  `taksitPlaniDegisti = h.taksitli && !yapiAyni` hesabını **zaten yapıyor** (`formOdemesi.js:75-82`). Sayı
  aynı kaldığı sürece satır kimlikleri `eskiHedef` yoluyla korunur ve `planYenidenBol` ödenmiş satırı
  korur, yani tutar değişse de ödeme doğru satıra bağlanır. **Yalnız vade değişirse hedef pasif olmaz.**
- **R8.** Çek (ciro ve kendi çekimiz) taksitli ana hedefte de kullanılabilir; dağıtım ve kurallar
  0040/0049'daki gibidir. İki ayrıntı yazılıdır:
  - **Çek satırında taksit seçici çizilmez.** `ciroPlani` ve `kendiCekPlani`, `ciroAdaylari` üzerinden ANA
    hedefin **birden çok** açık taksidine en eski vadeden dağıtır (çek bölünemediği için; X2'nin gerekçesi).
    Satırda "çek tutarı bu hedefin açık taksitlerine en eski vadeden dağıtılır" yazar; dağıtımı motor yapar.
    Elle girilen normal satırlarda seçici kalır.
  - **`ciroOlur` ölçütü artık yalnız "hedef ANA"dır**, taksit sayısına bakmaz (bugün
    `formOdemesi.js:46` `ciroOlur: h.hedef === HEDEF.ANA && !pasif`; pasif kalkınca ciro taksitli ANA'da
    kendiliğinden açılır). Planı değişen hedefte satır hiç çizilmediği için çek de çizilmez.
- **R9.** "Bütün ödemeler taksitli" notu **kalkar** (`HEPSI_TAKSITLI_NOTU` ve onu çizen
  `OdemeGirisi.jsx:288` dalı kaldırılır); yerini ödeme satırları alır. R7'nin dar durumunda görünen metin
  **`PASIF_TAKSIT_NEDENI`**'dir ve içeriği değişir: bugün "Bu bölüm taksitli; taksitler kalem
  kaydedildikten sonra ödenir…" diyor, bundan sonra plan değişikliğini anlatır ("Bu bölümün taksit planı bu
  düzenlemede değişti; ödemeyi kaydettikten sonra girin."). 0046 AC-32'nin beklentisi bu spec'le bilinçli
  olarak güncellenir.
- **R10.** Kalemin tutarı, taksit planı, vadeleri ve gider tarafı bu işten **etkilenmez**; değişen yalnız
  ödemenin nereden girilebildiği.

### QA turunda eklenenler (R1)

- **R11.** **Yeni mekanizma yazılmaz.** 0053 R30 ile gelen dört parça aynen korunur ve testle sabitlenir:
  hedef nesnesindeki `acikTaksitler` (sira, vade, kalan; `formOdemesi.js:43`), `OdemeGirisi`'nin taksit
  seçicisi ve taksit bazlı kalan hesabı, satırların `sira` taşıması, ve `taksitPlaniDegisti`. Bu işin kod
  tarafı tek ölçütün (R1) değişmesi ile onun yan etkileridir (R8, R9, R12).
- **R12.** **"Hepsini ödendi işaretle" taksitli hedefte en yakın vadeli açık taksidi doldurur**, o taksidin
  kalanıyla; hedefin tamamını ödemeye çalışmaz. Bugün `formOdemesi.js:122` pasif hedefi atlıyor ve tutarı
  hedefin kalanı olarak yazıyor; pasif kalkınca altı taksitli bir hedefte bu tutar tek taksidin kalanını
  aşar ve `cokluOdemeDogrula` reddeder. Satır `sira`'yı `acikTaksitler[0].sira` olarak alır.
- **R13.** **Ödenmiş taksit seçicide görünmez** (`acikTaksitler` kalanı sıfır olanı zaten dışlıyor);
  bütün taksitler ödenmişse hedef satırı hiç çizilmez (kalan sıfır).
- **R14.** **Aynı taksidi iki satırın ödemesi serbesttir** (aynı taksidi iki yöntemle ödemek meşrudur);
  `OdemeGirisi.jsx:54` aynı hedef ve aynı `sira`'ya giden satırları toplayıp kalanı zaten düşüyor.
- **R15.** **Mahsup tarafı değişmez:** taksitli hedefte mahsup yeri bugün de taksit başına üretiliyor
  (`OdemeGirisi.jsx:231`); tek satırlık kip olarak kalır (0053 C8).
- **R16.** **AC-15 ölçütü 0053 R29'dur:** aynı bileşen (aynı `testId`), aynı doğrulama ve üretim
  fonksiyonu, ve aynı girdiyle iki yoldan üretilen hareket dizilerinin alan alan eşitliği. Yeni bir ölçüt
  yazılmaz.
- **R17.** **Kırılacak mevcut testler bilinçli olarak güncellenir:** 0046 AC-32 ("yeni kalemde bütün
  hedefler taksitliyse tek açıklama") ve `PASIF_TAKSIT_NEDENI` metnine bakan testler. Hangileri olduğu
  kriter → test tablosunda gösterilir.
- **R18.** **Görsel kanıt:** form görünümü bilerek değişiyor (taksitli hedefte satır ve taksit seçici
  çıkıyor), bu yüzden `docs/evidence/kanit-eslemesi.json`'da ilgili dosyaların kaydı
  `beklenen: "degisti"` + `onay` (`Takım Yöneticisi · YYYY-AA-GG · spec 0057 R1`) taşır; spec `done`'a
  taşınırken `ayni`ye çevrilir (0009/0011 kuralı).

### F. Plan onayında eklenenler (R2)

- **R19.** **Çek dağıtımı (Q1).** Bugün motorun çek dalı satırın seçtiği **tek** taksidin adayını alıyor; R8'in istediği
  dağıtım yok. Yeni hesap yazılmaz: `ciroAdaylari([kalem])`'in ANA adayları alınır, her adayın kalanından aynı taksite
  giden normal satırların toplamı düşülür (0053 Q3: çek diğer satırlardan sonra kalanı kapatır), `ciroVarsayilanDagitim`
  ile en eski vadeden dağıtılır (ciroda çek ile toplam kalanın küçüğü, kendi çekte girilen tutar) ve `ciroPlani` /
  `kendiCekPlani`'ye verilir. Tek editör olduğu için (C2, R16) bu **ödeme penceresinde de** geçerlidir; AC-17'nin
  "pencere değişmez" kapsamı normal satırlar ve taksit seçicidir, çek tarafı R8 ile bilinçli değişir.
- **R20.** **Tek neden metni (Q2).** `PASIF_TAKSIT_NEDENI` R9'daki yeni metni taşır; 0053'ün `TAKSIT_PLANI_DEGISTI_NEDENI`
  kaldırılır (aynı durumu iki metinle anlatmak ayrışır); 0053 testi bu spec'le güncellenir.
- **R21.** **`taksitli` ile `pasif` ayrılır (Q3).** Bugün `formOdemeHedefleri` `taksitli: pasif` yazıyor; `taksitli` artık
  `satirlar.length > 1`'dir ve `taksitId` taksitli olmayan satırlı hedefte tek satırın kimliğidir. Aksi hâlde pasif
  kalkınca taksit seçici ve taksit bazlı kalan da kaybolurdu (R2, R11).
- **R22.** **Plan hatası (Q4).** Düzenlemede ödeme planı hatalıyken taksitli hedef bugünkü gibi pasif kalır; karar
  `duzenlemeOdemeDurumu`'ndadır (C2), neden kutunun üstündeki plan hatası notudur.
- **R23.** **"Hepsini ödendi işaretle" hedef başınadır (Q6):** birden çok taksitli hedefte (ör. kira ANA ve stopaj) her
  hedefin en yakın vadeli açık taksidi kendi kalanıyla dolar.

---

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla.
- **C2.** **Tek motor ve tek editör:** satırlar 0053'ün ödeme editöründen, doğrulama ve hareket üretimi
  bugünkü fonksiyonlardan geçer; forma özel ikinci bir taksit mantığı yazılmaz. **`pasif` kararı tek
  yerdedir:** `formOdemeHedefleri` onu üretmez, çağıran verir (R1); üç çağıran (pencere, düzenleme durumu,
  yeni kalem) kendi kuralını tek satırda söyler.
- **C3.** Kayıt **tek işlemdir**: kalem, taksit satırları, ödeme hareketleri ve çek durumu aynı yazımda;
  biri reddedilirse hiçbiri kaydedilmez (0046 kuralı).
- **C4.** Ödenmiş taksit koruması bozulmaz: plan yeniden kurulurken ödeme almış satır korunur
  (`planYenidenBol`).
- **C5.** Yeni kalıcı alan, yeni izin ve sunucu değişikliği yoktur.
- **C6.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Taksit planının ödeme sırasında değiştirilmesi (satır eklerken vade kaydırmak) — *neden:* plan
  kalemin alanı, ödeme ayrı bir kayıt; ikisini aynı anda değiştirmek R7'nin kapattığı belirsizliği geri
  getirir.
- **X2.** Bir ödemenin birden çok taksite otomatik dağıtılması (tutarı yaz, kendisi bölsün) — *neden:*
  dağıtım çekte var çünkü çek bölünemez; elle ödemede kullanıcı hangi taksidi ödediğini bilir ve satır
  ekleyerek söyler.
- **X3.** Taksit satırlarının formda tek tek listelenip işaretlenmesi — *neden:* plan önizlemesi zaten
  var; ödeme bölümü ödeme satırlarının yeri.
- **X4.** Stopaj ya da elden hedefinin taksitlenmesi — *neden:* 0021 ve 0042'de karara bağlandı, tek
  satır kalır.

---

## Context

- **Bugünkü kural (doğrulandı).** `src/lib/formOdemesi.js` içinde `const pasif = satirlar.length > 1;`
  yani bir hedefin birden çok taksit satırı varsa o hedef formda **pasif**. Altı taksitli yeni bir
  kalemde bütün hedefler pasif olduğu için ödeme kutusunda yalnız tarih alanı ve
  `HEPSI_TAKSITLI_NOTU` kalıyor. Kullanıcının gördüğü tam olarak bu.
- **Gereken altyapının tamamı zaten var (QA turunda satır satır ölçüldü).** 0053 R30 şunları getirmiş:
  `formOdemesi.js:43` hedef nesnesine **`acikTaksitler`** (id, sira, vade, kalanK) ekliyor ve yorumu
  "düzenleme formu ve pencere taksit seçer" diyor; `OdemeGirisi.jsx:106-110` **taksit seçiciyi** çiziyor
  ("n/m. taksit · vade · kalan"); `:51-54` kalanı **taksit bazında** hesaplıyor ve aynı taksite giden
  diğer satırları düşüyor; `:58` ile `:374` varsayılanı `acikTaksitler[0].sira` yapıyor; `:374-375`
  dışarıdan gelen `taksitId`'yi `sira`'ya çeviriyor; `formOdemesi.js:125` satırlar **`sira`** taşıyor
  (R4'ün istediği bağ); `:75-82` `yapiAyni` ve **`taksitPlaniDegisti`** hesabı duruyor (R7'nin ölçütü).
  0041'in `cokluOdemeDogrula`'sı taksit başına ve toplam sınırını zaten uyguluyor.
- **Pencere açıyor, form kapatıyor.** `OdemeKayitPenceresi.jsx:26` bütün hedefleri
  `{...h, pasif: false, neden: null}` ile açıyor, yani taksitli hedef **pencerede bugün de ödenebiliyor** ve
  seçici çalışıyor. Form ise `formOdemeHedefleri`'nin `pasif = satirlar.length > 1` çıktısını olduğu gibi
  kullanıyor (`OdemeGirisi.jsx:66` `cizilebilir = hedefler.filter(h => !h.pasif)`, `:288` hepsi pasifken
  `HEPSI_TAKSITLI_NOTU`, `:292` pasif hedefte yalnız `neden`). Kullanıcının gördüğü boşluk tam olarak bu
  asimetridir ve işin kod tarafı bu tek ölçüttür (R1).
- **Geçici kimlik tuzağı (R4).** Yeni kalemde form, planı `onizleme-1`, `onizleme-2` gibi geçici
  kimliklerle kuruyor; gerçek taksit kimlikleri kayıtta doğuyor. Ödeme satırı bu geçici kimliğe
  bağlanırsa kayıt sırasında hiçbir taksite denk gelmez. 0046 aynı sorunu kalem kimliği için çözmüştü
  (form geçici kimlikle doğrular, `Giderler.kaydet` gerçek kimlikle yeniden çağırır); taksit için de
  aynı yol gerekir, ama bağ **sıra** üzerinden kurulmalı. İşin tek gerçek riski budur.
- **Neden dar istisna kalıyor (R7).** Mevcut bir kalemi düzenlerken taksit sayısını ya da tutarı
  değiştiriyorsanız satırlar kayıtta yeniden kurulur; o anda "üçüncü taksiti öde" demek, kaydettikten
  sonra hangi satıra denk geleceği belirsiz bir ödeme demektir. Bu durumda hedef pasif kalır ve nedeni
  yazılır. Plan değişmiyorsa böyle bir belirsizlik yok.
- **0046 X3 geri alınıyor.** O maddenin gerekçesi "hangi taksit sorusu ödeme penceresinin işi"ydi. Yeni
  kalemde cevap belirsiz değil (ilk taksit), düzenlemede de en yakın vadeli açık taksit makul bir
  varsayılan ve kullanıcı değiştirebiliyor.

---

## Acceptance Criteria

- **AC-1.** Altı taksitli yeni bir giderde ödeme bölümünde ödeme satırı çizilir (yalnız tarih kalmaz).
- **AC-2.** Satır varsayılan olarak birinci taksidi hedefler ve tutarı o taksidin tutarıdır.
- **AC-3.** Kaydedince ilk taksit ödenmiş olur, kalan taksitler açık kalır.
- **AC-4.** Ödeme gerçek taksite bağlanır; kaydedilen hareketin taksiti planın birinci satırıdır.
- **AC-5.** İkinci bir satır eklenip ikinci taksit de ödenebilir; iki ayrı hareket doğar.
- **AC-6.** Bir taksit kısmen ödenebilir ve kalan o taksitte görünür.
- **AC-7.** Bir taksidin kalanından fazla tutar girilince kayıt yapılmaz ve hata o satırda söylenir.
- **AC-8.** Satırların toplamı kalemin kalanını aşamaz.
- **AC-9.** Mevcut bir kalemi düzenlerken, plan değişmiyorsa taksitli hedef formdan ödenebilir ve
  varsayılan en yakın vadeli açık taksittir.
- **AC-10.** Aynı düzenlemede taksit sayısı değiştirilmişse hedef pasif kalır ve nedeni yazılır (R2 ile
  R7'ye hizalandı: tutar değişimi pasif yapmaz, AC-23).
- **AC-11.** Ödeme almış taksit, plan yeniden kurulurken korunur.
- **AC-12.** Taksitli ana hedef çekle (ciro ya da kendi çekimiz) ödenebilir ve dağıtım 0040/0049
  kurallarına uyar.
- **AC-13.** Ödeme satırındaki bir hata yüzünden kayıt durduğunda gider kalemi de kaydedilmemiştir.
- **AC-14.** Kalemin tutarı, taksit planı ve vadeleri bu işten önce ve sonra aynıdır.
- **AC-15.** Formdan ve ödeme penceresinden girilen aynı taksit ödemesi birebir aynı hareket kaydını
  üretir; ölçüt 0053 R29'un üçlüsüdür (R16).

### QA turunda eklenen kriterler

- **AC-16.** `formOdemeHedefleri` `pasif` üretmez; pasif kararı çağırandan gelir (R1, kaynak taraması).
- **AC-17.** Ödeme penceresinin bugünkü davranışı değişmez: taksitli hedef orada ödenebilir ve seçici
  çalışır (regresyon).
- **AC-18.** 0053 R30'un parçaları korunur: `acikTaksitler`, taksit seçici, taksit bazlı kalan ve satırın
  `sira` taşıması yeniden yazılmaz (R11, kaynak taraması).
- **AC-19.** "Hepsini ödendi işaretle" taksitli hedefte en yakın vadeli açık taksidi o taksidin kalanıyla
  doldurur ve doğrulama hata vermez (R12).
- **AC-20.** Çek satırında taksit seçici çizilmez; çek tutarı hedefin açık taksitlerine en eski vadeden
  dağıtılır ve satırda bu yazar (R8).
- **AC-21.** Taksitli ANA hedefinde çek seçeneği görünür (`ciroOlur` yalnız hedefe bakar); planı değişen
  hedefte görünmez (R8).
- **AC-22.** Yalnız vade değiştirilen düzenlemede hedef pasif olmaz ve formdan ödenebilir (R7).
- **AC-23.** Yalnız tutar değiştirilen (taksit sayısı aynı) düzenlemede hedef pasif olmaz (R7).
- **AC-24.** Taksit sayısı değiştirilen düzenlemede hedef pasiftir ve neden metni plan değişikliğini
  anlatır (R7, R9).
- **AC-25.** `HEPSI_TAKSITLI_NOTU` hiçbir yerde görünmez (R9).
- **AC-26.** Ödenmiş taksit seçicide listelenmez; bütün taksitler ödenmişse hedef satırı çizilmez (R13).
- **AC-27.** Aynı taksit iki satırla, iki ayrı yöntemle ödenebilir ve toplam o taksidin kalanını aşamaz
  (R14).
- **AC-28.** Mahsup kipinde taksit yeri seçimi bugünkü gibi çalışır (R15).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Satırlar 0053'ün ödeme editöründen geliyor; forma özel ikinci taksit mantığı yazılmadı (C2) ve
      0053 R30'un parçaları yeniden yazılmadı (AC-18, kaynak taraması).
- [ ] `pasif` kararı tek yerde değil çağıranlarda; üç çağıranın kuralı testli (AC-16, AC-17, AC-24).
- [ ] "Hepsini işaretle" ve çek satırı yan etkileri testli (AC-19, AC-20, AC-21).
- [ ] 0046 AC-32 ve pasif metnine bakan mevcut testler güncellendi ve kriter → test tablosunda gösterildi
      (R17).
- [ ] Kanıt eşlemesindeki kayıtlar `degisti` + onayla işaretlendi; `done`'a taşımada `ayni`ye çevrilecek
      (R18).
- [ ] Geçici kimlik yolu testle kapsandı: yeni kalemde ödeme gerçek taksite bağlanıyor (AC-4).
- [ ] Ödenmiş taksit korumasının bozulmadığı testle gösterildi (AC-11).
- [ ] Görsel kanıt eklendi (`docs/evidence/0057-*.jpg`): taksitli yeni giderin ödeme satırı, taksit
      seçici, pasif kalan dar durum.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: taksitli hedefin formdan ödenebildiği ve kalan dar istisna.
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
