# 0055 Uygulama Planı: Rapordaki Kalem Listesi Seçeneği Kalksın, Liste Hep Gelsin

| | |
|---|---|
| **Bağlı spec** | `specs/0055-kalem-listesi-her-zaman.md` (R2, plan onayıyla) |
| **Dal** | `feat/0055-kalem-listesi` (`feat/0056-deneme-donemi` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q4) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Boş ay (`gr.bos`) bütün gider bölümünü "Bu ayda kayıt yok" satırına indiriyor; kalem listesi hiç çizilmiyor.
- Yürürlük öncesi ay da gider bölümünü tek açıklama paragrafına indiriyor (R8 bugün karşılanıyor).
- Seçeneği kullanan iki yer daha: `scripts/evidence/0009-sayfa.jsx` `gider-kasa-raporu-kalemsiz` ekranı, `CLAUDE.md` 0047 imzası.
- `specs/done/0047-…md`'de analistin R32 notu commit bekliyor.

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/giderRaporu.js` | Üçüncü parametre, koşul ve dönüşteki alan kalkar; HTML içerik koşulu, savunma dalı `KAYIT_YOK`. |
| `src/components/rapor/GiderKasaRaporuDugmesi.jsx` | Durum ve kutu kalkar. |
| `tests/gider-kasa-raporu.test.js` | Eski iki iddia kalkar; AC-7–AC-10, AC-12 blokları. |
| `tests/ui/gider-kasa-raporu.test.jsx` | Kutu tıklayan testler yerine üç ekranda yokluk. |
| `scripts/evidence/0009-sayfa.jsx` | `-kalemsiz` yerine `gider-kasa-raporu-bos`. |
| `specs/done/0047-…md` | AC-39, AC-57 tarihli notları (analistin R32 notuyla birlikte commit). |
| `docs/evidence/…`, `CLAUDE.md` | Kanıt, kayıtlar, 0047 cümlesi ve imza. |

## 3. Kararlar

- **Q1 / R11.** Boş ayda bugünkü "Bu ayda kayıt yok" satırı; savunma dalı aynı satır; AC-9 yeniden yazıldı.
- **Q2.** 0047 dosyası (analistin R32 notu dahil) bu işin commit'ine alınır.
- **Q3.** Kanıt yalnız rapor ekranlarıyla; eski `-kalemsiz` kayıtları tarihî rapora bağlı kalır; `degisti` kayıtları ekran
  dosyalarına.
- **Q4.** AC-7: mevcut beklenenler değişmeden geçer + belgenin liste öncesi kısmı sabit.

## 4. Adım sırası

1. Motor ve testleri. 2. Düğme ve UI testi. 3. Kanıt, TY onayı. 4. 0047 notları, `CLAUDE.md`. 5. Tam takım, lint.

## 5. Kriter ↔ test eşlemesi

M = `tests/gider-kasa-raporu.test.js`, U = `tests/ui/gider-kasa-raporu.test.jsx`.

| AC | Test |
|---|---|
| 1, 2, 3, 13 | U |
| 4, 5, 11 | M |
| 6 | M; `gider-gizlilik` |
| 7 | M |
| 8, 12 | M (kaynak taraması) |
| 9, 10 | M |
| 14, 16 | M (kaynak taraması) |
| 15 | `kanit-eslemesi`, `tasarim-kaynak` |

## 6. Uygulama notları

- **Motor:** `let kalemler = null; if (kalemListesi) {…}` bloğu düz koda indi (liste her zaman kurulur); HTML'de başlık her zaman, tablo `G.kalemler.length` ile, boşsa `bosSatir` (`KAYIT_YOK`). Kalemsiz ayda bu dala sıra gelmez (bölüm `G.bos` ile tek satır).
- **Testler:** 0047'nin "kutu kapalıyken" iddiaları (motor ve arayüz) kaldırıldı, bilgi notuyla; AC-12'nin kaynak taraması test dosyasının kendisini de tarar, bu yüzden bayrak adı testte parçalı yazıldı. Giderler ekranı cari ayı (kalemsiz) ön seçtiği için üç ekran testinde ay alanı kalemli aya alındı.
- **Kanıt:** `0055-piksel-raporu.json` (5 ekran, iki tema): üç düğme ekranında yalnız kutunun kalkması (TY onayı 2026-10-01), kalemli belge ve yeni `gider-kasa-raporu-bos` 0 piksel; eski `-kalemsiz` ekranı görüntü aracından kalktı (0047 raporlarındaki kayıtları tarihîdir).
