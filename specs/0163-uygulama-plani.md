# 0163 Uygulama planı — Kitte yetim kalan parça satırı

| | |
|---|---|
| **Spec** | `specs/0163-kitte-yetim-parca-satiri.md` (Onaylandı, plan turu P1–P8) |
| **Durum** | Uygulandı (commit bekliyor) |
| **Dal** | `feat/0163-kit-yetim` (main `7bde5211` üstünde) |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/urunAgaci.js` | `kitCozucuKur(partMap)` (C1, C1/2, P1: `WeakMap` önbelleği); `trLower` içe alınır |
| `src/lib/makinaStandartMaliyet.js` | `modelMaliyeti` çözülmüş satırları gezer; `kitIdleri` ve set kesişimi çözülmüş kimliklerden (R3/2, R9); imza beş parametre |
| `src/lib/siparisIhtiyaci.js` | Kit döngüsü ve `kitIdleri` çözücüden (`canliParca` ile, R1/6) |
| `src/components/stock/MakinaStokTab.jsx` | `selectedModelKit` çözülmüş satırlardan (P5); `deductParts` ve kayıtlı `parcalar` dokunulmaz (R5/2) |
| `tests/fixtures/0163-veri.js`, `0163-once.json` | Yetimli fikstür, spec öncesi altın (`YAZ_0163=1`) |
| `tests/kit-yetim-0163.test.js`, `-kiyas`, `-cagri`, `ui/kit-yetim-0163.test.jsx` | Testler |
| `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/` | Üç ekran (P7) |

Ekranlar (`ModelMaliyetleri.jsx`, `SiparisPenceresi.jsx`, `ModelsManager.jsx`) değişmez (C2, R6).

## 2. Sıra

1. Fikstür ve kıyas testi, altın spec öncesi koddan.
2. Çözücü ve saf testleri.
3. Model maliyeti motoru.
4. Sipariş motoru.
5. `MakinaStokTab`.
6. Taramalar, çağrı ölçümü.
7. Tam takım, lint, kanıt, kapanış.

## 3. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–AC-9, AC-40, AC-41, AC-46 | `kit-yetim-0163` (çözücü) |
| AC-10–AC-13, AC-17 | `kit-yetim-0163` (model maliyeti), `ui/kit-yetim-0163` (Model Maliyetleri) |
| AC-14, AC-15, AC-25, AC-38 | `kit-yetim-0163` (sipariş) |
| AC-16, AC-36, AC-45 | `ui/kit-yetim-0163` (gerçek `MakinaStokTab`) |
| AC-18–AC-22 | `kit-yetim-0163` (kardeşsiz satır) |
| AC-23, AC-37 | `kit-yetim-0163` (set kesişimi, iki motor aynı) |
| AC-24 | `kit-yetim-0163`, `ui/kit-yetim-0163` |
| AC-26 | `ui/kit-yetim-0163` (gerçek `ModelsManager`) |
| AC-27 | `kit-yetim-0163` (`parcaKitAdetleri`, `dogrulamaTuru` yetimli fikstürde altınla aynı) |
| AC-28, AC-42 | `kit-yetim-0163` (donmuş parti) |
| AC-29, AC-31, AC-32 | `kit-yetim-0163` (taramalar) |
| AC-30 | motor ve UI testleri (girdiler değişmez, yazıcı çağrılmaz) |
| AC-33 | `kit-yetim-0163-cagri` |
| AC-34, AC-39 | var olan kıyaslar ve `dis-islem-kalkar-0138` dokunulmadan |
| AC-35 | `kit-yetim-0163-kiyas` |
| AC-43 | `ui/kit-yetim-0163` (sipariş penceresi metni altınla) |
| AC-44 | `kit-yetim-0163` (beş türev) |

## 4. Bilinen sınırlar (spec'ten)

- Donmuş partide "eksik" rozeti kalır (R8/2).
- `SiparisPenceresi.jsx:36` ve `ModelMaliyetleri.jsx:108` metinleri kapsam dışı (X8, X9).
- Kayıtlı stok satırlarının ölü kimlikleri X10'da açık bulgu.

## 5. Sürüm notu

Gerekmez (P8).

## 6. Uygulamada

- **P9 (TY kararı, AC-34'ten sapma):** 0138 kıyasının verisinde kazara kardeşsiz bir yetim satır vardı (0097'nin OZ kiti + 0135 kataloğu); test verisinde satırın ad kopyası eşsiz bir ada çevrildi, altın değişmedi, ayıklama eklenmedi. Öteki on bir kıyas dokunulmadan yeşil.
- Mutasyonla ölçüldü: düşürme kapalı (13 test kırıldı), ad yolu kapalı (24), önbellek kapalı (3), "Kiti Uygula" ham kit (1).
- Kanıt `0163-piksel-raporu.json`: 83 ekran; var olan 80 ekran 0 piksel, üç yeni ekran değişti.
