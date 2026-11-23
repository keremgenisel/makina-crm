# 0158 — Sipariş belgesi: parça bilgileri, kesilecek adet ve genel toplam

| | |
|---|---|
| **Durum** | Tamamlandı (commit `d5a45926`, 2026-11-23) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Sipariş belgesi (`siparisRaporu.js`), sipariş motoru (`siparisIhtiyaci.js`), sipariş penceresi (`stock/SiparisPenceresi.jsx`), Ayarlar › Katalog › Parça/Yedek Parça (kart ve liste), genel arama, parça Excel aktarması, `parts` tablosu |
| **Bağımlı spec'ler** | 0087 (parça kartı ve Excel), 0125 (aramada parça kataloğu), 0134 ve 0140 (sipariş ihtiyacı ve liste), 0142 ve 0147 (belgenin parça tablosu ve grupları), 0143 (boydan sipariş), 0144 (boy hücresi, bölüm toplamı, fiyatlı nüsha), 0150 (işlem kalemleri ve işlemler toplamı), 0149 (çok kelimeli arama), 0157 (Excel sütun sırası ve döviz) |
| **Revizyon** | 3 (2026-11-23 plan turu: P1–P16) |
| **QA turu** | 2026-11-23: 21 bulgu (4 Bloklayıcı / 12 Önemli / 5 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 2 (serbest metin ölçünün emsali ve `parcaOlculeri` satır atfı) |

> Bu spec, 2026-11-22 ve 2026-11-23'te ayrı ayrı yazılan üç taslağı (kesilecek adet, parça bilgileri, TL genel toplam) **tek işte** birleştirir. Gerekçe: üçü de aynı motoru, aynı belge kurucusunu, aynı kıyas altınlarını ve aynı kanıt turunu elden geçiriyor; ayrı ayrı yapılsa aynı dosyalar üç kez açılır ve belgenin altın çıktısı üç kez yenilenirdi. Birleştirilen taslakların numaraları (0160, 0161) yeniden kullanılmaz.

---

## Intent

Tedarikçiye giden sipariş belgesi üç ayrı yerde yetersiz kalıyor. Birincisi adet: "100_AYNA MAHRUTİ DİŞLİSİ TAKIM" bir takımdır ve malzeme kaleminde adedi 2'dir, yani 70 takım için 140 kesim gerekir, ama belge 70 yazıyor ve 140 hiçbir yerde geçmiyor; tedarikçi "parça başına 2" ekini gözden kaçırırsa yarısını keser. İkincisi tanım: cıvata ve rulman gibi satın alınan parçalarda asıl ayırt edici bilgi ölçü, hammadde ve cinstir, bunlar hiçbir alanda durmadığı için ada sıkıştırılıyor ya da telefonda söyleniyor; üstelik Ölçü sütunu yalnız malzemeden üretilen parçaların kesidini yazdığı için hazır parça bölümlerinde boş bir sütun duruyor. Üçüncüsü toplam: fiyatlı nüshada işlemler toplamı ile bölüm toplamı ayrı ayrı yazılıyor ama birleşmiyor, yani "bu firmaya bu partide toplam ne ödeyeceğiz" sorusunun cevabı belgede yok. Bu iş bittiğinde belge kesilecek adedi yazacak, parçayı kodu, ölçüsü, hammaddesi ve cinsiyle tanımlayacak (dolu olmayan sütunu çizmeden) ve bölümün altında lira cinsinden genel toplamı verecek.

---

## Requirements

### A. Parçanın bilgi alanları

- **R1.** Parça kartında kodun ardından üç serbest metin alanı olur: ölçü, hammadde ve cins. Üçü de isteğe bağlıdır.
- **R2.** Alanlar boş bırakılabilir; boş alan kayıt gövdesine yazılmaz ve hiçbir yerde satır ya da sütun doğurmaz.
- **R2/2.** Üç alanın tek yazıcısı parça kartının kayıt fonksiyonudur: alanlar her çağrıda silinir, değerler kırpılır ve yalnız doluyken yazılır; düzenlemede boşaltılan alan eski kayıttan geri gelmez (`tedarikciId` ve `fiyatKipi` deseni).
- **R3.** Alanlar yalnız bilgidir: maliyete, fiyata, sipariş adedine, stoğa ve hiçbir hesaba girmez.
- **R3/2.** Taramanın yasak listesi maliyet ve fiyat yoludur (`urunAgaci.js`, `maliyetKalemleri.js`, `malzeme.js`, `parcaFiyati.js` ve stok dosyaları); sipariş motorunda tek izinli okuyucu belge satırını kuran yerdir, çünkü sütunları o kurar.
- **R4.** Cins alanı, parçanın bugünkü **tipinden** (parça tipi tanımları) ayrı bir kavramdır; ikisi aynı ekranda ayrı etiketlerle durur.
- **R5.** Parça listesinde dolu alanlar parçanın adının altında küçük bir satırda görünür; hiçbiri dolu değilse satır çizilmez.
- **R5/2.** Satır dolu alanları ölçü, hammadde ve cins sırasıyla, etiketsiz, küçük puntoyla ve kendi kimliğiyle yazar; set rozetinin ve kalem kaynağı satırının altında durur.
- **R6.** Genel aramada bu üç alan da aranır; parça adında geçmeyen bir kelime bu alanlarda geçtiğinde sonuç satırı nedenini yazar.
- **R6/2.** Neden satırının başlık kümesi bugün nedensiz geçen alanlardır (ad, İngilizce ad, kod); neden alanları sırayla ölçü, hammadde ve cinstir ve her biri kendi etiketini taşır. Sonucun meta satırı değişmez.

### B. Belgenin parça sütunları

- **R7.** Belgede parçanın kodu kendi sütununda yazılır.
- **R7/2.** Sütunların sırası Parça, Kod, Ölçü, Hammadde, Cins ve Sipariş adedidir; fiyatlı nüshada Tutar sonda durur. Sıra, hizalar ve genişlikler bu tek sütun kümesinden türetilir.
- **R8.** Ölçü sütunu iki kaynaktan dolar: parçanın malzeme kalemi varsa bugünkü kesit metni, yoksa parçanın kendi ölçü alanı. İkisi de varsa kesit yazılır.
- **R8/2.** İki kaynağın birleşmesi motorda bir kez yapılır ve satırın ayrı bir alanına yazılır; serbest metin ölçü `olculer` dizisine girmez, çünkü o dizi gruplamayı, kesit eşlemesini ve tutarı besliyor. Pencere ile belge aynı alanı basar.
- **R9.** Hammadde ve cins kendi sütunlarında yazılır.
- **R10.** Bir grup tablosunda (hammadde başlığı ya da hazır parçalar) hiçbir satırda dolu olmayan sütun o tabloda çizilmez; aynı belgenin başka tablosunda dolu varsa orada çizilir. Kural dört sütunun her biri için ayrı ayrı işler.
- **R11.** Bu alanların hiçbiri dolu olmayan parçanın **satırı belgeden düşmez**: parça adı ve sipariş adedi bugünkü gibi yazılır.
- **R12.** Dört sütun birden dolu olduğunda tablo sığsın diye sipariş belgesinin gövde genişliği artar; genişleme yalnız bu belgeye uygulanır, öteki raporların yerleşimi değişmez.
- **R12/2.** Gövde (kenar dolgusuyla birlikte, P1) en çok 780 pikseldir ve A4 dikey kâğıdın içinde kalır; kalan yer grup tablolarının hücre yazı boyu ile dolgusunun bir kademe küçülmesinden ve iki serbest metin sütununun satır kırmasından gelir. Üçü de yalnız sipariş belgesinin kendi ek stilindedir.
- **R13.** Sütunların gizlenmesi tablonun hizasını bozmaz; kalan sütunlar tabloyu doldurur.
- **R13/2.** Sütun genişlikleri ve hizalar sütun kümesinden türetilir ve tablo başına uygulanır; kümesi aynı olan tablolar aynı genişlikte kalır, kümesi farklı olan tablo kendi genişliğinde çizilir.
- **R14.** İşlem (alım) tablosunda bu sütunlar çizilmez; o tablo parça, işlem ve adet yazmaya devam eder.
- **R15.** Sipariş penceresinin ekranında dolu alanlar parçanın satırında görünür, pencerenin bugünkü sütun düzeni korunur.
- **R15/2.** Pencerenin Ölçü hücresi R8/2'nin alanını basar; üç alan parçanın adının altında görünür ve pencerenin sütun sayısı değişmez.

### C. Kesilecek adet

- **R16.** Belgedeki Sipariş adedi hücresi, malzeme kaleminin adedi birden büyük olan satırda **kesilecek adedi** yazar: parçanın sipariş adedi çarpı kalemin adedi.
- **R16/2.** Sütun başlığı "Sipariş adedi" kalır ve işlem tablosunun başlığıyla aynı metin olmayı sürdürür (0150 R2/2); türetmeyi R17'nin alt satırı anlatır.
- **R17.** Hücrenin altında küçük bir satır hesabı açıklar: parça adedi ve kalem adedi birlikte yazılır.
- **R18.** Kalem adedi bir olan satırda hücre bugünkü gibi parça adedini yazar ve açıklama satırı çizilmez.
- **R19.** Parçanın aynı hammaddede birden çok ölçüsü varsa her ölçünün kendi kesilecek adedi, ölçü satırlarıyla hizalı yazılır.
- **R19/2.** Sipariş adedi hücresi ölçü başına bir satır yazar ve Ölçü hücresinin bastığı **aynı süzülmüş listeyi** gezer: boydan ölçü bugünkü biçimiyle, kalem adedi birden büyük ölçü kesilecek adetle, öteki ölçü parça adediyle. Satırların altındaki küçük satır, satırlardan biri çıplak parça adedi değilse yazılır. Bölme yalnız en az bir satır kesim ya da boy satırıyken yapılır; bütün satırlar çıplak parça adediyse hücre bugünkü gibi tek rakam yazar (P2).
- **R19/3.** Kesilecek adet ölçü nesnelerine yazılmaz, satıra ait yeni bir dizi olur; ölçü nesneleri pencere ile belge arasında ve aynı parçanın bölümleri arasında paylaşılıyor.
- **R20.** Boydan sipariş edilen satırın bugünkü davranışı değişmez: hücre boy adedini, altındaki satır parça adedini yazar.
- **R20/2.** Boydan sipariş edilen ölçü R19/2'nin listesinde bir satırdır ve biçimi aynen korunur.
- **R21.** Ölçüsü olmayan hazır parça satırında hücre bugünkü gibi parça adedini yazar.
- **R22.** Kesilecek adet hesaplanamıyorsa (kesit kapatılmış, malzeme çözülemiyor) hücre parça adedini yazar, uydurma rakam üretilmez.
- **R23.** Ölçü hücresindeki "parça başına n" eki kalır.
- **R24.** Kural parçanın adına bakmaz, kalemin adedine bakar: adı "TAKIM" geçmeyen ama adedi birden büyük her kalem aynı biçimde yazılır.
- **R25.** Sipariş penceresinin ekranı parça adedini gösterir ve elle düzenleme parça adedini alır; ekranda kesilecek adedin belgede yazıldığını söyleyen bir ibare bulunur.

### D. Genel toplam

- **R26.** Fiyatlı nüshada tedarikçi bölümünün sonunda, var olan iki toplam satırının altında **Genel toplam (TL)** satırı yazılır.
- **R26/2.** Genel toplam bölümün sonunda kendi satırıdır ve işlemler toplamı hesaplanmışsa yazılır; hangi toplam satırının bulunduğuna bakmaz, yani parça satırı olmayan bölümde de yazılır.
- **R27.** Genel toplam, bölüm toplamının kayıtlı kurla lira karşılığı ile işlemler toplamının toplamıdır.
- **R28.** Var olan iki satır değişmez: işlemler toplamı lira olarak, bölüm toplamı kendi para biriminde ve kayıtlı kurla lira karşılığıyla yazılmaya devam eder; bölüm toplamının kapsam cümlesi de aynen kalır.
- **R29.** Genel toplam satırı yalnız bölümde işlem tutarı varken yazılır.
- **R30.** Bölümün lira karşılığı ya da işlemler toplamı hesaplanamıyorsa genel toplam yazılmaz; durumu bugünkü tutarsız satır uyarısı anlatır.
- **R30/2.** Bölümün lira karşılığı kısmen hesaplanmışsa (bazı satırların tutarı yok) genel toplam yazılır ve yanında bugünkü tutarsız satır sayacı durur; bastırılmaz, çünkü bastırmak işlemler toplamını da gizler.
- **R31.** Bölümde birden çok para birimi varsa hepsinin kayıtlı kurla lira karşılığı toplanır; genel toplam her zaman tek rakam ve liradır.

### E. Ortak

- **R32.** B, C ve D'deki kurallar fiyatsız ve fiyatlı nüshada aynı işler; tutar ve toplam satırları yalnız fiyatlı nüshada basılır (bugünkü kural).
- **R33.** Malzemenin kilogram hesabı, asgari sipariş, yuvarlama, bölüm toplamı ve sipariş adedi hesabı değişmez.
- **R34.** Sipariş penceresinin ekranında para gösterilmez.

### F. Excel

- **R35.** Parça şablonuna üç sütun (ölçü, hammadde, cins) eklenir ve şablonun sonunda durur; eski şablonlar aynen içe aktarılır ve alanları boş sayılır.
- **R35/2.** Şablonun son beş sütununun sırası şimdi sabitlenir: on ikinci ve on üçüncü sütun 0157'nin maliyet para birimi ile kuru, on dördüncü, on beşinci ve on altıncı sütun bu işin ölçüsü, hammaddesi ve cinsi. Hangi iş önce girerse yalnız kendi konumlarına yazar, öteki konumlar başlığıyla ayrılır.
- **R36.** Dışa aktarma dolu alanları yazar, boş alanları boş hücre bırakır.
- **R37.** İçe aktarma bu üç sütunu okur ve kayda yazar; boş hücre kayıtlı değeri **silmez**, dolu hücre üzerine yazar.
- **R37/2.** Boş hücre kayıtlı değere düşer; kayıtlı değer de boşsa anahtar hiç yazılmaz. Mevcut metin alanlarının boş dize yazan kalıbı bu üç alanda kullanılmaz, çünkü C2 boş değeri gövdede yasaklıyor.

---

## Constraints

### Uyulması zorunlu

- **C1.** Bütün kararlar ve çarpımlar motorda verilir: kesilecek adet, hangi sütunun çizileceği ve genel toplam bölüm nesnesinde hazır alan olarak durur; belge kurucusu satırları tarayıp karar üretmez ve aritmetik yazmaz.
- **C2.** Üç yeni alan kalıcıdır ve dört nokta kuralıyla eklenir; boş değer kayıt gövdesine yazılmaz.
- **C2/2.** Okuma yolu üç alanı açıkça ayıklar ve yalnız doluyken gövdeye ekler; `parts` okuması `SELECT *` ile yayıldığı için ayıklanmayan bir sütun her parçanın gövdesine boş değer koyar ve sunucunun bölüm karşılaştırmasını her kayıtta tetikler.
- **C3.** Ad tuzağı: parçada bugün `hammaddeler` (eski maliyet kırılımı) ve `malzemeSatiri` alanları var; yeni hammadde alanının adı bunlarla karışmayacak biçimde seçilir ve eski alanlara dokunulmaz.
- **C3/2.** Alan adları `olcu`, `hammaddeAdi` ve `cins`. Tuzak C3'ün yazdığından geniştir: `tedarikciler[].hammadde` tekil ve boolean bir bayraktır ve sekiz yerde okunuyor, bu yüzden parçanın alanı `hammadde` olamaz.
- **C4.** Ad tuzağı: `tip` parça tipi tanımlarına bağlıdır (kalıp işi bayrağı oradan okunur); cins onunla aynı ada ya da aynı anlama gelmez.
- **C5.** Sütun listesi tek yerde tanımlı kalır (bugünkü sütun sabiti) ve koşullu çizim o tanımın üstüne gelir.
- **C6.** Belge gövdesinin genişlemesi **yalnız sipariş belgesinin kendi ek stilinden** yapılır; paylaşılan rapor sunum modülüne dokunulmaz, çünkü Aylık Faaliyet Raporu ile Aylık Gider ve Kasa Raporu aynı modülü kullanıyor ve faaliyet raporunun çıktısı birebir altınla sabitli.
- **C7.** Genel toplamın lira karşılığı malzemenin **kayıtlı** kurundan gelir; günün kuru okunmaz ve yeni bir çevrim yazılmaz.
- **C8.** Kesilecek adet kuralı yalnız **yazılan rakamı** değiştirir: hiçbir ağırlık, tutar, asgari sipariş ve toplam değişmez.
- **C9.** Dokunulmamış veride (üç alan boş, kalem adedi bir, işlem kalemi yok) belge, pencere, liste ve Excel çıktısı bu spec'ten önceki hâliyle birebir aynıdır (kıyas altını).
- **C9/2.** C9'un kapsamı daralır: motor çıktısı, pencere, liste ve Excel birebir aynıdır; belgede tek bilinçli fark, bütün satırlarında boş kalan Ölçü sütununun o grup tablosunda çizilmemesidir ve kıyas bu farkı gösterir. Boş sütunu kaldırmak Intent'in üç isteğinden biridir, yani R10 doğru; daralan C9'un kapsamıdır. Bu iddia kodsuz katalogda geçerlidir: dokunulmamış ama kodu girilmiş katalogda ilk baskıda Kod sütunu da çıkar (R7), bu ikinci bilinçli farktır ve kıyas onu ayrıca gösterir (triyaj bulgu 4).
- **C9/3.** Eski altınlar iki kümeye ayrılır: motor çıktısı tutanlar yalnız bu spec'in yeni anahtarları düşürülerek kıyaslanır (0150 ve 0142 ayıklama emsali), belge HTML'i tutanlar **yenilenmez**: yeni HTML dar bir ayıklamayla (`0158-ayikla.js`) eski biçime çevrilir ve eski altınla birebir karşılaştırılır; ayıklamanın geri aldığı her şey bu spec'in bir kuralıdır (P10).
- **C9/4.** Kıyas fikstürü dokunulmamış profildedir: kalem adedi bir, üç alan boş, işlem kalemi yok.
- **C10.** Yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı ve göç yok.
- **C11.** Kullanıcıya görünen bütün metinler Türkçe ve tek yerde sabit.
- **C11/2.** Bu işin üç yeni metni (ekranın kesilecek adet ibaresi, hücrenin altındaki açıklama ve genel toplam etiketi) motorun metin sabitleri arasında tek yerdedir; alan değerleri kırpılır, uzunluk sınırı konmaz ve belge hücresi satır kırar.

### KAPSAM DIŞI

- **X1.** Ekranda kesilecek adedin düzenlenebilmesi — *neden:* ihtiyaç ve stok parça bazında hesaplanıyor, bölünemeyen değerde belirsizlik doğar.
- **X2.** "Alınacak malzeme toplamı" tablosunun belgeye geri gelmesi — *neden:* 2026-11-15 isteğiyle kaldırıldı; kesilecek adet artık parça satırında yazıyor.
- **X3.** Parça adına göre davranan kural — *neden:* ad desenleri uygulamada bilinçle yasak (parça tipi ve kalıp işi dersleri).
- **X4.** Boydan sipariş edilen satırın biçiminin değişmesi — *neden:* 0144 ile bu yıl kararlaştırıldı ve doğru çalışıyor.
- **X5.** Bu alanları boş olan parçanın satırının belgeden çıkarılması — *neden:* sipariş edilecek parça belgeden düşerse eksik üretim doğar; gizlenen yalnız sütundur (R11).
- **X6.** Teklif, proforma, servis formu ve müşteriye giden öteki çıktılar — *neden:* bu iş tedarikçiye giden belgeyi hedefliyor.
- **X7.** Hammaddenin malzeme kataloğundan seçilmesi — *neden:* katalog çubuk ve sac kayıtlarından oluşuyor, cıvatanın hammaddesi orada yok; serbest metin seçildi.
- **X8.** Ölçünün yapılandırılması (çap, boy, anma ayrı alanlar) — *neden:* cıvata, rulman ve segman biçimleri tek şemaya sığmıyor.
- **X9.** Üç alana göre süzme ve gruplama — *neden:* serbest metin yazım tutarsızlığı taşır, süzme ayrı iş.
- **X10.** Var olan parçaların adından ölçü ayıklanması — *neden:* ad desenine göre davranan kural yasak; alanlar elle ya da Excel'le doldurulur.
- **X11.** Belgenin tamamı için tek genel toplam (bütün tedarikçilerin toplamı) — *neden:* belge tedarikçi başına sipariş verilmek üzere basılıyor.
- **X12.** Bölüm toplamının anlamının değişmesi — *neden:* Takım Yöneticisi kararı, bugünkü rakam ve kapsam cümlesi korunuyor.
- **X13.** Sipariş penceresinde para gösterilmesi — *neden:* 0142 kararı.
- **X14.** Öteki raporların (aylık faaliyet, gider ve kasa) genişlemesi — *neden:* C6.
- **X15.** KDV eklenmesi — *neden:* belgedeki bütün tutarlar KDV hariçtir ve öyle kalır.
- **X16.** Sipariş belgesinin yatay basılması — *neden:* baskı seçenekleri bütün belgelerin paylaştığı köprüdedir (`printToPDF`); yedi sütun R12/2'nin genişliğine sığmazsa ayrı iş olarak ele alınır.

---

## Context

### Kesilecek adet

- **Bugünkü kural bilinçli, ama yarım.** Belge satırının `siparis` alanı parçanın sipariş adedi; kesim sayısı yalnız ölçü hücresinin ekinden okunuyor (`siparisIhtiyaci.js:858` `olcuMetni`, ek `parcaBasinaMetni` `:96`, 0142 B-R5/3 ve 0147 R7). Bildirilen belgede bu "Ø65 × 27 mm · parça başına 2" ile 70 olarak görünüyor.
- **Boy tarafı simetriğini zaten yapmış:** 0144'ün 2026-11-15 turunda boydan satırın hücresine "n boy (çubuk mm)" (`boySiparisMetni` `:892`) ve altına "N parça" (`parcaAdetMetni` `:893`) kondu. Yeni metinler bu ikisinin kardeşi olacak.
- **Kilogram zaten doğru hesaplanıyor.** Malzeme kesidi parça adedini kalem adediyle çarparak topluyor (0135), yani tedarikçinin keseceği ağırlık bugün de doğru; yanlış olan tek şey satırda yazan adet.
- **Ölçülen örnek (2026-11-22, canlı veri):** "2026 YILININ İKİNCİ PARTİ" belgesinde model satırları 40 + 25 + 5 = 70 makina; 100_AYNA MAHRUTİ DİŞLİSİ TAKIM satırı 70 yazıyor, malzeme kalemi Ø65 × 27 mm ve adet 2, kalem toplamı 235,32 lira (bir adet 117,66), yani maliyet tarafı iki kesimi zaten sayıyor. Beklenen rakam 140.

### Parça bilgileri

- **Parçada bu alanlar yok.** `parts` tablosu bugün ad, adEN, kod, tanım, tanımEN, üç fiyat, modeller, tip, resim, maliyet ve maliyet kalemlerini taşıyor; ölçü, hammadde ve cins hiç yok. Kalıp tanımında da yok. Serbest metin ölçünün emsali başka bölümlerde var (`part_sales.olcu` Extra Kalıp'ın ölçüsü, üretim formu satırının `kalipOlcusu`); hammadde ve cins için hiçbir emsal yok.
- **Belgenin Ölçü sütunu tek kaynaklı:** `siparisRaporu.js:39` `BELGE_SUTUNLARI.parca = ["Parça", "Ölçü", "Sipariş adedi"]` ve hücre parçanın malzeme kalemlerinden üretiliyor (0142 C3). Malzeme kalemi olmayan hazır parçada hücre boş kalıyor; bildirilen AKSU CNC TEC OTO durumu bu.
- **Gruplar hazır:** 0147'den beri tedarikçi bölümü hammadde başına ve "Hazır parçalar" başlığına bölünmüş ayrı tablolar çiziyor, yani "o tabloda hiç dolu yoksa sütunu çizme" kuralının uygulanacağı birim zaten var.
- **Arama tarafı hazır:** 0125 ile "Yedek Parça Tanımları" kategorisi ad, İngilizce ad ve kodu arıyor; 0149 ile her kelime ayrı aranıyor, yani "paslanmaz M8" gibi karışık sorgu da çalışır.
- **Canlı veride ölçülenler (2026-11-22):** 433 canlı parçanın 93'ü elle maliyetli (ölçü ve cins bilgisinin asıl gerekeceği küme), 149'u malzemeden hesaplanıyor (ölçüsü kesitten geliyor), 174'ünün hiç maliyeti yok.

### Genel toplam

- **İki rakam motorda ayrı ayrı var:** `siparisIhtiyaci.js:609` `b.islemToplamK` (bölümün işlem kalemlerinin lira toplamı, 0150 R9) ve `:733` `b.toplamTLK` (bölüm toplamının kayıtlı kurla lira karşılığı, 0144), yanında `:734` `b.dovizVar`. Belge bunları iki ayrı satır olarak basıyor (`siparisRaporu.js:109` ve `:117`).
- **Ayrılık bilinçliydi:** 0150 R9/2 ve X3, işlem tutarının bölüm toplamına ve tutarsız sayacına girmemesini kararlaştırmıştı. Bu spec o kararı ters çevirmiyor, üstüne üçüncü bir rakam ekliyor (R28).
- **Ölçülen örnek (2026-11-23):** İKİZLER PASLANMAZ bölümünde iki malzeme satırı 931,29 ve 872,34 dolar, iki işlem satırı 40.000 ve 30.000 lira; işlemler toplamı 70.000,00 lira, bölüm toplamı 1.803,63 dolar ve kayıtlı kurla 90.617,94 lira. Beklenen genel toplam 160.617,94 lira.

### Bilinen tuzaklar

- **Kıyas altınları.** Belge çıktısını sabitleyen altınlar (0144 ve 0147 turları) bu işte üç ayrı nedenle değişir; dokunulmamış veride (kalem adedi bir, alanlar boş, işlem kalemi yok) birebir aynı kalmalı (C9) ve ayıklama bunu ayırmalı. Üç işin birlikte yapılmasının asıl kazancı burada: altınlar bir kez yenilenir.
- **Ekran ile belge aynı satırda farklı rakam gösterecek** (70 ve 140). İbare (R25) olmazsa bu bir kusur gibi okunur.
- **Parçanın aynı hammaddede birden çok ölçüsü olabilir.** Belge satırı `olculer` dizisi taşıyor (`parcaOlculeri` tanımı `:740`, dizinin kurulduğu satır `:235`); kesilecek adet ölçü başına yazılmalı (R19), tek rakam olarak değil.
- **Gövde genişliği paylaşılan modülde.** `raporSunumu.js:58` bütün raporların gövdesine `max-width:720px` veriyor; grup tablolarının sabit yüzdeleri `siparisRaporu.js:97` `GRUP_TABLO_STILI`'nde (fiyatsız üç, fiyatlı dört sütun). Genişletme paylaşılan satırdan yapılırsa Aylık Faaliyet Raporu'nun altın çıktısı kırılır; sipariş belgesi kendi ek stilini zaten geçiriyor (C6). Sütun sayısı dört koşullu sütunla birlikte fiyatlı nüshada yediye çıkabilir, yüzdeler sütun sayısına göre kurulmalı.
- **İki ad tuzağı (C3, C4).** `hammaddeler` eski maliyet kırılımının alanı ve hâlâ yedi parçada veri taşıyor; `tip` ise parça tipi tanımlarına bağlı.
- **Malzeme kalemli parçada her iki ölçü de dolu olabilir.** Öncelik kesittedir (R8), yoksa üretilen parçanın belgesi elle yazılmış eski bir ölçüyü gösterebilir.
- **Excel'de boş hücre silmemeli (R37).** Katalog Excel'le toplu güncelleniyor; boş hücrenin kayıtlı değeri silmesi, eski şablonla yapılan bir içe aktarmada üç alanı birden süpürürdü. **Sıra uyarısı:** 0157 de iki sütun (maliyet para birimi ve kur) ekliyor; iki iş aynı sıraya girerse sütun sırası tek yerde kararlaştırılmalı.
- **Aynı belgede farklı sütun sayısı.** Grup bazında gizleme, bir tedarikçinin tablolarının farklı genişlikte görünmesine yol açar; bilinçli sonuçtur, tablo stili buna göre yazılmalı.
- **Kayıtlı kur ile günün kuru ayrı şeydir.** Genel toplam kayıtlı kurdan hesaplanır (C7); malzeme kartında kur güncellenirse belge yeniden basıldığında rakam değişir, bu beklenen davranıştır.

### QA turunda ölçülenler (2026-11-23)

| Ölçüm | HEAD'de görülen |
|---|---|
| **A** | `siparisRaporu.js:39-44` sütun sabiti donmuş ve tek yerde; `:51` `HIZA` dört elemanlı ve konuma bağlı. |
| **B** | `siparisRaporu.js:97` `GRUP_TABLO_STILI` bölüm başına tek `th:nth-child(n)` kuralı veriyor (fiyatsız üç, fiyatlı dört yüzde). |
| **C** | `raporSunumu.js:58` gövde `max-width:720px` ve `padding:0 16px`; `belgeAcilis`'te hiç `@media print` ya da `@page` kuralı yok. |
| **D** | Baskı yolu `electron/ipc/system.cjs`'te `printToPDF({ printBackground: true, pageSize: "A4", margins: 0 })`; iki çağrıda da yatay seçeneği yok, yani kullanılabilir genişlik yaklaşık 794 piksel. |
| **E** | `siparisRaporu.js:83-85` `siparisHucresi` ya hep ya hiç: boy satırı varsa yalnız boy satırları ve altında parça adedi yazılıyor. |
| **F** | `siparisIhtiyaci.js:740` `parcaOlculeri` ölçüleri malzeme ve ölçü anahtarına göre gruplar, `adet` kalem adetlerinin toplamıdır; dizi `:235`'te kurulur ve satırlar aynı nesneleri paylaşır. |
| **G** | `siparisRaporu.js:74` `olcuHucresi` ölçüsü eksik kalemi süzer; pencerenin `OlcuHucresi`'i aynı süzgeci uygular. |
| **H** | Hazır parça satırının ölçü dizisi boş doğuyor, yani Ölçü hücresi bugün boş basılıyor ama başlık yine çiziliyor. |
| **I** | `parts` tablosu yirmi üç sütun ve üç alanın hiçbiri yok; `kalip_defs` dokuz sütun, ölçü yok; `part_sales.olcu` ile üretim satırının `kalipOlcusu` serbest metin ölçü emsali. |
| **J** | `parts` okuması `SELECT *` artı yayma; `maliyet`, `fiyatKipi`, `karKati`, `tedarikciId` ve dört JSON alanı ayıklanıp koşullu yazılıyor, `adEN`, `kod`, `tanim`, `tanimEN` her zaman boş dizeyle yazılıyor. |
| **K** | `tedarikciler[].hammadde` tekil boolean bayrak ve sekiz yerde okunuyor (`siparisIhtiyaci.js:138`, `urunAgaci.js:242`, `PartManager.jsx:282`, `MalzemeManager.jsx:132`, `Tedarikciler.jsx:103`, `db.cjs:1068`); `cins` kaynakta hiç geçmiyor; `olcu` parçada boş. |
| **L** | `parcaAktarma.js:16-21` başlık dizisi on bir sütun; metin alanları `cell(n) || (mevcut?.x ?? "")` kalıbıyla her zaman yazılıyor. |
| **M** | `PartManager.hazirlaTemel` tanımadığı anahtarları olduğu gibi geçiriyor; `tedarikciId` ve `fiyatKipi` her çağrıda silinip yalnız doluyken yazılıyor. |
| **N** | `GlobalSearch.jsx:121` parça kategorisi ad, İngilizce ad ve kodu arıyor; `:179` satırı hiç `ekstra` taşımıyor; neden kalıbı `:64` ve `:69`'da (`utils.js:179` `nedenAlani`). |
| **O** | `siparisIhtiyaci.js:609` `islemToplamK` hiç tutar çözülmezse boş döner; `:733` `toplamTLK` aynı kuralla kısmi toplam döndürür; `:734` `dovizVar`. |
| **P** | `siparisRaporu.js:125` bölüm toplamı yalnız fiyatlı nüshada ve parça satırı varken basılıyor; işlemler toplamı `:109` işlem tablosunun içinde. |
| **Q** | Genel toplam örneğinin aritmetiği tutuyor: 70.000,00 artı 90.617,94 eşittir 160.617,94 lira. |
| **R** | Bu alana dokunan on kıyas altını var; `0141-once.json` hem belge HTML'ini (`rapor`) hem dört motor çıktısını tutuyor; 0139, 0141 ve 0143 fikstürlerinde kalem adedi iki ve üç var; `0142-veri.js` ile `0144-veri.js` kalem adedini bir tutuyor ve işlem kalemi taşımıyor. |
| **S** | `0147-ayikla.js` tabloları ilk başlığın "Parça" olmasıyla buluyor ve ölçüyü ikinci hücreden okuyor. |
| **T** | `SiparisPenceresi.jsx:86` hazır tablosu yedi sütun; `:90-92` adın altında üç küçük satır (düzenlendi, belge yeri, kesit nedenleri) zaten var. |
| **U** | `BELGE_SUTUNLARI.islem` pencerede de okunuyor (`SiparisPenceresi.jsx:108`), yani işlem tablosunun sütunları iki yerde tek kaynaktan geliyor. |

### QA turunda verilen kararlar (2026-11-23)

- **B1 · Bloklayıcı · Belgenin sütun sırası.** Sıra `Parça · Kod · Ölçü · Hammadde · Cins · Sipariş adedi`, fiyatlı nüshada sonda `Tutar` (R7/2). — *neden:* sıra tek donmuş sabitte, hizalar ve genişlikler konuma bağlı, kıyas ayıklaması hücreleri konumdan okuyor (Ölçüm A, B, S); kod adın yanında durur, sayısal sütunlar sağ kenarda kalır ve iki serbest metin sütunu yan yana olduğu için ikisi birden boşken tablo temiz çöker.
- **B2 · Bloklayıcı · Baskı genişliği.** Gövde en çok 780 piksel; kalan yer hücre yazı boyu, dolgu ve satır kırmadan gelir, yatay baskı kapsam dışıdır (R12/2, X16). — *neden:* Ölçüm C ve D ile kullanılabilir genişlik yaklaşık 794 piksel ve bugünkü gövde dolgusuyla 752 piksel; Chromium küçültmez, keser, yani kırpılan sütun sessiz veri kaybıdır.
- **B3 · Bloklayıcı · Karışık satırda kesilecek adet.** Hücre ölçü başına satır yazar ve Ölçü hücresinin süzülmüş listesini gezer; kesilecek adet ölçü nesnelerine yazılmaz (R19/2, R19/3, R20/2). — *neden:* satır malzeme başına bölünüyor, kalem başına değil (Ölçüm F), bugünkü hücre ya hep ya hiç çalışıyor (Ölçüm E) ve ölçü nesneleri pencere ile belge arasında paylaşılıyor.
- **B4 · Bloklayıcı · C9 ile R10 çelişkisi.** C9 daraltıldı: belgede tek bilinçli fark bütün satırlarında boş kalan Ölçü sütununun çizilmemesidir (C9/2, AC-53). — *neden:* Ölçüm H hazır parça tablosunun bugün boş Ölçü başlığı bastığını gösteriyor, yani R10 dokunulmamış veride de belgeyi değiştirir ve AC-53 yazıldığı gibi hiç geçmez.
- **Ö1 · Önemli · Pencerede ölçü kaynağı.** Birleşme motorda tek alanda yapılır, serbest metin ölçü dizisine girmez, pencere ile belge aynı alanı basar (R8/2, R15/2). — *neden:* iki ekran 0142 C4 ve 0147 R7'den beri tek metni basıyor; biri düşüp öteki düşmezse aynı parça kâğıtta ölçülü, ekranda boş görünür ve dizi gruplamayı besliyor (Ölçüm F).
- **Ö2 · Önemli · Grup tablosunun genişliği ve hizası.** Genişlik ve hiza sütun kümesinden türetilir, tablo başına uygulanır; kümesi aynı tablolar aynı genişlikte kalır (R13/2). — *neden:* Ölçüm A ve B'de yüzdeler bölüm başına tek `nth-child` kuralıyla veriliyor, küme tablodan tabloya değişince yanlış sütuna oturur; 0147'nin eşit genişlik kararı yalnız küme eşitken anlamlıydı.
- **Ö3 · Önemli · Alan adları.** Adlar `olcu`, `hammaddeAdi` ve `cins` (C3/2). — *neden:* Ölçüm K'da `hammadde` adı tedarikçinin boolean bayrağı olarak sekiz yerde okunuyor, yani C3'ün tuzak listesi eksikti; `cins` kaynakta hiç geçmiyor.
- **Ö4 · Önemli · Excel'de boş hücre.** Boş hücre kayıtlı değere düşer, ikisi de boşsa anahtar hiç yazılmaz (R37/2). — *neden:* Ölçüm L'deki kalıp alanı her zaman boş dizeyle yazıyor, bu da C2'nin boş değer yasağıyla ve AC-53 ile çelişirdi.
- **Ö5 · Önemli · Kayıt yolunda tek yazıcı.** Alanlar her çağrıda silinir, kırpılır ve yalnız doluyken yazılır (R2/2). — *neden:* Ölçüm M'de tanınmayan anahtar olduğu gibi geçiyor, yani boş dize gövdeye girer ve boşaltılan alan düzenlemede eski kayıttan geri gelir (0095 ve 0114 dersi).
- **Ö6 · Önemli · Veritabanı okuma yolu.** Üç alan okumada ayıklanır ve koşullu yazılır (C2/2). — *neden:* Ölçüm J'ye göre ayıklanmayan sütun her parçanın gövdesine boş değer koyar ve her kayıtta sahte değişiklik üretir.
- **Ö7 · Önemli · Altın stratejisi.** Motor çıktısı tutan altınlar ayıklanır, belge HTML'i tutanlar eski kodla bir kez yenilenir (C9/3). — *neden:* Ölçüm R'de on altın bu alana dokunuyor ve 0139, 0141, 0143 fikstürlerinde kalem adedi iki ile üç olduğu için kesilecek adet hücreleri gerçekten değişiyor; ayıklama sayısal alanları korur, yenileme her satırı yeniden onaylamak demektir.
- **Ö8 · Önemli · Kısmi genel toplam.** Kısmen hesaplanan bölümde genel toplam basılır ve yanında tutarsız satır sayacı durur (R30/2). — *neden:* Ölçüm O'ya göre lira toplamı yalnız hiçbir satır çözülmezse boş döner, yoksa kısmi toplamdır; bastırmak işlemler toplamını da gizler, sayaç ise bu işin bugünkü dili.
- **Ö9 · Önemli · Genel toplamın yeri.** Genel toplam bölümün sonunda kendi satırıdır ve işlemler toplamı hesaplanmışsa yazılır (R26/2). — *neden:* Ölçüm P'de parça satırı olmayan bölümde bölüm toplamı hiç basılmıyor, yani "iki satırın altında" tarifi orada karşılıksız kalıyor; tek koşul AC-43 ile AC-44'ü birlikte verir.
- **Ö10 · Önemli · Aramanın neden satırı.** Başlık kümesi ad, İngilizce ad ve kod; neden alanları sırayla ölçü, hammadde ve cins, her biri kendi etiketiyle (R6/2). — *neden:* Ölçüm N'de kategori hiç neden satırı basmıyor, 0149 R2/3 başlık kümesini "bugün nedensiz geçen alanlar" diye tanımlıyor; küme yazılmazsa her sonuçta gereksiz neden çıkar.
- **Ö11 · Önemli · Sütun başlığı.** Başlık "Sipariş adedi" kalır (R16/2). — *neden:* 140 gerçekten o firmaya sipariş edilen adettir ve Ölçüm U'da iki tablonun başlığı tek kaynaktan geliyor; başlığı değiştirmek 0150 R2/2'nin eşitlik kararını ters çevirir ve işlem tablosunu da sürükler.
- **Ö12 · Önemli · Excel sütun sırası.** Son beş sütunun sırası şimdi sabitlenir ve her iş yalnız kendi konumlarına yazar (R35/2). — *neden:* 0157 de şablonun sonuna iki sütun ekliyor ve içe aktarma konuma göre eşliyor (Ölçüm L); sıra peşin sabitlenmezse iki iş birbirini bekler ya da eski şablonlar kayar.
- **K1 · Küçük · Liste satırının biçimi.** Dolu alanlar ölçü, hammadde ve cins sırasıyla, etiketsiz ve kendi kimliğiyle (R5/2). — *neden:* Ölçüm T'de aynı hücrede üç küçük satır zaten var; sıra yazılmazsa her turda değişir.
- **K2 · Küçük · Taramanın kapsamı.** Yasak listesi maliyet ve fiyat yoludur, motorda tek izinli okuyucu belge satırı kurucusudur (R3/2). — *neden:* sütunları motor kurduğu için adların kaynakta hiç geçmemesi istenemez; tarama ancak izinli okuyucu adlandırılınca yazılabilir.
- **K3 · Küçük · Kıyas fikstürü.** Fikstür dokunulmamış profildedir (C9/4). — *neden:* Ölçüm R'ye göre 0142 ve 0144 verileri bu profildeyken 0150 verisi işlem kalemi taşıyor, yani C9 ancak doğru profille ölçülebilir.
- **K4 · Küçük · İki Context düzeltmesi.** Serbest metin ölçünün emsali yazıldı ve `parcaOlculeri` atfı netleştirildi. — *neden:* Ölçüm I'da `part_sales.olcu` ile üretim satırının `kalipOlcusu` birer emsal, Ölçüm F'de fonksiyonun tanımı `:740`; doküman ile kod çeliştiğinde kod doğrulanır.
- **K5 · Küçük · Metinler ve değer uzunluğu.** Üç yeni metin tek yerdedir, değerler kırpılır ve uzunluk sınırı konmaz (C11/2). — *neden:* `kod` da sınırsız; sınır koymak serbest metnin amacını daraltır, hücre satır kırdığı için tablo da bozulmaz.

### QA turu karar kaydı

| Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|
| B1 | Bloklayıcı | Belgenin sütun sırası sabitlendi | R7/2, AC-57 |
| B2 | Bloklayıcı | Gövde en çok 780 piksel, yatay baskı kapsam dışı | R12/2, X16, AC-58, AC-59 |
| B3 | Bloklayıcı | Hücre ölçü başına satır yazar, nesneler paylaşılmaz | R19/2, R19/3, R20/2, AC-60, AC-61, AC-62 |
| B4 | Bloklayıcı | C9 daraltıldı, boş Ölçü sütunu bilinçli fark | C9/2, AC-53, AC-63 |
| Ö1 | Önemli | Ölçünün iki kaynağı motorda tek alanda birleşir | R8/2, R15/2, AC-64, AC-65 |
| Ö2 | Önemli | Genişlik ve hiza sütun kümesinden türetilir | R13/2, AC-66, AC-67 |
| Ö3 | Önemli | Alan adları `olcu`, `hammaddeAdi`, `cins` | C3/2, AC-68 |
| Ö4 | Önemli | Boş hücre kayıtlı değere düşer, anahtar yazılmaz | R37/2, AC-69 |
| Ö5 | Önemli | Tek yazıcı: sil, kırp, yalnız doluyken yaz | R2/2, AC-70 |
| Ö6 | Önemli | Okumada ayıklama ve koşullu yazım | C2/2, AC-71 |
| Ö7 | Önemli | Altınlar iki kümeye ayrıldı | C9/3, AC-72 |
| Ö8 | Önemli | Kısmi toplamda genel toplam sayaçla basılır | R30/2, AC-73 |
| Ö9 | Önemli | Genel toplam bölümün sonunda kendi satırı | R26/2, AC-74 |
| Ö10 | Önemli | Neden satırının başlık kümesi ve etiketleri | R6/2, AC-75 |
| Ö11 | Önemli | Sütun başlığı "Sipariş adedi" kalır | R16/2, AC-76 |
| Ö12 | Önemli | Excel'in son beş sütununun sırası sabitlendi | R35/2, AC-77 |
| K1 | Küçük | Liste satırının biçimi ve kimliği | R5/2, AC-78 |
| K2 | Küçük | Taramanın yasak listesi ve izinli okuyucusu | R3/2, AC-79 |
| K3 | Küçük | Kıyas fikstürü dokunulmamış profilde | C9/4, AC-80 |
| K4 | Küçük | İki Context düzeltmesi | Context (parça bilgileri, bilinen tuzaklar) |
| K5 | Küçük | Metinler tek yerde, değer kırpılır | C11/2, AC-81 |

### Plan turunda verilen kararlar (2026-11-23)

Takım Yöneticisi planın on altı önerisini onayladı ("tüm önerilerini onaylıyorum"):

| No | Konu | Karar |
|---|---|---|
| P1 | 780 pikselin kapsamı | Gövde kenar dolgusuyla birlikte 780 piksel: ek stilde `max-width:748px` (dolgu 2 × 16). — *neden:* 780 + 32 = 812 piksel A4'ün 794 pikselini aşar ve keser. |
| P2 | Kesim satırlarının bölünmesi | Hücre ölçü başına yalnız en az bir satır kesim ya da boy satırıyken bölünür; hepsi çıplak parça adediyse tek rakam (R19/2). — *neden:* aynı hammaddede iki ölçülü, kalem adedi bir parçada harfiyen bölme "70 / 70" yazar ve dokunulmamış belgeyi değiştirir (C9/2). |
| P3 | Aynı kesit ve çubukta iki boy | Boy satırı kesidin ilk ölçüsüne yazılır, sonraki ölçünün satırı hizayı korumak için boş kalır. — *neden:* boy adedi iki ölçünün toplamıdır, ikinci kez yazılırsa çift okunur. |
| P4 | Açıklama satırının metni (R17) | Tek bir kesim adedi varsa "70 parça × 2"; farklı kalem adetleri ya da boy satırı varsa "70 parça" (ölçü hücresi "parça başına n" ekini taşır). — *neden:* hücre kısa kalır, bugünkü "N parça" metninin kardeşidir. |
| P5 | Kesim satırının koşulu | Ölçünün kalem adedi birden büyük, kesit satırı var ve kapalı değilse; kesit kapalı, malzeme çözülemiyor ya da kesit satırı yoksa parça adedi. Tedarikçisiz kesit kesim yazar. — *neden:* R22, AC-31, AC-32; boy kuralıyla aynı. |
| P6 | Kısmi genel toplamın sayacı | Bölümün tutarsız sayacı ile işlemlerin tutarsız sayacının toplamı (R30/2). — *neden:* genel toplam iki kaynağı da kapsar. |
| P7 | Parça tutarı kaynağı olmayan bölüm | Toplam satırı ve hazır parça yoksa genel toplam işlemler toplamıdır; kaynak var ama lira karşılığı hiç çıkmadıysa yazılmaz. — *neden:* AC-44 ile AC-46 birlikte. |
| P8 | Genişleme ve küçük punto | Yalnız altı ve üstü sütunlu tabloya; gövde yalnız böyle bir tablo varken genişler. Kural `!important` (hücreler satır içi stil taşıyor) ve `overflow-wrap:anywhere`. — *neden:* her zaman uygulanırsa dokunulmamış belge değişir (C9/2); sığma Electron'da ölçülür. |
| P9 | Tablo başına genişlik | Her grup tablosu sütun kümesinin adını taşıyan bir sarmalayıcıda; ek stil kullanılan her küme için sütun adı ağırlıklarından yüzde üretir. — *neden:* `detayTablo` sınıf almıyor, C6 o modüle dokunmayı yasaklıyor. |
| P10 | HTML altınları | Yenilenmez; `0158-ayikla.js` yeni HTML'i eski biçime çevirir (gizlenen boş Ölçü sütununu boş hücreyle geri koyar, sarmalayıcıyı ve stili düşürür) ve eski altınla birebir kıyaslanır (C9/3). — *neden:* AC-63'ün "tek fark" iddiasını mekanik kanıtlar; yeniden üretilen altın hiçbir şey kanıtlamaz. |
| P11 | Yeni motor anahtarları | Satırın bilgi alanları ve kesim alanları yalnız doluyken; ölçü gösterimi, `sutunlar` ve `genelToplamK` her zaman; motor altınlarında `0158-ayikla.js` düşürür. — *neden:* C9/3'ün motor kümesi. |
| P12 | Tek okuyucu (R3/2) | Motorda tek `parcaBilgisi(p)`; parça birikimi kurulurken bir kez çağrılır, belge ve pencere satırı sonucu kopyalar. — *neden:* pencere satırı belge satırından ayrı kuruluyor. |
| P13 | Taramanın `olcu` deseni | `hammaddeAdi` ve `cins` bütün yasak dosyalarda; `\.olcu\b` yalnız parça maliyet ve fiyat dosyalarında. — *neden:* Extra Kalıp'ın `olcu`'su stok dosyalarında yanlış alarm verir. |
| P14 | Excel 12. ve 13. sütun | Başlıklar "Maliyet Para Birimi" ve "Maliyet Kuru"; dışa aktarmada boş, içe aktarmada okunmaz; 0157 bu adları kullanır. — *neden:* konum eşlemesi başlıkların şimdiden sabitlenmesini ister (R35/2). |
| P15 | Pencerenin ibaresi (R25) | Yalnız belgede kesim satırı varken (motorda `kesimVar`). — *neden:* dokunulmamış veride pencere birebir kalır. |
| P17 | Pencerede adın altı (uygulamada bulundu) | Adın altına yalnız hammadde ve cins; ölçü Ölçü sütununda motorun tek alanından (R15/2'nin harfiyen okunuşundan sapma). — *neden:* malzeme kalemli parçada elle girilmiş eski ölçü adın altında görünüp R8'in kesiti öne alma kararını boşa çıkarıyordu; hazır parçada da ölçü iki kez yazıyordu. Takım Yöneticisinin onayına sunuldu. |
| P18 | Ölçü başına alt satır (triyajda bulundu, bulgu 1) | Sipariş adedi hücresi ölçü başına satır yazan parça (birden çok ölçü) belgede ölçü başına bir tablo satırına bölünür: Ölçü ve Sipariş adedi satır satır, öteki hücreler `rowspan` ile tek, açıklama son satırın sipariş hücresinde, iç satırda alt çizgi yok. R19/2'nin `<br>` ile alt alta yazımından sapma. — *neden:* dar Ölçü sütununda kırılan uzun ölçü metni (Ø114,3 boru) sağdaki rakamı bir alt ölçünün karşısına kaydırıyordu; `vertical-align:top` hizayı garanti etmiyor, satır bölmek ediyor. Electron yerleşim testi her ölçünün ilk metin satırının üst kenarını aynı satırdaki adedinkiyle karşılaştırır. |
| P16 | Neden satırının etiketleri | "ölçü", "hammadde", "cins"; başlık kümesi ad, İngilizce ad, kod. — *neden:* R6/2. |

---

## Acceptance Criteria

### Parçanın bilgi alanları

- **AC-1.** Parça kartında kodun ardından ölçü, hammadde ve cins alanları çizilir.
- **AC-2.** Üçü de boş bırakılarak kayıt yapılabilir ve kayıt gövdesinde bu anahtarlar bulunmaz.
- **AC-3.** Dolu girilen üç alan kaydedilir ve kart yeniden açıldığında aynen görünür.
- **AC-4.** Cins alanı parça tipi seçicisinden ayrı bir alandır ve etiketleri karışmaz.
- **AC-5.** Parça listesinde dolu alanlar adın altında görünür.
- **AC-6.** Üçü de boş parçada liste satırı bugünkü hâliyle aynıdır.
- **AC-7.** Genel aramada ölçüyle arandığında parça bulunur.
- **AC-8.** Genel aramada hammadde ve cins ile arandığında parça bulunur.
- **AC-9.** Adında geçmeyen bir kelime bu alanlarda geçtiğinde sonuç satırı nedenini yazar.
- **AC-10.** Alanlar maliyet, fiyat, sipariş adedi ve stok hesabına girmez (kaynak taraması ve çapraz ölçüm).

### Belgenin sütunları

- **AC-11.** Kodu girilmiş parçanın belgedeki kod hücresi dolu gelir.
- **AC-12.** Malzeme kalemi olmayan ve ölçüsü girilmiş parçanın Ölçü hücresi parçanın kendi ölçüsünü yazar.
- **AC-13.** Malzeme kalemi olan parçanın Ölçü hücresi bugünkü kesit metnini yazar, parçanın kendi ölçüsü dolu olsa da.
- **AC-14.** Hammaddesi girilmiş parçanın hammadde hücresi dolu gelir.
- **AC-15.** Cinsi girilmiş parçanın cins hücresi dolu gelir.
- **AC-16.** Bir grup tablosunda hiçbir parçanın ölçüsü yoksa o tabloda Ölçü sütunu çizilmez.
- **AC-17.** Bir grup tablosunda hiçbir parçanın kodu yoksa kod sütunu çizilmez; hammadde ve cins için de aynısı geçerlidir.
- **AC-18.** Aynı belgenin başka bir grup tablosunda dolu varsa o sütun orada çizilir.
- **AC-19.** Dört alanı da boş olan parçanın satırı belgede yine yazılır ve sipariş adedi görünür.
- **AC-20.** Sütun gizlendiğinde tablonun hizası bozulmaz ve kalan sütunlar tabloyu doldurur.
- **AC-21.** Dört sütun birden dolu olduğunda sipariş belgesinin gövdesi genişler ve satırlar okunur kalır.
- **AC-22.** Aylık Faaliyet Raporu ile Aylık Gider ve Kasa Raporu'nun gövde genişliği ve çıktısı değişmez (altın karşılaştırma).
- **AC-23.** İşlem (alım) tablosunda yeni sütunlar çizilmez.
- **AC-24.** Sipariş penceresinin ekranında dolu alanlar parçanın satırında görünür.

### Kesilecek adet

- **AC-25.** Malzeme kaleminin adedi 2 olan ve 70 adet sipariş edilen parçanın belge hücresi 140 yazar.
- **AC-26.** Aynı satırın altında parça adedi ile kalem adedini birlikte yazan açıklama satırı çizilir.
- **AC-27.** Kalem adedi 1 olan satırın hücresi parça adedini yazar ve açıklama satırı çizilmez.
- **AC-28.** Aynı hammaddede iki ayrı ölçüsü olan parçanın her ölçüsü kendi kesilecek adediyle ve ölçü satırlarıyla hizalı yazılır.
- **AC-29.** Boydan sipariş edilen satırın hücresi ve alt satırı bugünkü biçimini korur.
- **AC-30.** Ölçüsü olmayan hazır parça satırının hücresi parça adedini yazar.
- **AC-31.** Kesidi "sipariş etme" işaretli parçanın hücresi parça adedini yazar.
- **AC-32.** Malzemesi çözülemeyen satırın hücresi parça adedini yazar.
- **AC-33.** Ölçü hücresindeki "parça başına 2" eki yerinde kalır.
- **AC-34.** Adı "TAKIM" geçmeyen ama kalem adedi 3 olan parçanın hücresi de çarpılmış adedi yazar.
- **AC-35.** Sipariş penceresinin ekranı parça adedini göstermeye devam eder.
- **AC-36.** Ekrandaki elle düzenleme parça adedini alır ve düzenlenen değer belgeye çarpılarak yansır (35 takım girilince belge 70 yazar).
- **AC-37.** Ekranda kesilecek adedin belgede yazıldığını söyleyen ibare görünür.
- **AC-38.** Malzemenin sipariş kilogramı, asgari sipariş uyarısı ve bölüm toplamı bu spec'ten önceki değerleriyle birebir aynıdır.

### Genel toplam

- **AC-39.** Dolar malzemesi ve lira işlemi olan bölümün altında genel toplam satırı yazılır ve rakam ikisinin lira toplamıdır.
- **AC-40.** Var olan işlemler toplamı satırı aynen yazılmaya devam eder.
- **AC-41.** Var olan bölüm toplamı satırı kendi para biriminde ve kayıtlı kurla lira karşılığıyla aynen yazılır.
- **AC-42.** Bölüm toplamının kapsam cümlesi değişmez.
- **AC-43.** İşlem kalemi olmayan bölümde genel toplam satırı yazılmaz.
- **AC-44.** Yalnız işlem kalemi olan bölümde genel toplam işlemler toplamına eşittir ve yazılır.
- **AC-45.** Bölümde dolar ve euro birlikte varsa genel toplam ikisinin lira karşılıklarının toplamıdır.
- **AC-46.** Bölümün lira karşılığı hesaplanamıyorsa genel toplam yazılmaz.
- **AC-47.** Genel toplam kayıtlı kurdan hesaplanır; günün kuru okunmaz (kaynak taraması).

### Excel ve ortak

- **AC-48.** Excel dışa aktarmasında üç sütun şablonun sonunda yer alır ve dolu değerler yazılır.
- **AC-49.** Excel içe aktarmasında dolu hücreler kayda yazılır.
- **AC-50.** Excel içe aktarmasında boş hücre kayıtlı değeri silmez.
- **AC-51.** Eski on bir sütunlu şablon aynen içe aktarılır ve üç alan etkilenmez.
- **AC-52.** Fiyatsız nüshada hiçbir tutar ve toplam satırı yazılmaz; sütun kuralları orada da aynı işler.
- **AC-53.** Dokunulmamış veride (üç alan boş, kalem adedi bir, işlem kalemi yok) motor çıktısı, pencere, liste ve Excel çıktısı spec öncesi altınla birebir aynıdır (`tests/fixtures/0158-once.json`); belgenin tek farkı C9/2'de yazılı boş Ölçü sütunudur.
- **AC-54.** Kararlar ve çarpımlar motordan gelir; belge kurucusunda toplama ve satır tarama yoktur (kaynak taraması).
- **AC-55.** Yeni alanlar dört nokta kuralıyla eklendi, boş değer gövdeye yazılmıyor ve tam tur testinde geçiyor.
- **AC-56.** Yeni veri bölümü, yeni izin kimliği ve yeni sunucu kuralı eklenmedi (kaynak taraması).

### QA turu kriterleri (2026-11-23)

- **AC-57.** Belgenin parça tablosunda sütunlar Parça, Kod, Ölçü, Hammadde, Cins ve Sipariş adedi sırasıyla çizilir; fiyatlı nüshada Tutar sonda durur.
- **AC-58.** Sipariş belgesinin gövde genişliği en çok 780 pikseldir ve A4 dikey PDF çıktısında hiçbir sütun kırpılmaz. Ölçülen yol PDF kaydetmedir (kenarsız, `printToPDF`, üretimle aynı kenarlar); kırpılma bu yolun ekran yerleşiminden (794 px) ölçülür, PDF'in kendisi yalnız üretildiği için denetlenir. Önizlemedeki Yazdır düğmesi (`window.print()`, sistemin varsayılan kenarları) ölçülmedi (triyaj bulgu 5).
- **AC-59.** Yedi sütunlu fiyatlı nüshada grup tablosunun hücre yazı boyu ile dolgusu bir kademe küçülür ve iki serbest metin sütunu satır kırar.
- **AC-60.** Hem boydan işaretli hem kilo yolundan ölçüsü olan satırın hücresi her ölçü için kendi satırını yazar; boydan ölçünün satırı bugünkü biçimini korur.
- **AC-61.** Sipariş adedi hücresinin satırları Ölçü hücresinin bastığı süzülmüş listeyle aynı sıradadır; ölçüsü eksik kalem iki hücrede de satır doğurmaz.
- **AC-62.** Kesilecek adet ölçü nesnelerine yazılmaz; pencerenin satırı ve aynı parçanın başka bölümdeki satırı bundan etkilenmez.
- **AC-63.** Dokunulmamış ve kodsuz veride belgenin tek farkı, bütün satırlarında boş kalan Ölçü sütununun o grup tablosunda çizilmemesidir; kodu girilmiş katalogda Kod sütunu da çıkar ve o sütun düşülünce belge yine altınla birebir (triyaj bulgu 4).
- **AC-64.** Pencerenin Ölçü hücresi ile belgenin Ölçü hücresi aynı motor alanını basar.
- **AC-65.** Serbest metin ölçü, motorun `olculer` dizisine yazılmaz; ölçüsü girilmiş hazır parça hammadde grubuna düşmez.
- **AC-66.** Sütun kümesi farklı iki grup tablosu kendi genişliğinde çizilir; kümesi aynı olan tablolar aynı genişlikte kalır.
- **AC-67.** Hizalar sütun kümesinden türetilir; gizlenen sütun kalan sütunların hizasını kaydırmaz.
- **AC-68.** Alan adları `olcu`, `hammaddeAdi` ve `cins`; kaynak taraması bunların tedarikçinin `hammadde` bayrağından ve parçanın `hammaddeler` dizisinden ayrı kaldığını gösterir.
- **AC-69.** Excel içe aktarmasında boş hücre kayıtlı değere düşer; kayıtlı değer de boşsa kayıt gövdesinde o anahtar bulunmaz.
- **AC-70.** Üç alan her kayıtta silinir, kırpılır ve yalnız doluyken yazılır; düzenlemede boşaltılan alan geri gelmez.
- **AC-71.** Veritabanı okuması üç alanı ayıklar; boş alan hiçbir parçanın gövdesine girmez (tam tur testi).
- **AC-72.** Motor çıktısı tutan eski altınlar yalnız bu spec'in yeni anahtarları düşürülerek kıyaslanır; belge HTML'i tutan altınlar bir kez yenilenir ve farkın kaynağı gösterilir.
- **AC-73.** Lira karşılığı kısmen hesaplanan bölümde genel toplam basılır ve yanında tutarsız satır sayacı yazar.
- **AC-74.** Parça satırı olmayan, yalnız işlem kalemi olan bölümde genel toplam bölümün sonunda kendi satırı olarak yazılır.
- **AC-75.** Aramada neden satırı yalnız ad, İngilizce ad ve kodda geçmeyen kelime için yazılır ve eşleşen alanın etiketini taşır.
- **AC-76.** Parça tablosunun sütun başlığı "Sipariş adedi" kalır ve işlem tablosunun başlığıyla aynı metindir.
- **AC-77.** Excel şablonunun son beş sütunu kararlaştırılan sıradadır; eksik olan işin konumları başlığıyla ayrılmış durur.
- **AC-78.** Liste satırında dolu alanlar ölçü, hammadde ve cins sırasıyla, etiketsiz ve kendi kimliğiyle görünür.
- **AC-79.** Üç alan maliyet ve fiyat yolunda hiç okunmaz; sipariş motorunda tek izinli okuyucu belge satırı kurucusudur (kaynak taraması).
- **AC-80.** Kıyas fikstürü dokunulmamış profildedir: kalem adedi bir, üç alan boş, işlem kalemi yok.
- **AC-81.** Bu işin üç yeni metni motorun sabitleri arasında tek yerde tanımlıdır; alan değerleri kırpılır ve uzunluk sınırı yoktur.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kararlar ve çarpımlar saf motorda; belge yalnız basıyor (C1, AC-54).
- [ ] Yeni kalıcı alanlar için **dört nokta kuralı** uygulandı ve `db-roundtrip` testine eklendi.
- [ ] Yeni veri bölümü yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; iş salt okunur ve parça kartının bugünkü izniyle çalıştığı açıkça yazıldı.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; belge Türkçe.
- [ ] Görsel kanıt eklendi (`docs/evidence/0158-*`): parça kartı, liste satırı, sipariş penceresi, ölçüsüz ve ölçülü grup tabloları, iki nüsha belge, genel toplamlı bölüm.
- [ ] Etkilenen kıyas altınları **bir kez** yenilendi ve farkın yalnız bu spec'in kurallarından geldiği gösterildi.
- [ ] Baskı yerleşimi genişlemiş gövdeyle denendi; sipariş belgesi dışındaki raporların çıktısı değişmedi (C6, AC-22).
- [ ] Baskı A4 dikey PDF yolunda denendi ve hiçbir sütun kırpılmadı (R12/2, AC-58).
- [ ] Belgenin sütun sırası, grup tablolarının genişlikleri ve hizaları sütun kümesinden türetildi (R7/2, R13/2).
- [ ] Kıyas altınları iki kümeye ayrıldı: motor çıktısı ayıklandı, belge HTML'i bir kez yenilendi (C9/3, AC-72).
- [ ] Yeni alan adları kaynak taramasıyla tedarikçinin `hammadde` bayrağından ve parçanın `hammaddeler` dizisinden ayrıldı (C3/2, AC-68).
- [ ] Excel sütun sırası 0157 ile birlikte tek yerde kararlaştırıldı (R35/2).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
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
