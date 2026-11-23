# 0156 — Tedarikçi ekstresi: vergi kırılımı, geniş pencere ve kalemde göster

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-23) |
| **Revizyon** | 3 (2026-11-23 plan turu: P1–P7; plan `specs/0156-uygulama-plani.md`) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **QA turu** | 2026-11-23: 28 bulgu (4 Bloklayıcı / 14 Önemli / 10 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 3 (C1'in fonksiyon listesi, yönlendirme mekanizmasının hazır olduğu, R17'nin varsaydığı satırın doğduğu) |
| **Etkilenen alanlar** | Giderler (Tedarikler ve Ekstre, ekstre penceresi, kalem listesi süzgeci, yerel yönlendirme durumu), Kasa (çalışan ekstresi aynı pencere), saf motorlar `kasa.js` (`tedarikciEkstresi`, `calisanEkstresi`), `gider.js` (yeni dışa verilen vergi okuyucusu), `aramaGider.js` (süzgeç metninin kuralı), `GlobalSearch.jsx` (aynı kuralı çağırır), tasarım sözlüğünün pencere boyutu ve sayfalama kuralları, kanıt eşlemesi ve görüntü aracı, Electron yerleşim fikstürü |
| **Bağımlı spec'ler** | 0024 (ekstre), 0050 (pencere boyutu), 0062 (sayfalama), 0080 (sayfalamanın kaldırılma emsali), 0026 (kaleme süzerek açma), 0075 (tevkifat), 0076 (indirilemeyen KDV), 0153 (döviz kalem), 0021 (taksit), 0060 (hedef ve taksit adları), 0081 (katlanan başlığın klavye deseni), 0126 (iç içe tıklamada olayın durdurulması), 0125 (süzgecin elle dönüşte yeniden dolması), 0149 (süzgecin kelime bazlı eşleşmesi), 0152 (döviz ödeme), 0158 (kıyas ayıklaması emsali), 0011 (kanıt kaydı kuralı) |

---

## Intent

Muhasebe tedarikçi ekstresini tedarikçinin kendi ekstresiyle karşılaştırıyor ve bugünkü ekran bu işe yetmiyor. Borç satırı tek rakam yazıyor (tedarikçiye ödenecek tutar), yani faturanın matrahı, KDV oranı ve tutarı, kesilen tevkifat ve kira stopajı hiçbir yerde görünmüyor; dahası tevkifat vergi dairesine ödendiği için ekstrenin bakiyesine hiç girmiyor ve bu ekranda yazılı değil, yani "fatura 120.000 lira ama ekstrede 108.000 yazıyor" farkı açıklanmamış kalıyor. Pencere de dar: sayfa başına beş satır gösteriyor, yirmi bir kalemli bir tedarikçinin ekstresi on sayfaya yayılıyor ve Açıklama hücresindeki metin üç nokta ile kesiliyor. Bu iş bittiğinde ekstre tek sayfada yürüyecek, satıra tıklayınca o faturanın vergi kırılımı ve ödemeleri altında açılacak, satırdan tek düğmeyle o kalemin kendisine gidilebilecek. Ayrıntı yeni bir hesap getirmez: motorun bugünkü vergi fonksiyonları tek dışa verilen okuyucuda toplanır, ödeme listesi de aralık süzmesinden önce motorda kurulur, yani pencere yalnız çizer.

---

## Requirements

### A. Açılan ayrıntı

- **R1.** Ekstre satırına tıklanınca satırın altında ayrıntı açılır, yeniden tıklanınca kapanır. Varsayılan kapalıdır ve aynı anda birden çok satır açık olabilir.
  - **R1/2.** Açık satırların kimliği **motorun yazdığı `anahtar`**'dır: `${tur}:${kalem?.id ?? ""}:${hareket?.id ?? ""}` (avans satırında hareket kimliği). Pencere açık anahtarları bir kümede tutar ve çizim anahtarı (`key`) olarak da onu kullanır; sayfa dizinine ya da dizi sırasına bağlı anahtar yazılmaz. Devir satırı bu kümeye hiç girmez.
  - **R1/3.** Tıklanabilir satırlar: borç, maaş, ödeme, mahsup ve avans. **Devreden bakiye satırı tıklanmaz** (kalemi ve hareketi yok). Avans satırının ayrıntısı tarih, hesap ve açıklama, mahsup satırının ayrıntısı ayrıca kalem ve kapatılan hedef yazar. Ayrıntısı olmayan satır tıklanabilir görünmez (imleç ve `aria-expanded` yalnız açılan satırda).
  - **R1/4.** Satır klavyeyle de açılır: 0081 R14'ün katlanan başlık deseni uygulanır (`role="button"`, `tabIndex`, `aria-expanded`, Enter ve Space). Erişilebilir ad satırın tarih ve işlem metnidir; testler satırı bu adla sorgular.
  - **R1/5.** Satırın içindeki düğmeler ayrıntıyı tetiklemez: "Kalemde göster" ve çalışan tarafındaki avans silme düğmesi olayı durdurur (0126'nın iç içe tıklama emsali).
- **R2.** Borç satırının ayrıntısı şunları yazar: matrah, KDV oranı ve KDV tutarı, kesilen tevkifat (oranıyla), kira stopajı (oranıyla), indirilemeyen KDV (kısıtlı kalemde), kalemin kendi para birimindeki tutarı ile donmuş kuru (döviz kalemde) ve o kalemin ödemeleri.
  - **R2/2.** Ayrıntı gider formunun özet bloğuyla **aynı şekli** alır: satırlar işaretini taşır ve en sonda satırın kendi tutarıyla kapanır. Normal kalemde `Matrah + Toplam KDV − Tevkifat = Tedarikçiye ödenecek`, kirada `Brüt − Stopaj = Net`, `+ KDV = Kiraya verene ödenecek`. Köprü satırının sonucu ekstre satırının Tutar hücresine kuruşu kuruşuna eşittir.
  - **R2/3.** Döviz kalemde iki ayrı rakam vardır ve ikisi ayrı etiketle anılır: ayrıntı **kalemin kendi girilen döviz tutarını** (matrahın yanında, `kalemDovizTutarMetni`) ve donmuş kuru yazar; Tutar hücresindeki "ödenecek liranın dövize çevrilmiş hâli" (`kalemDovizMetni`) bugünkü yerinde ve biçiminde kalır.
  - **R2/4.** Oranların biçimi var olan sabitlerden okunur: KDV ve kira stopajı `%<oran>` (`kisitliRozetMetni`'nin biçimi), KDV tevkifatı kesir (`tevkifatOranEtiketi`, 0075'in "etiket yalnız kesir" kuralı). Pencerede üçüncü bir biçim yazılmaz.
  - **R2/5.** İndirilemeyen KDV satırı borca girmediğini söyler ("borca girmez, gider tutarına girer" ibaresi ya da alt ipucunda bir cümle); C3'ün tevkifat ve stopaj cümlesiyle aynı mantık.
- **R3.** Ayrıntıda yalnız o kalemde var olan rakamlar yazılır: KDV'siz kalemde KDV satırı, tevkifatsız kalemde tevkifat satırı, lira kalemde döviz satırı çizilmez.
  - **R3/2.** Ölçüt **tutarın sıfır olmasıdır**, oranın sıfırlığı değil: `kdvK === 0` olan kalemde KDV satırı çizilmez (oranı girilmiş ama kuruşa yuvarlanınca sıfıra inen kalem de). Tevkifat, stopaj ve indirilemeyen KDV satırları aynı tek ölçütle.
- **R4.** Ayrıntıdaki ödeme listesi kalemin **bütün** ödemelerini gösterir, ekstrenin tarih aralığına bakmaz; her satırda tarih, yöntem, hesap ve tutar, kısmi ödemede kalan yazar.
  - **R4/2.** Listeyi **motor** yazar: borç satırı aralık süzmesinden önce `odemeler` (döngüde zaten hesaplanan `anaPaylari` dizisi) ve `kalanK` (`anaHedef().kalanK`) alanlarını taşır. Pencereye `hareketler` ya da `turler` prop'u verilmez; pencere yalnız çizer. Liste yalnız ANA hedefe giden ödemeleri taşır (vergi dairesine giden tutarlar C3 gereği yalnız bilgi satırıdır), yani toplamı satırın bakiyesiyle tutar.
- **R5.** Ödeme satırının ayrıntısı ödemenin yöntemini, hesabını, kapattığı hedefi ve varsa döviz tutarı ile kuru yazar.
  - **R5/2.** Tedarikçi ekstresinde hedef adı yazılmaz (hedef her zaman ANA, yani sabit metin); yerine **hangi taksidin** kapandığı yazar ve metin tek kaynaktan gelir (`odemeYontemi.taksitAdi(kalem, hareket.taksitId, dav)`, 0060). Hedef adı yalnız çalışan ekstresinde yazılır (R6).
  - **R5/3.** Hesap satırı, hesap adı çözülemiyorsa çizilmez: `hesapAdi` üçüncü hâli de ayırır ve hesap listesi boşsa boş dize döner (Kasa yetkisi olmayan Giderler kullanıcısında liste boş geliyor, bugünkü yardımcı gerçek hesaba "Silinmiş hesap" diyor). İki dosyada kopya duran yardımcı tek yere alınır.
  - **R5/4.** Yöntemi ya da hesabı boş ödemede (tutarsız göç hareketi, çekli ödeme) o satır çizilmez; R3'ün kuralı ödeme ayrıntısında da geçerlidir.
- **R6.** Çalışan ekstresinde de ayrıntı açılır ve bugün Açıklama hücresinde sıkışan kırılımı (resmi, elden, ek ödeme, kapatılan hedef) taşır; çalışan tarafına yeni bilgi eklenmez.
- **R7.** Ayrıntı yalnız gösterir: hiçbir kaydı değiştirmez, kilit almaz.
- **R8.** Alt ipucu tevkifatı da söyler: kira stopajı gibi tevkifatın da vergi dairesine ödendiği ve bu ekstreye girmediği yazılır.

### B. Pencere ve liste

- **R9.** Ekstre penceresi **1080** piksel genişliğe çıkar, yüksekliği bugünkü gibi ekranı doldurur. Sayı uydurulmaz: 1080 uygulamada var olan ölçüdür (müşteri detay penceresi) ve altı sütun ile yeni düğme sütunu ona sığar; dördüncü bir pencere ölçüsü açılmaz.
  - **R9/2.** Izgaranın oranları da gözden geçirilir: son sütun (bugün 40 piksel, çalışan tarafında avans silme düğmesinin yeri) metinli düğmeyi kesmeden çizecek kadar genişler (150 piksel), Açıklama sütunu `minmax(0, 1fr)` olarak kalan genişliği alır, `minWidth` 860'a çıkar. Sayılar tek yerde, `izgara` sabitindedir.
- **R10.** Sayfalama kalkar: süzgeçten geçen bütün satırlar tek listede çizilir, sayfa düğmeleri yok.
- **R11.** Devreden bakiye satırı listenin en üstünde durur (sayfa kavramı kalktığı için "yalnız ilk sayfada" kuralı da kalkar).
- **R12.** Son bakiye, devir ve özet rakamları bugünkü kurallarıyla aynı kalır; aralık süzgeci, boş durum ve silinmiş rozeti değişmez.
- **R13.** Açıklama hücresi taşan metni kesmeye devam eder, tam metin ayrıntıda görünür.

### C. Kalemde göster

- **R14.** Borç ve ödeme satırında "Kalemde göster" düğmesi olur: ekstre kapanır, Giderler'in Dönem Raporu görünümü kalemin gider tarihinin ayıyla açılır ve kalem süzgeci kalemin kendi metniyle dolar.
  - **R14/2.** Düğme **beş durumu birlikte** yazar, yoksa kalem listesi yine görünmez: görünüm `rapor`, dönem kipi `ay`, ay kalemin gider tarihinin ayı, açık kalemler kipi kapalı (`acikKalemlerSecili = false`) ve hatırlatma kipi kapalı (`odemeFiltre = ""`). Altıncı değer kalem süzgecinin kendisidir (R15).
- **R15.** Süzgecin dolduğu metin genel aramanın bugünkü kuralından okunur (açıklama, yoksa tedarikçi adı, yoksa tür süzgeci); ikinci bir kural yazılmaz.
  - **R15/2.** Kural bugün `GlobalSearch.jsx`'te satır içi bir ifade; saf `aramaGider.kalemFiltresiOf(k, tedarikciAdi)` olarak çıkarılır, genel arama ve ekstre aynı fonksiyonu çağırır ve kaynak taraması ikinci kopyayı yasaklar. Çıktının şekli ve davranışı değişmez.
- **R16.** Düğme yalnız tedarikçi ekstresinde çizilir; çalışan ekstresinde yoktur.
- **R17.** Kalemi kalıcı silinmiş ödeme satırında düğme çizilmez.
  - **R17/2.** Bu bir savunma kuralıdır ve **motor yoluyla ulaşılamaz**: tedarikçi ekstresinin ödeme satırları kalem döngüsünden doğuyor (`satirlar.push({ tur: "odeme", kalem: k, … })`), yani kalemi bulunmayan bir ödeme satırı bu listede hiç oluşmuyor; kavram Kasa'nın hareket listesinden geliyor. Kriter saf satır nesnesiyle sınanır, canlı veriyle sınanmaya çalışılmaz.

---

## Constraints

### Uyulması zorunlu

- **C1.** Hesap saf motorda: vergi kırılımının rakamları `gider.js`'in bugünkü fonksiyonlarından okunur, ekstre penceresi çarpma ya da bölme yazmaz, ikinci bir vergi hesabı açılmaz.
  - **C1/2.** Okuma yolu **tek dışa verilen saf fonksiyon**: `gider.js`'e `kalemVergiKirilimi(k, dav)` eklenir ve kuruş alanlarıyla oranları birlikte döndürür (`matrahK`, `kdvK`, `kdvOrani`, `tevkifatK`, `tevkifatPay`, `tevkifatPayda`, `stopajK`, `stopajOrani`, `indirilemeyenK`, `odenecekK`). İçi bugünkü fonksiyonları çağırır, kendi çarpımını yazmaz. Gerekçe ölçülmüştür: `kalemKurus`, `kdvKurus` ve `stopajKurus` modül içidir, dışa verilen karşılıkları TL float, yani kuruş yürüyen ekstre onları doğrudan okuyamaz; üçünü ayrı ayrı dışa vermek hangisinin kuruş hangisinin TL olduğunu karıştırır ve pencerede `kurus(kalemKdv(...))` gibi gizli bir çevrim üretir.
- **C2.** Motorun bugünkü satır alanları, sıraları ve bakiyeleri değişmez; ayrıntı için eklenen alanlar var olanların üstüne gelir.
  - **C2/2.** Yeni alanlar (`vergi`, `odemeler`, `kalanK`, `anahtar`) **koşulsuz** eklenir, opt-in bayrak açılmaz; kıyas altını `tests/fixtures/0156-ayikla.js` ile bu dört alanı iki taraftan düşerek karşılaştırır (0143, 0147, 0158 emsali). Gerekçe: bu işin iki çağıranı da bayrağı her zaman geçeceği için bayraksız yol yalnız altın testi için yaşayan ölü kod olurdu; ayıklama evin bugünkü alışkanlığı ve kıyasın kapsamını yorumla yazılı kılıyor.
- **C3.** Tevkifat ve kira stopajı ekstrenin bakiyesine **girmemeye devam eder**; ayrıntı onları yalnız bilgi olarak yazar (bakiye yalnız tedarikçiye ödenecek tutarı yürütür).
- **C4.** Pencere boyutu tasarım sözlüğünün kuralıyla değişir: sözlüğe "geniş tablo penceresi" maddesi yazılır, ekstre penceresi 0050'nin Sınıf 1 listesinden çıkarılıp kendi ölçüsüyle sabitlenir (müşteri detay penceresinin emsali) ve pencere bazlı kaynak taraması buna göre güncellenir. Başka pencerenin boyutu değişmez.
  - **C4/2.** Sözlüğün "geniş tablo penceresi" ölçüsü **1080**'dir ve var olan sayıyı yeniden kullanır; pencere ölçüleri envanteri üçte kalır (520 dar, 900 `wide`, 1080 geniş tablo ve detay; bayi detayının 760'ı bugünkü istisnasıyla durur).
  - **C4/3.** Sözlüğün Sınıf 1 maddesindeki **"Yeni bir veri girme ya da tablo penceresi de bu sınıfta açılır"** cümlesi de değişir (tablo penceresi geniş tablo sınıfında açılır) ve Sınıf 1 listesinden "Tedarikçi/Çalışan Ekstresi" çıkarılır; yoksa bir sonraki tablo penceresi yine 900'de açılır.
- **C5.** Sayfalama kuralı 0062'nin listesinden bu pencere çıkarılarak değişir (0080'in Gider Kalemleri emsali); kalan dört listenin sayfalaması ve paylaşılan kanca dokunulmaz.
  - **C5/2.** Electron yerleşim testi ve fikstürü birlikte güncellenir: `scripts/tests/layout/form-pencere.jsx`'in ekstre verisi elli satıra çıkar, `form-pencere-yerlesim.cjs`'in bugünkü "beş satır ve sayfalama çubuğu" iddiası "pager yok, liste pencere içinde kayar, belge taşmaz" olur (1280 ve 1024 piksel). Fikstürün aralığı bugün `{ baslangic, bitis }` şeklinde veriliyor, motor `{ bas, bit }` okuyor, yani o testteki aralık süzgeci hiç çalışmıyor; şekil düzeltilir (kusur testte, uygulamada değil).
  - **C5/3.** Sayfalamanın kalkmasının ölçümü 0080 emsaliyle yazılır: jsdom'da üç yüz satırlık ekstre (hepsi kapalı ayrıntıyla) çizilir ve bir süre eşiği yazılır. Ayrıntılar varsayılan kapalı olduğu için DOM yükü satır sayısıyla doğrusal kalır.
- **C6.** Yönlendirme var olan mekanizmayı kullanır: Giderler'in başlangıç görünümü, başlangıç ayı ve başlangıç kalem süzgeci prop'ları; yeni bir yönlendirme kavramı açılmaz.
  - **C6/2.** Süzgeç değeri **Giderler'in kendi durumunda** tutulur ve kalem listesine `yerelKalemFiltresi ?? baslangicKalemFiltresi` olarak iner; App'e yeni prop çıkılmaz ve çizim anahtarı (`key`) bumpı yazılmaz. Dayanağı ölçümdür: üç prop da yalnız ilk değer, ama kalem listesi yalnız rapor görünümünde çiziliyor, yani Tedarikler'den dönüşte taze mount oluyor. **Kabul edilen davranış:** kullanıcı elle Tedarikler'e gidip Dönem Raporu'na dönerse süzgeç bir kez daha dolu gelir (0125'in aynı karakteristiği).
- **C7.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı ve göç yok. Ekstre salt okunur kalır, yazdırılmaz ve dışa aktarılmaz.
- **C8.** Çalışan ekstresinin gizlilik kuralı korunur: çalışan tutarları hiçbir yazdırma ya da dışa aktarma çıktısına girmez, ayrıntı yalnız ekranda açılır.
- **C9.** Kullanıcıya görünen bütün metinler Türkçe ve tek yerde sabit.
  - **C9/2.** Ayrıntının bütün etiketleri ve yenilenen alt ipucu modül düzeyinde sabittir; penceredeki bugünkü satır içi metinler (`ISLEM_AD`, alt ipucu, bakiye etiketleri) da aynı bloğa taşınır. Satır içi kullanıcı metni bırakılmaz.
- **C10.** Görsel kanıt kayıtları 0011 R2'nin kuralıyla güncellenir: pencere genişleyip sayfalama kalktığı için ekstreye bağlı var olan ekranların pikselleri **bilinçli** değişir, yani kayıtları bu spec'te `"degisti"` artı Takım Yöneticisi onay satırı olur ve spec `done`'a taşınırken `"ayni"`ye çevrilir. Sayfalamanın ikinci sayfasını çeken ekran (`giderler-0062-ekstre-sayfa2`) anlamını yitirdiği için görüntü aracından ve eşlemeden silinir; yoksa "Sonraki ›" adımı bulunamayacak, araç yalnız `adimUyarilari` yazıp yanlış ekranı çekecekti.

### KAPSAM DIŞI

- **X1.** Gider kalemine fatura numarası alanı — *neden:* Takım Yöneticisi kararı, yeni kalıcı alan kendi spec'ine kalır.
- **X2.** Ekstrenin yazdırılması ve Excel'e aktarılması — *neden:* 0024 B9 kararı; çalışan tarafının gizlilik sınırı bu kararın dayanağı.
- **X3.** Çalışan ekstresinden Giderler'e yönlendirme — *neden:* o pencere Kasa'dan açılıyor, yönlendirme uygulama düzeyine çıkar ve iş büyür.
- **X4.** Satıra tıklayınca kalem kaydının pencerede açılması — *neden:* iç içe pencere kilit ve Escape kuralı gerektirir, bu sınıf uygulamada altı yerde kusurlu.
- **X5.** Müşteri ekstresi — *neden:* uygulamada müşteri ekstresi diye bir ekran yok, kurulması altı ayrı kaynaktan yürüyen bakiye demek ve bu iş istenmedi.
- **X6.** Ekstrenin kendi içinde arama ve sütun sıralaması — *neden:* liste tek sayfada çiziliyor, tarayıcı araması yeterli.
- **X7.** Başka pencerelerin büyümesi — *neden:* 0050 sekiz pencereyi bilinçle standartlaştırdı, yalnız bu pencere ayrılıyor.
- **X8.** Kur farkı, vade farkı ve bakiye yaşlandırması — *neden:* ayrı kavramlar, ekstre bugünkü kapsamında kalır.
- **X9.** Ödeme ayrıntısında çekin numarası ve bankası — *neden:* pencereye `cekler` prop'u vermek gerekir, bu da salt okunur ekstrenin girdisini büyütür; çekli ödemede yöntem satırı bugünkü metniyle yeterli.

---

## Context

Bugünkü davranış ve dayanaklar (hepsi kodda ölçüldü):

- **Pencere tek bileşen, iki çağıran:** `src/components/gider/EkstrePenceresi.jsx` (97 satır) Tedarikler listesinden tedarikçi, Kasa'nın çalışan avansları bölümünden çalışan ekstresi olarak açılıyor; hesap saf motorda (`kasa.tedarikciEkstresi` / `calisanEkstresi`), pencere yalnız gösteriyor. Boyut ve sayfalama değişikliği iki ekstreyi birlikte etkiler, bu kaçınılmaz.
- **Bugünkü ölçüler:** `<Modal ... wide>` (0050'nin Sınıf 1 kuralı: 900 piksel, yükseklik 94vh), altı sütunlu ızgara `90px 130px minmax(0,1fr) 120px 130px 40px` ve `minWidth: 720`, sayfa başına **beş satır** (`usePagination(e.satirlar, 5, ...)`, 0062 R8), Açıklama hücresi `whiteSpace: nowrap` ile kesiliyor ve tam metin yalnız `title` ipucunda.
- **İki kuralın da koruması var:** pencere boyutunu `tests/ui/form-pencere-boyutu.test.jsx` sabitliyor (Sınıf 1 pencereleri `wide` geçer, `maxWidth` yazmaz), sayfalamayı `tests/sayfalama-0062.test.js` `LISTELER` tablosu sabitliyor (ekstre satırı `["…/EkstrePenceresi.jsx", 5, 1]`), yerleşimi Electron testi ölçüyor (`form-pencere-yerlesim.test.js`, on satırlık pencerenin içeride kaydığını doğruluyor). Üçü birlikte güncellenecek.
- **Emsal var:** müşteri detay penceresi `<Modal wide maxWidth={1080}>` ile açılıyor ve tarama bunu kendi satırında sabitliyor, yani "geniş pencere" uygulamada yeni bir şey değil. Sayfalamanın kaldırılması da emsalli: 0080 Gider Kalemleri ile Tedarikler listelerinde aynısını yaptı ve ölçümle (jsdom 1.200 kalem, Electron yerleşim) kapattı.
- **Borç satırı bugün tek rakam:** motor `anaHedef(k, dav).toplamK` yazıyor, yani matrah eksi tevkifat artı KDV. Yeni hesap yazılmayacak, var olanlar satıra taşınacak.
- **Düzeltilen iddia 1 (C1'in fonksiyon listesi):** spec'in ilk hâli kırılımın parçalarının hazır olduğunu söylüyordu, ama **ölçüm başka:** `kalemKurus`, `kdvKurus` ve `stopajKurus` `gider.js`'te modül içi `const`, dışa verilen yalnız `tevkifatKurus` ile `kisitHesabi`; kuruş karşılıkları yerine TL sarmalayıcıları var (`kalemTutari`, `kalemKdv`, `kalemStopaj`, `kalemTevkifat`, `kalemIndirilebilirKdv`). Ekstre kuruşla yürüdüğü için bu üçü bugün dışarıdan okunamıyor. C1/2 ile tek dışa verilen okuyucu açılıyor.
- **Tevkifat ekstreye hiç girmiyor:** `tedarikciEkstresi` yalnız ANA hedefi okuyor (0075 kararı: tevkifat ve kira stopajı vergi dairesine ödenir), bugünkü alt ipucu yalnız stopajı anıyor, tevkifatı söylemiyor. R8 bunu kapatıyor.
- **Düzeltilen iddia 2 (yönlendirme mekanizmasının hazır olduğu):** `Giderler` bileşeni `baslangicGorunum`, `baslangicAy` ve `baslangicKalemFiltresi` prop'larını zaten alıyor (0026 genel aramanın gider sonucu bu yoldan açılıyor) ve ekstre penceresi **Giderler'in içinden** açılıyor, yani yönlendirme uygulama düzeyine çıkmadan yapılabilir. Ama mekanizma **yalnız ilk değer** taşıyor: üçü de `useState` başlangıcı, App onları `key` ile yeniden bindirerek çalıştırıyor, yani prop'a yeni değer yazmak mount olmuş bir ekranda hiçbir şey yapmaz. İşi kurtaran ölçüm şu: `KalemListesi` yalnız rapor görünümünde çiziliyor (`gorunum === "tedarikci"` dalı onu hiç mount etmiyor), yani Tedarikler'den dönüşte taze mount olur ve `key` bumpına gerek kalmaz. Eksik olan görünüm ve ay değil, kalem listesini gizleyen iki kip ile dönem kipiydi (R14/2).
- **Fatura numarası alanı yok:** `giderler` tablosunda `aciklama` var, fatura numarası yok; tedarikçinin ekstresiyle satır satır eşleşme bugün açıklama metnine bağlı. X1 ile ayrıldı.
- **Canlı veride ölçülenler (2026-11-22):** 37 tedarikçi, 169 canlı gider kalemi; en kalabalık tedarikçi 21 kalem (SİSTEM CİVATA), yani ödemelerle birlikte ellinin üzerinde satır ve bugünkü beşli sayfalamada on bir sayfa. Döviz gider kalemi henüz yok, yani ayrıntının döviz satırı bir süre hiç çizilmeyecek; kural yine de baştan yazılır (0153 yeni yayınlandı).
- **Bilinen tuzaklar:**
  - **Ayrıntının ödeme listesi aralık süzgecinden bağımsızdır (R4).** Aralık verilmiş ekstrede kalemin ödemeleri listede görünmeyebilir; ayrıntı da süzülürse "bu fatura ödendi mi" sorusu aralığa göre farklı cevap verir.
  - **Sayfalama kalkınca devir satırının kuralı anlamını yitirir.** Bugünkü kod devri yalnız birinci sayfada çiziyor (0062 R30); koşul kaldırılmazsa satır hiç çizilmez ya da iki kez çizilir.
  - **Pencere genişliği ızgarayı tek başına düzeltmez.** Izgaranın `minWidth: 720` ve sabit sütun genişlikleri var; pencere 1200'e çıkınca Açıklama sütunu büyüsün diye oranların da gözden geçirilmesi gerekir, yoksa yeni genişlik boş alan olarak kalır.
  - **Çalışan ekstresi aynı pencereyi kullanıyor.** Boyut ve sayfalama değişikliği orada da görünür ve o ekranın kanıt görüntüleri de yenilenir; gizlilik kuralı gereği ayrıntıya yeni çalışan bilgisi eklenmez (C8).
  - **Düzeltilen iddia 3 (R17'nin varsaydığı satır):** "kalemi kalıcı silinmiş ödeme satırı" tedarikçi ekstresinde doğmuyor; satırlar kalem döngüsünden üretiliyor ve `kalem` her zaman dolu. Kavram Kasa'nın hareket listesinden geliyor. Kural savunma olarak kalıyor, kriteri saf satır nesnesiyle sınanıyor (R17/2).
  - **Hesap adı Kasa yetkisi olmayan kullanıcıda yanlış.** App Giderler'e `kasaHesaplari={kasaYetki ? canliKasaHesaplari : []}` veriyor ve bugünkü `hesapAdi` boş listede her gerçek hesaba "Silinmiş hesap" diyor. Bu metin bugün Açıklama hücresinde sıkışık duruyor, ayrıntıda kendi satırı olacağı için göze batacaktı (R5/3).
  - **Yeni düğme ızgaraya yedinci sütun ekliyor.** Spec'in ilk hâli yalnız "oranlar gözden geçirilmeli" diyordu; son sütun bugün 40 piksel ve metinli düğme oraya sığmıyor (R9/2).

### QA turunda ölçülenler (2026-11-23)

Hepsi `15b45e22` (main) üzerinde okundu.

| # | Ölçüm | Sonuç |
|---|---|---|
| A | `src/components/gider/EkstrePenceresi.jsx` | 97 satır; `<Modal … wide>`, ızgara `90px 130px minmax(0, 1fr) 120px 130px 40px`, `minWidth: 720`, `usePagination(e.satirlar, 5, …)`, devir satırı `e.devirK != null && page === 1`, Açıklama hücresi `whiteSpace: "nowrap"` artı `title` |
| B | Çağıranlar | `gider/Tedarikciler.jsx:162` (tedarikçi) ve `kasa/CalisanAvanslari.jsx:165` (çalışan); ikisi de `aralik`'ı olduğu gibi motora geçiriyor |
| C | `gider.js` dışa verimleri | `kalemKurus`, `kdvKurus`, `stopajKurus` modül içi `const`; dışa verilen `tevkifatKurus`, `kisitHesabi` ve TL sarmalayıcıları `kalemTutari`, `kalemKdv`, `kalemStopaj`, `kalemTevkifat`, `kalemIndirilebilirKdv` |
| D | `kisitHesabi(k, dav)` dönüşü | `{ oran, etkili, matrahK, kdvK, indirilebilirK, indirilemeyenK, kkegMatrahK, kkegKdvK, kkegToplamK, giderK }`, hepsi kuruş |
| E | `tedarikciEkstresi` satır şekli | yalnız `borc` ve `odeme`; ikisi de `kalem: k` taşıyor, yani kalemi bulunmayan ödeme satırı doğmuyor |
| F | Borç tutarı ve kalan | `anaHedef(k, dav)` = `odemeHedefleri(k, dav).find(ANA)`, `{ toplamK, kalanK }`; Tedarikciler zenginleştirilmiş `giderler`'i alıyor (`odemeleriUygula`), yani `_odenen` ve `_odenenK` dolu |
| G | Ödeme payları | `anaPaylari(k, hareketler, turMap)` = `hareketPaylari(…, { yalnizAna: true })`, kalem başına döngüde bir kez hesaplanıyor; yani ödeme listesini satıra yazmak ek hesap yükü getirmiyor |
| H | Aralık süzgeci | `araliga(satirlar, aralik)` yalnız `aralik?.bas` ve `aralik?.bit` okuyor |
| I | Electron fikstürü | `scripts/tests/layout/form-pencere.jsx:30` aralığı `{ baslangic, bitis }` veriyor, yani o testteki süzgeç hiç çalışmıyor; `form-pencere-yerlesim.cjs:61` bugün "ekstre 5 satır artı sayfalama çubuğu" iddia ediyor; fikstür verisi sekiz satır |
| J | Pencere boyutu koruması | `tests/ui/form-pencere-boyutu.test.jsx` `SINIF1` listesinde ekstre satırı var ve Sınıf 1'de `maxWidth` yasak; `SINIF2` üçlüsü `maxWidth={w}` istiyor; müşteri detayı `<Modal wide maxWidth={1080} …>` olarak ayrı satırda sabit |
| K | Sayfalama koruması | `tests/sayfalama-0062.test.js` `LISTELER` beş satır, toplam on çağrı; ekstre satırı `["…/EkstrePenceresi.jsx", 5, 1]` |
| L | `Modal` ve zemin | `maxWidth` varsayılanı `wide ? 900 : 520`; `.modal-backdrop` dolgusu 16 piksel, yani 1024 piksellik pencerede çizilen genişlik 992 (ölçü değeri değil) |
| M | Giderler durumları | `gorunum`, `mod` (varsayılan `"ay"`), `ay`, `acikKalemlerSecili`, `odemeFiltre`; `gorunum === "tedarikci"` dalı ile rapor dalı birbirini dışlıyor, `KalemListesi` yalnız rapor dalında |
| N | Süzgecin bağlanması | `DonemRaporu` süzgeci `useState(() => ({ tur: "", ted: "", odeme: "", ara: "", ...baslangicFiltre }))` ile kuruluyor, yani prop yalnız ilk değer |
| O | App'in yönlendirmesi | `App.jsx:1772` Giderler'e `gider-<odemeFiltresi>-<giderAcilis.no>` biçiminde bir çizim anahtarı veriyor, yani yönlendirme tam remount ile çalışıyor |
| P | Süzgeç metninin kuralı | `GlobalSearch.jsx:193` satır içi: `k.aciklama ? { ara: k.aciklama } : tedAd ? { ara: tedAd } : { tur: String(k.turId ?? "") }` |
| Q | Hesap adı | App → Giderler `kasaHesaplari={kasaYetki ? canliKasaHesaplari : []}`; `hesapAdi` aynı gövdeyle iki dosyada (`Tedarikciler.jsx:42`, `CalisanAvanslari.jsx:117`), boş listede "Silinmiş hesap", `null` kimlikte "Hesap belirtilmedi" |
| R | Kanıt kayıtları | `docs/evidence/kanit-eslemesi.json`'da bu dosyaya bağlı 26 kayıt, hepsi `"ayni"`, beş ekran: `kasa-calisan-ekstresi` (6), `giderler-tedarikci-ekstresi` (6), `kasa-ekstre-hedef` (6), `giderler-0062-ekstre` (4), `giderler-0062-ekstre-sayfa2` (4) |
| S | Görüntü aracı | `sayfa2(adimlar)` ikinci sayfayı `"dugme:Sonraki ›"` adımıyla çekiyor; bulunamayan adım 0117 Karar 51'den beri yalnız `adimUyarilari` üretiyor, çekim durmuyor |
| T | Kilit | `kilitAlanlari.js:75` ekstreyi gerekçeli kilitsiz sayıyor ("salt okunur ekstre") |
| U | Tasarım sözlüğü | "Pencere boyutu (spec 0050)" Sınıf 1 listesi "Tedarikçi/Çalışan Ekstresi"ni sayıyor ve "Yeni bir veri girme ya da tablo penceresi de bu sınıfta açılır" diyor; "Sayfalama (spec 0062)" maddesinin tek istisnası 0080 |
| V | Tevkifat ve stopaj birlikte olamaz | `tevkifatliMi(dav)` yalnız `NORMAL`, `stopajKurus` yalnız `KIRA`, yani bir kalemde ikisi birden doğmaz; köprü satırı (R2/2) tek biçimde yazılabilir |
| W | Oran etiketleri | `tevkifatOranEtiketi` (kesir) `constants`'tan dışa veriliyor, `kisitliRozetMetni` `%${h.oran}` biçimini kullanıyor |
| X | Sıfır tutarlı kalem | `toplamK <= 0` olan kalem ekstreye hiç girmiyor (`continue`), yani ayrıntının tutar köprüsü her zaman sıfırdan büyük bir rakamla kapanıyor |
| Y | Ödeme listesinin kapsamı | `anaPaylari` mahsubu da taşıyabiliyor ama mahsup yalnız personel kalemine yapılıyor ve personel kalemleri tedarikçi ekstresinden `continue` ile atlanıyor; yani tedarikçi tarafında liste yalnız ödemelerden oluşuyor |

### QA turunda verilen kararlar (2026-11-23)

**Bloklayıcı**

**B1 · Bloklayıcı · C1'in adlandırdığı üç fonksiyon dışa verilmiyor.** `gider.js`'e tek dışa verilen saf okuyucu `kalemVergiKirilimi(k, dav)` eklenir, kuruş alanlarını ve oranları birlikte döndürür, içi bugünkü fonksiyonları çağırır; C1'in listesi bu adla değişir (C1/2) — *neden:* aksi hâlde beş yeni dışa verim açılır ve hangisinin kuruş hangisinin TL olduğu karışır, ya da pencerede `kurus(kalemKdv(...))` yazılır, bu da C1'in yasakladığı hesabın kılık değiştirmiş hâlidir.

**B2 · Bloklayıcı · Ayrıntının ödeme listesi pencereden üretilemez.** Motor borç satırına aralık süzmesinden önce `odemeler` ve `kalanK` yazar, pencereye `hareketler` ya da `turler` prop'u verilmez (R4/2) — *neden:* dizi döngüde zaten hesaplanıyor, yani yük yok; alternatif pencereye iki yeni prop vermek olurdu ve bu hesabı ekrana taşıyıp C1'i zedelerdi.

**B3 · Bloklayıcı · Satırın kimliği yok.** Motor satıra `anahtar` yazar, pencere açık anahtarları kümede tutar ve çizim anahtarı olarak da onu kullanır (R1/2) — *neden:* sayfalama kalkınca ve aralık süzgeci değişince dizinler kayar, açık ayrıntı başka satıra geçer; anahtar deterministik olunca kıyasta da ölçülebilir.

**B4 · Bloklayıcı · C2 kendi içinde çelişiyor.** Yeni alanlar koşulsuz eklenir, altın karşılaştırması `0156-ayikla.js` ile dört alanı iki taraftan düşer (C2/2) — *neden:* iki çağıran da opt-in bayrağı her zaman geçeceği için bayraksız yol ölü koda dönüşürdü; ayıklama 0143, 0147 ve 0158'in bugünkü alışkanlığı.

**Önemli**

**Ö1 · Önemli · "Kalemde göster" yalnız görünümü ve ayı değiştirmekle yetmez.** Düğme beş durumu birlikte yazar: görünüm, dönem kipi, ay, açık kalemler kipi ve hatırlatma kipi (R14/2) — *neden:* kalem listesini gizleyen iki kip ve `mod === "aralik"` ölçüldü; üçü eksik kalırsa düğme "hiçbir şey olmadı" gibi görünür.

**Ö2 · Önemli · Yönlendirme mekanizması yarı hazır.** Süzgeç Giderler'in kendi durumunda tutulur (`yerelKalemFiltresi ?? baslangicKalemFiltresi`), App'e yeni prop çıkılmaz; elle Tedarikler'e gidip Dönem Raporu'na dönüşte süzgecin bir kez daha dolu gelmesi 0125 emsaliyle kabul edilir (C6/2) — *neden:* prop'lar yalnız ilk değer, ama `KalemListesi` yalnız rapor görünümünde çizildiği için taze mount kendiliğinden oluyor; `key` bumpı gereksiz ve C6'nın "yeni kavram açılmaz"ı böyle korunuyor.

**Ö3 · Önemli · R15'in kuralı paylaşılan bir yerde değil.** Kural saf `aramaGider.kalemFiltresiOf(k, tedarikciAdi)` olarak çıkarılır, genel arama ve ekstre onu çağırır, tarama ikinci kopyayı yasaklar (R15/2) — *neden:* "ikinci bir kural yazılmaz" ancak tek fonksiyon varsa denetlenebilir.

**Ö4 · Önemli · Kırılım borç rakamına bağlanmıyor.** Ayrıntı gider formunun özet bloğuyla aynı şekli alır, satırlar işaretini taşır ve satırın kendi tutarıyla kapanır (R2/2) — *neden:* muhasebeci faturadan borca nasıl gelindiğini görmeli; köprü olmadan "aynı kaynak" hedefi rakam düzeyinde kalır, DoD'daki çapraz test anlamsızlaşır.

**Ö5 · Önemli · Döviz satırının hangi rakam olduğu belirsiz.** Ayrıntı kalemin kendi girilen döviz tutarını ve donmuş kuru yazar, hücredeki çevrilmiş rakam bugünkü hâliyle kalır, ikisi ayrı etiketle anılır (R2/3) — *neden:* kalemde iki ayrı dövizli rakam var ve ikisini etiketsiz göstermek yeni bir yanlış okuma kaynağıdır.

**Ö6 · Önemli · Ödeme ayrıntısında taksit yok.** Tedarikçi tarafında hedef adı yazılmaz, `taksitAdi` ile hangi taksidin kapandığı yazılır (R5/2) — *neden:* tedarikçi ekstresinde hedef her zaman ANA, yani sabit metin; gerçek bilgi taksittir.

**Ö7 · Önemli · Hangi satır türleri tıklanabilir, tanımsız.** Devir satırı tıklanmaz, avans ve mahsup satırı tıklanır ve kendi ayrıntısını yazar, ayrıntısı olmayan satır tıklanabilir görünmez (R1/3) — *neden:* boş ayrıntı açan satır kusurdur ve "neden açılmıyor" sorusunu üretir.

**Ö8 · Önemli · Klavye ve erişilebilir ad tanımsız.** 0081 R14'ün katlanan başlık deseni uygulanır (`role="button"`, `tabIndex`, `aria-expanded`, Enter ve Space) ve ad satırın tarih ile işlem metnidir (R1/4) — *neden:* emsal var ve testlerin satırı bulmasının tek sağlam yolu rol ile addır.

**Ö9 · Önemli · Satır içindeki düğmeler ayrıntıyı da açar.** İki düğme de olayı durdurur (R1/5) — *neden:* avansı silerken ayrıntının açılıp onay penceresiyle üst üste binmesi gözle görülür; emsal 0126'nın iç içe pencere kuralı.

**Ö10 · Önemli · Yeni düğmenin sütunu ve ızgara oranları.** Son sütun 150 piksele çıkar, Açıklama `minmax(0, 1fr)` kalır, `minWidth` 860 olur, sayılar `izgara` sabitinde tek yerde durur (R9/2) — *neden:* spec'in kendi tuzak listesi oranları anıyordu ama yedinci sütunu hesaba katmıyordu; 40 piksellik hücre metinli düğmeyi keser.

**Ö11 · Önemli · 1200 dördüncü pencere ölçüsünü açıyor.** Pencere 1080'e sabitlenir ve sözlüğün "geniş tablo penceresi" maddesi o sayıyı yazar (R9, C4/2) — *neden:* ölçü envanterini küçük tutmak 0050'nin bütün amacıydı; 1080 var olan emsal sayıdır ve altı sütun ile düğme sütunu ona sığar, aradaki yüzde on bir bu amaca değmez.

**Ö12 · Önemli · Hesap adı Kasa yetkisi olmayan kullanıcıda yanlış.** `hesapAdi` üçüncü hâli de ayırır (liste boşsa boş dize), ayrıntı hesap satırını o durumda çizmez ve kopya yardımcı tek yere alınır (R5/3) — *neden:* ayrıntının amacı mutabakat, yanlış "silinmiş" etiketi mutabakatı bozar.

**Ö13 · Önemli · Mevcut kanıt kayıtlarının kuralı atlanmış.** Ekstreye bağlı kayıtlar bu spec'te `"degisti"` artı onayla yazılır, sayfalamanın ikinci sayfasını çeken ekran araçtan ve eşlemeden silinir (C10) — *neden:* 0011 R2 bilinçli görünüm değişikliğinde onay istiyor; bulunamayan adım yalnız uyarı üretip yanlış ekranı çekeceği için ölü ekran bırakılamaz.

**Ö14 · Önemli · Electron yerleşim testi ve fikstürü.** Fikstür elli satıra çıkar, aralık şekli düzeltilir, iddia "pager yok, liste pencere içinde kayar, belge taşmaz" olur (C5/2) — *neden:* AC-25 ancak fikstür büyütülürse bir şey ölçer; fikstürdeki aralık şekli bugün sessizce etkisiz.

**Küçük**

**K1 · Küçük · AC-4'ün ölçütü belirsiz.** Ölçüt tutarın sıfır olmasıdır (`kdvK === 0`), oranın sıfırlığı değil (R3/2) — *neden:* oranı girilmiş ama kuruşa yuvarlanınca sıfıra inen kalem de satır çizmemeli; tek ölçüt R3'ü de kapsar.

**K2 · Küçük · Oran biçimleri yazılı değil.** KDV ve stopaj `%<oran>`, tevkifat kesir; üçü de var olan sabitlerden okunur (R2/4) — *neden:* 0075 "etiket yalnız kesir" diyor, `kisitliRozetMetni` yüzde biçimini kuruyor; üçüncü bir biçim uydurmak gereksiz.

**K3 · Küçük · Metin sabitleri satır içi.** Ayrıntının etiketleri ve yenilenen alt ipucu modül düzeyinde sabit olur, var olan satır içi metinler de aynı bloğa taşınır (C9/2) — *neden:* C9 "tek yerde sabit" diyor, bugünkü pencere üç yerde satır içi metin taşıyor.

**K4 · Küçük · R17 ile AC-28 ulaşılamaz.** Kural savunma olarak kalır, "motor yoluyla ulaşılamaz" notu yazılır ve kriter saf satır nesnesiyle sınanır (R17/2, AC-28) — *neden:* satırlar kalem döngüsünden doğuyor, canlı veriyle bu durum hiç oluşmuyor.

**K5 · Küçük · AC-19'un ölçümü yanlış yerde.** Kriter `maxWidth` değerini ölçer, çizilen genişliği değil (AC-19) — *neden:* zemin dolgusu yüzünden 1024 piksellik pencerede çizilen genişlik 992; rendered ölçüm AC-25'in işi.

**K6 · Küçük · Sayfalamanın kalkmasının ölçüm eşiği yok.** 0080 emsaliyle üç yüz satırlık jsdom çizim ölçümü ve bir eşik yazılır (C5/3) — *neden:* 0080 aynı kararı 1.200 kalemle ve on saniyelik eşikle kapatmıştı; elli satır yalnız yerleşimi ölçer.

**K7 · Küçük · Göç hareketinin ve çekli ödemenin ayrıntısı.** Yöntemi ya da hesabı boş ödemede o satır çizilmez, çekin numarası ve bankası kapsam dışıdır (R5/4, X9) — *neden:* R3'ün kuralı ödeme ayrıntısında da geçerli; çek bilgisi pencereye yeni bir prop ister.

**K8 · Küçük · İndirilemeyen KDV borcu değiştirmez.** Satır bunu söyler (R2/5) — *neden:* C3'ün tevkifat ve stopaj cümlesiyle aynı mantık; bilgi satırını borç gibi okumak yeni bir hata kaynağı.

**K9 · Küçük · AC-4'ün SGK örneği zorlama.** Örnek "oranı sıfır kalem" olarak kalır, SGK örneği "türü sonradan değişmiş kalem" diye yazılır (AC-4) — *neden:* SGK kaleminde tedarikçi alanı yok, tedarikçi ekstresine ancak türü sonradan değişmiş eski bir kayıt girer.

**K10 · Küçük · Sözlüğün Sınıf 1 cümlesi.** Cümle de değişir ve Sınıf 1 listesinden ekstre çıkarılır (C4/3) — *neden:* cümle aynen kalırsa bir sonraki tablo penceresi yine 900'de açılır.

### QA turu karar kaydı

| Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|
| B1 Vergi okuyucusu dışa verilmiyor | Bloklayıcı | Tek dışa verilen `kalemVergiKirilimi` | C1/2, AC-35 |
| B2 Ödeme listesi pencereden üretilemez | Bloklayıcı | Motor borç satırına `odemeler` ve `kalanK` yazar | R4/2, AC-36 |
| B3 Satır kimliği yok | Bloklayıcı | Motor `anahtar` yazar | R1/2, AC-37 |
| B4 C2 çelişiyor | Bloklayıcı | Koşulsuz alan artı ayıklama | C2/2, AC-38 |
| Ö1 Düğme beş durumu yazmıyor | Önemli | Beş durum birlikte | R14/2, AC-39 |
| Ö2 Yönlendirme yarı hazır | Önemli | Yerel durum, remount, 0125 kabulü | C6/2, AC-40, AC-41 |
| Ö3 Süzgeç kuralı paylaşılmıyor | Önemli | `kalemFiltresiOf` | R15/2, AC-42 |
| Ö4 Kırılım borca bağlanmıyor | Önemli | İşaretli köprü ve kapanış satırı | R2/2, AC-43, AC-44 |
| Ö5 Döviz rakamı belirsiz | Önemli | İki rakam ayrı etiketle | R2/3, AC-45 |
| Ö6 Ödemede taksit yok | Önemli | `taksitAdi` | R5/2, AC-46 |
| Ö7 Tıklanabilir satırlar tanımsız | Önemli | Devir hariç, avans ve mahsup dahil | R1/3, AC-47 |
| Ö8 Klavye ve ad tanımsız | Önemli | 0081 R14 deseni | R1/4, AC-48 |
| Ö9 Düğmeler ayrıntıyı açıyor | Önemli | Olay durdurulur | R1/5, AC-49 |
| Ö10 Izgara ve düğme sütunu | Önemli | Son sütun 150, `minWidth` 860 | R9/2, AC-50 |
| Ö11 1200 dördüncü ölçü | Önemli | Pencere 1080 | R9, C4/2, AC-19 |
| Ö12 Hesap adı yanlış | Önemli | Boş listede satır çizilmez | R5/3, AC-51 |
| Ö13 Kanıt kayıtları atlanmış | Önemli | `degisti` artı onay, ölü ekran silinir | C10, AC-52 |
| Ö14 Electron fikstürü | Önemli | Elli satır, aralık şekli düzeltilir | C5/2, AC-25, AC-53 |
| K1 AC-4'ün ölçütü | Küçük | `kdvK === 0` | R3/2, AC-4 |
| K2 Oran biçimleri | Küçük | Var olan sabitlerden | R2/4, AC-54 |
| K3 Metin sabitleri | Küçük | Modül düzeyinde | C9/2, AC-55 |
| K4 R17 ulaşılamaz | Küçük | Savunma notu, saf nesneyle test | R17/2, AC-28 |
| K5 AC-19'un ölçümü | Küçük | `maxWidth` ölçülür | AC-19 |
| K6 Ölçüm eşiği yok | Küçük | Üç yüz satır, jsdom eşiği | C5/3, AC-56 |
| K7 Boş yöntem ve hesap | Küçük | Satır çizilmez, çek bilgisi kapsam dışı | R5/4, X9, AC-57 |
| K8 İndirilemeyen KDV ibaresi | Küçük | Borca girmediğini söyler | R2/5, AC-58 |
| K9 SGK örneği | Küçük | Örnek yeniden yazıldı | AC-4 |
| K10 Sözlüğün Sınıf 1 cümlesi | Küçük | Cümle ve liste güncellenir | C4/3 |

---

### Plan turunda verilen kararlar (2026-11-23)

- **P1 (U1, R2/2):** köprünün kapanış satırı ekstre satırının `tutarK`'sını yazar (tek kaynak); ara satırlar `kalemVergiKirilimi`'nden. Motor testi bütün fikstürde (taksitli dahil) `odenecekK === tutarK` olduğunu iddia eder; fark satırı açılmaz.
- **P2 (U2, AC-14 ile R5/2):** tedarikçi ekstresinde ödeme ayrıntısının "kapattığı hedef" satırı taksitli kalemde `taksitAdi` metnidir, taksitsiz kalemde çizilmez (hedef her zaman ANA, sabit metin). Çalışan ekstresinde hedef adı yazılır. AC-14 iki tarafta ayrı ölçülür.
- **P3 (U3, R5/3):** hesap adı çözücüsü `kasa.hesapAdiCoz(hesaplar, id)`: liste boşsa `""` (satır çizilmez), kimlik boşsa "Hesap belirtilmedi", listede yoksa "Silinmiş hesap". Pencere `hesapAdi` prop'unu almaya devam eder, iki çağıran bu fonksiyonu verir; bileşenlerdeki iki kopya silinir.
- **P4 (U4, C10):** ekstreye bağlı kanıt kayıtlarının onay satırı `Takım Yöneticisi · 2026-11-23 · spec 0156 C10`; done'a taşınırken taban raporuyla `ayni`ye çevrilir.
- **P5 (U5, R1/4):** erişilebilir ad tekil değildir (aynı gün iki ödeme); testler `getAllByRole` ile sırayla sorgular.
- **P6 (U6, C5/3):** üç yüz satırlık jsdom çiziminin eşiği 3 saniye (0080'in 1.200 kalem / 10 sn oranından).
- **P8 (uygulamada, 2026-11-23):** tedarikçi ekstresinin borç ve ödeme satırı kalemin davranışını (`davranis`) da taşır: köprünün kapanış etiketi gider formunun özetiyle aynı kuruluşta (`hedefAdi(ANA, davranis)` + "ödenecek", 0060 tek kaynak) ve taksit adı kiralık kalemde "Kiraya verene n/m. taksit" yazar. Pencere tür listesi almaz (R4/2); ayıklama bu alanı da düşer.
- **P7 (U7):** yürürlük öncesi kalem için "Kalemde göster"e ek kural yazılmaz; motorun kapsamı (`kapsamda`) bu kalemi ekstreye hiç sokmuyor.

## Acceptance Criteria

- **AC-1.** Tedarikçi ekstresinde borç satırına tıklanınca altında ayrıntı açılır, yeniden tıklanınca kapanır.
- **AC-2.** İki ayrı satır birlikte açık kalabilir.
- **AC-3.** Borç satırının ayrıntısı matrahı, KDV oranını ve KDV tutarını yazar.
- **AC-4.** KDV tutarı sıfır olan kalemde (oranı sıfır kalem; oranı girilmiş ama kuruşa yuvarlanınca sıfıra inen kalem; türü sonradan KDV'siz davranışa çevrilmiş eski kayıt) ayrıntıda KDV satırı çizilmez.
- **AC-5.** Tevkifatlı kalemin ayrıntısı kesilen tevkifatı oranıyla yazar.
- **AC-6.** Tevkifatsız kalemde tevkifat satırı çizilmez.
- **AC-7.** Stopajlı kira kaleminin ayrıntısı stopajı oranıyla yazar.
- **AC-8.** Kısıtlı (binek araç) kalemin ayrıntısı indirilemeyen KDV'yi yazar; kısıtsız kalemde o satır yok.
- **AC-9.** Döviz kalemin ayrıntısı kalemin kendi para birimindeki tutarını ve donmuş kurunu yazar; lira kalemde o satır yok.
- **AC-10.** Borç satırının ayrıntısı kalemin ödemelerini tarih, yöntem, hesap ve tutarla listeler.
- **AC-11.** Kısmen ödenmiş kalemin ayrıntısı kalan tutarı yazar.
- **AC-12.** Hiç ödenmemiş kalemin ayrıntısı ödeme listesi yerine ödenmediğini yazar.
- **AC-13.** Tarih aralığı verilmiş ekstrede ayrıntının ödeme listesi aralık dışındaki ödemeleri de gösterir.
- **AC-14.** Ödeme satırının ayrıntısı yöntemi, hesabı ve kapattığı hedefi yazar.
- **AC-15.** Döviz ödemenin ayrıntısı hesaptan çıkan dövizi ve kuru yazar.
- **AC-16.** Çalışan ekstresinde maaş satırının ayrıntısı resmi, elden ve ek ödeme kırılımını yazar.
- **AC-17.** Çalışan ekstresinin ayrıntısında KDV, tevkifat ve stopaj satırı çizilmez.
- **AC-18.** Alt ipucu tevkifatın da vergi dairesine ödendiğini ve ekstreye girmediğini yazar.
- **AC-19.** Ekstre penceresinin ölçüsü 1080 pikseldir (kriter `maxWidth` değerini ölçer, çizilen genişliği değil).
- **AC-20.** Süzgeçten geçen bütün satırlar tek listede çizilir, sayfa düğmeleri yok.
- **AC-21.** Devreden bakiye satırı listenin en üstünde bir kez çizilir.
- **AC-22.** Son bakiye ve özet rakamları bu spec'ten önceki değerlerle birebir aynıdır.
- **AC-23.** Tarih aralığı daraltılınca liste süzülür ve bakiye bugünkü kuralla yeniden hesaplanır.
- **AC-24.** Hareketi olmayan tedarikçide boş durum bugünkü metniyle çizilir.
- **AC-25.** Elli satırlık ekstre tek listede çizilir, sayfalama çubuğu yoktur, liste pencere içinde kayar ve belge taşmaz (Electron yerleşim ölçümü, 1280 ve 1024 piksel).
- **AC-26.** Borç satırındaki "Kalemde göster" düğmesi ekstreyi kapatır, Dönem Raporu'nu kalemin ayıyla açar ve kalem süzgecini kalemin metniyle doldurur.
- **AC-27.** Ödeme satırındaki aynı düğme ödemenin bağlı olduğu kalemi aynı biçimde açar.
- **AC-28.** Kalemi bulunmayan ödeme satırında düğme çizilmez (kriter saf satır nesnesiyle sınanır; bu durum motor yoluyla doğmuyor, R17/2).
- **AC-29.** Çalışan ekstresinde "Kalemde göster" düğmesi yok.
- **AC-30.** Ayrıntı ve düğme hiçbir kaydı değiştirmez, kilit almaz (kaynak taraması).
- **AC-31.** Motorun ayrıntı istemeyen çağrısı spec öncesi altınla birebir aynı sonucu verir (`tests/fixtures/0156-once.json`).
- **AC-32.** Vergi kırılımının rakamları motorun var olan fonksiyonlarından okunur; pencere dosyasında çarpma ve bölme yok (kaynak taraması).
- **AC-33.** Pencere boyutu ve sayfalama taramaları bu pencere için güncellendi, kalan pencerelerin ve listelerin kuralı değişmedi.
- **AC-34.** Yeni kalıcı alan, yeni izin kimliği, yeni veri bölümü ve yeni sunucu kuralı eklenmedi (kaynak taraması).

### QA turu kriterleri (2026-11-23)

- **AC-35.** Vergi kırılımının rakamları tek dışa verilen okuyucudan (`gider.kalemVergiKirilimi`) gelir; `kasa.js` ve ekstre penceresi ikinci bir vergi hesabı yazmaz (kaynak taraması).
- **AC-36.** Ayrıntının ödeme listesi motorun borç satırındaki `odemeler` alanından çizilir; pencere `hareketler` ya da `turler` prop'u almaz (kaynak taraması).
- **AC-37.** Satır anahtarı deterministiktir: aralık süzgeci değiştikten sonra açık ayrıntı aynı kaydın üstünde kalır, komşu satıra geçmez.
- **AC-38.** Motorun yeni alanları koşulsuz eklenir ve ayıklamalı altın karşılaştırması birebir geçer (`tests/fixtures/0156-ayikla.js`).
- **AC-39.** "Kalemde göster" açık kalemler kipini ve hatırlatma kipini kapatır, dönem kipini aya çeker; kalem listesi kalemi göstererek açılır.
- **AC-40.** Süzgeç değeri Giderler'in kendi durumundan gelir; App'e yeni prop eklenmedi (kaynak taraması).
- **AC-41.** Kullanıcı elle Tedarikler'e gidip Dönem Raporu'na dönerse süzgeç bir kez daha dolu gelir (kabul edilen davranış, 0125 emsali).
- **AC-42.** Süzgeç metni `aramaGider.kalemFiltresiOf` ile üretilir; genel arama ve ekstre aynı fonksiyonu çağırır ve kaynakta ikinci kopya yok (kaynak taraması).
- **AC-43.** Normal kalemin ayrıntısı matrahı, toplam KDV'yi ve tevkifatı işaretleriyle yazar; kapanış satırı ekstre satırının Tutar hücresine eşittir.
- **AC-44.** Kira kaleminin ayrıntısı brütü, stopajı, neti ve KDV'yi işaretleriyle yazar; kapanış satırı ekstre satırının Tutar hücresine eşittir.
- **AC-45.** Döviz kalemin ayrıntısı kalemin girilen döviz tutarını ve donmuş kurunu ayrı etiketle yazar; Tutar hücresindeki çevrilmiş rakam değişmez.
- **AC-46.** Taksitli kalemin ödeme ayrıntısı hangi taksidin kapandığını `taksitAdi` ile yazar; tedarikçi ekstresinde hedef adı yazılmaz.
- **AC-47.** Devreden bakiye satırı tıklanmaz; avans ve mahsup satırı tıklanır ve kendi ayrıntısını yazar.
- **AC-48.** Satır `role="button"` ve `aria-expanded` taşır, Enter ve Space ile açılıp kapanır.
- **AC-49.** Satırın içindeki düğmeye tıklamak ayrıntıyı açmaz (çalışan ekstresinde avans silme, tedarikçi ekstresinde "Kalemde göster").
- **AC-50.** Izgaranın son sütunu "Kalemde göster" düğmesini kesmeden çizer, Açıklama sütunu kalan genişliği alır (Electron yerleşim ölçümü).
- **AC-51.** Kasa yetkisi olmayan kullanıcıda ayrıntının hesap satırı çizilmez; gerçek hesaba "Silinmiş hesap" yazılmaz.
- **AC-52.** Sayfalamanın ikinci sayfasını çeken ekran görüntü aracından ve kanıt eşlemesinden silindi; ekstreye bağlı kalan kayıtlar onaylı `degisti` olarak yazıldı (kanıt eşlemesi testi).
- **AC-53.** Electron fikstürünün aralığı motorun okuduğu şekilde verilir ve aralık süzgeci ölçülür.
- **AC-54.** Oranlar var olan sabitlerin biçimiyle yazılır: KDV ve stopaj yüzde, tevkifat kesir.
- **AC-55.** Penceredeki kullanıcıya görünen bütün metinler modül düzeyinde sabittir (kaynak taraması).
- **AC-56.** Üç yüz satırlık ekstre eşiğin altında çizilir (jsdom ölçümü).
- **AC-57.** Yöntemi ya da hesabı boş ödemede o satır çizilmez.
- **AC-58.** İndirilemeyen KDV satırı o tutarın borca girmediğini söyler.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Vergi kırılımı tek dışa verilen okuyucudan okunuyor ve bu okuyucu kendi çarpımını yazmıyor (C1/2).
- [ ] Ayrıntının ödeme listesi motorda kuruluyor; pencere hareket ve tür listesi almıyor (R4/2).
- [ ] Satır anahtarı motorda üretiliyor ve aralık süzgeci değişince açık ayrıntı yerinde kalıyor (R1/2).
- [ ] Yeni motor alanları koşulsuz; kıyas ayıklaması (`0156-ayikla.js`) yazıldı ve altın birebir geçti (C2/2).
- [ ] "Kalemde göster" beş durumu birlikte yazıyor ve süzgeç Giderler'in kendi durumunda (R14/2, C6/2).
- [ ] Süzgeç metninin kuralı tek saf fonksiyonda; genel arama da onu çağırıyor (R15/2).
- [ ] Ayrıntının satırları işaretli ve kapanış satırı ekstre satırının tutarına kuruşu kuruşuna eşit (R2/2).
- [ ] Satır klavyeyle açılıyor, erişilebilir adı var ve içindeki düğmeler ayrıntıyı tetiklemiyor (R1/4, R1/5).
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap içeren iş React'sız **saf motorda**; arayüz yalnız gösteriyor (C1, AC-32).
- [ ] Aynı sayıyı üreten başka ekran varsa ikisi aynı kaynağı kullanıyor (ayrıntıdaki vergi rakamları gider formunun özet bloğuyla çapraz testlendi).
- [ ] Yeni kalıcı alan yok; bu açıkça yazıldı.
- [ ] Yeni veri bölümü yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; ekstre salt okunur olduğu için izin eklenmediği açıkça yazıldı.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı yok.
- [ ] Para gösteriliyorsa çoklu para kuralına uyuluyor; döviz kalem ve döviz ödeme kendi para biriminde yazılıyor.
- [ ] Arayüz kriterlerinin **görsel kanıtı** eklendi (`docs/evidence/0156-*`): tedarikçi ekstresi kapalı ve açık ayrıntıyla, çalışan ekstresi, boş durum.
- [ ] Ekstreye bağlı var olan kanıt kayıtları onaylı `degisti` olarak yazıldı, sayfalama ekranı araçtan ve eşlemeden silindi (C10).
- [ ] Sayfalamanın kalkmasının ölçümü yazıldı (üç yüz satırlık jsdom çizimi ve eşiği, C5/3).
- [ ] Electron yerleşim testi güncellendi ve elli satırlık ekstre ölçüldü (AC-25).
- [ ] `0156-once.json` spec öncesi kodla üretildi ve birebir geçti.
- [ ] `docs/tasarim-sozlugu.md` güncellendi: geniş tablo penceresi maddesi (1080), Sınıf 1 listesi ile cümlesi ve sayfalama istisnası (C4/2, C4/3).
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
