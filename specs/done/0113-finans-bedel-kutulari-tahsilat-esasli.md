# 0113 — Ödeme işareti olan bedel kutuları yalnız tahsil edilen bedeli gösterir

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 2: plan turu Karar 17–24, 2026-10-27; uygulama commit `f45a356`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Finans ekranının dört bedel kutusu ve KDV alt rakamları: servis ücreti (`src/components/Finance.jsx:174-178`, kart `:637`), parça ücreti ve anlaşmalı servis parçası (`:189-202` servis parçası, `:218-222` yedek parça kargo, kartlar `:638`, `:640`), Extra Kalıp (`:223-230`, kart `:642`); büyük "Toplam Bedel" kartının bu dört payı (`:247`, `:610`); Anlaşmalı Servis detay penceresi (`:391-427`). Tahsil edilmişlik ölçütü var olan tek okuma yolundan gelir (`src/lib/utils.js:685-690` `satisTahsilEdildi`). QA turunda eklenenler: iki paralel birikim kümesi (R14/2), detay penceresinin ödendi sütunu (`:418`), dört kartın ad sabitleri (R16/2) ve bu adları tanıması gereken iki kıyas ayıklaması, `CLAUDE.md`'nin iki yeri (yeni Finans bölümü ve "Printing and export"un Finans Özeti cümlesi). Dokunulmayan ama adıyla yazılanlar: `src/components/settings/SettingsExport.jsx:111-137` (Finans Özeti Excel, C7), `Dashboard.jsx`, model ve bayi kırılımı ile 12 aylık trend (R20/2) |
| **Bağımlı spec'ler** | 0007 (Extra Kalıp borç atıfı, `isPartSaleBorcluMu`), 0040 (çek tahsil edilene kadar gelir sayılmaz), 0079 (tahsil edilecek KDV), 0095 (ücretsiz yedek parça, `isYedekParcaBorcluMu`) |
| **Ters çevrilen kriterler** | **0006 AC-24**: Evrak'tan üretilen yedek parça satışı ödenmemiş doğduğu için "Toplam Parça Ücreti Bedeli" kartında 333 bekleniyor (`tests/ui/evrak-finans-capraz.test.jsx:39`); bu beklenti 0 olur. Kriterin **iddiası** da ters çevrilir: testin adı "Finans ve aylık raporda aynı net tutar" diyor, oysa bundan sonra tahsil edilmemiş kayıtta iki rakam bilinçli olarak ayrışır; test rapor 333 / ekran 0 diye yeniden yazılır ve eşitlik güvencesi "tahsil edilmiş kayıtta" diye daraltılır. Aynı test kartı **adıyla** buluyor (`getByText("Toplam Parça Ücreti Bedeli")`), yani R16/2'nin ad değişimi onu ikinci bir yoldan da kırar. **İki ekran kıyası altını** (`tests/fixtures/0079-ekran-once.json`, `tests/fixtures/0095-ekran-once.json`) Finans ekranının metnini olduğu gibi taşıyor ve ikisinde de ödenmemiş servis ve yedek parça kayıtları var (`0079-veri.js:48,50,55`, `0095-veri.js:5105`), yani hem dört kartın **adı** (Karar 1) hem **tutarı** değişir: iki kıyasın finans bölümünden bu dört kart ayıklanır (0110 ve 0092'de uygulanan ayıklama deseni). Aylık Faaliyet Raporu değişmediği için 0079 ve 0095'in **motor** kıyasları (`0079-tevkifatsiz-once.json`, `0095-ucretsizsiz-once.json`) etkilenmez. Ödeme işareti taşımayan diğer Finans testleri (`finance-yedek-parca`, `finance-sahipsiz`, `finance-kart-detay`, `bos-durum`) düzeneklerinde kayıtlar ödendi işaretli olduğu için dokunulmadan geçer (ölçüldü) |

---

## Intent

Kullanıcı bir Extra Kalıp satışını yanlışlıkla ödendi işaretledi, sonra geri aldı ve Finans'taki Extra Kalıp kutusundaki rakamın düşmesini bekledi. Düşmedi. Araştırdım: kutu baştan sona tahakkuk esaslı, ödeme durumunu hiç okumuyor; ödendi işaretlemek o rakamı yükseltmiyor, yükselten şey satışın kaydedilmesiydi. Sonra sordu: aynı durum diğer kutularda da var mı. Var, altı bedel kartının altısı da böyle.

Takım Yöneticisi bu kutuların ne cevaplaması gerektiğine karar verdi: "ne kadar sattık" değil, "ne kadar tahsil ettik". Kapsamı da kendisi çizdi: **ödendi ve ödenmedi işareti olan** kutular. Bu ölçüt makina kutularını kendiliğinden dışarıda bırakıyor, çünkü orada böyle bir işaret yok, tahsilat ödeme satırlarıyla izleniyor ve kısmi olabiliyor.

Bu iş bittiğinde ödenmedi işaretlenen bir servis, parça, yedek parça ya da Extra Kalıp kaydı kendi bedel kutusundan çıkacak, ödendi işaretlenince geri girecek ve dört kutunun adı ne saydığını söyleyecek. Tahsil edilmeyen bedel bugün olduğu gibi Toplam Alacak kartında görünmeye devam edecek, yani hiçbir bilgi kaybolmayacak.

---

## Requirements

### A. Kural ve kapsam

- **R1.** Şu **dört** bedel kutusu yalnız tahsil edilmiş kayıtları sayar: Toplam Servis Ücreti Bedeli, Toplam Parça Ücreti Bedeli, Toplam Anlaşmalı Servislere Satılan Parça Bedeli, Toplam Extra Kalıp Satış Bedeli. Kapsam ölçütü Takım Yöneticisi'nin koyduğu ölçüttür: kaydın ödendi ve ödenmedi işareti vardır.
- **R2.** "Tahsil edilmiş" ölçütü **"satış kaydının bedeli tahsil edildi mi" sorusunun var olan tek tanımıdır** (`satisTahsilEdildi`): nakit ve havalede ödendi işareti, çekte çekin tahsil edilmiş olması, kredi kartında blokajın bitmiş olması. Yeni bir tanım yazılmaz ve hiçbir kutu kendi kuralını kurmaz.
- **R2/2.** Bu, "para hangi hesaba girdi" sorusunun tanımı **değildir**: Kasa'nın `tahsilatSayilirMi`'si daha dardır, ek olarak kaydın bir kasa hesabına bağlı olmasını ister ve çek durumunu çek kaydından okur (`src/lib/kasa.js:41-43`, ölçüm 15). Yani hesabı atanmamış, tahsil edilmiş bir kayıt bu kutulara girer ama hiçbir Kasa bakiyesinde görünmez (Kasa'nın "hesabı belirtilmemiş" iş listesinde durur, 0058). İki tanım birbirine çevrilmez; fark bilinen özelliktir (Karar 11, AC-38).
- **R2/3.** Ödeme yöntemi **boş** olan kayıt nakit gibi davranır: ödendi işaretliyse tahsil edilmiş sayılır (`utils.js:686-689`). Bugünkü veride bu küme büyüktür (ölçüm 5: Extra Kalıp'ta 488, serviste 649 kayıt yöntemsiz), yani kuralın asıl çalıştığı dal budur.
- **R2/4.** Kutular ölçüte **`bugun` argümanı geçmez**: alacak tarafı da geçmiyor, yani iki taraf aynı varsayılanı (`today()`, UTC) okur ve R4'ün tamlayıcılığı gün sınırında da bozulmaz (ölçüm 13, Karar 10, AC-37). Ölçütü yerel güne çevirmek iki tarafta birlikte yapılacak ayrı iştir (X8).
- **R3.** Ödendiden ödenmediye dönülünce ilgili kutudaki rakam aynı anda düşer, tersi durumda artar. Hiçbir değer saklanmaz, hesap okuma anındadır.
- **R4.** Bir kayıt kendi bedel kutusu ile Toplam Alacak kartında **birden** sayılmaz: tahsil edilmişse kutuda, edilmemişse alacakta. Bu **kayıt düzeyinde** kendiliğinden sağlanır, çünkü alacak tarafı bugün de aynı tanımı okuyor (servis doğrudan `satisTahsilEdildi`, Extra Kalıp `kalipBorcTarafi` üzerinden `isPartSaleBorcluMu`, yedek parça `isYedekParcaBorcluMu`).
- **R4/2.** İki kartın **tutarı** toplanıp tahakkuk toplamına varılmaz, üç ayrım vardır (ölçüm 14): kutular tarih süzgecine tabidir, Toplam Alacak **tarih filtresinden bağımsız anlık bakiyedir**; kutulardan yansıtılan kredi kartı komisyonu düşülür, alacaktan düşülmez; kutular KDV hariç, alacak KDV dâhil gösterilir. R16'nın yönlendirme cümlesi Toplam Alacak'ın tarih filtresinden bağımsız olduğunu da söyler (Karar 11).
- **R5.** Servis kaydının **tek** ödeme işareti hem servis ücretini hem parça ücretini kapsar (bugünkü model, ayrı parça anahtarı yok): servis ödenmedi yapılınca işçilik Servis Ücreti kutusundan, parçası Parça Ücreti ya da Anlaşmalı Parça kutusundan **birlikte** düşer.
- **R6.** Yedek parça (kargo) satışının kendi işareti vardır: müşteri alıcılı satış Parça Ücreti kutusundan, bayi ve anlaşmasız dış firma alıcılı satış Anlaşmalı Parça kutusundan düşer.
- **R7.** Kutuların bugünkü **kapsam** kuralları aynen korunur, yalnız küme tahsil edilmişlerle daralır: anlaşmalı servis ayrımı (`isAltuntasServisi`), ücretli parça ölçütü (`isParcaUcretliMi`, `altuntasParcaBedeli`), yansıtılan kredi kartı komisyonunun düşülmesi, çoklu para birimi ve bilinmeyen para biriminin TL kovasına düşmesi.
- **R7/2.** Servis ücreti kutusunun kendi ölçütü de korunur ve adıyla yazılıdır: kutu `(type === "Garanti Dışı" || type === "Periyodik Bakım") && isAltuntasServisi` ile süzer (`Finance.jsx:174`), `isServisUcretliMi` ile değil; aradaki tek fark "ücret > 0" şartıdır ve tutarı sıfır olduğu için etkisizdir (ölçüm 22). Bu ölçüt bu işte değiştirilmez.
- **R8.** Ücretsiz işaretli kayıt hiçbir kutuya girmez (bedeli tahsil edilmiş bir satış değildir). Bu, Finans ile aylık rapor arasındaki bugünkü Extra Kalıp tutarsızlığını da kapatır.
- **R8/2.** Bu kural tahsil süzgecinden **gelmez, ayrı bir kuraldır** ve yalnız Extra Kalıp kolunda yeni bir denetim ister: Extra Kalıp döngüsünde bugün hiçbir ücretsiz denetimi yok (`Finance.jsx:224-229`), aylık rapor ise ücretsizi atıyor (`aylikRapor.js:143`), yani ücretsiz işaretli ve **ödendi** işaretli bir kalıp kaydı tahsil süzgecinden de geçer (ölçüm 11). Ölçüt `satisUcretsizMi`'dir; yedek parçada ek denetim gerekmez (`yedekParcaBedeli` ücretsizde sıfır döner, 0095 C1). Uygulamadan önce ücretsiz işaretli ve ücreti sıfırdan büyük Extra Kalıp kaydının adedi ve TL toplamı **ölçülür**; sıfır değilse AC-31 ve ölçüm 4 o rakama göre daraltılır ve sürüm notuna girer (Karar 8).

### B. Dışarıda kalan kutular

- **R9.** Makina bedel kutuları **değişmez**: Toplam Fabrika Satış Bedeli ve Toplam Fatura Bedeli bugünkü gibi satış anında sayar. Gerekçe R1'in ölçütüdür: makinada ödendi işareti yok, tahsilat ödeme satırlarıyla izleniyor ve kısmi olabiliyor.
- **R10.** Büyük "Toplam Bedel" kartının dört bileşeni yeni kuralı izler, **makina bileşeni tahakkuk kalır**; kartın alt yazısı bu ayrımı söyler (Karar 2).
- **R10/2.** Kartın **KDV satırı kendi bileşenlerinin KDV'sidir** (makina KDV'si + tahsil edilmiş dört bileşenin KDV'si), "Ödenmesi Muhtemel KDV" kartının rakamı değil. Bugün o satır doğrudan KDV kartının rakamını basıyor (`Finance.jsx:609`, `kdvObj={odenmesiMuhtemel}`) ve kartın neti de o rakam çıkarılarak hesaplanıyor; dört bileşen daralırken bu bağ korunursa kart kendi bileşenlerinden fazla KDV düşer ve rakam eksik, tek kayıtlı dönemde negatif çıkar (ölçüm 10, Karar 7, AC-16, AC-32, AC-33).
- **R11.** "Toplam Kredi Kartı ile Satış" ve "Toplam Ödenen Banka Komisyonu" kartları **değişmez** (Karar 5): banka komisyonu kart işleminin yapıldığı anda kesilir, bizim tahsilat işaretimizi beklemez, bu yüzden komisyonun tabanı olan kart satışı tahakkuk kalmalıdır ki iki kart birbirini tutsun.
- **R12.** "Toplam Ödenen Komisyon" kartı değişmez (makinaya bağlı, ödendi işareti yok).

### C. KDV ve adetler

- **R13.** "Ödenmesi Muhtemel KDV" kartı **tahakkuk kalır**: Faturalı Yurtiçi satışta KDV fatura kesildiğinde doğar, tahsilat beklemez (Karar 3).
- **R14.** Her kutunun altındaki KDV rakamı kutuyla **aynı kümeden** hesaplanır (yalnız tahsil edilmiş kayıtların KDV'si), yoksa kutu ile altındaki rakam birbirini tutmaz. Bu rakamın "Ödenmesi Muhtemel KDV" kartından küçük olması beklenen davranıştır ve alt yazıda yazılıdır.
- **R14/2.** R13 ile R14 aynı değişkenle sağlanamaz, bu yüzden **iki paralel birikim kümesi** yazılır (Karar 7). Bugün kutular brüt birikiyor (`bedel + kdv`), ekrandaki rakam `subObj` ile netleniyor (`Finance.jsx:254-258`) ve aynı dört KDV değişkeni hem bu netlemeye hem "Ödenmesi Muhtemel KDV" kartına giriyor (`:147`, ölçüm 10). Bundan sonra: **tahsil kümesi** dört kutunun ana tutarını, kendi KDV satırlarını ve "Toplam Bedel" kartının dört bileşenini ve KDV satırını besler; **tahakkuk kümesi** yalnız "Ödenmesi Muhtemel KDV" kartını besler. Tek bir süzme eklenirse KDV kartı da düşer (AC-17 kırılır), yalnız ana tutar süzülürse net gösterim bozulur.
- **R15.** Adet kartları **tahakkuk kalır**: Toplam Satılan Makina, Toplam Satılan Kalıp, İlk Satışta Verilen Toplam Kalıp, Satılan Extra Kalıp ve Satılan Yedek Parça. Satılan adet satılan adettir, tahsilata bağlı değildir.

### D. Adlar, çıktılar ve pencere

- **R16.** Dört kutunun adı ve alt yazısı tahsil edilen bedeli saydığını ve tahsil edilmeyenin Toplam Alacak kartında olduğunu söyler (Karar 1).
- **R16/2.** Dört ad ve ortak alt yazı eki **spec'te sabittir** (Karar 9), uygulama turunda yeniden seçilmez: "Tahsil Edilen Servis Ücreti", "Tahsil Edilen Parça Ücreti", "Tahsil Edilen Anlaşmalı Servis Parçası", "Tahsil Edilen Extra Kalıp Bedeli"; ortak ek "tahsil edilen tutar; tahsil edilmeyen, tarih filtresinden bağımsız Toplam Alacak kartında". Adlar ve ek dışa verilen sabitlerden okunur, kaynakta düz metin olarak ikinci kez yazılmaz (AC-35). Ad üç mekanizmada kullanılıyor (ölçüm 12): iki kıyas ayıklaması ve `evrak-finans-capraz`'ın metin sorgusu; ayıklama **eski ve yeni adı birlikte** tanır, çünkü aynı fonksiyon hem eski altına hem yeni çıktıya uygulanıyor (C8, AC-36).
- **R17.** Aylık Faaliyet Raporu **değişmez** (tahakkuk kalır). İki rakam artık farklı soruları cevaplar ve adlarında bu yazılıdır, bu yüzden "aynı sayıyı üreten iki ekran aynı kaynağı kullanır" kuralı ihlal edilmez.
- **R18.** Anlaşmalı Servis detay penceresi bütün satırlarını göstermeye devam eder (iş listesi değeri korunur) ve ödeme sütunu durur; pencereye kartla tutan bir **tahsil edilen alt toplamı** eklenir (Karar 6).
- **R18/2.** Sütun **türetilmiş ölçütten** okunur ve başlığı "Tahsil edildi" olur (Karar 14). Bugün satır ham işareti taşıyor (`odendi: s.odendi`, `Finance.jsx:418`), alt toplam ise `satisTahsilEdildi` ile hesaplanacak; ikisi ayrı kalırsa çeki tahsil edilmemiş ya da kart blokajı süren bir satır sütunda "Ödendi" görünüp alt toplama girmez ve AC-24 ile AC-25 görünürde çelişir (ölçüm 17). Ödendi işaretli ama tahsil edilmemiş satırda kısa neden yazılır (çek tahsil edilmedi / kart blokajı sürüyor); satır süzülmez, iş listesi değeri korunur (AC-41).
- **R19.** Tarih süzgeci bugünkü kuralı korur: kutular kaydın **satış ya da servis tarihine** göre süzülür, tahsilat tarihine göre değil (Karar 4).
- **R19/2.** Bunun kabul edilen sonucu: **kapanmış bir dönemin kutu rakamı zamanla değişir.** Ocakta satılıp martta tahsil edilen kayıt şubatta bakıldığında ocak kutusunda yoktur, nisanda vardır (Karar 12, AC-39). Kutunun alt yazısı bu yüzden "bu dönemde satılanların bugüne kadar tahsil edileni" anlamını taşır; arşiv belgelerinin (aylık rapor, Finans Özeti Excel) tahakkuk kalmasının gerekçesi de budur (R17, C7).
- **R20.** Yeni kalıcı alan, veri bölümü, izin, sunucu kuralı ve göç yok. Kasa, Analiz, müşteri detayı ve dışa aktarma rakamları değişmez.
- **R20/2.** Değişmeyenler listesine üçü daha adıyla girer: **Anasayfa** (para blokları zaten borç ve çek tabanlı, ödeme durumunu okuyor; `Dashboard.jsx:153-170`, `:241-256`, ölçüm 20), **model ve bayi kırılımı** ile **12 aylık trend** (yalnız makina satışından hesaplanıyor, `Finance.jsx:343-368`, ölçüm 21). Bu üçü bu turda dokunulmaz.

### E. QA turunda eklenen kurallar (2026-10-26)

- **R21.** Eski `partSales tur:"YedekParca"` satırlarına **dokunulmaz**: bugün hiçbir bedel kutusuna girmiyorlar, yalnız adet, banka komisyonu ve kredi kartı satışı kartlarında sayılıyorlar (`Finance.jsx:126`, `:271-272`, `:282`, ölçüm 19). Bu tür artık hiçbir yoldan üretilmiyor (0006 C2), bu yüzden bu turda süzme de eklenmez, kutuya da eklenmez.
- **R22.** İki birikim kümesinin adları baştan ayrılır (tahsil / tahakkuk) ve memo'nun **kullanılmayan brüt dönüşleri** temizlenir: kartlar netleri okuyor, brütler dışa veriliyor ama çizimde kullanılmıyor (`Finance.jsx:372-378`, ölçüm 23). Böylece iki küme eklenirken ölü ad çoğalmaz.
- **R23.** Kart bloğu **her zaman çizilir**: boş durum kutusu yalnız model, satıcı ve iki detay listesindedir (`:666`, `:688`, `:718`, `:760`, ölçüm 18). Dönemde kayıt olup hiçbiri tahsil edilmemişken de kartlar çizilir, sıfır gösterir ve hata vermez; model ile satıcı boş durumlarının bugünkü ölçütü değişmez (Karar 15, AC-42).

---

## Zorunlu kısıtlar

- **C1.** Tahsil edilmişlik ölçütü `src/lib/utils.js`'teki tek tanımdan okunur; Finans dört kutunun hiçbirinde elle ödeme koşulu yazmaz (kaynak taraması).
- **C2.** Kutuların kapsam kuralları (anlaşmalı servis ayrımı, ücretli parça, yansıtılan komisyon) yeniden yazılmaz, yalnız süzme eklenir. Böylece tahsil edilmiş kayıtların rakamı bugünkü rakamla birebir aynı kalır.
- **C3.** KDV'nin doğduğu an tahsilata bağlanmaz (R13). Bu bir vergi doğruluğu kuralıdır ve kutuların kuralı onu ezmez.
- **C4.** Aylık Faaliyet Raporu, Kasa, Analiz ekranı, müşteri detayı ve dışa aktarma dosyaları değişmez.
- **C5.** Dört kutunun biri değişip diğeri kalmaz: kural dördüne aynı turda uygulanır, yoksa ekran iki esası aynı satırda gösterir.
- **C6.** Servisin tek ödeme işaretinin iki kutuyu birlikte etkilemesi (R5) bugünkü veri modelinin sonucudur; parça için ayrı bir ödeme işareti **açılmaz**.
- **C7.** "Finans Özeti" Excel'i (`SettingsExport.jsx:111-137`) **tahakkuk kalır ve dokunulmaz**, yani ekran ile Excel bundan sonra farklı soruları cevaplar. Bu ayrışma spec'te ve `CLAUDE.md`'de bilinen sınır olarak yazılır. Çapraz testi ekrana değil aylık rapora bağlı olduğu için yeşil kalır (`finans-ozeti-export.test.js`), yedek parça kargo Excel'de hiç yok (ölçüm 16). Excel satır adlarının esası söyleyecek şekilde düzeltilmesi X9'dur.
- **C8.** Dört kartın adı tek yerden (dışa verilen sabitler) okunur ve kıyas ayıklaması **eski ve yeni adı birlikte** tanır; aynı ayıklama fonksiyonu hem spec öncesi altına hem bugünkü çıktıya uygulanıyor (`satis-tevkifat-0079-ekran.test.jsx:100`), yalnız yeni adı tanıyan bir ayıklama altındaki kartı bırakıp sahte fark üretir.
- **C9.** Detay penceresinin kendi tarih süzgeci kopyası (`Finance.jsx:391-406`, `inRange`'in ikizi) olduğu gibi kalır; alt toplam eklenirken **üçüncü bir kopya yazılmaz** (ölçüm 23). İki kopyayı tek yardımcıya indirmek ayrı iştir.

---

## Kapsam dışı

- **X1.** Makina bedel kutularının tahsilat esasına çevrilmesi — *neden:* Takım Yöneticisi'nin kapsam ölçütü "ödendi ve ödenmedi işareti olanlar" ve makinada böyle bir işaret yok; tahsilat kısmi olduğu için o kutu "satış bedeli eksi kalan borç" demektir ve Toplam Alacak ile ilişkisinin yeniden tanımlanmasını gerektirir. Ölçtüm: açık bakiyeli 8 makinada 2.952.131 TL var, yani ekranın en büyük rakamı burada ve kendi spec'ini hak ediyor (açık bulguya yazıldı).
- **X2.** "Toplam Kredi Kartı ile Satış" ve "Toplam Ödenen Banka Komisyonu" — *neden:* R11'in gerekçesi; banka komisyonu kart işleminde kesilir, tabanının tahakkuk kalması gerekir.
- **X3.** "Toplam Ödenen Komisyon" kartının adının düzeltilmesi — *neden:* adı "Ödenen" olduğu hâlde satışta kayıtlı komisyonu topluyor; ayrı bir adlandırma işi, açık bulguya yazıldı.
- **X4.** İkinci bir "tahsil edilen" satırı ya da kartı eklenmesi — *neden:* Takım Yöneticisi bunu açıkça reddetti, ihtiyaç kutunun kendisinin düşmesi.
- **X5.** Tarih süzgecinin tahsilat tarihine çevrilmesi — *neden:* o zaman kutular nakit akışı rakamına döner, o soruyu Kasa ekranı ve aylık raporun tahsilat bölümü zaten cevaplıyor.
- **X6.** Anlaşmalı Servis detay penceresinin eksik kapsamı düzeltilmez — *neden:* pencere yalnız servis kayıtlarını listeliyor, kartın içindeki bayi ve dış firma yedek parça satışlarını listelemiyor; bu bugün de var olan ve bu spec'ten bağımsız bir eksik, açık bulguya yazıldı. R18'in alt toplamı pencerenin kendi kapsamı için hesaplanır.
- **X7.** Parça ücreti için ayrı bir ödeme işareti açılması — *neden:* C6; veri modeli değişikliği ve kendi spec'i gerekir.
- **X8.** Tahsil ölçütünün gününün yerel güne çevrilmesi — *neden:* `satisTahsilEdildi`'nin varsayılanı `today()` ve UTC (ölçüm 13); kutular da alacak tarafı da aynı varsayılanı okuduğu için tamlayıcılık bozulmuyor. Yerel güne geçmek iki tarafta **birlikte** yapılmalıdır, yoksa gün sınırında bir kayıt üç saat boyunca iki yerde ya da hiçbir yerde görünür. Açık bulguya yazıldı.
- **X9.** "Finans Özeti" Excel'inin satır adlarının esası söyleyecek şekilde düzeltilmesi — *neden:* C7; Excel tahakkuk kalıyor ve adları kart adlarına yakın, ama dosyayı bu turda değiştirmek çapraz testinin dayanağını (aylık rapor) tartışmaya açar. X3 ile aynı adlandırma işidir, açık bulguya yazıldı.

---

## Ölçümler (2026-10-26 yedeği)

1. **Hiçbir bedel kutusu ödeme durumunu okumuyor.** Finans'ın hesap bloğunda (`Finance.jsx:140-235`) `odendi`, `tahsilEdildi` ve `satisTahsilEdildi` bir kez bile geçmiyor. Ödeme durumunu okuyan tek kart Toplam Alacak (`:312`, `:319`, `:324`).
2. **Alacak tarafı zaten aynı tanımı kullanıyor.** Servis `satisTahsilEdildi`, Extra Kalıp `isPartSaleBorcluMu`, yedek parça `isYedekParcaBorcluMu`; üçü de aynı çekirdeği okuyor. Yani R2 yeni bir kural getirmiyor, var olan kuralı kutulara da uyguluyor ve R4 kendiliğinden sağlanıyor.
3. **Bu kuralın bugünkü etkisi sıfırdır.** Kutu kutu: Extra Kalıp 1211 satışın tamamı tahsil edilmiş, **0 TL**; ücretli 654 servis kaydının tamamı tahsil edilmiş, **0 TL**; yedek parça (kargo) satışlarının 15'i tahsil edilmemiş ama **hepsi garanti içi ücretsiz verilmiş** kayıtlar, yani bedelleri zaten sıfır ve bugün de kutulara girmiyorlar (`yedekParcaBedeli` ücretsizde sıfır döner, 0095 C1), **0 TL**; Anlaşmalı Parça kutusunda **0 TL**.
3/2. **Ölçüm düzeltmesi (2026-10-26).** İlk turda bu etkiyi 17 kayıt ve 3.250 TL ölçmüştüm. Ölçüm betiğim kredi kartı yöntemli ama komisyon anlık görüntüsü olmayan kaydı tahsil edilmemiş sayıyordu; kural bunun tersini söylüyor (`kartTahsilEdildiMi` anlık görüntü yokken tahsil edilmiş sayar, `krediKarti.js:158-166`). O iki kayıt (3.250 TL) tahsil edilmiştir ve kutuda kalır. Doğru sayı yukarıdaki sıfırlardır.
4. **Geriye dönük hiçbir rakam oynamaz.** Kural yürürlüğe girdiği gün dört kutunun hiçbirinde rakam değişmez; kutular yalnız bundan sonra ödenmedi yapılan kayıtları düşürür. Bu, kuralı şimdi koymanın en ucuz zaman olduğunu söylüyor.
5. **Yöntem dağılımı çek ve kart dallarını bugün çalıştırmıyor.** Extra Kalıp: 723 nakit, 488 yöntemi boş, çek ve kart sıfır. Ücretli servis: 649 yöntemi boş, 5 kredi kartı. Yedek parça: 889 nakit, 80 boş, 2 kredi kartı. R2'nin çek ve kart dalları eksiksiz yazılır ama bugünkü veride nadiren çalışır.
6. **Makina tarafı ayrı mekanizma.** 1266 canlı makina kaydının 8'inde açık bakiye var, toplamı 2.952.131 TL. Makinada ödendi işareti yok; tahsilat `payments` satırlarıyla izlenir ve kısmi olabilir (X1).
7. **TL cirosu referansı:** canlı Extra Kalıp satışlarının TL ücret toplamı 7.384.368 TL ve tahsil edilmiş kümenin toplamı aynı.
8. **Detay penceresinin kapsamı kartla tutmuyor** (bu spec'ten önce de): "Toplam Anlaşmalı Servislere Satılan Parça Bedeli" kartı anlaşmalı servis parçası **ve** bayi/dış firma yedek parça satışlarını topluyor, detay penceresi ise yalnız servis kayıtlarını listeliyor (`:409-410`). X6 ve açık bulgu.
9. **Bu kutuların ödeme işaretine bağlı testi yok.** Finans'ın mevcut testleri (`tests/ui/finance-yedek-parca.test.jsx`, `finance-sahipsiz.test.jsx`, `finance-gider-kdv.test.jsx`) kart rakamlarını ödeme durumuna göre sınamıyor; düzeneklerinde ödendi taşıyan kayıtlar varsa beklentileri güncellenecek.

### QA turu ölçümleri (2026-10-26)

10. **KDV birikimleri kutularla KDV kartı arasında paylaşılıyor.** Kutular brüt birikiyor (`bedel + kdv`), ekranda gösterilen rakam `subObj(brüt, kdv)` ile netleniyor (`Finance.jsx:254-258`); aynı dört KDV değişkeni (`kdvServis`, `kdvParca`, `kdvAnlasmaliParca`, `kdvKalip`) hem bu netlemeye hem `odenmesiMuhtemel`e giriyor (`:147`), ve "Ödenmesi Muhtemel KDV" kartı ile **"Toplam Bedel" kartının KDV satırı** aynı rakamı basıyor (`:609`, `:611`). `toplamCiromuzNet = toplamCiromuz − odenmesiMuhtemel` aynı bağı büyük kartta tekrarlıyor. R14/2 ve R10/2 bu yüzden var.
11. **Extra Kalıp kolunda ücretsiz denetimi yok, aylık raporda var.** `Finance.jsx:224-229` `parseMoney(p.ucret)`'i koşulsuz topluyor; `aylikRapor.js:143` `if (p.ucretsizMi) return;` ile atıyor. Yani bugünkü ayrışma gerçek ve ücretsiz işaretli, ödendi işaretli bir kalıp kaydı tahsil süzgecinden de geçer (R8/2). Yedek parçada böyle bir dal gerekmiyor: `yedekParcaBedeli` ücretsizde sıfır döner (`utils.js:729`).
12. **Kart adı üç mekanizmada kullanılıyor.** İki kıyas ayıklaması aynı fonksiyonu hem spec öncesi altına hem bugünkü çıktıya uyguluyor (`satis-tevkifat-0079-ekran.test.jsx:100`) ve `evrak-finans-capraz.test.jsx:39` kartı metinle buluyor (`getByText("Toplam Parça Ücreti Bedeli")`). Ad belirsizken plan yazılamaz (R16/2, C8).
13. **Tahsil ölçütünün günü UTC.** `utils.js:685` `satisTahsilEdildi = (s, bugun = today())`; `today()` UTC döndürür ve Türkiye'de 00:00-03:00 arası dünü verir. Alacak tarafı hiçbir yerde `bugun` geçmiyor (`Finance.jsx:312`, `:319`, `:324` ve `isYedekParcaBorcluMu`), kart dalı da bu günle karşılaştırıyor (`krediKarti.js:158-166`).
14. **Kutular dönemsel, Toplam Alacak anlık.** Alacak tarih süzgecinden bağımsız ve kartın alt yazısı bunu söylüyor (`Finance.jsx:311`, `:611`); kutulardan yansıtılan komisyon düşülüyor (`:205-215`, `:221`, `:227`), alacaktan düşülmüyor; kutular KDV hariç, alacak KDV dâhil.
15. **Kasa'nın tahsilat ölçütü daha dar.** `kasa.js:41-43` `tahsilatSayilirMi` ek olarak `hesapId != null` istiyor ve çek durumunu çek kaydından okuyor (`cekDurumuOf`). Yani "tahsil edildi" sorusu uygulamada iki ayrı yerde iki ayrı kapsamla cevaplanıyor (R2/2).
16. **Finans Özeti Excel'i ayrı bir dünya.** Satır adları kart adlarına yakın ("Toplam Servis İşçilik Ücreti (KDV hariç)", "Toplam Extra Kalıp Satışı", "Toplam Anlaşmalı Servise Parça Ücreti", `SettingsExport.jsx:111-137`), yedek parça kargo Excel'de hiç yok ve çapraz testi aylık rapora bağlı, ekrana değil (C7, X9).
17. **Detay penceresi ham işareti taşıyor.** Satır nesnesi `odendi: s.odendi` yazıyor (`Finance.jsx:418`), yani sütun ile kartın ölçütü ayrı (R18/2).
18. **Finans'ta kart bloğu koşulsuz çiziliyor.** `BosDurum` yalnız model, satıcı ve iki detay listesinde (`:666`, `:688`, `:718`, `:760`); kayıt olup hiçbiri tahsil edilmemiş hâl bu işin yarattığı yeni durumdur (R23).
19. **Eski `partSales tur:"YedekParca"` hiçbir bedel kutusunda yok.** Yalnız adet (`:126`), banka komisyonu (`:271-272`) ve kredi kartı satışı (`:282`) kartlarında sayılıyor (R21).
20. **Anasayfa'nın para blokları zaten ödeme durumunu okuyor.** Borçlu bayi ve servis kırılımı `isParcaBorcluAnlasmaliFirmaya` / `isYedekParcaBorcluMu` / `kalipBorcTarafi` ile (`Dashboard.jsx:153-170`), çek hatırlatıcısı `tahsilEdildi` ile (`:241-256`). Bu ekran kendiliğinden kapsam dışı (R20/2).
21. **Model, bayi ve trend yalnız makina satışından.** `Finance.jsx:343-368`: üçü de `customers` üzerinden `gercekSatisBedeli` okuyor, servis, parça ve kalıp rakamlarını hiç görmüyor (R20/2).
22. **Servis ücreti kutusunun süzgeci `isServisUcretliMi` değil.** Kutu tür + `isAltuntasServisi` yazıyor (`:174`), yardımcı ise ek olarak ücret > 0 istiyor (`utils.js:625-626`); fark tutarı sıfır kayıtlarda etkisiz (R7/2).
23. **İki yapısal kopya.** Memo brüt birikimleri de dışa veriyor ama kartlar netleri okuyor (`:372-378`); detay penceresi tarih süzgecinin ikinci kopyasını taşıyor (`:391-406`). R22 ilkini temizler, C9 ikincisini olduğu yerde bırakır.
24. **Kaynak notu.** Ölçüm 3, 5, 6 ve 7'nin dayanağı olan 2026-10-26 yedeği depoda yok, bu yüzden QA turunda yeniden doğrulanamadı; yukarıdaki on beş ölçümün hepsi **kaynak kodundan** alındı ve satır atıflarıyla yazıldı. R8/2'nin istediği ücretsiz Extra Kalıp ölçümü yedekle birlikte yapılacak ve ölçüm 11'in altına yazılacak.
25. **R8/2 ölçümü (plan turu, 2026-10-27): ölçülemedi.** Uygulama turunda gerçek veri yedeği verilmedi; uygulamanın veritabanı şifreli ve gerçek veriye dokunulmadı. Kural sıfır kayıtta da doğru çalışır (AC-13, AC-34 testli) ve kayıt yolu işareti hiç açmıyor (`kalipSatisi.js`); bu yüzden etkinin sıfır olması beklenir ama kanıtlanmadı. Sürüm notu bunu söyler (Karar 21).

---

## Kararlar (Takım Yöneticisi, 2026-10-26)

Takım Yöneticisi 2026-10-26'da **altı kararın hepsini analistin önerisiyle** verdi. Kapsam ölçütünü de kendisi koydu ("ödendi ve ödenmedi işareti olanlar"), bu yüzden makina kutuları R9 ve X1 ile dışarıda. Aşağıdaki maddeler verilen kararlardır; gerekçeleri kayda geçirilmiştir.

**Karar 1. Dört kutunun adı değişsin mi?**
**Karar: evet.** Kutular artık satış bedeli saymadığı için bugünkü adlar yanlış olur ("Toplam Servis Ücreti Bedeli" gibi). Adların tahsil edileni söylemesi hem doğru olur hem aylık raporla çelişki iddiasını ortadan kaldırır: iki rakam farklı soruları cevaplar ve adlarında bu yazılıdır. Ad değişmezse kullanıcı aynı adı taşıyan iki farklı rakamla (ekran ve rapor) karşılaşır. Ad önerilerini uygulama turunda size liste hâlinde getiririm.

**Karar 2. "Toplam Bedel" kartı karışık mı kalsın?**
**Karar: evet, ama alt yazısında yazılı olsun.** Kartın beş bileşeninin dördü tahsilat, makina bileşeni tahakkuk olur. Bu bilinçli bir sapmadır; alternatifi makina kutularını da çevirmektir ki o X1 gereği ayrı spec. Kartın alt yazısı "makina bedeli hariç tahsil edilen" ayrımını söylemezse kart açıklanamaz bir rakam olur.

**Karar 3. "Ödenmesi Muhtemel KDV" kartı tahakkuk kalsın mı?**
**Karar: evet.** Faturalı Yurtiçi satışta KDV fatura kesildiğinde doğar, tahsilat beklemez. Tahsilata bağlarsak devlete borçlu olduğunuz KDV olduğundan az görünür ve kart yanlış vergi kararına yol açar. Kutuların altındaki küçük KDV rakamları ise kutuyla aynı kümeden gelir (R14) ki her kutu kendi içinde tutarlı olsun; ikisinin farklı olması beklenen davranıştır ve alt yazıda yazılır.

**Karar 4. Tarih süzgeci satış tarihinde mi kalsın?**
**Karar: kalsın.** Kutular yanlarındaki adet kartlarıyla aynı dönemi göstermeli; tahsilat tarihine geçmek kutuları nakit akışı rakamına çevirir ve o soruyu Kasa ekranı ile aylık raporun tahsilat bölümü zaten cevaplıyor. Bu seçimle kutular "bu dönemde satılanların tahsil edileni" sorusunu cevaplar.

**Karar 5. Kredi kartı kartları dışarıda mı kalsın?**
**Karar: evet.** "Toplam Kredi Kartı ile Satış" ile "Toplam Ödenen Banka Komisyonu" birbirinin tabanı ve karşılığıdır; banka komisyonu kart işleminin yapıldığı anda kesilir, bizim ödendi işaretimizi beklemez. Tabanı tahsilata bağlarsak komisyon kartı tabansız kalır ve iki kart birbirini tutmaz. İkisi de tahakkuk kalmalı.

**Karar 6. Anlaşmalı Servis detay penceresi ne göstersin?**
**Karar: bütün satırlar kalsın, pencereye tahsil edilen alt toplamı eklensin.** Pencerenin ödendi sütunu var ve tahsil edilmemişi görmek bir iş listesi değeri; satırları süzmek o değeri siler. Alt toplam eklenince kullanıcı kartla pencereyi karşılaştırıp tutturabilir.

### QA turunda verilen kararlar (2026-10-26)

QA boşluk turunda yirmi bir boşluk çıktı ve Takım Yöneticisi 2026-10-26'da **hepsini analistin önerisiyle** kapattı. Aşağıdaki maddeler verilen kararlardır.

**Karar 7. KDV birikimleri nasıl ayrılır?**
**Karar: iki paralel birikim kümesi** (R14/2, R10/2). Tahsil kümesi dört kutuyu, kendi KDV satırlarını ve "Toplam Bedel" kartının dört bileşenini ve KDV satırını besler; tahakkuk kümesi yalnız "Ödenmesi Muhtemel KDV" kartını besler. Gerekçe: bugün aynı dört değişken iki işi birden yapıyor (ölçüm 10), yani R13 ile R14 tek değişkenle sağlanamaz; tek süzme eklenirse KDV kartı da düşer, yalnız ana tutar süzülürse kutular eksik ve tek kayıtlı dönemde negatif çıkar. "Toplam Bedel" kartının KDV satırının kendi bileşenlerinden gelmesi bir ürün kararıdır ve kartın net artı KDV toplamının brütüne eşit kalmasını sağlar.

**Karar 8. Ücretsiz kuralı nereden gelir ve "etki sıfır" iddiası ne olur?**
**Karar: ayrı bir kural olarak yazılır ve ölçülür** (R8/2). Gerekçe: tahsil süzgeci ücretsiz işaretli ve ödendi işaretli kaydı geçirir (ölçüm 11), yani AC-13 ancak açık bir ücretsiz denetimiyle sağlanır; o denetim de AC-31'in "bugünkü etki sıfır" iddiasını ölçülmemiş bir eksenle çeliştirir. Ölçüm sıfır çıkmazsa AC-31 ve ölçüm 4 o rakama göre daraltılır ve sürüm notuna girer. İki kabul kriterinin birbiriyle çelişme ihtimalini uygulama turuna bırakmak, geliştiriciyi hangisini tutacağına karar vermek zorunda bırakırdı.

**Karar 9. Dört kutunun adı ne olur?**
**Karar: adlar şimdi sabitlenir** (R16/2): "Tahsil Edilen Servis Ücreti", "Tahsil Edilen Parça Ücreti", "Tahsil Edilen Anlaşmalı Servis Parçası", "Tahsil Edilen Extra Kalıp Bedeli"; ortak alt yazı eki "tahsil edilen tutar; tahsil edilmeyen, tarih filtresinden bağımsız Toplam Alacak kartında". Karar 1'in "ad önerilerini uygulama turunda getiririm" cümlesi burada kapanır. Gerekçe: ad bir ürün kararıdır, plan turunda analistin seçmesi kararı devretmek olur; üstelik üç test mekanizması ada bağlı (ölçüm 12), yani ad belirsizken ne AC-22 ölçülebilir ne ayıklama yazılabilir.

**Karar 10. Tahsil ölçütüne gün geçilsin mi?**
**Karar: geçilmesin** (R2/4). Kutular da alacak tarafı gibi varsayılanı kullanır. Gerekçe: biri yerel, öteki UTC gün okursa kredi kartı blokajının bittiği sabah bir kayıt üç saat boyunca ya iki yerde ya hiçbir yerde görünür ve R4'ün tek somut güvencesi çürür. Yerel güne geçmek iki tarafta birlikte yapılacak ayrı iştir (X8).

**Karar 11. Kutu ile Toplam Alacak'ın ve Kasa'nın ilişkisi nasıl yazılır?**
**Karar: üç ayrım ve Kasa farkı yazılı olur** (R4/2, R2/2). Gerekçe: kart adı "Tahsil Edilen" olunca kullanıcı ilk iş iki kartı toplayıp tahakkuk toplamına varmayı ve sonra Kasa bakiyesiyle karşılaştırmayı dener; dönem, komisyon, KDV ayrımı ve Kasa'nın hesap şartı yazılı olmazsa ikisi de hata olarak bildirilir.

**Karar 12. Dönem rakamının zamanla değişmesi kabul mü?**
**Karar: kabul, ama yazılı olur** (R19/2). Gerekçe: Karar 4 süzgeci satış tarihinde tuttuğu için tahsil koşulu bugünün durumundan okunur ve kapanmış bir dönemin rakamı sonradan artabilir. Bu sonuç aynı zamanda arşiv belgelerinin (aylık rapor, Finans Özeti Excel) tahakkuk kalmasının gerekçesidir; yazılı olmazsa veri kaybı gibi okunur.

**Karar 13. Finans Özeti Excel'i ne olur?**
**Karar: dokunulmaz, ayrışma yazılır** (C7, X9). Gerekçe: Excel'in çapraz testi ekrana değil aylık rapora bağlı, yani tahakkuk kalması tutarlıdır; ama satır adları kart adlarına yakın olduğu için ayrışma `CLAUDE.md`'de ve spec'te yazılı olmalı. Satır adlarının düzeltilmesi X3 ile aynı adlandırma işidir.

**Karar 14. Detay penceresinin sütunu ham işareti mi göstersin?**
**Karar: türetilmiş ölçütü göstersin, başlığı "Tahsil edildi" olsun** (R18/2). Ödendi işaretli ama tahsil edilmemiş satırda kısa neden yazılır. Gerekçe: alt toplamın kartla tutması (AC-25) ancak sütunla aynı ölçütten okunursa açıklanabilir; aksi hâlde "ödendi yazıyor ama toplama girmemiş" diye yeni bir bildirim gelir. Satır süzülmediği için iş listesi değeri korunur.

**Karar 15. Boş durum hangi hâlleri kapsar?**
**Karar: iki hâl ayrı ayrı sabitlenir** (R23, AC-29, AC-42): dönemde hiç kayıt yok, ve kayıt var ama hiçbiri tahsil edilmemiş. Gerekçe: ikincisi bu işin yarattığı yeni hâl ve asıl risk orada; kartların çizilmeye devam ettiği ve sıfır gösterdiği ölçülmezse ekran sessizce boş durum gösterebilir.

**Karar 16. Küçük boşluklar.** Hepsi analistin önerisiyle kapandı: eski `partSales tur:"YedekParca"` satırlarına dokunulmaz (R21), Anasayfa ile model, bayi ve trend değişmeyenler listesine adıyla girer (R20/2), yöntemi boş kayıt nakit gibi davranır (R2/3), servis kutusunun kendi süzgeci adıyla yazılır ve değişmez (R7/2), brüt dönüşler temizlenir (R22), tarih süzgecinin üçüncü kopyası yazılmaz (C9), AC-18 ölçülebilir biçimde yeniden yazılır, AC-11 sahte saat kurmadan fikstür tarihleriyle ölçülür, ölçümlerin kaynağı yazılır (ölçüm 24) ve `CLAUDE.md`'de güncellenecek iki yer adıyla belirtilir.


### Plan turunda verilen kararlar (Takım Yöneticisi onayı, 2026-10-27)

**Karar 17. Yansıtılan komisyonun düşüldüğü servis döngüsü de süzülür.** Servis komisyonu ana tutardan ayrı bir döngüde düşülüyor (`Finance.jsx`); yalnız ana tutar süzülseydi tahsil edilmemiş kaydın komisyonu kutudan yine düşer ve kutu eksiye inerdi. R7 "komisyon tahsil edilmiş kayıtta düşülür" diye okunur; yedek parça ve Extra Kalıp kollarında komisyon aynı satırda düşüldüğü için kendiliğinden çözülür (AC-27'nin servis testi).

**Karar 18. Kıyas ayıklaması "Toplam Bedel" kartını da kapsar.** C8 dört kartı sayıyordu; ama iki kıyas verisinde ödenmemiş kayıt olduğu için "Toplam Bedel" kartının tutarı, KDV satırı (R10/2) ve alt yazısı (Karar 2) da değişir. Ayıklama (`tests/fixtures/0113-ayikla.js`) beş kartı çıkarır; "Toplam Alacak", "Ödenmesi Muhtemel KDV" ve öteki her metin birebir karşılaştırılmaya devam eder.

**Karar 19. AC-45'in Anasayfa yarısı "bu spec Anasayfa'yı değiştirmez" diye ölçülür.** Kriter "ödenmedi yapılınca değişmez" diyordu; oysa Anasayfa'nın borç blokları bugün de ödeme durumunu okuyor ve değişiyor (R20/2). Ölçü: Anasayfa, aylık rapor, Excel, Kasa ve Analiz bu işin sabitlerini ve süzgecini okumaz (tarama). Model, bayi ve trend yarısı ödendi ve ödenmedi varyantlarının aynı metniyle ölçülür.

**Karar 20. Ücretsiz Extra Kalıp'ın KDV'si "Ödenmesi Muhtemel KDV" kartında kalır.** R13 kartı tahakkuk tutar; R8/2'nin ücretsiz denetimi yalnız kutuya uygulanır. Kayıt yolu işareti açmadığı ve Takım Yöneticisi "Extra Kalıp asla bedava verilmez" dediği için bu dal gerçek veride çalışmaz; KDV kartını değiştirmek AC-17'yi ve kapsamı genişletirdi.

**Karar 21. R8/2'nin ölçümü yedek gelmediği için yapılamadı.** Ölçüm 25'e yazıldı; AC-31'in tahsil yarısı 0079 altınıyla kanıtlandı (eski kod ödeme durumunu okumadığı için her kaydı tahsil edilmiş yapılmış veride dört kutu spec öncesi metniyle birebir aynı), ücretsiz yarısı ölçülemedi ve sürüm notuna "ücretsiz işaretli Extra Kalıp kaydı artık kutuda sayılmaz" cümlesi girer.

**Karar 22. Detay penceresinin alt toplamı.** Tahsil edilmiş satırların KDV hariç parça bedeli, para birimi başına, pencerenin arama süzgecinden bağımsız (`TAHSIL_ALT_TOPLAM_ETIKETI`). Kartın kargo satışları ve yansıtılan komisyon farkı X6'nın bilinen sınırıdır; AC-25 bu ikisini taşımayan veriyle ölçülür. Tanınmayan parça para birimi kartla aynı kuralla TL kovasına düşer (triyaj).

**Karar 23. Adlar `Finance.jsx`'te dışa verilen sabitlerdir** (`TAHSIL_KART_ADLARI`, `TAHSIL_EK`, `TOPLAM_BEDEL_ALT_YAZI`). Eski adı metinle arayan **iki test daha** vardı (spec yalnız `evrak-finans-capraz`'ı saymıştı): `finance-yedek-parca` ve `bos-durum`; ikisi davranış değişmeden sabitle sorgulayacak şekilde güncellendi ("spec 0113 R16/2 ile"). Üçüncü olarak `ucretsiz-yedek-parca-0095`'in AC-15 kontrol ikizi ödenmemiş olduğu için artık "Toplam Bedel"i değiştirmiyordu; asıl iddia (ücretsiz satış hiçbir kartı değiştirmez) aynen, "Toplam Bedel"in kontrolü tahsil edilmiş ikizle yapılır.

**Karar 24. Bekleme nedeni ölçütü yeniden yazmaz.** `utils.tahsilBeklemeNedeni(s)` önce `satisTahsilEdildi`'yi çağırır, yalnız nedenin adını seçer ("Çek tahsil edilmedi" / "Kart blokajı sürüyor"); tutarlılığı saf testte sabit.

---

## Kabul kriterleri

- **AC-1.** Ödendi işaretli 10.000 TL'lik Faturalı Yurtiçi bir Extra Kalıp satışı kendi kutusunda 10.000 olarak görünür; altındaki KDV rakamı o satışın KDV'sini yazar.
- **AC-2.** Aynı satış ödenmedi yapılınca kutu 10.000 düşer; altındaki KDV rakamı da düşer.
- **AC-3.** Aynı satış yeniden ödendi yapılınca kutu 10.000'e döner.
- **AC-4.** Ödenmedi olan satış aynı anda Toplam Alacak kartında KDV dâhil tutarıyla görünür; ödendi yapılınca oradan düşer.
- **AC-5.** Ödendi işaretli, işçiliği ve parçası olan bir Altuntaş servisi ödenmedi yapılınca işçiliği Servis Ücreti kutusundan, parçası Parça Ücreti kutusundan **birlikte** düşer.
- **AC-6.** Anlaşmalı firmanın yaptığı, parçası Altuntaş'tan alınmış bir servis ödenmedi yapılınca Anlaşmalı Parça kutusundan düşer; Servis Ücreti kutusu etkilenmez (o ücret zaten orada sayılmıyor).
- **AC-7.** Müşteri alıcılı bir yedek parça (kargo) satışı ödenmedi yapılınca Parça Ücreti kutusundan düşer.
- **AC-8.** Bayi alıcılı bir yedek parça satışı ödenmedi yapılınca Anlaşmalı Parça kutusundan düşer.
- **AC-9.** Anlaşmasız dış firma alıcılı yedek parça satışı ödenmedi yapılınca Anlaşmalı Parça kutusundan düşer.
- **AC-10.** Ödeme yöntemi Çek olan, ödendi işaretli ama çeki tahsil edilmemiş kayıt kutuya **girmez**; çek tahsil edildi işaretlenince girer. (Extra Kalıp, servis ve yedek parça için ayrı ayrı.)
- **AC-11.** Ödeme yöntemi Kredi Kartı olan, blokajı bitmemiş kayıt kutuya **girmez**; blokaj tarihi geçince girer.
- **AC-12.** Ücretsiz işaretli yedek parça satışı hiçbir kutuya girmez.
- **AC-13.** Ücretsiz işaretli, ücret alanı dolu bir Extra Kalıp kaydı kutuya girmez; **ödendi işaretli olsa da** girmez (ölçüt `satisUcretsizMi`, tahsil süzgeci değil).
- **AC-14.** Makina kutuları (Toplam Fabrika Satış Bedeli, Toplam Fatura Bedeli) bu spec'ten etkilenmez ve bugünkü rakamlarını korur.
- **AC-15.** Büyük "Toplam Bedel" kartı ödenmedi yapılan kaydın payı kadar düşer; makina payı değişmez.
- **AC-16.** "Toplam Bedel" kartının alt yazısı makina bedelinin tahakkuk, diğerlerinin tahsilat esaslı olduğunu söyler; kartın **KDV satırı kendi bileşenlerinin KDV'sidir** ve "Ödenmesi Muhtemel KDV" kartından küçük olabilir.
- **AC-17.** "Ödenmesi Muhtemel KDV" kartı ödenmedi yapılan kaydın KDV'sini **düşürmez**.
- **AC-18.** Bir kutunun altındaki KDV rakamı ile "Ödenmesi Muhtemel KDV" kartı arasındaki **fark, tahsil edilmemiş kayıtların KDV'si kadardır** (iki birikim kümesiyle ölçülür) ve bu fark beklenen davranıştır.
- **AC-19.** Beş adet kartı ödenmedi yapılınca değişmez.
- **AC-20.** "Toplam Kredi Kartı ile Satış" ve "Toplam Ödenen Banka Komisyonu" kartları ödenmedi yapılınca değişmez.
- **AC-21.** "Toplam Ödenen Komisyon" kartı ödenmedi yapılınca değişmez.
- **AC-22.** Dört kutunun adı R16/2'deki dört addır ve alt yazıları ortak eki taşır (tahsil edilen tutar; tahsil edilmeyen, tarih filtresinden bağımsız Toplam Alacak kartında).
- **AC-23.** Aylık Faaliyet Raporu ödenmedi yapılan kayıtları **saymaya devam eder** ve rakamları bu spec'ten önceki hâliyle birebir aynıdır.
- **AC-24.** Anlaşmalı Servis detay penceresi tahsil edilmemiş satırları göstermeye devam eder ve ödeme sütunu durur (başlığı "Tahsil edildi", değeri türetilmiş ölçütten).
- **AC-25.** Aynı pencerede tahsil edilen alt toplamı kartın rakamıyla tutar (pencerenin kendi kapsamı için).
- **AC-26.** Çoklu para birimi: TL, USD ve EUR kayıtları ayrı sayılır; bilinmeyen para birimi bugünkü gibi TL kovasına düşer.
- **AC-27.** Yansıtılan kredi kartı komisyonu olan tahsil edilmiş kayıtta komisyon bugünkü gibi kutudan düşülür.
- **AC-28.** Tarih aralığı dışındaki tahsil edilmiş kayıt kutuya girmez (süzgeç satış ya da servis tarihine göre çalışır).
- **AC-29.** Boş durum, hiç kayıt olmayan dönem: dört kutu sıfır gösterir, kartlar çizilir ve hata vermez; model ile satıcı boş durumları bugünkü ölçütüyle çizilir.
- **AC-30.** Tahsil edilmişlik ölçütü kaynak taramasıyla tek yerden okunuyor: Finans'ın dört kutusunun hiçbirinde elle yazılmış ödeme koşulu yok.
- **AC-31.** Bugünkü veriyle ölçülen değişim, **tahsil süzgeci açısından** sıfırdır: dört kutu da bu spec'ten önceki rakamını korur (ölçüm 3'ün sabitlenmesi; tahsil edilmemiş 15 yedek parça kaydının hepsi ücretsiz olduğu için bugün de kutulara girmiyor). R8/2'nin ücretsiz Extra Kalıp ölçümü sıfırdan farklı çıkarsa bu kriter "Extra Kalıp kutusu ücretsiz işaretli kayıtların tutarı kadar düşer" diye daraltılır ve ölçülen rakam yazılır.

### QA turu kriterleri (2026-10-26)

- **AC-32.** İki birikim kümesi ayrıdır: ödenmedi yapılan kayıt dört kutudan ve kendi KDV satırından düşer, "Ödenmesi Muhtemel KDV" kartından düşmez, "Toplam Bedel" kartının KDV satırından düşer.
- **AC-33.** Tek kayıtlı dönemde kayıt ödenmedi yapılınca kutu **tam sıfır** olur (negatif ya da eksi KDV kadar bir rakam çıkmaz); kutu artı KDV satırı, kaydın brüt tutarına eşittir.
- **AC-34.** Ücretsiz işaretli ve **ödendi** işaretli bir Extra Kalıp kaydı kutuya girmez (AC-13'ün tahsil süzgeciyle karışmayan yarısı).
- **AC-35.** Dört ad ve ortak alt yazı eki dışa verilen sabitlerden okunur; kaynakta düz metin olarak ikinci kez yazılmaz (tarama).
- **AC-36.** Kıyas ayıklaması eski ve yeni kart adını birlikte tanır; iki ekran kıyası (`0079-ekran-once.json`, `0095-ekran-once.json`) bu ayıklamayla yeşil kalır ve ayıklama dışındaki hiçbir metin değişmez.
- **AC-37.** Kutular tahsil ölçütüne `bugun` argümanı geçmez; ölçüt alacak tarafıyla aynı varsayılanı kullanır (tarama).
- **AC-38.** Kasa hesabı atanmamış, tahsil edilmiş bir kayıt kutuda sayılır ama hiçbir Kasa bakiyesine girmez (iki tanımın farkı).
- **AC-39.** Satış tarihi dönemde, tahsilat tarihi dönemin dışında olan tahsil edilmiş kayıt kutuya **girer** (süzgeç satış tarihinde, tahsil koşulu bugünün durumundan).
- **AC-40.** Aylık Faaliyet Raporu ve "Finans Özeti" Excel'i bu spec'ten önceki rakamlarını birebir korur (ikisi de tahakkuk).
- **AC-41.** Detay penceresinde ödendi işaretli ama çeki tahsil edilmemiş satır "tahsil edilmedi" görünür, nedenini yazar, listede kalır ve tahsil edilen alt toplamına girmez.
- **AC-42.** Dönemde kayıt var ama hiçbiri tahsil edilmemiş: kart bloğu çizilir, dört kutu sıfır gösterir, boş durum kutusu kartların yerine geçmez.
- **AC-43.** Ödeme yöntemi boş, ödendi işaretli kayıt kutuya girer (nakit gibi davranır).
- **AC-44.** Eski `partSales tur:"YedekParca"` kaydı hiçbir bedel kutusuna girmez ve adet, banka komisyonu, kredi kartı satışı kartlarındaki bugünkü katkısını korur.
- **AC-45.** Anasayfa, model kırılımı, bayi kırılımı ve 12 aylık trend ödenmedi yapılınca değişmez.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Aynı sayıyı üreten iki ekranın (Finans ve aylık rapor) artık farklı soruları cevapladığı adlarında yazılı ve testle sabitlendi (R17, AC-23).
- [ ] Yeni kalıcı alan, veri bölümü ve izin **eklenmediği** açıkça yazıldı (R20).
- [ ] Para çoklu para kuralına uyuyor; bilinmeyen para birimi tanımlı biçimde ele alınıyor (AC-26).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (boş durum ve detay penceresi dâhil).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] R8/2'nin ücretsiz Extra Kalıp ölçümü yapıldı, ölçüm 11'in altına yazıldı ve AC-31 ile ölçüm 4 sonuca göre güncellendi.
- [ ] Dört kartın adı ve ortak eki sabitlerden okunuyor; kıyas ayıklaması eski ve yeni adı birlikte tanıyor (C8, AC-35, AC-36).
- [ ] AC-11 fikstür tarihleriyle, saatten bağımsız ölçüldü (geçmiş ve gelecek `hesabaGecis` taşıyan iki fikstür; test dosyasının sabit tarihi bu kriterin sonucunu belirlemez).
- [ ] `CLAUDE.md` **iki yerde** güncellendi: yeni bir Finans bölümü (dört kutu tahsilat esaslı, makina ve kart kutuları tahakkuk, KDV kartı tahakkuk, dönem rakamının zamanla değişmesi) ve "Printing and export" bölümündeki Finans Özeti cümlesine ekran ile Excel ayrışması (C7).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu, 2026-10-26)

| # | Boşluk | Derece | Karar | Nereye işlendi |
|---|---|---|---|---|
| B-1 | KDV birikimleri kutularla KDV kartı arasında paylaşılıyor; R13 ile R14 tek değişkenle sağlanamaz | Bloklayıcı | İki paralel birikim kümesi; büyük kartın KDV satırı kendi bileşenlerinden | R14/2, R10/2, AC-16, AC-32, AC-33, Karar 7, ölçüm 10 |
| B-2 | Ücretsiz kuralı tahsil süzgecinden gelmiyor ve "etki sıfır" iddiasıyla çelişebilir | Bloklayıcı | Ayrı kural olarak yazılır ve ölçülür | R8/2, AC-13, AC-34, AC-31, Karar 8, ölçüm 11, DoD |
| B-3 | Dört kutunun yeni adı yok; AC-22 ölçülemez, üç test mekanizması ada bağlı | Bloklayıcı | Adlar ve ortak ek şimdi sabitlenir, sabitlerden okunur | R16/2, C8, AC-22, AC-35, AC-36, Karar 9, ölçüm 12 |
| Ö-1 | Tahsil ölçütünün günü UTC; iki taraf ayrışırsa R4 çürür | Önemli | Kutular `bugun` geçmez; yerel güne geçiş ayrı iş | R2/4, X8, AC-37, Karar 10, ölçüm 13 |
| Ö-2 | Kutular dönemsel, Toplam Alacak anlık; komisyon ve KDV de ayrışıyor | Önemli | Üç ayrım R4/2'de yazılı, alt yazı "tarih filtresinden bağımsız" der | R4/2, R16/2, AC-22, Karar 11, ölçüm 14 |
| Ö-3 | "Tahsil edildi" iki tanımlı; Kasa'nınki hesap şartı istiyor | Önemli | R2'nin kapsamı daraltılır, Kasa farkı yazılır | R2, R2/2, AC-38, Karar 11, ölçüm 15 |
| Ö-4 | Kapanmış dönemin kutu rakamı zamanla değişir | Önemli | Kabul, ama yazılı ve ölçülü | R19/2, AC-39, Karar 12, ölçüm 14 |
| Ö-5 | Finans Özeti Excel tahakkuk kalıyor, ekranla ayrışıyor | Önemli | Dokunulmaz, ayrışma spec'e ve CLAUDE.md'ye yazılır | C7, X9, AC-40, DoD, Karar 13, ölçüm 16 |
| Ö-6 | Detay penceresinin sütunu ham işareti okuyor; AC-24 ile AC-25 çelişir | Önemli | Sütun türetilir, başlık "Tahsil edildi", neden yazılır | R18, R18/2, AC-24, AC-41, Karar 14, ölçüm 17 |
| Ö-7 | Boş durum kriteri iki hâli karıştırıyor | Önemli | İki hâl ayrı ayrı sabitlenir, kartlar her zaman çizilir | R23, AC-29, AC-42, Karar 15, ölçüm 18 |
| K-1 | Eski `partSales tur:"YedekParca"` satırları hiçbir kutuda yok | Küçük | Dokunulmaz, yazılı olur | R21, AC-44, Karar 16, ölçüm 19 |
| K-2 | Anasayfa R20'nin listesinde yok | Küçük | Listeye adıyla girer | R20/2, AC-45, Karar 16, ölçüm 20 |
| K-3 | Model, bayi ve trend yalnız makinadan hesaplanıyor | Küçük | Ölçüm olarak yazılır, dokunulmaz | R20/2, AC-45, Karar 16, ölçüm 21 |
| K-4 | R2'nin dalları eksik: yöntemi boş kayıt | Küçük | "Nakit gibi davranır" eklenir | R2/3, AC-43, Karar 16 |
| K-5 | Servis kutusunun süzgeci R7'de adlandırılmamış | Küçük | Adıyla yazılır, değişmez | R7/2, Karar 16, ölçüm 22 |
| K-6 | Memo'nun kullanılmayan brüt dönüşleri | Küçük | İki küme adlandırılır, ölü dönüşler temizlenir | R22, Karar 16, ölçüm 23 |
| K-7 | Detay penceresinde tarih süzgecinin ikinci kopyası | Küçük | Üçüncü kopya yazılmaz | C9, Karar 16, ölçüm 23 |
| K-8 | AC-18'in "karşılık gelen pay" ifadesi ölçülemez | Küçük | Fark olarak yeniden yazılır | AC-18, Karar 16 |
| K-9 | AC-11 gerçek güne bağlı | Küçük | Fikstür tarihleriyle ölçülür, sahte saat yok | DoD, Karar 16 |
| K-10 | Ölçümlerin dayanağı olan yedek depoda yok | Küçük | Kaynak notu yazılır | ölçüm 24, Karar 16 |
| K-11 | DoD'un "CLAUDE.md'nin Finans bölümü" adresi yok | Küçük | İki yer adıyla yazılır | DoD, Karar 16 |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `f45a356` | Dal `feat/0113-finans-tahsil`, taban `bdbc80e`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | QA turu (B-1–B-3, Ö-1–Ö-7, K-1–K-11), plan turu (Karar 17–24) |
| **Düzeltme turu sayısı** | 1 | Triyaj: dört bulgu (1 düşük-orta, 3 düşük): KDV kartının değişmezliği yalnız Extra Kalıp kolunda testliydi; Karar 20 testsizdi; detay penceresinin alt toplamı aramaya karşı testsizdi ve tanınmayan para birimini kartla aynı kovaya koymuyordu (kod düzeltmesi); spec kopyası ve DoD ifadesi |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 423 dosya, 5725 test (Electron dahil); lint 0 hata; tip denetimi temiz |
| **Kaçan hata** | 1 | Alt toplamın tanınmayan para birimi kovası (AC-25 ile AC-26 birlikte bozulurdu); triyajda yakalandı |

**Açık madde:** R8/2'nin ücretsiz işaretli Extra Kalıp ölçümü yapılamadı (yedek verilmedi, Karar 21, ölçüm 25); DoD maddesi işaretsiz kaldı. Kural sıfır kayıtta da doğru çalışır ve testli; etkinin sıfır olması beklenir ama ölçülmedi, sürüm notunda yazılı.

**Görsel kanıt:** 9 ekran × 2 tema; bütün Finans ekranları yeni adlar ve uzayan alt yazılar yüzünden değişti, üç yeni ekran (karışık tahsil, hiçbiri tahsil edilmemiş, detay penceresi); taban son kodla 0 fark.

**Bu spec'ten çıkarılan ders:** Bir kartı birden çok kol besliyorsa "değişmez" kuralı her kol için ayrı ölçülmeli: tek kolla yazılmış test, öteki kolların bağını kıran bir hatayı yalnız tesadüfen başka bir fikstür ödenmemiş kayıt taşıdığı için yakalar. İki ayrı hesap yolu aynı rakamı tutturmak zorundaysa (kart ve pencerenin alt toplamı) bütün kurallarını, kenar dallar dahil (tanınmayan para birimi), aynı yardımcıdan almalı. Eski kod bir alanı hiç okumuyorsa, o alanın bütün kayıtlarda "nötr" değere çekildiği veride yeni kodun eski altına eşitliği, "bugünkü etki sıfır" iddiasının ucuz ve güçlü bir kanıtıdır.
