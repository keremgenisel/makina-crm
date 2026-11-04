# 0131 uygulama planı — Tahsilat tarihi, işaretlendiği gündür

Spec: `specs/0131-tahsilat-tarihi-isaretlendigi-gun.md` (QA turu karar 1–16, plan turu Karar 17–26). Dal `feat/0131-tahsilat-gunu`,
taban `d63bd83f`. Yeni kalıcı alan, veri bölümü, izin, kilit alanı ve göç yok; alan üç tabloda 0044'ten beri var.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/satisTahsilat.js` | Tek yazım yeri: `tahsilatGunuDogrula`, `tahsilatGunuYaz`, `tahsilatGunuTemizle`, metin sabitleri. |
| `src/lib/yedekParcaSatis.js`, `src/lib/kalipSatisi.js` | Kurucular yazıcıdan geçer; `ucretsizUygula` temizleyiciyi çağırır; 0111 planı yazıcıyla. |
| `src/components/kasa/TahsilatHesap.jsx` | `TahsilatGunuAlani`; pencere günü sorar ve doğrular, `onKaydet(hesapId, gun)`, başlık "Tahsilat Bilgisi". |
| `ServiceForm.jsx`, `PartSaleForm.jsx`, `YedekParcaSatisForm.jsx` | Gün alanı (yetkiden bağımsız), Çek/Kart nedeni, kayıt engeli. |
| `customers/CustomerDetailModal.jsx`, `ServisPanosu.jsx`, `stock/YedekParcaSatisTab.jsx` | Anahtarlar ve kayıt yolları yazıcıdan; yerel gün. |
| `customers/detail/MachineTimeline.jsx` | Anahtarın yanında kayıtlı gün. |
| `Kasa.jsx` | İki listede satır içi gün girdisi; dar ölçütlü işaret. |
| `electron/serverAuth.cjs` | İzinli alanlar bölüme göre. |
| Testler | `tahsilat-gunu-0131`, `ui/tahsilat-gunu-0131`, `ui/tahsilat-gunu-0131-pano`, `tahsilat-gunu-0131-kiyas` + `fixtures/0131-once.json`, ek bloklar `server-authz`, `server-security.cjs`, `db-roundtrip.cjs`. |
| Kanıt, belge | Yeni ekranlar, taban/sonra, eşleme; `CLAUDE.md` 0044 bölümü. |

## 2. Adım sırası

1. Altın kıyas. 2. Kanıt tabanı. 3. Saf yazıcı. 4. Kitaplık kurucuları. 5. Gün alanı ve pencere. 6. Formlar. 7. Müşteri
detayı, pano, Stok, zaman çizelgesi. 8. Kasa. 9. Sunucu. 10. Testler, ters çevirmeler, mutasyonlar. 11. Kanıt. 12. Tam takım, lint, belgeler.

## 3. Riskler ve kararlar

Spec'te Karar 17–26.

## 4. Kriter ↔ test eşlemesi

Plan turundaki tablo (spec'in AC‑1…AC‑52'si); testler `AC-<n>:` adlarıyla.
