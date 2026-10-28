# 0115 Uygulama planı: tamire gelen kalıp atölyenin iş listesine düşer

Spec: `specs/0115-kalip-tamiri-atolye-is-listesi.md`. Dal `feat/0115-kalip-tamiri` (`86a76b5f` üstünde). Takım Yöneticisi planın on üç önerisinin hepsini onayladı (spec Karar 47–59).

## 1. Dosyalar

| Katman | Dosya | İş |
|---|---|---|
| Saf (electron) | `electron/kalipTamiriGocuSaf.mjs` (yeni) | `kalipAdDeseni(ad)`, `kalipTamiriGocPlani(partTypeDefs, parts, { simdi, paletAnahtarlari })`, `GOC_TIP_ADI`, `PALET_ANAHTARLARI` (Karar 49, 59) |
| Saf (renderer) | `src/lib/kalipTamiri.js` (yeni) | dedektör, liste okuma/yazma, harita, bekleyen tamirler, rozet özeti, doğrulama, satır kurucu, metinler (R3/2, Karar 52, 56) |
| Model | `src/components/stock/uretimFormModel.js` | `emptyRow()` → `tur: "uretim"`, `kaynakKalipId: null`, `servisTarihi: ""` |
| DB | `electron/db.cjs` | `services.atolyeKaliplari TEXT` dört nokta (ayıklama), `kalipTamiriGocu(conn)` üç açılış dalında |
| Tip paneli | `src/components/PartTypeManager.jsx` | dördüncü kutu "Kalıp işi" (`kalipIsi`); sistem tipleri tohumu değişmedi (alan yoksa kapalı, C9) |
| Parça kartı | `src/components/PartManager.jsx` | R6 ipucusu (`kalipAdDeseni` + `parcaKalipIsiMi`) |
| Servis formu | `src/components/ServiceForm.jsx`, yeni `src/components/KalipAtolyeAlani.jsx` | kutu, ipucu, öneri, üç kaynak, satır hataları |
| Kurucular | `customers/CustomerDetailModal.jsx` `saveService`, `ServisPanosu.jsx` `kaydet` | `tamirDogrula` + `tamirListesiKur` + `tamirYaz` |
| Üretim formu | `stock/UretimFormu.jsx`, `stock/uretimFormPrint.js`, `stock/UretimSatirEkleModal.jsx`, `Stock.jsx` | Tür sütunu, "Bekleyen Tamirleri Getir", üç dallı küme, etiket düğmesi, `services` prop'u, manuel pencere bağı (R40) |
| Pano | `ServisPanosu.jsx`, `ServisPencere.jsx`, `App.jsx` | rozet, onay penceresi, kapı, kilit; `uretimFormlari` / `partTypeDefs` salt okunur |
| Geçmiş | `customers/detail/MachineTimeline.jsx`, `Customers.jsx` (`tamirHarita`), `CustomerDetailModal.jsx` | rozet, kalıp adları, etiket düğmesi |
| Rozet | yeni `src/components/TamirRozeti.jsx`; `ui.jsx` `ConfirmDialog` isteğe bağlı `cancelLabel`/`confirmVariant` | Karar 55 |
| Çıktı | `src/lib/printTemplates.js`, `settings/SettingsTranslations.jsx` | `atolyeKaliplariLabel`, `tamirEtiketVerisi`, `tamirEtiketYazdir` |
| Kilit | `src/lib/kilitAlanlari.js` | `uretim_formu` listesine `ServisPanosu.jsx` |
| Belge | `CLAUDE.md`, `docs/tasarim-sozlugu.md` | yeni bölüm, KARGO-TAKİP NO düzeltmesi, Bilinen borç notu |

## 2. Adım sırası

1. Kıyas altını spec öncesi kodla (`tests/fixtures/0115-once.json`, `YAZ_0115=1`).
2. Saf modüller ve testleri (`tests/kalip-tamiri-0115.test.js`).
3. DB sütunu ve göç, Electron testleri (`db-roundtrip.cjs`, `db-clean-install.cjs`, yeni `scripts/tests/kalip-tamiri-gocu.cjs`).
4. Tip paneli, parça ipucusu.
5. Servis formu ve iki kurucu.
6. Üretim formu, çıktı, manuel pencere.
7. Pano, köprü, App zincirleri.
8. Makina Geçmişi, Servis Formu çıktısı, Kargo Etiketi.
9. Ters çevrilen testler (0015 AC-7, `kargo-etiketi`, `ceviri-kapsam`), sunucu yazım testleri (`server-authz`).
10. Görsel kanıt, CLAUDE.md, sözlük, README.

## 3. Riskler

- **Gövde sızıntısı (C11):** formun geçici alanları (`_kalipAtolye`, `_tamirHatalari`) iki kurucunun `tamirYaz`'ında silinir; AC-77 gerçek App gövdesiyle ölçer.
- **Sistem tiplerinin düşmesi (ölçüm 25):** göç yalnız dolu listeye ekler; Electron testi satırsız ve dolu iki hâli sınar.
- **Paket sınırı:** `db.cjs`'in çağırdığı her şey `electron/` altında (Karar 59).
- **Kalıp durumu (C1):** tamir satırı `satirAnahtari`'ndan `null`; 0106/0107/0108/0110 testleri dokunulmadan koşulur.
- **Pano yazımı:** yalnız ana pencere sekmesi (`setUretimFormlari` prop'u yalnız oradan verilir), köprü listesi altı bölüm.

## 4. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, AC-4, AC-11, AC-57, AC-58, AC-65 | `ui/kalip-tamiri-0115.test.jsx` (tip paneli, parça ipucusu, Makina Geçmişi) |
| AC-2, AC-3, AC-74, AC-91 | `kalip-tamiri-0115.test.js` |
| AC-5–AC-9, AC-82–AC-85 | `kalip-tamiri-0115.test.js` (göç planı) + `scripts/tests/kalip-tamiri-gocu.cjs` (Electron, `db-electron.test.js`) |
| AC-10, AC-66, AC-86, AC-95, AC-103 | `kalip-tamiri-0115.test.js` (taramalar) |
| AC-12–AC-26, AC-75, AC-81, AC-87, AC-88 | `ui/kalip-tamiri-0115-form.test.jsx` |
| AC-27, AC-67, AC-68 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-28–AC-43, AC-76, AC-79, AC-80, AC-89, AC-90, AC-97, AC-100–AC-102 | `ui/kalip-tamiri-0115-uretim.test.jsx` |
| AC-44–AC-56, AC-92–AC-94 | `ui/kalip-tamiri-0115-pano.test.jsx` |
| AC-59–AC-64, AC-96, AC-98, AC-99, AC-100 | `kalip-tamiri-0115-cikti.test.js`, `kargo-etiketi.test.js`, `ceviri-kapsam.test.js` |
| AC-69–AC-71 | `server-authz.test.js` 0115 bloğu |
| AC-72, AC-77 | `ui/kalip-tamiri-0115-kiyas.test.jsx` |
| AC-73, AC-78 | 0106/0107/0108/0110 testleri dokunulmadan + `kalip-tamiri-0115.test.js` |

## 5. Ters çevrilen kriterler

- 0015 AC-7: servis formu `{kutu: 2, liste: 6}` → `{kutu: 3, liste: 6}` ("spec 0115 ile").
- 0015 AC-9/AC-10: yeni kutunun etiketi kendi sabitiyle süzülür (0079/0095 deseni).
- `kargo-etiketi.test.js`: beş durum → altı; `SABIT_BASLIKLAR` aynı.
- `ceviri-kapsam.test.js`: yeni anahtar.

## 6. Triyaj düzeltmeleri

- Servis formunun geçici giriş anahtarı listedeki en büyük `y<n>`'den sonra başlar (taslaktan dönen formda çakışma); `ui/kalip-tamiri-0115-form` triyaj testi.
- Pano kurucusunda AC-24 ve AC-88 davranışla ölçülür (`ui/kalip-tamiri-0115-form`).
- "Kalıpları da bitti işaretle" başka servisin tamir satırına ve çöpteki forma dokunmaz (`ui/kalip-tamiri-0115-pano`).
- Makina Geçmişi'nde kalıpsız servis satırında Kargo Etiketi düğmesi yok (AC-58).
- Üretim formu çıktısı kullanıcı metinlerini kaçışlı basar (`uretim-form-print`).
- Manuel Satır Ekle başka canlı formda satırı olan kalıbı pasif çizer (R40'ın "ikinci forma çekilemez" kuralı bu pencereye de; `ui/kalip-tamiri-0115-uretim`).

## 7. Sürüm notu

Kalıp tamiri: servis formunda "Kalıp atölyeye girecek" kutusu işaretlenince kalıplar Kalıp Üretim Formu'nda "Bekleyen Tamirleri Getir" ile Tamir satırı olarak çekilir; pano kalıbı atölyede olan servisi rozetle gösterir. İlk açılışta adında "KALIP" ve "REVİZE" geçen parçalar yeni "Kalıp Revize" tipine alınır (Ayarlar › Katalog › Parça Tipleri'nden düzeltilebilir). **Önce sunucu PC, sonra bütün istemciler güncellenmeli; güncelleme bitene kadar kutu kullanılmamalı** (güncellenmemiş bilgisayar servisi düzenlerse kalıp listesi silinir). Bu paragraf yayın notuna aynen geçer (Karar 58).
