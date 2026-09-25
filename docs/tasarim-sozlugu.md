# Tasarım Sözlüğü

Uygulamanın paylaşılan arayüz yapı taşları (spec 0009). Hepsi **`src/components/tasarim.jsx`** dosyasında tanımlıdır.
Yeni bir ekran ya da bir ekranın yeni tasarıma dönüştürülmesi bu sözlükten yapılır: aşağıdaki öğelerden birine
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
  çevrilir ve yeni görünüm taban olur (spec 0011 AC-11b, AC-11c; `tests/kanit-eslemesi.test.js`). Taban raporu, bugünkü kodun onaylı "sonra"
  görüntüleriyle karşılaştırıldığı `<spec>-taban-piksel-raporu.json`'dur (0 fark); önce/sonra raporu kanıt olarak kalır.

---

## Segment

Segmentli seçici: birbirini dışlayan 2–6 seçenekten birini seçtirir.

- `options: [{ value, label, sayi? }]`, `value`, `onChange(value)`, `ariaLabel`, `disabled`
- `kip`:
  - `"radyo"` (varsayılan): `radiogroup` + `radio` + `aria-checked`. Form içindeki seçimler (brüt/net, atama türü).
    Form içi bir segmentin düğmelerini mevcut testler rol `button` ile sorguluyorsa `"dugme"` kipi kullanılır (spec 0015 R1: Extra Kalıp ve yedek parça formlarındaki Teslim Şekli).
  - `"dugme"`: `group` + `aria-pressed`, rol `button` kalır. **Liste süzgeç çubukları** (spec 0014) ve ekranın bugünkü erişilebilirlik sözleşmesi bunu gerektiren yerler (Evrak alıcı tipi).
  - `"sekme"` (spec 0014): `tablist` + `tab` + `aria-selected`. **Gezinme alt sekmeleri** (Stok, Evrak). Ok tuşu gezinmesi ve sekme paneli bağlantısı yoktur (bilinen erişilebilirlik borcu).
- `gorunum`:
  - `"hap"` (varsayılan): gri zemin üstünde beyaz aktif hap, satır sarar.
  - `"cerceve"`: çerçeveli düğmeler; seçili olan marka kenarlıklı ve açık turuncu zeminli. Yalnız form içi iki-üç seçenek.
- `genislik` (spec 0014):
  - `"esit"` (varsayılan): düğmeler kabı eşit paylaşır (Giderler görünümleri, Notlar süzgeci).
  - `"icerik"`: kap ve düğmeler içerik kadar, dar pencerede satır sarar. Dört ve daha fazla seçenekli ya da uzun etiketli çubuklar (Müşteriler, Bayiler, Finans, Analiz, Stok ve Evrak sekmeleri).
- `sayi` (spec 0014): seçeneğin yanında sayı rozeti. Düğmenin erişilebilir adı ve metin içeriği `Etiket (n)` olarak kalır (parantezler görsel olarak gizli). **Uygulamadaki tek sayaç çözümü budur**; sayıyı etiket metnine gömmeyin.

**Ne zaman kullanılır:** görünüm değiştirme (sekme benzeri alt görünümler), iki-üç değerli form seçimleri (brüt/net,
ödendi/ödenmedi, alıcı tipi), dönem türü gibi tek seçimli filtreler, listelerin süzgeç çubukları (sayılı ya da sayısız),
ekranların alt sekmeleri (`kip="sekme"`), tarih ön ayarları (özel aralığın tarih alanları segmentin **dışında**, altında durur).

**Ne zaman kullanılmaz:**
- Seçenek çoksa (yediden fazla) ya da uzun metinliyse: `Select`.
- Birden fazla seçim yapılabiliyorsa: onay kutuları.
- Bir eylemi tetikleyen tek düğme için (aç/kapa dahil): `Btn`. Bağımsız bir aç/kapa (Müşteriler'deki "Firmaya Göre
  Grupla") tek seçimli gruba seçenek olarak sıkıştırılmaz.
- İzin süzmesi bileşene verilmez: yetkisiz seçenekleri ve "yasaklı aktif seçim → izinli ilk seçenek" kuralını ekran uygular,
  bileşene yalnız görünür seçenekler gider.
- `sekme` kipini süzgeç için, `dugme` kipini gezinme için kullanmayın; ekran okuyucu yanlış model kurar.

**Örnek:** `src/components/Giderler.jsx:166`
**Örnek:** `src/components/Documents.jsx:1112`
**Örnek:** `src/components/Customers.jsx:472` (düğme kipi, içerik genişliği, sayı rozeti)
**Örnek:** `src/components/Stock.jsx:54` (sekme kipi)
**Örnek:** `src/components/Notes.jsx:126` (düğme kipi, eşit genişlik)
**Örnek:** `src/components/PartSaleForm.jsx:312` (form içi, düğme kipi, eşit genişlik)

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
- Form içindeki bölümler: kartla çevrelenmez, başlık `BolumBasligi` ile (spec 0015 R4).
- Tablo satırı ya da liste öğesi.

**Örnek:** `src/components/settings/SettingsCompany.jsx:109` (ayar, katlanabilir)
**Örnek:** `src/components/settings/SettingsKKKomisyon.jsx:54` (ayar, geniş)
**Örnek:** `src/components/Documents.jsx:1107` (kart, etiket başlık)
**Örnek:** `src/components/gider/DonemRaporu.jsx:67` (kart, başlık + alt satır)

## BolumBasligi

Kartsız bölüm başlığı (spec 0015 R4): `KartBolum` kart varyantının etiket başlığı (küçük gri büyük harf), kart olmadan.
Tek tanımdır: `KartBolum`'un etiket başlığı da bununla çizilir.

- `children`: başlık metni (içinde küçük bir açıklama `span`'ı olabilir).
- `bosluk`: alt boşluk (varsayılan 14). `ust`: üst boşluk (varsayılan yok; ardışık form bölümleri arasında 28).

**Ne zaman kullanılır:** bir form penceresinin içinde alanları bölümlere ayırmak için (Firma Bilgileri, Makina Bilgileri,
Satış / Finans); bir form bölümünün başında, yanında düğmeler olan başlık satırında.

**Ne zaman kullanılmaz:**
- İçeriği beyaz kartla gruplayan ekran bölümleri: `KartBolum` (`kart`).
- Ayarlar bölümü: `KartBolum` (`ayar`).
- Tablo başlıkları ve alan etiketleri: bölüm başlığı değildir.
- Kenarlıksız bir `KartBolum` ile taklit edilmez.

**Örnek:** `src/components/customers/CustomerAddEditForm.jsx:138`
**Örnek:** `src/components/stock/MakinaStokTab.jsx:261` (düğmeli başlık satırında, alt boşluk 0)

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
- Uyarı için başka bir varyant (simgeli, amber) yazılmaz; eski `Warn` spec 0015'te kaldırıldı.

**Örnek:** `src/components/CalisanManager.jsx:186`
**Örnek:** `src/components/customers/CustomerAddEditForm.jsx:103` (canlı doğrulama, form açılır açılmaz görünür)

## Ipucu

Alanın altında küçük gri açıklama. Boş içerikte çizilmez.

**Ne zaman kullanılır:** bir alanın ne işe yaradığını ya da seçimin sonucunu bir cümleyle anlatmak için.

**Ne zaman kullanılmaz:**
- Uzun açıklama için: bölümün açıklama paragrafı.
- Uyarı niteliğinde bilgi için: `UyariSeridi`.

**Örnek:** `src/components/CalisanManager.jsx:195`
**Örnek:** `src/components/PartSaleForm.jsx:359` (seçimin sonucunu anlatan cümle)

---

## Bilinen borç

Aşağıdakiler aynı fikrin **kapsam dışı** ya da **görünüşü farklı** kopyalarıdır. Spec 0009 bunlara bilerek dokunmadı;
her biri ilgili ekranın dönüşüm işinde karara bağlanır.

### Ödenen borç (spec 0014)

- `src/components/Analiz.jsx` → `Chip` (`aria-pressed`'li dolu turuncu pil düğmesi): kaldırıldı, tarih ön ayarları `Segment` (düğme kipi).
- Filtre pilleri `Segment`'e taşındı:
  - Finans: `src/components/Finance.jsx`, tarih aralığı düğmeleri.
  - Müşteriler: `src/components/Customers.jsx`, süzgeç pilleri (sayı rozetiyle).
  - Bayiler: `src/components/SimpleDealers.jsx`, süzgeç pilleri (sayı rozetiyle).
  - Stok: `src/components/stock/YedekParcaSatisTab.jsx`, süzgeç pilleri (sayı rozetiyle).
  - Notlar: `src/components/Notes.jsx`.
- Stok ve Evrak'ın alt çizgili alt sekmeleri `Segment` sekme kipine taşındı.

### Ödenen borç (spec 0015)

- `src/components/ui.jsx` → `Warn` (`warn-msg` sınıfı, ⚠ öneki, amber alan uyarısı): kaldırıldı; 32 kullanımı `HataMetni`'ye
  (kırmızı, `role="alert"`, önek yok) taşındı. `.warn-msg` CSS sınıfı da kalktı.
- Form bölüm başlıkları (müşteri formu, makina stoğu formu): yerel ikonlu büyük harf blokları yerine `BolumBasligi`.
- Extra Kalıp ve yedek parça formlarındaki yerel Teslim Şekli segmentleri: `Segment` (düğme kipi).
- Kapsamdaki form pencerelerinin gövde içi eylem satırları (`form-footer-bar` dahil): pencerenin `footer` yuvası.

### Kapsam dışı ekranlardaki kopyalar

- `src/components/Customers.jsx` → "Firmaya Göre Grupla" aç/kapa düğmesi (mavi pil): süzgeç değil, tekil aç/kapa; sözlükte karşılığı yok (spec 0014 R1).
- `src/components/Finance.jsx` → tutar göster/gizle düğmesi (pil): süzgeç değil, tekil aç/kapa.
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
- `src/components/stock/PartStokTab.jsx` → "Stoğa Parça Ekle" penceresinin eylem satırı gövde içinde kalır: pencere
  `overflowVisible` (parça listesi pencerenin dışına açılır), alt yuvalı pencere gövdeyi kaydırdığı için listeyi kırpardı
  (spec 0015 R8, F5).
- `src/components/customers/CustomerDetailModal.jsx` → detayın kendi alt formlarındaki (Yeni Sahip, Ödeme) gövde içi eylem
  satırları ve büyük harf başlıkları: 0015 bu dosyada yalnız `Warn`'u taşıdı (F8); dönüşümü müşteri detayının işidir.

### Erişilebilirlik borcu

- `Segment` `kip="sekme"`: ok tuşuyla sekmeler arası gezinme (roving tabindex) ve `tabpanel` bağlantısı yok; yalnız nitelikler var (spec 0014 Z4).

- `KartBolum` `kart` varyantının **etiket başlığının** kontrastı düşük: aydınlıkta 2.56, karanlıkta 2.98. WCAG AA 4.5 ister.
- Segment'in pasif seçenek metni sınırda: aydınlıkta 4.34, karanlıkta 4.32.
- Bugünkü görünüm bunlar; değiştirmek tema ve erişilebilirlik işidir (spec 0009 X4, X6). Ayrı iş önerilir.
