# 0091 Uygulama Planı: Üretimde olmayan modeller maliyet ekranında görünmez

| | |
|---|---|
| **Spec** | `specs/done/0091-uretimde-olmayan-modeller.md` (revizyon 3) · Tamamlandı: commit `297d7d7` |
| **Dal** | `feat/0091-uretimdeki-modeller` (taban `a272e5b`, 0090 kapanışı) |
| **Onay** | Takım Yöneticisi · 2026-10-17 · bütün öneriler (K1–K10) kabul |

## 1. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/makinaStandartMaliyet.js` | `gercekUretim` dördüncü argümanı `{ modelKirilimi, katalog }` → `modelAdetleri` (Türkçe küçültülmüş anahtar) ve `modelYokAdet` (R25, R25/3, R27); seçeneksiz çıktı aynı (C12). `modelMaliyetleri` üçüncü seçenek `{ uretimdeDisi, uretim }` → satır başına `uretimde`, `donemAdet`, `adetNeden`, `isaret` (R26); yeni `modelSayilari` (R26/2). |
| `src/lib/uretimdekiModeller.js` (yeni) | Alan adı sabiti, `uretimdeMi` (birebir, R24/3), `uretimIsaretiDegistir`, `uretimIsaretiTasi`, `uretimIsaretiDusur`; liste boşalınca `undefined` (R24/4). |
| `electron/db.cjs` | `app_settings.uretimdeOlmayanModeller TEXT`, dört nokta; boş liste `null`, okuma koşullu (R24/2). |
| `electron/serverAuth.cjs` | `AYAR_ALAN_SEKMELERI.uretimdeOlmayanModeller: ["settings"]` (C4). |
| `src/components/ModelsManager.jsx` | Dokuzuncu sütun "Üretimde", iki kutuya model adlı `aria-label`, ad taşıma ve silme zinciri yeni kütüphaneden (R1, R1/2, R4, R5). |
| `src/components/Settings.jsx` | Panel girişinin altında kapsam ipucusu (R28). |
| `src/components/maliyet/ModelMaliyetleri.jsx` | Sayı satırı, süzgeç, iki boş durum, "Dönemde üretilen" sütunu, işaretler, `colSpan` 9, R27/2 satırı (R7–R16, R31). |
| `src/components/MakinaMaliyeti.jsx` | `gercek` seçenekle; `modeller` memosuna işaret listesi ve `gercek`; `onAyarlar` silinir (R30). |
| `docs/tasarim-sozlugu.md` | İstisna listesine tek satır (C16). |
| `scripts/evidence/0009-sayfa.jsx` | Altı yeni ekran; işaret listesi alan düzenekler. |
| `scripts/tests/db-roundtrip.cjs` | AC-9, 9/2, 9/3 (0088 gövde denetimi dokunulmaz, C11). |
| `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md` | Kanıt kayıtları ve 0091 bölümü. |

**Testler:** yeni `tests/uretimdeki-modeller-0091.test.js` (motor, kütüphane, taramalar), `tests/ui/uretimdeki-modeller-0091.test.jsx`,
`tests/ui/uretimdeki-modeller-0091-app.test.jsx`, `tests/fixtures/0091-veri.js`; `server-authz` 0091 bloğu; yeniden yazılan
`ui/models-manager-analiz` (C10).

**Yeni veri bölümü, izin, birleştirme kuralı ve yedek paketi değişikliği yok.** Parti Hesabı dokunulmaz (R20, R29).

## 2. Adım sırası

0. Dal, spec revizyon 3, bu plan.
1. Saf katman (kütüphane, motor seçenekleri, `modelSayilari`) ve testleri; 0088 AC-15 ve AC-15/3 dokunulmadan yeşil.
2. Veri: `db.cjs`, `serverAuth`, gidiş dönüş, `server-authz`.
3. Katalog: `ModelsManager`, Settings ipucusu, `models-manager-analiz` yeniden yazımı.
4. Maliyet ekranı: `ModelMaliyetleri`, `MakinaMaliyeti`.
5. App testi, taramalar, sözlük satırı, mutasyon.
6. Görsel kanıt, kanıt eşlemesi, CLAUDE.md.
7. `npm test` (Electron dahil), lint; triyaj; kapanış.

## 3. Kararlar (spec revizyon 3)

| No | Karar |
|---|---|
| K1 | Son işaret kalkınca değer `undefined` (silinmez); birleştirme eski listeyi geri getirmez (R24/4) |
| K2 | `gercekUretim` seçeneğine `katalog` (R25/3) |
| K3 | `onAyarlar` silinir (R30) |
| K4 | Sayılar motorda `modelSayilari` (R26/2) |
| K5 | Metinler R31'deki sabitler |
| K6 | Çöpten geri alma kod istemez; gerçek Çöp Kutusu ile test |
| K7 | Seçiciler ve Analiz: tarama + davranış testi |
| K8 | Fark eden her kanıt ekranı ad ad gerekçelenir |
| K9 | AC-11 yalnız `server-authz` |
| K10 | Ortak fikstür `0091-veri.js` |

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, 1/2, 1/3, 2, 4–7, 12/2 | `ui/uretimdeki-modeller-0091` |
| AC-3, 9/3, 30/2 | `uretimdeki-modeller-0091` (kütüphane; 9/3 birleştirme iddiasıyla) |
| AC-8 | `ui/uretimdeki-modeller-0091` (gerçek `SettingsTrash`) |
| AC-9, 9/2, 9/3 | `db-roundtrip.cjs` (Electron) |
| AC-9/4 | `db-roundtrip.cjs`'in 0088 gövde denetimi + fikstür SHA'sı |
| AC-10, 10/2 | `uretimdeki-modeller-0091` + `ui/uretimdeki-modeller-0091-app` |
| AC-11, 11/2 | `server-authz` 0091 bloğu |
| AC-12 | `uretimdeki-modeller-0091` (tarama), `kilit-alanlari` |
| AC-13–22 | `ui/uretimdeki-modeller-0091` |
| AC-23–30, 38 | `uretimdeki-modeller-0091` (motor) + `ui/uretimdeki-modeller-0091` |
| AC-31 | `uretimdeki-modeller-0091` |
| AC-32, 43 | `ui/uretimdeki-modeller-0091` |
| AC-33–35 | `ui/uretimdeki-modeller-0091-app` + tarama |
| AC-36, 37 | `ui/uretimdeki-modeller-0091` + tarama |
| AC-39, 42, 44 | `uretimdeki-modeller-0091` (taramalar) |
| AC-40, 41 | `makina-standart-maliyet-0088` dokunulmadan + `uretimdeki-modeller-0091` |
| AC-45 | `ui/models-manager-analiz` + tarama |
| AC-46 | `yedek-paketleri-0086` dokunulmadan + `uretimdeki-modeller-0091` |

## 5. Ölçümler

- **Geriye dönük uyum (C12):** 0088'in AC-15 ve AC-15/3 tam eşitlik testleri dokunulmadan yeşil; seçeneksiz `gercekUretim` ve
  `modelMaliyetleri` çıktıları birebir eski (AC-40, AC-41). `0088-govde-once.json` yenilenmedi (SHA testte sabit, AC-9/4).
- **Plan dışı kırılan yerler:** `ui/makina-maliyeti-0088`'in üç hücre sırası (yeni sütun Model'in sağına girdi), "spec 0091 ile" notuyla
  kaydırıldı; `ui/models-manager-analiz` konumdan okuyordu (C10), erişilebilir adla yeniden yazıldı. `Btn` `aria-pressed` ve `testId`
  iletmiyordu, eklendi. R31'in sayı satırı "üretimde: m" biçimine alındı (iyelik eki sayıya göre değişir: "7'si", "3'ü", "6'sı").
- **Mutasyon ölçümü** (her biri en az bir testi kırdı): boş liste `undefined` yerine `[]` (kütüphane ve App testleri), ekran süzmesi
  kaldırılınca (beş test), motorda Türkçe küçültmeli işaret karşılaştırması (AC-30/2 motor yarısı; ilk ölçümde testler yeşil kaldı,
  iddia eklendi), yeniden adlandırma zinciri kaldırılınca (AC-6), App yükleme yolunda alan açıkça alınmayınca (triyaj bulgu 1).
- **Lint:** 0 hata, 66 uyarı.
- **Tam takım:** 357 dosya / 4.585 test yeşil (Electron dahil, `npm test` çıkış 0).
- **Görsel kanıt:** `0091-piksel-raporu.json`, 692 görüntü (346 ekran × 2 tema, taban `a272e5b`, beş parça), çizim hatası yok; yalnız
  beklenen on dört ekran değişti: `ayarlar-models`, `katalog-model`, `katalog-model-ekmaliyet` (dokuzuncu sütun), `maliyet-modeller`,
  `-dokum`, `maliyet-katsayi-formu`, `maliyet-bos-rol`, `maliyet-bos-ayar` (sayı satırı, süzgeç, "Dönemde üretilen" sütunu) ve altı yeni
  ekran. **Tarih kaynaklı fark ayıklandı:** taban 17 Ekim'de, bugünkü kod 18 Ekim'de çekildiği için altı ekranda (`stok-makina-parti`,
  `servis-formu-*` dört, `yedek-parca-formu-kargo`) 83–249 piksel fark çıktı; iki taraf aynı gün yeniden çekilince 0 oldu ve raporda
  aynı gün çekimleri kullanıldı. `uygulama-menu-kasali` 31/37 piksellik gürültü (0089/0090'da da), her tema 0 çıkan çekimiyle.
  Kanıt eşlemesine beş dosyada 19 `degisti` kaydı (onay `spec 0091`).

## 6. Sürüm notu

> Ayarlar › Katalog › Makina Modelleri'nde her modelin yanında yeni bir **"Üretimde"** kutusu var. Artık üretmediğiniz modelin
> kutusunu kaldırın: Makina Maliyeti › Model Maliyetleri varsayılan olarak yalnız üretimdeki modelleri gösterir, ötekiler "Üretimde
> olmayanları da göster" ile açılır. Model silinmez; teklifler, faturalar, makina kayıtları, model seçicileri, Analiz ve Parti Hesabı
> etkilenmez. Tabloda yeni "Dönemde üretilen" sütunu işaretin dönemle çeliştiğini söyler. Veritabanına yeni bir ayar alanı eklendi:
> önce sunucu PC, sonra istemciler güncellenmeli; güncellenmemiş bilgisayarda işaret kaydedilmez.

## 7. Triyaj (2026-10-18)

| No | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | Anahtarsız gövdeyle yenilenen öbür PC bayat listeyi tutuyor, sonraki kaydı işareti geri yazıyor (Ayarlar'sız kullanıcıda her kayıt 403) | `App.jsx` yükleme yolu alanı gövdeden açıkça alır (yoksa `undefined`) | `ui/uretimdeki-modeller-0091-app` (gerçek App, veri değişti itmesiyle yenileme; mutasyonla ölçüldü), `server-authz` bayat liste 403 senaryosu |
| 2 | Görsel kanıt, kanıt eşlemesi ve §5 yok; hiçbir test yakalamıyor | Kanıt alındı, eşleme ve §5 yazıldı; kanıt kaydı testi (0090 AC-57 emsali) | `uretimdeki-modeller-0091` görsel kanıt kaydı bloğu |
| 3 | "Üretimde" başlığı sola yaslı, kutusu ortada | Başlık hizası Analiz ile aynı koşulda | `ui/uretimdeki-modeller-0091` triyaj bulgu 3 |

Sonrası: 357 dosya / 4.585 test yeşil (Electron dahil), lint 0 hata (66 uyarı).
