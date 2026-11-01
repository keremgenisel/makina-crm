# 0120 Uygulama planı: kalıp kutusu işaretliyken parça araması kalıp işiyle başlar

Spec: `specs/0120-parca-aramasi-kalip-isi-suzgeci.md`. Dal `feat/0120-parca-suzgeci`, taban `098fc88` (v3.52.0). Plan turu kararları spec'te Karar 29–40, uygulamada Karar 41.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kalipTamiri.js` | Metin bölümüne `TUM_PARCALAR`, `PARCA_SUZGEC_IBARESI`, `PARCA_SUZGEC_NEDENI`; dedektör bölümüne `parcaSuzgeci(parts, partTypeDefs, tumu)` → `{ liste, kalipSayisi, suzulebilir, suzuluMu }` (dizi olmayan ya da kalıp işi parçası olmayan girdide tam liste). |
| `src/components/ServiceForm.jsx` | Yalnız "Değişen Parçalar (varsa)": `tumParcalar` durumu, kutu kapanınca sıfırlayan tek `useEffect`, blok sarmalayıcıda `Segment`, `Ipucu` ibaresi ya da neden satırı, `SearchPick items={parcaKumesi.liste}`. |
| `tests/parca-suzgeci-0120.test.js` | Saf yardımcı, kaynak taramaları, sözlük, kanıt eşlemesi, kapanış bekçisi. |
| `tests/ui/parca-suzgeci-0120.test.jsx` | Form, müşteri detayının kayıt gövdesi, pano formu, ayrı pencere. |
| `scripts/evidence/0009-sayfa.jsx` | `servis0115(ek, tipler)`, `TIP_0120_ISARETSIZ`, üç ekran. |
| `docs/evidence/kanit-eslemesi.json`, `0120-piksel-raporu.json` + JPEG'ler | Dokuz `degisti` kaydı `ServiceForm.jsx` anahtarında. |
| `docs/tasarim-sozlugu.md` | "Bilinen borç"a form içi katalog daraltma maddesi (R15). |
| `CLAUDE.md` | 0115 bölümüne 0120 maddesi. |
| `specs/README.md` | Yalnız 0120 satırı. |

Dokunulmayan: `ui.jsx`, `KalipAtolyeAlani.jsx`, `ServisPencere.jsx`, `CustomerDetailModal.jsx`, `ServisPanosu.jsx`, `tasarim.jsx`, sunucu, veritabanı, birleştirme, izinler.

## 2. Adım sırası

1. Worktree ve Electron kurulumu; `ensure-native --denetle`.
2. Taban kanıtı bugünkü kodla (altı açık-kutu ekranı + dört `ServiceForm` ekranı).
3. Saf katman ve testi.
4. Ekran katmanı ve UI testi; iki mutasyonla ölçüm (efekt silinince AC-12/13, boşaltma koruması kalkınca AC-9/10/21/24 kırılır).
5. Taramalar, sözlük, kanıt (önce/sonra), eşleme.
6. Belgeler, lint, makina boştayken tam `npm test`.

## 3. Riskler ve kararlar

Spec'teki Karar 29–41. Özet: `SearchPick` yerinde kalır (29); `data-testid` sarmalayıcıda (30); kutu kararı ekranda (31); "hiç değişmedi" iddiası tarama + commit anında git farkı (33); taramalar içerikle (34, 35); iki metin (36); kanıt kayması ölçülür (38); içerik genişliği için blok sarmalayıcı (41).

## 4. Kriter ↔ test eşlemesi

S = `tests/parca-suzgeci-0120.test.js`, U = `tests/ui/parca-suzgeci-0120.test.jsx`.

| AC | Test |
|---|---|
| 1 | U "AC-1" |
| 2, 3 | U "AC-2, AC-3"; S "AC-2, AC-27" |
| 4, 23 | U "AC-4, AC-23" |
| 5, 6 | U "AC-5, AC-6"; S "AC-5" |
| 7 | U "AC-7" |
| 8 | U "AC-8" |
| 9, 10, 21 | U "AC-9 / AC-10 / AC-21 (null, undefined)"; S aynı dört hâl |
| 11 | U "AC-11" |
| 12, 13 | U "AC-12, AC-13" |
| 14 | U "AC-14" (gerçek `Customers` → `saveService` gövdesi) |
| 15 | U iki "AC-15" (pano formu, `ServisPencere`) |
| 16 | U "AC-16"; S "AC-16, AC-24" |
| 17 | `tests/ui/kalip-tamiri-0115-form.test.jsx` dokunulmadan yeşil |
| 18 | S "AC-18" (iki test) |
| 19 | S "AC-19" |
| 20 | S "AC-20" |
| 22 | U "AC-22" |
| 24 | U "AC-24"; S "AC-16, AC-24" |
| 25 | U "AC-25" |
| 26 | S "AC-26" |
| 27 | S "AC-27" |
| 28 | S "AC-28" + commit anında git farkı |
| 29 | S "AC-29, R16" + commit anında git farkı |
| 30 | S "AC-30"; `tests/kalip-tamiri-0115.test.js` AC-95 dokunulmadan yeşil |
| 31 | S "AC-31" |
| 32, 33 | S "AC-32, AC-33" + `tests/kanit-eslemesi.test.js` |

## 5. Kanıt ölçümü

Önce/sonra (bugünkü kod ↔ bu iş): `servis-formu`, `-odendi`, `-0079`, `-0115-kapali` 0 piksel. Kutu açık altı ekranın hepsi kaydı (parça alanı süzgeç ve ibareyle uzadı): `servis-formu-0115-acik` 142 bin, `-kayitli` 15 bin, `-bos-hata` 5 bin, `-ad-hata` 6 bin, `servis-formu-0117-sevk` ve `-fabrika` 6 bin piksel. Üç yeni ekran; çekimde adım uyarısı yok.

## 6. Sürüm notu

Servis formunda "Kalıp atölyeye girecek" işaretlenince parça araması yalnız kalıp işi tipli parçaları gösterir; "Tüm parçalar" düğmesi bütün kataloğu geri getirir. Kalıp işi işaretli parça tipi olmayan kurulumda liste süzülmez ve formda nasıl açılacağı yazar. Sunucu ve veri değişmediği için sıra şartı yok.
