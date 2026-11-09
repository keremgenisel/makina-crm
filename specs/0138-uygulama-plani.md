# 0138 — Uygulama planı: Dış işlem kataloğu kalkar

| | |
|---|---|
| **Spec** | `specs/0138-dis-islem-katalogu-kalkar.md` (Onaylandı, 2026-11-09) |
| **Taban** | main `619f6275` (v3.57.0) |
| **Dal / çalışma yeri** | `feat/0138-dis-islem-kalkar`, worktree `../wt0138` (ana dizinde checkout yok) |
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-09): §3'teki on dört önerinin hepsi kabul edildi, spec'e Karar 27–34 olarak işlendi. Uygulamada. |

Bu iş bir kaldırma işidir; yeni davranış iki yerde var: bir kerelik göç (R15–R16/2) ve eski biçimli
kalemin savunması (R2/2). Geri kalan her şey 0137'nin eklediği satırların sökülmesi ve 0135/0136'nın
hâline dönüştür. Yeni eylem izni, yeni sunucu kuralı, yeni birleştirme kuralı yoktur (C5).

---

## 1. Değişecek ve eklenecek dosyalar

### 1.1 Silinecek dosyalar

| Dosya | Gerekçe |
|---|---|
| `src/lib/disIslem.js` | Motor (R1, R2) |
| `src/lib/disIslemEtkisi.js` | Zam önizlemesi (R3) |
| `src/components/DisIslemManager.jsx` | Panel (R1) |
| `src/components/DisIslemFiyatPenceresi.jsx` | Fiyat penceresi (R1, R3) |
| `tests/fixtures/0137-yeni-bolum.js` | Bekçi fikstürü (C7, AC-41) |
| `tests/dis-islem-0137.test.js`, `tests/dis-islem-0137-kiyas.test.js`, `tests/dis-islem-0137-cagri.test.jsx`, `tests/ui/dis-islem-0137.test.jsx`, `tests/ui/dis-islem-0137-parca.test.jsx`, `tests/ui/dis-islem-0137-app.test.jsx` | Kalkan davranışı iddia ediyorlar. Hâlâ geçerli iddialar (belirsiz sayı tek yer taraması R25, serbest kalemin doğrulaması) 0138 testlerine taşınır, sonra dosyalar silinir. `0137-once.json` altını kalır (0137 öncesi kıyas olarak başka test kullanmıyorsa silinir; adım 6'da bakılır). |

### 1.2 Eklenecek dosyalar

| Dosya | İçerik |
|---|---|
| `electron/disIslemGocuSaf.mjs` | Göçün saf çekirdeği `disIslemGocPlani(parts, disIslemler)` → `{ degisen: [{ id, maliyetKalemleri }] }`. `src/` okumaz (ölçüm H). Adet birimli tutar: `kurusYuvarla(birimFiyati × kur)` × adet, `tutar = tutarK / 100` iki ondalık (R15/4). Kilo birimli, çöpteki, fiyatı boş, kuru eksik, para birimi tanınmayan ve kaydı bulunmayan işlemde tutarsız kalem; kaydı bulunmayanda `ad = "Dış işlem"` (R15/3). Boş `paraBirimi` TL. |
| `scripts/tests/dis-islem-gocu.cjs` | Electron göç testi (`kalip-tamiri-gocu.cjs` emsali): üç açılış dalı, bayrak, yedek koşulu, ikinci açılış, C4. `tests/db-electron.test.js`'e bir blok eklenir. |
| `tests/dis-islem-gocu-0138.test.js` | Saf çekirdeğin node testi (vitest `.mjs`'i doğrudan alır) + 0137 motoruyla eşitlik (altın, aşağıda). |
| `tests/dis-islem-kalkar-0138.test.js` | Saf motor, savunma, imza ve kaynak taramaları, sayı iddiaları, tek yer taraması (R25). |
| `tests/dis-islem-kalkar-0138-kiyas.test.js` | C1 kıyası, altın `tests/fixtures/0138-once.json`. |
| `tests/ui/dis-islem-kalkar-0138.test.jsx` | Panel listesi, parça kartı, çöp, Tedarikler, yedek ekranı, malzeme paneli örnek düğmesi. |
| `tests/ui/dis-islem-kalkar-0138-app.test.jsx` | Gerçek App: kayıt gövdesi, otomatik yedek gövdesi, prop zinciri, ayrı pano anlık görüntüsü. |
| `tests/fixtures/0138-once.json` | Spec öncesi koddan üretilmiş kıyas altını (adım 1). |
| `tests/fixtures/0138-goc-altin.json` | 0137 motorunun (`islemKalemiOzeti`) adet kalemleri için ürettiği satır tutarları; göç çekirdeğinin eşitlik altını (adım 1). |
| `tests/fixtures/0138-veri.js` | Ortak test verisi (serbest kalemli, malzeme kalemli, karma, setli, kalemsiz parçalar; malzemeler, tedarikçiler, model kiti, parti, yedek parça satışı). |
| `docs/evidence/0138-taban-piksel-raporu.json`, `docs/evidence/0138-piksel-raporu.json` + JPEG'ler | Görsel kanıt. |

### 1.3 Değişecek kaynak dosyaları

**Saf motorlar (`src/lib/`)**

| Dosya | Değişiklik |
|---|---|
| `maliyetKalemleri.js` | `serbestIslemMi`, `katalogIslemVarMi`, `kalemYoluMu`, `kalemIslemIdleri` silinir; `kalemTedarikciIdleri` 0135 hâline (süzgeçsiz) döner; savunma ayracı tek ad olarak kalır (Belirsizlik B1). |
| `urunAgaci.js` | `disIslem` içe aktarması kalkar. Beşinci parametre `parcaMaliyetKurus`, `parcaMaliyetiVar`, `maliyetGirildiMi`, `parcaMaliyetMetni`, `maliyetKaynagi`'dan; `maliyetKalemleriOzeti` dördüncüsü (eski kalem → `cozuldu: false`, `eksik: [ESKI_KATALOG_KALEMI_NEDENI]`, toplam `null`); `setOzeti(icerik, katalog, tarih, malzemeKat, fiyatOku)` (R11/2 Karar); `maliyetGecmisiYaz` kapısı `set || malzeme`, `katalogIslem`/`islemKat` seçenekleri kalkar; `gecmisliKayit`, `maliyetGecmisiSatirlari` (üçüncü), `kalemlerDogrula` (ikinci), `formKalemOzeti` (üçüncü ve dördüncü) daralır; `katalogKalemFormu`, `katalogIslemSec`, `CESIT`, kilo miktarı alanları ve çeşit metinleri silinir; `kalemFormu` eski kalemi `{ ad: "Dış işlem", tutar: "" , tedarikciId: "" }` serbest forma açar; `KALEM_GECMIS_IBARESI` silinir; `KALEM_BOS_METNI` `5d2f4285`'teki metne birebir döner (R23). |
| `malzeme.js` | `disIslem` içe aktarması, `islenmisKg`, `parcaIslenmisKg` ve yalnız onlara ait neden sabitleri silinir (R19); `fiyatEtkisi`'nin `disIslemler` seçeneği kalkar (R3). `tutarGirdisi.js`'ten yeniden dışa verme aynen kalır (R25). |
| `parcaFiyati.js` | `fiyatBaglamiKur`'dan `disIslemler` anahtarı ve `islemKat` alanı, `parcaSatisFiyati`'nın beşinci argümanı kalkar. Modül düzeyinde okunan ad bırakılmaz (döngü tuzağı). |
| `makinaStandartMaliyet.js` | `modelMaliyeti` altıncı parametre, `modelMaliyetleri` veri nesnesinin `disIslemler`'i, `parcaKatalogu`, `tarihliDirekt`'in tembel işlem haritası. |
| `parcaAktarma.js` | `parcaDisaAktarmaSatiri` beşinci, `parcaSatirlariniCoz` yedinci parametre; `katalogIslem` geçişi. |
| `gider.js` | `kalemdeGecenTedarikciler(parts)` tek parametre, `islem`/`islemCop` alanları ve `KALEMDE_VE_KATALOGDA_TEDARIKCI_NEDENI`, `tedarikciKorumaNedeni`'nin iki adresli dalı (R5, R22). |
| `merge.js` | `MERGE_KEYS`'ten `disIslemler`, kalem içi `islemId` ve işlemin `tedarikciId` remap'i. |
| `kilitAlanlari.js` | `ayar.disislemler`, pencere listesi, kilitsiz gerekçeleri (R8). |
| `bolumAdlari.js` | `disIslemler` adı (R7). |
| `yedekPaketleri.js` | "Tanımlar" paketinden `disIslemler` (R6/2). |
| `ornekKatalog.js` | Yalnız `ISLEM_FORMLARI`, `ornekDisIslemler` (R9/2). |
| `copKutusu.js` (varsa ilgili satır) | `disIslemCopEtiketi`, `kullanilanDisIslemler` (R22); yerleri adım 3'te kesinleşir. |

**Electron**

| Dosya | Değişiklik |
|---|---|
| `electron/db.cjs` | Okuma (`SELECT * FROM dis_islemler`) ve **yazma bloğu** (`DELETE` + `INSERT`) kalkar (R17/2); `TABLES_WITH_TRASH`'ten `dis_islemler` (24 → 23), `maxIdAcross`'tan `data.disIslemler` (R24); `CREATE TABLE dis_islemler` ve sütunları **kalır** (B4); yeni `disIslemGocu(conn, dbPath)` (`meta.disIslemGocu0138`), üç açılış dalında `kalipTamiriGocu`'dan sonra; dışa verilir. |
| `electron/serverAuth.cjs` | `BLOB_SECTIONS`, `SECTION_GROUP`, `BOLUM_SEKMELERI`'nden `disIslemler` (34 → 33). Yeni kural yok (ölçüm I). |
| `electron/server.cjs` | `BOLUM_ADLARI`'ndan `disIslemler`. |

**Ekranlar (`src/components/`, `src/App.jsx`)**

| Dosya | Değişiklik |
|---|---|
| `MaliyetKalemleriAlani.jsx` | Çeşit seçicisi, `SearchPick`, salt okunur birim/fiyat, kilo miktarı, çeşit onayı, `serbestSayi` koşulları; eski kalem satırında neden (`eski-katalog-kalemi`), tutar alanı açık; tek ibare `MALZEME_GECMIS_IBARESI`. |
| `PartManager.jsx` | `disIslemler` prop'u, ham/canlı harita, `katalogIslem` geçişleri, `KALEM_GECMIS_IBARESI` dalı. |
| `MalzemeManager.jsx`, `MalzemeFiyatPenceresi.jsx` | `disIslemler` prop'u ve `fiyatEtkisi` seçeneği; örnek düğmesi aynen (AC-48). |
| `Settings.jsx` | Katalog menü öğesi, `DisIslemManager` dalı ve `ayar:disislemler`, yedi alt bileşene inen `disIslemler`/`rawDisIslemler`/`setDisIslemler`. |
| `settings/SettingsTrash.jsx` | Dış işlem satırı, geri alma, kalıcı silme, boşaltma kolu, ad çakışması, tedarikçi koruma haritasının işlem kolu. |
| `settings/SettingsBackup.jsx` | Elle yedek gövdesi, geri yükleme dalı, kısmi geri yükleme listesi; eski yedekteki anahtar yok sayılır (R6). |
| `settings/SettingsExport.jsx`, `settings/SettingsImport.jsx` | `disIslemler` imzası ve `parcaSatirlariniCoz`/`parcaDisaAktarmaSatiri` çağrıları. |
| `settings/SettingsAuditLog.jsx` | `dis_islem` etiketi (R20). |
| `gider/Tedarikciler.jsx`, `Giderler.jsx` | `disIslemler` prop'u, "n dış işlemde geçiyor" cümlesi, iki adresli ret. |
| `MakinaMaliyeti.jsx` | `disIslemler` prop'u, `BOS_ISLEMLER` ve memo bağımlılığı (R11/3: yerine satır içi `[]` yok). |
| `Customers.jsx`, `SimpleDealers.jsx`, `Stock.jsx`, `Documents.jsx`, `ServisPanosu.jsx` | `fiyatBaglamiKur`'a geçirilen `disIslemler` ve prop. |
| `ServisPencere.jsx` | Anlık görüntüden okunan `disIslemler`. |
| `App.jsx` | Durum, yükleme, kayıt gövdesi, kayıt bağımlılık dizisi, otomatik yedek, dokuz prop yeri, ayrı pano anlık görüntüsü, çöp temizliği (`purgeOldTrash` 28 → 27), tedarikçi `koru`'su, `silmeUygula`/`apply` satırları. |

**Betik, belge**

| Dosya | Değişiklik |
|---|---|
| `scripts/evidence/0009-sayfa.jsx` | Dış işlem ekranları silinir, `disIslemler` verisi kalkar; 0138 ekranları eklenir. |
| `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs` | 0137 blokları kalkar; ölü tablo + çöpteki satırın okunmadığı (AC-6, AC-33), temiz kurulum (AC-34) blokları. |
| `scripts/tests/server-security.cjs` | AC-32 bloğu. |
| `docs/evidence/kanit-eslemesi.json` | Silinen iki dosyanın anahtarı kalkar; değişen ekranlar `degisti` + onay, done'da `ayni`. |
| `docs/tasarim-sozlugu.md` | 0137'nin dış işlem panel/pencere atıfları varsa kalkar (tarama `tasarim-kaynak` dosya:satır doğruluğu). |
| `CLAUDE.md` | 0137 bölümüne kaldırma notu, 0135'in "Spec 0137 ile" satırı düzeltilir, 0138 bölümü. |

### 1.4 Güncellenecek mevcut testler ("spec 0138 ile" notuyla)

- Bekçi zinciri (C7, AC-41): `tests/fixtures/0133-yeni-ayar.js` ve onu kullanan dokuz dosya: `extra-kalip-isareti-0107`, `hammadde-0096`, `harita-ilce-0094`, `makina-durumu-ondoldur-0109`, `maliyet-gecmisi-0097`, `plan-adetler-0093`, `tahsilat-hesap-izni-0098`, `ucretsiz-yedek-parca-0095`, `uretim-formu-bagi-0108`.
- Sayı iddiaları (AC-42): `cop-kutusu-0068`, `cop-kutusu-0078`, `ui/standart-kalkar-0082` (yedek anahtarları, App gövde deseni), `yedek-paketleri-0086` (iki dosya), `standart-kalkar-0082`.
- Desen ve imza: `hammadde-0096` (`kalemdeGecenTedarikciler`), `malzeme-0132`, `ui/malzeme-0132-app`, `parca-fiyati-0133`, `ui/set-icerigi-0121` (setOzeti konumu), `maliyet-gecmisi-0097-cagri`, `donan-maliyet-0136-cagri`, `ornek-katalog.test.js` (dış işlem blokları), `server-authz.test.js` (0137 bloğu), `kilit-alanlari`, `islem-gecmisi-etiketleri`, `maliyet-kalemleri-0135` (varsa 0137 ile güncellenmiş iddialar geri döner).

---

## 2. Adım sırası

0. **Hazırlık.** `git worktree add -b feat/0138-dis-islem-kalkar ../wt0138 main`; `npm ci`, `node node_modules/electron/install.js` (504'te tekrar), `node scripts/ensure-native.cjs --denetle`. Taban test takımı yeşil mi, bakılır.
1. **Altınlar (kod değişmeden).** HEAD koduyla `0138-once.json` (C1 kapsamı §4'te) ve `0138-goc-altin.json` (0137 `islemKalemiOzeti`'nin adet kalemleri için tutarK'sı: TL, USD kurlu, boş paraBirimi, çok adetli, ondalık fiyatlı). Üretici `YAZ_0138=1` ile testin içinde (0089/0092 emsali). Taban kanıt raporu da bu kodla çekilir.
2. **Göç (katman 1, dış işlem kodu hâlâ yerindeyken).** Saf çekirdek + node testi altına karşı; `db.cjs` `disIslemGocu` + üç dal + Electron testi. Önce yazılır çünkü eşitlik altınının anlamı 0137 motorunun yanında kurulmasıdır ve göç tabloyu okuyabilmelidir (tablo kalır).
3. **Saf motorlar.** Sıra: `maliyetKalemleri.js` (savunma ayracı) → `urunAgaci.js` → `malzeme.js` → `parcaFiyati.js` → `makinaStandartMaliyet.js` → `parcaAktarma.js` → `gider.js` → `merge.js`, `kilitAlanlari.js`, `bolumAdlari.js`, `yedekPaketleri.js`, `ornekKatalog.js`; sonra `disIslem.js` ve `disIslemEtkisi.js` silinir. Her imza daralmasından sonra `git grep` ile R11/2 listesindeki çağıranlar aynı adımda düzeltilir.
4. **Electron ve sunucu.** `db.cjs` okuma/yazma/çöp/sayaç, `serverAuth.cjs`, `server.cjs`.
5. **Ekranlar.** Yapraktan köke: `MaliyetKalemleriAlani` → `PartManager` → Malzeme bileşenleri → Settings alt bileşenleri → `Settings` → Tedarikler/Giderler → MakinaMaliyeti → altı satış ekranı → `ServisPencere` → `App`. İki ekran dosyası silinir.
6. **Testler.** Yeni 0138 testleri; 0137 testlerinden geçerli iddialar taşınır, dosyalar silinir; §1.4'teki güncellemeler.
7. **Doğrulama.** `npm run lint` (0 hata), `npm test` tam (Electron dahil), `ensure-native --denetle`, kaynak taraması; mutasyon denemeleri (savunma satırı ve db yazma bloğu geri konunca test kırılıyor mu) **dosya kopyasıyla**, `git checkout` ile değil.
8. **Kanıt ve belge.** Görüntü aracı (panel listesi, parça kartı işlem kalemi ve boş durumu, eski kalem nedeni, çöp kutusu, yedek paketleri, Tedarikler silme onayı), eşleme, `CLAUDE.md`, sürüm notu (§6). `specs/README.md` analistin dosyası, dokunulmaz.

---

## 3. Riskler ve emin olmadığım noktalar

Her biri için önerim ve gerekçem.

- **B1. Savunma ayracının adı.** R2/2 `eskiKatalogKalemi` diye yeni bir okuyucu yazıyor, R11/4 ise "`katalogIslemMi` yalnız savunma olarak kalır" diyor; aynı işi yapan iki ad.
  **Öneri:** tek ad `eskiKatalogKalemi`, `katalogIslemMi` silinir. Gerekçe: katalog kalktıktan sonra "katalog işlemi mi" adı var olan bir kavramı ima eder; C3/2 istisnası tek adla daha dar yazılır. R11/4'ün niyeti (bir yardımcı savunma için kalır) korunur.

- **B2. Eski kalemli parçanın tarihli okuması.** R12 kapıyı yalnız malzeme kalemine indiriyor. Yalnız eski biçimli işlem kalemi olan (malzemesiz) parçada bugünkü okuma `null` döner, ama tarihli okuma parçanın kendi geçmişine düşer ve geçmiş günler için eski bir rakam verebilir; yani aynı parça bugün "girilmedi", dün "1.200 TL" görünür.
  **Öneri:** `tekilMaliyetKurus` eski biçimli kalem varsa tarihten bağımsız `null` döner; `maliyetGecmisiYaz` kapısı spec'teki gibi `set || malzeme` kalır. Gerekçe: AC-37'nin amacı "sessizce rakam üretme"dir, tarihli yol da rakam üretmemeli; geçmiş yazımına dokunmamak R12/2'yi harfiyen tutar. Veri sıfır olduğu için davranış farkı yalnız sigorta penceresinde görünür.

- **B3. Göç kapsamı çöpteki parçalar.** R15 "katalog bağlı her kalem" diyor, çöpü söylemiyor.
  **Öneri:** çöpteki parçalar da göçe girer. Gerekçe: göç yalnız bir kez çalışır; çöpten sonra geri alınan parça göçsüz kalır ve savunmaya düşerdi. C4 (başka alana dokunma) aynen korunur.

- **B4. `CREATE TABLE dis_islemler` şemada kalsın mı.** AC-34 "temiz kurulumda dış işlem bölümü hiç oluşmaz" diyor; R16/2 "dış işlem tablosu temiz kurulumda boş doğar" diyor.
  **Öneri:** `CREATE TABLE` ve sütun göçleri kalır, AC-34'teki "bölüm" blob bölümü olarak okunur. Gerekçe: 0082 emsali (`standart_giderler` hâlâ şemada); göç sorgusu tablonun varlığına güvenebilir; tabloyu temiz kurulumda yaratmamak eski sürüme geri dönüşte yazma hatası doğururdu (X6'nın gerekçesi).

- **B5. Kilo birimli ama miktarı elle girilmiş kalem.** Böyle bir kalemin tutarı geometri istemeden hesaplanabilir, ama R15/2 "kilo her zaman tutarsız" diyor.
  **Öneri:** spec'e uyulur, her kilo kalemi tutarsız. Gerekçe: veri sıfır; ikinci bir dal sigorta maddesini büyütür ve çekirdeğin test yüzeyini genişletir. Kullanıcı ad ve tedarikçiyle tutarı girer.

- **B6. Göçteki adet değeri.** 0137 adet kaleminde `miktar` saklı; boş ya da geçersizse 0137 motoru kalemi çözülemeyen sayıyordu.
  **Öneri:** çekirdek `kayitliMiktar`'ın adet kuralını (1..1000 tam sayı) aynen uygular, geçersizde tutarsız kalem. Gerekçe: göç anındaki satır tutarı "0137 motorunun o an göstereceği tutar" olmalı (R15); altın eşitliği (`0138-goc-altin.json`) bunu sabitler.

- **B7. AC-29 (istemci kipinde göç çalışmaz) nasıl ölçülür.** İstemci kipinde `migrateFromJsonIfNeeded` hiç çağrılmıyor; Electron'da istemci kipini kurmak pahalı.
  **Öneri:** kaynak taraması (çağrı yalnız `migrateFromJsonIfNeeded`'ın üç dalında, `ipc/data.cjs` istemci yolunda yok) + Electron testinde `isActive()` false iken göç fonksiyonunun hiçbir şey yazmadığı. Gerekçe: 0115 (`kalipTamiriGocu`) aynı yolla kapatıldı; davranış ölçümü yerine yapı ölçümü burada daha güvenilir.

- **B8. C1 kıyasının iki boş yarısı (C1/2).** Sipariş ihtiyacı motoru ve aylık rapor dış işlemi hiç okumuyor; kıyas her durumda geçer.
  **Öneri:** iki yarı altında kalır ama test dosyasında kapsam yorumu yazılır ("yapısal olarak dokunulmuyor, kıyas yalnız gerileme bekçisidir") ve veri boş olmasın diye malzeme kalemli parça (sipariş satırı üretir) ile yedek parça satışı (rapor satırı üretir) fikstüre girer. Gerekçe: C1 bu yarıları istiyor; boş geçen kıyas yanlış güven üretir, dolu veriyle en azından gerileme yakalanır.

- **B9. Eski yedekteki `disIslemler` anahtarı ve 0086 bekçisi.** `yedek-paketleri-0086` dal ↔ paket listesini iki yönlü karşılaştırıyor; geri yükleme dalı kalkınca anahtar yok sayılır.
  **Öneri:** geri yükleme kodu anahtarı hiç anmaz (açık "yok say" dalı yazılmaz). Gerekçe: C3 taraması anahtar adını yasaklıyor; bilinmeyen anahtar zaten okunmaz, AC-31 bunu testle gösterir.

- **B10. 0137 testlerinin silinmesi.** Altı dosya silinirse 0137'nin kalan geçerli iddiaları (R25 tek yer, serbest kalem doğrulaması, 0137 Karar 47'nin malzeme penceresi gerilemesi) kaybolabilir.
  **Öneri:** silmeden önce her dosyada "kalan davranış" iddialarını listeleyip 0138 dosyalarına taşıyacağım; taşınanlar test adında kaynak spec'i (`0137 R25 → 0138 AC-50`) taşır. Gerekçe: R25 bunu açıkça istiyor, diğerleri sessiz kayıp riski.

- **B11. Döngüsel içe aktarma.** `malzeme.js` ↔ `parcaFiyati.js` zinciri; `disIslem` çıkınca modül düzeyinde okunan bir ad kalırsa yükleme sırasına göre `undefined` olur.
  **Öneri:** iki dosyada modül düzeyinde içe aktarılan ad kullanımını tarayan test (0133 emsali) ve iki giriş sırasıyla yükleme testi. Gerekçe: 0133 ve 0137'de bir kez oldu.

- **B12. Konumlu parametre kayması.** `setOzeti`'nin `fiyatOku`'su altıncıdan beşinciye döner; atlanan çağıran hata vermez.
  **Öneri:** imza taraması (`setOzeti(` çağrılarının argüman sayısı) + `ui/set-icerigi-0121`'deki toplam fiyat düğmesinin davranış testi. Gerekçe: AC-40 ve 0137'deki aynı ders.

- **B13. Kanıt kaydı onayı.** Değişen ekranlar `beklenen: "degisti"` + TY onayı ister.
  **Öneri:** onay satırını `Takım Yöneticisi · 2026-11-09 · spec 0138 R1/R2/R4/R6` ile, sizin bu planı onaylamanıza dayanarak yazarım; done'a taşırken `ayni`. Gerekçe: eşleme kuralı.

- **B14. `specs/README.md` durum satırı.** Analistin commit edilmemiş değişikliği var.
  **Öneri:** dokunmam; satırı analist günceller. Gerekçe: standing rule.

---

## 4. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>` taşır. Kısaltmalar: **S** = `tests/dis-islem-kalkar-0138.test.js`, **K** = `-kiyas`, **U** = `tests/ui/dis-islem-kalkar-0138.test.jsx`, **A** = `tests/ui/dis-islem-kalkar-0138-app.test.jsx`, **G** = `tests/dis-islem-gocu-0138.test.js`, **E** = `scripts/tests/dis-islem-gocu.cjs` (db-electron), **RT** = `db-roundtrip.cjs`, **CI** = `db-clean-install.cjs`, **SS** = `server-security.cjs`.

| AC | Kanıt |
|---|---|
| AC-1 | U: Ayarlar Katalog menüsünde "Dış İşlemler" yok |
| AC-2 | U: işlem kalemi eklenince çeşit seçicisi yok, ad/tutar/tedarikçi var |
| AC-3 | U: arama kutusu, salt okunur birim/fiyat, kilo miktarı yok |
| AC-4 | U + S: `kalem-bos` metni `5d2f4285`'teki dizeyle birebir (dize testte sabit, git'ten alınmış) |
| AC-5 | K: `malzeme.fiyatEtkisi` çıktısı altınla birebir; U: pencere `disIslemler` prop'u almaz (kaynak) |
| AC-6 | RT: çöpteki `dis_islemler` satırı okunan blob'da yok; U: SettingsTrash dış işlem satırı çizmez |
| AC-7 | U: tutarlı serbest kalem maliyete girer (kart toplamı) |
| AC-8 | U: tutarsız serbest kalem toplama girmez, uyarı görünür |
| AC-9 | U: adsız kalem kaydı engeller, `HataMetni` satırın altında |
| AC-10 | U: tedarikçisiz kalem kaydedilir |
| AC-11 | U: yalnız serbest kalemli parçada geçerlilik tarihi ve geçmiş listesi çizilir |
| AC-12 | U: malzeme kalemli parçada çizilmez |
| AC-13 | K: maliyet, satış fiyatı, model maliyetleri, parti hesabı, sipariş ihtiyacı birebir |
| AC-14 | K: parça Excel dışa aktarma satırları birebir |
| AC-15 | K (motor kayıt fonksiyonu) + A (gerçek App kaydedilen parça gövdesi) birebir |
| AC-16 | K: aylık rapor nesnesi ve Finans Özeti satırları birebir (kapsam yorumu B8) |
| AC-17 | S (`tedarikciKullanim`) + U (Tedarikler silme): kalemde geçmeyen tedarikçi silinir |
| AC-18 | S + U: yalnız malzeme kartının Ana tedarikçisi olan tedarikçi silinir |
| AC-19 | U: serbest kalemde geçen tedarikçi silinmez, neden satırda |
| AC-20 | S: ret metni tek adresli, "dış işlem" geçmez; dönüş anahtarları tam küme eşitliği |
| AC-21 | U (SettingsTrash boşaltma) + A (otuz gün `koru`) |
| AC-22 | E: kalemsiz veritabanında parçalar değişmez, bayrak yazılır |
| AC-23 | G (altınla eşit tutar) + E (uçtan uca) |
| AC-24 | G + E: çöpteki işlem, fiyatsız işlem → tutarsız, ad/tedarikçi korunur |
| AC-25 | G + E: kilo kalemi her zaman tutarsız |
| AC-26 | G + E: kalem sırası ve öteki alanlar (sütun sütun) değişmez |
| AC-27 | E: ikinci açılışta göç çalışmaz (bayrak) |
| AC-28 | E: değişecek parça varken `.dis-islem-gocu-*.bak` var, yokken yok |
| AC-29 | S (çağrı yeri taraması) + E (yerel db yokken yazım yok), B7 |
| AC-30 | U (paket cümlesi) + A (elle ve otomatik yedek gövdesinde anahtar yok) |
| AC-31 | U: `disIslemler` taşıyan yedek hatasız geri yüklenir, setter çağrısı yok |
| AC-32 | SS: eski istemci gövdesi 200, bölüm yazılmaz, audit `entity_name`'de ad yok, ölü tablo satırları öncesiyle aynı; server-authz: 403 yok |
| AC-33 | RT: tablo var, satırlar yazımdan sonra yerinde |
| AC-34 | CI: blob'da bölüm yok, hata yok, `disIslemGocu0138` bayrağı var |
| AC-35 | S: kimlik bazlı tarama, tam yollu istisna listesi (göç modülü, spec, `maliyetKalemleri.js` savunması), eskiyince kırılır |
| AC-36 | S: beş fonksiyonun tanımı dört parametreli, hiçbir çağrı beşinci argüman geçmez |
| AC-37 | S: eski kalem + malzeme kalemi → `parcaMaliyetKurus` null (B2 ile tarihli de null) |
| AC-38 | U: kartta eski kalem nedeni görünür, tutar alanı yazılabilir |
| AC-39 | U: düzenleme formunda ad "Dış işlem", kayıt engellenmez |
| AC-40 | S (imza ve çağrı taraması) + `ui/set-icerigi-0121` (toplama eşitle düğmesi) |
| AC-41 | S: fikstür dosyası yok ve zincir içe almıyor; dokuz bekçi dosyası yeşil |
| AC-42 | `cop-kutusu-0068/0078` (23, 27), `yedek-paketleri-0086` (33, 29) güncel sayılarla |
| AC-43 | G + E: kaydı olmayan işlem → `ad = "Dış işlem"`, tutarsız, sonra parça doğrulamadan geçer |
| AC-44 | G: tutar TL, iki ondalık (ör. 18750 kuruş → 187.5) |
| AC-45 | S: `islenmisKg`/`parcaIslenmisKg` kaynakta yok |
| AC-46 | S (kapı) + U (yalnız `MALZEME_GECMIS_IBARESI` dizesi, `KALEM_GECMIS_IBARESI` kaynakta yok) |
| AC-47 | `islem-gecmisi-etiketleri` (ters yön) + S (`dis_islem` yok) |
| AC-48 | U: malzeme panelinde örnek düğmesi çalışır; S + `ornek-katalog`: dış işlem örnekleri yok |
| AC-49 | A: kayıt gövdesi, bağımlılık dizisi (kaynak), otomatik yedek, ayrı pano anlık görüntüsü; S: dokuz çağrı ve yedi alt bileşen kaynak taraması |
| AC-50 | S: belirsiz sayı tanımı yalnız `tutarGirdisi.js`'te, `malzeme.js` yeniden dışa verir (0137'den taşınan tarama) |
| AC-51 | S: R22'nin adları kaynakta yok, dönüş şekli 0135 hâli |

---

## 5. C1 kıyas altınının kapsamı (C1/2)

`0138-once.json` HEAD (`619f6275`) koduyla, katalog kalemsiz veriyle üretilir: her parçanın
`parcaMaliyetKurus` (bugün ve iki tarihte), `maliyetKaynagi`, `parcaSatisFiyati` (TRY, USD),
`modelMaliyetleri`, `partiHesabi` (açık ve donmuş parti), `siparisIhtiyaci` (malzeme kalemli,
satır üreten veri), `parcaDisaAktarmaSatiri`, `parcaSatirlariniCoz` dönüşü, kayıt fonksiyonunun
gövdesi (dokunulmamış düzenleme), `malzeme.fiyatEtkisi` (fiyat ayarlı ve ayarsız),
`hesaplaAylikRapor` ve `finansOzetiSatirlari`. Test dosyasının başında her yarının neden dış
işlemden etkilenebileceği ya da yapısal olarak etkilenmediği yazılır.

---

## 6. Sürüm notu (taslak)

> Dış İşlemler kataloğu kaldırıldı. Parça kartında fason bedeli eskisi gibi "işlem kalemi" ile
> (ad, tutar, isteğe bağlı tedarikçi) yazılır. Kayıtlı 25 dış işlem uygulamada görünmez,
> veritabanında saklı kalır. **Önce sunucu bilgisayarı, sonra öteki bilgisayarları güncelleyin.**
> Güncellenmemiş bir bilgisayar dış işlem kaydetmeye çalışırsa değişiklik yok sayılır.
> Sunucu bilgisayarı güncellendikten sonra güncellenmemiş bir bilgisayarda katalogdan işlem kalemi eklenirse, bu kalem
> sonradan otomatik çevrilmez; parçanın maliyeti "girilmedi" görünür ve parça kartında kalemin tutarı girilerek düzeltilir.

---

## 7. Uygulama notları (2026-11-09)

- **Yöntem:** 0137'nin dokunduğu kaynak dosyalar 0136 hâline (`5d2f4285`) döndürüldü; 0137'den sonra gelen düğme düzeltmeleri (`e7f1cdd9`, `1c3a0a10`) ve örnek katalog düğmesi (`420c9048`) yeniden uygulandı. Diff'te dış işlem dışı satır yok (gözle denetlendi). Belirsiz sayı kuralı `tutarGirdisi.js`'te kaldı (R25).
- **Kıyas altını:** `0138-once.json` main `619f6275` kodundan, 0137'nin kıyas verisi + aylık rapor, Finans Özeti, kayıt adımı ve iki para birimli satış fiyatıyla. Raporun `olusturmaTarihi` alanı altına girmez (0127 dersi). 0137'nin `0137-once.json`'u 0137 testleriyle birlikte silindi; `0137-veri.js` 0138 verisinin tabanı olarak kaldı.
- **Göç altını:** `0138-goc-altin.json` 0137 motoru (`islemKalemiOzeti`) silinmeden önce beş adet kalemiyle üretildi (TL, USD, boş para birimi, ondalık fiyat, EUR × 1000).
- **Kart:** eski biçimli kalemde neden (`eski-katalog-kalemi`) yalnız tutar boşken çizilir; kartın canlı toplamı da o arada "girilmedi" (`formKalemOzeti().eskiBos`).
- **Mutasyon:** savunmanın iki katmanı (özet satırı, tarihli okuma) ayrı ayrı kaldırıldığında testler kırılıyor; ölü tablo yazma bloğu `db-roundtrip.cjs` ve `server-security.cjs` ile ölçülüyor.
- **Kanıt:** `0138-piksel-raporu.json` (134 görüntü): 64 ortak ekran taban (main) ile, 3 yeni ekran (`katalog-parca-0138-islem`, `-eski`, `-liste`). Farklar: kenar menüsünden "Dış İşlemler"in kalkması (~18 bin piksel, bütün Ayarlar ekranları), parça kartında çeşit seçicisinin kalkması, 0135 boş durum metni, yedek paketlerinde "Tanımlar" cümlesi. Çöp ve Tedarikler ekranları 0 fark. Eşlemede 129 kayıt `degisti` + onay; done'a taşınırken `ayni`ya çevrilir.
- **Doğrulama:** `npm test` 503 dosya / 7.042 test yeşil (Electron dahil), `npm run lint` 0 hata, `vite build` temiz, `ensure-native --denetle` SAĞLAM.

## 8. Triyaj düzeltmeleri (2026-11-09)

- **Bulgu 1 (orta):** maliyet bölümüne dokunulup eski biçimli kalemin tutarı boş bırakılınca kalem boş tutarlı serbest kaleme dönüşüyor ve maliyeti sessizce düşürüyordu. Seçilen yol: `kalemlerDogrula` tutarı boş eski satırı kayıttaki nesneyle aynen geri yazar (form `_eskiKalem` taşır, kayda yazılmaz); maliyet "girilmedi" kalır, kart nedeni kayıttan sonra da doğrudur. Kayıt engellenmez (kalemi kaldırmak ya da tutar girmek kullanıcıya kalır). Testler: motor ve gerçek Settings tamamlayıcıları, mutasyonla ölçüldü.
- **Bilgi:** sürüm notuna bayraktan sonra gelen kalem cümlesi eklendi (§6); JSON göç dalı Electron testinde gerçekten koşuyor; `tutarGirdisi.js`'in bayat yorumu düzeltildi.
- Kapanışa kalanlar (done adımında): `0138-taban-piksel-raporu.json`, eşlemedeki 129 `degisti` kaydının `ayni`ya çevrilmesi, commit'te bütün yeni dosyaların eklendiği.

## SCORECARD

(Done'a taşınırken doldurulur.)
