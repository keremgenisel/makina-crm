# 0162 Uygulama planı: Analiz'de aynı parça tek satırda toplanır

| | |
|---|---|
| **Spec** | `specs/done/0162-analizde-ayni-parca-tek-satir.md` (Onaylandı, 2026-11-24) |
| **Onay** | Takım Yöneticisi, 2026-11-24 ("tum onerilerini onayliyorum, spece isle, plani yaz ve uygula") |
| **Dal** | `feat/0162-analiz-tek-satir` (main `808ac151` üstünde) |
| **Durum** | Tamamlandı (commit `11a234ce`) |

## 1. Dosyalar

- **`src/lib/analiz.js`:** katalog tek geçişte (`adById`, canlı ad haritası, canlı kimlikler; P2); tek karar `parcaCoz(partId, kayitAdi, yerTutucu)` → `{ anahtar, partId, ad, adaGore }` (kimlik önce, sonra kayıt adının birebir katlanmış eşleşmesi, yoksa bugünkü değerler); `parcaGiris` üç çıktıyı birlikte yazar ve adın kaynağını tutar (P1); servis gösterim adı `parcaAdi(p)` (R7).
- **Testler:** `analiz-tek-satir-0162` (motor, getter casusu, taramalar), `analiz-tek-satir-0162-kiyas` (`0162-once.json`, P3), `ui/analiz-tek-satir-0162` (gerçek Analiz); fikstür `tests/fixtures/0162-veri.js`.
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` `analiz-0162-birlesik`, `kanit-eslemesi.json`, `0162-piksel-raporu.json`, taban.
- **Belgeler:** `CLAUDE.md`, `specs/README.md` (X1, X2, X6 açık bulgu).

## 2. Adım sırası

0. Altın (yapıldı). 1. Motor. 2. Var olan testler dokunulmadan (0160, analiz, ui/analiz, 0121, 0154, 0130). 3. Yeni testler. 4. Kanıt. 5. Belgeler, tam takım, lint.

## 3. Kararlar

Spec'te P1–P6 (plan turu), P1/2 (triyaj).

## 4. Kriter ↔ test

`M` = `tests/analiz-tek-satir-0162.test.js`, `K` = `-kiyas`, `U` = `tests/ui/analiz-tek-satir-0162.test.jsx`.

| Kriterler | Test |
|---|---|
| AC-1–AC-11, AC-20–AC-35, AC-38 | M |
| AC-12, AC-13, AC-19 | U, M |
| AC-14 | K; 0121 ve 0154 kıyasları dokunulmadan |
| AC-15 | M (getter casusu) |
| AC-16, AC-17, AC-18 | M (taramalar) |
| AC-36 | `parca-arama-0160` dokunulmadan |
| AC-37 | `tasarim-kaynak`, `kanit-eslemesi` |
