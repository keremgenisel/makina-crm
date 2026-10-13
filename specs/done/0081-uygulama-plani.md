# 0081 Uygulama Planı: Dönem Raporu'nda stopaj kartı kalkar, yan kutular kapalı başlar

Spec: `specs/done/0081-donem-raporu-kutulari-kapali-baslar.md` (revizyon 2). Dal `feat/0081-kutular-kapali` (0080'in kapanışı
`f10ffb6` üstünde). Plan Takım Yöneticisi tarafından 2026-10-13'te onaylandı (bütün öneriler kabul).

## 1. Kodda bulunanlar (spec'e ek)

- Kutu içini okuyan test dosyası on: spec'in sekizi + `ui/sgk-turu-0074` (`:189`), `ui/calisan-sgk-0070` (`:116-121`); ikisi
  de Gider Türü Kırılımı'nın içindeki `personel-ayrinti`'yi okuyor.
- `stretch` iki açık kartı aynı boya uzatıyor; `flex-start` ile kısa olan kendi içeriği kadar kalır (AC-28 yeniden yazıldı).
- Beş kutuyu yalnız `Giderler.jsx` çiziyor; bileşeni tek başına çizen testler prop'suz kalır, varsayılan kapalı (katlanmaz).
- `Giderler.jsx`'te bir satır kalkıyor: sözlüğün `Giderler.jsx:281/308/342` atıfları yeniden eşlenir (`tasarim-kaynak`).

## 2. Dosyalar

**Kaynak:** `src/components/tasarim.jsx` (R14, iki başlık yolu), `src/components/gider/DonemRaporu.jsx` (dört bileşen
`katlanir`), `src/components/gider/KdvKarsilastirmaKarti.jsx` (iki dönüş; yalnız normal dalda katlanır), `src/components/Giderler.jsx`
(stopaj kartı, beş prop, `flex-start`). `Finance.jsx` değişmez.

**Testler:** yeni `tests/ui/kutuAc.js`; güncellenen on dosya (`ui/giderler`, `ui/hedef-adlari-0060`, `ui/gider-coklu-odeme`,
`ui/giderler-kdv-memo`, `ui/gider-ek-odeme`, `ui/kisitli-gider-0076`, `ui/satis-tevkifat-0079`, `ui/acik-kalemler`,
`ui/sgk-turu-0074`, `ui/calisan-sgk-0070`) + `ui/kutu-duzeni-0067`; yeni `tests/kutular-kapali-0081.test.js` (taramalar), yeni
`tests/ui/kutular-kapali-0081.test.jsx`; Electron `scripts/tests/donem-raporu-yerlesim.cjs` + `tests/donem-raporu-yerlesim.test.js`.

**Kanıt ve belgeler:** `scripts/evidence/0009-sayfa.jsx` (üç ekrana açma adımı, iki yeni ekran), `docs/evidence/kanit-eslemesi.json`,
`docs/evidence/0081-*`, `docs/tasarim-sozlugu.md`, `CLAUDE.md`.

## 3. Kararlar (TY onayı, 2026-10-13)

- **P1.** AC-28 ikinci yarı: hepsi açıkken kartlar kendi içeriği kadar, üstten hizalı; fark `degisti`.
- **P2.** On dosya; AC-30 onları kapsar.
- **P3.** `kutuAc` yardımcısı açıldığını `aria-expanded="true"` ile kanıtlar; AC-30 taraması on dosyanın onu kullandığını
  denetler; mutasyonla gösterilir.
- **P4.** Rol sorgusu çakışırsa test sorgusu daraltılır, bileşene kimlik eklenmez.
- **P5.** Ayarlar ve müşteri detayı ekranlarında 0 piksel beklenir.
- **P6.** AC-11: kaldır-yeniden çiz + App koşullu çizim taraması.
- **P7.** Değişen `giderler-*` ekranları dosya bazında `degisti` + onay.

## 4. Adım sırası

1. Spec revizyonu, plan; yazdırma altın testleri (`gider-kasa-raporu-0059`, `gider-kasa-raporu-0060`, `aylik-rapor`) önce yeşil.
2. `tasarim.jsx` R14 → Ayarlar ve müşteri detayı kartları, `liste-kaynak`, tam UI takımı.
3. Beş bileşene `katlanir`.
4. `Giderler.jsx`; kırılan on dosya `kutuAc` ile; yokluk iddiaları kutu açıkken.
5. Yeni 0081 testleri, mutasyon ölçümü.
6. Electron yerleşim ölçümleri.
7. Görsel kanıt, kanıt eşlemesi, sözlük, CLAUDE.md, `npm test` (Electron dahil), `npm run lint`.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, AC-2 | `ui/kutular-kapali-0081` |
| AC-3 | `ui/kisitli-gider-0076` (240 ₺) + 0081 atıf testi |
| AC-4 | `gider-kasa-raporu-0060`, `gider-kasa-raporu-0059` altın (dokunulmadan) + 0081 atıf testi |
| AC-5, AC-29, AC-30, AC-32 | `kutular-kapali-0081.test.js` taramaları |
| AC-6…AC-21, AC-24…AC-27, AC-31, AC-33 | `ui/kutular-kapali-0081` |
| AC-22, AC-23, AC-28 | `donem-raporu-yerlesim` (Electron) |

## 6. Sapmalar ve notlar

- **P2/P3 sapması (yedi dosya, on değil):** uygulamada kutu içini okuyan dosya yedi çıktı. `ui/hedef-adlari-0060` kalem
  listesini okuyor (`kalem-yontem-kirilimi`, `ek-odeme-tur-kirilimi`), `ui/giderler-kdv-memo` yalnız KDV kartının varlığına ve
  satış KDV motorunun çağrı sayısına bakıyor, `ui/acik-kalemler`'in `kova-karti`'ları Açık kalemler ekranının kendi yaş kovası
  düğmeleri. Üçü değişmeden yeşil; onlara gereksiz `kutuAc` eklenmedi, AC-30 taraması yedi dosyayı kapsar.
- **R14'te rol çakışması çıkmadı (P4):** tasarım sözlüğü değiştikten sonra bütün UI takımı dokunulmadan yeşildi.
- **Mutasyon ölçümü:** Finans'a `katlanir` → AC-13, AC-29; stopaj kartı geri → AC-1/2, AC-5; ayar başlığından R14 geri → R14 taraması,
  AC-19/20 ayar, AC-31; `stretch` geri → AC-28 (jsdom ve Electron); 0079 yokluk satırından açma adımı silindi → yalnız AC-30/C7
  taraması (0079 testi yeşil kalıyor, C7'nin tuzağı); KDV kartının "yapılamıyor" dalı katlanır → AC-27 (iki test), AC-29.
- **Tarama kendi yorumunu yakaladı:** `onAcikDegis` ve "Kesilen kira stopajı" yorumlarda geçince taramalar düştü; ölçüt prop kullanımı
  (`onAcikDegis=`) olarak daraltıldı, yorum yeniden yazıldı.
- **Dokunulan kaynak dosyalar:** `tasarim.jsx`, `gider/DonemRaporu.jsx`, `gider/KdvKarsilastirmaKarti.jsx`, `Giderler.jsx`.
