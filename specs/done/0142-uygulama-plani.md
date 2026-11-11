# 0142 Uygulama planı: sipariş belgesi parça odaklı olur, stok ve para kalkar

| | |
|---|---|
| **Spec** | `specs/0142-siparis-listesi-sutunlari.md` (revizyon 3) |
| **Onay** | Takım Yöneticisi, 2026-11-11 (on öneri onaylandı, spec'e işlendi) |
| **Dal** | `feat/0142-siparis-sutunlari` (`de0087dc` üstünde) |
| **Durum** | Tamamlandı: commit `7096acf4`. Triyaj (2026-11-11): bulgu 1 `belgeYeriMetni` ibaresi, bulgu 2 belge bölümüne göre hata kilidi (`hataSayisi`). |

## 1. Dosyalar

- **`src/lib/siparisIhtiyaci.js`:** `olcuMetni(bicim, olculer, adet)` (`kesitMetni`'yi çağırır, sonuna boyu ve
  "· parça başına n" ekini koyar; C3, D-R1/2, B-R5/3), `OLCU_GIRILMEMIS`, parça satırlarına `olculer` (parçanın malzeme
  kalemlerinden, C4), `tedarikciBolumleri` içinde opt-in `belge` (B-R1/2–B-R1/6, B-R6/2, B-R6/3, B-R7/2). Bugünkü alanlar
  ve pencerenin bölümlemesi değişmez (C2, C-R3).
- **`src/lib/siparisRaporu.js`:** baştan yazılır; tek parça tablosu, malzeme satırı, toplam tablosu, kesit kapalı uyarısı;
  para iskeleti kalkar (A-R6/2). `OLCU_BASLIGI` tek sabit (B-R5/2).
- **`src/components/stock/SiparisPenceresi.jsx`:** `giderYetki` ve bütün para hücreleri kalkar (C-R1, E-R2/2, E-R2/3);
  tedarikçi tablosu "Parça" ve Ölçü sütunu (C-R5), Parça ihtiyacı tablosuna Ölçü (C-R4).
- **Zincir:** `rapor/SiparisRaporuDugmesi.jsx` (`paraGoster`), `stock/PartStokTab.jsx`, `Stock.jsx` satır 80,
  `PartManager.jsx` satır 812 (E-R3).
- **Testler:** `tests/fixtures/0142-veri.js`, `tests/fixtures/0142-once.json` (spec öncesi koddan), `tests/siparis-0142.test.js`,
  `tests/siparis-raporu-0142.test.js`, `tests/siparis-0142-kiyas.test.js`, `tests/ui/siparis-0142.test.jsx`; "spec 0142 ile"
  güncellenen `siparis-raporu-0140`, `ui/siparis-0140`, `ui/siparis-0140-app`, `ui/siparis-0134`.
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` (`siparis-0142-*`, belge `iframe srcDoc` ile), `docs/evidence/0142-*`,
  `kanit-eslemesi.json`. **`CLAUDE.md`** 0140 bölümü ve yeni 0142 bölümü.

## 2. Adım sırası

1. Altın: `0142-veri.js` ile bugünkü motordan `0142-once.json` (sipariş adetleri, boy, kilolar, asgari farkı, düzenleme,
   para alanları); kıyas testi bugünkü kodla yeşil.
2. Motor ve testleri. 3. Belge ve düğme. 4. Pencere ve zincir. 5. Ters çevrilen 0140 testleri.
6. Kanıt (taban, rapor, eşleme). 7. `CLAUDE.md`, `npm test` (Electron dahil), `npm run lint`, mutasyonlar dosya kopyasıyla.

## 3. Kararlar (onaylı öneriler)

| No | Konu | Karar | Spec |
|---|---|---|---|
| 1 | AC-3 ile AC-48 çelişkisi | AC-3 parça tablosuna dar | A-R3/2 |
| 2 | Kalem adedi kayboluyor | "· parça başına n", aynı ölçüde adetler toplanır | B-R5/3, AC-55 |
| 3 | Yalnız toplamı kalan bölüm | Basılır | B-R1/4, AC-56 |
| 4 | Malzemesi çözülemeyen kalem | Yerleştirmez; Ana tedarikçiye düşer | B-R1/5, AC-57 |
| 5 | İki firmalı parçanın adedi | Her bölümde tam adet | B-R1/6, AC-58 |
| 6 | Para kalıntı metinleri | Çizilmez, sayaç metni kısalır | E-R2/3, AC-60 |
| 7 | Sıra anahtarı | Malzeme adı, kesit, parça adı; hazır kit sırası | B-R6/3, AC-59 |
| 8 | AC-40 | Kod değişmez, test yazılır | B-R2/2 |
| 9 | Kıyas ayıklaması | Yalnız `olculer` ve `belge` silinir | C6 |
| 10 | Belgenin kanıtı | `iframe srcDoc` ekranı | DoD |

## 4. Kriter ↔ test

| AC | Test |
|---|---|
| 1–4, 6 | `siparis-raporu-0142` |
| 5 | `ui/siparis-0142` (printHtml casusu) |
| 7–15, 38, 39, 43, 48, 49, 51, 56, 58 | `siparis-raporu-0142` |
| 11, 34–37, 40, 46, 57, 59 | `siparis-0142` (motor) + `siparis-raporu-0142` |
| 16–22, 41, 42, 44, 55 | `siparis-0142` (`olcuMetni`, `olculer`) |
| 23, 25–30, 45, 60 | `ui/siparis-0142` |
| 24, 31, 47, 50, 52, 53, 54 | `siparis-0142` taramaları |
| 32, 33 | `siparis-0142-kiyas` |

## 5. Sürüm notu

Sipariş belgesi tedarikçiye verilecek kesim listesi oldu: parça, ölçü (çap ve boy) ve sipariş adedi; malzemeden kesilen
parça malzemeyi veren firmanın bölümünde. Stok ve para belgeden, para pencereden kalktı. Veri, izin ve sunucu değişmedi.
