# 0154 Uygulama planı: seçilen parça hangi makinalara takıldı

| | |
|---|---|
| **Spec** | `specs/done/0154-parca-musteri-kirilimi.md` (revizyon 3, plan kararları P1–P11) |
| **Durum** | Tamamlandı (commit `23bc4b98`) |
| **Dal** | `feat/0154-parca-musteri-kirilimi` (taban `d3fa0cda`) |

## 1. Dosyalar

- **Motor:** `src/lib/analiz.js` (tek makina çözümü `makinaCoz`; müşteri haritası var olan iki döngüde; `musteriler` alanı; `MUSTERI_SATIR_TUR`, `MUSTERI_IBARE`, `HAREKET_KAYNAK`; `aliciAd` içe alımı).
- **Ekran:** `src/components/Analiz.jsx` (başlık "Parça Kırılımı", başlık satırında görünüm segmenti, `MakinaCubuk`, limit `musteri: 8`, pencere `musteri`, `KAYNAK_AD`, `PARCA_KIRILIMI_METIN`); `src/App.jsx` (`dealers={liveDealers}`).
- **Testler:** `tests/parca-musteri-kirilimi-0154.test.js` (motor, taramalar), `tests/ui/parca-musteri-kirilimi-0154.test.jsx` (bileşen), `tests/ui/parca-musteri-kirilimi-0154-app.test.jsx` (gerçek App), `tests/ui/parca-musteri-kirilimi-0154-kiyas.test.jsx` (spec öncesi kıyas; jsdom gerektiği için `ui/` altında), `tests/fixtures/0154-veri.js`, `tests/fixtures/0154-once.json`; "spec 0154 ile" `tests/set-icerigi-0121-kiyas.test.js` (ayıklama, altın yenilenmedi).
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` (`dealers` girdisi, üç yeni ekran), `docs/evidence/0154-*`, `docs/evidence/kanit-eslemesi.json`.
- Sunucu, veritabanı, izin, birleştirme değişmedi.

## 2. Adım sırası

1. Spec öncesi kodla altın (`0154-once.json`: motorun dört alanı ve Model görünümünün ekran metni) ve kanıtın "önce" çekimi. 2. Motor ve 0121 ayıklaması. 3. App prop'u. 4. Ekran. 5. Testler, taramalar, mutasyon. 6. Kanıt, CLAUDE.md, tam takım, lint.

## 3. Kararlar

Spec'te P1–P11.

## 4. Kriter ↔ test

M = `parca-musteri-kirilimi-0154`, U = `ui/parca-musteri-kirilimi-0154`, A = `-app`, K = `ui/parca-musteri-kirilimi-0154-kiyas`.

| Kriterler | Test |
|---|---|
| AC-1, AC-29, AC-51, AC-57 | K |
| AC-2, AC-3, AC-4, AC-5, AC-19, AC-20, AC-26, AC-40, AC-41, AC-42, AC-52, AC-58 | U |
| AC-6–AC-12, AC-14–AC-18, AC-23–AC-25, AC-28, AC-32, AC-37–AC-39, AC-43, AC-44, AC-46, AC-48, AC-54 | M |
| AC-13 | M + U + A |
| AC-21, AC-22, AC-47, AC-49, AC-59 | M (hareket şekli, sıra) + U (pencere metni) |
| AC-16, AC-33, AC-60 | M + U |
| AC-27 | M (anahtar kümesi) + U (ekran metni) |
| AC-30, AC-31, AC-34, AC-35, AC-45, AC-53, AC-56 | M (kaynak taramaları) |
| AC-36 | `set-icerigi-0121-kiyas` |
| AC-50 | `kanit-eslemesi`, `tasarim-kaynak` |
| AC-55 | A |

## 5. Sürüm notu

Salt okunur iş; veri, izin ve sunucu değişmedi, sürüm sırası gerekmez. Analiz'in Parça Kırılımı kutusunda Model / Müşteri seçimi; Müşteri görünümü parçanın takıldığı makinaları, "Tümünü göster" penceresi her makinanın takılma tarihlerini yazar (kargoda satışın tarihi).
