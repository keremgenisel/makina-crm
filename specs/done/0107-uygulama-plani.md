# 0107 uygulama planı

Spec: `specs/done/0107-extra-kalip-uretim-formu-isareti.md` (revizyon 3). Dal `feat/0107-extra-kalip-isareti`, taban `1da3f53`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/musteriDurumu.js` | `musteriKalibiBekliyorMu` (R16), `URETIM_FORMU_GONDERILDI` / `URETIM_FORMU_GONDERILMEDI` (R17), `aynaUretimFormuMetni` (R6/2, R6/3; ortak iç yardımcı `aynaSatisi` `aynaDurumu` ile paylaşılır) |
| `src/components/customers/CustomerDetailModal.jsx` | Ön doldurma kalıp satırına `uretimFormGonder` (R1); kayıt yolu değişmez |
| `src/components/customers/CustomerAddEditForm.jsx` | Ayna satırda kutu yerine `ayna-uretim-formu` (R5, R6/4); şablon ve 0106 öğesi aynen |
| `src/components/stock/UretimFormu.jsx` | Başlangıç tarihi ve getirme `musteriKalibiBekliyorMu` ile, `forEach` indeksi korunur (R8, R8/2, R10) |
| `src/components/Dashboard.jsx` | Sayacın müşteri döngüsü aynı ölçütle (R9) |
| `scripts/evidence/0009-sayfa.jsx` | `musteri-formu-0107-ayna`, `-ayna-dar`, `kalip-formu-0107-duzenle` |
| Testler | `tests/extra-kalip-isareti-0107.test.js`, `tests/ui/extra-kalip-isareti-0107.test.jsx`, `tests/fixtures/0107-tarama-once.json` (triyajdan beri anlamsal: bölüm, birleştirme, izin, ayar alanı listeleri ve ekleme kolunun işaret satırları) |

## 2. Sıra

1. Önkoşul testleri eski kodla yeşil (AC-13, AC-14, AC-24, AC-26, AC-28); kusur testleri eski kodla kırmızı (14 test).
2. Kütüphane, üç okuyucu, ön doldurma, müşteri formu.
3. Taramalar ve SHA fikstürü; dört mutasyon.
4. Kanıt: kanıt aracına ekranlar önce eklenir, taban eski kodla iki kez (Karar 22), sonra iş raporu.
5. Tam test, lint, belgeler.

## 3. Kararlar

Plan turu kararları spec'te Karar 17–26 (U1–U10).

## 4. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, AC-2, AC-9 | ui "düzenleme kolu": tek kalıplı başlık ve parti içi kalıp adı |
| AC-3, AC-7, AC-8, AC-34 | ui `it.each` işaretli / işaretsiz, üç alan |
| AC-4, AC-5, AC-6 | ui |
| AC-10 | saf tarama |
| AC-11, AC-12, AC-15, AC-16, AC-27, AC-29 | ui "ayna satır" + saf ibare |
| AC-13, AC-14, AC-26, AC-28 | ui önkoşul |
| AC-17, AC-18, AC-31 | ui gerçek `UretimFormu` (getirme + kaydetme damgası) |
| AC-19, AC-20 | ui gerçek `Dashboard` |
| AC-21, AC-32 | saf `enEskiBekleyenKalipTarihi` + ui |
| AC-22, AC-30 | saf tarama |
| AC-23 | saf `kalipSatisiEkle` iki kalıplı |
| AC-24 | ui önkoşul |
| AC-25, AC-35 | saf SHA taraması |
| AC-33 | saf metin taraması |
| AC-36 | saf tarama + `musteri-formu-0107-ayna-dar` |

## 4b. Uygulamada çıkanlar

- **Kanıt (Karar 22):** taban eski kod ↔ eski kod, 40 ekran × 2 tema = 80 görüntü, hepsi 0 fark (`0107-taban-piksel-raporu.json`). İş raporu (`0107-piksel-raporu.json`, eski ↔ yeni) aynı 80 görüntüde yalnız üç yeni ekranı değişmiş gösterir: `musteri-formu-0107-ayna` (8.815 / 9.319 piksel; kutu yerine ibare), `-ayna-dar` (aynı), `kalip-formu-0107-duzenle` (789; kutu artık işaretli). Mevcut 37 ekranın hiçbirinde fark yok (C7). Üç yeni kayıt taban raporuna `ayni` bağlandı. Triyajda taban son kodla yeniden çekildi (iş raporunun sonrası ↔ son kod, 80 görüntü 0 fark); kayıtlar artık düzeltilmiş ekranı gösterir.
- **Dar çekim (Karar 23):** 760 px kapta pencere daralıyor, ibare tek satırda, ızgara taşmıyor (görüntüde doğrulandı).
- **Mutasyonlar (dördü de yakalandı):** ön doldurmadan işaretin çıkarılması (AC-10 + altı ui testi), ölçütten ayna atlamasının çıkarılması (yedi test), ibarede bağın okunmaması (iki test), getirmede diziyi önce süzmek (tarama + AC-31).
- **Kırmızı-yeşil:** kusur testlerinden on dördü eski kodla kırmızı, önkoşullar eski kodla yeşildi.

## 5. Sürüm notu

> Bir Extra Kalıp'ı üretim formuna göndermenin tek yeri artık Extra Kalıp satışıdır. Satışı sonradan düzenlemek (fiyat, kargo, ödeme) işareti artık silmez. Müşteri formunun kalıp listesinde Extra Kalıp'tan gelen satırda kutu yerine "Üretim formuna gönderildi / gönderilmedi" yazar; oradan daha önce verilmiş işaretler artık okunmaz. Bu yüzden Anasayfa'daki "Üretimde Bekleyen Kalıplar" sayısı güncellemeden sonra düşebilir; aynı kalıp artık iki kez sayılmaz.

## 6. Kapanış

- Uygulama commit `3cd3ab7`. Taban triyajda son kodla yeniden çekilmişti (iş raporunun sonrası ↔ son kod, 80 görüntü 0 fark); o çekimden sonra kaynak ve kanıt aracı değişmediği için kapanışta ikinci kez çekilmedi. Üç kayıt `ayni`.
