# 0095 Uygulama Planı: yedek parça satışında garanti içi ücretsiz verme

| | |
|---|---|
| **Spec** | `specs/0095-yedek-parca-garanti-ici-ucretsiz.md` (revizyon 4) |
| **Dal** | `feat/0095-ucretsiz-yedek-parca`, `origin/main` (`954353e`, v3.48.0) üstünde, çalışma kopyası `../wt-0095` |
| **Onay** | Takım Yöneticisi, 2026-10-20: plan turunun bütün maddeleri (P1–P4, K1–K8) onaylandı |

## 1. Plan turu kararları (spec revizyon 4'e işlendi)

| # | Bulgu | Karar |
|---|---|---|
| P1 | Bedelin 13. kopyası `src/lib/dashboardStats.js:45` (Anasayfa Son Satışlar, `Number` ile çözüyordu) | Tek okuma yoluna bağlandı; ücretsizde satır ibare yazar (AC-49) |
| P2 | AC-41'in yönü ters: 00:30'da `today()` dünü verir, ayırt edici durum **dün** biten garantidir | AC-41 düzeltildi; test dün (uyarı çıkar) ve bugün (çıkmaz) durumlarını ayrı sınar |
| P3 | AC-34 taraması Extra Kalıp ve form durumu yazımlarını yakalar | Gerekçeli, tam yollu, sayılı istisna listesi |
| P4 | AC-32 taraması teklif/fatura kalemlerini ve iki form satırını yakalar | Gerekçeli, tam yollu, sayılı istisna listesi |
| K1/K2 | Kredi kartı dalı `ucretsizUygula`'dan önce saklı fiyatı ölçekler; bozuk tevkifat oranı kaydı engeller | Ücretsizde kart dalı çalışmaz, tevkifat doğrulanmaz (R7/4, AC-50) |
| K3 | Karışık parti (düzenlemeyle oluşur) | Ödeme düğmeleri yalnız ücretli satırlara yazar; kargo Genel Toplamı ücretli satırların toplamı, ibare satır başına (R23, AC-48). Toplu düzenleme formu işareti yalnız bütün satırlar ücretsizse alır |
| K4 | İşaret kaldırılınca fatura tipi geri gelmez | Kabul; form varsayılanı görünür ve kaydedilir, sürüm notunda yazar |
| K5 | Garanti durumu satırı kutu işaretsizken de çizilir | Kabul (R4/3); satır etiketin dışında, ayrı satırda (formun etiket listesi dört giriş noktasında aynı kalsın) |
| K6 | Raporun Durum hücresindeki "Ücretsiz" metni | Uygulamada ölçüldü: o metin servis satırınındır (Extra Kalıp tablosunda Durum sütunu yok); değişmedi |
| K7 | İbare sabiti yalnız çekirdek metin | `UCRETSIZ_IBARESI`, önekler çağıranda (R24) |
| K8 | Spec'teki satır numaraları kaymış | Testler adla arar |

## 2. Değişen dosyalar

| Katman | Dosya | Ne |
|---|---|---|
| Motor | `src/lib/utils.js` | `UCRETSIZ_IBARESI`, `satisUcretsizMi`; `yedekParcaBedeli` ücretsizde 0, `isYedekParcaBorcluMu` ücretsizde false |
| Motor | `src/lib/yedekParcaSatis.js` | `ucretsizUygula` (tek yazım yolu), `garantiDurumu` (`yerelBugun`), `GARANTI_UYARISI`; `yedekParcaRec` kart dalı ve tevkifat doğrulaması ücretsizde atlanır; `yedekParcaGuncelle` son adımda `ucretsizUygula` |
| Motor | `src/lib/satisTahsilat.js` | modül içi `yedekBedeli` kalktı; YEDEK dalı `if (r.ucretsizMi) return null;`; `UCRETSIZ_HESAP_NEDENI` |
| Motor | `src/lib/aylikRapor.js` | `kargoBedeli = yedekParcaBedeli`; adet sayaçları sayar, para kovaları ve fatura tipi kırılımı saymaz; detay satırı `{}` tutar/KDV + `ucretsiz` |
| Motor | `src/lib/bayiKaskad.js`, `src/lib/dashboardStats.js` | tek okuma yolu |
| Yazdırma | `src/lib/printTemplates.js` | YEDEK PARÇA ALAN FİRMALAR Durum hücresi ibare |
| DB | `electron/db.cjs` | `yedek_parca_satis.ucretsizMi` (SCHEMA, `applyColumnMigrations`, INSERT, açık okuma `ucretsizOku`; kapalıyken gövdede yok) |
| Ekran | `src/components/YedekParcaSatisForm.jsx` | kutu, garanti satırı ve uyarısı; ödeme, toplam, tevkifat, tahsilat hesabı ve Fatura Tipi ücretsizde gizli |
| Ekran | `stock/YedekParcaSatisTab.jsx`, `KargoPanosu.jsx`, `SimpleDealers.jsx`, `customers/detail/MachineTimeline.jsx`, `customers/detail/deriveCustomerDetail.js`, `customers/CustomerDetailModal.jsx`, `Dashboard.jsx`, `Finance.jsx`, `settings/SettingsSahipsiz.jsx`, `settings/SettingsExport.jsx` | bedel kopyaları tek yola, ibare sabitten, ödeme göstergeleri ücretsizde yok, karışık parti, "Ücretsiz mi?" sütunu |
| Kanıt | `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0095-*`, `docs/evidence/kanit-eslemesi.json` | altı yeni ekran, rapor ve JPEG'ler |
| Belge | `CLAUDE.md` | yedek parça bölümüne madde |

Değişmeyenler (taranır): `serverAuth.cjs`, `merge.js`, izin tanımları, `evrakUygula.js`, `ServiceForm.jsx`'in garanti satırı, kargo kartı.

## 3. Adım sırası (uygulandığı gibi)

0. **Taban:** `tests/fixtures/0095-veri.js` (0079'un tevkifatsız kümesi + kaçamak sıfır fiyatlı satışlar, çek, bilinmeyen para birimi) ile altınlar **ürün kodu değişmeden** üretildi: `0095-ucretsizsiz-once.json` (motor) ve `0095-ekran-once.json` (ekran), `YAZ_0095=1`, iki koşuda bayt eşit. Değişecek 24 ekranın taban görüntüleri çekildi.
1. Saf motor (utils, kurucu, tahsilat, rapor, bayi kaskadı, son satışlar, yazdırma).
2. Veritabanı (dört nokta).
3. Form; 4. ekranlar; 5. dışa aktarma.
6. Testler, taramalar, bozma denemeleri, görsel kanıt, CLAUDE.md.

## 4. Kriter ↔ test eşlemesi

M = `tests/ucretsiz-yedek-parca-0095.test.js`, U = `tests/ui/ucretsiz-yedek-parca-0095.test.jsx`, K = `tests/ucretsiz-yedek-parca-0095-kiyas.test.js` + `tests/ui/ucretsiz-yedek-parca-0095-kiyas.test.jsx`, X = `tests/yedek-parca-export.test.js`, E = `scripts/tests/db-roundtrip.cjs` / `db-clean-install.cjs` (Electron).

| Kriter | Test |
|---|---|
| AC-1, 1/2, 2, 3, 4, 5, 6, 7, 7/2, 8, 39 | U "form" |
| AC-9 | M satır 1, 2, 3, 8, 11, 13; U satır 4 (Finans), 7 ve 9 (kargo detayı), 10 (Stok), 12 (Sahipsiz), 13 (Anasayfa). Satır 5 ve 6 (Finans kart listesi, Anasayfa çek listesi) ücretsiz kayıtta yöntem boş olduğu için ekrana düşemez; tek okuma yoluna bağlılıkları AC-32 taramasıyla sabit |
| AC-10, 16, 17, 19, 20, 21, 25, 26, 26/2, 28, 35, 36, 37, 38, 46, 47, 50 | M |
| AC-11, 12, 13, 14, 15, 45, 49 | U (fark ölçümü: ücretsiz satış varken metin, satış yokken çizilenle aynı; ücretli ikizi farklı) |
| AC-18 | M (tahsilat listesi, kasa bakiyesi) + U AC-23 (ödeme düğmesi yok, hesap sorusu açılamaz) + M AC-46 |
| AC-22, 23 (dört gösterge ayrı), 24, 24/2, 48 | U (AC-48'in motor yarısı: M kurucu, U makina geçmişi ve kargo detayı) |
| AC-27 | K (motor ve ekran, spec öncesi altınla; yalnız R19'un yeni sütunu ayıklanır) |
| AC-29, 29/2 | X |
| AC-30, 33, 44 | E (+ M AC-44 şema) |
| AC-31, 32, 34, 40, 43 | M taramalar |
| AC-41 | M (TZ sabit, motor + tarama) + U (TZ sabit, ekranda uyarı) |
| AC-42 | `tests/tasarim-kaynak.test.js` AC-12 + `tests/kanit-eslemesi.test.js` |

Ters çevrilen mevcut testler ("spec 0095 ile" notlu): `tests/satis-tevkifat-0079.test.js` ve `tests/ui/satis-tevkifat-0079-ekran.test.jsx` (yedek parça dışa aktarmasına indis 8'de yeni sütun), `tests/ui/form-paylasilan.test.jsx` (yeni onay kutusu, dört giriş noktasında birer kez), `tests/ui/yedek-parca-form-teslim.test.jsx` (kutu süzgeci). Spec'in DoD'deki diğer dosyaları değişmeden yeşil.

## 5. Ölçümler

- **Bozma denemeleri** (her biri yedek kopyayla geri alındı): bedelin ücretsiz dalı (8 test kırıldı), borcun ücretsiz dalı (8), `ucretsizUygula`'nın silmesi (3), kart dalı kapısı (1), `yerelBugun` yerine `today()` (3), raporun adet sayaçları (1), karışık partide `ypOdemeIdleri` (1), `hesapId` temizliği (2), DB okumasının koşulsuz yazımı (Electron: 3 kontrol).
- **Görsel kanıt** (`0095-piksel-raporu.json`, taban `0095-taban-piksel-raporu.json`): 24 mevcut ekran × 2 tema; değişen yalnız yedek parça formunun altı ekranı (yeni kutu içeriği aşağı iter). Finans, Stok, bayi ve müşteri detayı, pano, Anasayfa, Müşteriler ve dışa aktarma ekranları 0 piksel. Yeni ekranlar: `yedek-parca-formu-ucretsiz`, `yedek-parca-formu-ucretsiz-uyari`, `stok-yedek-parca-ucretsiz`, `kargo-detay-ucretsiz`, `bayi-detay-ucretsiz`, `musteri-detay-ucretsiz`.

## 6. Sürüm notu

- Yedek parça satışında "Garanti içi, ücretsiz verildi" işareti: satış borç, gelir ve tahsilat üretmez; parça stoktan düşer, tahsis ve kargo aynen çalışır.
- Daha önce ödenmiş ve bir hesaba bağlanmış bir satış ücretsize çevrilirse tutarı o hesabın bakiyesinden geriye dönük düşer (bakiye kayıtlardan hesaplanır).
- Ücretsiz satış Aylık Faaliyet Raporu'nda adet olarak sayılır, para toplamlarına ve fatura tipi kırılımına girmez.
- İşaret kaldırılınca birim fiyat geri gelir, fatura tipi "Faturalı Yurtiçi" varsayılanıyla gelir; gerekiyorsa düzeltin.
- Bugüne kadar sıfır fiyatla girilmiş satışlar kendiliğinden işaretlenmez; istenirse tek tek düzenlenir.
- Önce sunucu PC, sonra istemciler güncellenir. Güncellenmemiş sunucu işareti kaydetmez (sütunu yoktur, işaret sessizce düşer); güncellenmemiş istemci işaretli satışı ücretli gösterir. Güncelleme bitene kadar kutu işaretlenmez.
