# 0102 uygulama planı: Makina Stoğu sayfalanmaz, panonun kalan sütunu "Planlanandan kalan"

Spec: `specs/0102-stok-sayfalama-ve-kalan-adi.md` (revizyon 3). Plan Takım Yöneticisi tarafından 2026-10-22'de onaylandı;
onaylanan öneriler spec'e "Plan turu kararları" (Karar 24–33) olarak işlendi.

Çalışma kopyası `../wt0102`, dal `feat/0102-stok-sayfalama`, taban `origin/main` `d24b9de`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/stock/MakinaStokTab.jsx` | kancadan `{ search, setSearch, filtered, oncesi }`; `paged.map` → `filtered.map`; `<Pagination>` ve içe aktarması kalkar; iki süzgeç işleyicisinden yalnız `setPage(1)` silinir |
| `src/lib/stokDurumu.js` | `PANO_KALAN_ADI`, `PANO_KALAN_IPUCU` (cümle adı sabitten kurar, "−" korunur) |
| `src/components/stock/PartiUretimPanosu.jsx` | `SUTUNLAR`'ın beşinci adı ve ipucu iki sabitten |
| `docs/tasarim-sozlugu.md` | Sayfalama bölümünde üçüncü istisna maddesi (0084'ün ardına) |
| `scripts/evidence/0009-sayfa.jsx` | `STOK_0102` (14 satır) ve `stok-0102-uzun-liste` |
| `docs/evidence/kanit-eslemesi.json` + `0102-*`, `0102-taban-*`, `0102-kapanis-*` | kanıt kayıtları ve raporlar |
| `CLAUDE.md` | 0100 ve 0062 bölümleri |

Testler: yeni `tests/sayfalama-stok-0102.test.js` (taramalar), `tests/ui/sayfalama-stok-0102.test.jsx` (ekran ve hız);
güncellenen `tests/ui/stok-durumu-0100.test.jsx` (AC-22 metni; AC-46 silinip "spec 0102 ile" yeniden yazılır).

## 2. Adım sırası

1. Kanıt aracına yeni ekran; eski kodla taban ve determinizm turu.
2. Sabitler ve pano.
3. Makina Stoğu listesi ve iki işleyici.
4. 0100 testinin iki değişikliği; yeni ekran ve tarama testleri, hız ölçümü.
5. Sözlük maddesi.
6. Yeni kodla görsel kanıt, kanıt eşlemesi, CLAUDE.md.
7. `npm run lint`, `npm test` (Electron dahil).

## 3. Kriter ↔ test eşlemesi

`tarama` = `tests/sayfalama-stok-0102.test.js`, `ekran` = `tests/ui/sayfalama-stok-0102.test.jsx`,
`0100UI` = `tests/ui/stok-durumu-0100.test.jsx`.

| AC | Test |
|---|---|
| 1–5, 8–11, 19–21, 23, 24 (ekran), 27, 30, 31, 38 | ekran |
| 6, 7, 28, 29 | 0100UI (dokunulmadan) |
| 12–16, 18, 24 (kaynak), 25, 26, 33, 34, 37, 40, 41, 43, 44 | tarama |
| 17 | `tests/sayfalama-0062.test.js` (dokunulmadan) |
| 22, 39 | 0100UI (güncellenen / yeniden yazılan) |
| 32 | `tests/stok-durumu-0100.test.js` (dokunulmadan) |
| 35 | `ui/stok-durumu-0100-anasayfa`, 0079/0095 kıyasları (dokunulmadan) |
| 36 | `tests/kalip-capi-0101.test.js` (dokunulmadan) |
| 42 | `tests/kanit-eslemesi.test.js`, `tests/tasarim-kaynak.test.js` |

## 4. Sürüm notu

Makina Stoğu listesi artık sayfalara bölünmüyor; süzgeçten geçen bütün makinalar tek listede. Parti Üretim Panosu'nun
son sütununun adı "Planlanandan kalan" oldu (sayılar aynı). Veri değişikliği yok, güncelleme sırası serbest.
