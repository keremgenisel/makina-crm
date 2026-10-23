# 0103 uygulama planı: satılmış makinanın partisi sonradan düzeltilebilir

Spec: `specs/0103-satilmis-makinanin-partisi-duzeltilir.md` (revizyon 4). Plan Takım Yöneticisi tarafından 2026-10-23'te
onaylandı; onaylanan öneriler spec'e "Plan turu kararları" (Karar 28–37) olarak işlendi.

Çalışma kopyası `../wt0103`, dal `feat/0103-parti-duzeltme`, taban `origin/main` `520bcdb`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/customers/CustomerAddEditForm.jsx` | `stokSecicisiKipi = modal === "add" \|\| seriBekleyenDuzenleme`; `partiSecicisi = giderYetki && !(stokSecicisiKipi && stoktanSecildi)`; `isStockSerialPick` aynen (R17); ipucu Karar 8 cümlesi, panonun adı `PANO_SEKME_ADI`'ndan; eski kuralı anlatan iki yorum güncellenir |
| `scripts/evidence/0009-sayfa.jsx` | `MUSTERI_0103` ve `musteri-formu-0103-parti` |
| `docs/evidence/kanit-eslemesi.json` + `0103-taban-*`, `0103-*`, `0103-kapanis-*` | kanıt (Karar 10) |
| `CLAUDE.md` | 0100 bölümünün parti seçicisi cümlesi |

Testler: `tests/ui/stok-durumu-0100-satis.test.jsx` (`:131` ters çevrilir, 0103 bloğu), `tests/ui/stok-durumu-0100-app.test.jsx`
(AC-31), yeni `tests/parti-duzeltme-0103.test.js` (taramalar).

## 2. Adım sırası

1. Görsel taban eski kodla (yeni ekran tabana girmez).
2. Form: koşul ve ipucu.
3. Testler.
4. Yeni ekran ve iş raporu (beş müşteri formu ekranı 0 fark, yeni ekran "önce görüntüsü yok").
5. Kanıt eşlemesi, CLAUDE.md.
6. `npm run lint`, `npm test` (Electron dahil).

## 3. Kriter ↔ test eşlemesi

`satis` = `tests/ui/stok-durumu-0100-satis.test.jsx`, `app` = `tests/ui/stok-durumu-0100-app.test.jsx`,
`tarama` = `tests/parti-duzeltme-0103.test.js`.

| AC | Test |
|---|---|
| 1–17, 27, 29 | satis |
| 12, 30 | satis + tarama |
| 18 | `ui/kilit-0064` (dokunulmadan) |
| 19, 31 | app (planı girilmemiş model yarısı 0100 AC-23/55) |
| 20 | `tests/stok-durumu-0100.test.js` (dokunulmadan) |
| 21, 22 | `parti-genel-payi-0090`, `maliyet-gecmisi-0097` (dokunulmadan) |
| 23 | satis (casus, Karar 29) + tarama |
| 24, 25, 26, 28 | tarama |
| 32 | `kanit-eslemesi` + `tasarim-kaynak` |

## 4. Sürüm notu

Gerekmez (DoD 9): yeni alan yok, güncellenmemiş istemci yalnız seçiciyi düzenlemede görmez.
