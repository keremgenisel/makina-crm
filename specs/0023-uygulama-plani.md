# 0023 Uygulama Planı: Çalışan Ek Ödemeleri (Fazla Mesai, Prim, İkramiye)

| | |
|---|---|
| **Bağlı spec** | `specs/0023-calisan-mesaisi-ve-primi.md` (R2, plan onayıyla onaylandı) |
| **Durum** | Uygulandı, commit bekliyor. 2026-09-28: P1–P8 onaylandı; spec R2; görünüm TY onaylı. Dal `feat/0023-ek-odeme`. |
| **Önkoşul** | 0001 (gider, personel), 0020 (personel ataması, C9), 0021 (ödeme hedefleri), 0022 (dal tabanı) |

---

## 0. Kodda doğrulanan dayanaklar (2026-09-28)

| Konu | Bulgu |
|---|---|
| Tek toplam | `gider.js` `kalemKurus` personel dalı `resmi + elden`; ödenecek tutar, borç özeti, hatırlatıcı, 0021 ödeme hedefleri, 0020 model tabanı ve makina maliyeti kovaları hep ondan okur (C5). |
| Doğrulama | `giderKalemDogrula` personel dalı "Tutar sıfırdan büyük olmalı" şartını yalnız maaşa uyguluyor (spec `:317`, kodda `:318`). |
| Üretim | `tekrarlayanUret` personel kalemini çalışan tanımındaki maaşla kuruyor. |
| Rapor | `hesaplaGiderRaporu` tür kırılımında çalışan başına `resmi`, `elden`, `toplam`; `TurKirilimi` bu üç sütunu varsayılan kapalı ayrıntıda çiziyor. |
| DB | Alt satır deseni `gider_model_satirlari` (kimliksiz, kalemle silinip yazılır). |
| Gizlilik | `gider-gizlilik.test.js` yasaklı ad listesi; `ui/gider-gizlilik-cikti` gerçek çıktı taraması. |
| Adaş | `utils.mesaiDk`, `appSettings.calismaSaatleri` servis işçilik süresi (spec 0021 öncesi, `tests/mesai.test.js`). |

## 1. Kararlar

| No | Karar |
|---|---|
| P1 | `ekOdemeler: [{tur, aciklama, resmiTutar, eldenTutar}]`; tür kodları `fazlaCalisma`/`prim`/`ikramiye`; tablo `gider_ek_odemeleri`. |
| P2 | Personel ayrıntısı: Resmi (maaş), Elden (maaş), Ek ödeme, Toplam; satırlar çalışanın altında. |
| P3 | Tamamen boş = iki tutar ve açıklama boş; açıklamalı sıfır satır hata. |
| P4 | Genel toplam sıfırsa hata maaşın resmi alanında, bugünkü metinle. |
| P5 | AC-18 taraması tanımlayıcılar üzerinde; `mesai.test.js` değişmez. |
| P6 | 0021 taksitleriyle etkileşim yalnız testle (kod yok). |
| P7 | Kalem listesindeki personel satırı ek ödeme tutarını yazar. |
| P8 | Kırılan mevcut test tek tek onaya gelir. |

## 2. Adım sırası

1. Koruma testleri (AC-5, AC-14, AC-12 kaynak taraması).
2. Motor `gider.js`.
3. DB `gider_ek_odemeleri`.
4. Arayüz: `GiderForm`, `DonemRaporu` (`TurKirilimi`, `KalemListesi`).
5. Tam koşu, lint.
6. Görsel kanıt, TY onayı.
7. Belgeler (`CLAUDE.md` iki anlamlı `mesai`; `specs/done/0001` notu).

## 3. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-3, AC-6 | `gider-ek-odeme.test.js` + `ui/gider-ek-odeme` |
| AC-4, AC-17 | `gider-ek-odeme.test.js` + `ui/gider-ek-odeme` |
| AC-5, AC-7, AC-8, AC-9, AC-10 | `gider-ek-odeme.test.js` |
| AC-11, AC-19 | `ui/gider-ek-odeme` |
| AC-12 | `gider-gizlilik.test.js` + `ui/gider-gizlilik-cikti` |
| AC-13 | `db-roundtrip.cjs` + `db-clean-install.cjs` |
| AC-14, AC-18 | `gider-ek-odeme.test.js` + mevcut `mesai.test.js` |
| AC-15, AC-16 | `gider-ek-odeme.test.js` + `ui/gider-ek-odeme` |
| AC-20 | `gider-ek-odeme.test.js` |
| C7 | `merge.test.js` |

## 4. Uygulama notları (2026-09-28)

- **Motor:** `gider.js` `EK_ODEME_TURLERI`, `maasKurus`, `ekOdemeKurus`; `kalemKurus` personel dalı ek ödemeleri içerir (tek toplam); `giderKalemDogrula` satır doğrulaması ve genel toplam şartı; `tekrarlayanUret` `ekOdemeler: []`; tür kırılımında çalışan başına `ek` ve `ekSatirlari`. 0021 plan önizlemesi de ek ödemeli toplamı görür.
- **P8:** mevcut testlerin hiçbiri kırılmadı; istisna gerekmedi.
- **Kanıt:** 242 çekim; değişen yalnız personel formları ve iki yeni personel ayrıntısı ekranı (`0023-piksel-raporu.json`, 10 JPEG).
- **Belgeler:** `CLAUDE.md` 0023 bölümü (iki anlamlı `mesai`); `specs/done/0001` R5'e tarihli not (analistin commit edilmemiş değişikliğinden ayrı bölüm); sözlük satır numarası (`DonemRaporu.jsx:68`); `tests/spec-atiflari.test.js` `TASINACAK`'a 0023 dosyaları.
