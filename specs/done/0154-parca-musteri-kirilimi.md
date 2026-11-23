# 0154 — Seçilen parça hangi makinalara takıldı

| | |
|---|---|
| **Durum** | Tamamlandı (commit `23bc4b98`, 2026-11-23) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Revizyon** | 3 (2026-11-23 plan turu: P1–P11) |
| **QA turu** | 2026-11-23: 29 bulgu (5 Bloklayıcı / 12 Önemli / 12 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 3 (servis döngüsünün satır atfı, R11'in çözüm sırası, canlı veri ölçümünün doğrulanabilirliği) |
| **Etkilenen alanlar** | Analiz sekmesi (Parça kırılımı kutusu ve "Tümünü göster" penceresi), saf motor `analiz.js`, `aliciAd` (`yedekParcaSatis.js`), App'in Analiz prop'u (`dealers`), kıyas altını `tests/fixtures/0121-once.json`, kanıt aracı `scripts/evidence/0009-sayfa.jsx` ve kanıt eşlemesi `docs/evidence/kanit-eslemesi.json` |
| **Bağımlı spec'ler** | 0044 (alıcı adı), 0149 (parça seçicisinin kelime arama), 0016 (boş durum), 0014 (segment), 0121 (kıyas altını), 0111 (toplu düzenlemede korunan elle tahsis), 0124 (altın ayıklama emsali), 0011 (kanıt eşlemesi onayı) |

---

## Intent

Fabrika yönetimi ve servis sorumlusu bir yedek parçayı seçip "bu parça en çok hangi modele gitti" sorusunu Analiz'de bugün cevaplayabiliyor, ama "hangi müşterinin makinasına taktık" sorusunu cevaplayamıyor. Bir parçanın müşteri listesini çıkarmak için servis kayıtlarını tek tek açmak gerekiyor: 2026-11-22'de "RULMAN ?" parçasının beş müşterisini bulmak veritabanını elle sorgulamayı gerektirdi, uygulamanın hiçbir ekranı bu soruyu sormuyor. Bu iş bittiğinde parça seçicisinden bir parça seçilip Müşteri görünümüne geçildiğinde firma adı, model ve seri numarasıyla makina listesi adet azalan sırada görünecek; "Tümünü göster" penceresinde her takılmanın tarihi ve kaynağı (serviste değişti, kargo satışı) yazacak, yani "bu parça o makinaya en son ne zaman gitti" da cevaplanacak. Kargo tarafında yazılan tarih satışın tarihidir, takmanın tarihi değildir (aralık süzgeci de satışın tarihini okuyor), bu yüzden hareket satırı tarihin kaynağını kendisi yazar.

QA turunda ölçülen iki şey işin biçimini belirledi. Birincisi tahsis edilmemiş kargo miktarının kendi satırı olmasıdır: alıcı müşteri olduğunda o müşteri kaydı zaten bir makinadır, yani satır tahsisli satırla birleştirilirse "tahsis edilmedi" ibaresini yanlış taşır. İkincisi var olan bir kıyas altınının bu işle kırılmasıdır: `tests/fixtures/0121-once.json` motorun bütün çıktısını tutuyor ve yeni alan her çağrıda döndüğü için o kıyas ayıklamayla geçirilir, altın yenilenmez.

---

## Requirements

### Ekran

- **R1.** Var olan "Parça → Model Kırılımı" kutusu iki görünümlü olur: **Model** ve **Müşteri**. Varsayılan Model'dir, yani kutu bugünkü ekranla birebir aynı açılır.
- **R1/2.** Kutunun başlığı iki görünümde de "Parça Kırılımı"dır; başlığın altındaki açıklama cümlesi görünüme göre değişir ("Seçilen parça en çok hangi modele gitti?" / "Seçilen parça hangi makinalara takıldı?"). İki cümle de tek metin kümesindedir. Başlığın bugünkü "Parça → Model Kırılımı" metninden ayrılması bilinçlidir ve AC-1'in "bugünkü ekranla aynı" iddiası kutunun gövdesini kapsar, başlık satırını kapsamaz — *neden:* Müşteri görünümünde "Model" sözcüğü yanlış olur.
- **R2.** İki görünüm aynı parça seçicisini paylaşır; görünüm değişince seçili parça değişmez, parça değişince görünüm değişmez.
- **R3.** Görünüm seçimi ekranın geçici durumudur: kaydedilmez, tarih aralığı önayarı değişince korunur.
- **R3/2.** Sekmeden çıkıp dönünce görünüm Model'e döner ve seçili parça sıfırlanır; görünüm bileşenin durumudur, oturum boyunca korunmaz.
- **R4.** Müşteri görünümünde satır bir **makinadır**: firma adı, model ve seri numarası birlikte yazılır, yanında adet.
- **R4/2.** Satır Model görünümünün çubuk desenini korur: ad hücresi iki satırlıdır (üstte firma adı, altında küçük puntoda model ve seri numarası), sağda adet, altında dolgu çubuğu; pencerede aynı satır daha geniş çizilir — *neden:* kutu on iki kolonun beşinde duruyor, üç alan tek satıra sığmaz ve firma adı kesilir.
- **R4/3.** Seri numarası ya da model boş olan makinada o alan `"—"` yazılır.
- **R5.** Satırlar adet azalan sırada; eşit adette firma adına göre. "Müşterisi bulunamayan" satırı her zaman en sonda.
- **R5/2.** Sıralama deterministiktir: adet azalan, sonra firma adı (Türkçe karşılaştırma), sonra model, sonra seri numarası, son olarak kayıt kimliği — *neden:* kanıt görüntüsü ve testler kararlı sıra ister, tie-break yazılmazsa sıra veri sırasına kalır.
- **R5/3.** Tahsis edilmemiş miktarın satırı (R12) normal sıraya girer; yalnız çözülemeyen hareketlerin satırı (R13) en sondadır.
- **R6.** Kutuda ilk sekiz satır çizilir, altında "Tümünü göster (n)" düğmesi; n satır sayısıdır. Pencere bütün satırları listeler.
- **R6/2.** R6 yalnız Müşteri görünümüne uygulanır; Model görünümü bugünkü gibi limitsizdir ve "Tümünü göster" taşımaz.
- **R6/3.** Pencerenin başlığı "Parçanın Takıldığı Makinalar"dır; satır sayısı pencerenin bugünkü başlık kalıbından gelir.
- **R6/4.** Sekiz sayısının tek kaynağı ekranın limit tablosudur (yeni anahtar `musteri`); kaynakta ikinci bir sekiz yazılmaz.
- **R7.** Pencerede her satırın altında o makinaya yapılan takılmaların listesi vardır: tarih, kaynak (serviste değişti / kargo satışı), adet; tarih azalan sırada.
- **R7/2.** Hareket listesi kayıt başına tek satırdır: aynı servis kaydının aynı parçayı taşıyan iki satırı tek harekete toplanır, aynı makinaya yapılan iki ayrı servis iki hareket olur.
- **R7/3.** Liste her zaman açık çizilir, katlanmaz; eşit tarihte önce servis hareketi, sonra kayıt kimliği sıralar.
- **R7/4.** Kaynak adları kutunun lejant metinleridir ("Serviste değişen", "Kargo satışı"), ikinci bir ifade yazılmaz; adedin yanında "adet" birimi yazılır.
- **R8.** Seçili parçanın hiç satırı yoksa boş durum çizilir.
- **R9.** Kutuda ve pencerede hiçbir para tutarı görünmez.

### Kapsam ve çözüm

- **R10.** Serviste değişen parça, servisin müşterisinin makinasına yazılır; miktar boş ya da sıfırsa bir sayılır.
- **R11.** Kargo satışının tahsis edilmiş miktarı tahsisin makinasına yazılır; makina tahsisin `customerId`'siyle, o boş **ya da kaydı bulunamıyorsa** seri numarasıyla çözülür (bugünkü `makinaModeli`'nin sırası) — *neden:* iki görünüm aynı turda aynı kaynaktan besleniyor, çözüm sırası ayrışırsa aynı hareket iki kutuda iki ayrı yere yazılır.
- **R11/2.** Tahsisin müşterisi hiçbir yoldan çözülemiyor ama serbest metinli makinası (`makinaSerbest`) dolu ise satır o metni yazar, kendi satırıdır ve "Sistemde olmayan makina" ibaresi taşır; serbest metin de boşsa kayıt R13 satırına düşer — *neden:* müşteri silme kaskadı bu alana firma adını ve seriyi yazıyor, R13 kovası o bilgiyi görünmez kılar.
- **R12.** Kargo satışının tahsis edilmemiş miktarı **alıcının adıyla** kendi satırında görünür ve satır makinanın tahsis edilmediğini yazar. Alıcı müşteri, bayi ya da anlaşmasız dış firma olabilir. Satır **her zaman ayrıdır**: alıcı müşteri olsa ve aynı satıştan o müşterinin makinasına tahsis yapılmış olsa da iki satır görünür, satır model ve seri numarası yazmaz — *neden:* makina bilinmiyor, model ve seri yazmak "bu makinaya takıldı" diye okunur, birleştirmek de ibareyi yanlış kılar.
- **R12/2.** Her satırın anahtarı motorun çıktısında yazılıdır ve üç satır türü ayrı anahtar biçimi taşır (makina satırı, tahsis edilmemiş satır, çözülemeyen satır); ekran kendi anahtarını üretmez.
- **R13.** Müşterisi çözülemeyen hareketler (müşterisi silinmiş servis, kaydı bulunamayan tahsis) tek satırda toplanır ve satır bunu yazar.
- **R14.** Satırların adet toplamı, parça listesindeki o parçanın toplam adedine (serviste değişen + kargo) eşittir; şart, bir satışın tahsis toplamının o satışın miktarını aşmamasıdır. Aşan kayıtta kırpma yapılmaz, bugünkü model kırılımının davranışı aynen korunur — *neden:* kırpmak iki görünümü ayrıştırır ve kullanıcının veri hatasını sessizce saklar.
- **R15.** Tarih kuralı bugünkü aralık süzgeciyle aynı kaynağı okur: serviste servis tarihi, kargoda satışın tarihi. Tarihsiz kayıt, aralık verildiğinde hiçbir satıra girmez.
- **R15/2.** Hareket listesi tarihin kaynağını kendisi yazar: kargo hareketinin tarihi satışın tarihidir, tahsisin tarihi değildir (X3).
- **R16.** Onarım yeri "Kargo" olan eski servis kayıtları müşteri kırılımına da girmez (Analiz'in bugünkü kuralı).

---

## Constraints

### Uyulması zorunlu

- **C1.** Hesap saf motorda (`src/lib/analiz.js`); ekran satır üretmez, toplamaz, sıralamaz. Müşteri haritası parça başına **var olan döngüde** doldurulur, ikinci bir hesap turu açılmaz.
- **C1/2.** Müşteri kırılımı **her çağrıda** döner, opt-in bayrak yoktur. Bilinen sonucu: motorun bütün çıktısını tutan `tests/fixtures/0121-once.json` kıyası "spec 0154 ile" notlu bir ayıklama satırıyla geçirilir (0124'ün `.slice(0, 10)` emsali) ve altın yenilenmez — *neden:* tek çağıran Analiz'dir ve her zaman istiyor, bayrak ölü yük olur.
- **C1/3.** Çıktının adı ve şekli yazılıdır: parça kaydında `musteriler`, satırda `{ anahtar, ad, model, serialNo, adet, tur, hareketler }`.
- **C2.** Alıcı adının tek okuma yolu `yedekParcaSatis.aliciAd`'dır; ikinci bir alıcı adı çözümü yazılmaz (kaynak taraması). Ölçüldü: `analiz.js`'i yalnız `Analiz.jsx` içe alıyor, yani motorun `yedekParcaSatis.js`'i içe alması döngü oluşturmaz.
- **C2/2.** Ölçüldü: `yedekParcaSatis.js` sekiz yardımcı modülü içe alıyor (tevkifat, ihraç kayıtlı, yedek parça stoğu, stok hareketi, yerel servis, tahsilat günü, kredi kartı, utils), hiçbirinde tarayıcı globali yok, `yerelServis` modül düzeyinde küme tutuyor. Doğrudan içe alma korunur ve motorun çıktısına hiçbir para alanı girmez; ileride döngü çıkarsa `aliciAd` yaprak modüle taşınır (0153'ün `kur.js` emsali).
- **C3.** `dealers` motorun yeni girdisidir ve App'ten Analiz'e yeni prop olarak iner. `dealers` verilmeyen çağrı çalışmaya devam eder (bayi adı `aliciAd`'ın bugünkü yedeğine düşer), yani var olan testler ve çağrılar kırılmaz.
- **C4.** Model kırılımının çıktısı birebir aynı kalır: `modeller` dizisinin alanları, sırası ve "Modeli bilinmeyen" dilimi değişmez; kıyas altınıyla sabitlenir.
- **C4/2.** Model görünümünün **ekran** metni de kıyasla sabitlenir (çubuklar ve "Modeli bilinmeyen" açıklaması), yalnız motor çıktısı değil — *neden:* AC-1'i bugün yalnız göz kararı sınıyor, ekran kıyası sessiz kaymayı yakalar.
- **C4/3.** `tests/fixtures/0154-once.json` spec öncesi kodla ve `dealers` verilmeden üretilir; karşılaştırma `parcalar[]`'ın `modeller`, `servis`, `kargo` ve `toplam` alanlarına uygulanır, yeni alan altına girmez.
- **C5.** Salt okunur iş: yeni kalıcı alan, yeni eylem izni, yeni veri bölümü, yeni sunucu kuralı ve göç yok. Görünürlük yalnız `analiz` sekmesine tabidir.
- **C6.** Çöpteki müşteri ve bayi canlı dizide olmadığı için çözülemez; bugünkü davranış korunur ve kayıt R13 satırına düşer (Analiz'de sahipsiz kayıt süzmesi yoktur, kayıt sayılmaya devam eder).
- **C7.** Kullanıcıya görünen bütün metinler Türkçe ve tek yerde sabit; görünüm geçişi uygulamanın segment kuralıyla çizilir (iki kısa etiket, düğme kipi).
- **C7/2.** Satır ibareleri yazılıdır: "Tahsis edilmedi", "Müşterisi bulunamayan hareketler", "Sistemde olmayan makina"; hareket kaynağı lejantın metinlerini kullanır.
- **C7/3.** Segment düğme kipinde kalır, sekme kipinde çizilmez — *neden:* Analiz'in tarih çubuğu da düğme kipinde ve kart başlığının altındaki sekme çizgisi başlık çizgisiyle çakışır.
- **C7/4.** `aliciAd`'ın yedek metni ("(müşteri yok)") ile R13 satırının ibaresi ayrı kalır ve birbirine benzemez — *neden:* biri tahsis edilmemiş kargonun alıcısı, öteki çözülemeyen hareket kovasıdır.
- **C8.** Kanıt eşlemesi: `Analiz.jsx`'in bugünkü üç kaydı `ayni` ve segment satırı `analiz-onayar` ekranını sıfır piksel olmaktan çıkarır. Bu iş sırasında kayıt `beklenen: "degisti"` ve "Takım Yöneticisi · YYYY-AA-GG · spec 0154 <madde>" onayıyla yazılır, kapanışta `ayni`ye çevrilir (0011 R2). Kanıt aracına Analiz'in `dealers` girdisi ve üç yeni ekran (müşteri görünümü, pencere, boş durum) eklenir.

### KAPSAM DIŞI

- **X1.** Para, ciro ve maliyet — *neden:* Analiz adet bazlıdır, bu bilinçli karardır.
- **X2.** Satırdan müşteri kaydına gitme — *neden:* Analiz'in bugün hiçbir kutusu başka sekmeye yönlendirmiyor, yönlendirme ayrı bir karar.
- **X3.** Tahsis tarihinin ayrıca gösterilmesi — *neden:* aralık süzgeci satışın tarihine bakıyor, iki tarih yan yana yazılınca hangisinin süzgece girdiği belirsizleşir.
- **X4.** Aynı firmanın makinalarını tek satırda toplama — *neden:* Takım Yöneticisi kararı makina bazında satır.
- **X5.** Yazdırma ve dışa aktarma — *neden:* Analiz'in hiçbir kutusu basılmıyor, çıktı eklemek gizlilik kararı gerektirir.
- **X6.** Extra Kalıp ve kalıp kırılımları — *neden:* kalıp yedek parça değildir, kendi bölümünde durur.
- **X7.** "Müşterisi bulunamayan" ve "tahsis edilmedi" kayıtlarının düzeltilmesi — *neden:* Sahipsiz Kayıtlar aracı ve tahsis penceresi bu işi zaten yapıyor; kutu yalnız görünür kılar.
- **X8.** Genel aramanın servis değişen parçalarını araması — *neden:* ayrı iş; bu kutu soruyu Analiz'de cevaplıyor.
- **X9.** Aşırı tahsisin (tahsis toplamı > satış miktarı) kırpılması ya da düzeltilmesi — *neden:* bugünkü model kırılımı da aynı davranışta, düzeltmek iki görünümü ayrıştırır ve ayrı bir veri kararı gerektirir.
- **X10.** Model görünümüne limit ve "Tümünü göster" penceresi — *neden:* AC-1 Model görünümünü bugünkü ekrana donduruyor, limit koymak kıyasın dışında ikinci bir görünüm değişikliği açar.

---

## Context

Bugünkü davranış ve dayanaklar (hepsi kodda ölçüldü):

- **Motor zaten parça başına kırılım tutuyor.** `src/lib/analiz.js:69-108`: `parcaGiris` parça başına `{ad, servis, kargo, toplam, modeller: Map}` kaydı açar, `modelEkle` model haritasını doldurur; servis döngüsü `:82-91` (QA turunda düzeltildi, spec `:83-92` diyordu), kargo döngüsü `:93-108` (tahsis edilen miktar tahsisin makinasının modeline, kalan `BILINMEYEN_MODEL`'e yazılır). Müşteri haritası aynı iki döngüde doldurulabilir, yeni tur gerekmez (C1).
- **Parça anahtarı iki biçimli** (`analiz.js:15`): `partId` varsa `p:<id>`, yoksa serbest metin ada göre `n:<ad>`. Eski servis kayıtlarında parça satırı kimliksiz olabilir, yani müşteri kırılımı da anahtara göre çalışmalıdır, parça kimliğine göre değil.
- **Müşteri adı Analiz'de yeni değil.** `analiz.js:128-131` `enCokServisliMakinalar` satırı firma adı, model ve seri numarası döndürüyor; bulunamayan müşteride `"—"` yazıyor. Yani gizlilik tarafında yeni bir karar yok, yeni kutu aynı dili konuşur.
- **Ekran parçaları hazır.** `src/components/Analiz.jsx`: kutu `:359-376`, parça seçicisi `ParcaSecici` `:114` (0149'un kelime aramasıyla), çubuk `ModelCubuk` `:45`, "Tümünü göster" `TumBtn` `:102`, pencere tanımları `modalTanim` `:295` ve `LIMIT` `:157`, segment `:317` (`kip="dugme"`). Yeni kutu, pencere satırı ve limit anahtarı bu desenlere oturur.
- **Eksik tek bağ `dealers`.** `src/App.jsx:1791` Analiz'e `customers`, `services`, `partSales`, `yedekParcaSatislar`, `parts`, `appSettings` veriyor; `dealers` yok. Bayi alıcısının adını yazabilmek için `liveDealers` eklenecek (C3).
- **Alıcı adı saf modülde.** `src/lib/yedekParcaSatis.js:203` `aliciAd(s, dealers, customers)` (satır atfı QA turunda doğrulandı): `aliciTipi === "musteri"` ise müşteri adı ya da `"(müşteri yok)"`, `disFirma` ise `disFirmaAd` ya da `"(dış firma)"`, aksi hâlde bayi adı ya da `"(bayi yok)"`. Motor bunu içe alır, kendi çözümünü yazmaz (C2).
- **Ölçülen gerçek veri (2026-11-22, uygulamanın içinden; veritabanı şifreli olduğu için dışarıdan `sqlite3` ile sorgulanamaz, QA turunda yeniden doğrulanamadı):** katalogda adında "rulman" geçen 40 parça var; adı birebir "RULMAN ?" olan kayıt (`id=1782285175273`) beş servis kaydına bağlı (EGE ÇİFTLİK ET, EGECAN ET, BİRTAT KÖFTE SALONU, METRO MARKET-BODRUM, İSS CATERİNG-BRİSA), hiç kargo satışı ve hiç model kiti bağı yok. Yani bu parçada kutu beş satır çizecek ve beşi de servis kaynaklı olacak; iş bu veriyle doğrulanabilir.
- **Bilinen tuzaklar:**
  - **Müşteri kaydı bir makinadır.** Aynı firmanın iki makinası iki ayrı `customers` kaydıdır, dolayısıyla iki satır olur (R4) ve aynı firma adı listede birden çok kez görünür. Beklenen davranıştır, satırları firma adına göre birleştirmek X4'tür.
  - **Tahsis edilmemiş kargo miktarı kaybolmamalı.** Model kırılımı onu "Modeli bilinmeyen" dilimine atıyor; müşteri kırılımı alıcıyı bildiği için R12 satırını yazar, yoksa satır toplamı parça adediyle tutmaz (R14).
  - **Aynı makinaya birden çok hareket.** Bir makinaya iki servis ve bir kargo tahsisinden aynı parça gelebilir; satır tek olmalı, adetler toplanmalı, hareket listesi (R7) üç satır göstermeli.
  - **Kuruşsuz hesap değil, adet hesabı.** Miktarlar tam sayıdır; servis satırının `miktar`'ı boş gelebilir ve bir sayılır (`analiz.js:85` bugünkü kural).
  - **Aşırı tahsis gerçek bir şekildir.** `TahsisModal` girişte kalanla sınırlıyor (`:19`, `:56`), ama 0111'in toplu düzenlemesi miktar düşürülürken elle tahsisleri olduğu gibi bırakıyor; o kayıtta tahsis toplamı satışın miktarını aşar ve bugünkü model kırılımının dilim toplamı da parçanın adedini aşar. Müşteri kırılımı aynı davranışta kalır (R14, X9).
  - **Serbest metinli tahsis yaygındır.** Müşteri silme kaskadı `makinaSerbest` alanına `silinenMakinaEtiketi` ile "AD · seri (silinen müşteri)" yazıyor; bu tahsisler ne `customerId` ne seri numarası taşır (R11/2).
  - **Boş durumun tek gerçek hâli parça listesinin boş olması.** R14 her adedi bir satıra yazdığı için seçili parçanın satırsız kalması veriyle üretilemez; kutunun boş durumu bugünkü `!secili` dalıdır (`bos-analiz`, "Parça yok."), seçili parçanın `toplam`'ı her zaman sıfırdan büyüktür (AC-26).
  - **Model kutusu bugün limitsiz.** Kutu `secili.modeller`'in tamamını çiziyor ve "Tümünü göster" taşımıyor; limit tablosunda `musteri` anahtarı yok. R6 bu yüzden yalnız Müşteri görünümüne uygulanır (R6/2, X10).
  - **Kıyas altını motorun bütün çıktısını tutuyor.** `tests/set-icerigi-0121-kiyas.test.js:57` `hesaplaAnaliz`'in dönüşünü `0121-once.json`'a yazıyor ve `toEqual` ile karşılaştırıyor; altındaki `parcalar` girdileri hareketli (`p:9`, servis 1, kargo 3), yani `parcalar[]`'a eklenen her alan o testi kırar (C1/2). Öteki iki çağıran güvenli: `set-parcalama-0130` kendi içinde önce ve sonrayı karşılaştırıyor, `evrak-finans-capraz` yalnız kalıp alanlarını alıyor.

### QA turunda ölçülenler (2026-11-23, HEAD `d3fa0cda`)

| # | Ölçüm | Sonuç |
|---|---|---|
| A | `analiz.js` satır atıfları | `parcaAnahtar` :15, `parcaGiris` :69, kargo döngüsü :93-108, `enCokServisliMakinalar` :128-131, miktar kuralı :85 doğru; servis döngüsü :82-91 (spec :83-92 diyordu) |
| B | `aliciAd` ve üç dalı | `yedekParcaSatis.js:203`; müşteride `"(müşteri yok)"`, dış firmada `"(dış firma)"`, bayide `"(bayi yok)"` |
| C | App'in Analiz çağrısı | `App.jsx:1791`, `dealers` prop'u yok; `liveDealers` :891'de hazır |
| D | `analiz.js`'i içe alanlar | `src` altında yalnız `Analiz.jsx`; döngü yok |
| E | `yedekParcaSatis.js`'in ağırlığı | sekiz yardımcı modül; tarayıcı globali yok; `yerelServis` modül düzeyinde küme tutuyor |
| F | 0121 kıyası | `set-icerigi-0121-kiyas.test.js:57` bütün çıktıyı altına yazıyor, `toEqual`; altındaki `parcalar` hareketli |
| G | Öteki iki çağıran | `set-parcalama-0130:195` kendi içinde kıyaslıyor, `evrak-finans-capraz:56` yalnız kalıp alanlarını alıyor |
| H | Aşırı tahsis | `TahsisModal:19`, `:56` girişte kalanla sınırlıyor; 0111 miktar düşerken elle tahsisi koruyor |
| I | Makinanın çözüm sırası | `makinaModeli` (:62-63) id çözülemezse de seri numarasına düşüyor |
| J | Serbest metinli tahsis | `musteriKaskad.silinenMakinaEtiketi:18-22` `makinaSerbest`'e "AD · seri (silinen müşteri)" yazıyor |
| K | Model kutusunun limiti | yok; `secili.modeller`'in tamamı çiziliyor, `LIMIT` tablosunda `musteri` anahtarı yok |
| L | Kutunun genişliği | `gridColumn: span 5`; aynı veriyi gösteren `enCokServisliMakinalar` tablosu 680 px'lik pencerede dört sütun kullanıyor |
| M | Pencere kalıbı | `Modal` başlığı `${baslik} · ${arr.length}`, `maxWidth={680}`, `maxHeight="82vh"` |
| N | Kanıt eşlemesi | `Analiz.jsx`'in üç kaydı var, hepsi `ayni`; eşlemede bugün hiç `degisti` kaydı yok |
| O | Kanıt aracı | `0009-sayfa.jsx:1142` `analiz-onayar`, `:1291` `analiz-bos`; ikisi de `dealers` vermiyor |
| P | Segment taraması | `suzgec-kaynak.test.js` Analiz'i tarıyor, `Segment` zorunlu, sayı envanteri yok, yeni segment taramayı kırmıyor |
| Q | Varsayılan seçim | `secili` = eşleşen parça ya da listenin ilki; `!secili` dalı `bos-analiz` "Parça yok." çiziyor |
| R | Metin taramaları | `finans-tahsil-0113:79` ve `set-uretimi-0121:262` `analiz.js`'in metnini tarıyor, içe alma grafiğini taramıyor |
| S | Canlı veri | veritabanı şifreli, 2026-11-22 ölçümü dışarıdan yeniden doğrulanamadı |
| T | Parça anahtarı | iki biçimli (`p:<id>` / `n:<ad>`), yani müşteri kırılımı da anahtara göre çalışmalı |

### QA turunda verilen kararlar (2026-11-23)

**Bloklayıcı**

- **B1. Tahsis edilmemiş miktarın satırı her zaman ayrıdır** ve yalnız alıcının adını taşır; satır anahtarı motordan gelir (R12, R12/2) — *neden:* alıcı müşteri olduğunda o kayıt zaten bir makinadır, birleştirmek "tahsis edilmedi" ibaresini yanlış kılar.
- **B2. Müşteri kırılımı her çağrıda döner**, opt-in bayrak yok; 0121 kıyası notlu ayıklamayla geçirilir, altın yenilenmez (C1/2) — *neden:* tek çağıran her zaman istiyor, bayrak ölü yük olur; kırılan altının çaresi spec'te yazılı olmazsa geliştirici altını yeniler ve kıyasın anlamı gider.
- **B3. Makinanın çözüm sırası bugünkü motorun sırasıdır:** id çözülemezse seri numarasına düşülür (R11) — *neden:* sıra ayrışırsa aynı hareket model ve müşteri kutusunda iki ayrı yere yazılır, C4 ve R14 birlikte bozulur.
- **B4. Serbest metinli tahsis kendi satırıdır** ve "Sistemde olmayan makina" ibaresi taşır; metin de boşsa çözülemeyen satıra düşer (R11/2) — *neden:* kaskad bu alana firma adını yazıyor, elimizdeki tek ipucunu kovaya atmak kutunun amacını boşa çıkarır.
- **B5. Boş durumun tek hâli parça listesinin boş olmasıdır** (AC-26 yeniden yazıldı) — *neden:* R14 her adedi bir satıra yazdığı için seçili parçanın satırsız kalması veriyle üretilemez, ulaşılamaz kriter ölü test doğurur.

**Önemli**

- **Ö1. R6 yalnız Müşteri görünümüne uygulanır**, Model limitsiz kalır (R6/2, X10) — *neden:* AC-1 ile tek uyumlu okuma bu.
- **Ö2. Başlık iki görünümde "Parça Kırılımı"**, açıklama cümlesi görünüme göre değişir (R1/2) — *neden:* "Model" sözcüğü Müşteri görünümünde yanlış olur.
- **Ö3. Satır çubuk desenini korur, ad hücresi iki satırlıdır** (R4/2) — *neden:* dar kutuda üç alan tek satıra sığmaz ve firma adı kesilir.
- **Ö4. Sıralama deterministiktir:** adet, firma adı, model, seri, kimlik (R5/2) — *neden:* tie-break yazılmazsa sıra veri sırasına kalır ve kanıt görüntüsü oynar.
- **Ö5. Tahsis edilmemiş satır normal sıraya girer**, yalnız çözülemeyen satır sonda (R5/3) — *neden:* alıcı adı bilgi taşıyor, sona atmak onu "bilinmiyor" sınıfına koyar.
- **Ö6. Satır ibareleri ve kaynak adları spec'te yazılıdır** ve kaynak lejanttan gelir (C7/2) — *neden:* aynı kavramın iki ifadesi kullanıcıya iki şey gibi görünür.
- **Ö7. Aşırı tahsiste kırpma yok**, R14 şartlı yazılır (R14, X9) — *neden:* kırpmak iki görünümü ayrıştırır, şartsız R14 ise ilk aşırı tahsisli kayıtta kırılır.
- **Ö8. Tarihin kaynağı satırda yazılır** ve Intent yumuşatılır (R15/2, Intent) — *neden:* aralık süzgeci satışın tarihini okuyor, başka tarih yazmak süzgeçle tutmayan liste üretir.
- **Ö9. Hareket listesi kayıt başına tek satırdır** (R7/2) — *neden:* aynı servisi iki kez yazmak bilgi katmaz, AC-8 zaten kayıt bazlı birleşme bekliyor.
- **Ö10. Hareket listesi her zaman açık**, eşit tarihte servis önce (R7/3) — *neden:* Analiz'in hiçbir penceresinde katlanır satır yok ve sıra yazılmazsa pencere her açılışta farklı dizilir.
- **Ö11. Kanıt eşlemesinde onaylı `degisti` kaydı** yazılır, kapanışta `ayni`ye çevrilir (C8) — *neden:* segment satırı `analiz-onayar`'ı sıfır piksel olmaktan çıkarıyor, kayıt atlanırsa iş kapanışta durur.
- **Ö12. Model görünümünün ekran metni de kıyasla sabitlenir** (C4/2) — *neden:* AC-1'i bugün yalnız göz kararı sınıyor.

**Küçük**

- **K1. Pencerenin başlığı "Parçanın Takıldığı Makinalar"** (R6/3) — *neden:* öteki altı pencere başlığıyla aynı dil, sayı kalıptan geliyor.
- **K2. Sekizin tek kaynağı limit tablosudur** (R6/4) — *neden:* iki yerde yazılan sayı zamanla ayrışır.
- **K3. Çıktının adı ve satırın şekli yazılıdır** (C1/3) — *neden:* C1'in "ekran satır üretmez" kuralı ancak alan adı yazılıysa denetlenebilir.
- **K4. Boş seri ya da model `"—"` yazar** (R4/3) — *neden:* `enCokServisliMakinalar` tablosunun bugünkü emsali.
- **K5. Sekmeden dönünce görünüm Model'e döner** (R3/2) — *neden:* R3'ün "kaydedilmez"i "oturum boyunca korunur" diye okunabilir.
- **K6. `aliciAd` doğrudan içe alınır**, ağırlığı ölçüm olarak yazılır (C2/2) — *neden:* bugün çalışıyor ve en az koddur; ölçüm yazılmazsa sonraki okuyucu motorun saflığının bozulduğunu sanır.
- **K7. Servis döngüsünün satır atfı :82-91 olarak düzeltildi** (Context) — *neden:* ölçüm belgesi, atıf kayarsa güven kaybeder.
- **K8. Canlı veri ölçümünün tarihi ve yöntemi yazıldı** (Context) — *neden:* veritabanı şifreli, ölçüm dışarıdan yeniden üretilemiyor.
- **K9. Altın `dealers` verilmeden üretilir** ve yalnız dört alan karşılaştırılır (C4/3) — *neden:* yeni alan altına girerse kıyas kendi kendini onaylar.
- **K10. Segment düğme kipinde kalır** (C7/3) — *neden:* Analiz'in tarih çubuğu da düğme kipinde, kart içi sekme çizgisi başlık çizgisiyle çakışır.
- **K11. Adedin yanında "adet" birimi yazılır** (R7/4) — *neden:* tarih ve kaynakla aynı satırda çıplak sayı tutar gibi okunabilir.
- **K12. İki yakın ibare ayrı kalır** (C7/4) — *neden:* biri tahsis edilmemiş kargonun alıcısı, öteki çözülemeyen hareket kovası.

### QA turu karar kaydı (2026-11-23)

| # | Konu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| B1 | Tahsis edilmemiş satırın kimliği | Bloklayıcı | Her zaman ayrı satır, yalnız alıcı adı, anahtar motordan | R12, R12/2 |
| B2 | Yeni alanın dönüşü ve kırılan altın | Bloklayıcı | Her çağrıda döner, 0121 kıyası ayıklamayla geçer | C1/2, AC-35, AC-36 |
| B3 | Makinanın çözüm sırası | Bloklayıcı | Bugünkü sıra: id çözülemezse seri | R11, AC-37 |
| B4 | Serbest metinli tahsis | Bloklayıcı | Kendi satırı, "Sistemde olmayan makina" | R11/2, AC-38, AC-39 |
| B5 | Ulaşılamaz boş durum | Bloklayıcı | Boş durum = parça listesi boş | AC-26 |
| Ö1 | R6'nın kapsamı | Önemli | Yalnız Müşteri görünümü | R6/2, X10, AC-40 |
| Ö2 | Başlık ve açıklama | Önemli | "Parça Kırılımı" + görünüme göre cümle | R1/2, AC-41 |
| Ö3 | Satırın biçimi | Önemli | Çubuk deseni, iki satırlı ad hücresi | R4/2, AC-42 |
| Ö4 | Sıralamanın ölçütleri | Önemli | Adet, firma, model, seri, kimlik | R5/2, AC-43 |
| Ö5 | Tahsissiz satırın yeri | Önemli | Normal sırada | R5/3, AC-44 |
| Ö6 | Metin sabitleri | Önemli | İbareler yazılı, kaynak lejanttan | C7/2, AC-45 |
| Ö7 | Aşırı tahsis | Önemli | Kırpma yok, R14 şartlı | R14, X9, AC-46 |
| Ö8 | Tarihin kaynağı | Önemli | Satır satış tarihi olduğunu yazar | R15/2, Intent, AC-47 |
| Ö9 | Hareketin birimi | Önemli | Kayıt başına tek satır | R7/2, AC-48 |
| Ö10 | Hareket listesinin hâli | Önemli | Her zaman açık, eşit tarihte servis önce | R7/3, AC-49 |
| Ö11 | Kanıt eşlemesi | Önemli | Onaylı `degisti`, kapanışta `ayni` | C8, AC-50 |
| Ö12 | Model görünümünün kıyası | Önemli | Ekran metni de sabitlenir | C4/2, AC-51 |
| K1 | Pencere başlığı | Küçük | "Parçanın Takıldığı Makinalar" | R6/3, AC-52 |
| K2 | Sekizin kaynağı | Küçük | Limit tablosunda `musteri` | R6/4, AC-53 |
| K3 | Çıktının adı | Küçük | `musteriler` + satır şekli | C1/3, AC-34 |
| K4 | Boş seri ve model | Küçük | `"—"` | R4/3, AC-54 |
| K5 | Sekme değişimi | Küçük | Model'e döner | R3/2, AC-55 |
| K6 | İçe alımın ağırlığı | Küçük | Doğrudan içe alma, ölçüm yazılı | C2/2, AC-56 |
| K7 | Satır atfı | Küçük | :82-91 | Context ölçüm A |
| K8 | Canlı veri ölçümü | Küçük | Tarih ve yöntem yazılı | Context ölçüm S |
| K9 | Altının üretimi | Küçük | `dealers`'sız, dört alan | C4/3, AC-57 |
| K10 | Segment kipi | Küçük | Düğme kipi | C7/3, AC-58 |
| K11 | Adet birimi | Küçük | "adet" yazılır | R7/4, AC-59 |
| K12 | İki yakın ibare | Küçük | Ayrı kalır | C7/4, AC-60 |

### Plan turunda verilen kararlar (2026-11-23)

Takım Yöneticisi analistin on bir önerisini kabul etti (plan `specs/0154-uygulama-plani.md`).

- **P1. Tahsis edilmemiş satır alıcı başınadır** (R12): anahtar alıcı türü ve kimliğinden kurulur (dış firmada Türkçe küçültülmüş ad, bayisi bulunamayanda `dealerId`); aynı alıcının satışları hareket listesinde ayrı görünür — *neden:* kutunun sorusu "kime gitti"; satış başına satır aynı bayiyi listeye defalarca yazar.
- **P2. Dört anahtar biçimi** (R12/2, AC-34): makina `m:`, tahsis edilmemiş `t:`, serbest metin `s:`, çözülemeyen `x:`; aynı serbest metin (kırpılmış, Türkçe küçültülmüş) tek satırdır. AC-34'ün "üç satır türü" ifadesi R11/2'nin serbest metin satırıyla dörde çıkar — *neden:* serbest metin satırı R11/2 ile ayrı tür oldu, anahtarı da ayrı olmalı.
- **P3. `"—"` makina satırında motor yazar** (R4/3, AC-54; `enCokServisliMakinalar` emsali); öteki üç türde `model` ve `serialNo` `null`dır, ekran ikinci satıra türün ibaresini yazar (AC-33) — *neden:* ekran satır alanı üretmez, sıralama aynı değeri okur.
- **P4. Görünüm segmenti kartın başlık satırındaki eylem yuvasındadır** — *neden:* kutunun gövdesi yeni satır almaz (AC-1'in "gövde aynı" iddiası), dar kutuda dikey yer harcanmaz; yer kalmazsa yuva sarar.
- **P5. Tarihsiz hareket** (aralık verilmediğinde) listenin sonunda "Tarihsiz" yazısıyla durur.
- **P6. Kargo hareketinin tarihi arkasında soluk "(satış tarihi)" ibaresi taşır** (AC-22, AC-47), yalnız kargoda; metin tek sabit.
- **P7. Çubuk rengi:** makina, serbest metin ve tahsis edilmemiş satır servis turuncusu; çözülemeyen satır Model görünümünün "bilinmeyen" dilimi gibi gri ve taralı — *neden:* R5/3 tahsis edilmemiş satırı bilgi taşıyan normal satır sayıyor.
- **P8. AC-50'nin yöntemi:** `Analiz.jsx`'in eski üç `ayni` kaydına dokunulmaz (eski raporlara bağlılar ve o raporlarda fark sıfır); bu işin raporunda `analiz-onayar` için onaylı `degisti` kaydı eklenir, kapanışta taban raporuyla `ayni`ye çevrilir — *neden:* eski kaydı `degisti` yapmak eşleme testini kırar (0156'da yaşandı).
- **P9. AC-55 gerçek App'le ölçülür;** aynı test App'in `dealers` bağını da sınar — *neden:* sıfırlanma App'in koşullu çiziminden gelir.
- **P10. 0121 kıyasının ayıklaması** `analiz.parcalar[*].musteriler`'i siler; altın dosyaya dokunulmaz (0124 emsali).
- **P11. Döngü yok ölçüldü:** `yedekParcaSatis.js`'in içe aldığı sekiz modülün hiçbiri `analiz.js`'i almıyor; AC-56 taramayla sabitler, çıktıya para alanının girmediği anahtar kümesiyle sınanır.

---

## Acceptance Criteria

- **AC-1.** Analiz açıldığında kutu Model görünümündedir: model çubukları ve "Modeli bilinmeyen" açıklaması bugünkü ekranla aynıdır.
- **AC-2.** Görünüm geçişi segment olarak çizilir, erişilebilir adı "Parça kırılımı görünümü", iki seçeneği "Model" ve "Müşteri".
- **AC-3.** "Müşteri" seçilince model çubukları yerine makina satırları çizilir; "Model" seçilince geri döner.
- **AC-4.** Müşteri görünümündeyken parça seçicisinden başka parça seçilince görünüm Müşteri kalır ve satırlar yeni parçanın satırlarıdır.
- **AC-5.** Müşteri görünümündeyken tarih aralığı önayarı değiştirilince görünüm Müşteri kalır.
- **AC-6.** Serviste bir adet parça değişen makinanın satırı firma adını, modeli ve seri numarasını yazar, adedi 1'dir.
- **AC-7.** Aynı firmanın iki makinası iki ayrı satır olur.
- **AC-8.** Aynı makinaya iki ayrı servis kaydında takılan parça tek satırda toplanır, adet 2 olur.
- **AC-9.** Servis satırının miktarı boş ya da sıfır olduğunda adet 1 sayılır.
- **AC-10.** Kargo satışının tahsis edilmiş miktarı tahsisin makinasının satırına yazılır.
- **AC-11.** Tahsisin `customerId`'si boş, seri numarası dolu olduğunda makina seri numarasından çözülür.
- **AC-12.** Tahsis edilmemiş kargo miktarı alıcı adıyla kendi satırında görünür ve satır makinanın tahsis edilmediğini yazar.
- **AC-13.** Alıcı bayi olduğunda satır bayinin adını yazar.
- **AC-14.** Alıcı anlaşmasız dış firma olduğunda satır dış firmanın adını yazar.
- **AC-15.** Alıcı bayinin kaydı bulunamadığında satır `aliciAd`'ın bugünkü yedek metnini yazar ve kutu çizilmeye devam eder.
- **AC-16.** Müşterisi çözülemeyen servis hareketleri tek satırda toplanır ve satır listenin sonundadır.
- **AC-17.** Satırların adet toplamı, parça listesindeki o parçanın toplam adedine eşittir (servis + kargo); şart, hiçbir satışın tahsis toplamının o satışın miktarını aşmamasıdır.
- **AC-18.** Satırlar adet azalan sırada gelir; iki satırın adedi eşitse firma adına göre sıralanır.
- **AC-19.** Müşteri görünümünde sekizden çok satır olduğunda kutuda ilk sekiz satır ve "Tümünü göster (n)" düğmesi görünür, n toplam satır sayısıdır; sekiz sayısı ekranın limit tablosundan okunur.
- **AC-20.** Pencere açıldığında bütün satırlar listelenir.
- **AC-21.** Pencerede bir makinanın hareket listesi tarih, kaynak ve adet yazar; tarih azalan sırada.
- **AC-22.** Servis hareketinin tarihi servis tarihidir, kargo hareketinin tarihi satışın tarihidir; kargo hareketinin satırı tarihin satışın tarihi olduğunu yazar.
- **AC-23.** Tarih aralığı verildiğinde aralık dışındaki servis ve kargo hareketleri hiçbir satıra girmez.
- **AC-24.** Tarihsiz servis ve kargo kaydı, aralık verildiğinde hiçbir satıra girmez; aralık verilmediğinde girer.
- **AC-25.** Onarım yeri "Kargo" olan servis kaydı müşteri kırılımına girmez.
- **AC-26.** Aralıkta hiç parça hareketi olmadığında kutu bugünkü boş durumunu çizer (`bos-analiz`, "Parça yok.") ve Müşteri görünümünde de aynı metin görünür; seçili bir parçanın satırsız kalması veriyle üretilemez (R14).
- **AC-27.** Kutuda ve pencerede hiçbir para tutarı yoktur (ekran ölçümü ve kaynak taraması).
- **AC-28.** `dealers` verilmeden çağrılan motor çalışır ve bayi alıcılı satır `aliciAd`'ın yedek metnini taşır.
- **AC-29.** Motorun `modeller` çıktısı, bu spec'ten önceki kodla ve `dealers` verilmeden üretilmiş altın dosyayla birebir aynıdır (`tests/fixtures/0154-once.json`); karşılaştırma `parcalar[]`'ın `modeller`, `servis`, `kargo` ve `toplam` alanlarına uygulanır.
- **AC-30.** Kaynak taraması: müşteri kırılımını hesaplayan ikinci bir yer yok, alıcı adı yalnız `aliciAd`'dan okunuyor, ekran satır sıralaması ya da toplaması yazmıyor.
- **AC-31.** Kaynak taraması: yeni veritabanı sütunu, yeni izin kimliği ve yeni sunucu kuralı eklenmedi.

### QA turu kriterleri (2026-11-23)

- **AC-32.** Tahsis edilmemiş miktar her zaman kendi satırındadır: alıcı müşteri olup aynı satıştan o müşterinin makinasına tahsis yapıldığında iki satır görünür.
- **AC-33.** Tahsis edilmemiş satır model ve seri numarası yazmaz; yalnız alıcının adını ve "Tahsis edilmedi" ibaresini taşır.
- **AC-34.** Her satırın anahtarı motorun çıktısındadır ve üç satır türü ayrı anahtar biçimi taşır; ekran anahtar üretmez (kaynak taraması).
- **AC-35.** Müşteri kırılımı seçeneksiz her çağrıda döner; motorun imzasına opt-in bayrak eklenmez (kaynak taraması).
- **AC-36.** `tests/set-icerigi-0121-kiyas.test.js` "spec 0154 ile" notlu ayıklamayla geçer ve `tests/fixtures/0121-once.json` yenilenmez.
- **AC-37.** Tahsisin `customerId`'si dolu ama kaydı bulunamıyorsa makina seri numarasından çözülür; aynı hareket model ve müşteri görünümünde aynı makinaya yazılır.
- **AC-38.** `makinaSerbest`'i dolu, müşterisi çözülemeyen tahsis kendi satırında görünür ve satır "Sistemde olmayan makina" ibaresi taşır.
- **AC-39.** `makinaSerbest`'i de boş olan çözülemeyen tahsis "Müşterisi bulunamayan hareketler" satırına düşer.
- **AC-40.** Model görünümünde limit ve "Tümünü göster" düğmesi yoktur; bütün model çubukları çizilir.
- **AC-41.** Kutunun başlığı iki görünümde de "Parça Kırılımı"dır; açıklama cümlesi görünüme göre değişir ve iki cümle tek metin kümesinden okunur.
- **AC-42.** Müşteri satırının ad hücresi iki satırlıdır: üstte firma adı, altında küçük puntoda model ve seri numarası.
- **AC-43.** Adedi eşit iki satır firma adına, o da eşitse modele, sonra seri numarasına, sonra kayıt kimliğine göre sıralanır (Türkçe karşılaştırma).
- **AC-44.** Tahsis edilmemiş satır adedine göre normal sıraya girer; yalnız "Müşterisi bulunamayan hareketler" satırı listenin sonundadır.
- **AC-45.** Satır ibareleri ve hareket kaynağı adları tek metin kümesinden gelir; kaynak adları kutunun lejant metinleridir (kaynak taraması).
- **AC-46.** Tahsis toplamı satışın miktarını aşan kayıtta kırpma yapılmaz; müşteri kırılımının toplamı model kırılımının toplamıyla aynı olur.
- **AC-47.** Hareket satırı kargoda tarihin satışın tarihi olduğunu yazar; tahsis tarihi hiçbir yerde görünmez.
- **AC-48.** Aynı servis kaydının aynı parçayı taşıyan iki satırı hareket listesinde tek satırdır, adetleri toplanır.
- **AC-49.** Hareket listesi her zaman açık çizilir; aynı tarihli iki harekette servis hareketi kargo hareketinden önce gelir.
- **AC-50.** `docs/evidence/kanit-eslemesi.json`'da `analiz-onayar` kaydı bu iş sırasında onaylı `degisti`dir ve spec `specs/done/`'a taşınırken `ayni`ye çevrilir.
- **AC-51.** Model görünümünün ekran metni (çubuklar ve "Modeli bilinmeyen" açıklaması) kıyas altınıyla birebir aynıdır.
- **AC-52.** Pencerenin başlığı "Parçanın Takıldığı Makinalar"dır ve satır sayısını pencerenin bugünkü kalıbından alır.
- **AC-53.** Sekiz sayısı yalnız ekranın limit tablosunda yazılıdır (kaynak taraması).
- **AC-54.** Seri numarası ya da modeli boş makinanın satırı o alanda `"—"` yazar.
- **AC-55.** Analiz sekmesinden çıkıp dönüldüğünde görünüm Model'dir ve seçili parça sıfırlanmıştır.
- **AC-56.** Motor `aliciAd`'ı `yedekParcaSatis.js`'ten içe alır, ikinci bir alıcı adı çözümü yoktur, içe alma döngü oluşturmaz ve motorun çıktısına hiçbir para alanı girmez (kaynak taraması).
- **AC-57.** `0154-once.json` `dealers` verilmeden üretilmiştir ve yeni alan altın dosyada yoktur.
- **AC-58.** Görünüm segmenti düğme kipinde çizilir (`aria-pressed`), sekme kipinde değil.
- **AC-59.** Hareket satırı adedin yanında "adet" birimini yazar.
- **AC-60.** `aliciAd`'ın "(müşteri yok)" yedek metni ile "Müşterisi bulunamayan hareketler" satırı aynı ekranda ayrı iki ibare olarak görünür.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap React'sız **saf motorda** (`analiz.js`) yazıldı ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Aynı sayıyı üreten başka bir ekran yok; satır toplamı parça listesinin adediyle çapraz testle eşitlendi (AC-17).
- [ ] Yeni kalıcı alan yok; bu açıkça yazıldı.
- [ ] Yeni veri bölümü yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; iş salt okunur olduğu için izin eklenmediği açıkça yazıldı.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı yok.
- [ ] Para gösterilmiyor; bu kaynak taramasıyla sabitlendi (AC-27).
- [ ] Arayüz kriterlerinin **görsel kanıtı** eklendi (`docs/evidence/0154-*`), boş durum dâhil.
- [ ] Müşteri kırılımı her çağrıda dönüyor; `0121-once.json` kıyası "spec 0154 ile" notlu ayıklamayla geçti ve altın yenilenmedi.
- [ ] Üç satır türünün anahtarı motordan geliyor; ekran anahtar üretmiyor, satır sıralamıyor, toplamıyor (kaynak taraması).
- [ ] Tahsis edilmemiş ve serbest metinli tahsisin satırları ayrı; çözülemeyen satır listenin sonunda.
- [ ] R14 çapraz testi tahsis aşımı şartıyla yazıldı; aşan kayıtta iki görünüm aynı adedi veriyor.
- [ ] Model görünümünün ekran metni kıyasla sabitlendi (C4/2).
- [ ] Kanıt eşlemesinde `analiz-onayar` kaydı onaylı `degisti` olarak yazıldı, kapanışta `ayni`ye çevrildi; kanıt aracına Analiz'in `dealers` girdisi ve üç yeni ekran eklendi.
- [ ] Motorun `yedekParcaSatis` içe alımı ölçüldü (döngü yok, tarayıcı globali yok, çıktıya para alanı girmiyor) ve ölçüm Context'te yazılı.
- [ ] Satır ibareleri ve hareket kaynağı adları tek metin kümesinde; metinler spec'te yazılı.
- [ ] `0154-once.json` spec öncesi kodla üretildi ve model kırılımı birebir geçti.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Yeni kavram veya mimari karar varsa `CLAUDE.md` güncellendi.
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
