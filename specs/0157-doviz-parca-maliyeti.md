# 0157 — Parça maliyeti döviz cinsinden girilir

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-23) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog › Parça/Yedek Parça (parça kartı, liste, `MaliyetKalemleriAlani.jsx`), `Settings.jsx` (günün kuru prop zinciri), saf motorlar `urunAgaci.js` / `malzeme.js` / `kur.js` / `gider.js` (tek çarpım) / `siparisIhtiyaci.js`, parça Excel aktarması, Makina Maliyeti (Model Maliyetleri, Parti Hesabı), sipariş listesi ve belgesi, `parts` tablosu |
| **Bağımlı spec'ler** | 0087 (parça maliyeti), 0097 (tarihli maliyet geçmişi), 0132 (malzemenin döviz fiyatı), 0135 (maliyet kalemleri), 0133 (satış fiyatı maliyetten türer), 0136 (donan parti maliyeti), 0152 ve 0153 (döviz alanları, donmuş kur), 0144 ve 0150 (sipariş belgesinin tutarları), 0158 (Excel'in 12 ve 13. sütunu) |
| **Revizyon** | 3 (2026-11-23 plan turu: P1–P10; plan `specs/0157-uygulama-plani.md`) |
| **QA turu** | 2026-11-23: 25 bulgu (4 Bloklayıcı / 15 Önemli / 6 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 1 (Excel şablonunun sütun sayısı) |

---

## Intent

Fabrika bazı parçaları doğrudan dolar ya da euro ile alıyor, yani o parçanın maliyeti lira değil. Bugün parça kartı maliyeti yalnız lira kabul ediyor; kullanıcı kuru kafasında çevirip lira yazıyor, faturanın kendi rakamı ve o gün kullandığı kur hiçbir yerde durmuyor ve kur değişince parçanın maliyetinin eskidiği hiçbir yerde uyarı doğurmuyor. Aynı sorun fason ve ithalat gideri için de var: işlem kalemi yalnız lira tutar alıyor. Bu iş bittiğinde parçanın maliyeti kendi para biriminde girilecek, kur kayıtta donacak, lira karşılığı o kurdan türetilecek ve maliyet geçmişi "bu parça geçen yıl kaç dolardı" sorusunu da cevaplayacak. Tedarikçiye verilen sipariş belgesi tutarı parçanın kendi para biriminde yazacak, satış fiyatı ise bugünkü kuralla lira maliyetten türemeye devam edecek. Kurun eskidiğini gösteren tek şey kartın sapma uyarısıdır; hangi parçaların kurunun topluca yenilenmesi gerektiğini listeleyen bir görünüm bu turun kapsamında değildir (X2).

---

## Requirements

### A. Parçanın elle maliyeti

- **R1.** Parça kartında maliyetin yanında para birimi seçilir (TL, USD, EUR); varsayılan TL ve TL seçiliyken ekran bugünkü gibidir.
- **R1/2.** Girilen tutarın kalıcı alanı bugünkü `parts.maliyet`'tir ve anlamı genişler: değer artık parçanın kendi para birimindeki tutardır. Yanına iki alan gelir: `maliyetParaBirimi` (TEXT) ve `maliyetKuru` (REAL). İşlem kalemi kendi para birimini ve kurunu `maliyetKalemleri` içinde `paraBirimi` ve `kur` adlarıyla taşır (0152 ile 0153'ün adları).
- **R1/3.** Parça düzeyindeki para birimi yalnız Elle sabit kipinde anlamlıdır ve seçici yalnız o kipte çizilir; Hesapla kipinde para birimi kalem başınadır ve parçanın iki alanı kayıttan silinir.
- **R2.** Döviz seçilince kur zorunlu olur ve "1 USD = ? TL" biçiminde etiketlenir; günün kuru önerilir, elle değiştirilebilir ve kayıtta donar.
- **R2/2.** Öneri para birimi boştan ya da TL'den dövize geçerken ve bir dövizden ötekine geçerken alana yazılır (P5); dövizden TL'ye geçişte kur alanı silinir. Düzenleme formu kayıtlı kurla açılır; günün kuru ipucunda durur ve "Günün kurunu kullan" düğmesiyle alana yazılır (malzeme kartının bugünkü kuralı).
- **R2/3.** Günün kuru parça paneline iner: `Settings.jsx` `rates` ve `ratesErr` değerlerini parça kartına ve kalem listesine geçirir. Köprüsüz ortamda öneri gelmez, kart çizilmeye devam eder.
- **R2/4.** Girilen kur günün kurundan yüzde elliden fazla saparsa engellemeyen uyarı yazılır (0153'ün tek sabiti); kayıt yine yapılır.
- **R3.** Girilen tutar parçanın **kendi para birimindeki** maliyetidir; lira karşılığı donmuş kurdan türetilir ve maliyetin lira gereken her yerde kullanılan tek rakamıdır.
- **R4.** Kur değişince maliyet kendiliğinden değişmez; kullanıcı kuru parça kartından güncelleyene kadar eski kur geçerlidir.
- **R5.** Kur ya da tutar değiştirilip kaydedilince maliyet geçmişine yeni kayıt düşer; kayıt o günün döviz tutarını, kurunu ve lira karşılığını birlikte tutar.
- **R5/2.** Geçmişin tetikleyicisi lira karşılığı değil, üçlü anahtardır (döviz tutar, kur, lira kuruş): döviz tutar ile kur birlikte değişip lira karşılığı aynı kalsa da kayıt düşer. Geçmiş satırının okunması bu alanları korur; boş alanlar yazılmaz ve lira olarak yazılmış eski satırlar aynen kalır.
- **R6.** Çevrimdışı günde (kur alınamadığında) öneri gelmez, nedeni yazılır ve elle kur girilerek kayıt yapılabilir.
- **R7.** Döviz maliyette kur girilmemişse maliyet "girilmedi" sayılır; asla sıfır sayılmaz.

### B. İşlem kalemi

- **R8.** İşlem kaleminin tutarının yanında da para birimi ve kur girilir; kurallar elle maliyetle aynıdır (varsayılan TL, dövizde kur zorunlu, kayıtta donar).
- **R8/2.** Sipariş belgesindeki işlem satırı kendi para biriminde basılır: satır para birimini ve lira karşılığını birlikte taşır, "İşlemler toplamı" para birimi başına verilir ve genel toplam lira karşılıklarından toplanır. Bugünkü kod işlem tutarını koşulsuz lira sayıyor, yani döviz kalem bu kural yazılmazsa sessizce bire bir lira basılır.
- **R9.** Kalemlerin para birimleri karışık olabilir: aynı parçada dolar bir işlem, lira bir işlem ve dolar bir malzeme birlikte durabilir.
- **R10.** Parçanın maliyeti bütün kalemlerin **lira karşılıklarının** toplamıdır; kalem başına çevrim bir kez kuruşa yuvarlanır.
- **R11.** Tutarı girilmemiş döviz işlem kalemi bugünkü gibi toplamın dışında kalır ve kullanıcıya uyarı olarak görünür.

### C. Görünüm ve çıktılar

- **R12.** Parça kartı maliyetin lira karşılığını her zaman gösterir; döviz girildiğinde hem döviz tutar ile kur hem lira karşılığı birlikte okunur.
- **R12/2.** Maliyet alanının etiketi ve ipucu para biriminden bağımsız yazılır; bugünkü "TL karşılığını girin" cümlesi ile iki "(TL, KDV hariç)" etiketi kaynaktan kalkar (tek yerde, C10).
- **R12/3.** Kalem listesinde döviz işlem kaleminin satırı kendi tutarını, kurunu ve lira karşılığını birlikte yazar; kalemlerin toplamı lira kalır.
- **R13.** Parça listesinin maliyet hücresi döviz parçada parçanın kendi tutarını yazar ve lira karşılığını da gösterir.
- **R14.** Maliyet geçmişi listesi her satırda döviz tutarı, kuru ve lira karşılığını yazar; lira olarak girilmiş eski satırlar bugünkü gibi görünür.
- **R15.** Sipariş listesinin fiyatlı nüshasında döviz parçanın tutarı kendi para biriminde yazar ve bölüm toplamı para birimi başına verilir (belgenin bugünkü çoklu para birimi davranışı).
- **R15/2.** Bunun için maliyetin tek okuma yolunun yanına KARDEŞ bir okuyucu açılır: parçanın kendi para birimindeki tutarını, para birimini ve kurunu birlikte veren tek fonksiyon. Yalnız elle maliyetli parçada dolu döner; kalem listeli (karma olabilir) ve set parçada boş döner ve belge o parçanın tutarını bugünkü gibi lira basar. Lira karşılığı yine tek okuma yolundan gelir.
- **R16.** Satış fiyatı bugünkü kuralla lira maliyetten türer; döviz satış fiyatı türetilmez.
- **R17.** Model Maliyetleri, Parti Hesabı ve set maliyeti lira karşılığını okur; kapanmış partinin donmuş maliyeti etkilenmez.
- **R18.** Parça Excel'inde maliyetin para birimi ve kuru için iki sütun olur; maliyet hücresi o para biriminde okunur, para birimi sütunu boşsa lira sayılır (eski şablonlar aynen çalışır).
- **R18/2.** Sütunlar zaten ayrılmıştır: şablon on altı sütundur ve 12 ile 13. sütun "Maliyet Para Birimi" ve "Maliyet Kuru" başlıklarıyla bu spec için bekliyor (0158). Bu iş yeni sütun eklemez, o iki sütunu okumaya açar, 0158'in "bu sütunlar henüz okunmuyor" reddini kaldırır ve şablonun örnek satırına örnek değer yazar.
- **R18/3.** İçe aktarmada kur altı ondalığa kadar kabul edilir (kur ayrıştırıcısının türetilen kaynağı). Elle girişin dört ondalık sınırı burada uygulanmaz; aksi hâlde dışa aktarılan altı ondalıklı kur kendi dosyasından geri alınamazdı.
- **R18/4.** Maliyet hücresi yalnız elle maliyetli parçada parçanın kendi para birimindedir; kalem listeli ve set parçada bugünkü gibi çözülmüş liradır ve o satırın para birimi sütunu boş yazılır. Dışa aktarılan dosya değiştirilmeden içe aktarılınca hiçbir bildirim doğmaz.
- **R18/5.** İki hata hâli aynı kuralla ele alınır: kur dolu ama para birimi boş satır ile tanınmayan para birimi taşıyan satırın maliyeti yazılmaz ve nedeni satır numarasıyla bildirilir.
- **R19.** Döviz maliyetli parçanın kuru girilmemişse ya da tanınmayan para birimi taşıyorsa liste bunu eksik olarak işaretler.
- **R19/2.** "Eksik işareti" bugünkü mekanizmadır, yeni rozet değildir: maliyet "girilmedi" sayılır, liste hücresi `—` yazar ve parça "alış maliyeti girilmedi" sayacına girer. Nedenin metni parça kartında yazar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Maliyetin tek okuma yolu değişmez: motor yine lira kuruşu döndürür, bütün tüketiciler (satış fiyatı, Model Maliyetleri, Parti Hesabı, set maliyeti, sipariş, Excel) o yoldan okur ve hiçbiri para birimini kendi çevirmez.
- **C1/2.** Parçanın kendi para birimindeki tutarını okuyan tek yer `urunAgaci.js`'in modül içi okuyucusudur (P3). Dışarıya üç kapı açılır: R15/2'nin kardeş fonksiyonu (onu yalnız sipariş motoru çağırır), liste hücresinin metni ve Excel'in hücreleri. Ekranlar, Excel ve fiyat motoru para birimini kendi okumaz ve çevirmez; kaynak taramasıyla sabitlenir.
- **C2.** Lira karşılığının tek çarpımı tek yerde yazılır (malzemenin bugünkü deseni); ekranlar ve Excel çarpım yazmaz, kaynak taramasıyla sabitlenir.
- **C2/2.** O tek yer 0153'ün var olan yardımcısıdır (`gider.dovizdenLiraK`; `urunAgaci.js` `gider.js`'i zaten içe alır, döngü doğmaz). Malzeme kaleminin kendi çarpımı (fireli kilo × fiyat × kur) bugünkü yerinde kalır ve taramanın gerekçeli tek istisnasıdır; yoksa tarama ilk gün çelişirdi.
- **C3.** Kur ilkelleri var olan yaprak modülden alınır (`kur.js`: kur çözme, günün kuru önerisi, kur metni); ikinci bir kur ayrıştırıcısı yazılmaz.
- **C3/2.** İki ayrıştırıcı yan yana durur ve karıştırılmaz: tutar alanı tutar ayrıştırıcısıyla çözülür (noktayı binlik sayar; 0087'nin belirsiz sayı reddi aynen sürer), kur alanı kur ayrıştırıcısıyla (noktayı ondalık sayar). Kur asla tutar ayrıştırıcısına, tutar asla kur ayrıştırıcısına verilmez.
- **C4.** Girilen tutar kaydın kendi para birimindedir ve kur yanında saklanır (malzeme kartının bugünkü biçimi); maliyet geçmişi ise iki eksen tutar, yani döviz tutar, kur ve o günün lira karşılığı birlikte saklanır.
- **C4/2.** Geçmişin okunması bugün satırı iki alana indiriyor ve fazladan anahtarları düşürüyor; bu okuma da genişletilir, yoksa yazılan döviz alanları ilk okumada kaybolur.
- **C5.** Para birimi boş (ya da TRY) kayıt lira sayılır; tanınmayan para birimi "girilmedi" sayılır (R19, AC-32, P1). Eski kayıtların hiçbiri değişmez ve göç yapılmaz.
- **C5/2.** Karışık sürümün riski yazılıdır: güncellenmemiş bilgisayar döviz maliyeti LİRA sanır (maliyet kur katı kadar düşük görünür, ondan türeyen satış fiyatı ve makina maliyeti de düşer) ve o parçayı düzenlerse para birimi ile kuru düşürür. Bu yüzden önce sunucu bilgisayarı güncellenir ve bütün istemciler güncellenene kadar döviz maliyet girilmez.
- **C6.** Lira maliyetli parçaların kayıt gövdesi ve bütün motor çıktıları birebir aynı kalır (kıyas altını).
- **C6/2.** Bunu korumanın yolu, yeni alanların YALNIZ döviz varken yazılmasıdır: lira kayıtta ve lira sipariş satırında yeni anahtar hiç doğmaz (0151'in deseni). Böylece altın dosyasına ayıklama yazılmaz.
- **C6/3.** Kıyas altını motor çıktılarını, kayıt gövdesini, Excel satırını ve sipariş belgesini taşır ve gerçekten lira profilli bir fikstürden üretilir (0158'in dersi: fikstürün sanıldığı kadar sade olduğu ayrıca ölçülür).
- **C7.** Yeni kalıcı alanlar dört nokta kuralıyla eklenir ve boş değer kayıt gövdesine yazılmaz.
- **C7/2.** Alan adları R1/2'de sabittir ve parçanın satış fiyatı alanlarıyla (`fiyatTRY`, `fiyatUSD`, `fiyatEUR`) karıştırılmaz; maliyetin para birimi satışın para birimi değildir.
- **C7/3.** Yazım tek yazıcıdan geçer: üç alan her çağrıda silinir ve yalnız döviz kipinde yazılır. Parça kartının "maliyet bölümüne dokunulmadı" dalı iki yeni alanı da eski kayıttan aynen kopyalar; kopyalamazsa dokunulmayan her düzenleme para birimini ve kuru sessizce düşürür ve maliyet kur katı kadar yanlışa iner (0095, 0114 ve 0153'ün dersi).
- **C8.** Yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı yok; parça kartının bugünkü izni ve kilidi geçerli kalır.
- **C9.** Kur değişimi geçmişe yazılır ve geçmiş yazımının tek kapısı bugünkü karar motorudur; set ve malzeme kaynaklı parçalarda geçmiş yazılmama kuralı korunur.
- **C10.** Kullanıcıya görünen bütün metinler Türkçe ve tek yerde sabit.

### KAPSAM DIŞI

- **X1.** Maliyetin günün kuruyla kendiliğinden güncellenmesi — *neden:* Takım Yöneticisi kararı; maliyet her gün değişirse ondan türeyen satış fiyatı, Model Maliyetleri ve parti hesabı da her gün değişir, çevrimdışı günde maliyet "girilmedi"ye düşer.
- **X2.** Toplu kur güncellemesi ve "kuru eskimiş parçalar" listesi — *neden:* ilk tur kartla sınırlı tutuluyor, kurun eskidiğini gösteren tek şey kartın sapma uyarısıdır (R2/4); isterseniz kendi spec'ine alınır.
- **X3.** Döviz satış fiyatının maliyetten türetilmesi — *neden:* 0133 döviz fiyatın hiç türetilmemesine karar verdi, üç para biriminin fiyat kipi ayrı bir tasarım.
- **X4.** Kur farkının gider ya da gelir yazılması — *neden:* 0152 ve 0153 bunu bilinçle kapsam dışı bıraktı, kambiyo kavramı uygulamada yok.
- **X5.** Malzeme kartının döviz davranışının değişmesi — *neden:* 0132 onu çözdü, bu iş yalnız parçanın kendi maliyetini ve işlem kalemini kapsar.
- **X6.** Tedarikçi bazında para birimi varsayılanı — *neden:* kayıt parçanın kendisinde, tedarikçi kartına alan eklemek ayrı karar.
- **X7.** Sipariş belgesinin tek para birimine çevrilmesi — *neden:* belge bugün para birimi başına topluyor ve bu doğru davranış.
- **X8.** Geçmişe dönük kur düzeltmesi (eski geçmiş satırının kurunu değiştirmek) — *neden:* geçmiş bir kayıt defteridir, düzeltme kapanmış parti maliyetini oynatır.

---

## Context

Bugünkü davranış ve dayanaklar (hepsi kodda ölçüldü):

- **Döviz zaten yaşıyor, ama yalnız malzeme tarafında.** Malzeme kaydı `kiloFiyati` yanında `paraBirimi` ve `kur` taşıyor ve maliyet **kayıtlı kurla** lira kuruşa çevriliyor (`malzeme.js:293`, `kurus(fireliKg * fiyat * kur)`; dönüşte `kur` ve `paraBirimi` bilgi olarak var). Fiyat kümesi (`FIYAT_ALANLARI`) para birimi ile kuru içeriyor ve her değişiklik fiyat geçmişine anlık görüntü olarak yazılıyor. Bu işin istediği davranışın birebir emsali.
- **Canlı veride ölçülenler (2026-11-22):** 17 canlı malzemenin **3'ü USD** (PASLANMAZ ÇUBUK, PASLANMAZ SAÇ KAZAN, PASLANMAZ LAMA; kurları 50, 50,24194 ve 50,370257, yani elle giriliyor). 433 canlı parçanın 93'ü elle maliyetli, 149'u malzeme kalemli, 34'ünde işlem kalemi var (toplam 47 kalem), 8'i set, 174'ünün hiç maliyeti yok; 71 parçada maliyet geçmişi duruyor ve 7 parçada eski hammadde kırılımı var. Yani bu işin doğrudan kapsamı 93 parça ile 47 işlem kalemi.
- **Maliyet baştan sona lira kuruşu.** `urunAgaci.parcaMaliyetKurus` lira kuruşu döndürüyor ve öncelik sırası set, kalem listesi, elle maliyet; `maliyetKalemleriOzeti` işlem kalemini `kurus(k.tutar)` ile doğrudan liraya çeviriyor, malzeme kalemini `malzemeOzeti`'nden alıyor. Yani çevrimi iki yerden birine eklemek bütün tüketicileri (satış fiyatı, Model Maliyetleri, Parti Hesabı, set, sipariş, Excel) dokunmadan bırakır (C1).
- **Sipariş belgesi çoklu para birimine hazır:** bölüm toplamı para birimi başına toplanıyor (`siparisIhtiyaci.js:731`, `pbTopla`) ve `dovizVar` işareti var; malzemesi dolar olan parçanın tutarı bugün bu yoldan dolar olarak basılıyor.
- **Satış fiyatı maliyetten türüyor (0133):** maliyete bağlı parçanın lira fiyatı bugünkü lira maliyet × kâr katı; döviz fiyat hiç türetilmiyor, elle giriliyor. R16 bu kararı korur, yani kur donmuş olduğu için satış fiyatı da sabit kalır.
- **Tarihli maliyet (0097) ve donan parti (0136):** geçmiş kaydı bugün `{gecerli, kurus}` yani yalnız lira; kapanmış partinin maliyeti kapanış anında dondurulup kaydediliyor. Geçmişe döviz eklenmesi (C4) "geçen yıl kaç dolardı" sorusunu açar ve donmuş parti rakamlarına dokunmaz.
- **Geçmiş yazımının tek kapısı var:** `maliyetGecmisiYaz` set ve malzeme kaynaklı parçalarda geçmiş yazmıyor ve üç çağıranı var (parça kartının kayıt fonksiyonu, tarih yoklaması, Excel içe aktarması). Kur değişimi de bu kapıdan geçecek (C9).
- **Excel şablonu on altı sütun** (spec öncesi iddia "on bir sütun" diyordu, kodda ölçüldü ve düzeltildi) ve içe aktarma sütunları **konuma göre** eşliyor. 0158 son beş sütunun sırasını sabitledi: 12 ve 13. sütun bu spec'e ayrılmış durumda (`MALIYET_PB_BASLIKLARI` = "Maliyet Para Birimi", "Maliyet Kuru"; bugün boş yazılıyor, okunmuyor ve dolu hücre satır numarasıyla reddediliyor), 14 ile 16 parçanın bilgi alanları. Yani bu iş yeni sütun eklemez, var olan iki sütunu okumaya açar ve o reddi kaldırır (R18/2). Maliyet hücresi bugün her parçada çözülmüş lira yazıyor. Eski on bir sütunlu şablonun çalışmaya devam etmesi korunur.
- **Bilinen tuzaklar:**
  - **`parts.maliyet`'in anlamı genişliyor.** Bugün lira; döviz para biriminde girilince aynı alan parçanın kendi para birimindeki tutarı taşır. Alanı doğrudan okuyan iki yer var (parça kartının formu ve Excel aktarması) ve 0133'ün taraması satış dosyalarında bu alanın okunmasını zaten yasaklıyor; yeni bir okuyucu eklenirse kuru görmeden yanlış rakam okur.
  - **Kur ondalığı.** Ölçülen kurlar altı ondalıklı (50,370257); kur ayrıştırıcısı elle girişte dört, türetilen ve öneriden gelen değerde altı ondalık kabul ediyor (0152) ve tutar ayrıştırıcısı kur için kullanılamaz, çünkü noktayı binlik sayar.
  - **Karışık kalemli parça.** Bir parçada dolar işlem, lira işlem ve dolar malzeme birlikte olabilir; toplam lira karşılıklarının toplamıdır (R10) ve kalem başına tek yuvarlama yapılmazsa kuruş sapmaları birikir.
  - **Kur girilmemiş döviz kayıt.** Ölçümde "PASLANMAZ ÇUBUK MALZEME" USD ve kuru dolu ama kilo fiyatı boş; benzeri parça tarafında da olacak, bu yüzden eksik kur ve eksik tutar hâlleri "girilmedi" olarak ayrı ayrı ele alınmalı (R7, R19), yoksa maliyet sessizce sıfır görünür.
  - **Set maliyeti bileşenlerden geliyor.** Dövizli bileşenin lira karşılığı kullanılır; setin kendi para birimi kavramı yok ve açılmamalı (sekiz set var).

### QA turunda ölçülenler (2026-11-23)

Hepsi bugünkü kodda (HEAD) ölçüldü; uygulama bu tabloyu başlangıç durumu sayar.

| # | Ölçüm | Sonuç |
|---|---|---|
| A | Sipariş motorunda hazır parçanın tutarının para birimi | `siparisIhtiyaci.js:735` satırında sabit: `{ pb: "TRY", k: x.tutarK }` |
| B | Aynı satırın birim tutarı | `parcaMaliyetKurus(...)`, yani lira kuruş; parçanın kendi para birimi hiçbir yerde okunabilir değil |
| C | İşlem kaleminin sipariş tutarı | `kurus(ik.tutar)` ile koşulsuz lira; "İşlemler toplamı" lira, genel toplam `toplamTLK + islemToplamK` |
| D | Maliyet geçmişinin tetikleyicisi | `maliyetGecmisiYaz` eski ve yeni ÇÖZÜLMÜŞ kuruşu karşılaştırır |
| E | Geçmiş satırının okunması | `maliyetGecmisiOf` satırı `{ gecerli, kurus }` ikilisine indirir, fazladan anahtarları düşürür |
| F | `parts` tablosu | 25 sütun; `maliyet` REAL; okuma ayıklamalı (boş maliyet gövdeye yazılmıyor) |
| G | Excel şablonu | 16 sütun; 12 ile 13 bu spec'e ayrılmış, dolu hücre satır numarasıyla reddediliyor |
| H | Şablonun örnek satırı | 12 ile 13. hücreleri boş |
| I | Parça kartının "dokunulmadı" dalı | Maliyet alanlarını sabit bir anahtar listesinden kopyalar; listede olmayan alan düşer |
| J | Günün kuru | `Settings.jsx` `rates` ile `ratesErr` değerlerini yalnız malzeme paneline veriyor, parça paneline vermiyor |
| K | Malzeme kartının kur açılışı | Kayıtlı kurla açılıyor, öneri ipucunda ve bir düğmede (0132 triyaj kararı) |
| L | Sapma uyarısı | `kurSapmaUyarisi` yaprak modülde hazır, yüzde elli eşiğiyle |
| M | Parça listesinde "eksik" rozeti | Yok; maliyeti girilmemiş parça hücrede `—` yazıyor ve sayfanın üstündeki sayaca giriyor |
| N | Maliyet alanının ayrıştırıcısı | Tutar ayrıştırıcısı; 0087 triyajının belirsiz sayı reddi yerinde |
| O | Kur ayrıştırıcısı | Metinde elle dört, öneri ve türetilen kaynakta altı ondalık; sayı girdisi sınıra takılmaz |
| P | Excel'in maliyet hücresi | Her parçada çözülmüş lira |
| Q | Lira karşılığının çarpımı | `gider.dovizdenLiraK` zaten var ve `urunAgaci.js` o modülü zaten içe alıyor |
| R | Malzeme kaleminin çarpımı | `malzeme.js` içinde kendi satırında (fireli kilo × fiyat × kur) |
| S | Maliyet metinleri | Alan etiketi, ipucu ve işlem kaleminin tutar etiketi lira varsayıyor ("TL karşılığını girin") |
| T | Kalem satırının tutar hücresi | Yalnız lira yazıyor |
| U | Malzemenin fiyat kümesi | Değişiklik, kümenin tamamının anahtarıyla ölçülüyor (bu işin tetikleyici emsali) |
| V | Maliyetin tüketicileri | Satış fiyatı, Model Maliyetleri, Parti Hesabı ve set maliyeti tek okuma yolundan okuyor |

### QA turunda verilen kararlar (2026-11-23)

**B1 · Bloklayıcı · Sipariş belgesindeki döviz tutar.** Tek okuma yolu lira kalır, yanına kardeş bir okuyucu açılır ve onu yalnız sipariş motoru çağırır (R15/2, C1/2) — *neden:* motor bugün hazır parçanın para birimini sabit lira sayıyor (ölçüm A, B), R15 ise parçanın kendi para birimini istiyor; kardeş okuyucu C1'i bozmadan bu bilgiyi verir.

**B2 · Bloklayıcı · Döviz işlem kaleminin sipariş tutarı.** İşlem satırı para birimini ve lira karşılığını taşır, işlemler toplamı para birimi başına verilir, genel toplam lira karşılıklarından toplanır (R8/2) — *neden:* bugünkü kod işlem tutarını koşulsuz lira sayıyor (ölçüm C), yani dolar kalem sessizce bire bir basılır ve genel toplam yanlış çıkar.

**B3 · Bloklayıcı · Geçmişin tetikleyicisi.** Tetikleyici üçlü anahtar olur (döviz tutar, kur, lira kuruş) ve geçmişin okunması döviz alanlarını korur (R5/2, C4/2) — *neden:* bugün yalnız çözülmüş kuruş karşılaştırılıyor (ölçüm D), yani tutar ile kur birlikte değişip lira aynı kalınca kayıt düşmüyor ve R5 kâğıt üstünde kalıyor; okuma da satırı ikiye indiriyor (ölçüm E).

**B4 · Bloklayıcı · Alanların adı ve anlamı.** `parts.maliyet` parçanın kendi para birimindeki tutar olur, yanına `maliyetParaBirimi` ve `maliyetKuru` gelir; işlem kalemi JSON içinde `paraBirimi` ile `kur` taşır (R1/2, C7/2) — *neden:* Excel başlıkları bu adları zaten sabitlemiş (ölçüm G); maliyeti lira bırakıp ayrı bir döviz alanı açmak iki doğruluk kaynağı yaratır ve karışık sürümde hangisinin kazandığı belirsiz kalır.

**Ö1 · Önemli · Excel sütun sayısı.** Context düzeltildi, R18/2 "yeni sütun eklenmez, var olan iki sütun okunur" dedi — *neden:* doküman on bir sütun diyordu, kodda on altı (ölçüm G); sona sütun eklenseydi 0158'in bilgi alanları kayardı.

**Ö2 · Önemli · Tek yazıcı ve dokunulmamış dal.** Üç alan her çağrıda silinip yalnız döviz kipinde yazılır, kopya listesi iki yeni alanı taşır (C7/3) — *neden:* kart maliyet alanlarını sabit bir listeden kopyalıyor (ölçüm I); listeye girmeyen alan dokunulmayan her düzenlemede düşer ve maliyet kur katı kadar yanlışa iner.

**Ö3 · Önemli · Para biriminin kipi.** Para birimi yalnız Elle sabit kipinde; Hesapla kipine geçişte parçanın iki alanı silinir (R1/3) — *neden:* elle maliyet ile kalem listesi birbirini dışlıyor, kalan değer sessiz bir çelişki olurdu.

**Ö4 · Önemli · Açılıştaki kur.** Form kayıtlı kurla açılır, öneri ipucunda ve bir düğmede durur (R2/2) — *neden:* malzeme kartında aynı soru triyajda çözüldü (ölçüm K); yoksa yalnız tutara dokunmak kuru sessizce değiştirir.

**Ö5 · Önemli · Günün kuru parça paneline inmiyor.** Prop zinciri açılır (R2/3) — *neden:* bugün yalnız malzeme paneline iniyor (ölçüm J), yani öneri ile çevrimdışı nedeni bugünkü zincirle karşılanamaz.

**Ö6 · Önemli · Sapma uyarısı.** Parça kartında ve işlem kaleminde uygulanır (R2/4) — *neden:* elle kur girişi bu işin ana yolu ve kural ile metin zaten hazır (ölçüm L), yazım maliyeti yok.

**Ö7 · Önemli · Intent verdiği sözü karşılamıyordu.** Intent daraltıldı ve X2'nin gerekçesi genişletildi — *neden:* "hangi parçanın maliyeti eskidi" sorusunu hiçbir madde cevaplamıyordu, cevabı X2 kapsam dışı bırakıyordu.

**Ö8 · Önemli · "Eksik işareti" tanımsızdı.** Ölçüt bugünkü mekanizma olur, yeni rozet açılmaz (R19/2) — *neden:* parça listesinde malzemenin rozetinin karşılığı yok (ölçüm M); var olan sayaç ve `—` hücresi aynı soruyu zaten cevaplıyor.

**Ö9 · Önemli · İki ayrıştırıcı yan yana.** Hangi alanın hangisiyle çözüleceği yazıldı (C3/2) — *neden:* tutar ayrıştırıcısı noktayı binlik, kur ayrıştırıcısı ondalık sayıyor (ölçüm N, O); karıştırılırsa kur sessizce bin katına çıkar.

**Ö10 · Önemli · Excel'den gelen kurun ondalığı.** İçe aktarma altı ondalık kabul eder (R18/3) — *neden:* ölçülen kurlar altı ondalıklı ve elle sınırı dört (ölçüm O); aksi hâlde dışa aktar ile içe aktar turu kendi yazdığı kuru reddeder.

**Ö11 · Önemli · Excel hücresinin para birimi.** Hücre yalnız elle maliyetli parçada kendi para biriminde, ötekilerde çözülmüş lira (R18/4) — *neden:* içe aktarmanın karşılaştırma mantığı bugünkü lira hücresine bağlı (ölçüm P); kuralı yazmazsak kalem listeli parçada her tur bildirim doğar.

**Ö12 · Önemli · İki hata hâli.** Kur dolu para birimi boş satır ile tanınmayan para birimi aynı kuralla reddedilir (R18/5) — *neden:* spec yalnız ters hâli yazmıştı, kalan iki hâl tanımsızdı.

**Ö13 · Önemli · Tek çarpımın adı.** Çarpım var olan yardımcıdan, malzeme kaleminin kendi çarpımı gerekçeli istisna (C2/2) — *neden:* yardımcı zaten var ve içe aktarma yolu açık (ölçüm Q); istisna yazılmazsa tarama ilk gün iki çarpım bulup çelişir (ölçüm R).

**Ö14 · Önemli · Karışık sürüm riskinin yönü.** Risk cümlesi Constraints'e yazıldı (C5/2) — *neden:* güncellenmemiş bilgisayar döviz maliyeti lira sanar ve düzenlerse alanları düşürür; bu, sürüm notunun gerekçesidir.

**Ö15 · Önemli · Kıyas altını ile yeni alanlar.** Yeni anahtarlar yalnız döviz varken yazılır (C6/2) — *neden:* her satıra koşulsuz eklenen anahtar lira veride çıktıyı değiştirir ve "birebir aynı" kriteri ayıklama olmadan düşerdi.

**K1 · Küçük · Eskiyen metinler.** Etiket ve ipuçları para biriminden bağımsız yazılır (R12/2) — *neden:* üç metin de lira varsayıyor (ölçüm S) ve C10 metinlerin tek yerde olmasını istiyor.

**K2 · Küçük · Kalem satırının hücresi.** Döviz kalem kendi tutarını, kurunu ve lira karşılığını yazar (R12/3) — *neden:* hücre bugün yalnız lira yazıyor (ölçüm T), R12'nin kalem karşılığı eksikti.

**K3 · Küçük · Çevrim örneği.** Kuruş sapması olan ikinci bir örnek eklendi (AC-60) — *neden:* 120 × 40 tam sayı çıkıyor ve tek yuvarlama kuralını sınamıyor.

**K4 · Küçük · Etkilenen alanlar.** Dört dosya daha yazıldı (başlık satırı) — *neden:* prop zinciri, kalem alanı, sipariş motoru ve tek çarpımın modülü listede yoktu.

**K5 · Küçük · Kıyas altınının kapsamı.** Neyi taşıdığı ve fikstürün lira profilli olduğu yazıldı (C6/3) — *neden:* 0158'de fikstürün sanıldığı kadar sade olmadığı görüldü.

**K6 · Küçük · R16 ile R17 kod istemiyor.** İlgili kriterler "değişmedi" testi olarak işaretlendi (AC-62) — *neden:* dört tüketici de tek okuma yolundan okuyor (ölçüm V); işaretlenmezse uygulayan oraya gereksiz kod yazar.

### QA turu karar kaydı

| Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|
| B1 | Bloklayıcı | Kardeş döviz okuyucusu, tek okuma yolu lira kalır | R15/2, C1/2, AC-37, AC-38 |
| B2 | Bloklayıcı | İşlem satırı para birimi ve lira karşılığı taşır | R8/2, AC-39 |
| B3 | Bloklayıcı | Geçmişin tetikleyicisi üçlü anahtar, okuma korur | R5/2, C4/2, AC-40, AC-41 |
| B4 | Bloklayıcı | Alan adları sabitlendi | R1/2, C7/2, AC-42, AC-43 |
| Ö1 | Önemli | Excel on altı sütun, iki sütun okunmaya açılır | Context, R18/2, AC-44 |
| Ö2 | Önemli | Tek yazıcı ve dokunulmamış dalın kopyası | C7/3, AC-45, AC-46 |
| Ö3 | Önemli | Para birimi yalnız Elle sabit kipinde | R1/3, AC-47 |
| Ö4 | Önemli | Form kayıtlı kurla açılır | R2/2, AC-48 |
| Ö5 | Önemli | Günün kuru parça paneline iner | R2/3, AC-49 |
| Ö6 | Önemli | Sapma uyarısı uygulanır | R2/4, AC-50 |
| Ö7 | Önemli | Intent daraltıldı, X2 gerekçesi genişledi | Intent, X2 |
| Ö8 | Önemli | Eksik işareti bugünkü mekanizma | R19/2, AC-51 |
| Ö9 | Önemli | İki ayrıştırıcı karıştırılmaz | C3/2, AC-52 |
| Ö10 | Önemli | İçe aktarmada kur altı ondalık | R18/3, AC-53 |
| Ö11 | Önemli | Hücrenin para birimi parçanın kipine bağlı | R18/4, AC-54 |
| Ö12 | Önemli | İki hata hâli aynı kuralla | R18/5, AC-55 |
| Ö13 | Önemli | Tek çarpım var olan yardımcıdan | C2/2, AC-56 |
| Ö14 | Önemli | Karışık sürüm riski yazıldı | C5/2 |
| Ö15 | Önemli | Yeni anahtarlar yalnız döviz varken | C6/2, AC-57 |
| K1 | Küçük | Metinler para biriminden bağımsız | R12/2, AC-58 |
| K2 | Küçük | Kalem satırı üç rakamı yazar | R12/3, AC-59 |
| K3 | Küçük | Kuruş sapmalı çevrim örneği | AC-60 |
| K4 | Küçük | Etkilenen alanlar genişledi | Başlık satırı |
| K5 | Küçük | Kıyas altınının kapsamı | C6/3, AC-61 |
| K6 | Küçük | R16 ile R17 regresyon kriteri | AC-62 |

### Plan turunda verilen kararlar (2026-11-23)

Takım Yöneticisi planın on önerisini onayladı ("tüm önerilerini kabul ediyorum"):

| No | Konu | Karar |
|---|---|---|
| P1 | C5 ile R19 | Boş ya da TRY lira; tanınmayan para birimi "girilmedi" (kayıt değişmez, göç yok). — *neden:* R19, AC-32 ve AC-51 açıkça istiyor; yanlış para birimini lira saymak maliyeti kur katı kadar sessizce düşürür. 0153'teki "tanınmayan TL" kuralından bilinçli fark. |
| P2 | Dokunulmamış dal (C7/3) | İki alan `ESKI_MALIYET_ANAHTARLARI`'na girer: Hesapla kipinde kendiliğinden silinir, dokunulmamış elle dalda tutar, para birimi ve kur birlikte formdan gelir (form kayıtla açılır). — *neden:* tutar ile kur aynı kaynaktan okunur, ayrışamaz. |
| P3 | Okuyucu ve kapılar | Okuma `urunAgaci.js`'in içinde tek iç fonksiyonda; dışarı üç kapı: sipariş için `parcaDovizMaliyeti`, liste için `parcaMaliyetListeMetni`, Excel için `excelMaliyetHucreleri`. Tarama kardeş okuyucunun yalnız sipariş motorunda çağrıldığını ve iki alanın `urunAgaci.js`, `db.cjs` ve form dışında okunmadığını sabitler. — *neden:* C1/2'nin amacı para birimi kararının tek yerde olması; R13 ve R18 döviz tutarı yazmak zorunda. |
| P4 | Döviz işlem kaleminde geçmiş | İşlem kalemli parçada tetikleyici lira kuruş kalır; geçmiş satırına döviz alanı yalnız elle döviz parçada yazılır. — *neden:* kalem başına geçmiş bu turun kapsamını aşar. |
| P5 | Dövizden dövize geçiş | Öneri yazılır; dövizden TL'ye geçişte kur silinir (R2/2). — *neden:* kurun anlamı değişir, eski rakam yanlıştır ve %50 sapma eşiği USD/EUR farkını yakalamaz. |
| P6 | Şablonun örnek satırı | "USD" ve "40"; örnek maliyet 120,50 USD anlamına gelir. — *neden:* AC-44 örnek değer istiyor, "TRY" sütunun amacını göstermez. |
| P7 | Excel para birimi metni | "TRY" ve "TL" (harf büyüklüğünden bağımsız) lira; kur dolu ama para birimi lira olan satır R18/5 gibi ele alınır; maliyet hücresi boş ama para birimi ya da kur dolu satırda kayıt değişmez ve satır numarasıyla bildirilir. Triyajda: kalem listeli ve set parçanın satırında dolu iki hücre de kendi metniyle bildirilir; sayı olarak gelen kur altı ondalığa yuvarlanır. — *neden:* iki yönlü belirsizlik sessizce yanlış rakam yazmasın. |
| P8 | Kur çarpımı taraması | Bileşenler, `parcaAktarma.js` ve `urunAgaci.js` taranır; sipariş motorundaki malzeme kesidinin lira çarpımları malzeme tarafı (X5) olarak adıyla gerekçeli istisna. — *neden:* yoksa tarama ilk gün çelişir. |
| P9 | Belgede döviz hazır parçanın lira karşılığı | `birimK × adet` (tek okuma yolunun lira birimi). — *neden:* Model Maliyetleri ve maliyetin kendisiyle aynı rakam; döviz toplamı × kurdan birkaç kuruş ayrışabilir, bilinçli. |
| P10 | Karışık sürüm | Sürüm notu: önce sunucu PC, bütün istemciler güncellenene kadar döviz maliyet girilmez (C5/2). |

---

## Acceptance Criteria

- **AC-1.** Parça kartında maliyetin yanında para birimi seçicisi çizilir ve varsayılan TL'dir.
- **AC-2.** TL seçiliyken kart, liste hücresi ve kayıt gövdesi bu spec'ten önceki hâliyle birebir aynıdır.
- **AC-3.** Döviz seçilince kur alanı çizilir ve "1 USD = ? TL" biçiminde etiketlenir.
- **AC-4.** Döviz seçilince günün kuru öneri olarak alana gelir ve elle değiştirilebilir.
- **AC-5.** Çevrimdışıyken öneri gelmez, nedeni yazar ve elle kur girilerek kayıt yapılabilir.
- **AC-6.** Kuru girilmemiş döviz maliyet kaydedilemez, nedeni alanında yazar.
- **AC-7.** 120 USD maliyet ve 40 kur ile kaydedilen parçanın lira karşılığı 4.800 TL olur.
- **AC-8.** Kayıttan sonra günün kuru değişse de parçanın lira karşılığı değişmez.
- **AC-9.** Kur elle güncellenip kaydedilince lira karşılığı yeni kurdan hesaplanır.
- **AC-10.** Tutar ya da kur değişip kaydedilince maliyet geçmişine döviz tutarı, kuru ve lira karşılığını taşıyan yeni kayıt düşer.
- **AC-11.** Lira olarak girilmiş eski geçmiş kayıtları aynen görünür ve döviz alanları boş kalır.
- **AC-12.** Geçmişe dönük tarihli maliyet sorgusu o günün lira karşılığını döndürür.
- **AC-13.** İşlem kaleminin tutarının yanında para birimi ve kur girilir.
- **AC-14.** Dolar işlem kalemi, lira işlem kalemi ve dolar malzeme kalemi olan parçanın maliyeti üç kalemin lira karşılıklarının toplamıdır.
- **AC-15.** Tutarı girilmemiş döviz işlem kalemi toplama girmez ve uyarı olarak görünür.
- **AC-16.** Kuru girilmemiş döviz işlem kalemi parçanın maliyetini "girilmedi" yapar, sıfır yapmaz.
- **AC-17.** Parça kartı döviz maliyette hem döviz tutarı ile kuru hem lira karşılığını yazar.
- **AC-18.** Parça listesinin maliyet hücresi döviz parçada kendi tutarını ve lira karşılığını yazar.
- **AC-19.** Döviz maliyetli parçanın satış fiyatı lira maliyet ile kâr katından türer.
- **AC-20.** Kâr katı değişmeden kur güncellenince satış fiyatı da yeni lira maliyetten türer.
- **AC-21.** Model Maliyetleri döviz maliyetli parçayı lira karşılığıyla hesaplar.
- **AC-22.** Parti Hesabı açık partide bugünkü lira karşılığını, kapanmış partide donmuş rakamı kullanır.
- **AC-23.** Dövizli bileşeni olan setin maliyeti bileşenlerin lira karşılıklarının toplamıdır.
- **AC-24.** Sipariş listesinin fiyatlı nüshasında döviz parçanın tutarı kendi para biriminde basılır.
- **AC-25.** Aynı tedarikçi bölümünde dolar ve lira tutar birlikte varsa bölüm toplamı para birimi başına basılır.
- **AC-26.** Sipariş listesinin ekranında para gösterilmemeye devam eder.
- **AC-27.** Excel dışa aktarmasında döviz parçanın maliyet hücresi kendi tutarını, yeni iki sütun para birimini ve kuru yazar.
- **AC-28.** Excel içe aktarmasında para birimi ve kur sütunu dolu satır döviz maliyet olarak kaydedilir.
- **AC-29.** Para birimi sütunu boş satır lira maliyet olarak kaydedilir.
- **AC-30.** Eski on bir sütunlu şablon aynen içe aktarılır ve maliyetleri lira sayılır.
- **AC-31.** Para birimi dolu ama kuru boş Excel satırının maliyeti yazılmaz, nedeni satır numarasıyla bildirilir.
- **AC-32.** Tanınmayan para birimi taşıyan kayıt listede eksik olarak işaretlenir ve maliyeti "girilmedi" olur.
- **AC-33.** Lira maliyetli veride bütün motor çıktıları ve kayıt gövdeleri spec öncesi altınla birebir aynıdır (`tests/fixtures/0157-once.json`).
- **AC-34.** Kaynak taraması: lira karşılığının çarpımı tek yerde, kur okuması yaprak modülden, ekranlar ve Excel çevrim yazmıyor.
- **AC-35.** Yeni veri bölümü, yeni izin kimliği ve yeni sunucu kuralı eklenmedi (kaynak taraması).
- **AC-36.** Yeni alanlar dört nokta kuralıyla eklendi, boş değer gövdeye yazılmıyor ve tam tur testinde geçiyor.

### QA turu kriterleri (2026-11-23)

- **AC-37.** Parçanın kendi para birimindeki tutarı, para birimi ve kuru tek kardeş okuyucudan birlikte okunur; kalem listeli ve set parçada bu okuyucu boş döner.
- **AC-38.** Sipariş belgesinin fiyatlı nüshasında elle döviz maliyetli hazır parçanın tutarı kendi para biriminde basılır ve bölümün lira toplamı kayıtlı kurdan hesaplanır.
- **AC-39.** Döviz işlem kaleminin sipariş satırı kendi para biriminde basılır, işlemler toplamı para birimi başına verilir ve genel toplam lira karşılıklarından toplanır.
- **AC-40.** Döviz tutar ile kur birlikte değişip lira karşılığı aynı kalsa da maliyet geçmişine yeni kayıt düşer.
- **AC-41.** Maliyet geçmişi okunduğunda döviz tutar, kur ve para birimi alanları korunur; lira olarak yazılmış eski satırlarda bu alanlar yoktur.
- **AC-42.** Döviz maliyet `parts.maliyet`, `maliyetParaBirimi` ve `maliyetKuru` alanlarına yazılır; TL maliyette son iki alan kayıt gövdesinde hiç yoktur.
- **AC-43.** Döviz işlem kalemi `maliyetKalemleri` içinde `paraBirimi` ve `kur` taşır; TL kalemde bu anahtarlar yoktur.
- **AC-44.** Excel şablonu on altı sütun kalır, 12 ile 13. sütunlar okunur ve "bu sütunlar henüz okunmuyor" reddi kalkar; şablonun örnek satırı iki hücreye örnek değer yazar.
- **AC-45.** Maliyet bölümüne dokunulmadan kaydedilen döviz maliyetli parçanın para birimi ve kuru aynen korunur.
- **AC-46.** Hesapla kipine geçilince parçanın para birimi ve kuru kayıttan silinir.
- **AC-47.** Para birimi seçicisi yalnız Elle sabit kipinde çizilir; Hesapla kipinde para birimi kalem başınadır.
- **AC-48.** Döviz maliyetli parçanın düzenleme formu kayıtlı kurla açılır; günün kuru ipucunda durur ve düğmeyle alana yazılır.
- **AC-49.** Günün kuru parça paneline iner; köprüsüz ortamda öneri gelmez ve kart çizilmeye devam eder.
- **AC-50.** Girilen kur günün kurundan yüzde elliden fazla saparsa engellemeyen uyarı yazar ve kayıt yapılabilir.
- **AC-51.** Kuru girilmemiş ya da para birimi tanınmayan parçanın liste hücresi `—` yazar, parça "alış maliyeti girilmedi" sayacına girer ve yeni rozet çizilmez.
- **AC-52.** Tutar alanı tutar ayrıştırıcısıyla, kur alanı kur ayrıştırıcısıyla çözülür; belirsiz tutar reddi bugünkü metniyle sürer.
- **AC-53.** Dışa aktarılan dosya değiştirilmeden içe aktarılınca kur yüzünden bildirim doğmaz.
- **AC-54.** Excel maliyet hücresi elle maliyetli parçada kendi para biriminde, kalem listeli ve set parçada çözülmüş liradır; ikinci durumda para birimi sütunu boş yazılır.
- **AC-55.** Kuru dolu ama para birimi boş satırın ve tanınmayan para birimi taşıyan satırın maliyeti yazılmaz, nedeni satır numarasıyla bildirilir.
- **AC-56.** Kaynak taraması: lira karşılığının çarpımı var olan tek yardımcıdadır ve malzeme kaleminin kendi çarpımı tek gerekçeli istisnadır.
- **AC-57.** Lira veride sipariş motorunun çıktısına yeni anahtar eklenmez.
- **AC-58.** Maliyet alanının etiketi ve ipucu para biriminden bağımsızdır; "TL karşılığını girin" cümlesi kaynakta yoktur.
- **AC-59.** Döviz işlem kaleminin satırı kendi tutarını, kurunu ve lira karşılığını yazar; kalemlerin toplamı liradır.
- **AC-60.** Kuruş sapması olan bir çevrim (33,33 USD ile 41,1234 kur) tek yuvarlama kuralıyla doğrulanır.
- **AC-61.** `0157-once.json` motor çıktılarını, kayıt gövdesini, Excel satırını ve sipariş belgesini taşır ve lira profilli fikstürden üretilir.
- **AC-62.** Satış fiyatı, Model Maliyetleri, Parti Hesabı ve set maliyeti için yeni kod yazılmaz; AC-19 ile AC-23 "değişmedi" testidir.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap React'sız **saf motorda**; arayüz ve Excel yalnız gösteriyor (C2, AC-34).
- [ ] Aynı sayıyı üreten başka ekran varsa ikisi aynı kaynağı kullanıyor (maliyetin tek okuma yolu, C1; çapraz test).
- [ ] Yeni kalıcı alanlar için **dört nokta kuralı** uygulandı ve `db-roundtrip` testine eklendi.
- [ ] Yeni veri bölümü yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; parça kartının bugünkü izniyle çalıştığı açıkça yazıldı.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; sipariş belgesi Türkçe.
- [ ] Para gösteriliyorsa çoklu para kuralına uyuluyor; bilinmeyen para birimi tanımlı biçimde ele alınıyor (AC-32).
- [ ] Arayüz kriterlerinin **görsel kanıtı** eklendi (`docs/evidence/0157-*`), boş ve hata durumları dâhil.
- [ ] `0157-once.json` spec öncesi kodla üretildi ve lira veride birebir geçti; fikstürün lira profilli olduğu ayrıca ölçüldü (C6/3).
- [ ] Sipariş belgesinin iki yolu (hazır parçanın döviz tutarı, döviz işlem kalemi) para birimi başına basıldı ve genel toplam lira kaldı.
- [ ] Maliyet geçmişinin üçlü tetikleyicisi ve okumanın döviz alanlarını koruduğu ölçüldü.
- [ ] Excel'in 12 ile 13. sütunu okunmaya açıldı, 0158'in reddi kaldırıldı ve dışa aktar ile içe aktar turu sessiz kaldı.
- [ ] Tek yazıcı ile parça kartının dokunulmamış dalı ölçüldü (dokunulmayan düzenleme para birimini ve kuru düşürmüyor).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (parça maliyetinin para birimi ve donmuş kur kuralı).
- [ ] Sürüm notu yazıldı: önce sunucu bilgisayarı, bütün istemciler güncellenene kadar döviz maliyet girilmez.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Kullanıcının gerçek uygulamada bulduğu hata sayısı. |

**Bu spec'ten çıkarılan ders:**
