# 0105 uygulama planı: müşteri formunun model seçicisi üretimdeki modelleri ve stok adedini gösterir

Spec: `specs/done/0105-model-secicisi-uretimdekiler-ve-stok-adedi.md` (revizyon 3). Plan Takım Yöneticisi tarafından 2026-10-24'te
onaylandı; onaylanan öneriler spec'e "Plan turu kararları" (Karar 31–39) olarak işlendi.

Çalışma kopyası `../wt0105`, dal `feat/0105-model-secici`, taban `origin/main` `fb0e902`.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/uretimdekiModeller.js` | `uretimdeSuzulmusModeller(ayar, models, { korunan, stoktaMi })` → `[{ m, uretimde }]` (R23, Karar 31, 32); ipucu R22/2 |
| `src/lib/stokDurumu.js` | `modelStokSayaci({ stock })`, `modelStokOku`, `modelStokMetni`, `STOKTA_YOK` (R9/2, R25, Karar 35) |
| `src/components/customers/CustomerAddEditForm.jsx` | `appSettings = {}`, tek `useMemo` sayaç, süzülmüş ızgara, kartta stok satırı ve ibare, iki boş durum (Karar 37, 38) |
| `src/components/Customers.jsx` | forma `appSettings` iletilir (R24, Karar 29) |
| `docs/tasarim-sozlugu.md` | iki form atfı (Karar 34) |
| `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/*` | `musteri-formu-0105-model`; `0105-taban`, `0105` raporları; eşleme |
| `CLAUDE.md`, `specs/README.md` | kapanışta |

Testler: yeni `tests/model-secici-0105.test.js` (saf, taramalar), `tests/ui/model-secici-0105.test.jsx` (form ve gerçek
`Customers`); güncellenen `tests/uretimdeki-modeller-0091.test.js`, `tests/plan-adetler-0093.test.js`,
`tests/ui/uretimdeki-modeller-0091.test.jsx` (AC-33 ters çevrilir, ipucu desenleri).

## 2. Adım sırası

1. Önkoşul testleri eski kodla: prop'suz ızgara bütün modelleri çizer, AC-22'nin kayıt nesnesi.
2. Görsel taban eski kodla (`katalog-model-uretimde` ve yedi müşteri formu ekranı).
3. Saf katman (`stokDurumu.js`, `uretimdekiModeller.js`).
4. Form ve `Customers`.
5. Bağlı yerler: ipucunun dört yeri, taramanın iki kopyası, AC-33, sözlük atıfları.
6. Yeni testler ve mutasyonla ölçüm (yardımcı her şeyi döndürür → AC-1/6; korunan küme yalnız `form.model` → AC-27; sayaç
   kart içinde → AC-30).
7. İş raporu ve kanıt eşlemesi (`degisti` + onay).
8. `npm run lint`, `npm run typecheck`, `npm test` (Electron dahil).

Kapanışta (Karar 13, 36) taban raporu son kodla yeniden çekilir ve iki kayıt `ayni`ye bağlanır.

## 3. Kriter ↔ test eşlemesi

`S` = `tests/model-secici-0105.test.js`, `U` = `tests/ui/model-secici-0105.test.jsx`.

| AC | Test |
|---|---|
| 1, 2, 8 | U (+ S yardımcı) |
| 3, 31 | U (dört işaretsiz hâl) + altı doğrudan çizen test dosyası dokunulmadan yeşil |
| 4, 5, 27, 28 | U (5: gerçek `Customers`, `openNewPrefill`) |
| 6, 7 | U + S (`stoktaMi`) |
| 9, 29 | U |
| 10–16 | S (+ U AC-10) |
| 17, 18, 19 | U |
| 20 | 0091 AC-34 + S tarama |
| 21, 23, 25, 26 | S |
| 22 | U (gerçek `Customers`, `toEqual`) |
| 24 | güncellenen 0091 UI ve 0093 testleri + S |
| 30 | S tarama + U casus |
| 32 | `kanit-eslemesi` ve `tasarim-kaynak` (kapanışta) |

## 4. Uygulamada çıkanlar

- İpucu metni beş yerde bağlıymış (spec ölçüm 16 dört sayıyordu): beşincisi `tests/ui/plan-adetler-0093.test.jsx` AC-16.
- `CLAUDE.md` bu planın done yolunu andığı için `tests/spec-atiflari.test.js` `TASINACAK` listesine `0105-uygulama-plani.md`
  eklendi; kapanışta çıkarılır.
- Karar 38 uygulamada netleşti: model adı kart başlığının kendi metni, ibare ayrı `span` (0104 kart yardımcısı korunur).
- Sözlük atıfları: `:123` → `:128`; `BolumBasligi` atfı (`:150`, zaten boş satırdı) → `:163`.
- Mutasyonla ölçüm: yardımcı her şeyi döndürür (AC-1/4/6/9/28 kırıldı), korunan yalnız `form.model` (AC-27), korunan yalnız
  özgün model (AC-5), `stoktaMi` yok (AC-6), sayaç memo'suz (AC-30 iki test), ibare her kartta (AC-1, AC-26), Customers ayarı
  iletmez (AC-1/R24, AC-5). Hepsi geri alındı.
- Görsel: taban 16 görüntü eski ↔ eski 0 fark; iş raporu `katalog-model-uretimde` iki temada değişti (21208 / 21059 piksel),
  yedi müşteri formu ekranı 0, yeni `musteri-formu-0105-model` önce görüntüsü yok.
