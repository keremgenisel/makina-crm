# 0100 — Stoktaki makinanın üretim durumu ve parti üretim panosu

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3; plan `specs/done/0100-uygulama-plani.md`; commit `a6cc65d`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Stok › Makina Stoğu (liste, süzgeçler, ekleme ve düzenleme pencereleri), Stok'un yeni alt sekmesi Parti Üretim Panosu, Anasayfa'nın stok kutusu ve ayrıntı penceresi, müşteri ekleme formunun stoktan makina seçicisi; yeni saf motor; `stock` tablosunun yeni alanı; `src/components/ui.jsx` (`StatCard`'ın isteğe bağlı ek satır yuvası); `docs/evidence/kanit-eslemesi.json`, `scripts/evidence/0009-sayfa.jsx`, `tests/tasarim-kontrast.test.js` ve `tests/suzgec-kaynak.test.js` |
| **Bağımlı spec'ler** | 0022 (üretim partisi ve parti bağı), 0088 (planlanan adetler, Parti Hesabı), 0090 (parti payları), 0065 (stok hareketi ve kit düşümü), 0002 (makina listesi ve üretim tarihi zinciri), 0016 (liste ve boş durum birliği), 0014 (süzgeç çubuğu), 0030 (tema değişkeni kuralı) |
| **Ters çevrilen kriterler** | 0079 ve 0095 ekran kıyas testlerinin Anasayfa bölümü, `kanit-eslemesi.json`'ın üç `MakinaStokTab` kaydı, `suzgec-kaynak` taramasının ekran listesi. Ayrıntı "Ters çevrilen kriterler" bölümünde |

---

## Intent

Fabrika 60 makinalık bir parti planlıyor, 20 tanesinin montajı başlıyor, 5 tanesi daha montajdayken satılıyor, geri kalanının üretimi henüz başlamamış oluyor. Bugün bu tablonun hiçbir parçası ekranda yok: stoktaki makinanın durumu diye bir bilgi tutulmuyor, stok listesi "üretilmiş ve satılmamış" makinaları tek tip gösteriyor ve Anasayfa'daki kutu tek bir sayı yazıyor. Üretimi takip eden kişi "bugün kaç makina satabilirim, kaç tanesi hâlâ montajda, geçen partiden ne kaldı" sorusunu uygulamadan cevaplayamıyor, Excel'de ayrı bir liste tutuyor.

İstek, bu tabloyu makinanın kendi kaydına ve iki ekrana getirmek: stoktaki her makina montajda mı satışa hazır mı belli olsun, önceki partiden kalan makinalar işaretli olsun, Anasayfa'daki kutu bu kırılımı model model göstersin.

Başarı şu: üretim sorumlusu Stok ekranını açtığında hangi makinanın hangi aşamada olduğunu renkli durumuyla görür, parti panosunda "60 planlandı, 20 montajda, 12 satışa hazır, 5 satıldı, 23 başlamadı" satırını okur ve Anasayfa'daki kutuya bakıp "AK100_DS'den 7 tane satışa hazır" diyebilir. Satış yapan kişi, montajdaki bir makinayı ön siparişle satabilir ve bunu satış formunda makinanın durumunu görerek yapar.

---

## Requirements

### Durum, makinanın kendi bilgisi

- **R1.** Stoktaki her makina bir üretim durumu taşır. Durumun iki değeri vardır: **Montajda** ve **Satışa hazır**. Kalıcı alan
  `stock[].uretimDurumu`, saklanan değerler `"montaj"` ve `"hazir"` (Karar 12).
- **R1/2.** İki değer de açıkça saklanır; yalnız boş ya da tanınmayan değer kayda yazılmaz. Durumun tek okuma yolu yeni motorun
  `uretimDurumuOf(s)` fonksiyonudur (alan yoksa ya da değer tanınmıyorsa `"hazir"`); ekranlar dize karşılaştırması yazmaz ve ekranda
  görünen adlar motorun sabitinden (`DURUM_ADLARI`) gelir.
- **R2.** Stoğa yeni eklenen makina **Montajda** doğar.
- **R3.** Durumu olmayan bugünkü kayıtlar **satışa hazır** sayılır. Veri taşıma yapılmaz, hiçbir eski kayda yazılmaz.
- **R3/2.** Yokluk ile açıkça seçilmiş `"hazir"` ekranda aynı görünür ama veride ayrılır: dokunulmamış kaydın gövdesinde alan
  bulunmaz (AC-2), kullanıcının seçtiği değer gövdeye yazılır (AC-43).
- **R4.** Durum elle değiştirilir, makinanın düzenleme penceresinden. Durumu kendiliğinden değiştiren hiçbir ölçüt yoktur (seri no atanması, tarih, satış teklifi).
- **R4/2.** Durumsuz bir kaydın başka bir alanı (not, seri no, kit) değiştirilip kaydedildiğinde de gövdesine durum yazılmaz: alan
  yalnız kullanıcı durum seçicisine dokunursa doğar.
- **R5.** Stoğa giriş davranışı değişmez: satır açılırken parça kiti bugünkü gibi düşülür, durum bu düşümü ne erteler ne değiştirir.
- **R6.** Montajdaki makina satılabilir. Müşteri ekleme formunun stoktan makina seçicisinde durumuyla birlikte görünür.
- **R6/2.** Durum yalnız **serili** stok satırlarının seçeneğinde yazılır. Serisiz makinalar bugünkü gibi tek seçenekte toplanır
  (ölçüm 5) ve seçeneğin metni durum kırılımını yazar ("Seri no'suz stoktan düş: 2 satışa hazır, 1 montajda").
- **R6/3.** Serisiz satışta düşülecek makina durumdan bağımsız seçilmez: önce satışa hazır olanların en eskisi, o yoksa
  montajdakilerin en eskisi düşülür. Kural saf motordadır (ölçüm 21, Karar 16).
- **R7.** Satış bugünkü gibi stok satırını diziden çıkarır. "Satıldı" bir stok durumu değildir; satılan makina müşteri kaydıdır.
- **R7/2.** Stoktan makina seçilmeden yapılan satışta üretim partisi satış formundan seçilebilir ve seçilirse kayda yazılır. Seçim
  isteğe bağlıdır: boş bırakılan satış bugünkü gibi partisiz kalır.
- **R7/2a.** Seçici yalnız **gider yetkisi** olan kullanıcıya çizilir (üretim tarihi alanının bugünkü kuralı, ölçüm 22) ve yalnız
  stok seçicisinin çizildiği kiplerde: ekleme ve seri no bekleyen kaydın düzenlemesi.
- **R7/2b.** Stoktan bir satır seçildiği anda (serili ya da serisiz) seçici çizilmez ve daha önce seçilmiş değer kayda **girmez**;
  makina stok satırının partisini taşır. `satisKaydi.partiDamgala`'ya dokunulmaz: o fonksiyon formdaki değeri koruduğu için
  (ölçüm 23) seçici temizlenmezse makinanın gerçek partisi sessizce kaybolurdu (Karar 14).
- **R7/3.** Satılmış eski bir kaydın partisinin sonradan düzeltilmesi bu işin kapsamında değildir (X8).
- **R8.** Makina maliyeti, parti payları ve üretim adetleri durumdan etkilenmez: montajdaki makina bugün olduğu gibi hesaba girmeye devam eder.

### Önceki partiden kalan makina

- **R9.** Partisi kapanmış ve hâlâ stokta duran makina "önceki partiden kaldı" diye işaretlenir. İşaret okuma anında türer, saklanmaz; parti yeniden açılırsa kendiliğinden kalkar.
- **R9/2.** "Kapanmış parti" ölçütü `uretimPartisi.partiAcikMi`'den okunur; yeni motor kendi `!p.bitisAy` karşılaştırmasını yazmaz
  (C5, ölçüm 7).
- **R10.** Partisi olmayan makina ve partisi çöp kutusunda olan makina işaret almaz.
- **R10/2.** `partiId` dolu ama kaydı canlı parti listesinde bulunamayan makina da işaret almaz. Karşılaştırma `String(partiId)` ile
  yapılır (stok satırındaki parti adı satırının bugünkü kuralı, ölçüm 2).
- **R11.** İşaret parti adını yazmaz. Parti adı bugünkü kuralında kalır: stok satırında yalnız gider yetkisi olan kullanıcıya gösterilir.
- **R12.** İşaret ile durum birbirini dışlamaz; partisi kapanmış ama montajı bitmemiş makina ikisini birden taşır.

### Stok ekranı

- **R13.** Makina Stoğu listesine Durum sütunu eklenir, Model sütununun hemen sağına; tablo dört adlı sütun ve boş başlıklı eylem
  sütunundan (ölçüm 2) altı sütuna çıkar.
- **R14.** Durum hem renkle hem adıyla yazılır; renk tek başına anlam taşımaz. "Önceki partiden kaldı" işareti durumun altında ayrı bir rozettir ve kendi rengini taşır.
- **R14/2.** Rozet renkleri tema değişkenlerinden gelir: Montajda `pur700` / `purBg`, Satışa hazır `grn700` / `grnBg`, Önceki
  partiden kaldı `blu700` / `bluBg` (Karar 18). Amber bilinçli olarak kullanılmaz, çünkü aynı satırdaki Model rozeti `orTx` /
  `ambBg3` taşıyor (ölçüm 14). Yeni tema değişkeni açılmaz.
- **R15.** Listenin başında durum süzgeci olur: Tümü, Montajda, Satışa hazır, Önceki partiden; her birinin yanında sayısı. Süzgeç bugünkü model süzgeci ve arama ile birlikte çalışır.
- **R15/2.** Süzgeç çubuğu sözlükteki `Segment`ten gelir, `kip="dugme"`, sayı `options[].sayi` rozetindedir ve erişilebilir ad
  `"Etiket (n)"` biçimindedir (spec 0014; ölçüm 18). Bugünkü model kartları ızgarası olduğu gibi kalır, durum çubuğu özet
  satırının hemen altına girer.
- **R15/3.** Süzgeç rozetlerindeki sayılar **arama ve model süzgeci uygulanmış** kümeden gelir ve sayfalanmamış listenin tamamını
  sayar (ölçüm 16).
- **R15/4.** Durum süzgeci listenin süzme fonksiyonuna (`filterFn`) girer ve değiştiğinde liste birinci sayfaya döner (model
  süzgecinin bugünkü kuralı, ölçüm 16).
- **R16.** Listenin üstünde özet satırı olur (`data-testid="stok-ozet"`, model kartları ızgarasının altında, durum süzgecinin
  üstünde): toplam, montajda, satışa hazır ve önceki partiden kalan. Ekranın kendi başlığı yok (ölçüm 17), bu yüzden yeri
  burada sabitlenir.
- **R16/2.** Özet satırı **süzgeçsiz bütün canlı stoğu** sayar; süzgeç rozetlerinin sayıları (R15/3) süzgeçli kümeyi sayar. İki
  rakam aynı anlamda değildir ve ekranın iki ayrı yeridir (Karar 17). Anasayfa kutusuyla tutan rakam özet satırıdır.
- **R17.** Süzgeçten boş dönen liste bugünkü boş durum kutusunu gösterir; hiç makina olmayan stok ile süzgece uyan makina olmaması ayrı metinlerdir.
- **R17/2.** İki metin bugün de var ve aynı kimliği taşıyor (ölçüm 15); yeni olan, durum süzgecinden boş dönen listenin de ikinci
  metni göstermesidir. Süzgeç `filterFn`'den geçtiği için (R15/4) bugünkü dal bunu kendiliğinden kapsar.

### Parti Üretim Panosu

- **R18.** Stok'un yeni bir alt sekmesi olur: Parti Üretim Panosu. Parti seçicisiyle açılır.
- **R18/2.** Pano açılışta en son başlayan **açık** partiyi seçer. Hiç canlı parti yoksa seçici yerine kendi boş durum kutusu
  çizilir (`bos-parti-panosu`, spec 0016 kimlik kuralı).
- **R19.** Pano seçilen parti için beş sayıyı verir: planlanan, montajda, satışa hazır, satıldı, kalan; altında aynı beş sayının model satırları.
- **R19/2.** Model satırları planlanan adede göre azalan, eşitlikte model adına göre sıralanır.
- **R19/3.** Model eşleştirmesi `trLower` ile yapılır (0088 emsali, ölçüm 10) ve kataloğa eşleşme şartı aranmaz, çünkü pano maliyet
  hesaplamıyor (R23). Modeli boş olan makina "model girilmemiş" satırında sayılır.
- **R20.** "Satıldı" partiye bağlı canlı müşteri kayıtlarından sayılır. İkinci el devir yeni kayıt açmadığı için her makina bir kez sayılır.
- **R21.** Kalan = planlanan eksi (montajda + satışa hazır + satıldı). Kırpma **model satırında** yapılır: sonuç negatifse sıfır
  yazılır ve o model satırı "plandan fazla üretildi" diye işaretlenir. Toplam kalan, kırpılmış model kalanlarının toplamıdır ve
  plandan fazla üretilen model varsa toplam satırı da işaretlenir (Karar 22).
- **R22.** Pano parti verisidir ve yalnız gider yetkisi olan kullanıcıya çizilir. Yetkisi olmayan kullanıcı alt sekmeyi hiç görmez.
  Kapı `maliyetYetki` değil `giderYetki`'dir ve gerekçesi Karar 11'de (planlanan adet bugün yalnız maliyet sekmesinde görünüyor,
  ölçüm 26).
- **R23.** Pano para göstermez: maliyet, fiyat, ciro ve kâr bu ekranda yoktur.
- **R24.** Planlanan adedi girilmemiş model satırı da çizilir (planlanan sıfır, üretilenler sayılır); planlanan adedi olup hiç üretilmemiş model de çizilir.

### Anasayfa

- **R25.** Stok kutusunun büyük sayısı **satışa hazır** makina adedidir. Alt satırında montajdaki adet ve önceki partiden kalan adet yazar.
- **R25/2.** Kutunun etiketi büyük sayının anlamını söyler ("Satışa Hazır Makina"). Aynı etiket altında sayının anlamı sessizce
  değiştirilmez (Karar 2, Karar 15).
- **R25/3.** Kutu `StatCard`'ın yeni isteğe bağlı ek satır yuvasıyla çizilir; yuva verilmediğinde bugünkü dokuz kutunun çizimi
  birebir aynı kalır (ölçüm 19, C12).
- **R26.** Kutuda satışa hazır adedine göre en çok üç model satırı yazar; geri kalan model sayısı tek satırda belirtilir.
- **R26/2.** Kutuya yalnız satışa hazır adedi **sıfırdan büyük** modeller girer; eşitlikte model adına göre sıralanır. "n model
  daha" sayısı, kutuya girmeyen ve satışa hazırı olan model sayısıdır. Bütün modeller pencerede görünür.
- **R27.** Kutuya tıklanınca açılan pencere model tablosunu verir: Model, Satışa hazır, Montajda, Önceki partiden, ve toplam satırı.
- **R27/2.** Pencerenin altında "Stokta Görüntüle" düğmesi olur: kutunun bugünkü Stok sekmesine gitme davranışı (ölçüm 19)
  kaybolmaz, "Borçlu Firmalar" penceresinin emsaliyle pencerenin içine taşınır (Karar 15).
- **R28.** Pencere örtüşmeyi açıkça yazar: önceki partiden kalanlar ayrı bir küme değildir, ilk iki sütunun içinden geçer.
- **R29.** Kutu ve pencere aynı kaynaktan beslenir; iki yerde iki rakam olamaz.
- **R30.** Kutu ve pencere gider yetkisi istemez ve parti adı yazmaz; yalnız "önceki partiden" sayısını gösterir.
- **R30/2.** Anasayfa parti listesini App'ten **kapısız** alır (`uretimPartileri`, canlı dizi; Stok ekranının bugünkü kuralı,
  ölçüm 20) ve parti adını hiçbir yerde çizmez; bunu bir kaynak taraması sabitler. Prop varsayılanı boş dizidir, yoksa kanıt
  aracının üç `anasayfa-*` ekranı ve iki kıyas testi kırılır.

### Genel

- **R31.** Bütün sayılar tek bir saf motordan gelir; Stok ekranı, pano ve Anasayfa aynı fonksiyonu çağırır.
- **R31/2.** Motorun imzası tek `veri` nesnesidir: `{ stock, customers, uretimPartileri }`, hepsi **canlı** diziler (0090 ve 0092
  emsali). Stok ekranı ve Anasayfa `stokDurumOzeti(veri)` → `{ toplam, montajda, hazir, oncekiParti, modeller: [...] }`, pano
  `partiUretimOzeti(veri, partiId)` çağırır (Karar 19). Serisiz düşüm sırası (R6/3) da bu motordadır.
- **R32.** Yeni eylem izni yoktur. Durumu değiştirmek stok makina düzenleme iznine bağlıdır, çünkü makinanın kendi kaydının alanıdır.

---

## Constraints

### Uyulması zorunlu

- **C1.** Sayma işi React'siz saf motorda yapılır (`analiz.js` deseni); ekranlar saymaz, süzmez ve yüzde hesaplamaz.
- **C2.** Yeni kalıcı alan dört nokta kuralıyla yazılır (`SCHEMA_SQL`, `applyColumnMigrations`, `INSERT` listesi, okuma) ve
  `db-roundtrip` ile `db-clean-install` testlerine eklenir. **Okuma ayıklamalı yazılır:** stok okuması bugün `SELECT *` artı `...s`
  yayılmasıdır (ölçüm 13), alan ayıklanmazsa her satıra `uretimDurumu: null` girer ve bugünkü kayıtların gövdesi değişir. Boş değer
  gövdeye yazılmaz ve bu, spec öncesi gövde fikstürüyle ölçülür (0096 ve 0097 emsali, AC-45).
- **C3.** Göç yoktur. "Durumsuz satır satışa hazırdır" kuralı okuma anında uygulanır, veriye yazılarak değil.
- **C4.** Makina maliyeti motoruna dokunulmaz: makina listesi durumu okumaz, parti payları ve üretim adetleri değişmez (ölçüm 6).
- **C5.** Yeni motor "kapanmış parti" için `uretimPartisi.partiAcikMi`'yi çağırır ve yeni bir `!p.bitisAy` karşılaştırması yazmaz;
  bunu bir kaynak taraması sabitler (AC-62). Bu ölçütün bugün **iki** kopyası var (ölçüm 7); 0090'ın motorundaki kopya bu işte
  düzeltilmez (X9). Amaç aynı: pano ile Makina Maliyeti aynı partiye farklı dememeli.
- **C6.** Parti adının gizliliği bugünkü kuralında kalır (ölçüm 2). Rozet ve Anasayfa sayıları parti adı taşımadığı için yeni bir açılma kararı verilmez.
- **C7.** Renkler tema değişkenlerinden gelir (spec 0030) ve ayırt edilmesi gereken durumlar yalnız renk tonuyla değil, açıklık
  farkıyla ve metinle de ayrılır. Üç rozet çifti (R14/2) `tasarim-kontrast`'ın 0030 bloğuna **dosya adıyla** eklenir: o bloğun
  "ölçülen çiftler ilgili ekran dosyasında gerçekten kullanılıyor" denetimi (`tests/tasarim-kontrast.test.js:96`) dosya adını da
  ister.
- **C8.** Sunucu kuralı değişmez: stok bölümü bugünkü grubunda ve sekme eşlemesinde kalır, yeni alan için alan düzeyi denetim eklenmez (spec 0098 Karar 3 emsali: alan denetimi yalnız düzenlemeyi yakalar, yeni kaydı yakalamaz).
- **C9.** Birleştirme kuralı değişmez: stok zaten birleşen bölümlerdendir ve yeni alan kaydın içinde taşınır.
- **C10.** Pano yalnız okur. Parti kaydına, planlanan adetlere ve makina kayıtlarına bu ekrandan yazılmaz.
- **C11.** Sayma motoru tek `veri` nesnesi alır ve canlı dizilerle çalışır (R31/2); ekranlar diziyi yeniden süzmez, sıralamaz ve
  saymaz. Üç çağıranın aynı fonksiyonu çağırdığı çağrı casusuyla ölçülür (AC-37).
- **C12.** `StatCard`'ın yeni ek satır yuvası isteğe bağlıdır ve verilmediğinde bileşenin çizimi birebir değişmez; sözlükteki
  "tek bir sayıyı öne çıkaran özet kartı" tanımı (`docs/tasarim-sozlugu.md:123`) korunur, kutu ızgaradan çıkarılmaz.
- **C13.** Parti adının gizliliği hiçbir yeni yerde gevşemez: satış formunun parti seçicisi gider yetkisi ister (R7/2a), Anasayfa
  parti listesini kapısız alır ama adı çizmez (R30/2) ve stok rozeti adı yazmaz (R11).

### KAPSAM DIŞI

- **X1.** Satılan makinanın stok satırının korunup "Satıldı" durumuna geçmesi — *neden:* makina listesi makinaları hem müşteri kayıtlarından hem stok satırlarından kuruyor (ölçüm 6); satılan satır stokta kalırsa her makina iki kez sayılır ve maliyet, parti payı, üretim adedi ve kârlılık bozulur. Düzeltmesi paranın geçtiği her yere "satıldıyı ele" kuralı yazmaktır ve yarım kalırsa sessizce yanlış maliyet üretir.
- **X2.** Planlanan 60 adet için yer tutucu kayıt açmak — *neden:* stok satırı açmak parça kitini düşürür (ölçüm 3) ve makina listesine üretim tarihsiz 60 makina sokar; planlanan adet bir sayıdır, kaydı yoktur.
- **X3.** Montajın ara aşamaları (kaynak, boya, test, kalite) — *neden:* iki durum isteğin birebir karşılığı; daha fazlası stok ekranını üretim takip aracına çevirir ve ayrı bir iştir.
- **X4.** Durum değişikliğinin geçmişi, kim ne zaman değiştirdi — *neden:* stok düzenlemesi zaten işlem geçmişine yazılıyor; ayrı bir zaman çizelgesi bu spec'in sorusu değil.
- **X5.** "Silinen müşteriden geri döndü" notunun rozete çevrilmesi — *neden:* ayrı bir soru; bu işte yalnız iki rozetin aynı satırda yan yana gelebilmesi hesaba katılır.
- **X6.** Durumun Analiz ekranına, aylık rapora ve dışa aktarmalara girmesi — *neden:* bu spec iki ekranın sorusudur; rapor tarafı kendi kararını ister.
- **X7.** Panodan makina ekleme, düzenleme ve durum değiştirme — *neden:* pano okuma ekranıdır (C10); makinaya müdahale listede, kaydın kendi penceresinde yapılır.
- **X8.** Satılmış bir makinanın partisinin sonradan düzeltilmesi, yani müşteri düzenleme formunda parti seçicisinin açılması — *neden:* R7/2'nin kapattığı boşluk satış anındadır; geçmiş kayıtların partisini düzeltmek bir veri temizliği işidir ve kendi kararını ister.
- **X9.** `makinaStandartMaliyet.js:511`'deki ikinci "açık parti" kopyasının tek yere indirilmesi — *neden:* iki kopya bugün aynı ifadeyi taşıyor, yani risk gerçekleşmiyor; 0090'ın motorunu bu işte değiştirmek C4'ü (maliyet motoruna dokunulmaz) tehlikeye atar.

---

## Context

Bugünkü davranış, 2026-10-21'de `main` (`250dd16`) üzerinde ölçüldü.

**Ölçüm 1, stok satırında durum yok ve yazma yolu dört yerde.** Satırın alanları: model, seri no, stoğa giriş tarihi, not, parça kiti, silinme damgası, üretim tarihi, parti (`db.cjs:162-163`). Yeni alan `SCHEMA_SQL`, `applyColumnMigrations` (`db.cjs:1145-1146`), `INSERT INTO stock` (`:848`) ve okuma (`:1393`) olmak üzere dört yere yazılmazsa sessizce düşer.

**Ölçüm 2, liste dört adlı sütun artı eylem sütunu, parti adı gider yetkisine bağlı.** Başlık dizisi beş öğeli, beşincisi boş
başlıklı eylem sütunu: `["Model", "Seri Numarası", "Stoğa Giriş", "Not", ""]` (`MakinaStokTab.jsx:177`). Parti adı Model hücresinin
**içinde**, yalnız gider yetkisiyle çiziliyor ve adı canlı parti listesinden `String(partiId)` anahtarıyla çözülüyor, yani çöpteki
partinin adı zaten yazılmıyor ve kaydı bulunamayan parti de ad üretmiyor (`:188`).

**Ölçüm 3, stok satırı açmak parça kitini düşürür.** Kayıtta `makina_uretimi` stok hareketi yazılıyor (`MakinaStokTab.jsx:62`). Yani stoğa girmek "montaj bitti" değil "bu makinanın parçaları ayrıldı" demektir; durumun eklenmesi bu anlamı bozmaz.

**Ölçüm 4, satış stok satırını siler ve parti damgası koşulludur.** Satışta satır diziden çıkarılıyor (`Customers.jsx:264-272`), bağ `sourceStockId` ile kuruluyor; parti ve üretim tarihi damgası yalnız eşleşen stok satırı bulunduğunda atılıyor (`:263`, `:271`). Stok satırı olmadan yapılan satış partiye bağlanmıyor (Karar 10).

**Ölçüm 5, satış formu stoktan seçtiriyor.** Model seçilince o modelin stok satırları listeleniyor, serili ve serisiz ayrı (`CustomerAddEditForm.jsx:185-203`). Montajdaki makina bu listede görünürse ön sipariş bugünkü yoldan çalışır ve parti damgası kendiliğinden doğru atılır.

**Ölçüm 6, makina listesi müşteri artı stoktur.** `makinaMaliyeti.js:106-129`: canlı müşteriler satılmış, canlı stok satırları satılmamış makina olarak aynı listeye giriyor. X1'in bedeli buradan ölçüldü.

**Ölçüm 7, "açık parti" ölçütü tek satırda belli ama bugün iki kopyası var.** `uretimPartisi.js:18`: `partiAcikMi = (p) => !p?.bitisAy`,
yani bitiş ayı girilmiş parti kapanmıştır. Makina Maliyeti aynı ölçütü **kendi kopyasıyla** üretiyor: `makinaStandartMaliyet.js:511`
`acik: !p.bitisAy`, Parti Hesabı da onu okuyor (`:304` `kapanmis = partiPay?.acik === false`). İki kopya bugün aynı ifadeyi taşıdığı
için risk gerçekleşmiyor; C5 bu yüzden "tek yer" iddiasından "yeni motor `partiAcikMi`'yi çağırır" kuralına daraltıldı ve 0090'ın
kopyası X9 ile kapsam dışı yazıldı.

**Ölçüm 8, ikinci el devir yeni kayıt açmaz.** Devirde aynı müşteri kaydı güncelleniyor, önceki sahip listeye ekleniyor (`CustomerDetailModal.jsx:731-742`). Bu yüzden partiye bağlı satılmış makinaları sayarken devredilmişleri elemek **yanlış olur**; Anasayfa'nın başka bir sayı için kullandığı eleme deseni (`Dashboard.jsx:111`) buraya kopyalanmamalıdır.

**Ölçüm 9, Anasayfa kutusu tek sayı ve ızgara dolu.** Kutu `stock.length` yazıyor (`Dashboard.jsx:368`) ve beş sütunlu ızgarada on kutu var (`:365`), yani kutunun genişliği sabit ve uzun bir liste ızgarayı bozar (R26'nın üç model sınırı buradan).

**Ölçüm 10, panonun sayacağı şeyin bir yarısı zaten hesaplanıyor ama para motorunda.** Parti Hesabı partinin makinalarını model model sayıyor ve planlanan adetleri okuyor (`makinaStandartMaliyet.js:313-316`); ama o motor maliyet üretir, gider yetkisine bağlıdır ve tarihli parça maliyeti okur. Pano yalnız adet sayacağı için o motora bağlanmaz (C1, R23). O motorun eşleştirme deseni yine
örnek alınıyor: model adları `trLower` ile eşleniyor, planlanan adetler **adla** tutulduğu için model yeniden adlandırılınca
taşınmıyor ve adı bulunamayan model hesaba girmeden ayrı listeleniyor (`bulunamayan`); panonun kuralı R19/3'te.

**Ölçüm 11, sunucu ve birleştirme değişmiyor.** Stok bölümü stok eylem grubunda (`serverAuth.cjs:43`) ve sekme eşlemesinde (`:109`); üretim partileri bölümü yalnız gider sekmesine bağlı ve pano yalnız okuyacağı için dokunulmuyor. Stok zaten birleşen bölümler listesinde (`merge.js:42`).

**Ölçüm 12, iki eski kıyas testi Anasayfa'yı BOŞ stokla çiziyor.** `tests/fixtures/0079-ekran-once.json` ve
`tests/fixtures/0095-ekran-once.json` Anasayfa'nın metnini tek düz dize olarak (`anasayfa` anahtarı) saklıyor ve iki kıyas testi
(`ui/satis-tevkifat-0079-ekran.test.jsx:40`, `ui/ucretsiz-yedek-parca-0095-kiyas.test.jsx:40`) "bu spec ekranı değiştirmedi"
iddiasını bu metinle kanıtlıyor. Ama ikisi de Dashboard'a `stock={[]}` veriyor: kutunun model satırları ve alt satırı sıfır stokta
çizilmezse (AC-35) **testler hiç kırılmaz** ve DoD'nin "iki kıyas güncellendi" maddesi boşa çıkardı. Kırılmanın tek koşulu kutunun
**etiketi**; R25/2 etiketi değiştirdiği için iki test gerçekten kırılır ve ayıklama gerekir. Anahtar tek düz dize olduğu için
ayıklama bir düzenli ifadedir (0095'in sütun indisi ayıklaması burada çalışmaz).

**Ölçüm 13, stok okuması yayılmalı ve yeni sütunu kendiliğinden gövdeye koyar.** `db.cjs:1393`:
`db.prepare("SELECT * FROM stock").all().map((s) => ({ ...s, parcalar: parseJsonCol(s.parcalar, []) }))`. Düz TEXT sütun eklenince
her stok satırı `uretimDurumu: null` taşır. Aynı tuzak 0079'da `customers`, 0087 ve 0096'da `parts` okumasında ayıklamayla çözüldü
(CLAUDE.md'de yazılı: "`...p` yayılsaydı her parça `maliyet: null` taşırdı"). Dört nokta kuralının "okuma" ayağı düz TEXT'te
otomatik olduğu için tuzak tam burada.

**Ölçüm 14, Model rozeti amber ve üç rozet adayının kontrastı ölçüldü.** `MakinaStokTab.jsx:186` Model rozeti `orTx` / `ambBg3`
kullanıyor, yani aynı satırdaki amber bir durum rozeti onunla tek grup gibi okunur. Ölçülen kontrast oranları (WCAG, aydınlık /
karanlık): `pur700` / `purBg` **6,48 / 8,34**, `grn700` / `grnBg` **4,79 / 8,16**, `blu700` / `bluBg` **6,16 / 6,09**. Üçü de iki
temada AA eşiğinin (4,5) üstünde, yani yeni tema değişkeni açmak gerekmiyor (R14/2).

**Ölçüm 15, boş durum iki metinli ve tek kimlikli.** `MakinaStokTab.jsx:167-170`: `filtered.length === 0` dalı `stock.length === 0`
ise "Stokta makina yok.", değilse "Aramanıza uyan makina yok." yazıyor; ikisi de aynı `testId="bos-makina-stok"`. Yani AC-9 bugünkü
kodda zaten yeşil; yeni olan durum süzgecinin de bu dala girmesidir (R17/2).

**Ölçüm 16, liste sayfalanıyor ve sıfırlama çağıranda.** `useFilteredList` varsayılan `perPage = 10`; arama kendi içinde
sıfırlıyor (`useFilteredList.js:13`), model süzgeci ise çağıranda `setPage(1)` diyor (`MakinaStokTab.jsx:138`). Durum süzgeci aynı
şeyi yapmazsa üçüncü sayfadayken süzülen liste boş görünür (R15/4); rozet sayıları da `paged` değil `filtered` üzerinden olmalı.

**Ölçüm 17, Makina Stoğu sekmesinin kendi başlığı yok.** `<h2>Stok</h2>` `Stock.jsx:49`'da, arkasından alt sekme çubuğu
(`:54-55`); sekmenin içindeki ilk öğe model kartları ızgarası (`MakinaStokTab.jsx:133-147`). R16'nın "liste başlığı" dediği yer
bugün yok, bu yüzden özet satırının yeri spec'te sabitlendi.

**Ölçüm 18, süzgeç taraması bu dosyayı görmüyor.** `tests/suzgec-kaynak.test.js:9-10` `EKRANLAR` listesi yedi ekran dosyasını ve
`stock/YedekParcaSatisTab.jsx`'i tarıyor, `stock/MakinaStokTab.jsx`'i taramıyor; yani orada yazılan yerel bir süzgeç çubuğu sessizce
geçer. `Segment`in sayı rozeti ve `aria-label="Etiket (n)"` desteği `tasarim.jsx:53,56`'da hazır.

**Ölçüm 19, Anasayfa kutusu StatCard ve ek satır yuvası yok.** `ui.jsx` `StatCard` yalnız `label`, `value`, `sub` alıyor; `sub` tek
satırlık ibare. `.stat-card` (`ui.css:67`) sabit yükseklik taşımıyor ve ızgara `repeat(5, 1fr)` (`Dashboard.jsx:365`) olduğu için
satırın yüksekliği en uzun kutuya göre belirlenir: kutu altı yedi satıra çıkarsa **aynı satırdaki diğer dört kutu da uzar**. Kutu
bugün `onClick={onGoStock}` ile Stok sekmesine gidiyor (`:368`), yani R27'nin penceresi bu gezinmeyi yutar.

**Ölçüm 20, Dashboard parti listesini hiç almıyor.** `App.jsx:1697` Dashboard'a `uretimPartileri` geçmiyor ve onun bütün gider/kasa
verisi kapılı (`giderler`, `giderTurleri`, `tedarikciler`, `hesapHareketleri` → `giderYetki`; `kasaHesaplari`, `cekler` → `kasaYetki`).
Aynı liste Stok ekranına **kapısız** gidiyor (`:1704` `uretimPartileri={liveUretimPartileri}`). `stock = []` varsayılanı var, yeni
prop da varsayılanlı olmalı (R30/2).

**Ölçüm 21, serisiz satışta düşen makina dizinin ilki.** `Customers.jsx:262` `stock.find(s => s.model === clean.model && !s.serialNo)`;
yeni makina diziye başa ekleniyor (`MakinaStokTab.jsx:73` `[{ ...form, id: nid }, ...p]`), yani **en yeni** satır düşüyor. R2 ile
birlikte: montajda doğan makina, stokta duran daha eski satışa hazır makinadan önce tüketilir. Bugün bu soru önemsizdi, durumdan
sonra önemli (R6/3).

**Ölçüm 22, satış formundaki parti seçicisinin emsali üretim tarihi alanı.** `CustomerAddEditForm.jsx:359-362` üretim tarihini
yalnız `giderYetki` ile çiziyor. Stok seçicisi iki kipte çiziliyor: ekleme ve seri no bekleyen kaydın düzenlemesi
(`:188` `isSerialPendingEdit`), yani "stoktan seçilmeden" durumu düzenlemede de var (R7/2a).

**Ölçüm 23, `partiDamgala` formdaki değeri korur.** `satisKaydi.js:37`:
`if (!kayit || kayit.partiId != null || stokSatiri?.partiId == null) return kayit;` Yani formda bir parti varsa stok satırının
partisi **hiç yazılmaz**, form kazanır. R7/2'nin ilk hâli bunun tersini söylüyordu; seçici temizlenmezse kullanıcı önce parti
seçip sonra stoktan makina seçince makinanın gerçek partisi sessizce kaybolurdu (R7/2b).

**Ölçüm 24, kanıt kaydı altı satır ve hepsi "ayni".** `docs/evidence/kanit-eslemesi.json`'da
`src/components/stock/MakinaStokTab.jsx` için altı kayıt var (`0015-taban`: `makina-stok-formu`; `0016-taban`: `stok-alt-sekme`,
`stok-bos`; `0022-taban`: `stok-makina-parti`; `0065`: `stok-alt-sekme`, `makina-stok-formu`), hepsi `beklenen: "ayni"`. Durum
sütunu, süzgeç çubuğu, özet satırı ve penceredeki yeni alan bunların üçünü bilinçli olarak değiştirir ve
`tests/kanit-eslemesi.test.js` kırılır. `Dashboard.jsx` sözlüğü içe almıyor, onun kaydı gerekmez (0052 emsali).

**Ölçüm 25, karışık sürümde durum kaybolmaz.** Okuma yayılmalı olduğu için güncellenmemiş istemci alanı tanımadan taşır; düzenleme
formu da kaydı yayarak açıyor (`MakinaStokTab.jsx:42`) ve bütün formu geri yazıyor (`:87`). Yani eski istemcinin kaydı mevcut
durumu korur. Tek etki: eski istemciden **eklenen** makina durumsuz doğar ve R2'nin aksine satışa hazır görünür. Veri kaybı yok,
sunucu PC'yi önce güncelleme zorunluluğu yok (Karar 20).

**Ölçüm 26, planlanan adet bugün yalnız maliyet sekmesinde görünüyor.** `App.jsx:1514` parti listesini Makina Maliyeti ekranına
`maliyetYetki ? liveUretimPartileri : []` ile veriyor ve planlanan adetler (0088) o ekranın verisi. Pano `giderYetki`'ye bağlanınca
gider yetkisi olup maliyet sekmesi olmayan kullanıcı planlanan adedi görür; bu küçük açılma Karar 11'de yazılı.
---

## Kararlar

On kararın tamamı Takım Yöneticisi tarafından **2026-10-21'de** onaylandı: ilk yedisi isteğin kendisiyle ve beş sorunun cevabıyla belirlendi, son üçü öneri olarak sunuldu ve aynı gün onaylandı.

**Karar 1 (onaylandı): montajdaki makina satılabilir, satış listesinde durumuyla görünür.** Ön siparişin tanımı budur. Reddedilenin bedeli: montajdakiler listeden çıkarılırsa ön sipariş yine stok satırı olmadan yapılır ve makina partiye bağlanmaz (ölçüm 4).

**Karar 2 (onaylandı): Anasayfa kutusunun büyük sayısı satışa hazır adedidir, montajda olanlar ayrı yazılır.** Gerekçe: bugünkü sayı satılabilir makinayı anlatıyor; aynı kutuda anlamı sessizce genişletmek eski raporla yeni rakamı karşılaştıran kişiyi yanıltır. Reddedilen: büyük sayıyı stoktaki toplam bırakmak.

**Karar 3 (onaylandı): montajdaki makina makina maliyeti hesabına girmeye devam eder.** Gerekçe: parçaları zaten düşülmüş (ölçüm 3) ve bugün de giriyor; bu soruda davranış değişmemelidir.

**Karar 4 (onaylandı): durum elle değişir.** Reddedilen: seri no atanması gibi bir ölçüde otomatik geçiş; bedeli, gerçekte montajı bitmemiş makinanın satışa hazır görünmesi.

**Karar 5 (onaylandı): yeni makina Montajda doğar, bugünkü kayıtlar satışa hazır sayılır.** Gerekçe: göç yapılmadan bugünkü ekran birebir korunur.

**Karar 6 (onaylandı): partisi kapanmış ve hâlâ stokta duran makina rozet alır.** Takım Yöneticisi'nin 2026-10-21 isteği. Ölçüt uygulamanın tek "kapanmış parti" kuralıdır (ölçüm 7), rozet türetilir ve saklanmaz.

**Karar 7 (onaylandı): Anasayfa kutusu ve penceresi model kırılımı gösterir.** Takım Yöneticisi'nin 2026-10-21 isteği: "satışa hazır AK100_DS şu adet".

**Karar 8 (onaylandı): kutuda en çok üç model, tamamı pencerede.** Gerekçe ölçüm 9: kutu beş sütunlu ızgaranın bir hücresi, uzun liste ızgarayı bozar. Reddedilen: bütün modelleri kutuya yazmak.

**Karar 9 (onaylandı): model satırları satışa hazır adedine göre sıralanır.** Gerekçe: ekranın cevapladığı soru "hangi modelden satabilirim". Reddedilen: alfabetik sıra; bedeli, çok modelli katalogda aranan satırın aşağıda kalması.

**Karar 10 (onaylandı): stok satırı olmadan yapılan satış da partiye bağlanabilsin.** Ölçüm 4'teki boşluk: montajdayken satılan makina stok satırı üzerinden gitmezse partiye hiç bağlanmıyor ve partinin satılan adedinde görünmüyor. Önerim, satış formunda stoktan seçim yapılmadığında parti seçilebilmesi. Reddedilenin bedeli: pano "5 satıldı" derken Parti Hesabı aynı 5 makinayı görmemeye devam eder. Karar R7/2'de; seçim isteğe bağlıdır, boş bırakılan satış bugünkü gibi partisiz kalır ve hiçbir eski kayıt değişmez.

### QA turu kararları (2026-10-21)

Aşağıdaki on iki karar, bir geliştirici başlamadan önce cevapsız kalan sorulardan doğdu ve aynı gün onaylandı.

**Karar 11 (onaylandı): panonun kapısı `giderYetki`, `maliyetYetki` değil.** Gerekçe: pano bir stok sorusudur, para göstermez (R23)
ve Stok sekmesinin içindedir; kullanıcıyı ikinci bir sekme izni istemeye zorlamak isteği karşılamaz. Bedeli ölçüldü: gider yetkisi
olup maliyet sekmesi olmayan kullanıcı, bugün yalnız Makina Maliyeti'nde görünen planlanan adetleri panoda görür (ölçüm 26). Bu
küçük açılma kabul edildi, çünkü planlanan adet para değildir. *Reddedilen:* `maliyetYetki`; panoyu Stok'ta çizip Makina Maliyeti
iznine bağlamak kullanıcıya açıklanamaz.

**Karar 12 (onaylandı): alan `stock[].uretimDurumu`, değerler `"montaj"` ve `"hazir"`, ikisi de saklanır.** Gerekçe: 0096'nın
`hammaddeler`'i, 0097'nin `maliyetGecmisi`'si ve 0091'in `uretimdeOlmayanModeller`'i hepsi anahtarı ve değer kümesini spec'te
sabitledi. "Hazır" yokluk sayılırsa kullanıcının bilinçli seçimi ile hiç dokunulmamış eski kayıt veride ayırt edilemez ve AC-2 ile
AC-43 aynı gövdeyi ölçer. *Reddedilen:* ekrandaki Türkçe adı değer olarak saklamak; 0091'in dersi (birebir dize karşılaştırması,
Türkçe küçültme yok) bunu kırılgan kılıyor ve ad değişirse veri taşıma gerekir.

**Karar 13 (onaylandı): stok okuması yeni alanı ayıklar.** Gerekçe ölçüm 13: bugünkü okuma `SELECT *` artı yayılma, yani alan
ayıklanmazsa C2'nin "bugünkü kayıtların gövdesi değişmez" iddiası ilk günden çöker ve güncellenmemiş istemcinin gövdesi sunucu
karşılaştırmasında değişmiş görünür. *Reddedilen:* yayılmayı bırakıp C2'yi gevşetmek.

**Karar 14 (onaylandı): stoktan seçim varken parti seçicisi çizilmez ve seçilmiş değer kayda girmez.** Gerekçe ölçüm 23:
`partiDamgala` formdaki değeri koruduğu için, seçici açık kalırsa makinanın gerçek partisi sessizce kaybolur. *Reddedilen:*
`partiDamgala`'yı tersine çevirmek (0022 ve 0097'nin okuduğu bütün parti bağlarını etkiler, X1'in uyardığı sınıftan yan etki) ya da
çakışmada kullanıcıya tercih sormak (ön sipariş akışına üçüncü karar penceresi, X7'ye aykırı).

**Karar 15 (onaylandı): kutu `StatCard`'ın yeni yuvasıyla çizilir, etiketi değişir ve gezinme pencereye taşınır.** Üç parça
birlikte onaylandı: (a) `StatCard` isteğe bağlı ek satır yuvası alır, yuva boşken bugünkü çizim birebir aynı kalır; (b) etiket
"Satışa Hazır Makina" olur, çünkü Karar 2 büyük sayının anlamını değiştiriyor ve aynı etiket altında bırakmak eski raporla yeni
rakamı karşılaştıran kişiyi yanıltır; (c) pencerenin altına "Stokta Görüntüle" düğmesi girer, böylece kutunun bugünkü Stok sekmesine
gitme davranışı kaybolmaz. İlk satırın yeni yüksekliği ve aynı satırdaki dört kutunun uzaması (ölçüm 19) kanıt ekranıyla sunulur.
*Reddedilen:* kutuyu ızgaradan çıkarıp altına kendi şeridine almak; on kutunun 5 × 2 düzeni bozulur.

**Karar 16 (onaylandı): serisiz satış satışa hazır makinayı önceler ve seçenek metni kırılımı yazar.** Gerekçe ölçüm 21: bugün
dizinin ilki düşüyor ve yeni makina başa eklendiği için montajda doğan makina daha eski satışa hazır makinadan önce tüketilir.
*Reddedilen:* her serisiz makinayı ayrı seçenek yapmak; seri numarası olmadığı için seçenekler ayırt edilemez.

**Karar 17 (onaylandı): özet satırı süzgeçsiz sayar, süzgeç rozetleri süzgeçli sayar.** Gerekçe: aynı ekranda iki ayrı anlamda sayı
olacak; yazılı olmazsa geliştirici ikisini aynı kaynaktan besler ve ya Anasayfa tutmaz (AC-37) ya da süzgeç rozetleri yanlış sayar
(AC-8). *Reddedilen:* tek bir sayı kümesi; o zaman model süzgeci açıkken özet satırı Anasayfa ile tutmaz.

**Karar 18 (onaylandı): rozet renkleri Montajda mor, Satışa hazır yeşil, Önceki partiden mavi.** Gerekçe ölçüm 14: amber, aynı
satırdaki Model rozetinin rengidir; üç adayın kontrastı iki temada da AA üstünde ölçüldü, yani yeni tema değişkeni gerekmiyor.
*Reddedilen:* Montajda için amber kullanmak.

**Karar 19 (onaylandı): motor tek `veri` nesnesi alır, iki fonksiyon dışa verir.** `stokDurumOzeti(veri)` ve
`partiUretimOzeti(veri, partiId)`; `veri` yalnız canlı diziler taşır. Gerekçe: 0090 ve 0092'nin emsali ve C1'in "ekranlar saymaz"
kuralı ancak imza sabitlenirse ölçülebilir. *Reddedilen:* ekranların diziyi kendi süzüp motora hazır küme vermesi; 0093'ün dersi
(motora süzülmüş liste verilirse hesap sessizce sıfırlanır).

**Karar 20 (onaylandı): kanıt ve kayıt borçları DoD'ye yazılır.** Dört borç: `kanit-eslemesi.json`'ın üç kaydı (ölçüm 24), spec
öncesi gövde fikstürü, `suzgec-kaynak` taramasının ekran listesi (ölçüm 18) ve karışık sürüm notu (ölçüm 25). Gerekçe: 0099'un aynı
bulgusu; kayıt güncellenmezse iş bitince test kırmızı kalır ve "görünüm bilinçli değişti" onayı hiç alınmamış olur.

**Karar 21 (onaylandı): satış formundaki parti seçicisi gider yetkisi ister.** Gerekçe ölçüm 22: üretim tarihi alanı da aynı
kapıda ve parti adı bütün uygulamada yalnız gider yetkisine açık (R11). Kapı yazılmazsa satış yapan kullanıcı parti adlarını görür
ve uygulamanın bugüne kadar koruduğu tek kural bu formda sessizce kırılır. Seçici yalnız stok seçicisinin çizildiği iki kipte
görünür; satılmış kaydın partisinin düzeltilmesi X8.

**Karar 22 (onaylandı): plandan fazla üretim kırpması model satırında yapılır.** Toplam kalan, kırpılmış model kalanlarının
toplamıdır. Gerekçe: kullanıcının sorusu "hangi modelden kaç tane daha üretmem lazım"; toplamdan kırpma yapılırsa fazla üretilen
model, eksik üretileni maskeler. *Reddedilen:* toplam planlanan eksi toplam üretilen.

---

## Acceptance Criteria

- **AC-1.** Stoğa yeni eklenen makina Montajda durumuyla kaydedilir ve gövdesinde `uretimDurumu: "montaj"` bulunur.
- **AC-2.** Durumu olmayan bir kayıt listede Satışa hazır gösterilir ve kaydı açılıp dokunulmadan kaydedildiğinde gövdesine durum yazılmaz.
- **AC-3.** Düzenleme penceresinden Satışa hazır seçilip kaydedilen makina listede yeşil Satışa hazır rozetiyle görünür ve gövdesine `"hazir"` yazılır.
- **AC-4.** Durum sütunu Model sütununun hemen sağındadır ve tablo altı sütuna çıkar.
- **AC-5.** Durum rozeti rengiyle birlikte adını da yazar.
- **AC-6.** Durum süzgecinde Montajda seçilince listede yalnız montajdaki makinalar kalır.
- **AC-7.** Durum süzgeci ile model süzgeci birlikte uygulanır.
- **AC-8.** Süzgeç rozetlerindeki sayı, arama ve model süzgeci uygulanmış kümede o süzgeç seçilince listelenecek makina sayısıdır; sayfalanmamış listenin tamamını sayar.
- **AC-9.** Arama, model ya da durum süzgecinden boş dönen listede "Aramanıza uyan makina yok." kutusu çıkar; stok bütünüyle boşken "Stokta makina yok." kutusu çıkar.
- **AC-10.** Özet satırı süzgeçsiz bütün canlı stoğun toplam, montajda, satışa hazır ve önceki partiden kalan sayılarını yazar; model süzgeci uygulandığında bu sayılar değişmez.
- **AC-11.** Partisi kapanmış bir partiye bağlı stok makinası "Önceki partiden kaldı" rozeti taşır.
- **AC-12.** Partisi açık olan makina bu rozeti taşımaz.
- **AC-13.** Partisi olmayan makina bu rozeti taşımaz.
- **AC-14.** Partisi çöp kutusunda olan makina bu rozeti taşımaz.
- **AC-15.** Parti yeniden açıldığında (bitiş ayı silindiğinde) rozet kaydedilmiş hiçbir şey değişmeden kalkar.
- **AC-16.** Rozet parti adını yazmaz; gider yetkisi olmayan kullanıcıda da görünür ve o kullanıcıda parti adı satırı bugünkü gibi çizilmez.
- **AC-17.** Partisi kapanmış ve montajı bitmemiş makina iki işareti birden taşır.
- **AC-18.** Müşteri ekleme formunun stoktan seçim listesinde **serili** montajdaki makina durumuyla birlikte görünür ve seçilebilir.
- **AC-19.** Montajdaki makina satıldığında stok satırı bugünkü gibi düşer ve müşteri kaydı partiyi ve üretim tarihini taşır.
- **AC-20.** Durumu değişen makina için makina maliyeti sonucu (makina başına maliyet ve parti payı) değişmez.
- **AC-21.** Parti Üretim Panosu seçilen parti için planlanan, montajda, satışa hazır, satıldı ve kalan sayılarını verir.
- **AC-22.** Panoda satılan adet partiye bağlı canlı müşteri kayıtlarından gelir; ikinci el devir almış makina bir kez sayılır.
- **AC-23.** Planlanandan fazla üretilmiş partide kalan sıfır yazılır ve satır işaretlenir.
- **AC-24.** Planlanan adedi girilmemiş modelin satırı üretilen makinalardan çizilir.
- **AC-25.** Hiç makinası ve planı olmayan partide pano boş durum kutusu gösterir.
- **AC-26.** Gider yetkisi olmayan kullanıcı Parti Üretim Panosu alt sekmesini görmez.
- **AC-27.** Panoda hiçbir para tutarı yazmaz.
- **AC-28.** Anasayfa kutusunun büyük sayısı satışa hazır makina adedidir.
- **AC-29.** Kutunun alt satırı montajdaki adedi ve önceki partiden kalan adedi yazar.
- **AC-30.** Kutuda en çok üç model satırı çizilir ve kalan model sayısı belirtilir.
- **AC-31.** Üçten az modeli olan stokta kalan model sayısı satırı çizilmez.
- **AC-32.** Kutuya tıklanınca açılan pencere model başına satışa hazır, montajda ve önceki partiden sayılarını ve toplam satırını gösterir.
- **AC-33.** Pencere örtüşmeyi yazan cümleyi gösterir.
- **AC-34.** Kutudaki sayılarla penceredeki toplam satırı birebir aynıdır.
- **AC-35.** Stokta hiç makina yokken kutu sıfır yazar ve pencere boş durum gösterir.
- **AC-36.** Gider yetkisi olmayan kullanıcı kutuyu ve pencereyi bugünkü gibi görür; ikisinde de parti adı geçmez.
- **AC-37.** Stok ekranı, pano ve Anasayfa aynı motor fonksiyonunu çağırır; çağrı casusu üç yerde de kendi hesabını yazan bir kod bulamaz.
- **AC-37/2.** Bütün stoğun tek partiye bağlı olduğu veride panonun montajda ve satışa hazır sayıları, stok özet satırıyla ve Anasayfa kutusuyla birebir eşittir.
- **AC-38.** Yeni alan veritabanına yazılıp geri okunur; boş durumlu kayıt gövdesinde alan bulunmaz.
- **AC-39.** Stoktan makina seçilmeden açılan satışta üretim partisi seçicisi çizilir ve seçilen parti kayda yazılır.
- **AC-40.** Parti seçilmeden kaydedilen satış partisiz kalır ve gövdesine parti alanı yazılmaz.
- **AC-41.** Stok satırı olmadan satılıp partisi seçilen makina, panonun o partideki satılan adedine girer.
- **AC-42.** Stoktan seçilerek satılan makinanın partisi stok satırından gelir; formda önceden seçilmiş bir parti varsa bile onu ezmez (seçici çizilmez ve değer kayda girmez, AC-54).
- **AC-43.** Durumu açıkça Satışa hazır seçilen kaydın gövdesinde `uretimDurumu` bulunur, hiç dokunulmamış durumsuz kaydın gövdesinde bulunmaz; ikisi listede aynı rozetle görünür.
- **AC-44.** Durumsuz bir kaydın başka bir alanı (not, seri no) değiştirilip kaydedildiğinde gövdesine durum yazılmaz.
- **AC-45.** Durumu olmayan stok satırlarının gövdesi spec öncesi gövde fikstürüyle (`tests/fixtures/0100-govde-once.json`) birebir aynıdır; okuma yeni alanı ayıklar.
- **AC-46.** Durum süzgeci değiştirildiğinde liste birinci sayfaya döner.
- **AC-47.** Durum süzgecinden boş dönen listede "Aramanıza uyan makina yok." kutusu çıkar.
- **AC-48.** Durum süzgeci çubuğu sözlükteki segmentli seçicinin düğme kipinden gelir ve her seçeneğin erişilebilir adı "Etiket (n)" biçimindedir.
- **AC-49.** Üç rozetin renkleri tema değişkenlerinden gelir, hiçbiri sabit renk yazmaz ve üç çift karanlık temada AA eşiğini geçer.
- **AC-50.** `partiId` dolu ama kaydı canlı parti listesinde bulunamayan makina "Önceki partiden kaldı" rozeti taşımaz.
- **AC-51.** Aynı modelde serisiz satışa hazır ve serisiz montajda makina varken serisiz satış, satışa hazır olanların en eskisini düşer.
- **AC-52.** Serisiz stok seçeneğinin metni durum kırılımını yazar.
- **AC-53.** Gider yetkisi olmayan kullanıcıda satış formunda üretim partisi seçicisi çizilmez.
- **AC-54.** Stoktan bir makina seçildiğinde parti seçicisi çizilmez ve daha önce seçilmiş parti kayda girmez.
- **AC-55.** Bir modelde plandan fazla üretildiğinde o model satırının kalanı sıfır yazar ve satır işaretlenir; toplam satırı da işaretlenir ve toplam kalan, eksik üretilen diğer modelin kalanını gösterir.
- **AC-56.** Pano açılışta en son başlayan açık partiyi seçer; hiç canlı parti yokken seçici yerine boş durum kutusu çıkar.
- **AC-57.** Panonun model satırları planlanan adede göre azalan sıralanır ve modeli boş olan makina "model girilmemiş" satırında sayılır.
- **AC-58.** Anasayfa kutusunun etiketi büyük sayının anlamını söyler ve kutuda yalnız satışa hazır adedi sıfırdan büyük modeller listelenir.
- **AC-59.** Anasayfa penceresindeki "Stokta Görüntüle" düğmesi Stok ekranını açar.
- **AC-60.** Anasayfa parti listesini gider yetkisi olmadan da alır; ne kutuda ne pencerede parti adı geçer ve prop verilmediğinde kutu bugünkü gibi çizilir.
- **AC-61.** `StatCard`'ın ek satır yuvası verilmediğinde kartın çizimi değişmez; Anasayfa'nın diğer dokuz kutusu birebir aynı kalır.
- **AC-62.** Yeni motor "kapanmış parti" için `partiAcikMi`'yi çağırır; kaynakta yeni bir `!p.bitisAy` karşılaştırması yoktur.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Sayma işi saf motorda yazıldı ve kendi testi var; arayüz yalnız gösteriyor.
- [x] Aynı sayıyı gösteren üç yer (stok başlığı, pano, Anasayfa) aynı motoru çağırıyor (AC-37).
- [x] Yeni kalıcı alan dört nokta kuralıyla yazıldı ve `db-roundtrip` ile `db-clean-install` testlerine eklendi.
- [x] Okuma ayıklamalı yazıldı ve durumu olmayan satırların gövdesi spec öncesi fikstürle (`tests/fixtures/0100-govde-once.json`) birebir karşılaştırıldı (AC-45).
- [x] Motorun imzası tek `veri` nesnesi (R31/2) ve üç çağıranın aynı fonksiyonu çağırdığı çağrı casusuyla ölçüldü (AC-37).
- [x] Yeni motor `partiAcikMi`'yi çağırıyor, kaynakta ikinci bir `!p.bitisAy` yok (AC-62); 0090'daki kopya bilinen borç olarak yazıldı (X9).
- [x] Yeni veri bölümü **yok**; birleştirme kuralı değişmedi, bu açıkça yazıldı.
- [x] Yeni eylem izni **yok**; durum yazımı stok makina düzenleme iznine bağlı ve sunucu tarafı değişmedi, bu açıkça yazıldı.
- [x] Soft-delete ve çöp kutusu ilişkisi değişmedi.
- [x] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı yok.
- [x] Para gösterimi yok; pano para göstermiyor (AC-27).
- [x] Renkler tema değişkenlerinden geliyor ve karanlık temada kontrast testi geçiyor; üç rozet çifti (`pur700`/`purBg`, `grn700`/`grnBg`, `blu700`/`bluBg`) `tests/tasarim-kontrast.test.js`'in 0030 bloğuna **dosya adıyla** eklendi (AC-49).
- [x] `tests/suzgec-kaynak.test.js`'in ekran listesine `src/components/stock/MakinaStokTab.jsx` eklendi ve durum süzgeci sözlükten geliyor (AC-48).
- [x] `StatCard`'ın yeni yuvası isteğe bağlı ve verilmediğinde çizim değişmiyor (AC-61); kutunun yeni yüksekliğinin aynı satırdaki dört kutuya etkisi kanıt ekranıyla sunuldu (ölçüm 19).
- [x] Anasayfa parti listesini kapısız alıyor, parti adını çizmediği kaynak taramasıyla sabitlendi (AC-60, R30/2).
- [x] Arayüz kriterlerinin görsel kanıtı eklendi: durumlu liste, süzgeçli liste, boş durum, pano, boş pano, Anasayfa kutusu ve penceresi, düzenleme penceresi. Kanıt aracına beş yeni ekran girdi: `stok-0100-durum-suzgec`, `stok-0100-pano`, `stok-0100-pano-bos`, `anasayfa-0100-kutu`, `anasayfa-0100-pencere`; plan onayı P1 ile: kutunun etiketi değiştiği için kanıt aracında Anasayfa'yı çizen yedi ekranın hepsi değişir (eşleme kaydı yok, raporda bilinçli değişiklik olarak gösterilir).
- [x] `docs/evidence/kanit-eslemesi.json`: `MakinaStokTab.jsx`'in üç kaydı (`stok-alt-sekme`, `stok-makina-parti`, `makina-stok-formu`) `beklenen: "degisti"` + `onay` ile güncellendi (ölçüm 24) ve spec `done`'a taşınırken `ayni`ye çevrildi; pano bileşeni için yeni kayıt eklendi (`Dashboard.jsx` sözlüğü kullanmadığı için onun kaydı yok).
- [x] 0079 ve 0095 kıyas testlerinin Anasayfa bölümü "spec 0100 ile" notuyla güncellendi: iki kıyas da Dashboard'a boş stok verdiği için kırılmanın tek koşulu kutunun etiketidir (ölçüm 12), `anasayfa` anahtarındaki kutu metni düzenli ifadeyle ayıklandı ve testlerin asıl iddiası korundu.
- [x] Karışık sürüm notu plana yazıldı: güncellenmemiş bilgisayardan eklenen makina Montajda doğmaz, satışa hazır görünür ve elle düzeltilir (ölçüm 25). Veri kaybı yok, yazma sırası zorunlu değil.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` yeni alan, yeni ekran ve durum kuralıyla güncellendi.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Ters çevrilen kriterler

| Eski kriter | Bugünkü hâli | Bu spec'ten sonra |
|---|---|---|
| 0079 ekran kıyası (`tests/ui/satis-tevkifat-0079-ekran.test.jsx:40`, Anasayfa bölümü) | Anasayfa'nın metni tevkifat işinden önceki hâliyle birebir aynı; Dashboard'a `stock={[]}` veriliyor | Kutunun **etiketi** değiştiği için kırılır (ölçüm 12); kutu metni `anasayfa` anahtarından düzenli ifadeyle ayıklanır ve ayıklama "spec 0100 ile" notunu taşır; testin asıl iddiası (tevkifat ekranı değiştirmedi) korunur |
| 0095 ekran kıyası (`tests/ui/ucretsiz-yedek-parca-0095-kiyas.test.jsx:40`, Anasayfa bölümü) | Aynı | Aynı ayıklama, aynı not |
| `docs/evidence/kanit-eslemesi.json`, `MakinaStokTab.jsx`'in üç kaydı | Altı kaydın hepsi `beklenen: "ayni"` (ölçüm 24) | `stok-alt-sekme`, `stok-makina-parti` ve `makina-stok-formu` `beklenen: "degisti"` + `onay` olur; spec `done`'a taşınırken `ayni`ye çevrilir. `stok-bos` **ayni** kalır (boş stokta yeni sütun ve süzgeç çizilmez) |
| `tests/suzgec-kaynak.test.js` ekran listesi | Yedi ekran dosyası ve `YedekParcaSatisTab.jsx`; `MakinaStokTab.jsx` taranmıyor (ölçüm 18) | `stock/MakinaStokTab.jsx` da taranır, yani yeni durum çubuğu sözlükten gelmek zorunda |
| `tests/tasarim-kontrast.test.js` 0030 bloğu | Yedi metin ve iki kenarlık çifti | Üç rozet çifti `MakinaStokTab.jsx` adıyla eklenir (AC-49) |
| C5'in "kapanmış parti ölçütü tek yerde" önermesi | Yanlış: iki kopya var (ölçüm 7) | C5 "yeni motor `partiAcikMi`'yi çağırır" kuralına daraltılır, 0090'ın kopyası X9 |
| AC-37'nin "üç yerin sayıları birbirini tutar" iddiası | Pano parti bazlı olduğu için ölçülemez | İkiye ayrılır: aynı motoru çağırma (AC-37) ve tek partili veride eşitlik (AC-37/2) |
| 0016 liste birliği, boş durum kuralı | Stokta tek boş durum kutusu | **Korunur**; süzgeçten boş dönen liste ile boş stok ayrı metinler, ikisi de aynı kutu bileşeni (AC-9) |
| 0022 parti bağı ve 0090 parti payları | Makina listesi ve paylar stok satırından okunuyor | **Korunur**; durum alanı bu zincire hiç girmiyor (AC-20) |

---

## Plan onayı (revizyon 3, 2026-10-21)

Takım Yöneticisi uygulama planının on beş önerisini 2026-10-21'de onayladı. Spec'e işlenenler:

| # | Öneri | Etkilediği madde |
|---|---|---|
| P1 | **Ölçüm 12 düzeltmesi:** kutunun etiketi ve alt satırı değiştiği için kanıt aracında Anasayfa'yı çizen **yedi** ekranın hepsi değişir (hiçbiri `kanit-eslemesi.json`'da kayıtlı değil, test kırmaz; rapor bilinçli değişiklik olarak gösterir). İki kıyas fikstüründe ayıklanacak anahtar dosya başına üçtür (`anasayfa`, `anasayfa:Borçlu Firma`, `anasayfa:Borçlu Bayi/Servis`), üçü aynı düzenli ifadeyle | Ölçüm 12, DoD |
| P2 | `useFilteredList` isteğe bağlı `ikinciFiltre` alır ve ondan önceki kümeyi `oncesi` olarak da döndürür (parametresiz çağrı birebir eski). Durum süzgeci kancanın süzmesine `ikinciFiltre` ile girer ve değişince birinci sayfaya döner; süzgeç rozetlerinin sayıları motora `oncesi` verilerek alınır (arama mantığı tek yerde kalır) | R15/3, R15/4 |
| P3 | Serisiz düşümde "en eskisi": `addedDate` artan, eşitlikte dizide daha sonra duran satır (kimlikler sıralı değil; yeni makina başa eklenir). Satış formunun kit ön doldurması da aynı motor seçimini kullanır | R6/3 |
| P4 | **Var olan hata:** serisiz düşümün `setStock` güncelleyicisi TAM dizide `findIndex` yapıyordu; çöpte aynı modelden serisiz satır öndeyse silinen o oluyordu. Düşüm motorun seçtiği satırın kimliğiyle yapılır ve hatayı yakalayan test spec öncesi kodda kırmızı gösterilir | R6/3 |
| P5 | Formdaki seçici `Segment kip="dugme"`, etiket "Üretim durumu"; ekleme formu `uretimDurumu: "montaj"` ile açılır, düzenlemede değer `uretimDurumuOf(form)` ile gösterilir ve alan yalnız seçiciye dokunulunca yazılır | R2, R4/2 |
| P6 | Yazma kuralı ekrandadır (yalnız iki değer yazılır); veritabanı okuması boş olmayan her değeri korur, ekran tanınmayanı `uretimDurumuOf` ile satışa hazır sayar (ileride gelecek bir değeri eski istemci silmesin) | R1/2, C2 |
| P7 | Rozet renkleri `MakinaStokTab.jsx`'in içinde `var(--ad, #aydınlık)` biçimiyle (kontrast testinin dosya denetimi bu biçimi arar; yedek değerler `theme.js`'in aydınlık değerleri) | R14/2, C7 |
| P8 | Pano sekmesi "Makina Stoğu"nun hemen arkasında; kanıt aracının gider yetkisiz `stokEkrani` ekranlarında çizilmez | R18 |
| P9 | Pano açılışı: `baslangicAy`'a göre en son başlayan açık parti; açık parti yoksa en son başlayan canlı parti; eşitlikte ad | R18/2 |
| P10 | AC-25'in boş durumu aynı `bos-parti-panosu` kimliğiyle ikinci metindir (0016 emsali): "Henüz üretim partisi yok." ve "Bu partide plan ve makina yok." | R18/2, AC-25 |
| P11 | Model anahtarı `trLower`; görünen ad varsa planlanan adetteki ad, yoksa o modelin ilk stok satırındaki ad; modelsiz makina "model girilmemiş" | R19/3, R26 |
| P12 | Kutunun alt satırı stok boşken de yazılır ("0 montajda · 0 önceki partiden"); model satırları ve "n model daha" çizilmez; `sub` alt satırı, yeni `ek` yuvası model satırlarını taşır; "Görmek için tıkla" kalkar, kutu pencereyi açar | R25–R27/2, AC-35 |
| P13 | Satış formundaki parti seçicisi bütün canlı partileri listeler (açıklar "(açık)" ekiyle); boş seçim alanı kayıttan siler; stoktan seçimde parti yalnız stok satırından gelir (satırın partisi yoksa anahtar silinir); seri no bekleyen düzenlemede mevcut parti gösterilir | R7/2–R7/2b |
| P14 | Müşteri formunun kanıt görüntüleri taban turunda ölçülür; liste dışı değişiklik çıkarsa uygulamadan önce TY'ye getirilir | DoD |
| P15 | AC-37 çağrı casusu 0092 deseniyle (`vi.mock`) gerçek App'te | AC-37 |

---

## Karar kaydı (QA turu 2026-10-21)

Yirmi yedi bulgunun tamamı onaylandı ve spec'e işlendi.

| # | Derece | Bulgu | Karar | Nereye girdi |
|---|---|---|---|---|
| B-1 | Bloklayıcı | Alanın adı ve iki değerin kodlaması tanımsız; "hazır" saklanıyor mu yoksa yokluk mu | Alan `stock[].uretimDurumu`, değerler `"montaj"` ve `"hazir"`, ikisi de saklanır; tek okuma yolu `uretimDurumuOf` | R1, R1/2, R3/2, Karar 12, AC-1, AC-3, AC-43 |
| B-2 | Bloklayıcı | Stok okuması `SELECT *` artı yayılma; yeni sütun her satıra null girer ve C2 çöker | Okuma ayıklamalı yazılır, gövde fikstürüyle ölçülür | C2, Karar 13, ölçüm 13, AC-45 |
| B-3 | Bloklayıcı | R7/2 ve AC-42, `partiDamgala`'nın ölçülen davranışının tersi; makinanın gerçek partisi kaybolur | Stoktan seçim varken seçici çizilmez ve değer kayda girmez; `partiDamgala`'ya dokunulmaz | R7/2b, Karar 14, ölçüm 23, AC-42, AC-54 |
| B-4 | Bloklayıcı | `StatCard`'ın ek satır yuvası yok, ızgara satırı uzar, pencere bugünkü gezinmeyi yutar | Yuva eklenir (boşken çizim aynı), etiket değişir, pencereye "Stokta Görüntüle" girer | R25/2, R25/3, R27/2, C12, Karar 15, ölçüm 19, AC-58, AC-59, AC-61 |
| Ö-1 | Önemli | Ölçüm 12 yanlış: iki kıyas testi Anasayfa'yı boş stokla çiziyor, kırılma yalnız etikete bağlı | Ölçüm düzeltildi, etiket kararı verildi, DoD maddesi koşuluyla yazıldı | Ölçüm 12, R25/2, DoD, ters çevrilen kriterler |
| Ö-2 | Önemli | C5 ve ölçüm 7 yanlış: "kapanmış parti" ölçütünün bugün iki kopyası var | C5 daraltıldı, 0090'ın kopyası kapsam dışı, yeni motor `partiAcikMi` çağırır | C5, R9/2, X9, ölçüm 7, AC-62 |
| Ö-3 | Önemli | AC-37 ölçülemez: pano parti bazlı, diğer ikisi bütün stok | İkiye ayrıldı: aynı motoru çağırma ve tek partili veride eşitlik | AC-37, AC-37/2, C11 |
| Ö-4 | Önemli | "Liste başlığı" diye bir yer yok; özet sayıları ile süzgeç sayıları aynı anlamda değil | Özet satırı süzgeçsiz, rozetler süzgeçli; yeri sabitlendi | R16, R16/2, R15/3, Karar 17, ölçüm 17, AC-8, AC-10 |
| Ö-5 | Önemli | Anasayfa parti listesini hiç almıyor, R30 kapısız istiyor | Liste kapısız verilir, ad çizilmez, taramayla sabitlenir, prop varsayılanlı | R30/2, C13, ölçüm 20, AC-60 |
| Ö-6 | Önemli | AC-18 serisiz dalda ölçülemez; serisiz satış dizinin ilkini, yani montajda doğanı düşüyor | Durum yalnız serili seçenekte; serisiz metin kırılımı yazar; düşüm satışa hazırı önceler | R6/2, R6/3, Karar 16, ölçüm 21, AC-18, AC-51, AC-52 |
| Ö-7 | Önemli | Kanıt kaydı borcu: altı kaydın hepsi "ayni", üçü değişecek; pano kendi kaydını ister | Üç kayıt "degisti" + onay, pano için yeni kayıt, beş yeni ekran | DoD, ölçüm 24, ters çevrilen kriterler |
| Ö-8 | Önemli | C2'nin "gövde değişmez" iddiasının kanıtı yok | Spec öncesi gövde fikstürü DoD'ye girdi (0096 ve 0097 emsali) | C2, DoD, AC-45 |
| Ö-9 | Önemli | R15 süzgecinin bileşeni yazılmamış; `suzgec-kaynak` taraması bu dosyayı görmüyor | `Segment` `kip="dugme"`, `sayi` rozeti, erişilebilir ad; tarama listesine dosya eklenir | R15/2, ölçüm 18, DoD, AC-48 |
| Ö-10 | Önemli | Satış formundaki parti seçicisinin yetkisi ve düzenleme kipi tanımsız | Yalnız gider yetkisiyle ve yalnız stok seçicisinin iki kipinde; satılmış kaydın düzeltilmesi kapsam dışı | R7/2a, R7/3, X8, C13, Karar 21, ölçüm 22, AC-53 |
| Ö-11 | Önemli | Rozet renkleri seçilmemiş ve en doğal seçim Model rozetiyle çakışıyor | Mor, yeşil, mavi; ölçülen kontrastlar spec'te; 0030 bloğuna dosya adıyla eklenir | R14/2, C7, Karar 18, ölçüm 14, AC-49 |
| Ö-12 | Önemli | Karışık sürüm notu yok | Ölçüldü: durum kaybolmaz, tek etki eski istemciden eklenen makinanın durumsuz doğması; sürüm notu plana | Ölçüm 25, Karar 20, DoD |
| Ö-13 | Önemli | Motorun imzası, aldığı diziler ve dönüşü tanımsız | Tek `veri` nesnesi, canlı diziler, iki fonksiyon | R31/2, C11, Karar 19, AC-37 |
| K-1 | Küçük | Durum süzgeci değişince sayfa sıfırlanmazsa süzülen liste boş görünür | Süzgeç `filterFn`'e girer, değişince birinci sayfaya döner | R15/4, ölçüm 16, AC-46 |
| K-2 | Küçük | AC-9 bugün zaten yeşil, ölçümü eksik | Ölçüm eklendi, kriter durum süzgecine bağlandı | R17/2, ölçüm 15, AC-9, AC-47 |
| K-3 | Küçük | Ölçüm 2'nin "liste dört sütun" ifadesi eksik (beşinci, boş başlıklı eylem sütunu) | Ölçüm düzeltildi, tablo altı sütun yazıldı | Ölçüm 2, R13, AC-4 |
| K-4 | Küçük | Panonun açılış seçimi ve hiç parti yokken davranışı tanımsız | En son başlayan açık parti; parti yoksa kendi boş durum kutusu | R18/2, AC-56 |
| K-5 | Küçük | AC-23: işaretlenen satır hangisi ve toplam kalan nasıl hesaplanır | Kırpma model satırında, toplam kırpılmış kalanların toplamı | R21, Karar 22, AC-55 |
| K-6 | Küçük | Panonun model eşleştirme kuralı yazılmamış | `trLower`, kataloğa eşleşme şartı yok, modelsiz makina kendi satırında | R19/3, ölçüm 10, AC-57 |
| K-7 | Küçük | Kutuya hangi modeller girer ve eşitlikte sıra ne | Yalnız satışa hazırı sıfırdan büyük modeller, eşitlikte ada göre | R26/2, AC-58 |
| K-8 | Küçük | Panonun boş durum kimliği ve model satırlarının sırası yazılmamış | `bos-parti-panosu`; planlanan adede göre azalan, eşitlikte ada göre | R18/2, R19/2, AC-56, AC-57 |
| K-9 | Küçük | C2 yalnız `db-roundtrip` diyor, DoD `db-clean-install`'ı da istiyor | C2 ikisini sayar | C2 |
| K-10 | Küçük | R22 neden `giderYetki`, `maliyetYetki` değil | `giderYetki` kalır, gerekçe ve reddedilen seçenek yazıldı; küçük açılma ölçüldü | R22, Karar 11, ölçüm 26 |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | Revizyon 2 QA turu (27 bulgu), revizyon 3 plan onayı (on beş öneri, P1–P15) |
| **Düzeltme turu sayısı** | 1 | Triyaj: 6 bulgu (2 orta, 3 düşük, 1 not) |
| **Bulgu gerçek/gürültü oranı** | 6 / 0 | Plansız modelde fazla üretim işaretsizdi (kayıtsız yorum, spec'e uyuldu); "(açık)" eki iki yeni ekranda kendi ifadesiyle; serisiz yarışta form partisi; serili düşümde çöpteki satır; pencere düğmeleri gövdede; süzgeç özeti her çizimde. Hepsi düzeltildi, her biri geri almayla ölçüldü (6/6) |
| **Regresyon sayısı** | 0 | Tam takım 392 dosya, 5.131 test yeşil (Electron dahil); 40 kanıt ekranı 0 piksel |
| **Kaçan hata** | 0 | Var olan bir hata uygulama turunda bulundu ve düzeltildi: serisiz satış çöpteki stok satırını düşebiliyordu (P4; triyajda serili kardeşi de) |

**Bu spec'ten çıkarılan ders:** Spec'in ölçümleri plan turunu geçse bile uygulamada yanlış çıkabiliyor: "iki kopya" dört, "yalnız yeni ekranlar" dokuz ekran, "üç kayıt kırılır" hiç kırılmadı. Kural: taramayı ve kanıtı ölçülen gerçeğe sabitle ve sapmayı plana yaz. İkinci ders triyajdan: spec'in açıkça söylemediği bir durum için verilen yorum (planı olmayan modelin işaretlenmemesi) kodun yorumunda kalırsa kayıtsız sapmadır; ya spec'e yazılmalı ya da yazılı kurala uyulmalı.
