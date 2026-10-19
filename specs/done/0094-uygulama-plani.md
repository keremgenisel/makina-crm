# 0094 Uygulama planı: Faaliyet Haritası'na beş ilin ilçe kırılımı

| | |
|---|---|
| **Spec** | `specs/0094-harita-bes-il-ilce-kirilimi.md` (revizyon 2) |
| **Durum** | Tamamlandı (onay 2026-10-19; commit `4b60c02`) |
| **Dal** | `feat/0094-harita-ilce` (`8aa5248` üstünde) |

İş iki parçadır: (1) üretilmiş veri (üretici listesine beş il ve sözlüğe bir satır, sonra üretici çalıştırılır), (2) eşleşmeyen ilçe değerinin görünür olması (R5/2: `ilOzeti` üçüncü sayı, panel satırı, pin eşleştirmesi). Formlar kod değişikliği almaz; listeyi `ilceler.js`'ten okudukları için yeni veriyle kendiliğinden genişler.

---

## 1. Değişecek ve eklenecek dosyalar

### Elle değişen

| Dosya | Değişiklik | Madde |
|---|---|---|
| `scripts/gen-map-paths.cjs` | `ILCE_ILLERI`'ne Hatay'dan sonra beş il; `ILCE_ISIM_DUZELT`'e yalnız `"Yalova merkez": "Yalova"`; "kalan 70 il" yorumu → 62 | R1, R3, R3/2, R14, R15 |
| `src/lib/mapStats.js` | `ilOzeti(customers, il, ilceAdlari = null)`: liste verilince eşleşmeyen dolu değer `eslesmeyen`'e (çıktıya yalnız liste verilince eklenir); `ilcePinleri` / `pinleriTopla` isteğe bağlı `ilceAdlari` (verilince konum yalnız listede olan ad için) | R5/2, AC-20/2, AC-20/3, AC-30 |
| `src/components/Harita.jsx` | `ilOzeti` ve `pinleriTopla`'ya `ILCELER[seciliIl]` geçer (Risk 2); satış pinleri (`:147-151`) aynı kümeyle; `IlKartlari` toplamına ve "kayıt yok" koşuluna `eslesmeyen` (Risk 3); `IlPaneli` satırı (sabit `ilceEslesmeyenMetni(n)`); "şimdilik 14" yorumu | R5/2, R15 |
| `tests/ilce-veri.test.js` | Altı test AC numarasıyla yeniden adlandırılır; liste 19, sayılar, adlar, Yalova, Çanakkale, meta | R10, R10/2 |
| `tests/map-stats.test.js` | `ilOzeti` liste ve pin süzmesi için **yeni bloklar**; bugünkü beklentilere dokunulmaz | AC-20/2, AC-20/3, AC-30 |
| `tests/ui/harita.test.jsx` | Aydın, Kayseri, ilçesiz, eşleşmeyen, ilçeli kayıt (İstanbul/Kadıköy deseni) | AC-13, 14, 20, 20/2, 20/3, 21 |
| `scripts/evidence/0009-sayfa.jsx` | Harita ve form ekranları (§2) | DoD görsel kanıt |
| `CLAUDE.md` | Harita bölümüne on dokuz il cümlesi; `ATTRIBUTION.md` atfı akordeona düzeltilir; kısa 0094 bölümü | R15, AC-29 |
| `specs/README.md` | Yalnız 0094 satırları (HEAD + ilgili satır sahnelemesi) | DoD |

### Üretici yazar (elle dokunulmaz, C1)

`src/lib/map/ilce/{aydin,sakarya,eskisehir,gaziantep,yalova}.js` (yeni), `src/lib/map/ilceler.js`, `src/lib/map/meta.js`. Mevcut on dört ilçe dosyası, `world.js`, `regions/*` **bayt eşit** kalmalı (ölçülür).

### Yeni

| Dosya | İçerik |
|---|---|
| `tests/ui/ilce-formlari-0094.test.jsx` | Beş form ve çizmeyen formlar (AC-15…19) |
| `tests/harita-ilce-0094.test.js` | Taramalar: AC-22/2, AC-23, AC-24, AC-25, AC-25/2, AC-29 |
| `docs/evidence/0094-*` | Görsel kanıt raporu, taban ve JPEG'ler |

### Dokunulmayan (bilerek)

Formların kaynağı (`ui.jsx`, `SettingsCompany.jsx`, müşteri/bayi/teslimat formları), `SettingsImport.jsx` (X8), `CustomerDetailModal.jsx` (X10), `scripts/gen-arkaplan-adlar.cjs` ve `world-arkaplan.js` (R9/2), `db.cjs`, `serverAuth.cjs`, `merge.js`, `SettingsApp.jsx` (atıf yerinde, R11).

---

## 2. Görsel kanıt

Görüntü aracında bugün harita ekranı yok. `Harita` `baslangicUlke` / `baslangicIl` aldığı için doğrudan çizilebilir.

| Ekran | Ne gösterir |
|---|---|
| `harita-0094-istanbul` | Mevcut il (değişmeyen davranışın kanıtı; taban: kod değişmeden önce ve sonra 0 fark beklenir) |
| `harita-0094-aydin`, `-sakarya`, `-eskisehir`, `-gaziantep`, `-yalova` | Beş ilin ilçe görünümü; Aydın'da ilçeli iki müşteri (boyama ve panel listesi) |
| `harita-0094-ilcesiz` | İlçesi boş kayıtlı il kartı (Sakarya) |
| `harita-0094-eslesmeyen` | Eşleşmeyen değerin panel satırı, pinsiz |
| `musteri-formu-0094-ilce` | Müşteri formunda Sakarya + İlçe alanı açık |

---

## 3. Adım sırası

1. **Dal** ve **taban görüntüsü:** `harita-0094-istanbul` aracı eklenip bugünkü kodla iki kez çekilir (0 fark).
2. **Taban turu (R13 aşama 1, AC-26):** listeye dokunmadan `node scripts/gen-map-paths.cjs`; `git status --short src/lib/map` boş olmalı. Değilse **dururum**, `git checkout -- src/lib/map` ile geri alır ve sana raporlarım (Risk 1).
3. **Ad ön doğrulaması (C5, C7, AC-27):** üç sözlük, üretimden önce. (Plan aşamasında salt okunur olarak ölçüldü: `CITIES_TR`, geoBoundaries ADM1 `shapeName` (81) ve önbellekteki çalışma anı şehir listesi beş ili birebir taşıyor.)
4. **Liste ve sözlük:** `gen-map-paths.cjs` iki satır + yorum.
5. **Üretim (R13 aşama 2):** üretici yeniden çalışır; değişen dosyalar yalnız `ilce/*` (beş yeni), `ilceler.js`, `meta.js` (AC-11, AC-26). On dört dosya bayt eşit (AC-10), `world-arkaplan.js` dokunulmadı (AC-31). Gerçekleşen beş dosya boyutu ölçüm 2'ye yazılır.
6. **Veri testleri:** `ilce-veri.test.js`.
7. **Saf motor:** `mapStats.js` (opt-in), `map-stats.test.js` yeni bloklar; eski beklentiler yeşil (AC-30).
8. **Harita bileşeni** ve `harita.test.jsx`.
9. **Form testleri** (`ilce-formlari-0094`) ve taramalar (`harita-ilce-0094`).
10. **Görsel kanıt**, tam takım (Electron dahil), lint.
11. **CLAUDE.md**, sürüm notu metni (§6).
12. Commit, SCORECARD ve `specs/done` yalnız senin talimatınla.

---

## 4. Riskler ve emin olmadığım noktalar

**Risk 1. Taban turu bayt eşit çıkmayabilir.** Önbellekte üreticinin indirdiği beş kaynağın beşi de duruyor (`ne_10m_admin_1`, `cities500.zip`, `countriesnow.json`, iki geoBoundaries dosyası), ama `d3-geo`/`topojson-*` sürümleri Temmuz 2026 üretiminden farklıysa çıktı oynar. Bunu henüz çalıştırmadım (plan aşamasında dosya değiştirmemek için).
*Öneri:* fark çıkarsa veriyi yeniden üretmeyi **bırakmam**, değişiklikleri geri alır ve sana farkın ne olduğunu (hangi dosyalar, ne kadar) raporlarım. *Gerekçe:* spec R13 bunu "ortam mı, değişiklik mi" ayrımı için koyuyor; kendiliğinden bir yol seçmek (ör. sürüm sabitlemek) X4'ün kapsamına girer.

**Risk 2. Eşleşme kümesinin kaynağı.** Spec "çizilen ilçe adlarıyla eşleşmeyen" diyor. Bileşende iki kaynak var: il dosyasının `ILCE_ADLARI`'sı (tıklanınca **sonradan** yüklenir) ve `ilceler.js`'in `ILCELER[il]`'i (açılışta hazır). AC-4 ikisinin aynı küme olduğunu sabitliyor.
*Öneri:* `ILCELER[seciliIl]`. *Gerekçe:* il dosyası yüklenene kadar `ILCE_ADLARI` yoktur; o arada `ilOzeti` listesiz çağrılırsa eşleşmeyen değer bir an "ilçe" olarak sayılır ve panel titrer. Senkron kaynak bu ara durumu hiç doğurmaz.

**Risk 3. İl kartının toplamı eksik kalır.** `IlKartlari` toplam makinayı `Σ ilceler + ilcesiz` ile hesaplıyor (`Harita.jsx:367`). Eşleşmeyen değer `ilceler`'den çıkınca toplam o kadar düşer; spec bunu yazmıyor. "Bu ilde makina kaydı yok" koşulu (`:400`) da yalnız iki sayıya bakıyor.
*Öneri:* toplama ve koşula `eslesmeyen` eklenir. *Gerekçe:* R7'nin "sayıları kaybolmaz" ilkesi; yoksa bugünkü (tutan) toplam bu işle bozulur.

**Risk 4. Pin eşleştirmesi bugün sadeleştirilmiş adla.** `ilceMerkezleri` `sadeAd(ilçe)` ile anahtarlı ve `map-stats.test.js`'in yedi pin testi bu biçimle (`{ kadikoy: [...] }`) yazılmış.
*Öneri:* anahtar biçimine dokunmam; `pinleriTopla`'ya isteğe bağlı `ilceAdlari` eklenir. Verildiğinde pin yalnız kaydın tam (kırpılmış) adı listede olduğunda çizilir. Satış pinleri (`Harita.jsx:147-151`) ile fabrika ve bayi pinleri aynı kuralı alır. *Gerekçe:* AC-20/3 "pin ile boyama aynı ad kümesini kullanır" der. Opt-in olduğu için mevcut testler dokunulmadan yeşil kalır (AC-30'un deseni).
*Bilmen gereken etki:* kural on dokuz ilin hepsinde geçerli. Bugünkü on dört ilde ASCII yazılmış bir ilçe (ör. içe aktarmadan gelen "Kadikoy") bugün pin alıyor ama boyanmıyor; bu işten sonra pin de kalkar ve "haritada bulunamadı" satırına sayılır. Spec'in amacı bu (R5/2), ama mevcut illerde de görünür bir değişiklik.

**Risk 5. Panel cümlesi sabit mi?** Spec cümleyi verir, yerini söylemez.
*Öneri:* `Harita.jsx`'ten dışa verilen `ilceEslesmeyenMetni(n)`. *Gerekçe:* testler metni sabitten okusun (0093 R11'in deseni).

**Risk 6. AC-27'nin üç sözlüğünden ikisi CI'da sınanamaz.** geoBoundaries ve çalışma anı şehir listesi gitignore'daki önbellekte.
*Öneri:* `CITIES_TR` testle; diğer ikisi ölçüm olarak plana yazılır (plan aşamasında yapıldı, §3 adım 3). geoBoundaries tarafının dolaylı kanıtı üreticinin kendisidir: ad yoksa `throw` eder (AC-25). *Gerekçe:* AC-32'nin ölçüm kriteri mantığı; önbelleği depoya koymak 80 MB.

**Risk 7. AC-25/2 spec'in metnini sınıyor.** Spec kapanışta `specs/done`'a taşınır.
*Öneri:* tarama iki şeyi ölçer: (a) üreticide `fs.rmSync(... "ilce" ...)` satırı `throw new Error("İlçesi bulunamayan il: ` satırından önce geliyor (olgu), (b) spec dosyası (`specs/` ya da `specs/done/` altında, adıyla bulunur) kurtarma yolunu yazıyor. Silmeyi doğrulamadan sonraya taşımam. *Gerekçe:* spec üreticiyi bu işte parçalamamayı söylüyor (AC-25); düzeltme ayrı iş.

**Risk 8. Dal tabanı.** 0094 0093'ten bağımsız.
*Öneri:* `feat/0093-plan-uretimdeki` üstünde aç. *Gerekçe:* `CLAUDE.md` ve `specs/README.md` 0092/0093 kayıtlarını orada taşıyor; main'den açılırsa iki dalın aynı dosyaları ayrı ayrı değiştirmesi birleştirmede çakışır.

**Risk 9. Haritanın görüntü aracında çizilip çizilmeyeceğini ölçmedim.** Harita dünya verisini (8 MB) tembel yüklüyor; aracın "hazır" işareti yükleme bitmeden gelebilir.
*Öneri:* gerekirse araca bekleme adımı eklenir (`bekle:<seçici>`); olmazsa Electron yerleşim testlerinin sayfa düzeneğiyle çekim. Hangisi gerektiyse sana yazarım.

**Risk 10. AC-23 için fikstür.** Dört listenin (`BLOB_SECTIONS`, `MERGE_KEYS`, `EYLEM_IDLERI`, `AYAR_ALAN_SEKMELERI`) spec öncesi hâli zaten `tests/fixtures/0093-tarama-once.json`'da ve 0093'ten beri değişmedi.
*Öneri:* yeni fikstür yazmadan onu oku. *Gerekçe:* aynı olgu, ikinci kopya ayrışma kaynağı olur.

---

## 5. Kriter ↔ test eşlemesi

`V` = `tests/ilce-veri.test.js`, `M` = `tests/map-stats.test.js`, `H` = `tests/ui/harita.test.jsx`, `F` = `tests/ui/ilce-formlari-0094.test.jsx`, `T` = `tests/harita-ilce-0094.test.js`, **Ölçüm** = plana yazılan komut çıktısı (AC-32)

| Kriter | Test | Nasıl |
|---|---|---|
| AC-1, AC-28 | V | Tam dizi eşitliği (19 il, sıra) |
| AC-2 | V | Her il `CITIES_TR`'de |
| AC-3, AC-9 | V | 19 ilin resmî sayıları |
| AC-4 | V | Dosya adları = form listesi (sıralı küme) |
| AC-5 | V | Çizim `M` ile başlar, `W === 1000`, `H > 0` |
| AC-6, AC-7 | V | Yalova listesi ve dosyası "Yalova" içerir, "Yalova merkez" içermez |
| AC-6/2 | V + T | "Çanakkale merkez" duruyor; `ILCE_ISIM_DUZELT` dört satır |
| AC-8 | V | Bilinen ilçeler |
| AC-10, AC-11, AC-26, AC-31 | Ölçüm | `git status --short src/lib/map`, `git diff --stat` |
| AC-12 | V | `META.ilceIlleri === 19` |
| AC-13 | H | Aydın'a tıklanınca `data-ad="Kuşadası"` |
| AC-14 | H | Kayseri'ye tıklanınca ilçe görünümü yok |
| AC-15 | F | Müşteri formu, Sakarya → İlçe seçeneklerinde Adapazarı, Sapanca |
| AC-16 | F | Kayseri → İlçe alanı yok |
| AC-17 | F | Aydın/Kuşadası → şehir Gaziantep → `ilce` boş |
| AC-18 | F | Bayi, Extra Kalıp teslimat, yedek parça teslimat, fabrika: Sakarya'da alan var |
| AC-18/2 | M | `teslimatIlce` taşıyan kayıt hiçbir pine girmez |
| AC-19 | F + T | Servis işlem firması render; `onIlce` alan beş çağrı yerinde, iki "Yeni Sahip/önceki sahip" çağrısında yok |
| AC-20 | H + M | İlçesiz kayıt `ilcesiz`'de |
| AC-20/2 | M + H | Eşleşmeyen değer `eslesmeyen`'de; panel `ilceEslesmeyenMetni(1)`; toplam doğru |
| AC-20/3 | M + H | Eşleşmeyen değerde pin yok |
| AC-21 | H | Aydın/Kuşadası boyanır, panelde firma adı |
| AC-22 | Ölçüm + T | Üretimde kayıt verisi yok; AC-22/2 taraması |
| AC-22/2 | T | `ilce` alanını toplu yazan/türeten kod yok |
| AC-23 | T | Dört liste 0093 fikstürüyle eşit (Risk 10); yeni sütun yok |
| AC-24 | T | `HARITA_KAYNAKLARI` geoBoundaries ODbL; `9469f09` iki URL'de |
| AC-25, AC-25/2 | T | `throw` satırı; `rmSync` önce; spec kurtarma yolunu yazıyor (Risk 7) |
| AC-27 | V + Ölçüm | `CITIES_TR` testle; diğer iki sözlük ölçüm (Risk 6) |
| AC-29 | T | Üç yorum ve `CLAUDE.md` cümlesi; `ATTRIBUTION.md` atfı yok |
| AC-30 | M | Eski `ilOzeti` beklentileri dokunulmadı + listesiz çağrının çıktısında `eslesmeyen` anahtarı yok |
| AC-32, AC-33 | Bu tablo | Üç dosya, üç ölçüm kriteri |

---

## 5/2. Ölçülenler (plan aşaması, salt okunur)

- Önbellek (`scripts/.map-cache/`): beş kaynak dosyası da var.
- Çalışma anı şehir listesi (`countriesnow.json`, Türkiye): Aydın, Eskişehir, Gaziantep, Sakarya, Yalova birebir.
- geoBoundaries ADM1 `shapeName` (81 il): beşi birebir.
- `Harita.jsx` tasarım sözlüğünü kullanmıyor, kanıt eşlemesine kayıt zorunlu değil; görsel kanıt yine de çekilir (DoD).

---

## 6. Sürüm notu (taslak)

Faaliyet Haritası'nda Aydın, Sakarya, Eskişehir, Gaziantep ve Yalova artık ilçelere bölünüyor; bu illerde müşteri, bayi, teslimat ve fabrika formlarında İlçe alanı çıkıyor. Mevcut kayıtların ilçesi boş gelir ve haritada "ilçesi girilmemiş" sayılır; müşteri kaydı düzenlenip ilçe seçildikçe harita boyanır. Çanakkale'nin merkez ilçesi bilinçli olarak "Çanakkale merkez" adıyla kalır (kayıtlarda bu ad olabileceği için). Bir ilde "n makinanın ilçesi haritada bulunamadı" yazıyorsa o kayıtların ilçesi listede olmayan bir yazımla girilmiştir (genelde Excel içe aktarmasından); müşteri kaydından ilçe yeniden seçilmelidir.

---

## 7. Uygulama notları ve ölçümler (2026-10-19)

- **P8:** dal `feat/0094-harita-ilce`, `8aa5248` üstünde.
- **Taban turu (R13 aşama 1, AC-26):** listeye dokunmadan `node scripts/gen-map-paths.cjs` (2 dk 40 sn, çıkış 0); beş kaynak önbellekten ("indiriliyor" satırı 0). `git status --short src/lib/map` **boş**.
- **Üretim (R13 aşama 2, AC-10, AC-11, AC-31):** beş il + `"Yalova merkez": "Yalova"` eklendikten sonra `git status --short src/lib/map`:
  ```
   M src/lib/map/ilceler.js
   M src/lib/map/meta.js
  ?? src/lib/map/ilce/aydin.js
  ?? src/lib/map/ilce/eskisehir.js
  ?? src/lib/map/ilce/gaziantep.js
  ?? src/lib/map/ilce/sakarya.js
  ?? src/lib/map/ilce/yalova.js
  ```
  `world.js`, `world-arkaplan.js`, `regions/*` ve mevcut on dört ilçe dosyası fark yok (`git diff --stat` boş). `ilceler.js`'te eski on dört ilin sırası ve içeriği birebir (iki modül içe alınıp karşılaştırıldı). `meta.js` yalnız `ilceIlleri: 14 → 19`. Üretici çıktısı: Aydın 17, Sakarya 16, Eskişehir 14, Gaziantep 9, Yalova 6 ilçe. `gen-arkaplan-adlar.cjs` çalıştırılmadı.
- **AC-22:** üretim ve kod yalnız harita verisi ile okuma yolunu değiştirdi; kayıt verisine yazan kod yok (tarama AC-22/2).
- **AC-27 (ölçüm yarısı):** geoBoundaries ADM1 `shapeName` (81) ve önbellekteki çalışma anı şehir listesi beş ili birebir taşıyor.
- **Mutasyon ölçümü:** `ilOzeti`'ye liste verilmeyince 2, il kartı toplamından `eslesmeyen` çıkarılınca 1, satış pini süzülmeyince 1, fabrika/bayi pin süzmesi kaldırılınca 1 test kırıldı.
- **Görsel kanıt:** `harita-0094-istanbul` kod değişmeden önce iki kez (0 fark) ve sonra (0 fark); sekiz yeni ekran (beş il, ilçesiz, eşleşmeyen, müşteri formu). Görüntü aracına `bekle:<seçici>` adımı eklendi (harita verisi eşzamansız yüklenir). `Harita.jsx` tasarım sözlüğünü kullanmadığı için kanıt eşlemesine kayıt yok.
- **Koşular:** Electron'suz takım 354 dosya, 4722 test yeşil; Electron 13 dosya, 20 test yeşil; lint 0 hata.
