# 0065 — Parça Stoğu Çakışmada Kaybolmasın: Stok Hareketi Birleştirilsin

| | |
|---|---|
| **Durum** | Tamamlandı (commit `635f1bb`, dal `feat/0065-stok-hareketi`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Çakışma birleştirmesi (`merge.js`, App'in birleştirme uygulaması), parça stoğu yardımcıları (`servisStok.js`, `yedekParcaStok.js`), Stok > Parça Stoğu |
| **Bağımlı spec'ler** | 0064 (eksik kilitler, kardeş sorun) · müşteri ve bayi silme kaskadı · 0006 (Evrak'tan yedek parça satışı) |
| **Revizyon** | **R2 (2026-10-01, plan onayı):** bütün öneriler kabul (Q1–Q9): karşı hareket ayrı tiptir (R14), log'da kimlik çakışması yalnız hareketin özü farklıysa yeni kimlik alır (R15), makina üretiminin parça tüketimi kapsama girer (R16), çöpten geri alınan servisin parçaları yeniden düşülür (R17), hareket ve tutarlılık pencereleri Parça Stoğu'ndadır (R18), raporda "sıra belirsiz" grubu (R19), birleştirme sonucu 0 tabanlıdır (R20), sayım düzeltmesi yarışı ve log düzenlemesi bilinen sınırdır (R21, R22). AC-21…AC-27 eklendi. |

---

## Intent

Parça stoğu çakışmada sessizce bozuluyor ve bunun **log'da izi kalmıyor**.

Senaryo: A kullanıcısı parça içeren bir servis kaydediyor (elinde müşteri kilidi var). Aynı anda B,
yedek parça satışı kaydediyor (elinde yedek parça kilidi var). İkisi farklı kilit, ikisi de meşru,
kimse kimseyi engellemiyor. B yarışı kazanıyor, A `dataVersion` çakışması alıp yeniden yükleyip
birleştiriyor. Birleştirme A'nın **servis kaydını geri uyguluyor** (`services` birleştirilen bölümler
arasında), ama A'nın stok düşümünü **uygulamıyor**: `partStock` ve `partStockLog` birleştirilen
bölümler arasında yok.

Sonuç: servis kaydı duruyor, parçaları hiç düşülmemiş. Stok gerçekte olandan fazla görünüyor ve stok
hareketi log'una da hiçbir şey yazılmadığı için fark sonradan anlaşılamıyor.

Bu bir kilit sorunu değil, **birleştirme boşluğu**: stok küreseldir, her servis kaydı için bütün stoğu
kilitlemek eşzamanlı çalışmayı bitirir. Çözüm doğru yerde olmalı: stok hareketi kayıt gibi
birleşmeli, adet ise ondan türemeli.

Başarı şu demek: iki kullanıcı aynı anda stok düşüren iki iş kaydettiğinde ikisinin düşümü de
uygulanıyor, log her iki hareketi de taşıyor ve stok adedi gerçeği gösteriyor.

---

## Requirements

### A. Stok hareketi birleşir

- **R1.** **`partStockLog` birleştirilen bölümler arasına girer.** Log kimlik anahtarlı ve yalnız
  büyüyen bir liste olduğu için birleştirmenin bugünkü "eklemeleri koru" kuralına birebir oturur.
- **R2.** **Adet, birleştirmenin kendi eklediği hareketlerden yeniden hesaplanır.** Yerel mutlak adet
  geri yazılmaz; yeni adet **sunucunun adedi + bu birleştirmede eklenen yerel log girişlerinin
  etkisi** olarak bulunur.
- **R3.** Yeniden hesap **yalnız bu birleştirmede hareketi olan parçalara** uygulanır; bütün stok
  yeniden kurulmaz.
- **R4.** **Hareket tiplerinin anlamı korunur:** stok girişi, servis ve satış hareketleri **fark**
  taşır; sayım düzeltmesi (`manuel_duzelt`) **mutlak değer** taşır ve kendisinden önceki geçmişi
  geçersiz kılar. Yeniden hesap bu iki anlamı ayırır (aşağıda Context).
- **R5.** Çakışma olmadığında stok davranışı **birebir aynı** kalır; canlı yazma yolu (satışta ve
  servis kaydında adedin düşmesi) değişmez.

### B. Log yalnız büyür

- **R6.** **Stok geri alma artık log satırı silmez, karşı hareket yazar.** Bugün servis ve yedek parça
  geri alma, ilgili log satırlarını siliyor; silme birleştirmede geri uygulanmadığı için geri alma da
  kaybolabiliyor. Karşı hareket hem birleştirmeye uyar hem de "parça stoğa geri döndü" bilgisini
  görünür kılar.
- **R7.** "Bu kaydın stoğu daha önce düşülmüş mü" sorusu karşı hareketlerle birlikte **net etkiye**
  bakar; aynı kaydın stoğu iki kez düşmez ve iki kez geri alınmaz.
- **R8.** Karşı hareket log'da ayırt edilebilir ve ekranda okunur bir açıklama taşır.

### C. Bugünkü sapmayı görmek

- **R9.** **Salt okunur bir tutarlılık raporu:** her parça için saklı adet ile log'dan türeyen adet
  karşılaştırılır, sapma varsa parça adıyla ve farkıyla listelenir.
- **R10.** Rapor **hiçbir şeyi kendiliğinden düzeltmez**; düzeltme kullanıcının bugünkü "sayım
  düzeltmesi" yoluyla yaptığı bilinçli bir işlemdir.
- **R11.** Rapor sapmanın log'un eksikliğinden mi (hareket hiç yazılmamış) yoksa adedin elle
  değiştirilmesinden mi doğduğunu ayırt edemeyeceğini açıkça yazar.

### D. Kapsam

- **R12.** Kural stok düşüren **bütün** yollar için geçerlidir: servis değişen parçaları, yedek parça
  (kargo) satışı, Evrak'tan üretilen yedek parça satışı, müşteri ve bayi silme kaskadının geri
  yüklemesi, çöp kutusundan geri alma ve sahipsiz kayıt silme.
- **R13.** Makina stoğu (`stock`) bu işin dışındadır; o bölüm kayıt bazlıdır ve kilitlidir.

### E. Plan onayında eklenenler (R2)

- **R14.** **Karşı hareket ayrı bir tiptir:** `servis` → `servis_iade`, `bayi_satis` → `bayi_satis_iade`, `satis` →
  `satis_iade`, `makina_uretimi` → `makina_uretimi_iade`; `referansId` ve `partId` aslıyla aynı, miktar pozitif. Bir kaydın
  net düşümü (düşüm eksi iade) tek fonksiyondan okunur; log'u `Math.abs(miktar)` ile brüt toplayan okuyucu kalmaz.
- **R15.** **Log'da kimlik çakışması:** aynı kimlikli satır sunucuda farklı içerikle varsa yeni kimlikle eklenmesi yalnız
  hareketin özü (`partId`, `miktar`, `tip`, `tarih`) farklıysa yapılır; yalnız bağ (`referansId`) ya da not farklıysa
  satır aynı harekettir ve atlanır (aksi hâlde stok ikinci kez düşerdi).
- **R16.** **Makina üretiminin parça tüketimi kapsama girer** (R13 makina stoğu satırlarını dışarıda bırakır, bunların
  parça tüketimini değil): makina düzenlenince ve silinince eski tüketim silinmez, karşı hareket yazılır. Yan etki:
  makinanın üretim tarihi (ilk `makina_uretimi` hareketi) düzenleme gününe kaymaz.
- **R17.** **Çöpten geri alınan servisin** (tek başına ya da müşteriyle birlikte) parçaları yeniden düşülür (kırparak,
  yedek parça satışındaki gibi); bugün silmede iade edilip geri almada düşülmüyordu.
- **R18.** **Ekranlar:** Stok › Parça Stoğu'nda her parça satırında salt okunur "Hareketler" penceresi (iade satırları
  okunur notla) ve başlıkta "Stok Tutarlılığı" penceresi (R9). Yeni izin yoktur.
- **R19.** **Sıra belirsizliği:** saklı log'un ekleme sırası korunmaz (yalnız gün düzeyinde tarih var); rapor log'u tarihe
  göre sıralar ve aynı günde sayım düzeltmesiyle başka bir hareketi olan parçayı sapma değil **"sıra belirsiz"** grubunda
  gösterir.
- **R20.** **Birleştirme sonucu 0 tabanlıdır** (bugünkü kırpma kuralı ve veritabanı okuması); aradaki fark raporda sapma
  olarak görünür.
- **R21.** **Bilinen sınır, sayım yarışı:** birleştirmede eklenen sayım düzeltmesi, aynı anda sunucuya yazılmış farkların
  üstüne geçer (R4); parça kartının kilidi elle düzeltmeyi zaten tekilleştirir.
- **R22.** **Bilinen sınır, log düzenlemesi:** var olan log satırının düzenlenmesi (müşteri silme ve geri almada makina
  üretimi bağının taşınması) birleşmez; adedi etkilemez, yalnız bağı.

---

## Constraints

- **C1.** **Adet ekranda saklı kalmaya devam eder** (türetilmiş önbellek): Stok ekranı, formlardaki
  yeterlilik denetimi ve raporlar bugünkü alanı okumayı sürdürür. Hiçbir ekran log'u toplamak zorunda
  kalmaz.
- **C2.** **Tek hesap:** yeniden hesap kuralı saf bir fonksiyonda tek yerde durur; birleştirme ve
  tutarlılık raporu aynı fonksiyonu çağırır, iki ayrı toplama yazılmaz.
- **C3.** **Göç yoktur.** Yeniden hesap sunucunun o anki adedinden başlar, bütün geçmişin eksiksiz
  olmasına dayanmaz; bu yüzden eski verinin log'u tam olmasa bile iş doğru çalışır.
- **C4.** Yeni kalıcı alan yoktur (`partStockLog` zaten var ve kalıcı); yeni izin ve yeni sunucu
  denetimi yoktur.
- **C5.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** **Adedin tamamen log'dan türetilmesi** (saklı adedin kaldırılması) — *neden:* bütün geçmişin
  eksiksiz loglanmış olmasını ve bir göç adımını gerektirir; bugünkü veride sayım düzeltmeleri ve
  elle değişimler karışık. R2'nin "sunucunun adedinden başla" kuralı aynı hatayı göçsüz kapatıyor.
  İleride istenirse ayrı iştir ve önkoşulu R9'un raporudur.
- **X2.** Parça stoğunun kilitlenmesi — *neden:* stok küresel; her servis kaydında bütün stoğu
  kilitlemek eşzamanlı çalışmayı bitirir. Parça kartının bugünkü kilidi (elle adet düzenlemesi) yerinde
  kalır.
- **X3.** Stok sapmasının otomatik düzeltilmesi — *neden:* R10; sapmanın sebebi bilinmeden yazılan
  düzeltme gerçek sayımın üstüne yazabilir.
- **X4.** Parça alış maliyetinin tutulması ve stok değerlemesi — *neden:* 0002 R3'teki karar sürüyor,
  ayrı iş.
- **X5.** Makina stoğunun birleştirmeye alınması — *neden:* R13; o bölüm kilitli ve kayıt bazlı,
  farklı bir sorun.

---

## Context

- **Boşluk doğrulandı.** Birleştirme yirmi bir bölümün eklemelerini geri uyguluyor; listede `partStock`
  ve `partStockLog` **yok**. Buna karşılık `services`, `yedekParcaSatislar` ve `partSales` listede var.
  Yani çakışmayı kaybeden tarafın **kaydı korunuyor, stok etkisi siliniyor**. Kayıp tek yönlü:
  stok her zaman gerçekte olandan fazla görünür (düşüm kaybolur), çünkü korunan taraf kaydın kendisidir.
- **Kilitler bu yarışı önlemiyor, önleyemez de.** Servis müşteri kilidinde, yedek parça satışı kendi
  kilidinde; ikisi farklı kayıt olduğu için ikisi de aynı anda açılabilir. Ortak nokta yalnız stok, ve
  stok bir kayıt değil, küresel bir sayaç. Bu yüzden 0064 bu sınıfı kapsamıyor.
- **Hareket tipleri iki ayrı anlam taşıyor (önemli ayrıntı).** Parça stoğu ekranında "stok girişi"
  log'a **fark** yazıyor ve adedi `mevcut + giren` yapıyor; "sayım düzeltmesi" ise log'a girilen
  **mutlak** değeri yazıyor ve adedi doğrudan o değere çekiyor. Servis ve satış hareketleri negatif
  fark. Yani log'u körlemesine toplamak yanlış sonuç verir; yeniden hesap sayım düzeltmesini sıfırlama
  noktası saymak zorunda (R4). Bu, işin en kolay kaçırılacak yeri.
- **Geri alma bugün log satırını siliyor.** Yedek parça geri alma, `referansId` ve tip eşleşen log
  satırlarını buluyor, adedi geri ekliyor ve **o satırları log'dan çıkarıyor**; servis tarafı aynı
  desende. Silme birleştirmede geri uygulanmadığı için geri almanın kendisi de kaybolabilir. Üstelik
  satır silindiği için "bu parça stoğa geri döndü" bilgisi hiçbir yerde durmuyor. Karşı hareket (R6)
  iki sorunu birden çözüyor: birleştirme silmeyle değil eklemeyle çalışıyor ve geçmiş okunabilir
  kalıyor. Bedeli, "daha önce düşülmüş mü" denetiminin net etkiye bakması (R7).
- **Sapma bugün de olabilir.** Bu boşluk uzun süredir açık olduğu için eldeki adetler log'la
  tutmuyor olabilir. Bu yüzden iş iki parçalı: bundan sonrasını doğru yapmak (A ve B) ve bugünkü
  durumu **görünür** kılmak (C). Raporun düzeltme yapmaması bilinçli: sapmanın sebebi kayıp bir düşüm
  de olabilir, hiç loglanmamış eski bir giriş de; ikisini ayırt etmek mümkün değil ve yanlış yönde
  otomatik düzeltme gerçek sayımı bozar.
- **Neden adedi saklamaya devam ediyoruz.** Stok ekranı, servis ve satış formlarının yeterlilik
  denetimi, Analiz ve raporlar adedi doğrudan okuyor. Adedi tamamen türetmek bu okumaların hepsini
  log taramasına çevirir; performans ve kapsam olarak başka bir iş (X1). Bu spec adedi **türetilmiş
  önbellek** olarak bırakıp yalnız birleştirme anında doğru tazeliyor.

---

## Acceptance Criteria

### Birleştirme

- **AC-1.** İki kullanıcı aynı anda stok düşüren iki iş kaydettiğinde (biri servis, biri yedek parça
  satışı) her iki kaydın stok düşümü de uygulanır.
- **AC-2.** Log her iki hareketi de taşır.
- **AC-3.** Çakışmayı kaybeden tarafın düşümü, kazananın düşümünün üstüne yazmaz; adet ikisinin
  toplamı kadar azalır.
- **AC-4.** Yeniden hesap yalnız o birleştirmede hareketi olan parçalara uygulanır; diğer parçaların
  adedi değişmez.
- **AC-5.** Çakışma olmayan tek kullanıcı senaryosunda stok davranışı bu işten önce ve sonra birebir
  aynıdır.
- **AC-6.** Birleştirmede eklenen hareketlerden biri sayım düzeltmesiyse, sonuç o değerden başlar ve
  sonraki farklar ona uygulanır.
- **AC-7.** Aynı log kaydı iki kez eklenmez (kimlik çakışması olduğunda bugünkü yeniden kimliklendirme
  kuralı işler).

### Geri alma

- **AC-8.** Servis silindiğinde parça stoğa döner ve bu, log'da karşı hareket olarak görünür.
- **AC-9.** Yedek parça satışı silindiğinde aynı şekilde karşı hareket yazılır.
- **AC-10.** Geri alma çakışmada kaybolmaz.
- **AC-11.** Aynı kaydın stoğu iki kez düşmez ve iki kez geri alınmaz.
- **AC-12.** Müşteri ve bayi silme kaskadı, çöpten geri alma ve sahipsiz kayıt silme aynı kuralla
  çalışır.

### Tutarlılık raporu

- **AC-13.** Rapor saklı adet ile log'dan türeyen adedi karşılaştırır ve sapan parçaları farkıyla
  listeler.
- **AC-14.** Sapma yoksa rapor bunu açıkça söyler.
- **AC-15.** Rapor hiçbir adedi değiştirmez.
- **AC-16.** Rapor sapmanın sebebini kesin söyleyemediğini yazar.

### Sınırlar

- **AC-17.** Makina stoğunun davranışı değişmez.
- **AC-18.** Veritabanı şeması değişmez; yeni izin ve sunucu denetimi yoktur.
- **AC-19.** Yeniden hesap kuralı tek fonksiyondadır; birleştirme ve rapor aynı fonksiyonu çağırır.
- **AC-20.** Stok yeterlilik denetimi ve ekranlar adedi bugünkü gibi doğrudan okur.

### Plan onayında eklenenler (R2)

- **AC-21.** Karşı hareket ayrı tiptedir; bir kaydın net düşümü düşüm eksi iadedir ve brüt toplayan okuyucu kalmamıştır
  (R14, kaynak taraması).
- **AC-22.** Yalnız bağı değişmiş bir log satırı birleştirmede yeni kimlikle eklenmez; hareketin özü farklı aynı kimlikli
  satır yeni kimlikle eklenir (R15).
- **AC-23.** Makina düzenlenince ve silinince parça tüketimi için karşı hareket yazılır; üretim tarihi kaymaz (R16).
- **AC-24.** Çöpten geri alınan servisin (tek başına ve müşteriyle) parçaları yeniden düşülür ve log'a yazılır (R17).
- **AC-25.** Parça satırının "Hareketler" penceresi iade satırını okunur notla gösterir (R18).
- **AC-26.** Aynı günde sayım düzeltmesi ve başka hareketi olan parça "sıra belirsiz" grubunda, sapma listesinde değil
  (R19).
- **AC-27.** Birleştirme sonucu adet 0'ın altına inmez (R20).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] İki kullanıcı çakışması saf birleştirme testiyle sürülüyor (AC-1, AC-3).
- [x] Sayım düzeltmesinin sıfırlama anlamı testle sabitlendi (AC-6).
- [x] Yeniden hesap kuralının tek yerde olduğu kaynak taramasıyla gösterildi (AC-19).
- [x] Çakışmasız senaryoda stok davranışının değişmediği çapraz testle gösterildi (AC-5).
- [x] Görsel kanıt eklendi (`docs/evidence/0065-*.jpg`): log'da karşı hareket, tutarlılık raporu (R18).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: stok hareketinin birleştirildiği, adedin türetilmiş önbellek olduğu,
      geri almanın karşı hareket yazdığı ve sayım düzeltmesinin sıfırlama noktası olduğu.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R2 plan onayı (Q1–Q9; R14–R22, AC-21…AC-27). Triyaj bulguları spec'i değil uygulamayı düzeltti. Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: 6 bulgu (silinmiş satırın dirilmesi, birikimsiz kırpma tabanı, log bağının eşlenmemesi, plan alanı, tablo, testler). İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 6 / 0 | Altısı da gerçekti; ikisi belge/bakım. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | "Satır silinir" beklentileri bilinçli olarak "karşı hareket"e çevrildi; 54 mevcut ekran 0 piksel. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Birleştirmeye bir bölüm eklerken "yerelde olup sunucuda olmayan = yeni" varsayımı yalnız ekleme yapılan listelerde doğrudur; bölümün geçmişinde silme varsa (eski istemci, yedekten geri yükleme) silinmiş satır dirilir. Yeni olanı bilinen kümeyle ayırmak gerekir. İkincisi: bir yardımcı döngüde çağrıldığında aynı anlık görüntüyü kırpma tabanı olarak kullanıyorsa, tekil testler geçer ama toplu yol taşar; toplu çağıranlar için birikimli tabanlı ayrı bir yol yazılmalı.
