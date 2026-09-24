# Tasarım Sözlüğü

Uygulamanın paylaşılan arayüz yapı taşları (spec 0009). Hepsi **`src/components/tasarim.jsx`** dosyasında tanımlıdır.
Yeni bir ekran ya da bir ekranın yeni tasarıma dönüştürülmesi bu sözlükten yapılır: aşağıdaki altı öğeden birine
karşılık gelen bir şeyi ekranın içinde yeniden yazmayın, buradakini kullanın. Burada karşılığı olmayan bir öğeye
ihtiyaç varsa, onu doğuran ekranın işinde tartışın ve karar verilince buraya ekleyin.

Ortak kurallar:

- Stil satır içidir (CSS framework, CSS module, styled-components yok).
- Renkler tema değişkenlerinden gelir: `var(--token, #yedek)`. Tek istisna gölgelerdir (`rgba(...)`); temada gölge
  değişkeni yok.
- `data-testid` hiçbir bileşenin içinde sabit yazılmaz; gerekiyorsa çağıran `testId` ile verir.
- Kullanıcıya görünen metin çağırandan gelir ve Türkçedir.
- Bir ekran bu bileşenleri kullanmaya başladığında görünümünün değişmediği önce/sonra görüntüsüyle kanıtlanır
  (`scripts/evidence/0009-calistir.mjs`) ve kaydı `docs/evidence/kanit-eslemesi.json`'a eklenir; kaydı olmayan
  kullanan dosyayı `tests/tasarim-kaynak.test.js` yakalar. Test dosyasına dokunulmaz (spec 0011 R2). Kayıt varsayılan
  olarak "görünüm aynı" (0 piksel fark) bekler; ekranın yeni tasarıma dönüşümü gibi bilinçli bir görünüm değişikliğinde
  kayıt `beklenen: "degisti"` ve `onay` taşır. `onay` biçimi: `Takım Yöneticisi · YYYY-AA-GG · spec <no> <madde>`; bu kaydı
  yalnız Takım Yöneticisi'nin onayı açar. `degisti` kalıcı değildir: spec `specs/done/`'a taşınırken kayıtları `ayni`ye
  çevrilir ve yeni görünüm taban olur (spec 0011 AC-11b, AC-11c; `tests/kanit-eslemesi.test.js`).

---

## Segment

Segmentli seçici: birbirini dışlayan 2–6 seçenekten birini seçtirir.

- `options: [{ value, label }]`, `value`, `onChange(value)`, `ariaLabel`, `disabled`
- `kip`:
  - `"radyo"` (varsayılan): `radiogroup` + `radio` + `aria-checked`.
  - `"dugme"`: `group` + `aria-pressed`. Yalnız ekranın bugünkü erişilebilirlik sözleşmesi bunu gerektiriyorsa kullanın; yeni ekranda `radyo`.
- `gorunum`:
  - `"hap"` (varsayılan): gri zemin üstünde beyaz aktif hap, satır sarar.
  - `"cerceve"`: çerçeveli düğmeler; seçili olan marka kenarlıklı ve açık turuncu zeminli.

**Ne zaman kullanılır:** görünüm değiştirme (sekme benzeri alt görünümler), iki-üç değerli form seçimleri (brüt/net,
ödendi/ödenmedi, alıcı tipi), dönem türü gibi tek seçimli filtreler.

**Ne zaman kullanılmaz:**
- Seçenek çoksa (yediden fazla) ya da uzun metinliyse: `Select`.
- Birden fazla seçim yapılabiliyorsa: onay kutuları.
- Bir eylemi tetikleyen tek düğme için (aç/kapa dahil): `Btn`.

**Örnek:** `src/components/Giderler.jsx:166`
**Örnek:** `src/components/Documents.jsx:1116`

## KartBolum

Başlıklı kart bölüm; iki görünüm varyantı var:

- **`varyant="ayar"`** (varsayılan): Ayarlar ekranının bölümü.
  - Gölgeli, 24 dolgu, 720 piksel genişlik sınırı (`wide` ile tam genişlik).
  - İkonlu koyu başlık (`title`, `icon`).
  - `collapsible` ile katlanabilir, başlangıç durumu `defaultOpen`. Katlanabilirlik yalnız bu varyantta var.
- **`varyant="kart"`**: kenarlıklı, 18 dolgulu, ikonsuz kart. Başlık iki biçimde çizilir:
  - `baslikStili="etiket"` (varsayılan): küçük gri büyük harf etiket. Formun bölümlerini ayırmak için (Evrak).
  - `baslikStili="baslik"`: 15 punto koyu başlık + isteğe bağlı gri alt satır (`altBaslik`). Rapor ve özet kartları için (Giderler).
  - `baslikBosluk`: başlığın alt boşluğu (varsayılan etikette 14, başlıkta 12).
  - `baslikRengi`: `"inherit"` rengi miras alır.
  - `style`: yalnız kaba eklenir (flex payı, sıfır dolgu gibi yerleşim ayarları).
  - Başlıksız kullanım yalnız kaptır.

**Ne zaman kullanılır:** Ayarlar'da her bölüm (`ayar`); bir ekranda içeriği gruplayan her beyaz kart (`kart`).

**Ne zaman kullanılmaz:**
- Tek bir sayıyı öne çıkaran özet kartı: `StatCard` / `StatKart`.
- Pencere içeriği: `Modal`.
- Tablo satırı ya da liste öğesi.

**Örnek:** `src/components/settings/SettingsCompany.jsx:109` (ayar, katlanabilir)
**Örnek:** `src/components/settings/SettingsKKKomisyon.jsx:54` (ayar, geniş)
**Örnek:** `src/components/Documents.jsx:1111` (kart, etiket başlık)
**Örnek:** `src/components/gider/DonemRaporu.jsx:67` (kart, başlık + alt satır)

## BosDurum

Boş durum kutusu: listelenecek kayıt yokken gösterilen, kesikli kenarlıklı, ortalanmış kutu.

- `baslik`, `metin`, isteğe bağlı `eylemler` (düğmeler), `testId`

**Ne zaman kullanılır:** bir rapor, liste ya da görünüm hiç satır üretmiyorsa (sıfır tutarlı tablo yerine); veri
girilmemiş bir dönem seçildiyse. Mümkünse eylem (ör. "Yeni Gider") verin.

**Ne zaman kullanılmaz:**
- Arama ya da süzgeç sonucu boşsa, tablonun içindeki kısa bir satır yeterlidir.
- Hata için: `UyariSeridi` ya da `HataMetni`.

**Örnek:** `src/components/Giderler.jsx:207`

## UyariSeridi

Uyarı şeridi: ekranın üstünde ya da bir bölümün başında, renkli zeminli bilgi satırı. `role="status"`.

- `aile`: `"bilgi"` (mavi), `"uyari"` (amber), `"basari"` (yeşil). **Tanımsız bir değer hata vermez, `bilgi` ailesine düşer.**
- `baslik` (kalın), isteğe bağlı `metin` (açıklama satırı), `testId`.
- `children`: serbest içerik (spec 0011, aşağıya bakın).
- Kırmızı (hata) ailesi yoktur.

**Ne zaman kullanılır:** işlemin sonucunu bildirmek (`basari`), kullanıcının dikkat etmesi gereken ama işi durdurmayan
bir durum (`uyari`), eksik kurulum ya da yönlendirme (`bilgi`).

**Ne zaman kullanılmaz:**
- Bir form alanının hatası: `HataMetni`.
- Kısa süreli geri bildirim: bildirim (toast).
- Onay isteyen durum: `ConfirmDialog`.

**Örnek:** `src/components/Giderler.jsx:183`

### Serbest içerik (spec 0011)

**Varsayılan biçim başlık artı açıklamadır.** Şerit ayrıca `children` ile serbest içerik alır:
`<UyariSeridi aile="bilgi">Firmaya göre gruplu görünüm: <b>{n} firma</b> ({m} makina kaydı). …</UyariSeridi>`.

- Serbest içerik ailenin koyu (800) tonuyla çizilir: `blu800`, `amb800`, `grn800`. Cümle içindeki `<b>` bu rengi miras alır.
- Kap aynıdır: zemin, kenarlık, köşe, dolgu, `role="status"` ve `testId`. Tanımsız aile burada da `bilgi`'ye düşer.
- `children` verilince (boş değer değilse: `null`, `undefined`, `false`, `""` dışında) `baslik` ve `metin` **yok sayılır**; iki biçim birleştirilmez.

**Ne zaman kullanılır:** yalnız vurgulanan parça **cümlenin ortasında** duruyorsa ve cümle kalın başlık + açıklama satırı
olarak yeniden yazılamıyorsa (ör. "… **12 firma** (15 makina kaydı) …"). Kullanıcının bugün gördüğü cümle korunarak
şerite taşınırken.

**Ne zaman kullanılmaz:**
- Uyarı bir başlık ve açıklamaya bölünebiliyorsa: varsayılan biçim (`baslik`, `metin`).
- Şeridin içine kendi düzenini kurmak için (liste, tablo, düğme satırı, ayrı renkli parçalar): serbest içerik bir düzen kapısı değildir. Böyle bir ihtiyaç yeni bir yapı taşı sorusudur ve kendi işinde tartışılır.
- Renk değiştirmek için: aile dışında renk verilmez.

İlk kullanım: spec 0010 (Müşteriler ekranındaki gruplu görünüm şeridi).

## HataMetni

Alanın hemen altında kırmızı hata metni. `role="alert"`, boş içerikte hiç çizilmez.

**Ne zaman kullanılır:** doğrulama hatası olan bir alanın altında; kayıt neden yapılamadıysa onu söyleyen kısa cümle.

**Ne zaman kullanılmaz:**
- Ekran düzeyindeki durumlar: `UyariSeridi`.
- Eski ekranlardaki `Warn` (⚠ önekli) bileşeni bilinen borçtur; yeni ekranda kullanmayın.

**Örnek:** `src/components/CalisanManager.jsx:193`

## Ipucu

Alanın altında küçük gri açıklama. Boş içerikte çizilmez.

**Ne zaman kullanılır:** bir alanın ne işe yaradığını ya da seçimin sonucunu bir cümleyle anlatmak için.

**Ne zaman kullanılmaz:**
- Uzun açıklama için: bölümün açıklama paragrafı.
- Uyarı niteliğinde bilgi için: `UyariSeridi`.

**Örnek:** `src/components/CalisanManager.jsx:192`

---

## Bilinen borç

Aşağıdakiler aynı fikrin **kapsam dışı** ya da **görünüşü farklı** kopyalarıdır. Spec 0009 bunlara bilerek dokunmadı;
her biri ilgili ekranın dönüşüm işinde karara bağlanır.

### Kapsam dışı ekranlardaki kopyalar

- `src/components/Analiz.jsx` → `Chip` (`aria-pressed`'li dolu turuncu pil düğmesi): Segment'in üçüncü kopyası.
- Filtre pilleri:
  - Finans: `src/components/Finance.jsx`, tarih aralığı düğmeleri.
  - Müşteriler: `src/components/Customers.jsx`, süzgeç pilleri.
  - Stok: `src/components/stock/YedekParcaSatisTab.jsx`, süzgeç pilleri.
- `src/components/ui.jsx` → `Warn` (`warn-msg` sınıfı, ⚠ öneki, eski ekranlarda alan uyarısı): HataMetni'nin eski karşılığı.
- `src/components/Documents.jsx` → Belge Detayları, Ürünler ve Teklif Koşulları kartları: aynı `kart` görünümü, satır içi. **İlk dönüşüm adayları.**
- `src/components/documents/FaturaFormModal.jsx` → beş kart (Alıcı Bilgileri, Fatura Bilgileri, Ürünler, Paketleme, Banka / Hesap Bilgileri): aynı `kart` görünümü, satır içi. **İlk dönüşüm adayları.**
- `src/components/settings/SettingsDocuments.jsx` → `Accordion`: katlanabilir bölümün ayrı bir biçimi.

### Kapsam içindeki yakın kopyalar (görünüşü farklı, taşınmadı)

- `src/components/GiderForm.jsx` → mükerrer personel uyarısı (amber, 12.5 punto, başlık satır içi) ve kırmızı
  "Kayıt yapılmadı" kutusu (`role="alert"`; kırmızı aile yok).
- `src/components/settings/SettingsGider.jsx` → eşik uyarısı (amber, `role="alert"`).
- `src/components/gider/GiderAlanlari.jsx` → atama alanının gri bilgi kutusu (nötr aile yok).
- `src/components/gider/KdvKarsilastirmaKarti.jsx` → "karşılaştırma yapılamıyor" kesikli kutusu (10 köşe, gri zemin).
- `src/components/gider/MakinaMaliyetDetay.jsx` → "Gider verisi girilmemiş" kesikli bilgi kutusu.
- `src/components/gider/MakinaKarliligi.jsx` → boş durum kartı (`karlilik-bos`; kesiksiz, KartBolum kabıyla).
- `src/components/Giderler.jsx` → "Hatırlatma kapsamı" aç/kapa düğmesi (`aria-pressed`).

### Erişilebilirlik borcu

- `KartBolum` `kart` varyantının **etiket başlığının** kontrastı düşük: aydınlıkta 2.56, karanlıkta 2.98. WCAG AA 4.5 ister.
- Segment'in pasif seçenek metni sınırda: aydınlıkta 4.34, karanlıkta 4.32.
- Bugünkü görünüm bunlar; değiştirmek tema ve erişilebilirlik işidir (spec 0009 X4, X6). Ayrı iş önerilir.
