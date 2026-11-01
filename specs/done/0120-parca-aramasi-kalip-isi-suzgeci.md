# 0120 — Kalıp kutusu işaretliyken parça araması kalıp işiyle başlar

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 2: QA turu Karar 3–28 ve plan turu Karar 29–40, 2026-11-01; uygulamada Karar 41; uygulama commit `1d5b75c`; plan `specs/done/0120-uygulama-plani.md`) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/components/ServiceForm.jsx` (yalnız "Değişen Parçalar (varsa)" alanı), `src/lib/kalipTamiri.js` (yeni saf süzme yardımcısı ve metin sabitleri). **Test:** yeni `tests/parca-suzgeci-0120.test.js` ve `tests/ui/parca-suzgeci-0120.test.jsx`. **Kanıt:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`. **Belge:** `CLAUDE.md`, `docs/tasarim-sozlugu.md` (R15), `specs/README.md` (kuyruk satırı ve tablo satırı **zaten yazılı**, kapanışta yalnız "(Tamamlandı)" işareti düşer). **Dokunulmayan iki dosya adıyla:** `src/components/ui.jsx` (R13/2, C6) ve `src/components/KalipAtolyeAlani.jsx` (R8/3, C6). Veri şeması, göç, izin tanımları, sunucu kuralları, birleştirme, yazdırma ve dışa aktarma dokunulmaz. |
| **Bağımlı spec'ler** | 0115 (parça tipinin `kalipIsi` bayrağını, `parcaKalipIsiMi` dedektörünü ve "Kalıp atölyeye girecek" kutusunu kuran spec). 0117, 0118 ve 0119 ile ortak dosyası yoktur. |
| **Ters çevrilen kriterler** | Yok, ve bu üç taramayla doğrulandı: 0115'in `.kalipIsi` okuyucu taraması (`tests/kalip-tamiri-0115.test.js:201`, yalnız `PartTypeManager.jsx` ve `kalipTamiri.js`) yeni yardımcı saf modüle yazıldığı sürece dokunulmadan geçer; `atolyeKaliplari:` yazıcı taraması (`:199`) etkilenmez; `tests/suzgec-kaynak.test.js`'in süzgeç çubuğu listesi sabit bir sayımdır ve `ServiceForm` ona eklenmez. 0115'in form kriterleri kutuyu, ön doldurmayı ve üç kaynağı ölçüyor; hiçbiri parça arama kutusunun kümesini iddia etmiyor. |

---

## Intent

Servis formunda kalıp atölyeye gireceği işaretlendiğinde, teknisyenin aradığı parça neredeyse her zaman bir kalıp revizesi kalemidir, ama arama kutusu kataloğun tamamını, 380 parçayı listelemeye devam ediyor. Kalıp işi tipli parça sayısı yedi; yani doğru kalem 380 satırın içinde kayboluyor ve yanlış kalem seçmek kolay. Takım Yöneticisi bu listenin kutu işaretlenince kalıp işi kalemlerine inmesini istiyor. Bu iş bittiğinde kutu işaretli serviste arama kutusu yedi kalemle açılır, kalıbın dışındaki parçalar tek tıkla geri gelir ve servis kaydının kendisi hiç değişmez.

---

## Requirements

### A. Süzgeç

- **R1.** "Kalıp atölyeye girecek" kutusu işaretliyken "Değişen Parçalar (varsa)" arama kutusu yalnız **kalıp işi tipli** parçaları listeler.
- **R1/2.** Süzülmüş kümeyi, rozet sayısını ve R6'nın kararını veren **tek saf yardımcı** `kalipTamiri.parcaSuzgeci(parts, partTypeDefs, tumu)`'dur ve tek çağrıda `{ liste, kalipSayisi, suzulebilir, suzuluMu }` döner. Üç ayrı yardımcı yazılmaz: segmentin rozeti ile listenin kümesi ayrı yollardan türerse birbirine aykırı düşebilir.
- **R2.** Süzme kapalıya alınabilir: alanın içinde iki değerli bir süzgeç durur, **Kalıp işi** ve **Tüm parçalar**. Varsayılan değer **Kalıp işi**'dir, "Tüm parçalar" tek tıktır ve bütün kataloğu geri getirir.
- **R2/2.** Süzgecin iki seçeneği sayı rozeti taşır: kalıp işi tipli parça sayısı ve katalogdaki canlı parça sayısı. Erişilebilir adlar `Kalıp işi (n)` ve `Tüm parçalar (m)` biçimindedir.
- **R2/3.** Süzgeç ve ibare arama kutusunun **üstünde**, bugünkü kabın (`ServiceForm.jsx:395`) içinde ve şu sırada durur: süzgeç, ibare, arama kutusu. `SearchPick`'in sonuç paneli kutunun altına mutlak konumla çizilir (`ui.jsx:186`), yani altına konan her şeyi tam kullanıcı listeyi okurken örter; kutunun üstü panel açıkken görünen tek yerdir. Yerleşim `ui.jsx`'e dokunmadan kurulur.
- **R2/4.** Süzgeç `Segment` `kip="dugme"`, `genislik="icerik"`, `ariaLabel="Parça listesi süzgeci"`. İçerik genişliği iki kısa etiketin alanın tamamına yayılmasını engeller.
- **R2/5.** Rozet sayıları: `Tüm parçalar`'ın sayısı prop'un geldiği hâliyle `parts.length`'tir (forma gelen dizi App'te zaten çöpten süzülmüş, `App.jsx:877`), ikinci bir `deletedAt` süzmesi yazılmaz. `Kalıp işi`'nin sayısı sıfır olduğunda R6 R2'den önce geldiği için segment hiç çizilmez: ekranda hiçbir hâlde `(0)` rozeti görünmez. `Segment` sıfır için de rozet çizer (`tasarim.jsx:53`, ölçüt `sayi != null`), yani korumanın yeri R6'dır.
- **R3.** Kutu işaretli değilken süzgeç **çizilmez** ve liste bugünkü tam listedir. Alanın bugünkü yerleşimi, yer tutucusu ("Parça ara...") ve seçim davranışı değişmez.
- **R4.** Süzülü hâlde alanın içinde tek satırlık bir ibare durur: liste süzülmüş, nedeni kalıp kutusunun işaretli olması. İbare olmadan boşalmış liste bozuk görünür.
- **R4/2.** İbare `Ipucu` ile çizilir (`UyariSeridi` değil: bir şey bozulmuş değil, alanın durumu açıklanıyor; `ServiceForm` `Ipucu`'yu zaten içe alıyor) ve `data-testid="parca-suzgec-ibaresi"` taşır; R6'nın neden satırı `data-testid="parca-suzgec-neden"`. Adlandırma 0093'ün `plan-suzgec-ibaresi` ve 0092'nin `kapsam-suzgec-ibaresi` çizgisini sürdürür.
- **R4/3.** İbare arama paneli **açıkken de** görünür kalır. Boş sonucu açıklayan şey budur: kullanıcı panelde `Bulunamadı.` görürken hemen üstünde listenin süzüldüğünü ve kaçış kapısını görür.
- **R5.** Arama yazısı süzülmüş kümenin **içinde** arar: "Kalıp işi" seçiliyken Standart tipli bir parçanın adı yazılsa da sonuç gelmez; arama kutusunun bugünkü "sonuç yok" metni çıkar.
- **R5/2.** Süzgeç değişirken ve kutu işaretlenirken **yazılmış arama metni korunur**: metin kullanıcının niyetidir ve kümeyi genişletmek istediğinde yeniden yazmak zorunda kalmaz. `SearchPick` metni kendi durumunda tutuyor (`ui.jsx:163`) ve dışarıdan temizlenemez; bileşen `key` ile yeniden kurulmaz. Stale metnin boş liste göstermesi R4/3'ün ibaresiyle açıklanır.
- **R6.** **Süzme kümeyi boşaltamaz.** Kalıp işi tipli parça yoksa (katalogda böyle bir tip tanımlı değil, bütün parçalar başka tipte, ya da parça tipi listesi boş geldi) süzme uygulanmaz: tam liste çizilir, süzgeç çizilmez ve ibare yerine nedeni yazılır. Boş bir seçim listesi kullanıcıya kataloğu silinmiş gibi gösterirdi.
- **R6/2.** R6'nın kapsamı `partTypeDefs`'in **`null` ve `undefined`** hâllerini de içerir (boş dizinin yanında, adıyla); yardımcı dizi olmayan her değerde tam kataloğu döndürür. `parcaKalipIsiMi` dizi olmayan değerde her parça için `false` döner (`kalipTamiri.js:51`), yani naif süzme orada da listeyi boşaltırdı. `null` üç çağırandan ikisinin canlı varsayılanıdır (`ServisPanosu.jsx:92`, `ServisPencere.jsx:22`) ve formu tip listesi olmadan çizen tek mevcut testin hâlidir (0115 AC-81, `partTypeDefs={null}` ile kutuyu tıklıyor).
- **R6/3.** Neden **tek cümledir** ve kalıp işi işaretli tip bulunmamasına nişanlıdır; tip listesinin hiç gelmemesi sessizce aynı cümleye düşer. İkinci bir cümle ölü metin olurdu: App her üç bağlamda `livePartTypeDefs` geçiriyor (`App.jsx:1432`, `:1706`, `:1738`), yani `null` gerçek uygulamada oluşmaz. Cümle kullanıcıya yapacağı şeyi söyler (parça tipine kalıp işi işareti vermek), bir kablolama hatasını değil.
- **R7.** Süzgeç yalnız parça **arama** kutusunu etkiler. Altındaki "Seçilen Parçalar" listesi süzülmez: kutu işaretlenmeden önce eklenmiş Standart tipli parçalar olduğu gibi kalır, kaldırılmaz ve gizlenmez.
- **R7/2.** Süzgeç açıkken sepetteki Standart tipli satır yalnız durmakla kalmaz, **düzenlenebilir kalır**: adet ve fiyat kutuları yazılabilir, dış tedarik düğmesi ve çöp düğmesi çalışır. Satırlar bugün yalnız `form.degisenParcalar`'ı okuyor (`ServiceForm.jsx:409-472`), yani yapı gereği bağışık; bir süzgecin var olan sepeti sessizce bozabileceği tek yer budur ve iddia üç satırdır.
- **R8.** Süzgecin değeri geçici arayüz durumudur: servis kaydına, forma ya da taslağa yazılmaz.
- **R8/2.** Kutu kaldırılınca süzgeç kaybolur ve liste tam listeye döner; kutu yeniden işaretlenince süzgeç **varsayılan değeriyle** (Kalıp işi) gelir, kullanıcı daha önce "Tüm parçalar"ı seçmiş olsa da. Kutunun amacı budur ve her açılışta aynı davranması beklenir.
- **R8/3.** Sıfırlamanın sahibi `ServiceForm`'dur ve mekanizma tektir: yerel `tumParcalar` durumu kutu **kapanınca** sıfırlanır (`useEffect`, bağımlılık `kutuAcikMi(form)`). Onay kutusu `KalipAtolyeAlani.jsx:49`'dadır ve `ServiceForm` ona erişemez (`kutuDegistir` `:31`, `form._kalipAtolye`'yi yazar); React'te çizim sırasında durum sıfırlanamaz. Kutu kapalıyken değer her zaman varsayılan olduğu için R8/2 yapı gereği sağlanır, `KalipAtolyeAlani` dokunulmaz ve bütün alan `key` ile yeniden kurulmaz.
- **R9.** Davranış servis formunun üç bağlamında da aynıdır: müşteri detayındaki "Yeni Servis Talebi", Servis ve Kargo Panosu'nun kendi formu ve panonun ayrı penceresi. Form tektir, üçünde de aynı bileşen çizilir.
- **R9/2.** Ayrı pencerenin ölçümü `ServisPencere`'nin `partTypeDefs` taşıyan anlık görüntüsüdür (`ServisPencere.jsx:93`). Köprü **dokunulmaz**: `partTypeDefs` `BOS`'ta vardır ama `YAZILABILIR`'de yoktur (`:15`, `:22`, salt okunur) ve bu satır 0115 AC-95'in taramasıyla sabittir; listeye eklenmesi o kriteri ters çevirir. Yeni prop zinciri de açılmaz: üç çağıran da `partTypeDefs`'i bugün geçiriyor (`CustomerDetailModal.jsx:1514`, `ServisPanosu.jsx:1011`, `ServisPencere.jsx:93`).
- **R10.** "Kalıp işi mi" sorusunun ölçütü **parçanın tipidir**, adı değil; mevcut `parcaKalipIsiMi` dedektörü yeniden yazılmaz. Süzülmüş kümeyi veren saf yardımcı `lib/kalipTamiri.js`'e yazılır, ekran kendi tip karşılaştırmasını yazmaz.
- **R10/2.** Süzgecin ve ibarenin metinleri tek sabittir ve aynı modülün metin bölümünde durur (0115 R39 deseni); ekranda ikinci kopyası yazılmaz.
- **R10/3.** Metin sabitleri: segmentin ilk seçeneği **var olan** `KALIP_ISI_BAYRAGI`'nı (`kalipTamiri.js:35`, parça tipi panelinin bayrak etiketi) yeniden kullanır; aynı değerli ikinci bir sabit yazılmaz, yoksa R10/2 kurulduğu anda ihlal edilirdi. Yeni sabit **üçtür**: `Tüm parçalar`, süzülü ibare ve R6/3'ün neden cümlesi.

### B. Değişmeyenler

- **R11.** Kutunun kendisi, ipucusu, öneri şeridi ("Bu serviste kalıp işi kalemi var…"), kutu açılınca kalıp listesinin ön doldurulması ve üç kaynak bölümü (kalemler, firmanın kayıtlı kalıpları, elle giriş) **aynen kalır**.
- **R12.** Servis kaydının gövdesi değişmez: yeni alan, yeni anahtar ve göç yoktur.
- **R13.** Aynı yer tutucuyu paylaşan öteki dört arama kutusu (yedek parça satışı formunun iki kutusu, Parça Stoğu ve Analiz) **dokunulmaz**; süzgeç yalnız servis formunun kutusuna gelir.
- **R13/2.** `src/components/ui.jsx` bu işte hiç değişmez ve `SearchPick`'in imzası (`ui.jsx:162`) aynı kalır. Süzgecin bileşenin içine taşınıp prop'la kapılanması, bu kuralı beş arama kutusunun önüne tek satırla koyardı; R13'ün bugün bunu yakalayacak bir koruması yok, R16 onu kurar.
- **R14.** Katalogda hiç canlı parça yoksa bugünkü "Tanımlı yedek parça yok." ipucu aynen çizilir; süzgeç bu dalda yoktur.

### C. Borç kaydı, tarama ve kanıt (QA turu, 2026-11-01)

- **R15.** Tasarım sözlüğünün (`docs/tasarim-sozlugu.md`) "Bilinen borç" bölümüne `stock/MakinaStokTab.jsx:330-335`'in onay kutusu bu süzgecin **yakın kopyası** olarak yazılır, üçüncü kopyadan önce ortak bileşene taşınma cümlesiyle. Aynı soruya iki biçim borçtur ve borç sözlükte durur (ölçüm 8, C4/2).
- **R16.** `ui.jsx`'in bu işte değişmediği ve `SearchPick`'in imzasının aynı kaldığı kaynak taramasıyla ölçülür (R13/2'nin koruması; parametre listesi karşılaştırması).
- **R17.** Kanıt kayıtları **kodu değişen dosyanın** anahtarına yazılır. Üç yeni ekran `ServiceForm.jsx` anahtarında `beklenen: "degisti"` + onay ile durur. Kutu açık hâlde formu çizen altı mevcut ekran (`servis-formu-0115-acik`, `-kayitli`, `-bos-hata`, `-ad-hata`, `servis-formu-0117-sevk`, `-fabrika`) bugün `KalipAtolyeAlani.jsx` anahtarında `beklenen: "ayni"` duruyor; hangisinin pikseli kaydığı **ölçülür** ve kayanlar yine `ServiceForm.jsx` anahtarına `degisti` olarak eklenir, ekran adının 0115'in kümesine ait olduğu notuyla. Eşlemenin anahtarı kodu değişen dosyadır; piksel kaydıysa o altı kayıtta `beklenen: "ayni"` yanlış bir iddia olurdu (ölçüm 15).
- **R17/2.** Yeni ekran adları `servis-formu-0120-suzulu`, `-tum`, `-suzgecsiz`; adımlar `tikla:Kalıp atölyeye girecek` ve `kaydir:Değişen Parçalar (varsa)`, üçüncüsü `kalipIsi` işaretli tipi olmayan bir parça tipi fikstürüyle. Çekimde `adimUyarilari` olmamalı (0117 Karar 51): araç bulunamayan adımı yalnız uyarıyla geçiyor.

---

## Constraints

### Uyulması zorunlu

- **C1.** Süzme kuralı React'sız saf modülde yazılır (`lib/kalipTamiri.js`), bileşen yalnız sonucu çizer. 0115 C3'ün "dedektör tek yerde" kuralı korunur.
- **C2.** **Salt arayüz işidir: yeni eylem izni, yeni sunucu kuralı ve yeni veri bölümü eklenmez.** Süzgeç kimsenin göremediği bir veriyi göstermez, yalnız görünen listeyi daraltır.
- **C3.** Parça tipi listesi iki çağıranda farklı varsayılan taşıyor: müşteri detayı boş dizi (`CustomerDetailModal.jsx:85`), pano `null` (`ServisPanosu.jsx:92`). Boş dizi de bir dizidir, yani `parcaKalipIsiMi` her parça için `false` döner ve naif bir süzme listeyi **tamamen boşaltır**. R6 bu yüzden kuralın parçasıdır, iyileştirme değil.
- **C4.** Süzgeç tasarım sözlüğünün süzgeç kuralına uyar: iki kısa etiket, `Segment` `kip="dugme"`, sayılar rozette (spec 0014). Alanın içine yeni bir açılır liste ya da onay kutusu konmaz.
- **C4/2.** C4'ün Segment kararı korunur ama **emsali vardır ve kaydedilir**: `stock/MakinaStokTab.jsx:330-335` aynı problemi (formdaki parça kataloğunu daraltmak) tek onay kutusuyla çözüyor, ibareyi, sayıyı ve kaçış kapısını aynı cümlede taşıyor (`Tüm parçaları göster (yalnızca <model> modeline ait <n> parça listeleniyor)`) ve `:54`'teki `(!form.model || showAllParts || modelParts.length === 0) ? parts : modelParts` satırı R6'nın boşaltma korumasının birebir emsalidir. Segment R2/2'nin rozetlerini gerektirdiği ve sözlüğün süzgeç biçimi olduğu için seçilir; biçim ayrımı R15 ile sözlüğe yazılır, sessizce bırakılmaz.
- **C5.** Parça adında "kalıp" geçmesi ölçüt değildir. Ad deseni `kalipAdDeseni` yalnız bir kerelik göçte ve parça kartının ipucusunda kullanılır (0115 R6/2); üçüncü bir çağıran açılmaz.
- **C6.** `src/components/ui.jsx` ve `src/components/KalipAtolyeAlani.jsx` **dokunulmaz** (R13/2, R8/3). Paylaşılan bileşene prop eklemek kapsam kararının kendisini deler; kutunun bulunduğu bölüme sıfırlama yazmak da gereksizdir, R8/3'ün efekti `ServiceForm`'da durur.
- **C7.** Rozet sayıları yalnız bu alanda türetilir ve dedektör tek kaynaktır. Benzer sayı üreten `MakinaStokTab` kendi kümesini sayar, `PartManager`'ın süzgeci tip başına parça sayar; **ortak sayaç yardımcısı açılmaz**.

### KAPSAM DIŞI

- **X1.** Kalıp işi tipli bir parça seçilince onun atölye kalıp listesine **otomatik** eklenmesi — *neden:* bugün kutu açılışında ön doldurma var ve sonradan eklenen kalem "SERVİSİN KALIP İŞİ KALEMLERİ" bölümünde `+ ad` düğmesi olarak çıkıyor, yani yol kapalı değil tek tık. Otomatik ekleme kalıp listesinin kullanıcı kararı olmasını bozar ve ayrı bir karardır.
- **X2.** `KALIP RULMANI PASLANMAZ 5x5x16 6252RS` parçasının tipi — *neden:* Takım Yöneticisi 2026-11-01'de bu parçanın "Kalıp Revize" tipinde **kalmasına** karar verdi. Yani süzülü listede yedi kalem görünür ve kutunun ipucusuyla (kalıp rulmanı değiştirmek kutuyu gerektirmez) aradaki gerilim bilinçli olarak sürer.
- **X3.** Parça tipine göre süzmenin başka formlara taşınması — *neden:* istek servis formuna özgü; R13.
- **X4.** Parça tipi başına ayrı süzgeç ya da çok seçimli tip süzgeci — *neden:* bugün kalıp işi işareti taşıyan tek bir tip var ("Kalıp Revize"), iki değerli süzgeç bütün ihtiyacı karşılıyor.
- **X5.** Süzgeç tercihinin hatırlanması (kullanıcı ayarı, yerel depolama) — *neden:* R8/2 her kutu açılışında aynı davranışı istiyor; hatırlanan tercih kutunun amacını sessizce iptal ederdi.
- **X6.** Süzgeç düğmesine basınca arama panelinin kapanması ve kutuya yeniden tıklanması — *neden:* `SearchPick` paneli `onBlur` ile kapanıyor (`ui.jsx:181`), yani her süzgeç değişimi bir fazla tık demek. Bu bir fazla tık, beş çağıranın paylaştığı bileşene "açık kal" prop'u eklemekten iyidir; aynı spec R13 ile süzgecin yalnız bu kutuya geldiğini söylüyor ve C6 `ui.jsx`'i dokunulmaz ilan ediyor.

---

## Context

**Bugünkü davranış.** Arama kutusu `ServiceForm.jsx:396`'da `SearchPick` bileşenidir ve `items={parts}` ile kataloğun tamamını alır; süzme `SearchPick`'in kendi içinde yalnız yazılan metne göre yapılır (bileşen `ui.jsx:162`, metin süzmesi `:168`), eleman sayısı sınırlı değildir. Tanımlı parça yoksa alan bunun yerine ipucu çizer (`ServiceForm.jsx:392-393`). Kalıp kutusu bu alanın **altında** çizilir (`ServiceForm.jsx:478`, `KalipAtolyeAlani`), yani sebep ekranda sonucun altındadır; R4'ün ibaresi bu yüzden gerekli.

**Kutunun durumunu okuyan tek yol** `kalipTamiri.kutuAcikMi(form)`'dur (`kalipTamiri.js:72`): geçici `_kalipAtolye` alanı varsa o, yoksa kayıttaki kalıp listesinin doluluğu. `KalipAtolyeAlani` da aynı fonksiyonu çağırıyor (`KalipAtolyeAlani.jsx:24`), yani form ile bölüm aynı anda ve aynı kaynaktan karar verir.

**Dedektör** `kalipTamiri.parcaKalipIsiMi(part, partTypeDefs)`'tir (`kalipTamiri.js:50`): parçanın tipi adla eşlenir, boş tip "Standart" sayılır, çöpteki ya da listede olmayan tip kalıp işi değildir. `kalipIsiKalemleri` (`:57`) bunun üstünde, servisin değişen parçalarından ön doldurma listesini üretir. Yeni yardımcı aynı dedektörün üstüne, katalog tarafına yazılır.

**Parça tipi listesi** zaten servis formuna geliyor: `partTypeDefs` prop'u `ServiceForm.jsx:18`'de tanımlı, müşteri detayı (`CustomerDetailModal.jsx:1514`) ve pano (`ServisPanosu.jsx:1011`) geçiriyor. Yani yeni bir prop zinciri açılmaz. Varsayılanların farkı C3'tedir.

**Ölçüm (01.11.2026 20:36 yedeği, ölçüm sonrası silindi).**

1. Katalogda **380 canlı parça** var. Parça tipi dörttür: Standart (357 parça), Bant (9), Konveyör Saç (7), **Kalıp Revize (7)**. Kalıp işi işareti yalnız "Kalıp Revize" tipinde.
2. Kalıp işi tipli yedi parça: `KALIP REVİZE CNC TORNA TEMİZLİK PASOSU`, `100_DİŞİ KALIP REVİZE`, `100_ERKEK KALIPLAR REVİZE`, `120_DİŞİ KALIP REVİZE`, `140_DİŞİ KALIP REVİZE`, `140_ERKEK KALIPLAR REVİZE` ve `KALIP RULMANI PASLANMAZ 5x5x16 6252RS`. Yani süzme listeyi 380'den 7'ye indirir.
3. Adında "kalıp" geçen ama Standart tipli **28 parça** var: kalıp mili, mil yatak rulmanları, kalıp yayı, gramaj somunu ve parçası, kalıp T'si, kalıp kapağı, kalıp anahtarı gibi. Bunlar kutunun ipucusunun "bu kutuyu işaretlemeyi gerektirmez" dediği kalemlerdir ve süzülü listede **görünmezler**.
4. **Karışık sepet istisna değil.** Kalıp işi tipli parça geçen 69 canlı serviste 25'i yalnız kalıp işi kalemi taşıyor, **44'ünde** kalıp işi kalemiyle birlikte başka parçalar da değişmiş. Yalnız gerçek revize kalemlerine (yedi parçanın rulman dışındaki altısı) bakınca tablo aynı: 22 saf, **24 karışık**. Örnek 16.10.2025 servisi: `100_ERKEK KALIPLAR REVİZE` ile birlikte kalıp mili, mil yatak rulmanı, ayna mahruti dişlisi, konveyör bandı ve tel mekanizması bakımı. Sert süzmede bu 24 kayıt tek seferde girilemezdi; R2'nin çıkış kapısı bu ölçümün sonucudur (Takım Yöneticisi kararı, 2026-11-01).
5. `atolyeKaliplari` dolu **tek** canlı servis var (01.11.2026, ekran görüntüsündeki kayıt). Özellik bir günlük, yani geriye dönük risk yok ve göç gerekmez.
6. Aynı yer tutucuyu ("Parça ara...") taşıyan beş kutu var, ama **üç farklı bileşen**: `SearchPick` olanlar `YedekParcaSatisForm.jsx:186`, `:220` ve `ServiceForm.jsx:396`; `stock/PartStokTab.jsx:251` `SearchSelect`'tir ve `options` alır, `items` yok; `Analiz.jsx:132` kendi açılır listesinin içindeki düz bir `<input>`'tur ve kataloğu değil analiz satırlarını listeler. `parts` üstünde `SearchPick` kuran **dördüncü** bir yer de var ve spec'in ilk turunda anılmamıştı: `ModelsManager.jsx:239` (`items={parts.filter(p => p.models?.includes(mForm.model))}`, yer tutucu "Parça ekle...") zaten model işaretine göre süzüyor. Yalnız `ServiceForm.jsx:396` değişir (R13); taramanın hedefi AC-19'da bileşen türüne göre yazılır.

### QA turu ölçümleri (2026-11-01)

7. **Panel altındaki her şeyi örter.** `SearchPick`'in sonuç paneli `position: absolute; top: calc(100% + 4px); left: 0; right: 0; zIndex: 30` (`ui.jsx:186`), input'un kendi `position: relative` kabının içinde. Yani kutunun altına çizilen süzgeç ya da ibare, tam kullanıcı listeyi okurken görünmez olurdu. R2/3'ün yerleşimi bu ölçümün sonucudur.
8. **Aynı problem uygulamada bir kez daha çözülmüş.** `stock/MakinaStokTab.jsx:330-335` formdaki parça kataloğunu modele göre daraltıyor: kaçış kapısı tek onay kutusu, ibare ve sayı aynı cümlede, ve `:54`'teki `(!form.model || showAllParts || modelParts.length === 0) ? parts : modelParts` satırı R6'nın boşaltma korumasının birebir emsali. `showAllParts` (`:32`) model değişince **sıfırlanmıyor**, yani R8/2'nin her açılışta sıfırlanma kuralı emsalden bilinçli bir sapmadır ve kendi testini gerektirir.
9. **İki metin zaten kaynakta.** `kalipTamiri.js:35` `KALIP_ISI_BAYRAGI = "Kalıp işi"` (parça tipi panelinin bayrak etiketi: `PartTypeManager.jsx:118`, `:127`, `:168`) ve `PartManager.jsx:388` `<option value={SUZGEC_TUMU}>Tüm parçalar</option>`. Yani aynı değerli yeni bir sabit R10/2'yi kurulduğu anda ihlal ederdi ve AC-20'nin ilk hâli `PartManager` yüzünden baştan kırmızı olurdu (R10/3, AC-20).
10. **Kutuyu `ServiceForm` tutmuyor.** Onay kutusu `KalipAtolyeAlani.jsx:49`'da, yazıcısı `kutuDegistir` (`:31`, `form._kalipAtolye`); `ServiceForm` yalnız `kutuAcikMi(form)`'u okuyabilir (`kalipTamiri.js:72`). R8/2'nin sıfırlaması bu yüzden açık bir mekanizma ister (R8/3).
11. **Dört kutunun bileşen türleri ve beşinci seçici** ölçüm 6'da yazıldı; AC-19'un ilk hâli dördün ikisinde ölçülemezdi (`options` ve düz `<input>`).
12. **Rozet sınırları.** Forma gelen `parts` App'te `liveParts`'tır (`App.jsx:877`, üç çağrı da onu geçiriyor: `:1432`, `:1706`, `:1738`), yani ikinci bir çöp süzmesi gereksiz. `Segment` `sayi != null` ölçütüyle sıfır için de rozet çizer (`tasarim.jsx:53`, `:56`), yani `(0)` rozetini engelleyen tek şey R6'nın segmenti hiç çizmemesidir (R2/5).
13. **`null` dördüncü hâl.** `partTypeDefs` varsayılanı `CustomerDetailModal.jsx:85`'te boş dizi, `ServisPanosu.jsx:92` ve `ServisPencere.jsx:22`'de `null`. `parcaKalipIsiMi` dizi olmayan değerde her parça için `false` döner (`kalipTamiri.js:51`). Formu tip listesi olmadan çizen tek mevcut test tam bu hâli sürüyor: `tests/ui/kalip-tamiri-0115-form.test.jsx` AC-81, `partTypeDefs={null}` ile kutuyu tıklıyor (R6/2, AC-21).
14. **R6'nın yolu temiz kurulumun varsayılan hâlidir.** `constants.js:142-146`'daki üç sistem tipinin (Standart, Konveyör Saç, Bant) hiçbirinde `kalipIsi` yok; "Kalıp Revize" tipini bir kerelik göç ekliyor (`electron/kalipTamiriGocuSaf.mjs:27-33`, yalnız `partTypeDefs` meta satırı varsa ve liste boş değilse). Yani R6/3'ün neden cümlesi yeni bir veritabanında ilk görülecek metindir ve kullanıcıya yapacağı şeyi söylemek zorundadır.
15. **Kutu açık hâlde formu çizen altı mevcut ekran var** ve hepsi `KalipAtolyeAlani.jsx` anahtarında `beklenen: "ayni"` duruyor: `servis-formu-0115-acik`, `-kayitli`, `-bos-hata`, `-ad-hata` (`scripts/evidence/0009-sayfa.jsx:1435-1442`) ve `servis-formu-0117-sevk`, `-fabrika` (`:1433-1434`; `atolyeKaliplari` dolu olduğu için `kutuAcikMi` `true`). `ServiceForm.jsx`'in kendi dört kaydı ise kutusu kapalı ekranlar. Çekim pencereyi tam kaydırma yüksekliğine büyütüyor (`scripts/evidence/0009-ekran.cjs:66-68`) ama form `Modal`'ın içinde kaydığı için "Kalıbın dönüşü"ne kaydırılmış ekranda parça alanı görüntünün dışında kalabilir: hangisinin değiştiği ölçülecek (R17).
16. **Köprü salt okunur ve öyle kalmalı.** `ServisPencere.jsx:15` `YAZILABILIR` altı bölüm, `partTypeDefs` listede yok ama `BOS`'ta var (`:22`) ve `:93`'te panoya geçiyor; satır 0115 AC-95'in taramasıyla sabit. Yeni prop zinciri de gerekmiyor (R9/2).
17. **Panel süzgeç tıklamasında kapanıyor.** `SearchPick` `onBlur={() => setOpen(false)}` (`ui.jsx:181`), yani segmente basmak listeyi kapatır (X6).
18. **Sepet satırları bugün bağışık.** "Seçilen Parçalar" satırları adet, fiyat, dış tedarik ve çöp düğmesini taşıyor ve yalnız `form.degisenParcalar`'ı okuyor (`ServiceForm.jsx:409-472`); süzgeç onlara hiçbir yoldan erişemez (R7/2, AC-11).
19. **Benzer sayı üreten iki ekran var.** `MakinaStokTab.jsx:333` daraltılmış kümenin sayısını aynı türden bir form ipucusunda basıyor, `PartManager`'ın süzgeci tip başına parça sayıyor. Rozet sayıları yeni, ama "daraltılmış küme sayısını form ipucusunda yazmak" deseni yeni değil (C7, DoD).
20. **0115'in üç taraması dokunulmadan geçer** (bulgu değil, uygulayıcıya geçirilen doğrulama): `.kalipIsi` okuyucu listesi `tests/kalip-tamiri-0115.test.js:201`'de `PartTypeManager.jsx` + `kalipTamiri.js` olarak sabit ve yeni yardımcı saf modüle yazılıyor; `atolyeKaliplari:` yazıcı listesi `:199`'da `KalipAtolyeAlani.jsx` + `kalipTamiri.js` ve değişmiyor; `tests/suzgec-kaynak.test.js`'in süzgeç çubuğu listesi sabit bir sayımdır ve `ServiceForm` ona eklenmez.
21. **Canlı veri ölçümleri yeniden doğrulanamadı.** 01.11.2026 20:36 yedeği ölçümden sonra silinmiş, `~/Library/Application Support/makina-crm/` altında veritabanı yok, depo kökünde `*.db` yok, elde JSON yedek yok. Yukarıdaki 1-5 maddesindeki rakamlar (380 parça, 357/9/7/7 tip dağılımı, adında "kalıp" geçen 28 Standart parça, 69/44 ve 22/24 sepet dağılımı, `atolyeKaliplari` dolu tek servis) **Takım Yöneticisi'nin 01.11.2026 ölçümü** olarak kayıtlıdır, analistin yeniden doğruladığı olgular değil. R2'nin çıkış kapısının bütün gerekçesi 4. maddeye dayandığı için bu ayrım yazılı durur.
22. **`specs/README.md` zaten yazılı.** Kuyruk satırı (`:31`, "sırada yalnız **0120** bekliyor") ve tablo satırı (`:179`) çalışma kopyasında duruyor; kapanışta yalnız "(Tamamlandı)" işareti düşer.
23. **Şablon sapması.** Spec'in ilk hâlinde numaralı karar bölümü yoktu; Takım Yöneticisi'nin 2026-11-01'de verdiği iki karar (R2'nin çıkış kapısı ve X2'nin parça tipi) aşağıda Karar 1 ve Karar 2 olarak numaralandı, QA turunun kararları Karar 3'ten başlar.
24. **X2'nin bıraktığı çelişki bilinçlidir ve izi burada.** `KALIP RULMANI PASLANMAZ 5x5x16 6252RS` "Kalıp Revize" tiplidir, yani süzülü listede görünür; oysa kutunun kendi ipucusu (`kalipTamiri.js:14`) kalıp rulmanı değiştirmenin kutuyu gerektirmediğini söylüyor ve bir kerelik göçün ad deseni kalıp rulmanını **açıkça dışlıyor** (`electron/kalipTamiriGocuSaf.mjs:14`, `!/kal[ıi]p\s*(mil|rulman|yata[ğg])/`). Yani o parçanın tipi göçle değil **elle** verilmiş olmalı. Takım Yöneticisi 2026-11-01'de tipin kalmasına karar verdi (X2); bu cümle, sonraki okuyucunun ne veriyi ne deseni "düzeltmemesi" içindir.

**Bilinen tuzaklar.** Yeni kalıcı alan olmadığı için dört nokta kuralı, `MERGE_KEYS` ve çöp kutusu simetrisi bu işte ilgisizdir. Sunucunun `ALAN_IZINLERI.services` haritası yalnız `durum` alanını izliyor; kayda hiçbir şey yazılmadığı için orası da dokunulmaz.

### QA turunda verilen kararlar (2026-11-01)

Takım Yöneticisi'nin isteği günündeki iki kararı: **Karar 1** süzgecin kapalıya alınabilmesi (R2'nin çıkış kapısı; gerekçesi ölçüm 4'ün karışık sepet tablosu) ve **Karar 2** `KALIP RULMANI PASLANMAZ 5x5x16 6252RS` parçasının "Kalıp Revize" tipinde kalması (X2). QA turunun kararları Karar 3'ten başlar ve 26 bulgunun tamamı onaylanmıştır.

- **Karar 3.** Süzgeç ve ibare arama kutusunun üstünde durur, sıra süzgeç, ibare, arama kutusu (R2/3; ölçüm 7: panel altındaki her şeyi örtüyor).
- **Karar 4.** C4'ün Segment biçimi korunur, ama `MakinaStokTab`'ın onay kutusu yakın kopya olarak tasarım sözlüğünün "Bilinen borç" bölümüne yazılır ve ibarenin bileşeni `Ipucu` olur (R15, C4/2, R4/2; ölçüm 8).
- **Karar 5.** Segmentin ilk seçeneği var olan `KALIP_ISI_BAYRAGI`'nı yeniden kullanır, yeni sabit üçtür ve AC-20'nin taraması iki parçaya ayrılır (R10/3, AC-20, AC-26; ölçüm 9).
- **Karar 6.** Süzgecin varsayılana dönüşü `ServiceForm`'daki tek efektle, kutu kapanınca olur; `KalipAtolyeAlani` dokunulmaz (R8/3, AC-28; ölçüm 10).
- **Karar 7.** AC-19 bileşen türüne göre yeniden yazılır ve `ModelsManager.jsx:239` dördüncü parça seçicisi olarak adıyla girer (AC-19; ölçüm 6).
- **Karar 8.** Rozet sayısı `parts.length`'tir, ikinci çöp süzmesi yazılmaz ve `(0)` rozeti hiçbir hâlde çizilmez (R2/5, AC-24; ölçüm 12).
- **Karar 9.** R6 `null` ve `undefined` hâllerini de kapsar ve bunun kendi kriteri olur (R6/2, AC-21; ölçüm 13).
- **Karar 10.** Süzülemedi nedeni tek cümledir ve kalıp işi işaretli tip bulunmamasına nişanlıdır (R6/3; ölçüm 14: temiz kurulumun varsayılan hâli).
- **Karar 11.** Kanıt kayıtları kodu değişen dosyanın anahtarına yazılır; altı mevcut ekranın pikseli ölçülür (R17, AC-32, AC-33; ölçüm 15).
- **Karar 12.** Ayrı pencerenin ölçümü adlandırılır ve köprü salt okunur kalır (R9/2, AC-15, AC-30; ölçüm 16).
- **Karar 13.** Yazılmış arama metni korunur; boş sonucu açıklayan şey ibarenin panel açıkken görünür kalmasıdır (R5/2, R4/3, AC-25, AC-22).
- **Karar 14.** Süzgeç tıklamasında panelin kapanması kabul edilir ve kapsam dışı yazılır; `ui.jsx`'e "açık kal" prop'u eklenmez (X6; ölçüm 17).
- **Karar 15.** Sepetteki Standart satırın düzenlenebilir kaldığı ayrıca ölçülür (R7/2, AC-11; ölçüm 18).
- **Karar 16.** "Aynı sayıyı üreten başka ekran yok" satırı yeniden yazılır: sayılar tek yerde türetilir, ortak sayaç yardımcısı açılmaz (C7, DoD; ölçüm 19).
- **Karar 17.** `ui.jsx`'in ve `SearchPick` imzasının dokunulmazlığı kurallaşır ve taramayla ölçülür (R13/2, R16, C6, AC-29).
- **Karar 18.** Context'in `SearchPick` atfı ikiye ayrılır: bileşen `ui.jsx:162`, metin süzmesi `:168`.
- **Karar 19.** Ölçüm 6 beş kutunun üç farklı bileşen olduğunu ve dördüncü parça seçicisini yazar.
- **Karar 20.** Saf yardımcı `parcaSuzgeci(parts, partTypeDefs, tumu)` adıyla ve tek çağrıda dört değeri döndürecek şekilde yazılır (R1/2, AC-27).
- **Karar 21.** Segmentin kipi, genişliği ve erişilebilir adı yazılır (R2/4, AC-23).
- **Karar 22.** İbarenin ve neden satırının `data-testid`'leri adlandırılır (R4/2).
- **Karar 23.** AC-14 altın fikstürle değil, gerçek ekranın kaydettiği gövdenin anahtar kümesiyle ölçülür (AC-14).
- **Karar 24.** AC-17 var olan 0115 testlerine bağlanır, dördüncü kopya yazılmaz (AC-17).
- **Karar 25.** Üç kanıt ekranının adı ve adımları yazılır, çekimde `adimUyarilari` olmaması şart koşulur (R17/2).
- **Karar 26.** X2'nin bıraktığı çelişki ve parçanın tipinin elle verilmiş olması Context'e yazılır (ölçüm 24).
- **Karar 27.** Canlı veri ölçümleri yeniden doğrulanamadı; rakamlar Takım Yöneticisi'nin ölçümü olarak kaydedilir (ölçüm 21).
- **Karar 28.** Etkilenen alanlar satırı `specs/README.md`'nin zaten yazılı olduğunu ve kapanışta yalnız "(Tamamlandı)" işaretinin düşeceğini söyler (ölçüm 22).


### Plan turunda verilen kararlar (2026-11-01)

Takım Yöneticisi planın on iki önerisinin tamamını onayladı.

- **Karar 29.** `SearchPick` yeniden kurulmaz: süzgeç, ibare ve neden satırı `{koşul && …}` yer tutucularıyla aynı kapta durur, `key` kullanılmaz (R5/2, AC-25).
- **Karar 30.** İbare ve neden satırının `data-testid`'si `Ipucu`'yu saran bir `div`'dedir; `tasarim.jsx`'e prop eklenmez (R4/2).
- **Karar 31.** Kutu kararı ekranda kalır: `ServiceForm` `parcaSuzgeci(parts, partTypeDefs, !kutuAcikMi(form) || tumParcalar)` çağırır; segment `kutuAcik && suzulebilir`, neden satırı `kutuAcik && !suzulebilir` iken çizilir (R1/2).
- **Karar 32.** Sıfırlama efektinin bir çizimlik gecikmesi kabul edilir: kutu kapalıyken segment yoktur ve liste zaten tamdır (R8/3).
- **Karar 33.** "Hiç değişmedi" iddiası (AC-28, AC-29) iki katmanda: kalıcı kaynak taraması (`SearchPick` imzası birebir, çağrının prop kümesi, `KalipAtolyeAlani`'nda süzgeç adı yok) ve commit anında `git diff 098fc88 -- src/components/ui.jsx src/components/KalipAtolyeAlani.jsx` boş çıktısı. SHA sabitlenmez.
- **Karar 34.** AC-19 içerikle taranır, satır numarasıyla değil; satır numaraları yalnız rapor metninde geçer.
- **Karar 35.** R15'in sözlük maddesi satır numarasız, dosya yolu ve kimlikle (`showAllParts`, `availableParts`) yazılır; AC-31 bunu arar.
- **Karar 36.** İki metin: ibare "Kalıp atölyeye girecek işaretli olduğu için yalnız kalıp işi tipli parçalar listeleniyor.", neden "Kalıp işi işaretli parça tipi yok; bütün parçalar listeleniyor. Ayarlar › Katalog › Parça Tipleri'nde bir tipe "Kalıp işi" işareti verin." (R6/3).
- **Karar 37.** AC-14'ün düzeneği kalıp işi kalemi taşıyan servisle açılır (ön doldurma listeyi doldurur, `TAMIR_BOS_HATASI` çıkmaz); iki gövdenin anahtar kümesi karşılaştırılır.
- **Karar 38.** Altı mevcut ekranın kayması ölçülür, tahmin edilmez; kayanlar `ServiceForm.jsx` anahtarına eklenir, `KalipAtolyeAlani.jsx` kayıtları yerinde kalır (R17).
- **Karar 39.** `-tum` ekranı `dugme:Tüm parçalar` adımıyla çekilir; arama paneli açık hâl çekilmez (odakla açılır, kararsız).
- **Karar 40.** Kapanış bekçisi CLAUDE.md'nin 0115 bölümündeki 0120 maddesini sınar; ayrı bölüm açılmaz (DoD).
- **Karar 41 (uygulamada, kanıt görüntüsünde bulundu).** `genislik="icerik"` sütun yönlü flex kabın doğrudan çocuğunda etkisizdi (kap çocuğu genişliğe yayar, gri hap alanın tamamına uzanıyordu). Segment blok bir sarmalayıcıya (`parca-suzgec-kabi`) alındı; AC-23'ün testi sarmalayıcıyı ve `inline-flex` kabı iddia eder.

### Karar kaydı

| Bulgu | Derece | Karar | Nereye işlendi |
|---|---|---|---|
| B-1 Süzgecin ve ibarenin yeri tanımsız, panel altını örtüyor | Bloklayıcı | 3 | R2/3, AC-22, ölçüm 7 |
| B-2 İbarenin bileşeni adsız, C4 canlı emsalle çelişiyor | Bloklayıcı | 4 | R4/2, R15, C4/2, AC-31, ölçüm 8 |
| B-3 R10/2 uygulanamaz: iki metin zaten kaynakta | Bloklayıcı | 5 | R10/3, AC-20, AC-26, ölçüm 9 |
| B-4 R8/2'nin sıfırlamasının sahibi yok | Bloklayıcı | 6 | R8/3, AC-28, ölçüm 10 |
| Ö-1 AC-19'un tarama hedefi dördün ikisinde yanlış | Önemli | 7 | AC-19, ölçüm 6 |
| Ö-2 Rozet sayıları sınırlarda tanımsız | Önemli | 8 | R2/5, AC-24, ölçüm 12 |
| Ö-3 `partTypeDefs === null` dördüncü hâl, kriteri yok | Önemli | 9 | R6/2, AC-9, AC-21, ölçüm 13 |
| Ö-4 R6'nın nedeni tek cümle mi iki cümle mi | Önemli | 10 | R6/3, ölçüm 14 |
| Ö-5 Kanıt kaydı hangi dosya anahtarına, kaç ekran değişiyor | Önemli | 11 | R17, AC-32, AC-33, ölçüm 15 |
| Ö-6 AC-15'in ayrı pencere ölçümü yok, köprü korunmalı | Önemli | 12 | R9/2, AC-15, AC-30, ölçüm 16 |
| Ö-7 Yazılmış arama metninin kaderi tanımsız | Önemli | 13 | R5/2, R4/3, AC-25, AC-22 |
| Ö-8 Segment tıklaması paneli kapatıyor | Önemli | 14 | X6, ölçüm 17 |
| Ö-9 Sepetteki Standart satırın düzenlenebilirliği ölçülmüyor | Önemli | 15 | R7/2, AC-11, ölçüm 18 |
| Ö-10 DoD'nin "aynı sayıyı üreten ekran yok" satırı yanlış | Önemli | 16 | C7, DoD, ölçüm 19 |
| Ö-11 R13'ü koruyacak tarama yok | Önemli | 17 | R13/2, R16, C6, AC-29 |
| K-1 `SearchPick` satır atfı bileşeni değil süzmeyi gösteriyor | Küçük | 18 | Context |
| K-2 Beş kutu üç farklı bileşen, beşinci seçici anılmamış | Küçük | 19 | ölçüm 6 |
| K-3 Saf yardımcının adı ve dönüşü yok | Küçük | 20 | R1/2, AC-27 |
| K-4 Segmentin erişilebilir adı ve genişliği yok | Küçük | 21 | R2/4, AC-23 |
| K-5 İbarenin `data-testid`'leri yok | Küçük | 22 | R4/2 |
| K-6 AC-14'ün ölçümü söylenmemiş | Küçük | 23 | AC-14 |
| K-7 AC-17 yeni ölçüm getirmiyor | Küçük | 24 | AC-17 |
| K-8 Kanıt ekranlarının adı ve adımları yok | Küçük | 25 | R17/2, AC-32 |
| K-9 X2'nin bıraktığı çelişkinin izi yok | Küçük | 26 | ölçüm 24 |
| K-10 Canlı veri ölçümleri doğrulanamadı | Küçük | 27 | ölçüm 21 |
| K-11 README değişecek sayılıyor, oysa yazılı | Küçük | 28 | Başlık satırı, ölçüm 22 |
| P-1 `SearchPick` yeniden kurulma riski | Önemli | 29 | R5/2, AC-25 |
| P-2 `Ipucu` `data-testid` almıyor | Küçük | 30 | R4/2 |
| P-3 `tumu` ile kutu durumunun ilişkisi | Küçük | 31 | R1/2 |
| P-4 Sıfırlamanın bir çizimlik gecikmesi | Küçük | 32 | R8/3 |
| P-5 "Hiç değişmedi" taramayla ölçülemez | Önemli | 33 | AC-28, AC-29 |
| P-6 Satır numaralı tarama kayar | Küçük | 34 | AC-19 |
| P-7 Sözlük atfının satır numarası kayar | Küçük | 35 | R15, AC-31 |
| P-8 İki metnin içeriği | Küçük | 36 | R6/3, R4 |
| P-9 Kutu açık kayıtta boş kalıp listesi hatası | Küçük | 37 | AC-14 |
| P-10 Altı ekranın kayması | Küçük | 38 | R17, AC-33 |
| P-11 `-tum` ekranının adımı | Küçük | 39 | R17/2 |
| P-12 Kapanış bekçisinin yeri | Küçük | 40 | DoD |
| U-1 İçerik genişliği flex kapta kayboluyor | Önemli | 41 | R2/4, AC-23 |

---

## Acceptance Criteria

- **AC-1.** Kutu işaretsizken "Değişen Parçalar (varsa)" arama kutusu kataloğun bütün canlı parçalarını listeler ve süzgeç çizilmez.
- **AC-2.** Kutu işaretlenince arama kutusunda yalnız kalıp işi tipli parçalar görünür; Standart tipli bir parça (örnek: kalıp mili) listede yoktur.
- **AC-3.** Süzgeç kutu işaretlenince çizilir ve açılış değeri "Kalıp işi"dir.
- **AC-4.** Süzgecin iki seçeneği sayı rozeti taşır: "Kalıp işi" kalıp işi tipli parça sayısını, "Tüm parçalar" canlı parça sayısını gösterir.
- **AC-5.** "Tüm parçalar"a basınca liste bütün kataloğa döner ve Standart tipli bir parça seçilip "Seçilen Parçalar"a eklenebilir.
- **AC-6.** "Tüm parçalar" seçiliyken "Kalıp işi"ne basınca liste yeniden süzülür.
- **AC-7.** Süzülü hâlde alanın içinde listenin süzüldüğünü söyleyen ibare çizilir; "Tüm parçalar" seçilince ibare kaybolur.
- **AC-8.** Süzülü hâlde arama kutusuna Standart tipli bir parçanın adı yazılınca sonuç gelmez ve bileşenin "Bulunamadı." metni çıkar.
- **AC-9.** Parça tipi listesi **boş dizi** (`[]`) olarak geldiğinde kutu işaretli olsa da süzme uygulanmaz: tam liste çizilir, süzgeç çizilmez, R6/3'ün tek neden cümlesi yazılır. (`null` hâli AC-21'de ayrı ölçülür.)
- **AC-10.** Katalogda kalıp işi tipli hiç parça yokken (tipler tanımlı ama hiçbiri işaretli değil) kutu işaretlenince de süzme uygulanmaz ve aynı neden yazılır.
- **AC-11.** Kutu işaretlenmeden önce eklenmiş Standart tipli parçalar kutu işaretlenince "Seçilen Parçalar" listesinde kalır; sayıları ve tutarları değişmez **ve satır düzenlenebilir kalır**: "Kalıp işi" seçiliyken o satırın adet ve fiyat kutuları yazılabilir, dış tedarik düğmesi çalışır ve çöp düğmesi satırı listeden çıkarır.
- **AC-12.** Kutu kaldırılınca süzgeç kaybolur ve arama kutusu tam listeye döner.
- **AC-13.** Kullanıcı "Tüm parçalar"ı seçtikten sonra kutuyu kaldırıp yeniden işaretlerse süzgeç "Kalıp işi" değeriyle gelir.
- **AC-14.** Servis kaydedildiğinde gövdede süzgece ait yeni bir anahtar yoktur. **Ölçüm altın fikstürle değil, gerçek ekranın kaydettiği gövdeyle yapılır** (`CustomerDetailModal.saveService` yolu): süzgece dokunulup kaydedilen gövdenin anahtar kümesi, süzgece dokunulmadan kaydedilen gövdenin anahtar kümesine eşittir ve hiçbir anahtar `/suzgec|tumParca/` desenine uymaz. Bir `0120-once.json` yazılmaz: kayda hiçbir şey yazılmadığı için sonucu baştan belli bir karşılaştırma için spec öncesi derleme maliyeti olurdu.
- **AC-15.** Kutu işaretlenince liste iki ölçümde de süzülür: panonun kendi sekme formunda (`ServisPanosu.jsx:1011`) ve `partTypeDefs` taşıyan bir anlık görüntüyle kurulan `ServisPencere`'de (`:93`). Köprüye hiçbir şey eklenmez.
- **AC-16.** Katalogda hiç canlı parça yokken alan bugünkü "Tanımlı yedek parça yok." ipucunu çizer; süzgeç ve ibare yoktur.
- **AC-17.** Kutu açılışındaki ön doldurma, öneri şeridi ve üç kaynak bölümü spec öncesiyle aynı davranır. **Ölçüm, aynı iddiaların dördüncü kopyası yazılarak değil, var olan korumayla yapılır:** `tests/ui/kalip-tamiri-0115-form.test.jsx`'in AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-21, AC-81 ve AC-87 blokları **dokunulmadan** yeşil kalır.
- **AC-18.** Süzülmüş kümeyi veren fonksiyon saf modüldedir ve `parcaKalipIsiMi`'yi çağırır; `ServiceForm.jsx` içinde parça tipi karşılaştırması ya da `kalipIsi` okuması yoktur (kaynak taraması).
- **AC-19.** Süzülmemiş tam katalog (`items={parts}`) yalnız `YedekParcaSatisForm.jsx:186` ve `:220`'de kalır; `ServiceForm.jsx:396` süzülmüş kümeyi alır; `ModelsManager.jsx:239`'un model işaretine göre süzmesi, `stock/PartStokTab.jsx:251`'in `options` değeri ve `Analiz.jsx:132`'nin kendi listesi dokunulmaz (kaynak taraması, her biri dosya ve satırla). Tarama hedefi bileşen türüne göre yazılır: son ikisinde `items` prop'u hiç yoktur, yani eski ifadeyle ölçülemezlerdi.
- **AC-20.** Süzgeç ve ibare metinleri `lib/kalipTamiri.js`'in metin bölümünde sabittir ve tarama iki parçalıdır: (a) dört metnin hiçbiri `ServiceForm.jsx` içinde düz yazılmaz; (b) **yalnız iki yeni cümle** (süzülü ibare ve R6/3'ün nedeni) depo genelinde tek kopyadır. `PartManager.jsx:388`'in `Tüm parçalar` seçeneği adıyla gerekçeli istisnadır (başka ekranın kendi seçenek etiketi, bu süzgeç değil); `Kalıp işi` ise yeni bir sabit değildir, R10/3 gereği `KALIP_ISI_BAYRAGI` yeniden kullanılır.

### QA turu kriterleri (2026-11-01)

- **AC-21.** Parça tipi listesi **`null`** olarak geldiğinde kutu işaretli olsa da süzme uygulanmaz: tam liste çizilir, süzgeç çizilmez ve AC-9'un aynı neden cümlesi yazılır.
- **AC-22.** Süzgeç ve ibare arama kutusunun **üstünde** ve şu sırada çizilir: süzgeç, ibare, arama kutusu. İbare arama paneli açıkken de görünür kalır (panel kutunun altını örter).
- **AC-23.** Süzgeç `Segment` `kip="dugme"` ile çizilir ve erişilebilir adı `Parça listesi süzgeci`'dir; iki düğme `aria-pressed` taşır.
- **AC-24.** `Tüm parçalar` rozetinin sayısı prop'un geldiği hâliyle `parts.length`'tir ve ekranda hiçbir hâlde `(0)` rozeti çizilmez (kalıp işi sayısı sıfırken segment hiç yoktur).
- **AC-25.** Arama kutusuna yazılmış metin, süzgeç değiştirilince ve kutu işaretlenip kaldırılınca **korunur**; bileşen yeniden kurulmaz.
- **AC-26.** Süzgecin ilk seçeneğinin etiketi `KALIP_ISI_BAYRAGI` sabitinden gelir; aynı değeri taşıyan ikinci bir sabit kaynakta yoktur (kaynak taraması).
- **AC-27.** Süzülmüş kümeyi, rozet sayısını ve R6'nın kararını **tek çağrı** döndürür (`parcaSuzgeci` → `{ liste, kalipSayisi, suzulebilir, suzuluMu }`); `ServiceForm.jsx` rozet sayısını ayrıca türetmez (kaynak taraması).
- **AC-28.** Süzgecin varsayılana dönüşü kutu **kapanınca** olur ve `src/components/KalipAtolyeAlani.jsx` bu işte hiç değişmemiştir (kaynak taraması).
- **AC-29.** `src/components/ui.jsx` bu işte hiç değişmemiştir ve `SearchPick`'in parametre listesi (`ui.jsx:162`) aynıdır (kaynak taraması).
- **AC-30.** `ServisPencere.jsx`'in `YAZILABILIR` listesi ve `partTypeDefs` satırı değişmemiştir; 0115 AC-95 dokunulmadan yeşil kalır.
- **AC-31.** `docs/tasarim-sozlugu.md`'nin "Bilinen borç" bölümünde `stock/MakinaStokTab.jsx`'in onay kutusu bu süzgecin yakın kopyası olarak yazılıdır, üçüncü kopyada sözlüğe taşınma cümlesiyle.
- **AC-32.** Üç yeni kanıt ekranı (`servis-formu-0120-suzulu`, `-tum`, `-suzgecsiz`) `docs/evidence/kanit-eslemesi.json`'da **`ServiceForm.jsx`** anahtarında, `beklenen: "degisti"` + onay ile durur; hiçbirinin çekiminde `adimUyarilari` yoktur.
- **AC-33.** Kutu açık hâlde formu çizen altı mevcut ekranın pikseli ölçülmüştür; kayan her biri `ServiceForm.jsx` anahtarına `degisti` olarak eklenmiş, kaymayanlar bugünkü kaydında kalmıştır.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Süzme kuralı React'sız saf modülde (`lib/kalipTamiri.js`) ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Süzgecin rozet sayıları yalnız bu alanda türetilir ve dedektör tek kaynaktır; benzer sayı üreten `MakinaStokTab` kendi kümesini, `PartManager` tip başına parçayı sayar ve **ortak sayaç yardımcısı açılmadı** (C7).
- [ ] Yeni kalıcı alan **yok**: dört nokta kuralı, `db-roundtrip` ve göç ilgisiz, bu spec'te açıkça yazıldı.
- [ ] Yeni veri bölümü **yok**: `BLOB_SECTIONS` / `MERGE_KEYS` zinciri ilgisiz.
- [ ] Yeni eylem izni **yok** ve bu C2'de açıkça yazıldı; `serverAuth.cjs` dokunulmadı.
- [ ] Soft-delete ilgisiz (kayıt yazılmıyor); çöpteki parça ve çöpteki parça tipi dedektörün bugünkü kuralıyla ele alınıyor.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı yok, çeviri anahtarı eklenmedi.
- [ ] Para gösterilmiyor; çoklu para kuralı ilgisiz.
- [ ] `src/components/ui.jsx` ve `src/components/KalipAtolyeAlani.jsx` **dokunulmadı**; `SearchPick`'in imzası aynı (kaynak taraması, R16).
- [ ] Tasarım sözlüğünün "Bilinen borç" bölümüne `stock/MakinaStokTab.jsx`'in onay kutusu bu süzgecin yakın kopyası olarak yazıldı (R15).
- [ ] Görsel kanıt eklendi: süzülü hâl, "Tüm parçalar" hâli ve süzmenin uygulanmadığı hâl (`0120-piksel-raporu.json` ve taban raporu), üçü `ServiceForm.jsx` anahtarında `degisti` + onay ile; kutu açık hâlde formu çizen altı mevcut ekranın pikseli ölçüldü ve kayanlar aynı anahtara eklendi (R17).
- [ ] Canlı veri ölçümleri yeniden doğrulanamadı; 1-5 maddesindeki rakamlar Takım Yöneticisi'nin 01.11.2026 ölçümü olarak kaydedildi (ölçüm 21).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0115 bölümüne süzgecin kuralı ve R6'nın boşaltma koruması yazıldı.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `1d5b75c` | Dal `feat/0120-parca-suzgeci`, taban `098fc88` (v3.52.0); kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | QA turu (B-1–B-4, Ö-1–Ö-11, K-1–K-11, Karar 3–28), plan turu (Karar 29–40) |
| **Düzeltme turu sayısı** | 1 | Triyaj: kalıbı kayıtlı servisin açılışı ölçülmüyordu (`useState(true)` bozması geçiyordu; AC-3 testi eklendi); CLAUDE.md maddesi 0115'in sürüm notunun önündeydi (bölümün sonuna taşındı, yer testi eklendi) |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 447 dosya, 6103 test (Electron dahil, triyaj öncesi); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** `genislik="icerik"` sütun yönlü flex kabın doğrudan çocuğunda etkisizdi; jsdom testleri geçerken kanıt görüntüsünde süzgeç alanın tamamına yayılıyordu (Karar 41, blok sarmalayıcı). Taramalarda yorum satırları iki kez sahte eşleşme verdi; metin taramaları yorumsuz kaynakta yapıldı. Üç bozma denendi (sıfırlama efekti, boşaltma koruması, başlangıç değeri), üçü de test kırdı.

**Görsel kanıt:** 13 ekran × 2 tema; kutusu kapalı dört servis formu ekranı 0 piksel, kutusu açık altı mevcut ekranın hepsi kaydı (parça alanı uzadı), üç yeni ekran; taban son kodla 26 görüntüde 0 fark; çekimde adım uyarısı yok. `ui.jsx`, `KalipAtolyeAlani.jsx`, `ServisPencere.jsx` için `098fc88` farkı boş (Karar 33).

**Bu spec'ten çıkarılan ders:** bir durumun "her açılışta" değerini iddia eden kriter yalnız kapalı başlayan düzenekle ölçülürse, açılışta değeri düzelten efekt yanlış başlangıç değerini gizler; durum bir kayıttan türeyen koşulla açılıyorsa düzenek o koşulun açık hâlinden de başlamalı. Görsel bir kriter (içerik genişliği) jsdom'da ölçülemez; kanıt görüntüsüne gözle bakmak bu işte tek yakalayıcıydı.
