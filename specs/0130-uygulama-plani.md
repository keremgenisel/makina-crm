# 0130 uygulama planı — Hazırlanmış setin parçalanması

Spec: `specs/0130-setin-parcalanmasi.md` (plan turu Karar 1–11). Dal `feat/0130-set-parcalama`, taban `8d080b0`.
Yeni kalıcı alan, veri bölümü, izin, sunucu ya da birleştirme kuralı yok: parçalama yalnız stok hareketidir.

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/stokHareketi.js` | `IADE_TIPI.set_parcalama = "set_parcalama_iade"`, `IPTAL_TIPI.parcalama_girisi = "parcalama_girisi_iptal"`, dört okunur ad. Yeni hesap yok. |
| `src/lib/setUretimi.js` | Parçalama önizlemesi, planı, geri alma planı (log'dan; set tarafı `karsiHareketler`, bileşen tarafı `karsiGirisler` + `girisGeriAlinabilir`), "geri alındı mı" yüklemi (setin çıkış neti), metin sabitleri; `geriAlRedMetni` genişler (Karar 3). |
| `src/components/stock/SetParcalaPenceresi.jsx` | Yeni `wide` pencere, `useLock("partstock", set.id)`, motor sonucunu uygular. |
| `src/components/stock/PartStokTab.jsx` | "Seti Parçala" düğmesi (içerik var, stok > 0, `stock_parca_edit`) ve pencere. |
| `src/components/stock/StokHareketleriPenceresi.jsx` | Setin `set_parcalama` satırında "Geri Al" / "Geri alındı"; anlık kilit bakışı. |
| `src/lib/kilitAlanlari.js` | `partstock` pencere listesine yeni pencere. |
| `src/components/settings/SettingsAuditLog.jsx` | `set_parcalandi`, `set_parcalama_geri_alindi` etiketleri. |
| Testler | Yeni `tests/set-parcalama-0130.test.js`, `tests/ui/set-parcalama-0130.test.jsx`; "spec 0130 ile" güncellenen `tests/stok-hareketi.test.js`, `tests/set-icerigi-0121.test.js` (Karar 2). |
| Kanıt | `scripts/evidence/0009-sayfa.jsx` yeni ekranlar, `docs/evidence/0130-*`, eşleme kayıtları. |
| Belge | `CLAUDE.md` (0121 bölümü ve yeni madde), spec, bu plan, `specs/README.md`'de yalnız 0130 satırı. |

## 2. Adım sırası

1. Çalışma kopyası ve kurulum. 2. Taban kanıtı (Parça Stoğu ve hareket penceresi ekranları). 3. Haritalar, motor, motor testleri
(mutasyonla). 4. Pencere, düğme, Geri Al, kilit kaydı, etiketler, ekran testleri. 5. Üç ters çevrilen test. 6. Sonra çekimi, eşleme.
7. Belgeler, tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

Spec'te Karar 1–11: tip adları; ters çevrilen üç test; ret metni; geri almanın setin çıkış netine bağlanması; Geri Al'ın yeri;
kilit kapsamı; notlar; AC-32'nin altınsız kıyası; canlı veri (içerikli set yok); görsel kanıtın ölçülmesi; AC-31'in verisi.

## 4. Kriter ↔ test eşlemesi

`motor` = `tests/set-parcalama-0130.test.js`, `ekran` = `tests/ui/set-parcalama-0130.test.jsx`.

| AC | Test |
|---|---|
| 1, 2 | motor "AC-1", "AC-2"; ekran "AC-1 (ekran)" |
| 3, 4, 7, 8 | motor "AC-3", "AC-4", "AC-7", "AC-8" |
| 5, 6 | motor "AC-5", "AC-6" |
| 9 | motor "AC-9"; ekran "AC-9 (ekran)" |
| 10, 11 | motor "AC-10", "AC-11" + tarama |
| 12, 13, 14, 16 | motor "AC-12", "AC-13", "AC-14", "AC-16" |
| 15, 24 | ekran "AC-15", "AC-24" |
| 17, 18, 19 | ekran "AC-17", "AC-18", "AC-19" |
| 20, 21, 22 | ekran "AC-20", "AC-21", "AC-22" |
| 23 | ekran "AC-23" |
| 25, 26, 27 | ekran "AC-25", "AC-26"; motor "AC-27" + `tests/islem-gecmisi-etiketleri.test.js` |
| 28 | motor "AC-28"; ekran "AC-28 (ekran)" |
| 29 | `tests/set-icerigi-0121.test.js` AC-25 (spec 0130 ile); motor "AC-29" |
| 30 | motor "AC-30" |
| 31 | motor "AC-31" |
| 32 | motor "AC-32" (Karar 8) |
| DoD | `tests/kilit-alanlari.test.js`, `tests/islem-gecmisi-etiketleri.test.js`, `tests/stok-hareketi.test.js`; motor "C5" taraması |

## 5. Ölçümler

- **Mutasyonlar:** geri alma ölçütü bileşen girişine çevrilince AC-16 ve AC-24 kırıldı; stok sınırı kaldırılınca AC-3 (motor ve ekran); düğmenin stok kapısı kaldırılınca AC-17/18; kullanıcı notu bileşenlere yazılınca AC-9 (motor ve ekran); bileşen girişi düşüm haritasına konunca AC-27/28. Hepsi en az bir test kırdı.
- **Kanıt (Karar 13):** 10 var olan ekranın 3'ü değişti (setin satırına düğme girdi), 7'si 0 piksel; 4 yeni ekran; `adimUyarilari` yok. Rapor `docs/evidence/0130-piksel-raporu.json`; eşlemeye beş dosyada kayıt eklendi (0121 kayıtları dokunulmadı).
- **Ters çevrilen testler (Karar 2, 12):** `stok-hareketi` (`IADE_TIPI` listesi), `set-icerigi-0121` AC-25 (ret metni), `IPTAL_TIPI` birebir ve AC-45 (liste metni); dördü "spec 0130 ile" notlu.
- **C5:** yeni tip adları `merge.js`, `serverAuth.cjs`, `server.cjs`, `db.cjs`, `serverPermissionDefs.js`'te geçmez (motor testi).
- **Takım:** `npm test` 455 dosya, 6264 test yeşil; `npm run lint` 0 hata.

## 6. Triyaj düzeltmeleri (2026-11-02)

1. Geri almanın tarihi bugün (Karar 15): ekran testi parçalaması 25.10'da olan kaydı geri alıp iki karşı hareketin tarihinin bugün olduğunu iddia eder; `l.tarih` bozması kırılıyor.
2. Kilit cevabı gelmeden iki pencerenin kaydet düğmesi pasif: `crmLocks.acquire` hiç dönmeyen sözle; iki pencerede `disabled={lockLoading}` silinince test kırılıyor.
3. Bulgu metni kesik geldi; işlem yapılmadı.
4. `tests/merge.test.js`'e parçalamanın iki tipi için işlem kimliği çevrilmez, parça kimliği eşlenir testi.
5. Taban raporu son kodla alındı (`0130-taban-piksel-raporu.json`, 28 görüntü, 0 fark); README ve kanıt kayıtları kapanışta.
