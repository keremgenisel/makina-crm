# 0030 Uygulama Planı: Bakım Paketi (Karanlık Tema Renkleri, Etiket Düğmesi, Tablo Genişliği, Tarih Bombası)

| | |
|---|---|
| **Bağlı spec** | `specs/0030-bakim-paketi-tema-etiket-tablo.md` (R2, plan onayıyla onaylandı) |
| **Durum** | 2026-09-27: B1–B11 kullanıcı tarafından onaylandı; spec R2 ile güncellendi; **uygulandı** (bkz. §7); görünüm (AC-7 ve ekranlar) onaylandı; commit bekliyor. |
| **Önkoşul** | 0009 (sözlük, kanıt aracı), 0016 (araçta `hide-scrollbars`, dal tabanı) |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in kodla
çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar B1–B11) içerir.

---

## 0. Kodda doğrulanan dayanaklar (2026-09-27)

| Konu | Bulgu |
|---|---|
| Tanımsız adlar (R1) | Tarama (theme.js hariç, `//` satırları hariç) spec'le birebir: `n050` ×5, `purBg2` ×3, `purBr` ×1, `pur700` ×1, `acc` ×2; dinamik `hk` ×3 (`Harita.jsx:334, 393, 465`, `var(--hk${…})`); temada 94 ad, `hk1`…`hk5` tanımlı. CSS dosyalarında tanımsız ad yok. |
| Renk çiftleri | `purTx` / `purBg2` (Anasayfa kredi kartı rozetleri `Dashboard.jsx:245, 536`); `pur700` / `purBg2` (`TahsisModal.jsx:86`, "ANLAŞMASIZ SERVİS" rozeti; aynı `aliciRozet` Stok'ta da kullanılıyor); `purTx` / `purBg` + `purBr` (`KargoPanosu.jsx:36`, KALIP rozeti); `acc` metin / `ambBg3` (`KargoPanosu.jsx:65, 157`, farklı adres). |
| Sabit renkler (R2) | `GiderAlanlari.jsx:146` personel rozeti `#6d28d9` / `#f5f3ff` / `#ddd6fe` (üçü de R1'in ad/değerleriyle birebir). `CalisanManager.jsx:96` ve `GiderForm.jsx:146` zemin `#faf7ff`, kenarlık `#ede9fe`: **`#faf7ff`'in temada karşılığı yok.** `GiderForm.jsx:125`'te **ikinci bir mor kutu** var (`#f5f3ff` / `#ddd6fe`, metin `#3b0764`); ikisi de personel türünde aynı formda görünüyor, spec yalnız `:146`'yı sayıyor. |
| Teslim kutuları | `ServiceForm.jsx:506` ödeme ayrıntı kutusu yalnız "ödendi" işaretliyken görünür; `PartSaleForm.jsx:244, 318`, `YedekParcaSatisForm.jsx:231, 303` ödeme ve kargo ayrıntı kutuları. |
| Etiket (R5) | Tahsis olayı `ypTahsisId: g.satisId` taşır (`deriveCustomerDetail.js:116`; partide ilk kaydın kimliği). Dal `MachineTimeline.jsx:172`, düğmesiz. Yazdırma `CustomerDetailModal.jsx:1063` `yedekParcaEtiketYazdir(grup, { parts, dealers, customers, factory })`; `yedekParcaSatislar` pencereye zaten geliyor. Parti `batchId` ile (`CustomerDetailModal.jsx:254` aynı süzgeci kullanıyor). |
| Tablo (R8) | `SettingsGiderTanimlari.jsx:136` dokuz sütun, bütün başlıklar `nowrap`; "Üretilen aylar" bugün **son üç ay + "+n"** yazıyor. 1280 pencerede tabloya kalan yer: 1280 − kenar çubuğu 236 − ana dolgu 2×28 − Ayarlar menüsü 220 − boşluk 24 − geniş kart dolgusu 2×24 − kenarlık ≈ **694 px**. |
| Çakışan test | `tests/ui/gider-settings.test.jsx:140` (K28) üretilen ayları ekranda metin olarak arıyor: `getByText("2026-06, 2026-07, 2026-08")`. R10 sütunu sayıya indiriyor; test kırılır (B6). |
| Tarih bombası (R11) | `makina-odeme.test.js`: satış 2026-08-16, blokaj 40 gün; bugün 2026-09-27 → 2 test kırmızı. Emsal `odeme-hatirlatma.test.js:134` `vi.useFakeTimers({ toFake: ["Date"] })` + `setSystemTime`, `afterEach(useRealTimers)`. |
| R12 taraması | `grep -E "new Date\(|Date\.now\(|today\("` `tests/` altında 25 dosya buluyor; **`makina-odeme.test.js` bu listede yok**: bağımlılık testte değil, test edilen kodda (`today()`). Yani spec'in yöntemi bilinen bombayı bile yakalamıyor (B9). |

---

## 1. Mimari özet

- **A. Renk:** beş tanımsız addan ikisi eşlenir (`n050 → n100`, `acc → brand`), üçü temaya eklenir; üç sabit renkli yer tema
  değişkenine geçer. Aydınlık değerler bugünkü yedeklerle birebir olduğu için aydınlık görünüm değişmez (AC-7, AC-21).
  Kalıcı değer: **koruma testi** (`tests/tema-degisken.test.js`) statik her `var(--ad)`'ın temada tanımlı olduğunu denetler.
- **B. Etiket:** tahsis satırına komşu kalıp satırlarıyla aynı "Etiket" düğmesi; parti pencerede, saf bir yardımcıyla çözülür;
  şablon ve olay üretimi değişmez (C3, R5).
- **C. Tablo:** başlıklar sarar, "Başlangıç–Bitiş" tek sütun, "Üretilen aylar" sayı + tam liste ipucunda. Gerçek pencerede
  ölçülür (Electron yerleşim testi).
- **D. Test:** `makina-odeme.test.js` kendi zamanını kurar; ek tarama saat kaydırarak yapılır (B9).

---

## 2. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/theme.js` | `purBg2`, `purBr`, `pur700` (+ B2/B3: `purBg3`, `pur900`); aydınlık değerler bugünkü sabitler |
| `src/components/ServiceForm.jsx`, `PartSaleForm.jsx`, `YedekParcaSatisForm.jsx` | `n050` → `n100` (yedek değer aynı) |
| `src/components/KargoPanosu.jsx` | `acc` → `brand` |
| `src/components/gider/GiderAlanlari.jsx`, `CalisanManager.jsx`, `GiderForm.jsx` | Sabit renkler → tema değişkeni (yedekleri bugünkü hex) |
| `src/lib/yedekParcaSatis.js` | Saf `satisPartisi(satislar, satisId)` (parti kardeşleri, silinmişler hariç) |
| `src/components/customers/detail/MachineTimeline.jsx` | Tahsis satırına "Etiket" düğmesi (`onPrintTahsisEtiket`, ipucu metni) |
| `src/components/customers/CustomerDetailModal.jsx` | `onPrintTahsisEtiket` bağlantısı (parti çözümü + `yedekParcaEtiketYazdir`) |
| `src/components/settings/SettingsGiderTanimlari.jsx` | Başlık sarması, "Dönem" birleşik sütun, "Üretilen aylar" sayı + ipucu |
| `tests/makina-odeme.test.js` | Yalnız sahte zaman (R11, C4 istisnası) |
| `tests/ui/gider-settings.test.jsx` | Yalnız K28 iddiası (B6, onay gerekiyor) |
| `tests/tasarim-kontrast.test.js` | Yeni renk çiftleri için **ek** blok (R2, B5) |
| Yeni testler | bkz. §5 |
| `scripts/evidence/0009-sayfa.jsx` | Kanıt ekranları (B10) |
| `scripts/tests/layout/gider-tanim.html` + `.jsx`, `scripts/tests/gider-tanim-yerlesim.cjs`, `vite.config.js` `ELECTRON_TESTLERI` | Tablo ölçümü (B8) |
| `docs/evidence/0030-*`, `kanit-eslemesi.json`, `docs/tasarim-sozlugu.md` (renk kuralı notu), `CLAUDE.md` | Kanıt, kural |

---

## 3. Adım sırası

1. **Dal:** `feat/0016-liste-bos-durum` ucundan `feat/0030-bakim-paketi` (B1).
2. **D önce:** `makina-odeme.test.js` sahte zaman; B9 taraması (grep tablosu + saat kaydırma koşusu); bulunanlar aynı desenle.
   Tam paket yeşile döner; sonraki adımlar yeşil zeminde ilerler.
3. **Önce görüntüleri** (kod değişmeden): B10 ekranları düzeneğe eklenir, kararlılık ölçülür (iki ardışık çekim 0 fark),
   çekim yapılır.
4. **A. Renk:** koruma testi önce yazılır ve **kırmızı** görülür (beş ad); tema eklemeleri, eşlemeler, sabit renkler; test yeşil.
   Kontrast testine ek blok.
5. **B. Etiket:** `satisPartisi` + birim testi; düğme ve bağlantı; arayüz testi.
6. **C. Tablo:** önce K28 dışındaki mevcut `gider-settings` testleri gate; sütun değişikliği; arayüz testi; Electron ölçümü
   (önce 1280'de kaydırma **var** olduğu eski kodda görülür, sonra yok).
7. Görüntüler (sonra), AC-7 raporu, sizin AC onayınız (karanlık taraf) → `degisti` kayıtları.
8. Sözlük notu, `CLAUDE.md`, tam paket (Electron dahil), lint, build. Commit yalnız sizin sözünüzle.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**B1. Dal.** *Öneri:* `feat/0016-liste-bos-durum` ucundan. *Gerekçe:* kanıt aracının `hide-scrollbars` düzeltmesi ve
0014–0016 sözlük hâli o dalda; `main`'den açılırsa kanıt çekimi yine ortama bağımlı olur ve dalları birleştirirken çakışır.

**B2. `#faf7ff` için temada karşılık yok (R2 ↔ AC-7).** Çalışan kutusu ve gider formundaki kutu bu zemini kullanıyor.
*Öneri:* temaya altıncı bir ad: **`purBg3`** (aydınlık `#faf7ff`), `amb`ailesinin `ambBg`/`ambBg2`/`ambBg3` adlandırmasıyla.
*Gerekçe:* `purBg`'ye (`#f5f3ff`) eşlemek aydınlık görünümü değiştirir ve AC-7'yi çiğner; R1'in karar kuralının aynısı
(değer aynı değilse temaya ekle).

**B3. Gider formunda ikinci mor kutu (`GiderForm.jsx:125`).** Spec yalnız `:146`'yı sayıyor; `:125` aynı formda, aynı
personel dalında, karanlıkta beyaz kalıyor ve metni `#3b0764` (karanlık zeminde okunmaz hâle gelecek).
*Öneri:* dahil et; metin için **`pur900`** (aydınlık `#3b0764`), zemin `purBg`, kenarlık `purBr`.
*Gerekçe:* R4 "gider formu"nu gözle doğrulanacak yerler arasında sayıyor; kutulardan birini bırakmak ekranı yarım düzeltir.
Hariç tutulursa 0031'e yazılır.

**B4. Karanlık değerler.** *Öneri (başlangıç):* `purBg2` `#2d2140`, `purBg3` `#1f1729`, `purBr` `#4c3a6b`,
`pur700` `#c9a9ff`, `pur900` `#e4d6fc` (mevcut `purBg` `#241a33`, `purTx` `#b794f6` ailesiyle). Kesin değerler kontrast
testinin eşiğine göre ayarlanır (metin: WCAG AA ya da aydınlıktakinin %95'i; kenarlık/zemin ≥ 1.15). *Gerekçe:* X2 paleti
yeniden tasarlamayı yasaklıyor, yeni adlar mevcut mor aileye oturur.

**B5. R2 bir mevcut test dosyasına ekleme istiyor (R2 ↔ C4).** C4'ün istisnası yalnız R11/R12 dosyalarını sayıyor.
Ayrıca `tasarim-kontrast`'ın "token çiftleri `tasarim.jsx`'te kullanılıyor" denetimi bu renkleri mevcut tabloya koymayı
kırar (sözlükte değiller).
*Öneri:* dosyaya **yalnız ek** yeni bir `describe` bloğu ("spec 0030: sözlük dışı ekran renkleri", kendi tablosu ve
"kaynakta kullanılıyor" denetimi ilgili ekran dosyalarına bakar); mevcut satırlar değişmez. C4'e bu ekleme istisnası yazılır.
*Gerekçe:* R2 dosyayı adıyla istiyor; ayrı dosya açmak R2'yi, mevcut tabloya karıştırmak testin kendi kuralını çiğner.

**B6. `gider-settings.test.jsx` K28 iddiası R10 ile çelişiyor (C4).** Test ay listesini görünür metin olarak arıyor.
*Öneri:* C4'e ikinci istisna: yalnız o satır, "görünür metin `3 ay` ve tam liste ipucunda (`title`)" iddiasına çevrilir
(iddia gevşemez, yeni biçimi aynı sıkılıkla denetler). *Gerekçe:* tam listeyi görünmez bir öğeye koyup testi geçirmek mümkün
ama testi aldatmak olur; 0014–0016'daki "borç kilitleyen test" emsalleriyle aynı yol. Karar sizde.

**B7. Etiket düğmesinin ayrıntıları.**
- Parti çözümü saf `satisPartisi(satislar, satisId)`: kimlikten satış bulunur; `batchId` varsa silinmemiş kardeşler, yoksa
  yalnız o satış. Satış bulunamazsa (silinmiş) düğme çizilmez.
- Düğme metni komşularla aynı ("Etiket", yazıcı simgesi, `YAZDIR_BTN`), izin aramaz (R7).
- *Öneri ipucu metni:* "Kargo Etiketi Yazdır: alıcı parçayı satın alan bayi/firmadır; etiket bu kargonun bütün kalemlerini
  kapsar." *Gerekçe:* AC-10'un iki koşulu tek cümlede; metin yeni bir düğmenin metni olduğu için C5'i çiğnemez.

**B8. Tablo ölçüm düzeneği.** Gerçek `App`'i Electron'da açmak (veri yükleme, perde, gezinme) testi kırılgan yapar.
*Öneri:* düzenek sayfası uygulama kabuğunu genişlikleriyle kopyalar (kenar çubuğu 236, ana dolgu 28) ve içinde **gerçek**
`Settings`'i "Tekrarlayan Giderler" açık, uzun içerikli verilerle çizer; 1280'de tablo sarmalayıcısında
`scrollWidth ≤ clientWidth`, 1024'te tablo bozulmaz (her başlık görünür genişlikte, satırlar üst üste binmez). Kabuk
sabitlerinin kaynakla kopmaması için aynı test `App.jsx`'te `width: sidebarDar ? 66 : 236` ve `padding: 28`, `Settings.jsx`'te
`width: 220` metinlerini arar. *Risk:* ~694 px'e dokuz bilgi sığmayabilir. Sığmazsa ilk yol başka hücrelerde sarma (tür
rozeti alt satıra); yine olmazsa size dönerim, kapsamı kendim genişletmem.

**B9. R12'nin tarama yöntemi bilinen bombayı yakalamıyor.** Bağımlılık testte değil, test edilen kodda.
*Öneri:* spec'in grep tablosu aynen raporlanır **ve** ek olarak paket iki kez **saat kaydırılarak** koşulur: geçici bir
`--setupFiles` (depoya girmez, scratch'te) `Date`'i 2027-03-01'e ve 2026-01-15'e sabitler; yalnız o koşularda kırmızı olan
testler tarih bombasıdır ve aynı desenle düzeltilir (C4 istisnası R12'yi zaten kapsıyor). *Gerekçe:* grep yalnız testin
kendi saat çağrısını görür; saat kaydırma gerçek davranışı ölçer.

**B10. Kanıt ekranları ve AC-7'nin ölçümü.** `kanit-eslemesi.json` ekran başına tek beklenti taşıyor; "aydınlık aynı,
karanlık değişti" ayrımını ifade edemiyor.
*Öneri:* ekranlar: `gider-formu-personel`, `katalog-calisan`, `ayarlar-gidertanim`, `anasayfa-kart-rozetleri`,
`servis-pano-kalip`, `stok-tahsis-modali`, `servis-formu-odendi`, `kalip-formu` (+ ödendi hâli), `yedek-parca-formu`
(+ ödendi hâli), `musteri-detay-tahsis` (yeni düğme). Kayıtlar `degisti` + onay; AC-7 için ayrı test
(`tests/tema-0030-kanit.test.js`): `0030-piksel-raporu.json`'da renk ekranlarının **aydınlık** satırları 0 piksel,
karanlık satırları > 0. *Gerekçe:* ölçüt gözle değil rapordan (AC-7), kayıt yapısı değişmeden.

**B11. `hk` gibi dinamik adların denetimi.** *Öneri:* koruma testi dinamik adları adıyla listeler (`hk` → `Harita.jsx`
yoğunluk kovası) **ve** açılımlarının (`hk1`…`hk5`) temada tanımlı olduğunu ayrıca doğrular; listede olmayan yeni bir
dinamik ad testi kırar (sessiz atlama yok, R3).

---

## 5. Kabul kriteri ↔ test eşlemesi

| AC | Test | Nasıl |
|---|---|---|
| AC-1, AC-20 | `tests/tema-degisken.test.js` | `src` altındaki `.js/.jsx/.cjs/.mjs/.css` dosyalarında (theme.js hariç, `//`, `/* */` ve `{/* */}` yorumları çıkarılarak) her statik `var(--ad)` temada tanımlı; önce kırmızı (beş ad) |
| AC-2 | aynı | `DINAMIK = { hk: "Harita.jsx yoğunluk kovası" }` testte görünür; açılımlar tanımlı; listede olmayan dinamik ad kırar |
| AC-21 | aynı + `tema-0030-kanit` | `purBg2` `#ede9fe`, `purBr` `#ddd6fe`, `pur700` `#6d28d9` (+ B2/B3) aydınlık değerleri; `n050`/`acc` kaynakta kalmadı, eşlendikleri tokenların aydınlık değeri eski yedekle aynı |
| AC-3…AC-6 | görüntü (karanlık) + `tasarim-kontrast` ek bloğu + `tema-degisken` R2 bloğu | Karanlık çiftlerin kontrastı eşikte; üç dosyada ilgili satırlarda çıplak hex kalmadı |
| AC-7 | `tests/tema-0030-kanit.test.js` | Rapor: renk ekranlarının aydınlık satırları 0 piksel |
| AC-8 | `tests/ui/tahsis-etiket.test.jsx` | Tahsis satırında "Etiket" düğmesi; tıklayınca `window.appPrint.printHtml` çağrılır |
| AC-9 | aynı | Etiket HTML'inde gönderen fabrika adı, alıcı bayi adı (ve anlaşmasız firmada firma adı) |
| AC-10 | aynı | Düğmenin `title`'ı "bayi/firma" ve "bütün kalemleri" ifadelerini içerir |
| AC-11 | `tests/yedek-parca-parti.test.js` + `ui/tahsis-etiket` | Parti kardeşleri (silinmiş hariç) ve tek satış; etikette partinin bütün kalemleri, yalnız tahsis edilenler değil |
| AC-12 | `ui/tahsis-etiket` | Tıklama hiçbir setter'ı çağırmaz; `canDo` hep `false` iken de düğme görünür |
| AC-13, AC-14 | `tests/gider-tanim-yerlesim.test.js` (Electron) | 1280'de kaydırma yok, 1024'te bozulma yok (B8); eski kodda 1280'de kaydırma olduğu önce görülür |
| AC-15, AC-22 | `tests/ui/gider-tanim-tablo.test.jsx` | Başlıklar ve hücreler: tanım, tür, tedarikçi, tutar, dönem (başlangıç ve bitiş birlikte), atama, "n ay" + `title`'da tam liste; "Henüz üretilmedi" korunur |
| AC-16, AC-17 | `tests/makina-odeme.test.js` + diff denetimi | Sahte zamanla yeşil; `git diff` bu dosyada yalnız zaman kurulumu satırları (iddia satırı değişmez) |
| AC-18 | plan §7 tablosu + commit özeti | grep tablosu + saat kaydırma koşularının sonucu |
| AC-19 | tam paket | Electron dahil yeşil |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| B1 | Dal | `feat/0016-liste-bos-durum` ucundan `feat/0030-bakim-paketi` |
| B2 | `#faf7ff` | Temaya `purBg3` (aydınlık birebir) |
| B3 | Gider formundaki ikinci mor kutu | Dahil; metin için `pur900` |
| B4 | Karanlık değerler | Mor aileye oturan başlangıç değerleri, kontrast testiyle kesinleşir |
| B5 | `tasarim-kontrast` | Yalnız ek `describe` bloğu; C4'e ekleme istisnası |
| B6 | `gider-settings` K28 | C4 istisnası: iddia "3 ay" + ipucunda tam liste olur |
| B7 | Etiket | Saf `satisPartisi`; komşularla aynı düğme; ipucu metni yukarıda |
| B8 | Tablo ölçümü | Kabuk kopyası + gerçek `Settings`, kabuk sabitleri kaynak taramasıyla korunur |
| B9 | Tarih taraması | Grep tablosu + iki saat kaydırma koşusu |
| B10 | Kanıt | On ekran; AC-7 rapor testi |
| B11 | Dinamik adlar | Adıyla liste + açılım denetimi |

---

## 7. Uygulama notları (2026-09-27)

- **Sıra:** önce test borcu (paket yeşile döndü), sonra önce görüntüleri, sonra renk, etiket, tablo.
- **R11:** `makina-odeme.test.js`'e yalnız sahte zaman eklendi (`vi.useFakeTimers({ toFake: ["Date"] })`,
  `setSystemTime("2026-08-20T12:00:00Z")`, `afterEach(useRealTimers)`); iddia satırlarına dokunulmadı (diff: 5 satır ekleme,
  1 satır içe aktarım).
- **R12 / B9, saat kaydırma koşusu:** scratch'te `Date`'i ileri/geri kaydıran bir kurulum dosyası ve ana yapılandırmayı
  genişleten geçici bir yapılandırmayla (depoya girmedi; Vitest 4'te `--setupFiles` CLI seçeneği yok) paket iki kez koşuldu:

  | Kayma | Düşen test | Sınıf | İşlem |
  |---|---|---|---|
  | 2027-03-01 | `ui/gider-perdesi-yedek` | **Gerçek bomba:** çöpteki gider (`deletedAt` 2026-09-20) açılışta 30 günlük temizlikle siliniyor; 2026-10-20'den sonra kırmızı olurdu | Sahte zaman (aynı desen) |
  | 2027-03-01 | `ui/musteri-detay-bolumler` (0016) | **Gerçek bomba:** garanti 2027-01-10'da bitince olay başlığı "Garanti Süresi Doldu" oluyor | Sahte zaman (aynı desen) |
  | 2027-03-01 | `pinned-fetch` | Yöntemin yapaylığı: sertifika JS saatiyle üretiliyor, TLS doğrulaması işletim sistemi saatini kullanıyor; gerçekte iki saat birlikte ilerler | Yok |
  | 2026-01-15 | `ui/servis-panosu` (sıralama) | Yalnız saat geriye gidince: yeni kayıt, sabit tarihli eskilerden önceye düşüyor; gerçek takvimde saat geri gitmez | Yok |

  Düzeltmeden sonra iki dosya da kaydırılmış saatte yeşil.
- **R12, spec'in grep yöntemi** (`grep -rnE "new Date\(|Date\.now\(|today\(" tests`): 25 dosya. Sınıflama:

  | Dosya | Kullanım | Durum |
  |---|---|---|
  | `odeme-hatirlatma`, `ui/dashboard-odeme-hatirlatma`, `ui/giderler`, `ui/gider-form`, `ui/giderler-kdv-memo`, `ui/gider-yetkisiz-gorunum`, `ui/standart-giderler`, `ui/tedarikciler`, `ui/finance-gider-kdv`, `ui/makina-karliligi`, `ui/suzgec-finans-analiz` | `setSystemTime` ile sabit zaman | Güvenli |
  | `makina-odeme`, `ui/gider-perdesi-yedek`, `ui/musteri-detay-bolumler` | Bu işte sabitlendi | Güvenli |
  | `ui/dashboard-navigation`, `ui/dashboard-permissions`, `utils` (202-203), `aylik-rapor` (450), `ui/gider-perdesi` | `Date.now()`'a göre göreli tarih | Güvenli (hep bugüne göre) |
  | `documents-defaults` | Beklenti de kod da içinde bulunulan yıl | Güvenli (yılbaşı gece yarısı yarışı ihmal edilebilir) |
  | `ui/servis-panosu`, `ui/yedek-parca-satis` | Kilit zamanı / form varsayılanı `today()` | Güvenli (iddiaya girmiyor) |
  | `ui/form-dogrulama`, `ui/form-taslak`, `security-queue` | Taslak zaman damgası, geçici dosya adı | Güvenli |
  | `kredi-karti`, `kanit-eslemesi`, `utils` (717, 736), `ui/global-search` | Yorum ya da tarih doğrulama yardımcısı | İlgisiz |

  Grep bilinen bombayı (`makina-odeme`) göremedi; üç gerçek bombanın üçü de saat kaydırmayla bulundu.
- **Renk:** koruma testi önce kırmızı görüldü (tam beş ad). Temaya beş ad eklendi (`purBg2`, `purBg3`, `purBr`, `pur700`,
  `pur900`), iki ad eşlendi (`n050 → n100`, `acc → brand`). Karanlık değerler B4'teki başlangıç değerleridir; hepsi kontrast
  bloğunu geçti (metin 6–12, kenarlık aydınlıktaki kadar ya da daha iyi). `GiderForm.jsx:187`'deki `#fde7d4` bu işin dışında
  (0031).
- **Etiket:** `satisPartisi` (saf) + `onPrintTahsisEtiket(satisId)`. Tahsis olayları yalnız canlı satışlardan üretildiği için
  "satış bulunamadı" durumu pratikte oluşmaz; yine de yardımcı boş dizi döndürür ve yazdırma yapılmaz.
- **Tablo:** eski kodda 1280'de tablo 904 px istiyordu (694 px yer). Başlık sarması, birleşik dönem sütunu, "n ay", 6 px
  hücre dolgusu ve tutarın alt satırının sarabilmesiyle en küçük genişlik 655 px oldu (39 px pay).
  **Kullanıcı düzeltmesi (2026-09-27):** düzenle/sil düğmeleri her zaman yan yana; kart sağdaki boşluğa büyür. Kök neden
  `Settings.jsx`'te içerik sütununun bu sekmede 760 px'e sınırlı olmasıydı; "gidertanim" 1200 px alan sekmelere eklendi.
  Yerleşim testi 1920 px pencerede kartın 760'ı aştığını ve her genişlikte düğmelerin yan yana olduğunu da denetliyor.
  (İlk sürümde düğmeler yer darsa alt alta diziliyordu; yan yana tutmak için pay 8→6 px hücre dolgusundan geri kazanıldı.)
- **Kanıt:** `0030-piksel-raporu.json` + 28 JPEG. 202 ekranlık çekimde renk ekranlarının aydınlık hâlleri 0 fark (AC-7 testi),
  diğer bütün ekranlar 0 fark. Görüntü aracına iki eklenti: "kaydir:metin" adımı ve formu hazır durumla çizen sarmalayıcı.
- **Mevcut test dosyalarında değişiklik** (C4 ve istisnaları): `makina-odeme` (R11), `ui/gider-perdesi-yedek` ve
  `ui/musteri-detay-bolumler` (R12, yalnız zaman), `tasarim-kontrast` (B5, yalnız ek blok), `ui/gider-settings` (B6, tek iddia).
