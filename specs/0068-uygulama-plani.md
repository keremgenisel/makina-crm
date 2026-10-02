# 0068 Uygulama Planı: İşlem Geçmişi Etiketi, Çek Dışa Aktarması ve Çöp Kutusuna Girmeyen Veri

| | |
|---|---|
| **Bağlı spec** | `specs/0068-veri-izlenebilirligi-ve-geri-alinabilirlik-denetimi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0068-cop-kutusu` (`feat/0067-kutu-duzeni` kapanışından sonra) |
| **Onay** | Takım Yöneticisi, 2026-10-02: bütün öneriler (Q1–Q9) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Etiketi eksik tek kayıt türü `uretim_partisi`; eylemde eksik yok (taramadaki `mahsup` / `verilen` üçlü ifadedeki
  karşılaştırma değerleri).
- Çöp Kutusu'ndan geri alma 403 almıyor: `sekmeEngelli` sekmelerden birini arar, satırı gören kullanıcının Giderler
  sekmesi var (R15 düzeltildi, sunucu değişmez).
- Kullanımdaki tedarikçi bugün silinemiyor (`Tedarikciler.jsx` "silinemez" penceresi; R8, R14 düzeltildi).
- "Tüm Kayıtlar" dışa aktarma ekranında (R6 düzeltildi).
- Beş onay penceresinin dördünde dağınık "çöpe düşmez" metinleri var (R22 tek sabit).
- `tedarikciler` / `uretim_partileri` SELECT `...rest` ile okuyor; şema, sütun göçü ve INSERT gerekli.
- Stok formundaki parti seçicisi listede olmayan partiyi "Silinmiş parti" seçeneğiyle koruyor.

## 2. Dosyalar

- İşlem geçmişi: `src/components/settings/SettingsAuditLog.jsx`; `tests/islem-gecmisi-etiketleri.test.js`.
- Çek dışa aktarması: `src/components/settings/SettingsExport.jsx` (`cekExportRow`, rapor), `Settings.jsx`, `App.jsx`.
- İçe aktarma metni: `src/components/settings/SettingsImport.jsx`; dışa aktarmadaki "Tüm Kayıtlar" kartı.
- Çöp Kutusu: `electron/db.cjs`, `src/App.jsx` (canlı/ham, `purgeOldTrash`), `gider/Tedarikciler.jsx`,
  `gider/UretimPartileri.jsx`, `settings/SettingsTrash.jsx`, `src/lib/copKutusu.js` (`KALICI_SILME_NOTU`, geri alma
  ad denetimi), beş onay penceresi (`SettingsGiderTanimlari`, `GiderTurManager`, `gider/StandartGiderler`, `Kasa`,
  `cek/CekPortfoyu`).
- Testler: `tests/cop-kutusu-0068.test.js`, `tests/ui/cop-kutusu-0068.test.jsx`,
  ek bloklar `gider-gizlilik`, `server-authz`, `server-security.cjs`, `db-roundtrip.cjs`, `db-clean-install.cjs`,
  `ui/settings-import`.
- Kanıt: `scripts/evidence/0009-sayfa.jsx`; belgeler `CLAUDE.md`, `specs/done/0022-*.md` (kalıcı silme notu).

`serverAuth.cjs`, izinler ve motorlar değişmez.

## 3. Kararlar

Q1 → R15 (eşleme değişmez) · Q2 → R8/R14/Context · Q3 → R20 · Q4 → R21 · Q5 → R22 · Q6 → R23 · Q7 → R6 · Q8 → R24 ·
Q9 → R25.

## 4. Adım sırası

1. Veritabanı sütunları ve roundtrip / clean-install. 2. İşlem geçmişi etiketi ve kapsam testi. 3. Soft-delete:
App, silme yolları, Çöp Kutusu, otomatik temizlik, sunucu testleri. 4. Kalıcı silme sabiti ve beş pencere.
5. Çek raporu ve kapsam metinleri. 6. Electron dışı takım, lint, Electron testleri. 7. Kanıt, TY onayı, belgeler.

## 5. Kriter ↔ test eşlemesi

`S` = `tests/cop-kutusu-0068.test.js`, `U` = `tests/ui/cop-kutusu-0068.test.jsx`, `L` = `tests/islem-gecmisi-etiketleri.test.js`,
`G` = `tests/gider-gizlilik.test.js` (0068 bloğu). Çek dışa aktarmasının ayrı test dosyası yoktur (triyaj düzeltmesi).

| AC | Test |
|---|---|
| AC-1 | U: işlem geçmişinde parti satırı "Üretim Partisi" |
| AC-2, AC-3, AC-4, AC-34, AC-40 | L: tür / eylem kümeleri haritaların alt kümesi; karşılaştırma değerleri ayıklanır; dinamik yerler; sahte tür kırar |
| AC-5, AC-6 | S: `cekExportRow` bağlı / bağsız alınan + verilen çek satırları, iki taraf sütunu; U: rapor kartı |
| AC-7, AC-31, AC-41, AC-43 | G: çalışana giden çek satırı yok (ad, tutar, tarih, vade geçmez); S: tek yeni prop `cekler`; U: kasa yetkisiz kullanıcıda rapor yok |
| AC-8, AC-9 | U: içe aktarma kapsam satırı; `ui/settings-import`: başka bölümler aynen |
| AC-10, AC-11, AC-13, AC-15, AC-33, AC-37, AC-38 | U: sil → çöp → geri al / kalıcı sil / boşalt; ad çakışması; yetki kapıları; S: `purgeOldTrash` iki bölüm |
| AC-12, AC-14, AC-19, AC-29, AC-30 | S: çöpteyken motor çıktısı = kayıt hiç yokken; parti geri alınınca eski dağıtım; motor diff'i boş |
| AC-16, AC-17, AC-32, AC-39 | U: beş pencere + Çöp Kutusu aynı sabit; S: serbest metin taraması |
| AC-18 | mevcut testler dokunulmadan yeşil |
| AC-20, AC-21 | `db-roundtrip.cjs`, `db-clean-install.cjs` (Electron) |
| AC-22, AC-24, AC-26, AC-36 | `server-authz` + `server-security.cjs`; S: `serverAuth.cjs`, izin tanımları, `ALAN_IZINLERI` diff'i boş |
| AC-25, AC-23 | spec metni |
| AC-27, AC-28 | S kaynak taraması |
| AC-35 | `kanit-eslemesi.json` + kanıt testleri |
| AC-42 | `VITEST_ELECTRON=only` çıktısı |

## 6. Notlar
- R2 sonrası uygulamada iki tespit yerinde düzeltildi (spec R3): sunucu çöpe atmayı silme sayıyor (R16, AC-25/26, X7);
  alacaklısı çalışan olan çek dışa aktarmaya hiç girmiyor (R27, AC-43; triyajda TY kararıyla, aşağıda).
- Görsel kanıt (TY onayı 2026-10-02): tam çekimde 528 görüntünün 507'si 0 piksel; değişenler Çöp Kutusu, Dışa Aktar, İçe
  Aktar, Gider Türleri (iki ekran), beş yeni 0068 ekranı; `uygulama-menu-kasali` karanlık 37 piksel bilinen titreşim.
  İşlem Geçmişi sözlüğü kullanmadığı için eşleme kaydı yok.
- Triyaj: alacaklısı çalışan olan çek dışa aktarmadan tamamen çıkarıldı (TY kararı; önce yalnız ad gizleniyordu, tutar ve
  tarih görünüyordu); kriter ↔ test tablosundaki var olmayan `cek-export-0068` dosyası düzeltildi.
