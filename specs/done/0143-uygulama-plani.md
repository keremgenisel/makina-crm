# 0143 Uygulama planı: boy fiyatı yöntemi kalkar, yerine boydan sipariş işareti gelir

| | |
|---|---|
| **Spec** | `specs/0143-boydan-siparis.md` (revizyon 2) |
| **Onay** | Takım Yöneticisi, 2026-11-12 (dokuz öneri onaylandı, spec'e işlendi) |
| **Dal** | `feat/0143-boydan-siparis` (`d771e776` üstünde) |
| **Durum** | Tamamlandı: commit `02d9428d`. Triyaj (2026-11-12): uzunlukta yuvarlama (`UZUNLUK_TOLERANSI_MM`), elle boy adedinde asgari uyarısı, göç `yontem`'i her değerde siler. |

## 1. Dosyalar

- **Motor:** `src/lib/malzeme.js` (yöntem, boy dalı, boy fiyatı ve geldiği boy kalkar; `boydanSiparis` + `cubukBoyu` doğrulaması;
  `tamBoyKg` çubuk boyunu kalemden alır), `src/lib/siparisIhtiyaci.js` (tek `kesitAnahtari`, işaretli kalemde tüketim oranı, işaretsizde
  net artı fire, düzenleme işaretten, kalkan neden metinleri ve `artanKg`).
- **Ekran ve belge:** `MalzemeSatiriAlani.jsx`, `MalzemeManager.jsx`, `MalzemeFiyatPenceresi.jsx`, `stock/SiparisPenceresi.jsx`,
  `lib/siparisRaporu.js`.
- **Veri:** yeni `electron/boyGocuSaf.mjs`, `electron/db.cjs` (göç üç dalda, iki ölü sütun, okuma ayıklaması),
  `settings/SettingsBackup.jsx` (geri yüklemede aynı çekirdek, D-R3/4).
- **Diğer:** `lib/ornekKatalog.js`, `lib/malzemeListesiAktarma.js`, `src/types.d.ts`.
- **Testler:** `0143-veri.js`, `0143-once.json`, `0143-ayikla.js`, `boydan-siparis-0143`, `boy-gocu-0143`, `boydan-siparis-0143-kiyas`,
  `ui/boydan-siparis-0143`, `scripts/tests/boy-gocu.cjs` (Electron); "spec 0143 ile" güncellenenler spec C7'nin dokuz dosyası ve
  `isleme-payi-0141-kiyas`, `fire-kg-0139-kiyas`, `ui/fire-kg-0139`, `ui/malzeme-0132`, 0142 testleri.
- **Kanıt ve belgeler:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0143-*`, `kanit-eslemesi.json`, `CLAUDE.md`.

## 2. Adım sırası

1. Hazırlık (kod değişmeden): fikstürlerden geldiği boy ve boy fiyatı kalkar, boy kalemleri kiloya çevrilir, 504'e özgül ağırlık ve
   kilo fiyatı; altı altın ve `0143-once.json` eski kodla üretilir, SHA özetleri kaydedilir.
2. Motor. 3. Göç ve veri. 4. Ekran ve belge. 5. Diğer kaynaklar. 6. Kanıt, `CLAUDE.md`, tam test, lint, mutasyonlar.

## 3. Kararlar (onaylı öneriler)

| No | Konu | Karar | Spec |
|---|---|---|---|
| 1 | Altıncı altın (0140) | Hazırlığa girer, SHA yenilenir | C2/3, AC-34 |
| 2 | Ayıklamasız kıyas mümkün değil | Dar ortak ayıklama, sayılar dokunulmaz | C2/3, AC-66 |
| 3 | Çubuk parçadan kısa | Net artı fire, neden, belgede kilo | B-R8/3, AC-61 |
| 4 | Göçün geldiği boy kaynağı | Yedek geri yüklemede de çekirdek; JSON dalı gövdeden | D-R3/4, AC-64 |
| 5 | Dokunulmamış kayıt dalı | `yontem` silinmez | D-R3/5, AC-65 |
| 6 | 0139 tablolu kıyas boşalır | İşaretli kaleme çevrilir | C7 |
| 7 | Aynı kesit, farklı çubuk | Kesit metninde çubuk boyu | C-R4, AC-63 |
| 8 | Anahtar biçimi | `501|boy|400|mil|30` | B-R3/3, AC-62 |
| 9 | Kanıt gürültüsü | Taban eski kodla ayrı klasörde, tekrar çekimi | DoD |

## 4. Kriter ↔ test

| AC | Test |
|---|---|
| 1–4, 7–10, 21–23, 25, 26, 43–46, 65 | `ui/boydan-siparis-0143` |
| 5, 48, 49, 52, 60 | `boydan-siparis-0143` taramaları |
| 6, 11, 33, 34, 66 | `boydan-siparis-0143-kiyas` |
| 12–20, 24, 35–42, 47, 53, 61–63 | `boydan-siparis-0143` (motor, belge) |
| 27–30, 56–59, 64 | `boy-gocu-0143` (saf) + `scripts/tests/boy-gocu.cjs` (Electron) + `ui/boydan-siparis-0143` (geri yükleme) |
| 31, 32, 54, 55 | `scripts/tests/db-roundtrip.cjs` |
| 50 | `ornek-katalog` |
| 51 | `malzeme-aktarma-0139` |

## 5. Sürüm notu

Malzemede boy fiyatı ve geldiği boy kalktı; maliyet her zaman kilodan. Boy başına fiyat veren tedarikçinin fiyatı kilo fiyatına
çevrilip girilir. Parçanın malzeme kaleminde "Sipariş boydan verilir" ve çubuk boyu: sipariş listesi o malzemeyi boy sayısıyla
yazar, işaretsiz malzemede kilo (net artı fire; eskiden kartın geldiği boyundan çubuk sayısına yuvarlanıyordu). Önce sunucu PC
güncellenir; eski istemciden gelen boy yöntemli kalem kilo kalemi olarak kalır.
