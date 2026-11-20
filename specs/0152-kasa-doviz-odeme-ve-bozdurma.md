# 0152 — Döviz hesaptan gider ödemesi ve hesaplar arası bozdurma

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-20); uygulandı, commit bekliyor |
| **Revizyon** | 3 (2026-11-20 plan onayı: P1–P11; plan `specs/0152-uygulama-plani.md`) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kasa (hesap listesi, hesap hareketleri, virman ve bozdurma penceresi), gider ödeme penceresi ve gider formunun ödeme bölümü, Anasayfa'nın ödeme penceresi, çöp kutusu, işlem geçmişi, Aylık Gider ve Kasa Raporu |
| **Bağımlı spec'ler** | 0002, 0024, 0041, 0046, 0047, 0051, 0053, 0056, 0073, 0078, 0084, 0151 |
| **QA turu** | 2026-11-20: 25 bulgu (5 Bloklayıcı / 15 Önemli / 5 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 7 (0151 sonrası kayan altı satır atfı ve şemanın `yon` sütunu) |

---

## Intent

Fabrikanın dolar ve euro hesabı var: yurt dışından gelen para oraya giriyor, bazı faturalar oradan
ödeniyor, zaman zaman döviz bozdurulup TL hesaba aktarılıyor. Uygulama bunların ikisini de
yapamıyor. Gider ödemesi yalnız TL hesaptan kabul ediliyor, virman yalnız aynı para birimindeki iki
hesap arasında yapılabiliyor. Sonuç: döviz hesapların bakiyesi gerçeği göstermiyor, dövizle ödenen
faturalar ya hiç kaydedilmiyor ya da olmadık bir TL hesaba yazılıyor; bozdurma ise hiç
girilemediği için TL hesabın bakiyesi de yanlış kalıyor.

Bu iş bittiğinde bir gider dolar ya da euro hesaptan ödenebilecek, o günün kuruyla hesaptan çıkan
döviz ve kalemi kapatan lira birlikte kaydedilecek; döviz bozdurma da iki bacaklı tek bir hareket
olarak girilebilecek. Kasa bakiyeleri, kendi para birimlerinde, gerçeği gösterecek.

---

## Requirements

### A. Döviz hesaptan gider ödemesi

- **R1.** Gider ödemesi, para birimi TL olmayan bir kasa hesabından da yapılabilir.
- **R1/2.** Ödemenin iki girişinde (gider formunun ödeme bölümü ve ödeme penceresi) hesap listesi bütün açık hesapları gösterir; boş liste metni para biriminden söz etmez. **Stopaj dönem ödemesi TL kalır** (vergi dairesine TL ödenir, çok kalemli tek ödemede satır başına kur ayrı bir karmaşadır) ve listesi TL ile süzülmeye devam eder.
- **R1/3.** Döviz alanları yalnız hesaplı ödemede yazılır: hesap boşaltılırsa kur alanı çizilmez ve hesapsız ödeme bugünkü gibi TL'dir.
- **R2.** Böyle bir ödeme iki rakam taşır: kalemi kapatan **TL tutar** ve hesaptan çıkan **döviz
  tutar**. İkisi bir **kur** ile bağlıdır ("1 birim = X TL").
- **R2/2.** Kayıtta `tutar` **TL** kalır (kalemi kapatan rakam); hesaptan çıkan tutar `dovizTutar`, kur `kur`, para birimi `paraBirimi` alanlarında durur. Bakiyenin tek okuyucusu saf bir yardımcıdır: `dovizTutar` varsa onu, yoksa `tutar`ı verir.
- **R2/3.** Kur ve döviz tutar **satırın** alanıdır: tek ödeme girişinde her satırın kendi hesabı olduğu için her satırın kendi kuru olur; doğrulama satır başına çalışır, hedef ve taksit toplamları TL ile denetlenir, ya hep ya hiç kuralı aynen kalır.
- **R3.** Kullanıcı kalemi kapatan TL tutarı ve kuru girer; hesaptan çıkacak döviz tutar hesaplanır
  ve kaydedilmeden önce ekranda gösterilir.
- **R3/2.** Üç alandan ikisi girilir, üçüncüsü türetilir: TL tutar çapadır ve her zaman kullanıcıdan gelir; kur yazılırsa döviz tutar hesaplanır, döviz tutar yazılırsa kur yeniden hesaplanır. Kaydedilen üç rakam ekranda görünenin aynısıdır.
- **R4.** Kur alanı, para biriminin günün kuruyla önerilir; kullanıcı değiştirebilir. Günün kuru
  alınamadıysa alan boş gelir ve kullanıcı kuru kendi yazar.
- **R4/2.** Günün kuru App'ten dört yola iner (Kasa, Giderler'in gider formu ve ödeme penceresi, Anasayfa'nın ödeme penceresi) ve öneri **tek yardımcıdan** okunur; ekranlar kur alanlarını doğrudan okumaz.
- **R4/3.** Önerinin üç "yok" hâli aynı sonucu verir (kur henüz alınmadı, alınamadı, o para biriminin kuru boş): alan boş gelir ve nedeni yazar. Öneri **her zaman bugünün kurudur**, ödemenin tarihi geçmiş olsa da; pencere bunu tek ibareyle söyler.
- **R4/4.** "Hepsini ödendi işaretle" döviz hesapta kuru önerisiyle doldurur ve döviz tutarı hesaplar; öneri yoksa satır kur hatasıyla kalır ve kayıt yapılmaz.
- **R5.** Kur girilmeden döviz hesaptan ödeme kaydedilmez.
- **R5/2.** Kur alanı tutar ayrıştırıcısını kullanmaz: kendi ayrıştırıcısı vardır (virgül ve nokta ondalık, en çok dört ondalık hane); sıfır, negatif ve sayıya çevrilemeyen değer reddedilir.
- **R6.** Gider kaleminin kalanı, ödenen tutar, borç, açık kalemler, hatırlatıcı ve ekstreler
  bugünkü gibi **TL** okur: ödemenin TL tutarı bu hesaplara girer.
- **R7.** Hesabın bakiyesi kendi para biriminde azalır: döviz hesaptan çıkan tutar dövizdir, TL'ye
  çevrilip toplanmaz.
- **R7/2.** Döviz ödeme ve bozdurma hesapsız bırakılamaz: hesap silinirken taşıma yolu onları aynı para birimindeki hedef hesaba taşır, hesapsız bırakma kaydın tarihi ve tutarıyla nedenlenerek engellenir.
- **R7/3.** Hesabın bakiyesinin yetip yetmediği denetlenmez (bugünkü kural): döviz ödeme bakiyeyi eksiye düşürebilir ve kayıt engellenmez.
- **R8.** TL hesaptan yapılan ödeme bugünkü gibi davranır: kur sorulmaz, iki rakam ayrışmaz.
- **R8/2.** Çek yöntemleri döviz hesapta seçilemez: ciro ve kendi çek dağıtımı yalnız TL hesaplarla çalışır ve nedeni satırda yazar (X2'nin ekrandaki karşılığı).

### B. Hesaplar arası bozdurma (döviz virman)

- **R9.** Virman farklı para birimindeki iki açık hesap arasında da yapılabilir.
- **R9/2.** Yeni hareket türü açılmaz: kayıt `virman` kalır, ayrım karşı bacağın tutarının varlığından okunur. Pencerenin adı "Virman / Bozdurma"dır, farklı para birimi seçilince kur bölümü açılır ve listede satır "Bozdurma" ibaresi taşır.
- **R10.** Böyle bir virman iki rakam taşır: çıkan hesaptan düşen tutar ve giren hesaba eklenen
  tutar, her biri kendi hesabının para biriminde; aralarında kur vardır ve kur önerisi A ile aynı
  kaynaktan gelir.
- **R10/2.** Kayıtta `tutar` çıkan bacağın tutarıdır (bugünkü anlamı korunur), `karsiTutar` giren bacağın tutarıdır, `kur` ikisini bağlar; bakiyenin giren kolu `karsiTutar` okur, yoksa `tutar`a düşer. Aynı para birimindeki virmanda `karsiTutar` yazılmaz.
- **R10/3.** Kur "1 çıkan birim = X giren birim"dir. TL bacağı olan bozdurmada öneri günün kurundan gelir (yönüne göre kur ya da tersi); iki dövizli bozdurmada (USD ile EUR arası) öneri yoktur, alan boş gelir ve nedeni yazar. Kur girilmeden kayıt yapılmaz.
- **R11.** Çıkan ve giren tutarın ikisi de kullanıcıya gösterilir; kullanıcı kuru değiştirince
  karşı tutar güncellenir.
- **R12.** Aynı para birimindeki virman bugünkü gibi davranır: tek tutar, kur yok.
- **R13.** Virman gider ya da gelir değildir (0024 kuralı aynen); bozdurmada oluşan kur farkı
  kâr zarara yazılmaz, yalnız iki hesabın bakiyesi değişir.

### C. Ortak

- **R14.** Döviz ödemenin ve bozdurmanın kuru kayıtta saklanır; sonradan kur değişse de geçmiş
  kayıt değişmez.
- **R14/2.** Para birimi değişen düzenlemede döviz alanları yeniden kurulur: TL hesaba taşınan ödemenin döviz alanları silinir, döviz hesaba taşınan ödeme kur ister ve kur girilmeden kaydedilmez. Bozdurmada aynı kural karşı bacağın tutarı için geçerlidir. Alanları yazan tek yol her çağrıda onları siler ve yalnız geçerliyken yazar.
- **R14/3.** Para birimi kayıtta saklanır (yalnız döviz harekette yazılır); ekranlar ve rapor onu okur, hesabı bulunamayan harekette de doğru sembol basılır.
- **R14/4.** İşlem geçmişi ayrıntısına döviz ödemede kur, döviz tutar ve para birimi, bozdurmada karşı bacağın tutarı yazılır; eylem ve kayıt türü adları değişmez.
- **R15.** Hesap hareketleri listesinde ve Aylık Gider ve Kasa Raporu'nda döviz hareketler kendi
  para birimiyle yazılır; TL karşılığı olan ödemede TL tutar da görünür.
- **R15/2.** Çöp kutusu satırının tutarı hareketin kendisinden okunur: döviz ödemede hesaptan çıkan döviz tutar kendi sembolüyle, bozdurmada çıkan bacağın tutarı kendi sembolüyle, öteki hareketlerde bugünkü çıktı birebir.
- **R15/3.** Hareket listesinin Giren ve Çıkan sütunları hesabın para biriminde kalır; TL karşılığı ve kur Açıklama hücresinde tek bir ibare olarak yazar ve metin tek yardımcıdan gelir.
- **R15/4.** Raporda ödemeler tablosunun döviz satırı TL tutarının yanında döviz tutarı ve kuru yazar, virmanlar tablosu iki bacağın tutarını ve para birimini ayrı ayrı yazar; HAREKETLER özeti TL okumaya devam eder.
- **R16.** Var olan kayıtlar olduğu gibi çalışır: bugünkü TL hareketlerde kur sorulmaz, rakamları
  değişmez.

---

## Constraints

### Uyulması zorunlu

- **C1.** Gider tarafı ile kasa tarafı iki ayrı okumadır ve her birinin tek yolu vardır: kalemi
  kapatan TL tutar bir yerden, hesabın bakiyesine giren tutar başka bir yerden okunur. İki yol
  kaynakta karışmaz.
- **C2.** TL kayıtlarda iki okuma birebir aynı sonucu verir; spec öncesi veride bütün çıktılar
  (bakiye, borç, rapor, ekstre) değişmez.
- **C3.** Gider kalemi TL kalır: kaleme para birimi alanı eklenmez, KDV, stopaj, tevkifat ve kova
  hesapları değişmez.
- **C4.** Kuruş hesabı bugünkü kurallarla yapılır (kuruş tamsayısı); çevrim bir kez yuvarlanır ve
  yuvarlama farkı kullanıcıya gösterilen rakamla kaydedilen rakam arasında sessiz bir sapma
  bırakmaz.
- **C4/2.** Çevrim bir kez kuruşa (iki haneye) yuvarlanır ve kaydedilen rakam ekranda gösterilenin aynısıdır; döviz tutar kuruşta sıfıra inerse kayıt reddedilir.
- **C5.** Yeni kalıcı alanlar dört nokta kuralıyla eklenir ve `db-roundtrip` testine girer; yeni
  veri bölümü açılmaz.
- **C5/2.** Yeni alanların boş değeri okumada kayıt gövdesine yazılmaz; döviz hareketi olmayan veride hareket bölümünün gövdesi spec öncesiyle birebir kalır.
- **C6.** Yeni eylem izni açılmaz: döviz ödeme bugünkü ödeme izniyle, bozdurma bugünkü virman
  izniyle yapılır.
- **C6/2.** Avansın TL şartı aynen kalır (X1): ödemenin hesap denetimi kendi dalında yazılır ve iki kural ortak yardımcıda karışmaz.
- **C7.** Çakışma birleştirmesi ve çöp kutusu zinciri bugünkü gibi çalışır (hareket bölümü
  `MERGE_KEYS`'te ve çöp kutusunda).
- **C8.** Göç yoktur: alanı olmayan eski hareket TL kabul edilir.

### KAPSAM DIŞI

- **X1.** Döviz hesaptan çalışan avansı — *neden:* avans bordro tarafıdır ve TL ödeniyor; ayrı iş.
- **X2.** Döviz çek (alınan ya da verilen) — *neden:* çek zaten yalnız TL (0040, 0049) ve ciro
  zinciri TL kalanlar üzerine kurulu.
- **X3.** Kur farkının gelir ya da gider olarak kaydı — *neden:* kur farkı muhasebesi kendi
  başına bir iştir; bu spec bakiyeyi doğru tutar, kâr zarara dokunmaz.
- **X4.** Gider kaleminin dövizle girilmesi (döviz faturalar) — *neden:* kalem TL kalıyor; döviz
  fatura girişi ayrı ve daha büyük bir karar.
- **X5.** Kurun otomatik güncellenmesi ya da geçmiş kurların tablosu — *neden:* kur kayıtta
  donuyor; merkez banka tablosu ayrı iş.
- **X6.** Tahsilatların döviz kuralları — *neden:* tahsilat zaten kendi para biriminde uygun hesaba
  giriyor (0044), değişmiyor.
- **X7.** Çok para birimli toplam ("bütün hesapların TL karşılığı") — *neden:* bugünkü gibi her
  para birimi kendi toplamında kalır.
- **X8.** Tedarikçi ve çalışan ekstresine döviz ibaresi eklenmesi — *neden:* ekstrenin son bakiyesi borç özetiyle birebir tutmak zorunda (0024 B6 çapraz testi), satıra ikinci bir para birimi yazmak o eşitliği okunaksız yapar; ekstre TL kalır (AC-23).

---

## Context

**İki kural kodda açık yazılı (satır atıfları QA turunda düzeltildi).** `src/lib/kasa.js:488` ödeme
doğrulamasında "Gider ödemesi yalnız TL hesaptan yapılır."; `:577` virman doğrulamasında "Farklı para
birimindeki hesaplar arasında virman yapılamaz." Üçüncüsü `:615`, avans yalnız TL hesaptan (bu spec'te
kapsam dışı, X1; ortak yardımcıda durduğu için gevşetilmez, C6/2). Spec taslağı bu üç satırı 0151
uygulanmadan önceki numaralarıyla (`:420`, `:509`, `:547`) yazmıştı.

**Neden bugün yapılamıyor.** Hareket kaydı tek bir tutar taşıyor: `hesap_hareketleri` tablosunda
`tutar REAL` var, kur ve para birimi sütunu yok (`electron/db.cjs:294`; aynı satır 0151 ile `yon TEXT`
kazandı, yani şema bir kez bu kuralla genişledi). Gider kaleminin tutarı
TL'dir; ödemenin kalemi ne kadar kapattığı `gider.odemeleriUygula` ile bu tek tutardan okunuyor.
Aynı tutar `kasa.hesapBakiyeleri`'nde hesabın bakiyesine **hesabın para biriminde** ekleniyor
(`kasa.js:92` ve sonrası; ödeme ve avans kolu `:101-103`). Yani bugün "hesaptan çıkan" ile "kalemden düşen" aynı sayıdır; döviz
hesapta bu iki rakam ayrışır ve kayıtta ikisi de durmalıdır (C1).

**Kalan denetimi TL'dir.** `odemeDogrula` kalanı `odemeHedefKalaniK` ile kuruş olarak buluyor ve
"kalandan fazla ödeme" kuralını orada uyguluyor (`kasa.js:480-483`); çok satırlı ödemede aynı
kural hedef ve taksit düzeyinde tekrarlanıyor (0041, 0053). Döviz ödemede bu denetim ödemenin TL
tutarıyla yapılmalıdır.

**Kur kaynağı var.** App günün kurunu zaten çekiyor: `src/App.jsx:803` `rates` = `{ usd, eur }`,
"1 birim kaç TL" anlamında, alınamazsa `ratesErr`. Satış tarafında aynı kavramın emsali var
(`customers.satisKuru`, spec 0002 R12: "1 birim = X TL", çevrimdışıysa boş ve kayıt engellenmez).
Bu spec aynı dili kullanır; farkı, kur olmadan döviz ödeme kaydedilememesidir (R5), çünkü kur
olmadan kalemin ne kadarının kapandığı bilinemez.

**Virmanın bugünkü şekli.** `virmanDogrula` iki açık hesap, aynı para birimi, tek tutar
(`kasa.js:570-585`); `hesapBakiyeleri` **aynı** tutarı bir hesaptan düşüp ötekine ekliyor
(`kasa.js:104-107`). Döviz bozdurmada iki bacak iki ayrı rakam taşır (R10/2).

**Tek yazma ve tek editör kuralları duruyor.** Bütün ödeme girişleri `formOdemesi.odemeGirisiYaz`
üzerinden yazılıyor (0073 R20) ve her hareket türünü ekleyen pencere aynı zamanda editörüdür
(0073 C1). Döviz alanları bu yolların içine girer, yeni bir yazma yolu açılmaz.

**Karışık sürüm tehlikesi.** Güncellenmemiş bir istemci yeni alanları tanımaz ve kaydı geri
yazarken düşürür; o anda döviz ödeme TL ödemeye dönüşür, kalem yanlış kapanır ve bakiye bozulur.
Bu yüzden sürüm notu "önce sunucu PC, bütün istemciler güncellenene kadar döviz ödeme girilmez"
demelidir (0071 ve 0135'in emsali).

### QA turunda ölçülenler (2026-11-20)

Hepsi bugünkü HEAD'de (spec 0151 uygulanmış hâlde) ölçüldü; kararların dayanağı bunlar.

| | Ölçüm |
|---|---|
| **A** | `src/lib/kasa.js:488` ödemenin "yalnız TL hesaptan" kuralı; `:577` virmanın "aynı para birimi" kuralı; `:615` avansın TL kuralı ortak `hesapHatasi` yardımcısının içinde. |
| **B** | `src/lib/kasa.js:92` `hesapBakiyeleri`; ödeme ve avans kolu `:101-103` tek tutarı hesaptan düşüyor, virman kolu `:104-107` **aynı** tutarı iki hesaba yazıyor. |
| **C** | `src/lib/kasa.js:480-483` kalan denetimi `odemeHedefKalaniK` ile kuruşta; `src/lib/gider.js:1385` `KALEM_KAPATAN_TURLER` kalemi `tutar` üzerinden kapatıyor. |
| **D** | `src/lib/kasa.js:570-585` `virmanDogrula`: iki açık hesap, aynı para birimi, tek tutar, pozitif. |
| **E** | `electron/db.cjs:294` `hesap_hareketleri` sütunları (kur ve para birimi yok, `yon TEXT` 0151 ile geldi); INSERT `:1033`, okuma `:1813` `SELECT *` + `...rest`. |
| **F** | `src/App.jsx:803-817` `rates` = `{ usd, eur }`, "1 birim kaç TL"; başlangıç değeri `null`, hata `ratesErr`, EUR kuru API'den gelmezse `eur` **null** olabilir. |
| **G** | `rates` App'ten yalnız Anasayfa, Müşteriler, Finans, Giderler, Makina Maliyeti ve Ayarlar'a gidiyor; **Kasa'ya hiç gitmiyor**, `ratesErr` yalnız iki yere (Anasayfa, Ayarlar). |
| **H** | `src/components/GiderForm.jsx:94`, `src/components/gider/OdemeKayitPenceresi.jsx:55`, `src/components/gider/StopajDonemleri.jsx:37` hesap listesini `secilebilirHesaplar(hesaplar, "TRY")` ile kuruyor. |
| **I** | `src/components/gider/OdemeGirisi.jsx:179` hesap seçici satır başına; `:185` boş listede "Açık TL hesabı yok." metni; satır şekli hesabı satırın alanı yapıyor. |
| **J** | `src/lib/kasa.js:303` `hesapTasimaPlani`: hedefler aynı para birimi şartıyla süzülüyor, hesapsız bırakma `:325-328` virman, düzeltme ve verilen çek için nedenle engelli. |
| **K** | `src/lib/kasa.js:52` hareketi olan hesabın para birimi değişmiyor, yani hareketin para birimi ömrü boyunca sabit; hesap kalıcı silinirse okunacak bir kaynak kalmıyor. |
| **L** | `src/lib/copKutusu.js:20` `hareketCopEtiketi(h, paraBirimi)` para birimini dışarıdan alıyor (0151 R8/2) ve tutarı `h.tutar`dan basıyor. |
| **M** | `src/lib/giderRaporu.js:244` virmanlar tablosu **tek** `paraBirimi` alanı taşıyor (kaynak hesabın); `:388-390` HAREKETLER özeti tutarları tek toplamda sayıyor. |
| **N** | `src/lib/tutarGirdisi.js:98` belirsiz sayı kuralı: tek noktalı, noktadan sonra üç ya da daha fazla haneli sayı reddedilir, nokta binlik ayracı sayılır. |
| **O** | `src/lib/kasa.js:668` `hareketDuzenlemeDurumu` ödemeyi ve virmanı düzenlenebilir sayıyor; düzenleme o türü ekleyen pencerenin kipidir (0073 C1). |
| **P** | `src/lib/kasa.js:468-495` `odemeDogrula` hesapsız ödemeyi kabul ediyor (`hesapId` null) ve `hesapsizOdemeler` bunları listeliyor. |
| **Q** | `src/lib/kasa.js:644` `sonKullanilanHesap` en son ödemenin açık hesabını veriyor, para birimine bakmıyor; 0053'ün "hepsini ödendi işaretle"si bu hesabı kullanıyor. |
| **R** | `src/lib/odemeYontemi.js:12` ve `:63` kalem hareketlerini `kurus(h.tutar)` ile okuyor; ekstre ve yöntem kırılımı da aynı tutarı okuyor. |

### QA turunda verilen kararlar (2026-11-20)

Yirmi beş bulgu, hepsi Takım Yöneticisi tarafından onaylandı.

**Bloklayıcı**

- **Karar 1 (Bloklayıcı, R2/2, C5/2).** `tutar` TL kalır, hesaptan çıkan tutar `dovizTutar`, kur `kur`, para birimi `paraBirimi` alanlarında durur; bakiyenin tek okuyucusu saf bir yardımcıdır ve boş değerler gövdeye yazılmaz — *neden:* kalanı, borcu, ekstreyi ve yöntem kırılımını besleyen bütün okuyucular `kurus(m.tutar)` çağırıyor (ölçüm C, R), TL'yi başka alana taşımak C2'yi kırar; okuma `SELECT *` + `...rest` olduğu için (ölçüm E) ayıklanmayan sütun her harekete `null` ekler ve AC-24'ün kıyası bozulur.
- **Karar 2 (Bloklayıcı, R10/2).** Bozdurmada `tutar` çıkan bacak, `karsiTutar` giren bacak, `kur` ikisini bağlar; bakiyenin giren kolu `karsiTutar` okur, aynı para biriminde alan yazılmaz — *neden:* motor bugün aynı tutarı iki hesaba yazıyor (ölçüm B); çıkan bacağın anlamını değiştirmek var olan bütün virmanları ve taşıma planının karşı bacak mantığını etkiler.
- **Karar 3 (Bloklayıcı, R1/2).** Ödemenin iki girişi bütün açık hesapları listeler, stopaj dönem ödemesi TL kalır, boş liste metni para biriminden söz etmez — *neden:* liste üç yerde `"TRY"` ile süzülüyor (ölçüm H) ve boş liste metni TL diyor (ölçüm I), yani AC-1 bugünkü kodla sağlanamaz; stopajı dışarıda tutmak 0084'ün çok kalemli dağıtım çekirdeğini dokunulmadan bırakır.
- **Karar 4 (Bloklayıcı, R4/2).** Günün kuru dört yola iner ve öneri tek yardımcıdan okunur — *neden:* `rates` Kasa'ya hiç gitmiyor, `ratesErr` yalnız iki yerde (ölçüm G), yani AC-2, AC-3 ve AC-16 bugünkü prop zinciriyle imkânsız; üç ekranda üç kopya öneri mantığı metinleri ayrıştırır (0132'nin tek `kurOnerisi` dersi).
- **Karar 5 (Bloklayıcı, R2/3).** Kur ve döviz tutar satırın alanıdır — *neden:* hesap satırın alanı (ölçüm I), bir girişte bir satır TL bir satır döviz olabilir; form düzeyinde tek kur, farklı hesaplara giden satırlarda sessizce yanlış döviz tutar üretir.

**Önemli**

- **Karar 6 (Önemli, R3/2).** Üç alandan ikisi girilir, üçüncüsü türetilir; TL tutar çapadır — *neden:* C4 "gösterilen ile kaydedilen arasında sessiz sapma olmaz" diyor, tek yönlü bağ bunu yalnız kuru sonsuz ondalıkla girerek sağlar; banka ekstresi döviz rakamını gösterir, TL'nin çapa kalması da kalan denetimini bozmaz.
- **Karar 7 (Önemli, R10/3).** Kur "1 çıkan birim = X giren birim"dir; iki dövizli bozdurmada öneri yok, alan boş ve nedenli — *neden:* "1 birim = X TL" tanımı USD ile EUR arasındaki bozdurmada anlamsız; yanlış öneri doldurmak, öneri yokluğunu söylemekten kötüdür.
- **Karar 8 (Önemli, R5/2).** Kur alanının kendi ayrıştırıcısı olur (virgül ve nokta ondalık, en çok dört hane) — *neden:* tutar ayrıştırıcısı noktayı binlik sayıyor ve üç haneli ondalığı belirsiz diye reddediyor (ölçüm N), yani "35.5" sessizce 355 okunur; 0134'ün kit adedi emsali aynı yoldan çözdü.
- **Karar 9 (Önemli, C4/2).** Çevrim bir kez kuruşa yuvarlanır ve kuruşta sıfıra inen döviz tutar reddedilir — *neden:* 0,01 TL ile yüksek kur sıfır tutarlı bir hareket doğurur ve bakiyeyi hiç değiştirmeyen satır listede kalır (0151 Karar 14'ün gerekçesi).
- **Karar 10 (Önemli, R1/3).** Döviz alanları yalnız hesaplı ödemede yazılır — *neden:* hesapsız ödemenin para birimi yok ve hesapsız listesi tutarı ₺ ile basıyor (ölçüm P), hesapsız bir döviz ödeme kullanıcıya yanlış rakam okutur.
- **Karar 11 (Önemli, R7/2).** Döviz ödeme ve bozdurma hesapsız bırakılamaz, taşıma aynı para birimindeki hesaba olur — *neden:* taşıma planı hesap alanını `null` yapabiliyor (ölçüm J); hesapsız kalan döviz ödeme bakiyeye hiç girmez ve TL'ymiş gibi görünür (0151 Karar 5 emsali).
- **Karar 12 (Önemli, R14/2).** Para birimi değişen düzenlemede alanlar yeniden kurulur; tek yazıcı her çağrıda alanları siler ve yalnız geçerliyken yazar — *neden:* düzenleme aynı pencerenin kipi (ölçüm O) ve kullanıcı hesabı TL ile döviz arasında taşıyabilir; 0095 ve 0114'ün dersi, `{ ...eski, ...yeni }` birleştirmesinin eski değeri taşıdığıdır.
- **Karar 13 (Önemli, R14/3).** Para birimi kayıtta saklanır — *neden:* hesabın para birimi hareket varken değişmiyor (ölçüm K) ama hesap kalıcı silinince okunacak kaynak kalmıyor; çöp satırı, rapor ve "hesabı silinmiş" satırları hesap nesnesine ulaşmadan metin basıyor.
- **Karar 14 (Önemli, R15/2).** Çöp satırının tutarı hareketin kendisinden okunur — *neden:* etiket bugün para birimini dışarıdan alıyor ve tutarı `h.tutar`dan basıyor (ölçüm L), yani döviz ödemede TL rakamını döviz sembolüyle yazar.
- **Karar 15 (Önemli, R15/3).** Giren ve Çıkan sütunları hesabın para biriminde kalır, TL karşılığı ve kur Açıklama hücresinde tek ibare olur — *neden:* ızgaraya yeni sütun eklemek bütün satır türlerini (tahsilat, çek, düzeltme) genişletir ve asgari genişliği büyütür; açıklama hücresi bugün de hareket başına serbest metin taşıyor.
- **Karar 16 (Önemli, R15/4).** Ödemeler tablosu döviz satırında döviz tutarı ve kuru da yazar, virmanlar tablosu iki bacağı ayrı yazar, HAREKETLER özeti TL kalır — *neden:* virman tablosunun tek para birimi alanı bozdurmada giren bacağı yanlış gösterir (ölçüm M); gider toplamlarının TL kalması C3'ün gereği, özetin tek toplamı ise 0151 X8'in bilinen sınırıyla aynı.
- **Karar 17 (Önemli, R7/3).** Bakiye yetersizliği denetlenmez — *neden:* bakiye türetilmiş bir rakam ve eksik girilmiş geçmiş yüzünden sıklıkla düşük; engellemek doğru kaydı imkânsız kılar.
- **Karar 18 (Önemli, R4/3).** Önerinin üç "yok" hâli aynı sonucu verir ve öneri her zaman bugünün kurudur — *neden:* kur `null` başlıyor, hata ayrı bayrakta ve EUR kuru gelmeyebilir (ölçüm F), üçünü ayrı metinle ele almak gereksiz ama hiçbirini ele almamak alanı sessiz bırakır; geçmiş kur tablosu kapsam dışı (X5), bu yüzden tarih ile kur ilişkisi ekranda yazılı olmalı.
- **Karar 19 (Önemli, R4/4).** "Hepsini ödendi işaretle" döviz hesapta kuru öneriyle doldurur, öneri yoksa satır kur hatasıyla kalır — *neden:* ön seçilen hesap para birimine bakmıyor (ölçüm Q); sessizce TL'ye düşmek yanlış hesabı borçlandırır.
- **Karar 20 (Önemli, R8/2).** Çek yöntemleri döviz hesapta seçilemez, ciro ve kendi çek yalnız TL hesaplarla çalışır — *neden:* X2 döviz çeki kapsam dışı bırakıyor ama ekranda aynı satır çek yollarını taşıyor; yazılmazsa çek dağıtımı döviz hesaba TL tutar yazar.

**Küçük**

- **Karar 21 (Küçük, C6/2).** Avansın TL şartı aynen kalır, ödemenin hesap denetimi kendi dalında yazılır — *neden:* iki kural ortak `hesapHatasi` yardımcısında duruyor (ölçüm A); yardımcıyı gevşetmek X1'i sessizce açar.
- **Karar 22 (Küçük, R9/2).** Yeni hareket türü açılmaz, pencerenin adı "Virman / Bozdurma" olur — *neden:* yeni tür bütün tür eşlemelerini (izin, Kasa sekmesi şartı, çöp etiketi, rapor) ikinci kez açar; ayrım karşı bacağın tutarının varlığından okunabiliyor.
- **Karar 23 (Küçük, X8).** Ekstre TL kalır, döviz ibaresi eklenmez — *neden:* ekstrenin son bakiyesi borç özetiyle birebir tutmak zorunda (0024 B6 çapraz testi).
- **Karar 24 (Küçük, R14/4).** İz ayrıntısına kur, döviz tutar ve para birimi (bozdurmada karşı bacak) yazılır — *neden:* izin amacı sonradan ne yazıldığını görmek; TL tutarı tek başına döviz hareketi açıklamaz.
- **Karar 25 (Küçük, başlık).** Bağımlı spec listesine 0002, 0046, 0047, 0078 ve 0084 eklenir — *neden:* Karar 3, 14, 16 ve 21 doğrudan bu spec'lerin kurallarından doğdu ve kur kavramının emsali 0002'dedir.

### QA turu karar kaydı (2026-11-20)

| # | Karar | Derece | İşlendiği yer |
|---|---|---|---|
| 1 | Ödeme kaydı: TL `tutar`, döviz tutar, kur, para birimi; gövde korunur | Bloklayıcı | R2/2, C5/2, AC-25, AC-26, AC-29 |
| 2 | Bozdurma kaydı: çıkan ve giren bacak ayrı | Bloklayıcı | R10/2, AC-27, AC-28 |
| 3 | Hesap listeleri genişler, stopaj TL kalır | Bloklayıcı | R1/2, AC-30, AC-31 |
| 4 | Kur zinciri dört yola iner, öneri tek yardımcı | Bloklayıcı | R4/2, AC-32 |
| 5 | Kur ve döviz tutar satırın alanı | Bloklayıcı | R2/3, AC-33 |
| 6 | Üçüncü değer türetilir, TL çapa | Önemli | R3/2, AC-34 |
| 7 | Kur "1 çıkan birim = X giren birim"; iki dövizli bozdurma | Önemli | R10/3, AC-35, AC-36 |
| 8 | Kur alanının kendi ayrıştırıcısı | Önemli | R5/2, AC-37 |
| 9 | Yuvarlama bir kez, sıfıra inen döviz tutar reddi | Önemli | C4/2, AC-38 |
| 10 | Hesapsız ödemede döviz alanı yok | Önemli | R1/3, AC-39 |
| 11 | Hesapsız bırakılamaz, taşıma para birimiyle | Önemli | R7/2, AC-40 |
| 12 | Düzenlemede para birimi değişimi | Önemli | R14/2, AC-41 |
| 13 | Para birimi kayıtta saklanır | Önemli | R14/3, AC-42 |
| 14 | Çöp satırı hareketten okur | Önemli | R15/2, AC-48 |
| 15 | TL karşılığı Açıklama hücresinde | Önemli | R15/3, AC-49 |
| 16 | Rapor: iki tablo ve TL özeti | Önemli | R15/4, AC-50 |
| 17 | Bakiye yetersizliği denetlenmez | Önemli | R7/3, AC-43 |
| 18 | Önerinin üç "yok" hâli ve bugünün kuru | Önemli | R4/3, AC-44 |
| 19 | Toplu işaretlemede kur | Önemli | R4/4, AC-45 |
| 20 | Çek yolları TL kalır | Önemli | R8/2, AC-46 |
| 21 | Avansın TL şartı korunur | Küçük | C6/2, AC-47 |
| 22 | Yeni tür yok, ad "Virman / Bozdurma" | Küçük | R9/2, AC-51 |
| 23 | Ekstre TL kalır | Küçük | X8, AC-23 |
| 24 | İz ayrıntısı | Küçük | R14/4, AC-52 |
| 25 | Bağımlı spec listesi tamamlandı | Küçük | Başlık tablosu |

### Plan turunda verilen kararlar (2026-11-20)

Takım Yöneticisi planın bütün önerilerini onayladı.

- **P1 (ölçüm Q düzeltmesi, Karar 19).** Ölçüm Q yanlıştır: `sonKullanilanHesap` bugün de yalnız açık TL hesabı döndürür (`kasa.js:644`, `x.paraBirimi === "TRY"`). Bu şart kalır; ön seçim TL hesaptır. "Hepsini ödendi işaretle" kuru, yalnız kullanıcının döviz hesabını önceden seçtiği satırda öneriyle doldurur (R4/4, AC-45) — *neden:* dövizle bir kez ödeme yapan kullanıcıya bütün TL faturalarda döviz hesap ve kur gelirdi; C2.
- **P2 (R3/2, C4/2).** Kayıtta TL tutar ile döviz tutar asıl değerlerdir ve hiçbir yerde yeniden hesaplanmaz; kur bilgi alanıdır. Döviz tutardan türetilen kur altı ondalığa yuvarlanıp öyle saklanır ve gösterilir; "döviz × kur = TL" eşitliği kuruşta aranmaz.
- **P3 (R5/2 eki, R10/3).** Dört ondalık sınırı yalnız kullanıcının elle yazdığı kura uygulanır; öneriden gelen ve türetilen kur altı ondalık taşır (TL'den dövize bozdurmada önerilen kur 1/günün kuru, ör. 0,028169; dört ondalık yaklaşık %0,2 hata üretirdi).
- **P4 (R14/3 eki, beşinci alan).** Bozdurmada `paraBirimi` çıkan bacağın, ek alan `karsiParaBirimi` giren bacağın para birimidir; hesabı kalıcı silinmiş bozdurma iki sembolü de kayıttan okur (Karar 13'ün gerekçesi).
- **P5 (R1/2, C6/2).** Stopaj dönem ödemesinin ve çek dağıtımının TL şartı motorda da yazılır: çok kalemli dağıtım çekirdeği yalnız TL hesabı kabul eder (liste süzgecine ek).
- **P6 (Karar 16).** HAREKETLER özetinin virman satırı bugünkü gibi çıkan bacakların tutarını tek toplamda sayar; bilinen sınır.
- **P7 (R14/3).** Hareketin para birimi okuma sırası: kayıttaki `paraBirimi`, yoksa hesabın para birimi, yoksa TL.
- **P8 (R4/2).** Kasa'dan açılan ödeme düzenleme penceresi de günün kurunu alır (dört yoldan biri).
- **P9 (R4/3).** Önerinin neden metinleri 0132'nin iki metnidir ("henüz alınmadı", "çevrimdışı"); para biriminin kuru boşsa "henüz alınmadı".
- **P10.** Sürüm notu: önce sunucu PC, bütün istemciler güncellenene kadar döviz ödeme ve bozdurma girilmez; kodda ek koruma yok.
- **P11 (kanıt).** Kanıt eşlemesinde değişen ekranlar "değişti" + Takım Yöneticisi onayıyla, kapanışta "aynı".

---

## Acceptance Criteria

- **AC-1.** Para birimi USD olan açık bir hesap, gider ödeme penceresindeki hesap listesinde
  görünür.
- **AC-2.** Döviz hesap seçilince kur alanı çıkar ve günün kuruyla dolu gelir.
- **AC-3.** Günün kuru alınamadığında kur alanı boş gelir ve nedeni yazar.
- **AC-4.** Kur boş bırakılırsa ödeme kaydedilmez ve nedeni alanın altında yazar.
- **AC-5.** Kur sıfır, negatif ya da sayıya çevrilemez bir metinse ödeme kaydedilmez.
- **AC-6.** TL tutar ve kur girilince hesaptan çıkacak döviz tutar kaydetmeden önce ekranda
  gösterilir.
- **AC-7.** Kaydedilen ödeme, gider kaleminin kalanını girilen TL tutar kadar azaltır.
- **AC-8.** Aynı ödeme, döviz hesabın bakiyesini hesaptan çıkan döviz tutar kadar azaltır.
- **AC-9.** Aynı ödeme hiçbir TL hesabın bakiyesini değiştirmez.
- **AC-10.** Kalandan fazla TL tutar girilirse ödeme kaydedilmez (bugünkü kural TL üzerinden).
- **AC-11.** TL hesaptan yapılan ödemede kur alanı çıkmaz ve kayıt spec öncesiyle birebir aynıdır.
- **AC-12.** Döviz ödeme silinince kalem ve hesap bakiyesi ödemeden önceki hâline döner.
- **AC-13.** Döviz ödemenin kuru sonradan değişen piyasa kurundan etkilenmez (kayıtlı kur okunur).
- **AC-14.** Farklı para birimindeki iki açık hesap arasında virman kaydedilebilir.
- **AC-15.** Bozdurmada çıkan hesap kendi para biriminde azalır, giren hesap kendi para biriminde
  artar.
- **AC-16.** Bozdurmanın iki tutarı da kaydetmeden önce ekranda görünür ve kur değişince karşı
  tutar güncellenir.
- **AC-17.** Aynı para birimindeki virman bugünkü gibi tek tutarla çalışır.
- **AC-18.** Bozdurma hiçbir gider kalemini kapatmaz, gider ve gelir toplamlarına girmez.
- **AC-19.** Bozdurma silinince iki hesabın bakiyesi de eski hâline döner.
- **AC-20.** Kapalı hesaba döviz ödeme ya da bozdurma kaydedilemez.
- **AC-21.** Hesap hareketleri listesinde döviz hareket kendi para birimiyle yazılır; döviz ödemede
  TL karşılığı da görünür.
- **AC-22.** Aylık Gider ve Kasa Raporu'nda döviz ödeme ve bozdurma kendi para birimiyle basılır;
  gider toplamları TL kalır.
- **AC-23.** Tedarikçi ekstresinde döviz ödeme satırı TL tutarıyla girer ve son bakiye borç
  özetiyle tutmaya devam eder.
- **AC-24.** Döviz hareketi olmayan veride bakiye, borç özeti, açık kalemler, ekstre ve rapor spec
  öncesiyle birebir aynıdır (kıyas).

### QA turu kriterleri (2026-11-20)

**Kayıt şekli ve iki okuma**

- **AC-25.** Döviz ödeme kaydı TL `tutar`, hesaptan çıkan döviz tutar, kur ve para birimi alanlarını taşır; bakiyeyi okuyan tek yardımcı dışında kaynakta ikinci bir "hesaptan çıkan" hesabı yoktur (tarama).
- **AC-26.** Döviz hareketi olmayan veride hareket bölümünün kayıt gövdesi spec öncesiyle birebir aynıdır (yeni alanlar boşken gövdeye yazılmaz).
- **AC-27.** Bozdurma kaydı çıkan bacağın tutarını, giren bacağın tutarını ve kuru taşır; aynı para birimindeki virmanda karşı bacak alanı hiç yazılmaz.
- **AC-28.** Bozdurmada çıkan hesabın bakiyesi çıkan tutar kadar, giren hesabın bakiyesi giren tutar kadar değişir (iki rakam birbirine karışmaz).
- **AC-29.** Döviz ödemenin TL tutarı kalemin kalanını, döviz tutarı hesabın bakiyesini besler; iki okuma kaynakta ayrı yollardan geçer (tarama).

**Ekran, kur ve sınırlar**

- **AC-30.** Gider formunun ödeme bölümünde ve ödeme penceresinde USD hesap listede görünür.
- **AC-31.** Stopaj dönem ödemesinin hesap listesi yalnız açık TL hesapları gösterir ve kur alanı çizilmez.
- **AC-32.** Kur önerisi Kasa, gider formu, ödeme penceresi ve Anasayfa'nın ödeme penceresinde aynı yardımcıdan gelir; ekranlar kur alanlarını doğrudan okumaz (tarama).
- **AC-33.** Bir ödeme girişinde bir satır TL hesaba, bir satır döviz hesaba yazılabilir; yalnız döviz satırı kur ister ve hedef toplamı TL ile denetlenir.
- **AC-34.** Kur yazılınca döviz tutar, döviz tutar yazılınca kur güncellenir; kaydedilen üç rakam ekranda görünenle aynıdır.
- **AC-35.** TL ile döviz arasındaki bozdurmada kur önerisi yöne göre dolu gelir ve iki tutar da ekranda görünür.
- **AC-36.** USD ile EUR arasındaki bozdurmada kur alanı boş gelir, nedeni yazar ve kur girilmeden kayıt yapılmaz.
- **AC-37.** Kur alanına "35.5" yazılınca değer 35,5 okunur; dörtten fazla ondalık, sıfır, negatif ve sayıya çevrilemeyen değer reddedilir.
- **AC-38.** Kuruşta sıfıra inen döviz tutar reddedilir ve nedeni yazar.
- **AC-39.** Hesap boşaltılırsa kur alanı çizilmez ve kaydedilen hesapsız ödemede döviz alanları yoktur.
- **AC-40.** Hesap silme penceresi döviz ödeme ve bozdurma varken hesapsız bırakmayı nedenle engeller; taşıma yalnız aynı para birimindeki hesabı hedef gösterir.
- **AC-41.** Döviz ödemenin hesabı TL hesaba çevrilince döviz alanları silinir; TL ödemenin hesabı döviz hesaba çevrilince kur istenir ve kur girilmeden kaydedilmez.
- **AC-42.** Hesabı kalıcı silinmiş bir döviz ödeme listelerde ve raporda kendi para biriminin sembolüyle görünür.
- **AC-43.** Hesabın bakiyesi yetmese de döviz ödeme kaydedilir (bakiye eksiye düşebilir).
- **AC-44.** Kur henüz alınmamışsa, alınamadıysa ya da o para biriminin kuru boşsa alan boş gelir ve aynı neden yazar; ödemenin tarihi geçmiş olsa da öneri bugünün kurudur ve bunu ekranda tek ibare söyler.
- **AC-45.** "Hepsini ödendi işaretle" döviz hesapta kuru öneriyle doldurur; öneri yoksa satır kur hatasıyla kalır ve kayıt yapılmaz.
- **AC-46.** Döviz hesap seçili satırda çek yöntemleri seçilemez; ciro ve kendi çek dağıtımı yalnız TL hesaplarla çalışır.
- **AC-47.** Avans hâlâ yalnız TL hesaptan verilir; döviz hesap seçilince nedeni yazar.

**Metin, çöp kutusu, rapor ve iz**

- **AC-48.** Çöp kutusunda döviz ödeme hesaptan çıkan döviz tutarla, bozdurma çıkan bacağın tutarıyla ve kendi sembolüyle görünür; öteki hareketlerin satırı spec öncesiyle aynıdır.
- **AC-49.** Hareket listesinde döviz ödemenin Çıkan hücresi hesabın para biriminde, Açıklama hücresi tek ibarede döviz tutar, kur ve TL karşılığını yazar.
- **AC-50.** Raporda döviz ödeme satırı TL tutarının yanında döviz tutar ve kuru yazar, bozdurma satırı iki bacağı para birimleriyle yazar, gider toplamları TL kalır.
- **AC-51.** Pencerenin adı "Virman / Bozdurma"dır, kayıt türü `virman` kalır ve farklı para birimi seçilince kur bölümü açılır.
- **AC-52.** İşlem geçmişi ayrıntısında döviz ödemenin kuru, döviz tutarı ve para birimi, bozdurmanın karşı bacağı görünür.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Çevrim ve iki okuma yolu React'sız saf motorda; ekranlar çarpım ve bölme yazmıyor
      (kaynak taraması).
- [ ] Aynı sayıyı üreten iki taraf (kalemin kalanı ve hesabın bakiyesi) ayrı ve tek kaynaklı;
      TL kayıtlarda ikisi aynı sonucu veriyor (C2 kıyası).
- [ ] Yeni kalıcı alanlar dört nokta kuralıyla eklendi ve `db-roundtrip` testine girdi.
- [ ] Yeni veri bölümü yok; birleştirme, yedek ve çöp kutusu zinciri döviz alanlarını taşıyor.
- [ ] Yeni eylem izni eklenmedi; sunucu kuralının değişmediği taramayla gösterildi.
- [ ] Yeni hareket türü açılmadı; bozdurma `virman` türüyle kaydedildi (tarama).
- [ ] Kur önerisi tek yardımcıdan okunuyor ve dört ekrana indi; ekranlarda kur alanı doğrudan okunmuyor (tarama).
- [ ] Kur alanının kendi ayrıştırıcısı var; tutar ayrıştırıcısı kur için kullanılmıyor (tarama).
- [ ] Döviz alanlarını yazan tek yol var ve her çağrıda alanları siliyor (tarama).
- [ ] Yeni alanların boş değeri gövdeye yazılmıyor; döviz hareketi olmayan veride kayıt gövdesi birebir (kıyas altını).
- [ ] Hesap silme ve taşıma zinciri döviz hareketi hesapsız bırakmıyor.
- [ ] Çöp kutusu etiketi, hareket listesi ve rapor para birimini hareketten okuyor.
- [ ] Stopaj dönem ödemesinin TL kaldığı ve avansın TL şartının korunduğu testle gösterildi.
- [ ] Kullanıcıya görünen metinler Türkçe; çoklu para kuralına uyuluyor ve tanınmayan para birimi
      tanımlı biçimde ele alınıyor.
- [ ] Sürüm notu yazıldı (önce sunucu PC; güncelleme bitene kadar döviz ödeme girilmez).
- [ ] Görsel kanıt eklendi: döviz ödeme penceresi, bozdurma penceresi, döviz hareketli hesap
      listesi, rapor çıktısı.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin Kasa ve ödeme bölümleri güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
