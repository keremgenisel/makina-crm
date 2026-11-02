# 0124 uygulama planı — Parça şablonuna set içeriği sütunu

Spec: `specs/done/0124-excel-set-icerigi-sutunu.md` (plan turu Karar 18–25, uygulama Karar 26–30). Dal `feat/0124-excel-set`, taban
`8b29174`. Yeni kalıcı alan yok (`setIcerigi` 0121'de kurulu); izin, sunucu ve birleştirme değişmez.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/urunAgaci.js` | Biçim yazıcısı ve çözücüsü (`setIcerigiHucresi`, `setIcerigiHucresiParcala`, `setIcerigiParcasiCoz`), metinler (`SET_ICERIGI_BASLIGI`, `SET_ICERIGI_BICIMI`, `SET_ICERIGI_ORNEGI`, `SET_ICERIGI_YER_TUTUCU`, `SET_BILESEN_BULUNAMADI`, `setIcerigiExcelHatasi`, `icerikYazilacakMetni`, `icerikYazildiMetni`); `setIcerigiDogrula`'ya isteğe bağlı `harita` ve `setteGecen`. |
| `src/lib/parcaAktarma.js` | On birinci başlık ve örnek hücre, dışa aktarma hücresi, iki geçişli içe aktarma (kimlik ve ad haritası, yinelenen ad, iyimser tur ve kurtarma, "set mi" ölçütü, `icerikYazilanlar`). |
| `src/components/settings/SettingsImport.jsx` | Sütun kutusu başlık dizisinden, biçim satırı, önizleme ve bildirimde içeriği yazılan sayı. |
| `src/components/settings/SettingsExport.jsx` | Değişmedi (`parcaDisaAktarmaSatiri(p, katalog)` zaten). |
| Testler | `tests/excel-set-0124.test.js`, `tests/ui/excel-set-0124.test.jsx`; "spec 0124 ile" `parca-aktarma-0087`, `set-icerigi-0121-kiyas`, `hammadde-0096-kiyas`, `maliyet-gecmisi-0097-kiyas`, `set-silme-0123`. |
| Kanıt | `docs/evidence/0124-*`, eşleme kaydı (`SettingsImport.jsx` → `ayarlar-import`). |
| Belge | `CLAUDE.md`, spec, bu plan; `specs/README.md` satırı kapanışta. |

## 2. Adım sırası

1. Çalışma kopyası, kurulum, taban kanıtı. 2. `urunAgaci.js` biçimi ve doğrulamanın haritaları. 3. `parcaAktarma.js` iki geçiş.
4. Ters çevrilen testler. 5. `SettingsImport.jsx`. 6. Saf ve ekran testleri, mutasyonlar, süre ölçümü. 7. Sonra çekimi, eşleme, taban.
8. Belgeler, tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

Spec'te Karar 18–30: ölçülü adların çözümü (tamamı önce ad); iyimser tur ve kurtarma; değişmeyen içerik yazılmaz; parantezli yer
tutucu; ters yön canlı setler; süre tavanı; ters çevrilen sekiz iddia; yazıcının dizi indeksine karşı korunması; kanıt.

## 4. Kriter ↔ test eşlemesi

`saf` = `tests/excel-set-0124.test.js`, `ekran` = `tests/ui/excel-set-0124.test.jsx`.

| AC | Test |
|---|---|
| 1, 14 | saf "AC-1 / AC-14"; `parca-aktarma-0087` AC-29; üç kıyas testi (`slice(0, 10)`) |
| 2 | saf "AC-2" |
| 3 | saf "AC-3"; üç kıyas testi |
| 4 | saf "AC-4 (Karar 21)" |
| 5 | saf "AC-5 / Karar 20", "AC-5 (sınır)" |
| 6 | saf "AC-6 / Karar 18" |
| 7, 16 | saf "AC-7 / AC-16" |
| 8, 18 | saf "AC-8 / AC-18", "AC-8 (ters yön)", "Karar 19" (üç test) |
| 9 | saf "AC-9" |
| 10 | saf "AC-10 / R9/2" |
| 11, 20 | saf "AC-11 / AC-20"; ekran "AC-11 / AC-20 / C7", "AC-20" |
| 12 | saf "AC-12 / C1" |
| 13 | saf "AC-13" |
| 15 | saf "AC-15 (Karar 23)", "C6 (Karar 2)", "C6 (motor)" |
| 17 | saf "AC-17 (Karar 4)" |
| 19 | saf "AC-19 (Karar 9)" |
| 21 | ekran "AC-21"; saf "AC-21" |
| 22 | saf "AC-22" |
| C7 | saf "C7"; ekran "AC-11 / AC-20 / C7" (dosya `buildCSV` ile yazılır, ekranın okuyucusundan geçer) |

## 5. Ölçümler

- **Ölçülü adlar (Karar 18):** 01.11.2026 yedeğinde 18 canlı parça adı ölçüyle bitiyor; ad içinde `;` geçen parça yok.
- **Süre (Karar 29):** 400 parça, 1.000 içerikli satır: 8, 5, 5, 5, 4 ms; tavan 500 ms.
- **Mutasyonlar:** kurtarma adımı kaldırılınca dört test (saf ve ekran); tek tur (iyimser tur yakınsamadan) "ikinci tur" testi; "tamamı önce ad" kaldırılınca beş test; "set mi" yalnız kayıtlıdan okununca AC-10 ve AC-19; yinelenen ad kontrolü kaldırılınca AC-17. Değişmeyen içeriğin aday dışı tutulması kaldırılınca hiçbir test kırılmadı: kurtarma adımı sonucu aynı bulur, yalnız hızlandırmadır (Karar 26).
- **Kanıt (Karar 30):** `ayarlar-import` değişti, Dışa Aktar'ın iki ekranı 0 piksel; taban son kodla 6 görüntüde 0 fark.
- **Takım:** `npm test` 459 dosya, 6328 test yeşil; `npm run lint` 0 hata. İlk koşuda tek kırılan 0121 AC-38 taramasıydı (dokuzuncu ters çevirme, Karar 31).

## 6. Triyaj düzeltmeleri (2026-11-02)

1. Kurtarma artımlı (Karar 32): 2.000 reddedilen satır 371 → 10 ms, 10.000 satır 49 ms; karesel sürüm süre ve tarama testlerini kırıyor.
2. "Bulunamadı" bildirimi yazılan parçayı gösterir (Karar 33); bölünmüş sol tarafı yazan bozma dört testi kırıyor.
3. Setin maliyet uyarısı dosya sonrası bileşen maliyetleriyle (Karar 34); eski katalogla karşılaştıran bozma testi kırıyor.
4. Adında `;` olan parça C2'nin bilinen sınırı olarak yazıldı ve testle sabitlendi (Karar 35).
5. Taban raporu son kodla yenilendi (Karar 36); kanıt kaydı ve README kapanışta.
