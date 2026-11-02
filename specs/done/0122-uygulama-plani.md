# 0122 uygulama planı — Set içeriğinde bileşen parçası aramayla seçilir

Spec: `specs/done/0122-set-icerigi-parca-aramasi.md` (plan turu Karar 25–32). Dal `feat/0122-set-aramasi`, taban `43d04b9`.
Salt arayüz işi: hesap, veri şeması, izin, sunucu, birleştirme, yazdırma ve dışa aktarma dokunulmaz.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/urunAgaci.js` | `SET_BILESEN_ARA` sabiti ve `setBilesenAdaylari(parts, kendiId, satirlar)` (önce `setBileseniSecilebilirMi`, sonra satırdaki kimlikler çıkar, sıra korunur); `SET_PARCA_SEC` ve `SET_BILESEN_EKLE` silinir; `SET_AYNI_PARCA`, `SET_PARCA_SECILMEDI` kalır. |
| `src/components/PartManager.jsx` | Yalnız `SetIcerigiAlani`'nın seçici satırı: `secim`, `uyari`, `ekle` kalkar; sabit konumda tam genişlik `SearchPick` (`getLabel={p => p.ad}`, `getKey={p => p.id}`, `placeholder={SET_BILESEN_ARA}`, tıklama satırı adet "1" ile ekler). `Select` içe aktarımı kalır. |
| `tests/ui/set-icerigi-0121.test.jsx` | Yardımcılar tek tıklamaya, AC-1/54, AC-5/6 ve AC-54 taraması yeni okuma yoluna, AC-4 önlemeye ("spec 0122 ile"). |
| `tests/ui/set-aramasi-0122.test.jsx` | Yeni: saf yardımcı, gerçek Settings ekranı, kaynak taramaları. |
| `scripts/evidence/0009-sayfa.jsx` | `odak:` adımı ve `katalog-parca-0122-panel` ekranı; `ara:` değişmez. |
| `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0122-*` | Yeni kayıtlar eklenir (0121 kayıtları dokunulmaz). |
| `docs/tasarim-sozlugu.md` | Arama seçicisi kuralı (açılır liste alt bölümünde düz metin) ve erişilebilirlik borcu. |
| `CLAUDE.md`, spec | Belgeler. `specs/README.md`'ye dokunulmaz (C7). |

## 2. Adım sırası

1. Çalışma kopyası, kurulum, `ensure-native --denetle`.
2. R16 ölçümü yedekten (Karar 25).
3. Taban kanıtı: değişmemiş kodla on yedi ekran (Karar 29).
4. `urunAgaci.js`, 5. `PartManager.jsx`, 6. testler (mutasyonla ölçülür), 7. kanıt aracı + sonra çekimi + eşleme,
8. sözlük, CLAUDE.md, 9. tam `npm test` ve `npm run lint` (makina boşken).

## 3. Riskler ve kararlar

Plan turunda verilen sekiz karar spec'te (Karar 25–32): R16'nın ölçüm yolu ve yedekten ölçüm; AC-14/25'te "yedi" yerine "sekiz";
`ui.jsx`'in SHA ile sabitlenmemesi; AC-15'in ad taraması; değişen ekranların ölçülmesi; AC-32'nin mutasyonla ölçülmesi;
panel ekranının adım sırası; 0121 test dosyasının güncellenme usulü.

## 4. Kriter ↔ test eşlemesi

`0122` = `tests/ui/set-aramasi-0122.test.jsx`, `0121` = `tests/ui/set-icerigi-0121.test.jsx`.

| AC | Test |
|---|---|
| 1 | 0122 "AC-1"; 0121 "AC-1 / AC-54" |
| 2 | 0122 "AC-2"; 0121 "AC-2" |
| 3 | 0122 "AC-3" |
| 4 | 0121 "AC-2" (gövde birebir) + `tests/set-icerigi-0121.test.js` dokunulmadan (C1, C6) |
| 5 | 0121 "AC-5 / AC-6"; 0122 "AC-5" |
| 6 | 0122 "AC-6" |
| 7 | 0121 "AC-4" (spec 0122 ile önlemeye çevrildi); 0122 "AC-7" |
| 8 | 0121 "AC-3", "AC-7 / AC-8 / AC-40", "AC-40", "AC-41" |
| 9 | 0121 "AC-51 / C1"; `tests/kirilim-toplami-0099.test.js` |
| 10 | 0122 "AC-10" |
| 11 | 0121 "AC-1 / AC-54"; 0122 "AC-11" |
| 12, 22 | 0122 "AC-12 / AC-22" |
| 13 | 0122 "AC-13" |
| 14, 25 | 0122 "AC-14 / AC-25" + kapanışta `git diff` (Karar 27) |
| 15 | 0122 "AC-15" + kapanışta `git diff --stat` (Karar 28) |
| 16, 27 | 0122 "AC-16 / AC-27"; `tests/tasarim-kaynak.test.js` |
| 17 | 0122 "AC-17" |
| 18 | 0122 "AC-18"; kanıt `katalog-parca-0122-panel` |
| 19 | 0122 "AC-19" (saf + tarama) |
| 20 | 0122 "AC-20" |
| 21 | 0122 "AC-21" |
| 23 | 0122 "AC-23" |
| 24 | 0122 "AC-24" |
| 26 | 0122 "AC-26" |
| 28 | 0122 "AC-28" |
| 29 | `tests/kanit-eslemesi.test.js`, `tests/tasarim-kaynak.test.js`; §5 ölçüm tablosu |
| 30 | 0122 "AC-30"; çekim raporunda `adimUyarilari` yok |
| 31 | `tests/kirilim-toplami-0099.test.js`, `tests/hammadde-0096.test.js` dokunulmadan |
| 32 | 0122 "AC-32" (mutasyonla ölçüldü) |

## 5. Ölçümler

- **R16 (Karar 25):** tek yedek `altunmak-crm-yedek-2026-11-01.zip` (`veri.json`): 380 parça, 380 canlı, 1 kodlu, en uzun ad 139, içerikli parça 0; ilk altı ad uzunluğu 139, 94, 93, 92, 90, 90.
- **Kanıt (Karar 33):** taban (değişmemiş kod) ile sonra çekimi: on dört `katalog-parca*` ekranı değişti (4.245–274.963 piksel; seçici satırı 1-2 piksel kısa, düğme yok), dört `ayarlar-yedekparca*` 0 piksel, `katalog-parca-0122-panel` yeni; `adimUyarilari` yok. Rapor `docs/evidence/0122-piksel-raporu.json`; eşlemeye 15 `degisti` + 4 `ayni` kayıt eklendi, 0121/0099/0097 kayıtları dokunulmadı.
- **Mutasyonlar:** satır süzmesi kaldırılınca AC-4/5/6/19 kırıldı; `getKey` kaldırılınca AC-21 kırıldı; seçicinin kabı dala göre değişince AC-32 kırıldı. Seçicinin önüne `{kosul && <Ipucu />}` konunca hiçbir test kırılmadı, çünkü React `false` deliğinde konumu koruyor ve metin silinmiyor (Karar 34).
- **AC-14 (Karar 27):** `git diff --quiet origin/main -- src/components/ui.jsx` → değişmedi.
- **AC-15 (Karar 28):** değişen dosyalar `CLAUDE.md`, `docs/evidence/kanit-eslemesi.json` + `docs/evidence/0122-*`, `docs/tasarim-sozlugu.md`, `scripts/evidence/0009-sayfa.jsx`, `specs/README.md`, `specs/0122-*`, `src/components/PartManager.jsx`, `src/lib/urunAgaci.js`, `tests/ui/set-icerigi-0121.test.jsx`, `tests/ui/set-aramasi-0122.test.jsx`. Şema, izin, sunucu, birleştirme dosyası yok.
- **Takım:** `npm test` 453 dosya, 6217 test yeşil; `npm run lint` 0 hata. İlk koşuda iki test kırıldı ve düzeltildi: CLAUDE.md'deki "dokuz çağrı" ibaresi (0102 taraması bu sözü 0062 satırı için yasaklıyor) ve spec Durum satırındaki "Taslak" sözü ("Kökeni:" yapıldı).

## 6. Triyaj düzeltmeleri (2026-11-02)

1. AC-18 kabın kendisini tarar (düz `<div>`, `width`/`maxWidth`/`gridTemplateColumns`/`style` yok); `maxWidth: 240` bozması artık kırılıyor.
2. Fikstürde "Rulman" kod taşır; panel metni birebir ad, kodla arama boş; `getLabel={p => p.ad}` taraması. Etikete kod ekleme bozması on bir testi kırıyor.
3. Dala eklenen ikinci README satırı geri alındı; kapanışta analistin `specs/README.md` 0122 satırının durumu güncellenir (C7).
4. 0121 `bilesenSec` panelde olmayan parçada hata fırlatır; AC-4'ün ikinci çağrısı `toThrow` iddiasına çevrildi.
5. Taban raporu son kodla alındı (`0122-taban-piksel-raporu.json`, 38 görüntü, 0 fark; kapanışta `degisti` kayıtları buna yönlenir); AC-8, AC-9, AC-29, AC-31 için var olan testleri anan kapsam testi.
