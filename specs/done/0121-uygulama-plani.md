# 0121 Uygulama planı: parçalardan set oluşturma ve set hazırlama

Spec: `specs/done/0121-parcadan-set-olusturma.md`. Taban: main `226b959`. Dal: `feat/0121-set-icerigi` (`../wt0121`).
Plan turu 2026-11-02; belirsizlik maddeleri (§3) Takım Yöneticisi tarafından olduğu gibi kabul edildi ve spec'e Karar 38–51 olarak işlendi.

## 1. Değişecek ve eklenecek dosyalar

**Motor (saf)**
- `src/lib/urunAgaci.js`: içerik doğrulayıcısı `setIcerigiDogrula` (adet, aynı parça, iç içe set iki yönlü, kendi kendine), `setKatalogu(parts)` (canlı parçalardan `Map`), maliyet zincirinin dört fonksiyonuna üçüncü parametre (`parcaMaliyetKurus`, `parcaMaliyetiVar`/`maliyetGirildiMi`, `parcaMaliyetMetni`, `maliyetKaynagi` üçüncü tür `{ tur: "icerik", n }`), `setOzeti` (maliyet, eksik, TL fiyat toplamı, fiyatsız satır), ad çözücü `setBilesenAdi` (ham diziden), maliyet geçmişinin tek kapısı (`maliyetGecmisiYaz` `set` bayrağı), metin sabitleri.
- `src/lib/stokHareketi.js`: `IADE_TIPI.set_uretimi`, `IPTAL_TIPI`, dört okunur ad, `netGirisler`, `karsiGirisler`, `girisGeriAlinabilir` (ya hep ya hiç yoklaması).
- Yeni `src/lib/setUretimi.js`: `setHazirlaPlani`, `setGeriAlPlani`, `setHareketleriniUygula`; tarih hata sabitleri.

**Veri ve birleştirme**
- `electron/db.cjs`: `parts.setIcerigi` JSON dört nokta (boş NULL, gövdede yok).
- `src/lib/merge.js`: `adds.parts[].setIcerigi[].partId` → `remapGevsek(maps.parts)`; `logBagHaritasi` dokunulmaz.

**Okuyucular**
- `src/lib/makinaStandartMaliyet.js`: `modelMaliyeti` `partMap`'i katalog olarak geçirir, satıra `setKesisimleri`.
- `src/lib/parcaAktarma.js`, `src/components/settings/SettingsExport.jsx`: dışa aktarmada katalog, içe aktarmada setin maliyet hücresi alınmaz (`SET_EXCEL_HATASI`), geçmiş kapısı.

**Ekranlar**
- `src/components/PartManager.jsx` (bölüm, `rawParts`, dokuz okuyucu katalogla, pasif alanlar, fiyat düğmesi), `src/components/Settings.jsx`, `src/App.jsx` (Stock'a `rawParts`), `src/components/Stock.jsx`.
- `src/components/stock/PartStokTab.jsx` (rozet, düğme, pencere), yeni `src/components/stock/SetHazirlaPenceresi.jsx` (`wide`, `partstock` kilidi), `src/components/stock/StokHareketleriPenceresi.jsx` (Geri Al, anlık kilit).
- `src/components/ServiceForm.jsx`, `src/components/YedekParcaSatisForm.jsx` (salt okunur içerik satırı).
- `src/components/maliyet/ModelMaliyetleri.jsx` (kesişim uyarısı).
- `src/components/settings/SettingsAuditLog.jsx` (iki etiket), `src/lib/kilitAlanlari.js` (iki pencere dosyası).

**Testler**
- Yeni: `tests/set-icerigi-0121.test.js`, `tests/set-icerigi-0121-kiyas.test.js` (altın `tests/fixtures/0121-once.json`), `tests/ui/set-icerigi-0121.test.jsx`, `tests/ui/set-uretimi-0121.test.jsx`.
- Ek: `merge`, `islem-gecmisi-etiketleri`, `kilit-alanlari`, `ui/form-pencere-boyutu`, `db-roundtrip.cjs`, `db-clean-install.cjs`.
- "Spec 0121 ile": `stok-hareketi` (AC-21, AC-20), `maliyet-gecmisi-0097-cagri` (casus `(...a)`).

**Kanıt ve belge**: `scripts/evidence/0009-sayfa.jsx` (içerikli fikstür, altı ekran), `docs/evidence/0121-*`, `kanit-eslemesi.json`, `CLAUDE.md`.

## 2. Adım sırası
1. Önce görüntüleri ve kıyas altını (spec öncesi kod).
2. Motor: `stokHareketi` → `urunAgaci` → `setUretimi` + motor testi; ters çevrilen üç test.
3. Veri (`db.cjs`) ve birleştirme.
4. Okuyucular (`makinaStandartMaliyet`, `parcaAktarma`, `SettingsExport`) + kıyas testi.
5. Parça kartı; stok tarafı; seçimden sonraki satırlar; Model Maliyetleri uyarısı.
6. Kanıt; `CLAUDE.md`; lint; makina boşken tam `npm test`.

## 3. Belirsizlikler ve kararlar (hepsi kabul edildi)
Spec Karar 38–51'e bakın: App'e `rawParts` (P1), uyarının ekranı (P2), `IADE_TIPI` tek anahtar + `IPTAL_TIPI` (P3), Geri Al anlık kilit (P4), set kartında pasif alanlar ve gizli geçmiş (P5), geçmiş kapısı `set` bayrağı (P6), Geri Al yalnız `set_girisi` satırında (P7), geri almanın yerel günü (P8), fiyat toplamı tamsayı (P9), formlarda canlı ad çözümü ve "listede olmayan parça" (P10), iki yönlü yasak canlı setlere (P11), R35 ölçümü yedeksiz yapılamaz (P12), 0099 sınırı yükseltilmez (P13), notun cümlesi (P14).

## 4. Kriter ↔ test eşlemesi

| Kriterler | Test |
|---|---|
| AC-2, 3, 4, 5, 6, 9, 10, 11, 12, 14, 35, 41, 42 | `set-icerigi-0121.test.js` (motor) |
| AC-13, 39 | `set-icerigi-0121.test.js` (iki yazma yolu) + `ui/set-icerigi-0121` |
| AC-19–25, 37, 47, 48, 49, 58, 60, 61 | `set-icerigi-0121.test.js` (setUretimi) + `ui/set-uretimi-0121` |
| AC-36, 54 | `set-icerigi-0121.test.js` taramaları |
| AC-14 (içeriksiz), AC-34 | `set-icerigi-0121-kiyas.test.js` |
| AC-1, 7, 8, 15, 16, 30, 38, 40, 51, 52 | `ui/set-icerigi-0121.test.jsx` |
| AC-17, 18, 26, 27, 44, 53, 55 | `ui/set-uretimi-0121.test.jsx`, `kilit-alanlari`, `ui/form-pencere-boyutu` |
| AC-28, 29, 43 | `ui/set-uretimi-0121.test.jsx` + `ui.jsx` taraması |
| AC-31, 56 | `islem-gecmisi-etiketleri` + `ui/set-uretimi-0121` |
| AC-32 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-33, 59 | `merge.test.js` 0121 bloğu |
| AC-46 | `set-icerigi-0121.test.js` (motor) + `ui/set-icerigi-0121` (ekran) |
| AC-45 | güncellenen `stok-hareketi`, `maliyet-gecmisi-0097-cagri` |
| AC-50 | `set-icerigi-0121.test.js` (parcaAktarma) |
| AC-57 | `kanit-eslemesi.test.js` + raporlar |

## 5. Sürüm notu
- Parça stoğu sayılmadan setin stoğu anlam taşımaz: bugün bileşen stokları sıfır olduğu için hazırlamada bileşen düşmez, yalnız setin stoğu artar.
- Mevcut on beş setin içeriği elle girilmelidir (göç yok).
- İçerik girilen set, kitinde bileşeniyle birlikte duruyorsa Model Maliyetleri uyarı verir; aynı parça iki kez sayılır, kit veri olarak düzeltilmelidir.
- Önce sunucu PC, sonra bütün istemciler: güncellenmemiş bilgisayar `setIcerigi` alanını tanımaz ve parçayı düzenlerse alanı korur (yayılım), ama sunucu güncellenmeden alan veritabanına yazılmaz.

## 6. Uygulama notları
Uygulamada verilen kararlar spec'te Karar 52–56'dır: ortak `stock/SetRozeti.jsx` (0087 AC-6), değişen kanıt ekranlarının tam listesi, dördüncü güncellenen test (`hammadde-0096` AC-32), `rawParts` boş dizi yedeği ve `aktifKullanici` iletimi, sözlük atıfları. Mutasyon ölçümü: maliyet geçmişi kapısı, iç içe okuma, Excel set hücresi, ya hep ya hiç geri alma ve iç içe kayıt doğrulaması ayrı ayrı bozulduğunda ilgili testler kırıldı.
