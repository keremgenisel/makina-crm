# 0126 uygulama planı — Evrak kalem seçicileri aramayla, set satırı tanınır

Spec: `specs/0126-evrak-kalem-secicileri-arama.md` (QA turu Karar 1–16, plan turu Karar 17–28, uygulama Karar 29–31). Dal `feat/0126-evrak-secici`,
taban `45df963`. Salt arayüz işi: yeni kalıcı alan, veri bölümü, izin, sunucu ya da birleştirme kuralı yok.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/documents/KalemSecPenceresi.jsx` (yeni) | Tek seçim penceresi: `baslik`, `items`, `getLabel`, `getKey`, `placeholder`, `onPick(kayit)`, `onClose`. `Modal` footer'sız, `overflowVisible`, `maxWidth={600}`; gövdede tek öğe `SearchPick`; açılışta kutuya odak. |
| `src/components/Documents.jsx` | İki `<select>` yerine "Seç" düğmesi, seçili ad, "kaldır" düğmesi; `secim = { rowId, tur }`; kaydın dönüşümü çağıranda (`k.ad`, `String(p.id)`); parça hücresinde `SetIcerikSatiri`; formun `onClose`'u pencere açıkken çalışmaz. |
| `src/components/stock/SetRozeti.jsx` | Set etiket ekinin tek kaynağı (`setEtiketEki`). |
| Testler | Yeni `tests/ui/evrak-secici-0126.test.jsx`, `tests/evrak-secici-0126.test.js`, altın `tests/fixtures/0126-govde-once.json` (spec öncesi koddan, `YAZ_0126=1`); "spec 0126 ile" `tests/ui/documents-kalip-secici.test.jsx`; AC‑6 listesi `tests/urun-agaci-0087.test.js`. |
| Kanıt | `scripts/evidence/0009-sayfa.jsx`: `EvrakEkrani` isteğe bağlı `katalog` prop'u, yeni ekranlar; `docs/evidence/0126-*`, eşleme kayıtları. |
| Belge | `CLAUDE.md`, `docs/tasarim-sozlugu.md`, spec, bu plan; `specs/README.md` satırı kapanışta. |

## 2. Adım sırası

1. R11 ölçümü (yedekten, salt okunur). 2. Altın gövde fikstürü spec öncesi kodla. 3. Taban kanıtı. 4. `SetRozeti.jsx` eki.
5. Pencere bileşeni. 6. `Documents.jsx`. 7. Testler, ters çevirme, mutasyonlar. 8. Sonra çekimi, eşleme, taban raporu.
9. Belgeler, tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

Spec'te Karar 17–28: ters çevrilen kalıp seçici testi (uygulamada 0121 AC‑43 ve 0122 AC‑14/AC‑25 taramaları da, Karar 29–30; bağımsız tarih kırığı Karar 31); `urunAgaci` yasağı ve etiket ekinin yeri; iç içe pencerede Escape;
parça etiketinin emsali; pencere genişliği; QA'nın yanlış dizinde ölçmesi; yurt dışı fatura formu kapsam dışı; açılışta odak;
düğme yanındaki adın dili; kaldır düğmesi; makina satırının slotları; kanıt fikstürünün büyümesi.

## 4. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC‑1, AC‑2, AC‑3 | `ui/evrak-secici-0126`: açılır liste yok, "Seç" pencere açar, arama süzer, tıklama yazar ve kapatır; kalıpta başlık |
| AC‑4, AC‑20 | Aynı dosya: eski kalıp adı, katalogda olmayan parçanın alt kalem adı; kaldır düğmesi yalnız seçiliyken ve alt kalemi siler |
| AC‑5, AC‑21 | Aynı dosya: etikette `SET · n bileşen`, `set-rozeti` yok, kodla arama; `evrak-secici-0126` taraması `ui.jsx` SHA'sı ve `urunAgaci` yasağı |
| AC‑6 | Aynı dosya: içerik satırı hücrede, `tr` sayısı ve `rowSpan` aynı, bulunamayan bileşen ibaresi, set çöpteyse satır yok |
| AC‑7, AC‑13 | Aynı dosya: pencereyle kaydedilen gövde `0126-govde-once.json` ile birebir |
| AC‑8, AC‑9 | `evrak-secici-0126.test.js`: `buildPrintHtml` içerik basmaz; `teklifUretimPlani` / `evrakUygula` set satırından tek satış ve setin adedi |
| AC‑10, AC‑11, AC‑12 | Taramalar: tek pencere tanımı, iki çağrı, Documents'ta doğrudan `SearchPick` yok, `SetIcerikSatiri` içe alınır; dokunulmayan dosyalar SHA ile; Modal yapılandırması ve DOM yürüyüşüyle kırpma yokluğu |
| AC‑14 | UI: `id`'siz iki kalıpta anahtar uyarısı yok |
| AC‑15 | UI: kalıp rolü yerinde ve kaydediliyor; DOM sırası |
| AC‑16 | Kanıt raporu: altı ekran 0 piksel, yeni ekranlar kayıtlı |
| AC‑17 | Spec ölçüm 17 |
| AC‑18, AC‑19 | UI: Escape yalnız pencereyi kapatır; açılışta odak ve açık liste |
