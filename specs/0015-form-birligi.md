# 0015 — Form Birliği

| | |
|---|---|
| **Durum** | Onaylandı (2026-09-25, plan `specs/0015-uygulama-plani.md` F1–F12 ile) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteri, bayi, servis, Extra Kalıp, yedek parça, makina stoğu, parça stoğu, üretim formu, not ve e-posta formları |
| **Bağımlı spec'ler** | **0009** (tasarım sözlüğü) |
| **Revizyon** | R1 (2026-09-25): kapatılan **0010**'un müşteri formu payı bu spec'e devredildi — eski uyarı bileşeninden hata metnine geçişin üç bilinçli değişikliği (R2), canlı doğrulama ipuçlarının hangi bileşene gideceği (R2b), test ağının tam listesi (C3) ve kanıt altyapısının bu işin parçası olduğu (C7, DoD). R2 (2026-09-25): onay öncesi QA boşluk analizi, 0014 birleştikten sonraki koda göre; 13 açık nokta karara bağlandı — kanıt yöntemi 0014'ün taban raporu yöntemiyle güncellendi (C7), onay kutularının segmente çevrilmeyeceği yazıldı (R5), eski uyarı bileşenini taşıyan iki dosya kapsama alındı (R9, X1), alt eylem satırı yeni yapı taşı olmaktan çıkıp mevcut pencere yuvasına ve tek sıra kuralına bağlandı (R8), form bölümlerinin kartla çevrelenmeyeceği kararlaştırıldı (R4), ölçülemez kriterler kaynak taraması ve görüntü yöntemine bağlandı (AC-1/6/8/13), Context'teki dosya sayısı ve taslak şeridi listesi düzeltildi.  R3 (2026-09-25, plan onayı): kodda doğrulanan noktalar işlendi: Teslim Şekli segmenti düğme kipinde (üç test düğme rolüyle sorguluyor, R1/F1); `Warn`'u sınayan test için C3 istisnası (C3/F2); amber → kırmızı dördüncü değişiklik olarak (R2/F3); kartsız bölüm başlığı sözlükte `BolumBasligi` (R4/F4); "Stoğa Parça Ekle" alt yuva istisnası (R8/F5); ipucu ve başlık sınıflaması adlandırılmış listeyle (AC-5, AC-6/F7). R4 (2026-09-25, uygulama): `Warn`'un yerinde durduğunu denetleyen ikinci test satırı bulundu (`tasarim-kaynak.test.js` AC-18); Takım Yöneticisi C3'e ikinci istisna olarak onayladı. AC-13 görüntüleri Takım Yöneticisi tarafından onaylandı. |

---

## Intent

Veri girmek ve düzenlemek için açılan formlar uygulamanın en sık kullanılan yüzeyi, ama her biri
farklı görünüyor. Gider formu hatayı kırmızı bir uyarı satırıyla gösterip altına açıklama
yazarken, müşteri formu eski bir uyarı bileşeni kullanıyor ve açıklama hiç yok; bölüm başlıkları
kimi formda kart başlığı, kimi formda satır içi yazılmış bir metin. Kullanıcı aynı işi yaparken
her formda farklı bir dille karşılaşıyor.

Başarı şu demek: bütün formlar aynı yapı taşlarıyla çizilmiş; hata, açıklama ve bölüm başlığı her
yerde aynı görünüyor ve aynı davranıyor. Formların sorduğu sorular, doğrulama kuralları ve
kaydetme davranışı hiç değişmemiş.

---

## Requirements

- **R1.** Bütün veri girme ve düzenleme formları 0009'daki yapı taşlarıyla çizilir. Sözlük 0014 ile büyüdü
  (sayı rozeti, sekme kipi, içerik genişliği); **form içinde bunlardan yalnız varsayılanlar kullanılır**:
  segmentler hap görünümü ve eşit genişlikle çizilir, **sekme kipi formlarda kullanılmaz** (o gezinme
  içindir), sayı rozetine form içinde ihtiyaç yoktur. (R3, F1) İstisna: mevcut testlerin rol sözleşmesi düğme rolünü
  gerektirdiğinde form içi segment **düğme kipini** kullanır (Extra Kalıp ve yedek parça formlarındaki "Teslim Şekli"; üç test
  onları `getByRole("button")` ile sorguluyor).
- **R2.** Hata gösterimi **tek bileşende** toplanır: eski uyarı bileşeni (`ui.jsx` `Warn`) yerine sözlükteki
  hata metni kullanılır. **Bu geçiş üç şeyi birden değiştirir ve üçü de bilerek kabul edilir:**
  (1) eski bileşenin rolü yok, yenisi ekran okuyucuya duyuran nitelik taşır, yani bu bilgi artık duyurulur;
  (2) eski bileşenin başındaki **⚠ simgesi kalkar** (C6'nın metin değişmez kuralının bilinçli istisnası);
  (3) görünüm bir CSS sınıfından satır içi stile geçer. Rolsüz veya simgeli bir varyant için sözlüğe yeni
  seçenek eklenmez. (R3, F3) (4) Renk **amber'den kırmızıya** döner; canlı doğrulama satırları da (R2b) form açılır
  açılmaz kırmızı görünür. Bu da bilerek kabul edilir ve görsel kanıtta görünür.
- **R2b.** Bugün eski uyarı bileşeniyle yazılmış satırların bir kısmı **hata değil, canlı doğrulama
  ipucudur**: alan hiç doldurulmadan da görünürler (örneğin müşteri formunda "Satın alan adı girilmedi").
  Bunlar yine **hata metnine** geçer, çünkü bir eksikliği bildiriyorlar; sonucu R2(1) ile aynıdır, yani alan
  boşken de duyurulurlar. İpucu bileşeni yalnız gerçekten açıklama olan satırlar içindir (R3).
- **R3.** Alan altındaki açıklamalar sözlükteki ipucu metniyle verilir; bugün elle yazılmış gri açıklamalar
  ona geçer.
- **R4.** Form içindeki bölüm başlıkları **sözlükten gelen başlık biçimiyle** yazılır (kart bölümün etiket
  başlığı); satır içi elle yazılmış başlık kalmaz. **Bölümler kartla çevrelenmez:** kart varyantı kenarlık ve
  18 dolgu eklediği için uzun formlarda (servis, yedek parça) her bölümde ek kaydırma doğar. Amaç başlıkların
  birleşmesidir, pencerenin uzaması değil. Kenarlıksız bir kart seçeneği tek ihtiyaç için sözlüğe eklenmez.
  (R3, F4) Kartsız başlık için kart bölümün etiket başlığı sözlükte **`BolumBasligi`** adıyla ayrıca çağrılabilir olur;
  `KartBolum` de başlığını onunla çizer (tek tanım, yeni görünüm değil).
- **R5.** Formlarda **bugün özel bir düğme grubuyla çizilmiş** seçimler segmentli seçiciye geçer.
  **Onay kutuları onay kutusu, açılır listeler açılır liste kalır.** Kapsamdaki formlarda ikili değerler
  bugün onay kutusuyla tutuluyor (ödendi, tahsil edildi, farklı teslimat adresi, panoya gönder, servis
  durumu, parça garanti dışı) ve çoklu değerler açılır listeyle; bunları segmente çevirmek rolü, klavye
  davranışını ve mevcut testlerin sorgularını değiştirir, yani C1 ile C3'ü birlikte çiğner. Kapsamdaki
  formlarda dönüştürülecek bir düğme grubu bulunamazsa bu madde bu işte **boş geçer** ve PR özetinde
  böyle yazılır.
- **R6.** Ortak ilkeller (alan sarmalayıcı, metin kutusu, açılır liste, pencere) **değişmez**; bu iş onların
  üstündeki desenle ilgilidir.
- **R7.** **Doğrulama davranışı ve metinleri birebir korunur:** hangi alan ne zaman uyarı veriyorsa aynı
  şekilde uyarır, aynı metni gösterir, kaydetmeyi aynı durumlarda engeller.
- **R8.** Pencere alt eylem satırı tek desende toplanır, ancak **yeni bir yapı taşı yapılmaz** (0009 X5):
  kapsamdaki formlar `ui.jsx`'teki pencerenin **mevcut alt eylem yuvasını** kullanır. Sıra tek kuralla
  sabitlenir: **ikincil eylemler solda, birincil eylem en sağda** (vazgeç solda, kaydet sağda). "Aynı sıra"
  ancak böyle ölçülebilir olur. (R3, F5) İstisna: "Stoğa Parça Ekle" penceresi (`overflowVisible`, parça listesi
  pencerenin dışına açılıyor) alt yuvaya geçemez; bugünkü gövde içi satırıyla kalır, sözlükte bilinen borç olarak yazılır.
- **R9.** Kapsam şu formlardır: müşteri ekle/düzenle, bayi ekle/düzenle, servis, Extra Kalıp satışı, yedek
  parça satışı, makina stoğu, parça stoğu, üretim formu, not, e-posta gönderme, ve katalog yöneticileri
  (model, kalıp, parça, parça tipi, çalışan). Kapsama ayrıca **eski uyarı bileşenini kullanan iki dosya**
  daha girer: Ayarlar'ın e-posta ekranı ve müşteri detay modalı. İkisi de birer dokunuşluktur; alınmazlarsa
  eski bileşen uygulamada kalır, AC-1 karşılanamaz ve sözlüğün "bilinen borç" listesi kapanmaz.

---

## Constraints

- **C1.** Davranış değişikliği yasak: alanlar, doğrulama, kaydetme ve izin davranışı aynı kalır.
- **C2.** Yeni yapı taşı gerekirse sözlüğe eklenir; forma özel varyant yazılmaz.
- **C3.** Mevcut arayüz testleri değiştirilmeden geçmelidir. Gate, dokunulan formları kapsayan **bütün**
  mevcut testlerdir, seçilmiş bir alt küme değil; müşteri formu tarafında bu, sekiz müşteri testinin yanında
  o ekranı çizen diğer testleri de içerir. **Test dosyalarına dokunulmaz; `docs/evidence/kanit-eslemesi.json`
  veri dosyasına kayıt eklemek bu yasağın dışındadır ve zorunludur** (C7). (R3, F2) **İstisnalar:**
  `tests/ui/ui-primitives-classes.test.jsx`'in `Warn` bloğu; AC-1 bileşeni kaldırdığı için silinir, yerini `Warn`'un
  hiçbir yerde kalmadığını denetleyen kaynak taraması alır. (R4) `tests/tasarim-kaynak.test.js`'in AC-18 bloğundaki
  "`ui.jsx`'te `Warn` tanımı duruyor" satırı; 0014'ün `Chip` emsaliyle "`Warn` sözlüğün Ödenen borç bölümünde" denetimine çevrilir.
- **C4.** **Paylaşılan formlar dikkat ister:** servis formu aynı zamanda Servis ve Kargo Panosu ile kiosk
  kullanıcısında, Extra Kalıp formu bayi detayında, yedek parça formu dört ayrı yerden açılıyor. Bunlara
  dokunan değişiklik o ekranların testleriyle birlikte doğrulanır. **Alt eylem satırına dokunan değişiklik
  ayrıca `tests/bayi-modal-layout.test.js` ile doğrulanır:** bu test gerçek pencere genişliklerinde Electron'da
  ölçüm yapıyor (0007 R16) ve dar pencerede satırın sarma davranışını koruyor.
- **C5.** Yeni bağımlılık, CSS framework, CSS module veya styled-components eklenmez.
- **C6.** Kullanıcıya görünen metinler Türkçedir ve değişmez.
- **C7.** **Kanıt altyapısı bu işin parçasıdır.** `tests/tasarim-kaynak.test.js`, sözlüğü kullanmaya başlayan
  her dosya için kanıt eşlemesinde kayıt, o kaydın ekranının görüntü aracında iki temada hatasız çizimi ve
  JPEG'inin depoda durmasını şart koşar. Dönüştürülen her form **görüntü aracına eklenir**
  (`scripts/evidence`). **Yöntem 0014'te oturdu:** araç bir çıkış klasörü ile karşılaştırılacak klasörü alır;
  dönüşüm önce/sonra raporu üretir (`<spec>-piksel-raporu.json`), kayıtlar `beklenen: "degisti"` + `onay` ile
  açılır ve spec `done`'a taşınırken `ayni`ye çevrilip onaylanan yeni görünümü taban alan rapora bağlanır
  (`<spec>-taban-piksel-raporu.json`). Aracın adı ya da öneki değiştirilmez.

### KAPSAM DIŞI

- **X1.** Gider formu ve Ayarlar'ın **katalog yöneticileri ile e-posta ekranı dışındaki** form ekranları —
  *neden:* gider tarafı zaten sözlüğü kullanıyor, kalan Ayarlar ekranları ise kendi düzenlerinde tutarlı.
  Katalog yöneticileri ve e-posta ekranı eski uyarı bileşenini taşıdıkları için kapsam içindedir (R9).
- **X2.** Form alanlarının eklenmesi, kaldırılması veya yeniden sıralanması — *neden:* ürün kararı.
- **X3.** Doğrulama kurallarının iyileştirilmesi — *neden:* davranış değişikliği; kendi işini hak eder.
- **X4.** Evrak belgesi formu (teklif, proforma, fatura düzenleme) — *neden:* kendine özgü ve çok satırlı bir
  düzenleyici; ayrı ve büyük bir iş, ayrıca 0006 ile yeni elden geçti.
- **X5.** Yazdırma çıktıları — *neden:* ekran tasarımıyla ilgisi yok.
- **X6.** Erişilebilirlik iyileştirmesi — *neden:* mevcut nitelikler korunur, yenisi ayrı iştir. Tek istisna,
  hata bileşeninin zaten taşıdığı duyurma niteliğidir (R2).

---

## Context

- **İlkeller zaten ortak.** Alan sarmalayıcı, metin kutusu, açılır liste ve pencere bileşenleri hem eski hem
  yeni formlarda aynı (`src/components/ui.jsx`). Yani bu iş sıfırdan bir form altyapısı kurmak değil,
  üstteki deseni birleştirmek.
- **Fark üç yerde.** Yeni formlar sözlükten hata metni, ipucu ve segmentli seçici alıyor
  (`GiderForm.jsx`); eski formlar ise eski uyarı bileşenini kullanıyor ve bölüm başlığını satır içi yazıyor
  (`customers/CustomerAddEditForm.jsx:95` gibi).
- **Eski uyarı bileşeninin kullanımları kaynak taramasıyla bulunur**; sayı sabit değildir ve zamanla
  değişmiştir (bu spec yazılırken on iki sanılıyordu, bugün **on dört** dosya): müşteri formu ve **müşteri
  detay modalı**, bayi ekranı, servis formu, Extra Kalıp formu, yedek parça tarafındaki **makina stoğu ve
  parça stoğu alt ekranları**, model, kalıp, parça, parça tipi ve çalışan yöneticileri, e-posta formu ve
  **Ayarlar'ın e-posta ekranı**. R2'nin gerçek boyutu bu; iş başlarken tarama tekrarlanır.
- **Taslak geri yükleme şeridi dört dosyada var** (`useFormDraft` kullananlar): Evrak belgeleri (kapsam
  dışı, X4), müşteri listesi ve müşteri detay modalı, ve şeridin kendisi ortak bileşende. AC-12 bu formlar
  için geçerlidir.
- **Paylaşılan formlar zinciri.** Servis formu müşteri detayından, Servis ve Kargo Panosu'ndan ve kiosk
  kullanıcısından; Extra Kalıp formu müşteri detayından ve bayi kartından; yedek parça formu Stok'tan, panodan,
  müşteri ve bayi detayından açılıyor. C4 bu yüzden var.

Bilinen tuzaklar:

- **Sessiz doğrulama kayması.** Uyarı bileşenini değiştirirken koşul yanlışlıkla değişirse form, olmaması
  gereken bir durumda kaydetmeye izin verir. R7 ve C3 bunu yakalar.
- **Kiosk'un unutulması.** Servis formuna dokunan bir değişiklik, yalnız servis sekmesi açık olan kiosk
  kullanıcısında farklı davranabilir; o kullanıcıda bazı bölümler izin gereği gizli.
- **Pencere boyu.** Bölüm başlıklarını kart bölüme çevirmek dolguyu artırır; uzun formlar (servis, yedek
  parça) daha çok kaydırma gerektirebilir. Kabul edilebilir, ama görsel kanıtta görülmeli.

---

## Acceptance Criteria

- **AC-1.** Kapsamdaki formların hepsinde hata gösterimi sözlükteki hata bileşeninden gelir; eski uyarı
  bileşeni **uygulamanın hiçbir yerinde** kalmaz (R9'a eklenen iki dosya dâhil) ve `ui.jsx`'ten kaldırılır.
  Doğrulama kaynak taramasıyla yapılır.
- **AC-2.** Hata metinleri bugünkü metinlerin aynısıdır.
- **AC-3.** Bir alan bugün hangi durumda uyarı veriyorsa dönüşümden sonra da aynı durumda uyarı verir.
- **AC-4.** Kaydetmenin engellendiği durumlar değişmez; bugün kaydedilebilen bir form dönüşümden sonra da
  kaydedilebilir, engellenen engellenir.
- **AC-5.** Alan açıklamaları ipucu bileşeniyle gösterilir ve metinleri değişmez. (R3, F7) "Alan açıklaması" uygulama
  planındaki adlandırılmış listeyle sabitlenir (dosya:satır, metin, karar); test o listeyi denetler.
- **AC-6.** Form bölüm başlıkları sözlükten gelen başlık biçimiyle çizilir ve bölümler kartla
  çevrelenmez (R4); kapsamdaki dosyalarda bölüm başlığı çizen yerel blok kalmadığı **kaynak taraması
  testiyle** gösterilir.
- **AC-7.** Bugün özel düğme grubuyla çizilmiş bir seçim varsa segmentli seçiciyle çizilir ve aynı değerleri
  üretir. Onay kutuları onay kutusu, açılır listeler açılır liste kalır: rolleri, klavye davranışları ve
  mevcut testlerin sorguları değişmez.
- **AC-8.** Pencere alt eylem satırı, pencerenin mevcut alt eylem yuvasını kullanır ve düğmeler tek kurala
  uyar: ikincil eylemler solda, birincil eylem en sağda. Düğme metinleri değişmez; dar pencerede satır
  bugünkü gibi sarar.
- **AC-9.** Servis formu müşteri detayından, Servis ve Kargo Panosu'ndan ve kiosk kullanıcısından açıldığında
  aynı biçimde çalışır.
- **AC-10.** Extra Kalıp formu müşteri detayından ve bayi kartından aynı biçimde çalışır.
- **AC-11.** Yedek parça formu dört açılış noktasında da aynı biçimde çalışır.
- **AC-12.** Taslak geri yükleme şeridi olan formlarda (Context'te sayılanlar) o davranış korunur.
- **AC-13.** Karanlık temada hata, ipucu ve bölüm başlıkları okunabilir; doğrulama 0014'ün yöntemiyle
  yapılır (aynı pencere boyutunda, iki temada önce ve sonra görüntüsü; kararı Takım Yöneticisi verir).
- **AC-14.** Mevcut arayüz testleri değiştirilmeden geçer; servis panosu ve kiosk testleri dâhil.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Eski uyarı bileşeninin uygulamada kalmadığı ve `ui.jsx`'ten kaldırıldığı **kaynak taraması testiyle**
      gösterildi (AC-1); sözlüğün "bilinen borç" listesinden bu madde düşürüldü.
- [ ] Paylaşılan formlara dokunan değişiklikler servis panosu ve kiosk testleriyle birlikte doğrulandı (C4).
- [ ] Mevcut test dosyalarına dokunulmadı (C3).
- [ ] Dönüştürülen formlar görüntü aracına eklendi; üretilecek ekran anahtarları: `musteri-formu`,
      `musteri-formu-hata`, `bayi-formu`, `servis-formu`, `kalip-formu`, `yedek-parca-formu`,
      `makina-stok-formu`, `parca-stok-formu`, `uretim-formu`, `not-formu`, `eposta-formu`,
      `katalog-model`, `katalog-calisan`. Sözlüğü kullanmaya başlayan her dosya için
      `kanit-eslemesi.json`'a kayıt eklendi; spec `done`'a taşınırken kayıtlar `ayni`ye çevrilip taban
      raporuna bağlandı (C7).
- [ ] Kapsamdaki formların önce ve sonra görüntüleri eklendi (yan yana küçültülmüş JPEG artı
      `<önek>-piksel-raporu.json`), hata ve boş
      durumlar dâhil.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
