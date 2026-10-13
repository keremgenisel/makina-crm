# 0080 — Gider kalemleri ve tedarikçiler listelerinde sayfalama kalkar

| | |
|---|---|
| **Durum** | Tamamlandı (commit `507c397`, dal `feat/0080-sayfalama-kalkar`; plan `specs/done/0080-uygulama-plani.md`) |
| **Sahip** | Analist (spec) · geliştirme atanmadı |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Mali İşler › Giderler (Dönem Raporu kalem listesi ve onun makina çözümü, Tedarikçiler görünümü); paylaşılan sayfalama kancasının liste tablosu; görsel kanıt aracı |
| **Bağımlı spec'ler** | 0062 (kısmen geri alınır), 0071 (AC-23 kısmen geri alınır), 0067 (KalemListesi'nin donmuş prop metni), 0026 (genel aramadan geliş), 0001, 0072, 0076 (kalem listesinin sütunları) |
| **Sıra** | 0080 → 0081 → 0082 (`specs/README.md`; gerekçe Context'te) |
| **Revizyon** | · 1 · 2026-10-13 QA turu (B-1…B-4, Ö-5…Ö-12, K-13…K-19 işlendi) · 2 · 2026-10-13 plan onayı (P1–P8, `specs/done/0080-uygulama-plani.md`) |

---

## Intent

Ayın giderlerini kontrol eden kişi (fabrika yönetimi ve muhasebe) gider kalemleri listesini
**bir bütün olarak** görmek istiyor: faturaları eline alıp ekrandaki satırlarla tek tek
karşılaştırıyor, tarayıcı aramasıyla bir tutarı arıyor, listenin altındaki alt toplamla
kendi topladığı rakamı tutturuyor. Bugün onuncu satırdan sonrası ikinci sayfada, yani bu
işin tamamı sayfa çevirmeye bağlı. Tedarikçi listesinde de aynı durum var, oysa tedarikçi
sayısı ayda bir bile değişmiyor; liste zaten kısa, sayfalanması yalnız bir tık fazlası.

Başarı şu: iki listede de süzgeçten geçen bütün satırlar tek sayfada, baştan sona, ekranı
kaydırarak okunur. Sayfa çubuğu ortadan kalkar.

---

## Requirements

- **R1.** Dönem Raporu'ndaki **Gider Kalemleri** listesi, süzgeçten geçen bütün satırları tek
  seferde gösterir. Sayfa çubuğu çizilmez.
- **R2.** Giderler › **Tedarikçiler** görünümündeki liste bütün canlı tedarikçileri tek seferde
  gösterir. Sayfa çubuğu çizilmez.
- **R3.** İki listenin **başlığındaki sayı** ve gider kalemleri listesinin **alt toplamı**
  bugünkü anlamını korur (0062 R16: zaten bütün listeden hesaplanıyordu, sayfadan bağımsızdı).
- **R4.** Gider kalemleri listesinin **personel grup satırı** davranışı değişmez: kapalıyken tek
  satır, açılınca çalışan satırları listeye girer, ikisi de tek sayfada görünür.
- **R5.** Dört süzgeç (tür, tedarikçi, ödeme durumu, arama) ve dönem değişimi (Ay ↔ Tarih Aralığı,
  ay seçimi) bugünkü gibi çalışır; "sayfa 1'e dön" davranışı sayfa kavramı kalktığı için
  kendiliğinden ortadan kalkar.
- **R6.** Boş liste davranışı değişmez ve **iki listede bugün farklıdır, farklı kalır:**
  - **R6/1.** Gider kalemleri listesinde süzgece uyan kalem yoksa **tablo çizilmeye devam eder**:
    başlık satırı, gövdede tek "Filtreye uyan kalem yok." satırı ve `tfoot` alt toplamı. Bugünkü
    davranış budur (`DonemRaporu.jsx`'te tabloyu gizleyen bir dal yoktur) ve C4 gereği
    değiştirilmez; yalnız çubuk yoktur.
  - **R6/2.** Tedarikçiler listesinde hiç canlı tedarikçi yoksa **tablo hiç çizilmez**, bugünkü
    boş metin kutusu görünür (ayrı dal). Bu dal da değişmez.
- **R7.** Genel aramadan gelen kalem sonucu listeyi bugünkü gibi süzgeçle açar; aranan satırın
  kaçıncı sayfada olduğu sorusu ortadan kalkar. **0026 X8 kararı (vurgu yok, satıra kaydırma yok)
  yürürlükte kalır**; sayfa kalktığı için eşleşen satırın listede aşağıda kalabileceği bilinen
  sınırdır (Context, X8).
- **R8.** Diğer sayfalanan listeler **değişmez**: 0062'nin liste tablosundaki kalan **on bir
  çağrı yedi dosyada** durur, yani Kasa'nın dört listesi, çek portföyünün iki listesi, Makina
  Kârlılığı, Makina ve Model'in makina listesi, Açık kalemler, Ekstre penceresi ve ödeme
  hatırlatma penceresi.
- **R9.** Sayfalama kaynak taramasının liste tablosundan bu iki dosya çıkarılır. Tablonun taşıdığı
  diğer iki kural bu iki dosyada **ayrıca sabitlenir**, yoksa tablodan çıkmakla birlikte sessizce
  biterler:
  - **R9/1.** "Elle yazılmış pager yasak" kuralı yürürlükte kalır (kendi dilimleme ve kendi
    "‹ Önceki" / "Sonraki ›" düğmesi yazılamaz). Bu kural klasör taramasıdır, liste tablosundan
    bağımsızdır, dokunulmaz.
  - **R9/2.** 0062 R26'nın **`useFilteredList` yasağı** iki dosya için korunur (tedarikçide arama
    yok, kalem süzgeci kendi durumundadır). Bugün bu yasağı liste tablosunu gezen tarama taşıyor;
    tablodan çıkınca aynı iddia bu spec'in kendi taramasına yazılır (AC-12).
- **R10.** Kalem listesi makina çözümünü **tek kez kurar.** Bugün çizilen her satır için
  `makinaGideriCoz(k, { stock, customers })` çağrılıyor ve bu fonksiyon her çağrıda diziyi
  doğrusal tarıyor; sayfa kalkınca maliyet satır sayısıyla çarpılır. Aynı modülde bu iş için
  yazılmış toplu kardeşi vardır (`makinaCozucuOlustur`: stok ve müşteriler bir kez haritaya
  alınır, sonuç birebir aynıdır). Liste çözücüyü `useMemo` içinde bir kez kurar, satırlar onu
  çağırır. Çıktı aynı olduğu için C4 ihlal edilmez ve piksel farkı doğmaz.
- **R11.** `donemAnahtari` prop'u **KalemListesi'ne geçmez.** Bu prop yalnız sayfa sıfırlaması
  için vardı; sayfa kalkınca iki çağrı yerinden de düşer. Giderler'deki `donemAnahtari` tanımı
  **silinmez**, çünkü Makina ve Model görünümü onu kullanmaya devam eder (R8). Prop düşünce
  0067'nin "KalemListesi'ne geçen props değişmedi" diyen birebir metin taraması kırılır; o metin
  güncellenir ve **neden değiştiği** 0067'ye atıfla yazılır (AC-17).

---

## Constraints

### Uyulması zorunlu

- **C1.** 0062'nin iki tuzak kuralı yürürlükte kalır: **toplamlar** ve **toplu işlemler** sayfaya
  bağlanmaz. Bu spec'te sayfa kalktığı için kural bu iki listede kendiliğinden sağlanır. Kuralın
  taşıyıcıları iki ayrı yerdedir ve ikisine de dokunulmaz:
  - **C1/1.** Toplam ve toplu işlem iddiaları **Kasa ve çek portföyünün UI testlerindedir**
    (0062 AC-17, AC-20), kaynak taraması değil. Bu spec o testlere dokunmaz.
  - **C1/2.** Kaynak taraması olan tek kural "rapor kurucusu, sunum modülü ve dışa aktarma
    sayfalamayı görmez" (0062 AC-25); aynen durur ve C3 ile birlikte okunur.
- **C2.** Paylaşılan sayfalama kancası ve bileşeni **silinmez**: 0062'nin liste tablosundan
  on bir çağrı yedi dosyada kullanımda kalıyor (R8), ayrıca tablonun dışında Finans, Bayiler,
  Müşteriler, Notlar, Evrak, Stok ve Ayarlar listeleri de aynı kancayı ya da bileşeni kullanıyor.
- **C3.** Yazdırma, dışa aktarma ve Aylık Gider ve Kasa Raporu sayfalamayı bugün de görmüyor
  (0062 AC-25); bu spec onların çıktısını değiştirmez.
- **C4.** Listelerin satır içeriği, sütunları, sıralaması, rozetleri ve test kimlikleri değişmez.
  Bu spec yalnız sayfa çubuğunu ve dilimlemeyi kaldırır; R10 çıktısı birebir aynı olan bir hesap
  düzeltmesidir, bu yüzden C4'ün dışında değildir.

### KAPSAM DIŞI

- **X1.** Kalan dokuz listenin sayfalaması — *neden:* 0062'nin gerekçesi orada aynen geçerli
  (hesap hareketleri, hesapsız kayıtlar, çek portföyü ve ekstre tanım gereği sonsuz büyüyor).
  Bu spec yalnız Takım Yöneticisi'nin adıyla saydığı iki listeyi kapsar. Bunlardan biri, **Açık
  Kalemler** listesi (aynı ekranın kardeş kipi, "tüm dönemler", onluk sayfalı), bilinçli olarak
  dışarıdadır: Intent'in anlattığı iş orada da geçerli, ama kapsamı analist büyütmez. İstenirse
  aynı mekanizmayla, aynı gerekçeyle ayrı bir istek olarak gelir.
- **X2.** Kalem listesine sanal kaydırma — *neden:* yalnız görünen satırları çizmek, bugünkü
  satır sayısında karşılığı olmayan bir mimari iş; önce R10 yapılır, sonra ölçüm (AC-15),
  gerekirse ayrı spec.
- **X3.** Gider kalemleri listesine kendi arama kutusunun eklenmesi — *neden:* süzgeç satırında
  arama zaten var; liste tek sayfada olunca tarayıcı araması da çalışır.
- **X4.** Varsayılan dönemin ya da kiplerin değişmesi — *neden:* bu spec Dönem Raporu'nun
  görünümünü sadeleştirir, kapsamını değiştirmez.
- **X5.** Tedarikçiler listesine arama kutusu eklenmesi — *neden:* 0062 R7'de "arama yok" kararı
  verildi, liste kısa; sayfalama kalkınca gerekçe daha da zayıflıyor.
- **X6.** Tabloların sütun başlığının yapışkan yapılması — *neden:* sayfa kalkınca dokuz sütunlu
  tabloda aşağıdaki satırı okuyan kullanıcı başlıkları göremez, bu bilinen bedeldir (Context).
  Ama depodaki hiçbir tabloda yapışkan başlık yok ve tasarım sözlüğünde kuralı da yok; iki ekranda
  değil bütün tablolarda sorulması gereken bir tasarım kararıdır. Bu spec'te cevabı "şimdilik
  hayır" ve bu yazılıdır, ki geliştirici kendi başına karar vermesin.
- **X7.** Yatay kaydırma çubuğunun konumu — *neden:* sütun daraltma ya da yapışkan çubuk, çözümü
  tasarım işi. Durumun **ölçümü** kapsamdadır (AC-19) ve sayısı Context'e yazılır; düzeltmesi ayrı
  iştir.
- **X8.** Arama sonucunda satırın vurgulanması — *neden:* 0026 X8 kararı yürürlükte (vurgu yok,
  satıra kaydırma yok; R7). Sayfa kalkınca kararın gerekçesi zayıflıyor ve bu Context'te yazılı;
  ama vurgu eklemek yeni bir arama davranışıdır, bu spec'in işi değil.

---

## Context

**Bugünkü durum (ölçülmüş).** Giderler ve Kasa listelerinde sayfalama **0062 ile geldi**
(uygulamanın geri kalanında, yani Müşteriler, Bayiler, Notlar, Evrak, Finans'ın dört tablosu, Stok
ve Ayarlar'da 0062'den önce de vardı). **0062'nin liste tablosu** on üç çağrı, dokuz dosya:

| Dosya | Sayfa boyutu | Çağrı |
|---|---|---|
| `src/components/Kasa.jsx` | 10 | 4 |
| `src/components/cek/CekPortfoyu.jsx` | 10 | 2 |
| **`src/components/gider/DonemRaporu.jsx`** | **10** | **1** (bu spec) |
| `src/components/gider/MakinaKarliligi.jsx` | 10 | 1 |
| `src/components/gider/MakinaModelGorunumu.jsx` | 10 | 1 |
| **`src/components/gider/Tedarikciler.jsx`** | **10** | **1** (bu spec) |
| `src/components/gider/AcikKalemler.jsx` | 10 | 1 |
| `src/components/gider/EkstrePenceresi.jsx` | 5 | 1 |
| `src/components/gider/OdemeHatirlatma.jsx` | 5 | 1 |

- Gider kalemleri: `src/components/gider/DonemRaporu.jsx:284`
  `usePagination(cizim, 10, "<donemAnahtari>|<tur>|<ted>|<odeme>|<ara>")`, çubuk `:458`.
  Dilimlenen şey **çizilen satır kümesi** (`cizim`): personel grubu kapalıyken tek satır,
  açıkken çalışan satırları kümeye giriyor (0062 R20, R32). Bu küme kalır, yalnız dilimleme ve
  sıfırlama anahtarı gider.
- Tedarikçiler: `src/components/gider/Tedarikciler.jsx:58` `usePagination(sirali, 10)`,
  çubuk `:99`. `sirali` canlı tedarikçilerin ada göre sıralanmışı; arama yok.

**İki listenin boş durumu bugün aynı değil (R6).** Kalem listesinde tablo **her zaman** çizilir ve
boşluk gövdedeki tek satırdır: `DonemRaporu.jsx`'te tabloyu gizleyen bir dal yok,
`suz.length === 0` koşulu yalnız tek bir "Filtreye uyan kalem yok." hücresi basıyor ve alt toplam
satırı da basılıyor. Tedarikçiler'de ise ayrı bir dal var (`sirali.length === 0` boş metin kutusunu
çiziyor, tablo hiç çizilmiyor). Tek cümleyle iki
listeyi anlatmak geliştiriciyi C4 ile çelişen bir yeniden kurguya iter; bu yüzden R6 ikiye bölündü.

**Sayfa kavramının gittiği başka yerler.** `DonemRaporu.jsx`'in `donemAnahtari` prop'u yalnız
sayfa sıfırlaması için var ve **iki çağrı yerinden** geçiyor: hatırlatma kipi
(`src/components/Giderler.jsx:318`, `baslangicFiltre` almıyor) ve normal kip (`:355`). Tanım
`:99`'dadır ve **silinmez**, çünkü aynı anahtar Makina ve Model görünümüne de gidiyor (`:374`) ve
orada kalır (R8, R11).

**Testler: iki değil üç dosya.**

- `tests/sayfalama-0062.test.js`'in `LISTELER` sabiti (`:64-74`) dosya, boyut ve çağrı sayısını
  birlikte sabitliyor; bu iki satır çıkar, kalan yedi satır aynen durur. Aynı sabiti gezen test
  üçüncü bir şeyi de iddia ediyor: `useFilteredList` yokluğu. O iddia tabloyla birlikte bitmesin
  diye R9/2 ve AC-12 yazıldı. Elle pager yasağı (AC-12'nin `KLASORLER` taraması) **bütün**
  gider/kasa/çek dosyalarını tarıyor, liste tablosundan bağımsız; dokunulmaz.
- `tests/ui/sayfalama-0062.test.jsx`'te bu iki listeye ait kriterler ters çevrilir: AC-5, AC-31,
  AC-44'ün kalem listesi yarısı, AC-17/AC-32/AC-18 (alt toplamın sayfadan bağımsızlığı artık tek
  sayfada ölçülür), AC-29/AC-14, AC-28, AC-15 ve Tedarikçiler'in AC-8/AC-16'sı.
- **`tests/ui/kdv-dahil-0071.test.jsx:200`**, yani **0071 AC-23**, tamamen kalem listesinin
  sayfalaması üzerine kurulu ("süzgeç değişince kalem listesi 1. sayfaya döner; hatırlatma
  kipiyle çakışmaz"; gövdesi "Sonraki ›" tıklayıp `‹ Önceki` arıyor). Yani bu spec 0062'yi kısmen,
  **0071'i de kısmen** geri alıyor. Kriterin sayfalama yarısı kalkar, çakışma yarısı korunur
  (AC-18), çünkü o kısım sayfalamadan bağımsız ve hâlâ değerli.
- **`tests/ui/kutu-duzeni-0067.test.jsx:78-82`**, yani **0067 AC-5 / AC-28**, KalemListesi
  çağrısının **birebir metnini** sabitliyor ve adı "KalemListesi'ne geçen props değişmedi".
  `donemAnahtari` düşünce bu test kırılır; metin güncellenir ve nedeni yazılır (R11, AC-17).
  Donmuş bir sözleşme sessizce güncellenirse niye değiştiği yazısız kalır.

**Ölçekleme: tek gerçek terim satır başına makina çözümü (R10).** `DonemRaporu.jsx:295` çizilen her
satır için `makinaGideriCoz(k, { stock, customers })` çağırıyor; `gider.js:817`'deki bu fonksiyon
`stock` ve `customers` dizilerini **her çağrıda** doğrusal tarıyor. Hemen altında (`:831-833`) bu iş
için yazılmış toplu kardeşi duruyor ve yorumu şunu söylüyor: *"Rapor gibi çok kalemli hesaplar için:
stok ve müşteriler BİR KEZ haritaya alınır, her kalem sabit zamanda çözülür … Sonuç
`makinaGideriCoz` ile aynıdır."* Bugün en çok on satır çizildiği için maliyet 10 × (stok + müşteri);
sayfa kalkınca N × (stok + müşteri) olur, yani B1'in korktuğu yavaşlamanın baskın terimi tam burası
ve çaresi aynı modülde hazır. X2'ye (sanal kaydırma) gitmeden önce bu yapılır, yoksa AC-15 hazır bir
düzeltmeyi ölçmeden "yavaş" raporlar.

Tedarikçi tarafında benzer bir terim var ama sınırlı: `Tedarikciler.jsx:76` satır başına
`tedarikciKullanim(t.id, giderler, giderTanimlari)` çağırıyor ve bu fonksiyon üç ayrı `filter` ile
gider dizisini **üç kez** tarıyor. Tedarikçi sayısı tanımı gereği küçük olduğu için (B2'nin kendi
gerekçesi) burada iş yapılmaz; AC-15'i ölçen kişinin bunu bilmesi için yazılı.

**Kaydırma ve sütun başlıkları (bilinen bedel).** Kalem tablosu `overflowX: "auto"` bir kabın içinde
ve `minWidth: 980`; tedarikçi tablosunda `minWidth: 720`. Kenar çubuğu 236 px (`App.jsx:1463`),
yani 1024 px pencerede kalem tablosu kesinlikle yatay kayar, 1280'de sınırdadır. Bugün kap en çok on
satır olduğu için çubuk hep göz hizasında; yetmiş satırda çubuğa ulaşmak için listenin sonuna inmek
gerekir. Mevcut Electron yerleşim testi (`scripts/tests/donem-raporu-yerlesim.cjs`) yalnız **belge**
taşmasına bakıyor (`belgeTasma`), kabın içine bakmıyor, yani bu durumu yakalamaz; AC-19 bunu ölçer,
düzeltmesi X7. Aynı tabloda sütun başlıkları da kaydırmayla ekrandan çıkar; yapışkan başlık X6.

**Görsel kanıt: iki ölü ekran.** Görüntü aracında `giderler-0062-kalemler-sayfa2` ve
`giderler-0062-tedarikciler-sayfa2` ekranları var (`scripts/evidence/0009-sayfa.jsx:864`, `:870`) ve
adımları `sayfa2(...)`, yani `"dugme:Sonraki ›"`. Düğme yoksa adım **çökmez**, yalnız
`console.warn("düğme yok: …")` basar (`:1103`). Yani iki ekran sessizce sayfa 1'in kopyası olur ve
adı yalan söyler. İki ekran araçtan silinir, yerine iki **tam liste** ekranı (on satırın üstünde
veriyle) eklenir (AC-20). Eski kayıtlar tarihsel raporlara baktığı için `kanit-eslemesi.json` ve
`tests/kanit-eslemesi.test.js` kırılmaz; yeni kayıtlar `beklenen: "degisti"` + onay satırıyla girer.
`docs/evidence/kanit-eslemesi.json` iki dosya için zaten kayıt tutuyor (`DonemRaporu.jsx`,
`Tedarikciler.jsx`); on satırdan fazla veriyle çekilen ekranlar bilinçli olarak değişecek.

**Sıra ve 0081 ile gerilim.** Üçlünün sırası **0080 → 0081 → 0082** (`specs/README.md`): 0080 ve
0081 salt gösterim işi ve birbirinden bağımsız, 0082 ise silme işi, on yedi kaynak dosyasına
dokunuyor ve diğer ikisinin görsel kanıt tabanını geçersiz kılıyor. Üçü aynı iki dosyaya dokunduğu
için sıra yalnız README'de kalmamalı: 0080'i uygulayan kişi bunu bilmezse kanıtı boşa çeker.
Görünürdeki çelişki de burada yazılı olsun: 0081 aynı ekranda beş yan kutuyu kapatarak **kaydırma
mesafesini kısaltmayı** hedefliyor, 0080 ise listeyi sınırsız uzatıyor. Çelişki değil, ayrım:
katlanan kutular **ara sıra** bakılan tablolar, kalem listesi **her gün** okunan listedir; biri
gizlenir, öbürü açılır.

### Ölçüm sonuçları (uygulama, 2026-10-13)

- **AC-15 (jsdom vekil ölçüm):** 1.200 kalemli dönemde liste çizimi **~1,0 sn**, bir tür süzgeci değişimi **~0,22 sn**
  (üç koşu: 1.007/237, 964/216, 996/217 ms). Eşik 10 sn (plan P3). İlk ölçüm süzgeci 10 sn gösterdi; sebep uygulama değil,
  ölçüm aralığındaki `getByLabelText`'in 1.200 satırlık DOM'u taramasıydı, süzgeç ölçümden önce bulunarak düzeltildi.
- **AC-19 (Electron, 70 kalem, App'in 236 px kenar çubuğu kadar sol boşlukla):** 1280 px'te kalem kabı **yatay kaymaz**
  (scrollWidth 983 / clientWidth 983); **1024 px'te kayar** (980 / 727). İki genişlikte de belge düzeyinde taşma yok. Kabın
  yüksekliği ~6.050 px, yani 1024 px'te yatay çubuk listenin sonundadır (X7'nin bedeli ölçüldü).

### Bulgular (öneri kuralı 5)

- **B1. 0062'nin gerekçesi bu iki listede ne kadar geçerli?** 0062 kalem listesini
  "**Tarih Aralığı kipinde binlerce satıra çıkabiliyor**" diye sayfalamıştı. Sayfalama kalkınca
  bir yıllık aralık seçen kullanıcı bütün yılın kalemlerini tek seferde çizer. Bugünkü veri
  hacminde (aylık onlarca kalem) bu sorun değil; yıllar birikince fark edilir.
  **Önerim: istendiği gibi kaldırılır** ve ölçüm iki katmanlı yapılır (aşağıda). Yavaşlama
  görülürse iki yol var, ikisi de ayrı iştir: (a) sayfalama yalnız "Tarih Aralığı" kipine geri
  gelir, Ay kipinde hiç olmaz; (b) sanal kaydırma (X2). Ay kipi, yani günlük kullanım, hiçbir
  koşulda sayfalanmaz. *Gerekçe:* bugünkü acı kesin ve her gün yaşanıyor, gelecekteki yavaşlama
  ihtimalli ve ölçülebilir; ihtimal uğruna her gün sayfa çevirmek pahalı.
  **Karar (Takım Yöneticisi, 2026-10-13): öneri kabul edildi.** Sayfalama iki listeden kaldırılır.
  Yavaşlama görülürse (a) yolu, yani sayfalamanın **yalnız Tarih Aralığı kipine** geri gelmesi
  ayrı bir spec'le ele alınır; **Ay kipi hiçbir koşulda sayfalanmaz.** Bu karar R1 ve R2'yi
  değiştirmez, gerekçesini sabitler.
  **Ölçüm iki katmanlıdır (QA turu, 2026-10-13).** Önceki hâlde "ölçüm sürüm sonrası yapılır"
  kararı ile "ölçüm yapıldı ve sayısı spec'e yazıldı" DoD satırı birbirini dışlıyordu; ayrıca
  "tek karede tamamlanır" ifadesi jsdom'da ölçülemez ve yüz kalem, B1'in kendi anlattığı
  "binlerce satır" riskinin çok altında kalıyordu. Yerine:
  - **Sürüm öncesi, otomatik (AC-15):** depodaki tek süre ölçümü emsaliyle
    (`performance.now()` + eşik + `console.log`; `tests/makina-maliyeti.test.js:421` C9 ve
    `tests/gider-dagitim-0072.test.js:171`), bir yıllık aralığı temsil eden **1.200 kalemle**.
    jsdom'un vekil ölçüm olduğu test adında ve spec'te yazılıdır.
  - **Sürüm sonrası, elle:** kurulu sürümde bir yıllık aralık seçilip gözlem notu SCORECARD'ın
    "ders" satırına yazılır. Kabul kriteri değildir, çünkü testi olamaz.
- **B2. Tedarikçi listesinde çubuğun bugün görünme sıklığı.** Çubuk yalnız onu aşınca çiziliyor
  (`Pagination` tek sayfada kendini gizliyor, 0062 AC-16). Yani bu istek, tedarikçi sayısı onu
  geçmiş kurulumlarda hissedilen bir sorunu düzeltir. **Önerim: yine kaldırılır**, çünkü listenin
  tanımı gereği üst sınırı var ve sayfalamanın hiçbir faydası kalmıyor.

### Plan onayı kararları (revizyon 2, Takım Yöneticisi, 2026-10-13)

Planın sekiz önerisinin hepsi kabul edildi; ayrıntı `specs/done/0080-uygulama-plani.md` §3.

- **P1.** 0062'nin ters çevrilen UI testleri 0062 dosyasından silinir, ters hâlleri bu spec'in AC adlarıyla
  `tests/ui/sayfalama-kalkar-0080.test.jsx`'te yaşar; 0062 dosyasında tek satır atıf kalır. 0071 AC-23 yerinde güncellenir.
- **P2.** R10'un eşitliği yinelenen kimlik dışında birebirdir (`makinaGideriCoz` ilk eşleşeni, haritalı çözücü stok ve
  müşteride son yazılanı alır). Bilinen sınır olarak kabul edildi; çözücüye dokunulmaz (motor değişmez).
- **P3.** AC-15'in eşiği önce ölçülür, sonra gözlenen değerin yaklaşık üç katı ve en az 10 sn olarak konur.
- **P4.** "Motor, sunucu … dokunulmadı" kanıtı iki parçalıdır: planda `git diff --stat` çıktısı ve testte bu dosyalarda
  `0080` geçmediğinin taranması.
- **P5.** Görüntü aracında 0062 adlı tam liste ekranları kalır (bundan sonra bütün satırları çizer, taban raporuyla
  `degisti`); dört yeni `giderler-0080-*` ekranı eklenir (iki tam liste, süzgece uyanı olmayan kalem listesi, tedarikçisiz liste).
- **P6.** AC-19 kalem kabının yatay kaymasını bilgi olarak basar, kabul iddiası değildir (X7); `belgeTasma` iddiası kalır.
- **P7.** Tasarım sözlüğünün "Sayfalama" kuralına istisna maddesi yazılır (bu iki liste sayfalanmaz; yavaşlarsa yalnız
  Tarih Aralığı kipi, Ay kipi asla).
- **P8.** Sıra korunur: 0080'in görsel kanıtı 0081'den önce commitlenir.

---

## Acceptance Criteria

- **AC-1.** Personel kalemi olmayan, on beş kalemli bir dönemde Gider Kalemleri listesi on beş
  satırı da çizer; sayfa çubuğu yok.
- **AC-2.** Personel kalemi olmayan, yetmiş kalemli bir dönemde yetmiş satırın hepsi çizilir;
  "Sonraki" ya da "Önceki" düğmesi hiç yok. (Personel grubu varken çizilen satır sayısı kalem
  sayısına eşit olmaz, çünkü grup kapalıyken personel tek satırdır; o hâl AC-4'ün konusudur.)
- **AC-3.** Alt toplam ve başlıktaki kalem sayısı, on beş kalemli dönemde bugünkü değerinin
  aynısıdır (sayfalamalı kodun 1. sayfadaki değeriyle de aynı: toplam zaten bütün listedendi).
- **AC-4.** Personel grup satırı kapalıyken tek satır; açılınca çalışan satırları aynı sayfada
  görünür, hiçbiri gizlenmez.
- **AC-5.** Tür süzgeci değiştirilince yalnız süzgece uyan satırlar çizilir, sayfa kavramına bağlı
  bir sıfırlama ya da atlama olmaz.
- **AC-6.** Arama süzgecine hiçbir kaleme uymayan bir metin yazılınca bugünkü boş metin satırı
  ("Filtreye uyan kalem yok.") görünür; **tablo ve alt toplam satırı bugünkü gibi durur**, çubuk
  yoktur (R6/1).
- **AC-7.** Dönem Ay'dan Tarih Aralığı'na çevrilince aralığın bütün kalemleri tek seferde çizilir.
- **AC-8.** On dört tedarikçi varken Tedarikçiler listesi on dört satırı çizer; sayfa çubuğu yok.
- **AC-9.** Tedarikçi listesinin başlığındaki sayı canlı tedarikçi sayısına eşittir (çöptekiler
  sayılmaz, bugünkü kural).
- **AC-10.** Hiç tedarikçi yokken bugünkü boş metin görünür, tablo ve çubuk çizilmez (R6/2).
- **AC-11.** Kasa'nın hareket listesi, çek portföyü, Makina Kârlılığı, Makina ve Model, Açık
  kalemler, Ekstre ve hatırlatma penceresi **hâlâ** sayfalanır: **0062'nin liste tablosundaki**
  on bir çağrı yedi dosyada durur.
- **AC-12.** Kaynak taraması: `DonemRaporu.jsx` ve `Tedarikciler.jsx` sayfalama kancasını, çubuğu
  ve **ikisinin import satırlarını** hiç içermez; aynı iki dosyada **`useFilteredList` de yoktur**
  (0062 R26 kararı, R9/2).
- **AC-13.** Kaynak taraması: aynı iki dosyada elle yazılmış pager yok (sayfa dilimi ya da kendi
  "‹ Önceki" / "Sonraki ›" düğmesi).
- **AC-14.** Aylık Gider ve Kasa Raporu'nun kalem listesi, sayfa boyutunun çok üstünde kalem
  olduğunda da tam basılır (0062 AC-24 aynen geçerli kalır).
- **AC-15.** **1.200 kalemli** bir dönemde (bir yıllık aralığın temsili) liste çizilir ve bir
  süzgeç değişimi uygulanır; süre `performance.now()` ile ölçülür, sayı `console.log` ile basılır
  ve eşiğin altında kalır. Ölçüm jsdom'da yapıldığı için **vekildir** ve bu test adında yazılıdır;
  gerçek gözlem sürüm sonrası elle yapılır (B1).
- **AC-16.** Kalem listesi makina çözümünü bir kez kurar (R10): kaynak taramasında satır başına
  `makinaGideriCoz(` çağrısı yok, `makinaCozucuOlustur` çıktısı `useMemo` ile kurulmuş; çizilen
  atama hücreleri R10 öncesiyle **birebir aynı** (aynı veriyle önce/sonra karşılaştırması).
- **AC-17.** `donemAnahtari` prop'u KalemListesi'ne hiçbir çağrı yerinden geçmez; Giderler'deki
  tanım durur ve Makina ve Model görünümüne geçmeye devam eder. 0067'nin birebir prop metni
  güncellendi ve değişikliğin nedeni o testin yorumunda yazılı (R11).
- **AC-18.** 0071 AC-23'ün çakışma yarısı korunur: hatırlatma kipinden süzgece geçilince kip
  kapanır ve süzgeç uygulanır; sayfa iddiası kalkar.
- **AC-19.** Electron yerleşim ölçümü: 1024 ve 1280 px pencerede, uzun listeli bir dönemde kalem
  tablosunun kabının yatay kayma durumu ölçülür ve sayı Context'e yazılır. Belge düzeyinde taşma
  bugün de yoktur ve olmamaya devam eder (bugünkü `belgeTasma` iddiası korunur).
- **AC-20.** Görüntü aracında `giderler-0062-kalemler-sayfa2` ve
  `giderler-0062-tedarikciler-sayfa2` ekranları yok; yerlerinde on satırın üstünde veriyle iki tam
  liste ekranı var ve ikisinin `kanit-eslemesi.json` kaydı `beklenen: "degisti"` + onay satırıyla
  duruyor.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Hesap içeren iş yok; bu spec gösterim katmanını değiştirir ve bir hesabı (R10) çıktısı
      birebir aynı kalacak şekilde hızlandırır. **Motor, sunucu, izin, veritabanı ve birleştirme
      dosyalarına dokunulmadı** (kaynak taramasıyla gösterildi).
- [x] 0062'nin liste tablosu güncellendi, kalan yedi satır bozulmadı; elle pager yasağı yerinde ve
      `useFilteredList` yasağı iki dosyada sürüyor (AC-12).
- [x] Yeni kalıcı alan yok, yeni veri bölümü yok, yeni izin yok (salt gösterim işi; açıkça yazıldı).
- [x] Ters çevrilen kriterler tek tek listelendi (hangi test, hangi beklenti, neden): **0062** ve
      **0071 AC-23**. **0067 AC-5 / AC-28**'in birebir prop metni güncellendi ve nedeni o testin
      yorumuna yazıldı.
- [x] R10 uygulandı ve çıktı eşitliği aynı veriyle önce/sonra karşılaştırmasıyla gösterildi (AC-16).
- [x] `donemAnahtari` iki çağrı yerinden de düştü, Giderler'deki tanım ve Makina ve Model'e geçişi
      durdu (AC-17).
- [x] Arayüz kriterlerinin görsel kanıtı eklendi: on satırın üstünde veriyle iki liste, boş durum
      ve süzgece uyan satır olmayan durum.
- [x] Görüntü aracındaki iki `-sayfa2` ekranı kaldırıldı, yerine iki tam liste ekranı eklendi
      (AC-20).
- [x] `docs/evidence/kanit-eslemesi.json` kayıtları güncellendi (bilinçli değişim + onay satırı).
- [x] AC-15'in sayısı spec'e yazıldı (jsdom vekil ölçümü); AC-19'un yatay kayma ölçümü yapıldı ve
      sayısı Context'e yazıldı. Sürüm sonrası elle gözlem (B1) SCORECARD'ın ders satırına eklenir.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md`'nin 0062 bölümü "hangi liste sayfalanır" tablosuyla birlikte güncellendi; 0071 ve
      0067 bölümlerine kısmi geri alma notu düşüldü.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | Revizyon 2 (plan onayı, P1–P8): ters çevrilen testlerin yeri, R10 eşitliğinin sınırı (yinelenen kimlik), AC-15 eşiği ölçümden sonra, görüntü aracı ekranları, sözlük istisnası. |
| **Düzeltme turu sayısı** | 1 | Triyaj (2026-10-13), dört bulgu. |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | CLAUDE.md üretilmemiş taban raporuna atıf yapıyordu; üç kriterin (AC-11, AC-14, AC-18) adlı testi yoktu ve planda AC-14'ün yeri yanlıştı; AC-18 testi ön koşulu sınamıyordu; spec başlığı ve README'de altı spec'in durumu eskiydi. Her biri için test eklendi (rapor atfı, AC adı kapsamı, durum satırları). |
| **Regresyon sayısı** | 0 | |
| **Kaçan hata** | 0 | |

**Bu spec'ten çıkarılan ders:**

- Ölçüm aralığına test kütüphanesinin sorgusu girerse ölçülen şey uygulama olmaz: `getByLabelText` 1.200 satırlık DOM'da 10 sn sürdü, uygulamanın süzgeci 0,22 sn.
- Parçalı görüntü çekimi her parçanın raporunu ayrı yazar; birleştirme aracı tek rapor bekler ve rapor yoksa hata vermeden takılır. Araçların sessiz başarısızlıkları (düğme yokken uyarıyla geçen `sayfa2` adımı da öyleydi) ekran adlarını yalan söyletir.
- Belgedeki bir atıf (rapor adı, durum satırı) yazıldığı an bir iddiadır; tarama yoksa iddia eskir. Bu spec üç atıf türünü taramaya bağladı.
- Sürüm sonrası elle gözlem (B1): yapılacak, bir yıllık aralık seçilip sonucu bu satıra eklenecek.
