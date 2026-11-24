# 0161 Uygulama planı: Sipariş listesinde parçalar cinse göre sıralanır

| | |
|---|---|
| **Spec** | `specs/0161-siparis-listesinde-cins-sirasi.md` (Onaylandı, 2026-11-24) |
| **Onay** | Takım Yöneticisi, 2026-11-24 ("tum onerilerini onayliyorum, spece isle, plani yaz ve uygula") |
| **Dal** | `feat/0161-cins-sirasi` (main `cacceb92` üstünde) |
| **Durum** | Uygulandı (commit bekliyor) |

## 1. Dosyalar

- **`src/lib/siparisIhtiyaci.js`:** `cinsSirasiOf`, `cinsSirasiDogrula`, `cinseGoreSirala` (P4); `secenek.cinsSirasi` (varsayılan `[]`); pencerede her bölümün `hazirParcalar`'ı ve `belirtilmemis.parcalar`, belgede grup içi sıralamanın hemen ardından (R1/9).
- **`src/components/stock/SiparisPenceresi.jsx`:** `cinsSirasiOf(appSettings)` motora; bağımlılık `appSettings?.cinsSirasi` (R3/8).
- **`src/components/settings/SettingsCinsSira.jsx` (yeni):** taslak, Ekle, Yukarı/Aşağı/Kaldır, Kaydet (P5, P6).
- **`src/components/Settings.jsx`, `src/lib/kilitAlanlari.js`:** panel `cinssira`, kilit.
- **`electron/db.cjs`:** `app_settings.cinsSirasi` dört nokta; **`electron/serverAuth.cjs`:** `AYAR_ALAN_SEKMELERI.cinsSirasi`; **`src/App.jsx`:** yükleme yolu.
- **Testler:** `siparis-cins-0161` (motor, doğrulayıcı, çapraz, taramalar), `siparis-cins-0161-kiyas` (`0161-once.json`), `ui/siparis-cins-0161` (pencere, panel, kilit), `ui/siparis-cins-0161-app` (gerçek App), `server-authz` 0161 bloğu, `db-roundtrip.cjs`, `db-clean-install.cjs`; `0161-veri.js`, `0161-yeni-ayar.js` ve on bekçi dosyası; `ui/doviz-parca-0157-kiyas` altını.
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx`, `kanit-eslemesi.json`, `0161-piksel-raporu.json`, taban.
- **Belgeler:** `CLAUDE.md`, `docs/tasarim-sozlugu.md`, `specs/README.md`.

## 2. Adım sırası

0. Altın (yapıldı). 1. Motor. 2. Eski kıyaslar (önce on bir altın dokunulmadan, sonra 0157). 3. Ayar zinciri ve bekçi zinciri. 4. Arayüz. 5. Taramalar. 6. Kanıt. 7. Belgeler, tam takım, lint.

## 3. Kararlar

Spec'te P1–P10 (plan turu), P11–P13 (uygulamada ölçüldü).

## 4. Kriter ↔ test

`M` = `tests/siparis-cins-0161.test.js`, `U` = `tests/ui/siparis-cins-0161.test.jsx`, `A` = `tests/ui/siparis-cins-0161-app.test.jsx`.

| Kriterler | Test |
|---|---|
| AC-1–AC-8, AC-10, AC-32, AC-38, AC-40, AC-52 | M |
| AC-9 | `siparis-cins-0161-kiyas` |
| AC-11 | M (P3) |
| AC-12, AC-13, AC-37 | M, U |
| AC-14–AC-19, AC-42–AC-44, AC-50 | U |
| AC-20, AC-54 | A |
| AC-21 | U |
| AC-22, AC-29, AC-53 | `server-authz` 0161, M |
| AC-23 | U |
| AC-24, AC-26 | M |
| AC-25 | 0158 çapraz ölçümü, M (AC-25 / AC-28 taraması: ayar yalnız App ve motorda okunur) |
| AC-27, AC-28, AC-48, AC-49, AC-55 | M; 0158 ve 0160 taramaları |
| AC-30, AC-45 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-31, AC-39 | M |
| AC-33 | on kıyas dosyası dokunulmadan (0159 P11 ile AC-34'te) |
| AC-34 | `ui/doviz-parca-0157-kiyas` ve `alim-kalemi-0159-kiyas` (P11: altın yenilenmedi, `0161-ayikla.js`) |
| AC-35, AC-36 | M |
| AC-41 | U |
| AC-46 | dokuz bekçi dosyası (P12) ve 0138 taraması |
| AC-47 | `tasarim-kaynak`, `kanit-eslemesi` |
| AC-51 | U |

## 5. Sürüm notu

Önce sunucu PC, sonra bütün istemciler. Güncelleme bitene kadar Ayarlar › Uygulama › Cins Sıralaması'na liste girilmez: güncellenmemiş sunucu alanı tanımaz ve kaydetmez, liste ekranda uyarı vermeden düşer (C7).
