# 0117 Uygulama planı: tamir edilen kalıbın sevki

Spec: `specs/0117-tamir-edilen-kalibin-sevki.md`. Dal `feat/0117-kalip-sevki` (`5aa988a` üstünde). Takım Yöneticisi planın on iki önerisinin hepsini onayladı (spec Karar 39–50); uygulamada iki karar daha verildi (Karar 51–52). Yeni izin, veri bölümü, sunucu kuralı ve birleştirme kuralı yok (C4).

## 1. Dosyalar

| Katman | Dosya | İş |
|---|---|---|
| Saf | `src/lib/kalipTamiri.js` | `SEVK_ALANLARI`, `tamirSevkKur`, `tamirYaz(kayit, liste, sevk)`, `sevkTarihi`, `sevkTeslimSekli`, `sevkFabrikaTeslimMi`; `SERVIS_KALIPLARI_ETIKETI`; `KAYIT_BOLUMU.sevk` |
| DB | `electron/db.cjs` | `SERVICES_KALIP_SEVK_COLUMNS` dört nokta, `kalipSevkYaz` / `kalipSevkOku` |
| Form | `src/components/KalipAtolyeAlani.jsx`, `ServiceForm.jsx` | `SevkBolumu`, `calisanlar` prop'u |
| Kurucular | `customers/CustomerDetailModal.jsx`, `ServisPanosu.jsx` | `tamirSevkKur` üçüncü argüman |
| Pano | `ServisPanosu.jsx` | "Etiket" düğmesi |
| Üretim formu | `stock/UretimFormu.jsx` | Düğme, yardımcı ve içe aktarma silindi |
| Çıktı | `src/lib/printTemplates.js`, `settings/SettingsTranslations.jsx` | Adaptör, iki varsayılan, görünen ad |
| Geçmiş | `customers/detail/MachineTimeline.jsx` | Sabitin yeni adı |
| Kanıt aracı | `scripts/evidence/0009-ekran.cjs`, `0009-sayfa.jsx` | Sayfa uyarıları rapora (`adimUyarilari`), `kaydirgenis:` adımı, dört adım düzeltmesi, iki yeni ekran (Karar 51) |
| Kanıt | `docs/evidence/0117-*`, `kanit-eslemesi.json` | `KalipAtolyeAlani`, `UretimFormu`, `MachineTimeline` anahtarlarına kayıt |
| Testler | yeni `kalip-sevki-0117.test.js`, `ui/kalip-sevki-0117.test.jsx`; güncellenen `kalip-tamiri-0115*`, `ceviri-kapsam`, `server-authz`, `db-roundtrip.cjs`, `db-clean-install.cjs` | §4, §5 |
| Belge | `CLAUDE.md`, `specs/README.md`, spec | 0115 bölümü, yeni 0117 bölümü (0116'nın önünde) |

## 2. Adım sırası

1. Çalışma kopyası ve Electron kurulumu.
2. Kanıt aracının adımları; eski kodla taban çekimi (27 ekran). Araç burada adım uyarılarını göstermeye başladı (Karar 51).
3. Saf katman, DB, adaptör ve çeviri, form ve kurucular, pano, üretim formu.
4. 0115 testlerinin ters çevrilmesi, 0117 testleri, sunucu bloğu, Electron veritabanı testleri.
5. Görsel kanıt (yeni kod ↔ eski kod, yeni kod ↔ yeni kod), eşleme kayıtları.
6. Belgeler; mutasyonla ölçüm; makina boşken tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

- **Ö1 → Karar 39:** sevk tarihi yalnız takvimde geçerliyse; bozuk değerde servis tarihi.
- **Ö2 → Karar 40:** `tamirSevkKur` + `tamirYaz`'ın her çağrıda silmesi.
- **Ö3 → Karar 41:** kırpma; boş gövdeye girmez.
- **Ö4 → Karar 42:** Fabrika Teslim seçiminde firma ve takip `""`, yazıcı ayrıca atar.
- **Ö5 → Karar 43:** "Yazdır" stili ve simgesi.
- **Ö6 → Karar 44:** CLAUDE.md'de 0116'nın önünde; bekçi dilimi `(spec 0116, plan`'da biter.
- **Ö7 → Karar 45, Ö8 → Karar 46:** yazıcı ve ad tuzağı taramaları.
- **Ö9 → Karar 47:** ölçülen değişen ekranlar: `servis-formu-0115-acik`, `-kayitli`, `-bos-hata`, `-ad-hata`, `uretim-formu-0115-tamir`, `musteri-detay-0115`, `servis-pano-0115-rozet`, `-onay`, `-kiosk`, `servis-formu-yazdir-0115`; yeni `servis-formu-0117-sevk`, `-fabrika`. `-kapali`, `uretim-formu-0115-bekleyen`, `-kopuk`, `-yazdir` ve öteki 13 ekran 0 piksel.
- **Ö10 → Karar 48, Ö11 → Karar 49, Ö12 → Karar 50.**
- **Uygulamada bulunan (Karar 51):** kanıt aracı sayfanın `console.warn` uyarılarını ana sürece aktarmıyordu, "bulunamayan adım yok" hiç ölçülemiyordu. Aktarım eklenince 0115'in üç ekranının adımının bulunamadığı çıktı; düzeltildi. 0116'nın iki adımı hedefini buluyor.
- **Uygulamada bulunan (Karar 52):** sevk satırında yalnız tarih alanı etiketli olduğu için ızgara firma ve takip kutularını uzatıyordu; iki alana da etiket verildi.
- **Uygulamada bulunan:** düğme kalkınca `UretimFormu.jsx`'in `tamirKaynagi` içe aktarması da ölü kaldı (lint uyarısı 62 → 63); silindi ve AC-51 taraması onu da yasaklar.
- **Mutasyonla ölçüm (yedekten geri koyma):** yazıcının kutu kapalıyken sevki yazması, `false` yazılması, tarih yedeğinin biçimlenmiş değerle seçilmesi, pano düğmesine durum kapısı, üretim formuna düğmenin geri konması, çıktı başlığının koda sabitlenmesi (sonuç §6).

## 4. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–AC-7, AC-45, AC-46, AC-53 | `ui/kalip-sevki-0117` "A: sevk bölümü" |
| AC-8–AC-12, AC-39, AC-54 | `ui/kalip-sevki-0117` "A: kurucular", `kalip-sevki-0117` "E", `db-roundtrip.cjs` |
| AC-13, AC-56 | `ui/kalip-tamiri-0115-kiyas` (beş adla genişledi) |
| AC-14, AC-51 | `ui/kalip-tamiri-0115-uretim` AC-40/97, `kalip-sevki-0117` AC-51 |
| AC-15–AC-18, AC-20, AC-40, AC-41, AC-55, R16 | `ui/kalip-sevki-0117` "B: panodaki etiket düğmesi" |
| AC-19 | `ui/kalip-tamiri-0115` AC-58, AC-65 |
| AC-21–AC-26, AC-49, AC-50 | `kalip-sevki-0117` "C" |
| AC-27–AC-29, AC-47 | `kalip-tamiri-0115-cikti` AC-59, AC-60 |
| AC-30–AC-32, AC-42, AC-43 | `kalip-sevki-0117` "D", `ceviri-kapsam`, `ui/kalip-tamiri-0115` AC-57, `ui/kalip-sevki-0117` "D" |
| AC-33–AC-35 | `ui/kalip-tamiri-0115-uretim`, 0106/0108/0110 testleri dokunulmadan |
| AC-36 | `server-authz` 0117 bloğu |
| AC-37 | Tam `npm test`, `npm run lint` |
| AC-38 | `kalip-sevki-0117` AC-38, AC-38 (plan Ö7) |
| AC-44 | `kalip-sevki-0117` AC-44 (iki test), `kanit-eslemesi`; çekim çıktılarında `adimUyarilari` yok |
| AC-48 | `kargo-etiketi` dokunulmadan yeşil |
| AC-52 | `kalip-sevki-0117` AC-52, `kalip-tamiri-0115` C6 |
| AC-57 | `kalip-sevki-0117` kapanış bekçisi |
| C1, C12 | `kalip-sevki-0117` ad tuzağı taraması, `ui/kalip-sevki-0117` AC-55 |

## 5. Ters çevrilen kriterler ("spec 0117 ile")

- 0115 AC-65: üretim formunu arayan ve panoyu yasaklayan iki satır yer değiştirdi.
- AC-40/AC-97: tamir satırında etiket düğmesi yok.
- AC-59, AC-60, AC-99, `ceviri-kapsam`'ın 0115 satırı: yeni başlık.
- AC-57: Makina Geçmişi başlığı.
- AC-96: başlık notu; sevk alanı olmayan serviste varsayılanlar aynı olduğu için iddia değişmedi.
- C6 taraması beş adla genişledi.

## 6. Sürüm notu

Kalıp tamiri: servis formunda "Kalıp atölyeye girecek" işaretliyken kalıbın dönüşü (Kargo ya da Fabrika Teslim, kargo firması, takip numarası, tarih, kargoyu veren kişi) girilebilir. Kargo etiketi düğmesi Kalıp Üretim Formu'ndan Servis ve Kargo Panosu'ndaki servis kartına taşındı; etiket teslim şeklini ve tarihi kayıttan basar. Servis Formu çıktısında liste başlığı "SERVİS GÖREN KALIPLAR" oldu (Ayarlar › Çeviriler'de bu başlığı değiştirmiş kullanıcının metni korunur). **Önce sunucu PC, sonra bütün istemciler güncellenmeli; güncelleme bitene kadar sevk alanları doldurulmamalı** (güncellenmemiş sunucu yeni sütunları bilmez ve değerleri düşürür). Güncellenmemiş istemci sevk bilgisini silmez: 0115'in yazıcısı kaydın öteki anahtarlarını aynen geri yazar ve düzenleme formu kayıttan açılır (triyaj).
