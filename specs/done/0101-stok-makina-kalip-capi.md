# 0101 — Stoktaki makinanın kalıp çapı ve müşteri formuna akışı

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3; uygulama commit `83eb615`, dal `feat/0101-kalip-capi`, 2026-10-22) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Stok › Makina Stoğu (ekleme ve düzenleme penceresi, liste), müşteri ekleme formunun stoktan makina seçicisi, müşteri silinince stoğa dönen satır, Ayarlar › Veri Yönetimi › Dışa Aktar'ın Stok paketi; `stock` tablosunun yeni alanı; `src/lib/utils.js` (biçimleme ve ön doldurma), `src/components/ui.jsx` (paylaşılan alan); `docs/tasarim-sozlugu.md` (paylaşılan alanın sözlük satırı); `docs/evidence/kanit-eslemesi.json`; `tests/ui/stok-durumu-0100.test.jsx` (AC-4'ün sütun sayısı); `tests/server-authz.test.js` (AC-33) |
| **Bağımlı spec'ler** | 0100 (stok satırının yeni alanı ve serisiz düşüm motoru), 0002 (stoktan satışta damgalama, geri dönen satırın özgün tarihi), 0065 (stok hareketi ve kit düşümü), 0016 (liste ve boş durum birliği) |
| **Ters çevrilen kriterler** | spec 0100 **AC-4** (Makina Stoğu tablosunun sütun sayısı altıdan yediye çıkar; "Durum Model'in hemen sağında" kuralı korunur, bkz. R9 ve Karar 9). Ayrıntı "Ters çevrilen kriterler" tablosunda. Görsel kanıtta `makina-stok-formu` ve stok listesi ekranları bilinçli değişir, ayrıntı "Görsel kanıt" bölümünde |

---

## Intent

Fabrika bir makinayı üretirken kalıp çapını biliyor: makina o ölçüye göre yapılıyor. Ama bu bilgi uygulamaya ancak makina satıldığında, müşteri kaydı açılırken giriliyor. Aradaki sürede makina stokta duruyor ve ölçüsü hiçbir yerde yazmıyor; satışı yapan kişi ya üretimi yapanı arıyor ya da makinanın üstünden okuyor. Yanlış ölçü girilirse hata müşteri kartında, garanti süresince ve üretim formunda yaşamaya devam ediyor.

İstek, ölçüyü doğru yerde, makina üretilirken sormak ve satışta kendiliğinden taşımak. Stoğa makina eklenirken kalıp çapı girilir; o makina bir müşteriye satılırken ölçü müşteri formuna kendiliğinden gelir ve satışı yapan kişi onu yeniden yazmaz.

Başarı şu: üretim sorumlusu makinayı stoğa girerken çapı yazar, Makina Stoğu listesinde hangi makinanın hangi ölçüde olduğunu görür; satışı yapan kişi müşteri formunda seri no'yu seçtiği anda çapın dolmuş olduğunu görür, gerekirse düzeltir. Ölçü zincirin en başında bir kez girilir ve üretim formuna kadar kendi kendine akar.

---

## Requirements

### Veri

- **R1.** Stoktaki her makina bir kalıp çapı taşıyabilir. Alan müşteri makinasındaki ile **birebir aynı şekildedir**:
  üç parça (Çap, Arka Ölçü, Boy). Kalıcı alan `stock[].kalipCapi`, saklanan değer `{en, yukseklik, boy}` nesnesi (Karar 1).
- **R2.** Alan isteğe bağlıdır. Boş çap kayda **yazılmaz**: üç parçanın hepsi boşsa (yalnız boşluk karakteri de boş sayılır)
  kaydın gövdesinde `kalipCapi` anahtarı hiç bulunmaz, `null` da yazılmaz. Boşluk denetimi yalnız anahtarın yazılıp
  yazılmayacağına karar verir, parçaların **değerine dokunmaz** (R3/2).
- **R2/2.** Yazımın tek yolu `utils.js`'e, `fmtKalipCapi`'nin yanına konan **`kalipCapiYaz(kayit, kc)`**'dir (spec 0100'ün
  `uretimDurumuYaz` emsali): alanı her çağrıda siler, `fmtKalipCapi(kc)` boş dize döndürmüyorsa geri yazar.
  `MakinaStokTab.save()` kayıt nesnesini **iki dalda da** (ekleme ve düzenleme) bu fonksiyondan geçirir. Tuş vuruşunda
  form durumu serbest kalır (kullanıcı kutuyu boşaltıp yeniden yazabilsin); temizleme `onChange`'de yapılmaz.
- **R3.** "Çap dolu mu" sorusunun tek ölçütü vardır: `utils.fmtKalipCapi(kc)` boş dize döndürmüyorsa doludur. Ekranlar ve
  yazım yolları kendi boşluk denetimini yazmaz. Bu ölçütün **kendi testi vardır** (bugün yok, ölçüm 14).
- **R3/2.** Saklanan değer **kırpılmaz**: parçalar kullanıcının girdiği gibi saklanır (müşteri tarafıyla birebir, Karar 1).
  Bir parçası dolu, ötekileri boşluk olan nesnede anahtar yazılır ve üç parça girildiği gibi kalır; `fmtKalipCapi` yalnız
  gösterimde kırptığı için ham boşluk hiçbir çıktıya sızmaz (ölçüm 15).
- **R4.** Veri taşıma yapılmaz. Bugünkü stok satırlarına hiçbir değer yazılmaz ve dokunulmamış bir satırın gövdesi
  bu spec'ten sonra birebir aynı kalır.
- **R5.** Mevcut bir stok satırının başka bir alanı (not, seri no, durum, kit) değiştirilip kaydedildiğinde gövdesine
  `kalipCapi` anahtarı girmez: alan yalnız kullanıcı çap kutularına yazarsa doğar.

### Stok formu ve listesi

- **R6.** Stoğa Makina Ekle ve stok makinasını düzenleme penceresinde "Makina Kalıp Çapı" alanı bulunur. Alan müşteri
  formundakinin aynısıdır: üç kutu, aralarında `×` işareti, yer tutucuları "Çap", "Arka Ölçü", "Boy".
- **R6/2.** Alanın yeri: Seri Numarası'nın hemen altı. Stok formunun sırası **Makina Modeli, Seri Numarası, Makina Kalıp
  Çapı, Stoğa Giriş Tarihi, Üretim durumu, Üretim partisi, Not, Kullanılan Parçalar** olur. Böylece müşteri formundaki
  seri no komşuluğu korunur, `giderYetki`'ye bağlı parti seçicisinin üstünde kalır (C6) ve isteğe bağlı kit bölümünün
  dibinde kaybolmaz.
- **R7.** Alan **tek bir paylaşılan bileşenden** çizilir; iki ekran aynı bileşeni kullanır (`CountryCityFields` emsali).
  Üç kutulu çap alanının ikinci bir kopyası kaynakta bulunmaz.
- **R7/2.** Bileşen **`Field` başlığını da içine alır** (emsalle aynı sınıf: `CountryCityFields` kendi `Field`
  sarmalayıcılarını taşır, ölçüm 13), imzası `({ value, onChange, label = "Makina Kalıp Çapı" })`'dir ve `onChange`
  bütün `{en, yukseklik, boy}` nesnesini verir. Başlık metni ikinci bir yerde yazılmaz.
- **R7/3.** Üç kutu `aria-label="Çap"`, `aria-label="Arka Ölçü"`, `aria-label="Boy"` taşır (bugün yalnız yer tutucu var).
  Bu bir erişilebilirlik eklemesidir, görünümü değiştirmez: müşteri formu ekranlarının piksel farkı 0 kalır (AC-29/2).
- **R8.** Düzenleme kipinde kayıtlı çap kutulara dolu gelir.
- **R9.** Makina Stoğu listesinde **Durum'un sağında, Seri Numarası'nın önünde** "Kalıp Çapı" sütunu bulunur; tablo
  yedi sütun olur: Model, Durum, Kalıp Çapı, Seri Numarası, Stoğa Giriş, Not, işlem (Karar 7, Karar 9). Değer
  `fmtKalipCapi` biçimiyle yazılır ("50 x 80 x 115"); çapı olmayan satırda hücrede "—" yazar (Not sütununun bugünkü
  deseni, `MakinaStokTab.jsx:233`).
- **R9/2.** Spec 0100 AC-4'ün "Durum sütunu Model'in **hemen** sağında" kuralı korunur; o kriterin ikinci yarısı
  ("tablo altı sütun") bu spec'le **yedi** sütuna güncellenir ve testi "spec 0101 ile" notuyla değiştirilir (ölçüm 11).
- **R10.** Stok dışa aktarmasına (Excel ve CSV) "Makina Kalıp Çapı" sütunu eklenir, Model'in hemen sağına. Çapı olmayan
  satırın hücresi boştur. Tek fonksiyon iki çıktıyı birden besler (`SettingsExport.jsx:263-273` `exportStock`, Excel ve
  CSV aynı `rows` dizisinden; `fmtKalipCapi` o dosyada zaten içe aktarılmış, `:4`), bu yüzden tek değişiklik yeter
  (ölçüm 20).

### Müşteri formuna akış

- **R11.** Müşteri **ekleme** formunda stoktan bir makina seçildiği anda, o makinanın çapı forma yazılır ve
  **düzenlenebilir** kalır (Karar 2). Akış görünür: kullanıcı ölçüyü ekranda görür ve gerekirse değiştirir.
- **R11/2.** Ön doldurma yalnız **üç** seçimde çalışır: serili bir seçenek, serisiz seçenek ve R16'nın ikinci kipindeki
  aynı seçimler. Seçicinin **boş seçeneği** ("Stoktan seçin... (n adet)") bir makina seçimi değildir: `_stokSerisiz`
  ile seri no temizlenir, çap ve kit alanlarına **dokunulmaz** (Karar 10). Bugün bu dal, serisiz satırların seri
  no'su tam olarak `""` olduğu için ilk serisiz satırı buluyor ve kit ön doldurmasını sessizce o satırdan yapıyor
  (ölçüm 12); çap görünür olduğu için aynı yol kullanıcıya yanlış ölçü olarak çıkardı.
- **R12.** Stok satırının çapı doluysa formdaki değeri **ezer** (seçici neyi gösteriyorsa form onu gösterir).
  Stok satırının çapı boşsa forma dokunulmaz: elle girilmiş değer korunur (Karar 3).
- **R12/2.** Ezme **nesne düzeyindedir**: çap nesnesi bütün olarak yazılır, parça parça birleştirilmez (kit emsalinin
  `tipSecimleri`'ni bütün olarak yazması gibi). Stok satırında yalnız `en` doluysa formdaki `yukseklik` ve `boy`
  kaybolur; amaç tek bir makinanın ölçüsünü göstermek, iki makinanın ölçüsünü karıştıran melez bir değer üretmemektir
  (Karar 11).
- **R13.** Seri no'suz satış seçeneğinde ön doldurma, **düşülecek makinanın kendisinden** yapılır: kaynak satır
  `stokDurumu.serisizDusulecek`'in seçtiği satırdır (kit ön doldurmasının bugünkü kaynağı, spec 0100 R6/3).
- **R14.** "Manuel gir (stok dışı / eski müşteri)" seçildiğinde çap alanına dokunulmaz.
- **R15.** Ön doldurma kuralı React'sız bir fonksiyondur: stok satırını alır, çapı doluysa yazılacak alanı, boşsa boş
  nesne döndürür. Çağıran onu bugünkü kit ön doldurmasıyla aynı biçimde forma yayar. Dönüş biçimi `getKitAutoFill`'in
  biçimiyle birebir aynıdır ("yazılacak alanlar nesnesi, yoksa boş nesne").
- **R16.** Seri no bekleyen kaydın düzenlenmesinde (stok seçicisinin çizildiği ikinci kip) ön doldurma aynı şekilde çalışır.
- **R17.** Çap müşteri kaydına **kopyalanır**. Satıştan sonra stok satırı diziden çıktığı için geriye bağ kurulmaz;
  müşteri kaydının çapı yalnız müşteri formundan değişir (Karar 5).
- **R18.** Müşteri tarafındaki alanın çizimi, doğrulaması ve saklanması değişmez. Müşteri formunun kendi çap alanı
  bugünkü gibi boş nesne de yazabilir; bu spec müşteri tarafının gövdesine dokunmaz (X4).

### Müşteri silinince stoğa dönen makina

- **R19.** Müşteri çöpe atılınca Makina Stoğu'na dönen satır müşterinin çapını **taşır** (Karar 6). Emsali aynı satırda
  duran `uretimTarihi` ve `partiId` taşımasıdır.
- **R20.** Müşterinin çapı boşsa dönen satırın gövdesinde `kalipCapi` anahtarı bulunmaz (R2 ile aynı kural).
- **R21.** Dönen satır yeniden satıldığında çap, bugünkü ön doldurma yolundan (R11) yeni müşteri kaydına gelir.

### Değişmeyenler

- **R22.** Makina maliyeti, parti payları, üretim adetleri, stok hareketleri ve kit düşümü çaptan etkilenmez.
- **R22/2.** Bu, **rakam düzeyinde** ölçülür: `makinaMaliyeti.makinaListesi` her stok satırını `kayit: s` ile referansla
  taşıdığı için (`:119-126`, ölçüm 16) çaplı satırda motor çıktısı derin eşitlikte zorunlu olarak ayrışır. Ölçüt
  `partiGenelPaylari`'nın `havuzK`, `makinaBasiK`, `adet`, `durum` alanları ve `gercekUretim`'in adetleridir; `kayit`
  alanı karşılaştırmadan ayıklanır (spec 0090'ın `bosAtamaAyikla` emsali, C8).
- **R23.** Üretim formu satırının "Makina Kalıp Çapı" alanı bugünkü gibi **müşteri kaydından** dolar; stok satırından
  okunmaz. Zincir stok → müşteri → üretim formu olarak tamamlanır, kısa yol açılmaz.
- **R24.** Yeni izin eklenmez. Stok satırını yazma yetkisi bugünkü `stockActions` kurallarıyla aynıdır ve sunucu
  tarafında hiçbir değişiklik yapılmaz.
- **R24/2.** Bunun ölçüsü iki parçadır (Karar 12): saf test `tests/server-authz.test.js`'e yazılır (`stockActions: []`
  kullanıcısı `stock` bölümünde `reddedilenBolum: "stock"` alır) ve kaynak taraması `electron/serverAuth.cjs`'in bu
  işte değişmediğini sabitler (`ALAN_IZINLERI`'ne `kalipCapi` girdisi yok, `EYLEM_IDLERI.stock` aynı). Pahalı Electron
  turu gerekmez; bugün stok bölümü için böyle bir sunucu testi **yoktur** (ölçüm 18).

---

## Constraints

### Uyulması zorunlu

- **C1.** Yeni kalıcı alan **dört nokta kuralıyla** eklenir (`SCHEMA_SQL` + `applyColumnMigrations` + `INSERT` + `SELECT`)
  ve `db-roundtrip` ile `db-clean-install` kapsamına girer. Sütun JSON'dur (`customers.kalipCapi` emsali: `json()` ile
  yazılır, `parseJsonCol` ile okunur).
- **C2.** Okuma yolunda boş değer **ayıklanır**: `SELECT *` sonucu yayılırsa her stok satırı `kalipCapi: null` taşır,
  bugünkü gövde değişir ve çapı tanımayan istemcinin gövdesi sunucu karşılaştırmasında "değişmiş" görünür
  (spec 0100 C2'nin aynı tuzağı, aynı çözüm: alan destructuring ile çıkarılır, yalnız doluyken geri yazılır).
- **C3.** Veritabanı katmanı yalnız **sütun boşluğunu** denetler, çapın derin boşluk kuralını yazmaz: alan `SELECT *`
  sonucundan ayıklanır ve sütun boşsa gövdeye anahtar yazılmaz (spec 0100'ün `uretimDurumu` okuması, `db.cjs:1398-1402`,
  ölçüm 17). `fmtKalipCapi`'nin bir aynası `db.cjs`'e **yazılmaz**: alanın yalnız iki yazıcısı vardır (R2/2 stok formu,
  R20 dönen satır) ve ikisi de renderer'da o fonksiyonu içe aktarabilir, bu yüzden boş nesne veritabanına hiç
  ulaşmaz. Derin boşluk kuralı tek yerde kalır (R3), ikinci bir kopya açılmaz.
- **C4.** Çapın metne çevrilmesinin tek yolu `utils.fmtKalipCapi`'dir. Yeni ekran, sütun ve dışa aktarma satırı kendi
  birleştirmesini yazmaz (kaynak taraması).
- **C5.** `stock` bölümü çakışma birleştirmesinde zaten vardır (spec 0077) ve kayıt bütün olarak birleşir; yeni
  birleştirme kuralı ve yeni remap gerekmez.
- **C6.** Alan görünürlüğü hiçbir yetkiye bağlanmaz. Çap üretim bilgisidir, gider ya da kasa verisi değildir
  (stok formundaki "Üretim partisi" seçicisinin `giderYetki` kapısı bu alana uygulanmaz).
- **C7.** Paylaşılan alan `src/components/ui.jsx`'e konur (`CountryCityFields` ile aynı sınıf: birkaç kutudan oluşan,
  tek bir veri parçasını yazan bileşik alan). `tasarim.jsx` sözlüğüne girmez, bu yüzden `kanit-eslemesi.json`'a
  `ui.jsx` kaydı eklenmez (ölçüm 19: dosyanın bugün de kaydı yok).
- **C7/2.** Buna karşılık `docs/tasarim-sozlugu.md`'ye **bir satır** eklenir: "Makina Kalıp Çapı" alanı
  `CountryCityFields` ile aynı sınıftadır ve iki ekran da onu çağırır. Yoksa bir sonraki ekran kutuları yeniden çizer
  (sözlüğün "ekran içinde yerel kopya yazılmaz" kuralı).
- **C8.** Maliyet motorunun altın dosyaları (`tests/fixtures/0088-maliyet-once.json`, `tests/fixtures/0092-havuz-once.json`)
  **yenilenmez** ve girdilerine çap eklenmez. Motor karşılaştırması `kayit` alanını ayıklar (R22/2).
- **C9.** İki test bu işin **önkoşuludur** ve spec'ten önce yazılıp yeşil görülür: `fmtKalipCapi`'nin kendi testi
  (ölçüm 14) ve müşteri formundaki çap alanının davranış testi (ölçüm 21: bugün `tests/` altında `kalipCapi` ya da
  "Arka Ölçü" geçen tek bir test yok). Korumasız bir alanı paylaşılan bileşene taşımak bu projenin bilinen
  regresyon sınıfıdır ve piksel kanıtı `onChange` yolunun bozulmasını yakalamaz.

### KAPSAM DIŞI

- **X1.** Katalogdaki model `kalip` alanının ("Kalıp Çapı", tek serbest metin, "Örn: 14 cm") stok formuna öneri olarak
  gelmesi — *neden:* şekiller uyumsuz (tek metin ile üç parça) ve o alan bugün yalnız model seçicisinde gösterim amaçlı;
  dönüştürme kuralı ayrı bir karardır (Karar 8, açık bulgu olarak yazıldı).
- **X2.** Çapın stok aramasına ve süzgeçlerine girmesi — *neden:* istenmedi; Makina Stoğu'nun arama alanı bugün model,
  seri no ve notu arıyor, ölçüyle arama ayrı bir istektir. Teknik olarak da bu yoldan gitmez: `useFilteredList`'in
  `searchFields`'i düz alan adlarını `aramaNormalize(item[f])` ile tarıyor (`useFilteredList.js:22`), üç parçalı nesne
  böyle aranamaz; istenirse `searchFn` yazılması gerekir (ölçüm 22).
- **X3.** Müşteri formundaki stok seçeneğinin metnine çap yazılması — *neden:* seçenek metni spec 0100 ile durumu
  taşıyor, üçüncü bilgi satırı okunabilirliği bozar; çap seçimden sonra alanda görünüyor.
- **X4.** Müşteri tarafının boş çap gövdesinin temizlenmesi — *neden:* bugün müşteri kaydı boş nesne de taşıyabiliyor;
  temizleme mevcut kayıtların gövdesini değiştirir ve bu işin kazancı yok. Ayrı bakım işi.
- **X5.** **Ekleme** kaydının denetim izi alan listesinin genişletilmesi — *neden:* bugün ekleme kaydı yalnız seri no
  yazıyor (`MakinaStokTab.jsx:95`), listeyi genişletmek ayrı karardır. Buna karşılık **düzenleme** kaydının çapı
  taşıması kaçınılmazdır ve kabul edilir: `detail: { onceki: snapshotOnceki(...) }` (`:110`) ve `snapshotOnceki`
  (`audit.js:49-56`) kaydın tamamını JSON kopyalıyor, yani alan kayıtta doğduğu anda İşlem Geçmişi'nin düzenleme
  detayında görünür (ölçüm 23). `snapshotOnceki` bu işte **daraltılmaz** (0073'ün hareket düzenleme kaydı ona bağlı).
- **X6.** Stok içe aktarması — *neden:* uygulamada stok için içe aktarma yolu yok (yalnız dışa aktarma var).
- **X7.** Aynı modelin farklı çaplarının katalogda tanımlanması, çap bazında stok sayımı ve çap bazında fiyatlama
  — *neden:* istek tek bir bilginin akışıdır, yeni bir boyut değil.

---

## Context

**Ölçüm 1.** Müşteri alanı üç parçalı bir nesnedir ve zincirin sonuna kadar akıyor. `customers.kalipCapi` = `{en, yukseklik, boy}`
(Çap × Arka Ölçü × Boy), form `src/components/customers/CustomerAddEditForm.jsx:266-277`. Metne çevirme tek yerde:
`src/lib/utils.js:263` `fmtKalipCapi` → "50 x 80 x 115" (boş parçalar atlanır, hepsi boşsa boş dize). Saklama JSON
sütunudur: `electron/db.cjs:99` (şema), `:658` (`json(c.kalipCapi)`), `:1362` (`parseJsonCol(c.kalipCapi, undefined)`).
Göründüğü yerler: müşteri tablosunun "Makina Kalıp Çapı" sütunu (`Customers.jsx:548` başlık, `:618` hücre), müşteri
detayı (`CustomerDetailModal.jsx:1056`), makina geçmişi yazdırması (`printTemplates.js:472`, çeviri anahtarı
`kalipCapiLabel` TR/EN `:177`/`:227`), iki dışa aktarma (`SettingsExport.jsx:207`, `:488`) ve XLSX içe aktarmasının
8. sütunu (`SettingsImport.jsx:94-99`, "50 x 80 x 115" üçe ayrıştırılıyor).

**Ölçüm 2.** Stok satırında böyle bir alan hiç yok. `stock` tablosu on sütun: `id, model, serialNo, addedDate, note,
parcalar, deletedAt, uretimTarihi, partiId, uretimDurumu` (`electron/db.cjs:162-164`). Stoğa Makina Ekle formunda
**altı alan** var (model `:266`, seri no `:273`, stoğa giriş tarihi `:274`, üretim durumu `:276`, üretim partisi `:288`
yalnız `giderYetki` ile, not `:299-303`) ve ayrıca **kit bölümü** (`:305-354`); çap yok. Liste altı sütun: Model,
Durum, Seri Numarası, Stoğa Giriş, Not ve işlem sütunu (`:214`). Stok dışa aktarması dört sütun: Model, Seri No,
Stoğa Giriş Tarihi, Not (`SettingsExport.jsx:264-265`).

**Ölçüm 3.** Zincirin öteki ucu zaten kurulu. Üretim formu satırının `makinaKalipCapi` alanı müşteri kaydından doluyor
(`src/components/stock/UretimFormu.jsx:246`, `:275`, `src/components/stock/UretimSatirEkleModal.jsx:48`) ve bir
**dizedir** (`fmtKalipCapi(c.kalipCapi) || ""`, nesne değil); elle giriş kutusunun yer tutucusu "Müşteriden otomatik"
diyor (`src/components/stock/UretimSatirEkleModal.jsx:209-210`). Yani **stok → müşteri → üretim formu** zincirinin son halkası çalışıyor,
eksik olan ilk halkadır. Bu spec zinciri baştan tamamlar ve ortadaki halkaya dokunmaz.

**Ölçüm 4.** Otomatik doldurmanın emsali tam aynı formdadır. Stoktan seri no seçilince makinanın kit parça tipleri müşteri
formuna yazılıyor: `getKitAutoFill(stockEntry)` (`CustomerAddEditForm.jsx:84-97`) ve iki çağrısı, serili seçim `:209`,
serisiz seçim `:206` (kaynak satır `serisizDusulecek(stockForModel, form.model)`, spec 0100 R6/3). Dönüş biçimi
"yazılacak alanlar nesnesi, yoksa boş nesne"dir ve `setForm` içinde yayılıyor; R15 aynı biçimi ister.

**Ölçüm 5.** İkinci emsal kayıt anında görünmez damgalamadır ve bilinçli olarak seçilmedi. `src/lib/satisKaydi.js:29`
`uretimTarihiDamgala` ve `:37` `partiDamgala`; ikisi de `Customers.jsx`'in `deductMachineStock`'u içinde, `stoktanDamgala`
yardımcısında çağrılıyor (`:263-271`). Fonksiyonun kendisi **iki yerden** çağrılıyor: `:325` (ekleme) ve `:362`
(seri no bekleyen kaydın düzenlenmesi, R16'nın ikinci kipi). İkisi de formdaki değeri koruyor ve kullanıcıya hiç
görünmüyor. Çap için Karar 2 görünür yolu seçti: ölçü yanlışsa satış anında
düzeltilebilmeli.

**Ölçüm 6.** Geri dönen stok satırı tek yerde kuruluyor. `Customers.jsx:458`: `{ id, model, serialNo: c.serialNo || "", addedDate,
uretimTarihi: donenStokUretimTarihi(c, partStockLog), ...(c.partiId != null ? { partiId: c.partiId } : {}),
note: GERI_DONEN_STOK_NOTU, parcalar: kitParcalar }`. Satır, boş değerin anahtar olarak yazılmaması desenini
(`partiId`) zaten taşıyor; R19 ve R20 aynı deseni çapa uygular. Satır `uretimDurumu` taşımadığı için dönen makina
durumsuz, yani satışa hazır doğuyor (spec 0100 ölçüm 25); çap tarafında karşılığı yok, kopyalanan değer müşterinin
kendi çapıdır.

**Ölçüm 7.** Stok formunun kayıt yolu formu bütün olarak yayıyor. `MakinaStokTab.jsx:88-114`: ekleme
`[{ ...form, id: nid }, ...p]` (`:93`), düzenleme `{ ...form }` (`:107-108`, gerekirse `uretimTarihi` eklenerek).
Arada hiçbir denetim yok. Müşteri formunun çap `onChange`'i `{ ...(p.kalipCapi || {}), en: e.target.value }` yazdığı
için (`CustomerAddEditForm.jsx:269`) bir hane yazıp silmek formda `{en:"",yukseklik:"",boy:""}` bırakıyor; aynı bileşen
stok formunda kullanılınca boş çap nesnesi denetimsiz kayda ve veritabanına girer. R2 ve R2/2'nin yazım kuralı bu
yüzden şarttır. Spec 0100 aynı sorunu `uretimDurumuYaz` ile adıyla çözdü (`stokDurumu.js:17-20`: alanı her çağrıda
silip yalnız geçerli değeri yazan tek fonksiyon, spec 0100 Karar 12); çapın karşılığı `kalipCapiYaz`'dır ve `fmtKalipCapi`'nin
yanına, `utils.js`'e konur.

**Ölçüm 8.** Karışık sürüm ve çoklu bilgisayar. Güncellenmemiş bir istemci yeni alanı tanımaz; gövdesinde taşımadığı için
yazdığı stok satırı çapsız kalır (kayıp değil, girilmemiş). Sunucu tarafı `stock` bölümünü `stockActions` ile
denetliyor ve alan düzeyinde denetim yok, bu yüzden yeni 403 sınıfı doğmaz. Satır çakışma birleştirmesinde bütün
olarak birleşiyor: iki bilgisayar aynı makinanın çapını aynı anda değiştirirse biri kaybolur (bugünkü karakteristik,
yeni risk değil).

**Ölçüm 9.** Katalogdaki benzer adlı alan karıştırılmamalıdır. `ModelsManager.jsx:216` model kaydının `kalip` alanı tek serbest
metindir ("Örn: 14 cm") ve müşteri formunun model seçicisinde `Ø 14 cm` olarak görünür (`CustomerAddEditForm.jsx:183`).
Bu, makinanın üç parçalı ölçüsüyle aynı şey değildir; X1 ve Karar 8 bu ayrımı korur.

**Ölçüm 10.** Müşteri formunda çap, Seri Numarası'nın **yanındaki ikinci kolondadır**: iki alan ortak bir
`display: grid; gridTemplateColumns: "1fr 1fr"` kabının içinde duruyor (`CustomerAddEditForm.jsx:190-281`), çap alanı
`:265-277`. Stok formu tek kolon olduğu için aynı komşuluk ancak alt alta kurulabilir (R6/2). Not: aynı kaptaki
`<Field label="Seri Numarası" style={{ gridColumn: 1 }}>`'ın `style`'ı etkisizdir, `Field` (`ui.jsx:65`) `style`
prop'u almıyor; bu işte dokunulmaz.

**Ölçüm 11.** Liste sütunu için seçilen yer spec 0100 ile çakışıyordu. `MakinaStokTab.jsx:214` başlık dizisi
`["Model", "Durum", "Seri Numarası", "Stoğa Giriş", "Not", ""]` ve `tests/ui/stok-durumu-0100.test.jsx:84-88` testin adı
birebir "AC-4: Durum sütunu Model'in hemen sağında, tablo altı sütun", diziyi tam eşitlikle sınıyor. İki sütun aynı yeri
paylaşamaz; hangi sıra seçilirse seçilsin bu kriterin sütun sayısı yarısı ters çevrilir (R9, R9/2, Karar 9).

**Ölçüm 12.** Seçicinin boş seçeneği bugün bir makina seçimi sayılıyor. `CustomerAddEditForm.jsx:208-210`'daki `else`
dalı `stockForModel.find(s => s.serialNo === e.target.value)` çalıştırıyor ve boş seçeneğin değeri `""`. Serisiz her
stok satırının seri no'su **tam olarak** `""`: `MakinaStokTab.jsx:62` (`openAdd`) ve `Customers.jsx:458` (dönen satır)
öyle yazıyor, `tests/fixtures/0100-govde-girdisi.cjs`'in 71 numaralı satırı da öyle. Yani boş seçeneğe dönüldüğünde
`find` ilk serisiz satırı buluyor ve `getKitAutoFill` ön doldurmayı o satırdan yapıyor; `_stokSerisiz` false kaldığı
için kayıtta hiçbir satır düşülmüyor. Bugün görünmez (yalnız kit tipi yazılıyor), çap görünür olacağı için kullanıcıya
yanlış ölçü olarak çıkardı (R11/2, Karar 10).

**Ölçüm 13.** Paylaşılan alanın emsali başlığı da içinde taşıyor: `CountryCityFields` (`ui.jsx:524-543`) kendi
`<Field label="Ülke">` ve `<Field label="Şehir">` sarmalayıcılarını ve ızgara kabını içeriyor, çağıran yalnız değer ve
geri çağırım veriyor. Müşteri formundaki çap ise `<Field label="Makina Kalıp Çapı">` artı flex kabı olarak yazılı
(`:265-277`) ve üç `Input`un `aria-label`'ı yok, yalnız `placeholder` var (R7/2, R7/3).

**Ölçüm 14.** `fmtKalipCapi`'nin **hiç testi yok**: `grep -rn "fmtKalipCapi" tests/` sıfır sonuç veriyor. Fonksiyonun
yedi çağrısı var (`Customers.jsx:618`, `CustomerDetailModal.jsx:1056`, `stock/UretimFormu.jsx:246` ve `:275`,
`stock/UretimSatirEkleModal.jsx:48`, `SettingsExport.jsx:207` ve `:488`, `printTemplates.js:472`). R2, R3, R20, AC-1,
AC-3, AC-13 ve AC-16 bu tek çıktıya bağlı (C9).

**Ölçüm 15.** `fmtKalipCapi` parçaları `String(x).trim()` ile kırpıyor ama **saklanan değere dokunmuyor**
(`utils.js:262-268`); müşteri tarafı da ham saklıyor. `{en: " 50 ", yukseklik: "  ", boy: ""}` girdisinde çap dolu
sayılır (çıktı "50") ve anahtar yazılır, ama hangi değerin saklandığı spec'te tanımsızdı (R3/2, Karar 13).

**Ölçüm 16.** Maliyet motoru ham stok satırını referansla taşıyor: `makinaMaliyeti.makinaListesi` (`:119-126`) her
stok satırı için `kayit: s` yazıyor, `tests/fixtures/0088-maliyet-once.json` bu `kayit` nesnelerini altın dosyada
saklıyor (müşteri tarafında; anahtarları `currency, fabrikaSatisBedeli, id, installDate, model, name, serialNo,
uretimTarihi`). Çaplı bir satırla motoru çağırıp çıktıyı derin eşitlikle karşılaştıran bir kriter, hiçbir rakam
değişmese de `kayit.kalipCapi` yüzünden kırılır (R22/2, C8).

**Ölçüm 17.** Stok okuması spec 0100'den beri **ayıklamalı**: `db.cjs:1398-1402`
`SELECT * FROM stock` sonucu `({ uretimDurumu, ...s })` ile ayrıştırılıyor ve değer yalnız doluyken geri yazılıyor.
Müşteri tarafının deseni farklı: `kalipCapi: parseJsonCol(c.kalipCapi, undefined)` (`:1362`) anahtarı `undefined`
değerle gövdede bırakıyor, yani `"kalipCapi" in satir` doğru olur. AC-5'in `in` denetimi bu yüzden 0100 desenini
şart koşar, müşteri desenini değil (C2, C3).

**Ölçüm 18.** Sunucu tarafı: `yazmaYetkisiVar` (`serverAuth.cjs:469-540`) `stock` için istisna taşımıyor,
`ALAN_IZINLERI` (`:569-573`) `stock` içermiyor, `EYLEM_IDLERI.stock` (`:541`) yalnız ekle ve sil. Yani `stockActions: []`
kullanıcısı bölümü yazamaz ve AC-33'ün iddiası doğrudur. Ama bugün bunu ölçen bir test **yok**:
`scripts/tests/server-security.cjs`'te `ro` kullanıcısı (READONLY, `stockActions: []`) yalnız `customers` yazımıyla
sınanıyor (`:173`) ve `tests/server-authz.test.js`'in stok satırları (`:92`) sekme kısıtını ölçüyor, grup kısıtını
değil (R24/2, Karar 12).

**Ölçüm 19.** `docs/evidence/kanit-eslemesi.json`'da `src/components/ui.jsx` kaydı **yok** (dosya sözlüğü
kullanmıyor), yani C7 doğru. `src/components/stock/MakinaStokTab.jsx` için **on altı** kayıt var ve hepsi geçmiş
raporlara bağlı (`0015-taban`, `0016-taban`, `0022-taban`, `0065`, `0100-taban`, `0100`, `0100-kapanis`), hepsi `ayni`.

**Ölçüm 20.** Dışa aktarma tek fonksiyondan çiziliyor: `SettingsExport.jsx:263-273` `exportStock`, Excel ve CSV aynı
`rows` dizisinden besleniyor; `fmtKalipCapi` o dosyada zaten içe aktarılmış (`:4`). Çapı olmayan satırın hücresi
kendiliğinden boş dize olur çünkü `fmtKalipCapi(undefined)` boş dize döner (R10, AC-16).

**Ölçüm 21.** Müşteri formundaki çap alanının **hiç testi yok**: `tests/` altında `kalipCapi` ya da "Arka Ölçü" geçen
tek bir dosya yok. Kanıt eşlemesinde müşteri formu **dört** ekranla duruyor: `musteri-formu`, `musteri-formu-hata`,
`musteri-formu-ilk-odeme`, `musteri-formu-0079` (C9, AC-29, AC-29/2).

**Ölçüm 22.** Arama kancası düz alan okuyor: `useFilteredList` `searchFields`'i `aramaNormalize(item[f])` ile tarıyor
(`useFilteredList.js:22`) ve Makina Stoğu ona `["model", "serialNo", "note"]` veriyor (`MakinaStokTab.jsx:42`). Üç
parçalı nesne bu yoldan aranamaz (X2).

**Ölçüm 23.** Denetim izi kaydın tamamını kopyalıyor: `snapshotOnceki` (`audit.js:49-56`) `JSON.parse(JSON.stringify(kayit))`
döndürüyor ve stok düzenlemesi onu `detail: { onceki: ... }` olarak yazıyor (`MakinaStokTab.jsx:110`). Ekleme kaydı
ise yalnız seri no yazıyor (`:95`). Yani çap, düzenleme detayında kendiliğinden görünür (X5).

**Ölçüm 24.** Gövde fikstürü **üçlüdür**: `tests/fixtures/<spec>-govde-girdisi.cjs` (girdi),
`tests/fixtures/<spec>-govde-once.json` (spec öncesi okunan gövde) ve üreten betik (`scripts/tests/0100-govde-fikstur.cjs`);
okuma `scripts/tests/db-roundtrip.cjs:679`. 0100'ün girdisi serili, serisiz (`serialNo: ""`), partili, üretim tarihli,
kitli ve çöpteki satırı kapsıyor; altın dosya öteki sütunları `null` olarak taşıyor.

**Ölçüm 25.** Stok dışa aktarmasının başlık satırını sınayan bir test **yok** ("Stoğa Giriş Tarihi" dizesi `tests/` ve
`scripts/` altında hiç geçmiyor), bu yüzden AC-15 yeni bir testtir ve mevcut hiçbir kriteri çevirmez.

---

## Kararlar (Takım Yöneticisi, 2026-10-22)

1. **Veri şekli:** stok satırında müşteriyle birebir aynı `{en, yukseklik, boy}` nesnesi. Kopyalama kimlik işlemi olur,
   ayrıştırma hiç gerekmez, `fmtKalipCapi` ortak kalır.
2. **Akış biçimi:** seri no seçilince müşteri formuna yazılır ve düzenlenebilir olur (kit emsali), kayıt anında
   görünmez damgalama değil.
3. **Öncelik:** stok satırının çapı doluysa formdaki değeri ezer; boşsa formdaki değer korunur.
4. **Serisiz satış:** ön doldurma, motorun düşmeyi seçtiği satırdan yapılır. Bilinen sınır yazılıdır: kayıt anındaki
   yarışta başka satır düşülürse form başka makinanın çapını göstermiş olabilir (kit tarafının bugünkü karakteristiği).
5. **Sonradan değişiklik:** çap müşteri kaydına kopyalanır, geriye bağ kurulmaz.
6. **Müşteri silinince:** stoğa dönen makina çapını taşır.
7. **Görünürlük:** Makina Stoğu listesine "Kalıp Çapı" sütunu ve stok dışa aktarmasına bir sütun eklenir.
8. **Kapsam dışı:** katalogdaki model `kalip` alanı bu işe karıştırılmaz; dönüştürme isteniyorsa ayrı iş (açık bulgu).

### QA turu kararları (2026-10-22)

9. **Sütunun yeri:** "Kalıp Çapı" sütunu **Durum'un sağında, Seri Numarası'nın önünde** durur ve tablo yedi sütuna
   çıkar. Spec 0100'ün "Durum Model'in hemen sağında" kuralı korunur; o kriterin sütun sayısı yarısı bu spec'le
   güncellenir ve "Ters çevrilen kriterler"e yazılır. Gerekçe: 0100 Durum'u bilinçle Model'in yanına koydu (her
   satırda okunan süzgeç boyutu), çap ise statik bir üretim bilgisidir ve kimlik bloğuna yakındır. Reddedilen seçenek:
   çapı Model'in hemen sağına koymak, 0100 AC-4'ün hem metnini hem sırasını çevirirdi.
10. **Boş seçenek bir seçim değildir:** stok seçicisinin "Stoktan seçin... (n adet)" seçeneğine dönüldüğünde seri no ve
   serisiz işareti temizlenir, çap ile kit alanlarına dokunulmaz. Reddedilen seçenek: boş seçeneği listeden kaldırmak,
   seçim iptali yolunu kapatır ve kontrollü alan uyarısı doğurur.
11. **Ezme nesne düzeyinde:** stok satırının çapı forma bütün olarak yazılır, parça parça birleştirilmez. Gerekçe:
   iki makinanın ölçüsünü karıştıran melez bir değer, önlenmek istenen hatanın kendisidir.
12. **Sunucu ölçüsü:** AC-33 saf bir `server-authz` bloğuyla (`stockActions: []` kullanıcısı `stock` bölümünde
   reddedilir) ve `serverAuth.cjs`'in değişmediğini sabitleyen bir kaynak taramasıyla ölçülür. Electron turu açılmaz.
13. **Saklanan değer kırpılmaz:** boşluk denetimi yalnız anahtarın yazılıp yazılmayacağına karar verir. Reddedilen
   seçenek: parçaları yazımda kırpmak, daha temiz veri verir ama AC-2'nin "birebir korur" sözünü çevirir ve müşteri
   tarafıyla iki ayrı şekil doğurur.
14. **Tek yazıcı `kalipCapiYaz`:** `utils.js`'e, `fmtKalipCapi`'nin yanına konur ve `MakinaStokTab.save()`'in iki
   dalında da çağrılır. Reddedilen seçenek: `onChange`'de boş nesneyi silmek, son hane silinirken alanı sıfırlar.
15. **Paylaşılan bileşen:** `Field` başlığını da içine alır, imzası `({ value, onChange, label })`'dir, `onChange`
   bütün nesneyi verir ve üç kutu `aria-label` taşır. Reddedilen seçenek: yalnız üç kutuyu bileşene almak, başlık
   metnini iki yerde bırakır.
16. **Alanın yeri:** stok formunda Seri Numarası'nın hemen altı (müşteri formundaki komşuluk, parti seçicisinin üstü,
   kit bölümünden ayrı).
17. **Veritabanı aynası yazılmaz:** `db.cjs` yalnız sütun boşluğunu denetler; derin boşluk kuralı tek yerde
   (`fmtKalipCapi`) kalır. Reddedilen seçenek: aynayı yazıp R3'e istisna koymak, iki kuralın sapması yalnız testi
   varken görünür.
18. **Motor ölçütü rakamdır:** çaplı ve çapsız satırın karşılaştırmasında `kayit` alanı ayıklanır, altın dosyalar
   yenilenmez. Reddedilen seçenek: `makinaListesi`'nin `kayit` alanını daraltmak, bütün tüketicileri etkiler.
19. **İki önkoşul test:** `fmtKalipCapi`'nin kendi testi ve müşteri formundaki çap alanının davranış testi spec'ten
   önce yazılır ve yeşil görülür.
20. **Kanıt kayıtları:** yalnız bu işin kendi raporunun (`0101-piksel-raporu.json`) kayıtları `degisti` artı `onay`
   alır; geçmiş raporların on altı kaydı kendi turlarının sonucudur ve olduğu gibi kalır.
21. **Sözlüğe bir satır:** paylaşılan alan `docs/tasarim-sozlugu.md`'de `CountryCityFields` ile aynı sınıfta yazılır.
22. **Denetim izi:** ekleme kaydının alan listesi genişletilmez; düzenleme kaydının anlık görüntüsü kaydın tamamını
   kopyaladığı için çapı taşıması kabul edilir, `snapshotOnceki` daraltılmaz.

---

### Plan turu kararları (2026-10-22)

23. **AC-11 taraması yorumları atar:** `utils.js:264` ve `SettingsImport.jsx:94` yorumları "Arka Ölçü" taşıyor; yorumlara
    dokunulmaz (AC-35 içe aktarma dosyasının değişmemesini ister, kriterin amacı ikinci bir çizim kopyasıdır).
24. **Beşinci müşteri formu ekranı:** görüntü aracında `musteri-formu-0094-ilce` de var; AC-29/2'nin 0 fark listesine girer.
25. **Dışa aktarma saf fonksiyonla ölçülür:** `SettingsExport.jsx` `STOK_EXPORT_HEAD` ve `stokExportRow(s)`'yi dışa verir
    (`yedekParcaExportRow` emsali); `exportStock` ikisini kullanır, Excel ve CSV yine tek diziden.
26. **Bilinen sınır (Karar 3'ün sonucu):** önce çaplı A, sonra çapsız B seçilirse form A'nın çapını göstermeye devam eder
    (çapsız satır forma dokunmaz). Davranış testle sabitlenir; satışı yapan kişi ölçüyü ekranda görür.
27. **Kopya biçimi:** `kalipCapiYaz` ve `kalipCapiOnDoldur` nesneyi sığ kopyalar (`{ ...kc }`), anahtar süzmez, değer
    kırpmaz (Karar 1, Karar 13); iki kayıt aynı nesneyi paylaşmaz.
28. **Bileşenin `onChange`'i** yeni nesneyi `value` prop'undan kurar; çağıran işlevsel `setForm` ile yazar.
29. **AC-36 taraması** yalnız `save` gövdesinin iki `setStock` çağrısına bakar (`confirmDel`'inki silme damgasıdır).
30. **AC-35 iki taramayla ölçülür** (müşteri dışa aktarmasının saf fonksiyonu yok).
31. **Bozuk ya da `null` JSON sütunu** okumada anahtar yazdırmaz (sonuç nesne değilse yazılmaz); roundtrip ham SQL ile sınar.
32. **Fikstür sırası:** altın dosya `db.cjs` değişmeden üretilir ve çaplı satır içermez; çaplı satırlar roundtrip'te ayrı blokta.
33. **`Field`'ın `htmlFor` bağı** çok çocuklu içerikte bugünkü gibi yoktur; erişilebilir ad `aria-label`'dan gelir.
34. **Bileşen adı `KalipCapiFields`** (`CountryCityFields` emsali).
35. **Görsel kanıt seçili ekranlarla:** `EKRAN_SEC` ile değişen dört stok ekranı, iki yeni ekran, `stok-bos`, beş müşteri
    formu ekranı ve müşteri detayı ekranları çekilir.
36. **Önkoşul testinin bulgusu (uygulama, 2026-10-22):** `fmtKalipCapi` boş parçaları **atlamaz**, yalnız kırpar ve yerini
    boş bırakır: `{en: " 50 "}` → `"50 x  x "`. Ölçüm 1 ve ölçüm 15'in "boş parçalar atlanır" / "çıktı 50" iddiası
    fonksiyonun yorumundan okunmuştu, kodundan değil. Fonksiyon **değiştirilmedi** (yedi çağrısı müşteri tablosu, yazdırma
    ve dışa aktarmada yaşıyor; AC-35 müşteri dışa aktarmasının değişmemesini ister); AC-37'nin hücre beklentisi gerçek
    çıktıya çevrildi. Boş parçayı atlayan gösterim isteniyorsa ayrı iş (açık bulgu).
37. **Görsel kanıtın bulgusu (uygulama, 2026-10-22):** `stok-alt-sekme` 0 piksel fark verdi: ekran `stokEkrani` ile
    `stock={[]}` çiziliyor, liste değil boş durum görünüyor ("Görsel kanıt" tablosundaki dört ekrandan biri yanlış
    sayılmıştı). Bilinçli değişen ekranlar üçtür (`makina-stok-formu`, `stok-makina-parti`, `stok-0100-durum-suzgec`) artı
    iki yeni ekran; `stok-alt-sekme` kaydı `ayni` olarak yazıldı. `stok-0101-form-capli` düzenleme penceresi yerine dolu
    alanlı **ekleme** penceresini çeker (stok satırının düzenleme düğmesinin başlığı yok, görüntü aracı ona erişemiyor;
    düzenleme kipinin dolu gelmesi AC-10 testinde).
38. **0100 test yardımcısı kaydı:** `tests/ui/stok-durumu-0100.test.jsx`'in `listeSerileri` yardımcısı seri no'yu konumdan
    okuyordu (`td[2]`); yeni sütunla `td[3]` oldu ("spec 0101 ile" notlu). Kriter değil yardımcı, beklentiler aynı.
39. **Açık bulgu, Takım Yöneticisi'ne (triyaj 2026-10-22):** tek parçası girilmiş çap Makina Stoğu listesinde de
    `"50 x  x "` olarak görünür (Karar 36'nın sonucu; bugüne kadar yalnız müşteri tablosunda ve çıktılarda görünüyordu,
    üretim sorumlusu önce yalnız Çap'ı bildiğinde kısmi giriş daha olası). Boş parçayı atlayan gösterim `fmtKalipCapi`'nin
    yedi çağrısını birlikte değiştirir; ayrı iş olarak karar bekliyor, bu işi bloklamaz. Davranış AC-37 testiyle sabit.
    Triyajın birinci bulgusu üzerine `fmtKalipCapi`'nin yanlış yorumu ("boş parçalar atlanır") düzeltildi.

---

## Acceptance Criteria

### Veri ve yazım

- **AC-1.** Stoğa makina eklenirken çap kutuları boş bırakılıp kaydedilirse, kaydedilen gövdede `kalipCapi` anahtarı
  hiç bulunmaz (`null` da değil).
- **AC-2.** Üç kutudan en az biri doluyken kaydedilen gövde `{en, yukseklik, boy}` nesnesini taşır ve girilen
  değerleri **kırpmadan** birebir korur.
- **AC-3.** Üç kutuya **hepsine** yalnız boşluk karakteri yazılırsa çap boş sayılır ve gövdeye anahtar yazılmaz.
- **AC-4.** Çapı olan bir stok satırı veritabanı tam turunda aynı nesneyle geri okunur (`db-roundtrip`).
- **AC-5.** Çapı olmayan stok satırlarının gövdesi spec öncesiyle birebir aynıdır (fikstür karşılaştırması) ve hiçbir
  satırda `"kalipCapi" in satir` doğru değildir.
- **AC-6.** Temiz kurulumda ilk oturumda çapı olan bir stok satırı kaydedilip geri okunur (`db-clean-install`).
- **AC-7.** Çapı olmayan mevcut bir stok satırının yalnız notu değiştirilip kaydedildiğinde gövdesine `kalipCapi`
  anahtarı girmez.
- **AC-8.** Veritabanı katmanı yalnız sütun boşluğunu denetler: boş sütun gövdeye anahtar yazdırmaz (`null` olarak
  da değil), dolu sütun aynı nesneyle geri okunur. `fmtKalipCapi`'nin bir aynası `electron/db.cjs`'e yazılmamıştır
  (kaynak taraması: `db.cjs` çapın parçalarını okumaz).

### Stok formu ve listesi

- **AC-9.** Stoğa Makina Ekle penceresinde "Makina Kalıp Çapı" alanı üç kutuyla çizilir; kutuların **erişilebilir
  adları** "Çap", "Arka Ölçü", "Boy"dur (yer tutucuları da aynı metni taşır).
- **AC-10.** Stok makinasını düzenleme penceresinde kayıtlı çap üç kutuya dolu gelir.
- **AC-11.** Üç kutulu çap alanı kaynakta tek bir bileşenden gelir: müşteri formu ve stok formu aynı bileşeni çağırır,
  ikinci bir kopya yoktur. Taramanın ölçütü: `src/` altında `Arka Ölçü` dizesi yalnız paylaşılan bileşenin dosyasında
  (`src/components/ui.jsx`) geçer. Tarama yorumları atar (plan turu Karar 23: `utils.js` ve `SettingsImport.jsx`'teki iki
  yorum satırı bu dizeyi taşıyor ve dokunulmaz).
- **AC-12.** Makina Stoğu tablosunun başlıkları sırayla `["Model", "Durum", "Kalıp Çapı", "Seri Numarası",
  "Stoğa Giriş", "Not", ""]`'dir (yedi sütun) ve çapı olan satırın hücresinde "50 x 80 x 115" biçiminde değer yazar.
- **AC-13.** Çapı olmayan satırın hücresinde "—" yazar.
- **AC-14.** Boş durumun **iki dalında da** liste çizilmez ve ekran değişmez: stok hiç boşken ("Stokta makina yok.")
  ve süzgeç hiçbir satır bırakmazken ("Aramanıza uyan makina yok."); yeni sütun bu ekranlara girmez.
- **AC-15.** Stok dışa aktarmasının başlık satırı (saf `STOK_EXPORT_HEAD`, satır `stokExportRow(s)`; plan turu Karar 25) `["Model", "Makina Kalıp Çapı", "Seri No", "Stoğa Giriş Tarihi", "Not"]`
  olur ve çapı olan satırın hücresi `fmtKalipCapi` biçimindedir.
- **AC-16.** Dışa aktarmada çapı olmayan satırın çap hücresi boş dizedir.

### Müşteri formuna akış

- **AC-17.** Müşteri ekleme formunda model seçildikten sonra çapı olan serili bir stok satırı seçilince çap üç kutuya
  yazılır.
- **AC-18.** Çapı olmayan bir stok satırı seçilince formdaki çap değişmez (elle girilmiş değer korunur).
- **AC-19.** Formda elle çap girildikten sonra çapı olan başka bir seri no seçilince form yeni makinanın çapını
  gösterir.
- **AC-20.** Seri no'suz seçenek seçilince ön doldurma, `serisizDusulecek`'in seçtiği satırın çapından yapılır.
- **AC-21.** "Manuel gir (stok dışı / eski müşteri)" seçildiğinde çap kutularına dokunulmaz.
- **AC-22.** Kaydedilen müşteri kaydı formdaki çapı taşır; kayıt yolunda stok satırının çapı okunmaz (kaynak taraması:
  çap için damgalama fonksiyonu eklenmemiştir).
- **AC-23.** Ön doldurma kuralı React'sız çağrılabilir: çapı olan satırda yazılacak alanı, çapsız satırda ve `null`
  girdide boş nesne döndürür.
- **AC-24.** Seri no bekleyen kaydın düzenlenmesinde stoktan seri seçilince çap aynı şekilde forma yazılır.
- **AC-25.** Seri no beklemeyen bir kaydın düzenleme penceresinde stok seçicisi çizilmediği için çap kendiliğinden
  değişmez.

### Müşteri silinince stoğa dönen makina

- **AC-26.** Çapı olan bir müşteri çöpe atılınca Makina Stoğu'na dönen satır aynı çapı taşır.
- **AC-27.** Çapı boş (ya da boş nesne olan) müşteride dönen satırın gövdesinde `kalipCapi` anahtarı bulunmaz.
- **AC-28.** Dönen satır müşteri formundan yeniden satılınca çap ön doldurma yoluyla yeni kayda gelir.

### Değişmeyenler

- **AC-29.** Müşteri formundaki çap alanının **davranışı** değişmez: ekleme formunda üç kutuya yazılan değer kayda
  `{en, yukseklik, boy}` olarak bugünkü gibi girer, düzenleme kipinde kayıtlı çap dolu gelir. Bu testin spec'ten
  **önce** yazılıp yeşil görüldüğü kayıtlıdır (C9).
- **AC-29/2.** Beş müşteri formu ekranı görsel kanıtta 0 piksel fark verir: `musteri-formu`, `musteri-formu-hata`,
  `musteri-formu-ilk-odeme`, `musteri-formu-0079`, `musteri-formu-0094-ilce` (erişilebilir ad eklemek görünümü
  değiştirmez; beşinci ekran plan turunda bulundu, Karar 24).
- **AC-30.** Üretim formu satırının "Makina Kalıp Çapı" alanı müşteri kaydından dolmaya devam eder ve stok satırından
  okumaz. Taramanın ölçütü: `src/components/stock/UretimFormu.jsx` ve `src/components/stock/UretimSatirEkleModal.jsx`
  içinde `kalipCapi` yalnız bir müşteri kaydından (`c.kalipCapi`, `cust?.kalipCapi`) okunur, `stock` dizisinden
  okunmaz.
- **AC-31.** Stok formu katalogdaki model `kalip` alanını okumaz. Taramanın ölçütü: `MakinaStokTab.jsx` içinde
  `.kalip` erişimi yoktur (`kalipCapi` dışında).
- **AC-32.** Çapı metne çeviren tek yol `fmtKalipCapi`'dir. Taramanın ölçütü: `src/` altında `.yukseklik` ile `.boy`u
  birleştiren bir ifade yalnız `src/lib/utils.js`'te bulunur; yeni sütun, dışa aktarma satırı ve form kendi
  birleştirmesini yazmaz.
- **AC-33.** `stockActions: []` kullanıcısı `stock` bölümünü yazamaz (`reddedilenBolum: "stock"`), stok yazma izni olan
  kullanıcı çapı da yazar. Ölçü saf `tests/server-authz.test.js` bloğudur, yeni Electron turu açılmaz.
- **AC-34.** Makina maliyeti ve parti payları çaplı stok satırıyla da aynı **rakamı** verir: `partiGenelPaylari`'nın
  `havuzK`, `makinaBasiK`, `adet` ve `durum` alanları ile `gercekUretim`'in adetleri çaplı ve çapsız satırda birebir
  eşittir.
- **AC-35.** Müşteri XLSX içe aktarması ve müşteri dışa aktarması değişmez. Taramanın ölçütü: `SettingsExport.jsx`'in iki
  müşteri satırı `fmtKalipCapi(c.kalipCapi)` taşır ve `SettingsImport.jsx`'in 8. sütun ayrıştırma bloğu aynen durur
  (plan turu Karar 30).

### QA turu kriterleri (2026-10-22)

- **AC-36.** `kalipCapiYaz(kayit, kc)` React'sız çağrılabilir: boş çapta (`null`, boş nesne, hepsi boşluk) alanı
  kayıttan **siler**, dolu çapta yazar, kaydın öteki alanlarına dokunmaz. `MakinaStokTab.save()` kayıt nesnesini iki
  dalda da bu fonksiyondan geçirir (kaynak taraması: `setStock` çağrılarına giren nesne `kalipCapiYaz(` ile sarılı).
- **AC-37.** Bir parçası dolu, ötekileri boşluk olan nesnede gövdeye anahtar yazılır ve üç parça girildiği gibi saklanır
  (ör. `{en: " 50 ", yukseklik: "  ", boy: ""}` birebir saklanır, hücrede `fmtKalipCapi`'nin çıktısı `"50 x  x "` görünür;
  Karar 36).
- **AC-38.** `fmtKalipCapi`'nin kendi testi vardır: `undefined`, `null`, nesne olmayan değer, boş nesne, üç parçası
  boşluk olan nesne, tek parçası dolu nesne ve üç parçası dolu nesne.
- **AC-39.** Stok formunun alan sırası Makina Modeli, Seri Numarası, **Makina Kalıp Çapı**, Stoğa Giriş Tarihi, Üretim
  durumu, (gider yetkisiyle) Üretim partisi, Not, Kullanılan Parçalar'dır.
- **AC-40.** Paylaşılan bileşen `Field` başlığını kendi içinde taşır: "Makina Kalıp Çapı" metni iki ekran dosyasının
  hiçbirinde yazılı değildir (kaynak taraması) ve iki ekranda da başlık ekranda görünür.
- **AC-41.** Spec 0100 AC-4'ün testi yedi sütunla güncellenmiştir ve "Durum Model'in hemen sağında" iddiası
  korunmuştur (test yorumunda "spec 0101 ile" notu vardır).
- **AC-42.** Seçicinin boş seçeneğine ("Stoktan seçin...") dönülürse çap kutuları ve kit seçimleri **değişmez**; seri
  no ve serisiz işareti temizlenir.
- **AC-43.** Stok satırının çapı yalnız bir parçalıysa (ör. `{en: "50"}`) formdaki `yukseklik` ve `boy` kaybolur: nesne
  bütün olarak yazılır, parça parça birleştirilmez.
- **AC-44.** `electron/serverAuth.cjs` bu işte değişmemiştir: `ALAN_IZINLERI`'nde `stock` girdisi yok, `EYLEM_IDLERI.stock`
  yalnız ekle ve sil taşıyor, `BOLUM_SEKMELERI.stock` ve `SECTION_GROUP.stock` aynı (kaynak taraması).
- **AC-45.** AC-34'ün karşılaştırmasında motor çıktısının `kayit` alanı ayıklanır (ham stok satırını referansla taşıdığı için
  yeni alanı zorunlu olarak gösterir) ve `tests/fixtures/0088-maliyet-once.json` ile
  `tests/fixtures/0092-havuz-once.json` yenilenmez, girdilerine çap eklenmez.
- **AC-46.** Makina Stoğu'nun arama alanı değişmez: `searchFields` hâlâ `["model", "serialNo", "note"]`'tur, çap
  aranmaz (X2).
- **AC-47.** Denetim izi: stok makinası **ekleme** kaydının detayı yalnız seri no taşır (çap girmez); **düzenleme**
  kaydının `onceki` anlık görüntüsü kaydın tamamını kopyaladığı için çapı taşır ve bu kabul edilir.
- **AC-48.** Görsel kanıt kayıtları: `0101-piksel-raporu.json`'ın kayıtları `beklenen: "degisti"` artı `onay` taşır;
  `MakinaStokTab.jsx`'in geçmiş raporlardaki on altı kaydı `ayni` olarak kalır (hiçbiri çevrilmez).
- **AC-49.** `docs/tasarim-sozlugu.md`'de paylaşılan çap alanının satırı vardır ve `CountryCityFields` ile aynı sınıfta
  anılır.
- **AC-50.** Gövde fikstürü üçlüsü vardır: `tests/fixtures/0101-govde-girdisi.cjs`,
  `tests/fixtures/0101-govde-once.json` ve üreten betik `scripts/tests/0101-govde-fikstur.cjs`; girdi serili, serisiz
  (`serialNo: ""`), partili, üretim tarihli, kitli ve çöpteki satırı kapsar ve altın dosya spec öncesi kodla
  üretilmiştir.

---

## Görsel kanıt

Bilinçli değişen ekranlar **dörttür** ve listesi kapalıdır (ölçüm: `scripts/evidence/0009-sayfa.jsx`'te makina
stoğu listesini boş olmayan stokla çizen ekran yalnız bu dördü; `stok-tahsis-modali`, `stok-yedek-0079` ve
`stok-yedek-parca-ucretsiz` `stock={[]}` ile çiziliyor):

| Ekran | Satır | Neden değişir |
|---|---|---|
| `stok-alt-sekme` | `0009-sayfa.jsx:727` | yeni sütun |
| `makina-stok-formu` | `:741` | yeni alan ve yeni sütun |
| `stok-makina-parti` | `:872` | yeni sütun |
| `stok-0100-durum-suzgec` | `:875` | yeni sütun |

Kayıt kuralı (Karar 20, AC-48): `degisti` artı `onay` **yalnız bu işin kendi raporunun**
(`docs/evidence/0101-piksel-raporu.json`) kayıtlarına yazılır ve spec `done`'a taşınırken `ayni`ye çevrilir.
`MakinaStokTab.jsx`'in geçmiş raporlardaki **on altı** kaydı (`0015-taban`, `0016-taban`, `0022-taban`, `0065`,
`0100-taban`, `0100`, `0100-kapanis`) kendi turlarının sonucudur, `ayni` olarak kalır ve çevrilmez.

Değişmemesi beklenenler: dört müşteri formu ekranı `musteri-formu`, `musteri-formu-hata`, `musteri-formu-ilk-odeme`,
`musteri-formu-0079` ve müşteri detayı ekranları (0 piksel, AC-29/2); stok boş durum ekranı `stok-bos` (AC-14).
`src/components/ui.jsx` sözlüğü kullanmadığı için `kanit-eslemesi.json`'a kaydı eklenmez (C7, ölçüm 19).

Yeni ekran önerisi: `stok-0101-kalip-capi` (çapı girilmiş iki satırlı liste) ve `stok-0101-form-capli`
(düzenleme penceresi dolu alanla).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Çapın boşluk kuralı ve ön doldurma kararı React'sız fonksiyonlarda yazıldı ve kendi testleri var; arayüz yalnız
      gösteriyor ve kendi boşluk denetimini yazmıyor.
- [x] Aynı değeri gösteren her yer (`fmtKalipCapi`) aynı kaynağı kullanıyor; ikinci birleştirme yolu yok (AC-32).
- [x] Yeni kalıcı alan dört nokta kuralıyla eklendi ve `db-roundtrip` ile `db-clean-install`e girdi; okuma ayıklamalı
      (boş sütun gövdeye yazılmaz, spec 0100 deseni) ve `fmtKalipCapi`'nin aynası `db.cjs`'e yazılmadı (C3, AC-8).
- [x] Spec öncesi gövde fikstürünün **üçlüsü** hazır: `tests/fixtures/0101-govde-girdisi.cjs`,
      `tests/fixtures/0101-govde-once.json` ve üreten betik `scripts/tests/0101-govde-fikstur.cjs`; altın dosya
      spec'ten **önceki** kodla üretildi ve girdi serili, serisiz (`serialNo: ""`), partili, üretim tarihli, kitli ve
      çöpteki satırı kapsıyor (ölçüm 24, AC-50).
- [x] İki **önkoşul** test spec'ten önce yazıldı ve yeşil görüldü: `fmtKalipCapi`'nin kendi testi (AC-38) ve müşteri
      formundaki çap alanının davranış testi (AC-29); ikisi de bugün yok (ölçüm 14, ölçüm 21).
- [x] Boş çapın tek yazıcısı `utils.kalipCapiYaz`'dır ve `MakinaStokTab.save()`'in **iki dalında da** çağrılıyor;
      `onChange`'de temizleme yapılmıyor (R2/2, AC-36).
- [x] Paylaşılan alan `ui.jsx`'te, `Field` başlığını içinde taşıyor, üç kutu `aria-label` alıyor ve başlık metni
      ekran dosyalarında yazılı değil (R7/2, R7/3, AC-40).
- [x] Liste sütununun yeri Karar 9'a göre (Durum'un sağında, yedi sütun) ve spec 0100 AC-4'ün testi "spec 0101 ile"
      notuyla güncellendi (AC-41); "Ters çevrilen kriterler" tablosu dolduruldu.
- [x] Stok seçicisinin boş seçeneği hiçbir alana dokunmuyor (R11/2, AC-42) ve ezme nesne düzeyinde (R12/2, AC-43).
- [x] Maliyet motorunun karşılaştırması rakam düzeyinde yapıldı, `kayit` alanı ayıklandı ve `0088-maliyet-once.json`
      ile `0092-havuz-once.json` yenilenmedi (C8, AC-34, AC-45).
- [x] `docs/tasarim-sozlugu.md`'ye paylaşılan alanın satırı eklendi (C7/2, AC-49).
- [x] Yeni veri bölümü yok; `stock` bölümünün bugünkü `BLOB_SECTIONS` / `SECTION_GROUP` / `BOLUM_SEKMELERI` /
      `MERGE_KEYS` kayıtlarına dokunulmadı (ölçümle yazıldı).
- [x] **Yeni eylem izni eklenmedi** ve sunucu tarafı değişmedi; ölçü saf `tests/server-authz.test.js` bloğu (AC-33)
      ve `serverAuth.cjs`'in değişmediğini sabitleyen kaynak taraması (AC-44); yeni Electron turu açılmadı.
- [x] Soft-delete simetrisi: çöp kutusu ve geri alma yolları çapı taşıyor (AC-26, AC-27).
- [x] Kullanıcıya görünen metinler Türkçe. Yazdırma çıktısı eklenmedi (stok ekranının çıktısı yok), müşteri
      yazdırmasının TR/EN anahtarları değişmedi.
- [x] Para gösterilmiyor; çoklu para kuralı bu işe uygulanmaz (açıkça yazıldı).
- [x] Arayüz kriterlerinin görsel kanıtı eklendi; boş durumun iki dalı (AC-14) ve çapsız satır (AC-13) dâhil.
      Kanıt kayıtları yalnız bu işin raporuna yazıldı, geçmiş raporların on altı kaydı çevrilmedi (AC-48).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır. Electron testleri de koşuldu
      (`db-roundtrip`, `db-clean-install`; `server-authz` saf testtir, Electron zincirine girmez).
- [x] `CLAUDE.md` güncellendi (yeni alan, paylaşılan alan bileşeni ve zincirin tamamlanması).
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## Ters çevrilen kriterler

| Spec | Kriter | Bugünkü hâli | Bu spec'ten sonra | Not |
|---|---|---|---|---|
| 0100 | **AC-4** "Durum sütunu Model'in hemen sağında, tablo altı sütun" (`tests/ui/stok-durumu-0100.test.jsx:84-88`) | Başlık dizisi `["Model", "Durum", "Seri Numarası", "Stoğa Giriş", "Not", ""]` | "Durum Model'in hemen sağında" korunur, tablo **yedi** sütun olur: `["Model", "Durum", "Kalıp Çapı", "Seri Numarası", "Stoğa Giriş", "Not", ""]` | Test "spec 0101 ile" notuyla güncellenir (R9/2, Karar 9, AC-41) |

Ayrıca aynı dosyanın `listeSerileri` yardımcısının hücre konumu güncellendi (Karar 38; beklentiler aynı). Başka hiçbir
kriter ters çevrilmez. Ölçülenler: stok dışa aktarmasının başlık satırını sınayan bir test yok
(ölçüm 25), müşteri formundaki çap alanının testi yok (ölçüm 21), `fmtKalipCapi`'nin testi yok (ölçüm 14), stok
bölümü için grup kısıtını ölçen bir sunucu testi yok (ölçüm 18); bunların hepsi **yeni** testtir.

---

## Karar kaydı (QA turu 2026-10-22)

| Bulgu | Derece | Konu | Karar | Spec'teki yeri |
|---|---|---|---|---|
| B-1 | Bloklayıcı | "Kalıp Çapı" sütununun yeri spec 0100 AC-4 ile çakışıyordu, "Ters çevrilen kriterler: yok" yanlıştı | Sütun Durum'un sağına, Seri Numarası'nın önüne; tablo yedi sütun; 0100 AC-4'ün sütun sayısı güncellenir | R9, R9/2, Karar 9, ölçüm 11, AC-12, AC-41, Ters çevrilen kriterler tablosu |
| B-2 | Bloklayıcı | Seçicinin boş seçeneği bir makina seçimi sayılıyor, serisiz satırların seri no'su tam olarak `""` olduğu için ön doldurma yanlış satırdan yapılıyor | Boş seçenek seri no'yu ve serisiz işaretini temizler, çap ve kit alanlarına dokunmaz | R11/2, Karar 10, ölçüm 12, AC-42 |
| B-3 | Bloklayıcı | Boşluk kuralının hangi fonksiyonla ve nerede uygulandığı yazılı değildi; kayıt yolu formu denetimsiz yayıyor | Tek yazıcı `utils.kalipCapiYaz`, `save()`'in iki dalında da çağrılır, `onChange`'de temizleme yok | R2, R2/2, Karar 14, ölçüm 7, AC-36 |
| B-4 | Bloklayıcı | AC-34 ölçülemezdi: `makinaListesi` ham stok satırını `kayit` ile referansla taşıyor | Ölçüt rakam düzeyine çekilir, `kayit` ayıklanır, altın dosyalar yenilenmez | R22/2, C8, Karar 18, ölçüm 16, AC-34, AC-45 |
| Ö-1 | Önemli | Paylaşılan bileşenin sınırı ve imzası tanımsızdı; AC-9'un "ya da"sı testi belirsiz bırakıyordu | Bileşen `Field` başlığını içine alır, imzası `({ value, onChange, label })`, üç kutu `aria-label` taşır | R7/2, R7/3, Karar 15, ölçüm 13, AC-9, AC-40 |
| Ö-2 | Önemli | Çap alanının stok formundaki yeri belirtilmemişti | Seri Numarası'nın hemen altı; sekiz alanlı sıra yazılı | R6/2, Karar 16, ölçüm 10, AC-39 |
| Ö-3 | Önemli | C3'ün veritabanı aynası R3'ün "ikinci boşluk denetimi yazılmaz" kuralıyla çelişiyordu ve gereksizdi | Veritabanı yalnız sütun boşluğunu denetler, ayna yazılmaz | C3, Karar 17, ölçüm 17, AC-8 |
| Ö-4 | Önemli | Spec'in bütün boşluk kuralı `fmtKalipCapi`'ye dayanıyor ama fonksiyonun hiç testi yok | Fonksiyonun kendi testi bu işin önkoşulu | R3, C9, Karar 19, ölçüm 14, AC-38 |
| Ö-5 | Önemli | Boşluklu parçanın saklanan değeri tanımsızdı (AC-2 ile AC-3 arasındaki orta hâl) | Saklanan değer kırpılmaz, boşluk denetimi yalnız anahtara karar verir | R2, R3/2, Karar 13, ölçüm 15, AC-2, AC-37 |
| Ö-6 | Önemli | R12'nin "ezer"i nesne düzeyinde mi parça düzeyinde mi belli değildi | Nesne düzeyinde ezme (kit emsali) | R12/2, Karar 11, AC-43 |
| Ö-7 | Önemli | X5'in gerekçesi düzenleme dalında yanlıştı: `snapshotOnceki` kaydın tamamını kopyalıyor | Ekleme kaydının listesi genişletilmez, düzenleme kaydının çapı taşıması kabul edilir, `snapshotOnceki` daraltılmaz | X5, Karar 22, ölçüm 23, AC-47 |
| Ö-8 | Önemli | Hangi kanıt kayıtlarının `degisti` olacağı iki okumaya açıktı, değişen ekran listesi açık uçluydu | `degisti` yalnız bu turun raporuna; değişen ekranlar dört kalemle kapatıldı | Karar 20, ölçüm 19, Görsel kanıt tablosu, AC-48 |
| Ö-9 | Önemli | AC-29 yalnız piksele dayanıyordu, oysa R7 müşteri formunun kodunu değiştiriyor ve o alanın hiç testi yok | AC-29 davranış kriteri olur, piksel kriteri AC-29/2'ye ayrılır ve dört ekran adıyla sayılır | C9, Karar 19, ölçüm 21, AC-29, AC-29/2 |
| Ö-10 | Önemli | AC-33'ü ölçen bir test bugün yok, hangi dosyaya yazılacağı belirsizdi | Saf `server-authz` bloğu artı `serverAuth.cjs` değişmedi taraması; Electron turu açılmaz | R24/2, Karar 12, ölçüm 18, AC-33, AC-44 |
| Ö-11 | Önemli | Gövde fikstürünün üçlüsü eksik yazılıydı (yalnız `once.json` sayılıyordu) | Girdi, altın dosya ve üreten betik adıyla yazıldı, girdinin kapsamı belirtildi | ölçüm 24, AC-50, DoD |
| K-1 | Küçük | Dönen satır ve damgalama satır numaraları kaymıştı | `Customers.jsx:458`, damgalama `:263-271`, çağrılar `:325` ve `:362` | ölçüm 5, ölçüm 6 |
| K-2 | Küçük | Stok formunun alan sayısı ve aralığı yanlıştı | Altı alan `:266-303`, kit bölümü `:305-354` | ölçüm 2 |
| K-3 | Küçük | Üretim formu dosyalarının yolu eksikti | Tam yollar yazıldı; alanın dize olduğu da ölçüldü | ölçüm 3, AC-30 |
| K-4 | Küçük | X2'nin gerekçesi yalnız tercihe dayanıyordu | Arama kancasının düz alan okuduğu ölçümü eklendi | X2, ölçüm 22, AC-46 |
| K-5 | Küçük | Dört kriterin "kaynak taraması" ölçütü yoktu | Her birine ölçüt yazıldı | AC-11, AC-30, AC-31, AC-32 |
| K-6 | Küçük | Sözlüğe satır eklenmesi yazılı değildi, DoD sözlüğü saymıyordu | Sözlük satırı kısıt, kriter ve DoD maddesi oldu | C7/2, Karar 21, AC-49 |
| K-7 | Küçük | AC-14 yalnız "stok boşken" diyordu, boş durumun iki dalı var | İki dal da kritere girdi | AC-14 |
| K-8 | Küçük | Dışa aktarmanın tek fonksiyondan çizildiği ölçülmemişti | "Tek fonksiyon, iki çıktı" ölçümü yazıldı, AC-16'nın kendiliğinden sağlandığı gerekçesi kaydedildi | R10, ölçüm 20, AC-16 |

Toplam 23 bulgu: 4 Bloklayıcı, 11 Önemli, 8 Küçük. Hepsi Takım Yöneticisi tarafından onaylandı ve spec'e işlendi.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | Revizyon 2 QA turu (23 bulgu), revizyon 3 plan onayı (on üç öneri, Karar 23–35) ve uygulama bulguları (Karar 36–38) |
| **Düzeltme turu sayısı** | 1 | Triyaj: 3 düşük bulgu (yanlış yorum, stok listesindeki kısmi çap gösterimi açık bulgu olarak Karar 39, karar sırası ve iki spec kopyası) |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 | Üçü de belge ve gösterim düzeyinde; davranış hatası yok |
| **Regresyon sayısı** | 0 | Tam takım 397 dosya, 5.200 test yeşil (Electron dahil); müşteri formu ve detayı ekranları 0 piksel; kapanış kanıtı 10 görüntü 0 fark |
| **Kaçan hata** | 0 | Var olan bir hata uygulama turunda düzeltildi: seçicinin boş seçeneği ilk serisiz satırın kitini sessizce yazıyordu (R11/2, spec QA turunda bulunmuştu) |

**Bu spec'ten çıkarılan ders:** Önkoşul testi ölçümün kendisini sınar: spec'in "boş parçalar atlanır" iddiası fonksiyonun **yorumundan** okunmuştu ve önkoşul testi ilk koşuda kırıldı (`"50 x  x "`). Kural: bir spec ölçümünü bir fonksiyonun davranışına dayandırıyorsa davranış kodla ya da koşturularak ölçülür, yorumla değil; yanlış yorum da aynı işte düzeltilir ki bir sonraki spec aynı yanlışı yapmasın. İkinci ders 0100'ünkiyle aynı: değişen ekran listesi tahminle değil görüntü aracının raporuyla kapanır (`stok-alt-sekme` boş stokla çiziliyordu).
