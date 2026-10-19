# 0094 — Faaliyet Haritası'na beş ilin ilçe kırılımı eklenir

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3; commit `4b60c02`, kapanış 2026-10-19) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Faaliyet Haritası (`src/components/Harita.jsx` ilçe kırılımı, ilçe paneli, ilçe pini); `src/lib/mapStats.js` `ilOzeti` (eşleşmeyen ilçe değeri için üçüncü sayı, opt-in; QA B-1); üretilmiş harita verisi (`src/lib/map/ilce/`, `src/lib/map/ilceler.js`, `src/lib/map/meta.js`); üretici (`scripts/gen-map-paths.cjs` `ILCE_ILLERI` ve `ILCE_ISIM_DUZELT`); ilçe alanı çizen beş form (müşteri, bayi, Extra Kalıp teslimat adresi, yedek parça teslimat adresi, fabrika adresi); eskiyen üç yorum ve `CLAUDE.md`'nin harita bölümü. Veri bölümü, izin, sunucu tarafı ve diğer saf motorlar değişmez. (Revizyon 1 "saf motor değişmez" diyordu; QA B-1 ile `ilOzeti` bir sayı kazanıyor, parametresiz çıktısı birebir eski kalıyor.) |
| **Bağımlı spec'ler** | yok (harita verisi spec süreci öncesinde kuruldu; bu spec onun listesini genişletir) |
| **Revizyon** | · 1 · 2026-10-19 ilk taslak. Spec yazılmadan önce Takım Yöneticisi iki kararı onayladı: Yalova merkez ilçesinin adı düzeltilir, mevcut müşterilerin ilçesi elle doldurulur. · 2 · 2026-10-19 QA boşluk analizi: yirmi iki bulgu (iki bloklayıcı, on önemli, on küçük) onaylandı ve işlendi; eşleşmeyen ilçe değerinin davranışı, "Çanakkale merkez" ayrımı, ATTRIBUTION.md'nin yokluğu, taban turu ölçümü ve üç ad sözlüğü kesinleşti (Karar kaydı tablosu) · 3 · 2026-10-19 uygulama planı onayı (`specs/0094-uygulama-plani.md` §4): on öneri kabul edildi; R5/3, R5/4, R5/5, C8, C9, AC-20/4 eklendi (Plan kararları tablosu) |

---

## Intent

Fabrika yönetimi Faaliyet Haritası'nda makinaların hangi ilçelerde olduğunu görmek istiyor. Bugün ilçe kırılımı yalnız on dört ilde var; Aydın, Sakarya, Eskişehir, Gaziantep ve Yalova'da satış olmasına rağmen bu iller haritada tek parça il olarak kalıyor, tıklanıp içine inilemiyor.

Acı yalnız haritada değil: aynı liste müşteri, bayi ve teslimat adresi formlarındaki **İlçe alanını** da belirliyor. Bu beş il listede olmadığı için o illerdeki müşteriye ilçe **girilemiyor** bile. Yani eksik olan şey bir çizim değil, bir bilgi: o illerdeki satışın ilçesi uygulamada hiç tutulmuyor.

Başarı şu: Takım Yöneticisi haritada Aydın'a tıkladığında ilçelere iniyor, müşteri formunda Sakarya'yı seçtiğinde İlçe alanı çıkıyor ve seçtiği her ilçenin haritada boyanacak bir karşılığı var. Mevcut on dört ilin rakamları, adları ve çizimleri değişmiyor.

---

## Requirements

- **R1.** İlçe kırılımı olan il listesine beş il eklenir: **Aydın, Sakarya, Eskişehir, Gaziantep, Yalova.** Liste on dörtten on dokuza çıkar, mevcut on dördün sırası ve adı değişmez.
- **R2.** Beş ilin ilçe adları ve çizimleri bugünkü kaynaktan üretilir (geoBoundaries TUR ADM2, sabitlenmiş sürüm); ilçe sayıları ölçülen resmî sayılardır: Aydın 17, Sakarya 16, Eskişehir 14, Gaziantep 9, Yalova 6.
- **R3.** Yalova'nın merkez ilçesi **"Yalova"** adıyla görünür. Kaynak verideki "Yalova merkez" yazımı, bugün üç düzeltmeyi taşıyan ad düzeltme sözlüğüne eklenen bir satırla düzeltilir (karar 1, onaylandı).
- **R3/2.** (QA B-2, bloklayıcı.) Sözlüğe **yalnız** `"Yalova merkez": "Yalova"` satırı eklenir. On dokuz ilin içinde aynı hatayı taşıyan ikinci bir ad var ve **dokunulmaz**: `"Çanakkale merkez"` (ölçüm 4). Ayrım şudur: Yalova bugün listede olmadığı için o ad hiçbir formda seçilememiştir, yani düzeltmesi bedelsizdir; Çanakkale ise on dört ilden biridir, ad bugün form listesinde seçilebiliyor ve haritada o adla boyanıyor, yani değiştirilmesi R8 ile AC-9'u kırar ve o adı kaydında taşıyan her müşteriyi R5/2'nin eşleşmeyen değerine düşürür. Çanakkale'nin düzeltilmesi bir veri taşıma işidir ve kapsam dışıdır (X7).
- **R4.** Veri **üretici çalıştırılarak** üretilir; üretilmiş dosyalar elle yazılmaz ya da düzenlenmez. Çıktı repoya commit edilir.
- **R5.** Haritada bu beş il tıklanınca ilçe görünümüne inilir; ilçe boyama, ilçe pinleri, ilçe adları ve yan panelin ilçe listesi mevcut on dört ildeki davranışın aynısıdır.
- **R5/2.** (QA B-1, bloklayıcı.) **Üretilen ilçe listesinde karşılığı olmayan dolu bir `ilce` değeri sessizce yarım çizilmez.** Ölçüm 3 bugünkü üç katmanın çeliştiğini gösteriyor: boyama tam metinle eşleşiyor (çizmiyor), pin sadeleştirilmiş adla eşleşiyor (çiziyor), il kartı değeri dolu gördüğü için "ilçesi girilmemiş" de saymıyor. Kural: `mapStats.ilOzeti` üçüncü bir sayı kazanır (`eslesmeyen`), imzası `ilOzeti(customers, il, ilceAdlari = null)` olur ve **liste verilmezse çıktısı birebir eskidir** (0059 `{ liste: true }` ile 0092 `aylikPay` deseni); liste verilince çizilen ilçe adlarıyla eşleşmeyen dolu değerler `ilceler` yerine `eslesmeyen`'e gider. İl paneli bunu bugünkü "ilçesi girilmemiş" satırının kalıbıyla yazar ("n makinanın ilçesi haritada bulunamadı; müşteri kaydından ilçeyi yeniden seçin."). İlçe pini yalnız çizilen listede olan ad için çizilir, böylece pin ile boyama asla ayrışmaz. Mekanizmanın emsali ülke seviyesindeki `bolgeToplami(...).eslesmeyen`'dir (`Harita.jsx:208`).
- **R5/3.** (Plan kararı P2.) Eşleşme kümesi `ilceler.js`'in `ILCELER[il]`'idir (açılışta hazır), il dosyasının sonradan yüklenen `ILCE_ADLARI`'sı değil; AC-4 ikisinin aynı küme olduğunu sabitler. Böylece il dosyası yüklenene kadar eşleşmeyen değer bir an "ilçe" sayılmaz.
- **R5/4.** (Plan kararı P3.) İl kartının toplam makina sayısı ve "Bu ilde makina kaydı yok" koşulu `eslesmeyen`'i de sayar (R7'nin "sayıları kaybolmaz" ilkesi; yoksa toplam bu işle düşerdi).
- **R5/5.** (Plan kararları P4, P5.) Pin kuralı opt-in'dir: `pinleriTopla` isteğe bağlı `ilceAdlari` alır; verildiğinde satış, fabrika ve bayi pini yalnız kaydın tam (kırpılmış) ilçe adı listede olduğunda çizilir. `ilceMerkezleri`'nin sadeleştirilmiş anahtarı değişmez, mevcut pin testleri dokunulmadan yeşil kalır. Kural on dokuz ilin hepsinde geçerlidir: mevcut on dört ilde farklı yazılmış (ör. "Kadikoy") bir ilçe değeri bugün pin alıp boyanmıyordu, bu işten sonra pini de kalkar ve "haritada bulunamadı" satırına sayılır. Panel cümlesi `Harita.jsx`'ten dışa verilen `ilceEslesmeyenMetni(n)`'dir.
- **R6.** İlçe alanı bu beş il seçildiğinde, bugün ilçe alanı çizen bütün formlarda çıkar: müşteri ekle/düzenle, bayi, Extra Kalıp teslimat adresi, yedek parça teslimat adresi, fabrika adresi. Başka hiçbir formda alan ne eklenir ne kalkar.
- **R6/2.** (QA Ö-8.) İki teslimat formundaki (Extra Kalıp, yedek parça) ilçe **yalnız adres bilgisidir, haritada karşılığı yoktur**: ilçe pinleri yalnız `factory`, `dealers` ve `customers` okur (`mapStats.js:366-381`), `teslimatIlce` hiçbir harita öğesine girmez (kalıcı alanı vardır, `db.cjs:194/211`). Alan tutarlılık için eklenir. Intent'in "seçtiği her ilçenin haritada boyanacak bir karşılığı var" cümlesi müşteri, bayi ve fabrika ile sınırlıdır.
- **R6/3.** (QA Ö-7.) Müşteri kaydı yaratan iki form ilçe alanı çizmez ve bu **bilinçlidir**: `CustomerDetailModal.jsx:1227` ("Yeni Sahip", ikinci el devir) ve `:1285` (önceki sahip düzenleme) `CountryCityFields`'i `onIlce` olmadan çağırır (ölçüldü: `onIlce` kaynakta yalnız dört yerde geçiyor). İkinci el devirde ilçe sonradan müşteri kaydından girilir. Bu iki forma alan eklemek on dokuz ilin hepsinde davranış değiştirir, ayrı karardır (X10).
- **R7.** Mevcut kayıtların ilçesi **boş kalır**; hiçbir kaydın ilçesi tahmin edilmez, türetilmez ya da toplu yazılmaz. İlçesi boş kayıtlar bugünkü kuralla il kartında "ilçesiz" sayılır ve sayıları kaybolmaz (karar 2, onaylandı: doldurma elle yapılacak).
- **R7/2.** (QA B-1.) "Yapısal olarak boş" ifadesinin **tek istisnası XLSX içe aktarmadır**: `SettingsImport.jsx:143` 35. sütunu (`cell(34)`) hiçbir denetimden geçirmeden `ilce` alanına yazar. Yani bu beş ilde bugün bir ilçe değeri varsa tanımı gereği denetlenmemiş bir metindir ve R5/2'nin eşleşmeyen sayısına düşer. İçe aktarmaya doğrulama eklenmesi kapsam dışıdır (X8).
- **R8.** Mevcut on dört ilin ilçe adları, çizimleri ve dosyaları **birebir aynı** kalır.
- **R9.** Dünya ve ülke bölge verisi (`world.js`, `regions/*.js`, `world-arkaplan.js`) **birebir aynı** kalır; bu işte değişen üretilmiş dosyalar yalnız `ilce/*`, `ilceler.js` ve `meta.js`'tir.
- **R9/2.** (QA K-5.) Yardımcı üretici `scripts/gen-arkaplan-adlar.cjs` bu işte **çalıştırılmaz** (R9 `world-arkaplan.js`'i bayt eşitliğinde tutuyor). CLAUDE.md onu `gen-map-paths.cjs`'in yoldaşı olarak tanıttığı için "ikisini birlikte koş" refleksi doğaldır; koşulursa R9 kırılır.
- **R10.** İlçe verisini koruyan test, beş ilin adını ve beş resmî ilçe sayısını da kapsar.
- **R10/2.** (QA Ö-9.) Test planı: veri kriterleri mevcut `tests/ilce-veri.test.js`'e girer ve dosyanın altı testinin adı kanıtladığı AC numarasını taşıyacak şekilde yeniden adlandırılır; harita kriterleri `tests/ui/harita.test.jsx`'in bugünkü İstanbul/Kadıköy desenini izler (`:137-147`, jsdom'da ilçeye inme ölçülmüş olarak çalışıyor); form kriterleri yeni bir dosyaya girer (`tests/ui/ilce-formlari-0094.test.jsx`; teslimat formunun emsali `tests/ui/yedek-parca-satis.test.jsx:434`).
- **R11.** (QA Ö-1 ile düzeltildi.) Lisans ve atıf durumu değişmez: ilçe sınırları geoBoundaries ODbL 1.0'dır, atfın **gerçek yeri** uygulama içindeki akordeondur (Ayarlar › Uygulama › Harita Veri Kaynakları, `src/components/settings/SettingsApp.jsx:176-180` `HARITA_KAYNAKLARI`) ve kaynağın sabitlenmiş sürümü (`gen-map-paths.cjs:40-41`) değiştirilmez. **`ATTRIBUTION.md` diye bir dosya repoda yoktur** (ölçüldü; `git ls-files` ve dosya taraması yalnız alakasız `.claude/skills/ATTRIBUTION.md`'yi gösteriyor); revizyon 1 ona dayanıyordu. Dosyanın yaratılması kapsam dışıdır (X9), CLAUDE.md'nin yanlış atfı ise bu işte tek satırda düzeltilir (R15).
- **R12.** Yeni kalıcı alan, yeni veri bölümü, yeni izin, yeni sunucu kuralı ve göç yoktur. Kayıtların `ilce` alanı zaten var ve kaydediliyor (ölçüldü: `db.cjs` `customers`, `dealers` ve `factory` tablolarında `ilce TEXT`, iki teslimat tablosunda `teslimatIlce TEXT`).
- **R13.** (QA Ö-2.) Üretim **iki aşamada** yapılır ve ikisi de ölçülerek kaydedilir. (1) **Taban turu:** listeye dokunmadan üretici bir kez çalıştırılır ve `git status --short src/lib/map` **boş** çıkmalıdır; bu, ortamın bugünkü çıktıyı yeniden ürettiğinin kanıtıdır. (2) Ancak sonra beş il eklenir, üretici yeniden çalıştırılır ve değişen dosya listesi yalnız `ilce/*`, `ilceler.js` ve `meta.js` olmalıdır. Gerekçe: üretici ilçe klasörünü bütünüyle silip yeniden yazıyor (`gen-map-paths.cjs:494`), yani bayt eşitliği yalnız önbelleğe değil `node_modules`'daki `d3-geo`/`topojson-*` sürümlerine de bağlıdır; taban turu olmadan "benim değişikliğim mi, ortam mı" sorusu ayrılamaz.
- **R14.** (QA K-1.) Beş il listeye **Hatay'dan sonra**, spec'in kendi sırasıyla eklenir: Aydın, Sakarya, Eskişehir, Gaziantep, Yalova. Sıranın başka hiçbir etkisi yoktur (aramalar anahtar bazlıdır) ama test tam diziyi karşılaştırdığı için (`ilce-veri.test.js:13`) kararı yazılı olmalıdır.
- **R15.** (QA K-2, K-3.) Liste sayısını taşıyan üç yorum ve bir doküman cümlesi güncellenir: `gen-map-paths.cjs:44-45` ("kalan 70 il"; bugün de yanlış, 81 − 14 = 67, bu işten sonra 62), `Harita.jsx:21` ("şimdilik 14"), `tests/ilce-veri.test.js:12` (test adı "14 il") ve `CLAUDE.md`'nin harita bölümü. CLAUDE.md'de bugün **hiçbir il sayısı yazmıyor** (ölçüldü), bu yüzden tek cümle **eklenir**: ilçe kırılımı on dokuz ili kapsar, listesi `gen-map-paths.cjs` `ILCE_ILLERI`'ndedir ve aynı liste formların İlçe alanını da besler.

---

## Constraints

### Uyulması zorunlu

- **C1.** Form listesi ile harita verisi **tek kaynaktan** gelmeye devam eder (`src/lib/map/ilceler.js`). Üretilmiş dosyalar elle düzenlenmez; aksi hâlde "formda ilçe var, haritada yok" durumu sessizce doğar. Bu kural dosyaların başındaki "ÜRETİLMİŞ DOSYA, elle düzenlemeyin" uyarısının kendisidir.
- **C2.** Üretici, ham kaynak önbelleği duran bir makinede çalıştırılır. Gerekçe ölçüldü: yalnız Türkiye sınırları sabitlenmiş sürümden geliyor; dünya sınırları `master` dalından, şehir dizini günlük dökümden, şehir listesi canlı API'den çekiliyor. Önbellek yoksa dünya ve bölge verisi de yeniden üretilir, gerçek bölge verisine bakan testler kırılabilir. Çalıştırmadan sonra R9 **ölçülerek** doğrulanır (değişen dosya listesi üç yolu geçmemeli).
- **C3.** geoBoundaries'in sabitlenmiş sürümü (`9469f09`) değiştirilmez; değiştirilirse mevcut on dört ilin çizimleri de oynar ve R8 bozulur.
- **C4.** Ad düzeltmesi üreticinin sözlüğünde tek yerde yapılır; bileşene, forma ya da üretilmiş dosyaya yazılmaz (düzeltme hem haritaya hem form listesine aynı anda yansımalı).
- **C5.** (QA Ö-3 ile düzeltildi.) Eklenen il adı **üç ayrı sözlükte birebir** aranır; revizyon 1 yalnız birincisini sayıyordu, oysa üreticinin aradığı ikincisidir (`ilceGrup[il]` anahtarı geoBoundaries `shapeName`'dir) ve formda alanın çıkmasını belirleyen üçüncüsüdür (`ILCELER[city]`, `city` çalışma anındaki şehir listesinden gelir; çevrimdışıysa `staticCities` = `CITIES_TR`). Ölçüm 1'in ikinci tablosu beş ilin üçünde de birebir eşleştiğini ve bugün tam bir adın ayrıştığını gösteriyor: geoBoundaries **"Hakkâri"**, program **"Hakkari"**. Yazım farkı olan bir il ya üretimde hata verir (C7) ya da formda hiç görünmez.
- **C6.** İlçe verisi il başına ayrı dosyada ve tembel yüklenir hâlde kalır: Harita açılışında yalnız ad listesi, ilçe çizimleri yalnız o ile tıklanınca yüklenir.
- **C7.** (QA Ö-4 ile tamamlandı.) İlçesi bulunamayan il üreticide bugünkü gibi **hata verir** ve üretim yarıda kesilir (sessizce boş dosya yazılmaz). Eksik olan şu: silme, doğrulamadan **önce** çalışıyor (`fs.rmSync` `:494`, `throw` `:500`), yani yanlış yazılmış bir il adı bütün ilçe verisini yarım bırakır. Bu yüzden ad doğrulaması çalıştırmadan **önce** yapılır (C5'in üç sözlüğü) ve hata hâlinde kurtarma yolu `git checkout -- src/lib/map/ilce`'dir. "Sessizce boş dosya yazılmaz" ifadesi yanlış bir güven vermesin: davranış gürültülü ama yıkıcıdır.

- **C8.** (Plan kararı P1.) Taban turunda (R13 aşama 1) fark çıkarsa üretime devam edilmez: değişiklikler `git checkout -- src/lib/map` ile geri alınır ve fark Takım Yöneticisi'ne raporlanır; kütüphane sürümünü sabitlemek gibi bir yol kendiliğinden seçilmez (X4).
- **C9.** (Plan kararı P7.) Üreticinin "silme doğrulamadan önce" sırası bu işte değiştirilmez; yalnız taramayla kayda geçer (AC-25/2).

### KAPSAM DIŞI

- **X1.** Kalan 62 ilin ilçe kırılımı — *neden:* liste müşterinin gerçekten ilçe takip ettiği illerle sınırlı tutuluyor; her il hem veri boyutu hem de o ildeki kayıtların ilçesini doldurma yükü getirir. Yeni il gerektiğinde liste yine genişletilir.
- **X2.** Dışa aktarmaya "İlçe" sütunu eklenmesi ve ilçelerin Excel'den toplu doldurulması — *neden:* karar 2 elle doldurmayı seçti; toplu yol bütün müşteri kaydını geri yazdığı için ayrı spec ister. Bugünkü durum kayda geçsin: içe aktarma `ilce` sütununu okuyor, dışa aktarma yazmıyor, yani bugün "dışa al, doldur, geri yükle" yolu kapalı.
- **X3.** Listenin müşteri verisinden kendiliğinden türetilmesi — *neden:* liste derleme anında üretilen veriyi belirliyor, çalışma anında müşteri verisine bakamaz; ayrıca hangi ilin takip edileceği bir iş kararıdır.
- **X4.** Dünya sınırları ve şehir dizini kaynaklarının güncellenmesi ya da sabitlenmesi — *neden:* bu işte amaç beş il eklemek; kaynak güncellemesi 8 MB'lık veriyi ve gerçek veriye bakan testleri etkiler, kendi işi olur. C2 bu işte yeniden üretilmemesini garanti eder.
- **X5.** Beş ildeki mevcut müşterilerin ilçesinin doldurulması — *neden:* bu bir veri girme işidir, yazılım işi değil; R7 uygulamanın hiçbir şeyi tahmin etmediğini sabitler.
- **X6.** Harita dışında ilçe bazlı rapor, süzgeç ya da dışa aktarma — *neden:* istek haritanın kırılımıdır; ilçe bazlı raporlama ayrı ihtiyaçtır.
- **X7.** (QA B-2.) "Çanakkale merkez" adının düzeltilmesi — *neden:* ad bugün üretilmiş veride, form listesinde ve haritada duruyor, yani kullanıcı kaydında olabilir; değiştirilmesi R8 ile AC-9'u kırar ve o adı taşıyan kaydı eşleşmeyen değere düşürür (R5/2). Düzeltme ancak kayıtların taşınmasıyla birlikte yapılabilir, bu da ayrı iştir. Aynı gerekçe ölçüm 4'teki diğer 49 "merkez" adı için de geçerlidir ama onların illeri listede değildir.
- **X8.** (QA K-7.) XLSX içe aktarmanın `ilce` sütununu doğrulaması — *neden:* bu iş beş il eklemektir; içe aktarmaya alan doğrulaması eklemek bütün sütunların doğrulama politikasını açar. Sonucu R5/2 görünür kılıyor, yani kullanıcı sessizce yanlış veriyle kalmıyor.
- **X9.** (QA Ö-1.) `ATTRIBUTION.md` dosyasının yaratılması — *neden:* atıf yükümlülüğü bugün uygulama içi akordeonla karşılanıyor (R11); ayrı bir lisans dokümanı açmak hukuki metin kararıdır ve bu spec'in konusu değildir. CLAUDE.md'nin var olmayan dosyaya yaptığı atıf R15 ile düzeltilir.
- **X10.** (QA Ö-7.) "Yeni Sahip" ve "önceki sahip düzenleme" formlarına ilçe alanı eklenmesi — *neden:* o iki form bugün on dört ilde de ilçe alanı çizmiyor; eklenmesi on dokuz ilin hepsinde davranış değiştirir ve R6'nın "başka hiçbir formda alan ne eklenir ne kalkar" kuralını açar. İkinci el devirden sonra ilçe müşteri kaydından girilir (R6/3).

---

## Context

### Liste nerede ve neyi belirliyor

İlçe kırılımı tek bir listeden geliyor: `scripts/gen-map-paths.cjs:45` `ILCE_ILLERI` (bugün 14 il; revizyon 1 satır 46 diyordu). Üretici bunu geoBoundaries verisiyle işleyip üç çıktı yazıyor: il başına çizim dosyası (`src/lib/map/ilce/<il>.js`), ad listesi (`src/lib/map/ilceler.js`) ve üretim özeti (`src/lib/map/meta.js`, `ilceIlleri: 14`). Çıktı repoya commit ediliyor, uygulama çalışma ya da derleme anında harita kütüphanesine ihtiyaç duymuyor.

**Liste yalnız haritayı değil formları da süzüyor.** `ilceler.js`'i **doğrudan** okuyan üç kaynak dosyası var (`Harita.jsx`, `ui.jsx`, `settings/SettingsCompany.jsx`) ve bir test; aşağıdaki tablo **etkilenen** yerleri sayar, yani dört form listeye `ui.jsx`'in ortak alanı üzerinden bağlıdır:

| Yer | Dosya:satır | Etki |
|---|---|---|
| Harita ilçe kırılımı | `Harita.jsx:296` (ve yan panel `:462`) | İl ancak listedeyse tıklanıp ilçeye inilir |
| Müşteri ekle/düzenle | `CustomerAddEditForm.jsx:144` → `ui.jsx:539` | İlçe alanı ancak listedeki ilde çizilir |
| Bayi formu | `SimpleDealers.jsx` → `ui.jsx:539` | aynı |
| Extra Kalıp teslimat adresi | `PartSaleForm.jsx` → `ui.jsx:539` | aynı |
| Yedek parça teslimat adresi | `YedekParcaSatisForm.jsx` → `ui.jsx:539` | aynı |
| Fabrika adresi | `SettingsCompany.jsx:145` | aynı |

Bunun sonucu şu: **bir il listede olmadığı sürece o ildeki müşteriye ilçe girilemez**, çünkü alan hiç çizilmiyor. Yani bu beş ildeki kayıtların ilçesi bugün yapısal olarak boş. Tek istisna XLSX içe aktarmadır: 35. sütun `ilce` alanına yazıyor (`SettingsImport.jsx:143`), dışa aktarmada bu sütun yok.

### Ölçüm 1: beş ilin adları ve sayıları (2026-10-19)

Üreticinin ilçe → il atama kuralını (ilçe merkezi hangi il sınırının içindeyse o il, sınırın dışına düşen kıyı ilçesi en yakın ile) birebir uygulayıp önbellekteki geoBoundaries verisinden çıkardım. Veri 81 il ve 973 ilçe taşıyor, sınır dışına düşüp en yakın ile verilen üç ilçe var.

| İl | Ölçülen ilçe | Resmî | Durum |
|---|---|---|---|
| Aydın | 17 | 17 | tutuyor |
| Sakarya | 16 | 16 | tutuyor |
| Eskişehir | 14 | 14 | tutuyor |
| Gaziantep | 9 | 9 | tutuyor |
| Yalova | 6 | 6 | tutuyor, bir ad yanlış |

Üç ad sözlüğünü de karşılaştırdım (C5'in gerekçesi):

| Sözlük | Nerede kullanılıyor | Beş il | Bugünkü tek sapma |
|---|---|---|---|
| Program listesi (`CITIES_TR`, 81) | formun çevrimdışı yedeği, `ilce-veri.test.js:18` | beşi de var | yok |
| geoBoundaries ADM1 `shapeName` (81) | üreticinin `ilceGrup[il]` araması | beşi de var | **"Hakkâri"** |
| Çalışma anı şehir listesi (81) | formda `city`, yani `ILCELER[city]` | beşi de birebir | yok |

Programın yazımı "Hakkari", geoBoundaries'in yazımı "Hakkâri"; yani listeye bir gün Hakkari eklenirse üretici hata verir (C7). Beş il için üç sözlük de birebir eşleşiyor.

Adların tamamı doğru Türkçe yazımla geliyor (Kuşadası, Köşk, Didim, Şahinbey, Şehitkamil, Çınarcık, Odunpazarı, Karapürçek), yani bu beş il için ASCII düzeltmesi gerekmiyor. **Tek sapma Yalova'nın merkez ilçesi: veri "Yalova merkez" diyor, resmî adı "Yalova".** Düzeltilmezse kullanıcı İlçe listesinde "Yalova merkez" seçer ve harita o adla boyar. Mekanizma hazır: `ILCE_ISIM_DUZELT` (`gen-map-paths.cjs:84`) bugün üç düzeltme taşıyor ("Imbros" → "Gökçeada", "Ayvacik" → "Ayvacık", "Prince Islands" → "Adalar") ve düzeltme hem haritaya hem form listesine aynı anda yansıyor.

### Ölçüm 2: boyut etkisi önemsiz

Bugünkü on dört ilin ham koordinat sayısı ile üretilmiş dosya boyutu arasındaki oranı çıkardım (293.969 nokta, 593 KB, yani 2,07 bayt/nokta) ve beş ili bu oranla tahmin ettim:

| İl | Ham nokta | Tahmini dosya | Gerçekleşen (2026-10-19) |
|---|---|---|---|
| Aydın | 12.048 | ~24 KB | 28.475 bayt (27,8 KB) |
| Sakarya | 5.739 | ~12 KB | 12.521 bayt (12,2 KB) |
| Yalova | 5.307 | ~11 KB | 11.126 bayt (10,9 KB) |
| Eskişehir | 4.183 | ~8 KB | 9.103 bayt (8,9 KB) |
| Gaziantep | 2.108 | ~4 KB | 4.964 bayt (4,8 KB) |
| **Toplam** | **29.385** | **~59 KB** | **66.189 bayt (64,6 KB)**; oran 2,25 bayt/nokta (tahmin 2,07; Aydın en çok sapan) |

Karşılaştırma: bugünkü en büyük ilçe dosyası Muğla 108 KB, İzmir 95 KB. Beş ilin toplamı en büyük tek ilden daha küçük ve dosyalar tembel yüklendiği için ana paket hiç büyümüyor.

Tahminin dayandığı oran QA turunda yeniden ölçüldü ve tuttu: on dört dosyanın toplamı 607.204 bayt (593 KB), Muğla 110.174 bayt (107,6 KB), İzmir 97.451 bayt (95,2 KB). **Üretimden sonra beş ilin gerçek dosya boyutu bu tabloya "gerçekleşen" sütunu olarak yazılır** (QA K-10), böylece bir sonraki genişletmenin tahmini kalibre edilir.

### Ölçüm 3: eşleşmeyen bir ilçe değeri bugün yarım çiziliyor (QA B-1)

Kodu okuyup ölçtüm (2026-10-19). Bir kayıtta dolu ama üretilen listede karşılığı olmayan bir `ilce` değeri varsa (tek kaynağı XLSX içe aktarma, R7/2) üç katman birbiriyle çelişiyor:

| Katman | Nerede | Eşleştirme | Sonuç |
|---|---|---|---|
| İlçe boyaması | `Harita.jsx:196` | `ilVerisi.ilceler[ad]`, tam metin | hiçbir ilçeyi boyamaz |
| İlçe pini | `mapStats.js:368` | `ilceMerkezleri[sadeAd(ilce)]`, sadeleştirilmiş | ASCII varyantta pin **çizilir** |
| İl kartı | `mapStats.js` `ilOzeti` | yalnız "boş mu" | dolu olduğu için "ilçesiz" **sayılmaz** |

Yani ilin toplam makina sayısı tutar, ilçe boyanmaz, üstünde pin durur ve kullanıcıya hiçbir yerde neden söylenmez. Ülke seviyesinde bu sorunun çözümü zaten var (`bolgeToplami(...).eslesmeyen`, `Harita.jsx:208`); ilçe seviyesinde hiç yok. R5/2 bunu kapatır.

### Ölçüm 4: "merkez" yazımı Yalova'ya özgü değil (QA B-2)

Ham ADM2 verisinde "merkez" içeren **51 ad** var ("Çanakkale merkez", "Osmaniye (merkez)", "Artvin Merkez", "Afyonkarahisar (Merkez İlçe)", "Rize merkezi" gibi; "Merkezefendi" Denizli'nin gerçek ilçe adıdır). On dokuz ilin içinde bunlardan **ikisi** kalıyor:

| Ad | İl | Bugünkü durum | Bu işte |
|---|---|---|---|
| "Yalova merkez" | Yalova (yeni) | hiçbir kayıtta olamaz, il listede değil | **düzeltilir** → "Yalova" (R3) |
| "Çanakkale merkez" | Çanakkale (mevcut 14'ten) | `ilce/canakkale.js`'te duruyor, form listesinde seçilebiliyor, haritada o adla boyanıyor | **dokunulmaz** (R3/2, X7) |

Beş yeni ilin diğer dördünün merkez ilçesi kendi adını taşıyor (Efeler, Adapazarı, Odunpazarı ile Tepebaşı, Şahinbey ile Şehitkamil), yani düzeltme gerçekten tek satır.

### Karara bağlanan iki soru (Takım Yöneticisi onayı, 2026-10-19)

**Karar 1 (onaylandı): Yalova'nın merkez ilçesi hangi adla görünecek?** Onaylanan: ad düzeltme sözlüğüne satır eklenip **"Yalova"** yazılır. Gerekçe: resmî ad bu, mekanizmanın üç emsali var ve tek yerde yapıldığı için harita ile form ayrışmaz. Reddedilen seçenek veriyi olduğu gibi bırakmaktı; o zaman İlçe listesinde "Yalova merkez" görünürdü.

**Karar 2 (onaylandı): beş ildeki mevcut müşterilerin ilçesi nasıl dolacak?** Onaylanan: **elle**, kayıtlar düzenlenerek. Gerekçe: bu illerde ilçe alanı hiç çizilmediği için kayıt sayısı sınırlı ve toplu yol (dışa aktarmaya sütun ekleyip içe aktarma ile geri yazmak) bütün müşteri kaydını geri yazdığı için risklidir. Reddedilen seçenek toplu doldurmaydı; gerekirse ayrı spec'le açılır (X2).

### Bilinen tuzaklar ve riskler

- **Üreticiyi çalıştırmak bütün harita verisini yeniden yazar.** Kaynakların yalnız Türkiye sınırları sabitlenmiş (`GB_IL`/`GB_ILCE`, commit `9469f09`); dünya sınırları Natural Earth `master`'dan, şehir dizini GeoNames günlük dökümünden, şehir listesi canlı API'den geliyor. Üretici önbelleği önceliyor (`gen-map-paths.cjs:94`, varsa indirmiyor) ve bu makinede önbellek duruyor (`scripts/.map-cache/`, 2026-07-17 indirmeleri, 80 MB, gitignore'da). Yani bu makinede çalıştırmak tekrarlanabilir; önbelleksiz bir makinede dünya ve bölge verisi oynar ve `tests/harita-alias-gercek-veri.test.js` gibi gerçek bölge verisine bakan testler kırılabilir. C2 ve R9 bunu kurala çeviriyor.
- **Test listeyi sabitliyor.** `tests/ilce-veri.test.js:13` on dört ilin adını dizi olarak, `:23` resmî ilçe sayılarını harita olarak tutuyor; ikisi de genişletilecek. Testin varlık sebebi tam olarak bu spec'in riski: form listesi ile harita verisi ayrışırsa kullanıcı ilçe seçer, harita boyamaz ve bu **sessizce** olur.
- **Harita hemen boyamaz.** Beş ilin kayıtlarının ilçesi boş olduğu için il kartı hepsini "ilçesiz" sayar (`mapStats.js` `ilOzeti`); ilçeler ancak kayıtlar düzenlenip ilçe seçildikçe boyanır. Bu bir hata değil, R7'nin kendisi, ama kullanıcı beklentisi olarak sürüm notunda yazılmalı.
- **Ölçülemeyen tek şey:** bu beş ilde kaç müşteri olduğu. Uygulamanın veritabanı şifreli olduğu için (`better-sqlite3-multiple-ciphers`) kayıt sayısını buradan ölçemedim; Takım Yöneticisi uygulamada Müşteriler ekranını şehre göre süzerek ya da haritada ilin kartındaki "ilçesiz" sayısına bakarak görebilir. Karar 2 bu sayıya bağlı değil (elle doldurma onaylandı), ama iş yükünü o sayı belirler.
- **Dört nokta, MERGE_KEYS, serverAuth, çöp kutusu:** hiçbiri gerekmiyor. `ilce` alanı kayıtlarda zaten var ve kaydediliyor (ölçüldü: `db.cjs:96` müşteri, `:142` bayi, `:337` fabrika, `:194/211` iki teslimat tablosu); bu iş yalnız hangi illerde seçilebildiğini değiştiriyor.
- **`ATTRIBUTION.md` yok (QA Ö-1).** CLAUDE.md'nin harita bölümü "update that accordion and ATTRIBUTION.md" diyor ama dosya repoda değil (ölçüldü). Atfın gerçek yeri `SettingsApp.jsx:176-180`. R15 CLAUDE.md'nin atfını düzeltir, X9 dosyayı yaratmayı kapsam dışına alır.
- **Bayt eşitliği ortama da bağlı (QA Ö-2).** Üretici ilçe klasörünü silip yeniden yazdığı için on dört ilin dosyaları da yeniden üretiliyor; eşitlik `node_modules`'daki `d3-geo`/`topojson-*` sürümlerinin Temmuz 2026 üretimiyle aynı olmasına bağlı. R13'ün taban turu bunu işin başında ayırır.
- **Ad doğrulaması silmeden sonra (QA Ö-4).** Yanlış yazılmış bir il adı `ilce/` klasörü silindikten sonra hata veriyor; kurtarma `git checkout -- src/lib/map/ilce`.
- **Hakkari/Hakkâri (QA Ö-3).** Program ile geoBoundaries arasında bugün ayrışan tek il adı; listeye eklenmek istenirse üretici hata verir.
- **Yalova'nın ilçe adı ilin adına eşit olacak (QA K-4).** On dokuz ilde tek örnek. Çakışma riski taşıyan üç yeri ölçtüm, üçü de güvenli: dosya adı (`yalova.js`; üreticinin `sad`'ı ile `mapStats.sadeAd` birebir aynı fonksiyon), form araması (`ILCELER[city]` yalnız il adlarıyla çağrılıyor) ve ilçe merkezi anahtarı (`sadeAd(ilçe)`, ayrı nesne). "İlçe adı il adına eşit olamaz" varsayan yeni kod yazılmamalı.
- **Formdaki şehir listesi canlı API'den geliyor (QA K-6).** Alanın çıkması `ILCELER[city]`'ye, `city` ise çalışma anındaki şehir listesine bağlıdır (çevrimdışıysa `staticCities` = `CITIES_TR`). Önbellekteki API dökümünde beş ilin de yazımı birebir (ölçüldü). API bir gün "Aydin" yazarsa alan hiç çıkmaz ve bunun üretilmiş veriyle ilgisi olmaz.
- **İçe aktarma ilçeyi doğrulamıyor (QA K-7).** `SettingsImport.jsx:143` `ilce: cell(34)` ham metni yazar; eşleşmeyen değerin tek kaynağı budur (R7/2, X8).
- **Yardımcı üretici çalıştırılmaz (QA K-5).** `gen-arkaplan-adlar.cjs` bu işte koşulmaz (R9/2).

---

## Acceptance Criteria

- **AC-1.** İlçe kırılımı olan il listesi on dokuz ildir ve beş yeni il (Aydın, Sakarya, Eskişehir, Gaziantep, Yalova) listede yer alır.
- **AC-2.** Beş ilin her biri programın 81 il listesindeki yazımla birebir aynıdır.
- **AC-3.** Ölçülen resmî ilçe sayıları tutar: Aydın 17, Sakarya 16, Eskişehir 14, Gaziantep 9, Yalova 6.
- **AC-4.** Beş ilin her birinin harita çizim dosyası vardır ve dosyadaki ilçe adları form listesiyle **aynı kümedir** (iki taraf sıralanarak karşılaştırılır; mevcut testin deseni, `ilce-veri.test.js:34`). Dizi eşitliği aranmaz: üretici il dosyasına `ILCE_ADLARI`'nı ham sırada, `ilceler.js`'e `ILCELER[il]`'i Türkçe sıralı yazıyor (`gen-map-paths.cjs:521`) ve ham sıra çizim dizisiyle eşleşmek zorunda olduğu için değiştirilemez. (Revizyon 1 "birebir" diyordu, QA Ö-5 ile düzeltildi.)
- **AC-5.** Beş ilin çizim verisi boş değildir (her ilçenin çizimi vardır) ve her ilin çizim genişliği `W = 1000`'dir; yükseklik ilin kendi oranından gelir (`gen-map-paths.cjs:505`). "Aynı ölçek" bunu demektir, sadeleştirme eşiğini ya da yüksekliği değil (QA K-8).
- **AC-6.** Yalova'nın ilçe listesi **"Yalova"** adını içerir ve **"Yalova merkez"** adını içermez.
- **AC-6/2.** Çanakkale'nin ilçe listesi **"Çanakkale merkez"** adını içermeye **devam eder** ve ad düzeltme sözlüğüne yalnız bir satır eklenir (QA B-2; ölçüm 4).
- **AC-7.** Yalova'nın harita çizim dosyasındaki ad da "Yalova"dır (düzeltme tek yerde yapıldığı için iki taraf da aynıdır).
- **AC-8.** Beş ilin bilinen ilçeleri doğru ildedir: Aydın'da Kuşadası ve Didim, Sakarya'da Adapazarı ve Sapanca, Eskişehir'de Odunpazarı ve Tepebaşı, Gaziantep'te Şahinbey ve Şehitkamil, Yalova'da Çınarcık.
- **AC-9.** Mevcut on dört ilin ilçe adları ve ilçe sayıları değişmez.
- **AC-10.** Mevcut on dört ilin çizim dosyaları **bayt bayt** aynıdır.
- **AC-11.** Dünya ve ülke bölge verisi bayt bayt aynıdır; bu işte değişen üretilmiş dosyalar yalnız `src/lib/map/ilce/*`, `src/lib/map/ilceler.js` ve `src/lib/map/meta.js`'tir.
- **AC-12.** Üretim özeti ilçe kırılımı olan il sayısını on dokuz olarak yazar.
- **AC-13.** Haritada Aydın'a tıklanınca ilçe görünümü açılır ve ilçeler çizilir.
- **AC-14.** Listede olmayan bir il (örneğin Kayseri) haritada tıklanınca ilçe görünümü **açılmaz**; bugünkü davranış korunur.
- **AC-15.** Müşteri formunda ülke Türkiye ve şehir Sakarya seçilince İlçe alanı çıkar ve listesi o ilin ilçelerini gösterir.
- **AC-16.** Müşteri formunda şehir listedeki beş ilden biri değilken (örneğin Kayseri) İlçe alanı çizilmez.
- **AC-17.** Şehir değiştirilince seçili ilçe temizlenir (bugünkü davranış; Aydın'da ilçe seçip şehri Gaziantep'e çevirince Aydın ilçesi kayıtta kalmaz).
- **AC-18.** Bayi formu, Extra Kalıp teslimat adresi, yedek parça teslimat adresi ve fabrika adresi formunda da beş il için İlçe alanı çıkar.
- **AC-18/2.** İki teslimat formundaki ilçe hiçbir harita öğesine girmez: ilçe pinleri yalnız fabrika, bayi ve müşteri kayıtlarını okur (QA Ö-8).
- **AC-19.** İlçe alanı bugün çizilmeyen formlarda **çizilmemeye devam eder**; bunlar servis formunun işlem firması adresi ile müşteri kaydı yaratan iki formdur: "Yeni Sahip" (`CustomerDetailModal.jsx:1227`) ve önceki sahip düzenleme (`:1285`). Üçü de bilinçlidir (R6/3, X10).
- **AC-20.** Beş ilden birinde ilçesi boş bir müşteri kaydı, il kartında "ilçesiz" olarak sayılır ve hiçbir ilçeye yazılmaz.
- **AC-20/2.** Üretilen listede karşılığı olmayan dolu bir `ilce` değeri "ilçesiz" sayılmaz, bir ilçe olarak da sayılmaz: `eslesmeyen`'e girer ve il paneli kaç makinanın ilçesinin haritada bulunamadığını yazar (QA B-1; ölçüm 3).
- **AC-20/3.** Eşleşmeyen değer için ilçe pini **çizilmez**: pin ile boyama aynı ad kümesini kullanır, yani boyanmayan bir ilçenin üstünde pin durmaz.
- **AC-20/4.** (R5/4.) Eşleşmeyen değerli il kartının toplam makina sayısı ilçeli, ilçesiz ve eşleşmeyen kayıtların toplamıdır; yalnız eşleşmeyen kaydı olan ilde "makina kaydı yok" yazılmaz.
- **AC-21.** Beş ilden birinde ilçesi girilmiş bir müşteri kaydı, il görünümünde o ilçeyi boyar ve yan panelin ilçe listesinde firma adıyla görünür.
- **AC-22.** Mevcut kayıtların ilçe alanı bu işle değişmez: üretim öncesi ve sonrası aynı veriyle açılan uygulamada hiçbir kaydın ilçesi dolmaz ya da silinmez.
- **AC-22/2.** AC-22 ek olarak kaynak taramasıyla sabitlenir: `ilce` alanını toplu yazan, türeten ya da göç eden kod yoktur.
- **AC-23.** Yeni kalıcı alan, yeni veri bölümü, yeni izin kimliği ve yeni sunucu kuralı eklenmediği kaynak taramasıyla sabitlenir.
- **AC-24.** Lisans atfı yerinde kalır: Ayarlar › Uygulama › Harita Veri Kaynakları (`SettingsApp.jsx` `HARITA_KAYNAKLARI`) geoBoundaries ODbL 1.0 atfını göstermeye devam eder ve kaynağın sabitlenmiş sürümü (`9469f09`) değişmez. **`ATTRIBUTION.md`'ye bakılmaz**, çünkü repoda böyle bir dosya yok (QA Ö-1; R11, X9).
- **AC-25.** Üretici, ilçesi bulunamayan bir il verildiğinde hata verip üretimi kesmeye devam eder (boş dosya yazmaz). Kriter kaynak taramasıyla sabitlenir (`throw new Error("İlçesi bulunamayan il: ` satırı durur); betik birim testine uygun değildir ve bu işte parçalanmaz (QA Ö-10).
- **AC-25/2.** Aynı taramada silmenin doğrulamadan önce çalıştığı ve kurtarma yolunun `git checkout -- src/lib/map/ilce` olduğu spec'te yazılıdır (C7, QA Ö-4).
- **AC-26.** R13'ün **taban turu** ölçülmüştür: listeye dokunmadan yapılan üretim `git status --short src/lib/map` çıktısını boş bırakır. Beş ilin eklendiği ikinci turda değişen dosya listesi yalnız `ilce/*`, `ilceler.js` ve `meta.js`'tir (QA Ö-2).
- **AC-27.** Beş ilin adı üç ad sözlüğünde de birebir aranmıştır (program listesi, geoBoundaries `shapeName`, çalışma anı şehir listesi) ve üçünde de bulunur; Hakkari/Hakkâri sapması spec'te kayıtlıdır (QA Ö-3; C5).
- **AC-27/2.** (Plan kararı P6.) AC-27'nin üç sözlüğünden program listesi testle, geoBoundaries `shapeName` ve çalışma anı şehir listesi (önbellek gitignore'da, CI'da yok) ölçümle kanıtlanır; geoBoundaries tarafının dolaylı kanıtı üreticinin kendi `throw`'udur (AC-25).
- **AC-28.** Beş il listeye Hatay'dan sonra, Aydın, Sakarya, Eskişehir, Gaziantep, Yalova sırasıyla eklenir ve mevcut on dördün sırası değişmez (QA K-1).
- **AC-29.** Liste sayısını taşıyan üç yorum (`gen-map-paths.cjs`, `Harita.jsx`, `ilce-veri.test.js`) ile `CLAUDE.md`'nin harita bölümü güncellenir; CLAUDE.md'ye kırılımın on dokuz ili kapsadığını, listenin yerini ve formları da beslediğini söyleyen cümle **eklenir** (QA K-2, K-3; R15).
- **AC-30.** `mapStats.ilOzeti` üçüncü argüman verilmeden çağrıldığında çıktısı **birebir eskidir**; `tests/map-stats.test.js`'in bugünkü beklentileri dokunulmadan yeşil kalır (QA B-1'in opt-in kuralı).
- **AC-31.** `scripts/gen-arkaplan-adlar.cjs` bu işte çalıştırılmamıştır; `world-arkaplan.js` bayt bayt aynıdır (QA K-5; R9/2).
- **AC-32.** AC-10, AC-11 ve AC-22 **ölçüm kriteridir**, birim testi değil: `git status --short src/lib/map` ve `git diff --stat` çıktısıyla doğrulanır (AC-22 ayrıca AC-22/2'nin taramasıyla). DoD'nin "her kriterin testi var" kuralı bu üçünü istisna sayar (QA Ö-6).
- **AC-33.** Kriterlerin testleri R10/2'deki üç yere yazılır: veri kriterleri `tests/ilce-veri.test.js` (altı testin adı taşıdığı AC numarasıyla yeniden adlandırılır), harita kriterleri `tests/ui/harita.test.jsx`, form kriterleri `tests/ui/ilce-formlari-0094.test.jsx` (QA Ö-9).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor; **tek istisna AC-10, AC-11 ve AC-22'dir** (ölçüm kriteri, AC-32) ve testler R10/2'nin üç yerine yazıldı (AC-33).
- [x] Hesap içeren iş yok; üretilen veri üretici tarafından yazıldı, elle düzenlenen üretilmiş dosya yok (C1).
- [x] Form listesi ile harita verisi aynı kaynaktan geliyor ve birebir eşleştiği testle sabitlendi (AC-4).
- [x] Yeni kalıcı alan yok; dört nokta kuralı gerekmedi ve bu **açıkça yazıldı** (AC-23).
- [x] Yeni veri bölümü yok; `MERGE_KEYS` ve `BLOB_SECTIONS` dokunulmadı (AC-23).
- [x] Yeni eylem izni yok; **salt veri genişlemesi olduğu açıkça yazıldı** (R12, AC-23).
- [x] Soft-delete ve çöp kutusu simetrisi: bu işte kayıt silinmesi yok, etkilenmedi.
- [x] Kullanıcıya görünen bütün adlar Türkçe resmî yazımıyla (AC-6, AC-8); yazdırma çıktısı yok, çeviri anahtarı gerekmedi.
- [x] Para gösterimi yok.
- [x] Arayüz kriterlerinin görsel kanıtı eklendi: beş ilin ilçe görünümü, müşteri formunda İlçe alanı, ilçesi boş kayıtlı il kartı.
- [x] **Taban turu ölçüldü (R13 aşama 1, AC-26):** listeye dokunmadan yapılan üretimden sonra `git status --short src/lib/map` boş çıktı; çıktısı plana yazıldı.
- [x] R9 ölçülerek doğrulandı (R13 aşama 2): beş il eklendikten sonra değişen dosya listesi yalnız `ilce/*`, `ilceler.js` ve `meta.js`.
- [x] Üretici önbelleği duran makinede çalıştırıldı (C2) ve geoBoundaries sabitlenmiş sürümü değişmedi (C3); `gen-arkaplan-adlar.cjs` çalıştırılmadı (AC-31).
- [x] Beş ilin adı üç sözlükte de arandı ve üretim öncesi doğrulandı (C5, AC-27); yanlış ad hâlinde kurtarma yolu spec'te yazılı (C7).
- [x] Eşleşmeyen ilçe değerinin davranışı kuruldu: `ilOzeti`'nin üçüncü sayısı, panel satırı ve pin eşleştirmesi (R5/2, AC-20/2, AC-20/3) ve parametresiz çıktının birebir eski kaldığı ölçüldü (AC-30).
- [x] "Çanakkale merkez" adına dokunulmadı ve nedeni spec'te yazılı (R3/2, AC-6/2, X7).
- [x] Ölçüm 2'ye beş ilin **gerçekleşen** dosya boyutu yazıldı (QA K-10).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md`'nin Faaliyet Haritası bölümüne kırılımın on dokuz ili kapsadığını, listenin `ILCE_ILLERI`'nde durduğunu ve formları da beslediğini söyleyen cümle eklendi; `ATTRIBUTION.md` atfı düzeltildi (R15, AC-29). Üç eskiyen yorum da güncellendi.
- [x] Sürüm notunda beş ilin eklendiği, mevcut kayıtların ilçesinin elle doldurulacağı (R7, karar 2), Çanakkale'nin merkez ilçe adının bilinçli olarak değişmediği (R3/2) ve "ilçesi haritada bulunamadı" uyarısının ne anlama geldiği (R5/2) yazıldı (QA K-9).
- [x] Takım Yöneticisi işi istedi ve iki kararı onayladı (2026-10-19). **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu 2026-10-19)

Yirmi iki bulgu çıktı (iki bloklayıcı, on önemli, on küçük); Takım Yöneticisi hepsini onayladı. Her bulgunun cevabı spec'te şu maddelerdedir:

| Bulgu | Konu | Cevabı veren madde |
|---|---|---|
| B-1 | Listede karşılığı olmayan `ilce` değerinin davranışı tanımsız; ölçüm yarım çizim gösteriyor | R5/2, R7/2, AC-20/2, AC-20/3, AC-30, ölçüm 3 |
| B-2 | "Çanakkale merkez" bugün de yanlış; düzeltilirse AC-9 kırılır ve kayıt öksüz kalır | R3/2, X7, AC-6/2, ölçüm 4 |
| Ö-1 | `ATTRIBUTION.md` repoda yok; R11, AC-24 ve DoD ona dayanıyordu | R11, X9, AC-24, R15 |
| Ö-2 | Taban turu yok; bayt eşitliği `node_modules` sürümlerine de bağlı | R13, AC-26, DoD |
| Ö-3 | C5 yanlış sözlüğü denetliyor; üç sözlük var, biri ayrışıyor (Hakkâri) | C5, AC-27, ölçüm 1'in ikinci tablosu |
| Ö-4 | C7 eksik: silme doğrulamadan önce çalışıyor | C7, AC-25/2 |
| Ö-5 | AC-4'ün "birebir" ifadesi dizi eşitliği olarak okunursa kırılır | AC-4 |
| Ö-6 | AC-10, AC-11 ve AC-22 birim testiyle doğrulanamaz | AC-32, AC-22/2, DoD |
| Ö-7 | Müşteri kaydı yaratan iki form ilçe alanı çizmiyor | R6/3, X10, AC-19 |
| Ö-8 | Teslimat ilçesi haritaya hiç girmiyor | R6/2, AC-18/2 |
| Ö-9 | Test planı adlandırılmamış | R10/2, AC-33 |
| Ö-10 | AC-25'in testi yazılamaz biçimde tanımlı | AC-25 |
| K-1 | Beş ilin ekleme sırası tanımsız | R14, AC-28 |
| K-2 | Üç yorum ve bir satır atfı eskiyecek | R15, AC-29, ölçüm bölümünün girişi |
| K-3 | CLAUDE.md'de güncellenecek il sayısı cümlesi yok | R15, AC-29, DoD |
| K-4 | Yalova'nın ilçe adı ilin adına eşit olacak | Bilinen tuzaklar |
| K-5 | Yardımcı üreticinin çalıştırılmayacağı yazılı değil | R9/2, AC-31 |
| K-6 | Formdaki şehir listesinin canlı API'den geldiği zinciri yazılı değil | C5, Bilinen tuzaklar |
| K-7 | XLSX içe aktarma ilçeyi doğrulamıyor | R7/2, X8, Bilinen tuzaklar |
| K-8 | AC-5'in "aynı ölçek" ifadesi belirsiz | AC-5 |
| K-9 | Sürüm notu iki şeyi daha söylemeli | DoD |
| K-10 | Ölçüm 2 tahmin; gerçekleşen boyut kayda geçmeli | Ölçüm 2, DoD |

### Plan kararları (uygulama planı onayı 2026-10-19)

Takım Yöneticisi planın §4'teki on önerisini kabul etti.

| No | Konu | Cevabı veren madde |
|---|---|---|
| P1 | Taban turunda fark çıkarsa dur, geri al, raporla | C8 |
| P2 | Eşleşme kümesi `ILCELER[il]` | R5/3 |
| P3 | İl kartı toplamı ve boş koşulu eşleşmeyeni sayar | R5/4, AC-20/4 |
| P4 | Pin kuralı opt-in, anahtar biçimi değişmez; on dokuz ilde geçerli | R5/5 |
| P5 | Panel cümlesi dışa verilen sabit | R5/5 |
| P6 | AC-27'nin iki sözlüğü ölçümle | AC-27/2 |
| P7 | Üreticinin silme sırası değişmez | C9 |
| P8 | Dal `feat/0093-plan-uretimdeki` üstünde | Uygulama |
| P9 | Harita görüntü aracında; gerekirse bekleme adımı | Uygulama |
| P10 | AC-23 için 0093'ün fikstürü okunur | AC-23 |

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | Taslak (TY'nin iki kararı), QA turu (22 bulgu), plan onayı (on öneri: R5/3, R5/4, R5/5, C8, C9, AC-20/4, AC-27/2) |
| **Düzeltme turu sayısı** | 1 | Tek triyaj turu, bir bulgu |
| **Bulgu gerçek/gürültü oranı** | 1 / 0 | README'nin sıra paragrafı, 0094 paragrafı ve tablo satırı eskimişti (düşük); elle yerleştirilmiş fabrika konumunun pin kuralı dışında kalması bulgu sayılmadı (bilinçli, testle sabit) |
| **Regresyon sayısı** | 0 | Electron dahil tam takım yeşil (Electron'suz 354 dosya, 4722 test; Electron 13 dosya); mevcut 14 ilin dosyaları, dünya ve bölge verisi bayt eşit; `map-stats` eski beklentileri dokunulmadı |
| **Kaçan hata** | 0 | Mutasyonla ölçüldü: liste verilmeyince 2, toplamdan eşleşmeyen çıkarılınca 1, satış pini süzülmeyince 1, fabrika/bayi pin süzmesi kaldırılınca 1 test kırıldı |

**Bu spec'ten çıkarılan ders:** Üretilmiş verinin işi "iki tur" kuralıyla güvenli oldu: listeye dokunmadan yapılan ilk üretimin boş `git status`'u, ikinci turdaki farkın yalnız bu işten geldiğini kanıtladı ve 8 MB'lık verinin elle incelenmesine gerek bırakmadı. Spec'in yazmadığı bir sonuç (eşleşmeyen değer ilçe sayısından çıkınca il kartının toplamının düşmesi) kodu okuyarak plan aşamasında görüldü; bir sayıyı bir kümeden başka kümeye taşıyan her değişiklikte o kümelerin toplandığı yerler aranmalı.
