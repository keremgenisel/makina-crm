# 0153 — Gider kalemi döviz cinsinden girilir ve dövizle ödenir

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-21) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Revizyon** | 3 (2026-11-21 plan onayı: P1–P12; plan `specs/done/0153-uygulama-plani.md`) |
| **Etkilenen alanlar** | Giderler (gider formu, Dönem Raporu, kalem listesi, ödeme girişi, borç özeti, açık kalemler), Anasayfa ödeme hatırlatıcısı, saf motorlar `gider.js` / `kasa.js` / `doviz.js` / `cek.js` / `acikKalemler.js` / `odemeHatirlatma.js` / `aramaGider.js`, yeni yaprak kur modülü, Kasa hareket listesi ve hesapsız liste, işlem geçmişi, Aylık Gider ve Kasa Raporu, `giderler` tablosu |
| **Bağımlı spec'ler** | 0152 (döviz ödeme ve bozdurma), 0071 (KDV dâhil giriş), 0024 (ödeme bir harekettir), 0021 (taksit), 0076 (kısıtlı gider), 0075 (tevkifat), 0026 (genel arama), 0040 ve 0049 (çek ve ciro), 0041 (çoklu ödeme), 0047 (aylık rapor), 0048 (düzenleme formunda canlı ödeme kutusu), 0053 (tek ödeme editörü), 0054 (ödeme hedefleri), 0084 (stopaj dönem ödemesi) |
| **QA turu** | 2026-11-21: 26 bulgu (6 Bloklayıcı / 14 Önemli / 6 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 6 (dört satır atfı, `giderler` sütun sayısı, sunucu alan denetiminin gerekçesi ve kur önerisinin tarihi) |

---

## Intent

Fabrika bazı faturaları doğrudan euro ya da dolar olarak alıyor: ithal malzeme, yurt dışı yazılım ve nakliye faturaları liranın hiç geçmediği belgeler. Bugün gider kalemi lira cinsinden tek bir tutar alıyor, bu yüzden muhasebe faturayı kaydetmeden önce kendi hesap makinesinde liraya çeviriyor; çevirdiği rakam kayıtta görünüyor, faturanın kendi rakamı ve o gün kullandığı kur hiçbir yerde durmuyor. Sonuç: aynı faturaya iki kişi bakınca iki farklı lira rakamı çıkıyor, "bu fatura ödendi mi" sorusu euro cinsinden cevaplanamıyor ve tedarikçiye "1.200 euro borcumuz var" diyebilmek için kayıt dışına bakmak gerekiyor.

Bu iş bittiğinde kullanıcı yeni gider kaydederken tutarın yanından para birimini seçecek, o günün kurunu program önerecek, faturanın kendi rakamı ve kuru kayıtta duracak; ödeme girilirken program "kalan 1.200 EUR" diyecek ve kullanıcı doğrudan euro tutarını yazıp euro hesabından ödeyecek. Fatura euro cinsinden tam ödenince kalem kapanacak, kur o arada değişse de kapanma bozulmayacak. Liranın görünmesi gereken her yerde (KDV beyanı, dönem toplamı, makina maliyeti) fatura günü kuruyla donmuş lira karşılığı görünecek ve bu rakam bir daha değişmeyecek.

---

## Requirements

### A. Kalem döviz cinsinden girilir

- **R1.** Normal davranışlı gider kaleminin tutar alanının yanında para birimi seçilir: TL, USD, EUR. Varsayılan TL'dir ve TL seçiliyken gider formu bugünküyle birebir aynı davranır.
- **R1/2.** **Kaydın şekli:** `tutar` TL kalır ve kalemin **donmuş lira karşılığıdır** (motorun tek hesap tabanı, C1); kalemin kendi rakamı `dovizTutar` (KDV hariç), kuru `kur` ("1 birim = X TL"), para birimi `paraBirimi` alanlarında durur. Üç alanın adı 0152'nin hareket alanlarıyla birebir aynıdır. TL kalemde üçü de hiç yazılmaz.
- **R1/3.** Döviz alanlarının **tek yazıcısı** vardır: doğrulayıcı üç alanı her çağrıda siler ve yalnız döviz kipinde geçerli değerle yazar (0075 tevkifat ve 0076 kısıt alanlarının deseni). Formun tutar alanı kullanıcının yazdığı rakamı taşır; doğrulayıcı KDV hariç dövizi `dovizTutar`'a, lira karşılığını `tutar`'a yazar.
- **R2.** Döviz seçilince kur istenir ("1 USD = ? TL"). Kur girilmeden döviz kalem kaydedilmez; nedeni kur alanında yazar.
- **R2/2.** Elle yazılan kur en çok dört ondalık taşır ve sıfırdan büyüktür (0152'nin kur ayrıştırıcısıyla aynı kural). Üst sınır konmaz; günün kurundan yüzde elliden fazla sapan kur engellemeyen uyarı doğurur.
- **R2/3.** Döviz kipinde sıfır ve boş döviz tutar reddedilir. 0071'in "tekrarlayan tanımdan üretilmiş kalemde sıfır tutar serbest" kuralı yalnız TL kalemde geçerlidir; döviz tanım kapsam dışı olduğu için (X3) bu kapı döviz kalemde hiç açılmaz.
- **R3.** Kur, günün kuruyla önerilir ve elle değiştirilebilir. Önerinin bugünün kuru olduğu, kalem başka bir güne aitse o günün kurunun yazılması gerektiği ekranda yazar. Kur alınamadıysa (çevrimdışı ya da henüz gelmediyse) nedeni yazar ve kayıt engellenmez.
- **R3/2.** Öneri **bugünün** kurudur; uygulama geçmiş kur saklamaz (X10). Kalem başka bir güne aitse o günün kuru elle yazılır ve ibare tek sabitten gelir (0152'nin `ONERI_BUGUN_IBARESI`'si). Kalemin tarihi değişince öneri yeniden hesaplanmaz.
- **R4.** Kalemin lira karşılığı, girilen döviz tutar ile kurun çarpımıdır ve bu rakam kalemin bütün lira hesaplarının tabanıdır: KDV, stopaj, tevkifat, gider kısıtlaması, ödenecek tutar, dönem toplamı, tür ve tedarikçi kırılımı, kova ve genel gider havuzu.
- **R4/2.** Lira karşılığı tek yerde ve bir kez kuruşa yuvarlanarak hesaplanır (döviz kuruşu × kur, kuruşa yuvarlanır); ikinci bir çarpım kaynakta yazılmaz (0152 C4/2 ile aynı kural).
- **R5.** Kur kayıtta donar. Kur sonradan değişse de kaydedilmiş kalemin lira karşılığı, KDV'si ve raporlardaki yeri değişmez.
- **R6.** "KDV dâhil" girişi döviz tutarın üzerinde çalışır: girilen dâhil döviz tutardan KDV ayrılır, kalan hariç döviz tutar liraya çevrilir.
- **R6/2.** Ayırma sırası: KDV **döviz tutarın** üzerinde ayrılır, KDV hariç döviz tutar liraya çevrilir, kalemin KDV'si motorun bugünkü yoluyla **lira tabandan** hesaplanır. Döviz KDV hiçbir yerde saklanmaz (0071 C1: ekranda gösterilen KDV motorun kaydedeceğinin aynısıdır). Formdaki yuvarlama farkı satırı kalemin para biriminde yazar.
- **R7.** Kalemin para birimi ve kuru yalnız hiç ödeme almamış kalemde değiştirilebilir. Ödeme almış kalemde ikisi de kilitlidir ve nedeni ekranda yazar.
- **R7/2.** "Ödeme almış kalem" ölçütü tektir: zenginleştirilmiş kalemde kapanan tutar sıfırdan büyükse (kaleme bağlı canlı ödeme ya da mahsup hareketi varsa) kilit iner. Çöpteki hareket sayılmaz; bütün ödemeleri silinen kalemde para birimi ve kur yeniden açılır.
- **R8.** Döviz kalemin tutarı kendi para biriminde yazılır (gider formu, kalem listesi, açık kalemler, borç özeti, ödeme penceresi, hatırlatıcı, Kasa hareket listesi). Kalem listesinde lira karşılığı da aynı satırda görünür.
- **R8/2.** Kalem listesinin tutar hücresi kalemin para birimindeki tutarı önde, lira karşılığını altında soluk yazar (0076'nın "ikinci rakam" deseni); sütun başlığı ve alt toplam değişmez, alt toplam lira kalır.
- **R9.** Dönem toplamları, kartlar, tür kırılımı, tedarikçi harcaması, KDV karşılaştırması, kova, genel gider havuzu, makina maliyeti ve yazdırılan rapor lira karşılığıyla toplanır. Para birimleri toplanmaz, tek para birimli rapor korunur.
- **R9/2.** Yazdırılan raporun kalem satırı tutar hücresinde döviz tutarı, kuru ve lira karşılığını **tek hücrede** taşır; yeni sütun açılmaz, bölüm toplamları ve özet kutuları lira kalır. Para ve kur metni 0152'nin sabitlerinden gelir.
- **R10.** Kira, personel ve SGK davranışlı kalemlerde para birimi seçici çizilmez; bu kalemler lira kalır.
- **R11.** Tekrarlayan tanımdan üretilen kalem lira kalır; tanım formunda para birimi seçici çizilmez.
- **R12.** Döviz kalem genel aramada kendi para birimiyle görünür; tutar eşitliği araması kalemin lira karşılığını değil kendi döviz tutarını da bulur.
- **R12/2.** Genel aramanın sayısal dalında kalemin döviz tutarı aday listesine eklenir; lira karşılığı aramayı bulmaya devam eder (eski davranış korunur). Neden satırı ve kalem satırının metni kalemin para birimiyle yazılır.

### B. Ödeme doğrudan dövizle girilir

- **R13.** Döviz kalemin ödeme girişi tutarı kalemin para biriminde ister ve kalanı o para biriminde gösterir.
- **R13/2.** Çevrimin yönü döviz kalemde tersine döner ve **karar motorda** verilir: ödeme doğrulayıcısı kalemin para birimini ve donmuş kurunu seçenek olarak alır, satırın tutarı döviz okunur, lira tutarı ondan türetilir. Seçenek verilmeyen çağrı bugünkü TL çapalı davranıştır, yani 0152'nin yolu aynen korunur. Ekrandaki yama da kur sabitken döviz tutarı çapa alır.
- **R13/3.** "Hepsini ödendi işaretle" döviz kalemde kalemin donmuş kurunu ve kalemin para birimindeki kalanı doldurur; günün kuru önerisine hiç bakmaz.
- **R14.** Ödeme yalnız kalemin para birimindeki açık bir hesaptan ya da hesapsız kaydedilir. Başka para birimindeki hesap listede görünmez ve nedeni ekranda yazar; lirayla ödemek isteyen önce bozdurma yapar.
- **R14/2.** Döviz kalemin ödemesinde üç alan (`dovizTutar`, `kur`, `paraBirimi`) **hesapsız kayıtta da** yazılır; 0152'nin "hesapsız ödemede döviz alanı yok" kuralı yalnız TL kalemin ödemesi için geçerli kalır. 0152'nin "döviz ödeme hesapsız bırakılamaz" yasağı hesabı olan kayıt için sürer ve yeni kaydın hesapsız doğmasını engellemez.
- **R14/4.** **Döviz kipi yalnız ANA hedefe uygulanır (plan P1).** Tevkifatlı döviz kalemin tevkifat hedefi vergi dairesine ödenir ve lira kalır: tutarı lira girilir, TL kalemin yolundan (bütün açık hesaplar, döviz hesapta elle kur) ödenir. Tevkifatlı kalem zaten satırlı doğduğu için (0075) hedef satırdan okunur.
- **R14/3.** Döviz kalemde hesap listesi kalemin para birimiyle süzülür (bugünkü süzme yardımcısı kullanılır) ve hesapsız seçeneği kalır; neden tek sabitten yazılır. **TL kalem 0152'deki davranışını aynen sürdürür:** listesi bütün açık hesaplardır ve döviz hesap seçilirse kur elle sorulur.
- **R15.** Ödemenin lira karşılığı kalemin donmuş kuruyla hesaplanır. Ödeme girişinde ikinci bir kur sorulmaz.
- **R16.** Kalemin dövizi tam ödenince kalem kapanır. Kuruş yuvarlaması kalemi açık bırakmaz ve son ödemeyi "kalandan fazla" diye reddetmez.
- **R16/2.** Kapanmanın kuruş kuralı: kalemin döviz kalanı okuma anında lira kalanından türetilir; kullanıcının yazdığı döviz tutar bu kalana **eşitse** hareketin lira tutarı kalemin lira kalanına eşitlenir (kırpma yalnız bu eşitlikte), değilse lira tutar çevrimden gelir ve bugünkü kalan denetiminden geçer. Artık kuruş son ödemede kapanır (0021'in `esitBol` deseni).
- **R16/3.** **Çok satırlı ödemede grup kırpması (plan P3).** Bir hedefe (taksitli kalemde bir taksite) giden satırların döviz toplamı o hedefin döviz kalanına eşitse son satırın lira tutarı "lira kalan eksi öteki satırlar" olur; tek satırlık R16/2 kuralı bunun özel hâlidir.
- **R17.** Kur farkı ne gider ne gelir yazılır. Bankadan çıkan gerçek lira değeri ile kaydın lira karşılığı ayrışabilir; bu ayrışma hiçbir yerde kalem, borç ya da gelir olarak doğmaz.
- **R18.** Döviz kalemde çek yöntemleri (ciro ve kendi çekimiz) seçilemez ve nedeni yazar.
- **R18/2.** Çek yolu döviz kalemi **aday listesinde göstermez:** ciro ve kendi çekimiz adayları döviz kalemi atlar, çok kaleme dağıtan çekirdek döviz kalemli satırı nedenle reddeder. Neden tek sabitten gelir. Yalnız yöntem seçicisini kapatmak yetmez, çünkü ciro kalemi Kasa › Çek Portföyü'nden seçer.
- **R19.** Döviz ödeme kaydedilince hesabın bakiyesi kendi para biriminde azalır; hesapsız döviz ödeme hiçbir bakiyeye girmez.
- **R19/2.** Bakiyenin döviz okuması ve Kasa listesinin döviz gösterimi 0152 ile sağlanmıştır; bu spec'te yeni kod yoktur, yalnız döviz kalemin ödemesiyle çapraz testi eklenir.
- **R20.** Döviz kalemin taksit planı kalemin para biriminde bölünür; taksit tutarları o para biriminde görünür.
- **R20/2.** Taksit planı lira kuruşunda bölünür (motor değişmez, C1); taksidin döviz tutarı ve kalanı okuma anında türetilir. Artık kuruş lira tarafında son taksitte kaldığı için döviz görünümünde son taksit bir kuruş ayrışabilir; bu kabul edilen sınırdır.
- **R21.** Avans mahsubu döviz kaleme yapılamaz ve nedeni yazar.
- **R21/2.** Ret bugünkü metinle sağlanır: mahsup yalnız personel kalemine yapılır ve döviz kalem normal davranışlıdır, yani kural zaten kapalıdır. Yeni neden metni yazılmaz, yalnız testle sabitlenir.
- **R22.** Tedarikçi ekstresi ve borç özeti lira karşılığıyla çalışır; döviz kalemin satırında kalemin kendi para birimindeki tutarı da görünür.
- **R22/2.** Borç özetinin satırı **tedarikçi bazındadır, kalem bazında değil:** satırın toplamı lira kalır, döviz tutar satırın açılan kalem listesinde kalem başına yazılır ve satırda yalnız "döviz kalem içerir" bilgisi durur. Açık kalemler ve ödeme hatırlatıcısı hedef bazlı olduğu için orada kalemin para birimindeki tutarı doğrudan satıra yazılır.

- **R22/3.** **Borç özetinde açılan liste (plan P2).** Tedarikçi satırı bugün kalem listesi açmıyor; yalnız döviz kalem içeren satırda "Kalemleri göster" düğmesi ve "döviz kalem içerir" ibaresi çizilir, açılınca satırın kalemleri kalan tutarlarıyla kendi para biriminde listelenir. Döviz kalem içermeyen satır bugünkü gibi çizilir (C7).

### C. Ortak

- **R23.** Eski kayıtlar olduğu gibi kalır; hiçbir kaleme para birimi ya da kur yazılmaz ve lira kalemler bugünkü davranışını sürdürür.
- **R24.** Döviz kalem ve döviz ödeme işlem geçmişinde para birimi, döviz tutar ve kurla görünür.
- **R24/2.** İşlem geçmişinin **kalem yarısı** eksiktir ve tamamlanır: kalemin oluşturma kaydına döviz ayrıntısı eklenir, düzenleme kaydının önceki değerleri döviz alanlarını taşır. Ödeme yarısı 0152 ile hazırdır ve dokunulmaz.

---

## Constraints

### Uyulması zorunlu

- **C1.** Kalemin lira karşılığı kayıtta saklanır ve motorun tek hesap tabanıdır. `gider.js`'in kuruş ekseni para birimi bilmemeye devam eder: KDV, stopaj, tevkifat, kısıt hesabı, ödenecek tutar, kova ve havuz kodu bu spec'le değişmez. Emsal 0071: KDV dâhil girilen tutar saklanmaz, hariç tutar saklanır, form açılışta girilen rakamı yeniden kurar.
- **C2.** Döviz tutar da saklanır ve kalemin kapanma ölçütü odur. Lira ile döviz arasındaki oran kalemin donmuş kurudur, yani aynı kalemde iki eksen asla ayrışmaz: döviz kalanı sıfıra inince lira kalanı da sıfırdır.
- **C3.** Ödeme hareketi 0152'nin alanlarıyla yazılır (hesaptan çıkan döviz tutar, kur, para birimi); yeni hareket alanı açılmaz ve 0152'nin "iki okuma" ilkesi korunur: hareketin lira tutarı kalemi kapatır, döviz tutarı hesaptan çıkar.
- **C4.** Yeni hareket türü, yeni izin kimliği ve yeni veri bölümü yok. Döviz kalem bugünkü `gider_add` / `gider_edit` / `gider_odeme` izinleriyle girilir.
- **C5.** Göç yok.
- **C6.** Raporlar ve toplamlar tek para birimlidir (lira). Çok para birimli toplam gösterilmez.
- **C6/2.** Kalemin para birimi kapalı listedendir (TL, USD, EUR); okuma yolunda tanınmayan değer lira sayılır ve ekranda neden yazılmaz (0152'nin para birimi okuma sırasıyla aynı sessiz varsayılan).
- **C7.** Lira kalemlerin kaydedilen gövdesi ve bütün motor çıktıları spec öncesiyle birebir aynı kalır (kıyas altınıyla ölçülür).
- **C8.** Yeni alanlar `giderler` tablosunda dört nokta kuralıyla açılır ve boş değer kayıt gövdesine yazılmaz (0152'nin `HAREKET_DOVIZ_COLUMNS` deseni).
- **C9.** Para birimi ve kur okuması tek yerden yapılır; ekranlar kur çarpımı ya da bölümü yazmaz (0152 ve 0132'nin tarama kuralı).
- **C9/2.** Kur ayrıştırıcısı ve çevrim ilkelleri **yaprak** bir modüle taşınır ve 0152'nin modülü onları aynı adlarla yeniden dışa verir; gider motoru oradan okur. Gider motoru 0152'nin modülünü içe **alamaz**, çünkü o modül gider motorunun tutar ayrıştırıcısını içe alıyor ve ters yön modül döngüsüdür (emsal: 0133'ün belirsiz sayı kuralını `tutarGirdisi.js`'e taşıması, 0132'nin kur önerisini `doviz.js`'e taşıyıp `malzeme.js`'ten yeniden dışa vermesi).
- **C9/3.** Kalemin para birimini ve döviz olup olmadığını okuyan **tek yardımcı** vardır (hareket tarafındaki `hareketParaBirimi`'nin kardeşi); ekranlar alanı doğrudan okumaz ve tarama bunu sabitler. Gerekçe: `tutar` lira, `paraBirimi` döviz olan bir kayıtta doğrudan okuma yanlış hücre basar (0152'de çöp etiketi tam bu yüzden hatalıydı).

### KAPSAM DIŞI

- **X1.** Kur farkının gelir ya da gider olarak muhasebeleşmesi — *neden:* 0152'de verilen karar aynen sürüyor; bu iş yalnız bakiyeyi, borcu ve beyan edilen matrahı doğru tutar. Kur farkı istenirse kendi spec'ini alır.
- **X2.** Döviz kalemin lira hesaptan ödenmesi — *neden:* 2026-11-21 kararı. Tek kalemde iki ayrı kur (fatura kuru ve ödeme kuru) karışırdı; lirayla ödemek isteyen 0152'nin bozdurmasıyla önce döviz alır, iki adım da kayıtlı olur.
- **X3.** Tekrarlayan döviz tanım — *neden:* 2026-11-21 kararı. Kurun alınamadığı günde tanım kursuz ve tutarsız kalem doğurur, kullanıcı her ay elle tamamlamak zorunda kalır.
- **X4.** Kira, personel ve SGK kaleminde döviz — *neden:* kira stopajı ve bordro lira cinsinden beyan edilir; döviz kira sözleşmesi varsa brüt kiranın lira karşılığı girilir.
- **X5.** Döviz avans ve döviz çek — *neden:* 0152 X1 ve X2 aynen geçerli; ikisi de kendi hedef ve portföy kurallarını taşıyor.
- **X6.** Çok para birimli dönem toplamı ya da para birimi başına bakiye raporu — *neden:* 0152 X7. Rapor tek para birimli kalır, döviz kalem lira karşılığıyla toplanır.
- **X7.** Raporların bugünkü kurla yeniden değerlemesi — *neden:* 2026-11-21 kararı. Kapanmış ayın gider toplamı, KDV'si ve makina maliyeti her gün oynamaz.
- **X8.** Tedarikçi ekstresinin kendi para biriminde bakiye vermesi — *neden:* 0152 X8 aynen; ekstre lira kalır, satırda kalemin para birimi görünür.
- **X9.** Gider kaleminin para biriminin sipariş listesi, malzeme kataloğu ve parça maliyeti tarafına bağlanması — *neden:* malzemenin kendi para birimi ve kuru 0132'den beri ayrı bir kavram; iki zinciri bu işte birleştirmek kapsamı iki katına çıkarır.

- **X10.** Tarihli kur kaynağı, yani geçmiş kurların saklanması — *neden:* uygulama yalnız bugünün kurunu alıyor (`App.jsx:803-818`) ve geçmiş kur kaynağı yok; saklamak kendi spec'ini ister. Kalem başka bir güne aitse kuru elle yazılır (R3/2).
- **X11.** Kalemin döviz ekseninde kapanması — *neden:* motorun kuruş eksenine ikinci bir para birimi girer ve C1 düşer. Kapanma lira ekseninde kalır, kuruş sorunu R16/2'nin kırpma kuralıyla çözülür.

---

## Context

Bu spec **0152'nin X4'ünü açar**: o iş kalemin TL kalmasını, döviz fatura girişinin "ayrı ve daha büyük bir karar"
olduğunu yazmıştı (`specs/done/0152-kasa-doviz-odeme-ve-bozdurma.md` X4). Karar 2026-11-21'de verildi.

### Bugünkü davranış, kodda ölçüldü

**Gider motoru tek para birimlidir ve bunu hiçbir yerde yazmaz.** `src/lib/gider.js`'te `paraBirimi` ve `currency` sözcükleri **hiç geçmiyor** (1459 satır, grep ile ölçüldü). Çekirdek `kurus(x) = Math.round(x * 100)` (`:14`); kalemin tutarı `kalemKurus` (`:114`), KDV'si `kdvKurus` (`:161`), stopajı `stopajKurus` (`:269`), gider tutarı `giderKurus` (`:235`, 0076'nın kısıt hesabı), ödenecek tutarı `odenecekKurus` (`:282`). Bu kuruş ekseninin tüketicileri: borç özeti (`:1299`), ödeme hedefleri ve kalan (`:384`, `:1448`), açık kalemler (`acikKalemler.js`), ödeme hatırlatıcısı (`odemeHatirlatma.js`), tedarikçi ve çalışan ekstresi (`kasa.js:791`, `:809`), Dönem Raporu, 0047 raporu (`giderRaporu.js`), genel gider havuzu ve makina maliyeti (`makinaStandartMaliyet.js`), genel arama (`aramaGider.js`) ve 0092'nin aylık payları (`giderKapsami.js`).

**Form her tutar alanını lira simgesiyle çiziyor.** `TutarInput`'un varsayılanı `sym = "₺"` (`ui.jsx:358`); gider formunun tutar alanı bu varsayılanı kullanıyor (`GiderForm.jsx:391`), kira brütü `:380`, personel alanları `:345-349`. Oran alanları `sym="%"` geçiyor, yani simge zaten parametreli.

**0152 ödemenin döviz tarafını açtı ama kalemi kapatan rakam liradır.** `kasa.odemeDogrula` (`kasa.js:484`): `tutar` lira okunur, kalan `odemeHedefKalaniK` ile lira kuruşta sınırlanır (`:499`, "Kalandan fazla ödeme kaydedilemez"), hesap döviz ise `cevrimOku` ile hesaptan çıkan döviz tutar türetilir ve `dovizAlanlariYaz` ile üç alan yazılır (`:507-512`). `doviz.js` hazır malzemeyi taşıyor: `kurCoz` (`:44`), `kurOnerisi` (`:16`), `dovizKurusu` / `karsiKurusu` / `kurTuret` (`:60-62`), `cevrimOku` (`:109`), `DOVIZ_ALANLARI` ve tek yazıcı `dovizAlanlariYaz` (`:125-130`), metinler `paraMetni` / `kurMetni` (`:138-139`), `CEK_DOVIZ_NEDENI` (`:143`), `YALNIZ_TL_NEDENI` (`:144`), `KUR_ONDALIK_ELLE` 4 ve `KUR_ONDALIK_EN_COK` 6 (`:38-39`).

**Ödeme girişinin döviz bölümü satır başına çiziliyor:** `OdemeGirisi.jsx:208` "Kur (1 USD = ? TL)" ve `:215` "Hesaptan çıkacak (USD)"; tutar alanı liradır ve `dovizSatirYamasi` ile kur ve döviz tutar birbirinden türetiliyor (`:153`, `:209`, `:216`). Yani bu spec ödeme ekranını sıfırdan kurmaz, var olan bölümün anlamını değiştirir: döviz kalemde tutar alanı kalemin para biriminde olur, kur alanı kalemin donmuş kurunu gösterir ve elle sorulmaz.

**`giderler` tablosu (`electron/db.cjs:229-240`)** otuz üç sütun taşıyor ve para birimi yok. Sütun grupları aynı desenle eklenmiş: `GIDER_KDV_YONU_COLUMN` (`:619`), `GIDER_SGK_YOL_COLUMNS` (`:622`), `GIDER_DAGITIM_COLUMN` (`:625`), `TEVKIFAT_COLUMNS` (`:630`), `GIDER_KISIT_COLUMNS` (`:646`); hepsi `applyColumnMigrations` içinde `giderler` ve `gider_tanimlari` için ayrı ayrı çağrılıyor (`:1236-1247`). Bu spec'in alanları aynı yolu izler, ama yalnız `giderler` tablosuna (X3 gereği tanım kapsam dışı).

**Kalan hesabı iki dallı:** `odemeHedefKalaniK` (`gider.js`) satırlı kalemde taksidin kalanını, satırsız kalemde hedeflerin kalanlarının toplamını verir. İkisi de kuruş tamsayısıdır, yani kalemin para birimi kuruş eksenine değil **yorumuna** eklenir: lira karşılığı donmuş olduğu için döviz kalanı lira kalanının kalemin kuruyla bölümüdür ve ters yönde çarpımıdır.

### Kararlar, 2026-11-21

Takım Yöneticisi dört kararı analistin önerisi yönünde verdi:

1. **Lira karşılığı fatura günü kuruyla donar.** Alternatifi (her açılışta bugünkü kurla hesaplamak) kapanmış ayın gider toplamını, KDV'sini ve makina maliyetini her gün oynatırdı.
2. **Kalem döviz tutarıyla kapanır.** Alternatifi (lira ile kapanma) kuru artmışsa tam ödenmiş faturayı borçlu, düşmüşse "kalandan fazla ödeme" diye reddedilen bir kayıt hâline getirirdi.
3. **Döviz kalem yalnız aynı para birimindeki hesaptan ya da hesapsız ödenir.** Lira hesaptan ödeme bozdurma ile iki adıma bölünür.
4. **Kapsam yalnız normal davranışlı kalem**; kira, personel, SGK ve tekrarlayan tanım lira kalır.

### Bilinen tuzaklar

- **Kuruş yuvarlaması kalemi açık bırakabilir (R16).** Döviz tutar lira kuruşuna çevrilirken her satırda yuvarlama olur; bölünerek ödenen kalemde satır toplamı kalemin lira kuruşundan bir iki kuruş sapabilir. Son ödemede lira tarafı kalemin kalanına kırpılmazsa kalem "1 kuruş açık" kalır ya da son ödeme reddedilir. Emsal: `esitBol`'un artık kuruşu son taksite yazması (0021).
- **Ödeme almış kalemde kur değişimi (R7).** Kur değişince kalemin lira karşılığı ve dolayısıyla kalanı değişir, ödenmiş hareketlerin lira tutarı ise eski kurla yazılmıştır: kalem sessizce fazla ya da eksik ödenmiş görünür. Kilitleme bunu kapatır; emsal `kasa.hesapDogrula`'nın "hareketi olan hesabın para birimi değişmez" kuralı (`kasa.js:52`).
- **Karışık sürüm.** Güncellenmemiş bir bilgisayar yeni alanları tanımaz: döviz kalem o bilgisayarda lira kalem gibi görünür (donmuş lira karşılığıyla, yani rakamları doğru ama para birimi yanlış) ve o bilgisayarda düzenlenirse para birimi ile kur gövdeden düşer. Sürüm notu: önce sunucu bilgisayarı, bütün istemciler güncellenene kadar döviz kalem girilmez. Emsal: 0152 P10, 0132 ve 0135'in sürüm notları.
- **Sunucu alan denetimi gerekmez.** `giderler` bölümü `serverAuth.cjs`'te bölüm düzeyinde güvenilir. **Düzeltilen iddia:** `ALAN_IZINLERI` listesinde (`serverAuth.cjs:583-587`) `giderler` **hiç yok**; 0021'in taksit ödemesi dalı 0024 ile kaldırılmış (gerekçesi `:588-590`'da yazılı). Sonuç değişmiyor, hatta daha net: tutar, para birimi ve kur alan denetiminde değildir ve yeni alanlar bugünkü `gider_add` / `gider_edit` izinleriyle yazılır.
- **Genel aramanın sayısal kuralı (R12).** `aramaGider.js` tutar eşitliğini kalemin lira tutarı ve ödenecek tutarı üzerinden arıyor; döviz kalemde kullanıcı faturanın kendi rakamını (1.200) arar, o rakam lira tarafında hiç geçmez.
- **Kıyas altını (C7).** Lira kalemlerin motor çıktısı ve kaydedilen gövdesi spec öncesi kodla üretilmiş bir altın dosyayla birebir karşılaştırılır (0152'nin `0152-once.json` deseni). Döviz alanı taşımayan kalemde hiçbir sayı ve hiçbir metin değişmemelidir.


### QA turunda ölçülenler (2026-11-21)

| | Ölçüm | Sonuç |
|---|---|---|
| **A** | `gider.js`'te `paraBirimi` ve `currency` | 1459 satırda hiç geçmiyor; spec'in iddiası doğru |
| **B** | `doviz.js`'in satır atıfları | hepsi doğru: `kurOnerisi :16`, `KUR_ONDALIK_* :38-39`, `kurCoz :44`, `dovizKurusu` / `karsiKurusu` / `kurTuret :60-62`, `cevrimOku :109`, `DOVIZ_ALANLARI :125`, `dovizAlanlariYaz :127`, `paraMetni` / `kurMetni :138-139`, `CEK_DOVIZ_NEDENI :143`, `YALNIZ_TL_NEDENI :144` |
| **C** | İçe alma yönü | `doviz.js:9` `tutarCoz`'u `gider.js`'ten alıyor; ters yön modül döngüsü olur |
| **D** | Kur ilkellerinin bağımlılığı | `kurCoz`, `kurGirdisi`, `dovizKurusu`, `karsiKurusu`, `kurTuret` hiçbir gider alanı okumuyor, yani bugün bile yaprak; `tutarCoz`'u yalnız `kurusOf` ve `cevrimOku` kullanıyor |
| **E** | Ödeme doğrulayıcısının ekseni | `odemeDogrula :484` `tutar`'ı lira okuyor, kalanı lira kuruşta sınırlıyor (`:499`); döviz dalı yalnız `hesapId` doluyken çalışıyor (`:502-512`) |
| **F** | Hesap listesi yardımcıları | `acikHesaplar :469` (bütün açık hesaplar), `secilebilirHesaplar :470` (para birimiyle süzen, hazır) |
| **G** | Hesap listesinin çağıranları | `GiderForm.jsx:96` ve `OdemeKayitPenceresi.jsx:57` `acikHesaplar`; `StopajDonemleri.jsx:37` `secilebilirHesaplar(…, "TRY")` |
| **H** | Ödeme girişinin döviz bölümü | kur alanı `OdemeGirisi.jsx:208`, döviz tutar `:215`, yamalar `:153` / `:194` / `:209` / `:216`; taksit seçicisi kalanı lira basıyor (`:143`) |
| **I** | Toplu işaretleme | `formOdemesi.js:150-165` `dovizDoldur` hesabın para birimine göre **bugünün** önerisini dolduruyor |
| **J** | Doğrulayıcının kayıt kurulumu | `gider.js:686` `kayit = { ...form }`, yani forma giren her alan kayda sızıyor; tevkifat (`:770`) ve kısıt (`:776`) alanları bu yüzden her çağrıda açıkça siliniyor |
| **K** | Normal dalın tutar yazımı | `gider.js:757` `kayit.tutar = haricOf(t.deger)`; `girilenHaric :268`, `kdvAyir :165` kuruş tamsayısıyla ve para biriminden bağımsız çalışıyor |
| **L** | `stopajKurus`'un satırı | `:269` (spec `:270` yazıyordu, düzeltildi) |
| **M** | Hesap para birimi kilidi | `hesapDogrula :44`, "hareketi olan hesabın para birimi değiştirilemez" kuralı `:52` (spec `:22-35` yazıyordu, o aralık 0151'in düzeltme sabitleri) |
| **N** | `giderler` tablosu | `db.cjs:229-240`, **otuz üç** sütun (spec "otuz" yazıyordu) |
| **O** | Sunucu alan denetimi | `ALAN_IZINLERI :583-587`'de `giderler` hiç yok; 0021'in taksit dalının 0024 ile kaldırıldığı `:588-590`'da yazılı |
| **P** | Kalan hesabının satırı | `odemeHedefKalaniK :1448` (spec `:1454` yazıyordu) |
| **Q** | Borç özetinin satır ekseni | `borcOzeti :1299` açık hedefleri tedarikçi, çalışan, vergi dairesi ve SGK satırlarında topluyor; aynı tedarikçinin iki para birimli kalemi tek satırda birleşir |
| **R** | Açık kalemler ve hatırlatıcı | satırları ödeme **hedefi** bazlı, yani kalemin para birimi satıra yazılabilir |
| **S** | Çek yolunun kalem seçimi | `cek.js:183` `ciroAdaylari` para birimi okumuyor; `kasa.js:528` `cokKalemOdemeleri`'nin `yalnizTl` bayrağı yalnız hesabı denetliyor |
| **T** | Avans mahsubu | `kasa.js:735` personel dışı kalemi zaten reddediyor ("Avans yalnız personel kalemine mahsup edilir.") |
| **U** | Bakiyenin döviz okuması | `hesaptanCikanK :96` ve `hareketParaBirimi :99` hazır, bakiye `:109`'da onları okuyor; hesapsız liste döviz ödemeyi kendi para biriminde basıyor (`Kasa.jsx:750`) |
| **V** | Hesap taşıma | `hesapTasimaPlani :311`; döviz ödemenin hesapsız bırakılma yasağı `:333` (0152 R7/2) |
| **W** | Kur kaynağı | `App.jsx:803-818` yalnız bugünün kurunu alıyor (`{ usd, eur }`); geçmiş kur kaynağı arandı, yok |
| **X** | `rates` zinciri | `GiderForm.jsx:80` ve ödeme penceresi `rates` / `ratesErr` prop'unu zaten alıyor (`Giderler.jsx:410`, `:418`), yeni tesisat gerekmiyor |
| **Y** | Genel aramanın sayısal dalı | `aramaGider.js:91-95` tutar eşitliğini yalnız `kalemTutari` ve `odenecekTutar` (ikisi de lira) ile deniyor; satır metni `:102`'de lira |
| **Z** | İz kayıtları ve gösterim | `Giderler.jsx:181` kalemin oluşturma kaydı ayrıntısız, ödeme kayıtları `:163` / `:166` / `:239` `dovizIzAyrintisi` taşıyor; kalem listesinin tutar sütunu ve alt toplamı gider tutarı (`DonemRaporu.jsx:248`); `esitBol :325`, `planYenidenBol :357`; `TutarInput`'un `sym` varsayılanı `ui.jsx:358` lira ve parametreli |

### QA turunda verilen kararlar (2026-11-21)

Yirmi altı bulgu çıktı, hepsi analistin önerisi yönünde onaylandı. Dereceler: **Bloklayıcı** altı, **Önemli** on dört, **Küçük** altı.

**Karar 1 (Bloklayıcı, R1/2) · Kaydın şekli yazılı değildi.** `tutar` lira kalır ve donmuş karşılıktır; kalemin kendi rakamı, kuru ve para birimi 0152'nin adlarıyla üç yeni alanda durur. — *neden:* C1 ve C7 ancak `tutar` lira kalırsa tutar, kuruş ekseninin bütün tüketicileri (ölçüm A) değişmeden kalır; aynı adlar hazır malzemeyi yeniden yazdırmaz.

**Karar 2 (Bloklayıcı, C9/2) · C9'un "tek yer"i tanımsızdı.** Kur ayrıştırıcısı ve çevrim ilkelleri yaprak modüle taşınır, 0152'nin modülü aynı adlarla yeniden dışa verir. — *neden:* ölçüm C ve D: ters yön döngü olur, oysa bu beş fonksiyon bugün bile yaprak; depodaki emsal taşıma deseni çağıranları hiç değiştirmiyor.

**Karar 3 (Bloklayıcı, R13/2) · Çevrimin yönü tersine dönüyor ama sahibi yoktu.** Doğrulayıcı kalemin para birimini ve kurunu seçenek alır, satırın tutarını döviz okur, lirayı türetir; seçeneksiz çağrı bugünkü davranıştır. — *neden:* ölçüm E ve H: bugün çapa liradır; tek doğrulayıcı korunmazsa 0152'nin TL kalem yolu ikinci kez yazılır ve kıyas altını (C7) düşer.

**Karar 4 (Bloklayıcı, R16/2) · R16'nın mekanizması yoktu.** Döviz kalan lira kalanından türer; yazılan döviz tutar kalana eşitse hareketin lira tutarı kalemin lira kalanına eşitlenir. — *neden:* iki eksen yalnız son adımda bağlanırsa ara satırlar bozulmaz (0021'in artık kuruş deseni); dövizi ana eksen yapmak C1'i düşürür (X11).

**Karar 5 (Bloklayıcı, R14/2) · Hesapsız döviz ödeme 0152 ile çelişiyordu.** Döviz kalemin ödemesinde üç alan hesapsız kayıtta da yazılır; 0152'nin hesapsız bırakma yasağı yalnız hesabı olan kayıt için sürer. — *neden:* ölçüm E, U ve V: alanlar yazılmazsa hesapsız ödeme listede lira sanılır ve 0152'nin kapattığı "TL'ymiş gibi görünür" kusuru geri gelir; para birimini artık kalem söylüyor.

**Karar 6 (Bloklayıcı, R18/2) · Çek yolu döviz kalemi süzmüyordu.** Ciro ve kendi çek adayları döviz kalemi atlar, çok kaleme dağıtan çekirdek nedenle reddeder. — *neden:* ölçüm S: yöntem seçicisini kapatmak yetmez, ciro kalemi Çek Portföyü'nden seçer; yoksa döviz kaleme döviz alanı taşımayan lira ödeme yazılır ve C2'nin değişmezi kırılır.

**Karar 7 (Önemli, R6/2) · KDV dâhil ayırmanın sırası ve yuvarlaması belirsizdi.** Döviz üzerinde ayır, hariç dövizi çevir, KDV'yi lira tabandan hesapla; döviz KDV saklanmaz. — *neden:* ölçüm K: `kdvAyir` para biriminden bağımsız çalışıyor, ama lira KDV'yi döviz KDV'den çevirmek 0071 C1'in "ekrandaki KDV kaydedilenin aynısı" eşitliğini bozar ve beyanı ikinci yuvarlamaya sokar.

**Karar 8 (Önemli, R4/2) · Lira karşılığının yuvarlaması yazılı değildi.** Bir kez kuruşa yuvarlanır ve çarpım tek yerde durur. — *neden:* 0152 C4/2 hareket tarafı için aynı kuralı koydu; iki tarafın farklı yuvarlaması aynı faturaya iki lira rakamı verir, yani Intent'in şikâyeti geri gelir.

**Karar 9 (Önemli, R3/2) · Kur önerisi tarihli olamaz.** Öneri bugünün kurudur, başka güne ait kalemde kur elle yazılır; tarihli kaynak kapsam dışı (X10). — *neden:* ölçüm W: geçmiş kur kaynağı yok, yani R3 ve AC-6'nın eski ifadesi bugünkü veriyle karşılanamazdı.

**Karar 10 (Önemli, R14/3) · Hesap listesinin süzülmesi ve TL kalemin yolu.** Döviz kalemde hazır süzme yardımcısıyla daraltılır, TL kalem 0152'deki gibi bütün açık hesapları görür. — *neden:* ölçüm F ve G: iki giriş noktası da bugün bütün hesapları veriyor; yazılmazsa uygulayıcı R14'ü bütün kalemlere uygular ve 0152 R1/2'yi sessizce geri alır.

**Karar 11 (Önemli, R13/3) · Toplu işaretleme bugünün kurunu dolduruyordu.** Döviz kalemde kalemin kuru ve kalemin para birimindeki kalan yazılır. — *neden:* ölçüm I: öneri kuru girerse hareketin lira tutarı kalemin kurundan sapar, R15 ile C2 birlikte kırılır ve kalem fazla ya da eksik ödenmiş görünür.

**Karar 12 (Önemli, R20/2) · Taksit planının bölünmesi tanımsızdı.** Lira kuruşunda bölünür, döviz okuma anında türetilir, son taksitteki bir kuruş ayrışma kabul edilir. — *neden:* ölçüm Z: planı döviz ekseninde bölmek `planYenidenBol`'un ödenmiş satır korumasıyla ikinci bir kuruş ekseni doğurur ve 0021'in bütün sınır kuralları yeniden yazılır.

**Karar 13 (Önemli, R22/2) · Borç özeti satırı kalem bazında değil.** Satır toplamı lira kalır, döviz tutar açılan kalem listesinde yazılır; açık kalemler ve hatırlatıcı satıra yazar. — *neden:* ölçüm Q ve R: karışık satıra döviz rakamı basmak toplamı anlamsız kılar ve C6 düşer; iki ekranın satır ekseni farklı olduğu için kuralları da farklıdır.

**Karar 14 (Önemli, R1/3) · Döviz alanlarının tek yazıcısı yoktu.** Alanlar her çağrıda silinir, yalnız döviz kipinde yazılır; formun tutar alanı dövizi taşır, kayda lira yazılır. — *neden:* ölçüm J: kayıt `{ ...form }` ile kuruluyor ve `{ ...eski, ...yeni }` birleştirmesinin eski değeri taşıması bu depoda tekrarlayan kusurdur (0095 ve 0114 dersi); silici olmadan TL'ye çevrilen kalemde kur kalır ve kalem sessizce döviz sayılır.

**Karar 15 (Önemli, R7/2) · R7'nin kilit ölçütü tanımsızdı.** Ölçüt zenginleştirilmiş kalemde kapanan tutarın sıfırdan büyük olmasıdır; çöpteki hareket saymaz. — *neden:* 0024'ten beri ödeme durumunun tek doğruluk kaynağı bu fonksiyondur; ikinci ölçüt çöpten geri alınan ödemede (0078) iki ekranı ayrıştırır.

**Karar 16 (Önemli, R2/2) · Kurun sınırları yazılı değildi.** Elle dört ondalık, sıfırdan büyük, üst sınır yok, sapma uyarısı var. — *neden:* dört ondalık kuralı 0152 ile aynı kalır, kullanıcı iki ekranda aynı girdiyi yazar; üst sınır yerine uyarı 0132 ve 0133'ün emsalidir ve kur ödeme sonrası kilitlendiği için yazım anındaki tek korumadır.

**Karar 17 (Önemli, R12/2) · Arama döviz tutarı görmüyordu.** Aday listesine döviz tutar eklenir, lira karşılığı kalır, satır metni para birimiyle yazılır. — *neden:* ölçüm Y: R12'nin tek somut kullanıcı davranışı faturanın kendi rakamını aramaktır ve o rakam lira tarafında hiç geçmez; lirayı listede bırakmak eski davranışı korur.

**Karar 18 (Önemli, R24/2) · İzin kalem yarısı eksikti.** Oluşturma kaydına döviz ayrıntısı eklenir, düzenleme kaydı da taşır; ödeme yarısına dokunulmaz. — *neden:* ölçüm Z: ödeme tarafı 0152 ile hazır, yazılmazsa uygulayıcı ya var olanı ikinci kez yazar ya da kalem yarısını atlar.

**Karar 19 (Önemli, R8/2) · Kalem listesinin hücre düzeni yoktu.** İki rakam aynı hücrede, alt toplam lira. — *neden:* karışık para biriminden alt toplam C6'yı kırar; ikinci rakam bu ekranda zaten kullanılan bir biçimdir (0076), yeni bileşen gerekmez.

**Karar 20 (Önemli, R9/2) · Rapor satırının biçimi yoktu.** Döviz tutar, kur ve lira karşılığı tek hücrede; sütun açılmaz. — *neden:* yeni sütun 0059'un altın HTML'ini ve bölüm genişliklerini değiştirir; tek hücre hem kıyası hem 0144'ün sütun sayısı dersini korur.

**Karar 21 (Küçük, R21/2) · R21 bugün zaten karşılanıyor.** Mevcut ret metni yeterlidir, yalnız test eklenir. — *neden:* ölçüm T: yeni bir ret metni ikinci bir yol açar ve 0074'ün SGK metninin sıraya duyarlı olması bu sıraya dokunmanın maliyetini gösteriyor.

**Karar 22 (Küçük, R19/2) · R19 ve AC-29 zaten 0152'de var.** Yalnız çapraz test eklenir. — *neden:* ölçüm U: yeni iş sanılırsa tek okuyucunun yanına ikinci bir okuma yazılır.

**Karar 23 (Küçük, Context) · Altı iddia düzeltildi.** `stopajKurus :269`, hesap para birimi kuralı `:52`, `giderler` otuz üç sütun, `ALAN_IZINLERI`'nde `giderler` hiç yok, `odemeHedefKalaniK :1448`, kur önerisinin tarihsizliği. — *neden:* "doküman ile kod çeliştiğinde kod doğrulanır, çelişki raporlanır"; özellikle sunucu iddiası doğru sonuca yanlış gerekçeyle varıyordu ve uygulayıcı listede `giderler`'i arayıp bulamazdı.

**Karar 24 (Küçük, C6/2) · DoD maddesi R1 ile çelişiyordu.** Liste kapalıdır; okuma yolunda tanınmayan değer lira sayılır ve neden yazılmaz. — *neden:* hareket tarafı zaten sessiz lira varsayılanı kullanıyor (ölçüm U); iki farklı kural iki ekranda iki davranış demektir.

**Karar 25 (Küçük, R2/3) · Sıfır tutarlı döviz kalem tanımsızdı.** Döviz kipinde sıfır reddedilir, serbestlik TL kalemde kalır. — *neden:* döviz kalem tanımdan doğamayacağı için (X3) kapı hiç açılmaz; yazılmazsa `tanimId` dalının döviz etkileşimi uygulayıcıya kalır.

**Karar 26 (Küçük, C9/3) · Tek okuyucunun adı yoktu.** Kalemin para birimini okuyan tek yardımcı tanımlanır ve tarama sabitler. — *neden:* `tutar` lira, `paraBirimi` döviz olan kayıtta doğrudan okuma yanlış hücre basar; 0152'de çöp etiketi tam bu yüzden hatalıydı ve çözümü tek okuyucu olmuştu.

### QA turu karar kaydı

| Karar | Derece | Spec'e işlendi | Kriter |
|---|---|---|---|
| 1 · Kaydın şekli | Bloklayıcı | R1/2 | AC-35 |
| 2 · Modül döngüsü ve kur ilkelleri | Bloklayıcı | C9/2 | AC-38 |
| 3 · Çevrimin yönü motorda | Bloklayıcı | R13/2 | AC-45 |
| 4 · Kapanmanın kuruş kuralı | Bloklayıcı | R16/2 | AC-49 |
| 5 · Hesapsız döviz ödeme | Bloklayıcı | R14/2 | AC-47 |
| 6 · Çek yolu döviz kalemi süzer | Bloklayıcı | R18/2 | AC-50 |
| 7 · KDV dâhil ayırmanın sırası | Önemli | R6/2 | AC-43 |
| 8 · Lira karşılığının yuvarlaması | Önemli | R4/2 | AC-37 |
| 9 · Kur önerisi bugünün kuru | Önemli | R3/2, X10 | AC-42 |
| 10 · Hesap listesinin süzülmesi | Önemli | R14/3 | AC-48 |
| 11 · Toplu işaretleme kalemin kuruyla | Önemli | R13/3 | AC-46 |
| 12 · Taksit planı lirada bölünür | Önemli | R20/2 | AC-52 |
| 13 · Borç özeti satırının ekseni | Önemli | R22/2 | AC-57 |
| 14 · Döviz alanlarının tek yazıcısı | Önemli | R1/3 | AC-36 |
| 15 · Kilit ölçütü | Önemli | R7/2 | AC-44 |
| 16 · Kurun sınırları | Önemli | R2/2 | AC-40 |
| 17 · Aramada döviz tutar | Önemli | R12/2 | AC-56 |
| 18 · İzin kalem yarısı | Önemli | R24/2 | AC-58 |
| 19 · Kalem listesinin hücresi | Önemli | R8/2 | AC-54 |
| 20 · Rapor satırının biçimi | Önemli | R9/2 | AC-55 |
| 21 · Avans mahsubu bugünkü metinle | Küçük | R21/2 | AC-53 |
| 22 · Bakiye ve Kasa listesi 0152'de | Küçük | R19/2 | AC-51 |
| 23 · Altı iddia düzeltildi | Küçük | Context | — |
| 24 · Tanınmayan para birimi | Küçük | C6/2 | AC-59 |
| 25 · Sıfır tutarlı döviz kalem | Küçük | R2/3 | AC-41 |
| 26 · Para biriminin tek okuyucusu | Küçük | C9/3 | AC-39 |

---

### Plan turunda verilen kararlar (2026-11-21)

Takım Yöneticisi planın on iki önerisini onayladı ("tüm önerilerini onaylıyorum"):

| No | Konu | Karar |
|---|---|---|
| P1 | Tevkifatlı döviz kalem | Döviz kipi yalnız ANA hedefte; tevkifat hedefi lira kalır (R14/4). — *neden:* vergi dairesine döviz ödenmez; tevkifatlı kalem satırlı doğduğu için hedef satırdan bilinir. |
| P2 | Borç özetinde açılan liste | Yalnız döviz kalemli satırda "Kalemleri göster" ve ibare (R22/3). — *neden:* R22/2'nin varsaydığı liste kodda yoktu; TL satır piksel piksel aynı kalır. |
| P3 | Çok satırlı ödemede kuruş | Grup kırpması (R16/3). — *neden:* tek satırlık kırpma 300 + 400 ile 700 kapatmada bir kuruş açık bırakırdı. |
| P4 | DoD ile C6/2 | C6/2 izlenir, DoD düzeltildi. — *neden:* Karar 24 DoD'ye işlenmemişti. |
| P5 | Kalem TL'ye çevrilince | Rakam aynen kalır, otomatik çevirme yok (AC-13). — *neden:* formdaki rakam kullanıcının yazdığıdır. |
| P6 | Döviz kalemin ön seçili hesabı | Kalemin para birimindeki son kullanılan açık hesap, yoksa hesapsız. — *neden:* TL'ye bakan `sonKullanilanHesap` süzülmüş listede yok; TL kalem değişmez. |
| P7 | Döviz ödenecek tutar | Lira ödenecekten kalemin kuruyla türetilir; garip kurda girilen KDV dâhil rakamdan ±1 sent sapabilir, kabul. — *neden:* Karar 7'nin sonucu; kapanma lira ekseninde ve kırpmayla korunur. |
| P8 | Kısıtlı döviz kalemin hücresi | Üstte döviz matrah, altta bugünkü lira gider tutarı. — *neden:* hücrenin bugünkü anlamı ve alt toplam değişmez. |
| P9 | Düzenleme izi | `snapshotOnceki` kaydın tamamını taşıdığı için kod yok, yalnız test; oluşturma izine ayrıntı yalnız döviz kalemde. — *neden:* TL kalemin iz gövdesi değişmez. |
| P10 | Kur sapma uyarısı | Günün kuruna göre; kur alınamadıysa ya da kur kayıtlı değerinden değiştirilmediyse uyarı yok. — *neden:* eski kalem her açılışta uyarı vermesin. |
| P11 | Öteki sütunlar | Kalem listesinin KDV ve Ödenecek sütunları lira; raporda döviz eki yalnız kalem satırlarında, tek yardımcıdan, yeni sütun yok. — *neden:* R8/2 ve R9/2 yalnız tutar hücresini istiyor. |
| P12 | Kanıt | Çekim parçalı (`EKRAN_PARCA`). — *neden:* aracın on dakika sınırı 0152'de son ekranı düşürdü. |

## Acceptance Criteria

- **AC-1.** Normal davranışlı gider formunda tutar alanının yanında TL, USD, EUR seçenekli para birimi seçici çizilir ve varsayılan TL'dir.
- **AC-2.** Kira, personel ve SGK davranışı seçilince para birimi seçici çizilmez.
- **AC-3.** Tekrarlayan tanım formunda para birimi seçici çizilmez.
- **AC-4.** USD seçilince kur alanı çıkar ve etiketi "1 USD = ? TL" yazar.
- **AC-5.** Kur boş bırakılan döviz kalem kaydedilmez; hata kur alanında görünür.
- **AC-6.** Kur alanı günün kuruyla dolu açılır ve önerinin bugünün kuru olduğunu söyleyen ibare çizilir.
- **AC-7.** Günün kuru alınamadığında (çevrimdışı) nedeni yazar, kur alanı boş kalır ve elle yazılan kurla kayıt yapılır.
- **AC-8.** 1.200 USD ve kur 40 girilen kalem kaydedilince kayıtta döviz tutar 1.200, kur 40 ve lira karşılığı 48.000 durur.
- **AC-9.** Kaydedilmiş döviz kalemin kuru değişmeden günün kuru değişirse kalemin lira karşılığı, KDV'si ve dönem toplamındaki yeri değişmez.
- **AC-10.** %20 KDV ve "KDV dâhil" seçili 1.200 USD kalemde KDV hariç döviz tutar 1.000 USD, lira karşılığı kur 40 ile 40.000 ve KDV 8.000 lira olur.
- **AC-11.** Döviz kalemin KDV'si, stopajı, tevkifatı, gider kısıtlaması ve ödenecek tutarı donmuş lira karşılığından hesaplanır; aynı rakamlar lira cinsinden girilmiş eşdeğer kalemle birebir aynıdır.
- **AC-12.** Ödeme almış döviz kalemde para birimi seçici ve kur alanı pasiftir ve nedeni yazar.
- **AC-13.** Hiç ödeme almamış döviz kalemin para birimi TL'ye çevrilince kalemden döviz tutar ve kur düşer, lira tutarı formda yazan rakam olur.
- **AC-14.** Kalem listesinde döviz kalemin tutarı kendi para biriminde, lira karşılığı aynı satırda görünür.
- **AC-15.** Dönem raporunun toplam gider kartı, tür kırılımı, tedarikçi harcaması ve indirilecek KDV rakamı döviz kalemi lira karşılığıyla sayar.
- **AC-16.** Yazdırılan Aylık Gider ve Kasa Raporu'nda döviz kalemin satırı kendi para birimini ve lira karşılığını taşır, bölüm toplamları lira olarak basılır.
- **AC-17.** Döviz kalemin ödeme girişi tutar alanını kalemin para biriminde ister ve kalanı o para biriminde yazar.
- **AC-18.** Döviz kalemin ödeme girişinde hesap listesinde yalnız o para birimindeki açık hesaplar ve hesapsız seçeneği bulunur; başka para birimindeki hesabın görünmeme nedeni ekranda yazar.
- **AC-19.** Döviz kalemin ödeme girişinde kur elle sorulmaz; kalemin donmuş kuru gösterilir.
- **AC-20.** 1.200 USD kalemde 500 USD ödeme kaydedilince kalan 700 USD görünür ve hesabın bakiyesi 500 USD azalır.
- **AC-21.** Kalanı 700 USD olan kaleme 700 USD ödeme kaydedilince kalem kapanır ve lira tarafında kuruş artığı kalmaz.
- **AC-22.** Kalanından fazla döviz ödeme kaydedilemez ve hata kalemin para biriminde kalanı yazar.
- **AC-23.** Hesapsız kaydedilen döviz ödeme kalemi kapatır ve hiçbir hesabın bakiyesine girmez.
- **AC-24.** Döviz kalemin ödeme girişinde "Çek (ciro)" ve "Çek (kendi)" yöntemleri seçilemez ve nedeni yazar.
- **AC-25.** Döviz kaleme avans mahsubu yapılamaz ve nedeni yazar.
- **AC-26.** Üç taksitli 1.200 USD kalemin taksitleri 400 USD olarak görünür ve bir taksidin ödemesi o taksidi kapatır.
- **AC-27.** Açık kalemler listesi, borç özeti ve ödeme hatırlatıcısı döviz kalemi kendi para birimindeki tutarıyla gösterir, toplamları lira karşılığıyla verir.
- **AC-28.** Tedarikçi ekstresinde döviz kalemin satırı kendi para birimindeki tutarını taşır, bakiye lira olarak yürür.
- **AC-29.** Kasa hareket listesinde döviz ödeme hesabın para biriminde çıkan tutarla ve kuruyla görünür.
- **AC-30.** Genel aramada faturanın kendi rakamı (1.200) yazılınca döviz kalem bulunur.
- **AC-31.** İşlem geçmişinde döviz kalemin kaydı para birimi, döviz tutar ve kur ayrıntısıyla görünür.
- **AC-32.** Döviz alanı taşımayan kalemlerden oluşan veride motorun bütün çıktıları ve kaydedilen gövde spec öncesi kodla üretilmiş altın dosyayla birebir aynıdır.
- **AC-33.** Para birimi ve kur sütunları `giderler` tablosunda dört nokta kuralıyla açılır; boş değer kayıt gövdesine yazılmaz ve döviz alanı olmayan kalemin gövdesi spec öncesiyle aynı kalır.
- **AC-34.** Kaynak taraması: ekran dosyalarında kur çarpımı ya da bölümü yazılmaz; para birimi ve kur okuması tek yardımcıdan yapılır.

### QA turu kriterleri (2026-11-21)

**Kayıt şekli ve iki okuma**

- **AC-35.** Kaydedilen döviz kalemin gövdesinde `tutar` lira karşılığını, `dovizTutar` KDV hariç döviz tutarı, `kur` kuru ve `paraBirimi` para birimini taşır; TL kalemin gövdesinde bu üç alan hiç yoktur.
- **AC-36.** Döviz kalem TL'ye çevrilip kaydedilince üç alan gövdeden düşer; TL kalem döviz kipine alınınca üçü birden yazılır (tek yazıcı her çağrıda siler).
- **AC-37.** Lira karşılığı tek çarpımla ve bir kez kuruşa yuvarlanarak hesaplanır; aynı kalem değiştirilmeden yeniden kaydedilince rakam birebir aynı kalır.
- **AC-38.** Kur ayrıştırıcısı ve çevrim ilkelleri yaprak modüldedir ve gider motoru 0152'nin modülünü içe almaz (kaynak taraması).
- **AC-39.** Kalemin para birimi tek yardımcıdan okunur; ekran dosyalarında alanın doğrudan okunduğu satır yoktur (kaynak taraması).

**Giriş ve sınırlar**

- **AC-40.** Beş ondalıklı kur reddedilir, dört ondalıklı kabul edilir; günün kurundan yüzde elliden fazla sapan kur uyarı verir ve kaydı engellemez.
- **AC-41.** Döviz kipinde sıfır ve boş döviz tutar reddedilir; tekrarlayan tanımdan üretilmiş TL kalemde sıfır tutar bugünkü gibi serbesttir.
- **AC-42.** Kur önerisi bugünün kurudur: kalemin tarihi geçmiş bir güne çekilince öneri değişmez ve ekrandaki ibare bunu söyler.
- **AC-43.** KDV dâhil girilen döviz tutarda KDV döviz üzerinde ayrılır, hariç döviz liraya çevrilir ve kalemin KDV'si lira tabandan hesaplanır; yuvarlama farkı satırı kalemin para biriminde yazar.
- **AC-44.** Kalemin tek ödemesi silinince para birimi ve kur yeniden düzenlenebilir olur; çöpteki ödeme kilidi indirmez.

**Ödeme**

- **AC-45.** Döviz kalemin ödeme satırında girilen rakam dövizdir ve hareketin lira tutarı kalemin donmuş kurundan türer; TL kalemin ödemesi 0152'deki gibi lira girilerek ve kur elle yazılarak kaydedilir.
- **AC-46.** Döviz kalemde "Hepsini ödendi işaretle" satırı kalemin kuruyla ve kalemin para birimindeki kalanla doldurur; günün kuru farklı olsa da satıra girmez.
- **AC-47.** Hesapsız kaydedilen döviz ödemenin gövdesi döviz tutar, kur ve para birimi taşır, hiçbir bakiyeye girmez ve hesapsız listede kalemin para biriminde görünür.
- **AC-48.** Döviz kalemin hesap listesinde yalnız o para birimindeki açık hesaplar ve hesapsız seçeneği bulunur; TL kalemin listesi bütün açık hesapları göstermeye devam eder.
- **AC-49.** Kalanı dövizde tam kapatan ödeme kaydedilince lira kalanı da sıfıra iner; kuruş artığı kalmaz ve ödeme "kalandan fazla" diye reddedilmez.
- **AC-50.** Döviz kalem ciro ve kendi çekimiz aday listesinde görünmez; çok kaleme dağıtan yol döviz kalemli satırı nedenle reddeder.
- **AC-51.** Döviz kalemin hesaplı ödemesi hesabın bakiyesini kendi para biriminde azaltır (0152 ile sağlanan davranışın çapraz testi).
- **AC-52.** Üç taksitli döviz kalemin taksitleri kalemin para biriminde görünür ve bir taksidin dövizle ödenmesi o taksidi kapatır; son taksitteki kuruş ayrışması kalemi açık bırakmaz.
- **AC-53.** Döviz kaleme avans mahsubu bugünkü ret metniyle engellenir ve yeni metin yazılmaz.

**Metin, liste ve rapor**

- **AC-54.** Kalem listesinin tutar hücresi kalemin para birimindeki tutarı, altında lira karşılığını yazar; alt toplam lira kalır.
- **AC-55.** Yazdırılan raporun kalem satırı döviz tutarı, kuru ve lira karşılığını tek hücrede taşır; bölüm toplamları lira basılır ve sütun sayısı değişmez.
- **AC-56.** Faturanın kendi rakamı aranınca döviz kalem bulunur, lira karşılığı aranınca da bulunur ve neden satırı kalemin para birimini yazar.
- **AC-57.** Borç özetinin tedarikçi satırı lira toplar ve döviz kalem içerdiğini söyler, satır açılınca kalemin döviz tutarı görünür; açık kalemler ve hatırlatıcı satırı kalemin para birimindeki tutarı yazar.
- **AC-58.** Döviz kalemin oluşturma kaydı para birimi, döviz tutar ve kur ayrıntısını taşır; düzenleme kaydının önceki değerleri de taşır.
- **AC-59.** Tanınmayan para birimi taşıyan kalem lira sayılır, ekranda neden yazılmaz ve hiçbir hesap bozulmaz.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap içeren iş saf motorda yazıldı (`gider.js`, `kasa.js`, `doviz.js`) ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Aynı sayıyı üreten ekran ve rapor aynı kaynağı kullanıyor (Dönem Raporu ile 0047 raporu, ödeme penceresi ile Kasa listesi).
- [ ] Yeni kalıcı alanlar dört nokta kuralıyla eklendi ve `db-roundtrip` testine girdi.
- [ ] Yeni veri bölümü yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; bu açıkça yazıldı ve sunucunun bölüm düzeyindeki güveninin yeterli olduğu ölçümle gösterildi.
- [ ] Soft-delete ve çöp kutusu simetrisi etkilenmedi; bu açıkça yazıldı.
- [ ] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı Türkçe kalır (gider raporunun dili değişmez).
- [ ] Para gösterimi çoklu para kuralına uyuyor; tanınmayan para birimi tanımlı biçimde ele alınıyor (lira sayılır, neden yazılmaz; C6/2, plan P4).
- [ ] Lira kalemlerin kıyas altını (`0153-once.json`) spec öncesi kodla üretildi ve birebir geçti.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (boş ve hata durumları dâhil).
- [ ] Sürüm notu yazıldı: önce sunucu bilgisayarı, bütün istemciler güncellenene kadar döviz kalem girilmez.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Kalemin lira karşılığı tek yerde ve bir kez kuruşa yuvarlanarak hesaplanıyor; ikinci çarpım kaynakta yok (tarama).
- [ ] Kur ayrıştırıcısı yaprak modülde; gider motoru 0152'nin modülünü içe almıyor (tarama).
- [ ] Döviz alanlarının tek yazıcısı var ve üç alanı her çağrıda siliyor.
- [ ] Kalemin para birimi tek yardımcıdan okunuyor (tarama).
- [ ] TL kalemin ödeme yolu (0152: bütün açık hesaplar, elle kur) ölçümle değişmemiş gösterildi.
- [ ] Çek yolu (ciro, kendi çekimiz, çok kaleme dağıtım) döviz kalemi nedenle reddediyor.
- [ ] Kapanmanın kuruş kuralı testle sabitlendi: dövizi tam kapatan ödeme lira kalanını da sıfırlıyor.
- [ ] Hesapsız döviz ödemenin alanları yazılıyor ve 0152'nin hesapsız bırakma yasağıyla çelişmediği açıkça yazıldı.
- [ ] Borç özetinin satır ekseni (tedarikçi) ile açık kalemler ve hatırlatıcının satır ekseni (hedef) arasındaki ayrım yazıldı.
- [ ] Yeni kavram `CLAUDE.md`'ye yazıldı.
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
