# 0009: Uygulama Planı, Tasarım Sözlüğü (paylaşılan arayüz bileşenleri)

| | |
|---|---|
| **Bağlı spec** | `specs/0009-tasarim-sozlugu.md` (Taslak, R2: bu planın kararları işlendi) |
| **Durum** | 2026-09-24: T1–T12 kullanıcı tarafından onaylandı; spec R2 ile güncellendi; uygulanıyor. |
| **Önkoşul** | yok (0010 ve sonrası buna bağlanacak) |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in kodla
çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar T1–T12) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Segment | **Zaten paylaşılan bir bileşen** (`export const Segment`), yalnız yanlış yerde: `gider/GiderAlanlari.jsx`. `radiogroup` + `radio` + `aria-checked`, `disabled`, `flexWrap: "wrap"`. Kullananlar: Giderler, GiderForm, GiderAlanlari (atama), FiyatOnerisi, StandartGiderler, Tedarikçiler, Ayarlar gider ekranları | `GiderAlanlari.jsx:31-46` |
| Evrak alıcı seçicisi | İkinci kopya: `role="group"` + `aria-pressed`, çerçeveli iki düğme (seçili: marka kenarlık + `ambBg3` zemin), dış sarıcı `gap 6, marginBottom 10`, sarma yok. Testi `aria-pressed === "true"` bekliyor | `Documents.jsx:1114-1127`, `tests/ui/documents-bayi-alici.test.jsx:51` |
| Hata metni, ipucu | Zaten paylaşılan (`HataMetni`, `Ipucu`), yine `GiderAlanlari.jsx`'te. `CalisanManager` ve `FiyatOnerisi` de kullanıyor | `GiderAlanlari.jsx:23-28` |
| Boş durum | Yerel fonksiyon `bosDurum(baslik, metin, eylemler)`, `data-testid="gider-bos-durum"` **içeride sabit**; 3 çağrı | `Giderler.jsx:148-154, 214, 222, 251` |
| Uyarı şeridi | Yerel fonksiyon `uyari(renk, baslik, metin, testId)`; aileler `amber`/`yesil`/diğer = mavi (tanımsız değer zaten maviye düşüyor); 6 çağrı | `Giderler.jsx:155-158, 194-221` |
| Ayarlar bölümü | `settings/Section.jsx`: gölge `0 1px 4px rgba(0,0,0,.08)`, dolgu 24 (kapalıyken `18px 24px`), `maxWidth 720` (`wide` ile %100), ikonlu 16 punto başlık, `collapsible`/`defaultOpen`. **26 dosya içe aktarıyor, 43 kullanım** (11'i `collapsible`/`wide`) | `settings/Section.jsx` |
| Evrak kartı | `surface` zemin, 12 köşe, `n200` kenarlık, 18 dolgu; başlık 12 punto, 800 kalınlık, `n400`, büyük harf, `letterSpacing .6`, alt boşluk 14 | `Documents.jsx:1110-1111` |
| **Spec'in saymadığı kopyalar (kapsam içi)** | Gider alt görünümlerinde **aynı kart kabı** yerel sabit olarak dört kez tanımlı (`const kart`/`kutu`), ama **başlık biçimi farklı**: 15 punto koyu başlık + 12 punto gri alt satır (Evrak'taki gri büyük harf etiketten ayrı). Alt boşluk dosyaya göre 10 ya da 12, başlık rengi bir dosyada açık `n900`, ikisinde miras | `DonemRaporu.jsx:10-16`, `MakinaModelGorunumu.jsx:8-9`, `MakinaKarliligi.jsx:12-13`, `KdvKarsilastirmaKarti.jsx:10-15` |
| **Yakın kopyalar (görünümü farklı)** | Aynı fikrin görünüşü farklı sürümleri: GiderForm mükerrer uyarısı (12.5 punto, başlık satır içi), GiderForm kırmızı "Kayıt yapılmadı" kutusu (`role="alert"`, hata ailesi, X5), SettingsGider eşik uyarısı (`role="alert"`, amber), GiderAlanlari gri bilgi kutusu (nötr aile), KDV kartının kesikli boş kutusu (10 köşe, `n100` zemin), MakinaMaliyetDetay kesikli bilgi kutusu, MakinaKarlılığı boş kartı (kesiksiz) | `GiderForm.jsx:89, 137`, `SettingsGider.jsx:62`, `GiderAlanlari.jsx:145`, `KdvKarsilastirmaKarti.jsx:24`, `MakinaMaliyetDetay.jsx:45`, `MakinaKarliligi.jsx:31` |
| Evrak'taki diğer kartlar | Aynı kart üç kez daha `Documents.jsx`'te (Belge Detayları, Ürünler (başlık yanında eylem), Teklif Koşulları) ve beş kez `FaturaFormModal.jsx`'te | `Documents.jsx:1238, 1312, 1516`, `FaturaFormModal.jsx:40, 83, 119, 223, 247` |
| Kapsam dışı pil ve uyarılar | `Analiz.jsx` `Chip` (`aria-pressed`, dolu turuncu), Finans/Stok/Müşteriler süzgeç pilleri, `ui.jsx` `Warn` (`warn-msg` sınıfı, ⚠ öneki, 32 kullanım) | `Analiz.jsx:103-108`, `ui.jsx:114` |
| Tema | Renkler `src/lib/theme.js` `TOKENS` tablosundan (`[ad, aydınlık, karanlık]`, dışa aktarılıyor). Altı bileşenin kullandığı 22 token'ın hepsi tanımlı. **Gölgeler token değil**, `rgba(...)` sabit (Segment, Section) | `theme.js:13-161` |
| Karanlık tema kontrastı (ölçüldü) | Metin/zemin çiftlerinin hepsi karanlıkta aydınlıktakine eşit ya da daha yüksek, iki istisna sınırda: Segment pasif metin 4.34 → 4.32. **Evrak kart etiketi (`n400`/`surface`) iki temada da düşük: 2.56 / 2.98** (bugünkü görünüm; X4 ve X6 değiştirmeyi yasaklıyor). Kenarlıklar karanlıkta daha belirgin (1.23 → 1.30 vb.) | Hesap: `theme.js` değerleri, WCAG bağıl parlaklık |
| Yayın perdesi | Üretim derlemesinde gider ekranları perdeli; görüntü düzeneği perdeyi kaldırmalı | `lib/yayinPerdesi.js` |
| Mevcut testler | Giderler (`giderler`, `gider-form`, `dashboard-odeme-hatirlatma`, `gider-settings`, `tedarikciler`, `makina-karliligi`, `finance-gider-kdv`, `calisan-manager`), Evrak (`documents-bayi-alici`), Ayarlar (`settings-*` 8 dosya). Hiçbiri `Section`/`GiderAlanlari` dosya yolunu içe aktarmıyor; hepsi metin, rol ve `data-testid` ile sorguluyor | `tests/ui/` |

---

## 1. Mimari özet

- **Tek dosya: `src/components/tasarim.jsx`** (T1). Altı adlandırılmış-props bileşen:
  - `Segment({ secenekler, deger, onChange, ariaLabel, disabled, kip = "radyo", gorunum = "hap" })`
    - `kip`: `"radyo"` → `radiogroup` + `radio` + `aria-checked` (Giderler); `"dugme"` → `group` + `aria-pressed` (Evrak).
    - `gorunum`: `"hap"` (gri zemin, beyaz aktif hap, sarar) ya da `"cerceve"` (Evrak'ın çerçeveli düğmeleri, sarmaz).
    - Prop adları mevcut `Segment`'le uyumlu tutulur (`options`, `value`, `onChange`, `ariaLabel`, `disabled`), çağrılar değişmez; yalnız `kip` ve `gorunum` eklenir (T3).
  - `KartBolum({ varyant = "ayar", baslik, ikon, altBaslik, baslikStili, collapsible, defaultOpen, wide, style, testId, children })`
    - `ayar`: bugünkü `Section`'ın birebiri.
    - `kart`: kenarlıklı kap. Başlık `baslikStili: "etiket"` (Evrak'ın gri büyük harf etiketi) ya da `"baslik"` (gider kartlarının 15 punto başlık + alt satırı) ile çizilir; başlıksız kullanımda yalnız kap (T4).
  - `BosDurum({ baslik, metin, eylemler, testId })`
  - `UyariSeridi({ aile = "bilgi", baslik, metin, testId })`: aileler `bilgi` (mavi), `uyari` (amber), `basari` (yeşil); tanımsız değer → `bilgi` (R10). `role="status"` sabit.
  - `HataMetni({ children })` (`role="alert"`), `Ipucu({ children })`: bugünkü tanımlar taşınır.
- **Hiçbir bileşen içeride `data-testid` sabitlemez** (R9): `testId` prop'u verilirse yazılır, verilmezse nitelik hiç oluşmaz.
- **Stil değerleri bugünkü satır içi değerlerin birebir kopyası.** Hedef: dönüşüm öncesi ve sonrası ekran görüntüsünde **0 piksel fark** (T9).
- `settings/Section.jsx` silinir; `GiderAlanlari.jsx`'ten `Segment`/`HataMetni`/`Ipucu` çıkar (diğer alanlar orada kalır). Yeniden dışa aktarma (alias) bırakılmaz, çağıranların içe aktarması güncellenir (T2).

---

## 2. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/tasarim.jsx` (yeni) | Altı bileşen |
| `src/components/settings/Section.jsx` | **Silinir** (tanım `KartBolum`'a taşındı) |
| 26 Ayarlar dosyası (`Settings.jsx` + `settings/Settings*.jsx`, `GiderTurManager` dahil) | `import { Section }` → `import { KartBolum }`; `<Section` → `<KartBolum` (mekanik; 43 kullanım, props aynı) |
| `src/components/gider/GiderAlanlari.jsx` | `Segment`, `HataMetni`, `Ipucu` tanımları çıkar; kendi içindeki kullanımlar `tasarim.jsx`'ten |
| `Giderler.jsx`, `GiderForm.jsx`, `CalisanManager.jsx`, `gider/FiyatOnerisi.jsx`, `gider/StandartGiderler.jsx`, `gider/Tedarikciler.jsx`, `settings/SettingsGider.jsx`, `settings/SettingsGiderTanimlari.jsx`, `settings/GiderTurManager.jsx` | İçe aktarma yolu `tasarim.jsx` |
| `Giderler.jsx` | `bosDurum`/`uyari` yerel fonksiyonları silinir → `<BosDurum testId="gider-bos-durum" …>`, `<UyariSeridi aile=… testId=…>` (renk adları `amber`→`uyari`, `yesil`→`basari`, `mavi`→`bilgi`) |
| `gider/DonemRaporu.jsx`, `gider/MakinaModelGorunumu.jsx`, `gider/MakinaKarliligi.jsx`, `gider/KdvKarsilastirmaKarti.jsx` | Yerel `kart`/`kutu` sabiti ve `baslik` yardımcısı silinir → `<KartBolum varyant="kart" baslikStili="baslik" …>` (T4; alt boşluk ve renk farkları props ile birebir korunur) |
| `Documents.jsx` | Yalnız **Alıcı Bilgileri** kartı → `KartBolum varyant="kart" baslikStili="etiket"`; alıcı tipi seçicisi → `Segment kip="dugme" gorunum="cerceve"` (etiketler "Alıcı: Müşteri"/"Alıcı: Bayi" çağıran taraftan, temizleme mantığı çağıranda aynen) |
| `docs/tasarim-sozlugu.md` (yeni) | Sözlük: altı yapı taşı, ne zaman kullanılır / kullanılmaz, gerçek kullanım örneği (dosya:satır), bilinen borç listesi |
| `CLAUDE.md` | Tek satır atıf + "yeni ekran dönüşümleri sözlükten yapılır" |
| `scripts/evidence/0009-ekran.cjs` + `scripts/evidence/0009-sayfa.html/.jsx` (yeni) | Önce/sonra ekran görüntüsü ve piksel karşılaştırması (T9; test paketinde değil, bir kerelik araç) |
| `docs/evidence/0009-*.jpg` + `0009-piksel-raporu.json` (yeni) | Yan yana (önce \| sonra) küçültülmüş görüntüler ve piksel raporu (triyaj bulgu 3) |
| Testler (yeni): `tests/ui/tasarim.test.jsx`, `tests/tasarim-kaynak.test.js`, `tests/tasarim-kontrast.test.js`, `tests/ui/documents-alici-tipi.test.jsx` | bkz. §5 |

**Dokunulmayacaklar:** mevcut test dosyaları (C5), `Analiz.jsx`, `FaturaFormModal.jsx`, `Documents.jsx`'teki diğer üç kart,
T5'te borca yazılan yakın kopyalar, Servis Panosu ve Harita (X2).

---

## 3. Adım sırası

1. **Güvenlik ağı (önce):** görüntü düzeneği yazılır, **"önce" görüntüleri bugünkü koddan alınır** (değişiklik yapılmadan).
2. **Bileşen katmanı:** `tasarim.jsx` + birim testleri (`tasarim.test.jsx`, `tasarim-kontrast.test.js`). Hiçbir ekran henüz değişmez.
3. **Taşıma, en az riskliden en çoğa:**
   1. `HataMetni`/`Ipucu`/`Segment` (radyo + hap): yalnız içe aktarma yolu.
   2. `Giderler.jsx` `BosDurum`/`UyariSeridi`.
   3. Gider kartları (dört dosya).
   4. Evrak alıcı kartı ve alıcı tipi seçicisi (`kip="dugme"`, `gorunum="cerceve"`).
   5. `Section` → `KartBolum` (26 dosya, mekanik).

   Her alt adımdan sonra ilgili mevcut testler koşulur. Bir test kırılırsa **kod düzeltilir, test değil** (C5).
4. **Kaynak taraması testi** (`tasarim-kaynak.test.js`): tek tanım, sabit renk yok, kapsam içi kopya yok.
5. **"Sonra" görüntüleri** ve piksel karşılaştırması. Fark 0 değilse ilgili taşıma düzeltilir.
6. `docs/tasarim-sozlugu.md`, `CLAUDE.md` atfı, `documents-alici-tipi` testi.
7. Tam paket: `npm test`, `npm run lint`, `npm run build`. Ayrıca `git diff --name-status main -- tests` yalnız `A` (yeni) göstermeli (C5).

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**T1. Bileşenler nerede duracak?**
*Öneri:* yeni `src/components/tasarim.jsx`, sözlüğün birebir karşılığı. `ui.jsx` (584 satır; Btn, Modal, Field…) temel parçalar
olarak kalır. *Gerekçe:* sözlük belgesi "bu dosyadakiler" diyebilsin; `ui.jsx`'e eklemek altı yapı taşını yirmi küsur parçanın
arasına gömer. Klasör/dosya başına bileşen yapısı altı küçük bileşen için gereksiz.

**T2. `Section` → `KartBolum`: takma adla mı, gerçek yeniden adlandırmayla mı?**
*Öneri:* gerçek yeniden adlandırma (26 içe aktarma + 43 JSX, mekanik); `settings/Section.jsx` silinir, alias bırakılmaz.
*Gerekçe:* R5 "iki ayrı kart bileşeni kalmaz". Alias teknik olarak tek tanım ama sözlükte olmayan bir adı yaşatır ve sonraki
geliştirici hangisini kullanacağını sorar. Değişiklik mekanik, testler dosya yoluna bağlı değil (doğrulandı). Aynı gerekçeyle
`GiderAlanlari`'den de yeniden dışa aktarma yapılmaz.

**T3. Segment prop adları.**
*Öneri:* mevcut `options/value/onChange/ariaLabel/disabled` korunur; yeni `kip` ve `gorunum` İngilizce-Türkçe karışık olsa da
eklenir. *Gerekçe:* R3 "bugünkü props davranışı korunur; yeni kip yalnız ekleme yapar". Prop'ları Türkçeleştirmek 10+ çağrıyı
değiştirir, kazancı yok. Sözlükte açıkça yazılır.

**T4. Gider kartları spec'te sayılmamış, ama kapsam içinde ve başlıkları Evrak'tan farklı. (Spec revizyonu gerekir.)**
Dört gider dosyası aynı kartı yerel sabitle tanımlıyor ve başlığı 15 punto koyu + gri alt satır biçiminde çiziyor. R2/AC-10
"kapsam içinde ikinci tanım kalmaz" diyor; R5 ise `kart` varyantına yalnız "küçük gri büyük harf başlık" tanımlıyor.
*Öneri:* `kart` varyantı **iki başlık biçimi** taşır: `baslikStili="etiket"` (Evrak) ve `"baslik"` (Giderler, `altBaslik` ile).
Küçük farklar (alt boşluk 10/12, başlık rengi açık/miras) props ile birebir korunur. Spec R5'e bir cümle eklenir.
*Gerekçe:* dört yerel kopyayı bırakmak AC-10'u kırar; tek başlık biçimine indirmek R7'yi kırar (gider ekranlarının bütün
başlıkları değişir). Bu, var olan bir görünümün taşınmasıdır, yeni öğe değil (X5'e uyar).
*Alternatif:* gider kartlarını bilinen borç yazmak. Önermiyorum, çünkü AC-10'un açık kapsamındalar.

**T5. Yakın kopyalar (görünüşü farklı olanlar) taşınacak mı?**
*Öneri:* **yalnız birebir kopyalar** taşınır. Görünüşü farklı olan yedi yakın kopya (§0 tablosu: GiderForm'un iki kutusu,
SettingsGider eşik uyarısı, GiderAlanlari gri bilgi kutusu, KDV kartının boş kutusu, MakinaMaliyetDetay, MakinaKarlılığı boş
kartı) ve Giderler'deki "Hatırlatma kapsamı" aç/kapa düğmesi **bilinen borç** olarak sözlüğe yazılır, dokunulmaz.
*Gerekçe:* her birini paylaşılan bileşene sokmak ya görünümünü değiştirir (R7) ya da bileşene yeni bir varyant ekler (hata
ailesi, nötr aile, `role` değiştirme; X5 ve R10 bunu yasaklıyor). Bunlar ilk ekran dönüşümü işinde tek tek karara bağlanmalı.

**T6. Evrak'taki diğer kartlar (`Documents.jsx` 3, `FaturaFormModal.jsx` 5).**
*Öneri:* dokunulmaz, borç listesinde. Sözlük bunları "ilk dönüşüm adayları" diye sayar.
*Gerekçe:* spec kapsamı "Evrak'ın alıcı bölümü" (AC-10) ve C6/AC-18 kapsam dışı kopyaların değişmemesini istiyor. Aynı
dosyada dört özdeş karttan yalnız birinin paylaşılan bileşenle yazılması tuhaf görünecek; bunu bilerek kabul ediyorum,
kapsam kaymasını (spec'in üçüncü tuzağı) önlemek daha önemli.

**T7. AC-7 ve gölgeler.**
Segment aktif hapı `rgba(15,23,42,.12)`, Ayarlar bölümü `rgba(0,0,0,.08)` gölge kullanıyor; tema tablosunda gölge token'ı yok.
*Öneri:* gölgeler olduğu gibi kalır; AC-7 taraması yalnız `boxShadow` içindeki `rgba(...)`'ya izin verir ve bu istisna sözlükte
yazılır. *Gerekçe:* gölgeyi token'a çevirmek tema değişikliğidir (X4) ve karanlık temada görünümü değiştirir (R7).

**T8. AC-8 "okunabilir" nasıl ölçülecek?**
jsdom renk hesaplamıyor; ama tema değerleri `TOKENS` tablosunda. *Öneri:* saf bir test her bileşenin (metin, zemin) ve
(kenarlık, zemin) token çiftlerini karanlık ve aydınlık değerleriyle hesaplar:
- metin: **karanlık kontrast ≥ aydınlık kontrastın %95'i** (bugünkü kabul edilmiş görünüm taban alınır);
- kenarlık: iki temada da oran ≥ 1.15 (zeminden ayırt edilir).

Ölçtüm, bugünkü değerlerle hepsi geçiyor. *Gerekçe:* WCAG 4.5 eşiği koyarsam Evrak kart etiketi (2.56 / 2.98) bugün de
geçmiyor ve düzeltmek X4/X6 dışı. Bu düşük kontrast sözlüğe **bilinen erişilebilirlik borcu** olarak yazılır, ayrı iş önerilir.

**T9. Görsel kanıt (AC-12). Bu kez atlanmamasını öneriyorum.**
Önceki spec'lerde görsel kanıtı sizin kararınızla atladık. Burada R7 ("hiçbir görünüm değişmez") işin kendisi ve onu
ölçebilecek tek şey görüntü.
*Öneri:* bir kerelik Electron düzeneği (0007'deki yerleşim testi deseni, yeni bağımlılık yok):
- Gerçek bileşenleri örnek veriyle çizen bir sayfa. Perde vite takma adıyla kaldırılır.
- **Önce** görüntüleri bugünkü koddan, **sonra** görüntüleri dönüşümden sonra, 1440×900 boyutunda, aydınlık ve karanlık.
- Görüntüler `nativeImage.toBitmap()` ile bayt bayt karşılaştırılır ve **fark eden piksel sayısı** raporlanır.
- Kapsanan ekranlar: Giderler dönem raporu (dolu, boş, uyarılı), Makina ve Model, Makina Kârlılığı, Tedarikçiler, Standart
  Giderler, Gider formu, Finans KDV kartı, Evrak teklif (müşteri ve bayi alıcı), Ayarlar'dan açık, katlanmış ve `wide` birer
  bölüm, Firma Çalışanları.

Hedef her ekranda **0 piksel fark**. Görüntüler `docs/evidence/0009-*.jpg` olarak (yan yana, küçültülmüş; karşılaştırma tam çözünürlüklü PNG'lerle) yazılır, yan yana karar size (Takım Yöneticisi)
kalır. Düzenek test paketine girmez (X3: görsel regresyon altyapısı kurulmaz). *Gerekçe:* "gözle fark edilir değil"
yargısını sayıya çevirir; sessiz görünüm kayması (spec'in birinci tuzağı) başka türlü yakalanamaz.

**T10. Sözlük belgesinin doğruluğu (AC-13).**
*Öneri:* test, belgedeki her "dosya:satır" örneğinin gerçekten var olduğunu ve o satırda ilgili bileşenin adının geçtiğini
denetler. *Gerekçe:* satır numaraları kod değiştikçe kayar; denetlenmeyen örnek birkaç iş sonra yanlış yeri gösterir.

**T11. AC-3 için yeni test.**
Mevcut `documents-bayi-alici` testi bayi yönünü ve `aria-pressed`'i sınıyor, ama alıcı tipi değişince karşı alanların
temizlendiğini iki yönde sınamıyor. *Öneri:* yeni `documents-alici-tipi.test.jsx` (mevcut dosyaya dokunulmaz, C5):
- müşteri → bayi: `customerId` temizlenir;
- bayi → müşteri: `dealerId` ve `nihaiMusteriId` temizlenir.

**T12. Perde ve kapsam.**
Gider ekranları üretimde perdeli (0008); bu iş onların kodunu değiştiriyor ama kullanıcıya görünmüyor. Kullanıcının bugün
göreceği değişen yerler yalnız Evrak alıcı bölümü ve Ayarlar. Bu, T9'daki görüntülerde Ayarlar ve Evrak'ı en kritik ekranlar
yapar. Ek karar gerektirmez, bilgi için yazıyorum.

---

## 5. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>` biçiminde.

| AC | Test | Nasıl |
|---|---|---|
| AC-1 | `tasarim-kaynak.test.js` + `ui/tasarim.test.jsx` | Kaynak: `Segment` tek yerde tanımlı, `Giderler.jsx` ve `Documents.jsx` onu `tasarim.jsx`'ten içe aktarıyor, `Documents.jsx`'te `aria-pressed` elle yazılmış düğme kalmadı. Bileşen: dört `kip × gorunum` birleşimi doğru rol/nitelik ve stil |
| AC-2 | `ui/tasarim.test.jsx` + mevcut `ui/giderler.test.jsx`, `ui/documents-bayi-alici.test.jsx` | `radyo` kipinde `radiogroup`/`radio`/`aria-checked`, `dugme` kipinde `group`/`aria-pressed`; ekran düzeyinde mevcut testler değişmeden geçer |
| AC-3 | `ui/documents-alici-tipi.test.jsx` (yeni) | İki yönde temizleme (T11) |
| AC-4 | mevcut `ui/giderler.test.jsx` + `tasarim-kaynak.test.js` | `gider-bos-durum` testId'si ekranda; `BosDurum` tek tanım |
| AC-5 | `ui/tasarim.test.jsx` | Üç aile (zemin/kenarlık/başlık rengi token'ları) ve `role="status"`; mevcut `uretim-sonucu`/`mukerrer-uyari` testleri değişmeden geçer |
| AC-6 | `ui/tasarim.test.jsx` | `HataMetni` `role="alert"`, boş içerikte hiç çizilmez (bugünkü davranış) |
| AC-7 | `tasarim-kaynak.test.js` | `tasarim.jsx`'te `var(--x, #hex)` dışında `#hex` yok; `rgba` yalnız `boxShadow` içinde (T7) |
| AC-8 | `tasarim-kontrast.test.js` | T8 eşikleri, altı bileşenin bütün token çiftleri |
| AC-9 | `ui/tasarim.test.jsx` + `tasarim-kaynak.test.js` + görüntü | `KartBolum` `ayar` varsayılanı: dolgu 24 / kapalı `18px 24px`, gölge, `maxWidth 720` / `wide` %100, ikon, katlanma tıklaması; `kart` varyantı ve iki başlık biçimi. Kaynak: `settings/Section.jsx` yok, `Section` tanımı yok, başka kart kabı tanımı yok. Görüntü: Ayarlar 0 piksel fark |
| AC-10 | `tasarim-kaynak.test.js` | Kapsam içi dosya listesinde: `role="radiogroup"`, `role="status"` (yalnız bileşen üzerinden), `dashed` boş durum deseni, `const kart =`/`const kutu =`, `bosDurum(`, `uyari(` yok; T5'teki yakın kopyalar izin listesinde, adıyla |
| AC-11 | tam paket + DoD | `npm test` yeşil; `git diff --name-status main -- tests` yalnız yeni dosyalar |
| AC-12 | `scripts/evidence/0009-ekran.cjs` + `tasarim-kaynak.test.js` | T9; `docs/evidence/0009-*.jpg` + piksel fark raporu, karar Takım Yöneticisi'nde. Test: `tasarim.jsx`'i kullanan her dosya bir kanıt ekranına eşlenir, o ekran raporda iki temada çizim hatasız ve 0 farkla, JPEG'i depoda (triyaj bulgu 1, 3) |
| AC-13 | `tasarim-kaynak.test.js` | `docs/tasarim-sozlugu.md` var; altı başlığın her birinde "Ne zaman kullanılır", "Ne zaman kullanılmaz" ve doğrulanan dosya:satır örneği (T10) |
| AC-14 | `tasarim-kaynak.test.js` | `package.json` bağımlılıkları `main`'dekiyle aynı küme (test dosyasına sabit liste); `src`'de `*.module.css`, `styled-components`, `tailwind`, `@emotion` yok |
| AC-15 | mevcut `ui/documents-bayi-alici.test.jsx` (değişmeden) + `ui/tasarim.test.jsx` | `aria-pressed` `dugme` kipinde korunur |
| AC-16 | `ui/tasarim.test.jsx` | `aile="kirmizi"` ve `aile={undefined}` → hata yok, `bilgi` token'larıyla çizilir |
| AC-17 | `ui/tasarim.test.jsx` + `tasarim-kaynak.test.js` | `testId` verilmeyince hiçbir bileşende `data-testid` niteliği yok; kaynakta `data-testid="…"` sabiti yok |
| AC-18 | `tasarim-kaynak.test.js` + DoD | Sözlükteki "Bilinen borç" bölümü `Analiz.jsx Chip`, Finans/Stok/Müşteriler pilleri, `ui.jsx Warn`, `Documents.jsx` diğer üç kart, `FaturaFormModal.jsx` ve T5 yakın kopyalarını adıyla sayar; `git diff main -- src/components/Analiz.jsx src/components/documents/FaturaFormModal.jsx` boş |

**Testi olan / olmayan ekranlar (DoD):**
- Mevcut testi olan ekranlar: Giderler, GiderForm, Tedarikçiler, Makina Kârlılığı, Finans KDV kartı, Firma Çalışanları, Evrak alıcı bölümü, Ayarlar'ın 8 sekmesi.
- Yalnız görüntüyle doğrulananlar: Makina ve Model görünümü, Standart Giderler, Fiyat Önerisi ve testi olmayan Ayarlar sekmeleri. Tam liste §7 ve §8'de.

Liste PR özetinde tekrar yazılır.

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| T1 | Yer | Yeni `src/components/tasarim.jsx` |
| T2 | `Section` | Gerçek yeniden adlandırma `KartBolum`, alias yok, `settings/Section.jsx` silinir |
| T3 | Segment prop'ları | Mevcut adlar korunur, `kip` + `gorunum` eklenir |
| T4 | Gider kartları | Kapsama alınır; `kart` varyantına ikinci başlık biçimi (`baslikStili`), spec R5'e cümle |
| T5 | Yakın kopyalar | Yalnız birebir kopyalar taşınır; yedi yakın kopya bilinen borç |
| T6 | Evrak'ın diğer kartları | Dokunulmaz, borç ("ilk dönüşüm adayları") |
| T7 | Gölgeler | `rgba` gölge istisnası, sözlükte yazılı |
| T8 | AC-8 ölçüsü | Token kontrastı: karanlık ≥ aydınlığın %95'i; kenarlık ≥ 1.15; düşük etiket kontrastı borç |
| T9 | Görsel kanıt | **Bu kez alınır**: Electron önce/sonra, piksel farkı, hedef 0 |
| T10 | Sözlük örnekleri | Dosya:satır örnekleri testle doğrulanır |
| T11 | AC-3 | Yeni test dosyası |
| T12 | Perde | Bilgi; ek karar yok |

---

## 7. Uygulama notları (2026-09-24)

- **Sıra planla aynı:** önce görüntü aracı ve "önce" görüntüleri (kod değişmeden), sonra bileşenler, sonra taşıma.
- **Araç kararlılığı:** aracın kararlılığı, kod değişmeden ikinci çekim alınarak ölçüldü: 66/66 görüntüde 0 piksel fark.
  Araç, iki gider dosyasındaki başlığın **miras aldığı metin rengini** görünmez kılıyordu (sarıcı `n900` veriyordu). Sarıcıdaki
  renk kaldırıldı ve "önce" görüntüleri yeniden alındı. Bu yüzden `KartBolum`'da `baslikRengi="inherit"` var.
- **Sonuç (ilk çekim; triyaj bulgu 1 ile genişletildi, bkz. §8):** 33 ekran × aydınlık/karanlık = 66 görüntünün **hepsinde önce ve sonra arasında 0 piksel fark**.
  - Kapsanan ekranlar:
    - Giderler: dolu, boş ve türsüz, yürürlük öncesi, Makina ve Model, Makina Kârlılığı, Tedarikçiler, Standart, tarih aralığı, Gider formu.
    - Finans.
    - Evrak: müşteri ve bayi alıcı.
    - Ayarlar'ın 20 sekmesi ve katlanır bölümün açık hâli.
  - Kanıt: `docs/evidence/0009-*.jpg` (yan yana, küçültülmüş) ve `docs/evidence/0009-piksel-raporu.json`.
  - Araç: `scripts/evidence/0009-calistir.mjs` (paketle + yakala + karşılaştır), `0009-ekran.cjs`, `0009-birlestir.cjs`.
- **Spec R3 (onay sonrası, 1 revizyon):** AC-8 ölçüsü düzeltildi. Planın "karanlık ≥ aydınlığın %95'i" eşiği, çok yüksek
  kontrastlı ve okunaklı çiftleri (başlık 17.9 → 13.9) başarısız saydı. Yeni eşik: "WCAG AA (4.5) ya da aydınlığın %95'i".
- **Taşınanlar:**
  - `Segment`, `HataMetni`, `Ipucu`: `GiderAlanlari.jsx`'ten `tasarim.jsx`'e; 9 dosyanın içe aktarması güncellendi.
  - `Giderler.jsx`: 4 `BosDurum` ve 7 `UyariSeridi` kullanımı.
  - Dört gider dosyasının kartları (13 kart), Evrak alıcı kartı ve alıcı tipi seçicisi.
  - `Section` → `KartBolum`: 25 dosya, 86 etiket; `settings/Section.jsx` silindi.
- **Mevcut testler:** hiçbir test dosyası değişmedi (`git status tests` yalnız 4 yeni dosya).
- **Testi olan ekranlar:** Giderler, GiderForm, Tedarikçiler, Makina Kârlılığı, Finans KDV kartı, Firma Çalışanları, Evrak alıcı bölümü, Ayarlar'ın 8 sekmesi.
- **Yalnız görüntüyle doğrulananlar:** Makina ve Model, Standart Giderler, Fiyat Önerisi, testi olmayan Ayarlar sekmeleri (tam liste §8).
- **Sonuç:** `npm test` 179 dosya / 1902 test yeşil (Electron testleri dahil), `npm run lint` 0 hata, `npm run build` başarılı.

---

## 8. Triyaj düzeltmeleri (2026-09-24)

| # | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | Dokuz Ayarlar sekmesi (Tehlikeli Bölge, E-posta, E-posta Şablonları, Gönderilen E-postalar, Resim Optimize, Güvenlik, Sunucu, Çeviriler, 2FA) değişti ama görüntü setinde yoktu; plan tersini söylüyordu | Dokuzu ve ayrıca atlanmış `parcatipi` (Ayarlar'daki Parça Tipleri) görüntü aracına eklendi. 2FA yalnız sunucuya bağlıyken çizildiği için sahte bir istemci bağlantısıyla ayrı ekran (`ayarlar-server-istemci`) var. "Önce" görüntüleri 0009 öncesi koddan (HEAD'in geçici git worktree'si) yeniden alındı. Araç artık çöken ya da boş kalan ekranı hata sayıyor (`cizimHatasi`, çıkış kodu 1). Bu kural ilk denemede 2FA ekranının boş çizildiğini yakaladı; boş ekranlar sessizce "0 fark" veriyordu. Sonuç: **43 ekran × 2 tema = 86 görüntünün hepsinde 0 piksel fark, çizim hatası yok** | `tasarim-kaynak.test.js` "AC-12" bloğu: `tasarim.jsx`'i kullanan her dosya (38) bir kanıt ekranına eşlenir; ekranlar raporda iki temada 0 fark ve çizim hatasız, JPEG depoda. Yeni bir kullanan dosya eşleme olmadan eklenemez |
| 2 | AC-8 test eşiği `min(4.5, 0.95 × aydınlık)`, R3'ten gevşekti (aydınlığı 4.5–4.74 arası bir çift karanlıkta 4.5 altına düşebiliyordu) | Eşik açık yazıldı: `aydınlık >= 4.5 ? 4.5 : 0.95 × aydınlık` | `tasarim-kontrast.test.js`: sınır testi (aydınlık 4.6 / karanlık 4.4 artık başarısız; AA altı çiftlerde %95) |
| 3 | Depoda yalnız küçültülmüş JPEG'ler var, DoD PNG diyordu | Spec DoD `*.jpg` olarak düzeltildi; karşılaştırmanın tam çözünürlüklü PNG'lerle yapıldığı ve doğrulama için aracın yeniden çalıştırılacağı yazıldı | Bulgu 1'in testi JPEG'lerin ve piksel raporunun varlığını da denetler |

- **Testi olan ekranlar:** Giderler, GiderForm, Tedarikçiler, Makina Kârlılığı, Finans KDV kartı, Firma Çalışanları, Evrak alıcı bölümü, Ayarlar'ın 8 sekmesi.
- **Yalnız görüntüyle doğrulananlar:**
  - Giderler'in Makina ve Model, Standart Giderler görünümleri; Fiyat Önerisi.
  - Ayarlar sekmeleri: Tehlikeli Bölge, E-posta, E-posta Şablonları, Gönderilen E-postalar, Resim Optimize, Güvenlik, Sunucu (yerel ve istemci), 2FA, Çeviriler, Parça Tipleri, Modeller, Kalıplar, Yedek Parça, KDV, KK Komisyon, Evrak ve Süreçler, Takip, Dışa/İçe Aktar, Müşteri Görünümü, Servis Panosu, Uygulama.
