# 0156 Uygulama planı: Tedarikçi ekstresi, vergi kırılımı, geniş pencere ve kalemde göster

| | |
|---|---|
| **Spec** | `specs/0156-ekstre-detayi.md` (Onaylandı, 2026-11-23) |
| **Onay** | Takım Yöneticisi, 2026-11-23 ("tum onerilerini kabul ediyorum, spece isle, plani yaz ve uygula") |
| **Dal** | `feat/0156-ekstre-detayi` (main `15b45e22` üstünde) |
| **Durum** | Uygulandı; commit ve kapanış Takım Yöneticisinin talimatını bekliyor |

## 1. Dosyalar

- **`src/lib/gider.js`:** tek dışa verilen saf okuyucu `kalemVergiKirilimi(k, dav)` (C1/2); içi `kalemKurus`, `kdvKurus`, `stopajKurus`, `tevkifatKurus`, `kisitHesabi`, `odenecekKurus`.
- **`src/lib/kasa.js`:** iki ekstrede her satıra `anahtar` (R1/2); borç satırına aralık süzmesinden önce `vergi`, `odemeler`, `kalanK` (R4/2); `hesapAdiCoz` (P3).
- **`src/lib/aramaGider.js`:** `kalemFiltresiOf(k, tedarikciAdi)` (R15/2); `GlobalSearch.jsx` onu çağırır.
- **`src/components/gider/EkstrePenceresi.jsx`:** 1080 px, yedi sütunlu ızgara sabiti, sayfalama yok, açılan ayrıntı, klavye, "Kalemde göster", modül sabitleri.
- **`src/components/gider/Tedarikciler.jsx`, `src/components/Giderler.jsx`:** yönlendirme (beş durum, yerel süzgeç, C6/2).
- **`src/components/kasa/CalisanAvanslari.jsx`:** ortak hesap adı çözücüsü.
- **`docs/tasarim-sozlugu.md`:** geniş tablo penceresi (1080), Sınıf 1 cümlesi ve listesi, sayfalama istisnası.
- **Electron yerleşim:** `scripts/tests/layout/form-pencere.jsx` (elli satır, `{ bas, bit }`), `scripts/tests/form-pencere-yerlesim.cjs`.
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` (sayfa2 silinir, yeni ekranlar), `docs/evidence/kanit-eslemesi.json` (P4).
- **Testler:** `ekstre-detayi-0156` (motor, taramalar), `ekstre-detayi-0156-kiyas` (`0156-veri.js`, `0156-once.json`, `0156-ayikla.js`), `ui/ekstre-detayi-0156`, `ui/ekstre-detayi-0156-giderler`; "spec 0156 ile" güncellenenler `sayfalama-0062`, `ui/sayfalama-0062`, `ui/form-pencere-boyutu`, `form-pencere-yerlesim`.

## 2. Adım sırası

1. Kıyas altını spec öncesi koddan. 2. Motor. 3. Pencere. 4. Giderler yönlendirmesi. 5. Sözlük, eski taramalar, Electron yerleşim. 6. Kanıt ve eşleme. 7. Mutasyon, tam takım, lint, CLAUDE.md.

## 3. Kararlar

Spec'te P1–P7 (plan turunda verilen kararlar).

## 4. Kriter ↔ test

| Kriterler | Test |
|---|---|
| AC-1, AC-2, AC-37, AC-47–AC-49 | `ui/ekstre-detayi-0156` |
| AC-3–AC-9, AC-43–AC-45, AC-54, AC-58 | `ekstre-detayi-0156` + `ui/ekstre-detayi-0156` |
| AC-10–AC-15, AC-46, AC-51, AC-57 | `ekstre-detayi-0156` + `ui/ekstre-detayi-0156` |
| AC-16, AC-17, AC-29 | `ui/ekstre-detayi-0156` |
| AC-18, AC-55 | `ui/ekstre-detayi-0156` + tarama |
| AC-19, AC-33 | `ui/form-pencere-boyutu`, `sayfalama-0062` (spec 0156 ile) |
| AC-20–AC-24, AC-56 | `ui/ekstre-detayi-0156` |
| AC-25, AC-50, AC-53 | `form-pencere-yerlesim` (Electron) |
| AC-26, AC-27, AC-39–AC-41 | `ui/ekstre-detayi-0156-giderler` |
| AC-28, AC-30, AC-32, AC-34–AC-36, AC-40, AC-42 | `ekstre-detayi-0156` |
| AC-31, AC-38 | `ekstre-detayi-0156-kiyas` |
| AC-52 | `kanit-eslemesi` |

## 5. Sürüm notu

Veri ve sunucu değişmez. Ekstre penceresi genişler (1080 px) ve sayfalanmaz; çalışan ekstresi aynı pencereyi kullandığı için orada da görünür. Satıra tıklayınca vergi kırılımı ve ödemeler açılır; "Kalemde göster" kalemi Dönem Raporu'nda süzerek açar.
