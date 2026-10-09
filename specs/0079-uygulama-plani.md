# 0079 Uygulama Planı: Tevkifatlı Satış Faturası (gelir tarafı)

| | |
|---|---|
| **Bağlı spec** | `specs/0079-tevkifatli-satis-faturasi.md` (revizyon 2, plan onayıyla) |
| **Dal** | `feat/0079-satis-tevkifat` (main `2a03596`, v3.44.0 üstünde) |
| **Onay** | Takım Yöneticisi, 2026-10-09: Karar 1 ve planın tamamı kabul |

## 1. Kodda bulunanlar (spec'e ek)

- `calcKDV(` 106 çağrı, dosya dağılımı spec R11 ile birebir (ölçüldü).
- **Oran sondasının 17 çağrısı üç iş yapıyor** (Karar 1, spec R9/2 revizyon 2):
  - etiket (5): `ServiceForm:575`, `PartSaleForm:307`, `YedekParcaSatisForm:294`, `CustomerAddEditForm:451`,
    `CustomerDetailModal:1386` (`kdvOrani` prop'u; `KartYansitmaOzeti` bununla kart tutarını da hesaplıyordu);
  - kart tutarı (7): `kalipSatisi:62`, `yedekParcaSatis:37`, `CustomerDetailModal:178`, `CustomerDetailModal:645`,
    `ServisPanosu:518`, `Customers:295`, `CustomerAddEditForm:37`;
  - ödeme ayrıştırması (5): `Finance:298`, `Finance:479`, `aylikRapor:302` (`odemeKdv`), `Dashboard:295`,
    `deriveCustomerDetail:130`.
  Son iki grup `tahsilKdvOrani`'ya geçer; `KartYansitmaOzeti` ve `PaymentRowsEditor` etiket oranı ile tahsil oranını
  ayrı prop'larla alır.
- Ödeme kaydı (`payments`) tevkifat taşımaz; ayrıştırma müşteri kaydından okunur (beş yerde `c` zaten var).
  Bayrak sonradan açılınca eski ödemelerin mal/KDV ayrımı da yeni oranla okunur (okuma anında türer, kabul);
  yalnız kart anlık görüntüsü donuk kalır (R13/2).
- `customers` tek okuma yerinde (`db.cjs` `SELECT * FROM customers`) `...c` ile yayılıyor; destructuring'e geçer.
- `isFaturali`/`isYurtIci` zaten `normalizeSaleType` üstünden; kapı bu çifttir.

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/constants.js` | `TEVKIFAT_ORANLARI` (gider.js yeniden dışa verir) |
| `src/lib/utils.js` | `satisTevkifati`, `satisKdvBolumu`, `tahsilEdilecekKdv`, `tahsilKdvOrani`; `calcCiro` komisyon KDV'si (R12) |
| `src/lib/satisTevkifat.js` (yeni) | doğrulama, alan yazımı/silme (R5), dört not sabiti, rozet ve borç satırı metni, özet satırları |
| `src/lib/kalipSatisi.js`, `src/lib/yedekParcaSatis.js` | ortak kurucu: doğrulama, alanlar, kart tabanı |
| `src/components/Customers.jsx`, `customers/CustomerDetailModal.jsx`, `ServisPanosu.jsx` | makina iki kol, servis iki kurucu, kart tabanı |
| Gelir zinciri | `satisTahsilat.js`, `aylikRapor.js`, `Finance.jsx`, `Dashboard.jsx`, `SimpleDealers.jsx`, `deriveCustomerDetail.js`, `MachineTimeline.jsx`, `CustomerDetailModal.jsx`, `stock/YedekParcaSatisTab.jsx`, `settings/SettingsExport.jsx`, `printTemplates.js` |
| KDV kartı | `giderKdv.js`, `gider.js` `kdvKarsilastir` 4. parametre, `KdvKarsilastirmaKarti.jsx`, `Finance.jsx`, `Giderler.jsx` |
| Formlar | yeni `SatisTevkifatAlani.jsx`; `ServiceForm`, `PartSaleForm`, `YedekParcaSatisForm`, `CustomerAddEditForm`; `KartTaksitAlani.jsx`, `ui.jsx` `PaymentRowsEditor` |
| Rapor ve çıktı | `aylikRapor.js` `tevkifatliSatis`; `printTemplates.js` kutu, dipnot, Servis Formu satırları; servis çeviri anahtarları |
| Veri | `electron/db.cjs` `TEVKIFAT_COLUMNS`, dört tablo × dört nokta, `customers` destructuring |
| Testler | `tests/satis-tevkifat-0079.test.js`, `tests/ui/satis-tevkifat-0079.test.jsx`, `tests/fixtures/0079-tevkifatsiz-once.json`, `db-roundtrip.cjs`, `db-clean-install.cjs` |
| Kanıt | görüntü aracında `*-0079` ekranları, `0079-taban-piksel-raporu.json`, `0079-piksel-raporu.json`, `kanit-eslemesi.json` |

## 3. Kararlar (TY onayı)

- **Karar 1:** `tahsilKdvOrani` ile oran sondası ikiye ayrılır (spec revizyon 2).
- **Q2:** ödemeye tevkifat alanı eklenmez, müşteri kaydından okunur.
- **Q3:** eski ödemelerin ayrımı okuma anında yeni oranla (sürüm notunda).
- **Q4:** servisin iki para biriminde bölme her bedel çağrısında; bilgi rakamı para birimi başına.
- **Q5:** `kkYansit` dalında da tevkifat satırları basılır.
- **Q6:** Servis Formu satırları `servis` çeviri ad alanında TR/EN.
- **Q7:** kaynak taraması muafiyet biçimiyle, dosya listesiyle değil; ek taramalar R2 (dize kapısı yasağı), R6/3 (iki servis kurucusu).

## 4. Adım sırası

0. Tevkifatsız veri kümesinin bugünkü motor çıktısı fikstüre (`0079-tevkifatsiz-once.json`); görsel taban.
1. Sabit taşıma, utils yardımcıları, motor testleri (AC-9, 10, 12, 6, 45).
2. `satisTevkifat.js` ve beş kurucu.
3. Veritabanı, roundtrip, temiz kurulum.
4. Gelir zinciri, `calcCiro` R12, kaynak taraması.
5. Kart tabanı ve ödeme ayrıştırması (`tahsilKdvOrani`).
6. KDV kartı, aylık rapor kutusu ve dipnot, Servis Formu, dışa aktarma.
7. Form arayüzü, rozet, borç satırı.
8. Görsel kanıt, kanıt eşlemesi, CLAUDE.md, Electron dahil tam koşu ve lint.

## 5. Kriter ↔ test

M = `tests/satis-tevkifat-0079.test.js`, U = `tests/ui/satis-tevkifat-0079.test.jsx`.

| AC | Test |
|---|---|
| 1, 2, 3, 5, 40 | U |
| 4, 7, 8, 23 | M (kurucular), U (hata gösterimi) |
| 6, 11, 41, 45 | M kaynak taramaları |
| 9, 10, 12 | M |
| 13, 14, 15, 17, 18, 19, 20, 38 | M |
| 16, 27 | M (`kdvKarsilastir`), U (Finans ve Giderler kartı) |
| 21, 22, 24, 25, 37 | U (+ M kart tabanı) |
| 26, 28, 42, 43 | M |
| 29, 34 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| 30, 35 | M |
| 31, 39 | M (fikstürle birebir) |
| 32, 33 | `tevkifat-0075`, `kisitli-gider-0076` dokunulmadan yeşil + M çapraz |
| 36 | M |
| 44 | `gider-kasa-raporu-0059` dokunulmadan yeşil |

## 6. Sapmalar ve notlar

- **"Önce" fotoğrafı:** `tests/fixtures/0079-veri.js` tevkifatsız veri kümesi; motor çıktıları (`0079-tevkifatsiz-once.json`) ve
  ekran metinleri ile dışa aktarma satırları (`0079-ekran-once.json`) kod değişmeden önce, sabit günle (2026-10-09) yazıldı. Dışa
  aktarma satırlarında eski sütunlar birebir, yeni iki sütun boş beklenir.
- **Mekanik taşıma:** 84 çağrı betikle (`calcKDV(tip, …)` → `tahsilEdilecekKdv(tip, …, kayıt)`, kayıt ilk argümanın nesnesi),
  kaydı çözülemeyen üç çağrı elle (rapor `kartSatisEkle`, Anasayfa `kdvli`, Finans Özeti `tip`).
- **Kart tabanının işareti (R13/2):** düzenleme kurucuları kart komisyonunu her kayıtta yeniden hesaplıyor; anlık görüntünün
  değişmemesi için anlık görüntü tabanını `tevkifatTaban` ile taşır ve düzenleme formu kayıtlı tabanla hesaplar. Spec'in "kart
  bilgisi yeniden girildiğinde" hâli formdaki "Kart komisyonunu yeni tabanla hesapla" düğmesidir (makinada yeni tahsilat).
- **AC-5:** kutu kapalıyken rakamlar ve kalan etiketler aynı; ama faturalı yurtiçi formda kutunun kendisi yeni satırdır, bu
  yüzden form ekranları görselde değişir. `ui/form-paylasilan` ve `ui/yedek-parca-form-teslim` yeni kutuyla güncellendi (kesin
  sayılarla, gevşetilmeden).
- **Finans Özeti:** Extra Kalıp KDV'si bugün de Finans Özeti'nin KDV toplamına girmiyor; tevkifat bunu değiştirmedi.
- **Tasarım sözlüğü atıfları:** eklenen satırlar yedi dosya:satır atfını kaydırdı; yeniden eşlendi.
- **Mutasyon:** müşteri formunda tahsil oranı ve `calcCiro`'nun komisyon KDV'si eski hâline çevrilince üç test düştü.
- **Triyaj (2026-10-09):**
  1. Yeni kart tabanı (`kartTabanKaydi`) fatura tipi kapısından geçmiyordu: kutu işaretliyken tip faturasıza ya da yurtdışına
     çevrilen kalıp, servis ve yedek parçada anlık görüntü `tevkifatTaban` işareti alıyor, tip sonra düzeltilince gereksiz uyarı
     ve eksik KDV'li kart tabanı çıkıyordu. Taban artık kapı kapalıyken tevkifatsız; regresyon testi düzeltmesiz kodda düştü.
  3. Aylık raporun tevkifatlı satış adedi çok satırlı faturayı satır satır sayıyordu; anahtar `batchId` (yoksa kayıt) oldu.
  4. Servis fatura tipi kırılımı tevkifatlı serviste işçilik ve parçayı ayrı yuvarladığı için KDV özetinden 1 kuruş sapabiliyordu;
     bize kalan KDV birleşik bedelde bulunup oranla dağıtılıyor (tevkifatsız serviste hesap aynı, altın HTML aynı).
  2. Görsel kanıt üretildi: taban `2a03596` çalışma ağacından, yeni ekranlar dahil aynı sayfayla (eski kod tevkifat alanlarını yok
     sayar); 662 görüntünün 44'ü değişti (22 ekran: faturalı yurtiçi formlarda yeni kutu satırı ve `*-0079` ekranları). İlk
     turda değişmiş görünen `bayiler-liste` (3 px), `stok-makina-parti` (83 px) ve `uygulama-menu-kasali` (31 px) iki ağaçta aynı
     turda yeniden çekildi, 0 piksel (gürültü, 0076 emsali). Kanıt eşlemesine değişenler `degisti` (TY onayı, triyaj talimatı),
     tevkifatsız ekranlar `ayni` olarak eklendi; `0079-taban-piksel-raporu.json` değişen 44 görüntüyü bugünkü kodla onaylı
     "sonra"ya karşı ölçer: 0 fark.
  5. AC-44 adlı test eklendi (iki altın dosyanın içerik özeti main `2a03596` ile aynı, faaliyet raporu birebir).

## 7. Sürüm notu

> **Tevkifatlı satış faturası.** Müşteri (makina satışı), servis, Extra Kalıp ve yedek parça formlarında fatura tipi
> "Faturalı Yurtiçi" iken "Bu fatura tevkifatlı" kutusu var. İşaretleyip oranı seçin: müşterinin borcu ve tahsil
> edilecek tutar, alıcının kendisinin beyan edeceği KDV kadar düşer; Finans'ın KDV Karşılaştırması ve aylık rapor
> beyan edeceğimiz KDV'yi doğru gösterir, alıcının beyan edeceği kısım ayrı bilgi satırıdır. Geçmiş bir satışı
> işaretlerseniz o müşterinin borcu ve o ayın KDV'si düşer, o satışa ait ödemelerin KDV ayrımı da yeniden hesaplanır;
> ama kayıtlı kredi kartı komisyonu eski tabanla kalır (gerekiyorsa kart bilgisini yeniden girin). **Önce sunucu
> bilgisayarını, sonra bütün istemcileri güncelleyin; güncelleme bitene kadar kutuyu işaretlemeyin** (güncellenmemiş
> sunucu alanları kaydetmez; güncellenmemiş istemci onları hesaba katmaz, müşteri borcu ve aylık KDV orada fazla görünür).
