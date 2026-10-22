# 0101 uygulama planı: stoktaki makinanın kalıp çapı

Spec: `specs/done/0101-stok-makina-kalip-capi.md` (revizyon 3). Plan Takım Yöneticisi tarafından 2026-10-22'de onaylandı;
onaylanan öneriler spec'e "Plan turu kararları" (Karar 23–35) olarak işlendi.

Çalışma kopyası `../wt0101`, dal `feat/0101-kalip-capi`, taban `origin/main` `1c95b1a`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/utils.js` | `kalipCapiYaz(kayit, kc)` (alanı siler, `fmtKalipCapi` boş değilse sığ kopyayla yazar) ve `kalipCapiOnDoldur(stokSatiri)` (`{ kalipCapi }` ya da `{}`) |
| `src/components/ui.jsx` | `KalipCapiFields({ value, onChange, label = "Makina Kalıp Çapı" })`: kendi `Field`'ı, üç kutu `aria-label`, `onChange` bütün nesne |
| `src/components/customers/CustomerAddEditForm.jsx` | çap bloğu bileşene geçer; seçicide boş seçenek yalnız seri no ve serisiz işaretini temizler; serili ve serisiz dallar `kalipCapiOnDoldur` yayar |
| `src/components/stock/MakinaStokTab.jsx` | `save()`'in iki dalı `kalipCapiYaz(...)`; Seri Numarası'nın altında alan; yedinci sütun |
| `src/components/Customers.jsx` | stoğa dönen satır `kalipCapiYaz({...}, c.kalipCapi)` |
| `src/components/settings/SettingsExport.jsx` | `STOK_EXPORT_HEAD`, `stokExportRow(s)` dışa verilir; `exportStock` onları kullanır |
| `electron/db.cjs` | `SCHEMA_SQL` + `STOCK_KALIP_CAPI_COLUMN` + INSERT `json()` + SELECT ayıklaması (yalnız nesneyse yazılır) |
| `src/types.d.ts` | `StockItem.kalipCapi?` |
| `docs/tasarim-sozlugu.md` | "Bileşik alanlar" bölümü |
| `docs/evidence/kanit-eslemesi.json` | 0101 kayıtları (stok `degisti` + onay, müşteri formu `ayni`) |
| `scripts/evidence/0009-sayfa.jsx` | `stok-0101-kalip-capi`, `stok-0101-form-capli` |
| `CLAUDE.md` | yeni alan, bileşen, zincir |

Testler: `tests/fmt-kalip-capi.test.js` ve `tests/ui/musteri-kalip-capi.test.jsx` (önkoşul, eski kodla yeşil),
`tests/kalip-capi-0101.test.js`, `tests/ui/stok-kalip-capi-0101.test.jsx`, `tests/ui/stok-kalip-capi-0101-satis.test.jsx`,
güncellenen `tests/ui/stok-durumu-0100.test.jsx` (AC-4), `tests/server-authz.test.js`, `scripts/tests/db-roundtrip.cjs`,
`scripts/tests/db-clean-install.cjs`; fikstür üçlüsü `tests/fixtures/0101-govde-girdisi.cjs`,
`tests/fixtures/0101-govde-once.json`, `scripts/tests/0101-govde-fikstur.cjs`.

## 2. Adım sırası

1. Önkoşul testler eski kodla (AC-38, AC-29), yeşil çıktısı kaydedilir.
2. Fikstür girdisi ve altın dosya eski `db.cjs` ile; görsel taban raporu eski kodla.
3. Veri katmanı (`db.cjs`) ve roundtrip/clean-install blokları.
4. Saf kural (`utils.js`) ve saf testler.
5. Paylaşılan bileşen; müşteri formu ona geçer, AC-29 testi değişmeden yeşil kalır.
6. Müşteri formu akışı (boş seçenek, iki ön doldurma).
7. Stok formu ve listesi; 0100 AC-4 güncellemesi.
8. Dönen satır ve dışa aktarma.
9. Sunucu bloğu ve taramalar.
10. Görsel kanıt, kanıt eşlemesi, sözlük, CLAUDE.md.
11. `npm run lint`, `npm test` (Electron dahil), typecheck.

## 3. Kriter ↔ test eşlemesi

`saf` = `tests/kalip-capi-0101.test.js`, `stokUI` = `tests/ui/stok-kalip-capi-0101.test.jsx`,
`satisUI` = `tests/ui/stok-kalip-capi-0101-satis.test.jsx`, `rt`/`ci` = Electron roundtrip/clean-install.

| AC | Test |
|---|---|
| 1, 2, 3, 37 | stokUI + saf |
| 4, 5, 8 (davranış), 50 | rt |
| 6 | ci |
| 7, 9, 10, 12, 13, 14, 39, 47 | stokUI |
| 8 (tarama), 11, 15, 16, 22 (tarama), 23, 30, 31, 32, 34, 35, 36, 40 (tarama), 44, 45, 46, 49 | saf |
| 17–21, 22, 24–28, 40 (ekran), 42, 43, Karar 26 | satisUI |
| 29 | `tests/ui/musteri-kalip-capi.test.jsx` |
| 29/2, 48 | `0101-piksel-raporu.json` + `tests/kanit-eslemesi.test.js` |
| 33 | `tests/server-authz.test.js` |
| 38 | `tests/fmt-kalip-capi.test.js` |
| 41 | `tests/ui/stok-durumu-0100.test.jsx` |

## 4. Sürüm notu

Stoğa makina eklerken kalıp çapı girilebilir; makina satılırken çap müşteri formuna kendiliğinden gelir ve düzeltilebilir.
Önce sunucu PC güncellenir: güncellenmemiş sunucu stok satırının çapını kaydetmez (kayıp değil, girilmemiş sayılır).
