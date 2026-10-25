# 0107 — Extra Kalıp'ın üretim formu işareti kaybolmaz

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3, plan turu 2026-10-25; uygulama commit `3cd3ab7`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Extra Kalıp düzenleme formunun ön doldurması ve kayıt yolu (`src/components/customers/CustomerDetailModal.jsx:411-435`, `:436-470`); müşteri formunun kalıp ızgarası (`src/components/customers/CustomerAddEditForm.jsx:319-379`); üretim formunun bekleyen kalıp toplaması ve başlangıç tarihi hesabı (`src/components/stock/UretimFormu.jsx:18-28`, `:227-252`); Anasayfa'nın bekleyen kalıp sayacı (`src/components/Dashboard.jsx:196-207`); `src/lib/musteriDurumu.js` (yeni saf ölçüt `musteriKalibiBekliyorMu` ve iki yeni metin sabiti, `aynaSatirMi`'nin yeni okuyucuları); `src/components/PartSaleForm.jsx:235` (değişmez; kutuyu çizen dosya ve AC-1'in kanıt kaydının sahibi); `docs/evidence/kanit-eslemesi.json` (iki yeni ekran kaydı) |
| **Bağımlı spec'ler** | 0106 (ayna satır kuralı, `aynaSatirMi`, kalıp pili ve türetme), 0007 (Extra Kalıp satışı ve aynanın doğuşu), 0006 (Extra Kalıp'ın tek kayıt yolu), 0108 (aynı üç okuyucuya dokunur; **bu spec 0108'den önce uygulanır**, 0108 C3) |
| **Ters çevrilen kriterler** | Yok. Hiçbir mevcut kriterin yönü değişmiyor. Spec 0106'nın **ölçüm 13 ve 14'ü** ile **Karar 22'nin gerekçesi** daraltılıyor: "ayna satır `uretimFormGonder` taşımıyor" yalnız kaydın doğduğu an için doğrudur, kullanıcı müşteri formundaki kutuyu işaretlerse taşır (ölçüm 6). 0106'nın kriterleri bundan etkilenmiyor, çünkü pil kümesi aynayı zaten atlıyor (ölçüm 10). 0106'nın ekran kriterleri de korunur: `ayna-kalip-durumu` öğesinin metni harfi harfine aynı kalır (R18, C5/2, ölçüm 24) |

---

## Intent

Satılmış bir Extra Kalıp'ı kalıp üretim formuna göndermek üzere işaretlemenin iki yolu var ve ikisi de güvenilir değil. Satış kaydını başka bir sebeple düzenlemek, örneğin fiyatı düzeltmek ya da kargoya vermek, işareti sessizce siliyor. Müşterinin kalıp listesinde duran kopya satırdan işaretlemek ise hiçbir işe yaramıyor, çünkü orada verilen işaret satışın kendisine değil kopyaya yazılıyor.

Kullanıcı iki durumda da kalıbı işaretlediğini sanıyor ve üretim formunda görmüyor. Hatayı fark etmesinin tek yolu müşteri listesindeki kalıp pilinin "KALIP SİPARİŞ VERİLDİ"den "KALIP SİPARİŞİ BEKLİYOR"a geri düşmesini kendiliğinden görmek, o da ancak makina durumu doluysa oluyor.

Bu iş bittiğinde satış kaydını düzenlemek işarete dokunmayacak, kopya satırdan işaretleme yolu kapanacak ve kopyanın bugün veride duran yanlış işaretleri hiçbir sayıma ve hiçbir listeye girmeyecek. Kalıbı üretim formuna göndermenin tek yeri Extra Kalıp satışı olacak.

---

## Requirements

### Düzenleme kolu işareti korur

- **R1.** Extra Kalıp düzenleme formu kalıp satırını kayıttan kurarken kaydın üretim formu işaretini de taşır; kutu kayıttaki değerle çizilir.
- **R2.** *(revizyon 2, QA turu)* Eşitlik **okuma** tarafında tanımlıdır: kayıt yolunun kalıp satırından **okuduğu** alanların kümesi (`k.ad`, `k.olcu`, `k.fiyat`, `k.uretimFormGonder`), ön doldurmanın kalıp satırına **yazdığı** anahtarların kümesine eşittir. Kayıt yolu, ön doldurmanın yazmadığı bir kalıp alanını okuyamaz.
- **R2/2.** Yazılan alanların kümesiyle eşitlik **aranmaz**: kayıt satıra `ucret`i ve `kartKomisyonu`'nu türetilmiş olarak yazıyor (`ucret` formdaki `fiyat`tan, komisyon form düzeyindeki `yontem`, `taksitSayisi`, `kkYansit`, `kartTarihi`'nden; ölçüm 18), yani "yazılan küme = taşınan küme" bu iş bittikten sonra da yanlış kalırdı. Eşitlik iki kod bloğunu karşılaştıran bir testle sabitlenir (AC-10) ve yanında dokunulmadan kaydetmenin işareti koruduğu davranış testi durur (AC-34).
- **R3.** Düzenleme kaydın kalıp durumuna (`kalipDurumu`) ve üretim formu bağına (`uretimFormId`) dokunmaz. Bugünkü davranış budur, bu spec onu kriterle sabitler.
- **R4.** Kural düzenleme formunun açıldığı bütün giriş noktalarında geçerlidir: müşteri detayının kalıp kartı ve makina geçmişi zaman çizelgesindeki Extra Kalıp satırı aynı yoldan açılır, ikisinde de aynı davranır.

### Kopya satırdan işaretleme kapanır

- **R5.** Müşteri formunun kalıp listesinde **ayna satırda** (bir Extra Kalıp satışının kopyası, ölçüt `partSaleId`'nin varlığıdır) "Üretim formuna gönder" kutusu çizilmez.
- **R6.** Kutunun yerinde Extra Kalıp'ın işareti salt okunur yazılır: işaretliyse "Üretim formuna gönderildi", işaretsizse "Üretim formuna gönderilmedi". İbare 0106'nın ayna satır ibaresini tekrar etmez, çünkü satırın Extra Kalıp satışından geldiği yanındaki durum hücresinde zaten yazıyor.
- **R6/2.** *(revizyon 2, QA turu)* "İşaretli" sorusu yalnız `uretimFormGonder`'e bakmaz, bağ da sayılır: ölçüt `uretimFormGonder` **ya da** `uretimFormId` dolu olmasıdır. Bu ikisi bugünkü veride ayrışıyor, çünkü düzenleme kolu bayrağı siliyor ama bağa dokunmuyor (ölçüm 17); yalnız bayrağa bakan ibare `uretimFormId` taşıyan bir satış için "Üretim formuna gönderilmedi" yazarken yanındaki 0106 durum hücresi aynı satır için "Üretimde" ya da "Hazır" diyecekti.
- **R6/3.** Bağlı Extra Kalıp satışı bulunamazsa ibare `—` yazar (0106'nın bugünkü davranışıyla aynı karakter); R6/2 ölçütü uygulanmaz.
- **R6/4.** İbare **kendi öğesinde** ve kendi kimliğiyle çizilir (`data-testid="ayna-uretim-formu"`); 0106'nın `ayna-kalip-durumu` öğesinin metni değişmez (R18, C5/2). İbare `whiteSpace: "nowrap"` taşır ve ızgara şablonu (`"auto 1fr 1fr auto auto 36px"`, 0106 R11/2) değişmez.
- **R6/5.** İbare **yalnız müşteri formunun** kalıp ızgarasında çizilir. Müşteri detayının kalıp satırında bugün üretim formu kutusu yok, o satır bu işte değişmez.
- **R7.** Ayna olmayan kalıpların kutusu değişmez. Evrak'tan gelen "makinayla verilen kalıp" satırları ayna değildir (`partSaleId` taşımazlar) ve kutularını korurlar.

### Kopyanın saklı işareti hiçbir yerde okunmaz

- **R8.** Üretim formunun "Bekleyen Kalıpları Getir" işlemi müşteri kalıpları arasında ayna satırı atlar; ayna satırdaki saklı işaret hiçbir satır üretmez.
- **R8/2.** *(revizyon 2, QA turu)* Atlama dizinin **konumunu bozmaz**: ayna satır atlanırken ayna olmayan kalıpların `kalipIdx` değerleri değişmez. Dizi önce süzülmez, atlama satır satır yapılır; yoksa sonraki kalıpların indeksi kayar ve kaydetme damgasını başka kalıba basar (ölçüm 21).
- **R9.** Anasayfa'nın "Üretimde Bekleyen Kalıplar" sayacı ayna satırı atlar. Aynı fiziksel kalıp bir kez sayılır.
- **R10.** Yeni üretim formunun başlangıç tarihini en eski bekleyene çeken hesap da ayna satırı atlar.
- **R11.** Ayna satır ölçütü tek yerden gelir (`musteriDurumu.aynaSatirMi`); R8, R9 ve R10'un üç okuyucusu kendi ölçütünü yazmaz ve bu kaynak taramasıyla sabitlenir.
- **R11/2.** *(revizyon 2, QA turu)* Tarama **bu üç okuyucunun dosyalarına** bakar (`src/components/stock/UretimFormu.jsx`, `src/components/Dashboard.jsx`); `partSaleId` ölçütünün kaynakta bugün duran beş kopyası gerekçeli istisnadır (C2/2, ölçüm 19). Tarama bütün kaynağa genişletilmez.
- **R12.** Göç yapılmaz. Veride duran yanlış ayna işaretleri silinmez, okuma anında yok sayılır. Müşteri formunun kaydı o değeri olduğu gibi geri yazar.
- **R12/2.** *(revizyon 2, QA turu)* Atlama **koşulsuzdur**: ölçüt yalnız `partSaleId`'nin varlığıdır, bağlı satışın bulunup bulunmadığına bakılmaz. Bilinen sınır: aynası duran ama satışı bulunamayan kalıp hiçbir sayıya ve getirmeye girmez. Satış silinince ayna da siliniyor (`CustomerDetailModal.jsx:495`), çöpten geri alınınca yeniden ekleniyor (`SettingsTrash.jsx:105`), bu yüzden kalan tek hâl başka müşteriye taşınmış satıştır (X6, X11, ölçüm 22).

### Değişmeyenler

- **R13.** Extra Kalıp satış formunun **ekleme** kolu değişmez: kutu bugünkü yerinde, çoklu satırda satır başına kalır ve doğru satıra yazar (ölçüm 1).
- **R14.** Üretim formunun Extra Kalıp döngüsü, tarih aralığı süzgeci ve kaydetmedeki damgalama değişmez.
- **R15.** Anasayfa sayacı ile üretim formunun getirme ölçütü arasındaki **tarih farkı bilinçlidir ve korunur**: sayaç tarihten bağımsızdır, getirme tarih aralığına bağlıdır (`UretimFormu.jsx:16-18`). Bu spec yalnız ayna satırın atlanmasını iki tarafta aynı kurala bağlar.

### Yeni saf ölçüt ve metinler (revizyon 2, QA turu)

- **R16.** Müşteri kalıbının "bekleyen" olup olmadığı **tek saf ölçüttür**: `musteriDurumu.musteriKalibiBekliyorMu(k)` = ayna satır değil **ve** `uretimFormGonder` dolu **ve** `uretimFormId` boş. R8, R9 ve R10'un üç okuyucusu bu fonksiyonu çağırır, kuralı kendi içinde yeniden yazmaz (ölçüm 20). Extra Kalıp tarafının ölçütü bu işte değişmez (R14).
- **R16/2.** Ölçüt 0108'in devralacağı yerdir: 0108 "bekleyen" tanımını saklı kimlikten bağın canlılığına çevirirken yalnız bu fonksiyonun gövdesini değiştirir, üç okuyucuya ikinci kez dokunmaz (0108 C3'ün zorunlu sırası bunun için var).
- **R17.** İki yeni kullanıcı metni `src/lib/musteriDurumu.js`'te sabittir (`URETIM_FORMU_GONDERILDI`, `URETIM_FORMU_GONDERILMEDI`); bulunamayan satışta 0106'nın bugünkü `—` değeri kullanılır (R6/3). Ekran metin yazmaz (0106 R22/2 deseni, ölçüm 25).
- **R18.** 0106'nın ayna satır ibaresine dokunulmaz: `ayna-kalip-durumu` öğesinin metni iki ekranda da harfi harfine aynı kalır. Yeni ibare ayrı öğededir (R6/4).

---

## Constraints

### Uyulması zorunlu

- **C1.** `uretimFormGonder` alanının adı, anlamı, yazıldığı tablolar ve okunduğu yerler değişmez. Yeni kalıcı alan yok, veri göçü yok.
- **C2.** Ayna satır ölçütü yalnız `partSaleId`'nin varlığıdır (0106 R7/2, `aynaSatirMi`). İkinci bir kopya ölçüt yazılmaz; konum sezgisi kullanılmaz (0106 R17/3, X12).
- **C2/2.** *(revizyon 2, QA turu)* Kaynakta duran beş `partSaleId` ölçütü **gerekçeli istisnadır** ve bu işte birleştirilmez: `src/lib/analiz.js:212` ile `src/lib/utils.js:534` ayrı kavramları sayıyor (Analiz'in kalıp kırılımı ve "satıştaki kalıp adedi"), `src/App.jsx:362-365` ile `src/lib/merge.js:213` kimlik yeniden eşlemesi yapıyor, `CustomerDetailModal.jsx:1107` 0106'nın kabul edilmiş konum sezgisidir (0106 X12). İki okuma yolunun semantiği de farklı: `!= null` `partSaleId: 0`'ı ayna sayar, `!k.partSaleId` saymaz; bugün etkisiz, çünkü `uid()` sıfır üretmiyor (X10).
- **C3.** Extra Kalıp'ın tek kayıt yolu kuralı korunur (0006 C3, 0007 C2): düzenleme kolu `kalipGuncelle`'den, ekleme kolu `kalipSatisiEkle`'den geçmeye devam eder.
- **C4.** Yeni eylem izni, yeni veri bölümü, yeni sunucu kuralı, yeni birleştirme kuralı ve yeni kilit alanı yok. Bu iş çizim ve okuma kuralıdır. **İzin eklenmediği açıkça yazılıdır.**
- **C5.** 0106'nın ayna satır kuralı genişletilir, değiştirilmez: durum seçicisinin salt okunurluğu, `AYNA_SATIR_IBARESI` ve türetilmiş durumun okunma yolu aynı kalır.
- **C5/2.** *(revizyon 2, QA turu)* 0106'nın ayna ibaresinin testleri tam metin karşılaştırıyor (dört yerde, ikisi müşteri formunda ikisi detay modalında; ölçüm 24). Yeni ibare o öğeye yazılmaz, öğenin metni ve kimliği değişmez; bu yüzden hiçbir 0106 kriteri ters çevrilmez.
- **C6.** `partSaleId` taşımayan **eski** ayna satırlar ayırt edilemez (0106 R17/3). Böyle bir satırın kutusu çizilmeye devam eder ve işareti okunur; bu sınır 0106'daki sınırın aynısıdır, bu spec onu genişletmez.
- **C7.** *(revizyon 2, QA turu)* Kanıt kayıtlarının yaşam döngüsü: bu işte **hiçbir mevcut kayıt `degisti` olmaz**. Bugünkü üç 0106 ekranının pikseli değişmiyor (ölçüm 23); iki yeni ekran ilk raporda `fark: "önce görüntüsü yok"` ile doğar (piksel anahtarı taşımaz) ve kayıtları `beklenen: "ayni"` olarak girer.
- **C8.** *(revizyon 2, QA turu)* Düzenleme kolunun kalıp satırında yeniden hesapladığı alanlar (`ucret`, `kartKomisyonu`) ve eksikse damgaladığı `olusturmaZamani` bu işin konusu değildir; 0079'un kart tabanı kuralları dokunulmaz. Kriterler yalnız `uretimFormGonder`, `uretimFormId` ve `kalipDurumu` için "değişmez" der (AC-3, ölçüm 26).

### KAPSAM DIŞI

- **X1.** Veride duran yanlış ayna işaretlerinin silinmesi — *neden:* R12 ile okuma anında yok sayılıyor, yani hiçbir sayıya ve listeye girmiyor; göç bu projede en son çaredir ve bu veri hiçbir rakamı bozmuyor.
- **X2.** `uretimFormId`'nin kopan bağda temizlenmesi ve bir kez forma girmiş kalıbın yeniden getirilebilmesi — *neden:* spec 0108'in konusu; o işin kendi tasarım kararları var (form çöpten dönerse bağ ne olur).
- **X3.** Üretim formu işaretinin müşteri listesinde ya da zaman çizelgesinde ayrı bir rozetle gösterilmesi — *neden:* Takım Yöneticisi 2026-10-25'te bu paketin kapsamını bu iki kusurla sınırladı; ayrıca 0106'nın kalıp pili işaretliyi "KALIP SİPARİŞ VERİLDİ", işaretsizi "KALIP SİPARİŞİ BEKLİYOR" olarak zaten gösteriyor (ölçüm 5).
- **X4.** Evrak'tan doğan Extra Kalıp'a üretim formu kutusu eklenmesi — *neden:* Evrak belge ekranıdır, bir kalıbın üretime girip girmeyeceği satış kaydında karara bağlanır; bu spec'ten sonra satışı düzenleyip işaretlemek güvenli hâle geliyor.
- **X5.** `kalipIdx`'in konumsal kırılganlığı — *neden:* `specs/README.md`'de açık bulgu, kalıba kalıcı kimlik vermeyi ve veri göçünü istiyor, kendi spec'ini hak ediyor.
- **X6.** Extra Kalıp başka müşteriye taşınınca aynasının eski müşteride kalması — *neden:* `specs/README.md`'de açık bulgu; bu spec'in konusu işaret, sahiplik değil.
- **X7.** Düzenleme kipinde çoklu kalıp satırı — *neden:* düzenleme kipi tek kalıpla çalışır (0006/0007 kuralı) ve bu kural değişmiyor.
- **X8.** Bir kalıbın hangi üretim formunda olduğunun formda gösterilmesi — *neden:* bağın gösterimi 0108'in getireceği "bağ kopmuş" ayrımına bağlı; iki iş aynı hücreyi iki kez yeniden çizmesin.
- **X9.** *(revizyon 2, QA turu)* Düzeltmeden önce yazılmış **form taslağının** işaret taşımaması — *neden:* `useFormDraft.restoreDraft` formu bütünüyle değiştiriyor (`setForm(data)`), yani eski bir taslağı geri yüklemek kaydı yine işaretsiz yapar (ölçüm 27). Taslak yalnız düzgün kapatılmayan oturumdan kalır ve kullanıcıya "Yarım kalan form" şeridiyle görünür; taslağı alan bazında birleştirmek `useFormDraft`'ın bütün ekranlardaki sözleşmesini değiştirir.
- **X10.** *(revizyon 2, QA turu)* `analiz.js` ve `utils.js`'teki ayna ölçütlerinin `aynaSatirMi` ile birleştirilmesi — *neden:* ikisi ayrı kavram sayıyor ve ölçütleri `!k.partSaleId` olduğu için semantik farkı var (C2/2); birleştirme bu işin "yalnız çizim ve okuma" kapsamını bozar ve kendi ölçümünü ister.
- **X11.** *(revizyon 2, QA turu)* Atlamanın bağlı satışın canlılığına bağlanması — *neden:* ölçüt ikiye çıkar, üç okuyucuya satış araması girer (bugün başlangıç tarihi hesabı ve Anasayfa'nın müşteri döngüsü satış listesine hiç bakmıyor) ve C2 kırılır; bağın canlılığı 0108'in konusudur (R12/2).

---

## Context

Extra Kalıp satışı bir `partSales` kaydıdır (`tur: "Kalıp"`) ve kaydedilince `kalipSatisi.yeniKalipSatislari` (`src/lib/kalipSatisi.js:55-57`) kalıbı müşterinin listesine `{ad, olcu, partSaleId}` olarak kopyalar. Bu kopya **ayna satırdır**: bağımsız bir kalıp değil, aynı fiziksel kalıbın müşteri tarafındaki görünümüdür. Üretim formu bağı yalnız `partSales` kaydında tutulur (`UretimFormu.jsx:128` `uretimFormId`'yi oraya yazar, `:255-283` bekleyeni oradan toplar).

`uretimFormGonder` işareti dört yerde çiziliyor: Extra Kalıp satış formunun ekleme kolunda satır başına (`PartSaleForm.jsx:205`), düzenleme kolunda tek satırda (`:235`), müşteri formunun kalıp ızgarasında satır başına (`CustomerAddEditForm.jsx:337`) ve Extra Kalıp satışları dışa aktarmasında salt okunur (`SettingsExport.jsx:293`; `partSales` satırını basar, ayna satır o çıktıya hiç girmez, ölçüm 28). İşareti okuyan üç yer var: üretim formunun bekleyen toplaması (`UretimFormu.jsx:232`, `:258`), başlangıç tarihi hesabı (`:23`, `:26`) ve Anasayfa sayacı (`Dashboard.jsx:200`, `:204`). Spec 0106 dördüncü okuyucuyu ekledi: kalıp durumu türetmesi (`musteriDurumu.js:76`).

Düzenleme formu kaydın alanlarını `CustomerDetailModal.openEditPartSale` (`:411-435`) ile forma taşır; kayıt `savePartSale`'in düzenleme kolunda (`:449-470`) kurulur ve kalıp satırının alanları `:459`'da tek satırda yazılır. İşaret o satırda yazılıyor ama ön doldurmada taşınmıyor.

Bilinen tuzaklar: ayna satır ölçütü 0106 ile `musteriDurumu.aynaSatirMi` olarak tek yere kondu ve müşteri formu onu yalnız durum seçicisi için kullanıyor (`CustomerAddEditForm.jsx:347`). Yeni bir kalıcı alan olmadığı için dört nokta kuralı, `MERGE_KEYS` ve `serverAuth` bölüm eşlemesi bu işte devreye girmez.

---

## Ölçümler

Hepsi 2026-10-25. 1, 2 ve 3 gerçek bileşenler sürülerek, kalanı kaynak okumasıyla.

1. **Ekleme kolu doğru çalışıyor.** Gerçek `PartSaleForm`'u bayi yolundan sürdüm: kutuyu işaretleyip kaydettiğimde kayda `uretimFormGonder: true` yazıldı. İki kalıplı satışta birinci satırın kutusunu boş bırakıp ikincisini işaretlediğimde kayıtlar `false` ve `true` çıktı, yani satırlar karışmıyor.
2. **Üretim formu getiriyor.** Bugün tarihli, işaretli bir Extra Kalıp'la yeni form açıp "Bekleyen Kalıpları Getir" dedim: `1 kalıp eklendi.` bildirimi geldi ve satır müşteri başlığı altında tabloya düştü.
3. **Düzenleme kolu işareti siliyor.** Formu `uretimFormGonder: true` taşıyan bir kalıp satırıyla çizdim, kutu **işaretli** geldi; yani bileşen doğru. `openEditPartSale`'in ürettiği şekille (işaret yok) çizdiğimde kutu **işaretsiz** geldi. Kayıt yolu alanı `:459`'da `!!k.uretimFormGonder` ile yazdığı için formu açıp kaydetmek işareti `false` yapıyor.
4. **Kayıp tek giriş noktasına özgü değil.** Düzenleme formunun açıldığı her yer aynı `openEditPartSale`'i çağırıyor; zaman çizelgesindeki Extra Kalıp satırı da (`CustomerDetailModal.jsx:1180` `onEditPartSale`). Bayi detayındaki form yalnız ekleme yapıyor, düzenleme kolu yok (`SimpleDealers.jsx:28-37`).
5. **İşaretin tek göstergesi 0106'nın pili.** `musteriDurumu.js:76` türetmesi işaret doluysa `gonderildi` ("KALIP SİPARİŞ VERİLDİ"), boşsa `bekliyor` ("KALIP SİPARİŞİ BEKLİYOR") diyor. Yani işaret silinince müşteri listesindeki pil sessizce geri düşüyor; "bekliyor" pili yalnız makina durumu dolu kayıtlarda çizildiği için (0106 R21) bazı satırlarda pil büsbütün kayboluyor.
6. **Ayna satırın kutusu açık.** Müşteri formunun kalıp ızgarası ayna satırı yalnız durum seçicisinde ayırıyor (`CustomerAddEditForm.jsx:347` `aynaSatirMi`), kutuda (`:337`) ayırmıyor. Oradan verilen işaret `customers[].kaliplar[i].uretimFormGonder`'e yazılıyor, satışa yazılmıyor.
7. **Ayna satırın işaretini üç yer gerçek kalıp sanıyor.** Getirme döngüsü (`UretimFormu.jsx:232`), başlangıç tarihi hesabı (`:23`) ve Anasayfa sayacı (`Dashboard.jsx:200`) müşteri kalıplarını gezerken `partSaleId`'ye bakmıyor.
8. **Ayna satırdan işaretlemek pratikte hiç gelmiyor.** Getirme müşteri kalıplarını **makinanın satış tarihine** göre süzüyor (`UretimFormu.jsx:229` `c.installDate`), kalıbın satış tarihine göre değil. Extra Kalıp tanımı gereği makinadan sonra satıldığı için açık bir üretim formunun aralığının dışında kalıyor.
9. **Gelirse de yanlış yere damgalanıyor.** Ayna satırdan gelen satır `kaynakTip: "musteri"` olur (`:249`), yani kaydetme `uretimFormId`'yi aynaya yazar (`:122`); `partSales` kaydı ilelebet bekleyen kalır ve Anasayfa onu saymaya devam eder.
10. **0106'nın pili etkilenmiyor.** `kalipKumesi` (`musteriDurumu.js:105`) ayna satırı kümeden çıkarıyor, yani yanlış ayna işareti pili bozmuyor. Etkisi yalnız getirme ve sayımda.
11. **Çift sayım.** İşaretli bir Extra Kalıp ile onun işaretlenmiş aynası birlikte varsa Anasayfa aynı fiziksel kalıbı iki kez sayıyor (biri `kaliplar` döngüsünden, biri `partSales` döngüsünden).
12. **Yeni formun aralığını da bozuyor.** Başlangıç tarihi hesabı (`:23`) işaretli aynayı gerçek kalıp sayıp başlangıcı makinanın satış tarihine çekiyor; makina yıllar önce satılmışsa yeni form yıllar öncesini kapsar ve bütün eski bekleyenler bir forma düşer.
13. **0106'nın ölçüm 13 ve 14'ü dar.** "Ayna satır `uretimFormGonder` taşımıyor" ve "Anasayfa sayacı bu ayrımla doğru çalışıyor" yalnız kaydın doğduğu an için doğru; müşteri formundaki kutu bu varsayımı bozuyor. 0106'nın kriterleri bundan etkilenmiyor (ölçüm 10).
14. **Veride kaç ayna satırın yanlış işaret taşıdığı ölçülemedi:** bu oturumda kullanıcı yedeği elde yok. Göç yapılmadığı için (R12) sayı kararı etkilemiyor; etkisi ölçüm 11 ve 12'nin bugün gerçekleşip gerçekleşmediğidir.
15. **Mevcut test yok.** `tests/` altında "Üretim formuna gönder" metnini arayan hiçbir test yok; `tests/uretim-bekleyen-tarih.test.js` yalnız başlangıç tarihi hesabını ve orada ayna satır kullanmıyor. Yani bu spec hiçbir testi ters çevirmez, yeni test ekler.

### QA turu (2026-10-25)

16. **İşareti silen tek yol düzenleme kolu.** `partSales`'ı yazan öteki yolları okudum: pano durum ve arşiv işlemleri (`ServisPanosu.jsx:317`, `:323`, `:330`, `:336`, `:446`), kargo detay penceresi (`KargoPanosu.jsx:111`), üretim formunun damgası (`UretimFormu.jsx:128`), Evrak'ın kayıt yolu (`evrakUygula.js:34`, yalnız ekleme) ve müşteri detayının ödendi anahtarları. Hepsi yayılmayla yazıyor, yani işareti koruyor. R4'ün "bütün giriş noktaları" iddiası doğru ve kayıp yalnız `openEditPartSale` ile `savePartSale` çiftinden geliyor.
17. **Bayrak ile bağ veride ayrışabiliyor.** `kalipGuncelle` `{ ...eski, ...alanlar }`'dır ve `alanlar` içinde `uretimFormId` yok (`:459`), yani düzenleme bayrağı siler, bağı bırakır. Kanıt aracının bugünkü verisinde bile bu hâl var: `PS_0106` kaydı 872 `uretimFormId: 870` taşıyor, `uretimFormGonder` taşımıyor (`0009-sayfa.jsx:354`) ve form 870'in o satırı `tamamlandi: true` (`:352`). Müşteri 862'nin formundaki aynasında 0106 durum hücresi "Hazır" yazıyor; yalnız bayrağı okuyan bir ibare aynı satırda "Üretim formuna gönderilmedi" yazacaktı.
18. **İki kümenin alanları.** Ön doldurma satıra üç anahtar yazıyor: `{ ad, olcu, fiyat }` (`:417`). Kayıt yolu satırdan dört alan okuyor: `k.ad`, `k.olcu`, `k.fiyat` (`kalipKart(k.fiyat)` ile) ve `k.uretimFormGonder` (`:459`). Satıra yazdığı alanlar ise beş: `ad`, `olcu`, `ucret`, `uretimFormGonder`, `kartKomisyonu`. `ucret` ön doldurmada `fiyat` adını alıyor ve komisyon geri çıkarılıyor (`kalemFiyat = parseMoney(ps.ucret) - yansitilanKomisyon(ps)`), `kartKomisyonu` satırdan değil form düzeyinden hesaplanıyor (`kalipKartHesabi`).
19. **`partSaleId` ölçütünün beş kopyası.** `aynaSatirMi` dışında: `src/lib/analiz.js:212`, `src/lib/utils.js:534`, `src/components/customers/CustomerDetailModal.jsx:1107`, `src/App.jsx:362-365`, `src/lib/merge.js:213`. İkisi okuma ölçütü, ikisi kimlik eşlemesi, biri 0106'nın konum sezgisi.
20. **"Bekleyen" kuralının altı kopyası.** Müşteri tarafı `UretimFormu.jsx:23`, `:232` ve `Dashboard.jsx:200`; Extra Kalıp tarafı `UretimFormu.jsx:26`, `:258` ve `Dashboard.jsx:204`.
21. **`kalipIdx` konumdan geliyor.** `collectPending` satırı `kalipIdx: i` ile işaretliyor (`:250`) ve kaydetme bu indeksle `customers[].kaliplar`'a damga basıyor (`:122`). `forEach` indeksinin içinde atlamak konumu korur, diziyi önce süzmek kaydırır.
22. **Ayna satırın yaşam döngüsü.** Extra Kalıp silinince ayna da siliniyor (`CustomerDetailModal.jsx:495`), çöpten geri alınınca listenin sonuna yeniden ekleniyor (`SettingsTrash.jsx:105`). `extraKalipGrupla` yalnız canlı ve `tur: "Kalıp"` satışları gruplar (`musteriDurumu.js:89`), yani çöpteki satışın aynası bugün de `—` yazıyor.
23. **Kanıt ekranlarının hiçbirinin pikseli değişmiyor.** `musteri-formu-0106-durum` müşteri 867'yi açıyor ve 867'nin kalıplarında ayna satır yok (`0009-sayfa.jsx:344-345`); `musteri-detay-0106-kalip` düzenleme formunu açmıyor; iki liste ekranı aynayı kümeye almıyor. `PartSaleForm.jsx`'in yedi kanıt kaydının hepsi ekleme kipi (`kalip-formu`, `kalip-formu-odendi`, `bayi-kalip-formu`, `kalip-formu-0079-kart`), düzenleme kipinin ekranı yok.
24. **0106 testlerinin tam metin eşitlikleri.** `tests/ui/musteri-durumu-0106.test.jsx:160`, `:163`, `:252` ve `:272` `getByTestId("ayna-kalip-durumu").textContent`'i birebir eşitliyor ("Hazır · Extra Kalıp satışından", "`—` · Extra Kalıp satışından").
25. **0106'nın metinleri kütüphanede.** `AYNA_SATIR_IBARESI` ve `KALIP_DURUM_ADLARI` `musteriDurumu.js:10-14`'te duruyor; ekranlar durum metni yazmıyor.
26. **Düzenleme kolu kaydın her alanını korumuyor.** `ucret` formdaki kalem fiyatından yeniden kuruluyor, `kartKomisyonu` anlık görüntüden yeniden hesaplanıyor (`kalipKartHesabi`), `olusturmaZamani` eksikse şimdi damgalanıyor (`:461`). Komisyon tablosu değişmişse dokunulmamış bir kayıt bile birebir aynı çıkmaz.
27. **Taslak yolu formu bütün olarak değiştiriyor.** `useFormDraft.restoreDraft` `setForm(data)` çağırıyor (`src/hooks/useFormDraft.js`), alan bazında birleştirme yok; `pkDraft` anahtarı kayıt bazlı (`CustomerDetailModal.jsx:95`).
28. **Dördüncü çizim yerinin çıktısı.** `SettingsExport.jsx:293` stok dışa aktarması değil, Extra Kalıp satışları dışa aktarmasının "Üretim Formuna Gönder" sütunu ve `partSales` satırını basıyor.
29. **Satır atıflarında kayma.** Kaydetme damgaları `:122` ve `:128` (spec `:129` diyordu), `kaynakTip: "musteri"` `:249` (`:245` diyordu), Extra Kalıp döngüsü `:255-283` (`:256-280`), `openEditPartSale` `:411-435`, kalıp ızgarası `:319-379`. Doğrulanan atıflar: `:459`, `:337`, `:347`, `:205`, `:235`, `:23`, `:26`, `:232`, `:258`, `:200`, `:204`, `:229`, `:293`, `:76`, `:105`, `:55-57`, `:1180`.
30. **README'nin "Açık bulgular" tablosunda bu kusurun satırı yok.** En yakın iki satır `kalipIdx`'in konumsal kırılganlığı ile "Extra Kalıp başka müşteriye taşınınca aynası eski müşteride kalır"; ikisi de bu spec'in kapsam dışı maddeleri (X5, X6).
31. **Izgara şablonu altı sütun.** `CustomerAddEditForm.jsx:321` `"auto 1fr 1fr auto auto 36px"`; kutu sütunu `auto`, durum hücresi 210 px sabit.
32. **Kutunun kaldırılması hiçbir testi kırmıyor.** `tests/` altında "Üretim formuna gönder" metnini arayan test yok (ölçüm 15) ve müşteri formunda konumdan kutu okuyan test de yok; `getAllByRole("checkbox")` deseninin tek müşteri ve bayi kullanımı `tests/ui/form-dogrulama.test.jsx:76-93` ve o bayi formunu sürüyor.

---

## Kararlar (Takım Yöneticisi, 2026-10-25)

Üç karar da onaylandı.

- **Karar 1. Kopya satırda kutunun yerine salt okunur ibare gelir.** Bağlı Extra Kalıp satışı işaretliyse "Üretim formuna gönderildi", değilse "Üretim formuna gönderilmedi" yazar (R6). Boş hücre reddedildi: 0106 aynı satırda durum seçicisini kaldırırken yerine salt okunur metin koydu ve komşu hücreyle tutarlı olmak kullanıcıya kutunun yokluğunun bir kural olduğunu söyler; boş hücre "neden işaretleyemiyorum" sorusunu cevapsız bırakır.
- **Karar 2. Veride duran yanlış kopya işaretlerine dokunulmaz** (R12). Okuma anında yok sayılırlar. Kaydetmede sessizce silme reddedildi: müşteri formunun kaydını veri temizleyicisine çevirir, 0106'nın "kopya satıra yazılmaz" kuralını ters yönden kırar ve her müşteri kaydı sunucu karşılaştırmasında değişmiş görünüp sekmesi kısıtlı kullanıcıyı 403'e düşürür (bu projede iki kez olmuş sınıf: `stableStringify` ve 0091'in yükleme yolu). Tek seferlik göç de reddedildi: en pahalı ve geri alınamayan yol, oysa R8 ile R10'dan sonra değer hiçbir rakamı etkilemiyor.
- **Karar 3. Düzenleme formunun kutusu kalır** (R1). Kaldırılması reddedildi: Evrak'ın "CRM'e Kaydet" yolu Extra Kalıp üretirken bu alanı hiç yazmıyor ve Evrak'ta kutu yok, yani kutu düzenlemeden kalkarsa o kayıtlar üretim formuna hiçbir yoldan gönderilemez hâle gelir. Ayrıca bir kalıbın üretime girip girmeyeceği satıştan sonra karara bağlanabiliyor ve bugünkü tek yol bu. Seçenek kabul edilseydi 0107'ye Evrak kolu girecek ve "yalnız çizim ve okuma" kapsamı bozulacaktı (X4).

### Analistin spec'te verdiği kararlar

- **Karar 4.** Ölçüt eşitliği (R2) paylaşılan tek sabitle değil **testle** sabitlenir: kalıp satırının bazı alanları (ücret, kart komisyonu) kayıt yolunda hesaplanıyor, formda hesaplanmıyor; tek sabit iki ekranı gereksiz yere birbirine bağlar. Eşitlik testi ucuz ve regresyonu yakalar.
- **Karar 5.** Kopya satır ölçütü yeniden yazılmaz, 0106'nın `aynaSatirMi`'si çağrılır (C2, R11). İkinci kopya ölçüt bu kusur sınıfının kendisidir.

### QA turunda verilen kararlar (2026-10-25)

- **Karar 6. Salt okunur ibare bağa da bakar** (R6/2, bulgu B-1). Ölçüt `uretimFormGonder` ya da `uretimFormId`. Yalnız bayrağı okumak reddedildi: bugünkü veride ikisi ayrışıyor (ölçüm 17) ve ibare `uretimFormId` taşıyan satış için "gönderilmedi" derken yanındaki 0106 hücresi "Üretimde" ya da "Hazır" diyecekti; aynı satırda iki hücrenin birbirini yalanlaması, bu spec'in düzelttiği yanlış bilgilendirmeyi başka bir hücrede yeniden üretir. Bağı kopmuş formun hâlâ "gönderildi" demesi 0108'in konusudur ve okuma tek yardımcıda toplandığı için oraya devredilir (R16/2).
- **Karar 7. Alan kümesi eşitliği okuma tarafında tanımlanır** (R2, R2/2, bulgu B-2). "Yazılan küme = taşınan küme" reddedildi: kayıt satıra `ucret`i ve `kartKomisyonu`'nu türetilmiş yazıyor (ölçüm 18), yani ölçüt bu iş bittikten sonra da yanlış kalırdı. Kusurun kendisi "kayıt okuyor, form taşımıyor" asimetrisi; ölçüt tam onu ölçer. Karar 4'ün "paylaşılan sabit değil, test" kararı bozulmuyor, testin neyi karşılaştıracağı tanımlanıyor.
- **Karar 8. Kaynak taraması üç okuyucunun dosyasına bakar** (R11/2, C2/2, bulgu B-3). "Yalnız `aynaSatirMi`'de yazılıdır" reddedildi: ölçüt kaynakta beş yerde daha duruyor (ölçüm 19) ve taramayı genişletmek `analiz.js` ile `utils.js`'i bu işe sokar, iki farklı semantiği (`!= null` ile `!k.partSaleId`) birleştirmek sessiz davranış değişikliği riski taşır ve "yalnız çizim ve okuma" kapsamını bozar (X10). Dar tarama kusur sınıfını yine yakalar, çünkü yeni kopya ölçüt tam o üç dosyada doğacaktı.
- **Karar 9. "Bekleyen" ölçütü şimdi tek saf fonksiyona alınır** (R16, R16/2, bulgu Ö-1). Üç okuyucuda dört parçalı kuralı kopyalamak reddedildi: bugün altı kopya var (ölçüm 20) ve 0108 zorunlu sırayla aynı üç satıra ikinci kez dokunacak. Ölçüt tek yerde olursa 0108 yalnız gövdeyi değiştirir, iki spec aynı satırda çakışmaz ve iki tarama aynı yeri ayrı ayrı sabitlemez.
- **Karar 10. Atlama konumu bozmaz ve testi ortadaki aynayla yapılır** (R8/2, bulgu Ö-2). Diziyi süzüp gezmek reddedildi: `kalipIdx` konumdur (ölçüm 21) ve kayma damgayı başka kalıba bastırır, yani 0106 X11'in zararını bu iş yeniden üretirdi. Testin düzeneğinde ayna satır listenin ortasında durur.
- **Karar 11. Atlama koşulsuzdur, sınır yazılır** (R12/2, X11, bulgu Ö-3). Atlamayı bağlı satışın bulunmasına bağlamak reddedildi: ölçüt ikiye çıkar, üç okuyucuya satış araması girer (bugün ikisi satış listesine hiç bakmıyor) ve C2 kırılır. Ayna satırın yaşam döngüsü ölçüldü (ölçüm 22): satış silinince ayna da siliniyor, geri alınınca dönüyor, yani kalan tek hâl başka müşteriye taşınmış satış (X6).
- **Karar 12. Kanıtta hiçbir kayıt `degisti` olmaz, iki yeni ekran eklenir** (C7, bulgu Ö-4). Mevcut kayıtları `degisti` yapmak reddedildi: üç 0106 ekranının pikseli değişmiyor (ölçüm 23), gereksiz `degisti` Takım Yöneticisi onayı ister, spec `done`'a taşınırken geri çevrilmesi zorunlu olur ve en önemlisi gerçekten değişen ekranı göstermez. AC-1'in kutusunu çizen dosya `PartSaleForm.jsx` olduğu için kayıt oraya yazılır.
- **Karar 13. Yeni ibare kendi öğesinde ve kendi kimliğinde çizilir** (R6/4, R18, C5/2, bulgu Ö-5). 0106'nın `ayna-kalip-durumu` öğesine yazmak reddedildi: dört test o öğenin metnini birebir eşitliyor (ölçüm 24) ve spec'in "hiçbir kriter ters çevrilmiyor" iddiası bozulurdu. İbare yalnız müşteri formunda çizilir (R6/5), detay modalının kalıp satırında bugün kutu yok.
- **Karar 14. İki yeni metin kütüphanede sabittir** (R17, bulgu Ö-6). Metni ekrana gömmek reddedildi: 0106 bütün durum metinlerini `musteriDurumu.js`'e topladı (ölçüm 25), gömülü metin taramayı ve 0108'in aynı hücreye dokunacak işini zorlaştırır. Bulunamayan satışta 0106'nın bugünkü `—` karakteri kullanılır (R6/3).
- **Karar 15. Sürüm notu yazılır** (bulgu Ö-7). Veride yanlış ayna işareti varsa "Üretimde Bekleyen Kalıplar" sayacı güncellemeden sonra düşer ve o satır bir daha getirilmez; kaç kayıtta olduğu ölçülemedi (ölçüm 14). Not üç şeyi söyler: sayaç düşebilir, kopya satırdan verilen işaretler artık okunmuyor, bir Extra Kalıp'ı üretime göndermenin tek yeri Extra Kalıp satışıdır.
- **Karar 16. AC-3 üç alanla sınırlıdır** (C8, bulgu Ö-8). "Kayıt birebir aynı kalır" reddedildi: düzenleme kolu `ucret`i, `kartKomisyonu`'nu ve `olusturmaZamani`'nı yeniden kuruyor (ölçüm 26), yani derin eşitlik testi meşru sebeplerle kırılır ve geliştiriciyi 0079'un kart tabanı kurallarında gereksiz bir "düzeltmeye" iter.

### Plan turunda verilen kararlar (2026-10-25, Takım Yöneticisi bütün önerileri onayladı)

- **Karar 17 (U1).** İbareyi `musteriDurumu.aynaUretimFormuMetni(k, musteri, grup)` kurar; bağlı satışı `aynaDurumu` ile aynı yoldan (ortak iç yardımcı) bulur, ekran yalnız çağırır. 0108 yalnız bu fonksiyona dokunur.
- **Karar 18 (U2).** Müşteri formuna bağlam gelmezse (`durumBaglami` null) ibare `—` yazar; "satış bulunamadı" ile aynı davranış.
- **Karar 19 (U3).** Ayna satırın ad ve ölçü alanları düzenlenebilir kalır; kapsam yalnız işaret.
- **Karar 20 (U4).** Anasayfa sayacının müşteri döngüsü çöp kontrolü yapmaz; çağıran canlı diziyi verir (`App.jsx` `customers={liveCustomers}`, ölçüldü). Davranış korunur (R15).
- **Karar 21 (U5).** AC-10 taraması iki bloğu ayrı keser (`savePartSale` gövdesindeki `k.<alan>` okumaları, `openEditPartSale`'in `kaliplar: [{ … }]` anahtarları) ve küme `{ad, olcu, fiyat, uretimFormGonder}`; mutasyonla ölçülür.
- **Karar 22 (U6).** Kanıt testi (`tasarim-kaynak`) `ayni` kaydında `piksel: 0` ister; "önce görüntüsü yok" satırı piksel taşımadığı için ilk raporda geçemez. Yeni iki ekranın kaydı bu yüzden **taban raporuna** bağlanır: kanıt aracına ekranlar önce eklenir ve taban eski kodla iki kez çekilir (0 fark). İş raporu bu ekranlarda eski ↔ yeni farkı gösterir (kayıt değil, kanıt). C7'nin "hiçbir kayıt `degisti` olmaz" kuralı aynen.
- **Karar 23 (U7).** Dar pencere çekimi kanıt düzeneğinde dar bir kapla (760 px, `transform` taşıyan kap sabit konumlu pencerenin kapsayıcısı olur) yapılır; araç pencere genişliği değişmez. Electron yerleşim testi eklenmez; tarama şablonu ve `nowrap`'ı sabitler.
- **Karar 24 (U8).** AC-3 ile AC-34 tek testtir, işaretli ve işaretsiz iki kayıtla koşar, üç alana bakar.
- **Karar 25 (U9).** Düzenleme formunun iki giriş noktası ikisi de makina geçmişi zaman çizelgesindedir: tek kalıplı satışın başlığı ve aynı partideki (`batchId`) satışların kalıp adları; ikisi aynı `openEditPartSale`'i çağırır. Müşteri detayının kalıp kartında düzenleme düğmesi yoktur (ölçüldü); R4'teki "kalıp kartı" ifadesi bu iki girişi kapsar. AC-9 iki girişi ayrı sınar.
- **Karar 26 (U10).** Sayaç düşüşü sürüm notunda (Karar 15).
- **Triyaj (2026-10-25), üç bulgu, üçü de gerçek:** (1) AC-25 / AC-35 taraması dosya baytını (sekiz dosyanın SHA'sı) değil anlamı sabitler: sunucu bölümleri, birleştirme anahtarları, eylem izinleri ve ayar alanları listesi ile `kalipSatisi.js` ve `PartSaleForm.jsx`'in `uretimFormGonder` satırları (0093 emsali; ilgisiz bir değişiklik testi kırmaz). (2) Karar 22'nin taban raporu kapanışta değil hemen son kodla yeniden çekildi (iş raporunun "sonra"sı ↔ son kod, 80 görüntü 0 fark); üç kayıt açıkça `beklenen: "ayni"` taşır, test bağı ve iş raporundaki üç değişen ekranı sabitler. (3) Kapanış belge adımları (CLAUDE.md commit satırı, `TASINACAK`, ana dizindeki eski kopya) plan `specs/done`'a taşındığında devreye giren bir testle korunur; esas kopya worktree'deki revizyon 3'tür.
- **Uygulama notu (AC-23).** Ekleme kolunun davranış testi kayıt kurucusu `kalipSatisiEkle` üstünden yapılır (iki kalıplı satış, yalnız ikincisi işaretli); `PartSaleForm.jsx` ve `kalipSatisi.js` dosyalarının değişmediği SHA taramasıyla sabittir (AC-35).

---

## Acceptance Criteria

### Düzenleme kolu

- **AC-1.** Kayıtta `uretimFormGonder` işaretliyken Extra Kalıp düzenleme formu açılınca "Üretim formuna gönder" kutusu işaretli çizilir.
- **AC-2.** Kayıtta işaret yokken aynı kutu işaretsiz çizilir.
- **AC-3.** *(revizyon 2)* Düzenleme formu hiçbir alana dokunulmadan kaydedilince kaydın `uretimFormGonder`, `uretimFormId` ve `kalipDurumu` alanları aynı kalır: işaretli kayıt işaretli, işaretsiz kayıt işaretsiz kalır. Kaydın tamamının birebir kalması iddia edilmez (C8, ölçüm 26).
- **AC-4.** Düzenleme formunda kutu işaretlenip kaydedilince kayıt işaretli olur.
- **AC-5.** Düzenleme formunda işaret kaldırılıp kaydedilince kayıt işaretsiz olur.
- **AC-6.** Düzenlemede yalnız fiyat değiştirilip kaydedilince kaydın işareti değişmez.
- **AC-7.** Düzenleme kaydın `uretimFormId` değerini değiştirmez.
- **AC-8.** Düzenleme kaydın `kalipDurumu` değerini değiştirmez.
- **AC-9.** Makina geçmişi zaman çizelgesindeki Extra Kalıp satırından açılan düzenleme formunda da kutu kayıttaki değerle gelir.
- **AC-10.** *(revizyon 2)* Kayıt yolunun kalıp satırından **okuduğu** alanların kümesi ile ön doldurmanın kalıp satırına **yazdığı** anahtarların kümesi eşittir; biri eksilirse test kırılır. Test iki kod bloğunu karşılaştırır (`savePartSale`'in `k.<alan>` okumaları ile `openEditPartSale`'in `kaliplar: [{ ... }]` anahtarları); yazılan alanların kümesiyle eşitlik aranmaz (R2/2, ölçüm 18).

### Kopya satır

- **AC-11.** Müşteri formunun kalıp listesinde ayna satırda "Üretim formuna gönder" kutusu çizilmez.
- **AC-12.** *(revizyon 2)* Ayna satırda kutunun yerinde Extra Kalıp'ın işareti salt okunur yazılır; bağlı satışın `uretimFormGonder` ya da `uretimFormId` alanı doluysa "gönderildi", ikisi de boşsa "gönderilmedi" ibaresi görünür (Karar 1, Karar 6, R6/2).
- **AC-13.** Ayna olmayan müşteri kalıbında kutu bugünkü gibi çizilir, işaretlenir ve kaydedilir.
- **AC-14.** `partSaleId` taşımayan, Evrak'tan gelen "makinayla verilen kalıp" satırının kutusu çizilir.
- **AC-15.** Müşteri formu kaydedilince ayna satırın saklı `uretimFormGonder` değeri değişmez.
- **AC-16.** *(revizyon 2)* Bağlı satışı bulunamayan ayna satırda ekran çökmez; ibarenin yerinde `—` yazar (0106'nın kullandığı karakterin aynısı, R6/3).

### Getirme, sayım ve tarih

- **AC-17.** İşaretli ayna satır "Bekleyen Kalıpları Getir" ile satır üretmez.
- **AC-18.** Aynı kaydın bağlı Extra Kalıp satışı işaretliyse getirme onu `extra_kalip` kaynağıyla **bir kez** getirir.
- **AC-19.** İşaretli ayna satır Anasayfa'nın "Üretimde Bekleyen Kalıplar" sayacına girmez.
- **AC-20.** İşaretli bir Extra Kalıp satışı ile onun işaretli aynası birlikte varken sayaç 1 gösterir.
- **AC-21.** Yeni üretim formunun başlangıç tarihi hesabı işaretli ayna satırı dikkate almaz; yalnız bekleyen Extra Kalıp'ın satış tarihi ve ayna olmayan müşteri kalıplarının makina satış tarihi sayılır.
- **AC-22.** *(revizyon 2)* Kaynak taraması: getirme, Anasayfa sayacı ve başlangıç tarihi hesabı kendi ayna ölçütünü yazmaz, `musteriDurumu`'nun ölçütünü çağırır. Tarama `src/components/stock/UretimFormu.jsx` ile `src/components/Dashboard.jsx`'e bakar; kaynakta duran beş kopya gerekçeli istisnadır (C2/2, ölçüm 19).

### Değişmeyenler

- **AC-23.** *(revizyon 2)* Ekleme kolu değişmez: kaynak taraması `kalipSatisiEkle` ile `PartSaleForm`'un ekleme kipinin dokunulmadığını gösterir ve davranış testi iki kalıplı satışta işaretin yalnız kutusu işaretlenen satırın kaydına yazıldığını doğrular. Altın fikstür (spec öncesi kayıt dosyası) açılmaz: bu iş o yolu hiç değiştirmiyor ve ölçüm 1 gerçek formu sürerek aynı güvenceyi verdi.
- **AC-24.** Üretim formunun Extra Kalıp döngüsü, tarih aralığı süzgeci ve kaydetmedeki `uretimFormId` damgalaması değişmez.
- **AC-25.** Kaynak taraması: bu iş yeni kalıcı alan, yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı eklemez.
- **AC-26.** 0106'nın kalıp pili ve "Teslim Bekleyenler" süzgeci bu işten etkilenmez: ayna satır kümeye girmemeye devam eder.

### QA turu kriterleri (2026-10-25)

- **AC-27.** Bağlı satışı `uretimFormId` taşıyan ama `uretimFormGonder` taşımayan ayna satırda ibare "gönderildi" der ve yanındaki 0106 durum hücresiyle çelişmez (Karar 6).
- **AC-28.** Yeni ibare kendi öğesinde ve kendi kimliğiyle çizilir; `ayna-kalip-durumu` öğesinin metni müşteri formunda ve detay modalında harfi harfine bugünküyle aynı kalır (Karar 13).
- **AC-29.** İbare yalnız müşteri formunun kalıp ızgarasında çizilir; müşteri detayının kalıp satırında görünmez.
- **AC-30.** Getirme, Anasayfa sayacı ve başlangıç tarihi hesabı `musteriKalibiBekliyorMu`'yu çağırır; kaynak taraması üç dosyada ikinci bir "bekleyen" kuralı bulmaz (Karar 9).
- **AC-31.** Ayna satır listenin ortasında dururken getirme ayna olmayan kalıpların `kalipIdx` değerlerini değiştirmez (üç satırlı düzenekte ikinci gerçek kalıbın indeksi 2 kalır) (Karar 10).
- **AC-32.** Bağlı satışı bulunamayan ayna satır ne Anasayfa sayacına girer ne getirmeyle satır üretir ne başlangıç tarihini çeker (Karar 11, bilinen sınır R12/2).
- **AC-33.** İki yeni kullanıcı metni `src/lib/musteriDurumu.js`'ten gelir; kaynak taraması ekranda gömülü metin bulmaz (Karar 14).
- **AC-34.** Düzenleme formu açılıp hiçbir alana dokunulmadan kaydedilince kaydın kalıp satırı işaretini korur; test işaretli ve işaretsiz iki kayıtla ayrı ayrı koşar (R2/2).
- **AC-35.** Kaynak taraması: ekleme kolunun kayıt kurucusu (`kalipSatisiEkle`) ve `PartSaleForm`'un ekleme kipi bu işte değişmez (AC-23).
- **AC-36.** Ayna satırlı kalıp ızgarası dar pencerede taşmaz: ibare tek satırda kalır ve ızgara şablonu değişmez (Karar 13, ölçüm 31); görsel kanıt dar pencereyi de gösterir.

---

## Görsel kanıt

| Kriter | Ekran | Ne gösterir | Kayıt |
|---|---|---|---|
| AC-1, AC-2 | **Yeni:** Extra Kalıp düzenleme formu, işaretli kayıt | Kutu işaretli açılıyor | `PartSaleForm.jsx`, yeni ekran |
| AC-11, AC-12, AC-27 | **Yeni:** müşteri formunun kalıp listesi, ayna satırlı (bağlı satış `uretimFormId` taşıyor) | Kutunun yerinde salt okunur ibare, 0106 durum hücresiyle çelişmiyor | `CustomerAddEditForm.jsx`, yeni ekran |
| AC-13, AC-14 | Mevcut `musteri-formu-0106-durum` (müşteri 867, ayna satır yok) | Ayna olmayan kalıbın kutusu bugünkü gibi, 0 piksel fark | Mevcut kayıt, `ayni` kalır |
| AC-36 | Ayna satırlı ekranın dar pencere çekimi | İbare tek satırda, ızgara taşmıyor | Aynı yeni ekran |

Kanıt kayıtları `docs/evidence/kanit-eslemesi.json`'a eklenir. **Hiçbir mevcut kayıt `degisti` olmaz** (C7, Karar 12): bugünkü üç 0106 ekranının pikseli değişmiyor (ölçüm 23), iki yeni ekran ilk raporda `fark: "önce görüntüsü yok"` ile doğar (piksel anahtarı taşımaz) ve kayıtları `beklenen: "ayni"` olarak girer. AC-1'in kutusunu çizen dosya `PartSaleForm.jsx:235` olduğu için o kayıt oraya yazılır, `CustomerDetailModal.jsx`'e değil (ölçüm 23).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Ayna satır ölçütü tek yerden okunuyor; kaynak taraması (AC-22) yeşil.
- [x] Aynı sayıyı üreten iki yer (Anasayfa sayacı ve üretim formunun getirmesi) ayna satırı aynı kuralla atlıyor; tarih farkı bilinçli olarak korunuyor (R15).
- [x] Yeni kalıcı alan yok; dört nokta kuralı devreye girmiyor ve bu AC-25 ile gösterildi.
- [x] Yeni veri bölümü yok; `BLOB_SECTIONS` / `MERGE_KEYS` dokunulmadı.
- [x] **Yeni eylem izni eklenmedi** (C4); sunucu tarafı değişmedi ve bu kaynak taramasıyla gösterildi.
- [x] Soft-delete ve çöp kutusu simetrisi etkilenmiyor (bu iş kayıt silmiyor).
- [x] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı yok, çeviri anahtarı eklenmedi.
- [x] Para gösterilmiyor; çoklu para kuralı devreye girmiyor.
- [x] Arayüz kriterlerinin görsel kanıtı eklendi (ayna satırlı ve ayna satırsız liste dâhil, dar pencere çekimiyle); **hiçbir mevcut kanıt kaydı `degisti` olmadı** (C7).
- [x] Müşteri kalıbının "bekleyen" ölçütü tek saf fonksiyonda (`musteriKalibiBekliyorMu`) ve üç okuyucu onu çağırıyor (R16, AC-30).
- [x] İki yeni kullanıcı metni `src/lib/musteriDurumu.js`'te sabit; ekranda gömülü metin yok (R17, AC-33).
- [x] 0106'nın `ayna-kalip-durumu` öğesinin metni iki ekranda da değişmedi; dört 0106 testi dokunulmadan yeşil (R18, C5/2).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] Sürüm notu metni planın ilgili bölümünde: sayaç düşebilir, kopya satırdan verilen işaretler artık okunmuyor, bir Extra Kalıp'ı üretime göndermenin tek yeri Extra Kalıp satışıdır (Karar 15).
- [x] `CLAUDE.md`'nin 0106 bölümündeki ayna satır cümlesi güncellendi (ayna satırın kutusu da artık çizilmiyor) **ve 0107'nin kendi bölümü yazıldı** (kapanan iki yol, üç okuyucunun ortak ölçütü, bilinen sınırlar).
- [x] `specs/README.md`'nin "Açık bulgular" tablosunda bu kusurun satırı olmadığı ölçüldü (ölçüm 30); `kalipIdx` konumu ve "ayna eski müşteride kalır" satırlarına bu spec'in onları kapsamadığı notu düşüldü (X5, X6).
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu, 2026-10-25)

Yirmi bir bulgu çıkarıldı, Takım Yöneticisi hepsini onayladı ve spec'e işlendi.

| No | Derece | Bulgu | Nereye işlendi |
|---|---|---|---|
| B-1 | Bloklayıcı | Salt okunur ibare "işaretli"yi yalnız bayraktan okursa bugünkü bozuk veride komşu hücreyi yalanlıyor | R6/2, R6/3, Karar 6, AC-12, AC-27, ölçüm 17 |
| B-2 | Bloklayıcı | "Alan kümesi eşitliği" bugünkü kodda tanımsız, birebir uygulanamaz | R2, R2/2, Karar 7, AC-10, AC-34, ölçüm 18 |
| B-3 | Bloklayıcı | Kaynak taramasının kapsamı bugünkü kodda yeşil olamaz ve R11 ile çelişiyor | R11/2, C2/2, X10, Karar 8, AC-22, ölçüm 19 |
| Ö-1 | Önemli | "Bekleyen" kuralı üç okuyucuda kopyalanıyor, 0108 aynı satırlara ikinci kez dokunacak | R16, R16/2, Karar 9, AC-30, ölçüm 20 |
| Ö-2 | Önemli | Ayna satır atlanırken `kalipIdx` kayabilir, kriteri yok | R8/2, Karar 10, AC-31, ölçüm 21 |
| Ö-3 | Önemli | Bağlı satışı bulunamayan ayna satır üç okuyucuda tamamen kayboluyor, sınır yazılı değil | R12/2, X11, Karar 11, AC-32, ölçüm 22 |
| Ö-4 | Önemli | Görsel kanıt planı yanlış dosyayı ve gereksiz bir `degisti` kaydını gösteriyor | C7, Karar 12, Görsel kanıt tablosu, DoD, ölçüm 23 |
| Ö-5 | Önemli | 0106 testleri tam metin karşılaştırıyor; yeni ibare aynı öğeye girerse dört kriter ters döner | R6/4, R18, C5/2, Karar 13, AC-28, AC-29, ölçüm 24 |
| Ö-6 | Önemli | Üç yeni kullanıcı metninin sabiti ve dosyası tanımsız | R17, Karar 14, AC-33, ölçüm 25 |
| Ö-7 | Önemli | Sürüm notu yok; sayaç düşebilir ve bir alışkanlık sona eriyor | Karar 15, DoD |
| Ö-8 | Önemli | AC-3'ün "aynı kalır" iddiası kaydın tamamı için doğru değil | C8, Karar 16, AC-3, ölçüm 26 |
| K-1 | Küçük | Eski form taslağı geri yüklenirse işaret yine kaybolur | X9, ölçüm 27 |
| K-2 | Küçük | `SettingsExport.jsx:293` stok değil Extra Kalıp satışları çıktısı | Context, ölçüm 28 |
| K-3 | Küçük | Beş satır atfında kayma | Başlık, Context, ölçüm 9, ölçüm 29 |
| K-4 | Küçük | `Etkilenen alanlar` `PartSaleForm.jsx`'i saymıyor | Başlık |
| K-5 | Küçük | 0107 ile 0108 arasındaki zorunlu sıra başlıkta yazılı değil | Başlık (Bağımlı spec'ler) |
| K-6 | Küçük | DoD'nin README maddesinin hedefi yok | DoD, ölçüm 30 |
| K-7 | Küçük | `CLAUDE.md` maddesi yarım, 0107'nin kendi bölümü istenmiyor | DoD |
| K-8 | Küçük | İbarenin genişliği ve ızgara şablonu | R6/4, AC-36, Görsel kanıt, ölçüm 31 |
| K-9 | Küçük | AC-16'nın "uyumlu bir değer" ifadesi ölçülemez | R6/3, AC-16 |
| K-10 | Küçük | AC-23 hangi güvenceyi istiyor belirsiz (altın fikstür mü tarama mı) | AC-23, AC-35, ölçüm 32 |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `3cd3ab7` | Dal `feat/0107-extra-kalip-isareti`, taban `1da3f53`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 3 | Revizyon 2 QA turu (21 bulgu), revizyon 3 plan turu (Karar 17–26, on öneri) |
| **Düzeltme turu sayısı** | 1 | Triyaj: üç bulgu (1 düşük-orta, 2 düşük): kaynak dosyalarının bayt özetini sabitleyen tarama anlamsala çevrildi; taban son kodla yeniden çekildi ve kayıtlar açıkça `ayni`; kapanış belge adımlarına bekçi test |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 409 dosya, 5452 test (Electron dahil); lint 0 hata |
| **Kaçan hata** | 0 | Kusur testlerinden on dördü eski kodla kırmızı, önkoşullar eski kodla yeşil; dört mutasyonun dördü yakalandı |

**Görsel kanıt:** taban eski ↔ eski 80 görüntü 0 fark (Karar 22'nin ilk hâli), iş raporu aynı 80 görüntüde yalnız üç yeni ekranı değişmiş gösterdi (mevcut 37 ekran 0 fark, C7); triyajda taban son kodla yeniden çekildi (80 görüntü 0 fark).

**Bu spec'ten çıkarılan ders:** "Bu iş şu dosyalara dokunmadı" bir inceleme anı gerçeğidir, kalıcı kural değildir; testte dosyanın bayt özeti değil o işin anlamı (bölüm, izin, alan listeleri, ilgili satırlar) sabitlenmeli, yoksa ilk ilgisiz değişiklik testi kırar. Kanıt kaydını eski kodla çekilmiş tabana bağlamak testi geçirir ama kusurun kendisini gösterir; taban son kodla çekilmelidir.
