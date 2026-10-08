# Tasarım Sözlüğü

Uygulamanın paylaşılan arayüz yapı taşları (spec 0009). Hepsi **`src/components/tasarim.jsx`** dosyasında tanımlıdır.
Yeni bir ekran ya da bir ekranın yeni tasarıma dönüştürülmesi bu sözlükten yapılır: aşağıdaki öğelerden birine
karşılık gelen bir şeyi ekranın içinde yeniden yazmayın, buradakini kullanın. Burada karşılığı olmayan bir öğeye
ihtiyaç varsa, onu doğuran ekranın işinde tartışın ve karar verilince buraya ekleyin.

Ortak kurallar:

- Stil satır içidir (CSS framework, CSS module, styled-components yok).
- Renkler tema değişkenlerinden gelir: `var(--token, #yedek)`. Tek istisna gölgelerdir (`rgba(...)`); temada gölge
  değişkeni yok.
- **Her `var(--ad)` `src/lib/theme.js`'te tanımlı olmalıdır** (spec 0030). Tanımsız ad hata vermez, sessizce yedek açık renge
  düşer ve karanlık temada kutuyu beyaz bırakır. Yeni bir renk gerekiyorsa temaya eklenir: aydınlık değeri bugünkü yedek
  renk (görünüm değişmesin), karanlık değeri aynı ailenin karanlık tonlarına oturur. `tests/tema-degisken.test.js` bunu her
  koşuda denetler; çalışma anında kurulan adlar (`var(--hk${n})`) o testte adıyla listelenir.
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

**Örnek:** `src/components/Giderler.jsx:279`
**Örnek:** `src/components/Documents.jsx:1112`
**Örnek:** `src/components/Customers.jsx:482` (düğme kipi, içerik genişliği, sayı rozeti)
**Örnek:** `src/components/Stock.jsx:55` (sekme kipi)
**Örnek:** `src/components/Notes.jsx:126` (düğme kipi, eşit genişlik)
**Örnek:** `src/components/PartSaleForm.jsx:321` (form içi, düğme kipi, eşit genişlik)

### Ne zaman açılır liste? (spec 0042 R10)

Segment ile `ui.jsx` `Select` (açılır liste) arasındaki seçim ölçüyle yapılır:

- **Beş ve üstü seçenek**, ya da seçenek etiketleri uzunsa (bir satıra sığmıyorsa): açılır liste (`Select`).
- **Üç ve altı**, kısa etiketli, birbirini dışlayan seçim: segment (`kip="radyo"` form içinde, `kip="dugme"` form içi
  kısa seçimde).
- Dört seçenek arada kalır: etiketler kısa ve form satırı genişse segment, dar formda açılır liste.
- **Sekme ve süzgeç çubukları her zaman segmenttir** (spec 0014 birliği), seçenek sayısı ne olursa olsun.

İlk uygulaması ödeme yöntemidir: beş seçenekli (kasa yetkisiyle ANA hedefte yedi) olduğu için ödeme satırının yöntemi
açılır listedir (`src/components/gider/OdemeGirisi.jsx`; gider formu ve ödeme penceresi aynı bileşen, spec 0053). Kalem ve
tanım düzeyindeki "Varsayılan ödeme yöntemi" spec 0053 ile kalktı. Bu kural var olan segmentlerin toplu dönüşümü
değildir (0042 X5); yeni bir seçici eklenirken uygulanır.

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
  - **Katlanma (spec 0016 G10):** `collapsible` + `defaultOpen` (iç durum) ya da denetimli `acik` + `onAcikDegis(yeni)`. Bölümü
    dışarıdan açan bir akış varsa (odak, süzgeç) denetimli kullanılır. Ok (▸/▾) başlığın solunda ayrı öğededir; başlık metni
    kendi öğesinde kalır, bu yüzden `getByText("Dosyalar (2)")` gibi sorgular çalışır. Kapalıyken yalnız başlık satırı çizilir.
  - **`eylemler`** (spec 0016 G10): başlık satırının sağındaki düğmeler (satır sarar); tıklamaları katlanmayı tetiklemez.
  - Bu iki özellik verilmediğinde çıktı öncekiyle birebir aynıdır.

**Ne zaman kullanılır:** Ayarlar'da her bölüm (`ayar`); bir ekranda içeriği gruplayan her beyaz kart (`kart`).
Spec 0016 ile:
- **Liste kabı:** tabloyu ya da liste satırlarını saran kap başlıksız `kart`tır, `style={{ padding: 0, overflow: "auto" }}`
  (Müşteriler, Bayiler, Stok, Evrak, Notlar). Liste boşsa kap çizilmez, yerine `BosDurum`.
- **Başlık biçimi ekran türüne göre (R9):** liste ekranlarının başlıklı kartları `etiket` (Finans); rapor kutuları (Analiz) ve
  detay pencerelerinin bölümleri `baslik`. Bölüm başına yeniden karar verilmez.
- Kutu bir ızgara hücresiyse ızgara konumu dış öğede kalır, kart `style={{ height: "100%" }}` ile hücreyi doldurur (Analiz).

**Ne zaman kullanılmaz:**
- Tek bir sayıyı öne çıkaran özet kartı: `StatCard` / `StatKart`.
- Pencere içeriği: `Modal`.
- Form içindeki bölümler: kartla çevrelenmez, başlık `BolumBasligi` ile (spec 0015 R4).
- Tablo satırı ya da liste öğesi.

**Örnek:** `src/components/settings/SettingsCompany.jsx:109` (ayar, katlanabilir)
**Örnek:** `src/components/settings/SettingsKKKomisyon.jsx:54` (ayar, geniş)
**Örnek:** `src/components/Documents.jsx:1107` (kart, etiket başlık)
**Örnek:** `src/components/gider/DonemRaporu.jsx:71` (kart, başlık + alt satır)
**Örnek:** `src/components/SimpleDealers.jsx:368` (başlıksız liste kabı)
**Örnek:** `src/components/SimpleDealers.jsx:554` (detay bölümü, başlık)
**Örnek:** `src/components/customers/detail/CustomerFilesSection.jsx:102` (denetimli katlanma, eylem yuvası)
**Örnek:** `src/components/customers/detail/MachineTimeline.jsx:75` (eylem yuvası, alt başlık)

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

**Örnek:** `src/components/customers/CustomerAddEditForm.jsx:142`
**Örnek:** `src/components/stock/MakinaStokTab.jsx:244` (düğmeli başlık satırında, alt boşluk 0)

## BosDurum

Boş durum kutusu: listelenecek kayıt yokken gösterilen, kesikli kenarlıklı, ortalanmış kutu.

- `baslik`, isteğe bağlı `metin` (açıklama satırı; boşsa hiç çizilmez, spec 0016 G1), isteğe bağlı `eylemler` (düğmeler), `testId`
  (uygulamadaki liste kutuları `bos-<ekran>` kimliğini taşır).
- **Tablonun yerine geçer, altına değil** (spec 0016 R1): kayıt yokken tablo, başlık satırı ve sayfalama hiç çizilmez. Liste bir
  kartın içindeyse kart başlığı kalır, tablonun yeri kutuya verilir (Finans kartları, bayi detay bölümleri, Analiz kutuları).

**Ne zaman kullanılır:** bir rapor, liste ya da görünüm hiç satır üretmiyorsa (sıfır tutarlı tablo yerine); veri
girilmemiş bir dönem seçildiyse; **arama ya da süzgeç sonucu boşsa da** (spec 0016 R1).
- "Hiç kayıt yok" ile "aramaya ya da süzgece uyan kayıt yok" ayrı durumlardır. Ekran bu ayrımı yapıyorsa iki ayrı başlık
  kullanılır ("Henüz teklif yok." / "Arama sonucu bulunamadı."); yapmıyorsa tek metin başlık olur ve ayrım yeni metin yazarak
  kazandırılmaz (spec 0016 R2). Süzgeç sonucu boşken "henüz kayıt yok" yazmak kullanıcıya verisinin silindiğini düşündürür.
- Metin ekranın bugünkü metnidir; iki cümleyse ilk cümle başlık, kalanı açıklama olur. Geliştirici açıklama metni yazmaz.

**Ne zaman kullanılmaz:**
- Hata için: `UyariSeridi` ya da `HataMetni`.
- Eylem düğmesi: uygulamanın liste kutularında düğme yoktur (spec 0016 C6, X7). Eklenirse izin kurallarına uyar, izinsiz
  kullanıcıya gösterilmez; hangi ekranda hangi düğme olacağı ürün kararıdır.
- Form içindeki boş satır listeleri (Evrak formunun satırları gibi): formun kendi işidir.

**Örnek:** `src/components/Giderler.jsx:340`
**Örnek:** `src/components/Customers.jsx:516` (iki durum, sabit açıklama, spec 0016 R6)
**Örnek:** `src/components/Documents.jsx:861` (ayrımlı ekran, yalnız başlık)

## UyariSeridi

Uyarı şeridi: ekranın üstünde ya da bir bölümün başında, renkli zeminli bilgi satırı. `role="status"`.

- `aile`: `"bilgi"` (mavi), `"uyari"` (amber), `"basari"` (yeşil), `"hata"` (kırmızı, spec 0016 G4). **Tanımsız bir değer hata
  vermez, `bilgi` ailesine düşer.**
- `baslik` (kalın), isteğe bağlı `metin` (açıklama satırı), `testId`.
- `children`: serbest içerik (spec 0011, aşağıya bakın).
- `hata` ailesi ekran düzeyindeki hata ve tükenme mesajları içindir (ör. "3 parça tükendi"); bir alanın hatası yine `HataMetni`.

**Ne zaman kullanılır:** işlemin sonucunu bildirmek (`basari`), kullanıcının dikkat etmesi gereken ama işi durdurmayan
bir durum (`uyari`), eksik kurulum ya da yönlendirme (`bilgi`).

**Ne zaman kullanılmaz:**
- Bir form alanının hatası: `HataMetni`.
- Kısa süreli geri bildirim: bildirim (toast).
- Onay isteyen durum: `ConfirmDialog`.

**Örnek:** `src/components/Giderler.jsx:306`
**Örnek:** `src/components/stock/PartStokTab.jsx:140` (hata ailesi)

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

**Örnek:** `src/components/CalisanManager.jsx:219`
**Örnek:** `src/components/customers/CustomerAddEditForm.jsx:107` (canlı doğrulama, form açılır açılmaz görünür)

## Ipucu

Alanın altında küçük gri açıklama. Boş içerikte çizilmez.

**Ne zaman kullanılır:** bir alanın ne işe yaradığını ya da seçimin sonucunu bir cümleyle anlatmak için.

**Ne zaman kullanılmaz:**
- Uzun açıklama için: bölümün açıklama paragrafı.
- Uyarı niteliğinde bilgi için: `UyariSeridi`.

**Örnek:** `src/components/CalisanManager.jsx:237`
**Örnek:** `src/components/PartSaleForm.jsx:368` (seçimin sonucunu anlatan cümle)

---

## Menü grubu (spec 0043)

Kenar çubuğunda bir **grup, aynı soruyu cevaplayan en az üç ekran biriktiğinde açılır.** İki ekranlık grup
bir satır kazandırır ve zorlama durur. İlk ve bugün tek uygulaması "Mali İşler"dir (Finans, Giderler, Kasa).

- Grup tanımı `src/lib/menuGruplari.js` `MENU_GRUPLARI`'ndadır; satır düzeni saf `menuSatirlari` üretir.
  Grup yalnız çizim katmanıdır: sekmelerin adı, kimliği ve yetkisi değişmez, grubun kendi izni yoktur.
- İzin süzmesinden sonra grupta tek ekran kalırsa grup çizilmez, ekran düz satır olur. Dar kipte (66 piksel)
  grup hiç çizilmez; yeni bir açılır kutu deseni açılmaz.
- Başlık satırı yalnız açar kapar, ekran açmaz; `aria-expanded` taşır. Kapalıyken içindeki ekran açıksa başlık
  etkin satır görünümünü alır. Açık/kapalı durumu makineye özeldir (`localStorage`).
- Alt satırlar başlığın ikon hizasından girintili, solda ince çizgiyle bağlı ve biraz küçüktür (ikon kutusu
  26 piksel).

## Pencere alt düğme satırı (spec 0045)

Form pencereleri düğmelerini `Modal`'ın `footer` yuvasına verir. **Düğmeler arasındaki boşluk kabın kendisinden gelir**
(`gap: 8`); formun kendi sarmalayıcı yazması gerekmez ve unutulması artık düğmeleri yapıştırmaz.

- Sıra: ikincil düğme (İptal / Vazgeç / Kapat) solda, birincil düğme en sağda; satır sağa hizalıdır.
- Düğmeler doğrudan (`<>…</>` parçasıyla) verilebilir. 0015'ten kalan `<div style={{ display: "flex", gap: 8 }}>`
  sarmalayıcıları zararsızdır (kabın tek çocuğu olduğu için boşluk ikiye katlanmaz) ama yeni formda gerekmez.
- Tek düğmeli pencerede kabın boşluğu görünmez.

**Örnek:** `src/components/GiderForm.jsx:149` (sarmalayıcısız iki düğme)

## Pencere boyutu (spec 0050)

Boyut sayıları **tek yerde**, `Modal`'ın varsayılanlarındadır (`ui.jsx`): dar pencere 520 × 90vh, **geniş pencere
(`wide`) 900 × 94vh**. Ekran kendi sayısını yazmaz; hangi pencerenin hangi sınıfta olduğu burada durur. Pencere dar
ekranda kendiliğinden küçülür (`width: 100%`), içerik pencerenin içinde kayar, alt düğme satırı yerinde kalır.

- **Sınıf 1, geniş (`wide`, `maxWidth`/`maxHeight` verilmez):** veri girme ve tablo pencereleri. Gider formu (yeni ve
  düzenle, kira dahil), Ödeme Kaydet, Avans Ver, Virman, Kasa hesap formu, Çeki Ciro Et ve Kendi Çekimizi Yaz, Portföye
  Çek Ekle, Tedarikçi formu, Üretim Partisi formu, Ödeme Planı, Tedarikçi/Çalışan Ekstresi. Yeni bir veri girme ya da
  tablo penceresi de bu sınıfta açılır.
- **Sınıf 2, kendi küçük boyutunda:** onay (`ConfirmDialog`), "silinemez" ve tek düğmeli bilgi pencereleri; Çek Durumu
  ve Çek Geçmişi (alınan ve verilen); bir iki alanlık kısa pencereler (Standart Gider işlemi, Tahsilat Hesap penceresi,
  varsayılan 520). Bunları genişletmek boş alan üretir.
- **Kapsam dışı:** müşteri ve bayi **detay** modalları kendi genişliğini korur (bayi 760, 0007 R16; müşteri 1080).
- Genişleyen pencerede formun sarmalayan alan satırları kendiliğinden yan yana dizilir; alan sırası ve etiketleri
  değişmez. Yerleşim `tests/form-pencere-yerlesim.test.js` ile Electron'da (1280 ve 1024 px) ölçülür, değerler
  `tests/ui/form-pencere-boyutu.test.jsx` ile.

## Tutar girdisi (spec 0045)

Kuruşlu tutar alanı `TutarInput` (`src/components/gider/GiderAlanlari.jsx`) yazarken binlik noktası gösterir, imleci
korur; biçimleme ve çözümleme yalnız `src/lib/tutarGirdisi.js`'tedir. Form durumu ham metni tutar ("80000",
"1234,56"). Oran alanı `sym="%"` ile çizilir ve ayraç almaz. Tam sayılı `MoneyInput` (`ui.jsx`) ayrıdır (0045 X1).

## Sayfalama (spec 0062)

Tanım gereği büyüyen her liste paylaşılan `Pagination` (`ui.jsx`) ve `usePagination` / `useFilteredList` kancalarıyla
sayfalanır; elle pager yazılmaz.

- **Boyut:** tam sayfa listede **10**, pencere içi listede **5**; 15 yalnız Evrak ve Parça Stoğu kadar yoğun tablolarda,
  gerekçesi yazılarak. Yeni değer uydurulmaz.
- **Kanca:** motor çıktısı ya da kendi süzme durumu olan liste `usePagination(liste, boyut, sifirlamaAnahtari)`; arama
  kutusunu hook'a bırakan liste `useFilteredList`. Süzgeç, seçim ya da dönem değişince sayfa 1'e dönmesi gereken listede
  bu değerler **sıfırlama anahtarına** yazılır (efekt ve elle `setPage(1)` yazılmaz). Aç/kapa anahtarları (personel
  grubu, "Adları göster") anahtara girmez: grup satırı herhangi bir sayfada olabilir.
- **Satır kümesi:** grup satırı olan listede çizilen satırlar sayfalanır (grup tek satır, açılınca çocukları kümeye
  girer); başlıktaki kayıt sayısı veri gerçeği olarak kalır.
- **Toplamlar ve toplu işlemler sayfaya bağlanmaz:** toplam, kart ve bakiye bütün listeden okunur; toplu düğme bütün
  listeye uygulanır ve metni "Listedeki n kayıt" der ("Görünen" denmez).
- **Boş ve tek sayfa:** liste boşsa bugünkü boş durum, tek sayfaysa çubuğu `Pagination`'ın kendisi gizler; ekranda ek
  koşul yazılmaz. Aynı ekrandaki iki liste iki ayrı sayfa durumu tutar.
- **Yazdırma ve dışa aktarma sayfalamayı görmez.**

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

### Ödenen borç (spec 0016)

- Liste ekranlarının boş satırları (tablonun altına düşen gri cümleler) `BosDurum`'a geçti; kayıt yokken tablo çizilmiyor:
  Müşteriler, Bayiler (liste ve detay), Stok'un dört alt sekmesi, Finans, Evrak, Notlar, Analiz.
- Gölgeli ve kenarlıklı yerel liste kapları, Finans'ın yerel kart başlıkları, Analiz'in yerel kutu stili (`S.panel`, `S.h2`,
  `S.bos`) ve bayi detayının büyük harfli bölüm başlıkları `KartBolum`'a geçti.
- Satır içi mesaj kutuları `UyariSeridi`'ye geçti: Müşteriler gruplu görünüm şeridi, Parça Stoğu'nun tükenen/azalan parça
  mesajları, Kalıp Üretim'in "dönem sonlandırılmış" mesajı.
- Aşama 2 (müşteri detayı): Görüşmeler, Dosyalar, Kalıplar, İşlemler, Sahiplik Geçmişi ve Makina Geçmişi `KartBolum` başlıklı
  karta; görüşme, dosya ve geçmiş boş durumları `BosDurum`'a; farklı para birimi borcu, çevrimdışı dosya uyarısı ve Yeni Sahip
  penceresinin iki mesajı `UyariSeridi`'ye geçti.

### Kapsam dışı ekranlardaki kopyalar

- `src/components/Customers.jsx` → "Firmaya Göre Grupla" aç/kapa düğmesi (mavi pil): süzgeç değil, tekil aç/kapa; sözlükte karşılığı yok (spec 0014 R1).
- `src/components/Finance.jsx` → tutar göster/gizle düğmesi (pil): süzgeç değil, tekil aç/kapa.
- `src/components/Documents.jsx` → Belge Detayları, Ürünler ve Teklif Koşulları kartları: aynı `kart` görünümü, satır içi. **İlk dönüşüm adayları.**
- `src/components/documents/FaturaFormModal.jsx` → beş kart (Alıcı Bilgileri, Fatura Bilgileri, Ürünler, Paketleme, Banka / Hesap Bilgileri): aynı `kart` görünümü, satır içi. **İlk dönüşüm adayları.**
- `src/components/settings/SettingsDocuments.jsx` → `Accordion`: katlanabilir bölümün ayrı bir biçimi.

### Kapsam içindeki yakın kopyalar (görünüşü farklı, taşınmadı)

- `src/components/SimpleDealers.jsx` → bayi detayındaki "🏭 FABRİKA — Ana üretici" ve "ANLAŞMALI SERVİS" şeritleri (kayıt türü
  etiketi, mesaj değil) ve kırmızı "Ödenmemiş Parça Borcu" paneli (tutar ve kayıt listesi taşıyan özet). Spec 0016 G5.
- `src/components/Documents.jsx` → yeşil "CRM'e Kaydet" bandı: düğme taşıyor; serbest içerik düzen kapısı değildir (spec 0016 G5).

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
  satırları ve "Sandık Etiketi" penceresinin büyük harf başlıkları (Gönderen, Alıcı, Makina): formlar; 0015 bu dosyada yalnız
  `Warn`'u, 0016 yalnız okuma bölümlerini ve iki mesajı taşıdı.
- `src/components/customers/CustomerDetailModal.jsx` → "MALİYET VE KÂR" kutusu: Giderler'in bileşeni (gider perdesi arkasında),
  yerel kart ve büyük harfle yazılmış başlık; spec 0016 kapsam dışı bıraktı.

### Erişilebilirlik borcu

- `KartBolum` başlığı bir başlık öğesi (`h2`/`h3`) değil, `div`. Analiz kutuları spec 0016'ya kadar `h2` taşıyordu; ekran okuyucunun
  başlıklar arası gezinmesi bu kutularda kalktı. Başlık düzeyi seçeneği ayrı iştir.

- `Segment` `kip="sekme"`: ok tuşuyla sekmeler arası gezinme (roving tabindex) ve `tabpanel` bağlantısı yok; yalnız nitelikler var (spec 0014 Z4).

- `KartBolum` `kart` varyantının **etiket başlığının** kontrastı düşük: aydınlıkta 2.56, karanlıkta 2.98. WCAG AA 4.5 ister.
- Segment'in pasif seçenek metni sınırda: aydınlıkta 4.34, karanlıkta 4.32.
- Bugünkü görünüm bunlar; değiştirmek tema ve erişilebilirlik işidir (spec 0009 X4, X6). Ayrı iş önerilir.
