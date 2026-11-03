# 0128 uygulama planı — Kilit tamamlama: liste silmeleri, panonun tek alan işlemleri, Extra Kalıp'ın tek kilit alanı

Spec: `specs/0128-kilit-tamamlama.md` (QA turu Karar 1–16, plan turu Karar 17–27, uygulama Karar 28–30, triyaj Karar 31). Dal `feat/0128-kilit`, taban `3b2c24c5`.
Kilit yumuşak korumadır ve sertleşmez: yeni kalıcı alan, veri bölümü, izin, sunucu ya da birleştirme kuralı yok.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kilitAlanlari.js` | Pencere listeleri (`customer`, `part_sale`, `yedek_parca`, `ayar`); gerekçeli kilitsiz beş dosya. |
| `src/lib/utils.js` | `grupKimlikleri(dizi, id)` (panodan taşındı). |
| `src/components/ServisPanosu.jsx` | Yerel `kilitReddet` kalkar, red `kilitRedMesaji(k, ad)`; on işleyici anlık denetimde. |
| `Customers.jsx`, `SimpleDealers.jsx`, `Notes.jsx`, `Documents.jsx`, `stock/MakinaStokTab.jsx`, `stock/UretimFormu.jsx`, `stock/YedekParcaSatisTab.jsx` | Onay anında anlık denetim; kaskad çocukları; parti. |
| `customers/CustomerDetailModal.jsx` | Extra Kalıp formu `part_sale` kilidi + `LockConflict`; kayıt, ödendi, çek, durum, silme grup denetimi. |
| `src/App.jsx`, `src/components/Stock.jsx` | `aktifKullanici` zinciri (Bayiler, Evrak; üç Stok çocuğu). |
| Testler | Yeni `tests/ui/kilit-tamamlama-0128.test.jsx`, `tests/kilit-tamamlama-0128.test.js`; `tests/kilit-alanlari.test.js` (yazan dosya ölçütü, iki yönlü kural). |
| Belge | `CLAUDE.md`, spec, bu plan; `specs/README.md` satırı kapanışta. Görsel kanıt yok. |

## 2. Adım sırası

1. Ölçümler (plan turunda yapıldı). 2. `kilitAlanlari`, `grupKimlikleri`. 3. Prop zinciri. 4. Liste silmeleri. 5. Pano.
6. Müşteri detayı. 7. Taramalar, UI testleri, mutasyonlar. 8. Tam `npm test` (kilit sahteleyen eski testler incelenir), lint, belgeler.

## 3. Riskler ve kararlar

Spec'te Karar 17–27: onuncu işleyici; pencere listesinin üç eksiği; Extra Kalıp'ın grup kilidi; tek grup yardımcısı; onay anı;
red metninin adı; ölçüm 8'in yolu; yorumsuz tarama; AC‑24 mutasyonu; eski testlerin incelenmesi; denetimli seçici.

## 4. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC‑1, AC‑2, AC‑20 | `ui/kilit-tamamlama-0128`: gerçek `Customers`, kaskad çocukları; tarama |
| AC‑3, AC‑4, AC‑5 | Yedi ekran ret/izin; parti; `acquire` çağrılmaz |
| AC‑6, AC‑7, AC‑8, AC‑9, AC‑18, AC‑21 | Gerçek `ServisPanosu`: on işleyici tablosu, iz yok, parti, müşterisiz kart |
| AC‑10 | `ServisPencere` köprüsü: ret durumunda `mutate` yok |
| AC‑11, AC‑12, AC‑13, AC‑22, AC‑27 | Müşteri detayı: kilitler, grup denetimleri, kayıt anı |
| AC‑14, AC‑15, AC‑23, AC‑24 | `kilit-alanlari`: listeler, yazan dosya ölçütü, iki yönlü kural, mutasyon |
| AC‑16 | Köprü yok / liste boş / `list` reddediyor |
| AC‑17, AC‑19, AC‑26 | `kilit-tamamlama-0128` taramaları |
| AC‑25 | Kendi kilidiyle beş ekranda işlem geçer |
