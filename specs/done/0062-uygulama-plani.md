# 0062 Uygulama Planı: Giderler ve Kasa Listelerinde Sayfalama

| | |
|---|---|
| **Bağlı spec** | `specs/done/0062-gider-kasa-sayfalama.md` (R2, plan onayıyla) |
| **Dal** | `feat/0062-sayfalama` (`feat/0061-acik-kalemler` kapanışından sonra) |
| **Onay** | Takım Yöneticisi, 2026-10-02: bütün öneriler (Q1–Q10) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- `Pagination` (`ui.jsx`) `pages <= 1` iken `null` döner (R15); "‹ Önceki" / "Sonraki ›" `setPage(p => …)` ile çalışır.
- `usePagination` sayfayı kırpar ama ham sayıyı saklar; liste küçülünce "‹ Önceki" ham sayıdan geri gider (R27).
- Toplu "kapsam dışı bırak" düğmesi zaten listenin tamamını alıyor (`Kasa.jsx` `odemeSatirlari`); değişen yalnız metin.
- `KalemListesi`'nin süzmesi kendi `filtre` durumunda; dönem Giderler'de. Liste her dönemde aynı örnek kaldığı için dönem
  bir anahtar olarak geçirilir.
- Tedarikçiler'de arama yok (R26).
- `giderRaporu.js`, `raporSunumu.js` ve `SettingsExport.jsx` bugün `page` / `paged` okumuyor.

## 2. Dosyalar

- `src/hooks/usePagination.js` (R27).
- `src/components/Kasa.jsx` (hareketler ters ve sayfalı, iki hesapsız liste, kapsam dışı listesi, "Listedeki" metni).
- `src/components/cek/CekPortfoyu.jsx` (iki ayrı sayfa durumu).
- `src/components/gider/DonemRaporu.jsx` (`KalemListesi` satır kümesi, `donemAnahtari`), `src/components/Giderler.jsx`.
- `src/components/gider/MakinaKarliligi.jsx`, `MakinaModelGorunumu.jsx`, `Tedarikciler.jsx`, `AcikKalemler.jsx`,
  `EkstrePenceresi.jsx`, `OdemeHatirlatma.jsx`.
- Testler: `tests/sayfalama-0062.test.js` (kanca + kaynak taramaları), `tests/ui/sayfalama-0062.test.jsx`; satır
  sırasına/sayısına bağlı eski testler notla güncellenir.
- Görüntü aracı `G0062` ekranları (dolu liste + "Sonraki ›" ile sayfa 2), `docs/tasarim-sozlugu.md`, `CLAUDE.md`.

Sunucu, izin, veritabanı, birleştirme ve motorlar değişmez (C4, C5).

## 3. Liste → kanca → boyut → sıfırlama (R11, R26, AC-26, AC-39)

| Liste | Kanca | Boyut | Sayfa 1'e dönme |
|---|---|---|---|
| Kasa › hesap hareketleri (en yeni üstte) | usePagination | 10 | hesap seçimi |
| Kasa › hesapsız ödemeler | usePagination | 10 | "Hepsini göster" |
| Kasa › hesapsız tahsilatlar | usePagination | 10 | "Hepsini göster" |
| Kasa › kapsam dışı bırakılanlar (R29) | usePagination | 10 | yok |
| Çek portföyü › alınan | usePagination | 10 | sekme, durum ve tür süzgeci |
| Çek portföyü › verilen | usePagination | 10 | sekme, süzgeç |
| Gider Kalemleri (satır kümesi) | usePagination (R26) | 10 | dönem, tür, tedarikçi, ödeme, arama |
| Makina Kârlılığı | usePagination | 10 | dönem |
| Makina ve Model | usePagination | 10 | dönem |
| Tedarikçiler | usePagination (R26) | 10 | yok |
| Açık kalemler (satır kümesi) | usePagination | 10 | kova |
| Ekstre penceresi | usePagination | 5 | tarih aralığı |
| Hatırlatma › vadesi geçmiş | usePagination | 5 | yok (her açılışta 1. sayfa) |
| Hatırlatma › yaklaşan | usePagination | 5 | yok |

15 hiçbir yerde kullanılmaz.

## 4. Kararlar

Q1 → R26 (a) · Q2 → R26 (b) · Q3 → R27 · Q4 → R28 (aç/kapa anahtarları sayfayı korur, uygulamada netleşti) · Q5 → R29 · Q6 → R30 · Q7 → R31 · Q8 → R32 · Q9 → R33 · Q10 → R34.

## 5. Adım sırası

1. Kanca ve saf testleri. 2. Saf listeler (kârlılık, makina ve model, tedarikçiler, ekstre, hatırlatma, çek portföyü,
açık kalemler). 3. Kasa. 4. Gider Kalemleri. 5. Eski testlerin güncellenmesi, yeni testler, tam test ve lint.
6. Kanıt (iki tur), TY onayı, CLAUDE.md, tasarım sözlüğü.

## 6. Kriter ↔ test eşlemesi

`S` = `tests/sayfalama-0062.test.js`, `U` = `tests/ui/sayfalama-0062.test.jsx`.

| AC | Test |
|---|---|
| AC-1…AC-11 | U: her liste 11+ (pencerede 6+) satırla; "Sonraki ›" ile 2. sayfa satırları |
| AC-12, AC-26, AC-39 | S: kaynak taraması (elle dilimleme yok, kancalar ve `Pagination` tablodaki dosyalarda) |
| AC-13 | S: boyut taraması (tam sayfa 10, pencere 5) |
| AC-14, AC-27…AC-29, AC-41 | U: 2. sayfadayken hesap / dönem / süzgeç / kova / sekme değişir, sayfa 1 |
| AC-15 | U: boş listede çubuk yok, bugünkü boş durum metni |
| AC-16, AC-36 | U: 10 satırda çubuk yok; S: ekranlarda ek `pages <= 1` koşulu yok |
| AC-17, AC-32 | U: alt toplam sayfa 1/2 ve personel açık/kapalı aynı |
| AC-18 | U: kova, tür, tedarikçi kartları sayfadan bağımsız |
| AC-19, AC-33 | U: hesap özeti, ekstre son bakiyesi ve devri 2. sayfada aynı |
| AC-20 | U: sayfa 2'de toplu düğme listenin tamamına; "Listedeki" metni; hesap seçici sayfa 2'de çalışır |
| AC-21, AC-45 | U: ters sırada 2. sayfanın ilk bakiyesi motorun ilgili satırı |
| AC-22 | U: en yeni hareket başta, açılış yalnız özette |
| AC-23 | U: ekstre artan tarih |
| AC-24, AC-25 | S: `giderRaporu.js` / `raporSunumu.js` / `SettingsExport.jsx` `page`/`paged` taraması; çok kalemli rapor tam |
| AC-30, AC-40 | S: kanca kırpma, anahtar sıfırlama, "‹ Önceki" kırpılmış sayfadan; U: kapsam dışı sonrası boş sayfa yok |
| AC-31, AC-44 | U: personel kapalıyken başlık sayısı ile satır sayısı farklı, sayfalama satır kümesine göre |
| AC-34 | U: iki hesapsız liste ayrı sayfa durumu |
| AC-35 | U: hesapsız liste sırası değişmedi |
| AC-37, AC-38 | `kanit-eslemesi.test.js`, `0062-piksel-raporu.json` `*-sayfa2` ekranları |
| AC-42 | U: kapsam dışı listesi sayfalı |
| AC-43 | U: devir satırı yalnız 1. sayfada |

## 7. Notlar

- Sürüm notu: Kasa'daki hareket listesi artık en yeni hareket üstte; dönemi baştan okumak için Ekstre kullanılır.
- Triyaj: kanca kırpılan sayfayı saklar (liste boşalıp yeniden dolunca ekran eski sayfaya atlamıyordu); görsel kanıt bulgusu triyajdan önce tamamlanmıştı (rapor ve 53 kayıt yerinde).
