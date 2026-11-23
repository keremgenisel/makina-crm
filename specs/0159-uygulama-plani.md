# 0159 Uygulama planı: Satın alınan parçaya fason işlem eklenebilir

| | |
|---|---|
| **Spec** | `specs/0159-alim-kalemi.md` (Onaylandı, 2026-11-23) |
| **Onay** | Takım Yöneticisi, 2026-11-23 ("tum onerilerini onayliyorum, spece isle, plani yaz ve uygula") |
| **Dal** | `feat/0159-alim-kalemi` (main `42caac58` üstünde) |
| **Durum** | Uygulandı; commit ve kapanış Takım Yöneticisinin talimatını bekliyor |

## 1. Dosyalar

- **`src/lib/urunAgaci.js`:** kip sabitleri (`MALIYET_KIP`, P9); iki yönlü saf kip kuralı `kipGecisi(form, hedef)` → `{ yama, onay, not }` (C3, C3/2); `maliyetGecmisiYaz`'da yeni kayıtta döviz bilgisi yokken eski döviz bilgisinin yok sayılması (R5/2); yeniden adlandırılan metinler ve yeni sabitler (`ALIM_KALEMI_VARSAYILAN_ADI`, elle kip ipucu, taşıma notu, belge nedeni); `KIP_ONAY_HESAPLA` kalkar.
- **`src/lib/siparisIhtiyaci.js`, `src/lib/siparisRaporu.js`, `stock/SiparisPenceresi.jsx`:** hazır satırın tutarı maliyet eksi kalemler (R6/2, P1, P2); başlık, sütun, toplam ve neden metinleri.
- **`src/components/PartManager.jsx`, `MaliyetKalemleriAlani.jsx`, `gider/Tedarikciler.jsx`:** kip değişimi yalnız saf kuraldan; ipucu, taşıma notu, erişilebilir adlar, tedarikçi ipucusu.
- **Testler:** `alim-kalemi-0159` (saf kural, geçmiş, sipariş, belge, Excel, taramalar), `ui/alim-kalemi-0159`, `alim-kalemi-0159-kiyas` (`0159-veri.js`, `0159-once.json`), `0159-ayikla.js`; "spec 0159 ile" güncellenenler.

## 2. Adım sırası

1. Kıyas altını spec öncesi koddan. 2. Motor. 3. Arayüz. 4. Sipariş motoru ve belge. 5. Eski testler ve ayıklamalar (P4 ölçümü). 6. Mutasyon, tam takım, lint, kanıt, CLAUDE.md.

## 3. Kararlar

Spec'te P1–P9 (plan turunda verilen kararlar).

## 4. Kriter ↔ test

| Kriterler | Test |
|---|---|
| AC-1, AC-11, AC-19, AC-20, AC-35 | `ui/alim-kalemi-0159` |
| AC-2–AC-5, AC-22, AC-24–AC-27, AC-29 | `alim-kalemi-0159` + `ui/alim-kalemi-0159` |
| AC-6, AC-15, AC-23 | `ui/alim-kalemi-0159` |
| AC-7–AC-10, AC-30–AC-34 | `alim-kalemi-0159` + `ui/alim-kalemi-0159` |
| AC-28, AC-44 | `ui/alim-kalemi-0159` |
| AC-36, AC-37, AC-47 | `alim-kalemi-0159` + `ui/alim-kalemi-0159` |
| AC-12, AC-13, AC-14, AC-38–AC-42 | `alim-kalemi-0159` |
| AC-16 | `alim-kalemi-0159-kiyas` |
| AC-17, AC-18, AC-21, AC-43, AC-48 | `alim-kalemi-0159` (taramalar) |
| AC-45 | `alim-kalemi-0159` (Excel) |
| AC-46 | `ui/alim-kalemi-0159` (Tedarikler) |

## 5. Sürüm notu

Kayıt biçimi değişmez (C1, C5); sunucu sırası gerekmez. Güncellenmemiş bilgisayar eski adları gösterir, veriyi bozmaz; hazır satırın tutarı yalnız güncellenmiş bilgisayarın belgesinde değişir. Dönüştürülen parçanın maliyeti bundan sonra Excel'den güncellenmez (C4/2).
