# 0113 Uygulama planı: ödeme işareti olan bedel kutuları yalnız tahsil edileni gösterir

Spec: `specs/done/0113-finans-bedel-kutulari-tahsilat-esasli.md` (revizyon 2, plan turu Karar 17–24). Dal `feat/0113-finans-tahsil`, taban `bdbc80e`. Tamamlandı: uygulama commit `f45a356`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/Finance.jsx` | İki birikim kümesi: tahsil kümesi (dört kutu, KDV satırları, "Toplam Bedel" kartının dört bileşeni ve KDV satırı) ve tahakkuk kümesi (`*Tahakkuk`, yalnız "Ödenmesi Muhtemel KDV"). Süzgeç `const tahsil = (r) => satisTahsilEdildi(r)` (gün argümanı yok); servis komisyon döngüsü de süzülür (Karar 17); Extra Kalıp kolunda `satisUcretsizMi` atlaması. Ad sabitleri `TAHSIL_KART_ADLARI`, `TAHSIL_EK`, `TOPLAM_BEDEL_ALT_YAZI`, `TAHSIL_ALT_TOPLAM_ETIKETI`. Kullanılmayan brüt dönüşler temizlendi (R22). Detay penceresi: satır türetilmiş ölçüt + neden, sütun "Tahsil edildi", tahsil edilen alt toplamı. |
| `src/lib/utils.js` | `tahsilBeklemeNedeni`, `TAHSIL_NEDEN_CEK`, `TAHSIL_NEDEN_KART`. |
| Testler | Yeni `tests/finans-tahsil-0113.test.js`, `tests/ui/finans-tahsil-0113.test.jsx`, `tests/fixtures/0113-ayikla.js`; güncellenen `ui/evrak-finans-capraz` (0006 AC-24 ters çevrildi), `ui/satis-tevkifat-0079-ekran`, `ui/ucretsiz-yedek-parca-0095-kiyas` (ayıklama), `ui/finance-yedek-parca`, `ui/bos-durum` (ad sabitten, Karar 23), `ui/ucretsiz-yedek-parca-0095` (AC-15'in "Toplam Bedel" kontrol ikizi tahsil edilmiş). |
| Kanıt | `scripts/evidence/0009-sayfa.jsx` üç ekran; `0113-piksel-raporu.json`, `0113-taban-piksel-raporu.json`, `kanit-eslemesi.json`. |

Değişmeyenler (C4, R20, tarama): aylık rapor, Finans Özeti Excel'i, Anasayfa, Kasa, Analiz, sunucu, veritabanı, izin, birleştirme.

## 2. Adım sırası

Saf yardımcı → Finans hesap bloğu (iki küme, süzgeç, ücretsiz denetimi, büyük kartın KDV satırı) → adlar, alt yazılar, pencere → var olan testlerin güncellenmesi, yeni testler, kasıtlı bozma denetimi (yedi bozma: kalıp süzgeci, ücretsiz denetimi, tek küme, büyük kartın KDV bağı, komisyon döngüsü, pencerenin ham işareti, yedek parça süzgeci; hepsi yakalandı) → kanıt → belgeler.

## 3. Kararlar

Spec Karar 1–16 ve plan turu Karar 17–24 (spec'te).

## 4. Ters çevrilen kriterler

0006 AC-24 (`ui/evrak-finans-capraz`: rapor 333, ekran tahsil edilene kadar 0). İki ekran kıyası (0079, 0095) beş kartı ayıklar (Karar 18). `finance-yedek-parca` ve `bos-durum` yalnız ad sorgusu, 0095 AC-15'in "Toplam Bedel" kontrol ikizi tahsil edilmiş kayıtla (Karar 23).

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, AC-2, AC-3, AC-33 | ui "AC-1 / AC-2 / AC-3 / AC-33" |
| AC-4 | ui "AC-4" |
| AC-5, AC-6, AC-7, AC-8, AC-9, AC-12 | ui "servis ve yedek parça kutuları" |
| AC-10, AC-11 | ui "çek ve kredi kartı dalları" (fikstür tarihleri, sahte saat yok) |
| AC-13, AC-34 | ui "AC-13 / AC-34" |
| AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-21, AC-32, AC-44 | ui "değişmeyen kartlar ve iki birikim kümesi" |
| AC-22, AC-26, AC-28, AC-29, AC-38, AC-39, AC-42, AC-45 | ui "adlar, kapsam ve boş hâller"; AC-45 Anasayfa yarısı saf tarama (Karar 19) |
| AC-23, AC-40 | saf "arşiv belgeleri tahakkuk kalır" |
| AC-24, AC-25, AC-41 | ui "Anlaşmalı Servis detay penceresi" |
| AC-27 | ui "AC-27" (Extra Kalıp) ve "AC-27 (servis)" |
| AC-30, AC-35, AC-37 | saf taramalar |
| AC-31 | ui "AC-31" (0079 altını, tahsil yarısı); ücretsiz yarısı ölçülemedi (Karar 21) |
| AC-36 | saf "AC-36"; iki kıyas testi |
| AC-43 | ui "AC-43" |
| 0006 AC-24 | `ui/evrak-finans-capraz` |

## 6. Sürüm notu

Finans'taki servis ücreti, parça ücreti, anlaşmalı servis parçası ve Extra Kalıp kutuları artık yalnız tahsil edilen bedeli gösterir ve adları bunu söyler ("Tahsil Edilen …"). Ödenmedi işaretlenen kayıt kutudan düşer, Toplam Alacak'ta görünür; ödendi işaretlenince geri döner. Çekle ödenmiş kayıt çek tahsil edilene, kredi kartıyla ödenmiş kayıt blokaj bitene kadar kutuya girmez. Makina kutuları, "Ödenmesi Muhtemel KDV", kredi kartı kartları, adet kartları, Aylık Faaliyet Raporu ve Finans Özeti Excel'i eskisi gibi satış anında sayar; bu yüzden ekran ile rapor ve Excel artık farklı soruları cevaplar. Bir dönemin kutu rakamı o dönemde satılıp sonradan tahsil edilen kayıtlarla zamanla artabilir. "Toplam Bedel" kartının KDV satırı artık kendi bileşenlerinin KDV'sidir. Ücretsiz işaretli Extra Kalıp kaydı artık kutuda sayılmaz.
