# 0083 Uygulama Planı: Giderler görünüm sırası ve Kasa'daki iki şeridin sayfa sonuna inmesi

Spec: `specs/0083-gider-gorunum-sirasi-ve-kasa-seritleri.md` (revizyon 3). Dal
`feat/0083-yerlesim` (0082'nin kapanışı `52df9a9` üstünde).

## 1. Kodda bulunanlar (spec'e ek)

- **Tasarım sözlüğünün satır atıfları güvende.** `docs/tasarim-sozlugu.md` yalnız
  `src/components/Giderler.jsx:282`, `:309`, `:343` atıflarını taşıyor; Giderler'de değişen tek
  satır `:37` ve satır sayısı değişmiyor, Kasa.jsx'in sözlükte atfı hiç yok. `tasarim-kaynak`
  testi dokunulmadan yeşil kalır. (Bu iki dosyada satır eklemek gerekirse sözlük atıfları
  yeniden eşlenir, 0081'in dersi.)
- **Görüntü aracı sekmeyi adıyla tıklıyor:** `"giderler-model"` → `["Makina ve Model"]`,
  `"giderler-tedarikciler"` → `["Tedarikler ve Ekstre"]`, `"giderler-karlilik"` →
  `["Makina Kârlılığı"]`. Adım listeleri **değişmez**, yalnız çekilen görüntüler değişir.
- **Kasa'nın üç `kaydir:` adımı** (`kasa-calisan-avanslari` → "Çalışan avansları",
  `kasa-hesapsiz-tahsilatlar` → "Hesap ata", `kasa-0058-listeler` → "Kapsam dışı bırakmak")
  blok alta inince de hedefini bulur; adımlar değişmez.
- **Taşıma hiçbir hook sırasını bozmaz:** bloğun okuduğu her şey `return`'den önce hesaplanıyor
  (`Kasa.jsx:188` `esik`, `:192` `hesapsizO`, `:195` `esikBilgisi`, `:197` `hesapsiz` /
  `hesapsizTahsilat` / `kapsamDisiO`) ve `usePagination` çağrıları da gövdede. Taşınan şey
  yalnız JSX.
- **Blok görünüm dalının içinde kalır:** `gorunum === "cek" ? (…) : (<> … </>)` üçlüsünün else
  kolu; `CalisanAvanslari` `:703`–`:704`, kolun kapanışı `:705`. Blok `:704` ile `:705` arasına
  gider, böylece Çek Portföyü'ne sızmaz (R10).
- **Kasa testlerinin tamamı `getByTestId` ile çalışıyor**, DOM sırası iddiası yok: yedi Kasa UI
  dosyası dokunulmaz (`ui/kasa`, `ui/kasa-avans`, `ui/kasa-0051`, `ui/kasa-deneme-donemi`,
  `ui/kasa-kapsam-disi`, `ui/kasa-app`, `ui/tahsilat-hesap`). Bunu uygulamadan sonra koşarak
  doğrula, önceden varsayma.

- **(Geliştirici ölçümü) AC-6 dosya düzeyinde kırılırdı:** beş etiketi birlikte taşıyan dosya üç tane: `Giderler.jsx`,
  `scripts/evidence/0009-sayfa.jsx` (sekmeleri adıyla tıklar) ve `tests/ui/standart-kalkar-0082.test.jsx`. Çözüm P5.
- **(Geliştirici ölçümü) Kimlikler:** AC-8…AC-14'ün on iki test kimliği mevcut (`hesap-listesi :637`, `bos-kasa :634`,
  `deneme-donemi :498`, `hesapsiz-notu :499`, `hesapsiz-esik-satiri :505`, `hesapsiz-sayilar :522`, `kapsam-disi-aciklama :541`,
  `hesapsiz-odemeler :544`, `hesapsiz-tahsilatlar :575`, `kapsam-disi-listesi :614`, `hesap-hareketleri :673`,
  `calisan-avanslari` `CalisanAvanslari.jsx:141`).

## 2. Dosyalar

**Kaynak (iki dosya):** `src/components/Giderler.jsx` (`GORUNUMLER` dizisinin sırası, `:37`),
`src/components/Kasa.jsx` (`:498`–`:631` bloğu `:704`'ten sonraya).

**Testler:** yeni `tests/yerlesim-0083.test.js` (kaynak taramaları: tek sıra dizisi AC-6 (P5),
değişmeyen katmanlar AC-20, `HESAPSIZ_NOTU` metni AC-18); yeni
`tests/ui/yerlesim-0083.test.jsx` (çubuk sırası ve Kasa'nın DOM sırası, AC-1…AC-5, AC-7…AC-17,
AC-19); güncellenen `tests/ui/standart-kalkar-0082.test.jsx` (AC-1 dizi, AC-2 "ikinci sekme",
yorumda "spec 0083 ile güncellendi").

**Kanıt ve belgeler:** `docs/evidence/0083-taban-piksel-raporu.json`,
`docs/evidence/0083-piksel-raporu.json`, `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md`
(Giderler bölümündeki görünüm sırası ve Kasa bölümünün yerleşim ibaresi), `specs/README.md`.

**Değişmeyecekler (tarama ile sabitlenir):** `src/lib/**`, `electron/**`, `src/lib/merge.js`,
`src/lib/printTemplates.js`, `src/lib/giderRaporu.js`, `scripts/evidence/0009-sayfa.jsx`'in adım
listeleri.

## 3. Kararlar (TY onayı, 2026-10-13)

- **P1.** Kasa'da blok sekiz parçasıyla **bütün** taşınır; `HESAPSIZ_NOTU` metni değişmez
  (spec B1/(a), R7, R8).
- **P2.** Deneme şeridi de alta iner; silme penceresine ya da hesap satırına yeni uyarı
  eklenmez (spec B2, C6).
- **P3.** Kullanıcı rehberi bu işte güncellenmez; 0080–0083'ü birlikte kapsayan ayrı iş olarak
  açık bulgular tablosunda bekler (spec B3, X7).
- **P5–P9** (revizyon 3): spec'in "Plan onayı kararları" bölümünde (AC-6 dizi düzeyinde, commit kümesi, bu plan dosyası, AC-7
  iddiaları, AC-21 kapsamı).
- **P4.** Bloğun iç sırası korunur: deneme şeridi → hesapsız notu → başlangıç tarihi satırı →
  sayı satırları → kapsam dışı açıklaması → üç liste. Yani bugün ekranın tepesinde hangi sırayla
  duruyorsa, sayfanın sonunda da o sırayla durur.

## 4. Adım sırası

1. **Taban kanıt:** değişecek ekran listesini çıkar (`giderler-*` 81 ekran + Kasa'nın Hesaplar
   ekranları, `kasa-cek-*` hariç) ve bugünkü kodla `0083-taban-piksel-raporu.json`'u çek; 0 fark
   olmalı. Tek çalıştırma 10 dakika sınırına takılırsa `EKRAN_PARCA="i/n"` ile parçalı çek ve
   parçaları birleştir (0080'in dersi: birleştirmede parça raporlarının üzerine yazma).
2. **Giderler:** `GORUNUMLER` sırası (R1) + `tests/ui/standart-kalkar-0082.test.jsx`'in iki
   kriteri yeni sırayla.
3. **Kasa:** bloğun taşınması (R6, R7, P4). Taşımadan sonra `git diff --stat` yalnız blok
   hareketini göstermeli; satır içi değişiklik varsa durup gerekçesini yaz.
4. **Yeni testler:** iki dosya (§2). DOM sırası `compareDocumentPosition` ya da gövdedeki
   `[data-testid]` dizilimi üzerinden ölçülür; yokluk iddiaları Çek Portföyü görünümünde.
5. **Bütün süit:** `npm test`, `npm run lint`, ardından Electron testleri
   (`VITEST_ELECTRON=only npm test`; 0067'nin dersi, atlamayın).
6. **İş kanıtı:** `0083-piksel-raporu.json` + `kanit-eslemesi.json` kayıtları
   `beklenen: "degisti"` ve onay satırı (`Takım Yöneticisi · 2026-10-13 · spec 0083 R1/R6`);
   değişmemesi gereken ekranların 0 piksel olduğunu raporda doğrula (C5, AC-21).
7. **Kapanış:** `CLAUDE.md`, `specs/README.md` (sıra cümlesi ve satır durumu), SCORECARD, spec ve
   planı `specs/done/`'a taşı.

## 5. Kriter ↔ test

| Kriter | Nerede |
|---|---|
| AC-1, AC-2, AC-3 | `ui/yerlesim-0083` (çubuk sırası, beş görünümün çizimi) + `ui/standart-kalkar-0082` (güncellenen iki kriter) |
| AC-4, AC-5 | `ui/yerlesim-0083` (dönem seçicisi, `baslangicGorunum`, bilinmeyen değer) |
| AC-6, AC-20 | `yerlesim-0083` (kaynak taraması) |
| AC-7 | `ui/yerlesim-0083` (çubuk kabının stili) |
| AC-8…AC-13, AC-15…AC-17, AC-19 | `ui/yerlesim-0083` (Kasa düzeneği: DOM sırası, boş durum, deneme kapalı, sayfalama, işlevler) |
| AC-14 | `ui/yerlesim-0083` (Çek Portföyü'nde yokluk) |
| AC-18 | `yerlesim-0083` (sabit metni) + `ui/tahsilat-hesap` (bugünkü iddia aynen) |
| AC-21 | `docs/evidence/0083-piksel-raporu.json` + `kanit-eslemesi.test.js` |
| AC-22 | `ui/standart-kalkar-0082` yorumu |

## 6. Sapmalar ve notlar

- Kanıt turu bu işin asıl maliyeti: kabaca 120 ekran × iki tema. Kod iki dosyada ve küçük.
- Sekme etiketleri değişmediği için çubuğun toplam genişliği aynı; yeni Electron yerleşim ölçümü
  açılmıyor. Dar pencerede hangi sekmenin alt satıra düştüğü değişebilir (R5, kabul edildi).
- Blok alta indikten sonra ekranın üstü boşalıyor; hesapsız aracını katlanan kutuya çevirmek
  (0081 deseni) bilinçli olarak kapsam dışı (X2). Kullanıcı blokta bir şey aramaya başlarsa o
  ayrı spec olur.
- **(Uygulamada) AC-6 taramasının istisna listesi üç dosya:** P5'in iki testine ek olarak taramanın kendisi
  (`tests/yerlesim-0083.test.js`), çünkü beklenen sırayı (`ETIKETLER`) tek dizide taşır. Liste gerekçeli ve eskimesi
  ayrıca denetlenir (istisna dosyası diziyi artık taşımıyorsa test düşer).
- **(Uygulamada) Yük altında kararsız testler:** kanıt çekimi sürerken bütün süit koşulunca `ui/stok-birlestirme` AC-6,
  `ui/sayfalama-kalkar-0080` AC-15 (süre eşiği) ve `ui/satis-tevkifat-0079-ekran` AC-31 zaman aşımına düşebiliyor;
  tek başına yeşiller ve bu işle ilgisizler. Son süit çekim bittikten sonra koşulur.
- **(Uygulamada) Kanıt: 125 ekran / 250 görüntü değişti, `degisti` kaydı 19 dosyada.** Spec'in 115 tahmini ve 18 dosyası
  0082 raporu üzerinden sayılmıştı; iş raporu ek olarak gider formu üzerinde çizilen on ekranı (`gider-formu*`,
  `kilit-gider-formu`, `kilit-odeme-penceresi`, `kayit-perdesi`, `uygulama-menu-*`) değişmiş buldu: Giderler sayfası pencerenin
  ya da kabuğun arkasında çiziliyor, çubuk görünüyor. On dokuzuncu dosya bu yüzden `GiderForm.jsx` (C5/3: rapor karar verir).
  Kasa'nın 35 Hesaplar ekranı değişti, 14 Çek Portföyü ekranı ve `giderler-mahsup` 0 piksel; yarım (tek temada) değişen ekran
  yok, iki ağaç aynı düzenle çekildiği için `uygulama-menu-kasali` gürültüsü görülmedi (o ekran bu işte gerçekten değişiyor).
