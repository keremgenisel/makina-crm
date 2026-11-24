# 0160 — Yedek parça kodu, ölçüsü ve cinsiyle bulunur

| | |
|---|---|
| **Durum** | Onaylandı (2026-11-24, plan turu) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Revizyon** | 3 (2026-11-24 plan turu: P1–P12) |
| **QA turu** | 2026-11-24: 26 bulgu (4 Bloklayıcı / 12 Önemli / 10 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 5 (X1'in açılır liste gerekçesi, X5'in "bütün değerleri yazıyor" gerekçesi, R5'in tek boş metni, DoD'nin 0154 ayıklaması, üç satır atfı) |
| **Etkilenen alanlar** | Yedek parça aranan on kutu (Ayarlar › Katalog, Stok › Parça Stoğu, Stok'un parça seçicisi, servis formu, yedek parça satış formu, Evrak'ın seçim penceresi, parça kartının bileşen seçicisi, model kartının kit seçicisi, Analiz'in parça seçicisi), ortak arama bileşenleri (`ui.jsx` `SearchPick` ve `SearchSelect`, `documents/KalemSecPenceresi.jsx`), parça bilgi yardımcıları (`lib/parcaBilgi.js`), genel arama (`GlobalSearch.jsx`, aynı yardımcıyı çağırır), analiz motorunun parça satırı (`lib/analiz.js`), görsel kanıt zinciri (`scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`) |
| **Bağımlı spec'ler** | 0158 (parçanın ölçü, hammadde, cins alanları), 0149 (çok kelimeli arama kuralı), 0126 (Evrak'ın seçim penceresi), 0122 (bileşen seçicisi ve SearchPick taraması), 0120 (servis formunun parça süzgeci), 0121 (set rozeti), 0154 ve 0121 (analiz çıktısının kıyas altınları), 0009 (kanıt eşlemesi ve tasarım sözlüğü), 0111 ve 0155 (kapsam dışı kalan iki kayıt listesi) |

---

## Intent

Fabrikada 435 canlı yedek parça var ve parça seçilen her yerde yalnız adıyla bulunuyor. Depodaki ya da teklif yazan kişi parçayı çoğu zaman adından değil elinde tuttuğu koddan, ölçüsünden ya da cinsinden tanıyor; bu bilgiler uygulamada kayıtlı tutulabiliyor ama hiçbir arama kutusu onları aramıyor ve hiçbir sonuç satırı göstermiyor. Bugün kullanıcı 435 adın içinde doğru olanı gözüyle arıyor, benzer adlı iki parçadan hangisini seçtiğini de ancak seçtikten sonra anlıyor. Bu iş bittiğinde parça aranan on yerin hepsinde kodu, ölçüsünü ya da cinsini yazarak parça bulunacak ve sonuç satırı bu bilgileri adın altında yazacak, yani kullanıcı doğru parçayı seçtiğini seçmeden önce görecek.

QA turunda iki ölçüm işin biçimini değiştirdi. Birincisi, Stok'un parça seçicisi klasik bir açılır liste değil, kendi arama kutusu olan ve süzmesini bugün de paylaşılan kuraldan geçiren bir bileşen; bu yüzden depodaki kişinin kendi ekranı kapsama girdi ve kutu sayısı ona çıktı. İkincisi, kod üç kutuda bugün üst satırda yazılıyor; kod alt satıra indiği için o üç etiket sadeleşti ve seçim onayı hiçbir özel kural yazılmadan yalnız adı yazar hâle geldi.

---

## Requirements

- **R1.** Yedek parça aranan her kutuda arama parçanın **adı, İngilizce adı, kodu, ölçüsü, hammadde adı ve cinsi** üzerinden yapılır. Alan kümesi genel aramanın (Ctrl+K) bugünkü kümesiyle aynıdır, yani uygulamada tek kural olur.
- **R1/2.** Kapsamdaki **on** kutu: (1) Ayarlar › Katalog › Yedek Parça listesinin arama kutusu, (2) Stok › Parça Stoğu listesinin arama kutusu, (3) servis formunun "Değişen Parçalar" kutusu, (4) yedek parça satış formunun tek satırlı parça kutusu, (5) aynı formun çok satırlı listesindeki parça kutusu, (6) Evrak'ın "Parça Kataloğundan Seç" penceresi, (7) parça kartının "Bileşen ara..." kutusu, (8) model kartının "Parça ekle..." kutusu, (9) Analiz'in parça seçicisi, (10) Stok › "Stoğa Parça Ekle" ve "Düzelt" penceresinin parça seçicisi (tek bileşenin iki kipi, `PartStokTab.jsx:276`; `SearchSelect` kendi arama kutusuyla ve bugün de paylaşılan kuralla süzüyor, bu yüzden X1'e girmez).
- **R1/3.** Kelime kuralı değişmez: sorgu boşluklardan bölünür, kelime sırası ve alan serbesttir, her kelimenin alanlardan **en az birinde** geçmesi aranır (0149'un kuralı). Yani "625 5x16" kodu ve ölçüsü ayrı alanlarda eşleşen parçayı bulur; kelimelerden biri hiçbir alanda yoksa parça bulunmaz.
- **R1/4.** Bugünkü arama daralmaz: adıyla bulunan hiçbir parça kaybolmaz ve Parça Stoğu'nun **model adıyla** araması aynen sürer.
- **R1/5.** Genel arama (Ctrl+K) alan listesini kendi içinde yazmayı bırakır ve aynı yardımcıyı çağırır; çıktısı ile neden satırının başlık kümesi (ad, İngilizce ad, kod) birebir aynı kalır. Tek liste, iki tarafın sonradan ayrışmasını imkânsız kılar.
- **R1/6.** Aranan değerler ile alt satır iki ayrı kümedir: arama altı alanı kapsar (ad, İngilizce ad, kod, ölçü, hammadde adı, cins), alt satır yalnız dördünü yazar (kod, ölçü, hammadde, cins). İngilizce adıyla ya da Parça Stoğu'nda model adıyla eşleşen satır bunu ekranda göstermez; bu bilinen sınırdır ve neden satırı eklenmez (X5).
- **R1/7.** Eşleştirici simgeleri normalleştirmez: `aramaNormalize` yalnız Türkçe harfleri katlar, yani `×` ile `x`, `Ø`, `*` ve `/` birbirine çevrilmez. Ölçüsü "M8 × 40" girilmiş parça "m8 x 40" sorgusuyla bulunmaz. Bu bilinen sınırdır (X9); ölçünün tek simgeyle girilmesi gerektiği veri girişi işine (X6) not edilir.
- **R2.** Arama sonucu satırı iki satırlıdır: üstte parçanın **adı** (Evrak'ın penceresinde set rozetinin metin ekiyle), altında küçük ve soluk olarak parçanın dolu bilgileri. Bugün kodu üst satırda yazan üç kutunun (4, 5, 6) etiketinden kod çıkarılır ve alt satırın ilk değeri olur: on kutu aynı biçimi yazar, aynı değer iki kere görünmez ve arama daralmaz (kod yine aranan değerler listesindedir).
- **R2/2.** Alt satırın sırası **kod, ölçü, hammadde, cins**'tir ve yalnız dolu alanlar yazılır, aralarına nokta ayracı girer. Boş alan için ayraç bırakılmaz; hiçbiri dolu değilse alt satır hiç çizilmez ve satır bugünkü tek satırlı görünümünde kalır.
- **R2/3.** Değerler kırpılmış yazılır (başındaki ve sonundaki boşluk görünmez), uzunluk sınırı konmaz.
- **R2/4.** Seçimden sonra çıkan "eklendi" onayı yalnız parçanın **adını** yazar, alt satırı yazmaz. Bu yapısaldır, ayrı bir kural yazılmaz: onay bileşenin etiketini yazıyor (`ui.jsx:175`) ve R2 ile etiket yalnız ada indi. Evrak'ın penceresinde onay zaten görünmez, pencere kapanıyor.
- **R2/5.** Uzun adlı parçada (canlı veride en uzun ad 139 karakter) alt satır adın altına iner ve sonuç paneli yatay kaymaz. Sarma kuralı arama panelleri içindir (satır bugün de sarıyor, panelde yatay kaydırma yok). Analiz'in seçicisi satırını bugünkü gibi **tek satıra kırpar**: ad ve alt satır kendi satırında kırpılır, adet sağda kalır; o kutu beş sütunluk panelin içinde ve sarma kutunun yüksekliğini oynatır.
- **R2/6.** Alt satırın biçimi tek yerde sabittir ve 0158'in bugünkü bilgi satırının ölçülerini kullanır: punto 11, renk `n500`, üst boşluk 2, değerler nokta ayracıyla. On kutu bu biçimi yazar.
- **R2/7.** Uygulamada üç ayrı bilgi satırı biçimi bilinçli olarak yan yana yaşar: katalog listesi ölçü, hammadde, cins yazar (kod kendi sütununda, 0158 R5), sipariş penceresi hammadde ve cins yazar (ölçü kendi sütununda), arama sonucu kod, ölçü, hammadde, cins yazar. Üçü birleştirilmez.
- **R3.** Liste ekranlarının düzeni korunur: katalog listesi bugünkü Kod sütununu ve ölçü, hammadde, cins satırını aynen taşır (0158 ile geldi, değişmez); Parça Stoğu listesinin "Yedek Parça" hücresine adın altına R2'nin alt satırı eklenir ve sütun sayısı değişmez.
- **R3/2.** R2'nin iki satırlı biçimi arama panelleri ve seçiciler içindir (3 ile 10 arası kutular). İki liste ekranından katalog listesi hiç değişmez (AC-28), Parça Stoğu'nun hücresi alt satırı R3 ile alır.
- **R4.** Analiz'in parça seçicisinde satır, analiz sonucundaki adı ve adedi korur; kodu, ölçüsü, hammaddesi ve cinsi parçanın katalog kaydından okunur.
- **R4/2.** Analiz'de kataloğu çözülemeyen satırda (kimliği olmayan, yalnız adla toplanmış parça ya da katalogda bulunamayan kimlik, örneğin çöpe atılmış parçanın hareketleri) alt satır çizilmez ve arama bugünkü gibi yalnız adla çalışır.
- **R4/3.** Analiz'in arama değerleri satırın kendi adı ile katalog kaydının altı alanının birleşimidir, yani adı sonradan değişmiş parça hem motorun taşıdığı eski adıyla hem kataloğun bugünkü adıyla bulunur.
- **R4/4.** Analiz'in satırında ad kendi öğesinde ve belgede ilk sırada durur, alt satır onun kardeşidir. Seçicinin **kapalı düğmesi** alt satır almaz ve bugünkü "ad (adet)" metnini aynen yazar: kapalı düğme bir arama sonucu satırı değil, seçili değerin özetidir.
- **R4/5.** Motorun parça satırına eklenen alanın adı `partId`'dir, değeri kayıttan geldiği gibi yazılır (dönüştürülmez) ve kimliği olmayan satırda `null` olur, yani anahtar her satırda vardır. Ekran karşılaştırmayı `String()` ile yapar.
- **R5.** Boş sonuç ve boş veri metinleri değişmez ve birleştirilmez; her kutu bugünkü metnini yazar: arama panellerinde "Bulunamadı.", Stok'un parça seçicisinde "Sonuç bulunamadı.", Analiz'in seçicisinde "Sonuç yok.". Liste ekranlarının boş durumu ve hiç parça tanımlı olmayan kurulumun metinleri de aynen kalır.
- **R6.** Seçilen parçanın kayda yazılması değişmez: kayıt bugünkü alanlarını (kimlik, ad, İngilizce ad, miktar, fiyat) alır; arama ve görünüm değişikliği hiçbir kaydın içeriğine girmez.
- **R7.** Aynı arama bileşenini kullanan **yedek parça dışı** kutular birebir aynı kalır: müşteri ve makina seçicisi, bayi seçicisi, kalıp seçicileri (Evrak'ın "Kalıp Kataloğundan Seç" penceresi, kalıp satış formu ve müşteri formunun kalıp seçicisi, yani `SearchSelect`'in öteki çağrısı `customers/CustomerAddEditForm.jsx:335`) ve tahsis penceresinin müşteri seçicisi.
- **R8.** Değişmeyen öteki yerler: genel aramanın çıktısı (R1/5 ile yalnız alan listesinin kaynağı değişir, sonuç ve neden satırı birebir aynı kalır), parça adını arayan iki kayıt listesi (X8), yazdırma çıktıları, Servis ve Kargo Panosu kartları, Excel sütunları, sipariş penceresi ve belgesi, maliyet, satış fiyatı, sipariş adedi ve stok hesapları.

---

## Constraints

### Uyulması zorunlu

- **C1.** Arama değerleri ve alt satır **tek kaynaktan** okunur: on kutudan hiçbiri kendi alan listesini yazmaz. Kaynak 0158'in yaprak modülüdür (`lib/parcaBilgi.js`, hiçbir şey içe almaz); yardımcılar oraya yazılır.
- **C1/2.** `SearchPick`'e iki **isteğe bağlı** prop eklenir: `aramaDegerleri(item)` eşleşme değerlerini döndürür ve bileşenin bugünkü `getLabel(it)` değeriyle **birlikte** kullanılır, `getAlt(item)` alt satırın metnini döndürür ve boş dönerse satır çizilmez. İkisi de verilmediğinde davranış birebir eskidir (C3). Değerlerin etiketle birlikte kullanılması bugünkü aramayı daraltmaz (R1/4) ve Evrak'ın penceresinde set ekiyle aramayı korur (C8/2).
- **C1/3.** `SearchSelect`'te yeni prop açılmaz, seçenek nesnesine iki isteğe bağlı anahtar eklenir (`ara` ve `alt`) ve eşleşme `[o.label, ...(o.ara || [])]` üzerinden yapılır. Bugünkü `{ value, label }` sözleşmesi bozulmaz; anahtarları olmayan çağrı (müşteri formunun kalıp seçicisi) birebir eskidir.
- **C1/4.** İki yardımcının adı `parcaAramaDegerleri` ve `parcaAramaSatiri`'dir. `parcaBilgisi` adı kullanılmaz: aynı ad sipariş motorunda tek okuyucu olarak duruyor (`siparisIhtiyaci.js:781`) ve 0158'in taraması o dosyada çağrı sayısını birebir sabitliyor; aynı tarama dokuz motor dosyasında `parcaBilgi` dizesini de yasaklıyor.
- **C2.** Eşleştirme ikinci kez yazılmaz. Tek kural 0149'un `kelimelerEslesir` fonksiyonudur; kelimelere bölen ya da normalleştirip `includes` arayan ikinci kopya yasaktır. 0149'un iki taraması **olduğu gibi** yeşil kalır ve genişletilmez: yeni yardımcılar değer döndürür, eşleşme `kelimelerEslesir`'de kalır, yani genişletilecek bir şey yoktur.
- **C2/2.** AC-37'nin taraması 0149'un envanter desenini izler: kapsamdaki on kutunun dosyası `parcaAramaDegerleri` ya da `parcaAramaSatiri` çağırır ve altı alanın adı `src` altında yalnız `lib/parcaBilgi.js`'te geçer (genel arama da yardımcıyı çağırdığı için alan adlarını yazmaz).
- **C3.** Ortak arama bileşenine eklenen alanlar **isteğe bağlıdır**: verilmediğinde bileşenin davranışı birebir eskidir (R7'nin kutuları bu yüzden değişmez).
- **C4.** Bilgi alanları yalnız bilgidir. 0158 R3'ün çapraz ölçümü korunur (alanlar dolu ve boş veride maliyet, fiyat, sipariş adedi ve stok birebir aynı) ve 0158'in motor taraması **gevşetilmez**: yeni yardımcı `urunAgaci.js`, `maliyetKalemleri.js`, `malzeme.js`, `parcaFiyati.js`, `stokHareketi.js`, `setUretimi.js`, `servisStok.js`, `yedekParcaStok.js`, `makinaStandartMaliyet.js` ve `siparisIhtiyaci.js` dosyalarına girmez.
- **C5.** Analiz salt okunurdur: motorun parça satırına yalnız **parçanın kimliği** eklenir, bilgi alanları motorda okunmaz. Katalog kaydını ekran çözer.
- **C6.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı yoktur. İş salt görünüm ve aramadır, bu yüzden **sürüm notu gerekmez**: güncellenmemiş bilgisayar hiçbir veriyi düşürmez ya da yanlış yazmaz.
- **C7.** Parçanın adı hiçbir yolla değiştirilmez; kod, ölçü ve cins ada eklenmez. Ad kayda, çıktıya ve Excel'e giriyor.
- **C7/2.** Kod kayıtta kırpılmaz ve bu iş onu kırpmaya başlamaz (0158'in yazıcısı yalnız üç bilgi alanını kırpıyor): katalog listesinin Kod sütunu değeri bugünkü gibi ham yazar, alt satır ile aranan değerler R2/3 gereği kırpar.
- **C8.** Satır kimlikleri (`data-testid`) ve yer tutucu metinleri (`"Parça ara..."`, `"Bileşen ara..."`, `"Parça ekle..."`) korunur; yeniden adlandırılırsa 0120, 0122, 0126, 0133 ve 0149 testlerinin yarısı gereksiz kırılır.
- **C8/2.** Evrak'ın penceresinde set ekiyle arama bugün çalışıyor ve çalışmaya devam eder (etiket aranan değerlerin içinde kalır). Daralmanın görünmeyen hâli de daralmadır (R1/4).
- **C9.** Ortak liste kancasının (`useFilteredList.js:14`) sözleşmesi büyütülmez, `searchFields` fonksiyon kabul etmez. Katalog listesi bugünkü `searchFields: ["ad"]`'dan `searchFn`'e geçer ve Parça Stoğu'nun bugün yaptığının aynısını yazar; kanca dosyası değişmez.
- **C10.** Görsel kanıt zinciri kapanışın şartıdır: iş sırasında görünümü değişen ekranların `docs/evidence/kanit-eslemesi.json` kayıtları onaylı `degisti` olur (`Takım Yöneticisi · YYYY-AA-GG · spec 0160 <madde>`), spec `done`'a taşınırken `ayni`'ye çevrilir. Kapsamdaki dosyaların bütün kayıtları bugün `ayni` ve dosyanın tamamında hiç `degisti` yok; kanıt fikstürlerinin parçaları kodlu olduğu için Parça Stoğu tablosunu çizen ekranlar, Evrak'ın açık paneli ve bileşen seçicisinin açık paneli bilinçli olarak değişir. Kanıt aracına kapsamdaki kutuların ekranları ve bilgi alanları **dolu** bir parça fikstürü eklenir.

### KAPSAM DIŞI

- **X1.** Parça seçilen iki **klasik açılır liste** (Makina Stoğu'nun kit parçası `stock/MakinaStokTab.jsx:352`, yurt dışı fatura satırı `documents/FaturaFormModal.jsx:175`) — *neden:* bunlar gerçekten `<select>`'tir, tarayıcı yalnız baştan harf eşlediği için kod ya da ölçü yazarak bulma orada çalışmaz ve arama kutusuna çevirmek iki ekranın form mantığını değiştirir (Takım Yöneticisi kararı, 2026-11-24; açık bulgu olarak kalır). QA turunda ölçüldü: Stok'un "Stoğa Parça Ekle" ve "Düzelt" penceresi bu listeye girmez, orası kendi arama kutusu olan bir bileşendir ve onuncu kutu olarak kapsamdadır (R1/2).
- **X2.** Parça Stoğu'nun sabitlenen (pinned) kartları — *neden:* kart genişliği 180 piksel, parça adı orada zaten iki satıra sarıyor.
- **X3.** Servis formunun "Seçilen Parçalar" listesi ve yedek parça satış formunun çok satırlı listesindeki daraltılmış ad hücresi — *neden:* o satırlar düzenlenebilir alan taşıyor ve ad hücresi tek satıra kırpılıyor; seçimden **sonraki** doğrulama bu işin kapsamı değil.
- **X4.** Kalıp kataloğunun seçicileri — *neden:* kalıp tanımının da kodu ve ürün adı var ama istek yedek parçaydı; kalıp tarafı istenirse ayrı işte aynı desenle genişletilir (açık bulgu olarak yazılır).
- **X5.** Hangi alanın eşleştiğini söyleyen "neden satırı" — *neden:* alt satır **dört** değeri yazıyor ve kullanıcı eşleşmelerin çoğunu orada görüyor; İngilizce adıyla ya da model adıyla eşleşen satır bunu göstermez ama İngilizce ad yazan kullanıcı neden eşleştiğini zaten bilir, model adıyla eşleşme ise Parça Stoğu'nun bugünkü davranışıdır (R1/6'nın bilinen sınırı). Genel aramadaki neden satırı oradaki tek satırlık kısa meta yüzünden gerekliydi.
- **X6.** Kodun, ölçünün ve cinsin **veri girişi** (bugün 435 parçanın yalnız üçünde dolu) — *neden:* bu bir veri girişi işidir, uygulama işi değil. Bu spec alanlar doldukça çalışan altyapıyı kurar.
- **X7.** Yazdırma, Excel ve sipariş belgesi — *neden:* bu iş ekran içi aramayı ve sonuç satırını kapsar; belge tarafı 0158'de kuruldu.
- **X8.** Parça adını arayan iki **kayıt listesi** (Stok › Yedek Parça Satışı listesinin arama kutusu `stock/YedekParcaSatisTab.jsx:108`, bayi detayının yedek parça satışları araması `SimpleDealers.jsx:175`) — *neden:* bunlar katalog değil satış kaydı listesidir, satır parçayı değil satışı gösterir ve alt satır orada yanıltır; istenirse ayrı işte aynı desenle genişletilir (açık bulgu olarak yazılır).
- **X9.** `aramaNormalize`'ın simge katlaması (`×`, `Ø`, `*`, `/`) — *neden:* o fonksiyon uygulamanın bütün arama kutularının paylaştığı tek kuraldır; dar bir kazanç için değiştirmek genel aramayı, gider aramasını ve 0149'un altınlarını da etkiler. Sınır R1/7'de yazılı.

---

## Context

Ölçümler 2026-11-24'te bu depo ve canlı veritabanı üzerinde yapıldı.

**Alanlar 0158'den beri var, dolulukları düşük.** Canlı veritabanında 435 canlı parça kaydı var; **kodu dolu 3, ölçüsü dolu 3, hammadde adı dolu 2, cinsi dolu 2** (bunlardan biri "TestAD" deneme kaydı), İngilizce adı dolu 17. Yani bu iş bugün ekranda neredeyse hiçbir şey değiştirmez, kullanıcı doldurdukça işler (X6). Bu rakamlar uygulamanın içinden okundu; QA turunda (2026-11-24) doğrulanamadı, çünkü uygulamanın veritabanı şifrelidir (`sqlite3` dosyayı açmıyor: `file is not a database (26)`). Rakamlar yanlış değil, bu turda doğrulanamaz. Parça adları uzundur: ortalama 39, en uzun 139 karakter; bu, alt satır kararının gerekçesidir (R2).

**Alan adları ve tek okuyucu.** `src/lib/parcaBilgi.js` (0158 A) üç alanı tanımlar: `olcu`, `hammaddeAdi`, `cins`; `parcaBilgiDegerleri(p)` dolu olanları ölçü, hammadde, cins sırasıyla döndürür ve katalog listesi bu fonksiyonu kullanır (`PartManager.jsx:636`, `data-testid="parca-bilgi-satiri"`). Modül yapraktır, hiçbir şey içe almaz. **Ad tuzağı (0158 C3/2, C4):** tedarikçinin `hammadde` alanı boolean bayraktır, parçanın `hammaddeler` alanı eski maliyet kırılımıdır, `tip` parça tipi tanımına bağlıdır; üçü de bu alanlardan ayrıdır. Kodun alanı ayrıdır ve eskidir (`kod`).

**Ortak arama bileşeni aramayı yazdığı metnin üzerinden yapıyor.** `src/components/ui.jsx:162` `SearchPick` imzası bugün `{ items, onPick, getLabel, getKey, placeholder, emptyText }`; süzme `ui.jsx:170`'te `kelimelerEslesir(kelimeler, [getLabel(it)])`, yani **yalnız satırda yazdığı tek metin** aranıyor. Seçim onayı da aynı metni yazıyor (`:175`). Kelimeler render başına bir kez üretiliyor (`:169`, 0149 R8/2). Bu yüzden etikete eklenen her şey kendiliğinden aranabilir hâle gelir; iki istek aynı yerden karşılanır, ama tek satır uzar. Bileşenin satırı düz metindir (0126 Karar 18: set rozeti etikete **metin** olarak giriyor, `SetRozeti.setEtiketEki`).

**Dokuz kutunun bugünkü hâli:**

| Kutu | Yer | Bugün arıyor | Bugün gösteriyor |
|---|---|---|---|
| 1 | `PartManager.jsx:418` (`useFilteredList`, `searchFields: ["ad"]`) | yalnız ad | Kod sütunu + bilgi satırı (0158) |
| 2 | `stock/PartStokTab.jsx:71` (`searchFn`, `[r.part.ad, ...models]`) | ad + model adları | yalnız ad (+ set rozeti, `:200`) |
| 3 | `ServiceForm.jsx:414` (`getLabel={p => p.ad}`) | ad | ad |
| 4 | `YedekParcaSatisForm.jsx:190` | ad · kod | ad · kod |
| 5 | `YedekParcaSatisForm.jsx:225` | ad · kod | ad · kod |
| 6 | `Documents.jsx:1578` → `documents/KalemSecPenceresi.jsx` | ad · kod (+ set eki) | aynı |
| 7 | `PartManager.jsx:182` (`SET_BILESEN_ARA`) | ad | ad |
| 8 | `ModelsManager.jsx:270` | ad | ad |
| 9 | `Analiz.jsx:157` `ParcaSecici` (süzme `:161`, `[p.ad]`) | ad | ad + adet |
| 10 | `stock/PartStokTab.jsx:276` (`SearchSelect`, süzme `ui.jsx:308`, `[o.label]`) | yalnız ad | yalnız ad |

Yani dokuz kutunun hiçbiri ölçü ve cinsi aramıyor, altısı kodu da aramıyor. `getKey` `SearchPick`'in dokuz çağrısının hepsinde açıkça veriliyor, yani etiketin değişmesi anahtarı etkilemez. `onPick` kayda `p.id` ve `p.ad` yazıyor (`ServiceForm.jsx:414`, `ModelsManager.jsx:274`, `YedekParcaSatisForm.jsx:60`, `Documents.jsx:714`), yani etiket değişikliği kayda sızmaz (R6).

**Liste kancası.** `src/hooks/useFilteredList.js:14`; `searchFields` düz alan adlarıdır, `searchFn(item, sorgu)` ikinci parametresi **ayrıştırılmış nesnedir** (`{ kelimeler }`, 0149 R8/3) ve çağıran `kelimelerEslesir(sorgu.kelimeler, [değerler])` yazar. 0125'in `baslangicArama`'sı (genel aramadan gelen ilk metin) kaydın adıyla doluyor, bu davranış korunur.

**Genel arama zaten tam.** `GlobalSearch.jsx:127` parça kategorisini `ad, adEN, kod` ve `PARCA_BILGI_ALANLARI`'nın üç alanıyla arıyor; neden satırı `parcaEslesmeNedeni` (`:76`). Yani eksik olan yalnız ekran içi kutulardır ve bu iş onları genel aramanın kuralına getirir (R1).

**Analiz tarafı.** `Analiz.jsx:222` bileşen `parts` prop'unu zaten alıyor ve seçiciyi `:416`'da motorun `veri.parcalar` çıktısıyla çağırıyor. Motorun parça satırı `lib/analiz.js:168-176` şu alanları taşıyor: `key, ad, servis, kargo, toplam, modeller, musteriler`; parçanın kimliği satırda **yok**, yalnız anahtarın içinde (`analiz.js:31`, `p:<partId>` ya da kimlik yoksa `n:<ad>`). Ekranın anahtarı ayrıştırması kırılgan olurdu; bu yüzden motor satırına kimlik eklenir (C5). **Bedeli:** 0121 ve 0154 kıyas altınları analiz çıktısını içeriyor, yeni alan için ayıklama gerekir (bu depodaki olağan desen: `tests/fixtures/0160-ayikla.js`).

**Etkilenecek testler (iş sırasında birlikte güncellenir).** `tests/ui/set-aramasi-0122.test.jsx` (0122 AC-14/AC-25, satır 226-250) **SearchPick'in imza dizesini birebir** ve sekiz çağrı satırının metnini birebir iddia ediyor, ayrıca "SearchPick etiket taşımaz" diyor; bu iş onları ters çevirir ve yeni isteğe bağlı alanları iddiaya yazar. Ayrıca şu dosyalar parça kutularını sürüyor ve etiket değişiminden etkilenir: `tests/ui/cok-kelimeli-arama-0149.test.jsx`, `-ekranlar`, `-casus`, `tests/ui/evrak-secici-0126.test.jsx`, `tests/ui/parca-suzgeci-0120.test.jsx`, `tests/ui/set-icerigi-0121.test.jsx`, `tests/ui/set-uretimi-0121.test.jsx`, `tests/ui/parca-maliyeti-0087.test.jsx`, `tests/ui/parca-fiyati-0133-satis.test.jsx`, `-app`, `tests/parca-fiyati-0133-kiyas.test.jsx`, `tests/ui/toplu-yedek-parca-0111.test.jsx`, `tests/ui/malzeme-aktarma-0139.test.jsx`, `tests/ui/tahsilat-hesap-0063.test.jsx`, `tests/ui/analiz.test.jsx`.

**QA turunda bulunan beş tuzak.** (1) Stok'un parça seçicisi klasik açılır liste değil: `PartStokTab.jsx:276-280` `SearchSelect` kullanıyor, kendi arama kutusu var (`searchPlaceholder="Parça ara..."`, `initialLimit={10}`) ve süzmesi `ui.jsx:308`'de zaten paylaşılan kuraldan geçiyor; X1'in "tarayıcı yalnız baştan harf eşler" gerekçesi yalnız öteki iki yer için doğru. (2) Kod üç kutuda bugün üst satırda (`YedekParcaSatisForm.jsx:190` ve `:225`, `Documents.jsx:1579`) ve seçim onayı etiketi yazdığı için (`ui.jsx:175`) o üç kutuda bugün kodu da söylüyor; R2 ile R2/4 ancak kod etiketten çıkarılınca birbirini tutar. (3) Kanıt eşlemesinde kapsamdaki dosyaların bütün kayıtları `ayni` ve dosyanın tamamında hiç `degisti` yok, ama kanıt fikstürünün parçaları kodlu (`scripts/evidence/0009-sayfa.jsx:269-272`), yani Parça Stoğu tablosunu çizen ekranlar ve açık paneller bilinçli değişir (C10). (4) Parça adını iki kayıt listesi daha arıyor (`stock/YedekParcaSatisTab.jsx:108`, `SimpleDealers.jsx:175`); R1'in "her kutuda" yazımı onları da içine alıyordu, X8 ile kapsam dışına alındı. (5) `utils.js:156` `aramaNormalize` yalnız Türkçe harfleri katlıyor, yani ölçüdeki `×`, `Ø` ve `*` simgeleri eşleşmez (R1/7, X9).

**Üç bilgi satırı biçimi.** Katalog listesi `parcaBilgiDegerleri` ile üç alan yazıyor (`PartManager.jsx:636`), sipariş penceresi yalnız hammadde ve cins yazıyor (`stock/SiparisPenceresi.jsx:48`), bu iş dört alan yazacak. Üçü bilinçli olarak ayrı kalır (R2/7). Yeni yardımcının adı `parcaBilgisi` olamaz: sipariş motorunda aynı adlı tek okuyucu var (`siparisIhtiyaci.js:781`) ve 0158'in taraması o dosyada çağrı sayısını birebir sabitliyor (C1/4).

**Kıyasların ayrışması.** 0121 kıyası analiz çıktısını bütün olarak karşılaştırıyor ve bugün yalnız `musteriler`'i ayıklıyor (`tests/set-icerigi-0121-kiyas.test.js:57-61`), yani yeni `partId` alanı için ayıklama **oraya** gerekir. 0154 kıyası motordan yalnız beş alan alıyor (`DORT`, `tests/ui/parca-musteri-kirilimi-0154-kiyas.test.jsx:15`), yani yeni alan onun motor karşılaştırmasını etkilemez; ama aynı dosyanın `ekran` altını seçicinin **kapalı düğmesinin** metnini taşıyor ve satırı `b.querySelector("span")?.textContent === ad` ile buluyor, bu yüzden kapalı düğme alt satır almaz ve ad kendi öğesinde ilk sırada durur (R4/4).

**0158'in taraması yolu açık bırakıyor.** `tests/parca-bilgi-0158.test.js:98-109` bilgi alanlarının okunmasını dokuz saf motor dosyasında ve sunucu dosyalarında yasaklıyor, `siparisIhtiyaci.js`'te tek okuyucuya sabitliyor. Bu işin dokunduğu bileşenler o listede **değil**, yani ekranların okuması kuralı bozmaz; yeni yardımcı `urunAgaci.js`'e yazılırsa tarama kırılır (C4).


### QA turunda ölçülenler (2026-11-24)

Hepsi HEAD `b5536882`'de, bu depo üzerinde ölçüldü.

| # | Ölçüm | Sonuç |
|---|---|---|
| A | `SearchPick` imzası, süzmesi, onayı ve kelime üretimi | `ui.jsx:162`, süzme `:170` yalnız `getLabel(it)` üzerinden, onay `:175` aynı metni yazıyor, kelimeler `:169`'da render başına bir kez; spec'in bu atıfları doğru |
| B | Stok'un parça seçicisi gerçekten açılır liste mi | Hayır: `PartStokTab.jsx:276-280` `SearchSelect`, kendi arama kutusu ve `initialLimit={10}` ile; süzme `ui.jsx:308`'de `kelimelerEslesir` |
| C | Öteki iki yer | Gerçekten `<select>`: `stock/MakinaStokTab.jsx:352`, `documents/FaturaFormModal.jsx:175` |
| D | `SearchSelect`'in öteki çağrısı | Müşteri formunun kalıp seçicisi (`customers/CustomerAddEditForm.jsx:335`), R7'ye eklendi |
| E | Kodu üst satırda yazan kutular | Üçü: `YedekParcaSatisForm.jsx:190` ve `:225` (`ad · kod`), `Documents.jsx:1579` (`ad · kod` + set eki) |
| F | Seçim onayının metni | `ui.jsx:175` `getLabel(it)`, yani o üç kutuda onay bugün kodu da yazıyor |
| G | Genel aramanın parça alanları | Altı alan (`GlobalSearch.jsx:127`), neden satırının başlık kümesi ad, İngilizce ad, kod (`:76`); R1'in kümesiyle aynı |
| H | `aramaNormalize`'ın kapsamı | `utils.js:156` yalnız Türkçe harfleri katlıyor; `×`, `x`, `Ø`, `*`, `/` birbirine çevrilmiyor |
| I | Bugünkü bilgi satırı biçimleri | Katalog listesi üç alan (`PartManager.jsx:636`), sipariş penceresi iki alan (`stock/SiparisPenceresi.jsx:48`) |
| J | `parcaBilgisi` adı boş mu | Dolu: `siparisIhtiyaci.js:781`; 0158 taraması çağrı sayısını birebir sabitliyor (`tests/parca-bilgi-0158.test.js:106-108`) ve dokuz motor dosyasında `parcaBilgi` dizesini yasaklıyor |
| K | Liste kancasının genişlemesi gerekiyor mu | Gerekmiyor: `useFilteredList.js:14`; Parça Stoğu bugün `searchFn` kullanıyor (`:71`), katalog listesi `searchFields` (`PartManager.jsx:418`) |
| L | Arama panelinin sarması | `.sp-option` (`src/ui.css:121`) sarma kuralı taşımıyor, panelde yatay kaydırma yok; uzun ad bugün de sarıyor |
| M | Analiz satırının biçimi | `Analiz.jsx:187` adı tek satıra kırpıyor (`nowrap` + `ellipsis`), adet sağda; R2/5'in sarma kuralıyla çelişiyor |
| N | Üç boş sonuç metni | "Bulunamadı." (`ui.jsx:162`), "Sonuç bulunamadı." (`:334`), "Sonuç yok." (`Analiz.jsx:180`) |
| O | Motorun parça satırı | `{key, ad, servis, kargo, toplam, modeller, musteriler}` (`analiz.js:99`, `:168-176`); kimlik satırda yok, `ozet.enCokParca` aynı nesneyi gösteriyor (`:291`) |
| P | 0121 kıyası | Çıktıyı bütün olarak karşılaştırıyor, bugün yalnız `musteriler`'i ayıklıyor (`tests/set-icerigi-0121-kiyas.test.js:57-61`): `partId` için ayıklama gerekir |
| Q | 0154 kıyası | Motordan yalnız beş alan alıyor (`DORT`, `:15`), yani etkilenmez; ama `ekran` altını kapalı düğmenin metnini taşıyor ve satırı `querySelector("span")` ile buluyor (`:28`) |
| R | 0122'nin iddiaları | `SearchPick` imzasını ve sekiz çağrı satırını birebir, gövdede `aria-label` olmadığını ayrıca sabitliyor (`tests/ui/set-aramasi-0122.test.jsx:226-250`) |
| S | Kanıt eşlemesi | Kapsamdaki dosyaların kayıtları: PartManager 328, PartStokTab 23, ServiceForm 24, YedekParcaSatisForm 24, ModelsManager 24, Documents 10, Analiz 8; hepsi `ayni`, dosyanın tamamında sıfır `degisti`. Kanıt fikstürünün parçaları kodlu, bilgi alanları boş (`scripts/evidence/0009-sayfa.jsx:269-272`) |
| T | Parça adını arayan öteki kutular | İki kayıt listesi: `stock/YedekParcaSatisTab.jsx:108` (kutunun metni "Alıcı, parça, kargo no ile ara..."), `SimpleDealers.jsx:175` |

### QA turunda verilen kararlar (2026-11-24)

**Bloklayıcı**

- **Stok'un parça seçicisi kapsama girer.** X1'in gerekçesi onun için yanlıştı; onuncu kutu oldu ve `SearchSelect` aynı isteğe bağlı sözleşmeye bağlandı — *neden:* Intent'in birinci kullanıcısı depodaki kişi ve o ekran onun; maliyeti bir bileşene iki isteğe bağlı anahtar eklemek (R1/2, C1/3, X1).
- **Ortak bileşenlere iki ayrı isteğe bağlı alan eklenir.** Aranan değerler ile alt satır ayrı kümelerdir — *neden:* R1 İngilizce adın aranmasını istiyor, R2/2 onu alt satıra yazmıyor; tek prop ikisini karşılayamaz (C1/2, C1/3, R1/6).
- **Kod üç kutunun etiketinden çıkar ve alt satırın ilk değeri olur.** Onay metni böylece kendiliğinden yalnız adı yazar — *neden:* aynı değer iki kere görünmez, on kutu tek biçim yazar ve R2 ile R2/4 birbirini tutar; arama daralmaz çünkü kod değerler listesinde kalır (R2, R2/4).
- **Kanıt eşlemesi kapanışın şartı olarak yazıldı.** Değişen ekranlar onaylı `degisti` olur, kapanışta `ayni`'ye döner — *neden:* dosyada bugün hiç `degisti` yok ve fikstürün parçaları kodlu, yani bu iş var olan ekranları bilinçli değiştirir; görülmezse kapanışta kırmızı çıkar (C10).

**Önemli**

- **Motorun yeni alanı `partId`, değeri ham, kimliksiz satırda `null`.** — *neden:* biçim her satırda aynı olur, kıyas ayıklaması tek kuralla yazılır ve anahtar ayrıştırma kırılganlığı açılmaz (R4/5).
- **Kıyas yükü düzeltildi: ayıklama 0121'e gerekir, 0154'ün motor tarafına gerekmez.** 0154'ün ekran altını kapalı düğme ve satır yapısı kuralıyla korunur — *neden:* DoD'nin eski maddesi ölçümle çelişiyordu (R4/4, DoD).
- **Analiz'in arama değerleri satırın adı ile katalog kaydının birleşimidir.** — *neden:* adı değişmiş parça hem eski hem yeni adıyla bulunur, kural strictly genişler (R4/3).
- **Analiz satırı bugünkü gibi kırpar, sarma yalnız arama panellerinde geçerlidir.** — *neden:* o kutu beş sütunluk panelin içinde ve sarma kutunun yüksekliğini oynatır (R2/5).
- **AC-32 Electron yerleşim testine bağlandı.** — *neden:* jsdom yerleşim yapmaz, bu depoda yazılı ders; aksi hâlde kriter hiçbir şey ölçmeyen bir testle karşılanmış sayılır (AC-32).
- **Simge normalleştirmesi yapılmaz, sınır yazılır.** — *neden:* `aramaNormalize` bütün arama kutularının paylaştığı tek kural; dar bir kazanç için onu değiştirmek genel aramayı ve 0149'un altınlarını da etkiler (R1/7, X9).
- **Parça adını arayan iki kayıt listesi kapsam dışı yazıldı.** — *neden:* satır parçayı değil satışı gösteriyor, alt satır orada yanıltır; R1'in eski yazımıyla geliştirici onları da değiştirip 0111 ve 0155 testlerini gereksiz kırardı (X8, R8).
- **Genel arama yeni yardımcıyı çağırır.** — *neden:* çıktı birebir aynı kalır ama liste tek yerde durur, iki tarafın ayrışması imkânsızlaşır (R1/5).
- **X5'in gerekçesi düzeltildi: alt satır dört değeri yazar, görünmeyen eşleşme bilinen sınırdır.** — *neden:* İngilizce ad yazan kullanıcı neden eşleştiğini bilir, model adıyla eşleşme ise bugünkü davranış; neden satırı eklemek bu iş için ağır (X5, R1/6).
- **Liste kancası değişmez, katalog listesi `searchFn`'e geçer.** — *neden:* dokuz ekranın paylaştığı kancanın sözleşmesini büyütmenin karşılığı yok (C9).
- **C2'nin "tarama genişletilir" sözü kalktı, yerine envanter taraması yazıldı.** — *neden:* yeni yardımcılar değer döndürüyor, 0149'un taramasında genişletilecek bir şey yok; asıl koruma tek listenin tek dosyada olmasıdır (C2, C2/2).
- **Alt satırın biçimi 0158'in ölçüleriyle sabitlendi ve üç biçimin ayrı kalması yazıldı.** — *neden:* sayı verilmezse biçim ekran ekran kayar, gerekçe yazılmazsa sonraki iş "tutarsızlık" diye düzeltmeye kalkar (R2/6, R2/7).

**Küçük**

- **Üç satır atfı düzeltildi** (`PartStokTab.jsx:70` → `:71`, `:198` → `:200`, `useFilteredList.js:15` → `:14`); öteki yirmi atıf doğruydu — *neden:* iş sırasında atıflar tek tek açılıyor.
- **Canlı veri rakamlarının yöntemi ve doğrulanamadığı yazıldı** — *neden:* veritabanı şifreli, rakamlar yanlış değil ama bu turda doğrulanamaz ve X6'nın bütün gerekçesi onlara dayanıyor.
- **R5 üç boş sonuç metnini ayrı ayrı yazar** — *neden:* tek metin iddia eden kriter, metinleri birleştirme işi sanılabilirdi.
- **R2'nin kapsamı yazıldı: iki satırlı biçim panel ve seçiciler içindir** — *neden:* katalog listesi hiç değişmiyor, R2 evrensel okunuyordu (R3/2).
- **Yardımcıların adı sabitlendi, `parcaBilgisi` yasaklandı** — *neden:* ad çakışması hem kafa karıştırır hem 0158'in sayılı taramasını kırar (C1/4).
- **Set ekiyle aramanın korunduğu yazıldı** — *neden:* daralmanın görünmeyen hâli de daralmadır (C8/2).
- **Kodun kayıtta kırpılmadığı ve Kod sütununun değişmediği yazıldı** — *neden:* aynı değerin iki yerde farklı görünmesi sonradan bulgu olarak geri gelir; kayda kırpma eklemek 0158'in yazma yolunu açmak olurdu (C7/2).
- **X1'in sayımı ikiye indi** — *neden:* "Stoğa Parça Ekle" ile "Düzelt" tek bileşenin iki kipi, üstelik biri kapsama girdi (X1).
- **R7'ye `SearchSelect`'in kalıp çağrısı eklendi** — *neden:* AC-31 "kalıp kutuları birebir eski" diyor, o çağrının adı yazılı olmadan kriter ölçülemez (R7).
- **Etkilenen alanlar `SearchSelect`, Evrak'ın penceresi, genel arama ve kanıt zinciriyle genişledi, liste kancası çıktı** — *neden:* dokunulan dosyaların listesi işin ilk gün okunan haritası (başlık).

### QA turu karar kaydı

| # | Bulgu | Derece | İşlendiği madde |
|---|---|---|---|
| 1 | Stok'un parça seçicisi arama kutusu, X1'in gerekçesi yanlış | Bloklayıcı | R1/2, C1/3, X1 |
| 2 | Yeni iki alanın sözleşmesi tanımsız, İngilizce ad alt satırda yok | Bloklayıcı | C1/2, C1/3, R1/6 |
| 3 | Kod üç etikette ve alt satırda; R2 ile R2/4 çelişiyor | Bloklayıcı | R2, R2/4 |
| 4 | Kanıt eşlemesinde onaylı `degisti` zinciri yok | Bloklayıcı | C10 |
| 5 | Motorun kimlik alanının adı, türü, yokluğu | Önemli | R4/5 |
| 6 | 0154 ayıklaması yanlış, ekran altını ve satır yapısı riskli | Önemli | R4/4, DoD |
| 7 | Analiz'in arama değer listesi tanımsız | Önemli | R4/3 |
| 8 | R2/5 Analiz'in kırpan satırıyla çelişiyor | Önemli | R2/5 |
| 9 | AC-32'nin ölçüm aracı yok | Önemli | AC-32 |
| 10 | Simgeler normalleştirilmiyor, sınır yazılı değil | Önemli | R1/7, X9 |
| 11 | Parça adını arayan iki kayıt listesi sayılmamış | Önemli | X8, R8 |
| 12 | Genel aramanın yardımcıyı çağırıp çağırmayacağı belirsiz | Önemli | R1/5 |
| 13 | X5'in "bütün değerleri yazıyor" gerekçesi yanlış | Önemli | X5, R1/6 |
| 14 | Liste kancasının değişip değişmeyeceği belirsiz | Önemli | C9 |
| 15 | C2'nin "tarama genişletilir"i tanımsız | Önemli | C2, C2/2 |
| 16 | Alt satırın biçimi yazılı değil, üç biçim yan yana | Önemli | R2/6, R2/7 |
| 17 | Üç satır atfı kayık | Küçük | Context |
| 18 | Canlı veri ölçümü doğrulanamadı | Küçük | Context |
| 19 | R5'in tek boş metni yanlış | Küçük | R5 |
| 20 | R2'nin kapsamı (panel mi liste mi) belirsiz | Küçük | R3/2 |
| 21 | Yardımcının adı `parcaBilgisi` olamaz | Küçük | C1/4 |
| 22 | Set ekinin aranabilirliği yazılı değil | Küçük | C8/2 |
| 23 | Kodun kırpılması ve Kod sütunu | Küçük | C7/2 |
| 24 | X1'in "üç açılır liste" sayımı | Küçük | X1 |
| 25 | R7'de `SearchSelect`'in kalıp çağrısı eksik | Küçük | R7 |
| 26 | Etkilenen alanlar ve bağımlı spec'ler eksik | Küçük | Başlık |

### Plan turunda verilen kararlar (2026-11-24)

Takım Yöneticisi planın bütün önerilerini onayladı ("tum onerilerini onayliyorum, spece isle, plani yaz ve uygula"). Plan `specs/0160-uygulama-plani.md`.

- **P1 (AC-37'nin taraması).** "Altı alanın adı yalnız `lib/parcaBilgi.js`'te geçer" harfiyen ölçülemez (`ad`, `kod`, `olcu` uygulamanın her yerinde, kalıp ölçüsü, Kod sütunu ve 0158'in kart alanları dahil). Tarama amaca daraltılır: (a) on kutunun dosyası ve `GlobalSearch.jsx` yardımcıyı çağırır; (b) bu dosyalarda arama ifadesi taşıyan satırlar (`kelimelerEslesir(`, `esles(`, `aramaDegerleri=`, `getAlt=`, `ara:`, `alt:`) alan adını doğrudan okumaz; (c) `GlobalSearch.jsx`'te `.adEN` ve `PARCA_BILGI_ALANLARI` hiç geçmez. Gerekçeli tek istisna Analiz'in motor satırının adı (R4/3) — *neden:* harfiyen tarama yazılamaz, daraltılmış tarama "tek liste" amacını tam ölçer.
- **P2 (neden satırının listeleri).** Genel aramanın neden satırının başlık kümesi ve neden alanları da `parcaBilgi.js`'e iki yardımcı olarak taşınır (`parcaNedenBasliklari`, `parcaNedenAlanlari`); `nedenAlani`/`nedenMetni` çağrısı `GlobalSearch`'te kalır (yaprak modül `utils`'i içe alamaz). Çıktı birebir aynı (AC-35) — *neden:* R1/5 ve AC-48 alan listesinin genel aramada yazılmamasını istiyor.
- **P3 (alt satır biçiminin tek yeri).** `ui.jsx`'te dışa verilen `AramaAltSatir` bileşeni; on kutu onu kullanır, 0158'in katalog bilgi satırına dokunulmaz — *neden:* R2/6 tek yer, R2/7 üç biçimin ayrı kalması, AC-28 katalog listesinin birebir aynı kalması.
- **P4 (alt satırsız HTML).** `getAlt` ya da `o.alt` yoksa satırın HTML'i birebir eskidir, sarmalayıcı eklenmez — *neden:* C3 ve R7.
- **P5 (kutu 4 ve 5'in etiketi).** `parcaAdi(p)` korunur, yalnız kod çıkar — *neden:* adı boş eski kayıtta etiket değişmesin.
- **P6 (seçili parçanın özet kutusu).** Yedek parça satış formunun seçili parça kutusu (`YedekParcaSatisForm.jsx:180`, "ad · kod") değişmez — *neden:* arama sonucu satırı değil; X3 seçimden sonraki görünümü kapsam dışı tutuyor.
- **P7 (Parça Stoğu hücresinin sırası).** Ad, alt satır, set rozeti — *neden:* R3 "adın altına"; bilgi satırı ada ait, rozet hücrenin sonunda kalır.
- **P8 (Analiz kataloğu).** Analiz canlı parçalardan bir kez harita kurar (`String(id)`); çöpteki parça haritada yok, alt satır çizilmez (R4/2, AC-55); `partId` ilk görülen ham değerdir — *neden:* App canlı diziyi veriyor, anahtar zaten `p:<partId>` ile birleşiyor.
- **P9 (kanıt onayı).** Değişen ekranların kaydı `Takım Yöneticisi · 2026-11-24 · spec 0160 C10` onayıyla `degisti` olur, kapanışta `ayni`'ye çevrilir.
- **P10 (Electron sayfası).** AC-32 ayrı bir yerleşim sayfasıyla ölçülür (`scripts/tests/layout/parca-arama.*`); `form-pencere` başka spec'in ölçümünü taşıyor — *neden:* kırıldığında hangi işin kırdığı belli olsun.
- **P11 (boş kurulum).** AC-30 her kutunun spec öncesi davranışını altına alır ve aynen karşılaştırır (`0160-once.json`); tek metin iddia edilmez — *neden:* R5 metinleri birleştirmez, bazı kutular parça yokken hiç çizilmiyor.
- **P12 (etkilenen eski testler).** Yalnız etiket metni değiştiği için kırılan iddialar "spec 0160 ile" notuyla güncellenir; davranış iddiası kırılırsa iş durur ve sorulur.
- **P13 (uygulamada ölçüldü: "Düzelt" penceresinde parça seçici yok).** R1/2'nin onuncu kutusu ve AC-42 "Düzelt" penceresini aynı bileşenin ikinci kipi sayıyordu; ölçüldü: "Stok Miktarını Düzelt" penceresi parçayı sabit yazar (`PartStokTab.jsx`, `<b>{…ad}</b> — mevcut stok`), seçici yalnız "Stoğa Parça Ekle"de. AC-42 seçicinin bulunduğu pencereyle ölçülür, Düzelt penceresinde seçici olmadığı ayrıca sabitlenir; değişecek bir şey yoktur.
- **P14 (uygulamada ölçüldü: kanıt aracının kararsız çekimi).** İlk tam çekimde 70–500 piksellik farklar `<select>` okunun kenar yumuşatmasıydı ve aynı kodun ikinci çekiminde kayboldu; dal yeniden çekildi, rapora yalnız gerçek değişen ve yeni ekranlar girdi (`0160-piksel-raporu.json`, 40 görüntü). `evrak-0126-parca-arama`'nın aydınlık çekiminde arama paneli iki tarafta da açılmadı (0 fark), karanlıkta açıldı; kayıt `degisti`.

---

## Acceptance Criteria

- **AC-1.** Katalog listesinin arama kutusuna bir parçanın **kodu** yazılınca o parça listede kalır, kodu farklı olan parça listeden çıkar.
- **AC-2.** Aynı kutuya **ölçü** yazılınca ölçüsü eşleşen parça bulunur.
- **AC-3.** Aynı kutuya **cins** yazılınca cinsi eşleşen parça bulunur.
- **AC-4.** Aynı kutuya **hammadde adı** yazılınca o parça bulunur.
- **AC-5.** Aynı kutuya **İngilizce ad** yazılınca o parça bulunur.
- **AC-6.** Aynı kutuda adıyla arama spec öncesiyle aynı kümeyi verir (adıyla bulunan hiçbir parça kaybolmaz).
- **AC-7.** İki kelimeli sorguda kelimeler ayrı alanlardan eşleşebilir: biri ada, biri koda uyan sorgu o parçayı bulur.
- **AC-8.** İki kelimeli sorgunun bir kelimesi hiçbir alanda geçmiyorsa parça bulunmaz.
- **AC-9.** Parça Stoğu arama kutusuna ölçü yazılınca satır listede kalır.
- **AC-10.** Parça Stoğu'nun model adıyla araması bugünkü gibi çalışır (daralma yok).
- **AC-11.** Servis formunun "Değişen Parçalar" kutusuna kod yazılınca parça listelenir.
- **AC-12.** Aynı kutudan seçilen parça kayda bugünkü alanlarıyla yazılır; kaydın ad alanına kod, ölçü ya da cins girmez.
- **AC-13.** Servis formunun 0120 parça süzgeci (kalıp işi / tüm parçalar) bugünkü kümeleriyle çalışmaya devam eder.
- **AC-14.** Yedek parça satış formunun tek satırlı kutusunda ölçü ile arama çalışır.
- **AC-15.** Aynı formun çok satırlı listesindeki kutuda cins ile arama çalışır ve seçim yalnız o satıra yazılır.
- **AC-16.** Evrak'ın "Parça Kataloğundan Seç" penceresinde kod ile arama çalışır.
- **AC-17.** Aynı pencerede set parçasının rozet eki satırın üst metninde bugünkü yerinde kalır.
- **AC-18.** Parça kartının "Bileşen ara..." kutusunda ölçü ile arama çalışır ve aday kümesi (set bileşeni olamayanların dışarıda kalması) bugünkü kuralla süzülür.
- **AC-19.** Model kartının "Parça ekle..." kutusunda kod ile arama çalışır ve liste yine yalnız o modele işaretli parçaları gösterir.
- **AC-20.** Analiz'in parça seçicisinde kod ile arama çalışır.
- **AC-21.** Analiz'de kataloğu çözülemeyen parça satırında alt satır çizilmez ve o satır adıyla bulunur.
- **AC-22.** Sonuç satırı iki satırlıdır: üstte ad, altta dolu bilgiler kod, ölçü, hammadde, cins sırasıyla ve nokta ayracıyla.
- **AC-23.** Bilgi alanlarının hiçbiri dolu olmayan parçada alt satır hiç çizilmez.
- **AC-24.** Yalnız bir alanı dolu olan parçada alt satır tek değer yazar, boş alanlar için ayraç bırakılmaz.
- **AC-25.** Başında ve sonunda boşluk olan kod ile arama çalışır ve alt satırda değer boşluksuz yazılır.
- **AC-26.** Seçimden sonraki "eklendi" onayı yalnız parçanın adını yazar; bugün kodu yazan üç kutuda da (4, 5, 6) yalnız ad yazar.
- **AC-27.** Parça Stoğu satırının "Yedek Parça" hücresinde adın altına aynı alt satır yazılır ve tablonun sütun sayısı değişmez.
- **AC-28.** Katalog listesinin satır düzeni değişmez: Kod sütunu ve 0158'in bilgi satırı birebir aynı kalır.
- **AC-29.** Eşleşme olmayan sorguda her kutu bugünkü metnini yazar ("Bulunamadı.", "Sonuç bulunamadı.", "Sonuç yok.") ve liste ekranlarının boş durumu değişmez.
- **AC-30.** Hiç parça tanımlı olmayan kurulumda on kutunun bugünkü boş durum metinleri değişmez.
- **AC-31.** Müşteri, bayi ve kalıp arama kutularının satırları ve arama sonuçları birebir eskidir (ortak bileşenlere yeni alanlar verilmediğinde davranış değişmez); kapsamda `SearchPick`'in kalıp ve müşteri çağrıları ile `SearchSelect`'in kalıp çağrısı da var.
- **AC-32.** Uzun adlı parçada (139 karakter) alt satır adın altına iner ve sonuç paneli yatay kaymaz. Ölçüm **Electron yerleşim testiyle** yapılır (`scripts/tests/layout/` altında paneli açan bir sayfa, 1280 ve 1024 pikselde `scrollWidth` ile `clientWidth` karşılaştırması, `ELECTRON_TESTLERI` listesine eklenir); jsdom yerleşim yapmadığı için orada ölçülmez.
- **AC-33.** Kayıt gövdesi değişmez: servis, yedek parça satışı, set bileşeni ve model kiti için bir parçayı arayıp seçmek spec öncesiyle aynı kaydı üretir.
- **AC-34.** Maliyet, satış fiyatı, sipariş adedi ve stok çıktıları bilgi alanları dolu ve boş veride birebir aynı kalır (0158'in çapraz ölçümü korunur).
- **AC-35.** Genel aramanın parça sonucu ve neden satırı birebir eskidir.
- **AC-36.** Analiz motorunun çıktısı, parça satırına eklenen `partId` dışında birebir eskidir: 0121 kıyası alanı ayıklayarak (`parcalar[]` ve `ozet.enCokParca`) yeşil kalır, 0154 kıyasının motor karşılaştırması ayıklama **gerektirmez** (beş alanı okuyor) ve aynı dosyanın ekran altını da yeşil kalır.
- **AC-37.** Alan listesi tek yerdedir: on kutunun ve genel aramanın hiçbiri kendi alan listesini yazmaz, hepsi yardımcıyı çağırır ve altı alanın adı `src` altında yalnız `lib/parcaBilgi.js`'te geçer (kaynak taraması, 0149'un envanter deseni).
- **AC-38.** Eşleştirme tek kuraldır: kelimelere bölen ya da normalleştirip `includes` arayan ikinci kopya yoktur (0149'un iki taraması olduğu gibi, genişletilmeden yeşil).
- **AC-39.** Yeni yardımcı 0158'in yasaklı dosyalarına girmez (dokuz saf motor, sipariş motoru, sunucu dosyaları; kaynak taraması).
- **AC-40.** Yeni kalıcı alan, veri bölümü, izin kimliği ve sunucu kuralı yoktur (kaynak taraması).

### QA turu kriterleri (2026-11-24)

- **AC-41.** Stok › "Stoğa Parça Ekle" penceresinin parça seçicisinde kod ile arama çalışır.
- **AC-42.** Aynı seçicide ölçü ile arama çalışır ve seçenek satırı alt satırı yazar; "Düzelt" penceresi aynı bileşen olduğu için aynı davranışı gösterir.
- **AC-43.** Aynı seçicinin bugünkü davranışı korunur: boş aramada yalnız ilk on seçenek ve "+N sonuç daha" satırı, eşleşme yokken "Sonuç bulunamadı." metni.
- **AC-44.** Yedek parça satış formunun iki kutusunda ve Evrak'ın penceresinde seçenek satırının üst metni yalnız parçanın adıdır (Evrak'ta ayrıca set rozetinin metin eki); kod alt satırın ilk değeridir ve iki kere görünmez.
- **AC-45.** Aynı üç kutuda seçimden sonraki onay yalnız parçanın adını yazar.
- **AC-46.** İngilizce adıyla eşleşen satır bulunur ama alt satır İngilizce adı yazmaz (bilinen sınır sabitlenir).
- **AC-47.** Ölçüsü `×` ile girilmiş parça `x` yazılan sorguyla bulunmaz (bilinen sınır sabitlenir, eşleştirici değişmedi).
- **AC-48.** Genel arama alan listesini kendi içinde yazmaz, yardımcıyı çağırır (kaynak taraması).
- **AC-49.** Alt satırın biçimi on kutuda aynıdır: punto 11, renk `n500`, üst boşluk 2, değerler nokta ayracıyla.
- **AC-50.** Üç bilgi satırı biçimi ayrı kalır: katalog listesi ölçü, hammadde, cins yazar; sipariş penceresi hammadde ve cins yazar; arama sonucu kod, ölçü, hammadde, cins yazar.
- **AC-51.** Analiz'in seçicisinin kapalı düğmesi alt satır almaz ve bugünkü "ad (adet)" metnini yazar.
- **AC-52.** Analiz'in açık panelindeki satırda ad kendi öğesinde ve belgede ilk sırada durur, alt satır onun kardeşidir.
- **AC-53.** Analiz'de adı sonradan değişmiş parça hem motorun taşıdığı eski adıyla hem kataloğun bugünkü adıyla bulunur.
- **AC-54.** Motorun parça satırı `partId` taşır: kimliği olan satırda kayıttan geldiği değer, kimliği olmayan satırda `null`.
- **AC-55.** Çöpe atılmış parçanın hareketlerini taşıyan analiz satırında alt satır çizilmez ve satır adıyla bulunur.
- **AC-56.** Analiz'in satırı tek satıra kırpar (ad öğesi `nowrap` taşır), adet sağda kalır; sarma kuralı yalnız arama panellerinde geçerlidir.
- **AC-57.** Ortak liste kancasının dosyası değişmez ve `searchFields` fonksiyon kabul etmez; katalog listesi `searchFn` kullanır (kaynak taraması).
- **AC-58.** Parça adını arayan iki kayıt listesinin (Stok › Yedek Parça Satışı, bayi detayı) araması birebir eskidir: orada kod ile arama çalışmaz.
- **AC-59.** Müşteri formunun kalıp seçicisi (`SearchSelect`'in öteki çağrısı) birebir eskidir.
- **AC-60.** Kanıt eşlemesinde görünümü değişen her ekranın kaydı onaylı `degisti` taşır ve spec `done`'a taşınırken `ayni`'ye çevrilir.
- **AC-61.** Kanıt aracında bilgi alanları dolu bir parça fikstürü vardır ve kapsamdaki kutuların ekranları (sonuç satırı, bilgisi boş parça, uzun adlı parça, boş sonuç, hiç parça olmayan kurulum) çekilir.
- **AC-62.** Yeni yardımcıların adı `parcaAramaDegerleri` ve `parcaAramaSatiri`'dir; `parcaBilgisi` adı `src` altında yalnız sipariş motorunda geçer ve 0158'in sayılı taraması yeşil kalır.
- **AC-63.** Evrak'ın penceresinde set parçası "set" yazılarak bulunmaya devam eder.
- **AC-64.** Başında ve sonunda boşluk olan kod kayıtta kırpılmaz: katalog listesinin Kod sütunu değeri ham yazar, alt satır ve aranan değerler kırpar.
- **AC-65.** 0158'in çapraz ölçümü ve motor taraması gevşetilmeden yeşil kalır.
- **AC-66.** 0122'nin `SearchPick` imza iddiası yeni iki isteğe bağlı parametreyle güncellenir ve bileşenin gövdesinde `aria-label` olmadığı iddiası korunur.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Arama değerleri ve alt satır **tek yardımcıdan** okunuyor (`lib/parcaBilgi.js`), eşleştirme 0149'un tek kuralından geçiyor; iki kaynak taraması yeşil (AC-37, AC-38).
- [ ] Aynı kuralı uygulayan başka yer (genel arama) **aynı alan kümesini** kullanıyor; ayrışma yok (AC-35, R1).
- [ ] Yeni kalıcı alan **yok**; dört nokta kuralı uygulanmadı ve bu açıkça yazıldı (AC-40).
- [ ] Yeni veri bölümü **yok**; `BLOB_SECTIONS` ve birleştirme zinciri değişmedi (AC-40).
- [ ] İş salt görünüm ve arama olduğu için **yeni eylem izni eklenmedi**, sunucu tarafı değişmedi (AC-40).
- [ ] Soft-delete ve çöp kutusu simetrisi etkilenmedi (çöptekiler bugünkü kurallarla süzülmeye devam ediyor).
- [ ] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı etkilenmediği için yeni çeviri anahtarı yok.
- [ ] Para gösterilmiyor; çoklu para kuralı bu işte geçerli değil (açıkça yazıldı).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (on kutunun sonuç satırı, bilgisi boş parça, uzun adlı parça, boş sonuç ve hiç parça olmayan kurulum).
- [ ] Analiz motorunun kıyası yeşil: `partId` yalnız **0121**'in altınından ayıklandı (`tests/fixtures/0160-ayikla.js`, `parcalar[]` ve `ozet.enCokParca`), 0154'ün motor karşılaştırması beş alanı okuduğu için ayıklama gerektirmedi ve ekran altını kapalı düğme ile satır yapısı kuralıyla yeşil kaldı (AC-36, R4/4).
- [ ] 0122'nin SearchPick imza ve çağrı iddiaları ile etkilenen on dört test dosyası güncellendi, gerekçesi test yorumunda "spec 0160 ile" notuyla yazıldı; `aria-label` yasağı korundu (AC-66).
- [ ] Onuncu kutu (Stok'un parça seçicisi, `SearchSelect`) kapsamda ve seçenek nesnesinin iki isteğe bağlı anahtarıyla çalışıyor; anahtarsız çağrı birebir eski (AC-41, AC-42, AC-43, AC-59).
- [ ] Kod üç kutunun etiketinden çıktı, alt satırın ilk değeri oldu ve onay metni yalnız adı yazıyor (AC-44, AC-45).
- [ ] AC-32 Electron yerleşim testiyle ölçüldü ve `ELECTRON_TESTLERI` listesine eklendi; jsdom'da yerleşim iddiası yazılmadı.
- [ ] İki bilinen sınır testle sabitlendi: İngilizce ad ile eşleşen satırda görünmeyen eşleşme (AC-46) ve simge katlanmaması (AC-47).
- [ ] Görsel kanıt zinciri tamam: değişen ekranların kayıtları onaylı `degisti` ile yazıldı, kapanışta `ayni`'ye çevrildi ve kanıt aracına bilgi alanları dolu fikstür eklendi (AC-60, AC-61, C10).
- [ ] Kapsam dışı iki kayıt listesi ve iki açılır liste açık bulgu olarak `specs/README.md`'ye yazıldı (X1, X8).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (on kutunun tek arama kuralı, `SearchPick`'in isteğe bağlı iki alanı ile `SearchSelect`'in iki seçenek anahtarı, analiz satırının `partId`'si, üç bilgi satırı biçimi).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

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
