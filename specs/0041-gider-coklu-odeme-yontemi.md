# 0041 — Bir Giderin Birden Çok Ödeme Yöntemiyle Ödenmesi

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-29, plan onayıyla; plan `specs/0041-uygulama-plani.md` Q1–Q11). Uygulanıyor, dal `feat/0041-coklu-odeme`. |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider kalemi formu, ödeme kayıt penceresi, gider listesi, dönem raporu, tekrarlayan gider tanımı |
| **Bağımlı spec'ler** | 0001 (gider kaydı, tamam) · 0024 (ödemenin kalemden ayrılması, tamam) · 0040 (çek portföyü ve ciro, tamam) |
| **Revizyon** | R1 (QA turu, 2026-09-29): 17 bulgu işlendi, 5'i bloklayıcıydı. R2 (2026-09-29, plan onayı): kırılım kalemin bütün hedeflerini sayar, ekstre ana hedefte kalır (R3/Q1); hareketin payı tutarından, yalnız göç hareketi olan kalemde motorun yeniden çalıştırılmasıyla bulunur (R11/Q2); dönem kırılımı dönemin kalemlerine yapılan ödemelerdir (R10/Q3); dönem kartında personel ayrıntı kapalıyken tek satırdır (R18/Q4); kalem ayrıntısı ödeme penceresidir (R4/Q5); yeni satırın varsayılanları (R5/Q6); hata adı pencerenin hedef adından (R6/Q7); tek satır bugünkü doğrulamadan geçer (R6/Q8); vade etiketi yöntem alanını okumaya devam eder (R4/Q9); görsel kanıt (Q10); pencere genişliği (R5/Q11). |

---

## Intent

Bir gider her zaman tek bir yöntemle ödenmiyor. Bir faturanın yarısı nakit veriliyor, kalanı karta
çekiliyor; bir başkası kısmen çekle, kalanı havaleyle kapanıyor. Uygulama bunu veri olarak zaten
tutabiliyor, çünkü 0024 ile her ödeme kendi kaydı oldu ve kendi yöntemini taşıyor. Ama kullanıcı bunu
göremiyor: gider formunda tek bir "Ödeme yöntemi" seçeneği duruyor ve kalemin tek bir yöntemi varmış gibi
konuşuyor, dönem raporu bu yanıltan alanı kalem satırında ve kartında olduğu gibi basıyor, ödemelerin
gerçek yöntem kırılımı hiçbir yerde görünmüyor, ve iki yöntemle ödeme yapmak için ödeme penceresini iki
kez açmak gerektiği hiçbir yerde yazmıyor.

Yani sorun mekanizmada değil, anlatımda: uygulama yapabildiği şeyi yapamıyormuş gibi gösteriyor.

Başarı şu demek: kullanıcı bir kalemi tek pencerede birkaç yöntemle ödeyebiliyor, kalemin hangi paranın
nasıl ödendiğini listede okuyabiliyor, ve formdaki tek yöntem alanı artık bir iddia değil, yalnız bir
varsayılan.

---

## Requirements

- **R1.** Bir gider kalemi birden çok ödemeyle kapanabilir ve **her ödeme kendi yöntemini taşır**. Bugünkü
  davranış budur ve korunur.
- **R2.** Kalem üzerindeki tek "ödeme yöntemi" alanı bir gerçek değil **varsayılan** olur: yeni ödeme
  girilirken ön seçili gelir, kalemin nasıl ödendiğini iddia etmez. **Davranış bugün zaten doğrudur**
  (`OdemeKayitPenceresi.jsx:42`, `yontem: kalem.odemeYontemi || ""`); bu işte değişen üç şeydir: alanın
  ekrandaki etiketi ve ipucu metni (R16), ve alanın **hiçbir listede gösterilmemesi** (R4).
- **R3.** Kalemin gerçek ödeme yöntemi **ödemelerden türetilir** ve yalnız **kaydedilmiş ödemeleri**
  anlatır:
  - hiç ödeme yoksa yöntem **yazılmaz** (kalan borç rozeti zaten durumu söyler),
  - tek yöntem varsa o yöntem,
  - birden çok yöntem varsa **"Karma"** ve yanında kırılım.

  Kısmen ödenmiş kalemde ek bir ibare gerekmez; kırılım tutarları kalanı zaten belli eder. Ödenmemiş bir
  kaleme yöntem yazmak, R2'nin düzeltmek istediği yanılgının aynısı olurdu.
  **Uygulama (R2, Q1):** kırılım kalemin **bütün ödeme hedeflerini** sayar (kirada kiraya veren ve vergi
  dairesi); tedarikçi ve çalışan ekstresi ana hedefte kalır. Tek hesap fonksiyonu (`hareketPaylari`) hedef
  seçeneğiyle ikisine de hizmet eder.
- **R4.** Gider listesinde ve kalem ayrıntısında yöntem kırılımı tutarıyla görülür (örnek: Nakit 10.000,
  Kredi kartı 5.000). **Bugün bu iki yer kalemin kendi alanını basıyor** (`gider/DonemRaporu.jsx:251` ve
  `:273`, `k.odemeYontemi || "Belirtilmemiş"`); ikisi de türetilen yönteme geçer. Kalemin `odemeYontemi`
  alanı bundan sonra yalnız formda görünür, hiçbir listede gösterilmez.
  **Uygulama (R2, Q5, Q9):** "kalem ayrıntısı" ödeme penceresinin "Kayıtlı ödemeler" bölümü ve üstündeki
  kırılım özetidir. Kalemin `odemeYontemi` alanı yalnız **vade etiketinde** ("Çek vadesi" / "Son ödeme";
  `GiderForm`, `gider.js` doğrulaması, `odemeHatirlatma.vadeEtiketi`, kalem kartındaki "çek vade") okunmaya
  devam eder; bu bir yöntem iddiası değildir.
- **R5.** Ödeme penceresinde **birden çok satır** girilebilir: her satır kendi yöntemi, tutarı ve hesabıyla
  kendi ödeme hareketini üretir. Tek satır bugünkü davranıştır.
  **Uygulama (R2, Q6, Q11):** yeni satır ilk satırın taksitini alır; tutarı o taksidin öteki satırlar düşülmüş
  kalanıdır (sıfırsa boş), yöntem kalemin varsayılanı, hesap son kullanılan hesaptır. Pencere 760 piksel
  genişler, dar pencerede satır alanları alt alta kayar.
- **R6.** **Sınır hedef başınadır, kalem başına değil.** Doğrulama üç katmanlıdır:
  1. her satır kendi hedefinin (taksitli kalemde o taksidin, satırsız kalemde kalemin) kalanını aşamaz,
  2. aynı hedefe birden çok satır girilmişse o hedefe giden satırların **toplamı** o hedefin kalanını
     aşamaz,
  3. bütün satırların toplamı kalemin kalanını aşamaz.

  Hata, aşan hedefi adıyla söyler ("3. taksit için girilen toplam kalanı aşıyor"). Bu, `odemeHedefKalaniK`
  taksitli kalemde **o taksidin** kalanını döndürdüğü için gereklidir: tek bir toplam karşılaştırması
  yapılırsa iki satır aynı taksidi aşarken kalem toplamının altında kalabilir ve bugün tek satırda korunan
  değişmez çok satırda delinir.
  **Uygulama (R2, Q7, Q8):** her satır bugünkü `kasa.odemeDogrula`'dan geçer (ciro reddi, hesap ve satır
  kalanı dahil); ikinci ve üçüncü katman bunun üstüne eklenir, tek satırlı kayıt bugünkünün aynısıdır.
  Hatadaki hedef adını pencerenin hedef adlandırıcısı verir (örnek "Kiraya veren 3/6. taksit"); motor adı
  parametre olarak alır.
- **R7.** **Ödeme penceresinde çek (ciro) satırı girilemez.** Bu, 0040 R19'un uygulanmış kuralıdır:
  `kasa.odemeDogrula` `ciro` bayrağı olmadan "Çek (ciro)" yöntemini reddeder ve pencerenin yöntem listesinde
  bu seçenek yoktur. Pencere, kalemi bir müşteri çekiyle kapatmak isteyen kullanıcıya Kasa › Çek Portföyü'nü
  gösteren bir bilgi satırı taşır (düz "Çek" seçilince bugün gösterilen ipucunun aynısı). Ciro edilmiş bir
  çekin o kaleme düşen hareketi kırılımda **"Çek (ciro)" olarak okunur**, salt okunurdur ve silinemez
  (bugün `ciro-hareketi` işaretiyle korunuyor); hiçbir hesabın bakiyesini değiştirmez.
  Gerekçe: 0040 C4 ve R7 uyarınca çek **bütün olarak, bir kez** ciro edilir ve tutarı bir alacaklının
  birden çok kalemine dağıtılır. Bu pencere tek kalem kapsamında çalıştığı ve satır tutarı serbest olduğu
  için buradan ciro açmak çeki kesirli kullanmak ve ikinci bir ciro yolu açmak olurdu.
- **R8.** Taksitli kalemde her satır yine tek bir taksite bağlanır (0021 kuralı korunur); bir ödeme
  penceresinde farklı taksitler için satır girilebilir (sınır R6'daki gibi hedef başınadır).
- **R9.** "Ödendi olarak kaydet" kısayolu tek yöntem uygulamaya devam eder; çok yöntemli ödeme ödeme
  penceresinden yapılır.
- **R10.** **Giderler › Dönem Raporu görünümünde** gider ödemelerinin yöntem kırılımı **tutar bazında**
  görülür. Aylık Faaliyet Raporu (PDF) ve dışa aktarma kapsam dışıdır (X6).
  **Uygulama (R2, Q3):** kırılım **dönemin kalemlerine** (gider tarihi dönemde olanlara) yapılan ödemeleri,
  ödeme tarihinden bağımsız sayar; kart altbaşlığı "Bu dönemin giderlerine yapılan ödemeler". Nakit akışı
  Kasa ekranındadır.
- **R11.** **Mevcut veri korunur ve eski kayıtların iki ayrı eksiği vardır** (`electron/kasaGocuSaf.mjs`
  doğrulandı): 0024 öncesi ödenmiş **taksitsiz** kalem için yazılan göç hareketi **tutarsızdır**
  (`tutar: null`, `tamKapatir: true`), ödenmiş **taksit satırı** için yazılan hareket ise
  **yöntemsizdir** (`yontem: null`, kalemin yöntemi taşınmaz). Kural:
  - `tamKapatir` hareketin kırılımdaki tutarı, motorun zaten hesapladığı **kapattığı tutardır**
    (`kasa.js` `anaPaylari` deseni; yeniden türetilmez),
  - yöntemi boş olan ödemeler kırılımda **"Belirtilmemiş"** satırında toplanır,
  - göçten gelen kayıt varsa kırılımın altında bir kez "Eski kayıtlardan aktarılan ödemelerde yöntem
    bilgisi yok" notu görünür (ödeme listesinde `kaynak === "goc"` için "Eski kayıttan aktarıldı" ibaresi
    zaten var).

  Kalemin bugünkü yöntemi varsayılan olarak kalır.
  **Uygulama (R2, Q2):** tutarı olan hareketin payı tutarıdır; motor yalnız tutarsız göç hareketi olan
  kalemde hareketler sırayla eklenerek yeniden çalıştırılır ve kapanan fark o hareketin payıdır.
- **R12.** **Satır sınırları:** en az bir dolu satır zorunludur; tutarı boş bırakılmış satır sessizce
  atılır; tutarı sıfır ya da negatif satır hatadır; en çok **10 satır** girilebilir (aşarsa "ayrı ödeme
  girin" denir). Aynı yöntemin iki satırı ve aynı taksidin iki satırı **serbesttir** (iki ayrı nakit ödeme
  meşrudur); kırılımda yöntem bazında toplanırlar.
- **R13.** **Ya hep ya hiç:** bir satır bile geçersizse hiçbir hareket yazılmaz, hatalar satır satır
  gösterilir ve pencere açık kalır (0006 R8 ile aynı desen). Yarısı kaydedilmiş bir ödeme, kullanıcıyı
  kalanı elle saymaya zorlardı.
- **R14.** **Tarih pencere başınadır**, **açıklama satır başına** ve isteğe bağlıdır. İki satıra iki farklı
  tarih gerekiyorsa bunlar zaten iki ayrı ödemedir. Bu, `odemeDogrula`'nın ürettiği kayıt şeklini bozmaz.
- **R15.** **Avanstan mahsup kırılımda ayrı bir satırdır** ("Avanstan mahsup"), bir ödeme yöntemi değil bir
  kapatma biçimidir, ve "Karma" kararında sayılır. Kullanıcının sorusu "bu borç nasıl kapandı"dır; mahsup
  kalanı düşürdüğü için kırılımda yoksa satırların toplamı kapanan tutarı tutmaz.
- **R16.** Kalemdeki alanın etiketi **"Varsayılan ödeme yöntemi"**, ipucusu "Yeni ödeme girilirken ön
  seçili gelir. Kalemin nasıl ödendiğini ödemeler belirler." olur. **Koddaki ve veritabanındaki ad
  (`odemeYontemi`) değişmez** (X7).
- **R17.** **Tekrarlayan gider tanımındaki** yöntem alanı da "varsayılan" etiketini alır ve üretilen kaleme
  varsayılan olarak kopyalanır. Başka değişiklik yoktur.
- **R18.** **Gizlilik:** personel kalemlerinde yöntem kırılımı da varsayılan kapalı personel ayrıntısının
  içinde kalır (0001 K21; tür kırılımı ve kalem listesiyle aynı davranış). Tutar gösteren yeni bir satır
  gizlilik kapsamına kendiliğinden girmez.

  **Uygulama (R2, Q4):** Dönem Raporu'nun yöntem kırılımı kartında personel ödemeleri ayrıntı kapalıyken
  yöntemlere dağıtılmaz, tek "Personel ödemeleri" satırıdır; ayrıntı açılınca yöntemlerine dağılır.

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır; satır toplamı ile kalan karşılaştırması kuruşta yapılır.
- **C2.** **Tek gerçek kaynak:** ödeme yöntemi ödemenin alanıdır. Kalemde ikinci bir yöntem gerçeği
  tutulmaz, türetilen değer saklanmaz.
- **C3.** Maliyet ve kârlılık hesabı (0002) ödeme yönteminden etkilenmez.
- **C4.** Borç özeti, ödeme hatırlatıcısı ve ekstre kalan tutarla çalışmaya devam eder; yöntem kırılımı
  bunları değiştirmez.
- **C5.** Yeni izin boyutu tanımlanmaz; çok satırlı ödeme mevcut ödeme iznine bağlıdır.
- **C6.** Tahsilat tarafının yöntem listesi (`ODEME_YONTEMLERI`) bu işte değişmez (0001 K24 kararı sürüyor).
- **C7.** Kullanıcıya görünen metinler Türkçedir.
- **C8.** **Avanstan mahsup tek satırlık bir kiptir.** Ödeme penceresindeki kip seçici (Ödeme / Avanstan
  mahsup, 0024 B) olduğu gibi kalır; çok satır yalnız "Ödeme" kipinde açılır ve satır listesine mahsup
  satırı karışmaz. Mahsubun sınırı (kalan ile açık avansın küçüğü) satır başına ayrı hesap ister;
  karıştırmak `mahsupDogrula`'yı yeniden yazmak olurdu ve bu işin kapsamı değildir.
- **C9.** Göç hareketlerinin (`kaynak: "goc"`) tutarı ve yöntemi yeniden türetilmez; kırılım motorun zaten
  hesapladığı kapatılan tutarı okur (R11).

### KAPSAM DIŞI

- **X1.** Ödeme yöntemine göre banka komisyonu ya da kart faizi hesabı — *neden:* 0021 X2'deki karar
  sürüyor; gider tarafında banka maliyeti ayrı bir iştir.
- **X2.** Kalem yöntemi alanının zorunlu hale getirilmesi — *neden:* alan opsiyonel tasarlandı ve ödeme
  girilmeden önce bilinmeyebilir.
- **X3.** Bir ödemenin sonradan başka bir yönteme bölünmesi (kaydı geriye dönük ikiye ayırmak) — *neden:*
  ödeme silinip iki satır olarak yeniden girilebilir; bölme işlemi ayrı bir karmaşıklıktır.
- **X4.** Yöntem bazında kasa hesabının zorunlu kılınması (nakit seçilince kasa hesabının otomatik gelmesi
  gibi) — *neden:* hesap seçimi 0024'te opsiyonel bırakıldı; zorunlu hale getirmek ayrı bir karardır.
- **X5.** Müşteri tahsilatında çok yöntemli ödeme — *neden:* bu iş gider tarafını düzeltiyor; tahsilat
  tarafında aynı ihtiyaç bildirilmedi.
- **X6.** Yöntem kırılımının Aylık Faaliyet Raporu'na (PDF) ve CSV/XLSX dışa aktarmaya girmesi — *neden:*
  aylık raporda gider bölümü yok (0002 X10) ve `gider-gizlilik.test.js` gider alanlarının
  `printTemplates.js`, `aylikRapor.js` ve `SettingsExport.jsx` tarafından okunmasını yasaklıyor. Tahsilat
  tarafındaki `tahsilatYontemKirilimi` emsaline bakıp kırılımı PDF'e eklemek bu testi kırar.
- **X7.** `odemeYontemi` alanının kodda ya da veritabanında yeniden adlandırılması — *neden:* ad
  değişikliği dört noktalı DB kuralını ve bir veri göçünü tetikler; bu işin değeriyle orantısız. Değişen
  yalnız ekrandaki etikettir (R16).

---

## Context

- **Mekanizma zaten var (doğrulandı).** 0024 ile gider ödemesi bir hareket kaydı oldu:
  `{tarih, tutar, yontem, hesapId, giderId, taksitId, aciklama}`. `kasa.odemeDogrula` kısmi ödemeye izin
  veriyor ("kalandan fazla ödeme kaydedilemez" kuralıyla) ve ödeme penceresi yöntemi zaten açılır listeden
  seçtiriyor. Yani bugün de bir kalem iki ödemeyle, iki farklı yöntemle kapatılabilir. Bu iş yeni bir
  mekanizma kurmuyor, var olanı görünür ve tek adımda yapılır hale getiriyor.
- **Yanıltan alan.** `GiderForm` kalem düzeyinde tek bir `odemeYontemi` tutuyor ve ekranda beş seçenekli
  bir `Segment` olarak çiziliyor (`GiderForm.jsx:244`, `ODEME_SECENEKLERI`). Kullanıcı bu alanı "bu gider şu
  yöntemle ödendi" diye okuyor; oysa alan ödemeyle hiç bağlı değil, ödeme kaydı kendi yöntemini taşıyor.
  İki gerçek kaynak görüntüsü, kullanıcının "yapılamıyor" sanmasının sebebi.
- **Yanlış olan bugün iki yerde basılıyor (QA turunda bulundu).** Sorun yalnız eksik kırılım değil:
  `gider/DonemRaporu.jsx:251` (kalem satırı) ve `:273` (kalem kartı) kalemin kendi alanını
  `k.odemeYontemi || "Belirtilmemiş"` olarak **ekrana yazıyor**. Yeni kırılım eklenip bu iki satır
  bırakılırsa ekranda iki farklı yöntem yan yana durur ve durum bugünkünden kötüleşir (R4).
- **Varsayılan zaten çalışıyor (doğrulandı).** `OdemeKayitPenceresi.jsx:42` ödeme formunu
  `yontem: kalem.odemeYontemi || ""` ile açıyor, yani AC-7 bugün sağlanıyor. R2'nin iş yükü mekanizma
  değil, etiket, ipucu ve listede gösterilmemesidir.
- **Çek (ciro) yolu zaten kapalı (doğrulandı).** `kasa.odemeDogrula` ilk satırında `ciro` bayrağı olmadan
  "Çek (ciro)" yöntemini reddediyor (0040 R19, AC-37) ve pencerenin yöntem listesinde bu seçenek yok; düz
  "Çek" seçilince kullanıcı Kasa › Çek Portföyü'ne yönlendiriliyor. R7 bu kuralı bozmaz, tekrarlar.
- **Sınır hedef başına (doğrulandı).** `gider.odemeHedefKalaniK(kalem, davranis, taksitId)` taksitli
  kalemde **o taksidin** kalanını döndürüyor, satırsız kalemde `odemeHedefleri`'nin ana ve stopaj
  kalanlarının toplamını. R6'nın üç katmanlı kuralı bu yüzden gerekli.
- **Göç hareketlerinin iki eksiği (doğrulandı).** `electron/kasaGocuSaf.mjs`: taksitsiz ödenmiş kalem →
  `{tutar: null, tamKapatir: true}` (tutar yok), ödenmiş taksit satırı → `{yontem: null}` (yöntem yok).
  Eski verinin bir kısmı tutarsız, bir kısmı yöntemsiz; R11 ikisini de karşılar.
- **Sunucu tarafı değişmez (doğrulandı).** `serverAuth.cjs:434` `hareketIzni` hareketin türüne göre
  `gider_odeme` / `virman` / `avans` veriyor; çok satır N ayrı ekleme demektir ve her biri aynı izinden
  geçer. Yeni bir sunucu kuralı, bölüm eşlemesi ya da izin kimliği gerekmiyor (C5).
- **Tahsilat tarafındaki emsal.** Aylık raporda müşteri tahsilatının yöntem kırılımı zaten var
  (`tahsilatYontemKirilimi`). Gider tarafında karşılığı yok; R10 bu boşluğu aynı desende kapatıyor.
- **0040 ile ilişki.** Çek ciro edildiğinde bir kalemi kapatan ödemelerden biri çek, diğeri nakit
  olabiliyor. İki iş aynı ödeme kaydını paylaşıyor; 0040 çekin kendisini, bu iş ödemenin çok satırlı
  girilmesini getiriyor. **0040 tamamlandı** (commit `740c876`), yani çek hareketi kırılımda ilk günden
  doğru okunur; bu iş ciro için ikinci bir giriş yolu açmaz (R7).
- **Sonraki adım.** Bir kalemin farklı **bölümlerinin** farklı yöntemle ödenmesi (personelin resmi ve
  elden kısmı, kiranın kendisi ve stopajı) bu işin değil, 0042'nin konusudur. Aradaki fark şudur: burada
  para tek bir borcu parça parça kapatıyor, orada borcun kendisi baştan iki ayrı hedef.

---

## Acceptance Criteria

- **AC-1.** Bir gider kalemi, biri nakit biri kredi kartı iki ödemeyle kapatılabilir ve kalan sıfırlanır.
- **AC-2.** Ödeme penceresinde iki satır girilip tek seferde kaydedilebilir; iki ayrı ödeme hareketi doğar.
- **AC-3.** Satır toplamı kalanı aşarsa kayıt yapılmaz; hata **aşan hedefi adıyla** söyler. Üç durum ayrı
  ayrı sınanır: tek satır kendi hedefini aşıyor, aynı hedefe giren iki satırın toplamı o hedefi aşıyor,
  bütün satırların toplamı kalemin kalanını aşıyor.
- **AC-4.** Kalem tek yöntemle ödendiğinde listede o yöntem yazar.
- **AC-5.** Kalem iki yöntemle ödendiğinde listede "Karma" yazar ve kırılım tutarıyla görülür.
- **AC-6.** Kalem ayrıntısında her ödemenin yöntemi ve tutarı okunur.
- **AC-7.** Formdaki yöntem alanı yeni ödeme penceresinde ön seçili gelir (bugünkü davranışın regresyon
  koruması).
- **AC-8.** Formdaki yöntem alanı değiştirilse bile kaydedilmiş ödemelerin yöntemi değişmez.
- **AC-9.** Yöntemi boş girilmiş bir ödeme kırılımda "Belirtilmemiş" olarak görünür.
- **AC-10.** Taksitli kalemde bir pencerede iki farklı taksit için satır girilebilir.
- **AC-11.** Ödeme penceresinde "Çek (ciro)" satırı girilemez; pencere kullanıcıyı Çek Portföyü'ne
  yönlendirir. Ciro edilmiş çekin o kaleme düşen hareketi kırılımda "Çek (ciro)" olarak görünür ve hiçbir
  hesabın bakiyesini değiştirmez.
- **AC-12.** Giderler › Dönem Raporu görünümünde gider ödemelerinin yöntem kırılımı tutar bazında görülür.
- **AC-13.** Borç özeti ve ödeme hatırlatıcısı kalan tutarla aynı sonucu vermeye devam eder.
- **AC-14.** Makina maliyeti ve kârlılık ödeme yönteminden etkilenmez.
- **AC-15.** "Ödendi olarak kaydet" kısayolu tek yöntemle çalışmaya devam eder.
- **AC-16.** Hiç ödemesi olmayan kalemde listede yöntem yazmaz.
- **AC-17.** Kalemin `odemeYontemi` alanı hiçbir listede gösterilmez; `DonemRaporu`'nun kalem satırı ve
  kartı türetilen yöntemi basar.
- **AC-18.** Göçten gelen tutarsız (`tamKapatir`) hareketin kırılımdaki tutarı, o hareketin kapattığı
  tutardır ve kırılım toplamı ödenen tutarla eşittir.
- **AC-19.** Göçten gelen kayıt varsa kırılımın altında yöntem bilgisinin eksik olduğunu söyleyen not
  görünür.
- **AC-20.** Avanstan mahsup kırılımda ayrı bir satır olarak görünür ve "Karma" kararında sayılır.
- **AC-21.** Çok satır yalnız "Ödeme" kipinde açılır; "Avanstan mahsup" kipi tek satırlıdır.
- **AC-22.** Tutarı boş satır sessizce atılır; tutarı sıfır ya da negatif satır hata verir; 10'dan fazla
  satır girilemez.
- **AC-23.** Aynı yöntemin iki satırı kaydedilebilir ve kırılımda tek satırda toplanır.
- **AC-24.** Bir satır geçersizse hiçbir hareket yazılmaz, hatalar satır satır gösterilir ve pencere açık
  kalır.
- **AC-25.** Tarih pencere başınadır, açıklama satır başınadır ve isteğe bağlıdır.
- **AC-26.** Personel kaleminin yöntem kırılımı varsayılan olarak kapalı personel ayrıntısının içindedir.
- **AC-27.** Yöntem kırılımı Aylık Faaliyet Raporu'na ve CSV/XLSX çıktılarına girmez
  (`gider-gizlilik.test.js` deseni).

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Türetilen yöntem (tek / karma) saf motorda hesaplanır ve saklanmaz (C2).
- [ ] Çok satırlı ödeme doğrulaması saf motordadır; pencere yalnız çizer.
- [ ] Hedef başına sınır (R6) saf motorda ve üç katmanı da testli (AC-3); tek satırlı `odemeDogrula`'nın
      bugünkü kuralı gevşetilmedi.
- [ ] Ciro yolu tek kaldı: ödeme penceresinden "Çek (ciro)" girilemiyor ve 0040'ın kuralı bozulmadı
      (AC-11).
- [ ] Göç hareketlerinin tutarı motorun hesabından okunuyor, ikinci bir türetme yazılmadı (AC-18, C9).
- [ ] `DonemRaporu`'nun iki eski satırı (kalem satırı ve kartı) türetilen yönteme geçirildi, eski alan
      hiçbir listede kalmadı (AC-17).
- [ ] Mevcut kayıtların davranışı bozulmadı: tek ödemeli kalemler aynı görünür (AC-4).
- [ ] Görsel kanıt eklendi (`docs/evidence/0041-*.jpg`): çok satırlı ödeme penceresi, karma yöntem rozeti;
      aydınlık ve karanlık tema.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: yöntemin ödemenin alanı olduğu, kalem alanının yalnız varsayılan olduğu,
      kırılımın göç hareketlerini nasıl saydığı ve ciro yolunun tek kaldığı yazıldı.
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
