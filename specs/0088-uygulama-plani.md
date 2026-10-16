# 0088 Uygulama Planı: Makina Maliyet Hesabı

Spec: `specs/0088-makina-maliyet-hesabi.md` (revizyon 3). Dal `feat/0088-makina-maliyeti` (0087 kapanışı `6e9355f` üstünde).

## 1. Kodda bulunanlar (spec'e ek, revizyon 3'e işlendi)

- **P1.** `ON_KOSUL_SEKMELERI` bölüm düzeyinde uygulanıyor (`serverAuth.cjs` `sekmeEngelli`); model bölümlerine önkoşul yazmak
  Ayarlar'ı olup Giderler'i olmayan kullanıcıyı kırardı. Sekme düzeyinde `SEKME_ON_KOSULLARI`.
- **P2.** `appSettings` alan düzeyinde denetleniyor (`ayarAlanEngelli`); revizyon 2'nin C9/3 sınırı yoktu, AC-6/3 ters çevrildi.
- **P3.** `makinaListesi` dışa verili ve R9/2 kümesini veriyor.
- **P4.** KAT doğrulaması `fiyatOnerisi` içinde gömülü.
- **P8.** Spec alan adlarını yazmamıştı (C7'ye işlendi).

## 2. Kararlar (TY onayı, 2026-10-16)

Spec'in "Uygulama planı kararları" tablosu (P1–P11).

## 3. Dosyalar

**Yeni:** `src/lib/makinaStandartMaliyet.js`, `src/components/MakinaMaliyeti.jsx`, `src/components/maliyet/ModelMaliyetleri.jsx`,
`PartiHesabi.jsx`, `HesapAyarlari.jsx`; testler `tests/makina-standart-maliyet-0088.test.js`, `tests/ui/makina-maliyeti-0088.test.jsx`,
`tests/ui/makina-maliyeti-0088-app.test.jsx`; fikstürler `tests/fixtures/0088-*`.

**Değişen:** `App.jsx`, `ui.jsx` (simge), `serverPermissionDefs.js`, `permissions.js`, `menuGruplari.js`, `Giderler.jsx`,
`GlobalSearch.jsx`, `GiderTurManager.jsx`, `makinaMaliyeti.js` (`katDegeriDogrula`), `serverAuth.cjs`, `db.cjs`,
`yedekPaketleri.js`, `kilitAlanlari.js`, `types.d.ts`, `db-roundtrip.cjs`, `db-clean-install.cjs`, `server-authz`, `merge`,
`gider-gizlilik`, C14'ün test dosyaları, `0009-sayfa.jsx`, `kanit-eslemesi.json`, `CLAUDE.md`, `specs/README.md`.

## 4. Adım sırası

0. Spec revizyonu 3, bu plan, dal.
1. Taban koddan fikstürler (AC-42 kıyası, AC-44 gövdeleri).
2. Saf motor ve testleri; `katDegeriDogrula`.
3. Veritabanı (dört nokta).
4. Sunucu ve izin.
5. App kabuğu, sekme, menü.
6. Görünümler.
7. Taşıma (Giderler, arama, ters çevrilen kriterler).
8. Tür silme penceresi, yedek notu, kilit kapsamı.
9. Gizlilik, tipler, görsel kanıt, belgeler; tam test ve lint.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1…AC-5, AC-7 | `ui/makina-maliyeti-0088-app`, `menu-gruplari` |
| AC-6, AC-6/2, AC-6/3 | `server-authz` 0088 bloğu |
| AC-8…AC-10, AC-12, AC-47 | motor + `ui/makina-maliyeti-0088` |
| AC-11, AC-15…AC-15/4, AC-16, AC-16/2, AC-46 | `makina-standart-maliyet-0088` |
| AC-13…AC-14/2 | motor + UI |
| AC-17, AC-17/2 | motor + `ui/makina-maliyeti-0088` (tür silme penceresi) |
| AC-18…AC-25 | motor + UI |
| AC-26…AC-33 | motor + UI |
| AC-34…AC-37/2 | `ui/uretim-partisi`, `ui/makina-maliyeti-0088-app` |
| AC-37/3 | `ui/genel-arama-0026` |
| AC-38, AC-43/3 | `yedek-paketleri-0086` testleri |
| AC-39, AC-40 | `gider-gizlilik` 0088 bloğu |
| AC-41, AC-44 | UI + `db-roundtrip` gövde fikstürü |
| AC-42, AC-42/2 | kıyas fikstürü + 0082/0083/0084 test güncellemeleri |
| AC-43, AC-51 | `db-roundtrip.cjs`, `db-clean-install.cjs`, motor taraması |
| AC-43/2, AC-45, AC-45/2 | `merge.test.js` |
| AC-48 | motor + UI |
| AC-49, AC-50 | motor taramaları |

## 6. Sapmalar ve notlar

- **S1. Taban fikstürleri.** AC-42 kıyası 0076 veri kümesiyle (`motorCiktilari` + KAT yönteminin yedi sınır değeri) taban kodla
  üretildi (`scripts/tests/0088-kiyas-fikstur.mjs` → `0088-maliyet-once.json`); `katDegeriDogrula` çıkarıldıktan sonra birebir aynı
  ölçüldü. Gövde fikstürü taban kodla Electron'da (`scripts/tests/0088-govde-fikstur.cjs` → `0088-govde-once.json`).
- **S2. Kilit alanı.** Plan P5 Hesap Ayarları formu için `ayar` alanını öngörüyordu; `AYAR_KILITLI`'daki her kimliğin bir Ayarlar paneli
  olması test şartı (0064). Form kendi alanını alır: `maliyet_ayar` (etiket "Makina Maliyeti hesap ayarları").
- **S3. Yedek notunun metni** "gider" sözcüğünü taşımaz: perde inikken yedekleme ekranında gider sözü geçmemesi 0008 AC-8 ile sabit.
- **S4. Giderler'in parti prop'ları** (`uretimPartileri`, `setUretimPartileri`) artık kullanılmadığı için hem Giderler'in imzasından hem
  App'in Giderler çağrısından kalktı (lint uyarısı); satır sayısı korunarak (sözlüğün `Giderler.jsx:<satır>` atıfları).
- **S5. Sözlük atıfları.** Giderler'den bir içe aktarma satırı kalktığı için `Giderler.jsx:303` → `:302`, `:371` → `:370`.
- **S6. Tür silme uyarısı** `HataMetni` değil `UyariSeridi` (engel değildir); `tasarim-kaynak` AC-10 `const uyari =` adını kopya şerit
  yardımcısı saydığı için değişkenler `rolUyarisi` / `katsayiUyarisi` / `davranisUyarisi`.
- **S7. 0074'ün SGK taraması:** rol uyarısı "normal dışı davranış" ile kurulur (`DAVRANIS.SGK` karşılaştırması yalnız gider.js'te).
- **S8. 0083 AC-25:** taşınan iki ekran (`giderler-uretim-partileri`, `-formu`) araçta yeni adlarıyla (`maliyet-uretim-partileri`,
  `-formu`) karşılanır; testte gerekçeli eşleme.
- **S9. Mutasyon ölçümü:** çift sayım, katsayı kilidi, App'in parti ekranına `makinaMaliyet` vermesi ve sunucu önkoşulu yakalandı;
  bilinmeyen tür kimlikli kalemin türsüz sayılması yakalanmıyordu, test eklendi.
- **S10. Görsel kanıt (P9, tam tur).** Taban `6e9355f` ↔ bu iş, 720 görüntü, çizim hatası yok. Taban kopyasından yeni ekranlar
  çıkarılırken önekleri çakışan dört eski ekran (`maliyet-detay-*`, 0002'nin maliyet detayı) da yanlışlıkla çıkmıştı; taban kodla
  ayrıca çekildi, 0 piksel. Değişen 128 görüntü (64 ekran) değişikliklere bağlı: Giderler çubuğu dört sekme (çubuk kısalınca sağ grup
  aynı satıra sığıyor, bazı ekranlarda içerik yukarı kayar), yedek paketinin yeni notu (geri yükleme penceresi uzar, içeride kaydırılır),
  menüde yeni satır, izin ekranında yeni kutu, tür silme penceresinde rol. Yeni ekran 30 görüntü. `uygulama-menu-kasali` gürültüsü
  (31/37 piksel, 0087'de de) aynı anda yeniden çekilerek ayıklandı. Taban raporu 128 görüntü, 0 fark.
- **S11. Electron yerleşim testi** (`donem-raporu-yerlesim`) de çubuğu beş sekme bekliyordu; spec 0088 notuyla dörde çevrildi.
- **S12. Triyaj (2026-10-17, beş bulgu).** (1) Parti hesabında model adı `trLower` ile eşlenir (eski motorun `modelKey` kuralı);
  modeli bulunamayan satılmış makina ne satışa ne kâra girer, kırılımda "Modeli bulunamayan" sayılır; planlı ve türetilen bulunamayan
  satırların uyarısı ayrı. (2) Pay durumu havuzdan türer (`genelK === 0` ve canlı genel tür yoksa "rolYok"); dönemde kalemi olan
  çöpteki tür rol tablosunda "(çöpte)" satırıyla görünür ve rolü değişir. (3) Planlanan adetler penceresi modeli bulunamayan adları
  "Kaldır" düğmesiyle listeler. (4) Başlangıcı gelecekte olan partide tedarik karşılaştırması yerine "Parti henüz başlamadı" ibaresi.
  (5) Spec'in revizyon 3 ile çelişen dört yeri (B-3, AC-6/2, X12, Etkilenen alanlar ve DoD'un çözücü maddesi) düzeltildi.
