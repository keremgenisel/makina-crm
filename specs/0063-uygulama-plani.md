# 0063 Uygulama Planı: Tahsilat Hesabı Sorulmayan İki Giriş Noktası

| | |
|---|---|
| **Bağlı spec** | `specs/0063-tahsilat-hesabi-eksik-giris-noktalari.md` (R2, plan onayıyla) |
| **Dal** | `feat/0063-tahsilat-hesap` (`feat/0055-kalem-listesi` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q7) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Müşteri detayının ekleme kipinde bugün ön seçim yok (`openAddPayment` `hesapId` koymuyor).
- Paylaşılan alanın ipucu ("Kasa'da hesabı belirtilmemiş tahsilatlar arasında bekler") makina tahsilatı için yanlış.
- `PaymentRowsEditor.satirGuncelle` kapanıştaki diziyle çalışır; aynı anda ön seçim yapan iki satır birbirini ezer.
- `musteri-tahsilat-hesap` kanıt ekranı form düzeyindeki "Hesap" alanını çiziyor; bu iş onu değiştirir.
- Bayi formları `odendi:false`, `hesapId` yok açılıyor; ön seçimi ödendi kutusu (`tahsilatOnSecim`) yapıyor, kayıt
  kurucular alan yoksa `hesapId` yazmıyor. B parçası yalnız bağlantı.

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/makinaOdeme.js` | `ilkSatisOdemeleri` satırın dolu `hesapId`'sini kayda yazar; `alinanTutar` aynı (R5). |
| `src/components/ui.jsx` | `PaymentRowsEditor` isteğe bağlı `satirEki(satir, i)` yuvası; içe alma yok (R15, C6). |
| `src/components/kasa/TahsilatHesap.jsx` | `TahsilatHesapAlani` `varsayilan` (R21) ve `durum.listedeBekler === false` ipucu (R22); `tahsilatSatiriDurumu` yardımcı. |
| `src/components/customers/CustomerAddEditForm.jsx` | `kasaHesaplari`, `tahsilatHesapVarsayilan`; ekleme kipinde satır yuvası (R1, R14). |
| `src/components/Customers.jsx` | Forma `null` kapılı iki değer (R16). |
| `src/components/customers/CustomerDetailModal.jsx` | Yerel Select kalkar; ekleme kipi satır başına, düzenleme kipi form düzeyinde paylaşılan alan (R11, R13, R17). |
| `src/components/SimpleDealers.jsx` | İki prop, iki forma geçer (R7, R8). |
| `src/App.jsx` | `SimpleDealers`'a `kasaYetki ? … : null` (R16). |
| `scripts/evidence/0009-sayfa.jsx` | `musteri-formu-ilk-odeme`, `bayi-yedek-parca-formu`, `bayi-kalip-formu`. |
| `docs/evidence/…`, `CLAUDE.md` | Rapor, kayıtlar, 0044 bayi cümlesi, yeni bölüm. |

Değişmeyenler: `satisTahsilat.js`, `kasa.js`, `db.cjs`, `merge.js`, yedek, `serverAuth.cjs`.

## 3. Kararlar

- **Q1 / R21.** Ön seçim `TahsilatHesapAlani`'nda, yalnız `undefined` değerde.
- **Q2 / R22.** Makina ipucu "seçilmezse hiçbir bakiyeye girmez".
- **Q3.** Müşteri detayı ekleme kipine ön seçim gelir; sürüm notunda tek satır.
- **Q4.** `musteri-tahsilat-hesap` `degisti` (R13 onayı), done'da `ayni`.
- **Q5.** Düzenleme kipi form düzeyinde, kayıt yolu aynı.
- **Q6 / R23.** Yuva güncellemesi çağıranın işlevsel güncelleyicisiyle.
- **Q7.** Uçtan uca deneme gerçek App jsdom testiyle.

## 4. Adım sırası

1. Motor ve testi. 2. Paylaşılan bileşenler. 3. Müşteri detayı. 4. Yeni müşteri formu. 5. Bayiler ve App.
6. Testler. 7. Kanıt, TY onayı. 8. `CLAUDE.md`, tam takım, lint.

## 5. Kriter ↔ test eşlemesi

`M` = `tests/makina-odeme.test.js` (0063 bloğu), `U` = `tests/ui/tahsilat-hesap-0063.test.jsx`,
`T` = `tests/ui/tahsilat-hesap.test.jsx` (0063 bloğu), `S` = `tests/server-authz.test.js` (0063 bloğu).

| AC | Test |
|---|---|
| AC-1, 2, 4, 5 | U |
| AC-3, 14 | U |
| AC-6 | M + U |
| AC-7, 8, 9 | M |
| AC-10, 22 | M |
| AC-11, 12, 15, 27 | U |
| AC-13, 28, 16, 29 | U |
| AC-17, 24, 25 | T |
| AC-18, 21, 23, 26 | U |
| AC-19 | `db-roundtrip` mevcut kapsamı + diff (şema/merge/yedek dosyası değişmedi) |
| AC-20 | S |
| AC-30, 31, 32 | U ("Spec 0063 kanıt kriterleri" bloğu, AC adlı; triyaj) + genel koruma `tasarim-kaynak`, `kanit-eslemesi` |

## 6. Sürüm notu metni

- Yeni müşteri kaydında ilk ödeme satırlarının her birinde tahsilatın girdiği kasa hesabı seçilebilir.
- Bayi detayından yapılan yedek parça ve kalıp satışlarında ödendi işaretlenince hesap sorulur.
- Müşteri detayında ödeme eklerken hesap satır başına seçilir ve en son kullanılan hesap önceden seçili gelir.

## 7. Uygulama notları

- **R17 ölçüsü daraltıldı:** "`TahsilatHesap.jsx` dışında hiçbir dosya `HESAP_TUR_AD` almaz" ölçüsü gider tarafının ödeme
  (`gider/OdemeGirisi.jsx`), avans (`kasa/CalisanAvanslari.jsx`), hesap silme (`kasa/HesapSilPenceresi.jsx`) seçicilerini ve
  Kasa'nın hesap listesini de yakalıyordu; bunlar tahsilat seçicisi değil. Test bu dört dosyayı açıkça adlandırıp dışarıda
  bırakır; tahsilat giriş noktalarının hiçbiri onu almaz ve `aria-label="Tahsilat hesabı"` yalnız `TahsilatHesap.jsx`'te.
- **Ödeme yöntemi listesinde Havale yok** (`ODEME_YONTEMLERI` Nakit / Kredi Kartı / Çek); testler "nakit kasaya, havale
  bankaya" örneğini iki nakit satırla kurar.
- **Kanıt aracı için erişilebilir adlar:** `MoneyInput` isteğe bağlı `ariaLabel`; ödeme satırı tutarı `Tahsilat tutarı n`,
  yedek parça satır fiyatı `Birim fiyat n`, kalıp fiyatı `Kalıp fiyatı n` (görünüm değişmez). Araca `ara:` adımı (SearchPick).
- **Sözlük satır atıfları:** `docs/tasarim-sozlugu.md`'deki `CustomerAddEditForm.jsx` ve `SimpleDealers.jsx` örnek satırları
  kaydı; düzeltildi (138 → 142 zaten eskiydi).
- Mevcut iki test (`ui/kasa-app`, `ui/kasa-sekme-izni`) form düzeyindeki seçiciyi bekliyordu; R13 ile satıra taşındığı için
  satır açıp tutar girerek güncellendi ("spec 0063 R13 ile güncellendi" notlu); olumsuz testler de tutarlı satırla güçlendirildi.
