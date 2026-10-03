# 0069 — Electron 44 ve Şifreli SQLite Sürücüsünün Yükseltilmesi

| | |
|---|---|
| **Durum** | Tamamlandı (commit `fccc0ca` denetim düzeltmeleri, `251c545` yükseltme; dal `feat/0069-electron-44`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Electron kabuğu, yerel (native) SQLite sürücüleri, bütün Electron testleri, kurulum paketi ve otomatik güncelleme |
| **Bağımlı spec'ler** | yok (bakım işi); 0064 ve 0065'in Electron testlerini kapsar |
| **Revizyon** | 2 · 2026-10-03 TY kararları: açılır liste kısalması kabul (AC-24), görüntü aracı karşılaştırması düzeltildi, paketleme `npmRebuild: false` + kullanılmayan platform ikilileri dışarıda (R19, R20), otomatik güncelleme yerel sunucuyla (R10). Revizyon 1: denetim betiği (R5, AC-4), Electron testi 11 (R7, AC-6), R2 kararı, R16–R18 |

---

## Intent

İki bağımlılık **major** sürüm atlıyor ve ikisi de aynı yere dokunuyor:

- `electron` **42.11.5 → 44.4.4** (iki major; Chromium ve Node sürümü değişir, yerel modül ABI'si değişir)
- `better-sqlite3-multiple-ciphers` **12.11.1 → 13.0.3** (veritabanı sürücüsü)

Bunlar ayrı iki Dependabot PR'ı (#33 ve #32) olarak duruyor, ama **ayrı ayrı yapılamaz**: Electron
majoru zaten yerel modüllerin yeniden derlenmesini zorunlu kılıyor, yani birini aldığınızda ötekini de
yeniden kurmuş oluyorsunuz. İkisini tek dalda, tek seferde denemek gerekiyor.

Bu bir özellik işi değil, bakım işi. Yine de spec yazılıyor, çünkü dokunduğu yer kullanıcıya **sessizce**
bozuk gidebilecek tek yer: veritabanı sürücüsü, kurulum paketi ve otomatik güncelleme. Bir özellikte hata
ekranda görünür; burada hata, kurulu sürümde açılmayan bir uygulama ya da sessizce şifresiz açılan bir
veritabanı olarak görünür.

Başarı şu demek: iki sürüm yükseldi, bütün testler ve elle denemeler geçti, kurulum paketi kuruldu ve
açıldı, **şifreli sürücünün gerçekten yüklendiği kanıtlandı**, geri dönüş yolu yazılı.

---

## Requirements

### A. İş bir bütündür

- **R1.** İki yükseltme **tek dalda** yapılır; ayrı ayrı birleştirilmez.
- **R2.** Yedek sürücü `better-sqlite3` ile şifreli sürücü `better-sqlite3-multiple-ciphers` arasındaki
  sürüm ilişkisi bilinçli olarak kararlaştırılır: ikisi de 13'e çıkarılır ya da yedek sürücünün 12'de
  kalması gerekçesiyle yazılır. İkisinin farklı majorda olması kazara olmaz. **Karar: ikisi de 13.0.3.**
  13 sürümleri N-API'ye geçti ve sekiz platformun hazır ikilisini (Windows x64 dahil) paketin içinde taşıyor;
  yükleyici önce bu ikiliyi kullanır, Electron ABI'sine bağlı derleme gerekmez. 12'de kalan yedek sürücü her
  Electron majorunda yeniden derleme ve hazır ikili indirme (`prebuild-install`) isterdi; iki kardeş farklı yükleme
  modelinde kalırdı. Kurulumdan `prebuild-install` zinciri (24 paket) kalktı.
- **R3.** Kurulum sonrası yeniden derleme (`postinstall` ve `scripts/ensure-native.cjs`) temiz çalışır;
  elle onarım adımı gerektirmez.

### B. Şifreli sürücü sessizce düşmemeli

- **R4.** **Bu işin en kritik maddesi.** Veritabanı katmanı bugün şifreli sürücüyü yüklemeye çalışıyor,
  yüklenemezse yalnız bir konsol uyarısıyla **şifresiz sürücüye düşüyor**. Yükseltmeden sonra şifreli
  sürücünün gerçekten yüklendiği **kanıtlanır**; "uygulama açıldı" kanıt sayılmaz.
- **R5.** Kanıt elle gözle değil, çalıştırılabilir bir denetimle alınır. **Uygulamada bulundu:** bugünkü yerel
  modül denetim betiği (`scripts/ensure-native.cjs`) şifreli sürücüyü bellek içi veritabanında `PRAGMA key` ile
  deniyordu; sürücü orada anahtarı reddettiği için ("Setting key not supported for in-memory or temporary databases")
  şifreli sürücü 12 sürümünde de her çalışmada sağlıksız sayılıyordu, betik hiçbir zaman kanıt üretmedi. TY onayıyla
  düzeltildi: deneme geçici bir dosyada yapılır, anahtarsız açılışın reddedildiği de sınanır; `--denetle` kipi yeniden
  derlemeden iki sürücünün sonucunu yazar ve sağlıksızsa 1 ile çıkar (`tests/ensure-native.test.js`). Ayrıca
  `scripts/tests/db-encryption.cjs` uygulamanın veritabanı katmanının açılıştan sonra şifreli sürücünün yerel ikilisini
  yüklediğini, düz sürücünün hiç yüklenmediğini ve düşüş uyarısı yazılmadığını denetler.
- **R6.** Şifreli ve şifresiz sürücünün ikisi de Electron altında yüklenebilir durumda olmalıdır
  (yedek yol çalışmaya devam etmeli).

### C. Kapsam: nereler denenecek

- **R7.** **Bütün Electron testleri** geçer: veritabanı gidiş-dönüşü, temiz kurulum, sunucu güvenliği,
  görüntü iyileştirme, güvenlik temizliği, ilk yönetici kilidi, bayi penceresi yerleşimi, süzgeç
  yerleşimi, gider tanımı yerleşimi, form penceresi yerleşimi, dönem raporu yerleşimi ve (revizyon 1) yerel modül
  denetimi (`tests/ensure-native.test.js`); toplam on bir dosya.
- **R8.** Electron dışı bütün testler ve kod denetimi (lint hata sayısı sıfır, tip denetimi temiz) geçer.
- **R9.** **Elle denenecekler** (test kapsamayan, kurulu sürümde görünen yollar): veritabanı açılışı,
  sunucu kipinde giriş, bir kaydın yazılıp okunması, yazdırma önizleme penceresi, Servis Panosu'nun ayrı
  penceresi, harita sekmesi, dosya yükleme.
- **R10.** **Kurulum paketi üretilir, kurulur ve açılır.** Otomatik güncelleme yalnız paketlenmiş sürümde
  çalıştığı için güncelleme akışı da paketlenmiş sürümde denenir.
- **R11.** Chromium ve Node majoru değiştiği için ana süreç, önyükleme (preload) ve IPC dosyaları
  **kaldırılmış ya da davranışı değişmiş API** kullanımına karşı taranır.
- **R12.** Paketleyicinin (electron-builder) bu Electron sürümünü desteklediği doğrulanır.

- **R16.** (Revizyon 1) Yükseltme araç zincirini de kapsar: kurulu `node-abi` 4.31.0 Electron 44'ü tanımıyordu
  ("Could not detect abi for version 44.4.4"); `@electron/rebuild` ABI'yi ondan okuduğu için kurulum sonrası yeniden
  derleme ve paketleme düşerdi. Kilit dosyasında 4.35.0'a (ABI 149) yükseltilir. PR #33 bunu içermiyordu.
- **R17.** (Revizyon 1) Kullanıcıların bugünkü veritabanları 12 sürümüyle şifrelidir; 13'ün onları açtığı ve geri
  dönüş için 13'ün yazdığı dosyayı 12'nin açtığı uygulamanın veritabanı katmanıyla denenir.
- **R18.** (Revizyon 1, 2) Electron 43'ten beri açma/kaydetme diyalogları klasör verilmezse İndirilenler'de açılır.
  Kaydetme diyaloglarımız yalnız dosya adı verir; Windows'ta elle denendi: yedek kaydetme diyaloğu bugünkü gibi son
  kullanılan klasörde (Masaüstü) açıldı, görünen değişiklik yok. Klasör hiç verilmeyen açma diyalogları (geri yükleme,
  dosya ekleme, yedek klasörü) İndirilenler'de açılabilir; koda davranış eklenmez (C1).
- **R19.** (Revizyon 2) Paketleme yerel modülleri yeniden derlemez (`build.npmRebuild: false`): 13 sürümlerinin Windows
  ikilisi pakette hazır gelir, Mac'te Windows için kaynaktan derleme ("node-gyp does not support cross-compiling native
  modules from source") yapılamaz. Derleme gerektiren yeni bir yerel modül eklenirse bu ayar yeniden düşünülür.
- **R20.** (Revizyon 2) Windows dışındaki yedi platformun sürücü ikilileri pakete girmez (`build.files` dışlama
  satırları; paket 138,1 MB yerine 125,2 MB). Kurulu uygulama yalnız `prebuilds/win32-x64.node`'u yükler. Dışlama
  `win` bölümüne yazılınca üst düzey dosya seçimi geçersiz kalıp bütün depo pakete giriyordu (426 MB); üst düzeydedir.
- **R21.** (Revizyon 2) Görüntü aracı (`scripts/evidence/0009-ekran.cjs`) karşılaştırmada canlı görüntüyü de PNG'den okur:
  Electron 43'ten beri `toBitmap()` renkleri sRGB'ye normalleştirir, canlı görüntü ile dosya farklı dönüşümden geçip
  sahte milyonlarca piksel fark üretiyordu.

### D. Geri dönüş ve kayıt

- **R13.** Bir adım patlarsa iş durur; iki bağımlılığı ayırıp tek tek denemek **ayrı bir karardır** ve
  Takım Yöneticisi verir.
- **R14.** Yükseltme birleştirilmeden önce **geri dönüş yolu** yazılı olur: hangi sürümlere dönülecek ve
  dönüşte hangi komut çalıştırılacak (yerel modüllerin yeniden derlenmesi dahil).
- **R15.** Sürüm notuna girecek metin hazırlanır; kullanıcı tarafında görünen bir değişiklik yoksa bu da
  yazılır.

---

## Constraints

- **C1.** **Davranış değişmez.** Bu iş hiçbir ekranı, hesabı, alanı ya da izni değiştirmez; yalnız altyapı
  sürümü yükselir.
- **C2.** Veritabanı şeması değişmez, göç yoktur, yedek biçimi değişmez.
- **C3.** Yerel modüllerin yeniden derlenmesi bugünkü kurulum sonrası adımla yapılır; elle derleme
  talimatı eklenmez.
- **C4.** Test atlanarak ya da bir kural gevşetilerek yeşile boyama yapılmaz. Bir test yeni sürümde
  gerçekten geçersizleştiyse nedeni yazılır.
- **C5.** Sürüm yayını bu işin parçası değildir; yükseltme main'e girer, yayın ayrı karardır.

### KAPSAM DIŞI

- **X1.** Öteki Dependabot PR'ları (nodemailer, eslint, brace-expansion, minor-patch grubu) — *neden:*
  bunlar ABI'ye bağlı değil, ayrı ve daha küçük işler. Bu dala karıştırılmaz.
- **X2.** Yeni Electron sürümünün getirdiği özelliklerin kullanılması — *neden:* C1; yükseltme ile
  özellik işi aynı dalda olmaz.
- **X3.** Veritabanı şifrelemesinin açılması ya da kapatılması — *neden:* bu işin konusu sürücünün
  **çalışır** olması, şifreleme politikası değil.
- **X4.** Node sürümünün ya da CI iş akışlarının yeniden yapılandırılması — *neden:* gerekiyorsa ayrı
  iş; gerekirse bu spec'in bulgusu olarak raporlanır.
- **X5.** Yerel modül bağımlılığından kurtulma (saf JavaScript SQLite'a geçiş gibi) — *neden:* bambaşka
  ve çok daha büyük bir iş.

---

## Context

- **Bugünkü sürümler (ölçüldü).** Kurulu: `electron` 42.11.5, `better-sqlite3` 12.11.1,
  `better-sqlite3-multiple-ciphers` 12.11.1, `electron-builder` 26.15.3. Açık PR'lar: #33 Electron'u
  44.4.4'e, #32 şifreli sürücüyü 13.0.3'e çıkarıyor. **Düz `better-sqlite3` için açık PR yok**, yani
  PR'lar olduğu gibi alınırsa iki kardeş paket farklı majorda kalır (R2 bunu karara bağlıyor).
- **Sessiz düşüş riski, bu spec'in asıl sebebi.** Veritabanı katmanı şifreli sürücüyü yüklemeyi dener,
  başarısız olursa `catch` içinde düz `better-sqlite3`'e geçer ve yalnız bir konsol uyarısı yazar.
  Uygulama **açılmaya devam eder**. Yani Electron majorundan sonra şifreli sürücünün derlemesi bozulursa
  bunu kimse fark etmez: uygulama çalışır, testler çoğunlukla geçer, yalnız şifreleme yeteneği sessizce
  kaybolur. Bu yüzden R4 "açıldı" demeyi kanıt saymıyor.
- **Araç zaten var.** `scripts/ensure-native.cjs` iki modülü de Electron altında yükleyip deniyor ve
  bozuksa yeniden derliyor; `postinstall` ve `postrelease` adımları da yeniden derlemeyi çağırıyor.
  Yani R5'in istediği kanıt yeni bir araç yazmayı değil, var olanın çıktısını rapora koymayı gerektiriyor.
- **Electron testleri on dosya.** Bu testler Electron'u gerçekten başlatıyor (yerel modül Electron
  ABI'sine derlendiği için düz Node altında yüklenmiyor) ve veritabanı, sunucu güvenliği ile beş ayrı
  yerleşim ölçümünü kapsıyor. Yerleşim testleri Chromium'da piksel ölçtüğü için **Chromium majoru
  değişince en kırılgan olanlar bunlar**; bir yerleşim testi patlarsa bu gerçek bir görünüm değişikliği
  olabilir, körlemesine eşik güncellemek yanlış olur (C4).
- **Yayın zinciri de bu sürüme bağlı.** Kurulum paketi `electron-builder` ile üretiliyor, yayın betiği
  ayrı, ve yayınlanan her sürüm bir bütünlük denetiminden geçiyor. Otomatik güncelleme yalnız kurulu
  sürümde çalışıyor, geliştirme kipinde hiç denenemiyor; bu yüzden R10 paketleme ve kurmayı şart koşuyor.
- **Zamanlama uygun.** 3.42.0 yeni yayınlandı, yani bir sonraki sürüme kadar deneme için geniş bir
  aralık var. Yükseltmeyi yayın öncesine sıkıştırmak bu işte en kötü seçenek olurdu.
- **Bu PR'ların bugünkü kırmızısı yanıltıcı.** İki PR'ın kontrolleri eski main üzerinde koştuğu için
  kırmızı; o tarihteki hata bugün main'de geçen bir testti. Dal güncellenmeden kırmızıya bakıp karar
  vermeyin.

---

## Acceptance Criteria

### Kurulum ve sürücü

- **AC-1.** İki bağımlılık tek dalda yükseltilmiştir.
- **AC-2.** Düz `better-sqlite3` ile şifreli sürücünün sürüm ilişkisi karara bağlanmış ve gerekçesi
  yazılmıştır.
- **AC-3.** Temiz kurulum (`npm install`) ek elle adım gerektirmeden tamamlanır ve yerel modüller
  derlenir.
- **AC-4.** Yerel modül denetimi (`node scripts/ensure-native.cjs --denetle`) iki sürücüyü de Electron altında
  yükleyebildiğini gösterir; şifreli sürücü sağlıksızken 1 ile çıktığı da gösterilmiştir; çıktısı rapora eklenmiştir.
- **AC-5.** Uygulama açıldığında **şifreli sürücünün** kullanıldığı kanıtlanmıştır; şifresiz yedeğe
  düşülmediği gösterilmiştir.

### Testler

- **AC-6.** On bir Electron testinin hepsi geçer (çıktısıyla).
- **AC-7.** Electron dışı bütün testler geçer.
- **AC-8.** Kod denetiminde hata sayısı sıfırdır.
- **AC-9.** Tip denetimi temizdir.
- **AC-10.** Hiçbir test atlanmamış, eşiği gevşetilmemiştir; geçersizleşen test varsa nedeni yazılıdır.

### Elle denemeler

- **AC-11.** Veritabanı açılır, bir kayıt yazılıp okunur.
- **AC-12.** Sunucu kipinde giriş yapılır ve veri kaydedilir.
- **AC-13.** Yazdırma önizleme penceresi açılır ve belge basılır.
- **AC-14.** Servis Panosu ayrı pencerede açılır, bir kart sürüklenir ve değişiklik ana pencereye geçer.
- **AC-15.** Harita sekmesi açılır ve çizim yapılır.
- **AC-16.** Dosya yükleme çalışır.

### Paketleme

- **AC-17.** Kurulum paketi üretilir.
- **AC-18.** Paket kurulur, uygulama açılır ve veritabanı yüklenir.
- **AC-19.** Paketlenmiş sürümde otomatik güncelleme akışı denenmiştir.
- **AC-20.** Paketleyicinin bu Electron sürümünü desteklediği doğrulanmıştır.

### Tarama ve kayıt

- **AC-21.** Ana süreç, önyükleme ve IPC dosyaları kaldırılmış API kullanımına karşı taranmış, bulgu
  varsa düzeltilmiştir.
- **AC-22.** Geri dönüş yolu yazılıdır (hangi sürümler, hangi komut).
- **AC-23.** Sürüm notu metni hazırlanmıştır.
- **AC-24.** Hiçbir ekran, hesap, alan ya da izin değişmemiştir. **Revizyon 2 (TY kabulü):** Chromium dar açılır
  listelerde ok işareti için yer ayırır; uzun seçenek metni okla çakışmak yerine 2–4 harf önce kesilir (gider formu ve
  ödeme penceresinin yöntem/çek seçicileri). Sürüm notuna yazılır. İlk karşılaştırmada metin kutusu tutamağında görülen 1–2
  piksel fark kapanışta yeniden çekimle çürütüldü: tutamak kararsız çiziliyor, yeni çekimler Electron 42 ile 0 piksel.
- **AC-25.** (Revizyon 1) 12 ile şifrelenmiş uygulama veritabanı 13 ile, 13 ile yazılan 12 ile açılır ve veri aynen
  okunur (R17).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → kanıt eşlemesi tabloyla gösterildi (test çıktısı ya da
      elle deneme notu).
- [x] Şifreli sürücünün yüklendiği kanıtı rapora eklendi (AC-4, AC-5).
- [x] `npm test` yeşil ve `VITEST_ELECTRON=only` ile on bir Electron testi yeşil (ikisinin de çıktısı).
- [x] `npm run lint` hata sayısı sıfır, `npm run typecheck` temiz.
- [x] Kurulum paketi üretildi, kuruldu ve açıldı; ekran görüntüsü ya da not eklendi.
- [x] Geri dönüş yolu ve sürüm notu metni yazıldı.
- [x] `CLAUDE.md` güncellendi: yeni Electron ve sürücü sürümleri, şifreli sürücünün sessiz düşüş
      davranışı ve bundan sonraki yükseltmelerde bunun kanıtlanması gerektiği.
- [x] Takım Yöneticisi onayladı. Commit, birleştirme ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | Revizyon 1: denetim betiği, R2 kararı, node-abi, veri uyumu. Revizyon 2: açılır liste kabulü, görüntü aracı, paketleme (`npmRebuild`, ikili dışlama), yerel güncelleme denemesi. |
| **Düzeltme turu sayısı** | 0 | Gözden geçirme turu olmadı; üç DUR noktası (denetim betiği, görsel fark, paketleme) TY kararıyla çözüldü. |
| **Bulgu gerçek/gürültü oranı** | 6 / 1 | Gerçek: denetim betiği hiç kanıt üretmiyordu; node-abi Electron 44'ü tanımıyordu; görüntü aracı sahte fark üretiyordu; Mac'ten Windows derlemesi düşüyordu; açılır liste kısalması; `win.files` dışlaması bütün depoyu pakete koydu (kendi hatam, ölçülünce yakalandı). Gürültü: metin kutusu tutamağı farkı (kapanışta yeniden çekimle çürütüldü). |
| **Regresyon sayısı** | 0 | 540 görüntünün 516'sı 0 piksel; 293 + 11 test dosyası yeşil; veritabanı 12 ↔ 13 iki yönde açıldı. |
| **Kaçan hata** | 0 | Henüz yayınlanmadı (C5). |

**Takım Yöneticisi onayı:** kararlar 2026-10-03 (denetim düzeltmesi, açılır liste kabulü, görüntü aracı, `npmRebuild: false`, ikili dışlama, yerel güncelleme denemesi); Windows'ta kurulum, açılış, şifreli veritabanı, elle denemeler ve otomatik güncelleme TY tarafından denendi; kapanış talimatı 2026-10-03.

**Bu spec'ten çıkarılan ders:**
- "Var olan araç kanıt üretiyor" varsayımı sınanmalı: `ensure-native` şifreli sürücüyü yıllarca sağlıksız sayıp yeniden derliyor
  ve "başarısız" yazıp yine 0 ile çıkıyordu; kimse fark etmemişti. Bir denetim ancak bozuk durumda kırmızı olduğu gösterilince
  kanıttır (ikiliyi gizleyerek, paketi kaldırarak denendi).
- Sessiz düşüşün yeri sanıldığı yer değildi: ikili bozukken `require` başarılı olur, düşüş uyarısı yalnız paket yokken çıkar.
  Denetim yüklenen yerel ikiliye (`.node`) bakmalı; yolu gerçek yol (realpath) ile karşılaştırmalı.
- Çerçeve yükseltmesinde ölçüm aracı da yükseltilir: Electron 43'ün `toBitmap()` değişikliği görüntü aracını milyonlarca sahte
  piksel farkına sürükledi. Büyük farkı görünce önce ölçümün kendisi sınanmalı (iki görüntüyü aynı yoldan okuyarak).
- Tek bir çekimdeki küçük fark değişiklik sayılmaz: tutamak farkı ikinci çekimde Electron 42 ile aynı çıktı. Fark kapanıştan
  önce yeniden çekimle doğrulanmalı.
- Paket boyutu ölçülmeden yapılandırma değişikliği bırakılmamalı: yalnız dışlama içeren platform `files` listesi bütün depoyu
  pakete koydu (426 MB) ve ancak boyut ölçülünce görüldü.
