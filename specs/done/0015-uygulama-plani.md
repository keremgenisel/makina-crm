# 0015: Uygulama Planı, Form Birliği

| | |
|---|---|
| **Bağlı spec** | `specs/done/0015-form-birligi.md` (R3, plan onayıyla onaylandı) |
| **Durum** | Tamamlandı. 2026-09-25: F1–F12 kullanıcı tarafından onaylandı; spec R3 ve R4 ile güncellendi; kod commit `44f3911` (dal `feat/0015-form-birligi`, push ve sürüm yok). SCORECARD dolduruldu, spec ve plan `specs/done/`'a taşındı. |
| **Önkoşul** | 0009, 0011, 0014 (sözlük, kanıt eşlemesi, taban raporu yöntemi) |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in kodla
çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar F1–F12) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Eski uyarı bileşeni | `Warn` = `<div className="warn-msg">⚠ {children}</div>`, rolü yok, **amber** (`--amb700`), 11 punto | `ui.jsx:114`, `ui.css:67` |
| Kullanımlar | **14 dosya, 32 kullanım** (spec'in saydığıyla aynı). Hepsi "koşul ? metin : ''" biçiminde; müşteri detayında 11, müşteri formunda 5, bayi formunda 4 | `grep "<Warn"` |
| **Doğrudan test bağı** | `tests/ui/ui-primitives-classes.test.jsx:72-76` `Warn`'u içe aktarıp `.warn-msg` sınıfını sınıyor. AC-1 `Warn`'un `ui.jsx`'ten kaldırılmasını istiyor; bu test kırılır ve C3 test dosyasına dokunmayı yasaklıyor | test dosyası |
| Uyarı metinleri ve testler | Testlerin hiçbiri "⚠" ya da `.warn-msg` ile değil, **desenle** (`/…/`) arıyor; ⚠'nin kalkması ve rolün eklenmesi onları kırmaz. `getByRole("alert")` yalnız 0009'un bileşen testinde | `tests/` taraması |
| **Renk** | `HataMetni` kırmızı (`--red700`) ve 12 punto kalın. R2'nin saydığı üç değişikliğe bir dördüncüsü, **amber → kırmızı** ekleniyor. Canlı doğrulama satırları (ör. yeni müşteri formunda boş ad) form açılır açılmaz kırmızı görünecek | `tasarim.jsx` |
| **Form içi düğme grubu (R5 boş değil)** | Extra Kalıp ve yedek parça formlarında "Teslim Şekli" (🏭 Fabrika Teslim / 📦 Kargo) yerel bir segment kopyası; `role`/`aria` yok. **Üç test bunları `getByRole("button", { name })` ile sorguluyor** | `PartSaleForm.jsx:306-318`, `YedekParcaSatisForm.jsx:~291`, `tests/ui/yedek-parca-satis`, `yedek-parca-form-teslim`, `dis-firma-servis-kalip` |
| Bölüm başlıkları | Müşteri formunda ikonlu, 13 punto koyu, büyük harf, alt çizgili satır içi başlık; `textTransform: "uppercase"` kullanımı: müşteri formu 3, bayi ekranı 5, makina stoğu 1, parça stoğu 1, üretim formu 2 (hepsi başlık değil, sınıflanacak) | `CustomerAddEditForm.jsx:93-96` vb. |
| Sözlükte kartsız başlık | `KartBolum` `etiket` başlığı yalnız kartın içinde çizilebiliyor; **kartsız kullanmanın yolu yok** (R4 kartsız istiyor, "kenarlıksız kart seçeneği eklenmez" diyor) | `tasarim.jsx` |
| Alt eylem satırı | Üç desen: (1) pencerenin `footer` yuvası (müşteri detayı, üretim formu, çalışan yöneticisi); (2) gövdede yapışkan `.form-footer-bar` (servis, müşteri formu, model/kalıp/parça yöneticileri); (3) gövdede düz satır (Extra Kalıp, yedek parça). Sıra **zaten** her yerde İptal/Vazgeç solda, Kaydet sağda | `ui.jsx` `Modal`, `ui.css:136` |
| `footer` modunun sınırı | Alt yuvalı pencere gövdeyi kaydırır ve `overflowVisible`'ı **desteklemez**; "Stoğa Parça Ekle" penceresi `overflowVisible` kullanıyor (açılır parça listesi). R6 pencereyi değiştirmeyi yasaklıyor | `ui.jsx`, `PartStokTab.jsx:240` |
| Formlar kendi penceresini çiziyor | Servis, Extra Kalıp ve yedek parça formları `<Modal>`'ı kendileri çiziyor. Alt yuvaya geçiş, çağıran ekranlara dokunmadan dosyanın içinde yapılabilir | form dosyaları |
| İpucu adayları | Kapsamdaki dosyalarda 11–12 punto gri metin ~70 yer; hepsi alan açıklaması değil (liste meta bilgisi, tablo hücresi de var) | tarama |
| Taslak şeridi | `useFormDraft`: Documents (X4), Customers, CustomerDetailModal | `src/hooks/useFormDraft.js` |
| Kanıt | Sözlüğü **yeni** kullanacak dosyalar: müşteri formu, müşteri detayı, servis, Extra Kalıp, yedek parça, makina/parça stoğu, üretim formu, e-posta formu, model/kalıp/parça/parça tipi yöneticileri, Ayarlar e-posta. Bayi ekranı, Notlar ve çalışan yöneticisi zaten kayıtlı | `kanit-eslemesi.json` |

---

## 1. Mimari özet

- **Hata:** 32 `Warn` → `HataMetni` (aynı koşul, aynı metin). `Warn` ve `.warn-msg` kaldırılır (F2).
- **İpucu:** alan açıklaması olduğu sınıflanan gri satırlar → `Ipucu` (metin aynı) (F7).
- **Bölüm başlığı:** sözlüğe kartsız **`BolumBasligi`** eklenir. Bugünkü etiket başlığının tanımı, `KartBolum` de onu kullanacak şekilde buraya taşınır; tek tanım kalır (F4).
- **Teslim Şekli:** `Segment` `kip="dugme"`, `hap`, eşit genişlik (F1).
- **Alt eylem satırı:** kapsamdaki formlar düğmelerini kendi `<Modal>`'larının `footer` yuvasına verir. Sıra zaten kurala uyuyor (İptal/Vazgeç sol, Kaydet sağ); metinler aynı. İstisna: "Stoğa Parça Ekle" (F5).
- Doğrulama koşulları, kaydetme ve izin mantığı aynı satırlarda kalır; yalnız çizen bileşen değişir.

---

## 2. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/tasarim.jsx` | `BolumBasligi` (etiket başlığı, `KartBolum` içeride kullanır) |
| `src/components/ui.jsx`, `src/ui.css` | `Warn` ve `.warn-msg` kaldırılır (F2) |
| `customers/CustomerAddEditForm.jsx` | Hata, ipucu, bölüm başlığı, `footer` |
| `customers/CustomerDetailModal.jsx`, `settings/SettingsMail.jsx` | Yalnız `Warn` → `HataMetni` (R9, F8) |
| `ServiceForm.jsx`, `PartSaleForm.jsx`, `YedekParcaSatisForm.jsx` | Hata, ipucu, başlık, `footer`; Extra Kalıp ve yedek parçada Teslim Şekli → `Segment` |
| `SimpleDealers.jsx` (bayi ekle/düzenle formu) | Hata, ipucu, başlık, `footer` |
| `stock/MakinaStokTab.jsx`, `stock/PartStokTab.jsx`, `stock/UretimFormu.jsx` | Hata, ipucu, başlık, `footer` (Stoğa Parça Ekle hariç, F5) |
| `Notes.jsx`, `MailCompose.jsx` | Hata, ipucu, `footer` |
| `ModelsManager.jsx`, `KalipManager.jsx`, `PartManager.jsx`, `PartTypeManager.jsx`, `CalisanManager.jsx` | Hata, ipucu, `footer` (pencereli olanlarda) |
| `tests/ui/ui-primitives-classes.test.jsx` | Yalnız `Warn` bloğu kaldırılır (F2; C3 istisnası, spec revizyonu) |
| `docs/tasarim-sozlugu.md` | `BolumBasligi`; `Warn` borcu "Ödenen borç"a; formlarda `Segment` kuralı (F1) |
| `CLAUDE.md` | Sözlük satırı |
| `scripts/evidence/0009-sayfa.jsx` | DoD'deki 13 ekran + `musteri-detay` (F10) |
| `docs/evidence/0015-*`, `kanit-eslemesi.json` | Kanıt ve kayıtlar |
| Testler (yeni) | bkz. §5 |

---

## 3. Adım sırası

1. **Dal:** `feat/0014-sekme-suzgec` ucundan `feat/0015-form-birligi` (F12).
2. **Envanter** (kod değişmeden, plana ek olarak): her kapsam dosyasında
   - `Warn` satırları (32),
   - ipucu adayları (~70, sınıflanmış: ipucu / değil),
   - bölüm başlığı adayları (uppercase blokları, sınıflanmış).

   Sınıflamayı plana tablo olarak yazıp testlere bu listeyi veririm (F7).
3. **Davranış testleri önce, eski kodda yeşil** (F9): her form için doğrulama metni hangi koşulda görünüyor, kaydetme hangi durumda engelleniyor; metinler desenle, düğmeler adla sorgulanır.
4. **Önce görüntüleri** (kod değişmeden): ekranlar düzeneğe eklenir, kararlılık ölçülür, çekim yapılır.
5. **Sözlük:** `BolumBasligi` + birim testi (`KartBolum` çıktısı değişiklik öncesi HTML'le birebir).
6. **Formlar**, en az paylaşılandan en çoğa; her birinden sonra o formun mevcut testleri ve 3. adımın testleri koşulur:
   1. katalog yöneticileri;
   2. not ve e-posta;
   3. makina/parça stoğu ve üretim formu;
   4. bayi formu;
   5. müşteri formu;
   6. müşteri detayı ve Ayarlar e-posta;
   7. Extra Kalıp;
   8. yedek parça;
   9. servis (kiosk ve pano testleriyle, C4).
7. **`Warn`'un kaldırılması** + F2 test istisnası + kaynak taramaları (AC-1, AC-6).
8. `bayi-modal-layout` dahil tam Electron paketi (C4); sonra görüntüleri; sizin incelemeniz (AC-13) → `degisti` kayıtları.
9. Sözlük, `CLAUDE.md`, tam paket, lint, build; `git diff --name-status -- tests` yalnız yeni dosyalar + F2 istisnası.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**F1. Teslim Şekli hangi kipte? (R1 ile çakışıyor.)**
R1 "form içinde yalnız varsayılanlar" diyor, yani `radyo` kipi (radio rolü). Üç test bu düğmeleri
`getByRole("button", { name: /Fabrika Teslim/ })` ile sorguluyor; radio rolü onları kırar (C3).
*Öneri:* `kip="dugme"` (rol `button`, `aria-pressed`), görünüm `hap`, eşit genişlik. R1'e "form içi segmentler, mevcut testlerin
rol sözleşmesi gerektirdiğinde düğme kipini kullanabilir" istisnası eklenir.
*Gerekçe:* 0014'teki kararın aynısı; testler bugünkü rol sözleşmesini sabitliyor ve `aria-pressed` bir ekleme.

**F2. `Warn`'un kaldırılması mevcut bir testi kırıyor (AC-1 ↔ C3).**
`ui-primitives-classes.test.jsx` `Warn`'u doğrudan sınıyor.
*Öneri:* C3'e tek istisna (0014 R4 gibi): o testteki yalnız `Warn` bloğu silinir. Bileşen kalkınca test anlamsızlaşıyor;
yerine kaynak taraması `Warn`'un hiçbir yerde olmadığını denetler. `.warn-msg` CSS sınıfı da kaldırılır.
*Gerekçe:* AC-1 `Warn`'un kaldırılmasını açıkça istiyor. Kullanılmayan bir bileşeni yalnız bir test için tutmak, sözlüğün
"bilinen borç" listesini kapatmaz. Alternatif (bileşeni tutmak) AC-1'i karşılamaz.

**F3. Renk: amber → kırmızı.**
R2'nin saydığı üç değişikliğe dördüncüsü ekleniyor. Canlı doğrulama satırları (yeni müşteri formunda boş ad, bayi formunda
"En az biri seçili olmalı") form açılır açılmaz **kırmızı** görünecek.
*Öneri:* spec'in kararına uyarım: hata metnine geçer, renk kırmızı olur. Değişiklik görsel kanıtta `musteri-formu` ile açıkça
görünür, kararı AC-13'te siz verirsiniz. Spec R2'ye dördüncü madde olarak yazılır.
*Gerekçe:* R2 rolsüz ya da simgeli bir varyantı yasaklıyor; amber bir hata metni de bir varyant olurdu. Ama farkın önceden
yazılı olması gerekiyor, görüntüde sürpriz olmasın.

**F4. Kartsız bölüm başlığı (R4).**
Sözlükte etiket başlığı yalnız kartın içinde var.
*Öneri:* etiket başlığının bugünkü tanımı `BolumBasligi` adıyla dışa açılır; `KartBolum` de başlığını onunla çizer (tek tanım).
Formlar bölüm başlığını `BolumBasligi` ile yazar, kart yok.
*Gerekçe:* R4 "sözlükten gelen başlık biçimi, kartsız" istiyor ve kenarlıksız kart seçeneğini yasaklıyor. `KartBolum`'u
`style` ile kenarsız yapmak aynı yasağın dolanması olur. Yeni bir görünüm icat edilmiyor, var olan başlık ayrı çağrılabilir oluyor
(C2 "sözlüğe eklenir"). Spec R4'e bir cümle eklenir.

**F5. "Stoğa Parça Ekle" penceresi alt yuvaya geçemiyor.**
`overflowVisible` kullanıyor (parça listesi pencerenin dışına açılıyor); alt yuvalı pencere gövdeyi kaydırıyor ve bunu
desteklemiyor. R6 pencereyi değiştirmeyi yasaklıyor.
*Öneri:* bu pencere bugünkü gövde içi satırıyla kalır (sıra zaten kurala uyuyor). Sözlükte bilinen borç olarak yazılır,
kaynak taramasında adıyla istisna.
*Gerekçe:* alt yuvaya zorlamak açılır listeyi kırpar (davranış değişikliği, C1). Pencereyi değiştirmek R6 dışı ve bütün
pencereleri etkiler.

**F6. `.form-footer-bar` sınıfı.**
Kapsam dışındaki Evrak ve Ayarlar ekranları da kullanıyor.
*Öneri:* sınıf kalır; kapsamdaki formlar kullanmayı bırakır. *Gerekçe:* X1 ve X4.

**F7. İpucu ve başlık sınıflaması (AC-5, AC-6) öznel.**
~70 gri satırın hepsi alan açıklaması değil.
*Öneri:* 2. adımda her adayı plana bir tabloyla yazarım: dosya:satır, metin, karar (ipucu mu, değil mi) ve kısa gerekçe.
Kaynak taraması testi bu listeyi kullanır: "ipucu" sınıflananların metni `<Ipucu>` içinde, "başlık" sınıflananlar
`BolumBasligi` ile çizilmiş olmalı. Kural: **bir alanın hemen altında o alanı ya da seçimin sonucunu anlatan cümle ipucudur**;
liste satırı meta bilgisi, tablo hücresi, özet satırı ipucu değildir. İsterseniz tabloyu kodlamadan önce size gösteririm.
*Gerekçe:* ölçülemeyen bir "gri açıklamalar ipucuya geçer" kuralını denetlenebilir hâle getirmenin tek yolu adlandırılmış liste.

**F8. Müşteri detayı ve Ayarlar e-posta ekranında yalnız `Warn`.**
*Öneri:* bu iki dosyada yalnız `Warn` → `HataMetni` yapılır; başlık, ipucu ve alt satırlarına dokunulmaz.
*Gerekçe:* R9 ikisini "birer dokunuşluk" diye, yalnız eski bileşen yüzünden kapsama alıyor. Müşteri detayının kendi dönüşümü
0016'nın konusu.

**F9. Davranışın değişmediğinin kanıtı (AC-2, AC-3, AC-4, AC-9…12).**
*Öneri:* 0014'teki gibi davranış testleri **önce eski koda** yazılır ve yeşil geçer:
- her form: hangi alan durumunda hangi hata metni görünüyor (desenle), hangi durumda kaydetme engelleniyor, doğru girişte kayıt yapılıyor mu;
- paylaşılan formlar: servis formu müşteri detayından, panodan ve kiosk kullanıcısından; Extra Kalıp müşteri ve bayi detayından; yedek parça dört noktadan açılıp aynı alanları ve düğmeleri gösteriyor mu;
- taslak şeridi: müşteri formu ve müşteri detayında taslak kaydedilip geri yükleniyor.

*Gerekçe:* görünüm bilerek değişiyor; davranışı ancak eski kodda yeşil geçmiş testler kanıtlar.

**F10. Kanıt ekranları.**
*Öneri:*
- DoD'deki 13 ekran + `musteri-detay` (müşteri detayı sözlüğü yeni kullanacak, kaydı gerekiyor).
- Ayarlar e-posta ile kalıp, parça ve parça tipi yöneticileri için 0009'un mevcut ekranları (`ayarlar-eposta`, `ayarlar-kaliplar`, `ayarlar-yedekparca`, `ayarlar-parcatipi`) 0015 raporunda yeniden çekilir.
- Form ekranlarında pencere açılmış olarak çekilir (araç tıklama adımıyla). `musteri-formu-hata` boş formu kaydetmeye çalışılmış hâliyle çekilir.
- Onayınızdan sonra `degisti` kayıtları, `done`'da taban raporu (0014 yöntemi).

**F11. Kiosk (C4, AC-9).**
*Öneri:* servis formunun alt yuvaya geçişi pano ve kiosk yolunda da aynı. Mevcut `servis-pencere-veri`, kargo panosu ve kiosk testleri
gate'e alınır; ayrıca kiosk izinli kullanıcıyla (yalnız servis sekmesi) formun açılıp dosya bölümünün gizli kaldığı davranış
testi eklenir. *Gerekçe:* spec'in "kiosk'un unutulması" tuzağı.

**F12. Dal.**
*Öneri:* `feat/0014-sekme-suzgec` ucundan `feat/0015-form-birligi`. *Gerekçe:* 0014 henüz `main`'de değil ve 0015 onun
taban raporu yöntemine ve sözlük hâline dayanıyor.

---

## 5. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>` biçiminde. "Davranış testi" = F9'a göre önce eski kodda yeşil yazılan test.

| AC | Test | Nasıl |
|---|---|---|
| AC-1 | `tests/form-kaynak.test.js` | `src`'de `Warn` tanımı ve kullanımı yok, `warn-msg` sınıfı yok; kapsam dosyaları `HataMetni`'yi `tasarim`'dan alıyor |
| AC-2, AC-3 | `ui/form-dogrulama.test.jsx` (davranış) | Her formda her hata metni aynı koşulda görünüyor/gizleniyor; metin desenle birebir; dönüşümden sonra `role="alert"` taşıyor |
| AC-4 | aynı | Engellenen durumlar (ör. müşterisiz Extra Kalıp, adsız müşteri) kaydetmiyor ve bugünkü bildirimi veriyor; geçerli giriş kaydediyor |
| AC-5 | `tests/form-kaynak.test.js` + `ui/form-dogrulama` | F7 listesindeki "ipucu" metinleri `<Ipucu>` içinde; ekranda aynı metin |
| AC-6 | `tests/form-kaynak.test.js` | F7 listesindeki "başlık"lar `BolumBasligi` ile; kapsam dosyalarında yerel büyük harfli başlık bloğu yok; `BolumBasligi` kartsız (birim testi) |
| AC-7 | `ui/form-dogrulama` (davranış) + mevcut 3 test | Teslim Şekli iki formda aynı değerleri üretiyor (`fabrikaTeslim` true/false); rol `button` + `aria-pressed`; onay kutuları ve açılır listeler rol ve sayıca aynı (her form için öncesi/sonrası sayım) |
| AC-8 | `tests/form-kaynak.test.js` + `ui/form-eylem-satiri.test.jsx` + mevcut `bayi-modal-layout` | Kapsam formları `footer=` kullanıyor (F5 istisnası adıyla); alt yuvada son düğme birincil (Kaydet), öncekiler ikincil; metinler aynı; dar pencere sarması Electron testinde |
| AC-9 | `ui/form-paylasilan.test.jsx` (davranış) + mevcut pano/kiosk testleri | Servis formu müşteri detayı, pano ve kiosk izniyle aynı alanlar ve düğmeler; kiosk'ta dosya bölümü gizli |
| AC-10, AC-11 | aynı | Extra Kalıp iki, yedek parça dört açılış noktasında aynı alan seti ve kaydetme sonucu |
| AC-12 | `ui/form-taslak.test.jsx` (davranış) | Müşteri formu ve müşteri detayında taslak şeridi çıkıyor, geri yükleme alanları dolduruyor, vazgeç siliyor |
| AC-13 | `tests/form-kontrast.test.js` + görüntü | `BolumBasligi` ve hata/ipucu çiftleri karanlıkta 0009 ölçüsüyle; iki temada önce/sonra görüntüleri, karar sizde |
| AC-14 | tam paket + DoD | `git diff --name-status -- tests` yalnız yeni dosyalar + F2 istisnası |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| F1 | Teslim Şekli kipi | `dugme` (üç test düğme rolüyle sorguluyor); R1'e istisna |
| F2 | `Warn` testi | C3 istisnası: yalnız `Warn` bloğu silinir, yerine kaynak taraması |
| F3 | Renk | Amber → kırmızı kabul, spec R2'ye dördüncü madde; kanıtta görünür |
| F4 | Kartsız başlık | Sözlüğe `BolumBasligi` (mevcut etiket başlığı, tek tanım); R4'e cümle |
| F5 | Stoğa Parça Ekle | Gövde içi satır kalır, istisna ve borç |
| F6 | `.form-footer-bar` | Sınıf kalır (kapsam dışı kullanıcıları var) |
| F7 | İpucu/başlık sınıflaması | Adlandırılmış liste plana, testler bu listeyle; isterseniz kodlamadan önce gösteririm |
| F8 | Müşteri detayı, Ayarlar e-posta | Yalnız `Warn` → `HataMetni` |
| F9 | Davranış kanıtı | Testler önce eski kodda yeşil |
| F10 | Kanıt ekranları | DoD'deki 13 + `musteri-detay` + 0009'un dört Ayarlar ekranı |
| F11 | Kiosk | Mevcut pano/kiosk testleri gate + kiosk davranış testi |
| F12 | Dal | `feat/0014`'ten `feat/0015-form-birligi` |

---

## 7. Uygulama notları (2026-09-25)

Plandan sapmalar ve uygulamada netleşenler:

- **Alt yuvanın boşluğu.** `Modal`'ın `footer` kabı `display:flex` ama `gap` vermiyor; bazı mevcut kullanımlar düğmeleri
  parçayla (`<>…</>`) verdiği için yapışık çiziliyordu. R6 pencereyi değiştirmeyi yasakladığından düğmeler, uygulamadaki
  mevcut desenle (`UretimFormu`, `UretimSatirEkleModal`) `<div style={{ display: "flex", gap: 8 }}>` içinde verilir; yeni
  yapı taşı yok (R8). `CalisanManager`'ın parçalı alt yuvası da aynı sarmalayıcıya alındı. "Kaydedilmemiş Değişiklikler"
  (Notlar, üç düğme) bugünkü `flexWrap: "wrap"`'ı korur.
- **Kilit çakışması.** Kilit ekranı gösteren pencerelerde (makina stoğu, parça stoğu düzeltme, bayi formu) alt yuva yalnız
  kilit yokken verilir (`footer={kilit ? undefined : …}`); bugün de kilit ekranında Kaydet/İptal yoktu.
- **E-posta formu.** Alt yuva yalnız `window.appMail` varken verilir (kurulu olmayan uygulamada bugün de düğme yoktu).
  Bu yüzden `eposta-formu` kanıt ekranı (araçta `appMail` yok) 0 fark.
- **Üretim formu dokunulmadı.** `stock/UretimFormu.jsx` pencere değil, sayfa içi düzenleyici (araç çubuğu); `Warn`'u ve Ek A'da
  ipucu ya da başlığı yok, silme onayı zaten alt yuvayı kullanıyor. Plan §2'deki satır bu yüzden boş kaldı; `tasarim`'ı
  içe aktarmadığı için kanıt kaydı da gerekmiyor (`uretim-formu` ekranı 0 fark).
- **Not düzenleyicisi** pencere değil; Notlar'da yalnız "Kaydedilmemiş Değişiklikler" penceresi alt yuvaya geçti.
- **İkinci C3 istisnası (spec R4).** `tests/tasarim-kaynak.test.js` AC-18 bloğu `ui.jsx`'te `export const Warn` arıyordu.
  Takım Yöneticisi onayıyla o satır "`Warn` sözlüğün Ödenen borç bölümünde" denetimine çevrildi (0014 `Chip` emsali).
  `git diff --name-status -- tests`: bu iki değişiklik + yeni dosyalar.
- **AC-12 testi** `ui/form-taslak.test.jsx` (müşteri formunda "Yoksay", detayın servis ve Extra Kalıp taslakları);
  müşteri formunun geri yükleme adımı `ui/form-dogrulama.test.jsx`'te. İkisi de eski kodda yeşil yazıldı.
- **Teslim Şekli** artık tam genişlik hap segment (eşit, F1); bugün içerik genişliğinde, dolu turuncu seçimliydi. AC-13'te onaylandı.
- **Bölüm başlıkları** ikonsuz ve alt çizgisiz (`BolumBasligi` = etiket başlığı); ardışık bölümler arasında `ust={28}`.
- **Kanıt:** `docs/evidence/0015-piksel-raporu.json` + 36 JPEG (DoD'deki 13 ekran, `musteri-detay`, dört Ayarlar ekranı ×
  iki tema). 142 ekranlık tam çekimde 0015 dışındaki bütün ekranlar 0 fark. Değişen ekranların kayıtları `degisti` +
  `Takım Yöneticisi · 2026-09-25 · spec 0015 AC-13`; `done`'a taşınırken `0015-taban` raporuyla `ayni`ye çevrilir.
- **Açık bulgu (kapsam dışı):** Extra Kalıp ve yedek parça formlarındaki teslim ayrıntı kutusu `var(--n050, #f8fafc)`
  kullanıyor; `n050` temada tanımlı değil, kutu karanlık temada beyaz kalıyor. Dönüşümden önce de böyle; `specs/README.md`
  açık bulgulara yazıldı.

## 8. Done'a taşıma (2026-09-25, AC-11c)

- 11 `degisti` kaydı `ayni`'ye çevrildi, `onay` alanları kaldırıldı.
- Onaylanan yeni görünümü taban alan **`0015-taban-piksel-raporu.json`** üretildi:
  - bugünkü kod, onaylı "sonra" görüntüleriyle karşılaştırıldı (142 ekranlık tam çekimde hiçbir ekranda fark yok);
  - değişen 11 ekran × 2 tema = 22 görüntü raporda, hepsi 0 fark;
  - yan yana JPEG'ler `docs/evidence/0015-taban-*.jpg`.
- Kayıtlar bu raporu gösteriyor. Önce/sonra raporu (`0015-*`) kanıt olarak kalıyor.

---

## Ek A. İpucu ve bölüm başlığı envanteri (F7, 2026-09-25, dönüşüm öncesi satır numaraları)

**Kural:** bir alanın hemen altında o alanı ya da seçimin sonucunu anlatan cümle ipucudur. Liste ya da kart meta bilgisi,
tablo hücresi, özet satırı, etiketin parçası olan açıklama, satır içi (düğme yanında) not, boş durum ve bölüm açıklaması
ipucu değildir. Tarama 11–12 punto `n400`/`n500` metin ile `textTransform: "uppercase"` bloklarını buldu (77 aday).

**İpucu (12):**

| Yer | Metin (baş) |
|---|---|
| `customers/CustomerAddEditForm.jsx:230` | Manuel girilen seri no stoktan düşülmez… |
| `customers/CustomerAddEditForm.jsx:240` | Stoktan seri no seçebilmek için önce yukarıdan **Model** seçin. |
| `customers/CustomerAddEditForm.jsx:356` | Stoktan satışta stoğa giriş tarihi otomatik yazılır… |
| `customers/CustomerAddEditForm.jsx:418` | Makinenin fabrikadan satıldığı tutar… |
| `customers/CustomerAddEditForm.jsx:436` | Gerçek bedelden farklı olabilir (düşük fatura)… |
| `customers/CustomerAddEditForm.jsx:452` | Satış anında alınan kapora varsa girin… |
| `customers/CustomerAddEditForm.jsx:457` | Ödemeler detay görünümünden ("Ödeme Ekle") yönetilir. |
| `customers/CustomerAddEditForm.jsx:465` | Otomatik hesaplanır, elle değiştirilemez… |
| `ServiceForm.jsx:370` | Tanımlı yedek parça yok. Ayarlar → Katalog'dan ekleyebilirsiniz. |
| `PartSaleForm.jsx:362` | Boş bırakılırsa kargo, müşterinin kayıtlı adresine gider. |
| `YedekParcaSatisForm.jsx:347` | Boş bırakılırsa kargo, alıcının kayıtlı adresine gider. |
| `PartTypeManager.jsx:119` | **Müşteri formunda seç:** yeni müşteri/makina eklerken… |

**Bölüm başlığı (4):** `customers/CustomerAddEditForm.jsx:95` Firma Bilgileri, `:138` Makina Bilgileri, `:364` Satış / Finans;
`stock/MakinaStokTab.jsx:256` Kullanılan Parçalar.

**Değil (öne çıkanlar):**
- Satır içi, düğme yanında: `ServiceForm.jsx:221` panoya düşmez notu, `:339` Önce müşteri seçin, `:340` dosya türü notu.
- Etiketin parçası: `PartSaleForm.jsx:379`, `YedekParcaSatisForm.jsx:365` (onay kutusu etiketinin içi).
- Boş durum (0016'nın konusu): `stock/MakinaStokTab.jsx:282`, `ModelsManager.jsx:142`, `PartManager.jsx:23`.
- Bölüm açıklaması: `ModelsManager.jsx:199`.
- Bilgi satırı (düğme içerir): `stock/UretimFormu.jsx:178`.
- Etiket: `ServiceForm.jsx:310/314/318` (tarih alanı etiketleri).
- Meta ve özet: müşteri ve bayi seçici satırları, tablo hücreleri, `CustomerAddEditForm.jsx:492` plan toplamı.
- Kapsam dışı: bayi **detay** modalının bölüm başlıkları (`SimpleDealers.jsx:455, 552, 638, 681`; form değil), `PartStokTab.jsx:101` panel başlığı, `UretimFormu.jsx:47/389` tablo başlıkları.
