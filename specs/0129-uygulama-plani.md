# 0129 uygulama planı — Ayrı pano penceresinde kayıt perdesi ve kayıt sonucu

Spec: `specs/0129-ayri-pencerede-kayit-perdesi.md` (QA turu Karar 1–16, plan turu Karar 17–23, uygulama Karar 24–27). Dal `feat/0129-pencere-perde`,
taban `61a7619a`. Yeni kalıcı alan, veri bölümü, izin, sunucu ya da birleştirme kuralı yok; kayıt yolu dokunulmaz.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `electron/ipc/servis-pencere.cjs` | Saf `servisKayitDeposu()` (`yaz` birleştirir, `oku`, `temizle`); `servis:kayitPush` (önbellek + `servis:kayit` iletimi), `servis:ilkKayitAl`; kayıt deposunun `temizle`'si dışa verilir. |
| `electron/main.cjs` | `servisWin.on("closed")` içinde `temizle()`; `hide()` yolu değişmez. |
| `electron/preload.cjs` | `appServisPano.kayitPush(yuk)`. |
| `electron/preload-servis.cjs` | `servisBridge.ilkKayitAl()`, `servisBridge.onKayit(cb)`. |
| `src/App.jsx` | Tek gönderici `pencereyeKayit(degisim)` (yalnız pencere açıkken); efekt (perde durumu, açılış) ve `bildir` (mesaj olayı, artan `no`). |
| `src/components/ServisPencere.jsx` | `ilkKayitAl` (perde durumu, mesaj `no` taban), `onKayit` (perde, yeni `no`'lu mesaj `showToast`'a); `<KayitPerdesi>` yalnız `hazir` iken; logo `?inline`. |
| Testler | `tests/servis-veri-deposu.test.js` ek blok; yeni `tests/ui/servis-pencere-perde-0129.test.jsx`. |
| Kanıt | `scripts/evidence/0009-sayfa.jsx` üç ekran (sahte köprü); `docs/evidence/0129-*`; eşleme kaydı yok (Karar 24). |
| Belge | `CLAUDE.md`, spec, bu plan; `specs/README.md` satırı kapanışta. |

## 2. Adım sırası

1. Ana süreç kanalı ve depo. 2. İki preload. 3. App göndericisi. 4. `ServisPencere`. 5. Testler, mutasyonlar.
6. Kanıt (taban, sonra, taban raporu). 7. Tam `npm test`, `npm run lint`, belgeler.

## 3. Riskler ve kararlar

Spec'te Karar 17–23: mesaj olay / durum efekt; çevrilmiş tür; açılış yarışı; deponun yeri ve temizlik; App tarafının
ölçüm düzeneği; kanıtın sahte köprüyle alınması; ana pencere ve kiosk değişmez.

## 4. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC‑1, AC‑4, AC‑5, AC‑20 | Gerçek App: uzun kayıtta `kayitPush` perde açık/kapalı; kaçış sonrası başarı mesajı; kayıt ana pencerede başlasa da |
| AC‑2, AC‑16 | Pencere: kanalı birebir çizer; tarama zamanlayıcı ve perde sabiti yok |
| AC‑3 | Pencere: perde açıkken tıklama ve klavye yutulur |
| AC‑6 | Gerçek App: açılış bastırması / çevrimdışı "kapalı"; tarama |
| AC‑7, AC‑8, AC‑19 | Pencere mesaj gösterimi; gerçek App `bildir` mesajları; tarama metin sabiti yok |
| AC‑9 | Pencere: görüntü gelmeden yalnız "Yükleniyor…" |
| AC‑10 | Gerçek App: pencere kapalıyken gönderim yok |
| AC‑11 | Köprüsüz pencere |
| AC‑12, AC‑14, AC‑21 | Taramalar |
| AC‑13 | 0077 testleri (tam takım) |
| AC‑15 | Depo/kanal testi + `main.cjs` taraması |
| AC‑17 | Karanlık tema |
| AC‑18 | Aynı metin iki kez (farklı `no`); `ilkKayitAl` mesajı gösterilmez |
| AC‑22 | Kanıt raporu ve eşleme |
