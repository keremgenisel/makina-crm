# 0082 — Standart Genel Giderler kaldırılır, Tedarikçiler görünümü yeniden adlandırılır

| | |
|---|---|
| **Durum** | Uygulanıyor (dal `feat/0082-standart-kalkar`; plan `specs/0082-uygulama-plani.md`) |
| **Sahip** | Analist (spec) · geliştirme atanmadı |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Mali İşler › Giderler (görünüm çubuğu, Tedarikçiler, Makina Kârlılığı, Makina ve Model); Ayarlar (Gider Ayarları, Çöp Kutusu, Yedekleme, İşlem Geçmişi); genel arama; makina maliyeti motoru; veri bölümü, sunucu bölüm eşlemesi, birleştirme, veritabanı |
| **Bağımlı spec'ler** | 0001 (bölümü getirdi), 0002 (ortak gider kaynağı), 0022, 0026, 0045, 0062, 0064, 0068, 0072, 0076, 0077, 0078 |
| **Taban** | 0080 ve 0081 uygulanmış hâli (`specs/README.md` sırası 0080 → 0081 → 0082); bütün satır numaraları ona göre verildi |
| **Ters çevrilen kriterler** | 0001, 0002, 0026, 0045, 0064, 0068, 0072, 0076, 0078 (tam liste Context'te, bulgu B-2) |
| **Revizyon** | · 1 · 2026-10-13 QA turu (B-1…B-4, Ö-5…Ö-14, K-15…K-28 işlendi; R2/R4/R5/R10/R14, C1/C3/C4/C5/C7, C9, X1 güncellendi, AC-6…AC-8, AC-10, AC-11, AC-15…AC-17, AC-21, AC-22, AC-24, AC-26, AC-30, AC-31 yeniden yazıldı, AC-32…AC-35 eklendi) · 2 · 2026-10-13 plan onayı (P1–P11, `specs/0082-uygulama-plani.md`) |

---

## Intent

Giderler sekmesinin görünüm çubuğu altı sekme taşıyor ve bunlardan biri, **Standart Genel
Giderler**, kullanılmıyor. Fabrika gerçek gider kayıtlarını giriyor; aylık bütçe tablosu tutmuyor.
Tablo boş kalmakla da yetinmiyor: makina maliyetinin ortak gider payı için **ikinci bir kaynak**
olarak seçilebiliyor, yani bir ayar yanlışlıkla "standart" kalırsa bütün makinaların maliyeti
kimsenin doldurmadığı bir tablodan hesaplanıyor. Aynı çubuktaki **Tedarikçiler** sekmesinin adı
da orada yapılan işi tam söylemiyor: tedarikçi kartı tutuluyor ve tedarikçi **ekstresi** alınıyor.

Başarı şu: çubuk beş sekmeye iner, kullanılmayan tablo ve onun maliyete ikinci kaynak olma
seçeneği ortadan kalkar, makina maliyeti her zaman gerçekleşen gider kayıtlarından hesaplanır ve
tedarikçi sekmesinin adı ekstreyi de söyler.

---

## Requirements

### Standart Genel Giderler kalkar

- **R1.** Giderler'in görünüm çubuğundan **Standart Genel Giderler** sekmesi kalkar. Kalan beş
  görünüm: Dönem Raporu, Makina ve Model, Tedarikler ve Ekstre, Üretim Partileri, Makina
  Kârlılığı. Dönemden bağımsız görünüm olarak yalnız Üretim Partileri kalır.
- **R2/1.** Makina maliyetinin ortak gider payı **her zaman gerçekleşen gider kayıtlarından**
  hesaplanır. Ayarlar › Giderler › Gider Ayarları'ndaki "Makina maliyetinde ortak gider kaynağı"
  seçicisi kaldırılır; ayar değeri hiçbir yerde okunmaz.
- **R2/2.** Ayarın **saklanan değeri de kayda yazılmaz:** Gider Ayarları kaydedilirken
  `ortakGiderKaynagi` anahtarı düşürülür, böylece bugünkü değer ilk kayıtta kaybolur. Bugünkü kod
  ayarları yayarak yazdığı için (`SettingsGider.jsx:43`) alan formdan çıkarılsa bile eski değer
  kayıtta kalırdı ve AC-10 ölçülemezdi. Güncellenmemiş bir istemci anahtarı geri yazarsa hiçbir
  yerde okunmadığı için etkisizdir (bulgu Ö-8).
- **R3.** Bugün bu ayarı "standart" olan kurulumda **makina maliyeti ve kârlılık rakamları
  değişir** (standart tablo yerine gerçekleşen kayıtlar okunur). Sürüm notu bunu açıkça söyler.
- **R4/1.** Ortak gider kaynağına bağlı ekran metinleri kalkar: paylaşılan maliyet notlarındaki
  "Ortak gider kaynağı" satırı, fiyat önerisindeki aynı ibare, Makina ve Model ile maliyet
  notlarındaki standart kaynak cümleleri (`DAGITIM_STANDART_NOTU`, `KISITLI_STANDART_NOTU`),
  Makina Kârlılığı'ndaki "gerçekleşen − standart fark" satırı ve "sürümü olmayan standart kalemler
  sıfır sayıldı" uyarısı. Tek kaynak kaldığı için bu satırların söyleyecek bir şeyi yoktur (B3).
- **R4/2.** Kaynak satırı **paylaşılan bileşenden** gelir: `MaliyetNotlari`
  (`MakinaMaliyetDetay.jsx:16`) üç yerde çizilir (maliyet detayının iki dalı `:48` ve `:92`, Makina
  Kârlılığı özeti `MakinaKarliligi.jsx:113`). Satırla birlikte bileşenin `kaynak` prop'u ve üç
  çağrı yerindeki geçişi de kalkar; ölü parametre bırakılmaz (bulgu K-19).
- **R4/3.** Maliyetin **ne içermediğini** söyleyen notlar aynen kalır: `MALZEME_HARIC_NOTU`,
  `BUGUNKU_VERI_NOTU`, koşullu `DAGITIM_NOTU`, koşullu `KISITLI_NOTU` ve "yaklaşık kur" satırı.
  Fiyat önerisindeki satırın ikinci yarısı ("Stoktan çekilen parçaların maliyeti hariç.") da kalır;
  o satır bir bütün olarak silinirse 0002 R3'ün uyarısı fiyat önerisinden kaybolur (K-17, K-18).
- **R5/1.** Standart gider **veri bölümü** uygulamadan çıkar: uygulama durumu, canlı dizi,
  maliyet motorunun girdisi, yükleme, kayıt gövdesi, **otomatik yedek gövdesi**, yedek paketi ve
  geri yüklemesi, çakışma birleştirmesi ve silme uygulaması, çöp kutusu, otuz günlük temizlik,
  genel arama, kayıt kilidi alanı, sunucu bölümü ve grubu, sekme eşlemesi, eylem izni, bölüm adı,
  işlem geçmişi etiketi, veritabanı okuma ve **yazma** yolu, **kimlik sayacı** (`db.cjs` kimlik
  taraması ve yedek geri yüklemesinin sayaç listesi). Bu liste Definition of Done'daki listeyle
  birebir aynıdır (bulgu K-21).
- **R5/2.** İşlem geçmişi etiketleri: kayıt türü etiketi `standart_gider` ve yalnız bu ekranın
  yazdığı üç eylem etiketi (`surum_eklendi`, `surum_geri_alindi`, `sona_erdirildi`) silinir. Etiket
  kapsama testine **yalnız kayıt türü haritası için** ters yön denetimi eklenir (bugün o haritada
  ölü anahtar yok, ölçüldü); eylem haritası tek yönlü kalır. **Bilinen sınır:** `audit_log`'da
  duran eski standart gider kayıtları on iki aylık saklama süresince ham anahtarla görünür
  (bulgu Ö-7).
- **R5/3.** Bölümle birlikte ölen prop'lar da kalkar: `Giderler`'in `standartGiderler` ve
  `setStandartGiderler` prop'ları ve **`aktifKullanici`** prop'u. Üçüncüsü yalnız bu ekrana
  geçmek için vardı (`Giderler.jsx:47` ve `:392`); App'in geçişi de ölür (bulgu K-20).
- **R6.** Veritabanındaki standart gider satırları **silinmez**: tablo okunmaz ve **yazılmaz**.
  Yazma yolunun da kaldırılması zorunludur, yoksa güncellenmemiş bir istemcinin ilk kaydı tabloyu
  boşaltır (bulgu B2).
- **R7.** Eski bir yedek dosyasında standart gider bölümü varsa **yok sayılır**; geri yükleme hata
  vermez, diğer bölümler normal yüklenir. Tam ve kısmi ("Giderler" paketi) geri yükleme için aynı.
- **R8.** Çöp kutusunda duran standart gider satırları artık listelenmez; "çöpü boşalt" ve otuz
  günlük temizlik bu bölüme dokunmaz.
- **R9.** Genel aramada "Standart Genel Giderler" kategorisi kalkar; kalan kategoriler ve sıraları
  değişmez.
- **R10.** Genel aramadan ya da başka bir yerden "standart" görünümüne yönlendirme kalmaz; geçersiz
  bir başlangıç görünümü istenirse Dönem Raporu açılır. Geçiş **sessizdir**: bildirim, uyarı
  şeridi ya da vurgu çıkmaz (0026 X8'in aynı yerdeki kararı; bulgu K-25).
- **R11.** Standart gider grubunun kayıt kilidi alanı kalkar; kalan kilit alanları ve
  "yeni pencere kilitsiz doğmasın" taraması değişmez.

### Tedarikçiler yeniden adlandırılır

- **R12.** Görünüm çubuğundaki **"Tedarikçiler"** sekmesinin adı **"Tedarikler ve Ekstre"** olur.
- **R13.** Aynı görünümün liste başlığı da aynı adı taşır (bugün `Tedarikciler.jsx:62`
  "Tedarikçiler · N" yazıyor); yanındaki sayı bugünkü anlamını korur (canlı tedarikçi adedi).
- **R14.** Kayıt türünün adı **"Tedarikçi" kalır**: "Yeni Tedarikçi" düğmesi, form başlıkları,
  silme onayı, bildirimler, izin etiketleri, çöp kutusu satırı, genel aramanın "Tedarikçiler"
  kategorisi ve gider formundaki tedarikçi alanı değişmez (bulgu B4). **Aynı ekranlarda kalan,
  yeniden adlandırılmayacak altı metin de sayılıdır** (bulgu K-28): Dönem Raporu'nun
  "Tedarikçi Kırılımı" kutusu (`DonemRaporu.jsx:125`), "Tedarikçilere açık borç (KDV dâhil)"
  kartı (`Giderler.jsx:348`), "Tedarikçi Ekstresi" penceresi (`EkstrePenceresi.jsx:44`), kalem
  listesinin "Açıklama · Tedarikçi" sütun başlığı, "Tedarikçi filtresi" seçicisi ve borç
  özetindeki "Tedarikçi" rozeti.
- **R15.** Kod adları, izin kimlikleri, veri bölümü adı ve test kimlikleri değişmez (görünümün
  değeri `tedarikci`, kapsayıcının kimliği `tedarikciler` kalır).

---

## Constraints

### Uyulması zorunlu

- **C1/1.** Makina maliyeti motorunun **gerçekleşen kaynaklı rakamları birebir aynı kalır**.
  Standart dalı silinirken gerçek dalına dokunulmaz. **Ölçüldü:** gerçekleşen dalın hesabı standart
  koddan bağımsızdır (`ortak` seçimi `makinaMaliyeti.js:288`, ay tablosunun standart tohumu `:265`
  yalnız standart kaynakta, dağıtım satırları `:361` yalnız standart kaynakta boş döner), yani
  değerlerin değişmemesi bekleniyor.
- **C1/2.** Değişen tek şey çıktının **şeklidir:** standart dalıyla birlikte beş ölü anahtar düşer
  (`kaynak`, ay kaydında `ortakStandart` ve `standartEksik`, dönem özetinde `standartFark` ve
  `standartEksik`). Bu yüzden "birebir aynı" kanıtı, bu anahtarlar **iki tarafta da ayıklandıktan**
  sonra ölçülür; ayıklamanın yalnız bu anahtarlara dokunduğu ayrı bir denetimle gösterilir. Ham
  eşitlik istenirse kriter sağlanamaz ve alanlar "gercek" sabitiyle yaşamaya devam ederdi (B-1).
- **C1/3.** 0076'nın altın fikstürü (`tests/fixtures/0076-veri.js:43-50` iki kaynağı birlikte
  üretiyor, `tests/fixtures/0076-bayraksiz-once.json` ikisini birlikte saklıyor) **bayt bayt
  korunur:** üretici fonksiyon standart kaynaklı çıktıyı üretmeyi bırakır ve karşılaştırma C1/2'nin
  ayıklamasını iki tarafa uygular. Dosyanın bütün değeri 0076'dan önceki kodla üretilmiş olmasıdır;
  yeniden üretmek kanıtı yok eder (bulgu B-3).
- **C2.** Gider kalemleri, tekrarlayan tanımlar, gider türleri, tedarikçiler, üretim partileri,
  kasa hesapları, hareketler ve çekler **etkilenmez**; bu spec yalnız standart gider bölümünü
  kaldırır.
- **C3.** Bölüm **altı haritadan birlikte** çıkar: `BLOB_SECTIONS` (`serverAuth.cjs:17`),
  `SECTION_GROUP` (`:62`), `GIDER_BOLUMLERI` (`:77`), `BOLUM_SEKMELERI` (`:138`), `EYLEM_IDLERI`
  (`:544`) ve `BOLUM_ADLARI` (`server.cjs:166`). **Ölçüldü:** ilk beşinin ters yön denetimi var
  (`server-authz.test.js:424`), altıncısının **hiç testi yok**, yani orada kalan ölü ad hiçbir
  testi kırmaz. Bu yüzden bölüm adı haritasının anahtarlarının veri bölümü listesinin alt kümesi
  olduğunu ölçen bir denetim eklenir (bulgu Ö-6).
- **C4.** **Karışık sürüm güvenliği.** Güncellenmemiş bir istemci kayıt gövdesinde bu bölümü
  göndermeye devam edebilir. Yeni sunucu bölümü tanımadığı için yetki denetiminde görmez ve
  veritabanına yazmaz. **Ölçülen üç olgu:** (1) bölüm `BLOB_SECTIONS`'tan çıktığı için değişen
  bölüm listesine hiç girmez, dolayısıyla 403 çıkmaz; (2) `server.cjs:496`'nın "değişen bölüm
  varsa" kapısı yüzünden işlem geçmişine de satır yazılmaz; (3) **ters sırada** güncelleme (önce
  istemciler) bile tabloyu boşaltamaz, çünkü eski sunucunun yazma yolu bölümü dizi olarak görmek
  zorundadır ve yeni istemci bölümü hiç göndermez. Buna karşılık güncellenmemiş istemcinin
  kullanıcısı ekranı görmeye devam eder ve orada yaptığı değişiklik **sessizce kaybolur**; sürüm
  notu bunu açık bir cümleyle söyler ("güncellenmemiş bilgisayarlarda bu ekran hâlâ görünür, orada
  yapılan değişiklikler kaydedilmez"). 403 vermek bütün gövdeyi, yani meşru bölümleri de
  reddederdi; bu yüzden sessiz yoksayma bilinçli seçimdir (bulgu Ö-12).
- **C5.** Yedek paketi şeması: standart gider bölümü artık yazılmaz, eski yedekler okunabilir kalır
  (R7). **Karar: yedek şema sürümü 3'te kalır.** Bu sayı yalnız "bu yedek daha yeni sürümden"
  uyarısını tetikliyor (`SettingsBackup.jsx:445`); bölümün eksilmesi iki yönde de okuma değişikliği
  gerektirmiyor, artırmak ise karışık sürüm penceresinde güncellenmemiş istemciye gereksiz uyarı
  verirdi (bulgu Ö-13).
- **C6.** Çöp kutusu simetrisi: bölüm kalktığı için geri alma, kalıcı silme ve otuz günlük
  temizlik yolları birlikte kaldırılır; birinin kalması kayıt bulamayan bir düğme bırakır.
- **C7.** Silinen ekranın testleri ve görsel kanıt kayıtları da kaldırılır; görsel kanıt
  eşlemesinde dosyası olmayan kayıt bırakılmaz (kendi testi var). **Silinen dosyaya bağlı dört
  nokta ayrıca ele alınır** (bulgular Ö-9, Ö-10, Ö-11): (1) dosyanın yolunu sabit yazan üç test
  (`cop-kutusu-0068.test.js:64` iki testte, `cop-kutusu-0078.test.js:30` ve `:210`) dosya okunamaz
  olduğu için temiz bir kırmızı değil `ENOENT` ile çöker; (2) 0045'in "beş pencere" kanıtının
  beşincisi bu ekrandır (`ui/modal-dugme-boslugu.test.jsx:51`) ve yerine Üretim Partisi penceresi
  konur (ölçüldü: `UretimPartileri.jsx:106-107` aynı sınıf, footer'ında İptal ve Kaydet var);
  (3) sekmeyi adıyla tıklayan iki test (`ui/gider-yetkisiz-gorunum.test.jsx:47`,
  `ui/gider-perdesi.test.jsx:75`) güncellenir ve 0001 AC-94'ün pozitif kontrolü "Tedarikler ve
  Ekstre" görünümüne taşınır; (4) konusu kalmayan 0001 AC-93 testi bölümle birlikte silinir
  (yeşil kalan boş bir iddia bırakılmaz, bulgu K-23).
- **C8.** Yeni izin eklenmez, var olan izin kimlikleri kaldırılmaz. Standart giderin yazma izni
  tekrarlayan tanım izniyle paylaşılıyor; o izin başka işler için duruyor.
- **C9.** Kaynak taraması **kimlik bazlıdır**, düz "standart" kelimesi aranmaz: `standartGiderler`,
  `standart_giderler`, `standart_gider`, `standartGider*`, `standartGrup*`, `standartTutar*`,
  `standartYeni`, `standartSona*`, `standartAd*`, `ortakGiderKaynagi`, `ORTAK_KAYNAK*`,
  `ortakStandart`, `standartFark`, `standartEksik`, `DAGITIM_STANDART_NOTU`,
  `KISITLI_STANDART_NOTU`, artı kullanıcıya görünen "Standart Genel Gider" metni. **Ölçülen iki
  masum kullanım** düz kelime taramasını yanlış alarma düşürürdü: `standardModels` bölümünün adı
  "Standart Modeller" (`server.cjs`) ve `db-roundtrip.cjs:90`'daki `{ id: "standart" }` kaydı.
  Buna karşılık bölümü anan **dokuz yorum ve bir açıklama metni** yeniden yazılır (Context'te
  sayılı); yoksa kaynak var olmayan bir bölümü anlatmaya devam eder (bulgu Ö-5).

### KAPSAM DIŞI

- **X1.** Standart gider tablosunun düşürülmesi ya da satırlarının silinmesi — *neden:* geri
  dönüşü yok; okunmayan satırlar zararsız duruyor ve gerekirse sorguyla okunur.
  Tablonun gerçekten silinmesi, istenirse, ileride ayrı ve bilinçli bir karardır. *Not (bulgu
  K-22):* bölüm kimlik sayacından çıktığı için ölü tablonun kimlikleri yeni kayıtların kimlikleriyle
  çakışabilir; hiçbir bağ ve hiçbir okuma yolu o tabloya katılmadığı için zararsızdır, ama satırları
  sorguyla okuyan kişi kimliklerin tek olmadığını bilmelidir.
- **X2.** Yerine yeni bir bütçeleme ya da planlama aracı konması — *neden:* istek
  kaldırmak; ihtiyaç doğarsa kendi spec'iyle gelir.
- **X3.** Tedarikçi kayıt türünün, izin kimliklerinin, veri bölümünün ya da kod adlarının yeniden
  adlandırılması — *neden:* R14 ve R15; görünen ad değişikliği için veri ve izin modeline
  dokunmanın karşılığı yok.
- **X4.** Üretim Partileri görünümünün kaldırılması — *neden:* kullanımda ve makina maliyetinin
  dağıtım tabanı (0022).
- **X5.** Dönem Raporu'nun kutu düzeni ve sayfalama değişiklikleri — *neden:* 0080 ve 0081.
- **X6.** Gider Ayarları ekranının diğer alanları (yürürlük ayı, stopaj oranı, hatırlatma eşiği,
  indirilebilir oran, hesapsız başlangıç, deneme dönemi) — *neden:* yalnız ortak gider kaynağı
  seçicisi kalkar.

---

## Context

**Bugünkü görünüm çubuğu.** `src/components/Giderler.jsx:38` `GORUNUMLER` altı sekme sayıyor;
`:41` `DONEMSIZ` kümesi `["standart", "partiler"]`. Ekran `:392` ile çiziliyor
(`src/components/gider/StandartGiderler.jsx`, 11,6 KB). Tedarikçi sekmesinin etiketi aynı
`GORUNUMLER` dizisinde, liste başlığı `src/components/gider/Tedarikciler.jsx:62`.

**Dönem seçicisi dönemden bağımsız görünümlerde çizilmez,** devre dışı bırakılmaz
(`Giderler.jsx:301`). Devre dışı `fieldset` hatırlatma ve açık kalemler **kiplerinin** davranışıdır;
iki mekanizma ayrıdır (bulgu K-15, AC-6 buna göre yazıldı).

**Standart gider bölümünün tam ayak izi (ölçüldü).** Yirmi kaynak dosyası (biri silinir), üç
`electron/` dosyası, dört araç dosyası ve altmış altı test dosyası:

| Katman | Yer |
|---|---|
| Ekran | `src/components/gider/StandartGiderler.jsx` (silinir), `Giderler.jsx:38`, `:41`, `:45`, `:47`, `:392` |
| Yeniden adlandırma | `src/components/gider/Tedarikciler.jsx:62` |
| Motor (sürümler) | `src/lib/gider.js:1306-1384`: sekiz dışa verilen fonksiyon (`standartGiderAyi:1319`, `standartYeni:1325`, `standartTutarDegistir:1336`, `standartSonSurumuGeriAl:1351`, `standartSonaErdir:1358`, `standartAdDegistir:1365`, `standartGrupSil:1372`, `standartGruplar:1374`) ve yalnız bu blokta kullanılan üç özel yardımcı (`aydaGecerliSurum:1311`, `grupla:1314`, `grupSurumleri:1323`) |
| Motor (maliyet) | `src/lib/makinaMaliyeti.js:19` `ORTAK_KAYNAK`, `:20` etiketler, `:25` ve `:28` standart notları, `:138` imza, `:142` kaynak seçimi, `:262-265`, `:280-288`, `:312` `ortakStandart`, `:337` dönüşteki `kaynak`, `:361`, `:449-455`, `:477` |
| Ayar | `src/components/settings/SettingsGider.jsx:7`, `:18`, `:43`, `:65-71` |
| Maliyet ekranları | `gider/MakinaMaliyetDetay.jsx:16-26` (`MaliyetNotlari`), `:48`, `:92`; `gider/MakinaKarliligi.jsx:28`, `:100-104`, `:113`; `gider/MakinaModelGorunumu.jsx:3`, `:32`, `:36`; `gider/FiyatOnerisi.jsx:3`, `:49` |
| Genel arama | `src/components/GlobalSearch.jsx:27` `KAT_SIRA`, `:42` `KAT`, `:65`, `:93`, `:105-119`, `:161`; `src/lib/aramaGider.js:120` `standartGrupSatirlari`, `:139`, `:140` |
| Çöp kutusu | `src/lib/copKutusu.js:30` `standartCopGruplari`, `:44` geri alma çakışması; `settings/SettingsTrash.jsx:16`, `:37`, `:253-259`, `:308`, `:371-372`, `:383` |
| Yedek | `settings/SettingsBackup.jsx:19`, `:65`, `:150` (paket açıklaması), `:251`, `:282`; `Settings.jsx:54`, `:72`, `:220`, `:374` |
| Uygulama durumu | `src/App.jsx:282` ve `:323` birleştirme, `:805` durum, `:845` canlı dizi, `:926-928` maliyet girdisi, `:1102` otuz günlük temizlik, `:1178` yükleme, `:1296` kayıt gövdesi, `:1394` otomatik yedek, `:1506`, `:1700`, `:1721` prop geçişleri |
| Birleştirme | `src/lib/merge.js:29` `MERGE_KEYS`, `:201` grup kimliği eşlemesi |
| Kilit | `src/lib/kilitAlanlari.js:35` `standart_gider` |
| Sunucu | `electron/serverAuth.cjs:17`, `:62`, `:77`, `:138`, `:544`; `electron/server.cjs:166` bölüm adı |
| Veritabanı | `electron/db.cjs:302` tablo, `:566` çöp kutusu tabloları, `:956-959` yazma, `:1007` kimlik sayacı, `:1509` okuma, `:1540` dönüş |
| İşlem geçmişi | `settings/SettingsAuditLog.jsx:13` kayıt türü etiketi, `:34` üç eylem etiketi |
| Araçlar | `scripts/evidence/0009-sayfa.jsx:208-212`, `:244`, `:551`, `:575`, `:828`, `:933`; `scripts/tests/layout/donem-raporu.jsx`, `calisan.jsx`, `gider-tanim.jsx` |

**Yeniden yazılacak yorumlar ve metinler (C9).** Bölümü anan yerler: `gider.js:264` (sıfır tutar
kuralı), `makinaMaliyeti.js:262-264` (ay tablosu notu), `merge.js:26` ve `:51`,
`serverAuth.cjs:132`, `Settings.jsx:54`, `Giderler.jsx:40` ve `:206`, `copKutusu.js:28` ile
`SettingsTrash.jsx:34` ve `:359`, artı kullanıcıya görünen `SettingsBackup.jsx:150` paket
açıklaması ("… tedarikçiler, standart genel giderler, kasa hesapları …").

**Testler.** Kendi dosyası `tests/ui/standart-giderler.test.jsx` kalkar. Bölüm adı geçen altmış
altı dosyanın yaklaşık yirmi sekizinde yalnız prop temizliği var; gerçek beklenti taşıyanlar:
`tests/gider.test.js` (sürüm kuralları ve 0001 AC-93), `tests/makina-maliyeti.test.js` (standart
kaynak, standart fark, eksik sürüm, 0002 AC-66'nın standart örneği, iki triyaj testi),
`tests/fixtures/0076-veri.js` ve `tests/kisitli-gider-0076.test.js` (altın fikstür, C1/3),
`tests/merge.test.js`, `tests/cop-kutusu-0068.test.js` ve `tests/cop-kutusu-0078.test.js` (dosya
listeleri ve `TABLES_WITH_TRASH` sayısı), `tests/ui/cop-kutusu-0078.test.jsx`,
`tests/ui/cop-koruma-0078.test.jsx`, `tests/ui/genel-arama-0026.test.jsx` (kategori kümesi
eşitliği), `tests/server-authz.test.js`, `tests/kilit-alanlari.test.js`,
`tests/ui/kilit-0064.test.jsx`, `tests/ui/makina-karliligi.test.jsx`,
`tests/ui/gider-settings.test.jsx`, `tests/utils.test.js` (ayar paylaşımı örneği),
`tests/gider-gizlilik.test.js` (yasaklı ad listesi), `tests/ui/modal-dugme-boslugu.test.jsx`,
`tests/ui/gider-yetkisiz-gorunum.test.jsx`, `tests/ui/gider-perdesi.test.jsx`,
`tests/ui/gider-perdesi-yedek.test.jsx`, `tests/islem-gecmisi-etiketleri.test.js`,
`scripts/tests/db-roundtrip.cjs` ve `db-clean-install.cjs`.

**Ters çevrilen kriterler (bulgu B-2).** Bu spec dokuz spec'in donmuş iddialarını geri alır;
geliştirici bunları test test keşfetmesin diye liste burada:

| Spec | Geri alınan |
|---|---|
| 0001 | R22, AC-92…AC-96 (ekranın kendisi); AC-94'ün pozitif kontrolü taşınır; AC-93'ün konusu kalmaz, testi silinir |
| 0002 | R22, R25, C8, AC-34, AC-35, **AC-36** ("maliyetin gösterildiği ekranda hangi kaynağın kullanıldığı yazar", R4/1 bunu iptal eder), AC-37 |
| 0026 | AC-5, AC-22, AC-28'in standart yarısı, AC-33, AC-8 ve AC-9'un standart yarısı |
| 0045 | AC-13 / AC-14 / AC-16'nın beşinci penceresi (C7 (2) ile korunur) |
| 0064 | R33, AC-22 ve AC-35'in `standart_gider` alanı |
| 0068 | AC-16 / AC-17 / AC-32 / AC-39'un beş pencere listesi dörde iner |
| 0072 | AC-25, AC-17 ve AC-38'in "standart kaynakta etkisizlik" yarıları |
| 0076 | AC-16'nın standart yarısı, AC-36'nın altın fikstürü (C1/3) |
| 0078 | AC-12, AC-23 / AC-24, AC-29 / AC-50 (`TABLES_WITH_TRASH` yirmi üç → yirmi iki), AC-30 / AC-31, AC-45, R9 / R38 |

**İşlem geçmişi etiketleri (ölçüldü).** Etiket kapsama testi bilerek tek yönlüdür ("haritada
fazlası zararsız"), yani ölü etiketi yakalamaz. Kayıt türü haritasında bugün **ölü anahtar yok**,
eylem haritasında on üç tane var (bu eylemler yayılarak yazıldığı için taramaya görünmüyor). Bu
yüzden ters yön denetimi yalnız kayıt türü haritasına eklenebilir (R5/2).

**Çubuk genişliği (ölçüldü).** Yeni ad altı karakter uzun ama yirmi üç karakterlik bir sekme
kalkıyor, yani çubuk kesinlikle kısalıyor. 0061'in kararı çubuğu tek satırda ve daralmaz tutuyor,
sağ grup gerekirse alta iniyor; Electron yerleşim testi 1024 px'te belge taşmasını zaten ölçüyor.
Bu yüzden yeni bir kriter eklenmedi (bulgu K-24).

**Yeni adın iki yerde aynı metin olması.** R12 ve R13 aynı sözcüğü hem sekmeye hem liste başlığına
koyduğu için düz metin sorgusu iki eşleşme bulur; testler rol sorgusuyla yazılır, bileşene yeni
test kimliği eklenmez (R15).

**Önceki kararlar.** 0002 iki kaynağı bilinçli olarak getirmişti ("iki kaynak asla toplanmaz",
C4-3) ve ayarın paylaşımlı olduğunu, değiştirilince bütün kullanıcıların gördüğü maliyetin
değişeceğini ekrana yazmıştı. 0078 standart gideri çöp kutusuna almıştı (0068'in kalıcı silme
kararının geri alınan altısından biri). Bu spec her ikisini de daraltıyor: 0002'nin standart
kaynağı ve 0078'in standart gider kolu kalkıyor.

### Ölçüm sonuçları (uygulama, 2026-10-13)

- **AC-8:** gerçekleşen kaynaklı motor çıktısı (dağıtım, parti, stok, model ve kısıtlı kalemli veri; standart satırı dolu) önce/sonra
  birebir; ayıklanan ölü anahtarların hepsi beklenen biçimde (`kaynak` "gercek", `ortakStandart` tam sayı, `standartEksik` dizi,
  `standartFark` null). Gerçekleşen kipte de ay kaydı `standartEksik`'i dolu taşıyordu (sürümü olmayan grup adları).
- **AC-17 (Electron):** eski istemci gövdesi (boş ve dolu standart bölüm) kısıtlı gider kullanıcısında 200; meşru kalem yazıldı; ham
  SQL ile iki satır aynen; işlem geçmişinde bölüm adı yok. Sunucu haritaları eski hâline döndürülünce iki kontrol düşüyor.
- **AC-18 (Electron):** ham SQL ile yazılan iki satır, bölümü boş / dolu gönderen ve göndermeyen üç kayıttan sonra aynen; `db.cjs`'in
  eski hâliyle dört kontrol düşüyor.
- **AC-21:** yedek anahtar kümesi = bu işten önceki kodla ölçülen küme − `standartGiderler` (39 → 38 anahtar).

### Bulgular (öneri kuralı 5)

- **B1. Sadece ekranı kaldırmak yeterli değil, hatta tehlikeli.** Ekran kalkıp veri ve motor
  kalırsa, ortak gider kaynağı "standart" seçili bir kurulumda makina maliyeti **artık hiçbir
  ekrandan düzenlenemeyen** bir tablodan hesaplanmaya devam eder. **Önerim: tam kaldırma**
  (R1–R11). *Gerekçe:* yarım kaldırma, bu projede daha önce "sessiz düşüş" diye adlandırılan
  sınıfın aynısını üretir; rakam yanlış olur ve kimse fark etmez.
- **B2. En riskli tek satır: veritabanı yazma yolu.** Yazma yolu
  (`electron/db.cjs:956-959`) bölümü gövdede **dizi olarak görürse** tabloyu boşaltıp yeniden
  yazıyor. Yalnız okuma yolu kaldırılırsa: yeni sunucu bölümü göndermez, güncellenmemiş eski
  istemci onu boş dizi olarak geri yazar ve **tablo kalıcı olarak boşalır** (R6'nın sakladığı
  satırlar gider). **Önerim: okuma ve yazma yolları birlikte kaldırılır**, tablo hiç
  dokunulmayan bir ölü tablo olur; böylece hiçbir istemci sürümü satırları silemez.
- **B3. Tek kaynak kalınca "kaynak" ibareleri ne olacak?** Dört ekranda "Ortak gider kaynağı:
  Gerçekleşen gider kayıtları" benzeri satırlar var. **Önerim: bu satırlar kaldırılır**
  (R4), çünkü seçeneği olmayan bir ayarı duyurmak bilgi değil gürültü. Maliyetin **ne içermediğini**
  söyleyen notlar (stoktan çekilen parçaların alış maliyeti hariç, bugünkü veriden türer,
  dağıtılmış kalemler, kısıtlı giderin indirilemeyen KDV'si) **aynen kalır**; onlar okuyan kişinin
  rakamı yanlış yorumlamasını engelliyor.
- **B4. "Tedarikler ve Ekstre" adı kayıt türünün adını da değiştirsin mi?** **Önerim: hayır**
  (R14). Görünümün adı yapılan işi anlatır ("tedarikler" alınan mal ve hizmet, "ekstre" hesap
  dökümü), ama kaydın kendisi hâlâ bir **tedarikçidir**: formu, izni, çöp kutusu satırı ve genel
  arama kategorisi öyle kalırsa uygulama kendi içinde tutarlı olur. *Not:* Takım Yöneticisi
  **"Tedarikçiler ve Ekstre"** demek istediyse (çubukta ve listede aynı sözcük) R12 ve R13 tek
  kelimeyle güncellenir; karar sizin.
  **Karar (Takım Yöneticisi, 2026-10-13): öneri kabul edildi.** Görünümün adı **"Tedarikler ve
  Ekstre"** olur (R12, R13); kayıt türünün adı, izin kimlikleri ve arama kategorisi
  **"Tedarikçi" kalır** (R14, R15, X3).
- **B5. Kaldırma sırası.** Bu spec 0080 ve 0081 ile aynı ekrana dokunuyor ama farklı yerlerine;
  yine de **en son** yapılması önerilir, çünkü silme işi en geniş ayak izine sahip ve diğer iki
  işin görsel kanıt tabanını geçersiz kılar. Önerilen sıra: 0080 → 0081 → 0082.

### QA turu kararları (revizyon 1, Takım Yöneticisi, 2026-10-13)

Yirmi sekiz boşluğun hepsi karara bağlandı; önerilerin tamamı kabul edildi. Nereye işlendiği:

| No | Boşluk | Nereye işlendi |
|---|---|---|
| B-1 | C1 ve AC-8 sağlanamaz: motorun çıktı şekli değişiyor | C1/1, C1/2, AC-8 |
| B-2 | "Ters çevrilen kriterler" satırı yok | Başlık tablosu, Context tablosu, DoD |
| B-3 | 0076'nın altın fikstürü iki kaynağı birlikte ölçüyor | C1/3, Context (testler), DoD |
| B-4 | Dört kriterin kanıt yolu tanımsız (okuma yolu kalkınca veri ekrana gelmiyor) | AC-18, AC-19, AC-24, AC-25, AC-26 |
| Ö-5 | AC-31'in tarama ölçütü belirsiz, yanlış alarm üretir, yorumlar yalan kalır | C9, Context (yorum listesi), AC-31 |
| Ö-6 | AC-22 hangi listeler? Bölüm adı haritasının testi yok | C3, AC-22 |
| Ö-7 | AC-30'un "ölü etiket kalmamış" yarısı kanıtlanamaz | R5/2, Context (etiketler), AC-30 |
| Ö-8 | Kayıtta duran ayar değerinin kaderi tanımsız | R2/2, AC-10 |
| Ö-9 | 0045'in beşinci pencere kanıtı siliniyor | C7 (2), AC-32 |
| Ö-10 | Üç test silinen dosyanın yolunu sabit yazıyor | C7 (1), AC-33 |
| Ö-11 | Sekmeyi adıyla tıklayan iki test ve 0001 AC-94'ün pozitif kontrolü | C7 (3), AC-33 |
| Ö-12 | Karışık sürümde kullanıcının gördüğü davranış tanımsız | C4, DoD (sürüm notu) |
| Ö-13 | Yedek şema sürümü kararı açık | C5 (karar: 3'te kalır) |
| Ö-14 | Tasarım sözlüğünün iki satırı DoD'de yok | AC-35, DoD |
| K-15 | AC-6'nın sözcüğü yanlış ("devre dışı" değil "çizilmez") | Context, AC-6 |
| K-16 | AC-7 var olmayan bir sözlükle yazılmış | AC-7 |
| K-17 | AC-11 belirsiz: hangi notlar kalıyor | R4/3, AC-11 |
| K-18 | Fiyat önerisindeki satırın ikinci yarısı kalmalı | R4/3, AC-15 |
| K-19 | Satır paylaşılan bileşenden geliyor, prop da ölüyor | R4/2 |
| K-20 | `aktifKullanici` prop'u ölü kalıyor | R5/3, AC-34 |
| K-21 | R5'in yüzey listesi DoD'den dar | R5/1 |
| K-22 | Kimlik sayacından çıkarmanın sonucu yazılmamış | X1 notu |
| K-23 | 0001 AC-93'ün koruması konusunu kaybediyor | C7 (4), Context tablosu |
| K-24 | Çubuğun dar pencere davranışı sorulmamış | Context (ölçüm), yeni kriter yok |
| K-25 | R10 sessiz mi, bildirimli mi | R10 |
| K-26 | Görsel kanıt listesi iki ekran eksik | DoD |
| K-27 | AC-16 ve AC-21'in kapsamı ölçülebilir değil | AC-16, AC-21 |
| K-28 | R14 "Tedarikçi" adının kaldığı yerleri saymıyor | R14 |

### Plan onayı kararları (revizyon 2, Takım Yöneticisi, 2026-10-13)

Planın on bir önerisinin hepsi kabul edildi; ayrıntı `specs/0082-uygulama-plani.md` §4.

- **P1.** AC-31 taramasına tam yollu, gerekçeli istisna listesi: 0082'nin kendi iki test dosyası, `scripts/tests/db-roundtrip.cjs`,
  `db-clean-install.cjs`, `server-security.cjs` (eski veriyi taklit eden bloklar), `tests/fixtures/0076-bayraksiz-once.json` ve
  `tests/fixtures/0082-maliyet-once.json`. Listedeki dosya adı artık içermiyorsa tarama kırılır (eskimiş istisna).
- **P2.** C1/2'nin ölü anahtarları ölçümde: `kaynak` üç düzeyde (sonuç, makina satırı, kârlılık özeti), `ortakStandart`,
  `standartEksik`, `standartFark`. Ayıklama ada göre özyinelemeli; kapsam denetimi ayıklanan değerlerin beklenen biçimde olduğunu
  ve başka hiçbir alanın farklı olmadığını ölçer.
- **P3.** 0076: `motorCiktilari` `maliyetStandart`'ı üretmez; karşılaştırmada beklenen taraftan atılır, iki tarafa P2 ayıklaması;
  JSON dosyasına dokunulmaz (SHA testte sabit).
- **P4.** AC-17 iki katman: `server-authz` (birim) + `server-security.cjs` (Electron, eski istemci gövdesi, satır sayısı, işlem
  geçmişi). Ters sıra testle çalıştırılamaz; `degisenBolumler`'in gövdede olmayan bölümü atladığı ölçümü plana yazılır.
- **P5.** AC-25: tarama + AC-18'in ham SQL kanıtı (tabloya giden tek yol yazma yolu).
- **P6.** R10: `Giderler` başlangıç görünümünü `GORUNUMLER`'e karşı doğrular, bilinmeyen değer Dönem Raporu.
- **P7.** R2/2: anahtarı yalnız `SettingsGider`'in kaydı düşürür; yüklemede temizlenmez.
- **P8.** AC-30 ters yön kayıt türü haritası için; fazla anahtar çıkarsa durulur ve raporlanır.
- **P9.** Değişen ekranlar dosya bazında `degisti` + onay; DoD'nin yedi kanıt ekranı adlandırılır.
- **P10.** Kimlik sayacı listelerinden bölüm çıkar, ek önlem yok (X1 notu).
- **P11.** Prop temizliği tek turda; gerçek beklenti taşıyan testler tek tek, ters çevrilen kriter test yorumunda yazılı.

---

## Acceptance Criteria

### Görünüm çubuğu ve ad

- **AC-1.** Giderler sekmesinin görünüm çubuğunda beş sekme vardır ve "Standart Genel Giderler"
  metni ekranda hiç geçmez.
- **AC-2.** Çubuktaki üçüncü sekmenin adı "Tedarikler ve Ekstre"dir.
- **AC-3.** O görünüme girildiğinde liste başlığı "Tedarikler ve Ekstre" ve yanında canlı tedarikçi
  sayısı yazar. Sorgu rol üzerinden yapılır (aynı metin sekmede de vardır).
- **AC-4.** Aynı görünümde "Yeni Tedarikçi" düğmesi, tedarikçi formunun başlığı ve silme onayının
  metni bugünkü hâliyle durur; R14'te sayılan altı metin de değişmez.
- **AC-5.** Genel aramada tedarikçi kategorisinin başlığı "Tedarikçiler" olarak kalır.
- **AC-6.** Üretim Partileri görünümünde dönem seçicisi **çizilmez** (bugünkü davranış) ve
  dönemden bağımsız tek görünüm odur; kalan dört görünümde seçici çizilir.

### Makina maliyeti

- **AC-7.** Ortak gider kaynağı ayarı "standart" olarak kayıtlı bir veride makina maliyeti,
  gerçekleşen gider kayıtlarından hesaplanır; sonuç, bu alanın hiç bulunmadığı aynı veriyle
  birebir aynıdır.
- **AC-8.** Standart gider satırı **dolu** olan ve ayarı "gercek" olan bir veride motor çıktısı, bu
  spec'ten önceki kodun çıktısıyla birebir aynıdır. Kanıt: bu spec'ten önceki kodla üretilmiş
  önce/sonra fikstürü; karşılaştırma C1/2'nin ölü anahtar ayıklamasıyla yapılır ve ayıklamanın
  yalnız o anahtarlara dokunduğu ayrıca ölçülür.
- **AC-9.** Ayarlar › Gider Ayarları'nda "Makina maliyetinde ortak gider kaynağı" alanı yok;
  diğer altı alan duruyor ve kaydedilebiliyor.
- **AC-10.** Gider ayarları kaydedildikten sonra kaydedilen nesnede `ortakGiderKaynagi` anahtarı
  **yoktur**: alan formdan çıkar ve bugünkü değer ilk kayıtta düşer.
- **AC-11.** Maliyet notlarında "Ortak gider kaynağı" satırı yok; maliyetin neyi içermediğini
  söyleyen dört not (`MALZEME_HARIC_NOTU`, `BUGUNKU_VERI_NOTU`, koşullu `DAGITIM_NOTU`, koşullu
  `KISITLI_NOTU`) ve "yaklaşık kur" satırı duruyor.
- **AC-12.** Dağıtılmış kalemi olan bir veride maliyet notlarındaki dağıtım notu gerçekleşen
  kaynağın metnidir.
- **AC-13.** Kısıtlı (binek araç) kalemi olan bir veride maliyet notu gerçekleşen kaynağın
  metnidir.
- **AC-14.** Makina Kârlılığı özetinde "gerçekleşen − standart fark" satırı ve "sürümü olmayan
  standart kalemler" uyarısı hiç çizilmez.
- **AC-15.** Makina ve Model görünümünün dağıtım kutusu ile fiyat önerisi kaynak ibaresi taşımaz;
  fiyat önerisindeki satırın ikinci yarısı ("Stoktan çekilen parçaların maliyeti hariç.") ve
  kutunun diğer satırları değişmez.

### Veri, sunucu, veritabanı

- **AC-16.** Standart gider bölümü üç gövdenin hiçbirinde gönderilmez: kayıt gövdesi, otomatik
  yedek gövdesi ve elle alınan yedek.
- **AC-17.** Güncellenmemiş bir istemcinin gövdesinde bu bölüm gelirse sunucu kaydı kabul eder
  (403 vermez), bölümü yazmaz ve bu yazım için işlem geçmişine bölüm adı yazmaz.
- **AC-18.** Veritabanında standart gider satırları varken uygulama açılıp **bölümü gönderen ve
  göndermeyen** iki kayıt yapıldığında satırlar olduğu gibi durur. Kanıt ham SQL ile: satırlar
  doğrudan yazılır, kayıtlardan sonra satır sayısı değişmez.
- **AC-19.** Temiz kurulumda uygulama açılır, gider ekranları çalışır ve okunan veride standart
  gider bölümü anahtarı hiç yoktur.
- **AC-20.** Standart gider bölümü içeren eski bir yedek dosyası geri yüklenir: diğer bölümler
  yüklenir, hata çıkmaz, bölüm yok sayılır. Tam geri yükleme ve yalnız "Giderler" paketi seçili
  kısmi geri yükleme için aynı.
- **AC-21.** Yeni alınan yedek dosyasının bölüm anahtarı kümesi, bugünkü kümenin standart gider
  bölümü çıkarılmış hâline **eşittir**.
- **AC-22.** Bölüm, C3'te sayılan altı haritanın hiçbirinde yok; tanımlı her veri bölümü bir izin
  grubuna ve en az bir sekmeye eşlenmiş durumda ve bölüm adı haritasının anahtarları veri bölümü
  listesinin alt kümesi.
- **AC-23.** Çakışma birleştirmesi: standart gider bölümü birleştirilen bölümler arasında yok;
  kalan bölümler bugünkü gibi birleşir.

### Çöp kutusu, arama, kilit, iz

- **AC-24.** Çöp Kutusu standart gider satırı çizmez: ekran bu bölümün prop'unu artık almaz ve
  listeyi kuran kod bu bölümü hiç okumaz (kaynak taraması; okuma yolu kalktığı için veri ekrana
  ulaşamaz, bu yüzden kriter veriyle değil taramayla ölçülür).
- **AC-25.** "Çöpü boşalt" çalıştırıldığında standart gider tablosuna dokunulmaz (ham SQL ile
  satır sayısı değişmez) ve boşaltma kodu bu bölümü hiç anmaz.
- **AC-26.** Otuz günlük otomatik temizlik standart gider bölümünü hiç işlemez: App'in temizlik
  çağrıları arasında bu bölüm yok (kaynak taraması).
- **AC-27.** Genel aramada standart gider adıyla arama yapıldığında o kategori hiç çıkmaz; kalan
  kategoriler ve sıraları bugünküyle aynı.
- **AC-28.** Genel aramanın kategori kümesi ile sonuç nesnesinin anahtar kümesi birbirine eşittir
  (0026'nın eşitlik kuralı yeni kümede de geçerli).
- **AC-29.** Kayıt kilidi alan listesinde standart gider yok; kalan alanların kapsam taraması
  geçer.
- **AC-30.** İşlem geçmişi etiket kapsaması geçer: kaynakta yazılan her kayıt türü ve eylem bir
  etikete sahip; ayrıca **kayıt türü haritasında ölü anahtar yoktur** (ters yön denetimi) ve
  silinen ekranın üç eylem etiketi haritada kalmamıştır.
- **AC-31.** Kaynak taraması: C9'un kimlik listesi ve "Standart Genel Gider" metni kaynakta (araç
  ve test dosyaları dahil) hiç geçmez; tarama `standardModels`'in "Standart Modeller" adını ve
  `db-roundtrip.cjs`'in `{ id: "standart" }` kaydını yanlış alarma düşürmez.
- **AC-32.** 0045'in pencere kanıtı beş pencerede kalır: silinen ekranın yerine Üretim Partisi
  penceresi girer ve alt düğme satırı kuralını bugünkü gibi geçer.
- **AC-33.** Silinen dosyanın yolunu sabit yazan üç test ve sekmeyi adıyla tıklayan iki test
  güncellenmiştir; 0001 AC-94'ün pozitif kontrolü "Tedarikler ve Ekstre" görünümünden geçer ve
  konusu kalmayan 0001 AC-93 testi silinmiştir.
- **AC-34.** `Giderler` bileşeni `standartGiderler`, `setStandartGiderler` ve `aktifKullanici`
  prop'larını almaz; App da bu üçünü geçirmez (kaynak taraması).
- **AC-35.** Tasarım sözlüğünün iki satırı güncellenmiştir: pencere boyutu sınıflarındaki
  "Standart Gider işlemi" örneği kalkar ve 0080'in sayfalama istisnasındaki liste adı
  "Tedarikler ve Ekstre" olur.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Makina maliyeti motorunun gerçekleşen kaynaklı çıktısı önce/sonra fikstürüyle doğrulandı
      (AC-8); fikstür bu spec'ten önceki kodla üretildi ve karşılaştırma C1/2'nin ayıklamasıyla
      yapıldı, ayıklamanın kapsamı ayrıca ölçüldü.
- [ ] 0076'nın altın fikstürü bayt bayt korundu; üretici fonksiyon standart dalı üretmeyi bıraktı
      ve karşılaştırma iki tarafa aynı ayıklamayı uyguladı (C1/3).
- [ ] Aynı sayıyı üreten iki yer kalmadı: ortak gider payının tek kaynağı gerçekleşen kayıtlar.
- [ ] Kaldırılan veri bölümünün **bütün** bağlantıları birlikte kaldırıldı: uygulama durumu, canlı
      dizi, maliyet motorunun girdisi, yükleme, kayıt, yedek, otomatik yedek, birleştirme ve silme
      uygulaması, çöp kutusu, otuz günlük temizlik, genel arama, kilit alanı, sunucu bölümü ve
      grubu, sekme eşlemesi, eylem izni, bölüm adı, işlem geçmişi etiketleri, veritabanı okuma ve
      **yazma** yolu, kimlik sayacı ve ölü prop'lar (R5/1, R5/2, R5/3).
- [ ] Veritabanı tablosu ve satırları yerinde; hiçbir kod yoluyla silinmiyor (AC-18, AC-25).
- [ ] Yedek okuma geriye dönük uyumlu (AC-20); yedek şema sürümü kararı yazıldı (C5: 3'te kalır).
- [ ] Karışık sürüm davranışı ölçüldü: eski istemci gövdesi 403 almıyor, tabloyu boşaltmıyor ve
      işlem geçmişine satır yazmıyor; ters sıradaki güncelleme de tabloyu boşaltmıyor (C4).
- [ ] Yeni izin eklenmedi, var olan izin kimliği kaldırılmadı (açıkça yazıldı).
- [ ] **Ters çevrilen kriterler** Context tablosundaki dokuz spec için adıyla yazıldı ve testleri
      güncellendi; konusu kalmayan testler silindi, korunan kanıtlar (0045'in beşinci penceresi,
      0001 AC-94'ün pozitif kontrolü) taşındı.
- [ ] Silinen ekranın testi ve görsel kanıt kayıtları kaldırıldı; görsel kanıt eşlemesinde
      karşılığı olmayan kayıt yok.
- [ ] Görüntü aracının ve yerleşim testi sayfalarının standart gider adımları kaldırıldı; Çöp
      Kutusu kanıt ekranının standart satırı çıkarıldı.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi: beş sekmeli çubuk, yeniden adlandırılmış liste,
      ortak gider kaynağı alanı olmayan Gider Ayarları, kaynak ibaresi olmayan maliyet detayı,
      **kaynak satırı ve fark satırı olmayan Makina Kârlılığı özeti**, **standart kategorisi
      olmayan genel arama paleti**, standart satırı olmayan Çöp Kutusu.
- [ ] `docs/tasarim-sozlugu.md`'nin iki satırı güncellendi (AC-35).
- [ ] Sürüm notu yazıldı: ayarı "standart" olan kurulumda maliyet rakamlarının değişeceği (R3),
      sıranın önce sunucu sonra istemciler olduğu, güncelleme bitene kadar bu ekranın
      kullanılmaması ve **güncellenmemiş bilgisayarlarda ekranın hâlâ görünüp orada yapılan
      değişikliklerin kaydedilmeyeceği** (C4).
- [ ] `npm test` yeşil (çıktısıyla, Electron testleri dahil), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: 0001'in beş gider bölümü dörde iner, 0002'nin ortak gider kaynağı
      kararı kapanır, 0078'in altı çöp bölümü beşe iner, 0026'nın kategori listesi daralır,
      işlem geçmişi etiketlerinin bilinen sınırı yazılır.
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
