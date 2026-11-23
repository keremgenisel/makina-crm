# 0155 Uygulama planı: Tedarikçiden alacak (fazla ödeme, avans, mahsup)

| | |
|---|---|
| **Spec** | `specs/0155-tedarikci-avansi-ve-alacagi.md` (Onaylandı, 2026-11-23) |
| **Onay** | Takım Yöneticisi, 2026-11-23 ("tum onerilerini kabul ediyorum, spece isle, plani yaz ve uygula") |
| **Dal** | `feat/0155-tedarikci-avansi` (main `51783ca4` üstünde) |
| **Durum** | Uygulandı; commit ve kapanış Takım Yöneticisinin talimatını bekliyor |

## 1. Dosyalar

- **`src/lib/kasa.js`:** `tedarikciAvanslari` (kova okuyucusu, P1 `liraK`), `avansliTedarikciler` (P8), `avansDogrula` tedarikçi dalı (yön, döviz, R4, R11/2, R12), `tedarikciAvansSilinebilirMi` / `tedarikciAvansDuzenlenebilirMi` (R1/2), `mahsupDogrula` tedarikçi dalı (R7–R8/2, R24, R25, R28, P2, P10), `hesapBakiyeleri` avans kolu (R3/2), `hareketOzeti` kırılımı (R19/2, P7), `hesapTasimaPlani` döviz avans koruması (R27/2), `tedarikciEkstresi` iki yönlü (R15, P1).
- **`src/lib/doviz.js`:** `dovizHareketMi` (türden bağımsız; `dovizOdemeMi` aynı fonksiyon, R22/2).
- **`src/lib/copKutusu.js`, `src/lib/giderRaporu.js`, `src/lib/merge.js`, `electron/db.cjs`:** çöp adı (R20), rapor kutusu (R19), birleştirme (C11), `tedarikciId` sütunu (C6).
- **Arayüz:** yeni `kasa/TedarikciAvanslari.jsx`; `kasa/CalisanAvanslari.jsx` (`AvansFormu` `taraf`), `Kasa.jsx`, `gider/OdemeGirisi.jsx`, `gider/OdemeKayitPenceresi.jsx`, `GiderForm.jsx`, `Giderler.jsx`, `gider/EkstrePenceresi.jsx`, `gider/Tedarikciler.jsx`, `settings/SettingsTrash.jsx`, `App.jsx`, `lib/kilitAlanlari.js`.
- **Testler:** `tedarikci-avansi-0155` (motor), `-kiyas` (`0155-veri.js`, `0155-once.json`), `ui/tedarikci-avansi-0155` (Kasa), `ui/tedarikci-avansi-0155-giderler` (ödeme penceresinin mahsup kipi, Tedarikler, ekstre, Çöp Kutusu); ek bloklar `server-authz`, `db-roundtrip.cjs`, `merge`; "spec 0155 ile" güncellenenler. `kilit-alanlari` dokunulmadan yeşil (envanter `lib/kilitAlanlari.js`'te). Sunucu kuralı değişmediği için `server-security.cjs`'e, yeni sütun `applyColumnMigrations`'tan geçtiği için `db-clean-install.cjs`'e blok eklenmedi.

## 2. Adım sırası

1. Kıyas altı spec öncesi koddan. 2. Veri ve kitaplık. 3. Arayüz. 4. Kilit envanteri, eski taramalar. 5. Mutasyon, tam takım, lint, kanıt, CLAUDE.md, sürüm notu.

## 3. Kararlar

Spec'te P1–P10.

## 4. Kriter ↔ test

| Kriterler | Test |
|---|---|
| AC-2–AC-10, AC-21, AC-22, AC-45, AC-46 | `tedarikci-avansi-0155` + `ui/tedarikci-avansi-0155` |
| AC-11–AC-20, AC-23–AC-28, AC-58, AC-61, AC-62 | `tedarikci-avansi-0155` |
| AC-59, AC-60 | `ui/tedarikci-avansi-0155-giderler` |
| AC-1, AC-64, AC-68, AC-70 | `ui/tedarikci-avansi-0155` |
| AC-29, AC-50–AC-56 | `tedarikci-avansi-0155` + `ui/tedarikci-avansi-0155-giderler` |
| AC-30, AC-37, AC-63, AC-65, AC-67 | `ui/tedarikci-avansi-0155-giderler` |
| AC-31–AC-33, AC-35, AC-43, AC-44 | `tedarikci-avansi-0155-kiyas` + motor |
| AC-34, AC-49, AC-69 | `tedarikci-avansi-0155` |
| AC-36, AC-47, AC-48 | `tedarikci-avansi-0155` + `ui/tedarikci-avansi-0155` |
| AC-38, AC-66 | `tedarikci-avansi-0155` + `ui/tedarikci-avansi-0155` |
| AC-39, AC-71 | `ui/tedarikci-avansi-0155` + `islem-gecmisi-etiketleri` |
| AC-40, AC-57 | `tedarikci-avansi-0155` (taramalar) |
| AC-41 | `db-roundtrip.cjs` |
| AC-42 | `merge.test.js` |
| AC-72 | `ui/tedarikci-avansi-0155` (`kilit-alanlari` envanter taraması dokunulmadan yeşil) |

| Triyaj (bulgu 1–3, 5) | `tedarikci-avansi-0155` "Spec 0155 triyaj" bloğu, `ui/tedarikci-avansi-0155-giderler` (mahsup düzenleme), `ui/tedarikci-avansi-0155` (yerel gün) |

## 5. Sürüm notu

Önce sunucu PC, sonra bütün istemciler; güncelleme bitene kadar tedarikçi avansı girilmez (güncellenmemiş bilgisayar `tedarikciId`'yi tanımaz, avansı çalışansız avans gibi gösterir, düzenlerse alan düşer). Bugünkü şişik kaydın düzeltme sırası: kalemin tutarı gerçek fatura tutarına indirilir, kalemi kapatan ödeme hareketi düzenlenip gerçek tutara çekilir, aradaki fark aynı hesaba ve tarihe tedarikçi avansı olarak girilir (döviz ödemede aynı dövizle ve o günün kuruyla).
