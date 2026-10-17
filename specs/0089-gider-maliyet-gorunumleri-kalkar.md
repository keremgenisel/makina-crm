# 0089 — Giderler'deki iki maliyet görünümü kalkar

| | |
|---|---|
| **Durum** | Uygulanıyor (revizyon 3, plan onayı 2026-10-17) |
| **Sahip** | Analist (spec) · Geliştirici (uygulama) |
| **Etkilenen alanlar** | Giderler sekmesi (görünüm çubuğu ve iki görünüm), bugünkü maliyet motorunun kapısı, parti değişim kutusunun Makina Maliyeti ekranına taşınması, Dönem Raporu'nun kovalar kutusuna tek uyarı satırı, kilit kapsam listesi, tasarım sözlüğünün iki örneği, kullanıcı rehberinin beş atfı, görsel kanıt ve kanıt eşlemesi |
| **Onaylayan** | Takım Yöneticisi |
| **Bağımlı spec'ler** | 0088 (**önkoşul:** yeni maliyet ekranı çalışır durumda olmalı; bu spec 0088'in X11 ve R24/2 devirlerini cevaplar), 0087, 0002 (bugünkü maliyet, kârlılık ve fiyat önerisi), 0022 (üretim partileri, kapanış anlık görüntüsü ve AC-16), 0072 · 0076 · 0020 (kovaya bağlı kurallar, bu spec'te **değişmez**; ekran kriterleri ters çevrilir), 0082 · 0083 · 0084 (aynı görünüm çubuğunu sabitleyen kriterler), 0062 (sayfalanan liste tablosu), 0067 (kutu düzeni ve kaynak iddiası), 0080 (`donemAnahtari` kriteri), 0081 (katlanan kutular), 0064 (kilit kapsam listesi), 0009 (tasarım sözlüğü ve görsel kanıt kaydı) |
| **Taban** | 0088 kapanışı (`0874b26`) |
| **Revizyon** | · 1 · 2026-10-16 ilk taslak · 2 · 2026-10-17 QA turu: yirmi bir bulgu işlendi. Taslak 0088 öncesi koda göre yazılmıştı; görünüm sayısı dörtten ikiye, motor parti ekranında kalır, 0088'in üç devri cevaplandı, kaldırma yüzeyi ve kanıt listesi yeniden ölçüldü · 3 · 2026-10-17 plan onayı: K1–K8 kararları işlendi (R12 sayımı ve yeri, AC-22 tarama sınırı, AC-28 kanıtı, AC-15 elle deneme, `DONEMSIZ`, C8 yirmi sekiz satır) |

---

## Intent

Giderler ekranında bugün **dört** görünüm var ve ikisi maliyet analizine ait: Makina Kârlılığı ve
Makina ve Model. Üçüncüsü olan Üretim Partileri 0088 ile Makina Maliyeti sekmesine taşındı.
Kullanıcı bu hesabı karmaşık buldu ve yerine 0088'de yeni bir ekran kuruldu. İki hesabın yan yana
durması geçici bir durumdu: aynı soruya iki farklı rakam veren iki ekran kaldığı sürece hangisine
bakılacağı belirsiz ve Giderler ekranı sadeleşmiş olmuyor.

Bu iş o iki görünümü Giderler'den kaldırır. Makina ve model bazlı gider kırılımı ile seri bazında
kârlılık **ekrandan** kalkar, çünkü maliyet sorusunun cevabı artık ürün ağacından geliyor. Gider
kaydının bütünlüğünü söyleyen iki uyarı (bağı kopmuş atama, kapanmış partinin oynayan ortak gideri)
kaybolmaz, yerleri değişir.

Başarı şu: Giderler sekmesinde iki görünüm kalıyor (Dönem Raporu · Tedarikler ve Ekstre), gider
kayıtlarıyla ilgilenen kullanıcı yalnız onları görüyor, maliyetle ilgilenen kullanıcı Makina
Maliyeti sekmesine gidiyor. Hiçbir gider kaydı, hiçbir tutar ve hiçbir izin değişmiyor.

---

## Requirements

- **R1.** Giderler'in görünüm çubuğu **dörtten ikiye** iner: **Dönem Raporu · Tedarikler ve
  Ekstre.** Açılış görünümü Dönem Raporu'dur (bugünkü gibi).
  *Ölçüm:* bugünkü dizi `Giderler.jsx:39`, tek satır, dört öğe.
- **R2.** **Makina Kârlılığı** ve **Makina ve Model** görünümleri Giderler'de çizilmez; bu iki
  görünümün bileşenleri ve yalnız onlara hizmet eden alt bileşenler kaldırılır:
  `gider/MakinaKarliligi.jsx`, `gider/MakinaModelGorunumu.jsx`, `gider/MakinaMaliyetDetay.jsx`
  (içindeki `MaliyetNotlari` dahil), `gider/FiyatOnerisi.jsx`. Giderler'de ölü kalan türevler de
  kalkar (`donemAnahtari`, `Giderler.jsx:111`; tek tüketicisi `MakinaModelGorunumu`).
- **R2/2.** `gider/UretimPartileri.jsx` **kaldırılmaz.** O bileşen 0088 ile Makina Maliyeti
  ekranının Üretim Partileri görünümüdür (`MakinaMaliyeti.jsx:10`, `:47`) ve kilit kapsam listesi
  ile beş test dosyası onu okur. Giderler'den düşmesi 0088'de tamamlandı; burada yalnız sabitlenir.
- **R3.** Bilinmeyen başlangıç görünümü sessizce Dönem Raporu'nu açar (bugünkü kural,
  `gecerliGorunum`); kaldırılan görünüm adıyla açılmaya çalışılırsa hata çıkmaz. *Ölçüm:* bu yolun
  canlı çağıranı yok, genel arama yalnız `rapor` ve `tedarikci` veriyor
  (`GlobalSearch.jsx:157`, `:159`); kural bir regresyon korumasıdır.
- **R4.** **Giderler** bugünkü maliyet motorunu artık almaz ve çağırmaz. Motorun uygulamada tek
  tüketicisi **Makina Maliyeti › Üretim Partileri** görünümü olarak kalır (0088 R24).
  *Neden kesilmiyor:* `UretimPartileri.jsx:39` parti kapanışında `makinaMaliyet?.aylar` ile
  `kapanisOrtaklari` anlık görüntüsünü **yazıyor** (0022 R15); prop kesilirse kapanan parti kalıcı
  olarak kayıtsız kapanır ve tablonun üç sütunu (`:28`, `:75-85`) boşalır.
- **R4/2.** App'teki maliyet memosunun kapısı `giderYetki` yerine **`maliyetYetki`** olur
  (`App.jsx:931`; `maliyetYetki = giderYetki && maliyet sekmesi`, `App.jsx:196`). Böylece maliyet
  sekmesi olmayan gider kullanıcısında ağır hesap hiç çalışmaz. Kapı daralır, genişlemez.
- **R5.** Bugünkü maliyet motorunun dosyası (`src/lib/makinaMaliyeti.js`, 500 satır) ve testleri
  **yerinde kalır**. Dosya "çağıranı olmayan kitaplığa" dönüşmez: beş çağıranı var ve dördü bu
  işten sonra da duruyor (aşağıdaki "Motorun tüketicileri" tablosu). Çağıranı daralan yalnız
  **kârlılık yarısıdır**: `hesaplaMakinaMaliyetleri` (tek çağıran App, R4) ile `karlilikOzeti`,
  `makinaKarlilik`, `fiyatOnerisi` ve onların yardımcıları (`FIYAT_YONTEM`, `sonOnIkiAy`,
  `marjBicim`, `carpanBicim`, maliyet notu sabitleri) ekranda hiç kullanılmaz.
- **R6.** Gider kaydının alanları, gider formu ve doğrulaması değişmez: makina ataması, model
  satırları ve aylara dağıtım alanları yerinde kalır ve bugünkü gibi çalışır.
- **R7.** Dönem Raporu'nun bütün rakamları, kutuları ve kalem listesi değişmez. Raporun makina ve
  model kırılımı üreten alanları motorda kalır, yalnız ekranda gösterilmez (tek istisna R12'nin
  sayı satırı).
- **R8.** Genel arama, çöp kutusu, yedekleme, kilit, sunucu eşlemesi ve izinler açısından hiçbir
  değişiklik yapılmaz; üretim partilerinin bu zincirdeki yeri 0088'de nasıl bırakıldıysa öyle kalır.
- **R9.** Görünüm sırasını ve dört görünümü sabitleyen bugünkü testler ve taramalar iki görünüme
  göre güncellenir; ters çevrilen her kriter **C7'nin tablosundaki** spec numarasıyla test
  yorumunda işaretlenir.
- **R10.** Kaldırılan ekranların görsel kanıt kayıtları ve görüntü aracındaki **on sekiz** ekran adı
  listeden çıkarılır (aşağıdaki "Görsel kanıtın bedeli"); kalan Giderler ekranlarının çubuğu
  değiştiği için yeni kanıt turu alınır.

### Kaybolmayan iki uyarı

- **R11.** "Kapanmış partilerin aylarında değişen ortak gider" kutusu **Makina Maliyeti › Üretim
  Partileri** görünümüne taşınır (bugün `MakinaModelGorunumu.jsx:125`, `testId="parti-degisimleri"`).
  Veri oraya zaten geçiyor (`makinaMaliyet.partiler[].degisimler`), yeni prop gerekmez. Metin,
  başlık ve testId korunur. *Neden taşınıyor:* kutu kalkarsa 0022 R15'in tek yüzeyi yok olur ve
  `kapanisOrtaklari` yazılmaya devam ettiği hâlde hiçbir yerde okunmayan ölü veriye döner.
- **R12.** Bağı kopmuş atamaların **sayısı** Dönem Raporu'nun mevcut "Makina Maliyeti Kovaları"
  kutusuna tek satır olarak girer (`rapor.dusenAtamalar`, bugün `MakinaModelGorunumu.jsx:109-126`
  listeliyor). Sayı sıfırsa satır çizilmez; kalem adı, tutarı ve nedeni yazılmaz, yalnız sayı ve
  kısa açıklama. **Sayı benzersiz kalem sayar** (revizyon 3, K3: iki modeli silinmiş tek kalem
  `dusenAtamalar`'da iki kayıt üretir, `gider.js:1152`; 0021 R14'ten beri ekran sayıları kalem
  sayar). Satır kutunun **gövdesindedir**, başlıkta değil (K4: kutu 0081'den beri kapalı başlar;
  başlığa sayı koymak o kararı dolaylı olarak delerdi). Yeni kutu ve yeni görünüm açılmaz. *Neden:* R6 ve X2 atama alanlarını bilinçle
  yerinde bırakıyor; bağ koptuğunda kullanıcıya söyleyen başka yüzey kalmıyor.
- **R13.** Bugünkü fiyat önerisinin **marj** ve **ekle** yöntemleri ve "son on iki ay" tabanı
  (`sonOnIkiAy`) ekrandan kalkar ve bu **yazılı bir kayıptır**. Yeni ekranın kâr katsayısı
  bugünkü **KAT** yönteminin aynısıdır (0088 R14/2) ve yerinde durur; iki yöntem yeni ekrana
  taşınmaz.

### Birlikte güncellenen üç kayıt

- **R14.** `src/lib/kilitAlanlari.js`'in `KILITSIZ_DOSYALAR` listesinden kaldırılan dört dosyanın
  girdisi (`:66`, `:71`, `:72`, `:73`) çıkarılır. *Neden zorunlu:* `tests/kilit-alanlari.test.js:64`
  listedeki her dosya için `existsSync` arıyor, silinmiş dosya testi kırar.
- **R15.** `docs/tasarim-sozlugu.md:387-388`'in iki örneği (kaldırılan iki dosyanın boş durum ve
  bilgi kutusu örnekleri) güncellenir. *Neden zorunlu:* `tests/tasarim-kaynak.test.js:113` sözlük
  örneklerinin dosya doğruluğunu sınıyor.
- **R16.** Yeni ekranın tarihsiz makina ipucuna (`maliyet/PayOzeti.jsx:36`) eski ekranın düzeltme
  cümlesi eklenir ("Makina düzenleme formundan girilebilir"). *Neden:* tarihsiz makina sayısı yeni
  ekranda var, kaybolan yalnız nasıl düzeltileceği.

---

## Constraints

### Uyulması zorunlu

- **C1.** 0088 **önkoşuldur** ve yeni ekranın rakamı gerçek veride görülmüş olmalıdır. Bu spec
  geri dönüşü olan bir iştir ama eski ekranlar kalktıktan sonra karşılaştırma yapılamaz.
- **C2.** Hiçbir kalıcı alan kaldırılmaz, hiçbir tablo düşürülmez, hiçbir veri silinmez.
  Kaldırılan yalnız çizim ve hesabın bir tüketicisidir (0082'nin dersi: yarım kaldırma veri kaybına
  yol açar, bu yüzden burada veri tarafına hiç dokunulmaz).
- **C3.** Kovaya bağlı kurallar **değişmez**: 0076'nın indirilemeyen KDV'sinin kovayı izlemesi,
  0072'nin aylara dağıtımı, 0020'nin personel ataması ve 0022'nin parti payları olduğu gibi kalır.
  Bunlar gider kaydının alanlarıdır, ekranın değil.
- **C4.** Dönem Raporu'nun **rapor nesnesi** birebir korunur ve bu bir kıyas fikstürüyle ölçülür;
  mevcut kutuların **rakamları** da birebir korunur. **Tek istisna R12'nin sayı satırıdır** ve
  fikstür bu istisnayı bilerek taşır. (Kriter daraltılmadan kalsaydı kıyas fikstürü, kabul edilmiş
  bir kararı sessizce reddederdi.)
- **C5.** Aylık Gider ve Kasa Raporu (yazdırma) değişmez; o rapor maliyet motorunu okumuyor.
- **C6.** Görünüm sırası tek yerde tanımlı kalır (bugün `Giderler.jsx:39`, tek satırlık dizi) ve
  tasarım sözlüğünün sekme çubuğu kuralı korunur.
- **C7.** **Ters çevrilen kriterler tabloyla yazılır** ve her biri test yorumunda "spec 0089 ile"
  notunu taşır. Kapsam: 0002, 0020, 0022, 0062, 0067, 0072, 0076, 0080, 0081, 0082, 0083, 0084 ve
  **0088** (R24, R24/2, R23/4, AC-37); tablo on yedi satırdır. 0088 bir gün önce kapandığı için
  izin bırakılması ayrıca önemlidir.
- **C8.** Kaldırma ile kırılan bütün yerler **önceden** ölçülür ve aşağıdaki tabloya yazılır (yirmi
  sekiz satır; yirmi altısı elden geçer, ikisi bilerek dokunulmaz; revizyon 3 ile
  `tests/tasarim-kaynak.test.js:113` eklendi); geliştirici bu listeyi `npm test`
  kırmızısıyla keşfetmez (0083 ve 0088'in dersi).
- **C9.** Görüntü aracında **ad çakışması tuzağı** vardır: kaldırılacak dört ekranın adı
  `maliyet-detay-*` ile başlıyor ve eski detay bileşenini çiziyor; 0088'in yeni ekranının adları da
  `maliyet-*` ile başlıyor. Ön ekle toplu silme yeni ekranın bütün kanıt kayıtlarını siler.
- **C10.** R4'ün kaynak taraması **`src/` ile sınırlıdır**. `scripts/` altındaki iki çağrı gerekçeli
  istisnadır ve yerinde kalır: `scripts/tests/0088-kiyas-fikstur.mjs:5` (0088'in AC-42 kıyas
  fikstürünü üretir) ve `scripts/evidence/0009-sayfa.jsx:28` (0088'in parti ekranının kanıt
  düzeneği). 0085'in üç düzenek istisnası emsaldir.

### KAPSAM DIŞI

- **X1.** Maliyet motorunun **kârlılık yarısının** (`hesaplaMakinaMaliyetleri`, `karlilikOzeti`,
  `makinaKarlilik`, `fiyatOnerisi`) ve testlerinin silinmesi — *neden:* R5. Yeni hesap gerçek
  veride bir sürüm boyunca izlendikten sonra ayrı küçük işte ele alınır. Tersi yapılırsa eski
  rakama bakma yolu kalmaz. **Dosyanın tamamı hiçbir zaman silinemez** (R5'in beş çağıranı).
- **X2.** Gider formundaki atama alanlarının (makina ataması, model satırları, dağıtım ayı)
  kaldırılması ve gider formunun sadeleştirilmesi — *neden:* C3'teki dört kural bu alanları
  okuyor; kaldırmak altı motoru ve bütün çapraz testleri elden geçirmek demek, ayrıca kullanıcı
  bunu istemedi. İstenirse ayrı spec.
- **X3.** Kullanıcı rehberinin **0080-0083 borcunun** kapatılması — *neden:* rehber o spec'lerden
  beri zaten eski (README'deki açık bulgu) ve üç spec'in farkını bu işe yüklemek kapsamı bozar.
  **Dar istisna:** bu işin kaldırdığı ekranların beş atfı (`docs/rehber/gider-kasa-rehberi.html`,
  "Makina Kârlılığı" dört yerde, "Üretim Partileri" bir yerde) düzeltilir ve PDF yeniden üretilir
  (`scripts/rehber-pdf.cjs`), çünkü rehber bu hafta yazıldı ve kullanıcıya dağıtılmak üzere duruyor.
- **X4.** Giderler görünüm çubuğunun yeniden adlandırılması ya da **yeni görünüm** eklenmesi —
  *neden:* bu iş yalnız kaldırma işidir. R11 ve R12 yeni görünüm değildir: biri var olan kutunun
  taşınması, öteki var olan kutunun içine tek satır.
- **X5.** Makina (seri) bazında maliyet ve kârlılığın yeni ekrana taşınması — *neden:* 0088'in
  birimi model ve parti (0088 X5). Seri bazında maliyet bu işle **ekrandan kalkar**; geri
  istenirse ayrı spec ve yeni modelle yeniden tanımlanır.
- **X6.** Makina Maliyeti › Üretim Partileri tablosundaki **üç sütunun** (Makina · Ortak gider
  havuzu · Makina başı pay) yeni motorun rakamlarıyla değişmesi — *neden:* 0088 X11 bunu 0089'a
  devretti, ama R4 ile eski motor yerinde durduğu için sütunlar bugünkü rakamı göstermeye devam
  eder ve bir şey bozulmaz. Yeni motora geçirmek parti bazında standart maliyetin tanımını
  (0088'in Parti Hesabı görünümü) tabloya taşımak demek, yani ayrı iş.

---

## Context

### Kaldırılacak yüzey (yeniden ölçüldü, 2026-10-17)

| Dosya | Satır | Ne yapıyor |
|---|---|---|
| `src/components/gider/MakinaKarliligi.jsx` | 117 | seri bazında maliyet ve kâr listesi, dönem özeti satırları, fiyat önerisi kabı |
| `src/components/gider/MakinaMaliyetDetay.jsx` | 95 | bir makinanın maliyet dökümü ve `MaliyetNotlari` |
| `src/components/gider/FiyatOnerisi.jsx` | 53 | marj/ekle/kat yöntemiyle fiyat önerisi |
| `src/components/gider/MakinaModelGorunumu.jsx` | 137 | dört kova kartı, makina ve model kırılımı, dağıtım kutusu, düşen atamalar, parti değişim kutusu |
| `src/components/gider/UretimPartileri.jsx` | 129 | **kalır** (R2/2): 0088 ile Makina Maliyeti ekranının görünümü |

Giderler'in kaybettiği prop: `makinaMaliyet` (`Giderler.jsx:53`, kullanıldığı yerler `:405-406` ve
`:412-413`). `uretimPartileri` ve `setUretimPartileri` **bugün de verilmiyor** (0088 ile düştü).
`satisVerisi`, `standardModels`, `customModels` ve `rates` **kalır**: ilki ve `rates` KDV
karşılaştırmasını (`:133-134`), diğerleri gider kaleminin model satırlarını ve canlı model kümesini
besliyor (`:90-91`, `:345`, `:382`).

### Motorun tüketicileri (ölçüldü)

| Çağıran | Ne alıyor | Bu işten sonra |
|---|---|---|
| `src/App.jsx:9`, `:931` | `hesaplaMakinaMaliyetleri` | **kalır**, kapısı `maliyetYetki` olur (R4/2); tek tüketicisi Makina Maliyeti › Üretim Partileri |
| `src/lib/makinaStandartMaliyet.js:12` | `makinaListesi`, `satisKurBilgisi`, `katDegeriDogrula` | kalır (0088'in motoru) |
| `src/components/Customers.jsx:14` | `donenStokUretimTarihi` | kalır |
| `src/components/stock/MakinaStokTab.jsx:11` | `geriDonenStokMu`, `geriDonenStokTarihi` | kalır |
| `src/components/gider/MakinaKarliligi.jsx:3`, `MakinaMaliyetDetay.jsx:5`, `FiyatOnerisi.jsx:3` | `karlilikOzeti`, `makinaKarlilik`, `fiyatOnerisi`, notlar, biçimleyiciler | **kalkar** (dosyalar siliniyor) |

Yani kaldırmanın yan faydası ağır hesabın (500 satırlık motor, bütün gider kayıtları × bütün
makinalar) gider kullanıcısında hiç çalışmaması; maliyet sekmesi olan kullanıcıda parti kapanışı
için çalışmaya devam eder.

### Kaldırma ile kırılan yerler (ölçüldü, C8)

| Yer | Neden dokunulacak |
|---|---|
| `tests/ui/makina-karliligi.test.jsx` (163 satır) | kaldırılan ekranın testi, silinir |
| `tests/yerlesim-0083.test.js:15` | `ETIKETLER` dizisi dört etiket, ikiye iner |
| `tests/ui/yerlesim-0083.test.jsx:37-67` | çubuk sırası ve görünüm geçişleri |
| `tests/ui/standart-kalkar-0082.test.jsx:14-15` | AC-1/AC-2 çubuk sırası **ve** iki import (`MaliyetNotlari`, `MakinaKarliligi`) |
| `scripts/tests/donem-raporu-yerlesim.cjs:84` (Electron) | "görünüm çubuğu dört sekme" iddiası; `:89-90` aynı turda 0084'ün üç düğmesini ölçüyor |
| `tests/ui/uretim-partisi.test.jsx` (210 satır) | ekranın yeni yeri 0088'de güncellendi; burada Giderler kolları düşer |
| `tests/gider-dagitim-0072.test.js:202` | kaldırılan iki dosyanın kaynağını tarıyor (**taslak bu dosyayı "dokunulmaz" sayıyordu, yanlıştı**) |
| `tests/ui/gider-dagitim-0072.test.jsx:9-11` | `MakinaMaliyetDetay`, `MakinaKarliligi`, `DAGITIM_KUTU_IBARESI` |
| `tests/ui/personel-atama.test.jsx:7-10` | 0020 AC-9/AC-15: kaldırılan üç ekranda `kalemGorunenAd` gizliliği |
| `tests/ui/kisitli-gider-0076.test.jsx:14` | `MaliyetNotlari` ve `KISITLI_NOTU` |
| `tests/ui/kutu-duzeni-0067.test.jsx:146` | App memosunu `giderYetki ?` ile sabitliyor; R4/2 ile `maliyetYetki` olur |
| `tests/ui/kutu-duzeni-0067.test.jsx:148` | `makinaMaliyet={makinaMaliyet}` sayısı iki; bu işten sonra **bir** |
| `tests/ui/kutu-duzeni-0067.test.jsx:150` | `MakinaKarliligi.jsx`'in kaynak satırını iddia ediyor |
| `tests/ui/kutu-duzeni-0067.test.jsx:155-156` | görüntü aracında üç `maliyet-detay-*` adının **bulunmasını** istiyor; R10 onları düşürüyor |
| `tests/ui/kutular-kapali-0081.test.jsx:140` | 0081 AC-14/R11: Makina ve Model'in kova kartları katlanmaz |
| `tests/ui/stopaj-donemi-0084.test.jsx:38` | görünümleri gezerek stopaj düğmesinin yalnız raporda olduğunu ölçüyor |
| `tests/sayfalama-0062.test.js:68-69` | `LISTELER` "yedi dosya, on bir çağrı" → **beş dosya, dokuz çağrı** |
| `tests/ui/sayfalama-0062.test.jsx:9-10` | iki listenin sayfalama testi |
| `tests/sayfalama-kalkar-0080.test.js:35` | 0080 AC-17: `donemAnahtari` Makina ve Model'e geçer |
| `tests/ui/gider-perdesi.test.jsx:75` | görünüm adlarını geziyor |
| `src/lib/kilitAlanlari.js:66,71,72,73` | R14; `tests/kilit-alanlari.test.js:64` `existsSync` ile kırar |
| `docs/tasarim-sozlugu.md:387-388` | R15; `tests/tasarim-kaynak.test.js:113` sınıyor |
| `tests/tasarim-kaynak.test.js:113` | beklenen örnek listesi `MakinaMaliyetDetay.jsx` ve `MakinaKarliligi.jsx` adlarını taşıyor; R15 ile birlikte güncellenir (revizyon 3) |
| `scripts/evidence/0009-sayfa.jsx:29` | `MakinaMaliyetDetay` import'u ve on sekiz ekran adı (R10) |
| `docs/evidence/kanit-eslemesi.json` | kaldırılan dosyaların **üç** kaydı: `:3345` FiyatOnerisi, `:3799` MakinaKarliligi, `:3900` MakinaModelGorunumu (`MakinaMaliyetDetay`'ın kaydı yok, o dosya tasarım sözlüğünü kullanmıyor) |
| `tests/gider-gizlilik.test.js:42` | yorumu ("Maliyet yalnız ekranda MakinaMaliyetDetay çizilir") yanlış olur; **tarama gevşetilmez** |
| `tests/makina-maliyeti.test.js` (457), `tests/uretim-partisi.test.js` (223) | **dokunulmaz** (R5: motor yerinde, testleri yeşil kalır) |
| `tests/ui/kutu-duzeni-0067.test.jsx:131` | **dokunulmaz** (0067 AC-10/AC-27 motorun rakamlarını ölçüyor, motor yerinde) |

### Ters çevrilen kriterler (C7)

| Spec | Kriter | Bu işten sonra |
|---|---|---|
| 0002 | R7, R26, AC-8: seri bazında kârlılık ve maliyet detayı ekranı | ekrandan kalkar (X5) |
| 0020 | AC-9, AC-15: kaldırılan ekranlarda personel adının basılmaması | ekranlar yok, gizlilik taramaları yerinde kalır |
| 0022 | AC-11: parti değişim kutusu Giderler'de | Makina Maliyeti'ne taşınır (R11) |
| 0022 | AC-16: "stokta taşınan maliyet" ve parti kırılımı | kalkar (Ö envanteri) |
| 0062 | R11, R12: dokuz sayfalanan liste | yedi liste, beş dosya, dokuz çağrı |
| 0067 | AC-18, AC-19, AC-20, AC-21, AC-34: App memosunun kapısı, prop sayısı ve `MakinaKarliligi.jsx`'in kaynak satırı | kapı `maliyetYetki`, prop sayısı bir, dosya yok |
| 0067 | AC-11, AC-12, AC-32: üç `maliyet-detay-*` adı araçta bulunmalı | adlar düşer (R10) |
| 0072 | R16, AC-18/30/38: "Bu dönemde makina maliyetine giren ortak gider" kutusu | kalkar |
| 0076 | `MaliyetNotlari`'ndaki `KISITLI_NOTU` | kalkar, kova kuralı aynen |
| 0080 | AC-17: `donemAnahtari` Makina ve Model'e geçer | `donemAnahtari` kalkar |
| 0081 | AC-14, R11: Makina ve Model'in kova kartları | görünüm yok |
| 0082 | AC-1, AC-2: çubuk sırası | iki düğme |
| 0083 | AC-1: beş (0088 ile dört) etiket tek dizide | iki etiket |
| 0084 | AC-38: görünümleri gezen stopaj düğmesi ölçümü | iki görünüm |
| 0088 | R24, AC-37: parti tablosunun üç sütunu ve prop | prop kalır (R4), sütunlar X6 ile bugünkü rakamda |
| 0088 | R24/2: kutu Giderler'de durur | taşınır (R11) |
| 0088 | R23/4: `giderler-model-parti-degisim` yerinde kalır | kanıt adı düşer (R10) |

### Kaybolan yüzeyin envanteri (bilinçli kayıp)

| Kalkan | Kaynak | Karşılığı |
|---|---|---|
| Seri bazında maliyet, kâr, marj, çarpan tablosu ve satır detayı | `MakinaKarliligi`, `MakinaMaliyetDetay` | yok (X5) |
| Stoktaki makinaların taşıdığı maliyet ve parti kırılımı | `MakinaKarliligi.jsx:80-91` | yok (0022 AC-16 ters çevrilir) |
| Satış bedeli girilmemiş makinalar, kuru hesaplanamayan satışlar | `:92-93` | Parti Hesabı'nın kırılım satırı (`PartiHesabi.jsx:101`) kısmen karşılar |
| Yürürlük öncesi üretim sayısı | `:95` | yok |
| Üretim tarihi bilinmeyen makina sayısı | `:96` | yeni ekranda var (`PayOzeti.jsx:36`), düzeltme cümlesi R16 ile eklenir |
| Dağıtılmamış ortak gider (ay bazlı) | `:97-98` | yok; yeni modelde kavram yok (havuz ÷ varsayılan adet) |
| Model başına yüklenmemiş malzeme gideri ve pay alamamış makina sayısı | `:99-103` | yok (eski model havuzunun kendi sınırı) |
| Marj ve ekle fiyat yöntemleri, son on iki ay tabanı | `FiyatOnerisi` | yalnız KAT, yeni ekranın katsayısı (R13) |
| Makinaya ve modele atanmış kalem listeleri, kısmi dağıtım notu, "dağıtılmasın" listesi | `MakinaModelGorunumu` | yok; tutarlar Dönem Raporu'nun kova kartlarında toplam olarak kalır |
| Dört kova kartı | `MakinaModelGorunumu:57-62` | **kaybolmuyor**, aynısı Dönem Raporu'nda (`DonemRaporu.jsx:39-49`) |
| Düşen atamaların listesi | `:109-126` | sayısı kovalar kutusunda (R12) |
| Parti değişim kutusu | `:125` | taşınır (R11) |

### Görsel kanıtın bedeli

Görünüm çubuğu her Giderler ekranının üstünde olduğu için 0083'te olduğu gibi kabaca **120 ekran**
bilinçli değişir (ölçülmemiş tahmin, 0083 emsali). Görüntü aracından düşecek **on sekiz** ad
(`scripts/evidence/0009-sayfa.jsx`): `giderler-model` (:634), `giderler-karlilik` (:635),
`giderler-model-personel` (:728), `maliyet-detay-personel` (:729), `giderler-karlilik-parti` (:766),
`giderler-model-parti-degisim` (:767), `maliyet-detay-parti-acik` (:768),
`maliyet-detay-parti-kapali` (:769), `giderler-0072-model` (:894), `giderler-0072-karlilik` (:895),
`giderler-0072-detay` (:896), `giderler-0062-karlilik` (:956), `giderler-0062-karlilik-sayfa2`
(:957), `giderler-0062-makina-model` (:958), `giderler-0062-makina-model-sayfa2` (:959),
`giderler-0076-karlilik` (:1097), `maliyet-detay-0076` (:1098) ve `giderler-0068-parti-sil` (:979).

Son ad **bugün zaten yanlış ekranı çekiyor**: adımı "Üretim Partileri" düğmesini arıyor, Giderler'de
o görünüm 0088 ile kalktı ve araç bulunamayan adımda yalnız `console.warn` yazıp devam ediyor
(`:1136` sonrası). Yani 0088'den beri o adın "0 fark" raporu sahtedir; bu işte düşer. Ders 0081'in
dersiyle aynı sınıf: **bulunamayan adım sessizce yanlış ekranı ölçer.** C9'un ad çakışması tuzağı
da burada: dört `maliyet-detay-*` adı eski detay bileşenine ait, 0088'in `maliyet-modeller`,
`maliyet-parti`, `maliyet-ayarlar`, `maliyet-uretim-partileri` adları **kalır**.

### Bulgular (öneri kuralı 5)

- **B1. Motor silinsin mi, kalsın mı?** *Önerim:* kalsın (R5, X1). *Gerekçe:* dosyanın beş çağıranı
  var ve dördü bu işten sonra da duruyor; silinebilecek olan yalnız kârlılık yarısıdır ve yeni hesap
  gerçek veride tutmazsa eski rakama bakmanın tek yolu o. *Maliyeti:* ekranda kullanılmayan yedi
  dışa verme ve yeşil kalan testler. *Reddedilen seçenek:* aynı işte silmek, geri dönüşü olmayan
  yol ve kanıt turunu iki katına çıkarır.
- **B2. Seri bazında kârlılık ve on bir satır kayboluyor.** Bu, bu işin bilinçli bedeli: "hangi
  makina bize kaça mal oldu ve ne kâr bıraktı" sorusu ekranda kalmıyor (0088'in birimi model ve
  parti). Tam envanter yukarıdaki tabloda. *Önerim:* kayıp yazılı kalsın, sürüm notunda adlarıyla
  sayılsın ve bir sürüm boyunca izlenelim; kullanıcı arar, yeni modelle (ürün ağacı artı o
  makinanın partisi) yeniden tanımlanır. *Gerekçe:* eski hesabın seri bazlı rakamı gider atamasına
  dayanıyordu, yani zaten kullanılmayan girdinin ürünüydü.
- **B3. İki görünüm kalınca çubuk gerekli mi?** *Önerim:* evet, kalsın. *Gerekçe:* tasarım
  sözlüğünün sekme çubuğu kuralı iki sekmede de aynı bileşeni istiyor; çubuğu kaldırmak Dönem
  Raporu ile Tedarikler ve Ekstre arasında gezinmeyi başka bir desene taşır.
- **B4. Taslak 0088 öncesi koda göre yazılmıştı.** Ölçüm: `GORUNUMLER` dört öğe, `uretimPartileri`
  prop'u Giderler'de yok, `UretimPartileri.jsx` yeni ekranın bileşeni, beş satır atfı bir satır
  kaymış. Taslağın R2'si harfi harfine uygulansa 0088'in ekranı çökerdi. *Karşılığı:* R1, R2, R2/2,
  AC-3, AC-5, AC-7 ve bütün satır atıfları yeniden yazıldı.
- **B5. "Motor hiçbir yerde çalışmaz" hedefi parti kapanışıyla çelişiyor.** Ölçüm:
  `UretimPartileri.jsx:39` kapanışta `makinaMaliyet?.aylar` ile `kapanisOrtaklari`'nı yazıyor;
  prop kesilirse `kapanisAnlikGoruntusu` boş nesne döner ve parti kalıcı olarak kayıtsız kapanır.
  *Karşılığı:* R4 daraltıldı, R4/2 ile kapı `maliyetYetki` oldu; hedefin asıl kazancı (gider
  kullanıcısında hesabın hiç çalışmaması) böylece gerçekten ölçülebilir (AC-8, AC-21).
- **B6. 0088'in üç devri taslakta yoktu.** 0088 X11 (üç sütun ve iki fiyat yöntemi), R24/2 (parti
  değişim kutusunun geleceği), R23/4 (kanıt adı). *Karşılığı:* sırayla X6, R13, R11 ve R10.

### Karar kaydı (QA turu 2026-10-17)

| No | Bulgu | Karar |
|---|---|---|
| B-1 | R1/R2 0088 öncesi koda yazılmış | Dörtten ikiye; iki görünüm, üç alt bileşen; `UretimPartileri.jsx` kalır (R1, R2, R2/2, AC-3, AC-5, AC-7) |
| B-2 | R4 motoru tamamen kapatıyor | Giderler almaz, tek tüketici parti görünümü; memo kapısı `maliyetYetki` (R4, R4/2, AC-6, AC-8) |
| B-3 | 0088'in üç devri yok | X6 (sütunlar), R13 (marj/ekle kaybı), R11 (kutu taşınır), R10 (kanıt adı) |
| B-4 | Kaldırma yüzeyi ölçülmemiş | C8'in tablosu (yirmi yedi satır) ve C7'nin ters çevrilen kriter tablosu (on yedi satır) |
| B-5 | Düşen atama uyarısı kayboluyor | Sayı, kovalar kutusuna tek satır (R12, AC-13) |
| Ö-6 | R5/X1/B1'in dayanağı yanlış | Beş çağıran tablosu; silinebilen yalnız kârlılık yarısı (R5, X1, B1) |
| Ö-7 | Kayıp envanteri eksik | On iki satırlık envanter tablosu (on biri kayıp, biri korunan kova kartları); sürüm notu adlarıyla sayar (B2, AC-22) |
| Ö-8 | AC-8 ile R12 çelişiyor | C4 daraltıldı: nesne ve mevcut rakamlar birebir, R12 açık istisna (AC-9) |
| Ö-9 | AC-17 ile AC-9 çelişiyor | AC-21 "makina ve model başına maliyet ve kâr rakamı" diye daraldı; kova kutusu adıyla kalır |
| Ö-10 | `donemAnahtari` ölü kalıyor | R2'ye girdi; 0080 C7 tablosunda (AC-7) |
| Ö-11 | Kanıt bedeli dokuz değil on sekiz | Tam liste, `giderler-0068-parti-sil`'in bayat olduğu ve C9'un ad tuzağı yazıldı |
| Ö-12 | Rehber ilk günden yanlışa düşüyor | X3 daraltıldı: beş atıf ve PDF bu işte (AC-28) |
| Ö-13 | AC-6'nın tarama sınırı tanımsız | C10: tarama `src/`, iki `scripts/` çağrısı gerekçeli istisna |
| Ö-14 | 0088'in kriterleri sayılmamış | C7 tablosunda dört satır |
| K-15 | Satır atıfları kaymış | `:39`, `:53`, `:405-413`, `:90-91`, `:345`, `:382`, `App.jsx:931`/`:1708`, kanıt kayıtları üç tane |
| K-16 | Sayılar | Motor 500, parti testi 210; "939 satırlık test" iddiası düştü; 120 ekran "tahmin" diye yazıldı |
| K-17 | Rapor motoru boşa hesaplıyor | Bilinen sınır olarak yazıldı; C4'ün fikstürü varken alan çıkarılmaz |
| K-18 | Gizlilik testinin yorumu | Yorum güncellenir, tarama gevşetilmez (C8 tablosu) |
| K-19 | AC-19'un ölçüm yeri yazılmamış | `donem-raporu-yerlesim.cjs:84` ve `:89-90` atıflarıyla (AC-25) |
| K-20 | AC-4'ün canlı çağıranı yok | R3'e "regresyon koruması, kullanıcı yolu değil" notu |
| K-21 | Kanıt onayı ve sürüm notu biçimi | DoD'ye onay dizesi biçimi ve kayıp envanterine atıf |

### Karar kaydı (plan onayı 2026-10-17, revizyon 3)

| No | Konu | Karar |
|---|---|---|
| K1 | Rehber analistin dosyası, kalıcı kural dokunmamayı söylüyor | Geliştirici beş atfı düzeltir, PDF'i üretir, commitlemez; AC-28 el ölçümü |
| K2 | AC-22 "kaynakta yoktur" R5 ile çelişiyor | Tarama `src/components` ile sınırlı |
| K3 | R12 neyi sayar | Benzersiz kalem |
| K4 | R12 satırı kapalı kutuda görünmüyor | Gövdede kalır; test kutuyu açarak ölçer |
| K5 | AC-9'un kutu rakamları | Taban koddan üretilmiş kutu metinleri fikstürü, sayı satırı bilinen tek fark |
| K6 | AC-8'in kanıtı | Gerçek App'te motor casusu + kaynak taraması |
| K7 | AC-15 elle deneme ile gerçek veri kuralı | Gerçek verinin kopyasıyla |
| K8 | `DONEMSIZ` boş küme | Dokunulmaz (0088 AC-42/2 sabitliyor) |
| K9 | Bulunamayan kanıt adımı sessizce geçiyor | Bilinen borç olarak planda; bu işin kapsamı dışında |
| K10 | Parti değişim kutusu yalnız maliyet sekmeli kullanıcıda | Kabul; sürüm notunda söylenir |

---

## Acceptance Criteria

- **AC-1.** Giderler'in görünüm çubuğunda iki düğme vardır: Dönem Raporu ve Tedarikler ve Ekstre;
  bu sırayla.
- **AC-2.** Giderler açıldığında Dönem Raporu çizilir.
- **AC-3.** Çubukta "Makina Kârlılığı" ve "Makina ve Model" yazısı hiçbir kipte görünmez; "Üretim
  Partileri" de görünmez (0088 ile taşındı, burada yalnız sabitlenir).
- **AC-4.** Başlangıç görünümü olarak kaldırılmış bir ad verilirse Dönem Raporu çizilir ve hata
  çıkmaz (regresyon koruması; bugün bu adı veren canlı çağıran yok).
- **AC-5.** Kaynak taraması: `MakinaKarliligi`, `MakinaModelGorunumu`, `MakinaMaliyetDetay`
  (`MaliyetNotlari` dahil) ve `FiyatOnerisi` kaynakta yoktur ve hiçbir yerden içe aktarılmaz;
  `gider/UretimPartileri.jsx` yerinde durur ve Makina Maliyeti ekranından içe aktarılır.
- **AC-6.** Kaynak taraması (`src/`): `hesaplaMakinaMaliyetleri` yalnız `App.jsx`'te çağrılır;
  `karlilikOzeti`, `makinaKarlilik` ve `fiyatOnerisi` hiç çağrılmaz. Motorun dosyası ve testleri
  yerinde durur; `scripts/` altındaki iki çağrı C10'un gerekçeli istisnasıdır.
- **AC-7.** Giderler bileşeni `makinaMaliyet` prop'unu almaz ve `donemAnahtari` kaynakta yoktur.
- **AC-8.** App'in maliyet memosu `maliyetYetki` ile kapılıdır: gider sekmesi olan ama Makina
  Maliyeti sekmesi olmayan kullanıcıda `hesaplaMakinaMaliyetleri` hiç çalışmaz.
- **AC-9.** Dönem Raporu'nun rapor nesnesi ve mevcut kutularının rakamları bu spec öncesiyle birebir
  aynıdır (kıyas fikstürü); tek fark AC-13'ün satırıdır ve fikstür onu bilerek taşır.
- **AC-10.** Dönem Raporu'nun beş yan kutusu, kalem listesi, borç özeti ve özet kartları bugünkü gibi
  çalışır (kapalı başlama, açılma, süzgeçler).
- **AC-11.** Tedarikler ve Ekstre görünümü, tedarikçi formu, ekstre penceresi ve silme akışı
  değişmemiştir.
- **AC-12.** Gider formu değişmemiştir: makina ataması, model satırları ve aylara dağıtım alanları
  bugünkü gibi çizilir, doğrulanır ve kaydedilir.
- **AC-13.** Bağı kopmuş atama varsa Dönem Raporu'nun "Makina Maliyeti Kovaları" kutusunda sayıyı
  söyleyen tek satır çizilir; sayı sıfırsa satır yoktur. Kalem adı, tutarı ve nedeni yazılmaz.
- **AC-14.** "Kapanmış partilerin aylarında değişen ortak gider" kutusu Makina Maliyeti › Üretim
  Partileri görünümünde çizilir (`testId="parti-degisimleri"`, metin ve başlık aynı) ve Giderler'de
  hiçbir kipte görünmez.
- **AC-15.** Parti kapatma bugünkü gibi çalışır: `kapanisOrtaklari` dolu yazılır, tablonun üç sütunu
  ve "Açık · geçici" rozeti bugünkü rakamları gösterir.
- **AC-16.** Kısıtlı (binek araç) kalemin indirilemeyen KDV'si bugünkü kovaya girer ve rapor
  rakamları değişmez.
- **AC-17.** Aylara dağıtılmış kalemin dönem raporundaki tam tutarı ve rozeti değişmez.
- **AC-18.** Aylık Gider ve Kasa Raporu çıktısı bu spec öncesiyle birebir aynıdır.
- **AC-19.** Üretim partisi kaydı, kilidi, çöp kutusu satırı, genel arama sonucu ve yedek paketi
  bugünkü gibi çalışır (yönetim ekranı Makina Maliyeti sekmesindedir).
- **AC-20.** Sunucu bölüm eşlemeleri, izin kimlikleri ve birleştirme kuralları değişmemiştir;
  gider kullanıcısının yazımları bugünkü izinlerle geçer.
- **AC-21.** Gider sekmesi olan ama Makina Maliyeti sekmesi olmayan kullanıcı Giderler'i iki
  görünümle görür ve **bugünkü maliyet modelinin makina ya da model başına maliyet, kâr ve marj
  rakamına** hiçbir yerden ulaşamaz. "Makina Maliyeti Kovaları" kutusu bu rakam değildir, gider
  kaydının kendi kırılımıdır ve adıyla kalır.
- **AC-22.** Fiyat önerisinin marj ve ekle yöntemleri **ekran kaynağında (`src/components`)** yoktur
  (revizyon 3, K2: `makinaMaliyeti.js` R5 ve X1 gereği yerinde kalır, tarama onu kapsamaz); yeni ekranın kâr katsayısı
  (KAT) ve doğrulaması bugünkü gibi çalışır.
- **AC-23.** `kilitAlanlari.js`'de kaldırılan dört dosyanın girdisi yoktur ve kilit kapsam testi
  yeşildir.
- **AC-24.** Tasarım sözlüğünün kaldırılan dosyalara yapan iki atfı güncellenmiştir ve sözlük
  kaynak testi yeşildir.
- **AC-25.** Electron yerleşim testi: iki düğmeli çubuk 1280 ve 1024 piksel genişlikte tek satırda
  durur ve pencereden taşmaz; aynı turda ölçülen stopaj düğmesi ve kutu sırası iddiaları günceldir
  (`scripts/tests/donem-raporu-yerlesim.cjs:84`, `:89-90`).
- **AC-26.** Sayfalanan liste tablosu beş dosya ve dokuz çağrıdır; elle yazılmış pager yasağı
  yerinde.
- **AC-27.** Yeni ekranın tarihsiz makina ipucu üretim tarihinin nereden girileceğini söyler.
- **AC-28.** Rehberin kaldırılan ekranlara yapan beş atfı düzeltilmiş ve PDF yeniden üretilmiştir.
  Rehber analistin dosyasıdır ve git'te izlenmez: geliştirici düzeltir ve PDF'i üretir ama
  **commitlemez**; kanıt depo testi değil el ölçümüdür (grep çıktısı ve PDF tarihi plana yazılır;
  revizyon 3, K1).
- **AC-29.** Görsel kanıt: Giderler'in kalan ekranlarının çubuğu iki düğmeli; kaldırılan on sekiz
  ekran adı ve üç kanıt kaydı listede yoktur, 0088'in `maliyet-*` adları yerindedir.
- **AC-30.** Kaldırılan ekranların testleri silinmiş, görünüm sırasını sabitleyen testler iki
  görünüme göre güncellenmiştir; C7'de sayılan her kriter test yorumunda bu spec numarasıyla
  işaretlidir.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hiçbir kalıcı alan, tablo ya da veri kaldırılmadı; bu açıkça yazıldı (C2).
- [ ] Dönem Raporu ve Aylık Gider ve Kasa Raporu'nun değişmediği kıyas fikstürüyle ölçüldü
      (AC-9, AC-18); fikstür R12'nin satırını bilinen tek fark olarak taşıyor.
- [ ] Motorun Giderler'de çağrılmadığı ve kapısının `maliyetYetki` olduğu kaynak taramasıyla
      sabitlendi; motorun kendi testleri dokunulmadan yeşil (AC-6, AC-8).
- [ ] Parti kapanışı gerçek verinin **kopyasıyla** denendi (geçici `userData`; gerçek klasöre
      yazılmaz, revizyon 3, K7): `kapanisOrtaklari` dolu yazıldı ve üç sütun rakam
      gösterdi (AC-15). **Bu adım atlanırsa 0022 R15'in sessiz kaybı ölçülmemiş olur.**
- [ ] C8 tablosundaki yirmi altı yerin hepsi elden geçti (iki satır bilerek dokunulmaz); C7'deki on yedi kriterin ters çevrildiği
      test yorumlarında yazılı (AC-30).
- [ ] Yeni veri bölümü, yeni alan ve yeni izin yok; üçü de açıkça yazıldı.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı değişmedi.
- [ ] Görsel kanıt alındı ve `docs/evidence/kanit-eslemesi.json` güncellendi: üç kayıt çıkarıldı,
      değişen ekranlar `beklenen: "degisti"` ve onay dizesiyle girildi
      (`Takım Yöneticisi · YYYY-AA-GG · spec 0089 R10`), 0088'in `maliyet-*` kayıtlarına
      dokunulmadı (C9).
- [ ] `npm test` yeşil (çıktısıyla, Electron testleri dâhil), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (iki görünümün kalktığı, motorun tek tüketicisinin parti ekranı
      olduğu, seri bazında kârlılığın ekrandan kalktığı, parti değişim kutusunun yeni yeri).
- [ ] Sürüm notu metni yazıldı: kullanıcı maliyet rakamını artık Makina Maliyeti sekmesinde bulur;
      kayıp envanterindeki satırlar (stokta taşınan maliyet, dağıtılmamış ortak gider, marj ve ekle
      yöntemleri, seri bazında kâr) adlarıyla sayıldı.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

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
